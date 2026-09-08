import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runStorytellingBenchmark, identifyStorytellingJudgeQuotaExhaustion } from "./run-storytelling-benchmark.js";
import { runStorytellingCreationAgent, STORYTELLING_CREATION_ISOLATION_VERSION } from "./storytelling-creation-runtime.js";

export const CREATION_BENCHMARK = "storytelling-magic-discovery";
const sha = text => crypto.createHash("sha256").update(text).digest("hex");
const sourceFiles = [
  ...["benchmark.json", "README.md", "methodology.md", "RUNBOOK.md"].map(name => `benchmarks/${CREATION_BENCHMARK}/${name}`),
  "cli/eval/run-storytelling-creation.js", "cli/eval/storytelling-creation-runtime.js",
  "cli/eval/run-storytelling-benchmark.js", "cli/eval/storytelling-agent-runtime.js", "cli/eval/agent-runtime.js"
];

export function isCreationOperationalRetry(row) {
  if (row.outputText?.trim()) return false;
  const error = row.error ?? {};
  const diagnostic = JSON.stringify(error);
  if (/output.?filter|content.?policy|safety.?filter|API Error:\s*400/iu.test(diagnostic)) return false;
  return ["EVAL_CREATION_QUOTA_CIRCUIT_OPEN", "AUTH_UNAVAILABLE", "ENOENT", "EVAL_AGENT_TIMEOUT"].includes(error.code) ||
    /timed out|timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT|connection.*closed|stream.*disconnect|session limit|usage limit|usage credits|overloaded|API Error:\s*(429|5\d\d)/iu.test(diagnostic);
}

function freezeProtocol(directory, repoRoot) {
  const target = path.join(directory, "creation-protocol-snapshot.json");
  const files = sourceFiles.map(relativePath => {
    const contents = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    return { relativePath, sha256: sha(contents), contents };
  });
  const run = JSON.parse(fs.readFileSync(path.join(directory, "run.json"), "utf8"));
  const skill = JSON.parse(fs.readFileSync(path.join(directory, "skill-snapshot.json"), "utf8"));
  const informedFiles = run.benchmark.definition.judging.contextProfiles.find(profile => profile.id === "informed").skillFiles;
  const informedContextFiles = informedFiles.map(relativePath => {
    const file = skill.files.find(entry => entry.relativePath === relativePath);
    if (!file) throw new Error(`Missing informed context: ${relativePath}`);
    return { relativePath, sha256: file.sha256 };
  });
  const frozen = { schemaVersion: 1, frozenAt: new Date().toISOString(), runId: run.runId,
    manifestHash: run.storytelling.manifestHash, benchmarkHash: run.benchmark.hash,
    skillHash: skill.hash, runtimeIsolationVersion: STORYTELLING_CREATION_ISOLATION_VERSION,
    files, informedContextFiles };
  if (fs.existsSync(target)) {
    const original = JSON.parse(fs.readFileSync(target, "utf8"));
    for (const key of ["runId", "manifestHash", "benchmarkHash", "skillHash", "runtimeIsolationVersion"]) {
      if (original[key] !== frozen[key]) throw new Error(`Frozen creation identity changed: ${key}`);
    }
    for (const file of original.files) {
      if (sha(file.contents) !== file.sha256) throw new Error(`Corrupt frozen protocol: ${file.relativePath}`);
      // Protocol documentation remains frozen in the artifact; operational source
      // must match until generation finishes, so implementation cannot drift.
      if (file.relativePath.startsWith("cli/") && files.find(entry => entry.relativePath === file.relativePath)?.sha256 !== file.sha256) {
        throw new Error(`Creation runtime changed after freeze: ${file.relativePath}`);
      }
    }
    if (JSON.stringify(original.informedContextFiles) !== JSON.stringify(informedContextFiles)) throw new Error("Informed context changed.");
  } else {
    if (run.rows.some(row => row.attempts.length)) throw new Error("Protocol must be frozen before the first creator attempt.");
    fs.writeFileSync(target, `${JSON.stringify(frozen, null, 2)}\n`, { flag: "wx" });
  }
}

