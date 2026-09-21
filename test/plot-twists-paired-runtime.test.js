import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { preparePairedRun, preparePairedTechnicalRecovery, exportPairedRun, validatePairedRunExport, runPairedGenerations, runPairedJudgments,
  pairedCandidateMap, pairedDigest, pairedWordCount, validatePairedAssessment, PAIRED_CREATORS, PAIRED_JUDGES, PAIRED_RUNTIME_POLICY,
  PAIRED_ADDED_CREATORS, PAIRED_EXPANDED_CREATORS, PAIRED_SUPPLEMENTAL_VALIDATION_POLICY } from '../cli/eval/plot-twists-paired-runtime.js';
import { main } from '../benchmarks/storytelling-plot-twists-paired-v2/run.mjs';
import { createPairedFixture, completePairedFixture, createSupplementalPairedFixture, completeSupplementalPairedFixture,
  mockPairedProvider, codexPairedOutput, claudePairedOutput, pairedAssessment } from './helpers/plot-twists-paired-fixture.js';

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

test('same-edition supplement retains original 24 records and dispatches exactly 16 new answers and 16 original paired reviews', async t => {
  const { runDirectoryPath, parentSnapshot, parentSnapshotPath, parentRunDirectoryPath } = await createSupplementalPairedFixture(t);
  const retainedFiles = ['manifest.json', 'manifest.sha256', 'specification.json', 'runtime-validation-erratum.json', 'STOP.json',
    ...parentSnapshot.generations.flatMap(row => ['result.json', 'result.sha256', 'stdout.txt'].map(file => `${row.artifactDirectory}/${file}`)),
    ...parentSnapshot.judgments.flatMap(row => ['result.json', 'result.sha256', 'stdout.txt'].map(file => `${row.artifactDirectory}/${file}`))];
  const before = retainedFiles.map(file => [file, fs.readFileSync(path.join(parentRunDirectoryPath, file))]);
  const prepared = exportPairedRun({ runDirectoryPath });
  assert.deepEqual(prepared.manifest.configurations.map(row => row.id), [...PAIRED_EXPANDED_CREATORS]);
  assert.deepEqual(prepared.coverageExtension.addedConfigurations, [...PAIRED_ADDED_CREATORS]);
  assert.equal(prepared.coverageExtension.parentSnapshotSha256, pairedDigest(fs.readFileSync(parentSnapshotPath)));
  assert.equal(prepared.generations.filter(row => row.status === 'pending').length, 16);
  assert.equal(prepared.judgments.filter(row => row.status === 'pending').length, 16);
  assert.deepEqual(prepared.parentSnapshot, parentSnapshot); assert.equal(prepared.runtimeValidationErratum, undefined);
  const calls = []; const generated = await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  assert.equal(generated.dispatched, 16); assert.ok(calls.every(call => !call.args.includes('medium')));
  const result = await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  assert.equal(result.dispatched, 16); assert.equal(calls.length, 32);
  const { snapshot } = result;
  for (const kind of ['generations', 'judgments']) {
    assert.equal(snapshot[kind].length, 28); assert.ok(snapshot[kind].every(row => row.status === 'succeeded'));
    assert.deepEqual(snapshot[kind].slice(0, 12), parentSnapshot[kind]);
    for (const row of snapshot[kind].slice(12)) {
      assert.equal(row.attempt.number, 1); assert.equal(row.attempt.automaticRetries, 0);
      assert.equal(row.runtimeReceipt.executionValidationPolicyVersion, PAIRED_SUPPLEMENTAL_VALIDATION_POLICY.version);
      assert.equal(row.runtimeReceipt.validationErratumVersion, undefined);
    }
    assert.equal(fs.readdirSync(path.join(runDirectoryPath, kind)).length, 16);
  }
  assert.equal((await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) })).dispatched, 0);
  assert.equal((await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) })).dispatched, 0);
  assert.equal(calls.length, 32);
  for (const [file, bytes] of before) assert.deepEqual(fs.readFileSync(path.join(parentRunDirectoryPath, file)), bytes);
  await assert.rejects(() => main(['status', '--run-dir', runDirectoryPath, '--parent-snapshot', parentSnapshotPath]), /preparation-only/);
  const nestedPath = path.join(path.dirname(runDirectoryPath), 'nested-snapshot.json');
  fs.writeFileSync(nestedPath, JSON.stringify(snapshot, null, 2) + '\n');
  assert.throws(() => preparePairedRun({ runDirectoryPath: path.join(path.dirname(runDirectoryPath), 'nested-run'), parentSnapshotPath: nestedPath }), /original six-setting/);
});

