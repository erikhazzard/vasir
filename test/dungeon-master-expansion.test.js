import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { prepareDungeonMasterExpansion, inspectDungeonMasterExpansion, executeDungeonMasterExpansion, dmExpansionDiagnostic, verifyDungeonMasterExpansionPreflight } from '../cli/eval/expand-dungeon-master-benchmark.js';
import { validateDungeonMasterExpansion, dmDigest, DM_ORIGINAL_RUN_SHA256 } from '../cli/eval/dungeon-master-expansion-manifest.js';
import { projectDungeonMasterRun, validateDungeonMasterPublication } from '../cli/eval/dungeon-master-publication.js';
import { runDungeonMasterNativePreflight, verifyDungeonMasterNativePreflight } from '../cli/eval/dungeon-master-native-preflight.js';
import { archiveDungeonMasterExpansion } from '../cli/eval/archive-dungeon-master-expansion.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const originalDirectory = path.join(repoRoot, '.agents/vasir-evals/dungeon-master-adventure-outline/dm-outline-v1-2026-09-08');
const sourceScope = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(repoRoot, 'site/vasirbenchmark.com/writing-data.js'), 'utf8'), sourceScope);
const configurations = JSON.parse(JSON.stringify(sourceScope.window.VASIR_WRITING.settings)).map(setting => {
  const [provider, value] = setting.configurationId.split(':');
  const [model, reasoning] = value.split('@');
  return { id: setting.configurationId, provider, model, reasoning };
});
const clone = value => JSON.parse(JSON.stringify(value));
function fixture(t) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-dm-expansion-test-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const runDirectory = path.join(temporary, 'cohort');
  const run = prepareDungeonMasterExpansion({ repoRoot, originalDirectory, runDirectory, configurations,
    runId: 'dm-model-cohort-test', authorization: 'Synthetic test preparation; no provider dispatch.' });
  return { temporary, runDirectory, run };
}
const successfulRuntime = async ({ configuration, evidenceDirectory }) => {
  const outputText = `Synthetic retained output for ${configuration.id}.`;
  fs.writeFileSync(path.join(evidenceDirectory, 'stdout.jsonl'), JSON.stringify({ type: 'turn.completed' }) + '\n');
  fs.writeFileSync(path.join(evidenceDirectory, 'stderr.txt'), '');
  return { outputText, usage: { outputTokens: 8 }, durationMs: 1, runtimeReceipt: { freshSession: true } };
};
const execute = (runDirectory, options = {}) => executeDungeonMasterExpansion({ runDirectory, authorization: 'Synthetic injected runtime only.', runtime: successfulRuntime, maximumCalls: 1, concurrency: 1, ...options });

test('DM extension declares 33 models, preserves every original byte and inventories exactly 2048 new calls', t => {
  const { run, runDirectory } = fixture(t);
  assert.equal(run.configurations.length, 33);
  assert.equal(run.rows.length, 1056);
  assert.equal(run.generation.expectedPairs, 528);
  assert.equal(run.rows.filter(row => row.rowStatus === 'complete').length, 32);
  assert.equal(run.judging.pairs.flatMap(pair => pair.judges).length, 32);
  assert.equal(dmDigest(run.cohortExtension.parent.runText), DM_ORIGINAL_RUN_SHA256);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDirectory, 'manifest.json')));
  assert.equal(manifest.newWriterCalls, 1024);
  assert.equal(manifest.newJudgeCalls, 1024);
  assert.equal(manifest.operationalLimits.defaultConcurrency, 4);
  assert.equal(manifest.operationalLimits.maximumConcurrency, 16);
  assert.doesNotThrow(() => inspectDungeonMasterExpansion(runDirectory));
  for (const mutate of [
    value => { value.rows[0].outputText += 'changed'; },
    value => { value.judging.pairs[0].judges[0].outputHash = '0'.repeat(64); },
    value => { value.configurations[0].reasoning = 'ultracode'; },
    value => { value.rows.at(-1).configurationId = value.rows[0].configurationId; },
    value => { value.cohortExtension.primaryRepetitions = 16; },
    value => { value.judging.panel[0].model = 'different-model'; }
  ]) { const altered = clone(run); mutate(altered); assert.throws(() => validateDungeonMasterExpansion(altered)); }
});

