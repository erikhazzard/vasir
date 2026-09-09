import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { completePairedFixture, createPairedFixture, mockPairedProvider, pairedAssessment, codexPairedOutput, claudePairedOutput } from './helpers/plot-twists-paired-fixture.js';
import { applyPairedRuntimeValidationErratum, exportPairedRun, runPairedGenerations, runPairedJudgments } from '../cli/eval/plot-twists-paired-runtime.js';
import { projectPlotTwistsPairedRun, validatePlotTwistsPairedPublication, preparePlotTwistsPairedPublicationSource,
  buildPlotTwistsPairedPublication, PLOT_TWISTS_PAIRED_EDITION, WRITING_PAIRED_SCORE_BASIS } from '../cli/eval/plot-twists-paired-publication.js';
import { buildWritingPublication, validateWritingPublication, validateWritingSummary } from '../cli/eval/writing-publication.js';
import { buildOverallWritingSource } from '../cli/eval/overall-writing-source.js';
import { verifyWritingSourceSelections } from '../docs/work/vasir-benchmarking/writing-category/source-lineage.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const project = snapshot => projectPlotTwistsPairedRun({ snapshot, sourceSha256: hash(JSON.stringify(snapshot)) });
const write = (root, relative, value) => {
  const filename = path.join(root, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, typeof value === 'string' ? value : JSON.stringify(value));
  const bytes = fs.readFileSync(filename);
  return { path: relative, sha256: hash(bytes), bytes: bytes.length };
};

