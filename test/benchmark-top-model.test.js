import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const boundary = app.indexOf('(async function () {');
assert.ok(boundary > 0, 'The selector must remain a pure presentation helper.');
const context = vm.createContext({});
vm.runInContext(app.slice(0, boundary), context);
const plain = value => value == null ? value : JSON.parse(JSON.stringify(value));
const select = (settings, entries, options) => plain(context.selectBenchmarkTopModel(settings, entries, options));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };

function fixture(values = { a: [99, 90], b: [40, 95] }) {
  const settings = Object.keys(values).map(id => ({ id, configurationId: `model:${id}`, label: `Model ${id} · high`, family: `Model ${id}`, reasoning: 'high' }));
  const entries = settings.flatMap(setting => ['baseline', 'skill'].map((condition, index) => ({
    settingId: setting.id, configurationId: setting.configurationId, condition, exactScore: values[setting.id][index],
    score: Math.round(values[setting.id][index] * 10) / 10, eligibleForRank: true, complete: true, partial: false,
    coverage: { expectedJudgments: 2, completedJudgments: 2 }
  })));
  return { settings, entries };
}

test('benchmark leader pairs the highest exact skill score with the same model baseline, not independent maxima', () => {
  const f = fixture(), before = JSON.stringify(f);
  const leader = select(f.settings, f.entries);
  assert.deepEqual(leader, { settingId: 'b', configurationId: 'model:b', label: 'Model b · high', family: 'Model b', reasoning: 'high', baseline: 40, skill: 95, delta: 55, tiedCount: 1 });
  assert.notEqual(leader.baseline, 99);
  assert.equal(JSON.stringify(f), before);
});

test('exact skill scores decide the leader even when rounded scores tie or point the other way', () => {
  const f = fixture({ a: [40, 91.241], b: [30, 91.249] });
  f.entries.find(entry => entry.settingId === 'a' && entry.condition === 'skill').score = 99;
  f.entries.find(entry => entry.settingId === 'b' && entry.condition === 'skill').score = 0;
  const leader = select(f.settings, f.entries);
  assert.equal(leader.settingId, 'b'); assert.equal(leader.skill, 91.249); assert.equal(leader.baseline, 30); assert.equal(leader.tiedCount, 1);
});

test('exact-skill ties use configuration identity codepoint order independently of input, setting id or baseline', () => {
  const f = fixture({ a: [99, 95], z: [10, 95] });
  f.settings[0].configurationId = 'model:z'; f.settings[1].configurationId = 'model:a';
  f.entries.forEach(entry => { entry.configurationId = f.settings.find(setting => setting.id === entry.settingId).configurationId; });
  for (const settings of [f.settings, [...f.settings].reverse()]) for (const entries of [f.entries, [...f.entries].reverse()]) {
    const leader = select(settings, entries);
    assert.equal(leader.settingId, 'z'); assert.equal(leader.configurationId, 'model:a'); assert.equal(leader.baseline, 10); assert.equal(leader.tiedCount, 2);
  }
});

test('zero is a valid complete paired score while missing pairs and nonfinite scores cannot lead', () => {
  const zero = fixture({ zero: [0, 0] });
  assert.deepEqual(select(zero.settings, zero.entries), { settingId: 'zero', configurationId: 'model:zero', label: 'Model zero · high', family: 'Model zero', reasoning: 'high', baseline: 0, skill: 0, delta: 0, tiedCount: 1 });
  assert.equal(select([], []), null);
  for (const condition of ['baseline', 'skill']) {
    assert.equal(select(zero.settings, zero.entries.filter(entry => entry.condition !== condition)), null);
    for (const score of [null, NaN, Infinity, -Infinity, undefined]) {
      const f = fixture({ zero: [0, 0] }), entry = f.entries.find(entry => entry.condition === condition);
      entry.exactScore = score; entry.score = 100;
      assert.equal(select(f.settings, f.entries), null, `${condition} ${String(score)} must not fall back to a stale rounded score`);
    }
  }
});

