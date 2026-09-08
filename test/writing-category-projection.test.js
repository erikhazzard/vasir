import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const boundary = app.indexOf('(async function () {');
assert.ok(boundary > 0, 'The pure Writing projection must precede the application IIFE.');
const context = vm.createContext({});
vm.runInContext(app.slice(0, boundary), context);
const plain = value => JSON.parse(JSON.stringify(value));
const build = (source, selection) => plain(context.buildWritingCategoryCollection(source, selection));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, actual + ' != ' + expected);
const freeze = object => {
  if (object && typeof object === 'object' && !Object.isFrozen(object)) {
    Object.freeze(object);
    for (const value of Object.values(object)) freeze(value);
  }
  return object;
};
const globals = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-data.js', import.meta.url), 'utf8'), globals);
const published = freeze(globals.window.VASIR_WRITING);
const publications = [published, ...published.benchmarkPublications.map(item => item.projection), ...Object.values(published.additionalBenchmarks)];
const sourceById = Object.fromEntries(publications.map(source => [source.benchmarks[0].id, source]));
const storyIds = ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery'];
const selectedEntries = source => source.entries.some(entry => Number.isFinite(entry.exactScore)) ? source.entries : source.provisionalLeaderboard.entries;
const sourceEntry = (source, identity, condition) => selectedEntries(source).find(entry => entry.configurationId === identity && entry.condition === condition);
const entryFor = (result, identity, condition = 'skill') => result.entries.find(entry => entry.configurationId === identity && entry.condition === condition);

function publication(id, group, configurations) {
  const settings = Object.keys(configurations).map(configurationId => ({ id: configurationId, configurationId, family: configurationId, label: configurationId, provider: 'test', reasoning: 'fixed' }));
  const entries = settings.flatMap(setting => ['baseline', 'skill'].map((condition, index) => ({
    ...setting, id: setting.id + '-' + condition, settingId: setting.id, condition,
    exactScore: configurations[setting.configurationId][index], score: configurations[setting.configurationId][index],
    metrics: { meanLatencyMs: 1000, meanOutputTokens: 200, meanCostUsd: null, costCoverage: 'not-comparable' }
  })));
  return {
    benchmarks: [{ id, trackId: group, category: 'writing', suite: group, title: id }],
    benchmarkSummaries: [{ benchmarkId: id, detailHref: 'benchmark-report.html#' + id }],
    settings, entries, benchmarkResults: entries.map(entry => ({ ...entry, benchmarkId: id })),
    cases: [{ id: 'shared-case', prompt: 'A prompt' }], caseResults: [], caseSummaries: [{ caseId: 'shared-case' }],
    tracks: [{ id: group, title: group }],
    scoreBasis: { id: id + ':official', label: id, method: 'complete-paired-official', judgeCount: 2 },
    coverage: { settingCount: settings.length, caseCount: 1, responseCount: entries.length, expectedResponseCount: entries.length, scoredResponseCount: entries.filter(entry => Number.isFinite(entry.exactScore)).length, judgmentCount: entries.length * 2, expectedJudgmentCount: entries.length * 2 }
  };
}

function addProvisional(source, configurations) {
  source.provisionalLeaderboard = {
    status: 'provisional', label: 'Single-judge published provisional results', judgeCount: 1,
    method: 'equal-case-paired-complete-corpus-single-judge-mean-v1',
    entries: publication('provisional', 'storytelling', configurations).entries.map(entry => ({ ...entry, eligibleForRank: true, completedPairCount: 12, expectedPairCount: 12 }))
  };
  return source;
}

