import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(app.slice(0, app.indexOf('(async function () {')), context);
const setting = { configurationId: 'claude:opus@max' };
const fixture = () => ({
  categories: [{ id: 'engineering', weight: 0.5 }, { id: 'writing', weight: 0.25 }, { id: 'ai-workflows', weight: 0.25 }],
  scoreBasis: { benchmarkWeights: [
    { benchmarkId: 'eng', familyId: 'engineering', weight: 0.5, scoreField: 'score' },
    { benchmarkId: 'story', familyId: 'writing', weight: 1 / 8, scoreField: 'exactScore' },
    { benchmarkId: 'dm', familyId: 'writing', weight: 1 / 8, scoreField: 'exactScore' },
    { benchmarkId: 'ai', familyId: 'ai-workflows', weight: 0.25, scoreField: 'exactScore' }
  ] },
  benchmarkResults: ['baseline', 'skill'].flatMap(condition => [
    { ...setting, condition, benchmarkId: 'eng', score: condition === 'skill' ? 80 : 60, exactScore: 999 },
    { ...setting, condition, benchmarkId: 'story', exactScore: 97.99, score: 98, sourceConfigurationId: 'claude:claude-opus-5@max' },
    { ...setting, condition, benchmarkId: 'ai', exactScore: condition === 'skill' ? 95.04 : 90.01, score: 95 }
  ])
});

test('available models preserve exact complete category scores and keep missing categories null', () => {
  const data = fixture();
  const rows = context.buildOverallAvailableCategories(data, setting);
  assert.equal(rows[0].scores.baseline, 60);
  assert.equal(rows[0].scores.skill, 80);
  assert.equal(rows[1].complete, false);
  assert.equal(rows[1].available, 1);
  assert.equal(rows[1].expected, 2);
  assert.equal(rows[1].scores.baseline, null);
  assert.equal(rows[1].scores.skill, null);
  assert.equal(rows[1].configurationId, 'claude:claude-opus-5@max');
  assert.equal(rows[2].scores.skill, 95.04);
  assert.equal(rows.some(row => 'overall' in row || 'rank' in row), false);
});

test('a missing arm prevents a paired category score; a real zero does not', () => {
  const data = fixture();
  data.benchmarkResults = data.benchmarkResults.filter(cell => !(cell.benchmarkId === 'ai' && cell.condition === 'baseline'));
  data.benchmarkResults.find(cell => cell.benchmarkId === 'eng' && cell.condition === 'skill').score = 0;
  const rows = context.buildOverallAvailableCategories(data, setting);
  assert.equal(rows[0].complete, true);
  assert.equal(rows[0].scores.skill, 0);
  assert.equal(rows[2].complete, false);
  assert.equal(rows[2].available, 0);
  assert.equal(rows[2].scores.skill, null);
});

test('category weights use all registered tests, never a mean of the available subset', () => {
  const data = fixture();
  for (const condition of ['baseline', 'skill']) data.benchmarkResults.push({ ...setting, benchmarkId: 'dm', condition, exactScore: 80 });
  const rows = context.buildOverallAvailableCategories(data, setting);
  assert.equal(rows[1].scores.skill, (97.99 + 80) / 2);
  data.scoreBasis.benchmarkWeights.push({ benchmarkId: 'new', familyId: 'writing', scoreField: 'exactScore', weight: 1 / 12 });
  const after = context.buildOverallAvailableCategories(data, setting);
  assert.equal(after[1].scores.skill, null);
  assert.equal(after[1].available, 2);
  assert.equal(after[1].expected, 3);
});

test('Overall keeps incomplete settings in a closed coverage summary without invented aggregate scores', () => {
  assert.match(app, /id="overall-model-provider"/);
  assert.match(app, /provider === 'claude' \? 'Claude'/);
  const start = app.indexOf('  const overallCoverageMarkup = ');
  const source = app.slice(start, app.indexOf('\n  const ', start + 1));
  const data = fixture();
  data.categories.forEach(category => { category.name = category.id; });
  data.coverage = { records: [{ ...setting, id: 'opus-max', provider: 'claude', family: 'Opus', reasoning: 'max', eligible: false },
    { id: 'complete', provider: 'codex', family: 'Complete', eligible: true }] };
  const before = JSON.stringify(data);
  const render = vm.runInNewContext(source + '\noverallCoverageMarkup', { data, state: { overallProvider: 'all' },
    escapeHtml: String, formatScore: value => value.toFixed(1), buildOverallAvailableCategories: context.buildOverallAvailableCategories,
    overallCategoryHref: (category, configuration) => `${category}?setting=${configuration}` });
  const html = render();
  assert.match(html, /<details class="overall-coverage"[^>]*data-overall-coverage-display="coverage-summary-v1">/);
  assert.doesNotMatch(html.match(/<details[^>]*>/)[0], /\bopen\b/);
  assert.match(html, /Model coverage/);
  assert.match(html, /data-incomplete-count="1"/);
  assert.match(html, /data-incomplete-setting-id="opus-max"/);
  assert.match(html, /data-category-complete="false" data-category-exact-baseline="null" data-category-exact-skill="null" data-available-tests="1\/2"/);
  assert.match(html, /data-category-exact-skill="95\.04"/);
  assert.match(html, /Plain 60\.0 → Skill 80\.0/);
  assert.match(html, /writing\?setting=claude:claude-opus-5@max/);
  assert.doesNotMatch(html, /data-incomplete-setting-id="complete"|data-full-score|data-full-rank|data-delta|setting-row|capability-composition|hatched/);
  assert.equal(JSON.stringify(data), before);
});

test('coverage respects the active provider and has no empty disclosure', () => {
  const start = app.indexOf('  const overallCoverageMarkup = ');
  const source = app.slice(start, app.indexOf('\n  const ', start + 1));
  const render = vm.runInNewContext(source + '\noverallCoverageMarkup', {
    data: { coverage: { records: [{ eligible: false, provider: 'claude' }] } }, state: { overallProvider: 'codex' }
  });
  assert.equal(render(), '');
});
