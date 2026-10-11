import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { BACKEND_TESTING_CONFIGURATIONS } from './backend-testing-publication.js';

const SHA256 = /^[a-f0-9]{64}$/;
const MAX_SOURCE_BYTES = 24576;
const MAX_ANALYSIS_SOURCE_BYTES = 65536;
const JUDGES = ['codex:gpt-6-astra@xhigh', 'claude:claude-opus-5-5@xhigh'];
const CODEX_CONFIGURATIONS = BACKEND_TESTING_CONFIGURATIONS.filter(configuration => configuration.id.startsWith('codex:'));
const PROVISIONAL_REVIEW_BASIS = { status: 'provisional', officialPanelStatus: 'pending', judgeConfigurationIds: [JUDGES[0]], pendingJudgeConfigurationIds: [JUDGES[1]], pendingConfigurationIds: [JUDGES[1]] };
const CONDITIONS = [{ id: 'none', label: 'Minimal' }, { id: 'current', label: 'Skill' }];
const assert = (valid, message) => { if (!valid) throw new Error(`Test authoring publication: ${message}`); };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const close = (left, right) => left === right || Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1e-10;
const keys = (value, expected, label) => assert(value && typeof value === 'object' && !Array.isArray(value) && same(Object.keys(value).sort(), [...expected].sort()), `${label} keys differ`);
const ids = (actual, expected, label) => assert(Array.isArray(actual) && new Set(actual).size === actual.length && same([...actual].sort(), [...expected].sort()), `${label} identities differ`);
const mean = values => values.length && values.every(Number.isFinite) ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const rating = value => value === null || Number.isFinite(value) && value >= 0 && value <= 1;
const authorInputTokens = receipt => {
  const fields = receipt.configuration.provider === 'claude' ? ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'] : ['input_tokens'];
  return fields.every(field => Number.isInteger(receipt.usage?.[field]) && receipt.usage[field] >= 0) ? fields.reduce((sum, field) => sum + receipt.usage[field], 0) : null;
};
const configurationsFor = evidence => evidence.schemaVersion === 2 ? CODEX_CONFIGURATIONS : BACKEND_TESTING_CONFIGURATIONS;
const reviewersFor = evidence => evidence.schemaVersion === 2 ? [JUDGES[0]] : JUDGES;
const rowIds = (configurations = BACKEND_TESTING_CONFIGURATIONS) => configurations.flatMap(configuration => CONDITIONS.map(condition => `${configuration.id}:${condition.id}`));
const resolvedStatus = evidence => evidence.schemaVersion === 2 ? 'provisional' : 'complete';
const prose = value => assert(typeof value === 'string' && value.length > 0 && value.length <= 640 && !/\/(?:Users|home|tmp|private|var|etc)\/|\.agents\/|https?:\/\/|```/.test(value), 'unsafe review reason');

export const TEST_AUTHORING_SCORE_CRITERIA = [
  { id: 'fault_detection', label: 'Behavioral fault detection', weight: 25, source: 'objective' },
  { id: 'behavioral_coverage', label: 'Behavioral coverage', weight: 20, source: 'dimension' },
  { id: 'assertion_quality', label: 'Independent assertions', weight: 15, source: 'dimension' },
  { id: 'boundary_fidelity', label: 'Real journey quality', weight: 10, source: 'dimension' },
  { id: 'semantic_naming', label: 'Semantic variable names', weight: 10, source: 'dimension' },
  { id: 'domain_structure', label: 'Domain structure', weight: 5, source: 'dimension' },
  { id: 'clarity', label: 'Clarity and diagnosis', weight: 5, source: 'dimension' },
  { id: 'maintenance_economy', label: 'Maintenance cost', weight: 5, source: 'dimension' },
  { id: 'runnable', label: 'Runnable tests', weight: 5, source: 'objective' },
];
const CRAFT = TEST_AUTHORING_SCORE_CRITERIA.filter(criterion => criterion.source === 'dimension');
function validateSourcePolicy(policy) {
  keys(policy, ['originalMaximumSourceBytes', 'maximumSourceBytes', 'adoption', 'policySha256'], 'analysis policy');
  assert(policy.originalMaximumSourceBytes === MAX_SOURCE_BYTES && policy.maximumSourceBytes === MAX_ANALYSIS_SOURCE_BYTES && policy.adoption === 'expanded-after-generation' && SHA256.test(policy.policySha256), 'invalid expanded analysis policy');
}
function validateAcceptance(acceptance, policy) {
  keys(acceptance, ['status', 'sourceBytes', 'originalMaximumSourceBytes'], 'source acceptance');
  assert(policy && acceptance.status === 'expanded-analysis' && acceptance.originalMaximumSourceBytes === MAX_SOURCE_BYTES && Number.isInteger(acceptance.sourceBytes) && acceptance.sourceBytes > MAX_SOURCE_BYTES && acceptance.sourceBytes <= policy.maximumSourceBytes, 'invalid original source-size violation');
}
const scoreBasis = (provisional = false) => ({ id: provisional ? 'test-authoring-weighted-evidence-astra-provisional-v1' : 'test-authoring-weighted-evidence-v1', maximum: 100, adoption: 'adopted-before-round', aggregation: `${provisional ? 'Provisional score: use the single Astra reviewer’s' : 'Average the two reviewers’'} seven weighted craft contributions (70 points), then add calibrated fault detection (25 points) and runnable tests (5 points). ${provisional ? 'The official two-reviewer panel is pending; no Opus ratings are imputed. ' : ''}Only source-adjudicated matched assertions from cases passing both healthy controls earn fault credit. No preservation criterion, caps or score overrides. Unresolved required evidence has no total.`, criteria: TEST_AUTHORING_SCORE_CRITERIA.map(criterion => ({ ...criterion })) });
const craftScore = dimensions => CRAFT.every(criterion => Number.isFinite(dimensions.find(item => item.id === criterion.id)?.score)) ? CRAFT.reduce((sum, criterion) => sum + dimensions.find(item => item.id === criterion.id).score * criterion.weight, 0) / 70 : null;
export function hasMatchedTestAuthoringAssertion(run, controls) {
  if (!run || !['assertion-failure', 'execution-failure'].includes(run.executionStatus ?? run.testStatus) || run.timedOut !== false || run.launchError || run.cleanupError || run.cleanupStatus !== 'pass' || !Number.isInteger(run.code) || run.code <= 0 || !(run.stats?.tests > 0) || !(run.stats?.failures > 0) || run.stats.pending !== 0 || controls.length !== 2 || !controls.every(control => (control.testStatus ?? control.status) === 'pass' && control.cleanupStatus === 'pass' && control.stats?.tests > 0 && control.stats.passes === control.stats.tests && control.stats.failures === 0 && control.stats.pending === 0)) return false;
  return (run.assertions ?? []).some(assertion => /AssertionError|\bERR_ASSERTION\b/.test(assertion.stack ?? '') && !/hook for|hook in|(?:before|after) (?:all|each).*hook/i.test(assertion.fullTitle ?? '') && controls.every(control => control.passedCases?.some(test => test.fullTitle === assertion.fullTitle && test.file === assertion.file)));
}
const pairedSummaries = rows => BACKEND_TESTING_CONFIGURATIONS.filter(configuration => rows.some(row => row.configurationId === configuration.id)).map(configuration => {
  const baseline = rows.find(row => row.configurationId === configuration.id && row.condition === 'none').score;
  const treatment = rows.find(row => row.configurationId === configuration.id && row.condition === 'current').score;
  return { configurationId: configuration.id, baseline, treatment, delta: baseline === null || treatment === null ? null : treatment - baseline };
});

function validateEvidence(evidence) {
  assert(Array.isArray(evidence) && evidence.length <= 8, 'invalid evidence inventory');
  for (const pointer of evidence) {
    keys(pointer, ['file', 'version', 'startLine', 'endLine'], 'evidence');
    assert(/^[A-Za-z0-9_.-]+$/.test(pointer.file) && ['final', 'context', 'shared'].includes(pointer.version) && Number.isInteger(pointer.startLine) && pointer.startLine > 0 && Number.isInteger(pointer.endLine) && pointer.endLine >= pointer.startLine, 'invalid evidence pointer');
  }
}

export function deriveTestAuthoringOverall(round) {
  const rows = round.rows.map(row => {
    const judgments = row.judgments.map(judge => {
      const contributions = TEST_AUTHORING_SCORE_CRITERIA.map(criterion => {
        const dimension = judge.dimensions.find(item => item.id === criterion.id);
        const observed = criterion.source === 'objective' ? row.objective[criterion.id === 'fault_detection' ? 'faultDetection' : 'runnable'] : dimension?.score;
        const score = criterion.source === 'objective' ? observed : judge.status === 'complete' && dimension?.evidence.length > 0 ? observed : null;
        return { id: criterion.id, score, weight: criterion.weight, points: Number.isFinite(score) ? score * criterion.weight : null };
      });
      return { judgeConfigurationId: judge.judgeConfigurationId, qualityReviewSha256: judge.reviewSha256, contributions, score: contributions.every(item => Number.isFinite(item.points)) ? contributions.reduce((sum, item) => sum + item.points, 0) : null };
    });
    const score = mean(judgments.map(judge => judge.score));
    return { id: row.id, configurationId: row.configurationId, condition: row.condition, status: score === null ? 'incomplete' : 'scored', score, judgments };
  });
  const summaries = pairedSummaries(rows), basis = scoreBasis(round.schemaVersion === 2);
  return { schemaVersion: 2, sourceSha256: hash([round.sourceSha256, JSON.stringify(basis)].join('\n')), scoreBasis: basis, status: rows.every(row => row.status === 'scored') ? resolvedStatus(round) : 'incomplete', rows, summaries, baselineMean: mean(summaries.map(row => row.baseline)), treatmentMean: mean(summaries.map(row => row.treatment)), meanPairedDifference: mean(summaries.map(row => row.delta)) };
}

export function validateTestAuthoringRound(round) {
  const provisional = round.schemaVersion === 2;
  keys(round, ['kind', 'schemaVersion', 'date', 'caseId', 'sourceSha256', 'skillSha256', 'sourceCodeSha256', 'status', 'scoreBasis', 'provenance', 'rows', 'summaries', ...(provisional ? ['reviewBasis'] : []), ...(round.sourcePolicy ? ['sourcePolicy'] : [])], 'round');
  if (round.sourcePolicy) validateSourcePolicy(round.sourcePolicy);
  assert(round.kind === 'test-authoring-round' && [1, 2].includes(round.schemaVersion) && /^\d{4}-\d{2}-\d{2}$/.test(round.date) && round.caseId === 'redis-work-queue' && [round.sourceSha256, round.skillSha256, round.sourceCodeSha256].every(value => SHA256.test(value)), 'invalid round identity');
  if (provisional) assert(same(round.reviewBasis, PROVISIONAL_REVIEW_BASIS), 'provisional reviewer basis differs');
  keys(round.scoreBasis, ['minimum', 'maximum', 'decimals', 'aggregation', 'dimensions', 'objectiveDimensions', 'namingZeroRule'], 'rubric');
  assert(round.scoreBasis.minimum === 0 && round.scoreBasis.maximum === 1 && round.scoreBasis.decimals === 2 && typeof round.scoreBasis.aggregation === 'string' && typeof round.scoreBasis.namingZeroRule === 'string', 'invalid rubric instrument');
  ids(round.scoreBasis.dimensions.map(item => item.id), CRAFT.map(item => item.id), 'craft rubric');
  ids(round.scoreBasis.objectiveDimensions.map(item => item.id), ['fault_detection', 'runnable'], 'objective rubric');
  for (const dimension of [...round.scoreBasis.dimensions, ...round.scoreBasis.objectiveDimensions]) {
    const criterion = TEST_AUTHORING_SCORE_CRITERIA.find(item => item.id === dimension.id);
    assert(dimension.weight === criterion.weight && dimension.label === criterion.label && typeof dimension.description === 'string', 'rubric criteria differ');
    if (criterion.source === 'dimension') {
      keys(dimension, ['id', 'label', 'weight', 'description', 'anchors'], 'craft rubric dimension');
      keys(dimension.anchors, ['0', '0.5', '1'], 'craft anchors');
      assert(Object.values(dimension.anchors).every(value => typeof value === 'string' && value.length > 0), 'missing craft anchors');
    } else keys(dimension, ['id', 'label', 'weight', 'description'], 'objective rubric dimension');
  }
  const p = round.provenance;
  keys(p, ['freshAuthorSessions', 'reusedBaselineArtifacts', 'reviewerSessions', 'authorTimeoutMs', 'reviewTimeoutMs', 'nativeSessions', 'knownTokens', 'usageMissingSessions', 'verifierSha256', 'calibrationSha256', 'objectiveAdjudicationSha256'], 'provenance');
  assert(p.freshAuthorSessions === (provisional ? 6 : 8) && p.reusedBaselineArtifacts === 0 && p.reviewerSessions === (provisional ? 1 : 2) && p.nativeSessions === p.freshAuthorSessions + p.reviewerSessions && [p.authorTimeoutMs, p.reviewTimeoutMs].every(value => Number.isInteger(value) && value > 0) && Number.isInteger(p.knownTokens) && p.knownTokens >= 0 && Number.isInteger(p.usageMissingSessions) && p.usageMissingSessions >= 0 && p.usageMissingSessions <= p.nativeSessions && [p.verifierSha256, p.calibrationSha256, p.objectiveAdjudicationSha256].every(value => SHA256.test(value)), 'invalid provenance');
  ids(round.rows.map(row => row.id), rowIds(configurationsFor(round)), 'suite');
  for (const row of round.rows) {
    keys(row, ['id', 'configurationId', 'label', 'condition', 'origin', 'generationStatus', 'executionStatus', 'testStatus', 'cleanupStatus', 'elapsedMs', 'verificationMs', 'inputTokens', 'outputTokens', 'status', 'score', 'range', 'objective', 'judgments', ...(row.acceptance ? ['acceptance'] : [])], 'suite');
    if (row.acceptance) {
      validateAcceptance(row.acceptance, round.sourcePolicy);
    }
    assert(row.id === `${row.configurationId}:${row.condition}` && row.label === BACKEND_TESTING_CONFIGURATIONS.find(item => item.id === row.configurationId)?.label && row.origin === 'current-round', 'invalid suite identity');
    for (const field of ['generationStatus', 'executionStatus', 'testStatus', 'cleanupStatus']) assert(typeof row[field] === 'string', 'missing execution status');
    for (const field of ['elapsedMs', 'verificationMs', 'inputTokens', 'outputTokens']) assert(row[field] === null || Number.isFinite(row[field]) && row[field] >= 0, 'invalid resources');
    keys(row.objective, ['faultDetection', 'runnable', 'verificationSha256', 'faults'], 'objective evidence');
    assert(rating(row.objective.faultDetection) && [0, 1, null].includes(row.objective.runnable) && (row.objective.verificationSha256 === null || SHA256.test(row.objective.verificationSha256)), 'invalid objective ratings');
    assert(row.objective.faults.length === 6 && new Set(row.objective.faults.map(fault => fault.id)).size === 6, 'six fault findings required');
    for (const fault of row.objective.faults) {
      keys(fault, ['id', 'status', 'reason', 'evidence'], 'fault finding');
      assert(typeof fault.id === 'string' && ['detected', 'survived', 'not-run', 'unresolved'].includes(fault.status), 'invalid fault status');
      prose(fault.reason); validateEvidence(fault.evidence);
      assert(fault.status !== 'detected' || fault.evidence.some(pointer => pointer.version === 'final'), 'fault credit lacks final test evidence');
    }
    const faults = row.objective.faults;
    assert(close(row.objective.faultDetection, faults.some(fault => fault.status === 'unresolved') ? null : faults.filter(fault => fault.status === 'detected').length / 6), 'fault fraction differs');
    assert(row.objective.runnable !== 1 || row.objective.verificationSha256 !== null && row.testStatus === 'pass' && row.cleanupStatus === 'pass', 'runnable credit lacks clean execution');
    ids(row.judgments.map(judge => judge.judgeConfigurationId), reviewersFor(round), 'reviewer');
    for (const judge of row.judgments) {
      keys(judge, ['judgeConfigurationId', 'reviewSha256', 'status', 'score', 'dimensions'], 'review');
      assert(SHA256.test(judge.reviewSha256) && ['complete', 'incomplete'].includes(judge.status), 'invalid review');
      ids(judge.dimensions.map(item => item.id), CRAFT.map(item => item.id), 'native dimensions');
      for (const dimension of judge.dimensions) {
        keys(dimension, ['id', 'score', 'reason', 'evidence'], 'native dimension');
        assert(rating(dimension.score) && (dimension.score === null || Math.abs(dimension.score * 100 - Math.round(dimension.score * 100)) < 1e-7), 'invalid native rating');
        if (dimension.reason !== null) prose(dimension.reason);
        validateEvidence(dimension.evidence);
        assert(judge.status !== 'complete' || dimension.score !== null && dimension.reason !== null, 'complete reviewer lacks ratings');
      }
      assert(close(judge.score, judge.status === 'complete' ? craftScore(judge.dimensions) : null), 'craft arithmetic differs');
    }
    const scores = row.judgments.map(judge => judge.score), score = mean(scores);
    assert(close(row.score, score) && row.status === (score === null ? 'incomplete' : 'scored') && same(row.range, { minimum: score === null ? null : Math.min(...scores), maximum: score === null ? null : Math.max(...scores) }), 'craft panel differs');
  }
  assert(same(round.summaries, pairedSummaries(round.rows)) && round.status === (round.rows.every(row => row.status === 'scored') ? resolvedStatus(round) : 'incomplete'), 'round summary differs');
  return round;
}

export function projectTestAuthoring(round) {
  validateTestAuthoringRound(round);
  const overall = deriveTestAuthoringOverall(round);
  return { kind: 'vasirbenchmark-test-authoring', schemaVersion: round.schemaVersion, benchmark: { id: 'test-authoring', title: 'Writing new tests', description: 'Write new behavioral tests from production code: Minimal versus Skill.' }, sourceSha256: hash([round.sourceSha256, overall.sourceSha256].join('\n')), date: round.date, caseId: round.caseId, scope: 'one-production-code-case', configurations: configurationsFor(round).map(item => ({ ...item })), conditions: CONDITIONS.map(item => ({ ...item })), trials: 1, ...(round.reviewBasis ? { reviewBasis: structuredClone(round.reviewBasis) } : {}), ...(round.sourcePolicy ? {sourcePolicy:structuredClone(round.sourcePolicy)} : {}), overall, provenance: { ...round.provenance }, nativeSessions: round.provenance.nativeSessions, knownTokens: round.provenance.knownTokens, usageMissingSessions: round.provenance.usageMissingSessions };
}

export function validateTestAuthoringPublication(publication, round) {
  const provisional = publication.schemaVersion === 2;
  keys(publication, ['kind', 'schemaVersion', 'benchmark', 'sourceSha256', 'date', 'caseId', 'scope', 'configurations', 'conditions', 'trials', 'overall', 'provenance', 'nativeSessions', 'knownTokens', 'usageMissingSessions', ...(provisional ? ['reviewBasis'] : []), ...(publication.sourcePolicy ? ['sourcePolicy'] : [])], 'publication');
  if (publication.sourcePolicy) validateSourcePolicy(publication.sourcePolicy);
  assert(publication.kind === 'vasirbenchmark-test-authoring' && [1, 2].includes(publication.schemaVersion) && publication.caseId === 'redis-work-queue' && publication.scope === 'one-production-code-case' && publication.trials === 1 && same(publication.configurations, configurationsFor(publication)) && same(publication.conditions, CONDITIONS) && publication.benchmark.id === 'test-authoring' && publication.benchmark.title === 'Writing new tests' && SHA256.test(publication.sourceSha256), 'invalid publication');
  if (provisional) assert(same(publication.reviewBasis, PROVISIONAL_REVIEW_BASIS), 'provisional reviewer basis differs');
  assert(publication.nativeSessions === (provisional ? 7 : 10) && publication.provenance.nativeSessions === publication.nativeSessions && publication.provenance.freshAuthorSessions === (provisional ? 6 : 8) && publication.provenance.reviewerSessions === (provisional ? 1 : 2) && publication.provenance.reusedBaselineArtifacts === 0 && publication.knownTokens === publication.provenance.knownTokens && publication.usageMissingSessions === publication.provenance.usageMissingSessions, 'usage differs');
  const overall = publication.overall;
  keys(overall, ['schemaVersion', 'sourceSha256', 'scoreBasis', 'status', 'rows', 'summaries', 'baselineMean', 'treatmentMean', 'meanPairedDifference'], 'overall');
  assert(overall.schemaVersion === 2 && SHA256.test(overall.sourceSha256) && same(overall.scoreBasis, scoreBasis(provisional)), 'final score basis differs');
  ids(overall.rows.map(row => row.id), rowIds(configurationsFor(publication)), 'final suite');
  for (const row of overall.rows) {
    keys(row, ['id', 'configurationId', 'condition', 'status', 'score', 'judgments'], 'final suite');
    assert(row.id === `${row.configurationId}:${row.condition}`, 'final suite identity differs');
    ids(row.judgments.map(judge => judge.judgeConfigurationId), reviewersFor(publication), 'final reviewer');
    for (const judge of row.judgments) {
      keys(judge, ['judgeConfigurationId', 'qualityReviewSha256', 'contributions', 'score'], 'final review');
      assert(SHA256.test(judge.qualityReviewSha256), 'final review lacks receipt');
      ids(judge.contributions.map(item => item.id), TEST_AUTHORING_SCORE_CRITERIA.map(item => item.id), 'final criteria');
      for (const contribution of judge.contributions) {
        keys(contribution, ['id', 'score', 'weight', 'points'], 'contribution');
        assert(contribution.weight === TEST_AUTHORING_SCORE_CRITERIA.find(item => item.id === contribution.id).weight && rating(contribution.score) && close(contribution.points, contribution.score === null ? null : contribution.score * contribution.weight), 'contribution arithmetic differs');
      }
      assert(close(judge.score, judge.contributions.every(item => Number.isFinite(item.points)) ? judge.contributions.reduce((sum, item) => sum + item.points, 0) : null), 'final reviewer arithmetic differs');
    }
    const score = mean(row.judgments.map(judge => judge.score));
    assert(close(row.score, score) && row.status === (score === null ? 'incomplete' : 'scored'), 'final panel differs');
  }
  const summaries = pairedSummaries(overall.rows);
  assert(same(overall.summaries, summaries) && close(overall.baselineMean, mean(summaries.map(item => item.baseline))) && close(overall.treatmentMean, mean(summaries.map(item => item.treatment))) && close(overall.meanPairedDifference, mean(summaries.map(item => item.delta))) && overall.status === (overall.rows.every(row => row.status === 'scored') ? resolvedStatus(publication) : 'incomplete'), 'final summaries differ');
  if (round) assert(same(publication, projectTestAuthoring(round)), 'publication differs from source evidence');
  return publication;
}

export function validateTestAuthoringFiles(files, round) {
  keys(files, ['kind', 'schemaVersion', 'sourceSha256', 'rows', ...(files.sourcePolicy ? ['sourcePolicy'] : [])], 'files');
  if (files.sourcePolicy) { validateSourcePolicy(files.sourcePolicy); assert(!round || same(files.sourcePolicy, round.sourcePolicy), 'source policy differs'); }
  assert(files.kind === 'test-authoring-files' && [1, 2].includes(files.schemaVersion) && SHA256.test(files.sourceSha256), 'invalid files payload');
  if (round) assert(files.schemaVersion === round.schemaVersion, 'file scope differs from round');
  ids(files.rows.map(row => row.id), rowIds(configurationsFor(files)), 'file suite');
  for (const row of files.rows) {
    keys(row, ['id', 'configurationId', 'condition', 'files', ...(row.acceptance ? ['acceptance'] : [])], 'file suite');
    if (row.acceptance) {
      validateAcceptance(row.acceptance, files.sourcePolicy);
      assert(row.files.length === 1 && (!round || same(row.acceptance, round.rows.find(item => item.id === row.id).acceptance)), 'rejected source inventory differs');
    }
    assert(row.id === `${row.configurationId}:${row.condition}` && Array.isArray(row.files) && row.files.length <= 1, 'invalid file suite');
    for (const file of row.files) {
      keys(file, ['path', 'sha256', 'content'], 'test source');
      assert(file.path === 'test/domains/platform/runtime/queue/redis-work-queue__authored.spec.js' && typeof file.content === 'string' && Buffer.byteLength(file.content) <= (files.sourcePolicy?.maximumSourceBytes ?? MAX_SOURCE_BYTES) && (row.acceptance ? Buffer.byteLength(file.content) === row.acceptance.sourceBytes : Buffer.byteLength(file.content) <= MAX_SOURCE_BYTES) && SHA256.test(file.sha256) && hash(file.content) === file.sha256, 'test source bytes differ');
    }
    if (round?.rows.find(item => item.id === row.id).objective.runnable === 1) assert(row.files.length === 1, 'runnable suite has no test source');
  }
  return files;
}

export function testAuthoringSourcePins(selected, plan) {
  return [...['plan', 'skill', 'rubric', 'calibration', 'generation', 'reviewPlan', 'packet', 'mapping', 'objective', 'review'].map(key => selected[key]), ...['analysisPolicy', 'strictGeneration', 'continuation', 'codexContinuation'].filter(key => selected[key]).map(key => selected[key]), ...(plan.basePlan ? [plan.basePlan] : []), ...(plan.codexPlan ? [plan.codexPlan] : []), plan.fixture, plan.nativeRunner, plan.verifier, plan.fixtureRuntime,
    ...selected.authors.flatMap(author => [author.receipt, author.launch, author.outcome, ...(author.submission ? [author.submission] : []), ...(author.verification ? [author.verification] : []), ...(author.strictOutcome ? [author.strictOutcome] : [])]),
    ...selected.judges.flatMap(judge => [judge.receipt, judge.launch, ...(judge.validated ? [judge.validated] : [])])];
}

export function buildSelectedTestAuthoringPublication({ selected, repoRootDirectory, readFileSyncImplementation = fs.readFileSync }) {
  keys(selected, ['kind', 'schemaVersion', 'plan', 'skill', 'rubric', 'calibration', 'generation', 'reviewPlan', 'packet', 'mapping', 'objective', 'review', 'authors', 'judges', ...['analysisPolicy', 'strictGeneration', 'continuation', 'codexContinuation'].filter(key => selected[key])], 'selection');
  assert(selected.kind === 'vasirbenchmark-test-authoring-selection' && [1, 2].includes(selected.schemaVersion), 'invalid selected round');
  const provisional = selected.schemaVersion === 2;
  const configurations = provisional ? CODEX_CONFIGURATIONS : BACKEND_TESTING_CONFIGURATIONS, judges = provisional ? [JUDGES[0]] : JUDGES;
  const readBytes = (pin, label) => {
    keys(pin, ['path', 'sha256'], `${label} pin`);
    assert(typeof pin.path === 'string' && (pin.path.startsWith('.agents/vasir-evals/test-authoring/') || ['benchmarks/backend-testing/run.mjs', 'benchmarks/backend-testing/verify.mjs', 'benchmarks/backend-testing/fixture.mjs'].includes(pin.path)) && !pin.path.includes('\\') && pin.path.split('/').every(part => part && part !== '.' && part !== '..') && SHA256.test(pin.sha256), 'unsafe source pin');
    const bytes = readFileSyncImplementation(path.join(repoRootDirectory, pin.path));
    assert(hash(bytes) === pin.sha256, `${label} source hash mismatch`); return bytes;
  };
  const read = (pin, label) => JSON.parse(readBytes(pin, label).toString());
  const plan = read(selected.plan, 'plan'), rubric = read(selected.rubric, 'rubric'), calibration = read(selected.calibration, 'calibration'), generation = read(selected.generation, 'generation'), reviewPlan = read(selected.reviewPlan, 'review plan'), packets = read(selected.packet, 'packet'), mapping = read(selected.mapping, 'mapping'), objective = read(selected.objective, 'objective adjudication'), review = read(selected.review, 'review');
  const privateRoot = path.posix.dirname(selected.plan.path);
  const reviewRoot = path.posix.dirname(selected.reviewPlan.path);
  if (plan.basePlan) {
    const basePlan = read(plan.basePlan, 'original frozen plan');
    assert(same(plan.activeConfigurations, configurations.map(configuration => configuration.id)) && same(plan.activeJudges, judges), 'active author or reviewer scope differs');
    for (const key of ['fixture', 'calibration', 'nativeRunner', 'verifier', 'fixtureRuntime', 'sourceHash', 'taskSha256', 'skillSha256', 'rubricSha256', 'testPath']) assert(same(plan[key], basePlan[key]), 'continuation changed frozen task or instrument');
    for (const [name, digest] of Object.entries(basePlan.pins)) assert(plan.pins[name] === digest, 'continuation changed frozen author input');
    assert(same(plan.rows.map(({id, configurationId, condition, trial}) => ({id, configurationId, condition, trial})), basePlan.rows.map(({id, configurationId, condition, trial}) => ({id, configurationId, condition, trial}))) && plan.rows.every(row => Boolean(row.deferred) === !plan.activeConfigurations.includes(row.configurationId)), 'deferred author identities differ');
    if (plan.codexPlan) {
      assert(!provisional, 'full author continuation cannot be provisional');
      const codexPlan = read(plan.codexPlan, 'preceding Codex plan');
      assert(same(codexPlan.basePlan, plan.basePlan) && same(codexPlan.activeConfigurations, CODEX_CONFIGURATIONS.map(configuration => configuration.id)) && same(codexPlan.activeJudges, [JUDGES[0]]), 'preceding Codex scope differs');
      for (const key of ['fixture', 'calibration', 'nativeRunner', 'verifier', 'fixtureRuntime', 'sourceHash', 'taskSha256', 'skillSha256', 'rubricSha256', 'testPath']) assert(same(plan[key], codexPlan[key]), 'full continuation changed frozen Codex inputs');
      for (const [name, digest] of Object.entries(codexPlan.pins)) assert(plan.pins[name] === digest, 'full continuation changed frozen Codex prompt');
      assert(plan.rows.filter(row => row.configurationId.startsWith('codex:')).every(row => same(row, codexPlan.rows.find(prior => prior.id === row.id))), 'full continuation changed a completed Codex author');
    }
  }
  const activeRows = plan.rows.filter(row => !provisional || plan.activeConfigurations.includes(row.configurationId));
  let sourcePolicy;
  if (selected.analysisPolicy) {
    const policy = read(selected.analysisPolicy, 'expanded analysis policy');
    assert(policy.kind === 'test-authoring-analysis-policy' && policy.schemaVersion === 1 && policy.adoption === 'expanded-after-generation' && policy.originalMaximumSourceBytes === MAX_SOURCE_BYTES && policy.maximumSourceBytes === MAX_ANALYSIS_SOURCE_BYTES && policy.maximumResponseBytes === 196608 && policy.maximumReviewPromptBytes === 262144 && policy.authorInputsUnchanged === true && policy.weightsUnchanged === true && policy.automaticRetries === 0 && same(policy.authorPlan, selected.plan) && same(policy.activeRows, activeRows.map(row => row.id)) && ['sourceHash','skillSha256','rubricSha256'].every(key => policy[key] === plan[key]) && same(generation.analysisPolicy, selected.analysisPolicy), 'expanded analysis policy differs');
    readBytes(policy.runner, 'analysis runner'); read(policy.observedGeneration, 'pre-analysis generation');
    if (policy.basePolicy) {
      const basePolicy = read(policy.basePolicy, 'original analysis policy');
      assert(basePolicy.originalMaximumSourceBytes === policy.originalMaximumSourceBytes && basePolicy.maximumSourceBytes === policy.maximumSourceBytes && basePolicy.authorInputsUnchanged === true && basePolicy.weightsUnchanged === true && same(basePolicy.authorPlan, plan.codexPlan), 'full analysis changed earlier acceptance policy');
    }
    assert(selected.strictGeneration && same(selected.strictGeneration, generation.strictGeneration), 'strict generation pin differs');
    const strict = read(selected.strictGeneration, 'strict generation');
    assert(strict.planSha256 === selected.plan.sha256 && same(strict.rows.map(row => row.id), generation.rows.map(row => row.id)), 'strict generation inventory differs');
    sourcePolicy = {originalMaximumSourceBytes:MAX_SOURCE_BYTES,maximumSourceBytes:MAX_ANALYSIS_SOURCE_BYTES,adoption:'expanded-after-generation',policySha256:selected.analysisPolicy.sha256};
  } else assert(!generation.analysisPolicy && !selected.strictGeneration, 'expanded acceptance requires selected policy');
  const validateUnattemptedContinuation = (pin, authorPlan) => {
    const continued = read(pin, 'unattempted continuation');
    assert(continued.kind === 'test-authoring-unattempted-continuation' && continued.schemaVersion === 1 && same(continued.authorPlan, authorPlan) && activeRows.some(row => row.id === continued.rowId) && continued.policy.nativeSessions === 1 && continued.policy.automaticRetries === 0 && continued.policy.tools === false && continued.policy.timeoutMs === plan.policy.authorTimeoutMs && continued.policy.maxAcceptedSourceBytes === MAX_SOURCE_BYTES, 'unattempted continuation policy differs');
    const prior = read(continued.priorOutcome, 'unattempted original outcome');
    assert(prior.id === continued.rowId && prior.attempted === false && !prior.receipt && !prior.submission && !prior.verification, 'continuation repeats a native attempt');
    read(continued.priorGeneration, 'unattempted generation'); readBytes(continued.runner, 'continuation runner');
  };
  if (generation.continuation || selected.continuation) {
    assert(same(generation.continuation, selected.continuation), 'continuation pin differs');
    if (plan.codexPlan) {
      const continued = read(selected.continuation, 'Opus resume');
      assert(continued.kind === 'test-authoring-opus-resume' && continued.schemaVersion === 1 && same(continued.authorPlan, selected.plan) && same(continued.analysisPolicy, selected.analysisPolicy) && continued.policy.nativeSessions === 2 && continued.policy.automaticRetries === 0 && continued.policy.tools === false && continued.policy.timeoutMs === plan.policy.authorTimeoutMs && continued.policy.maxAcceptedSourceBytes === MAX_SOURCE_BYTES && continued.policy.analysisMaximumSourceBytes === MAX_ANALYSIS_SOURCE_BYTES, 'Opus resume policy differs');
      const priorReceipt = read(continued.priorReceipt, 'retained Opus provider failure'), priorLaunch = read(continued.priorLaunch, 'retained Opus launch');
      assert(priorReceipt.status !== 'complete' && priorReceipt.complete === false && priorReceipt.configuration.id === JUDGES[1] && same(priorLaunch.configuration, priorReceipt.configuration), 'Opus resume replaced a completed author');
      readBytes(continued.runner, 'Opus resume runner');
    } else validateUnattemptedContinuation(selected.continuation, selected.plan);
  }
  if (generation.codexContinuation || selected.codexContinuation) {
    assert(plan.codexPlan && same(generation.codexContinuation, selected.codexContinuation), 'Codex continuation pin differs');
    validateUnattemptedContinuation(selected.codexContinuation, plan.codexPlan);
  }
  const relativePin = (name, sha256) => ({ path: `${privateRoot}/${name}`, sha256 });
  const reviewPin = (name, sha256) => ({ path: `${reviewRoot}/${name}`, sha256 });
  for (const [name, sha256] of Object.entries(plan.pins)) readBytes(relativePin(name, sha256), 'author input');
  for (const [name, sha256] of Object.entries(reviewPlan.pins)) readBytes(reviewPin(name, sha256), 'review input');
  const skill = read(selected.skill, 'skill'), fixture = read(plan.fixture, 'fixture');
  const shared = read(reviewPin('shared-review-context.json', reviewPlan.pins['shared-review-context.json']), 'shared review source');
  const authorPacket = read(relativePin('author-packet.json', plan.pins['author-packet.json']), 'author packet');
  const authorSchema = read(relativePin('author.schema.json', plan.pins['author.schema.json']), 'native output schema');
  for (const key of ['nativeRunner', 'verifier', 'fixtureRuntime']) readBytes(plan[key], 'execution instrument');
  assert(plan.kind === 'test-authoring-round' && plan.schemaVersion === 1 && plan.caseId === 'redis-work-queue' && plan.skillSha256 === selected.skill.sha256 && plan.rubricSha256 === selected.rubric.sha256 && same(plan.calibration, selected.calibration) && fixture.sourceHash === plan.sourceHash && calibration.sourceHash === plan.sourceHash && calibration.valid === true && calibration.reviewStatus === 'approved', 'unqualified frozen task or calibration');
  assert(rubric.kind === 'test-authoring-craft-rubric' && rubric.schemaVersion === 1 && plan.policy.authorSessions === activeRows.length && plan.policy.reviewSessions === judges.length && plan.policy.tools === false && plan.policy.automaticRetries === 0 && plan.policy.authorTimeoutMs === 600000 && plan.policy.reviewTimeoutMs === 600000 && plan.policy.maxAcceptedSourceBytes === MAX_SOURCE_BYTES && plan.policy.maxAuthorPromptBytes === 65536 && authorSchema.properties?.file?.properties?.content?.maxLength === undefined, 'frozen scoring, attempt policy or native content constraint differs');
  assert(authorPacket.caseId === plan.caseId && authorPacket.fixtureSourceHash === plan.sourceHash && hash(authorPacket.task) === plan.taskSha256 && shared.files.every(file => /^(?:shared|context)\//.test(file.path) && !file.path.endsWith('.spec.js') && hash(file.content) === file.sha256), 'provided source or task differs');
  const neutral = readBytes(relativePin('prompt-none.txt', plan.pins['prompt-none.txt']), 'neutral prompt').toString();
  const treatment = readBytes(relativePin('prompt-current.txt', plan.pins['prompt-current.txt']), 'skill prompt').toString();
  assert(treatment === neutral + '\n\nTESTING SKILL\n\n' + skill.map(file => 'FILE ' + file.path + '\n' + file.content).join('\n'), 'skill is not the sole prompt difference');
  assert([neutral, treatment].every(prompt => Buffer.byteLength(prompt) <= plan.policy.maxAuthorPromptBytes), 'author prompt bound exceeded');
  ids(plan.rows.map(row => `${row.configurationId}:${row.condition}`), rowIds(), 'planned suite');
  assert(plan.rows.every(row => row.trial === 1 && path.resolve(row.artifactRoot) === path.join(repoRootDirectory, privateRoot, ...(plan.basePlan ? ['codex-only'] : []), ...(plan.codexPlan && row.configurationId.startsWith('claude:') ? ['opus-resume'] : []), row.id)), 'fresh artifact roots differ');
  assert(generation.kind === plan.kind && generation.schemaVersion === 1 && generation.planSha256 === selected.plan.sha256 && selected.authors.length === activeRows.length && generation.rows.length === plan.rows.length && selected.judges.length === judges.length, 'generation inventory differs');
  ids(generation.rows.map(row => row.id), plan.rows.map(row => row.id), 'generation suites');
  if (provisional) for (const planned of plan.rows.filter(row => row.deferred)) {
    const record = generation.rows.find(row => row.id === planned.id), outcome = read(record.outcome, 'deferred outcome');
    assert(same(record, {...outcome, outcome:record.outcome}) && outcome.attempted === false && outcome.status === 'deferred' && ['id', 'configurationId', 'condition', 'trial', 'artifactRoot'].every(key => outcome[key] === planned[key]) && !outcome.receipt && !outcome.submission && !outcome.verification, 'deferred author contains selected native evidence');
    if (outcome.priorOutcome) read(outcome.priorOutcome, 'retained private outcome');
    if (outcome.priorReceipt) read(outcome.priorReceipt, 'retained private receipt');
  }
  const reviewedRows = activeRows.filter((row, index) => selected.authors[index].submission);
  ids(Object.keys(mapping), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, reviewedRows.length), 'blind labels'); ids(Object.values(mapping), reviewedRows.map(row => row.id), 'blind suites'); ids(Object.keys(packets), Object.keys(mapping), 'packet labels');
  assert(reviewPlan.kind === 'test-authoring-review' && reviewPlan.schemaVersion === 1 && same(reviewPlan.judges, judges) && reviewPlan.policy.nativeSessions === judges.length && reviewPlan.policy.tools === false && reviewPlan.policy.automaticRetries === 0 && reviewPlan.policy.timeoutMs === 600000 && reviewPlan.policy.maxPromptBytes === 262144, 'review policy differs');
  for (let index = 1; index <= judges.length; index++) assert(readBytes(reviewPin(`review-prompt-${index}.txt`, reviewPlan.pins[`review-prompt-${index}.txt`]), 'review prompt').length <= reviewPlan.policy.maxPromptBytes, 'review prompt bound exceeded');
  for (const [key, name] of Object.entries({plan:'plan.json',rubric:'taste-rubric.json',generation:'generation-summary.json',packet:'packet.json',mapping:'mapping.json',objective:'objective-adjudication.json'})) assert(reviewPlan.pins[name] === selected[key].sha256, 'review inputs differ from selection');
  assert(review.kind === 'test-authoring-review' && review.schemaVersion === 1 && review.judges.length === judges.length && review.rows.length === plan.rows.length && objective.kind === 'test-authoring-objective-adjudication' && objective.schemaVersion === 1, 'review or objective inventory differs');
  ids(objective.rows.map(row => row.id), plan.rows.map(row => row.id), 'objective suites');
  ids(review.rows.map(row => row.id), plan.rows.map(row => row.id), 'review summary suites');
  if (provisional) {
    assert(review.scoringBasis === 'provisional-single-reviewer' && review.reviewerCount === 1, 'private provisional scoring basis differs');
    for (const planned of plan.rows.filter(row => row.deferred)) {
      const finding = objective.rows.find(row => row.id === planned.id), summary = review.rows.find(row => row.id === planned.id);
      assert(finding.faultDetection === null && finding.runnable === null && finding.verificationSha256 === null && finding.faults.length === 6 && finding.faults.every(fault => ['not-run','unresolved'].includes(fault.status) && fault.evidence.length === 0), 'deferred objective evidence must remain unresolved');
      assert(summary.configurationId === planned.configurationId && summary.condition === planned.condition && summary.score === null && summary.faultDetection === null && summary.runnable === null, 'deferred review summary must remain unscored');
    }
  }
  const receipts = [];
  const native = (pins, configurationId, prompt, system, schema) => {
    const receipt = read(pins.receipt, 'native receipt'), launch = read(pins.launch, 'native launch');
    const [provider, setting] = configurationId.split(':'), [model, reasoning] = setting.split('@');
    assert(same(receipt.configuration, { id: configurationId, provider, model, reasoning }) && same(launch.configuration, receipt.configuration) && receipt.toolsAllowed === false && receipt.toolUse === false && launch.toolsAllowed === false && launch.promptSha256 === prompt && launch.systemInstructionsSha256 === system && launch.outputSchemaSha256 === schema, 'native identity or frozen inputs differ');
    assert(receipt.complete === (receipt.status === 'complete') && receipt.timedOut === (receipt.status === 'timeout') && receipt.runtime?.requestedReasoning === reasoning && receipt.preflight?.some(item => item.configurationId === configurationId && item.model === model && item.effort === reasoning && item.accepted === true), 'native effort or completeness differs');
    assert(provider === 'codex' ? receipt.runtime.requestedModel === model && receipt.runtime.modelIdentityEvidence === 'exact-native-catalog-selection-and-cli-invocation-no-fallback' : receipt.runtime.model === model && receipt.runtime.exactModel === true && same(receipt.runtime.assistantModels, [model]), 'native model differs');
    if (provider === 'claude' && plan.claudeAccount) {
      const account = plan.claudeAccount;
      assert(launch.claudeAccount?.email === account.email && launch.claudeAccount?.configDir === account.configDir && [launch.accountAssertion, receipt.accountAssertion].every(assertion => assertion?.provider === 'claude' && assertion.loggedIn === true && assertion.email === account.email && assertion.contextId === path.basename(account.configDir)), 'selected native account differs');
    }
    receipts.push(receipt); return receipt;
  };
  const redact = value => typeof value === 'string' ? value.replace(/(?:file:\/\/)?\/(?:Users|private|tmp|var|home)\/[^\s"'<>)]*/g, '<private-path>') : Array.isArray(value) ? value.map(redact) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)])) : value;
  const execution = (run, fault = false) => redact({ status: run.status, testStatus: run.testStatus, cleanupStatus: run.cleanupStatus, stats: run.stats && Object.fromEntries(['tests', 'passes', 'pending', 'failures'].map(key => [key, run.stats[key]])), ...(fault ? plan.codexPlan ? { assertionCount: (run.assertions ?? []).length } : { assertions: (run.assertions ?? []).map(({ file, fullTitle, message }) => { const diagnostic = String(message ?? ''); return { file, fullTitle, message: diagnostic.slice(0, 400), messageTruncated: diagnostic.length > 400 }; }) } : {}) });
  const artifacts = activeRows.map((planned, index) => {
    const pins = selected.authors[index]; keys(pins, ['receipt', 'launch', 'outcome', ...(pins.submission ? ['submission'] : []), ...(pins.verification ? ['verification'] : []), ...(pins.strictOutcome ? ['strictOutcome'] : [])], 'author pins');
    const receipt = native(pins, planned.configurationId, plan.pins[`prompt-${planned.condition}.txt`], plan.pins['system.txt'], plan.pins['author.schema.json']), outcome = read(pins.outcome, 'author outcome');
    assert(['id', 'configurationId', 'condition', 'trial', 'artifactRoot'].every(key => planned[key] === outcome[key]) && same(generation.rows.find(row => row.id === planned.id), { ...outcome, outcome: pins.outcome }) && same(outcome.usage, receipt.usage) && outcome.nativeStatus === receipt.status, 'generation differs from native receipt');
    assert(['receipt', 'launch', 'submission', 'verification'].every(key => same(pins[key], outcome[key])), 'author artifact pins differ');
    if (sourcePolicy) {
      assert(pins.strictOutcome && same(pins.strictOutcome, outcome.strictOutcome), 'strict outcome pin differs');
      const strictOutcome = read(pins.strictOutcome, 'strict author outcome'), strictGeneration = read(selected.strictGeneration, 'strict generation');
      assert(strictOutcome.id === planned.id && same(strictOutcome.receipt, pins.receipt) && same(strictOutcome.launch, pins.launch) && same(strictGeneration.rows.find(row => row.id === planned.id).outcome, pins.strictOutcome), 'analysis changed native author attempt');
      if (strictOutcome.submission) assert(strictOutcome.submission.sha256 === pins.submission?.sha256, 'analysis changed strict source bytes');
    }
    const verification = pins.verification ? read(pins.verification, 'verification') : null;
    if (verification) assert(verification.rowId === planned.id && outcome.status === verification.status && same(outcome.controls, verification.controlRuns.map(run => ({ status: run.status, testStatus: run.testStatus, cleanupStatus: run.cleanupStatus, passes: run.stats?.passes ?? null }))) && same(outcome.faults, verification.faultRuns.map(run => ({ id: run.faultId, status: run.status }))), 'trusted verification differs from outcome');
    if (verification) {
      const controls = verification.controlRuns;
      const testStatus = controls.length === 2 && controls.every(run => run.testStatus === 'pass') ? 'pass' : controls.find(run => run.testStatus !== 'pass')?.testStatus ?? 'not-run';
      const cleanupStatus = controls.some(run => run.cleanupStatus === 'failed') ? 'failed' : controls.length === 2 && controls.every(run => run.cleanupStatus === 'pass') ? 'pass' : 'not-run';
      assert(outcome.testStatus === testStatus && outcome.cleanupStatus === cleanupStatus, 'summarized execution statuses differ');
    }
    const source = pins.submission ? readBytes(pins.submission, 'submitted source').toString() : null;
    if (source !== null) { const output = JSON.parse(receipt.finalText); keys(output, ['file'], 'author output'); keys(output.file, ['path', 'content'], 'author file'); assert(receipt.status === 'complete' && output.file.path === plan.testPath && output.file.content === source && Buffer.byteLength(source) <= (sourcePolicy?.maximumSourceBytes ?? MAX_SOURCE_BYTES), 'accepted source differs from native bytes'); }
    const behavioral = { authoredSourceAvailable: source !== null, authorStatus: receipt.status, executionStatus: verification?.status ?? 'not-run', controls: (verification?.controlRuns ?? []).map(run => execution(run)), supportingFaults: (verification?.faultRuns ?? []).map((run, faultIndex) => ({ case: faultIndex + 1, ...execution(run, true) })) };
    const behavioralText = `${JSON.stringify(behavioral, null, plan.codexPlan ? undefined : 2)}\n`;
    const label = Object.keys(mapping).find(key => mapping[key] === planned.id), packet = packets[label] ?? { specs: [], files: [...shared.files, {path:'verification.json',content:behavioralText,sha256:hash(behavioralText)}] }, packetFiles = new Map();
    for (const file of packet.files) { assert(typeof file.path === 'string' && !file.path.startsWith('/') && !file.path.split('/').includes('..') && typeof file.content === 'string' && hash(file.content) === file.sha256 && !packetFiles.has(file.path), 'packet source bytes differ'); packetFiles.set(file.path, file); }
    assert(same(packet.specs, source === null ? [] : [`final/${plan.testPath}`]) && same(packet.files.filter(file => file.path.startsWith('final/')).map(file => ({ path: file.path, sha256: file.sha256, content: file.content })), source === null ? [] : [{ path: `final/${plan.testPath}`, sha256: pins.submission.sha256, content: source }]), 'complete authored inventory differs');
    assert(same(packet.files.filter(file => /^(?:shared|context)\//.test(file.path)), shared.files), 'review provided source inventory differs');
    assert(packetFiles.get('verification.json')?.content === behavioralText, 'review execution evidence differs');
    const observed = objective.rows.find(row => row.id === planned.id);
    assert(observed.verificationSha256 === (pins.verification?.sha256 ?? null), 'objective execution hash differs');
    ids(observed.faults.map(fault => fault.id), calibration.reference.faultRuns.map(fault => fault.faultId), 'calibrated fault findings');
    const controls = verification?.controlRuns ?? [];
    const runnable = controls.length === 2 && controls.every(run => (run.testStatus ?? run.status) === 'pass' && run.cleanupStatus === 'pass' && run.stats?.tests > 0 && run.stats.passes === run.stats.tests && run.stats.failures === 0 && run.stats.pending === 0) ? 1 : verification?.status === 'unresolved' || ['timeout', 'infrastructure-failure'].includes(receipt.status) || outcome.status === 'infrastructure-failure' ? null : 0;
    assert(observed.runnable === runnable && (runnable !== 0 || observed.faultDetection === 0), 'objective runnable credit differs from execution');
    for (const fault of observed.faults) if (fault.status === 'detected') {
      const run = verification?.faultRuns.find(item => item.faultId === fault.id);
      assert(runnable === 1 && hasMatchedTestAuthoringAssertion(run, controls) && fault.evidence.some(pointer => packet.specs.includes(pointer.path)), 'fault credit lacks healthy matched assertions and authored evidence');
    }
    return { planned, receipt, outcome, verification, source, acceptance: source !== null && Buffer.byteLength(source) > MAX_SOURCE_BYTES ? {status:'expanded-analysis',sourceBytes:Buffer.byteLength(source),originalMaximumSourceBytes:MAX_SOURCE_BYTES} : null, packet, packetFiles, observed };
  });
  const panels = selected.judges.map((pins, index) => {
    keys(pins, ['receipt', 'launch', ...(pins.validated ? ['validated'] : [])], 'review pins');
    const receipt = native(pins, judges[index], reviewPlan.pins[`review-prompt-${index + 1}.txt`], reviewPlan.pins['review-system.txt'], reviewPlan.pins['review.schema.json']), validated = pins.validated ? read(pins.validated, 'validated review') : null;
    if (validated) {
      assert(receipt.status === 'complete' && validated.status === 'complete' && validated.configurationId === judges[index] && same(validated.usage, receipt.usage) && same(review.judges[index], validated), 'validated review differs from receipt');
      const output = JSON.parse(receipt.finalText); ids(Object.keys(output), Object.keys(mapping), 'native review labels'); ids(Object.keys(validated.judgments), reviewedRows.map(row => row.id), 'native review suites');
      for (const [label, id] of Object.entries(mapping)) assert(same(output[label], validated.judgments[id]), 'selected native finding differs');
    } else assert(review.judges[index].configurationId === judges[index] && review.judges[index].status !== 'complete', 'complete review has no validated output');
    return { pins, receipt, validated };
  });
  const rows = artifacts.map(artifact => {
    const evidence = pointers => pointers.map(pointer => {
      keys(pointer, ['path', 'startLine', 'endLine'], 'native pointer'); const file = artifact.packetFiles.get(pointer.path);
      assert(file && Number.isInteger(pointer.startLine) && pointer.startLine > 0 && Number.isInteger(pointer.endLine) && pointer.endLine >= pointer.startLine && pointer.endLine <= file.content.split('\n').length, 'evidence outside frozen packet');
      return { file: path.posix.basename(pointer.path), version: pointer.path.startsWith('final/') ? 'final' : pointer.path.startsWith('context/') ? 'context' : 'shared', startLine: pointer.startLine, endLine: pointer.endLine };
    });
    const judgments = panels.map((panel, index) => {
      const record = panel.validated?.judgments[artifact.planned.id];
      if (!record) return { judgeConfigurationId: judges[index], reviewSha256: panel.pins.receipt.sha256, status: 'incomplete', score: null, dimensions: rubric.dimensions.map(({ id }) => ({ id, score: null, reason: null, evidence: [] })) };
      keys(record, ['dimensions'], 'native judgment'); keys(record.dimensions, CRAFT.map(item => item.id), 'native dimensions');
      const dimensions = rubric.dimensions.map(({ id }) => { const finding = record.dimensions[id]; keys(finding, ['score', 'reason', 'evidence'], 'native finding'); assert(finding.evidence.length >= 1 && finding.evidence.length <= 2, 'native finding lacks evidence'); if (id === 'semantic_naming' && finding.score === 0 && artifact.source !== null) assert(finding.evidence.some(pointer => artifact.packet.specs.includes(pointer.path)), 'naming zero does not cite authored code'); return { id, score: finding.score, reason: finding.reason, evidence: evidence(finding.evidence) }; });
      return { judgeConfigurationId: judges[index], reviewSha256: panel.pins.receipt.sha256, status: 'complete', score: craftScore(dimensions), dimensions };
    });
    const score = mean(judgments.map(judge => judge.score)), runs = [...(artifact.verification?.controlRuns ?? []), ...(artifact.verification?.faultRuns ?? [])];
    return { id: `${artifact.planned.configurationId}:${artifact.planned.condition}`, configurationId: artifact.planned.configurationId, label: BACKEND_TESTING_CONFIGURATIONS.find(item => item.id === artifact.planned.configurationId).label, condition: artifact.planned.condition, origin: 'current-round', ...(artifact.acceptance ? {acceptance:artifact.acceptance} : {}), generationStatus: artifact.receipt.status, executionStatus: artifact.verification?.status ?? 'not-run', testStatus: artifact.outcome.testStatus ?? 'not-run', cleanupStatus: artifact.outcome.cleanupStatus ?? 'not-run', elapsedMs: artifact.receipt.elapsedMs ?? null, verificationMs: runs.length && runs.every(run => Number.isFinite(run.elapsedMs)) ? runs.reduce((sum, run) => sum + run.elapsedMs, 0) : null, inputTokens: authorInputTokens(artifact.receipt), outputTokens: artifact.receipt.usage?.output_tokens ?? null, status: score === null ? 'incomplete' : 'scored', score, range: { minimum: score === null ? null : Math.min(...judgments.map(judge => judge.score)), maximum: score === null ? null : Math.max(...judgments.map(judge => judge.score)) }, objective: { faultDetection: artifact.observed.faultDetection, runnable: artifact.observed.runnable, verificationSha256: artifact.observed.verificationSha256, faults: artifact.observed.faults.map(fault => ({ ...fault, evidence: evidence(fault.evidence) })) }, judgments };
  });
  const totals = receipts.map(receipt => {
    if (!receipt.usage) return null;
    const fields = receipt.configuration.provider === 'claude' ? ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'] : ['input_tokens', 'output_tokens'];
    assert(fields.every(field => receipt.usage[field] == null || Number.isInteger(receipt.usage[field]) && receipt.usage[field] >= 0), 'invalid native usage');
    return fields.every(field => receipt.usage[field] != null) ? fields.reduce((sum, field) => sum + receipt.usage[field], 0) : null;
  });
  const sourcePins = testAuthoringSourcePins(selected, plan); assert(new Set(sourcePins.map(pin => pin.path)).size === sourcePins.length, 'duplicate selected source pins');
  const round = validateTestAuthoringRound({ kind: 'test-authoring-round', schemaVersion: selected.schemaVersion, date: plan.date, caseId: plan.caseId, sourceSha256: hash(sourcePins.map(pin => pin.sha256).join('\n')), skillSha256: selected.skill.sha256, sourceCodeSha256: plan.sourceHash, status: rows.every(row => row.status === 'scored') ? provisional ? 'provisional' : 'complete' : 'incomplete', ...(provisional ? {reviewBasis:structuredClone(PROVISIONAL_REVIEW_BASIS)} : {}), ...(sourcePolicy ? {sourcePolicy} : {}), scoreBasis: { minimum: 0, maximum: 1, decimals: 2, aggregation: provisional ? scoreBasis(true).aggregation : rubric.aggregation, dimensions: rubric.dimensions, objectiveDimensions: rubric.objectiveDimensions, namingZeroRule: rubric.namingZeroRule }, provenance: { freshAuthorSessions: activeRows.length, reusedBaselineArtifacts: 0, reviewerSessions: judges.length, authorTimeoutMs: plan.policy.authorTimeoutMs, reviewTimeoutMs: plan.policy.reviewTimeoutMs, nativeSessions: receipts.length, knownTokens: totals.reduce((sum, total) => sum + (total ?? 0), 0), usageMissingSessions: totals.filter(total => total === null).length, verifierSha256: plan.verifier.sha256, calibrationSha256: selected.calibration.sha256, objectiveAdjudicationSha256: selected.objective.sha256 }, rows, summaries: pairedSummaries(rows) });
  const projection = projectTestAuthoring(round);
  for (const artifact of artifacts) {
    const summary = review.rows.find(row => row.id === artifact.planned.id), score = projection.overall.rows.find(row => row.id === `${artifact.planned.configurationId}:${artifact.planned.condition}`).score;
    assert(summary?.configurationId === artifact.planned.configurationId && summary.condition === artifact.planned.condition && close(summary.score, score) && summary.faultDetection === artifact.observed.faultDetection && summary.runnable === artifact.observed.runnable, 'reported score differs from independently derived evidence');
  }
  const files = { kind: 'test-authoring-files', schemaVersion: selected.schemaVersion, sourceSha256: sourcePolicy ? round.sourceSha256 : selected.packet.sha256, ...(sourcePolicy ? {sourcePolicy} : {}), rows: artifacts.map(artifact => ({ id: `${artifact.planned.configurationId}:${artifact.planned.condition}`, configurationId: artifact.planned.configurationId, condition: artifact.planned.condition, ...(artifact.acceptance ? {acceptance:artifact.acceptance} : {}), files: artifact.source === null ? [] : [{ path: plan.testPath, sha256: hash(artifact.source), content: artifact.source }] })) };
  validateTestAuthoringPublication(projection, round); validateTestAuthoringFiles(files, round);
  return { projection, round, files, basisSha256: projection.sourceSha256 };
}

export function buildTestAuthoringPublication({ repoRootDirectory, readFileSyncImplementation = fs.readFileSync }) {
  let selection;
  try { selection = JSON.parse(readFileSyncImplementation(path.join(repoRootDirectory, 'benchmarks/test-authoring/publication.json')).toString()); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  return buildSelectedTestAuthoringPublication({ selected: selection, repoRootDirectory, readFileSyncImplementation });
}

