import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../site/vasirbenchmark.com/style.css', import.meta.url), 'utf8');
const declaration = name => {
  const start = app.indexOf(`  const ${name} = `);
  assert.ok(start >= 0, `${name} must be present.`);
  return app.slice(start, app.indexOf('\n  const ', start + 1));
};
const formatters = app.slice(app.indexOf('  const escapeHtml = '), app.indexOf('  const scoreFor = '));

test('all category pages share one frame, header and accessible mode-tab structure', () => {
  const context = vm.createContext({ state: { capabilityMode: 'models' }, capabilitySelectorMarkup: () => '<nav>Categories</nav>' });
  vm.runInContext(formatters + ['capabilityHeaderFrameMarkup', 'capabilityTabsMarkup', 'capabilityFrameMarkup'].map(declaration).join('\n'), context);
  for (const name of ['Overall', 'Engineering', 'Writing', 'AI Workflows', 'Games']) {
    context.name = name;
    const html = vm.runInContext(`
      capabilityFrameMarkup({
        category: { id: name.toLowerCase().replaceAll(' ', '-'), color: '#000' },
        heading: capabilityHeaderFrameMarkup({ name, identityLabel: 'Capabilities / ' + name, disclosure: 'Published scores', summary: '33 settings', readings: '<div>Leader</div>' })
          + capabilityTabsMarkup(name, [['models', 'Leaderboard', '33 settings', 'capability-ranking'], ['benchmarks', 'Benchmark tests', '4 tests', 'capability-benchmarks']]),
        ranking: '<section id="capability-ranking"></section>',
        benchmarks: '<section id="capability-benchmarks" hidden></section>',
        efficiency: ''
      });`, context);
    assert.match(html, /id="capability-field-panel"\s+role="tabpanel"/);
    assert.match(html, /<h3 id="capability-question" tabindex="-1">/);
    assert.match(html, /<\/header>\s*<nav class="capability-mode"/);
    assert.match(html, /id="capability-mode-models"[^>]*aria-selected="true"[^>]*aria-controls="capability-ranking"[^>]*tabindex="0"/);
    assert.match(html, /id="capability-mode-benchmarks"[^>]*aria-selected="false"[^>]*tabindex="-1"/);
    assert.equal((html.match(/class="capability-canvas__header/g) || []).length, 1);
  }
  assert.match(declaration('capabilityHeaderMarkup'), /return capabilityHeaderFrameMarkup\(/);
  assert.match(declaration('gameHeaderMarkup'), /return capabilityHeaderFrameMarkup\(/);
  assert.match(declaration('capabilityModeMarkup'), /capabilityTabsMarkup\(/);
  assert.match(declaration('gameModeMarkup'), /capabilityTabsMarkup\(/);
  assert.match(declaration('renderCapabilities'), /capabilityFrameMarkup\(/);
});

function pairedRow(isWriting, zero = false) {
  const categories = [
    { id: 'storytelling', name: 'Storytelling', short: 'Story', weight: 0.7, color: '#933' },
    { id: 'prose', name: 'Prose', short: 'Prose', weight: 0.3, color: '#339' }
  ];
  const entry = (condition, readings, rank) => {
    const exactScore = readings.reduce((sum, score, index) => sum + score * categories[index].weight, 0);
    return { id: `writer-${condition}`, settingId: 'writer', family: 'Writer', reasoning: 'high', condition, exactScore, score: Math.round(exactScore * 10) / 10, rank,
      categories: categories.map((category, index) => ({ category: category.id, score: Math.round(readings[index] * 10) / 10, exactScore: readings[index], exactContribution: readings[index] * category.weight })) };
  };
  const baseline = entry('baseline', [50, 0], 2);
  const full = entry('skill', zero ? [0, 0] : [80, 50.781666666666666], 1);
  full.delta = Math.round((full.exactScore - baseline.exactScore) * 10) / 10;
  const context = vm.createContext({
    data: { categories }, isWriting, isOverall: !isWriting,
    baselineBySetting: new Map([['writer', baseline]]),
    conditionById: new Map([['baseline', { label: 'Plain answer' }], ['skill', { label: 'Task-specific skill' }]]),
    conditionVisualClass: condition => condition === 'baseline' ? 'baseline' : 'full',
    COMPOSITE_SCORE_SCALE: value => value, selectedEntry: () => full, full,
    baselineRanks: new Map([[baseline.id, 2]]), fullRanks: new Map([[full.id, 1]]),
    SCORE_EDITION_LABEL: 'Named benchmark', SCORE_MINIMUM: 0, SCORE_MAXIMUM: 100,
    SETTING_COUNT: 3, RANKED_SETTING_COUNT: 2, TREATMENT_LABEL: 'Task-specific skill', BASELINE_LABEL: 'Plain answer', taskCoverageLabel: 'Named benchmark'
  });
  const helpers = ['weightedComposition', 'weightedCompositionDescription', 'pairedProfileMarkup', 'capabilityCompositionMarkup', 'settingRowMarkup'];
  vm.runInContext(formatters + helpers.map(declaration).join('\n'), context);
  return vm.runInContext('settingRowMarkup(full, baselineRanks, fullRanks)', context);
}

function dumbbellRow(isWriting, zero = false, partial = false) {
  const baseline = { id: 'writer-baseline', settingId: 'writer', score: 35, exactScore: 35, partial };
  const full = { id: 'writer-skill', settingId: 'writer', family: 'Writer', reasoning: 'high', score: zero ? 0 : 71.2, exactScore: zero ? 0 : 71.2345, delta: zero ? -35 : 36.2, exactDelta: zero ? -35 : 36.2345, partial };
  const context = vm.createContext({
    full, isWriting, isWorkSpec: false,
    baselineBySetting: new Map([['writer', baseline]]), scoreFor: entry => entry.score, selectedEntry: () => full,
    baselineRanking: { ranks: new Map([[baseline.id, 2]]) }, fullRanking: { ranks: new Map([[full.id, 1]]) },
    category: { id: isWriting ? 'writing' : 'engineering', name: isWriting ? 'Writing' : 'Engineering', color: '#333' },
    SCORE_EDITION_LABEL: 'Named score', SCORE_MAXIMUM: 100, TASK_COUNT: 3, RANKED_SETTING_COUNT: 2, TREATMENT_LABEL: 'Task-specific skill', BASELINE_LABEL: 'Plain answer'
  });
  vm.runInContext(formatters + declaration('formatEntryScore') + declaration('capabilityRankRowMarkup'), context);
  return vm.runInContext('capabilityRankRowMarkup(full, baselineRanking, fullRanking, category)', context);
}

test('Writing and Engineering reuse the same compact single-track rows and marker positions', () => {
  const writing = dumbbellRow(true);
  const engineering = dumbbellRow(false);
  const geometry = html => html.match(/style="([^"]+)"/)[1];
  assert.equal(geometry(writing), geometry(engineering));
  assert.match(writing, /--baseline-score:35%;--full-score:71.2%;/);
  assert.match(writing, /data-exact-skill="71.2345"/);
  assert.match(writing, /data-exact-delta="36.2345"/);
  assert.match(writing, /data-full-score="71.2"/);
  assert.match(writing, /data-baseline-score="35.0"/);
  assert.match(writing, /data-delta="36.2"/);
  assert.equal((writing.match(/class="capability-rank-row__track"/g) || []).length, 1);
  assert.equal((writing.match(/capability-rank-row__marker--baseline/g) || []).length, 1);
  assert.equal((writing.match(/capability-rank-row__marker--full/g) || []).length, 1);
  assert.doesNotMatch(writing, /capability-composition|setting-row__pair/);
  assert.match(writing, /aria-pressed="true"/);
  assert.match(writing, /rank 1 of 2/);
  assert.match(declaration('renderCapabilities'), /category\.isCombined \? combinedLeaderboardMarkup\(\)/);
  assert.doesNotMatch(declaration('renderCapabilities'), /category\.isCombined \|\| isWriting/);
});

test('Overall retains its existing stacked category profiles', () => {
  const overall = pairedRow(false);
  const widths = html => [...html.matchAll(/--segment-width: ([0-9.]+)%/g)].map(match => Number(match[1]));
  assert.deepEqual(widths(overall), [56, 15.2345, 35, 0]);
  assert.equal((overall.match(/role="toolbar"/g) || []).length, 2);
  assert.equal((overall.match(/tabindex="0"/g) || []).length, 2);
});

test('partial Writing means mark both score labels and retain finite marker geometry', () => {
  const partial = dumbbellRow(true, false, true);
  assert.match(partial, /data-partial="true"/);
  assert.match(partial, /<strong>35\.0\*<\/strong>/);
  assert.match(partial, /<strong>71\.2\*<\/strong>/);
  assert.match(partial, /--baseline-score:35%;--full-score:71.2%/);
  assert.match(partial, /Asterisk: available-score mean; some tests are missing/);
  assert.doesNotMatch(dumbbellRow(false, false, true), /71\.2\*/);
  assert.doesNotMatch(declaration('writingLeaderboardControlsMarkup'), /Unranked settings|complete paired settings|2\/3|writing-leaderboard-coverage/);
  assert.match(declaration('renderCapabilities'), /\* Incomplete results are shown separately, without a rank\./);
  assert.match(declaration('writingIncompleteResultsMarkup'), /partial means are not comparable to the ranked aggregate/);
});

test('measured zero remains a numeric total and bar; rejected placeholder and provisional overview layouts are absent', () => {
  const zero = pairedRow(false, true);
  assert.match(zero, /data-full-score="0.0"/);
  assert.match(zero, /data-composite-exact-score="0"/);
  assert.match(zero, /class="capability-composition__total">0.0</);
  assert.match(zero, /setting-row__delta--negative/);
  const writingZero = dumbbellRow(true, true);
  assert.match(writingZero, /--full-score:0%/);
  assert.match(writingZero, /data-exact-skill="0"/);
  assert.match(writingZero, /capability-rank-row__marker--full/);
  assert.doesNotMatch(app, /const writingPartialCoverageMarkup|const writingHeaderMarkup|const writingProvisionalSummaryMarkup|data-writing-partial-coverage/);
  assert.doesNotMatch(css, /\.writing-partial|\.writing-index-gaps/);
  assert.match(declaration('combinedLeaderboardMarkup'), /visible\.map\(\(entry\) => settingRowMarkup/);
});

test('missing resource values cannot dominate measured frontier points or become an invented zero-percent comparison', () => {
  const baseline = { id: 'base', settingId: 'writer', score: 60, latency: 10 };
  const points = [baseline, { id: 'better', settingId: 'better', score: 80, latency: 20 }, { id: 'missing', settingId: 'missing', score: 100, latency: null }];
  const context = vm.createContext({
    data: { entries: points }, state: { metric: 'latency' }, baselineBySetting: new Map([['writer', baseline]]),
    scoreFor: entry => entry.score, plotScoreFor: entry => entry.score, BASELINE_SHORT: 'Plain'
  });
  vm.runInContext(['efficientFrontier', 'resourceDeltaPercent', 'resourceComparison'].map(declaration).join('\n'), context);
  assert.equal(vm.runInContext("efficientFrontier('writing', 'latency').map(entry => entry.id).join(',')", context), 'base,better');
  assert.equal(vm.runInContext("resourceDeltaPercent({ settingId: 'writer', latency: null })", context), null);
  assert.equal(vm.runInContext("resourceComparison({ settingId: 'writer', latency: null }, 'latency')", context), '');
  assert.equal(vm.runInContext("resourceDeltaPercent({ settingId: 'writer', latency: 0 })", context), -100);
  assert.equal(vm.runInContext("resourceComparison({ settingId: 'writer', latency: 0 }, 'latency')", context), '−100% vs Plain');
});

test('partial means cannot determine leaderboard ranks, headline uplift or the efficiency frontier', () => {
  const entries = [
    { id: 'complete-baseline', settingId: 'complete', condition: 'baseline', score: 70, exactScore: 70, eligibleForRank: true, latency: 10 },
    { id: 'complete-skill', settingId: 'complete', condition: 'skill', score: 80, exactScore: 80, exactDelta: 10, eligibleForRank: true, latency: 20 },
    { id: 'partial-baseline', settingId: 'partial', condition: 'baseline', score: 0, exactScore: 0, eligibleForRank: false, latency: 1 },
    { id: 'partial-skill', settingId: 'partial', condition: 'skill', score: 99, exactScore: 99, exactDelta: 99, eligibleForRank: false, latency: 1 }
  ];
  const context = vm.createContext({
    data: { entries, conditions: [{ id: 'baseline' }, { id: 'skill' }] },
    isWriting: true, isOverall: false, isWorkSpec: false,
    rankingScoreFor: entry => entry.exactScore, scoreFor: entry => entry.score, plotScoreFor: entry => entry.exactScore,
    baselineBySetting: new Map(entries.filter(entry => entry.condition === 'baseline').map(entry => [entry.settingId, entry])),
    TREATMENT_CONDITION_ID: 'skill', COMBINED_CAPABILITY: { id: 'overall' }
  });
  vm.runInContext(['conditionRanks', 'rankedCondition', 'combinedOutcomeSummary', 'efficientFrontier'].map(declaration).join('\n'), context);
  assert.equal(vm.runInContext("rankedCondition('skill').entries.map(entry => entry.id).join(',')", context), 'complete-skill');
  assert.equal(vm.runInContext("rankedCondition('skill').ranks.has('partial-skill')", context), false);
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(combinedOutcomeSummary())', context)), { median: 10, improved: 1, regressed: 0, unchanged: 0, total: 1 });
  assert.equal(vm.runInContext("efficientFrontier('overall', 'latency').map(entry => entry.id).join(',')", context), 'complete-baseline,complete-skill');
  const partial = dumbbellRow(true, false, true);
  assert.match(partial, /data-full-rank="null"/);
  assert.match(partial, /data-baseline-rank="null"/);
  assert.doesNotMatch(partial, /<small>#\d/);
});

test('Writing partial coverage is closed by default but keeps selected partials and inspection rows accessible', () => {
  const entries = [{ id: 'partial-skill', settingId: 'partial', condition: 'skill', partial: true, family: 'Writer', reasoning: 'high' }];
  const context = vm.createContext({ data: { entries }, TREATMENT_CONDITION_ID: 'skill', selectedEntry: () => ({ settingId: 'complete' }),
    capabilityRankRowMarkup: entry => `<li data-setting-id="${entry.settingId}"><button>Inspect exact scores and missing tests</button></li>` });
  vm.runInContext(declaration('writingIncompleteResultsMarkup'), context);
  const render = () => vm.runInContext("writingIncompleteResultsMarkup({id:'writing'})", context);
  const closed = render();
  assert.match(closed, /<details class="overall-coverage writing-incomplete-results"/);
  assert.match(closed, /<summary[^>]*>Model coverage <span>1 settings have partial coverage/);
  assert.doesNotMatch(closed.split('>')[0], /\sopen(?:\s|$)/);
  assert.match(closed, /data-setting-id="partial"/);
  assert.match(closed, /Inspect exact scores and missing tests/);
  context.selectedEntry = () => ({ settingId: 'partial' });
  assert.match(render().split('>')[0], /\sopen$/);
  context.data.entries = [];
  assert.equal(render(), '');
});
