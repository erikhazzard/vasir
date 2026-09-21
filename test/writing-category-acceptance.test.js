import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildDungeonMasterPublication } from '../cli/eval/dungeon-master-publication.js';
import { acceptedWritingRankingFixture } from './fixtures/writing-ranking-accepted-20260908.js';
import { PAIRED_TWISTS_EDITION, deriveExpectedPairedTwistsEvidence, deriveExpectedWritingCategory, deriveExpectedLegacyWritingCategory, deriveExpectedProvisionalEvidence, deriveExpectedWritingBenchmarkLeader, deriveExpectedOverallV3, verifyOverallV3Projection, verifyCandidateCategoryProjection, verifyWritingProofEvidence, WRITING_PARTIAL_FOOTNOTE, WRITING_LEDGER_PRESENTATION, WRITING_LEADERS_PRESENTATION, WRITING_OVERALL_PRESENTATION, WRITING_LEDGER_PARTIAL_FOOTNOTE } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';
import { buildOverallPublication } from '../cli/eval/overall-publication.js';
import { buildSelectedWritingPublication } from '../cli/eval/writing-publication.js';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const boundary = app.indexOf('(async function () {');
assert.ok(boundary > 0);
const context = vm.createContext({});
vm.runInContext(app.slice(0, boundary), context);
const build = (source, selectionId) => JSON.parse(JSON.stringify(context.buildWritingCategoryCollection(source, selectionId)));
const clone = value => JSON.parse(JSON.stringify(value));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const fraction = weight => {
  for (let divisor = 1; divisor <= 1000; divisor++) if (Math.abs(Math.round(weight * divisor) / divisor - weight) < 1e-12) return divisor === 1 ? String(Math.round(weight)) : `${Math.round(weight * divisor)}/${divisor}`;
  assert.fail('Unsupported fixture fraction.');
};

