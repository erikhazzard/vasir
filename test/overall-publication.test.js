import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { buildOverallPublication, validateOverallPublication } from "../cli/eval/overall-publication.js";
import { buildBenchmarkPublicationProjection, validateBenchmarkPublicationProjection, validateBenchmarkPublicationResponses } from "../cli/eval/benchmark-publication-projection.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const built = buildBenchmarkPublicationProjection({ repoRootDirectory: REPO });
const sources = { engineering: built.projection, aiWorkflows: built.projection.aiWorkflows };
const overall = built.projection.overall;
const expectedTasks = ["hyper-scale-chat", "personalized-home-feed", "device-telemetry", "work-spec-chat"];
const within = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Number.EPSILON * Math.max(1, Math.abs(actual), Math.abs(expected)) * 16, `${actual} differs from ${expected}`);

test("Overall v2 weights category means with full precision and complete paired eligibility", () => {
  assert.equal(built.projection.schemaVersion, 4);
  assert.equal(overall.scoreBasis.label, "Overall v2");
  assert.equal(overall.scoreBasis.edition, "overall-v2");
  assert.equal(overall.scoreBasis.declarationVersion, 2);
  assert.notEqual(overall.scoreBasis.declarationSha256, "a17b1c52590024c8e0cd2464fbc22609c9e1bc88837d14db6320144e370672b8");
  assert.notEqual(overall.scoreBasis.id, "overall-v1:9923f5329f3185459c39543b8c5862378ebf3bedbf0000f300e49c8a5d72ac42");
  assert.equal(overall.scoreBasis.benchmarkWeighting, "equal-within-category");
  assert.equal(overall.scoreBasis.categoryWeighting, "declared-priority-normalized-over-published-v1");
  assert.equal(overall.scoreBasis.publishedTargetWeight, 0.375);
  assert.deepEqual(overall.scoreBasis.benchmarkIds, expectedTasks);
  assert.deepEqual(overall.scoreBasis.benchmarkWeights.map(task => task.weight), [2 / 9, 2 / 9, 2 / 9, 1 / 3]);
  assert.deepEqual(overall.categories.map(category => [category.id, category.weight]), [["engineering", 2 / 3], ["ai-workflows", 1 / 3]]);
  within(overall.scoreBasis.benchmarkWeights.reduce((sum, task) => sum + task.weight, 0), 1);
  assert.equal(overall.conditions.find(condition => condition.id === "skill").label, "Task-specific skill");
  assert.equal(overall.settings.length, 26);
  assert.equal(overall.entries.length, 52);
  const leaders = overall.entries.filter(entry => entry.condition === "skill").sort((a, b) => a.rank - b.rank);
  const expectedLeaders = [
    ["codex:gpt-6-astra@ultra", 86.31111111111111],
    ["codex:gpt-6-astra@xhigh", 86.02222222222222],
    ["codex:gpt-5.6-sol@xhigh", 82.625],
    ["codex:gpt-5.6-sol@max", 81.09444444444445],
    ["codex:gpt-5.6-sol@ultra", 80.12222222222222]
  ];
  expectedLeaders.forEach(([configurationId, score], index) => {
    assert.equal(leaders[index].configurationId, configurationId);
    within(leaders[index].exactScore, score);
  });
  const baselineLeader = overall.entries.find(entry => entry.condition === "baseline" && entry.rank === 1);
  assert.equal(baselineLeader.configurationId, "codex:gpt-5.6-sol@ultra");
  within(baselineLeader.exactScore, 75.59722222222222);

  // Independent observation: average Engineering's actual task scores, then
  // give that mean twice the weight of Work Specs. No display average is input.
  for (const entry of overall.entries) {
    const engineering = sources.engineering.benchmarkResults.filter(cell => cell.configurationId === entry.configurationId && cell.condition === entry.condition);
    const workflow = sources.aiWorkflows.benchmarkResults.find(cell => cell.configurationId === entry.configurationId && cell.condition === entry.condition);
    assert.equal(engineering.length, 3);
    const expected = ((engineering[0].score + engineering[1].score + engineering[2].score) / 3 * 2 + workflow.exactScore) / 3;
    within(entry.exactScore, expected);
    within(entry.categories.reduce((sum, category) => sum + category.exactScore * category.weight, 0), expected);
    within(entry.categories.reduce((sum, category) => sum + category.exactContribution, 0), expected);
    assert.equal(entry.metrics.sampleCount, 4);
    for (const [input, output] of [["latencyMs", "meanLatencyMs"], ["outputTokens", "meanOutputTokens"], ["inputTokens", "meanInputTokens"], ["totalTokens", "meanTotalTokens"]]) {
      within(entry.metrics[output], (engineering.reduce((sum, cell) => sum + cell[input], 0) / 3 * 2 + workflow[input]) / 3);
    }
    assert.equal(entry.tokens, entry.metrics.meanOutputTokens);
    assert.equal(entry.latency, entry.metrics.meanLatencyMs / 1000);
    assert.equal(entry.cost, null);
    const baseline = overall.entries.find(candidate => candidate.configurationId === entry.configurationId && candidate.condition === "baseline");
    assert.equal(entry.exactBaselineScore, baseline.exactScore);
    assert.equal(entry.exactDelta, entry.exactScore - baseline.exactScore);
  }
});

