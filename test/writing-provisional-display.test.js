import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { acceptedWritingRankingFixture } from './fixtures/writing-ranking-accepted-20260908.js';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
// Preserve the originally accepted partial/provisional examples as later
// executions complete. Current source parity is checked separately.
const source = acceptedWritingRankingFixture();
const clone = value => JSON.parse(JSON.stringify(value));
const declaration = name => {
  const start = app.indexOf(`  const ${name} = `);
  assert.ok(start >= 0, `${name} must be present.`);
  return app.slice(start, app.indexOf('\n  const ', start + 1));
};
const formatters = app.slice(app.indexOf('  const escapeHtml = '), app.indexOf('  const scoreFor = '));
const attribute = (markup, name) => markup.match(new RegExp(`${name}="([^"]*)"`))?.[1];

function render(publication = source, isWriting = true, settingId = publication.settings[0].id, selectionId = publication.benchmarks[0].id) {
  const benchmark = publication.benchmarks[0];
  const projectionContext = vm.createContext({ publication, benchmarkId: selectionId });
  vm.runInContext(app.slice(0, app.indexOf('(async function () {')), projectionContext);
  const data = vm.runInContext('buildWritingCategoryCollection(publication, benchmarkId)', projectionContext);
  const context = vm.createContext({
    data, scoreBasis: data.scoreBasis,
    isWriting, isOverall: false, isWorkSpec: false, overallWritingCategory: null, benchmark, categoryById: new Map(), BASELINE_SHORT: 'Plain', BASELINE_CONDITION_ID: 'baseline', TREATMENT_CONDITION_ID: 'skill',
    TREATMENT_LABEL: 'Task-specific skill', BASELINE_LABEL: 'Plain answer', scoreFor: entry => entry.score,
    benchmarkSummaryById: new Map(data.benchmarkSummaries.map(summary => [summary.benchmarkId, summary])),
    COMBINED_CAPABILITY: { id: 'overall' }, SCORE_MAXIMUM: 100,
    selectedEntry: () => data.entries.find(entry => entry.settingId === settingId && entry.condition === 'skill'),
    baselineBySetting: new Map(data.entries.filter(entry => entry.condition === 'baseline').map(entry => [entry.settingId, entry])),
    benchmarkById: new Map(data.benchmarks.map(benchmark => [benchmark.id, benchmark])),
    conditionVisualClass: condition => condition === 'baseline' ? 'baseline' : 'full',
    COMPOSITE_SCORE_SCALE: value => value,
  });
  const names = ['formatEntryScore', 'categoryBenchmarks', 'writingBenchmarkDisplay', 'capabilityRankRowMarkup', 'writingMethodMarkup', 'benchmarkTopModels', 'benchmarkTopModelFor', 'formatBenchmarkTopScore', 'benchmarkTopModelMarkup', 'benchmarkLedgerRowMarkup', 'writingSelectionMarkup'];
  vm.runInContext(`${app.slice(0, app.indexOf('(async function () {'))}\n${formatters}\n${names.map(declaration).join('\n')}
    globalThis.display = writingBenchmarkDisplay(benchmark);
    globalThis.method = writingMethodMarkup();
    globalThis.ledger = benchmarkLedgerRowMarkup(benchmark, 0, 'writing');
    globalThis.selection = writingSelectionMarkup();`, context);
  return { display: context.display, method: context.method, ledger: context.ledger, selection: context.selection, data };
}

test('Core field means appear in the benchmark ledger with their exact provisional source', () => {
  const before = JSON.stringify(source);
  const { display, ledger, method } = render();
  assert.equal(display.sourceKind, 'provisional-single-judge');
  assert.equal(display.sourceLabel, 'Astra-only · 31 settings · 12 stories');
  assert.equal(attribute(ledger, 'data-baseline-score'), source.provisionalLeaderboard.summary.baseline.toFixed(1));
  assert.equal(attribute(ledger, 'data-treatment-score'), source.provisionalLeaderboard.summary.treatment.toFixed(1));
  assert.match(ledger, /Astra-only · 31 settings · 12 stories/);
  assert.match(ledger, /data-writing-setting-count="31"/);
  assert.match(ledger, /data-writing-judge-count="1"/);
  assert.match(ledger, /1 review \/ answer/);
  assert.doesNotMatch(ledger, /Provisional single-judge scores|weight in Core idea|provisional basis/);
  assert.match(method, /<summary>Methodology<\/summary>/);
  assert.match(method, /single-judge|provisional status/);
  assert.match(method, /Writing is excluded from Overall/);
  assert.doesNotMatch(method, /<details[^>]*\bopen\b/);
  assert.doesNotMatch(declaration('combinedLeaderboardMarkup'), /writingProvisional|writingPartial|writingCoverage/);
  assert.equal(JSON.stringify(source), before, 'Presentation must not rewrite the official null totals or source evidence.');
});

test('Core keeps its uniform source and incomplete records without an inline duplicate leaderboard', () => {
  const { data, display } = render();
  assert.equal(display.availableProvisional.rankedSettingCount, 31);
  assert.equal(display.availableProvisional.incompleteSettings.length, 2);
  assert.ok(display.availableProvisional.incompleteSettings.every(item => item.completedPairCount === 11 && item.expectedPairCount === 12));
  assert.equal(data.writingCategory.selection.provisional, true);
  assert.doesNotMatch(app, /const writingProvisionalMarkup|data-writing-provisional-benchmark=/);
  const ledger = declaration('benchmarkLedgerMarkup');
  assert.match(ledger, /writingBenchmarkModelLinkMarkup/);
  assert.doesNotMatch(ledger, /writingSelectionMarkup|writing-benchmark-model-control|writing-provisional|writing-exact-aggregate/);
});

