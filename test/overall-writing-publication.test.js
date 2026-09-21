import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { buildOverallPublication, buildOverallWritingSource, validateOverallPublication } from '../cli/eval/overall-publication.js';
import { buildBenchmarkPublicationProjection, serializeBenchmarkPublicationProjection, validateBenchmarkPublicationProjection } from '../cli/eval/benchmark-publication-projection.js';
import { buildDungeonMasterPublication } from '../cli/eval/dungeon-master-publication.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const built = buildBenchmarkPublicationProjection({ repoRootDirectory: repo });
const sources = { engineering: built.projection, aiWorkflows: built.projection.aiWorkflows, writing: built.writing };
const overall = built.projection.overall;
const adapter = built.projection.writing.overallSource;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-11, `${actual} != ${expected}`);
const publications = collection => {
  const result = new Map();
  const visit = publication => {
    if (!publication) return;
    result.set(publication.benchmarks[0].id, publication);
    for (const child of publication.benchmarkPublications || []) visit(child.projection);
    for (const child of Object.values(publication.additionalBenchmarks || {})) visit(child);
  };
  visit(collection); return result;
};
// Only the registered Opus selector alias is shared across these sources.
// Fable's differently named model targets must never be merged by label.
const writingConfigurationId = configurationId => configurationId.replace(/^claude:opus@/, 'claude:claude-opus-5@');
const canonicalConfigurationId = configurationId => configurationId.replace(/^claude:claude-opus-5@/, 'claude:opus@');
const writingOriginals = publications(built.writing);
const writingInputs = built.writing.writingScoreBasis.benchmarkIds.map(id => writingOriginals.get(id));
const originalScores = (configurationId, condition) => [
  ...sources.engineering.benchmarks.map(benchmark => sources.engineering.benchmarkResults.find(cell =>
    cell.benchmarkId === benchmark.id && cell.configurationId === configurationId && cell.condition === condition)?.score),
  ...sources.aiWorkflows.benchmarks.map(benchmark => sources.aiWorkflows.benchmarkResults.find(cell =>
    cell.benchmarkId === benchmark.id && cell.configurationId === configurationId && cell.condition === condition)?.exactScore),
  ...writingInputs.map(publication => (publication.provisionalLeaderboard || publication).entries.find(cell =>
    cell.configurationId === writingConfigurationId(configurationId) && cell.condition === condition)?.exactScore)
];
const originalConfigurationIds = [...new Set([...sources.engineering.settings, ...sources.aiWorkflows.settings,
  ...writingInputs.flatMap(publication => publication.settings)].map(item => canonicalConfigurationId(item.configurationId)))];
const completeOriginalIds = originalConfigurationIds.filter(id => ['baseline', 'skill'].every(condition =>
  originalScores(id, condition).length === 7 && originalScores(id, condition).every(Number.isFinite)));

test('normal publication automatically includes All Writing with fixed category priorities and complete exact pairs', () => {
  assert.equal(overall.scoreBasis.edition, 'overall-v3');
  assert.equal(overall.scoreBasis.declarationVersion, 3);
  assert.equal(overall.scoreBasis.benchmarkWeighting, 'declared-within-category');
  assert.equal(overall.scoreBasis.publishedTargetWeight, 0.5);
  assert.equal(overall.scoreBasis.provisional, true);
  assert.equal(overall.scoreBasis.taskCount, 7);
  assert.deepEqual(overall.categories.map(item => [item.id, item.weight]), [['engineering', 0.5], ['writing', 0.25], ['ai-workflows', 0.25]]);
  assert.deepEqual(overall.scoreBasis.benchmarkWeights.map(item => item.weight), [1 / 6, 1 / 6, 1 / 6, 1 / 12, 1 / 12, 1 / 12, 1 / 4]);
  assert.equal(built.writing.writingScoreBasis.id, 'writing-storytelling-paired-v2');
  const totalSettings = new Set([...sources.engineering.settings, ...sources.aiWorkflows.settings,
    ...writingInputs.flatMap(publication => publication.settings)].map(item => canonicalConfigurationId(item.configurationId))).size;
  const observedResponseCount = sources.engineering.benchmarkResults.length + sources.aiWorkflows.benchmarkResults.length
    + writingInputs.reduce((sum, publication) => sum + publication.settings.length * 2, 0);
  assert.deepEqual({ ...overall.coverage, records: undefined }, { totalSettings, eligibleSettings: completeOriginalIds.length, incompleteSettings: totalSettings - completeOriginalIds.length,
    observedResponseCount, expectedResponseCount: totalSettings * 7 * 2, eligibleResponseCount: completeOriginalIds.length * 7 * 2, records: undefined });
  assert.deepEqual(overall.settings.map(item => item.configurationId).sort(), [...completeOriginalIds].sort());
  assert.ok(completeOriginalIds.includes('codex:gpt-5.6-sol@medium'), 'the completed original cohort must survive a coverage expansion');
  assert.equal(overall.portfolioCategories.find(item => item.id === 'games').status, 'coming-soon');
  assert.doesNotThrow(() => validateBenchmarkPublicationProjection(built.projection));
});