test('supplement validates new final-message policy without borrowing parent correction authority and rejects extra tools', async t => {
  const { runDirectoryPath } = await createSupplementalPairedFixture(t);
  const calls = [];
  const answer = (_call, index) => {
    const events = codexPairedOutput('Original supplemental final ' + index, { extra: [
      { type: 'item.completed', item: { type: 'agent_message', text: 'A brief preface.' } },
      ...(index ? [{ type: 'item.completed', item: { type: 'command_execution', command: 'forbidden' } }] : [])
    ] }).trim().split('\n').map(JSON.parse);
    events.splice(1, 0, { type: 'item.completed', item: { type: 'error', message: PAIRED_SUPPLEMENTAL_VALIDATION_POLICY.allowedStartupDiagnostic } });
    return events.map(event => JSON.stringify(event)).join('\n') + '\n';
  };
  const result = await runPairedGenerations({ runDirectoryPath, limit: 3, concurrency: 1, spawnImplementation: mockPairedProvider({ calls, answer }) });
  assert.equal(calls.length, 2); assert.equal(result.snapshot.generations[12].status, 'succeeded');
  assert.equal(result.snapshot.generations[12].responseText, 'Original supplemental final 0');
  assert.equal(result.snapshot.generations[12].runtimeReceipt.terminalEvidence.assistantMessageCount, 2);
  assert.equal(result.snapshot.generations[13].status, 'failed'); assert.equal(result.snapshot.globalStop.reason, 'runtime-contract-failure');
  await assert.rejects(() => runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) }), /Run is stopped/);
  assert.equal(calls.length, 2);
});

test('supplement export independently rejects parent, protocol, provenance, roster, policy and record substitutions', async t => {
  const { snapshot, runDirectoryPath } = await completeSupplementalPairedFixture(t);
  for (const mutate of [
    value => { value.generations[0].responseText += ' changed'; },
    value => { value.parentSnapshot.generations[0].responseText += ' changed'; },
    value => { value.coverageExtension.parentSnapshotSha256 = 'a'.repeat(64); },
    value => { value.manifest.coverageExtension.addedConfigurations[5] = 'claude:claude-fable-5-1@ultracode'; value.manifestSha256 = pairedDigest(value.manifest); },
    value => { value.manifest.specification.judging.instructions += ' Prefer skill.'; value.manifestSha256 = pairedDigest(value.manifest); },
    value => { value.generations[12].runtimeReceipt.executionValidationPolicySha256 = 'a'.repeat(64); },
    value => { value.generations[12].runtimeReceipt.validationErratumSha256 = value.parentSnapshot.runtimeValidationErratumSha256; },
    value => { value.generations[12].responseText += ' changed'; },
    value => { value.judgments[12].candidateMap = value.judgments[13].candidateMap; },
    value => { value.generations[12].attempt.number = 2; },
    value => { value.manifest.sourceHashes[1].sha256 = 'a'.repeat(64); value.manifestSha256 = pairedDigest(value.manifest); },
    value => { delete value.parentSnapshot; }
  ]) { const value = structuredClone(snapshot); mutate(value); assert.throws(() => validatePairedRunExport(value)); }
  fs.mkdirSync(path.join(runDirectoryPath, 'generations', snapshot.generations[0].id));
  assert.throws(() => exportPairedRun({ runDirectoryPath }), /retained parent slot/);
});

