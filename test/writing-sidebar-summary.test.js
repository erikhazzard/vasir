import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildWritingPublication } from '../cli/eval/writing-publication.js';
import { buildWritingNavigationSummary } from '../cli/eval/writing-navigation.js';
import { deriveExpectedWritingCategory } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const boundary = app.indexOf('(async function () {');
assert.ok(boundary > 0);
const pure = app.slice(0, boundary);
const declaration = name => {
  const start = app.indexOf(`  const ${name} = `);
  assert.ok(start >= 0, `${name} must be present.`);
  return app.slice(start, app.indexOf('\n  const ', start + 1));
};
const formatters = app.slice(app.indexOf('  const escapeHtml = '), app.indexOf('  const scoreFor = '));
const plain = value => JSON.parse(JSON.stringify(value));

function publication(id, group, values) {
  const settings = Object.keys(values).map(configurationId => ({ id: configurationId, configurationId, family: configurationId, reasoning: 'high' }));
  const entries = settings.flatMap(setting => ['baseline', 'skill'].map(condition => ({ ...setting,
    id: `${setting.id}-${condition}`, settingId: setting.id, condition, exactScore: values[setting.id], score: values[setting.id], metrics: {} })));
  return {
    benchmarks: [{ id, trackId: group, title: id }], tracks: [{ id: group, title: group }], settings, entries,
    benchmarkSummaries: [], benchmarkResults: [], results: [], cases: [], caseResults: [], caseSummaries: [], trialSummaries: [],
    scoreBasis: { id, method: 'fixture-original-paired-means', judgeCount: 2 },
    coverage: { settingCount: settings.length, caseCount: 1, responseCount: entries.length, expectedResponseCount: entries.length,
      judgmentCount: entries.length * 2, expectedJudgmentCount: entries.length * 2 }
  };
}

function collection({ zero = false, noLeader = false, provisional = false } = {}) {
  const core = publication('storytelling-core-idea', 'storytelling', { complete: zero ? 0 : 60, partial: 100 });
  const twists = publication('storytelling-plot-twists', 'storytelling', { complete: zero ? 0 : 70, partial: 100 });
  const magic = publication('storytelling-magic-discovery', 'storytelling', { complete: noLeader ? null : zero ? 0 : 80, partial: null });
  if (provisional) {
    core.provisionalLeaderboard = { status: 'provisional', method: 'fixture-original-provisional-pairs', judgeCount: 1, entries: core.entries };
    core.entries = [];
  }
  return { ...core, benchmarkPublications: [{ projection: twists }, { projection: magic }],
    additionalBenchmarks: { dm: publication('dungeon-master-adventure-outline', 'dungeon-master', { complete: zero ? 0 : 99, partial: 99 }) } };
}

test('generated lightweight Writing summary matches the independent default All Writing leader', () => {
  const built = buildWritingPublication({ repoRootDirectory: repo });
  const expected = deriveExpectedWritingCategory(built.projection, 'all-writing');
  const leader = expected.entries.filter(entry => entry.eligibleForRank && entry.condition === 'skill' && Number.isFinite(entry.exactScore))
    .sort((left, right) => right.exactScore - left.exactScore)[0];
  assert.ok(leader);
  assert.deepEqual(built.stub.categoryIndex, buildWritingNavigationSummary(built.projection));
  assert.equal(built.stub.categoryIndex.selectionId, 'all-writing');
  assert.equal(built.stub.categoryIndex.method, expected.method);
  for (const field of ['configurationId', 'score', 'partial', 'provisional']) assert.equal(built.stub.categoryIndex.leader[field], leader[field], field);
  // Independent sum/divide and production weighted-sum arithmetic may differ
  // by an ULP; the exact shared-helper comparison above remains byte-exact.
  assert.ok(Math.abs(built.stub.categoryIndex.leader.exactScore - leader.exactScore) <= 2 * Number.EPSILON * Math.max(1, Math.abs(leader.exactScore)));
  assert.ok(Buffer.byteLength(JSON.stringify(built.stub.categoryIndex)) < 1024, 'The cross-page summary must not embed the full Writing collection.');
  assert.doesNotMatch(JSON.stringify(built.stub.categoryIndex), /caseResults|outputText|benchmarkPublications|judgments/);
});

test('navigation summary selects the complete equal-track aggregate and preserves zero, provisional and absent leader semantics', () => {
  for (const options of [{}, { zero: true }, { provisional: true }, { noLeader: true }]) {
    const source = collection(options), before = JSON.stringify(source);
    const summary = buildWritingNavigationSummary(source);
    const browser = vm.runInNewContext(pure + '\nbuildWritingNavigationSummary(source)', { source });
    assert.deepEqual(summary, plain(browser));
    assert.equal(JSON.stringify(source), before, 'Summary generation must not mutate source scores.');
    assert.equal(summary.selectionId, 'all-writing');
    if (options.noLeader) assert.equal(summary.leader, null);
    else {
      assert.equal(summary.leader.configurationId, 'complete');
      assert.equal(summary.leader.score, options.zero ? 0 : 84.5);
      assert.equal(summary.leader.exactScore, options.zero ? 0 : 84.5);
      assert.equal(summary.leader.partial, false, 'The higher partial 100 is not an eligible leader.');
      assert.equal(summary.leader.provisional, Boolean(options.provisional));
    }
  }
  assert.equal(buildWritingNavigationSummary(null).leader, null);
});

