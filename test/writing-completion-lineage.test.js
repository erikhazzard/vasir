import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { verifyCoreJudgeOnlyRecovery, verifyWritingSourceSelections, verifyPreservedWritingEvidence } from '../docs/work/vasir-benchmarking/writing-category/source-lineage.mjs';
import { verifyTwistsCompletionCoverage } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';
import { createTwistsCompletion } from '../cli/eval/plot-twists-completion.js';
import { projectWritingRun } from '../cli/eval/writing-publication.js';

const clone = value => JSON.parse(JSON.stringify(value));
const row = { rowKey: 'a', rowStatus: 'complete', outputText: 'Original answer', outputHash: 'original', score: 40, scoreBasisHash: 'old' };
const batch = { batchId: 'one', status: 'complete', outputText: 'Original review', evaluations: [{ score: 40 }], reused: false };
const original = { runId: 'core', benchmark: { hash: 'frozen' }, treatment: { hash: 'skill' }, rows: [row], judging: { judges: [{ configuration: { id: 'fixed' }, batches: [batch] }] } };

test('judge-only recovery permits new reviews and derived scores, never replacement evidence', () => {
  const after = clone(original);
  after.rows[0].score = 80;
  after.rows[0].scoreBasisHash = 'new';
  after.judging.judges[0].batches[0].reused = true;
  after.judging.judges[0].batches.push({ batchId: 'two', status: 'complete', outputText: 'New review' });
  assert.doesNotThrow(() => verifyCoreJudgeOnlyRecovery(original, after));
  for (const change of [
    value => { value.rows[0].outputText = 'Replacement'; },
    value => { value.rows[0].outputHash = 'changed'; },
    value => { value.rows.push({ ...row, rowKey: 'extra' }); },
    value => { value.benchmark.hash = 'changed'; },
    value => { value.harnessVersion = 999; },
    value => { value.kind = 'unrelated'; },
    value => { value.judging.judges[0].batches[0].evaluations[0].score++; },
    value => { value.judging.judges[0].batches.shift(); }
  ]) {
    const changed = clone(after); change(changed);
    assert.throws(() => verifyCoreJudgeOnlyRecovery(original, changed));
  }
});

test('policy-blocked Core generation rows are also immutable', () => {
  const before = clone(original);
  before.rows.push({ rowKey: 'blocked', rowStatus: 'error', error: { terminalReason: 'policy' }, attempts: [{ outputText: 'Refusal' }] });
  const after = clone(before);
  after.rows[1].attempts.push({ outputText: 'Rerolled answer' });
  assert.throws(() => verifyCoreJudgeOnlyRecovery(before, after));
});

test('completed Dungeon Master reviewer seats cannot be replaced by a newer score', () => {
  const before = { rows: [], judging: { pairs: [{ pairId: 'p', judges: [{ judgeId: 'seat', status: 'completed', outputText: 'Review' }] }] } };
  const after = clone(before);
  assert.doesNotThrow(() => verifyPreservedWritingEvidence(before, after));
  after.judging.pairs[0].judges[0].outputText = 'Replacement';
  assert.throws(() => verifyPreservedWritingEvidence(before, after));
});

test('successive publications preserve failed attempts and append-only completion ledgers', () => {
  const before = { rows: [{ rowKey: 'failed', rowStatus: 'error', outputText: '', attempts: [{ status: 'error', rawHash: 'first' }] }],
    completion: { generationDispatches: [{ id: 'd' }], generationAttempts: [{ id: 'a' }], judgeAttempts: [{ id: 'j' }] } };
  const after = clone(before);
  after.rows[0].rowStatus = 'complete'; after.rows[0].outputText = 'First returned answer';
  after.rows[0].attempts.push({ status: 'complete', rawHash: 'second' });
  after.completion.generationAttempts.push({ id: 'b' });
  assert.doesNotThrow(() => verifyPreservedWritingEvidence(before, after));
  for (const mutate of [
    value => { value.rows[0].attempts.shift(); },
    value => { value.completion.generationDispatches = []; },
    value => { value.completion.generationAttempts.shift(); },
    value => { value.completion.judgeAttempts[0].id = 'replacement'; }
  ]) {
    const changed = clone(after); mutate(changed);
    assert.throws(() => verifyPreservedWritingEvidence(before, changed));
  }
  const returnedFailure = clone(before); returnedFailure.rows[0].outputText = 'Unverified but returned answer';
  assert.throws(() => verifyPreservedWritingEvidence(returnedFailure, after));
});