test('drained checkpoint archive preserves exact source bytes and refuses an active writer or overwrite', async t => {
  const { runDirectory, temporary } = fixture(t);
  const archiveDirectory = path.join(temporary, 'checkpoint-archive');
  const before = fs.readFileSync(path.join(runDirectory, 'run.json'));
  fs.writeFileSync(path.join(runDirectory, 'run.lock'), 'Synthetic active writer');
  await assert.rejects(archiveDungeonMasterExpansion({ runDirectory, archiveDirectory, authorization: 'Synthetic archive only.' }), /EEXIST/);
  fs.unlinkSync(path.join(runDirectory, 'run.lock'));
  const receipt = await archiveDungeonMasterExpansion({ runDirectory, archiveDirectory, authorization: 'Synthetic archive only.' });
  assert.equal(receipt.runSha256, dmDigest(before));
  assert.deepEqual(fs.readFileSync(path.join(archiveDirectory, 'run.json')), before);
  assert.deepEqual(fs.readFileSync(path.join(runDirectory, 'run.json')), before);
  assert.ok(receipt.files.length > 50);
  assert.equal(fs.existsSync(path.join(runDirectory, 'run.lock')), false);
  assert.equal(fs.existsSync(path.join(archiveDirectory, 'run.lock')), false);
  await assert.rejects(archiveDungeonMasterExpansion({ runDirectory, archiveDirectory, authorization: 'Synthetic archive only.' }), /already exists/);
});

test('controller permits 16 calls only when explicitly configured; default remains four and 17 is rejected', async t => {
  const { runDirectory } = fixture(t);
  let active = 0, peak = 0;
  const runtime = async args => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    const result = await successfulRuntime(args); active--; return result;
  };
  const first = await execute(runDirectory, { concurrency: undefined, runtime, maximumCalls: 4 });
  assert.equal(first.expansionExecution.sessions.at(-1).concurrency, 4);
  assert.equal(peak, 4);
  await execute(runDirectory, { concurrency: 16, runtime, maximumCalls: 16 });
  assert.equal(peak, 16);
  await assert.rejects(execute(runDirectory, { concurrency: 17 }), /Concurrency must be 1–16/);
});

test('superseding an unscored preparation preserves its files and frozen transport but refuses scored history', async t => {
  const { runDirectory, temporary, run } = fixture(t);
  fs.writeFileSync(path.join(runDirectory, 'excluded-probe.json'), JSON.stringify({ note: 'Retain even failed diagnostics.' }));
  const nextDirectory = path.join(temporary, 'superseding');
  const next = prepareDungeonMasterExpansion({ repoRoot, originalDirectory, runDirectory: nextDirectory, configurations,
    runId: 'dm-model-cohort-test-v2', supersedesDirectory: runDirectory, authorization: 'Explicit zero-scored-call supersession.' });
  assert.equal(next.cohortExtension.preparationLineage.manifestHash, run.cohortExtension.manifestHash);
  assert.ok(next.cohortExtension.preparationLineage.files.some(file => file.path === 'excluded-probe.json'));
  assert.doesNotThrow(() => inspectDungeonMasterExpansion(nextDirectory));
  assert.deepEqual(fs.readFileSync(path.join(nextDirectory, 'superseded-preparation/run.json')), fs.readFileSync(path.join(runDirectory, 'run.json')));
  await execute(runDirectory);
  assert.throws(() => prepareDungeonMasterExpansion({ repoRoot, originalDirectory, runDirectory: path.join(temporary, 'forbidden'), configurations,
    runId: 'dm-forbidden-supersession', supersedesDirectory: runDirectory, authorization: 'Synthetic negative test.' }), /zero-scored-call/);
});

