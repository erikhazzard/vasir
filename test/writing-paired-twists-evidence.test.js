import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { completePairedFixture, completeSupplementalPairedFixture, createPairedFixture, mockPairedProvider } from './helpers/plot-twists-paired-fixture.js';
import { exportPairedRun, preparePairedTechnicalRecovery, preparePairedRun, runPairedGenerations, runPairedJudgments } from '../cli/eval/plot-twists-paired-runtime.js';
import { fileURLToPath } from 'node:url';
import { projectPlotTwistsPairedRun } from '../cli/eval/plot-twists-paired-publication.js';
import { PAIRED_NATIVE_CONFIGURATION_IDS, deriveExpectedPairedTwistsEvidence } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const runtime = fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-browsercheck.mjs', import.meta.url), 'utf8');
const start = runtime.indexOf('async function inspectPairedTwistsReportInDocument(');
const collector = runtime.slice(start, runtime.indexOf('\nconst options = ', start));
assert.ok(start >= 0 && collector.length > 1000);
async function inspect({ projection, responseBundle }, document = null) {
  const context = vm.createContext({ window: { VASIR_WRITING: projection, VASIR_WRITING_RESPONSES: responseBundle },
    crypto: webcrypto, TextEncoder, Event, document, registeredConfigurationIds: PAIRED_NATIVE_CONFIGURATION_IDS });
  return JSON.parse(JSON.stringify(await vm.runInContext(collector + `\ninspectPairedTwistsReportInDocument({inspectDocument:${Boolean(document)},registeredConfigurationIds})`, context)));
}

function renderedDocument({ projection, responseBundle }, { omitPrompt = false, replaceOutput = false } = {}) {
  const opened = new Set();
  const text = value => ({ textContent: value });
  const rows = projection.settings.map(setting => ({ dataset: { reportSettingId: setting.id }, querySelector(selector) {
    const condition = selector.match(/data-condition="([^"]+)"/)?.[1];
    const answer = responseBundle.responses.find(response => response.settingId === setting.id && response.condition === condition);
    return { querySelector: key => key === '[data-output-text]' ? text(answer.outputText) : null,
      querySelectorAll: () => answer.judgments.map(judge => {
        const request = responseBundle.judgeRequests.find(item => item.id === judge.requestId);
        const prompt = { open: false, dispatchEvent() {}, querySelector: () => text(request.promptText) };
        const original = { tagName: 'DETAILS', dataset: { creationJudgeEvidence: request.id }, open: false,
          dispatchEvent() { if (this.open) opened.add(request.id); }, querySelector: key => key === '[data-creation-original-review]'
            ? text(replaceOutput ? '{}' : request.outputText) : omitPrompt ? null : prompt };
        return { dataset: { reviewerId: judge.judgeConfigurationId }, querySelectorAll: () => [original], querySelector(key) {
          const id = key.match(/data-dimension-id="([^"]+)"/)?.[1], reading = judge.dimensions[id];
          return { querySelector: name => text(name === '[data-dimension-reason]' ? reading.reason : reading.evidence) };
        } };
      }) };
  } }));
  return { opened, querySelectorAll: selector => selector === '[data-report-setting-id]' ? rows : [], querySelector(selector) {
    const id = selector.match(/data-rubric-dimension="([^"]+)"/)?.[1];
    const criterion = projection.cases[0].rubric.find(item => item.id === id);
    return criterion ? { querySelector: key => text(key === '[data-rubric-description]' ? criterion.criterion
      : projection.methodology.ratingAnchors[key.match(/data-rubric-anchor="([^"]+)"/)[1]]) } : null;
  } };
}

