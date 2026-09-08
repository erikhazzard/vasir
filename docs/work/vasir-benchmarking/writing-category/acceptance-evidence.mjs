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
  const partialSettings = entries.filter(entry => entry.condition === 'skill' && !finite(entry.exactScore) && entry.categories.some(group => finite(group.exactScore))).map(entry => ({
    settingId: entry.settingId, configurationId: entry.configurationId,
    knownGroupIds: entry.categories.filter(group => finite(group.exactScore)).map(group => group.category),
    missingGroupIds: entry.categories.filter(group => !finite(group.exactScore)).map(group => group.category),
    baseline: entries.find(other => other.configurationId === entry.configurationId && other.condition === 'baseline'), skill: entry
  }));
  const efficiencyEvidence = ['latency', 'tokens'].map(metric => {
    const eligible = entries.filter(entry => finite(entry.score) && finite(entry[metric]) && entry[metric] > 0);
    const frontier = eligible.filter(entry => !eligible.some(other => other.score >= entry.score && other[metric] <= entry[metric] && (other.score > entry.score || other[metric] < entry[metric])));
    return { metric, eligiblePoints: eligible.length, frontierPoints: frontier.length, mismatches: [] };
  });
  return { publications, entries, benchmarkIds: [...publications.keys()], activeBenchmarkIds, groupIds, benchmarkWeights, settingIds: [...settings.values()], completeSettings, partialSettings,
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
      close(reading.score, group.score, 'Group rounded score');
      close(reading.weight, group.weight, 'Group fixed weight');
      close(reading.exactContribution, group.exactContribution, 'Group exact contribution');
    }
  }
  return expected;
}

// Provisional means belong to their source benchmark, not the category index.
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