test('new Plot twists publication binds one shared six-model experiment to its original inputs and reviews', async t => {
  const fixture = await completePairedFixture(t), before = JSON.stringify(fixture.snapshot);
  const { projection, responseBundle } = project(fixture.snapshot);
  await t.test('one prompt, six settings, twelve answers and twenty-four assessments remain explicit', () => {
    assert.equal(projection.benchmarks[0].id, 'storytelling-plot-twists');
    assert.equal(projection.scoreBasis.edition, PLOT_TWISTS_PAIRED_EDITION);
    assert.equal(projection.trialCount, 1);
    assert.equal(projection.cases.length, 1);
    assert.equal(projection.settings.length, 6);
    assert.ok(projection.settings.every(item => item.reasoning === 'medium'));
    assert.deepEqual(projection.settings.map(item => item.provider), ['codex', 'codex', 'codex', 'codex', 'claude', 'claude']);
    for (const [key, value] of Object.entries({ completedSettingCount: 6, responseCount: 12, expectedResponseCount: 12,
      scoredResponseCount: 12, judgmentCount: 24, expectedJudgmentCount: 24, pairedJudgeCallCount: 12, executionComplete: true })) assert.equal(projection.coverage[key], value, key);
    assert.equal(projection.methodology.completion, undefined);
    assert.equal(responseBundle.supersededResponses, undefined);
    assert.equal(responseBundle.judgeRequests.length, 12);
    assert.ok(projection.scoreBasis.dimensions.every(item => item.weight === 25 && Object.keys(item.anchors).length === 6));
    assert.match(projection.methodology.limitations.join(' '), /24 planned top-level benchmark CLI calls comprise 12 creator calls and 12 paired reviewer calls/);
    assert.match(projection.methodology.resourceAccounting, /auxiliary claude-haiku-4-5 activity, which is not a scored story answer/);
  });
  await t.test('public messages restore exact provider roles and the full unchanged inline material once', () => {
    const files = new Map(responseBundle.promptFiles.map(item => [item.id, item]));
    assert.deepEqual([...files.keys()], ['paired-skill-bundle', 'paired-skill-root', 'paired-skill-twists']);
    for (const response of responseBundle.responses) {
      const original = fixture.snapshot.generations.find(item => item.id === response.provenance.generationId);
      assert.equal(response.outputText, original.responseText);
      const publicMessages = responseBundle.messageSets.find(item => item.id === response.messageSetId).messages;
      const restored = publicMessages.map(item => item.fileId ? { role: item.role, content: files.get(item.fileId).content } : item);
      assert.deepEqual(restored, original.exactMessages);
      assert.equal(response.provenance.exactMessagesSha256, hash(JSON.stringify(restored)));
      assert.equal(response.provenance.inputPayloadSha256, original.inputPayloadSha256);
    }
    assert.doesNotMatch(JSON.stringify({ projection, responseBundle }), /synthetic-session|synthetic-thread|rawStdout|cliArguments|\/Users\//);
  });
  await t.test('original reviews retain all criteria and both opposite candidate orders', () => {
    for (const setting of projection.settings) {
      const requests = responseBundle.judgeRequests.filter(item => item.configurationId === setting.configurationId);
      assert.notEqual(requests[0].candidateMap.A, requests[1].candidateMap.A);
      for (const request of requests) assert.equal(request.outputText, fixture.snapshot.judgments.find(item => item.id === request.id).responseText);
    }
    assert.ok(projection.entries.every(item => item.exactScore === 70));
    assert.equal(projection.benchmarkSummaries[0].ties, 6);
    assert.equal(JSON.stringify(fixture.snapshot), before);
  });
  await t.test('public evidence rejects changed answers, scores, judge seats, mappings, and skill bytes', () => {
    for (const mutate of [
      value => { value.projection.entries[0].exactScore++; },
      value => { value.projection.scoreBasis.dimensions[0].anchors[5] = 'Changed'; },
      value => { value.responseBundle.responses[0].outputText += ' changed'; },
      value => { value.responseBundle.responses[0].judgments[0].score++; },
      value => { value.responseBundle.responses[0].judgments[1] = value.responseBundle.responses[0].judgments[0]; },
      value => { value.responseBundle.judgeRequests[0].candidateMap.A = value.responseBundle.judgeRequests[0].candidateMap.B; },
      value => { value.responseBundle.judgeRequests[0].candidateResponseHashes.A = 'a'.repeat(64); },
      value => { value.responseBundle.promptFiles[0].content += '\nAltered treatment'; },
      value => { value.responseBundle.responses[0].judgments[0].dimensions['coherent-story'].reason = 'Changed reason'; }
    ]) {
      const changed = structuredClone({ projection, responseBundle }); mutate(changed);
      assert.throws(() => validatePlotTwistsPairedPublication(changed.projection, changed.responseBundle));
    }
  });
  await t.test('lazy projection validation independently reconstructs rank, summary and coverage', () => {
    assert.equal(validatePlotTwistsPairedPublication(projection), projection);
    for (const mutate of [
      value => { value.entries[0].rank++; },
      value => { value.benchmarkSummaries[0].wins++; },
      value => { value.coverage.pairedJudgeCallCount--; },
      value => { value.caseResults[0].dimensions['coherent-story'] = 5.5; },
      value => { value.caseResults[0].dimensions.extra = 3.5; }
    ]) {
      const changed = structuredClone(projection); mutate(changed);
      assert.throws(() => validatePlotTwistsPairedPublication(changed));
    }
  });
  await t.test('VM-decoded public modules retain valid original rubric evidence across realms', () => {
    const sandbox = { window: {} };
    vm.runInNewContext(`window.projection = ${JSON.stringify(projection)}; window.responses = ${JSON.stringify(responseBundle)};`, sandbox);
    const decoded = sandbox.window;
    assert.notEqual(Object.getPrototypeOf(decoded.projection.methodology.sourceContract.task.rubric), Array.prototype);
    assert.equal(validatePlotTwistsPairedPublication(decoded.projection, decoded.responses), decoded.projection);
    assert.equal(validateWritingPublication(decoded.projection, decoded.responses), decoded.projection);
    decoded.responses.judgeRequests[0].outputText = JSON.stringify({ ...JSON.parse(decoded.responses.judgeRequests[0].outputText),
      assessmentA: { candidateLabel: 'A', ratings: [] } });
    assert.throws(() => validatePlotTwistsPairedPublication(decoded.projection, decoded.responses));
  });
  await t.test('a fresh snapshot replaces the one Plot twists input and declares a new Writing basis', () => {
    const root = path.dirname(fixture.runDirectoryPath);
    const selection = preparePlotTwistsPairedPublicationSource({ repoRootDirectory: root, runDirectory: fixture.runDirectoryPath });
    const selectionPath = 'benchmarks/storytelling-plot-twists/publication.json';
    const original = fs.readFileSync(path.join(repo, selectionPath));
    const reader = (filename, encoding) => {
      const relative = path.relative(repo, filename);
      if (relative === selectionPath) return JSON.stringify(selection);
      if (relative === selection.snapshot.path) return fs.readFileSync(path.join(root, relative), encoding);
      return fs.readFileSync(filename, encoding);
    };
    const built = buildWritingPublication({ repoRootDirectory: repo, readFileSyncImplementation: reader });
    assert.deepEqual(built.projection.writingScoreBasis, WRITING_PAIRED_SCORE_BASIS);
    assert.deepEqual(built.stub.benchmarkIds, WRITING_PAIRED_SCORE_BASIS.benchmarkIds);
    assert.equal(built.stub.catalog.length, 3);
    assert.equal(built.projection.benchmarkPublications.filter(item => item.benchmarkId === 'storytelling-plot-twists').length, 1);
    assert.equal(built.projection.benchmarkPublications[0].projection.settings.length, 6);
    assert.equal(buildOverallWritingSource(built.projection).scoreBasis.edition, WRITING_PAIRED_SCORE_BASIS.id);
    assert.equal(built.projection.compactBenchmarks, undefined);
    assert.equal(validateWritingPublication(built.projection, built.responseBundle), built.projection);
    assert.equal(validateWritingSummary(built.stub), built.stub);
    assert.deepEqual(fs.readFileSync(path.join(repo, selectionPath)), original, 'Active source selection remains untouched.');
    const changed = structuredClone(built.projection);
    changed.writingScoreBasis = { id: 'writing-established-storytelling-v1', benchmarkIds: [...WRITING_PAIRED_SCORE_BASIS.benchmarkIds],
      coreIdeaScoring: 'published-single-judge-provisional', method: 'equal-benchmark-mean' };
    assert.throws(() => validateWritingPublication(changed, built.responseBundle), /edition and Writing score basis differ/);
    const wrong = structuredClone(selection); wrong.snapshot.sha256 = 'a'.repeat(64);
    assert.throws(() => buildPlotTwistsPairedPublication({ repoRootDirectory: root, selection: wrong }), /immutable paired source changed/);
  });
  await t.test('replacement lineage preserves original source history without appending its answers to the fresh run', () => {
    const root = path.dirname(fixture.runDirectoryPath);
    const selection = preparePlotTwistsPairedPublicationSource({ repoRootDirectory: root, runDirectory: fixture.runDirectoryPath });
    const previous = ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery', 'dungeon-master-adventure-outline'].map(benchmarkId => {
      const run = write(root, `old/${benchmarkId}/run.json`, { immutable: benchmarkId });
      const skill = write(root, `old/${benchmarkId}/skill-snapshot.json`, { immutable: 'skill' });
      const pin = write(root, `benchmarks/${benchmarkId}/publication.json`, { kind: 'vasirbenchmark-writing-source', schemaVersion: 1, run, skill });
      return { benchmarkId, ...pin, sources: [run, skill] };
    });
    write(root, 'benchmarks/storytelling-plot-twists/publication.json', selection);
    const verified = verifyWritingSourceSelections({ repo: root, previousSelections: previous });
    const changed = verified.find(item => item.benchmarkId === 'storytelling-plot-twists');
    assert.equal(verified.length, 4);
    assert.equal(changed.sources.length, 1);
    assert.equal(changed.lineage.kind, 'declared-writing-source-replacement');
    assert.equal(changed.lineage.priorAnswersAndReviewsReused, false);
    assert.deepEqual(changed.lineage.previousSources, previous[1].sources);
    assert.deepEqual(verifyWritingSourceSelections({ repo: root, previousSelections: verified }), verified);
    fs.appendFileSync(path.join(root, previous[1].sources[0].path), ' ');
    assert.throws(() => verifyWritingSourceSelections({ repo: root, previousSelections: verified }), /selected original source changed/);
  });
});

