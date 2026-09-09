import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBenchmarkConfiguration } from './benchmark-models.js';
import { compactDigest, compactWordCount, exportCompactRun, runCompactAgent } from './writing-compact-runtime.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const scopeFilename = 'pending-low-medium-continuation.json';
const scopeHashFilename = 'pending-low-medium-continuation.sha256';
const ownSources = ['cli/eval/writing-compact-pending-controller.js', 'benchmarks/writing-compact-v1/continue-healthy.mjs'];
export const COMPACT_HEALTHY_CONTINUATION_VERSION = 'writing-compact-untouched-opus-low-medium-v1';
const allowedConfigurations = ['claude:claude-opus-5@low', 'claude:claude-opus-5@medium'];
const readJson = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const writeJsonOnce = (filename, value) => fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
const shaSources = () => ownSources.map(relativePath => ({ path: relativePath, sha256: compactDigest(fs.readFileSync(path.join(root, relativePath))) }));

function checkExistingSourcePins(snapshot) {
  for (const source of snapshot.amendment?.sourceHashes ?? snapshot.manifest.sourceHashes) {
    assert.equal(compactDigest(fs.readFileSync(path.join(root, source.path))), source.sha256,
      `Frozen runtime source changed: ${source.path}`);
  }
}

function intendedSlots(snapshot) {
  const slots = snapshot.manifest.generationPlan.filter(row => allowedConfigurations.includes(row.configurationId));
  assert.equal(slots.length, 20, 'Expected exactly the 20 declared Opus low/medium generation slots.');
  assert.ok(slots.every(row => ['baseline', 'skill'].includes(row.condition)));
  return slots;
}

export function prepareCompactHealthyContinuation({ runDirectoryPath, now = new Date().toISOString() }) {
  assert.ok(!fs.existsSync(path.join(runDirectoryPath, scopeFilename)), 'The healthy continuation scope already exists.');
  const snapshot = exportCompactRun({ runDirectoryPath });
  assert.ok(!snapshot.globalStop, 'An authentication or quota stop prohibits continuation.');
  checkExistingSourcePins(snapshot);
  const slots = intendedSlots(snapshot);
  for (const slot of slots) assert.equal(snapshot.generations.find(row => row.id === slot.id)?.status, 'pending',
    'Every selected generation must be untouched before this continuation is prepared.');
  const scope = { schemaVersion: 1, version: COMPACT_HEALTHY_CONTINUATION_VERSION, createdAt: now,
    manifestSha256: snapshot.manifestSha256, runtimeAmendmentSha256: snapshot.amendmentSha256 ?? null,
    controllerSourceHashes: shaSources(), configurationIds: allowedConfigurations,
    generationIds: slots.map(row => row.id),
    policy: { untouchedOnly: true, existingAttemptsMayBeRepeated: false, concurrency: 2, automaticHostRetries: 0,
      originalPromptsAndSkillBundles: true, claudeMaxTurns: 1, claudeMaxOutputTokensPerRequest: 8192,
      requestedEfforts: ['low', 'medium'], maxEffortDispatch: false,
      providerOutputLimitRecovery: 'The Claude CLI has an internal output-limit recovery loop independent of network retries. This controller preserves the original 8192-token request limit and stops further healthy dispatch if that failure is observed.',
      stopOnQuotaOrAuthentication: true, stopOnOutputLimitFailure: true } };
  writeJsonOnce(path.join(runDirectoryPath, scopeFilename), scope);
  fs.writeFileSync(path.join(runDirectoryPath, scopeHashFilename), `${compactDigest(scope)}\n`, { flag: 'wx' });
  return { runId: snapshot.runId, scopeSha256: compactDigest(scope), generationCount: slots.length,
    configurationIds: allowedConfigurations, status: 'healthy-untouched-scope-prepared' };
}

