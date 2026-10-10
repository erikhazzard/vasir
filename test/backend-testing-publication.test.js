import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { BACKEND_TESTING_CONFIGURATIONS, buildBackendTestingPublication, projectBackendTestingResults, validateBackendTestingPublication } from '../cli/eval/backend-testing-publication.js';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function sources() {
  const conditions = ['none', 'previous', 'revised'].map(id => ({ id, skillSha256: id === 'none' ? null : hash(id) }));
  const generation = { schemaVersion: 1, benchmark: 'backend-testing', batchId: 'run-1',
    policy: { configurations: BACKEND_TESTING_CONFIGURATIONS.map(item => item.id), conditions: conditions.map(item => item.id), trials: 2, concurrency: 4, wallTimeLimitMs: 1800000, maxStreamBytes: 67108864, automaticRetries: 0, delegateTools: false }, basis: { conditions, sourceHash: hash("source"), calibrationSha256: hash("calibration") },
    rows: BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => conditions.flatMap(condition => [1, 2].map(trial => ({
      rowId: `${configuration.id}-${condition.id}-${trial}`, configuration, condition: condition.id, trial, status: 'complete',
      elapsedMs: 1000, usage: { inputTokens: 120, outputTokens: 40 }, submission: { addedLines: 8, deletedLines: 3, forbiddenChanges: [] },
      outputText: 'PRIVATE answer', prompt: '/Users/private/secrets', sessionId: 'SECRET'
    })))) };
  const faults = ['read-counter', 'read-action-separation', 'completion-pending-counter', 'retained-history'].map(id => ({ id, calibrated: true, reviewStatus: 'approved', label: 'PRIVATE fault source' }));
  const evaluation = { schemaVersion: 1, benchmark: 'backend-testing', runId: 'run-1', basis: { sourceHash: hash('source'), calibrationSha256: hash('calibration'), runSha256: hash(JSON.stringify(generation)), evaluatorSha256: hash('evaluator') }, faults,
    rows: generation.rows.map(row => ({ rowId: row.rowId, status: 'valid',
      controlRuns: [{ status: 'pass', elapsedMs: 10 }, { status: 'pass', elapsedMs: 11 }],
      faultRuns: faults.map((fault, index) => ({ faultId: fault.id, status: index === 0 ? 'detected' : 'survived', reviewStatus: 'approved', logPath: '/Users/private/log', assertions: ['PRIVATE source'] })) })) };
  const selection = { kind: 'vasirbenchmark-backend-testing-selection', schemaVersion: 1,
    generation: { path: '.agents/vasir-evals/backend-testing/run-1/run.json', sha256: hash(JSON.stringify(generation)) },
    evaluation: { path: '.agents/vasir-evals/backend-testing/run-1/evaluation.json', sha256: hash(JSON.stringify(evaluation)) }, conditions };
  return { generation, evaluation, selection };
}

test('selected private executions publish only allowlisted metrics with planned denominators', () => {
  const input = sources();
  const result = projectBackendTestingResults(input);
  assert.equal(result.rows.length, 24);
  assert.equal(result.conditionSummaries[0].detected, 8);
  assert.equal(result.conditionSummaries[0].possible, 32);
  assert.equal(result.summaries[0].detected, 2);
  assert.equal(result.summaries[0].possible, 8);
  assert.equal(result.sourceSha256, hash(`${input.selection.generation.sha256}\n${input.selection.evaluation.sha256}`));
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|SECRET|\/Users\/|logPath|outputText|sessionId/);
});

test('provider resource fields preserve observed token counts without inventing cache totals', () => {
  const input = sources();
  input.generation.rows[0].usage = { input_tokens: 321, output_tokens: 54, cache_read_input_tokens: 10000 };
  input.generation.rows[1].usage = null;
  const rows = projectBackendTestingResults(input).rows;
  assert.equal(rows[0].inputTokens, 321); assert.equal(rows[0].outputTokens, 54);
  assert.equal(rows[1].inputTokens, null); assert.equal(rows[1].outputTokens, null);
});

