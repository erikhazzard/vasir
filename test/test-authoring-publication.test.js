/** Protects additive score arithmetic, provenance and exact source projection through
 * the pure publication API. Native execution and rendered interaction are proved separately. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { BACKEND_TESTING_CONFIGURATIONS } from '../cli/eval/backend-testing-publication.js';
import { TEST_AUTHORING_SCORE_CRITERIA, deriveTestAuthoringOverall, projectTestAuthoring, validateTestAuthoringRound, validateTestAuthoringPublication, validateTestAuthoringFiles, buildTestAuthoringPublication, hasMatchedTestAuthoringFailure } from '../cli/eval/test-authoring-publication.js';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const weights = Object.fromEntries(TEST_AUTHORING_SCORE_CRITERIA.map(item => [item.id, item.weight]));
const judges = ['codex:gpt-6-astra@xhigh', 'claude:claude-opus-5-5@xhigh'];
const evidence = [{ file: 'redis-work-queue__authored.spec.js', version: 'final', startLine: 1, endLine: 1 }];
const scoreBasis = {
  minimum: 0, maximum: 1, decimals: 2, aggregation: 'Frozen before authors.', namingZeroRule: 'Opaque domain-bearing identifiers receive zero naming credit.',
  dimensions: TEST_AUTHORING_SCORE_CRITERIA.filter(item => item.source === 'dimension').map(({ id, label, weight }) => ({ id, label, weight, description: 'Assess the stated behavior.', anchors: { 0: 'Absent.', 0.5: 'Partly established.', 1: 'Established.' } })),
  objectiveDimensions: TEST_AUTHORING_SCORE_CRITERIA.filter(item => item.source === 'objective').map(({ id, label, weight }) => ({ id, label, weight, description: 'Measured from trusted execution.' })),
};
function fixture() {
  const rows = BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => ['none', 'current'].map(condition => ({
    id: `${configuration.id}:${condition}`, configurationId: configuration.id, label: configuration.label, condition, origin: 'current-round', generationStatus: 'complete', executionStatus: 'valid', testStatus: 'pass', cleanupStatus: 'pass', elapsedMs: 100, verificationMs: 100, inputTokens: 10, outputTokens: 10, status: 'scored', score: 0.8, range: { minimum: 0.8, maximum: 0.8 },
    objective: { faultDetection: condition === 'none' ? 0.5 : 1, runnable: 1, verificationSha256: hash(configuration.id + condition), faults: Array.from({ length: 6 }, (_, index) => ({ id: `fault-${index}`, status: condition === 'current' || index < 3 ? 'detected' : 'survived', reason: 'The source and matched assertion establish this finding.', evidence })) },
    judgments: judges.map(judgeConfigurationId => ({ judgeConfigurationId, reviewSha256: hash(judgeConfigurationId), status: 'complete', score: 0.8, dimensions: scoreBasis.dimensions.map(({ id }) => ({ id, score: 0.8, reason: 'The supplied code establishes this criterion.', evidence })) })),
  })));
  return { kind: 'test-authoring-round', schemaVersion: 1, date: '2026-10-10', caseId: 'redis-work-queue', sourceSha256: hash('sources'), skillSha256: hash('skill'), sourceCodeSha256: hash('code'), status: 'complete', scoreBasis,
    provenance: { freshAuthorSessions: 8, reusedBaselineArtifacts: 0, reviewerSessions: 2, authorTimeoutMs: 600000, reviewTimeoutMs: 600000, nativeSessions: 10, knownTokens: 200, usageMissingSessions: 0, verifierSha256: hash('verifier'), calibrationSha256: hash('calibration'), objectiveAdjudicationSha256: hash('adjudication') }, rows,
    summaries: BACKEND_TESTING_CONFIGURATIONS.map(configuration => ({ configurationId: configuration.id, baseline: 0.8, treatment: 0.8, delta: 0 })),
  };
}

function provisionalFixture() {
  const round = fixture();
  round.schemaVersion = 2;
  round.status = 'provisional';
  round.reviewBasis = { status: 'provisional', officialPanelStatus: 'pending', judgeConfigurationIds: [judges[0]], pendingJudgeConfigurationIds: [judges[1]], pendingConfigurationIds: [judges[1]] };
  round.rows = round.rows.filter(row => row.configurationId.startsWith('codex:'));
  round.rows.forEach(row => { row.judgments = row.judgments.slice(0, 1); });
  round.summaries = round.summaries.filter(summary => summary.configurationId.startsWith('codex:'));
  Object.assign(round.provenance, { freshAuthorSessions: 6, reviewerSessions: 1, nativeSessions: 7, knownTokens: 140 });
  return round;
}

test('new test authoring uses seven native craft ratings and independently measured criteria', () => {
  const round = validateTestAuthoringRound(fixture()), publication = projectTestAuthoring(round);
  validateTestAuthoringPublication(publication, round);
  assert.equal(publication.overall.baselineMean, 73.5);
  assert.equal(publication.overall.treatmentMean, 86);
  assert.equal(publication.overall.meanPairedDifference, 12.5);
  assert.deepEqual(weights, { fault_detection: 25, behavioral_coverage: 20, assertion_quality: 15, boundary_fidelity: 10, semantic_naming: 10, domain_structure: 5, clarity: 5, maintenance_economy: 5, runnable: 5 });
  assert.equal(publication.overall.scoreBasis.adoption, 'adopted-before-round');
  assert.equal(publication.provenance.reusedBaselineArtifacts, 0);
  assert.ok(round.rows.every(row => row.judgments.every(judge => !Object.hasOwn(judge, 'files') && !Object.hasOwn(judge, 'protection'))));
});

test('objective fraction requires six source-backed adjudicated findings', () => {
  const wrongFraction = fixture(); wrongFraction.rows[0].objective.faultDetection = 1;
  assert.throws(() => validateTestAuthoringRound(wrongFraction), /fault fraction/);
  const unsupported = fixture(); unsupported.rows[0].objective.faults[0].evidence = [];
  assert.throws(() => validateTestAuthoringRound(unsupported), /fault credit/);
  const leaked = fixture(); leaked.rows[0].objective.faults[0].reason = 'Read /Users/private/person/code.js';
  assert.throws(() => validateTestAuthoringRound(leaked), /unsafe review/);
});

test('missing execution or reviewer evidence stays unscored without caps or imputation', () => {
  for (const field of ['faultDetection', 'runnable']) {
    const round = fixture(); round.rows[1].objective[field] = null;
    const overall = deriveTestAuthoringOverall(round);
    assert.equal(overall.rows[1].score, null); assert.equal(overall.summaries[0].delta, null); assert.equal(overall.meanPairedDifference, null);
  }
  const round = fixture(); round.rows[1].judgments[0].dimensions[0].evidence = [];
  assert.equal(deriveTestAuthoringOverall(round).rows[1].score, null);
  for (const row of round.rows) { row.objective.faultDetection = 0; row.objective.runnable = 0; }
  assert.equal(deriveTestAuthoringOverall(round).rows[0].score, 56);
});

test('native naming affects only its ten points and both reviewer seats remain exact', () => {
  const round = fixture(); round.rows[1].judgments.forEach(judge => { judge.dimensions.find(item => item.id === 'semantic_naming').score = 0; });
  assert.equal(deriveTestAuthoringOverall(round).rows[1].score, 78);
  const wrongJudge = fixture(); wrongJudge.rows[0].judgments[0].judgeConfigurationId = 'codex:gpt-6-astra@ultra';
  assert.throws(() => validateTestAuthoringRound(wrongJudge), /reviewer identities/);
});

test('final derived scores cannot drift from original findings or weights', () => {
  const round = fixture(), publication = projectTestAuthoring(round);
  publication.overall.rows[0].judgments[0].contributions[0].weight = 26;
  assert.throws(() => validateTestAuthoringPublication(publication, round), /contribution arithmetic/);
  const changed = projectTestAuthoring(round); changed.overall.rows[0].score = 99;
  assert.throws(() => validateTestAuthoringPublication(changed), /final panel/);
});

test('raw test viewer preserves the exact authored bytes and excludes other files', () => {
  const round = fixture(), content = '// Contract header\r\nit("does useful work", () => {});\n';
  const files = { kind: 'test-authoring-files', schemaVersion: 1, sourceSha256: hash('packet'), rows: round.rows.map(({ id, configurationId, condition }) => ({ id, configurationId, condition, files: [{ path: 'test/domains/platform/runtime/queue/redis-work-queue__authored.spec.js', sha256: hash(content), content }] })) };
  validateTestAuthoringFiles(files, round);
  files.rows[0].files[0].content += ' ';
  assert.throws(() => validateTestAuthoringFiles(files, round), /source bytes/);
});

test('source acceptance uses a 24 KiB byte guard after generation, preserving larger valid source', () => {
  const round = fixture(), filePath = 'test/domains/platform/runtime/queue/redis-work-queue__authored.spec.js';
  const content = '// retained source\n' + ' '.repeat(16384);
  const archive = bytes => ({ kind: 'test-authoring-files', schemaVersion: 1, sourceSha256: hash('packet'), rows: round.rows.map(({ id, configurationId, condition }) => ({ id, configurationId, condition, files: [{ path: filePath, sha256: hash(bytes), content: bytes }] })) });
  validateTestAuthoringFiles(archive(content), round);
  assert.throws(() => validateTestAuthoringFiles(archive('é'.repeat(12289)), round), /source bytes/);
});

test('unselected new benchmark contributes no provisional rows or scores', () => {
  assert.equal(buildTestAuthoringPublication({ repoRootDirectory: '/not-selected', readFileSyncImplementation() { throw Object.assign(new Error('missing selection'), { code: 'ENOENT' }); } }), null);
});

test('one Astra review produces explicitly provisional scores for only three available pairs', () => {
  const round = validateTestAuthoringRound(provisionalFixture()), publication = projectTestAuthoring(round);
  validateTestAuthoringPublication(publication, round);
  assert.equal(publication.overall.baselineMean, 73.5);
  assert.equal(publication.overall.treatmentMean, 86);
  assert.equal(publication.overall.meanPairedDifference, 12.5);
  assert.equal(publication.overall.status, 'provisional');
  assert.equal(publication.reviewBasis.officialPanelStatus, 'pending');
  assert.equal(publication.nativeSessions, 7);
  assert.equal(publication.configurations.length, 3);
  assert.equal(publication.overall.rows.length, 6);
  assert.ok(publication.overall.rows.every(row => row.judgments.length === 1 && row.judgments[0].judgeConfigurationId === judges[0]));
  assert.match(publication.overall.scoreBasis.aggregation, /single Astra reviewer/);
  assert.match(publication.overall.scoreBasis.aggregation, /no Opus ratings are imputed/);
});

test('provisional score cannot claim a completed panel or substitute the deferred reviewer', () => {
  const completedPanel = provisionalFixture(); completedPanel.reviewBasis.officialPanelStatus = 'complete';
  assert.throws(() => validateTestAuthoringRound(completedPanel), /provisional reviewer basis/);
  const substituted = provisionalFixture(); substituted.rows[0].judgments[0].judgeConfigurationId = judges[1];
  assert.throws(() => validateTestAuthoringRound(substituted), /reviewer identities/);
  const missingEvidence = provisionalFixture(); missingEvidence.rows[0].judgments[0].dimensions[0].evidence = [];
  assert.equal(deriveTestAuthoringOverall(missingEvidence).rows[0].score, null);
});

test('provisional source viewer keeps six exact submissions and rejects deferred Opus rows', () => {
  const round = provisionalFixture(), content = '// Purpose: prove queue behavior.\nit("claims work", () => {});\n';
  const archive = { kind: 'test-authoring-files', schemaVersion: 2, sourceSha256: hash('six submissions'), rows: round.rows.map(({ id, configurationId, condition }) => ({ id, configurationId, condition, files: [{ path: 'test/domains/platform/runtime/queue/redis-work-queue__authored.spec.js', sha256: hash(content), content }] })) };
  validateTestAuthoringFiles(archive, round);
  archive.rows.push({ id: `${judges[1]}:none`, configurationId: judges[1], condition: 'none', files: [] });
  assert.throws(() => validateTestAuthoringFiles(archive, round), /file suite identities/);
});

test('expanded analysis preserves exact oversized source and discloses the original bound', () => {
  const round = provisionalFixture(), content = '// Exact completed native source\n' + ' '.repeat(26500);
  round.sourcePolicy = {originalMaximumSourceBytes:24576,maximumSourceBytes:65536,adoption:'expanded-after-generation',policySha256:hash('frozen expanded analysis policy')};
  round.rows[0].acceptance = {status:'expanded-analysis',sourceBytes:Buffer.byteLength(content),originalMaximumSourceBytes:24576};
  validateTestAuthoringRound(round);
  const publication = projectTestAuthoring(round);
  assert.equal(publication.overall.rows[0].score, 73.5);
  assert.deepEqual(publication.sourcePolicy, round.sourcePolicy);
  const files = {kind:'test-authoring-files',schemaVersion:2,sourceSha256:hash('exact sources'),sourcePolicy:round.sourcePolicy,rows:round.rows.map(({id,configurationId,condition,acceptance},index)=>({id,configurationId,condition,...(acceptance?{acceptance}:{}),files:[{path:'test/domains/platform/runtime/queue/redis-work-queue__authored.spec.js',content:index===0?content:'// Within original bound\n',sha256:hash(index===0?content:'// Within original bound\n')}]}))};
  validateTestAuthoringFiles(files, round);
  const withoutPolicy = structuredClone(files); delete withoutPolicy.sourcePolicy;
  assert.throws(()=>validateTestAuthoringFiles(withoutPolicy, round), /source-size violation/);
  const wrongBytes = structuredClone(files); wrongBytes.rows[0].acceptance.sourceBytes++;
  assert.throws(()=>validateTestAuthoringFiles(wrongBytes), /source bytes/);
  const wrongLimit = structuredClone(files); wrongLimit.sourcePolicy.maximumSourceBytes = 131072;
  assert.throws(()=>validateTestAuthoringFiles(wrongLimit), /analysis policy/);
});

test('expanded analysis with both reviewers retains all four pairs and completed panel scores', () => {
  const round = fixture(), content = '// Retained native source\n' + ' '.repeat(27000);
  round.sourcePolicy = { originalMaximumSourceBytes: 24576, maximumSourceBytes: 65536, adoption: 'expanded-after-generation', policySha256: hash('full expanded analysis') };
  round.rows[6].acceptance = { status: 'expanded-analysis', sourceBytes: Buffer.byteLength(content), originalMaximumSourceBytes: 24576 };
  const publication = projectTestAuthoring(validateTestAuthoringRound(round));
  validateTestAuthoringPublication(publication, round);
  assert.equal(publication.schemaVersion, 1);
  assert.equal(publication.overall.status, 'complete');
  assert.equal(publication.overall.rows.length, 8);
  assert.equal(publication.overall.summaries.length, 4);
  assert.equal(publication.nativeSessions, 10);
  assert.equal(publication.overall.rows[6].score, 73.5);
  assert.equal(Object.hasOwn(publication, 'reviewBasis'), false);
  assert.match(publication.overall.scoreBasis.aggregation, /Average the two reviewers/);
  assert.doesNotMatch(publication.overall.scoreBasis.aggregation, /provisional|pending/i);
  const archive = { kind: 'test-authoring-files', schemaVersion: 1, sourceSha256: round.sourceSha256, sourcePolicy: round.sourcePolicy, rows: round.rows.map(({ id, configurationId, condition, acceptance }, index) => {
    const source = index === 6 ? content : '// Within original source limit\n';
    return { id, configurationId, condition, ...(acceptance ? { acceptance } : {}), files: [{ path: 'test/domains/platform/runtime/queue/redis-work-queue__authored.spec.js', sha256: hash(source), content: source }] };
  }) };
  validateTestAuthoringFiles(archive, round);
  assert.equal(archive.rows[6].files[0].content, content);
});

test('a matched assertion retains fault credit when a separate case throws a TypeError', () => {
  const passed = {file:'test/queue.spec.js',fullTitle:'queue recovers expired work'}, controls = Array.from({length:2},()=>({testStatus:'pass',cleanupStatus:'pass',stats:{tests:2,passes:2,failures:0,pending:0},passedCases:[passed]}));
  const run = {status:'invalid',executionStatus:'execution-failure',cleanupStatus:'pass',timedOut:false,code:2,stats:{tests:2,passes:0,failures:2,pending:0},assertions:[{...passed,stack:'AssertionError [ERR_ASSERTION]: recovered work must remain available'}]};
  assert.equal(hasMatchedTestAuthoringFailure(run, controls), true);
  for (const mutate of [
    value=>{value.assertions[0].fullTitle='"before all" hook for queue';},
    value=>{value.assertions[0].fullTitle='queue untested failure';},
    value=>{value.assertions=[];},
    value=>{value.assertions[0].code='ERR_MOCHA_TIMEOUT';},
    value=>{value.timedOut=true;},
    value=>{value.cleanupStatus='failed';},
    value=>{value.launchError='Redis never started';},
  ]) {
    const invalid = structuredClone(run); mutate(invalid);
    assert.equal(hasMatchedTestAuthoringFailure(invalid, controls), false);
  }
  const unhealthy = structuredClone(controls); unhealthy[1].stats.failures=1;
  assert.equal(hasMatchedTestAuthoringFailure(run, unhealthy), false);
});

test('missing recovery can reject a fault through a TypeError or an authored business deadline', () => {
  const recoveredJobCase = {file:'test/queue.spec.js',fullTitle:'queue recovers expired work'};
  const controls = Array.from({length:2},()=>({testStatus:'pass',cleanupStatus:'pass',stats:{tests:1,passes:1,failures:0,pending:0},passedCases:[recoveredJobCase]}));
  const lostJobRun = {executionStatus:'execution-failure',cleanupStatus:'pass',timedOut:false,code:1,stats:{tests:1,passes:0,failures:1,pending:0},assertions:[]};
  for (const stack of ["TypeError: Cannot read properties of null (reading 'message')", 'Error: Timed out waiting for expired work to be recovered']) {
    const reviewedFailures = [{...recoveredJobCase,stack}];
    assert.equal(hasMatchedTestAuthoringFailure(lostJobRun, controls, reviewedFailures), true);
    assert.equal(hasMatchedTestAuthoringFailure({...lostJobRun,timedOut:true}, controls, reviewedFailures), false);
    assert.equal(hasMatchedTestAuthoringFailure(lostJobRun, controls, [{...reviewedFailures[0],fullTitle:'unrelated setup failure'}]), false);
  }
  assert.equal(hasMatchedTestAuthoringFailure(lostJobRun, controls), false, 'An execution error without reviewed failing-case evidence earns no credit.');
});

test('a detection correction changes execution points without changing native craft ratings or weights', () => {
  const round = fixture(), original = projectTestAuthoring(round), nativeReviews = structuredClone(round.rows.map(row => row.judgments));
  round.detectionCorrection = {adoption:'corrected-after-round',sourceSha256:hash('causal failure review'),rule:'Credit source-reviewed failures caused by the injected bug, regardless of error class.'};
  round.rows[0].objective.faults[3].status = 'detected';
  round.rows[0].objective.faultDetection = 4/6;
  const corrected = projectTestAuthoring(round);
  validateTestAuthoringPublication(corrected, round);
  assert.ok(Math.abs(corrected.overall.rows[0].score - original.overall.rows[0].score - 25/6) < 1e-10);
  assert.deepEqual(round.rows.map(row => row.judgments), nativeReviews);
  assert.deepEqual(corrected.overall.scoreBasis.criteria, original.overall.scoreBasis.criteria);
  assert.equal(corrected.overall.scoreBasis.adoption, 'detection-corrected-after-round');
  assert.match(corrected.overall.scoreBasis.aggregation, /regardless of error class/);
  assert.deepEqual(corrected.overall.rows.slice(1), original.overall.rows.slice(1));
});