test('source selection prefers official means, including a real zero, as soon as they are published', () => {
  const publication = clone(source);
  Object.assign(publication.benchmarkSummaries[0], { baseline: 0, treatment: 0, delta: 0 });
  const { display, ledger } = render(publication);
  assert.equal(display.sourceKind, 'official-panel');
  assert.equal(display.provisional, null);
  assert.equal(attribute(ledger, 'data-baseline-score'), '0.0');
  assert.equal(attribute(ledger, 'data-treatment-score'), '0.0');
  assert.ok(display.availableProvisional, 'The declared provisional evidence is retained even when official means become available.');
  assert.doesNotMatch(ledger, /Provisional single-judge/);
});

test('selected model components retain exact source scores and escaped source-qualified answer links', () => {
  const publication = clone(source);
  const entries = publication.provisionalLeaderboard.entries.slice(0, 6);
  const skill = entries.filter(entry => entry.condition === 'skill');
  skill.forEach((entry, index) => Object.assign(entry, { exactScore: index ? 85.041 : 85.04, score: 85, rank: index ? 1 : 3 }));
  publication.benchmarks[0].name = '<script>alert("answer")</script>';
  publication.provisionalLeaderboard.entries = entries;
  publication.provisionalLeaderboard.rankedSettingCount = 3;
  const { selection } = render(publication, true, skill[0].settingId);
  assert.doesNotMatch(selection, /<script>/);
  assert.match(selection, /&lt;script&gt;alert\(&quot;answer&quot;\)&lt;\/script&gt;/);
  assert.match(selection, /Provisional · 1 judge · Astra-only/);
  assert.match(selection, /data-writing-component="storytelling-core-idea"/);
  assert.match(selection, /data-exact-skill="85.04"/);
  assert.match(selection, /data-weight="1"/);
  assert.match(selection, /^<details class="writing-selection"[^>]*>/);
  assert.doesNotMatch(selection.match(/^<details[^>]*>/)[0], /\bopen\b/);
  assert.match(selection, /<summary[^>]*>Scores &amp; answers/);
  assert.match(selection, new RegExp(`benchmark-report\\.html\\?setting=${skill[0].settingId}#storytelling-core-idea/`));
  assert.doesNotMatch(selection, /—/);
});

test('missing means and incomplete answer cohorts expose evidence without invented numeric pairs', () => {
  const publication = clone(source);
  publication.provisionalLeaderboard = null;
  const { ledger, display, selection } = render(publication);
  assert.equal(display.availableProvisional, null);
  assert.match(ledger, /Answers &amp; reviews/);
  assert.doesNotMatch(ledger.match(/<span class="benchmark-ledger__comparison">[\s\S]*?<\/span>/)[0], /—|0\.0/);
  assert.doesNotMatch(selection, /—|0\.0 → 0\.0/);
  assert.equal(render(source, false).selection, '');
});

test('available-score means show only contributing components with their actual weights and divisor', () => {
  for (const [settingId, expectedCount] of [['codex-gpt-6-astra-high', 2], ['claude-claude-opus-5-max', 1], ['codex-gpt-5-6-sol-ultra', 3]]) {
    const { selection, data } = render(source, true, settingId, 'storytelling');
    const entry = data.entries.find(entry => entry.settingId === settingId && entry.condition === 'skill');
    assert.ok(entry, settingId);
    assert.equal((selection.match(/data-writing-component=/g) || []).length, expectedCount);
    const weights = [...selection.matchAll(/data-weight="([^"]+)"/g)].map(match => Number(match[1]));
    assert.ok(weights.every(weight => Math.abs(weight - 1 / expectedCount) < 1e-12));
    assert.match(selection, new RegExp(`data-partial="${expectedCount < 3}"`));
    assert.match(selection, new RegExp(`data-exact-skill="${entry.exactScore}"`));
    if (expectedCount > 1) assert.match(selection, new RegExp(`÷ ${expectedCount} ≈`));
    if (expectedCount < 3) assert.match(selection, /\d+\.\d\*/);
    assert.doesNotMatch(selection, /Incomplete: a score is required|Paired score incomplete/);
  }
});

test('benchmark deep links focus the corresponding row without opening extra panels', () => {
  const benchmarkId = 'storytelling-core-idea';
  const details = { open: false };
  const benchmark = { focus() {}, scrollIntoView() {} };
  const start = app.indexOf("  if (isWriting && state.capabilityMode === 'benchmarks' && requestedWritingBenchmark");
  const end = app.indexOf('  if (window.history.state?.focusCapability', start);
  vm.runInNewContext(app.slice(start, end), {
    isWriting: true, state: { capabilityMode: 'benchmarks' }, requestedWritingBenchmark: benchmarkId,
    benchmarkById: new Map([[benchmarkId, {}]]), CSS: { escape: value => value },
    window: { requestAnimationFrame: callback => callback() },
    document: { querySelector: selector => selector.includes('data-writing-provisional-benchmark') ? details : benchmark },
  });
  assert.equal(details.open, false);
});
