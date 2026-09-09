import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportCompactRun } from './writing-compact-runtime.js';
import { readCompactJudgeRevalidation } from './writing-compact-judge-validation.js';
import { readCompactHealthyContinuation } from './writing-compact-pending-controller.js';
import { validateCompactRunExport, validateCompactJudgeRevalidation, validateCompactHealthyContinuation } from './writing-compact-publication-validation-v1.js';
import { WRITING_ACTIVE_RELEASE } from './writing-release-catalog.js';

export const WRITING_COMPACT_SELECTION_PATH = 'benchmarks/writing-compact-v1/publication.json';
export const WRITING_COMPACT_BENCHMARKS = Object.freeze([
  { id: 'storytelling-plot-twists-compact-v2', name: 'Plot twists', trackId: 'storytelling', trackTitle: 'Storytelling', caseCount: 3, predecessorBenchmarkId: 'storytelling-plot-twists' },
  { id: 'writing-place-generation-v1', name: 'Place generation', trackId: 'worldbuilding', trackTitle: 'Worldbuilding', caseCount: 1, subjectTags: ['D&D'] },
  { id: 'storytelling-one-shot-v1', name: 'One-shot adventure outline', trackId: 'storytelling', trackTitle: 'Storytelling', caseCount: 1, subjectTags: ['D&D'], predecessorBenchmarkId: 'dungeon-master-adventure-outline' }
]);
export const WRITING_ESTABLISHED_SCORE_BASIS = Object.freeze({
  id: 'writing-established-storytelling-v1',
  benchmarkIds: ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery'],
  coreIdeaScoring: 'published-single-judge-provisional',
  method: 'equal-benchmark-mean'
});
const PANEL = ['codex:gpt-6-astra@medium', 'codex:gpt-5.6-sol@medium'];
const CONDITIONS = [{ id: 'baseline', sourceId: 'baseline', label: 'Plain answer', short: 'Plain', color: '#72777f', shape: 'circle' },
  { id: 'skill', sourceId: 'skill', label: 'Task-specific skill', short: 'Skill', color: '#1f6fff', shape: 'square' }];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const mean = values => values.length && values.every(finite) ? values.reduce((a, b) => a + b, 0) / values.length : null;
const round = value => finite(value) ? Math.round((value + Number.EPSILON) * 10) / 10 : null;
const words = text => text.trim() ? text.trim().split(/\s+/u).length : 0;
const requireEvidence = (condition, message) => { if (!condition) throw new Error(`Compact Writing publication: ${message}`); };
const publicUsage = usage => Object.fromEntries(['inputTokens', 'cachedInputTokens', 'cacheWriteInputTokens', 'cacheCreationInputTokens', 'cacheReadInputTokens', 'outputTokens', 'reasoningOutputTokens', 'totalTokens']
  .map(field => [field, finite(usage?.[field]) && usage[field] >= 0 ? usage[field] : null]));
const cellKey = cell => `${cell.configurationId}:${cell.caseId}:${cell.condition}`;
const metrics = cells => ({ meanLatencyMs: round(mean(cells.map(cell => cell.latencyMs))), meanInputTokens: round(mean(cells.map(cell => cell.inputTokens))),
  meanOutputTokens: round(mean(cells.map(cell => cell.outputTokens))), meanTotalTokens: round(mean(cells.map(cell => cell.totalTokens))),
  meanWordCount: round(mean(cells.map(cell => cell.wordCount))), meanCostUsd: null, costCoverage: 'not-comparable' });
const dimensions = [1, 2, 3, 4].map(index => ({ id: `criterion-${index}`, label: `Criterion ${index}`, title: `Criterion ${index}`, weight: 25,
  description: 'Task-specific criterion; see the exact task rubric.' }));

function identity(configuration) {
  const family = configuration.model === 'claude-fable-5-1' ? 'Claude Fable 5.1' : 'Claude Opus 5';
  return { id: configuration.id.replace(/[^a-zA-Z0-9-]/g, '-'), configurationId: configuration.id,
    modelId: `${configuration.provider}:${configuration.model}`, provider: configuration.provider, family, reasoning: configuration.reasoning,
    label: `${family} · ${configuration.reasoning}` };
}

function summary(cells, configurationIds, caseIds) {
  const pairs = configurationIds.flatMap(configurationId => caseIds.map(caseId => ({
    baseline: cells.find(cell => cell.configurationId === configurationId && cell.caseId === caseId && cell.condition === 'baseline')?.exactScore ?? null,
    treatment: cells.find(cell => cell.configurationId === configurationId && cell.caseId === caseId && cell.condition === 'skill')?.exactScore ?? null
  }))).filter(pair => finite(pair.baseline) && finite(pair.treatment));
  return { baseline: round(mean(pairs.map(pair => pair.baseline))), treatment: round(mean(pairs.map(pair => pair.treatment))),
    delta: round(mean(pairs.map(pair => pair.treatment - pair.baseline))), usablePairs: pairs.length,
    expectedPairs: configurationIds.length * caseIds.length, wins: pairs.filter(pair => pair.treatment > pair.baseline).length,
    ties: pairs.filter(pair => pair.treatment === pair.baseline).length, losses: pairs.filter(pair => pair.treatment < pair.baseline).length };
}

