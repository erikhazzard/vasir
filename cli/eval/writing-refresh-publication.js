import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadRefreshSnapshot, validateRefreshSnapshot, createRefreshInlineInstruction } from '../../benchmarks/storytelling-skill-refresh/run.mjs';

export const WRITING_REFRESH_SELECTION_PATH = 'benchmarks/storytelling-skill-refresh/publication.json';
export const WRITING_REFRESH_BENCHMARK_IDS = Object.freeze(['storytelling-core-idea-refresh']);
const CONDITIONS = [{ id: 'baseline', sourceId: 'plain', label: 'Plain answer', short: 'Plain', color: '#72777f', shape: 'circle' },
  { id: 'skill', sourceId: 'skill', label: 'Storytelling skill', short: 'Storytelling', color: '#1f6fff', shape: 'square' }];
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const finite = Number.isFinite;
// Remove binary arithmetic noise before a decimal half-point reaches the UI.
const decimal = value => Number(value.toPrecision(15));
const mean = values => values.length && values.every(finite) ? decimal(values.reduce((total, value) => total + value, 0) / values.length) : null;
const round = value => finite(value) ? Math.round(decimal(value * 10)) / 10 : null;
const words = value => value.trim().split(/\s+/u).length;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const requireEvidence = (condition, message) => { if (!condition) throw new Error(`Writing refresh publication: ${message}`); };
const publicUsage = usage => Object.fromEntries(['inputTokens', 'cachedInputTokens', 'outputTokens', 'reasoningOutputTokens', 'totalTokens']
  .map(field => [field, finite(usage?.[field]) && usage[field] >= 0 ? usage[field] : null]));
const score = (ratings, dimensions) => decimal(dimensions.reduce((total, dimension) => total + ratings[dimension.id] * dimension.weight, 0));
const key = row => `${row.configurationId}:${row.caseId}:${row.condition}`;
const metrics = rows => ({ meanLatencyMs: round(mean(rows.map(row => row.latencyMs))), meanInputTokens: round(mean(rows.map(row => row.inputTokens))),
  meanOutputTokens: round(mean(rows.map(row => row.outputTokens))), meanTotalTokens: round(mean(rows.map(row => row.totalTokens))),
  meanWordCount: round(mean(rows.map(row => row.wordCount))), meanCostUsd: null, costCoverage: 'not-comparable' });

function identity(configurationId) {
  const [provider, requested] = configurationId.split(':'), [model, reasoning] = requested.split('@');
  const family = ({ 'gpt-6-astra': 'GPT-6 Astra', 'gpt-6.1-sol': 'GPT-6.1 Sol' })[model];
  requireEvidence(provider === 'codex' && family && reasoning === 'xhigh', 'unexpected model configuration.');
  return { id: configurationId.replace(/[^a-zA-Z0-9-]/g, '-'), configurationId, modelId: `${provider}:${model}`, provider, family, reasoning, label: `${family} · ${reasoning}` };
}

function summary(rows, caseIds, configurationIds) {
  const pairs = configurationIds.flatMap(configurationId => caseIds.map(caseId => {
    const members = rows.filter(row => row.configurationId === configurationId && row.caseId === caseId);
    return { baseline: members.find(row => row.condition === 'baseline')?.exactScore, treatment: members.find(row => row.condition === 'skill')?.exactScore };
  })).filter(pair => finite(pair.baseline) && finite(pair.treatment));
  return { baseline: round(mean(pairs.map(pair => pair.baseline))), treatment: round(mean(pairs.map(pair => pair.treatment))),
    delta: round(mean(pairs.map(pair => pair.treatment - pair.baseline))), usablePairs: pairs.length, expectedPairs: configurationIds.length * caseIds.length,
    wins: pairs.filter(pair => pair.treatment > pair.baseline).length, ties: pairs.filter(pair => pair.treatment === pair.baseline).length,
    losses: pairs.filter(pair => pair.treatment < pair.baseline).length };
}