export async function runStorytellingCreation({ repoRoot = process.cwd(), runId, resumeRunId,
  prepareOnly = false, generateProvider = null, generateModel = null, concurrency = 16,
  retryFailed = false, maxGenerationRows = null, onCheckpoint,
  agentRunnerImplementation = runStorytellingCreationAgent } = {}) {
  if (Boolean(runId) === Boolean(resumeRunId)) throw new Error("Choose exactly one new run ID or resume ID.");
  const definition = JSON.parse(fs.readFileSync(path.join(repoRoot, "benchmarks", CREATION_BENCHMARK, "benchmark.json"), "utf8"));
  const common = { benchmarkName: CREATION_BENCHMARK, currentWorkingDirectory: repoRoot,
    projectRootDirectory: repoRoot, generationOnly: true, generationConcurrency: concurrency, onCheckpoint };
  let directory;
  if (runId) {
    const result = await runStorytellingBenchmark({ ...common, runId, prepareOnly: true,
      requestedModelArguments: definition.coverage.configurationSelectors,
      trialCount: definition.coverage.trialsPerConfiguration });
    directory = result.outputDirectory;
    resumeRunId = result.runId;
  } else directory = path.join(repoRoot, ".agents", "vasir-evals", CREATION_BENCHMARK, resumeRunId);
  freezeProtocol(directory, repoRoot);
  const run = JSON.parse(fs.readFileSync(path.join(directory, "run.json"), "utf8"));
  if (run.rows.length !== 198 || run.configurations.length !== 33 || run.generation.trialCount !== 3) throw new Error("Creation inventory differs from the preregistered 198 slots.");
  if (fs.existsSync(path.join(directory, "creation-judging.json")) && !prepareOnly) throw new Error("Generation is sealed by its judging sidecar.");
  if (retryFailed) {
    const failed = run.rows.filter(row => (!generateProvider || row.provider === generateProvider) && (!generateModel || row.model === generateModel) && ["error", "unavailable"].includes(row.rowStatus));
    if (failed.some(row => !isCreationOperationalRetry(row))) throw new Error("Selected failures include a non-operational failure; no quality/policy rerolls are allowed.");
  }
  if (prepareOnly) return { runId: resumeRunId, outputDirectory: directory, prepared: true, rows: run.rows.length };
  const quotaCircuits = new Map();
  return runStorytellingBenchmark({ ...common, resumeRunId, generateProvider, generateModel, retryFailed, maxGenerationRows,
    agentRunnerImplementation: async options => {
      const key = options.configuration.provider;
      if (quotaCircuits.has(key)) {
        const error = new Error("Provider quota circuit is open; no provider call made for this slot.");
        error.code = "EVAL_CREATION_QUOTA_CIRCUIT_OPEN";
        error.context = { provider: key, reason: quotaCircuits.get(key), providerCallMade: false };
        throw error;
      }
      try { return await agentRunnerImplementation(options); }
      catch (error) {
        const exhaustion = identifyStorytellingJudgeQuotaExhaustion({ error, configuration: options.configuration });
        if (exhaustion) quotaCircuits.set(key, exhaustion.reason);
        throw error;
      }
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: {
    "run-id": { type: "string" }, resume: { type: "string" }, prepare: { type: "boolean", default: false },
    "generate-provider": { type: "string" }, "generate-model": { type: "string" }, concurrency: { type: "string", default: "16" },
    "retry-failed": { type: "boolean", default: false }, "max-rows": { type: "string" }
  } });
  runStorytellingCreation({ runId: values["run-id"], resumeRunId: values.resume, prepareOnly: values.prepare,
    generateProvider: values["generate-provider"] ?? null, generateModel: values["generate-model"] ?? null,
    concurrency: Number(values.concurrency), retryFailed: values["retry-failed"],
    maxGenerationRows: values["max-rows"] === undefined ? null : Number(values["max-rows"]),
    onCheckpoint: ({ event, run }) => {
      if (["generation-complete", "generation-only"].includes(event)) console.log(JSON.stringify({ time: new Date().toISOString(), event,
        counts: Object.fromEntries(["pending", "running", "complete", "error", "unavailable"].map(status => [status, run.rows.filter(row => row.rowStatus === status).length])) }));
    }
  }).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.stack); process.exitCode = 1; });
}
