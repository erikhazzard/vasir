import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Independent arithmetic for the acceptance boundary. Do not call the app's
// category builder here: the candidate implementation is what we are checking.
const finite = Number.isFinite;
const conditions = ['baseline', 'skill'];
export const WRITING_CATEGORY_METHOD = 'common-benchmark-ranking-with-visible-partials-v5';
export const VERSIONED_WRITING_CATEGORY_METHOD = 'versioned-common-benchmark-ranking-v6';
export const PAIRED_TWISTS_EDITION = 'storytelling-plot-twists-paired-v2';
export const PAIRED_WRITING_SCORE_BASIS = {
  id: 'writing-storytelling-paired-v2',
  benchmarkIds: ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery'],
  benchmarkEditions: { 'storytelling-plot-twists': 'storytelling-plot-twists-paired-v2' },
  coreIdeaScoring: 'published-single-judge-provisional', method: 'equal-benchmark-mean'
};
const selectedWritingMethod = method => [WRITING_CATEGORY_METHOD, VERSIONED_WRITING_CATEGORY_METHOD].includes(method);
export const WRITING_LEDGER_PRESENTATION = 'writing-benchmark-ledger-v1';
export const WRITING_LEADERS_PRESENTATION = 'writing-benchmark-leaders-v1';
export const WRITING_OVERALL_PRESENTATION = 'writing-overall-v3-v1';
const isCleanWritingPresentation = value => [WRITING_LEDGER_PRESENTATION, WRITING_LEADERS_PRESENTATION, WRITING_OVERALL_PRESENTATION].includes(value);
const hasWritingBenchmarkLeaders = value => [WRITING_LEADERS_PRESENTATION, WRITING_OVERALL_PRESENTATION].includes(value);
export const WRITING_PARTIAL_FOOTNOTE = '* Unranked mean of available scores, not a comparable aggregate. Missing tests are not zero. Only models with every selected test receive a rank.';
export const WRITING_LEDGER_PARTIAL_FOOTNOTE = '* Incomplete results are shown separately, without a rank.';
export const LEGACY_WRITING_CATEGORY_METHOD = 'planned-roster-finalized-equal-subcategory-complete-paired-index-v2';
const close = (actual, expected, label) => assert.ok(expected === null ? actual === null : finite(actual) && Math.abs(actual - expected) < 1e-8, label);
// Independent sums and weighted means may differ by an ULP at a half-tenth.
// Apply the display tie policy without rounding the exact scores or ranks.
const round = value => finite(value) ? Math.round((value + 2 * Number.EPSILON * Math.max(1, Math.abs(value))) * 10) / 10 : null;
const exact = (actual, expected, label) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), label);
const sameIds = (actual, expected, label) => {
  assert.ok(Array.isArray(actual) && new Set(actual).size === actual.length, `${label}: missing or duplicate identity`);
  exact([...actual].sort(), [...expected].sort(), label);
};

export function deriveExpectedLegacyWritingCategory(collection) {
  const publications = new Map();
  function collect(source) {
    if (!source) return;
    const id = source.benchmarks?.[0]?.id;
    if (id && !publications.has(id)) publications.set(id, source);
    for (const child of source.benchmarkPublications || []) collect(child.projection);
    for (const child of Object.values(source.additionalBenchmarks || {})) collect(child);
  }
  collect(collection);
  assert.ok(publications.size, 'No candidate Writing publications.');
  const settings = new Map();
  const rows = new Map();
  const groupFor = new Map();
  const rosters = new Map();
  for (const [id, publication] of publications) {
    const identities = new Map();
    for (const setting of publication.settings) {
      const identity = setting.configurationId || setting.id;
      identities.set(setting.id, identity);
      if (!settings.has(identity)) settings.set(identity, setting.id);
    }
    const matrix = new Map();
    for (const entry of publication.entries) {
      const identity = entry.configurationId || identities.get(entry.settingId || entry.id) || entry.settingId || entry.id;
      assert.ok(conditions.includes(entry.condition), `Unknown Writing condition: ${entry.condition}`);
      if (!matrix.has(identity)) matrix.set(identity, {});
      assert.ok(!matrix.get(identity)[entry.condition], `Duplicate raw entry: ${id}/${identity}/${entry.condition}`);
      matrix.get(identity)[entry.condition] = entry;
    }
    rows.set(id, matrix);
    rosters.set(id, [...new Set(identities.values())].sort());
    groupFor.set(id, publication.benchmarks[0].trackId || publication.subcategory || 'storytelling');
  }
  const paired = row => conditions.every(condition => finite(row?.[condition]?.exactScore) && row[condition].eligibleForRank !== false);
  const finalized = coverage => {
    if (typeof coverage.executionComplete === 'boolean') return coverage.executionComplete;
    if (typeof coverage.executionStatus === 'string') return ['complete', 'complete-with-exclusions'].includes(coverage.executionStatus);
    const responsesComplete = finite(coverage.expectedResponseCount) && (coverage.responseCount === coverage.expectedResponseCount || finite(coverage.validResponseCount) && finite(coverage.terminalGenerationFailureCount) && coverage.validResponseCount + coverage.terminalGenerationFailureCount === coverage.expectedResponseCount);
    return responsesComplete && finite(coverage.expectedJudgmentCount) && finite(coverage.judgmentCount) && coverage.judgmentCount + (coverage.terminallyExcludedJudgmentCount || 0) === coverage.expectedJudgmentCount;
  };
  const officialCount = id => rosters.get(id).filter(identity => paired(rows.get(id).get(identity))).length;
  const finalizedAnchors = [...publications.keys()].filter(id => finalized(publications.get(id).coverage || {}) && officialCount(id) > 0);
  const declaredRosterSelection = finalizedAnchors.length ? 'widest-finalized-official-source' : 'widest-planned-fallback';
  const declaredRosterBenchmarkId = (finalizedAnchors.length ? finalizedAnchors : [...publications.keys()]).sort((a, b) => rosters.get(b).length - rosters.get(a).length || (a < b ? -1 : a > b ? 1 : 0))[0];
  const declaredConfigurationIds = rosters.get(declaredRosterBenchmarkId);
  const sourceCoverage = [...publications].map(([benchmarkId, publication]) => {
    const completedSettingCount = officialCount(benchmarkId);
    const matchesDeclaredRoster = declaredConfigurationIds.length > 0 && declaredConfigurationIds.every(identity => rosters.get(benchmarkId).includes(identity));
    const executionComplete = finalized(publication.coverage || {});
    const readyForComparison = matchesDeclaredRoster && executionComplete && completedSettingCount > 0;
    const plannedSettingCount = rosters.get(benchmarkId).length;
    const exclusionReason = readyForComparison ? null : plannedSettingCount < declaredConfigurationIds.length ? 'narrower-planned-roster' : !matchesDeclaredRoster ? 'different-planned-roster' : completedSettingCount === 0 ? 'official-scores-unavailable' : 'execution-in-progress';
    return { benchmarkId, plannedSettingCount, completedSettingCount, matchesDeclaredRoster, executionComplete, readyForComparison, included: readyForComparison, exclusionReason };
  });
  const availableOfficialBenchmarkIds = sourceCoverage.filter(source => source.completedSettingCount > 0).map(source => source.benchmarkId);
  const activeBenchmarkIds = sourceCoverage.filter(source => source.included).map(source => source.benchmarkId);
  const groupIds = [...new Set(activeBenchmarkIds.map(id => groupFor.get(id)))];
  const benchmarkWeights = Object.fromEntries(activeBenchmarkIds.map(id => [id, 1 / groupIds.length / activeBenchmarkIds.filter(other => groupFor.get(other) === groupFor.get(id)).length]));
  const entries = [];
  for (const [identity, settingId] of settings) {
    const complete = activeBenchmarkIds.length > 0 && activeBenchmarkIds.every(id => paired(rows.get(id).get(identity)));
    for (const condition of conditions) {
      const weighted = getter => complete && activeBenchmarkIds.every(id => finite(getter(rows.get(id).get(identity)[condition])))
        ? activeBenchmarkIds.reduce((sum, id) => sum + getter(rows.get(id).get(identity)[condition]) * benchmarkWeights[id], 0) : null;
      const exactScore = weighted(entry => entry.exactScore);
      const latencyMs = weighted(entry => entry.metrics?.meanLatencyMs);
      const categories = groupIds.map(group => {
        const ids = activeBenchmarkIds.filter(id => groupFor.get(id) === group);
        const exactScore = ids.every(id => paired(rows.get(id).get(identity))) ? ids.reduce((sum, id) => sum + rows.get(id).get(identity)[condition].exactScore, 0) / ids.length : null;
        return { category: group, weight: 1 / groupIds.length, exactScore, score: round(exactScore), exactContribution: exactScore === null ? null : exactScore / groupIds.length };
      });
      entries.push({ id: `${settingId}-${condition}`, settingId, configurationId: identity, condition, exactScore, score: round(exactScore), categories, latency: latencyMs === null ? null : latencyMs / 1000, tokens: weighted(entry => entry.metrics?.meanOutputTokens) });
    }
  }
  for (const entry of entries) {
    entry.rank = finite(entry.exactScore) ? 1 + entries.filter(other => other.condition === entry.condition && finite(other.exactScore) && other.exactScore > entry.exactScore).length : null;
    const baseline = entries.find(other => other.configurationId === entry.configurationId && other.condition === 'baseline');
    entry.exactDelta = finite(entry.exactScore) ? entry.exactScore - baseline.exactScore : null;
  }
  const completeSettings = entries.filter(entry => entry.condition === 'skill' && finite(entry.exactScore)).length;
  const efficiencyEvidence = ['latency', 'tokens'].map(metric => {
    const eligible = entries.filter(entry => finite(entry.score) && finite(entry[metric]) && entry[metric] > 0);
    const frontier = eligible.filter(entry => !eligible.some(other => other.score >= entry.score && other[metric] <= entry[metric] && (other.score > entry.score || other[metric] < entry[metric])));
    return { metric, eligiblePoints: eligible.length, frontierPoints: frontier.length, mismatches: [] };
  });
  return { publications, entries, benchmarkIds: [...publications.keys()], activeBenchmarkIds, comparisonBenchmarkIds: activeBenchmarkIds, availableOfficialBenchmarkIds, declaredRosterBenchmarkId, declaredRosterSelection, declaredConfigurationIds, sourceCoverage, method: LEGACY_WRITING_CATEGORY_METHOD, groupIds, benchmarkWeights, settingIds: [...settings.values()], completeSettings,
    unscoredSettings: settings.size - completeSettings,
    tiedRankEntries: entries.filter(entry => finite(entry.exactScore) && entries.some(other => other.id !== entry.id && other.condition === entry.condition && other.exactScore === entry.exactScore)).length,
    regressionSettings: entries.filter(entry => entry.condition === 'skill' && finite(entry.exactDelta) && entry.exactDelta < 0).length, efficiencyEvidence };
}

