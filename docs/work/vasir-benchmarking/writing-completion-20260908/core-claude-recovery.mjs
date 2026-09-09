import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import { judgeBenchmarkRows } from '../../../../cli/eval/benchmark-judge.js';
import { runStorytellingBenchmark, identifyStorytellingJudgeQuotaExhaustion } from '../../../../cli/eval/run-storytelling-benchmark.js';
import { runStorytellingAgent } from '../../../../cli/eval/storytelling-agent-runtime.js';
import { classifyWritingProviderFailure } from '../../../../cli/eval/writing-provider-failures.js';
import { verifyCoreJudgeOnlyRecovery } from '../writing-category/source-lineage.mjs';

export const CORE_RUN_ID = 'storytelling-core-idea-v1-2026-09-07';
export const CORE_REVIEW_ANCHOR = 'bdf31f6ba88a720057da05d31597dd80a35606201dff7c73a6a741a4cefe4280';
export const CORE_PUBLISHED_ANCHOR = '0b47f5bfa55fdce4c3fba9044bac1270ec57df9ee1ae85030a9970c8cfb156ac';
export const CORE_REVIEWER = 'claude:claude-fable-5-1@max';
export const CORE_TERMINAL_BATCHES = ['batch-242', 'batch-257', 'batch-283'];
export const CORE_CONTROLLER_VERSION = 'core-original-review-budget-preservation-v1';
const usageKeys = ['inputTokens', 'cachedInputTokens', 'cacheWriteInputTokens', 'cacheCreationInputTokens', 'cacheReadInputTokens', 'outputTokens', 'reasoningOutputTokens', 'totalTokens'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const jsonHash = value => hash(JSON.stringify(value));
const clone = value => structuredClone(value);
const identity = (configurationId, batchId) => `${configurationId}:${batchId}`;
const batches = judging => judging.judges.flatMap(judge => judge.batches.map(batch => [identity(judge.configuration.id, batch.batchId), batch]));
const deferred = reason => Object.assign(new Error(reason), { code: 'EVAL_BENCHMARK_JUDGE_DEFERRED', context: { executionAttempted: false, operationalController: CORE_CONTROLLER_VERSION } });
const legacyPolicyBlocked = batch => batch.error?.code === 'EVAL_AGENT_RUNTIME_FAILED' && batch.error.context?.apiErrorStatus === 400
  && /"type"\s*:\s*"result"/.test(batch.error.context.stdout ?? '') && /"is_error"\s*:\s*true/.test(batch.error.context.stdout ?? '')
  && /"result"\s*:\s*"API Error: 400 Output blocked by content filtering policy"/.test(batch.error.context.stdout ?? '');
const quota = batch => identifyStorytellingJudgeQuotaExhaustion({ error: batch.error, configuration: batch.configuration });
export function policyBlocked(batch, directory = null) {
  if (legacyPolicyBlocked(batch)) return true;
  const pin = batch.error?.context?.rawStreams?.stdout;
  if (!pin || !directory) return false;
  assert.ok(typeof pin.path === 'string' && !path.isAbsolute(pin.path) && !pin.path.includes('\\') && pin.path.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe retained review stream path.');
  const file = path.join(directory, pin.path);
  assert.ok(fs.realpathSync(file).startsWith(fs.realpathSync(directory) + path.sep), 'Retained review stream escaped the run.');
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.length, pin.bytes, 'Retained review stream byte count changed.');
  assert.equal(hash(bytes), pin.sha256, 'Retained review stream hash changed.');
  return classifyWritingProviderFailure({ configuration: batch.configuration, error: batch.error, stdout: bytes.toString('utf8') })?.kind === 'policy';
}

export function selectCoreReviews(anchor, current, { directory = null } = {}) {
  verifyCoreJudgeOnlyRecovery(anchor, current);
  const original = anchor.judging.judges.find(judge => judge.configuration.id === CORE_REVIEWER);
  const latest = current.judging.judges.find(judge => judge.configuration.id === CORE_REVIEWER);
  assert.ok(original && latest);
  for (const id of CORE_TERMINAL_BATCHES) {
    const batch = original.batches.find(item => item.batchId === id);
    assert.ok(batch && policyBlocked(batch), 'The exact original terminal policy evidence is required.');
    assert.deepEqual(latest.batches.find(item => item.batchId === id), batch, 'A terminal review changed.');
  }
  const eligible = original.batches.filter(batch => batch.status !== 'complete' && !CORE_TERMINAL_BATCHES.includes(batch.batchId));
  assert.equal(eligible.length, 96, 'The original recoverable inventory must remain exactly 96.');
  return eligible.flatMap(prior => {
    const batch = latest.batches.find(item => item.batchId === prior.batchId);
    assert.ok(batch);
    for (const field of ['batchId', 'reviewerId', 'configuration', 'candidateIds', 'groupHashes', 'basisHash', 'promptHash', 'promptText', 'promptBytes'])
      assert.deepEqual(batch[field], prior[field], 'Frozen review identity changed: ' + field);
    if (batch.status === 'complete' || policyBlocked(batch, directory)) return [];
    assert.ok(batch.status === 'deferred' && batch.executionAttempted === false || batch.status === 'error' && quota(batch), 'Unknown review failures require a new decision.');
    return [batch];
  });
}

const sumUsage = records => records.some(record => record.usage) ? Object.fromEntries(usageKeys.map(key => [key, records.reduce((sum, record) => sum + Number(record.usage?.[key] ?? 0), 0)])) : null;
const sumCost = records => {
  const values = records.map(record => record.costUsd).filter(Number.isFinite);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) * 1e6) / 1e6 : null;
};

