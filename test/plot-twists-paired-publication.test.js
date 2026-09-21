import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { completePairedFixture, completeSupplementalPairedFixture, createPairedFixture, createSupplementalPairedFixture, mockPairedProvider, pairedAssessment, codexPairedOutput, claudePairedOutput } from './helpers/plot-twists-paired-fixture.js';
import { applyPairedRuntimeValidationErratum, exportPairedRun, preparePairedRun, preparePairedTechnicalRecovery, runPairedGenerations, runPairedJudgments } from '../cli/eval/plot-twists-paired-runtime.js';
import { projectPlotTwistsPairedRun, validatePlotTwistsPairedPublication, preparePlotTwistsPairedPublicationSource,
  buildPlotTwistsPairedPublication, PLOT_TWISTS_PAIRED_EDITION, WRITING_PAIRED_SCORE_BASIS,
  PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_PATH, PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_SHA256 } from '../cli/eval/plot-twists-paired-publication.js';
import { buildWritingPublication, validateWritingPublication, validateWritingSummary } from '../cli/eval/writing-publication.js';
import { buildOverallWritingSource } from '../cli/eval/overall-writing-source.js';
import { splitWritingResponseArchives, hydrateWritingResponseArchives } from '../cli/eval/writing-response-archives.js';
import { verifyPairedTwistsCoverageAppend, verifyPairedTwistsTechnicalRecovery, verifyWritingSourceSelections } from '../docs/work/vasir-benchmarking/writing-category/source-lineage.mjs';

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