test('default Storytelling ranks four common-test settings and retains all 33 available means', () => {
  const before = JSON.stringify(published);
  const result = build(published);
  assert.equal(JSON.stringify(published), before);
  assert.equal(result.writingCategory.selection.id, 'storytelling');
  assert.deepEqual(result.writingCategory.activeBenchmarkIds, storyIds);
  assert.deepEqual(result.writingCategory.benchmarkWeights, Object.fromEntries(storyIds.map(id => [id, 1 / 3])));
  assert.equal(result.coverage.completedSettingCount, 4);
  assert.equal(result.coverage.rankedSettingCount, 4);
  assert.equal(result.coverage.partialSettingCount, 29);
  assert.equal(result.writingCategory.completeSettingCount, 4);
  assert.equal(result.writingCategory.rankedSettingCount, 4);
  assert.equal(result.writingCategory.partialSettingCount, 29);
  assert.equal(result.coverage.activeBenchmarkCount, 3);
  assert.equal(result.coverage.declaredSettingCount, 33);
  assert.equal(result.scoreBasis.provisional, true);
  assert.match(result.scoreBasis.label, /Storytelling.*provisional/);
  assert.equal(result.scoreBasis.method, 'common-benchmark-ranking-with-visible-partials-v5');
  assert.deepEqual(result.scoreBasis.sources.map(source => [source.benchmarkId, source.type, source.judgeCount]), [
    [storyIds[0], 'provisional', 1], [storyIds[1], 'official', 2], [storyIds[2], 'official', 4]
  ]);
  assert.deepEqual(result.categories.map(group => [group.id, group.weight]), [['storytelling', 1]]);
  assert.equal(result.entries.filter(entry => entry.condition === 'skill' && entry.rank).length, 4);
  assert.deepEqual(result.entries.filter(entry => entry.condition === 'skill' && entry.complete).map(entry => entry.configurationId).sort(), ['codex:gpt-6-astra@ultra', 'codex:gpt-5.6-sol@ultra', 'codex:gpt-5.6-terra@ultra', 'codex:gpt-5.6-luna@max'].sort());
  for (const [identity, expectedBaseline, expectedSkill] of [
    ['codex:gpt-5.6-sol@ultra', 72.32777777777777, 91.23055555555555],
    ['codex:gpt-5.6-luna@max', 70.84444444444444, 85.31666666666666]
  ]) {
    const setting = result.settings.find(item => item.configurationId === identity);
    near(entryFor(result, identity).exactScore, expectedSkill);
    near(entryFor(result, identity, 'baseline').exactScore, expectedBaseline);
    near(entryFor(result, identity).exactDelta, expectedSkill - expectedBaseline);
    for (const condition of ['baseline', 'skill']) {
      const entry = entryFor(result, identity, condition);
      const expected = storyIds.reduce((sum, id) => sum + sourceEntry(sourceById[id], identity, condition).exactScore, 0) / 3;
      near(entry.exactScore, expected);
      near(entry.categories[0].exactScore, expected);
      near(entry.categories[0].exactContribution, expected);
      assert.equal(entry.provisional, true);
      assert.equal(entry.eligibleForRank, entry.complete);
      assert.equal(entry.rank, 1 + result.entries.filter(other => other.eligibleForRank && other.condition === condition && Number.isFinite(other.exactScore) && other.exactScore > entry.exactScore).length);
      assert.deepEqual(setting.benchmarkComponents[condition], entry.benchmarkComponents);
      entry.benchmarkComponents.forEach((component, index) => {
        assert.equal(component.benchmarkId, storyIds[index]);
        assert.equal(component.weight, 1 / 3);
        assert.equal(component.exactScore, sourceEntry(sourceById[component.benchmarkId], identity, condition).exactScore);
        assert.equal(component.complete, true);
        near(component.exactContribution, component.exactScore / 3);
      });
    }
  }
  for (const setting of result.settings) {
    const available = storyIds.filter(id => ['baseline', 'skill'].every(condition => Number.isFinite(sourceEntry(sourceById[id], setting.configurationId, condition)?.exactScore)));
    const missing = storyIds.filter(id => !available.includes(id));
    assert.equal(setting.sourceCount, available.length);
    assert.equal(setting.partial, available.length < storyIds.length);
    assert.equal(setting.complete, available.length === storyIds.length);
    assert.equal(setting.eligibleForRank, setting.complete);
    assert.deepEqual(setting.availableBenchmarkIds, available);
    assert.deepEqual(setting.missingBenchmarkIds, missing);
    for (const condition of ['baseline', 'skill']) {
      const entry = entryFor(result, setting.configurationId, condition);
      const expected = available.reduce((sum, id) => sum + sourceEntry(sourceById[id], setting.configurationId, condition).exactScore, 0) / available.length;
      near(entry.exactScore, expected);
      near(entry.categories[0].exactContribution, expected);
      assert.equal(entry.partial, setting.partial);
      assert.equal(entry.complete, setting.complete);
      assert.equal(entry.eligibleForRank, entry.complete);
      assert.equal(entry.rank, entry.complete ? 1 + result.entries.filter(other => other.eligibleForRank && other.condition === condition && other.exactScore > entry.exactScore).length : null);
      near(entry.benchmarkComponents.reduce((sum, item) => sum + item.weight, 0), 1);
      near(entry.benchmarkComponents.reduce((sum, item) => sum + (item.exactContribution ?? 0), 0), expected);
      assert.deepEqual(entry.benchmarkWeights, setting.benchmarkWeights);
      for (const component of entry.benchmarkComponents) {
        assert.equal(component.weight, available.includes(component.benchmarkId) ? 1 / available.length : 0);
        assert.equal(component.exactScore, available.includes(component.benchmarkId) ? sourceEntry(sourceById[component.benchmarkId], setting.configurationId, condition).exactScore : null);
      }
    }
  }
  for (const [identity, baseline, skill, count, provisional] of [
    ['codex:gpt-6-astra@ultra', (89.95833333333334 * 2 + 81.925) / 3, (94.70833333333334 * 2 + 97.875) / 3, 3, true],
    ['codex:gpt-5.6-terra@ultra', (77.04166666666666 * 2 + 53.375) / 3, (87.75 * 2 + 85.125) / 3, 3, true],
    ['claude:claude-opus-5@max', 87.16666666666667, 96.25, 1, false]
  ]) {
    const entry = entryFor(result, identity);
    near(entry.exactScore, skill);
    near(entry.exactBaselineScore, baseline);
    near(entry.exactDelta, skill - baseline);
    assert.equal(entry.sourceCount, count);
    assert.equal(entry.partial, count < 3);
    assert.equal(entry.provisional, provisional);
  }
  assert.equal(entryFor(result, 'claude:claude-opus-5@max').rank, null);
});