function publication(id, group, configurations) {
  const settings = Object.keys(configurations).map(id => ({ id, configurationId: id }));
  const entries = settings.flatMap(setting => ['baseline', 'skill'].map((condition, index) => ({ id: `${setting.id}-${condition}`, settingId: setting.id, configurationId: setting.id, condition,
    exactScore: configurations[setting.id][index], score: configurations[setting.id][index], metrics: { meanLatencyMs: 1000, meanOutputTokens: 200 } })));
  return { benchmarks: [{ id, trackId: group }], settings, entries, cases: [{ id: 'one' }], trialCount: 1, tracks: [{ id: group, title: group }], coverage: { executionComplete: true, expectedResponseCount: entries.length, expectedJudgmentCount: entries.length * 2, responseCount: entries.length, judgmentCount: entries.length * 2, completedSettingCount: settings.filter(setting => configurations[setting.id].every(Number.isFinite)).length } };
}
function rowEvidence(expected) {
  return expected.entries.filter(entry => entry.condition === 'skill' && Number.isFinite(entry.exactScore)).map(skill => {
    const baseline = expected.entries.find(entry => entry.settingId === skill.settingId && entry.condition === 'baseline');
    return { settingId: skill.settingId, exactBaseline: baseline.exactScore, exactSkill: skill.exactScore, exactDelta: skill.exactDelta, baselineRank: baseline.rank, skillRank: skill.rank, baselinePosition: baseline.score, skillPosition: skill.score, partial: skill.partial, asteriskRendered: skill.partial, ariaLabel: `Plain ${baseline.score.toFixed(1)}, skill ${skill.score.toFixed(1)}${skill.partial ? '. Asterisk: some tests are missing.' : ''}` };
  });
}
function selectionEvidence(expected) {
  const rows = rowEvidence(expected), representatives = new Map();
  for (const skill of expected.entries.filter(entry => entry.condition === 'skill' && Number.isFinite(entry.exactScore))) {
    const signature = JSON.stringify(skill.benchmarkWeights);
    if (!representatives.has(signature)) representatives.set(signature, skill);
  }
  const sidebar = deriveExpectedWritingCategory(expected.collection, 'all-writing').entries.find(entry => entry.condition === 'skill' && entry.rank === 1);
  return { selectionId: expected.selectionId, activeBenchmarkIds: expected.activeBenchmarkIds, benchmarkWeights: expected.benchmarkWeights, provisional: expected.provisional, completeSettings: expected.completeSettings, rankedSettings: expected.rankedSettings, partialSettings: expected.partialSettings, rowEvidence: rows,
    partialFootnote: WRITING_PARTIAL_FOOTNOTE, sidebarPartial: Boolean(sidebar?.partial), sidebarAsteriskRendered: Boolean(sidebar?.partial), sidebarScore: sidebar ? sidebar.score.toFixed(1) : 'Results', sidebarLabel: 'All Writing aggregate leader',
    headerEvidence: ['skill'].flatMap(condition => { const leaders = expected.entries.filter(entry => entry.condition === condition && entry.rank === 1); return leaders.length ? [{ condition, entryId: leaders[0].id, partial: leaders.some(entry => entry.partial), asteriskRendered: leaders[0].partial }] : []; }),
    componentEvidence: [...representatives.values()].flatMap(skill => { const baseline = expected.entries.find(entry => entry.settingId === skill.settingId && entry.condition === 'baseline'); return skill.benchmarkComponents.filter(item => item.weight > 0).map(item => ({ settingId: skill.settingId, benchmarkId: item.benchmarkId, exactBaseline: baseline.benchmarkComponents.find(component => component.benchmarkId === item.benchmarkId).exactScore, exactSkill: item.exactScore, weight: item.weight })); }),
    aggregateEvidence: [...representatives.values()].map(skill => {
      const componentWeights = Object.fromEntries(skill.availableBenchmarkIds.map(id => [id, skill.benchmarkWeights[id]]));
      const equal = Object.values(componentWeights).every(weight => Math.abs(weight - 1 / skill.sourceCount) < 1e-12);
      return { settingId: skill.settingId, exactBaseline: expected.entries.find(entry => entry.settingId === skill.settingId && entry.condition === 'baseline').exactScore,
        exactSkill: skill.exactScore, partial: skill.partial, asteriskRendered: skill.partial, divisor: equal ? skill.sourceCount : null,
        method: equal ? 'arithmetic-mean' : 'weighted-sum', sourceCount: skill.sourceCount, componentWeights,
        formulas: ['baseline', 'skill'].map(condition => {
          const entry = expected.entries.find(item => item.settingId === skill.settingId && item.condition === condition);
          const terms = entry.benchmarkComponents.filter(item => item.weight > 0).map(item => item.score.toFixed(1) + (equal ? '' : ` × ${fraction(item.weight)}`));
          return `${condition}: (${terms.join(' + ')})${equal ? ` ÷ ${skill.sourceCount}` : ''} = ${entry.score.toFixed(1)}${skill.partial ? '*' : ''}`;
        }) };
    }), mismatches: [] };
}
function sharedViewEvidence(expected) {
  if (expected.selectionId !== 'all-writing') return {};
  const leader = expected.entries.find(entry => entry.condition === 'skill' && entry.rank === 1), sidebarScore = leader ? leader.score.toFixed(1) : 'Results';
  const first = expected.settingIds[0], second = expected.settingIds[1] || first;
  const secondary = expected.publications.has('storytelling-magic-discovery') ? 'storytelling-magic-discovery' : expected.selectionIds.find(id => expected.publications.has(id)) || 'all-writing';
  const shared = (mode, selectionId, selectedSettingId = null) => ({ mode, selectionId, selectedSettingId, sidebarScore, visible: true,
    hash: '#capabilities/writing' + (mode === 'models' ? '' : '/' + mode), mismatches: [] });
  const overview = (selectionId, selectedSettingId) => {
    const selected = deriveExpectedWritingCategory(expected.collection, selectionId);
    const skill = selected.entries.find(entry => entry.condition === 'skill' && entry.settingId === selectedSettingId);
    const baseline = selected.entries.find(entry => entry.condition === 'baseline' && entry.settingId === selectedSettingId);
    return { selectionId, selectedSettingId, selectedSettingIds: expected.settingIds, exactBaseline: baseline.exactScore, exactSkill: skill.exactScore,
      components: skill.availableBenchmarkIds.map(benchmarkId => ({ benchmarkId, weight: skill.benchmarkWeights[benchmarkId],
        exactBaseline: baseline.benchmarkComponents.find(item => item.benchmarkId === benchmarkId).exactScore, exactSkill: skill.benchmarkComponents.find(item => item.benchmarkId === benchmarkId).exactScore })),
      fieldMeans: [...expected.publications].map(([benchmarkId, source]) => {
        const official = source.benchmarkSummaries?.[0] || {}, provisional = source.provisionalLeaderboard;
        const pinned = benchmarkId === 'storytelling-core-idea' && expected.collection.writingScoreBasis?.coreIdeaScoring === 'published-single-judge-provisional';
        const usesProvisional = (pinned || !(Number.isFinite(official.baseline) && Number.isFinite(official.treatment))) && provisional?.status === 'provisional' && Boolean(provisional.rankedSettingCount);
        const summary = usesProvisional ? provisional.summary : official, fieldSelection = deriveExpectedWritingCategory(expected.collection, benchmarkId).selectionId;
        const baseline = Number.isFinite(summary.baseline) ? summary.baseline : null, skill = Number.isFinite(summary.treatment) ? summary.treatment : null;
        return { benchmarkId, selectionId: fieldSelection, baseline, skill, provisional: Boolean(usesProvisional), renderedBaseline: baseline?.toFixed(1) ?? '', renderedSkill: skill?.toFixed(1) ?? '',
          compareHref: 'https://example.test/index.html?' + new URLSearchParams({ score: fieldSelection, setting: selectedSettingId }) + '#capabilities/writing' };
      }), mismatches: [] };
  };
  return { selectorOptions: expected.selectionIds,
    sharedSelectorEvidence: [shared('models', 'all-writing', first), shared('benchmarks', 'all-writing', first), shared('efficiency', 'all-writing'),
      ...(expected.publications.has('storytelling-plot-twists') ? [shared('models', 'storytelling-plot-twists', second)] : [])],
    historyEvidence: [{ direction: 'back', ...shared('benchmarks', 'all-writing', second) }, { direction: 'forward', ...shared('benchmarks', secondary, second) }],
    benchmarkOverviewEvidence: [overview('all-writing', first), ...(first !== second ? [overview('all-writing', second)] : []), overview(secondary, second), overview('all-writing', second)] };
}
function receipt(expected, benchmarkId) {
  const category = Object.fromEntries(['method', 'selectionId', 'provisional', 'benchmarkWeights', 'comparisonBenchmarkIds', 'benchmarkIds', 'activeBenchmarkIds', 'groupIds', 'settingIds', 'completeSettings', 'rankedSettings', 'partialSettings', 'unscoredSettings', 'tiedRankEntries', 'regressionSettings', 'efficiencyEvidence'].map(key => [key, clone(expected[key])]));
  const result = { benchmarkId, trialCount: expected.publications.get(benchmarkId).trialCount, coverage: clone(expected.publications.get(benchmarkId).coverage),
    categoryEvidence: { ...category, ...sharedViewEvidence(expected), mismatches: [], rawUnchanged: true, noPicker: true, sharedScoreSelector: true, selectorInsideLeaderboard: false, tabsImmediatelyAfterHeader: true, answersLazy: true, disclosure: true, hash: '#capabilities/writing', visibleSettingIds: expected.entries.filter(entry => entry.condition === 'skill' && Number.isFinite(entry.exactScore)).map(entry => entry.settingId),
      provisionalDisplayEvidence: (expected.provisionalEvidence || []).map(({ reviewedAnswers, judgeConfigurationId, ...record }) => ({ ...record, judgeConfigurationIds: [judgeConfigurationId], activeBenchmarkIds: [...expected.activeBenchmarkIds],
        ...(expected.selectionId === 'all-writing' ? { placementEvidence: { comparisonBenchmarkId: record.benchmarkId, ledgerBenchmarkId: record.benchmarkId,
          compareHref: 'https://example.test/index.html?' + new URLSearchParams({ score: deriveExpectedWritingCategory(expected.collection, record.benchmarkId).selectionId, setting: expected.settingIds[1] || expected.settingIds[0] }) + '#capabilities/writing' } } : {}), mismatches: [] })),
      selectionEvidence: expected.selectionIds.map(id => selectionEvidence(deriveExpectedWritingCategory(expected.collection, id))),
      presentationEvidence: { noPlaceholderPanels: true, compactRows: true, matchedEngineeringFrame: true, dumbbellGeometry: true, mismatches: [], numericPairedSettingIds: expected.entries.filter(entry => entry.condition === 'skill' && Number.isFinite(entry.exactScore)).map(entry => entry.settingId), dumbbellRows: rowEvidence(expected) } },
    provisionalArchiveEvidence: (expected.provisionalEvidence || []).map(record => ({ ...record, mismatches: [] })),
    scoredBranchCoverage: { ...Object.fromEntries(['completeSettings', 'rankedSettings', 'partialSettings', 'unscoredSettings', 'tiedRankEntries', 'regressionSettings'].map(key => [key, expected[key]])), efficiency: clone(expected.efficiencyEvidence), required: true } };
  const commonCore = expected.provisionalEvidence?.find(item => item.benchmarkId === benchmarkId && item.scoringScope);
  if (commonCore) result.caseEvidence = commonCore.reportCases.map(story => ({ ...clone(story), mismatches: [] }));
  if (benchmarkId === 'dungeon-master-adventure-outline') {
    delete result.trialCount;
    delete result.scoredBranchCoverage;
    const source = expected.publications.get(benchmarkId);
    result.caseEvidence = source.cases.map(story => ({ caseId: story.id, answers: source.caseResults.filter(cell => cell.caseId === story.id).length,
      judgments: source.caseResults.filter(cell => cell.caseId === story.id).reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0),
      preferences: source.pairwisePreferences.filter(item => item.caseId === story.id).length, mismatches: [] }));
  }
  if (benchmarkId === 'storytelling-plot-twists' && expected.twistsPredecessors) {
    result.predecessorArchiveEvidence = { parentSourceSha256: expected.publications.get(benchmarkId).methodology.completion.parentSourceSha256, declaredCount: 2, renderedCount: 2,
      responses: expected.twistsPredecessors.map(response => ({ configurationId: response.configurationId, caseId: response.caseId,
        trialNumber: response.trialNumber, condition: response.condition, sourceSha256: response.provenance.sourceSha256,
        outputSha256: response.provenance.outputSha256, copiedOutputSha256: response.provenance.outputSha256,
        status: 'error', score: null, readStatus: 'incomplete', visible: true, copyAvailable: true })), mismatches: [] };
  }
  if (benchmarkId === 'storytelling-plot-twists' && expected.publications.get(benchmarkId).scoreBasis?.edition === PAIRED_TWISTS_EDITION) {
    const publication = expected.publications.get(benchmarkId), archive = expected.pairedTwistsArchive;
    result.pairedTwistsEvidence = deriveExpectedPairedTwistsEvidence(publication, archive);
    result.caseEvidence = publication.cases.map(task => ({ caseId: task.id, trialNumber: 1, rows: publication.settings.length,
      sourceResponses: archive.responses.filter(response => response.caseId === task.id).length,
      judgments: archive.responses.filter(response => response.caseId === task.id).reduce((count, response) => count + response.judgments.length, 0), mismatches: [] }));
  }
  if (benchmarkId === 'storytelling-magic-discovery') {
    result.provisionalArchiveEvidence = [];
    const archive = expected.creationArchive, publication = expected.publications.get(benchmarkId);
    const context = archive.promptFiles.find(file => file.id === 'frozen-informed-judge-context');
    result.creationArchiveEvidence = { profiles: archive.judgeProfiles.map(({id,configurationId,contextMode,contextSha256})=>({id,configurationId,contextMode,contextSha256})), contextSha256: crypto.createHash('sha256').update(context.content).digest('hex'), contextBytes: Buffer.byteLength(context.content), contextFileCount: publication.methodology.informedSkillFiles.length, verifiedRequestCount: archive.judgeRequests.length, verifiedOriginalFinals: archive.judgeRequests.filter(request=>request.status==='complete').length, contextRows: publication.settings.length, mismatches: [] };
    result.caseEvidence = publication.cases.flatMap(story=>Array.from({length:publication.trialCount},(_,index)=>{const trialNumber=index+1,cells=publication.caseResults.filter(cell=>cell.caseId===story.id&&cell.trialNumber===trialNumber);return {caseId:story.id,trialNumber,sourceResponses:cells.length,rows:publication.settings.length,judgments:cells.reduce((sum,cell)=>sum+cell.coverage.completedJudgments,0),mismatches:[]};}));
    result.creationExpandedEvidence = result.caseEvidence.map(task=>({caseId:task.caseId,trialNumber:task.trialNumber,mismatches:[],expanded:archive.judgeProfiles.map(profile=>{const response=archive.responses.find(answer=>answer.caseId===task.caseId&&answer.trialNumber===task.trialNumber&&answer.judgments.some(judge=>judge.reviewerId===profile.id)),judge=response.judgments.find(judge=>judge.reviewerId===profile.id),request=archive.judgeRequests.find(request=>request.id===judge.requestId);return {profileId:profile.id,requestId:request.id,outputSha256:request.outputSha256,promptSha256:request.promptSha256,geometry:{failureFlags:{evidenceClosed:false,promptClosed:false,pageOverflow:false}}};})}));
  }
  const compactArchive = expected.compactArchives?.[benchmarkId];
  if (compactArchive) {
    const publication = expected.publications.get(benchmarkId);
    result.compactEvidenceHarnessSha256 = crypto.createHash('sha256').update(fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-compact-browser-evidence.mjs', import.meta.url))).digest('hex');
    result.caseEvidence = publication.cases.map(task => {
      const responses = compactArchive.responses.filter(response => response.caseId === task.id);
      return { caseId: task.id, trialNumber: 1, rows: publication.settings.length, sourceResponses: responses.length,
        judgments: responses.reduce((count, response) => count + response.judgments.length, 0), mismatches: [] };
    });
    result.compactCaseEvidence = publication.cases.map(task => {
      const requestIds = new Set();
      const answers = compactArchive.responses.filter(response => response.caseId === task.id).map(response => {
        const scores = response.judgments.map(judgment => {
          requestIds.add(judgment.requestId);
          const request = compactArchive.judgeRequests.find(item => item.id === judgment.requestId);
          const candidate = Object.keys(request.candidateMap).find(label => request.candidateMap[label] === response.condition);
          const ratings = JSON.parse(request.outputText)['assessment' + candidate].ratings;
          return 20 * ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length;
        });
        return { configurationId: response.configurationId, condition: response.condition, outputSha256: response.provenance.outputSha256,
          requestIds: response.judgments.map(judgment => judgment.requestId), exactScore: scores.length === 2 ? (scores[0] + scores[1]) / 2 : null };
      });
      return { kind: 'vasirbenchmark-compact-writing-browser-evidence', benchmarkId, caseId: task.id,
        ...Object.fromEntries(['sourceSha256', 'manifestSha256', 'amendmentSha256', 'judgeValidationSha256'].map(key => [key, publication.scoreBasis[key] ?? null])),
        answers, requests: [...requestIds].map(requestId => {
          const request = compactArchive.judgeRequests.find(item => item.id === requestId);
          return { requestId, promptSha256: request.promptSha256, outputSha256: request.outputSha256 };
        }), mismatches: [] };
    });
  }
  return result;
}
function cleanReceipt(expected, benchmarkId) {
  const result = receipt(expected, benchmarkId), category = result.categoryEvidence;
  const secondary = expected.publications.has('storytelling-magic-discovery') ? 'storytelling-magic-discovery' : expected.selectionIds.find(id => expected.publications.has(id)) || 'all-writing';
  const comparison = expected.fixedBasis ? expected.listedBenchmarkIds[0] : expected.publications.has('storytelling-plot-twists') ? 'storytelling-plot-twists' : secondary;
  const first = expected.settingIds[0], second = expected.settingIds[1] || first;
  category.presentationVariant = WRITING_LEDGER_PRESENTATION;
  category.sharedSelectorEvidence = category.sharedSelectorEvidence.filter(item => item.mode !== 'benchmarks');
  const model = category.sharedSelectorEvidence.find(item => item.mode === 'models');
  category.sharedSelectorEvidence.push({ ...model, selectionId: comparison, selectedSettingId: second });
  category.historyEvidence = category.historyEvidence.map(item => ({ ...item, mode: 'models', hash: '#capabilities/writing' }));
  category.leaderboardCleanEvidence = { noProvisionalBanner: true, noVerboseCounts: true, methodologyAvailable: true, mismatches: [] };
  category.modelDisclosureEvidence = { defaultClosed: true, opensForAudit: true, closesAfterAudit: true, mismatches: [] };
  for (const selection of category.selectionEvidence) {
    selection.modelDisclosureEvidence = clone(category.modelDisclosureEvidence);
    selection.partialFootnote = WRITING_LEDGER_PARTIAL_FOOTNOTE;
  }
  result.reportPresentationEvidence = { benchmarkId, defaultClosed: true, modelComparisonFirst: true, modelComparisonHeading: 'Model comparison', secondaryTablesHidden: true, opensForAudit: true, closesAfterAudit: true, mismatches: [] };
  category.cleanLedgerEvidence = [['all-writing', first], ...(first !== second ? [['all-writing', second]] : []), [secondary, second], [comparison, second]].map(([selectionId, selectedSettingId]) => ({
    selectionId, selectedSettingId,
    groups: [...new Set(expected.listedBenchmarkIds.map(id => expected.sources.get(id).track))].map(trackId => ({ trackId, benchmarkIds: expected.listedBenchmarkIds.filter(id => expected.sources.get(id).track === trackId) })),
    rows: [...expected.publications].filter(([id]) => expected.listedBenchmarkIds.includes(id)).map(([benchmarkId, publication]) => {
      const official = publication.benchmarkSummaries?.[0] || {}, provisional = publication.provisionalLeaderboard;
      const hasOfficial = Number.isFinite(official.baseline) && Number.isFinite(official.treatment);
      const pinnedCore = expected.fixedBasis?.coreIdeaScoring === 'published-single-judge-provisional' && benchmarkId === 'storytelling-core-idea';
      const usesProvisional = (pinnedCore || !hasOfficial) && provisional?.status === 'provisional' && Boolean(provisional.rankedSettingCount), summary = usesProvisional ? provisional.summary : official;
      const row = { benchmarkId, trackId: expected.sources.get(benchmarkId).track, provisional: Boolean(usesProvisional), sourceKind: usesProvisional ? 'provisional-single-judge' : hasOfficial ? 'official-panel' : 'answers', sourceSha256: usesProvisional ? provisional.sourceSha256 : publication.scoreBasis?.sourceSha256 ?? null,
        compareHref: 'https://example.test/index.html?' + new URLSearchParams({ score: deriveExpectedWritingCategory(expected.collection, benchmarkId).selectionId, setting: selectedSettingId }) + '#capabilities/writing',
        reportHref: 'https://example.test/benchmark-report.html#' + benchmarkId,
        metadata: { settingCount: usesProvisional ? provisional.rankedSettingCount : publication.coverage.completedSettingCount, caseCount: usesProvisional ? provisional.expectedCaseCount : publication.cases.length, trialCount: publication.trialCount || publication.scoreBasis?.trialsPerTask || 1, judgeCount: usesProvisional ? provisional.judgeCount : publication.scoreBasis?.judgeCount || publication.scoreBasis?.judges?.length || 0 } };
      for (const [field, key] of [['baseline', 'baseline'], ['skill', 'treatment'], ['delta', 'delta']]) {
        row[field] = Number.isFinite(summary[key]) ? summary[key] : null;
        row['rendered' + field[0].toUpperCase() + field.slice(1)] = row[field] === null ? '' : field === 'delta' && expected.fixedBasis
          ? row[field] > 0 ? '+' + row[field].toFixed(1) : row[field] < 0 ? '−' + Math.abs(row[field]).toFixed(1) : '±0.0'
          : (field === 'delta' && row[field] > 0 ? '+' : '') + row[field].toFixed(1);
      }
      return row;
    }), noModelSelector: true, noBreakdown: true, noFormula: true, noScoreSelector: true, noInlineProvisional: true, noExplanationEssay: true, noPartialFootnote: true, noVisibleNoise: true, mismatches: []
  }));
  delete category.benchmarkOverviewEvidence;
  category.provisionalDisplayEvidence = [];
  category.provisionalMethodEvidence = (expected.provisionalEvidence || []).map(original => ({ benchmarkId: original.benchmarkId, sourceSha256: original.sourceSha256, judgeConfigurationIds: [original.judgeConfigurationId], ...(original.scoringScope ? { scoringScope: clone(original.scoringScope) } : {}), scope: 'category-methodology', defaultClosed: true, openedForAudit: true, provisional: true, singleJudge: true, excludedOverall: true, reportHref: 'https://example.test/benchmark-report.html#' + original.benchmarkId, closedAfterAudit: true, mismatches: [] }));
  return result;
}

