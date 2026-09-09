import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runStorytellingBenchmark } from '../../../../cli/eval/run-storytelling-benchmark.js';
import { verifyCoreJudgeOnlyRecovery } from '../writing-category/source-lineage.mjs';
import { CORE_RUN_ID, CORE_REVIEW_ANCHOR, CORE_REVIEWER, CORE_TERMINAL_BATCHES, selectCoreReviews,
  createCoreJudgeAdapter, preserveCoreJudging, createCoreStreamRunner, continueCoreClaude, policyBlocked } from './core-claude-recovery.mjs';

const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const config = { id: CORE_REVIEWER, provider: 'claude', model: 'claude-fable-5-1', reasoning: 'max' };
const terminalError = { code: 'EVAL_AGENT_RUNTIME_FAILED', context: { apiErrorStatus: 400, stdout: '{"type":"result","is_error":true,"result":"API Error: 400 Output blocked by content filtering policy"}' } };
const deferral = () => Object.assign(Error('not attempted'), { code: 'EVAL_BENCHMARK_JUDGE_DEFERRED' });
const copy = value => structuredClone(value);

function fixture({ count = 6, quotaAt = null, tamperSchema = false, failureKind = 'authentication' } = {}) {
  const batch = (id, status = 'deferred') => ({ batchId: id, configuration: config, reviewerId: 'fable-reviewer', candidateIds: [`${id}-A`, `${id}-B`],
    groupHashes: [id], basisHash: id, promptText: `Frozen prompt ${id}`, promptHash: hash(`Frozen prompt ${id}`), promptBytes: 25,
    status, executionAttempted: false, evaluations: [], ranking: [], error: status === 'error' ? terminalError : { code: 'EVAL_BENCHMARK_JUDGE_DEFERRED' }, durationMs: 0, usage: null, costUsd: null });
  const protectedBatch = { ...batch('batch-242', 'error'), durationMs: 9412, privateOriginal: { retained: true } };
  const completed = { ...batch('batch-100', 'complete'), evaluations: [{ candidateId: 'batch-100-A', rowKey: 'A', total: 90 }], error: null, outputText: 'retained successful review' };
  const eligible = Array.from({ length: count }, (_, index) => batch(`batch-${String(index + 1).padStart(3, '0')}`));
  const initialRun = { judging: { cohortHash: 'same', cohortSize: 2 * (count + 2), candidateOrder: [], batchPlan: { hash: 'unchanged' }, judgeConfigurations: [config],
    judges: [{ configuration: config, batches: [protectedBatch, completed, ...eligible], status: 'error', promptText: 'all original prompts', promptHash: 'plan-hash', basisHash: 'basis-hash' }] } };
  let passes = 0, calls = 0, peak = 0, active = 0;
  const frozenJudge = async args => {
    passes++;
    const judging = copy(initialRun.judging), pending = judging.judges[0].batches.filter(item => item.status !== 'complete');
    let cursor = 0;
    await Promise.all(Array.from({ length: args.judgeConcurrency }, async () => {
      for (;;) {
        const b = pending[cursor++]; if (!b) return;
        const request = { configuration: config, promptText: b.promptText, outputSchema: { type: 'object', frozen: passes > 1 && tamperSchema ? 'changed' : true }, timeoutMs: 99 };
        try { await args.agentRunnerImplementation(request); b.status = 'complete'; b.error = null; b.executionAttempted = true; b.outputText = 'new fixture result'; }
        catch (error) { b.status = error.code === 'EVAL_BENCHMARK_JUDGE_DEFERRED' ? 'deferred' : 'error'; b.error = { code: error.code, message: error.message, context: error.context }; b.durationMs = 0; }
        await args.judgingCheckpointImplementation?.({ judging: copy(judging), completedBatch: copy(b) });
      }
    }));
    return { judging, scoresByRowKey: new Map() };
  };
  const agent = async () => {
    calls++; active++; peak = Math.max(peak, active);
    await new Promise(resolve => setImmediate(resolve)); active--;
    if (calls >= quotaAt && quotaAt !== null) throw failureKind === 'authentication' ? Object.assign(Error('auth'), { code: 'AUTH_UNAVAILABLE' })
      : Object.assign(Error("You've hit your session limit"), { code: 'EVAL_AGENT_RUNTIME_FAILED', context: { apiErrorStatus: null } });
    return { text: 'test fixture only' };
  };
  return { initialRun, eligible, protectedBatch, completed, frozenJudge, agent, stats: () => ({ calls, peak, passes }) };
}

