import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { BACKEND_TESTING_CONFIGURATIONS, projectBackendTestingSuiteQuality, validateBackendTestingSuiteQuality } from '../cli/eval/backend-testing-publication.js';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const cases = ['player-saves', 'purchases', 'dev-current'];
function fixture() {
  const rubric = JSON.parse(fs.readFileSync(new URL('../benchmarks/backend-testing/rubric.json', import.meta.url)));
  const rubricSha256 = hash(JSON.stringify(rubric));
  const generation = { schemaVersion: 2, benchmark: 'backend-testing-suite-quality', runId: 'quality-fixture',
    policy: { configurations: BACKEND_TESTING_CONFIGURATIONS.map(item => item.id), conditions: ['none', 'revised'], trials: 2, cases: 3, concurrency: 8, wallTimeLimitMs: 1800000, maxStreamBytes: 67108864, automaticRetries: 0, delegateTools: false },
    basis: { rubricSha256, verifierSha256: hash('evaluator'), cases: cases.map(id => ({ id, sourceHash: hash(id), calibrationSha256: hash(`calibrated-${id}`) })), conditions: [{ id: 'none', skillSha256: null }, { id: 'revised', skillSha256: hash('skill') }] },
    rows: BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => cases.flatMap(caseId => ['none', 'revised'].flatMap(condition => [1, 2].map(trial => ({
      rowId: `${configuration.id}-${caseId}-${condition}-${trial}`, caseId, configuration, condition, trial, status: 'complete', qualityEligibility: { status: 'eligible', reason: 'complete' }, elapsedMs: 1000, usage: { input_tokens: 200, output_tokens: 40 },
      submission: { files: [{ path: 'private-suite/main.spec.js', sha256: hash('private code'), bytes: 20 }], forbiddenChanges: [], addedFiles: [], modifiedFiles: ['private-suite/main.spec.js'], deletedFiles: ['private-suite/redundant.spec.js'], addedLines: 3, deletedLines: 20 },
      prompt: 'PRIVATE prompt', outputText: 'PRIVATE answer', sessionId: 'SECRET'
    }))))) };
  const evaluation = { schemaVersion: 2, benchmark: generation.benchmark, runId: generation.runId, basis: { cases: generation.basis.cases, rubricSha256, runSha256: hash(JSON.stringify(generation)), evaluatorSha256: hash('evaluator') }, rows: generation.rows.map(row => ({ rowId: row.rowId, caseId: row.caseId, evaluatorSha256: hash('evaluator'), status: 'valid', testStatus: 'pass', cleanupStatus: 'pass', privateLog: '/Users/private/evidence' })) };
  const judging = { kind: 'backend-testing-quality-judging', schemaVersion: 2, runId: generation.runId,
    basis: { generationSha256: evaluation.basis.runSha256, evaluationSha256: hash(JSON.stringify(evaluation)), rubricSha256, verifierSha256: hash('evaluator') },
    candidates: generation.rows.map(row => {
      const rating = row.condition === 'none' ? 2 : 3, artifactSha256 = hash(row.rowId);
      return { id: row.rowId, rowId: row.rowId, caseId: row.caseId, caseBasisSha256: hash(`case-${row.caseId}`), artifactSha256,
        sourceHash: hash(row.caseId), submissionFilesSha256: hash(`${JSON.stringify(row.submission.files.map(({ path, sha256 }) => ({ path, sha256 })), null, 2)}\n`), eligibility: row.qualityEligibility, status: 'complete', score: rating * 25, scoreSource: 'judge-panel',
        judges: rubric.judges.map(judgeId => ({ judgeId, candidateId: row.rowId, artifactSha256, resultSha256: hash(`${judgeId}-${row.rowId}`), status: 'complete', score: rating * 25, uncappedScore: rating * 25, diagnosticScore: rating * 25, caps: [], inputHashes: { rubric: rubricSha256, verifier: hash('evaluator') },
          evaluation: { dimensions: rubric.dimensions.map(dimension => ({ id: dimension.id, rating, reason: 'PRIVATE quoted code', evidence: [{ path: '/Users/private/source.js' }] })), guarantees: [{ id: 'secret-guarantee', status: 'retained' }], coverage: { meaningfulRunnableCoverage: 'yes', materialPreexistingProtection: 'retained' }, cruft: { remaining: [], introduced: [] }, summary: 'PRIVATE prose' } })) };
    }) };
  const selection = Object.fromEntries([['generation', generation], ['evaluation', evaluation], ['judging', judging], ['rubric', rubric]].map(([id, value]) => [id, { path: `.agents/vasir-evals/backend-testing/quality-fixture/${id}.json`, sha256: hash(JSON.stringify(value)) }]));
  return { generation, evaluation, judging, rubric, selection };
}

