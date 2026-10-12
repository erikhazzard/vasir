import crypto from "node:crypto";

import { VasirCliError } from "../cli-error.js";
import { BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF } from "../docs-ref.js";
import { buildOverallWritingSource } from './overall-writing-source.js';
export { buildOverallWritingSource } from './overall-writing-source.js';

const CONDITIONS = ["baseline", "skill"];
const ENGINEERING_EDITIONS = ['engineering-all-tasks-v1', 'engineering-available-pairs-v2'];
const IDENTITY_FIELDS = ["id", "configurationId", "modelId", "provider", "family", "reasoning", "label"];
const DECLARATION = Object.freeze({
  schemaVersion: 2,
  edition: "overall-v2",
  method: "priority-weighted-published-category-mean-v1",
  categoryWeighting: "declared-priority-normalized-over-published-v1",
  categories: [
    { id: "engineering", name: "Engineering", short: "ENG", targetWeight: 0.25 },
    { id: "games", name: "Games", short: "GAME", targetWeight: 0.25 },
    { id: "writing", name: "Writing", short: "WRITE", targetWeight: 0.125 },
    { id: "product-design", name: "Product Design", short: "DESIGN", targetWeight: 0.25 },
    { id: "ai-workflows", name: "AI Workflows", short: "AI", targetWeight: 0.125 }
  ],
  eligibility: "all-published-tasks-in-both-conditions-v1",
  treatment: "task-specific-skill-v1",
  resourceAggregation: "weighted-mean-over-the-same-task-cells-v2",
  sourceScoreFields: {
    "backend-architecture-panel-consensus-v2": "score",
    "work-spec-generation-v1": "exactScore"
  }
});

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
const equal = (left, right) => stable(left) === stable(right);
const clone = value => structuredClone(value);
const hash = value => crypto.createHash("sha256").update(stable(value)).digest("hex");
const round = value => value === null ? null : Math.round((value + Number.EPSILON) * 10) / 10;
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const weightedMean = (values, weights) => values.reduce((sum, value, index) => sum + value * weights[index], 0);
const cellKey = (configurationId, condition, benchmarkId) => `${configurationId}\u0000${condition}\u0000${benchmarkId}`;
function requireEvidence(condition, message) {
  if (!condition) throw new VasirCliError({
    code: "BENCHMARK_PUBLISH_PROJECTION_INVALID",
    message: `Overall publication: ${message}`,
    suggestion: "Regenerate Overall from the complete published family evidence; do not supply partial means or edit aggregate scores.",
    docsRef: BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF,
    context: { stage: "projection", safeRetry: true }
  });
}

function responseMetrics(cells, weights, allowMissing = false) {
  for (const cell of cells) {
    for (const metric of ["latencyMs", "inputTokens", "outputTokens", "totalTokens"]) {
      requireEvidence(allowMissing && cell[metric] === null || Number.isFinite(cell[metric]) && cell[metric] >= 0, `an eligible response lacks ${metric}.`);
    }
  }
  const reading = field => cells.every(cell => Number.isFinite(cell[field])) ? weightedMean(cells.map(cell => cell[field]), weights) : null;
  return {
    sampleCount: cells.length,
    meanLatencyMs: reading('latencyMs'),
    meanInputTokens: reading('inputTokens'),
    meanOutputTokens: reading('outputTokens'),
    meanTotalTokens: reading('totalTokens'),
    costUsd: null
  };
}

