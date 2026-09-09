import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const runtime = fs.readFileSync(new URL('../site/vasirbenchmark.com/capture.mjs', import.meta.url), 'utf8');
const start = runtime.indexOf('async function loadOverallV3Oracle(evaluate)');
const end = runtime.indexOf('\nconst [pageInput', start);
assert.ok(start > 0 && end > start);
const loaderCode = runtime.slice(start, end);

function fixture() {
  const original = { identity: 'original-writing-publication' };
  const context = { root: { overall: { scoreBasis: { edition: 'overall-v3' } }, benchmarkSummaries: [{ benchmarkId: 'eng' }], benchmarks: [{ id: 'eng', suite: 'Engineering' }], aiWorkflows: { benchmarkSummaries: [{ benchmarkId: 'ai' }], benchmarks: [{ id: 'ai', suite: 'AI' }] } }, appUrl: 'https://vasirbenchmark.com/releases/immutable/app.js', writingLoaded: false, answersLoaded: false };
  const bytes = Buffer.from('window.VASIR_WRITING_COLLECTION=' + JSON.stringify(original) + ';');
  const calls = { evaluate: [], fetch: [], derived: [], verified: [] };
  const publication = { settings: [{ id: 'a' }, { id: 'b' }], cases: [{}], trialCount: 10, scoreBasis: { trialsPerTask: 10 }, coverage: { caseCount: 1 }, benchmarks: [{ id: 'writing-test', suite: 'Storytelling' }], benchmarkSummaries: [{ baseline: null, treatment: null, complete: 0, total: 40 }], provisionalLeaderboard: { status: 'provisional', rankedSettingCount: 1, summary: { baseline: 81, treatment: 91, delta: 10 } } };
  const projection = { publications: new Map([['writing-test', publication]]), sources: new Map([['writing-test', { completedSettingCount: 1, judgeCount: 1, provisional: true }]]) };
  const scope = { URL, Buffer, AbortSignal, vm, createHash, fileURLToPath,
    fs: { readFileSync: () => bytes },
    fetch: async (url, options) => { calls.fetch.push({ url: url.href, options }); return { ok: true, arrayBuffer: async () => bytes }; },
    deriveExpectedOverallV3: sources => { calls.derived.push(sources); return { edition: 'overall-v3', benchmarkIds: ['eng', 'writing-test', 'ai'], coverage: { records: [{ id: 'source-setting', configurationId: 'source-configuration' }] } }; },
    deriveExpectedOverallAvailableCategories: (oracle, configurationId) => [{ categoryId: 'writing', configurationId, complete: false, scores: { baseline: null, skill: null } }],
    verifyOverallV3Projection: (actual, oracle) => { calls.verified.push({ actual, oracle }); },
    deriveExpectedWritingCategory: () => projection
  };
  const load = vm.runInNewContext(loaderCode + '\nloadOverallV3Oracle', scope);
  return { context, bytes, calls, scope, run: () => load(async expression => { calls.evaluate.push(expression); return context; }) };
}