test('provider-free planning, call budget and every checkpoint preserve original protected and undispatched batches', async () => {
  const f = fixture(), saved = [];
  const { implementation, state } = createCoreJudgeAdapter({ initialRun: f.initialRun, eligible: f.eligible, maximumCalls: 2, concurrency: 2, judgeRowsImplementation: f.frozenJudge });
  const before = JSON.stringify(f.initialRun);
  const result = await implementation({ priorJudging: f.initialRun.judging, judgeConcurrency: 2, agentRunnerImplementation: f.agent, judgingCheckpointImplementation: value => saved.push(value) });
  assert.deepEqual(f.stats(), { calls: 2, peak: 2, passes: 2 });
  assert.equal(state.calls, 2); assert.equal(saved.length, 2);
  for (const judging of [...saved.map(value => value.judging), result.judging]) {
    const byId = new Map(judging.judges[0].batches.map(batch => [batch.batchId, batch]));
    assert.deepEqual(byId.get('batch-242'), f.protectedBatch);
    assert.deepEqual(byId.get('batch-100'), f.completed);
    for (const batch of f.eligible.slice(2)) assert.deepEqual(byId.get(batch.batchId), batch);
  }
  assert.equal(JSON.stringify(f.initialRun), before);
  assert.equal(result.judging.judges[0].status, 'error');
});

test('pause, tampered schema and allocation violations never cause an unauthorized provider call', async () => {
  for (const options of [{ paused: true }, { tamperSchema: true }]) {
    const f = fixture(options), { implementation, state } = createCoreJudgeAdapter({ initialRun: f.initialRun, eligible: f.eligible, maximumCalls: 2, concurrency: 2,
      judgeRowsImplementation: f.frozenJudge, shouldPause: () => options.paused ?? false });
    const invoke = () => implementation({ priorJudging: f.initialRun.judging, judgeConcurrency: 2, agentRunnerImplementation: f.agent });
    if (options.tamperSchema) {
      await assert.rejects(invoke(), /integrity check failed/);
      assert.equal(state.stop.kind, 'integrity'); assert.match(state.failure.message, /Frozen provider arguments changed: outputSchema/);
    } else await invoke();
    assert.equal(f.stats().calls, 0);
  }
  const f = fixture();
  for (const limits of [{ maximumCalls: 21 }, { concurrency: 5 }, { maximumCalls: 0 }])
    assert.throws(() => createCoreJudgeAdapter({ initialRun: f.initialRun, eligible: f.eligible, ...limits }));
});

test('audit failure drains already-started calls, stops new work and cannot be hidden by frozen batch handling', async () => {
  for (const failDuring of ['planning', 'dispatch', 'checkpoint']) {
    const f = fixture({ count: 6 });
    const corruptPlan = async args => f.frozenJudge({ ...args, agentRunnerImplementation: request =>
      args.agentRunnerImplementation({ ...request, promptText: 'not an original frozen request' }) });
    const { implementation, state } = createCoreJudgeAdapter({ initialRun: f.initialRun, eligible: f.eligible, maximumCalls: 6, concurrency: 2,
      judgeRowsImplementation: failDuring === 'planning' ? corruptPlan : f.frozenJudge,
      onAttempt: () => { if (failDuring === 'dispatch') throw Error('fixture dispatch journal unavailable'); },
      onBatch: () => { if (failDuring === 'checkpoint') throw Error('fixture batch journal unavailable'); } });
    await assert.rejects(implementation({ priorJudging: f.initialRun.judging, judgeConcurrency: 2, agentRunnerImplementation: f.agent }), /integrity check failed/);
    assert.equal(state.stop.kind, 'integrity'); assert.equal(state.active, 0);
    assert.equal(f.stats().calls, failDuring === 'checkpoint' ? 2 : 0);
    assert.equal(state.calls, f.stats().calls);
  }
});

