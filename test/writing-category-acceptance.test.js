import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { deriveExpectedWritingCategory, deriveExpectedProvisionalEvidence, verifyCandidateCategoryProjection, verifyWritingProofEvidence } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';

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
  const result = { benchmarkId, trialCount: expected.publications.get(benchmarkId).trialCount, coverage: clone(expected.publications.get(benchmarkId).coverage),
    categoryEvidence: { ...category, mismatches: [], rawUnchanged: true, noPicker: true, tabsImmediatelyAfterHeader: true, answersLazy: true, disclosure: true, hash: '#capabilities/writing', visibleSettingIds: expected.entries.filter(entry => entry.condition === 'skill' && Number.isFinite(entry.exactScore)).map(entry => entry.settingId),
      provisionalDisplayEvidence: (expected.provisionalEvidence || []).map(({ reviewedAnswers, judgeConfigurationId, ...record }) => ({ ...record, judgeConfigurationIds: [judgeConfigurationId], activeBenchmarkIds: [...expected.activeBenchmarkIds], mismatches: [] })),
      partialEvidence: { settingIds: expected.partialSettings.map(item => item.settingId), mismatches: [], rows: expected.partialSettings.map(item => ({ settingId: item.settingId, total: null, rank: null, delta: null,
        ...Object.fromEntries(['baseline', 'skill'].map(condition => [condition, item[condition].categories.map(group => ({ groupId: group.category, weight: group.weight, rawScore: group.score, exactScore: group.exactScore, contribution: group.exactContribution, available: Number.isFinite(group.exactScore) }))])) })) } },
    provisionalArchiveEvidence: (expected.provisionalEvidence || []).map(record => ({ ...record, mismatches: [] })),
    scoredBranchCoverage: { ...Object.fromEntries(['completeSettings', 'unscoredSettings', 'tiedRankEntries', 'regressionSettings'].map(key => [key, expected[key]])), efficiency: clone(expected.efficiencyEvidence), required: true } };
  if (benchmarkId === 'dungeon-master-adventure-outline') {
    delete result.trialCount;
    delete result.scoredBranchCoverage;
    const source = expected.publications.get(benchmarkId);
    result.caseEvidence = source.cases.map(story => ({ caseId: story.id, answers: source.caseResults.filter(cell => cell.caseId === story.id).length,
      judgments: source.caseResults.filter(cell => cell.caseId === story.id).reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0),
      preferences: source.pairwisePreferences.filter(item => item.caseId === story.id).length, mismatches: [] }));
  }
  return result;
}
function realSources() {
  const globals = { window: {} };
  for (const file of ['writing-data.js', 'writing-responses.js']) vm.runInNewContext(fs.readFileSync(new URL(`../site/vasirbenchmark.com/${file}`, import.meta.url), 'utf8'), globals);
  return { source: clone(globals.window.VASIR_WRITING), archive: clone(globals.window.VASIR_WRITING_RESPONSES) };
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
  const { source, archive } = realSources();
  const expected = deriveExpectedWritingCategory(source);
  expected.provisionalEvidence = deriveExpectedProvisionalEvidence(expected, archive);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  for (const benchmarkId of expected.benchmarkIds) assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(expected, benchmarkId), expected));
});

test('provisional proof acceptance binds both DOM and original-review evidence to the exact source and excludes it from the index', () => {
  const { source, archive } = realSources();
  const expected = deriveExpectedWritingCategory(source);
  expected.provisionalEvidence = deriveExpectedProvisionalEvidence(expected, archive);
  assert.equal(expected.provisionalEvidence.length, 1);
  const observed = expected.provisionalEvidence[0];
  const original = source.provisionalLeaderboard;
  assert.equal(observed.rankedSettings, original.rankedSettingCount);
  assert.equal(observed.incompleteSettings, original.incompleteSettings.length);
  assert.equal(observed.sourceSha256, original.sourceSha256);
  assert.ok(!expected.activeBenchmarkIds.includes(original.benchmarkId), 'Provisional-only Core must not enter the active primary cohort.');
  for (const mutate of [
    value => { value.categoryEvidence.provisionalDisplayEvidence = []; },
    value => { value.provisionalArchiveEvidence = []; },
    value => { value.categoryEvidence.provisionalDisplayEvidence[0].sourceSha256 = 'old-checkpoint'; },
    value => { value.provisionalArchiveEvidence[0].sourceSha256 = 'old-checkpoint'; },
    value => { value.categoryEvidence.provisionalDisplayEvidence[0].judgeConfigurationIds = ['codex:gpt-5.6-sol@xhigh']; },
    value => { value.provisionalArchiveEvidence[0].judgeConfigurationId = 'codex:gpt-5.6-sol@xhigh'; },
    value => { value.categoryEvidence.provisionalDisplayEvidence[0].rankedSettings++; },
    value => { value.provisionalArchiveEvidence[0].incompleteSettings--; },
    value => { value.provisionalArchiveEvidence[0].reviewedAnswers++; },
    value => { value.categoryEvidence.provisionalDisplayEvidence[0].activeBenchmarkIds.push(original.benchmarkId); },
    value => { value.categoryEvidence.provisionalDisplayEvidence[0].mismatches.push('row-readings'); },
    value => { value.provisionalArchiveEvidence[0].mismatches.push('original-rating-total'); }
  ]) {
    const proof = receipt(expected, original.benchmarkId); mutate(proof);
    assert.throws(() => verifyWritingProofEvidence(proof, expected));
  }
});

