import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Independent arithmetic for the acceptance boundary. Do not call the app's
// category builder here: the candidate implementation is what we are checking.
const finite = Number.isFinite;
const conditions = ['baseline', 'skill'];
export const WRITING_CATEGORY_METHOD = 'common-benchmark-ranking-with-visible-partials-v5';
export const WRITING_PARTIAL_FOOTNOTE = '* Unranked mean of available scores, not a comparable aggregate. Missing tests are not zero. Only models with every selected test receive a rank.';
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
  const visit = source => {
    if (!source) return;
    const id = source.benchmarks?.[0]?.id;
    if (id && !publications.has(id)) publications.set(id, source);
    for (const child of source.benchmarkPublications || []) visit(child.projection);
    for (const child of Object.values(source.additionalBenchmarks || {})) visit(child);
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
    const type = officialCount ? 'official' : provisionalCount ? 'provisional' : 'unavailable';
    const basisSource = type === 'provisional' ? publication.provisionalLeaderboard : publication.scoreBasis || {};
    sources.set(benchmarkId, { benchmarkId, track, rows: type === 'official' ? official : type === 'provisional' ? provisional : new Map(), type, provisional: type === 'provisional', officialCount, completedSettingCount: type === 'official' ? officialCount : type === 'provisional' ? provisionalCount : 0,
      plannedSettingCount: localIds.size, basisId: basisSource.id || `${benchmarkId}:${basisSource.method || type}`, method: basisSource.method, judgeCount: basisSource.judgeCount });
  }
  if (!tracks.has(selectionId) && !publications.has(selectionId)) selectionId = tracks.has('storytelling') ? 'storytelling' : tracks.keys().next().value;
  if (publications.has(selectionId) && tracks.get(sources.get(selectionId).track).length === 1) selectionId = sources.get(selectionId).track;
  const activeBenchmarkIds = tracks.has(selectionId) ? [...tracks.get(selectionId)] : [selectionId];
  const groupIds = [...new Set(activeBenchmarkIds.map(id => sources.get(id).track))];
  const benchmarkWeights = Object.fromEntries(activeBenchmarkIds.map(id => [id, 1 / activeBenchmarkIds.length]));
  const provisional = activeBenchmarkIds.some(id => sources.get(id).provisional);
  const entries = [];
  for (const [configurationId, settingId] of identities) {
    // Determine availability once per model, before either condition is averaged.
    // Trial-incomplete diagnostics are not benchmark scores; missing benchmarks
    // have zero weight, while each available paired benchmark has weight 1/N.
    const availableBenchmarkIds = activeBenchmarkIds.filter(id => paired(sources.get(id).rows.get(configurationId)));
    const missingBenchmarkIds = activeBenchmarkIds.filter(id => !availableBenchmarkIds.includes(id));
    const complete = activeBenchmarkIds.length > 0 && !missingBenchmarkIds.length;
    const eligibleForRank = complete;
    const partial = availableBenchmarkIds.length > 0 && !complete;
    const entryProvisional = availableBenchmarkIds.some(id => sources.get(id).provisional);
    const actualWeights = Object.fromEntries(activeBenchmarkIds.map(id => [id, availableBenchmarkIds.includes(id) ? 1 / availableBenchmarkIds.length : 0]));
    for (const condition of conditions) {
      // Resources use the score subset too: never silently drop a source just
      // because its latency or token reading is missing.
      const mean = getter => availableBenchmarkIds.length > 0 && availableBenchmarkIds.every(id => finite(getter(sources.get(id).rows.get(configurationId)[condition])))
        ? availableBenchmarkIds.reduce((sum, id) => sum + getter(sources.get(id).rows.get(configurationId)[condition]), 0) / availableBenchmarkIds.length : null;
      const exactScore = mean(entry => entry.exactScore);
      const latency = mean(entry => entry.metrics?.meanLatencyMs);
      const benchmarkComponents = activeBenchmarkIds.map(benchmarkId => {
        const source = sources.get(benchmarkId), row = source.rows.get(configurationId);
        const exactScore = paired(row) ? row[condition].exactScore : null;
        return { benchmarkId, exactScore, score: round(exactScore), weight: actualWeights[benchmarkId], complete: paired(row), provisional: source.provisional, basisType: source.type };
      });
      entries.push({ id: `${settingId}-${condition}`, settingId, configurationId, condition, exactScore, score: round(exactScore), complete, eligibleForRank, partial, provisional: entryProvisional,
        sourceCount: availableBenchmarkIds.length, availableBenchmarkIds, missingBenchmarkIds, benchmarkWeights: actualWeights, benchmarkComponents, latency: latency === null ? null : latency / 1000, tokens: mean(entry => entry.metrics?.meanOutputTokens) });
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
  const selectionIds = [...tracks].flatMap(([id, ids]) => ids.length > 1 ? [id, ...ids] : [id]);
  return { collection, publications, sources, entries, method: WRITING_CATEGORY_METHOD, selectionId, selection: { id: selectionId, benchmarkIds: activeBenchmarkIds, provisional, completedSettingCount: completeSettings, rankedSettingCount: rankedSettings, partialSettingCount: partialSettings }, selectionIds, activeBenchmarkIds, comparisonBenchmarkIds: activeBenchmarkIds,
    benchmarkIds: [...publications.keys()], benchmarkWeights, provisional, groupIds, settingIds: [...identities.values()], completeSettings, rankedSettings, partialSettings, unscoredSettings: identities.size - rankedSettings - partialSettings,
    tiedRankEntries: entries.filter(entry => entry.eligibleForRank && finite(entry.exactScore) && entries.some(other => other.eligibleForRank && other.id !== entry.id && other.condition === entry.condition && other.exactScore === entry.exactScore)).length,
    regressionSettings: entries.filter(entry => entry.eligibleForRank && entry.condition === 'skill' && finite(entry.exactDelta) && entry.exactDelta < 0).length, efficiencyEvidence };
}

export function verifyCandidateCategoryProjection(actual, expected) {
  if (expected.method === WRITING_CATEGORY_METHOD) return verifySelectedCategoryProjection(actual, expected);
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
  assert.equal(category.method, WRITING_CATEGORY_METHOD, 'Candidate available-score method changed.');
  assert.equal(category.selection.id, expected.selectionId, 'Candidate score selection changed.');
  assert.equal(category.selection.provisional, expected.provisional, 'Candidate provisional aggregate is unqualified.');
  sameIds(category.selection.benchmarkIds, expected.activeBenchmarkIds, 'Candidate selected test set');
  sameIds(category.activeBenchmarkIds, expected.activeBenchmarkIds, 'Candidate fixed active test set');
  sameIds(category.selections.map(item => item.id), expected.selectionIds, 'Candidate available score selections');
  exact(category.benchmarkWeights, expected.benchmarkWeights, 'Candidate equal benchmark weights');
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
      for (const field of ['exactScore', 'score', 'weight']) close(observed[field], component[field], `${wanted.id}/${component.benchmarkId}/${field}`);
      assert.equal(observed.complete, component.complete, 'Incomplete component was promoted');
      assert.equal(observed.provisional, component.provisional, 'Component provisional basis hidden');
      assert.equal(observed.basis.type, component.basisType, 'Component switched source by model');
      assert.equal(observed.basis.id, expected.sources.get(component.benchmarkId).basisId, 'Component source identity changed');
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
    const { benchmarkPublications, additionalBenchmarks, collectionCoverage, allWritingCoverage, ...raw } = publication;
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

function verifySelectionEvidence(evidence, expected) {
  assert.equal(evidence.selectionId, expected.selectionId, 'Selected score field changed');
  sameIds(evidence.activeBenchmarkIds, expected.activeBenchmarkIds, 'Selected fixed test set');
  exact(evidence.benchmarkWeights, expected.benchmarkWeights, 'Selected fixed test weights');
  assert.equal(evidence.provisional, expected.provisional, 'Selected provisional basis is hidden');
  for (const field of ['completeSettings', 'rankedSettings', 'partialSettings']) assert.equal(evidence[field], expected[field], `Selected ${field}`);
  exact(evidence.mismatches, [], 'Selected comparison browser checks failed');
  verifyDumbbellRows(evidence.rowEvidence, expected, expected.selectionId);
  assert.equal(evidence.partialFootnote, WRITING_PARTIAL_FOOTNOTE, 'Available-score qualification changed');
  sameIds(evidence.headerEvidence?.map(item => item.condition), expected.rankedSettings ? ['skill'] : [], 'Model view skill leader qualifier');
  for (const header of evidence.headerEvidence) {
    const leaders = expected.entries.filter(entry => entry.condition === header.condition && entry.rank === 1);
    assert.equal(header.partial, leaders.some(entry => entry.partial), 'Header partial leader status');
    const displayed = leaders.find(entry => entry.id === header.entryId);
    assert.ok(displayed, 'Header does not show a condition leader');
    assert.equal(header.asteriskRendered, displayed.partial, 'Header displayed score asterisk');
  }
  const story = deriveExpectedWritingCategory(expected.collection, 'storytelling');
  const sidebarLeaders = story.entries.filter(entry => entry.condition === 'skill' && entry.rank === 1);
  assert.ok(sidebarLeaders.length ? sidebarLeaders.some(entry => entry.partial === evidence.sidebarPartial && entry.partial === evidence.sidebarAsteriskRendered) : evidence.sidebarPartial === false && evidence.sidebarAsteriskRendered === false, 'Sidebar aggregate leader lacks its partial-score marker');
  assert.ok(Array.isArray(evidence.componentEvidence), 'Selected benchmark component evidence missing');
  const componentSettings = [...new Set(evidence.componentEvidence.map(item => item.settingId))];
  if (expected.rankedSettings) assert.ok(componentSettings.length, 'Selected numeric breakdown is missing');
  const missingCounts = [...new Set(expected.entries.filter(entry => entry.condition === 'skill' && finite(entry.exactScore)).map(entry => entry.missingBenchmarkIds.length))];
  sameIds([...new Set(componentSettings.map(id => expected.entries.find(entry => entry.settingId === id && entry.condition === 'skill')?.missingBenchmarkIds.length))], missingCounts, 'Every available benchmark-count formula is exercised');
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
    assert.equal(formula.divisor, skill.sourceCount, 'Selected formula available-score divisor');
  }
}

function verifySelectedPresentation(category, expected) {
  assert.equal(category.selectionId, expected.selectionId, 'Default Writing selection changed');
  assert.equal(category.provisional, expected.provisional, 'Default aggregate provisional basis missing');
  exact(category.benchmarkWeights, expected.benchmarkWeights, 'Browser default equal weights');
  assert.ok(!category.partialEvidence, 'Rejected partial placeholder evidence remains');
  const presentation = category.presentationEvidence;
  assert.ok(presentation && !presentation.packedBars, 'Writing still uses packed bars or lacks dumbbell evidence');
  for (const field of ['noPlaceholderPanels', 'compactRows', 'matchedEngineeringFrame', 'dumbbellGeometry']) assert.equal(presentation[field], true, `Writing presentation ${field}`);
  exact(presentation.mismatches, [], 'Writing dumbbell geometry failed');
  sameIds(presentation.numericPairedSettingIds, expected.entries.filter(entry => entry.condition === 'skill' && finite(entry.exactScore)).map(entry => entry.settingId), 'Every ranked model must have a numeric dumbbell');
  verifyDumbbellRows(presentation.dumbbellRows, expected, 'Default Writing');
  sameIds(category.selectionEvidence?.map(item => item.selectionId), expected.selectionIds, 'Every dropdown selection must be exercised');
  for (const selectionId of expected.selectionIds) verifySelectionEvidence(category.selectionEvidence.find(item => item.selectionId === selectionId), deriveExpectedWritingCategory(expected.collection, selectionId));
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

export function verifyWritingProofEvidence(proof, expected) {
  const publication = expected.publications.get(proof.benchmarkId);
  assert.ok(publication, 'Writing proof does not correspond to a candidate publication.');
  exact(proof.coverage, publication.coverage, `Report coverage changed: ${proof.benchmarkId}`);
  const isDungeonMaster = proof.benchmarkId === 'dungeon-master-adventure-outline';
  const isCreation = proof.benchmarkId === 'storytelling-magic-discovery';
  assert.equal(isDungeonMaster && proof.trialCount === undefined ? 1 : proof.trialCount, publication.trialCount || 1, 'Report trial count changed.');
  const category = proof.categoryEvidence;
  assert.ok(category && Array.isArray(category.mismatches) && !category.mismatches.length, 'Category arithmetic proof missing or failed.');
  for (const key of ['benchmarkIds', 'activeBenchmarkIds', 'groupIds', 'settingIds']) sameIds(category[key], expected[key], `Category ${key}`);
  for (const key of ['completeSettings', 'unscoredSettings', 'tiedRankEntries', 'regressionSettings', ...(expected.method === WRITING_CATEGORY_METHOD ? ['rankedSettings', 'partialSettings'] : [])]) {
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
  if (expected.method === WRITING_CATEGORY_METHOD) {
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
  const displays = category.provisionalDisplayEvidence || [];
  const archives = proof.provisionalArchiveEvidence || [];
  sameIds(displays.map(item => item.benchmarkId), provisionalIds, 'Provisional display proof inventory');
  sameIds(archives.map(item => item.benchmarkId), isCreation ? [] : provisionalIds, 'Provisional original-review proof inventory');
  if (provisionalIds.length) {
    assert.ok(Array.isArray(expected.provisionalEvidence), 'Acceptance did not verify the candidate original provisional reviews.');
    sameIds(expected.provisionalEvidence.map(item => item.benchmarkId), provisionalIds, 'Independently derived provisional inventory');
    for (const original of expected.provisionalEvidence) {
      const display = displays.find(item => item.benchmarkId === original.benchmarkId);
      const archive = archives.find(item => item.benchmarkId === original.benchmarkId);
      for (const field of ['sourceSha256', 'rankedSettings', 'incompleteSettings']) {
        assert.equal(display[field], original[field], `Provisional display ${field}`);
        if (!isCreation) assert.equal(archive[field], original[field], `Provisional archived ${field}`);
      }
      exact(display.judgeConfigurationIds, [original.judgeConfigurationId], 'Provisional display fixed judge');
      if (!isCreation) assert.equal(archive.judgeConfigurationId, original.judgeConfigurationId, 'Provisional archived fixed judge.');
      if (!isCreation) assert.equal(archive.reviewedAnswers, original.reviewedAnswers, 'Provisional original reviewed-answer count.');
      sameIds(display.activeBenchmarkIds, expected.activeBenchmarkIds, 'Provisional display contaminated the primary category index');
      exact(display.mismatches, [], 'Provisional DOM scores, ranks, placement or diagnostics failed');
      if (!isCreation) exact(archive.mismatches, [], 'Provisional original-review arithmetic failed');
    }
  }
  if (proof.benchmarkId === 'storytelling-plot-twists') {
    const coverage = publication.coverage;
    if (publication.methodology?.completion) {
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
  return { benchmarkId: proof.benchmarkId, completeSettings: expected.completeSettings, reportCompletedSettings: publication.coverage.completedSettingCount };
}
