import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { BACKEND_TESTING_CONFIGURATIONS } from '../cli/eval/backend-testing-publication.js';
import { deriveBackendTestingCompactOverall, projectBackendTestingCompact, validateBackendTestingCompactRound, validateBackendTestingCompactPublication, validateBackendTestingCompactFiles } from '../cli/eval/backend-testing-compact-publication.js';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const rubric = JSON.parse(fs.readFileSync(new URL('../benchmarks/backend-testing/taste-rubric.json', import.meta.url)));
const judges = ['codex:gpt-6-astra@xhigh', 'claude:claude-opus-5-5@xhigh'];
const mean = readings => readings.every(Number.isFinite) ? readings.reduce((sum, score) => sum + score, 0) / readings.length : null;
const citation = version => ({ file: 'player-saves.spec.js', version, startLine: 1, endLine: 2 });
function fixture() {
  const rows = BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => ['none', 'repaired'].map(condition => {
    const judgments = judges.map(judgeConfigurationId => ({ judgeConfigurationId, reviewSha256: hash(judgeConfigurationId), status: 'complete', score: 0.9,
      dimensions: rubric.dimensions.map(({ id }) => ({ id, score: 0.9, reason: 'The supplied test checks its stated behavior.', evidence: [citation('final')] })),
      protection: { status: condition === 'none' ? 'lost' : 'retained', reason: 'The cited code establishes this coverage finding.', evidence: [citation(condition === 'none' ? 'original' : 'final')] },
      coverage: { status: 'yes', reason: 'The supplied behavioral assertions completed successfully.', evidence: [citation('final')] } }));
    return { id: `${configuration.id}:${condition}`, configurationId: configuration.id, label: configuration.label, condition, origin: condition === 'none' ? 'reused-baseline' : 'current-round', generationStatus: 'complete', executionStatus: 'valid', testStatus: 'pass', cleanupStatus: 'failed', elapsedMs: 1000, verificationMs: 10, inputTokens: 100, outputTokens: 20, status: 'scored', score: 0.9, range: { minimum: 0.9, maximum: 0.9 }, protection: condition === 'none' ? 'lost' : 'retained', dimensions: rubric.dimensions.map(({ id }) => ({ id, score: 0.9, range: { minimum: 0.9, maximum: 0.9 } })), judgments };
  }));
  const dimensions = rubric.dimensions.map(({ id }) => ({ id, baseline: 0.9, treatment: 0.9, delta: 0 }));
  return { kind: 'backend-testing-current-round', schemaVersion: 1, date: '2026-10-10', caseId: 'player-saves', sourceSha256: hash('sources'), skillSha256: hash('skill'), sourceCodeSha256: hash('source'), status: 'complete',
    scoreBasis: { minimum: 0, maximum: 1, decimals: 2, aggregation: rubric.aggregation, dimensions: rubric.dimensions, namingZeroRule: rubric.namingZeroRule },
    provenance: { freshAuthorSessions: 4, reusedBaselineArtifacts: 4, reviewerSessions: 2, authorTimeoutMs: 600000, reviewTimeoutMs: 600000, nativeSessions: 6, knownTokens: 720, usageMissingSessions: 0, baselineSourceSha256: hash('source'), baselinePromptSha256: hash('neutral prompt'), verifierSha256: hash('verifier') },
    rows, summaries: BACKEND_TESTING_CONFIGURATIONS.map(configuration => ({ configurationId: configuration.id, baseline: 0.9, treatment: 0.9, delta: 0, dimensions: structuredClone(dimensions) })), dimensionSummaries: dimensions, baselineMean: 0.9, treatmentMean: 0.9, meanPairedDifference: 0 };
}