export function verifyWritingProofEvidence(proof, expected) {
  const publication = expected.publications.get(proof.benchmarkId);
  assert.ok(publication, 'Writing proof does not correspond to a candidate publication.');
  exact(proof.coverage, publication.coverage, `Report coverage changed: ${proof.benchmarkId}`);
  const isDungeonMaster = proof.benchmarkId === 'dungeon-master-adventure-outline';
  assert.equal(isDungeonMaster && proof.trialCount === undefined ? 1 : proof.trialCount, publication.trialCount || 1, 'Report trial count changed.');
  const category = proof.categoryEvidence;
  assert.ok(category && Array.isArray(category.mismatches) && !category.mismatches.length, 'Category arithmetic proof missing or failed.');
  for (const key of ['benchmarkIds', 'activeBenchmarkIds', 'groupIds', 'settingIds']) sameIds(category[key], expected[key], `Category ${key}`);
  for (const key of ['completeSettings', 'unscoredSettings', 'tiedRankEntries', 'regressionSettings']) {
    assert.equal(category[key], expected[key], `Category ${key}`);
    if (!isDungeonMaster) assert.equal(proof.scoredBranchCoverage?.[key], expected[key], `Scored branch category ${key}`);
  }
  for (const key of ['rawUnchanged', 'noPicker', 'tabsImmediatelyAfterHeader', 'answersLazy', 'disclosure']) assert.equal(category[key], true, `Category ${key}`);
  assert.equal(category.hash, '#capabilities/writing', 'Category route changed.');
  exact(category.efficiencyEvidence, expected.efficiencyEvidence, 'Category efficiency point and frontier evidence');
  if (!isDungeonMaster) exact(proof.scoredBranchCoverage.efficiency, expected.efficiencyEvidence, 'Scored branch efficiency evidence');
  assert.ok(Array.isArray(category.visibleSettingIds) && new Set(category.visibleSettingIds).size === category.visibleSettingIds.length, 'Category visible setting inventory is missing or duplicated.');
  assert.ok(category.visibleSettingIds.every(id => expected.entries.some(entry => entry.settingId === id && entry.condition === 'skill' && finite(entry.exactScore))), 'Category ranks an incomplete setting.');
  if (expected.partialSettings.length || category.partialEvidence) {
    const partial = category.partialEvidence;
    assert.ok(partial && Array.isArray(partial.rows), 'Unranked partial subgroup evidence is missing.');
    sameIds(partial.settingIds, expected.partialSettings.map(item => item.settingId), 'Partial setting inventory');
    sameIds(partial.rows.map(item => item.settingId), expected.partialSettings.map(item => item.settingId), 'Partial row inventory');
    exact(partial.mismatches, [], 'Partial subgroup display, navigation or arithmetic failed');
    for (const wanted of expected.partialSettings) {
      const row = partial.rows.find(item => item.settingId === wanted.settingId);
      for (const field of ['total', 'rank', 'delta']) assert.equal(row[field], null, `Partial row has an invented category ${field}`);
      for (const condition of conditions) {
        assert.ok(Array.isArray(row[condition]), 'Partial condition segment evidence missing.');
        sameIds(row[condition].map(group => group.groupId), expected.groupIds, 'Partial group slot inventory');
        for (const group of wanted[condition].categories) {
          const observed = row[condition].find(item => item.groupId === group.category);
          assert.equal(observed.available, finite(group.exactScore), 'Partial group availability changed.');
          close(observed.weight, group.weight, 'Partial group fixed weight changed');
          close(observed.rawScore, group.score, 'Partial group displayed raw score changed');
          close(observed.exactScore, group.exactScore, 'Partial group raw exact score changed');
          close(observed.contribution, group.exactContribution, 'Partial group known contribution changed or unavailable group became zero');
        }
      }
    }
  }
  const provisionalIds = [...expected.publications].filter(([, publication]) => publication.provisionalLeaderboard).map(([id]) => id);
  const displays = category.provisionalDisplayEvidence || [];
  const archives = proof.provisionalArchiveEvidence || [];
  sameIds(displays.map(item => item.benchmarkId), provisionalIds, 'Provisional display proof inventory');
  sameIds(archives.map(item => item.benchmarkId), provisionalIds, 'Provisional original-review proof inventory');
  if (provisionalIds.length) {
    assert.ok(Array.isArray(expected.provisionalEvidence), 'Acceptance did not verify the candidate original provisional reviews.');
    sameIds(expected.provisionalEvidence.map(item => item.benchmarkId), provisionalIds, 'Independently derived provisional inventory');
    for (const original of expected.provisionalEvidence) {
      const display = displays.find(item => item.benchmarkId === original.benchmarkId);
      const archive = archives.find(item => item.benchmarkId === original.benchmarkId);
      for (const field of ['sourceSha256', 'rankedSettings', 'incompleteSettings']) {
        assert.equal(display[field], original[field], `Provisional display ${field}`);
        assert.equal(archive[field], original[field], `Provisional archived ${field}`);
      }
      exact(display.judgeConfigurationIds, [original.judgeConfigurationId], 'Provisional display fixed judge');
      assert.equal(archive.judgeConfigurationId, original.judgeConfigurationId, 'Provisional archived fixed judge.');
      assert.equal(archive.reviewedAnswers, original.reviewedAnswers, 'Provisional original reviewed-answer count.');
      sameIds(display.activeBenchmarkIds, expected.activeBenchmarkIds, 'Provisional display contaminated the primary category index');
      exact(display.mismatches, [], 'Provisional DOM scores, ranks, placement or diagnostics failed');
      exact(archive.mismatches, [], 'Provisional original-review arithmetic failed');
    }
  }
  if (proof.benchmarkId === 'storytelling-plot-twists') {
    const coverage = publication.coverage;
    for (const [field, value] of Object.entries({ responseCount: 80, expectedResponseCount: 80, validResponseCount: 78, scoredResponseCount: 76, judgmentCount: 152, expectedJudgmentCount: 160, terminalGenerationFailureCount: 2, terminallyExcludedPairCount: 2, terminallyExcludedJudgmentCount: 8, pendingGenerationCount: 0, pendingJudgmentCount: 0, completedSettingCount: 2 })) assert.equal(coverage[field], value, `Frozen Plot twists ${field}`);
    assert.equal(coverage.executionStatus, 'complete-with-exclusions', 'Frozen Plot twists execution status');
    assert.equal(coverage.executionComplete, true, 'Frozen Plot twists execution completeness');
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
  return { benchmarkId: proof.benchmarkId, completeSettings: expected.completeSettings, reportCompletedSettings: publication.coverage.completedSettingCount };
}
