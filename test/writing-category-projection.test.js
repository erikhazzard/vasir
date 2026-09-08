import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const boundary = app.indexOf('(async function () {');
assert.ok(boundary > 0, 'The pure Writing projection must precede the application IIFE.');
const context = vm.createContext({});
vm.runInContext(app.slice(0, boundary), context);
const build = source => JSON.parse(JSON.stringify(context.buildWritingCategoryCollection(source)));
const freeze = object => {
  if (object && typeof object === 'object' && !Object.isFrozen(object)) {
    Object.freeze(object);
    for (const value of Object.values(object)) freeze(value);
  }
  return object;
};

function publication(id, group, configurations) {
  const settings = Object.keys(configurations).map(configurationId => ({ id: configurationId, configurationId, family: configurationId, label: configurationId, provider: 'test', reasoning: 'fixed' }));
  const entries = settings.flatMap(setting => ['baseline', 'skill'].map((condition, index) => ({
    ...setting, id: `${setting.id}-${condition}`, settingId: setting.id, condition,
    exactScore: configurations[setting.configurationId][index], score: configurations[setting.configurationId][index],
    metrics: { meanLatencyMs: 1000, meanOutputTokens: 200, meanCostUsd: null, costCoverage: 'not-comparable' }
  })));
  return {
    benchmarks: [{ id, trackId: group, category: 'writing', suite: group, title: id }],
    benchmarkSummaries: [{ benchmarkId: id, detailHref: `benchmark-report.html#${id}` }],
    settings, entries, benchmarkResults: entries.map(entry => ({ ...entry, benchmarkId: id })),
    cases: [{ id: 'shared-case', prompt: 'A prompt' }], caseResults: [], caseSummaries: [{ caseId: 'shared-case' }],
    tracks: [{ id: group, title: group }],
    coverage: { settingCount: settings.length, caseCount: 1, responseCount: entries.length, expectedResponseCount: entries.length, scoredResponseCount: entries.filter(entry => Number.isFinite(entry.exactScore)).length, judgmentCount: entries.length * 2, expectedJudgmentCount: entries.length * 2 }
  };
}