test('explicit incomplete, partial and unranked entries on either arm cannot be promoted', () => {
  for (const condition of ['baseline', 'skill']) for (const mutation of [
    entry => { entry.eligibleForRank = false; }, entry => { entry.complete = false; }, entry => { entry.partial = true; },
    entry => { entry.expectedPairCount = 12; entry.completedPairCount = 11; },
    entry => { entry.coverage.expectedCases = 12; entry.coverage.scoredCases = 11; },
    entry => { entry.coverage.expectedResponses = 12; entry.coverage.completedResponses = 11; },
    entry => { entry.coverage.expectedJudgments = 4; entry.coverage.completedJudgments = 3; }
  ]) {
    const f = fixture({ complete: [50, 80], incomplete: [90, 100] });
    mutation(f.entries.find(entry => entry.settingId === 'incomplete' && entry.condition === condition));
    assert.equal(select(f.settings, f.entries).settingId, 'complete');
  }
});

test('declared but missing completion evidence is incomplete, while score-only Engineering results remain supported', () => {
  for (const condition of ['baseline', 'skill']) {
    const f = fixture({ a: [50, 90] });
    f.entries.find(entry => entry.condition === condition).expectedPairCount = 12;
    assert.equal(select(f.settings, f.entries), null);
  }
  const f = fixture({ a: [49, 85] }); f.entries.forEach(entry => { delete entry.exactScore; });
  assert.equal(select(f.settings, f.entries).baseline, 49); assert.equal(select(f.settings, f.entries).skill, 85);
});

test('condition options, label fallback and frozen inputs preserve pure same-model selection', () => {
  const f = fixture({ a: [50, 90] }); f.entries[0].condition = 'plain'; f.entries[1].condition = 'treated';
  delete f.settings[0].label;
  freeze(f); const before = JSON.stringify(f);
  const leader = select(f.settings, f.entries, { baselineConditionId: 'plain', skillConditionId: 'treated' });
  assert.equal(leader.label, 'Model a · high'); assert.equal(leader.delta, 40); assert.equal(JSON.stringify(f), before);
  assert.equal(select(f.settings, f.entries), null);
  const unlabeled = fixture({ a: [50, 90] }); delete unlabeled.settings[0].label; delete unlabeled.settings[0].family; delete unlabeled.settings[0].reasoning;
  assert.equal(select(unlabeled.settings, unlabeled.entries).label, 'a');
});

test('the pure helper retains hostile label bytes for escaping at the rendering boundary', () => {
  const f = fixture({ a: [50, 90] }); f.settings[0].label = '<img src=x onerror="alert(1)"> & Ω';
  assert.equal(select(f.settings, f.entries).label, f.settings[0].label);
});

const declaration = name => {
  const start = app.indexOf(`  const ${name} = `);
  assert.ok(start >= 0, `${name} must be an exposed renderer declaration`);
  return app.slice(start, app.indexOf('\n  const ', start + 1));
};
const formatters = app.slice(app.indexOf('  const escapeHtml = '), app.indexOf('  const scoreFor = '));
const topRenderers = `${declaration('formatBenchmarkTopScore')}\n${declaration('benchmarkTopModelMarkup')}`;
const renderTop = leader => vm.runInNewContext(`${formatters}\n${topRenderers}\nbenchmarkTopModelMarkup(leader)`, { leader, BASELINE_SHORT: 'Plain' });

test('top-model markup escapes labels and identities, preserves exact evidence and renders tied same-model readings', () => {
  const leader = { settingId: 'id"<unsafe>', label: '<img src=x onerror="alert(1)"> & Ω', baseline: 92.25, skill: 97.91666666666667, delta: 5.666666666666671, tiedCount: 2 };
  freeze(leader); const before = JSON.stringify(leader), html = renderTop(leader);
  assert.doesNotMatch(html, /<img|data-setting-id="id"/);
  assert.match(html, /data-setting-id="id&quot;&lt;unsafe&gt;"/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; Ω/);
  assert.match(html, /Top with skill · 2 tied/);
  assert.match(html, /data-exact-baseline="92\.25"/);
  assert.match(html, /data-exact-skill="97\.91666666666667"/);
  assert.match(html, /data-exact-delta="5\.666666666666671"/);
  assert.match(html, /data-top-model-baseline>92\.3<\/b>/);
  assert.match(html, /data-top-model-skill>97\.9<\/b>/);
  assert.match(html, /data-top-model-delta>\+5\.7<\/b>/);
  assert.equal(JSON.stringify(leader), before);
  assert.equal(renderTop(null), '');
});

