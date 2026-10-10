import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildBackendTestingCompactPublication, validateBackendTestingCompactPublication } from './backend-testing-compact-publication.js';

const SELECTION_PATH = 'benchmarks/backend-testing/publication.json';
const SHA256 = /^[a-f0-9]{64}$/;
export const BACKEND_TESTING_CONFIGURATIONS = Object.freeze([
  { id: 'codex:gpt-6-astra@ultra', label: 'GPT-6 Astra · Ultra' },
  { id: 'codex:gpt-6-astra@xhigh', label: 'GPT-6 Astra · Xhigh' },
  { id: 'codex:gpt-6.1-sol@xhigh', label: 'GPT-6.1 Sol · Xhigh' },
  { id: 'claude:claude-opus-5-5@xhigh', label: 'Claude Opus 5.5 · Xhigh' }
]);
const CONDITIONS = [
  { id: 'none', label: 'No testing skill' },
  { id: 'previous', label: 'Previous skill' },
  { id: 'revised', label: 'Revised skill' }
];
const QUALITY_CASES = [{ id: 'player-saves', title: 'Player save continuity' }, { id: 'purchases', title: 'Purchase and replay' }, { id: 'dev-current', title: 'Build publication' }];
const QUALITY_DIMENSIONS = [
  { id: 'independent_oracles', label: 'Independent meaningful oracles', weight: 30 },
  { id: 'coverage_layer_choice', label: 'Justified coverage and layer choice', weight: 25 },
  { id: 'subtraction_simplicity', label: 'Subtraction and simplicity', weight: 20 },
  { id: 'boundary_fidelity_reuse', label: 'Real-boundary fidelity and reuse', weight: 15 },
  { id: 'reproducibility_evidence', label: 'Reproducibility and evidence', weight: 10 }
];
const QUALITY_JUDGES = ['codex:gpt-6-astra@xhigh', 'claude:claude-opus-5-5@xhigh'];
const QUALITY_AGGREGATION = 'Each judge sums weight × rating / 4, then applies protection caps. Average both capped judge scores, both trials within each case, and the three cases equally. Full skill minus Minimal is a paired rubric-point difference.';
const QUALITY_METHOD = [
  'Four model settings edit three existing mixed backend suites under Minimal instructions or the full current testing skill, with two fresh trials per case and condition. Both arms receive identical neutral operational instructions; the original backend testing doctrine is withheld from both.',
  'The suites combine useful existing guards with deliberately constructed weaknesses. Agents may edit, combine or delete scoped tests and support code. The rubric assesses tautologies, redundant unit tests and test cruft alongside meaningful protection, appropriate layers, real boundaries and reproducibility.',
  'Two independent judges assess anonymous final suites, their changes and trusted execution evidence. No points are awarded for E2E labels, test quantity, raw deletion count or skill terminology. Each judge caps its score at 49 when material preexisting protection is lost, and at zero when no meaningful runnable protection remains.',
  'A retained suite can be scored after an authored time/output limit or missing final response. Forbidden changes receive an explicit task-policy zero without invented judge ratings. Provider interruptions and missing required reviews keep the planned comparison incomplete. Shared cleanup failures do not erase observed behavioral evidence.',
  'Original numerical ratings, protection caps and structured findings are public. Rubric anchors explain the ratings; they are not quotations from judge reasoning. Supporting source, patches, prompts and detailed reviews remain private. Execution and code growth are descriptive evidence, not additional quality points.'
];
const QUALITY_LIMITATIONS = [
  'Before generation, both judges rated four constructed contrast suites per case against expected ranges. This reference calibration checks the instrument on those suites; it does not independently validate broad model rankings or a population effect.',
  'The minimal-instruction setting isolates the skill from the original backend testing instructions. It does not measure incremental benefit over the full backend AGENTS files.',
  'Judges can disagree or miss defects. Per-judge caps are preserved before averaging; a panel mean can exceed 49 when only one judge finds lost protection. Missing evidence is not assigned an invented score.',
  'The earlier notification fault-detection experiment remains a separate development pilot. Its counts are not converted to quality points. This comparison remains excluded from Engineering and Overall aggregate scores.'
];
const FAULTS = [
  { id: 'read-counter', label: 'Read leaves unread count stale' },
  { id: 'read-action-separation', label: 'Reading incorrectly clears pending state' },
  { id: 'completion-pending-counter', label: 'Completed action leaves pending count stale' },
  { id: 'retained-history', label: 'Settled receipts disappear from history' }
];
const BENCHMARK = { id: 'backend-testing', title: 'Backend testing', description: 'Can a testing skill produce regression tests that detect real behavioral faults? Four model settings write tests against the same private backend snapshot.' };
const METHOD = [
  'Four exact model and reasoning settings each receive the same frozen backend task in three conditions, with two fresh trials per condition. Production code is fixed; only submitted tests and supporting test code are evaluated. Arm order is randomized within each setting/trial; settings run in shuffled blocks on four workers. Each attempt has 30 minutes, a 64 MiB output cap, and no delegation or automatic retry.',
  'The conditions add no testing skill, the previous testing skill, or the revised skill. Repository instructions and reusable test infrastructure remain available in every condition. Target coverage and hidden faults are withheld from contestants.',
  'Each retained submission must pass the correct implementation twice. Each calibrated fault is then applied separately. Detection requires an assertion failure in a test that passed the correct implementation and a recorded semantic review confirming that the test exercised the faulty operation with an independent, relevant assertion. Crashes, startup failures, timeouts, source-text checks and self-comparisons earn no detection credit.',
  'All planned trials remain in the denominator. Invalid authored submissions and exhausted generation budgets receive zero detections, without a fresh attempt. Unresolved infrastructure failures leave the comparison incomplete. A failed correct-run repetition prevents detection credit.',
  'The score is an executed fault count. Tests receive no bonus for being E2E, for test quantity, or for matching the skill wording. Generation resources and test-code growth are reported separately. Provider usage-limit recovery uses a fresh session with the same frozen inputs, without candidate reuse or feedback; original attempts remain recorded.'
];
const LIMITATIONS = [
  'This pilot covers one notification-state journey and four deliberately introduced faults. Two trials per setting do not establish a general testing ranking or a statistically reliable skill effect.',
  'The backend already has strong testing instructions, and the previous skill already favored E2E. The revision makes the tautology ban and first-choice wording explicit while shortening the main skill by 60 words; this tests a narrow edit, not the introduction of journey testing.',
  'The task withholds target coverage and allows test/helper changes only. It does not measure whole-suite cleanup or no-new-test decisions. Four faults cannot establish complete backend correctness; source, submissions and logs remain private.',
  'Shared-machine execution and sequential setting blocks make time/resource comparisons descriptive. Runtime sums recorded attempts; token totals stay unknown if any attempt lacks usage. Individual attempts remain inspectable. Provider token accounting differs. Executable counts are excluded from architecture and Overall scores.'
];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(`Backend testing publication: ${message}`); };
const keys = (value, expected, label) => assert(value && !Array.isArray(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `unexpected ${label} fields`);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const finite = value => Number.isFinite(value) && value >= 0 ? value : null;
const orderedIds = (values, expected, label) => assert(Array.isArray(values) && values.length === expected.length && new Set(values).size === values.length && expected.every(id => values.includes(id)), `invalid ${label} cohort`);

function summarize(rows, faultCount) {
  return { trials: rows.length, valid: rows.filter(row => row.status === 'valid').length,
    flaky: rows.filter(row => row.status === 'flaky').length, invalid: rows.filter(row => row.status === 'invalid').length,
    incomplete: rows.filter(row => row.status === 'incomplete').length,
    detected: rows.some(row => row.status === 'incomplete') ? null : rows.reduce((total, row) => total + row.detectedFaultIds.length, 0), possible: rows.length * faultCount };
}

const sumRecorded = (attempts, field) => attempts.every(attempt => attempt[field] !== null) ? attempts.reduce((total, attempt) => total + attempt[field], 0) : null;
function projectAttempts(source, sourceHash) {
  const recorded = source.attempts ?? [{ attempt: 1, kind: 'initial', status: source.status ?? 'pending', cause: null, elapsedMs: source.elapsedMs, usage: source.usage }];
  assert(Array.isArray(recorded) && recorded.length > 0, 'missing generation attempts');
  const attempts = recorded.map((attempt, index) => {
    assert(attempt.attempt === index + 1 && attempt.kind === (index ? 'fresh-session-operational-recovery' : 'initial'), 'invalid attempt order');
    if (source.attempts) assert(attempt.sourceHash === sourceHash && attempt.configurationId === source.configuration.id && attempt.promptSha256 === source.promptSha256 && attempt.treatmentSha256 === source.treatmentSha256, 'recovery changed frozen basis');
    if (index < recorded.length - 1) assert(['failed', 'infrastructure-failure'].includes(attempt.status) && attempt.cause === 'provider-usage-limit', 'recovery cannot replace an authored or completed attempt');
    return { number: index + 1, kind: attempt.kind, status: attempt.status, cause: attempt.cause ?? null, elapsedMs: finite(attempt.elapsedMs), inputTokens: finite(attempt.usage?.input_tokens ?? attempt.usage?.inputTokens), outputTokens: finite(attempt.usage?.output_tokens ?? attempt.usage?.outputTokens) };
  });
  const final = attempts.at(-1);
  assert(final.status === (source.status ?? 'pending') && final.elapsedMs === finite(source.elapsedMs) && final.inputTokens === finite(source.usage?.input_tokens ?? source.usage?.inputTokens) && final.outputTokens === finite(source.usage?.output_tokens ?? source.usage?.outputTokens), 'final attempt differs from retained generation');
  return attempts;
}

export function projectBackendTestingResults({ generation, evaluation, selection }) {
  assert(generation?.schemaVersion === 1 && generation.benchmark === 'backend-testing', 'unsupported generation source');
  assert(evaluation?.schemaVersion === 1 && evaluation.benchmark === 'backend-testing', 'unsupported evaluation source');
  const runId = generation.batchId || generation.runId;
  assert(typeof runId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId) && evaluation.runId === runId, 'generation and evaluation run identities differ');
  const expectedConfigurations = BACKEND_TESTING_CONFIGURATIONS.map(item => item.id);
  orderedIds(generation.policy?.configurations, expectedConfigurations, 'configuration');
  orderedIds(generation.policy?.conditions, CONDITIONS.map(item => item.id), 'condition');
  assert(generation.policy.trials === 2, 'exactly two planned trials are required');
  assert(generation.policy.concurrency === 4 && generation.policy.wallTimeLimitMs === 1800000 && generation.policy.maxStreamBytes === 67108864 && generation.policy.automaticRetries === 0 && generation.policy.delegateTools === false, 'execution policy differs from the published protocol');
  assert(evaluation.basis?.runSha256 === selection.generation.sha256 && SHA256.test(evaluation.basis?.runSha256), 'evaluation runSha256 differs from the selected generation bytes');
  assert(SHA256.test(evaluation.basis?.evaluatorSha256), 'missing frozen evaluator identity');
  for (const field of ['sourceHash', 'calibrationSha256']) assert(SHA256.test(generation.basis?.[field]) && evaluation.basis?.[field] === generation.basis[field], `evaluation ${field} differs from the frozen generation basis`);
  assert(same(selection.conditions, generation.basis?.conditions), 'selected skill hashes differ from frozen generation basis');
  orderedIds(selection.conditions?.map(item => item.id), CONDITIONS.map(item => item.id), 'skill');
  const conditions = CONDITIONS.map(condition => {
    const source = selection.conditions.find(item => item.id === condition.id);
    assert(condition.id === 'none' ? source.skillSha256 === null : SHA256.test(source.skillSha256), 'missing frozen skill hash');
    return { ...condition, skillSha256: source.skillSha256 };
  });
  orderedIds(evaluation.faults?.map(item => item.id), FAULTS.map(item => item.id), 'fault');
  assert(evaluation.faults.every(fault => fault.calibrated === true && fault.reviewStatus === 'approved'), 'all selected faults require completed calibration');
  assert(Array.isArray(generation.rows) && generation.rows.length === 24 && Array.isArray(evaluation.rows), 'the full planned 24-row generation cohort is required');
  assert(new Set(generation.rows.map(row => row.rowId)).size === 24, 'duplicate generation row identifiers');
  const evaluated = new Map(evaluation.rows.map(row => [row.rowId, row]));
  assert(evaluated.size === evaluation.rows.length, 'duplicate evaluation row');
  const identities = new Set();
  const rows = generation.rows.map(source => {
    const configurationId = source.configuration?.id;
    assert(expectedConfigurations.includes(configurationId) && CONDITIONS.some(item => item.id === source.condition) && [1, 2].includes(source.trial), 'unexpected generation row identity');
    const id = `${configurationId}:${source.condition}:${source.trial}`;
    assert(!identities.has(id), 'duplicate planned generation row');
    identities.add(id);
    const result = evaluated.get(source.rowId);
    if (result) evaluated.delete(source.rowId);
    const controls = result?.controlRuns ?? [];
    assert(Array.isArray(controls) && controls.length <= 2, 'unexpected control repetitions');
    assert(controls.every(run => ['pass', 'assertion-failure', 'execution-failure', 'infrastructure-failure', 'timeout'].includes(run.status)), 'unknown control execution status');
    const controlPasses = controls.filter(run => run.status === 'pass').length;
    const faults = result?.faultRuns ?? [];
    assert(Array.isArray(faults) && faults.length <= FAULTS.length && new Set(faults.map(run => run.faultId)).size === faults.length && faults.every(run => FAULTS.some(fault => fault.id === run.faultId) && ['detected', 'candidate-detection', 'survived', 'invalid', 'unresolved'].includes(run.status)), 'invalid fault executions');
    const submissionInvalid = source.status === 'invalid-submission' || source.submission?.forbiddenChanges?.length > 0;
    const generationBudgetExhausted = source.status === 'timeout' || source.timedOut === true || source.outputLimitExceeded === true;
    const generationIncomplete = source.status !== 'complete';
    const authoredFailure = controls.some(run => ['assertion-failure', 'execution-failure'].includes(run.status));
    const infrastructureFailure = controls.some(run => ['infrastructure-failure', 'timeout'].includes(run.status)) || faults.some(run => run.status === 'unresolved');
    const flaky = controlPasses > 0 && authoredFailure;
    const reviewPending = faults.some(run => run.status === 'candidate-detection' || run.status === 'detected' && run.reviewStatus !== 'approved');
    const complete = !reviewPending && source.status === 'complete' && controls.length === 2 && controlPasses === 2 && faults.length === FAULTS.length && !infrastructureFailure && result?.status === 'valid';
    const status = submissionInvalid || generationBudgetExhausted ? 'invalid' : generationIncomplete || reviewPending ? 'incomplete' : flaky ? 'flaky' : authoredFailure || result?.status === 'invalid' && !infrastructureFailure ? 'invalid' : complete ? 'valid' : 'incomplete';
    const reason = status === 'valid' ? null : submissionInvalid ? 'authored-test-invalid' : generationBudgetExhausted ? 'generation-budget-exhausted' : generationIncomplete ? 'execution-incomplete' : reviewPending ? 'semantic-review-pending' : flaky ? 'unstable-control' : authoredFailure ? 'authored-test-invalid' : infrastructureFailure ? 'infrastructure-unresolved' : status === 'invalid' ? 'authored-test-invalid' : 'execution-incomplete';
    const controlReview = result?.controlReview;
    if (controlReview) assert(controlReview.classification === 'unstable-shared-server-teardown' && controlReview.reviewStatus === 'approved' && controlReview.behavioralAssertionsPassed === true && controlReview.faultReplayPerformed === false && status === 'flaky' && controls.length === 2 && controls.some(run => run.status === 'execution-failure') && faults.length === 0, 'control qualification lacks reviewed execution evidence');
    const controlQualification = controlReview?.classification ?? null;
    const detectedFaultIds = status === 'valid' ? FAULTS.filter(fault => faults.some(run => run.faultId === fault.id && run.status === 'detected')).map(fault => fault.id) : [];
    const attempts = projectAttempts(source, generation.basis.sourceHash);
    const executions = [...controls, ...faults];
    const verificationMs = executions.length && executions.every(run => finite(run.elapsedMs) !== null) ? executions.reduce((total, run) => total + run.elapsedMs, 0) : null;
    return { id, configurationId, condition: source.condition, trial: source.trial, status, reason, controlQualification, controlPasses, controlRuns: controls.length, detectedFaultIds,
      attempts, elapsedMs: sumRecorded(attempts, 'elapsedMs'), verificationMs, inputTokens: sumRecorded(attempts, 'inputTokens'), outputTokens: sumRecorded(attempts, 'outputTokens'),
      addedLines: finite(source.submission?.addedLines), deletedLines: finite(source.submission?.deletedLines) };
  });
  assert(evaluated.size === 0, 'evaluation references an unknown generation row');
  rows.sort((a, b) => expectedConfigurations.indexOf(a.configurationId) - expectedConfigurations.indexOf(b.configurationId) || CONDITIONS.findIndex(item => item.id === a.condition) - CONDITIONS.findIndex(item => item.id === b.condition) || a.trial - b.trial);
  const projection = {
    kind: 'vasirbenchmark-backend-testing', schemaVersion: 1,
    benchmark: { ...BENCHMARK },
    runId, sourceSha256: hash(`${selection.generation.sha256}\n${selection.evaluation.sha256}`),
    status: rows.some(row => row.status === 'incomplete') ? 'incomplete' : 'complete',
    configurations: BACKEND_TESTING_CONFIGURATIONS.map(item => ({ ...item })), conditions, trials: 2, faults: FAULTS.map(item => ({ ...item })), rows,
    summaries: BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => CONDITIONS.map(condition => ({ configurationId: configuration.id, condition: condition.id, ...summarize(rows.filter(row => row.configurationId === configuration.id && row.condition === condition.id), FAULTS.length) }))),
    conditionSummaries: CONDITIONS.map(condition => ({ condition: condition.id, ...summarize(rows.filter(row => row.condition === condition.id), FAULTS.length) })), method: [...METHOD], limitations: [...LIMITATIONS]
  };
  validateBackendTestingPublication(projection);
  return projection;
}