test("the five-category portfolio exposes priorities and coming-soon status without inventing measured scores", () => {
  assert.equal(overall.scoreBasis.portfolioCategoryCount, 5);
  assert.deepEqual(overall.portfolioCategories.map(category => [category.id, category.targetWeight, category.status, category.weight, category.taskCount]), [
    ["engineering", 0.25, "measured", 2 / 3, 3],
    ["games", 0.25, "coming-soon", 0, 0],
    ["writing", 0.125, "coming-soon", 0, 0],
    ["product-design", 0.25, "coming-soon", 0, 0],
    ["ai-workflows", 0.125, "measured", 1 / 3, 1]
  ]);
  assert.equal(overall.portfolioCategories.reduce((sum, category) => sum + category.targetWeight, 0), 1);
  within(overall.portfolioCategories.reduce((sum, category) => sum + category.weight, 0), 1);
  assert.equal(overall.portfolioCategories.filter(category => category.status === "measured").reduce((sum, category) => sum + category.targetWeight, 0), overall.scoreBasis.publishedTargetWeight);
  const upcoming = overall.portfolioCategories.filter(category => category.status === "coming-soon");
  for (const category of upcoming) {
    assert.deepEqual(category.benchmarkIds, []);
    for (const field of ["score", "exactScore", "rank", "delta"]) assert.equal(Object.hasOwn(category, field), false);
    assert.equal(overall.categories.some(measured => measured.id === category.id), false);
    assert.equal(overall.benchmarkResults.some(cell => cell.category === category.id), false);
    assert.equal(overall.entries.some(entry => entry.categories.some(value => value.category === category.id)), false);
  }
});

test("adding a task within Engineering changes its mean but cannot increase its category priority", () => {
  const changedSources = structuredClone(sources);
  const engineering = changedSources.engineering;
  const originalBenchmark = engineering.benchmarks[0];
  const additionalId = "publication-test-additional-engineering-task";
  engineering.benchmarks.push({ ...structuredClone(originalBenchmark), id: additionalId });
  engineering.scoreBasis.benchmarkIds.push(additionalId);
  engineering.benchmarkResults.push(...engineering.benchmarkResults.filter(cell => cell.benchmarkId === originalBenchmark.id).map(cell => ({ ...structuredClone(cell), benchmarkId: additionalId, score: 100 })));
  const expanded = buildOverallPublication(changedSources);
  assert.deepEqual(expanded.categories, overall.categories);
  assert.deepEqual(expanded.scoreBasis.benchmarkWeights.map(task => task.weight), [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 3]);
  assert.equal(expanded.scoreBasis.publishedTargetWeight, 0.375);
  assert.equal(expanded.portfolioCategories.find(category => category.id === "engineering").taskCount, 4);
  assert.equal(expanded.settings.length, 26);
  assert.equal(expanded.scoreBasis.declarationSha256, overall.scoreBasis.declarationSha256);
  assert.notEqual(expanded.scoreBasis.id, overall.scoreBasis.id);
  for (const entry of expanded.entries) {
    const original = overall.entries.find(candidate => candidate.id === entry.id);
    const originalEngineering = original.categories.find(category => category.category === "engineering");
    const workflow = original.categories.find(category => category.category === "ai-workflows");
    const engineeringMean = (originalEngineering.exactScore * 3 + 100) / 4;
    within(entry.exactScore, (engineeringMean * 2 + workflow.exactScore) / 3);
    assert.deepEqual(entry.categories.find(category => category.category === "ai-workflows"), workflow);
    assert.equal(entry.metrics.sampleCount, 5);
  }
});

