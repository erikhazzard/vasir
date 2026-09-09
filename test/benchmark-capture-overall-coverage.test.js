import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const capture = fs.readFileSync(new URL('../site/vasirbenchmark.com/capture.mjs', import.meta.url), 'utf8');
const source = capture.slice(capture.indexOf('async function auditOverallAvailableProfiles('), capture.indexOf('\nasync function auditOverall('));

// A small DOM boundary fixture exercises the serialized browser audit against
// independent source readings, including mutations that a capture must reject.
function fixture(mutate = () => {}) {
  const records = [
    { id: 'opus-max', configurationId: 'claude:opus@max', provider: 'claude', family: 'Claude Opus 5', reasoning: 'max', eligible: false },
    { id: 'astra-medium', configurationId: 'codex:gpt-6-astra@medium', provider: 'codex', family: 'GPT-6 Astra', reasoning: 'medium', eligible: false },
    { id: 'opus-low', provider: 'claude', eligible: true },
    { id: 'astra-low', provider: 'codex', eligible: true }
  ];
  const oracle = { coverage: { records }, availableCategoriesBySetting: Object.fromEntries(records.filter(record => !record.eligible).map(record => [record.id, [
    { categoryId: 'engineering', configurationId: record.configurationId, complete: true, available: 1, expected: 1, scores: { baseline: 0, skill: 83.375 } },
    { categoryId: 'writing', configurationId: record.provider === 'claude' ? 'claude:claude-opus-5@max' : record.configurationId, complete: false, available: 1, expected: 2, scores: { baseline: null, skill: null } }
  ]])) };
  const location = { href: 'https://example.test/releases/abc/index.html#capabilities/overall', origin: 'https://example.test' };
  const state = { provider: 'all', events: [], openEvents: 0, closeEvents: 0 };
  const node = (textContent = '', isVisible = () => true) => ({ textContent, dataset: {}, tagName: 'SPAN',
    scrollWidth: 350, clientWidth: 350, bounds: { left: 20, right: 370, width: 350, height: 40 },
    getBoundingClientRect() { return this.bounds; }, checkVisibility: isVisible,
    querySelector: () => null, querySelectorAll: () => [] });
  const render = () => {
    const wanted = records.filter(record => !record.eligible && (state.provider === 'all' || record.provider === state.provider));
    state.disclosure = wanted.length ? Object.assign(node(), { tagName: 'DETAILS', open: false,
      dataset: { overallCoverageDisplay: 'coverage-summary-v1', incompleteCount: String(wanted.length) } }) : null;
    const summary = node('Model coverage');
    summary.click = () => {
      if (state.disclosure.open) { state.closeEvents++; if (!state.preventClose) state.disclosure.open = false; }
      else { state.openEvents++; if (!state.preventOpen) state.disclosure.open = true; }
    };
    if (state.disclosure) state.disclosure.querySelector = selector => selector === 'summary' ? summary : null;
    state.rows = wanted.map(record => {
      const row = Object.assign(node('', () => state.disclosure.open), { dataset: { incompleteSettingId: record.id } });
      row.family = node(record.family); row.reasoning = node(record.reasoning);
      row.links = oracle.availableCategoriesBySetting[record.id].map(reading => {
        const url = new URL('./index.html', location.href);
        url.hash = '#capabilities/' + reading.categoryId;
        url.searchParams.set('setting', reading.configurationId); url.searchParams.set('inspect', '1');
        if (reading.categoryId === 'writing') url.searchParams.set('score', 'all-writing');
        const link = Object.assign(node('', () => state.disclosure.open), { tagName: 'A', href: url.href, dataset: {
          overallCategory: reading.categoryId, categoryComplete: String(reading.complete),
          categoryExactBaseline: String(reading.scores.baseline), categoryExactSkill: String(reading.scores.skill),
          availableTests: reading.available + '/' + reading.expected
        } });
        link.label = node(reading.complete ? 'Plain 0.0 → Skill 83.4' : '1/2 tests scored');
        link.querySelector = selector => selector === 'span:last-child' ? link.label : null;
        return link;
      });
      row.querySelectorAll = selector => selector === '[data-overall-category]' ? row.links : [];
      row.querySelector = selector => selector === '.overall-coverage__identity strong' ? row.family
        : selector === '.overall-coverage__identity > span' ? row.reasoning
          : selector.includes('.capability-composition') && row.fabricatedOverall ? node('99.0') : null;
      return row;
    });
    state.ranked = records.filter(record => record.eligible && (state.provider === 'all' || record.provider === state.provider)).map(record => Object.assign(node(), { dataset: { settingId: record.id } }));
    state.filter = Object.assign(node(), { value: state.provider, options: ['all', 'claude', 'codex'].map(value => ({ value })) });
    state.filter.dispatchEvent = () => { state.provider = state.filter.value; state.events.push(state.provider); render(); };
    mutate(state);
  };
  render();
  const document = { documentElement: { scrollWidth: 390 },
    querySelector: selector => selector === '#overall-model-provider' ? state.filter
      : ['#overall-available', '[data-overall-coverage-display="coverage-summary-v1"]'].includes(selector) ? state.disclosure : null,
    querySelectorAll: selector => selector === '[data-incomplete-setting-id]' ? state.rows : selector === '.result-list > .setting-row' ? state.ranked : [] };
  const audit = vm.runInNewContext(source + '\nauditOverallAvailableProfiles', { document, location, URL, Event, innerWidth: 390, requestAnimationFrame: callback => callback() });
  return { state, document, run: () => audit(oracle) };
}

