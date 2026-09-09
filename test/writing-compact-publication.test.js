import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { prepareCompactRun, exportCompactRun, runCompactGenerations, runCompactJudgments, compactDigest } from '../cli/eval/writing-compact-runtime.js';
import { writeCompactJudgeRevalidation, COMPACT_JUDGE_DIAGNOSTIC_POLICY } from '../cli/eval/writing-compact-judge-validation.js';
import { prepareCompactHealthyContinuation, runCompactHealthyContinuation } from '../cli/eval/writing-compact-pending-controller.js';
import { buildWritingCompactPublications, prepareWritingCompactPublicationSource, projectWritingCompactRun, validateWritingCompactPublication,
  verifyWritingCompactSourceSelection, WRITING_COMPACT_SELECTION_PATH, WRITING_ESTABLISHED_SCORE_BASIS } from '../cli/eval/writing-compact-publication.js';
import { buildWritingPublication, validateWritingPublication, validateWritingSummary } from '../cli/eval/writing-publication.js';
import { buildBenchmarkPublicationArtifact, validateWritingArtifactBindings } from '../cli/benchmark-publication-artifact.js';
import { buildOverallWritingSource } from '../cli/eval/overall-writing-source.js';
import { splitWritingResponseArchives, hydrateWritingResponseArchives } from '../cli/eval/writing-response-archives.js';
import { deriveExpectedWritingCategory } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';
import { COMPACT_PUBLICATION_VALIDATION_REGISTRY } from '../cli/eval/writing-compact-publication-validation-v1.js';

const repo = path.resolve(new URL('../', import.meta.url).pathname);
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-compact-publication-'));
const runDirectoryPath = path.join(root, 'mock-publication-run');
test.after(() => fs.rmSync(root, { recursive: true, force: true }));
prepareCompactRun({ runDirectoryPath });
const pending = exportCompactRun({ runDirectoryPath });
const specification = pending.manifest.specification;

// Exercise the real executor and all source checks using only an in-process
// provider emitter. These answers are test fixtures, never selected for release.
const mockProvider = ({ startupDiagnostic = false, creatorError = false } = {}) => (command, args) => {
  const child = new EventEmitter();
  child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
  child.kill = signal => { child.emit('close', null, signal); return true; };
  let input = '';
  child.stdin.on('data', chunk => { input += chunk; });
  child.stdin.on('finish', () => queueMicrotask(() => {
    const model = args[args.indexOf('--model') + 1];
    if (command === 'claude') {
      const task = specification.cases.find(task => task.task === input);
      assert.ok(task);
      const text = `${args.includes('--append-system-prompt') ? 'Skill' : 'Plain'} fixture ${task.id}.\n\n` + 'The flooded library opens when the keeper rings the bell.\n';
      child.stdout.end(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: text,
        stop_reason: 'end_turn', num_turns: 1, session_id: 'private-fixture-session', permission_denials: [],
        usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        modelUsage: { primary: { canonicalModel: model, outputTokens: 50 } }, total_cost_usd: 0.01,
        ...(creatorError ? { subtype: 'error_during_execution', is_error: true, stop_reason: 'max_tokens', result: 'API Error: maximum output tokens reached.' } : {}) }));
    } else {
      const task = specification.cases.find(task => input.includes(`Exact task:\n${task.task}`));
      assert.ok(task);
      const candidates = JSON.parse(input.split('Candidates (complete, untruncated):\n')[1]);
      const candidateText = label => {
        const item = Array.isArray(candidates) ? candidates.find(candidate => (candidate.label ?? candidate.candidateLabel) === label) : candidates[label];
        return JSON.stringify(item);
      };
      const assess = candidateLabel => ({ candidateLabel, ratings: task.rubric.map((criterion, index) => ({ criterionId: criterion.id,
        score: (candidateText(candidateLabel).includes('Skill fixture') ? 1 : 0) + (model === 'gpt-5.6-sol' ? 1 : 0) + index,
        evidence: 'The keeper rings the bell.', reason: 'The event changes access.' })) });
      const text = JSON.stringify({ assessmentA: assess('A'), assessmentB: assess('B'), preference: { candidate: 'tie', reason: 'Both describe the bell.', confidence: 'low' } });
      child.stdout.end([{ type: 'thread.started', thread_id: 'private-fixture-thread' },
        ...(startupDiagnostic ? [{ type: 'item.completed', item: { id: 'startup', type: 'error', message: `${COMPACT_JUDGE_DIAGNOSTIC_POLICY.allowedWarningPrefix}/Users/private-fixture/config.toml.` } }] : []),
        { type: 'turn.started' },
        { type: 'item.completed', item: { id: 'answer', type: 'agent_message', text } },
        { type: 'turn.completed', usage: { input_tokens: 100, cached_input_tokens: 0, output_tokens: 100 } }].map(event => JSON.stringify(event)).join('\n') + '\n');
    }
    child.stderr.end(); child.emit('close', 0, null);
  }));
  return child;
};
await runCompactGenerations({ runDirectoryPath, spawnImplementation: mockProvider() });
await runCompactJudgments({ runDirectoryPath, spawnImplementation: mockProvider() });
const snapshot = exportCompactRun({ runDirectoryPath });
const project = value => projectWritingCompactRun({ snapshot: value, sourceSha256: compactDigest(value) });
const projectWithoutLiveSources = value => {
  const read = fs.readFileSync;
  fs.readFileSync = () => { throw new Error('Live execution sources are unavailable or changed.'); };
  try { return project(value); } finally { fs.readFileSync = read; }
};

