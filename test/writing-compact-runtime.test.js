import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import {
  prepareCompactRun, exportCompactRun, runCompactGenerations, runCompactJudgments,
  compactCandidateMap, compactDigest, compactStopReason, compactWordCount,
  validateCompactAssessment, validateCompactRunExport, COMPACT_RUNTIME_POLICY, applyCompactRuntimeAmendment
} from '../cli/eval/writing-compact-runtime.js';

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-compact-test-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const runDirectoryPath = path.join(base, 'mock-run');
  prepareCompactRun({ runDirectoryPath });
  return runDirectoryPath;
}

function claudePayload(model, text = 'The ferry keeper rings the submerged bell. The town answers.') {
  return { type: 'result', subtype: 'success', is_error: false, result: text,
    stop_reason: 'end_turn', num_turns: 1, session_id: 'test-session', permission_denials: [],
    usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    modelUsage: { primary: { canonicalModel: model, outputTokens: 50 } }, total_cost_usd: 0.01 };
}

function assessment(task) {
  const assess = candidateLabel => ({ candidateLabel, ratings: task.rubric.map(row => ({
    criterionId: row.id, score: candidateLabel === 'A' ? 3 : 4,
    evidence: 'The bell changes who can return.', reason: 'The outcome follows the choice.'
  })) });
  return { assessmentA: assess('A'), assessmentB: assess('B'),
    preference: { candidate: 'B', reason: 'A explains less than B about the bell.', confidence: 'medium' } };
}

function stubProvider({ calls = [], answer = null, delayMs = 0, track = null, stderr = '', exitCode = 0 } = {}) {
  return (command, args, options) => {
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    child.kill = signal => { child.emit('close', null, signal); return true; };
    const call = { command, args, options, inputText: '' };
    calls.push(call);
    track?.start();
    child.stdin.on('data', chunk => { call.inputText += chunk; });
    child.stdin.on('finish', () => setTimeout(() => {
      const model = args[args.indexOf('--model') + 1];
      const content = answer ? answer(call, calls.indexOf(call)) : claudePayload(model);
      child.stdout.end(typeof content === 'string' ? content : JSON.stringify(content));
      child.stderr.end(stderr);
      track?.end();
      child.emit('close', exitCode, null);
    }, delayMs));
    return child;
  };
}

test('prepare freezes 60+60 slots and full verified skill bundles without making calls or replacing a run', t => {
  const runDirectoryPath = fixture(t);
  const snapshot = exportCompactRun({ runDirectoryPath });
  assert.equal(snapshot.generations.length, 60);
  assert.equal(snapshot.judgments.length, 60);
  assert.ok(snapshot.generations.every(row => row.status === 'pending'));
  assert.equal(snapshot.manifest.frozenBundles.length, 5);
  for (const bundle of snapshot.manifest.frozenBundles) {
    assert.equal(compactDigest(bundle.text), bundle.sha256);
    assert.equal(bundle.files[0].path, 'SKILL.md');
  }
  assert.throws(() => prepareCompactRun({ runDirectoryPath }), /EEXIST/);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDirectoryPath, 'manifest.json')));
  manifest.configurations[0].reasoning = 'max';
  fs.writeFileSync(path.join(runDirectoryPath, 'manifest.json'), JSON.stringify(manifest));
  assert.throws(() => exportCompactRun({ runDirectoryPath }), /Manifest hash changed/);
});

