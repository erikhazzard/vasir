import assert from 'node:assert/strict';

// Independent arithmetic for the acceptance boundary. Do not call the app's
// category builder here: the candidate implementation is what we are checking.
const finite = Number.isFinite;
const conditions = ['baseline', 'skill'];
const close = (actual, expected, label) => assert.ok(expected === null ? actual === null : finite(actual) && Math.abs(actual - expected) < 1e-8, label);
const round = value => finite(value) ? Math.round(value * 10) / 10 : null;
const exact = (actual, expected, label) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), label);
const sameIds = (actual, expected, label) => {
  assert.ok(Array.isArray(actual) && new Set(actual).size === actual.length, `${label}: missing or duplicate identity`);
  exact([...actual].sort(), [...expected].sort(), label);
};

export function deriveExpectedWritingCategory(collection) {
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
    groupFor.set(id, publication.benchmarks[0].trackId || publication.subcategory || 'storytelling');
  }
  const paired = row => conditions.every(condition => finite(row?.[condition]?.exactScore));
  const activeBenchmarkIds = [...publications.keys()].filter(id => [...rows.get(id).values()].some(paired));
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
        return { category: group, exactScore, exactContribution: exactScore === null ? null : exactScore / groupIds.length };
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
  return { publications, entries, benchmarkIds: [...publications.keys()], activeBenchmarkIds, groupIds, benchmarkWeights, settingIds: [...settings.values()], completeSettings,
    unscoredSettings: settings.size - completeSettings,
    tiedRankEntries: entries.filter(entry => finite(entry.exactScore) && entries.some(other => other.id !== entry.id && other.condition === entry.condition && other.exactScore === entry.exactScore)).length,
    regressionSettings: entries.filter(entry => entry.condition === 'skill' && finite(entry.exactDelta) && entry.exactDelta < 0).length, efficiencyEvidence };
}

export function verifyCandidateCategoryProjection(actual, expected) {
  const method = 'equal-active-subcategory-equal-active-benchmark-complete-paired-index-v1';
  assert.equal(actual.writingCategory.method, method, 'Candidate uses another category weighting method.');
  sameIds(actual.benchmarks.map(item => item.id), expected.benchmarkIds, 'Candidate category benchmark inventory');
  sameIds(actual.writingCategory.activeBenchmarkIds, expected.activeBenchmarkIds, 'Candidate active cohort');
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
      close(reading.exactContribution, group.exactContribution, 'Group exact contribution');
    }
  }
  return expected;
}

export function verifyWritingProofEvidence(proof, expected) {
  const publication = expected.publications.get(proof.benchmarkId);
  assert.ok(publication, 'Writing proof does not correspond to a candidate publication.');
  exact(proof.coverage, publication.coverage, `Report coverage changed: ${proof.benchmarkId}`);
  assert.equal(proof.trialCount, publication.trialCount || 1, 'Report trial count changed.');
  const category = proof.categoryEvidence;
  assert.ok(category && Array.isArray(category.mismatches) && !category.mismatches.length, 'Category arithmetic proof missing or failed.');
  for (const key of ['benchmarkIds', 'activeBenchmarkIds', 'groupIds', 'settingIds']) sameIds(category[key], expected[key], `Category ${key}`);
  for (const key of ['completeSettings', 'unscoredSettings', 'tiedRankEntries', 'regressionSettings']) {
    assert.equal(category[key], expected[key], `Category ${key}`);
    assert.equal(proof.scoredBranchCoverage?.[key], expected[key], `Scored branch category ${key}`);
  }
  for (const key of ['rawUnchanged', 'noPicker', 'tabsImmediatelyAfterHeader', 'answersLazy', 'disclosure']) assert.equal(category[key], true, `Category ${key}`);
  assert.equal(category.hash, '#capabilities/writing', 'Category route changed.');
  exact(category.efficiencyEvidence, expected.efficiencyEvidence, 'Category efficiency point and frontier evidence');
  exact(proof.scoredBranchCoverage.efficiency, expected.efficiencyEvidence, 'Scored branch efficiency evidence');
  assert.ok(Array.isArray(category.visibleSettingIds) && new Set(category.visibleSettingIds).size === category.visibleSettingIds.length, 'Category visible setting inventory is missing or duplicated.');
  assert.ok(category.visibleSettingIds.every(id => expected.entries.some(entry => entry.settingId === id && entry.condition === 'skill' && finite(entry.exactScore))), 'Category ranks an incomplete setting.');
  if (proof.benchmarkId === 'storytelling-plot-twists') {
    const coverage = publication.coverage;
    for (const [field, value] of Object.entries({ responseCount: 80, expectedResponseCount: 80, validResponseCount: 78, scoredResponseCount: 76, judgmentCount: 152, expectedJudgmentCount: 160, terminalGenerationFailureCount: 2, terminallyExcludedPairCount: 2, terminallyExcludedJudgmentCount: 8, pendingGenerationCount: 0, pendingJudgmentCount: 0, completedSettingCount: 2 })) assert.equal(coverage[field], value, `Frozen Plot twists ${field}`);
    assert.equal(coverage.executionStatus, 'complete-with-exclusions', 'Frozen Plot twists execution status');
    assert.equal(coverage.executionComplete, true, 'Frozen Plot twists execution completeness');
    assert.equal(proof.scoredBranchCoverage.required, true, 'Plot twists scored QA was not required.');
  }
  return { benchmarkId: proof.benchmarkId, completeSettings: expected.completeSettings, reportCompletedSettings: publication.coverage.completedSettingCount };
}
