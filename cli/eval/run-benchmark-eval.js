import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";

import { VasirCliError } from "../cli-error.js";
import { EVAL_REFERENCE_DOCS_REF } from "../docs-ref.js";
import { createCommandUi } from "../ui/command-output.js";
import { runBenchmarkAgent } from "./agent-runtime.js";
import {
  judgeBenchmarkRows,
  resolveBenchmarkJudgingConfiguration
} from "./benchmark-judge.js";
import { resolveBenchmarkConfigurations } from "./benchmark-models.js";
import { writeBenchmarkCatalog } from "./benchmark-catalog.js";
import { resolveBenchmarkSource } from "./benchmark-source.js";
import { getEvalHistoryRootDirectory, writeEvalRunArtifacts } from "./history.js";
import { resolveSkillSource } from "./skill-source.js";

const BENCHMARK_HARNESS_VERSION = 2;
const DEFAULT_TRIAL_COUNT = 1;
const MAX_GENERATION_CONCURRENCY = 4;
const NEUTRAL_HARNESS_INSTRUCTION = [
  "Complete the task directly and concretely.",
  "Produce one concrete response that satisfies the output contract, preserve important unknowns, and do not offer a menu of incompatible answers.",
  "Do not inspect a workspace, call tools, ask follow-up questions, or mention these benchmark instructions."
].join(" ");

function stableDigest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function createRunId(startedAt, benchmarkHash, treatmentHash) {
  const identityHash = stableDigest(`${benchmarkHash}:${treatmentHash}`).slice(0, 12);
  return `${startedAt.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z")}__${identityHash}`;
}