test('recovery browser and oracle bind authorized replacements, retained originals and effective paired reviews', async t => {
  const sourceDirectory = fileURLToPath(new URL('../.agents/vasir-evals/storytelling-plot-twists-paired-v2/remaining-writing-coverage-20260909T2257Z', import.meta.url));
  if (!fs.existsSync(sourceDirectory)) return t.skip('Private stopped-run evidence is not installed.');
  const source = exportPairedRun({ runDirectoryPath: sourceDirectory });
  const root = path.dirname(createPairedFixture(t)), sourceSnapshotPath = path.join(root, 'stopped-source.json');
  fs.writeFileSync(sourceSnapshotPath, JSON.stringify(source, null, 2) + '\n', { flag: 'wx' });
  const runDirectoryPath = path.join(root, 'recovery-oracle');
  preparePairedTechnicalRecovery({ runDirectoryPath, sourceSnapshotPath, authorization: { approvedAt: '2026-09-10T00:00:00.000Z',
    userInstruction: 'please do it', scope: 'Rerun only the three skill answers affected by tool errors and their reviews; preserve all clean results and original attempts.' } });
  const calls = [];
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  const { snapshot } = await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  const built = projectPlotTwistsPairedRun({ snapshot, sourceSha256: hash(JSON.stringify(snapshot)) });
  const expected = deriveExpectedPairedTwistsEvidence(built.projection, built.responseBundle);
  assert.equal(calls.length, 57);
  assert.equal(expected.recordSources.filter(row => row.disposition === 'technical-replacement').length, 5);
  assert.deepEqual(await inspect(built), expected);
  assert.deepEqual(await inspect(built, renderedDocument(built)), expected);
  for (const [name, mutate] of [
    ['rewritten stopped source', contract => { contract.technicalRecovery.sourceSnapshotSha256 = contract.sourceSha256; }],
    ['new score selected as replacement', contract => { contract.technicalRecovery.replacementGenerationIds[0] = contract.technicalRecovery.pendingGenerationIds[0]; }],
    ['retained answer relabeled', contract => { contract.recordSources.find(row => row.disposition === 'retained').sourceCohort = 'recovery'; }],
    ['superseded original omitted', contract => { delete contract.recordSources.find(row => row.disposition === 'technical-replacement').supersedesRecordSha256; }],
    ['historical calls recertified', contract => { contract.toolIsolationPolicy.historicalResultsReclassified = true; }],
    ['missing isolated call', contract => { contract.toolIsolationPolicy.generationIds.pop(); }]
  ]) await t.test(name, async () => {
    const changed = structuredClone(built); mutate(changed.projection.methodology.sourceContract);
    changed.responseBundle.sourceContract = structuredClone(changed.projection.methodology.sourceContract);
    assert.throws(() => deriveExpectedPairedTwistsEvidence(changed.projection, changed.responseBundle));
    assert.ok((await inspect(changed)).mismatches.length);
  });
  for (const mutate of [
    value => { value.responseBundle.responses.find(answer => answer.provenance.recordDisposition === 'technical-replacement').runtime.attemptNumber = 1; },
    value => { value.responseBundle.judgeRequests.find(request => request.provenance.recordDisposition === 'technical-replacement').provenance.supersedesRecordSha256 = '0'.repeat(64); },
    value => { value.responseBundle.responses.find(answer => answer.provenance.recordDisposition === 'retained').provenance.technicalRecoverySha256 = expected.technicalRecovery.sha256; }
  ]) {
    const changed = structuredClone(built); mutate(changed);
    assert.throws(() => deriveExpectedPairedTwistsEvidence(changed.projection, changed.responseBundle));
    assert.ok((await inspect(changed)).mismatches.length);
  }
});