test('top-model rendering retains zero and negative paired uplift instead of claiming an improvement', () => {
  const zero = renderTop({ settingId: 'zero', label: 'Zero', baseline: 0, skill: 0, delta: 0, tiedCount: 1 });
  assert.match(zero, /data-top-model-baseline>0\.0<\/b>/); assert.match(zero, /data-top-model-skill>0\.0<\/b>/); assert.match(zero, /data-top-model-delta>±0\.0<\/b>/);
  assert.doesNotMatch(zero, /1 tied|—/);
  const loss = renderTop({ settingId: 'loss', label: 'Loss', baseline: 95, skill: 90, delta: -5, tiedCount: 1 });
  assert.match(loss, /benchmark-ledger__leader-delta--negative/); assert.match(loss, /data-top-model-delta>−5\.0<\/b>/);
});

test('benchmark ledger preserves the average pair and average uplift separately from the top-model pair', () => {
  const benchmark = { id: 'field', name: 'Field benchmark', category: 'engineering', description: 'A fixed benchmark.' };
  const summary = { baseline: 78.3, treatment: 84, delta: 5.7, baselineLabel: 'Plain', treatmentLabel: 'Skill', detailHref: './benchmark-report.html#field', complete: 2, total: 2, completionLabel: 'settings', wins: 2, ties: 0, losses: 0, runId: 'fixed-source' };
  const leader = { settingId: 'top', label: 'Top model', baseline: 83.08333333333333, skill: 92.5, delta: 9.416666666666671, tiedCount: 1 };
  const globals = { benchmark, isWriting: false, isOverall: false, BASELINE_SHORT: 'Plain', SCORE_MAXIMUM: 100,
    COMBINED_CAPABILITY: { id: 'overall' }, data: { benchmarkResults: [{ benchmarkId: 'field', settingId: 'top' }, { benchmarkId: 'field', settingId: 'other' }] },
    benchmarkSummaryById: new Map([['field', summary]]), categoryById: new Map([['engineering', { name: 'Engineering' }]]), benchmarkTopModelFor: () => leader };
  const before = JSON.stringify({ summary, leader });
  const render = () => vm.runInNewContext(`${formatters}\n${topRenderers}\n${declaration('benchmarkLedgerRowMarkup')}\nbenchmarkLedgerRowMarkup(benchmark,0,'engineering')`, { ...globals });
  const html = render();
  assert.match(html, /data-baseline-score="78\.3"/); assert.match(html, /data-treatment-score="84\.0"/);
  assert.match(html, /<b>\+5\.7<small> pts<\/small><\/b>/);
  assert.match(html, /data-top-model-baseline>83\.1<\/b>/); assert.match(html, /data-top-model-skill>92\.5<\/b>/); assert.match(html, /data-top-model-delta>\+9\.4<\/b>/);
  assert.equal((html.match(/data-benchmark-top-model/g) || []).length, 1);
  globals.benchmarkTopModelFor = () => null;
  const noLeader = render(); assert.doesNotMatch(noLeader, /data-benchmark-top-model/); assert.match(noLeader, /<b>\+5\.7<small> pts<\/small><\/b>/);
  assert.equal(JSON.stringify({ summary, leader }), before);
});

