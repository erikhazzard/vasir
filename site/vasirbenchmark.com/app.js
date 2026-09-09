// A display index over published benchmark totals, never a replacement for a
// benchmark's own rubric, declared cohort, exclusions, or report archive.
function buildWritingCategoryCollection(collection, selectionId = 'storytelling') {
  if (!collection) return null;
  const clone = value => JSON.parse(JSON.stringify(value));
  const finite = Number.isFinite;
  // Display only: equivalent mean formulas can straddle a half-tenth by a
  // floating-point ULP. Keep exact scores/ranks untouched; stabilize that tie.
  const round = value => finite(value) ? Math.round((value + 2 * Number.EPSILON * Math.max(1, Math.abs(value))) * 10) / 10 : null;
  const conditionIds = ['baseline', 'skill'];
  const publications = [];
  const seen = new Set();
  const declaredCatalog = new Map((collection.catalog || []).map(item => [item.id, item]));
  const writingScoreBasis = collection.writingScoreBasis || null;
  const publishedStorytelling = collection.publicRelease?.id === 'writing-storytelling-public-v1';
  const visit = source => {
    if (!source) return;
    const id = source.benchmarks?.[0]?.id;
    if (id && !seen.has(id)) {
      const descriptor = declaredCatalog.get(id) || source.benchmarks[0].publication;
      if (descriptor?.status === 'unscored' || descriptor?.status === 'planned') return;
      if (source.benchmarks[0].publication?.adapter === 'writing-compact-v1') {
        const entries = source.entries || [];
        if (!entries.some(entry => entry.condition === 'skill' && finite(entry.exactScore) && entry.eligibleForRank !== false
          && entries.some(pair => (pair.configurationId || pair.settingId) === (entry.configurationId || entry.settingId)
            && pair.condition === 'baseline' && finite(pair.exactScore) && pair.eligibleForRank !== false))) return;
      }
      seen.add(id);
      const { benchmarkPublications, additionalBenchmarks, compactBenchmarks, catalog, catalogCoverage, writingScoreBasis, collectionCoverage, allWritingCoverage, ...publication } = source;
      publications.push(clone(publication));
    }
    for (const child of source.benchmarkPublications || []) visit(child.projection);
    for (const child of Object.values(source.additionalBenchmarks || {})) visit(child);
    for (const child of Object.values(source.compactBenchmarks || {})) visit(child);
  };
  visit(collection);
  if (!publications.length) return null;
  const identityFor = (entry, publication) => entry.configurationId
    || publication.settings?.find(setting => setting.id === (entry.settingId || entry.id))?.configurationId
    || entry.settingId || entry.id;
  const pairsFor = (entries, publication) => {
    const rows = new Map();
    for (const entry of entries || []) {
      const identity = identityFor(entry, publication);
      if (!rows.has(identity)) rows.set(identity, {});
      rows.get(identity)[entry.condition] = entry;
    }
    return rows;
  };
  const countsComplete = (object, expected, completed) => !finite(object?.[expected])
    || finite(object?.[completed]) && object[completed] === object[expected];
  const entryComplete = entry => finite(entry?.exactScore) && entry.eligibleForRank !== false
    && countsComplete(entry, 'expectedPairCount', 'completedPairCount')
    && countsComplete(entry.coverage, 'expectedCases', 'scoredCases')
    && countsComplete(entry.coverage, 'expectedResponses', 'completedResponses')
    && countsComplete(entry.coverage, 'expectedJudgments', 'completedJudgments');
  const pairComplete = pair => conditionIds.every(condition => entryComplete(pair?.[condition]));
  // Choose one published score basis for a whole benchmark. A setting cannot
  // fall back to a different judge panel when its chosen-basis pair is missing.
  const readinessPolicy = 'complete-published-pairs-uniform-benchmark-basis';
  const executionComplete = publication => {
    const coverage = publication.coverage || {};
    if (typeof coverage.executionComplete === 'boolean') return coverage.executionComplete;
    if (typeof coverage.executionStatus === 'string') return ['complete', 'complete-with-exclusions'].includes(coverage.executionStatus);
    const generationComplete = finite(coverage.expectedResponseCount) && (
      coverage.responseCount === coverage.expectedResponseCount
      || finite(coverage.validResponseCount) && finite(coverage.terminalGenerationFailureCount)
        && coverage.validResponseCount + coverage.terminalGenerationFailureCount === coverage.expectedResponseCount);
    return generationComplete && finite(coverage.judgmentCount) && finite(coverage.expectedJudgmentCount)
      && coverage.judgmentCount + (coverage.terminallyExcludedJudgmentCount || 0) === coverage.expectedJudgmentCount;
  };
  const sources = publications.map(publication => {
    const benchmark = publication.benchmarks[0];
    const configurationIds = [...new Set((publication.settings || []).map(setting => identityFor(setting, publication)))].sort();
    const officialPairs = pairsFor(publication.entries, publication);
    const provisionalPairs = pairsFor(publication.provisionalLeaderboard?.status === 'provisional' ? publication.provisionalLeaderboard.entries : [], publication);
    const officialSettingCount = configurationIds.filter(identity => pairComplete(officialPairs.get(identity))).length;
    const provisionalSettingCount = configurationIds.filter(identity => pairComplete(provisionalPairs.get(identity))).length;
    const pinnedProvisional = benchmark.id === 'storytelling-core-idea' && writingScoreBasis?.coreIdeaScoring === 'published-single-judge-provisional';
    const type = pinnedProvisional ? provisionalSettingCount ? 'provisional' : 'unavailable'
      : officialSettingCount ? 'official' : provisionalSettingCount ? 'provisional' : 'unavailable';
    const provisional = type === 'provisional';
    const sourceBasis = provisional || pinnedProvisional ? publication.provisionalLeaderboard : publication.scoreBasis;
    const judgeCount = sourceBasis?.judgeCount ?? null;
    const label = type === 'unavailable' ? 'Complete published scores unavailable'
      : `${provisional ? 'Provisional' : 'Official'}${judgeCount ? ` · ${judgeCount} ${provisional ? judgeCount === 1 ? 'judge' : 'judges' : 'reviews per answer'}` : ''}${provisional && sourceBasis?.label ? ` · ${sourceBasis.label}` : ''}`;
    const basis = { id: sourceBasis?.id || `${benchmark.id}:${sourceBasis?.method || type}`, type, label, method: sourceBasis?.method || null, judgeCount, provisional, sourceLabel: sourceBasis?.label || null };
    return { benchmarkId: benchmark.id, name: benchmark.name || benchmark.title || benchmark.id, configurationIds, basis,
      pairs: provisional || pinnedProvisional ? provisionalPairs : officialPairs, officialSettingCount, provisionalSettingCount,
      completedSettingCount: provisional || pinnedProvisional ? provisionalSettingCount : officialSettingCount, executionComplete: executionComplete(publication) };
  });
  const sourceMap = new Map(sources.map(source => [source.benchmarkId, source]));
  if (writingScoreBasis && (!writingScoreBasis.benchmarkIds?.length
    || writingScoreBasis.benchmarkIds.some(id => !sourceMap.has(id)))) return null;
  const catalog = publications.map(publication => {
    const benchmark = publication.benchmarks[0];
    const metadata = { ...benchmark.publication, ...declaredCatalog.get(benchmark.id) };
    return { ...metadata, id: benchmark.id, name: metadata.name || benchmark.name || benchmark.title || benchmark.id,
      trackId: metadata.trackId || benchmark.trackId || publication.subcategory || 'storytelling',
      detailHref: metadata.detailHref || publication.benchmarkSummaries?.[0]?.detailHref,
      archived: metadata.archived === true || metadata.archive === true,
      scoreBasisIncluded: writingScoreBasis ? writingScoreBasis.benchmarkIds.includes(benchmark.id) : metadata.scoreBasisIncluded !== false };
  });
  const catalogById = new Map(catalog.map(item => [item.id, item]));
  const scoreBenchmarkIds = writingScoreBasis ? [...writingScoreBasis.benchmarkIds] : sources.map(source => source.benchmarkId);
  const pairs = new Map(sources.map(source => [source.benchmarkId, source.pairs]));
  const availableOfficialBenchmarkIds = sources.filter(source => source.officialSettingCount > 0).map(source => source.benchmarkId);
  const groupMap = new Map();
  const palette = ['var(--category-writing)', '#7445ff', '#00839a', '#08703d'];
  for (const publication of publications) {
    const benchmark = publication.benchmarks[0];
    const id = benchmark.trackId || publication.subcategory || 'storytelling';
    if (!groupMap.has(id)) {
      const title = publication.tracks?.find(track => track.id === id)?.title || benchmark.suite || id;
      groupMap.set(id, { id, name: title, title, short: id === 'storytelling' ? 'STORY' : id === 'dungeon-master' ? 'DM' : title.slice(0, 5).toUpperCase(), color: palette[groupMap.size % palette.length], benchmarkIds: [], activeBenchmarkIds: [], weight: 0, active: false });
    }
    const group = groupMap.get(id);
    group.benchmarkIds.push(benchmark.id);
  }
  const groups = [...groupMap.values()];
  const allSelections = [
    { id: 'all-writing', type: 'category', title: 'All Writing', benchmarkIds: scoreBenchmarkIds },
    ...groups.flatMap(group => [
    { id: group.id, type: 'track', title: group.title,
      archived: group.benchmarkIds.every(id => catalogById.get(id).archived),
      benchmarkIds: writingScoreBasis && group.benchmarkIds.some(id => scoreBenchmarkIds.includes(id))
        ? group.benchmarkIds.filter(id => scoreBenchmarkIds.includes(id))
        : group.benchmarkIds.filter(id => !catalogById.get(id).archived).length
          ? group.benchmarkIds.filter(id => !catalogById.get(id).archived) : [...group.benchmarkIds] },
    ...group.benchmarkIds.map(id => ({ id, type: 'benchmark', title: sourceMap.get(id).name,
      archived: catalogById.get(id).archived, benchmarkIds: [id] }))
    ])
  ].map(option => {
    const selectedSources = option.benchmarkIds.map(id => sourceMap.get(id));
    const declaredIds = [...new Set(selectedSources.flatMap(source => source.configurationIds))].sort();
    const provisional = selectedSources.some(source => source.basis.provisional);
    const completedSettingCount = declaredIds.filter(identity => selectedSources.every(source => pairComplete(source.pairs.get(identity)))).length;
    const rankedSettingCount = completedSettingCount;
    const partialSettingCount = declaredIds.filter(identity => selectedSources.some(source => pairComplete(source.pairs.get(identity)))).length - completedSettingCount;
    return { ...option, provisional, declaredSettingCount: declaredIds.length, completedSettingCount, rankedSettingCount,
      partialSettingCount, hasPartialScores: partialSettingCount > 0, partial: partialSettingCount > 0,
      scoreBasisLabel: option.type === 'category'
        ? `All Writing · ${writingScoreBasis ? writingScoreBasis.id + ' · equal-benchmark mean' : 'equal-track mean'}${provisional ? ' · provisional' : ''}`
        : option.type === 'track'
        ? `${option.title} · equal-weight benchmark mean${provisional ? ' · provisional' : ''}`
        : `${option.title} · ${selectedSources[0].basis.label}` };
  });
  const selections = allSelections.filter(option => writingScoreBasis || option.type !== 'benchmark'
    || groups.find(group => group.benchmarkIds.includes(option.id)).benchmarkIds.length > 1)
    .sort((left, right) => Number(Boolean(left.archived)) - Number(Boolean(right.archived)));
  const requestedSelection = allSelections.find(option => option.id === selectionId)
    || allSelections.find(option => option.id === 'storytelling') || allSelections[0];
  const selection = selections.find(option => option.id === requestedSelection.id)
    || selections.find(option => option.type === 'track' && option.benchmarkIds.length === 1 && option.benchmarkIds[0] === requestedSelection.id);
  const activeBenchmarkIds = [...selection.benchmarkIds];
  const comparisonBenchmarkNames = activeBenchmarkIds.map(id => sourceMap.get(id).name);
  const comparisonLabel = comparisonBenchmarkNames.join(' + ');
  const declaredConfigurationIds = [...new Set(activeBenchmarkIds.flatMap(id => sourceMap.get(id).configurationIds))].sort();
  const declaredRosterBenchmarkId = selection.type === 'benchmark' ? selection.id : null;
  const declaredRosterSelection = 'selected-benchmark-union';
  const sourceCoverage = sources.map(source => ({ benchmarkId: source.benchmarkId,
    plannedSettingCount: source.configurationIds.length, completedSettingCount: source.completedSettingCount,
    officialSettingCount: source.officialSettingCount, provisionalSettingCount: source.provisionalSettingCount,
    matchesDeclaredRoster: declaredConfigurationIds.every(identity => source.configurationIds.includes(identity)),
    executionComplete: source.executionComplete, readyForComparison: source.completedSettingCount > 0,
    selected: activeBenchmarkIds.includes(source.benchmarkId), included: activeBenchmarkIds.includes(source.benchmarkId), basis: source.basis,
    exclusionReason: !activeBenchmarkIds.includes(source.benchmarkId) ? 'outside-selected-score' : source.completedSettingCount ? null : 'complete-published-scores-unavailable' }));
  for (const group of groups) group.activeBenchmarkIds = group.benchmarkIds.filter(id => activeBenchmarkIds.includes(id));
  const activeGroups = groups.filter(group => group.activeBenchmarkIds.length);
  const benchmarkWeights = Object.fromEntries(activeBenchmarkIds.map(id => [id, selection.type === 'category' && !writingScoreBasis
    ? 1 / activeGroups.length / activeGroups.find(group => group.activeBenchmarkIds.includes(id)).activeBenchmarkIds.length
    : 1 / activeBenchmarkIds.length]));
  for (const group of activeGroups) {
    group.active = true;
    group.weight = group.activeBenchmarkIds.reduce((sum, id) => sum + benchmarkWeights[id], 0);
  }
  const identityMap = new Map();
  for (const publication of publications) for (const setting of publication.settings || []) {
    const identity = identityFor(setting, publication);
    if (!identityMap.has(identity)) identityMap.set(identity, setting);
  }
  const metricNames = [...new Set(publications.flatMap(publication => [...(publication.entries || []), ...(publication.provisionalLeaderboard?.entries || [])].flatMap(entry => Object.keys(entry.metrics || {}).filter(name => name !== 'costCoverage'))))];
  const weighted = values => values.length && values.every(item => finite(item.value)) ? values.reduce((sum, item) => sum + item.value * item.weight, 0) : null;
  const entries = [];
  const coverageRecords = [];
  const settings = [...identityMap].map(([identity, source]) => {
    const missingBenchmarkIds = activeBenchmarkIds.filter(id => !pairComplete(pairs.get(id).get(identity)));
    const availableBenchmarkIds = activeBenchmarkIds.filter(id => !missingBenchmarkIds.includes(id));
    const unavailableBenchmarkIds = activeBenchmarkIds.filter(id => !sourceMap.get(id).configurationIds.includes(identity));
    const complete = activeBenchmarkIds.length > 0 && missingBenchmarkIds.length === 0;
    const sourceCount = availableBenchmarkIds.length;
    const eligibleForRank = complete;
    const partial = sourceCount > 0 && !complete;
    const provisional = availableBenchmarkIds.some(id => sourceMap.get(id).basis.provisional);
    const availableWeight = availableBenchmarkIds.reduce((sum, id) => sum + benchmarkWeights[id], 0);
    const settingBenchmarkWeights = Object.fromEntries(activeBenchmarkIds.map(id => [id, availableBenchmarkIds.includes(id) ? benchmarkWeights[id] / availableWeight : 0]));
    const coverageRecord = { settingId: source.id, configurationId: identity, complete, eligibleForRank, partial, sourceCount,
      availableBenchmarkIds, missingBenchmarkIds, unavailableBenchmarkIds, benchmarkWeights: settingBenchmarkWeights,
      expectedBenchmarks: activeBenchmarkIds.length, completedBenchmarks: sourceCount };
    coverageRecords.push(coverageRecord);
    const benchmarkComponents = Object.fromEntries(conditionIds.map(condition => [condition, activeBenchmarkIds.map(id => {
      const benchmarkSource = sourceMap.get(id);
      const pair = pairs.get(id).get(identity);
      const complete = pairComplete(pair);
      const exactScore = complete ? pair[condition].exactScore : null;
      return { benchmarkId: id, name: benchmarkSource.name, condition, complete, exactScore, score: round(exactScore),
        weight: settingBenchmarkWeights[id], exactContribution: finite(exactScore) ? exactScore * settingBenchmarkWeights[id] : null,
        basis: benchmarkSource.basis, provisional: benchmarkSource.basis.provisional };
    })]));
    const readings = Object.fromEntries(conditionIds.map(condition => [condition, groups.map(group => {
      const groupAvailableIds = group.activeBenchmarkIds.filter(id => availableBenchmarkIds.includes(id));
      const weight = groupAvailableIds.reduce((sum, id) => sum + settingBenchmarkWeights[id], 0);
      const exactScore = weighted(groupAvailableIds.map(id => ({ value: pairs.get(id).get(identity)[condition].exactScore, weight: 1 / groupAvailableIds.length })));
      return { category: group.id, score: round(exactScore), exactScore, exactContribution: finite(exactScore) ? exactScore * weight : null, weight,
        benchmarkIds: [...group.activeBenchmarkIds], availableBenchmarkIds: groupAvailableIds, partial: groupAvailableIds.length > 0 && groupAvailableIds.length < group.activeBenchmarkIds.length };
    })]));
    const scores = Object.fromEntries(conditionIds.map(condition => [condition, weighted(availableBenchmarkIds.map(id => ({ value: pairs.get(id).get(identity)[condition].exactScore, weight: settingBenchmarkWeights[id] })))]));
    const metrics = Object.fromEntries(conditionIds.map(condition => [condition, {
      ...Object.fromEntries(metricNames.map(name => [name, weighted(availableBenchmarkIds.map(id => ({ value: pairs.get(id).get(identity)[condition].metrics?.[name], weight: settingBenchmarkWeights[id] })))])),
      costCoverage: 'not-comparable'
    }]));
    const exactDelta = sourceCount > 0 ? scores.skill - scores.baseline : null;
    const setting = { ...clone(source), configurationId: identity, scores: { baseline: round(scores.baseline), skill: round(scores.skill) }, exactScores: scores, deltas: { skill: round(exactDelta) }, exactDelta,
      eligibleForRank, complete, partial, provisional, sourceCount, availableBenchmarkIds, missingBenchmarkIds,
      benchmarkWeights: settingBenchmarkWeights, benchmarkComponents, metrics, categories: readings, coverage: Object.fromEntries(conditionIds.map(condition => [condition, { ...coverageRecord }])) };
    for (const condition of conditionIds) {
      entries.push({ id: `${source.id}-${condition}`, settingId: source.id, configurationId: identity, modelId: source.modelId, provider: source.provider, family: source.family, reasoning: source.reasoning, label: source.label, condition, conditionLabel: condition === 'skill' ? 'Task-specific skill' : 'Plain answer', score: round(scores[condition]), exactScore: scores[condition], baselineScore: round(scores.baseline), exactBaselineScore: scores.baseline, delta: eligibleForRank ? condition === 'baseline' ? 0 : round(exactDelta) : null, exactDelta: eligibleForRank ? condition === 'baseline' ? 0 : exactDelta : null,
        eligibleForRank, complete, partial, provisional, sourceCount, availableBenchmarkIds, missingBenchmarkIds, benchmarkWeights: settingBenchmarkWeights,
        benchmarkComponents: benchmarkComponents[condition], baselineBenchmarkComponents: benchmarkComponents.baseline, categories: readings[condition], baselineCategories: readings.baseline, metrics: metrics[condition], cost: metrics[condition].meanCostUsd ?? null, latency: finite(metrics[condition].meanLatencyMs) ? metrics[condition].meanLatencyMs / 1000 : null, tokens: metrics[condition].meanOutputTokens ?? null, coverage: { ...coverageRecord }, rank: null });
    }
    return setting;
  });
  for (const entry of entries) {
    if (entry.sourceCount > 0) {
      entry.exactDelta = entry.condition === 'baseline' ? 0 : settings.find(setting => setting.id === entry.settingId).exactDelta;
      entry.delta = round(entry.exactDelta);
    }
    if (entry.eligibleForRank && finite(entry.exactScore)) entry.rank = 1 + entries.filter(other => other.eligibleForRank && other.condition === entry.condition && finite(other.exactScore) && other.exactScore > entry.exactScore).length;
  }
  const benchmarks = publications.flatMap(publication => publication.benchmarks);
  const flatten = key => publications.flatMap(publication => (publication[key] || []).map(item => ({ ...item, benchmarkId: item.benchmarkId || publication.benchmarks[0].id })));
  const coverage = { benchmarkCount: benchmarks.length, activeBenchmarkCount: activeBenchmarkIds.length, availableOfficialBenchmarkCount: availableOfficialBenchmarkIds.length, declaredSettingCount: declaredConfigurationIds.length, groupCount: groups.length, activeGroupCount: activeGroups.length, settingCount: settings.length, completedSettingCount: coverageRecords.filter(record => record.complete).length, benchmarkSettingCount: publications.reduce((sum, publication) => sum + (publication.coverage?.settingCount || 0), 0) };
  coverage.rankedSettingCount = coverageRecords.filter(record => record.eligibleForRank).length;
  coverage.partialSettingCount = coverageRecords.filter(record => record.partial).length;
  coverage.unrankedSettingCount = settings.length - coverage.rankedSettingCount;
  for (const field of ['caseCount', 'responseCount', 'expectedResponseCount', 'scoredResponseCount', 'usablePairs', 'expectedPairs', 'judgmentCount', 'expectedJudgmentCount', 'terminalGenerationFailureCount', 'terminallyExcludedPairCount', 'terminallyExcludedJudgmentCount']) coverage[field] = publications.reduce((sum, publication) => sum + (publication.coverage?.[field] || 0), 0);
  coverage.executionComplete = publications.every(executionComplete);
  coverage.executionStatus = coverage.executionComplete ? coverage.terminallyExcludedPairCount ? 'complete-with-exclusions' : 'complete' : 'in-progress';
  coverage.pendingJudgmentCount = Math.max(0, coverage.expectedJudgmentCount - coverage.judgmentCount - coverage.terminallyExcludedJudgmentCount);
  const method = writingScoreBasis ? 'versioned-common-benchmark-ranking-v6' : 'common-benchmark-ranking-with-visible-partials-v5';
  const sourceBases = activeBenchmarkIds.map(id => ({ benchmarkId: id, name: sourceMap.get(id).name, weight: benchmarkWeights[id], ...sourceMap.get(id).basis }));
  const panelMethod = (publishedStorytelling
    ? `All Writing and Storytelling average ${scoreBenchmarkIds.map(id => sourceMap.get(id).name).join(', ')} with equal benchmark weights. `
    : writingScoreBasis
    ? `All Writing uses the fixed ${writingScoreBasis.id} score basis: ${scoreBenchmarkIds.map(id => sourceMap.get(id).name).join(', ')}, equally weighted. Newly listed tests and past editions do not change this basis. Track aggregates use their established basis where available. `
    : 'All Writing averages tracks equally, with equal benchmark weights within each track. Track scores average their own benchmarks equally. ')
    + 'Ranked settings require complete paired totals for every selected benchmark: the same tests, fixed weights and one published basis per benchmark. Incomplete available-score means normalize those fixed weights over available tests, but have no rank and cannot determine leaders, headline statistics or efficiency comparisons. Missing scores are never zero. Both conditions use the same available tests; resources use those weights, with missing resource values unknown. '
    + (writingScoreBasis?.coreIdeaScoring === 'published-single-judge-provisional'
      ? 'Core idea remains on its pinned published single-judge basis. Other benchmarks use official pairs when available, otherwise their published provisional basis. '
      : 'Each benchmark uses official pairs when available, otherwise its published provisional basis. ')
    + 'Individual models never switch judge panels. Scores inherit provisional status from contributing sources. Original rubrics, trials, exclusions and evidence are unchanged. Different rubrics and panels remain uncalibrated.';
  const conditions = [{ id: 'baseline', label: 'Plain answer', short: 'Plain' }, { id: 'skill', label: 'Task-specific skill', short: 'Skill' }];
  const categoryLeaders = activeGroups.flatMap(group => {
    const eligible = entries.filter(entry => entry.eligibleForRank && entry.condition === 'skill' && finite(entry.exactScore)).sort((a, b) => b.categories.find(item => item.category === group.id).exactScore - a.categories.find(item => item.category === group.id).exactScore);
    return eligible.length ? [{ category: group.id, entry: { ...eligible[0], categoryScore: eligible[0].categories.find(item => item.category === group.id).score } }] : [];
  });
  return {
    kind: 'vasirbenchmark-writing-category-display', schemaVersion: 1,
    program: clone(publications[0].program || {}),
    conditions, categories: activeGroups.length ? activeGroups : groups,
    families: [{ id: 'writing', title: 'Writing', description: 'Track aggregates and individual published writing benchmarks.', trackIds: groups.map(group => group.id) }],
    tracks: groups.map(group => ({ id: group.id, familyId: 'writing', title: group.title, benchmarkIds: group.benchmarkIds })),
    benchmarks, benchmarkSummaries: flatten('benchmarkSummaries'), benchmarkResults: flatten('benchmarkResults'), results: flatten('results'),
    settings, entries, cases: flatten('cases'), caseResults: flatten('caseResults'), caseSummaries: flatten('caseSummaries'), trialSummaries: flatten('trialSummaries'),
    meta: { release: publications[0].meta?.release, status: selection.provisional ? 'Provisional · uncalibrated development index' : 'Uncalibrated development index', categories: groups.length, benchmarks: benchmarks.length, settings: settings.length, conditions: 2, aggregateCells: entries.length, runs: publications.length, calibration: 0 },
    scoreBasis: { id: `${writingScoreBasis?.id || method}:${selection.id}`, label: selection.scoreBasisLabel, edition: writingScoreBasis?.id || 'Writing common-benchmark ranking v5', method, unit: 'rubric-points', range: { minimum: 0, maximum: 100 }, taskCount: activeBenchmarkIds.length, benchmarkIds: activeBenchmarkIds, comparisonBenchmarkNames, declaredConfigurationIds, declaredRosterBenchmarkId, declaredRosterSelection, readinessPolicy, benchmarkWeighting: selection.type === 'category' && !writingScoreBasis ? 'equal-tracks-equal-benchmarks' : 'equal-fixed-benchmarks-for-ranked-settings', subgroupWeighting: writingScoreBasis ? 'fixed-benchmark-basis' : selection.type === 'category' ? 'equal-selected-tracks' : 'selected-track-only', calibrationStatus: 'development-uncalibrated', provisional: selection.provisional, partial: selection.partial, selection, sources: sourceBases, coverage, panelMethod, sourceMethods: sourceBases.map(source => ({ benchmarkId: source.benchmarkId, label: source.label, method: source.method })) },
    coverage, categoryLeaders, efficientFrontier: [], regressions: entries.filter(entry => entry.eligibleForRank && entry.condition === 'skill' && finite(entry.exactDelta) && entry.exactDelta < 0),
    callouts: { overall: publishedStorytelling ? 'All Writing averages its three published Storytelling benchmarks equally.' : writingScoreBasis ? `All Writing uses the fixed ${writingScoreBasis.id} benchmark basis.` : 'All Writing combines its published track scores.', value: 'Quality and resources use the same available benchmark weights for each setting; missing resources are not imputed.' },
    methodology: { method, panelMethod, limitations: ['Scores describe the selected benchmarks, not a calibrated measure of general writing ability.', 'An asterisk marks an unranked available-score mean, not a comparable aggregate. Only settings covering every selected benchmark receive ranks.', writingScoreBasis?.coreIdeaScoring === 'published-single-judge-provisional' ? 'Scores inherit provisional status from their sources. Core idea stays on its pinned published single-judge basis; missing paired totals remain unranked.' : 'A score inherits provisional status from its included benchmark totals. When official pairs become available, that entire benchmark switches basis; unavailable official totals are omitted from each model’s mean.'] },
    writingCategory: { method, publications, catalog, writingScoreBasis, groups, selection, selections, activeBenchmarkIds, availableOfficialBenchmarkIds, comparisonBenchmarkIds: activeBenchmarkIds, comparisonBenchmarkNames, comparisonLabel, declaredConfigurationIds, declaredRosterBenchmarkId, declaredRosterSelection, readinessPolicy, sourceCoverage, benchmarkWeights, coverageRecords, completeSettingCount: coverage.completedSettingCount, rankedSettingCount: coverage.rankedSettingCount, partialSettingCount: coverage.partialSettingCount, totalSettingCount: settings.length }
  };
}