test('archive reconstruction is independent of live source bytes while freeze-time source checks remain strict', () => {
  assert.deepEqual(projectWithoutLiveSources(snapshot), project(snapshot));
  assert.throws(() => { COMPACT_PUBLICATION_VALIDATION_REGISTRY.amendedRuntimeSources[0].sha256 = 'f'.repeat(64); }, TypeError);
  const changed = structuredClone(snapshot);
  changed.manifest.sourceHashes[1].sha256 = 'f'.repeat(64);
  changed.manifestSha256 = compactDigest(changed.manifest);
  assert.throws(() => project(changed), /Unregistered compact v1 runtime source edition/);
  const read = fs.readFileSync;
  fs.readFileSync = (filename, ...args) => String(filename).endsWith('/cli/eval/agent-runtime.js') ? Buffer.from('changed future generic runtime') : read(filename, ...args);
  try {
    assert.throws(() => prepareWritingCompactPublicationSource({ repoRootDirectory: root, runDirectory: runDirectoryPath }), /live runtime source changed before freezing/);
  } finally { fs.readFileSync = read; }
});

test('compact groups score original 0–5 ratings, both judges, then the whole declared task set', () => {
  assert.ok(snapshot.generations.every(row => row.status === 'succeeded'));
  assert.ok(snapshot.judgments.every(row => row.status === 'succeeded'));
  const groups = project(snapshot);
  assert.deepEqual(groups.map(group => group.projection.cases.length), [3, 1, 1]);
  assert.equal(groups.reduce((sum, group) => sum + group.projection.coverage.responseCount, 0), 60);
  assert.equal(groups.reduce((sum, group) => sum + group.projection.coverage.pairedJudgeCallCount, 0), 60);
  assert.equal(groups.reduce((sum, group) => sum + group.projection.coverage.judgmentCount, 0), 120, 'answer assessments are not paired judge calls');
  for (const { projection, responseBundle } of groups) {
    assert.equal(projection.methodology.execution.hostAutomaticRetries, 0);
    assert.equal(projection.methodology.execution.creatorNetworkRetries, 0);
    assert.equal(projection.methodology.execution.creatorOutputLimitRecoveryAttempts, 3);
    assert.equal(projection.methodology.execution.creatorWholeSessionTokenCap, null);
    assert.equal(Object.hasOwn(projection.methodology.execution, 'automaticRetries'), false);
    assert.deepEqual(projection.scoreBasis.judges, ['codex:gpt-6-astra@medium', 'codex:gpt-5.6-sol@medium']);
    assert.equal(projection.settings.length, 6);
    assert.ok(projection.settings.every(setting => setting.scores.baseline === 40 && setting.scores.skill === 60 && setting.deltas.skill === 20));
    assert.ok(projection.entries.every(entry => entry.rank === 1), 'exact ties share rank');
    assert.ok(responseBundle.responses.every(response => response.provenance.outputSha256 === compactDigest(response.outputText)));
    assert.doesNotMatch(JSON.stringify(responseBundle), /private-fixture|cliArguments|\/Users\//);
    assert.ok(projection.cases.every(task => task.rubric.length === 4));
    assert.doesNotThrow(() => validateWritingCompactPublication(projection, responseBundle));
  }
  assert.equal(groups[1].projection.benchmarks[0].trackId, 'worldbuilding');
  assert.deepEqual(groups[2].projection.benchmarks[0].subjectTags, ['D&D']);
});

test('one missing judge retains the other original review and excludes both group ranks', () => {
  const changed = structuredClone(snapshot);
  changed.judgments[0] = { ...changed.manifest.judgmentPlan[0], status: 'pending' };
  const { projection, responseBundle } = project(changed)[0];
  assert.equal(projection.settings[0].scores.baseline, null);
  assert.equal(projection.settings[0].scores.skill, null);
  assert.equal(projection.coverage.completedSettingCount, 5);
  assert.equal(responseBundle.responses[0].judgments.length, 1);
  assert.equal(responseBundle.responses[0].score, null);
  assert.equal(responseBundle.responses[2].score, 40, 'other task evidence remains visible');
});

test('provider error text stays in the original failed attempt, never in a completed story answer', async () => {
  const failedRun = path.join(root, 'failed-generation-run');
  prepareCompactRun({ runDirectoryPath: failedRun });
  await runCompactGenerations({ runDirectoryPath: failedRun, limit: 1, spawnImplementation: mockProvider({ creatorError: true }) });
  const original = exportCompactRun({ runDirectoryPath: failedRun });
  const failed = original.generations.find(row => row.status === 'failed');
  assert.match(failed.responseText, /API Error/);
  const { projection, responseBundle } = project(original)[0];
  const response = responseBundle.responses.find(row => row.provenance.generationId === failed.id);
  assert.equal(response.status, 'error');
  assert.equal(response.outputText, '');
  assert.equal(response.provenance.outputSha256, null);
  assert.equal(response.wordCount, null);
  assert.equal(response.score, null);
  assert.equal(projection.coverage.responseCount, 0);
  assert.match(original.generations.find(row => row.id === failed.id).responseText, /API Error/);
});

test('source and public validators reject substituted groups, score edits, altered originals and swapped candidates', () => {
  for (const change of [value => { value.generations[0].responseText += ' changed'; }, value => { value.judgments[0].candidateMap = { A: 'skill', B: 'skill' }; },
    value => { value.judgments[0].assessmentA.ratings[0].score = 6; }, value => { value.judgments[0].judgeConfigurationId = 'codex:gpt-6-astra@xhigh'; }]) {
    const changed = structuredClone(snapshot); change(changed); assert.throws(() => project(changed));
  }
  for (const change of [value => { value.projection.caseResults[0].exactScore++; }, value => { value.projection.entries[0].rank = 2; },
    value => { value.responseBundle.responses[0].outputText += ' changed'; }, value => { value.responseBundle.responses[0].judgments[0].dimensions['criterion-1'].evidence = 'Invented'; }]) {
    const changed = structuredClone(project(snapshot)[0]); change(changed);
    assert.throws(() => validateWritingCompactPublication(changed.projection, changed.responseBundle));
  }
});

test('an amended public review must retain its exact failed predecessor and cannot count it as another assessment', () => {
  const { projection, responseBundle } = project(snapshot)[0];
  const request = responseBundle.judgeRequests[0], amendmentSha256 = 'a'.repeat(64), sourceAttemptSha256 = 'b'.repeat(64);
  projection.scoreBasis.amendmentSha256 = amendmentSha256;
  projection.methodology.operationalAmendment = { sha256: amendmentSha256 };
  for (const response of responseBundle.responses) response.provenance.amendmentSha256 = amendmentSha256;
  request.attemptNumber = 2; request.priorAttemptSha256 = sourceAttemptSha256;
  responseBundle.failedJudgeAttempts.push({ requestId: request.id, caseId: request.caseId, configurationId: request.configurationId,
    judgeConfigurationId: request.judgeConfigurationId, attemptNumber: 1, status: 'failed', sourceAttemptSha256,
    promptText: request.promptText, promptSha256: request.promptSha256, outputText: '', outputSha256: compactDigest('') });
  assert.doesNotThrow(() => validateWritingCompactPublication(projection, responseBundle));
  assert.equal(projection.coverage.pairedJudgeCallCount, 36);
  assert.equal(projection.coverage.judgmentCount, 72);
  responseBundle.failedJudgeAttempts.length = 0;
  assert.throws(() => validateWritingCompactPublication(projection, responseBundle), /lost its original failed attempt/);
});

test('offline diagnostic validation preserves original failed records and exact reviews without leaking raw invocation paths', async () => {
  const diagnosticRun = path.join(root, 'diagnostic-run');
  prepareCompactRun({ runDirectoryPath: diagnosticRun });
  await runCompactGenerations({ runDirectoryPath: diagnosticRun, spawnImplementation: mockProvider() });
  await runCompactJudgments({ runDirectoryPath: diagnosticRun, spawnImplementation: mockProvider({ startupDiagnostic: true }) });
  const original = exportCompactRun({ runDirectoryPath: diagnosticRun });
  assert.ok(original.judgments.every(row => row.status === 'failed' && row.responseText));
  const originalHash = compactDigest(original);
  const result = writeCompactJudgeRevalidation({ runDirectoryPath: diagnosticRun });
  assert.equal(result.validatedCount, 60);
  assert.equal(result.rejectedCount, 0);
  const selection = prepareWritingCompactPublicationSource({ repoRootDirectory: root, runDirectory: diagnosticRun });
  const frozen = JSON.parse(fs.readFileSync(path.join(root, selection.snapshot.path), 'utf8'));
  const groups = project(frozen);
  assert.deepEqual(projectWithoutLiveSources(frozen), groups, 'Offline original reviews do not depend on today’s helper bytes.');
  assert.equal(compactDigest(exportCompactRun({ runDirectoryPath: diagnosticRun })), originalHash);
  assert.deepEqual(frozen.judgments, original.judgments, 'Original failed records stay unchanged in the immutable export.');
  assert.equal(frozen.judgeValidationSha256, result.judgeValidationSha256);
  for (const { projection, responseBundle } of groups) {
    assert.ok(projection.settings.every(setting => setting.scores.baseline === 40 && setting.scores.skill === 60));
    assert.ok(responseBundle.judgeRequests.every(request => request.originalStatus === 'failed' && request.validation.additionalInferenceCalls === 0));
    assert.ok(responseBundle.judgeRequests.every(request => request.outputText === original.judgments.find(row => row.id === request.id).responseText));
    assert.ok(responseBundle.responses.every(response => response.provenance.judgeValidationSha256 === result.judgeValidationSha256));
    assert.doesNotMatch(JSON.stringify({ projection, responseBundle }), /private-fixture|rawStdout"|cliArguments|\/Users\//);
    assert.doesNotThrow(() => validateWritingCompactPublication(projection, responseBundle));
  }
  const changed = structuredClone(frozen);
  changed.judgeValidation.records[0].assessment.assessmentA.ratings[0].score = 5;
  changed.judgeValidationSha256 = compactDigest(changed.judgeValidation);
  assert.throws(() => project(changed), /Expected values to be strictly deep-equal/);
  const missing = structuredClone(frozen); delete missing.judgeValidation;
  assert.throws(() => project(missing), /offline judge validation is missing/);
});

test('healthy continuation keeps the six-setting roster and binds only original untouched Opus low/medium attempts', async () => {
  const continuedRun = path.join(root, 'continued-run');
  prepareCompactRun({ runDirectoryPath: continuedRun });
  const originalManifest = exportCompactRun({ runDirectoryPath: continuedRun }).manifest;
  const scope = prepareCompactHealthyContinuation({ runDirectoryPath: continuedRun });
  await runCompactHealthyContinuation({ runDirectoryPath: continuedRun, spawnImplementation: mockProvider() });
  await runCompactJudgments({ runDirectoryPath: continuedRun, spawnImplementation: mockProvider() });
  const selection = prepareWritingCompactPublicationSource({ repoRootDirectory: root, runDirectory: continuedRun });
  const frozen = JSON.parse(fs.readFileSync(path.join(root, selection.snapshot.path), 'utf8'));
  assert.deepEqual(frozen.manifest, originalManifest);
  assert.equal(frozen.healthyContinuationSha256, scope.scopeSha256);
  assert.equal(frozen.generations.filter(row => row.status === 'succeeded').length, 20);
  assert.ok(frozen.generations.filter(row => row.configurationId.endsWith('@max')).every(row => row.status === 'pending'));
  assert.deepEqual(projectWithoutLiveSources(frozen), project(frozen), 'Archived continuation does not depend on today’s runtime/controller bytes.');
  for (const { projection, responseBundle } of project(frozen)) {
    assert.equal(projection.settings.length, 6);
    assert.equal(projection.coverage.completedSettingCount, 2);
    assert.equal(projection.scoreBasis.healthyContinuationSha256, scope.scopeSha256);
    assert.deepEqual(projection.settings.filter(setting => setting.scores.skill !== null).map(setting => setting.configurationId), ['claude:claude-opus-5@low', 'claude:claude-opus-5@medium']);
    assert.ok(responseBundle.responses.filter(response => response.status === 'scored').every(response => response.provenance.controllerScopeSha256 === scope.scopeSha256));
    assert.match(projection.methodology.limitations.join(' '), /Max-effort continuation is paused/);
    assert.doesNotThrow(() => validateWritingCompactPublication(projection, responseBundle));
  }
  const missing = structuredClone(frozen); delete missing.healthyContinuation;
  assert.throws(() => project(missing), /healthy continuation scope is missing/);
  const changed = structuredClone(frozen);
  changed.generations.find(row => row.attempt?.controllerScopeSha256).attempt.controllerScopeSha256 = 'a'.repeat(64);
  assert.throws(() => project(changed));
});

test('registered pin discovery skips unmeasured groups and rejects path traversal or altered immutable exports', () => {
  const pinFor = value => ({ kind: 'vasirbenchmark-writing-compact-source', schemaVersion: 1,
    snapshot: { path: 'test/snapshot.json', sha256: compactDigest(JSON.stringify(value)) } });
  const selected = value => {
    const pin = pinFor(value), text = JSON.stringify(value);
    return { pin, text, options: { repoRootDirectory: root, readFileSyncImplementation: name => name.endsWith(WRITING_COMPACT_SELECTION_PATH) ? JSON.stringify(pin) : text } };
  };
  assert.equal(buildWritingCompactPublications(selected(pending).options).length, 0);
  assert.equal(buildWritingCompactPublications(selected(snapshot).options).length, 3);
  const invalid = selected(snapshot); invalid.pin.snapshot.path = '../escape.json';
  assert.throws(() => buildWritingCompactPublications(invalid.options), /unsafe/);
  const drift = selected(snapshot); drift.pin.snapshot.sha256 = 'a'.repeat(64);
  assert.throws(() => buildWritingCompactPublications(drift.options), /immutable compact source changed/);
});

test('private compact source selections do not enter the public release or lazy archives', () => {
  const original = buildWritingPublication({ repoRootDirectory: repo });
  const selection = prepareWritingCompactPublicationSource({ repoRootDirectory: root, runDirectory: runDirectoryPath });
  const reader = (filename, encoding) => {
    const relative = path.relative(repo, filename);
    if (relative === WRITING_COMPACT_SELECTION_PATH) return JSON.stringify(selection);
    if (relative === selection.snapshot.path) return fs.readFileSync(path.join(root, relative), encoding);
    return fs.readFileSync(filename, encoding);
  };
  const built = buildWritingPublication({ repoRootDirectory: repo, readFileSyncImplementation: reader });
  assert.deepEqual(built, original, 'even a scored compact selection cannot alter the public release');
  assert.deepEqual(built.projection.writingScoreBasis, WRITING_ESTABLISHED_SCORE_BASIS);
  assert.deepEqual(deriveExpectedWritingCategory(built.projection, 'all-writing').selectionIds,
    ['all-writing', 'storytelling', 'storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery']);
  assert.equal(built.stub.catalog.length, 3);
  assert.equal(built.stub.catalogCoverage.benchmarkCount, 3);
  assert.ok(built.stub.catalog.every(item => !item.archived && item.scoreBasisIncluded));
  assert.deepEqual(buildOverallWritingSource(built.projection), buildOverallWritingSource(original.projection), 'narrow compact cohort cannot alter broad score, weights, ranks or roster');
  const { compactBenchmarks, ...legacyResponses } = built.responseBundle;
  const { compactBenchmarks: originalCompact, ...originalLegacy } = original.responseBundle;
  assert.deepEqual(legacyResponses, originalLegacy, 'all old public answers and reviews remain byte-equivalent');
  assert.equal(compactBenchmarks, undefined);
  const archives = splitWritingResponseArchives(built.responseBundle, { separateBenchmarks: true });
  assert.deepEqual(hydrateWritingResponseArchives(archives.primary, archives.creation, archives.additional), built.responseBundle);
  assert.doesNotThrow(() => validateWritingPublication(built.projection, built.responseBundle));
  assert.doesNotThrow(() => validateWritingSummary(built.stub));
  assert.doesNotThrow(() => validateWritingArtifactBindings({ summary: built.stub, writing: built.projection, responses: built.responseBundle }));
  for (const change of [summary => { summary.catalog[0].archived = true; }, summary => { summary.writingScoreBasis.benchmarkIds.pop(); },
    summary => { summary.compactBenchmarks = { 'storytelling-one-shot-v1': {} }; }]) {
    const summary = structuredClone(built.stub); change(summary);
    assert.throws(() => validateWritingArtifactBindings({ summary, writing: built.projection, responses: built.responseBundle }));
  }
  const selectionPath = path.join(root, WRITING_COMPACT_SELECTION_PATH);
  fs.mkdirSync(path.dirname(selectionPath), { recursive: true }); fs.writeFileSync(selectionPath, JSON.stringify(selection));
  // The private projector and immutable evidence verifier remain usable without
  // registering any compact benchmark in the current public release.
  const privateGroups = buildWritingCompactPublications({ repoRootDirectory: root });
  const privateCollection = { compactBenchmarks: Object.fromEntries(privateGroups.map(item => [item.stub.benchmarkId, item.projection])) };
  const privateResponses = { compactBenchmarks: Object.fromEntries(privateGroups.map(item => [item.stub.benchmarkId, item.responseBundle])) };
  const verification = verifyWritingCompactSourceSelection({ repoRootDirectory: root, collection: privateCollection, responseBundle: privateResponses });
  assert.deepEqual(verification.benchmarkIds, Object.keys(privateCollection.compactBenchmarks));
  assert.equal(verification.snapshot.sha256, selection.snapshot.sha256);
  const wrongArchive = structuredClone(privateResponses); wrongArchive.compactBenchmarks[verification.benchmarkIds[0]].responses[0].outputText += ' changed';
  assert.throws(() => verifyWritingCompactSourceSelection({ repoRootDirectory: root, collection: privateCollection, responseBundle: wrongArchive }), /original-review archive differs/);
  const artifact = buildBenchmarkPublicationArtifact({ repoRootDirectory: repo, validateAcceptance: false, publicationReadFileSyncImplementation: reader });
  try {
    assert.ok(verification.benchmarkIds.every(id => !artifact.routes.reportFragments.includes(`/benchmark-report.html#${id}`)));
    assert.equal(artifact.files.filter(file => file.path === 'writing-responses.js').length, 1);
    assert.ok(artifact.compressedLandingBytes <= artifact.config.limits.maxCompressedLandingBytes);
  } finally { artifact.dispose(); }
});
