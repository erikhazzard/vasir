import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { applyPairedRuntimeValidationErratum, exportPairedRun, runPairedGenerations, runPairedJudgments,
  validatePairedRunExport, pairedDigest } from '../cli/eval/plot-twists-paired-runtime.js';
import { createPairedFixture, mockPairedProvider, codexPairedOutput, pairedAssessment } from './helpers/plot-twists-paired-fixture.js';

const notice = 'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.';
function diagnosticOutput(text, { extraMessage = false, diagnostic = notice, diagnosticPosition = 1, repeated = false, tool = false, secondTurn = false } = {}) {
  const events = codexPairedOutput(text, { extra: [
    ...(extraMessage ? [{ type: 'item.completed', item: { type: 'agent_message', text: 'I am using the supplied storytelling material.' } }] : []),
    ...(tool ? [{ type: 'item.completed', item: { type: 'command_execution', command: 'forbidden' } }] : [])
  ] }).trim().split('\n').map(line => JSON.parse(line));
  const diagnosticEvent = { type: 'item.completed', item: { type: 'error', message: diagnostic } };
  events.splice(diagnosticPosition, 0, diagnosticEvent, ...(repeated ? [diagnosticEvent] : []));
  if (secondTurn) events.push({ type: 'turn.started' }, { type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } });
  return events.map(event => JSON.stringify(event)).join('\n') + '\n';
}
async function rejectedPair(t, options = {}) {
  const runDirectoryPath = createPairedFixture(t), calls = [];
  const result = await runPairedGenerations({ runDirectoryPath, limit: 2, concurrency: 2,
    spawnImplementation: mockPairedProvider({ calls, answer: (_call, index) => diagnosticOutput('Original final answer ' + index + '.', { extraMessage: index === 1, ...options }) }) });
  assert.equal(calls.length, 2); assert.ok(result.snapshot.generations.slice(0, 2).every(row => row.status === 'failed'));
  return { runDirectoryPath, calls, snapshot: result.snapshot };
}

test('explicit offline erratum preserves both original failures and STOP and recovers only original last-message answers without inference', async t => {
  const fixture = await rejectedPair(t), { runDirectoryPath, snapshot, calls } = fixture;
  const before = Object.fromEntries(['manifest.json', 'manifest.sha256', 'specification.json', 'STOP.json',
    ...snapshot.generations.slice(0, 2).flatMap(row => ['result.json', 'result.sha256', 'stdout.txt', 'stderr.txt', 'prompt.txt', 'input-payload.json', 'attempted.json'].map(name => `${row.artifactDirectory}/${name}`))]
    .map(filename => [filename, fs.readFileSync(path.join(runDirectoryPath, filename))]));
  const result = applyPairedRuntimeValidationErratum({ runDirectoryPath });
  assert.equal(result.additionalInferenceCalls, 0); assert.equal(calls.length, 2);
  const corrected = exportPairedRun({ runDirectoryPath }); assert.equal(corrected.manifestSha256, snapshot.manifestSha256);
  assert.equal(corrected.globalStop, null); assert.deepEqual(corrected.supersededStop, snapshot.globalStop);
  for (const [index, row] of corrected.generations.slice(0, 2).entries()) {
    assert.equal(row.status, 'succeeded'); assert.equal(row.responseText, snapshot.generations[index].responseText);
    assert.equal(row.outputSha256, snapshot.generations[index].outputSha256);
    assert.deepEqual(row.validationCorrection.originalRecord, snapshot.generations[index]);
    assert.equal(row.runtimeReceipt.terminalEvidence.startupDiagnosticCount, 1);
    assert.equal(row.runtimeReceipt.terminalEvidence.assistantMessageCount, index + 1);
    assert.equal(row.runtimeReceipt.terminalEvidence.completedTurns, 1); assert.equal(row.runtimeReceipt.terminalEvidence.toolCallCount, 0);
  }
  for (const [filename, bytes] of Object.entries(before)) assert.deepEqual(fs.readFileSync(path.join(runDirectoryPath, filename)), bytes, filename);
  assert.throws(() => applyPairedRuntimeValidationErratum({ runDirectoryPath }), /already exists/);
});