test('head-to-head publication preserves four explicit preferences and the original fourth schema failure without rescoring', () => {
  const selection = JSON.parse(fs.readFileSync(path.join(repo, 'benchmarks/storytelling-plot-twists/publication.json'), 'utf8'));
  const originalBytes = fs.readFileSync(path.join(repo, selection.snapshot.path));
  const sidecarBytes = fs.readFileSync(path.join(repo, PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_PATH));
  assert.equal(hash(originalBytes), selection.snapshot.sha256);
  assert.equal(hash(sidecarBytes), PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_SHA256);
  const before = projectPlotTwistsPairedRun({ snapshot: JSON.parse(originalBytes), sourceSha256: selection.snapshot.sha256 });
  const reads = [];
  const built = buildPlotTwistsPairedPublication({ repoRootDirectory: repo, selection,
    readFileSyncImplementation: (filename, ...args) => { reads.push(filename); return fs.readFileSync(filename, ...args); } });
  const { headToHeads, ...scored } = built.projection;
  const { headToHeads: archivedHeads, ...originalArchive } = built.responseBundle;
  assert.deepEqual(scored, before.projection);
  assert.deepEqual(originalArchive, before.responseBundle);
  assert.notEqual(built.basisSha256, before.basisSha256, 'The build fingerprint pins non-scoring evidence, not a new score basis.');
  assert.deepEqual(archivedHeads, headToHeads);
  assert.equal(reads.filter(filename => filename === path.join(repo, PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_PATH)).length, 1);
  const head = headToHeads[0];
  assert.deepEqual(head.summary, { preferredCandidateId: 'answer-1', judgeCount: 2, reviewCount: 4,
    orderConsistentJudgeCount: 2, structuredReviewCount: 3, transcribedReviewCount: 1 });
  assert.equal(head.scoreEffect, 'none');
  assert.equal(head.evidenceSha256, PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_SHA256);
  assert.deepEqual(head.candidates.map(row => row.settingId), ['codex-gpt-6-astra-max', 'claude-claude-fable-5-1-xhigh']);
  assert.ok(head.reviews.every(row => row.preferredCandidateId === 'answer-1'));
  assert.ok(head.judges.every(row => row.orderConsistent && row.preferredCandidateId === 'answer-1'));
  const fourth = head.reviews.find(row => row.id === 'review-04');
  assert.equal(fourth.firstCandidateId, 'answer-2');
  assert.equal(fourth.secondCandidateId, 'answer-1');
  assert.equal(fourth.interpretation, 'explicit-text-transcription');
  assert.equal(fourth.originalValidation.status, 'failed');
  assert.equal(fourth.originalValidation.schemaValid, false);
  assert.throws(() => JSON.parse(fourth.rawText));
  assert.ok(fourth.rawText.includes('"preference":' + JSON.stringify({ candidate: 'B', reason: fourth.reason, confidence: fourth.confidence })));
  assert.match(head.method.publicationPolicyTiming, /after the four original reviews/);
  assert.match(head.method.originalProtocol, /produced no formal panel summary/);
  assert.doesNotMatch(JSON.stringify(head), /rawStdout|cliArguments|sessionId|\/Users\//);
  assert.equal(validatePlotTwistsPairedPublication(built.projection, built.responseBundle), built.projection);
  assert.equal(validatePlotTwistsPairedPublication(built.projection), built.projection);
  const sandbox = { window: {} };
  vm.runInNewContext(`window.projection = ${JSON.stringify(built.projection)}; window.responses = ${JSON.stringify(built.responseBundle)};`, sandbox);
  assert.equal(validatePlotTwistsPairedPublication(sandbox.window.projection, sandbox.window.responses), sandbox.window.projection);
  assert.equal(validatePlotTwistsPairedPublication(sandbox.window.projection), sandbox.window.projection);
  assert.equal(hash(fs.readFileSync(path.join(repo, selection.snapshot.path))), selection.snapshot.sha256);
});

test('head-to-head pin rejects altered preference, raw evidence, interpretation, source and mutable sidecar reads', () => {
  const selection = JSON.parse(fs.readFileSync(path.join(repo, 'benchmarks/storytelling-plot-twists/publication.json'), 'utf8'));
  const built = buildPlotTwistsPairedPublication({ repoRootDirectory: repo, selection });
  for (const mutate of [
    head => { head.reviews[3].preferredCandidateId = 'tie'; },
    head => { head.reviews[3].preferredCandidateId = null; },
    head => { head.reviews[3].originalValidation.schemaValid = true; },
    head => { head.reviews[3].originalValidation.status = 'succeeded'; },
    head => { head.reviews[3].interpretation = 'structured-preference'; },
    head => { head.reviews[3].reason += ' Changed.'; },
    head => { head.reviews[3].rawText += ' '; head.reviews[3].rawTextSha256 = hash(head.reviews[3].rawText); },
    head => { head.reviews[0].firstCandidateId = 'answer-1'; },
    head => { head.summary.structuredReviewCount = 4; },
    head => { head.summary.preferredCandidateId = 'answer-2'; },
    head => { head.sourceSnapshotSha256 = 'a'.repeat(64); },
    head => { head.evidenceSha256 = 'a'.repeat(64); },
    head => { head.candidates[0].outputSha256 = 'a'.repeat(64); }
  ]) {
    const changed = structuredClone(built);
    mutate(changed.projection.headToHeads[0]);
    changed.responseBundle.headToHeads = structuredClone(changed.projection.headToHeads);
    assert.throws(() => validatePlotTwistsPairedPublication(changed.projection, changed.responseBundle), /head-to-head/);
    assert.throws(() => validatePlotTwistsPairedPublication(changed.projection), /head-to-head/);
  }
  for (const field of ['projection', 'responseBundle']) {
    const changed = structuredClone(built);
    delete changed[field].headToHeads;
    assert.throws(() => validatePlotTwistsPairedPublication(changed.projection, changed.responseBundle), /head-to-head/);
  }
  assert.throws(() => buildPlotTwistsPairedPublication({ repoRootDirectory: repo, selection,
    readFileSyncImplementation: (filename, ...args) => fs.readFileSync(filename, ...args)
      + (filename.endsWith(PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_PATH) ? ' ' : '') }), /pinned head-to-head sidecar bytes changed/);
  assert.throws(() => buildPlotTwistsPairedPublication({ repoRootDirectory: repo, selection,
    readFileSyncImplementation: (filename, ...args) => {
      if (filename.endsWith(PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_PATH)) throw new Error('Missing frozen sidecar');
      return fs.readFileSync(filename, ...args);
    } }), /Missing frozen sidecar/);
});

test('head-to-head evidence survives automatic Writing builds and lazy archive round trips without changing Overall inputs', () => {
  const built = buildWritingPublication({ repoRootDirectory: repo });
  const child = built.projection.benchmarkPublications.find(row => row.benchmarkId === 'storytelling-plot-twists');
  const archive = built.responseBundle.benchmarkResponses.find(row => row.benchmarkId === child.benchmarkId);
  assert.equal(child.projection.headToHeads[0].evidenceSha256, PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_SHA256);
  assert.deepEqual(archive.responseBundle.headToHeads, child.projection.headToHeads);
  const split = splitWritingResponseArchives(built.responseBundle, { separateBenchmarks: true });
  assert.deepEqual(split.additional[child.benchmarkId].headToHeads, child.projection.headToHeads);
  assert.deepEqual(hydrateWritingResponseArchives(split.primary, split.creation, split.additional), built.responseBundle);
  const withoutComparison = structuredClone(built.projection);
  delete withoutComparison.benchmarkPublications.find(row => row.benchmarkId === child.benchmarkId).projection.headToHeads;
  assert.deepEqual(buildOverallWritingSource(built.projection), buildOverallWritingSource(withoutComparison));
});

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
  await t.test('new isolation authority is exact, inspectable and limited to newly prepared calls', () => {
    const policy = projection.methodology.sourceContract.toolIsolationPolicy;
    assert.equal(policy.version, 'explicit-agent-tool-isolation-v1');
    assert.equal(policy.sha256, fixture.snapshot.manifest.toolIsolationPolicySha256);
    assert.deepEqual(policy.codexConfig, { 'agents.enabled': false });
    assert.equal(policy.rejectToolRouterErrors, true);
    assert.equal(policy.appliesTo, 'newly-prepared-runs-only');
    assert.equal(policy.historicalResultsReclassified, false);
    assert.deepEqual(policy.configurationIds, fixture.snapshot.manifest.configurations.map(item => item.id));
    assert.match(policy.purpose, /not retrospectively certified or reclassified/);
    assert.equal(projection.methodology.execution.toolIsolationPolicySha256, policy.sha256);
    assert.equal(projection.methodology.execution.toolIsolationCodexConfig, JSON.stringify(policy.codexConfig));
    assert.ok(Object.values(projection.methodology.execution).every(value => value === null || typeof value !== 'object'));
    for (const mutate of [
      value => { value.sha256 = 'a'.repeat(64); },
      value => { value.codexConfig['agents.enabled'] = true; },
      value => { value.rejectToolRouterErrors = false; },
      value => { value.historicalResultsReclassified = true; },
      value => { value.appliesTo = 'all-historical-results'; },
      value => { value.configurationIds.pop(); }
    ]) {
      const changed = structuredClone({ projection, responseBundle });
      mutate(changed.projection.methodology.sourceContract.toolIsolationPolicy);
      changed.responseBundle.sourceContract = structuredClone(changed.projection.methodology.sourceContract);
      assert.throws(() => validatePlotTwistsPairedPublication(changed.projection, changed.responseBundle), /tool isolation policy/);
    }
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
  assert.throws(() => preparePlotTwistsPairedPublicationSource({ repoRootDirectory: path.dirname(runDirectoryPath), runDirectory: runDirectoryPath }), /all declared pairs/);
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider() });
  await runPairedJudgments({ runDirectoryPath, limit: 1, spawnImplementation: mockPairedProvider() });
  const partial = project(exportPairedRun({ runDirectoryPath }));
  assert.equal(partial.projection.coverage.responseCount, 12);
  assert.equal(partial.projection.coverage.judgmentCount, 2);
  assert.equal(partial.projection.coverage.scoredResponseCount, 0);
  assert.equal(partial.projection.coverage.executionComplete, false);
  assert.equal(validatePlotTwistsPairedPublication(partial.projection), partial.projection);
  assert.throws(() => preparePlotTwistsPairedPublicationSource({ repoRootDirectory: path.dirname(runDirectoryPath), runDirectory: runDirectoryPath }), /all declared pairs/);
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

test('same-edition reasoning extension retains the original six pairs and appends only eight declared settings', async t => {
  const fixture = await createSupplementalPairedFixture(t), { runDirectoryPath, parentSnapshot, parentSnapshotPath } = fixture;
  const parentBytes = fs.readFileSync(parentSnapshotPath), parentBefore = JSON.stringify(parentSnapshot);
  const parent = projectPlotTwistsPairedRun({ snapshot: parentSnapshot, sourceSha256: hash(parentBytes) });
  const pending = project(exportPairedRun({ runDirectoryPath }));
  const expectedIds = [...parentSnapshot.manifest.configurations.map(item => item.id),
    'codex:gpt-6-astra@low', 'codex:gpt-6-astra@xhigh', 'codex:gpt-6-astra@ultra',
    'claude:claude-fable-5-1@low', 'claude:claude-fable-5-1@xhigh', 'claude:claude-fable-5-1@max',
    'claude:claude-opus-5@low', 'claude:claude-opus-5@xhigh'];
  assert.deepEqual(pending.projection.settings.map(item => item.configurationId), expectedIds);
  assert.equal(pending.projection.coverage.completedSettingCount, 6);
  assert.equal(pending.projection.coverage.expectedPairs, 14);
  assert.equal(pending.projection.coverage.executionComplete, false);
  assert.equal(pending.projection.coverage.scoredResponseCount, 12);
  assert.equal(validatePlotTwistsPairedPublication(pending.projection), pending.projection);
  assert.throws(() => preparePlotTwistsPairedPublicationSource({ repoRootDirectory: path.dirname(runDirectoryPath), runDirectory: runDirectoryPath }), /all declared pairs/);

  const manifest = JSON.parse(fs.readFileSync(path.join(runDirectoryPath, 'manifest.json'), 'utf8')), calls = [];
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  const addedPlans = manifest.judgmentPlan.filter(plan => !parentSnapshot.judgments.some(row => row.id === plan.id));
  const rubricIds = manifest.specification.benchmark.rubric.map(item => item.id);
  await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls, answer: (_call, index) => {
    const plan = addedPlans[index - 16], result = pairedAssessment(rubricIds);
    for (const label of ['A', 'B']) for (const rating of result[`assessment${label}`].ratings)
      rating.score = plan.candidateMap[label] === 'skill' ? 1 : 4;
    return codexPairedOutput(JSON.stringify(result));
  } }) });
  assert.equal(calls.length, 32, 'Only sixteen appended generations and sixteen paired reviews are dispatched.');
  const snapshot = exportPairedRun({ runDirectoryPath }), before = JSON.stringify(snapshot);
  const { projection, responseBundle } = project(snapshot);

  await t.test('one fourteen-setting edition declares all 28 answers, 28 paired reviews and 56 assessments', () => {
    assert.equal(projection.scoreBasis.edition, PLOT_TWISTS_PAIRED_EDITION);
    assert.equal(projection.benchmarks.length, 1);
    assert.deepEqual(projection.settings.map(item => item.configurationId), expectedIds);
    for (const [key, value] of Object.entries({ settingCount: 14, expectedPairs: 14, usablePairs: 14, completedSettingCount: 14,
      responseCount: 28, expectedResponseCount: 28, scoredResponseCount: 28, judgmentCount: 56, expectedJudgmentCount: 56,
      pairedJudgeCallCount: 28, expectedPairedJudgeCallCount: 28, executionComplete: true })) assert.equal(projection.coverage[key], value, key);
    assert.equal(projection.regressions.length, 8);
    assert.equal(projection.benchmarkSummaries[0].losses, 8);
    assert.equal(projection.benchmarkSummaries[0].ties, 6);
    assert.ok(projection.settings.slice(6).every(setting => setting.deltas.skill === -60));
    assert.match(projection.methodology.limitations.join(' '), /56 planned top-level benchmark CLI calls comprise 28 creator calls and 28 paired reviewer calls/);
    assert.match(projection.methodology.execution.coverageExtensionPurpose, /not prespecified before the original cohort outcomes/);
    assert.equal(projection.methodology.execution.validationErratumCohort, 'original six-setting cohort');
    assert.equal(projection.methodology.execution.additionalCreatorCalls, 16);
    assert.equal(projection.methodology.execution.additionalPairedReviewerCalls, 16);
    assert.deepEqual(projection.methodology.sourceContract.toolIsolationPolicy.configurationIds, expectedIds.slice(6));
    assert.equal(projection.methodology.execution.toolIsolationConfigurationIds, JSON.stringify(expectedIds.slice(6)));
    assert.ok(Object.values(projection.methodology.execution).every(value => value === null || typeof value !== 'object'));
    assert.doesNotMatch(projection.benchmarks[0].description, /six GPT|at medium effort/);
  });
  await t.test('every inherited answer and review stays exact while parent and supplement provenance remain distinct', () => {
    assert.deepEqual(snapshot.parentSnapshot, parentSnapshot);
    for (const kind of ['generations', 'judgments']) for (const original of parentSnapshot[kind])
      assert.deepEqual(snapshot[kind].find(row => row.id === original.id), original);
    const extension = projection.methodology.sourceContract.coverageExtension;
    assert.equal(extension.parentSnapshotSha256, hash(parentBytes));
    assert.equal(extension.parentManifestSha256, parentSnapshot.manifestSha256);
    for (const original of parent.responseBundle.responses) {
      const response = responseBundle.responses.find(row => row.provenance.generationId === original.provenance.generationId);
      for (const key of ['outputText', 'score', 'judgments', 'messageSetId', 'wordCount', 'runtime']) assert.deepEqual(response[key], original[key]);
      assert.equal(response.provenance.outputSha256, original.provenance.outputSha256);
      assert.equal(response.provenance.exactMessagesSha256, original.provenance.exactMessagesSha256);
      assert.equal(response.provenance.sourceCohort, 'original');
      assert.equal(response.provenance.sourceSnapshotSha256, hash(parentBytes));
      assert.equal(response.provenance.sourceManifestSha256, parentSnapshot.manifestSha256);
    }
    for (const original of parent.responseBundle.judgeRequests) {
      const request = responseBundle.judgeRequests.find(row => row.id === original.id);
      const { provenance, ...retained } = request;
      assert.deepEqual(retained, original);
      assert.deepEqual(provenance, { sourceCohort: 'original', sourceSnapshotSha256: hash(parentBytes), sourceManifestSha256: parentSnapshot.manifestSha256 });
    }
    assert.equal(responseBundle.responses.filter(row => row.provenance.sourceCohort === 'supplement').length, 16);
    for (const row of [...responseBundle.responses, ...responseBundle.judgeRequests].filter(row => row.provenance.sourceCohort === 'supplement')) {
      assert.equal(row.provenance.sourceSnapshotSha256, projection.scoreBasis.sourceSha256);
      assert.equal(row.provenance.sourceManifestSha256, snapshot.manifestSha256);
    }
    assert.equal(projection.methodology.sourceContract.runtimeValidationErratum.sha256, parentSnapshot.runtimeValidationErratumSha256);
    assert.equal(projection.methodology.sourceContract.executionValidationPolicy.sha256, snapshot.manifest.executionValidationPolicySha256);
    assert.deepEqual(fs.readFileSync(parentSnapshotPath), parentBytes);
    assert.equal(JSON.stringify(parentSnapshot), parentBefore);
    assert.equal(JSON.stringify(snapshot), before);
  });
  await t.test('extension validation rejects missing originals, changed cohorts and forged lineage, including VM-decoded modules', () => {
    const sandbox = { window: {} };
    vm.runInNewContext(`window.projection = ${JSON.stringify(projection)}; window.responses = ${JSON.stringify(responseBundle)};`, sandbox);
    assert.equal(validatePlotTwistsPairedPublication(sandbox.window.projection, sandbox.window.responses), sandbox.window.projection);
    assert.equal(validatePlotTwistsPairedPublication(sandbox.window.projection), sandbox.window.projection);
    for (const mutate of [
      value => { value.generations.shift(); },
      value => { value.generations[0].responseText += ' replaced'; },
      value => { value.parentSnapshot.generations[0].responseText += ' replaced'; },
      value => { value.coverageExtension.parentSnapshotSha256 = 'a'.repeat(64); }
    ]) { const changed = structuredClone(snapshot); mutate(changed); assert.throws(() => project(changed)); }
    for (const mutate of [
      value => { value.responseBundle.responses[0].provenance.sourceCohort = 'supplement'; },
      value => { value.responseBundle.responses[12].provenance.sourceManifestSha256 = parentSnapshot.manifestSha256; },
      value => { value.responseBundle.judgeRequests[0].provenance.sourceSnapshotSha256 = 'a'.repeat(64); },
      value => { value.projection.methodology.sourceContract.coverageExtension.addedConfigurations.pop(); },
      value => { value.projection.coverage.expectedResponseCount = 12; }
    ]) { const changed = structuredClone({ projection, responseBundle }); mutate(changed); assert.throws(() => validatePlotTwistsPairedPublication(changed.projection, changed.responseBundle)); }
    const selection = preparePlotTwistsPairedPublicationSource({ repoRootDirectory: path.dirname(runDirectoryPath), runDirectory: runDirectoryPath });
    assert.equal(buildPlotTwistsPairedPublication({ repoRootDirectory: path.dirname(runDirectoryPath), selection }).projection.coverage.completedSettingCount, 14);
  });
  await t.test('the complete appended source occupies the same single slot in the active three-benchmark catalog', () => {
    const root = path.dirname(runDirectoryPath), selectionPath = 'benchmarks/storytelling-plot-twists/publication.json';
    const originalSelection = fs.readFileSync(path.join(repo, selectionPath));
    const selection = preparePlotTwistsPairedPublicationSource({ repoRootDirectory: root, runDirectory: runDirectoryPath });
    const reader = (filename, encoding) => {
      const relative = path.relative(repo, filename);
      if (relative === selectionPath) return JSON.stringify(selection);
      if (relative === selection.snapshot.path) return fs.readFileSync(path.join(root, relative), encoding);
      return fs.readFileSync(filename, encoding);
    };
    const current = buildWritingPublication({ repoRootDirectory: repo });
    const appended = buildWritingPublication({ repoRootDirectory: repo, readFileSyncImplementation: reader });
    assert.deepEqual(appended.projection.writingScoreBasis, WRITING_PAIRED_SCORE_BASIS);
    assert.deepEqual(appended.stub.benchmarkIds, WRITING_PAIRED_SCORE_BASIS.benchmarkIds);
    assert.equal(appended.stub.catalog.length, 3);
    assert.equal(appended.projection.benchmarkPublications.filter(item => item.benchmarkId === 'storytelling-plot-twists').length, 1);
    assert.equal(appended.projection.benchmarkPublications.find(item => item.benchmarkId === 'storytelling-plot-twists').projection.settings.length, 14);
    assert.deepEqual(appended.projection.provisionalLeaderboard, current.projection.provisionalLeaderboard, 'Core source scores are unchanged.');
    assert.deepEqual(appended.projection.benchmarkPublications.find(item => item.benchmarkId === 'storytelling-magic-discovery'),
      current.projection.benchmarkPublications.find(item => item.benchmarkId === 'storytelling-magic-discovery'), 'Magic source scores are unchanged.');
    assert.equal(validateWritingPublication(appended.projection, appended.responseBundle), appended.projection);
    assert.equal(validateWritingSummary(appended.stub), appended.stub);
    const overallSource = buildOverallWritingSource(appended.projection);
    assert.equal(overallSource.benchmarkResults.filter(item => item.benchmarkId === 'storytelling-plot-twists').length, 28);
    assert.equal(overallSource.benchmarkDisplays['storytelling-plot-twists'].settingCount, 14);
    assert.deepEqual(fs.readFileSync(path.join(repo, selectionPath)), originalSelection);
  });
});