test('fresh authentication/quota stop prevents further dispatch and drains only the allocated in-flight work', async () => {
  for (const failureKind of ['authentication', 'quota']) {
    const f = fixture({ count: 8, quotaAt: 1, failureKind }), { implementation, state } = createCoreJudgeAdapter({ initialRun: f.initialRun, eligible: f.eligible,
      maximumCalls: 8, concurrency: 2, judgeRowsImplementation: f.frozenJudge });
    await implementation({ priorJudging: f.initialRun.judging, judgeConcurrency: 2, agentRunnerImplementation: f.agent });
    assert.equal(state.stop.kind, failureKind); assert.equal(state.active, 0);
    assert.equal(f.stats().calls, 2); assert.equal(state.peakActive, 2);
  }
});

test('protected merge rejects changed cohort or attempts to replace a completed/policy-blocked seat', () => {
  const f = fixture(), incoming = copy(f.initialRun.judging);
  incoming.cohortHash = 'changed';
  assert.throws(() => preserveCoreJudging(f.initialRun.judging, incoming, new Set()), /full judging plan/);
  for (const id of ['batch-100', 'batch-242']) assert.throws(() => preserveCoreJudging(f.initialRun.judging, copy(f.initialRun.judging), new Set([`${CORE_REVIEWER}:${id}`])), /cannot be replaced/);
});

test('raw stream runner retains byte-identical stdout/stderr and failures without changing provider arguments', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'core-retained-stream-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const fails of [false, true]) {
    const raw = '{"type":"result","result":"fixture Ω"}\n', stderr = 'fixture stderr\n';
    const args = { configuration: config, promptText: 'exact fixture prompt', outputSchema: { frozen: true }, timeoutMs: 99, environmentVariables: {} };
    let spawnArgs;
    const runner = createCoreStreamRunner({ directory, auditDirectory: directory,
      spawnImplementation: (...values) => {
        spawnArgs = values;
        const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
        queueMicrotask(() => { child.stdout.write(raw); child.stderr.write(stderr); child.emit('close', 0, null); }); return child;
      }, runtimeImplementation: async received => {
        const { spawnImplementation, ...actual } = received; assert.deepEqual(actual, args);
        const child = spawnImplementation('claude', ['exact-original-args'], { original: true });
        await new Promise(resolve => child.on('close', resolve));
        if (fails) throw Object.assign(Error('fixture failure'), { code: 'AUTH_UNAVAILABLE', context: { original: true } });
        return { text: 'fixture result', runtimeReceipt: { streamSha256: hash(raw) } };
      } });
    let result, error; try { result = await runner(args); } catch (failure) { error = failure; }
    assert.deepEqual(spawnArgs, ['claude', ['exact-original-args'], { original: true }]);
    const pins = (result?.runtimeReceipt ?? error.context).rawStreams;
    for (const [key, expected] of [['stdout', raw], ['stderr', stderr]]) {
      assert.equal(fs.readFileSync(path.join(directory, pins[key].path), 'utf8'), expected);
      assert.equal(pins[key].sha256, hash(expected)); assert.equal(pins[key].bytes, Buffer.byteLength(expected));
    }
    if (fails) assert.equal(error.context.original, true);
  }
});

test('real retained Core inventory has exactly 96 recoverable slots and immutable three terminal errors', () => {
  const bytes = fs.readFileSync(path.join(repo, '.agents/vasir-evals/storytelling-core-idea/publication-snapshots', CORE_REVIEW_ANCHOR, 'run.json'));
  assert.equal(hash(bytes), CORE_REVIEW_ANCHOR);
  const run = JSON.parse(bytes), eligible = selectCoreReviews(run, copy(run));
  assert.equal(eligible.length, 96);
  assert.deepEqual(eligible.slice(0, 3).map(batch => batch.batchId), ['batch-295', 'batch-297', 'batch-301']);
  assert.ok(eligible.every(batch => !CORE_TERMINAL_BATCHES.includes(batch.batchId)));
  const changed = copy(run); changed.judging.judges[1].batches.find(batch => batch.batchId === 'batch-242').durationMs++;
  assert.throws(() => selectCoreReviews(run, changed), /terminal review changed/);
});

