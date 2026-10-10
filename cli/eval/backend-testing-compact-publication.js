import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { BACKEND_TESTING_CONFIGURATIONS } from './backend-testing-publication.js';

const SHA256 = /^[a-f0-9]{64}$/;
const JUDGES = ['codex:gpt-6-astra@xhigh', 'claude:claude-opus-5-5@xhigh'];
const CONDITIONS = [{ id: 'none', label: 'Minimal' }, { id: 'repaired', label: 'Current skill' }];
const WEIGHTS = { assertion_quality: 25, behavioral_coverage: 20, boundary_fidelity: 15, domain_structure: 10, clarity: 10, maintenance_economy: 10, semantic_naming: 10 };
const assert = (valid, message) => { if (!valid) throw new Error(`Backend testing compact publication: ${message}`); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const close = (left, right) => left === right || Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1e-10;
const keys = (value, allowed, label) => assert(value && typeof value === 'object' && !Array.isArray(value) && same(Object.keys(value).sort(), [...allowed].sort()), `${label} keys differ`);
const ids = (observed, expected, label) => assert(Array.isArray(observed) && new Set(observed).size === observed.length && same([...observed].sort(), [...expected].sort()), `${label} identities differ`);
const mean = values => values.length && values.every(Number.isFinite) ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const rowIds = () => BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => CONDITIONS.map(condition => `${configuration.id}:${condition.id}`));
const weighted = (dimensions, rubric) => dimensions.every(dimension => Number.isFinite(dimension.score)) ? rubric.reduce((sum, dimension) => sum + dimensions.find(item => item.id === dimension.id).score * dimension.weight, 0) / 100 : null;
const pairs = rows => BACKEND_TESTING_CONFIGURATIONS.map(configuration => {
  const baseline = rows.find(row => row.configurationId === configuration.id && row.condition === 'none').score;
  const treatment = rows.find(row => row.configurationId === configuration.id && row.condition === 'repaired').score;
  return { configurationId: configuration.id, baseline, treatment, delta: Number.isFinite(baseline) && Number.isFinite(treatment) ? treatment - baseline : null };
});
const prose = value => assert(typeof value === 'string' && value.length >= 1 && value.length <= 320 && !/\/(?:Users|home|tmp|private|var|etc)\/|\.agents\/|https?:\/\/|```/.test(value), 'unsafe review reason');

function validateEvidence(evidence) {
  assert(Array.isArray(evidence) && evidence.length <= 2, 'invalid evidence inventory');
  for (const pointer of evidence) {
    keys(pointer, ['file', 'version', 'startLine', 'endLine'], 'evidence');
    assert(typeof pointer.file === 'string' && /^[A-Za-z0-9_.-]+$/.test(pointer.file) && ['original', 'final', 'context', 'shared'].includes(pointer.version) && Number.isInteger(pointer.startLine) && pointer.startLine > 0 && Number.isInteger(pointer.endLine) && pointer.endLine >= pointer.startLine, 'invalid evidence pointer');
  }
}

export const BACKEND_TESTING_SCORE_CRITERIA = [
  { id: 'preservation', label: 'Preserved existing protection', weight: 25, source: 'protection' },
  { id: 'behavioral_coverage', label: 'Behavioral coverage', weight: 20, source: 'dimension' },
  { id: 'assertion_quality', label: 'Assertion quality', weight: 15, source: 'dimension' },
  { id: 'boundary_fidelity', label: 'Test-layer fidelity', weight: 10, source: 'dimension' },
  { id: 'semantic_naming', label: 'Semantic variable names', weight: 10, source: 'dimension' },
  { id: 'domain_structure', label: 'Domain structure', weight: 5, source: 'dimension' },
  { id: 'clarity', label: 'Clarity and diagnosis', weight: 5, source: 'dimension' },
  { id: 'maintenance_economy', label: 'Maintenance cost', weight: 5, source: 'dimension' },
  { id: 'runnable_coverage', label: 'Meaningful runnable coverage', weight: 5, source: 'coverage' },
];
const overallScoreBasis = () => ({
  id: 'backend-testing-weighted-evidence-v1', maximum: 100, adoption: 'user-requested-after-reviews',
  aggregation: 'Sum each criterion rating times its percentage weight, then average both reviewers. Preservation and runnable coverage use the saved binary findings; the other seven ratings remain unchanged. No caps or whole-score overrides. Unresolved required evidence has no total. Preservation separately values avoiding regressions and overlaps with overall behavioral coverage.',
  criteria: BACKEND_TESTING_SCORE_CRITERIA.map(criterion => ({ ...criterion })),
});
const findingScore = (status, accepted, rejected) => status === accepted ? 1 : status === rejected ? 0 : null;
const contributionTotal = contributions => contributions.every(contribution => Number.isFinite(contribution.points)) ? Number(contributions.reduce((sum, contribution) => sum + contribution.points, 0).toFixed(2)) : null;

export function deriveBackendTestingCompactOverall(round) {
  const rows = round.rows.map(row => {
    const judgments = row.judgments.map(judge => {
      const contributions = BACKEND_TESTING_SCORE_CRITERIA.map(criterion => {
        const finding = criterion.source === 'dimension' ? judge.dimensions.find(dimension => dimension.id === criterion.id) : judge[criterion.source];
        const observed = criterion.source === 'dimension' ? finding?.score : criterion.source === 'protection' ? findingScore(finding?.status, 'retained', 'lost') : findingScore(finding?.status, 'yes', 'no');
        const score = judge.status === 'complete' && finding?.evidence.length > 0 && Number.isFinite(observed) ? observed : null;
        return { id: criterion.id, score, weight: criterion.weight, points: score === null ? null : Number((score * criterion.weight).toFixed(2)) };
      });
      return { judgeConfigurationId: judge.judgeConfigurationId, qualityReviewSha256: judge.reviewSha256, protectionReviewSha256: judge.reviewSha256,
        protectionStatus: judge.status, protection: judge.protection.status, coverage: judge.coverage.status, contributions, score: contributionTotal(contributions) };
    });
    const score = mean(judgments.map(judge => judge.score));
    return { id: row.id, configurationId: row.configurationId, condition: row.condition, status: score === null ? 'incomplete' : 'scored', score, protection: row.protection, judgments };
  });
  const summaries = pairs(rows), scoreBasis = overallScoreBasis();
  return { schemaVersion: 2, sourceSha256: hash([round.sourceSha256, JSON.stringify(scoreBasis)].join('\n')), scoreBasis, status: rows.every(row => row.status === 'scored') ? 'complete' : 'incomplete', rows, summaries,
    baselineMean: mean(summaries.map(summary => summary.baseline)), treatmentMean: mean(summaries.map(summary => summary.treatment)), meanPairedDifference: mean(summaries.map(summary => summary.delta)) };
}

export function validateBackendTestingCompactRound(round) {
  keys(round, ['kind', 'schemaVersion', 'date', 'caseId', 'sourceSha256', 'skillSha256', 'sourceCodeSha256', 'status', 'scoreBasis', 'provenance', 'rows', 'summaries', 'dimensionSummaries', 'baselineMean', 'treatmentMean', 'meanPairedDifference'], 'round');
  assert(round.kind === 'backend-testing-current-round' && round.schemaVersion === 1 && /^\d{4}-\d{2}-\d{2}$/.test(round.date) && round.caseId === 'player-saves' && [round.sourceSha256, round.skillSha256, round.sourceCodeSha256].every(value => SHA256.test(value)), 'invalid round identity');
  const basis = round.scoreBasis;
  keys(basis, ['minimum', 'maximum', 'decimals', 'aggregation', 'dimensions', 'namingZeroRule'], 'score basis');
  assert(basis.minimum === 0 && basis.maximum === 1 && basis.decimals === 2 && typeof basis.aggregation === 'string' && typeof basis.namingZeroRule === 'string', 'invalid score instrument');
  ids(basis.dimensions?.map(dimension => dimension.id), Object.keys(WEIGHTS), 'rubric dimension');
  for (const dimension of basis.dimensions) {
    keys(dimension, ['id', 'label', 'weight', 'description', 'anchors'], 'rubric dimension');
    assert(dimension.weight === WEIGHTS[dimension.id] && typeof dimension.label === 'string' && typeof dimension.description === 'string', 'rubric weight or text differs');
    keys(dimension.anchors, ['0', '0.5', '1'], 'rubric anchors');
    assert(Object.values(dimension.anchors).every(value => typeof value === 'string' && value.length > 0), 'rubric anchors missing');
  }
  keys(round.provenance, ['freshAuthorSessions', 'reusedBaselineArtifacts', 'reviewerSessions', 'authorTimeoutMs', 'reviewTimeoutMs', 'nativeSessions', 'knownTokens', 'usageMissingSessions', 'baselineSourceSha256', 'baselinePromptSha256', 'verifierSha256'], 'provenance');
  const provenance = round.provenance;
  assert(provenance.freshAuthorSessions === 4 && provenance.reusedBaselineArtifacts === 4 && provenance.reviewerSessions === 2 && provenance.nativeSessions === 6 && [provenance.authorTimeoutMs, provenance.reviewTimeoutMs].every(value => Number.isInteger(value) && value > 0) && [provenance.knownTokens, provenance.usageMissingSessions].every(value => Number.isInteger(value) && value >= 0) && provenance.usageMissingSessions <= 6 && [provenance.baselineSourceSha256, provenance.baselinePromptSha256, provenance.verifierSha256].every(value => SHA256.test(value)), 'invalid round provenance');
  assert(round.sourceCodeSha256 === provenance.baselineSourceSha256, 'reused baseline source differs');
  ids(round.rows?.map(row => row.id), rowIds(), 'round artifact');
  for (const row of round.rows) {
    keys(row, ['id', 'configurationId', 'label', 'condition', 'origin', 'generationStatus', 'executionStatus', 'testStatus', 'cleanupStatus', 'elapsedMs', 'verificationMs', 'inputTokens', 'outputTokens', 'status', 'score', 'range', 'protection', 'dimensions', 'judgments'], 'round row');
    assert(row.id === `${row.configurationId}:${row.condition}` && row.label === BACKEND_TESTING_CONFIGURATIONS.find(configuration => configuration.id === row.configurationId)?.label && row.origin === (row.condition === 'none' ? 'reused-baseline' : 'current-round'), 'invalid artifact origin');
    assert(['complete', 'timeout', 'failed', 'invalid-submission', 'infrastructure-failure'].includes(row.generationStatus) && ['valid', 'invalid', 'unresolved', 'not-run'].includes(row.executionStatus) && ['pass', 'assertion-failure', 'execution-failure', 'timeout', 'infrastructure-failure', 'not-run'].includes(row.testStatus) && ['pass', 'failed', 'not-run'].includes(row.cleanupStatus), 'invalid execution outcome');
    for (const field of ['elapsedMs', 'verificationMs', 'inputTokens', 'outputTokens']) assert(row[field] === null || Number.isFinite(row[field]) && row[field] >= 0, 'invalid row resource');
    ids(row.judgments?.map(judge => judge.judgeConfigurationId), JUDGES, 'native reviewer');
    for (const judge of row.judgments) {
      keys(judge, ['judgeConfigurationId', 'reviewSha256', 'status', 'score', 'dimensions', 'protection', 'coverage'], 'reviewer');
      assert(SHA256.test(judge.reviewSha256) && ['complete', 'incomplete'].includes(judge.status), 'invalid native review');
      ids(judge.dimensions?.map(dimension => dimension.id), Object.keys(WEIGHTS), 'native dimension');
      for (const dimension of judge.dimensions) {
        keys(dimension, ['id', 'score', 'reason', 'evidence'], 'native dimension');
        assert(dimension.score === null || Number.isFinite(dimension.score) && dimension.score >= 0 && dimension.score <= 1 && Math.abs(dimension.score * 100 - Math.round(dimension.score * 100)) < 1e-7, 'invalid native dimension rating');
        if (dimension.reason !== null) prose(dimension.reason);
        validateEvidence(dimension.evidence);
        assert(judge.status !== 'complete' || dimension.score !== null && dimension.reason !== null, 'completed review has missing ratings');
      }
      keys(judge.protection, ['status', 'reason', 'evidence'], 'protection');
      assert(['retained', 'lost', 'unresolved'].includes(judge.protection.status), 'invalid protection finding');
      if (judge.protection.reason !== null) prose(judge.protection.reason);
      validateEvidence(judge.protection.evidence);
      keys(judge.coverage, ['status', 'reason', 'evidence'], 'coverage');
      assert(['yes', 'no', 'unresolved'].includes(judge.coverage.status), 'invalid coverage finding');
      if (judge.coverage.reason !== null) prose(judge.coverage.reason);
      validateEvidence(judge.coverage.evidence);
      assert(close(judge.score, judge.status === 'complete' ? weighted(judge.dimensions, basis.dimensions) : null), 'native weighted total differs');
    }
    const protection = row.judgments.some(judge => judge.protection.status === 'lost') ? 'lost' : row.judgments.every(judge => judge.protection.status === 'retained') ? 'retained' : 'unresolved';
    const score = mean(row.judgments.map(judge => judge.score));
    assert(row.protection === protection && close(row.score, score) && row.status === (score === null ? 'incomplete' : 'scored'), 'panel total or protection differs');
    const scores = row.judgments.map(judge => judge.score), range = { minimum: score === null ? null : Math.min(...scores), maximum: score === null ? null : Math.max(...scores) };
    assert(same(row.range, range), 'panel range differs');
    ids(row.dimensions?.map(dimension => dimension.id), Object.keys(WEIGHTS), 'panel dimensions');
    for (const dimension of row.dimensions) {
      keys(dimension, ['id', 'score', 'range'], 'panel dimension');
      const ratings = row.judgments.map(judge => judge.dimensions.find(item => item.id === dimension.id).score), rating = mean(ratings);
      assert(close(dimension.score, rating) && same(dimension.range, { minimum: rating === null ? null : Math.min(...ratings), maximum: rating === null ? null : Math.max(...ratings) }), 'panel dimension differs');
    }
  }
  const summaries = compactQualitySummaries(round.rows, basis.dimensions);
  assert(same(round.summaries, summaries) && same(round.dimensionSummaries, compactDimensionSummaries(summaries, basis.dimensions)) && close(round.baselineMean, mean(summaries.map(summary => summary.baseline))) && close(round.treatmentMean, mean(summaries.map(summary => summary.treatment))) && close(round.meanPairedDifference, mean(summaries.map(summary => summary.delta))) && round.status === (round.rows.every(row => row.status === 'scored') ? 'complete' : 'incomplete'), 'round summary differs');
  return round;
}

function compactQualitySummaries(rows, dimensions) {
  return pairs(rows).map(summary => ({ ...summary, dimensions: dimensions.map(({ id }) => {
    const baseline = rows.find(row => row.configurationId === summary.configurationId && row.condition === 'none').dimensions.find(dimension => dimension.id === id).score;
    const treatment = rows.find(row => row.configurationId === summary.configurationId && row.condition === 'repaired').dimensions.find(dimension => dimension.id === id).score;
    return { id, baseline, treatment, delta: Number.isFinite(baseline) && Number.isFinite(treatment) ? treatment - baseline : null };
  }) }));
}

function compactDimensionSummaries(summaries, dimensions) {
  return dimensions.map(({ id }) => ({ id, ...Object.fromEntries(['baseline', 'treatment', 'delta'].map(field => [field, mean(summaries.map(summary => summary.dimensions.find(dimension => dimension.id === id)[field]))])) }));
}

export function projectBackendTestingCompact(round) {
  validateBackendTestingCompactRound(round);
  const overall = deriveBackendTestingCompactOverall(round);
  return { kind: 'vasirbenchmark-backend-testing', schemaVersion: 4, benchmark: { id: 'backend-testing', title: 'Backend test-suite quality', description: 'Four model settings maintain the same existing test suite with minimal instructions or the current testing skill.' }, sourceSha256: hash([round.sourceSha256, overall.sourceSha256].join('\n')), date: round.date, caseId: round.caseId, scope: 'one-known-case-development', configurations: BACKEND_TESTING_CONFIGURATIONS.map(configuration => ({ ...configuration })), conditions: CONDITIONS.map(condition => ({ ...condition })), trials: 1, overall, provenance: { ...round.provenance }, nativeSessions: round.provenance.nativeSessions, knownTokens: round.provenance.knownTokens, usageMissingSessions: round.provenance.usageMissingSessions };
}

export function validateBackendTestingCompactPublication(publication, round) {
  keys(publication, ['kind', 'schemaVersion', 'benchmark', 'sourceSha256', 'date', 'caseId', 'scope', 'configurations', 'conditions', 'trials', 'overall', 'provenance', 'nativeSessions', 'knownTokens', 'usageMissingSessions'], 'publication');
  assert(publication.kind === 'vasirbenchmark-backend-testing' && publication.schemaVersion === 4 && SHA256.test(publication.sourceSha256) && publication.caseId === 'player-saves' && publication.scope === 'one-known-case-development' && publication.trials === 1 && same(publication.configurations, BACKEND_TESTING_CONFIGURATIONS) && same(publication.conditions, CONDITIONS), 'invalid compact publication');
  assert(publication.overall?.schemaVersion === 2 && same(publication.overall.scoreBasis, overallScoreBasis()), 'invalid weighted score basis');
  assert(publication.nativeSessions === 6 && publication.provenance?.nativeSessions === publication.nativeSessions && publication.knownTokens === publication.provenance.knownTokens && publication.usageMissingSessions === publication.provenance.usageMissingSessions, 'publication resources differ');
  const overall = publication.overall;
  ids(overall.rows?.map(row => row.id), rowIds(), 'final score artifact');
  for (const row of overall.rows) {
    assert(row.id === `${row.configurationId}:${row.condition}`, 'final score artifact identity differs');
    ids(row.judgments?.map(judge => judge.judgeConfigurationId), JUDGES, 'final score reviewer');
    for (const judge of row.judgments) {
      keys(judge, ['judgeConfigurationId', 'qualityReviewSha256', 'protectionReviewSha256', 'protectionStatus', 'protection', 'coverage', 'contributions', 'score'], 'final reviewer');
      assert(SHA256.test(judge.qualityReviewSha256) && judge.protectionReviewSha256 === judge.qualityReviewSha256 && ['yes', 'no', 'unresolved'].includes(judge.coverage) && ['retained', 'lost', 'unresolved'].includes(judge.protection) && ['complete', 'incomplete'].includes(judge.protectionStatus), 'final score lacks matching native review evidence');
      ids(judge.contributions?.map(contribution => contribution.id), BACKEND_TESTING_SCORE_CRITERIA.map(criterion => criterion.id), 'weighted criterion');
      for (const contribution of judge.contributions) {
        keys(contribution, ['id', 'score', 'weight', 'points'], 'weighted contribution');
        const criterion = BACKEND_TESTING_SCORE_CRITERIA.find(criterion => criterion.id === contribution.id);
        assert(contribution.weight === criterion.weight && (contribution.score === null || Number.isFinite(contribution.score) && contribution.score >= 0 && contribution.score <= 1), 'invalid weighted contribution');
        const expectedFinding = criterion.source === 'protection' ? findingScore(judge.protection, 'retained', 'lost') : criterion.source === 'coverage' ? findingScore(judge.coverage, 'yes', 'no') : contribution.score;
        assert(contribution.score === null || judge.protectionStatus === 'complete' && contribution.score === expectedFinding, 'weighted finding differs from native finding');
        assert(close(contribution.points, contribution.score === null ? null : Number((contribution.score * contribution.weight).toFixed(2))), 'weighted contribution arithmetic differs');
      }
      assert(close(judge.score, contributionTotal(judge.contributions)), 'final reviewer score differs');
    }
    const score = mean(row.judgments.map(judge => judge.score));
    assert(close(row.score, score) && row.status === (score === null ? 'incomplete' : 'scored'), 'final panel score differs');
  }
  const summaries = pairs(overall.rows);
  assert(same(overall.summaries, summaries) && overall.status === (overall.rows.every(row => row.status === 'scored') ? 'complete' : 'incomplete') && close(overall.baselineMean, mean(summaries.map(summary => summary.baseline))) && close(overall.treatmentMean, mean(summaries.map(summary => summary.treatment))) && close(overall.meanPairedDifference, mean(summaries.map(summary => summary.delta))), 'final summary differs');
  if (round) assert(same(publication, projectBackendTestingCompact(round)), 'publication differs from native round');
  return publication;
}

export function validateBackendTestingCompactFiles(files, round) {
  keys(files, ['kind', 'schemaVersion', 'sourceSha256', 'rows'], 'test file archive');
  assert(files.kind === 'backend-testing-files' && files.schemaVersion === 1 && SHA256.test(files.sourceSha256), 'invalid file archive');
  ids(files.rows?.map(row => row.id), round.rows.map(row => row.id), 'test file artifact');
  for (const row of files.rows) {
    keys(row, ['id', 'configurationId', 'condition', 'files'], 'test file row');
    assert(row.id === `${row.configurationId}:${row.condition}` && Array.isArray(row.files) && new Set(row.files.map(file => file.path)).size === row.files.length, 'test file identity differs');
    for (const file of row.files) {
      keys(file, ['path', 'sha256', 'content'], 'test file');
      assert(typeof file.path === 'string' && /^test\/[A-Za-z0-9_./-]+\.spec\.js$/.test(file.path) && !file.path.split('/').includes('..') && typeof file.content === 'string' && SHA256.test(file.sha256) && hash(file.content) === file.sha256, 'test file source bytes or path differ');
    }
  }
  return files;
}

export function backendTestingCompactSourcePins(selected, plan) {
  return [...['plan', 'skill', 'rubric', 'generation', 'reviewPlan', 'packet', 'mapping', 'review'].map(key => selected[key]), plan.sourceAuthorPlan, plan.fixture,
    ...selected.authors.flatMap(author => [author.receipt, author.launch, author.outcome, ...(author.verification ? [author.verification] : [])]),
    ...selected.judges.flatMap(judge => [judge.receipt, judge.launch, ...(judge.validated ? [judge.validated] : [])])];
}

export function buildBackendTestingCompactPublication({ selected, repoRootDirectory, readFileSyncImplementation = fs.readFileSync }) {
  keys(selected, ['kind', 'schemaVersion', 'plan', 'skill', 'rubric', 'generation', 'reviewPlan', 'packet', 'mapping', 'review', 'authors', 'judges'], 'selection');
  assert(selected.kind === 'vasirbenchmark-backend-testing-selection' && selected.schemaVersion === 4, 'invalid selected round');
  const read = (pin, label) => {
    keys(pin, ['path', 'sha256'], `${label} pin`);
    assert(typeof pin.path === 'string' && pin.path.startsWith('.agents/vasir-evals/backend-testing/') && !pin.path.includes('\\') && pin.path.split('/').every(part => part && part !== '.' && part !== '..') && SHA256.test(pin.sha256), 'unsafe source pin');
    const bytes = readFileSyncImplementation(path.join(repoRootDirectory, pin.path));
    assert(hash(bytes) === pin.sha256, `${label} source hash mismatch`);
    return JSON.parse(bytes.toString());
  };
  const plan = read(selected.plan, 'plan'), rubric = read(selected.rubric, 'rubric'), generation = read(selected.generation, 'generation'), reviewPlan = read(selected.reviewPlan, 'review plan'), packets = read(selected.packet, 'packet'), mapping = read(selected.mapping, 'mapping'), review = read(selected.review, 'review');
  read(selected.skill, 'skill');
  const baselinePlan = read(plan.sourceAuthorPlan, 'baseline author plan'); read(plan.fixture, 'fixture');
  assert(plan.kind === 'backend-testing-compact-round' && plan.schemaVersion === 1 && /^\d{4}-\d{2}-\d{2}$/.test(plan.date) && plan.caseId === 'player-saves' && plan.skillSha256 === selected.skill.sha256 && plan.rubricSha256 === selected.rubric.sha256 && plan.sourceHash === baselinePlan.sourceHash && plan.verifierSha256 === baselinePlan.verifierSha256 && plan.runnerSha256 === baselinePlan.runnerSha256 && plan.pins?.['prompt-none.txt'] === baselinePlan.pins?.['prompt-none.txt'] && plan.pins?.['author.schema.json'] === baselinePlan.pins?.['author.schema.json'], 'frozen task, source or baseline instrument differs');
  assert(plan.scoreBasis?.adoption === 'adopted-before-round' && plan.scoreBasis.protectionLossMaximum === 49 && plan.scoreBasis.noMeaningfulCoverageScore === 0 && plan.scoreBasis.rubricSha256 === selected.rubric.sha256 && rubric.kind === 'backend-testing-craft-rubric' && rubric.schemaVersion === 3, 'prospective scoring instrument differs');
  assert(plan.policy?.authorSessions === 4 && plan.policy.reusedAuthors === 4 && plan.policy.reviewSessions === 2 && plan.policy.tools === false && plan.policy.automaticRetries === 0 && plan.policy.concurrency === 4 && plan.policy.authorTimeoutMs === 600000 && plan.policy.reviewTimeoutMs === 600000, 'compact execution policy differs');
  ids(plan.rows?.map(row => `${row.configurationId}:${row.condition}`), rowIds(), 'planned artifact');
  assert(plan.rows.every(row => row.trial === 1 && row.reused === (row.condition === 'none')) && plan.reusedBaselines?.length === 4 && selected.authors?.length === 8 && selected.judges?.length === 2 && generation.kind === plan.kind && generation.rows?.length === 8, 'compact source cohort differs');
  ids(Object.keys(mapping), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], 'blind label'); ids(Object.values(mapping), plan.rows.map(row => row.id), 'blind artifact');
  assert(reviewPlan.kind === 'backend-testing-compact-review' && reviewPlan.schemaVersion === 1 && same(reviewPlan.judges, JUDGES) && reviewPlan.pins?.['plan.json'] === selected.plan.sha256 && reviewPlan.pins?.['taste-rubric.json'] === selected.rubric.sha256 && reviewPlan.pins?.['generation-summary.json'] === selected.generation.sha256 && reviewPlan.pins?.['packet.json'] === selected.packet.sha256 && reviewPlan.pins?.['mapping.json'] === selected.mapping.sha256 && reviewPlan.policy?.nativeSessions === 2 && reviewPlan.policy.tools === false && reviewPlan.policy.automaticRetries === 0 && reviewPlan.policy.timeoutMs === plan.policy.reviewTimeoutMs, 'blind review inputs or policy differ');
  assert(review.kind === reviewPlan.kind && review.schemaVersion === 1 && review.judges?.length === 2 && review.rows?.length === 8, 'review summary inventory differs');
  const receipts = [];
  const native = (selectedNative, configurationId, label, promptSha256, systemSha256, schemaSha256) => {
    const receipt = read(selectedNative.receipt, `${label} receipt`), launch = read(selectedNative.launch, `${label} launch`);
    const [provider, setting] = configurationId.split(':'), [model, reasoning] = setting.split('@');
    assert(same(receipt.configuration, { id: configurationId, provider, model, reasoning }) && same(launch.configuration, receipt.configuration) && receipt.toolsAllowed === false && receipt.toolUse === false && launch.toolsAllowed === false && launch.promptSha256 === promptSha256 && launch.systemInstructionsSha256 === systemSha256 && launch.outputSchemaSha256 === schemaSha256, `${label} native identity or inputs differ`);
    assert(['complete', 'failed', 'infrastructure-failure', 'timeout', 'invalid-submission'].includes(receipt.status) && receipt.complete === (receipt.status === 'complete') && receipt.timedOut === (receipt.status === 'timeout') && receipt.runtime?.requestedReasoning === reasoning && receipt.preflight?.some(item => item.configurationId === configurationId && item.model === model && item.effort === reasoning && item.accepted === true), `${label} exact native configuration differs`);
    assert(provider === 'codex' ? receipt.runtime.requestedModel === model && receipt.runtime.modelIdentityEvidence === 'exact-native-catalog-selection-and-cli-invocation-no-fallback' : receipt.runtime.model === model && receipt.runtime.exactModel === true && same(receipt.runtime.assistantModels, [model]), `${label} native model differs`);
    return receipt;
  };
  const artifacts = plan.rows.map((planned, index) => {
    const selectedAuthor = selected.authors[index]; keys(selectedAuthor, ['receipt', 'launch', 'outcome', ...(selectedAuthor.verification ? ['verification'] : [])], 'author');
    if (planned.reused) {
      const original = plan.reusedBaselines.find(row => row.id === planned.id && row.configurationId === planned.configurationId);
      assert(original && baselinePlan.rows.some(row => row.id === planned.id && row.configurationId === planned.configurationId && row.condition === 'none') && ['receipt', 'launch', 'outcome', 'verification'].every(key => same(original[key], selectedAuthor[key])), 'baseline receipt or artifact was replaced');
    }
    const receipt = native(selectedAuthor, planned.configurationId, `author ${index + 1}`, plan.pins[`prompt-${planned.condition}.txt`], plan.pins['system.txt'], plan.pins['author.schema.json']);
    if (!planned.reused) receipts.push(receipt);
    const outcome = read(selectedAuthor.outcome, 'author outcome'), generated = generation.rows[index];
    assert(['id', 'configurationId', 'condition', 'trial'].every(field => outcome[field] === planned[field]) && same(generated, { ...outcome, ...planned }) && same(outcome.usage, receipt.usage), 'generation summary differs from native author');
    const verification = selectedAuthor.verification ? read(selectedAuthor.verification, 'verification') : null;
    if (verification) assert(receipt.status === 'complete' && verification.schemaVersion === 2 && verification.rowId === planned.id && verification.caseId === plan.caseId && verification.evaluatorSha256 === plan.verifierSha256 && outcome.status === verification.status && outcome.testStatus === verification.testStatus && outcome.cleanupStatus === verification.cleanupStatus && same(outcome.controls, verification.controlRuns.map(run => ({ status: run.testStatus, cleanupStatus: run.cleanupStatus, passes: run.stats?.passes }))) && same(outcome.faults, verification.faultRuns.map(run => ({ id: run.faultId, status: run.status }))), 'trusted execution differs');
    const label = Object.keys(mapping).find(key => mapping[key] === planned.id), packet = packets[label];
    assert(packet && Array.isArray(packet.files) && Array.isArray(packet.specs) && verification, 'selected artifact lacks executed source packet');
    const packetFiles = new Map();
    for (const file of packet.files) {
      assert(typeof file.path === 'string' && !file.path.startsWith('/') && !file.path.split('/').includes('..') && typeof file.content === 'string' && hash(file.content) === file.sha256 && !packetFiles.has(file.path), 'packet source bytes differ');
      if (file.path.startsWith('final/')) assert(verification.artifactFiles.some(artifact => artifact.path === file.path.slice(6) && artifact.sha256 === file.sha256), 'final source differs from executed artifact');
      packetFiles.set(file.path, file);
    }
    ids(packet.specs, packet.files.filter(file => file.path.startsWith('final/') && file.path.endsWith('.spec.js')).map(file => file.path), 'retained test file');
    const finalInventory = packet.files.filter(file => file.path.startsWith('final/')).map(file => ({ path: file.path.slice(6), sha256: file.sha256 })).sort((left, right) => left.path.localeCompare(right.path));
    const executedInventory = verification.artifactFiles.map(file => ({ path: file.path, sha256: file.sha256 })).sort((left, right) => left.path.localeCompare(right.path));
    assert(same(finalInventory, executedInventory), 'complete final suite inventory differs from executed artifact');
    assert(same(packet.verification, verification.judgeEvidence), 'packet behavioral evidence differs from trusted execution');
    const compactExecution = { status: verification.status, testStatus: verification.testStatus, cleanupStatus: verification.cleanupStatus,
      controls: verification.controlRuns.map(run => ({ testStatus: run.testStatus, cleanupStatus: run.cleanupStatus, stats: run.stats })),
      supportingFaults: verification.faultRuns.map(run => ({ status: run.status, testStatus: run.testStatus, assertions: run.assertions.map(assertion => ({ file: assertion.file, title: assertion.fullTitle, message: assertion.message, actual: assertion.actual, expected: assertion.expected })) })) };
    assert(packetFiles.get('verification.json')?.content === `${JSON.stringify(compactExecution, null, 2)}\n`, 'compact execution source differs from trusted controls or faults');
    assert(same([...verification.artifactFiles.map(file => file.path).filter(file => file.endsWith('.spec.js'))].sort(), packet.specs.map(spec => spec.slice(6)).sort()), 'test file packet omits executed specs');
    return { planned, receipt, outcome, verification, packet, packetFiles };
  });
  const panels = selected.judges.map((selectedJudge, index) => {
    keys(selectedJudge, ['receipt', 'launch', ...(selectedJudge.validated ? ['validated'] : [])], 'judge');
    const receipt = native(selectedJudge, JUDGES[index], `judge ${index + 1}`, reviewPlan.pins[`review-prompt-${index + 1}.txt`], reviewPlan.pins['review-system.txt'], reviewPlan.pins['review.schema.json']); receipts.push(receipt);
    const validated = selectedJudge.validated ? read(selectedJudge.validated, 'validated review') : null;
    if (validated) {
      assert(receipt.status === 'complete' && validated.status === 'complete' && validated.configurationId === JUDGES[index] && same(validated.usage, receipt.usage) && same(review.judges[index], validated), 'validated review differs from native receipt');
      const output = receipt.structuredOutput ?? JSON.parse(receipt.finalText);
      ids(Object.keys(output), Object.keys(mapping), 'native review label'); ids(Object.keys(validated.judgments), plan.rows.map(row => row.id), 'native review artifact');
      for (const [label, id] of Object.entries(mapping)) assert(same(output[label], validated.judgments[id]), 'selected judgment differs from native output');
    } else assert(review.judges[index].configurationId === JUDGES[index] && review.judges[index].status !== 'complete', 'completed native review has no validated output');
    return { receipt, selected: selectedJudge, validated };
  });
  const rows = artifacts.map(artifact => {
    const evidence = pointers => pointers.map(pointer => {
      keys(pointer, ['path', 'startLine', 'endLine'], 'native pointer');
      const file = artifact.packetFiles.get(pointer.path);
      assert(file && Number.isInteger(pointer.startLine) && pointer.startLine > 0 && Number.isInteger(pointer.endLine) && pointer.endLine >= pointer.startLine && pointer.endLine <= file.content.split('\n').length, 'native evidence is outside packet');
      const prefix = pointer.path.split('/')[0];
      return { file: path.posix.basename(pointer.path), version: ['original', 'final', 'context'].includes(prefix) ? prefix : 'shared', startLine: pointer.startLine, endLine: pointer.endLine };
    });
    const judgments = panels.map((panel, index) => {
      const record = panel.validated?.judgments[artifact.planned.id];
      if (!record) return { judgeConfigurationId: JUDGES[index], reviewSha256: panel.selected.receipt.sha256, status: 'incomplete', score: null, dimensions: rubric.dimensions.map(({ id }) => ({ id, score: null, reason: null, evidence: [] })), protection: { status: 'unresolved', reason: null, evidence: [] }, coverage: { status: 'unresolved', reason: null, evidence: [] } };
      keys(record, ['dimensions', 'protection', 'coverage'], 'native suite review'); keys(record.dimensions, rubric.dimensions.map(dimension => dimension.id), 'native suite dimensions'); keys(record.protection, ['status', 'reason', 'evidence'], 'native protection'); keys(record.coverage, ['status', 'reason', 'evidence'], 'native coverage');
      const dimensions = rubric.dimensions.map(({ id }) => { const finding = record.dimensions[id]; keys(finding, ['score', 'reason', 'evidence'], 'native finding'); return { id, score: finding.score, reason: finding.reason, evidence: evidence(finding.evidence) }; });
      const protection = { status: record.protection.status, reason: record.protection.reason, evidence: evidence(record.protection.evidence) };
      assert(protection.status !== 'lost' || protection.evidence.some(pointer => pointer.version === 'original'), 'protection loss lacks original evidence');
      assert(protection.status !== 'retained' || protection.evidence.some(pointer => pointer.version === 'final'), 'protection retention lacks final evidence');
      const coverage = { status: record.coverage.status, reason: record.coverage.reason, evidence: evidence(record.coverage.evidence) };
      assert(coverage.status !== 'yes' || artifact.packet.verification?.behavioralEvidenceObserved === true, 'runnable coverage lacks observed execution');
      assert(coverage.status !== 'no' || artifact.packet.specs.length === 0 || coverage.evidence.some(pointer => pointer.version === 'final'), 'zero coverage lacks final code evidence');
      return { judgeConfigurationId: JUDGES[index], reviewSha256: panel.selected.receipt.sha256, status: 'complete', score: weighted(dimensions, rubric.dimensions), dimensions, protection, coverage };
    });
    const score = mean(judgments.map(judge => judge.score)), ratings = judgments.map(judge => judge.score);
    const runs = [...artifact.verification.controlRuns, ...artifact.verification.faultRuns];
    return { id: `${artifact.planned.configurationId}:${artifact.planned.condition}`, configurationId: artifact.planned.configurationId, label: BACKEND_TESTING_CONFIGURATIONS.find(configuration => configuration.id === artifact.planned.configurationId).label, condition: artifact.planned.condition, origin: artifact.planned.reused ? 'reused-baseline' : 'current-round', generationStatus: artifact.receipt.status, executionStatus: artifact.verification.status, testStatus: artifact.verification.testStatus, cleanupStatus: artifact.verification.cleanupStatus, elapsedMs: artifact.receipt.elapsedMs ?? null, verificationMs: runs.every(run => Number.isFinite(run.elapsedMs)) ? runs.reduce((sum, run) => sum + run.elapsedMs, 0) : null, inputTokens: artifact.receipt.usage?.input_tokens ?? null, outputTokens: artifact.receipt.usage?.output_tokens ?? null,
      status: score === null ? 'incomplete' : 'scored', score, range: { minimum: score === null ? null : Math.min(...ratings), maximum: score === null ? null : Math.max(...ratings) }, protection: judgments.some(judge => judge.protection.status === 'lost') ? 'lost' : judgments.every(judge => judge.protection.status === 'retained') ? 'retained' : 'unresolved', judgments,
      dimensions: rubric.dimensions.map(({ id }) => { const readings = judgments.map(judge => judge.dimensions.find(dimension => dimension.id === id).score), rating = mean(readings); return { id, score: rating, range: { minimum: rating === null ? null : Math.min(...readings), maximum: rating === null ? null : Math.max(...readings) } }; }) };
  });
  const sourcePins = backendTestingCompactSourcePins(selected, plan);
  assert(new Set(sourcePins.map(pin => pin.path)).size === sourcePins.length, 'duplicate source pins');
  const totals = receipts.map(receipt => {
    if (!receipt.usage) return null;
    const fields = receipt.configuration.provider === 'claude' ? ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'] : ['input_tokens', 'output_tokens'];
    assert(fields.every(field => receipt.usage[field] == null || Number.isInteger(receipt.usage[field]) && receipt.usage[field] >= 0), 'invalid native token usage');
    return fields.every(field => receipt.usage[field] != null) ? fields.reduce((sum, field) => sum + receipt.usage[field], 0) : null;
  });
  const summaries = compactQualitySummaries(rows, rubric.dimensions);
  const currentRound = validateBackendTestingCompactRound({ kind: 'backend-testing-current-round', schemaVersion: 1, date: plan.date, caseId: plan.caseId, sourceSha256: hash(sourcePins.map(pin => pin.sha256).join('\n')), skillSha256: selected.skill.sha256, sourceCodeSha256: plan.sourceHash, status: rows.every(row => row.status === 'scored') ? 'complete' : 'incomplete', scoreBasis: { minimum: 0, maximum: 1, decimals: 2, aggregation: rubric.aggregation, dimensions: rubric.dimensions, namingZeroRule: rubric.namingZeroRule },
    provenance: { freshAuthorSessions: 4, reusedBaselineArtifacts: 4, reviewerSessions: 2, authorTimeoutMs: plan.policy.authorTimeoutMs, reviewTimeoutMs: plan.policy.reviewTimeoutMs, nativeSessions: receipts.length, knownTokens: totals.reduce((sum, total) => sum + (total ?? 0), 0), usageMissingSessions: totals.filter(total => total === null).length, baselineSourceSha256: baselinePlan.sourceHash, baselinePromptSha256: baselinePlan.pins['prompt-none.txt'], verifierSha256: plan.verifierSha256 }, rows, summaries, dimensionSummaries: compactDimensionSummaries(summaries, rubric.dimensions), baselineMean: mean(summaries.map(summary => summary.baseline)), treatmentMean: mean(summaries.map(summary => summary.treatment)), meanPairedDifference: mean(summaries.map(summary => summary.delta)) });
  const projection = projectBackendTestingCompact(currentRound);
  for (const artifact of artifacts) {
    const summary = review.rows.find(row => row.id === artifact.planned.id);
    // Validate the immutable receipt under its original formula; publication reweights its unchanged findings.
    const originalScores = rows.find(row => row.configurationId === artifact.planned.configurationId && row.condition === artifact.planned.condition).judgments.map(judge => {
      if (judge.status !== 'complete' || judge.protection.status === 'unresolved' || judge.coverage.status === 'unresolved') return null;
      if (judge.coverage.status === 'no') return plan.scoreBasis.noMeaningfulCoverageScore;
      return Math.min(judge.score * 100, judge.protection.status === 'lost' ? plan.scoreBasis.protectionLossMaximum : 100);
    });
    assert(summary?.configurationId === artifact.planned.configurationId && summary.condition === artifact.planned.condition && close(summary.score, mean(originalScores)), 'reported native score differs from its frozen formula');
  }
  const files = { kind: 'backend-testing-files', schemaVersion: 1, sourceSha256: selected.packet.sha256, rows: artifacts.map(artifact => ({ id: `${artifact.planned.configurationId}:${artifact.planned.condition}`, configurationId: artifact.planned.configurationId, condition: artifact.planned.condition, files: artifact.packet.specs.map(spec => { const file = artifact.packetFiles.get(spec); return { path: spec.slice(6), sha256: file.sha256, content: file.content }; }) })) };
  validateBackendTestingCompactFiles(files, currentRound);
  return { projection, currentRound, files, basisSha256: projection.sourceSha256 };
}