export function deriveExpectedWritingCategory(collection, selectionId = 'storytelling') {
  const publications = new Map();
  const declaredCatalog = new Map((collection.catalog || []).map(item => [item.id, item]));
  const fixedBasis = collection.writingScoreBasis || null;
  const visit = source => {
    if (!source) return;
    const id = source.benchmarks?.[0]?.id;
    const descriptor = declaredCatalog.get(id) || source.benchmarks?.[0]?.publication;
    if (['unscored', 'planned'].includes(descriptor?.status)) return;
    if (source.benchmarks?.[0]?.publication?.adapter === 'writing-compact-v1') {
      const entries = source.entries || [];
      if (!entries.some(entry => entry.condition === 'skill' && finite(entry.exactScore) && entry.eligibleForRank !== false
        && entries.some(pair => (pair.configurationId || pair.settingId) === (entry.configurationId || entry.settingId)
          && pair.condition === 'baseline' && finite(pair.exactScore) && pair.eligibleForRank !== false))) return;
    }
    if (id && !publications.has(id)) publications.set(id, source);
    for (const child of source.benchmarkPublications || []) visit(child.projection);
    for (const child of Object.values(source.additionalBenchmarks || {})) visit(child);
    for (const child of Object.values(source.compactBenchmarks || {})) visit(child);
  };
  visit(collection);
  assert.ok(publications.size, 'No candidate Writing publications.');
  const identities = new Map(), tracks = new Map(), sources = new Map();
  const completeEntry = entry => {
    if (!finite(entry?.exactScore) || entry.eligibleForRank === false) return false;
    for (const [completed, planned] of [['completedPairCount', 'expectedPairCount']]) {
      if (finite(entry[planned]) && entry[completed] !== entry[planned]) return false;
    }
    for (const [completed, planned] of [['scoredCases', 'expectedCases'], ['completedResponses', 'expectedResponses'], ['completedJudgments', 'expectedJudgments']]) {
      if (finite(entry.coverage?.[planned]) && entry.coverage[completed] !== entry.coverage[planned]) return false;
    }
    return true;
  };
  const paired = row => conditions.every(condition => completeEntry(row?.[condition]));
  for (const [benchmarkId, publication] of publications) {
    const track = publication.benchmarks[0].trackId || publication.subcategory || 'storytelling';
    if (!tracks.has(track)) tracks.set(track, []);
    tracks.get(track).push(benchmarkId);
    const localIds = new Map(publication.settings.map(setting => [setting.id, setting.configurationId || setting.id]));
    for (const setting of publication.settings) if (!identities.has(localIds.get(setting.id))) identities.set(localIds.get(setting.id), setting.id);
    const matrixFor = entries => {
      const matrix = new Map();
      for (const entry of entries || []) {
        const identity = entry.configurationId || localIds.get(entry.settingId || entry.id) || entry.settingId || entry.id;
        assert.ok(conditions.includes(entry.condition), `Unknown Writing condition: ${entry.condition}`);
        if (!matrix.has(identity)) matrix.set(identity, {});
        assert.ok(!matrix.get(identity)[entry.condition], `Duplicate source entry: ${benchmarkId}/${identity}/${entry.condition}`);
        matrix.get(identity)[entry.condition] = entry;
      }
      return matrix;
    };
    const official = matrixFor(publication.entries);
    const provisional = publication.provisionalLeaderboard?.status === 'provisional' ? matrixFor(publication.provisionalLeaderboard.entries) : new Map();
    const roster = [...new Set(localIds.values())];
    const officialCount = roster.filter(identity => paired(official.get(identity))).length;
    const provisionalCount = roster.filter(identity => paired(provisional.get(identity))).length;
    const pinnedCore = fixedBasis?.coreIdeaScoring === 'published-single-judge-provisional' && benchmarkId === 'storytelling-core-idea';
    const type = pinnedCore ? provisionalCount ? 'provisional' : 'unavailable' : officialCount ? 'official' : provisionalCount ? 'provisional' : 'unavailable';
    const basisSource = type === 'provisional' ? publication.provisionalLeaderboard : publication.scoreBasis || {};
    sources.set(benchmarkId, { benchmarkId, track, rows: type === 'official' ? official : type === 'provisional' ? provisional : new Map(), type, provisional: type === 'provisional', officialCount, completedSettingCount: type === 'official' ? officialCount : type === 'provisional' ? provisionalCount : 0,
      plannedSettingCount: localIds.size, basisId: basisSource.id || `${benchmarkId}:${basisSource.method || type}`, method: basisSource.method, judgeCount: basisSource.judgeCount });
  }
  if (fixedBasis) {
    const pairedTwists = publications.get('storytelling-plot-twists')?.scoreBasis?.edition === PAIRED_TWISTS_EDITION;
    assert.equal(fixedBasis.id, pairedTwists ? PAIRED_WRITING_SCORE_BASIS.id : 'writing-established-storytelling-v1', 'Writing score basis must identify the selected Plot twists edition.');
    if (pairedTwists) exact(fixedBasis, PAIRED_WRITING_SCORE_BASIS, 'Paired Writing score basis changed.');
    exact(fixedBasis.benchmarkIds, ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery'], 'Established Writing sources changed.');
    assert.ok(fixedBasis.benchmarkIds.every(id => publications.has(id)), 'A required established score source is missing.');
  }
  const isArchived = id => {
    const metadata = { ...publications.get(id)?.benchmarks?.[0]?.publication, ...declaredCatalog.get(id) };
    return metadata.archived === true || metadata.archive === true;
  };
  const trackBasis = ids => {
    if (!fixedBasis) return [...ids];
    const established = ids.filter(id => fixedBasis.benchmarkIds.includes(id));
    const current = ids.filter(id => !isArchived(id));
    return established.length ? established : current.length ? current : [...ids];
  };
  if (selectionId !== 'all-writing' && !tracks.has(selectionId) && !publications.has(selectionId)) selectionId = tracks.has('storytelling') ? 'storytelling' : tracks.keys().next().value;
  if (!fixedBasis && publications.has(selectionId) && tracks.get(sources.get(selectionId).track).length === 1) selectionId = sources.get(selectionId).track;
  const allWriting = selectionId === 'all-writing';
  const activeBenchmarkIds = allWriting ? fixedBasis ? [...fixedBasis.benchmarkIds] : [...publications.keys()] : tracks.has(selectionId) ? trackBasis(tracks.get(selectionId)) : [selectionId];
  const groupIds = [...new Set(activeBenchmarkIds.map(id => sources.get(id).track))];
  const benchmarkWeights = Object.fromEntries(activeBenchmarkIds.map(id => [id, allWriting && !fixedBasis ? 1 / groupIds.length / tracks.get(sources.get(id).track).length : 1 / activeBenchmarkIds.length]));
  const groupWeights = Object.fromEntries([...tracks.keys()].map(group => [group, activeBenchmarkIds.filter(id => sources.get(id).track === group).reduce((sum, id) => sum + benchmarkWeights[id], 0)]));
  const provisional = activeBenchmarkIds.some(id => sources.get(id).provisional);
  const entries = [];
  for (const [configurationId, settingId] of identities) {
    // Determine availability once per model, before either condition is averaged.
    // Trial-incomplete diagnostics are not benchmark scores; missing benchmarks
    // have zero weight. All Writing renormalizes its fixed category-weighted
    // benchmark weights; an individual track retains its original 1/N mean.
    const availableBenchmarkIds = activeBenchmarkIds.filter(id => paired(sources.get(id).rows.get(configurationId)));
    const missingBenchmarkIds = activeBenchmarkIds.filter(id => !availableBenchmarkIds.includes(id));
    const complete = activeBenchmarkIds.length > 0 && !missingBenchmarkIds.length;
    const eligibleForRank = complete;
    const partial = availableBenchmarkIds.length > 0 && !complete;
    const entryProvisional = availableBenchmarkIds.some(id => sources.get(id).provisional);
    const availableWeight = availableBenchmarkIds.reduce((sum, id) => sum + benchmarkWeights[id], 0);
    const actualWeights = Object.fromEntries(activeBenchmarkIds.map(id => [id, availableBenchmarkIds.includes(id) ? allWriting ? benchmarkWeights[id] / availableWeight : 1 / availableBenchmarkIds.length : 0]));
    for (const condition of conditions) {
      // Resources use the score subset too: never silently drop a source just
      // because its latency or token reading is missing.
      const mean = getter => availableBenchmarkIds.length > 0 && availableBenchmarkIds.every(id => finite(getter(sources.get(id).rows.get(configurationId)[condition])))
        ? allWriting
          ? availableBenchmarkIds.reduce((sum, id) => sum + getter(sources.get(id).rows.get(configurationId)[condition]) * benchmarkWeights[id], 0) / availableWeight
          : availableBenchmarkIds.reduce((sum, id) => sum + getter(sources.get(id).rows.get(configurationId)[condition]), 0) / availableBenchmarkIds.length : null;
      const exactScore = mean(entry => entry.exactScore);
      const latency = mean(entry => entry.metrics?.meanLatencyMs);
      const benchmarkComponents = activeBenchmarkIds.map(benchmarkId => {
        const source = sources.get(benchmarkId), row = source.rows.get(configurationId);
        const exactScore = paired(row) ? row[condition].exactScore : null;
        return { benchmarkId, exactScore, score: round(exactScore), weight: actualWeights[benchmarkId], exactContribution: finite(exactScore) ? exactScore * actualWeights[benchmarkId] : null, complete: paired(row), provisional: source.provisional, basisType: source.type };
      });
      const categories = [...tracks.keys()].map(category => {
        const benchmarkIds = activeBenchmarkIds.filter(id => sources.get(id).track === category);
        const available = availableBenchmarkIds.filter(id => sources.get(id).track === category);
        const weight = available.reduce((sum, id) => sum + actualWeights[id], 0);
        const exactScore = available.length ? available.reduce((sum, id) => sum + sources.get(id).rows.get(configurationId)[condition].exactScore, 0) / available.length : null;
        return { category, benchmarkIds, availableBenchmarkIds: available, weight, exactScore, score: round(exactScore), exactContribution: finite(exactScore) ? exactScore * weight : null, partial: available.length > 0 && available.length < benchmarkIds.length };
      });
      entries.push({ id: `${settingId}-${condition}`, settingId, configurationId, condition, exactScore, score: round(exactScore), complete, eligibleForRank, partial, provisional: entryProvisional,
        sourceCount: availableBenchmarkIds.length, availableBenchmarkIds, missingBenchmarkIds, benchmarkWeights: actualWeights, benchmarkComponents, categories, latency: latency === null ? null : latency / 1000, tokens: mean(entry => entry.metrics?.meanOutputTokens) });
    }
  }
  for (const entry of entries) {
    const baseline = entries.find(other => other.configurationId === entry.configurationId && other.condition === 'baseline');
    entry.rank = entry.eligibleForRank && finite(entry.exactScore) ? 1 + entries.filter(other => other.eligibleForRank && other.condition === entry.condition && finite(other.exactScore) && other.exactScore > entry.exactScore).length : null;
    entry.exactDelta = finite(entry.exactScore) ? entry.exactScore - baseline.exactScore : null;
  }
  const completeSettings = entries.filter(entry => entry.condition === 'skill' && entry.complete).length;
  const rankedSettings = entries.filter(entry => entry.condition === 'skill' && entry.eligibleForRank).length;
  const partialSettings = entries.filter(entry => entry.condition === 'skill' && entry.partial).length;
  const efficiencyEvidence = ['latency', 'tokens'].map(metric => {
    const eligible = entries.filter(entry => entry.eligibleForRank && finite(entry.exactScore) && finite(entry[metric]) && entry[metric] > 0);
    const frontier = eligible.filter(entry => !eligible.some(other => other.exactScore >= entry.exactScore && other[metric] <= entry[metric] && (other.exactScore > entry.exactScore || other[metric] < entry[metric])));
    return { metric, eligiblePoints: eligible.length, frontierPoints: frontier.length, mismatches: [] };
  });
  const selectionIds = ['all-writing', ...[...tracks].flatMap(([id, ids]) => fixedBasis || ids.length > 1 ? [id, ...ids] : [id])];
  if (fixedBasis) {
    const archivedSelection = id => id === 'all-writing' ? false : tracks.has(id) ? tracks.get(id).every(isArchived) : isArchived(id);
    selectionIds.sort((a, b) => Number(archivedSelection(a)) - Number(archivedSelection(b)));
  }
  return { collection, publications, sources, entries, fixedBasis, method: fixedBasis ? VERSIONED_WRITING_CATEGORY_METHOD : WRITING_CATEGORY_METHOD, selectionId, selection: { id: selectionId, type: allWriting ? 'category' : tracks.has(selectionId) ? 'track' : 'benchmark', benchmarkIds: activeBenchmarkIds, provisional, completedSettingCount: completeSettings, rankedSettingCount: rankedSettings, partialSettingCount: partialSettings }, selectionIds, activeBenchmarkIds, comparisonBenchmarkIds: activeBenchmarkIds,
    benchmarkIds: [...publications.keys()], listedBenchmarkIds: [...publications.keys()].filter(id => !fixedBasis || !isArchived(id)), benchmarkWeights, groupWeights, weighting: allWriting && !fixedBasis ? 'equal-tracks-equal-benchmarks' : 'equal-fixed-benchmarks-for-ranked-settings', provisional, groupIds, settingIds: [...identities.values()], completeSettings, rankedSettings, partialSettings, unscoredSettings: identities.size - rankedSettings - partialSettings,
    tiedRankEntries: entries.filter(entry => entry.eligibleForRank && finite(entry.exactScore) && entries.some(other => other.eligibleForRank && other.id !== entry.id && other.condition === entry.condition && other.exactScore === entry.exactScore)).length,
    regressionSettings: entries.filter(entry => entry.eligibleForRank && entry.condition === 'skill' && finite(entry.exactDelta) && entry.exactDelta < 0).length, efficiencyEvidence };
}

export function verifyCandidateCategoryProjection(actual, expected) {
  if (selectedWritingMethod(expected.method)) return verifySelectedCategoryProjection(actual, expected);
  assert.equal(actual.writingCategory.method, LEGACY_WRITING_CATEGORY_METHOD, 'Candidate uses another category weighting method.');
  sameIds(actual.benchmarks.map(item => item.id), expected.benchmarkIds, 'Candidate category benchmark inventory');
  sameIds(actual.writingCategory.activeBenchmarkIds, expected.activeBenchmarkIds, 'Candidate active cohort');
  sameIds(actual.writingCategory.comparisonBenchmarkIds, expected.activeBenchmarkIds, 'Candidate comparison cohort');
  sameIds(actual.writingCategory.declaredConfigurationIds, expected.declaredConfigurationIds, 'Candidate planned configuration roster');
  assert.equal(actual.writingCategory.declaredRosterBenchmarkId, expected.declaredRosterBenchmarkId, 'Candidate widest planned roster source');
  assert.equal(actual.writingCategory.declaredRosterSelection, expected.declaredRosterSelection, 'Candidate finalized roster anchor policy');
  sameIds(actual.writingCategory.availableOfficialBenchmarkIds, expected.availableOfficialBenchmarkIds, 'Candidate available official sources');
  verifySourceCoverage(actual.writingCategory.sourceCoverage, expected.sourceCoverage);
  exact(actual.writingCategory.benchmarkWeights, expected.benchmarkWeights, 'Candidate benchmark weights');
  assert.equal(actual.coverage.completedSettingCount, expected.completeSettings, 'Candidate complete setting count');
  assert.equal(actual.coverage.settingCount, expected.settingIds.length, 'Candidate union setting count');
  assert.equal(actual.entries.length, expected.entries.length, 'Candidate entry count');
  for (const wanted of expected.entries) {
    const entry = actual.entries.find(item => item.configurationId === wanted.configurationId && item.condition === wanted.condition);
    assert.ok(entry, `Missing candidate category entry: ${wanted.id}`);
    assert.equal(entry.id, wanted.id, 'Candidate category identity changed');
    for (const field of ['exactScore', 'score', 'exactDelta', 'latency', 'tokens']) close(entry[field], wanted[field], `Candidate category ${wanted.id}/${field}`);
    assert.equal(entry.rank, wanted.rank, `Candidate category rank: ${wanted.id}`);
    for (const group of wanted.categories) {
      const reading = entry.categories.find(item => item.category === group.category);
      assert.ok(reading, `Missing group segment: ${wanted.id}/${group.category}`);
      close(reading.exactScore, group.exactScore, 'Group exact score');
      close(reading.score, group.score, 'Group rounded score');
      close(reading.weight, group.weight, 'Group fixed weight');
      close(reading.exactContribution, group.exactContribution, 'Group exact contribution');
    }
  }
  return expected;
}

function verifySelectedCategoryProjection(actual, expected) {
  const category = actual.writingCategory;
  assert.equal(category.method, expected.method, 'Candidate available-score method changed.');
  assert.equal(category.selection.id, expected.selectionId, 'Candidate score selection changed.');
  assert.equal(category.selection.type, expected.selection.type, 'Candidate selection hierarchy changed.');
  assert.equal(category.selection.provisional, expected.provisional, 'Candidate provisional aggregate is unqualified.');
  sameIds(category.selection.benchmarkIds, expected.activeBenchmarkIds, 'Candidate selected test set');
  sameIds(category.activeBenchmarkIds, expected.activeBenchmarkIds, 'Candidate fixed active test set');
  exact(category.selections.map(item => item.id), expected.selectionIds, 'Candidate available score selections and order');
  exact(category.benchmarkWeights, expected.benchmarkWeights, 'Candidate fixed benchmark weights');
  assert.equal(actual.scoreBasis.benchmarkWeighting, expected.weighting, 'Candidate declared benchmark weighting');
  assert.equal(actual.scoreBasis.subgroupWeighting, expected.fixedBasis ? 'fixed-benchmark-basis' : expected.selectionId === 'all-writing' ? 'equal-selected-tracks' : 'selected-track-only', 'Candidate declared track weighting');
  sameIds(category.groups.map(group => group.id), Object.keys(expected.groupWeights), 'Candidate track inventory');
  for (const group of category.groups) close(group.weight, expected.groupWeights[group.id], 'Candidate fixed track weight: ' + group.id);
  sameIds(actual.categories.map(group => group.id), expected.groupIds, 'Candidate selected track inventory');
  for (const group of actual.categories) close(group.weight, expected.groupWeights[group.id], 'Candidate selected track weight: ' + group.id);
  sameIds(actual.benchmarks.map(item => item.id), expected.benchmarkIds, 'Candidate raw benchmark inventory');
  assert.equal(actual.coverage.completedSettingCount, expected.completeSettings, 'Candidate complete paired intersection');
  for (const [field, count] of [['completedSettingCount', expected.completeSettings], ['rankedSettingCount', expected.rankedSettings], ['partialSettingCount', expected.partialSettings]]) {
    assert.equal(actual.coverage[field], count, `Candidate coverage ${field}`);
    assert.equal(category.selection[field], count, `Candidate selection ${field}`);
  }
  assert.equal(actual.coverage.settingCount, expected.settingIds.length, 'Candidate retained model union');
  sameIds(actual.entries.map(entry => entry.id), expected.entries.map(entry => entry.id), 'Candidate condition entry inventory');
  for (const source of expected.sources.values()) {
    const observed = category.sourceCoverage.find(item => item.benchmarkId === source.benchmarkId);
    assert.ok(observed, 'Candidate omitted source basis.');
    assert.equal(observed.basis.type, source.type, `Whole-source basis: ${source.benchmarkId}`);
    assert.equal(observed.basis.id, source.basisId, `Whole-source identity: ${source.benchmarkId}`);
    assert.equal(observed.basis.provisional, source.provisional, `Source qualification: ${source.benchmarkId}`);
    if (source.method !== undefined) assert.equal(observed.basis.method, source.method, `Source method: ${source.benchmarkId}`);
    if (source.judgeCount !== undefined) assert.equal(observed.basis.judgeCount, source.judgeCount, `Source judge count: ${source.benchmarkId}`);
    assert.equal(observed.selected, expected.activeBenchmarkIds.includes(source.benchmarkId), 'Candidate selected source metadata');
  }
  for (const wanted of expected.entries) {
    const entry = actual.entries.find(item => item.id === wanted.id);
    assert.equal(entry.configurationId, wanted.configurationId, 'Candidate model configuration identity');
    for (const field of ['provisional', 'complete', 'eligibleForRank', 'partial', 'sourceCount']) assert.equal(entry[field], wanted[field], `${wanted.id}/${field}`);
    for (const field of ['availableBenchmarkIds', 'missingBenchmarkIds']) sameIds(entry[field], wanted[field], `${wanted.id}/${field}`);
    exact(entry.benchmarkWeights, wanted.benchmarkWeights, `${wanted.id}/actual benchmark weights`);
    for (const field of ['complete', 'eligibleForRank', 'partial', 'sourceCount']) assert.equal(entry.coverage[field], wanted[field], `${wanted.id}/coverage/${field}`);
    for (const field of ['availableBenchmarkIds', 'missingBenchmarkIds']) sameIds(entry.coverage[field], wanted[field], `${wanted.id}/coverage/${field}`);
    assert.equal(entry.coverage.completedBenchmarks, wanted.sourceCount, 'Candidate available source count');
    assert.equal(entry.coverage.expectedBenchmarks, expected.activeBenchmarkIds.length, 'Candidate selected source count');
    for (const field of ['exactScore', 'score', 'exactDelta', 'latency', 'tokens']) close(entry[field], wanted[field], `${wanted.id}/${field}`);
    assert.equal(entry.rank, wanted.rank, `${wanted.id}/rank`);
    sameIds(entry.benchmarkComponents.map(item => item.benchmarkId), expected.activeBenchmarkIds, 'Candidate complete component inventory');
    for (const component of wanted.benchmarkComponents) {
      const observed = entry.benchmarkComponents.find(item => item.benchmarkId === component.benchmarkId);
      for (const field of ['exactScore', 'score', 'weight', 'exactContribution']) close(observed[field], component[field], `${wanted.id}/${component.benchmarkId}/${field}`);
      assert.equal(observed.complete, component.complete, 'Incomplete component was promoted');
      assert.equal(observed.provisional, component.provisional, 'Component provisional basis hidden');
      assert.equal(observed.basis.type, component.basisType, 'Component switched source by model');
      assert.equal(observed.basis.id, expected.sources.get(component.benchmarkId).basisId, 'Component source identity changed');
    }
    sameIds(entry.categories.map(group => group.category), wanted.categories.map(group => group.category), 'Candidate model track components');
    for (const group of wanted.categories) {
      const observed = entry.categories.find(item => item.category === group.category);
      for (const field of ['exactScore', 'score', 'weight', 'exactContribution']) close(observed[field], group[field], `${wanted.id}/${group.category}/${field}`);
      for (const field of ['benchmarkIds', 'availableBenchmarkIds']) sameIds(observed[field], group[field], `${wanted.id}/${group.category}/${field}`);
      assert.equal(observed.partial, group.partial, 'Candidate model track partial status');
    }
    const setting = actual.settings.find(item => item.configurationId === wanted.configurationId);
    assert.ok(setting, 'Candidate model setting missing');
    for (const field of ['provisional', 'complete', 'eligibleForRank', 'partial', 'sourceCount']) assert.equal(setting[field], wanted[field], `${wanted.id}/setting/${field}`);
    exact(setting.benchmarkWeights, wanted.benchmarkWeights, 'Candidate setting actual benchmark weights');
    close(setting.exactScores[wanted.condition], wanted.exactScore, 'Candidate setting exact score');
    close(setting.scores[wanted.condition], wanted.score, 'Candidate setting rounded score');
  }
  sameIds(category.publications.map(item => item.benchmarks[0].id), expected.benchmarkIds, 'Candidate raw publication inventory');
  for (const [benchmarkId, publication] of expected.publications) {
    const { benchmarkPublications, additionalBenchmarks, compactBenchmarks, catalog, catalogCoverage, writingScoreBasis, collectionCoverage, allWritingCoverage, ...raw } = publication;
    exact(category.publications.find(item => item.benchmarks[0].id === benchmarkId), raw, `Original publication changed: ${benchmarkId}`);
  }
  for (const field of ['cases', 'caseResults', 'caseSummaries', 'trialSummaries', 'benchmarkResults', 'benchmarkSummaries', 'results']) {
    const raw = [...expected.publications].flatMap(([benchmarkId, source]) => (source[field] || []).map(item => ({ ...item, benchmarkId: item.benchmarkId || benchmarkId })));
    exact(actual[field], raw, `Original ${field} inventory changed`);
  }
  return expected;
}

function verifyDumbbellRows(rows, expected, label) {
  const skills = expected.entries.filter(entry => entry.condition === 'skill' && finite(entry.exactScore));
  sameIds(rows?.map(row => row.settingId), skills.map(entry => entry.settingId), `${label} paired row inventory`);
  for (const row of rows) {
    const skill = skills.find(entry => entry.settingId === row.settingId);
    const baseline = expected.entries.find(entry => entry.settingId === row.settingId && entry.condition === 'baseline');
    for (const [field, value] of [['exactBaseline', baseline.exactScore], ['exactSkill', skill.exactScore], ['exactDelta', skill.exactDelta], ['baselinePosition', baseline.score], ['skillPosition', skill.score]]) close(row[field], value, `${label}/${row.settingId}/${field}`);
    assert.equal(row.baselineRank, baseline.rank, `${label} baseline rank`);
    assert.equal(row.skillRank, skill.rank, `${label} skill rank`);
    assert.ok(typeof row.ariaLabel === 'string' && row.ariaLabel.includes(baseline.score.toFixed(1)) && row.ariaLabel.includes(skill.score.toFixed(1)), `${label} accessible paired scores`);
    assert.equal(row.partial, skill.partial, `${label} partial score status`);
    assert.equal(row.asteriskRendered, skill.partial, `${label} visible paired score asterisks`);
    assert.equal(/asterisk|some tests are missing/i.test(row.ariaLabel), skill.partial, `${label} accessible partial score explanation`);
  }
}

function verifySelectionEvidence(evidence, expected, presentationVariant) {
  assert.equal(evidence.selectionId, expected.selectionId, 'Selected score field changed');
  sameIds(evidence.activeBenchmarkIds, expected.activeBenchmarkIds, 'Selected fixed test set');
  exact(evidence.benchmarkWeights, expected.benchmarkWeights, 'Selected fixed test weights');
  assert.equal(evidence.provisional, expected.provisional, 'Selected provisional basis is hidden');
  for (const field of ['completeSettings', 'rankedSettings', 'partialSettings']) assert.equal(evidence[field], expected[field], `Selected ${field}`);
  exact(evidence.mismatches, [], 'Selected comparison browser checks failed');
  verifyDumbbellRows(evidence.rowEvidence, expected, expected.selectionId);
  assert.equal(evidence.partialFootnote, isCleanWritingPresentation(presentationVariant) ? WRITING_LEDGER_PARTIAL_FOOTNOTE : WRITING_PARTIAL_FOOTNOTE, 'Available-score qualification changed');
  sameIds(evidence.headerEvidence?.map(item => item.condition), expected.rankedSettings ? ['skill'] : [], 'Model view skill leader qualifier');
  for (const header of evidence.headerEvidence) {
    const leaders = expected.entries.filter(entry => entry.condition === header.condition && entry.rank === 1);
    assert.equal(header.partial, leaders.some(entry => entry.partial), 'Header partial leader status');
    const displayed = leaders.find(entry => entry.id === header.entryId);
    assert.ok(displayed, 'Header does not show a condition leader');
    assert.equal(header.asteriskRendered, displayed.partial, 'Header displayed score asterisk');
  }
  const sidebar = deriveExpectedWritingCategory(expected.collection, 'all-writing');
  const sidebarLeaders = sidebar.entries.filter(entry => entry.condition === 'skill' && entry.rank === 1);
  assert.ok(sidebarLeaders.length ? sidebarLeaders.some(entry => entry.partial === evidence.sidebarPartial && entry.partial === evidence.sidebarAsteriskRendered) : evidence.sidebarPartial === false && evidence.sidebarAsteriskRendered === false, 'Sidebar aggregate leader lacks its partial-score marker');
  assert.equal(evidence.sidebarScore, sidebarLeaders.length ? sidebarLeaders[0].score.toFixed(1) : 'Results', 'Sidebar must retain the All Writing score across selections');
  assert.ok(typeof evidence.sidebarLabel === 'string' && (!sidebarLeaders.length || evidence.sidebarLabel.includes('All Writing')), 'Sidebar aggregate source is mislabeled');
  assert.ok(Array.isArray(evidence.componentEvidence), 'Selected benchmark component evidence missing');
  const componentSettings = [...new Set(evidence.componentEvidence.map(item => item.settingId))];
  if (expected.rankedSettings) assert.ok(componentSettings.length, 'Selected numeric breakdown is missing');
  const signature = entry => JSON.stringify(expected.activeBenchmarkIds.map(id => [id, entry?.benchmarkWeights[id]]));
  const weightSignatures = [...new Set(expected.entries.filter(entry => entry.condition === 'skill' && finite(entry.exactScore)).map(signature))];
  sameIds([...new Set(componentSettings.map(id => signature(expected.entries.find(entry => entry.settingId === id && entry.condition === 'skill'))))], weightSignatures, 'Every available benchmark-weight formula is exercised');
  const componentKeys = evidence.componentEvidence.map(item => `${item.settingId}/${item.benchmarkId}`);
  assert.equal(new Set(componentKeys).size, componentKeys.length, 'Duplicate selected benchmark component');
  for (const settingId of componentSettings) {
    const skill = expected.entries.find(entry => entry.settingId === settingId && entry.condition === 'skill');
    const baseline = expected.entries.find(entry => entry.settingId === settingId && entry.condition === 'baseline');
    assert.ok(finite(skill?.exactScore), 'A model without any paired benchmark score is displayed as an aggregate');
    const components = evidence.componentEvidence.filter(item => item.settingId === settingId);
    sameIds(components.map(item => item.benchmarkId), skill.availableBenchmarkIds, 'Selected model available benchmark inventory');
    for (const item of components) {
      close(item.exactBaseline, baseline.benchmarkComponents.find(component => component.benchmarkId === item.benchmarkId).exactScore, 'Selected original baseline component');
      close(item.exactSkill, skill.benchmarkComponents.find(component => component.benchmarkId === item.benchmarkId).exactScore, 'Selected original skill component');
      close(item.weight, skill.benchmarkWeights[item.benchmarkId], 'Selected available component weight');
    }
  }
  sameIds(evidence.aggregateEvidence?.map(item => item.settingId), componentSettings, 'Selected exact formula inventory');
  for (const formula of evidence.aggregateEvidence) {
    const skill = expected.entries.find(entry => entry.settingId === formula.settingId && entry.condition === 'skill');
    const baseline = expected.entries.find(entry => entry.settingId === formula.settingId && entry.condition === 'baseline');
    close(formula.exactBaseline, baseline.exactScore, 'Selected exact baseline aggregate');
    close(formula.exactSkill, skill.exactScore, 'Selected exact skill aggregate');
    assert.equal(formula.partial, skill.partial, 'Selected formula partial status');
    assert.equal(formula.asteriskRendered, skill.partial, 'Selected formula asterisks');
    const weights = Object.fromEntries(skill.availableBenchmarkIds.map(id => [id, skill.benchmarkWeights[id]]));
    const equalWeights = Object.values(weights).every(weight => Math.abs(weight - 1 / skill.sourceCount) < 1e-12);
    assert.equal(formula.method, equalWeights ? 'arithmetic-mean' : 'weighted-sum', 'Selected formula calculation method');
    assert.equal(formula.divisor, equalWeights ? skill.sourceCount : null, 'Selected formula available-score divisor');
    assert.equal(formula.sourceCount, skill.sourceCount, 'Selected formula source count');
    exact(formula.componentWeights, weights, 'Selected formula component weights');
    assert.ok(Array.isArray(formula.formulas) && formula.formulas.length === 2 && formula.formulas.every(text => typeof text === 'string'), 'Selected visible formula text is missing');
    if (!equalWeights) {
      assert.ok(formula.formulas.every(text => text.includes('×') && !text.includes('÷')), 'Weighted calculation is mislabeled as an arithmetic mean');
      for (const text of formula.formulas) {
        assert.ok(!text.includes('%'), 'Rounded percentages cannot stand in for exact formula coefficients');
        const observedWeights = [...text.matchAll(/×\s*(\d+(?:\.\d+)?)(?:\/(\d+))?/g)].map(match => Number(match[1]) / Number(match[2] || 1));
        assert.equal(observedWeights.length, Object.keys(weights).length, 'Visible formula component count');
        Object.values(weights).forEach((weight, index) => close(observedWeights[index], weight, 'Visible exact component fraction or decimal'));
      }
    }
  }
}

function verifySelectedPresentation(category, expected) {
  assert.ok(category.presentationVariant === undefined || isCleanWritingPresentation(category.presentationVariant), 'Unknown Writing presentation variant');
  if (isCleanWritingPresentation(category.presentationVariant)) assert.equal(expected.selectionId, 'all-writing', 'Clean Writing presentation must retain All Writing as its default');
  assert.equal(category.selectionId, expected.selectionId, 'Default Writing selection changed');
  assert.equal(category.provisional, expected.provisional, 'Default aggregate provisional basis missing');
  exact(category.benchmarkWeights, expected.benchmarkWeights, 'Browser default fixed weights');
  assert.equal(category.sharedScoreSelector, true, 'Writing score selector must remain shared by the scored views');
  assert.equal(category.selectorInsideLeaderboard, false, 'Writing score selector is hidden inside the leaderboard');
  assert.ok(!category.partialEvidence, 'Rejected partial placeholder evidence remains');
  const presentation = category.presentationEvidence;
  assert.ok(presentation && !presentation.packedBars, 'Writing still uses packed bars or lacks dumbbell evidence');
  for (const field of ['noPlaceholderPanels', 'compactRows', 'matchedEngineeringFrame', 'dumbbellGeometry']) assert.equal(presentation[field], true, `Writing presentation ${field}`);
  exact(presentation.mismatches, [], 'Writing dumbbell geometry failed');
  sameIds(presentation.numericPairedSettingIds, expected.entries.filter(entry => entry.condition === 'skill' && finite(entry.exactScore)).map(entry => entry.settingId), 'Every ranked model must have a numeric dumbbell');
  verifyDumbbellRows(presentation.dumbbellRows, expected, 'Default Writing');
  sameIds(category.selectionEvidence?.map(item => item.selectionId), expected.selectionIds, 'Every dropdown selection must be exercised');
  for (const selectionId of expected.selectionIds) {
    const evidence = category.selectionEvidence.find(item => item.selectionId === selectionId);
    const selected = deriveExpectedWritingCategory(expected.collection, selectionId);
    verifySelectionEvidence(evidence, selected, category.presentationVariant);
    if (hasWritingBenchmarkLeaders(category.presentationVariant)) for (const row of evidence.rowEvidence) {
      const entry = selected.entries.find(item => item.condition === 'skill' && item.settingId === row.settingId);
      assert.equal(row.configurationId, entry.configurationId, 'Leader-view original model configuration');
      assert.equal(row.label, originalWritingSettingLabel(expected, entry.configurationId, entry.settingId), 'Leader-view original model label');
    }
    if (isCleanWritingPresentation(category.presentationVariant)) {
      for (const field of ['defaultClosed', 'opensForAudit', 'closesAfterAudit']) assert.equal(evidence.modelDisclosureEvidence?.[field], true, 'Selected score disclosure ' + field);
      exact(evidence.modelDisclosureEvidence.mismatches, [], 'Selected score disclosure audit failed');
    }
  }
  if (expected.selectionId === 'all-writing') verifySharedWritingViews(category, expected);
}

function verifySharedWritingViews(category, expected) {
  if (isCleanWritingPresentation(category.presentationVariant)) return verifyCleanWritingLedger(category, expected);
  exact(category.selectorOptions, expected.selectionIds, 'Shared Writing selector option order');
  const sidebar = expected.entries.find(entry => entry.condition === 'skill' && entry.rank === 1);
  const sidebarScore = sidebar ? sidebar.score.toFixed(1) : 'Results';
  const secondary = expected.publications.has('storytelling-magic-discovery') ? 'storytelling-magic-discovery'
    : expected.selectionIds.find(id => expected.publications.has(id)) || 'all-writing';
  const shared = category.sharedSelectorEvidence;
  assert.ok(Array.isArray(shared), 'Shared Writing view evidence is missing');
  const verifyControl = evidence => {
    assert.ok(['models', 'benchmarks', 'efficiency'].includes(evidence.mode), 'Unknown Writing view');
    assert.ok(expected.selectionIds.includes(evidence.selectionId), 'Unknown shared Writing score selection');
    assert.equal(evidence.hash, '#capabilities/writing' + (evidence.mode === 'models' ? '' : '/' + evidence.mode), 'Shared Writing view route');
    assert.equal(evidence.visible, true, 'Shared score selector is not visible');
    assert.equal(evidence.sidebarScore, sidebarScore, 'Shared view changed the All Writing sidebar score');
    assert.ok(evidence.selectedSettingId === null || expected.settingIds.includes(evidence.selectedSettingId), 'Shared view selected an unknown model');
    exact(evidence.mismatches, [], 'Shared Writing view browser checks failed');
  };
  for (const evidence of shared) verifyControl(evidence);
  for (const mode of ['models', 'benchmarks', 'efficiency']) assert.ok(shared.some(item => item.mode === mode && item.selectionId === 'all-writing'), 'All Writing selector missing from ' + mode);
  const history = category.historyEvidence;
  assert.ok(Array.isArray(history));
  exact(history.map(item => item.direction), ['back', 'forward'], 'Writing score history must exercise both directions');
  exact(history.map(item => item.selectionId), ['all-writing', secondary], 'Writing score history selection');
  for (const evidence of history) { verifyControl(evidence); assert.equal(evidence.mode, 'benchmarks', 'Writing score history lost the benchmark view'); }
  const overviews = category.benchmarkOverviewEvidence;
  assert.ok(Array.isArray(overviews), 'Selected-model and field-mean browser evidence is missing');
  const changedModel = expected.settingIds.length > 1;
  exact(overviews.map(item => item.selectionId), changedModel ? ['all-writing', 'all-writing', secondary, 'all-writing'] : ['all-writing', secondary, 'all-writing'], 'Benchmark view selection/model transition coverage');
  for (const overview of overviews) {
    const selected = deriveExpectedWritingCategory(expected.collection, overview.selectionId);
    sameIds(overview.selectedSettingIds, expected.settingIds, 'Benchmark model selector retained roster');
    const skill = selected.entries.find(entry => entry.condition === 'skill' && entry.settingId === overview.selectedSettingId);
    const baseline = selected.entries.find(entry => entry.condition === 'baseline' && entry.settingId === overview.selectedSettingId);
    assert.ok(skill && baseline, 'Benchmark view selected an unknown model');
    close(overview.exactBaseline, baseline.exactScore, 'Benchmark selected model exact baseline');
    close(overview.exactSkill, skill.exactScore, 'Benchmark selected model exact skill');
    sameIds(overview.components?.map(item => item.benchmarkId), skill.availableBenchmarkIds, 'Benchmark selected model component inventory');
    for (const component of overview.components) {
      close(component.exactBaseline, baseline.benchmarkComponents.find(item => item.benchmarkId === component.benchmarkId).exactScore, 'Benchmark selected baseline source');
      close(component.exactSkill, skill.benchmarkComponents.find(item => item.benchmarkId === component.benchmarkId).exactScore, 'Benchmark selected skill source');
      close(component.weight, skill.benchmarkWeights[component.benchmarkId], 'Benchmark selected model source weight');
    }
    sameIds(overview.fieldMeans?.map(item => item.benchmarkId), expected.benchmarkIds, 'Separate benchmark field-mean inventory');
    for (const field of overview.fieldMeans) {
      const publication = expected.publications.get(field.benchmarkId), official = publication.benchmarkSummaries?.[0] || {};
      const provisional = publication.provisionalLeaderboard;
      const usesProvisional = !(finite(official.baseline) && finite(official.treatment)) && provisional?.status === 'provisional' && Boolean(provisional.rankedSettingCount);
      const summary = usesProvisional ? provisional.summary : official;
      const selectionId = deriveExpectedWritingCategory(expected.collection, field.benchmarkId).selectionId;
      close(field.baseline, finite(summary.baseline) ? summary.baseline : null, 'Original all-model field baseline');
      close(field.skill, finite(summary.treatment) ? summary.treatment : null, 'Original all-model field skill');
      assert.equal(field.provisional, Boolean(usesProvisional), 'Field mean provisional qualification');
      assert.equal(field.selectionId, selectionId, 'Field mean comparison selection');
      assert.equal(field.renderedBaseline, finite(summary.baseline) ? summary.baseline.toFixed(1) : '', 'Rendered all-model baseline mean');
      assert.equal(field.renderedSkill, finite(summary.treatment) ? summary.treatment.toFixed(1) : '', 'Rendered all-model skill mean');
      const link = new URL(field.compareHref);
      assert.equal(link.searchParams.get('score'), selectionId, 'Compare-models link score');
      assert.equal(link.searchParams.get('setting'), overview.selectedSettingId, 'Compare-models link lost selected model');
      assert.equal(link.hash, '#capabilities/writing', 'Compare-models link must open the model view');
    }
    exact(overview.mismatches, [], 'Benchmark model/field-mean browser checks failed');
  }
  const retainedModel = overviews[changedModel ? 1 : 0].selectedSettingId;
  if (changedModel) assert.notEqual(retainedModel, overviews[0].selectedSettingId, 'Benchmark model selector was not exercised');
  for (const overview of overviews.slice(changedModel ? 1 : 0)) assert.equal(overview.selectedSettingId, retainedModel, 'Changing score selection lost the selected model');
  for (const evidence of history) assert.equal(evidence.selectedSettingId, retainedModel, 'Browser history lost the selected benchmark model');
  if (expected.publications.has('storytelling-plot-twists')) assert.ok(shared.some(item => item.mode === 'models' && item.selectionId === 'storytelling-plot-twists' && item.selectedSettingId === retainedModel), 'Real benchmark compare-models link was not exercised');
}

// Independent Overall oracle. Engineering contributes canonical task scores,
// AI contributes unrounded task scores, and Writing contributes only complete
// paired benchmark totals from the independently selected whole-source basis.
// Benchmark inventories and Writing track weights come from published inputs.
// This exact registry equivalence was established from the registered runtime
// targets and original execution receipts. Display names never identify models.
export const OVERALL_OPUS_ALIAS_POLICY = 'registered-claude-opus-5-alias-v1';

export function deriveExpectedOverallV3({ engineering, aiWorkflows, writing, identityAliasPolicy = engineering?.writing?.overallSource?.scoreBasis?.identityAliasPolicy ?? null }) {
  assert.ok(engineering && aiWorkflows && writing, 'Overall v3 requires the three published source collections');
  assert.ok(identityAliasPolicy === null || identityAliasPolicy === OVERALL_OPUS_ALIAS_POLICY, 'Unknown Overall model identity alias policy');
  const roundOverall = value => value === null ? null : Math.round((value + Number.EPSILON) * 10) / 10;
  const writingExpected = deriveExpectedWritingCategory(writing, 'all-writing');
  const identityFields = ['id', 'configurationId', 'modelId', 'provider', 'family', 'reasoning', 'label'];
  const identities = new Map(), cells = new Map(), tasks = [], familyIds = ['engineering', 'writing', 'ai-workflows'];
  const aliases = new Map();
  const originalDirectSettings = [...engineering.settings, ...aiWorkflows.settings];
  const writingIdentity = setting => {
    if (originalDirectSettings.some(candidate => candidate.configurationId === setting.configurationId)) return setting;
    if (identityAliasPolicy !== OVERALL_OPUS_ALIAS_POLICY || setting.provider !== 'claude' || setting.modelId !== 'claude:claude-opus-5') return setting;
    const effort = setting.reasoning;
    assert.ok(['low', 'medium', 'high', 'xhigh', 'max'].includes(effort), 'Unsupported effort for the proven Opus model alias');
    assert.equal(setting.configurationId, `claude:claude-opus-5@${effort}`, 'Original Opus configuration identity does not match its model and effort');
    const target = originalDirectSettings.find(candidate => candidate.configurationId === `claude:opus@${effort}`);
    if (!target) return setting;
    assert.equal(target.provider, 'claude', 'Opus alias target provider');
    assert.equal(target.modelId, 'claude:opus', 'Opus alias target registered model');
    assert.equal(target.reasoning, effort, 'Opus alias target effort');
    const sourceSettingId = writingExpected.entries.find(entry => entry.configurationId === setting.configurationId)?.settingId;
    const alias = { configurationId: target.configurationId, sourceConfigurationId: setting.configurationId, sourceSettingId, sourceModelId: setting.modelId, targetCanonicalModel: 'claude-opus-5', policy: OVERALL_OPUS_ALIAS_POLICY };
    if (aliases.has(setting.configurationId)) exact(alias, aliases.get(setting.configurationId), 'Conflicting original Opus alias lineage');
    else aliases.set(setting.configurationId, alias);
    return target;
  };
  const categoryWeights = { engineering: 0.5, writing: 0.25, 'ai-workflows': 0.25 };
  const remember = setting => {
    const identity = Object.fromEntries(identityFields.map(field => [field, setting[field]]));
    assert.ok(identityFields.every(field => typeof identity[field] === 'string' && identity[field]), 'Overall original model identity missing');
    if (identities.has(identity.configurationId)) exact(identity, identities.get(identity.configurationId), 'Overall model identity differs between source families');
    else identities.set(identity.configurationId, identity);
    return identity;
  };
  const key = (configurationId, condition, benchmarkId) => JSON.stringify([configurationId, condition, benchmarkId]);
  const addCell = cell => {
    const id = key(cell.configurationId, cell.condition, cell.benchmarkId);
    assert.ok(!cells.has(id), 'Overall duplicate original task cell');
    assert.ok(conditions.includes(cell.condition) && (cell.value === null || finite(cell.value) && cell.value >= 0 && cell.value <= 100), 'Overall invalid authoritative task score');
    cells.set(id, cell);
  };
  const addDirect = (source, category, scoreField, edition) => {
    assert.equal(source.scoreBasis?.edition, edition, 'Overall original source edition');
    assert.ok(Array.isArray(source.benchmarks) && source.benchmarks.length, 'Overall source task inventory missing');
    exact(source.scoreBasis.benchmarkIds, source.benchmarks.map(benchmark => benchmark.id), 'Overall source task order');
    const settings = new Map(source.settings.map(setting => [setting.configurationId, remember(setting)]));
    assert.equal(settings.size, source.settings.length, 'Overall duplicate source model');
    for (const benchmark of source.benchmarks) tasks.push({ id: benchmark.id, category, weight: categoryWeights[category] / source.benchmarks.length });
    for (const row of source.benchmarkResults) {
      const identity = settings.get(row.configurationId);
      assert.ok(identity && row.settingId === identity.id && row.category === category && source.benchmarks.some(benchmark => benchmark.id === row.benchmarkId) && row.trials === 1, 'Overall original task cell identity');
      addCell({ settingId: identity.id, configurationId: identity.configurationId, condition: row.condition, benchmarkId: row.benchmarkId, category,
        value: row[scoreField], ...Object.fromEntries(['latencyMs', 'inputTokens', 'outputTokens', 'totalTokens'].map(field => [field, row[field] ?? null])) });
    }
  };
  addDirect(engineering, 'engineering', 'score', 'backend-architecture-panel-consensus-v2');
  for (const [benchmarkId, publication] of writingExpected.publications) {
    if (!writingExpected.activeBenchmarkIds.includes(benchmarkId)) continue;
    tasks.push({ id: benchmarkId, category: 'writing', weight: categoryWeights.writing * writingExpected.benchmarkWeights[benchmarkId] });
    const selected = deriveExpectedWritingCategory(writing, benchmarkId), source = writingExpected.sources.get(benchmarkId);
    for (const setting of publication.settings) {
      const identity = remember(writingIdentity(setting));
      for (const condition of conditions) {
        const entry = selected.entries.find(item => item.configurationId === setting.configurationId && item.condition === condition);
        const complete = entry?.complete && entry.eligibleForRank && !entry.partial && finite(entry.exactScore);
        const metrics = source.rows.get(setting.configurationId)?.[condition]?.metrics;
        const alias = aliases.get(setting.configurationId);
        addCell({ settingId: identity.id, configurationId: identity.configurationId, condition, benchmarkId, category: 'writing', value: complete ? entry.exactScore : null,
          ...(alias ? { sourceConfigurationId: setting.configurationId, sourceSettingId: setting.id, sourceModelId: setting.modelId } : {}),
          ...Object.fromEntries([['latencyMs', 'meanLatencyMs'], ['inputTokens', 'meanInputTokens'], ['outputTokens', 'meanOutputTokens'], ['totalTokens', 'meanTotalTokens']].map(([field, metric]) => [field, complete && finite(metrics?.[metric]) ? metrics[metric] : null])) });
      }
    }
  }
  addDirect(aiWorkflows, 'ai-workflows', 'exactScore', 'work-spec-generation-v1');
  const benchmarkIds = tasks.map(task => task.id);
  assert.equal(new Set(benchmarkIds).size, tasks.length, 'Overall duplicate benchmark identity');
  assert.equal(new Set([...identities.values()].map(identity => identity.id)).size, identities.size, 'Overall conflicting public model IDs');
  const benchmarkWeights = Object.fromEntries(tasks.map(task => [task.id, task.weight]));
  const benchmarkCategories = Object.fromEntries(tasks.map(task => [task.id, task.category]));
  const categories = familyIds.map(id => ({ id, weight: categoryWeights[id] }));
  const settings = [], records = [];
  for (const identity of [...identities.values()].sort((a, b) => a.configurationId.localeCompare(b.configurationId))) {
    const paths = Object.fromEntries(conditions.map(condition => [condition, tasks.map(task => cells.get(key(identity.configurationId, condition, task.id)))]));
    const coverage = Object.fromEntries(conditions.map(condition => [condition, { expectedTaskCount: tasks.length, observedTaskCount: paths[condition].filter(Boolean).length,
      assessableTaskCount: paths[condition].filter(cell => cell && finite(cell.value)).length,
      missingTaskIds: tasks.filter((_, i) => !paths[condition][i]).map(task => task.id), unassessableTaskIds: tasks.filter((_, i) => paths[condition][i]?.value === null).map(task => task.id) }]));
    const eligible = conditions.every(condition => coverage[condition].assessableTaskCount === tasks.length);
    const record = { ...identity, status: eligible ? 'eligible' : 'incomplete', eligible, conditions: coverage, scores: { baseline: null, skill: null }, exactScores: { baseline: null, skill: null }, ranks: { baseline: null, skill: null }, deltas: { skill: null }, exactDeltas: { skill: null }, metrics: { baseline: null, skill: null } };
    records.push(record);
    if (!eligible) continue;
    const components = Object.fromEntries(conditions.map(condition => [condition, familyIds.map(category => {
      const familyTasks = tasks.filter(task => task.category === category), weight = categoryWeights[category];
      const exactScore = familyTasks.reduce((sum, task) => sum + cells.get(key(identity.configurationId, condition, task.id)).value * task.weight / weight, 0);
      return { category, score: roundOverall(exactScore), exactScore, weight, exactContribution: exactScore * weight };
    })]));
    const exactScores = Object.fromEntries(conditions.map(condition => [condition, components[condition].reduce((sum, component) => sum + component.exactContribution, 0)]));
    const metrics = Object.fromEntries(conditions.map(condition => [condition, { sampleCount: tasks.length,
      ...Object.fromEntries([['meanLatencyMs', 'latencyMs'], ['meanInputTokens', 'inputTokens'], ['meanOutputTokens', 'outputTokens'], ['meanTotalTokens', 'totalTokens']].map(([field, metric]) => [field, paths[condition].every(cell => finite(cell[metric]) && cell[metric] >= 0) ? paths[condition].reduce((sum, cell, i) => sum + cell[metric] * tasks[i].weight, 0) : null])), costUsd: null }]));
    const exactDelta = exactScores.skill - exactScores.baseline;
    const setting = { ...identity, exactScores, scores: { baseline: roundOverall(exactScores.baseline), skill: roundOverall(exactScores.skill) }, exactDeltas: { skill: exactDelta }, deltas: { skill: roundOverall(exactDelta) }, categories: components, metrics };
    settings.push(setting);
    Object.assign(record, { exactScores: { ...exactScores }, scores: { ...setting.scores }, exactDeltas: { ...setting.exactDeltas }, deltas: { ...setting.deltas }, metrics });
  }
  settings.sort((a, b) => b.exactScores.skill - a.exactScores.skill || b.exactScores.baseline - a.exactScores.baseline || a.configurationId.localeCompare(b.configurationId));
  const entries = settings.flatMap(setting => conditions.map(condition => ({ ...Object.fromEntries(identityFields.filter(field => field !== 'id').map(field => [field, setting[field]])), id: `${setting.id}-${condition}`, settingId: setting.id, condition,
    exactScore: setting.exactScores[condition], score: setting.scores[condition], exactBaselineScore: setting.exactScores.baseline, baselineScore: setting.scores.baseline,
    exactDelta: condition === 'baseline' ? 0 : setting.exactDeltas.skill, delta: condition === 'baseline' ? 0 : setting.deltas.skill,
    categories: setting.categories[condition], baselineCategories: setting.categories.baseline, metrics: setting.metrics[condition], latency: setting.metrics[condition].meanLatencyMs === null ? null : setting.metrics[condition].meanLatencyMs / 1000, tokens: setting.metrics[condition].meanOutputTokens, rank: null })));
  for (const entry of entries) {
    entry.rank = 1 + entries.filter(other => other.condition === entry.condition && other.exactScore > entry.exactScore).length;
    records.find(record => record.configurationId === entry.configurationId).ranks[entry.condition] = entry.rank;
  }
  const identityAliases = [...aliases.values()].sort((a, b) => a.sourceConfigurationId.localeCompare(b.sourceConfigurationId));
  if (identityAliasPolicy && engineering.writing?.overallSource?.scoreBasis) {
    const recorded = engineering.writing.overallSource.scoreBasis;
    assert.equal(recorded.identityAliasPolicy, identityAliasPolicy, 'Overall original compact source alias policy');
    exact([...(recorded.identityAliases || [])].sort((a, b) => a.sourceConfigurationId.localeCompare(b.sourceConfigurationId)), identityAliases, 'Overall original compact source alias lineage');
  }
  return { edition: 'overall-v3', identityAliasPolicy, identityAliases, categoryWeights, writingBenchmarkWeights: { ...writingExpected.benchmarkWeights }, benchmarkWeights, benchmarkCategories, benchmarkIds, categories, settings, entries,
    coverage: { totalSettings: identities.size, eligibleSettings: settings.length, incompleteSettings: identities.size - settings.length, observedResponseCount: cells.size, expectedResponseCount: identities.size * tasks.length * 2, eligibleResponseCount: settings.length * tasks.length * 2, records }, sourceCells: [...cells.values()], gamesExcluded: true };
}

export function deriveExpectedOverallAvailableCategories(expected, configurationId) {
  assert.ok(expected.coverage.records.some(record => record.configurationId === configurationId), 'Unknown Overall model for available-category evidence');
  return expected.categories.map(category => {
    const benchmarkIds = expected.benchmarkIds.filter(id => expected.benchmarkCategories[id] === category.id);
    const lookup = (benchmarkId, condition) => expected.sourceCells.find(cell => cell.configurationId === configurationId && cell.benchmarkId === benchmarkId && cell.condition === condition);
    const pairedIds = benchmarkIds.filter(id => conditions.every(condition => finite(lookup(id, condition)?.value)));
    const complete = benchmarkIds.length > 0 && pairedIds.length === benchmarkIds.length;
    const original = expected.sourceCells.find(cell => cell.configurationId === configurationId && cell.category === category.id);
    return { categoryId: category.id, weight: category.weight, benchmarkIds, complete, available: pairedIds.length, expected: benchmarkIds.length,
      configurationId: original?.sourceConfigurationId || configurationId,
      scores: Object.fromEntries(conditions.map(condition => [condition, complete ? benchmarkIds.reduce((sum, id) => sum + lookup(id, condition).value * expected.benchmarkWeights[id] / category.weight, 0) : null])) };
  });
}

export function verifyOverallV3Projection(overall, expected) {
  assert.equal(overall?.kind, 'vasirbenchmark-overall-projection', 'Overall source projection kind');
  assert.equal(overall.scoreBasis?.edition, 'overall-v3', 'Overall source edition');
  assert.equal(overall.scoreBasis.method, 'priority-weighted-published-category-mean-v1', 'Overall declared aggregation method');
  assert.equal(overall.scoreBasis.aggregation, 'weighted-category-means-of-authoritative-final-task-scores-v3', 'Overall authoritative aggregation policy');
  assert.equal(overall.scoreBasis.declarationVersion, 3, 'Overall declaration version');
  assert.equal(overall.scoreBasis.benchmarkWeighting, 'declared-within-category', 'Overall nested benchmark policy');
  assert.equal(overall.scoreBasis.categoryWeighting, 'declared-priority-normalized-over-published-v1', 'Overall category priority policy');
  assert.equal(overall.scoreBasis.eligibility, 'all-published-tasks-in-both-conditions-v1', 'Overall full paired eligibility policy');
  assert.equal(overall.scoreBasis.resourceAggregation, 'weighted-mean-over-the-same-task-cells-null-propagating-v3', 'Overall missing-resource policy');
  assert.equal(overall.scoreBasis.publishedTargetWeight, 0.5, 'Overall published target-weight coverage');
  assert.equal(overall.scoreBasis.taskCount, expected.benchmarkIds.length, 'Overall dynamic task count');
  exact(overall.scoreBasis.benchmarkIds, expected.benchmarkIds, 'Overall published benchmark order');
  exact(overall.categories.map(category => category.id), expected.categories.map(category => category.id), 'Overall measured category order');
  for (const category of overall.categories) close(category.weight, expected.categoryWeights[category.id], 'Overall globally normalized category weight');
  sameIds(overall.scoreBasis.categoryWeights.map(category => category.categoryId), Object.keys(expected.categoryWeights), 'Overall category weight inventory');
  for (const category of overall.scoreBasis.categoryWeights) {
    close(category.weight, expected.categoryWeights[category.categoryId], 'Overall declared category weight');
    assert.equal(category.targetWeight, category.categoryId === 'engineering' ? 0.25 : 0.125, 'Overall original target weight');
    assert.equal(category.taskCount, expected.benchmarkIds.filter(id => expected.benchmarkCategories[id] === category.categoryId).length, 'Overall category task count');
  }
  sameIds(overall.scoreBasis.benchmarkWeights.map(task => task.benchmarkId), expected.benchmarkIds, 'Overall benchmark weight inventory');
  for (const task of overall.scoreBasis.benchmarkWeights) {
    close(task.weight, expected.benchmarkWeights[task.benchmarkId], 'Overall nested benchmark weight');
    assert.equal(task.familyId, expected.benchmarkCategories[task.benchmarkId], 'Overall task source family');
  }
  assert.ok(!overall.categories.some(category => category.id === 'games'), 'Games cannot enter Overall');
  const games = overall.portfolioCategories.find(category => category.id === 'games');
  assert.equal(games?.weight, 0, 'Games target is not a measured Overall segment');
  assert.equal(games?.status, 'coming-soon', 'Games remains outside this calibrated aggregate');
  assert.ok(!games.benchmarkIds.length && games.taskCount === 0);
  for (const field of ['totalSettings', 'eligibleSettings', 'incompleteSettings', 'observedResponseCount', 'expectedResponseCount', 'eligibleResponseCount']) assert.equal(overall.coverage[field], expected.coverage[field], 'Overall source coverage ' + field);
  sameIds(overall.coverage.records.map(record => record.configurationId), expected.coverage.records.map(record => record.configurationId), 'Overall union roster');
  for (const record of overall.coverage.records) {
    const original = expected.coverage.records.find(item => item.configurationId === record.configurationId);
    for (const field of ['id', 'status', 'eligible']) assert.equal(record[field], original[field], 'Overall roster ' + field);
    exact(record.conditions, original.conditions, 'Overall original missing/unassessable task inventory');
    exact(record.ranks, original.ranks, 'Overall complete-cohort ranks');
    for (const condition of conditions) {
      close(record.exactScores[condition], original.exactScores[condition], 'Overall roster exact score');
      close(record.scores[condition], original.scores[condition], 'Overall roster rendered score');
      if (!original.eligible) assert.equal(record.metrics[condition], null, 'Incomplete Overall model must not acquire a partial resource mean');
    }
    close(record.exactDeltas.skill, original.exactDeltas.skill, 'Overall roster exact paired delta');
  }
  sameIds(overall.entries.map(entry => entry.id), expected.entries.map(entry => entry.id), 'Overall complete paired entry inventory');
  sameIds(overall.settings.map(setting => setting.configurationId), expected.settings.map(setting => setting.configurationId), 'Overall eligible model inventory');
  for (const setting of overall.settings) {
    const original = expected.settings.find(item => item.configurationId === setting.configurationId);
    for (const field of ['id', 'modelId', 'provider', 'family', 'reasoning', 'label']) assert.equal(setting[field], original[field], 'Overall original setting ' + field);
    for (const condition of conditions) {
      close(setting.exactScores[condition], original.exactScores[condition], 'Overall setting exact score');
      close(setting.scores[condition], original.scores[condition], 'Overall setting display score');
      assert.equal(setting.metrics[condition].sampleCount, original.metrics[condition].sampleCount, 'Overall setting resource denominator');
      for (const field of ['meanLatencyMs', 'meanInputTokens', 'meanOutputTokens', 'meanTotalTokens']) close(setting.metrics[condition][field], original.metrics[condition][field], 'Overall setting source resource');
    }
    close(setting.exactDeltas.skill, original.exactDeltas.skill, 'Overall setting paired delta');
    close(setting.deltas.skill, original.deltas.skill, 'Overall setting displayed delta');
  }
  const taskKey = cell => JSON.stringify([cell.configurationId, cell.condition, cell.benchmarkId]);
  sameIds(overall.benchmarkResults.map(taskKey), expected.sourceCells.map(taskKey), 'Overall original task-cell inventory');
  const originalCells = new Map(expected.sourceCells.map(cell => [taskKey(cell), cell]));
  for (const cell of overall.benchmarkResults) {
    const original = originalCells.get(taskKey(cell));
    assert.equal(cell.settingId, original.settingId, 'Overall original task setting');
    assert.equal(cell.category, original.category, 'Overall original task category');
    for (const field of ['sourceConfigurationId', 'sourceSettingId', 'sourceModelId']) assert.equal(cell[field] ?? null, original[field] ?? null, 'Overall original task alias lineage ' + field);
    close(cell[original.category === 'engineering' ? 'score' : 'exactScore'], original.value, 'Overall authoritative original task score');
    for (const field of ['latencyMs', 'inputTokens', 'outputTokens', 'totalTokens']) close(cell[field] ?? null, original[field], 'Overall original task resource');
  }
  for (const entry of overall.entries) {
    const original = expected.entries.find(item => item.id === entry.id);
    for (const field of ['settingId', 'configurationId', 'condition', 'rank']) assert.equal(entry[field], original[field], 'Overall original entry ' + field);
    for (const field of ['exactScore', 'score', 'exactBaselineScore', 'baselineScore', 'exactDelta', 'delta', 'latency', 'tokens']) close(entry[field], original[field], 'Overall exact entry ' + field);
    sameIds(entry.categories.map(category => category.category), original.categories.map(category => category.category), 'Overall original component inventory');
    for (const component of entry.categories) {
      const source = original.categories.find(item => item.category === component.category);
      for (const field of ['score', 'exactScore', 'weight', 'exactContribution']) close(component[field], source[field], 'Overall source component ' + field);
    }
    assert.equal(entry.metrics.sampleCount, original.metrics.sampleCount, 'Overall source resource denominator');
    for (const field of ['meanLatencyMs', 'meanInputTokens', 'meanOutputTokens', 'meanTotalTokens']) close(entry.metrics[field], original.metrics[field], 'Overall same-source weighted resource ' + field);
  }
  return expected;
}

function originalWritingSettingLabel(expected, configurationId, settingId) {
  const settings = [...expected.publications.values()].flatMap(publication => publication.settings);
  const setting = settings.find(item => (item.configurationId || item.id) === configurationId);
  assert.ok(setting, 'Benchmark leader original model identity missing');
  return setting.label || [setting.family, setting.reasoning].filter(Boolean).join(' · ') || settingId;
}

export function deriveExpectedWritingBenchmarkLeader(expected, benchmarkId) {
  assert.ok(expected.publications.has(benchmarkId), 'Unknown benchmark leader source');
  const selected = deriveExpectedWritingCategory(expected.collection, benchmarkId);
  const eligible = selected.entries.filter(entry => entry.condition === 'skill' && entry.eligibleForRank && entry.complete && !entry.partial && finite(entry.exactScore));
  if (!eligible.length) return null;
  const highest = Math.max(...eligible.map(entry => entry.exactScore));
  const ties = eligible.filter(entry => entry.exactScore === highest).sort((left, right) => left.configurationId < right.configurationId ? -1 : left.configurationId > right.configurationId ? 1 : 0);
  const skill = ties[0], baseline = selected.entries.find(entry => entry.configurationId === skill.configurationId && entry.condition === 'baseline');
  assert.ok(baseline?.eligibleForRank && baseline.complete && !baseline.partial && finite(baseline.exactScore), 'Benchmark leader must retain its own complete baseline');
  return { settingId: skill.settingId, configurationId: skill.configurationId, label: originalWritingSettingLabel(expected, skill.configurationId, skill.settingId),
    exactBaseline: baseline.exactScore, exactSkill: skill.exactScore, exactDelta: skill.exactScore - baseline.exactScore, tiedCount: ties.length };
}

function verifyBenchmarkLeader(observed, expected, benchmarkId) {
  const leader = deriveExpectedWritingBenchmarkLeader(expected, benchmarkId);
  if (!leader) return assert.equal(observed, null, 'An unavailable benchmark cannot invent a top model');
  assert.ok(observed, 'Benchmark top model evidence missing');
  for (const field of ['settingId', 'configurationId', 'label', 'tiedCount']) assert.equal(observed[field], leader[field], 'Benchmark top model ' + field);
  for (const field of ['exactBaseline', 'exactSkill', 'exactDelta']) close(observed[field], leader[field], 'Benchmark top model paired ' + field);
  assert.equal(observed.renderedBaseline, round(leader.exactBaseline).toFixed(1), 'Benchmark top model rendered baseline');
  assert.equal(observed.renderedSkill, round(leader.exactSkill).toFixed(1), 'Benchmark top model rendered skill');
  const delta = round(leader.exactDelta);
  assert.equal(observed.renderedDelta, delta > 0 ? '+' + delta.toFixed(1) : delta < 0 ? '−' + Math.abs(delta).toFixed(1) : '±0.0', 'Benchmark top model rendered delta');
  assert.equal(observed.visible, true, 'Benchmark top model is not visible');
  const geometry = observed.geometry;
  assert.ok(geometry, 'Benchmark top model geometry missing');
  for (const field of ['withinRow', 'withinComparison', 'withinViewport', 'fieldsWithinBlock', 'fieldsNonOverlapping', 'noTextOverflow']) assert.equal(geometry[field], true, 'Benchmark top model ' + field);
  assert.ok(finite(geometry.viewportWidth) && geometry.viewportWidth > 0, 'Benchmark top model viewport');
  const validateRect = rect => {
    assert.ok(rect && ['left', 'right', 'top', 'bottom', 'width', 'height'].every(key => finite(rect[key])), 'Benchmark top model rectangle');
    assert.ok(rect.width > 0 && rect.height > 0, 'Benchmark top model empty rectangle');
    close(rect.right - rect.left, rect.width, 'Benchmark top model rectangle width');
    close(rect.bottom - rect.top, rect.height, 'Benchmark top model rectangle height');
  };
  for (const field of ['row', 'comparison', 'block']) validateRect(geometry[field]);
  const contains = (outer, inner) => inner.left >= outer.left - 1 && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
  assert.ok(contains(geometry.row, geometry.block) && contains(geometry.comparison, geometry.block), 'Benchmark top model escapes its original row');
  assert.ok(geometry.block.left >= -1 && geometry.block.right <= geometry.viewportWidth + 1, 'Benchmark top model viewport overflow');
  sameIds(geometry.fields?.map(field => field.name), ['label', 'baseline', 'skill', 'delta'], 'Benchmark top model geometry field inventory');
  for (const field of geometry.fields) { validateRect(field.rect); assert.ok(contains(geometry.block, field.rect), 'Benchmark top model field overflow'); }
  for (let i = 0; i < geometry.fields.length; i++) for (let j = i + 1; j < geometry.fields.length; j++) {
    const left = geometry.fields[i].rect, right = geometry.fields[j].rect;
    assert.ok(Math.min(left.right, right.right) - Math.max(left.left, right.left) <= 1 || Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) <= 1, 'Benchmark top model fields overlap');
  }
  exact(observed.mismatches, [], 'Benchmark top model browser checks failed');
}

