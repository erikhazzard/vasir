import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import test from 'node:test';
import vm from 'node:vm';

const runtime = fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-browsercheck.mjs', import.meta.url), 'utf8');
const from = runtime.indexOf('async function inspectWritingPredecessorArchiveInDocument()');
const to = runtime.indexOf('\nconst options =', from);
assert.ok(from >= 0 && to > from);
const collector = runtime.slice(from, to);
const hash = value => createHash('sha256').update(value).digest('hex');

function fixture() {
  const parent = 'a'.repeat(64);
  const responses = [9, 3].map((trialNumber, index) => ({ configurationId: `codex:model-${index}@ultra`, caseId: 'scifi-outline', trialNumber,
    condition: 'skill', status: 'error', score: null, judgments: [], failureReason: 'The original mandatory reads were incomplete.',
    outputText: `Exact original ${index}.\n\nWhitespace  Ω <outline>.\nLast line.`, runtime: { requiredSkillReads: { status: 'incomplete' } },
    provenance: { sourceSha256: parent } }));
  for (const response of responses) response.provenance.outputSha256 = hash(response.outputText);
  const originalClipboard = { writeText: async () => { throw Error('The real clipboard must never be used by this test.'); } };
  const context = { crypto: webcrypto, TextEncoder, navigator: { clipboard: originalClipboard }, window: {
    VASIR_WRITING: { benchmarks: [{ id: 'storytelling-plot-twists' }], methodology: { completion: { parentSourceSha256: parent, retainedOriginalFailedAttemptCount: 2 } } },
    VASIR_WRITING_RESPONSES: { supersededResponses: responses }
  } };
  const archive = { open: false, textContent: 'Earlier failed attempts remain unscored and do not count as additional trials.' };
  const records = responses.map(response => {
    const record = { open: false, scored: false, inScoreRow: false,
      dataset: { writingPredecessor: response.configurationId, predecessorTrial: String(response.trialNumber), predecessorOutputSha256: response.provenance.outputSha256 },
      output: { textContent: response.outputText, getBoundingClientRect: () => ({ width: 350, height: 100 }) },
      copyText: response.outputText, readStatus: 'incomplete',
      querySelector(selector) {
        if (selector === '[data-writing-predecessor-output]') return this.output;
        if (selector === '[data-copy-id]') return { click: () => context.navigator.clipboard.writeText(this.copyText) };
        if (selector === '[data-predecessor-provenance="sourceSha256"]') return { textContent: parent };
        if (selector === '[data-predecessor-provenance="outputSha256"]') return { textContent: response.provenance.outputSha256 };
        if (selector === '.model-run__condition-score') return this.scored ? {} : null;
        if (selector === '[data-required-read-status]') return { textContent: this.readStatus };
        if (selector === '[data-writing-predecessor-reason]') return { textContent: response.failureReason };
        return null;
      }, closest() { return this.inScoreRow ? {} : null; }
    };
    return record;
  });
  context.document = { querySelector: () => archive, querySelectorAll: () => records };
  return { context, archive, records, responses, originalClipboard, collect: () => vm.runInNewContext(collector + '\ninspectWritingPredecessorArchiveInDocument();', context) };
}

test('the shipped browser collector binds both visible originals and copy results to retained source hashes', async () => {
  const fixtureData = fixture(), proof = await fixtureData.collect();
  assert.equal(proof.parentSourceSha256, 'a'.repeat(64));
  assert.equal(proof.declaredCount, 2); assert.equal(proof.renderedCount, 2); assert.equal(proof.mismatches.length, 0);
  assert.equal(proof.responses.length, 2);
  for (let index = 0; index < 2; index++) {
    const row = proof.responses[index], source = fixtureData.responses[index];
    assert.equal(row.outputSha256, hash(source.outputText)); assert.equal(row.copiedOutputSha256, row.outputSha256);
    assert.equal(row.configurationId, source.configurationId); assert.equal(row.trialNumber, source.trialNumber);
    assert.equal(row.status, 'error'); assert.equal(row.score, null); assert.equal(row.readStatus, 'incomplete');
    assert.equal(row.visible, true); assert.equal(row.copyAvailable, true);
  }
  assert.equal(fixtureData.context.navigator.clipboard, fixtureData.originalClipboard);
});

for (const [name, mutate, expected] of [
  ['changed output', f => { f.records[0].output.textContent += ' changed'; }, 'answer-bytes'],
  ['changed copy', f => { f.records[0].copyText += ' changed'; }, 'copy-bytes'],
  ['hidden output', f => { f.records[0].output.getBoundingClientRect = () => ({ width: 0, height: 0 }); }, 'not-visible'],
  ['scored predecessor', f => { f.records[0].scored = true; }, 'failed-attempt-scored'],
  ['predecessor in ranked row', f => { f.records[0].inScoreRow = true; }, 'failed-attempt-scored'],
  ['missing predecessor', f => { f.records.pop(); }, 'predecessor-count'],
  ['relabeled read proof', f => { f.records[0].readStatus = 'complete'; }, 'read-failure-evidence'],
  ['wrong trial', f => { f.records[0].dataset.predecessorTrial = '8'; }, 'identity'],
  ['wrong parent', f => { f.context.window.VASIR_WRITING.methodology.completion.parentSourceSha256 = 'b'.repeat(64); }, 'source-fingerprint']
]) test(`the shipped predecessor browser collector rejects ${name}`, async () => {
  const f = fixture(); mutate(f); const proof = await f.collect();
  assert.ok(proof.mismatches.some(mismatch => mismatch.includes(expected)), JSON.stringify(proof));
});

test('the predecessor collector leaves non-completion reports alone', async () => {
  for (const id of ['storytelling-core-idea', 'storytelling-magic-discovery', 'dungeon-master-adventure-outline']) {
    const f = fixture(); f.context.window.VASIR_WRITING.benchmarks[0].id = id; assert.equal(await f.collect(), null);
  }
  const f = fixture(); delete f.context.window.VASIR_WRITING.methodology.completion; assert.equal(await f.collect(), null);
});
