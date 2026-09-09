import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { preparePairedRun, exportPairedRun, validatePairedRunExport, runPairedGenerations, runPairedJudgments,
  pairedCandidateMap, pairedDigest, pairedWordCount, validatePairedAssessment, PAIRED_CREATORS, PAIRED_JUDGES, PAIRED_RUNTIME_POLICY } from '../cli/eval/plot-twists-paired-runtime.js';
import { main } from '../benchmarks/storytelling-plot-twists-paired-v2/run.mjs';
import { createPairedFixture, completePairedFixture, mockPairedProvider, codexPairedOutput, claudePairedOutput, pairedAssessment } from './helpers/plot-twists-paired-fixture.js';

test('prepare pins one prompt, exact six medium models, twelve answers and twelve paired requests without inference', t => {
  const runDirectoryPath = createPairedFixture(t), snapshot = exportPairedRun({ runDirectoryPath });
  assert.deepEqual(snapshot.manifest.configurations.map(row => row.id), [...PAIRED_CREATORS]);
  assert.deepEqual(snapshot.manifest.specification.judging.panel, [...PAIRED_JUDGES]);
  assert.equal(snapshot.generations.length, 12); assert.equal(snapshot.judgments.length, 12);
  assert.ok([...snapshot.generations, ...snapshot.judgments].every(row => row.status === 'pending'));
  assert.deepEqual(snapshot.manifest.frozenBundle.files.map(file => file.path), ['SKILL.md', 'references/twists-and-revelations.md']);
  assert.equal(snapshot.manifest.frozenBundle.sha256, pairedDigest(snapshot.manifest.frozenBundle.text));
  assert.throws(() => preparePairedRun({ runDirectoryPath }), /EEXIST/);
  fs.appendFileSync(path.join(runDirectoryPath, 'specification.json'), '\n');
  assert.throws(() => exportPairedRun({ runDirectoryPath }), /specification bytes changed/);
});

test('both GPT and Claude get identical user tasks, only the skill arm gets the full frozen treatment, and all tools are disabled', async t => {
  const runDirectoryPath = createPairedFixture(t), calls = [];
  const result = await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  assert.equal(calls.length, 12); assert.equal(result.dispatched, 12);
  assert.ok(result.snapshot.generations.every(row => row.status === 'succeeded'));
  assert.equal(new Set(calls.map(call => call.options.cwd)).size, 12);
  assert.ok(calls.every(call => !fs.existsSync(call.options.cwd)));
  const { prompt } = result.snapshot.manifest.specification.benchmark;
  for (const [index, call] of calls.entries()) {
    const skill = index % 2 === 1;
    assert.equal(call.inputText, prompt);
    if (call.command === 'codex') {
      assert.ok(call.args.includes('developer_instructions=' + JSON.stringify(skill ? result.snapshot.manifest.frozenBundle.text : '')));
      for (const feature of ['shell_tool', 'skill_search', 'multi_agent', 'apps', 'plugins', 'unbounded_connection_retries']) assert.equal(call.args[call.args.indexOf(feature) - 1], '--disable');
      assert.ok(call.args.includes('suppress_unstable_features_warning=true')); assert.ok(call.args.includes('project_doc_max_bytes=0'));
    } else {
      assert.equal(call.args.includes('--append-system-prompt'), skill);
      if (skill) assert.equal(call.args[call.args.indexOf('--append-system-prompt') + 1], result.snapshot.manifest.frozenBundle.text);
      assert.equal(call.args[call.args.indexOf('--tools') + 1], ''); assert.ok(call.args.includes('--safe-mode'));
      assert.equal(call.args[call.args.indexOf('--max-turns') + 1], '1');
      for (const [key, value] of Object.entries(PAIRED_RUNTIME_POLICY.claudeEnvironment)) assert.equal(call.options.env[key], value);
    }
  }
  for (const row of result.snapshot.generations) { assert.equal(row.exactMessagesSha256, pairedDigest(row.exactMessages));
    assert.equal(row.runtimeReceipt.terminalEvidence.toolCallCount, 0); assert.equal(row.attempt.number, 1); }
});