export function validateBackendTestingPublication(value) {
  if (value?.schemaVersion === 4) return validateBackendTestingCompactPublication(value);
  if (value?.schemaVersion === 3) return validateBackendTestingCurrent(value);
  if (value?.schemaVersion === 2) {
    keys(value, ['kind', 'schemaVersion', 'suiteQuality', 'faultDetectionPilot'], 'quality wrapper');
    assert(value.kind === 'vasirbenchmark-backend-testing', 'invalid quality wrapper kind');
    validateBackendTestingPublication(value.faultDetectionPilot);
    assert(value.faultDetectionPilot.schemaVersion === 1, 'pilot must retain its original schema');
    validateBackendTestingSuiteQuality(value.suiteQuality);
    return value;
  }
  keys(value, ['kind', 'schemaVersion', 'benchmark', 'runId', 'sourceSha256', 'status', 'configurations', 'conditions', 'trials', 'faults', 'rows', 'summaries', 'conditionSummaries', 'method', 'limitations'], 'projection');
  assert(value.kind === 'vasirbenchmark-backend-testing' && value.schemaVersion === 1 && same(value.benchmark, BENCHMARK) && value.trials === 2 && SHA256.test(value.sourceSha256), 'invalid public identity');
  assert(same(value.configurations, BACKEND_TESTING_CONFIGURATIONS) && same(value.faults, FAULTS) && same(value.method, METHOD) && same(value.limitations, LIMITATIONS), 'unreviewed public descriptors');
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.runId), 'invalid public run identifier');
  assert(Array.isArray(value.conditions) && value.conditions.length === 3, 'invalid public conditions');
  value.conditions.forEach((condition, index) => {
    keys(condition, ['id', 'label', 'skillSha256'], 'condition');
    assert(condition.id === CONDITIONS[index].id && condition.label === CONDITIONS[index].label && (condition.id === 'none' ? condition.skillSha256 === null : SHA256.test(condition.skillSha256)), 'invalid public skill identity');
  });
  assert(value.rows.length === 24 && new Set(value.rows.map(row => row.id)).size === 24, 'incomplete public row inventory');
  for (const row of value.rows) {
    keys(row, ['id', 'configurationId', 'condition', 'trial', 'status', 'reason', 'controlQualification', 'controlPasses', 'controlRuns', 'detectedFaultIds', 'attempts', 'elapsedMs', 'verificationMs', 'inputTokens', 'outputTokens', 'addedLines', 'deletedLines'], 'row');
    assert(BACKEND_TESTING_CONFIGURATIONS.some(item => item.id === row.configurationId) && CONDITIONS.some(item => item.id === row.condition) && [1, 2].includes(row.trial) && row.id === `${row.configurationId}:${row.condition}:${row.trial}`, 'invalid public row identity');
    assert(['valid', 'flaky', 'invalid', 'incomplete'].includes(row.status) && Number.isInteger(row.controlPasses) && Number.isInteger(row.controlRuns) && row.controlPasses >= 0 && row.controlPasses <= row.controlRuns && row.controlRuns <= 2, 'invalid public row status');
    assert(row.status === 'valid' ? row.reason === null : ['semantic-review-pending', 'unstable-control', 'authored-test-invalid', 'generation-budget-exhausted', 'infrastructure-unresolved', 'execution-incomplete'].includes(row.reason), 'invalid failure reason');
    assert(row.controlQualification === null || row.controlQualification === 'unstable-shared-server-teardown' && row.status === 'flaky' && row.reason === 'unstable-control' && row.controlPasses === 1 && row.controlRuns === 2, 'invalid public control qualification');
    assert(Array.isArray(row.detectedFaultIds) && new Set(row.detectedFaultIds).size === row.detectedFaultIds.length && row.detectedFaultIds.every(id => FAULTS.some(fault => fault.id === id)) && (row.status === 'valid' ? row.controlPasses === 2 : row.detectedFaultIds.length === 0), 'unearned fault detection');
    assert(Array.isArray(row.attempts) && row.attempts.length > 0, 'missing public attempts');
    row.attempts.forEach((attempt, index) => {
      keys(attempt, ['number', 'kind', 'status', 'cause', 'elapsedMs', 'inputTokens', 'outputTokens'], 'attempt');
      assert(attempt.number === index + 1 && attempt.kind === (index ? 'fresh-session-operational-recovery' : 'initial') && ['pending', 'complete', 'failed', 'infrastructure-failure', 'timeout', 'invalid-submission'].includes(attempt.status) && [null, 'provider-usage-limit'].includes(attempt.cause), 'invalid public attempt');
      if (index < row.attempts.length - 1) assert(['failed', 'infrastructure-failure'].includes(attempt.status) && attempt.cause === 'provider-usage-limit', 'invalid public recovery');
      for (const field of ['elapsedMs', 'inputTokens', 'outputTokens']) assert(attempt[field] === null || finite(attempt[field]) === attempt[field], 'invalid attempt resource');
    });
    assert(row.status !== 'valid' || row.attempts.at(-1).status === 'complete', 'valid submission requires completed generation');
    for (const field of ['elapsedMs', 'inputTokens', 'outputTokens']) assert(row[field] === sumRecorded(row.attempts, field), 'attempt resource total mismatch');
    for (const field of ['elapsedMs', 'verificationMs', 'inputTokens', 'outputTokens', 'addedLines', 'deletedLines']) assert(row[field] === null || finite(row[field]) === row[field], 'invalid resource value');
  }
  assert(same(value.summaries, BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => CONDITIONS.map(condition => ({ configurationId: configuration.id, condition: condition.id, ...summarize(value.rows.filter(row => row.configurationId === configuration.id && row.condition === condition.id), FAULTS.length) })))), 'summary arithmetic mismatch');
  assert(same(value.conditionSummaries, CONDITIONS.map(condition => ({ condition: condition.id, ...summarize(value.rows.filter(row => row.condition === condition.id), FAULTS.length) }))), 'condition arithmetic mismatch');
  assert(value.status === (value.rows.some(row => row.status === 'incomplete') ? 'incomplete' : 'complete'), 'comparison completion mismatch');
  return value;
}

const qualityMean = rows => rows.length && rows.every(row => row.score !== null) ? rows.reduce((sum, row) => sum + row.score, 0) / rows.length : null;
const qualityScore = rows => qualityMean(QUALITY_CASES.map(item => ({ score: qualityMean(rows.filter(row => row.caseId === item.id)) })));
function qualitySummaries(rows) {
  return BACKEND_TESTING_CONFIGURATIONS.map(configuration => {
    const selected = rows.filter(row => row.configurationId === configuration.id);
    const baseline = qualityScore(selected.filter(row => row.condition === 'none'));
    const treatment = qualityScore(selected.filter(row => row.condition === 'revised'));
    return { configurationId: configuration.id, baseline, treatment, delta: baseline === null || treatment === null ? null : treatment - baseline, scored: selected.filter(row => row.score !== null).length, planned: 12 };
  });
}

function publicQualityJudgment(record, candidate, rubricSha256, verifierSha256) {
  assert(QUALITY_JUDGES.includes(record.judgeId) && ['complete', 'unresolved', 'invalid', 'infrastructure-failure', 'pending'].includes(record.status), 'invalid quality judge identity or status');
  if (record.status !== 'pending') assert(SHA256.test(record.resultSha256), 'missing original quality review hash');
  const assessed = ['complete', 'unresolved'].includes(record.status);
  if (assessed) assert(record.candidateId === candidate.id && record.artifactSha256 === candidate.artifactSha256 && record.inputHashes?.rubric === rubricSha256 && record.inputHashes?.verifier === verifierSha256, 'quality judgment does not match the frozen candidate, rubric or verifier');
  const dimensions = QUALITY_DIMENSIONS.map(dimension => ({ id: dimension.id, rating: assessed ? record.evaluation?.dimensions?.find(item => item.id === dimension.id)?.rating : null }));
  if (assessed) {
    orderedIds(record.evaluation?.dimensions?.map(item => item.id), QUALITY_DIMENSIONS.map(item => item.id), 'quality rating');
    assert(dimensions.every(item => Number.isInteger(item.rating) && item.rating >= 0 && item.rating <= 4), 'invalid quality rating');
  }
  const coverage = assessed ? record.evaluation?.coverage?.meaningfulRunnableCoverage : 'unresolved';
  const guaranteeStatuses = assessed ? record.evaluation?.guarantees?.map(item => item.status) : [];
  assert(Array.isArray(guaranteeStatuses) && guaranteeStatuses.every(status => ['retained', 'lost', 'unresolved'].includes(status)), 'invalid protection assessment');
  const protection = assessed ? record.evaluation?.coverage?.materialPreexistingProtection : 'unresolved';
  assert(['retained', 'lost', 'unresolved'].includes(protection), 'missing whole-suite protection assessment');
  assert(!assessed || Array.isArray(record.caps), 'missing original protection caps');
  const caps = assessed ? record.caps.map(cap => {
    if (cap.rule === 'lost-material-preexisting-protection') {
      keys(cap, ['rule', 'maximum', 'guarantees', 'scope'], 'original protection cap');
      assert(cap.scope === 'whole-original-suite' && Array.isArray(cap.guarantees) && new Set(cap.guarantees).size === cap.guarantees.length, 'invalid whole-original protection cap');
      assert(cap.guarantees.every(id => record.evaluation.guarantees.some(item => item.id === id && item.status === 'lost')), 'cap references protection without an observed loss');
      assert(cap.guarantees.length || protection === 'lost' && record.evaluation.coverage.distinctLost?.some(item => item.evidence?.some(pointer => pointer.path?.startsWith('original/') || pointer.path === 'changes.patch')), 'material protection cap needs named loss or original/diff-backed distinct loss');
      return { rule: cap.rule, maximum: cap.maximum, scope: cap.scope };
    }
    keys(cap, ['rule', 'maximum'], 'original protection cap');
    return { rule: cap.rule, maximum: cap.maximum };
  }) : [];
  assert(!assessed || record.status !== 'complete' || coverage === 'no' || !guaranteeStatuses.includes('unresolved'), 'unresolved named protection cannot yield a completed quality review');
  const judgment = { judgeConfigurationId: record.judgeId, reviewSha256: record.resultSha256 ?? null, status: record.status,
    score: assessed ? record.score : null, uncappedScore: assessed ? record.uncappedScore : null, diagnosticScore: assessed ? record.diagnosticScore : null, dimensions, coverage,
    protection, caps,
    remainingCruft: assessed ? record.evaluation.cruft.remaining.length > 0 : null, introducedCruft: assessed ? record.evaluation.cruft.introduced.length > 0 : null };
  validatePublicQualityJudgment(judgment);
  return judgment;
}

function validatePublicQualityJudgment(judgment) {
  keys(judgment, ['judgeConfigurationId', 'reviewSha256', 'status', 'score', 'uncappedScore', 'diagnosticScore', 'dimensions', 'coverage', 'protection', 'caps', 'remainingCruft', 'introducedCruft'], 'quality judgment');
  assert(QUALITY_JUDGES.includes(judgment.judgeConfigurationId) && ['complete', 'unresolved', 'invalid', 'infrastructure-failure', 'pending'].includes(judgment.status), 'invalid public quality judge');
  assert(judgment.status === 'pending' ? judgment.reviewSha256 === null : SHA256.test(judgment.reviewSha256), 'invalid public review hash');
  assert(['yes', 'no', 'unresolved'].includes(judgment.coverage) && ['retained', 'lost', 'unresolved'].includes(judgment.protection), 'invalid public protection state');
  orderedIds(judgment.dimensions?.map(item => item.id), QUALITY_DIMENSIONS.map(item => item.id), 'public quality dimension');
  for (const item of judgment.dimensions) keys(item, ['id', 'rating'], 'quality rating');
  const assessed = ['complete', 'unresolved'].includes(judgment.status);
  assert(assessed ? typeof judgment.remainingCruft === 'boolean' && typeof judgment.introducedCruft === 'boolean' : judgment.remainingCruft === null && judgment.introducedCruft === null, 'invalid public cruft flags');
  assert(judgment.dimensions.every(item => assessed ? Number.isInteger(item.rating) && item.rating >= 0 && item.rating <= 4 : item.rating === null), 'invalid public quality rating');
  assert(Array.isArray(judgment.caps) && new Set(judgment.caps.map(item => item.rule)).size === judgment.caps.length, 'duplicate protection cap');
  for (const cap of judgment.caps) {
    keys(cap, cap.rule === 'lost-material-preexisting-protection' ? ['rule', 'maximum', 'scope'] : ['rule', 'maximum'], 'protection cap');
    assert(cap.rule === 'lost-material-preexisting-protection' && cap.maximum === 49 && cap.scope === 'whole-original-suite' && judgment.protection !== 'retained' || cap.rule === 'zero-meaningful-runnable-coverage' && cap.maximum === 0 && judgment.coverage === 'no', 'invalid public protection cap');
  }
  if (!assessed) assert(judgment.score === null && judgment.uncappedScore === null && judgment.diagnosticScore === null && judgment.caps.length === 0 && judgment.coverage === 'unresolved' && judgment.protection === 'unresolved', 'unassessed review has quality points');
  else {
    const uncapped = QUALITY_DIMENSIONS.reduce((sum, dimension) => sum + dimension.weight * judgment.dimensions.find(item => item.id === dimension.id).rating / 4, 0);
    const capped = Math.min(uncapped, ...judgment.caps.map(item => item.maximum));
    assert(judgment.protection !== 'lost' || judgment.caps.some(item => item.maximum === 49), 'material protection loss requires the declared 49 cap');
    assert(judgment.coverage !== 'no' || judgment.caps.some(item => item.maximum === 0), 'no runnable protection requires the declared zero cap');
    assert(judgment.uncappedScore === uncapped && judgment.diagnosticScore === capped && judgment.score === (judgment.status === 'complete' ? capped : null), 'quality judge arithmetic mismatch');
    assert(judgment.status !== 'complete' || judgment.coverage === 'no' || judgment.coverage === 'yes' && judgment.protection !== 'unresolved', 'unresolved evidence cannot yield a completed quality review');
  }
}