test('provisional acceptance independently rejects altered original ratings, ranks, incomplete cases and summary totals', () => {
  const originals = realSources();
  for (const mutate of [
    ({ source }) => { source.provisionalLeaderboard.entries.find(entry => entry.eligibleForRank).rank++; },
    ({ source }) => { source.provisionalLeaderboard.entries.find(entry => entry.eligibleForRank).exactScore++; },
    ({ source }) => { source.provisionalLeaderboard.incompleteSettings[0].missingCaseIds = []; },
    ({ source }) => { source.provisionalLeaderboard.summary.exactDelta++; },
    ({ archive }) => { const judgment = archive.responses.flatMap(answer => answer.judgments).find(judge => judge.judgeConfigurationId === 'codex:gpt-6-astra@xhigh'); judgment.score++; }
  ]) {
    const data = clone(originals); mutate(data);
    assert.throws(() => deriveExpectedProvisionalEvidence(deriveExpectedWritingCategory(data.source), data.archive));
  }
});

test('partial cohort derivation preserves known subgroup evidence but never renormalizes or scores missing groups', () => {
  const source = publication('story', 'storytelling', { writer: [60, 90], partial: [70, null] });
  source.additionalBenchmarks = { game: publication('game', 'dungeon-master', { gm: [80, 95] }) };
  const expected = deriveExpectedWritingCategory(source);
  assert.equal(expected.completeSettings, 0);
  assert.deepEqual(expected.partialSettings.map(item => item.settingId), ['writer', 'gm']);
  const writer = expected.partialSettings.find(item => item.settingId === 'writer');
  assert.deepEqual(writer.knownGroupIds, ['storytelling']);
  assert.deepEqual(writer.missingGroupIds, ['dungeon-master']);
  assert.deepEqual(writer.skill.categories, [
    { category: 'storytelling', weight: 0.5, exactScore: 90, score: 90, exactContribution: 45 },
    { category: 'dungeon-master', weight: 0.5, exactScore: null, score: null, exactContribution: null }
  ]);
  for (const entry of expected.entries) for (const field of ['score', 'exactScore', 'rank', 'exactDelta', 'latency', 'tokens']) assert.equal(entry[field], null);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(expected, 'story'), expected));
  for (const mutate of [
    value => { delete value.categoryEvidence.partialEvidence; },
    value => { value.categoryEvidence.partialEvidence.settingIds.pop(); },
    value => { value.categoryEvidence.partialEvidence.rows.push(value.categoryEvidence.partialEvidence.rows[0]); },
    value => { value.categoryEvidence.partialEvidence.rows[0].total = 45; },
    value => { value.categoryEvidence.partialEvidence.rows[0].rank = 1; },
    value => { value.categoryEvidence.partialEvidence.rows[0].delta = 15; },
    value => { value.categoryEvidence.partialEvidence.rows[0].skill[0].weight = 1; },
    value => { value.categoryEvidence.partialEvidence.rows[0].skill[0].rawScore++; },
    value => { value.categoryEvidence.partialEvidence.rows[0].skill[0].exactScore++; },
    value => { value.categoryEvidence.partialEvidence.rows[0].skill[0].contribution = 90; },
    value => { value.categoryEvidence.partialEvidence.rows[0].skill[1].contribution = 0; },
    value => { value.categoryEvidence.partialEvidence.rows[0].skill[1].available = true; },
    value => { value.categoryEvidence.partialEvidence.mismatches.push('unavailable-is-zero'); }
  ]) {
    const proof = receipt(expected, 'story'); mutate(proof);
    assert.throws(() => verifyWritingProofEvidence(proof, expected));
  }
});

test('Dungeon Master acceptance requires every candidate case and exact original answer, judge and preference counts', () => {
  const { source, archive } = realSources();
  const expected = deriveExpectedWritingCategory(source);
  expected.provisionalEvidence = deriveExpectedProvisionalEvidence(expected, archive);
  const id = 'dungeon-master-adventure-outline';
  assert.ok(expected.publications.has(id), 'The coordinated candidate must retain the selected DM publication.');
  assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(expected, id), expected));
  for (const mutate of [
    value => { value.caseEvidence.pop(); },
    value => { value.caseEvidence.push(value.caseEvidence[0]); },
    value => { value.caseEvidence[0].answers--; },
    value => { value.caseEvidence[0].judgments--; },
    value => { value.caseEvidence[0].preferences--; },
    value => { value.caseEvidence[0].mismatches.push('exact-answer'); },
    value => { value.trialCount = 16; },
    value => { value.coverage.caseCount--; }
  ]) {
    const proof = receipt(expected, id); mutate(proof);
    assert.throws(() => verifyWritingProofEvidence(proof, expected));
  }
});