function verifyCleanWritingLedger(category, expected) {
  exact(category.selectorOptions, expected.selectionIds, 'Clean Writing selector option order');
  const sidebar = expected.entries.find(entry => entry.condition === 'skill' && entry.rank === 1);
  const sidebarScore = sidebar ? sidebar.score.toFixed(1) : 'Results';
  const secondary = expected.publications.has('storytelling-magic-discovery') ? 'storytelling-magic-discovery' : expected.selectionIds.find(id => expected.publications.has(id)) || 'all-writing';
  // Versioned catalogs exercise the first active ledger link, not an archived
  // edition. Keep historical receipts on their original navigation protocol.
  const comparison = expected.fixedBasis ? expected.listedBenchmarkIds[0] : expected.publications.has('storytelling-plot-twists') ? 'storytelling-plot-twists' : secondary;
  const controls = category.sharedSelectorEvidence;
  assert.ok(Array.isArray(controls), 'Clean Writing scored-view controls missing');
  const verifyControl = evidence => {
    assert.ok(['models', 'efficiency'].includes(evidence.mode), 'Benchmark ledger must not expose score controls');
    assert.ok(expected.selectionIds.includes(evidence.selectionId), 'Unknown scored-view selection');
    assert.equal(evidence.hash, '#capabilities/writing' + (evidence.mode === 'models' ? '' : '/efficiency'), 'Scored-view control route');
    assert.equal(evidence.visible, true, 'Scored-view score selector is not visible');
    assert.equal(evidence.sidebarScore, sidebarScore, 'Scored-view changed the All Writing sidebar');
    assert.ok(evidence.selectedSettingId === null || expected.settingIds.includes(evidence.selectedSettingId), 'Scored-view selected an unknown model');
    exact(evidence.mismatches, [], 'Clean Writing scored-view browser checks failed');
  };
  for (const evidence of controls) verifyControl(evidence);
  for (const mode of ['models', 'efficiency']) assert.ok(controls.some(item => item.mode === mode && item.selectionId === 'all-writing'), 'All Writing control missing from ' + mode);
  const history = category.historyEvidence;
  assert.ok(Array.isArray(history));
  exact(history.map(item => item.direction), ['back', 'forward'], 'Clean Writing score history directions');
  exact(history.map(item => item.selectionId), ['all-writing', secondary], 'Clean Writing score history selections');
  for (const evidence of history) { verifyControl(evidence); assert.equal(evidence.mode, 'models', 'Clean Writing history must exercise the model view'); }
  for (const [field, flags] of [['leaderboardCleanEvidence', ['noProvisionalBanner', 'noVerboseCounts', 'methodologyAvailable']], ['modelDisclosureEvidence', ['defaultClosed', 'opensForAudit', 'closesAfterAudit']]]) {
    assert.ok(category[field], 'Clean Writing ' + field + ' missing');
    for (const flag of flags) assert.equal(category[field][flag], true, 'Clean Writing ' + flag);
    exact(category[field].mismatches, [], 'Clean Writing ' + field + ' failed');
  }
  assert.ok(!category.benchmarkOverviewEvidence?.length, 'Removed selected-model benchmark panels still claimed as current');
  const ledgers = category.cleanLedgerEvidence, changed = expected.settingIds.length > 1;
  assert.ok(Array.isArray(ledgers), 'Clean benchmark ledger evidence missing');
  exact(ledgers.map(item => item.selectionId), changed ? ['all-writing', 'all-writing', secondary, comparison] : ['all-writing', secondary, comparison], 'Clean benchmark ledger model/scope transition coverage');
  const listedIds = expected.listedBenchmarkIds || expected.benchmarkIds;
  const tracks = [...new Set(listedIds.map(id => expected.sources.get(id).track))];
  const expectedGroups = tracks.map(trackId => ({ trackId, benchmarkIds: listedIds.filter(id => expected.sources.get(id).track === trackId) }));
  for (const ledger of ledgers) {
    assert.ok(expected.settingIds.includes(ledger.selectedSettingId), 'Clean ledger lost the retained model identity');
    for (const flag of ['noModelSelector', 'noBreakdown', 'noFormula', 'noScoreSelector', 'noInlineProvisional', 'noExplanationEssay', 'noPartialFootnote', 'noVisibleNoise']) assert.equal(ledger[flag], true, 'Clean benchmark ledger ' + flag);
    exact(ledger.groups, expectedGroups, 'Clean benchmark hierarchy and order');
    exact(ledger.rows?.map(row => row.benchmarkId), listedIds, 'Clean benchmark row order and inventory');
    for (const row of ledger.rows) {
      if (hasWritingBenchmarkLeaders(category.presentationVariant)) verifyBenchmarkLeader(row.topModel, expected, row.benchmarkId);
      const publication = expected.publications.get(row.benchmarkId), official = publication.benchmarkSummaries?.[0] || {};
      const provisional = publication.provisionalLeaderboard;
      const hasOfficial = finite(official.baseline) && finite(official.treatment);
      const pinnedCore = expected.fixedBasis?.coreIdeaScoring === 'published-single-judge-provisional' && row.benchmarkId === 'storytelling-core-idea';
      const usesProvisional = (pinnedCore || !hasOfficial) && provisional?.status === 'provisional' && Boolean(provisional.rankedSettingCount);
      const summary = usesProvisional ? provisional.summary : official;
      const selectionId = deriveExpectedWritingCategory(expected.collection, row.benchmarkId).selectionId;
      assert.equal(row.trackId, expected.sources.get(row.benchmarkId).track, 'Clean ledger original track');
      assert.equal(row.provisional, Boolean(usesProvisional), 'Clean ledger retained source qualification');
      assert.equal(row.sourceKind, usesProvisional ? 'provisional-single-judge' : hasOfficial ? 'official-panel' : 'answers', 'Clean ledger original score basis');
      assert.equal(row.sourceSha256, usesProvisional ? provisional.sourceSha256 : publication.scoreBasis?.sourceSha256 ?? null, 'Clean ledger original score source');
      const metadata = { settingCount: usesProvisional ? provisional.rankedSettingCount : publication.coverage.completedSettingCount,
        caseCount: publication.cases.length, trialCount: publication.trialCount || publication.scoreBasis?.trialsPerTask || 1,
        judgeCount: usesProvisional ? provisional.judgeCount : publication.scoreBasis?.judgeCount || publication.scoreBasis?.judges?.length || 0 };
      for (const [key, value] of Object.entries(metadata)) assert.equal(row.metadata?.[key], value, 'Clean ledger original ' + key);
      for (const [field, key] of [['baseline', 'baseline'], ['skill', 'treatment'], ['delta', 'delta']]) {
        const value = finite(summary[key]) ? summary[key] : null;
        close(row[field], value, 'Clean ledger original all-model ' + field);
        const formatted = value === null ? '' : field === 'delta' && expected.fixedBasis
          ? value > 0 ? '+' + value.toFixed(1) : value < 0 ? '−' + Math.abs(value).toFixed(1) : '±0.0'
          : (field === 'delta' && value > 0 ? '+' : '') + value.toFixed(1);
        assert.equal(row['rendered' + field[0].toUpperCase() + field.slice(1)], formatted, 'Clean ledger rendered all-model ' + field);
      }
      const compare = new URL(row.compareHref), report = new URL(row.reportHref);
      assert.equal(compare.searchParams.get('score'), selectionId, 'Clean ledger compare-models selection');
      assert.equal(compare.searchParams.get('setting'), ledger.selectedSettingId, 'Clean ledger compare-models retained model');
      assert.equal(compare.hash, '#capabilities/writing', 'Clean ledger comparison route');
      assert.ok(report.pathname.endsWith('/benchmark-report.html'), 'Clean ledger must link the original report');
      assert.equal(report.hash.split('/')[0], '#' + row.benchmarkId, 'Clean ledger original report benchmark');
    }
    exact(ledger.mismatches, [], 'Clean benchmark ledger browser checks failed');
  }
  const retained = ledgers[changed ? 1 : 0].selectedSettingId;
  if (changed) assert.notEqual(retained, ledgers[0].selectedSettingId, 'Model selection was not exercised in the model view');
  for (const ledger of ledgers.slice(changed ? 1 : 0)) assert.equal(ledger.selectedSettingId, retained, 'Changing benchmark scope lost model identity');
  for (const evidence of history) assert.equal(evidence.selectedSettingId, retained, 'Clean Writing history lost selected model');
  assert.ok(controls.some(item => item.mode === 'models' && item.selectionId === comparison && item.selectedSettingId === retained), 'Clean ledger actual compare-models link was not exercised');
}