test('coverage capture opens exact paired category evidence, tests every provider and restores closed all-provider state', async () => {
  const f = fixture(), result = await f.run();
  assert.deepEqual(Array.from(result.failures), []);
  assert.equal(result.display, 'coverage-summary-v1');
  assert.equal(result.incompleteSettings, 2);
  assert.equal(result.claudeSettings, 1);
  assert.deepEqual(f.state.events, ['claude', 'codex', 'all']);
  assert.equal(f.state.provider, 'all');
  assert.equal(f.state.disclosure.open, false);
  assert.equal(f.state.openEvents, 4);
  assert.equal(f.state.closeEvents, 4);
});

const mutations = [
  ['rounded exact score', s => { s.rows[0].links[0].dataset.categoryExactSkill = '83.4'; }, /exact paired original-source scores/],
  ['missing baseline score', s => { s.rows[0].links[0].dataset.categoryExactBaseline = ''; }, /exact paired original-source scores/],
  ['missing category becomes zero', s => { s.rows[0].links[1].dataset.categoryExactBaseline = '0'; }, /exact paired original-source scores/],
  ['partial category becomes a mean', s => { s.rows[0].links[1].dataset.categoryExactSkill = '96'; }, /exact paired original-source scores/],
  ['incorrect visible score', s => { s.rows[0].links[0].label.textContent = 'Plain 0.0 → Skill 99.0'; }, /fabricated or incorrect paired result/],
  ['incorrect paired coverage', s => { s.rows[0].links[1].dataset.availableTests = '2/2'; }, /complete paired source coverage/],
  ['invented Overall attribute', s => { s.rows[0].dataset.fullRank = '1'; }, /Overall total, rank or uplift/],
  ['invented Overall element', s => { s.rows[0].fabricatedOverall = true; }, /Overall total, rank or uplift/],
  ['wrong model version', s => { s.rows[0].family.textContent = 'Claude Fable 5'; }, /model identity/],
  ['lost original alias', s => { s.rows[0].links[1].href = 'https://example.test/releases/abc/index.html?inspect=1&score=all-writing&setting=claude:opus@max#capabilities/writing'; }, /original source identity/],
  ['external category link', s => { s.rows[0].links[0].href = 'https://elsewhere.test/index.html'; }, /original source identity/],
  ['duplicated category', s => { s.rows[0].links[1] = s.rows[0].links[0]; }, /loses or duplicates.*category/],
  ['omitted model', s => { s.rows.pop(); }, /omits or duplicates source settings/],
  ['duplicate model', s => { if (s.rows.length > 1) s.rows[1] = s.rows[0]; }, /omits or duplicates source settings/],
  ['wrong provider ranked roster', s => { if (s.provider === 'codex') s.ranked[0].dataset.settingId = 'opus-low'; }, /provider filter invents or omits ranked models/],
  ['open by default', s => { s.disclosure.open = true; }, /must start closed/],
  ['unresponsive disclosure', s => { s.preventOpen = true; }, /does not open through its summary/],
  ['unclosable disclosure', s => { s.preventClose = true; }, /did not restore its closed state/],
  ['overflowing category', s => { s.rows[0].links[0].scrollWidth = 500; }, /overflows its compact row/],
  ['overflowing row', s => { s.rows[0].bounds.right = 440; }, /overflows the viewport/]
];

for (const [name, mutate, message] of mutations) test('coverage capture rejects ' + name, async () => {
  const f = fixture(mutate), result = await f.run();
  assert.ok(result.failures.some(failure => message.test(failure)), result.failures.join('\n'));
  assert.equal(f.state.provider, 'all');
});

test('coverage capture detects page overflow while inspecting the expanded disclosure', async () => {
  const f = fixture(); f.document.documentElement.scrollWidth = 700;
  const result = await f.run();
  assert.ok(result.failures.some(failure => /horizontal page overflow/.test(failure)));
  assert.equal(f.state.disclosure.open, false);
});