async function sidebar({ fragment = '#capabilities/games', search = '?score=storytelling', source = null, summary = buildWritingNavigationSummary(collection()) } = {}) {
  const requestedScripts = [];
  const writing = { benchmarkId: 'storytelling-core-idea', coverage: { caseCount: 1 }, ...(summary === null ? {} : { categoryIndex: summary }),
    benchmarks: ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery', 'dungeon-master-adventure-outline'].map(id => ({ id })) };
  const window = { location: { href: `https://example.test/index.html${search}${fragment}`, search, hash: fragment },
    VASIR_DATA: { writing, categories: [{ id: 'engineering' }], overall: {}, aiWorkflows: { categories: [{ id: 'ai-workflows' }] },
      games: { benchmark: { id: 'fixture-game' }, runs: [], configurations: [] } }, ...(source ? { VASIR_WRITING: source } : {}) };
  const context = vm.createContext({ window, URL, URLSearchParams,
    document: { currentScript: { src: 'https://example.test/app.js' },
      createElement: name => { requestedScripts.push(name); throw Error('Writing bundles must not load for this test.'); },
      head: { append: () => { throw Error('Unexpected Writing script append.'); } } },
    projectionCalls: 0, TREATMENT_LABEL: 'Task-specific skill', SCORE_MAXIMUM: 100, capabilityIndexMedia: { matches: false },
    state: { capabilityCategory: fragment.split('/')[1] || 'overall' }, selectorFields: [{ id: 'writing', color: '#b65a31' }] });
  const from = app.indexOf('  const rootData = window.VASIR_DATA;'), to = app.indexOf('  const data = ', from);
  assert.ok(from > boundary && to > from);
  const html = await vm.runInContext(`${pure}
    const originalProjection = buildWritingCategoryCollection;
    buildWritingCategoryCollection = (...args) => { projectionCalls++; return originalProjection(...args); };
    (async () => {
      ${app.slice(from, to)}
      ${formatters}
      ${declaration('capabilitySelectorMarkup')}
      return capabilitySelectorMarkup();
    })()`, context);
  const button = html.match(/<button[^>]*id="capability-category-writing"[\s\S]*?<\/button>/)?.[0];
  assert.ok(button);
  return { button, requestedScripts, projectionCalls: context.projectionCalls, window };
}

test('Games and all other non-Writing capability routes display the numeric All Writing summary without loading Writing data', async () => {
  const source = collection({ provisional: true }), summary = buildWritingNavigationSummary(source);
  for (const fragment of ['#capabilities/games', '#games', '#capabilities/overall', '#capabilities/engineering', '#capabilities/ai-workflows']) {
    const result = await sidebar({ fragment, summary });
    assert.match(result.button, /<strong[^>]*>84\.5<small>\/100<\/small><\/strong>/, fragment);
    assert.match(result.button, /All Writing aggregate leader/);
    assert.match(result.button, /title="All Writing aggregate leader · provisional"/);
    assert.doesNotMatch(result.button, /<strong[^>]*>Results<|Best task-specific skill result|Writing development comparison/);
    assert.deepEqual(result.requestedScripts, []);
    assert.equal(result.projectionCalls, 0, 'Off-page rendering must use only the generated stub.');
    assert.equal(result.window.VASIR_WRITING, undefined);
    assert.equal(result.window.VASIR_WRITING_COLLECTION, undefined);
  }
});

test('Writing individual benchmark or Dungeon Master selection does not replace its default All Writing sidebar leader', async () => {
  for (const score of ['all-writing', 'storytelling', 'storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery', 'dungeon-master']) {
    const result = await sidebar({ fragment: '#capabilities/writing', search: '?score=' + score, source: collection() });
    assert.match(result.button, /<strong[^>]*>84\.5<small>\/100<\/small><\/strong>/);
    assert.match(result.button, /All Writing aggregate leader/);
    assert.deepEqual(result.requestedScripts, []);
  }
});

test('cross-page fallback never invents a score and a measured zero stays numeric', async () => {
  for (const summary of [null, {}, { selectionId: 'storytelling', leader: null }, { selectionId: 'storytelling', leader: { score: null } }]) {
    // Null omits categoryIndex entirely, exercising the original absent-key shape.
    const result = await sidebar({ summary });
    assert.match(result.button, /<strong[^>]*>Results<\/strong>/);
    assert.match(result.button, /Open Writing to inspect measured benchmarks and coverage/);
    assert.deepEqual(result.requestedScripts, []);
  }
  const zero = await sidebar({ summary: buildWritingNavigationSummary(collection({ zero: true })) });
  assert.match(zero.button, /<strong[^>]*>0\.0<small>\/100<\/small><\/strong>/);
});
