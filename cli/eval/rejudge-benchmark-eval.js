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
import { upgradeBenchmarkRunBasis } from "./benchmark-basis.js";
import { writeBenchmarkCatalog } from "./benchmark-catalog.js";
import { writeBenchmarkReport } from "./benchmark-report.js";
import {
  createBenchmarkGenerationHash,
  createBenchmarkHash,
  createBenchmarkScoringHash,
  resolveBenchmarkSource
} from "./benchmark-source.js";
import {
  getEvalHistoryRootDirectory,
  readEvalRunArtifacts,
  writeEvalRunArtifacts
} from "./history.js";
import {
  createBenchmarkPairs,
  createBenchmarkSummary
} from "./run-benchmark-eval.js";

function stableDigest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function createRejudgeRunId(startedAt, sourceRunId, judgingPlan) {
  const basis = stableDigest(JSON.stringify({
    sourceRunId,
    panel: judgingPlan.panel.map((configuration) => configuration.id),
    synthesizer: judgingPlan.synthesizer?.id ?? null,
    startedAt: startedAt.toISOString()
  })).slice(0, 12);
  return `${startedAt.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z")}__rejudge__${basis}`;
}

function failGenerationDrift({ sourceRunId, expectedHash, actualHash, detail }) {
  throw new VasirCliError({
    code: "EVAL_BENCHMARK_REJUDGE_GENERATION_DRIFT",
    message: `Saved responses no longer match the current benchmark generation contract: ${sourceRunId}`,
    suggestion: "Run the benchmark again when cases or output requirements change; rescore only reuses responses from the exact same generation contract.",
    docsRef: EVAL_REFERENCE_DOCS_REF,
    context: {
      expectedGenerationHash: expectedHash,
      recordedGenerationHash: actualHash,
      detail
    }
  });
}

function createRescoreScope({ sourceRunId, rowCount }) {
  return {
    strategy: "saved-responses-full-rescore-v1",
    sourceRunId,
    rowCount,
    generationReused: true,
    sourceScoresPreserved: false
  };
}

function createPendingJudging({ judgingPlan, rows, rescoreScope, priorJudging = null }) {
  return {
    strategy: priorJudging?.strategy ?? null,
    status: "pending",
    judgeConfiguration: judgingPlan.synthesizer ?? judgingPlan.panel[0],
    judgeConfigurations: judgingPlan.panel,
    synthesizerConfiguration: judgingPlan.synthesizer,
    freshContext: true,
    blinded: true,
    calibrationStatus: "development-uncalibrated",
    rescoreScope,
    cohortHash: null,
    cohortSize: rows.filter((row) => row.rowStatus === "complete").length,
    candidateOrder: [],
    batchPlan: null,
    panelPromptHash: null,
    panelPromptText: null,
    judges: [],
    disagreement: null,
    synthesis: null,
    basisHash: null,
    promptHash: null,
    promptText: null,
    ranking: [],
    comparativeNote: "",
    runtimeReceipt: null,
    usage: null,
    costUsd: null,
    durationMs: null,
    error: null
  };
}