test('every score independently recomputes from original official or uniform provisional Writing pairs', () => {
  const originals = publications(built.writing);
  for (const entry of overall.entries) {
    const engineering = sources.engineering.benchmarkResults.filter(cell => cell.configurationId === entry.configurationId && cell.condition === entry.condition);
    const ai = sources.aiWorkflows.benchmarkResults.find(cell => cell.configurationId === entry.configurationId && cell.condition === entry.condition);
    const writing = [...originals].filter(([id]) => built.writing.writingScoreBasis.benchmarkIds.includes(id)).map(([id, publication]) => {
      const selected = id === 'storytelling-core-idea' ? publication.provisionalLeaderboard : publication;
      const original = selected.entries.find(cell => cell.configurationId === writingConfigurationId(entry.configurationId) && cell.condition === entry.condition);
      assert.ok(original && Number.isFinite(original.exactScore), `${id} must contain the original complete ${entry.configurationId} ${entry.condition} score`);
      return original.exactScore;
    });
    const exactWriting = (writing[0] + writing[1] + writing[2]) / 3;
    const expected = engineering.reduce((sum, cell) => sum + cell.score, 0) / 3 * 0.5 + exactWriting * 0.25 + ai.exactScore * 0.25;
    close(entry.exactScore, expected);
    close(entry.categories.find(category => category.category === 'writing').exactScore, exactWriting);
    close(entry.categories.reduce((sum, category) => sum + category.exactContribution, 0), expected);
    assert.equal(entry.metrics.sampleCount, 7);
  }
});

test('compact adapter retains full benchmark rosters and exact original field means for the shared ledger', () => {
  assert.deepEqual(adapter, buildOverallWritingSource(built.writing, built.projection));
  assert.equal(adapter.settings.length, new Set(writingInputs.flatMap(publication => publication.settings.map(setting => setting.configurationId))).size);
  assert.equal(adapter.benchmarkResults.length, writingInputs.reduce((sum, publication) => sum + publication.settings.length * 2, 0));
  assert.deepEqual(Object.values(overall.benchmarkDisplays).map(item => item.settingCount), writingInputs.map(publication =>
    publication.provisionalLeaderboard?.rankedSettingCount ?? publication.coverage.completedSettingCount));
  assert.deepEqual(Object.values(overall.benchmarkDisplays).map(item => item.sourceKind), ['provisional-single-judge', 'official-panel', 'official-panel']);
  assert.deepEqual(adapter.scoreBasis.benchmarkIds, built.writing.writingScoreBasis.benchmarkIds);
  assert.equal(adapter.scoreBasis.edition, 'writing-storytelling-paired-v2');
  const twists = writingOriginals.get('storytelling-plot-twists');
  assert.equal(twists.scoreBasis.edition, 'storytelling-plot-twists-paired-v2');
  assert.deepEqual(twists.settings.map(setting => setting.configurationId),
    twists.methodology.sourceContract.configurations.map(setting => setting.id));
  assert.equal(twists.settings.length, twists.coverage.settingCount);
  const core = writingOriginals.get('storytelling-core-idea');
  const selectedCore = core.provisionalLeaderboard;
  assert.equal(selectedCore.id, 'core-idea-astra-common-11-v1');
  assert.equal(core.cases.length, 12, 'all original stories remain in the report');
  assert.deepEqual(selectedCore.caseIds, core.cases.filter(story => story.id !== 'the-matrix').map(story => story.id));
  assert.equal(selectedCore.expectedCaseCount, 11);
  assert.equal(selectedCore.rankedSettingCount, core.settings.length, 'every declared setting uses the same complete scored corpus');
  const coreSummary = overall.benchmarkSummaries.find(item => item.benchmarkId === 'storytelling-core-idea');
  for (const [field, value] of Object.entries(selectedCore.summary)) assert.equal(coreSummary[field], value, `Core summary ${field} must use the selected uniform basis`);
  assert.equal(coreSummary.usablePairs, core.settings.length * selectedCore.expectedCaseCount);
  assert.equal(coreSummary.expectedPairs, coreSummary.usablePairs);
  assert.equal(overall.benchmarkDisplays['storytelling-core-idea'].caseCount, selectedCore.expectedCaseCount);
  assert.equal(overall.benchmarkDisplays['storytelling-core-idea'].cohort, `${selectedCore.expectedCaseCount} stories`);
  for (const setting of adapter.settings) {
    const canonical = sources.engineering.settings.find(item => item.configurationId === setting.configurationId);
    if (canonical) assert.equal(setting.id, canonical.id);
  }
  const magic = overall.benchmarkResults.filter(cell => cell.benchmarkId === 'storytelling-magic-discovery' && cell.condition === 'skill' && cell.exactScore !== null);
  assert.equal(magic.length, 33, 'task leaderboard is not reduced to complete Overall settings');
});