function verifySourceCoverage(actual, expected) {
  assert.ok(Array.isArray(actual), 'Planned-roster source readiness evidence is missing.');
  sameIds(actual.map(item => item.benchmarkId), expected.map(item => item.benchmarkId), 'Source readiness inventory');
  for (const source of expected) {
    const observed = actual.find(item => item.benchmarkId === source.benchmarkId);
    for (const field of Object.keys(source)) assert.equal(observed[field], source[field], `Source ${source.benchmarkId}/${field}`);
  }
}

// Provisional source means must remain qualified wherever they are displayed.
// Independently derive them from the pinned original answer archive so a
// plausible count, historical label, or self-reported empty mismatch list is
// insufficient evidence for accepting this separate view.
export function deriveExpectedProvisionalEvidence(expected, responseCollection) {
  const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const records = [];
  for (const [benchmarkId, publication] of expected.publications) {
    const source = publication.provisionalLeaderboard;
    if (!source) continue;
    assert.equal(benchmarkId, 'storytelling-core-idea', 'Unexpected provisional benchmark.');
    assert.equal(source.status, 'provisional', 'Provisional source status.');
    assert.equal(source.method, 'equal-case-paired-complete-corpus-single-judge-mean-v1', 'Provisional source method.');
    const judgeConfigurationId = 'codex:gpt-6-astra@xhigh';
    exact(source.judgeConfigurationIds, [judgeConfigurationId], 'Provisional fixed judge roster');
    assert.equal(source.judgeCount, 1, 'Provisional judge count.');
    assert.equal(source.sourceSha256, publication.scoreBasis.sourceSha256, 'Provisional source checkpoint.');
    assert.equal(source.corpusSha256, publication.methodology.corpusSha256, 'Provisional corpus hash.');
    assert.equal(source.skillSha256, publication.methodology.skillSha256, 'Provisional skill hash.');
    assert.equal(source.officialScoreBasisId, publication.scoreBasis.id, 'Provisional official score basis.');
    exact(source.caseIds, publication.cases.map(story => story.id), 'Provisional original case inventory');
    assert.equal(source.expectedCaseCount, source.caseIds.length, 'Provisional expected case count.');
    assert.equal(source.expectedSettingCount, publication.settings.length, 'Provisional expected setting count.');
    const archive = responseCollection?.additionalBenchmarks?.[benchmarkId] || responseCollection?.benchmarkResponses?.find(item => item.benchmarkId === benchmarkId)?.responseBundle || responseCollection;
    assert.ok(Array.isArray(archive?.responses), 'Original provisional answer archive is missing.');
    const answers = new Map();
    for (const answer of archive.responses) {
      const key = [answer.settingId, answer.caseId, answer.condition].join('|');
      assert.ok(!answers.has(key), 'Duplicate provisional archive answer identity.');
      answers.set(key, answer);
    }
    let reviewedAnswers = 0;
    const cohorts = publication.settings.map(setting => {
      const pairs = publication.cases.map(story => {
        const pair = { caseId: story.id };
        for (const condition of conditions) {
          const answer = answers.get([setting.id, story.id, condition].join('|'));
          const judgments = (answer?.judgments || []).filter(judgment => judgment.judgeConfigurationId === judgeConfigurationId);
          assert.ok(judgments.length <= 1, 'Duplicate fixed-judge original review.');
          pair[condition] = judgments.length ? judgments[0].score : null;
          if (judgments.length) {
            reviewedAnswers++;
            const calculated = publication.scoreBasis.dimensions.reduce((sum, dimension) => {
              const rating = judgments[0].dimensions?.[dimension.id]?.rating;
              assert.ok(Number.isInteger(rating) && rating >= 1 && rating <= 10, 'Original fixed-judge dimension rating is invalid.');
              return sum + rating * dimension.weight / 10;
            }, 0);
            close(judgments[0].score, calculated, 'Original fixed-judge total differs from weighted dimension ratings');
          }
        }
        return pair;
      }).filter(pair => conditions.every(condition => finite(pair[condition])));
      return { settingId: setting.id, pairs, complete: pairs.length === source.expectedCaseCount, baseline: mean(pairs.map(pair => pair.baseline)), skill: mean(pairs.map(pair => pair.skill)), delta: mean(pairs.map(pair => pair.skill - pair.baseline)) };
    });
    const eligible = cohorts.filter(cohort => cohort.complete);
    assert.equal(source.entries.length, cohorts.length * 2, 'Provisional entry inventory.');
    assert.equal(new Set(source.entries.map(entry => entry.id)).size, source.entries.length, 'Duplicate provisional entry.');
    for (const cohort of cohorts) for (const condition of conditions) {
      const entry = source.entries.find(item => item.settingId === cohort.settingId && item.condition === condition);
      assert.ok(entry, 'Provisional source entry is missing.');
      const score = cohort.complete ? cohort[condition] : null;
      const delta = cohort.complete ? condition === 'baseline' ? 0 : cohort.delta : null;
      close(entry.exactScore, score, 'Provisional exact score');
      close(entry.score, round(score), 'Provisional rounded score');
      close(entry.exactDelta, delta, 'Provisional exact delta');
      close(entry.delta, round(delta), 'Provisional rounded delta');
      assert.equal(entry.rank, cohort.complete ? 1 + eligible.filter(other => other[condition] > score).length : null, 'Provisional rank.');
      assert.equal(entry.eligibleForRank, cohort.complete, 'Provisional incomplete cohort was ranked.');
      assert.equal(entry.completedPairCount, cohort.pairs.length, 'Provisional completed pair count.');
      assert.equal(entry.expectedPairCount, source.expectedCaseCount, 'Provisional expected pair count.');
    }
    sameIds(source.incompleteSettings.map(item => item.settingId), cohorts.filter(cohort => !cohort.complete).map(cohort => cohort.settingId), 'Provisional incomplete cohort inventory');
    for (const diagnostic of source.incompleteSettings) {
      const cohort = cohorts.find(item => item.settingId === diagnostic.settingId);
      const included = cohort.pairs.map(pair => pair.caseId);
      exact(diagnostic.includedCaseIds, included, 'Provisional diagnostic included cases');
      exact(diagnostic.missingCaseIds, source.caseIds.filter(id => !included.includes(id)), 'Provisional diagnostic missing cases');
      assert.equal(diagnostic.eligibleForRank, false, 'Provisional diagnostic ranked.');
      assert.equal(diagnostic.completedPairCount, included.length, 'Provisional diagnostic completed pairs.');
      assert.equal(diagnostic.expectedPairCount, source.expectedCaseCount, 'Provisional diagnostic expected pairs.');
      for (const condition of conditions) {
        close(diagnostic.exactScores[condition], cohort[condition], 'Provisional diagnostic exact mean');
        close(diagnostic.scores[condition], round(cohort[condition]), 'Provisional diagnostic rounded mean');
      }
      close(diagnostic.exactDelta, cohort.delta, 'Provisional diagnostic exact delta');
      close(diagnostic.delta, round(cohort.delta), 'Provisional diagnostic rounded delta');
    }
    for (const [field, cohortField] of [['Baseline', 'baseline'], ['Treatment', 'skill'], ['Delta', 'delta']]) {
      const value = mean(eligible.map(cohort => cohort[cohortField]));
      close(source.summary[`exact${field}`], value, 'Provisional field exact mean');
      close(source.summary[field.toLowerCase()], round(value), 'Provisional field rounded mean');
    }
    assert.equal(source.rankedSettingCount, eligible.length, 'Provisional ranked setting count.');
    assert.equal(source.summary.usablePairs, eligible.length * source.expectedCaseCount, 'Provisional summary complete pairs.');
    assert.equal(source.summary.expectedPairs, cohorts.length * source.expectedCaseCount, 'Provisional summary planned pairs.');
    records.push({ benchmarkId, judgeConfigurationId, sourceSha256: source.sourceSha256, reviewedAnswers, rankedSettings: eligible.length, incompleteSettings: cohorts.length - eligible.length });
  }
  return records;
}

