import path from "node:path";
import process from "node:process";

import { VasirCliError } from "../cli-error.js";
import { createCommandUi } from "../ui/command-output.js";
import { createLiveProgress, canRenderLiveProgress } from "../ui/live-progress.js";
import { createFailedRowSummary, createMovementSummary } from "./analysis.js";
import { createBottomLine, createEvidenceComparison } from "./evidence.js";
import {
  readPreviousRunSummary,
  readPreviousVersionSummary,
  writeEvalRunArtifacts
} from "./history.js";
import { resolveEvalEnvironmentVariables } from "./keys-file.js";
import { resolveEvalModels } from "./provider-config.js";
import { generateEvalResponse } from "./providers.js";
import {
  createComparableRowPairs,
  scoreCaseOutput,
  SCORER_VERSION,
  summarizePairResults
} from "./scoring.js";
import { createEvalReportSummary } from "./report-summary.js";
import { resolveSkillSource } from "./skill-source.js";
import { resolveSuiteSource } from "./suite-source.js";

const DEFAULT_TRIAL_COUNT = 3;
const HARNESS_VERSION = 3;
const MAX_CONCURRENCY = 4;
const FIXED_JUDGES = Object.freeze(["openai:gpt-5.4", "anthropic:claude-opus-4-6"]);

function createRunId(startedAt, skillHash) {
  return `${startedAt.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z")}__${skillHash.slice(0, 12)}`;
}

function toRelativePath(currentWorkingDirectory, targetPath) {
  const relativePath = path.relative(currentWorkingDirectory, targetPath);
  return relativePath.length > 0 && !relativePath.startsWith("..")
    ? relativePath
    : targetPath;
}

function createGenerationPrompt(caseDefinition, skillPromptText, includeSkillGuidance) {
  const parts = [
    "Complete the task directly and concisely.",
    "",
    "Task:",
    caseDefinition.task
  ];

  if (typeof caseDefinition.outputHint === "string" && caseDefinition.outputHint.trim().length > 0) {
    parts.push("", "Output Hint:", caseDefinition.outputHint.trim());
  }

  if (includeSkillGuidance) {
    parts.push("", "--- Skill Guidance Start ---", skillPromptText.trim(), "--- Skill Guidance End ---");
  }

  return parts.join("\n");
}

function createJudgePrompt(caseDefinition, judgePrompt, baselineText, treatmentText) {
  return [
    "Compare the two candidate outputs for the same task.",
    "Prefer substance over style. Do not reward buzzwords without mechanism.",
    "",
    "Task:",
    caseDefinition.task,
    typeof caseDefinition.outputHint === "string" && caseDefinition.outputHint.trim().length > 0
      ? `\nOutput Hint:\n${caseDefinition.outputHint.trim()}`
      : "",
    "",
    "Judging Rubric:",
    judgePrompt.trim(),
    "",
    "Output A:",
    baselineText,
    "",
    "Output B:",
    treatmentText,
    "",
    "Return JSON only with keys winner, confidence, and summaryReason.",
    "winner must be one of a, b, baseline, treatment, or tie."
  ].filter(Boolean).join("\n");
}

function parseJudgeResponse(text) {
  const rawText = String(text ?? "").trim();
  const candidateJson = rawText.startsWith("{") ? rawText : rawText.match(/\{[\s\S]*\}/)?.[0];
  if (!candidateJson) {
    throw new Error("judge response did not contain JSON");
  }

  const parsed = JSON.parse(candidateJson);
  const normalizedWinner = String(parsed?.winner ?? "").trim().toLowerCase();
  const winner = normalizedWinner === "a" || normalizedWinner === "baseline"
    ? "baseline"
    : normalizedWinner === "b" || normalizedWinner === "treatment"
      ? "treatment"
      : normalizedWinner === "tie"
        ? "tie"
        : null;

  if (!winner) {
    throw new Error(`unsupported judge winner: ${parsed?.winner ?? "<missing>"}`);
  }

  const confidence = Number(parsed?.confidence);
  return {
    winner,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
    summaryReason: String(parsed?.summaryReason ?? parsed?.reason ?? "").trim()
  };
}

function formatRowProgress(completedCount, totalCount, row) {
  return `${completedCount}/${totalCount} ${row.modelId} ${row.caseId} trial-${row.trialNumber} ${row.conditionId === "baseline:none" ? "baseline" : "treatment"}`;
}