test('the historical published fourteen-setting source gains no retrospective isolation claim or changed scores', () => {
  const sourceSha256 = '7985a38256ce1de703bad8703ab3371d70d175393625dbd657d629684b0dc17a';
  const filename = path.join(repo, '.agents/vasir-evals/storytelling-plot-twists-paired-v2/publication-snapshots', sourceSha256, 'snapshot.json');
  const before = fs.readFileSync(filename), snapshot = JSON.parse(before);
  assert.equal(hash(before), sourceSha256);
  assert.equal(snapshot.manifest.toolIsolationPolicy, undefined);
  const { projection, responseBundle } = projectPlotTwistsPairedRun({ snapshot, sourceSha256 });
  assert.equal(projection.methodology.sourceContract.toolIsolationPolicy, undefined);
  assert.equal(responseBundle.sourceContract.toolIsolationPolicy, undefined);
  assert.ok(Object.keys(projection.methodology.execution).every(key => !key.startsWith('toolIsolation')));
  assert.doesNotMatch(JSON.stringify(projection.methodology), /explicit-agent-tool-isolation-v1|agents\.enabled=false/);
  for (const response of responseBundle.responses) {
    const original = snapshot.generations.find(row => row.id === response.provenance.generationId);
    assert.equal(response.outputText, original.responseText);
    const ratings = snapshot.judgments.filter(row => row.configurationId === response.configurationId).flatMap(row => {
      const label = row.candidateMap.A === response.condition ? 'A' : 'B';
      return row.assessment[`assessment${label}`].ratings.map(rating => rating.score);
    });
    assert.equal(response.score, Math.round(20 * ratings.reduce((total, value) => total + value, 0) / ratings.length * 10) / 10);
  }
  assert.deepEqual(fs.readFileSync(filename), before);
});