export function projectBackendTestingSuiteQuality({ generation, evaluation, judging, rubric, selection }) {
  assert(generation?.schemaVersion === 2 && generation.benchmark === 'backend-testing-suite-quality' && evaluation?.schemaVersion === 2 && evaluation.benchmark === generation.benchmark, 'invalid suite-quality sources');
  assert(judging?.kind === 'backend-testing-quality-judging' && judging.schemaVersion === 2 && judging.runId === generation.runId && evaluation.runId === generation.runId, 'quality run identities differ');
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(generation.runId), 'invalid quality run identifier');
  for (const [field, pin] of [['generationSha256', 'generation'], ['evaluationSha256', 'evaluation'], ['rubricSha256', 'rubric']]) assert(judging.basis?.[field] === selection[pin].sha256 && SHA256.test(judging.basis[field]), `quality judging ${field} differs from selected bytes`);
  assert(evaluation.basis?.runSha256 === selection.generation.sha256 && evaluation.basis.rubricSha256 === selection.rubric.sha256 && generation.basis?.rubricSha256 === selection.rubric.sha256 && SHA256.test(evaluation.basis.evaluatorSha256), 'quality execution basis differs');
  assert(generation.basis.verifierSha256 === evaluation.basis.evaluatorSha256 && judging.basis.verifierSha256 === evaluation.basis.evaluatorSha256, 'quality generation, execution and judging used different frozen verifiers');
  orderedIds(generation.policy?.configurations, BACKEND_TESTING_CONFIGURATIONS.map(item => item.id), 'quality configuration');
  orderedIds(generation.policy?.conditions, ['none', 'revised'], 'quality condition');
  assert(generation.policy.trials === 2 && generation.policy.cases === 3 && generation.policy.concurrency === 8 && generation.policy.wallTimeLimitMs === 1800000 && generation.policy.maxStreamBytes === 67108864 && generation.policy.automaticRetries === 0 && generation.policy.delegateTools === false, 'quality execution policy differs');
  orderedIds(generation.basis.cases?.map(item => item.id), QUALITY_CASES.map(item => item.id), 'quality case');
  orderedIds(evaluation.basis.cases?.map(item => item.id), QUALITY_CASES.map(item => item.id), 'quality execution case');
  for (const item of generation.basis.cases) {
    const executed = evaluation.basis.cases.find(other => other.id === item.id);
    for (const field of ['sourceHash', 'calibrationSha256']) assert(SHA256.test(item[field]) && executed[field] === item[field], `quality case ${field} differs`);
  }
  assert(rubric?.schemaVersion === 2 && rubric.id === 'backend-testing-suite-quality-v2' && same(rubric.judges, QUALITY_JUDGES) && same(rubric.ratingScale, { min: 0, max: 4, integerOnly: true }), 'unexpected quality rubric');
  assert(same(rubric.dimensions?.map(({ id, label, weight }) => ({ id, label, weight })), QUALITY_DIMENSIONS) && rubric.protectionRules?.lostMaterialPreexistingProtectionMaximum === 49 && rubric.protectionRules?.zeroMeaningfulRunnableCoverageScore === 0, 'quality rubric weights or caps differ');
  const conditions = [{ id: 'none', label: 'Minimal' }, { id: 'revised', label: 'Full skill' }].map(condition => {
    const source = generation.basis.conditions?.find(item => item.id === condition.id);
    assert(condition.id === 'none' ? source?.skillSha256 === null : SHA256.test(source?.skillSha256), 'missing quality skill identity');
    return { ...condition, skillSha256: source.skillSha256 };
  });
  orderedIds(generation.basis.conditions?.map(item => item.id), ['none', 'revised'], 'quality frozen condition');
  assert(Array.isArray(generation.rows) && generation.rows.length === 48 && new Set(generation.rows.map(row => row.rowId)).size === 48 && Array.isArray(evaluation.rows) && Array.isArray(judging.candidates), 'invalid planned quality matrix');
  const evaluations = new Map(evaluation.rows.map(row => [row.rowId, row])), candidates = new Map(judging.candidates.map(row => [row.rowId, row]));
  assert(evaluations.size === evaluation.rows.length && candidates.size === judging.candidates.length, 'duplicate quality evidence row');
  const assessmentRows = [];
  const rows = generation.rows.map(source => {
    assert(QUALITY_CASES.some(item => item.id === source.caseId) && BACKEND_TESTING_CONFIGURATIONS.some(item => item.id === source.configuration?.id) && ['none', 'revised'].includes(source.condition) && [1, 2].includes(source.trial), 'invalid quality row identity');
    const id = `${source.caseId}:${source.configuration.id}:${source.condition}:${source.trial}`;
    const executed = evaluations.get(source.rowId), candidate = candidates.get(source.rowId);
    evaluations.delete(source.rowId); candidates.delete(source.rowId);
    if (executed) assert(executed.caseId === source.caseId && executed.evaluatorSha256 === evaluation.basis.evaluatorSha256, 'quality execution case or verifier mismatch');
    if (candidate) assert(candidate.id === source.rowId && candidate.caseId === source.caseId && SHA256.test(candidate.caseBasisSha256), 'quality candidate identity mismatch');
    const eligibility = source.qualityEligibility;
    assert(eligibility && ['eligible', 'task-invalid', 'unresolved'].includes(eligibility.status), 'missing trusted quality eligibility');
    assert(eligibility.status === 'task-invalid' ? eligibility.reason === 'forbidden-changes' && source.submission?.forbiddenChanges?.length > 0 : !source.submission?.forbiddenChanges?.length, 'quality eligibility disagrees with scoped changes');
    if (eligibility.status === 'unresolved') assert(['provider-usage-limit', 'provider-authentication-failure', 'provider-runtime-failure'].includes(eligibility.reason), 'unknown quality infrastructure reason');
    if (candidate) {
      assert(same(candidate.eligibility, eligibility), 'judge candidate eligibility differs from trusted generation');
      if (eligibility.status === 'eligible') {
        const files = source.submission.files.filter(item => /\.(?:[cm]?js|json)$/.test(item.path)).map(({ path, sha256 }) => ({ path, sha256 })).sort((a, b) => a.path.localeCompare(b.path));
        assert(SHA256.test(candidate.artifactSha256) && candidate.sourceHash === generation.basis.cases.find(item => item.id === source.caseId).sourceHash && candidate.submissionFilesSha256 === hash(`${JSON.stringify(files, null, 2)}\n`), 'quality judged artifact differs from generated suite');
      } else assert(candidate.artifactSha256 === null && candidate.judges.length === 0, 'policy outcome must not invent a judged artifact');
    }
    const records = candidate?.judges ?? [];
    assert(Array.isArray(records) && records.length <= 2 && new Set(records.map(item => item.judgeId)).size === records.length && records.every(item => QUALITY_JUDGES.includes(item.judgeId)), 'invalid quality judge seats');
    const judgments = eligibility.status === 'eligible' ? QUALITY_JUDGES.map(judgeId => publicQualityJudgment(records.find(record => record.judgeId === judgeId) ?? { judgeId, status: 'pending', score: null }, candidate, selection.rubric.sha256, evaluation.basis.evaluatorSha256)) : [];
    const panelComplete = judgments.length === 2 && judgments.every(judgment => judgment.status === 'complete');
    const panelScore = panelComplete ? qualityMean(judgments) : null;
    if (candidate) assert(eligibility.status === 'eligible' ? candidate.status === (panelComplete ? 'complete' : 'incomplete') && candidate.score === panelScore && candidate.scoreSource === 'judge-panel' : candidate.status === (eligibility.status === 'task-invalid' ? 'task-invalid' : 'unresolved') && candidate.score === (eligibility.status === 'task-invalid' ? 0 : null) && candidate.scoreSource === (eligibility.status === 'task-invalid' ? 'task-policy' : 'unresolved'), 'candidate total differs from original reviews or task policy');
    const status = eligibility.status === 'task-invalid' ? 'invalid' : eligibility.status === 'unresolved' || !panelComplete ? 'incomplete' : 'scored';
    const score = status === 'invalid' ? 0 : status === 'scored' ? panelScore : null;
    const dimensionScores = QUALITY_DIMENSIONS.map(dimension => {
      const rating = status === 'scored' ? judgments.reduce((sum, judgment) => sum + judgment.dimensions.find(item => item.id === dimension.id).rating, 0) / 2 : null;
      return { id: dimension.id, rating, points: rating === null ? null : dimension.weight * rating / 4 };
    });
    assessmentRows.push({ rowId: id, judgments });
    const attempts = projectAttempts(source, generation.basis.cases.find(item => item.id === source.caseId).sourceHash);
    return { id, configurationId: source.configuration.id, caseId: source.caseId, condition: source.condition, trial: source.trial, status, score,
      scoreSource: status === 'invalid' ? 'task-policy' : status === 'scored' ? 'judge-panel' : null,
      scoreReason: status === 'invalid' ? 'forbidden-changes' : status === 'scored' ? null : eligibility.status === 'unresolved' ? 'provider-infrastructure' : executed?.status === 'unresolved' ? 'execution-unresolved' : 'review-incomplete', dimensionScores,
      generationStatus: source.status, executionStatus: executed?.status ?? 'unresolved', testStatus: executed?.testStatus ?? 'not-run', cleanupStatus: executed?.cleanupStatus ?? 'not-run',
      addedLines: finite(source.submission?.addedLines), deletedLines: finite(source.submission?.deletedLines), addedFiles: source.submission?.addedFiles?.length ?? null, modifiedFiles: source.submission?.modifiedFiles?.length ?? null, deletedFiles: source.submission?.deletedFiles?.length ?? null,
      elapsedMs: sumRecorded(attempts, 'elapsedMs'), inputTokens: sumRecorded(attempts, 'inputTokens'), outputTokens: sumRecorded(attempts, 'outputTokens') };
  });
  assert(evaluations.size === 0 && candidates.size === 0, 'quality evidence references an unknown generated row');
  const assessments = { kind: 'vasirbenchmark-backend-testing-assessments', schemaVersion: 1, runId: generation.runId,
    scoreBasis: { dimensions: rubric.dimensions.map(({ id, label, weight, anchors }) => ({ id, label, weight, anchors })) }, rows: assessmentRows };
  const projection = { benchmark: { id: 'backend-testing', title: 'Backend test-suite quality', description: 'Do agents leave better tests behind? This comparison assesses independent oracles, justified coverage, and the removal of tautologies, redundant unit tests and test cruft.' },
    runId: generation.runId, sourceSha256: hash(['generation', 'evaluation', 'judging', 'rubric'].map(key => selection[key].sha256).join('\n')), status: rows.some(row => row.score === null) ? 'incomplete' : 'complete',
    configurations: BACKEND_TESTING_CONFIGURATIONS.map(item => ({ ...item })), conditions, cases: QUALITY_CASES.map(item => ({ ...item })), trials: 2,
    scoreBasis: { maximum: 100, judgeCount: 2, judges: [...QUALITY_JUDGES], dimensions: QUALITY_DIMENSIONS.map(item => ({ ...item })), aggregation: QUALITY_AGGREGATION }, rows,
    summaries: qualitySummaries(rows), conditionSummaries: conditions.map(condition => { const selected = rows.filter(row => row.condition === condition.id); return { condition: condition.id, score: qualityScore(selected), scored: selected.filter(row => row.score !== null).length, planned: 24 }; }),
    method: [...QUALITY_METHOD], limitations: [...QUALITY_LIMITATIONS], assessmentSha256: hash(JSON.stringify(assessments)) };
  validateBackendTestingSuiteQuality(projection, assessments);
  return { projection, assessments };
}