test("Overall retains every source task cell and cohort while the ten incomplete configurations have no partial score", () => {
  const { coverage } = overall;
  assert.deepEqual({ ...coverage, records: undefined }, { totalSettings: 36, eligibleSettings: 26, incompleteSettings: 10, observedResponseCount: 268, expectedResponseCount: 288, eligibleResponseCount: 208, records: undefined });
  assert.deepEqual(overall.benchmarkResults, [...sources.engineering.benchmarkResults, ...sources.aiWorkflows.benchmarkResults]);
  assert.deepEqual(overall.benchmarks, [...sources.engineering.benchmarks, ...sources.aiWorkflows.benchmarks]);
  assert.deepEqual(overall.results, [...sources.engineering.results, ...sources.aiWorkflows.results]);
  assert.deepEqual(overall.benchmarkSummaries, [...sources.engineering.benchmarkSummaries, ...sources.aiWorkflows.benchmarkSummaries]);
  assert.equal(overall.counts.responses, 268);
  for (const record of coverage.records.filter(record => !record.eligible)) {
    assert.equal(record.status, "incomplete");
    assert.deepEqual(record.scores, { baseline: null, skill: null });
    assert.deepEqual(record.exactScores, { baseline: null, skill: null });
    assert.deepEqual(record.ranks, { baseline: null, skill: null });
    assert.deepEqual(record.deltas, { skill: null });
    assert.deepEqual(record.exactDeltas, { skill: null });
    assert.deepEqual(record.metrics, { baseline: null, skill: null });
    for (const condition of ["baseline", "skill"]) assert.deepEqual(record.conditions[condition], { expectedTaskCount: 4, observedTaskCount: 3, assessableTaskCount: 3, missingTaskIds: ["work-spec-chat"], unassessableTaskIds: [] });
    assert.equal(overall.entries.some(entry => entry.configurationId === record.configurationId), false);
  }
});

test("a missing or unassessable task in one condition withholds both Overall conditions without renormalization", () => {
  const configurationId = "codex:gpt-6-astra@ultra";
  for (const mode of ["missing", "unassessable"]) {
    const changedSources = structuredClone(sources);
    const isTarget = cell => cell.configurationId === configurationId && cell.condition === "skill";
    if (mode === "missing") changedSources.aiWorkflows.benchmarkResults = changedSources.aiWorkflows.benchmarkResults.filter(cell => !isTarget(cell));
    else {
      const cell = changedSources.aiWorkflows.benchmarkResults.find(isTarget);
      cell.exactScore = null;
      cell.score = null;
    }
    const result = buildOverallPublication(changedSources);
    const record = result.coverage.records.find(record => record.configurationId === configurationId);
    assert.equal(result.coverage.eligibleSettings, 25);
    assert.equal(record.conditions.baseline.assessableTaskCount, 4);
    assert.equal(record.conditions.skill.assessableTaskCount, 3);
    assert.deepEqual(record.conditions.skill[mode === "missing" ? "missingTaskIds" : "unassessableTaskIds"], ["work-spec-chat"]);
    assert.deepEqual(record.scores, { baseline: null, skill: null });
    assert.deepEqual(record.ranks, { baseline: null, skill: null });
    assert.equal(result.settings.some(setting => setting.configurationId === configurationId), false);
    assert.equal(result.entries.some(entry => entry.configurationId === configurationId), false);
    assert.deepEqual(result.scoreBasis.categoryWeights, overall.scoreBasis.categoryWeights);
    assert.deepEqual(result.scoreBasis.benchmarkWeights, overall.scoreBasis.benchmarkWeights);
    for (const entry of result.entries) assert.equal(entry.exactScore, overall.entries.find(original => original.id === entry.id).exactScore);
    assert.deepEqual(result.benchmarkResults, [...changedSources.engineering.benchmarkResults, ...changedSources.aiWorkflows.benchmarkResults]);
  }
});