export function verifyTwistsCompletionCoverage(publication) {
  const completion = publication.methodology?.completion;
  assert.equal(completion?.version, 'plot-twists-completion-v1', 'Unknown Plot twists completion edition.');
  assert.equal(completion.parentSourceSha256, '97d1172df61311ca493c53ef99d193d607652de9bc0827bba2d3d6ca3fb41399', 'Plot twists completion parent changed.');
  for (const [field, value] of Object.entries({ originalSettingCount: 4, expandedSettingCount: 33, inheritedValidAnswerCount: 78, inheritedCompletedJudgeBatchCount: 76, retainedOriginalFailedAttemptCount: 2 })) assert.equal(completion[field], value, 'Plot twists completion ' + field);
  assert.match(completion.manifestSha256, /^[a-f0-9]{64}$/, 'Plot twists completion manifest pin missing.');
  assert.equal(publication.settings.length, 33, 'Plot twists completion setting inventory.');
  assert.equal(publication.cases.length, 1, 'Plot twists task inventory changed.');
  assert.equal(publication.trialCount, 10, 'Plot twists trial count changed.');
  const cells = publication.caseResults;
  assert.equal(cells.length, 660, 'Plot twists completion answer inventory.');
  const cellKey = cell => [cell.settingId, cell.caseId, cell.trialNumber, cell.condition].join('|');
  const byKey = new Map(cells.map(cell => [cellKey(cell), cell]));
  assert.equal(byKey.size, 660, 'Duplicate Plot twists answer identity.');
  for (const setting of publication.settings) for (let trialNumber = 1; trialNumber <= 10; trialNumber++) for (const condition of conditions) {
    const cell = byKey.get(cellKey({ settingId: setting.id, caseId: publication.cases[0].id, trialNumber, condition }));
    assert.ok(cell, 'Missing declared Plot twists cell.');
    assert.equal(cell.coverage.expectedJudgments, 2, 'Plot twists judge count changed.');
    assert.ok(Number.isInteger(cell.coverage.completedJudgments) && cell.coverage.completedJudgments >= 0 && cell.coverage.completedJudgments <= 2, 'Invalid Plot twists review coverage.');
    assert.ok(['complete', 'terminal-protocol-failure', 'unresolved'].includes(cell.generationDisposition), 'Unknown Plot twists generation disposition.');
    assert.equal(cell.coverage.expectedResponses, 1, 'Plot twists cell response denominator changed.');
    assert.equal(cell.coverage.completedResponses, cell.generationDisposition === 'unresolved' ? 0 : 1, 'Plot twists response count contradicts its generation disposition.');
    const fullPanel = cell.generationDisposition === 'complete' && cell.coverage.completedJudgments === 2;
    assert.equal(finite(cell.exactScore), fullPanel, 'Plot twists score requires the complete original panel.');
    assert.equal(finite(cell.score), fullPanel, 'Plot twists display score requires the complete original panel.');
    assert.equal(cell.score, round(cell.exactScore), 'Plot twists display score differs from its exact score.');
    if (cell.generationDisposition !== 'complete') assert.equal(cell.coverage.completedJudgments, 0, 'Invalid generation acquired a review.');
  }
  const pairKey = cell => [cell.settingId, cell.caseId, cell.trialNumber].join('|');
  const excluded = new Set(cells.filter(cell => cell.generationDisposition === 'terminal-protocol-failure').map(pairKey));
  const pendingGenerationCount = cells.filter(cell => cell.generationDisposition === 'unresolved').length;
  const pendingJudgmentCount = cells.filter(cell => !excluded.has(pairKey(cell))).reduce((sum, cell) => sum + 2 - cell.coverage.completedJudgments, 0);
  const executionComplete = pendingGenerationCount === 0 && pendingJudgmentCount === 0;
  const calculated = {
    settingCount: 33, caseCount: 1, benchmarkCount: 1, expectedResponseCount: 660, expectedJudgmentCount: 1320, expectedPairs: 330,
    responseCount: cells.filter(cell => cell.coverage.completedResponses).length,
    validResponseCount: cells.filter(cell => cell.generationDisposition === 'complete').length,
    scoredResponseCount: cells.filter(cell => finite(cell.score)).length,
    judgmentCount: cells.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0),
    completedSettingCount: publication.settings.filter(setting => cells.filter(cell => cell.settingId === setting.id).every(cell => finite(cell.exactScore))).length,
    usablePairs: cells.filter(cell => cell.condition === 'skill' && finite(cell.exactScore) && finite(byKey.get(cellKey({ ...cell, condition: 'baseline' })).exactScore)).length,
    terminalGenerationFailureCount: cells.filter(cell => cell.generationDisposition === 'terminal-protocol-failure').length,
    terminallyExcludedPairCount: excluded.size, terminallyExcludedJudgmentCount: excluded.size * 4,
    pendingGenerationCount, pendingJudgmentCount, executionComplete,
    executionStatus: executionComplete ? excluded.size ? 'complete-with-exclusions' : 'complete' : 'in-progress'
  };
  for (const [field, value] of Object.entries(calculated)) assert.equal(publication.coverage[field], value, 'Plot twists completion coverage ' + field);
  assert.ok(calculated.validResponseCount >= 78 && calculated.judgmentCount >= 152, 'Plot twists completion lost original valid evidence.');
  return calculated;
}