test('all losses and overlength answers remain scored without rerolls or a score gate', async t => {
  const runDirectoryPath = createPairedFixture(t);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDirectoryPath, 'manifest.json'), 'utf8'));
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ answer: call => {
    const answer = 'A consequence follows. '.repeat(184);
    return call.command === 'codex' ? codexPairedOutput(answer) : claudePairedOutput(call.args[call.args.indexOf('--model') + 1], answer);
  } }) });
  const skills = [1, 3, 5, 3, 4, 2], ids = manifest.specification.benchmark.rubric.map(item => item.id);
  await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ answer: (_call, index) => {
    const plan = manifest.judgmentPlan[index], result = pairedAssessment(ids);
    const skill = skills[manifest.configurations.findIndex(item => item.id === plan.configurationId)];
    for (const label of ['A', 'B']) for (const rating of result[`assessment${label}`].ratings) rating.score = plan.candidateMap[label] === 'baseline' ? 3 : skill;
    return codexPairedOutput(JSON.stringify(result));
  } }) });
  const result = project(exportPairedRun({ runDirectoryPath }));
  assert.deepEqual(result.projection.settings.map(item => item.deltas.skill), [-40, 0, 40, 0, 20, -20]);
  assert.equal(result.projection.regressions.length, 2);
  assert.equal(result.projection.benchmarkSummaries[0].losses, 2);
  assert.equal(result.projection.coverage.completedSettingCount, 6);
  assert.ok(result.responseBundle.responses.every(item => item.wordLimitExceeded === true));
});