test('compact suites retain native seven-dimension evidence without inventing file ratings', () => {
  const round = validateBackendTestingCompactRound(fixture());
  const publication = projectBackendTestingCompact(round);
  validateBackendTestingCompactPublication(publication, round);
  assert.equal(publication.schemaVersion, 4);
  assert.equal(publication.overall.baselineMean, 68);
  assert.equal(publication.overall.treatmentMean, 93);
  assert.equal(publication.nativeSessions, 6);
  assert.equal(publication.provenance.reusedBaselineArtifacts, 4);
  assert.equal(publication.overall.scoreBasis.adoption, 'user-requested-after-reviews');
  assert.equal(publication.overall.scoreBasis.criteria.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
  assert.equal('protectionLossMaximum' in publication.overall.scoreBasis, false);
  for (const row of round.rows) for (const judgment of row.judgments) assert.equal('files' in judgment, false);
  round.rows[0].judgments[0].files = [];
  assert.throws(() => validateBackendTestingCompactRound(round), /reviewer keys differ/);
});

test('lost protection costs 25 points without flattening different-quality suites', () => {
  const round = fixture(), row = round.rows[0];
  for (const dimension of row.judgments[0].dimensions) dimension.score = 0.4;
  const result = deriveBackendTestingCompactOverall(round).rows[0];
  assert.equal(result.judgments[0].score, 33);
  assert.equal(result.judgments[1].score, 68);
  assert.equal(result.score, 50.5);
  for (const judge of row.judgments) judge.protection.status = 'retained';
  assert.equal(deriveBackendTestingCompactOverall(round).rows[0].score, 75.5);
});

test('naming and runnable findings affect only their weighted contributions', () => {
  const round = fixture(), row = round.rows[1];
  for (const judgment of row.judgments) judgment.dimensions.find(dimension => dimension.id === 'semantic_naming').score = 0;
  assert.equal(deriveBackendTestingCompactOverall(round).rows[1].score, 84);
  for (const judgment of row.judgments) judgment.coverage.status = 'no';
  assert.equal(deriveBackendTestingCompactOverall(round).rows[1].score, 79);
  row.judgments[0].coverage.evidence = [];
  assert.equal(deriveBackendTestingCompactOverall(round).rows[1].score, null);
});

test('zero and perfect findings reach the score endpoints without overrides', () => {
  for (const score of [0, 1]) {
    const round = fixture();
    for (const row of round.rows) for (const judge of row.judgments) {
      for (const dimension of judge.dimensions) dimension.score = score;
      judge.protection.status = score ? 'retained' : 'lost';
      judge.coverage.status = score ? 'yes' : 'no';
    }
    assert.ok(deriveBackendTestingCompactOverall(round).rows.every(row => row.score === score * 100));
  }
});

test('missing dimension or protection evidence leaves the official comparison unscored', () => {
  for (const field of ['dimension', 'protection', 'coverage']) {
    const round = fixture(), judgment = round.rows[1].judgments[0];
    if (field === 'dimension') judgment.dimensions[0].evidence = [];
    else judgment[field].evidence = [];
    const overall = deriveBackendTestingCompactOverall(round);
    assert.equal(overall.rows[1].score, null);
    assert.equal(overall.summaries[0].delta, null);
    assert.equal(overall.meanPairedDifference, null);
    assert.equal(overall.status, 'incomplete');
  }
});

test('source reuse and two exact reviewer seats cannot be silently substituted', () => {
  const changedSource = fixture(); changedSource.provenance.baselineSourceSha256 = hash('different source');
  assert.throws(() => validateBackendTestingCompactRound(changedSource), /baseline source differs/);
  const changedReviewer = fixture(); changedReviewer.rows[0].judgments[0].judgeConfigurationId = 'codex:gpt-6-astra@ultra';
  assert.throws(() => validateBackendTestingCompactRound(changedReviewer), /reviewer identities differ/);
  const inventedUsage = fixture(); inventedUsage.provenance.nativeSessions = 10;
  assert.throws(() => validateBackendTestingCompactRound(inventedUsage), /provenance/);
});

test('native rating precision and deterministic final arithmetic are validated', () => {
  const round = fixture(); round.rows[0].judgments[0].dimensions[0].score = 0.901;
  assert.throws(() => validateBackendTestingCompactRound(round), /native dimension rating/);
  const publication = projectBackendTestingCompact(fixture()); publication.overall.rows[0].score = 50;
  assert.throws(() => validateBackendTestingCompactPublication(publication), /panel score differs/);
  const alteredWeight = projectBackendTestingCompact(fixture()); alteredWeight.overall.rows[0].judgments[0].contributions[0].weight = 30;
  assert.throws(() => validateBackendTestingCompactPublication(alteredWeight), /weighted contribution/);
  const alteredFinding = projectBackendTestingCompact(fixture()); alteredFinding.overall.rows[0].judgments[0].contributions[0].score = 1;
  assert.throws(() => validateBackendTestingCompactPublication(alteredFinding), /weighted finding/);
});

test('test-file archive preserves exact UTF-8 source and rejects path traversal', () => {
  const round = fixture(), content = 'it("loads saved state", () => {});\r\n';
  const files = { kind: 'backend-testing-files', schemaVersion: 1, sourceSha256: hash('packet'), rows: round.rows.map(row => ({ id: row.id, configurationId: row.configurationId, condition: row.condition, files: [{ path: 'test/domains/player-saves.spec.js', sha256: hash(content), content }] })) };
  assert.equal(validateBackendTestingCompactFiles(files, round).rows[0].files[0].content, content);
  files.rows[0].files[0].content += ' ';
  assert.throws(() => validateBackendTestingCompactFiles(files, round), /source bytes/);
  files.rows[0].files[0] = { path: 'test/../private.spec.js', content, sha256: hash(content) };
  assert.throws(() => validateBackendTestingCompactFiles(files, round), /path differ/);
});
