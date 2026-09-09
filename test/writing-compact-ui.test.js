import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const pure = app.slice(0, app.indexOf('(async function () {'));
const plain = value => JSON.parse(JSON.stringify(value));
const project = (collection, selection = 'all-writing') => plain(vm.runInNewContext(pure + '\nbuildWritingCategoryCollection(collection, selection)', { collection, selection }));
const established = ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery'];
const compactIds = ['storytelling-plot-twists-compact-v2', 'writing-place-generation-v1', 'storytelling-one-shot-v1'];
const dm = 'dungeon-master-adventure-outline';
const configurations = ['codex:broad@high', 'codex:partial@high', ...Array.from({ length: 6 }, (_, index) => `claude:compact-${index}@high`)];
const declaration = name => {
  const start = app.indexOf(`  const ${name} = `);
  return app.slice(start, app.indexOf('\n  const ', start + 1));
};

function publication(id, score, { compact = false, unscored = false } = {}) {
  const trackId = id === dm ? 'dungeon-master' : id === compactIds[1] ? 'worldbuilding' : 'storytelling';
  const settings = (compact ? configurations.slice(2) : configurations).map(configurationId => ({
    id: configurationId, configurationId, family: configurationId, reasoning: 'high', provider: configurationId.split(':')[0]
  }));
  const entries = settings.flatMap(setting => ['baseline', 'skill'].map(condition => ({
    ...setting, id: `${setting.id}-${condition}`, settingId: setting.id, condition,
    exactScore: unscored || id === established[2] && setting.id === configurations[1] ? null : score + (condition === 'skill' ? 5 : 0), metrics: {}
  })));
  return {
    benchmarks: [{ id, name: id, trackId, suite: trackId, category: 'writing',
      ...(compact ? { publication: { adapter: 'writing-compact-v1', status: unscored ? 'unscored' : 'measured', scoreBasisIncluded: false } } : {}) }],
    tracks: [{ id: trackId, title: trackId }], settings, entries,
    benchmarkSummaries: [{ benchmarkId: id, detailHref: `benchmark-report.html#${id}` }], benchmarkResults: [], cases: [{ id: 'prompt' }],
    scoreBasis: { id, method: 'fixture-original-paired-means', judgeCount: 2 },
    coverage: { settingCount: settings.length, completedSettingCount: settings.length, caseCount: 1 }
  };
}

function collection({ compact = true, unscored = false } = {}) {
  const sources = established.map((id, index) => publication(id, 50 + index * 10));
  const catalog = [...established, dm, ...(compact ? compactIds : [])].map(id => ({
    id, name: id, edition: id, detailHref: `benchmark-report.html#${id}`,
    archived: id === established[1] || id === dm, scoreBasisIncluded: established.includes(id),
    status: compactIds.includes(id) && unscored ? 'unscored' : 'measured'
  }));
  return { ...sources[0], benchmarkPublications: sources.slice(1).map(projection => ({ projection })),
    additionalBenchmarks: { [dm]: publication(dm, 99) },
    ...(compact ? { compactBenchmarks: Object.fromEntries(compactIds.map(id => [id, publication(id, 90, { compact: true, unscored })])) } : {}),
    catalog, writingScoreBasis: { id: 'writing-established-storytelling-v1', benchmarkIds: established, method: 'equal-benchmark-mean' }
  };
}

