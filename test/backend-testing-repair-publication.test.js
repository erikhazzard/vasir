import assert from 'node:assert/strict';
import test from 'node:test';
import { BACKEND_TESTING_CONFIGURATIONS, validateBackendTestingRepairCheck } from '../cli/eval/backend-testing-publication.js';

function summary() {
  return { kind: 'backend-testing-repair-check', schemaVersion: 1, date: '2026-10-09', caseId: 'purchases', sourceSha256: 'a'.repeat(64), skillSha256: 'b'.repeat(64), nativeSessions: 6, automaticRetries: 0, knownTokens: 254345, usageMissingSessions: 3,
    rows: BACKEND_TESTING_CONFIGURATIONS.map((configuration, index) => ({ configurationId: configuration.id, label: configuration.label, status: index === 3 ? 'complete' : 'timeout', score: index === 3 ? 97.5 : null,
      judgeScores: index === 3 ? [{ configurationId: 'codex:gpt-6-astra@xhigh', score: 100 }, { configurationId: 'claude:claude-opus-5-5@xhigh', score: 95 }] : [], controlsPassed: index === 3 ? 2 : 0, testsPerControl: index === 3 ? 5 : null, faultsDetected: index === 3 ? 4 : 0, faultsReplayed: index === 3 ? 4 : 0, protection: index === 3 ? 'retained' : 'unresolved' })) };
}

test('repair summary preserves all timeout rows and both original judge scores', () => {
  const value = summary();
  validateBackendTestingRepairCheck(value);
  assert.deepEqual(value.rows.map(row => row.score), [null, null, null, 97.5]);
  const changed = summary(); changed.rows[3].score = 100;
  assert.throws(() => validateBackendTestingRepairCheck(changed), /completed repair evidence/);
  const missing = summary(); missing.rows.shift();
  assert.throws(() => validateBackendTestingRepairCheck(missing), /repair configuration/);
  const invented = summary(); invented.rows[0].score = 0;
  assert.throws(() => validateBackendTestingRepairCheck(invented), /timeout has invented/);
});

test('repair summary rejects private prose and paths at every published object boundary', () => {
  for (const mutate of [value => { value.sourcePath = '/Users/private/report.json'; }, value => { value.rows[3].reason = 'PRIVATE judge prose'; }, value => { value.rows[3].judgeScores[0].providerStream = 'PRIVATE'; }]) {
    const value = summary(); mutate(value);
    assert.throws(() => validateBackendTestingRepairCheck(value), /unexpected .* fields/);
  }
});