test('generic chained append preserves each original cohort and accepts only declared unused identities', async t => {
  const parentFixture = await completeSupplementalPairedFixture(t), parentSnapshot = parentFixture.snapshot;
  const root = path.dirname(parentFixture.runDirectoryPath), parentPath = path.join(root, 'accepted-parent.json');
  const parentBytes = `${JSON.stringify(parentSnapshot, null, 2)}\n`, parentSha256 = hash(parentBytes);
  fs.writeFileSync(parentPath, parentBytes, { flag: 'wx' });
  const parent = projectPlotTwistsPairedRun({ snapshot: parentSnapshot, sourceSha256: parentSha256 });
  const addedConfigurations = ['codex:gpt-6-astra@high', 'codex:gpt-5.6-sol@high'];
  const runDirectoryPath = path.join(root, 'declared-next-cohort');
  preparePairedRun({ runDirectoryPath, parentSnapshotPath: parentPath, addedConfigurations });
  const pending = project(exportPairedRun({ runDirectoryPath }));
  assert.equal(pending.projection.settings.length, parentSnapshot.manifest.configurations.length + addedConfigurations.length);
  assert.equal(pending.projection.coverage.completedSettingCount, parentSnapshot.manifest.configurations.length);
  assert.equal(pending.projection.coverage.executionComplete, false);
  assert.throws(() => preparePlotTwistsPairedPublicationSource({ repoRootDirectory: root, runDirectory: runDirectoryPath }), /all declared pairs/);
  const calls = [];
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  assert.equal(calls.length, addedConfigurations.length * 4);
  const snapshot = exportPairedRun({ runDirectoryPath }), { projection, responseBundle } = project(snapshot);
  const contract = projection.methodology.sourceContract;
  const selectedRootHash = parentSnapshot.coverageExtension.parentSnapshotSha256;
  assert.equal(projection.scoreBasis.edition, PLOT_TWISTS_PAIRED_EDITION);
  assert.equal(projection.coverage.executionComplete, true);
  assert.equal(projection.meta.runs, 3);
  assert.deepEqual(contract.sourceCohorts.map(cohort => cohort.configurationIds.length), [6, 8, addedConfigurations.length]);
  assert.deepEqual(contract.sourceCohorts.map(cohort => cohort.sourceSnapshotSha256), [selectedRootHash, parentSha256, projection.scoreBasis.sourceSha256]);
  assert.deepEqual(contract.coverageHistory.map(step => step.version), ['paired-reasoning-coverage-extension-v1', 'paired-declared-coverage-extension-v2']);
  assert.equal(contract.coverageHistory[1].parentSnapshotSha256, parentSha256);
  assert.equal(contract.runtimeValidationErratum.sha256, parentSnapshot.parentSnapshot.runtimeValidationErratumSha256);
  assert.equal(projection.methodology.execution.sourceCohorts, JSON.stringify(contract.sourceCohorts));
  assert.equal(projection.methodology.execution.coverageHistory, JSON.stringify(contract.coverageHistory));
  assert.match(projection.methodology.limitations.at(-1), /14 previously published settings/);
  assert.doesNotMatch(projection.methodology.limitations.at(-1), /14 medium/);
  for (const original of parent.responseBundle.responses) {
    const retained = responseBundle.responses.find(row => row.provenance.generationId === original.provenance.generationId);
    for (const key of ['outputText', 'score', 'judgments', 'messageSetId', 'runtime']) assert.deepEqual(retained[key], original[key]);
    for (const key of ['sourceCohort', 'sourceSnapshotSha256', 'sourceManifestSha256', 'outputSha256', 'exactMessagesSha256', 'inputPayloadSha256'])
      assert.equal(retained.provenance[key], original.provenance[key]);
  }
  for (const request of parent.responseBundle.judgeRequests) assert.deepEqual(responseBundle.judgeRequests.find(row => row.id === request.id), request);
  assert.deepEqual(snapshot.parentSnapshot, parentSnapshot);
  assert.equal(fs.readFileSync(parentPath, 'utf8'), parentBytes);
  assert.doesNotThrow(() => verifyPairedTwistsCoverageAppend(parentSnapshot, snapshot, parentSha256));
  const sandbox = { window: {} };
  vm.runInNewContext(`window.projection = ${JSON.stringify(projection)}; window.responses = ${JSON.stringify(responseBundle)};`, sandbox);
  assert.equal(validatePlotTwistsPairedPublication(sandbox.window.projection, sandbox.window.responses), sandbox.window.projection);
  assert.equal(validatePlotTwistsPairedPublication(sandbox.window.projection), sandbox.window.projection);
  for (const mutate of [
    value => { value.projection.methodology.sourceContract.sourceCohorts[0].sourceSnapshotSha256 = parentSha256; },
    value => { value.projection.methodology.sourceContract.sourceCohorts[2].configurationIds[0] = value.projection.settings[0].configurationId; },
    value => { value.projection.methodology.sourceContract.coverageHistory[1].parentSnapshotSha256 = selectedRootHash; },
    value => { value.responseBundle.responses[12].provenance.sourceSnapshotSha256 = projection.scoreBasis.sourceSha256; },
    value => { value.responseBundle.judgeRequests[0].provenance.sourceManifestSha256 = parentSnapshot.manifestSha256; },
    value => { delete value.projection.methodology.sourceContract.coverageHistory; }
  ]) {
    const changed = structuredClone({ projection, responseBundle }); mutate(changed);
    assert.throws(() => validatePlotTwistsPairedPublication(changed.projection, changed.responseBundle));
  }
  const changed = structuredClone(snapshot); changed.generations[0].responseText += ' rewritten';
  assert.throws(() => verifyPairedTwistsCoverageAppend(parentSnapshot, changed, parentSha256));

  const previous = ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery', 'dungeon-master-adventure-outline'].map(benchmarkId => {
    const run = write(root, `history/${benchmarkId}/run.json`, { immutable: benchmarkId });
    const skill = write(root, `history/${benchmarkId}/skill-snapshot.json`, { immutable: 'skill' });
    const pin = write(root, `benchmarks/${benchmarkId}/publication.json`, { kind: 'vasirbenchmark-writing-source', schemaVersion: 1, run, skill });
    return { benchmarkId, ...pin, sources: [run, skill] };
  });
  const selectionPath = 'benchmarks/storytelling-plot-twists/publication.json';
  write(root, selectionPath, preparePlotTwistsPairedPublicationSource({ repoRootDirectory: root, runDirectory: parentFixture.parentRunDirectoryPath }));
  const originalLineage = verifyWritingSourceSelections({ repo: root, previousSelections: previous });
  write(root, selectionPath, preparePlotTwistsPairedPublicationSource({ repoRootDirectory: root, runDirectory: parentFixture.runDirectoryPath }));
  const firstAppend = verifyWritingSourceSelections({ repo: root, previousSelections: originalLineage });
  write(root, selectionPath, preparePlotTwistsPairedPublicationSource({ repoRootDirectory: root, runDirectory: runDirectoryPath }));
  const nextAppend = verifyWritingSourceSelections({ repo: root, previousSelections: firstAppend });
  const lineage = nextAppend.find(item => item.benchmarkId === 'storytelling-plot-twists').lineage;
  assert.equal(lineage.kind, 'declared-writing-coverage-extension');
  assert.equal(lineage.previousLineage.kind, 'declared-writing-coverage-extension');
  assert.equal(lineage.previousLineage.previousLineage.kind, 'declared-writing-source-replacement');
  assert.equal(lineage.parentSourceSha256, parentSha256);
  assert.equal(lineage.originalSettingsRerun, false);
  assert.deepEqual(verifyWritingSourceSelections({ repo: root, previousSelections: nextAppend }), nextAppend);
});

