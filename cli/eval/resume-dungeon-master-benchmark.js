import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { dmPairs, dmCandidateOrder, dmJudgePrompt, dmJudgeSchema, validateDmJudgeOutput, DM_JUDGE_IDS, DM_JUDGE_VERSION } from "./judge-dungeon-master-benchmark.js";

const ORIGINAL_JUDGE_HASH = "08445a51276fd99eb99333e09da8454dfd0dc4ede93f0330dc0944c82b43b6ba";
const digest = value => crypto.createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
function atomic(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(temporary, file);
}

// Only provider terminal/error records and runtime stderr can open the circuit.
// Candidate answer text and generic rate-limit 429s are deliberately excluded.
export function hasTerminalQuotaExhaustion(evidenceDirectory) {
  const diagnostics = [];
  const stdoutPath = path.join(evidenceDirectory, "stdout.jsonl");
  if (fs.existsSync(stdoutPath)) {
    for (const line of fs.readFileSync(stdoutPath, "utf8").split(/\r?\n/u)) {
      try {
        const event = JSON.parse(line);
        if (["error", "turn.failed"].includes(event.type) || event.type === "result" && event.is_error) {
          diagnostics.push(event.message ?? "", event.error?.message ?? "", event.result ?? "");
        }
      } catch { /* Preserve non-JSON raw lines without treating them as provider evidence. */ }
    }
  }
  const stderrPath = path.join(evidenceDirectory, "stderr.txt");
  if (fs.existsSync(stderrPath)) diagnostics.push(fs.readFileSync(stderrPath, "utf8"));
  return /usage.?limit|usage credits|out of credits|credits (?:exhausted|depleted)|insufficient_quota|exceeded.*quota|hit your.*limit|reached your.*limit/iu.test(diagnostics.join("\n"));
}