async function mapWithConcurrency(items, iteratee, concurrency = MAX_CONCURRENCY) {
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

function createJudgeStatus(judgedPairs) {
  if (judgedPairs.length === 0) {
    return "skipped";
  }

  if (judgedPairs.every((pairJudgment) => pairJudgment.judgeStatus === "complete")) {
    return "complete";
  }

  if (judgedPairs.some((pairJudgment) => pairJudgment.judgeStatus === "complete")) {
    return "incomplete";
  }

  return "skipped";
}

function createPairJudgment(pair, judgeResults, expectedJudgeCount) {
  const sortedJudgeResults = Object.fromEntries(
    Object.entries(judgeResults).sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
  );
  const successfulJudgeResults = Object.values(sortedJudgeResults).filter(
    (judgeResult) => judgeResult?.status === "scored"
  );

  if (successfulJudgeResults.length !== expectedJudgeCount) {
    return {
      pairKey: pair.pairKey,
      modelId: pair.modelId,
      caseId: pair.caseId,
      trialNumber: pair.trialNumber,
      judgeStatus: successfulJudgeResults.length > 0 ? "incomplete" : "skipped",
      pairVerdict: "inconclusive",
      confidence: null,
      judges: sortedJudgeResults
    };
  }

  const winnerSet = new Set(successfulJudgeResults.map((judgeResult) => judgeResult.winner));
  const pairVerdict = winnerSet.size !== 1
    ? "inconclusive"
    : successfulJudgeResults[0].winner === "treatment"
      ? "better"
      : successfulJudgeResults[0].winner === "baseline"
        ? "worse"
        : "no_change";
  const confidenceValues = successfulJudgeResults
    .map((judgeResult) => judgeResult.confidence)
    .filter((confidenceValue) => typeof confidenceValue === "number");

  return {
    pairKey: pair.pairKey,
    modelId: pair.modelId,
    caseId: pair.caseId,
    trialNumber: pair.trialNumber,
    judgeStatus: "complete",
    pairVerdict,
    confidence: confidenceValues.length === 0
      ? null
      : confidenceValues.reduce((sum, confidenceValue) => sum + confidenceValue, 0) / confidenceValues.length,
    judges: sortedJudgeResults
  };
}

function persistPair(pair) {
  const baseline = pair.baseline ?? {
    rowKey: pair.baselineRow.rowKey,
    outputText: pair.baselineRow.outputText,
    score: pair.baselineRow.hardScore?.score ?? 0,
    passed: pair.baselineRow.hardScore?.passed ?? false,
    usage: pair.baselineRow.usage
  };
  const treatment = pair.treatment ?? {
    rowKey: pair.treatmentRow.rowKey,
    outputText: pair.treatmentRow.outputText,
    score: pair.treatmentRow.hardScore?.score ?? 0,
    passed: pair.treatmentRow.hardScore?.passed ?? false,
    usage: pair.treatmentRow.usage
  };

  return {
    pairKey: pair.pairKey,
    pairStatus: pair.pairStatus ?? (pair.pairJudgment?.judgeStatus === "incomplete" ? "partial" : "scored"),
    modelId: pair.modelId,
    caseId: pair.caseId,
    trialNumber: pair.trialNumber,
    baseline,
    treatment,
    averageScoreLift: pair.averageScoreLift,
    passRateLift: pair.passRateLift,
    outcome: pair.outcome,
    confidence: pair.confidence ?? null,
    reason: pair.reason ?? null,
    pairJudgment: pair.pairJudgment ?? null,
    error: pair.error ?? null
  };
}

function formatJudgeSummaryResult(summary) {
  if (!summary.available || summary.judgedPairCount === 0) {
    return "NO DATA";
  }

  if (summary.betterPairCount > 0 && summary.worsePairCount === 0 && summary.inconclusivePairCount === 0) {
    return "BETTER";
  }

  if (summary.worsePairCount > 0 && summary.betterPairCount === 0 && summary.inconclusivePairCount === 0) {
    return "WORSE";
  }

  if (summary.tiePairCount > 0 && summary.betterPairCount === 0 && summary.worsePairCount === 0 && summary.inconclusivePairCount === 0) {
    return "NO CHANGE";
  }

  return "INCONCLUSIVE";
}

function formatJudgeStatusText(judgeStatus, judgeModels) {
  if (judgeStatus === "complete") {
    return `complete (${judgeModels.join(", ")})`;
  }

  if (judgeStatus === "incomplete") {
    return `incomplete (${judgeModels.join(", ")})`;
  }

  if (judgeStatus === "not_configured") {
    return "not configured for this suite";
  }

  if (judgeStatus === "disabled") {
    return "disabled";
  }

  return "skipped because the fixed judge layer was not available";
}

function createExcerpt(text, maxLength = 120) {
  const singleLineText = String(text ?? "").trim().replace(/\s+/g, " ");
  if (singleLineText.length === 0) {
    return "(empty)";
  }

  return singleLineText.length <= maxLength
    ? singleLineText
    : `${singleLineText.slice(0, maxLength - 1).trimEnd()}…`;
}

function selectSummaryModelDescriptor(modelDescriptors) {
  return modelDescriptors.find((descriptor) => descriptor.provider === "anthropic") ??
    modelDescriptors.find((descriptor) => descriptor.provider !== "mock") ??
    modelDescriptors[0] ??
    null;
}

function formatSummarySource(reportSummary) {
  return reportSummary.source === "llm" && reportSummary.modelId
    ? reportSummary.modelId
    : "structured fallback";
}

function renderTextSummary({
  ui,
  skillName,
  currentWorkingDirectory,
  outputDirectory,
  runSummary,
  reportSummary,
  previousComparison,
  projectKeysLoaded
}) {
  const labelWidth = 12;
  const lines = [
    ui.formatField("skill", ui.colors.bold(skillName), { labelWidth }),
    ui.formatField("hash", ui.colors.muted(runSummary.skillHash.slice(0, 12)), { labelWidth }),
    ui.formatField("run status", ui.formatOutcome(runSummary.runStatus), { labelWidth }),
    ui.formatField("suite", runSummary.suiteId, { labelWidth }),
    ui.formatField(
      "coverage",
      `${runSummary.summary.global.comparablePairCount}/${runSummary.summary.global.totalPairCount} comparable pairs`,
      { labelWidth }
    ),
    ui.formatField("artifacts", ui.formatPath(toRelativePath(currentWorkingDirectory, outputDirectory)), { labelWidth }),
    ui.formatField("keys", projectKeysLoaded ? "loaded from keys.json" : "env / prompts only", { labelWidth }),
    ui.formatField("tokens", `${ui.formatCount(runSummary.summary.usage.total.totalTokens)} total`, { labelWidth }),
    "",
    ui.colors.header("Summary"),
    ui.formatField(
      "result",
      runSummary.bottomLine.overallVerdict === "BETTER"
        ? ui.formatOutcome("better")
        : runSummary.bottomLine.overallVerdict === "WORSE"
          ? ui.formatOutcome("worse")
          : runSummary.bottomLine.overallVerdict === "INCONCLUSIVE"
            ? ui.formatOutcome("inconclusive")
            : ui.formatOutcome("no_signal"),
      { labelWidth }
    ),
    ui.formatField("summary via", formatSummarySource(reportSummary), { labelWidth }),
    ui.formatField("headline", reportSummary.headline, { labelWidth }),
    ui.formatField("note", reportSummary.summary, { labelWidth }),
    ui.formatField("next step", reportSummary.nextStep, { labelWidth }),
    "",
    ui.colors.header("Key Evidence")
  ];

  if (reportSummary.decisiveReasons.length === 0) {
    lines.push(ui.formatBullet("No decisive evidence was recorded."));
  } else {
    for (const decisiveReason of reportSummary.decisiveReasons) {
      lines.push(ui.formatBullet(decisiveReason));
    }
  }

  lines.push("", ui.colors.header("History"));
  if (previousComparison.outcome === "no_prior") {
    lines.push(ui.formatField("last run", ui.formatOutcome("no_prior"), { labelWidth }));
  } else if (previousComparison.outcome === "not_comparable") {
    lines.push(ui.formatField("last run", ui.formatOutcome("not_comparable"), { labelWidth }));
    lines.push(ui.formatBullet(`${previousComparison.previousRunId} is not comparable: ${previousComparison.reason}`));
  } else {
    lines.push(ui.formatField("last run", ui.formatOutcome(previousComparison.outcome), { labelWidth }));
    lines.push(ui.formatBullet(`${previousComparison.metricLabel} moved ${ui.formatLift(previousComparison.metricValueDelta)}`));
  }

  lines.push("", ui.colors.header("Inspect"));
  lines.push(
    ui.formatBullet(
      `Run \`vasir eval inspect ${skillName} ${runSummary.runId}\` for pair-level evidence, excerpts, and judge reasons.`
    )
  );

  return ui.renderPanel({
    title: `Eval ${skillName}`,
    lines
  });
}

export async function runSkillEval({
  skillName,
  homeDirectory,
  currentWorkingDirectory = process.cwd(),
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  requestedModelArguments = [],
  promptForMissingCredential = null,
  outputStream = process.stdout,
  stdoutWriter,
  jsonOutput = false,
  environmentVariables = process.env,
  fetchImplementation = globalThis.fetch,
  trialCount = DEFAULT_TRIAL_COUNT
}) {
  const ui = createCommandUi({ stream: outputStream });
  const startedAt = new Date();
  const skillSource = resolveSkillSource({
    skillName,
    currentWorkingDirectory,
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const suiteSource = resolveSuiteSource({ skillSource });
  const envResolution = resolveEvalEnvironmentVariables({
    currentWorkingDirectory,
    environmentVariables
  });
  const modelResolution = await resolveEvalModels({
    requestedModelArguments,
    environmentVariables: envResolution.environmentVariables,
    promptForMissingCredential
  });
  const resolvedTrialCount = Number.isInteger(trialCount) && trialCount > 0 ? trialCount : DEFAULT_TRIAL_COUNT;
  const rowPlans = [];

  for (const modelDescriptor of modelResolution.modelDescriptors) {
    for (const caseDefinition of suiteSource.suiteDefinition.cases) {
      for (let trialNumber = 1; trialNumber <= resolvedTrialCount; trialNumber += 1) {
        rowPlans.push({
          modelDescriptor,
          caseDefinition,
          trialNumber,
          conditionId: "baseline:none",
          promptText: createGenerationPrompt(caseDefinition, skillSource.promptText, false)
        });
        rowPlans.push({
          modelDescriptor,
          caseDefinition,
          trialNumber,
          conditionId: `treatment:${skillName}`,
          promptText: createGenerationPrompt(caseDefinition, skillSource.promptText, true)
        });
      }
    }
  }

  if (!jsonOutput) {
    stdoutWriter(
      ui.renderPanel({
        title: `Starting Eval ${skillName}`,
        lines: [
          ui.formatStatusLine({ kind: "info", text: `Selected ${skillName} starting eval setup` }),
          ui.formatField("models", modelResolution.modelDescriptors.map((descriptor) => descriptor.id).join(", ")),
          ui.formatStatusLine({ kind: "info", text: "Preparing providers, suite, and history" })
        ]
      })
    );
    stdoutWriter(`· Preparing ${skillName} loading ${suiteSource.suiteDefinition.id}, keys, and model availability\n`);
    stdoutWriter(
      ui.renderPanel({
        title: `Preparing Eval ${skillName}`,
        lines: [
          ui.formatField("skill", skillName),
          ui.formatField("suite", suiteSource.suiteDefinition.id),
          ui.formatField("models", modelResolution.modelDescriptors.map((descriptor) => descriptor.id).join(", ")),
          ui.formatField(
            "plan",
            `${modelResolution.modelDescriptors.length} models x ${suiteSource.suiteDefinition.cases.length} cases x ${resolvedTrialCount} trials x baseline/treatment`
          ),
          ui.formatField("execution", "parallel"),
          ui.formatField("concurrency", `${MAX_CONCURRENCY} in flight`),
          ui.formatField("keys", envResolution.projectKeysLoaded ? "loaded from keys.json" : "env / prompts only")
        ]
      })
    );
  }

  const progress = !jsonOutput && canRenderLiveProgress(outputStream)
    ? createLiveProgress({ stream: outputStream })
    : null;
  let completedCount = 0;
  if (!jsonOutput) {
    if (progress?.start(`0/${rowPlans.length} queued`)) {
      progress.update(`0/${rowPlans.length} queued`);
    } else {
      stdoutWriter(`· 0/${rowPlans.length} queued\n`);
    }
  }

  const rows = await mapWithConcurrency(rowPlans, async (rowPlan) => {
    const rowKey = `${rowPlan.modelDescriptor.id}::${rowPlan.caseDefinition.id}::trial-${rowPlan.trialNumber}::${rowPlan.conditionId}`;

    try {
      const response = await generateEvalResponse({
        modelDescriptor: rowPlan.modelDescriptor,
        systemPrompt: "Answer the task directly and concretely.",
        userPrompt: rowPlan.promptText,
        environmentVariables: modelResolution.environmentVariables,
        fetchImplementation
      });
      const outputText = String(response.text ?? "").trim();
      return {
        rowKey,
        modelId: rowPlan.modelDescriptor.id,
        caseId: rowPlan.caseDefinition.id,
        trialNumber: rowPlan.trialNumber,
        conditionId: rowPlan.conditionId,
        rowStatus: "scored",
        outputText,
        usage: response.usage ?? null,
        scorerVersion: SCORER_VERSION,
        hardScore: scoreCaseOutput({
          caseDefinition: rowPlan.caseDefinition,
          outputText
        }),
        caseDefinitionSnapshot: rowPlan.caseDefinition
      };
    } catch (error) {
      return {
        rowKey,
        modelId: rowPlan.modelDescriptor.id,
        caseId: rowPlan.caseDefinition.id,
        trialNumber: rowPlan.trialNumber,
        conditionId: rowPlan.conditionId,
        rowStatus: "error",
        scorerVersion: SCORER_VERSION,
        caseDefinitionSnapshot: rowPlan.caseDefinition,
        error: {
          code: error?.code ?? "EVAL_ROW_FAILED",
          message: error?.message ?? "Eval provider request failed."
        }
      };
    } finally {
      completedCount += 1;
      const progressText = formatRowProgress(completedCount, rowPlans.length, {
        modelId: rowPlan.modelDescriptor.id,
        caseId: rowPlan.caseDefinition.id,
        trialNumber: rowPlan.trialNumber,
        conditionId: rowPlan.conditionId
      });
      if (!jsonOutput) {
        if (progress) {
          progress.update(progressText);
        } else {
          stdoutWriter(`· ${progressText}\n`);
        }
      }
    }
  });

  if (!jsonOutput && progress) {
    progress.stop(`◆ ${ui.formatProgress({ current: rowPlans.length, total: rowPlans.length })} all runs completed`);
  }

  const judgePromptText = typeof suiteSource.suiteDefinition.judgePrompt === "string"
    ? suiteSource.suiteDefinition.judgePrompt
    : null;
  let judgeModels = [];
  let judgeStatus = judgePromptText ? "skipped" : "not_configured";
  const comparablePairsBeforeJudging = createComparableRowPairs(rows);

  if (judgePromptText && comparablePairsBeforeJudging.length > 0) {
    const judgeResolution = await resolveEvalModels({
      requestedModelArguments: [...FIXED_JUDGES],
      environmentVariables: modelResolution.environmentVariables,
      promptForMissingCredential
    }).catch(() => null);
    judgeModels = judgeResolution?.modelDescriptors?.map((descriptor) => descriptor.id) ?? [];

    if (judgeResolution && judgeResolution.modelDescriptors.length === FIXED_JUDGES.length) {
      const judgedPairs = await mapWithConcurrency(comparablePairsBeforeJudging, async (pair) => {
        const judgeResults = {};

        for (const judgeDescriptor of judgeResolution.modelDescriptors) {
          try {
            const response = await generateEvalResponse({
              modelDescriptor: judgeDescriptor,
              systemPrompt: "Return only the requested JSON.",
              userPrompt: createJudgePrompt(
                pair.baselineRow.caseDefinitionSnapshot ?? pair.treatmentRow.caseDefinitionSnapshot,
                judgePromptText,
                pair.baselineRow.outputText,
                pair.treatmentRow.outputText
              ),
              environmentVariables: judgeResolution.environmentVariables,
              fetchImplementation
            });
            judgeResults[judgeDescriptor.id] = {
              status: "scored",
              ...parseJudgeResponse(response.text),
              usage: response.usage ?? null,
              selfJudged: judgeDescriptor.id === pair.modelId
            };
          } catch (error) {
            judgeResults[judgeDescriptor.id] = {
              status: "error",
              code: error?.code ?? "EVAL_JUDGE_FAILED",
              message: error?.message ?? "Judge request failed.",
              usage: null,
              selfJudged: judgeDescriptor.id === pair.modelId
            };
          }
        }

        return createPairJudgment(pair, judgeResults, judgeResolution.modelDescriptors.length);
      });

      const pairJudgmentsByKey = new Map(judgedPairs.map((pairJudgment) => [pairJudgment.pairKey, pairJudgment]));
      for (const row of rows) {
        const pairKey = `${row.modelId}::${row.caseId}::${row.trialNumber}`;
        if (pairJudgmentsByKey.has(pairKey)) {
          row.pairJudgment = pairJudgmentsByKey.get(pairKey);
        }
      }

      judgeStatus = createJudgeStatus(judgedPairs);
    }
  }

  const comparablePairs = createComparableRowPairs(rows);
  const pairResults = comparablePairs;
  const movementSummary = createMovementSummary(rows);
  const failureEntries = createFailedRowSummary(rows);

  const summary = summarizePairResults({
    pairs: pairResults,
    rows,
    expectedPairCount: modelResolution.modelDescriptors.length * suiteSource.suiteDefinition.cases.length * resolvedTrialCount,
    modelIds: modelResolution.modelDescriptors.map((descriptor) => descriptor.id)
  });
  const runStatus = summary.rowCounts.failed > 0 || summary.pairCounts.failed > 0 ? "incomplete" : "complete";
  const runId = createRunId(startedAt, skillSource.skillHash);
  const bottomLine = createBottomLine({
    summary,
    judgeStatus,
    judgeModelIds: judgeModels
  });
  const runSummary = {
    runId,
    runStatus,
    skillName,
    skillHash: skillSource.skillHash,
    suiteId: suiteSource.suiteDefinition.id,
    suiteHash: suiteSource.suiteHash,
    caseCount: suiteSource.suiteDefinition.cases.length,
    trialCount: resolvedTrialCount,
    modelIds: modelResolution.modelDescriptors.map((descriptor) => descriptor.id),
    judgeStatus,
    judgeModels,
    harnessVersion: HARNESS_VERSION,
    scorerVersion: SCORER_VERSION,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    projectKeysLoaded: envResolution.projectKeysLoaded,
    skippedProviders: modelResolution.skippedProviders,
    summary,
    pairs: pairResults.map(persistPair),
    rows,
    bottomLine,
    primaryEvidence: bottomLine.primaryEvidence
  };
  const previousComparison = createEvidenceComparison({
    currentSummary: runSummary,
    previousSummary: readPreviousRunSummary({
      currentWorkingDirectory,
      skillName
    })
  });
  const previousVersion = readPreviousVersionSummary({
    currentWorkingDirectory,
    skillName,
    currentSkillHash: skillSource.skillHash
  });
  const previousVersionComparison = {
    ...createEvidenceComparison({
      currentSummary: runSummary,
      previousSummary: previousVersion
    }),
    previousSkillHash: previousVersion?.skillHash ?? null
  };

  runSummary.previousComparison = previousComparison;
  runSummary.previousVersionComparison = previousVersionComparison;

  const outputDirectory = writeEvalRunArtifacts({
    currentWorkingDirectory,
    skillName,
    runId,
    runPayload: runSummary
  });

  if (!jsonOutput) {
    const reportSummary = await createEvalReportSummary({
      skillName,
      runSummary,
      movementSummary,
      failureEntries,
      previousComparison,
      previousVersionComparison,
      summaryModelDescriptor: selectSummaryModelDescriptor(modelResolution.modelDescriptors),
      environmentVariables: modelResolution.environmentVariables,
      fetchImplementation
    });
    stdoutWriter(
      renderTextSummary({
        ui,
        skillName,
        currentWorkingDirectory,
        outputDirectory,
        runSummary,
        reportSummary,
        previousComparison,
        projectKeysLoaded: envResolution.projectKeysLoaded
      })
    );
  }

  return {
    subcommand: "run",
    runId,
    skillName,
    skillHash: skillSource.skillHash,
    suiteId: suiteSource.suiteDefinition.id,
    suiteHash: suiteSource.suiteHash,
    trialCount: resolvedTrialCount,
    runStatus,
    judgeStatus,
    judgeModels,
    scorerVersion: SCORER_VERSION,
    harnessVersion: HARNESS_VERSION,
    outputDirectory,
    usageSummary: summary.usage,
    summary: runSummary.summary,
    bottomLine,
    primaryEvidence: bottomLine.primaryEvidence,
    previousComparison,
    previousVersionComparison,
    skippedProviders: modelResolution.skippedProviders
  };
}