test('the first pair uses identical stdin, a separate once-only skill append, hard limits and immutable raw evidence', async t => {
  const runDirectoryPath = fixture(t), calls = [];
  const result = await runCompactGenerations({ runDirectoryPath, limit: 2,
    spawnImplementation: stubProvider({ calls }), environmentVariables: { PATH: process.env.PATH,
      CLAUDE_CODE_MAX_TURNS: '99', CLAUDE_CODE_MAX_OUTPUT_TOKENS: '99999', CLAUDE_CODE_MAX_RETRIES: '99' } });
  assert.equal(result.dispatched, 2);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].inputText, calls[1].inputText);
  assert.equal(calls[0].inputText, result.snapshot.manifest.specification.cases[0].task);
  assert.ok(!calls[0].args.includes('--append-system-prompt'));
  const appendIndex = calls[1].args.indexOf('--append-system-prompt');
  assert.equal(calls[1].args[appendIndex + 1], result.snapshot.manifest.frozenBundles[0].text);
  assert.equal(calls[1].args.filter(arg => arg === '--append-system-prompt').length, 1);
  assert.notEqual(calls[0].options.cwd, calls[1].options.cwd);
  assert.ok(!fs.existsSync(calls[0].options.cwd));
  for (const call of calls) {
    assert.equal(call.args[call.args.indexOf('--tools') + 1], '');
    assert.equal(call.args[call.args.indexOf('--max-turns') + 1], '1');
    assert.ok(call.args.includes('--safe-mode'));
    assert.ok(call.args.includes('--strict-mcp-config'));
    for (const [key, value] of Object.entries(COMPACT_RUNTIME_POLICY.claudeEnvironment)) assert.equal(call.options.env[key], value);
  }
  for (const row of result.snapshot.generations.slice(0, 2)) {
    assert.equal(row.status, 'succeeded');
    assert.equal(row.runtimeReceipt.terminalEvidence.stopReason, 'end_turn');
    assert.equal(row.runtimeReceipt.targetCanonicalModelOutputTokens, 50);
    assert.equal(row.runtimeReceipt.rawStreamsRetained, true);
    const original = fs.readFileSync(path.join(runDirectoryPath, row.artifactDirectory, 'result.json'));
    await runCompactGenerations({ runDirectoryPath, limit: 0, spawnImplementation: () => { throw new Error('Unexpected call'); } });
    assert.deepEqual(fs.readFileSync(path.join(runDirectoryPath, row.artifactDirectory, 'result.json')), original);
  }
  const resumed = await runCompactGenerations({ runDirectoryPath, limit: 1, spawnImplementation: stubProvider() });
  assert.equal(resumed.snapshot.generations.filter(row => row.status === 'succeeded').length, 3);
});

test('a long valid answer is kept intact and not regenerated', async t => {
  const runDirectoryPath = fixture(t);
  const fullAnswer = Array(601).fill('word').join(' ');
  const result = await runCompactGenerations({ runDirectoryPath, limit: 1,
    spawnImplementation: stubProvider({ answer: call => claudePayload(call.args[call.args.indexOf('--model') + 1], fullAnswer) }) });
  const row = result.snapshot.generations[0];
  assert.equal(row.status, 'succeeded'); assert.equal(row.responseText, fullAnswer);
  assert.equal(row.wordCount, 601); assert.equal(row.wordLimitExceeded, true);
  assert.equal(compactWordCount('\nalpha\u2003beta\t gamma\n'), 3);
});

test('strict validation rejects truncation, wrong model and excess turns, preserves failures and never retries them', async t => {
  const runDirectoryPath = fixture(t);
  const result = await runCompactGenerations({ runDirectoryPath, limit: 3, concurrency: 1,
    spawnImplementation: stubProvider({ answer: (call, index) => {
      const payload = claudePayload(call.args[call.args.indexOf('--model') + 1]);
      if (index === 0) payload.stop_reason = 'max_tokens';
      if (index === 1) payload.num_turns = 2;
      if (index === 2) payload.modelUsage.primary.canonicalModel = 'claude-opus-5';
      return payload;
    } }) });
  assert.deepEqual(result.snapshot.generations.slice(0, 3).map(row => row.status), ['failed', 'failed', 'failed']);
  assert.match(result.snapshot.generations[0].error.message, /truncated/);
  const nextCalls = [];
  const resumed = await runCompactGenerations({ runDirectoryPath, limit: 1, spawnImplementation: stubProvider({ calls: nextCalls }) });
  assert.equal(nextCalls.length, 1);
  assert.equal(resumed.snapshot.generations[3].status, 'succeeded');
  assert.ok(resumed.snapshot.generations.slice(0, 3).every(row => row.status === 'failed'));
});