test('unattempted and partially reviewed evidence cannot be selected as the complete new public measurement', async t => {
  const runDirectoryPath = createPairedFixture(t);
  const pending = project(exportPairedRun({ runDirectoryPath }));
  assert.equal(pending.projection.coverage.completedSettingCount, 0);
  assert.ok(pending.projection.entries.every(item => item.exactScore === null && item.rank === null));
  assert.throws(() => preparePlotTwistsPairedPublicationSource({ repoRootDirectory: path.dirname(runDirectoryPath), runDirectory: runDirectoryPath }), /all six declared pairs/);
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider() });
  await runPairedJudgments({ runDirectoryPath, limit: 1, spawnImplementation: mockPairedProvider() });
  const partial = project(exportPairedRun({ runDirectoryPath }));
  assert.equal(partial.projection.coverage.responseCount, 12);
  assert.equal(partial.projection.coverage.judgmentCount, 2);
  assert.equal(partial.projection.coverage.scoredResponseCount, 0);
  assert.equal(partial.projection.coverage.executionComplete, false);
  assert.equal(validatePlotTwistsPairedPublication(partial.projection), partial.projection);
  assert.throws(() => preparePlotTwistsPairedPublicationSource({ repoRootDirectory: path.dirname(runDirectoryPath), runDirectory: runDirectoryPath }), /all six declared pairs/);
});

test('explicit validation erratum is disclosed without exposing raw original records or inventing replacement calls', async t => {
  const runDirectoryPath = createPairedFixture(t), calls = [];
  const first = await runPairedGenerations({ runDirectoryPath, limit: 2, concurrency: 2,
    spawnImplementation: mockPairedProvider({ calls, answer: (_call, index) => {
      const events = codexPairedOutput(`Original retained final answer ${index}.`, { extra: index === 1
        ? [{ type: 'item.completed', item: { type: 'agent_message', text: 'I am using the supplied storytelling material.' } }] : [] })
        .trim().split('\n').map(line => JSON.parse(line));
      events.splice(1, 0, { type: 'item.completed', item: { type: 'error',
        message: 'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.' } });
      return events.map(event => JSON.stringify(event)).join('\n') + '\n';
    } }) });
  assert.ok(first.snapshot.generations.slice(0, 2).every(row => row.status === 'failed'));
  applyPairedRuntimeValidationErratum({ runDirectoryPath });
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  assert.equal(calls.length, 24);
  const snapshot = exportPairedRun({ runDirectoryPath }), before = JSON.stringify(snapshot);
  const { projection, responseBundle } = project(snapshot);
  const correction = projection.methodology.sourceContract.runtimeValidationErratum;
  assert.deepEqual(Object.keys(correction), ['version', 'sha256', 'purpose', 'additionalInferenceCalls']);
  assert.equal(correction.sha256, snapshot.runtimeValidationErratumSha256);
  assert.equal(correction.version, snapshot.runtimeValidationErratum.version);
  assert.equal(correction.additionalInferenceCalls, 0);
  assert.equal(projection.methodology.execution.validationErratumSha256, correction.sha256);
  assert.ok(Object.values(projection.methodology.execution).every(value => value === null || typeof value !== 'object'));
  assert.equal(projection.coverage.executionComplete, true);
  assert.equal(responseBundle.judgeRequests.length, 12);
  assert.ok(responseBundle.judgeRequests.every(request => request.attemptNumber === 1));
  for (const [index, original] of first.snapshot.generations.slice(0, 2).entries()) {
    assert.equal(responseBundle.responses[index].outputText, original.responseText);
    assert.equal(responseBundle.responses[index].provenance.outputSha256, original.outputSha256);
  }
  assert.doesNotMatch(JSON.stringify({ projection, responseBundle }), /originalRecord|rawStdout|rawStderr|originalFailedRecords|correctedSourceHashes/);
  assert.equal(JSON.stringify(snapshot), before);
  for (const mutate of [value => { value.runtimeValidationErratumSha256 = 'a'.repeat(64); },
    value => { value.generations[0].validationCorrection.originalRecord.responseText = 'Changed original'; }]) {
    const changed = structuredClone(snapshot); mutate(changed); assert.throws(() => project(changed));
  }
});