const published = { window: {} };
for (const name of ['data.js', 'writing-data.js']) vm.runInNewContext(fs.readFileSync(new URL(`../site/vasirbenchmark.com/${name}`, import.meta.url), 'utf8'), published);
const engineering = freeze(published.window.VASIR_DATA), writing = freeze(published.window.VASIR_WRITING);
const publications = [writing, ...(writing.benchmarkPublications || []).map(item => item.projection), ...Object.values(writing.additionalBenchmarks || {})];
const exact = entry => Object.hasOwn(entry, 'exactScore') ? entry.exactScore : entry.score;
function independentLeader(settings, entries) {
  const candidates = entries.filter(entry => entry.condition === 'skill' && entry.eligibleForRank !== false && entry.partial !== true && entry.complete !== false && Number.isFinite(exact(entry)))
    .flatMap(skill => {
      const setting = settings.find(item => item.id === skill.settingId), baseline = entries.find(entry => entry.settingId === skill.settingId && entry.condition === 'baseline');
      if (!setting || !baseline || baseline.eligibleForRank === false || baseline.partial === true || baseline.complete === false || !Number.isFinite(exact(baseline))) return [];
      return [{ setting, baseline: exact(baseline), skill: exact(skill) }];
    });
  const maximum = Math.max(...candidates.map(candidate => candidate.skill));
  const tied = candidates.filter(candidate => candidate.skill === maximum).sort((left, right) => left.setting.configurationId < right.setting.configurationId ? -1 : left.setting.configurationId > right.setting.configurationId ? 1 : 0);
  return { ...tied[0], tiedCount: tied.length };
}

test('all four current Writing benchmark leaders come from their own complete paired publication basis', () => {
  const expected = {
    'storytelling-core-idea': ['codex:gpt-6-astra@max', 83.08333333333333, 92.5, 1],
    'storytelling-plot-twists': ['codex:gpt-6-astra@ultra', 81.925, 97.875, 1],
    'storytelling-magic-discovery': ['codex:gpt-6-astra@high', 92.25, 97.91666666666667, 2],
    'dungeon-master-adventure-outline': ['codex:gpt-5.6-sol@ultra', 75.55555555555556, 98.05555555555556, 1]
  };
  const before = JSON.stringify(writing);
  for (const publication of publications) {
    const id = publication.benchmarks[0].id, projection = context.buildWritingCategoryCollection(publication, id);
    const leader = select(projection.settings, projection.entries), independent = independentLeader(projection.settings, projection.entries);
    assert.equal(leader.configurationId, expected[id][0]); near(leader.baseline, expected[id][1]); near(leader.skill, expected[id][2]); assert.equal(leader.tiedCount, expected[id][3]);
    assert.equal(leader.settingId, independent.setting.id); assert.equal(leader.baseline, independent.baseline); assert.equal(leader.skill, independent.skill); assert.equal(leader.tiedCount, independent.tiedCount); near(leader.delta, independent.skill - independent.baseline);
  }
  assert.equal(JSON.stringify(writing), before);
});

test('Engineering and AI Workflow leaders use benchmark-local score pairs rather than category aggregates', () => {
  const expected = { 'hyper-scale-chat': ['codex:gpt-5.6-sol@xhigh', 49, 85, 1], 'personalized-home-feed': ['codex:gpt-6-astra@high', 59, 82.5, 1], 'device-telemetry': ['codex:gpt-5.6-sol@max', 49, 98.8, 2], 'work-spec-chat': ['codex:gpt-6-astra@ultra', 96.25, 100, 2] };
  const before = JSON.stringify(engineering);
  for (const source of [engineering, engineering.aiWorkflows]) for (const benchmark of source.benchmarks) {
    const entries = source.benchmarkResults.filter(entry => entry.benchmarkId === benchmark.id), leader = select(source.settings, entries), independent = independentLeader(source.settings, entries), wanted = expected[benchmark.id];
    assert.equal(leader.configurationId, wanted[0]); near(leader.baseline, wanted[1]); near(leader.skill, wanted[2]); assert.equal(leader.tiedCount, wanted[3]);
    assert.equal(leader.settingId, independent.setting.id); assert.equal(leader.baseline, independent.baseline); assert.equal(leader.skill, independent.skill); assert.equal(leader.tiedCount, independent.tiedCount);
  }
  assert.equal(JSON.stringify(engineering), before);
});
