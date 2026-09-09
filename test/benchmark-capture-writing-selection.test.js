import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../site/vasirbenchmark.com/capture.mjs', import.meta.url), 'utf8');
const selectionSource = source.match(/const expectedWritingSelection = ([^;]+);/)[1];
const editionSource = source.slice(source.indexOf('const editionMatches = ') + 'const editionMatches = '.length, source.indexOf('\n      let key = step.key;')).trim().replace(/;$/, '');
const requestedSelection = url => vm.runInNewContext(selectionSource, { pageUrl: new URL(url) });

function accepts(url, actualSelection, { title = 'Pinned scope', text = 'Pinned scope · Published benchmark results', provisional = true,
  selectedControl = actualSelection, methodPresent = true, methodOpen = false, methodSummary = 'Methodology', methodText = 'Pinned provisional source qualification' } = {}) {
  const expression = vm.runInNewContext(editionSource, { category: 'writing', expectedWritingSelection: requestedSelection(url) });
  return vm.runInNewContext(expression, {
    window: { VASIR_WRITING_CATEGORY: { writingCategory: { selection: { id: actualSelection, title } }, scoreBasis: { provisional } } },
    document: { querySelector: selector => selector === '#writing-score-selection' ? { value: selectedControl }
      : selector === '.capability-canvas__status' ? { textContent: text }
        : methodPresent ? { open: methodOpen, textContent: methodText, querySelector: () => ({ textContent: methodSummary }) } : null }
  });
}

test('canonical Writing navigation requires All Writing for the default route', () => {
  const url = 'https://vasirbenchmark.com/index.html#capabilities/overall';
  assert.equal(requestedSelection(url), 'all-writing');
  assert.equal(accepts(url, 'all-writing'), true);
  assert.equal(accepts(url, 'storytelling'), false);
  assert.equal(accepts(url, 'dungeon-master'), false);
});

test('canonical Writing navigation preserves exact explicit Storytelling and Dungeon Master selection', () => {
  for (const selected of ['storytelling', 'dungeon-master', 'all-writing']) {
    const url = `https://vasirbenchmark.com/index.html?score=${selected}#capabilities/overall/efficiency`;
    assert.equal(requestedSelection(url), selected);
    assert.equal(accepts(url, selected), true);
    for (const other of ['storytelling', 'dungeon-master', 'all-writing'].filter(id => id !== selected)) assert.equal(accepts(url, other), false);
  }
});

test('canonical selection check binds the clean header and mounted selector to the exact scope', () => {
  const url = 'https://vasirbenchmark.com/index.html';
  assert.equal(accepts(url, 'all-writing', { text: 'Another scope · Published benchmark results' }), false);
  assert.equal(accepts(url, 'all-writing', { text: 'Pinned scope · Provisional comparison' }), false);
  assert.equal(accepts(url, 'all-writing', { selectedControl: 'storytelling' }), false);
  assert.equal(accepts(url, 'all-writing', { selectedControl: null }), false);
});

test('canonical check requires the closed header Methodology disclosure and preserved source qualification', () => {
  const url = 'https://vasirbenchmark.com/index.html';
  assert.equal(Boolean(accepts(url, 'all-writing', { methodPresent: false })), false);
  assert.equal(accepts(url, 'all-writing', { methodOpen: true }), false);
  assert.equal(accepts(url, 'all-writing', { methodSummary: 'Other details' }), false);
  assert.equal(accepts(url, 'all-writing', { provisional: false }), false);
  assert.equal(accepts(url, 'all-writing', { methodText: 'Unqualified source' }), false);
  assert.equal(accepts(url, 'all-writing', { methodText: 'Official source', provisional: false }), true);
});

