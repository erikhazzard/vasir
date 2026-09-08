import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { freezeStorytellingSkill } from "./storytelling-agent-runtime.js";

export const DM_BENCHMARK_ID = "dungeon-master-adventure-outline";
export const DM_RUN_ID = "dm-outline-v1-2026-09-08";
export const digest = (value) => crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
export function writeAtomic(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
}

export function createDungeonMasterRows(definition, configuration) {
  const rows = [];
  for (const caseDefinition of definition.cases) {
    for (let trialNumber = 1; trialNumber <= caseDefinition.repetitions; trialNumber += 1) {
      const pairId = `${caseDefinition.id}::trial-${trialNumber}`;
      for (const conditionId of ["clean", "skill:dungeon-master"]) {
        rows.push({ rowKey: `${configuration.id}::${pairId}::${conditionId}`, pairId,
          caseId: caseDefinition.id, trialNumber, configurationId: configuration.id,
          provider: configuration.provider, model: configuration.model, reasoning: configuration.reasoning,
          conditionId, promptText: caseDefinition.task, rowStatus: "pending", outputText: "", outputHash: null,
          wordCount: null, characterCount: null, usage: null, costUsd: null, durationMs: null,
          runtimeReceipt: null, attempts: [], error: null, score: null });
      }
    }
  }
  return rows;
}

function freezeImplementation(repoRoot, directory) {
  const sourceRoot = path.join(directory, "runtime-source");
  const files = [];
  const visited = new Set();
  function visit(relativePath) {
    if (visited.has(relativePath)) return;
    visited.add(relativePath);
    const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    const target = path.join(sourceRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source, { mode: 0o400 });
    files.push({ path: relativePath, bytes: Buffer.byteLength(source), sha256: digest(source) });
    for (const match of source.matchAll(/(?:from\s+|import\s*)["'](\.\.?\/[^"']+)["']/gu)) {
      visit(path.posix.normalize(path.posix.join(path.posix.dirname(relativePath), match[1])));
    }
  }
  visit("cli/eval/dungeon-master-agent-runtime.js");
  visit("cli/eval/run-dungeon-master-benchmark.js");
  fs.writeFileSync(path.join(sourceRoot, "package.json"), '{"type":"module"}\n', { mode: 0o400 });
  return { files: files.sort((a, b) => a.path.localeCompare(b.path)), hash: digest(files), nodeVersion: process.version,
    execution: "Generation dynamically imports this frozen runtime dependency tree; runner source is retained and hashed." };
}

export function prepareDungeonMasterRun({ repoRoot, runDirectory, skillDirectory }) {
  if (fs.existsSync(path.join(runDirectory, "run.json"))) throw new Error("Run already exists; resume its frozen declaration.");
  fs.mkdirSync(runDirectory, { recursive: true });
  const definition = read(path.join(repoRoot, "benchmarks", DM_BENCHMARK_ID, "benchmark.json"));
  const skillSnapshot = freezeStorytellingSkill({ skillDirectoryPath: skillDirectory, skillName: "dungeon-master" });
  const implementation = freezeImplementation(repoRoot, runDirectory);
  const configuration = definition.generation.configuration;
  const casesExpected = definition.cases.reduce((sum, entry) => sum + entry.repetitions, 0);
  const run = { kind: "dungeon-master-benchmark", schemaVersion: 1, runId: DM_RUN_ID, benchmarkName: DM_BENCHMARK_ID,
    startedAt: new Date().toISOString(), completedAt: null, runStatus: "prepared",
    benchmark: { id: DM_BENCHMARK_ID, hash: digest(definition), definition },
    configurations: [configuration], conditions: [{ id: "clean", label: "Plain", type: "clean" },
      { id: "skill:dungeon-master", label: "Dungeon Master skill", type: "skill" }],
    treatment: { id: "skill:dungeon-master", skillName: "dungeon-master", hash: skillSnapshot.hash,
      injection: "root-provider-instruction-progressive-required-reference-read", requiredSkillFiles: definition.generation.requiredSkillFiles,
      fileCount: skillSnapshot.files.length, snapshotFile: "skill-snapshot.json" },
    generation: { ...definition.generation, freshAgentSessions: true, orderSeed: crypto.randomBytes(16).toString("hex"),
      orderPolicy: "sha256-seed-and-row-key", expectedPairs: casesExpected, expectedRows: casesExpected * 2 },
    implementation, rows: createDungeonMasterRows(definition, configuration), judging: { status: "pending", artifact: "judges.json", ...definition.judging } };
  run.manifestHash = digest({ benchmark: run.benchmark.hash, treatment: run.treatment, generation: run.generation, implementation });
  writeAtomic(path.join(runDirectory, "skill-snapshot.json"), skillSnapshot);
  fs.copyFileSync(path.join(repoRoot, "benchmarks", DM_BENCHMARK_ID, "judge-rubric.md"), path.join(runDirectory, "judge-rubric.md"));
  fs.copyFileSync(path.join(repoRoot, "benchmarks", DM_BENCHMARK_ID, "methodology.md"), path.join(runDirectory, "methodology.md"));
  writeAtomic(path.join(runDirectory, "manifest.json"), { runId: run.runId, manifestHash: run.manifestHash,
    benchmarkHash: run.benchmark.hash, skillHash: skillSnapshot.hash, frozenAt: run.startedAt,
    expectedRows: run.generation.expectedRows, expectedPairs: run.generation.expectedPairs, implementation });
  writeAtomic(path.join(runDirectory, "run.json"), run);
  return run;
}