test('suite quality averages the fixed paired matrix and publishes no private assessment prose', () => {
  const { projection, assessments } = projectBackendTestingSuiteQuality(fixture());
  assert.equal(projection.rows.length, 48); assert.equal(assessments.rows.flatMap(row => row.judgments).length, 96);
  assert.equal(projection.status, 'complete');
  assert.deepEqual(projection.summaries[0], { configurationId: BACKEND_TESTING_CONFIGURATIONS[0].id, baseline: 50, treatment: 75, delta: 25, scored: 12, planned: 12 });
  assert.equal(projection.rows[0].deletedLines, 20); assert.equal(projection.rows[0].deletedFiles, 1);
  assert.doesNotMatch(JSON.stringify({ projection, assessments }), /PRIVATE|SECRET|\/Users\/|private-suite|secret-guarantee|sessionId|inputHashes|"evidence":/);
});

test('protection caps apply independently before the two-judge mean', () => {
  const input = fixture(), candidate = input.judging.candidates[0], judge = candidate.judges[0];
  judge.evaluation.guarantees[0].status = 'lost';
  judge.evaluation.coverage.materialPreexistingProtection = 'lost';
  judge.caps = [{ rule: 'lost-material-preexisting-protection', maximum: 49, guarantees: ['secret-guarantee'], scope: 'whole-original-suite' }];
  judge.score = judge.diagnosticScore = 49; candidate.score = 49.5;
  const result = projectBackendTestingSuiteQuality(input);
  assert.equal(result.projection.rows[0].score, 49.5);
  assert.equal(result.assessments.rows[0].judgments[0].protection, 'lost');
  assert.deepEqual(result.assessments.rows[0].judgments[0].caps, [{ rule: 'lost-material-preexisting-protection', maximum: 49, scope: 'whole-original-suite' }]);
  assert.equal(result.projection.rows[0].dimensionScores.reduce((sum, item) => sum + item.points, 0), 50);
});

test('loss outside the named inventory preserves the aggregate protection flag and independently applies its cap', () => {
  const input = fixture(), candidate = input.judging.candidates[0], judge = candidate.judges[0];
  judge.evaluation.coverage.materialPreexistingProtection = 'lost';
  judge.evaluation.coverage.distinctLost = [{ finding: 'PRIVATE original protection outside named inventory', evidence: [{ path: 'original/private.spec.js' }] }];
  judge.caps = [{ rule: 'lost-material-preexisting-protection', maximum: 49, guarantees: [], scope: 'whole-original-suite' }];
  judge.score = judge.diagnosticScore = 49; candidate.score = 49.5;
  const { projection, assessments } = projectBackendTestingSuiteQuality(input);
  assert.equal(projection.rows[0].score, 49.5); assert.equal(assessments.rows[0].judgments[0].protection, 'lost');
  assert.deepEqual(assessments.rows[0].judgments[0].caps, [{ rule: 'lost-material-preexisting-protection', maximum: 49, scope: 'whole-original-suite' }]);
  assert.doesNotMatch(JSON.stringify(assessments), /PRIVATE original protection|original\/private/);
  judge.evaluation.coverage.distinctLost[0].evidence = [{ path: 'final/private.spec.js' }];
  assert.throws(() => projectBackendTestingSuiteQuality(input), /original\/diff-backed distinct loss/);
  judge.evaluation.coverage.distinctLost[0].evidence = [{ path: 'changes.patch' }];
  assert.doesNotThrow(() => projectBackendTestingSuiteQuality(input));
  judge.caps = []; judge.score = judge.diagnosticScore = 50; candidate.score = 50;
  assert.throws(() => projectBackendTestingSuiteQuality(input), /loss.*cap|protection cap/);
});