test('native supplement is separately labeled and independently binds retained provider arms, actual exit/output and unchanged transports', async t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-dm-native-test-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const previousDirectory = path.join(repoRoot, '.agents/vasir-evals/dungeon-master-adventure-outline/dm-model-coverage-20260908');
  const runDirectory = path.join(temporary, 'cohort');
  const run = prepareDungeonMasterExpansion({ repoRoot, originalDirectory, runDirectory, configurations,
    runId: 'dm-native-synthetic-test', supersedesDirectory: previousDirectory, authorization: 'Synthetic local subprocess only; no provider calls.' });
  let calls = 0;
  const result = await runDungeonMasterNativePreflight({ runDirectory, run, authorization: 'Injected local native-command fixture only.', spawnSync: (command, args) => {
    calls++; assert.equal(command, 'codex'); assert.equal(args[0], 'sandbox');
    const inside = args.at(-1).endsWith('/inside-sentinel.txt');
    return { status: inside ? 0 : 1, signal: null, stdout: inside ? fs.readFileSync(args.at(-1), 'utf8') : '', stderr: inside ? '' : '/bin/cat: Operation not permitted\n' };
  } });
  assert.equal(calls, 2); assert.equal(result.providerCalls, 0); assert.equal(result.status, 'passed', result.error);
  assert.equal(fs.existsSync(path.join(runDirectory, 'preflight.json')), false, 'A diagnostic must not automatically activate readiness.');
  const proof = verifyDungeonMasterNativePreflight({ runDirectory, run, supplementFile: result.supplementFile });
  assert.equal(proof.previousProviderProofStatus, 'failed');
  assert.match(proof.evidenceSource, /not provider-observed tool denial/);
  assert.equal(proof.providers[0].conditions[0].outsideReadEvidence, 'native-sandbox-enforcement-and-recorded-invocation-binding');
  const supplementPath = path.join(runDirectory, result.supplementFile), original = fs.readFileSync(supplementPath, 'utf8');
  for (const mutate of [
    value => { value.checks[1].exitCode = 0; },
    value => { value.checks[0].exitCode = 1; },
    value => { value.checks[1].arguments[1] = '--different-permission'; },
    value => { value.configurationSha256 = '0'.repeat(64); },
    value => { value.originalCodexRuntimeSha256 = '0'.repeat(64); },
    value => { value.providerCalls = 4; },
    value => { value.previousManifestHash = '0'.repeat(64); }
  ]) {
    const changed = JSON.parse(original); mutate(changed); fs.writeFileSync(supplementPath, JSON.stringify(changed));
    assert.throws(() => verifyDungeonMasterNativePreflight({ runDirectory, run, supplementFile: result.supplementFile }));
  }
  fs.writeFileSync(supplementPath, original);
  fs.writeFileSync(path.join(runDirectory, 'preflight.json'), JSON.stringify(proof));
  assert.doesNotThrow(() => verifyDungeonMasterExpansionPreflight(runDirectory, run, ['codex', 'claude']));
  proof.providers[0].conditions[0].outsideReadEvidence = 'provider-recorded-denied-command';
  fs.writeFileSync(path.join(runDirectory, 'preflight.json'), JSON.stringify(proof));
  assert.throws(() => verifyDungeonMasterExpansionPreflight(runDirectory, run, ['codex']), /independently verified/);
});

test('bounded DM calls route each writer to its own declared configuration and resume without rerolling', async t => {
  const { runDirectory } = fixture(t);
  const requested = [];
  const runtime = async args => { requested.push(args.configuration); return successfulRuntime(args); };
  const first = await execute(runDirectory, { maximumCalls: 4, concurrency: 4, providers: ['codex'], runtime });
  assert.equal(requested.length, 4);
  assert.ok(requested.every(configuration => configuration.provider === 'codex' && configuration.id !== 'codex:gpt-6-astra@ultra'));
  const added = first.rows.filter(row => row.rowStatus === 'complete' && row.configurationId !== 'codex:gpt-6-astra@ultra');
  assert.equal(added.length, 4);
  for (const row of added) assert.equal(row.outputText, `Synthetic retained output for ${row.configurationId}.`);
  assert.ok(first.expansionExecution.attempts.every(attempt => attempt.status === 'complete'));
  const second = await execute(runDirectory, { maximumCalls: 1, providers: ['codex'], runtime });
  for (const row of added) assert.deepEqual(second.rows.find(other => other.rowKey === row.rowKey), row);
  assert.equal(fs.existsSync(path.join(runDirectory, 'run.lock')), false);
});

test('raw quota evidence opens the global circuit without automatic retries or account switching', async t => {
  const { runDirectory } = fixture(t);
  let calls = 0;
  const quotaRuntime = async ({ evidenceDirectory }) => {
    calls++;
    fs.writeFileSync(path.join(evidenceDirectory, 'stdout.jsonl'), JSON.stringify({ type: 'error', message: 'You have hit your usage limit; out of credits.' }) + '\n');
    fs.writeFileSync(path.join(evidenceDirectory, 'stderr.txt'), '');
    throw new Error('The Codex session did not return a final answer.');
  };
  const stopped = await execute(runDirectory, { runtime: quotaRuntime, maximumCalls: 100, providers: ['codex'] });
  assert.equal(calls, 1);
  assert.equal(stopped.expansionExecution.quotaCircuitOpen, true);
  assert.equal(stopped.expansionExecution.attempts.length, 1);
  await assert.rejects(execute(runDirectory), /Circuit is open/);
  await assert.rejects(execute(runDirectory, { recover: true, environmentVariables: { ...process.env, CODEX_HOME: '/synthetic/different-account-context' } }), /context changed/);
  await assert.rejects(execute(runDirectory, { recover: true }), /resolution receipt/);
  const evidencePath = 'readiness/stdout.jsonl';
  fs.mkdirSync(path.join(runDirectory, 'readiness'));
  const evidence = JSON.stringify({ type: 'turn.completed' }) + '\n';
  fs.writeFileSync(path.join(runDirectory, evidencePath), evidence);
  const resolutionFile = path.join(runDirectory, 'resolution.json');
  fs.writeFileSync(resolutionFile, JSON.stringify({ status: 'resolved', manifestHash: stopped.cohortExtension.manifestHash,
    accountContexts: stopped.expansionExecution.accountContexts, verifiedAt: new Date(Date.parse(stopped.expansionExecution.attempts[0].completedAt) + 1000).toISOString(),
    providers: [{ provider: 'codex', files: [{ path: evidencePath, bytes: Buffer.byteLength(evidence), sha256: dmDigest(evidence) }] }] }));
  const resumed = await execute(runDirectory, { recover: true, resolutionFile, maximumCalls: 1, providers: ['codex'] });
  assert.equal(resumed.expansionExecution.sessions.length, 2);
  assert.equal(resumed.expansionExecution.attempts[0].status, 'error');
});