// A benchmark leader is a paired result: never splice the best baseline from
// one model onto the best skill score from another. Rank exact, complete scores.
function selectBenchmarkTopModel(settings, entries, { baselineConditionId = 'baseline', skillConditionId = 'skill' } = {}) {
  const aliases = new Map();
  for (const setting of settings || []) {
    for (const key of [setting.id, setting.configurationId]) if (key) aliases.set(key, setting);
  }
  const score = entry => Object.prototype.hasOwnProperty.call(entry || {}, 'exactScore') ? entry.exactScore : entry?.score;
  const countsComplete = object => [
    ['expectedPairCount', 'completedPairCount'], ['expectedCases', 'scoredCases'],
    ['expectedResponses', 'completedResponses'], ['expectedJudgments', 'completedJudgments']
  ].every(([expected, completed]) => !Number.isFinite(object?.[expected])
    || Number.isFinite(object?.[completed]) && object[expected] === object[completed]);
  const complete = entry => Number.isFinite(score(entry)) && entry.eligibleForRank !== false
    && entry.complete !== false && entry.partial !== true && countsComplete(entry) && countsComplete(entry.coverage);
  const pairs = new Map();
  for (const entry of entries || []) {
    if (![baselineConditionId, skillConditionId].includes(entry.condition)) continue;
    const setting = aliases.get(entry.configurationId) || aliases.get(entry.settingId);
    if (!setting) continue;
    const identity = setting.configurationId || setting.id;
    if (!pairs.has(identity)) pairs.set(identity, { setting, identity, arms: new Map(), duplicate: false });
    const pair = pairs.get(identity);
    if (pair.arms.has(entry.condition)) pair.duplicate = true;
    pair.arms.set(entry.condition, entry);
  }
  const candidates = [...pairs.values()].filter(pair => !pair.duplicate
    && complete(pair.arms.get(baselineConditionId)) && complete(pair.arms.get(skillConditionId)))
    .map(pair => ({ ...pair, baseline: score(pair.arms.get(baselineConditionId)), skill: score(pair.arms.get(skillConditionId)) }))
    .sort((left, right) => right.skill - left.skill || (left.identity < right.identity ? -1 : left.identity > right.identity ? 1 : 0));
  if (!candidates.length) return null;
  const { setting, baseline, skill } = candidates[0];
  return { settingId: setting.id, configurationId: setting.configurationId || setting.id,
    label: setting.label || [setting.family, setting.reasoning].filter(Boolean).join(' · ') || setting.id,
    family: setting.family, reasoning: setting.reasoning, baseline, skill, delta: skill - baseline,
    tiedCount: candidates.filter(candidate => candidate.skill === skill).length };
}

function buildWritingNavigationSummary(collection) {
  const category = buildWritingCategoryCollection(collection, 'all-writing');
  const leader = category?.entries.filter(entry => entry.eligibleForRank && entry.condition === 'skill' && Number.isFinite(entry.exactScore))
    .sort((left, right) => right.exactScore - left.exactScore)[0];
  return {
    method: category?.writingCategory.method ?? null,
    selectionId: 'all-writing',
    leader: leader ? { configurationId: leader.configurationId, score: leader.score, exactScore: leader.exactScore,
      partial: Boolean(leader.partial), provisional: Boolean(leader.provisional) } : null
  };
}

// Incomplete Overall settings still have useful category scores. Keep the
// original category weights and require a complete pair within each category;
// never turn the available subset into a ranked Overall total.
function buildOverallAvailableCategories(data, setting) {
  return data.categories.map(category => {
    const weights = data.scoreBasis.benchmarkWeights.filter(item => item.familyId === category.id);
    const cells = condition => weights.map(weight => data.benchmarkResults.find(cell =>
      cell.configurationId === setting.configurationId && cell.condition === condition && cell.benchmarkId === weight.benchmarkId));
    const value = (cell, index) => cell?.[weights[index].scoreField];
    const complete = weights.length > 0 && ['baseline', 'skill'].every(condition => cells(condition).every((cell, index) => Number.isFinite(value(cell, index))));
    const source = cells('skill').find(Boolean) || cells('baseline').find(Boolean);
    return { category, complete, expected: weights.length,
      available: weights.filter((_, index) => ['baseline', 'skill'].every(condition => Number.isFinite(value(cells(condition)[index], index)))).length,
      configurationId: source?.sourceConfigurationId || setting.configurationId,
      scores: Object.fromEntries(['baseline', 'skill'].map(condition => [condition, complete
        ? cells(condition).reduce((sum, cell, index) => sum + value(cell, index) * weights[index].weight / category.weight, 0)
        : null])) };
  });
}

