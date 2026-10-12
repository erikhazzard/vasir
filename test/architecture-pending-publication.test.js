// Protects saved-answer publication without score promotion, using real pinned
// native checkpoints through the public builder. No inference or browser claim.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildBenchmarkPublicationProjection, validateBenchmarkPublicationResponses } from '../cli/eval/benchmark-publication-projection.js';

const repoRootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selectionPath = path.join(repoRootDirectory, 'benchmarks/public-results.json');
const selections = JSON.parse(fs.readFileSync(selectionPath, 'utf8'));
const publication = buildBenchmarkPublicationProjection({ repoRootDirectory });
const digest = content => crypto.createHash('sha256').update(content).digest('hex');

function readWithReplacements(replacements) {
  return (filePath, encoding) => {
    const replacement = replacements.get(path.resolve(String(filePath)));
    return replacement === undefined ? fs.readFileSync(filePath, encoding) : encoding ? replacement : Buffer.from(replacement);
  };
}

test('six pending answers are inspectable while all scored records, rankings and denominators stay unchanged', () => {
  const { pendingArchitectureRuns, ...scoredSelections } = selections;
  assert.equal(pendingArchitectureRuns.length, 3);
  const scoredPublication = buildBenchmarkPublicationProjection({ repoRootDirectory,
    readFileSyncImplementation: readWithReplacements(new Map([[selectionPath, JSON.stringify(scoredSelections)]])) });
  const { architecturePending: pendingDescriptor, ...scoredProjection } = publication.projection;
  const { architecturePending: pendingResponses, ...scoredResponses } = publication.responseBundle;
  assert.deepEqual(scoredProjection, scoredPublication.projection);
  assert.deepEqual(scoredResponses, scoredPublication.responseBundle);
  assert.equal(scoredResponses.counts.responses, 312);
  assert.equal(scoredResponses.counts.judgments, 624);
  assert.equal(scoredProjection.engineering.coverage.records.find(record => record.configurationId === 'codex:gpt-6.1-sol@xhigh').completedTaskCount, 2);
  assert.deepEqual(pendingDescriptor.counts, { responses: 6, completedReviewRequests: 3, expectedReviewRequests: 6, pendingReviewRequests: 3, completedJudgments: 6, expectedJudgments: 12 });
  assert.equal(pendingResponses.responses.length, 6);
  assert.ok(pendingResponses.responses.every(response => response.score === null && response.status === 'unscored' && response.judgments.length === 1));
  const browserContext = { window: {} };
  vm.runInNewContext(publication.dataSource, browserContext);
  vm.runInNewContext(publication.responsesSource, browserContext);
  assert.equal(browserContext.window.VASIR_DATA.architecturePending.counts.pendingReviewRequests, 3);
  assert.equal(browserContext.window.VASIR_RESPONSES.architecturePending.responses.length, 6);
  assert.doesNotMatch(JSON.stringify({ pendingDescriptor, pendingResponses }), /\/Users\/|\.agents\/|@gmail\.com|@faedark\.com|threadId|runPath/);
});

test('published pending answers and prompts are exact native text and retain the original individual judge results', () => {
  const pendingResponses = publication.responseBundle.architecturePending;
  const expectedIndividualScores = { 'hyper-scale-chat': [55, 59], 'personalized-home-feed': [59, 75], 'device-telemetry': [49, 95] };
  for (const selection of selections.pendingArchitectureRuns) {
    const checkpoint = JSON.parse(fs.readFileSync(path.join(repoRootDirectory, selection.runPath), 'utf8'));
    for (const [conditionIndex, condition] of ['baseline', 'skill'].entries()) {
      const response = pendingResponses.responses.find(candidate => candidate.benchmarkId === selection.benchmarkId && candidate.condition === condition);
      const original = checkpoint.rows.find(row => row.configurationId === 'codex:gpt-6.1-sol@xhigh' && row.conditionId === (condition === 'baseline' ? 'clean' : 'skill:plan__question-spec-architecture'));
      assert.equal(response.outputText, original.outputText);
      assert.deepEqual(pendingResponses.messageSets.find(messages => messages.id === response.messageSetId).messages, original.exactMessages);
      assert.equal(response.judgments[0].score, expectedIndividualScores[selection.benchmarkId][conditionIndex]);
      assert.equal(response.judgments[0].judgeConfigurationId, 'codex:gpt-6-astra@xhigh');
      assert.deepEqual(response.coverage, { completedJudgments: 1, expectedJudgments: 2 });
    }
  }
});

