// Protects published Engineering/Overall arithmetic, paired completeness, and
// serialization through the real publication builder; no model calls or reruns.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildEngineeringPublication, validateEngineeringPublication } from '../cli/eval/engineering-publication.js';
import { buildOverallPublication } from '../cli/eval/overall-publication.js';
import { buildBenchmarkPublicationProjection, validateBenchmarkPublicationProjection, validateBenchmarkPublicationResponses } from '../cli/eval/benchmark-publication-projection.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifact = buildBenchmarkPublicationProjection({ repoRootDirectory: REPO });
const projection = artifact.projection;
const sources = { architecture: projection, testAuthoring: projection.testAuthoring, executableTesting: projection.executableTesting };
const within = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} differs from ${expected}`);
const sourceKey = cell => `${cell.configurationId}\0${cell.condition}\0${cell.benchmarkId}`;

test('Engineering ranks every available paired result and keeps full-coverage task weights at 20%', () => {
  const engineering = projection.engineering;
  assert.equal(projection.schemaVersion, 9);
  assert.equal(engineering.kind, 'vasirbenchmark-engineering-projection');
  assert.equal(engineering.scoreBasis.edition, 'engineering-available-pairs-v2');
  assert.deepEqual(engineering.scoreBasis.benchmarkIds, ['hyper-scale-chat', 'personalized-home-feed', 'device-telemetry', 'test-authoring', 'backend-testing']);
  assert.deepEqual(engineering.scoreBasis.benchmarkWeights.map(task => task.weight), [0.2, 0.2, 0.2, 0.2, 0.2]);
  assert.deepEqual({ ...engineering.coverage, records: undefined }, { totalSettings: 53, eligibleSettings: 53, incompleteSettings: 50,
    observedResponseCount: 328, expectedResponseCount: 530, eligibleResponseCount: 328, completeSettings: 3, rankedSettings: 53, unrankedSettings: 0, records: undefined });
  assert.equal(engineering.benchmarkSummaries.length, 5);
  assert.equal(engineering.results.length, 5);
  assert.deepEqual(engineering.categories[0].trackIds, ['backend-architecture', 'backend-testing']);
  assert.ok(artifact.routes.reportFragments.includes('/benchmark-report.html#test-authoring'));
  assert.ok(artifact.routes.reportFragments.includes('/benchmark-report.html#backend-testing'));
  assert.equal(engineering.settings.length, 53);
  assert.equal(engineering.entries.length, 106);
  assert.deepEqual(engineering.settings.filter(setting => setting.complete).map(setting => setting.configurationId), ['codex:gpt-6-astra@ultra', 'codex:gpt-6-astra@xhigh', 'claude:claude-opus-5-5@xhigh']);
  const expected = {
    'codex:gpt-6-astra@ultra': [59.185, 83.19, 24.005],
    'codex:gpt-6-astra@xhigh': [60.555, 82.56, 22.005],
    'claude:claude-opus-5-5@xhigh': [54.49, 66.325, 11.835]
  };
  for (const setting of engineering.settings.filter(setting => setting.complete)) {
    within(setting.exactScores.baseline, expected[setting.configurationId][0]);
    within(setting.exactScores.skill, expected[setting.configurationId][1]);
    within(setting.exactDeltas.skill, expected[setting.configurationId][2]);
    for (const condition of ['baseline', 'skill']) assert.deepEqual(setting.metrics[condition], { sampleCount: 5, meanLatencyMs: null,
      meanInputTokens: null, meanOutputTokens: null, meanTotalTokens: null, costUsd: null });
  }
  assert.equal(engineering.conditions.find(condition => condition.id === 'skill').short, 'Skill');
  assert.equal(engineering.conditions.find(condition => condition.id === 'skill').label, 'Task-specific skill');
  const cells = new Map(engineering.benchmarkResults.map(cell => [sourceKey(cell), cell]));
  for (const cell of projection.benchmarkResults) assert.equal(cells.get(sourceKey(cell)).exactScore, cell.score);
  for (const [publication, treatment] of [[projection.testAuthoring, 'current'], [projection.executableTesting, 'repaired']]) {
    for (const row of publication.overall.rows) {
      const cell = cells.get(sourceKey({ configurationId: row.configurationId, condition: row.condition === 'none' ? 'baseline' : 'skill', benchmarkId: publication.benchmark.id }));
      assert.ok(row.condition === 'none' || row.condition === treatment);
      assert.equal(cell.exactScore, row.score);
      assert.equal(cell.sourceCondition, row.condition);
      assert.equal(cell.sourceRowId, row.id);
    }
  }
});

test('Sol 6.1 ranks its two paired testing tasks with explicit incomplete coverage and no model aliases', () => {
  const record = projection.engineering.coverage.records.find(setting => setting.configurationId === 'codex:gpt-6.1-sol@xhigh');
  assert.equal(record.eligible, true);
  assert.equal(record.eligibleForRank, true);
  assert.equal(record.complete, false);
  assert.equal(record.completedTaskCount, 2);
  assert.equal(record.expectedTaskCount, 5);
  assert.deepEqual(record.availableBenchmarkIds, ['test-authoring', 'backend-testing']);
  assert.deepEqual(record.benchmarkWeights.map(task => task.weight), [0.5, 0.5]);
  assert.equal(record.modelId, 'codex:gpt-6.1-sol');
  for (const condition of ['baseline', 'skill']) {
    assert.equal(record.conditions[condition].assessableTaskCount, 2);
    assert.deepEqual(record.conditions[condition].missingTaskIds, ['hyper-scale-chat', 'personalized-home-feed', 'device-telemetry']);
    assert.equal(record.conditions[condition].completedTaskCount, 2);
    assert.ok(Number.isFinite(record.ranks[condition]));
    assert.equal(record.metrics[condition].sampleCount, 2);
    assert.equal(record.metrics[condition].meanLatencyMs, null);
  }
  within(record.exactScores.baseline, 68.0125);
  within(record.exactScores.skill, 91.725);
  within(record.exactDeltas.skill, 23.7125);
  assert.equal(record.ranks.skill, 1);
  assert.equal(projection.engineering.entries.filter(entry => entry.configurationId === record.configurationId).length, 2);
  assert.ok(projection.engineering.coverage.records.some(setting => setting.configurationId === 'codex:gpt-6-sol@xhigh'));
  assert.ok(projection.engineering.coverage.records.some(setting => setting.configurationId === 'claude:opus@xhigh'));
});

test('Overall incorporates all five Engineering tasks at the unchanged category priorities', () => {
  const overall = projection.overall;
  assert.equal(overall.scoreBasis.edition, 'overall-v5');
  assert.deepEqual(overall.scoreBasis.categoryWeights.map(category => [category.categoryId, category.weight]), [['engineering', 0.5], ['writing', 0.25], ['ai-workflows', 0.25]]);
  assert.deepEqual(overall.scoreBasis.benchmarkWeights.map(task => task.weight), [0.1, 0.1, 0.1, 0.1, 0.1, 1 / 12, 1 / 12, 1 / 12, 0.25]);
  assert.deepEqual({ ...overall.coverage, records: undefined }, { totalSettings: 56, eligibleSettings: 56, incompleteSettings: 54,
    observedResponseCount: 578, expectedResponseCount: 1008, eligibleResponseCount: 578, completeSettings: 2, rankedSettings: 56, unrankedSettings: 0, records: undefined });
  assert.equal(overall.settings.length, 56);
  assert.equal(overall.entries.length, 112);
  assert.deepEqual(overall.settings.filter(setting => setting.complete).map(setting => setting.configurationId), ['codex:gpt-6-astra@xhigh', 'codex:gpt-6-astra@ultra']);
  const expected = {
    'codex:gpt-6-astra@xhigh': [76.20616161616161, 90.20866161616162],
    'codex:gpt-6-astra@ultra': [76.3620707070707, 90.07479797979798]
  };
  for (const setting of overall.settings.filter(setting => setting.complete)) {
    within(setting.exactScores.baseline, expected[setting.configurationId][0]);
    within(setting.exactScores.skill, expected[setting.configurationId][1]);
  }
  assert.equal(overall.coverage.records.find(setting => setting.configurationId === 'claude:claude-opus-5-5@xhigh').conditions.skill.assessableTaskCount, 5);
  assert.equal(overall.coverage.records.find(setting => setting.configurationId === 'codex:gpt-6.1-sol@xhigh').conditions.skill.assessableTaskCount, 2);
  const sol = overall.entries.find(entry => entry.configurationId === 'codex:gpt-6.1-sol@xhigh' && entry.condition === 'skill');
  within(sol.exactScore, 91.725);
  assert.equal(sol.completedTaskCount, 2);
  assert.equal(sol.expectedTaskCount, 9);
  assert.deepEqual(sol.categoryWeights.map(category => [category.categoryId, category.weight]), [['engineering', 1]]);
  assert.deepEqual(sol.benchmarkWeights.map(task => task.weight), [0.5, 0.5]);
  assert.ok(sol.categories.filter(category => category.category !== 'engineering').every(category => category.exactScore === null && category.exactContribution === null && category.weight === 0));
  assert.deepEqual(buildOverallPublication({ engineering: projection.engineering, aiWorkflows: projection.aiWorkflows, writing: artifact.writing }), overall,
    'raw Writing collections must resolve the same full source identities as the compact Writing adapter');
});

test('a missing or unassessable arm excludes the task from both scores and renormalizes the paired task weights', () => {
  for (const mode of ['missing', 'unassessable']) {
    const changedSources = structuredClone(sources);
    const matches = row => row.configurationId === 'codex:gpt-6-astra@ultra' && row.condition === 'current';
    if (mode === 'missing') changedSources.testAuthoring.overall.rows = changedSources.testAuthoring.overall.rows.filter(row => !matches(row));
    else changedSources.testAuthoring.overall.rows.find(matches).score = null;
    const engineering = buildEngineeringPublication(changedSources);
    const record = engineering.coverage.records.find(setting => setting.configurationId === 'codex:gpt-6-astra@ultra');
    assert.equal(engineering.settings.length, 53);
    assert.equal(record.conditions.baseline.assessableTaskCount, 5);
    assert.equal(record.conditions.skill.assessableTaskCount, 4);
    assert.deepEqual(record.conditions.skill[mode === 'missing' ? 'missingTaskIds' : 'unassessableTaskIds'], ['test-authoring']);
    assert.equal(record.complete, false);
    assert.equal(record.eligibleForRank, true);
    assert.equal(record.completedTaskCount, 4);
    assert.equal(record.conditions.baseline.completedTaskCount, 4);
    assert.equal(record.conditions.skill.completedTaskCount, 4);
    assert.ok(!record.availableBenchmarkIds.includes('test-authoring'));
    within(record.exactScores.baseline, 52.91875);
    within(record.exactScores.skill, 81.0625);
    assert.deepEqual(record.benchmarkWeights.map(task => task.weight), [0.25, 0.25, 0.25, 0.25]);
    assert.deepEqual(engineering.scoreBasis.benchmarkWeights.map(task => task.weight), [0.2, 0.2, 0.2, 0.2, 0.2]);
    const overall = buildOverallPublication({ engineering, aiWorkflows: projection.aiWorkflows, writing: projection.writing.overallSource });
    assert.equal(overall.settings.length, 56);
    const overallRecord = overall.coverage.records.find(setting => setting.configurationId === record.configurationId);
    assert.equal(overallRecord.completedTaskCount, 8);
    within(overallRecord.exactScores.baseline, 73.2289457070707);
    within(overallRecord.exactScores.skill, 89.01104797979798);
  }
});

test('Overall renormalizes category priorities across paired categories and leaves missing category scores null', () => {
  const engineering = structuredClone(projection.engineering);
  const writing = structuredClone(projection.writing.overallSource);
  const aiWorkflows = structuredClone(projection.aiWorkflows);
  const target = 'codex:gpt-6-astra@ultra';
  for (const cell of engineering.benchmarkResults.filter(cell => cell.configurationId === target)) cell.exactScore = cell.condition === 'baseline' ? 30 : 60;
  for (const cell of writing.benchmarkResults.filter(cell => cell.configurationId === target)) cell.exactScore = cell.condition === 'baseline' ? 90 : 30;
  for (const cell of aiWorkflows.benchmarkResults.filter(cell => cell.configurationId === target)) cell.exactScore = null;
  const overall = buildOverallPublication({ engineering, writing, aiWorkflows });
  const setting = overall.settings.find(setting => setting.configurationId === target);
  assert.equal(setting.completedTaskCount, 8);
  assert.equal(setting.complete, false);
  within(setting.exactScores.baseline, 50);
  within(setting.exactScores.skill, 50);
  assert.deepEqual(setting.categoryWeights.map(category => [category.categoryId, category.weight]), [['engineering', 2 / 3], ['writing', 1 / 3]]);
  for (const condition of ['baseline', 'skill']) {
    const missing = setting.categories[condition].find(category => category.category === 'ai-workflows');
    assert.equal(missing.score, null);
    assert.equal(missing.exactScore, null);
    assert.equal(missing.exactContribution, null);
    assert.equal(missing.weight, 0);
  }
});

test('zero-pair configurations remain visible with null scores and ranks while raw observed cells remain counted', () => {
  const changedSources = structuredClone(sources);
  for (const [publication, treatment] of [[changedSources.testAuthoring, 'current'], [changedSources.executableTesting, 'repaired']]) {
    publication.overall.rows = publication.overall.rows.filter(row => !(row.configurationId === 'codex:gpt-6.1-sol@xhigh' && row.condition === treatment));
  }
  const engineering = buildEngineeringPublication(changedSources);
  const setting = engineering.settings.find(setting => setting.configurationId === 'codex:gpt-6.1-sol@xhigh');
  assert.equal(engineering.settings.length, 53);
  assert.equal(engineering.coverage.rankedSettings, 52);
  assert.equal(engineering.coverage.observedResponseCount, 326);
  assert.equal(engineering.coverage.eligibleResponseCount, 324);
  assert.equal(setting.eligibleForRank, false);
  assert.equal(setting.completedTaskCount, 0);
  assert.deepEqual(setting.exactScores, { baseline: null, skill: null });
  assert.deepEqual(setting.benchmarkWeights, []);
  for (const entry of engineering.entries.filter(entry => entry.configurationId === setting.configurationId)) {
    assert.equal(entry.rank, null);
    assert.equal(entry.exactScore, null);
    assert.equal(entry.exactDelta, null);
    assert.equal(entry.metrics, null);
  }
});

test('complete configurations retain their exact previous totals and the historical full-coverage editions validate', () => {
  const historicalEngineering = buildEngineeringPublication(sources, { edition: 'engineering-all-tasks-v1' });
  validateEngineeringPublication(historicalEngineering, sources);
  const historicalOverall = buildOverallPublication({ engineering: historicalEngineering, aiWorkflows: projection.aiWorkflows, writing: projection.writing.overallSource });
  assert.equal(historicalOverall.scoreBasis.edition, 'overall-v4');
  for (const [historical, available] of [[historicalEngineering, projection.engineering], [historicalOverall, projection.overall]]) {
    for (const setting of historical.settings) assert.deepEqual(available.settings.find(candidate => candidate.configurationId === setting.configurationId).exactScores, setting.exactScores);
  }
});

test('aggregate calculation retains precision below the displayed score and does not mutate source reviews', () => {
  const changedSources = structuredClone(sources);
  changedSources.testAuthoring.overall.rows.find(row => row.configurationId === 'codex:gpt-6-astra@ultra' && row.condition === 'none').score = 84.25001;
  const before = JSON.stringify(changedSources);
  const engineering = buildEngineeringPublication(changedSources);
  const setting = engineering.settings.find(setting => setting.configurationId === 'codex:gpt-6-astra@ultra');
  within(setting.exactScores.baseline, 59.185002);
  assert.equal(setting.scores.baseline, 59.2);
  assert.equal(JSON.stringify(changedSources), before);
  const forged = structuredClone(projection.engineering);
  forged.benchmarkResults.find(cell => cell.benchmarkId === 'test-authoring').exactScore = 100;
  assert.throws(() => validateEngineeringPublication(forged, sources), /independent source reconstruction/);
  const forgedProjection = structuredClone(projection);
  forgedProjection.overall.entries[0].exactScore = 100;
  assert.throws(() => validateBenchmarkPublicationProjection(forgedProjection), /independent source reconstruction/);
});

test('serialized projection restores full aggregate ledgers and preserves architecture and native review payloads', () => {
  const context = { window: {} };
  vm.runInNewContext(artifact.dataSource, context);
  const restored = JSON.parse(JSON.stringify(context.window.VASIR_DATA));
  assert.deepEqual(restored, JSON.parse(JSON.stringify(projection)));
  validateBenchmarkPublicationProjection(restored);
  validateBenchmarkPublicationResponses(artifact.responseBundle, restored);
  const publishedContext = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(REPO, 'site/vasirbenchmark.com/data.js'), 'utf8'), publishedContext);
  const published = JSON.parse(JSON.stringify(publishedContext.window.VASIR_DATA));
  assert.deepEqual(restored.benchmarkResults, published.benchmarkResults);
  assert.deepEqual(restored.testAuthoring, published.testAuthoring);
  assert.deepEqual(restored.executableTesting, published.executableTesting);
});