export function isTechnicalFailure(error) {
  const diagnostic = `${error.code ?? ""} ${error.message ?? ""} ${JSON.stringify(error.context ?? {})}`;
  if (/content.?filter|output.?filter|usage limit|credits|quota|not logged|authentication|oauth|permission|config\.toml/iu.test(diagnostic)) return false;
  return /timeout|timed out|ECONN|EPIPE|ENET|socket|transport|did not return a final answer|network|service unavailable|HTTP 50[0234]/iu.test(diagnostic);
}

export function summarizeDungeonMasterRun(run) {
  const complete = run.rows.filter((row) => row.rowStatus === "complete").length;
  const failed = run.rows.filter((row) => row.rowStatus === "error").length;
  run.summary = { expectedRows: run.rows.length, complete, failed, pending: run.rows.length - complete - failed,
    treatmentReadComplete: run.rows.filter((row) => row.conditionId === "skill:dungeon-master" && row.runtimeReceipt?.requiredSkillReads?.status === "complete").length };
  return run.summary;
}

export async function generateDungeonMasterRun({ runDirectory, agentImplementation = null, concurrency = 4 }) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error("Concurrency must be 1 through 4.");
  const lockPath = path.join(runDirectory, "run.lock");
  const lock = fs.openSync(lockPath, "wx", 0o600);
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  try {
    const run = read(path.join(runDirectory, "run.json"));
    const snapshot = read(path.join(runDirectory, "skill-snapshot.json"));
    if (snapshot.hash !== run.treatment.hash || digest(run.benchmark.definition) !== run.benchmark.hash) throw new Error("Frozen input mismatch.");
    for (const file of run.implementation.files) {
      if (digest(fs.readFileSync(path.join(runDirectory, "runtime-source", file.path), "utf8")) !== file.sha256) throw new Error("Frozen runtime source changed.");
    }
    const agent = agentImplementation ?? (await import(pathToFileURL(path.join(runDirectory, "runtime-source/cli/eval/dungeon-master-agent-runtime.js")))).runDungeonMasterAgent;
    if (!agentImplementation && read(path.join(runDirectory, "preflight", "verification.json")).status !== "passed") throw new Error("Isolation and required-reference smoke must pass before scored generation.");
    const rows = run.rows.filter((row) => !["complete", "error"].includes(row.rowStatus)).sort((a, b) =>
      digest(run.generation.orderSeed + a.rowKey).localeCompare(digest(run.generation.orderSeed + b.rowKey)));
    run.runStatus = "generating";
    function save() { summarizeDungeonMasterRun(run); run.lastCheckpointAt = new Date().toISOString(); writeAtomic(path.join(runDirectory, "run.json"), run); }
    save();
    let next = 0;
    async function worker() {
      while (next < rows.length) {
        const row = rows[next++];
        const rowDirectory = path.join(runDirectory, "responses", digest(row.rowKey).slice(0, 20));
        fs.mkdirSync(rowDirectory, { recursive: true });
        while (row.attempts.length < 2) {
          const attemptNumber = row.attempts.length + 1;
          const evidenceDirectory = path.join(rowDirectory, `attempt-${attemptNumber}`);
          const attempt = { attemptNumber, startedAt: new Date().toISOString(), status: "running", evidenceDirectory: path.relative(runDirectory, evidenceDirectory) };
          row.attempts.push(attempt); row.rowStatus = "running"; save();
          try {
            const result = await agent({ configuration: run.configurations[0], promptText: row.promptText,
              skillSnapshot: row.conditionId === "clean" ? null : snapshot, evidenceDirectory,
              timeoutMs: run.generation.timeoutMs });
            const outputText = result.outputText ?? result.text;
            if (typeof outputText !== "string") throw new Error("Agent returned no text field.");
            Object.assign(row, { rowStatus: "complete", outputText, outputHash: digest(outputText),
              wordCount: outputText.trim() ? outputText.trim().split(/\s+/u).length : 0,
              characterCount: [...outputText].length, usage: result.usage ?? null, costUsd: result.costUsd ?? null,
              durationMs: result.durationMs ?? null, runtimeReceipt: result.runtimeReceipt ?? null, error: null });
            Object.assign(attempt, { status: "complete", completedAt: new Date().toISOString(), outputHash: row.outputHash,
              usage: row.usage, durationMs: row.durationMs, runtimeReceipt: row.runtimeReceipt });
            fs.writeFileSync(path.join(rowDirectory, "answer.md"), outputText, { mode: 0o600 });
            writeAtomic(path.join(rowDirectory, "row.json"), row); save();
            process.stdout.write(`${JSON.stringify({ event: "answer-complete", caseId: row.caseId, trial: row.trialNumber, condition: row.conditionId, words: row.wordCount, summary: run.summary })}\n`);
            break;
          } catch (error) {
            const failure = { code: error.code ?? null, message: error.message, context: error.context ?? null };
            Object.assign(attempt, { status: "error", completedAt: new Date().toISOString(), error: failure });
            row.error = failure;
            const retry = attemptNumber === 1 && isTechnicalFailure(error);
            row.rowStatus = retry ? "pending" : "error";
            writeAtomic(path.join(rowDirectory, "row.json"), row); save();
            process.stdout.write(`${JSON.stringify({ event: "answer-error", rowKey: row.rowKey, retry, message: error.message })}\n`);
            if (!retry) break;
          }
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));
    run.runStatus = run.rows.every((row) => row.rowStatus === "complete") ? "generation-complete" : "generation-incomplete";
    run.completedAt = new Date().toISOString(); save(); return run;
  } finally { fs.closeSync(lock); fs.unlinkSync(lockPath); }
}

async function main() {
  const { values } = parseArgs({ options: { prepare: { type: "boolean" }, generate: { type: "boolean" },
    "project-root": { type: "string", default: process.cwd() }, "run-directory": { type: "string" },
    "skill-directory": { type: "string" }, concurrency: { type: "string", default: "4" } } });
  const repoRoot = path.resolve(values["project-root"]);
  const runDirectory = path.resolve(values["run-directory"] ?? path.join(repoRoot, ".agents/vasir-evals", DM_BENCHMARK_ID, DM_RUN_ID));
  if (values.prepare) {
    if (!values["skill-directory"]) throw new Error("--skill-directory is required for prepare.");
    const run = prepareDungeonMasterRun({ repoRoot, runDirectory, skillDirectory: path.resolve(values["skill-directory"]) });
    process.stdout.write(`${JSON.stringify({ runDirectory, manifestHash: run.manifestHash, expectedRows: run.rows.length, skillFiles: run.treatment.fileCount })}\n`);
  }
  if (values.generate) await generateDungeonMasterRun({ runDirectory, concurrency: Number(values.concurrency) });
  if (!values.prepare && !values.generate) throw new Error("Choose --prepare or --generate.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