export function projectWritingRefreshSnapshot({ snapshot, sourceSha256, benchmarkId }) {
  validateRefreshSnapshot(snapshot);
  requireEvidence(WRITING_REFRESH_BENCHMARK_IDS.includes(benchmarkId), 'unknown benchmark.');
  const specification = snapshot.manifest.specification;
  const recovery = snapshot.manifest.technicalRecovery?.record;
  const title = 'Core idea (revised rubric)';
  const tasks = specification.cases.filter(task => task.kind === 'core-idea');
  const rubric = specification.rubrics['core-idea'];
  const dimensions = rubric.dimensions.map(dimension => ({ ...dimension, label: dimension.title, description: dimension.criterion, weight: dimension.weight * 100 }));
  const generations = snapshot.generations.filter(row => tasks.some(task => task.id === row.caseId));
  const judges = snapshot.judgments.filter(row => tasks.some(task => task.id === row.caseId));
  requireEvidence(generations.every(row => row.status === 'complete') && judges.every(row => row.status === 'complete'), 'incomplete pilot cannot be published.');
  const configurationIds = specification.models.map(configuration => configuration.id);
  const settings = configurationIds.map(identity), panel = specification.judges.map(configuration => configuration.id);
  const cases = tasks.map(task => ({ id: task.id, benchmarkId, title: task.title, prompt: task.task, wordLimit: task.wordLimit ?? null,
    medium: task.work?.medium ?? null, version: task.work?.version ?? null, creator: task.work?.creator ?? null, evidence: task.judgeEvidence, rubric: dimensions }));
  const responses = [], cells = [], messageSets = new Map();
  const deliveredFiles = new Set(['SKILL.md', ...tasks.flatMap(task => task.requiredSkillFiles)]);
  const promptFiles = snapshot.skillSnapshot.files.filter(file => deliveredFiles.has(file.relativePath)).map(file => ({ id: `skill-file-${hash(file.relativePath).slice(0, 16)}`, title: file.relativePath, content: file.contents, sha256: hash(file.contents) }));
  for (const task of tasks) {
    const content = createRefreshInlineInstruction(snapshot.skillSnapshot, task.requiredSkillFiles);
    promptFiles.push({ id: `skill-instruction-${task.id}`, title: `${task.title} · exact delivered skill and references`, content, sha256: hash(content) });
  }
  const pairwisePreferences = [], judgeRequests = [];
  for (const judge of judges) {
    const parsed = JSON.parse(judge.outputText);
    const candidateMap = Object.fromEntries(judge.candidateOrder.map((id, index) => [index ? 'B' : 'A', generations.find(row => row.id === id).conditionId === 'plain' ? 'baseline' : 'skill']));
    const candidateResponseHashes = Object.fromEntries(judge.candidateOrder.map((id, index) => [index ? 'B' : 'A', hash(generations.find(row => row.id === id).outputText)]));
    judgeRequests.push({ id: judge.id, caseId: judge.caseId, configurationId: judge.configurationId, judgeConfigurationId: judge.judgeConfigurationId,
      candidateMap, candidateResponseHashes, promptText: judge.promptText, promptSha256: hash(judge.promptText), outputText: judge.outputText, outputSha256: hash(judge.outputText) });
    pairwisePreferences.push({ benchmarkId, settingId: settings.find(setting => setting.configurationId === judge.configurationId).id,
      configurationId: judge.configurationId, caseId: judge.caseId, trialNumber: 1, reviewerId: judge.judgeConfigurationId,
      preferredCondition: parsed.preference.candidate === 'tie' ? 'tie' : candidateMap[parsed.preference.candidate],
      confidence: parsed.preference.confidence, reason: parsed.preference.reason, candidateMap, requestId: judge.id });
  }
  for (const generation of generations) {
    const task = cases.find(task => task.id === generation.caseId), setting = settings.find(setting => setting.configurationId === generation.configurationId);
    const condition = generation.conditionId === 'plain' ? 'baseline' : 'skill';
    if (condition === 'skill') requireEvidence(generation.inlineDelivery.instructionSha256 === promptFiles.find(file => file.id === `skill-instruction-${task.id}`).sha256 && generation.skillInstructionText === promptFiles.find(file => file.id === `skill-instruction-${task.id}`).content, 'frozen skill instruction differs from the execution receipt.');
    const judgments = judges.filter(judge => judge.caseId === generation.caseId && judge.configurationId === generation.configurationId).map(judge => {
      const candidateId = judge.candidateOrder.indexOf(generation.id) === 0 ? 'A' : 'B';
      const assessment = JSON.parse(judge.outputText).assessments.find(item => item.candidateLabel === candidateId);
      const ratings = Object.fromEntries(assessment.ratings.map(rating => [rating.dimensionId, rating.score]));
      return { judgeConfigurationId: judge.judgeConfigurationId, reviewerId: judge.judgeConfigurationId, candidateId, requestId: judge.id,
        score: score(ratings, dimensions), dimensions: Object.fromEntries(assessment.ratings.map(rating => [rating.dimensionId, { rating: rating.score, reason: rating.evidence, evidence: null }])),
        rationale: `Factual confidence: ${assessment.factualConfidence}. ${assessment.factualNotes.join(' ')}`,
        promptSha256: hash(judge.promptText), answerSha256: hash(judge.outputText),
        resources: { scope: 'shared-matched-pair-batch', candidateCount: 2, durationMs: judge.durationMs ?? null, usage: publicUsage(judge.usage) } };
    });
    const exactScore = mean(judgments.map(judge => judge.score)), usage = publicUsage(generation.usage);
    const disagreement = { scoreSpread: Math.abs(judgments[0].score - judgments[1].score), dimensionRanges: dimensions.map(dimension => ({ id: dimension.id,
      spread: Math.abs(judgments[0].dimensions[dimension.id].rating - judgments[1].dimensions[dimension.id].rating) })) };
    const cell = { benchmarkId, caseId: task.id, settingId: setting.id, configurationId: setting.configurationId, condition, category: 'writing', trialNumber: 1,
      status: 'scored', exactScore, score: round(exactScore), dimensions: Object.fromEntries(dimensions.map(dimension => [dimension.id, mean(judgments.map(judge => judge.dimensions[dimension.id].rating))])),
      trials: 1, calibrated: false, latencyMs: generation.durationMs ?? null, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens, costUsd: null, wordCount: words(generation.outputText), wordLimit: task.wordLimit ?? null,
      wordLimitExceeded: finite(task.wordLimit) ? words(generation.outputText) > task.wordLimit : null, disagreement,
      coverage: { expectedJudgments: panel.length, completedJudgments: judgments.length, expectedResponses: 1, completedResponses: 1 } };
    cell.metrics = metrics([cell]); cells.push(cell);
    const messages = [...(condition === 'skill' ? [{ role: 'developer', fileId: `skill-instruction-${task.id}` }] : []), { role: 'user', content: generation.promptText }], messageSetId = hash(messages);
    messageSets.set(messageSetId, { id: messageSetId, messages });
    responses.push({ benchmarkId, caseId: task.id, settingId: setting.id, configurationId: setting.configurationId, condition, trialNumber: 1,
      messageSetId, outputText: generation.outputText, wordCount: cell.wordCount, characterCount: Array.from(generation.outputText).length,
      wordLimit: cell.wordLimit, wordLimitExceeded: cell.wordLimitExceeded, status: 'scored', score: cell.score, judgments, disagreement,
      provenance: { sourceSha256, manifestSha256: snapshot.manifestSha256, generationId: generation.id, outputSha256: hash(generation.outputText),
        questionSha256: hash(task.prompt), inputPayloadSha256: hash(generation.promptText), skillSha256: condition === 'skill' ? snapshot.skillSnapshot.hash : null,
        ...(generation.reusedFrom ? { reusedFrom: { sourceSha256: generation.reusedFrom.sha256, outputSha256: generation.reusedFrom.outputSha256, rowKey: generation.reusedFrom.rowKey } } : {}) },
      runtime: { freshSession: true, durationMs: generation.durationMs ?? null, usage,
        modelVerification: generation.runtimeReceipt.modelVerification ?? 'explicit-cli-request-only', reasoningVerification: generation.runtimeReceipt.reasoningVerification ?? 'explicit-cli-request-only',
        ...(condition === 'skill' ? { inlineDelivery: generation.inlineDelivery } : {}),
        skillDelivery: condition === 'skill' ? 'frozen-inline-once' : null } });
  }
  const aggregates = [], entries = [];
  for (const setting of settings) {
    setting.scores = {}; setting.metrics = {}; setting.categories = {}; setting.coverage = {};
    for (const condition of CONDITIONS) {
      const members = cells.filter(cell => cell.settingId === setting.id && cell.condition === condition.id), exactScore = mean(members.map(cell => cell.exactScore));
      const coverage = { expectedCases: cases.length, scoredCases: members.length, expectedResponses: cases.length, completedResponses: members.length,
        expectedJudgments: cases.length * panel.length, completedJudgments: members.length * panel.length };
      setting.scores[condition.id] = round(exactScore); setting.metrics[condition.id] = metrics(members); setting.coverage[condition.id] = coverage;
      setting.categories[condition.id] = [{ category: 'writing', score: round(exactScore), exactScore }];
      aggregates.push({ benchmarkId, settingId: setting.id, configurationId: setting.configurationId, condition: condition.id, category: 'writing',
        score: round(exactScore), exactScore, status: 'scored', dimensions: {}, metrics: setting.metrics[condition.id], coverage, trials: 1, calibrated: false });
    }
    const pair = aggregates.slice(-2);
    setting.deltas = { skill: round(pair[1].exactScore - pair[0].exactScore) };
  }
  for (const setting of settings) for (const condition of CONDITIONS) {
    const aggregate = aggregates.find(row => row.settingId === setting.id && row.condition === condition.id);
    entries.push({ ...setting, id: `${setting.id}-${condition.id}`, settingId: setting.id, condition: condition.id, conditionLabel: condition.label,
      score: aggregate.score, exactScore: aggregate.exactScore, baselineScore: setting.scores.baseline, delta: condition.id === 'baseline' ? 0 : setting.deltas.skill,
      rank: 1 + aggregates.filter(row => row.condition === condition.id && row.exactScore > aggregate.exactScore).length,
      eligibleForRank: true, categories: setting.categories[condition.id], baselineCategories: setting.categories.baseline,
      metrics: setting.metrics[condition.id], coverage: setting.coverage[condition.id], cost: null,
      latency: finite(setting.metrics[condition.id].meanLatencyMs) ? setting.metrics[condition.id].meanLatencyMs / 1000 : null, tokens: setting.metrics[condition.id].meanOutputTokens });
  }
  const coverage = { benchmarkCount: 1, caseCount: cases.length, settingCount: settings.length, completedSettingCount: settings.length,
    responseCount: cells.length, expectedResponseCount: cells.length, scoredResponseCount: cells.length, usablePairs: cells.length / 2, expectedPairs: cells.length / 2,
    judgmentCount: cells.length * panel.length, expectedJudgmentCount: cells.length * panel.length, pairedJudgeCallCount: judges.length, expectedPairedJudgeCallCount: judges.length };
  const measured = summary(cells, cases.map(task => task.id), configurationIds);
  const limitations = ['Three selected stories, a revised rubric, and retained plain answers: these scores are a separate development comparison, not a replacement for the original Core idea benchmark.',
    'One answer per condition and case; two judges from the same provider and creator families. No population ranking or uncertainty interval is established.',
    'This report is excluded from the established three-benchmark Writing and Overall aggregates.'];
  const availability = { status: 'development', verification: 'unverified', code: 'development-uncalibrated', message: 'Exploratory model-judged results', detail: limitations[0], blockers: [] };
  const publication = { adapter: 'writing-refresh-v1', edition: benchmarkId, archived: false, scoreBasisIncluded: false, status: 'measured' };
  const benchmark = { id: benchmarkId, name: title, title, familyId: 'writing', category: 'writing', trackId: 'storytelling', suite: 'Storytelling',
    description: title, taskKind: 'compact-writing', prompt: cases[0].prompt, judging: { panel, synthesizer: null }, limitations,
    reportFragment: benchmarkId, detailHref: `benchmark-report.html#${benchmarkId}`, evidenceKind: 'development', resultAvailability: availability, publication,
    measured: { ...measured, complete: cells.length, total: cells.length, treatmentLabel: 'Storytelling skill', calibration: 'Human calibration pending' } };
  const panelMethod = 'Each judge scores six weighted dimensions from 0 to 1. Sum rating × percentage weight for a /100 answer score, average the two independent judges, then average all cases equally. Both conditions use the same rubric. Formula labels alone earn no credit.';
  const blinding = 'Both judges see the complete anonymous pair in opposite orders, with model and treatment labels withheld. The judges do not receive the skill; style may still reveal treatment.';
  const scoreBasis = { id: `${benchmarkId}:${sourceSha256}`, edition: benchmarkId, label: `${title} · six-dimension paired panel`, method: 'weighted-dimensions-two-judge-equal-case-mean-v1',
    unit: 'rubric-points', range: { minimum: 0, maximum: 100 }, benchmarkIds: [benchmarkId], taskCount: cases.length, trialsPerTask: 1,
    judgeCount: panel.length, judges: panel, dimensions, weights: Object.fromEntries(dimensions.map(dimension => [dimension.id, dimension.weight])),
    ratingMinimum: 0, ratingMaximum: 1, gates: null, caps: null, aggregation: 'weighted-ratings-then-mean-two-judges-then-equal-cases',
    batchUnit: 'matched-pair', calibrationStatus: 'development-uncalibrated', panelMethod, blinding, sourceSha256, manifestSha256: snapshot.manifestSha256,
    coverage, uncertainty: { status: 'not-estimated', reason: limitations[1] } };
  const caseSummaries = cases.map(task => ({ caseId: task.id, benchmarkId, ...summary(cells, [task.id], configurationIds), total: settings.length * 2,
    complete: settings.length * 2, detailHref: `${benchmark.detailHref}/${task.id}` }));
  const counts = { families: 1, tracks: 1, benchmarks: 1, categories: 1, cases: cases.length, conditions: 2, settings: settings.length,
    resultEntries: entries.length, responses: cells.length, developmentResultSets: 1, eligibleResultSets: 0, withheldResultSets: 0 };
  const projection = { kind: 'vasirbenchmark-writing-projection', schemaVersion: 1, publication, trialCount: 1, caseLabel: 'story', trialLabel: 'Sample',
    program: { id: 'vasirbench', title: 'VasirBench', status: 'development', evidenceStatus: 'development', verification: 'unverified' },
    meta: { release: 'Current storytelling skill · October 2026', status: availability.message, categories: 1, benchmarks: 1, settings: settings.length, conditions: 2,
      trials: 1, aggregateCells: cells.length, runs: 1, calibration: 0 }, scoreBasis, conditions: CONDITIONS,
    categories: [{ id: 'writing', name: 'Writing', title: 'Writing', short: 'WRITE', weight: 1, color: '#b65a31', trackIds: ['storytelling'] }],
    families: [{ id: 'writing', title: 'Writing', description: 'Task-specific writing benchmarks.', trackIds: ['storytelling'] }],
    tracks: [{ id: 'storytelling', familyId: 'writing', title: 'Storytelling', description: 'Understanding and creating narrative.', benchmarkIds: [benchmarkId], resultAvailability: availability }],
    benchmarks: [benchmark], settings, entries, benchmarkResults: aggregates, cases, caseResults: cells, caseSummaries,
    trialSummaries: caseSummaries.map(row => ({ ...row, trialNumber: 1 })), coverage, pairwisePreferences,
    results: [{ benchmarkId, runId: snapshot.runId, status: 'development', verification: 'unverified', baselineScore: measured.baseline, treatmentScore: measured.treatment,
      delta: measured.delta, responseCount: cells.length, matchedConfigurationCount: settings.length, coverage }],
    benchmarkSummaries: [{ benchmarkId, runId: snapshot.runId, status: 'development', verification: 'unverified', evidenceKind: 'development', baselineLabel: 'Plain answer',
      treatmentLabel: 'Storytelling skill', ...measured, complete: cells.length, total: cells.length, completionLabel: 'scored responses', calibration: 'Human calibration pending', detailHref: benchmark.detailHref, sourceHref: null }],
    methodology: { corpusSha256: hash(tasks), rubricSha256: hash(rubric), skillSha256: snapshot.skillSnapshot.hash,
      skillFiles: snapshot.skillSnapshot.files.filter(file => deliveredFiles.has(file.relativePath)).map(file => ({ path: file.relativePath, sha256: hash(file.contents), bytes: Buffer.byteLength(file.contents) })),
      frozenSkillFiles: snapshot.skillSnapshot.files.map(file => ({ path: file.relativePath, sha256: hash(file.contents), bytes: Buffer.byteLength(file.contents) })),
      corpus: cases.map(task => ({ id: task.id, title: task.title, sha256: hash(task.prompt) })),
      generationContract: 'The current frozen skill root and each case’s declared references are delivered verbatim once in the developer instruction; all tools are disabled. The exact delivered files are inspectable below. The full skill snapshot supplies provenance, not additional model context. Core idea plain answers retain their original runtime. This compares current skill with plain, not current with previous skill.',
      blinding, limitations, execution: { trialCount: 1, hostAutomaticRetries: 0, deliveryMode: 'frozen-inline-once' },
      resourceAccounting: `This report uses ${generations.filter(row => !row.reusedFrom).length + judges.length} new model calls and reuses ${generations.filter(row => row.reusedFrom).length} plain answers. Generation usage belongs to each answer; reused answers retain original recorded resources and are not new calls. Count each paired judge requestId once.${recovery ? ` ${recovery.priorFailedLaunches} earlier failed attempts are retained separately: ${recovery.failedStartupLaunches} startup failures with no reported usage and ${recovery.failedReferenceDeliveryCalls} reference-delivery failures reporting ${recovery.reportedExcludedUsage.totalTokens.toLocaleString('en-US')} tokens, including ${recovery.reportedExcludedUsage.cachedInputTokens.toLocaleString('en-US')} cached input tokens. These resources belong to the run; no valid qualified answer was retried.` : ''}` },
    availability, counts, categoryLeaders: [], efficientFrontier: [], regressions: entries.filter(entry => entry.condition === 'skill' && entry.delta < 0),
    callouts: { overall: limitations[2], value: 'Quality and resources are separate outcomes.', regression: 'All case-level losses remain visible.', category: limitations[0] } };
  const responseBundle = { kind: 'vasirbenchmark-writing-responses', schemaVersion: 1, counts: { ...coverage, responses: responses.length, messageSets: messageSets.size },
    promptFiles, messageSets: [...messageSets.values()], responses, judgeRequests };
  validateWritingRefreshPublication(projection, responseBundle);
  return { projection, responseBundle, stub: { benchmarkId, benchmarkTitle: title, coverage, scoreBasisLabel: scoreBasis.label,
    kind: 'vasirbenchmark-writing-summary', schemaVersion: 1, dataHref: './writing-data.js', responsesHref: './writing-responses.js' },
    counts, settings, basisSha256: hash({ sourceSha256, benchmarkId }) };
}

