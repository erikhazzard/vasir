import crypto from 'node:crypto';
import { buildWritingCategoryCollection } from './writing-navigation.js';

const identityFields = ['id', 'configurationId', 'modelId', 'provider', 'family', 'reasoning', 'label'];
const identity = setting => Object.fromEntries(identityFields.map(key => [key, setting[key]]));
const clone = value => structuredClone(value);
const OPUS_ALIAS_POLICY = 'registered-claude-opus-5-alias-v1';
const OPUS_EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);

// These are two registered selectors for the SAME canonical target, not a
// display-label alias. agent-runtime.js maps both to claude-opus-5; the selected
// Engineering, AI and Writing generation receipts independently confirm it.
// In particular, fable and claude-fable-5-1 are different targets and MUST NOT
// be normalized this way. Effort and the original report identity are retained.
function canonicalWritingIdentity(setting, canonical) {
  const exact = canonical.get(setting.configurationId);
  if (exact) return { setting: exact, alias: null };
  if (setting.provider !== 'claude' || setting.modelId !== 'claude:claude-opus-5' || !OPUS_EFFORTS.has(setting.reasoning) || setting.configurationId !== `claude:claude-opus-5@${setting.reasoning}`) return { setting: identity(setting), alias: null };
  const target = canonical.get(`claude:opus@${setting.reasoning}`);
  if (!target) return { setting: identity(setting), alias: null };
  if (target.provider !== 'claude' || target.modelId !== 'claude:opus' || target.reasoning !== setting.reasoning) throw new Error('Overall Opus canonical identity conflicts with its registered provider, model or effort.');
  return { setting: target, alias: { configurationId: target.configurationId, sourceConfigurationId: setting.configurationId,
    sourceSettingId: setting.id, sourceModelId: setting.modelId, targetCanonicalModel: 'claude-opus-5', policy: OPUS_ALIAS_POLICY } };
}