function createTreatmentSource({
  treatmentId,
  currentWorkingDirectory,
  projectRootDirectory,
  homeDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation
}) {
  if (typeof treatmentId !== "string" || !treatmentId.startsWith("skill:")) {
    throw new VasirCliError({
      code: "EVAL_BENCHMARK_TREATMENT_UNSUPPORTED",
      message: `Unsupported benchmark treatment: ${treatmentId ?? "<missing>"}`,
      suggestion:
        "Use `--treatment skill:<name>` for this response benchmark. Full `vasir` agent-workflow treatment arrives in its dedicated benchmark rung.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  const skillName = treatmentId.slice("skill:".length);
  const skillSource = resolveSkillSource({
    skillName,
    currentWorkingDirectory,
    projectRootDirectory,
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const treatmentLabel = skillName === "plan__question-spec-architecture"
    ? "Vasir architecture skill"
    : `Vasir · ${skillName}`;
  return {
    id: treatmentId,
    label: treatmentLabel,
    type: "skill",
    skillName,
    hash: skillSource.skillHash,
    content: skillSource.promptText,
    promptFiles: skillSource.promptFiles,
    sourceType: skillSource.sourceType
  };
}

function createGenerationPrompt({ caseDefinition, outputContract, treatment = null }) {
  const treatmentBlock = treatment
    ? `\n\n--- Vasir Skill Guidance Start ---\n${treatment.content.trim()}\n--- Vasir Skill Guidance End ---`
    : "";
  return `${NEUTRAL_HARNESS_INSTRUCTION}${treatmentBlock}

Task:
${caseDefinition.task}

Output contract:
${outputContract}`;
}

async function mapWithConcurrency(items, iteratee, concurrency) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await iteratee(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => worker())
  );
  return results;
}

function mean(values) {
  const numericValues = values.filter((value) => Number.isFinite(value));
  return numericValues.length > 0
    ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
    : null;
}

function rounded(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function sumUsage(rows, judging) {
  const usageEntries = [
    ...rows.map((row) => row.usage),
    judging?.usage ?? null
  ].filter(Boolean);
  const keys = [
    "inputTokens",
    "cachedInputTokens",
    "cacheWriteInputTokens",
    "cacheCreationInputTokens",
    "cacheReadInputTokens",
    "outputTokens",
    "reasoningOutputTokens",
    "totalTokens"
  ];
  return Object.fromEntries(
    keys.map((key) => [
      key,
      usageEntries.reduce((total, usage) => total + Number(usage?.[key] ?? 0), 0)
    ])
  );
}

function createPairs({ rows, treatmentId }) {
  const rowGroups = new Map();
  for (const row of rows) {
    const pairKey = `${row.configurationId}::${row.caseId}::trial-${row.trialNumber}`;
    const group = rowGroups.get(pairKey) ?? {};
    group[row.conditionId] = row;
    rowGroups.set(pairKey, group);
  }

  return [...rowGroups.entries()].map(([pairKey, group]) => {
    const cleanRow = group.clean ?? null;
    const treatmentRow = group[treatmentId] ?? null;
    const cleanScore = cleanRow?.score?.total ?? null;
    const treatmentScore = treatmentRow?.score?.total ?? null;
    return {
      pairKey,
      configurationId: cleanRow?.configurationId ?? treatmentRow?.configurationId ?? null,
      caseId: cleanRow?.caseId ?? treatmentRow?.caseId ?? null,
      trialNumber: cleanRow?.trialNumber ?? treatmentRow?.trialNumber ?? null,
      cleanRowKey: cleanRow?.rowKey ?? null,
      treatmentRowKey: treatmentRow?.rowKey ?? null,
      cleanScore,
      treatmentScore,
      lift: Number.isFinite(cleanScore) && Number.isFinite(treatmentScore)
        ? rounded(treatmentScore - cleanScore)
        : null
    };
  });
}

function createSummary({ rows, pairs, configurations, treatmentId, judging }) {
  const completedRows = rows.filter((row) => row.rowStatus === "complete");
  const scoredRows = rows.filter((row) => Number.isFinite(row.score?.total));
  const conditionScores = {
    clean: rounded(mean(rows.filter((row) => row.conditionId === "clean").map((row) => row.score?.total))),
    treatment: rounded(
      mean(rows.filter((row) => row.conditionId === treatmentId).map((row) => row.score?.total))
    )
  };
  const matchedPairs = pairs.filter((pair) => Number.isFinite(pair.lift));
  const configurationScores = configurations.map((configuration) => {
    const configurationRows = rows.filter((row) => row.configurationId === configuration.id);
    const cleanScore = rounded(
      mean(configurationRows.filter((row) => row.conditionId === "clean").map((row) => row.score?.total))
    );
    const treatmentScore = rounded(
      mean(configurationRows.filter((row) => row.conditionId === treatmentId).map((row) => row.score?.total))
    );
    return {
      configurationId: configuration.id,
      provider: configuration.provider,
      model: configuration.model,
      reasoning: configuration.reasoning,
      cleanScore,
      treatmentScore,
      overallScore: rounded(mean([cleanScore, treatmentScore])),
      lift: Number.isFinite(cleanScore) && Number.isFinite(treatmentScore)
        ? rounded(treatmentScore - cleanScore)
        : null,
      completedRowCount: configurationRows.filter((row) => row.rowStatus === "complete").length,
      expectedRowCount: configurationRows.length
    };
  });
  const rankedConfigurations = configurationScores
    .filter((entry) => Number.isFinite(entry.treatmentScore))
    .sort(
      (left, right) =>
        right.treatmentScore - left.treatmentScore ||
        (right.cleanScore ?? -1) - (left.cleanScore ?? -1) ||
        left.configurationId.localeCompare(right.configurationId)
    )
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  const rankById = new Map(rankedConfigurations.map((entry) => [entry.configurationId, entry.rank]));
  const totalCostUsd = [
    ...rows.map((row) => row.costUsd),
    judging?.costUsd ?? null
  ].filter(Number.isFinite).reduce((sum, cost) => sum + cost, 0);

  return {
    rowCounts: {
      expected: rows.length,
      complete: completedRows.length,
      scored: scoredRows.length,
      failed: rows.filter((row) => row.rowStatus === "error").length,
      unavailable: rows.filter((row) => row.rowStatus === "unavailable").length
    },
    conditionScores,
    matchedPairCount: matchedPairs.length,
    averageLift: rounded(mean(matchedPairs.map((pair) => pair.lift))),
    winCount: matchedPairs.filter((pair) => pair.lift > 0).length,
    tieCount: matchedPairs.filter((pair) => pair.lift === 0).length,
    lossCount: matchedPairs.filter((pair) => pair.lift < 0).length,
    configurationScores: configurationScores.map((entry) => ({
      ...entry,
      rank: rankById.get(entry.configurationId) ?? null
    })),
    bestConfigurationId: rankedConfigurations[0]?.configurationId ?? null,
    usage: sumUsage(rows, judging),
    costUsd: totalCostUsd > 0 ? Math.round(totalCostUsd * 1_000_000) / 1_000_000 : null,
    costCoverage: rows.some((row) => row.provider === "codex")
      ? "partial-provider-reported"
      : "provider-reported"
  };
}

export { createPairs as createBenchmarkPairs, createSummary as createBenchmarkSummary };

async function defaultReportWriter(args) {
  const { writeBenchmarkReport } = await import("./benchmark-report.js");
  return writeBenchmarkReport(args);
}

function openLocalReport({ reportFilePath, platform, spawnSyncImplementation }) {
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const commandArguments = platform === "win32" ? ["/c", "start", "", reportFilePath] : [reportFilePath];
  const result = spawnSyncImplementation(command, commandArguments, { stdio: "ignore" });
  return result?.status === 0;
}

export async function runBenchmarkEval({
  benchmarkName,
  treatmentId,
  homeDirectory,
  currentWorkingDirectory = process.cwd(),
  projectRootDirectory = null,
  repositoryUrl,
  platform = process.platform,
  spawnSyncImplementation,
  requestedModelArguments = [],
  requestedReasoningArguments = [],
  trialCount = DEFAULT_TRIAL_COUNT,
  openReport = false,
  stdoutWriter = (message) => process.stdout.write(message),
  jsonOutput = false,
  environmentVariables = process.env,
  agentRunnerImplementation = runBenchmarkAgent,
  judgeRowsImplementation = judgeBenchmarkRows,
  reportWriterImplementation = defaultReportWriter
}) {
  const ui = createCommandUi({ stream: process.stdout });
  const startedAt = new Date();
  const benchmarkSource = resolveBenchmarkSource({
    benchmarkName,
    currentWorkingDirectory,
    projectRootDirectory
  });
  const judgingPlan = resolveBenchmarkJudgingConfiguration(
    benchmarkSource.benchmarkDefinition.judging
  );
  const treatment = createTreatmentSource({
    treatmentId,
    currentWorkingDirectory,
    projectRootDirectory,
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const configurations = resolveBenchmarkConfigurations({
    requestedModelArguments,
    requestedReasoningArguments
  });
  const resolvedTrialCount = Number.isInteger(trialCount) && trialCount > 0
    ? trialCount
    : DEFAULT_TRIAL_COUNT;
  const conditions = [
    {
      id: "clean",
      label: "Clean",
      type: "clean",
      hash: stableDigest(NEUTRAL_HARNESS_INSTRUCTION)
    },
    {
      id: treatment.id,
      label: treatment.label,
      type: treatment.type,
      hash: treatment.hash
    }
  ];
  const rowPlans = [];

  for (const configuration of configurations) {
    for (const caseDefinition of benchmarkSource.benchmarkDefinition.cases) {
      for (let trialNumber = 1; trialNumber <= resolvedTrialCount; trialNumber += 1) {
        for (const condition of conditions) {
          const treatmentForPrompt = condition.type === "skill" ? treatment : null;
          const promptText = createGenerationPrompt({
            caseDefinition,
            outputContract: benchmarkSource.benchmarkDefinition.outputContract,
            treatment: treatmentForPrompt
          });
          rowPlans.push({
            configuration,
            caseDefinition,
            trialNumber,
            condition,
            promptText,
            exactMessages: [{ role: "user", content: promptText }],
            basisHash: stableDigest([
              benchmarkSource.benchmarkGenerationHash,
              configuration.id,
              caseDefinition.id,
              resolvedTrialCount,
              NEUTRAL_HARNESS_INSTRUCTION,
              BENCHMARK_HARNESS_VERSION,
              condition.hash
            ].join(":"))
          });
        }
      }
    }
  }

  if (!jsonOutput) {
    stdoutWriter(
      ui.renderPanel({
        title: `Benchmark ${benchmarkName}`,
        lines: [
          ui.formatField("treatment", treatment.label),
          ui.formatField("matrix", `${configurations.length} configurations × ${conditions.length} conditions`),
          ui.formatField("rows", `${rowPlans.length} fresh agent sessions`),
          ui.formatField(
            "judge",
            `${judgingPlan.panel.map((configuration) => configuration.id).join(" + ")}${
              judgingPlan.synthesizer ? ` → ${judgingPlan.synthesizer.id}` : ""
            } · fresh + blinded`
          )
        ]
      })
    );
  }

  let completedCount = 0;
  const rows = await mapWithConcurrency(
    rowPlans,
    async (rowPlan) => {
      const rowKey = [
        rowPlan.configuration.id,
        rowPlan.caseDefinition.id,
        `trial-${rowPlan.trialNumber}`,
        rowPlan.condition.id
      ].join("::");
      try {
        const response = await agentRunnerImplementation({
          configuration: rowPlan.configuration,
          promptText: rowPlan.promptText,
          environmentVariables
        });
        return {
          rowKey,
          configurationId: rowPlan.configuration.id,
          modelId: `${rowPlan.configuration.provider}:${rowPlan.configuration.model}`,
          provider: rowPlan.configuration.provider,
          model: rowPlan.configuration.model,
          reasoning: rowPlan.configuration.reasoning,
          caseId: rowPlan.caseDefinition.id,
          trialNumber: rowPlan.trialNumber,
          conditionId: rowPlan.condition.id,
          rowStatus: "complete",
          exactMessages: rowPlan.exactMessages,
          promptText: rowPlan.promptText,
          outputText: String(response.text ?? "").trim(),
          usage: response.usage ?? null,
          costUsd: response.costUsd ?? null,
          durationMs: response.durationMs ?? null,
          runtimeReceipt: response.runtimeReceipt ?? null,
          basisHash: rowPlan.basisHash,
          score: null,
          scoreBasisHash: null,
          error: null
        };
      } catch (error) {
        return {
          rowKey,
          configurationId: rowPlan.configuration.id,
          modelId: `${rowPlan.configuration.provider}:${rowPlan.configuration.model}`,
          provider: rowPlan.configuration.provider,
          model: rowPlan.configuration.model,
          reasoning: rowPlan.configuration.reasoning,
          caseId: rowPlan.caseDefinition.id,
          trialNumber: rowPlan.trialNumber,
          conditionId: rowPlan.condition.id,
          rowStatus: error?.code === "ENOENT" ? "unavailable" : "error",
          exactMessages: rowPlan.exactMessages,
          promptText: rowPlan.promptText,
          outputText: null,
          usage: null,
          costUsd: null,
          durationMs: null,
          runtimeReceipt: null,
          basisHash: rowPlan.basisHash,
          score: null,
          scoreBasisHash: null,
          error: {
            code: error?.code ?? "EVAL_BENCHMARK_ROW_FAILED",
            message: error?.message ?? "Fresh agent generation failed.",
            suggestion: error?.suggestion ?? null,
            context: error?.context && typeof error.context === "object" ? error.context : null
          }
        };
      } finally {
        completedCount += 1;
        if (!jsonOutput) {
          stdoutWriter(
            `· ${completedCount}/${rowPlans.length} ${rowPlan.configuration.id} ${rowPlan.condition.label}\n`
          );
        }
      }
    },
    MAX_GENERATION_CONCURRENCY
  );

  const runId = createRunId(startedAt, benchmarkSource.benchmarkHash, treatment.hash);
  let judging;
  try {
    const judgeResult = await judgeRowsImplementation({
      benchmarkDefinition: benchmarkSource.benchmarkDefinition,
      rows,
      runSeed: runId,
      judgingConfiguration: judgingPlan,
      environmentVariables,
      agentRunnerImplementation
    });
    const judgeCohortHash = judgeResult.judging?.cohortHash ?? stableDigest(
      rows.filter((row) => row.rowStatus === "complete").map((row) => row.rowKey).sort().join(":")
    );
    const judgePromptHash = judgeResult.judging?.promptHash ?? stableDigest(
      judgeResult.judging?.promptText ?? ""
    );
    const judgeBasisHash = judgeResult.judging?.status === "complete"
      ? judgeResult.judging?.basisHash ?? stableDigest([
        judgeResult.judging?.judgeConfiguration?.id ?? judgingPlan.synthesizer?.id ?? judgingPlan.panel[0].id,
        benchmarkSource.benchmarkScoringHash,
        judgePromptHash,
        judgeCohortHash
      ].join(":"))
      : null;
    for (const row of rows) {
      row.score = judgeResult.scoresByRowKey.get(row.rowKey) ?? null;
      row.scoreBasisHash = row.score
        ? stableDigest([
          row.basisHash,
          benchmarkSource.benchmarkScoringHash,
          judgeBasisHash
        ].join(":"))
        : null;
    }
    judging = {
      ...judgeResult.judging,
      basisHash: judgeBasisHash,
      promptHash: judgePromptHash,
      cohortHash: judgeCohortHash,
      cohortSize: judgeResult.judging?.cohortSize ?? rows.filter((row) => row.rowStatus === "complete").length
    };
  } catch (error) {
    judging = {
      status: "error",
      judgeConfiguration: judgingPlan.synthesizer ?? judgingPlan.panel[0],
      judgeConfigurations: judgingPlan.panel,
      synthesizerConfiguration: judgingPlan.synthesizer,
      freshContext: true,
      blinded: true,
      calibrationStatus: "author-calibration-pending",
      cohortHash: null,
      cohortSize: rows.filter((row) => row.rowStatus === "complete").length,
      promptHash: null,
      candidateOrder: [],
      judges: [],
      synthesis: null,
      basisHash: null,
      promptText: null,
      ranking: [],
      comparativeNote: "",
      runtimeReceipt: null,
      usage: null,
      costUsd: null,
      durationMs: null,
      error: {
        code: error?.code ?? "EVAL_BENCHMARK_JUDGE_FAILED",
        message: error?.message ?? "Fresh benchmark judging failed.",
        suggestion: error?.suggestion ?? null,
        context: error?.context && typeof error.context === "object" ? error.context : null
      }
    };
  }

  const pairs = createPairs({ rows, treatmentId: treatment.id });
  const summary = createSummary({
    rows,
    pairs,
    configurations,
    treatmentId: treatment.id,
    judging
  });
  const runStatus = summary.rowCounts.complete === summary.rowCounts.expected && judging.status === "complete"
    ? "complete"
    : "incomplete";
  const completedAt = new Date();
  const run = {
    kind: "benchmark",
    schemaVersion: 1,
    runId,
    runStatus,
    benchmarkName,
    skillName: benchmarkName,
    benchmark: {
      id: benchmarkSource.benchmarkId,
      title: benchmarkSource.benchmarkDefinition.title,
      description: benchmarkSource.benchmarkDefinition.description,
      hash: benchmarkSource.benchmarkHash,
      generationHash: benchmarkSource.benchmarkGenerationHash,
      scoringHash: benchmarkSource.benchmarkScoringHash,
      sourceType: benchmarkSource.sourceType,
      definition: benchmarkSource.benchmarkDefinition
    },
    treatment,
    conditions,
    configurations,
    generation: {
      trialCount: resolvedTrialCount,
      concurrency: MAX_GENERATION_CONCURRENCY,
      neutralHarnessInstruction: NEUTRAL_HARNESS_INSTRUCTION,
      freshAgentSessions: true
    },
    judging,
    summary,
    pairs,
    rows,
    harnessVersion: BENCHMARK_HARNESS_VERSION,
    scorerVersion: benchmarkSource.benchmarkDefinition.scoring.version,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString()
  };
  const outputDirectory = writeEvalRunArtifacts({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName: benchmarkName,
    runId,
    runPayload: run
  });
  const reportFilePath = path.join(outputDirectory, "report.html");
  await reportWriterImplementation({ run, outputFilePath: reportFilePath });
  const catalogFilePath = writeBenchmarkCatalog({
    historyRootDirectory: getEvalHistoryRootDirectory({
      currentWorkingDirectory,
      projectRootDirectory
    })
  });
  const reportOpened = openReport
    ? openLocalReport({ reportFilePath, platform, spawnSyncImplementation })
    : false;

  if (!jsonOutput) {
    stdoutWriter(
      ui.renderPanel({
        title: runStatus === "complete" ? "Benchmark complete" : "Benchmark incomplete",
        lines: [
          ui.formatField("status", runStatus),
          ui.formatField(
            runStatus === "complete" ? "Vasir lift" : "completed lift",
            summary.averageLift === null ? "NO SIGNAL" : `${summary.averageLift >= 0 ? "+" : ""}${summary.averageLift}`
          ),
          ui.formatField(runStatus === "complete" ? "best model" : "best completed", summary.bestConfigurationId ?? "NO SIGNAL"),
          ui.formatField("report", reportFilePath),
          ui.formatField("all prompts", catalogFilePath),
          ...(openReport ? [ui.formatField("opened", reportOpened ? "yes" : "no")] : [])
        ]
      })
    );
  }

  return {
    subcommand: "run",
    runId,
    runStatus,
    benchmarkName,
    treatmentId: treatment.id,
    outputDirectory,
    reportFilePath,
    catalogFilePath,
    reportOpened,
    summary
  };
}
