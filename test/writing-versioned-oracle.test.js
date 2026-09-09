import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { PAIRED_TWISTS_EDITION, PAIRED_WRITING_SCORE_BASIS, deriveExpectedWritingCategory, verifyCandidateCategoryProjection } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';
import { WRITING_PAIRED_SCORE_BASIS } from '../cli/eval/plot-twists-paired-publication.js';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(app.slice(0, app.indexOf('(async function () {')), context);
const build = (collection, selection) => JSON.parse(JSON.stringify(context.buildWritingCategoryCollection(collection, selection)));
const ids = ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery'];
function publication(id, track, matrix) {
  const settings = Object.keys(matrix).map(id => ({ id, configurationId: id }));
  return { benchmarks: [{ id, trackId: track }], tracks: [{ id: track, title: track }], settings,
    cases: [{ id: 'one' }], entries: settings.flatMap(setting => ['baseline', 'skill'].map((condition, i) => ({
      id: `${setting.id}-${condition}`, settingId: setting.id, configurationId: setting.id,
      condition, exactScore: matrix[setting.id][i], score: matrix[setting.id][i], eligibleForRank: true,
      metrics: { meanLatencyMs: 1000, meanOutputTokens: 100 }
    }))), coverage: { executionComplete: true }, scoreBasis: { id: `${id}:basis`, judgeCount: 2 } };
}
function fixture() {
  const base = publication(ids[0], 'storytelling', { gpt: [70, 90], claude: [65, 80] });
  base.additionalBenchmarks = {
    [ids[1]]: publication(ids[1], 'storytelling', { gpt: [75, 95], claude: [70, 85] }),
    [ids[2]]: publication(ids[2], 'storytelling', { gpt: [80, 100], claude: [75, 90] }),
    legacy: publication('dungeon-master-adventure-outline', 'dungeon-master', { gpt: [5, 5] })
  };
  base.compactBenchmarks = { place: publication('writing-place-generation-v1', 'worldbuilding', { claude: [80, 100] }) };
  base.writingScoreBasis = { id: 'writing-established-storytelling-v1', benchmarkIds: [...ids], method: 'equal-benchmark-mean' };
  base.catalog = [...ids.map(id => ({ id, archived: false })),
    { id: 'dungeon-master-adventure-outline', archived: true },
    { id: 'writing-place-generation-v1', archived: false }];
  return base;
}

test('independent fixed-basis oracle keeps broad scores unchanged by new Claude-only and archived results', () => {
  const source = fixture();
  const expected = deriveExpectedWritingCategory(source, 'all-writing');
  assert.deepEqual(expected.activeBenchmarkIds, ids);
  assert.equal(expected.rankedSettings, 2);
  assert.equal(expected.entries.find(row => row.configurationId === 'gpt' && row.condition === 'skill').exactScore, 95);
  assert.equal(expected.entries.find(row => row.configurationId === 'claude' && row.condition === 'skill').exactScore, 85);
  verifyCandidateCategoryProjection(build(source, 'all-writing'), expected);
  for (const selection of expected.selectionIds) {
    verifyCandidateCategoryProjection(build(source, selection), deriveExpectedWritingCategory(source, selection));
  }
});

test('fixed-basis oracle rejects absent sources, renamed basis, score contamination and changed weights', () => {
  const source = fixture();
  const expected = deriveExpectedWritingCategory(source, 'all-writing');
  const candidate = build(source, 'all-writing');
  candidate.entries.find(row => row.configurationId === 'claude' && row.condition === 'skill').exactScore = 100;
  assert.throws(() => verifyCandidateCategoryProjection(candidate, expected));
  source.writingScoreBasis.benchmarkIds.push('writing-place-generation-v1');
  assert.throws(() => deriveExpectedWritingCategory(source, 'all-writing'), /sources changed/);
  const missing = fixture();
  delete missing.additionalBenchmarks[ids[1]];
  assert.throws(() => deriveExpectedWritingCategory(missing, 'all-writing'), /required established/);
});