// A compact, derived family source: no responses, judges' prose, or partial
// available-score means. The artifact validator binds it to writing-data.js.
export function buildOverallWritingSource(collection, engineering, applicationSource) {
  const display = buildWritingCategoryCollection(collection, applicationSource);
  if (!display) throw new Error('Overall Writing requires a published Writing collection.');
  if (collection.writingScoreBasis && (JSON.stringify(display.writingCategory.activeBenchmarkIds) !== JSON.stringify(collection.writingScoreBasis.benchmarkIds)
    || display.scoreBasis.sources.some(source => source.weight !== 1 / collection.writingScoreBasis.benchmarkIds.length))) {
    throw new Error('Overall Writing changed the fixed established benchmark basis or equal weights.');
  }
  const canonical = new Map([...(engineering?.settings || []), ...(engineering?.aiWorkflows?.settings || [])].map(setting => [setting.configurationId, identity(setting)]));
  const selectedIds = display.writingCategory.activeBenchmarkIds;
  const selectedPublications = display.writingCategory.publications.filter(publication => selectedIds.includes(publication.benchmarks[0].id));
  const selectedConfigurations = new Set(selectedPublications.flatMap(publication => publication.settings.map(setting => setting.configurationId)));
  const resolved = display.settings.filter(setting => selectedConfigurations.has(setting.configurationId)).map(setting => ({ original: setting, ...canonicalWritingIdentity(setting, canonical) }));
  const settings = resolved.map(item => item.setting);
  if (new Set(settings.map(setting => setting.configurationId)).size !== settings.length || new Set(settings.map(setting => setting.id)).size !== settings.length) throw new Error('Overall Writing source identities collide after explicit canonical alias resolution.');
  const settingsById = new Map(resolved.map(item => [item.original.configurationId, item.setting]));
  const identityAliases = resolved.flatMap(item => item.alias ? [item.alias] : []);
  const aliasById = new Map(identityAliases.map(alias => [alias.sourceConfigurationId, alias]));
  const displayById = new Map(display.settings.map(setting => [setting.configurationId, setting]));
  const sources = display.scoreBasis.sources.map(source => {
    const publication = display.writingCategory.publications.find(item => item.benchmarks[0].id === source.benchmarkId);
    return { ...source, sourceSha256: publication.scoreBasis.sourceSha256 || publication.provisionalLeaderboard?.sourceSha256 || null };
  });
  const benchmarkResults = [];
  const benchmarkSummaries = [];
  const benchmarkDisplays = {};
  for (const publication of selectedPublications) {
    const benchmarkId = publication.benchmarks[0].id;
    const source = sources.find(item => item.benchmarkId === benchmarkId);
    const selected = source.provisional ? publication.provisionalLeaderboard : publication;
    const entries = new Map((selected.entries || []).map(entry => [`${entry.configurationId}\0${entry.condition}`, entry]));
    for (const declared of publication.settings) {
      const setting = settingsById.get(declared.configurationId);
      const aggregate = displayById.get(declared.configurationId);
      for (const condition of ['baseline', 'skill']) {
        const component = aggregate.benchmarkComponents[condition].find(item => item.benchmarkId === benchmarkId);
        const entry = entries.get(`${declared.configurationId}\0${condition}`);
        const exactScore = component.complete ? component.exactScore : null;
        const metric = name => component.complete && Number.isFinite(entry?.metrics?.[name]) ? entry.metrics[name] : null;
        const alias = aliasById.get(declared.configurationId);
        benchmarkResults.push({ settingId: setting.id, ...identity(setting), benchmarkId, category: 'writing', condition,
          ...(alias ? { sourceConfigurationId: declared.configurationId, sourceSettingId: declared.id, sourceModelId: declared.modelId } : {}),
          trials: publication.scoreBasis.trialsPerTask ?? null, score: component.complete ? component.score : null, exactScore,
          complete: component.complete, eligibleForRank: component.complete, partial: false, provisional: source.provisional,
          sourceScoreBasisId: source.id, latencyMs: metric('meanLatencyMs'), inputTokens: metric('meanInputTokens'),
          outputTokens: metric('meanOutputTokens'), totalTokens: metric('meanTotalTokens') });
      }
    }
    const originalSummary = publication.benchmarkSummaries.find(item => item.benchmarkId === benchmarkId) || {};
    benchmarkSummaries.push({ ...clone(originalSummary), ...(source.provisional ? clone(selected.summary) : {}), benchmarkId });
    const caseCount = publication.cases.length;
    const trials = publication.trialCount || publication.scoreBasis.trialsPerTask || 1;
    const caseLabel = publication.caseLabel || 'story';
    const casesLabel = caseCount === 1 ? caseLabel : caseLabel === 'story' ? 'stories' : `${caseLabel}s`;
    const cohort = publication.cohortSummaries ? `${publication.cohortSummaries.primary.expectedPairs} primary repetitions`
      : `${caseCount} ${casesLabel}${trials > 1 ? ` × ${trials} trials` : ''}`;
    const settingCount = source.provisional ? selected.rankedSettingCount : publication.coverage.completedSettingCount;
    const sourceLabel = source.provisional
      ? `${selected.label.replace(/ provisional results$/i, '')} · ${selected.rankedSettingCount} settings · ${selected.expectedCaseCount} stories`
      : `${source.judgeCount ? `${source.judgeCount}-review panel · ` : ''}${settingCount} ${settingCount === 1 ? 'setting' : 'settings'} · ${cohort}`;
    benchmarkDisplays[benchmarkId] = { caseCount, cohort, trials, judgeCount: source.judgeCount,
      settingCount, sourceKind: source.provisional ? 'provisional-single-judge' : source.type === 'official' ? 'official-panel' : 'answers', sourceLabel, provisional: source.provisional };
  }
  const basis = { method: display.scoreBasis.method, selection: 'all-writing', benchmarkWeighting: display.scoreBasis.benchmarkWeighting, sources,
    ...(identityAliases.length ? { identityAliasPolicy: OPUS_ALIAS_POLICY, identityAliases } : {}) };
  return { kind: 'vasirbenchmark-overall-writing-source', schemaVersion: 1,
    scoreBasis: { id: `all-writing:${crypto.createHash('sha256').update(JSON.stringify(basis)).digest('hex')}`,
      edition: collection.writingScoreBasis?.id ?? 'writing-all-writing-v1', aggregation: collection.writingScoreBasis ? 'equal-established-benchmarks' : 'equal-tracks-equal-benchmarks', batchUnit: 'published-benchmark-condition-total',
      benchmarkIds: display.writingCategory.activeBenchmarkIds, benchmarkWeights: sources.map(({ benchmarkId, weight }) => ({ benchmarkId, weight })),
      sources, ...(identityAliases.length ? { identityAliasPolicy: OPUS_ALIAS_POLICY, identityAliases } : {}), provisional: display.scoreBasis.provisional, judges: [...new Set(selectedPublications.flatMap(publication => {
        const source = sources.find(item => item.benchmarkId === publication.benchmarks[0].id);
        return source.provisional ? publication.provisionalLeaderboard.judgeConfigurationIds : publication.scoreBasis.judges || [];
      }))] },
    categories: [{ id: 'writing', name: 'Writing', short: 'WRITE' }],
    families: clone(display.families.map(family => ({ ...family, trackIds: display.tracks.filter(track => track.benchmarkIds.some(id => selectedIds.includes(id))).map(track => track.id) }))),
    tracks: clone(display.tracks.filter(track => track.benchmarkIds.some(id => selectedIds.includes(id))).map(track => ({ ...track, benchmarkIds: track.benchmarkIds.filter(id => selectedIds.includes(id)) }))),
    benchmarks: selectedIds.map(id => clone(display.benchmarks.find(benchmark => benchmark.id === id))), settings, benchmarkResults, benchmarkSummaries, benchmarkDisplays,
    // Report/result provenance remains in the lazy source; benchmark descriptors
    // and source basis hashes are sufficient for this compact index adapter.
    results: [] };
}