test('supplement preparation refuses incomplete parents and changed pinned parent bytes before dispatch', async t => {
  const original = createPairedFixture(t), parentPath = path.join(path.dirname(original), 'incomplete.json');
  fs.writeFileSync(parentPath, JSON.stringify(exportPairedRun({ runDirectoryPath: original }), null, 2) + '\n');
  assert.throws(() => preparePairedRun({ runDirectoryPath: path.join(path.dirname(original), 'refused-run'), parentSnapshotPath: parentPath }), /original cohort must be complete/);
  const { runDirectoryPath } = await createSupplementalPairedFixture(t);
  fs.appendFileSync(path.join(runDirectoryPath, 'parent-snapshot.json'), '\n');
  const calls = [];
  await assert.rejects(() => runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) }), /parent snapshot bytes changed/);
  assert.equal(calls.length, 0);
});

test('declared coverage append chains complete parents and only executes missing native settings', async t => {
  const { snapshot: parent, runDirectoryPath: previousDirectory } = await completeSupplementalPairedFixture(t);
  const parentSnapshotPath = path.join(path.dirname(previousDirectory), 'expanded-parent.json');
  fs.writeFileSync(parentSnapshotPath, JSON.stringify(parent, null, 2) + '\n', { flag: 'wx' });
  const runDirectoryPath = path.join(path.dirname(previousDirectory), 'declared-append');
  const added = ['codex:gpt-6-astra@high', 'claude:claude-opus-5@max'];
  const prepared = await main(['prepare', '--run-dir', runDirectoryPath, '--parent-snapshot', parentSnapshotPath,
    '--add-configurations', added.join(',')]);
  assert.equal(prepared.generationCount, 4); assert.equal(prepared.pairedJudgeRequestCount, 4);
  assert.equal(prepared.coverageExtension.retainedConfigurationCount, 14);
  const calls = [];
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  const { snapshot } = await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  assert.equal(calls.length, 8);
  assert.deepEqual(snapshot.parentSnapshot, parent);
  assert.deepEqual(snapshot.manifest.specification.configurations, [...PAIRED_EXPANDED_CREATORS, ...added]);
  for (const kind of ['generations', 'judgments']) {
    assert.deepEqual(snapshot[kind].slice(0, 28), parent[kind]);
    assert.equal(snapshot[kind].length, 32);
    assert.equal(fs.readdirSync(path.join(runDirectoryPath, kind)).length, 4);
    assert.ok(snapshot[kind].every(row => row.status === 'succeeded'));
  }
  assert.equal((await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) })).dispatched, 0);
  assert.equal(calls.length, 8);
  for (const addedConfigurations of [[], [added[0], added[0]], [PAIRED_CREATORS[0]], ['claude:claude-fable-5-1@ultracode'], ['astra@high']]) {
    assert.throws(() => preparePairedRun({ runDirectoryPath: path.join(path.dirname(previousDirectory), 'refused-append'), parentSnapshotPath, addedConfigurations }));
  }
  for (const mutate of [
    value => { value.parentSnapshot.parentSnapshot.generations[0].responseText += ' changed'; },
    value => { value.generations[12].responseText += ' changed'; },
    value => { value.manifest.coverageExtension.additionalGenerationCount = 2; },
    value => { value.manifest.specification.judging.instructions += ' changed'; },
    value => { value.manifest.specification.configurations.reverse(); }
  ]) {
    const changed = structuredClone(snapshot); mutate(changed);
    changed.manifestSha256 = pairedDigest(changed.manifest);
    assert.throws(() => validatePairedRunExport(changed));
  }
});