test("Overall uses final Engineering gate-capped totals, preserves exact ties, and ignores display rounding", () => {
  const changedSources = structuredClone(sources);
  for (const cell of changedSources.engineering.benchmarkResults) cell.exactScore = 100;
  assert.deepEqual(buildOverallPublication(changedSources).entries, overall.entries, "an incidental field cannot replace Engineering's authoritative final task score");

  const tied = structuredClone(sources);
  const first = "codex:gpt-6-astra@ultra", second = "codex:gpt-6-astra@xhigh";
  for (const source of [tied.engineering, tied.aiWorkflows]) {
    for (const target of source.benchmarkResults.filter(cell => cell.configurationId === second)) {
      const reference = source.benchmarkResults.find(cell => cell.configurationId === first && cell.condition === target.condition && cell.benchmarkId === target.benchmarkId);
      target.score = reference.score;
      if (Object.hasOwn(reference, "exactScore")) target.exactScore = reference.exactScore;
    }
  }
  const entries = buildOverallPublication(tied).entries.filter(entry => entry.condition === "skill").sort((a, b) => a.rank - b.rank);
  assert.deepEqual(entries.slice(0, 3).map(entry => entry.rank), [1, 1, 3]);
  assert.equal(entries[0].exactScore, entries[1].exactScore);
});

test("source reconstruction rejects forged Overall arithmetic, weights, coverage, identity, resources, and source ledgers", () => {
  for (const mutate of [
    value => { value.entries[0].exactScore = 100; },
    value => { value.entries[0].score = 100; },
    value => { value.entries[0].delta = 100; },
    value => { value.entries[0].categories[0].exactScore = 100; },
    value => { value.entries[0].metrics.meanLatencyMs = 1; },
    value => { value.categories[0].weight = 0.5; },
    value => { value.portfolioCategories[1].score = 0; },
    value => { value.portfolioCategories[1].status = "measured"; },
    value => { value.portfolioCategories[2].targetWeight = 0.25; },
    value => { value.scoreBasis.publishedTargetWeight = 1; },
    value => { value.scoreBasis.categoryWeights[0].weight = 0.75; },
    value => { value.scoreBasis.benchmarkWeights[0].weight = 0.5; },
    value => { value.scoreBasis.declarationSha256 = "a".repeat(64); },
    value => { value.coverage.records.find(record => !record.eligible).scores.skill = 0; },
    value => { value.coverage.records.find(record => !record.eligible).conditions.skill.missingTaskIds = []; },
    value => { value.coverage.observedResponseCount = 208; },
    value => { value.entries[0].configurationId = value.entries[2].configurationId; },
    value => { value.benchmarkResults.pop(); },
    value => { value.benchmarkSummaries[0].baseline = 1; }
  ]) {
    const changed = structuredClone(overall); mutate(changed);
    assert.throws(() => validateOverallPublication(changed, sources), /independent source reconstruction/);
    const projection = structuredClone(built.projection); projection.overall = changed;
    assert.throws(() => validateBenchmarkPublicationProjection(projection), /independent source reconstruction/);
  }
});

test("Overall adds no response artifacts and preserves the previously published Engineering and workflow datasets", () => {
  const load = (filename, key) => { const sandbox = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(REPO, "site/vasirbenchmark.com", filename), "utf8"), sandbox); return JSON.parse(JSON.stringify(sandbox.window[key])); };
  const published = load("data.js", "VASIR_DATA");
  const withoutOverall = value => { const { overall: ignored, ...rest } = value; return { ...rest, schemaVersion: 3 }; };
  assert.deepEqual(withoutOverall(built.projection), withoutOverall(published));
  assert.deepEqual(built.responseBundle, load("responses.js", "VASIR_RESPONSES"));
  assert.equal(crypto.createHash("sha256").update(built.responsesSource).digest("hex"), "f7b2b8367c8b2b37239248e5fed7e651a5b3315a0792f840f321e6ae66df8911");
  validateBenchmarkPublicationResponses(built.responseBundle, built.projection);
});