test('modern explicit refusals require hash-verified raw events and remain terminal on later passes', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'core-refusal-stream-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const anchor = JSON.parse(fs.readFileSync(path.join(repo, '.agents/vasir-evals/storytelling-core-idea/publication-snapshots', CORE_REVIEW_ANCHOR, 'run.json')));
  const current = copy(anchor), batch = current.judging.judges[1].batches.find(item => item.batchId === 'batch-295');
  const stdout = JSON.stringify({ type: 'result', is_error: true, terminal_reason: 'api_error', stop_reason: 'refusal', result: 'fixture provider refusal' }) + '\n';
  fs.writeFileSync(path.join(directory, 'stdout.jsonl'), stdout);
  batch.error = { code: 'EVAL_AGENT_RUNTIME_FAILED', context: { apiErrorStatus: null, requestedConfiguration: config,
    rawStreams: { stdout: { path: 'stdout.jsonl', bytes: Buffer.byteLength(stdout), sha256: hash(stdout) } } } };
  const before = JSON.stringify(batch);
  assert.equal(policyBlocked(batch, directory), true);
  assert.equal(selectCoreReviews(anchor, current, { directory }).length, 95);
  assert.equal(JSON.stringify(batch), before);
  const merged = preserveCoreJudging(current.judging, copy(current.judging), new Set(), directory);
  assert.deepEqual(merged.judges[1].batches.find(item => item.batchId === batch.batchId), batch);
  assert.throws(() => preserveCoreJudging(current.judging, copy(current.judging), new Set([`${CORE_REVIEWER}:batch-295`]), directory), /cannot be replaced/);
  batch.error.context.rawStreams.stdout.sha256 = '0'.repeat(64);
  assert.throws(() => selectCoreReviews(anchor, current, { directory }), /stream hash changed/);
  assert.equal(policyBlocked({ configuration: config, error: { code: 'EVAL_AGENT_RUNTIME_FAILED', context: { apiErrorStatus: null, stdout: 'reasoning_extraction refusal' } } }, directory), false);
});

async function isolatedRun(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-frozen-resume-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(repo, '.agents/vasir-evals/storytelling-core-idea/publication-snapshots', CORE_REVIEW_ANCHOR), destination = path.join(root, '.agents/vasir-evals/storytelling-core-idea', CORE_RUN_ID);
  fs.mkdirSync(destination, { recursive: true });
  for (const name of ['run.json', 'skill-snapshot.json']) fs.copyFileSync(path.join(source, name), path.join(destination, name));
  fs.copyFileSync(path.join(repo, '.agents/vasir-evals/storytelling-core-idea', CORE_RUN_ID, 'manifest.json'), path.join(destination, 'manifest.json'));
  const initialRun = JSON.parse(fs.readFileSync(path.join(destination, 'run.json')));
  assert.equal(hash(fs.readFileSync(path.join(destination, 'run.json'))), CORE_REVIEW_ANCHOR, 'This fixture uses only the pinned drained prestate.');
  return { root, destination, initialRun };
}