const navigationStart = source.indexOf('      const writing = window.VASIR_DATA.writing;', source.indexOf('async function auditCategoryNavigation('));
const writingNavigationSource = source.slice(navigationStart, source.indexOf('\n      continue;', navigationStart));
function navigationFixture() {
  const ids = ['core', 'old-twists', 'magic', 'old-dm', 'new-twists', 'place', 'one-shot'];
  const archivedBenchmarkIds = ['old-twists', 'old-dm'];
  const scoreBasis = { id: 'writing-established-storytelling-v1', benchmarkIds: ['core', 'old-twists', 'magic'] };
  return { writing: { benchmarkIds: ids, writingScoreBasis: scoreBasis, catalogCoverage: { benchmarkCount: 7 },
    catalog: ids.map(id => ({ id, archived: archivedBenchmarkIds.includes(id), status: 'measured' })), categoryIndex: { leader: { score: 81.5 } } },
    oracle: { scoreBasis, benchmarkIds: ids, archivedBenchmarkIds, currentBenchmarkIds: ids.filter(id => !archivedBenchmarkIds.includes(id)) },
    label: 'Writing development comparison. 5 published benchmarks. Included in Overall at 25% weight.', edition: 'overall-v3' };
}
function navigationFailures(fixture) {
  const failures = [], attributes = { 'aria-controls': 'capability-field-panel', 'aria-label': fixture.label };
  vm.runInNewContext(writingNavigationSource, { failures, writingCatalogOracle: fixture.oracle,
    window: { VASIR_DATA: { writing: fixture.writing, overall: { scoreBasis: { edition: fixture.edition } } } },
    visible: () => true, text: element => element.textContent,
    tab: { tagName: 'BUTTON', disabled: false, dataset: { categoryStatus: 'development-index' },
      getAttribute: key => attributes[key], hasAttribute: key => Object.hasOwn(attributes, key), querySelector: () => ({ textContent: '81.5/100' }) } });
  return failures;
}

test('canonical navigation counts five current tests while independently retaining the two archived editions', () => {
  const fixture = navigationFixture();
  assert.deepEqual(navigationFailures(fixture), []);
  for (const change of [value => { value.label = value.label.replace('5 published', '7 published'); },
    value => { value.writing.catalog[1].archived = false; }, value => { value.writing.catalog.pop(); },
    value => { value.writing.catalog[4].status = 'planned'; }, value => { value.writing.catalogCoverage.benchmarkCount = 5; },
    value => { value.writing.benchmarkIds.pop(); }, value => { value.writing.writingScoreBasis = { id: 'other' }; },
    value => { value.oracle = null; }, value => { value.label = value.label.replace('25%', '50%'); },
    value => { value.label = value.label.replace('Included in Overall at 25% weight.', 'Excluded from Overall.'); }]) {
    const changed = structuredClone(fixture); change(changed); assert.ok(navigationFailures(changed).length);
  }
});

test('canonical historical navigation retains exact total coverage and edition-specific participation', () => {
  const fixture = navigationFixture();
  delete fixture.writing.writingScoreBasis; delete fixture.writing.catalog;
  fixture.oracle = null; fixture.label = '7 published benchmarks. Excluded from Overall.'; fixture.edition = 'overall-v2';
  assert.deepEqual(navigationFailures(fixture), []);
  fixture.label = '5 published benchmarks. Excluded from Overall.';
  assert.ok(navigationFailures(fixture).length);
});

test('shared Engineering axis keeps exact source short labels and full condition titles', () => {
  const start = source.indexOf("    const axisText = text(document.querySelector('.capability-ranking__axis'));", source.indexOf('async function auditSite('));
  const code = source.slice(start, source.indexOf('\n  };', start));
  assert.ok(start > 0);
  const conditions = [{ id: 'baseline', short: 'Minimal', label: 'Minimal baseline' }, { id: 'skill', short: 'Architecture', label: 'Architecture skill' }];
  const run = (headings, axis = '0 25 50 75 100') => {
    const failures = [];
    vm.runInNewContext(code, { failures, context: 'Engineering leaderboard', data: { conditions }, text: element => element?.textContent || '',
      document: { querySelector: () => ({ textContent: axis }), querySelectorAll: () => headings.map(item => ({ textContent: item.text, getAttribute: () => item.title })) } });
    return failures;
  };
  const headings = conditions.map(condition => ({ text: condition.short, title: condition.label }));
  assert.deepEqual(run(headings), []);
  assert.ok(run(headings.toReversed()).length);
  assert.ok(run([{ ...headings[0], title: 'Plain' }, headings[1]]).length);
  assert.ok(run([{ ...headings[0], text: 'Minimal baseline' }, headings[1]]).length);
  assert.ok(run(headings, '0 50 100').length);
});

test('Engineering report cardinality is the exact full setting count without an added matched-cohort claim', () => {
  const start = source.indexOf("      if (text(document.querySelector('#ranking .ui-eyebrow')) !==");
  const code = source.slice(start, source.indexOf('\n      }', start) + 8);
  assert.ok(start > 0);
  const run = textContent => {
    const failures = [];
    vm.runInNewContext(code, { failures, context: 'Report', expectedCounts: { settings: 36 }, text: element => element.textContent,
      document: { querySelector: () => ({ textContent }) } });
    return failures;
  };
  assert.deepEqual(run('Engineering v2 field · all 36 settings'), []);
  for (const text of ['Engineering v2 field · all 35 settings', 'Engineering v2 field · all 36 matched settings', 'All 36 settings']) assert.ok(run(text).length);
});