export function deriveExpectedPairedTwistsEvidence(publication, archive) {
  const hash = text => crypto.createHash('sha256').update(text).digest('hex');
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  const benchmarkId = 'storytelling-plot-twists';
  const judges = ['codex:gpt-6-astra@xhigh', 'codex:gpt-5.6-sol@xhigh'];
  const originalConfigurations = ['codex:gpt-6-astra@medium', 'codex:gpt-5.6-sol@medium', 'codex:gpt-5.6-terra@medium',
    'codex:gpt-5.6-luna@medium', 'claude:claude-opus-5@medium', 'claude:claude-fable-5-1@medium'];
  const addedConfigurations = ['codex:gpt-6-astra@low', 'codex:gpt-6-astra@xhigh', 'codex:gpt-6-astra@ultra',
    'claude:claude-fable-5-1@low', 'claude:claude-fable-5-1@xhigh', 'claude:claude-fable-5-1@max',
    'claude:claude-opus-5@low', 'claude:claude-opus-5@xhigh'];
  const contract = publication.methodology?.sourceContract, extension = contract?.coverageExtension;
  const configurations = extension ? [...originalConfigurations, ...addedConfigurations] : originalConfigurations;
  const settingCount = configurations.length, answerCount = settingCount * conditions.length, requestCount = settingCount * judges.length;
  if (extension) {
    assert.equal(extension.version, 'paired-reasoning-coverage-extension-v1');
    assert.ok(typeof extension.purpose === 'string' && extension.purpose.trim());
    for (const field of ['parentSnapshotSha256', 'parentManifestSha256']) assert.match(extension[field], /^[a-f0-9]{64}$/);
    sameIds(extension.addedConfigurations, addedConfigurations, 'Declared additional Plot twists configurations');
    assert.equal(extension.retainedConfigurationCount, originalConfigurations.length);
    assert.equal(extension.additionalGenerationCount, addedConfigurations.length * conditions.length);
    assert.equal(extension.additionalJudgeRequestCount, addedConfigurations.length * judges.length);
    assert.equal(contract.executionValidationPolicy?.version, 'paired-one-turn-last-message-validation-v1');
    assert.match(contract.executionValidationPolicy.sha256, /^[a-f0-9]{64}$/);
    assert.ok(typeof contract.executionValidationPolicy.purpose === 'string' && contract.executionValidationPolicy.purpose.trim());
    sameIds(contract.configurations.map(item => item.id), configurations, 'Declared complete Plot twists configurations');
    assert.equal(contract.sourceSha256, publication.scoreBasis.sourceSha256);
    assert.equal(contract.manifestSha256, publication.scoreBasis.manifestSha256);
  } else assert.equal(contract?.executionValidationPolicy, undefined, 'Supplemental policy requires a declared extension.');
  const cohortProvenance = configurationId => {
    const original = originalConfigurations.includes(configurationId);
    return { sourceCohort: original ? 'original' : 'supplement',
      sourceSnapshotSha256: original ? extension.parentSnapshotSha256 : publication.scoreBasis.sourceSha256,
      sourceManifestSha256: original ? extension.parentManifestSha256 : publication.scoreBasis.manifestSha256 };
  };
  assert.equal(publication.benchmarks?.[0]?.id, benchmarkId);
  assert.equal(publication.scoreBasis.edition, PAIRED_TWISTS_EDITION);
  assert.equal(publication.scoreBasis.method, 'complete-paired-single-prompt-two-judge-mean-v2');
  assert.equal(publication.trialCount, 1);
  assert.equal(publication.cases.length, 1);
  assert.equal(publication.scoreBasis.ratingMinimum, 0);
  assert.equal(publication.scoreBasis.ratingMaximum, 5);
  assert.equal(publication.scoreBasis.aggregation, 'mean-four-ratings-times-twenty-then-mean-two-judges');
  assert.ok(publication.scoreBasis.dimensions.every(dimension => dimension.weight === 25));
  sameIds(publication.scoreBasis.judges, judges, 'Fresh Plot twists judge panel');
  sameIds(publication.settings.map(setting => setting.configurationId), configurations, 'Declared complete Plot twists configurations');
  assert.equal(publication.methodology?.completion, undefined, 'A fresh edition cannot masquerade as historical completion.');
  assert.ok(archive && Array.isArray(archive.responses) && Array.isArray(archive.judgeRequests), 'Pinned fresh Plot twists archive missing.');
  assert.equal(archive.supersededResponses, undefined, 'Historical answers must not be mixed into the fresh edition.');
  exact(archive.sourceContract, contract, 'Paired archive source contract changed.');
  assert.equal(archive.responses.length, answerCount);
  assert.equal(archive.judgeRequests.length, requestCount);
  for (const [field, value] of Object.entries({ settingCount, expectedResponseCount: answerCount, responseCount: answerCount, scoredResponseCount: answerCount,
    completedSettingCount: settingCount, expectedJudgmentCount: answerCount * judges.length, judgmentCount: answerCount * judges.length,
    pairedJudgeCallCount: requestCount, expectedPairedJudgeCallCount: requestCount, expectedPairs: settingCount, usablePairs: settingCount })) assert.equal(publication.coverage[field], value, 'Paired Plot twists coverage ' + field);
  assert.equal(publication.coverage.executionComplete, true);
  const task = publication.cases[0];
  assert.equal(task.id, 'scifi-outline');
  assert.equal(task.wordLimit, 550);
  assert.equal(task.prompt, 'Create a brief outline of an original science-fiction story with one or more major plot twists. Include the ending. Maximum 550 words for the entire answer.');
  assert.equal(task.rubric.length, 4);
  sameIds(task.rubric.map(item => item.id), ['fulfillment-and-usefulness', 'coherent-story', 'revelation-quality', 'consequence-and-interest'], 'Fresh declared rubric criteria');
  sameIds(task.rubric.map(item => item.id), publication.scoreBasis.dimensions.map(item => item.id), 'Fresh Plot twists four rubric dimensions');
  const files = new Map(archive.promptFiles.map(file => [file.id, file]));
  const skillFiles = ['paired-skill-bundle', 'paired-skill-root', 'paired-skill-twists'].map(id => {
    const file = files.get(id);
    assert.ok(file && typeof file.content === 'string' && file.content.length, 'Frozen inline skill missing: ' + id);
    assert.equal(hash(file.content), file.sha256, 'Frozen skill bytes changed: ' + id);
    assert.equal(Buffer.byteLength(file.content), file.bytes, 'Frozen skill byte count changed: ' + id);
    return { id, sha256: file.sha256, bytes: file.bytes };
  });
  assert.equal(files.get('paired-skill-root').sha256, '551e0b710e8a60ea7e3f84208f81ec48402ba63f732278885fd13360b5c322c4', 'Original skill root must remain unchanged.');
  assert.equal(files.get('paired-skill-twists').sha256, 'cb68cc0f2df390bdbe1d11fe14634966a789e29b0281a226e55e477bbc8000b8', 'Original twists reference must remain unchanged.');
  for (const id of ['paired-skill-root', 'paired-skill-twists']) assert.equal(files.get('paired-skill-bundle').content.split(files.get(id).content).length, 2, 'Frozen root and twists must each appear once in the inline bundle.');
  const requestMap = new Map(archive.judgeRequests.map(request => [request.id, request]));
  assert.equal(requestMap.size, requestCount, 'Paired requests must have unique identities.');
  const answerKey = response => `${response.configurationId}|${response.condition}`;
  sameIds(archive.responses.map(answerKey), configurations.flatMap(configurationId => conditions.map(condition => `${configurationId}|${condition}`)), 'Fresh answer inventory');
  const answers = archive.responses.map(response => {
    assert.equal(response.caseId, task.id); assert.equal(response.trialNumber, 1);
    assert.ok(typeof response.outputText === 'string' && response.outputText.trim(), 'Fresh completed answer is missing.');
    assert.equal(hash(response.outputText), response.provenance.outputSha256, 'Fresh original answer hash');
    assert.equal(response.provenance.sourceSha256, publication.scoreBasis.sourceSha256);
    assert.equal(response.provenance.manifestSha256, publication.scoreBasis.manifestSha256);
    if (extension) for (const [field, value] of Object.entries(cohortProvenance(response.configurationId))) assert.equal(response.provenance[field], value, 'Paired answer cohort ' + field);
    else for (const field of ['sourceCohort', 'sourceSnapshotSha256', 'sourceManifestSha256']) assert.equal(response.provenance[field], undefined, 'Undeclared answer cohort.');
    assert.equal(response.provenance.questionSha256, hash(task.prompt));
    assert.equal(response.provenance.skillSha256, response.condition === 'skill' ? files.get('paired-skill-bundle').sha256 : null);
    const messages = archive.messageSets.find(item => item.id === response.messageSetId)?.messages;
    assert.ok(messages);
    assert.equal(hash(JSON.stringify(messages)), response.messageSetId, 'Fresh public message identity');
    assert.equal(messages.length, response.condition === 'skill' ? 2 : 1);
    assert.equal(messages.at(-1).role, 'user'); assert.equal(messages.at(-1).content, task.prompt);
    if (response.condition === 'skill') {
      assert.equal(messages[0].role, response.configurationId.startsWith('claude:') ? 'system' : 'developer', 'Provider instruction role must reflect actual host delivery.');
      assert.equal(messages[0].fileId, 'paired-skill-bundle');
    }
    const exactMessages = messages.map(message => ({ role: message.role, content: message.fileId ? files.get(message.fileId).content : message.content }));
    assert.equal(hash(JSON.stringify(exactMessages)), response.provenance.exactMessagesSha256, 'Fresh exact host messages');
    sameIds(response.judgments.map(judge => judge.judgeConfigurationId), judges, 'Fresh answer requires both independent judges');
    const scores = response.judgments.map(judge => {
      const request = requestMap.get(judge.requestId);
      assert.ok(request && request.configurationId === response.configurationId && request.caseId === task.id && request.trialNumber === 1);
      assert.equal(request.judgeConfigurationId, judge.judgeConfigurationId);
      assert.equal(request.candidateMap[judge.candidateId], response.condition);
      assert.equal(request.candidateResponseHashes[judge.candidateId], response.provenance.outputSha256);
      assert.equal(judge.promptSha256, request.promptSha256); assert.equal(judge.answerSha256, request.outputSha256);
      const assessment = JSON.parse(request.outputText)['assessment' + judge.candidateId];
      assert.equal(assessment.candidateLabel, judge.candidateId);
      sameIds(assessment.ratings.map(item => item.criterionId), task.rubric.map(item => item.id), 'Fresh original rating criteria');
      for (const rating of assessment.ratings) {
        assert.ok(Number.isInteger(rating.score) && rating.score >= 0 && rating.score <= 5);
        const reading = judge.dimensions[rating.criterionId];
        assert.equal(reading.rating, rating.score); assert.equal(reading.evidence, rating.evidence); assert.equal(reading.reason, rating.reason);
      }
      const score = 20 * mean(assessment.ratings.map(rating => rating.score));
      close(judge.score, score, 'Fresh original ratings determine the judge score');
      return score;
    });
    const exactScore = mean(scores);
    for (const cells of [publication.caseResults, publication.benchmarkResults, publication.entries]) {
      assert.equal(cells.length, answerCount, 'Only declared score rows can enter the paired edition.');
      const cell = cells.find(item => item.configurationId === response.configurationId && item.condition === response.condition);
      assert.ok(cell); close(cell.exactScore, exactScore, 'Fresh panel arithmetic');
    }
    return { configurationId: response.configurationId, condition: response.condition, outputSha256: response.provenance.outputSha256,
      ...(extension ? { provenance: cohortProvenance(response.configurationId) } : {}),
      messageSetId: response.messageSetId, requestIds: response.judgments.map(judge => judge.requestId), exactScore };
  });
  const requests = archive.judgeRequests.map(request => {
    assert.ok(judges.includes(request.judgeConfigurationId));
    if (extension) exact(request.provenance, cohortProvenance(request.configurationId), 'Paired original request cohort changed.');
    else assert.equal(request.provenance, undefined, 'Undeclared request cohort.');
    assert.equal(hash(request.promptText), request.promptSha256, 'Fresh original judge prompt hash');
    assert.equal(hash(request.outputText), request.outputSha256, 'Fresh original judge output hash');
    sameIds(Object.keys(request.candidateMap), ['A', 'B'], 'Fresh anonymous labels');
    sameIds(Object.values(request.candidateMap), conditions, 'Fresh request contains both conditions');
    const candidates = JSON.parse(request.promptText.split('Candidates (complete, untruncated):\n')[1]);
    const criteria = JSON.parse(request.promptText.split('Task criteria:\n')[1].split('\n\n')[0]);
    assert.ok(request.promptText.includes('Exact task:\n' + task.prompt), 'Fresh judge receives the exact task.');
    exact(criteria, task.rubric.map(({ id, criterion }) => ({ id, criterion })), 'Fresh judge receives the four original criteria.');
    sameIds(candidates.map(candidate => candidate.candidateLabel), ['A', 'B'], 'Fresh judge receives both complete anonymous answers.');
    for (const label of ['A', 'B']) {
      const answer = archive.responses.find(item => item.configurationId === request.configurationId && item.condition === request.candidateMap[label]);
      assert.ok(answer); assert.equal(request.candidateResponseHashes[label], answer.provenance.outputSha256);
      const candidate = candidates.find(item => item.candidateLabel === label), count = answer.outputText.trim().split(/\s+/u).length;
      exact(candidate, { candidateLabel: label, wordCount: count, exceedsWordLimit: count > task.wordLimit, answer: answer.outputText }, 'Fresh judge candidate bytes and word-count facts');
    }
    return { requestId: request.id, configurationId: request.configurationId, judgeConfigurationId: request.judgeConfigurationId,
      ...(extension ? { provenance: cohortProvenance(request.configurationId) } : {}),
      promptSha256: request.promptSha256, outputSha256: request.outputSha256, candidateMap: request.candidateMap,
      candidateResponseHashes: request.candidateResponseHashes, renderedOriginal: true };
  });
  for (const configurationId of configurations) {
    const pair = archive.judgeRequests.filter(request => request.configurationId === configurationId);
    sameIds(pair.map(request => request.judgeConfigurationId), judges, 'Fresh paired request roster');
    sameIds(pair.map(request => request.candidateMap.A), conditions, 'Fresh judges use opposed anonymous candidate orders');
    const firstBaseline = (parseInt(hash(JSON.stringify(['storytelling-plot-twists-paired-v2-20260909', configurationId, task.id, 1])).slice(0, 2), 16) & 1) === 0;
    assert.equal(pair.find(request => request.judgeConfigurationId === judges[0]).candidateMap.A, firstBaseline ? 'baseline' : 'skill', 'Fresh anonymous order must match the frozen pre-run seed.');
  }
  return { kind: 'vasirbenchmark-paired-twists-browser-evidence', benchmarkId, edition: PAIRED_TWISTS_EDITION, caseId: task.id,
    sourceSha256: publication.scoreBasis.sourceSha256, manifestSha256: publication.scoreBasis.manifestSha256,
    ...(extension ? { coverageExtension: extension, executionValidationPolicy: contract.executionValidationPolicy } : {}),
    skillFiles, answers, requests, mismatches: [] };
}