test('one missing Writing arm excludes both Overall conditions, never promotes an available-score partial', () => {
  const changed = structuredClone(built.writing);
  const target = 'codex:gpt-5.6-sol@medium';
  assert.ok(overall.settings.some(setting => setting.configurationId === target), 'mutation must remove an otherwise eligible setting');
  const magic = publications(changed).get('storytelling-magic-discovery');
  magic.entries = magic.entries.filter(entry => !(entry.configurationId === target && entry.condition === 'skill'));
  const result = buildOverallPublication({ ...sources, writing: changed });
  assert.equal(result.settings.length, overall.settings.length - 1);
  assert.equal(result.entries.some(entry => entry.configurationId === target), false);
  const record = result.coverage.records.find(item => item.configurationId === target);
  assert.deepEqual(record.exactScores, { baseline: null, skill: null });
  for (const condition of ['baseline', 'skill']) assert.deepEqual(record.conditions[condition].unassessableTaskIds, ['storytelling-magic-discovery']);
  assert.deepEqual(result.scoreBasis.categoryWeights, overall.scoreBasis.categoryWeights);
});

test('missing source resources propagate unknown without zero or renormalization and do not remove scores', () => {
  const changed = structuredClone(built.writing);
  const target = 'codex:gpt-5.6-sol@medium';
  assert.ok(overall.settings.some(setting => setting.configurationId === target), 'resource mutation must retain an eligible setting');
  const cell = publications(changed).get('storytelling-magic-discovery').entries.find(entry => entry.configurationId === target && entry.condition === 'skill');
  cell.metrics.meanLatencyMs = null;
  delete cell.metrics.meanOutputTokens;
  const result = buildOverallPublication({ ...sources, writing: changed });
  const entry = result.entries.find(item => item.configurationId === target && item.condition === 'skill');
  assert.equal(result.settings.length, overall.settings.length);
  assert.equal(entry.latency, null);
  assert.equal(entry.tokens, null);
  assert.equal(entry.metrics.meanLatencyMs, null);
  assert.equal(entry.metrics.meanOutputTokens, null);
  assert.ok(Number.isFinite(entry.metrics.meanInputTokens));
  assert.equal(entry.exactScore, overall.entries.find(item => item.id === entry.id).exactScore);
});

test('additional Writing benchmark cannot silently change the fixed broad score basis', () => {
  const changed = structuredClone(built.writing);
  const extra = structuredClone(publications(changed).get('storytelling-magic-discovery'));
  const id = 'writing-growth-test';
  extra.benchmarks[0].id = id;
  extra.benchmarkSummaries[0].benchmarkId = id;
  extra.scoreBasis.benchmarkIds = [id];
  changed.additionalBenchmarks = { ...changed.additionalBenchmarks, [id]: extra };
  const result = buildOverallPublication({ ...sources, writing: changed });
  assert.deepEqual(result, overall);
  assert.equal(result.benchmarkDisplays[id], undefined);
});