export function readCompactHealthyContinuation({ runDirectoryPath, snapshot = exportCompactRun({ runDirectoryPath }) }) {
  const scope = readJson(path.join(runDirectoryPath, scopeFilename));
  assert.equal(compactDigest(scope), fs.readFileSync(path.join(runDirectoryPath, scopeHashFilename), 'utf8').trim(), 'Continuation scope hash changed.');
  return validateCompactHealthyContinuation(snapshot, scope);
}

export function validateCompactHealthyContinuation(snapshot, scope) {
  assert.equal(scope.schemaVersion, 1);
  assert.equal(scope.version, COMPACT_HEALTHY_CONTINUATION_VERSION);
  assert.equal(scope.manifestSha256, snapshot.manifestSha256);
  assert.equal(scope.runtimeAmendmentSha256, snapshot.amendmentSha256 ?? null);
  assert.deepEqual(scope.configurationIds, allowedConfigurations);
  assert.deepEqual(scope.policy, {
    untouchedOnly: true, existingAttemptsMayBeRepeated: false, concurrency: 2, automaticHostRetries: 0,
    originalPromptsAndSkillBundles: true, claudeMaxTurns: 1, claudeMaxOutputTokensPerRequest: 8192,
    requestedEfforts: ['low', 'medium'], maxEffortDispatch: false,
    providerOutputLimitRecovery: 'The Claude CLI has an internal output-limit recovery loop independent of network retries. This controller preserves the original 8192-token request limit and stops further healthy dispatch if that failure is observed.',
    stopOnQuotaOrAuthentication: true, stopOnOutputLimitFailure: true
  }, 'The continuation policy must retain its exact execution restrictions.');
  assert.deepEqual(scope.generationIds, intendedSlots(snapshot).map(row => row.id), 'Continuation cannot select failed, unrelated, or max-effort slots.');
  assert.deepEqual(scope.controllerSourceHashes, shaSources(), 'Healthy continuation controller changed after preparation.');
  checkExistingSourcePins(snapshot);
  for (const row of snapshot.generations.filter(row => row.attempt?.controllerVersion === COMPACT_HEALTHY_CONTINUATION_VERSION)) {
    assert.ok(scope.generationIds.includes(row.id));
    assert.equal(row.attempt.number, 1);
    assert.equal(row.attempt.automaticRetries, 0);
    assert.equal(row.attempt.controllerScopeSha256, compactDigest(scope));
    assert.deepEqual(row.attempt.controllerSourceHashes, scope.controllerSourceHashes);
  }
  return scope;
}

function stopOnce(filename, value) {
  try { writeJsonOnce(filename, value); } catch (error) { if (error.code !== 'EEXIST') throw error; }
}