function leaderReceipt(expected, benchmarkId) {
  const proof = cleanReceipt(expected, benchmarkId);
  proof.categoryEvidence.presentationVariant = WRITING_LEADERS_PRESENTATION;
  for (const selection of proof.categoryEvidence.selectionEvidence) for (const row of selection.rowEvidence) {
    const entry = expected.entries.find(item => item.settingId === row.settingId && item.condition === 'skill');
    const setting = [...expected.publications.values()].flatMap(publication => publication.settings).find(item => (item.configurationId || item.id) === entry.configurationId);
    row.configurationId = entry.configurationId;
    row.label = setting.label || [setting.family, setting.reasoning].filter(Boolean).join(' · ') || row.settingId;
  }
  const round = value => Math.round((value + 2 * Number.EPSILON * Math.max(1, Math.abs(value))) * 10) / 10;
  const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  for (const ledger of proof.categoryEvidence.cleanLedgerEvidence) for (const row of ledger.rows) {
    const leader = deriveExpectedWritingBenchmarkLeader(expected, row.benchmarkId);
    if (!leader) { row.topModel = null; continue; }
    const delta = round(leader.exactDelta);
    row.topModel = { ...leader, renderedBaseline: round(leader.exactBaseline).toFixed(1), renderedSkill: round(leader.exactSkill).toFixed(1), renderedDelta: delta > 0 ? '+' + delta.toFixed(1) : delta < 0 ? '−' + Math.abs(delta).toFixed(1) : '±0.0', visible: true,
      geometry: { viewportWidth: 390, row: rect(5, 5, 380, 120), comparison: rect(15, 15, 360, 100), block: rect(20, 20, 350, 90), fields: [{ name: 'label', rect: rect(25, 25, 200, 20) }, { name: 'baseline', rect: rect(25, 55, 70, 20) }, { name: 'skill', rect: rect(105, 55, 70, 20) }, { name: 'delta', rect: rect(185, 55, 70, 20) }], withinRow: true, withinComparison: true, withinViewport: true, fieldsWithinBlock: true, fieldsNonOverlapping: true, noTextOverflow: true }, mismatches: [] };
  }
  return proof;
}

function overallSourcesFixture() {
  const writing = allWritingFixture();
  for (const source of [writing, ...writing.benchmarkPublications.map(item => item.projection), writing.additionalBenchmarks.dm]) for (const setting of source.settings) Object.assign(setting, { modelId: 'model-' + setting.id, provider: 'test', family: 'Model ' + setting.id, reasoning: 'low', label: 'Model ' + setting.id + ' · low' });
  const direct = (category, ids) => ({ settings: clone(writing.settings), benchmarks: ids.map(id => ({ id, familyId: category })), scoreBasis: { edition: category === 'engineering' ? 'backend-architecture-panel-consensus-v2' : 'work-spec-generation-v1', benchmarkIds: ids },
    benchmarkResults: writing.settings.flatMap(setting => ids.flatMap(benchmarkId => ['baseline', 'skill'].map(condition => ({ settingId: setting.id, configurationId: setting.configurationId, benchmarkId, category, condition, trials: 1,
      score: category === 'engineering' ? condition === 'baseline' ? 40 : 60 : 1,
      exactScore: category === 'engineering' ? 99 : condition === 'baseline' ? 20 : 80,
      latencyMs: category === 'engineering' ? 1000 : 3000, inputTokens: 100, outputTokens: category === 'engineering' ? 200 : 400, totalTokens: 500 })))) });
  return { engineering: direct('engineering', ['e1', 'e2', 'e3']), aiWorkflows: direct('ai-workflows', ['ai']), writing };
}

function overallProjection(expected) {
  return { kind: 'vasirbenchmark-overall-projection', scoreBasis: { edition: 'overall-v3', method: 'priority-weighted-published-category-mean-v1', aggregation: 'weighted-category-means-of-authoritative-final-task-scores-v3', declarationVersion: 3, benchmarkWeighting: 'declared-within-category', categoryWeighting: 'declared-priority-normalized-over-published-v1', eligibility: 'all-published-tasks-in-both-conditions-v1', resourceAggregation: 'weighted-mean-over-the-same-task-cells-null-propagating-v3', publishedTargetWeight: 0.5,
    taskCount: expected.benchmarkIds.length, benchmarkIds: expected.benchmarkIds, categoryWeights: expected.categories.map(category => ({ categoryId: category.id, targetWeight: category.id === 'engineering' ? 0.25 : 0.125, weight: category.weight, taskCount: expected.benchmarkIds.filter(id => expected.benchmarkCategories[id] === category.id).length })), benchmarkWeights: expected.benchmarkIds.map(benchmarkId => ({ benchmarkId, familyId: expected.benchmarkCategories[benchmarkId], weight: expected.benchmarkWeights[benchmarkId] })) },
    categories: clone(expected.categories), portfolioCategories: [{ id: 'games', weight: 0, status: 'coming-soon', benchmarkIds: [], taskCount: 0 }], settings: clone(expected.settings), entries: clone(expected.entries), coverage: clone(expected.coverage),
    benchmarkResults: expected.sourceCells.map(cell => ({ ...cell, [cell.category === 'engineering' ? 'score' : 'exactScore']: cell.value })) };
}

function overallReceipt(expected, benchmarkId) {
  const proof = leaderReceipt(expected, benchmarkId), category = proof.categoryEvidence;
  category.presentationVariant = WRITING_OVERALL_PRESENTATION;
  category.overall = JSON.stringify(overallProjection(expected.overallV3));
  const sourceOverallSha256 = crypto.createHash('sha256').update(category.overall).digest('hex');
  proof.overallSha256 = sourceOverallSha256;
  category.overallIntegrationEvidence = { edition: 'overall-v3', sourceOverallSha256, includedCategoryIds: expected.overallV3.categories.map(category => category.id), categoryWeights: expected.overallV3.categoryWeights, writingBenchmarkWeights: expected.overallV3.writingBenchmarkWeights, writingSelectionId: 'all-writing', gamesExcluded: true, sourceScoreVerified: true, lazyBeforeWriting: true, answersLazy: true, mismatches: [] };
  const entry = expected.overallV3.entries.find(item => item.condition === 'skill');
  const component = entry.categories.find(item => item.category === 'writing');
  const writingEntry = expected.entries.find(item => item.condition === 'skill' && item.configurationId === entry.configurationId);
  category.overallIntegrationEvidence.writingSegmentNavigation = { clicked: { entryId: entry.id, settingId: entry.settingId, configurationId: entry.configurationId, exactScore: component.exactScore, weight: component.weight, staleSelection: 'storytelling' }, destination: { selectionId: 'all-writing', configurationId: writingEntry.configurationId, settingId: writingEntry.settingId, exactScore: writingEntry.exactScore, hash: '#capabilities/writing' }, mismatches: [] };
  for (const record of category.provisionalMethodEvidence) Object.assign(record, { excludedOverall: false, includedOverall: true, overallWeight: 0.25 });
  return proof;
}

function realSources() {
  const globals = { window: {} };
  for (const file of ['writing-data.js', 'writing-responses.js', 'writing-creation-responses.js', 'writing-twists-responses.js']) vm.runInNewContext(fs.readFileSync(new URL(`../site/vasirbenchmark.com/${file}`, import.meta.url), 'utf8'), globals);
  return { source: clone(globals.window.VASIR_WRITING), archive: clone(globals.window.VASIR_WRITING_RESPONSES), creation: clone(globals.window.VASIR_WRITING_CREATION_RESPONSES), twists: clone(globals.window.VASIR_WRITING_TWISTS_RESPONSES) };
}
function fixture() {
  const root = publication('story-a', 'storytelling', { a: [60, 80], b: [50, 70], c: [null, null] });
  root.benchmarkPublications = [{ benchmarkId: 'story-b', projection: publication('story-b', 'storytelling', { a: [40, 60], b: [50, null], c: [null, null] }) }];
  root.additionalBenchmarks = { prose: publication('prose', 'prose', { a: [100, 80], b: [80, null], c: [50, 60] }) };
  return root;
}

function allWritingFixture() {
  const core = publication('core', 'storytelling', { a: [0, 60], tie: [0, 60], mixedPartial: [20, 80], storyPartial: [20, 80], zero: [0, 0], missing: [null, null] });
  const twists = publication('twists', 'storytelling', { a: [20, 80], tie: [20, 80], mixedPartial: [null, null], storyPartial: [60, 40], zero: [0, 0], missing: [null, null] });
  const magic = publication('magic', 'storytelling', { a: [40, 100], tie: [40, 100], mixedPartial: [null, null], storyPartial: [null, null], zero: [0, 0], missing: [null, null] });
  const dm = publication('dm', 'dungeon-master', { a: [80, 40], tie: [80, 40], mixedPartial: [60, 40], storyPartial: [null, null], zero: [0, 0], missing: [null, null] });
  for (const entry of dm.entries) entry.metrics = { meanLatencyMs: 10000, meanOutputTokens: 8000 };
  core.benchmarkPublications = [{ projection: twists }, { projection: magic }];
  core.additionalBenchmarks = { dm };
  return core;
}