export function validateWritingRefreshPublication(projection, responseBundle) {
  const benchmarkId = projection?.benchmarks?.[0]?.id, dimensions = projection?.scoreBasis?.dimensions;
  const expectedCases = ['breaking-bad', 'the-matrix', 'a-separation'];
  requireEvidence(WRITING_REFRESH_BENCHMARK_IDS.includes(benchmarkId) && projection.kind === 'vasirbenchmark-writing-projection'
    && projection.schemaVersion === 1 && projection.benchmarks.length === 1 && projection.publication?.scoreBasisIncluded === false,
  'invalid pilot report or aggregate inclusion.');
  requireEvidence(same(projection.conditions, CONDITIONS) && same(projection.cases.map(task => task.id), expectedCases)
    && same(projection.settings.map(setting => setting.configurationId), ['codex:gpt-6-astra@xhigh', 'codex:gpt-6.1-sol@xhigh'])
    && same(projection.scoreBasis.judges, ['codex:gpt-6-astra@xhigh', 'codex:gpt-6.1-sol@xhigh'])
    && projection.scoreBasis.ratingMaximum === 1 && projection.scoreBasis.judgeCount === 2
    && dimensions.length === 6 && dimensions.reduce((total, dimension) => total + dimension.weight, 0) === 100,
  'fixed cases, models, judges, or rubric scale changed.');
  const cells = projection.caseResults;
  requireEvidence(cells.length === expectedCases.length * 4 && new Set(cells.map(key)).size === cells.length
    && cells.every(cell => cell.benchmarkId === benchmarkId && expectedCases.includes(cell.caseId)
      && projection.settings.some(setting => setting.id === cell.settingId && setting.configurationId === cell.configurationId)
      && ['baseline', 'skill'].includes(cell.condition) && cell.trialNumber === 1 && cell.coverage.completedJudgments === 2), 'incomplete or changed matrix.');
  for (const cell of cells) requireEvidence(Math.abs(cell.exactScore - score(cell.dimensions, dimensions)) < 1e-10
    && cell.score === round(cell.exactScore), 'answer score differs from weighted ratings.');
  for (const setting of projection.settings) {
    requireEvidence(Object.entries(identity(setting.configurationId)).every(([field, value]) => setting[field] === value), 'model identity changed.');
    const totals = [];
    for (const condition of CONDITIONS) {
      const members = cells.filter(cell => cell.settingId === setting.id && cell.condition === condition.id);
      const exactScore = mean(members.map(cell => cell.exactScore)), aggregate = projection.benchmarkResults.find(row => row.settingId === setting.id && row.condition === condition.id);
      const entry = projection.entries.find(row => row.settingId === setting.id && row.condition === condition.id);
      const rank = 1 + projection.benchmarkResults.filter(row => row.condition === condition.id && row.exactScore > exactScore).length;
      requireEvidence(members.length === expectedCases.length && aggregate?.exactScore === exactScore && aggregate.score === round(exactScore)
        && setting.scores[condition.id] === round(exactScore) && entry?.exactScore === exactScore && entry.score === round(exactScore)
        && entry.rank === rank && entry.eligibleForRank === true && same(aggregate.metrics, metrics(members)), 'aggregate, resources, or rank changed.');
      totals.push(exactScore);
    }
    requireEvidence(setting.deltas.skill === round(totals[1] - totals[0]), 'paired uplift changed.');
  }
  requireEvidence(!/\/Users\/|"(?:threadId|sessionId|session_id|cliArguments|stdout|stderr)"/u.test(JSON.stringify(projection)), 'private runtime metadata in projection.');
  if (!responseBundle) return projection;
  requireEvidence(responseBundle.kind === 'vasirbenchmark-writing-responses' && responseBundle.responses.length === cells.length
    && new Set(responseBundle.responses.map(key)).size === cells.length
    && responseBundle.judgeRequests.length === cells.length && new Set(responseBundle.judgeRequests.map(judge => judge.id)).size === cells.length,
  'answer or judge archive coverage changed.');
  requireEvidence(responseBundle.promptFiles.every(file => hash(file.content) === file.sha256)
    && responseBundle.messageSets.every(set => hash(set.messages) === set.id), 'frozen input bytes changed.');
  for (const response of responseBundle.responses) {
    const cell = cells.find(cell => key(cell) === key(response));
    const task = projection.cases.find(task => task.id === response.caseId);
    requireEvidence(cell && response.score === cell.score && response.provenance.outputSha256 === hash(response.outputText)
      && response.wordCount === words(response.outputText) && response.characterCount === Array.from(response.outputText).length
      && response.provenance.sourceSha256 === projection.scoreBasis.sourceSha256 && response.judgments.length === 2
      && new Set(response.judgments.map(judge => judge.judgeConfigurationId)).size === 2, 'answer bytes, identity, or score changed.');
    const messages = responseBundle.messageSets.find(set => set.id === response.messageSetId)?.messages;
    requireEvidence(messages?.at(-1).content === task.prompt && messages.length === (response.condition === 'skill' ? 2 : 1)
      && (response.condition !== 'skill' || messages[0].fileId === `skill-instruction-${task.id}`), 'generation input changed.');
    if (response.condition === 'skill') {
      const instruction = responseBundle.promptFiles.find(file => file.id === messages[0].fileId), delivery = response.runtime.inlineDelivery;
      requireEvidence(delivery?.mode === 'frozen-inline-once' && delivery.instructionSha256 === instruction?.sha256
        && delivery.instructionBytes === Buffer.byteLength(instruction.content), 'delivered skill instruction changed.');
    }
    for (const judge of response.judgments) {
      const request = responseBundle.judgeRequests.find(request => request.id === judge.requestId);
      requireEvidence(request && projection.scoreBasis.judges.includes(judge.judgeConfigurationId) && request.judgeConfigurationId === judge.judgeConfigurationId
        && request.candidateMap[judge.candidateId] === response.condition && request.candidateResponseHashes[judge.candidateId] === response.provenance.outputSha256
        && hash(request.outputText) === request.outputSha256 && hash(request.promptText) === request.promptSha256
        && judge.answerSha256 === request.outputSha256 && judge.promptSha256 === request.promptSha256, 'judge no longer binds the exact candidate.');
      const original = JSON.parse(request.outputText).assessments.find(assessment => assessment.candidateLabel === judge.candidateId);
      requireEvidence(original && dimensions.every(dimension => {
        const reading = judge.dimensions[dimension.id], originalReading = original.ratings.find(rating => rating.dimensionId === dimension.id);
        return originalReading && finite(reading?.rating) && reading.rating >= 0 && reading.rating <= 1
          && reading.rating === originalReading.score && reading.reason === originalReading.evidence && reading.evidence === null;
      }) && judge.score === score(Object.fromEntries(dimensions.map(dimension => [dimension.id, judge.dimensions[dimension.id].rating])), dimensions), 'judge ratings differ from original JSON.');
    }
    requireEvidence(cell.exactScore === mean(response.judgments.map(judge => judge.score))
      && dimensions.every(dimension => cell.dimensions[dimension.id] === mean(response.judgments.map(judge => judge.dimensions[dimension.id].rating))), 'displayed means changed the original reviews.');
  }
  requireEvidence(!/\/Users\/|"(?:threadId|sessionId|session_id|cliArguments|stdout|stderr)"/u.test(JSON.stringify(responseBundle)), 'private runtime metadata in answers.');
  return projection;
}