test('six-Claude compact catalog additions cannot change the established broad Writing score, roster or weights', () => {
  const old = project(collection({ compact: false }));
  const source = collection(), before = JSON.stringify(source), current = project(source);
  const scoresAndRanks = result => result.entries.map(entry => ({ configurationId: entry.configurationId, condition: entry.condition,
    exactScore: entry.exactScore, score: entry.score, exactDelta: entry.exactDelta, rank: entry.rank,
    eligibleForRank: entry.eligibleForRank, benchmarkWeights: entry.benchmarkWeights }));
  assert.deepEqual(scoresAndRanks(current), scoresAndRanks(old));
  assert.deepEqual(current.scoreBasis.benchmarkIds, established);
  assert.equal(current.scoreBasis.edition, 'writing-established-storytelling-v1');
  assert.equal(current.writingCategory.method, 'versioned-common-benchmark-ranking-v6');
  assert.deepEqual(current.writingCategory.benchmarkWeights, Object.fromEntries(established.map(id => [id, 1 / 3])));
  assert.equal(current.settings.find(setting => setting.id === configurations[0]).exactScores.skill, 65);
  assert.equal(current.settings.find(setting => setting.id === configurations[1]).eligibleForRank, false);
  assert.ok(current.entries.filter(entry => entry.configurationId === configurations[1]).every(entry => entry.rank === null));
  assert.deepEqual(project(source, 'storytelling').scoreBasis.benchmarkIds, established);
  assert.equal(JSON.stringify(source), before, 'Catalog projection must preserve original evidence.');
});

test('each compact benchmark has its own shared six-setting leaderboard and task taxonomy', () => {
  const source = collection();
  for (const id of compactIds) {
    const result = project(source, id);
    assert.deepEqual(result.scoreBasis.benchmarkIds, [id]);
    assert.equal(result.coverage.rankedSettingCount, 6);
    assert.ok(result.entries.filter(entry => entry.eligibleForRank).every(entry => entry.configurationId.startsWith('claude:')));
    assert.equal(result.writingCategory.selection.type, 'benchmark');
    assert.deepEqual(result.writingCategory.benchmarkWeights, { [id]: 1 });
  }
  assert.equal(project(source, compactIds[1]).categories[0].id, 'worldbuilding');
  assert.equal(project(source, compactIds[2]).categories[0].id, 'storytelling');
});

test('archived editions and empty tracks stay outside public benchmark cards and scope controls', () => {
  const data = project(collection());
  const categoryBenchmarks = vm.runInNewContext(declaration('categoryBenchmarks') + '\ncategoryBenchmarks', {
    data, isWriting: true, COMBINED_CAPABILITY: { id: 'overall' }
  });
  assert.deepEqual(plain(categoryBenchmarks('writing').map(item => item.id)), [established[0], established[2], ...compactIds]);
  data.writingCategory.selections.push({ id: 'empty-track', title: 'Empty track', benchmarkIds: [], completedSettingCount: 0, partialSettingCount: 0 },
    { id: 'unscored-track', title: 'Unscored track', benchmarkIds: ['missing'], completedSettingCount: 0, partialSettingCount: 0 });
  const markup = vm.runInNewContext(declaration('writingLeaderboardControlsMarkup') + '\nwritingLeaderboardControlsMarkup()', {
    data, isWriting: true, state: { capabilityMode: 'models' }, escapeHtml: String
  });
  assert.match(markup, /value="all-writing" selected/);
  for (const id of [established[1], dm]) {
    assert.ok(!markup.includes(`value="${id}"`));
    assert.deepEqual(project(collection(), id).scoreBasis.benchmarkIds, [id]);
  }
  assert.doesNotMatch(markup, /Past editions|writing-score-basis|empty-track|unscored-track/);
  assert.doesNotMatch(app, /const writingPastEditionsMarkup/);
});

