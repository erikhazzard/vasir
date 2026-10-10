import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { BACKEND_TESTING_CONFIGURATIONS, validateBackendTestingTaste } from '../cli/eval/backend-testing-publication.js';

const rubric = JSON.parse(fs.readFileSync(new URL('../benchmarks/backend-testing/taste-rubric.json', import.meta.url), 'utf8'));
const ids = ['assertion_quality', 'behavioral_coverage', 'boundary_fidelity', 'domain_structure', 'clarity', 'maintenance_economy', 'semantic_naming'];
const evidence = [{ file: 'save-and-load__journey.spec.js', version: 'final', startLine: 10, endLine: 20 }];
const original = {
  none: { scores: [[0.2, 0.4, 0.6, 0.8, 0.1, 0.3, 0.5], [0.4, 0.6, 0.8, 1, 0.3, 0.5, 0.7]], totals: [0.39, 0.59], mean: 0.49 },
  repaired: { scores: [[0.8, 0.7, 0.9, 0.6, 0.5, 0.4, 0.3], [0.6, 0.5, 0.7, 0.4, 0.3, 0.2, 0.1]], totals: [0.655, 0.455], mean: 0.555 }
};

function fixture(source = original, fileNaming = 0.9) {
  const rows = BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => ['none', 'repaired'].map(condition => {
    const ratings = source[condition];
    return { id: `${configuration.id}:${condition}`, configurationId: configuration.id, label: configuration.label, condition, status: 'scored', score: ratings.mean, range: { minimum: Math.min(...ratings.totals), maximum: Math.max(...ratings.totals) },
      dimensions: ids.map((id, index) => ({ id, score: (ratings.scores[0][index] + ratings.scores[1][index]) / 2, range: { minimum: Math.min(ratings.scores[0][index], ratings.scores[1][index]), maximum: Math.max(ratings.scores[0][index], ratings.scores[1][index]) } })),
      judgments: ['codex:gpt-6-astra@xhigh', 'claude:claude-opus-5-5@xhigh'].map((judgeConfigurationId, index) => ({ judgeConfigurationId, reviewSha256: 'b'.repeat(64), status: 'complete', score: ratings.totals[index],
        dimensions: ids.map((id, dimensionIndex) => ({ id, score: ratings.scores[index][dimensionIndex], reason: 'The retained tests reveal this behavioral responsibility.', evidence: structuredClone(evidence) })),
        files: [{ file: evidence[0].file, score: fileNaming === 0 ? 0.81 : 0.9, dimensions: ids.map(id => ({ id, score: id === 'semantic_naming' ? fileNaming : 0.9 })), reason: 'The file uses distinct inputs and direct persisted outcomes.', evidence: structuredClone(evidence) }] })) };
  }));
  const dimensions = ids.map(id => {
    const baseline = rows[0].dimensions.find(dimension => dimension.id === id).score, treatment = rows[1].dimensions.find(dimension => dimension.id === id).score;
    return { id, baseline, treatment, delta: treatment - baseline };
  });
  return { kind: 'backend-testing-taste-review', schemaVersion: 2, date: '2026-10-10', caseId: 'player-saves', scope: 'exploratory-post-hoc-review', sourceSha256: 'a'.repeat(64), status: 'complete', nativeSessions: 2, knownTokens: 1000, usageMissingSessions: 0,
    scoreBasis: { minimum: 0, maximum: 1, decimals: 2, aggregation: rubric.aggregation, anchors: rubric.anchors, dimensions: rubric.dimensions, namingZeroRule: rubric.namingZeroRule }, rows,
    summaries: BACKEND_TESTING_CONFIGURATIONS.map(({ id }) => ({ configurationId: id, baseline: source.none.mean, treatment: source.repaired.mean, delta: source.repaired.mean - source.none.mean, dimensions: structuredClone(dimensions) })), dimensionSummaries: dimensions,
    baselineMean: source.none.mean, treatmentMean: source.repaired.mean, meanPairedDifference: source.repaired.mean - source.none.mean };
}