test('a named material loss keeps its diagnostic cap while whole-original protection remains unresolved', () => {
  const input = fixture(), candidate = input.judging.candidates[0], judge = candidate.judges[0];
  judge.evaluation.guarantees[0].status = 'lost'; judge.evaluation.coverage.materialPreexistingProtection = 'unresolved';
  judge.caps = [{ rule: 'lost-material-preexisting-protection', maximum: 49, guarantees: ['secret-guarantee'], scope: 'whole-original-suite' }];
  judge.status = 'unresolved'; judge.score = null; judge.diagnosticScore = 49; candidate.status = 'incomplete'; candidate.score = null;
  const { projection, assessments } = projectBackendTestingSuiteQuality(input);
  assert.equal(projection.rows[0].score, null); assert.equal(assessments.rows[0].judgments[0].protection, 'unresolved');
  assert.equal(assessments.rows[0].judgments[0].diagnosticScore, 49);
  judge.caps[0].guarantees = ['unknown-private-guard'];
  assert.throws(() => projectBackendTestingSuiteQuality(input), /without an observed loss/);
});

test('unresolved aggregate protection withholds official points even when named guards are retained', () => {
  const input = fixture(), candidate = input.judging.candidates[0], judge = candidate.judges[0];
  judge.evaluation.coverage.materialPreexistingProtection = 'unresolved'; judge.status = 'unresolved'; judge.score = null;
  candidate.status = 'incomplete'; candidate.score = null;
  const { projection, assessments } = projectBackendTestingSuiteQuality(input);
  assert.equal(projection.rows[0].score, null); assert.equal(assessments.rows[0].judgments[0].protection, 'unresolved');
  assert.equal(assessments.rows[0].judgments[0].diagnosticScore, 50);
  judge.status = 'complete'; judge.score = 50; candidate.status = 'complete'; candidate.score = 50;
  assert.throws(() => projectBackendTestingSuiteQuality(input), /unresolved evidence/i);
});

test('missing review stays unscored while an observed lack of meaningful protection earns the declared zero', () => {
  const input = fixture(), pending = input.judging.candidates[0], empty = input.judging.candidates[1];
  pending.judges.pop(); pending.status = 'incomplete'; pending.score = null;
  for (const judge of empty.judges) { judge.evaluation.coverage.meaningfulRunnableCoverage = 'no'; judge.caps = [{ rule: 'zero-meaningful-runnable-coverage', maximum: 0 }]; judge.score = judge.diagnosticScore = 0; }
  empty.score = 0;
  const result = projectBackendTestingSuiteQuality(input);
  assert.equal(result.projection.rows[0].score, null); assert.equal(result.projection.rows[1].score, 0);
  assert.equal(result.projection.summaries[0].baseline, null); assert.equal(result.projection.summaries[0].delta, null);
  assert.equal(result.projection.conditionSummaries[0].planned, 24); assert.equal(result.projection.conditionSummaries[0].score, null);
  assert.equal(result.assessments.rows[0].judgments[1].status, 'pending');
});

test('forbidden changes are explicit policy zeros without fabricated judge ratings', () => {
  const input = fixture(), row = input.generation.rows[0];
  row.status = 'invalid-submission'; row.qualityEligibility = { status: 'task-invalid', reason: 'forbidden-changes' }; row.submission.forbiddenChanges.push('src/private-production.js');
  Object.assign(input.judging.candidates[0], { artifactSha256: null, eligibility: row.qualityEligibility, status: 'task-invalid', score: 0, scoreSource: 'task-policy', judges: [] });
  const { projection, assessments } = projectBackendTestingSuiteQuality(input);
  assert.equal(projection.rows[0].score, 0); assert.equal(projection.rows[0].scoreSource, 'task-policy');
  assert.equal(projection.summaries[0].scored, 12); assert.equal(projection.summaries[0].baseline, 250 / 6);
  assert.ok(projection.rows[0].dimensionScores.every(item => item.rating === null));
  assert.deepEqual(assessments.rows[0].judgments, []);
});

test('authored budgets and shared cleanup do not erase the retained suite while provider interruptions stay unresolved', () => {
  for (const authored of [{ status: 'timeout', reason: 'authored-wall-limit' }, { status: 'failed', reason: 'authored-output-limit' }, { status: 'failed', reason: 'missing-final-response' }, { status: 'failed', reason: 'authored-native-budget' }]) {
    const input = fixture();
    input.generation.rows[0].status = authored.status; input.generation.rows[0].qualityEligibility.reason = authored.reason; input.evaluation.rows[0].cleanupStatus = 'failed';
    const blocked = input.generation.rows[1]; blocked.status = 'failed'; blocked.qualityEligibility = { status: 'unresolved', reason: 'provider-usage-limit' };
    Object.assign(input.judging.candidates[1], { artifactSha256: null, eligibility: blocked.qualityEligibility, status: 'unresolved', score: null, scoreSource: 'unresolved', judges: [] });
    const { projection, assessments } = projectBackendTestingSuiteQuality(input);
    assert.equal(projection.rows[0].score, 50); assert.equal(projection.rows[0].generationStatus, authored.status); assert.equal(projection.rows[0].cleanupStatus, 'failed');
    assert.equal(projection.rows[1].score, null); assert.equal(projection.rows[1].scoreReason, 'provider-infrastructure');
    assert.deepEqual(assessments.rows[1].judgments, []);
  }
});