// This preserves records, not invented successful placeholders. Only a newly
// attempted original slot may replace its prior record; its old bytes live in
// the immutable prestate and the per-call journal. No scoring rule is changed.
export function preserveCoreJudging(prior, incoming, attempted, directory = null) {
  for (const field of ['cohortHash', 'cohortSize', 'candidateOrder', 'batchPlan', 'judgeConfigurations'])
    assert.deepEqual(incoming[field], prior[field], 'The original full judging plan changed: ' + field);
  const next = clone(incoming);
  next.judges = prior.judges.map(oldJudge => {
    const current = incoming.judges.find(judge => judge.configuration.id === oldJudge.configuration.id);
    assert.ok(current, 'An original reviewer disappeared.');
    const merged = oldJudge.batches.map(oldBatch => {
      if (!attempted.has(identity(oldJudge.configuration.id, oldBatch.batchId))) return clone(oldBatch);
      assert.notEqual(oldBatch.status, 'complete', 'Completed reviews cannot be replaced.');
      assert.ok(!policyBlocked(oldBatch, directory), 'Terminal policy reviews cannot be replaced.');
      const replacement = current.batches.find(batch => batch.batchId === oldBatch.batchId);
      if (!replacement) return clone(oldBatch); // An in-flight call is not a result.
      for (const field of ['configuration', 'candidateIds', 'groupHashes', 'basisHash', 'promptHash', 'promptText', 'promptBytes'])
        assert.deepEqual(replacement[field], oldBatch[field], 'A replacement changed frozen review ' + field);
      return clone(replacement);
    });
    if (merged.every((batch, index) => jsonHash(batch) === jsonHash(oldJudge.batches[index]))) return clone(oldJudge);
    const allComplete = merged.every(batch => batch.status === 'complete');
    // Three preserved terminal seats mean the Fable reviewer remains incomplete.
    assert.equal(allComplete, false, 'This operational cohort cannot erase terminal exclusions.');
    const evaluations = new Map(merged.flatMap(batch => batch.evaluations.map(evaluation => [evaluation.candidateId, evaluation])));
    const failedBatchIds = merged.filter(batch => batch.status !== 'complete').map(batch => batch.batchId);
    const deferredCount = merged.filter(batch => batch.status === 'deferred').length;
    return { ...clone(oldJudge), ...clone(current), batches: merged, status: 'error', evaluationHash: null, ranking: [], reused: false,
      // The full immutable plan hashes/text stay fixed even at partial checkpoints.
      basisHash: oldJudge.basisHash, promptHash: oldJudge.promptHash, promptText: oldJudge.promptText,
      evaluations: prior.candidateOrder.map(candidate => evaluations.get(candidate.candidateId)).filter(Boolean),
      outputText: merged.filter(batch => typeof batch.outputText === 'string' && batch.outputText.trim()).map(batch => `===== PANEL OUTPUT ${batch.batchId} =====\n${batch.outputText}`).join('\n\n') || null,
      comparativeNote: merged.filter(batch => batch.comparativeNote).map(batch => `${batch.batchId}: ${batch.comparativeNote}`).join('\n'),
      usage: sumUsage(merged), costUsd: sumCost(merged), durationMs: merged.reduce((sum, batch) => sum + Number(batch.durationMs ?? 0), 0),
      runtimeReceipt: { batched: true, batchCount: merged.length, freshSession: true, persistedSession: false,
        ...(deferredCount ? { attemptedBatchCount: merged.length - deferredCount, deferredBatchCount: deferredCount } : {}) },
      error: { code: 'EVAL_BENCHMARK_JUDGE_BATCHES_INCOMPLETE', message: `${oldJudge.configuration.id} completed ${merged.length - failedBatchIds.length}/${merged.length} judge batches.`,
        suggestion: 'Retained policy-blocked batches are terminal; only separately authorized recoverable original slots may continue.', context: { failedBatchIds } } };
  });
  next.usage = sumUsage(next.judges); next.costUsd = sumCost(next.judges);
  return next;
}