test('All Writing independently weights tracks equally, preserves track means and requires every selected paired benchmark to rank', () => {
  const source = allWritingFixture(), before = JSON.stringify(source);
  const expected = deriveExpectedWritingCategory(source, 'all-writing');
  assert.deepEqual(expected.selectionIds, ['all-writing', 'storytelling', 'core', 'twists', 'magic', 'dungeon-master']);
  assert.deepEqual(expected.benchmarkWeights, { core: 1 / 6, twists: 1 / 6, magic: 1 / 6, dm: 1 / 2 });
  assert.deepEqual(expected.groupWeights, { storytelling: 0.5, 'dungeon-master': 0.5 });
  assert.equal(expected.selection.type, 'category');
  assert.equal(expected.weighting, 'equal-tracks-equal-benchmarks');
  const skill = expected.entries.find(entry => entry.id === 'a-skill'), baseline = expected.entries.find(entry => entry.id === 'a-baseline');
  assert.equal(skill.exactScore, 60); assert.equal(baseline.exactScore, 50); assert.equal(skill.exactDelta, 10);
  assert.equal(skill.latency, 5.5); assert.equal(skill.tokens, 4100);
  assert.deepEqual(skill.categories.map(group => [group.category, group.exactScore, group.weight, group.exactContribution]), [['storytelling', 80, 0.5, 40], ['dungeon-master', 40, 0.5, 20]]);
  assert.equal(deriveExpectedWritingCategory(source).entries.find(entry => entry.id === 'a-skill').exactScore, 80, 'Legacy default remains the unchanged Storytelling mean.');
  assert.equal(deriveExpectedWritingCategory(source, 'dungeon-master').entries.find(entry => entry.id === 'a-skill').exactScore, 40);
  assert.deepEqual([expected.rankedSettings, expected.partialSettings, expected.unscoredSettings], [3, 2, 1]);
  assert.equal(skill.rank, 1); assert.equal(expected.entries.find(entry => entry.id === 'tie-skill').rank, 1);
  assert.equal(expected.entries.find(entry => entry.id === 'zero-skill').exactScore, 0);
  assert.equal(expected.entries.find(entry => entry.id === 'zero-skill').rank, 3);
  assert.equal(expected.entries.find(entry => entry.id === 'missing-skill').exactScore, null);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source, 'all-writing'), expected));
  assert.equal(JSON.stringify(source), before);
});

test('All Writing partials normalize the fixed selected weights, including different same-count subsets and missing resources', () => {
  const source = allWritingFixture();
  const expected = deriveExpectedWritingCategory(source, 'all-writing');
  const mixed = expected.entries.find(entry => entry.id === 'mixedPartial-skill'), story = expected.entries.find(entry => entry.id === 'storyPartial-skill');
  assert.equal(mixed.sourceCount, 2); assert.equal(story.sourceCount, 2);
  assert.deepEqual(mixed.benchmarkWeights, { core: 0.25, twists: 0, magic: 0, dm: 0.75 });
  assert.deepEqual(story.benchmarkWeights, { core: 0.5, twists: 0.5, magic: 0, dm: 0 });
  near(mixed.exactScore, 50); near(story.exactScore, 60);
  assert.equal(mixed.rank, null); assert.equal(story.rank, null);
  near(mixed.latency, 7.75); near(mixed.tokens, 6050);
  assert.deepEqual(mixed.benchmarkWeights, expected.entries.find(entry => entry.id === 'mixedPartial-baseline').benchmarkWeights);
  source.additionalBenchmarks.dm.entries.find(entry => entry.id === 'mixedPartial-skill').metrics.meanLatencyMs = null;
  const missing = deriveExpectedWritingCategory(source, 'all-writing');
  assert.equal(missing.entries.find(entry => entry.id === 'mixedPartial-skill').latency, null);
  near(missing.entries.find(entry => entry.id === 'mixedPartial-baseline').latency, 7.75);
  near(missing.entries.find(entry => entry.id === 'mixedPartial-skill').exactScore, 50);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source, 'all-writing'), missing));
});

test('All Writing acceptance rejects altered fixed weights, group contributions, source weights, metadata and partial promotion', () => {
  const source = allWritingFixture(), expected = deriveExpectedWritingCategory(source, 'all-writing');
  for (const mutate of [
    value => { value.writingCategory.benchmarkWeights.dm = 0.25; },
    value => { value.writingCategory.groups[0].weight = 0.75; },
    value => { value.categories[0].weight = 0.75; },
    value => { value.scoreBasis.benchmarkWeighting = 'equal-fixed-benchmarks-for-ranked-settings'; },
    value => { value.scoreBasis.subgroupWeighting = 'selected-track-only'; },
    value => { value.writingCategory.selections.reverse(); },
    value => { value.entries.find(entry => entry.id === 'a-skill').exactScore = 70; },
    value => { value.entries.find(entry => entry.id === 'a-skill').benchmarkComponents[0].exactContribution++; },
    value => { value.entries.find(entry => entry.id === 'mixedPartial-skill').benchmarkWeights.dm = 0.5; },
    value => { value.entries.find(entry => entry.id === 'mixedPartial-skill').categories[0].weight = 0.5; },
    value => { value.entries.find(entry => entry.id === 'mixedPartial-skill').categories[0].exactContribution++; },
    value => { value.entries.find(entry => entry.id === 'mixedPartial-skill').rank = 1; }
  ]) {
    const actual = build(source, 'all-writing'); mutate(actual);
    assert.throws(() => verifyCandidateCategoryProjection(actual, expected));
  }
});

test('All Writing browser evidence must exercise each actual weighting formula and the shared selector', () => {
  const expected = deriveExpectedWritingCategory(allWritingFixture(), 'all-writing');
  assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(expected, 'core'), expected));
  for (const mutate of [
    value => { value.categoryEvidence.sharedScoreSelector = false; },
    value => { value.categoryEvidence.selectorInsideLeaderboard = true; },
    value => { value.categoryEvidence.selectionEvidence[0].sidebarScore = '80.0'; },
    value => { value.categoryEvidence.selectionEvidence[0].sidebarLabel = 'Storytelling aggregate'; },
    value => { value.categoryEvidence.selectionEvidence[0].aggregateEvidence[0].method = 'arithmetic-mean'; },
    value => { value.categoryEvidence.selectionEvidence[0].aggregateEvidence[0].componentWeights.dm = 0.25; },
    value => { value.categoryEvidence.selectionEvidence[0].aggregateEvidence[0].sourceCount = 3; },
    value => { value.categoryEvidence.selectionEvidence[0].aggregateEvidence[0].divisor = 4; },
    value => { value.categoryEvidence.selectionEvidence[0].aggregateEvidence[0].formulas = ['Plain ÷ 4', 'Skill ÷ 4']; },
    value => { value.categoryEvidence.selectionEvidence[0].componentEvidence = value.categoryEvidence.selectionEvidence[0].componentEvidence.filter(item => item.settingId !== 'storyPartial');
      value.categoryEvidence.selectionEvidence[0].aggregateEvidence = value.categoryEvidence.selectionEvidence[0].aggregateEvidence.filter(item => item.settingId !== 'storyPartial'); }
  ]) {
    const proof = receipt(expected, 'core'); mutate(proof);
    assert.throws(() => verifyWritingProofEvidence(proof, expected));
  }
});

test('acceptance separates selected model scores from original all-model field means and verifies shared-view history', () => {
  const source = allWritingFixture();
  for (const publication of [source, ...source.benchmarkPublications.map(item => item.projection), source.additionalBenchmarks.dm]) {
    const paired = publication.settings.filter(setting => ['baseline', 'skill'].every(condition => Number.isFinite(publication.entries.find(entry => entry.settingId === setting.id && entry.condition === condition)?.exactScore)));
    const mean = condition => paired.reduce((sum, setting) => sum + publication.entries.find(entry => entry.settingId === setting.id && entry.condition === condition).exactScore, 0) / paired.length;
    publication.benchmarkSummaries = [{ benchmarkId: publication.benchmarks[0].id, baseline: mean('baseline'), treatment: mean('skill') }];
  }
  const expected = deriveExpectedWritingCategory(source, 'all-writing');
  const proof = receipt(expected, 'core');
  assert.equal(proof.categoryEvidence.benchmarkOverviewEvidence[0].exactSkill, 60);
  assert.equal(proof.categoryEvidence.benchmarkOverviewEvidence[0].fieldMeans.find(item => item.benchmarkId === 'core').skill, 56);
  assert.doesNotThrow(() => verifyWritingProofEvidence(proof, expected));
  for (const mutate of [
    value => { value.categoryEvidence.selectorOptions.reverse(); },
    value => { value.categoryEvidence.sharedSelectorEvidence = value.categoryEvidence.sharedSelectorEvidence.filter(item => item.mode !== 'benchmarks'); },
    value => { value.categoryEvidence.sharedSelectorEvidence[0].sidebarScore = '80.0'; },
    value => { value.categoryEvidence.sharedSelectorEvidence[0].visible = false; },
    value => { value.categoryEvidence.historyEvidence.pop(); },
    value => { value.categoryEvidence.historyEvidence[1].mode = 'models'; },
    value => { value.categoryEvidence.historyEvidence[0].selectedSettingId = 'a'; },
    value => { value.categoryEvidence.benchmarkOverviewEvidence.pop(); },
    value => { value.categoryEvidence.benchmarkOverviewEvidence[0].selectedSettingIds.pop(); },
    value => { value.categoryEvidence.benchmarkOverviewEvidence[0].exactSkill = 56; },
    value => { value.categoryEvidence.benchmarkOverviewEvidence[0].components[0].weight = 0.25; },
    value => { value.categoryEvidence.benchmarkOverviewEvidence[0].fieldMeans[0].skill = 60; },
    value => { value.categoryEvidence.benchmarkOverviewEvidence[0].fieldMeans[0].renderedSkill = '60.0'; },
    value => { value.categoryEvidence.benchmarkOverviewEvidence[0].fieldMeans[0].provisional = true; },
    value => { value.categoryEvidence.benchmarkOverviewEvidence[0].fieldMeans[0].compareHref = 'https://example.test/index.html?score=dm&setting=other#capabilities/writing'; },
    value => { value.categoryEvidence.benchmarkOverviewEvidence[0].mismatches.push('model-field-confusion'); }
  ]) {
    const changed = clone(proof); mutate(changed);
    assert.throws(() => verifyWritingProofEvidence(changed, expected));
  }
});