test('an authored invalid or flaky submission gets zero detection while keeping both trials', () => {
  const input = sources();
  input.generation.rows[0].status = 'invalid-submission';
  input.evaluation.rows[1].controlRuns[1].status = 'assertion-failure';
  const result = projectBackendTestingResults(input);
  assert.equal(result.rows[0].status, 'invalid');
  assert.equal(result.rows[1].status, 'flaky');
  assert.deepEqual(result.summaries[0], { configurationId: BACKEND_TESTING_CONFIGURATIONS[0].id, condition: 'none', trials: 2, valid: 0, flaky: 1, invalid: 1, incomplete: 0, detected: 0, possible: 8 });
  assert.equal(result.status, 'complete');
});

test('forbidden changes cannot gain credit through an otherwise passing allowed-file submission', () => {
  const input = sources();
  input.generation.rows[0].submission.forbiddenChanges.push('src/private-production.js');
  const row = projectBackendTestingResults(input).rows[0];
  assert.equal(row.status, 'invalid');
  assert.deepEqual(row.detectedFaultIds, []);
});

test('a reviewed shared teardown failure keeps zero eligibility credit without claiming missed faults', () => {
  const input = sources(), row = input.evaluation.rows[0];
  row.status = 'invalid'; row.controlRuns[0].status = 'execution-failure'; row.faultRuns = [];
  row.controlReview = { classification: 'unstable-shared-server-teardown', behavioralAssertionsPassed: true, faultReplayPerformed: false, reviewStatus: 'approved', privateEvidence: '/Users/private/stack' };
  const result = projectBackendTestingResults(input);
  assert.equal(result.rows[0].controlQualification, 'unstable-shared-server-teardown');
  assert.equal(result.rows[0].status, 'flaky'); assert.deepEqual(result.rows[0].detectedFaultIds, []);
  assert.equal(result.summaries[0].detected, 1); assert.equal(result.summaries[0].possible, 8);
  assert.doesNotMatch(JSON.stringify(result), /privateEvidence|\/Users\/private\/stack/);
  row.controlReview.reviewStatus = 'pending';
  assert.throws(() => projectBackendTestingResults(input), /control qualification/);
  row.controlReview.reviewStatus = 'approved'; row.controlReview.faultReplayPerformed = true;
  assert.throws(() => projectBackendTestingResults(input), /control qualification/);
});

test('infrastructure failures and pending semantic review keep the comparison incomplete', () => {
  for (const change of [
    input => { input.evaluation.rows[0].controlRuns[0].status = 'infrastructure-failure'; },
    input => { input.evaluation.rows[0].faultRuns[0].status = 'candidate-detection'; input.evaluation.rows[0].faultRuns[0].reviewStatus = 'pending'; },
    input => { input.evaluation.rows[0].faultRuns[0].reviewStatus = 'pending'; }
  ]) {
    const input = sources(); change(input);
    const result = projectBackendTestingResults(input);
    assert.equal(result.status, 'incomplete');
    assert.equal(result.rows[0].status, 'incomplete');
    assert.equal(result.rows[0].detectedFaultIds.length, 0);
    assert.equal(result.summaries[0].possible, 8);
    assert.equal(result.summaries[0].detected, null);
    assert.equal(result.conditionSummaries[0].detected, null);
  }
});

test('generation failures remain unresolved and known forbidden edits override pending review', () => {
  const input = sources();
  input.generation.rows[0].status = 'failed';
  input.evaluation.rows[0] = { rowId: input.generation.rows[0].rowId, status: 'invalid', controlRuns: [], faultRuns: [] };
  input.generation.rows[1].status = 'invalid-submission';
  input.evaluation.rows[1].faultRuns[0].status = 'candidate-detection';
  input.evaluation.rows[1].faultRuns[0].reviewStatus = 'pending';
  const result = projectBackendTestingResults(input);
  assert.equal(result.rows[0].status, 'incomplete');
  assert.equal(result.rows[1].status, 'invalid');
  assert.equal(result.status, 'incomplete');
  assert.equal(result.summaries[0].detected, null);
  assert.equal(result.summaries[0].possible, 8);
});