export function verifyCompactWritingProofEvidence(proof, publication, archive) {
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  assert.ok(archive?.judgeRequests && archive?.responses, 'Pinned compact original archive missing.');
  assert.equal(publication.publication?.adapter, 'writing-compact-v1');
  assert.ok(/^[a-f0-9]{64}$/.test(proof.compactEvidenceHarnessSha256 || ''), 'Compact browser validator pin missing.');
  const id = publication.benchmarks[0].id;
  sameIds(proof.compactCaseEvidence?.map(item => item.caseId), publication.cases.map(item => item.id), 'Compact complete task proof inventory');
  sameIds(proof.caseEvidence?.map(item => item.caseId), publication.cases.map(item => item.id), 'Compact shared report task proof inventory');
  const hash = value => crypto.createHash('sha256').update(value).digest('hex');
  for (const task of publication.cases) {
    const observed = proof.compactCaseEvidence.find(item => item.caseId === task.id);
    assert.equal(observed.kind, 'vasirbenchmark-compact-writing-browser-evidence');
    assert.equal(observed.benchmarkId, id);
    for (const key of ['sourceSha256', 'manifestSha256', 'amendmentSha256', 'judgeValidationSha256']) assert.equal(observed[key] ?? null, publication.scoreBasis[key] ?? null, 'Compact original source pin ' + key);
    exact(observed.mismatches, [], 'Compact original input, review, rubric or displayed score failed');
    const responses = archive.responses.filter(item => item.caseId === task.id);
    const requestIds = new Set();
    const answers = responses.map(response => {
      assert.equal(response.provenance.outputSha256, response.outputText ? hash(response.outputText) : null, 'Compact saved answer fingerprint');
      const judgeTotals = response.judgments.map(judgment => {
        const request = archive.judgeRequests.find(item => item.id === judgment.requestId);
        assert.ok(request && request.caseId === task.id && request.configurationId === response.configurationId, 'Compact original review identity');
        requestIds.add(request.id);
        assert.equal(hash(request.outputText), request.outputSha256, 'Compact original review fingerprint');
        assert.equal(hash(request.promptText), request.promptSha256, 'Compact original judge prompt fingerprint');
        const candidate = Object.keys(request.candidateMap).find(key => request.candidateMap[key] === response.condition);
        assert.equal(request.candidateResponseHashes[candidate], response.provenance.outputSha256, 'Compact original candidate binding');
        const assessment = JSON.parse(request.outputText)['assessment' + candidate];
        assert.equal(assessment?.candidateLabel, candidate);
        sameIds(assessment.ratings.map(item => item.criterionId), task.rubric.map(item => item.id), 'Compact original rubric criteria');
        assert.ok(assessment.ratings.every(item => Number.isInteger(item.score) && item.score >= 0 && item.score <= 5));
        return 20 * mean(assessment.ratings.map(item => item.score));
      });
      const exactScore = judgeTotals.length === 2 ? mean(judgeTotals) : null;
      const cell = publication.caseResults.find(item => item.caseId === task.id && item.configurationId === response.configurationId && item.condition === response.condition);
      if (exactScore === null) assert.equal(cell?.exactScore, null);
      else close(cell?.exactScore, exactScore, 'Compact original ratings independently reproduce the score');
      return { configurationId: response.configurationId, condition: response.condition, outputSha256: response.provenance.outputSha256,
        requestIds: response.judgments.map(item => item.requestId), exactScore };
    });
    exact(observed.answers, answers, 'Compact browser answer inventory and independent original-review scores');
    const requestProof = [...requestIds].map(requestId => {
      const request = archive.judgeRequests.find(item => item.id === requestId);
      return { requestId, promptSha256: request.promptSha256, outputSha256: request.outputSha256 };
    });
    exact(observed.requests, requestProof, 'Compact browser must inspect every original paired review exactly once');
    const shared = proof.caseEvidence.find(item => item.caseId === task.id);
    assert.equal(shared.trialNumber, 1);
    assert.equal(shared.rows, publication.settings.length);
    assert.equal(shared.sourceResponses, responses.length);
    assert.equal(shared.judgments, responses.reduce((count, response) => count + response.judgments.length, 0));
    exact(shared.mismatches, [], 'Compact shared report checks failed');
  }
  assert.equal(proof.scoredBranchCoverage.required, true, 'Compact scored browser QA was not required.');
}

