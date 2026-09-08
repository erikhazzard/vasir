import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import test from 'node:test';
import vm from 'node:vm';
import { deriveExpectedWritingCategory, deriveExpectedLegacyWritingCategory, deriveExpectedProvisionalEvidence, verifyCandidateCategoryProjection, verifyWritingProofEvidence, WRITING_PARTIAL_FOOTNOTE } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const boundary = app.indexOf('(async function () {');
assert.ok(boundary > 0);
const context = vm.createContext({});
vm.runInContext(app.slice(0, boundary), context);
const build = (source, selectionId) => JSON.parse(JSON.stringify(context.buildWritingCategoryCollection(source, selectionId)));
const clone = value => JSON.parse(JSON.stringify(value));

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
  for (const skill of expected.entries.filter(entry => entry.condition === 'skill' && Number.isFinite(entry.exactScore))) if (!representatives.has(skill.sourceCount)) representatives.set(skill.sourceCount, skill);
  const sidebar = deriveExpectedWritingCategory(expected.collection).entries.find(entry => entry.condition === 'skill' && entry.rank === 1);
  return { selectionId: expected.selectionId, activeBenchmarkIds: expected.activeBenchmarkIds, benchmarkWeights: expected.benchmarkWeights, provisional: expected.provisional, completeSettings: expected.completeSettings, rankedSettings: expected.rankedSettings, partialSettings: expected.partialSettings, rowEvidence: rows,
    partialFootnote: WRITING_PARTIAL_FOOTNOTE, sidebarPartial: Boolean(sidebar?.partial), sidebarAsteriskRendered: Boolean(sidebar?.partial),
    headerEvidence: ['skill'].flatMap(condition => { const leaders = expected.entries.filter(entry => entry.condition === condition && entry.rank === 1); return leaders.length ? [{ condition, entryId: leaders[0].id, partial: leaders.some(entry => entry.partial), asteriskRendered: leaders[0].partial }] : []; }),
    componentEvidence: [...representatives.values()].flatMap(skill => { const baseline = expected.entries.find(entry => entry.settingId === skill.settingId && entry.condition === 'baseline'); return skill.benchmarkComponents.filter(item => item.weight > 0).map(item => ({ settingId: skill.settingId, benchmarkId: item.benchmarkId, exactBaseline: baseline.benchmarkComponents.find(component => component.benchmarkId === item.benchmarkId).exactScore, exactSkill: item.exactScore, weight: item.weight })); }),
    aggregateEvidence: [...representatives.values()].map(skill => ({ settingId: skill.settingId, exactBaseline: expected.entries.find(entry => entry.settingId === skill.settingId && entry.condition === 'baseline').exactScore, exactSkill: skill.exactScore, partial: skill.partial, asteriskRendered: skill.partial, divisor: skill.sourceCount })), mismatches: [] };
}
function receipt(expected, benchmarkId) {
  const category = Object.fromEntries(['method', 'selectionId', 'provisional', 'benchmarkWeights', 'comparisonBenchmarkIds', 'benchmarkIds', 'activeBenchmarkIds', 'groupIds', 'settingIds', 'completeSettings', 'rankedSettings', 'partialSettings', 'unscoredSettings', 'tiedRankEntries', 'regressionSettings', 'efficiencyEvidence'].map(key => [key, clone(expected[key])]));
  const result = { benchmarkId, trialCount: expected.publications.get(benchmarkId).trialCount, coverage: clone(expected.publications.get(benchmarkId).coverage),
    categoryEvidence: { ...category, mismatches: [], rawUnchanged: true, noPicker: true, tabsImmediatelyAfterHeader: true, answersLazy: true, disclosure: true, hash: '#capabilities/writing', visibleSettingIds: expected.entries.filter(entry => entry.condition === 'skill' && Number.isFinite(entry.exactScore)).map(entry => entry.settingId),
      provisionalDisplayEvidence: (expected.provisionalEvidence || []).map(({ reviewedAnswers, judgeConfigurationId, ...record }) => ({ ...record, judgeConfigurationIds: [judgeConfigurationId], activeBenchmarkIds: [...expected.activeBenchmarkIds], mismatches: [] })),
      selectionEvidence: expected.selectionIds.map(id => selectionEvidence(deriveExpectedWritingCategory(expected.collection, id))),
      presentationEvidence: { noPlaceholderPanels: true, compactRows: true, matchedEngineeringFrame: true, dumbbellGeometry: true, mismatches: [], numericPairedSettingIds: expected.entries.filter(entry => entry.condition === 'skill' && Number.isFinite(entry.exactScore)).map(entry => entry.settingId), dumbbellRows: rowEvidence(expected) } },
    provisionalArchiveEvidence: (expected.provisionalEvidence || []).map(record => ({ ...record, mismatches: [] })),
    scoredBranchCoverage: { ...Object.fromEntries(['completeSettings', 'rankedSettings', 'partialSettings', 'unscoredSettings', 'tiedRankEntries', 'regressionSettings'].map(key => [key, expected[key]])), efficiency: clone(expected.efficiencyEvidence), required: true } };
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
  if (benchmarkId === 'storytelling-magic-discovery') {
    result.provisionalArchiveEvidence = [];
    const archive = expected.creationArchive, publication = expected.publications.get(benchmarkId);
    const context = archive.promptFiles.find(file => file.id === 'frozen-informed-judge-context');
    result.creationArchiveEvidence = { profiles: archive.judgeProfiles.map(({id,configurationId,contextMode,contextSha256})=>({id,configurationId,contextMode,contextSha256})), contextSha256: crypto.createHash('sha256').update(context.content).digest('hex'), contextBytes: Buffer.byteLength(context.content), contextFileCount: publication.methodology.informedSkillFiles.length, verifiedRequestCount: archive.judgeRequests.length, verifiedOriginalFinals: archive.judgeRequests.filter(request=>request.status==='complete').length, contextRows: publication.settings.length, mismatches: [] };
    result.caseEvidence = publication.cases.flatMap(story=>Array.from({length:publication.trialCount},(_,index)=>{const trialNumber=index+1,cells=publication.caseResults.filter(cell=>cell.caseId===story.id&&cell.trialNumber===trialNumber);return {caseId:story.id,trialNumber,sourceResponses:cells.length,rows:publication.settings.length,judgments:cells.reduce((sum,cell)=>sum+cell.coverage.completedJudgments,0),mismatches:[]};}));
    result.creationExpandedEvidence = result.caseEvidence.map(task=>({caseId:task.caseId,trialNumber:task.trialNumber,mismatches:[],expanded:archive.judgeProfiles.map(profile=>{const response=archive.responses.find(answer=>answer.caseId===task.caseId&&answer.trialNumber===task.trialNumber&&answer.judgments.some(judge=>judge.reviewerId===profile.id)),judge=response.judgments.find(judge=>judge.reviewerId===profile.id),request=archive.judgeRequests.find(request=>request.id===judge.requestId);return {profileId:profile.id,requestId:request.id,outputSha256:request.outputSha256,promptSha256:request.promptSha256,geometry:{failureFlags:{evidenceClosed:false,promptClosed:false,pageOverflow:false}}};})}));
  }
  return result;
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
  assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source), expected));
  assert.equal(expected.completeSettings, 4);
  assert.equal(expected.rankedSettings, 4);
  assert.equal(expected.partialSettings, 29);
  assert.equal(expected.provisional, true);
  assert.deepEqual(expected.activeBenchmarkIds, ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery']);
  assert.deepEqual(expected.selectionIds.map(id => deriveExpectedWritingCategory(source, id).completeSettings), [4, 31, 4, 33, 1]);
  assert.deepEqual(expected.selectionIds.map(id => deriveExpectedWritingCategory(source, id).rankedSettings), [4, 31, 4, 33, 1]);
  for (const selectionId of expected.selectionIds) assert.doesNotThrow(() => verifyCandidateCategoryProjection(build(source, selectionId), deriveExpectedWritingCategory(source, selectionId)));
  for (const benchmarkId of expected.benchmarkIds) assert.doesNotThrow(() => verifyWritingProofEvidence(receipt(expected, benchmarkId), expected));
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
  const { source, archive, creation } = realSources();
  const expected = deriveExpectedWritingCategory(source);
  expected.provisionalEvidence = deriveExpectedProvisionalEvidence(expected, archive);
  expected.creationArchive = creation;
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