test('seven-dimensional scores use fixed unequal weights and preserve matched profiles', () => {
  const value = fixture(); validateBackendTestingTaste(value);
  assert.equal(value.rows[0].judgments[0].score, 0.39);
  assert.equal(value.rows[1].judgments[0].score, 0.655);
  assert.equal(value.baselineMean, 0.49);
  assert.equal(value.treatmentMean, 0.555);
  assert.ok(Math.abs(value.meanPairedDifference - 0.065) < 1e-12);
  assert.equal(value.dimensionSummaries.length, 7);
  const assertionQuality = value.dimensionSummaries.find(dimension => dimension.id === 'assertion_quality');
  assert.ok(Math.abs(assertionQuality.baseline - 0.3) < 1e-12);
  assert.ok(Math.abs(assertionQuality.treatment - 0.7) < 1e-12);
  assert.ok(Math.abs(assertionQuality.delta - 0.4) < 1e-12);
  assert.equal(value.rows[0].judgments[0].files[0].score, 0.9);
});

test('opaque naming zeros only its dimension and permits a suite-owned helper finding', () => {
  const source = structuredClone(original);
  Object.values(source).forEach(condition => condition.scores.forEach(scores => { scores[6] = 0; }));
  Object.assign(source.none, { totals: [0.34, 0.52], mean: 0.43 });
  Object.assign(source.repaired, { totals: [0.625, 0.445], mean: 0.535 });
  const affectedFile = fixture(source, 0); validateBackendTestingTaste(affectedFile);
  assert.equal(affectedFile.rows[0].judgments[0].score, 0.34);
  assert.equal(affectedFile.rows[0].judgments[0].files[0].score, 0.81);
  validateBackendTestingTaste(fixture(source));
  const inconsistent = fixture();
  inconsistent.rows[0].judgments[0].files[0].dimensions[6].score = 0;
  inconsistent.rows[0].judgments[0].files[0].score = 0.81;
  assert.throws(() => validateBackendTestingTaste(inconsistent), /file naming zero/);
});

test('a file rating remains independent from the suite total', () => {
  const value = fixture();
  for (const row of value.rows) for (const judge of row.judgments) {
    judge.files[0].dimensions.forEach(dimension => { dimension.score = 0.1; });
    judge.files[0].score = 0.1;
  }
  validateBackendTestingTaste(value);
  assert.equal(value.baselineMean, 0.49);
  assert.equal(value.treatmentMean, 0.555);
});

test('an evidence qualification preserves the native finding and weighted score', () => {
  const value = fixture(), dimension = value.rows[0].judgments[1].dimensions.find(item => item.id === 'clarity');
  const originalFinding = { score: dimension.score, reason: dimension.reason, evidence: structuredClone(dimension.evidence) };
  dimension.qualifications = [{ finding: 'Four recovery assertions lack messages; the cited range contains messages.', evidence: [{ file: evidence[0].file, version: 'final', startLine: 48, endLine: 56 }, { file: evidence[0].file, version: 'final', startLine: 86, endLine: 87 }] }];
  validateBackendTestingTaste(value);
  assert.deepEqual({ score: dimension.score, reason: dimension.reason, evidence: dimension.evidence }, originalFinding);
  assert.equal(value.baselineMean, 0.49);
  dimension.qualifications.push(structuredClone(dimension.qualifications[0]));
  assert.throws(() => validateBackendTestingTaste(value), /evidence qualification/);
  dimension.qualifications.pop(); dimension.qualifications[0].evidence[0].file = 'final/private/source.js';
  assert.throws(() => validateBackendTestingTaste(value), /taste pointer/);
});