test('incomplete review seats leave cruft findings unknown and preserve recorded diagnostic ratings', () => {
  const input = fixture(), candidate = input.judging.candidates[0], judge = candidate.judges[0];
  judge.status = 'unresolved'; judge.score = null; judge.evaluation.coverage.meaningfulRunnableCoverage = 'unresolved';
  judge.evaluation.cruft.remaining.push({ reason: 'PRIVATE explanation' });
  candidate.judges.pop(); candidate.status = 'incomplete'; candidate.score = null;
  const { projection, assessments } = projectBackendTestingSuiteQuality(input);
  assert.equal(projection.rows[0].score, null);
  assert.equal(assessments.rows[0].judgments[0].diagnosticScore, 50);
  assert.equal(assessments.rows[0].judgments[0].remainingCruft, true);
  assert.equal(assessments.rows[0].judgments[1].remainingCruft, null);
  assert.equal(assessments.rows[0].judgments[1].introducedCruft, null);
  assert.doesNotMatch(JSON.stringify(assessments), /PRIVATE explanation/);
});

test('unequal dimension ratings use their declared weights before averaging the panel', () => {
  const input = fixture(), candidate = input.judging.candidates[0];
  candidate.judges[0].evaluation.dimensions.forEach((item, index) => { item.rating = index; });
  candidate.judges[1].evaluation.dimensions.forEach((item, index) => { item.rating = 4 - index; });
  Object.assign(candidate.judges[0], { score: 37.5, uncappedScore: 37.5, diagnosticScore: 37.5 });
  Object.assign(candidate.judges[1], { score: 62.5, uncappedScore: 62.5, diagnosticScore: 62.5 });
  const { projection } = projectBackendTestingSuiteQuality(input);
  assert.equal(projection.rows[0].score, 50);
  assert.deepEqual(projection.rows[0].dimensionScores.map(item => item.points), [15, 12.5, 10, 7.5, 5]);
});

test('changed artifact, judge, rubric or execution identities fail before public arithmetic', () => {
  for (const change of [
    input => { input.judging.basis.generationSha256 = hash('another run'); },
    input => { input.generation.policy.concurrency = 4; },
    input => { input.evaluation.basis.cases = structuredClone(input.evaluation.basis.cases); input.evaluation.basis.cases[0].sourceHash = hash('changed code'); },
    input => { input.judging.candidates[0].submissionFilesSha256 = hash('another suite'); },
    input => { input.judging.candidates[0].judges[0].inputHashes.rubric = hash('another rubric'); },
    input => { input.generation.basis.verifierSha256 = hash('another verifier'); },
    input => { input.judging.basis.verifierSha256 = hash('another verifier'); },
    input => { input.evaluation.rows[0].evaluatorSha256 = hash('another verifier'); },
    input => { input.judging.candidates[0].judges[0].inputHashes.verifier = hash('another verifier'); },
    input => { input.judging.candidates[0].judges[0].score = 100; },
    input => { input.judging.candidates[0].judges[1] = structuredClone(input.judging.candidates[0].judges[0]); },
    input => { input.generation.rows[1] = structuredClone(input.generation.rows[0]); }
  ]) { const input = fixture(); change(input); assert.throws(() => projectBackendTestingSuiteQuality(input)); }
});

test('public validation rejects forged dimensions, policy zero labels, summary totals and private review fields', () => {
  for (const change of [
    result => { result.projection.summaries[0].delta = 99; },
    result => { result.projection.rows[0].dimensionScores[0].points = 30; },
    result => { result.projection.rows[0].scoreSource = 'task-policy'; },
    result => { result.assessments.rows[0].judgments[0].privateReason = 'hidden source'; }
  ]) { const result = projectBackendTestingSuiteQuality(fixture()); change(result); assert.throws(() => validateBackendTestingSuiteQuality(result.projection, result.assessments)); }
});