export function buildWritingRefreshPublication({ repoRootDirectory, benchmarkId, readFileSyncImplementation = fs.readFileSync }) {
  requireEvidence(WRITING_REFRESH_BENCHMARK_IDS.includes(benchmarkId), 'unknown benchmark.');
  let selection;
  try { selection = JSON.parse(readFileSyncImplementation(path.join(repoRootDirectory, WRITING_REFRESH_SELECTION_PATH), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  requireEvidence(selection.kind === 'vasirbenchmark-writing-refresh-source' && selection.schemaVersion === 1, 'invalid source selection.');
  const pin = selection.snapshot;
  requireEvidence(/^[a-f0-9]{64}$/.test(pin?.sha256 ?? '') && typeof pin.path === 'string' && !path.isAbsolute(pin.path)
    && !pin.path.includes('\\') && pin.path.split('/').every(part => part && part !== '.' && part !== '..'), 'unsafe snapshot pin.');
  const text = readFileSyncImplementation(path.join(repoRootDirectory, pin.path), 'utf8');
  requireEvidence(hash(text) === pin.sha256, 'selected snapshot bytes changed.');
  return projectWritingRefreshSnapshot({ snapshot: JSON.parse(text), sourceSha256: pin.sha256, benchmarkId });
}

export function prepareWritingRefreshPublicationSource({ repoRootDirectory, runDirectory }) {
  requireEvidence(!fs.existsSync(path.join(runDirectory, 'run.lock')), 'wait for the active run writer before selecting evidence.');
  const snapshot = loadRefreshSnapshot({ runDirectoryPath: path.resolve(runDirectory) });
  validateRefreshSnapshot(snapshot, { repoRootDirectory });
  requireEvidence(snapshot.generations.every(row => row.status === 'complete') && snapshot.judgments.every(row => row.status === 'complete'), 'all planned answers and reviews must complete before publication.');
  const contents = `${JSON.stringify(snapshot, null, 2)}\n`, sha256 = hash(contents);
  for (const benchmarkId of WRITING_REFRESH_BENCHMARK_IDS) projectWritingRefreshSnapshot({ snapshot, sourceSha256: sha256, benchmarkId });
  const relativePath = `.agents/vasir-evals/storytelling-skill-refresh/publication-snapshots/${sha256}/snapshot.json`;
  const target = path.join(repoRootDirectory, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) requireEvidence(fs.readFileSync(target, 'utf8') === contents, 'immutable snapshot collision.');
  else fs.writeFileSync(target, contents, { flag: 'wx' });
  const selection = { kind: 'vasirbenchmark-writing-refresh-source', schemaVersion: 1, snapshot: { path: relativePath, sha256 } };
  fs.writeFileSync(path.join(repoRootDirectory, WRITING_REFRESH_SELECTION_PATH), `${JSON.stringify(selection, null, 2)}\n`);
  return selection;
}
