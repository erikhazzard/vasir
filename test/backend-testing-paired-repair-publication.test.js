import assert from 'node:assert/strict';
import test from 'node:test';
import { BACKEND_TESTING_CONFIGURATIONS, validateBackendTestingPairedRepair } from '../cli/eval/backend-testing-publication.js';

const dimensions = [
  { id: 'independent_oracles', label: 'Independent meaningful oracles', weight: 30 },
  { id: 'coverage_layer_choice', label: 'Justified coverage and layer choice', weight: 25 },
  { id: 'subtraction_simplicity', label: 'Subtraction and simplicity', weight: 20 },
  { id: 'boundary_fidelity_reuse', label: 'Real-boundary fidelity and reuse', weight: 15 },
  { id: 'reproducibility_evidence', label: 'Reproducibility and evidence', weight: 10 }
];
const judges = ['codex:gpt-6-astra@xhigh', 'claude:claude-opus-5-5@xhigh'];
function fixture() {
  const rows = BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => ['none', 'repaired'].map(condition => {
    const baseline = condition === 'none';
    const judgments = judges.map(judgeConfigurationId => ({ judgeConfigurationId, reviewSha256: 'c'.repeat(64), status: 'complete', score: baseline ? 49 : 95, uncappedScore: baseline ? 100 : 95, diagnosticScore: baseline ? 49 : 95,
      dimensions: dimensions.map(dimension => ({ id: dimension.id, rating: !baseline && dimension.id === 'subtraction_simplicity' ? 3 : 4 })), coverage: 'yes', protection: baseline ? 'lost' : 'retained', caps: baseline ? [{ rule: 'lost-material-preexisting-protection', maximum: 49, scope: 'whole-original-suite' }] : [], remainingCruft: false, introducedCruft: false }));
    return { id: `${configuration.id}:${condition}`, configurationId: configuration.id, label: configuration.label, condition, status: 'scored', generationStatus: 'complete', executionStatus: 'valid', testStatus: 'pass', cleanupStatus: 'failed', score: baseline ? 49 : 95, protection: baseline ? 'lost' : 'retained',
      dimensionScores: dimensions.map(dimension => ({ id: dimension.id, rating: !baseline && dimension.id === 'subtraction_simplicity' ? 3 : 4, points: !baseline && dimension.id === 'subtraction_simplicity' ? 15 : dimension.weight })), judgments, elapsedMs: 1234, verificationMs: 4321, inputTokens: 100, outputTokens: 20 };
  }));
  return { kind: 'backend-testing-paired-repair-check', schemaVersion: 1, date: '2026-10-09', caseId: 'player-saves', sourceSha256: 'a'.repeat(64), skillSha256: 'b'.repeat(64), scope: 'one-known-case-development', status: 'complete', successCriterionMet: true, nativeSessions: 10, automaticRetries: 0, knownTokens: 1200, usageMissingSessions: 0,
    scoreBasis: { maximum: 100, judgeCount: 2, judges, dimensions }, rows, summaries: BACKEND_TESTING_CONFIGURATIONS.map(configuration => ({ configurationId: configuration.id, baseline: 49, treatment: 95, delta: 46 })), meanPairedDifference: 46 };
}

test('paired comparison keeps independent protection caps, weighted dimensions, and cleanup qualification', () => {
  const value = fixture();
  validateBackendTestingPairedRepair(value);
  assert.equal(value.meanPairedDifference, 46);
  assert.equal(value.rows[0].dimensionScores.reduce((sum, dimension) => sum + dimension.points, 0), 100);
  assert.equal(value.rows[0].score, 49);
  assert.equal(value.rows[1].dimensionScores[2].points, 15);
  assert.ok(value.rows.every(row => row.cleanupStatus === 'failed'));
  assert.equal(value.status, 'complete');
});

test('forged paired means, incomplete matrices, original ratings, or private prose fail validation', () => {
  for (const mutate of [
    value => { value.meanPairedDifference = 47; },
    value => { value.rows.pop(); },
    value => { value.rows[0].judgments[0].dimensions[0].rating = 3; },
    value => { value.rows[1].dimensionScores[2].points = 20; },
    value => { value.rows[1].judgments[0].reason = '/Users/private/source.js'; },
    value => { value.scope = 'general-model-ranking'; }
  ]) {
    const value = fixture(); mutate(value);
    assert.throws(() => validateBackendTestingPairedRepair(value), /paired repair|quality judge|unexpected/);
  }
});

test('a missing review preserves its unknown outcome and withholds the matched mean', () => {
  const value = fixture(), row = value.rows[1], missing = row.judgments[1];
  Object.assign(missing, { status: 'infrastructure-failure', score: null, uncappedScore: null, diagnosticScore: null, coverage: 'unresolved', protection: 'unresolved', caps: [], remainingCruft: null, introducedCruft: null });
  missing.dimensions.forEach(dimension => { dimension.rating = null; });
  Object.assign(row, { status: 'incomplete', score: null, protection: 'unresolved' });
  row.dimensionScores.forEach(dimension => { dimension.rating = dimension.points = null; });
  Object.assign(value.summaries[0], { treatment: null, delta: null });
  Object.assign(value, { status: 'incomplete', meanPairedDifference: null, successCriterionMet: false, usageMissingSessions: 1 });
  validateBackendTestingPairedRepair(value);
  value.meanPairedDifference = 46;
  assert.throws(() => validateBackendTestingPairedRepair(value), /summary arithmetic/);
});

test('a positive paired mean does not satisfy success when repaired protection is lost', () => {
  const value = fixture(), row = value.rows[1], judge = row.judgments[0];
  Object.assign(judge, { score: 49, diagnosticScore: 49, protection: 'lost', caps: [{ rule: 'lost-material-preexisting-protection', maximum: 49, scope: 'whole-original-suite' }] });
  Object.assign(row, { score: 72, protection: 'lost' });
  Object.assign(value.summaries[0], { treatment: 72, delta: 23 });
  Object.assign(value, { meanPairedDifference: 40.25, successCriterionMet: false });
  validateBackendTestingPairedRepair(value);
  value.successCriterionMet = true;
  assert.throws(() => validateBackendTestingPairedRepair(value), /declared criterion/);
});