test('fresh Plot twists narrows equal-weight Writing to common medium settings without reusing prior high-effort scores', () => {
  const configurations = ['codex:gpt-6-astra@medium', 'codex:gpt-5.6-sol@medium', 'codex:gpt-5.6-terra@medium',
    'codex:gpt-5.6-luna@medium', 'claude:claude-fable-5-1@medium', 'claude:claude-opus-5@medium'];
  const extra = ['codex:gpt-6-astra@high', 'claude:claude-opus-5@max'];
  const matrix = (roster, pair) => Object.fromEntries(roster.map(id => [id, [...pair]]));
  const source = publication(ids[0], 'storytelling', matrix([...configurations, ...extra], [70, 80]));
  source.provisionalLeaderboard = { status: 'provisional', judgeCount: 1, entries: source.entries };
  const twists = publication(ids[1], 'storytelling', matrix(configurations, [50, 60]));
  twists.scoreBasis.edition = PAIRED_TWISTS_EDITION;
  source.benchmarkPublications = [{ benchmarkId: ids[1], projection: twists },
    { benchmarkId: ids[2], projection: publication(ids[2], 'storytelling', matrix([...configurations, ...extra], [90, 100])) }];
  source.publicRelease = { id: 'writing-storytelling-public-v1', lifecycle: 'published' };
  source.writingScoreBasis = structuredClone(PAIRED_WRITING_SCORE_BASIS);
  source.catalog = ids.map(id => ({ id, lifecycle: 'published', archived: false, trackId: 'storytelling', scoreBasisIncluded: true }));
  const expected = deriveExpectedWritingCategory(source, 'all-writing');
  assert.equal(expected.rankedSettings, 6);
  assert.deepEqual(expected.activeBenchmarkIds, ids);
  assert.deepEqual(expected.benchmarkWeights, Object.fromEntries(ids.map(id => [id, 1 / 3])));
  const candidate = build(source, 'all-writing');
  verifyCandidateCategoryProjection(candidate, expected);
  const ranked = candidate.entries.filter(entry => entry.condition === 'skill' && entry.eligibleForRank);
  assert.deepEqual(ranked.map(entry => entry.configurationId).sort(), [...configurations].sort());
  assert.ok(ranked.every(entry => entry.exactScore === 80));
  assert.ok(candidate.entries.filter(entry => extra.includes(entry.configurationId)).every(entry => !entry.eligibleForRank));
  const oldBasis = structuredClone(source); oldBasis.writingScoreBasis.id = 'writing-established-storytelling-v1';
  assert.throws(() => deriveExpectedWritingCategory(oldBasis, 'all-writing'), /basis/);
  const oldEdition = structuredClone(source); delete oldEdition.benchmarkPublications[0].projection.scoreBasis.edition;
  assert.throws(() => deriveExpectedWritingCategory(oldEdition, 'all-writing'), /basis/);
});

test('the real generated paired candidate and independent oracle agree on the complete edition-pinned basis', () => {
  assert.deepEqual(PAIRED_WRITING_SCORE_BASIS, WRITING_PAIRED_SCORE_BASIS);
  const globals = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-data.js', import.meta.url), 'utf8'), globals);
  const source = JSON.parse(JSON.stringify(globals.window.VASIR_WRITING));
  assert.deepEqual(source.writingScoreBasis, WRITING_PAIRED_SCORE_BASIS);
  const expected = deriveExpectedWritingCategory(source, 'all-writing');
  verifyCandidateCategoryProjection(build(source, 'all-writing'), expected);
  assert.equal(expected.rankedSettings, 6);
  const runtime = fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-browsercheck.mjs', import.meta.url), 'utf8');
  const inspector = runtime.slice(runtime.indexOf('const inspectWritingComparison = '));
  const expression = inspector.slice(inspector.indexOf(',round=') + ',round='.length, inspector.indexOf(';\n    const rows='));
  const displayRound = vm.runInNewContext('(' + expression + ')');
  const baseline = expected.entries.find(entry => entry.configurationId === 'codex:gpt-6-astra@ultra' && entry.condition === 'baseline');
  const skill = expected.entries.find(entry => entry.configurationId === 'codex:gpt-6-astra@ultra' && entry.condition === 'skill');
  assert.equal(skill.partial, true); assert.equal(skill.eligibleForRank, false); assert.equal(skill.rank, null);
  assert.equal(skill.exactDelta, 4.749999999999986, 'Retain the actual independent unrounded arithmetic.');
  assert.equal(displayRound(skill.exactDelta, Math.max(Math.abs(baseline.exactScore), Math.abs(skill.exactScore))), 4.8);
  assert.equal(displayRound(skill.exactDelta), 4.7, 'The regression must exercise cancellation at source-score scale.');
  for (const [value, wanted] of [[4.75 - 1e-10, 4.7], [4.75 + 1e-10, 4.8], [-4.75 - 1e-10, -4.8], [-4.75 + 1e-10, -4.7], [4.74, 4.7], [4.76, 4.8]]) {
    assert.equal(displayRound(value, 100), wanted, 'The bounded correction must not accept an actual score-boundary change.');
  }
  const missingEdition = structuredClone(source); delete missingEdition.writingScoreBasis.benchmarkEditions;
  assert.throws(() => deriveExpectedWritingCategory(missingEdition, 'all-writing'), /basis changed/);
  const staleEdition = structuredClone(source); staleEdition.writingScoreBasis.benchmarkEditions['storytelling-plot-twists'] = 'storytelling-plot-twists-v1';
  assert.throws(() => deriveExpectedWritingCategory(staleEdition, 'all-writing'), /basis changed/);
});