test('unchanged frozen Storytelling resume in a temporary run preserves every batch when paused before any real call', async t => {
  const { root, destination, initialRun } = await isolatedRun(t);
  const { implementation, state } = createCoreJudgeAdapter({ initialRun, eligible: selectCoreReviews(initialRun, initialRun), maximumCalls: 1, concurrency: 1, shouldPause: () => true });
  let calls = 0;
  await runStorytellingBenchmark({ currentWorkingDirectory: root, projectRootDirectory: root, resumeRunId: CORE_RUN_ID, judgeOnly: true, judgeProvider: 'claude', judgeConcurrency: 1,
    judgeRowsImplementation: implementation, agentRunnerImplementation: async () => { calls++; throw Error('No provider call permitted.'); },
    onCheckpoint: ({ run }) => {
      verifyCoreJudgeOnlyRecovery(initialRun, run);
      assert.deepEqual(run.judging.judges.map(judge => judge.batches), initialRun.judging.judges.map(judge => judge.batches));
    } });
  assert.equal(calls, 0); assert.equal(state.calls, 0); assert.equal(state.checkpointCount, 0);
  assert.equal(state.planVerified, true); assert.equal(state.failure, null);
  const saved = JSON.parse(fs.readFileSync(path.join(destination, 'run.json')));
  verifyCoreJudgeOnlyRecovery(initialRun, saved);
  assert.deepEqual(saved.judging.judges.map(judge => judge.batches), initialRun.judging.judges.map(judge => judge.batches));
});

test('one mock result through the unchanged frozen judge adds only the allocated original review', async t => {
  const { root, destination, initialRun } = await isolatedRun(t);
  const { implementation, state } = createCoreJudgeAdapter({ initialRun, eligible: selectCoreReviews(initialRun, initialRun), maximumCalls: 1, concurrency: 1 });
  const initialBatches = new Map(initialRun.judging.judges.flatMap(judge => judge.batches.map(batch => [`${judge.configuration.id}:${batch.batchId}`, batch])));
  let calls = 0, checkpoints = 0;
  await runStorytellingBenchmark({ currentWorkingDirectory: root, projectRootDirectory: root, resumeRunId: CORE_RUN_ID, judgeOnly: true, judgeProvider: 'claude', judgeConcurrency: 1,
    judgeRowsImplementation: implementation,
    agentRunnerImplementation: async args => {
      calls++; assert.equal(args.configuration.id, CORE_REVIEWER);
      const prior = initialRun.judging.judges[0].batches.find(batch => batch.batchId === 'batch-295');
      assert.equal(args.promptText, prior.promptText);
      // Explicit test fixture: use the same pair's already-saved JSON solely to
      // exercise parsing/preservation in the isolated temporary run. No provider.
      const receipt = copy(initialRun.judging.judges[1].batches.find(batch => batch.status === 'complete').runtimeReceipt);
      return { text: prior.outputText, usage: null, costUsd: null, durationMs: 1, runtimeReceipt: { ...receipt,
        requestedConfiguration: args.configuration, userPromptSha256: hash(args.promptText), outputSha256: hash(prior.outputText) } };
    },
    onCheckpoint: ({ run }) => {
      checkpoints++; verifyCoreJudgeOnlyRecovery(initialRun, run);
      for (const judge of run.judging.judges) for (const batch of judge.batches) {
        const key = `${judge.configuration.id}:${batch.batchId}`;
        if (key !== `${CORE_REVIEWER}:batch-295`) assert.deepEqual(batch, initialBatches.get(key));
      }
    } });
  const saved = JSON.parse(fs.readFileSync(path.join(destination, 'run.json')));
  const diagnostic = JSON.stringify({ calls, state: { ...state, attempted: [...state.attempted] }, error: saved.judging.error });
  assert.equal(calls, 1, diagnostic); assert.equal(state.calls, 1, diagnostic); assert.equal(state.checkpointCount, 1, diagnostic); assert.ok(checkpoints >= 2, diagnostic);
  assert.equal(state.planVerified, true); assert.equal(state.failure, null);
  assert.equal(saved.judging.judges[1].batches.find(batch => batch.batchId === 'batch-295').status, 'complete');
  assert.equal(saved.judging.judges[1].batches.filter(batch => batch.status === 'complete').length, 296);
  verifyCoreJudgeOnlyRecovery(initialRun, saved);
});

test('entrypoint cannot write or invoke a provider without explicit dispatch', async () => {
  await assert.rejects(continueCoreClaude({ dispatch: false }), /Explicit dispatch authorization/);
});