test('fresh paired evidence binds every original answer, exact input, paired review and rating to the six-model source', async t => {
  const { snapshot } = await completePairedFixture(t);
  const built = projectPlotTwistsPairedRun({ snapshot, sourceSha256: hash(JSON.stringify(snapshot)) });
  const expected = deriveExpectedPairedTwistsEvidence(built.projection, built.responseBundle);
  assert.equal(expected.answers.length, 12);
  assert.equal(expected.requests.length, 12);
  assert.deepEqual(await inspect(built), expected);
  const document = renderedDocument(built);
  assert.deepEqual(await inspect(built, document), expected);
  assert.equal(document.opened.size, 12, 'Every original paired request must be opened, not merely inferred from answer-level ratings.');

  for (const [label, mutate] of [
    ['non-medium creator', value => { value.projection.settings[0].configurationId = 'codex:gpt-6-astra@high'; }],
    ['historical trials', value => { value.projection.trialCount = 10; }],
    ['missing answer', value => { value.responseBundle.responses.pop(); }],
    ['duplicate judge', value => { value.responseBundle.responses[0].judgments[1].judgeConfigurationId = value.responseBundle.responses[0].judgments[0].judgeConfigurationId; }],
    ['changed answer', value => { value.responseBundle.responses[0].outputText += ' changed'; }],
    ['changed original review', value => { value.responseBundle.judgeRequests[0].outputText += ' '; }],
    ['changed judge prompt', value => { value.responseBundle.judgeRequests[0].promptText += ' '; }],
    ['changed candidate binding', value => { value.responseBundle.judgeRequests[0].candidateResponseHashes.A = '0'.repeat(64); }],
    ['changed public rating', value => { Object.values(value.responseBundle.responses[0].judgments[0].dimensions)[0].rating = 0; }],
    ['invented score', value => { value.projection.entries[0].exactScore += 1; }],
    ['frozen skill edit', value => { value.responseBundle.promptFiles[0].content += '\nchanged'; }],
    ['host role equivalence fiction', value => { value.responseBundle.messageSets.find(item => item.messages[0].role === 'developer').messages[0].role = 'system'; }],
    ['exact message hash edit', value => { value.responseBundle.responses[0].provenance.exactMessagesSha256 = '0'.repeat(64); }],
    ['old original mixed in', value => { value.responseBundle.supersededResponses = []; }]
  ]) await t.test(label, async () => {
    const changed = structuredClone(built); mutate(changed);
    assert.throws(() => deriveExpectedPairedTwistsEvidence(changed.projection, changed.responseBundle));
    assert.ok((await inspect(changed)).mismatches.length, label);
  });

  for (const options of [{ omitPrompt: true }, { replaceOutput: true }]) {
    assert.ok((await inspect(built, renderedDocument(built, options))).mismatches.length, 'Source hashes alone cannot substitute for rendered original evidence.');
  }
});

test('same-edition coverage proof requires all fourteen settings and the original/supplement source bindings', async t => {
  const { snapshot } = await completeSupplementalPairedFixture(t);
  const built = projectPlotTwistsPairedRun({ snapshot, sourceSha256: hash(JSON.stringify(snapshot)) });
  const expected = deriveExpectedPairedTwistsEvidence(built.projection, built.responseBundle);
  assert.equal(expected.answers.length, 28); assert.equal(expected.requests.length, 28);
  assert.equal(expected.answers.filter(answer => answer.provenance.sourceCohort === 'original').length, 12);
  assert.equal(expected.requests.filter(request => request.provenance.sourceCohort === 'supplement').length, 16);
  const document = renderedDocument(built);
  assert.deepEqual(await inspect(built, document), expected);
  assert.equal(document.opened.size, 28);
  for (const [label, mutate] of [
    ['missing retained answer', value => { value.responseBundle.responses.splice(0, 1); }],
    ['missing supplemental review', value => { value.responseBundle.judgeRequests.pop(); }],
    ['partial setting ranked', value => { value.projection.coverage.completedSettingCount--; }],
    ['undeclared effort', value => { value.projection.settings.at(-1).configurationId = 'claude:claude-opus-5@max'; }],
    ['old six-only score inventory', value => { value.projection.entries.splice(12); }],
    ['original answer relabeled as new', value => { value.responseBundle.responses[0].provenance.sourceCohort = 'supplement'; }],
    ['original answer source rewritten', value => { value.responseBundle.responses[0].provenance.sourceSnapshotSha256 = value.projection.scoreBasis.sourceSha256; }],
    ['supplement review claims parent manifest', value => { value.responseBundle.judgeRequests.at(-1).provenance.sourceManifestSha256 = expected.coverageExtension.parentManifestSha256; }],
    ['undeclared append', value => { delete value.projection.methodology.sourceContract.coverageExtension; delete value.responseBundle.sourceContract.coverageExtension; }],
    ['altered declared roster', value => { value.projection.methodology.sourceContract.coverageExtension.addedConfigurations.pop(); }],
    ['changed independent score', value => { value.projection.entries.at(-1).exactScore++; }]
  ]) await t.test(label, async () => {
    const changed = structuredClone(built); mutate(changed);
    assert.throws(() => deriveExpectedPairedTwistsEvidence(changed.projection, changed.responseBundle));
    assert.ok((await inspect(changed)).mismatches.length, label);
  });
});

