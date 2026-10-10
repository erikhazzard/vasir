import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { BACKEND_TESTING_CONFIGURATIONS, validateBackendTestingPublication, deriveBackendTestingOverall, validateBackendTestingFiles } from '../cli/eval/backend-testing-publication.js';

function current() {
  return { kind: 'vasirbenchmark-backend-testing', schemaVersion: 3, benchmark: { id: 'backend-testing', title: 'Backend test-suite quality', description: 'Four model settings maintain the same existing test suite with minimal instructions or the current testing skill.' }, sourceSha256: 'a'.repeat(64), date: '2026-10-09', caseId: 'player-saves', scope: 'one-known-case-development', configurations: BACKEND_TESTING_CONFIGURATIONS.map(item => ({ ...item })), conditions: [{ id: 'none', label: 'Minimal' }, { id: 'repaired', label: 'Current skill' }], trials: 1,
    technical: { status: 'complete', baseline: 49, treatment: 95, delta: 46, scoreMaximum: 100, successCriterionMet: true }, taste: null, nativeSessions: 10, knownTokens: 757348, usageMissingSessions: 0 };
}

test('current publication is compact and rejects historical payloads or labels', () => {
  const value = current(); validateBackendTestingPublication(value);
  assert.ok(Buffer.byteLength(JSON.stringify(value)) < 1600);
  for (const field of ['suiteQuality', 'faultDetectionPilot', 'repairCheck']) {
    const changed = current(); changed[field] = { privateArchive: true };
    assert.throws(() => validateBackendTestingPublication(changed), /unexpected current publication fields/);
  }
  const stale = current(); stale.conditions[1].label = 'Earlier skill';
  assert.throws(() => validateBackendTestingPublication(stale), /current publication identity/);
});

test('technical score stays separate from the uncapped taste scale', () => {
  const value = current(); value.taste = { status: 'complete', baseline: 0.5, treatment: 0.8, delta: 0.8 - 0.5, scoreMaximum: 1 }; value.nativeSessions = 12;
  validateBackendTestingPublication(value);
  value.taste.scoreMaximum = 100;
  assert.throws(() => validateBackendTestingPublication(value), /invalid current score/);
});

test('current resource disclosure counts the requested third review attempt', () => {
  const value = current(); value.taste = { status: 'complete', baseline: 0.5, treatment: 0.8, delta: 0.8 - 0.5, scoreMaximum: 1 }; value.nativeSessions = 13; value.usageMissingSessions = 1;
  validateBackendTestingPublication(value);
  assert.equal(value.technical.baseline, 49);
  assert.equal(value.usageMissingSessions, 1);
  value.nativeSessions = 14;
  assert.throws(() => validateBackendTestingPublication(value), /current publication resources/);
});

function savedReviews({ scores = [0.9, 0.3], protections = ['lost', 'retained'] } = {}) {
  const judges = ['codex:gpt-6-astra@xhigh', 'claude:claude-opus-5-5@xhigh'];
  const identities = BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => ['none', 'repaired'].map(condition => ({ id: `${configuration.id}:${condition}`, configurationId: configuration.id, condition })));
  return {
    pairedRepair: { caseId: 'player-saves', sourceSha256: 'a'.repeat(64), rows: identities.map(row => ({ ...row, protection: protections.includes('lost') ? 'lost' : 'retained', judgments: judges.map((judgeConfigurationId, index) => ({ judgeConfigurationId, status: 'complete', reviewSha256: 'b'.repeat(64), coverage: 'yes', protection: protections[index] })) })) },
    taste: { schemaVersion: 2, caseId: 'player-saves', sourceSha256: 'c'.repeat(64), rows: identities.map(row => ({ ...row, judgments: judges.map((judgeConfigurationId, index) => ({ judgeConfigurationId, status: 'complete', reviewSha256: 'd'.repeat(64), score: scores[index] })) })) }
  };
}