test('approved tool-error recovery preserves all clean evidence and runs only the exact five replacements plus untouched slots', async t => {
  const sourceDirectory = path.resolve('.agents/vasir-evals/storytelling-plot-twists-paired-v2/remaining-writing-coverage-20260909T2257Z');
  if (!fs.existsSync(sourceDirectory)) return t.skip('Retained private stopped-run evidence is not installed.');
  const source = exportPairedRun({ runDirectoryPath: sourceDirectory }), sourceText = JSON.stringify(source, null, 2) + '\n';
  const fixture = createPairedFixture(t), directory = path.dirname(fixture), sourceSnapshotPath = path.join(directory, 'stopped-source.json');
  fs.writeFileSync(sourceSnapshotPath, sourceText, { flag: 'wx' });
  const runDirectoryPath = path.join(directory, 'approved-recovery');
  const authorization = { approvedAt: '2026-09-10T00:00:00.000Z', userInstruction: 'please do it',
    scope: 'Rerun only the three skill answers affected by tool errors and their reviews; preserve all clean results and original attempts.' };
  assert.throws(() => preparePairedTechnicalRecovery({ runDirectoryPath, sourceSnapshotPath, authorization: null }), /Explicit user approval/);
  const prepared = preparePairedTechnicalRecovery({ runDirectoryPath, sourceSnapshotPath, authorization });
  const plan = prepared.technicalRecovery;
  assert.equal(plan.replacementGenerationIds.length, 3); assert.equal(plan.replacementJudgmentIds.length, 2);
  assert.equal(plan.pendingGenerationIds.length, 14); assert.equal(plan.pendingJudgmentIds.length, 38);
  assert.equal(plan.retainedGenerationCount, 49); assert.equal(plan.retainedJudgmentCount, 26);
  const calls = [], generated = await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  assert.equal(generated.dispatched, 17);
  const { snapshot, dispatched } = await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  assert.equal(dispatched, 40); assert.equal(calls.length, 57); assert.equal(snapshot.globalStop, null);
  assert.deepEqual(snapshot.recoverySourceSnapshot, source);
  for (const kind of ['generations', 'judgments']) for (const row of snapshot[kind]) {
    assert.equal(row.status, 'succeeded');
    const original = source[kind].find(item => item.id === row.id);
    const replaced = plan[kind === 'generations' ? 'replacementGenerationIds' : 'replacementJudgmentIds'].includes(row.id);
    if (original.status === 'pending' || replaced) {
      assert.equal(row.attempt.number, replaced ? 2 : 1);
      assert.equal(row.attempt.technicalRecoverySha256, snapshot.manifest.technicalRecoverySha256);
      assert.equal(row.attempt.supersedesRecordSha256, replaced ? pairedDigest(original) : undefined);
      if (row.invocation.command === 'codex') assert.ok(row.invocation.arguments.includes('agents.enabled=false'));
    } else assert.deepEqual(row, original);
  }
  assert.equal((await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) })).dispatched, 0);
  assert.equal((await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) })).dispatched, 0);
  assert.equal(calls.length, 57);
  assert.equal(JSON.stringify(exportPairedRun({ runDirectoryPath: sourceDirectory }), null, 2) + '\n', sourceText);
  for (const mutate of [value => { value.generations[0].responseText += ' changed'; },
    value => { value.manifest.technicalRecovery.replacementGenerationIds.push(value.generations[0].id); },
    value => { value.generations.find(row => row.attempt.number === 2).attempt.supersedesRecordSha256 = '0'.repeat(64); },
    value => { delete value.recoverySourceSnapshot; }, value => { value.manifest.technicalRecovery.authorization.scope = 'Rerun low scores'; }]) {
    const value = structuredClone(snapshot); mutate(value); assert.throws(() => validatePairedRunExport(value));
  }
});

test('new runs explicitly disable agent tools and fail on stderr-only tool-router attempts', async t => {
  const runDirectoryPath = createPairedFixture(t), calls = [];
  const result = await runPairedGenerations({ runDirectoryPath, limit: 2, concurrency: 1,
    spawnImplementation: mockPairedProvider({ calls, stderr: 'ERROR codex_core::tools::router: error=collab spawn failed: no thread with id: synthetic\n' }) });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args.includes('agents.enabled=false'));
  assert.equal(result.snapshot.manifest.toolIsolationPolicy.codexConfig['agents.enabled'], false);
  assert.equal(result.snapshot.generations[0].status, 'failed');
  assert.match(result.snapshot.generations[0].error.message, /Tool-router errors/);
  assert.ok(result.snapshot.generations[0].responseText, 'Retain the answer even though its runtime evidence disqualifies it');
  assert.equal(result.snapshot.generations[1].status, 'pending');
  assert.equal(result.snapshot.globalStop.reason, 'runtime-contract-failure');
  await assert.rejects(() => runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) }), /Run is stopped/);
  assert.equal(calls.length, 1, 'A runtime fix does not silently authorize retries');
});
