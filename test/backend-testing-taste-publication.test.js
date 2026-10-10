import assert from 'node:assert/strict';
import test from 'node:test';
import { BACKEND_TESTING_CONFIGURATIONS, validateBackendTestingTaste } from '../cli/eval/backend-testing-publication.js';

function fixture() {
  const evidence = [{ file: 'save-and-load__journey.spec.js', version: 'final', startLine: 10, endLine: 20 }];
  const rows = BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => ['none', 'repaired'].map(condition => ({ id: `${configuration.id}:${condition}`, configurationId: configuration.id, label: configuration.label, condition, status: 'scored', score: condition === 'none' ? 0.5 : 0.8, range: { minimum: condition === 'none' ? 0.4 : 0.7, maximum: condition === 'none' ? 0.6 : 0.9 },
    judgments: ['codex:gpt-6-astra@xhigh', 'claude:claude-opus-5-5@xhigh'].map((judgeConfigurationId, index) => ({ judgeConfigurationId, reviewSha256: 'b'.repeat(64), status: 'complete', score: condition === 'none' ? index ? 0.6 : 0.4 : index ? 0.9 : 0.7, reason: 'The retained suite has direct behavioral assertions.', strengths: [{ finding: 'Checks observe persisted state through the public reader.', evidence }], weaknesses: [], files: [{ file: 'save-and-load__journey.spec.js', score: 0.99, reason: 'This file checks exact persisted bytes and revisions.', evidence }] })) })));
  return { kind: 'backend-testing-taste-review', schemaVersion: 1, date: '2026-10-09', caseId: 'player-saves', scope: 'exploratory-post-hoc-review', sourceSha256: 'a'.repeat(64), status: 'complete', nativeSessions: 2, knownTokens: 1000, usageMissingSessions: 0,
    scoreBasis: { minimum: 0, maximum: 1, decimals: 2, aggregation: 'Mean of two independent holistic suite scores; equal-weight mean across four matched differences. Retain each judge and each file score. No forced spread or protection caps; existing technical checks remain separate.', anchors: [
      { score: 0, meaning: 'No useful maintained behavioral protection; the suite cannot serve its stated purpose.' },
      { score: 0.25, meaning: 'Serious proof and design defects; substantial rewrite needed.' },
      { score: 0.5, meaning: 'Useful protection, but material assertion, coverage, readability or maintenance defects need work.' },
      { score: 0.75, meaning: 'Sound, maintainable scoped tests with noticeable targeted improvements still justified.' },
      { score: 0.9, meaning: 'Excellent behavioral proof and craftsmanship; remaining improvements are minor and specific.' },
      { score: 1, meaning: 'Exemplary for this bounded scope; no consequential proof or maintenance improvement identified from the supplied evidence.' }
    ] }, rows, summaries: BACKEND_TESTING_CONFIGURATIONS.map(configuration => ({ configurationId: configuration.id, baseline: 0.5, treatment: 0.8, delta: 0.8 - 0.5 })), baselineMean: 0.5, treatmentMean: 0.8, meanPairedDifference: 0.8 - 0.5 };
}

test('holistic suite scores retain reviewer spread and do not average the separate file scores', () => {
  const value = fixture(); validateBackendTestingTaste(value);
  assert.equal(value.rows[0].score, 0.5);
  assert.deepEqual(value.rows[0].range, { minimum: 0.4, maximum: 0.6 });
  value.rows.forEach(row => row.judgments.forEach(judge => { judge.files[0].score = 0.01; }));
  validateBackendTestingTaste(value);
  assert.equal(value.baselineMean, 0.5);
  assert.equal(value.treatmentMean, 0.8);
  value.rows[0].score = 0.01;
  assert.throws(() => validateBackendTestingTaste(value), /original panel/);
});

test('taste publication rejects private source, unsupported precision, and fabricated ranges', () => {
  for (const mutate of [
    value => { value.rows[0].judgments[0].reason = 'Read the file at /Users/private/source.js'; },
    value => { value.rows[0].judgments[0].strengths[0].evidence[0].file = 'final/private/source.js'; },
    value => { value.rows[0].judgments[0].files[0].file = 'private/helper.js'; },
    value => { value.rows[0].judgments[0].score = 0.401; },
    value => { value.rows[0].range.minimum = 0.5; },
    value => { value.meanPairedDifference = 0.4; },
    value => { value.rows.pop(); }
  ]) {
    const value = fixture(); mutate(value);
    assert.throws(() => validateBackendTestingTaste(value), /taste|original panel/);
  }
});

test('an incomplete taste review keeps every paired outcome and withholds the overall difference', () => {
  const value = fixture();
  for (const row of value.rows) {
    Object.assign(row.judgments[1], { status: 'incomplete', score: null, reason: null, strengths: [], weaknesses: [], files: [] });
    Object.assign(row, { status: 'incomplete', score: null, range: { minimum: null, maximum: null } });
  }
  value.summaries.forEach(row => { row.baseline = row.treatment = row.delta = null; });
  Object.assign(value, { status: 'incomplete', baselineMean: null, treatmentMean: null, meanPairedDifference: null, usageMissingSessions: 1 });
  validateBackendTestingTaste(value);
  assert.equal(value.rows.length, 8);
  value.meanPairedDifference = 0;
  assert.throws(() => validateBackendTestingTaste(value), /taste aggregate/);
});
