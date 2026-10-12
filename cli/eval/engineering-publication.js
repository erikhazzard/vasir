import crypto from 'node:crypto';
import { VasirCliError } from '../cli-error.js';
import { buildPublishedEngineeringAggregate } from './overall-publication.js';

const IDENTITY_FIELDS = ['id', 'configurationId', 'modelId', 'provider', 'family', 'reasoning', 'label'];
const EDITION = 'engineering-available-pairs-v2';
const identity = setting => Object.fromEntries(IDENTITY_FIELDS.map(field => [field, setting[field]]));
const clone = value => structuredClone(value);
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const hash = value => crypto.createHash('sha256').update(stable(value)).digest('hex');
const round = value => value === null ? null : Math.round((value + Number.EPSILON) * 10) / 10;

function requireEvidence(condition, message) {
  if (!condition) throw new VasirCliError({ code: 'BENCHMARK_PUBLISH_PROJECTION_INVALID', message: `Engineering publication: ${message}`,
    suggestion: 'Rebuild from the unchanged published task cells and testing score tables.', context: { stage: 'projection', safeRetry: true } });
}

// The testing publications use native condition IDs and a smaller cohort. This
// adapter retains their exact final scores and source IDs without model aliases.
function buildEngineeringSource({ architecture, testAuthoring, executableTesting }, edition) {
  requireEvidence(['engineering-all-tasks-v1', EDITION].includes(edition), 'the aggregate edition is unsupported.');
  requireEvidence(architecture?.scoreBasis?.edition === 'backend-architecture-panel-consensus-v2', 'the architecture source edition is unsupported.');
  const settings = new Map(architecture.settings.map(setting => [setting.configurationId, identity(setting)]));
  const benchmarks = clone(architecture.benchmarks);
  const benchmarkResults = architecture.benchmarkResults.map(cell => ({ ...clone(cell), exactScore: cell.score, sourceScoreBasisId: architecture.scoreBasis.id }));
  const benchmarkSummaries = clone(architecture.benchmarkSummaries);
  const results = clone(architecture.results);
  const tracks = clone(architecture.tracks);
  const judges = new Set(architecture.scoreBasis.judges);
  const sources = [{ id: architecture.scoreBasis.id, edition: architecture.scoreBasis.edition, scoreField: 'score',
    benchmarkIds: clone(architecture.scoreBasis.benchmarkIds), aggregation: architecture.scoreBasis.aggregation, batchUnit: architecture.scoreBasis.batchUnit }];

  for (const [publication, treatmentCondition] of [[testAuthoring, 'current'], [executableTesting, 'repaired']]) {
    if (!publication) continue;
    requireEvidence(publication.overall, 'a published testing task lacks its selected final score table.');
    const benchmarkId = publication.benchmark.id;
    const overall = publication.overall;
    const source = { id: overall.scoreBasis.id, edition: overall.scoreBasis.id, scoreField: 'score', benchmarkIds: [benchmarkId],
      sourceSha256: hash(overall), ...(overall.sourceSha256 ? { nativeSourceSha256: overall.sourceSha256 } : {}), aggregation: overall.scoreBasis.aggregation, batchUnit: 'published-benchmark-condition-total',
      conditionMapping: { none: 'baseline', [treatmentCondition]: 'skill' } };
    sources.push(source);
    for (const configuration of publication.configurations) {
      if (settings.has(configuration.id)) continue;
      const [modelId, reasoning] = configuration.id.split('@');
      const provider = modelId.split(':')[0];
      const family = configuration.label.split('·')[0].trim();
      requireEvidence(modelId && reasoning && provider && family, 'a testing configuration identity is incomplete.');
      settings.set(configuration.id, { id: configuration.id.replace(/[^a-z0-9]+/gi, '-'), configurationId: configuration.id,
        modelId, provider, family, reasoning, label: `${family} · ${reasoning}` });
    }
    for (const row of overall.rows) {
      const setting = settings.get(row.configurationId);
      const condition = source.conditionMapping[row.condition];
      requireEvidence(setting && condition, 'a testing row has an undeclared configuration or condition.');
      for (const judgment of row.judgments) judges.add(judgment.judgeConfigurationId);
      benchmarkResults.push({ settingId: setting.id, configurationId: setting.configurationId, condition, benchmarkId, category: 'engineering',
        score: round(row.score), exactScore: row.score, trials: 1, calibrated: false, status: 'development',
        sourceRowId: row.id, sourceCondition: row.condition, sourceScoreBasisId: source.id, sourceSha256: source.sourceSha256,
        latencyMs: null, inputTokens: null, outputTokens: null, totalTokens: null, costUsd: null });
    }
    const assessable = overall.summaries.filter(summary => Number.isFinite(summary.baseline) && Number.isFinite(summary.treatment));
    const wins = assessable.filter(summary => summary.treatment > summary.baseline).length;
    const ties = assessable.filter(summary => summary.treatment === summary.baseline).length;
    const losses = assessable.length - wins - ties;
    const summary = { benchmarkId, sourceScoreBasisId: source.id, sourceSha256: source.sourceSha256, status: 'development', verification: 'unverified',
      evidenceKind: 'development', baselineLabel: 'Minimal baseline', treatmentLabel: 'Testing skill',
      baseline: round(overall.baselineMean), treatment: round(overall.treatmentMean), delta: round(overall.meanPairedDifference),
      wins, ties, losses, complete: overall.rows.filter(row => row.score !== null).length, total: publication.configurations.length * 2,
      completionLabel: 'responses', calibration: 'Calibration pending', detailHref: `./benchmark-report.html#${benchmarkId}`, sourceHref: null };
    benchmarkSummaries.push(summary);
    results.push({ benchmarkId, status: 'development', verification: 'unverified', sourceScoreBasisId: source.id, sourceSha256: source.sourceSha256,
      baselineScore: summary.baseline, treatmentScore: summary.treatment, delta: summary.delta, record: { wins, ties, losses },
      responseCount: overall.rows.length, matchedConfigurationCount: assessable.length });
    benchmarks.push({ id: benchmarkId, trackId: 'backend-testing', familyId: 'engineering', category: 'engineering', suite: 'Backend Testing',
      name: publication.benchmark.title, title: publication.benchmark.title, description: publication.benchmark.description,
      reportFragment: benchmarkId, detailHref: `benchmark-report.html#${benchmarkId}`, evidenceKind: 'development',
      measured: { baseline: summary.baseline, treatment: summary.treatment, delta: summary.delta, wins, ties, losses,
        complete: summary.complete, total: summary.total, treatmentLabel: summary.treatmentLabel, calibration: summary.calibration } });
  }
  const testingIds = benchmarks.filter(benchmark => benchmark.trackId === 'backend-testing').map(benchmark => benchmark.id);
  if (testingIds.length) tracks.push({ id: 'backend-testing', familyId: 'engineering', title: 'Backend Testing',
    description: 'Writing and maintaining behavioral test suites.', benchmarkIds: testingIds });
  const benchmarkIds = benchmarks.map(benchmark => benchmark.id);
  return { program: clone(architecture.program), meta: clone(architecture.meta), categories: architecture.categories.map(category => ({ ...clone(category), trackIds: tracks.map(track => track.id) })),
    conditions: clone(architecture.conditions), families: architecture.families.map(family => ({ ...clone(family), trackIds: tracks.map(track => track.id) })),
    tracks, benchmarks, results, settings: [...settings.values()], benchmarkResults, benchmarkSummaries,
    scoreBasis: { id: `${edition}:${hash({ sources, benchmarkIds })}`, edition,
      aggregation: edition === EDITION ? 'equal-mean-of-authoritative-available-task-pairs-v2' : 'equal-mean-of-authoritative-final-task-scores-v1', batchUnit: 'task-specific', benchmarkIds, sources, judges: [...judges] } };
}

export function buildEngineeringPublication(sources, { edition = EDITION } = {}) {
  return buildPublishedEngineeringAggregate(buildEngineeringSource(sources, edition));
}

export function validateEngineeringPublication(engineering, sources) {
  const expected = buildEngineeringPublication(sources, { edition: engineering.scoreBasis.edition });
  requireEvidence(stable(engineering) === stable(expected), 'scores, weights, coverage, identity, resources, or source collections differ from independent source reconstruction.');
  return engineering;
}