test('clean benchmark ledger preserves exact field means, hierarchy and scored-view math without the removed panels', () => {
  const source = allWritingFixture();
  for (const publication of [source, ...source.benchmarkPublications.map(item => item.projection), source.additionalBenchmarks.dm]) {
    publication.benchmarkSummaries = [{ benchmarkId: publication.benchmarks[0].id, baseline: 43, treatment: 57, delta: 14 }];
    publication.scoreBasis = { sourceSha256: 'a'.repeat(64), judgeCount: 2 };
  }
  const expected = deriveExpectedWritingCategory(source, 'all-writing'), proof = cleanReceipt(expected, 'core');
  assert.doesNotThrow(() => verifyWritingProofEvidence(proof, expected));
  assert.equal(proof.categoryEvidence.cleanLedgerEvidence[0].rows[0].skill, 57);
  assert.equal(proof.categoryEvidence.selectionEvidence[0].rowEvidence.find(row => row.settingId === 'a').exactSkill, 60);
  for (const mutate of [
    value => { value.categoryEvidence.presentationVariant = 'unreviewed-ledger'; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].noModelSelector = false; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].noFormula = false; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].noScoreSelector = false; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].noInlineProvisional = false; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].noVisibleNoise = false; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].skill = 60; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].metadata.judgeCount = 1; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].metadata.settingCount++; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].sourceSha256 = 'b'.repeat(64); },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].reportHref = 'https://example.test/benchmark-report.html#dm'; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].groups.reverse(); },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows.reverse(); },
    value => { value.categoryEvidence.cleanLedgerEvidence[1].selectedSettingId = 'a'; },
    value => { value.categoryEvidence.historyEvidence[0].mode = 'benchmarks'; },
    value => { value.categoryEvidence.modelDisclosureEvidence.defaultClosed = false; },
    value => { value.categoryEvidence.selectionEvidence[1].modelDisclosureEvidence.closesAfterAudit = false; },
    value => { value.reportPresentationEvidence.defaultClosed = false; },
    value => { value.reportPresentationEvidence.modelComparisonFirst = false; },
    value => { value.reportPresentationEvidence.secondaryTablesHidden = false; },
    value => { value.categoryEvidence.leaderboardCleanEvidence.noProvisionalBanner = false; },
    value => { value.categoryEvidence.selectionEvidence[0].aggregateEvidence[0].componentWeights.dm = 1 / 4; },
    value => { value.categoryEvidence.selectionEvidence[0].rowEvidence.find(row => row.partial).skillRank = 1; }
  ]) {
    const changed = clone(proof); mutate(changed);
    assert.throws(() => verifyWritingProofEvidence(changed, expected));
  }
});

function versionedLedgerFixture() {
  const ids = ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery'];
  const sources = ids.map(id => publication(id, 'storytelling', { a: [40, 60], b: [50, 70] }));
  const place = publication('writing-place-generation-v1', 'worldbuilding', { a: [80, 70], b: [90, 80] });
  sources[0].additionalBenchmarks = Object.fromEntries([...sources.slice(1), place].map(source => [source.benchmarks[0].id, source]));
  for (const [index, source] of [...sources, place].entries()) {
    const delta = [14, 3, 0, -7.5][index];
    source.benchmarkSummaries = [{ benchmarkId: source.benchmarks[0].id, baseline: 50, treatment: 50 + delta, delta }];
    source.scoreBasis = { sourceSha256: 'a'.repeat(64), judgeCount: 2 };
  }
  sources[0].writingScoreBasis = { id: 'writing-established-storytelling-v1', benchmarkIds: ids, method: 'equal-benchmark-mean' };
  sources[0].catalog = [...ids, place.benchmarks[0].id].map(id => ({ id, archived: id === 'storytelling-plot-twists' }));
  return sources[0];
}

test('v6 clean ledger exercises the first listed comparison; historical receipts retain the original Twists transition', () => {
  const source = versionedLedgerFixture(), expected = deriveExpectedWritingCategory(source, 'all-writing');
  const proof = cleanReceipt(expected, 'storytelling-core-idea');
  assert.equal(expected.method, 'versioned-common-benchmark-ranking-v6');
  assert.equal(expected.listedBenchmarkIds[0], 'storytelling-core-idea');
  assert.equal(proof.categoryEvidence.cleanLedgerEvidence.at(-1).selectionId, 'storytelling-core-idea');
  assert.doesNotThrow(() => verifyWritingProofEvidence(proof, expected));
  const stale = clone(proof);
  stale.categoryEvidence.cleanLedgerEvidence.at(-1).selectionId = 'storytelling-plot-twists';
  assert.throws(() => verifyWritingProofEvidence(stale, expected), /model\/scope transition coverage/);
  const missingClick = clone(proof);
  missingClick.categoryEvidence.sharedSelectorEvidence = missingClick.categoryEvidence.sharedSelectorEvidence.filter(item => item.selectionId !== 'storytelling-core-idea');
  assert.throws(() => verifyWritingProofEvidence(missingClick, expected), /compare-models link was not exercised/);

  delete source.writingScoreBasis;
  const historical = deriveExpectedWritingCategory(source, 'all-writing'), legacy = cleanReceipt(historical, 'storytelling-core-idea');
  assert.equal(legacy.categoryEvidence.cleanLedgerEvidence.at(-1).selectionId, 'storytelling-plot-twists');
  assert.doesNotThrow(() => verifyWritingProofEvidence(legacy, historical));
});

test('v6 all-model deltas require Unicode minus and signed zero without rewriting historical receipt notation', () => {
  const source = versionedLedgerFixture(), expected = deriveExpectedWritingCategory(source, 'all-writing');
  const proof = cleanReceipt(expected, 'storytelling-core-idea');
  const deltas = Object.fromEntries(proof.categoryEvidence.cleanLedgerEvidence[0].rows.map(row => [row.benchmarkId, row.renderedDelta]));
  assert.equal(deltas['storytelling-core-idea'], '+14.0');
  assert.equal(deltas['storytelling-magic-discovery'], '±0.0');
  assert.equal(deltas['writing-place-generation-v1'], '−7.5');
  assert.doesNotThrow(() => verifyWritingProofEvidence(proof, expected));
  for (const [id, staleSign] of [['storytelling-magic-discovery', '0.0'], ['writing-place-generation-v1', '-7.5']]) {
    const stale = clone(proof);
    stale.categoryEvidence.cleanLedgerEvidence[0].rows.find(row => row.benchmarkId === id).renderedDelta = staleSign;
    assert.throws(() => verifyWritingProofEvidence(stale, expected), /rendered all-model delta/);
  }
  delete source.writingScoreBasis;
  const historical = deriveExpectedWritingCategory(source, 'all-writing'), legacy = cleanReceipt(historical, 'storytelling-core-idea');
  const rows = legacy.categoryEvidence.cleanLedgerEvidence[0].rows;
  assert.equal(rows.find(row => row.benchmarkId === 'storytelling-magic-discovery').renderedDelta, '0.0');
  assert.equal(rows.find(row => row.benchmarkId === 'writing-place-generation-v1').renderedDelta, '-7.5');
  assert.doesNotThrow(() => verifyWritingProofEvidence(legacy, historical));
});

test('v6 pinned Core ledger keeps original single-judge provenance even when an official field summary exists', () => {
  const { source, archive } = realSources();
  source.benchmarkSummaries[0] = { ...source.benchmarkSummaries[0], baseline: 1, treatment: 2, delta: 1 };
  const expected = deriveExpectedWritingCategory(source, 'all-writing');
  expected.provisionalEvidence = deriveExpectedProvisionalEvidence(expected, archive);
  assert.equal(expected.fixedBasis.coreIdeaScoring, 'published-single-judge-provisional');
  const proof = cleanReceipt(expected, 'storytelling-core-idea');
  const row = proof.categoryEvidence.cleanLedgerEvidence[0].rows.find(row => row.benchmarkId === 'storytelling-core-idea');
  assert.equal(row.provisional, true);
  assert.equal(row.sourceKind, 'provisional-single-judge');
  assert.equal(row.sourceSha256, source.provisionalLeaderboard.sourceSha256);
  assert.equal(row.metadata.judgeCount, 1);
  assert.equal(row.baseline, source.provisionalLeaderboard.summary.baseline);
  assert.notEqual(row.baseline, source.benchmarkSummaries[0].baseline);
  assert.doesNotThrow(() => verifyWritingProofEvidence(proof, expected));
  for (const mutate of [
    value => { value.provisional = false; value.sourceKind = 'official-panel'; },
    value => { value.baseline = 1; value.renderedBaseline = '1.0'; },
    value => { value.metadata.judgeCount = 2; },
    value => { value.sourceSha256 = 'b'.repeat(64); }
  ]) {
    const stale = clone(proof);
    mutate(stale.categoryEvidence.cleanLedgerEvidence[0].rows.find(item => item.benchmarkId === 'storytelling-core-idea'));
    assert.throws(() => verifyWritingProofEvidence(stale, expected), /Clean ledger/);
  }
});

test('clean ledger requires source-qualified closed Methodology and unchanged original provisional review evidence', () => {
  const { source, archive, creation } = realSources(), expected = deriveExpectedWritingCategory(source, 'all-writing');
  expected.provisionalEvidence = deriveExpectedProvisionalEvidence(expected, archive);
  expected.creationArchive = creation;
  const id = expected.provisionalEvidence[0].benchmarkId, proof = cleanReceipt(expected, id);
  assert.doesNotThrow(() => verifyWritingProofEvidence(proof, expected));
  for (const mutate of [
    value => { value.categoryEvidence.provisionalMethodEvidence = []; },
    value => { value.categoryEvidence.provisionalMethodEvidence[0].singleJudge = false; },
    value => { value.categoryEvidence.provisionalMethodEvidence[0].closedAfterAudit = false; },
    value => { value.categoryEvidence.provisionalMethodEvidence[0].scope = 'original-report'; },
    value => { value.categoryEvidence.provisionalMethodEvidence[0].sourceSha256 = 'b'.repeat(64); },
    value => { value.categoryEvidence.provisionalMethodEvidence[0].judgeConfigurationIds = ['substituted-reviewer']; },
    value => { value.categoryEvidence.provisionalDisplayEvidence = [{ benchmarkId: id }]; },
    value => { value.provisionalArchiveEvidence[0].reviewedAnswers++; },
    value => { value.provisionalArchiveEvidence = []; }
  ]) {
    const changed = clone(proof); mutate(changed);
    assert.throws(() => verifyWritingProofEvidence(changed, expected));
  }
  // Magic still avoids downloading the unrelated original answer archive; its
  // visible source qualification remains mandatory and independently sourced.
  assert.doesNotThrow(() => verifyWritingProofEvidence(cleanReceipt(expected, 'storytelling-magic-discovery'), expected));
  const legacy = receipt(expected, id);
  assert.doesNotThrow(() => verifyWritingProofEvidence(legacy, expected));
  delete legacy.categoryEvidence.provisionalDisplayEvidence;
  assert.throws(() => verifyWritingProofEvidence(legacy, expected));
});