test('authored execution failures and rejected detections are distinct from operationally unresolved faults', () => {
  const input = sources();
  input.evaluation.rows[0].controlRuns = [{ status: 'execution-failure', elapsedMs: 3 }];
  input.evaluation.rows[0].status = 'invalid';
  input.evaluation.rows[1].faultRuns[0].status = 'survived';
  input.evaluation.rows[1].faultRuns[0].reviewStatus = 'rejected';
  input.evaluation.rows[1].faultRuns[1].status = 'invalid';
  input.evaluation.rows[2].faultRuns[0].status = 'unresolved';
  const result = projectBackendTestingResults(input);
  assert.equal(result.rows[0].status, 'invalid');
  assert.equal(result.rows[1].status, 'valid');
  assert.equal(result.rows[1].detectedFaultIds.length, 0);
  assert.equal(result.rows[2].status, 'incomplete');
  assert.equal(result.status, 'incomplete');
});

test('generation time and output budget exhaustion are retained zero-credit task failures', () => {
  const input = sources();
  input.generation.rows[0].status = 'timeout';
  input.generation.rows[0].timedOut = true;
  input.generation.rows[1].status = 'failed';
  input.generation.rows[1].outputLimitExceeded = true;
  const result = projectBackendTestingResults(input);
  for (const row of result.rows.slice(0, 2)) {
    assert.equal(row.status, 'invalid'); assert.equal(row.reason, 'generation-budget-exhausted'); assert.deepEqual(row.detectedFaultIds, []);
  }
  assert.equal(result.status, 'complete');
  assert.equal(result.summaries[0].possible, 8);
});

test('operational recovery retains interrupted attempts and never zero-fills missing resource usage', () => {
  const input = sources(), row = input.generation.rows[0];
  row.promptSha256 = hash('same prompt'); row.treatmentSha256 = null;
  const identity = { sourceHash: input.generation.basis.sourceHash, promptSha256: row.promptSha256, treatmentSha256: row.treatmentSha256, configurationId: row.configuration.id };
  row.attempts = [
    { ...identity, attempt: 1, kind: 'initial', status: 'failed', cause: 'provider-usage-limit', elapsedMs: 50, usage: null },
    { ...identity, attempt: 2, kind: 'fresh-session-operational-recovery', status: row.status, cause: null, elapsedMs: row.elapsedMs, usage: row.usage }
  ];
  const result = projectBackendTestingResults(input).rows[0];
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0].cause, 'provider-usage-limit');
  assert.equal(result.elapsedMs, 1050);
  assert.equal(result.inputTokens, null); assert.equal(result.outputTokens, null);
  assert.equal(result.attempts[1].inputTokens, 120);
  row.attempts[0].status = 'complete';
  assert.throws(() => projectBackendTestingResults(input), /recovery/);
  row.attempts[0].status = 'failed'; row.attempts[1].promptSha256 = hash('new prompt');
  assert.throws(() => projectBackendTestingResults(input), /basis/);
});

test('unreviewed calibration, duplicate seats and changed skill identity fail closed', () => {
  for (const [change, message] of [
    [input => { input.evaluation.faults[0].reviewStatus = 'pending'; }, /calibration/],
    [input => { input.generation.policy.automaticRetries = 1; }, /execution policy/],
    [input => { input.evaluation.basis.sourceHash = hash('other'); }, /sourceHash/],
    [input => { input.evaluation.basis.runSha256 = hash('other-generation-same-run'); }, /runSha256/],
    [input => { input.evaluation.basis.calibrationSha256 = hash('other'); }, /calibrationSha256/],
    [input => { input.generation.rows[1] = input.generation.rows[0]; }, /duplicate/],
    [input => { input.selection.conditions = structuredClone(input.selection.conditions); input.selection.conditions[1].skillSha256 = hash('other'); }, /skill hashes/]
  ]) { const input = sources(); change(input); assert.throws(() => projectBackendTestingResults(input), message); }
});