test('judges receive original complete anonymous pairs in opposite order and preserve all 24 criterion sets', async t => {
  const { runDirectoryPath, snapshot } = await completePairedFixture(t);
  assert.ok(snapshot.judgments.every(row => row.status === 'succeeded'));
  for (const configurationId of PAIRED_CREATORS) {
    const [first, second] = snapshot.judgments.filter(row => row.configurationId === configurationId);
    assert.equal(first.candidateMap.A, second.candidateMap.B);
    assert.deepEqual(first.candidateMap, pairedCandidateMap(snapshot.manifest.specification, configurationId, 1));
    for (const row of [first, second]) {
      assert.ok(!/gpt-6|gpt-5|claude-|baseline|skill|configurationId/.test(row.promptText));
      assert.equal(row.exactMessages.length, 1); assert.equal(row.bundleSha256, null);
      const candidates = JSON.parse(row.promptText.split('Candidates (complete, untruncated):\n')[1]);
      for (const candidate of candidates) assert.equal(candidate.answer, snapshot.generations.find(item => item.configurationId === configurationId && item.condition === row.candidateMap[candidate.candidateLabel]).responseText);
      assert.equal(row.assessment.assessmentA.ratings.length, 4); assert.equal(row.assessment.assessmentB.ratings.length, 4);
    }
  }
  const calls = []; await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) }); assert.equal(calls.length, 0);
});

test('overlength original answers are kept whole and never rerolled', async t => {
  const runDirectoryPath = createPairedFixture(t), answer = Array(601).fill('word').join(' ');
  const result = await runPairedGenerations({ runDirectoryPath, limit: 1, spawnImplementation: mockPairedProvider({ answer: () => codexPairedOutput(answer) }) });
  assert.equal(result.snapshot.generations[0].responseText, answer); assert.equal(result.snapshot.generations[0].wordCount, 601);
  assert.equal(result.snapshot.generations[0].wordLimitExceeded, true); assert.equal(result.snapshot.generations[0].status, 'succeeded');
  assert.equal(pairedWordCount(' alpha\u2003beta\n gamma '), 3);
});

for (const item of [{ type: 'command_execution', command: 'forbidden' }, { type: 'agent_message', text: 'Earlier answer.' }]) test(item.type + ' fails once, retains raw evidence and halts before consuming remaining slots', async t => {
  const runDirectoryPath = createPairedFixture(t), calls = [];
  const result = await runPairedGenerations({ runDirectoryPath, limit: 2, concurrency: 1, spawnImplementation: mockPairedProvider({ calls,
    answer: () => codexPairedOutput('Original retained answer.', { extra: [{ type: 'item.completed', item }] }) }) });
  assert.equal(calls.length, 1); assert.equal(result.snapshot.generations[0].status, 'failed');
  assert.equal(result.snapshot.generations[0].responseText, 'Original retained answer.');
  assert.equal(result.snapshot.globalStop.reason, 'runtime-contract-failure');
  assert.equal(result.snapshot.generations[1].status, 'pending');
  await assert.rejects(() => runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) }), /Run is stopped/);
  assert.equal(calls.length, 1);
});

test('invalid JSON judgment remains a single failed original attempt with no repair call', async t => {
  const runDirectoryPath = createPairedFixture(t); await runPairedGenerations({ runDirectoryPath, limit: 2, spawnImplementation: mockPairedProvider() });
  const calls = [], result = await runPairedJudgments({ runDirectoryPath, limit: 1, spawnImplementation: mockPairedProvider({ calls, answer: () => codexPairedOutput('{"score":5}') }) });
  assert.equal(calls.length, 1); assert.equal(result.snapshot.judgments[0].status, 'failed'); assert.equal(result.snapshot.judgments[0].responseText, '{"score":5}');
  const value = pairedAssessment(result.snapshot.manifest.specification.benchmark.rubric.map(row => row.id)); value.assessmentA.ratings[0].score = 4.5;
  assert.throws(() => validatePairedAssessment(value, result.snapshot.manifest.specification.benchmark), /Integer/);
});