test('benchmark leader selection uses exact complete paired skill scores, codepoint ties and the same model baseline', () => {
  const source = publication('test', 'storytelling', { z: [10, 80], a: [100, 80], near: [0, 79.9999999999], missing: [null, 100], diagnostic: [100, 100], zero: [0, 0] });
  Object.assign(source.settings.find(setting => setting.id === 'a'), { configurationId: 'codex:Alpha@low', label: 'Explicit winner label' });
  source.settings.find(setting => setting.id === 'z').configurationId = 'codex:alpha@low';
  for (const entry of source.entries) entry.configurationId = source.settings.find(setting => setting.id === entry.settingId).configurationId;
  for (const entry of source.entries.filter(entry => entry.settingId === 'diagnostic')) entry.eligibleForRank = false;
  const expected = deriveExpectedWritingCategory(source, 'all-writing');
  assert.deepEqual(deriveExpectedWritingBenchmarkLeader(expected, 'test'), { settingId: 'a', configurationId: 'codex:Alpha@low', label: 'Explicit winner label', exactBaseline: 100, exactSkill: 80, exactDelta: -20, tiedCount: 2 });
  assert.doesNotThrow(() => verifyWritingProofEvidence(leaderReceipt(expected, 'test'), expected));
  const winner = source.settings.find(setting => setting.id === 'a');
  delete winner.label;
  Object.assign(winner, { family: 'Original model', reasoning: 'low' });
  assert.equal(deriveExpectedWritingBenchmarkLeader(deriveExpectedWritingCategory(source, 'all-writing'), 'test').label, 'Original model · low');
  delete winner.family; delete winner.reasoning;
  assert.equal(deriveExpectedWritingBenchmarkLeader(deriveExpectedWritingCategory(source, 'all-writing'), 'test').label, 'a');
  source.entries.find(entry => entry.settingId === 'a' && entry.condition === 'skill').exactScore = null;
  const remaining = deriveExpectedWritingBenchmarkLeader(deriveExpectedWritingCategory(source, 'all-writing'), 'test');
  assert.equal(remaining.settingId, 'z');
  assert.equal(remaining.tiedCount, 1);
  const zero = publication('zero', 'storytelling', { measured: [0, 0], missing: [null, null] });
  const zeroExpected = deriveExpectedWritingCategory(zero, 'all-writing');
  assert.equal(deriveExpectedWritingBenchmarkLeader(zeroExpected, 'zero').exactSkill, 0);
  assert.doesNotThrow(() => verifyWritingProofEvidence(leaderReceipt(zeroExpected, 'zero'), zeroExpected));
  zero.entries.forEach(entry => { entry.exactScore = null; });
  const unavailable = deriveExpectedWritingCategory(zero, 'all-writing');
  assert.equal(deriveExpectedWritingBenchmarkLeader(unavailable, 'zero'), null);
  assert.doesNotThrow(() => verifyWritingProofEvidence(leaderReceipt(unavailable, 'zero'), unavailable));
  const provisional = publication('basis', 'storytelling', { a: [null, null], z: [null, null] });
  provisional.provisionalLeaderboard = { status: 'provisional', entries: publication('basis', 'storytelling', { a: [30, 99], z: [20, 80] }).entries };
  assert.equal(deriveExpectedWritingBenchmarkLeader(deriveExpectedWritingCategory(provisional, 'all-writing'), 'basis').settingId, 'a');
  for (const entry of provisional.entries.filter(entry => entry.settingId === 'z')) entry.exactScore = entry.condition === 'baseline' ? 40 : 50;
  assert.equal(deriveExpectedWritingBenchmarkLeader(deriveExpectedWritingCategory(provisional, 'all-writing'), 'basis').settingId, 'z', 'One complete official pair must switch the whole benchmark basis, never retaining a higher provisional fallback');
});

test('benchmark leaders preserve field means and legacy ledgers while rejecting wrong winners, paired scores and overflow', () => {
  const expected = deriveExpectedWritingCategory(allWritingFixture(), 'all-writing'), proof = leaderReceipt(expected, 'core');
  assert.doesNotThrow(() => verifyWritingProofEvidence(proof, expected));
  assert.doesNotThrow(() => verifyWritingProofEvidence(cleanReceipt(expected, 'core'), expected));
  for (const mutate of [
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel = null; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.settingId = 'tie'; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.configurationId = 'wrong-config'; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.label = 'Wrong model'; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.exactBaseline = 0; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.exactSkill = 99; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.exactDelta++; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.tiedCount++; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.renderedSkill = '99.0'; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.visible = false; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.geometry.block.right = 400; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.geometry.fields[1].rect = { ...value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.geometry.fields[2].rect }; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.geometry.fields.pop(); },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.geometry.noTextOverflow = false; },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.mismatches.push('source mismatch'); },
    value => { value.categoryEvidence.cleanLedgerEvidence[0].rows[0].skill = 80; }
  ]) {
    const changed = clone(proof); mutate(changed);
    assert.throws(() => verifyWritingProofEvidence(changed, expected));
  }
  const absent = publication('absent', 'storytelling', { missing: [null, null] }), absentExpected = deriveExpectedWritingCategory(absent, 'all-writing'), absentProof = leaderReceipt(absentExpected, 'absent');
  absentProof.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel = clone(proof.categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel);
  assert.throws(() => verifyWritingProofEvidence(absentProof, absentExpected));
});

test('Overall v3 independently uses nested source weights and complete paired inputs without renormalizing missing resources', () => {
  const sources = overallSourcesFixture(), expected = deriveExpectedOverallV3(sources);
  assert.deepEqual(expected.categoryWeights, { engineering: 0.5, writing: 0.25, 'ai-workflows': 0.25 });
  assert.equal(expected.benchmarkIds.length, 8);
  assert.equal(expected.coverage.totalSettings, 6);
  assert.equal(expected.coverage.eligibleSettings, 3);
  const skill = expected.entries.find(entry => entry.id === 'a-skill');
  near(skill.exactScore, 65); near(skill.exactBaselineScore, 37.5); near(skill.exactDelta, 27.5);
  assert.equal(skill.rank, 1);
  near(skill.metrics.meanLatencyMs, 2625); near(skill.metrics.meanOutputTokens, 1225);
  assert.equal(skill.metrics.meanInputTokens, null);
  assert.equal(skill.metrics.sampleCount, 8);
  for (const record of expected.coverage.records.filter(record => !record.eligible)) {
    assert.deepEqual(record.exactScores, { baseline: null, skill: null });
    assert.deepEqual(record.ranks, { baseline: null, skill: null });
  }
  assert.doesNotThrow(() => verifyOverallV3Projection(overallProjection(expected), expected));
  for (const mutate of [
    value => { value.scoreBasis.categoryWeights[1].weight = 0; },
    value => { value.scoreBasis.benchmarkWeights.find(task => task.benchmarkId === 'dm').weight = 1 / 16; },
    value => { value.categories.push({ id: 'games', weight: 0.25 }); },
    value => { value.coverage.records.find(record => !record.eligible).ranks.skill = 1; },
    value => { value.entries[0].exactScore++; },
    value => { value.entries[0].categories[1].exactContribution++; },
    value => { value.entries[0].metrics.meanInputTokens = 100; },
    value => { value.settings[0].exactScores.skill++; },
    value => { value.benchmarkResults[0].score = 99; },
    value => { value.scoreBasis.benchmarkIds.pop(); }
  ]) {
    const changed = overallProjection(expected); mutate(changed);
    assert.throws(() => verifyOverallV3Projection(changed, expected));
  }
  sources.engineering.benchmarkResults = sources.engineering.benchmarkResults.filter(cell => !(cell.configurationId === 'a' && cell.benchmarkId === 'e3' && cell.condition === 'baseline'));
  const missing = deriveExpectedOverallV3(sources);
  assert.equal(missing.coverage.eligibleSettings, 2);
  assert.ok(!missing.entries.some(entry => entry.settingId === 'a'));
  assert.deepEqual(missing.coverage.records.find(record => record.configurationId === 'a').conditions.baseline.missingTaskIds, ['e3']);
});

test('Overall v3 discovers a newly published Writing benchmark and recomputes fixed within-track weights automatically', () => {
  const sources = overallSourcesFixture(), before = deriveExpectedOverallV3(sources);
  const added = publication('new-story', 'storytelling', { a: [100, 100], tie: [100, 100], zero: [0, 0] });
  for (const setting of added.settings) Object.assign(setting, sources.writing.settings.find(original => original.id === setting.id));
  sources.writing.benchmarkPublications.push({ projection: added });
  const after = deriveExpectedOverallV3(sources);
  assert.equal(after.benchmarkIds.length, 9);
  assert.deepEqual(after.categoryWeights, before.categoryWeights);
  assert.deepEqual(after.writingBenchmarkWeights, { core: 1 / 8, twists: 1 / 8, magic: 1 / 8, 'new-story': 1 / 8, dm: 1 / 2 });
  near(after.benchmarkWeights['new-story'], 1 / 32);
  near(after.entries.find(entry => entry.id === 'a-skill').exactScore, 65.625);
  assert.equal(after.coverage.expectedResponseCount, 6 * 9 * 2);
  assert.doesNotThrow(() => verifyOverallV3Projection(overallProjection(after), after));
  assert.throws(() => verifyOverallV3Projection(overallProjection(before), after));
});

test('Overall inclusion requires its own source-bound variant and honest Methodology while historical exclusion stays mandatory', () => {
  const sources = overallSourcesFixture(), expected = deriveExpectedWritingCategory(sources.writing, 'all-writing');
  expected.overallV3 = deriveExpectedOverallV3(sources);
  const proof = overallReceipt(expected, 'core');
  assert.doesNotThrow(() => verifyWritingProofEvidence(proof, expected));
  for (const mutate of [
    value => { value.categoryEvidence.overallIntegrationEvidence.categoryWeights.writing = 0; },
    value => { value.categoryEvidence.overallIntegrationEvidence.writingBenchmarkWeights.dm = 1 / 4; },
    value => { value.categoryEvidence.overallIntegrationEvidence.writingSelectionId = 'storytelling'; },
    value => { value.categoryEvidence.overallIntegrationEvidence.sourceOverallSha256 = 'f'.repeat(64); },
    value => { value.categoryEvidence.overallIntegrationEvidence.gamesExcluded = false; },
    value => { value.categoryEvidence.overallIntegrationEvidence.lazyBeforeWriting = false; },
    value => { value.categoryEvidence.overallIntegrationEvidence.writingSegmentNavigation.clicked.exactScore++; },
    value => { value.categoryEvidence.overallIntegrationEvidence.writingSegmentNavigation.clicked.weight = 0.5; },
    value => { value.categoryEvidence.overallIntegrationEvidence.writingSegmentNavigation.destination.selectionId = 'storytelling'; },
    value => { value.categoryEvidence.overallIntegrationEvidence.writingSegmentNavigation.destination.configurationId = 'another-model'; },
    value => { value.categoryEvidence.overallIntegrationEvidence.writingSegmentNavigation.destination.exactScore++; },
    value => { delete value.categoryEvidence.overallIntegrationEvidence.writingSegmentNavigation; },
    value => { const overall = JSON.parse(value.categoryEvidence.overall); overall.entries[0].exactScore++; value.categoryEvidence.overall = JSON.stringify(overall); },
    value => { delete value.categoryEvidence.overallIntegrationEvidence; }
  ]) {
    const changed = clone(proof); mutate(changed);
    assert.throws(() => verifyWritingProofEvidence(changed, expected));
  }
  const { source, archive, creation } = realSources();
  const dataContext = { window: {} }; vm.runInNewContext(fs.readFileSync(new URL('../site/vasirbenchmark.com/data.js', import.meta.url), 'utf8'), dataContext);
  const { overall, aiWorkflows, games, writing, ...engineering } = clone(dataContext.window.VASIR_DATA);
  const real = deriveExpectedWritingCategory(source, 'all-writing');
  real.provisionalEvidence = deriveExpectedProvisionalEvidence(real, archive); real.creationArchive = creation;
  real.overallV3 = deriveExpectedOverallV3({ engineering, aiWorkflows, writing: source, identityAliasPolicy: 'registered-claude-opus-5-alias-v1' });
  assert.doesNotThrow(() => verifyOverallV3Projection(buildOverallPublication({ engineering, aiWorkflows, writing: source }), real.overallV3));
  const included = overallReceipt(real, 'storytelling-core-idea');
  assert.doesNotThrow(() => verifyWritingProofEvidence(included, real));
  included.categoryEvidence.provisionalMethodEvidence[0].excludedOverall = true;
  assert.throws(() => verifyWritingProofEvidence(included, real));
  const historical = leaderReceipt(real, 'storytelling-core-idea');
  assert.doesNotThrow(() => verifyWritingProofEvidence(historical, real));
  historical.categoryEvidence.provisionalMethodEvidence[0].excludedOverall = false;
  assert.throws(() => verifyWritingProofEvidence(historical, real));
});