function projectGroup(snapshot, registry, sourceSha256) {
  const { manifest } = snapshot, specification = manifest.specification;
  const definition = specification.groups.find(group => group.benchmarkId === registry.id);
  const tasks = specification.cases.filter(task => task.benchmarkId === registry.id);
  requireEvidence(definition && tasks.length === registry.caseCount, 'registered group inventory changed.');
  const settings = manifest.configurations.map(identity), benchmarkId = registry.id;
  const cases = tasks.map(task => ({ id: task.id, benchmarkId, title: task.title, prompt: task.task, wordLimit: task.wordLimit,
    rubric: task.rubric.map((criterion, index) => ({ ...criterion, dimensionId: dimensions[index].id, weight: 25 })),
    subjectTags: task.subjectTags ?? registry.subjectTags ?? [] }));
  const promptFiles = [], messageSets = new Map(), responses = [], cells = [], pairwisePreferences = [];
  for (const task of tasks) {
    const bundle = manifest.frozenBundles.find(bundle => bundle.caseId === task.id);
    requireEvidence(bundle, 'task frozen treatment is missing.');
    promptFiles.push({ id: `compact-skill-${task.id}`, title: `${task.title} · exact frozen inline skill material`, content: bundle.text, sha256: bundle.sha256 });
  }
  for (const setting of settings) for (const task of tasks) {
    const pairJudgments = snapshot.judgments.filter(judge => judge.configurationId === setting.configurationId && judge.caseId === task.id);
    const generationPair = snapshot.generations.filter(row => row.configurationId === setting.configurationId && row.caseId === task.id);
    const completePair = generationPair.length === 2 && generationPair.every(row => row.status === 'succeeded') && pairJudgments.length === 2 && pairJudgments.every(judge => judge.status === 'succeeded');
    for (const judge of pairJudgments.filter(judge => judge.status === 'succeeded')) pairwisePreferences.push({ benchmarkId, settingId: setting.id,
      configurationId: setting.configurationId, caseId: task.id, trialNumber: 1, reviewerId: judge.judgeConfigurationId,
      judgeConfigurationId: judge.judgeConfigurationId, preferredCondition: judge.preference.candidate === 'tie' ? 'tie' : judge.candidateMap[judge.preference.candidate],
      preference: judge.preference, candidateMap: judge.candidateMap, requestId: judge.id });
    for (const condition of CONDITIONS) {
      const row = generationPair.find(row => row.condition === condition.id);
      requireEvidence(row, 'generation plan slot is missing.');
      // Provider error text is retained in the immutable attempt, not promoted
      // to a story answer or counted as a completed response.
      const outputText = row.status === 'succeeded' && typeof row.responseText === 'string' ? row.responseText : '';
      const hasOutput = Boolean(outputText.trim());
      const bundle = manifest.frozenBundles.find(bundle => bundle.caseId === task.id);
      const judgments = row.status === 'succeeded' ? pairJudgments.filter(judge => judge.status === 'succeeded').map(judge => {
        const candidate = Object.keys(judge.candidateMap).find(label => judge.candidateMap[label] === condition.id);
        const assessment = candidate === 'A' ? judge.assessmentA : judge.assessmentB;
        return { judgeConfigurationId: judge.judgeConfigurationId, reviewerId: judge.judgeConfigurationId, candidateId: candidate,
          requestId: judge.id, score: 20 * mean(assessment.ratings.map(rating => rating.score)),
          ...(judge.offlineValidation ? { validation: judge.offlineValidation } : {}),
          dimensions: Object.fromEntries(task.rubric.map((criterion, index) => {
            const rating = assessment.ratings.find(rating => rating.criterionId === criterion.id);
            return [dimensions[index].id, { rating: rating.score, criterionId: criterion.id, label: criterion.criterion, evidence: rating.evidence, reason: rating.reason }];
          })), rationale: assessment.ratings.map(rating => rating.reason).join('\n'), promptSha256: judge.promptSha256,
          answerSha256: judge.outputSha256, resources: { scope: 'shared-matched-pair-batch', candidateCount: 2, durationMs: judge.durationMs ?? null, usage: publicUsage(judge.usage) } };
      }) : [];
      const exactScore = completePair ? mean(judgments.map(judge => judge.score)) : null;
      const status = finite(exactScore) ? 'scored' : row.status === 'succeeded' ? 'unscored' : row.status === 'pending' ? 'pending' : 'error';
      const disagreement = judgments.length === 2 ? { scoreSpread: Math.abs(judgments[0].score - judgments[1].score),
        dimensionRanges: dimensions.map(dimension => ({ id: dimension.id, spread: Math.abs(judgments[0].dimensions[dimension.id].rating - judgments[1].dimensions[dimension.id].rating) })) } : null;
      const cell = { settingId: setting.id, configurationId: setting.configurationId, benchmarkId, caseId: task.id, condition: condition.id, category: 'writing', trialNumber: 1,
        status, exactScore, score: round(exactScore), dimensions: Object.fromEntries(dimensions.map(dimension => [dimension.id, completePair ? mean(judgments.map(judge => judge.dimensions[dimension.id].rating)) : null])),
        trials: 1, calibrated: false, latencyMs: hasOutput ? row.durationMs ?? null : null,
        inputTokens: hasOutput ? row.usage?.inputTokens ?? null : null, outputTokens: hasOutput ? row.usage?.outputTokens ?? null : null,
        totalTokens: hasOutput ? row.usage?.totalTokens ?? null : null, costUsd: null, wordCount: hasOutput ? words(outputText) : null,
        wordLimit: task.wordLimit, wordLimitExceeded: hasOutput ? words(outputText) > task.wordLimit : null, disagreement,
        coverage: { expectedJudgments: 2, completedJudgments: judgments.length, expectedResponses: 1, completedResponses: row.status === 'succeeded' ? 1 : 0 },
        failureReason: ['pending', 'succeeded'].includes(row.status) ? null : 'The original generation did not complete successfully; no replacement answer was scored.' };
      cell.metrics = metrics([cell]); cells.push(cell);
      const messages = [...(condition.id === 'skill' ? [{ role: 'system', content: 'Exact frozen inline skill material; see the shared source.', fileId: `compact-skill-${task.id}` }] : []), { role: 'user', content: task.task }];
      const messageSetId = hash(JSON.stringify(messages)); messageSets.set(messageSetId, { id: messageSetId, messages });
      responses.push({ benchmarkId, caseId: task.id, settingId: setting.id, configurationId: setting.configurationId, condition: condition.id, trialNumber: 1,
        messageSetId, outputText, wordCount: cell.wordCount, wordLimit: task.wordLimit, wordLimitExceeded: cell.wordLimitExceeded,
        characterCount: hasOutput ? Array.from(outputText).length : null, status, failureReason: cell.failureReason, judgments, disagreement, score: cell.score,
        provenance: { sourceSha256, manifestSha256: snapshot.manifestSha256, amendmentSha256: snapshot.amendmentSha256 ?? null,
          judgeValidationSha256: snapshot.judgeValidationSha256 ?? null,
          healthyContinuationSha256: snapshot.healthyContinuationSha256 ?? null, generationId: row.id,
          controllerVersion: row.attempt?.controllerVersion ?? null, controllerScopeSha256: row.attempt?.controllerScopeSha256 ?? null,
          outputSha256: hasOutput ? hash(outputText) : null, questionSha256: hash(task.task),
          skillSha256: condition.id === 'skill' ? bundle.sha256 : null, inputPayloadSha256: row.inputPayloadSha256 ?? null },
        runtime: row.status === 'succeeded' ? { freshSession: true, rawProviderStreamRetained: true, durationMs: row.durationMs ?? null,
          usage: publicUsage(row.usage), modelVerification: row.runtimeReceipt.modelVerification ?? 'explicit-cli-request-only',
          reasoningVerification: row.runtimeReceipt.reasoningVerification ?? 'explicit-cli-request-only',
          skillDelivery: condition.id === 'skill' ? 'frozen-inline-once' : null } : null });
    }
  }
  const aggregates = [];
  for (const setting of settings) {
    const cohort = cells.filter(cell => cell.settingId === setting.id), complete = cohort.every(cell => finite(cell.exactScore));
    setting.scores = {}; setting.metrics = {}; setting.coverage = {}; setting.categories = {};
    for (const condition of CONDITIONS) {
      const members = cohort.filter(cell => cell.condition === condition.id), exactScore = complete ? mean(members.map(cell => cell.exactScore)) : null;
      const coverage = { expectedCases: tasks.length, scoredCases: members.filter(cell => finite(cell.exactScore)).length,
        expectedResponses: tasks.length, completedResponses: members.reduce((sum, cell) => sum + cell.coverage.completedResponses, 0),
        expectedJudgments: tasks.length * 2, completedJudgments: members.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0) };
      setting.scores[condition.id] = round(exactScore); setting.metrics[condition.id] = metrics(members); setting.coverage[condition.id] = coverage;
      setting.categories[condition.id] = [{ category: 'writing', score: round(exactScore), exactScore }];
      aggregates.push({ settingId: setting.id, configurationId: setting.configurationId, benchmarkId, category: 'writing', condition: condition.id,
        score: round(exactScore), exactScore, status: complete ? 'scored' : 'incomplete', dimensions: {}, metrics: setting.metrics[condition.id], coverage, trials: 1, calibrated: false });
    }
    const pair = aggregates.slice(-2);
    setting.deltas = { skill: complete ? round(pair[1].exactScore - pair[0].exactScore) : null };
  }
  const entries = settings.flatMap(setting => CONDITIONS.map(condition => {
    const aggregate = aggregates.find(row => row.settingId === setting.id && row.condition === condition.id);
    return { ...setting, id: `${setting.id}-${condition.id}`, settingId: setting.id, condition: condition.id, conditionLabel: condition.label,
      score: aggregate.score, exactScore: aggregate.exactScore, baselineScore: setting.scores.baseline,
      delta: finite(aggregate.exactScore) ? condition.id === 'baseline' ? 0 : setting.deltas.skill : null,
      rank: finite(aggregate.exactScore) ? 1 + aggregates.filter(row => row.condition === condition.id && finite(row.exactScore) && row.exactScore > aggregate.exactScore).length : null,
      eligibleForRank: finite(aggregate.exactScore), categories: setting.categories[condition.id], baselineCategories: setting.categories.baseline,
      metrics: setting.metrics[condition.id], coverage: setting.coverage[condition.id], cost: null, latency: finite(setting.metrics[condition.id].meanLatencyMs) ? setting.metrics[condition.id].meanLatencyMs / 1000 : null,
      tokens: setting.metrics[condition.id].meanOutputTokens };
  }));
  const completedSettings = settings.filter(setting => finite(setting.scores.baseline) && finite(setting.scores.skill));
  const allPairs = summary(cells, settings.map(setting => setting.configurationId), tasks.map(task => task.id));
  const measured = summary(cells, completedSettings.map(setting => setting.configurationId), tasks.map(task => task.id));
  const coverage = { benchmarkCount: 1, caseCount: tasks.length, settingCount: settings.length, completedSettingCount: completedSettings.length,
    responseCount: cells.reduce((sum, cell) => sum + cell.coverage.completedResponses, 0), expectedResponseCount: tasks.length * settings.length * 2,
    scoredResponseCount: cells.filter(cell => finite(cell.exactScore)).length, usablePairs: allPairs.usablePairs, expectedPairs: tasks.length * settings.length,
    judgmentCount: responses.reduce((sum, response) => sum + response.judgments.length, 0), expectedJudgmentCount: tasks.length * settings.length * 4,
    pairedJudgeCallCount: pairwisePreferences.length, expectedPairedJudgeCallCount: tasks.length * settings.length * 2 };
  const availability = { status: 'development', verification: 'unverified', code: 'development-uncalibrated', message: 'Exploratory model-judged results',
    detail: 'One generation per task and condition, two blinded paired judges, six Claude settings.', blockers: [{ code: 'human-calibration-pending', message: 'Not calibrated against a human panel.' }] };
  const limitations = [specification.scoring.uncertainty, specification.judging.limitations,
    'This six-setting edition is separate from the established broad Writing score. Scores do not pool tasks or trials from predecessor editions.'];
  const publication = { adapter: 'writing-compact-v1', edition: benchmarkId, archived: false, scoreBasisIncluded: false, status: completedSettings.length ? 'measured' : 'unscored',
    ...(registry.predecessorBenchmarkId ? { predecessorBenchmarkId: registry.predecessorBenchmarkId } : {}) };
  const benchmark = { id: benchmarkId, trackId: registry.trackId, familyId: 'writing', category: 'writing', suite: registry.trackTitle,
    name: registry.name, title: registry.name, description: definition.description ?? definition.title, taskKind: 'compact-writing',
    prompt: tasks[0].task, judging: { panel: PANEL, synthesizer: null }, limitations, reportFragment: benchmarkId,
    detailHref: `benchmark-report.html#${benchmarkId}`, evidenceKind: 'development', resultAvailability: availability, publication,
    subjectTags: registry.subjectTags ?? [], measured: { ...measured, complete: coverage.scoredResponseCount, total: coverage.expectedResponseCount, treatmentLabel: 'Task-specific skill', calibration: 'Human calibration pending' } };
  const taskRubrics = cases.map(task => ({ caseId: task.id, title: task.title, dimensions: task.rubric }));
  const scoreBasis = { id: `${benchmarkId}:${sourceSha256}`, edition: benchmarkId, label: `${registry.name} · four-criterion paired panel`,
    method: 'complete-paired-equal-task-two-judge-mean-v1', unit: 'rubric-points', range: { minimum: 0, maximum: 100 }, benchmarkIds: [benchmarkId],
    taskCount: tasks.length, trialsPerTask: 1, judgeCount: 2, judges: PANEL, dimensions, taskRubrics,
    weights: Object.fromEntries(dimensions.map(dimension => [dimension.id, 25])), ratingMinimum: 0, ratingMaximum: 5, gates: null, caps: null,
    aggregation: 'mean-four-task-ratings-times-twenty-then-mean-two-judges-then-equal-tasks', batchUnit: 'matched-pair', calibrationStatus: 'development-uncalibrated',
    panelMethod: 'Each judge rates the four criteria specific to the task from 0 to 5. Mean rating × 20 gives a 0–100 answer score. Average the two original judge totals, then average every declared task in the group. Both conditions and all tasks must be complete to rank; missing scores remain missing.',
    blinding: specification.judging.blinding, sourceSha256, manifestSha256: snapshot.manifestSha256, amendmentSha256: snapshot.amendmentSha256 ?? null,
    judgeValidationSha256: snapshot.judgeValidationSha256 ?? null,
    healthyContinuationSha256: snapshot.healthyContinuationSha256 ?? null,
    coverage, uncertainty: { status: 'descriptive-single-generation-per-task', reason: specification.scoring.uncertainty } };
  const methodology = { corpusSha256: manifest.specificationSha256, rubricSha256: hash(JSON.stringify(tasks.map(task => task.rubric))),
    skillSha256: hash(JSON.stringify(tasks.map(task => manifest.frozenBundles.find(bundle => bundle.caseId === task.id).sha256))),
    corpus: cases.map(task => ({ id: task.id, title: task.title, sha256: hash(task.prompt) })), taskRubrics,
    ratingAnchors: specification.scoring.anchors,
    skillFiles: tasks.flatMap(task => manifest.frozenBundles.find(bundle => bundle.caseId === task.id).files.map(file => ({ caseId: task.id, path: file.path, sha256: file.sha256, bytes: Buffer.byteLength(file.content) }))),
    generationContract: specification.treatment.matchedTaskPolicy + ' ' + specification.treatment.requiredReadPolicy,
    blinding: specification.judging.blinding, limitations, execution: { runnerVersion: manifest.schemaVersion, trialCount: 1,
      hostAutomaticRetries: snapshot.healthyContinuation?.policy.automaticHostRetries ?? 0,
      creatorNetworkRetries: (snapshot.amendment?.runtimePolicy ?? manifest.runtimePolicy).claudeMaxRetries,
      creatorOutputLimitRecoveryAttempts: 3,
      creatorOutputTokenLimitPerSegment: snapshot.healthyContinuation?.policy.claudeMaxOutputTokensPerRequest ?? manifest.runtimePolicy.claudeMaxOutputTokens,
      creatorWholeSessionTokenCap: null, deliveryMode: 'frozen-inline-once' },
    resourceAccounting: 'Generation resources belong to each answer. Each judge evaluates the complete pair; its usage repeats on the two answer records, so count requestId once. Missing provider usage stays unknown.' };
  if (snapshot.amendment) {
    methodology.operationalAmendment = { version: snapshot.amendment.version, sha256: snapshot.amendmentSha256,
      originalManifestSha256: snapshot.amendment.originalManifestSha256, reason: snapshot.amendment.reason,
      allowedFailedJudgmentIds: snapshot.amendment.allowedFailedJudgmentIds, originalFailureHashes: snapshot.amendment.originalFailureHashes };
    methodology.limitations = [...methodology.limitations, snapshot.amendment.reason,
      'Host automatic retries are disabled. After the declared amendment, Codex provider-internal network retry counts are unknown; CLI calls are not a count of hidden provider requests.'];
    benchmark.limitations = methodology.limitations;
  }
  if (snapshot.judgeValidation) {
    methodology.judgeValidation = { version: snapshot.judgeValidation.version, sha256: snapshot.judgeValidationSha256,
      validatorSourceSha256: snapshot.judgeValidation.validatorSourceSha256, reason: snapshot.judgeValidation.policy.reason,
      additionalInferenceCalls: 0, records: snapshot.judgeValidation.records.filter(record => snapshot.judgments.some(judge => judge.id === record.judgmentId && tasks.some(task => task.id === judge.caseId)))
        .map(record => ({ judgmentId: record.judgmentId, attemptNumber: record.attemptNumber, originalRecordSha256: record.originalRecordSha256,
          rawStdoutSha256: record.rawStdoutSha256, outputSha256: record.outputSha256, promptSha256: record.promptSha256 })) };
    methodology.limitations = [...methodology.limitations, snapshot.judgeValidation.policy.reason];
    benchmark.limitations = methodology.limitations;
  }
  methodology.limitations = [...methodology.limitations,
    'Claude network retries are disabled, but its CLI has three internal output-limit recovery attempts. One CLI turn may consume four 8192-token segments (about 32K thinking tokens); the per-segment limit is not a whole-session token cap. Failed or unfinished answers remain unscored.'];
  if (snapshot.healthyContinuation) {
    methodology.healthyContinuation = { version: snapshot.healthyContinuation.version, sha256: snapshot.healthyContinuationSha256,
      controllerSourceHashes: snapshot.healthyContinuation.controllerSourceHashes,
      configurationIds: snapshot.healthyContinuation.configurationIds, generationIds: snapshot.healthyContinuation.generationIds,
      policy: snapshot.healthyContinuation.policy };
    methodology.limitations.push('Max-effort continuation is paused. The separately pinned controller dispatches only the 20 originally untouched Opus low/medium slots with the original prompts, skills and limits; it cannot repeat existing attempts or silently refill failed maximum-effort work.');
  }
  benchmark.limitations = methodology.limitations;
  const caseSummaries = cases.map(task => ({ caseId: task.id, benchmarkId, ...summary(cells, settings.map(setting => setting.configurationId), [task.id]),
    total: settings.length * 2, complete: cells.filter(cell => cell.caseId === task.id && finite(cell.exactScore)).length, detailHref: `${benchmark.detailHref}/${task.id}` }));
  const counts = { families: 1, tracks: 1, benchmarks: 1, categories: 1, cases: tasks.length, conditions: 2, settings: settings.length,
    resultEntries: entries.length, responses: coverage.responseCount, developmentResultSets: 1, eligibleResultSets: 0, withheldResultSets: 0 };
  const projection = { kind: 'vasirbenchmark-writing-projection', schemaVersion: 1, publication, trialCount: 1, caseLabel: 'task', trialLabel: 'Sample',
    program: { id: 'vasirbench', title: 'VasirBench', status: 'development', evidenceStatus: 'development', verification: 'unverified' },
    meta: { release: 'Compact Writing · September 2026', status: availability.message, categories: 1, benchmarks: 1, settings: settings.length, conditions: 2, trials: 1, aggregateCells: coverage.expectedResponseCount, runs: 1, calibration: 0 },
    scoreBasis, conditions: CONDITIONS, categories: [{ id: 'writing', name: 'Writing', title: 'Writing', short: 'WRITE', weight: 1, color: '#b65a31', trackIds: [registry.trackId] }],
    families: [{ id: 'writing', title: 'Writing', description: 'Task-specific writing benchmarks.', trackIds: [registry.trackId] }],
    tracks: [{ id: registry.trackId, familyId: 'writing', title: registry.trackTitle, description: registry.trackTitle, benchmarkIds: [benchmarkId], resultAvailability: availability }],
    benchmarks: [benchmark], results: [{ benchmarkId, runId: snapshot.runId, status: 'development', verification: 'unverified', baselineScore: measured.baseline, treatmentScore: measured.treatment, delta: measured.delta, responseCount: coverage.responseCount, matchedConfigurationCount: completedSettings.length, coverage }],
    settings, entries, benchmarkResults: aggregates, benchmarkSummaries: [{ benchmarkId, runId: snapshot.runId, status: 'development', verification: 'unverified', evidenceKind: 'development', baselineLabel: 'Plain answer', treatmentLabel: 'Task-specific skill', ...measured,
      complete: coverage.scoredResponseCount, total: coverage.expectedResponseCount, completionLabel: 'scored responses', calibration: 'Human calibration pending', detailHref: benchmark.detailHref, sourceHref: null }],
    cases, caseResults: cells, caseSummaries, trialSummaries: caseSummaries.map(row => ({ ...row, trialNumber: 1 })), pairwisePreferences, methodology, coverage,
    categoryLeaders: [], efficientFrontier: [], regressions: entries.filter(entry => entry.condition === 'skill' && finite(entry.delta) && entry.delta < 0),
    callouts: { overall: 'This compact edition is reported separately from the established Writing aggregate.', value: 'Quality, length and latency are separate outcomes.', regression: 'All tasks and paired losses remain visible.', category: 'Six Claude settings; one sample per task and condition.' }, availability, counts };
  const judgeRequests = snapshot.judgments.filter(judge => tasks.some(task => task.id === judge.caseId) && judge.status === 'succeeded').map(judge => ({ id: judge.id,
    caseId: judge.caseId, configurationId: judge.configurationId, judgeConfigurationId: judge.judgeConfigurationId, candidateMap: judge.candidateMap,
    candidateResponseHashes: judge.candidateResponseHashes, promptText: judge.promptText, promptSha256: judge.promptSha256, outputText: judge.responseText, outputSha256: judge.outputSha256, preference: judge.preference,
    attemptNumber: judge.attempt?.number ?? 1, priorAttemptSha256: judge.attempt?.priorAttemptSha256 ?? null }));
  for (const request of judgeRequests) {
    const judge = snapshot.judgments.find(judge => judge.id === request.id);
    if (judge.offlineValidation) Object.assign(request, { originalStatus: 'failed', originalRecordSha256: judge.offlineValidation.originalRecordSha256,
      validation: judge.offlineValidation });
  }
  const failedJudgeAttempts = snapshot.judgments.filter(judge => tasks.some(task => task.id === judge.caseId)).flatMap(judge =>
    [...(judge.priorAttempts ?? []), ...(judge.status === 'failed' ? [judge] : [])].map(attempt => {
      const original = Object.fromEntries(Object.entries(attempt).filter(([key]) => !['retryAuthorized', 'priorAttempts'].includes(key)));
      return { requestId: attempt.id, caseId: attempt.caseId, configurationId: attempt.configurationId, judgeConfigurationId: attempt.judgeConfigurationId,
        attemptNumber: attempt.attempt?.number ?? 1, status: 'failed', sourceAttemptSha256: hash(JSON.stringify(original)),
        promptText: attempt.promptText, promptSha256: attempt.promptSha256, outputText: attempt.responseText, outputSha256: attempt.outputSha256,
        candidateMap: attempt.candidateMap, candidateResponseHashes: attempt.candidateResponseHashes,
        rawStdoutSha256: attempt.runtimeReceipt.rawStdoutSha256, rawStderrSha256: attempt.runtimeReceipt.rawStderrSha256,
        failureReason: snapshot.amendment?.allowedFailedJudgmentIds.includes(attempt.id) && (attempt.attempt?.number ?? 1) === 1
          ? 'CLI configuration was rejected before inference. No model judgment was returned. The original failure is retained under the explicit runtime amendment.'
          : 'The original judge call did not produce a valid completed assessment; it was not scored.' };
    }));
  const responseBundle = { kind: 'vasirbenchmark-writing-responses', schemaVersion: 1, counts: { ...coverage, responses: responses.length, messageSets: messageSets.size, judgments: coverage.judgmentCount },
    promptFiles, messageSets: [...messageSets.values()], responses, judgeRequests, failedJudgeAttempts };
  const stub = { benchmarkId, benchmarkTitle: registry.name, subcategory: registry.trackId, title: registry.trackTitle, coverage,
    treatmentLabel: 'Task-specific skill', scoreBasisLabel: scoreBasis.label, detailHref: benchmark.detailHref, status: publication.status,
    sourceSha256, manifestSha256: snapshot.manifestSha256, amendmentSha256: snapshot.amendmentSha256 ?? null,
    judgeValidationSha256: snapshot.judgeValidationSha256 ?? null, healthyContinuationSha256: snapshot.healthyContinuationSha256 ?? null, edition: benchmarkId };
  validateWritingCompactPublication(projection, responseBundle);
  return { projection, responseBundle, stub, basisSha256: hash(JSON.stringify({ sourceSha256, benchmarkId, specificationSha256: manifest.specificationSha256 })) };
}

