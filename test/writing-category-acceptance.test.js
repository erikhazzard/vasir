import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { deriveExpectedWritingCategory, verifyCandidateCategoryProjection, verifyWritingProofEvidence } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const boundary = app.indexOf('(async function () {');
assert.ok(boundary > 0);
const context = vm.createContext({});
vm.runInContext(app.slice(0, boundary), context);
const build = source => JSON.parse(JSON.stringify(context.buildWritingCategoryCollection(source)));
const clone = value => JSON.parse(JSON.stringify(value));

function publication(id, group, configurations) {
  const settings = Object.keys(configurations).map(id => ({ id, configurationId: id }));
  const entries = settings.flatMap(setting => ['baseline', 'skill'].map((condition, index) => ({ id: `${setting.id}-${condition}`, settingId: setting.id, configurationId: setting.id, condition,
    exactScore: configurations[setting.id][index], score: configurations[setting.id][index], metrics: { meanLatencyMs: 1000, meanOutputTokens: 200 } })));
  return { benchmarks: [{ id, trackId: group }], settings, entries, cases: [{ id: 'one' }], trialCount: 1, tracks: [{ id: group, title: group }], coverage: { responseCount: entries.length, judgmentCount: entries.length * 2, completedSettingCount: settings.filter(setting => configurations[setting.id].every(Number.isFinite)).length } };
}
function receipt(expected, benchmarkId) {
  const category = Object.fromEntries(['benchmarkIds', 'activeBenchmarkIds', 'groupIds', 'settingIds', 'completeSettings', 'unscoredSettings', 'tiedRankEntries', 'regressionSettings', 'efficiencyEvidence'].map(key => [key, clone(expected[key])]));
  return { benchmarkId, trialCount: expected.publications.get(benchmarkId).trialCount, coverage: clone(expected.publications.get(benchmarkId).coverage),
    categoryEvidence: { ...category, mismatches: [], rawUnchanged: true, noPicker: true, tabsImmediatelyAfterHeader: true, answersLazy: true, disclosure: true, hash: '#capabilities/writing', visibleSettingIds: expected.entries.filter(entry => entry.condition === 'skill' && Number.isFinite(entry.exactScore)).map(entry => entry.settingId) },
    scoredBranchCoverage: { ...Object.fromEntries(['completeSettings', 'unscoredSettings', 'tiedRankEntries', 'regressionSettings'].map(key => [key, expected[key]])), efficiency: clone(expected.efficiencyEvidence), required: true } };
}
function fixture() {
  const root = publication('story-a', 'storytelling', { a: [60, 80], b: [50, 70] });
  root.benchmarkPublications = [{ benchmarkId: 'story-b', projection: publication('story-b', 'storytelling', { a: [40, 60], b: [50, 70] }) }];
  root.additionalBenchmarks = { prose: publication('prose', 'prose', { a: [100, 80], b: [80, null], c: [50, 60] }) };
  return root;
}

test('acceptance independently derives equal active groups, equal benchmarks and the fixed paired cohort', () => {
  const source = fixture();
  const expected = deriveExpectedWritingCategory(source);
  assert.deepEqual(expected.benchmarkWeights, { 'story-a': 0.25, 'story-b': 0.25, prose: 0.5 });
  assert.equal(expected.completeSettings, 1);
  assert.equal(expected.unscoredSettings, 2);
  assert.equal(expected.entries.find(entry => entry.id === 'a-skill').exactScore, 75);
  assert.equal(expected.entries.find(entry => entry.id === 'b-skill').exactScore, null);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(expected, 'story-a'), expected));
});

test('acceptance rejects changed category weights, score arithmetic, ranks and group contributions', () => {
  const expected = deriveExpectedWritingCategory(fixture());
  for (const mutate of [
    value => { value.writingCategory.benchmarkWeights['story-a'] = 0.5; },
    value => { value.entries.find(entry => entry.id === 'a-skill').exactScore = 76; },
    value => { value.entries.find(entry => entry.id === 'a-skill').rank = 2; },
    value => { value.entries.find(entry => entry.id === 'a-skill').categories[0].exactContribution = 40; },
    value => { value.entries.find(entry => entry.id === 'b-skill').latency = 1; }
  ]) {
    const actual = build(fixture()); mutate(actual);
    assert.throws(() => verifyCandidateCategoryProjection(actual, expected));
  }
});

test('proof acceptance rejects wrong cohort, missing identities, picker hierarchy, ranked gaps and stale coverage', () => {
  const expected = deriveExpectedWritingCategory(fixture());
  for (const mutate of [
    value => { value.categoryEvidence.activeBenchmarkIds.pop(); },
    value => { value.categoryEvidence.settingIds.push('a'); },
    value => { value.categoryEvidence.noPicker = false; },
    value => { value.categoryEvidence.tabsImmediatelyAfterHeader = false; },
    value => { value.categoryEvidence.visibleSettingIds.push('b'); },
    value => { value.categoryEvidence.completeSettings++; },
    value => { value.scoredBranchCoverage.completeSettings++; },
    value => { value.categoryEvidence.efficiencyEvidence[0].frontierPoints++; },
    value => { value.coverage.judgmentCount++; },
    value => { value.trialCount++; },
    value => { value.categoryEvidence.mismatches.push('wrong-rank'); }
  ]) {
    const proof = receipt(expected, 'story-a'); mutate(proof);
    assert.throws(() => verifyWritingProofEvidence(proof, expected));
  }
});

test('Core coverage follows the exact candidate checkpoint rather than historical 904 reviews', () => {
  const source = publication('storytelling-core-idea', 'storytelling', { a: [50, 70] });
  source.coverage.judgmentCount = 1234;
  const expected = deriveExpectedWritingCategory(source);
  const proof = receipt(expected, 'storytelling-core-idea');
  assert.doesNotThrow(() => verifyWritingProofEvidence(proof, expected));
  proof.coverage.judgmentCount = 904;
  assert.throws(() => verifyWritingProofEvidence(proof, expected), /Report coverage changed/);
});

test('Plot twists always retains the original terminal exclusions and two complete configurations', () => {
  const source = publication('storytelling-plot-twists', 'storytelling', { sol: [55.4, 92.025], luna: [56.45, 84.7], astra: [null, null], terra: [null, null] });
  source.trialCount = 10;
  source.coverage = { responseCount: 80, expectedResponseCount: 80, validResponseCount: 78, scoredResponseCount: 76, judgmentCount: 152, expectedJudgmentCount: 160, terminalGenerationFailureCount: 2, terminallyExcludedPairCount: 2, terminallyExcludedJudgmentCount: 8, pendingGenerationCount: 0, pendingJudgmentCount: 0, completedSettingCount: 2, executionStatus: 'complete-with-exclusions', executionComplete: true };
  const expected = deriveExpectedWritingCategory(source);
  assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(expected, source.benchmarks[0].id), expected));
  source.coverage.validResponseCount = 80;
  const altered = deriveExpectedWritingCategory(source);
  assert.throws(() => verifyWritingProofEvidence(receipt(altered, source.benchmarks[0].id), altered), /Frozen Plot twists validResponseCount/);
});

test('independent acceptance arithmetic agrees with the current real candidate without pinning advancing Core counts', () => {
  const globals = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-data.js', import.meta.url), 'utf8'), globals);
  const source = clone(globals.window.VASIR_WRITING);
  const expected = deriveExpectedWritingCategory(source);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  for (const benchmarkId of ['storytelling-core-idea', 'storytelling-plot-twists']) assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(expected, benchmarkId), expected));
});
