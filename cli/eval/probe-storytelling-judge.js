import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { judgeBenchmarkRows } from "./benchmark-judge.js";
import { runStorytellingAgent } from "./storytelling-agent-runtime.js";

/** A plumbing check, deliberately separate from the benchmark's frozen panel.
 * It reads an intact pair and saves its single-judge result in a new artifact;
 * it never writes a score, judgment, or selection into the source benchmark run.
 */
export async function probeStorytellingJudge({
  sourceRunFilePath, outputFilePath,
  judgeSelector = "codex:gpt-5.6-luna@low",
  environmentVariables = process.env,
  agentRunnerImplementation = runStorytellingAgent
}) {
  const source = JSON.parse(fs.readFileSync(sourceRunFilePath, "utf8"));
  if (source.benchmark?.definition?.schemaVersion !== 2 ||
    String(source.benchmark.definition.status ?? "").includes("draft")) {
    throw new Error("The judge probe requires a frozen source-verified storytelling run.");
  }
  if (fs.existsSync(outputFilePath)) throw new Error("Judge probe output already exists; keep prior evidence intact.");
  const rowsByKey = new Map(source.rows.map((row) => [row.rowKey, row]));
  const pair = source.pairs.find((candidate) =>
    rowsByKey.get(candidate.cleanRowKey)?.rowStatus === "complete" &&
    rowsByKey.get(candidate.treatmentRowKey)?.rowStatus === "complete"
  );
  if (!pair) throw new Error("The judge probe needs one complete matched response pair.");
  const rows = [rowsByKey.get(pair.cleanRowKey), rowsByKey.get(pair.treatmentRowKey)];
  const judgingConfiguration = { panel: [judgeSelector], synthesizer: null };
  const result = await judgeBenchmarkRows({
    benchmarkDefinition: source.benchmark.definition, rows,
    judgingConfiguration, runSeed: "non-scored-storytelling-judge-probe",
    environmentVariables, agentRunnerImplementation
  });
  const evidence = {
    kind: "storytelling-judge-plumbing-evidence", schemaVersion: 1,
    exclusion: "Not a benchmark panel or public score; single-judge transport/schema probe only.",
    sourceRunId: source.runId, benchmarkHash: source.benchmark.hash,
    selectedRowKeys: rows.map((row) => row.rowKey),
    requestedJudging: judgingConfiguration,
    recordedAt: new Date().toISOString(),
    judging: result.judging,
    probeEvaluations: [...result.scoresByRowKey.values()]
  };
  fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
  fs.writeFileSync(outputFilePath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx" });
  return {
    status: result.judging.status,
    candidateCount: rows.length,
    validatedEvaluationCount: evidence.probeEvaluations.length,
    dimensions: source.benchmark.definition.scoring.dimensions.length,
    ratingScale: source.benchmark.definition.scoring.ratingScale,
    outputFilePath
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (![4, 5].includes(process.argv.length)) throw new Error("Usage: node cli/eval/probe-storytelling-judge.js SOURCE_RUN_JSON OUTPUT_JSON [JUDGE_SELECTOR]");
  probeStorytellingJudge({ sourceRunFilePath: path.resolve(process.argv[2]), outputFilePath: path.resolve(process.argv[3]), judgeSelector: process.argv[4] })
    .then((summary) => process.stdout.write(`${JSON.stringify(summary)}\n`))
    .catch((error) => {
      process.stderr.write(`${JSON.stringify({ code: error.code ?? "JUDGE_PROBE_FAILED", message: error.message })}\n`);
      process.exitCode = 1;
    });
}
