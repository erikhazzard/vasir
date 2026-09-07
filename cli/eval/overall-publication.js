import crypto from "node:crypto";

import { VasirCliError } from "../cli-error.js";
import { BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF } from "../docs-ref.js";

const CONDITIONS = ["baseline", "skill"];
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

function responseMetrics(cells, weights) {
  for (const cell of cells) {
    for (const metric of ["latencyMs", "inputTokens", "outputTokens", "totalTokens"]) {
      requireEvidence(Number.isFinite(cell[metric]) && cell[metric] >= 0, `an eligible response lacks ${metric}.`);
    }
  }
  return {
    sampleCount: cells.length,
    meanLatencyMs: weightedMean(cells.map(cell => cell.latencyMs), weights),
    meanInputTokens: weightedMean(cells.map(cell => cell.inputTokens), weights),
    meanOutputTokens: weightedMean(cells.map(cell => cell.outputTokens), weights),
    meanTotalTokens: weightedMean(cells.map(cell => cell.totalTokens), weights),
    costUsd: null
  };
}

// This reconstruction consumes authoritative task cells, never family means,
// display-rounded workflow scores, or candidate-supplied Overall values.
function reconstructOverall({ engineering, aiWorkflows }) {
  const sources = [engineering, aiWorkflows];
  requireEvidence(sources.every(source => source && Array.isArray(source.settings) && Array.isArray(source.benchmarkResults)), "both published family datasets are required.");
  const taskById = new Map();
  const identities = new Map();
  const cellsByKey = new Map();
  const familyTasks = [];
  const sourceBases = [];

  for (const source of sources) {
    const family = source.families?.[0];
    const category = source.categories?.[0];
    const declaredCategory = DECLARATION.categories.find(candidate => candidate.id === category?.id);
    const scoreField = DECLARATION.sourceScoreFields[source.scoreBasis?.edition];
    requireEvidence(source.families?.length === 1 && source.categories?.length === 1 && family.id === category.id && declaredCategory && !familyTasks.some(candidate => candidate.familyId === family.id) && scoreField && Array.isArray(source.benchmarks) && source.benchmarks.length > 0, "a source family or score edition is unsupported.");
    requireEvidence(equal(source.benchmarks.map(benchmark => benchmark.id), source.scoreBasis.benchmarkIds), "a source score basis omits or reorders its published tasks.");
    const sourceSettings = new Map();
    for (const setting of source.settings) {
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
      taskById.set(benchmark.id, { familyId: family.id, scoreField, sourceScoreBasisId: source.scoreBasis.id });
    }
    familyTasks.push({ familyId: family.id, category, benchmarkIds, targetWeight: declaredCategory.targetWeight });
    sourceBases.push({ familyId: family.id, id: source.scoreBasis.id, edition: source.scoreBasis.edition, scoreField, benchmarkIds, aggregation: source.scoreBasis.aggregation, batchUnit: source.scoreBasis.batchUnit });
    for (const cell of source.benchmarkResults) {
      const identity = sourceSettings.get(cell.configurationId);
      const key = cellKey(cell.configurationId, cell.condition, cell.benchmarkId);
      requireEvidence(identity && identity.id === cell.settingId && benchmarkIds.includes(cell.benchmarkId) && cell.category === family.id && CONDITIONS.includes(cell.condition) && cell.trials === 1 && !cellsByKey.has(key), "source response identity, task, condition, or trial is invalid or duplicated.");
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
    return { benchmarkId, ...task, weight: category.weight / category.taskCount };
  });
  const taskWeights = benchmarkWeights.map(task => task.weight);
  const categories = familyTasks.map(({ category, targetWeight }) => ({ ...clone(category), targetWeight, weight: categoryWeightById.get(category.id).weight }));
  const portfolioCategories = DECLARATION.categories.map(category => {
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
    // A setting enters neither ranked condition until both complete value paths
    // exist. An absent fourth task can never become a zero or a three-task mean.
    const eligible = CONDITIONS.every(condition => conditions[condition].assessableTaskCount === taskCount);
    const record = {
      ...identity,
      status: eligible ? "eligible" : "incomplete",
      eligible,
      conditions,
      scores: { baseline: null, skill: null },
      exactScores: { baseline: null, skill: null },
      ranks: { baseline: null, skill: null },
      deltas: { skill: null },
      exactDeltas: { skill: null },
      metrics: { baseline: null, skill: null }
    };
    coverageRecords.push(record);
    if (!eligible) continue;

    const categoryScores = Object.fromEntries(CONDITIONS.map(condition => [condition, familyTasks.map(family => {
      const values = family.benchmarkIds.map(benchmarkId => cellsByKey.get(cellKey(identity.configurationId, condition, benchmarkId)).value);
      const exactScore = mean(values);
      const weight = categoryWeightById.get(family.familyId).weight;
      return { category: family.familyId, score: round(exactScore), exactScore, weight, exactContribution: exactScore * weight };
    })]));
    const exactScores = Object.fromEntries(CONDITIONS.map(condition => [condition, categoryScores[condition].reduce((sum, category) => sum + category.exactContribution, 0)]));
    const exactDelta = exactScores.skill - exactScores.baseline;
    const metrics = Object.fromEntries(CONDITIONS.map(condition => [condition, responseMetrics(sourceCells[condition].map(value => value.cell), taskWeights)]));
    const setting = {
      ...identity,
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
  settings.sort((left, right) => right.exactScores.skill - left.exactScores.skill || right.exactScores.baseline - left.exactScores.baseline || left.configurationId.localeCompare(right.configurationId));
  const conditions = clone(engineering.conditions).map(condition => condition.id === "skill"
    ? { ...condition, sourceId: "task-specific-skill", short: "Task skill", label: "Task-specific skill" }
    : condition);
  const entries = settings.flatMap(setting => conditions.map(condition => {
    const metrics = setting.metrics[condition.id];
    return {
      id: `${setting.id}-${condition.id}`,
      settingId: setting.id,
      ...Object.fromEntries(IDENTITY_FIELDS.filter(key => key !== "id").map(key => [key, setting[key]])),
      condition: condition.id,
      conditionLabel: condition.label,
      score: setting.scores[condition.id],
      exactScore: setting.exactScores[condition.id],
      baselineScore: setting.scores.baseline,
      exactBaselineScore: setting.exactScores.baseline,
      delta: condition.id === "baseline" ? 0 : setting.deltas.skill,
      exactDelta: condition.id === "baseline" ? 0 : setting.exactDeltas.skill,
      categories: clone(setting.categories[condition.id]),
      baselineCategories: clone(setting.categories.baseline),
      metrics: clone(metrics),
      cost: null,
      latency: metrics.meanLatencyMs / 1000,
      tokens: metrics.meanOutputTokens,
      rank: null
    };
  }));
  const coverageById = new Map(coverageRecords.map(record => [record.configurationId, record]));
  for (const condition of CONDITIONS) {
    const ranked = entries.filter(entry => entry.condition === condition).sort((left, right) => right.exactScore - left.exactScore || left.configurationId.localeCompare(right.configurationId));
    ranked.forEach((entry, index) => {
      entry.rank = index > 0 && entry.exactScore === ranked[index - 1].exactScore ? ranked[index - 1].rank : index + 1;
      coverageById.get(entry.configurationId).ranks[condition] = entry.rank;
    });
  }
  const benchmarks = sources.flatMap(source => clone(source.benchmarks));
  const sourceCells = sources.flatMap(source => clone(source.benchmarkResults));
  const totalSettings = identities.size;
  const eligibleSettings = settings.length;
  const coverage = {
    totalSettings,
    eligibleSettings,
    incompleteSettings: totalSettings - eligibleSettings,
    observedResponseCount: sourceCells.length,
    expectedResponseCount: totalSettings * taskCount * CONDITIONS.length,
    eligibleResponseCount: eligibleSettings * taskCount * CONDITIONS.length,
    records: coverageRecords
  };
  const declarationSha256 = hash(DECLARATION);
  const scoreBasis = {
    id: `${DECLARATION.edition}:${hash({ declaration: DECLARATION, sourceBases, benchmarkWeights })}`,
    label: "Overall v2",
    edition: DECLARATION.edition,
    declarationVersion: DECLARATION.schemaVersion,
    declarationSha256,
    method: DECLARATION.method,
    unit: "rubric-points",
    range: { minimum: 0, maximum: 100 },
    benchmarkWeighting: "equal-within-category",
    categoryWeighting: DECLARATION.categoryWeighting,
    categoryWeights,
    publishedTargetWeight,
    portfolioCategoryCount: portfolioCategories.length,
    benchmarkIds,
    benchmarkWeights,
    taskCount,
    trialsPerTask: 1,
    judgeCount: new Set(sources.flatMap(source => source.scoreBasis.judges)).size,
    judges: [...new Set(sources.flatMap(source => source.scoreBasis.judges))],
    aggregation: "weighted-category-means-of-authoritative-final-task-scores-v2",
    batchUnit: "task-specific",
    effectMethod: "paired-absolute-delta-v1",
    effectUnit: "rubric-points",
    treatment: "Task-specific skill",
    sourceBases,
    eligibility: DECLARATION.eligibility,
    resourceAggregation: DECLARATION.resourceAggregation,
    calibrationStatus: "development-uncalibrated",
    uncertainty: { status: "not-estimated", reason: "The published task rubrics are uncalibrated and have one trial per condition. Overall is a development aggregate with declared category priorities, without a confidence interval or broader capability claim." }
  };
  const availability = {
    status: "development", verification: "unverified", code: "development-unverified-results",
    message: "Development results — not verified benchmark claims.",
    detail: "Overall weights category means by declared priorities normalized across published categories, with equal task weights within each category. It ranks only settings with complete assessable results in both conditions. Task-specific skills differ by benchmark; human calibration remains pending.",
    blockers: [{ code: "author-calibration-pending", message: "Human calibration and broader task validation remain pending." }]
  };
  const skillEntries = entries.filter(entry => entry.condition === "skill");
  const topScore = skillEntries.length ? Math.max(...skillEntries.map(entry => entry.exactScore)) : null;
  const leaders = skillEntries.filter(entry => entry.exactScore === topScore);
  const categoryLeaders = categories.flatMap(category => {
    const top = skillEntries.length ? Math.max(...skillEntries.map(entry => entry.categories.find(value => value.category === category.id).exactScore)) : null;
    return skillEntries.filter(entry => entry.categories.find(value => value.category === category.id).exactScore === top).map(entry => ({ category: category.id, entry: { ...clone(entry), categoryScore: entry.categories.find(value => value.category === category.id).score } }));
  });
  return {
    kind: "vasirbenchmark-overall-projection", schemaVersion: 1,
    program: clone(engineering.program),
    meta: { ...clone(engineering.meta), categories: categories.length, benchmarks: taskCount, settings: eligibleSettings, aggregateCells: coverage.eligibleResponseCount, runs: taskCount },
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
    categoryLeaders,
    efficientFrontier: [],
    regressions: skillEntries.filter(entry => entry.exactDelta < 0).map(clone),
    callouts: {
      overall: leaders.length ? `${leaders.map(entry => entry.label).join(", ")} ${leaders.length === 1 ? "leads" : "share the lead"} Overall at ${round(topScore).toFixed(1)} development rubric points.` : "No setting has complete assessable results across all published tasks in both conditions.",
      value: "Resource averages use the same task cells and weights as each score; provider cost comparison remains withheld.",
      regression: `${skillEntries.filter(entry => entry.exactDelta < 0).length} of ${eligibleSettings} eligible settings score lower with their task-specific skills.`,
      category: `${taskCount} benchmarks across ${categories.length} of ${portfolioCategories.length} planned categories cover ${publishedTargetWeight * 100}% of target weight. Published category weights are normalized; source benchmark summaries retain their complete published cohorts.`
    },
    availability,
    coverage,
    counts: { families: sources.length, tracks: sources.reduce((sum, source) => sum + source.tracks.length, 0), benchmarks: taskCount, categories: categories.length, conditions: CONDITIONS.length, settings: eligibleSettings, resultEntries: entries.length, responses: sourceCells.length, developmentResultSets: taskCount, eligibleResultSets: 0, withheldResultSets: 0 }
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