test('overall score caps the matching reviewer before averaging, without promoting weak work', () => {
  const sources = savedReviews(), before = structuredClone(sources);
  sources.pairedRepair.rows.reverse();
  sources.pairedRepair.rows.forEach(row => row.judgments.reverse());
  const overall = deriveBackendTestingOverall(sources);
  assert.equal(overall.rows[0].score, 39.5); // mean(49, 30), neither cap(mean(90,30)) nor the uncapped mean.
  assert.equal(overall.rows[0].judgments[0].qualityReviewSha256, 'd'.repeat(64));
  assert.equal(overall.rows[0].judgments[0].protectionReviewSha256, 'b'.repeat(64));
  assert.equal(overall.scoreBasis.adoption, 'user-requested-after-reviews');
  assert.equal(deriveBackendTestingOverall(savedReviews({ scores: [0.4, 0.3], protections: ['lost', 'lost'] })).rows[0].score, 35);
  assert.equal(deriveBackendTestingOverall(savedReviews({ protections: ['retained', 'retained'] })).rows[0].score, 60);
  assert.deepEqual(sources.taste, before.taste);
});

test('missing or unresolved review withholds the whole comparison; explicit no coverage scores zero', () => {
  const sources = savedReviews();
  sources.taste.rows[0].judgments[0].status = 'incomplete';
  let overall = deriveBackendTestingOverall(sources);
  assert.equal(overall.rows[0].score, null);
  assert.equal(overall.summaries[0].delta, null);
  assert.equal(overall.meanPairedDifference, null);
  sources.taste.rows[0].judgments[0].status = 'complete';
  sources.pairedRepair.rows[0].judgments[0].status = 'unresolved';
  assert.equal(deriveBackendTestingOverall(sources).rows[0].score, null);
  for (const row of sources.pairedRepair.rows) {
    row.protection = 'unresolved';
    for (const judge of row.judgments) Object.assign(judge, { status: 'complete', coverage: 'no', protection: 'unresolved' });
  }
  sources.taste.rows[0].judgments[0].status = 'incomplete';
  overall = deriveBackendTestingOverall(sources);
  assert.equal(overall.rows[0].score, 0);
  assert.equal(overall.baselineMean, 0);
});

test('overall publication rejects changed caps, hidden loss and forged derived scores', () => {
  const sources = savedReviews();
  const publication = current();
  Object.assign(publication, { taste: { status: 'complete', baseline: 0.6, treatment: 0.6, delta: 0, scoreMaximum: 1 }, nativeSessions: 12, overall: deriveBackendTestingOverall(sources) });
  validateBackendTestingPublication(publication);
  for (const change of [
    overall => { overall.rows[0].judgments[0].maximum = 100; },
    overall => { overall.rows[0].judgments[0].score = 90; },
    overall => { overall.rows[0].score = 49; },
    overall => { overall.rows[0].protection = 'retained'; },
    overall => { overall.meanPairedDifference = 1; },
    overall => { overall.scoreBasis.adoption = 'predeclared'; },
    overall => { overall.rows[0].judgments[0].qualityReviewSha256 = null; },
    overall => { overall.rows[0].judgments[0].protectionReviewSha256 = null; }
  ]) {
    const changed = structuredClone(publication); change(changed.overall);
    assert.throws(() => validateBackendTestingPublication(changed), /overall/);
  }
  sources.pairedRepair.rows[0].condition = 'repaired';
  assert.throws(() => deriveBackendTestingOverall(sources), /artifact identity/);
});

test('published test files preserve exact JavaScript bytes and artifact identity', () => {
  const { pairedRepair } = savedReviews(), content = "it('loads existing saves', async () => {\n  assert.equal(save.revision, 7);\n});\n";
  const files = { kind: 'backend-testing-files', schemaVersion: 1, sourceSha256: 'e'.repeat(64), rows: pairedRepair.rows.map(row => ({ id: row.id, configurationId: row.configurationId, condition: row.condition, files: [{ path: 'test/player-saves/read.spec.js', content, sha256: crypto.createHash('sha256').update(content).digest('hex') }] })) };
  validateBackendTestingFiles(files, pairedRepair);
  for (const change of [
    archive => { archive.rows[0].files[0].content += '// changed'; },
    archive => { archive.rows[0].files[0].path = 'src/production.js'; },
    archive => { archive.rows[0].files[0].path = 'test/../../private.spec.js'; },
    archive => { archive.rows[0].condition = 'repaired'; },
    archive => { archive.rows.pop(); }
  ]) {
    const changed = structuredClone(files); change(changed);
    assert.throws(() => validateBackendTestingFiles(changed, pairedRepair), /test file|test files/);
  }
});