test('Overall v3 audit fetches original Writing only in Node from the same immutable app directory', async () => {
  const f = fixture(), result = await f.run();
  assert.equal(f.calls.evaluate.length, 1);
  assert.equal(f.calls.fetch[0].url, 'https://vasirbenchmark.com/releases/immutable/writing-data.js');
  assert.equal(f.calls.fetch[0].options.redirect, 'error');
  assert.ok(f.calls.fetch[0].options.signal instanceof AbortSignal);
  assert.equal(f.calls.derived[0].engineering, f.context.root);
  assert.equal(f.calls.derived[0].aiWorkflows, f.context.root.aiWorkflows);
  assert.equal(f.calls.derived[0].writing.identity, 'original-writing-publication');
  assert.equal(f.calls.verified.length, 1);
  assert.equal(f.calls.verified[0].actual, f.context.root.overall);
  assert.equal(result.originalWritingSource.sha256, createHash('sha256').update(f.bytes).digest('hex'));
  assert.equal(result.originalWritingSource.loadedOnlyByAudit, true);
  assert.equal(result.lazyBeforeWriting, true);
  assert.equal(result.answersLazy, true);
  assert.equal(result.availableCategoriesBySetting['source-setting'][0].configurationId, 'source-configuration');
  assert.equal(result.availableCategoriesBySetting['source-setting'][0].scores.skill, null);
  assert.ok(!f.calls.evaluate.some(expression => /appendChild|createElement|import\(/.test(expression)));
});

test('Overall v2 retains the historical source oracle without fetching Writing', async () => {
  const f = fixture(); f.context.root.overall.scoreBasis.edition = 'overall-v2';
  assert.equal(await f.run(), null);
  assert.equal(f.calls.fetch.length, 0);
  assert.equal(f.calls.derived.length, 0);
});

for (const field of ['writingLoaded', 'answersLoaded']) test('Overall startup rejects an eager ' + field + ' dependency', async () => {
  const f = fixture(); f.context[field] = true;
  await assert.rejects(f.run, /without Writing data or answer archives/);
  assert.equal(f.calls.fetch.length, 0);
});

test('Source overlay preserves original archive denominator and dynamic benchmark catalog', async () => {
  const f = fixture(), result = await f.run(), summary = result.benchmarkSummaries.find(item => item.benchmarkId === 'writing-test');
  assert.equal(summary.baseline, 81); assert.equal(summary.treatment, 91);
  assert.equal(summary.complete, 0); assert.equal(summary.total, 40);
  assert.deepEqual(Array.from(result.benchmarks, item => item.id), ['eng', 'writing-test', 'ai']);
  assert.equal(result.benchmarkDisplays['writing-test'].settingCount, 1);
  assert.equal(result.benchmarkDisplays['writing-test'].trials, 10);
});

test('browser Overall summary respects the pinned provisional basis even when another official panel exists', async () => {
  const f = fixture(), publication = f.scope.deriveExpectedWritingCategory().publications.get('writing-test');
  Object.assign(publication.benchmarkSummaries[0], { baseline: 95, treatment: 99 });
  const result = await f.run(), summary = result.benchmarkSummaries.find(item => item.benchmarkId === 'writing-test');
  assert.equal(summary.baseline, 81);
  assert.equal(summary.treatment, 91);
  assert.equal(result.benchmarkDisplays['writing-test'].provisional, true);
});

test('same-release Writing oracle independently carries current and archived catalog inventories', async () => {
  const f = fixture(), ids = ['core', 'old-twists', 'magic', 'old-dm', 'new-twists', 'place', 'one-shot'];
  const scoreBasis = { id: 'writing-established-storytelling-v1', benchmarkIds: ['core', 'old-twists', 'magic'] };
  const bytes = Buffer.from('window.VASIR_WRITING=' + JSON.stringify({ writingScoreBasis: scoreBasis }) + ';');
  f.scope.fetch = async () => ({ ok: true, arrayBuffer: async () => bytes });
  f.scope.deriveExpectedWritingCategory = () => ({ listedBenchmarkIds: ids.filter(id => !['old-twists', 'old-dm'].includes(id)),
    publications: new Map(ids.map(id => [id, { benchmarkSummaries: [{ baseline: 50, treatment: 60 }], cases: [{}], trialCount: 1, benchmarks: [{ id }] }])),
    sources: new Map(ids.map(id => [id, { completedSettingCount: 4, judgeCount: 2, provisional: false }])) });
  const derive = f.scope.deriveExpectedOverallV3;
  f.scope.deriveExpectedOverallV3 = sources => ({ ...derive(sources), benchmarkIds: ['eng', 'core', 'old-twists', 'magic', 'ai'] });
  const result = await f.run();
  assert.deepEqual(JSON.parse(JSON.stringify(result.writingCatalog)), { scoreBasis, benchmarkIds: ids,
    currentBenchmarkIds: ['core', 'magic', 'new-twists', 'place', 'one-shot'], archivedBenchmarkIds: ['old-twists', 'old-dm'] });
  assert.equal(result.originalWritingSource.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(Array.from(result.benchmarks, task => task.id), ['eng', 'core', 'old-twists', 'magic', 'ai'], 'Browser arithmetic uses only the explicit Overall basis, not all report catalog entries.');
  assert.deepEqual(Object.keys(result.benchmarkDisplays), ['core', 'old-twists', 'magic']);
  assert.deepEqual(Array.from(result.benchmarkSummaries, task => task.benchmarkId), ['eng', 'core', 'old-twists', 'magic', 'ai']);
});

test('Original-source fetch errors and projection disagreements abort rather than accepting generated Overall as its own oracle', async () => {
  const f = fixture(); f.scope.fetch = async () => ({ ok: false, status: 404 });
  await assert.rejects(f.run, /Cannot audit same-release Writing source: 404/);
  const g = fixture(); g.scope.verifyOverallV3Projection = () => { throw new Error('weighted score disagreement'); };
  await assert.rejects(g.run, /weighted score disagreement/);
});

test('Capture keeps versioned score gates, dynamic categories/tasks, exact geometry and unavailable resource filtering', () => {
  const audit = runtime.slice(runtime.indexOf('async function auditOverall('), runtime.indexOf('\nasync function auditWorkflows('));
  assert.match(audit, /if \(!isV3 && \(tasks\.length !== 4/);
  assert.match(audit, /sourceOracle\.benchmarkWeights\[task\.benchmarkId\]/);
  assert.match(audit, /segments\.length !== measuredCategories\.length/);
  assert.match(audit, /const missingTasks = tasks\.filter/);
  assert.match(audit, /wanted === null \? actual === null : exactClose/);
  assert.match(audit, /Number\.isFinite\(entry\[metric\]\) && entry\[metric\] > 0/);
  assert.match(audit, /points\.length !== available\.length/);
  assert.match(audit, /stack\.getBoundingClientRect\(\)\.width \* contribution \/ 100/);
  assert.ok(!audit.includes('tasks.length !== 8'));
});

test('Overall edition remains checked in the mast when the clean header omits the version', () => {
  const start = runtime.indexOf('    const editionDisclosure = ');
  const code = runtime.slice(start, runtime.indexOf('\n    const method = ', start));
  const check = (status, mast) => {
    const failures = [];
    vm.runInNewContext(code, { failures, editionLabel: 'Overall v3', text: value => value || '',
      document: { querySelector: selector => selector === '.capability-canvas__status' ? status : mast } });
    return failures;
  };
  assert.deepEqual(check('Overall · 7 benchmarks · 3 categories', '· Overall v3'), []);
  assert.deepEqual(check('Overall v3 · 7 benchmarks', ''), []);
  assert.equal(check('Overall · 7 benchmarks', '· Overall v2').length, 1);
  assert.equal(check('Overall · 7 benchmarks', '').length, 1);
  const navigation = runtime.slice(runtime.indexOf('const editionMatches = ') + 'const editionMatches = '.length, runtime.indexOf('\n      let key = step.key;')).trim().replace(/;$/, '');
  const expression = vm.runInNewContext(navigation, { category: 'overall', editions: { overall: 'Overall v3' } });
  const accepts = mast => vm.runInNewContext(expression, { document: { querySelector: selector => ({ textContent: selector === '.capability-canvas__status' ? 'Overall · 7 benchmarks · 3 categories' : mast }) } });
  assert.equal(accepts('· Overall v3'), true);
  assert.equal(accepts('· Overall v2'), false);
  assert.equal(accepts(''), false);
});

test('Overall report route treats relative-dot spelling equivalently without relaxing origin, path, query or benchmark identity', () => {
  const start = runtime.indexOf('    const expectedReportUrl =', runtime.indexOf('async function auditOverall('));
  const end = runtime.indexOf('\n    const rendered', start);
  const code = runtime.slice(start, end);
  const run = href => {
    const failures = [], location = { href: 'https://vasirbenchmark.com/index.html#capabilities/overall/benchmarks' };
    vm.runInNewContext(code, { URL, location, failures, task: { id: 'writing-test' }, row: { getAttribute: () => href } });
    return failures;
  };
  for (const href of ['./benchmark-report.html?from=overall#writing-test', 'benchmark-report.html?from=overall#writing-test']) assert.deepEqual(run(href), []);
  for (const href of ['https://example.com/benchmark-report.html?from=overall#writing-test', './wrong.html?from=overall#writing-test', './benchmark-report.html#writing-test', './benchmark-report.html?from=writing#writing-test', './benchmark-report.html?from=overall#different-test']) assert.equal(run(href).length, 1);
});

test('Available-category browser audit retains strict null totals, paired source scores, real filter interaction and closed report evidence', () => {
  const start = runtime.indexOf('async function auditOverallAvailableProfiles(');
  const end = runtime.indexOf('\nasync function auditOverall(', start);
  const code = runtime.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.match(code, /sourceOracle\.availableCategoriesBySetting\[record\.id\]/);
  assert.match(code, /row\.dataset\[key\] !== 'null'/);
  assert.match(code, /score === null \? actualScore !== null : !close\(actualScore, score\)/);
  assert.match(code, /score === null \? '—' : formatted\(score\)/);
  assert.match(code, /reading\.weight \* 100/);
  assert.match(code, /slotWidth \* \(score \?\? 0\) \/ 100/);
  assert.match(code, /url\.searchParams\.get\('setting'\) !== reading\.configurationId/);
  assert.match(code, /filter\.value = 'claude'; filter\.dispatchEvent/);
  assert.match(code, /await inspect\(claude, false\)/);
  assert.match(code, /reset\.value = 'all'; reset\.dispatchEvent/);
  assert.match(code, /details\?\.querySelector\('summary'\)\?\.click\(\)/);
  assert.match(code, /links\.some\(visible\)/);
  assert.match(code, /checkVisibility\(\{ contentVisibilityAuto: true, visibilityProperty: true \}\)/);
  assert.match(runtime, /if \(categoryProfiles \|\| coverageSummary\) \{[\s\S]*inspectAvailableProfiles\(sourceOracle\)/);
});