test('shared benchmark ledger numbers rows sequentially in visible track order without reordering source data', () => {
  const benchmarks = [
    { id: 'core', suite: 'Storytelling' }, { id: 'magic', suite: 'Storytelling' }, { id: 'twists', suite: 'Storytelling' },
    { id: 'place', suite: 'Worldbuilding' }, { id: 'one-shot', suite: 'Storytelling' }
  ];
  const before = JSON.stringify(benchmarks), visits = [];
  const markup = vm.runInNewContext(declaration('benchmarkLedgerMarkup') + '\nbenchmarkLedgerMarkup', {
    categoryBenchmarks: () => benchmarks, isWriting: true, isOverall: false, overallWritingCategory: true,
    benchmarkIsMeasured: () => true, writingPastEditionsMarkup: () => '', writingBenchmarkModelLinkMarkup: () => '',
    benchmarkLedgerRowMarkup: (benchmark, index) => { visits.push([benchmark.id, index + 1]); return ''; },
    data: { writingCategory: { groups: [{ id: 'storytelling', name: 'Storytelling' }, { id: 'worldbuilding', name: 'Worldbuilding' }] } },
    suiteDescriptions: { Storytelling: 'Stories', Worldbuilding: 'Places' }, escapeHtml: String
  });
  markup({ id: 'writing', name: 'Writing', color: '#fff' });
  assert.deepEqual(visits, [['core', 1], ['magic', 2], ['twists', 3], ['one-shot', 4], ['place', 5]]);
  visits.length = 0;
  markup({ id: 'writing', name: 'Writing', color: '#fff' });
  assert.equal(visits[0][1], 1, 'Every render starts from the first visible row.');
  assert.equal(JSON.stringify(benchmarks), before);
});

test('unmeasured compact plans stay outside catalog and selectors, and missing fixed-basis sources fail closed', () => {
  const planned = project(collection({ unscored: true }));
  for (const id of compactIds) {
    assert.ok(!planned.benchmarks.some(item => item.id === id));
    assert.ok(!planned.writingCategory.catalog.some(item => item.id === id));
    assert.ok(!planned.writingCategory.selections.some(item => item.id === id));
  }
  const invalid = collection();
  invalid.benchmarkPublications = invalid.benchmarkPublications.slice(0, 1);
  assert.equal(project(invalid), null, 'An absent basis source cannot silently renormalize broad ranks.');
});

test('the established Core idea source stays on its pinned single-judge basis when official panels appear', () => {
  const source = collection();
  source.writingScoreBasis.coreIdeaScoring = 'published-single-judge-provisional';
  source.provisionalLeaderboard = { status: 'provisional', judgeCount: 1, entries: plain(source.entries) };
  for (const entry of source.entries) entry.exactScore = 99;
  const current = project(source);
  assert.equal(current.settings.find(setting => setting.id === configurations[0]).exactScores.skill, 65);
  assert.equal(current.scoreBasis.sources[0].type, 'provisional');
  delete source.provisionalLeaderboard;
  const missing = project(source);
  assert.equal(missing.scoreBasis.sources[0].type, 'unavailable');
  assert.equal(missing.coverage.rankedSettingCount, 0, 'Official scores cannot replace the explicitly pinned source.');
});

test('the public Storytelling collection describes the same three equally weighted inputs in both aggregate views', () => {
  const source = collection({ compact: false });
  delete source.additionalBenchmarks;
  source.catalog = source.catalog.filter(item => established.includes(item.id)).map(item => ({ ...item, archived: false }));
  source.publicRelease = { id: 'writing-storytelling-public-v1', lifecycle: 'published' };
  const all = project(source, 'all-writing'), storytelling = project(source, 'storytelling');
  assert.deepEqual(all.entries.map(entry => [entry.configurationId, entry.condition, entry.exactScore, entry.rank]),
    storytelling.entries.map(entry => [entry.configurationId, entry.condition, entry.exactScore, entry.rank]));
  assert.match(all.scoreBasis.panelMethod, /All Writing and Storytelling average/);
  assert.match(all.scoreBasis.panelMethod, /equal benchmark weights/);
  assert.match(all.scoreBasis.panelMethod, /Different rubrics and panels remain uncalibrated/);
  assert.doesNotMatch(all.scoreBasis.panelMethod + all.callouts.overall, /past editions|Newly listed|fixed writing-established/);
  const controls = vm.runInNewContext(declaration('writingLeaderboardControlsMarkup') + '\nwritingLeaderboardControlsMarkup()', {
    data: all, isWriting: true, state: { capabilityMode: 'models' }, escapeHtml: String
  });
  assert.deepEqual([...controls.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]), ['all-writing', 'storytelling', ...established]);
});