test('quota stops all further dispatch and persists the reason across resume', async t => {
  const runDirectoryPath = fixture(t), calls = [];
  const result = await runCompactGenerations({ runDirectoryPath, concurrency: 1,
    spawnImplementation: stubProvider({ calls, answer: () => ({ type: 'result', subtype: 'error_during_execution',
      is_error: true, result: 'You have hit your usage limit.', api_error_status: 429 }) }) });
  assert.equal(calls.length, 1); assert.equal(result.halted, true);
  assert.equal(result.snapshot.globalStop.reason, 'quota');
  assert.equal(result.snapshot.generations[0].status, 'failed');
  await assert.rejects(() => runCompactGenerations({ runDirectoryPath, spawnImplementation: stubProvider() }), /Run is stopped/);
  assert.equal(compactStopReason({ stdout: 'Authentication required. Please login.' }), 'authentication');
  assert.equal(compactStopReason({ stdout: JSON.stringify(claudePayload('claude-fable-5-1', 'The colony hits its water quota.')) }), null);
});

test('concurrency never exceeds two and interrupted reservations are not reused', async t => {
  const runDirectoryPath = fixture(t);
  const snapshot = exportCompactRun({ runDirectoryPath });
  fs.mkdirSync(path.join(runDirectoryPath, 'generations', snapshot.generations[0].id));
  let running = 0, peak = 0;
  const result = await runCompactGenerations({ runDirectoryPath, limit: 4,
    spawnImplementation: stubProvider({ delayMs: 5, track: {
      start() { running++; peak = Math.max(peak, running); }, end() { running--; }
    } }) });
  assert.equal(peak, 2); assert.equal(result.snapshot.generations[0].status, 'incomplete');
  assert.equal(result.snapshot.generations.filter(row => row.status === 'succeeded').length, 4);
  await assert.rejects(() => runCompactGenerations({ runDirectoryPath, concurrency: 3 }), /Concurrency/);
});

test('two original judges receive complete opposite-order anonymous pairs and strict structured ratings', async t => {
  const runDirectoryPath = fixture(t);
  await runCompactGenerations({ runDirectoryPath, limit: 2, spawnImplementation: stubProvider({
    answer: (call, index) => claudePayload(call.args[call.args.indexOf('--model') + 1], `Complete original candidate ${index}.`) }) });
  const before = exportCompactRun({ runDirectoryPath }), task = before.manifest.specification.cases[0], calls = [];
  const value = assessment(task);
  const result = await runCompactJudgments({ runDirectoryPath, limit: 2, spawnImplementation: stubProvider({ calls,
    answer: () => [ { type: 'thread.started', thread_id: 'judge-thread' },
      { type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(value) } },
      { type: 'turn.completed', usage: { input_tokens: 500, output_tokens: 180 } } ].map(event => JSON.stringify(event)).join('\n') }) });
  assert.equal(calls.length, 2);
  const [first, second] = result.snapshot.judgments;
  assert.equal(first.status, 'succeeded'); assert.equal(second.status, 'succeeded');
  assert.equal(first.candidateMap.A, second.candidateMap.B);
  assert.deepEqual(first.candidateMap, compactCandidateMap(before.manifest.specification, first.configurationId, first.caseId, 1));
  for (const call of calls) {
    assert.equal(call.command, 'codex');
    for (const token of ['skip_host_skill_discovery', 'skill_search', 'shell_tool', 'apps', 'multi_agent', 'project_doc_max_bytes=0']) assert.ok(call.args.includes(token));
    assert.ok(!/claude-fable|claude-opus|baseline|skill|judge-seat|configurationId/.test(call.inputText));
    assert.ok(call.inputText.includes('Complete original candidate 0.'));
    assert.ok(call.inputText.includes('Complete original candidate 1.'));
  }
  assert.deepEqual(first.assessmentA, value.assessmentA);
  const changed = structuredClone(result.snapshot);
  changed.judgments[0].candidateMap = second.candidateMap;
  assert.throws(() => validateCompactRunExport(changed));
  const forged = structuredClone(value); forged.assessmentA.ratings[0].score = 3.5;
  assert.throws(() => validateCompactAssessment(forged, task), /integer/);
  const duplicate = structuredClone(value); duplicate.assessmentA.ratings[0] = duplicate.assessmentA.ratings[1];
  assert.throws(() => validateCompactAssessment(duplicate, task), /distinct/);
  const rawPath = path.join(runDirectoryPath, first.artifactDirectory, 'stdout.txt');
  fs.appendFileSync(rawPath, '\n{"tampered":true}');
  assert.throws(() => exportCompactRun({ runDirectoryPath }), /Raw stdout changed/);
});