export function createCoreJudgeAdapter({ initialRun, eligible, maximumCalls = 20, concurrency = 4, directory = null,
  judgeRowsImplementation = judgeBenchmarkRows, shouldPause = () => false, onAttempt = () => {}, onBatch = () => {}, report = () => {} }) {
  assert.ok(Number.isInteger(maximumCalls) && maximumCalls > 0 && maximumCalls <= 20);
  assert.ok(Number.isInteger(concurrency) && concurrency > 0 && concurrency <= 4);
  const state = { calls: 0, active: 0, peakActive: 0, stop: null, attempted: new Set(), checkpointCount: 0, planVerified: false, failure: null };
  const integrityFailure = (error, key = null) => {
    state.failure ??= { code: error.code ?? null, message: error.message };
    state.stop ??= { kind: 'integrity', key };
  };
  const assertIntegrity = () => assert.equal(state.failure, null, 'An operational integrity check failed: ' + JSON.stringify(state.failure));
  const selected = new Set(eligible.slice(0, maximumCalls).map(batch => identity(CORE_REVIEWER, batch.batchId)));
  const priorBatches = new Map(batches(initialRun.judging));
  const execute = async args => {
    // The frozen loader adds omitted optional properties with undefined values.
    // Compare persisted JSON semantics; every actual saved field stays exact.
    assert.deepEqual(JSON.parse(JSON.stringify(args.priorJudging)), initialRun.judging, 'Judging changed before the protected adapter acquired it.');
    assert.equal(args.judgeConcurrency, concurrency);
    const requests = new Map();
    // Pure planning pass through the unchanged judge: derive its exact schema,
    // prompt and timeout without a provider, callback, write, or fake completion.
    await judgeRowsImplementation({ ...args, judgingCheckpointImplementation: null, progressImplementation: null,
      agentRunnerImplementation: async request => {
        try {
          assert.equal(request.configuration.id, CORE_REVIEWER, 'A completed/non-Claude seat unexpectedly required work.');
          const batch = [...priorBatches.values()].find(item => item.configuration.id === request.configuration.id && item.promptHash === hash(request.promptText));
          assert.ok(batch && batch.promptText === request.promptText, 'Frozen planned prompt differs from retained source.');
          const key = identity(request.configuration.id, batch.batchId);
          assert.ok(!requests.has(key), 'Duplicate frozen provider request.');
          requests.set(key, request);
        } catch (error) { integrityFailure(error); throw error; }
        throw deferred('Planning only; no provider request attempted.');
      } });
    assertIntegrity();
    for (const key of selected) assert.ok(requests.has(key), 'A selected original slot disappeared.');
    state.planVerified = true;
    report({ event: 'core-frozen-plan-verified', plannedMissing: requests.size, selectedCalls: selected.size });
    const checkpointed = new Set();
    const result = await judgeRowsImplementation({ ...args,
      agentRunnerImplementation: async request => {
        let key;
        try {
          const match = [...requests].find(([, prior]) => prior.configuration.id === request.configuration.id && prior.promptText === request.promptText);
          assert.ok(match, 'Unknown provider request; dispatch forbidden.');
          const expected = match[1]; key = match[0];
          for (const field of ['configuration', 'promptText', 'outputSchema', 'timeoutMs']) assert.deepEqual(request[field], expected[field], 'Frozen provider arguments changed: ' + field);
          if (!selected.has(key) || state.stop || shouldPause() || state.calls >= maximumCalls) throw deferred('Original slot retained; outside this operational dispatch allocation.');
          assert.ok(!state.attempted.has(key), 'An original review cannot be called twice in a pass.');
          assert.ok(state.active < concurrency, 'Provider concurrency allocation exceeded.');
          onAttempt({ key, callNumber: state.calls + 1, configuration: request.configuration, promptSha256: hash(request.promptText), outputSchemaSha256: jsonHash(request.outputSchema) });
        } catch (error) {
          if (error.code !== 'EVAL_BENCHMARK_JUDGE_DEFERRED') integrityFailure(error, key);
          throw error;
        }
        state.calls++; state.active++; state.peakActive = Math.max(state.peakActive, state.active); state.attempted.add(key);
        try { return await args.agentRunnerImplementation(request); }
        catch (error) {
          const exhaustion = identifyStorytellingJudgeQuotaExhaustion({ error, configuration: request.configuration });
          if (exhaustion || error.code === 'AUTH_UNAVAILABLE') state.stop = { kind: exhaustion ? 'quota' : 'authentication', key, cause: exhaustion ?? null };
          throw error;
        } finally { state.active--; }
      },
      judgingCheckpointImplementation: async checkpoint => {
        const key = identity(checkpoint.completedBatch.configuration.id, checkpoint.completedBatch.batchId);
        // Reuse/defer jobs are not provider calls or new evidence. Avoid hundreds
        // of identical full-run disk writes while preserving the original plan.
        if (!state.attempted.has(key) || checkpointed.has(key)) return;
        try {
          const judging = preserveCoreJudging(initialRun.judging, checkpoint.judging, state.attempted, directory);
          const batch = new Map(batches(judging)).get(key);
          onBatch({ key, batch: clone(batch) }); checkpointed.add(key); state.checkpointCount++;
          return await args.judgingCheckpointImplementation?.({ ...checkpoint, judging, completedBatch: clone(batch) });
        } catch (error) {
          // Do not reject the frozen checkpoint chain while other calls are
          // in flight. Retain their raw responses, drain, then report failure.
          integrityFailure(error, key);
        }
      } });
    assertIntegrity();
    return { ...result, judging: preserveCoreJudging(initialRun.judging, result.judging, state.attempted, directory) };
  };
  const implementation = async args => {
    try { return await execute(args); }
    catch (error) { integrityFailure(error); throw error; }
  };
  return { implementation, state };
}