test('All Writing remains a distinct first option in a one-track collection without changing that track arithmetic', () => {
  const source = publication('single', 'storytelling', { a: [0, 0], b: [10, 20] });
  const all = deriveExpectedWritingCategory(source, 'all-writing'), track = deriveExpectedWritingCategory(source);
  assert.deepEqual(all.selectionIds, ['all-writing', 'storytelling']);
  assert.deepEqual(all.benchmarkWeights, track.benchmarkWeights);
  assert.deepEqual(all.entries, track.entries);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source, 'all-writing'), all));
});

test('acceptance independently averages the available paired benchmark subset for both conditions', () => {
  const source = fixture();
  const expected = deriveExpectedWritingCategory(source);
  assert.deepEqual(expected.benchmarkWeights, { 'story-a': 0.5, 'story-b': 0.5 });
  assert.equal(expected.completeSettings, 1);
  assert.equal(expected.rankedSettings, 1);
  assert.equal(expected.partialSettings, 1);
  assert.equal(expected.unscoredSettings, 1);
  assert.equal(expected.entries.find(entry => entry.id === 'a-skill').exactScore, 70);
  assert.equal(expected.entries.find(entry => entry.id === 'b-skill').exactScore, 70);
  assert.deepEqual(expected.entries.find(entry => entry.id === 'b-skill').benchmarkWeights, { 'story-a': 1, 'story-b': 0 });
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(expected, 'story-a'), expected));
});

test('acceptance rejects changed category weights, score arithmetic, ranks and group contributions', () => {
  const expected = deriveExpectedWritingCategory(fixture());
  for (const mutate of [
    value => { value.writingCategory.benchmarkWeights['story-a'] = 1; },
    value => { value.entries.find(entry => entry.id === 'a-skill').exactScore = 76; },
    value => { value.entries.find(entry => entry.id === 'a-skill').rank = 2; },
    value => { value.entries.find(entry => entry.id === 'a-skill').benchmarkComponents[0].exactScore = 40; },
    value => { value.entries.find(entry => entry.id === 'b-skill').latency = 2; },
    value => { value.entries.find(entry => entry.id === 'b-skill').benchmarkWeights['story-b'] = 0.5; },
    value => { value.entries.find(entry => entry.id === 'b-skill').partial = false; }
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

test('the original Plot twists edition retains its terminal exclusions and two complete configurations', () => {
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
  const { source, archive, creation, twists } = realSources();
  const expected = deriveExpectedWritingCategory(source);
  expected.provisionalEvidence = deriveExpectedProvisionalEvidence(expected, archive);
  expected.creationArchive = creation;
  expected.twistsPredecessors = twists.supersededResponses;
  if (expected.publications.get('storytelling-plot-twists').scoreBasis?.edition === PAIRED_TWISTS_EDITION) expected.pairedTwistsArchive = twists;
  expected.compactArchives = archive.compactBenchmarks;
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  assert.deepEqual(expected.activeBenchmarkIds, ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery']);
  for (const selectionId of expected.selectionIds) assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source, selectionId), deriveExpectedWritingCategory(source, selectionId)));
  for (const benchmarkId of expected.benchmarkIds) assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(expected, benchmarkId), expected));
  const all = { ...deriveExpectedWritingCategory(source, 'all-writing'), provisionalEvidence: expected.provisionalEvidence, creationArchive: creation, twistsPredecessors: twists.supersededResponses, pairedTwistsArchive: expected.pairedTwistsArchive, compactArchives: archive.compactBenchmarks };
  for (const benchmarkId of all.benchmarkIds) assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(all, benchmarkId), all));
  if (all.pairedTwistsArchive) {
    const proof = receipt(all, 'storytelling-plot-twists');
    assert.throws(() => verifyWritingProofEvidence(proof, { ...all, pairedTwistsArchive: undefined }), /archive missing/);
    const changed = clone(all.pairedTwistsArchive); changed.responses[0].outputText += ' changed';
    assert.throws(() => verifyWritingProofEvidence(proof, { ...all, pairedTwistsArchive: changed }), /answer hash/);
  }
});

test('independent acceptance preserves the exact accepted four-ranked-setting checkpoint', () => {
  const source = acceptedWritingRankingFixture();
  const expected = deriveExpectedWritingCategory(source);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  assert.equal(expected.completeSettings, 4);
  assert.equal(expected.rankedSettings, 4);
  assert.equal(expected.partialSettings, 29);
  assert.equal(expected.provisional, true);
  assert.deepEqual(expected.activeBenchmarkIds, ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery']);
  assert.equal(expected.selectionIds[0], 'all-writing');
  assert.deepEqual(expected.selectionIds.slice(1).map(id => deriveExpectedWritingCategory(source, id).completeSettings), [4, 31, 4, 33, 1]);
  assert.deepEqual(expected.selectionIds.slice(1).map(id => deriveExpectedWritingCategory(source, id).rankedSettings), [4, 31, 4, 33, 1]);
  for (const selectionId of expected.selectionIds) assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source, selectionId), deriveExpectedWritingCategory(source, selectionId)));
});

test('selected tests stay fixed when one is unavailable; individual scores remain selectable', () => {
  const source = publication('finished', 'storytelling', { a: [50, 80], b: [60, 90] });
  const wider = publication('pending', 'storytelling', { a: [40, 70], b: [50, 80], c: [30, 90] });
  wider.coverage.executionComplete = false;
  source.additionalBenchmarks = { wider };
  let expected = deriveExpectedWritingCategory(source);
  assert.equal(expected.completeSettings, 2);
  assert.deepEqual(expected.activeBenchmarkIds, ['finished', 'pending']);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  wider.coverage.executionComplete = true;
  wider.entries.forEach(entry => { entry.eligibleForRank = false; });
  expected = deriveExpectedWritingCategory(source);
  assert.equal(expected.completeSettings, 0);
  assert.deepEqual(expected.benchmarkWeights, { finished: 0.5, pending: 0.5 });
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  assert.equal(deriveExpectedWritingCategory(source, 'finished').completeSettings, 2);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source, 'finished'), deriveExpectedWritingCategory(source, 'finished')));
  wider.entries.forEach(entry => { entry.eligibleForRank = true; });
  expected = deriveExpectedWritingCategory(source);
  assert.equal(expected.completeSettings, 2);
  assert.deepEqual(expected.activeBenchmarkIds, ['finished', 'pending']);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
});

test('provisional aggregate acceptance binds both DOM and original-review evidence to the exact qualified source', () => {
  const { source, archive, creation } = realSources();
  const expected = deriveExpectedWritingCategory(source);
  expected.provisionalEvidence = deriveExpectedProvisionalEvidence(expected, archive);
  expected.creationArchive = creation;
  assert.equal(expected.provisionalEvidence.length, 1);
  const observed = expected.provisionalEvidence[0];
  const original = source.provisionalLeaderboard;
  assert.equal(observed.rankedSettings, original.rankedSettingCount);
  assert.equal(observed.incompleteSettings, original.incompleteSettings.length);
  assert.equal(observed.sourceSha256, original.sourceSha256);
  assert.ok(expected.activeBenchmarkIds.includes(original.benchmarkId));
  assert.equal(expected.provisional, true);
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

test('All Writing acceptance preserves provisional disclosure placement and its selected-model comparison link', () => {
  const { source, archive, creation } = realSources(), expected = deriveExpectedWritingCategory(source, 'all-writing');
  expected.provisionalEvidence = deriveExpectedProvisionalEvidence(expected, archive);
  expected.creationArchive = creation;
  const benchmarkId = expected.provisionalEvidence[0].benchmarkId;
  assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(expected, benchmarkId), expected));
  for (const mutate of [
    display => { delete display.placementEvidence; },
    display => { display.placementEvidence.comparisonBenchmarkId = 'storytelling-magic-discovery'; },
    display => { display.placementEvidence.ledgerBenchmarkId = 'storytelling-magic-discovery'; },
    display => { display.placementEvidence.compareHref = 'https://example.test/?score=all-writing&setting=unknown#capabilities/writing'; }
  ]) {
    const proof = receipt(expected, benchmarkId); mutate(proof.categoryEvidence.provisionalDisplayEvidence[0]);
    assert.throws(() => verifyWritingProofEvidence(proof, expected));
  }
});

test('provisional acceptance independently rejects altered original ratings, ranks, incomplete cases and summary totals', () => {
  const originals = realSources();
  for (const mutate of [
    ({ source }) => { source.provisionalLeaderboard.entries.find(entry => entry.eligibleForRank).rank++; },
    ({ source }) => { source.provisionalLeaderboard.entries.find(entry => entry.eligibleForRank).exactScore++; },
    ({ source }) => { if (source.provisionalLeaderboard.incompleteSettings.length) source.provisionalLeaderboard.incompleteSettings[0].missingCaseIds = [];
      else source.provisionalLeaderboard.incompleteSettings.push({ settingId: source.settings[0].id, missingCaseIds: [] }); },
    ({ source }) => { source.provisionalLeaderboard.summary.exactDelta++; },
    ({ archive }) => { const judgment = archive.responses.flatMap(answer => answer.judgments).find(judge => judge.judgeConfigurationId === 'codex:gpt-6-astra@xhigh'); judgment.score++; }
  ]) {
    const data = clone(originals); mutate(data);
    assert.throws(() => deriveExpectedProvisionalEvidence(deriveExpectedWritingCategory(data.source), data.archive));
  }
});

test('common-eleven acceptance recomputes the fixed scored corpus, resources and all original story displays', t => {
  const repoRootDirectory = fileURLToPath(new URL('../', import.meta.url));
  const selection = JSON.parse(fs.readFileSync(new URL('../benchmarks/storytelling-core-idea/publication.json', import.meta.url)));
  if (!fs.existsSync(repoRootDirectory + selection.run.path)) return t.skip('Private original Core evidence is not installed.');
  const { projection, responseBundle } = buildSelectedWritingPublication({ repoRootDirectory, benchmarkId: 'storytelling-core-idea' });
  const evidence = () => deriveExpectedProvisionalEvidence(deriveExpectedWritingCategory(projection), responseBundle);
  const observed = evidence()[0];
  assert.equal(observed.rankedSettings, 33); assert.equal(observed.reviewedAnswers, 33 * 11 * 2);
  assert.equal(observed.reportCases.length, 12);
  assert.equal(observed.reportCases.find(story => story.caseId === 'the-matrix').scoringScope.excluded, true);
  assert.ok(observed.reportCases.filter(story => story.caseId !== 'the-matrix').every(story => story.scoringScope.rows.every(row => Number.isFinite(row.baseline) && Number.isFinite(row.skill))));
  for (const mutate of [
    ({ projection }) => { projection.provisionalLeaderboard.caseIds[0] = 'the-matrix'; },
    ({ projection }) => { projection.methodology.derivedScoreBasis.selectionTiming = 'preregistered'; },
    ({ projection }) => { projection.provisionalLeaderboard.scoredCorpusSha256 = '0'.repeat(64); },
    ({ projection }) => { projection.provisionalLeaderboard.entries[0].metrics.meanLatencyMs++; },
    ({ responseBundle }) => { responseBundle.responses = responseBundle.responses.filter(answer => answer.caseId !== 'the-matrix'); },
    ({ responseBundle }) => { responseBundle.responses.find(answer => answer.caseId !== 'the-matrix').judgments.find(judge => judge.judgeConfigurationId === 'codex:gpt-6-astra@xhigh').score++; }
  ]) {
    const changed = clone({ projection, responseBundle }); mutate(changed);
    assert.throws(() => deriveExpectedProvisionalEvidence(deriveExpectedWritingCategory(changed.projection), changed.responseBundle));
  }
});