(async function () {
  'use strict';

  const rootData = window.VASIR_DATA;
  const runtimeBase = document.currentScript?.src || window.location.href;
  const initialFragment = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  const writingSummary = rootData?.writing;
  const hasWriting = Boolean(writingSummary?.coverage?.caseCount && writingSummary?.benchmarkId);
  const publishedWritingBenchmarkCount = writingSummary?.catalog
    ? writingSummary.catalog.filter(item => !item.archived && item.status !== 'unscored' && item.status !== 'planned').length
    : new Set([writingSummary?.benchmarkId, ...(writingSummary?.benchmarks || []).map(benchmark => benchmark.id), ...Object.keys(writingSummary?.additionalBenchmarks || {})].filter(Boolean)).size;
  const requestedWritingBenchmark = new URLSearchParams(window.location.search).get('writing');
  const writingScoreRequest = new URLSearchParams(window.location.search).get('score')
    || (['storytelling', 'dungeon-master'].includes(initialFragment.split('/')[2]) ? initialFragment.split('/')[2] : 'all-writing');
  let writingData = window.VASIR_WRITING;
  if (hasWriting && initialFragment.split('/')[1] === 'writing' && !writingData) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL('./writing-data.js', runtimeBase).href;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      writingData = window.VASIR_WRITING;
      if (!writingData) throw new Error('Writing data unavailable');
    } catch {
      document.querySelector('#capability-view').innerHTML = '<section class="development-unavailable" role="alert"><p class="ui-eyebrow">Writing data unavailable</p><h2>RESULTS COULD NOT BE LOADED</h2><p>Reload to try again, or <a href="./index.html">return to the benchmark index</a>.</p></section>';
      return;
    }
  }
  const gameBenchmarks = (rootData?.games?.benchmarks ?? (rootData?.games ? [rootData.games] : [])).filter(report => report?.benchmark?.id && Array.isArray(report.runs)).map(report => {
    const reference = report.reference;
    if (!reference || report.runs.some(run => run.id === reference.id)) return report;
    const configuration = reference.configuration || {id:'codex:gpt-6-astra@ultra',label:'GPT-6 Astra',reasoning:'ultra'};
    return {...report, configurations:[...report.configurations.filter(item => item.id !== configuration.id), {...configuration,comparison:{controlled:false,reason:reference.provenance}}], runs:[...report.runs,{...reference,configurationId:configuration.id,conditionId:'vasir'}]};
  });
  const gameRuns = gameBenchmarks.flatMap(report => report.runs);
  const hasGameEffort = gameRuns.some(run => Number.isFinite(run.metrics?.durationMs) && run.metrics.durationMs > 0);
  const workflowData = rootData?.aiWorkflows;
  const overallData = rootData?.overall;
  const overallWritingCategory = overallData?.categories?.find(category => category.id === 'writing');
  const isWorkflowCategory = (categoryId) => Boolean(workflowData?.categories?.some((category) => category.id === categoryId));
  const contextForCategory = (categoryId) => categoryId === 'writing' && hasWriting ? 'writing' : isWorkflowCategory(categoryId) ? 'workflows' : categoryId === 'games' && gameBenchmarks.length ? 'games' : categoryId === 'overall' && overallData ? 'overall' : 'engineering';
  const requestedInitialCategory = initialFragment === 'vasir-effect' ? rootData?.categories?.[0]?.id : initialFragment.split('/')[1];
  const initialCategory = (requestedInitialCategory === 'writing' && hasWriting) || (requestedInitialCategory === 'games' && gameBenchmarks.length) || isWorkflowCategory(requestedInitialCategory) || rootData?.categories?.some(category => category.id === requestedInitialCategory) ? requestedInitialCategory : 'overall';
  const activeContext = contextForCategory(initialCategory);
  const isGames = activeContext === 'games';
  const isWorkSpec = activeContext === 'workflows';
  const isOverall = activeContext === 'overall';
  const isWriting = activeContext === 'writing';
  const writingCategoryData = isWriting ? buildWritingCategoryCollection(writingData, writingScoreRequest) : null;
  const writingAggregateLeader = (isWriting ? buildWritingNavigationSummary(writingData) : writingSummary?.categoryIndex)?.leader;
  if (isWriting) {
    window.VASIR_WRITING_COLLECTION = writingData;
    window.VASIR_WRITING_CATEGORY = writingCategoryData;
  }
  const data = isWriting ? writingCategoryData : isOverall ? overallData : isWorkSpec ? workflowData : rootData;
  const writingCaseLabel = data?.caseLabel || 'story case';
  const writingCasePlural = `${writingCaseLabel}s`;
  const TREATMENT_LABEL = data?.conditions?.find((condition) => condition.id === 'skill')?.label || 'Architecture skill';
  const BASELINE_LABEL = data?.conditions?.find(condition => condition.id === 'baseline')?.label || 'Minimal baseline';
  const BASELINE_SHORT = data?.conditions?.find(condition => condition.id === 'baseline')?.short || 'Minimal';
  const d3 = window.d3;
  const capabilityView = document.querySelector('#capability-view');
  const REQUIRED_CONDITION_IDS = ['baseline', 'skill'];
  const requiredCollections = ['conditions', 'categories', 'benchmarks', 'benchmarkSummaries', 'settings', 'entries', 'benchmarkResults'];
  const hasRequiredCollections = Boolean(data) && requiredCollections.every((key) => Array.isArray(data[key]));
  const expectedEntryCount = hasRequiredCollections
    ? data.settings.length * data.conditions.length
    : 0;
  const expectedResponseCount = hasRequiredCollections
    ? isOverall ? data.coverage?.observedResponseCount : expectedEntryCount * data.benchmarks.length
    : 0;
  if (
    !data
    || !d3?.scaleLinear
    || !hasRequiredCollections
    || data.conditions.length !== REQUIRED_CONDITION_IDS.length
    || !REQUIRED_CONDITION_IDS.every((conditionId) => data.conditions.some((condition) => condition.id === conditionId))
    || data.categories.length === 0
    || data.benchmarks.length === 0
    || data.settings.length === 0
    || data.benchmarkSummaries.length !== data.benchmarks.length
    || data.entries.length !== expectedEntryCount
    || (!isWriting && data.benchmarkResults.length !== expectedResponseCount)
    || (isOverall && (data.coverage?.eligibleSettings !== data.settings.length || !Array.isArray(data.coverage?.records) || data.coverage.records.length !== data.coverage.totalSettings))
    || (isWriting && (!Array.isArray(data.cases) || !data.cases.length || !Array.isArray(data.caseResults) || !Array.isArray(data.caseSummaries)))
  ) {
    if (capabilityView) {
      capabilityView.innerHTML = `
        <section class="development-unavailable" role="alert">
          <p class="ui-eyebrow">Benchmark data unavailable</p>
          <h2>RESULTS COULD NOT BE VERIFIED</h2>
          <p>${isWriting ? 'The published dataset must provide paired score records and source evidence for this comparison.' : 'The public dataset must provide one complete Minimal baseline and skill result for every matched setting and frozen task. No partial comparison is shown.'}</p>
        </section>
      `;
    }
    return;
  }

  const INITIAL_RESULT_COUNT = 10;
  const BASELINE_CONDITION_ID = 'baseline';
  const TREATMENT_CONDITION_ID = 'skill';
  const SETTING_COUNT = data.settings.length;
  const RANKED_SETTING_COUNT = isWriting ? data.entries.filter(entry => entry.condition === TREATMENT_CONDITION_ID && entry.eligibleForRank && Number.isFinite(entry.score)).length : SETTING_COUNT;
  const ENTRY_COUNT = isWriting ? data.entries.filter(entry => entry.eligibleForRank && Number.isFinite(entry.score)).length : data.entries.length;
  const BENCHMARK_COUNT = data.benchmarks.length;
  const scoreBasis = data.scoreBasis && typeof data.scoreBasis === 'object' ? data.scoreBasis : {};
  const TASK_COUNT = Number.isFinite(Number(scoreBasis.taskCount)) && Number(scoreBasis.taskCount) > 0
    ? Number(scoreBasis.taskCount)
    : BENCHMARK_COUNT;
  const SCORE_MINIMUM = Number.isFinite(Number(scoreBasis.range?.minimum)) ? Number(scoreBasis.range.minimum) : 0;
  const SCORE_MAXIMUM = Number.isFinite(Number(scoreBasis.range?.maximum)) ? Number(scoreBasis.range.maximum) : 100;
  const TRIALS_PER_TASK = Number.isFinite(Number(scoreBasis.trialsPerTask)) && Number(scoreBasis.trialsPerTask) > 0
    ? Number(scoreBasis.trialsPerTask)
    : Number.isFinite(Number(data.meta?.trials)) && Number(data.meta.trials) > 0
      ? Number(data.meta.trials)
      : 1;
  const JUDGE_COUNT = Number.isInteger(Number(scoreBasis.judgeCount)) && Number(scoreBasis.judgeCount) > 0
    ? Number(scoreBasis.judgeCount)
    : 2;
  const SCORE_EDITION_LABEL = typeof scoreBasis.label === 'string' && scoreBasis.label.trim()
    ? scoreBasis.label.trim()
    : 'Engineering v2';
  const SCORE_METHOD_LABEL = scoreBasis.benchmarkWeighting === 'equal'
    ? 'Equal-weight mean of frozen task rubric scores'
    : `${SCORE_EDITION_LABEL} score`;
  const QUALITY_DOMAIN = [SCORE_MINIMUM, SCORE_MAXIMUM];
  const taskCoverageLabel = isWriting ? data.writingCategory.comparisonLabel : isOverall && scoreBasis.edition === 'overall-v3' ? `${TASK_COUNT} benchmarks · ${data.categories.length} categories` : `${TASK_COUNT} ${TASK_COUNT === 1 ? 'task' : 'tasks'} × ${TRIALS_PER_TASK} ${TRIALS_PER_TASK === 1 ? 'trial' : 'trials'}`;
  const developmentDisclosure = isWriting ? 'Published benchmark results' : `${isOverall ? 'Overall' : SCORE_EDITION_LABEL} · ${taskCoverageLabel}${isOverall && scoreBasis.edition === 'overall-v3' ? '' : ` · ${JUDGE_COUNT} judges`}`;
  const COMPOSITE_SCORE_SCALE = d3.scaleLinear()
    .domain(QUALITY_DOMAIN)
    .range([0, 100])
    .clamp(true);
  const CAPABILITY_MODES = isGames && !hasGameEffort ? ['models', 'benchmarks'] : ['models', 'benchmarks', 'efficiency'];
  const COMBINED_CAPABILITY = {
    id: 'overall',
    name: 'Overall',
    short: 'ALL',
    color: 'var(--category-combined)',
    isCombined: true
  };
  const sourceCategories = [...rootData.categories, ...(workflowData?.categories || [])];
  const categoryColors = { engineering: 'var(--category-engineering)', games: 'var(--category-games)', writing: 'var(--category-writing)', 'product-design': 'var(--category-product)', 'ai-workflows': 'var(--category-workflows)' };
  const portfolioCategories = (overallData?.portfolioCategories || sourceCategories.map(category => ({ ...category, status: 'measured' }))).map(category => ({
    ...category,
    color: categoryColors[category.id] || sourceCategories.find(source => source.id === category.id)?.color
  }));
  const capabilityFields = [COMBINED_CAPABILITY, ...portfolioCategories.filter(category => category.status === 'measured' || (category.id === 'games' && gameBenchmarks.length) || (category.id === 'writing' && hasWriting))];
  const selectorFields = [COMBINED_CAPABILITY, ...portfolioCategories];
  const capabilityIndexMedia = window.matchMedia('(min-width: 67.501rem)');
  const combinedScoreGuideMedia = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 67.501rem)');

  const resourceDomain = (key) => {
    const values = data.entries
      .map((entry) => Number(entry[key]))
      .filter((value) => Number.isFinite(value) && value > 0);
    const [observedMinimum = 1, observedMaximum = 1] = d3.extent(values);
    const minimum = Math.max(Number.MIN_VALUE, observedMinimum * 0.9);
    const maximum = observedMaximum === observedMinimum
      ? observedMaximum * 1.1
      : observedMaximum * 1.1;
    return [minimum, maximum];
  };

  const resourceTicks = (domain) => {
    const scale = d3.scaleLog().domain(domain);
    const label = scale.tickFormat(6);
    return scale.ticks(6).filter((value) => (
      value >= domain[0] && value <= domain[1] && label(value) !== ''
    ));
  };

  const metricConfig = {
    latency: {
      label: 'Latency',
      axis: 'Latency per response (seconds)',
      note: 'Latency · log scale',
      domain: resourceDomain('latency'),
      format: (value) => `${value.toFixed(value < 10 ? 1 : 0)}s`,
      spoken: (value) => `${value.toFixed(1)} seconds per response`
    },
    tokens: {
      label: 'Tokens',
      axis: 'Output tokens per response',
      note: 'Tokens · log scale',
      domain: resourceDomain('tokens'),
      format: (value) => `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}k`,
      spoken: (value) => `${value.toLocaleString()} output tokens per response`
    }
  };
  Object.values(metricConfig).forEach((metric) => { metric.ticks = resourceTicks(metric.domain); });

  const conditionById = new Map(data.conditions.map((condition) => [condition.id, condition]));
  const conditionVisualClass = (conditionId) => (
    conditionId === BASELINE_CONDITION_ID ? 'baseline' : 'full'
  );
  const categoryById = new Map(capabilityFields.map((category) => [category.id, category]));
  const benchmarkById = new Map(data.benchmarks.map((benchmark) => [benchmark.id, benchmark]));
  const benchmarkSummaryById = new Map(data.benchmarkSummaries.map((summary) => [summary.benchmarkId, summary]));
  const entryById = new Map(data.entries.map((entry) => [entry.id, entry]));
  const baselineBySetting = new Map(
    data.entries
      .filter((entry) => entry.condition === BASELINE_CONDITION_ID)
      .map((entry) => [entry.settingId, entry])
  );

  const fieldConfig = {
    overall: { label: COMBINED_CAPABILITY.name, short: COMBINED_CAPABILITY.name },
    ...(isWriting ? { writing: { label: 'Writing', short: 'Writing' } } : {}),
    ...Object.fromEntries(data.categories.map((category) => [
      category.id,
      { label: category.name, short: category.short }
    ]))
  };
  const capabilityMobileLabel = {
    overall: 'Overall',
    engineering: 'Engineering',
    games: 'Games',
    writing: 'Writing',
    'product-design': 'Product Design',
    'ai-workflows': 'AI Workflows'
  };
  const suiteDescriptions = {
    'Backend Architecture': 'Complete, low-rent systems whose day-one topology reaches real scale without a later rewrite.',
    'Work Specification': 'Plans that preserve the requested user value and give an implementer a grounded route to delivering it.',
    Storytelling: 'How stories work, and how to create them: core ideas, causal structure, character choices, and consequential revelations.',
    'Dungeon Master': 'Playable adventure design: situations, choices, discoveries, and consequences at the table.'
  };

  const elements = {
    workspace: document.querySelector('#panel-capabilities'),
    capabilityView: document.querySelector('#capability-view')
  };

  const routeFromHash = () => {
    const route = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (route === 'leaderboard') {
      return { category: COMBINED_CAPABILITY.id, mode: 'models', legacy: true };
    }
    if (route === 'efficiency') {
      return { category: COMBINED_CAPABILITY.id, mode: 'efficiency', legacy: true };
    }
    if (route === 'vasir-effect') {
      return { category: rootData.categories[0].id, mode: 'models', legacy: true };
    }
    if (route === 'capabilities') {
      return { category: COMBINED_CAPABILITY.id, mode: 'models', canonical: false };
    }
    if (route.startsWith('capabilities/')) {
      const [, category, scopeOrMode, subsectionMode] = route.split('/');
      const legacyWritingScope = category === 'writing' && ['storytelling', 'dungeon-master', 'prose', 'poetry'].includes(scopeOrMode);
      const requestedMode = legacyWritingScope ? subsectionMode : scopeOrMode;
      const categoryIsValid = categoryById.has(category);
      const mode = CAPABILITY_MODES.includes(requestedMode)
        ? requestedMode
        : 'models';
      return {
        category: categoryIsValid ? category : COMBINED_CAPABILITY.id,
        mode,
        canonical: categoryIsValid && !legacyWritingScope && (!requestedMode || requestedMode === 'benchmarks' || requestedMode === 'efficiency')
      };
    }
    return {
      category: COMBINED_CAPABILITY.id,
      mode: 'models',
      invalid: Boolean(route)
    };
  };

  const initialRoute = routeFromHash();
  const requestedWritingSetting = new URLSearchParams(window.location.search).get('setting');
  const requestedWritingEntry = data.entries.find(entry => entry.condition === TREATMENT_CONDITION_ID && Number.isFinite(entry.score) && (entry.settingId === requestedWritingSetting || entry.configurationId === requestedWritingSetting));
  const restoredEntry = entryById.get(window.history.state?.selectedEntryId);

  const state = {
    selectedId: requestedWritingEntry?.id || (restoredEntry && (!isWriting || Number.isFinite(restoredEntry.score)) ? restoredEntry.id : null) || (isWriting ? [...data.entries].filter(entry => entry.condition === TREATMENT_CONDITION_ID && entry.eligibleForRank && Number.isFinite(entry.score)).sort((a, b) => (b.exactScore ?? b.score) - (a.exactScore ?? a.score))[0]?.id : null) || data.entries.find(entry => entry.condition === TREATMENT_CONDITION_ID)?.id || data.entries[0].id,
    capabilityCategory: initialRoute.category || COMBINED_CAPABILITY.id,
    capabilityMode: CAPABILITY_MODES.includes(initialRoute.mode) ? initialRoute.mode : 'models',
    metric: 'latency',
    showAll: Boolean(requestedWritingEntry && new URLSearchParams(window.location.search).get('inspect') === '1'),
    overallProvider: 'all'
  };

  const capabilityHash = () => (
    `#capabilities/${state.capabilityCategory}${state.capabilityMode === 'models' ? '' : `/${state.capabilityMode}`}`
  );

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const formatScore = (value) => Number.isFinite(value) ? value.toFixed(1) : '—';
  const formatWeight = (value) => `${Number((value * 100).toFixed(1))}%`;
  const writingWeightFraction = value => {
    for (let denominator = 1; denominator <= 100; denominator++) {
      if (Math.abs(value - 1 / denominator) < 1e-12) return denominator === 1 ? '1' : `1/${denominator}`;
    }
    return String(Number(value.toFixed(6)));
  };

  const signed = (value) => {
    if (!Number.isFinite(value)) return '—';
    if (value > 0) return `+${value.toFixed(1)}`;
    if (value < 0) return `−${Math.abs(value).toFixed(1)}`;
    return '±0.0';
  };

  const scoreFor = (entry, field = 'overall') => {
    if (!entry) return null;
    if (field === 'overall' || (isWriting && field === 'writing')) return entry.score;
    return entry.categories.find((reading) => reading.category === field)?.score ?? null;
  };

  const formatEntryScore = (entry, field = 'overall') => `${formatScore(scoreFor(entry, field))}${isWriting && entry?.partial ? '*' : ''}`;

  const workflowExactScores = new Map((workflowData?.benchmarkResults || []).map((result) => [
    `${result.settingId}:${result.condition}`, result.exactScore
  ]));
  const rankingScoreFor = (entry, field = 'overall') => {
    if (Number.isFinite(entry.exactScore)) {
      return field === 'overall' || (isWriting && field === 'writing') ? entry.exactScore : entry.categories.find(reading => reading.category === field)?.exactScore ?? scoreFor(entry, field);
    }
    if (isWorkflowCategory(field) || (isWorkSpec && field === 'overall')) {
      const exactScore = workflowExactScores.get(`${entry.settingId}:${entry.condition}`);
      if (exactScore !== undefined) return exactScore;
    }
    return scoreFor(entry, field);
  };
  const plotScoreFor = (entry, field) => isOverall || isWriting ? rankingScoreFor(entry, field) : scoreFor(entry, field);
  const conditionRanks = (entries, field) => {
    const ranks = new Map();
    entries.forEach((entry, index) => {
      const score = rankingScoreFor(entry, field);
      const tied = (isWorkSpec || isOverall || isWriting) && index > 0 && score === rankingScoreFor(entries[index - 1], field);
      ranks.set(entry.id, Number.isFinite(score) ? tied ? ranks.get(entries[index - 1].id) : index + 1 : null);
    });
    return ranks;
  };

  const baselineScoreFor = (entry, field = 'overall') => {
    if (field === 'overall' || (isWriting && field === 'writing')) return entry.baselineScore;
    return entry.baselineCategories.find((reading) => reading.category === field).score;
  };

  const deltaFor = (entry, field = 'overall') => {
    if (isWorkSpec || isOverall || isWriting) return entry.delta;
    const current = scoreFor(entry, field);
    const baseline = baselineScoreFor(entry, field);
    return Number.isFinite(current) && Number.isFinite(baseline)
      ? Math.round((current - baseline) * 10) / 10
      : null;
  };

  const rankedField = (field = 'overall') => {
    const entries = data.entries.filter(entry => !isWriting || entry.eligibleForRank).sort((left, right) => (
      (rankingScoreFor(right, field) ?? -1) - (rankingScoreFor(left, field) ?? -1) ||
      right.score - left.score ||
      left.latency - right.latency ||
      left.id.localeCompare(right.id)
    ));
    const ranks = new Map();
    data.conditions.forEach((condition) => {
      conditionRanks(entries.filter((entry) => entry.condition === condition.id), field)
        .forEach((rank, entryId) => ranks.set(entryId, rank));
    });
    return {
      entries,
      ranks
    };
  };

  const rankedCondition = (conditionId, field = 'overall') => {
    const entries = data.entries
      .filter((entry) => entry.condition === conditionId && (!isWriting || entry.eligibleForRank))
      .sort((left, right) => (
        (rankingScoreFor(right, field) ?? -1) - (rankingScoreFor(left, field) ?? -1) ||
        right.score - left.score ||
        left.latency - right.latency ||
        left.id.localeCompare(right.id)
      ));
    return {
      entries,
      ranks: conditionRanks(entries, field)
    };
  };

  const selectedEntry = () => entryById.get(state.selectedId) || data.entries[0];

  const matchedEntries = (entry) => data.conditions.map((condition) => (
    entryById.get(`${entry.settingId}-${condition.id}`)
      || data.entries.find((candidate) => candidate.settingId === entry.settingId && candidate.condition === condition.id)
  )).filter(Boolean);

  const conditionMarkup = (conditionId, short = false) => {
    const condition = conditionById.get(conditionId);
    return `
      <span class="condition-label condition-label--${escapeHtml(conditionVisualClass(conditionId))}">
        <span class="condition-mark condition-mark--${escapeHtml(conditionVisualClass(conditionId))}" aria-hidden="true"></span>
        ${escapeHtml(short ? condition.short : condition.label)}
      </span>
    `;
  };

  const weightedComposition = (entry) => {
    const weighted = data.categories.map((category) => {
      const reading = entry.categories.find((reading) => reading.category === category.id);
      const rawScore = isOverall || isWriting ? reading.exactScore : reading.score;
      const weight = Number.isFinite(category.weight) ? category.weight : 1;
      return {
        category,
        rawScore,
        displayScore: reading.score,
        weight,
        unscaledContribution: isOverall || isWriting ? reading.exactContribution : rawScore * weight
      };
    });
    if (isOverall || isWriting) return weighted.map(item => ({ ...item, contribution: item.unscaledContribution }));
    const weightedTotal = weighted.reduce((sum, item) => sum + item.unscaledContribution, 0);
    const scale = weightedTotal > 0 ? entry.score / weightedTotal : 0;
    let allocated = 0;

    return weighted.map((item, index) => {
      const contribution = index === weighted.length - 1
        ? entry.score - allocated
        : item.unscaledContribution * scale;
      allocated += contribution;
      return { ...item, contribution };
    });
  };

  const weightedCompositionDescription = (segments) => segments.map(({ category, displayScore, contribution, weight }) => (
    `${category.name} score ${formatScore(displayScore)} of ${SCORE_MAXIMUM}, ${formatWeight(weight)} weight, ${contribution.toFixed(2)} weighted points`
  )).join('; ');

  const pairedProfileMarkup = ({ condition, conditionLabel, rank, score, attributes = '', description, segments, toolbarLabel = '' }) => `
    <span class="capability-composition capability-composition--${escapeHtml(conditionVisualClass(condition))}" ${attributes} role="group" aria-label="${escapeHtml(description)}">
      <span class="capability-composition__meta">
        <span class="capability-composition__label">${escapeHtml(conditionLabel)}</span>
        ${Number.isFinite(rank) ? `<span class="capability-composition__rank">Rank #${String(rank).padStart(2, '0')}</span>` : ''}
      </span>
      <span class="capability-composition__track">
        <span class="capability-composition__stack"${toolbarLabel ? ` role="toolbar" aria-label="${escapeHtml(toolbarLabel)}"` : ''}>${segments}</span>
      </span>
      <strong class="capability-composition__total">${formatScore(score)}</strong>
    </span>
  `;

  const capabilityCompositionMarkup = (entry, conditionRank, fullEntryId) => {
    const score = entry.score;
    const segments = weightedComposition(entry);
    const profileLabel = weightedCompositionDescription(segments);
    const conditionLabel = conditionById.get(entry.condition).label;
    const baselineEntry = baselineBySetting.get(entry.settingId);
    const segmentMarkup = segments.map(({ category, rawScore, displayScore, contribution, weight }, index) => {
      const baselineReading = baselineEntry.categories.find((reading) => reading.category === category.id);
      const baselineScore = isOverall || isWriting ? baselineReading.exactScore : baselineReading.score;
      const categoryDelta = Math.round((rawScore - baselineScore) * 10) / 10;
      const insight = `${category.name}: score ${formatScore(displayScore)} of ${SCORE_MAXIMUM}, weight ${formatWeight(weight)}, weighted contribution ${contribution.toFixed(2)} points`;
      return `
        <button
          class="capability-composition__segment capability-composition__segment--${escapeHtml(category.id)}"
          type="button"
          ${isWriting ? 'data-writing-group-id' : 'data-category-id'}="${escapeHtml(category.id)}"
          data-entry-id="${escapeHtml(fullEntryId)}"
          data-source-condition="${escapeHtml(entry.condition)}"
          data-category-label="${escapeHtml(category.name)}"
          data-category-short="${escapeHtml(category.short)}"
          data-raw-score="${displayScore.toFixed(1)}"
          ${isOverall || isWriting ? `data-raw-exact-score="${rawScore}"` : ''}
          data-weight="${weight}"
          data-contribution="${isOverall || isWriting ? contribution : contribution.toFixed(6)}"
          data-delta="${categoryDelta.toFixed(1)}"
          style="--segment-width: ${COMPOSITE_SCORE_SCALE(contribution).toFixed(4)}%${isWriting ? `; background:${escapeHtml(category.color)}` : ''}"
          tabindex="${index === 0 ? '0' : '-1'}"
          aria-label="Open ${escapeHtml(category.name)} results for ${escapeHtml(entry.family)}, ${escapeHtml(entry.reasoning)} reasoning, with ${escapeHtml(TREATMENT_LABEL)} selected. ${escapeHtml(conditionLabel)} ${escapeHtml(insight)}."
          title="${escapeHtml(insight)}"
        >
          <span class="capability-composition__abbr" aria-hidden="true">${escapeHtml(category.short)}</span>
          <strong class="capability-composition__score" aria-hidden="true">${formatScore(displayScore)}</strong>
        </button>
      `;
    }).join('');
    return pairedProfileMarkup({
      condition: entry.condition, conditionLabel, rank: conditionRank, score, segments: segmentMarkup,
      attributes: `data-entry-id="${escapeHtml(entry.id)}" data-condition="${escapeHtml(entry.condition)}" data-composite-score="${score.toFixed(1)}" ${isOverall || isWriting ? `data-composite-exact-score="${entry.exactScore}"` : ''} data-condition-rank="${conditionRank}"`,
      description: `${conditionLabel}, ${SCORE_EDITION_LABEL} score ${formatScore(score)} of ${SCORE_MAXIMUM}. ${conditionLabel} rank ${conditionRank} of ${RANKED_SETTING_COUNT}, shown as secondary context. ${profileLabel}.`,
      toolbarLabel: `${isWriting ? 'Open subcategory benchmark tests' : 'Open a capability leaderboard'} from ${conditionLabel} scores`
    });
  };

  const resourceComparison = (entry, key) => {
    const baseline = baselineBySetting.get(entry.settingId)?.[key];
    const value = entry[key];
    if (!Number.isFinite(baseline) || baseline <= 0 || !Number.isFinite(value) || value < 0) return '';
    const difference = Math.round(((value / baseline) - 1) * 100);
    if (difference === 0) return `${BASELINE_SHORT} reference`;
    return `${difference > 0 ? '+' : '−'}${Math.abs(difference)}% vs ${BASELINE_SHORT}`;
  };

  const normalizedQuality = (score) => {
    const ratio = (score - QUALITY_DOMAIN[0]) / (QUALITY_DOMAIN[1] - QUALITY_DOMAIN[0]);
    return Math.max(0, Math.min(100, ratio * 100));
  };

  const resourcePosition = (value, metric = state.metric) => {
    const [minimum, maximum] = metricConfig[metric].domain;
    const ratio = (Math.log(value) - Math.log(minimum)) / (Math.log(maximum) - Math.log(minimum));
    return Math.max(0, Math.min(100, ratio * 100));
  };

  const plotCoordinates = (entry, field = state.capabilityCategory, metric = state.metric) => ({
    x: resourcePosition(entry[metric], metric),
    y: 100 - normalizedQuality(plotScoreFor(entry, field))
  });

  const tripletMarkup = (entry, field = 'overall') => {
    const ranking = rankedField(field);
    return matchedEntries(entry).map((candidate) => {
      const selected = candidate.id === entry.id;
      const condition = conditionById.get(candidate.condition);
      return `
        <button
          class="matched-triplet__option matched-triplet__option--${escapeHtml(conditionVisualClass(candidate.condition))}${selected ? ' is-selected' : ''}"
          type="button"
          data-entry-id="${escapeHtml(candidate.id)}"
          aria-pressed="${selected}"
          aria-label="Select matched ${escapeHtml(condition.label)}, ${fieldConfig[field].label} ${SCORE_EDITION_LABEL} score ${formatScore(scoreFor(candidate, field))} of ${SCORE_MAXIMUM}, ${escapeHtml(condition.label)} rank ${ranking.ranks.get(candidate.id)} of ${RANKED_SETTING_COUNT}"
        >
          ${conditionMarkup(candidate.condition, true)}
          <strong>${formatEntryScore(candidate, field)}</strong>
          <span>#${String(ranking.ranks.get(candidate.id)).padStart(2, '0')} · ${signed(deltaFor(candidate, field))} vs ${escapeHtml(BASELINE_SHORT)}</span>
        </button>
      `;
    }).join('');
  };

  const categoryBenchmarks = (categoryId) => (
    categoryId === COMBINED_CAPABILITY.id || (isWriting && categoryId === 'writing')
      ? data.benchmarks
      : data.benchmarks.filter((benchmark) => benchmark.category === categoryId)
  ).filter(benchmark => !isWriting || !data.writingCategory.catalog.find(item => item.id === benchmark.id)?.archived);
  const benchmarkIsMeasured = benchmark => benchmark.evidenceKind === 'development' && (!isWriting || (
    Number.isFinite(writingBenchmarkDisplay(benchmark).summary.baseline) && Number.isFinite(writingBenchmarkDisplay(benchmark).summary.treatment)
  ));

  const combinedOutcomeSummary = () => {
    const fullEntries = rankedCondition(TREATMENT_CONDITION_ID, COMBINED_CAPABILITY.id).entries.filter(entry => Number.isFinite(entry.score) && Number.isFinite(baselineBySetting.get(entry.settingId)?.score));
    const deltas = fullEntries
      .map((entry) => isOverall || isWriting ? entry.exactDelta ?? entry.delta : Math.round((entry.score - baselineBySetting.get(entry.settingId).score) * 10) / 10)
      .sort((left, right) => left - right);
    const midpoint = Math.floor(deltas.length / 2);
    const median = !deltas.length ? null : deltas.length % 2
      ? deltas[midpoint]
      : Math.round(((deltas[midpoint - 1] + deltas[midpoint]) / 2) * 10) / 10;
    return {
      median,
      improved: deltas.filter((delta) => delta > 0).length,
      regressed: deltas.filter((delta) => delta < 0).length,
      unchanged: deltas.filter((delta) => delta === 0).length,
      total: deltas.length
    };
  };

  const workflowLeadersMarkup = (conditionId, field) => {
    const ranking = rankedCondition(conditionId, field);
    const leaders = ranking.entries.filter((entry) => ranking.ranks.get(entry.id) === 1);
    if (!leaders.length) return '';
    const label = conditionById.get(conditionId).label;
    return `
      <div class="capability-canvas__reading capability-canvas__reading--${conditionVisualClass(conditionId)}" data-leader-condition="${conditionId}" data-leader-count="${leaders.length}" data-entry-id="${escapeHtml(leaders[0]?.id)}" data-score="${formatScore(scoreFor(leaders[0], field))}"${isWriting ? ` data-writing-partial-indicator="${leaders.some(entry => entry.partial)}"` : ''}>
        <dt>${escapeHtml(label)} ${leaders.length > 1 ? `${leaders.length} co-leaders` : 'leader'} /${SCORE_MAXIMUM}</dt>
        <dd>${formatEntryScore(leaders[0], field)}${leaders.length ? leaders.map((entry) => `
          <small data-leader-entry-id="${escapeHtml(entry.id)}">${escapeHtml(entry.family)} · ${escapeHtml(entry.reasoning)}</small>
        `).join('') : '<small>No assessable panel total</small>'}</dd>
      </div>
    `;
  };

  const overallWeightsMarkup = () => `
    <details class="overall-weights">
      <summary>Target weights &amp; method</summary>
      <dl class="overall-weights__targets">
        ${portfolioCategories.map(category => `<div data-target-category-id="${escapeHtml(category.id)}" data-target-weight="${category.targetWeight}"><dt>${escapeHtml(category.name)}</dt><dd>${formatWeight(category.targetWeight)}</dd></div>`).join('')}
      </dl>
      <p>Current weights normalize the measured categories’ targets. ${overallWritingCategory ? 'All Writing averages its three Storytelling benchmarks equally. Other categories average their benchmarks equally.' : 'Tasks share equal weight within each category.'} Scores and resource means use the same weights. Both conditions require ${TASK_COUNT}/${TASK_COUNT} assessable benchmarks; missing results are not scored as zero.</p>
      ${rootData.games ? '<p>The <a href="#capabilities/games">Games pilot</a> stays separate: it has no comparable plain-answer/skill pair.</p>' : ''}
      ${overallWritingCategory ? '<p>Each category segment is the same model’s score on that category’s leaderboard. Benchmark tests retain their full published model cohorts. Core idea uses its published single-judge basis; different task rubrics remain uncalibrated.</p>' : hasWriting ? '<p><a href="#capabilities/writing/storytelling">Writing / Storytelling</a> is available separately. Writing benchmarks are excluded from this index until comparable coverage and scoring are established.</p>' : ''}
    </details>
  `;

  const writingMethodMarkup = () => {
    const comparison = data.writingCategory;
    const otherTests = categoryBenchmarks('writing').filter(benchmark => !comparison.activeBenchmarkIds.includes(benchmark.id));
    const hasContextBalancedReviews = comparison.activeBenchmarkIds.some(id => comparison.publications.find(publication => publication.benchmarks.some(benchmark => benchmark.id === id))?.scoreBasis?.reviewers?.length === 4);
    return `
      <details class="overall-weights" data-writing-index-method>
        <summary>Methodology</summary>
        <p>${escapeHtml(comparison.selection.title)} uses ${comparison.selection.type === 'category' && !comparison.writingScoreBasis ? 'an equal-weight average of tracks; each track averages its own benchmarks equally' : comparison.activeBenchmarkIds.length === 1 ? 'one benchmark' : 'an equal-weight average of all selected benchmark scores'}. Every ranked model uses the same tests and weights in both conditions. Incomplete means remain visible but unranked. Each benchmark retains its published scoring basis.</p>
        ${comparison.writingScoreBasis ? `<p data-writing-fixed-basis="${escapeHtml(comparison.writingScoreBasis.id)}">All Writing includes ${comparison.writingScoreBasis.benchmarkIds.map(id => `<a href="${escapeHtml(benchmarkSummaryById.get(id).detailHref)}">${escapeHtml(benchmarkById.get(id).name)}</a>`).join(', ')}, equally weighted.</p>` : ''}
        <p>${scoreBasis.provisional ? 'Core idea uses the same published Astra-only single-judge basis for every model. Scores that include Core idea inherit its provisional status. ' : ''}Different task rubrics remain uncalibrated. Scores describe these named tests.</p>
        ${hasContextBalancedReviews ? '<p>First discovery of magic averages four reviews per answer: two judge models, each with a naive and informed context. The result averages all three predeclared trials in both conditions.</p>' : ''}
        ${otherTests.length ? `<p>Additional published tests: ${otherTests.map(benchmark => `<a href="${escapeHtml(benchmarkSummaryById.get(benchmark.id).detailHref)}">${escapeHtml(benchmark.name)}</a>`).join(' · ')}. Their own cohorts and scoring sources are shown under Benchmark tests.</p>` : ''}
        <p>${overallWritingCategory ? `All Writing is included in Overall at ${formatWeight(overallWritingCategory.weight)} weight.` : 'Writing is excluded from Overall.'} Each report retains the original answers, reviews, exclusions, and trial details.</p>
      </details>`;
  };

  const writingBenchmarkDisplay = (benchmark) => {
    const publication = data.writingCategory.publications.find(item => item.benchmarks.some(source => source.id === benchmark.id));
    const original = publication.benchmarkSummaries.find(summary => summary.benchmarkId === benchmark.id);
    const hasOfficialMeans = Number.isFinite(original.baseline) && Number.isFinite(original.treatment);
    const availableProvisional = publication.provisionalLeaderboard?.status === 'provisional' && publication.provisionalLeaderboard.rankedSettingCount
      ? publication.provisionalLeaderboard : null;
    const provisional = hasOfficialMeans ? null : availableProvisional;
    const trials = publication.trialCount || publication.scoreBasis?.trialsPerTask || 1;
    const caseLabel = publication.caseLabel || 'story';
    const casesLabel = publication.cases.length === 1 ? caseLabel : caseLabel === 'story' ? 'stories' : `${caseLabel}s`;
    const cohort = publication.cohortSummaries
      ? `${publication.cohortSummaries.primary.expectedPairs} primary repetitions`
      : `${publication.cases.length} ${casesLabel}${trials > 1 ? ` × ${trials} trials` : ''}`;
    const settingCount = provisional ? provisional.rankedSettingCount : publication.coverage.completedSettingCount;
    const judgeCount = provisional ? provisional.judgeConfigurationIds?.length || 1 : publication.scoreBasis?.judgeCount || publication.scoreBasis?.judges?.length;
    const provisionalSourceLabel = availableProvisional ? `${availableProvisional.label.replace(/ provisional results$/i, '')} · ${availableProvisional.rankedSettingCount} settings · ${availableProvisional.expectedCaseCount} stories` : '';
    const sourceLabel = provisional
      ? provisionalSourceLabel
      : `${judgeCount ? `${judgeCount}-review panel · ` : ''}${settingCount} ${settingCount === 1 ? 'setting' : 'settings'} · ${cohort}`;
    return {
      publication, provisional, availableProvisional, provisionalSourceLabel, settingCount, sourceLabel, judgeCount, trials, cohort,
      sourceKind: provisional ? 'provisional-single-judge' : hasOfficialMeans ? 'official-panel' : 'answers',
      summary: provisional ? { ...original, ...provisional.summary } : original
    };
  };

  const writingSelectionMarkup = (scope = 'leaderboard') => {
    if (!isWriting) return '';
    const entry = selectedEntry();
    const baselineEntry = baselineBySetting.get(entry.settingId);
    const skillEntry = data.entries.find(item => item.settingId === entry.settingId && item.condition === TREATMENT_CONDITION_ID);
    const components = (skillEntry?.benchmarkComponents || []).filter(component => component.weight > 0 && Number.isFinite(component.exactScore));
    const baselineComponents = baselineEntry?.benchmarkComponents || [];
    const exact = value => Number.isFinite(value) ? String(Number(value.toFixed(6))) : 'Incomplete';
    const links = components.map(component => {
      const benchmark = benchmarkById.get(component.benchmarkId);
      const display = writingBenchmarkDisplay(benchmark);
      const { publication } = display;
      const sourceSetting = publication.settings.find(setting => setting.configurationId === entry.configurationId || setting.id === entry.settingId);
      const story = publication.cases[0];
      const trials = publication.trialCount || publication.scoreBasis?.trialsPerTask || 1;
      const baseline = baselineComponents.find(item => item.benchmarkId === component.benchmarkId);
      const paired = Number.isFinite(baseline?.exactScore) && Number.isFinite(component.exactScore);
      const reading = paired ? `Plain ${formatScore(baseline.score)} → Skill ${formatScore(component.score)}` : 'Paired score incomplete';
      const weight = component.weight === 1 ? '100% weight' : `${writingWeightFraction(component.weight)} weight`;
      return `<li data-writing-component="${escapeHtml(benchmark.id)}" data-exact-baseline="${baseline?.exactScore ?? ''}" data-exact-skill="${component.exactScore ?? ''}" data-weight="${component.weight}" data-provisional="${component.provisional}"><a data-writing-case-link="${escapeHtml(story.id)}" data-writing-answer-benchmark="${escapeHtml(benchmark.id)}" href="./benchmark-report.html${sourceSetting ? `?setting=${encodeURIComponent(sourceSetting.id)}` : ''}#${encodeURIComponent(benchmark.id)}/${encodeURIComponent(story.id)}${trials > 1 ? '/trial-1' : ''}"><strong>${escapeHtml(benchmark.name)} <small>${weight}</small></strong><span>${escapeHtml(reading)}<small>${escapeHtml(component.basis.label)} · Answers &amp; reviews ↗</small></span></a></li>`;
    }).join('');
    const calculation = (result, precise = false) => {
      if (!Number.isFinite(result?.exactScore)) return 'No paired benchmark score available.';
      const terms = (result.benchmarkComponents || []).filter(component => component.weight > 0 && Number.isFinite(component.exactScore));
      const values = terms.map(component => precise ? exact(component.exactScore) : formatScore(component.score));
      const equal = terms.every(component => Math.abs(component.weight - 1 / terms.length) < 1e-12);
      const expression = equal ? terms.length > 1 ? `(${values.join(' + ')}) ÷ ${values.length}` : values[0]
        : terms.map((component, index) => `${values[index]} × ${precise ? exact(component.weight) : writingWeightFraction(component.weight)}`).join(' + ');
      return `${expression}${precise ? ` ≈ ${exact(result.exactScore)} → ` : ' ≈ '}${formatEntryScore(result)}`;
    };
    const otherLinks = () => categoryBenchmarks('writing').filter(benchmark => !components.some(component => component.benchmarkId === benchmark.id)).map(benchmark => {
      const { publication } = writingBenchmarkDisplay(benchmark);
      const setting = publication.settings.find(setting => setting.configurationId === entry.configurationId || setting.id === entry.settingId);
      if (!setting) return '';
      const story = publication.cases[0];
      const trials = publication.trialCount || publication.scoreBasis?.trialsPerTask || 1;
      const unavailable = skillEntry?.benchmarkComponents.some(component => component.benchmarkId === benchmark.id && !Number.isFinite(component.exactScore));
      return `<li><a data-writing-case-link="${escapeHtml(story.id)}" data-writing-answer-benchmark="${escapeHtml(benchmark.id)}" href="./benchmark-report.html?setting=${encodeURIComponent(setting.id)}#${encodeURIComponent(benchmark.id)}/${encodeURIComponent(story.id)}${trials > 1 ? '/trial-1' : ''}">${escapeHtml(benchmark.name)} · ${unavailable ? 'Score unavailable · ' : ''}Answers &amp; reviews ↗</a></li>`;
    }).join('');
    const currentOtherLinks = otherLinks();
    return `<details class="writing-selection" data-writing-selected-setting="${escapeHtml(entry.settingId)}" aria-labelledby="writing-selection-title-${scope}">
      <summary id="writing-selection-title-${scope}">Scores &amp; answers <span>${escapeHtml(entry.family)} · ${escapeHtml(entry.reasoning)}</span></summary>
      <div class="writing-selection__details">
      ${skillEntry?.partial ? `<p class="writing-selection__missing">Missing: ${skillEntry.missingBenchmarkIds.map(id => escapeHtml(benchmarkById.get(id)?.name || id)).join(' · ')}. Not included in the aggregate ranking.</p>` : ''}
      <ul>${links}</ul>
      <div class="writing-selection__calculation" data-writing-exact-aggregate data-calculation-method="${components.every(component => Math.abs(component.weight - 1 / components.length) < 1e-12) ? 'arithmetic-mean' : 'weighted-sum'}" data-source-count="${components.length}" data-partial="${Boolean(skillEntry?.partial)}" data-exact-baseline="${baselineEntry?.exactScore ?? ''}" data-exact-skill="${skillEntry?.exactScore ?? ''}"><p><strong>Plain</strong> ${escapeHtml(calculation(baselineEntry))}</p><p><strong>Skill</strong> ${escapeHtml(calculation(skillEntry))}</p><details><summary>Exact calculation</summary><p><strong>Plain</strong> ${escapeHtml(calculation(baselineEntry, true))}</p><p><strong>Skill</strong> ${escapeHtml(calculation(skillEntry, true))}</p><small>Calculated from unrounded source scores; decimals shown to six places.</small></details></div>
      ${currentOtherLinks ? `<details class="writing-selection__other"><summary>Other results (not part of this score)</summary><ul>${currentOtherLinks}</ul></details>` : ''}
      </div>
    </details>`;
  };

  const writingScoreHref = selectionId => {
    const url = new URL(window.location.href);
    url.searchParams.set('score', selectionId);
    url.searchParams.set('setting', selectedEntry().settingId);
    return url.href;
  };

  const writingLeaderboardControlsMarkup = () => {
    if (!isWriting || state.capabilityMode === 'benchmarks') return '';
    const comparison = data.writingCategory;
    const selection = comparison.selection;
    const options = comparison.selections.filter(option => !option.archived && option.benchmarkIds.length
      && (option.completedSettingCount > 0 || option.partialSettingCount > 0));
    const optionsMarkup = options.map(option => `<option value="${escapeHtml(option.id)}"${option.id === selection.id ? ' selected' : ''}>${escapeHtml(option.title)}</option>`).join('');
    return `<div class="writing-leaderboard-controls" data-writing-score-controls data-writing-score-selection="${escapeHtml(selection.id)}">
      <label class="field-control" for="writing-score-selection"><span>Score scope</span><select id="writing-score-selection" name="score">${optionsMarkup}</select></label>
    </div>`;
  };

  const syncWritingControls = () => {
    if (!isWriting) return;
    const score = document.querySelector('#writing-score-selection');
    if (score) score.value = data.writingCategory.selection.id;
  };

  const capabilityHeaderFrameMarkup = ({ name, identityLabel, disclosure, summary, method = '', readings, combined = false, headerModifier = '', identityModifier = '', development = false, summaryClass = '' }) => `
    <header class="capability-canvas__header${headerModifier}">
      <div class="capability-canvas__identity${identityModifier}">
        <p class="ui-eyebrow">${escapeHtml(identityLabel)}</p>
        <p class="capability-canvas__status${development ? ' capability-canvas__status--work-spec' : ''}"><strong>${escapeHtml(disclosure)}</strong></p>
        <h3 id="capability-question" tabindex="-1">${escapeHtml(name)}</h3>
        <p${summaryClass ? ` class="${summaryClass}"` : ''}>${summary}</p>
        ${method}
      </div>
      <dl class="capability-canvas__readings${combined ? ' capability-canvas__readings--combined' : ''}" aria-label="${escapeHtml(name)} summary">${readings}</dl>
    </header>
  `;

  const capabilityTabsMarkup = (name, tabs) => `
    <nav class="capability-mode" aria-label="Choose ${escapeHtml(name)} view">
      <span class="capability-mode__label" aria-hidden="true">View</span>
      <div class="capability-mode__tabs" role="tablist" aria-label="Choose ${escapeHtml(name)} evidence view">
        ${tabs.map(([id, label, note, panel]) => `<button class="capability-mode__tab${state.capabilityMode === id ? ' is-selected' : ''}" id="capability-mode-${id}" type="button" role="tab" data-capability-mode="${id}" aria-selected="${state.capabilityMode === id}" aria-controls="${panel}" tabindex="${state.capabilityMode === id ? '0' : '-1'}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(note)}</span></button>`).join('')}
      </div>
    </nav>
  `;

  const capabilityHeaderMarkup = (category) => {
    const benchmarks = categoryBenchmarks(category.id);
    const trackCount = new Set(benchmarks.map((benchmark) => benchmark.suite)).size;
    const measuredCount = benchmarks.filter(benchmarkIsMeasured).length;
    const fullWinner = rankedCondition(TREATMENT_CONDITION_ID, category.id).entries[0];
    const baselineWinner = rankedCondition(BASELINE_CONDITION_ID, category.id).entries[0];
    const showingBenchmarks = state.capabilityMode === 'benchmarks';
    const showingEfficiency = state.capabilityMode === 'efficiency';
    const combined = category.isCombined || isWriting;
    const outcome = combined && state.capabilityMode === 'models' ? combinedOutcomeSummary() : null;
    const modelViewLabel = combined ? 'Paired leaderboard' : 'Model leaderboard';
    const identityLabel = `Capabilities / ${category.name} / ${showingBenchmarks ? 'Benchmark tests' : showingEfficiency ? 'Efficiency' : modelViewLabel}`;
    const rankedCount = isWriting ? data.entries.filter(entry => entry.condition === TREATMENT_CONDITION_ID && entry.eligibleForRank && Number.isFinite(entry.score)).length : SETTING_COUNT;
    const modelSummary = isWriting ? `${rankedCount} ranked · ${data.coverage.declaredSettingCount ?? SETTING_COUNT} model settings`
      : category.isCombined
        ? isOverall ? `${SETTING_COUNT} ranked settings · ${data.coverage.incompleteSettings} coverage gaps` : `${SETTING_COUNT} matched settings · ${SCORE_METHOD_LABEL.toLowerCase()} across ${TASK_COUNT} benchmark tasks`
        : `${SETTING_COUNT} matched settings · ${isWorkSpec ? 'one authored chat task · spec quality' : SCORE_EDITION_LABEL + ' rubric score'} /${SCORE_MAXIMUM}`;
    const summary = (showingBenchmarks
      ? `${trackCount} ${trackCount === 1 ? 'track' : 'tracks'} · ${benchmarks.length} benchmark tests`
      : showingEfficiency
        ? `${ENTRY_COUNT} setting × condition results · fixed ${escapeHtml(isWriting ? taskCoverageLabel : category.name)} rubric score × ${escapeHtml(metricConfig[state.metric].label.toLowerCase())}`
        : escapeHtml(modelSummary))
      + (!isWriting && isOverall ? `<span class="overall-summary__coverage" data-portfolio-coverage>${data.categories.length}/${portfolioCategories.length} categories measured${rootData.games ? ' in index' : ''} · ${formatWeight(scoreBasis.publishedTargetWeight)} target weight covered</span><span class="overall-method" data-overall-method>Current weights: ${data.categories.map(category => `${escapeHtml(category.name)} ${formatWeight(category.weight)}`).join(' · ')}</span>` : '');
    const readings = showingBenchmarks ? `
      <div class="capability-canvas__reading capability-canvas__reading--measured" data-count="${measuredCount}"><dt>Tests</dt><dd>${measuredCount}<small> scored tasks</small></dd></div>
      <div class="capability-canvas__reading capability-canvas__reading--audit"><dt>Models</dt><dd>${SETTING_COUNT}<small>${isWriting ? ' model settings' : isOverall ? ' complete settings' : ' matched settings'}</small></dd></div>
    ` : outcome ? `
      ${isOverall || isWriting ? workflowLeadersMarkup(TREATMENT_CONDITION_ID, category.id) : `<div class="capability-canvas__reading capability-canvas__reading--full" data-entry-id="${escapeHtml(fullWinner.id)}" data-score="${formatScore(scoreFor(fullWinner, category.id))}"><dt>Best ${escapeHtml(TREATMENT_LABEL)} /${SCORE_MAXIMUM}</dt><dd>${formatScore(scoreFor(fullWinner, category.id))}<small>${escapeHtml(fullWinner.family)} · ${escapeHtml(fullWinner.reasoning)}</small>${isWorkSpec ? `<small>${escapeHtml(fullWinner.readinessLabel)}</small>` : ''}</dd></div>`}
      ${Number.isFinite(outcome.median) ? `<div class="capability-canvas__reading capability-canvas__reading--effect" data-median="${formatScore(outcome.median)}"><dt>Median paired uplift</dt><dd>${signed(outcome.median)}<small>points across ${outcome.total} matched settings</small></dd></div>` : ''}
      ${outcome.total ? `<div class="capability-canvas__reading capability-canvas__reading--outcomes" data-improved="${outcome.improved}" data-regressed="${outcome.regressed}"><dt>Improved settings</dt><dd>${outcome.improved} of ${outcome.total}<small>${outcome.regressed} regressed${outcome.unchanged ? ` · ${outcome.unchanged} unchanged` : ''}</small></dd></div>` : ''}
    ` : isWorkSpec || isWriting ? `
      ${workflowLeadersMarkup(TREATMENT_CONDITION_ID, category.id)}
      ${workflowLeadersMarkup(BASELINE_CONDITION_ID, category.id)}
    ` : `
      <div class="capability-canvas__reading capability-canvas__reading--full" data-entry-id="${escapeHtml(fullWinner.id)}" data-score="${formatScore(scoreFor(fullWinner, category.id))}"><dt>${escapeHtml(TREATMENT_LABEL)} leader /${SCORE_MAXIMUM}</dt><dd>${formatScore(scoreFor(fullWinner, category.id))}<small>${escapeHtml(fullWinner.family)} · ${escapeHtml(fullWinner.reasoning)}</small></dd></div>
      <div class="capability-canvas__reading capability-canvas__reading--baseline" data-entry-id="${escapeHtml(baselineWinner.id)}" data-score="${formatScore(scoreFor(baselineWinner, category.id))}"><dt>${escapeHtml(BASELINE_LABEL)} leader /${SCORE_MAXIMUM}</dt><dd>${formatScore(scoreFor(baselineWinner, category.id))}<small>${escapeHtml(baselineWinner.family)} · ${escapeHtml(baselineWinner.reasoning)}</small></dd></div>
    `;
    return capabilityHeaderFrameMarkup({
      name: category.name, identityLabel, disclosure: isWriting ? `${showingBenchmarks ? 'Writing' : data.writingCategory.selection.title} · ${developmentDisclosure}` : developmentDisclosure, summary, readings,
      method: isWriting ? writingMethodMarkup() : isOverall ? overallWeightsMarkup() : '',
      combined: Boolean(outcome), development: isWorkSpec || isOverall || isWriting,
      headerModifier: `${isWorkSpec ? ' capability-canvas__header--work-spec' : ''}${isOverall || isWriting ? ' capability-canvas__header--overall' : ''}`,
      identityModifier: isOverall || isWriting ? ' capability-canvas__identity--overall' : '',
      summaryClass: isOverall || isWriting ? 'overall-summary' : ''
    });
  };

  const capabilityModeMarkup = (category) => {
    const benchmarks = categoryBenchmarks(category.id);
    const trackCount = new Set(benchmarks.map((benchmark) => benchmark.suite)).size;
    const rankedCount = isWriting ? data.entries.filter(entry => entry.condition === TREATMENT_CONDITION_ID && entry.eligibleForRank && Number.isFinite(entry.score)).length : SETTING_COUNT;
    return `${capabilityHeaderMarkup(category)}${capabilityTabsMarkup(category.name, [
      ['models', 'Leaderboard', `${rankedCount} ${isWorkSpec ? 'matched' : 'ranked'} settings`, 'capability-ranking'],
      ['benchmarks', 'Benchmark tests', `${trackCount} ${trackCount === 1 ? 'track' : 'tracks'} · ${benchmarks.length} ${benchmarks.length === 1 ? 'test' : 'tests'}`, 'capability-benchmarks'],
      ['efficiency', 'Efficiency', 'Rubric score × resource', 'capability-efficiency']
    ])}`;
  };

  const efficiencyPanelMarkup = () => `
    <section
      class="capability-efficiency"
      id="capability-efficiency"
      role="tabpanel"
      aria-labelledby="capability-mode-efficiency"
      ${state.capabilityMode === 'efficiency' ? '' : 'hidden'}
    >
      <header class="efficiency-controls">
        <div class="efficiency-controls__label">
          <p class="ui-eyebrow">Efficiency explorer</p>
          <strong>${ENTRY_COUNT} setting × condition results</strong>
        </div>
        <label class="field-control field-control--wide" for="efficiency-entry">
          <span>Selected result</span>
          <select id="efficiency-entry" name="efficiency-entry"></select>
        </label>
        <label class="field-control" for="resource-axis">
          <span>Resource axis</span>
          <select id="resource-axis" name="resource-axis">
            ${Object.entries(metricConfig).filter(([key]) => data.entries.some(entry => Number.isFinite(entry[key]) && entry[key] > 0)).map(([key, metric]) => (
              `<option value="${escapeHtml(key)}"${state.metric === key ? ' selected' : ''}>${escapeHtml(metric.label)}</option>`
            )).join('')}
          </select>
        </label>
      </header>
      <div id="efficiency-view"></div>
    </section>
  `;

  const benchmarkTopModels = new Map();
  const benchmarkTopModelFor = (benchmark, display) => {
    if (benchmarkTopModels.has(benchmark.id)) return benchmarkTopModels.get(benchmark.id);
    let source = data;
    let entries;
    if (display?.publication) {
      // Scope the existing ranking policy to this benchmark, irrespective of
      // the category score selected on the other tab. Cache, do not rewrite it.
      source = buildWritingCategoryCollection(display.publication, benchmark.id);
      const expectedType = display.provisional ? 'provisional' : 'official';
      entries = source.scoreBasis.sources[0]?.type === expectedType ? source.entries : [];
    } else {
      if (isOverall) source = benchmark.category === 'writing'
        ? { settings: data.coverage.records, benchmarkResults: data.benchmarkResults }
        : rootData.benchmarks.some(item => item.id === benchmark.id) ? rootData : workflowData;
      entries = source?.benchmarkResults.filter(entry => entry.benchmarkId === benchmark.id) || [];
    }
    const leader = selectBenchmarkTopModel(source?.settings, entries);
    benchmarkTopModels.set(benchmark.id, leader);
    return leader;
  };

  const formatBenchmarkTopScore = value => formatScore(Math.round((value + 2 * Number.EPSILON * Math.max(1, Math.abs(value))) * 10) / 10);

  const benchmarkTopModelMarkup = (leader, baselineShort = BASELINE_SHORT) => {
    if (!leader) return '';
    const round = value => Math.round((value + 2 * Number.EPSILON * Math.max(1, Math.abs(value))) * 10) / 10;
    return `<span class="benchmark-ledger__leader" data-benchmark-top-model data-setting-id="${escapeHtml(leader.settingId)}" data-configuration-id="${escapeHtml(leader.configurationId)}" data-exact-baseline="${leader.baseline}" data-exact-skill="${leader.skill}" data-exact-delta="${leader.delta}" data-tied-count="${leader.tiedCount}">
      <span class="benchmark-ledger__leader-identity"><small>Top with skill${leader.tiedCount > 1 ? ` · ${leader.tiedCount} tied` : ''}</small><strong data-top-model-label>${escapeHtml(leader.label)}</strong></span>
      <span class="benchmark-ledger__leader-scores"><span>${escapeHtml(baselineShort)} <b data-top-model-baseline>${formatBenchmarkTopScore(leader.baseline)}</b></span><i aria-hidden="true">→</i><span>Skill <b data-top-model-skill>${formatBenchmarkTopScore(leader.skill)}</b></span><span class="benchmark-ledger__leader-delta${leader.delta < 0 ? ' benchmark-ledger__leader-delta--negative' : ''}"><b data-top-model-delta>${signed(round(leader.delta))}</b> pts</span></span>
    </span>`;
  };

  const benchmarkLedgerRowMarkup = (benchmark, categoryIndex, sourceCategoryId) => {
    const display = isWriting ? writingBenchmarkDisplay(benchmark) : isOverall ? data.benchmarkDisplays?.[benchmark.id] : null;
    const summary = display?.summary || benchmarkSummaryById.get(benchmark.id);
    const publication = display?.publication;
    const catalogEntry = isWriting ? data.writingCategory.catalog.find(item => item.id === benchmark.id) : null;
    const writingBenchmark = isWriting || benchmark.category === 'writing';
    const baselineShort = writingBenchmark ? 'Plain' : BASELINE_SHORT;
    const leader = benchmarkTopModelFor(benchmark, display);
    const publishedSettingCount = new Set(data.benchmarkResults.filter(result => result.benchmarkId === benchmark.id).map(result => result.settingId)).size;
    const regression = summary.delta < 0;
    const action = 'Open benchmark report';
    const reportHref = sourceCategoryId === COMBINED_CAPABILITY.id
      ? summary.detailHref.replace('#', '?from=overall#')
      : summary.detailHref;
    return `
      <a
        class="benchmark-ledger__row benchmark-ledger__row--measured${regression ? ' benchmark-ledger__row--regression' : ''}"
        href="${escapeHtml(reportHref)}"
        data-benchmark-id="${escapeHtml(benchmark.id)}"
        ${isWriting ? `data-writing-score-weight="${data.writingCategory.benchmarkWeights[benchmark.id] || 0}"` : ''}
        data-evidence-kind="development"
        ${display ? `data-score-source="${display.sourceKind}" data-writing-setting-count="${display.settingCount}" data-writing-case-count="${publication?.cases.length ?? display.caseCount}" data-writing-trial-count="${display.trials}" data-writing-judge-count="${display.judgeCount || 0}"` : ''}
        data-baseline-score="${formatScore(summary.baseline)}"
        data-treatment-score="${formatScore(summary.treatment)}"
        data-report-href="${escapeHtml(reportHref)}"
        aria-label="${escapeHtml(action)} for ${escapeHtml(benchmark.name)}. Across ${display?.settingCount ?? publishedSettingCount} ${isOverall ? 'published' : 'matched'} settings, ${escapeHtml(summary.baselineLabel)} field mean ${formatScore(summary.baseline)} of ${SCORE_MAXIMUM}, ${escapeHtml(summary.treatmentLabel)} field mean ${formatScore(summary.treatment)} of ${SCORE_MAXIMUM}, paired uplift ${signed(summary.delta)} points.${leader ? ` Top with skill: ${escapeHtml(leader.label)}, ${escapeHtml(baselineShort)} ${formatBenchmarkTopScore(leader.baseline)}, skill ${formatBenchmarkTopScore(leader.skill)}.${leader.tiedCount > 1 ? ` ${leader.tiedCount} models tied for the top skill score.` : ''}` : ''}${display ? ` ${display.provisional ? 'Provisional. ' : ''}${escapeHtml(display.sourceLabel)}.` : ''}"
      >
        <span class="benchmark-ledger__identity">
          <span>${String(categoryIndex + 1).padStart(2, '0')} / ${escapeHtml(isWriting ? benchmark.suite : categoryById.get(benchmark.category)?.name || 'Benchmark')}</span>
          <strong>${escapeHtml(benchmark.name)}</strong>
          <small>${escapeHtml(benchmark.description)}</small>
          ${catalogEntry?.subjectTags?.length ? `<small>${catalogEntry.subjectTags.map(tag => escapeHtml(tag.toLowerCase() === 'dnd' ? 'D&D' : tag)).join(' · ')}</small>` : ''}
        </span>
        ${Number.isFinite(summary.baseline) && Number.isFinite(summary.treatment) ? `<span class="benchmark-ledger__comparison">
          <span><small${writingBenchmark ? ' title="Average across model settings"' : ''}>${escapeHtml(baselineShort)} ${writingBenchmark ? 'average' : 'field mean'}</small><strong>${formatScore(summary.baseline)}</strong></span>
          <i aria-hidden="true">→</i>
          <span><small title="${escapeHtml(writingBenchmark ? 'Average across model settings' : summary.treatmentLabel)}">Skill ${writingBenchmark ? 'average' : 'field mean'}</small><strong>${formatScore(summary.treatment)}</strong></span>
          <b>${signed(summary.delta)}<small> pts</small></b>
          ${benchmarkTopModelMarkup(leader, baselineShort)}
        </span>` : '<span class="benchmark-ledger__comparison">Answers &amp; reviews</span>'}
        <span class="benchmark-ledger__evidence">
          ${isOverall && !display ? `<span data-published-setting-count="${publishedSettingCount}">Published cohort · ${publishedSettingCount} settings</span>` : ''}
          <strong>${display ? `${display.settingCount} model settings` : `${summary.complete}/${summary.total} ${escapeHtml(summary.completionLabel)}`}</strong>
          ${display ? `<span>${escapeHtml(display.cohort)}</span><span>${display.judgeCount || 0} ${display.judgeCount === 1 ? 'review' : 'reviews'} / answer</span>` : `<span>${summary.wins}W · ${summary.ties}T · ${summary.losses}L</span><span title="${escapeHtml(summary.runId || '')}">Run ${escapeHtml((summary.runId || 'not published').split('__')[0])}</span>`}
        </span>
        <span class="benchmark-ledger__action">${escapeHtml(action)} <span aria-hidden="true">→</span></span>
      </a>
    `;
  };

  const writingBenchmarkModelLinkMarkup = benchmark => {
    const selection = data.writingCategory.selections.find(option => option.type === 'benchmark' && option.id === benchmark.id)
      || data.writingCategory.selections.find(option => option.type === 'track' && option.benchmarkIds.length === 1 && option.benchmarkIds[0] === benchmark.id);
    const source = data.writingCategory.sourceCoverage.find(item => item.benchmarkId === benchmark.id);
    const url = new URL(writingScoreHref(selection.id));
    url.hash = '#capabilities/writing';
    return `<div class="writing-benchmark-model-link"><a data-writing-compare-models="${escapeHtml(benchmark.id)}" href="${escapeHtml(url.href)}">Compare ${source.plannedSettingCount} model settings →</a></div>`;
  };

  const benchmarkLedgerMarkup = (category, hidden = false) => {
    const benchmarks = categoryBenchmarks(category.id);
    const suiteNames = [...new Set(benchmarks.map((benchmark) => benchmark.suite))];
    let visibleBenchmarkIndex = 0;
    return `
      <section
        class="benchmark-ledger"
        id="capability-benchmarks"
        ${isWriting ? `data-writing-presentation="${overallWritingCategory ? 'writing-overall-v3-v1' : 'writing-benchmark-leaders-v1'}" data-writing-field-means` : ''}
        role="tabpanel"
        aria-labelledby="capability-mode-benchmarks"
        ${hidden ? 'hidden' : ''}
        style="--category-color:${category.color}"
      >
        <h4 class="visually-hidden">${escapeHtml(category.name)} benchmark tests</h4>
        ${isOverall ? '<p class="overall-ledger-note">Task means retain each benchmark’s published cohort. Overall ranks use settings with every task completed under both conditions.</p>' : ''}
        <div class="benchmark-ledger__tracks">
          ${suiteNames.map((suite, suiteIndex) => {
            const suiteBenchmarks = benchmarks.filter((benchmark) => benchmark.suite === suite);
            const suiteMeasured = suiteBenchmarks.filter(benchmarkIsMeasured).length;
            return `
              <section class="benchmark-ledger__track" ${isWriting ? `data-writing-track="${escapeHtml(data.writingCategory.groups.find(group => group.name === suite)?.id || suite)}"` : ''} aria-labelledby="benchmark-track-${category.id}-${suiteIndex}">
                <header class="benchmark-ledger__track-header">
                  <span>${String(suiteIndex + 1).padStart(2, '0')} / TRACK</span>
                  <div>
                    <h4 id="benchmark-track-${category.id}-${suiteIndex}"${isWriting ? ' tabindex="-1"' : ''}>${escapeHtml(suite)}</h4>
                    <p>${escapeHtml(suiteDescriptions[suite] || data.tracks?.find(track => track.title === suite)?.description || '')}</p>
                  </div>
                  <strong>${suiteBenchmarks.length} tests · ${suiteMeasured} scored</strong>
                </header>
                <div class="benchmark-ledger__rows">
                  ${suiteBenchmarks.map((benchmark) => benchmarkLedgerRowMarkup(benchmark, visibleBenchmarkIndex++, category.id) + (isWriting ? writingBenchmarkModelLinkMarkup(benchmark) : '')).join('')}
                </div>
              </section>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const settingRowMarkup = (fullEntry, baselineRanks, fullRanks) => {
    const baselineEntry = baselineBySetting.get(fullEntry.settingId);
    const baselineRank = baselineRanks.get(baselineEntry.id);
    const fullRank = fullRanks.get(fullEntry.id);
    const delta = isOverall || isWriting ? fullEntry.delta : Math.round((fullEntry.score - baselineEntry.score) * 10) / 10;
    const selected = selectedEntry().settingId === fullEntry.settingId;
    const compositionDescriptionId = `paired-composition-description-${fullEntry.settingId}`;
    const baselineDescription = weightedCompositionDescription(weightedComposition(baselineEntry));
    const fullDescription = weightedCompositionDescription(weightedComposition(fullEntry));
    const deltaClass = delta < 0 ? ' setting-row__delta--negative' : '';

    return `
      <li
        class="setting-row${selected ? ' is-selected' : ''}"
        id="row-${escapeHtml(fullEntry.settingId)}"
        data-setting-id="${escapeHtml(fullEntry.settingId)}"
        data-baseline-entry-id="${escapeHtml(baselineEntry.id)}"
        data-full-entry-id="${escapeHtml(fullEntry.id)}"
        data-baseline-score="${baselineEntry.score.toFixed(1)}"
        data-full-score="${fullEntry.score.toFixed(1)}"
        data-baseline-rank="${baselineRank}"
        data-full-rank="${fullRank}"
        data-delta="${delta.toFixed(1)}"
      >
        <div class="setting-row__layout">
          <button
            class="setting-row__select"
            type="button"
            data-entry-id="${escapeHtml(fullEntry.id)}"
            aria-pressed="${selected}"
            aria-describedby="${escapeHtml(compositionDescriptionId)}"
            aria-label="Select ${escapeHtml(fullEntry.family)}, ${escapeHtml(fullEntry.reasoning)} reasoning. ${escapeHtml(TREATMENT_LABEL)} ${SCORE_EDITION_LABEL} score ${formatScore(fullEntry.score)} of ${SCORE_MAXIMUM}; skill rank ${fullRank} of ${RANKED_SETTING_COUNT}. ${escapeHtml(BASELINE_LABEL)} score ${formatScore(baselineEntry.score)} of ${SCORE_MAXIMUM}; baseline rank ${baselineRank} of ${RANKED_SETTING_COUNT}. Paired uplift ${signed(delta)} points. ${escapeHtml(taskCoverageLabel)}."
          >
            <span class="setting-row__identity">
              <span class="setting-row__rank" aria-hidden="true">${String(fullRank).padStart(2, '0')}</span>
              <span class="setting-row__model">
                <strong>${escapeHtml(fullEntry.family)}</strong>
                <span>${escapeHtml(fullEntry.reasoning)}</span>
                <small>${isWriting ? `Skill #${String(fullRank).padStart(2, '0')} · Plain #${String(baselineRank).padStart(2, '0')}` : `Skill rank #${String(fullRank).padStart(2, '0')} · baseline rank #${String(baselineRank).padStart(2, '0')}`}</small>
              </span>
            </span>
            <span class="setting-row__disclosure">${selected ? 'Selected' : 'Select'} <span aria-hidden="true">${selected ? '●' : '→'}</span></span>
          </button>
          <span class="setting-row__pair">
            ${capabilityCompositionMarkup(fullEntry, fullRank, fullEntry.id)}
            ${capabilityCompositionMarkup(baselineEntry, baselineRank, fullEntry.id)}
          </span>
          <span class="setting-row__delta${deltaClass}"><strong>${signed(delta)}</strong><span>pts</span></span>
        </div>
        <span class="visually-hidden" id="${escapeHtml(compositionDescriptionId)}">Both profiles use the ${SCORE_EDITION_LABEL} ${SCORE_MINIMUM} to ${SCORE_MAXIMUM} scale. ${escapeHtml(TREATMENT_LABEL)} profile: ${escapeHtml(fullDescription)}. ${escapeHtml(BASELINE_LABEL)} profile: ${escapeHtml(baselineDescription)}. Rank is secondary and condition-specific. Each colored segment opens its ${isWriting ? 'subcategory benchmark tests' : 'category leaderboard'}.</span>
      </li>
    `;
  };

  const overallCategoryHref = (categoryId, configurationId) => {
    const url = new URL('./index.html', window.location.href);
    url.hash = `#capabilities/${categoryId}`;
    url.searchParams.set('setting', configurationId);
    url.searchParams.set('inspect', '1');
    if (categoryId === 'writing') url.searchParams.set('score', 'all-writing');
    return url.href;
  };

  const overallCoverageMarkup = () => {
    const incomplete = data.coverage.records.filter(record => !record.eligible && (state.overallProvider === 'all' || record.provider === state.overallProvider))
      .sort((a, b) => a.family.localeCompare(b.family) || a.reasoning.localeCompare(b.reasoning));
    if (!incomplete.length) return '';
    return `
      <details class="overall-coverage" id="overall-available" data-incomplete-count="${incomplete.length}" data-overall-coverage-display="coverage-summary-v1">
        <summary id="overall-coverage-title">Model coverage <span>${incomplete.length} settings have partial coverage</span></summary>
        <p class="overall-coverage__note">Overall ranks require every benchmark in both conditions. These settings have results in individual categories; an Overall score is unavailable.</p>
        <ul class="overall-coverage__list">
          ${incomplete.map(record => {
            const categories = buildOverallAvailableCategories(data, record);
            return `
              <li class="overall-coverage__row" data-incomplete-setting-id="${escapeHtml(record.id)}">
                <div class="overall-coverage__identity"><strong>${escapeHtml(record.family)}</strong><span>${escapeHtml(record.reasoning)}</span></div>
                <div class="overall-coverage__evidence">${categories.map(reading => `<a href="${escapeHtml(overallCategoryHref(reading.category.id, reading.configurationId))}" data-overall-category="${escapeHtml(reading.category.id)}" data-category-complete="${reading.complete}" data-category-exact-baseline="${reading.scores.baseline}" data-category-exact-skill="${reading.scores.skill}" data-available-tests="${reading.available}/${reading.expected}"><span>${escapeHtml(reading.category.name)}</span><span>${reading.complete ? `Plain ${formatScore(reading.scores.baseline)} → Skill ${formatScore(reading.scores.skill)}` : `${reading.available}/${reading.expected} tests scored`}</span></a>`).join('')}</div>
              </li>
            `;
          }).join('')}
        </ul>
      </details>
    `;
  };

  const combinedLeaderboardMarkup = () => {
    const baselineRanking = rankedCondition(BASELINE_CONDITION_ID);
    const fullRanking = rankedCondition(TREATMENT_CONDITION_ID);
    const rankedEntries = isWriting ? fullRanking.entries.filter(entry => Number.isFinite(entry.score)) : fullRanking.entries.filter(entry => !isOverall || state.overallProvider === 'all' || entry.provider === state.overallProvider);
    const visible = state.showAll
      ? rankedEntries
      : rankedEntries.slice(0, INITIAL_RESULT_COUNT);
    const disclosureLabel = state.showAll
      ? `Show top ${INITIAL_RESULT_COUNT} settings ↑`
      : `Show all ${rankedEntries.length} ${isOverall ? 'ranked ' : ''}settings ↓`;

    return `
      <section
        class="capability-ranking capability-ranking--combined"
        id="capability-ranking"
        role="tabpanel"
        aria-labelledby="capability-mode-models"
        ${state.capabilityMode === 'models' ? '' : 'hidden'}
      >
        ${isOverall ? `<div class="overall-model-filter"><label for="overall-model-provider">Models <select id="overall-model-provider"><option value="all"${state.overallProvider === 'all' ? ' selected' : ''}>All models</option>${[...new Set(data.coverage.records.map(record => record.provider))].sort().map(provider => `<option value="${escapeHtml(provider)}"${state.overallProvider === provider ? ' selected' : ''}>${escapeHtml(provider === 'claude' ? 'Claude' : provider === 'codex' ? 'GPT' : provider)}</option>`).join('')}</select></label><span>${rankedEntries.length} ranked${data.coverage.records.some(record => !record.eligible && (state.overallProvider === 'all' || record.provider === state.overallProvider)) ? ' · <a href="#overall-available" data-overall-available-link>Model coverage ↓</a>' : ''}</span></div>` : ''}
        <section class="score-field score-field--combined" aria-labelledby="score-field-title">
          <h3 class="visually-hidden" id="score-field-title">${isWriting ? 'Writing' : 'Overall'} model leaderboard</h3>

          <div class="score-axis-header">
            <span class="score-axis-header__identity">Model setting / skill rank</span>
            <div class="score-axis-header__profile">
              <div class="score-axis-header__profile-title">
                <strong>${escapeHtml(isWriting ? 'Writing' : SCORE_EDITION_LABEL)} score <span>${escapeHtml(TREATMENT_LABEL)} vs ${escapeHtml(BASELINE_LABEL)} · ${escapeHtml(taskCoverageLabel)}</span></strong>
                <span>${isWriting ? 'Writing' : 'Overall'} /${SCORE_MAXIMUM}</span>
              </div>
              <div class="capability-legend" aria-label="Weighted capability categories">
                ${data.categories.map((category) => `
                  <span class="capability-legend__item capability-legend__item--${escapeHtml(category.id)}" data-category-weight="${category.weight}"><i aria-hidden="true"${isWriting ? ` style="background:${escapeHtml(category.color)}"` : ''}></i><span class="capability-legend__long">${escapeHtml(category.name)}${isOverall || isWriting ? ` ${formatWeight(category.weight)}` : ''}</span><span class="capability-legend__short">${escapeHtml(category.short)}${isOverall || isWriting ? ` ${formatWeight(category.weight)}` : ''}</span></span>
                `).join('')}
              </div>
            </div>
            <span class="score-axis-header__effect">Uplift</span>
          </div>

          <ol class="result-list" id="result-list" aria-label="Matched model and reasoning settings ordered by ${escapeHtml(TREATMENT_LABEL)} ${SCORE_EDITION_LABEL} score. Each row compares Minimal baseline and ${escapeHtml(TREATMENT_LABEL)} on one shared ${SCORE_MINIMUM}-to-${SCORE_MAXIMUM} scale; condition-specific ranks are secondary.">
            ${visible.map((entry) => settingRowMarkup(entry, baselineRanking.ranks, fullRanking.ranks)).join('')}
          </ol>
          ${!rankedEntries.length ? '<p class="overall-filter-empty">No complete Overall scores yet. Available category results are below.</p>' : ''}
          <div class="capability-score-guide" aria-hidden="true">
            <span class="capability-score-guide__line"></span>
            <span class="capability-score-guide__readout"><strong>0.0</strong><small>/${SCORE_MAXIMUM}</small></span>
          </div>
          ${(!isOverall && !isWriting) || rankedEntries.length > INITIAL_RESULT_COUNT ? `<button class="show-all" id="show-all" type="button" aria-expanded="${state.showAll}">${escapeHtml(disclosureLabel)}</button>` : ''}
        </section>
        ${isOverall ? overallCoverageMarkup() : ''}
        ${writingSelectionMarkup()}
      </section>
    `;
  };

  const gameScore = run => Number.isFinite(run?.score?.value) ? run.score.value : null;
  const gameReportHref = (report, configurationId, fragment = '') => `./games.html?benchmark=${encodeURIComponent(report.benchmark.id)}${configurationId ? `&model=${encodeURIComponent(configurationId)}` : ''}${fragment ? `#${fragment}` : ''}`;
  const gameStatus = run => run?.status === 'timeout' ? 'Generation limit reached' : run?.status === 'complete' ? 'Generation completed' : run?.status === 'reference' ? 'Existing artifact' : 'Generation incomplete';
  const gameDisplayScore = run => gameScore(run) ?? (run?.judgments?.length === 1 && Number.isFinite(run.judgments[0].score) ? run.judgments[0].score : null);
  const gameIndividual = run => gameScore(run) === null && gameDisplayScore(run) !== null;
  const gameEligible = run => gameScore(run) !== null && run.score.eligible === true;
  const gameRankReason = run => gameScore(run) === null ? 'Rank awaits two complete reviews' : run.score.eligible === false ? 'Diagnostic score: a required functional gate failed' : 'No rank: functional verification is incomplete';
  const gameSettingCount = new Set(gameRuns.map(run => run.configurationId)).size;
  const gameOrder = report => [...report.configurations].sort((a,b) => {
    const run = configuration => report.runs.find(item => item.configurationId === configuration.id && item.conditionId === report.conditions[1].id);
    return Number(gameEligible(run(b))) - Number(gameEligible(run(a))) || (gameDisplayScore(run(b)) ?? -1) - (gameDisplayScore(run(a)) ?? -1);
  });
  const gameRank = (report,run) => !gameEligible(run) ? null : 1 + report.runs.filter(item => item.conditionId === run.conditionId && gameEligible(item) && gameScore(item) > gameScore(run)).length;
  const gameSelections = new Map(gameBenchmarks.map(report => [report.benchmark.id, report.runs.find(run => run.configurationId === gameOrder(report)[0]?.id && run.conditionId === report.conditions[1].id)?.id || report.runs[0]?.id]));
  const gameSelectedRun = report => report.runs.find(run => run.id === gameSelections.get(report.benchmark.id)) || report.runs[0];
  const gameScoreAttributes = run => `data-game-run-id="${escapeHtml(run?.id || '')}" data-game-score="${gameScore(run) ?? ''}" data-game-display-score="${gameDisplayScore(run) ?? ''}" data-game-individual="${gameIndividual(run)}"`;
  const gameScoreText = run => `${formatScore(gameDisplayScore(run))}${gameIndividual(run) ? '†' : ''}`;
  const gameReadingMarkup = (report,run,condition,visual) => {
    const rank = gameRank(report,run);
    return `<span class="capability-rank-row__reading capability-rank-row__reading--${visual}" ${gameScoreAttributes(run)} data-game-rank="${rank ?? ''}"><span class="capability-rank-row__condition-label"><i aria-hidden="true"></i><span>${escapeHtml(condition === 'With Vasir' ? 'Vasir' : condition)}</span></span><strong>${gameScoreText(run)}</strong><small title="${rank === null ? gameRankReason(run) : 'Rank within this condition'}">${rank !== null ? '#'+rank : gameScore(run) !== null ? run.score.eligible === false ? 'Diag.' : 'No rank' : gameIndividual(run) ? '1 judge' : 'Pending'}</small></span>`;
  };
  const gamePairDelta = runs => runs.length === 2 && runs.every(run => gameScore(run) !== null) ? gameScore(runs[1]) - gameScore(runs[0]) : null;
  const gameRowMarkup = (report, configuration) => {
    const runs = report.conditions.map(condition => report.runs.find(run => run.configurationId === configuration.id && run.conditionId === condition.id));
    const values = runs.map(gameDisplayScore);
    const delta = gamePairDelta(runs);
    const rank = gameRank(report,runs[1]);
    const selected = gameSelectedRun(report)?.configurationId === configuration.id;
    const both = values.every(Number.isFinite);
    const deltaTitle = delta === null ? 'Score difference awaits two complete review panels' : configuration.comparison?.controlled === false ? `${configuration.comparison.reason} Descriptive score difference, not a controlled skill-effect estimate.` : 'Difference in artifact quality scores';
    return `<li class="capability-rank-row${selected ? ' is-selected' : ''}${delta < 0 ? ' is-regression' : ''}" data-game-configuration="${escapeHtml(configuration.id)}" data-game-rank="${rank ?? ''}" data-game-delta="${delta ?? ''}" style="--baseline-score:${values[0] ?? 0}%;--full-score:${values[1] ?? 0}%;--connector-start:${both ? Math.min(...values) : 0}%;--connector-width:${both ? Math.max(Math.abs(values[1] - values[0]), 0.25) : 0}%">
      <button class="capability-rank-row__select" type="button" data-game-select="${escapeHtml(configuration.id)}" data-game-report-id="${escapeHtml(report.benchmark.id)}" data-game-selection-kind="configuration" aria-pressed="${selected}" aria-label="Select ${escapeHtml(configuration.label)}, ${escapeHtml(configuration.reasoning)}. ${report.conditions.map((condition,index) => `${escapeHtml(condition.label)} ${gameScoreText(runs[index])}${gameIndividual(runs[index]) ? ', individual review' : !gameEligible(runs[index]) ? ', '+gameRankReason(runs[index]) : ''}`).join('; ')}.">
        <span class="capability-rank-row__identity"><span class="capability-rank-row__position" title="${rank === null ? gameRankReason(runs[1]) : 'With-Vasir artifact quality rank'}">${rank === null ? '—' : '#'+String(rank).padStart(2,'0')}</span><span class="capability-rank-row__model"><strong>${escapeHtml(configuration.label)}</strong><small>${escapeHtml(configuration.reasoning)}</small></span></span>
        <span class="capability-rank-row__track" role="img" aria-label="Bare circle and with-Vasir square on a shared 0–100 scale"><span class="capability-rank-row__axis" aria-hidden="true"></span>${both ? '<span class="capability-rank-row__connector" aria-hidden="true"></span>' : ''}${Number.isFinite(values[0]) ? '<span class="capability-rank-row__marker capability-rank-row__marker--baseline" aria-hidden="true"></span>' : ''}${Number.isFinite(values[1]) ? '<span class="capability-rank-row__marker capability-rank-row__marker--full" aria-hidden="true"></span>' : ''}</span>
        ${runs.map((run,index) => gameReadingMarkup(report,run,report.conditions[index].label,index ? 'full':'baseline')).join('')}
        <strong class="capability-rank-row__delta" title="${escapeHtml(deltaTitle)}">${signed(delta)}<small>pts</small></strong>
      </button></li>`;
  };
  const gameHeaderMarkup = () => {
    const report = gameBenchmarks.length === 1 ? gameBenchmarks[0] : null;
    const readings = report ? [...report.conditions].reverse().map((condition,index) => {
      const leader = report.runs.filter(run => run.conditionId === condition.id && gameEligible(run)).sort((a,b) => gameScore(b)-gameScore(a))[0];
      const configuration = report.configurations.find(item => item.id === leader?.configurationId);
      return `<div class="capability-canvas__reading capability-canvas__reading--${index ? 'baseline':'full'}" data-game-leader-condition="${escapeHtml(condition.id)}" data-game-leader-run="${escapeHtml(leader?.id || '')}" data-game-leader-score="${gameScore(leader) ?? ''}"><dt>${escapeHtml(condition.label)} leader /100</dt><dd>${formatScore(gameScore(leader))}<small>${configuration ? `${escapeHtml(configuration.label)} · ${escapeHtml(configuration.reasoning)}` : 'No eligible complete panel'}</small></dd></div>`;
    }).join('') : `<div class="capability-canvas__reading capability-canvas__reading--measured"><dt>Benchmark tests</dt><dd>${gameBenchmarks.length}<small>published tasks</small></dd></div><div class="capability-canvas__reading capability-canvas__reading--audit"><dt>Complete review panels</dt><dd>${gameRuns.filter(run => gameScore(run) !== null).length}<small>of ${gameRuns.length} outputs</small></dd></div>`;
    return capabilityHeaderFrameMarkup({
      name: 'Games', identityLabel: `Capabilities / Games / ${state.capabilityMode === 'benchmarks' ? 'Benchmark tests' : state.capabilityMode === 'efficiency' ? 'Efficiency' : 'Leaderboard'}`,
      disclosure: 'Games v1 pilot · Artifact quality · 2 judges',
      summary: `${gameSettingCount} model settings · ${gameRuns.length} outputs · ${gameBenchmarks.length} ${gameBenchmarks.length === 1 ? 'benchmark' : 'benchmarks'}`,
      readings, headerModifier: ' capability-canvas__header--games', identityModifier: ' capability-canvas__identity--games', development: true
    });
  };
  const gameModeMarkup = () => `${gameHeaderMarkup()}${capabilityTabsMarkup('Games', [
    ['models', 'Leaderboard', `${gameSettingCount} model settings`, 'capability-ranking'],
    ['benchmarks', 'Benchmark tests', `${gameBenchmarks.length} ${gameBenchmarks.length === 1 ? 'test' : 'tests'}`, 'capability-benchmarks'],
    ...(hasGameEffort ? [['efficiency', 'Efficiency', 'Ratings × generation time', 'capability-efficiency']] : [])
  ])}`;
  const gameModelsMarkup = () => `<section class="capability-ranking" id="capability-ranking" role="tabpanel" aria-labelledby="capability-mode-models" ${state.capabilityMode === 'models' ? '' : 'hidden'}>${gameBenchmarks.map(report => {
    const configuration = report.configurations.find(item => item.id === gameSelectedRun(report)?.configurationId);
    return `<section data-game-benchmark-id="${escapeHtml(report.benchmark.id)}" aria-label="${escapeHtml(report.benchmark.title)} leaderboard"><header class="game-capability__task-header"><h4>${escapeHtml(report.benchmark.title)}</h4><a class="game-capability__report" data-game-selected-report href="${gameReportHref(report,configuration?.id,'game-comparison')}">Watch ${escapeHtml(configuration?.label || 'selected game')} →</a></header>
      <div class="capability-ranking__axis" aria-hidden="true"><span>Model / reasoning</span><span class="capability-ranking__ticks"><span class="capability-ranking__scale-label">Rubric / 100</span><span class="capability-ranking__scale-values"><i>0</i><i>25</i><i>50</i><i>75</i><i>100</i></span></span>${report.conditions.map((condition,index) => `<span class="capability-ranking__condition-heading"><i class="capability-key__${index ? 'full':'baseline'}"></i>${escapeHtml(condition.label)}</span>`).join('')}<span>Score Δ</span></div>
      <ol class="capability-ranking__rows" aria-label="Ranked by eligible complete with-Vasir artifact scores">${gameOrder(report).map(config => gameRowMarkup(report,config)).join('')}</ol>
      <p class="game-capability__note">Ranks require complete reviews with passed functional gates; ties share rank. ${report.runs.some(gameIndividual) ? '† Individual review; combined panel incomplete. ' : ''}Score Δ compares artifact quality. <a href="${gameReportHref(report,null,'game-method')}">Methodology</a></p></section>`;
  }).join('')}</section>`;
  const gameBenchmarksMarkup = () => `<section class="benchmark-ledger" id="capability-benchmarks" role="tabpanel" aria-labelledby="capability-mode-benchmarks" ${state.capabilityMode === 'benchmarks' ? '' : 'hidden'}><h4 class="visually-hidden">Games benchmark tests</h4><div class="benchmark-ledger__tracks"><section class="benchmark-ledger__track"><header class="benchmark-ledger__track-header"><span>01 / TRACK</span><div><h4>Game creation</h4><p>Playable games from a single request. Inspect control, visual craft, action feedback and the actual output.</p></div><strong>${gameBenchmarks.length} ${gameBenchmarks.length === 1 ? 'test' : 'tests'}</strong></header><div class="benchmark-ledger__rows">${gameBenchmarks.map((report, index) => {
    const panels = report.runs.filter(run => gameScore(run) !== null).length;
    return `<a class="benchmark-ledger__row benchmark-ledger__row--measured" href="${gameReportHref(report)}" data-benchmark-id="${escapeHtml(report.benchmark.id)}" data-game-report-link data-report-href="${gameReportHref(report)}"><span class="benchmark-ledger__identity"><span>${String(index + 1).padStart(2, '0')} / Games</span><strong>${escapeHtml(report.benchmark.title)}</strong><small>${escapeHtml(report.benchmark.prompt)}</small></span><span class="game-capability__benchmark-reading"><strong>${report.configurations.length}</strong><span>model configurations</span><strong>${report.runs.length}</strong><span>outputs</span></span><span class="benchmark-ledger__evidence"><strong>${panels}/${report.runs.length} complete review panels</strong><span>${report.runs.filter(run => run.status === 'complete').length} generations completed</span><span>${report.runs.filter(run => run.status === 'timeout').length} reached the time limit</span></span><span class="benchmark-ledger__action">Open benchmark report <span aria-hidden="true">→</span></span></a>`;
  }).join('')}</div></section></div></section>`;
  const gameEfficiencyMarkup = () => hasGameEffort ? `<section class="capability-efficiency" id="capability-efficiency" role="tabpanel" aria-labelledby="capability-mode-efficiency" ${state.capabilityMode === 'efficiency' ? '' : 'hidden'}>${gameBenchmarks.map(report => {
    const current = gameSelectedRun(report);
    const selected = report.runs.find(run => run.id === current?.id) || report.runs[0];
    const configFor = run => report.configurations.find(config => config.id === run.configurationId);
    const conditionFor = run => report.conditions.find(condition => condition.id === run.conditionId);
    const maximum = Math.max(60, ...report.runs.map(run => (run.metrics?.durationMs || 0) / 60000));
    const position = run => ({ x: 100 * (run.metrics.durationMs / 60000) / maximum, y: 100 - gameDisplayScore(run) });
    const plotted = report.runs.filter(run => Number.isFinite(run.metrics?.durationMs) && run.metrics.durationMs > 0 && gameDisplayScore(run) !== null);
    const ticks = [0, 25, 50, 75, 100];
    const config = configFor(selected);
    const condition = conditionFor(selected);
    const selectedPosition = plotted.includes(selected) ? position(selected) : null;
    return `<section data-game-efficiency-benchmark="${escapeHtml(report.benchmark.id)}"><header class="efficiency-controls"><div class="efficiency-controls__label"><p class="ui-eyebrow">Efficiency explorer</p><strong>${escapeHtml(report.benchmark.title)}</strong></div><label class="field-control field-control--wide"><span>Selected result</span><select data-game-efficiency-entry data-game-report-id="${escapeHtml(report.benchmark.id)}">${report.runs.map(run => `<option value="${escapeHtml(run.id)}" ${run.id === selected.id ? 'selected' : ''}>${escapeHtml(configFor(run)?.label)} · ${escapeHtml(configFor(run)?.reasoning)} · ${escapeHtml(conditionFor(run)?.label)}</option>`).join('')}</select></label><div class="efficiency-controls__label"><span>Resource axis</span><strong>Generation wall time</strong></div></header>
      <div class="efficiency-story"><section class="efficiency-field"><header class="efficiency-field__heading"><div><p class="ui-eyebrow">Rubric score × generation time</p><h4>${plotted.length} observed game results</h4><p>${report.runs.some(gameIndividual) ? '† Individual review. ' : ''}Capped runs show elapsed time, not completion time.</p></div><div class="efficiency-legend" aria-label="Chart legend">${report.conditions.map((item,index) => `<span class="condition-label"><i class="condition-mark condition-mark--${index ? 'full' : 'baseline'}" aria-hidden="true"></i>${escapeHtml(item.label)}</span>`).join('')}</div></header>
        <div class="efficiency-plane"><div class="efficiency-plane__plot"><span class="efficiency-plane__axis-label efficiency-plane__axis-label--y">Higher rubric score ↑ · fixed 0–100</span><div class="efficiency-plane__canvas" data-game-plot="${escapeHtml(report.benchmark.id)}" data-selected-id="${escapeHtml(selected.id)}"><svg class="efficiency-plane__grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${ticks.map(tick => `<line class="efficiency-plane__grid-line efficiency-plane__grid-line--x" x1="${tick}" y1="0" x2="${tick}" y2="100"></line><line class="efficiency-plane__grid-line efficiency-plane__grid-line--y" x1="0" y1="${tick}" x2="100" y2="${tick}"></line>`).join('')}${selectedPosition ? `<line class="efficiency-plane__selection-guide" x1="0" y1="${selectedPosition.y}" x2="${selectedPosition.x}" y2="${selectedPosition.y}"></line><line class="efficiency-plane__selection-guide" x1="${selectedPosition.x}" y1="${selectedPosition.y}" x2="${selectedPosition.x}" y2="100"></line>` : ''}</svg>
        <div class="efficiency-plane__points" role="group" aria-label="Game results; arrow keys move between points">${plotted.map(run => {
          const {x,y}=position(run); const visual=run.conditionId===report.conditions[0].id?'baseline':'full';
          const label=`${configFor(run)?.label}, ${configFor(run)?.reasoning}, ${conditionFor(run)?.label}. ${gameScoreText(run)} /100${gameIndividual(run)?', individual review':!gameEligible(run)?', '+gameRankReason(run):''}. ${(run.metrics.durationMs/60000).toFixed(1)} minutes. ${gameStatus(run)}.`;
          return `<button class="plot-point plot-point--${visual}${run.id === selected.id ? ' is-selected' : run.configurationId === selected.configurationId ? ' is-counterpart' : ''}" type="button" data-game-select="${escapeHtml(run.id)}" data-game-report-id="${escapeHtml(report.benchmark.id)}" data-game-selection-kind="run" data-game-effort-run="${escapeHtml(run.id)}" data-game-duration-ms="${run.metrics.durationMs}" data-game-status="${escapeHtml(run.status)}" ${gameScoreAttributes(run)} data-plot-x="${x}" data-plot-y="${y}" style="left:${x}%;top:${y}%" tabindex="${run.id === selected.id || (!selectedPosition && run.id === plotted[0]?.id) ? '0' : '-1'}" aria-pressed="${run.id === selected.id}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"></button>`;
        }).join('')}</div><div class="efficiency-plane__pointer-layer efficiency-plane__pointer-layer--games" data-game-pointer aria-hidden="true"></div><div class="efficiency-plane__y-ticks" aria-hidden="true">${ticks.map(tick=>`<span style="top:${100-tick}%">${tick}</span>`).join('')}</div><div class="efficiency-plane__x-ticks" aria-hidden="true">${ticks.map(tick=>`<span style="left:${tick}%">${(maximum*tick/100).toFixed(0)}m</span>`).join('')}</div></div><span class="efficiency-plane__axis-label efficiency-plane__axis-label--x">Generation wall time · minutes · linear scale</span></div><p class="efficiency-plane__reading">${report.runs.some(gameIndividual) ? '† One review. ' : ''}Only outputs with recorded generation time are plotted. ${plotted.length < report.runs.length ? `${report.runs.length-plotted.length} ${report.runs.length-plotted.length === 1 ? 'run lacks' : 'runs lack'} a rating or duration; inspect them in Selected result.` : ''}</p></div>
      </section><aside class="efficiency-summary" data-game-selected-run="${escapeHtml(selected.id)}"><header class="selected-result-heading"><div><p class="ui-eyebrow">Selected configuration</p><h4>${escapeHtml(config?.label)} · ${escapeHtml(config?.reasoning)}</h4><span class="efficiency-summary__status">${escapeHtml(condition?.label)}</span></div><span class="efficiency-summary__score" ${gameScoreAttributes(selected)}><strong>${gameScoreText(selected)}</strong><small title="${gameScore(selected) !== null && !gameEligible(selected) ? gameRankReason(selected) : ''}">${gameIndividual(selected)?'Individual · 1 of 2 reviews':gameScore(selected)===null?'Review unavailable':!gameEligible(selected)?selected.score.eligible===false?'Diagnostic · 2 reviews':'Unverified · 2 reviews':'Combined · 2 reviews'}</small></span></header><dl class="efficiency-summary__resources"><div><dt>Wall time</dt><dd>${Number.isFinite(selected.metrics?.durationMs)?(selected.metrics.durationMs/60000).toFixed(1)+' min':'Unavailable'}</dd></div><div><dt>Generation</dt><dd>${selected.status==='timeout'?'Capped':selected.status==='complete'?'Completed':selected.status==='reference'?'Provided':'Incomplete'}</dd><span>${gameStatus(selected)}</span></div><div><dt>Combined score</dt><dd>${formatScore(gameScore(selected))}</dd><span>Out of 100</span></div></dl><a class="efficiency-summary__alternative" data-game-selected-report href="${gameReportHref(report,selected.configurationId,'game-comparison')}"><span class="ui-eyebrow">Inspect this output</span><span class="efficiency-summary__alternative-identity"><strong>Watch & play →</strong></span><span>Recording, playable game and full review evidence</span></a></aside></div></section>`;
  }).join('')}</section>` : '';

  const capabilitySelectorMarkup = () => `
    <nav class="capability-selector" aria-label="Choose a capability">
      <header class="capability-selector__header">
        <strong>Capabilities</strong>
        <span>
          <i class="condition-mark condition-mark--full" aria-hidden="true"></i>
          <span class="capability-selector__instruction capability-selector__instruction--long">${workflowData ? 'Task-local skill' : `Best ${escapeHtml(TREATMENT_LABEL)}`} /${SCORE_MAXIMUM}</span>
          <span class="capability-selector__instruction capability-selector__instruction--short">Best /${SCORE_MAXIMUM}</span>
        </span>
      </header>
      <div class="capability-selector__tabs" role="tablist" aria-label="Capability score fields" aria-orientation="${capabilityIndexMedia.matches ? 'vertical' : 'horizontal'}">
        ${selectorFields.map((category, categoryIndex) => {
          if (category.id === 'games' && gameBenchmarks.length) {
            const scores = gameBenchmarks.length === 1 ? gameRuns.filter(run => run.conditionId === 'vasir' && gameEligible(run)).map(run => run.score?.value).filter(Number.isFinite) : [];
            const best = scores.length ? Math.max(...scores) : null;
            const selected = category.id === state.capabilityCategory;
            return `<button class="capability-selector__tab${selected ? ' is-selected' : ''}" id="capability-category-games" type="button" role="tab" aria-selected="${selected}" aria-controls="capability-field-panel" tabindex="${selected ? '0' : '-1'}" data-category-id="games" data-category-status="pilot" style="--category-color:${category.color}" aria-label="Games. ${gameBenchmarks.length} published benchmark${gameBenchmarks.length === 1 ? '' : 's'}. ${best === null ? 'Ratings available.' : `Best eligible with-Vasir panel ${formatScore(best)} of 100.`} Exploratory pilot, excluded from Overall.">
              <span class="capability-selector__index" aria-hidden="true">${String(categoryIndex).padStart(2, '0')}</span>
              <span class="capability-selector__name"><span class="capability-selector__long">Games</span><span class="capability-selector__short">Games</span></span>
              <span class="capability-selector__state">${selected ? 'Selected' : 'Pilot'}</span>
              <strong${best === null ? ' class="game-capability__available"' : ''}>${best === null ? 'Ratings available' : `${formatScore(best)}<small>/100</small>`}</strong>
            </button>`;
          }
          if (category.id === 'writing' && hasWriting) {
            const selected = category.id === state.capabilityCategory;
            const leader = writingAggregateLeader;
            const score = leader?.score;
            return `<button class="capability-selector__tab${selected ? ' is-selected' : ''}" id="capability-category-writing" type="button" role="tab" aria-selected="${selected}" aria-controls="capability-field-panel" tabindex="${selected ? '0' : '-1'}" data-category-id="writing" data-category-status="development-index" data-writing-summary-partial="${Boolean(leader?.partial)}" style="--category-color:${category.color}" aria-label="Writing benchmark results. ${publishedWritingBenchmarkCount} published benchmarks. ${Number.isFinite(score) ? `All Writing aggregate leader ${formatScore(score)} of ${SCORE_MAXIMUM}${leader?.provisional ? ', provisional' : ''}.` : 'Open Writing to inspect measured benchmarks and coverage.'} ${overallWritingCategory ? `Included in Overall at ${formatWeight(overallWritingCategory.weight)} weight.` : 'Excluded from Overall.'}">
              <span class="capability-selector__index" aria-hidden="true">${String(categoryIndex).padStart(2, '0')}</span>
              <span class="capability-selector__name"><span class="capability-selector__long">Writing</span><span class="capability-selector__short">Writing</span></span>
              <span class="capability-selector__state" data-writing-category-progress>${selected ? 'Selected' : 'Results'}</span>
              <strong title="All Writing aggregate leader${leader?.provisional ? ' · provisional' : ''}">${Number.isFinite(score) ? `${formatScore(score)}${leader?.partial ? '*' : ''}<small>/${SCORE_MAXIMUM}</small>` : 'Results'}</strong>
            </button>`;
          }
          if (category.status === 'coming-soon') return `
            <button class="capability-selector__tab" id="capability-category-${escapeHtml(category.id)}" type="button" role="tab" data-category-id="${escapeHtml(category.id)}" data-category-status="coming-soon" disabled aria-disabled="true" aria-selected="false" tabindex="-1" style="--category-color:${category.color}" aria-label="${escapeHtml(category.name)}. Coming soon. No published score.">
              <span class="capability-selector__index" aria-hidden="true">${String(categoryIndex).padStart(2, '0')}</span>
              <span class="capability-selector__name"><span class="capability-selector__long">${escapeHtml(category.name)}</span><span class="capability-selector__short">${escapeHtml(capabilityMobileLabel[category.id] || category.name)}</span></span>
              <span class="capability-selector__availability">Coming soon</span>
              <strong aria-label="No score">—</strong>
            </button>
          `;
          const categoryData = category.isCombined && overallData ? overallData : isWorkflowCategory(category.id) ? workflowData : rootData;
          const candidates = categoryData.entries.filter((entry) => entry.condition === TREATMENT_CONDITION_ID)
            .sort((left, right) => (rankingScoreFor(right, category.id) ?? -1) - (rankingScoreFor(left, category.id) ?? -1)
              || right.score - left.score || left.latency - right.latency || left.id.localeCompare(right.id));
          const winner = candidates[0];
          const workflowLeaders = isWorkflowCategory(category.id) || (category.isCombined && overallData) ? candidates.filter((entry) => (
            Number.isFinite(rankingScoreFor(entry, category.id)) && rankingScoreFor(entry, category.id) === rankingScoreFor(winner, category.id)
          )) : [];
          const categoryEdition = categoryData.scoreBasis.label;
          const categoryTreatment = categoryData.conditions.find((condition) => condition.id === TREATMENT_CONDITION_ID).label;
          const categoryTaskCount = categoryData.benchmarks.length;
          const selected = category.id === state.capabilityCategory;
          const accessibleFieldName = category.isCombined
            ? `Overall ${categoryEdition} score uses declared category weights normalized to categories measured in this index, with equal task weights within each category.`
            : `${category.name} ${categoryEdition} score across ${categoryTaskCount} fixed ${categoryTaskCount === 1 ? 'task' : 'tasks'}.`;
          const winnerDescription = workflowLeaders.length > 1
            ? `${workflowLeaders.length} ${categoryTreatment} co-leaders: ${workflowLeaders.map(entry => `${entry.family}, ${entry.reasoning}`).join('; ')}, tied at ${formatScore(winner.score)} of ${SCORE_MAXIMUM}.`
            : `Best ${categoryTreatment} result: ${winner.family}, ${winner.reasoning} reasoning, ${formatScore(scoreFor(winner, category.id))} of ${SCORE_MAXIMUM}.`;
          return `
            <button
              class="capability-selector__tab${category.isCombined ? ' capability-selector__tab--combined' : ''}${selected ? ' is-selected' : ''}"
              id="capability-category-${escapeHtml(category.id)}"
              type="button"
              role="tab"
              data-category-id="${escapeHtml(category.id)}"
              data-winner-entry-id="${escapeHtml(winner.id)}"
              data-winner-score="${formatScore(scoreFor(winner, category.id))}"
              data-winner-condition="skill"
              aria-selected="${selected}"
              aria-controls="capability-field-panel"
              tabindex="${selected ? '0' : '-1'}"
              style="--category-color:${category.color}"
              aria-label="${escapeHtml(accessibleFieldName)} ${escapeHtml(winnerDescription)}"
            >
              <span class="capability-selector__index" aria-hidden="true">${category.isCombined ? '00' : String(categoryIndex).padStart(2, '0')}</span>
              <span class="capability-selector__name">
                <span class="capability-selector__long">${escapeHtml(category.name)}</span>
                <span class="capability-selector__short">${escapeHtml(capabilityMobileLabel[category.id])}</span>
              </span>
              <span class="capability-selector__state">${selected ? 'Selected' : ''}</span>
              <strong>${formatScore(scoreFor(winner, category.id))}<small>/${SCORE_MAXIMUM}</small></strong>
            </button>
          `;
        }).join('')}
      </div>
    </nav>
  `;

  const capabilityRankRowMarkup = (fullEntry, baselineRanking, fullRanking, category, options = {}) => {
    const baselineEntry = (options.baselineEntries || baselineBySetting).get(fullEntry.settingId);
    const baselineScore = scoreFor(baselineEntry, category.id);
    const fullScore = scoreFor(fullEntry, category.id);
    const baselineRank = isWriting && fullEntry.partial ? null : baselineRanking.ranks.get(baselineEntry.id) ?? null;
    const fullRank = isWriting && fullEntry.partial ? null : fullRanking.ranks.get(fullEntry.id) ?? null;
    const comparable = Number.isFinite(fullScore) && Number.isFinite(baselineScore);
    const delta = comparable ? (isWorkSpec || isWriting ? fullEntry.delta : Math.round((fullScore - baselineScore) * 10) / 10) : null;
    const start = Math.min(baselineScore, fullScore);
    const connectorWidth = Math.max(Math.abs(fullScore - baselineScore), 0.25);
    const selected = !options.linkFor && selectedEntry().settingId === fullEntry.settingId;
    const rowTag = options.linkFor ? 'a' : 'button';
    const rankCount = options.rankCount ?? RANKED_SETTING_COUNT;
    return `
      <li
        class="capability-rank-row${selected ? ' is-selected' : ''}${delta < 0 ? ' is-regression' : ''}"
        data-setting-id="${escapeHtml(fullEntry.settingId)}"
        ${options.provisional ? `data-writing-provisional-setting="${escapeHtml(fullEntry.settingId)}"` : ''}
        data-baseline-entry-id="${escapeHtml(baselineEntry.id)}"
        data-full-entry-id="${escapeHtml(fullEntry.id)}"
        data-baseline-score="${formatScore(baselineScore)}"
        data-full-score="${formatScore(fullScore)}"
        data-baseline-rank="${baselineRank}"
        data-full-rank="${fullRank}"
        data-delta="${formatScore(delta)}"
        ${isWriting ? `data-partial="${Boolean(fullEntry.partial)}" data-exact-baseline="${baselineEntry.exactScore}" data-exact-skill="${fullEntry.exactScore}" data-exact-delta="${fullEntry.exactDelta}"` : ''}
        style="--category-color:${category.color};--baseline-score:${baselineScore}%;--full-score:${fullScore}%;--connector-start:${start}%;--connector-width:${connectorWidth}%"
      >
        <${rowTag}
          class="capability-rank-row__select"
          ${options.linkFor ? `href="${escapeHtml(options.linkFor(fullEntry.settingId))}"` : `type="button" data-entry-id="${escapeHtml(fullEntry.id)}" aria-pressed="${selected}"`}
          aria-label="${options.linkFor ? 'Read answers for' : 'Select'} ${escapeHtml(fullEntry.family)}, ${escapeHtml(fullEntry.reasoning)} reasoning. ${escapeHtml(category.name)} ${escapeHtml(TREATMENT_LABEL)} ${escapeHtml(options.scoreLabel || SCORE_EDITION_LABEL)} score ${formatScore(fullScore)} of ${SCORE_MAXIMUM}, skill rank ${fullRank || 'unranked'} of ${rankCount}; ${escapeHtml(BASELINE_LABEL)} score ${formatScore(baselineScore)} of ${SCORE_MAXIMUM}, baseline rank ${baselineRank || 'unranked'} of ${rankCount}; paired uplift ${signed(delta)} points.${isWriting && fullEntry.partial ? ' Unranked. Asterisk: available-score mean; some tests are missing. Not comparable to the ranked aggregate.' : ''} Rank is secondary and condition-specific."
        >
          <span class="capability-rank-row__identity">
            <span class="capability-rank-row__position">${fullRank ? `#${String(fullRank).padStart(2, '0')}` : '—'}</span>
            <span class="capability-rank-row__model">
              <strong>${escapeHtml(fullEntry.family)}</strong>
              <small>${escapeHtml(fullEntry.reasoning)}</small>${isWriting && fullEntry.partial ? `<small class="writing-coverage-label">${fullEntry.sourceCount}/${TASK_COUNT} tests · unranked</small>` : ''}
            </span>
          </span>
          ${comparable ? `<span
            class="capability-rank-row__track"
            role="img"
            aria-label="${escapeHtml(BASELINE_LABEL)} circle at ${formatScore(baselineScore)}. ${escapeHtml(TREATMENT_LABEL)} square at ${formatScore(fullScore)}."
          >
            <span class="capability-rank-row__axis" aria-hidden="true"></span>
            <span class="capability-rank-row__connector" aria-hidden="true"></span>
            <span class="capability-rank-row__marker capability-rank-row__marker--baseline" aria-hidden="true"></span>
            <span class="capability-rank-row__marker capability-rank-row__marker--full" aria-hidden="true"></span>
          </span>` : '<span class="work-spec-unassessable">Panel total not assessable</span>'}
          <span class="capability-rank-row__reading capability-rank-row__reading--baseline">
            <span class="capability-rank-row__condition-label"><i aria-hidden="true"></i><span>${isWriting ? 'Plain' : 'Baseline'}</span></span>
            <strong>${formatEntryScore(baselineEntry, category.id)}</strong>
            <small>${baselineRank ? `#${baselineRank}` : comparable ? 'Unranked' : 'Unscored'}</small>
          </span>
          <span class="capability-rank-row__reading capability-rank-row__reading--full">
            <span class="capability-rank-row__condition-label"><i aria-hidden="true"></i><span>Skill</span></span>
            <strong>${formatEntryScore(fullEntry, category.id)}</strong>
            <small>${fullRank ? `#${fullRank}` : comparable ? 'Unranked' : 'Unscored'}</small>
          </span>
          <strong class="capability-rank-row__delta">${signed(delta)}${isWriting && fullEntry.partial ? '*' : ''}<small>pts</small></strong>
        </${rowTag}>
      </li>
    `;
  };

  const writingIncompleteResultsMarkup = category => {
    const entries = data.entries.filter(entry => entry.condition === TREATMENT_CONDITION_ID && entry.partial)
      .sort((a, b) => a.family.localeCompare(b.family) || a.reasoning.localeCompare(b.reasoning));
    if (!entries.length) return '';
    const unranked = { ranks: new Map() };
    return `<section class="writing-incomplete-results" data-writing-incomplete-results aria-labelledby="writing-incomplete-title">
      <header class="writing-incomplete-results__header"><h4 id="writing-incomplete-title">Available scores · not ranked</h4><p>These models have missing tests. Their available-score means are shown for reference, not compared with the full aggregate above. Alphabetical order; select a model to see its scores and missing tests.</p></header>
      <ul class="capability-ranking__rows" aria-label="Incomplete model results, alphabetical and unranked">${entries.map(entry => capabilityRankRowMarkup(entry, unranked, unranked, category)).join('')}</ul>
    </section>`;
  };

  const animateCapabilityHandoff = (skipMotion = false) => {
    if (skipMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = elements.capabilityView.querySelector('.capability-browser__canvas');
    const activePanel = canvas?.querySelector('.capability-ranking:not([hidden]), .benchmark-ledger:not([hidden]), .capability-efficiency:not([hidden])');
    const target = activePanel || canvas;
    if (!target) return;
    target.animate(
      [
        { opacity: 0.58, transform: 'translateY(0.25rem)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      {
        duration: 180,
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
      }
    );
  };

  const combinedScoreGuideGeometry = (scoreField) => {
    const track = scoreField?.querySelector('.capability-composition__track');
    const resultList = scoreField?.querySelector('.result-list');
    if (!track || !resultList) return null;

    const scoreFieldBox = scoreField.getBoundingClientRect();
    const trackBox = track.getBoundingClientRect();
    const resultListBox = resultList.getBoundingClientRect();
    const scoreFieldStyle = getComputedStyle(scoreField);
    const trackStyle = getComputedStyle(track);
    const borderTop = Number.parseFloat(scoreFieldStyle.borderTopWidth) || 0;
    const borderLeft = Number.parseFloat(trackStyle.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(trackStyle.borderRightWidth) || 0;
    const contentLeft = trackBox.left + borderLeft;
    const contentRight = trackBox.right - borderRight;
    const contentWidth = contentRight - contentLeft;

    if (contentWidth <= 0 || resultListBox.height <= 0) return null;
    return {
      scoreFieldBox,
      contentLeft,
      contentRight,
      contentWidth,
      resultListTop: resultListBox.top,
      resultListBottom: resultListBox.bottom,
      guideTop: resultListBox.top - scoreFieldBox.top - borderTop,
      guideHeight: resultListBox.height
    };
  };

  const clearCombinedScoreGuide = (scoreField) => {
    const guide = scoreField?.querySelector('.capability-score-guide');
    if (!guide) return;
    guide.classList.remove('is-visible');
    delete guide.dataset.score;
    delete guide.dataset.source;
  };

  const positionCombinedScoreGuide = (scoreField, score, source, geometry = combinedScoreGuideGeometry(scoreField)) => {
    const guide = scoreField?.querySelector('.capability-score-guide');
    const readout = guide?.querySelector('.capability-score-guide__readout strong');
    if (!guide || !readout || !geometry || !combinedScoreGuideMedia.matches) {
      clearCombinedScoreGuide(scoreField);
      return;
    }

    const pixelScale = COMPOSITE_SCORE_SCALE.copy().range([
      geometry.contentLeft - geometry.scoreFieldBox.left,
      geometry.contentRight - geometry.scoreFieldBox.left
    ]);
    const boundedScore = COMPOSITE_SCORE_SCALE.invert(COMPOSITE_SCORE_SCALE(score));
    const scoreRatio = COMPOSITE_SCORE_SCALE(boundedScore) / 100;
    const labelShift = scoreRatio < 0.075 ? '0%' : scoreRatio > 0.925 ? '-100%' : '-50%';

    guide.style.setProperty('--score-guide-x', `${pixelScale(boundedScore).toFixed(3)}px`);
    guide.style.setProperty('--score-guide-y', `${geometry.guideTop.toFixed(3)}px`);
    guide.style.setProperty('--score-guide-height', `${geometry.guideHeight.toFixed(3)}px`);
    guide.style.setProperty('--score-guide-label-shift', labelShift);
    guide.dataset.score = boundedScore.toFixed(3);
    guide.dataset.source = source;
    readout.textContent = formatScore(boundedScore);
    guide.classList.add('is-visible');
  };

  const focusedCompositionScore = (scoreField) => {
    const segment = scoreField?.querySelector('.capability-composition__segment:focus');
    if (!segment) return null;
    const segments = [...segment.closest('.capability-composition__stack').querySelectorAll('.capability-composition__segment')];
    const focusedIndex = segments.indexOf(segment);
    if (focusedIndex < 0) return null;
    return segments.slice(0, focusedIndex + 1).reduce((sum, candidate) => (
      sum + (Number(candidate.dataset.contribution) || 0)
    ), 0);
  };

  const bindCombinedScoreGuide = () => {
    const scoreField = elements.capabilityView.querySelector('.score-field--combined');
    if (!scoreField) return;

    let pointerFrame = 0;
    let latestPointer = null;
    const restoreFocusOrClear = () => {
      const focusScore = focusedCompositionScore(scoreField);
      if (focusScore === null) clearCombinedScoreGuide(scoreField);
      else positionCombinedScoreGuide(scoreField, focusScore, 'focus');
    };

    scoreField.addEventListener('pointermove', (event) => {
      if (!combinedScoreGuideMedia.matches || !['mouse', 'pen'].includes(event.pointerType)) {
        restoreFocusOrClear();
        return;
      }
      latestPointer = { clientX: event.clientX, clientY: event.clientY };
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        const geometry = combinedScoreGuideGeometry(scoreField);
        if (
          !geometry ||
          latestPointer.clientX < geometry.contentLeft ||
          latestPointer.clientX > geometry.contentRight ||
          latestPointer.clientY < geometry.scoreFieldBox.top ||
          latestPointer.clientY > geometry.resultListBottom
        ) {
          restoreFocusOrClear();
          return;
        }
        const pixelScale = COMPOSITE_SCORE_SCALE.copy().range([geometry.contentLeft, geometry.contentRight]);
        positionCombinedScoreGuide(scoreField, pixelScale.invert(latestPointer.clientX), 'pointer', geometry);
      });
    });

    scoreField.addEventListener('pointerleave', () => {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      latestPointer = null;
      restoreFocusOrClear();
    });

    scoreField.addEventListener('focusin', (event) => {
      const segment = event.target.closest('.capability-composition__segment');
      if (!segment) return;
      const focusScore = focusedCompositionScore(scoreField);
      if (focusScore !== null) positionCombinedScoreGuide(scoreField, focusScore, 'focus');
    });

    scoreField.addEventListener('focusout', (event) => {
      if (event.relatedTarget?.closest?.('.capability-composition__segment')) return;
      clearCombinedScoreGuide(scoreField);
    });
  };

  const capabilityFrameMarkup = ({ category, heading, ranking, benchmarks, efficiency, footnote = '' }) => `
      <section class="capability-browser" style="--category-color:${category.color}">
        <aside class="capability-browser__index">
          ${capabilitySelectorMarkup()}
        </aside>
        <div
          class="capability-browser__canvas"
          id="capability-field-panel"
          role="tabpanel"
          aria-labelledby="capability-category-${escapeHtml(category.id)}"
        >
          ${heading}
          ${ranking}
          ${benchmarks}
          ${efficiency}
          ${footnote}
        </div>
      </section>
    `;

  const renderCapabilities = ({ animate = false, skipMotion = false } = {}) => {
    const category = categoryById.get(state.capabilityCategory) || COMBINED_CAPABILITY;
    state.capabilityCategory = category.id;
    const games = category.id === 'games';
    const baselineRanking = games ? null : rankedCondition(BASELINE_CONDITION_ID, category.id);
    const fullRanking = games ? null : rankedCondition(TREATMENT_CONDITION_ID, category.id);

    const rankingContent = games ? gameModelsMarkup() : category.isCombined ? combinedLeaderboardMarkup() : `
        <section
          class="capability-ranking"
          id="capability-ranking"
          role="tabpanel"
          aria-labelledby="capability-mode-models"
          ${state.capabilityMode === 'models' ? '' : 'hidden'}
        >
          <h4 class="visually-hidden">${escapeHtml(category.name)} model leaderboard</h4>
          <div class="capability-ranking__axis" aria-hidden="true">
            <span>Model / skill rank</span>
            <span class="capability-ranking__ticks">
              <span class="capability-ranking__scale-label">Rubric / ${SCORE_MAXIMUM}</span>
              <span class="capability-ranking__scale-values"><i>0</i><i>25</i><i>50</i><i>75</i><i>100</i></span>
            </span>
            <span class="capability-ranking__condition-heading" title="${escapeHtml(BASELINE_LABEL)}"><i class="capability-key__baseline"></i>${escapeHtml(BASELINE_SHORT)}</span>
            <span class="capability-ranking__condition-heading" title="${escapeHtml(TREATMENT_LABEL)}"><i class="capability-key__full"></i>${escapeHtml(conditionById.get(TREATMENT_CONDITION_ID).short || TREATMENT_LABEL)}</span>
            <span>Uplift</span>
          </div>
          <ol class="capability-ranking__rows" aria-label="${escapeHtml(category.name)} settings ordered by ${escapeHtml(TREATMENT_LABEL)} ${SCORE_EDITION_LABEL} score. Ranks are secondary and condition-specific.">
            ${fullRanking.entries.filter(entry => !isWriting || Number.isFinite(entry.score)).map((entry) => capabilityRankRowMarkup(entry, baselineRanking, fullRanking, category)).join('')}
          </ol>
          ${isWriting ? writingIncompleteResultsMarkup(category) : ''}
          ${writingSelectionMarkup()}
        </section>
      `;
    const benchmarkContent = games ? gameBenchmarksMarkup() : benchmarkLedgerMarkup(category, state.capabilityMode !== 'benchmarks');

    elements.capabilityView.innerHTML = capabilityFrameMarkup({
      category, heading: games ? gameModeMarkup() : capabilityModeMarkup(category) + writingLeaderboardControlsMarkup(),
      ranking: rankingContent, benchmarks: benchmarkContent,
      efficiency: games ? gameEfficiencyMarkup() : efficiencyPanelMarkup(),
      footnote: isWriting && state.capabilityMode !== 'benchmarks' ? '<p class="writing-score-footnote" id="writing-partial-footnote" data-writing-partial-footnote>* Incomplete results are shown separately, without a rank.</p>' : ''
    });
    bindCombinedScoreGuide();
    if (!games && state.capabilityMode === 'efficiency') renderEfficiency();

    window.requestAnimationFrame(() => {
      if (animate) animateCapabilityHandoff(skipMotion);
      const tabList = elements.capabilityView.querySelector('.capability-selector__tabs');
      const selectedTab = tabList?.querySelector('.capability-selector__tab[aria-selected="true"]');
      if (!tabList || !selectedTab || tabList.scrollWidth <= tabList.clientWidth) return;
      const centeredLeft = selectedTab.offsetLeft - ((tabList.clientWidth - selectedTab.offsetWidth) / 2);
      const maximumLeft = tabList.scrollWidth - tabList.clientWidth;
      tabList.scrollTo({ left: Math.max(0, Math.min(maximumLeft, centeredLeft)), behavior: 'auto' });
    });
  };

  const updateCapabilityMode = ({ animate = false, skipMotion = false } = {}) => {
    if (isWriting || state.capabilityCategory === 'games') { renderCapabilities({ animate, skipMotion }); return; }
    const category = categoryById.get(state.capabilityCategory) || COMBINED_CAPABILITY;
    const header = elements.capabilityView.querySelector('.capability-canvas__header');
    if (header) header.outerHTML = capabilityHeaderMarkup(category);
    elements.capabilityView.querySelectorAll('[data-writing-benchmark]').forEach(link => {
      const target = new URL(link.href);
      target.hash = `capabilities/writing/storytelling/${state.capabilityMode}`;
      link.href = target.href;
    });

    elements.capabilityView.querySelectorAll('.capability-mode__tab[data-capability-mode]').forEach((tab) => {
      const selected = tab.dataset.capabilityMode === state.capabilityMode;
      tab.classList.toggle('is-selected', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    const rankingPanel = elements.capabilityView.querySelector('#capability-ranking');
    const benchmarkPanel = elements.capabilityView.querySelector('#capability-benchmarks');
    const efficiencyPanel = elements.capabilityView.querySelector('#capability-efficiency');
    if (rankingPanel) rankingPanel.hidden = state.capabilityMode !== 'models';
    if (benchmarkPanel) benchmarkPanel.hidden = state.capabilityMode !== 'benchmarks';
    if (efficiencyPanel) efficiencyPanel.hidden = state.capabilityMode !== 'efficiency';
    if (state.capabilityMode === 'efficiency') renderEfficiency();
    if (animate) window.requestAnimationFrame(() => animateCapabilityHandoff(skipMotion));
  };

  const syncCapabilityIndexOrientation = () => {
    const tabList = elements.capabilityView.querySelector('.capability-selector__tabs[role="tablist"]');
    if (tabList) tabList.setAttribute('aria-orientation', capabilityIndexMedia.matches ? 'vertical' : 'horizontal');
  };

  const resourceDeltaPercent = (entry, metric = state.metric) => {
    const baseline = baselineBySetting.get(entry.settingId);
    const baselineValue = baseline?.[metric];
    const value = entry[metric];
    if (!Number.isFinite(baselineValue) || baselineValue <= 0 || !Number.isFinite(value) || value < 0) return null;
    return Math.round(((value / baselineValue) - 1) * 100);
  };

  const annotationDockClass = (entry, field = state.capabilityCategory, metric = state.metric) => {
    const { x } = plotCoordinates(entry, field, metric);
    return x > 50 ? 'is-docked-top-left' : 'is-docked-bottom-right';
  };

  const plotInspectionMarkup = (entry, ranks, frontierIds) => {
    const field = state.capabilityCategory;
    const metric = metricConfig[state.metric];
    const delta = deltaFor(entry, field);
    const resourceDelta = resourceDeltaPercent(entry);
    const reference = entry.condition === BASELINE_CONDITION_ID
      ? `${escapeHtml(BASELINE_SHORT)} reference`
      : `${signed(delta)} rubric points${Number.isFinite(resourceDelta) ? ` · ${resourceDelta > 0 ? '+' : resourceDelta < 0 ? '−' : '±'}${Math.abs(resourceDelta)}% ${metric.label.toLowerCase()}` : ''}`;
    const rankLabel = `${conditionById.get(entry.condition).short} rank #${ranks.get(entry.id)} of ${RANKED_SETTING_COUNT}`;
    return `
      <span class="efficiency-plane__annotation-meta">
        ${conditionMarkup(entry.condition, true)}
        <span>${frontierIds.has(entry.id) ? 'On frontier' : 'Off frontier'}</span>
      </span>
      <strong>${escapeHtml(entry.family)} · ${escapeHtml(entry.reasoning)}</strong>
      <span class="efficiency-plane__annotation-values">
        <b>${formatEntryScore(entry, field)}</b>
        <i aria-hidden="true">×</i>
        <b>${escapeHtml(metric.format(entry[state.metric]))}</b>
      </span>
      <small>${escapeHtml(rankLabel)} · ${escapeHtml(reference)}</small>
    `;
  };

  const efficiencyDecision = (entry, frontier, field, metricKey) => {
    const metric = metricConfig[metricKey];
    const frontierIds = new Set(frontier.map((candidate) => candidate.id));
    const score = scoreFor(entry, field);
    const baseline = baselineBySetting.get(entry.settingId);
    const baselineScore = scoreFor(baseline, field);
    const scoreDelta = isWorkSpec || isOverall || isWriting ? entry.delta : Math.round((score - baselineScore) * 10) / 10;
    const resourceDelta = resourceDeltaPercent(entry, metricKey);
    const comparisonScore = plotScoreFor(entry, field);
    const bestScore = Math.max(...data.entries.filter(candidate => candidate.eligibleForRank !== false).map((candidate) => plotScoreFor(candidate, field)));
    const highestScore = isOverall ? comparisonScore === bestScore : Math.abs(score - bestScore) < 0.05;
    const isFrontier = frontierIds.has(entry.id);
    const dominators = data.entries.filter((candidate) => (candidate.eligibleForRank !== false &&
      candidate.id !== entry.id &&
      Number.isFinite(plotScoreFor(candidate, field)) &&
      Number.isFinite(candidate[metricKey]) && candidate[metricKey] > 0 &&
      plotScoreFor(candidate, field) >= comparisonScore &&
      candidate[metricKey] <= entry[metricKey] &&
      (plotScoreFor(candidate, field) > comparisonScore || candidate[metricKey] < entry[metricKey])
    ));
    const cheaperFrontier = [...frontier]
      .filter((candidate) => candidate[metricKey] < entry[metricKey])
      .sort((left, right) => right[metricKey] - left[metricKey])[0];
    const betterTradeoff = [...dominators]
      .sort((left, right) => (
        left[metricKey] - right[metricKey] ||
        plotScoreFor(right, field) - plotScoreFor(left, field)
      ))[0];

    let finding = 'Trade-off check';
    if (highestScore) finding = 'Highest rubric score';
    else if (isFrontier) finding = 'On the frontier';

    const treatmentSentence = entry.condition === BASELINE_CONDITION_ID
      ? `${escapeHtml(BASELINE_LABEL)} is the matched reference for this model setting.`
      : `${escapeHtml(TREATMENT_LABEL)} changes the ${SCORE_EDITION_LABEL} score by ${signed(scoreDelta)} points${Number.isFinite(resourceDelta) ? ` for ${resourceDelta > 0 ? '+' : resourceDelta < 0 ? '−' : '±'}${Math.abs(resourceDelta)}% ${metric.label.toLowerCase()}` : ''} versus ${escapeHtml(BASELINE_LABEL)}.`;

    let tradeoffSentence = `No result has both a higher ${SCORE_EDITION_LABEL} score and lower resource use.`;
    if (!isFrontier) {
      tradeoffSentence = `${dominators.length} result${dominators.length === 1 ? '' : 's'} reach at least this rubric score for less ${metric.label.toLowerCase()}.`;
    } else if (cheaperFrontier) {
      const savings = Math.round((1 - (cheaperFrontier[metricKey] / entry[metricKey])) * 100);
      const scoreLoss = Math.round((score - scoreFor(cheaperFrontier, field)) * 10) / 10;
      tradeoffSentence = `${escapeHtml(cheaperFrontier.family)} · ${escapeHtml(cheaperFrontier.reasoning)} saves ${savings}% for ${scoreLoss.toFixed(1)} rubric points less.`;
    }

    return {
      finding,
      highestScore,
      isFrontier,
      frontierIds,
      scoreDelta,
      resourceDelta,
      comparison: isFrontier ? cheaperFrontier : betterTradeoff,
      comparisonLabel: isFrontier ? 'Next cheaper frontier' : 'Better measured trade-off',
      treatmentSentence,
      tradeoffSentence
    };
  };

  const efficiencyTrajectoryMarkup = (entry, field, metricKey, ranks, frontierIds) => matchedEntries(entry).filter(candidate => Number.isFinite(scoreFor(candidate, field)) && Number.isFinite(candidate[metricKey]) && candidate[metricKey] >= 0).map((candidate, index) => {
    const selected = candidate.id === entry.id;
    const condition = conditionById.get(candidate.condition);
    return `
      <button
        class="matched-triplet__option matched-triplet__option--${escapeHtml(conditionVisualClass(candidate.condition))}${selected ? ' is-selected' : ''}"
        type="button"
        data-entry-id="${escapeHtml(candidate.id)}"
        aria-pressed="${selected}"
        aria-label="Select matched ${escapeHtml(condition.label)}, ${fieldConfig[field].label} ${SCORE_EDITION_LABEL} score ${formatScore(scoreFor(candidate, field))} of ${SCORE_MAXIMUM}, ${metricConfig[metricKey].spoken(candidate[metricKey])}, ${escapeHtml(condition.label)} rank ${ranks.get(candidate.id)} of ${RANKED_SETTING_COUNT}${frontierIds.has(candidate.id) ? ', on the efficient frontier' : ''}"
      >
        <span class="efficiency-summary__step">${String(index + 1).padStart(2, '0')}</span>
        ${conditionMarkup(candidate.condition, true)}
        <strong>${formatEntryScore(candidate, field)}</strong>
        <span class="efficiency-summary__resource">${escapeHtml(metricConfig[metricKey].format(candidate[metricKey]))}</span>
        <small>#${String(ranks.get(candidate.id)).padStart(2, '0')}${frontierIds.has(candidate.id) ? ' · frontier' : ''}</small>
      </button>
    `;
  }).join('');

  const plotPointMarkup = (entry, selected, ranks, frontierIds) => {
    const field = state.capabilityCategory;
    const metric = metricConfig[state.metric];
    const { x, y } = plotCoordinates(entry, field, state.metric);
    const isSelected = entry.id === selected.id;
    const counterpart = entry.settingId === selected.settingId && !isSelected;
    const isFrontier = frontierIds.has(entry.id);
    const classes = [
      'plot-point',
      `plot-point--${conditionVisualClass(entry.condition)}`,
      isFrontier ? 'is-frontier' : '',
      isSelected ? 'is-selected' : '',
      counterpart ? 'is-counterpart' : '',
      !isSelected && !counterpart && !isFrontier ? 'is-muted' : ''
    ].filter(Boolean).join(' ');

    return `
      <button
        class="${classes}"
        type="button"
        data-plot-point
        data-entry-id="${escapeHtml(entry.id)}"
        data-frontier="${isFrontier}"
        data-score="${scoreFor(entry, field).toFixed(1)}"
        data-resource="${entry[state.metric]}"
        data-plot-x="${x.toFixed(3)}"
        data-plot-y="${y.toFixed(3)}"
        style="left:${x.toFixed(3)}%;top:${y.toFixed(3)}%"
        tabindex="${isSelected ? '0' : '-1'}"
        aria-pressed="${isSelected}"
        aria-label="Select ${escapeHtml(entry.family)}, ${escapeHtml(entry.reasoning)} reasoning, ${escapeHtml(conditionById.get(entry.condition).label)}, ${fieldConfig[field].label} ${SCORE_EDITION_LABEL} score ${formatScore(scoreFor(entry, field))} of ${SCORE_MAXIMUM}, condition rank ${ranks.get(entry.id)} of ${RANKED_SETTING_COUNT}, ${metric.spoken(entry[state.metric])}${isFrontier ? ', on the efficient frontier' : ''}"
      ></button>
    `;
  };

  const plotMarkup = (entry, ranks, frontier, decision) => {
    const metric = metricConfig[state.metric];
    const field = state.capabilityCategory;
    const current = plotCoordinates(entry, field, state.metric);
    const trajectory = matchedEntries(entry).filter(candidate => Number.isFinite(scoreFor(candidate, field)) && Number.isFinite(candidate[state.metric]) && candidate[state.metric] > 0);
    const trajectoryPoints = trajectory.map((candidate) => {
      const { x, y } = plotCoordinates(candidate, field, state.metric);
      return `${x.toFixed(3)},${y.toFixed(3)}`;
    }).join(' ');
    const frontierPoints = frontier.map((candidate) => {
      const { x, y } = plotCoordinates(candidate, field, state.metric);
      return `${x.toFixed(3)},${y.toFixed(3)}`;
    }).join(' ');
    const frontierAnchor = frontier[Math.min(frontier.length - 1, Math.max(0, Math.floor(frontier.length * 0.42)))] || entry;
    const frontierAnchorPosition = plotCoordinates(frontierAnchor, field, state.metric);
    const xTicks = metric.ticks.map((tick) => (
      `<span style="left:${resourcePosition(tick).toFixed(3)}%">${escapeHtml(metric.format(tick))}</span>`
    )).join('');
    const yTickValues = [0, 25, 50, 75, 100];
    const yTicks = yTickValues.map((tick) => (
      `<span style="top:${(100 - normalizedQuality(tick)).toFixed(3)}%">${tick}</span>`
    )).join('');
    const xLines = metric.ticks.map((tick) => {
      const position = resourcePosition(tick).toFixed(3);
      return `<line class="efficiency-plane__grid-line efficiency-plane__grid-line--x" x1="${position}" y1="0" x2="${position}" y2="100"></line>`;
    }).join('');
    const yLines = yTickValues.map((tick) => {
      const position = (100 - normalizedQuality(tick)).toFixed(3);
      return `<line class="efficiency-plane__grid-line efficiency-plane__grid-line--y" x1="0" y1="${position}" x2="100" y2="${position}"></line>`;
    }).join('');
    const frontierIds = frontier.map((candidate) => candidate.id);

    return `
      <div class="efficiency-plane__plot" data-frontier-ids="${escapeHtml(frontierIds.join(','))}">
        <span class="efficiency-plane__axis-label efficiency-plane__axis-label--y">Higher rubric score ↑ · ${escapeHtml(fieldConfig[field].label)} / ${SCORE_MAXIMUM} · fixed ${SCORE_MINIMUM}–${SCORE_MAXIMUM}</span>
        <div
          class="efficiency-plane__canvas"
          data-selected-id="${escapeHtml(entry.id)}"
          aria-describedby="efficiency-plot-description"
        >
          <svg class="efficiency-plane__grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <g class="efficiency-plane__grid-lines">${yLines}${xLines}</g>
            <line class="efficiency-plane__selection-guide efficiency-plane__selection-guide--x" x1="0" y1="${current.y.toFixed(3)}" x2="${current.x.toFixed(3)}" y2="${current.y.toFixed(3)}"></line>
            <line class="efficiency-plane__selection-guide efficiency-plane__selection-guide--y" x1="${current.x.toFixed(3)}" y1="${current.y.toFixed(3)}" x2="${current.x.toFixed(3)}" y2="100"></line>
            <polyline
              class="efficiency-plane__frontier"
              data-frontier-ids="${escapeHtml(frontierIds.join(','))}"
              points="${frontierPoints}"
            ></polyline>
            <polyline
              class="efficiency-plane__trajectory"
              data-setting-id="${escapeHtml(entry.settingId)}"
              data-entry-ids="${escapeHtml(trajectory.map((candidate) => candidate.id).join(','))}"
              points="${trajectoryPoints}"
            ></polyline>
          </svg>
          <span class="efficiency-plane__direction" aria-hidden="true">Better trade-offs move ↖</span>
          <span
            class="efficiency-plane__frontier-label"
            style="--label-x:${frontierAnchorPosition.x.toFixed(3)}%;--label-y:${frontierAnchorPosition.y.toFixed(3)}%"
            aria-hidden="true"
          >Efficient frontier</span>
          <div class="efficiency-plane__points" role="group" aria-label="${ENTRY_COUNT} model, reasoning, and condition results">
            ${data.entries.filter(candidate => candidate.eligibleForRank !== false && Number.isFinite(scoreFor(candidate, field)) && (!isWriting || (Number.isFinite(candidate[state.metric]) && candidate[state.metric] > 0))).map((candidate) => plotPointMarkup(candidate, entry, ranks, decision.frontierIds)).join('')}
          </div>
          <div class="efficiency-plane__pointer-layer" aria-hidden="true"></div>
          <div
            class="efficiency-plane__annotation ${annotationDockClass(entry)}"
            style="--inspection-x:${current.x.toFixed(3)}%;--inspection-y:${current.y.toFixed(3)}%"
            data-entry-id="${escapeHtml(entry.id)}"
            data-frontier="${decision.isFrontier}"
            aria-hidden="true"
          >${plotInspectionMarkup(entry, ranks, decision.frontierIds)}</div>
          <div class="efficiency-plane__tooltip" id="efficiency-plot-tooltip" role="tooltip" hidden></div>
          <div class="efficiency-plane__y-ticks" aria-hidden="true">${yTicks}</div>
          <div class="efficiency-plane__x-ticks" aria-hidden="true">${xTicks}</div>
        </div>
        <span class="efficiency-plane__axis-label efficiency-plane__axis-label--x">${escapeHtml(metric.axis)}</span>
      </div>
      <p class="efficiency-plane__reading" id="efficiency-plot-description">Each point is one matched result under ${escapeHtml(BASELINE_LABEL)} or ${escapeHtml(TREATMENT_LABEL)}. The line connects results that no other configuration beats on both ${escapeHtml(fieldConfig[field].label)} ${SCORE_EDITION_LABEL} score and ${escapeHtml(metric.label.toLowerCase())}. ${escapeHtml(metric.note)} · ${SCORE_EDITION_LABEL} ${SCORE_MINIMUM}–${SCORE_MAXIMUM} scale · ${escapeHtml(taskCoverageLabel)}.</p>
    `;
  };

  const efficientFrontier = (field, metric) => data.entries
    .filter((entry) => entry.eligibleForRank !== false && Number.isFinite(scoreFor(entry, field)))
    .filter((entry) => Number.isFinite(entry[metric]) && entry[metric] > 0)
    .filter((entry) => !data.entries.some((other) => (
      other.eligibleForRank !== false && Number.isFinite(plotScoreFor(other, field)) &&
      Number.isFinite(other[metric]) && other[metric] > 0 &&
      plotScoreFor(other, field) >= plotScoreFor(entry, field) &&
      other[metric] <= entry[metric] &&
      (plotScoreFor(other, field) > plotScoreFor(entry, field) || other[metric] < entry[metric])
    )))
    .sort((left, right) => left[metric] - right[metric]);

  const sampleFrontier = (frontier, maximum = 8, selectedId = null) => {
    if (frontier.length <= maximum) return frontier;
    const sampled = Array.from({ length: maximum }, (_, index) => (
      frontier[Math.round((index / (maximum - 1)) * (frontier.length - 1))]
    ));
    const selectedIndex = selectedId ? frontier.findIndex((entry) => entry.id === selectedId) : -1;
    if (selectedIndex >= 0 && !sampled.some((entry) => entry.id === selectedId)) {
      const replacementIndex = Math.max(1, Math.min(maximum - 2, Math.round((selectedIndex / (frontier.length - 1)) * (maximum - 1))));
      sampled[replacementIndex] = frontier[selectedIndex];
      sampled.sort((left, right) => left[state.metric] - right[state.metric]);
    }
    return sampled;
  };

  const renderEfficiency = () => {
    const entrySelect = elements.capabilityView.querySelector('#efficiency-entry');
    const resourceAxis = elements.capabilityView.querySelector('#resource-axis');
    const efficiencyView = elements.capabilityView.querySelector('#efficiency-view');
    if (!entrySelect || !resourceAxis || !efficiencyView) return;

    const entry = selectedEntry();
    const field = state.capabilityCategory;
    const ranking = rankedField(field);
    entrySelect.innerHTML = ranking.entries.map((candidate) => `
      <option value="${escapeHtml(candidate.id)}">${ranking.ranks.get(candidate.id) ? `#${ranking.ranks.get(candidate.id)}` : 'Not assessable'} · ${escapeHtml(candidate.family)} · ${escapeHtml(candidate.reasoning)} · ${escapeHtml(conditionById.get(candidate.condition).short)}</option>
    `).join('');
    entrySelect.value = entry.id;
    resourceAxis.value = state.metric;
    if (!Number.isFinite(scoreFor(entry, field)) || (isWriting && (!entry.eligibleForRank || !(Number.isFinite(entry[state.metric]) && entry[state.metric] > 0)))) {
      const report = isWriting ? benchmarkSummaryById.get(data.writingCategory.activeBenchmarkIds[0]) : data.benchmarkSummaries[0];
      efficiencyView.innerHTML = `<section class="efficiency-story"><h4>Recorded results</h4><p><a href="${escapeHtml(report.detailHref)}">Read the benchmark report</a> for this comparison's answers, reviews, and recorded resources.</p>${writingSelectionMarkup('efficiency')}</section>`;
      return;
    }
    const frontier = efficientFrontier(field, state.metric);
    const decision = efficiencyDecision(entry, frontier, field, state.metric);
    const sampled = sampleFrontier(frontier, 8, entry.id);
    const metric = metricConfig[state.metric];
    const comparison = decision.comparison;
    const comparisonSaving = comparison
      ? Math.round((1 - (comparison[state.metric] / entry[state.metric])) * 100)
      : 0;
    const comparisonQualityDifference = comparison
      ? Math.round((scoreFor(entry, field) - scoreFor(comparison, field)) * 10) / 10
      : 0;

    efficiencyView.innerHTML = `
      <div class="efficiency-story">
        <section class="efficiency-field" aria-labelledby="efficiency-field-title">
          <header class="efficiency-field__heading">
            <div>
              <p class="ui-eyebrow">${SCORE_EDITION_LABEL} score × ${escapeHtml(metric.label)} · ${ENTRY_COUNT} matched results</p>
              <h4 id="efficiency-field-title">${escapeHtml(fieldConfig[field].label)}: ${escapeHtml(decision.finding)} <strong>${formatEntryScore(entry, field)}</strong> at <strong>${escapeHtml(metric.format(entry[state.metric]))}</strong></h4>
              <p>${escapeHtml(decision.treatmentSentence)} ${decision.tradeoffSentence}</p>
            </div>
            <div class="efficiency-legend" aria-label="Chart legend">
              ${data.conditions.map((condition) => `
                <span>${conditionMarkup(condition.id, true)}</span>
              `).join('')}
              <span class="efficiency-legend__frontier"><i aria-hidden="true"></i>Efficient frontier</span>
            </div>
          </header>
          <div class="efficiency-plane">${plotMarkup(entry, ranking.ranks, frontier, decision)}</div>
        </section>

        <aside class="efficiency-summary" aria-labelledby="efficiency-selected-title">
          <header class="selected-result-heading">
            <div>
              <p class="ui-eyebrow">Selected configuration</p>
              <h4 id="efficiency-selected-title">${escapeHtml(entry.family)} · ${escapeHtml(entry.reasoning)}</h4>
              <span class="efficiency-summary__status${decision.isFrontier ? ' is-frontier' : ''}">${decision.isFrontier ? 'On the frontier' : 'Dominated trade-off'}</span>
              ${isWorkSpec ? `<span class="work-spec-readiness" data-selected-readiness>${escapeHtml(entry.readinessLabel)}</span>` : ''}
            </div>
            <span class="efficiency-summary__score">
              <small>${escapeHtml(conditionById.get(entry.condition).short)} rank #${ranking.ranks.get(entry.id)}</small>
              <strong>${formatEntryScore(entry, field)}</strong>
              <small>${escapeHtml(fieldConfig[field].short)}</small>
            </span>
          </header>
          <div class="matched-triplet efficiency-summary__trajectory" aria-label="Matched ${escapeHtml(BASELINE_LABEL)} and ${escapeHtml(TREATMENT_LABEL)} results">
            ${efficiencyTrajectoryMarkup(entry, field, state.metric, ranking.ranks, decision.frontierIds)}
          </div>
          <dl class="efficiency-summary__resources">
            ${Object.entries(metricConfig).filter(([key]) => Number.isFinite(entry[key]) && entry[key] >= 0).map(([key, resourceMetric]) => `
              <div class="${state.metric === key ? 'is-axis' : ''}">
                <dt>${escapeHtml(resourceMetric.label)}</dt>
                <dd>${escapeHtml(resourceMetric.format(entry[key]))}</dd>
                ${resourceComparison(entry, key) ? `<span>${escapeHtml(resourceComparison(entry, key))}</span>` : ''}
              </div>
            `).join('')}
          </dl>
          ${comparison ? `
            <button
              class="efficiency-summary__alternative"
              type="button"
              data-entry-id="${escapeHtml(comparison.id)}"
              aria-label="Select ${escapeHtml(decision.comparisonLabel)}, ${escapeHtml(comparison.family)}, ${escapeHtml(comparison.reasoning)} reasoning, ${escapeHtml(conditionById.get(comparison.condition).label)}, score ${formatScore(scoreFor(comparison, field))}, ${metric.spoken(comparison[state.metric])}"
            >
              <span class="ui-eyebrow">${escapeHtml(decision.comparisonLabel)}</span>
              <span class="efficiency-summary__alternative-identity">
                <strong>${escapeHtml(comparison.family)} · ${escapeHtml(comparison.reasoning)}</strong>
                ${conditionMarkup(comparison.condition, true)}
              </span>
              <span class="efficiency-summary__alternative-values">
                <b>${formatEntryScore(comparison, field)}</b><small>rubric /${SCORE_MAXIMUM}</small>
                <b>${escapeHtml(metric.format(comparison[state.metric]))}</b><small>${escapeHtml(metric.label)}</small>
              </span>
              <span>${comparisonSaving > 0 ? `Save ${comparisonSaving}% for ${comparisonQualityDifference.toFixed(1)} points less` : `Gain ${Math.abs(comparisonQualityDifference).toFixed(1)} points for no more ${escapeHtml(metric.label.toLowerCase())}`}</span>
            </button>
          ` : ''}
        </aside>

        <section class="frontier-list" aria-labelledby="frontier-list-title">
          <header class="frontier-list__heading">
            <div>
              <p class="ui-eyebrow">Trade-off anchors</p>
              <h4 id="frontier-list-title">Frontier options</h4>
              <p>No listed result has both a higher fixed rubric score and lower ${escapeHtml(metric.label.toLowerCase())}.</p>
            </div>
            <span>${sampled.length} anchors · ${frontier.length} frontier results</span>
          </header>
          <div class="frontier-list__columns" aria-hidden="true">
            ${[0, 1].map(() => `
              <span class="frontier-list__column-set"><span>Configuration</span><span>Rubric /${SCORE_MAXIMUM}</span><span>${escapeHtml(metric.label)}</span></span>
            `).join('')}
          </div>
          <div class="frontier-list__rows">
          ${sampled.map((candidate) => {
            const selected = candidate.id === entry.id;
            return `
              <button
                class="frontier-row${selected ? ' is-selected' : ''}"
                type="button"
                data-entry-id="${escapeHtml(candidate.id)}"
                data-score="${scoreFor(candidate, field).toFixed(1)}"
                data-resource="${candidate[state.metric]}"
                aria-pressed="${selected}"
              >
                <span class="frontier-row__rank">#${ranking.ranks.get(candidate.id)}</span>
                <span class="frontier-row__identity">
                  <strong>${escapeHtml(candidate.family)}</strong>
                  <small>${escapeHtml(candidate.reasoning)} · ${escapeHtml(conditionById.get(candidate.condition).short)}</small>
                </span>
                <span class="frontier-row__condition">${conditionMarkup(candidate.condition, true)}</span>
                <strong class="frontier-row__score">${formatEntryScore(candidate, field)}</strong>
                <strong class="frontier-row__resource">${escapeHtml(metric.format(candidate[state.metric]))}</strong>
              </button>
            `;
          }).join('')}
          </div>
        </section>
        ${writingSelectionMarkup('efficiency')}
      </div>
    `;

    bindEfficiencyPlotInteractions();
  };

  const syncCapabilityRoute = ({ writeHash = false } = {}) => {
    const category = categoryById.get(state.capabilityCategory) || COMBINED_CAPABILITY;
    const modeLabel = state.capabilityMode === 'benchmarks'
      ? 'benchmark tests'
      : state.capabilityMode === 'efficiency'
        ? 'efficiency'
        : 'leaderboard';
    elements.workspace.dataset.selectedEntry = state.selectedId;
    document.body.dataset.activeCapabilityMode = state.capabilityMode;
    document.title = `VasirBench · ${category.name} ${modeLabel}`;

    const nextHash = capabilityHash();
    if (writeHash && window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
  };

  const renderDynamic = (focusSelector) => {
    renderCapabilities();
    syncCapabilityRoute();

    if (focusSelector) {
      window.requestAnimationFrame(() => {
        document.querySelector(focusSelector)?.focus({ preventScroll: true });
      });
    }
  };

  const selectEntry = (entryId, focusSelector) => {
    if (!entryById.has(entryId)) return;
    state.selectedId = entryId;
    if (isWriting) {
      const url = new URL(window.location.href);
      url.searchParams.set('setting', entryById.get(entryId).settingId);
      window.history.replaceState({ ...window.history.state, selectedEntryId: entryId }, '', url);
    }
    renderDynamic(focusSelector);
  };

  const nearestPlotEntry = (event, layer) => {
    const canvas = layer.closest('.efficiency-plane__canvas');
    const points = canvas.querySelector('.efficiency-plane__points');
    const bounds = points.getBoundingClientRect();
    return data.entries.filter(entry => !isWriting || (entry.eligibleForRank && Number.isFinite(scoreFor(entry, state.capabilityCategory)) && Number.isFinite(entry[state.metric]) && entry[state.metric] > 0)).reduce((best, entry) => {
      const x = bounds.left + (resourcePosition(entry[state.metric]) / 100) * bounds.width;
      const y = bounds.top + ((100 - normalizedQuality(plotScoreFor(entry, state.capabilityCategory))) / 100) * bounds.height;
      const distance = Math.hypot(event.clientX - x, event.clientY - y);
      return !best || distance < best.distance ? { entry, distance, x, y } : best;
    }, null);
  };

  const updatePlotInspection = (canvas, entryId) => {
    if (!canvas || !entryById.has(entryId)) return;
    const entry = entryById.get(entryId);
    const selectedId = canvas.dataset.selectedId;
    const ranks = rankedField(state.capabilityCategory).ranks;
    const frontierIds = new Set(
      (canvas.closest('.efficiency-plane__plot')?.dataset.frontierIds || '').split(',').filter(Boolean)
    );
    const tooltip = canvas.querySelector('.efficiency-plane__tooltip');
    const { x, y } = plotCoordinates(entry);

    canvas.dataset.inspectedId = entry.id;
    canvas.querySelectorAll('.plot-point[data-entry-id]').forEach((point) => {
      const candidate = entryById.get(point.dataset.entryId);
      const related = candidate?.settingId === entry.settingId;
      point.classList.toggle('is-inspected', point.dataset.entryId === entry.id);
      point.classList.toggle('is-related', Boolean(related && point.dataset.entryId !== entry.id));
      point.classList.toggle('is-deemphasized', !related && point.dataset.entryId !== selectedId);
    });

    if (!tooltip || entry.id === selectedId) {
      if (tooltip) tooltip.hidden = true;
      canvas.querySelector(`.plot-point[data-entry-id="${CSS.escape(entry.id)}"]`)?.removeAttribute('aria-describedby');
      return;
    }

    tooltip.className = `efficiency-plane__tooltip ${annotationDockClass(entry)}`;
    tooltip.style.setProperty('--inspection-x', `${x.toFixed(3)}%`);
    tooltip.style.setProperty('--inspection-y', `${y.toFixed(3)}%`);
    tooltip.dataset.entryId = entry.id;
    tooltip.innerHTML = plotInspectionMarkup(entry, ranks, frontierIds);
    tooltip.hidden = false;
  };

  const clearPlotInspection = (canvas) => {
    if (!canvas) return;
    delete canvas.dataset.inspectedId;
    canvas.querySelectorAll('.plot-point[data-entry-id]').forEach((point) => {
      point.classList.remove('is-inspected', 'is-related', 'is-deemphasized');
      point.removeAttribute('aria-describedby');
    });
    const tooltip = canvas.querySelector('.efficiency-plane__tooltip');
    if (tooltip) tooltip.hidden = true;
  };

  const bindEfficiencyPlotInteractions = () => {
    const view = elements.capabilityView.querySelector('#efficiency-view');
    const canvas = view?.querySelector('.efficiency-plane__canvas');
    const pointerLayer = canvas?.querySelector('.efficiency-plane__pointer-layer');
    if (!view || !canvas || !pointerLayer) return;

    let pointerFrame = 0;
    let latestPointerEvent = null;
    pointerLayer.addEventListener('pointermove', (event) => {
      latestPointerEvent = event;
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        const nearest = nearestPlotEntry(latestPointerEvent, pointerLayer);
        if (nearest && nearest.distance <= 34) updatePlotInspection(canvas, nearest.entry.id);
        else clearPlotInspection(canvas);
      });
    });
    pointerLayer.addEventListener('pointerleave', () => {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      clearPlotInspection(canvas);
    });

    canvas.addEventListener('focusin', (event) => {
      const point = event.target.closest('.plot-point[data-entry-id]');
      if (!point) return;
      point.setAttribute('aria-describedby', 'efficiency-plot-tooltip');
      updatePlotInspection(canvas, point.dataset.entryId);
    });
    canvas.addEventListener('focusout', (event) => {
      if (event.relatedTarget?.closest?.('.plot-point[data-entry-id]')) return;
      clearPlotInspection(canvas);
    });

    view.querySelectorAll('.frontier-row[data-entry-id], .efficiency-summary__alternative[data-entry-id]').forEach((row) => {
      row.addEventListener('pointerenter', () => updatePlotInspection(canvas, row.dataset.entryId));
      row.addEventListener('pointerleave', () => {
        if (document.activeElement !== row) clearPlotInspection(canvas);
      });
      row.addEventListener('focus', () => updatePlotInspection(canvas, row.dataset.entryId));
      row.addEventListener('blur', () => clearPlotInspection(canvas));
    });
  };

  const plotPointSnapshot = () => new Map(
    [...elements.capabilityView.querySelectorAll('.plot-point[data-entry-id]')].map((point) => {
      const box = point.getBoundingClientRect();
      return [point.dataset.entryId, { x: box.left + (box.width / 2), y: box.top + (box.height / 2) }];
    })
  );

  const animatePlotReflow = (before) => {
    if (!before?.size || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    elements.capabilityView.querySelectorAll('.plot-point[data-entry-id]').forEach((point) => {
      const previous = before.get(point.dataset.entryId);
      if (!previous || typeof point.animate !== 'function') return;
      const box = point.getBoundingClientRect();
      const x = box.left + (box.width / 2);
      const y = box.top + (box.height / 2);
      point.animate([
        {
          transform: `translate(calc(-50% + ${previous.x - x}px), calc(-50% + ${previous.y - y}px))`,
          opacity: 0.58
        },
        { transform: 'translate(-50%, -50%)', opacity: 1 }
      ], {
        duration: 220,
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
      });
    });
    const frontier = elements.capabilityView.querySelector('.efficiency-plane__frontier');
    frontier?.animate?.([{ opacity: 0.18 }, { opacity: 1 }], {
      duration: 220,
      easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
    });
  };

  const focusPlotNeighbor = (point, key) => {
    const points = [...point.closest('.efficiency-plane__points').querySelectorAll('.plot-point[data-entry-id]')];
    const current = {
      x: Number(point.dataset.plotX),
      y: Number(point.dataset.plotY)
    };
    let target = null;

    if (key === 'Home') {
      target = [...points].sort((left, right) => Number(left.dataset.plotX) - Number(right.dataset.plotX))[0];
    } else if (key === 'End') {
      target = [...points].sort((left, right) => Number(left.dataset.plotY) - Number(right.dataset.plotY))[0];
    } else {
      const candidates = points
        .filter((candidate) => candidate !== point)
        .map((candidate) => ({
          candidate,
          dx: Number(candidate.dataset.plotX) - current.x,
          dy: Number(candidate.dataset.plotY) - current.y
        }))
        .filter(({ dx, dy }) => (
          (key === 'ArrowRight' && dx > 0.1) ||
          (key === 'ArrowLeft' && dx < -0.1) ||
          (key === 'ArrowDown' && dy > 0.1) ||
          (key === 'ArrowUp' && dy < -0.1)
        ))
        .sort((left, right) => {
          const horizontal = key === 'ArrowRight' || key === 'ArrowLeft';
          const leftPrimary = Math.abs(horizontal ? left.dx : left.dy);
          const rightPrimary = Math.abs(horizontal ? right.dx : right.dy);
          const leftCross = Math.abs(horizontal ? left.dy : left.dx);
          const rightCross = Math.abs(horizontal ? right.dy : right.dx);
          return (leftPrimary + (leftCross * 0.35)) - (rightPrimary + (rightCross * 0.35));
        });
      target = candidates[0]?.candidate || null;
    }

    if (!target) return;
    points.forEach((candidate) => { candidate.tabIndex = candidate === target ? 0 : -1; });
    target.focus({ preventScroll: true });
  };

  const selectCapabilityCategory = (categoryId, { focusSelector, writeHash = true, skipMotion = false } = {}) => {
    if (!categoryById.has(categoryId)) return;
    if (contextForCategory(categoryId) !== activeContext) {
      window.location.hash = `capabilities/${categoryId}${state.capabilityMode === 'models' ? '' : `/${state.capabilityMode}`}`;
      window.history.replaceState({ ...window.history.state, focusCapability: categoryId, focusCapabilitySelector: focusSelector, selectedEntryId: state.selectedId }, '');
      return;
    }
    state.capabilityCategory = categoryId;
    renderCapabilities({ animate: true, skipMotion });
    syncCapabilityRoute({ writeHash });
    if (focusSelector) {
      window.requestAnimationFrame(() => {
        document.querySelector(focusSelector)?.focus({ preventScroll: true });
      });
    }
  };

  const selectCapabilityMode = (mode, { focusSelector, writeHash = true, skipMotion = false } = {}) => {
    if (!CAPABILITY_MODES.includes(mode)) return;
    state.capabilityMode = mode;
    updateCapabilityMode({ animate: true, skipMotion });
    syncCapabilityRoute({ writeHash });
    if (focusSelector) {
      window.requestAnimationFrame(() => {
        document.querySelector(focusSelector)?.focus({ preventScroll: true });
      });
    }
  };

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-overall-available-link]')) {
      event.preventDefault();
      const coverage = document.querySelector('#overall-available');
      if (coverage) {
        coverage.open = true;
        coverage.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      document.querySelector('#overall-coverage-title')?.focus({ preventScroll: true });
      return;
    }
    const gamePointer = event.target.closest('[data-game-pointer]');
    if (gamePointer) {
      const nearest = [...gamePointer.parentElement.querySelectorAll('[data-game-effort-run]')].map(point => {
        const bounds = point.getBoundingClientRect();
        return {point, distance:Math.hypot(bounds.left + bounds.width / 2 - event.clientX, bounds.top + bounds.height / 2 - event.clientY)};
      }).sort((a,b) => a.distance - b.distance)[0];
      if (nearest?.distance <= 28) nearest.point.click();
      return;
    }
    const gameSelection = event.target.closest('[data-game-select]');
    if (gameSelection) {
      const report = gameBenchmarks.find(item => item.benchmark.id === gameSelection.dataset.gameReportId);
      if (!report) return;
      const id = gameSelection.dataset.gameSelect;
      const run = gameSelection.dataset.gameSelectionKind === 'configuration'
        ? report.runs.find(item => item.configurationId === id && item.conditionId === report.conditions[1]?.id) || report.runs.find(item => item.configurationId === id)
        : report.runs.find(item => item.id === id);
      if (!run) return;
      gameSelections.set(report.benchmark.id, run.id);
      const selector = `[data-game-report-id="${CSS.escape(report.benchmark.id)}"][data-game-select="${CSS.escape(id)}"]`;
      renderCapabilities();
      document.querySelector(selector)?.focus({ preventScroll: true });
      return;
    }
    const writingSegment = event.target.closest('.capability-composition__segment[data-writing-group-id][data-entry-id]');
    if (writingSegment && isWriting) {
      if (!entryById.has(writingSegment.dataset.entryId)) return;
      state.selectedId = writingSegment.dataset.entryId;
      selectCapabilityMode('benchmarks');
      const track = document.querySelector(`[data-writing-track="${CSS.escape(writingSegment.dataset.writingGroupId)}"]`);
      track?.querySelector('h4')?.focus({ preventScroll: true });
      track?.scrollIntoView({ block: 'start', behavior: 'instant' });
      return;
    }
    const capabilitySegment = event.target.closest('.capability-composition__segment[data-category-id][data-entry-id]');
    if (capabilitySegment) {
      if (!entryById.has(capabilitySegment.dataset.entryId) || !categoryById.has(capabilitySegment.dataset.categoryId)) return;
      state.selectedId = capabilitySegment.dataset.entryId;
      state.capabilityMode = 'models';
      if (isOverall && capabilitySegment.dataset.categoryId === 'writing') {
        const destination = new URL(window.location.href);
        destination.searchParams.set('score', 'all-writing');
        const identity = selectedEntry().configurationId;
        const sourceIdentity = rootData.writing?.overallSource?.scoreBasis?.identityAliases?.find(alias => alias.configurationId === identity)?.sourceConfigurationId;
        destination.searchParams.set('setting', sourceIdentity || identity);
        destination.hash = '#capabilities/writing';
        window.location.assign(destination.href);
        return;
      }
      selectCapabilityCategory(capabilitySegment.dataset.categoryId, { focusSelector: '#capability-question' });
      return;
    }

    const capabilityTab = event.target.closest('.capability-selector__tab[data-category-id]');
    if (capabilityTab) {
      selectCapabilityCategory(capabilityTab.dataset.categoryId, {
        focusSelector: `.capability-selector__tab[data-category-id="${CSS.escape(capabilityTab.dataset.categoryId)}"]`
      });
      return;
    }

    const capabilityModeTab = event.target.closest('.capability-mode__tab[data-capability-mode]');
    if (capabilityModeTab) {
      selectCapabilityMode(capabilityModeTab.dataset.capabilityMode, {
        focusSelector: `.capability-mode__tab[data-capability-mode="${CSS.escape(capabilityModeTab.dataset.capabilityMode)}"]`
      });
      return;
    }

    const showAll = event.target.closest('#show-all');
    if (showAll) {
      state.showAll = !state.showAll;
      renderCapabilities();
      window.requestAnimationFrame(() => {
        document.querySelector('#show-all')?.focus({ preventScroll: true });
      });
      return;
    }

    const pointerLayer = event.target.closest('.efficiency-plane__pointer-layer');
    if (pointerLayer) {
      const nearest = nearestPlotEntry(event, pointerLayer);
      if (nearest && nearest.distance <= 28) selectEntry(nearest.entry.id);
      return;
    }

    const selectable = event.target.closest(
      '.setting-row__select[data-entry-id], .capability-rank-row__select[data-entry-id], .matched-triplet__option[data-entry-id], .plot-point[data-entry-id], .frontier-row[data-entry-id], .efficiency-summary__alternative[data-entry-id]'
    );
    if (selectable) {
      const selector = selectable.classList.contains('plot-point')
        ? `.plot-point[data-entry-id="${CSS.escape(selectable.dataset.entryId)}"]`
        : selectable.classList.contains('matched-triplet__option')
          ? `.matched-triplet__option[data-entry-id="${CSS.escape(selectable.dataset.entryId)}"]`
          : selectable.classList.contains('efficiency-summary__alternative')
            ? `.efficiency-summary__alternative[data-entry-id="${CSS.escape(selectable.dataset.entryId)}"]`
          : selectable.classList.contains('setting-row__select')
            ? `.setting-row__select[data-entry-id="${CSS.escape(selectable.dataset.entryId)}"]`
            : selectable.classList.contains('capability-rank-row__select')
              ? `.capability-rank-row[data-full-entry-id="${CSS.escape(selectable.dataset.entryId)}"] .capability-rank-row__select`
            : null;
      selectEntry(selectable.dataset.entryId, selector);
    }
  });

  document.addEventListener('keydown', (event) => {
    const gamePoint = event.target.closest('.plot-point[data-game-select]');
    if (gamePoint && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const points = [...gamePoint.closest('.efficiency-plane__points').querySelectorAll('.plot-point')];
      const x = Number(gamePoint.dataset.plotX), y = Number(gamePoint.dataset.plotY);
      const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key);
      const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
      const target = event.key === 'Home' ? points[0] : event.key === 'End' ? points.at(-1) : points.filter(point => point !== gamePoint).map(point => ({point, dx:Number(point.dataset.plotX)-x, dy:Number(point.dataset.plotY)-y})).filter(item => (horizontal ? item.dx : item.dy)*direction > 0).sort((a,b) => Math.hypot(a.dx,a.dy)-Math.hypot(b.dx,b.dy))[0]?.point;
      if (target) { points.forEach(point => { point.tabIndex = point === target ? 0 : -1; }); target.focus({preventScroll:true}); }
      return;
    }
    const plotPoint = event.target.closest('.plot-point[data-entry-id]');
    if (plotPoint && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      focusPlotNeighbor(plotPoint, event.key);
      return;
    }

    if (plotPoint && event.key === 'Escape') {
      clearPlotInspection(plotPoint.closest('.efficiency-plane__canvas'));
      plotPoint.blur();
      return;
    }

    const capabilityModeTab = event.target.closest('.capability-mode__tab[data-capability-mode]');
    if (capabilityModeTab) {
      const tabs = [...capabilityModeTab.closest('[role="tablist"]').querySelectorAll('.capability-mode__tab[data-capability-mode]')];
      const index = tabs.indexOf(capabilityModeTab);
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      const mode = tabs[nextIndex].dataset.capabilityMode;
      selectCapabilityMode(mode, {
        focusSelector: `.capability-mode__tab[data-capability-mode="${CSS.escape(mode)}"]`,
        skipMotion: true
      });
      return;
    }

    const capabilityTab = event.target.closest('.capability-selector__tab[data-category-id]');
    if (capabilityTab) {
      if (capabilityTab.disabled) return;
      const tabList = capabilityTab.closest('[role="tablist"]');
      const tabs = [...tabList.querySelectorAll('.capability-selector__tab[data-category-id]:not(:disabled)')];
      const index = tabs.indexOf(capabilityTab);
      const orientation = tabList.getAttribute('aria-orientation') || 'horizontal';
      let nextIndex = null;
      if ((orientation === 'horizontal' && event.key === 'ArrowRight') || (orientation === 'vertical' && event.key === 'ArrowDown')) nextIndex = (index + 1) % tabs.length;
      if ((orientation === 'horizontal' && event.key === 'ArrowLeft') || (orientation === 'vertical' && event.key === 'ArrowUp')) nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      const categoryId = tabs[nextIndex].dataset.categoryId;
      selectCapabilityCategory(categoryId, {
        focusSelector: `.capability-selector__tab[data-category-id="${CSS.escape(categoryId)}"]`,
        skipMotion: true
      });
      return;
    }

    const segment = event.target.closest('.capability-composition__segment[data-category-id], .capability-composition__segment[data-writing-group-id]');
    if (!segment) return;
    const segments = [...segment.closest('.capability-composition__stack').querySelectorAll('.capability-composition__segment')];
    const index = segments.indexOf(segment);
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % segments.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + segments.length) % segments.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = segments.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    segments.forEach((candidate, candidateIndex) => {
      candidate.tabIndex = candidateIndex === nextIndex ? 0 : -1;
    });
    segments[nextIndex].focus();
  });

  document.addEventListener('change', (event) => {
    if (isOverall && event.target.matches('#overall-model-provider')) {
      const provider = event.target.value;
      if (provider !== 'all' && !data.coverage.records.some(record => record.provider === provider)) return;
      state.overallProvider = provider;
      state.showAll = false;
      renderCapabilities();
      document.querySelector('#overall-model-provider')?.focus({ preventScroll: true });
      return;
    }
    if (isWriting && event.target.matches('#writing-score-selection')) {
      if (data.writingCategory.selections.some(selection => selection.id === event.target.value)) window.location.assign(writingScoreHref(event.target.value));
      return;
    }
    if (event.target.matches('[data-game-efficiency-entry]')) {
      const id = event.target.dataset.gameReportId;
      const report = gameBenchmarks.find(item => item.benchmark.id === id);
      if (!report?.runs.some(run => run.id === event.target.value)) return;
      gameSelections.set(id, event.target.value);
      renderCapabilities();
      document.querySelector(`[data-game-efficiency-entry][data-game-report-id="${CSS.escape(id)}"]`)?.focus({preventScroll:true});
      return;
    }
    if (event.target.matches('#efficiency-entry')) {
      selectEntry(event.target.value, '#efficiency-entry');
      return;
    }
    if (event.target.matches('#resource-axis') && metricConfig[event.target.value]) {
      const previousPositions = plotPointSnapshot();
      state.metric = event.target.value;
      updateCapabilityMode({ skipMotion: true });
      window.requestAnimationFrame(() => {
        animatePlotReflow(previousPositions);
        document.querySelector('#resource-axis')?.focus({ preventScroll: true });
      });
    }
  });

  // Back/forward may restore native select values from just before navigation.
  // Reconcile after that restoration, using this page's actual score and model.
  window.addEventListener('pageshow', () => setTimeout(syncWritingControls, 0));

  window.addEventListener('hashchange', () => {
    const restoreCapabilityFocus = elements.capabilityView.contains(document.activeElement);
    const restoreModeFocus = Boolean(document.activeElement?.closest?.('.capability-mode__tab'));
    const route = routeFromHash();
    if (contextForCategory(route.category) !== activeContext) {
      window.location.reload();
      return;
    }
    state.capabilityCategory = route.category;
    state.capabilityMode = CAPABILITY_MODES.includes(route.mode) ? route.mode : 'models';
    renderCapabilities({ animate: true });
    syncCapabilityRoute();
    const canonicalHash = capabilityHash();
    if (route.legacy || route.invalid || route.canonical === false || window.location.hash !== canonicalHash) {
      window.history.replaceState(null, '', canonicalHash);
    }
    if (restoreCapabilityFocus) {
      window.requestAnimationFrame(() => {
        const selector = restoreModeFocus
          ? '.capability-mode__tab[aria-selected="true"]'
          : '.capability-selector__tab[aria-selected="true"]';
        document.querySelector(selector)?.focus({ preventScroll: true });
      });
    }
  });

  capabilityIndexMedia.addEventListener('change', syncCapabilityIndexOrientation);

  if (workflowData || isWriting) {
    document.querySelector('.benchmark-mast__scope').innerHTML = `${escapeHtml(isOverall ? 'Overall' : data.categories[0].name)} <span aria-hidden="true">·</span> ${BENCHMARK_COUNT} ${BENCHMARK_COUNT === 1 ? 'benchmark' : 'benchmarks'} <span aria-hidden="true">·</span> ${SETTING_COUNT} ${isOverall ? 'ranked' : 'model'} settings <span aria-hidden="true">·</span> ${data.benchmarkResults.length} ${isOverall && scoreBasis.edition === 'overall-v3' ? 'benchmark score records' : `${isOverall ? 'published ' : ''}responses`} <span class="benchmark-mast__evidence"><span aria-hidden="true">·</span> ${escapeHtml(SCORE_EDITION_LABEL)}</span>`;
  }
  if (isGames) {
    document.querySelector('.benchmark-mast__scope').innerHTML = `Games <span aria-hidden="true">·</span> ${gameBenchmarks.length} ${gameBenchmarks.length === 1 ? 'benchmark' : 'benchmarks'} <span aria-hidden="true">·</span> ${gameRuns.length} outputs <span class="benchmark-mast__evidence"><span aria-hidden="true">·</span> Games v1 pilot</span>`;
    document.querySelector('.benchmark-footer').innerHTML = `<span>VasirBench · Games · Exploratory pilot</span><span>${gameBenchmarks.length} ${gameBenchmarks.length === 1 ? 'benchmark' : 'benchmarks'} · ${gameRuns.length} outputs</span>`;
  } else if (isWriting) {
    document.querySelector('.benchmark-mast__scope').innerHTML = `Writing <span aria-hidden="true">·</span> ${BENCHMARK_COUNT} ${BENCHMARK_COUNT === 1 ? 'benchmark' : 'benchmarks'} <span aria-hidden="true">·</span> ${SETTING_COUNT} model settings <span aria-hidden="true">·</span> ${data.coverage.responseCount} published responses`;
    document.querySelector('.benchmark-footer').innerHTML = `<span>VasirBench · Writing${overallWritingCategory ? '' : ' · Excluded from Overall'}</span><span>${BENCHMARK_COUNT} benchmarks · ${SETTING_COUNT} settings · ${data.coverage.responseCount} recorded outputs</span>`;
  } else if (isOverall) {
    document.querySelector('.benchmark-footer').innerHTML = `<span>VasirBench · Overall</span><span>${BENCHMARK_COUNT} benchmarks · ${data.categories.length}/${portfolioCategories.length} categories measured${rootData.games ? ' in index' : ''} · ${formatWeight(scoreBasis.publishedTargetWeight)} target weight covered · ${SETTING_COUNT}/${data.coverage.totalSettings} complete settings</span>`;
  } else if (isWorkSpec) {
    document.querySelector('.benchmark-footer').innerHTML = `<span>VasirBench · AI Workflows · Uncalibrated development</span><span>${BENCHMARK_COUNT} benchmark × ${SETTING_COUNT} settings × 2 conditions = ${data.benchmarkResults.length} responses</span>`;
  }

  renderDynamic();
  if (requestedWritingEntry && new URLSearchParams(window.location.search).get('inspect') === '1' && state.capabilityMode === 'models') {
    window.requestAnimationFrame(() => {
      const row = document.querySelector(`[data-full-entry-id="${CSS.escape(requestedWritingEntry.id)}"]`);
      row?.scrollIntoView({ block: 'center', behavior: 'instant' });
      row?.querySelector('button')?.focus({ preventScroll: true });
    });
  }
  const initialHash = capabilityHash();
  if (isWriting) {
    const canonicalUrl = new URL(window.location.href);
    canonicalUrl.searchParams.set('score', data.writingCategory.selection.id);
    canonicalUrl.hash = initialHash;
    if (canonicalUrl.href !== window.location.href) window.history.replaceState(window.history.state, '', canonicalUrl.href);
  } else if (window.location.hash !== initialHash) {
    window.history.replaceState(null, '', initialHash);
  }
  if (isWriting && state.capabilityMode === 'benchmarks' && requestedWritingBenchmark && benchmarkById.has(requestedWritingBenchmark)) {
    window.requestAnimationFrame(() => {
      const benchmark = document.querySelector(`#capability-benchmarks [data-benchmark-id="${CSS.escape(requestedWritingBenchmark)}"]`);
      benchmark?.focus({ preventScroll: true });
      benchmark?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  }
  if (window.history.state?.focusCapability === state.capabilityCategory) {
    const focusSelector = window.history.state.focusCapabilitySelector || '.capability-selector__tab[aria-selected="true"]';
    window.requestAnimationFrame(() => document.querySelector(focusSelector)?.focus({ preventScroll: true }));
    const { focusCapability, focusCapabilitySelector, selectedEntryId, ...restoredHistoryState } = window.history.state;
    window.history.replaceState(restoredHistoryState, '');
  }
}());
