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

  const judgingPlan = resolveBenchmarkJudgingConfiguration(
    source.benchmarkDefinition.judging
  );
  const judgingDefinition = source.benchmarkDefinition.judging ?? {
    panel: judgingPlan.panel.map((configuration) => configuration.id),
    synthesizer: judgingPlan.synthesizer?.id ?? null
  };
  const benchmarkDefinition = {
    ...structuredClone(recorded.run.benchmark.definition),
    judging: structuredClone(judgingDefinition)
  };
  const rows = structuredClone(recorded.run.rows);
  const startedAt = nowImplementation();
  const rejudgeRunId = createRejudgeRunId(startedAt, recorded.run.runId, judgingPlan);
  const judgeResult = await judgeRowsImplementation({
    benchmarkDefinition,
    rows,
    runSeed: rejudgeRunId,
    judgingConfiguration: judgingPlan,
    priorJudging: recorded.run.judging,
    environmentVariables,
    agentRunnerImplementation
  });

  for (const row of rows) {
    row.score = judgeResult.judging?.status === "complete"
      ? judgeResult.scoresByRowKey.get(row.rowKey) ?? null
      : null;
    row.scoreBasisHash = null;
  }

  const treatmentId = recorded.run.treatment?.id;
  const pairs = createBenchmarkPairs({ rows, treatmentId });
  const judging = judgeResult.judging;
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
  const benchmarkGenerationHash = recorded.run.benchmark.generationHash ??
    createBenchmarkGenerationHash(benchmarkDefinition);
  const benchmarkScoringHash = createBenchmarkScoringHash(benchmarkDefinition);
  const completedAt = nowImplementation();
  const run = {
    ...structuredClone(recorded.run),
    runId: rejudgeRunId,
    runStatus,
    benchmark: {
      ...structuredClone(recorded.run.benchmark),
      hash: createBenchmarkHash(benchmarkDefinition),
      generationHash: benchmarkGenerationHash,
      scoringHash: benchmarkScoringHash,
      definition: benchmarkDefinition
    },
    generation: {
      ...structuredClone(recorded.run.generation ?? {}),
      sourceRunId: recorded.run.runId
    },
    judging,
    summary,
    pairs,
    rows,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    rescoredFromRunId: recorded.run.runId
  };
  upgradeBenchmarkRunBasis(run);

  const outputDirectory = writeEvalRunArtifacts({
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