test('an explicit retry retains the timed-out session and its unknown usage', () => {
  const retried = () => {
    const value = fixture();
    Object.assign(value, { nativeSessions: 3, usageMissingSessions: 1, retry: { judgeConfigurationId: 'codex:gpt-6-astra@xhigh', authorization: 'user-requested-after-timeout', amendmentSha256: 'd'.repeat(64), priorReviewSha256: 'c'.repeat(64), reviewSha256: 'b'.repeat(64), priorStatus: 'timeout', status: 'complete', timeoutMs: 1200000, automaticRetries: 0, priorTokens: null, retryTokens: 400 } });
    return value;
  };
  const value = retried(); validateBackendTestingTaste(value);
  assert.equal(value.nativeSessions, 3);
  assert.equal(value.retry.priorTokens, null);
  assert.equal(value.usageMissingSessions, 1);
  assert.equal(value.baselineMean, 0.49);
  assert.equal(value.treatmentMean, 0.555);
  for (const mutate of [
    value => { value.nativeSessions = 2; },
    value => { value.usageMissingSessions = 0; },
    value => { value.knownTokens = 399; },
    value => { value.retry.priorStatus = 'complete'; },
    value => { value.retry.authorization = 'automatic-retry'; },
    value => { value.retry.status = 'incomplete'; },
    value => { value.retry.reviewSha256 = 'a'.repeat(64); },
    value => { value.retry.priorReviewSha256 = value.retry.reviewSha256; },
    value => { value.retry.automaticRetries = 1; },
    value => { value.retry.timeoutMs = 600000; }
  ]) {
    const changed = retried(); mutate(changed);
    assert.throws(() => validateBackendTestingTaste(changed), /taste|retry/);
  }
});

test('dimension publication rejects invented totals, missing ratings, and unsafe findings', () => {
  for (const mutate of [
    value => { value.rows[0].judgments[0].score = 0.4; },
    value => { value.rows[0].judgments[0].dimensions.pop(); },
    value => { value.rows[0].judgments[0].dimensions[0].id = 'semantic_naming'; },
    value => { value.rows[0].judgments[0].dimensions[0].score = 0.201; },
    value => { value.rows[0].judgments[0].dimensions[0].reason = 'Read the source at /Users/private/suite.js'; },
    value => { value.rows[0].judgments[0].dimensions[0].reason = 'A'.repeat(321); },
    value => { value.rows[0].judgments[0].dimensions[0].evidence[0].file = 'final/private/suite.js'; },
    value => { value.rows[0].judgments[0].files[0].score = 0.99; },
    value => { value.rows[0].dimensions[0].score += 0.01; },
    value => { value.summaries[0].dimensions[0].delta += 0.01; },
    value => { value.dimensionSummaries[0].baseline += 0.01; },
    value => { value.scoreBasis.dimensions[0].weight = 24; },
    value => { value.rows[0].judgments[0].reason = 'An invented old holistic score explanation.'; }
  ]) {
    const value = structuredClone(fixture()); mutate(value);
    assert.throws(() => validateBackendTestingTaste(value), /taste|weighted/);
  }
});

test('missing dimension reviews retain all outcomes and withhold paired profiles', () => {
  const value = fixture();
  for (const row of value.rows) {
    Object.assign(row.judgments[1], { status: 'incomplete', failure: 'timeout', score: null, dimensions: ids.map(id => ({ id, score: null, reason: null, evidence: [] })), files: [] });
    Object.assign(row, { status: 'incomplete', score: null, range: { minimum: null, maximum: null }, dimensions: ids.map(id => ({ id, score: null, range: { minimum: null, maximum: null } })) });
  }
  for (const summary of value.summaries) {
    summary.baseline = summary.treatment = summary.delta = null;
    summary.dimensions.forEach(dimension => { dimension.baseline = dimension.treatment = dimension.delta = null; });
  }
  value.dimensionSummaries.forEach(dimension => { dimension.baseline = dimension.treatment = dimension.delta = null; });
  Object.assign(value, { status: 'incomplete', baselineMean: null, treatmentMean: null, meanPairedDifference: null, usageMissingSessions: 1 });
  validateBackendTestingTaste(value);
  assert.equal(value.rows.length, 8);
  assert.equal(value.rows[0].judgments[1].failure, 'timeout');
  value.rows[0].judgments[1].failure = 'invented';
  assert.throws(() => validateBackendTestingTaste(value), /incomplete taste review/);
  value.rows[0].judgments[1].failure = 'timeout';
  value.dimensionSummaries[0].delta = 0;
  assert.throws(() => validateBackendTestingTaste(value), /dimension profiles/);
});