export function createCoreStreamRunner({ directory, auditDirectory, spawnImplementation = childProcess.spawn, runtimeImplementation = runStorytellingAgent }) {
  return async args => {
    const id = crypto.randomUUID(), streamDirectory = path.join(auditDirectory, 'provider-streams', id);
    fs.mkdirSync(streamDirectory, { recursive: true, mode: 0o700 });
    const record = { id, startedAt: new Date().toISOString(), configuration: args.configuration,
      promptSha256: hash(args.promptText), outputSchemaSha256: jsonHash(args.outputSchema) };
    fs.writeFileSync(path.join(streamDirectory, 'started.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    const files = { stdout: path.join(streamDirectory, 'stdout.jsonl'), stderr: path.join(streamDirectory, 'stderr.txt') };
    const handles = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.openSync(file, 'wx', 0o600)]));
    let response, failure;
    try {
      response = await runtimeImplementation({ ...args, spawnImplementation: (command, commandArguments, options) => {
        const child = spawnImplementation(command, commandArguments, options);
        child.stdout.on('data', chunk => fs.writeSync(handles.stdout, chunk));
        child.stderr.on('data', chunk => fs.writeSync(handles.stderr, chunk));
        return child;
      } });
    } catch (error) { failure = error; }
    finally { Object.values(handles).forEach(handle => fs.closeSync(handle)); }
    const rawStreams = { callId: id, ...Object.fromEntries(Object.entries(files).map(([key, file]) => {
      const bytes = fs.readFileSync(file); return [key, { path: path.relative(directory, file).split(path.sep).join('/'), bytes: bytes.length, sha256: hash(bytes) }];
    })) };
    if (failure) failure.context = { ...failure.context, rawStreams };
    else {
      assert.equal(response.runtimeReceipt.streamSha256, rawStreams.stdout.sha256, 'Raw provider stdout differs from frozen runtime evidence.');
      response = { ...response, runtimeReceipt: { ...response.runtimeReceipt, rawStreams } };
    }
    fs.writeFileSync(path.join(streamDirectory, 'finished.json'), JSON.stringify({ ...record, completedAt: new Date().toISOString(), rawStreams,
      response: response ?? null, error: failure ? { code: failure.code, message: failure.message, suggestion: failure.suggestion ?? null, context: failure.context } : null }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    if (failure) throw failure;
    return response;
  };
}

export async function continueCoreClaude({ repoRootDirectory, authorizationPath, capacityProofPath, dispatch = false,
  maximumCalls = 20, concurrency = 4, shouldPause = () => false, report = () => {} }) {
  assert.equal(dispatch, true, 'Explicit dispatch authorization is required.');
  const directory = path.join(repoRootDirectory, '.agents/vasir-evals/storytelling-core-idea', CORE_RUN_ID);
  assert.ok(!fs.existsSync(path.join(directory, 'run.lock')), 'Wait for the existing writer.');
  const readAnchor = expected => { const bytes = fs.readFileSync(path.join(repoRootDirectory, '.agents/vasir-evals/storytelling-core-idea/publication-snapshots', expected, 'run.json')); assert.equal(hash(bytes), expected); return JSON.parse(bytes); };
  const anchor = readAnchor(CORE_REVIEW_ANCHOR), original = readAnchor(CORE_PUBLISHED_ANCHOR);
  const initialBytes = fs.readFileSync(path.join(directory, 'run.json')), initialRun = JSON.parse(initialBytes);
  verifyCoreJudgeOnlyRecovery(original, initialRun);
  const eligible = selectCoreReviews(anchor, initialRun, { directory });
  const authorizationBytes = fs.readFileSync(authorizationPath), authorization = JSON.parse(authorizationBytes);
  assert.equal(authorization.kind, 'authorized-original-provider-output-capacity-evidence');
  assert.equal(authorization.targetBenchmarkId, 'storytelling-core-idea'); assert.equal(authorization.targetRunId, CORE_RUN_ID);
  assert.equal(authorization.targetProvider, 'claude'); assert.equal(authorization.targetModel, 'claude-fable-5-1');
  assert.ok(maximumCalls <= authorization.maximumCalls && concurrency <= authorization.concurrency);
  const capacityBytes = fs.readFileSync(capacityProofPath), capacityProof = JSON.parse(capacityBytes);
  const { validateArchivedClaudeCapacityProof } = await import('../../../../cli/eval/writing-capacity-evidence.js');
  const capacity = validateArchivedClaudeCapacityProof(capacityProof, { repoRootDirectory, requiredModels: ['claude-fable-5-1'], maximumCalls, concurrency });
  const id = crypto.randomUUID(), auditDirectory = path.join(directory, 'operational-core-recoveries', id);
  fs.mkdirSync(auditDirectory, { recursive: true, mode: 0o700 });
  const retain = (name, bytes) => { fs.writeFileSync(path.join(auditDirectory, name), bytes, { flag: 'wx', mode: 0o600 }); return { path: path.relative(directory, path.join(auditDirectory, name)), bytes: bytes.length, sha256: hash(bytes) }; };
  const prestate = retain('before.run.json', initialBytes);
  retain('authorization.json', authorizationBytes); retain('capacity-proof.json', capacityBytes);
  const sources = ['cli/eval/run-storytelling-benchmark.js', 'cli/eval/benchmark-judge.js', 'cli/eval/storytelling-agent-runtime.js', 'cli/eval/agent-runtime.js',
    'cli/eval/benchmark-basis.js', 'cli/eval/run-benchmark-eval.js', 'cli/eval/history.js', 'cli/eval/writing-capacity-evidence.js', 'cli/eval/writing-provider-failures.js',
    'docs/work/vasir-benchmarking/writing-category/source-lineage.mjs',
    'docs/work/vasir-benchmarking/writing-completion-20260908/core-claude-recovery.mjs',
    'docs/work/vasir-benchmarking/writing-completion-20260908/continue-core-claude.mjs'].map((file, index) => ({ sourcePath: file, ...retain(`source-${index}-${path.basename(file)}`, fs.readFileSync(path.join(repoRootDirectory, file))) }));
  const writeRecord = (name, record) => fs.writeFileSync(path.join(auditDirectory, name), JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  writeRecord('started.json', { id, version: CORE_CONTROLLER_VERSION, pid: process.pid, startedAt: new Date().toISOString(), maximumCalls, concurrency,
    prestate, sources, capacity, originalAnchor: CORE_PUBLISHED_ANCHOR, reviewAnchor: CORE_REVIEW_ANCHOR,
    protectedTerminalBatches: CORE_TERMINAL_BATCHES, selectedBatchIds: eligible.slice(0, maximumCalls).map(batch => batch.batchId), judgesAuthorized: [CORE_REVIEWER] });
  const adapter = createCoreJudgeAdapter({ initialRun, eligible, maximumCalls, concurrency, directory, shouldPause, report,
    onAttempt: record => writeRecord(`call-${record.callNumber}.json`, { ...record, startedAt: new Date().toISOString() }),
    onBatch: record => writeRecord(`batch-${record.batch.batchId}.json`, { ...record, completedAt: new Date().toISOString() }) });
  let outcome, failure;
  try {
    outcome = await runStorytellingBenchmark({ benchmarkName: 'storytelling-core-idea', currentWorkingDirectory: repoRootDirectory, projectRootDirectory: repoRootDirectory,
      resumeRunId: CORE_RUN_ID, judgeOnly: true, judgeProvider: 'claude', judgeConcurrency: concurrency,
      judgeRowsImplementation: adapter.implementation, agentRunnerImplementation: createCoreStreamRunner({ directory, auditDirectory }),
      onCheckpoint: ({ event, run }) => {
        verifyCoreJudgeOnlyRecovery(original, run); verifyCoreJudgeOnlyRecovery(initialRun, run);
        const current = new Map(batches(run.judging));
        for (const [key, prior] of batches(initialRun.judging)) if (!adapter.state.attempted.has(key)) assert.deepEqual(current.get(key), prior, 'Protected or undispatched review changed.');
        report({ event, calls: adapter.state.calls, stop: adapter.state.stop, scoredRows: run.summary.rowCounts.scored });
      } });
    assert.equal(adapter.state.failure, null, 'The frozen runner retained an operational adapter failure: ' + JSON.stringify(adapter.state.failure));
    assert.equal(adapter.state.planVerified, true, 'The protected frozen plan was not verified.');
    return { ...outcome, auditDirectory, actualProviderCalls: adapter.state.calls, stop: adapter.state.stop };
  } catch (error) { failure = error; throw error; }
  finally {
    writeRecord('finished.json', { id, completedAt: new Date().toISOString(), actualProviderCalls: adapter.state.calls, peakActive: adapter.state.peakActive,
      stop: adapter.state.stop, checkpointCount: adapter.state.checkpointCount, finalRunSha256: hash(fs.readFileSync(path.join(directory, 'run.json'))),
      outcome: outcome ?? null, error: failure ? { message: failure.message, stack: failure.stack } : null });
  }
}