export async function runCompactHealthyContinuation({ runDirectoryPath, limit = Infinity, concurrency = 2,
  spawnImplementation = childProcess.spawn, environmentVariables = process.env, signal = null, onProgress = () => {} }) {
  assert.ok(limit === Infinity || Number.isInteger(limit) && limit >= 0, 'Limit must be a nonnegative integer.');
  assert.ok(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 2, 'Concurrency must be one or two.');
  const lockPath = path.join(runDirectoryPath, 'dispatch.lock');
  const lock = fs.openSync(lockPath, 'wx');
  fs.writeFileSync(lock, `${JSON.stringify({ pid: process.pid, controller: COMPACT_HEALTHY_CONTINUATION_VERSION, createdAt: new Date().toISOString() })}\n`);
  try {
    const snapshot = exportCompactRun({ runDirectoryPath });
    assert.ok(!snapshot.globalStop, 'An authentication or quota stop prohibits continuation.');
    assert.ok(!fs.existsSync(path.join(runDirectoryPath, 'healthy-continuation-stop.json')), 'Healthy continuation was stopped after an output-limit failure.');
    const scope = readCompactHealthyContinuation({ runDirectoryPath, snapshot });
    const scopeSha256 = compactDigest(scope);
    const queue = scope.generationIds.map(id => snapshot.generations.find(row => row.id === id))
      .filter(row => row.status === 'pending').slice(0, limit);
    let next = 0, dispatched = 0, halted = false;
    async function worker() {
      while (!halted && !signal?.aborted && next < queue.length) {
        const selected = queue[next++];
        const slot = snapshot.manifest.generationPlan.find(row => row.id === selected.id);
        const configuration = resolveBenchmarkConfiguration(slot.configurationId);
        assert.ok(allowedConfigurations.includes(configuration.id));
        const directory = path.join(runDirectoryPath, 'generations', slot.id);
        fs.mkdirSync(directory); // The immutable reservation prevents repeating any prior attempt.
        const task = snapshot.manifest.specification.cases.find(row => row.id === slot.caseId);
        const bundle = slot.condition === 'skill' ? snapshot.manifest.frozenBundles.find(row => row.caseId === slot.caseId) : null;
        const payload = { systemAppend: bundle?.text ?? null, user: task.task };
        const attempt = { number: 1, automaticRetries: 0, startedAt: new Date().toISOString(),
          inputPayloadSha256: compactDigest(payload), ...slot,
          controllerVersion: COMPACT_HEALTHY_CONTINUATION_VERSION, controllerScopeSha256: scopeSha256,
          controllerSourceHashes: scope.controllerSourceHashes };
        writeJsonOnce(path.join(directory, 'attempted.json'), attempt);
        fs.writeFileSync(path.join(directory, 'prompt.txt'), task.task, { flag: 'wx' });
        writeJsonOnce(path.join(directory, 'input-payload.json'), payload);
        if (bundle) fs.writeFileSync(path.join(directory, 'system-prompt.txt'), bundle.text, { flag: 'wx' });
        onProgress({ event: 'started', kind: 'generations', id: slot.id, configurationId: configuration.id,
          caseId: slot.caseId, condition: slot.condition, controller: COMPACT_HEALTHY_CONTINUATION_VERSION });
        const result = await runCompactAgent({ configuration, promptText: task.task, bundleText: bundle?.text ?? null,
          artifactDirectoryPath: directory, spawnImplementation, environmentVariables, signal });
        const record = { ...slot, ...result, attempt, artifactDirectory: path.relative(runDirectoryPath, directory),
          finishedAt: new Date().toISOString(), wordCount: compactWordCount(result.responseText),
          wordLimitExceeded: compactWordCount(result.responseText) > task.wordLimit,
          blindingWarnings: /\b(?:Claude|Fable|Opus|GPT-[\d.]|skill[- ]assisted|baseline condition)\b/i.test(result.responseText)
            ? ['Candidate text may disclose identity or treatment; original answer preserved.'] : [] };
        if (record.globalStopReason) {
          halted = true; record.status = 'failed';
          record.error ??= { name: 'ProviderStop', message: record.globalStopReason };
          stopOnce(path.join(runDirectoryPath, 'STOP.json'), { reason: record.globalStopReason, attemptId: record.id, at: record.finishedAt });
        }
        if (record.status === 'failed' && /output token|output_tokens|max_tokens/.test(`${record.responseText}\n${record.error?.message ?? ''}`)) {
          halted = true;
          stopOnce(path.join(runDirectoryPath, 'healthy-continuation-stop.json'), {
            reason: 'output-limit-failure', attemptId: record.id, at: record.finishedAt, controllerScopeSha256: scopeSha256 });
        }
        writeJsonOnce(path.join(directory, 'result.json'), record);
        fs.writeFileSync(path.join(directory, 'result.sha256'), `${compactDigest(record)}\n`, { flag: 'wx' });
        dispatched++;
        onProgress({ event: 'finished', kind: 'generations', id: record.id, status: record.status,
          durationMs: record.durationMs, wordCount: record.wordCount, error: record.error?.message ?? null });
      }
    }
    const workers = await Promise.allSettled(Array.from({ length: concurrency }, () => worker().catch(error => { halted = true; throw error; })));
    const failed = workers.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    return { dispatched, halted, interrupted: signal?.aborted ?? false, scopeSha256,
      snapshot: exportCompactRun({ runDirectoryPath }) };
  } finally { fs.closeSync(lock); fs.unlinkSync(lockPath); }
}
