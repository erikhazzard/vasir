import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { completePairedFixture, completeSupplementalPairedFixture } from './helpers/plot-twists-paired-fixture.js';
import { projectPlotTwistsPairedRun } from '../cli/eval/plot-twists-paired-publication.js';
import { deriveExpectedPairedTwistsEvidence } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const runtime = fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-browsercheck.mjs', import.meta.url), 'utf8');
const start = runtime.indexOf('async function inspectPairedTwistsReportInDocument(');
const collector = runtime.slice(start, runtime.indexOf('\nconst options = ', start));
assert.ok(start >= 0 && collector.length > 1000);
async function inspect({ projection, responseBundle }, document = null) {
  const context = vm.createContext({ window: { VASIR_WRITING: projection, VASIR_WRITING_RESPONSES: responseBundle },
    crypto: webcrypto, TextEncoder, Event, document });
  return JSON.parse(JSON.stringify(await vm.runInContext(collector + `\ninspectPairedTwistsReportInDocument({inspectDocument:${Boolean(document)}})`, context)));
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