test('continuation dispatches untouched slots only, never reruns the corrected pair, and judges the exact originals', async t => {
  const { runDirectoryPath, calls } = await rejectedPair(t); applyPairedRuntimeValidationErratum({ runDirectoryPath });
  const generated = await runPairedGenerations({ runDirectoryPath, limit: 2, spawnImplementation: mockPairedProvider({ calls,
    answer: () => diagnosticOutput('Untouched next-model final answer.', { extraMessage: true }) }) });
  assert.equal(calls.length, 4); assert.equal(generated.dispatched, 2);
  assert.ok(generated.snapshot.generations.slice(0, 4).every(row => row.status === 'succeeded'));
  assert.ok(calls.slice(2).every(call => call.args[call.args.indexOf('--model') + 1] === 'gpt-5.6-sol'));
  const ids = generated.snapshot.manifest.specification.benchmark.rubric.map(row => row.id);
  const judged = await runPairedJudgments({ runDirectoryPath, limit: 2, spawnImplementation: mockPairedProvider({ calls,
    answer: () => diagnosticOutput(JSON.stringify(pairedAssessment(ids)), { extraMessage: true }) }) });
  assert.equal(calls.length, 6); assert.ok(judged.snapshot.judgments.slice(0, 2).every(row => row.status === 'succeeded'));
  for (const call of calls.slice(4)) { assert.ok(call.inputText.includes('Original final answer 0.')); assert.ok(call.inputText.includes('Original final answer 1.'));
    assert.ok(!call.inputText.includes('I am using the supplied storytelling material.')); }
});

for (const [name, options] of [
  ['different diagnostic', { diagnostic: notice + ' Another error.' }], ['in-turn diagnostic', { diagnosticPosition: 2 }],
  ['repeated diagnostic', { repeated: true }], ['real tool call', { tool: true }], ['second turn', { secondTurn: true }]
]) test('erratum refuses ' + name + ' without changing the original stop or writing correction authority', async t => {
  const { runDirectoryPath } = await rejectedPair(t, options);
  const stop = fs.readFileSync(path.join(runDirectoryPath, 'STOP.json'));
  assert.throws(() => applyPairedRuntimeValidationErratum({ runDirectoryPath }));
  assert.equal(fs.existsSync(path.join(runDirectoryPath, 'runtime-validation-erratum.json')), false);
  assert.deepEqual(fs.readFileSync(path.join(runDirectoryPath, 'STOP.json')), stop);
});

test('post-erratum provider error persists a separate new STOP without overwriting historical STOP', async t => {
  const { runDirectoryPath } = await rejectedPair(t); applyPairedRuntimeValidationErratum({ runDirectoryPath });
  const originalStop = fs.readFileSync(path.join(runDirectoryPath, 'STOP.json'));
  const result = await runPairedGenerations({ runDirectoryPath, limit: 1, spawnImplementation: mockPairedProvider({
    answer: () => diagnosticOutput('Retained but invalid output.', { tool: true }) }) });
  assert.equal(result.snapshot.globalStop.reason, 'runtime-contract-failure');
  assert.ok(fs.existsSync(path.join(runDirectoryPath, 'STOP.after-erratum.json')));
  assert.deepEqual(fs.readFileSync(path.join(runDirectoryPath, 'STOP.json')), originalStop);
  await assert.rejects(() => runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider() }), /Run is stopped/);
});

test('erratum provenance rejects altered output, original records, missing authority or changed source dependencies', async t => {
  const { runDirectoryPath } = await rejectedPair(t); applyPairedRuntimeValidationErratum({ runDirectoryPath });
  const snapshot = exportPairedRun({ runDirectoryPath });
  for (const mutate of [
    value => { value.generations[0].responseText = 'A selected alternative answer'; },
    value => { value.generations[0].validationCorrection.originalRecord.rawStdout += '\n'; },
    value => { delete value.runtimeValidationErratum; },
    value => { value.runtimeValidationErratum.correctedSourceHashes[1].sha256 = 'a'.repeat(64); value.runtimeValidationErratumSha256 = pairedDigest(value.runtimeValidationErratum); },
    value => { value.runtimeValidationErratum.policy.toolsAllowed = true; value.runtimeValidationErratumSha256 = pairedDigest(value.runtimeValidationErratum); }
  ]) { const value = structuredClone(snapshot); mutate(value); assert.throws(() => validatePairedRunExport(value)); }
});