test('invalid original judgment is retained once, without a repair call', async t => {
  const runDirectoryPath = fixture(t);
  await runCompactGenerations({ runDirectoryPath, limit: 2, spawnImplementation: stubProvider() });
  const calls = [];
  const result = await runCompactJudgments({ runDirectoryPath, limit: 1, spawnImplementation: stubProvider({ calls,
    answer: () => [ { type: 'item.completed', item: { type: 'agent_message', text: '{"score":5}' } },
      { type: 'turn.completed', usage: { input_tokens: 50, output_tokens: 20 } } ].map(event => JSON.stringify(event)).join('\n') }) });
  assert.equal(calls.length, 1); assert.equal(result.snapshot.judgments[0].status, 'failed');
  assert.equal(result.snapshot.judgments[0].responseText, '{"score":5}');
  assert.equal(result.snapshot.judgments[1].status, 'pending');
});

const configRejection = 'Error loading config.toml: model_providers contains reserved built-in provider IDs: `openai`. Built-in providers cannot be overridden. Rename your custom provider (for example, `openai-custom`).\nin `model_providers`';

async function rejectedJudgeFixture(t, { stdout = '', stderr = configRejection, exitCode = 1 } = {}) {
  const runDirectoryPath = fixture(t);
  await runCompactGenerations({ runDirectoryPath, limit: 2, spawnImplementation: stubProvider() });
  await runCompactJudgments({ runDirectoryPath, limit: 2,
    spawnImplementation: stubProvider({ answer: () => stdout, stderr, exitCode }) });
  // Reconstruct the old invocation in this synthetic fixture only. No scored evidence is touched.
  const snapshot = exportCompactRun({ runDirectoryPath });
  for (const row of snapshot.judgments.filter(item => item.status === 'failed')) {
    const directory = path.join(runDirectoryPath, row.artifactDirectory);
    for (const argument of ['model_providers.openai.request_max_retries=0', 'model_providers.openai.stream_max_retries=0']) {
      row.runtimeReceipt.cliArguments.splice(row.runtimeReceipt.cliArguments.length - 1, 0, '--config', argument);
    }
    const invocation = JSON.parse(fs.readFileSync(path.join(directory, 'invocation.json')));
    invocation.arguments = row.runtimeReceipt.cliArguments;
    fs.writeFileSync(path.join(directory, 'invocation.json'), JSON.stringify(invocation));
    fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(row));
    fs.writeFileSync(path.join(directory, 'result.sha256'), `${compactDigest(row)}\n`);
  }
  return runDirectoryPath;
}

