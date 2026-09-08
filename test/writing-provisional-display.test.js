import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const globals = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-data.js', import.meta.url), 'utf8'), globals);
const source = globals.window.VASIR_WRITING;
const clone = value => JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
};
const declaration = name => {
  const start = app.indexOf(`  const ${name} = `);
  assert.ok(start >= 0, `${name} must be present.`);
  return app.slice(start, app.indexOf('\n  };', start) + '\n  };'.length);
};
const formatters = app.slice(app.indexOf('  const escapeHtml = '), app.indexOf('  const scoreFor = '));
function render(publication = source, isWriting = true) {
  const context = vm.createContext({
    data: { writingCategory: { publications: [publication] } }, isWriting,
    conditionVisualClass: condition => condition === 'baseline' ? 'baseline' : 'full',
    COMPOSITE_SCORE_SCALE: value => value,
  });
  vm.runInContext(`${formatters}\n${declaration('writingProvisionalSummaryMarkup')}\n${declaration('writingProvisionalMarkup')}
    globalThis.summary = writingProvisionalSummaryMarkup();
    globalThis.table = writingProvisionalMarkup(data.writingCategory.publications[0].benchmarks[0]);`, context);
  return { summary: context.summary, table: context.table };
}
const attribute = (markup, name) => markup.match(new RegExp(`${name}="([^"]*)"`))?.[1];

test('Writing leaderboard shows the provisional summary before its separate category index', () => {
  const { summary } = render();
  assert.match(summary, /Core idea — Astra-only provisional results/);
  assert.match(summary, /31 settings · 12 stories · 1 judge/);
  assert.match(summary, /Plain <strong>78\.3<\/strong>/);
  assert.match(summary, /Skill <strong>84\.0<\/strong>/);
  assert.match(summary, /\+5\.7 pts/);
  assert.match(summary, /excluded from the Writing development index below and from Overall/);
  assert.match(summary, /href="\?writing=storytelling-core-idea#capabilities\/writing\/benchmarks"/);
  assert.doesNotMatch(summary, /<details|<[^>]*\shidden(?:[ =>])|data-writing-provisional-setting=/);
  const combined = declaration('combinedLeaderboardMarkup');
  assert.ok(combined.indexOf('${writingProvisionalSummaryMarkup()}') < combined.indexOf('<section class="score-field'));
  assert.doesNotMatch(combined, /writingProvisionalMarkup\(/, 'The full table must remain a single benchmark comparison.');
});

test('the shared comparison renders 31 numeric pairs and two unranked diagnostics without changing official results', () => {
  const publication = freeze(clone(source));
  const before = JSON.stringify(publication);
  const { table } = render(publication);
  assert.equal(JSON.stringify(publication), before);
  const rows = [...table.matchAll(/<li class="setting-row"[\s\S]*?<\/li>/g)].map(match => match[0]);
  const ranked = publication.provisionalLeaderboard.entries.filter(entry => entry.condition === 'skill' && entry.eligibleForRank)
    .sort((a, b) => b.exactScore - a.exactScore || a.id.localeCompare(b.id));
  assert.equal(rows.length, 31);
  assert.deepEqual(rows.map(row => attribute(row, 'data-writing-provisional-setting')), ranked.map(entry => entry.settingId));
  rows.forEach((row, index) => {
    const entry = ranked[index];
    const baseline = publication.provisionalLeaderboard.entries.find(item => item.settingId === entry.settingId && item.condition === 'baseline');
    for (const [key, value] of [['data-baseline-score', baseline.score], ['data-full-score', entry.score], ['data-delta', entry.delta]]) {
      assert.equal(attribute(row, key), value.toFixed(1));
      assert.ok(Number.isFinite(Number(attribute(row, key))));
    }
    assert.equal(attribute(row, 'data-baseline-rank'), String(baseline.rank));
    assert.equal(attribute(row, 'data-full-rank'), String(entry.rank));
    assert.match(row, new RegExp(`benchmark-report\\.html\\?setting=${entry.settingId}#storytelling-core-idea/`));
  });
  assert.equal(ranked[0].configurationId, 'codex:gpt-6-astra@max');
  const incomplete = [...table.matchAll(/<li data-writing-provisional-incomplete="[\s\S]*?<\/li>/g)].map(match => match[0]);
  assert.equal(incomplete.length, 2);
  incomplete.forEach(row => {
    assert.equal(attribute(row, 'data-full-rank'), '');
    assert.equal(attribute(row, 'data-baseline-rank'), '');
    assert.match(row, /11\/12 stories/);
    assert.match(row, /rank —/);
  });
  assert.ok(publication.entries.every(entry => entry.exactScore === null && entry.rank === null));
});

test('comparison uses exact scores for ordering, retains ties, escapes labels, and leaves missing scores unavailable', () => {
  const publication = clone(source);
  const entries = publication.provisionalLeaderboard.entries.slice(0, 6);
  const skill = entries.filter(entry => entry.condition === 'skill');
  skill.forEach((entry, index) => Object.assign(entry, { exactScore: index ? 85.041 : 85.04, score: 85, rank: index ? 1 : 3 }));
  publication.provisionalLeaderboard.entries = entries;
  publication.provisionalLeaderboard.rankedSettingCount = 3;
  const escaped = skill[1];
  escaped.family = '<script>alert("answer")</script>';
  publication.provisionalLeaderboard.incompleteSettings[0].scores.baseline = null;
  const { table } = render(publication);
  const ordered = [...table.matchAll(/<li class="setting-row"[\s\S]*?<\/li>/g)].map(match => match[0]);
  assert.equal(attribute(ordered.at(-1), 'data-writing-provisional-setting'), skill[0].settingId);
  assert.deepEqual(ordered.map(row => attribute(row, 'data-full-rank')), ['1', '1', '3']);
  assert.doesNotMatch(table, /<script>/);
  assert.match(table, /&lt;script&gt;alert\(&quot;answer&quot;\)&lt;\/script&gt;/);
  const incomplete = table.match(/<li data-writing-provisional-incomplete="[\s\S]*?<\/li>/)[0];
  assert.equal(attribute(incomplete, 'data-baseline-score'), '—');
});

test('the summary disappears when provisional evidence ends or Writing is not selected', () => {
  const publication = clone(source);
  publication.provisionalLeaderboard = null;
  assert.deepEqual(render(publication), { summary: '', table: '' });
  assert.deepEqual(render(source, false), { summary: '', table: '' });
});

test('the summary destination opens the existing full comparison directly', () => {
  const benchmarkId = 'storytelling-core-idea';
  const details = { open: false };
  const benchmark = { focus() {}, scrollIntoView() {} };
  const start = app.indexOf("  if (isWriting && state.capabilityMode === 'benchmarks' && requestedWritingBenchmark");
  const end = app.indexOf('  if (window.history.state?.focusCapability', start);
  assert.ok(start > 0 && end > start);
  vm.runInNewContext(app.slice(start, end), {
    isWriting: true, state: { capabilityMode: 'benchmarks' }, requestedWritingBenchmark: benchmarkId,
    benchmarkById: new Map([[benchmarkId, {}]]), CSS: { escape: value => value },
    window: { requestAnimationFrame: callback => callback() },
    document: { querySelector: selector => selector.includes('data-writing-provisional-benchmark') ? details : benchmark },
  });
  assert.equal(details.open, true);
});
