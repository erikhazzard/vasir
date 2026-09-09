import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const runtime = fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-browsercheck.mjs', import.meta.url), 'utf8');
const start = runtime.indexOf('function inspectWritingBenchmarkOverviewInDocument(expected)');
const end = runtime.indexOf('\n// Runs inside the real report page.', start);
assert.ok(start >= 0 && end > start);
const collector = runtime.slice(start, end);
const weightStart = runtime.indexOf('function expectedWritingWeightToken(weight)');
const weightEnd = runtime.indexOf('\n// Runs in the category page;', weightStart);
assert.ok(weightStart >= 0 && weightEnd > weightStart);
const weightToken = vm.runInNewContext(runtime.slice(weightStart, weightEnd) + '\nexpectedWritingWeightToken');
const expectedTopModel = vm.runInNewContext(runtime.slice(weightStart, weightEnd) + '\nexpectedWritingBenchmarkTopModel');

function topModelFixture() {
  const entries = [], settings = [];
  const pair = (configurationId, baseline, skill, eligibleForRank = true) => {
    const settingId = 'setting-' + configurationId;
    settings.push({ id: settingId, configurationId, label: 'Model ' + configurationId });
    entries.push({ settingId, configurationId, condition: 'baseline', exactScore: baseline, eligibleForRank }, { settingId, configurationId, condition: 'skill', exactScore: skill, eligibleForRank });
  };
  return { entries, settings, pair, derive: () => expectedTopModel({ entries }, { settings }) };
}

test('top model uses exact skill only and retains that same configuration’s baseline and delta', () => {
  const f = topModelFixture(); f.pair('best-baseline', 100, 91); f.pair('best-uplift', 0, 95); f.pair('best-skill', 80, 96);
  const result = f.derive();
  assert.equal(result.configurationId, 'best-skill'); assert.equal(result.exactBaseline, 80); assert.equal(result.exactDelta, 16);
});
test('top skill ties use configuration-codepoint order, not baseline, uplift, label or locale', () => {
  const f = topModelFixture(); f.pair('a', 95, 99); f.pair('A', 90, 99);
  assert.equal(f.derive().configurationId, 'A'); assert.equal(f.derive().tiedCount, 2); assert.equal(f.derive().exactBaseline, 90);
});
test('rounded-equal skill scores are not exact ties', () => {
  const f = topModelFixture(); f.pair('A', 95, 98); f.pair('Z', 90, 98.00000001);
  assert.equal(f.derive().configurationId, 'Z'); assert.equal(f.derive().tiedCount, 1);
});
test('top model excludes unranked scores and missing/nonfinite baseline arms', () => {
  const f = topModelFixture(); f.pair('unranked', 90, 100, false); f.pair('missing', null, 99); f.pair('valid', 80, 90);
  assert.equal(f.derive().configurationId, 'valid');
  f.entries.splice(f.entries.findIndex(entry => entry.configurationId === 'valid' && entry.condition === 'baseline'), 1);
  assert.equal(f.derive(), null);
});
test('top label uses source label, then family/reasoning, then setting identity; display rounding preserves half-tenth ties', () => {
  const f = topModelFixture(); f.pair('winner', 81.925, 97.875);
  assert.equal(f.derive().baseline, 81.9); assert.equal(f.derive().skill, 97.9); assert.equal(f.derive().delta, 16.0);
  delete f.settings[0].label; f.settings[0].family = 'Family'; f.settings[0].reasoning = 'max'; assert.equal(f.derive().label, 'Family · max');
  delete f.settings[0].family; delete f.settings[0].reasoning; assert.equal(f.derive().label, 'setting-winner');
});

test('visible weighted formulas use exact reciprocal fractions, not rounded percentages', () => {
  for (const denominator of [1, 2, 3, 4, 5, 6, 10, 20, 100]) assert.equal(weightToken(1 / denominator), denominator === 1 ? '1' : `1/${denominator}`);
  for (const [weight, token] of [[0, '0'], [0.6, '0.6'], [2 / 7, '0.285714'], [1 / 101, '0.009901']]) assert.equal(weightToken(weight), token);
  assert.equal(weightToken((1 / 6) / (5 / 6)), '1/5', 'Partial fixed weights are normalized before display.');
  assert.equal(weightToken((1 / 2) / (5 / 6)), '0.6');
  assert.notEqual(weightToken(1 / 6 + 1e-8), '1/6', 'A materially different weight must not be mislabeled as an exact fraction.');
  assert.match(runtime, /text\.includes\('%'\)/, 'Rounded percentages remain forbidden in the visible weighted equation.');
  assert.match(runtime, /formulas\[index\]!==label\+' '\+expression/, 'Every visible formula term is still checked exactly against source scores and weights.');
});