export function projectWritingCompactRun({ snapshot, sourceSha256 }) {
  validateCompactRunExport(snapshot);
  requireEvidence(/^[a-f0-9]{64}$/.test(sourceSha256 ?? ''), 'source hash is missing.');
  requireEvidence(snapshot.manifest.specification.cases.length === 5 && snapshot.generations.length === 60 && snapshot.judgments.length === 60, 'expected the final five-task, 60-generation, 60-paired-review inventory.');
  requireEvidence(same(snapshot.manifest.specification.groups.map(group => group.benchmarkId).sort(), WRITING_COMPACT_BENCHMARKS.map(group => group.id).sort()), 'unsupported compact benchmark groups.');
  if (snapshot.healthyContinuation) {
    requireEvidence(hash(JSON.stringify(snapshot.healthyContinuation)) === snapshot.healthyContinuationSha256, 'healthy continuation scope hash changed.');
    validateCompactHealthyContinuation(snapshot, snapshot.healthyContinuation);
  } else requireEvidence(!snapshot.healthyContinuationSha256 && !snapshot.generations.some(row => row.attempt?.controllerVersion), 'healthy continuation scope is missing.');
  let effective = snapshot;
  if (snapshot.judgeValidation) {
    requireEvidence(hash(JSON.stringify(snapshot.judgeValidation)) === snapshot.judgeValidationSha256, 'offline judge validation hash changed.');
    validateCompactJudgeRevalidation(snapshot, snapshot.judgeValidation);
    const validated = new Map(snapshot.judgeValidation.records.map(record => [record.judgmentId, record]));
    effective = { ...snapshot, judgments: snapshot.judgments.map(judge => {
      const record = validated.get(judge.id);
      if (!record) return judge;
      return { ...judge, status: 'succeeded', assessmentA: record.assessment.assessmentA, assessmentB: record.assessment.assessmentB, preference: record.assessment.preference,
        offlineValidation: { version: snapshot.judgeValidation.version, sha256: snapshot.judgeValidationSha256,
          originalRecordSha256: record.originalRecordSha256, rawStdoutSha256: record.rawStdoutSha256,
          startupDiagnosticCount: record.assessment.validationReceipt.startupDiagnosticCount, toolCallCount: 0, additionalInferenceCalls: 0 } };
    }) };
  } else requireEvidence(!snapshot.judgeValidationSha256, 'offline judge validation is missing.');
  return WRITING_COMPACT_BENCHMARKS.map(registry => projectGroup(effective, registry, sourceSha256));
}