test('real Writing collection uses the fixed active cohort, unique model union, and unchanged source scores', () => {
  const globals = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-data.js', import.meta.url), 'utf8'), globals);
  const source = globals.window.VASIR_WRITING;
  const before = JSON.stringify(source);
  freeze(source);
  const result = build(source);
  // Core idea judging may advance between publications. Derive coverage and
  // eligibility from the selected primary source, never a provisional table.
  const publications = [source, ...(source.benchmarkPublications || []).map(item => item.projection), ...Object.values(source.additionalBenchmarks || {})];
  const sum = field => publications.reduce((total, item) => total + (item.coverage[field] || 0), 0);
  const identities = [...new Set(publications.flatMap(item => item.settings.map(setting => setting.configurationId)))];
  const sourceEntry = (item, identity, condition) => item.entries.find(entry => entry.configurationId === identity && entry.condition === condition);
  const completePair = (item, identity) => ['baseline', 'skill'].every(condition => Number.isFinite(sourceEntry(item, identity, condition)?.exactScore));
  const active = publications.filter(item => item.settings.some(setting => completePair(item, setting.configurationId)));
  const eligible = identities.filter(identity => active.length > 0 && active.every(item => completePair(item, identity)));
  const groups = [...new Set(active.map(item => item.benchmarks[0].trackId))];
  const twists = publications.find(item => item.benchmarks[0].id === 'storytelling-plot-twists');
  assert.ok(twists, 'The frozen Plot twists publication must remain selected.');
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(result.writingCategory.activeBenchmarkIds, active.map(item => item.benchmarks[0].id));
  assert.equal(result.settings.length, identities.length);
  assert.equal(result.entries.length, identities.length * 2);
  assert.deepEqual(result.settings.map(setting => setting.configurationId), identities);
  assert.equal(result.coverage.benchmarkSettingCount, sum('settingCount'));
  assert.equal(result.coverage.settingCount, identities.length);
  assert.equal(result.coverage.completedSettingCount, eligible.length);
  for (const field of ['responseCount', 'expectedResponseCount', 'judgmentCount', 'expectedJudgmentCount', 'scoredResponseCount', 'usablePairs', 'expectedPairs', 'terminallyExcludedJudgmentCount']) assert.equal(result.coverage[field], sum(field), field);
  assert.equal(result.coverage.pendingJudgmentCount, sum('expectedJudgmentCount') - sum('judgmentCount') - sum('terminallyExcludedJudgmentCount'));
  assert.equal(result.coverage.executionComplete, publications.every(item => typeof item.coverage.executionComplete === 'boolean' ? item.coverage.executionComplete : item.coverage.judgmentCount === item.coverage.expectedJudgmentCount && item.coverage.responseCount === item.coverage.expectedResponseCount));
  assert.equal(result.benchmarkResults.length, publications.reduce((total, item) => total + item.benchmarkResults.length, 0));
  assert.deepEqual(result.categories.map(group => group.id), groups);
  assert.ok(result.categories.every(group => group.weight === 1 / groups.length));
  assert.equal(result.cases.length, publications.reduce((total, item) => total + item.cases.length, 0));
  assert.ok(result.cases.every(story => story.benchmarkId));
  assert.equal(twists.coverage.responseCount, 80);
  assert.equal(twists.coverage.validResponseCount, 78);
  assert.equal(twists.coverage.judgmentCount, 152);
  assert.equal(twists.coverage.terminallyExcludedJudgmentCount, 8);
  for (const [id, baseline, skill] of [['codex-gpt-5-6-sol-ultra', 55.4, 92.025], ['codex-gpt-5-6-luna-max', 56.45, 84.7]]) {
    const publishedTwists = result.writingCategory.publications.find(item => item.benchmarks[0].id === 'storytelling-plot-twists');
    const plain = publishedTwists.entries.find(entry => entry.settingId === id && entry.condition === 'baseline');
    const treated = publishedTwists.entries.find(entry => entry.settingId === id && entry.condition === 'skill');
    assert.equal(plain.exactScore, baseline);
    assert.equal(treated.exactScore, skill);
  }
  for (const entry of result.entries.filter(entry => eligible.includes(entry.configurationId))) {
    const expected = groups.reduce((total, group) => {
      const members = active.filter(item => item.benchmarks[0].trackId === group);
      return total + members.reduce((subtotal, item) => subtotal + sourceEntry(item, entry.configurationId, entry.condition).exactScore / members.length, 0) / groups.length;
    }, 0);
    assert.ok(Math.abs(entry.exactScore - expected) < 1e-10);
    assert.ok(Math.abs(entry.categories.reduce((total, reading) => total + (reading.exactContribution || 0), 0) - expected) < 1e-10);
    assert.equal(entry.rank, 1 + result.entries.filter(other => other.condition === entry.condition && Number.isFinite(other.exactScore) && other.exactScore > entry.exactScore).length);
  }
  const missing = result.entries.filter(entry => !Number.isFinite(entry.exactScore));
  assert.equal(missing.length, (identities.length - eligible.length) * 2);
  assert.ok(missing.every(entry => entry.score === null && entry.delta === null && entry.rank === null && entry.latency === null));
  assert.equal(result.writingCategory.coverageRecords.filter(record => record.unavailableBenchmarkIds.length).length, identities.filter(identity => active.some(item => !item.settings.some(setting => setting.configurationId === identity))).length);
  assert.deepEqual(result.benchmarkSummaries, JSON.parse(JSON.stringify(publications.flatMap(item => item.benchmarkSummaries))));
});

test('two subcategories weight equally and two benchmarks within one subcategory share its weight', () => {
  const source = publication('story-a', 'storytelling', { a: [60, 80], b: [50, 60] });
  source.benchmarkPublications = [{ benchmarkId: 'story-b', projection: publication('story-b', 'storytelling', { a: [40, 60], b: [50, 60] }) }];
  source.additionalBenchmarks = { prose: publication('prose', 'prose', { a: [100, 80], b: [80, null] }) };
  freeze(source);
  const result = build(source);
  assert.deepEqual(result.writingCategory.benchmarkWeights, { 'story-a': 0.25, 'story-b': 0.25, prose: 0.5 });
  assert.deepEqual(result.categories.map(group => group.weight), [0.5, 0.5]);
  const baseline = result.entries.find(entry => entry.id === 'a-baseline');
  const treatment = result.entries.find(entry => entry.id === 'a-skill');
  assert.equal(baseline.exactScore, 75);
  assert.equal(treatment.exactScore, 75);
  assert.equal(treatment.exactDelta, 0);
  assert.deepEqual(treatment.categories.map(reading => reading.exactScore), [70, 80]);
  assert.deepEqual(treatment.categories.map(reading => reading.exactContribution), [35, 40]);
  assert.equal(treatment.latency, 1);
  assert.equal(treatment.tokens, 200);
  assert.equal(treatment.cost, null);
  for (const entry of result.entries.filter(entry => entry.settingId === 'b')) {
    assert.equal(entry.score, null);
    assert.equal(entry.exactScore, null);
    assert.equal(entry.delta, null);
    assert.equal(entry.rank, null);
    assert.deepEqual(entry.coverage.missingBenchmarkIds, ['prose']);
  }
  assert.deepEqual(result.cases.map(story => [story.benchmarkId, story.id]), [['story-a', 'shared-case'], ['story-b', 'shared-case'], ['prose', 'shared-case']]);
});