export async function rejudgeBenchmarkEval({
  benchmarkName,
  runId = null,
  currentWorkingDirectory = process.cwd(),
  projectRootDirectory = null,
  stdoutWriter = (message) => process.stdout.write(message),
  jsonOutput = false,
  environmentVariables = process.env,
  agentRunnerImplementation = runBenchmarkAgent,
  judgeRowsImplementation = judgeBenchmarkRows,
  reportWriterImplementation = writeBenchmarkReport,
  judgingCheckpointImplementation = null,
  nowImplementation = () => new Date()
}) {
  const source = resolveBenchmarkSource({
    benchmarkName,
    currentWorkingDirectory,
    projectRootDirectory
  });
  const recorded = readEvalRunArtifacts({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName: benchmarkName,
    runId
  });
  if (recorded.run.kind !== "benchmark" || !recorded.run.benchmark?.definition) {
    throw new VasirCliError({
      code: "EVAL_BENCHMARK_REJUDGE_UNSUPPORTED",
      message: `Eval run is not an independent benchmark artifact: ${recorded.run.runId}`,
      suggestion: "Choose a run created by `vasir eval run <benchmark>`.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }


  const recordedDefinitionGenerationHash = createBenchmarkGenerationHash(
    recorded.run.benchmark.definition
  );
  const recordedGenerationHash = recorded.run.benchmark.generationHash ??
    recordedDefinitionGenerationHash;
  if (recordedGenerationHash !== recordedDefinitionGenerationHash) {
    failGenerationDrift({
      sourceRunId: recorded.run.runId,
      expectedHash: recordedDefinitionGenerationHash,
      actualHash: recordedGenerationHash,
      detail: "The saved artifact's generation hash disagrees with its recorded benchmark definition."
    });
  }
  if (source.benchmarkGenerationHash !== recordedGenerationHash) {
    failGenerationDrift({
      sourceRunId: recorded.run.runId,
      expectedHash: source.benchmarkGenerationHash,
      actualHash: recordedGenerationHash,
      detail: "The current benchmark cases or output contract differ from the contract that produced these responses."
    });
  }

  const judgingPlan = resolveBenchmarkJudgingConfiguration(
    source.benchmarkDefinition.judging
  );
  const judgingDefinition = source.benchmarkDefinition.judging ?? {
    panel: judgingPlan.panel.map((configuration) => configuration.id),
    synthesizer: judgingPlan.synthesizer?.id ?? null
  };
  const benchmarkDefinition = {
    ...structuredClone(recorded.run.benchmark.definition),
    scoring: structuredClone(source.benchmarkDefinition.scoring),
    judging: structuredClone(judgingDefinition)
  };
  const rows = structuredClone(recorded.run.rows);
  for (const row of rows) {
    row.score = null;
    row.scoreBasisHash = null;
  }
  const startedAt = nowImplementation();
  const rejudgeRunId = createRejudgeRunId(startedAt, recorded.run.runId, judgingPlan);
  const rescoreScope = createRescoreScope({
    sourceRunId: recorded.run.runId,
    rowCount: rows.length
  });
  const pendingJudging = createPendingJudging({
    judgingPlan,
    rows,
    rescoreScope,
    priorJudging: recorded.run.judging
  });
  const treatmentId = recorded.run.treatment?.id;
  const checkpointPairs = createBenchmarkPairs({ rows, treatmentId });
  const checkpointSummary = createBenchmarkSummary({
    rows,
    pairs: checkpointPairs,
    configurations: recorded.run.configurations ?? [],
    treatmentId,
    judging: pendingJudging
  });
  const benchmarkScoringHash = createBenchmarkScoringHash(benchmarkDefinition);
  const createCheckpointRun = (judging) => ({
    ...structuredClone(recorded.run),
    runId: rejudgeRunId,
    runStatus: "incomplete",
    benchmark: {
      ...structuredClone(recorded.run.benchmark),
      hash: createBenchmarkHash(benchmarkDefinition),
      generationHash: source.benchmarkGenerationHash,
      scoringHash: benchmarkScoringHash,
      definition: benchmarkDefinition
    },
    generation: {
      ...structuredClone(recorded.run.generation ?? {}),
      sourceRunId: recorded.run.runId
    },
    scorerVersion: benchmarkDefinition.scoring.version,
    judging: {
      ...structuredClone(judging),
      rescoreScope
    },
    rescoreScope,
    summary: checkpointSummary,
    pairs: checkpointPairs,
    rows,
    startedAt: startedAt.toISOString(),
    completedAt: null,
    rescoredFromRunId: recorded.run.runId
  });
  let outputDirectory = writeEvalRunArtifacts({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName: benchmarkName,
    runId: rejudgeRunId,
    runPayload: createCheckpointRun(pendingJudging)
  });
  const persistJudgingCheckpoint = async (progress) => {
    const progressJudging = progress?.judging ?? progress;
    if (!progressJudging || typeof progressJudging !== "object") {
      return;
    }
    const checkpointRun = createCheckpointRun(progressJudging);
    outputDirectory = writeEvalRunArtifacts({
      currentWorkingDirectory,
      projectRootDirectory,
      skillName: benchmarkName,
      runId: rejudgeRunId,
      runPayload: checkpointRun
    });
    if (typeof judgingCheckpointImplementation === "function") {
      await judgingCheckpointImplementation({ run: checkpointRun, outputDirectory });
    }
  };
  const judgeResult = await judgeRowsImplementation({
    benchmarkDefinition,
    rows,
    runSeed: rejudgeRunId,
    judgingConfiguration: judgingPlan,
    priorJudging: recorded.run.judging,
    progressImplementation: persistJudgingCheckpoint,
    environmentVariables,
    agentRunnerImplementation
  });

  for (const row of rows) {
    row.score = judgeResult.judging?.status === "complete"
      ? judgeResult.scoresByRowKey.get(row.rowKey) ?? null
      : null;
    row.scoreBasisHash = null;
  }

  const pairs = createBenchmarkPairs({ rows, treatmentId });
  const judging = {
    ...judgeResult.judging,
    rescoreScope
  };
  const summary = createBenchmarkSummary({
    rows,
    pairs,
    configurations: recorded.run.configurations ?? [],
    treatmentId,
    judging
  });
  const runStatus = summary.rowCounts.complete === summary.rowCounts.expected && judging.status === "complete"
    ? "complete"
    : "incomplete";
  const completedAt = nowImplementation();
  const run = {
    ...structuredClone(recorded.run),
    runId: rejudgeRunId,
    runStatus,
    benchmark: {
      ...structuredClone(recorded.run.benchmark),
      hash: createBenchmarkHash(benchmarkDefinition),
      generationHash: source.benchmarkGenerationHash,
      scoringHash: benchmarkScoringHash,
      definition: benchmarkDefinition
    },
    generation: {
      ...structuredClone(recorded.run.generation ?? {}),
      sourceRunId: recorded.run.runId
    },
    scorerVersion: benchmarkDefinition.scoring.version,
    judging,
    rescoreScope,
    summary,
    pairs,
    rows,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    rescoredFromRunId: recorded.run.runId
  };
  upgradeBenchmarkRunBasis(run);

  outputDirectory = writeEvalRunArtifacts({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName: benchmarkName,
    runId: rejudgeRunId,
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

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: process.stdout });
    stdoutWriter(ui.renderPanel({
      title: runStatus === "complete" ? "Benchmark rejudged" : "Benchmark rejudge incomplete",
      lines: [
        ui.formatField("source run", recorded.run.runId),
        ui.formatField("panel", judgingPlan.panel.map((configuration) => configuration.id).join(" + ")),
        ui.formatField("synthesis", judgingPlan.synthesizer?.id ?? "none"),
        ui.formatField("status", runStatus),
        ui.formatField("report", reportFilePath),
        ui.formatField("all prompts", catalogFilePath)
      ]
    }));
  }

  return {
    subcommand: "rescore",
    runId: rejudgeRunId,
    sourceRunId: recorded.run.runId,
    runStatus,
    benchmarkName,
    outputDirectory,
    reportFilePath,
    catalogFilePath,
    summary
  };
}