export function validateWritingCompactPublication(projection, responseBundle) {
  const registry = WRITING_COMPACT_BENCHMARKS.find(group => group.id === projection?.benchmarks?.[0]?.id);
  requireEvidence(registry && projection.kind === 'vasirbenchmark-writing-projection' && projection.schemaVersion === 1 && projection.benchmarks.length === 1,
    'unsupported public compact projection.');
  requireEvidence(projection.publication?.adapter === 'writing-compact-v1' && projection.publication.scoreBasisIncluded === false && projection.scoreBasis.edition === registry.id && same(projection.scoreBasis.judges, PANEL), 'publication edition or panel changed.');
  const execution = projection.methodology?.execution;
  requireEvidence(execution?.hostAutomaticRetries === 0 && execution.creatorNetworkRetries === 0
    && execution.creatorOutputLimitRecoveryAttempts === 3 && execution.creatorOutputTokenLimitPerSegment === 8192
    && execution.creatorWholeSessionTokenCap === null && execution.deliveryMode === 'frozen-inline-once'
    && !Object.hasOwn(execution, 'automaticRetries'), 'creator recovery limits must not be described as zero whole-session retries.');
  requireEvidence((projection.methodology.healthyContinuation?.sha256 ?? null) === projection.scoreBasis.healthyContinuationSha256,
    'healthy continuation method provenance changed.');
  requireEvidence(projection.scoreBasis.ratingMinimum === 0 && projection.scoreBasis.ratingMaximum === 5 && projection.scoreBasis.judgeCount === 2
    && projection.scoreBasis.trialsPerTask === 1 && projection.scoreBasis.taskCount === registry.caseCount
    && projection.scoreBasis.method === 'complete-paired-equal-task-two-judge-mean-v1'
    && same(projection.scoreBasis.range, { minimum: 0, maximum: 100 })
    && same(projection.scoreBasis.weights, Object.fromEntries(dimensions.map(dimension => [dimension.id, 25])))
    && same(projection.conditions, CONDITIONS), 'compact scoring contract changed.');
  const expectedConfigurations = ['claude-fable-5-1', 'claude-opus-5'].flatMap(model => ['low', 'medium', 'max'].map(effort => `claude:${model}@${effort}`));
  requireEvidence(same(projection.settings.map(setting => setting.configurationId).sort(), expectedConfigurations.sort()), 'compact settings changed.');
  requireEvidence(projection.cases.length === registry.caseCount && projection.cases.every(task => task.rubric.length === 4 && new Set(task.rubric.map(criterion => criterion.id)).size === 4) && same(projection.scoreBasis.dimensions, dimensions), 'task-specific four-criterion rubric changed.');
  const cells = projection.caseResults;
  requireEvidence(cells.length === 12 * registry.caseCount && new Set(cells.map(cellKey)).size === cells.length, 'public matrix changed.');
  requireEvidence(projection.entries.length === 12 && projection.benchmarkResults.length === 12
    && new Set(projection.entries.map(entry => `${entry.configurationId}:${entry.condition}`)).size === 12
    && new Set(projection.benchmarkResults.map(entry => `${entry.configurationId}:${entry.condition}`)).size === 12, 'group aggregate inventory changed.');
  for (const cell of cells) {
    requireEvidence(cell.benchmarkId === registry.id && projection.cases.some(task => task.id === cell.caseId) && projection.settings.some(setting => setting.id === cell.settingId && setting.configurationId === cell.configurationId) && ['baseline', 'skill'].includes(cell.condition) && cell.trialNumber === 1, 'cell identity changed.');
    const value = cell.coverage.completedJudgments === 2 ? 20 * mean(dimensions.map(dimension => cell.dimensions[dimension.id])) : null;
    requireEvidence(cell.exactScore === value && cell.score === round(value), 'answer score differs from four task ratings and two judges.');
  }
  for (const setting of projection.settings) {
    const members = cells.filter(cell => cell.settingId === setting.id), complete = members.every(cell => finite(cell.exactScore));
    const [provider, requested] = setting.configurationId.split(':'), [model, reasoning] = requested.split('@');
    const expectedIdentity = identity({ id: setting.configurationId, provider, model, reasoning });
    requireEvidence(Object.entries(expectedIdentity).every(([key, value]) => setting[key] === value), 'public model identity changed.');
    for (const condition of CONDITIONS) {
      const score = complete ? mean(members.filter(cell => cell.condition === condition.id).map(cell => cell.exactScore)) : null;
      const aggregate = projection.benchmarkResults.find(row => row.settingId === setting.id && row.condition === condition.id);
      const entry = projection.entries.find(row => row.settingId === setting.id && row.condition === condition.id);
      requireEvidence(aggregate?.exactScore === score && aggregate.score === round(score) && setting.scores[condition.id] === round(score) && entry?.exactScore === score && entry.score === round(score), 'group score mixes tasks, conditions, or incomplete pairs.');
      const rank = finite(score) ? 1 + projection.benchmarkResults.filter(row => row.condition === condition.id && finite(row.exactScore) && row.exactScore > score).length : null;
      requireEvidence(entry.rank === rank && entry.eligibleForRank === complete && entry.configurationId === setting.configurationId, 'rank changes exact ties or includes an incomplete group.');
    }
    const totals = CONDITIONS.map(condition => projection.benchmarkResults.find(row => row.settingId === setting.id && row.condition === condition.id).exactScore);
    requireEvidence(setting.deltas.skill === (complete ? round(totals[1] - totals[0]) : null), 'group uplift changed.');
    for (const entry of projection.entries.filter(entry => entry.settingId === setting.id)) requireEvidence(entry.baselineScore === setting.scores.baseline
      && entry.delta === (complete ? entry.condition === 'baseline' ? 0 : setting.deltas.skill : null), 'entry paired baseline or uplift changed.');
  }
  const completeSettings = projection.settings.filter(setting => cells.filter(cell => cell.settingId === setting.id).every(cell => finite(cell.exactScore)));
  const allPairs = summary(cells, projection.settings.map(setting => setting.configurationId), projection.cases.map(task => task.id));
  const expectedCoverage = { benchmarkCount: 1, caseCount: registry.caseCount, settingCount: 6, completedSettingCount: completeSettings.length,
    responseCount: cells.reduce((sum, cell) => sum + cell.coverage.completedResponses, 0), expectedResponseCount: cells.length,
    scoredResponseCount: cells.filter(cell => finite(cell.exactScore)).length, usablePairs: allPairs.usablePairs, expectedPairs: cells.length / 2,
    judgmentCount: cells.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0), expectedJudgmentCount: cells.length * 2,
    pairedJudgeCallCount: cells.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0) / 2, expectedPairedJudgeCallCount: cells.length };
  requireEvidence(same(projection.coverage, expectedCoverage), 'planned, completed, paired-call, or assessment coverage changed.');
  const expectedSummary = summary(cells, completeSettings.map(setting => setting.configurationId), projection.cases.map(task => task.id));
  requireEvidence(Object.entries(expectedSummary).every(([key, value]) => projection.benchmarkSummaries[0][key] === value && projection.benchmarks[0].measured[key] === value), 'benchmark summary differs from the same complete paired configurations.');
  if (responseBundle) {
    requireEvidence(responseBundle.responses.length === cells.length && new Set(responseBundle.responses.map(cellKey)).size === cells.length, 'response inventory changed.');
    requireEvidence(responseBundle.promptFiles.every(file => hash(file.content) === file.sha256) && responseBundle.messageSets.every(set => hash(JSON.stringify(set.messages)) === set.id), 'frozen public inputs changed.');
    for (const response of responseBundle.responses) {
      const cell = cells.find(cell => cellKey(cell) === cellKey(response)), task = projection.cases.find(task => task.id === response.caseId);
      requireEvidence(cell && response.score === cell.score && response.wordCount === (response.outputText ? words(response.outputText) : null) && response.provenance.outputSha256 === (response.outputText ? hash(response.outputText) : null), 'answer bytes, score or word count changed.');
      requireEvidence(!['error', 'pending'].includes(response.status) || response.outputText === '', 'provider diagnostics are not completed answers.');
      const messageSet = responseBundle.messageSets.find(set => set.id === response.messageSetId);
      const instruction = responseBundle.promptFiles.find(file => file.id === `compact-skill-${task.id}`);
      requireEvidence(response.benchmarkId === registry.id && response.settingId === cell.settingId && response.trialNumber === 1
        && response.characterCount === (response.outputText ? Array.from(response.outputText).length : null)
        && response.provenance.sourceSha256 === projection.scoreBasis.sourceSha256 && response.provenance.questionSha256 === hash(task.prompt)
        && response.provenance.manifestSha256 === projection.scoreBasis.manifestSha256 && response.provenance.amendmentSha256 === projection.scoreBasis.amendmentSha256
        && response.provenance.judgeValidationSha256 === projection.scoreBasis.judgeValidationSha256
        && response.provenance.healthyContinuationSha256 === projection.scoreBasis.healthyContinuationSha256
        && response.provenance.skillSha256 === (response.condition === 'skill' ? instruction?.sha256 : null)
        && messageSet?.messages.length === (response.condition === 'skill' ? 2 : 1)
        && same(messageSet.messages.at(-1), { role: 'user', content: task.prompt })
        && (response.condition !== 'skill' || messageSet.messages[0].role === 'system' && messageSet.messages[0].fileId === instruction?.id), 'public input or answer identity changed.');
      if (response.provenance.controllerVersion) {
        const continuation = projection.methodology.healthyContinuation;
        requireEvidence(continuation && response.provenance.controllerVersion === continuation.version
          && response.provenance.controllerScopeSha256 === continuation.sha256 && continuation.sha256 === projection.scoreBasis.healthyContinuationSha256
          && continuation.configurationIds.includes(response.configurationId) && continuation.generationIds.includes(response.provenance.generationId), 'healthy continuation attempt provenance changed.');
      } else requireEvidence(response.provenance.controllerScopeSha256 === null, 'unexpected continuation scope on an original controller attempt.');
      requireEvidence(response.wordLimitExceeded === (response.outputText ? words(response.outputText) > task.wordLimit : null) && response.judgments.length === cell.coverage.completedJudgments && new Set(response.judgments.map(judge => judge.judgeConfigurationId)).size === response.judgments.length, 'word limit or judge coverage changed.');
      for (const judge of response.judgments) {
        requireEvidence(PANEL.includes(judge.judgeConfigurationId), 'judge identity changed.');
        const ratings = dimensions.map((dimension, index) => {
          const rating = judge.dimensions[dimension.id];
          requireEvidence(rating?.criterionId === task.rubric[index].id && Number.isInteger(rating.rating) && rating.rating >= 0 && rating.rating <= 5, 'task criterion or integer 0–5 rating changed.');
          return rating.rating;
        });
        requireEvidence(judge.score === 20 * mean(ratings), 'judge total differs from original ratings.');
        const request = responseBundle.judgeRequests.find(request => request.id === judge.requestId);
        requireEvidence(request && request.judgeConfigurationId === judge.judgeConfigurationId && request.candidateMap[judge.candidateId] === response.condition && request.candidateResponseHashes[judge.candidateId] === response.provenance.outputSha256 && request.outputSha256 === judge.answerSha256 && hash(request.outputText) === request.outputSha256 && hash(request.promptText) === request.promptSha256, 'original paired review no longer binds this answer.');
        requireEvidence(same(judge.validation, request.validation), 'response and original review disagree on offline validation.');
        const parsed = JSON.parse(request.outputText), assessment = judge.candidateId === 'A' ? parsed.assessmentA : parsed.assessmentB;
        requireEvidence(assessment && task.rubric.every((criterion, index) => {
          const original = assessment.ratings.find(rating => rating.criterionId === criterion.id), rating = judge.dimensions[dimensions[index].id];
          return original && original.score === rating.rating && original.evidence === rating.evidence && original.reason === rating.reason;
        }), 'public review differs from its original judge JSON.');
      }
      requireEvidence(cell.exactScore === (response.judgments.length === 2 ? mean(response.judgments.map(judge => judge.score)) : null), 'public score differs from the paired original judge totals.');
      requireEvidence(dimensions.every(dimension => cell.dimensions[dimension.id] === (response.judgments.length === 2 ? mean(response.judgments.map(judge => judge.dimensions[dimension.id].rating)) : null)), 'public dimensions differ from their original task ratings.');
    }
    requireEvidence(responseBundle.judgeRequests.length === new Set(responseBundle.judgeRequests.map(request => request.id)).size
      && responseBundle.judgeRequests.length === projection.coverage.pairedJudgeCallCount
      && projection.coverage.judgmentCount === responseBundle.responses.reduce((sum, response) => sum + response.judgments.length, 0), 'paired calls or answer assessment counts changed.');
    const failures = responseBundle.failedJudgeAttempts ?? [];
    requireEvidence(new Set(failures.map(attempt => `${attempt.requestId}:${attempt.attemptNumber}`)).size === failures.length, 'failed judge attempt inventory is duplicated.');
    for (const attempt of failures) requireEvidence(attempt.status === 'failed' && PANEL.includes(attempt.judgeConfigurationId)
      && hash(attempt.promptText) === attempt.promptSha256 && hash(attempt.outputText) === attempt.outputSha256
      && /^[a-f0-9]{64}$/.test(attempt.sourceAttemptSha256), 'failed judge attempt bytes changed.');
    for (const request of responseBundle.judgeRequests.filter(request => request.priorAttemptSha256)) requireEvidence(request.attemptNumber === 2
      && projection.methodology.operationalAmendment?.sha256 === projection.scoreBasis.amendmentSha256
      && failures.some(attempt => attempt.requestId === request.id && attempt.attemptNumber === 1 && attempt.sourceAttemptSha256 === request.priorAttemptSha256), 'amended review lost its original failed attempt.');
    for (const request of responseBundle.judgeRequests.filter(request => request.validation)) requireEvidence(request.originalStatus === 'failed'
      && request.validation.sha256 === projection.scoreBasis.judgeValidationSha256 && request.validation.additionalInferenceCalls === 0
      && request.validation.toolCallCount === 0 && request.validation.startupDiagnosticCount === 1
      && projection.methodology.judgeValidation?.sha256 === request.validation.sha256
      && projection.methodology.judgeValidation.records.some(record => record.judgmentId === request.id && record.originalRecordSha256 === request.originalRecordSha256
        && record.originalRecordSha256 === request.validation.originalRecordSha256 && record.outputSha256 === request.outputSha256 && record.promptSha256 === request.promptSha256), 'offline validation lost its original review provenance.');
    requireEvidence(!/\/Users\/|file:\/\/|"(?:threadId|sessionId|session_id|cliArguments|stdout|stderr)"/u.test(JSON.stringify(responseBundle)), 'private runtime details leaked into public response metadata.');
  }
  requireEvidence(!/\/Users\/|file:\/\/|"(?:threadId|sessionId|session_id|cliArguments|stdout|stderr)"/u.test(JSON.stringify(projection)), 'private runtime details leaked into public metadata.');
  return projection;
}