test('public validation rejects forged totals, private keys and detection on failed controls', () => {
  for (const change of [
    result => { result.summaries[0].detected += 1; },
    result => { result.rows[0].privateLog = '/Users/private/log'; },
    result => { result.rows[0].controlPasses = 1; },
    result => { result.rows[0].attempts[0].status = 'failed'; },
    result => { result.conditions[0].privatePrompt = 'private'; }
  ]) { const result = projectBackendTestingResults(sources()); change(result); assert.throws(() => validateBackendTestingPublication(result)); }
});

test('publisher resolves pinned sources and rejects changed bytes or escaping paths', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-testing-publication-'));
  try {
    const input = sources();
    const selectionPath = path.join(root, 'benchmarks/backend-testing/publication.json');
    fs.mkdirSync(path.dirname(selectionPath), { recursive: true });
    for (const type of ['generation', 'evaluation']) {
      const target = path.join(root, input.selection[type].path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, JSON.stringify(input[type]));
    }
    fs.writeFileSync(selectionPath, JSON.stringify(input.selection));
    assert.equal(buildBackendTestingPublication({ repoRootDirectory: root }).projection.rows.length, 24);
    fs.appendFileSync(path.join(root, input.selection.evaluation.path), '\n');
    assert.throws(() => buildBackendTestingPublication({ repoRootDirectory: root }), /hash mismatch/);
    input.selection.evaluation.path = '.agents/vasir-evals/backend-testing/../../other.json';
    fs.writeFileSync(selectionPath, JSON.stringify(input.selection));
    assert.throws(() => buildBackendTestingPublication({ repoRootDirectory: root }), /unsafe/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('recovery publication verifies original receipt bytes before admitting attempt resources', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-testing-recovery-publication-'));
  const write = (relative, value) => { const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify(value)); };
  try {
    const input = sources(), row = input.generation.rows[0];
    row.promptSha256 = hash('frozen prompt'); row.treatmentSha256 = null;
    const initial = { ...row, status: 'failed', elapsedMs: 50, usage: null };
    const final = { ...row };
    row.attempts = [initial, final].map((receipt, index) => {
      const resultPath = `.agents/vasir-evals/backend-testing/run-1/attempt-${index + 1}.json`;
      write(resultPath, receipt);
      return { attempt: index + 1, kind: index ? 'fresh-session-operational-recovery' : 'initial', cause: index ? null : 'provider-usage-limit', status: receipt.status, elapsedMs: receipt.elapsedMs, usage: receipt.usage,
        sourceHash: input.generation.basis.sourceHash, configurationId: row.configuration.id, promptSha256: row.promptSha256, treatmentSha256: null, resultPath, resultSha256: hash(JSON.stringify(receipt)) };
    });
    input.selection.generation.sha256 = hash(JSON.stringify(input.generation));
    input.evaluation.basis.runSha256 = input.selection.generation.sha256;
    input.selection.evaluation.sha256 = hash(JSON.stringify(input.evaluation));
    write(input.selection.generation.path, input.generation); write(input.selection.evaluation.path, input.evaluation);
    write('benchmarks/backend-testing/publication.json', input.selection);
    assert.equal(buildBackendTestingPublication({ repoRootDirectory: root }).projection.rows[0].elapsedMs, 1050);
    fs.appendFileSync(path.join(root, row.attempts[0].resultPath), '\n');
    assert.throws(() => buildBackendTestingPublication({ repoRootDirectory: root }), /attempt receipt hash mismatch/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