test('a new narrow Writing track remains outside the established broad ranking', () => {
  const changed = structuredClone(built.writing);
  const extra = structuredClone(publications(changed).get('storytelling-magic-discovery'));
  const id = 'writing-new-track-test';
  Object.assign(extra.benchmarks[0], { id, trackId: 'poetry' });
  extra.benchmarkSummaries[0].benchmarkId = id;
  extra.tracks = [{ id: 'poetry', familyId: 'writing', title: 'Poetry', benchmarkIds: [id] }];
  changed.additionalBenchmarks = { ...changed.additionalBenchmarks, [id]: extra };
  const result = buildOverallPublication({ ...sources, writing: changed });
  assert.deepEqual(result, overall);
});

test('historical Writing collections retain their original explicitly selected track calculation', () => {
  // Historical editions predate both the versioned score basis and the compact
  // source registry; retaining new sources would manufacture a mixed edition.
  const { publicRelease, catalog, writingScoreBasis, catalogCoverage, compactBenchmarks, ...historical } = built.writing;
  historical.additionalBenchmarks = {
    'dungeon-master-adventure-outline': buildDungeonMasterPublication({ repoRootDirectory: repo }).projection
  };
  const result = buildOverallPublication({ ...sources, writing: historical });
  assert.equal(result.scoreBasis.taskCount, 8);
  const weights = result.scoreBasis.benchmarkWeights.filter(item => item.familyId === 'writing');
  assert.equal(weights.find(item => item.benchmarkId === 'dungeon-master-adventure-outline').weight, 1 / 8);
  assert.ok(weights.filter(item => item.benchmarkId.startsWith('storytelling-')).every(item => item.weight === 1 / 24));
});

test('validation rejects aggregate, compact-source, metadata, and source-weight tampering', () => {
  for (const mutate of [value => { value.entries[0].exactScore += 1; }, value => { value.benchmarkDisplays['storytelling-core-idea'].settingCount++; }, value => { value.scoreBasis.benchmarkWeights[3].weight = 0.25; }]) {
    const changed = structuredClone(overall); mutate(changed);
    assert.throws(() => validateOverallPublication(changed, sources), /independent source reconstruction/);
  }
  const changed = structuredClone(built.projection);
  changed.writing.overallSource.benchmarkResults[0].exactScore += 1;
  assert.throws(() => validateBenchmarkPublicationProjection(changed), /independent source reconstruction/);
  for (const omitted of ['engineering', 'aiWorkflows']) assert.throws(() => buildOverallPublication({ ...sources, [omitted]: null }), /both published family datasets/);
});

test('v3 landing stores repeated source collections once and restores exactly the full validated projection without fetching', () => {
  const source = serializeBenchmarkPublicationProjection(built.projection);
  const context = { window: {} };
  vm.runInNewContext(source, context, { timeout: 1000 });
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.VASIR_DATA)), built.projection);
  assert.equal(Object.isFrozen(context.window.VASIR_DATA), true);
  assert.ok(zlib.gzipSync(source, { level: 9 }).length < 110000, 'compact data retains room within the unchanged 300KB landing budget');
  assert.ok(zlib.gzipSync(source, { level: 9 }).length < zlib.gzipSync(JSON.stringify(built.projection), { level: 9 }).length - 30000);
  assert.doesNotMatch(source, /\bfetch\(/);
  assert.doesNotThrow(() => validateBenchmarkPublicationProjection(JSON.parse(JSON.stringify(context.window.VASIR_DATA))));
});

test('historical v2 serialization keeps the previous exact wrapper and JSON bytes', () => {
  const projection = structuredClone(built.projection);
  projection.overall = buildOverallPublication({ engineering: projection, aiWorkflows: projection.aiWorkflows });
  const json = JSON.stringify(projection).replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  assert.equal(serializeBenchmarkPublicationProjection(projection), `(function () {\n  'use strict';\n\n  window.VASIR_DATA = Object.freeze(${json});\n}());\n`);
});