test('approved technical recovery publishes exact per-record origins and preserves all superseded evidence', async t => {
  const sourceDirectory = path.join(repo, '.agents/vasir-evals/storytelling-plot-twists-paired-v2/remaining-writing-coverage-20260909T2257Z');
  if (!fs.existsSync(sourceDirectory)) return t.skip('Retained private stopped-run evidence is not installed.');
  const source = exportPairedRun({ runDirectoryPath: sourceDirectory }), sourceText = JSON.stringify(source, null, 2) + '\n';
  const fixture = createPairedFixture(t), root = path.dirname(fixture), sourceSnapshotPath = path.join(root, 'stopped-source.json');
  fs.writeFileSync(sourceSnapshotPath, sourceText, { flag: 'wx' });
  const runDirectoryPath = path.join(root, 'approved-recovery');
  preparePairedTechnicalRecovery({ runDirectoryPath, sourceSnapshotPath, authorization: {
    approvedAt: '2026-09-10T00:00:00.000Z', userInstruction: 'please do it',
    scope: 'Rerun only the three skill answers affected by tool errors and their reviews; preserve all clean results and original attempts.' } });
  const pending = project(exportPairedRun({ runDirectoryPath }));
  assert.equal(pending.projection.coverage.executionComplete, false);
  assert.throws(() => preparePlotTwistsPairedPublicationSource({ repoRootDirectory: root, runDirectory: runDirectoryPath }), /all declared pairs/);
  const calls = [];
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  const { snapshot } = await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider({ calls }) });
  assert.equal(calls.length, 57, 'Only 3 replacement + 14 pending answers and 2 replacement + 38 pending reviews are called.');
  const built = project(snapshot), { projection, responseBundle } = built, contract = projection.methodology.sourceContract;
  const recovery = contract.technicalRecovery;
  assert.equal(recovery.sourceSnapshotSha256, hash(sourceText));
  assert.equal(recovery.sourceManifestSha256, source.manifestSha256);
  assert.equal(recovery.acceptedParentSnapshotSha256, source.coverageExtension.parentSnapshotSha256);
  assert.equal(recovery.sha256, snapshot.manifest.technicalRecoverySha256);
  assert.equal(contract.coverageHistory.at(-1).sourceSnapshotSha256, hash(sourceText));
  assert.notEqual(contract.coverageHistory.at(-1).sourceSnapshotSha256, contract.sourceSha256);
  assert.equal(contract.recordSources.length, 132);
  assert.equal(contract.recordSources.filter(row => row.disposition === 'retained').length, 75);
  assert.equal(contract.recordSources.filter(row => row.disposition === 'technical-replacement').length, 5);
  assert.equal(contract.recordSources.filter(row => row.disposition === 'previously-unattempted').length, 52);
  assert.equal(contract.recordSources.filter(row => row.sourceSnapshotSha256 === hash(sourceText)).length, 22);
  assert.equal(contract.recordSources.filter(row => row.sourceSnapshotSha256 === recovery.acceptedParentSnapshotSha256).length, 29);
  assert.equal(contract.recordSources.filter(row => row.sourceSnapshotSha256 === contract.sourceCohorts[0].sourceSnapshotSha256).length, 24);
  assert.equal(contract.toolIsolationPolicy.configurationIds, undefined);
  assert.equal(contract.toolIsolationPolicy.generationIds.length, 17);
  assert.equal(contract.toolIsolationPolicy.judgmentIds.length, 40);
  assert.equal(projection.coverage.completedSettingCount, 33);
  assert.equal(projection.coverage.responseCount, 66);
  assert.equal(projection.coverage.pairedJudgeCallCount, 66);
  assert.equal(projection.coverage.judgmentCount, 132);
  assert.equal(projection.meta.runs, 4);
  assert.match(projection.methodology.limitations.join(' '), /5 superseded original attempts/);
  assert.doesNotMatch(projection.methodology.limitations.join(' '), /no retained setting was rerun or replaced/);
  assert.ok(Object.values(projection.methodology.execution).every(value => value === null || typeof value !== 'object'));
  const astra = responseBundle.responses.filter(row => row.configurationId === 'codex:gpt-6-astra@ultra');
  const plain = astra.find(row => row.condition === 'baseline'), skill = astra.find(row => row.condition === 'skill');
  assert.equal(plain.provenance.recordDisposition, 'retained');
  assert.equal(plain.provenance.sourceSnapshotSha256, recovery.acceptedParentSnapshotSha256);
  assert.equal(plain.outputText, source.generations.find(row => row.id === plain.provenance.generationId).responseText);
  assert.equal(skill.provenance.recordDisposition, 'technical-replacement');
  assert.equal(skill.runtime.attemptNumber, 2);
  for (const request of responseBundle.judgeRequests.filter(row => row.configurationId === plain.configurationId)) {
    assert.equal(request.provenance.recordDisposition, 'technical-replacement');
    assert.equal(request.provenance.sourceSnapshotSha256, contract.sourceSha256);
    assert.equal(request.attemptNumber, 2);
  }
  for (const row of contract.recordSources.filter(item => item.disposition === 'technical-replacement')) {
    const original = source[row.kind === 'generation' ? 'generations' : 'judgments'].find(item => item.id === row.id);
    assert.equal(row.supersedesRecordSha256, hash(JSON.stringify(original)));
  }
  const sandbox = { window: {} };
  vm.runInNewContext(`window.projection = ${JSON.stringify(projection)}; window.responses = ${JSON.stringify(responseBundle)};`, sandbox);
  assert.equal(validatePlotTwistsPairedPublication(sandbox.window.projection, sandbox.window.responses), sandbox.window.projection);
  assert.equal(validatePlotTwistsPairedPublication(sandbox.window.projection), sandbox.window.projection);
  for (const mutate of [
    value => { value.projection.methodology.sourceContract.recordSources[0].sourceSnapshotSha256 = contract.sourceSha256; },
    value => { value.projection.methodology.sourceContract.recordSources[0].disposition = 'technical-replacement'; },
    value => { value.projection.methodology.sourceContract.coverageHistory.at(-1).sourceSnapshotSha256 = contract.sourceSha256; },
    value => { value.projection.methodology.sourceContract.toolIsolationPolicy.generationIds.push(plain.provenance.generationId); },
    value => { value.responseBundle.responses.find(row => row.provenance.recordDisposition === 'technical-replacement').runtime.attemptNumber = 1; },
    value => { value.responseBundle.judgeRequests.find(row => row.provenance.recordDisposition === 'technical-replacement').provenance.supersedesRecordSha256 = 'a'.repeat(64); },
    value => { delete value.projection.methodology.sourceContract.technicalRecovery; }
  ]) {
    const changed = structuredClone({ projection, responseBundle }); mutate(changed);
    assert.throws(() => validatePlotTwistsPairedPublication(changed.projection, changed.responseBundle));
  }
  verifyPairedTwistsTechnicalRecovery(source.parentSnapshot, snapshot, recovery.acceptedParentSnapshotSha256);
  const changed = structuredClone(snapshot); changed.recoverySourceSnapshot.generations[0].responseText += ' rewritten';
  assert.throws(() => verifyPairedTwistsTechnicalRecovery(source.parentSnapshot, changed, recovery.acceptedParentSnapshotSha256));

  const previous = ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery', 'dungeon-master-adventure-outline'].map(benchmarkId => {
    const run = write(root, `history/${benchmarkId}/run.json`, { immutable: benchmarkId });
    const skillPin = write(root, `history/${benchmarkId}/skill-snapshot.json`, { immutable: 'skill' });
    const pin = write(root, `benchmarks/${benchmarkId}/publication.json`, { kind: 'vasirbenchmark-writing-source', schemaVersion: 1, run, skill: skillPin });
    return { benchmarkId, ...pin, sources: [run, skillPin] };
  });
  const parent = write(root, 'history/accepted-14/snapshot.json', JSON.stringify(source.parentSnapshot, null, 2) + '\n');
  const parentSelection = { kind: 'vasirbenchmark-plot-twists-paired-source', schemaVersion: 1, edition: PLOT_TWISTS_PAIRED_EDITION,
    snapshot: { path: parent.path, sha256: parent.sha256 } };
  const selectionPath = 'benchmarks/storytelling-plot-twists/publication.json';
  const parentPin = write(root, selectionPath, parentSelection), index = previous.findIndex(row => row.benchmarkId === 'storytelling-plot-twists');
  previous[index] = { benchmarkId: 'storytelling-plot-twists', ...parentPin, sources: [parent], lineage: {
    kind: 'declared-writing-coverage-extension', previousSources: previous[index].sources,
    previousLineage: { kind: 'declared-writing-source-replacement', previousSources: previous[index].sources } } };
  write(root, selectionPath, preparePlotTwistsPairedPublicationSource({ repoRootDirectory: root, runDirectory: runDirectoryPath }));
  const accepted = verifyWritingSourceSelections({ repo: root, previousSelections: previous });
  const lineage = accepted[index].lineage;
  assert.equal(lineage.kind, 'declared-writing-technical-recovery');
  assert.equal(lineage.parentSourceSha256, recovery.acceptedParentSnapshotSha256);
  assert.equal(lineage.stoppedSourceSha256, recovery.sourceSnapshotSha256);
  assert.equal(lineage.technicalRecoverySha256, recovery.sha256);
  assert.equal(lineage.cleanAnswersAndCompletedReviewsPreserved, true);
  assert.equal(lineage.supersededOriginalAttemptsPreserved, true);
  assert.equal(lineage.originalSettingsRerun, true);
  assert.deepEqual(verifyWritingSourceSelections({ repo: root, previousSelections: accepted }), accepted);
  assert.deepEqual(snapshot.recoverySourceSnapshot, source);
  assert.equal(fs.readFileSync(sourceSnapshotPath, 'utf8'), sourceText);
  assert.equal(JSON.stringify(exportPairedRun({ runDirectoryPath: sourceDirectory }), null, 2) + '\n', sourceText);
});