test('a selected track excludes other tracks and verifies every dropdown field and dumbbell coordinate', () => {
  const source=publication('a-broad','storytelling',{a:[40,50],b:[50,60],c:[60,70]});
  source.additionalBenchmarks={narrow:publication('narrow','dungeon-master',{a:[99,100]}),different:publication('b-different','poetry',{a:[90,95],b:[90,95],d:[90,95]})};
  const expected=deriveExpectedWritingCategory(source);
  assert.deepEqual(expected.activeBenchmarkIds,['a-broad']);
  assert.equal(expected.completeSettings,3);
  assert.equal(expected.entries.find(entry=>entry.id==='a-skill').exactScore,50);
  assert.doesNotThrow(()=>verifyCandidateCategoryProjection(build(source),expected));
  const proof=receipt(expected,'a-broad');
  for(const mutate of [
    value=>{value.categoryEvidence.presentationEvidence.noPlaceholderPanels=false;},
    value=>{value.categoryEvidence.presentationEvidence.compactRows=false;},
    value=>{value.categoryEvidence.presentationEvidence.numericPairedSettingIds.pop();},
    value=>{value.categoryEvidence.presentationEvidence.dumbbellRows[0].exactSkill++;},
    value=>{value.categoryEvidence.presentationEvidence.dumbbellRows[0].skillPosition++;},
    value=>{value.categoryEvidence.partialEvidence={rows:[]};},
    value=>{value.categoryEvidence.selectionEvidence.pop();},
    value=>{value.categoryEvidence.selectionEvidence[1].componentEvidence[0].weight=0.5;},
    value=>{value.categoryEvidence.selectionEvidence[1].rowEvidence[0].ariaLabel='Missing paired score';},
    value=>{value.categoryEvidence.selectionEvidence[1].rowEvidence[0].baselineRank=2;}
  ]){const altered=clone(proof);mutate(altered);assert.throws(()=>verifyWritingProofEvidence(altered,expected));}
});

test('whole-source official precedence never falls back to provisional scores for missing individual models',()=>{
  const source=publication('a','storytelling',{a:[40,60],b:[50,70],c:[60,80]});
  const unfinished=publication('b','storytelling',{a:[80,90],b:[null,null],c:[null,null]});
  unfinished.coverage.executionComplete=false;
  unfinished.provisionalLeaderboard={status:'provisional',entries:publication('provisional','storytelling',{a:[99,100],b:[99,100],c:[99,100]}).entries};
  source.additionalBenchmarks={unfinished};
  const final=deriveExpectedWritingCategory(source);
  assert.deepEqual(final.activeBenchmarkIds,['a','b']);
  assert.equal(final.completeSettings,1);
  assert.equal(final.provisional,false);
  assert.equal(final.entries.find(entry=>entry.id==='a-skill').exactScore,75);
  assert.equal(final.entries.find(entry=>entry.id==='b-skill').exactScore,70);
  assert.equal(final.entries.find(entry=>entry.id==='b-skill').benchmarkComponents[1].exactScore,null);
  assert.equal(final.rankedSettings,1);
  assert.equal(final.partialSettings,2);
  assert.doesNotThrow(()=>verifyCandidateCategoryProjection(build(source),final));
  unfinished.entries.forEach(entry=>{entry.exactScore=null;});
  const provisional=deriveExpectedWritingCategory(source);
  assert.equal(provisional.completeSettings,3);
  assert.equal(provisional.provisional,true);
  assert.doesNotThrow(()=>verifyCandidateCategoryProjection(build(source),provisional));
});

test('declared incomplete pairs remain unavailable even when an entry contains a finite diagnostic total', () => {
  for (const coverage of [{ expectedCases: 10, scoredCases: 9 }, { expectedResponses: 10, completedResponses: 9 }, { expectedJudgments: 20, completedJudgments: 18 }]) {
    const source = publication('a', 'storytelling', { a: [40, 60], b: [50, 70] });
    const other = publication('b', 'storytelling', { a: [80, 90], b: [99, 100] });
    Object.assign(other.entries.find(entry => entry.settingId === 'b' && entry.condition === 'skill'), { coverage });
    source.additionalBenchmarks = { other };
    const expected = deriveExpectedWritingCategory(source);
    assert.equal(expected.completeSettings, 1);
    assert.equal(expected.entries.find(entry => entry.id === 'b-skill').exactScore, 70);
    assert.equal(expected.entries.find(entry => entry.id === 'b-skill').latency, 1);
    assert.equal(expected.entries.find(entry => entry.id === 'b-skill').benchmarkComponents[1].exactScore, null);
    assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
    const invented = build(source);
    Object.assign(invented.entries.find(entry => entry.id === 'b-skill'), { exactScore: 85, score: 85, rank: 1, exactDelta: 10 });
    assert.throws(() => verifyCandidateCategoryProjection(invented, expected));
  }
});

test('acceptance rejects altered source identity, raw publication, setting totals and provisional qualification', () => {
  const source = fixture();
  const expected = deriveExpectedWritingCategory(source);
  for (const mutate of [
    value => { value.entries[0].benchmarkComponents[0].basis.id = 'another-judge'; },
    value => { value.writingCategory.publications[0].entries[0].exactScore++; },
    value => { value.settings[0].exactScores.skill++; },
    value => { value.entries[0].provisional = !expected.provisional; },
    value => { value.entries.find(entry => entry.id === 'a-skill').metrics.meanLatencyMs = null; value.entries.find(entry => entry.id === 'a-skill').latency = null; }
  ]) {
    const actual = build(source); mutate(actual);
    assert.throws(() => verifyCandidateCategoryProjection(actual, expected));
  }
});

test('all available-score counts are checked, with the same paired subset and no zero-filled scores', () => {
  const source = publication('one', 'storytelling', { complete: [0, 10], missingOne: [10, 20], missingTwo: [50, 60], unpaired: [80, null] });
  source.additionalBenchmarks = {
    two: publication('two', 'storytelling', { complete: [10, 20], missingOne: [30, 40], missingTwo: [null, null], unpaired: [null, 99] }),
    three: publication('three', 'storytelling', { complete: [20, 30], missingOne: [null, null], missingTwo: [null, null], unpaired: [null, null] })
  };
  const expected = deriveExpectedWritingCategory(source);
  assert.deepEqual([expected.completeSettings, expected.rankedSettings, expected.partialSettings, expected.unscoredSettings], [1, 1, 2, 1]);
  for (const [id, baseline, skill, available] of [['complete', 10, 20, 3], ['missingOne', 20, 30, 2], ['missingTwo', 50, 60, 1], ['unpaired', null, null, 0]]) {
    const plain = expected.entries.find(entry => entry.id === `${id}-baseline`), aided = expected.entries.find(entry => entry.id === `${id}-skill`);
    assert.equal(plain.exactScore, baseline);
    assert.equal(aided.exactScore, skill);
    assert.equal(aided.sourceCount, available);
    assert.deepEqual(plain.availableBenchmarkIds, aided.availableBenchmarkIds);
    assert.equal(aided.benchmarkComponents.filter(item => item.weight > 0).length, available);
  }
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  const proof = receipt(expected, 'one');
  assert.doesNotThrow(() => verifyWritingProofEvidence(proof, expected));
  for (const mutate of [
    value => { value.categoryEvidence.selectionEvidence[0].rowEvidence.find(row => row.settingId === 'missingOne').partial = false; },
    value => { value.categoryEvidence.selectionEvidence[0].rowEvidence.find(row => row.settingId === 'missingTwo').asteriskRendered = false; },
    value => { value.categoryEvidence.selectionEvidence[0].rowEvidence.find(row => row.settingId === 'complete').asteriskRendered = true; },
    value => { value.categoryEvidence.selectionEvidence[0].headerEvidence[0].asteriskRendered = true; },
    value => { value.categoryEvidence.selectionEvidence[0].sidebarAsteriskRendered = true; },
    value => { value.categoryEvidence.selectionEvidence[0].partialFootnote = 'Some data missing'; },
    value => { value.categoryEvidence.selectionEvidence[0].componentEvidence = value.categoryEvidence.selectionEvidence[0].componentEvidence.filter(item => item.settingId !== 'missingTwo'); },
    value => { value.categoryEvidence.selectionEvidence[0].componentEvidence.find(item => item.settingId === 'missingOne').weight = 1 / 3; },
    value => { value.categoryEvidence.selectionEvidence[0].aggregateEvidence.find(item => item.settingId === 'missingOne').divisor = 3; },
    value => { value.categoryEvidence.selectionEvidence[0].aggregateEvidence.find(item => item.settingId === 'missingTwo').asteriskRendered = false; },
    value => { value.categoryEvidence.selectionEvidence[0].aggregateEvidence.find(item => item.settingId === 'missingTwo').exactBaseline = 50 / 3; },
    value => { value.categoryEvidence.rankedSettings = 3; },
    value => { value.scoredBranchCoverage.partialSettings = 0; }
  ]) {
    const altered = clone(proof); mutate(altered);
    assert.throws(() => verifyWritingProofEvidence(altered, expected));
  }
});

test('missing resource readings do not silently change the available score subset or its weights', () => {
  const source = publication('one', 'storytelling', { a: [40, 60], b: [50, 70] });
  source.additionalBenchmarks = { two: publication('two', 'storytelling', { a: [60, 80], b: [null, null] }) };
  source.additionalBenchmarks.two.entries.find(entry => entry.id === 'a-skill').metrics.meanLatencyMs = null;
  source.entries.find(entry => entry.id === 'b-skill').metrics.meanOutputTokens = null;
  const expected = deriveExpectedWritingCategory(source);
  assert.equal(expected.entries.find(entry => entry.id === 'a-skill').exactScore, 70);
  assert.equal(expected.entries.find(entry => entry.id === 'a-skill').latency, null);
  assert.equal(expected.entries.find(entry => entry.id === 'a-baseline').latency, 1);
  assert.equal(expected.entries.find(entry => entry.id === 'b-skill').exactScore, 70);
  assert.equal(expected.entries.find(entry => entry.id === 'b-skill').tokens, null);
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  const invented = build(source);
  invented.entries.find(entry => entry.id === 'a-skill').latency = 1;
  assert.throws(() => verifyCandidateCategoryProjection(invented, expected), /latency/);
});

test('historical v2 derivation remains available without changing the new default score policy', () => {
  const source = fixture();
  const historical = deriveExpectedLegacyWritingCategory(source);
  assert.equal(historical.method, 'planned-roster-finalized-equal-subcategory-complete-paired-index-v2');
  assert.deepEqual(historical.benchmarkWeights, { 'story-a': 0.25, 'story-b': 0.25, prose: 0.5 });
  assert.equal(historical.entries.find(entry => entry.id === 'a-skill').exactScore, 75);
  assert.equal(deriveExpectedWritingCategory(source).entries.find(entry => entry.id === 'a-skill').exactScore, 70);
});

test('Dungeon Master acceptance requires every candidate case and exact original answer, judge and preference counts', () => {
  // Exercise retained evidence directly; a private historical edition need not
  // remain in the active public collection to preserve its integrity checks.
  const { projection: source, responseBundle: archive } = buildDungeonMasterPublication({ repoRootDirectory: fileURLToPath(new URL('../', import.meta.url)) });
  const expected = deriveExpectedWritingCategory(source);
  expected.provisionalEvidence = deriveExpectedProvisionalEvidence(expected, archive);
  const id = 'dungeon-master-adventure-outline';
  assert.ok(expected.publications.has(id), 'The historical projector must retain its selected DM publication.');
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