test('five score choices expose Core 31, recovered Twists 4, Magic 33 and Dungeon Master 1 without altering source totals', () => {
  const result = build(published);
  assert.deepEqual(result.writingCategory.selections.map(selection => [selection.id, selection.completedSettingCount]), [
    ['storytelling', 4], [storyIds[0], 31], [storyIds[1], 4], [storyIds[2], 33], ['dungeon-master', 1]
  ]);
  assert.deepEqual(result.writingCategory.selections.map(selection => [selection.rankedSettingCount, selection.partialSettingCount]), [[4, 29], [31, 0], [4, 0], [33, 0], [1, 0]]);
  for (const [id, count, provisional] of [[storyIds[0], 31, true], [storyIds[1], 4, false], [storyIds[2], 33, false], ['dungeon-master-adventure-outline', 1, false]]) {
    const selected = build(published, id);
    assert.equal(selected.coverage.completedSettingCount, count);
    assert.equal(selected.coverage.rankedSettingCount, count);
    assert.equal(selected.coverage.partialSettingCount, 0);
    assert.equal(selected.scoreBasis.provisional, provisional);
    assert.deepEqual(selected.writingCategory.benchmarkWeights, { [id]: 1 });
    for (const entry of selected.entries.filter(entry => entry.rank)) {
      assert.equal(entry.exactScore, sourceEntry(sourceById[id], entry.configurationId, entry.condition).exactScore);
      assert.equal(entry.benchmarkComponents.length, 1);
      assert.equal(entry.partial, false);
      assert.equal(entry.benchmarkComponents[0].weight, 1);
    }
  }
  assert.equal(build(published, 'dungeon-master-adventure-outline').writingCategory.selection.id, 'dungeon-master');
  assert.deepEqual(build(published, 'dungeon-master').entries, build(published, 'dungeon-master-adventure-outline').entries);
  assert.deepEqual(build(published, 'unknown-selection').entries, result.entries);
});