test('candidate text cannot open a quota circuit and nontechnical failures never retry', async t => {
  const { runDirectory } = fixture(t);
  const evidence = path.join(runDirectory, 'diagnostic-fixture'); fs.mkdirSync(evidence);
  fs.writeFileSync(path.join(evidence, 'stdout.jsonl'), JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'The villain ran out of credits.' } }) + '\n');
  assert.equal(dmExpansionDiagnostic(evidence, new Error('No score')).quota, false);
  let calls = 0;
  const run = await execute(runDirectory, { maximumCalls: 1, runtime: async () => { calls++; throw new Error('Provider output filtering'); } });
  assert.equal(calls, 1);
  assert.equal(run.expansionExecution.attempts.length, 1);
  assert.equal(run.expansionExecution.quotaCircuitOpen, false);
  const terminal = run.rows.find(row => row.terminalFailure === 'policy');
  assert.ok(terminal);
  const recovered = await execute(runDirectory, { recover: true, maximumCalls: 1 });
  assert.deepEqual(recovered.rows.find(row => row.rowKey === terminal.rowKey), terminal, 'A policy failure is never retried by recovery.');
});

test('file pause drains active calls while retaining the single writer lock and launches no replacements', async t => {
  const { runDirectory } = fixture(t);
  let calls = 0;
  const runtime = async args => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 5));
    fs.writeFileSync(path.join(runDirectory, 'PAUSE.json'), JSON.stringify({ reason: 'Synthetic cross-workstream provider pause' }));
    await new Promise(resolve => setTimeout(resolve, 15));
    assert.equal(fs.existsSync(path.join(runDirectory, 'run.lock')), true, 'Lock was released before provider calls drained.');
    return successfulRuntime(args);
  };
  const paused = await execute(runDirectory, { runtime, concurrency: 4, maximumCalls: 100 });
  assert.equal(calls, 4);
  assert.equal(paused.runStatus, 'operator-paused');
  assert.equal(fs.existsSync(path.join(runDirectory, 'run.lock')), false);
  const stillPaused = await execute(runDirectory, { runtime, maximumCalls: 100 });
  assert.equal(calls, 4);
  assert.equal(stillPaused.expansionExecution.sessions.at(-1).calls, 0);
});

