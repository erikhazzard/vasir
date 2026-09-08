import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

// Operational evidence only: the existing frozen expansion controller remains
// the sole writer of benchmark checkpoints and the sole scored-call scheduler.
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });

export function verifyRecoveryConcurrency(attempts, maximumConcurrency = 16) {
  assert.ok(Number.isInteger(maximumConcurrency) && maximumConcurrency >= 1 && maximumConcurrency <= 16, 'Root allocation cannot exceed sixteen.');
  const events = attempts.flatMap(attempt => {
    const start = Date.parse(attempt.startedAt), end = Date.parse(attempt.completedAt);
    assert.ok(Number.isFinite(start) && Number.isFinite(end) && end > start, 'Completed attempt timestamps are invalid.');
    return [{ time: start, delta: 1 }, { time: end, delta: -1 }];
  });
  let active = 0, peak = 0;
  for (const event of events.sort((left, right) => left.time - right.time || left.delta - right.delta)) {
    active += event.delta;
    assert.ok(active >= 0);
    peak = Math.max(peak, active);
  }
  assert.equal(active, 0);
  assert.ok(peak <= maximumConcurrency, `Observed concurrency ${peak} exceeds allocation ${maximumConcurrency}.`);
  return peak;
}

async function main() {
const { values } = parseArgs({ options: {
  stage: { type: 'string' }, 'run-directory': { type: 'string' },
  'archive-directory': { type: 'string' }, authorization: { type: 'string' }, 'capacity-file': { type: 'string' }
} });
assert.ok(['readiness', 'audit'].includes(values.stage), 'Choose readiness or audit.');
assert.ok(values.authorization?.trim(), 'Existing explicit user authorization must be recorded.');
const runDirectory = path.resolve(values['run-directory']);
const archiveDirectory = path.resolve(values['archive-directory']);
assert.notEqual(runDirectory, archiveDirectory);
const archive = read(path.join(archiveDirectory, 'checkpoint-archive.json'));
const originalBytes = fs.readFileSync(path.join(archiveDirectory, 'run.json'));
assert.equal(digest(originalBytes), archive.runSha256);
const original = JSON.parse(originalBytes);
const frozen = await import(pathToFileURL(path.join(runDirectory, 'runtime-source/cli/eval/expand-dungeon-master-benchmark.js')));
const sourceSha256 = digest(fs.readFileSync(fileURLToPath(import.meta.url)));
const lockPath = path.join(runDirectory, 'run.lock');
const descriptor = fs.openSync(lockPath, 'wx', 0o600);
fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, operation: `dm-capacity-${values.stage}`, startedAt: new Date().toISOString() }));
try {
  assert.ok(!fs.existsSync(path.join(runDirectory, 'judges.lock')), 'Judge writer is active.');
  const run = frozen.inspectDungeonMasterExpansion(runDirectory);
  assert.equal(run.cohortExtension.manifestHash, archive.manifestHash);
  assert.ok(!run.expansionExecution.attempts.some(attempt => attempt.status === 'running'), 'Provider attempts have not drained.');
  assert.ok(!run.expansionExecution.sessions.some(session => session.status === 'running'), 'Controller has not drained.');
  for (const file of archive.files) {
    const archived = fs.readFileSync(path.join(archiveDirectory, file.path));
    assert.equal(archived.length, file.bytes);
    assert.equal(digest(archived), file.sha256, `Archive changed: ${file.path}`);
    if (file.path === 'run.json' && values.stage === 'audit') continue;
    assert.deepEqual(fs.readFileSync(path.join(runDirectory, file.path)), archived, `Existing evidence changed: ${file.path}`);
  }
  const accountContexts = {
    codex: digest(process.env.CODEX_HOME || path.join(process.env.HOME || '', '.codex')),
    claude: digest(process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || '', '.claude'))
  };
  assert.deepEqual(accountContexts, run.expansionExecution.accountContexts, 'Do not switch account contexts.');
  const relative = `operator-capacity/${values.stage}-${new Date().toISOString().replaceAll(':', '-')}`;
  const directory = path.join(runDirectory, relative);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.copyFileSync(fileURLToPath(import.meta.url), path.join(directory, 'operator-source.mjs'), fs.constants.COPYFILE_EXCL);
  const base = { schemaVersion: 1, authorization: values.authorization, sourceSha256, archiveDirectory,
    archivedRunSha256: archive.runSha256, manifestHash: archive.manifestHash, accountContexts };
  if (values.stage === 'readiness') {
    frozen.verifyDungeonMasterExpansionPreflight(runDirectory, run, ['codex']);
    assert.ok(values['capacity-file'], 'Provide the fresh same-account capacity receipt.');
    const capacityBytes = fs.readFileSync(path.resolve(values['capacity-file']));
    const capacity = JSON.parse(capacityBytes);
    assert.equal(digest(capacity.authenticationContextDirectory), accountContexts.codex);
    assert.ok(Date.now() - Date.parse(capacity.checkedAt) <= 10 * 60 * 1000 && Date.parse(capacity.checkedAt) <= Date.now(), 'Capacity receipt must be recent.');
    assert.equal(capacity.rateLimits.spendControlReached, false);
    assert.equal(capacity.rateLimits.rateLimitReachedType, null);
    assert.ok(capacity.rateLimits.primary.usedPercent < 100);
    fs.writeFileSync(path.join(directory, 'capacity.json'), capacityBytes, { flag: 'wx', mode: 0o600 });
    const configuration = run.configurations.find(item => item.id === 'codex:gpt-6-astra@low');
    assert.ok(configuration);
    const promptText = 'This is an excluded infrastructure readiness check, not a benchmark task. Reply only READY. Do not use tools.';
    const request = { ...base, excludedFromScores: true, maximumCalls: 1, configuration, promptText,
      startedAt: new Date().toISOString(), capacity: { sourceFile: path.resolve(values['capacity-file']), sha256: digest(capacityBytes), checkedAt: capacity.checkedAt } };
    save(path.join(directory, 'request.json'), request);
    const { runDungeonMasterAgent } = await import(pathToFileURL(path.join(runDirectory, 'parent-evidence/runtime-source/cli/eval/dungeon-master-agent-runtime.js')));
    try {
      const result = await runDungeonMasterAgent({ configuration, promptText, evidenceDirectory: directory,
        timeoutMs: run.generation.timeoutMs, environmentVariables: process.env });
      save(path.join(directory, 'result.json'), result);
      assert.ok((result.outputText ?? result.text)?.trim(), 'Readiness lacks a final answer.');
      const diagnostic = frozen.dmExpansionDiagnostic(directory);
      assert.ok(!diagnostic.quota && !diagnostic.operational && !diagnostic.policy, 'Readiness has terminal provider evidence.');
      const files = ['request.json', 'result.json', 'stdout.jsonl', 'stderr.txt', 'operator-source.mjs', 'capacity.json'].map(name => {
        const bytes = fs.readFileSync(path.join(directory, name));
        return { path: `${relative}/${name}`, bytes: bytes.length, sha256: digest(bytes) };
      });
      const resolutionFile = path.join(directory, 'resolution.json');
      const resolution = { ...base, status: 'resolved', excludedFromScores: true, verifiedAt: new Date().toISOString(),
        providers: [{ provider: 'codex', files }] };
      save(resolutionFile, resolution);
      frozen.verifyDungeonMasterExpansionResolution(runDirectory, run, resolutionFile, accountContexts);
      console.log(JSON.stringify({ status: 'resolved', resolutionFile, providerCalls: 1, excludedFromScores: true }));
    } catch (error) {
      save(path.join(directory, 'failure.json'), { ...base, status: 'failed', completedAt: new Date().toISOString(),
        error: { code: error.code || null, message: error.message, context: error.context || null },
        diagnostic: frozen.dmExpansionDiagnostic(directory, error) });
      throw error;
    }
    assert.equal(digest(fs.readFileSync(path.join(runDirectory, 'run.json'))), archive.runSha256, 'Readiness changed scored checkpoint.');
  } else {
    const judging = await import(pathToFileURL(path.join(runDirectory, 'runtime-source/cli/eval/judge-dungeon-master-benchmark.js')));
    const completePairs = judging.dmPairs(run);
    const priorRows = original.rows.filter(row => row.rowStatus === 'complete');
    for (const row of priorRows) assert.deepEqual(run.rows.find(item => item.rowKey === row.rowKey), row, `Successful writer changed: ${row.rowKey}`);
    const priorReviews = original.judging.pairs.flatMap(pair => pair.judges.filter(judge => judge.status === 'completed').map(judge => ({ pairId: pair.pairId, judge })));
    for (const { pairId, judge } of priorReviews) assert.deepEqual(run.judging.pairs.find(pair => pair.pairId === pairId)?.judges.find(item => item.judgeId === judge.judgeId), judge, `Successful review changed: ${pairId}/${judge.judgeId}`);
    assert.deepEqual(run.expansionExecution.attempts.slice(0, original.expansionExecution.attempts.length), original.expansionExecution.attempts, 'Prior attempts changed.');
    const appended = run.expansionExecution.attempts.slice(original.expansionExecution.attempts.length);
    const oldThreads = new Set([...priorRows, ...priorReviews.map(item => item.judge)].map(record => record.runtimeReceipt?.threadId).filter(Boolean));
    for (const attempt of appended) {
      const streams = attempt.runtimeReceipt || attempt.error?.context;
      assert.equal(streams?.rawStreamsRetained, true, `Missing raw receipt: ${attempt.key}`);
      for (const [name, prefix] of [['stdout.jsonl', 'stdout'], ['stderr.txt', 'stderr']]) {
        const bytes = fs.readFileSync(path.join(runDirectory, attempt.evidenceDirectory, name));
        assert.equal(bytes.length, streams[`${prefix}Bytes`]);
        assert.equal(digest(bytes), streams[`${prefix}Sha256`]);
      }
      if (attempt.status !== 'complete') continue;
      const answer = fs.readFileSync(path.join(runDirectory, attempt.evidenceDirectory, attempt.kind === 'writer' ? 'answer.md' : 'answer.json'), 'utf8');
      assert.equal(digest(answer), attempt.outputHash);
      const record = attempt.kind === 'writer' ? run.rows.find(row => row.rowKey === attempt.key)
        : run.judging.pairs.flatMap(pair => pair.judges.map(judge => ({ key: `${pair.pairId}::${judge.judgeId}`, judge }))).find(item => item.key === attempt.key)?.judge;
      assert.ok(record, `Missing completed record: ${attempt.key}`);
      assert.equal(record.outputText, answer);
      assert.equal(record.outputHash, attempt.outputHash);
      const receipt = attempt.runtimeReceipt;
      assert.equal(receipt.freshSession, true);
      assert.equal(receipt.persistedSession, false);
      assert.ok(receipt.threadId && !oldThreads.has(receipt.threadId), 'A successful session was reused.');
      oldThreads.add(receipt.threadId);
      assert.equal(receipt.requestedConfiguration.id, attempt.configurationId);
      assert.equal(receipt.userPromptSha256, digest(record.promptText));
      if (attempt.kind === 'judge') {
        assert.equal(attempt.configurationId, 'codex:gpt-6-astra@ultra');
        const pair = completePairs.find(item => attempt.key === `${item.pairId}::${record.judgeId}`);
        assert.ok(pair, 'A successful review lacks its two completed candidates.');
        const candidates = judging.dmCandidateOrder(pair, judging.DM_JUDGE_IDS.indexOf(record.judgeId));
        const prompt = judging.dmJudgePrompt({ task: candidates[0].promptText, scoring: run.benchmark.definition.scoring,
          rubricText: run.benchmark.definition.scoring.judgeInstructions, candidates });
        assert.equal(record.promptText, prompt);
        assert.equal(record.promptHash, digest(prompt));
        assert.deepEqual(record.candidateOrder, candidates.map(candidate => candidate.rowKey));
        for (const [field, value] of Object.entries(judging.validateDmJudgeOutput(answer, run.benchmark.definition.scoring, candidates))) {
          assert.deepEqual(record[field], value);
        }
      }
    }
    const maximumObservedConcurrency = verifyRecoveryConcurrency(appended, 16);
    for (const session of run.expansionExecution.sessions.slice(original.expansionExecution.sessions.length)) {
      const attempts = appended.filter(attempt => attempt.sessionId === session.id);
      assert.equal(attempts.length, session.calls);
      verifyRecoveryConcurrency(attempts, session.concurrency);
      const stoppedAt = Math.min(...attempts.filter(attempt => ['quota', 'operational'].includes(attempt.failureClass)).map(attempt => Date.parse(attempt.completedAt)));
      assert.ok(attempts.every(attempt => Date.parse(attempt.startedAt) <= stoppedAt), 'Dispatch continued after terminal provider failure.');
    }
    const audit = { ...base, status: 'passed', auditedAt: new Date().toISOString(), currentRunSha256: digest(fs.readFileSync(path.join(runDirectory, 'run.json'))),
      preservedFiles: archive.files.length - 1, preservedSuccessfulWriters: priorRows.length, preservedSuccessfulReviews: priorReviews.length,
      preservedAttempts: original.expansionExecution.attempts.length,
      appendedAttempts: appended.length, maximumObservedConcurrency,
      completeRows: run.rows.filter(row => row.rowStatus === 'complete').length,
      completeReviews: run.judging.pairs.flatMap(pair => pair.judges).filter(judge => judge.status === 'completed').length,
      attempts: run.expansionExecution.attempts.length, runStatus: run.runStatus };
    save(path.join(directory, 'audit.json'), audit);
    console.log(JSON.stringify({ ...audit, auditFile: path.join(directory, 'audit.json') }));
  }
} finally {
  fs.closeSync(descriptor);
  fs.unlinkSync(lockPath);
}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