// This reconstruction consumes authoritative task cells, never family means,
// display-rounded workflow scores, or candidate-supplied Overall values.
function reconstructOverall({ engineering, aiWorkflows, writing }) {
  requireEvidence(engineering && aiWorkflows, 'both published family datasets are required.');
  const writingSource = writing ? writing.kind === 'vasirbenchmark-overall-writing-source' ? writing : buildOverallWritingSource(writing, { ...engineering, aiWorkflows }) : null;
  const expandedEngineering = ENGINEERING_EDITIONS.includes(engineering.scoreBasis?.edition);
  const availablePairs = engineering.scoreBasis?.edition === 'engineering-available-pairs-v2';
  const declaration = writingSource ? { ...DECLARATION, schemaVersion: availablePairs ? 5 : expandedEngineering ? 4 : 3, edition: availablePairs ? 'overall-v5' : expandedEngineering ? 'overall-v4' : 'overall-v3',
    resourceAggregation: 'weighted-mean-over-the-same-task-cells-null-propagating-v3',
    sourceScoreFields: { ...DECLARATION.sourceScoreFields, ...(expandedEngineering ? { [engineering.scoreBasis.edition]: 'exactScore' } : {}), 'writing-all-writing-v1': 'exactScore', 'writing-established-storytelling-v1': 'exactScore',
      ...(writingSource.scoreBasis.edition === 'writing-storytelling-paired-v2' ? { 'writing-storytelling-paired-v2': 'exactScore' } : {}) } }
    : expandedEngineering ? { ...DECLARATION, schemaVersion: availablePairs ? 5 : 4, edition: availablePairs ? 'overall-v5' : 'overall-v4',
      resourceAggregation: 'weighted-mean-over-the-same-task-cells-null-propagating-v3',
      sourceScoreFields: { ...DECLARATION.sourceScoreFields, [engineering.scoreBasis.edition]: 'exactScore' } } : DECLARATION;
  if (availablePairs) Object.assign(declaration, { eligibility: 'at-least-one-assessable-task-pair-v1', completeness: DECLARATION.eligibility,
    settingWeighting: 'renormalize-over-available-paired-tasks-and-categories-v1', method: 'priority-weighted-available-paired-category-mean-v2' });
  const sources = [engineering, writingSource, aiWorkflows].filter(Boolean);
  return reconstructPublication({ engineering, writingSource, sources, declaration, name: 'Overall', kind: 'vasirbenchmark-overall-projection', allowMissingMetrics: Boolean(writingSource) || expandedEngineering, availablePairs });
}

// Engineering and Overall share the same full-pair eligibility, exact-score
// ranking, coverage ledger, and resource accounting.
export function buildPublishedEngineeringAggregate(engineering) {
  const availablePairs = engineering.scoreBasis.edition === 'engineering-available-pairs-v2';
  const declaration = { ...DECLARATION, schemaVersion: availablePairs ? 2 : 1, edition: engineering.scoreBasis.edition,
    method: availablePairs ? 'equal-available-paired-engineering-task-mean-v2' : 'equal-published-engineering-task-mean-v1', categories: [{ id: 'engineering', name: 'Engineering', short: 'ENG', targetWeight: 1 }],
    resourceAggregation: 'weighted-mean-over-the-same-task-cells-null-propagating-v3',
    sourceScoreFields: { [engineering.scoreBasis.edition]: 'exactScore' },
    ...(availablePairs ? { eligibility: 'at-least-one-assessable-task-pair-v1', completeness: DECLARATION.eligibility,
      settingWeighting: 'renormalize-over-available-paired-tasks-and-categories-v1' } : {}) };
  return reconstructPublication({ engineering, writingSource: null, sources: [engineering], declaration, name: 'Engineering', kind: 'vasirbenchmark-engineering-projection', allowMissingMetrics: true, availablePairs });
}