test('all publication archives, report rows and all-publication execution coverage remain intact', () => {
  const result = build(published);
  for (const key of ['benchmarkSummaries', 'benchmarkResults', 'results', 'cases', 'caseResults', 'caseSummaries', 'trialSummaries']) {
    const expected = publications.flatMap(source => (source[key] || []).map(item => ({ ...item, benchmarkId: item.benchmarkId || source.benchmarks[0].id })));
    assert.deepEqual(result[key], plain(expected), key);
  }
  assert.equal(result.writingCategory.publications.length, 4);
  result.writingCategory.publications.forEach((source, index) => {
    const { benchmarkPublications, additionalBenchmarks, collectionCoverage, allWritingCoverage, ...expected } = publications[index];
    assert.deepEqual(source, plain(expected));
  });
  for (const field of ['responseCount', 'expectedResponseCount', 'judgmentCount', 'expectedJudgmentCount', 'scoredResponseCount', 'usablePairs', 'expectedPairs', 'terminalGenerationFailureCount', 'terminallyExcludedPairCount', 'terminallyExcludedJudgmentCount']) {
    assert.equal(result.coverage[field], publications.reduce((sum, source) => sum + (source.coverage[field] || 0), 0), field);
  }
  assert.equal(result.coverage.executionComplete, false);
  assert.equal(result.coverage.terminallyExcludedPairCount, 0);
  assert.equal(result.coverage.terminallyExcludedJudgmentCount, 0);
  const twists = result.writingCategory.publications.find(source => source.benchmarks[0].id === storyIds[1]);
  assert.deepEqual(twists.caseResults.filter(item => item.generationDisposition === 'terminal-protocol-failure'), []);
  assert.equal(twists.methodology.completion.parentSourceSha256, '97d1172df61311ca493c53ef99d193d607652de9bc0827bba2d3d6ca3fb41399');
  const dm = result.writingCategory.publications.find(source => source.benchmarks[0].id === 'dungeon-master-adventure-outline');
  assert.equal(dm.entries.find(entry => entry.condition === 'skill' && entry.configurationId === 'codex:gpt-6-astra@ultra').exactScore, 95.27777777777777);
});

test('unequal rosters retain each available score and disclose missing or untested benchmarks', () => {
  const source = publication('magic', 'storytelling', { a: [60, 80], b: [50, 70], c: [40, 60] });
  source.benchmarkPublications = [{ projection: publication('twists', 'storytelling', { a: [40, 60], b: [null, null] }) }];
  source.additionalBenchmarks = { dm: publication('adventure', 'dungeon-master', { dm: [80, 90] }) };
  const result = build(freeze(source));
  assert.deepEqual(result.writingCategory.activeBenchmarkIds, ['magic', 'twists']);
  assert.deepEqual(result.writingCategory.benchmarkWeights, { magic: 0.5, twists: 0.5 });
  assert.equal(result.coverage.completedSettingCount, 1);
  assert.equal(result.coverage.rankedSettingCount, 1);
  assert.equal(result.coverage.partialSettingCount, 2);
  assert.equal(entryFor(result, 'a').exactScore, 70);
  assert.deepEqual(entryFor(result, 'b').coverage.missingBenchmarkIds, ['twists']);
  assert.deepEqual(entryFor(result, 'b').coverage.unavailableBenchmarkIds, []);
  assert.deepEqual(entryFor(result, 'c').coverage.unavailableBenchmarkIds, ['twists']);
  assert.equal(entryFor(result, 'b').benchmarkComponents[0].exactScore, 70);
  for (const [id, score] of [['b', 70], ['c', 60]]) {
    const entry = entryFor(result, id);
    assert.equal(entry.exactScore, score);
    assert.equal(entry.partial, true);
    assert.equal(entry.complete, false);
    assert.equal(entry.eligibleForRank, entry.complete);
    assert.deepEqual(entry.benchmarkWeights, { magic: 1, twists: 0 });
    assert.equal(entry.latency, 1);
  }
  for (const id of ['dm']) {
    const entry = entryFor(result, id);
    for (const key of ['score', 'exactScore', 'baselineScore', 'exactBaselineScore', 'delta', 'exactDelta', 'rank', 'latency', 'tokens', 'cost']) assert.equal(entry[key], null, id + ': ' + key);
  }
  assert.equal(build(source, 'dungeon-master').coverage.completedSettingCount, 1);
  assert.equal(build(source, 'magic').coverage.completedSettingCount, 3);
  assert.equal(result.writingCategory.sourceCoverage.find(item => item.benchmarkId === 'adventure').exclusionReason, 'outside-selected-score');
});