test('current Writing selections are unchanged or descend from retained original evidence', () => {
  const lock = JSON.parse(fs.readFileSync('site/vasirbenchmark.com/template-lock.json', 'utf8'));
  const prior = lock.acceptance.verification.sourceSelections;
  const actual = verifyWritingSourceSelections({ repo: process.cwd(), previousSelections: prior });
  assert.equal(actual.length, 4);
  for (const selected of actual) {
    const previous = prior.find(item => item.benchmarkId === selected.benchmarkId);
    if (selected.sha256 === previous.sha256) assert.deepEqual(selected.sources, previous.sources);
    else {
      if (selected.lineage.kind === 'declared-writing-source-replacement') {
        assert.equal(selected.benchmarkId, 'storytelling-plot-twists');
        assert.equal(selected.lineage.edition, 'storytelling-plot-twists-paired-v2');
        assert.equal(selected.lineage.originalEvidencePreserved, true);
        assert.equal(selected.lineage.priorAnswersAndReviewsReused, false);
      } else assert.equal(selected.lineage.answersAndCompletedReviewsPreserved, true);
      assert.equal(selected.lineage.previousSelection.sha256, previous.sha256);
      assert.deepEqual(selected.lineage.previousSources, previous.sources);
    }
  }
});

test('completion coverage derives 33-setting counts from actual cells, not historical constants', () => {
  const snapshot = JSON.parse(fs.readFileSync('.agents/vasir-evals/storytelling-plot-twists/publication-snapshots/ac7128bdbeec86d7bb144c19f3fc778fda91ba4b9afdfea0a0c3f004ee3e8cac/skill-snapshot.json', 'utf8'));
  const parentPath = '.agents/vasir-evals/storytelling-plot-twists/publication-snapshots/97d1172df61311ca493c53ef99d193d607652de9bc0827bba2d3d6ca3fb41399/run.json';
  const { run } = createTwistsCompletion({ parentSource: fs.readFileSync(parentPath, 'utf8'), snapshot, runId: 'lineage-unit-test', frozenAt: '2026-09-08T00:00:00.000Z' });
  const projection = projectWritingRun({ run, snapshot, sourceSha256: 'unit-test' }).projection;
  assert.doesNotThrow(() => verifyTwistsCompletionCoverage(projection));
  assert.equal(projection.coverage.validResponseCount, 78);
  assert.equal(projection.coverage.expectedResponseCount, 660);
  assert.equal(projection.coverage.pendingGenerationCount, 582);
  for (const change of [
    value => { value.coverage.validResponseCount++; },
    value => { value.coverage.judgmentCount++; },
    value => { value.coverage.completedSettingCount++; },
    value => { value.coverage.expectedResponseCount = 80; },
    value => { value.methodology.completion.parentSourceSha256 = 'unrelated'; },
    value => { value.methodology.completion.inheritedValidAnswerCount = 77; },
    value => { value.caseResults[0] = clone(value.caseResults[1]); },
    value => { const cell = value.caseResults.find(item => item.generationDisposition === 'unresolved'); cell.score = cell.exactScore = 95; value.coverage.scoredResponseCount++; }
  ]) {
    const changed = clone(projection); change(changed);
    assert.throws(() => verifyTwistsCompletionCoverage(changed));
  }
});