function reconstructPublication({ engineering, writingSource, sources, declaration, name, kind, allowMissingMetrics, availablePairs = false }) {
  requireEvidence(sources.every(source => source && Array.isArray(source.settings) && Array.isArray(source.benchmarkResults)), "both published family datasets are required.");
  const taskById = new Map();
  const identities = new Map();
  const cellsByKey = new Map();
  const familyTasks = [];
  const sourceBases = [];

  for (const source of sources) {
    const family = source.families?.[0];
    const category = source.categories?.[0];
    const declaredCategory = declaration.categories.find(candidate => candidate.id === category?.id);
    const scoreField = declaration.sourceScoreFields[source.scoreBasis?.edition];
    requireEvidence(source.families?.length === 1 && source.categories?.length === 1 && family.id === category.id && declaredCategory && !familyTasks.some(candidate => candidate.familyId === family.id) && scoreField && Array.isArray(source.benchmarks) && source.benchmarks.length > 0, "a source family or score edition is unsupported.");
    requireEvidence(equal(source.benchmarks.map(benchmark => benchmark.id), source.scoreBasis.benchmarkIds), "a source score basis omits or reorders its published tasks.");
    const sourceSettings = new Map();
    for (const setting of source.coverage?.records ?? source.settings) {
      const identity = Object.fromEntries(IDENTITY_FIELDS.map(key => [key, setting[key]]));
      requireEvidence(IDENTITY_FIELDS.every(key => typeof identity[key] === "string" && identity[key]) && !sourceSettings.has(setting.configurationId), "source setting identity is missing or duplicated.");
      const prior = identities.get(setting.configurationId);
      requireEvidence(!prior || equal(prior, identity), "the same configuration has conflicting family identities.");
      sourceSettings.set(setting.configurationId, identity);
      identities.set(setting.configurationId, identity);
    }
    const benchmarkIds = source.benchmarks.map(benchmark => benchmark.id);
    for (const benchmark of source.benchmarks) {
      requireEvidence(!taskById.has(benchmark.id) && benchmark.familyId === family.id, "a published benchmark is duplicated or assigned to the wrong family.");
      taskById.set(benchmark.id, { familyId: family.id, scoreField,
        sourceScoreBasisId: ENGINEERING_EDITIONS.includes(source.scoreBasis.edition)
          ? source.scoreBasis.sources.find(item => item.benchmarkIds.includes(benchmark.id))?.id ?? source.scoreBasis.id : source.scoreBasis.id });
    }
    const withinWeights = family.id === 'writing' ? source.scoreBasis.benchmarkWeights : benchmarkIds.map(benchmarkId => ({ benchmarkId, weight: 1 / benchmarkIds.length }));
    requireEvidence(equal(withinWeights.map(item => item.benchmarkId), benchmarkIds) && withinWeights.every(item => Number.isFinite(item.weight) && item.weight > 0) && Math.abs(withinWeights.reduce((sum, item) => sum + item.weight, 0) - 1) < 1e-12, 'source within-category weights are invalid.');
    familyTasks.push({ familyId: family.id, category, benchmarkIds, withinWeights, targetWeight: declaredCategory.targetWeight });
    sourceBases.push({ familyId: family.id, id: source.scoreBasis.id, edition: source.scoreBasis.edition, scoreField, benchmarkIds, aggregation: source.scoreBasis.aggregation, batchUnit: source.scoreBasis.batchUnit,
      ...(ENGINEERING_EDITIONS.includes(source.scoreBasis.edition) ? { sources: clone(source.scoreBasis.sources) } : {}) });
    for (const cell of source.benchmarkResults) {
      const identity = sourceSettings.get(cell.configurationId);
      const key = cellKey(cell.configurationId, cell.condition, cell.benchmarkId);
      requireEvidence(identity && identity.id === cell.settingId && benchmarkIds.includes(cell.benchmarkId) && cell.category === family.id && CONDITIONS.includes(cell.condition) && (family.id === 'writing' || cell.trials === 1) && !cellsByKey.has(key), "source response identity, task, condition, or trial is invalid or duplicated.");
      const value = cell[scoreField];
      requireEvidence(value === null || Number.isFinite(value) && value >= 0 && value <= 100, "an authoritative source task score is absent or outside its range.");
      cellsByKey.set(key, { cell, value });
    }
  }
  requireEvidence(new Set([...identities.values()].map(identity => identity.id)).size === identities.size, "different configurations share the same public setting identity.");
  const benchmarkIds = [...taskById.keys()];
  const taskCount = benchmarkIds.length;
  // Normalize once over the published portfolio, never over an individual
  // configuration's available cells. Task count cannot change family priority.
  const publishedTargetWeight = familyTasks.reduce((sum, family) => sum + family.targetWeight, 0);
  const categoryWeights = familyTasks.map(family => ({ categoryId: family.familyId, targetWeight: family.targetWeight, weight: family.targetWeight / publishedTargetWeight, taskCount: family.benchmarkIds.length }));
  const categoryWeightById = new Map(categoryWeights.map(category => [category.categoryId, category]));
  const benchmarkWeights = benchmarkIds.map(benchmarkId => {
    const task = taskById.get(benchmarkId);
    const category = categoryWeightById.get(task.familyId);
    const family = familyTasks.find(item => item.familyId === task.familyId);
    return { benchmarkId, ...task, weight: family.familyId === 'writing' ? category.weight * family.withinWeights.find(item => item.benchmarkId === benchmarkId).weight : category.weight / category.taskCount };
  });
  const taskWeights = benchmarkWeights.map(task => task.weight);
  const categories = familyTasks.map(({ category, targetWeight }) => ({ ...clone(category), targetWeight, weight: categoryWeightById.get(category.id).weight }));
  const portfolioCategories = declaration.categories.map(category => {
    const family = familyTasks.find(candidate => candidate.familyId === category.id);
    return {
      ...clone(category),
      status: family ? "measured" : "coming-soon",
      weight: categoryWeightById.get(category.id)?.weight ?? 0,
      taskCount: family?.benchmarkIds.length ?? 0,
      benchmarkIds: family ? clone(family.benchmarkIds) : []
    };
  });
  const settings = [];
  const coverageRecords = [];

  for (const identity of [...identities.values()].sort((left, right) => left.configurationId.localeCompare(right.configurationId))) {
    const conditions = {};
    const sourceCells = {};
    for (const condition of CONDITIONS) {
      const values = benchmarkIds.map(benchmarkId => cellsByKey.get(cellKey(identity.configurationId, condition, benchmarkId)));
      sourceCells[condition] = values;
      conditions[condition] = {
        expectedTaskCount: taskCount,
        observedTaskCount: values.filter(Boolean).length,
        assessableTaskCount: values.filter(value => value && value.value !== null).length,
        missingTaskIds: benchmarkIds.filter((_, index) => !values[index]),
        unassessableTaskIds: benchmarkIds.filter((_, index) => values[index]?.value === null)
      };
    }
    const pairedBenchmarkIds = benchmarkIds.filter(benchmarkId => CONDITIONS.every(condition => {
      const reading = cellsByKey.get(cellKey(identity.configurationId, condition, benchmarkId));
      return reading && reading.value !== null;
    }));
    const complete = pairedBenchmarkIds.length === taskCount;
    const eligible = availablePairs ? pairedBenchmarkIds.length > 0 : complete;
    const selectedBenchmarkIds = availablePairs ? pairedBenchmarkIds : benchmarkIds;
    const selectedByFamily = new Map(familyTasks.map(family => [family.familyId, family.benchmarkIds.filter(id => selectedBenchmarkIds.includes(id))]));
    const selectedTargetWeight = familyTasks.filter(family => selectedByFamily.get(family.familyId).length).reduce((sum, family) => sum + family.targetWeight, 0);
    const settingCategoryWeights = familyTasks.filter(family => selectedByFamily.get(family.familyId).length).map(family => ({ categoryId: family.familyId,
      targetWeight: family.targetWeight, weight: family.targetWeight / selectedTargetWeight, taskCount: selectedByFamily.get(family.familyId).length }));
    const categoryWeight = familyId => settingCategoryWeights.find(category => category.categoryId === familyId)?.weight ?? 0;
    const selectedWithinWeights = family => {
      const selected = family.withinWeights.filter(task => selectedByFamily.get(family.familyId).includes(task.benchmarkId));
      const total = selected.reduce((sum, task) => sum + task.weight, 0);
      return selected.map(task => ({ ...task, weight: selected.length === family.benchmarkIds.length ? task.weight : task.weight / total }));
    };
    const settingBenchmarkWeights = benchmarkWeights.filter(task => selectedBenchmarkIds.includes(task.benchmarkId)).map(task => {
      const family = familyTasks.find(family => family.familyId === task.familyId);
      const within = selectedWithinWeights(family).find(candidate => candidate.benchmarkId === task.benchmarkId).weight;
      return { ...task, weight: categoryWeight(task.familyId) * within };
    });
    const settingCoverage = { complete, eligible, eligibleForRank: eligible, partial: eligible && !complete,
      completedTaskCount: pairedBenchmarkIds.length, expectedTaskCount: taskCount, availableBenchmarkIds: pairedBenchmarkIds,
      benchmarkWeights: settingBenchmarkWeights, categoryWeights: settingCategoryWeights };
    if (availablePairs) for (const condition of CONDITIONS) conditions[condition].completedTaskCount = pairedBenchmarkIds.length;
    const record = {
      ...identity,
      status: availablePairs ? complete ? 'complete' : eligible ? 'partial' : 'unavailable' : eligible ? "eligible" : "incomplete",
      eligible,
      ...(availablePairs ? settingCoverage : {}),
      conditions,
      scores: { baseline: null, skill: null },
      exactScores: { baseline: null, skill: null },
      ranks: { baseline: null, skill: null },
      deltas: { skill: null },
      exactDeltas: { skill: null },
      metrics: { baseline: null, skill: null }
    };
    coverageRecords.push(record);
    if (!eligible && !availablePairs) continue;

    const categoryScores = Object.fromEntries(CONDITIONS.map(condition => [condition, familyTasks.map(family => {
      const selectedIds = availablePairs ? selectedByFamily.get(family.familyId) : family.benchmarkIds;
      const values = selectedIds.map(benchmarkId => cellsByKey.get(cellKey(identity.configurationId, condition, benchmarkId)).value);
      const exactScore = values.length ? family.familyId === 'writing' ? weightedMean(values, (availablePairs ? selectedWithinWeights(family) : family.withinWeights).map(item => item.weight)) : mean(values) : null;
      const weight = availablePairs ? categoryWeight(family.familyId) : categoryWeightById.get(family.familyId).weight;
      return { category: family.familyId, score: round(exactScore), exactScore, weight, exactContribution: exactScore === null ? null : exactScore * weight,
        ...(availablePairs ? { available: values.length > 0, complete: values.length === family.benchmarkIds.length,
          completedTaskCount: values.length, expectedTaskCount: family.benchmarkIds.length } : {}) };
    })]));
    const exactScores = Object.fromEntries(CONDITIONS.map(condition => [condition, eligible ? categoryScores[condition].filter(category => category.exactScore !== null).reduce((sum, category) => sum + category.exactContribution, 0) : null]));
    const exactDelta = eligible ? exactScores.skill - exactScores.baseline : null;
    const selectedWeights = availablePairs ? settingBenchmarkWeights.map(task => task.weight) : taskWeights;
    const metrics = Object.fromEntries(CONDITIONS.map(condition => [condition, eligible ? responseMetrics(
      availablePairs ? selectedBenchmarkIds.map(benchmarkId => cellsByKey.get(cellKey(identity.configurationId, condition, benchmarkId)).cell) : sourceCells[condition].map(value => value.cell),
      selectedWeights, allowMissingMetrics) : null]));
    const setting = {
      ...identity,
      ...(availablePairs ? settingCoverage : {}),
      scores: { baseline: round(exactScores.baseline), skill: round(exactScores.skill) },
      exactScores,
      deltas: { skill: round(exactDelta) },
      exactDeltas: { skill: exactDelta },
      categories: categoryScores,
      metrics
    };
    Object.assign(record, { scores: clone(setting.scores), exactScores: clone(exactScores), deltas: clone(setting.deltas), exactDeltas: clone(setting.exactDeltas), metrics: clone(metrics) });
    settings.push(setting);
  }
  settings.sort((left, right) => (right.exactScores.skill ?? -Infinity) - (left.exactScores.skill ?? -Infinity) || (right.exactScores.baseline ?? -Infinity) - (left.exactScores.baseline ?? -Infinity) || left.configurationId.localeCompare(right.configurationId));
  const conditions = clone(engineering.conditions).map(condition => condition.id === "skill"
    ? { ...condition, sourceId: "task-specific-skill", short: name === 'Engineering' ? 'Skill' : "Task skill", label: "Task-specific skill" }
    : condition);
  const entries = settings.flatMap(setting => conditions.map(condition => {
    const metrics = setting.metrics[condition.id];
    return {
      id: `${setting.id}-${condition.id}`,
      settingId: setting.id,
      ...Object.fromEntries(IDENTITY_FIELDS.filter(key => key !== "id").map(key => [key, setting[key]])),
      condition: condition.id,
      conditionLabel: condition.label,
      ...(availablePairs ? Object.fromEntries(['complete', 'eligible', 'eligibleForRank', 'partial', 'completedTaskCount', 'expectedTaskCount', 'availableBenchmarkIds', 'benchmarkWeights', 'categoryWeights'].map(field => [field, clone(setting[field])])) : {}),
      score: setting.scores[condition.id],
      exactScore: setting.exactScores[condition.id],
      baselineScore: setting.scores.baseline,
      exactBaselineScore: setting.exactScores.baseline,
      delta: availablePairs && !setting.eligibleForRank ? null : condition.id === "baseline" ? 0 : setting.deltas.skill,
      exactDelta: availablePairs && !setting.eligibleForRank ? null : condition.id === "baseline" ? 0 : setting.exactDeltas.skill,
      categories: clone(setting.categories[condition.id]),
      baselineCategories: clone(setting.categories.baseline),
      metrics: clone(metrics),
      cost: null,
      latency: metrics?.meanLatencyMs === null || !metrics ? null : metrics.meanLatencyMs / 1000,
      tokens: metrics?.meanOutputTokens ?? null,
      rank: null
    };
  }));
  const coverageById = new Map(coverageRecords.map(record => [record.configurationId, record]));
  for (const condition of CONDITIONS) {
    const ranked = entries.filter(entry => entry.condition === condition && Number.isFinite(entry.exactScore)).sort((left, right) => right.exactScore - left.exactScore || left.configurationId.localeCompare(right.configurationId));
    ranked.forEach((entry, index) => {
      entry.rank = index > 0 && entry.exactScore === ranked[index - 1].exactScore ? ranked[index - 1].rank : index + 1;
      coverageById.get(entry.configurationId).ranks[condition] = entry.rank;
    });
  }
  const benchmarks = sources.flatMap(source => clone(source.benchmarks));
  const sourceCells = sources.flatMap(source => clone(source.benchmarkResults));
  const totalSettings = identities.size;
  const eligibleSettings = availablePairs ? coverageRecords.filter(record => record.eligibleForRank).length : settings.length;
  const completeSettings = availablePairs ? coverageRecords.filter(record => record.complete).length : eligibleSettings;
  const coverage = {
    totalSettings,
    eligibleSettings,
    incompleteSettings: totalSettings - completeSettings,
    observedResponseCount: sourceCells.length,
    expectedResponseCount: totalSettings * taskCount * CONDITIONS.length,
    eligibleResponseCount: availablePairs ? coverageRecords.reduce((sum, record) => sum + record.completedTaskCount * CONDITIONS.length, 0) : eligibleSettings * taskCount * CONDITIONS.length,
    ...(availablePairs ? { completeSettings, rankedSettings: eligibleSettings, unrankedSettings: totalSettings - eligibleSettings } : {}),
    records: coverageRecords
  };
  const declarationSha256 = hash(declaration);
  const scoreBasis = {
    id: `${declaration.edition}:${hash({ declaration, sourceBases, benchmarkWeights })}`,
    label: name === 'Engineering' ? availablePairs ? 'Engineering · available paired results' : 'Engineering · all tasks' : `Overall v${declaration.schemaVersion}`,
    edition: declaration.edition,
    declarationVersion: declaration.schemaVersion,
    declarationSha256,
    method: declaration.method,
    unit: "rubric-points",
    range: { minimum: 0, maximum: 100 },
    benchmarkWeighting: writingSource ? 'declared-within-category' : "equal-within-category",
    categoryWeighting: declaration.categoryWeighting,
    categoryWeights,
    publishedTargetWeight,
    portfolioCategoryCount: portfolioCategories.length,
    benchmarkIds,
    benchmarkWeights,
    taskCount,
    trialsPerTask: writingSource ? null : 1,
    judgeCount: new Set(sources.flatMap(source => source.scoreBasis.judges)).size,
    judges: [...new Set(sources.flatMap(source => source.scoreBasis.judges))],
    aggregation: availablePairs ? name === 'Engineering' ? 'equal-mean-of-authoritative-available-task-pairs-v2' : 'weighted-available-category-means-of-authoritative-paired-task-scores-v5'
      : name === 'Engineering' ? 'equal-mean-of-authoritative-final-task-scores-v1' : writingSource ? 'weighted-category-means-of-authoritative-final-task-scores-v3' : "weighted-category-means-of-authoritative-final-task-scores-v2",
    batchUnit: "task-specific",
    effectMethod: "paired-absolute-delta-v1",
    effectUnit: "rubric-points",
    treatment: "Task-specific skill",
    sourceBases,
    ...(name === 'Engineering' ? { sources: clone(engineering.scoreBasis.sources) } : {}),
    eligibility: declaration.eligibility,
    ...(availablePairs ? { completeness: declaration.completeness, settingWeighting: declaration.settingWeighting,
      pairSelection: 'same-assessable-task-pairs-for-both-conditions-v1' } : {}),
    resourceAggregation: declaration.resourceAggregation,
    ...(writingSource ? { provisional: writingSource.scoreBasis.provisional, writingSources: clone(writingSource.scoreBasis.sources) } : {}),
    calibrationStatus: "development-uncalibrated",
    uncertainty: { status: "not-estimated", reason: writingSource
      ? `The published task rubrics and judge panels are uncalibrated; trial counts vary by source benchmark. ${name} inherits selected provisional bases and is a development aggregate with declared category priorities, without a confidence interval or broader capability claim.`
      : `The published task rubrics are uncalibrated and have one trial per condition. ${name} is a development aggregate with declared category priorities, without a confidence interval or broader capability claim.` }
  };
  const availability = {
    status: "development", verification: "unverified", code: "development-unverified-results",
    message: "Development results — not verified benchmark claims.",
    detail: availablePairs
      ? `${name === 'Engineering' ? 'Engineering averages the available paired task scores equally' : 'Overall averages available paired task scores within each category, then renormalizes the declared category priorities across available categories'}. Both conditions use the same tasks and weights. Missing results are excluded, never scored as zero or imputed. Settings with at least one assessable pair are ranked; task coverage differs and is reported separately from completeness. Task-specific skills differ by benchmark; human calibration remains pending.${writingSource?.scoreBasis.provisional ? ' The aggregate inherits provisional status from its selected Writing score bases.' : ''}`
      : `${name === 'Engineering' ? 'Engineering gives every published Engineering task equal weight' : `Overall weights category means by declared priorities normalized across published categories, with ${writingSource ? 'equal task weights within Engineering and AI Workflows; Writing uses equal tracks and equal benchmarks within each track' : 'equal task weights within each category'}`}. It ranks only settings with complete assessable results in both conditions. Task-specific skills differ by benchmark; human calibration remains pending.${writingSource?.scoreBasis.provisional ? ' The aggregate inherits provisional status from its selected Writing score bases.' : ''}`,
    blockers: [{ code: "author-calibration-pending", message: "Human calibration and broader task validation remain pending." }]
  };
  const skillEntries = entries.filter(entry => entry.condition === "skill" && Number.isFinite(entry.exactScore));
  const topScore = skillEntries.length ? Math.max(...skillEntries.map(entry => entry.exactScore)) : null;
  const leaders = skillEntries.filter(entry => entry.exactScore === topScore);
  const categoryLeaders = categories.flatMap(category => {
    const candidates = skillEntries.filter(entry => Number.isFinite(entry.categories.find(value => value.category === category.id)?.exactScore));
    const top = candidates.length ? Math.max(...candidates.map(entry => entry.categories.find(value => value.category === category.id).exactScore)) : null;
    return candidates.filter(entry => entry.categories.find(value => value.category === category.id).exactScore === top).map(entry => ({ category: category.id, entry: { ...clone(entry), categoryScore: entry.categories.find(value => value.category === category.id).score } }));
  });
  return {
    kind, schemaVersion: 1,
    program: clone(engineering.program),
    meta: { ...clone(engineering.meta), categories: categories.length, benchmarks: taskCount, settings: settings.length, aggregateCells: coverage.eligibleResponseCount, runs: taskCount },
    scoreBasis,
    conditions,
    categories,
    portfolioCategories,
    families: sources.flatMap(source => clone(source.families)),
    tracks: sources.flatMap(source => clone(source.tracks)),
    benchmarks,
    results: sources.flatMap(source => clone(source.results)),
    settings,
    entries,
    benchmarkResults: sourceCells,
    benchmarkSummaries: sources.flatMap(source => clone(source.benchmarkSummaries)),
    ...(writingSource ? { benchmarkDisplays: clone(writingSource.benchmarkDisplays) } : {}),
    categoryLeaders,
    efficientFrontier: [],
    regressions: skillEntries.filter(entry => entry.exactDelta < 0).map(clone),
    callouts: {
      overall: leaders.length ? `${leaders.map(entry => entry.label).join(", ")} ${leaders.length === 1 ? "leads" : "share the lead"} ${name} at ${round(topScore).toFixed(1)} development rubric points.` : availablePairs ? 'No setting has an assessable task pair.' : "No setting has complete assessable results across all published tasks in both conditions.",
      value: "Resource averages use the same task cells and weights as each score; provider cost comparison remains withheld.",
      regression: `${skillEntries.filter(entry => entry.exactDelta < 0).length} of ${eligibleSettings} eligible settings score lower with their task-specific skills.`,
      category: `${taskCount} benchmarks across ${categories.length} of ${portfolioCategories.length} planned categories cover ${publishedTargetWeight * 100}% of target weight. ${availablePairs ? 'Each setting normalizes weights over its available task pairs and categories' : 'Published category weights are normalized'}; source benchmark summaries retain their complete published cohorts.`
    },
    availability,
    coverage,
    counts: { families: sources.length, tracks: sources.reduce((sum, source) => sum + source.tracks.length, 0), benchmarks: taskCount, categories: categories.length, conditions: CONDITIONS.length, settings: settings.length, resultEntries: entries.length, responses: sourceCells.length, developmentResultSets: taskCount, eligibleResultSets: 0, withheldResultSets: 0 }
  };
}

export function buildOverallPublication(sources) {
  return reconstructOverall(sources);
}

export function validateOverallPublication(overall, sources) {
  // Rebuild from the two separately validated families. No displayed Overall
  // field participates in its own validation or can repair missing evidence.
  const expected = reconstructOverall(sources);
  requireEvidence(equal(overall, expected), "aggregate scores, weights, coverage, identity, resources, or source collections differ from independent source reconstruction.");
  return overall;
}