test('an unavailable selected benchmark is omitted without turning its missing score into zero', () => {
  const source = publication('magic', 'storytelling', { a: [60, 80] });
  source.benchmarkPublications = [{ projection: publication('pending', 'storytelling', { a: [50, null] }) }];
  const result = build(freeze(source));
  assert.deepEqual(result.writingCategory.activeBenchmarkIds, ['magic', 'pending']);
  assert.deepEqual(result.writingCategory.benchmarkWeights, { magic: 0.5, pending: 0.5 });
  assert.equal(result.coverage.completedSettingCount, 0);
  assert.equal(result.coverage.rankedSettingCount, 0);
  assert.equal(result.coverage.partialSettingCount, 1);
  assert.equal(entryFor(result, 'a').exactScore, 80);
  assert.equal(entryFor(result, 'a', 'baseline').exactScore, 60);
  assert.equal(entryFor(result, 'a').exactDelta, 20);
  assert.equal(entryFor(result, 'a').rank, null);
  assert.equal(entryFor(result, 'a').partial, true);
  assert.deepEqual(entryFor(result, 'a').benchmarkWeights, { magic: 1, pending: 0 });
  assert.equal(entryFor(result, 'a').benchmarkComponents[1].exactScore, null);
  assert.equal(result.writingCategory.sourceCoverage[1].basis.type, 'unavailable');
  assert.equal(build(source, 'magic').coverage.completedSettingCount, 1);
});

test('published provisional pairs contribute uniformly and mark every aggregate as provisional', () => {
  const source = addProvisional(publication('core', 'storytelling', { a: [null, null], b: [null, null] }), { a: [40, 60], b: [50, 70] });
  source.benchmarkPublications = [{ projection: publication('magic', 'storytelling', { a: [60, 80], b: [60, 90] }) }];
  const result = build(freeze(source));
  assert.equal(result.coverage.completedSettingCount, 2);
  assert.equal(entryFor(result, 'a').exactScore, 70);
  assert.equal(entryFor(result, 'b').exactScore, 80);
  assert.equal(result.scoreBasis.provisional, true);
  assert.ok(result.entries.every(entry => entry.provisional));
  assert.equal(result.writingCategory.sourceCoverage[0].basis.type, 'provisional');
  assert.match(result.scoreBasis.panelMethod, /Individual models never switch judge panels/);
});

test('the first complete official pair switches the whole benchmark basis without filling other models from provisional scores', () => {
  const source = addProvisional(publication('core', 'storytelling', { a: [40, 60], b: [null, null] }), { a: [90, 99], b: [90, 100] });
  source.coverage.executionComplete = false;
  source.benchmarkPublications = [{ projection: publication('magic', 'storytelling', { a: [60, 80], b: [60, 90] }) }];
  const result = build(freeze(source));
  assert.equal(result.coverage.completedSettingCount, 1);
  assert.equal(entryFor(result, 'a').exactScore, 70);
  assert.equal(entryFor(result, 'b').exactScore, 90);
  assert.equal(entryFor(result, 'b').partial, true);
  assert.deepEqual(entryFor(result, 'b').benchmarkWeights, { core: 0, magic: 1 });
  assert.equal(entryFor(result, 'b').benchmarkComponents[0].exactScore, null);
  assert.equal(result.writingCategory.sourceCoverage[0].basis.type, 'official');
  assert.equal(result.scoreBasis.provisional, false);
  assert.equal(result.coverage.executionComplete, false, 'Publication execution is disclosed separately from published pair eligibility.');
  assert.equal(result.writingCategory.publications[0].provisionalLeaderboard.entries.length, 4);
});

test('incomplete Core diagnostics and unjudged expanded Twists settings never receive extrapolated scores or ranks', () => {
  const core = build(published, storyIds[0]);
  for (const id of ['claude:claude-opus-5@xhigh', 'claude:claude-opus-5@max']) {
    assert.equal(entryFor(core, id).exactScore, null);
    assert.equal(entryFor(core, id).rank, null);
  }
  const twists = build(published, storyIds[1]);
  const excluded = sourceById[storyIds[1]].settings.filter(setting => !Number.isFinite(sourceEntry(sourceById[storyIds[1]], setting.configurationId, 'skill')?.exactScore));
  assert.equal(excluded.length, 29);
  assert.ok(excluded.every(setting => entryFor(twists, setting.configurationId).rank === null));
  const partial = addProvisional(publication('core', 'storytelling', { a: [null, null], b: [null, null] }), { a: [80, 90], b: [85, 95] });
  partial.provisionalLeaderboard.entries.filter(entry => entry.configurationId === 'b').forEach(entry => { entry.completedPairCount = 11; });
  const result = build(freeze(partial));
  assert.equal(result.coverage.completedSettingCount, 1);
  assert.equal(entryFor(result, 'b').exactScore, null);
});

