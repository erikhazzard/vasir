import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const declaration = name => {
  const start = app.indexOf(`  const ${name} = `);
  assert.ok(start > 0, name);
  return app.slice(start, app.indexOf('\n  const ', start + 1));
};
const pure = app.slice(0, app.indexOf('(async function () {'));
const formatters = app.slice(app.indexOf('  const escapeHtml = '), app.indexOf('  const scoreFor = '));

test('Overall Writing benchmark leaders use the full source cohort, not only Overall-ranked settings', () => {
  const benchmark = { id: 'new-writing-test', category: 'writing' };
  const setting = id => ({ id, configurationId: `model:${id}`, label: id });
  const cells = (id, baseline, skill) => ['baseline', 'skill'].map((condition, index) => ({ settingId: id, condition,
    benchmarkId: benchmark.id, exactScore: [baseline, skill][index], score: [baseline, skill][index] }));
  const data = { settings: [setting('overall-eligible')], coverage: { records: [setting('overall-eligible'), setting('task-leader')] },
    benchmarkResults: [...cells('overall-eligible', 70, 90), ...cells('task-leader', 60, 98)] };
  const context = { data, benchmark, isOverall: true, rootData: { benchmarks: [] }, workflowData: { benchmarkResults: [] } };
  const source = `${pure}\n${declaration('benchmarkTopModels')}\n${declaration('benchmarkTopModelFor')}\nbenchmarkTopModelFor(benchmark, {caseCount:1})`;
  const leader = vm.runInNewContext(source, context);
  assert.equal(leader.settingId, 'task-leader'); assert.equal(leader.baseline, 60); assert.equal(leader.skill, 98);
});

test('Overall reuses the compact Writing ledger with field averages and paired winner without loading full Writing', () => {
  const benchmark = { id: 'new-writing-test', name: 'Registered writing test', category: 'writing', suite: 'New track', description: 'Test description.' };
  const summary = { baseline: 70, treatment: 80, delta: 10, baselineLabel: 'Plain answer', treatmentLabel: 'Storytelling skill', detailHref: './benchmark-report.html#new-writing-test' };
  const metadata = { settingCount: 33, sourceKind: 'official-panel', sourceLabel: '2-review panel', caseCount: 1, trials: 3, cohort: '1 prompt × 3 trials', judgeCount: 2, provisional: false };
  const leader = { settingId: 'top', configurationId: 'top', label: 'Top model', baseline: 90, skill: 98, delta: 8, tiedCount: 1 };
  const context = { benchmark, isWriting: false, isOverall: true, BASELINE_SHORT: 'Minimal', SCORE_MAXIMUM: 100,
    COMBINED_CAPABILITY: { id: 'overall' }, data: { benchmarkResults: [], benchmarkDisplays: { [benchmark.id]: metadata } },
    benchmarkSummaryById: new Map([[benchmark.id, summary]]), categoryById: new Map([['writing', { name: 'Writing' }]]),
    benchmarkTopModelFor: () => leader };
  const source = `${formatters}\n${['formatBenchmarkTopScore', 'benchmarkTopModelMarkup', 'benchmarkLedgerRowMarkup'].map(declaration).join('\n')}\nbenchmarkLedgerRowMarkup(benchmark, 0, 'overall')`;
  const html = vm.runInNewContext(source, context);
  assert.match(html, /Plain average/); assert.match(html, /Skill average/);
  assert.match(html, /data-baseline-score="70\.0"/); assert.match(html, /data-treatment-score="80\.0"/);
  assert.match(html, /Plain <b data-top-model-baseline>90\.0/); assert.match(html, /data-top-model-skill>98\.0/);
  assert.match(html, /data-writing-case-count="1"/); assert.match(html, /33 model settings/);
  assert.match(html, /\?from=overall#new-writing-test/);
  assert.doesNotMatch(html, /undefined|Minimal average|Published cohort/);
});

test('Overall Methodology derives current Writing weight and does not claim uniform one-trial coverage', () => {
  const source = `${formatters}\n${declaration('overallWeightsMarkup')}\noverallWeightsMarkup()`;
  const html = vm.runInNewContext(source, { overallWritingCategory: { weight: 0.25 }, portfolioCategories: [], TASK_COUNT: 8, rootData: { games: {} }, hasWriting: true });
  assert.match(html, /All Writing averages its three Storytelling benchmarks equally/); assert.match(html, /8\/8 assessable benchmarks/);
  assert.match(html, /Games pilot/); assert.match(html, /no comparable plain-answer\/skill pair/);
  assert.doesNotMatch(html, /Writing benchmarks are excluded/);
  assert.match(app, /scoreBasis\.edition === 'overall-v3' \? `\$\{TASK_COUNT\} benchmarks/);
});

test('clicking the homepage Writing segment resets stale score scope and retains exact model identity', () => {
  const start = app.indexOf("      if (isOverall && capabilitySegment.dataset.categoryId === 'writing') {");
  assert.ok(start > 0);
  const branch = app.slice(start, app.indexOf('\n      selectCapabilityCategory(', start));
  let destination;
  vm.runInNewContext(`(() => { ${branch} })()`, {
    isOverall: true, capabilitySegment: { dataset: { categoryId: 'writing' } }, URL, rootData: {},
    selectedEntry: () => ({ configurationId: 'codex:gpt-6-astra@ultra' }),
    window: { location: { href: 'https://example.test/?score=storytelling&setting=old#capabilities/overall', assign: href => { destination = new URL(href); } } }
  });
  assert.equal(destination.searchParams.get('score'), 'all-writing');
  assert.equal(destination.searchParams.get('setting'), 'codex:gpt-6-astra@ultra');
  assert.equal(destination.hash, '#capabilities/writing');
});

test('a canonical Overall Opus segment opens the original Writing configuration', () => {
  const start = app.indexOf("      if (isOverall && capabilitySegment.dataset.categoryId === 'writing') {");
  const branch = app.slice(start, app.indexOf('\n      selectCapabilityCategory(', start));
  let destination;
  vm.runInNewContext(`(() => { ${branch} })()`, {
    isOverall: true, capabilitySegment: { dataset: { categoryId: 'writing' } }, URL,
    selectedEntry: () => ({ configurationId: 'claude:opus@high' }),
    rootData: { writing: { overallSource: { scoreBasis: { identityAliases: [{ configurationId: 'claude:opus@high', sourceConfigurationId: 'claude:claude-opus-5@high' }] } } } },
    window: { location: { href: 'https://example.test/#capabilities/overall', assign: href => { destination = new URL(href); } } }
  });
  assert.equal(destination.searchParams.get('setting'), 'claude:claude-opus-5@high');
  assert.equal(destination.searchParams.get('score'), 'all-writing');
});