function fixture() {
  const ids = ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery', 'dungeon-master-adventure-outline'];
  const expected = { selectionId: 'all-writing', selectedSettingId: 'model-a', fieldMeans: ids.map((benchmarkId, index) => ({
    benchmarkId, trackId: index === 3 ? 'dungeon-master' : 'storytelling', selectionId: index === 3 ? 'dungeon-master' : benchmarkId,
    baseline: 41 + index, skill: 51 + index, delta: 10, provisional: index === 0, sourceKind: index === 0 ? 'provisional-single-judge' : 'official-panel',
    sourceSha256: 'a'.repeat(64), settingCount: index === 0 ? 31 : 23, caseCount: index === 0 ? 12 : 1, trialCount: index === 1 ? 10 : index === 2 ? 3 : 1, judgeCount: [1, 2, 4, 2][index],
    topModel: { settingId: 'leader-' + index, configurationId: 'config-' + index, label: 'Leader ' + index + ' · max', exactBaseline: 60 + index, exactSkill: 90 + index, exactDelta: 30, baseline: 60 + index, skill: 90 + index, delta: 30, tiedCount: index === 2 ? 2 : 1 }
  })) };
  const groups = ['storytelling', 'dungeon-master'].map(trackId => ({ dataset: { writingTrack: trackId }, querySelectorAll: () => rows.filter(row => row.group.dataset.writingTrack === trackId) }));
  const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  const rows = expected.fieldMeans.map((source, index) => ({
    dataset: { benchmarkId: source.benchmarkId, baselineScore: source.baseline.toFixed(1), treatmentScore: source.skill.toFixed(1), scoreSource: source.sourceKind,
      writingSettingCount: String(source.settingCount), writingCaseCount: String(source.caseCount), writingTrialCount: String(source.trialCount), writingJudgeCount: String(source.judgeCount) },
    group: groups.find(group => group.dataset.writingTrack === source.trackId),
    meta: { textContent: source.settingCount + ' settings · ' + source.judgeCount + ' reviews per answer' },
    delta: { textContent: '+10.0 pts' }, aria: 'Plain field mean / Skill field mean.' + (source.provisional ? ' Provisional.' : ''),
    href: 'https://example.test/benchmark-report.html#' + source.benchmarkId,
    getBoundingClientRect: () => rect(0, index * 300, 1440, 240),
    comparison: { getBoundingClientRect: () => rect(400, index * 300 + 40, 600, 180) },
    leaders: [{ dataset: { settingId: source.topModel.settingId, configurationId: source.topModel.configurationId, exactBaseline: String(source.topModel.exactBaseline), exactSkill: String(source.topModel.exactSkill), exactDelta: '30', tiedCount: String(source.topModel.tiedCount) },
      textContent: 'Top with skill' + (source.topModel.tiedCount > 1 ? ' · 2 tied' : '') + source.topModel.label,
      heading: { textContent: 'Top with skill' + (source.topModel.tiedCount > 1 ? ' · 2 tied' : '') },
      getBoundingClientRect: () => rect(400, index * 300 + 100, 580, 100), checkVisibility: () => true,
      fields: Object.fromEntries(['label', 'baseline', 'skill', 'delta'].map((name, fieldIndex) => [name, { textContent: name === 'label' ? source.topModel.label : name === 'delta' ? '+30.0' : source.topModel[name].toFixed(1),
        getBoundingClientRect: () => rect(412 + (fieldIndex > 0 ? (fieldIndex - 1) * 100 : 0), index * 300 + (fieldIndex ? 150 : 105), fieldIndex ? 40 : 400, 20), checkVisibility: () => true, clientWidth: fieldIndex ? 40 : 400, scrollWidth: fieldIndex ? 40 : 400 }])),
      querySelector(selector) { return selector === '.benchmark-ledger__leader-identity > small' ? this.heading : this.fields[selector.match(/data-top-model-(\w+)/)?.[1]] || null; } }],
    getAttribute() { return this.aria; }, closest() { return this.group; },
    querySelector(selector) { return selector === '.benchmark-ledger__evidence' ? this.meta : selector === '.benchmark-ledger__comparison' ? this.comparison : this.delta; },
    querySelectorAll() { return this.leaders; }
  }));
  const links = expected.fieldMeans.map(source => ({ href: 'https://example.test/index.html?score=' + source.selectionId + '&setting=model-a#capabilities/writing' }));
  const clutter = {}, scoreSelector = { current: null };
  const scope = {
    hidden: false, dataset: { writingPresentation: 'writing-benchmark-leaders-v1' }, innerText: 'Storytelling · 3 tests · Dungeon Master · 1 test',
    querySelectorAll(selector) { return selector === '.benchmark-ledger__row' ? rows : groups; },
    querySelector(selector) { return clutter[selector] || links[ids.indexOf(selector.match(/data-writing-compare-models="([^"]+)"/)?.[1])] || null; }
  };
  const context = { expected, URL, window: { VASIR_WRITING_CATEGORY: { writingCategory: { selection: { id: 'all-writing' } } } },
    document: { documentElement: { clientWidth: 1440 }, querySelector: selector => selector === '#capability-benchmarks' ? scope : scoreSelector.current } };
  return { expected, rows, links, groups, clutter, scope, scoreSelector, document: context.document,
    collect: () => JSON.parse(JSON.stringify(vm.runInNewContext(collector + '\ninspectWritingBenchmarkOverviewInDocument(expected)', context))) };
}

test('clean ledger verifies unchanged source means, exact quiet metadata and grouped benchmark links without model UI', () => {
  const f = fixture(), proof = f.collect();
  assert.deepEqual(proof.mismatches, []);
  assert.equal(proof.selectionId, 'all-writing');
  assert.deepEqual(proof.groups.map(group => [group.trackId, group.benchmarkIds.length]), [['storytelling', 3], ['dungeon-master', 1]]);
  for (const key of ['noModelSelector', 'noBreakdown', 'noFormula', 'noScoreSelector', 'noInlineProvisional', 'noExplanationEssay', 'noPartialFootnote', 'noVisibleNoise']) assert.equal(proof[key], true);
  assert.equal(proof.rows[0].renderedSkill, '51.0');
  assert.equal(proof.rows[0].renderedDelta, '+10.0');
  assert.equal(proof.rows[0].sourceKind, 'provisional-single-judge', 'Underlying basis is retained without noisy visible copy.');
  assert.equal(proof.rows[0].topModel.settingId, 'leader-0');
  assert.equal(proof.rows[0].topModel.exactBaseline, 60);
  assert.equal(proof.rows[0].topModel.exactSkill, 90);
  assert.equal(proof.rows[0].topModel.visible, true);
  assert.equal(proof.rows[2].topModel.tiedCount, 2);
  assert.equal(proof.rows[0].topModel.geometry.fieldsNonOverlapping, true);
});

for (const [name, mutate, mismatch] of [
  ['missing winner', f => { f.rows[0].leaders = []; }, 'identity'],
  ['duplicate winner', f => { f.rows[0].leaders.push(f.rows[0].leaders[0]); }, 'identity'],
  ['different setting', f => { f.rows[0].leaders[0].dataset.settingId = 'other'; }, 'identity'],
  ['different configuration', f => { f.rows[0].leaders[0].dataset.configurationId = 'other'; }, 'identity'],
  ['different visible model label', f => { f.rows[0].leaders[0].fields.label.textContent = 'Other'; }, 'identity'],
  ['independent maximum baseline', f => { f.rows[0].leaders[0].dataset.exactBaseline = '99'; }, 'paired-source-scores'],
  ['different skill score', f => { f.rows[0].leaders[0].dataset.exactSkill = '100'; }, 'paired-source-scores'],
  ['different uplift', f => { f.rows[0].leaders[0].dataset.exactDelta = '40'; }, 'paired-source-scores'],
  ['missing exact score', f => { f.rows[0].leaders[0].dataset.exactSkill = ''; }, 'paired-source-scores'],
  ['rounded baseline substituted for exact', f => { f.expected.fieldMeans[0].topModel.exactBaseline = 60.01; }, 'paired-source-scores'],
  ['visible score not matching source', f => { f.rows[0].leaders[0].fields.skill.textContent = '91.0'; }, 'rounded-paired-scores'],
  ['invisible uplift', f => { f.rows[0].leaders[0].fields.delta.checkVisibility = () => false; }, 'visibility'],
  ['invisible whole block', f => { f.rows[0].leaders[0].checkVisibility = () => false; }, 'visibility'],
  ['wrong exact tie count', f => { f.rows[2].leaders[0].dataset.tiedCount = '1'; }, 'top-skill-label-or-ties'],
  ['tie disclosure missing', f => { f.rows[2].leaders[0].heading.textContent = 'Top with skill'; }, 'top-skill-label-or-ties'],
  ['ambiguous independent maximum heading', f => { f.rows[0].leaders[0].heading.textContent = 'Best plain and best skill'; }, 'top-skill-label-or-ties'],
  ['block outside comparison', f => { f.rows[0].comparison.getBoundingClientRect = () => ({ left: 0, right: 20, top: 0, bottom: 20, width: 20, height: 20 }); }, 'geometry:withinComparison'],
  ['block outside row', f => { f.rows[0].getBoundingClientRect = () => ({ left: 0, right: 20, top: 0, bottom: 20, width: 20, height: 20 }); }, 'geometry:withinRow'],
  ['horizontal mobile overflow', f => { f.document.documentElement.clientWidth = 390; }, 'geometry:withinViewport'],
  ['overlapping visible fields', f => { f.rows[0].leaders[0].fields.skill.getBoundingClientRect = f.rows[0].leaders[0].fields.baseline.getBoundingClientRect; }, 'geometry:fieldsNonOverlapping'],
  ['clipped model identity', f => { f.rows[0].leaders[0].fields.label.scrollWidth = 800; }, 'geometry:noTextOverflow'],
  ['field outside block', f => { f.rows[0].leaders[0].fields.delta.getBoundingClientRect = () => ({ left: 900, right: 1020, top: 150, bottom: 170, width: 120, height: 20 }); }, 'geometry:fieldsWithinBlock']
]) test('top model browser evidence rejects ' + name, () => {
  const f = fixture(); mutate(f);
  assert.ok(f.collect().mismatches.some(item => item.includes('top-model:') && item.includes(mismatch)));
});

test('unavailable complete paired source has no invented top-model scores', () => {
  const f = fixture(); f.expected.fieldMeans[0].topModel = null; f.rows[0].leaders = [];
  assert.deepEqual(f.collect().mismatches, []); assert.equal(f.collect().rows[0].topModel, null);
  f.rows[0].leaders = [{}]; assert.ok(f.collect().mismatches.some(item => item.includes('top-model-unavailable')));
});

test('top-model uplift retains Unicode negative and zero signs without changing average uplift', () => {
  for (const [delta, text] of [[-1, '−1.0'], [0, '±0.0']]) {
    const f = fixture(), source = f.expected.fieldMeans[0].topModel, block = f.rows[0].leaders[0];
    source.exactBaseline = source.baseline = 90 - delta; source.exactDelta = source.delta = delta;
    block.dataset.exactBaseline = String(source.exactBaseline); block.dataset.exactDelta = String(delta);
    block.fields.baseline.textContent = source.baseline.toFixed(1); block.fields.delta.textContent = text;
    assert.deepEqual(f.collect().mismatches, []); assert.equal(f.collect().rows[0].renderedDelta, '+10.0');
  }
});

test('field-average uplift validates negative and zero signs without converting regressions to wins', () => {
  for (const [delta, text] of [[-5, '−5.0'], [0, '±0.0']]) {
    const f = fixture(), source = f.expected.fieldMeans[0], row = f.rows[0];
    source.delta = delta;
    source.skill = source.baseline + delta;
    row.dataset.treatmentScore = source.skill.toFixed(1);
    row.delta.textContent = text + ' pts';
    assert.deepEqual(f.collect().mismatches, []);
    row.delta.textContent = '+5.0 pts';
    assert.ok(f.collect().mismatches.some(item => item.startsWith('field-mean-source:')));
  }
});

test('compact mobile top-model geometry remains inside each row and keeps all paired numbers readable', () => {
  const f = fixture(), rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  f.document.documentElement.clientWidth = 390;
  f.rows.forEach((row, index) => {
    row.getBoundingClientRect = () => rect(0, index * 300, 390, 240);
    row.comparison.getBoundingClientRect = () => rect(12, index * 300 + 40, 366, 180);
    row.leaders[0].getBoundingClientRect = () => rect(12, index * 300 + 100, 366, 100);
    Object.values(row.leaders[0].fields).forEach((node, fieldIndex) => {
      node.getBoundingClientRect = () => rect(24 + (fieldIndex > 0 ? (fieldIndex - 1) * 100 : 0), index * 300 + (fieldIndex ? 150 : 105), fieldIndex ? 40 : 300, 20);
      node.scrollWidth = node.clientWidth = fieldIndex ? 40 : 300;
    });
  });
  const proof = f.collect(); assert.deepEqual(proof.mismatches, []);
  assert.ok(proof.rows.every(row => row.topModel.geometry.withinViewport && row.topModel.geometry.fieldsNonOverlapping));
});

for (const [name, mutate, mismatch] of [
  ['old model dropdown', f => { f.clutter['#writing-benchmark-model'] = {}; }, 'noModelSelector'],
  ['selected model breakdown', f => { f.clutter['[data-writing-selected-setting],[data-writing-component]'] = {}; }, 'noBreakdown'],
  ['weighted formula', f => { f.clutter['[data-writing-exact-aggregate]'] = {}; }, 'noFormula'],
  ['visible scope selector', f => { f.scoreSelector.current = { getBoundingClientRect: () => ({ width: 300, height: 44 }) }; }, 'noScoreSelector'],
  ['inline provisional accordion', f => { f.clutter['[data-writing-provisional-benchmark]'] = {}; }, 'noInlineProvisional'],
  ['explanatory essay', f => { f.clutter['[data-writing-field-means],[data-writing-ledger-coverage]'] = {}; }, 'noExplanationEssay'],
  ['visible provisional noise', f => { f.scope.innerText += ' Provisional single-judge results'; }, 'noVisibleNoise'],
  ['review-count clutter', f => { f.scope.innerText += ' 1144/1584 reviews'; }, 'noVisibleNoise'],
  ['weight clutter', f => { f.scope.innerText += ' 16.7% weight'; }, 'noVisibleNoise'],
  ['hidden ledger', f => { f.scope.hidden = true; }, 'clean-ledger-identity'],
  ['substituted model score', f => { f.rows[0].dataset.treatmentScore = '92.5'; }, 'field-mean-source'],
  ['wrong uplift', f => { f.rows[0].delta.textContent = '+12.0 pts'; }, 'field-mean-source'],
  ['wrong source basis', f => { f.rows[0].dataset.scoreSource = 'official-panel'; }, 'field-mean-source'],
  ['inaccessible provisional qualification', f => { f.rows[0].aria = 'Plain field mean / Skill field mean'; }, 'accessible-score-basis'],
  ['missing row', f => { f.rows.pop(); }, 'field-mean-inventory'],
  ['wrong track placement', f => { f.rows[0].group = f.groups[1]; }, 'track-placement'],
  ['wrong group inventory', f => { f.groups.reverse(); }, 'grouped-benchmark-inventory'],
  ['incorrect case metadata', f => { f.rows[0].dataset.writingCaseCount = '11'; }, 'source-metadata'],
  ['incorrect effective review metadata', f => { f.rows[2].dataset.writingJudgeCount = '2'; }, 'source-metadata'],
  ['missing visible review count', f => { f.rows[0].meta.textContent = '31 settings'; }, 'visible-metadata'],
  ['compare link changes selected model', f => { f.links[0].href = f.links[0].href.replace('model-a', 'model-b'); }, 'compare-model-link'],
  ['compare link does not go to leaderboard', f => { f.links[0].href += '/benchmarks'; }, 'compare-model-link'],
  ['report link replaced by comparison', f => { f.rows[0].href = f.links[0].href; }, 'field-mean-report']
]) test('clean ledger rejects ' + name, () => {
  const f = fixture(); mutate(f);
  assert.ok(f.collect().mismatches.some(item => item.includes(mismatch)));
});

test('scope and model changes cannot substitute model scores for field means', () => {
  const f = fixture();
  f.expected.selectionId = 'storytelling-magic-discovery';
  f.expected.selectedSettingId = 'model-b';
  f.links.forEach(link => { link.href = link.href.replace('model-a', 'model-b'); });
  const proof = f.collect();
  assert.deepEqual(proof.mismatches, []);
  assert.deepEqual(proof.rows.map(row => row.renderedSkill), ['51.0', '52.0', '53.0', '54.0']);
});

test('clean harness preserves all six score selections, original archive math, methods and closed model audit', () => {
  assert.match(runtime, /const selectionIds=expected\.selectionIds/);
  assert.match(runtime, /signature=entry=>JSON\.stringify\(entry\.benchmarkWeights\)/);
  for (const mode of ['models', 'efficiency']) assert.ok(runtime.includes("inspectWritingSharedControls('" + mode + "'"));
  assert.ok(!runtime.includes("inspectWritingSharedControls('benchmarks'"));
  assert.match(runtime, /presentationVariant: included \? 'writing-overall-v3-v1' : 'writing-benchmark-leaders-v1'/);
  assert.match(runtime, /const comparedBenchmarkId=expected\.listedBenchmarkIds\[0\]/);
  assert.ok(runtime.includes("await click('[data-writing-compare-models=\"'+comparedBenchmarkId+'\"]')"));
  assert.match(runtime, /fixed-review-cohort:/);
  assert.match(runtime, /unranked-diagnostic:/);
  assert.match(runtime, /defaultClosed,opensForAudit:/);
  assert.match(runtime, /closesAfterAudit/);
  assert.match(runtime, /scope:'category-methodology'/);
});

test('Overall v3 ledger variant requires the new source-backed presentation without relaxing scores or top-model checks', () => {
  const f = fixture();
  f.expected.presentationVariant = 'writing-overall-v3-v1';
  assert.ok(f.collect().mismatches.includes('clean-ledger-identity'));
  f.scope.dataset.writingPresentation = 'writing-overall-v3-v1';
  assert.deepEqual(f.collect().mismatches, []);
  f.rows[0].dataset.treatmentScore = '100.0';
  assert.ok(f.collect().mismatches.some(item => item.startsWith('field-mean-source:')));
});

test('Writing Overall participation is edition-gated and reconstructs from original category sources', () => {
  const start = runtime.indexOf('function writingOverallPresentation(overall)');
  const end = runtime.indexOf('\nfunction expectedWritingWeightToken', start);
  const classify = vm.runInNewContext(runtime.slice(start, end) + '\nwritingOverallPresentation');
  assert.equal(classify({ scoreBasis: { edition: 'overall-v3' } }).presentationVariant, 'writing-overall-v3-v1');
  assert.equal(classify({ scoreBasis: { edition: 'overall-v2' } }).included, false);
  assert.equal(classify({ scoreBasis: { edition: 'overall-v2' } }).presentationVariant, 'writing-benchmark-leaders-v1');
  assert.match(runtime, /deriveExpectedOverallV3\(\{\.\.\.originalSources,writing:collection\}\)/);
  assert.match(runtime, /verifyOverallV3Projection\(initialOverall,overallExpected\)/);
  assert.match(runtime, /sourceOverallSha256:overallSha256/);
  assert.match(runtime, /participation=expectedInclusion\?includedOverall&&!excludedOverall&&overallWeight===0\.25:excludedOverall&&!includedOverall/);
  assert.match(runtime, /Writing preserves Overall bytes/);
});

const reportStart = runtime.indexOf('const verifyWritingReportPresentation = async benchmarkId => {');
const reportEnd = runtime.indexOf('\nconst verifyDungeonMaster =', reportStart);
assert.ok(reportStart >= 0 && reportEnd > reportStart);
const reportCollector = runtime.slice(reportStart, reportEnd);
function reportFixture() {
  const captures = [], ranking = { querySelector: () => ({ textContent: 'Model comparison' }) }, hero = { nextElementSibling: ranking };
  const details = { tagName: 'DETAILS', open: false, contains: () => true, querySelector: () => ({ textContent: 'Judge & trial details', click: () => { details.open = !details.open; } }) };
  const table = { getBoundingClientRect: () => ({ width: 600, height: 200 }), checkVisibility: () => details.open };
  const context = vm.createContext({
    document: { querySelector: selector => selector === '.evidence-hero#overview' ? hero : selector === 'section#ranking' ? ranking : details, querySelectorAll: () => [table] },
    scrollTo() {}, check: (label, condition) => assert.ok(condition, label), capture: async name => { captures.push({ name, open: details.open }); },
    waitFor: async (predicate, label, timeout) => { assert.equal(timeout, 5000); for (let attempt = 0; attempt < 3; attempt++) { const result = await predicate(); if (result) return result; } throw Error('Timed out: ' + label); },
    evaluateFunction: async (fn, argument) => fn(argument), ensureWritingReportAuditDetailsOpen: async () => { details.open = true; return true; }
  });
  context.evaluate = expression => vm.runInContext(expression, context);
  vm.runInContext(reportCollector, context);
  return { hero, ranking, details, table, captures,
    inspect: () => vm.runInContext("verifyWritingReportPresentation('storytelling-magic-discovery')", context),
    close: async proof => { context.proof = proof; await vm.runInContext('closeWritingReportAuditDetails(proof)', context); } };
}

test('real report audit captures the common closed presentation before opening detailed evidence', async () => {
  const f = reportFixture(), proof = await f.inspect();
  assert.equal(proof.defaultClosed, true); assert.equal(proof.modelComparisonFirst, true); assert.equal(proof.secondaryTablesHidden, true);
  assert.equal(proof.opensForAudit, true); assert.equal(proof.secondaryTablesVisibleForAudit, true); assert.equal(f.details.open, true);
  assert.deepEqual(f.captures, [{ name: 'writing-report-default.png', open: false }]);
  await f.close(proof);
  assert.equal(proof.closesAfterAudit, true); assert.equal(f.details.open, false);
});

for (const [name, mutate] of [
  ['details open by default', f => { f.details.open = true; }],
  ['different model heading', f => { f.ranking.querySelector = () => ({ textContent: 'Four judge contexts' }); }],
  ['table before model comparison', f => { f.hero.nextElementSibling = f.table; }],
  ['visible secondary table', f => { f.table.checkVisibility = () => true; }],
  ['permanently hidden secondary table', f => { f.table.checkVisibility = () => false; }],
  ['missing native visibility proof', f => { delete f.table.checkVisibility; }],
  ['secondary table with no geometry when opened', f => { f.table.getBoundingClientRect = () => ({ width: 0, height: 0 }); }],
  ['summary cannot open disclosure', f => { f.details.querySelector = () => ({ textContent: 'Judge & trial details', click() {} }); }],
  ['secondary table outside disclosure', f => { f.details.contains = () => false; }]
]) test('report presentation audit rejects ' + name, async () => {
  const f = reportFixture(); mutate(f); await assert.rejects(f.inspect());
});

test('report audit rejects a table that remains painted after closing the disclosure', async () => {
  const f = reportFixture(), proof = await f.inspect();
  f.table.checkVisibility = () => true;
  await assert.rejects(f.close(proof));
});

test('report audit waits for actual native visibility after a bounded transient open-render delay', async () => {
  const f = reportFixture(); let observations = 0;
  f.table.checkVisibility = () => f.details.open && ++observations > 1;
  const proof = await f.inspect();
  assert.equal(proof.secondaryTablesVisibleForAudit, true);
  assert.equal(observations, 2);
});

test('report audit waits for actual native hiding after a bounded transient close-render delay', async () => {
  const f = reportFixture(), proof = await f.inspect(); let observations = 0;
  f.table.checkVisibility = () => ++observations === 1;
  await f.close(proof);
  assert.equal(proof.closesAfterAudit, true);
  assert.equal(observations, 2);
});