export function buildWritingCompactPublications({ repoRootDirectory, readFileSyncImplementation = fs.readFileSync }) {
  let selectionText;
  try { selectionText = readFileSyncImplementation(path.join(repoRootDirectory, WRITING_COMPACT_SELECTION_PATH), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const selection = JSON.parse(selectionText), pin = selection.snapshot;
  requireEvidence(selection.kind === 'vasirbenchmark-writing-compact-source' && selection.schemaVersion === 1 && /^[a-f0-9]{64}$/.test(pin?.sha256 ?? ''), 'invalid compact source selection.');
  requireEvidence(typeof pin.path === 'string' && !path.isAbsolute(pin.path) && !pin.path.includes('\\') && pin.path.split('/').every(part => part && part !== '..' && part !== '.'), 'unsafe compact source path.');
  const snapshotText = readFileSyncImplementation(path.join(repoRootDirectory, pin.path), 'utf8');
  requireEvidence(hash(snapshotText) === pin.sha256, 'selected immutable compact source changed.');
  return projectWritingCompactRun({ snapshot: JSON.parse(snapshotText), sourceSha256: pin.sha256 }).filter(item => item.projection.coverage.completedSettingCount > 0);
}

/** Acceptance binds every displayed compact report and original review to the
 * current immutable selection; the four legacy lineage checks remain separate. */
export function verifyWritingCompactSourceSelection({ repoRootDirectory, collection, responseBundle }) {
  // A development selection is retained evidence, not permission to publish.
  // The current release catalog is validated by the collection publisher. Do
  // not reopen withdrawn experiments while accepting that explicit release.
  if (collection?.publicRelease?.id === WRITING_ACTIVE_RELEASE.id
    && collection.publicRelease.lifecycle === WRITING_ACTIVE_RELEASE.lifecycle) {
    requireEvidence(same(collection.catalog?.map(item => item.id), WRITING_ACTIVE_RELEASE.benchmarks.map(item => item.id)),
      'published Writing catalog differs from its declared release.');
    requireEvidence(!Object.keys(collection.compactBenchmarks ?? {}).length
      && !Object.keys(responseBundle?.compactBenchmarks ?? {}).length,
    'development evidence was included in the published Writing release.');
    return null;
  }
  const selected = buildWritingCompactPublications({ repoRootDirectory });
  const ids = selected.map(item => item.stub.benchmarkId);
  requireEvidence(same(ids, Object.keys(collection?.compactBenchmarks ?? {}))
    && same(ids, Object.keys(responseBundle?.compactBenchmarks ?? {})), 'candidate compact source inventory differs from the selected evidence.');
  for (const item of selected) {
    const id = item.stub.benchmarkId;
    requireEvidence(same(JSON.parse(JSON.stringify(item.projection)), collection.compactBenchmarks[id])
      && same(JSON.parse(JSON.stringify(item.responseBundle)), responseBundle.compactBenchmarks[id]), 'candidate compact report or original-review archive differs from its immutable source.');
  }
  if (!selected.length) return null;
  const selectionText = fs.readFileSync(path.join(repoRootDirectory, WRITING_COMPACT_SELECTION_PATH), 'utf8');
  const selection = JSON.parse(selectionText), snapshotText = fs.readFileSync(path.join(repoRootDirectory, selection.snapshot.path), 'utf8');
  requireEvidence(hash(snapshotText) === selection.snapshot.sha256, 'compact source changed during acceptance.');
  const snapshot = JSON.parse(snapshotText);
  requireEvidence(selected.every(item => item.projection.scoreBasis.sourceSha256 === selection.snapshot.sha256), 'compact selection changed during acceptance.');
  return { kind: 'vasirbenchmark-compact-writing-source-verification', benchmarkIds: ids,
    selection: { path: WRITING_COMPACT_SELECTION_PATH, bytes: Buffer.byteLength(selectionText), sha256: hash(selectionText) },
    snapshot: { ...selection.snapshot, bytes: Buffer.byteLength(snapshotText) }, manifestSha256: snapshot.manifestSha256,
    amendmentSha256: snapshot.amendmentSha256 ?? null, judgeValidationSha256: snapshot.judgeValidationSha256 ?? null,
    healthyContinuationSha256: snapshot.healthyContinuationSha256 ?? null };
}

/** Archive validated bytes; caller explicitly selects the returned pin. */
export function prepareWritingCompactPublicationSource({ repoRootDirectory, runDirectory }) {
  const runDirectoryPath = path.resolve(runDirectory);
  requireEvidence(!fs.existsSync(path.join(runDirectoryPath, 'dispatch.lock')), 'wait for the active run writer before archiving.');
  const snapshot = exportCompactRun({ runDirectoryPath });
  for (const source of snapshot.amendment?.sourceHashes ?? snapshot.manifest.sourceHashes) {
    const currentSource = path.join(fileURLToPath(new URL('../../', import.meta.url)), source.path);
    requireEvidence(hash(fs.readFileSync(currentSource)) === source.sha256, 'live runtime source changed before freezing the compact archive.');
  }
  if (fs.existsSync(path.join(runDirectoryPath, 'pending-low-medium-continuation.json'))) {
    const healthyContinuation = readCompactHealthyContinuation({ runDirectoryPath, snapshot });
    Object.assign(snapshot, { healthyContinuation, healthyContinuationSha256: hash(JSON.stringify(healthyContinuation)) });
  }
  const judgeValidation = readCompactJudgeRevalidation({ runDirectoryPath, snapshot });
  if (judgeValidation) Object.assign(snapshot, { judgeValidation, judgeValidationSha256: hash(JSON.stringify(judgeValidation)) });
  requireEvidence(!fs.existsSync(path.join(runDirectoryPath, 'dispatch.lock')), 'run writer started while archiving; wait and export again.');
  const snapshotText = JSON.stringify(snapshot, null, 2) + '\n', sourceSha256 = hash(snapshotText);
  projectWritingCompactRun({ snapshot, sourceSha256 });
  const relative = `.agents/vasir-evals/writing-compact-v1/publication-snapshots/${sourceSha256}/snapshot.json`;
  const target = path.join(path.resolve(repoRootDirectory), relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) requireEvidence(fs.readFileSync(target, 'utf8') === snapshotText, 'immutable compact snapshot already differs.');
  else fs.writeFileSync(target, snapshotText, { flag: 'wx' });
  return { kind: 'vasirbenchmark-writing-compact-source', schemaVersion: 1, snapshot: { path: relative, sha256: sourceSha256 } };
}