export async function resumeDungeonMasterBenchmark({ runDirectory, archiveDirectory, authorization, concurrency = 4 }) {
  if (!authorization?.trim()) throw new Error("Explicit operator-resume authorization is required.");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error("Concurrency must be 1–4.");
  if (digest(fs.readFileSync(new URL("./judge-dungeon-master-benchmark.js", import.meta.url))) !== ORIGINAL_JUDGE_HASH) throw new Error("Original judge helpers changed.");
  const locks = [];
  try {
    for (const name of ["run.lock", "judges.lock"]) {
      const file = path.join(runDirectory, name);
      const descriptor = fs.openSync(file, "wx", 0o600);
      fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, operation: "explicit-operator-resume", startedAt: new Date().toISOString() }));
      locks.push({ file, descriptor });
    }
    const runFile = path.join(runDirectory, "run.json");
    const judgesFile = path.join(runDirectory, "judges.json");
    const run = read(runFile);
    const judges = read(judgesFile);
    const snapshot = read(path.join(runDirectory, "skill-snapshot.json"));
    const rubricText = fs.readFileSync(path.join(runDirectory, "judge-rubric.md"), "utf8");
    const initialRunHash = digest(fs.readFileSync(runFile));
    const initialJudgesHash = digest(fs.readFileSync(judgesFile));
    if (initialRunHash !== digest(fs.readFileSync(path.join(archiveDirectory, "run.json"))) || initialJudgesHash !== digest(fs.readFileSync(path.join(archiveDirectory, "judges.json")))) throw new Error("Recovery archive is not the exact pre-resume checkpoint.");
    if (snapshot.hash !== run.treatment.hash || digest(run.benchmark.definition) !== run.benchmark.hash) throw new Error("Frozen input identity changed.");
    for (const file of run.implementation.files) {
      if (digest(fs.readFileSync(path.join(runDirectory, "runtime-source", file.path))) !== file.sha256) throw new Error("Frozen runtime dependency changed.");
    }
    const { runDungeonMasterAgent: runtime } = await import(pathToFileURL(path.join(runDirectory, "runtime-source/cli/eval/dungeon-master-agent-runtime.js")));
    const configuration = run.configurations[0];
    const scoring = run.benchmark.definition.scoring;
    const protocolHash = digest({ version: DM_JUDGE_VERSION, runId: run.runId, scoring, rubricText, panel: DM_JUDGE_IDS, configuration });
    if (judges.protocolHash !== protocolHash || judges.rubricHash !== digest(rubricText)) throw new Error("Original judge protocol changed.");
    const preservedRows = new Map(run.rows.filter(row => row.rowStatus === "complete").map(row => [row.rowKey, digest(row)]));
    const preservedJudges = new Map(judges.pairs.flatMap(pair => pair.judges.filter(judge => judge.status === "completed").map(judge => [`${pair.pairId}::${judge.judgeId}`, digest(judge)])));
    const recoveryId = `operator-resume-${new Date().toISOString().replaceAll(":", "-")}`;
    const recoveryDirectory = path.join(runDirectory, "operator-recovery", recoveryId);
    fs.mkdirSync(recoveryDirectory, { recursive: true, mode: 0o700 });
    const controllerBytes = fs.readFileSync(fileURLToPath(import.meta.url));
    fs.writeFileSync(path.join(recoveryDirectory, "controller.mjs"), controllerBytes, { mode: 0o400 });
    const execution = { schemaVersion: 1, recoveryId, authorization, startedAt: new Date().toISOString(), status: "running",
      policy: "one-explicit-recovery-attempt-per-missing-unit-no-automatic-retries", concurrency,
      controllerSha256: digest(controllerBytes), originalJudgeRunnerSha256: ORIGINAL_JUDGE_HASH,
      initialRunSha256: initialRunHash, initialJudgesSha256: initialJudgesHash,
      archivePath: path.relative(path.dirname(runDirectory), archiveDirectory), manifestHash: run.manifestHash,
      configuration, accountContextId: path.basename(process.env.CODEX_HOME ?? path.join(process.env.HOME, ".codex")),
      accountContextPathSha256: digest(process.env.CODEX_HOME ?? path.join(process.env.HOME, ".codex")),
      credentialsCopied: false, environmentValuesSerialized: false,
      preservedRows: [...preservedRows].map(([rowKey, sha256]) => ({ rowKey, sha256 })),
      preservedJudges: [...preservedJudges].map(([key, sha256]) => ({ key, sha256 })), calls: [], quotaCircuitOpen: false };
    run.operatorRecovery ??= [];
    judges.operatorRecovery ??= [];
    const recoveryReference = { recoveryId, receipt: path.relative(runDirectory, path.join(recoveryDirectory, "recovery.json")), controllerSha256: execution.controllerSha256 };
    run.operatorRecovery.push(recoveryReference); judges.operatorRecovery.push(recoveryReference);
    function verifyPreserved() {
      for (const row of run.rows) if (preservedRows.has(row.rowKey) && preservedRows.get(row.rowKey) !== digest(row)) throw new Error("A preserved successful writer record changed.");
      for (const pair of judges.pairs) for (const judge of pair.judges) {
        const key = `${pair.pairId}::${judge.judgeId}`;
        if (preservedJudges.has(key) && preservedJudges.get(key) !== digest(judge)) throw new Error("A preserved successful judge record changed.");
      }
    }
    function checkpoint() {
      verifyPreserved();
      run.summary = { expectedRows: run.rows.length, complete: run.rows.filter(row => row.rowStatus === "complete").length,
        failed: run.rows.filter(row => row.rowStatus === "error").length,
        pending: run.rows.filter(row => !["complete", "error"].includes(row.rowStatus)).length,
        treatmentReadComplete: run.rows.filter(row => row.conditionId !== "clean" && row.runtimeReceipt?.requiredSkillReads?.status === "complete").length };
      run.lastCheckpointAt = new Date().toISOString(); judges.updatedAt = run.lastCheckpointAt;
      atomic(runFile, run); atomic(judgesFile, judges); atomic(path.join(recoveryDirectory, "recovery.json"), execution);
    }
    function detectQuota(evidenceDirectory) {
      if (hasTerminalQuotaExhaustion(evidenceDirectory)) execution.quotaCircuitOpen = true;
    }
    const attemptedRows = new Set();
    const attemptedJudges = new Set();
    async function write(row) {
      attemptedRows.add(row.rowKey);
      const previous = structuredClone(row);
      const unit = digest(row.rowKey).slice(0, 20);
      const rowDirectory = path.join(runDirectory, "responses", unit);
      const evidenceDirectory = path.join(rowDirectory, `operator-${recoveryId}`);
      atomic(path.join(recoveryDirectory, `writer-before-${unit}.json`), previous);
      const attempt = { attemptNumber: row.attempts.length + 1, recoveryId, startedAt: new Date().toISOString(), status: "running", evidenceDirectory: path.relative(runDirectory, evidenceDirectory) };
      row.attempts.push(attempt); row.rowStatus = "running";
      execution.calls.push({ kind: "writer", rowKey: row.rowKey, evidenceDirectory: attempt.evidenceDirectory }); checkpoint();
      try {
        const result = await runtime({ configuration, promptText: row.promptText,
          skillSnapshot: row.conditionId === "clean" ? null : snapshot, evidenceDirectory, timeoutMs: run.generation.timeoutMs });
        const outputText = result.outputText ?? result.text;
        Object.assign(row, { rowStatus: "complete", outputText, outputHash: digest(outputText),
          wordCount: outputText.trim() ? outputText.trim().split(/\s+/u).length : 0, characterCount: [...outputText].length,
          usage: result.usage ?? null, durationMs: result.durationMs ?? null, costUsd: result.costUsd ?? null,
          runtimeReceipt: result.runtimeReceipt, error: null });
        Object.assign(attempt, { status: "complete", completedAt: new Date().toISOString(), outputHash: row.outputHash, usage: row.usage, durationMs: row.durationMs, runtimeReceipt: row.runtimeReceipt });
        fs.writeFileSync(path.join(rowDirectory, "answer.md"), outputText, { mode: 0o600 });
        process.stdout.write(`Recovered writer ${row.caseId} trial ${row.trialNumber} ${row.conditionId}\n`);
      } catch (error) {
        const failure = { code: error.code ?? null, message: error.message, context: error.context ?? null };
        Object.assign(attempt, { status: "error", completedAt: new Date().toISOString(), error: failure });
        row.rowStatus = "error"; row.error = failure; detectQuota(evidenceDirectory);
        process.stdout.write(`Writer recovery failed ${row.caseId}; quotaCircuit=${execution.quotaCircuitOpen}\n`);
      }
      atomic(path.join(rowDirectory, "row.json"), row); checkpoint();
    }
    async function review(pair, seat) {
      const judgeId = DM_JUDGE_IDS[seat];
      const key = `${pair.pairId}::${judgeId}`; attemptedJudges.add(key);
      let savedPair = judges.pairs.find(entry => entry.pairId === pair.pairId);
      if (!savedPair) { savedPair = { pairId: pair.pairId, caseId: pair.caseId, trialNumber: pair.trialNumber, configurationId: pair.configurationId, judges: [] }; judges.pairs.push(savedPair); }
      const index = savedPair.judges.findIndex(entry => entry.judgeId === judgeId);
      const previous = index < 0 ? null : structuredClone(savedPair.judges[index]);
      const candidates = dmCandidateOrder(pair, seat);
      const promptText = dmJudgePrompt({ task: pair.rows[0].promptText, scoring, rubricText, candidates });
      if (previous && (previous.promptHash !== digest(promptText) || previous.promptText !== promptText || JSON.stringify(previous.candidateOrder) !== JSON.stringify(candidates.map(row => row.rowKey)))) throw new Error("A recovering judge prompt/order changed.");
      const unit = digest(key).slice(0, 20);
      const historyPath = path.join(recoveryDirectory, `judge-before-${unit}.json`);
      if (previous) atomic(historyPath, previous);
      const record = { judgeId, status: "running", promptText, promptHash: digest(promptText), candidateOrder: candidates.map(row => row.rowKey),
        attempts: previous?.attempts ?? [], history: [...(previous?.history ?? []), ...(previous ? [{ path: path.relative(runDirectory, historyPath), sha256: digest(fs.readFileSync(historyPath)) }] : [])] };
      if (index < 0) savedPair.judges.push(record); else savedPair.judges[index] = record;
      const evidenceDirectory = path.join(runDirectory, "judge-evidence", digest(pair.pairId).slice(0, 16), judgeId, `operator-${recoveryId}`);
      const attempt = { attempt: record.attempts.length + 1, recoveryId, startedAt: new Date().toISOString(), status: "running", evidenceDirectory: path.relative(runDirectory, evidenceDirectory) };
      record.attempts.push(attempt); execution.calls.push({ kind: "judge", pairId: pair.pairId, judgeId, evidenceDirectory: attempt.evidenceDirectory }); checkpoint();
      let result;
      try {
        result = await runtime({ configuration, promptText, outputSchema: dmJudgeSchema(scoring), evidenceDirectory, timeoutMs: run.generation.timeoutMs });
        const outputText = result.outputText ?? result.text;
        fs.writeFileSync(path.join(evidenceDirectory, "answer.json"), outputText, { mode: 0o600 });
        const normalized = validateDmJudgeOutput(outputText, scoring, candidates);
        Object.assign(attempt, { status: "completed", completedAt: new Date().toISOString(), outputHash: digest(outputText), usage: result.usage, durationMs: result.durationMs });
        Object.assign(record, { status: "completed", outputText, outputHash: digest(outputText), ...normalized,
          runtimeReceipt: result.runtimeReceipt, usage: result.usage, durationMs: result.durationMs, costUsd: result.costUsd ?? null });
        process.stdout.write(`Recovered judge ${pair.caseId} trial ${pair.trialNumber} ${judgeId}\n`);
      } catch (error) {
        Object.assign(attempt, { status: "failed", completedAt: new Date().toISOString(),
          ...(result ? { outputHash: digest(result.outputText ?? result.text), usage: result.usage, durationMs: result.durationMs, runtimeReceipt: result.runtimeReceipt } : {}),
          error: { code: error.code ?? "DM_JUDGE_INVALID", message: error.message, context: error.context ?? null } });
        record.status = "failed"; detectQuota(evidenceDirectory);
        process.stdout.write(`Judge recovery failed ${pair.caseId} ${judgeId}; quotaCircuit=${execution.quotaCircuitOpen}\n`);
      }
      checkpoint();
    }
    run.runStatus = "operator-recovery"; judges.status = "running"; checkpoint();
    const inFlight = new Set();
    let fatal = null;
    while (true) {
      const jobs = run.rows.filter(row => row.rowStatus !== "complete" && !attemptedRows.has(row.rowKey)).map(row => () => write(row));
      for (const pair of dmPairs(run)) for (let seat = 0; seat < DM_JUDGE_IDS.length; seat += 1) {
        const judgeId = DM_JUDGE_IDS[seat];
        const current = judges.pairs.find(entry => entry.pairId === pair.pairId)?.judges.find(entry => entry.judgeId === judgeId);
        if (current?.status !== "completed" && !attemptedJudges.has(`${pair.pairId}::${judgeId}`)) jobs.push(() => review(pair, seat));
      }
      while (jobs.length && inFlight.size < concurrency && !execution.quotaCircuitOpen && !fatal) {
        let promise;
        promise = jobs.shift()().catch(error => { fatal = error; }).finally(() => inFlight.delete(promise));
        inFlight.add(promise);
      }
      if (inFlight.size) { await Promise.race(inFlight); continue; }
      break;
    }
    if (fatal) { execution.status = "error"; execution.error = fatal.message; checkpoint(); throw fatal; }
    const writersComplete = run.rows.every(row => row.rowStatus === "complete");
    const judgesComplete = judges.pairs.length === run.generation.expectedPairs && judges.pairs.every(pair => pair.judges.length === 2 && pair.judges.every(judge => judge.status === "completed"));
    run.runStatus = writersComplete ? "generation-complete" : "generation-incomplete";
    judges.status = judgesComplete ? "completed" : "incomplete";
    execution.status = writersComplete && judgesComplete ? "completed" : "incomplete";
    execution.completedAt = new Date().toISOString();
    execution.finalCoverage = { writers: run.rows.filter(row => row.rowStatus === "complete").length,
      judgeReviews: judges.pairs.flatMap(pair => pair.judges).filter(judge => judge.status === "completed").length };
    execution.preservedSuccessesVerified = true;
    run.judging = structuredClone(judges); // Attach the final judgment checkpoint once, after every dispatched call settles.
    checkpoint();
    execution.finalRunSha256 = digest(fs.readFileSync(runFile)); execution.finalJudgesSha256 = digest(fs.readFileSync(judgesFile));
    atomic(path.join(recoveryDirectory, "recovery.json"), execution);
    process.stdout.write(JSON.stringify({ status: execution.status, recoveryDirectory, ...execution.finalCoverage, finalRunSha256: execution.finalRunSha256 }) + "\n");
    return execution;
  } finally {
    for (const lock of locks.reverse()) { fs.closeSync(lock.descriptor); fs.unlinkSync(lock.file); }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { "run-directory": { type: "string" }, "archive-directory": { type: "string" }, authorization: { type: "string" }, concurrency: { type: "string", default: "4" } } });
  if (!values["run-directory"] || !values["archive-directory"]) throw new Error("Specify the exact run and pre-resume archive directories.");
  resumeDungeonMasterBenchmark({ runDirectory: path.resolve(values["run-directory"]), archiveDirectory: path.resolve(values["archive-directory"]), authorization: values.authorization, concurrency: Number(values.concurrency) })
    .catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
}