test('explicit amendment preserves rejected originals and permits only one corrected launch with identical judge inputs', async t => {
  const runDirectoryPath = await rejectedJudgeFixture(t);
  const before = exportCompactRun({ runDirectoryPath });
  const originalFiles = ['manifest.json', 'manifest.sha256', 'specification.json', ...before.generations.slice(0, 2).map(row => `${row.artifactDirectory}/result.json`),
    ...before.judgments.slice(0, 2).flatMap(row => [`${row.artifactDirectory}/result.json`, `${row.artifactDirectory}/stdout.txt`, `${row.artifactDirectory}/stderr.txt`])];
  const originalHashes = Object.fromEntries(originalFiles.map(file => [file, compactDigest(fs.readFileSync(path.join(runDirectoryPath, file)))]));
  const amendment = applyCompactRuntimeAmendment({ runDirectoryPath });
  assert.equal(amendment.allowedFailedJudgmentIds.length, 2);
  assert.equal(exportCompactRun({ runDirectoryPath }).judgments[0].retryAuthorized, true);
  assert.throws(() => applyCompactRuntimeAmendment({ runDirectoryPath }), /already exists/);
  const calls = [], value = assessment(before.manifest.specification.cases[0]);
  const result = await runCompactJudgments({ runDirectoryPath, limit: 2, spawnImplementation: stubProvider({ calls,
    answer: () => [ { type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(value) } },
      { type: 'turn.completed', usage: { input_tokens: 500, output_tokens: 180 } } ].map(event => JSON.stringify(event)).join('\n') }) });
  assert.equal(calls.length, 2);
  for (const [index, row] of result.snapshot.judgments.slice(0, 2).entries()) {
    assert.equal(row.status, 'succeeded');
    assert.equal(row.attempt.number, 2);
    assert.equal(row.attempt.automaticRetries, 0);
    assert.equal(row.attempt.amendmentSha256, amendment.amendmentSha256);
    assert.deepEqual(row.priorAttempts, [before.judgments[index]]);
    assert.equal(row.promptText, before.judgments[index].promptText);
    assert.equal(row.artifactDirectory, `judgments/${row.id}/attempt-2`);
    assert.equal(row.runtimeReceipt.runtimePolicy.codexRequestMaxRetries, null);
    assert.ok(!row.runtimeReceipt.cliArguments.some(arg => arg.startsWith('model_providers.')));
  }
  assert.deepEqual(Object.fromEntries(originalFiles.map(file => [file, compactDigest(fs.readFileSync(path.join(runDirectoryPath, file)))])), originalHashes);
  const untouchedCalls = [];
  await runCompactJudgments({ runDirectoryPath, limit: 2, spawnImplementation: stubProvider({ calls: untouchedCalls }) });
  assert.equal(untouchedCalls.length, 0, 'Completed reviews are never repeated.');
  const tampered = structuredClone(result.snapshot);
  tampered.judgments[0].priorAttempts[0].error.message = 'Changed';
  assert.throws(() => validateCompactRunExport(tampered), /Original failed judgment changed/);
});

test('amendment refuses generic failures, nonempty stdout, or an existing valid judgment', async t => {
  const generic = await rejectedJudgeFixture(t, { stderr: 'Ordinary failure, not the reserved provider configuration rejection.' });
  assert.throws(() => applyCompactRuntimeAmendment({ runDirectoryPath: generic }), /Only the exact reserved-provider/);
  const nonempty = await rejectedJudgeFixture(t, { stdout: ' ' });
  assert.throws(() => applyCompactRuntimeAmendment({ runDirectoryPath: nonempty }), /Nonempty stdout/);
  const valid = fixture(t);
  await runCompactGenerations({ runDirectoryPath: valid, limit: 2, spawnImplementation: stubProvider() });
  const value = assessment(exportCompactRun({ runDirectoryPath: valid }).manifest.specification.cases[0]);
  await runCompactJudgments({ runDirectoryPath: valid, limit: 2, spawnImplementation: stubProvider({
    answer: () => [ { type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(value) } },
      { type: 'turn.completed', usage: { input_tokens: 500, output_tokens: 180 } } ].map(event => JSON.stringify(event)).join('\n') }) });
  assert.throws(() => applyCompactRuntimeAmendment({ runDirectoryPath: valid }), /Exactly two original pre-inference/);
});
