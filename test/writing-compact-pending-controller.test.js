import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { compactDigest, prepareCompactRun, exportCompactRun, runCompactGenerations } from '../cli/eval/writing-compact-runtime.js';
import { prepareCompactHealthyContinuation, readCompactHealthyContinuation,
  runCompactHealthyContinuation } from '../cli/eval/writing-compact-pending-controller.js';

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-healthy-controller-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const runDirectoryPath = path.join(base, 'mock-run');
  prepareCompactRun({ runDirectoryPath });
  return runDirectoryPath;
}

function stub({ calls = [], quota = false, failFirst = false, delay = 1 } = {}) {
  return (command, args, options) => {
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    let timer, closed = false;
    const call = { command, args, options, prompt: '' }; calls.push(call);
    const close = (code, signal = null) => { if (closed) return; closed = true; clearTimeout(timer); child.emit('close', code, signal); };
    child.kill = signal => { close(null, signal); return true; };
    child.stdin.on('data', chunk => { call.prompt += chunk; });
    child.stdin.on('finish', () => {
      timer = setTimeout(() => {
        if (closed) return;
        const model = args[args.indexOf('--model') + 1];
        const payload = quota ? { type: 'result', subtype: 'error', is_error: true, result: 'Usage limit reached: quota exceeded', api_error_status: 429 }
          : { type: 'result', subtype: 'success', is_error: false, result: 'The gate opens when its keeper forgives the debt.',
            stop_reason: failFirst && calls.indexOf(call) === 0 ? 'max_tokens' : 'end_turn', num_turns: 1, permission_denials: [],
            session_id: `mock-${calls.indexOf(call)}`, usage: { input_tokens: 100, output_tokens: 20 },
            modelUsage: { primary: { canonicalModel: model, outputTokens: 20 } } };
        child.stdout.end(JSON.stringify(payload)); child.stderr.end(); close(quota ? 1 : 0);
      }, delay);
    });
    return child;
  };
}

test('healthy continuation generates only 20 untouched Opus low/medium slots and preserves the original manifest and earlier answers', async t => {
  const runDirectoryPath = fixture(t);
  await runCompactGenerations({ runDirectoryPath, limit: 2, spawnImplementation: stub() });
  const before = exportCompactRun({ runDirectoryPath });
  const files = ['manifest.json', 'manifest.sha256', 'specification.json', ...before.generations.slice(0, 2).map(row => `${row.artifactDirectory}/result.json`)];
  const hashes = Object.fromEntries(files.map(file => [file, compactDigest(fs.readFileSync(path.join(runDirectoryPath, file)))]));
  const prepared = prepareCompactHealthyContinuation({ runDirectoryPath });
  assert.equal(prepared.generationCount, 20);
  const calls = [];
  const result = await runCompactHealthyContinuation({ runDirectoryPath, spawnImplementation: stub({ calls }) });
  assert.equal(result.dispatched, 20); assert.equal(calls.length, 20);
  for (const call of calls) {
    assert.equal(call.args[call.args.indexOf('--model') + 1], 'claude-opus-5');
    assert.ok(['low', 'medium'].includes(call.args[call.args.indexOf('--effort') + 1]));
    assert.equal(call.options.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, '8192');
    assert.equal(call.options.env.CLAUDE_CODE_MAX_TURNS, '1');
    assert.equal(call.options.env.CLAUDE_CODE_MAX_RETRIES, '0');
    assert.ok(before.manifest.specification.cases.some(task => task.task === call.prompt));
  }
  assert.deepEqual(Object.fromEntries(files.map(file => [file, compactDigest(fs.readFileSync(path.join(runDirectoryPath, file)))])), hashes);
  assert.equal(result.snapshot.generations.filter(row => row.status === 'succeeded').length, 22);
  assert.ok(result.snapshot.generations.filter(row => row.configurationId.endsWith('@max')).every(row => row.status === 'pending'));
  assert.equal((await runCompactHealthyContinuation({ runDirectoryPath, spawnImplementation: () => { throw new Error('No reruns'); } })).dispatched, 0);
  readCompactHealthyContinuation({ runDirectoryPath, snapshot: result.snapshot });
});

test('the controller uses the shared lock and rejects a scope changed to max effort', async t => {
  const runDirectoryPath = fixture(t);
  prepareCompactHealthyContinuation({ runDirectoryPath });
  fs.writeFileSync(path.join(runDirectoryPath, 'dispatch.lock'), 'occupied');
  await assert.rejects(() => runCompactHealthyContinuation({ runDirectoryPath, spawnImplementation: stub() }), /EEXIST/);
  assert.equal(fs.readFileSync(path.join(runDirectoryPath, 'dispatch.lock'), 'utf8'), 'occupied');
  fs.unlinkSync(path.join(runDirectoryPath, 'dispatch.lock'));
  const scope = readCompactHealthyContinuation({ runDirectoryPath });
  scope.generationIds[0] = exportCompactRun({ runDirectoryPath }).generations.find(row => row.configurationId.endsWith('@max')).id;
  fs.writeFileSync(path.join(runDirectoryPath, 'pending-low-medium-continuation.json'), JSON.stringify(scope));
  fs.writeFileSync(path.join(runDirectoryPath, 'pending-low-medium-continuation.sha256'), compactDigest(scope));
  await assert.rejects(() => runCompactHealthyContinuation({ runDirectoryPath, spawnImplementation: stub() }), /cannot select/);
});

test('quota stops the healthy queue after one attempted slot without touching max slots', async t => {
  const runDirectoryPath = fixture(t); prepareCompactHealthyContinuation({ runDirectoryPath });
  const calls = [];
  const result = await runCompactHealthyContinuation({ runDirectoryPath, concurrency: 1, spawnImplementation: stub({ calls, quota: true }) });
  assert.equal(calls.length, 1); assert.equal(result.halted, true);
  assert.equal(result.snapshot.globalStop.reason, 'quota');
  await assert.rejects(() => runCompactHealthyContinuation({ runDirectoryPath, spawnImplementation: stub() }), /quota stop/);
});

test('abort preserves active failed attempts and a later invocation resumes only untouched slots', async t => {
  const runDirectoryPath = fixture(t); prepareCompactHealthyContinuation({ runDirectoryPath });
  const controller = new AbortController(), calls = [];
  const promise = runCompactHealthyContinuation({ runDirectoryPath, signal: controller.signal, spawnImplementation: stub({ calls, delay: 100 }) });
  setTimeout(() => controller.abort(), 10);
  const result = await promise;
  assert.equal(calls.length, 2); assert.equal(result.interrupted, true);
  assert.equal(result.snapshot.generations.filter(row => row.status === 'failed').length, 2);
  const previous = result.snapshot.generations.filter(row => row.status === 'failed');
  const resumed = await runCompactHealthyContinuation({ runDirectoryPath, limit: 1, spawnImplementation: stub() });
  assert.equal(resumed.dispatched, 1);
  for (const row of previous) assert.deepEqual(resumed.snapshot.generations.find(item => item.id === row.id), row);
});