test('resources use the score weights without renormalizing missing resource evidence', () => {
  const source = publication('a', 'storytelling', { model: [50, 60] });
  const other = publication('b', 'storytelling', { model: [80, 90] });
  other.entries[1].metrics.meanLatencyMs = null;
  other.entries[1].metrics.meanOutputTokens = 400;
  source.benchmarkPublications = [{ benchmarkId: 'b', projection: other }];
  const result = build(freeze(source));
  const treatment = result.entries.find(entry => entry.condition === 'skill');
  assert.equal(treatment.exactScore, 75);
  assert.equal(treatment.metrics.meanLatencyMs, null);
  assert.equal(treatment.latency, null);
  assert.equal(treatment.tokens, 300);
});

test('a wholly incomplete publication is visible but never activated or scored as zero', () => {
  const result = build(freeze(publication('pending', 'storytelling', { a: [50, null], b: [null, 70] })));
  assert.deepEqual(result.writingCategory.activeBenchmarkIds, []);
  assert.equal(result.benchmarks.length, 1);
  assert.equal(result.coverage.completedSettingCount, 0);
  assert.ok(result.entries.every(entry => entry.score === null && entry.exactScore === null && entry.rank === null));
  assert.equal(result.categories[0].weight, 0);
});

test('single-judge provisional scores cannot activate a benchmark or influence the primary Writing index', () => {
  const pending = publication('pending-core', 'storytelling', { a: [null, null], b: [null, null] });
  pending.provisionalLeaderboard = {
    status: 'provisional', judgeCount: 1, rankedSettingCount: 2,
    method: 'equal-case-paired-complete-corpus-single-judge-mean-v1',
    entries: publication('provisional', 'storytelling', { a: [99, 100], b: [100, 100] }).entries.map(entry => ({ ...entry, eligibleForRank: true, rank: 1 })),
    summary: { baseline: 99.5, treatment: 100, delta: 0.5 }
  };
  const provisionalOnly = build(pending);
  assert.deepEqual(provisionalOnly.writingCategory.activeBenchmarkIds, []);
  assert.equal(provisionalOnly.coverage.completedSettingCount, 0);
  assert.ok(provisionalOnly.entries.every(entry => entry.exactScore === null && entry.rank === null));
  pending.benchmarkPublications = [{ benchmarkId: 'complete-twists', projection: publication('complete-twists', 'storytelling', { a: [60, 70] }) }];
  const before = JSON.stringify(pending);
  const result = build(freeze(pending));
  assert.equal(JSON.stringify(pending), before);
  assert.deepEqual(result.writingCategory.activeBenchmarkIds, ['complete-twists']);
  assert.deepEqual(result.writingCategory.benchmarkWeights, { 'complete-twists': 1 });
  assert.equal(result.coverage.completedSettingCount, 1);
  assert.equal(result.entries.find(entry => entry.id === 'a-baseline').exactScore, 60);
  assert.equal(result.entries.find(entry => entry.id === 'a-skill').exactScore, 70);
  assert.equal(result.entries.find(entry => entry.id === 'a-skill').exactDelta, 10);
  assert.ok(result.entries.filter(entry => entry.settingId === 'b').every(entry => entry.exactScore === null && entry.rank === null));
  assert.ok(result.writingCategory.publications[0].provisionalLeaderboard, 'Provisional evidence is retained separately, not discarded or promoted.');
});

test('duplicate publication containers do not duplicate benchmarks or source coverage', () => {
  const source = publication('same', 'storytelling', { a: [50, 60] });
  source.benchmarkPublications = [{ benchmarkId: 'same', projection: publication('same', 'storytelling', { a: [50, 60] }) }];
  const result = build(freeze(source));
  assert.equal(result.benchmarks.length, 1);
  assert.equal(result.coverage.responseCount, 2);
  assert.equal(result.writingCategory.publications.length, 1);
  assert.equal(build(null), null);
});