export function validateBackendTestingSuiteQuality(value, assessments) {
  keys(value, ['benchmark', 'runId', 'sourceSha256', 'status', 'configurations', 'conditions', 'cases', 'trials', 'scoreBasis', 'rows', 'summaries', 'conditionSummaries', 'method', 'limitations', 'assessmentSha256'], 'suite quality');
  assert(value.benchmark?.id === 'backend-testing' && value.benchmark.title === 'Backend test-suite quality' && SHA256.test(value.sourceSha256) && SHA256.test(value.assessmentSha256) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.runId), 'invalid public quality identity');
  keys(value.benchmark, ['id', 'title', 'description'], 'quality benchmark');
  assert(same(value.configurations, BACKEND_TESTING_CONFIGURATIONS) && same(value.cases, QUALITY_CASES) && value.trials === 2 && same(value.method, QUALITY_METHOD) && same(value.limitations, QUALITY_LIMITATIONS), 'quality public protocol differs');
  assert(same(value.scoreBasis, { maximum: 100, judgeCount: 2, judges: QUALITY_JUDGES, dimensions: QUALITY_DIMENSIONS, aggregation: QUALITY_AGGREGATION }), 'quality public score basis differs');
  assert(Array.isArray(value.conditions) && value.conditions.length === 2, 'invalid public quality conditions');
  for (const [index, condition] of value.conditions.entries()) { keys(condition, ['id', 'label', 'skillSha256'], 'quality condition'); assert(condition.id === ['none', 'revised'][index] && condition.label === ['Minimal', 'Full skill'][index] && (index ? SHA256.test(condition.skillSha256) : condition.skillSha256 === null), 'invalid public quality condition'); }
  assert(Array.isArray(value.rows) && value.rows.length === 48 && new Set(value.rows.map(row => row.id)).size === 48, 'incomplete public quality matrix');
  for (const row of value.rows) {
    keys(row, ['id', 'configurationId', 'caseId', 'condition', 'trial', 'status', 'score', 'scoreSource', 'scoreReason', 'dimensionScores', 'generationStatus', 'executionStatus', 'testStatus', 'cleanupStatus', 'addedLines', 'deletedLines', 'addedFiles', 'modifiedFiles', 'deletedFiles', 'elapsedMs', 'inputTokens', 'outputTokens'], 'quality row');
    assert(QUALITY_CASES.some(item => item.id === row.caseId) && BACKEND_TESTING_CONFIGURATIONS.some(item => item.id === row.configurationId) && ['none', 'revised'].includes(row.condition) && [1, 2].includes(row.trial) && row.id === `${row.caseId}:${row.configurationId}:${row.condition}:${row.trial}`, 'invalid public quality row identity');
    assert(['scored', 'invalid', 'incomplete'].includes(row.status), 'invalid quality score status');
    assert(row.status === 'scored' ? finite(row.score) === row.score && row.score <= 100 && row.scoreSource === 'judge-panel' && row.scoreReason === null : row.status === 'invalid' ? row.score === 0 && row.scoreSource === 'task-policy' && row.scoreReason === 'forbidden-changes' : row.score === null && row.scoreSource === null && ['provider-infrastructure', 'execution-unresolved', 'review-incomplete'].includes(row.scoreReason), 'invalid public quality score policy');
    orderedIds(row.dimensionScores?.map(item => item.id), QUALITY_DIMENSIONS.map(item => item.id), 'public mean rating');
    for (const dimension of row.dimensionScores) { keys(dimension, ['id', 'rating', 'points'], 'quality mean'); const weight = QUALITY_DIMENSIONS.find(item => item.id === dimension.id).weight; assert(row.status === 'scored' ? Number.isFinite(dimension.rating) && dimension.rating >= 0 && dimension.rating <= 4 && dimension.rating * 2 === Math.floor(dimension.rating * 2) && dimension.points === weight * dimension.rating / 4 : dimension.rating === null && dimension.points === null, 'invalid public quality dimension mean'); }
    assert(['complete', 'failed', 'infrastructure-failure', 'timeout', 'invalid-submission'].includes(row.generationStatus) && ['valid', 'invalid', 'unresolved'].includes(row.executionStatus) && ['pass', 'assertion-failure', 'execution-failure', 'infrastructure-failure', 'timeout', 'not-run'].includes(row.testStatus) && ['pass', 'failed', 'not-run'].includes(row.cleanupStatus), 'invalid public quality execution status');
    for (const field of ['addedLines', 'deletedLines', 'addedFiles', 'modifiedFiles', 'deletedFiles', 'elapsedMs', 'inputTokens', 'outputTokens']) assert(row[field] === null || finite(row[field]) === row[field], 'invalid public quality resource');
  }
  assert(value.status === (value.rows.some(row => row.score === null) ? 'incomplete' : 'complete') && same(value.summaries, qualitySummaries(value.rows)), 'quality summary arithmetic mismatch');
  assert(same(value.conditionSummaries, value.conditions.map(condition => { const rows = value.rows.filter(row => row.condition === condition.id); return { condition: condition.id, score: qualityScore(rows), scored: rows.filter(row => row.score !== null).length, planned: 24 }; })), 'quality condition arithmetic mismatch');
  if (assessments) {
    keys(assessments, ['kind', 'schemaVersion', 'runId', 'scoreBasis', 'rows'], 'quality assessments');
    assert(assessments.kind === 'vasirbenchmark-backend-testing-assessments' && assessments.schemaVersion === 1 && assessments.runId === value.runId && hash(JSON.stringify(assessments)) === value.assessmentSha256, 'quality assessment digest differs');
    keys(assessments.scoreBasis, ['dimensions'], 'quality anchor basis');
    assert(same(assessments.scoreBasis.dimensions.map(({ id, label, weight }) => ({ id, label, weight })), QUALITY_DIMENSIONS), 'quality anchors use another rubric');
    for (const item of assessments.scoreBasis.dimensions) { keys(item, ['id', 'label', 'weight', 'anchors'], 'quality anchors'); keys(item.anchors, ['0', '1', '2', '3', '4'], 'rating anchors'); assert(Object.values(item.anchors).every(anchor => typeof anchor === 'string' && anchor.length > 0 && anchor.length <= 1000 && !/\/Users\/|\.agents\/|https?:\/\//.test(anchor)), 'invalid public rubric anchor'); }
    assert(Array.isArray(assessments.rows) && assessments.rows.length === 48 && new Set(assessments.rows.map(row => row.rowId)).size === 48, 'incomplete quality assessment matrix');
    for (const assessed of assessments.rows) {
      keys(assessed, ['rowId', 'judgments'], 'quality assessed row'); const row = value.rows.find(item => item.id === assessed.rowId); assert(row, 'assessment references unknown quality row');
      if (row.scoreSource === 'task-policy' || row.scoreReason === 'provider-infrastructure') assert(Array.isArray(assessed.judgments) && assessed.judgments.length === 0, 'policy outcome must not invent public judge assessments');
      else orderedIds(assessed.judgments?.map(item => item.judgeConfigurationId), QUALITY_JUDGES, 'public quality panel');
      assessed.judgments.forEach(validatePublicQualityJudgment);
      if (row.status === 'scored') { assert(assessed.judgments.every(item => item.status === 'complete') && row.score === qualityMean(assessed.judgments), 'quality score differs from original panel'); for (const dimension of row.dimensionScores) assert(dimension.rating === assessed.judgments.reduce((sum, judge) => sum + judge.dimensions.find(item => item.id === dimension.id).rating, 0) / 2, 'quality dimension differs from original panel'); }
    }
  }
  return value;
}

export function validateBackendTestingRepairCheck(value) {
  keys(value, ['kind', 'schemaVersion', 'date', 'caseId', 'sourceSha256', 'skillSha256', 'nativeSessions', 'automaticRetries', 'knownTokens', 'usageMissingSessions', 'rows'], 'repair check');
  assert(value.kind === 'backend-testing-repair-check' && value.schemaVersion === 1 && value.date === '2026-10-09' && value.caseId === 'purchases' && SHA256.test(value.sourceSha256) && SHA256.test(value.skillSha256), 'invalid repair identity');
  assert(value.nativeSessions === 6 && value.automaticRetries === 0 && Number.isInteger(value.knownTokens) && value.knownTokens >= 0 && Number.isInteger(value.usageMissingSessions) && value.usageMissingSessions >= 0 && value.usageMissingSessions <= 6, 'invalid repair resources');
  orderedIds(value.rows?.map(row => row.configurationId), BACKEND_TESTING_CONFIGURATIONS.map(item => item.id), 'repair configuration');
  for (const row of value.rows) {
    keys(row, ['configurationId', 'label', 'status', 'score', 'judgeScores', 'controlsPassed', 'testsPerControl', 'faultsDetected', 'faultsReplayed', 'protection'], 'repair row');
    assert(row.label === BACKEND_TESTING_CONFIGURATIONS.find(item => item.id === row.configurationId).label && ['timeout', 'complete'].includes(row.status), 'invalid repair row identity');
    if (row.status === 'timeout') assert(row.score === null && same(row.judgeScores, []) && row.controlsPassed === 0 && row.testsPerControl === null && row.faultsDetected === 0 && row.faultsReplayed === 0 && row.protection === 'unresolved', 'timeout has invented repair evidence');
    else {
      orderedIds(row.judgeScores?.map(item => item.configurationId), QUALITY_JUDGES, 'repair judge');
      for (const judge of row.judgeScores) { keys(judge, ['configurationId', 'score'], 'repair judge score'); assert(finite(judge.score) === judge.score && judge.score <= 100, 'invalid repair judge score'); }
      assert(row.score === qualityMean(row.judgeScores) && row.controlsPassed === 2 && Number.isInteger(row.testsPerControl) && row.testsPerControl > 0 && row.faultsDetected === 4 && row.faultsReplayed === 4 && row.protection === 'retained', 'invalid completed repair evidence');
    }
  }
  return value;
}

const pairedSummaries = rows => BACKEND_TESTING_CONFIGURATIONS.map(configuration => {
  const baseline = rows.find(row => row.configurationId === configuration.id && row.condition === 'none').score;
  const treatment = rows.find(row => row.configurationId === configuration.id && row.condition === 'repaired').score;
  return { configurationId: configuration.id, baseline, treatment, delta: baseline === null || treatment === null ? null : treatment - baseline };
});

export function validateBackendTestingPairedRepair(value) {
  keys(value, ['kind', 'schemaVersion', 'date', 'caseId', 'sourceSha256', 'skillSha256', 'scope', 'status', 'successCriterionMet', 'nativeSessions', 'automaticRetries', 'knownTokens', 'usageMissingSessions', 'scoreBasis', 'rows', 'summaries', 'meanPairedDifference'], 'paired repair');
  assert(value.kind === 'backend-testing-paired-repair-check' && value.schemaVersion === 1 && value.date === '2026-10-09' && value.caseId === 'player-saves' && value.scope === 'one-known-case-development' && SHA256.test(value.sourceSha256) && SHA256.test(value.skillSha256), 'invalid paired repair identity');
  assert(value.nativeSessions === 10 && value.automaticRetries === 0 && Number.isInteger(value.knownTokens) && value.knownTokens >= 0 && Number.isInteger(value.usageMissingSessions) && value.usageMissingSessions >= 0 && value.usageMissingSessions <= 10, 'invalid paired repair resources');
  keys(value.scoreBasis, ['maximum', 'judgeCount', 'judges', 'dimensions'], 'paired repair score basis');
  assert(value.scoreBasis.maximum === 100 && value.scoreBasis.judgeCount === 2 && same(value.scoreBasis.judges, QUALITY_JUDGES) && same(value.scoreBasis.dimensions.map(({ id, label, weight }) => ({ id, label, weight })), QUALITY_DIMENSIONS), 'paired repair rubric differs');
  for (const dimension of value.scoreBasis.dimensions) {
    keys(dimension, ['id', 'label', 'weight', ...(dimension.anchors ? ['anchors'] : [])], 'paired repair rating basis');
    if (dimension.anchors) { keys(dimension.anchors, ['0', '1', '2', '3', '4'], 'paired repair anchors'); assert(Object.values(dimension.anchors).every(anchor => typeof anchor === 'string' && anchor.length > 0 && anchor.length <= 1000 && !/\/Users\/|\.agents\/|https?:\/\//.test(anchor)), 'unsafe paired repair anchors'); }
  }
  assert(Array.isArray(value.rows) && value.rows.length === 8, 'paired repair omits planned outcomes');
  const identities = new Set();
  for (const row of value.rows) {
    keys(row, ['id', 'configurationId', 'label', 'condition', 'status', 'generationStatus', 'executionStatus', 'testStatus', 'cleanupStatus', 'score', 'protection', 'dimensionScores', 'judgments', 'elapsedMs', 'verificationMs', 'inputTokens', 'outputTokens'], 'paired repair row');
    const configuration = BACKEND_TESTING_CONFIGURATIONS.find(item => item.id === row.configurationId);
    assert(configuration && row.label === configuration.label && ['none', 'repaired'].includes(row.condition) && row.id === `${row.configurationId}:${row.condition}` && !identities.has(row.id), 'invalid paired repair row identity'); identities.add(row.id);
    assert(['scored', 'invalid', 'incomplete'].includes(row.status) && ['complete', 'failed', 'infrastructure-failure', 'timeout', 'invalid-submission'].includes(row.generationStatus) && ['valid', 'invalid', 'unresolved', 'not-run'].includes(row.executionStatus) && ['pass', 'assertion-failure', 'execution-failure', 'infrastructure-failure', 'timeout', 'not-run'].includes(row.testStatus) && ['pass', 'failed', 'not-run'].includes(row.cleanupStatus), 'invalid paired repair outcome');
    assert(Array.isArray(row.judgments) && row.judgments.length <= 2, 'invalid paired repair reviews');
    if (row.judgments.length) orderedIds(row.judgments.map(judge => judge.judgeConfigurationId), QUALITY_JUDGES, 'paired repair panel');
    row.judgments.forEach(validatePublicQualityJudgment);
    const scored = row.judgments.length === 2 && row.judgments.every(judge => judge.status === 'complete');
    assert(row.status === 'scored' ? scored && row.generationStatus === 'complete' && row.score === qualityMean(row.judgments) : row.score === null && !scored, 'paired repair score differs from panel');
    const protection = row.judgments.some(judge => judge.protection === 'lost') ? 'lost' : scored && row.judgments.every(judge => judge.protection === 'retained') ? 'retained' : 'unresolved';
    assert(row.protection === protection, 'paired repair protection differs from panel');
    orderedIds(row.dimensionScores?.map(item => item.id), QUALITY_DIMENSIONS.map(item => item.id), 'paired repair dimension');
    for (const dimension of row.dimensionScores) {
      keys(dimension, ['id', 'rating', 'points'], 'paired repair dimension score');
      const rating = scored ? row.judgments.reduce((sum, judge) => sum + judge.dimensions.find(item => item.id === dimension.id).rating, 0) / 2 : null;
      assert(dimension.rating === rating && dimension.points === (rating === null ? null : QUALITY_DIMENSIONS.find(item => item.id === dimension.id).weight * rating / 4), 'paired repair dimension arithmetic differs');
    }
    for (const field of ['elapsedMs', 'verificationMs', 'inputTokens', 'outputTokens']) assert(row[field] === null || finite(row[field]) === row[field], 'invalid paired repair row resource');
  }
  const summaries = pairedSummaries(value.rows), mean = qualityMean(summaries.map(row => ({ score: row.delta })));
  const complete = value.rows.every(row => row.status === 'scored');
  assert(same(value.summaries, summaries) && value.meanPairedDifference === mean && value.status === (complete ? 'complete' : 'incomplete'), 'paired repair summary arithmetic differs');
  assert(value.successCriterionMet === (complete && value.rows.every(row => row.generationStatus === 'complete' && row.executionStatus === 'valid' && row.testStatus === 'pass') && mean > 0 && value.rows.filter(row => row.condition === 'repaired').every(row => row.protection === 'retained')), 'paired repair success differs from declared criterion');
  return value;
}

function buildPairedRepair(selection, read, rubric, rubricSha256) {
  keys(selection, ['plan', 'skill', 'generation', 'review', 'mapping', 'authors', 'judges'], 'paired repair selection');
  assert(selection.authors?.length === 8 && selection.judges?.length === 2, 'invalid paired repair source cohort');
  const plan = read(selection.plan, 'paired repair plan'), generation = read(selection.generation, 'paired repair generation'), review = read(selection.review, 'paired repair review'), mapping = read(selection.mapping, 'paired repair mapping');
  read(selection.skill, 'paired repair skill');
  assert(plan.kind === 'paired-testing-skill-development-check' && generation.kind === plan.kind && review.kind === plan.kind && plan.caseId === 'player-saves' && typeof plan.createdAt === 'string' && plan.createdAt.startsWith('2026-10-09T') && SHA256.test(plan.sourceHash) && SHA256.test(plan.runnerSha256) && SHA256.test(plan.verifierSha256) && plan.rubricSha256 === rubricSha256 && plan.pins?.['skill.json'] === selection.skill.sha256, 'paired repair source basis differs');
  assert(plan.policy?.authorSessions === 8 && plan.policy.reviewSessions === 2 && plan.policy.trialsPerCondition === 1 && plan.policy.concurrency === 4 && plan.policy.tools === false && plan.policy.automaticRetries === 0 && plan.policy.authorTimeoutMs === 600000 && plan.policy.reviewTimeoutMs === 600000, 'paired repair execution policy differs');
  assert(same(rubric.dimensions.map(({ id, label, weight }) => ({ id, label, weight })), QUALITY_DIMENSIONS) && same(rubric.judges, QUALITY_JUDGES) && rubric.protectionRules?.lostMaterialPreexistingProtectionMaximum === 49 && rubric.protectionRules?.zeroMeaningfulRunnableCoverageScore === 0, 'paired repair scoring instrument differs');
  assert(plan.rows?.length === 8 && generation.rows?.length === 8 && review.rows?.length === 8 && new Set(plan.rows.map(row => row.id)).size === 8, 'paired repair planned matrix differs');
  orderedIds(plan.rows.map(row => `${row.configurationId}:${row.condition}`), BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => ['none', 'repaired'].map(condition => `${configuration.id}:${condition}`)), 'paired repair author');
  const pins = [selection.plan, selection.skill, selection.generation, selection.review, selection.mapping], receipts = [];
  const native = (pin, launchPin, configurationId, label) => {
    const receipt = read(pin, label), launch = read(launchPin, `${label} launch`); pins.push(pin, launchPin); receipts.push(receipt);
    const [provider, setting] = configurationId.split(':'), [model, reasoning] = setting.split('@');
    assert(same(receipt.configuration, { id: configurationId, provider, model, reasoning }) && receipt.toolsAllowed === false && receipt.toolUse === false && ['complete', 'failed', 'infrastructure-failure', 'timeout', 'invalid-submission'].includes(receipt.status) && finite(receipt.elapsedMs) === receipt.elapsedMs, 'paired repair native receipt differs');
    assert(receipt.complete === (receipt.status === 'complete') && receipt.timedOut === (receipt.status === 'timeout') && receipt.runtime?.requestedReasoning === reasoning && receipt.preflight?.some(item => item.configurationId === configurationId && item.model === model && item.effort === reasoning && item.accepted === true), 'paired repair native metadata differs');
    assert(provider === 'codex' ? receipt.runtime.requestedModel === model && receipt.runtime.modelIdentityEvidence === 'exact-native-catalog-selection-and-cli-invocation-no-fallback' : receipt.runtime.model === model && receipt.runtime.exactModel === true && same(receipt.runtime.assistantModels, [model]), 'paired repair native model identity differs');
    assert(same(launch.configuration, receipt.configuration) && launch.toolsAllowed === false && SHA256.test(launch.promptSha256), 'paired repair native launch differs');
    return { receipt, promptSha256: launch.promptSha256 };
  };
  const sources = plan.rows.map((row, index) => {
    assert(row.trial === 1 && typeof row.id === 'string' && /^[A-Za-z0-9-]+$/.test(row.id), 'invalid paired repair planned identity');
    const selected = selection.authors[index]; keys(selected, ['receipt', 'launch', 'outcome', ...(selected.verification ? ['verification'] : [])], 'paired repair author pins');
    const { receipt, promptSha256 } = native(selected.receipt, selected.launch, row.configurationId, `paired repair author ${index + 1}`), outcome = read(selected.outcome, `paired repair outcome ${index + 1}`); pins.push(selected.outcome);
    assert(promptSha256 === plan.pins[`prompt-${row.condition}.txt`], 'paired repair condition differs from native prompt');
    assert(['id', 'configurationId', 'condition', 'trial'].every(field => outcome[field] === row[field]) && same(generation.rows[index], outcome) && (receipt.status === 'complete' || outcome.status === receipt.status), 'paired repair outcome differs from original author');
    const execution = selected.verification ? read(selected.verification, `paired repair verification ${index + 1}`) : null;
    if (execution) {
      pins.push(selected.verification);
      assert(receipt.status === 'complete' && execution.schemaVersion === 2 && execution.rowId === row.id && execution.caseId === plan.caseId && execution.evaluatorSha256 === plan.verifierSha256 && execution.status === outcome.status && execution.testStatus === outcome.testStatus && execution.cleanupStatus === outcome.cleanupStatus && same(outcome.usage, receipt.usage), 'paired repair verifier differs');
      assert(same(outcome.controls, execution.controlRuns.map(run => ({ status: run.testStatus, cleanupStatus: run.cleanupStatus, passes: run.stats?.passes }))) && same(outcome.faults, execution.faultRuns.map(run => ({ id: run.faultId, status: run.status }))), 'paired repair execution summary differs');
    } else assert(!['valid', 'invalid'].includes(outcome.status), 'paired repair runnable artifact lacks verification');
    return { planned: row, receipt, outcome, execution, artifactSha256: selected.verification?.sha256 };
  });
  const reviewedIds = sources.filter(source => ['valid', 'invalid'].includes(source.outcome.status)).map(source => source.planned.id);
  assert(same(review.mapping, mapping) && Object.keys(mapping).every(label => /^[A-H]$/.test(label)), 'paired repair blinded mapping differs');
  orderedIds(Object.values(mapping), reviewedIds, 'paired repair blinded candidate');
  assert(review.judges?.length === 2, 'paired repair review omits native seats');
  const panels = selection.judges.map((selected, index) => {
    keys(selected, ['receipt', 'launch', ...(selected.validated ? ['validated'] : [])], 'paired repair judge pins');
    const { receipt, promptSha256 } = native(selected.receipt, selected.launch, QUALITY_JUDGES[index], `paired repair judge ${index + 1}`);
    const validated = selected.validated ? read(selected.validated, `paired repair validated review ${index + 1}`) : null;
    if (validated) {
      pins.push(selected.validated);
      assert(receipt.status === 'complete' && validated.status === 'complete' && validated.configurationId === QUALITY_JUDGES[index] && same(validated.usage, receipt.usage) && same(review.judges[index], validated), 'paired repair validated review differs');
      orderedIds(Object.keys(validated.judgments ?? {}), reviewedIds, 'paired repair judge candidate');
      const output = receipt.structuredOutput ?? JSON.parse(receipt.finalText);
      orderedIds(Object.keys(output), Object.keys(mapping), 'paired repair raw review');
      for (const [label, id] of Object.entries(mapping)) assert(same(output[label], validated.judgments[id].evaluation), 'paired repair judgment differs from original native review');
    } else assert(review.judges[index].configurationId === QUALITY_JUDGES[index] && review.judges[index].status !== 'complete', 'paired repair missing validated review');
    return { receipt, selected, validated, promptSha256 };
  });
  assert(panels[0].promptSha256 === panels[1].promptSha256, 'paired repair judges received different blinded packets');
  const rows = sources.map(source => {
    const judgments = source.execution ? panels.map((panel, index) => {
      const record = panel.validated?.judgments[source.planned.id];
      const candidate = { id: source.planned.id, artifactSha256: source.artifactSha256 };
      return publicQualityJudgment(record ? { ...record, judgeId: QUALITY_JUDGES[index], resultSha256: panel.selected.receipt.sha256, candidateId: candidate.id, artifactSha256: candidate.artifactSha256, inputHashes: { rubric: rubricSha256, verifier: plan.verifierSha256 } } : { judgeId: QUALITY_JUDGES[index], status: panel.receipt.status === 'complete' ? 'invalid' : 'infrastructure-failure', resultSha256: panel.selected.receipt.sha256 }, candidate, rubricSha256, plan.verifierSha256);
    }) : [];
    const scored = judgments.length === 2 && judgments.every(judge => judge.status === 'complete'), score = scored ? qualityMean(judgments) : null;
    assert(same(review.rows.find(row => row.id === source.planned.id), { ...source.outcome, score }), 'paired repair reported score differs from original judgments');
    const executionRuns = [...(source.execution?.controlRuns ?? []), ...(source.execution?.faultRuns ?? [])];
    return { id: `${source.planned.configurationId}:${source.planned.condition}`, configurationId: source.planned.configurationId, label: BACKEND_TESTING_CONFIGURATIONS.find(item => item.id === source.planned.configurationId).label, condition: source.planned.condition,
      status: scored ? 'scored' : source.outcome.status === 'invalid-submission' ? 'invalid' : 'incomplete', generationStatus: source.receipt.status, executionStatus: source.execution?.status ?? 'not-run', testStatus: source.execution?.testStatus ?? 'not-run', cleanupStatus: source.execution?.cleanupStatus ?? 'not-run', score,
      protection: judgments.some(judge => judge.protection === 'lost') ? 'lost' : scored && judgments.every(judge => judge.protection === 'retained') ? 'retained' : 'unresolved',
      dimensionScores: QUALITY_DIMENSIONS.map(dimension => { const rating = scored ? judgments.reduce((sum, judge) => sum + judge.dimensions.find(item => item.id === dimension.id).rating, 0) / 2 : null; return { id: dimension.id, rating, points: rating === null ? null : dimension.weight * rating / 4 }; }), judgments,
      elapsedMs: finite(source.receipt.elapsedMs), verificationMs: executionRuns.length && executionRuns.every(run => finite(run.elapsedMs) !== null) ? executionRuns.reduce((total, run) => total + run.elapsedMs, 0) : null,
      inputTokens: finite(source.receipt.usage?.input_tokens), outputTokens: finite(source.receipt.usage?.output_tokens) };
  });
  rows.sort((left, right) => BACKEND_TESTING_CONFIGURATIONS.findIndex(item => item.id === left.configurationId) - BACKEND_TESTING_CONFIGURATIONS.findIndex(item => item.id === right.configurationId) || ['none', 'repaired'].indexOf(left.condition) - ['none', 'repaired'].indexOf(right.condition));
  const tokenTotals = receipts.map(receipt => {
    if (!receipt.usage) return null;
    const fields = receipt.configuration.provider === 'claude' ? ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'] : ['input_tokens', 'output_tokens'];
    assert(fields.every(field => receipt.usage[field] == null || Number.isInteger(receipt.usage[field]) && receipt.usage[field] >= 0), 'invalid paired repair native usage');
    return fields.every(field => receipt.usage[field] != null) ? fields.reduce((total, field) => total + receipt.usage[field], 0) : null;
  });
  const summaries = pairedSummaries(rows), meanPairedDifference = qualityMean(summaries.map(row => ({ score: row.delta }))), complete = rows.every(row => row.status === 'scored');
  return validateBackendTestingPairedRepair({ kind: 'backend-testing-paired-repair-check', schemaVersion: 1, date: '2026-10-09', caseId: 'player-saves', sourceSha256: hash([...pins.map(pin => pin.sha256), rubricSha256].join('\n')), skillSha256: selection.skill.sha256, scope: 'one-known-case-development', status: complete ? 'complete' : 'incomplete', successCriterionMet: complete && rows.every(row => row.generationStatus === 'complete' && row.executionStatus === 'valid' && row.testStatus === 'pass') && meanPairedDifference > 0 && rows.filter(row => row.condition === 'repaired').every(row => row.protection === 'retained'), nativeSessions: receipts.length, automaticRetries: 0, knownTokens: tokenTotals.reduce((total, tokens) => total + (tokens ?? 0), 0), usageMissingSessions: tokenTotals.filter(tokens => tokens === null).length, scoreBasis: { maximum: 100, judgeCount: 2, judges: [...QUALITY_JUDGES], dimensions: rubric.dimensions.map(({ id, label, weight, anchors }) => ({ id, label, weight, anchors })) }, rows, summaries, meanPairedDifference });
}

const CURRENT_BENCHMARK = { id: 'backend-testing', title: 'Backend test-suite quality', description: 'Four model settings maintain the same existing test suite with minimal instructions or the current testing skill.' };
const CURRENT_CONDITIONS = [{ id: 'none', label: 'Minimal' }, { id: 'repaired', label: 'Current skill' }];
const TASTE_ANCHORS = [
  { score: 0, meaning: 'No useful maintained behavioral protection; the suite cannot serve its stated purpose.' },
  { score: 0.25, meaning: 'Serious proof and design defects; substantial rewrite needed.' },
  { score: 0.5, meaning: 'Useful protection, but material assertion, coverage, readability or maintenance defects need work.' },
  { score: 0.75, meaning: 'Sound, maintainable scoped tests with noticeable targeted improvements still justified.' },
  { score: 0.9, meaning: 'Excellent behavioral proof and craftsmanship; remaining improvements are minor and specific.' },
  { score: 1, meaning: 'Exemplary for this bounded scope; no consequential proof or maintenance improvement identified from the supplied evidence.' }
];
const TASTE_AGGREGATION = 'Mean of two independent holistic suite scores; equal-weight mean across four matched differences. Retain each judge and each file score. No forced spread or protection caps; existing technical checks remain separate.';
const TASTE_DIMENSION_RUBRIC = JSON.parse(fs.readFileSync(new URL('../../benchmarks/backend-testing/taste-rubric.json', import.meta.url), 'utf8'));
const TASTE_DIMENSIONS = TASTE_DIMENSION_RUBRIC.dimensions;
const tasteNumber = value => Number.isFinite(value) && value >= 0 && value <= 1;
const tasteEqual = (left, right) => left === right || Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1e-12;
const tasteProse = (value, maximum = 260) => assert(typeof value === 'string' && value.length >= 16 && value.length <= maximum && !/\/(?:Users|home|tmp|private|var|etc)\/|\.agents\/|https?:\/\/|(?:original|final|context|test)\/|(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.(?:js|json|txt|md)|```|assert\.(?:equal|deepEqual)|expect\(/.test(value), 'unsafe public taste prose');
const tasteWeightedScore = dimensions => TASTE_DIMENSIONS.reduce((sum, dimension) => sum + dimensions.find(item => item.id === dimension.id).score * dimension.weight, 0) / 100;
const tasteOriginalScore = value => assert(tasteNumber(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, 'invalid original taste score');
const tasteDimensionMeans = judgments => TASTE_DIMENSIONS.map(({ id }) => {
  const complete = judgments.every(judge => judge.status === 'complete');
  const scores = complete ? judgments.map(judge => judge.dimensions.find(dimension => dimension.id === id).score) : [];
  return { id, score: complete ? scores.reduce((sum, score) => sum + score, 0) / 2 : null, range: { minimum: complete ? Math.min(...scores) : null, maximum: complete ? Math.max(...scores) : null } };
});
const tasteDimensionPairs = (baseline, treatment) => TASTE_DIMENSIONS.map(({ id }) => {
  const before = baseline.find(dimension => dimension.id === id).score, after = treatment.find(dimension => dimension.id === id).score;
  return { id, baseline: before, treatment: after, delta: before === null || after === null ? null : after - before };
});
const tastePairedSummaries = rows => pairedSummaries(rows).map(summary => ({ ...summary, dimensions: tasteDimensionPairs(rows.find(row => row.configurationId === summary.configurationId && row.condition === 'none').dimensions, rows.find(row => row.configurationId === summary.configurationId && row.condition === 'repaired').dimensions) }));
const tasteDimensionSummaries = summaries => TASTE_DIMENSIONS.map(({ id }) => {
  const selected = summaries.map(summary => summary.dimensions.find(dimension => dimension.id === id));
  return { id, baseline: qualityMean(selected.map(row => ({ score: row.baseline }))), treatment: qualityMean(selected.map(row => ({ score: row.treatment }))), delta: qualityMean(selected.map(row => ({ score: row.delta }))) };
});
function tasteProfilesMatch(observed, expected) {
  orderedIds(observed?.map(dimension => dimension.id), TASTE_DIMENSIONS.map(dimension => dimension.id), 'taste dimension profile');
  return expected.every(profile => {
    const actual = observed.find(dimension => dimension.id === profile.id); keys(actual, ['id', 'baseline', 'treatment', 'delta'], 'taste paired dimension');
    return ['baseline', 'treatment', 'delta'].every(field => tasteEqual(actual[field], profile[field]));
  });
}
function tasteModelSummariesMatch(observed, expected) {
  orderedIds(observed?.map(summary => summary.configurationId), BACKEND_TESTING_CONFIGURATIONS.map(configuration => configuration.id), 'taste model profile');
  return expected.every(summary => {
    const actual = observed.find(item => item.configurationId === summary.configurationId); keys(actual, ['configurationId', 'baseline', 'treatment', 'delta', 'dimensions'], 'taste matched model summary');
    return ['baseline', 'treatment', 'delta'].every(field => tasteEqual(actual[field], summary[field])) && tasteProfilesMatch(actual.dimensions, summary.dimensions);
  });
}

function validateTasteEvidence(pointers) {
  assert(Array.isArray(pointers) && pointers.length >= 1 && pointers.length <= 2, 'invalid public taste evidence');
  for (const pointer of pointers) {
    keys(pointer, ['file', 'version', 'startLine', 'endLine'], 'taste evidence');
    assert(typeof pointer.file === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(pointer.file) && ['original', 'final', 'context', 'shared'].includes(pointer.version) && Number.isInteger(pointer.startLine) && pointer.startLine >= 1 && Number.isInteger(pointer.endLine) && pointer.endLine >= pointer.startLine, 'unsafe public taste pointer');
  }
}

function validateTasteDimensionJudgment(judgment) {
  keys(judgment, ['judgeConfigurationId', 'reviewSha256', 'status', 'score', 'dimensions', 'files', ...(judgment.status === 'incomplete' && Object.hasOwn(judgment, 'failure') ? ['failure'] : [])], 'dimension taste judgment');
  assert(QUALITY_JUDGES.includes(judgment.judgeConfigurationId) && SHA256.test(judgment.reviewSha256) && ['complete', 'incomplete'].includes(judgment.status), 'invalid taste judge');
  orderedIds(judgment.dimensions?.map(dimension => dimension.id), TASTE_DIMENSIONS.map(dimension => dimension.id), 'taste dimension');
  if (judgment.status === 'incomplete') {
    assert((!Object.hasOwn(judgment, 'failure') || judgment.failure === 'timeout') && judgment.score === null && same(judgment.files, []) && same(judgment.dimensions, TASTE_DIMENSIONS.map(({ id }) => ({ id, score: null, reason: null, evidence: [] }))), 'incomplete taste review invents dimensions or failure'); return;
  }
  for (const dimension of judgment.dimensions) {
    keys(dimension, ['id', 'score', 'reason', 'evidence', ...(Object.hasOwn(dimension, 'qualifications') ? ['qualifications'] : [])], 'taste dimension finding'); tasteOriginalScore(dimension.score); tasteProse(dimension.reason, 320); validateTasteEvidence(dimension.evidence);
    if (Object.hasOwn(dimension, 'qualifications')) {
      assert(Array.isArray(dimension.qualifications) && dimension.qualifications.length === 1, 'invalid taste evidence qualification');
      const qualification = dimension.qualifications[0]; keys(qualification, ['finding', 'evidence'], 'taste evidence qualification'); tasteProse(qualification.finding, 320); validateTasteEvidence(qualification.evidence);
    }
  }
  assert(tasteEqual(judgment.score, tasteWeightedScore(judgment.dimensions)), 'taste suite total differs from weighted dimensions');
  assert(Array.isArray(judgment.files) && judgment.files.length >= 1 && judgment.files.length <= 4 && new Set(judgment.files.map(file => file.file)).size === judgment.files.length, 'invalid public taste file inventory');
  for (const file of judgment.files) {
    keys(file, ['file', 'score', 'dimensions', 'reason', 'evidence'], 'dimension taste file');
    assert(/^[A-Za-z0-9][A-Za-z0-9_.-]*\.spec\.js$/.test(file.file), 'unsafe public taste file'); tasteProse(file.reason, 320); validateTasteEvidence(file.evidence);
    orderedIds(file.dimensions?.map(dimension => dimension.id), TASTE_DIMENSIONS.map(dimension => dimension.id), 'taste file dimension');
    for (const dimension of file.dimensions) { keys(dimension, ['id', 'score'], 'taste file dimension score'); tasteOriginalScore(dimension.score); }
    assert(tasteEqual(file.score, tasteWeightedScore(file.dimensions)) && file.evidence.some(pointer => pointer.file === file.file && pointer.version === 'final'), 'taste file total or direct evidence differs');
    assert(file.dimensions.find(dimension => dimension.id === 'semantic_naming').score !== 0 || judgment.dimensions.find(dimension => dimension.id === 'semantic_naming').score === 0, 'file naming zero must also apply to suite naming');
  }
}

function validateTasteJudgment(judgment) {
  keys(judgment, ['judgeConfigurationId', 'reviewSha256', 'status', 'score', 'reason', 'strengths', 'weaknesses', 'files'], 'taste judgment');
  assert(QUALITY_JUDGES.includes(judgment.judgeConfigurationId) && SHA256.test(judgment.reviewSha256) && ['complete', 'incomplete'].includes(judgment.status), 'invalid taste judge');
  if (judgment.status === 'incomplete') { assert(judgment.score === null && judgment.reason === null && same(judgment.strengths, []) && same(judgment.weaknesses, []) && same(judgment.files, []), 'incomplete taste review invents findings'); return; }
  const score = tasteOriginalScore, evidence = validateTasteEvidence;
  score(judgment.score); tasteProse(judgment.reason);
  for (const kind of ['strengths', 'weaknesses']) {
    assert(Array.isArray(judgment[kind]) && judgment[kind].length <= 2 && (kind !== 'strengths' || judgment[kind].length >= 1), 'invalid taste findings');
    for (const finding of judgment[kind]) { keys(finding, ['finding', 'evidence'], 'taste finding'); tasteProse(finding.finding); evidence(finding.evidence); }
  }
  assert(Array.isArray(judgment.files) && judgment.files.length >= 1 && judgment.files.length <= 4 && new Set(judgment.files.map(file => file.file)).size === judgment.files.length, 'invalid public taste file inventory');
  for (const file of judgment.files) {
    keys(file, ['file', 'score', 'reason', 'evidence'], 'taste file score');
    assert(/^[A-Za-z0-9][A-Za-z0-9_.-]*\.spec\.js$/.test(file.file), 'unsafe public taste file'); score(file.score); tasteProse(file.reason); evidence(file.evidence);
    assert(file.evidence.some(pointer => pointer.file === file.file && pointer.version === 'final'), 'taste file score lacks direct final evidence');
  }
}

export function validateBackendTestingTaste(value) {
  const dimensioned = value?.schemaVersion === 2, retried = dimensioned && Object.hasOwn(value, 'retry');
  keys(value, ['kind', 'schemaVersion', 'date', 'caseId', 'scope', 'sourceSha256', 'status', 'nativeSessions', 'knownTokens', 'usageMissingSessions', 'scoreBasis', 'rows', 'summaries', 'baselineMean', 'treatmentMean', 'meanPairedDifference', ...(dimensioned ? ['dimensionSummaries'] : []), ...(retried ? ['retry'] : [])], 'taste review');
  assert(value.kind === 'backend-testing-taste-review' && [1, 2].includes(value.schemaVersion) && value.date === (dimensioned ? '2026-10-10' : '2026-10-09') && value.caseId === 'player-saves' && value.scope === 'exploratory-post-hoc-review' && SHA256.test(value.sourceSha256) && value.nativeSessions === (retried ? 3 : 2) && Number.isInteger(value.knownTokens) && value.knownTokens >= 0 && Number.isInteger(value.usageMissingSessions) && value.usageMissingSessions >= 0 && value.usageMissingSessions <= value.nativeSessions, 'invalid taste review identity or resources');
  if (retried) {
    const retry = value.retry; keys(retry, ['judgeConfigurationId', 'authorization', 'amendmentSha256', 'priorReviewSha256', 'reviewSha256', 'priorStatus', 'status', 'timeoutMs', 'automaticRetries', 'priorTokens', 'retryTokens'], 'taste retry');
    assert(retry.judgeConfigurationId === QUALITY_JUDGES[0] && retry.authorization === 'user-requested-after-timeout' && [retry.amendmentSha256, retry.priorReviewSha256, retry.reviewSha256].every(value => SHA256.test(value)) && retry.priorReviewSha256 !== retry.reviewSha256 && retry.priorStatus === 'timeout' && ['complete', 'incomplete'].includes(retry.status) && retry.timeoutMs === 1200000 && retry.automaticRetries === 0 && ['priorTokens', 'retryTokens'].every(field => retry[field] === null || Number.isInteger(retry[field]) && retry[field] >= 0), 'invalid explicit taste retry');
    assert(value.usageMissingSessions >= [retry.priorTokens, retry.retryTokens].filter(tokens => tokens === null).length && value.knownTokens >= (retry.priorTokens ?? 0) + (retry.retryTokens ?? 0), 'taste retry silently discards session usage');
  }
  assert(same(value.scoreBasis, dimensioned ? { minimum: 0, maximum: 1, decimals: 2, aggregation: TASTE_DIMENSION_RUBRIC.aggregation, anchors: TASTE_DIMENSION_RUBRIC.anchors, dimensions: TASTE_DIMENSIONS, namingZeroRule: TASTE_DIMENSION_RUBRIC.namingZeroRule } : { minimum: 0, maximum: 1, decimals: 2, aggregation: TASTE_AGGREGATION, anchors: TASTE_ANCHORS }), 'taste instrument differs');
  orderedIds(value.rows?.map(row => row.id), BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => ['none', 'repaired'].map(condition => `${configuration.id}:${condition}`)), 'taste outcome');
  for (const row of value.rows) {
    keys(row, ['id', 'configurationId', 'label', 'condition', 'status', 'score', 'range', 'judgments', ...(dimensioned ? ['dimensions'] : [])], 'taste row');
    assert(row.label === BACKEND_TESTING_CONFIGURATIONS.find(item => item.id === row.configurationId)?.label && ['none', 'repaired'].includes(row.condition) && row.id === `${row.configurationId}:${row.condition}`, 'invalid taste row identity');
    orderedIds(row.judgments?.map(judge => judge.judgeConfigurationId), QUALITY_JUDGES, 'taste panel'); row.judgments.forEach(dimensioned ? validateTasteDimensionJudgment : validateTasteJudgment);
    if (retried) { const judgment = row.judgments.find(judge => judge.judgeConfigurationId === value.retry.judgeConfigurationId); assert(judgment.reviewSha256 === value.retry.reviewSha256 && judgment.status === value.retry.status, 'taste retry differs from retained review'); }
    const complete = row.judgments.every(judge => judge.status === 'complete');
    assert(row.status === (complete ? 'scored' : 'incomplete') && tasteEqual(row.score, complete ? qualityMean(row.judgments) : null), 'taste row score differs from original panel');
    keys(row.range, ['minimum', 'maximum'], 'taste score range');
    assert(row.range.minimum === (complete ? Math.min(...row.judgments.map(judge => judge.score)) : null) && row.range.maximum === (complete ? Math.max(...row.judgments.map(judge => judge.score)) : null), 'taste range differs from original panel');
    if (complete) assert(same(row.judgments[0].files.map(file => file.file).sort(), row.judgments[1].files.map(file => file.file).sort()), 'taste reviewers rated different file inventories');
    if (dimensioned) {
      orderedIds(row.dimensions?.map(dimension => dimension.id), TASTE_DIMENSIONS.map(dimension => dimension.id), 'taste mean dimension');
      assert(tasteDimensionMeans(row.judgments).every(expected => { const observed = row.dimensions.find(dimension => dimension.id === expected.id); keys(observed, ['id', 'score', 'range'], 'taste dimension panel mean'); return tasteEqual(observed.score, expected.score) && same(observed.range, expected.range); }), 'taste dimension panel means differ from original ratings');
    }
  }
  const summaries = dimensioned ? tastePairedSummaries(value.rows) : pairedSummaries(value.rows);
  assert((dimensioned ? tasteModelSummariesMatch(value.summaries, summaries) : same(value.summaries, summaries)) && tasteEqual(value.baselineMean, qualityMean(summaries.map(row => ({ score: row.baseline })))) && tasteEqual(value.treatmentMean, qualityMean(summaries.map(row => ({ score: row.treatment })))) && tasteEqual(value.meanPairedDifference, qualityMean(summaries.map(row => ({ score: row.delta })))) && value.status === (value.rows.every(row => row.status === 'scored') ? 'complete' : 'incomplete'), 'taste aggregate differs from matched suite scores');
  if (dimensioned) assert(tasteProfilesMatch(value.dimensionSummaries, tasteDimensionSummaries(summaries)), 'taste matched dimension profiles differ from original ratings');
  return value;
}

function buildTasteReview(selection, read, pairedRepair, pairedSelection) {
  const plan = read(selection.plan, 'taste plan'), dimensioned = plan.schemaVersion === 2;
  keys(selection, ['plan', 'packet', 'mapping', 'summary', 'judges', ...(dimensioned ? ['rubric'] : []), ...(selection.retry ? ['retry'] : [])], 'taste selection');
  assert(!selection.retry || dimensioned, 'taste retry requires the dimensional instrument');
  const packets = read(selection.packet, 'taste packet'), mapping = read(selection.mapping, 'taste mapping'), summary = read(selection.summary, 'taste summary');
  const rubric = dimensioned ? read(selection.rubric, 'taste dimensional rubric') : null;
  if (dimensioned) assert(same(rubric, TASTE_DIMENSION_RUBRIC) && plan.rubricSha256 === selection.rubric.sha256 && plan.pins?.['rubric.json'] === selection.rubric.sha256, 'taste frozen dimensional rubric differs');
  assert(plan.kind === 'backend-testing-craft-review' && [1, 2].includes(plan.schemaVersion) && plan.date === (dimensioned ? '2026-10-10' : pairedRepair.date) && plan.caseId === pairedRepair.caseId && plan.exploratory === true && plan.authorPlanSha256 === pairedSelection.plan.sha256 && plan.skillSha256 === pairedRepair.skillSha256 && same(plan.anchors, dimensioned ? rubric.anchors : TASTE_ANCHORS) && plan.aggregation === (dimensioned ? rubric.aggregation : TASTE_AGGREGATION) && same(plan.judges, QUALITY_JUDGES), 'taste frozen basis differs');
  assert(plan.policy?.nativeSessions === 2 && plan.policy.automaticRetries === 0 && plan.policy.tools === false && plan.policy.timeoutMs === 600000 && plan.policy.maxPromptBytes === 327680 && plan.policy.maxAcceptedResponseBytes === 98304 && plan.pins?.['packet.json'] === selection.packet.sha256 && plan.pins?.['mapping.json'] === selection.mapping.sha256, 'taste policy or source pins differ');
  const authorPlan = read(pairedSelection.plan, 'taste original author plan'); assert(same(plan.rows, authorPlan.rows), 'taste artifact cohort differs from current author run');
  orderedIds(Object.keys(mapping), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], 'taste blind label'); orderedIds(Object.values(mapping), plan.rows.map(row => row.id), 'taste blinded artifact');
  assert(same(summary.mapping, mapping) && summary.kind === plan.kind && summary.schemaVersion === plan.schemaVersion && summary.rows?.length === 8 && summary.judges?.length === 2, 'taste summary differs');
  const auditQualifications = summary.auditQualifications ?? [];
  assert(Array.isArray(auditQualifications) && (dimensioned || auditQualifications.length === 0), 'invalid taste audit qualifications');
  const qualifiedFindings = new Set();
  for (const qualification of auditQualifications) {
    keys(qualification, ['rowId', 'judgeConfigurationId', 'dimensionId', 'finding', 'evidence'], 'taste audit qualification');
    assert(plan.rows.some(row => row.id === qualification.rowId) && QUALITY_JUDGES.includes(qualification.judgeConfigurationId) && TASTE_DIMENSIONS.some(dimension => dimension.id === qualification.dimensionId), 'taste audit qualification targets an unknown finding');
    const identity = JSON.stringify([qualification.rowId, qualification.judgeConfigurationId, qualification.dimensionId]); assert(!qualifiedFindings.has(identity), 'duplicate taste audit qualification'); qualifiedFindings.add(identity);
    tasteProse(qualification.finding, 320);
    assert(Array.isArray(qualification.evidence) && qualification.evidence.length >= 1 && qualification.evidence.length <= 2, 'invalid taste audit qualification evidence');
  }
  orderedIds(Object.keys(packets), Object.keys(mapping), 'taste packet');
  const packetFiles = new Map();
  for (const [label, packet] of Object.entries(packets)) {
    keys(packet, ['files', 'specs'], 'private taste packet');
    const files = new Map(packet.files.map(file => [file.path, file])); assert(files.size === packet.files.length && packet.files.every(file => typeof file.content === 'string' && hash(file.content) === file.sha256), 'taste packet file hashes differ');
    const index = plan.rows.findIndex(row => row.id === mapping[label]), execution = read(pairedSelection.authors[index].verification, `taste original artifact ${label}`);
    assert(same(packet.files.filter(file => file.path.startsWith('final/')).map(file => ({ path: file.path.slice(6), sha256: file.sha256 })).sort((a, b) => a.path.localeCompare(b.path)), [...execution.artifactFiles].sort((a, b) => a.path.localeCompare(b.path))), 'taste final files differ from verified current artifact');
    assert(same([...packet.specs].sort(), packet.files.filter(file => file.path.startsWith('final/') && file.path.endsWith('.spec.js')).map(file => file.path).sort()), 'taste retained spec inventory differs'); packetFiles.set(mapping[label], { files, specs: packet.specs });
  }
  const pins = [selection.plan, selection.packet, selection.mapping, selection.summary, ...(dimensioned ? [selection.rubric] : [])];
  const validateNative = (receipt, launch, index) => {
    const [provider, setting] = QUALITY_JUDGES[index].split(':'), [model, reasoning] = setting.split('@');
    assert(same(receipt.configuration, { id: QUALITY_JUDGES[index], provider, model, reasoning }) && same(launch.configuration, receipt.configuration) && receipt.toolsAllowed === false && receipt.toolUse === false && launch.toolsAllowed === false && launch.promptSha256 === plan.pins[dimensioned ? `prompt-${index + 1}.txt` : 'prompt.txt'] && launch.systemInstructionsSha256 === plan.pins['system.txt'] && launch.outputSchemaSha256 === plan.pins['schema.json'], 'taste native identity or input differs');
    assert(receipt.runtime?.requestedReasoning === reasoning && receipt.preflight?.some(item => item.configurationId === QUALITY_JUDGES[index] && item.model === model && item.effort === reasoning && item.accepted === true) && (provider === 'codex' ? receipt.runtime.requestedModel === model && receipt.runtime.modelIdentityEvidence === 'exact-native-catalog-selection-and-cli-invocation-no-fallback' : receipt.runtime.model === model && receipt.runtime.exactModel === true && same(receipt.runtime.assistantModels, [model])), 'taste native model metadata differs');
  };
  let priorReceipt = null;
  if (selection.retry) {
    const retry = selection.retry; keys(retry, ['amendment', 'priorReceipt', 'priorLaunch'], 'taste retry selection');
    const amendment = read(retry.amendment, 'taste retry amendment'); priorReceipt = read(retry.priorReceipt, 'taste prior timeout receipt'); const priorLaunch = read(retry.priorLaunch, 'taste prior launch');
    keys(amendment, ['kind', 'schemaVersion', 'createdAt', 'authorization', 'configurationId', 'originalPlanSha256', 'priorReceiptSha256', 'priorLaunchSha256', 'pins', 'policy', 'selectionRule'], 'taste retry amendment');
    assert(amendment.kind === 'backend-testing-craft-review-retry' && amendment.schemaVersion === 1 && typeof amendment.createdAt === 'string' && Number.isFinite(Date.parse(amendment.createdAt)) && amendment.authorization === 'User requested retry: try again' && amendment.configurationId === QUALITY_JUDGES[0] && amendment.originalPlanSha256 === selection.plan.sha256 && amendment.priorReceiptSha256 === retry.priorReceipt.sha256 && amendment.priorLaunchSha256 === retry.priorLaunch.sha256 && same(amendment.pins, plan.pins) && amendment.selectionRule === 'Use this retry if valid; never select by score.' && same(amendment.policy, { nativeSessions: 1, automaticRetries: 0, tools: false, timeoutMs: 1200000, maxPromptBytes: 327680, maxAcceptedResponseBytes: 98304 }), 'taste retry authorization or frozen inputs differ');
    validateNative(priorReceipt, priorLaunch, 0);
    assert(priorReceipt.status === 'timeout' && priorReceipt.complete === false && priorReceipt.timedOut === true && retry.priorReceipt.sha256 !== selection.judges?.[0]?.receipt.sha256 && retry.priorLaunch.sha256 !== selection.judges?.[0]?.launch.sha256, 'taste retry must preserve a distinct prior timeout');
    pins.push(retry.amendment, retry.priorReceipt, retry.priorLaunch);
  }
  assert(selection.judges?.length === 2, 'taste native review cohort differs');
  const panels = selection.judges.map((selected, index) => {
    keys(selected, ['launch', 'receipt', ...(selected.validated ? ['validated'] : [])], 'taste judge pins');
    const receipt = read(selected.receipt, `taste native judge ${index + 1}`), launch = read(selected.launch, `taste judge launch ${index + 1}`); pins.push(selected.receipt, selected.launch);
    validateNative(receipt, launch, index);
    const validated = selected.validated ? read(selected.validated, `taste validated review ${index + 1}`) : null;
    if (validated) {
      pins.push(selected.validated); assert(receipt.status === 'complete' && receipt.complete === true && validated.status === 'complete' && validated.configurationId === QUALITY_JUDGES[index] && same(validated.usage, receipt.usage) && same(summary.judges[index], validated), 'taste validated review differs from original receipt');
      orderedIds(Object.keys(validated.judgments ?? {}), plan.rows.map(row => row.id), 'taste original judgment');
      const raw = receipt.structuredOutput ?? JSON.parse(receipt.finalText); orderedIds(Object.keys(raw), Object.keys(mapping), 'taste raw review');
      for (const [label, id] of Object.entries(mapping)) assert(same(raw[label], validated.judgments[id]), 'taste judgment differs from original review');
    } else assert(summary.judges[index].configurationId === QUALITY_JUDGES[index] && summary.judges[index].status !== 'complete', 'taste validated receipt missing');
    return { receipt, selected, validated };
  });
  assert(auditQualifications.every(qualification => panels[QUALITY_JUDGES.indexOf(qualification.judgeConfigurationId)].validated?.judgments[qualification.rowId]?.dimensions?.[qualification.dimensionId]), 'taste audit qualification lacks an original finding');
  const rows = plan.rows.map(source => {
    const packet = packetFiles.get(source.id);
    const evidence = pointers => pointers.map(pointer => {
      keys(pointer, ['path', 'startLine', 'endLine'], 'original taste pointer'); const file = packet.files.get(pointer.path);
      assert(file && Number.isInteger(pointer.startLine) && pointer.startLine >= 1 && Number.isInteger(pointer.endLine) && pointer.endLine >= pointer.startLine && pointer.endLine <= file.content.split('\n').length, 'taste evidence is outside supplied source');
      const prefix = pointer.path.split('/')[0]; return { file: path.posix.basename(pointer.path), version: ['original', 'final', 'context'].includes(prefix) ? prefix : 'shared', startLine: pointer.startLine, endLine: pointer.endLine };
    });
    const judgments = panels.map((panel, index) => {
      const record = panel.validated?.judgments[source.id];
      if (!record) return { judgeConfigurationId: QUALITY_JUDGES[index], reviewSha256: panel.selected.receipt.sha256, status: 'incomplete', score: null, ...(dimensioned ? { ...(panel.receipt.status === 'timeout' ? { failure: 'timeout' } : {}), dimensions: TASTE_DIMENSIONS.map(({ id }) => ({ id, score: null, reason: null, evidence: [] })) } : { reason: null, strengths: [], weaknesses: [] }), files: [] };
      keys(record, dimensioned ? ['dimensions', 'files'] : ['score', 'reason', 'strengths', 'weaknesses', 'files'], 'original taste assessment');
      orderedIds(record.files.map(file => file.path), packet.specs, 'original taste scored file');
      if (dimensioned) {
        keys(record.dimensions, TASTE_DIMENSIONS.map(dimension => dimension.id), 'original taste dimensions');
        const dimensions = TASTE_DIMENSIONS.map(({ id }) => {
          const finding = record.dimensions[id]; keys(finding, ['score', 'reason', 'evidence'], 'original taste dimension finding');
          const qualification = auditQualifications.find(item => item.rowId === source.id && item.judgeConfigurationId === QUALITY_JUDGES[index] && item.dimensionId === id);
          return { id, score: finding.score, reason: finding.reason, evidence: evidence(finding.evidence), ...(qualification ? { qualifications: [{ finding: qualification.finding, evidence: evidence(qualification.evidence) }] } : {}) };
        });
        const files = record.files.map(file => {
          keys(file, ['path', 'dimensions', 'reason', 'evidence'], 'original dimension taste file'); keys(file.dimensions, TASTE_DIMENSIONS.map(dimension => dimension.id), 'original taste file dimensions');
          const dimensions = TASTE_DIMENSIONS.map(({ id }) => ({ id, score: file.dimensions[id] }));
          return { file: path.posix.basename(file.path), score: tasteWeightedScore(dimensions), dimensions, reason: file.reason, evidence: evidence(file.evidence) };
        });
        return { judgeConfigurationId: QUALITY_JUDGES[index], reviewSha256: panel.selected.receipt.sha256, status: 'complete', score: tasteWeightedScore(dimensions), dimensions, files };
      }
      return { judgeConfigurationId: QUALITY_JUDGES[index], reviewSha256: panel.selected.receipt.sha256, status: 'complete', score: record.score, reason: record.reason,
        strengths: record.strengths.map(finding => ({ finding: finding.finding, evidence: evidence(finding.evidence) })), weaknesses: record.weaknesses.map(finding => ({ finding: finding.finding, evidence: evidence(finding.evidence) })),
        files: record.files.map(file => ({ file: path.posix.basename(file.path), score: file.score, reason: file.reason, evidence: evidence(file.evidence) })) };
    });
    const complete = judgments.every(judge => judge.status === 'complete'), score = complete ? qualityMean(judgments) : null;
    const dimensions = dimensioned ? tasteDimensionMeans(judgments) : null;
    assert(same(summary.rows.find(row => row.id === source.id), { ...source, score, ...(dimensioned ? { dimensions } : {}) }), 'taste reported suite score differs from native ratings');
    return { id: `${source.configurationId}:${source.condition}`, configurationId: source.configurationId, label: BACKEND_TESTING_CONFIGURATIONS.find(item => item.id === source.configurationId).label, condition: source.condition, status: complete ? 'scored' : 'incomplete', score, range: { minimum: complete ? Math.min(...judgments.map(judge => judge.score)) : null, maximum: complete ? Math.max(...judgments.map(judge => judge.score)) : null }, judgments, ...(dimensioned ? { dimensions } : {}) };
  });
  rows.sort((left, right) => BACKEND_TESTING_CONFIGURATIONS.findIndex(item => item.id === left.configurationId) - BACKEND_TESTING_CONFIGURATIONS.findIndex(item => item.id === right.configurationId) || ['none', 'repaired'].indexOf(left.condition) - ['none', 'repaired'].indexOf(right.condition));
  const summaries = dimensioned ? tastePairedSummaries(rows) : pairedSummaries(rows); assert(summary.summaries?.length === 4 && summaries.every(row => same(summary.summaries.find(item => item.configurationId === row.configurationId), row)) && tasteEqual(summary.meanPairedDifference, qualityMean(summaries.map(row => ({ score: row.delta })))), 'taste reported paired summary differs from native ratings');
  const dimensionSummaries = dimensioned ? tasteDimensionSummaries(summaries) : null;
  if (dimensioned) assert(summary.dimensionSummaries?.length === TASTE_DIMENSIONS.length && dimensionSummaries.every(expected => { const observed = summary.dimensionSummaries.find(dimension => dimension.id === expected.id); return observed && ['baseline', 'treatment', 'delta'].every(field => tasteEqual(observed[field], expected[field])); }), 'taste reported matched dimension profiles differ');
  const receipts = [...panels.map(panel => panel.receipt), ...(priorReceipt ? [priorReceipt] : [])];
  const tokenTotals = receipts.map(receipt => { if (!receipt.usage) return null; const fields = receipt.configuration.provider === 'claude' ? ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'] : ['input_tokens', 'output_tokens']; assert(fields.every(field => receipt.usage[field] == null || Number.isInteger(receipt.usage[field]) && receipt.usage[field] >= 0), 'invalid taste native usage'); return fields.every(field => receipt.usage[field] != null) ? fields.reduce((sum, field) => sum + receipt.usage[field], 0) : null; });
  const retry = selection.retry ? { judgeConfigurationId: QUALITY_JUDGES[0], authorization: 'user-requested-after-timeout', amendmentSha256: selection.retry.amendment.sha256, priorReviewSha256: selection.retry.priorReceipt.sha256, reviewSha256: panels[0].selected.receipt.sha256, priorStatus: 'timeout', status: panels[0].validated ? 'complete' : 'incomplete', timeoutMs: 1200000, automaticRetries: 0, priorTokens: tokenTotals[2], retryTokens: tokenTotals[0] } : null;
  return validateBackendTestingTaste({ kind: 'backend-testing-taste-review', schemaVersion: plan.schemaVersion, date: plan.date, caseId: plan.caseId, scope: 'exploratory-post-hoc-review', sourceSha256: hash(pins.map(pin => pin.sha256).join('\n')), status: rows.every(row => row.status === 'scored') ? 'complete' : 'incomplete', nativeSessions: receipts.length, knownTokens: tokenTotals.reduce((sum, value) => sum + (value ?? 0), 0), usageMissingSessions: tokenTotals.filter(value => value === null).length, scoreBasis: dimensioned ? { minimum: 0, maximum: 1, decimals: 2, aggregation: rubric.aggregation, anchors: rubric.anchors, dimensions: rubric.dimensions, namingZeroRule: rubric.namingZeroRule } : { minimum: 0, maximum: 1, decimals: 2, aggregation: TASTE_AGGREGATION, anchors: TASTE_ANCHORS.map(item => ({ ...item })) }, rows, summaries, ...(dimensioned ? { dimensionSummaries } : {}), ...(retry ? { retry } : {}), baselineMean: qualityMean(summaries.map(row => ({ score: row.baseline }))), treatmentMean: qualityMean(summaries.map(row => ({ score: row.treatment }))), meanPairedDifference: qualityMean(summaries.map(row => ({ score: row.delta }))) });
}

const OVERALL_SCORE_BASIS = {
  id: 'backend-testing-quality-and-protection-v1', maximum: 100,
  protectionLossMaximum: 49, zeroCoverageScore: 0, adoption: 'user-requested-after-reviews',
  aggregation: 'For each reviewer, multiply the seven-dimension weighted quality by 100, then apply the saved protection assessment: lost existing protection caps the score at 49; no meaningful runnable coverage scores 0; unresolved required evidence leaves no score. Average both reviewer scores, then compare matched conditions. This combined scoring rule was adopted after the reviews; original ratings remain unchanged.'
};

const overallMaximum = judgment => judgment.protectionStatus !== 'complete' ? null
  : judgment.coverage === 'no' ? 0
    : judgment.coverage !== 'yes' ? null
      : judgment.protection === 'lost' ? 49 : judgment.protection === 'retained' ? 100 : null;
const overallJudgeScore = judgment => judgment.maximum === 0 ? 0
  : judgment.maximum === null || judgment.qualityScore === null ? null : Math.min(judgment.qualityScore, judgment.maximum);

// These are derived display scores, never replacements for either native review.
export function deriveBackendTestingOverall({ pairedRepair, taste }) {
  assert(taste?.schemaVersion === 2 && pairedRepair.caseId === taste.caseId, 'overall score requires matching dimensional evidence');
  const rows = taste.rows.map(row => {
    const protectionRow = pairedRepair.rows.find(candidate => candidate.id === row.id && candidate.configurationId === row.configurationId && candidate.condition === row.condition);
    assert(protectionRow, 'overall score artifact identity differs');
    const judgments = QUALITY_JUDGES.map(judgeConfigurationId => {
      const quality = row.judgments.find(judge => judge.judgeConfigurationId === judgeConfigurationId);
      const protection = protectionRow.judgments.find(judge => judge.judgeConfigurationId === judgeConfigurationId);
      const judgment = { judgeConfigurationId, qualityReviewSha256: quality?.reviewSha256 ?? null, protectionReviewSha256: protection?.reviewSha256 ?? null,
        qualityScore: quality?.status === 'complete' ? quality.score * 100 : null, protectionStatus: protection?.status ?? 'pending',
        protection: protection?.protection ?? 'unresolved', coverage: protection?.coverage ?? 'unresolved' };
      judgment.maximum = overallMaximum(judgment); judgment.score = overallJudgeScore(judgment);
      return judgment;
    });
    const score = qualityMean(judgments);
    return { id: row.id, configurationId: row.configurationId, condition: row.condition, status: score === null ? 'incomplete' : 'scored', score, protection: protectionRow.protection, judgments };
  });
  const summaries = pairedSummaries(rows);
  return validateBackendTestingOverall({ schemaVersion: 1, scoreBasis: { ...OVERALL_SCORE_BASIS }, sourceSha256: hash([pairedRepair.sourceSha256, taste.sourceSha256, JSON.stringify(OVERALL_SCORE_BASIS)].join('\n')),
    status: rows.every(row => row.status === 'scored') ? 'complete' : 'incomplete', rows, summaries,
    baselineMean: qualityMean(summaries.map(row => ({ score: row.baseline }))), treatmentMean: qualityMean(summaries.map(row => ({ score: row.treatment }))), meanPairedDifference: qualityMean(summaries.map(row => ({ score: row.delta }))) });
}

function validateBackendTestingOverall(value) {
  keys(value, ['schemaVersion', 'scoreBasis', 'sourceSha256', 'status', 'rows', 'summaries', 'baselineMean', 'treatmentMean', 'meanPairedDifference'], 'overall score');
  assert(value.schemaVersion === 1 && same(value.scoreBasis, OVERALL_SCORE_BASIS) && SHA256.test(value.sourceSha256) && value.rows?.length === 8, 'invalid overall score basis');
  orderedIds(value.rows.map(row => `${row.configurationId}:${row.condition}`), BACKEND_TESTING_CONFIGURATIONS.flatMap(configuration => ['none', 'repaired'].map(condition => `${configuration.id}:${condition}`)), 'overall score cohort');
  assert(new Set(value.rows.map(row => row.id)).size === 8, 'duplicate overall artifact');
  for (const row of value.rows) {
    keys(row, ['id', 'configurationId', 'condition', 'status', 'score', 'protection', 'judgments'], 'overall row');
    orderedIds(row.judgments?.map(judge => judge.judgeConfigurationId), QUALITY_JUDGES, 'overall reviewers');
    for (const judge of row.judgments) {
      keys(judge, ['judgeConfigurationId', 'qualityReviewSha256', 'protectionReviewSha256', 'qualityScore', 'protectionStatus', 'protection', 'coverage', 'maximum', 'score'], 'overall reviewer');
      assert([judge.qualityReviewSha256, judge.protectionReviewSha256].every(digest => digest === null || SHA256.test(digest)) && (judge.qualityScore === null || SHA256.test(judge.qualityReviewSha256) && Number.isFinite(judge.qualityScore) && judge.qualityScore >= 0 && judge.qualityScore <= 100) && (judge.protectionStatus !== 'complete' || SHA256.test(judge.protectionReviewSha256)), 'invalid overall review evidence');
      assert(['complete', 'unresolved', 'invalid', 'infrastructure-failure', 'pending'].includes(judge.protectionStatus) && ['yes', 'no', 'unresolved'].includes(judge.coverage) && ['retained', 'lost', 'unresolved'].includes(judge.protection), 'invalid overall protection evidence');
      assert(judge.maximum === overallMaximum(judge) && tasteEqual(judge.score, overallJudgeScore(judge)), 'overall protection cap differs');
    }
    const protection = row.judgments.some(judge => judge.protection === 'lost') ? 'lost' : row.judgments.every(judge => judge.protection === 'retained') ? 'retained' : 'unresolved';
    const score = qualityMean(row.judgments);
    assert(row.protection === protection && tasteEqual(row.score, score) && row.status === (score === null ? 'incomplete' : 'scored'), 'overall row arithmetic differs');
  }
  const summaries = pairedSummaries(value.rows);
  assert(same(value.summaries, summaries) && value.status === (value.rows.every(row => row.status === 'scored') ? 'complete' : 'incomplete'), 'overall comparison differs');
  for (const [field, source] of [['baselineMean', 'baseline'], ['treatmentMean', 'treatment'], ['meanPairedDifference', 'delta']]) assert(tasteEqual(value[field], qualityMean(summaries.map(row => ({ score: row[source] })))), 'overall mean differs');
  return value;
}

export function validateBackendTestingFiles(value, pairedRepair) {
  keys(value, ['kind', 'schemaVersion', 'sourceSha256', 'rows'], 'test files');
  assert(value.kind === 'backend-testing-files' && value.schemaVersion === 1 && SHA256.test(value.sourceSha256) && value.rows?.length === 8, 'invalid test file archive');
  orderedIds(value.rows.map(row => row.id), pairedRepair.rows.map(row => row.id), 'test file artifact');
  for (const row of value.rows) {
    keys(row, ['id', 'configurationId', 'condition', 'files'], 'test file row');
    assert(pairedRepair.rows.some(source => source.id === row.id && source.configurationId === row.configurationId && source.condition === row.condition), 'test file artifact identity differs');
    assert(Array.isArray(row.files) && row.files.length > 0 && new Set(row.files.map(file => file.path)).size === row.files.length, 'invalid test file inventory');
    for (const file of row.files) {
      keys(file, ['path', 'sha256', 'content'], 'test file');
      assert(typeof file.path === 'string' && /^test\/[a-zA-Z0-9_./-]+\.spec\.js$/.test(file.path) && !file.path.split('/').includes('..'), 'invalid public test file path');
      assert(typeof file.content === 'string' && SHA256.test(file.sha256) && hash(file.content) === file.sha256, 'public test file bytes differ');
    }
  }
  return value;
}

export function projectBackendTestingCurrent({ pairedRepair, taste = null }) {
  validateBackendTestingPairedRepair(pairedRepair);
  if (taste) validateBackendTestingTaste(taste);
  const baseline = qualityMean(pairedRepair.summaries.map(row => ({ score: row.baseline }))), treatment = qualityMean(pairedRepair.summaries.map(row => ({ score: row.treatment })));
  const overall = taste?.schemaVersion === 2 ? deriveBackendTestingOverall({ pairedRepair, taste }) : null;
  const projection = { kind: 'vasirbenchmark-backend-testing', schemaVersion: 3, benchmark: { ...CURRENT_BENCHMARK }, sourceSha256: hash([pairedRepair.sourceSha256, ...(taste ? [taste.sourceSha256] : []), ...(overall ? [overall.sourceSha256] : [])].join('\n')), date: taste?.date ?? pairedRepair.date, caseId: pairedRepair.caseId, scope: pairedRepair.scope,
    configurations: BACKEND_TESTING_CONFIGURATIONS.map(item => ({ ...item })), conditions: CURRENT_CONDITIONS.map(item => ({ ...item })), trials: 1,
    technical: { status: pairedRepair.status, baseline, treatment, delta: pairedRepair.meanPairedDifference, scoreMaximum: 100, successCriterionMet: pairedRepair.successCriterionMet },
    taste: taste ? { status: taste.status, baseline: taste.baselineMean, treatment: taste.treatmentMean, delta: taste.meanPairedDifference, scoreMaximum: 1 } : null,
    ...(overall ? { overall } : {}),
    nativeSessions: pairedRepair.nativeSessions + (taste?.nativeSessions ?? 0), knownTokens: pairedRepair.knownTokens + (taste?.knownTokens ?? 0), usageMissingSessions: pairedRepair.usageMissingSessions + (taste?.usageMissingSessions ?? 0) };
  return validateBackendTestingCurrent(projection);
}

export function validateBackendTestingCurrent(value, { pairedRepair, taste = null } = {}) {
  keys(value, ['kind', 'schemaVersion', 'benchmark', 'sourceSha256', 'date', 'caseId', 'scope', 'configurations', 'conditions', 'trials', 'technical', 'taste', 'nativeSessions', 'knownTokens', 'usageMissingSessions', ...(value.overall ? ['overall'] : [])], 'current publication');
  assert(value.kind === 'vasirbenchmark-backend-testing' && value.schemaVersion === 3 && same(value.benchmark, CURRENT_BENCHMARK) && SHA256.test(value.sourceSha256) && ['2026-10-09', '2026-10-10'].includes(value.date) && value.caseId === 'player-saves' && value.scope === 'one-known-case-development' && value.trials === 1 && same(value.configurations, BACKEND_TESTING_CONFIGURATIONS) && same(value.conditions, CURRENT_CONDITIONS), 'invalid current publication identity');
  assert(value.taste === null || typeof value.taste === 'object' && !Array.isArray(value.taste), 'invalid current taste summary');
  for (const [label, score] of [['technical', value.technical], ...(value.taste ? [['taste', value.taste]] : [])]) {
    keys(score, ['status', 'baseline', 'treatment', 'delta', 'scoreMaximum', ...(label === 'technical' ? ['successCriterionMet'] : [])], `current ${label}`);
    assert(['complete', 'incomplete'].includes(score.status) && score.scoreMaximum === (label === 'technical' ? 100 : 1) && ['baseline', 'treatment'].every(field => score[field] === null || finite(score[field]) === score[field] && score[field] <= score.scoreMaximum), 'invalid current score');
    assert(tasteEqual(score.delta, score.baseline === null || score.treatment === null ? null : score.treatment - score.baseline) && (score.status !== 'complete' || score.baseline !== null && score.treatment !== null), 'current score arithmetic differs');
  }
  assert(typeof value.technical.successCriterionMet === 'boolean' && (!value.technical.successCriterionMet || value.technical.status === 'complete' && value.technical.delta > 0) && (value.taste ? [12, 13].includes(value.nativeSessions) : value.nativeSessions === 10) && Number.isInteger(value.knownTokens) && value.knownTokens >= 0 && Number.isInteger(value.usageMissingSessions) && value.usageMissingSessions >= 0 && value.usageMissingSessions <= value.nativeSessions, 'invalid current publication resources');
  if (value.overall) { assert(value.taste !== null, 'overall score requires dimensional review'); validateBackendTestingOverall(value.overall); }
  if (pairedRepair) assert(same(value, projectBackendTestingCurrent({ pairedRepair, taste })), 'current summary differs from source assessments');
  return value;
}

function buildRepairCheck(selection, read) {
  keys(selection, ['plan', 'report', 'reviewSummary', 'skill', 'verification', 'authors', 'judges'], 'repair selection');
  assert(Array.isArray(selection.authors) && selection.authors.length === 4 && Array.isArray(selection.judges) && selection.judges.length === 2, 'invalid repair source cohort');
  const plan = read(selection.plan, 'repair plan'), report = read(selection.report, 'repair report'), review = read(selection.reviewSummary, 'repair review summary');
  read(selection.skill, 'repair skill');
  const verification = read(selection.verification, 'repair verification');
  assert(plan.kind === 'known-case-development-repair-check' && report.kind === plan.kind && review.kind === plan.kind && plan.caseId === 'purchases' && same(plan.conditions, ['repaired-skill']) && SHA256.test(plan.sourceHash), 'invalid repair plan');
  assert(plan.policy?.generationSessions === 4 && plan.policy.batchedReviewSessions === 2 && plan.policy.trials === 1 && plan.policy.automaticRetries === 0 && plan.policy.tools === false && plan.policy.generationTimeoutMs === 180000 && plan.policy.reviewTimeoutMs === 240000, 'repair execution policy differs');
  assert(plan.pins?.['skill.json'] === selection.skill.sha256 && report.skillBundleSha256 === selection.skill.sha256 && same(review.mapping, { A: 'candidate-4' }), 'repair source basis differs');
  assert(same(plan.rows, BACKEND_TESTING_CONFIGURATIONS.map((configuration, index) => ({ id: `candidate-${index + 1}`, configurationId: configuration.id }))), 'repair planned cohort differs');
  const authors = selection.authors.map((pin, index) => {
    const receipt = read(pin, `repair author ${index + 1}`);
    assert(receipt.configuration?.id === plan.rows[index].configurationId && receipt.toolsAllowed === false && receipt.toolUse === false && receipt.status === (index === 3 ? 'complete' : 'timeout') && receipt.complete === (index === 3) && receipt.timedOut === (index !== 3), 'repair author receipt differs');
    return receipt;
  });
  const judges = selection.judges.map((pins, index) => {
    keys(pins, ['receipt', 'validated'], 'repair judge pins');
    const receipt = read(pins.receipt, `repair judge ${index + 1} receipt`), validated = read(pins.validated, `repair judge ${index + 1} validated`);
    assert(receipt.configuration?.id === QUALITY_JUDGES[index] && receipt.status === 'complete' && receipt.complete === true && receipt.toolsAllowed === false && receipt.toolUse === false && validated.configurationId === QUALITY_JUDGES[index] && validated.status === 'complete' && same(validated.usage, receipt.usage), 'repair judge receipt differs');
    keys(validated.judgments, ['candidate-4'], 'repair reviewed candidates');
    const record = validated.judgments['candidate-4'];
    assert(same((receipt.structuredOutput ?? JSON.parse(receipt.finalText)).A, record.evaluation), 'repair review differs from original receipt');
    const identity = { id: 'candidate-4', artifactSha256: selection.verification.sha256 };
    const judgment = publicQualityJudgment({ ...record, judgeId: validated.configurationId, candidateId: identity.id, artifactSha256: identity.artifactSha256, resultSha256: pins.receipt.sha256, inputHashes: { rubric: selection.plan.sha256, verifier: verification.evaluatorSha256 } }, identity, selection.plan.sha256, verification.evaluatorSha256);
    assert(judgment.status === 'complete' && judgment.coverage === 'yes' && judgment.protection === 'retained', 'repair protection is unresolved');
    assert(same(review.judges?.[index], validated), 'repair summary differs from pinned review');
    return { receipt, score: judgment.score };
  });
  assert(verification.schemaVersion === 2 && verification.caseId === 'purchases' && verification.rowId === 'candidate-4' && SHA256.test(verification.evaluatorSha256) && verification.status === 'valid' && verification.testStatus === 'pass' && verification.cleanupStatus === 'pass', 'repair execution is incomplete');
  assert(verification.controlRuns?.length === 2 && verification.controlRuns.every(run => run.status === 'pass' && run.testStatus === 'pass' && run.cleanupStatus === 'pass' && run.stats?.tests === 5 && run.stats.passes === 5 && run.stats.failures === 0), 'repair controls differ');
  const faultIds = ['late-idempotency-reconciliation-removed', 'confirmation-actor-binding-removed', 'positive-wallet-remainder-rounded-up', 'purchase-receipt-grants-projection'];
  orderedIds(verification.faultRuns?.map(run => run.faultId), faultIds, 'repair fault');
  assert(verification.faultRuns.every(run => run.status === 'candidate-detection' && run.testStatus === 'assertion-failure' && run.cleanupStatus === 'pass'), 'repair fault executions differ');
  const receipts = [...authors, ...judges.map(judge => judge.receipt)];
  const tokens = receipts.map(receipt => {
    const usage = receipt.usage;
    if (!usage) return null;
    const fields = receipt.configuration.provider === 'claude' ? ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'] : ['input_tokens', 'output_tokens'];
    assert(fields.every(field => Number.isInteger(usage[field]) && usage[field] >= 0), 'invalid repair token receipt');
    return fields.reduce((total, field) => total + usage[field], 0);
  });
  const knownTokens = tokens.reduce((total, value) => total + (value ?? 0), 0), usageMissingSessions = tokens.filter(value => value === null).length;
  assert(report.nativeSessions === receipts.length && report.automaticRetries === 0 && report.reportedTokensSubtotal === knownTokens && report.usageMissingSessions === usageMissingSessions && report.nativeReceipts?.length === receipts.length, 'repair aggregate resources differ from receipts');
  receipts.forEach((receipt, index) => { const source = report.nativeReceipts[index]; assert(source.configuration === receipt.configuration.id && source.status === receipt.status && source.elapsedMs === receipt.elapsedMs && same(source.usage, receipt.usage) && source.totalReportedTokens === tokens[index], 'repair reported receipt differs'); });
  assert(report.rows?.length === 4, 'repair report omits planned rows');
  const rows = BACKEND_TESTING_CONFIGURATIONS.map((configuration, index) => {
    const complete = authors[index].status === 'complete', score = complete ? qualityMean(judges) : null;
    assert(report.rows[index].id === plan.rows[index].id && report.rows[index].configurationId === configuration.id && report.rows[index].score === score && report.rows[index].status === (complete ? 'valid' : 'timeout'), 'repair reported score differs');
    return { configurationId: configuration.id, label: configuration.label, status: complete ? 'complete' : 'timeout', score, judgeScores: complete ? judges.map((judge, seat) => ({ configurationId: QUALITY_JUDGES[seat], score: judge.score })) : [], controlsPassed: complete ? 2 : 0, testsPerControl: complete ? 5 : null, faultsDetected: complete ? 4 : 0, faultsReplayed: complete ? 4 : 0, protection: complete ? 'retained' : 'unresolved' };
  });
  const pins = [selection.plan, selection.report, selection.reviewSummary, selection.skill, selection.verification, ...selection.authors, ...selection.judges.flatMap(judge => [judge.receipt, judge.validated])];
  return validateBackendTestingRepairCheck({ kind: 'backend-testing-repair-check', schemaVersion: 1, date: '2026-10-09', caseId: 'purchases', sourceSha256: hash(pins.map(pin => pin.sha256).join('\n')), skillSha256: selection.skill.sha256, nativeSessions: receipts.length, automaticRetries: 0, knownTokens, usageMissingSessions, rows });
}

export function buildBackendTestingPublication({ repoRootDirectory, readFileSyncImplementation = fs.readFileSync }) {
  let text;
  try { text = readFileSyncImplementation(path.join(repoRootDirectory, SELECTION_PATH), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const selected = JSON.parse(text);
  if (selected.schemaVersion === 4) return buildBackendTestingCompactPublication({ selected, repoRootDirectory, readFileSyncImplementation });
  if (selected.schemaVersion === 2) keys(selected, ['kind', 'schemaVersion', 'suiteQuality', 'faultDetectionPilot', ...(selected.repairCheck ? ['repairCheck'] : []), ...(selected.pairedRepair ? ['pairedRepair'] : [])], 'quality selection');
  const selection = selected.schemaVersion === 2 ? selected.faultDetectionPilot : selected.schemaVersion === 3 ? null : selected;
  if (selection) { keys(selection, ['kind', 'schemaVersion', 'generation', 'evaluation', 'conditions'], 'selection'); assert(selection.kind === 'vasirbenchmark-backend-testing-selection' && selection.schemaVersion === 1, 'unsupported source selection'); }
  const read = (pin, label) => {
    keys(pin, ['path', 'sha256'], `${label} source pin`);
    assert(typeof pin.path === 'string' && pin.path.startsWith('.agents/vasir-evals/backend-testing/') && !pin.path.split('/').some(segment => ['..', ''].includes(segment)) && !pin.path.includes('\\') && SHA256.test(pin.sha256), 'unsafe or unpinned private source');
    const bytes = readFileSyncImplementation(path.join(repoRootDirectory, pin.path));
    assert(hash(bytes) === pin.sha256, `${label} source hash mismatch`);
    return JSON.parse(bytes.toString());
  };
  if (selected.schemaVersion === 3) {
    keys(selected, ['kind', 'schemaVersion', 'pairedRepair', 'rubric', ...(selected.taste ? ['taste'] : [])], 'current selection');
    assert(selected.kind === 'vasirbenchmark-backend-testing-selection', 'invalid current selection kind');
    const rubric = read(selected.rubric, 'current rubric');
    const pairedRepair = buildPairedRepair(selected.pairedRepair, read, rubric, selected.rubric.sha256);
    const taste = selected.taste ? buildTasteReview(selected.taste, read, pairedRepair, selected.pairedRepair) : null;
    const projection = projectBackendTestingCurrent({ pairedRepair, taste });
    let files = null;
    if (taste?.schemaVersion === 2) {
      const packets = read(selected.taste.packet, 'public test file packet'), mapping = read(selected.taste.mapping, 'public test file mapping'), plan = read(selected.taste.plan, 'public test file identities');
      files = validateBackendTestingFiles({ kind: 'backend-testing-files', schemaVersion: 1, sourceSha256: selected.taste.packet.sha256,
        rows: Object.entries(mapping).map(([label, id]) => {
          const source = plan.rows.find(candidate => candidate.id === id), packet = packets[label];
          const row = pairedRepair.rows.find(candidate => candidate.configurationId === source.configurationId && candidate.condition === source.condition);
          return { id: row.id, configurationId: row.configurationId, condition: row.condition, files: packet.specs.map(spec => {
            const file = packet.files.find(candidate => candidate.path === spec);
            return { path: spec.slice('final/'.length), sha256: file.sha256, content: file.content };
          }) };
        }) }, pairedRepair);
    }
    return { projection, pairedRepair, ...(taste ? { taste } : {}), ...(files ? { files } : {}), basisSha256: projection.sourceSha256 };
  }
  const generation = read(selection.generation, 'generation');
  for (const row of generation.rows ?? []) for (const attempt of row.attempts ?? []) {
    assert(typeof attempt.resultPath === 'string' && SHA256.test(attempt.resultSha256), 'missing attempt receipt pin');
    const receiptPath = path.resolve(repoRootDirectory, attempt.resultPath);
    assert(receiptPath.startsWith(path.resolve(repoRootDirectory, '.agents/vasir-evals/backend-testing') + path.sep), 'attempt receipt escapes private archive');
    const bytes = readFileSyncImplementation(receiptPath);
    assert(hash(bytes) === attempt.resultSha256, 'attempt receipt hash mismatch');
    const receipt = JSON.parse(bytes.toString());
    assert(receipt.rowId === row.rowId && receipt.configuration?.id === attempt.configurationId && receipt.promptSha256 === attempt.promptSha256 && receipt.treatmentSha256 === attempt.treatmentSha256 && receipt.status === attempt.status && receipt.elapsedMs === attempt.elapsedMs && same(receipt.usage, attempt.usage), 'attempt receipt differs from selected recovery evidence');
  }
  const projection = projectBackendTestingResults({ generation, evaluation: read(selection.evaluation, 'evaluation'), selection });
  const repairCheck = selected.repairCheck ? buildRepairCheck(selected.repairCheck, read) : null;
  if (selected.schemaVersion === 2) {
    assert(selected.kind === 'vasirbenchmark-backend-testing-selection', 'unsupported quality selection kind');
    keys(selected.suiteQuality, ['generation', 'evaluation', 'judging', 'rubric'], 'suite-quality selection');
    const qualitySources = Object.fromEntries(Object.entries(selected.suiteQuality).map(([label, pin]) => [label, read(pin, `quality ${label}`)]));
    const quality = projectBackendTestingSuiteQuality({ ...qualitySources, selection: selected.suiteQuality });
    const pairedRepair = selected.pairedRepair ? buildPairedRepair(selected.pairedRepair, read, qualitySources.rubric, selected.suiteQuality.rubric.sha256) : null;
    const wrapper = { kind: 'vasirbenchmark-backend-testing', schemaVersion: 2, suiteQuality: quality.projection, faultDetectionPilot: projection };
    validateBackendTestingPublication(wrapper);
    const historicalBasis = hash(`${projection.sourceSha256}\n${quality.projection.sourceSha256}`);
    const repairBasis = repairCheck ? hash(`${historicalBasis}\n${repairCheck.sourceSha256}`) : historicalBasis;
    return { projection: wrapper, assessments: quality.assessments, ...(repairCheck ? { repairCheck } : {}), ...(pairedRepair ? { pairedRepair } : {}), basisSha256: pairedRepair ? hash(`${repairBasis}\n${pairedRepair.sourceSha256}`) : repairBasis };
  }
  return { projection, basisSha256: projection.sourceSha256 };
}