export function verifyWritingProofEvidence(proof, expected) {
  const publication = expected.publications.get(proof.benchmarkId);
  assert.ok(publication, 'Writing proof does not correspond to a candidate publication.');
  exact(proof.coverage, publication.coverage, `Report coverage changed: ${proof.benchmarkId}`);
  const isDungeonMaster = proof.benchmarkId === 'dungeon-master-adventure-outline';
  const isCreation = proof.benchmarkId === 'storytelling-magic-discovery';
  assert.equal(isDungeonMaster && proof.trialCount === undefined ? 1 : proof.trialCount, publication.trialCount || 1, 'Report trial count changed.');
  const category = proof.categoryEvidence;
  assert.ok(category && Array.isArray(category.mismatches) && !category.mismatches.length, 'Category arithmetic proof missing or failed.');
  if (category.presentationVariant === WRITING_OVERALL_PRESENTATION) {
    assert.ok(expected.overallV3, 'Overall inclusion must have an independently reconstructed source oracle');
    assert.equal(typeof category.overall, 'string', 'Overall browser source JSON missing');
    verifyOverallV3Projection(JSON.parse(category.overall), expected.overallV3);
    const integration = category.overallIntegrationEvidence;
    assert.equal(integration?.edition, 'overall-v3', 'Writing Overall integration edition');
    assert.equal(integration.sourceOverallSha256, crypto.createHash('sha256').update(category.overall).digest('hex'), 'Writing Overall source byte fingerprint');
    exact(integration.includedCategoryIds, expected.overallV3.categories.map(item => item.id), 'Writing Overall included category order');
    exact(integration.categoryWeights, expected.overallV3.categoryWeights, 'Writing Overall category weights');
    exact(integration.writingBenchmarkWeights, expected.overallV3.writingBenchmarkWeights, 'Writing Overall internal benchmark weights');
    assert.equal(integration.writingSelectionId, 'all-writing', 'Overall must use complete All Writing scores');
    for (const field of ['gamesExcluded', 'sourceScoreVerified', 'lazyBeforeWriting', 'answersLazy']) assert.equal(integration[field], true, 'Writing Overall integration ' + field);
    exact(integration.mismatches, [], 'Writing Overall integration browser checks failed');
    const navigation = integration.writingSegmentNavigation;
    const clicked = navigation?.clicked, destination = navigation?.destination;
    const entry = expected.overallV3.entries.find(item => item.id === clicked?.entryId && item.condition === 'skill');
    assert.ok(entry, 'Overall Writing segment must belong to an eligible skill row');
    for (const field of ['settingId', 'configurationId']) assert.equal(clicked[field], entry[field], 'Overall clicked segment ' + field);
    assert.equal(clicked.staleSelection, 'storytelling', 'Overall segment navigation must exercise the stale-selection regression');
    const component = entry.categories.find(item => item.category === 'writing');
    close(clicked.exactScore, component.exactScore, 'Overall clicked Writing component score');
    close(clicked.weight, component.weight, 'Overall clicked Writing component weight');
    assert.equal(destination?.selectionId, 'all-writing', 'Overall Writing segment must open All Writing');
    assert.equal(destination.hash, '#capabilities/writing', 'Overall Writing segment destination route');
    assert.equal(destination.configurationId, entry.configurationId, 'Overall segment must preserve exact model identity');
    const writingEntry = expected.entries.find(item => item.condition === 'skill' && item.configurationId === entry.configurationId && !item.partial);
    assert.ok(writingEntry, 'Overall segment requires a complete All Writing destination');
    assert.equal(destination.settingId, writingEntry.settingId, 'Overall segment destination setting');
    close(destination.exactScore, writingEntry.exactScore, 'Overall segment destination All Writing score');
    exact(navigation.mismatches, [], 'Overall Writing segment navigation failed');
  }
  for (const key of ['benchmarkIds', 'activeBenchmarkIds', 'groupIds', 'settingIds']) sameIds(category[key], expected[key], `Category ${key}`);
  for (const key of ['completeSettings', 'unscoredSettings', 'tiedRankEntries', 'regressionSettings', ...(selectedWritingMethod(expected.method) ? ['rankedSettings', 'partialSettings'] : [])]) {
    assert.equal(category[key], expected[key], `Category ${key}`);
    if (!isDungeonMaster) assert.equal(proof.scoredBranchCoverage?.[key], expected[key], `Scored branch category ${key}`);
  }
  for (const key of ['rawUnchanged', 'noPicker', 'tabsImmediatelyAfterHeader', 'answersLazy', 'disclosure']) assert.equal(category[key], true, `Category ${key}`);
  assert.equal(category.hash, '#capabilities/writing', 'Category route changed.');
  exact(category.efficiencyEvidence, expected.efficiencyEvidence, 'Category efficiency point and frontier evidence');
  if (!isDungeonMaster) exact(proof.scoredBranchCoverage.efficiency, expected.efficiencyEvidence, 'Scored branch efficiency evidence');
  assert.ok(Array.isArray(category.visibleSettingIds) && new Set(category.visibleSettingIds).size === category.visibleSettingIds.length, 'Category visible setting inventory is missing or duplicated.');
  assert.ok(category.visibleSettingIds.every(id => expected.entries.some(entry => entry.settingId === id && entry.condition === 'skill' && finite(entry.exactScore))), 'Category ranks an incomplete setting.');
  assert.equal(category.method, expected.method, 'Browser category method changed.');
  if (selectedWritingMethod(expected.method)) {
    verifySelectedPresentation(category, expected);
  } else {
  sameIds(category.declaredConfigurationIds, expected.declaredConfigurationIds, 'Browser planned configuration roster');
  assert.equal(category.declaredRosterBenchmarkId, expected.declaredRosterBenchmarkId, 'Browser planned roster source');
  assert.equal(category.declaredRosterSelection, expected.declaredRosterSelection, 'Browser finalized roster anchor policy');
  sameIds(category.comparisonBenchmarkIds, expected.activeBenchmarkIds, 'Browser comparison sources');
  verifySourceCoverage(category.sourceCoverage, expected.sourceCoverage);
  assert.ok(!category.partialEvidence, 'Rejected partial placeholder evidence remains in the presentation.');
  const presentation = category.presentationEvidence;
  assert.ok(presentation, 'Overall-aligned Writing presentation evidence is missing.');
  for (const field of ['noPlaceholderPanels', 'compactRows', 'matchedOverallFrame', 'packedSegments']) assert.equal(presentation[field], true, `Writing presentation ${field}`);
  exact(presentation.mismatches, [], 'Writing packed-row geometry or display failed');
  sameIds(presentation.numericPairedSettingIds, expected.entries.filter(entry => entry.condition === 'skill' && finite(entry.exactScore)).map(entry => entry.settingId), 'Every ranked model must have an inspectable numeric pair');
  assert.ok(Array.isArray(presentation.packedBars), 'Packed segment evidence missing.');
  const packedKeys = presentation.packedBars.map(bar => bar.settingId + '|' + bar.condition);
  assert.equal(new Set(packedKeys).size, packedKeys.length, 'Duplicate packed bar evidence.');
  for (const settingId of category.visibleSettingIds) for (const condition of conditions) {
    const bar = presentation.packedBars.find(item => item.settingId === settingId && item.condition === condition);
    const entry = expected.entries.find(item => item.settingId === settingId && item.condition === condition);
    assert.ok(bar && finite(entry?.exactScore), 'Visible row lacks finite paired bar evidence.');
    assert.equal(bar.segmentCount, expected.groupIds.length, 'Packed scored subgroup count');
    close(bar.score, entry.exactScore, 'Packed bar score');
    close(bar.total, entry.categories.reduce((sum, group) => sum + group.exactContribution, 0), 'Packed contribution sum');
  }
  }
  const provisionalIds = [...expected.publications].filter(([, publication]) => publication.provisionalLeaderboard).map(([id]) => id);
  const cleanLedger = isCleanWritingPresentation(category.presentationVariant);
  if (cleanLedger) {
    const report = proof.reportPresentationEvidence;
    assert.equal(report?.benchmarkId, proof.benchmarkId, 'Common report presentation benchmark');
    assert.equal(report.modelComparisonHeading, 'Model comparison', 'Common report model comparison heading');
    for (const field of ['defaultClosed', 'modelComparisonFirst', 'secondaryTablesHidden', 'opensForAudit', 'closesAfterAudit']) assert.equal(report[field], true, 'Common report presentation ' + field);
    exact(report.mismatches, [], 'Common report presentation browser checks failed');
  }
  const displays = (cleanLedger ? category.provisionalMethodEvidence : category.provisionalDisplayEvidence) || [];
  const archives = proof.provisionalArchiveEvidence || [];
  if (cleanLedger) exact(category.provisionalDisplayEvidence || [], [], 'Removed provisional accordions cannot be claimed as current evidence');
  sameIds(displays.map(item => item.benchmarkId), provisionalIds, 'Provisional display proof inventory');
  sameIds(archives.map(item => item.benchmarkId), isCreation ? [] : provisionalIds, 'Provisional original-review proof inventory');
  if (provisionalIds.length) {
    assert.ok(Array.isArray(expected.provisionalEvidence), 'Acceptance did not verify the candidate original provisional reviews.');
    sameIds(expected.provisionalEvidence.map(item => item.benchmarkId), provisionalIds, 'Independently derived provisional inventory');
    for (const original of expected.provisionalEvidence) {
      const display = displays.find(item => item.benchmarkId === original.benchmarkId);
      const archive = archives.find(item => item.benchmarkId === original.benchmarkId);
      for (const field of ['sourceSha256', 'rankedSettings', 'incompleteSettings']) {
        if (!cleanLedger || field === 'sourceSha256') assert.equal(display[field], original[field], `Provisional display ${field}`);
        if (!isCreation) assert.equal(archive[field], original[field], `Provisional archived ${field}`);
      }
      exact(display.judgeConfigurationIds, [original.judgeConfigurationId], 'Provisional display fixed judge');
      if (!isCreation) assert.equal(archive.judgeConfigurationId, original.judgeConfigurationId, 'Provisional archived fixed judge.');
      if (!isCreation) assert.equal(archive.reviewedAnswers, original.reviewedAnswers, 'Provisional original reviewed-answer count.');
      if (cleanLedger) {
        assert.equal(display.scope, 'category-methodology', 'Derived provisional qualification must name its actual disclosure');
        for (const field of ['defaultClosed', 'openedForAudit', 'provisional', 'singleJudge', 'closedAfterAudit']) assert.equal(display[field], true, 'Provisional Methodology ' + field);
        const included = category.presentationVariant === WRITING_OVERALL_PRESENTATION;
        assert.equal(display.excludedOverall, !included, 'Provisional Methodology Overall exclusion must match the publication edition');
        if (included) {
          assert.equal(display.includedOverall, true, 'Provisional Methodology must disclose inclusion in Overall');
          assert.equal(display.overallWeight, 0.25, 'Provisional Methodology Overall category weight');
        }
        const report = new URL(display.reportHref);
        assert.ok(report.pathname.endsWith('/benchmark-report.html'), 'Methodology must retain the original benchmark report');
        assert.equal(report.hash.split('/')[0], '#' + original.benchmarkId, 'Methodology original report benchmark');
      } else sameIds(display.activeBenchmarkIds, expected.activeBenchmarkIds, 'Provisional display contaminated the primary category index');
      if (!cleanLedger && expected.selectionId === 'all-writing') {
        assert.equal(display.placementEvidence?.comparisonBenchmarkId, original.benchmarkId, 'Provisional disclosure must follow its own compare-models link');
        assert.equal(display.placementEvidence?.ledgerBenchmarkId, original.benchmarkId, 'Provisional disclosure must remain beside its original field-mean row');
        const link = new URL(display.placementEvidence.compareHref);
        assert.equal(link.searchParams.get('score'), deriveExpectedWritingCategory(expected.collection, original.benchmarkId).selectionId, 'Provisional compare-models link selection');
        assert.equal(link.searchParams.get('setting'), category.benchmarkOverviewEvidence.at(-1).selectedSettingId, 'Provisional compare-models link lost the selected model');
        assert.equal(link.hash, '#capabilities/writing', 'Provisional compare-models link route');
      }
      exact(display.mismatches, [], 'Provisional DOM scores, ranks, placement or diagnostics failed');
      if (!isCreation) exact(archive.mismatches, [], 'Provisional original-review arithmetic failed');
    }
  }
  if (proof.benchmarkId === 'storytelling-plot-twists') {
    const coverage = publication.coverage;
    if (publication.scoreBasis?.edition === PAIRED_TWISTS_EDITION) {
      exact(proof.pairedTwistsEvidence, deriveExpectedPairedTwistsEvidence(publication, expected.pairedTwistsArchive), 'Fresh paired Plot twists original evidence changed.');
      assert.equal(proof.predecessorArchiveEvidence, undefined, 'Fresh Plot twists cannot display historical answers.');
      sameIds(proof.caseEvidence?.map(item => item.caseId), publication.cases.map(item => item.id), 'Fresh Plot twists shared report task');
      const observed = proof.caseEvidence[0];
      for (const [field, value] of Object.entries({ trialNumber: 1, rows: publication.settings.length,
        sourceResponses: publication.settings.length * conditions.length, judgments: publication.settings.length * conditions.length * 2 })) assert.equal(observed[field], value, 'Paired Plot twists browser ' + field);
      exact(observed.mismatches, [], 'Fresh Plot twists shared report checks failed.');
    } else if (publication.methodology?.completion) {
      verifyTwistsCompletionCoverage(publication);
      assert.equal(expected.twistsPredecessors?.length, 2, 'Pinned original Plot twists predecessor archive missing.');
      const predecessorEvidence = { parentSourceSha256: publication.methodology.completion.parentSourceSha256,
        declaredCount: 2, renderedCount: 2,
        responses: expected.twistsPredecessors.map(response => ({ configurationId: response.configurationId, caseId: response.caseId,
          trialNumber: response.trialNumber, condition: response.condition, sourceSha256: response.provenance.sourceSha256,
          outputSha256: response.provenance.outputSha256, copiedOutputSha256: response.provenance.outputSha256,
          status: 'error', score: null, readStatus: 'incomplete', visible: true, copyAvailable: true })), mismatches: [] };
      exact(proof.predecessorArchiveEvidence, predecessorEvidence, 'Original Plot twists failures must remain inspectable, byte-exact, and unscored.');
    } else {
    for (const [field, value] of Object.entries({ responseCount: 80, expectedResponseCount: 80, validResponseCount: 78, scoredResponseCount: 76, judgmentCount: 152, expectedJudgmentCount: 160, terminalGenerationFailureCount: 2, terminallyExcludedPairCount: 2, terminallyExcludedJudgmentCount: 8, pendingGenerationCount: 0, pendingJudgmentCount: 0, completedSettingCount: 2 })) assert.equal(coverage[field], value, `Frozen Plot twists ${field}`);
    assert.equal(coverage.executionStatus, 'complete-with-exclusions', 'Frozen Plot twists execution status');
    assert.equal(coverage.executionComplete, true, 'Frozen Plot twists execution completeness');
    }
    assert.equal(proof.scoredBranchCoverage.required, true, 'Plot twists scored QA was not required.');
  }
  if (isDungeonMaster) {
    assert.ok(Array.isArray(proof.caseEvidence), 'Dungeon Master per-case proof is missing.');
    sameIds(proof.caseEvidence.map(item => item.caseId), publication.cases.map(story => story.id), 'Dungeon Master complete case proof inventory');
    for (const story of publication.cases) {
      const observed = proof.caseEvidence.find(item => item.caseId === story.id);
      const cells = publication.caseResults.filter(cell => cell.caseId === story.id);
      assert.equal(observed.answers, cells.length, 'Dungeon Master original answer record count.');
      assert.equal(observed.judgments, cells.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0), 'Dungeon Master original judgment count.');
      assert.equal(observed.preferences, publication.pairwisePreferences.filter(item => item.caseId === story.id).length, 'Dungeon Master original preference count.');
      exact(observed.mismatches, [], 'Dungeon Master case evidence, scores or original answer changed');
    }
  }
  if (isCreation) {
    const archive = expected.creationArchive;
    assert.ok(archive?.judgeProfiles && archive?.judgeRequests, 'Pinned Magic creation archive missing.');
    const context = archive.promptFiles.find(file => file.id === 'frozen-informed-judge-context');
    assert.ok(context, 'Frozen informed Magic context missing.');
    const wanted = { profiles: archive.judgeProfiles.map(({ id, configurationId, contextMode, contextSha256 }) => ({ id, configurationId, contextMode, contextSha256 })),
      contextSha256: crypto.createHash('sha256').update(context.content).digest('hex'), contextBytes: Buffer.byteLength(context.content),
      contextFileCount: publication.methodology.informedSkillFiles.length, verifiedRequestCount: archive.judgeRequests.length,
      verifiedOriginalFinals: archive.judgeRequests.filter(request => request.status === 'complete').length, contextRows: publication.settings.length, mismatches: [] };
    exact(proof.creationArchiveEvidence, wanted, 'Magic original archive, four context seats or context mean evidence changed');
    const tasks = publication.cases.flatMap(story => Array.from({ length: publication.trialCount }, (_, index) => ({ caseId: story.id, trialNumber: index + 1 })));
    const key = item => item.caseId + '|' + item.trialNumber;
    sameIds(proof.caseEvidence?.map(key), tasks.map(key), 'Magic original three-trial case inventory');
    sameIds(proof.creationExpandedEvidence?.map(key), tasks.map(key), 'Magic expanded original-review trial inventory');
    for (const task of tasks) {
      const evidence = proof.caseEvidence.find(item => key(item) === key(task));
      const cells = publication.caseResults.filter(cell => cell.caseId === task.caseId && cell.trialNumber === task.trialNumber);
      assert.equal(evidence.sourceResponses, cells.length, 'Magic original answer record count');
      assert.equal(evidence.rows, publication.settings.length, 'Magic complete trial model inventory');
      assert.equal(evidence.judgments, cells.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0), 'Magic original four-seat judgment count');
      exact(evidence.mismatches, [], 'Magic case answer, score or review evidence failed');
      const expanded = proof.creationExpandedEvidence.find(item => key(item) === key(task));
      exact(expanded.mismatches, [], 'Magic expanded originals or prompts failed');
      sameIds(expanded.expanded?.map(item => item.profileId), archive.judgeProfiles.map(profile => profile.id), 'Magic expanded four-profile inventory');
      for (const item of expanded.expanded) {
        const request = archive.judgeRequests.find(request => request.id === item.requestId);
        assert.ok(request && request.profileId === item.profileId, 'Magic expanded request identity');
        assert.equal(item.outputSha256, request.outputSha256, 'Magic original final hash');
        assert.equal(item.promptSha256, request.promptSha256, 'Magic original prompt hash');
        assert.ok(item.geometry?.failureFlags && Object.values(item.geometry.failureFlags).every(value => value === false), 'Magic original evidence is hidden or overflows');
      }
    }
    assert.equal(proof.scoredBranchCoverage.required, true, 'Magic scored QA was not required.');
  }
  if (publication.publication?.adapter === 'writing-compact-v1') verifyCompactWritingProofEvidence(proof, publication,
    expected.compactArchives instanceof Map ? expected.compactArchives.get(proof.benchmarkId) : expected.compactArchives?.[proof.benchmarkId]);
  return { benchmarkId: proof.benchmarkId, completeSettings: expected.completeSettings, reportCompletedSettings: publication.coverage.completedSettingCount };
}