test('generic append proof derives its roster from disjoint pinned cohorts without assuming a final size', async t => {
  const parent = await completeSupplementalPairedFixture(t);
  const directory = path.dirname(parent.runDirectoryPath), parentSnapshotPath = path.join(directory, 'qa-accepted-parent.json');
  fs.writeFileSync(parentSnapshotPath, JSON.stringify(parent.snapshot, null, 2) + '\n', { flag: 'wx' });
  const runDirectoryPath = path.join(directory, 'qa-declared-append');
  preparePairedRun({ runDirectoryPath, parentSnapshotPath, addedConfigurations: ['codex:gpt-6-astra@high'] });
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider() });
  const { snapshot } = await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider() });
  const built = projectPlotTwistsPairedRun({ snapshot, sourceSha256: hash(JSON.stringify(snapshot)) });
  const expected = deriveExpectedPairedTwistsEvidence(built.projection, built.responseBundle);
  assert.deepEqual(expected.sourceCohorts.map(cohort => cohort.configurationIds.length), [6, 8, 1]);
  assert.equal(expected.answers.length, 30); assert.equal(expected.requests.length, 30);
  const document = renderedDocument(built);
  assert.deepEqual(await inspect(built, document), expected); assert.equal(document.opened.size, 30);
  for (const [label, mutate] of [
    ['omitted old cohort', value => { value.projection.methodology.sourceContract.sourceCohorts.splice(1, 1); }],
    ['rewritten original pin', value => { value.projection.methodology.sourceContract.sourceCohorts[0].sourceSnapshotSha256 = '0'.repeat(64); }],
    ['history parent replaced', value => { value.projection.methodology.sourceContract.coverageHistory.at(-1).parentSnapshotSha256 = '0'.repeat(64); }],
    ['latest history differs', value => { value.projection.methodology.sourceContract.coverageHistory.at(-1).purpose += ' changed'; }],
    ['duplicate configuration', value => { value.projection.methodology.sourceContract.sourceCohorts.at(-1).configurationIds[0] = 'codex:gpt-6-astra@medium'; }],
    ['unknown native mode', value => { value.projection.methodology.sourceContract.sourceCohorts.at(-1).configurationIds[0] = 'codex:gpt-5.6-luna@ultra'; }],
    ['new cohort count inflated', value => { value.projection.methodology.sourceContract.coverageHistory.at(-1).additionalGenerationCount++; }],
    ['first supplement relabeled', value => { value.responseBundle.responses[12].provenance.sourceSnapshotSha256 = value.projection.scoreBasis.sourceSha256; }],
    ['retained review relabeled', value => { value.responseBundle.judgeRequests[12].provenance.sourceManifestSha256 = value.projection.scoreBasis.manifestSha256; }],
    ['missing declared answer', value => { value.responseBundle.responses.pop(); }],
    ['invented new score', value => { value.projection.entries.at(-1).exactScore++; }]
  ]) await t.test(label, async () => {
    const changed = structuredClone(built); mutate(changed);
    assert.throws(() => deriveExpectedPairedTwistsEvidence(changed.projection, changed.responseBundle));
    assert.ok((await inspect(changed)).mismatches.length, label);
  });
});