test('quota permanently stops pending dispatch and the original failure cannot be retried', async t => {
  const runDirectoryPath = createPairedFixture(t), calls = [];
  const result = await runPairedGenerations({ runDirectoryPath, concurrency: 1, spawnImplementation: mockPairedProvider({ calls,
    answer: () => JSON.stringify({ type: 'error', message: '429 quota exceeded' }), stderr: '429 quota exceeded', exitCode: 1 }) });
  assert.equal(calls.length, 1); assert.equal(result.halted, true); assert.equal(result.snapshot.globalStop.reason, 'quota');
  assert.equal(result.snapshot.generations[0].status, 'failed');
  await assert.rejects(() => runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider() }), /Run is stopped/);
});

test('concurrency stays bounded and incomplete reserved attempts cannot become a new call', async t => {
  const runDirectoryPath = createPairedFixture(t), snapshot = exportPairedRun({ runDirectoryPath });
  fs.mkdirSync(path.join(runDirectoryPath, 'generations', snapshot.generations[0].id));
  let running = 0, peak = 0;
  const result = await runPairedGenerations({ runDirectoryPath, limit: 3, spawnImplementation: mockPairedProvider({ delayMs: 5,
    track: { start() { running++; peak = Math.max(peak, running); }, end() { running--; } } }) });
  assert.equal(peak, 2); assert.equal(result.snapshot.generations[0].status, 'incomplete');
  await assert.rejects(() => runPairedGenerations({ runDirectoryPath, concurrency: 3 }), /Concurrency/);
});

test('independent export validation rejects forged input, tool settings, scores, model identity, output, prompt and candidate mapping', async t => {
  const { snapshot } = await completePairedFixture(t);
  const changes = [
    value => { value.generations[0].responseText += ' changed'; }, value => { value.generations[1].inputPayload.developerInstructions = 'changed'; },
    value => { value.generations[0].configurationId = 'codex:gpt-6-astra@high'; }, value => { value.judgments[0].candidateMap = value.judgments[1].candidateMap; },
    value => { value.judgments[0].assessment.assessmentA.ratings[0].score = 5; }, value => { value.generations[0].attempt.number = 2; },
    value => { value.generations[0].invocation.arguments[value.generations[0].invocation.arguments.indexOf('shell_tool') - 1] = '--enable';
      value.generations[0].runtimeReceipt.cliArguments = value.generations[0].invocation.arguments; },
    value => { value.generations[0].promptText = 'A different task'; }, value => { value.generations[0].exactMessagesSha256 = '0'.repeat(64); }
  ];
  for (const change of changes) { const value = structuredClone(snapshot); change(value); assert.throws(() => validatePairedRunExport(value)); }
});

test('original raw files and frozen executor hashes are checked before any later dispatch', async t => {
  const runDirectoryPath = createPairedFixture(t); await runPairedGenerations({ runDirectoryPath, limit: 1, spawnImplementation: mockPairedProvider() });
  const snapshot = exportPairedRun({ runDirectoryPath }); fs.appendFileSync(path.join(runDirectoryPath, snapshot.generations[0].artifactDirectory, 'stdout.txt'), 'changed');
  assert.throws(() => exportPairedRun({ runDirectoryPath }), /Original artifact changed/);
});

test('CLI status/export stay read-only by default and reject dispatch options or overwriting an export', async t => {
  const runDirectoryPath = createPairedFixture(t), status = await main(['status', '--run-dir', runDirectoryPath]);
  assert.deepEqual(status.generations, { pending: 12 });
  await assert.rejects(() => main(['status', '--run-dir', runDirectoryPath, '--limit', '1']));
  const output = path.join(path.dirname(runDirectoryPath), 'export.json'); await main(['export', '--run-dir', runDirectoryPath, '--output', output]);
  await assert.rejects(() => main(['export', '--run-dir', runDirectoryPath, '--output', output]), /EEXIST/);
  await assert.rejects(() => main(['retry', '--run-dir', runDirectoryPath]));
});