test('new model pairs receive only the fixed Astra Ultra judges and incomplete primary coverage stays unranked', async t => {
  const { runDirectory, run } = fixture(t);
  const original = JSON.parse(run.cohortExtension.parent.runText);
  const configuration = run.configurations.find(item => item.id === 'codex:gpt-5.6-luna@low');
  for (const row of run.rows) if (row.configurationId !== 'codex:gpt-6-astra@ultra') row.rowStatus = 'error';
  const members = run.rows.filter(row => row.configurationId === configuration.id && row.caseId === 'primary' && row.trialNumber === 1);
  for (const row of members) {
    const template = clone(original.rows.find(item => item.caseId === row.caseId && item.trialNumber === row.trialNumber && item.conditionId === row.conditionId));
    const identity = Object.fromEntries(['rowKey', 'configurationId', 'provider', 'model', 'reasoning'].map(field => [field, row[field]]));
    Object.assign(row, template, identity);
    Object.assign(row.runtimeReceipt, { requestedConfiguration: configuration, requestedModel: configuration.model, requestedReasoning: configuration.reasoning });
  }
  fs.writeFileSync(path.join(runDirectory, 'run.json'), JSON.stringify(run));
  const requested = [];
  const judgeTemplate = JSON.parse(run.cohortExtension.parent.judgesText).pairs[0].judges[0];
  const runtime = async ({ configuration, evidenceDirectory, promptText, outputSchema }) => {
    requested.push(configuration);
    assert.ok(outputSchema);
    const outputText = judgeTemplate.outputText;
    fs.writeFileSync(path.join(evidenceDirectory, 'stdout.jsonl'), JSON.stringify({ type: 'turn.completed' }) + '\n');
    fs.writeFileSync(path.join(evidenceDirectory, 'stderr.txt'), '');
    return { outputText, durationMs: 1, runtimeReceipt: { ...clone(judgeTemplate.runtimeReceipt), userPromptSha256: dmDigest(promptText), outputSha256: dmDigest(outputText) } };
  };
  const result = await execute(runDirectory, { runtime, providers: ['codex'], maximumCalls: 2, concurrency: 2 });
  assert.equal(requested.length, 2);
  assert.ok(requested.every(item => item.id === 'codex:gpt-6-astra@ultra'));
  const pair = result.judging.pairs.find(item => item.configurationId === configuration.id);
  assert.equal(pair.judges.length, 2);
  assert.deepEqual(pair.judges[0].candidateOrder, [...pair.judges[1].candidateOrder].reverse());
  const snapshot = JSON.parse(fs.readFileSync(path.join(runDirectory, 'skill-snapshot.json')));
  const projected = projectDungeonMasterRun({ run: result, snapshot, sourceSha256: dmDigest(JSON.stringify(result)) });
  const setting = projected.projection.settings.find(item => item.configurationId === configuration.id);
  assert.deepEqual(setting.scores, { baseline: null, skill: null });
  assert.equal(projected.projection.caseResults.filter(item => item.configurationId === configuration.id && item.exactScore !== null).length, 2);
  assert.match(projected.projection.methodology.originalCohortExecution.disclosure, /contrary to the frozen quota-retry rule/);
});

test('a real provider launch fails closed without pinned isolation and required-read preflight', async t => {
  const { runDirectory, run } = fixture(t);
  assert.throws(() => verifyDungeonMasterExpansionPreflight(runDirectory, run, ['codex', 'claude']), /ENOENT/);
  await assert.rejects(executeDungeonMasterExpansion({ runDirectory, authorization: 'Do not call a provider without preflight.', maximumCalls: 1 }), /ENOENT/);
  assert.equal(fs.existsSync(path.join(runDirectory, 'run.lock')), false);
});

test('DM expanded publication retains original Astra scores, 1056 planned cells and six-primary-only headlines', t => {
  const { run, runDirectory } = fixture(t);
  const snapshot = JSON.parse(fs.readFileSync(path.join(runDirectory, 'skill-snapshot.json')));
  const original = JSON.parse(run.cohortExtension.parent.runText);
  const before = projectDungeonMasterRun({ run: original, snapshot, sourceSha256: DM_ORIGINAL_RUN_SHA256 });
  const result = projectDungeonMasterRun({ run, snapshot, sourceSha256: dmDigest(JSON.stringify(run)) });
  assert.equal(result.projection.settings.length, 33);
  assert.equal(result.projection.caseResults.length, 1056);
  assert.equal(result.responseBundle.responses.length, 1056);
  assert.equal(result.projection.coverage.completedSettingCount, 1);
  const astra = result.projection.settings.find(setting => setting.configurationId === 'codex:gpt-6-astra@ultra');
  assert.deepEqual(astra.scores, before.projection.settings[0].scores);
  assert.equal(result.projection.entries.filter(entry => entry.rank !== null).length, 2);
  assert.equal(result.projection.settingCohortSummaries.find(item => item.configurationId === astra.configurationId).cohorts.primary.usablePairs, 6);
  for (const answer of before.responseBundle.responses) {
    const after = result.responseBundle.responses.find(item => item.settingId === astra.id && item.caseId === answer.caseId && item.condition === answer.condition);
    assert.equal(after.outputText, answer.outputText);
    assert.deepEqual(after.judgments, answer.judgments);
  }
  assert.ok(result.responseBundle.promptFiles.some(file => file.id === 'frozen-skill-root-claude-read-tool'));
  for (const mutate of [
    value => { value.projection.methodology.cohortExtension.parentRunSha256 = '0'.repeat(64); },
    value => { value.projection.settings.pop(); },
    value => { value.projection.entries.find(entry => entry.rank === null).score = 100; },
    value => { value.responseBundle.responses.find(answer => answer.outputText).outputText += 'changed'; }
  ]) { const altered = clone(result); mutate(altered); assert.throws(() => validateDungeonMasterPublication(altered.projection, altered.responseBundle)); }
});