test('finite diagnostics with incomplete coverage or explicit rank exclusions cannot establish an official pair', () => {
  for (const mutate of [
    entry => { entry.eligibleForRank = false; },
    entry => { entry.coverage = { expectedCases: 10, scoredCases: 9 }; },
    entry => { entry.coverage = { expectedResponses: 10, completedResponses: 9 }; },
    entry => { entry.coverage = { expectedJudgments: 20, completedJudgments: 19 }; },
    entry => { entry.expectedPairCount = 12; entry.completedPairCount = 11; }
  ]) {
    const source = addProvisional(publication('core', 'storytelling', { a: [99, 100] }), { a: [40, 60] });
    mutate(source.entries[1]);
    const result = build(freeze(source));
    assert.equal(result.writingCategory.sourceCoverage[0].basis.type, 'provisional');
    assert.equal(entryFor(result, 'a').exactScore, 60);
  }
});

test('resource means use the same source basis and weights and never renormalize missing evidence', () => {
  const source = addProvisional(publication('core', 'storytelling', { a: [null, null] }), { a: [40, 60] });
  source.provisionalLeaderboard.entries[1].metrics.meanLatencyMs = 2000;
  source.provisionalLeaderboard.entries[1].metrics.meanOutputTokens = 400;
  const magic = publication('magic', 'storytelling', { a: [60, 90] });
  magic.entries[1].metrics.meanLatencyMs = null;
  source.benchmarkPublications = [{ projection: magic }];
  const entry = entryFor(build(freeze(source)), 'a');
  assert.equal(entry.exactScore, 75);
  assert.equal(entry.latency, null);
  assert.equal(entry.metrics.meanLatencyMs, null);
  assert.equal(entry.tokens, 300);
  assert.equal(entry.cost, null);
});

test('disjoint cohorts retain available means but neither can rank', () => {
  const source = publication('first', 'storytelling', { a: [20, 40] });
  source.benchmarkPublications = [{ projection: publication('second', 'storytelling', { b: [70, 80] }) }];
  const result = build(freeze(source));
  assert.equal(result.coverage.completedSettingCount, 0);
  assert.equal(result.coverage.rankedSettingCount, 0);
  assert.equal(result.coverage.partialSettingCount, 2);
  assert.equal(entryFor(result, 'a').exactScore, 40);
  assert.equal(entryFor(result, 'a').rank, null);
  assert.equal(entryFor(result, 'b').exactScore, 80);
  assert.equal(entryFor(result, 'b').rank, null);
  assert.deepEqual(entryFor(result, 'a').benchmarkWeights, { first: 1, second: 0 });
  assert.deepEqual(entryFor(result, 'b').benchmarkWeights, { first: 0, second: 1 });
  assert.ok(result.entries.every(entry => entry.partial && !entry.eligibleForRank && !entry.complete));
});

test('both conditions and resource means use exactly the same available paired benchmark subset', () => {
  const source = publication('paired', 'storytelling', { a: [30, 60], b: [null, null] });
  const unpaired = publication('unpaired', 'storytelling', { a: [100, null], b: [null, 90] });
  source.entries[0].metrics.meanLatencyMs = 2000;
  source.entries[1].metrics.meanLatencyMs = null;
  unpaired.entries[0].metrics.meanLatencyMs = 9000;
  unpaired.entries[1].metrics.meanLatencyMs = 10000;
  source.benchmarkPublications = [{ projection: unpaired }];
  const result = build(freeze(source));
  const baseline = entryFor(result, 'a', 'baseline');
  const skill = entryFor(result, 'a');
  assert.equal(baseline.exactScore, 30);
  assert.equal(skill.exactScore, 60);
  assert.equal(skill.exactDelta, 30);
  assert.equal(baseline.latency, 2);
  assert.equal(skill.latency, null);
  assert.deepEqual(baseline.availableBenchmarkIds, ['paired']);
  assert.deepEqual(skill.availableBenchmarkIds, baseline.availableBenchmarkIds);
  assert.deepEqual(skill.benchmarkWeights, baseline.benchmarkWeights);
  assert.equal(baseline.benchmarkComponents[1].exactScore, null, 'A one-condition diagnostic cannot contribute to the paired aggregate.');
  assert.equal(baseline.benchmarkComponents[1].weight, 0);
  for (const entry of result.entries.filter(entry => entry.configurationId === 'b')) {
    assert.equal(entry.exactScore, null);
    assert.equal(entry.rank, null);
    assert.equal(entry.latency, null);
    assert.equal(entry.eligibleForRank, false);
    assert.equal(entry.partial, false);
    assert.deepEqual(entry.benchmarkWeights, { paired: 0, unpaired: 0 });
  }
});