test('repinning altered checkpoint bytes cannot change incumbents, prompts, panel, or turn partial reviews into final scores', () => {
  const originalSelection = selections.pendingArchitectureRuns[0];
  const checkpointPath = path.join(repoRootDirectory, originalSelection.runPath);
  for (const [mutationName, mutateCheckpoint] of [
    ['incumbent answer', checkpoint => { checkpoint.rows[0].outputText += ' changed'; }],
    ['frozen prompt', checkpoint => { checkpoint.rows.at(-1).exactMessages[0].content += ' changed'; }],
    ['premature score', checkpoint => { checkpoint.rows.at(-1).score = { total: 59 }; }],
    ['generation instructions', checkpoint => { checkpoint.generation.neutralHarnessInstruction += ' changed'; }],
    ['judge substitution', checkpoint => { checkpoint.judging.judges[1].configuration.id = 'codex:gpt-6-astra@ultra'; }],
    ['edited native judgment', checkpoint => { checkpoint.judging.judges[0].batches[0].evaluations[0].total = 100; }]
  ]) {
    const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
    mutateCheckpoint(checkpoint);
    const changedCheckpointText = JSON.stringify(checkpoint);
    const changedSelections = structuredClone(selections);
    changedSelections.pendingArchitectureRuns[0].sha256 = digest(changedCheckpointText);
    assert.throws(() => buildBenchmarkPublicationProjection({ repoRootDirectory,
      readFileSyncImplementation: readWithReplacements(new Map([[selectionPath, JSON.stringify(changedSelections)], [checkpointPath, changedCheckpointText]])) }),
    error => error.code === 'BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE', mutationName);
  }
});

test('serialized appendix integrity and the official complete-panel boundary reject answer edits and score-channel grafting', () => {
  const changedAnswerBundle = structuredClone(publication.responseBundle);
  changedAnswerBundle.architecturePending.responses[0].outputText += ' changed';
  assert.throws(() => validateBenchmarkPublicationResponses(changedAnswerBundle, publication.projection), /pending answer appendix changed/);
  for (const injectPrivateEvidence of [
    appendix => { appendix.responses[0].provenance.runPath = '/Users/private/checkpoint/run.json'; },
    appendix => { appendix.responses[0].outputText += '\n/Users/private/native-output'; appendix.responses[0].provenance.outputSha256 = digest(appendix.responses[0].outputText); }
  ]) {
    const changedPrivateBundle = structuredClone(publication.responseBundle);
    const changedPrivateProjection = structuredClone(publication.projection);
    injectPrivateEvidence(changedPrivateBundle.architecturePending);
    changedPrivateProjection.architecturePending.responsesSha256 = digest(JSON.stringify(changedPrivateBundle.architecturePending));
    assert.throws(() => validateBenchmarkPublicationResponses(changedPrivateBundle, changedPrivateProjection), /unsupported|private provenance/);
  }
  const changedCoverage = structuredClone(publication.projection);
  changedCoverage.architecturePending.counts.completedReviewRequests = 6;
  assert.throws(() => validateBenchmarkPublicationResponses(publication.responseBundle, changedCoverage), /pending coverage/);
  const graftedResponses = structuredClone(publication.responseBundle);
  const { architecturePending, ...officialProjection } = publication.projection;
  graftedResponses.responses.push(graftedResponses.architecturePending.responses[0]);
  delete graftedResponses.architecturePending;
  assert.throws(() => validateBenchmarkPublicationResponses(graftedResponses, officialProjection), /unexpected|identity|keys|fields/i);
  const missingAppendix = { ...publication.responseBundle };
  delete missingAppendix.architecturePending;
  assert.throws(() => validateBenchmarkPublicationResponses(missingAppendix, publication.projection), /must be published together/);
});