test('withdrawn or superseded provisional rows cannot establish the score basis', () => {
  for (const status of ['withdrawn', 'superseded', undefined]) {
    const source = addProvisional(publication('core', 'storytelling', { a: [null, null] }), { a: [40, 60] });
    source.provisionalLeaderboard.status = status;
    const result = build(freeze(source));
    assert.equal(result.coverage.completedSettingCount, 0);
    assert.equal(entryFor(result, 'a').exactScore, null);
    assert.equal(result.writingCategory.sourceCoverage[0].basis.type, 'unavailable');
  }
});

test('zero scores are valid evidence and regression and tied ranking arithmetic use unrounded totals', () => {
  const source = publication('first', 'storytelling', { a: [50.04, 50.01], b: [0, 50.01], c: [0, 0] });
  const result = build(freeze(source));
  assert.equal(entryFor(result, 'a').score, 50);
  assert.equal(entryFor(result, 'a').rank, 1);
  assert.equal(entryFor(result, 'b').rank, 1);
  assert.equal(entryFor(result, 'c').rank, 3);
  assert.equal(entryFor(result, 'c').exactScore, 0);
  assert.equal(result.regressions.length, 1);
  near(result.regressions[0].exactDelta, -0.03);
  assert.equal(result.coverage.completedSettingCount, 3);
});

test('execution accounting remains source disclosure and handles terminal exclusions without changing selected weights', () => {
  const cases = [
    [{ executionComplete: true, judgmentCount: 0 }, true],
    [{ executionComplete: false, executionStatus: 'complete' }, false],
    [{ executionStatus: 'in-progress' }, false],
    [{ executionStatus: 'complete-with-exclusions', judgmentCount: 0 }, true],
    [{}, true],
    [{ judgmentCount: 2, terminallyExcludedJudgmentCount: 2 }, true],
    [{ responseCount: 1, validResponseCount: 1, terminalGenerationFailureCount: 1 }, true],
    [{ responseCount: 1, terminalGenerationFailureCount: 1 }, false]
  ];
  for (const [overrides, expected] of cases) {
    const source = publication('benchmark', 'storytelling', { a: [40, 60] });
    Object.assign(source.coverage, overrides);
    const result = build(freeze(source));
    assert.equal(result.coverage.executionComplete, expected);
    assert.equal(result.coverage.completedSettingCount, 1);
    assert.equal(entryFor(result, 'a').exactScore, 60);
  }
});

test('missing an unfavorable test can never promote a model above a model that beats it on every shared test', () => {
  const source = publication('hard', 'storytelling', { astra: [60, 70], opus: [null, null] });
  source.additionalBenchmarks = { easy: publication('easy', 'storytelling', { astra: [90, 98], opus: [85, 96] }) };
  const result = build(source);
  assert.equal(entryFor(result, 'astra').score, 84);
  assert.equal(entryFor(result, 'astra').rank, 1);
  assert.equal(entryFor(result, 'opus').score, 96, 'Keep the real available score visible.');
  assert.equal(entryFor(result, 'opus').rank, null, 'A different test subset cannot compete for first place.');
  assert.equal(entryFor(result, 'opus').eligibleForRank, false);
  assert.equal(result.categoryLeaders[0].entry.configurationId, 'astra');
  assert.equal(build(source, 'easy').entries.find(entry => entry.configurationId === 'opus' && entry.condition === 'skill').rank, 2);
  source.entries.find(entry => entry.configurationId === 'opus' && entry.condition === 'baseline').exactScore = 50;
  source.entries.find(entry => entry.configurationId === 'opus' && entry.condition === 'skill').exactScore = 60;
  assert.equal(entryFor(build(source), 'opus').rank, 2, 'Complete evidence restores comparable ranking.');
});

test('missing collections safely return null', () => {
  assert.equal(build(null), null);
  assert.equal(build({}), null);
});
