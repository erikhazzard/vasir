import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { gzipSync } from 'node:zlib';
import { PAIRED_NATIVE_CONFIGURATION_IDS, PAIRED_TWISTS_EDITION, PAIRED_WRITING_SCORE_BASIS, deriveExpectedPairedTwistsEvidence, deriveExpectedOverallV3, verifyOverallV3Projection, deriveExpectedWritingCategory, deriveExpectedProvisionalEvidence, verifyWritingProofEvidence } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';
import { WRITING_COMPACT_BENCHMARKS, WRITING_ESTABLISHED_SCORE_BASIS, projectWritingCompactRun } from '../cli/eval/writing-compact-publication.js';
import { WRITING_RESPONSE_ARCHIVES, WRITING_CREATION_ARCHIVE, hydrateWritingResponseArchives } from '../cli/eval/writing-response-archives.js';
import { projectPlotTwistsPairedRun } from '../cli/eval/plot-twists-paired-publication.js';
import { completePairedFixture, completeSupplementalPairedFixture, mockPairedProvider } from './helpers/plot-twists-paired-fixture.js';
import { preparePairedRun, runPairedGenerations, runPairedJudgments } from '../cli/eval/plot-twists-paired-runtime.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = join(repoRoot, 'site', 'vasirbenchmark.com');
const generatedPublicFiles = new Set(['data.js', 'responses.js', 'writing-data.js', 'writing-responses.js', 'writing-creation-responses.js', 'writing-twists-responses.js', 'writing-dungeon-master-responses.js']);
const acceptanceOnlyFiles = [
  'capture.mjs',
  'capture.sh',
  'games-browsercheck.mjs',
  'writing-browsercheck.mjs'
];
const focusedBenchmarkId = 'storytelling-magic-discovery';
const focusedViewports = [{ width: 1440, height: 1000 }, { width: 820, height: 1000 }, { width: 390, height: 844 }];
const sharedBenchmarks = ['storytelling-core-idea', 'storytelling-plot-twists', 'dungeon-master-adventure-outline', focusedBenchmarkId];
const sharedMethod = 'planned-roster-finalized-equal-subcategory-complete-paired-index-v2';
const selectedMethod = 'selected-benchmarks-equal-weight-complete-paired-index-v3';
const availableMethod = 'common-benchmark-ranking-with-visible-partials-v5';
const versionedMethod = 'versioned-common-benchmark-ranking-v6';
const compactBenchmarkIds = WRITING_COMPACT_BENCHMARKS.map(item => item.id);
const compactSharedBenchmarks = [...sharedBenchmarks, ...compactBenchmarkIds];
const compactSelections = ['all-writing', 'storytelling', 'storytelling-core-idea', 'storytelling-magic-discovery', 'storytelling-plot-twists-compact-v2', 'storytelling-one-shot-v1', 'worldbuilding', 'writing-place-generation-v1', 'storytelling-plot-twists', 'dungeon-master', 'dungeon-master-adventure-outline'];
const compactHarness = 'writing-compact-browser-evidence.mjs';
const cleanLedgerPresentation = 'writing-benchmark-ledger-v1';
const leadersLedgerPresentation = 'writing-benchmark-leaders-v1';
const overallPresentation = 'writing-overall-v3-v1';
const isCleanLedgerPresentation = value => [cleanLedgerPresentation, leadersLedgerPresentation, overallPresentation].includes(value);
const isSelectedMethod = method => [selectedMethod, availableMethod].includes(method);
const selectedFields = ['storytelling', 'storytelling-core-idea', 'storytelling-plot-twists', focusedBenchmarkId, 'dungeon-master'];
const storyBenchmarks = selectedFields.slice(1, 4);
const publishedWritingRelease = { id: 'writing-storytelling-public-v1', lifecycle: 'published' };
const publishedWritingFields = ['all-writing', 'storytelling', ...storyBenchmarks];
const publishedWritingScope = {
  fields: publishedWritingFields, benchmarkIds: storyBenchmarks, comparisonId: storyBenchmarks[0],
  groups: [{ trackId: 'storytelling', benchmarkIds: storyBenchmarks }],
  benchmarks: id => ['all-writing', 'storytelling'].includes(id) ? storyBenchmarks : [id],
  weights: id => Object.fromEntries((['all-writing', 'storytelling'].includes(id) ? storyBenchmarks : [id]).map(benchmarkId => [benchmarkId, ['all-writing', 'storytelling'].includes(id) ? 1 / 3 : 1]))
};
const allWritingFields = ['all-writing', ...selectedFields];
const allWritingBenchmarks = [...storyBenchmarks, 'dungeon-master-adventure-outline'];
const allWritingWeights = Object.fromEntries(allWritingBenchmarks.map(id => [id, id === 'dungeon-master-adventure-outline' ? 1 / 2 : 1 / 6]));
const selectionBenchmarks = id => id === 'all-writing' ? allWritingBenchmarks : id === 'storytelling' ? storyBenchmarks : id === 'dungeon-master' ? ['dungeon-master-adventure-outline'] : [id];
const selectionWeights = id => id === 'all-writing' ? allWritingWeights : Object.fromEntries(selectionBenchmarks(id).map(benchmarkId => [benchmarkId, 1 / selectionBenchmarks(id).length]));
const receiptScorePosition = (score, allWriting) => Math.round((score + (allWriting ? 2 * Number.EPSILON * Math.max(1, Math.abs(score)) : 0)) * 10) / 10;
const sharedCanonicalViews = [
  ['leaderboard', ''], ['capabilities', '-capabilities'], ['capability-benchmarks', '-capability-benchmarks'],
  ['efficiency', '-efficiency'], ['report', '-benchmark-report'], ['workflows', '-workflows'],
  ['workflow-benchmarks', '-workflow-benchmarks'], ['workflow-efficiency', '-workflow-efficiency'],
  ['workflow-report', '-workflow-report'], ['games', '-game-models'],
  ['game-benchmarks', '-game-benchmarks'], ['game-efficiency', '-game-efficiency']
];
const sharedCanonicalTasks = ['desktop', 'mobile'].flatMap(viewport => sharedCanonicalViews.map(([target, suffix]) => ({ target, viewport, width: viewport === 'desktop' ? 1440 : 390, height: viewport === 'desktop' ? 1000 : 844, filename: `${viewport}${suffix}.png` })));
for (const target of ['leaderboard', 'capabilities', 'report', 'workflows', 'workflow-report', 'games', 'game-benchmarks', 'game-efficiency']) sharedCanonicalTasks.push({ target, viewport: 'tablet', width: 820, height: 1000, filename: `tablet-${target}.png` });
const expectedCaptures = [
  'desktop.png',
  'mobile.png',
  'desktop-capabilities.png',
  'mobile-capabilities.png',
  'desktop-capability-benchmarks.png',
  'mobile-capability-benchmarks.png',
  'desktop-efficiency.png',
  'mobile-efficiency.png',
  'desktop-benchmark-report.png',
  'mobile-benchmark-report.png',
  'desktop-workflows.png',
  'mobile-workflows.png',
  'desktop-workflow-benchmarks.png',
  'mobile-workflow-benchmarks.png',
  'desktop-workflow-efficiency.png',
  'mobile-workflow-efficiency.png',
  'desktop-workflow-report.png',
  'mobile-workflow-report.png',
  'desktop-game-models.png',
  'desktop-game-benchmarks.png',
  'desktop-game-efficiency.png',
  'mobile-game-models.png',
  'mobile-game-benchmarks.png',
  'mobile-game-efficiency.png',
  'desktop-games.png',
  'mobile-games.png',
  'desktop-games-ratings.png',
  'mobile-games-ratings.png',
  'desktop-games-playback.png',
  'mobile-games-playback.png',
  'desktop-games-play.png',
  'mobile-games-play.png',
  'desktop-games-fullscreen.png',
  'mobile-games-fullscreen.png',
  ...['desktop', 'mobile'].flatMap(viewport => [
    'writing-models',
    'writing-benchmarks',
    'writing-efficiency',
    'writing-efficiency-tokens',
    'writing-report',
    'writing-method',
    'writing-rubric-anchors',
    'writing-method-execution',
    'writing-reference',
    'writing-answer',
    'writing-judgments',
    'writing-judge-resources',
    'writing-execution'
  ].map(state => `${viewport}-${state}.png`))
];

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

function pngDimensions(contents) {
  const signature = contents.subarray(0, 8).toString('hex');
  assert.equal(signature, '89504e470d0a1a0a', 'capture must be a PNG');
  assert.equal(contents.subarray(12, 16).toString('ascii'), 'IHDR', 'capture must have a PNG IHDR');
  return {
    width: contents.readUInt32BE(16),
    height: contents.readUInt32BE(20)
  };
}

async function assertLockedFile(record, root = siteRoot, reader = readFile) {
  assert.equal(typeof record.path, 'string');
  assert.ok(record.path && !record.path.includes('\\') && record.path.split('/').every(part => part && part !== '.' && part !== '..'), 'locked evidence must use a contained relative path');
  assert.match(record.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isInteger(record.bytes) && record.bytes >= 0);
  const contents = await reader(join(root, record.path));
  assert.equal(contents.length, record.bytes, `${record.path} byte length drifted`);
  assert.equal(sha256(contents), record.sha256, `${record.path} SHA-256 drifted`);
  return contents;
}

async function assertCapture(record) {
  const contents = await assertLockedFile(record);
  assert.deepEqual(pngDimensions(contents), { width: record.width, height: record.height }, `${record.path} viewport dimensions drifted`);
}

function selectedSourceReferences(value, found = []) {
  if (!value || typeof value !== 'object') return found;
  if (typeof value.path === 'string' && /^[a-f0-9]{64}$/.test(value.sha256 ?? '')) found.push({ path: value.path, sha256: value.sha256 });
  for (const child of Object.values(value)) if (child && typeof child === 'object') selectedSourceReferences(child, found);
  return found;
}

const pairedOriginalConfigurations = ['codex:gpt-6-astra@medium', 'codex:gpt-5.6-sol@medium', 'codex:gpt-5.6-terra@medium', 'codex:gpt-5.6-luna@medium', 'claude:claude-fable-5-1@medium', 'claude:claude-opus-5@medium'];
const pairedAddedConfigurations = ['codex:gpt-6-astra@low', 'codex:gpt-6-astra@xhigh', 'codex:gpt-6-astra@ultra',
  'claude:claude-fable-5-1@low', 'claude:claude-fable-5-1@xhigh', 'claude:claude-fable-5-1@max', 'claude:claude-opus-5@low', 'claude:claude-opus-5@xhigh'];
function assertPairedCoverageExtension(extension, retained = pairedOriginalConfigurations) {
  assert.ok(['paired-reasoning-coverage-extension-v1', 'paired-declared-coverage-extension-v2'].includes(extension.version));
  assert.ok(typeof extension.purpose === 'string' && extension.purpose.trim());
  for (const field of ['parentSnapshotSha256', 'parentManifestSha256']) assert.match(extension[field], /^[a-f0-9]{64}$/);
  if (extension.version === 'paired-reasoning-coverage-extension-v1') {
    assert.deepEqual(retained, pairedOriginalConfigurations);
    assert.deepEqual(extension.addedConfigurations, pairedAddedConfigurations);
  }
  assert.ok(extension.addedConfigurations.length > 0 && extension.addedConfigurations.every(id => PAIRED_NATIVE_CONFIGURATION_IDS.includes(id) && !retained.includes(id)));
  assert.equal(new Set(extension.addedConfigurations).size, extension.addedConfigurations.length);
  assert.equal(extension.retainedConfigurationCount, retained.length);
  assert.equal(extension.additionalGenerationCount, extension.addedConfigurations.length * 2);
  assert.equal(extension.additionalJudgeRequestCount, extension.addedConfigurations.length * 2);
}

function assertPairedEvidenceCohorts(fresh) {
  const { sourceCohorts: cohorts, coverageHistory: history } = fresh;
  assert.ok(Array.isArray(cohorts) && cohorts.length >= 2 && history?.length === cohorts.length - 1);
  assert.deepEqual(cohorts[0].configurationIds, pairedOriginalConfigurations);
  const retained = [];
  for (const [index, cohort] of cohorts.entries()) {
    assert.equal(cohort.sourceCohort, index ? 'supplement' : 'original');
    for (const field of ['sourceSnapshotSha256', 'sourceManifestSha256']) assert.match(cohort[field], /^[a-f0-9]{64}$/);
    if (index) {
      const step = history[index - 1], parent = cohorts[index - 1];
      assertPairedCoverageExtension(step, retained);
      assert.deepEqual(cohort.configurationIds, step.addedConfigurations);
      assert.equal(step.parentSnapshotSha256, parent.sourceSnapshotSha256); assert.equal(step.parentManifestSha256, parent.sourceManifestSha256);
      assert.equal(step.sourceSnapshotSha256, cohort.sourceSnapshotSha256); assert.equal(step.sourceManifestSha256, cohort.sourceManifestSha256);
    }
    retained.push(...cohort.configurationIds);
  }
  assert.equal(new Set(cohorts.map(cohort => cohort.sourceSnapshotSha256)).size, cohorts.length);
  const { sourceSnapshotSha256, sourceManifestSha256, ...latest } = history.at(-1);
  assert.deepEqual(latest, fresh.coverageExtension); assert.equal(sourceSnapshotSha256, fresh.technicalRecovery?.sourceSnapshotSha256 ?? fresh.sourceSha256); assert.equal(sourceManifestSha256, fresh.technicalRecovery?.sourceManifestSha256 ?? fresh.manifestSha256);
  return retained;
}

const lineageConfigurations = lineage => lineage?.kind === 'declared-writing-coverage-extension'
  ? [...lineageConfigurations(lineage.previousLineage), ...lineage.coverageExtension.addedConfigurations] : pairedOriginalConfigurations;

async function assertSelectedSourceEvidence(selection, readLockedFile = assertLockedFile) {
  assert.equal(selection.path, `benchmarks/${selection.benchmarkId}/publication.json`);
  // The tracked source selection is always required and byte-verified, even on a bare checkout.
  const selected = JSON.parse(await readLockedFile(selection, repoRoot));
  const paired = selected.edition === PAIRED_TWISTS_EDITION;
  if (paired) {
    assert.equal(selection.benchmarkId, 'storytelling-plot-twists');
    assert.equal(selected.kind, 'vasirbenchmark-plot-twists-paired-source');
    assert.equal(selected.schemaVersion, 1);
    assert.equal(selection.sources.length, 1);
    assert.equal(selected.snapshot.path, `.agents/vasir-evals/${PAIRED_TWISTS_EDITION}/publication-snapshots/${selected.snapshot.sha256}/snapshot.json`);
    let replacement = selection.lineage;
    if (replacement?.kind === 'declared-writing-technical-recovery') {
      assert.equal(replacement.edition, PAIRED_TWISTS_EDITION);
      for (const field of ['originalEvidencePreserved', 'cleanAnswersAndCompletedReviewsPreserved', 'supersededOriginalAttemptsPreserved', 'originalSettingsRerun']) assert.equal(replacement[field], true);
      assert.equal(replacement.scoreBasedReplacementSelection, false);
      assert.equal(replacement.technicalRecovery.version, 'paired-tool-isolation-recovery-v1');
      assert.equal(replacement.technicalRecoverySha256, createHash('sha256').update(JSON.stringify(replacement.technicalRecovery)).digest('hex'));
      assert.equal(replacement.stoppedSourceSha256, replacement.technicalRecovery.sourceSnapshotSha256);
      assert.notEqual(replacement.stoppedSourceSha256, selected.snapshot.sha256);
      assert.equal(replacement.previousSelection.path, selection.path);
      assert.equal(replacement.previousSources.length, 1);
      assert.equal(replacement.previousSources[0].sha256, replacement.parentSourceSha256);
      assert.equal(replacement.previousSources[0].path, `.agents/vasir-evals/${PAIRED_TWISTS_EDITION}/publication-snapshots/${replacement.parentSourceSha256}/snapshot.json`);
      replacement = replacement.previousLineage;
    }
    while (replacement?.kind === 'declared-writing-coverage-extension') {
      assertPairedCoverageExtension(replacement.coverageExtension, lineageConfigurations(replacement.previousLineage));
      assert.equal(replacement.edition, PAIRED_TWISTS_EDITION);
      assert.equal(replacement.originalEvidencePreserved, true);
      assert.equal(replacement.answersAndCompletedReviewsPreserved, true);
      assert.equal(replacement.originalSettingsRerun, false);
      assert.equal(replacement.parentSourceSha256, replacement.coverageExtension.parentSnapshotSha256);
      assert.equal(replacement.previousSelection.path, selection.path);
      assert.match(replacement.previousSelection.sha256, /^[a-f0-9]{64}$/);
      assert.equal(replacement.previousSources.length, 1);
      assert.equal(replacement.previousSources[0].sha256, replacement.parentSourceSha256);
      assert.equal(replacement.previousSources[0].path, `.agents/vasir-evals/${PAIRED_TWISTS_EDITION}/publication-snapshots/${replacement.parentSourceSha256}/snapshot.json`);
      assert.notEqual(selected.snapshot.sha256, replacement.parentSourceSha256);
      replacement = replacement.previousLineage;
    }
    assert.equal(replacement?.kind, 'declared-writing-source-replacement');
    assert.equal(replacement.edition, PAIRED_TWISTS_EDITION);
    assert.equal(replacement.originalEvidencePreserved, true);
    assert.equal(replacement.priorAnswersAndReviewsReused, false);
    assert.equal(replacement.previousSelection.path, selection.path);
    assert.match(replacement.previousSelection.sha256, /^[a-f0-9]{64}$/);
    assert.ok(replacement.previousSources.length >= 2);
  } else assert.ok(selection.sources.length >= 2);
  const byPath = (left, right) => left.path.localeCompare(right.path) || left.sha256.localeCompare(right.sha256);
  assert.deepEqual(selection.sources.map(({ path, sha256 }) => ({ path, sha256 })).sort(byPath), selectedSourceReferences(selected).sort(byPath), 'accepted source metadata differs from the tracked selection');
  const unavailable = [];
  for (const source of selection.sources) {
    assert.ok(source.path.startsWith(`.agents/vasir-evals/${paired ? PAIRED_TWISTS_EDITION : selection.benchmarkId}/publication-snapshots/`), 'optional private evidence must belong to the selected immutable archive');
    try { await readLockedFile(source, repoRoot); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // Raw runtime archives are intentionally ignored by Git. Absence is not a byte-verification pass.
      unavailable.push(source.path);
    }
  }
  if (paired) for (let lineage = selection.lineage; lineage; lineage = lineage.previousLineage) for (const source of lineage.previousSources) {
    const sourceEdition = ['declared-writing-coverage-extension', 'declared-writing-technical-recovery'].includes(lineage.kind) ? PAIRED_TWISTS_EDITION : 'storytelling-plot-twists';
    assert.ok(source.path.startsWith(`.agents/vasir-evals/${sourceEdition}/publication-snapshots/`), 'retained evidence must remain in its original immutable archive');
    try { await readLockedFile(source, repoRoot); } catch (error) { if (error.code !== 'ENOENT') throw error; unavailable.push(source.path); }
  }
  return unavailable;
}

async function assertCompactSelectedSourceEvidence(source, readLockedFile = assertLockedFile) {
  assert.equal(source.kind, 'vasirbenchmark-compact-writing-source-verification');
  assert.deepEqual(source.benchmarkIds, compactBenchmarkIds);
  assert.equal(source.selection.path, 'benchmarks/writing-compact-v1/publication.json');
  const selected = JSON.parse(await readLockedFile(source.selection, repoRoot));
  assert.equal(selected.kind, 'vasirbenchmark-writing-compact-source');
  assert.equal(selected.schemaVersion, 1);
  assert.deepEqual(selected.snapshot, { path: source.snapshot.path, sha256: source.snapshot.sha256 });
  assert.equal(source.snapshot.path, `.agents/vasir-evals/writing-compact-v1/publication-snapshots/${source.snapshot.sha256}/snapshot.json`);
  let bytes;
  try { bytes = await readLockedFile(source.snapshot, repoRoot); }
  catch (error) { if (error.code === 'ENOENT') return { unavailable: [source.snapshot.path], publications: null }; throw error; }
  const snapshot = JSON.parse(bytes);
  for (const field of ['manifestSha256', 'amendmentSha256', 'judgeValidationSha256', 'healthyContinuationSha256']) assert.equal(snapshot[field] ?? null, source[field] ?? null);
  return { unavailable: [], publications: projectWritingCompactRun({ snapshot, sourceSha256: source.snapshot.sha256 }) };
}

async function assertFocusedEvidence(manifest, deployment) {
  const { acceptance } = manifest, verification = acceptance.verification;
  assert.deepEqual(acceptance.scope, { kind: 'focused-writing-benchmark', schemaVersion: 1, benchmarkId: focusedBenchmarkId, viewports: focusedViewports });
  assert.deepEqual(verification.viewports, focusedViewports);
  assert.equal(verification.fullGamesAudit, false, 'a focused review must not claim a fresh exhaustive Games audit');
  assert.match(acceptance.basis, /no fresh human screenshot approval is claimed/);
  assert.match(verification.releaseId, /^[a-f0-9]{64}$/);
  assert.equal(verification.coverage.executionComplete, true);
  assert.ok(['complete', 'complete-with-exclusions'].includes(verification.coverage.executionStatus));
  for (const [key, value] of Object.entries({ settingCount: 33, expectedResponseCount: 198, expectedPairs: 99, expectedJudgmentCount: 792, expectedJudgeRequestCount: 396, pendingGenerationCount: 0, pendingJudgmentCount: 0 })) assert.equal(verification.coverage[key], value);
  assert.equal(verification.coverage.judgmentCount + verification.coverage.terminalJudgmentFailureCount + verification.coverage.terminallyExcludedJudgmentCount, 792);
  const sourceIds = ['storytelling-core-idea', 'storytelling-plot-twists', 'dungeon-master-adventure-outline', focusedBenchmarkId];
  assert.deepEqual(verification.sourceSelections.map(selection => selection.benchmarkId), sourceIds);
  const unavailablePrivateSources = [];
  for (const selection of verification.sourceSelections) unavailablePrivateSources.push(...await assertSelectedSourceEvidence(selection));

  const candidate = JSON.parse(await assertLockedFile(verification.candidateManifest));
  assert.equal(candidate.releaseId, verification.releaseId);
  assert.deepEqual(candidate.files.map(file => file.path).sort(), deployment.publicFiles.map(file => file.path).sort());
  const loadedFileMap = new Map(candidate.files.map(file => [`/releases/${verification.releaseId}/${file.path}`, file]));
  const check = JSON.parse(await assertLockedFile(verification.browserProof));
  assert.equal(check.kind, 'vasirbenchmark-creation-release-check');
  assert.equal(check.status, 'passed');
  assert.equal(check.mode, 'local-frozen-bytes');
  assert.equal(check.releaseId, verification.releaseId);
  assert.deepEqual(check.sourceSelections, verification.sourceSelections);
  assert.deepEqual(check.reports.map(({ width, height }) => ({ width, height })), focusedViewports);
  assert.deepEqual(verification.browserReports.map(({ width, height }) => ({ width, height })), focusedViewports);
  const expectedCurrentCaptures = [];
  for (const [index, report] of verification.browserReports.entries()) {
    assert.equal(report.sha256, check.reports[index].proof.sha256);
    assert.equal(report.bytes, check.reports[index].proof.bytes);
    const proof = JSON.parse(await assertLockedFile(report));
    assert.equal(proof.kind, 'vasirbenchmark-writing-browsercheck');
    assert.equal(proof.status, 'passed');
    assert.equal(proof.benchmarkId, focusedBenchmarkId);
    assert.equal(proof.trialCount, 3);
    assert.equal(proof.width, report.width);
    assert.equal(proof.height, report.height);
    assert.equal(proof.harnessSha256, manifest.files.find(file => file.path === 'writing-browsercheck.mjs').sha256);
    assert.deepEqual(proof.coverage, verification.coverage);
    assert.deepEqual(proof.errors, []);
    assert.ok(proof.checks.length > 0);
    assert.equal(new URL(proof.url).origin, new URL(check.baseUrl).origin);
    for (const loaded of proof.loadedFiles) {
      const url = new URL(loaded.url), expected = loadedFileMap.get(url.pathname);
      assert.equal(url.origin, new URL(check.baseUrl).origin);
      assert.ok(expected, `unexpected browser asset: ${url.pathname}`);
      assert.equal(loaded.bytes, expected.bytes);
      assert.equal(loaded.sha256, expected.sha256);
    }
    assert.ok(proof.loadedFiles.some(file => new URL(file.url).pathname === `/releases/${verification.releaseId}/writing-creation-responses.js`), 'each viewport must load the dedicated Magic archive');
    const captures = [...proof.screenshots, ...(proof.failureScreenshots ?? [])];
    assert.ok(captures.length > 0);
    for (const capture of captures) {
      assert.equal(capture.width, report.width);
      assert.equal(capture.height, report.height);
      expectedCurrentCaptures.push({ ...capture, path: `${dirname(report.path)}/${capture.path}` });
    }
  }
  assert.deepEqual(manifest.captures, expectedCurrentCaptures, 'only freshly checked Magic captures may be current');
  assert.ok(manifest.captures.every(capture => capture.path.startsWith(`reviews/${focusedBenchmarkId}/`)));

  const historicalCaptures = [];
  let retained = manifest.retainedCaptureEvidence;
  assert.ok(retained, 'a focused receipt must retain the previous acceptance evidence');
  while (retained) {
    const previous = JSON.parse(await assertLockedFile(retained.receipt));
    assert.equal(previous.version, retained.version);
    assert.deepEqual(previous.captures, retained.captures);
    assert.deepEqual(previous.retainedCaptureEvidence ?? null, retained.previousRetainedEvidence ?? null);
    for (const capture of retained.captures) {
      assert.ok(!manifest.captures.some(current => current.path === capture.path), 'historical captures must not be claimed as current');
      await assertCapture(capture);
    }
    historicalCaptures.push(...retained.captures);
    retained = retained.previousRetainedEvidence;
  }
  assert.deepEqual(historicalCaptures.filter(capture => expectedCaptures.includes(capture.path)).map(capture => capture.path), expectedCaptures, 'all 60 prior peer captures remain historical evidence');
  return unavailablePrivateSources;
}

// The category correction is a full candidate review, not a focused Magic
// exception. Its inventory is the exact union of fresh, immutable receipts.
function assertSelectedWritingReceipt(category, index, scope = null) {
  const close = (actual, expected) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-8);
  const available = index.method === availableMethod || index.method === versionedMethod;
  const allWriting = index.selectionId === 'all-writing';
  const fields = scope?.fields || (allWriting ? allWritingFields : selectedFields);
  const benchmarksFor = scope?.benchmarks || selectionBenchmarks;
  const weightsFor = scope?.weights || selectionWeights;
  const presentation = category.presentationEvidence;
  for (const field of ['noPlaceholderPanels', 'compactRows', 'matchedEngineeringFrame', 'dumbbellGeometry']) assert.equal(presentation[field], true);
  assert.deepEqual(presentation.mismatches, []);
  assert.ok(!presentation.packedBars);
  assert.deepEqual(category.selectionEvidence.map(item => item.selectionId), fields);
  for (const selection of category.selectionEvidence) {
    if (isCleanLedgerPresentation(category.presentationVariant)) {
      for (const field of ['defaultClosed', 'opensForAudit', 'closesAfterAudit']) assert.equal(selection.modelDisclosureEvidence?.[field], true);
      assert.deepEqual(selection.modelDisclosureEvidence.mismatches, []);
    }
    const ids = benchmarksFor(selection.selectionId), weights = weightsFor(selection.selectionId);
    assert.deepEqual(selection.activeBenchmarkIds, ids);
    assert.deepEqual(selection.benchmarkWeights, weights);
    assert.equal(typeof selection.provisional, 'boolean');
    assert.deepEqual(selection.mismatches, []);
    const rankedSettings = available ? selection.rankedSettings : selection.completeSettings;
    const visibleSettings = rankedSettings + (available ? selection.partialSettings : 0);
    assert.equal(selection.rowEvidence.length, visibleSettings);
    assert.equal(new Set(selection.rowEvidence.map(row => row.settingId)).size, visibleSettings);
    if (available) {
      assert.equal(selection.partialSettings, selection.rowEvidence.filter(row => row.partial).length);
      assert.equal(selection.completeSettings, rankedSettings);
      assert.equal(selection.partialFootnote, isCleanLedgerPresentation(category.presentationVariant) ? '* Incomplete results are shown separately, without a rank.' : '* Unranked mean of available scores, not a comparable aggregate. Missing tests are not zero. Only models with every selected test receive a rank.');
      assert.deepEqual(selection.headerEvidence.map(item => item.condition), ['skill']);
      for (const header of selection.headerEvidence) {
        const rankKey = header.condition === 'baseline' ? 'baselineRank' : 'skillRank';
        const leaders = selection.rowEvidence.filter(row => row[rankKey] === 1);
        const displayed = leaders.find(row => `${row.settingId}-${header.condition}` === header.entryId);
        assert.ok(displayed);
        assert.equal(header.partial, leaders.some(row => row.partial));
        assert.equal(header.asteriskRendered, displayed.partial);
      }
    }
    for (const row of selection.rowEvidence) {
      if (available) {
        assert.equal(typeof row.partial, 'boolean');
        assert.equal(row.asteriskRendered, row.partial);
        if (row.partial) assert.match(row.ariaLabel, /asterisk|\*/i, 'Partial aggregate must disclose its asterisk accessibly.');
      }
      for (const field of ['exactBaseline', 'exactSkill']) assert.ok(Number.isFinite(row[field]) && row[field] >= 0 && row[field] <= 100);
      close(row.exactDelta, row.exactSkill - row.exactBaseline);
      close(row.baselinePosition, receiptScorePosition(row.exactBaseline, allWriting));
      close(row.skillPosition, receiptScorePosition(row.exactSkill, allWriting));
      assert.equal(row.baselineRank, row.partial ? null : 1 + selection.rowEvidence.filter(other => !other.partial && other.exactBaseline > row.exactBaseline).length);
      assert.equal(row.skillRank, row.partial ? null : 1 + selection.rowEvidence.filter(other => !other.partial && other.exactSkill > row.exactSkill).length);
      assert.ok(typeof row.ariaLabel === 'string' && row.ariaLabel.includes(row.baselinePosition.toFixed(1)) && row.ariaLabel.includes(row.skillPosition.toFixed(1)));
    }
    const selectedModels = [...new Set(selection.componentEvidence.map(item => item.settingId))];
    if (rankedSettings) assert.ok(selectedModels.length);
    for (const settingId of selectedModels) {
      const row = selection.rowEvidence.find(item => item.settingId === settingId);
      assert.ok(row);
      const components = selection.componentEvidence.filter(item => item.settingId === settingId);
      if (available) {
        assert.ok(components.length > 0 && components.length <= ids.length);
        assert.equal(new Set(components.map(item => item.benchmarkId)).size, components.length);
        assert.ok(components.every(component => ids.includes(component.benchmarkId)));
        assert.equal(row.partial, components.length < ids.length);
      } else assert.deepEqual(components.map(item => item.benchmarkId).sort(), [...ids].sort());
      const availableWeight = components.reduce((sum, component) => sum + weights[component.benchmarkId], 0);
      for (const component of components) {
        close(component.weight, weights[component.benchmarkId] / availableWeight);
        for (const field of ['exactBaseline', 'exactSkill']) assert.ok(Number.isFinite(component[field]) && component[field] >= 0 && component[field] <= 100);
      }
      close(row.exactBaseline, components.reduce((sum, item) => sum + item.exactBaseline * item.weight, 0));
      close(row.exactSkill, components.reduce((sum, item) => sum + item.exactSkill * item.weight, 0));
      if (available) {
        const formula = selection.aggregateEvidence.find(item => item.settingId === settingId);
        assert.ok(formula);
        close(formula.exactBaseline, row.exactBaseline);
        close(formula.exactSkill, row.exactSkill);
        const equal = components.every(component => Math.abs(component.weight - 1 / components.length) < 1e-8);
        assert.equal(formula.divisor, equal ? components.length : null);
        if (allWriting) {
          assert.equal(formula.method, equal ? 'arithmetic-mean' : 'weighted-sum');
          assert.equal(formula.sourceCount, components.length);
          assert.deepEqual(formula.componentWeights, Object.fromEntries(components.map(component => [component.benchmarkId, component.weight])));
          assert.equal(formula.formulas.length, 2);
          for (const text of formula.formulas) {
            assert.equal(typeof text, 'string');
            if (!equal) {
              assert.ok(text.includes('×') && !text.includes('÷') && !text.includes('%'));
              const coefficients = [...text.matchAll(/×\s*(\d+(?:\.\d+)?)(?:\/(\d+))?/g)].map(match => Number(match[1]) / Number(match[2] || 1));
              assert.equal(coefficients.length, components.length);
              coefficients.forEach((weight, position) => close(weight, components[position].weight));
            }
          }
        }
        assert.equal(formula.partial, row.partial);
        assert.equal(formula.asteriskRendered, row.partial);
      }
    }
  }
  const aggregate = category.selectionEvidence.find(item => item.selectionId === index.selectionId);
  const benchmarkSelection = id => category.selectionEvidence.find(item => item.selectionId === (id === 'dungeon-master-adventure-outline' ? 'dungeon-master' : id));
  assert.equal(aggregate.provisional, index.activeBenchmarkIds.some(id => benchmarkSelection(id).provisional));
  assert.equal(aggregate.provisional, index.provisional);
  assert.equal(aggregate.completeSettings, index.completeSettings);
  if (available) {
    assert.equal(aggregate.rankedSettings, index.rankedSettings);
    assert.equal(aggregate.partialSettings, index.partialSettings);
    const sidebarLeaders = aggregate.rowEvidence.filter(row => row.skillRank === 1);
    for (const selection of category.selectionEvidence) {
      assert.equal(selection.sidebarPartial, sidebarLeaders.some(row => row.partial));
      assert.equal(selection.sidebarPartial, selection.sidebarAsteriskRendered);
      if (allWriting) {
        assert.equal(selection.sidebarScore, sidebarLeaders.length ? sidebarLeaders[0].skillPosition.toFixed(1) : 'Results');
        if (sidebarLeaders.length) assert.match(selection.sidebarLabel, /All Writing/);
      }
    }
    // Every aggregate row must reconcile to the independently observed single-
    // benchmark rows, not merely to the currently selected model's detail view.
    for (const aggregateId of allWriting ? ['all-writing', 'storytelling'] : ['storytelling']) {
      const selected = category.selectionEvidence.find(item => item.selectionId === aggregateId);
      const ids = benchmarksFor(aggregateId), weights = weightsFor(aggregateId);
      const tests = ids.map(id => ({ id, selection: benchmarkSelection(id) }));
      assert.equal(selected.provisional, tests.some(item => item.selection.provisional));
      const union = [...new Set(tests.flatMap(item => item.selection.rowEvidence.map(row => row.settingId)))].sort();
      assert.deepEqual(selected.rowEvidence.map(row => row.settingId).sort(), union);
      for (const row of selected.rowEvidence) {
        const sources = tests.flatMap(item => item.selection.rowEvidence.filter(source => source.settingId === row.settingId).map(source => ({ ...source, weight: weights[item.id] })));
        const availableWeight = sources.reduce((sum, source) => sum + source.weight, 0);
        for (const field of ['exactBaseline', 'exactSkill']) close(row[field], sources.reduce((sum, source) => sum + source[field] * source.weight, 0) / availableWeight);
        assert.equal(row.partial, sources.length < ids.length);
      }
    }
  }
  if (allWriting) assertAllWritingSharedViews(category, aggregate, benchmarkSelection, close, scope);
  assert.deepEqual(presentation.dumbbellRows, aggregate.rowEvidence);
  assert.deepEqual([...presentation.numericPairedSettingIds].sort(), aggregate.rowEvidence.map(item => item.settingId).sort());
  assert.deepEqual([...category.visibleSettingIds].sort(), [...presentation.numericPairedSettingIds].sort());
}

function assertAllWritingSharedViews(category, aggregate, benchmarkSelection, close, scope = null) {
  if (isCleanLedgerPresentation(category.presentationVariant)) return assertCleanLedgerViews(category, aggregate, close, scope);
  assert.equal(category.sharedScoreSelector, true);
  assert.equal(category.selectorInsideLeaderboard, false);
  assert.deepEqual(category.selectorOptions, allWritingFields);
  const leader = aggregate.rowEvidence.find(row => row.skillRank === 1);
  const sidebarScore = leader ? leader.skillPosition.toFixed(1) : 'Results';
  const roster = category.settingIds;
  assert.ok(Array.isArray(roster) && new Set(roster).size === roster.length);
  assert.ok(aggregate.rowEvidence.every(row => roster.includes(row.settingId)));
  const control = evidence => {
    assert.ok(['models', 'benchmarks', 'efficiency'].includes(evidence.mode));
    assert.ok(allWritingFields.includes(evidence.selectionId));
    assert.equal(evidence.hash, '#capabilities/writing' + (evidence.mode === 'models' ? '' : '/' + evidence.mode));
    assert.equal(evidence.visible, true);
    assert.equal(evidence.sidebarScore, sidebarScore);
    assert.ok(evidence.selectedSettingId === null || roster.includes(evidence.selectedSettingId));
    assert.deepEqual(evidence.mismatches, []);
  };
  assert.ok(Array.isArray(category.sharedSelectorEvidence));
  for (const evidence of category.sharedSelectorEvidence) control(evidence);
  for (const mode of ['models', 'benchmarks', 'efficiency']) assert.ok(category.sharedSelectorEvidence.some(item => item.mode === mode && item.selectionId === 'all-writing'));
  assert.deepEqual(category.historyEvidence.map(item => item.direction), ['back', 'forward']);
  assert.deepEqual(category.historyEvidence.map(item => item.selectionId), ['all-writing', focusedBenchmarkId]);
  for (const evidence of category.historyEvidence) { control(evidence); assert.equal(evidence.mode, 'benchmarks'); }
  const overviews = category.benchmarkOverviewEvidence, changed = roster.length > 1;
  assert.deepEqual(overviews.map(item => item.selectionId), changed ? ['all-writing', 'all-writing', focusedBenchmarkId, 'all-writing'] : ['all-writing', focusedBenchmarkId, 'all-writing']);
  for (const overview of overviews) {
    assert.deepEqual([...overview.selectedSettingIds].sort(), [...roster].sort());
    assert.ok(roster.includes(overview.selectedSettingId));
    const ids = selectionBenchmarks(overview.selectionId), weights = selectionWeights(overview.selectionId);
    const sources = ids.flatMap(id => benchmarkSelection(id).rowEvidence.filter(row => row.settingId === overview.selectedSettingId).map(row => ({ ...row, benchmarkId: id })));
    const totalWeight = sources.reduce((sum, source) => sum + weights[source.benchmarkId], 0);
    for (const field of ['exactBaseline', 'exactSkill']) {
      if (sources.length) close(overview[field], sources.reduce((sum, source) => sum + source[field] * weights[source.benchmarkId], 0) / totalWeight);
      else assert.equal(overview[field], null);
    }
    assert.deepEqual(overview.components.map(item => item.benchmarkId).sort(), sources.map(item => item.benchmarkId).sort());
    for (const component of overview.components) {
      const source = sources.find(item => item.benchmarkId === component.benchmarkId);
      for (const field of ['exactBaseline', 'exactSkill']) close(component[field], source[field]);
      close(component.weight, weights[source.benchmarkId] / totalWeight);
    }
    assert.deepEqual(overview.fieldMeans.map(item => item.benchmarkId).sort(), [...sharedBenchmarks].sort());
    for (const field of overview.fieldMeans) {
      const selectionId = field.benchmarkId === 'dungeon-master-adventure-outline' ? 'dungeon-master' : field.benchmarkId;
      assert.equal(field.selectionId, selectionId);
      assert.equal(typeof field.provisional, 'boolean');
      for (const [value, rendered] of [[field.baseline, field.renderedBaseline], [field.skill, field.renderedSkill]]) {
        assert.ok(value === null || Number.isFinite(value) && value >= 0 && value <= 100);
        assert.equal(rendered, value === null ? '' : value.toFixed(1));
      }
      const link = new URL(field.compareHref);
      assert.equal(link.searchParams.get('score'), selectionId);
      assert.equal(link.searchParams.get('setting'), overview.selectedSettingId);
      assert.equal(link.hash, '#capabilities/writing');
      const original = overviews[0].fieldMeans.find(item => item.benchmarkId === field.benchmarkId);
      for (const key of ['baseline', 'skill', 'provisional']) assert.equal(field[key], original[key], 'All-model field means must not follow selected-model changes');
    }
    assert.deepEqual(overview.mismatches, []);
  }
  const retained = overviews[changed ? 1 : 0].selectedSettingId;
  if (changed) assert.notEqual(retained, overviews[0].selectedSettingId);
  for (const overview of overviews.slice(changed ? 1 : 0)) assert.equal(overview.selectedSettingId, retained);
  for (const history of category.historyEvidence) assert.equal(history.selectedSettingId, retained);
  assert.ok(category.sharedSelectorEvidence.some(item => item.mode === 'models' && item.selectionId === 'storytelling-plot-twists' && item.selectedSettingId === retained));
}

function assertCleanLedgerViews(category, aggregate, close, scope = null) {
  const fields = scope?.fields || allWritingFields;
  const comparisonId = scope?.comparisonId || 'storytelling-plot-twists';
  assert.equal(category.sharedScoreSelector, true);
  assert.equal(category.selectorInsideLeaderboard, false);
  assert.deepEqual(category.selectorOptions, fields);
  const leader = aggregate.rowEvidence.find(row => row.skillRank === 1), sidebarScore = leader ? leader.skillPosition.toFixed(1) : 'Results';
  const roster = category.settingIds;
  assert.ok(Array.isArray(roster) && new Set(roster).size === roster.length);
  assert.ok(aggregate.rowEvidence.every(row => roster.includes(row.settingId)));
  const control = evidence => {
    assert.ok(['models', 'efficiency'].includes(evidence.mode));
    assert.ok(fields.includes(evidence.selectionId));
    assert.equal(evidence.hash, '#capabilities/writing' + (evidence.mode === 'models' ? '' : '/efficiency'));
    assert.equal(evidence.visible, true);
    assert.equal(evidence.sidebarScore, sidebarScore);
    assert.ok(evidence.selectedSettingId === null || roster.includes(evidence.selectedSettingId));
    assert.deepEqual(evidence.mismatches, []);
  };
  assert.ok(Array.isArray(category.sharedSelectorEvidence));
  for (const evidence of category.sharedSelectorEvidence) control(evidence);
  for (const mode of ['models', 'efficiency']) assert.ok(category.sharedSelectorEvidence.some(item => item.mode === mode && item.selectionId === 'all-writing'));
  assert.deepEqual(category.historyEvidence.map(item => item.direction), ['back', 'forward']);
  assert.deepEqual(category.historyEvidence.map(item => item.selectionId), ['all-writing', focusedBenchmarkId]);
  for (const evidence of category.historyEvidence) { control(evidence); assert.equal(evidence.mode, 'models'); }
  for (const [field, flags] of [['leaderboardCleanEvidence', ['noProvisionalBanner', 'noVerboseCounts', 'methodologyAvailable']], ['modelDisclosureEvidence', ['defaultClosed', 'opensForAudit', 'closesAfterAudit']]]) {
    for (const flag of flags) assert.equal(category[field]?.[flag], true);
    assert.deepEqual(category[field].mismatches, []);
  }
  assert.ok(!category.benchmarkOverviewEvidence?.length);
  const ledgers = category.cleanLedgerEvidence, changed = roster.length > 1;
  assert.deepEqual(ledgers.map(item => item.selectionId), changed ? ['all-writing', 'all-writing', focusedBenchmarkId, comparisonId] : ['all-writing', focusedBenchmarkId, comparisonId]);
  for (const ledger of ledgers) {
    assert.ok(roster.includes(ledger.selectedSettingId));
    for (const flag of ['noModelSelector', 'noBreakdown', 'noFormula', 'noScoreSelector', 'noInlineProvisional', 'noExplanationEssay', 'noPartialFootnote', 'noVisibleNoise']) assert.equal(ledger[flag], true);
    assert.deepEqual(ledger.groups, scope?.groups || [{ trackId: 'storytelling', benchmarkIds: storyBenchmarks }, { trackId: 'dungeon-master', benchmarkIds: ['dungeon-master-adventure-outline'] }]);
    assert.deepEqual(ledger.rows.map(row => row.benchmarkId), scope?.benchmarkIds || allWritingBenchmarks);
    for (const row of ledger.rows) {
      if ([leadersLedgerPresentation, overallPresentation].includes(category.presentationVariant)) {
        const selected = category.selectionEvidence.find(item => item.selectionId === (row.benchmarkId === 'dungeon-master-adventure-outline' ? 'dungeon-master' : row.benchmarkId));
        for (const candidate of selected.rowEvidence) {
          const original = aggregate.rowEvidence.find(item => item.settingId === candidate.settingId);
          assert.ok(typeof candidate.configurationId === 'string' && candidate.configurationId.length && typeof candidate.label === 'string' && candidate.label.length);
          assert.equal(candidate.configurationId, original.configurationId);
          assert.equal(candidate.label, original.label);
        }
        assert.equal(new Set(selected.rowEvidence.map(item => item.configurationId)).size, selected.rowEvidence.length);
        const eligible = selected.rowEvidence.filter(item => !item.partial);
        const high = Math.max(...eligible.map(item => item.exactSkill));
        const ties = eligible.filter(item => item.exactSkill === high).sort((a, b) => a.configurationId < b.configurationId ? -1 : a.configurationId > b.configurationId ? 1 : 0);
        if (!ties.length) assert.equal(row.topModel, null);
        else {
          const top = row.topModel, winner = ties[0];
          assert.ok(top);
          for (const field of ['settingId', 'configurationId', 'label']) assert.equal(top[field], winner[field]);
          for (const field of ['exactBaseline', 'exactSkill']) close(top[field], winner[field]);
          close(top.exactDelta, winner.exactSkill - winner.exactBaseline);
          assert.equal(top.tiedCount, ties.length);
          assert.equal(top.renderedBaseline, receiptScorePosition(winner.exactBaseline, true).toFixed(1));
          assert.equal(top.renderedSkill, receiptScorePosition(winner.exactSkill, true).toFixed(1));
          const delta = receiptScorePosition(winner.exactSkill - winner.exactBaseline, true);
          assert.equal(top.renderedDelta, delta > 0 ? '+' + delta.toFixed(1) : delta < 0 ? '−' + Math.abs(delta).toFixed(1) : '±0.0');
          assert.equal(top.visible, true);
          for (const field of ['withinRow', 'withinComparison', 'withinViewport', 'fieldsWithinBlock', 'fieldsNonOverlapping', 'noTextOverflow']) assert.equal(top.geometry?.[field], true);
          assert.ok(Number.isFinite(top.geometry.viewportWidth) && top.geometry.viewportWidth > 0);
          const rectangles = [top.geometry.row, top.geometry.comparison, top.geometry.block, ...top.geometry.fields.map(field => field.rect)];
          for (const rect of rectangles) {
            assert.ok(rect && ['left', 'right', 'top', 'bottom', 'width', 'height'].every(field => Number.isFinite(rect[field])) && rect.width > 0 && rect.height > 0);
            close(rect.right - rect.left, rect.width); close(rect.bottom - rect.top, rect.height);
          }
          const contains = (outer, inner) => inner.left >= outer.left - 1 && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
          assert.ok(contains(top.geometry.row, top.geometry.block) && contains(top.geometry.comparison, top.geometry.block));
          assert.ok(top.geometry.block.left >= -1 && top.geometry.block.right <= top.geometry.viewportWidth + 1);
          assert.deepEqual(top.geometry.fields.map(field => field.name).sort(), ['baseline', 'delta', 'label', 'skill']);
          for (const field of top.geometry.fields) assert.ok(contains(top.geometry.block, field.rect));
          for (let i = 0; i < top.geometry.fields.length; i++) for (let j = i + 1; j < top.geometry.fields.length; j++) {
            const left = top.geometry.fields[i].rect, right = top.geometry.fields[j].rect;
            assert.ok(Math.min(left.right, right.right) - Math.max(left.left, right.left) <= 1 || Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) <= 1);
          }
          assert.deepEqual(top.mismatches, []);
        }
      }
      assert.equal(row.trackId, row.benchmarkId === 'dungeon-master-adventure-outline' ? 'dungeon-master' : 'storytelling');
      assert.equal(typeof row.provisional, 'boolean');
      assert.ok(['provisional-single-judge', 'official-panel', 'answers'].includes(row.sourceKind));
      assert.equal(row.provisional, row.sourceKind === 'provisional-single-judge');
      assert.match(row.sourceSha256, /^[a-f0-9]{64}$/);
      for (const [field, rendered] of [['baseline', 'renderedBaseline'], ['skill', 'renderedSkill'], ['delta', 'renderedDelta']]) {
        const value = row[field];
        assert.ok(value === null || Number.isFinite(value) && value >= (field === 'delta' ? -100 : 0) && value <= 100);
        assert.equal(row[rendered], value === null ? '' : scope && field === 'delta'
          ? value > 0 ? '+' + value.toFixed(1) : value < 0 ? '−' + Math.abs(value).toFixed(1) : '±0.0'
          : (field === 'delta' && value > 0 ? '+' : '') + value.toFixed(1));
      }
      for (const field of ['settingCount', 'caseCount', 'trialCount', 'judgeCount']) assert.ok(Number.isInteger(row.metadata?.[field]) && row.metadata[field] >= 0);
      const original = ledgers[0].rows.find(item => item.benchmarkId === row.benchmarkId);
      for (const field of ['baseline', 'skill', 'delta', 'provisional', 'sourceKind', 'sourceSha256', 'metadata']) assert.deepEqual(row[field], original[field], 'Field means and original metadata cannot follow model/scope changes');
      const compare = new URL(row.compareHref), report = new URL(row.reportHref);
      assert.equal(compare.searchParams.get('score'), row.benchmarkId === 'dungeon-master-adventure-outline' ? 'dungeon-master' : row.benchmarkId);
      assert.equal(compare.searchParams.get('setting'), ledger.selectedSettingId);
      assert.equal(compare.hash, '#capabilities/writing');
      assert.ok(report.pathname.endsWith('/benchmark-report.html'));
      assert.equal(report.hash.split('/')[0], '#' + row.benchmarkId);
    }
    assert.deepEqual(ledger.mismatches, []);
  }
  const retained = ledgers[changed ? 1 : 0].selectedSettingId;
  if (changed) assert.notEqual(retained, ledgers[0].selectedSettingId);
  for (const ledger of ledgers.slice(changed ? 1 : 0)) assert.equal(ledger.selectedSettingId, retained);
  for (const history of category.historyEvidence) assert.equal(history.selectedSettingId, retained);
  assert.ok(category.sharedSelectorEvidence.some(item => item.mode === 'models' && item.selectionId === comparisonId && item.selectedSettingId === retained));
}

// Portable receipts cross-check the observed Overall cells against the observed
// complete All Writing rows. The exact-lock path additionally reconstructs all
// categories and resources from byte-pinned original public source modules.
function assertOverallIntegrationReceipt(proof, canonical, index) {
  const close = (actual, expected) => assert.ok(Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) < 1e-8, `Overall receipt arithmetic: ${actual} !== ${expected}`);
  const category = proof.categoryEvidence, evidence = category.overallIntegrationEvidence;
  assert.equal(category.presentationVariant, overallPresentation);
  assert.equal(typeof category.overall, 'string');
  assert.equal(sha256(category.overall), canonical.preservation.overall);
  assert.equal(proof.overallSha256, canonical.preservation.overall);
  const overall = JSON.parse(category.overall);
  assert.equal(overall.scoreBasis.edition, 'overall-v3');
  assert.equal(evidence?.edition, 'overall-v3');
  assert.equal(evidence.sourceOverallSha256, canonical.preservation.overall);
  const categoryWeights = { engineering: 0.5, writing: 0.25, 'ai-workflows': 0.25 };
  assert.deepEqual(evidence.categoryWeights, categoryWeights);
  assert.deepEqual(evidence.includedCategoryIds, Object.keys(categoryWeights));
  assert.deepEqual(overall.categories.map(item => item.id), Object.keys(categoryWeights));
  for (const component of overall.categories) close(component.weight, categoryWeights[component.id]);
  assert.deepEqual(evidence.writingBenchmarkWeights, index.benchmarkWeights);
  assert.equal(evidence.writingSelectionId, 'all-writing');
  for (const field of ['gamesExcluded', 'sourceScoreVerified', 'lazyBeforeWriting', 'answersLazy']) assert.equal(evidence[field], true);
  assert.deepEqual(evidence.mismatches, []);
  const games = overall.portfolioCategories.find(item => item.id === 'games');
  assert.equal(games?.weight, 0); assert.equal(games.status, 'coming-soon');
  assert.deepEqual(games.benchmarkIds, []);
  assert.equal(overall.scoreBasis.taskCount, overall.scoreBasis.benchmarkIds.length);
  const leafWeights = overall.scoreBasis.benchmarkWeights;
  assert.equal(new Set(leafWeights.map(item => item.benchmarkId)).size, leafWeights.length);
  assert.deepEqual(leafWeights.map(item => item.benchmarkId), overall.scoreBasis.benchmarkIds);
  assert.deepEqual(leafWeights.filter(item => item.familyId === 'writing').map(item => item.benchmarkId), index.benchmarkIds);
  for (const task of leafWeights.filter(item => item.familyId === 'writing')) close(task.weight, index.benchmarkWeights[task.benchmarkId] * 0.25);
  const selected = category.selectionEvidence.find(item => item.selectionId === 'all-writing');
  const writingRowFor = entry => {
    const direct = selected.rowEvidence.find(item => item.configurationId === entry.configurationId);
    if (direct) return direct;
    // Only the registered Opus selector alias is supported. Its exact original
    // identity must survive on every byte-pinned Writing task/condition cell.
    const effort = /^claude:opus@(low|medium|high|xhigh|max)$/.exec(entry.configurationId)?.[1];
    assert.ok(effort && entry.provider === 'claude' && entry.modelId === 'claude:opus' && entry.reasoning === effort,
      'Overall cannot substitute an unregistered Writing identity');
    const sourceConfigurationId = `claude:claude-opus-5@${effort}`;
    const sourceRows = selected.rowEvidence.filter(item => item.configurationId === sourceConfigurationId);
    assert.equal(sourceRows.length, 1, 'Overall alias requires exactly one original Writing row');
    const row = sourceRows[0];
    const cells = overall.benchmarkResults.filter(cell => cell.configurationId === entry.configurationId && cell.category === 'writing');
    assert.deepEqual(cells.map(cell => `${cell.benchmarkId}|${cell.condition}`).sort(),
      index.benchmarkIds.flatMap(id => ['baseline', 'skill'].map(condition => `${id}|${condition}`)).sort(),
      'Overall alias requires every original Writing task in both conditions');
    for (const cell of cells) {
      assert.equal(cell.provider, 'claude'); assert.equal(cell.modelId, 'claude:opus'); assert.equal(cell.reasoning, effort);
      assert.equal(cell.sourceConfigurationId, sourceConfigurationId); assert.equal(cell.sourceModelId, 'claude:claude-opus-5');
      assert.equal(cell.sourceSettingId, row.settingId);
      assert.equal(cell.complete, true); assert.equal(cell.eligibleForRank, true); assert.equal(cell.partial, false);
    }
    return row;
  };
  const entryIds = new Set();
  for (const entry of overall.entries) {
    assert.ok(!entryIds.has(entry.id)); entryIds.add(entry.id);
    assert.ok(['baseline', 'skill'].includes(entry.condition));
    const writingRow = writingRowFor(entry);
    assert.ok(writingRow && !writingRow.partial, 'Overall cannot rank a partial All Writing model');
    assert.deepEqual(entry.categories.map(item => item.category), Object.keys(categoryWeights));
    for (const component of entry.categories) {
      close(component.weight, categoryWeights[component.category]);
      close(component.exactContribution, component.exactScore * component.weight);
      if (component.category === 'writing') close(component.exactScore, writingRow[entry.condition === 'skill' ? 'exactSkill' : 'exactBaseline']);
    }
    close(entry.exactScore, entry.categories.reduce((sum, item) => sum + item.exactContribution, 0));
    assert.equal(entry.rank, 1 + overall.entries.filter(other => other.condition === entry.condition && other.exactScore > entry.exactScore).length);
    assert.ok(overall.entries.some(other => other.configurationId === entry.configurationId && other.condition !== entry.condition));
  }
  assert.equal(overall.entries.length, overall.coverage.eligibleSettings * 2);
  const navigation = evidence.writingSegmentNavigation, clicked = navigation?.clicked, destination = navigation?.destination;
  const entry = overall.entries.find(item => item.id === clicked?.entryId && item.condition === 'skill');
  assert.ok(entry);
  for (const field of ['settingId', 'configurationId']) assert.equal(clicked[field], entry[field]);
  assert.equal(clicked.staleSelection, 'storytelling');
  const component = entry.categories.find(item => item.category === 'writing');
  close(clicked.exactScore, component.exactScore); close(clicked.weight, component.weight);
  assert.equal(destination.selectionId, 'all-writing'); assert.equal(destination.hash, '#capabilities/writing');
  const row = writingRowFor(entry);
  assert.equal(destination.configurationId, row.configurationId);
  assert.equal(destination.settingId, row.settingId); close(destination.exactScore, row.exactSkill);
  assert.deepEqual(navigation.mismatches, []);
}

function assertSharedFrameInventory(manifest, candidate, canonical, writing, games) {
  const verification = manifest.acceptance.verification;
  const published = verification.publicRelease !== undefined;
  const versioned = verification.categoryIndex?.method === versionedMethod;
  const compact = versioned && !published;
  const paired = published && verification.categoryIndex?.writingScoreBasis?.id === PAIRED_WRITING_SCORE_BASIS.id;
  if (published) {
    assert.deepEqual(verification.publicRelease, publishedWritingRelease);
    assert.equal(versioned, true, 'The public release must retain its established score basis.');
    assert.equal(verification.categoryIndex.presentationVariant, overallPresentation);
    assert.equal(verification.compactSourceSelection, undefined, 'Private experiments cannot enter a public release receipt.');
    assert.equal(verification.compactEvidenceHarness, undefined);
  }
  const benchmarkIds = published ? storyBenchmarks : compact ? compactSharedBenchmarks : sharedBenchmarks;
  assert.deepEqual(manifest.acceptance.scope, { kind: 'shared-writing-category-frame', schemaVersion: 1, benchmarkIds, viewports: focusedViewports });
  assert.match(verification.releaseId, /^[a-f0-9]{64}$/);
  assert.equal(candidate.releaseId, verification.releaseId);
  const legacyRoot = `reviews/writing-category/${verification.releaseId}`;
  const root = verification.freshCaptureRoot;
  if (root !== legacyRoot) {
    assert.equal(canonical.source?.path, 'site/vasirbenchmark.com/capture.mjs');
    assert.match(canonical.source?.sha256 ?? '', /^[a-f0-9]{64}$/);
    assert.equal(canonical.source.initialSha256, canonical.source.sha256);
    assert.equal(manifest.files?.find(file => file.path === 'capture.mjs')?.sha256, canonical.source.sha256);
    assert.equal(root, `${legacyRoot}/qa-${canonical.source.sha256}`);
  }
  assert.equal(verification.candidate.path, `${root}/candidate.json`);
  assert.equal(verification.canonicalRun.path, `${root}/canonical/canonical-receipt.json`);
  assert.equal(verification.previousAcceptance.path, `${root}/previous-template-lock.json`);
  assert.deepEqual(verification.sourceSelections.map(item => item.benchmarkId).sort(), [...sharedBenchmarks].sort());
  if (compact) {
    assert.equal(root, `${legacyRoot}/qa-${canonical.source.sha256}`);
    const source = verification.compactSourceSelection;
    assert.equal(source?.kind, 'vasirbenchmark-compact-writing-source-verification');
    assert.deepEqual(source.benchmarkIds, compactBenchmarkIds);
    assert.equal(source.selection?.path, 'benchmarks/writing-compact-v1/publication.json');
    for (const pin of [source.selection, source.snapshot]) { assert.match(pin.sha256, /^[a-f0-9]{64}$/); assert.ok(pin.bytes > 0); }
    assert.equal(source.snapshot.path, `.agents/vasir-evals/writing-compact-v1/publication-snapshots/${source.snapshot.sha256}/snapshot.json`);
    assert.match(source.manifestSha256, /^[a-f0-9]{64}$/);
    for (const field of ['amendmentSha256', 'judgeValidationSha256', 'healthyContinuationSha256']) if (source[field] != null) assert.match(source[field], /^[a-f0-9]{64}$/);
    assert.equal(verification.compactEvidenceHarness?.path, `${root}/${compactHarness}`);
    const helper = manifest.files.find(file => file.path === compactHarness);
    assert.ok(helper);
    for (const key of ['bytes', 'sha256']) assert.equal(helper[key], verification.compactEvidenceHarness[key]);
  } else assert.equal(verification.compactSourceSelection, undefined, 'Compact selections require the explicit versioned method.');
  assert.equal(canonical.kind, 'vasirbenchmark-canonical-candidate-review');
  assert.equal(canonical.status, 'passed');
  assert.equal(canonical.releaseId, verification.releaseId);
  assert.equal(verification.localBrowserChecks, 32);
  assert.equal(canonical.results.length, 32);
  assert.equal(new Set(canonical.results.map(result => result.filename)).size, 32);
  assert.deepEqual(verification.preservedProjectionFields, canonical.preservation);
  const captures = [];
  for (const task of sharedCanonicalTasks) {
    const result = canonical.results.find(item => item.filename === task.filename);
    assert.ok(result, `missing canonical task: ${task.filename}`);
    assert.equal(result.code, 0);
    for (const key of ['target', 'viewport', 'width', 'height']) assert.equal(result[key], task[key]);
    captures.push({ path: `${root}/canonical/${task.filename}`, bytes: result.bytes, sha256: result.sha256, width: task.width, height: task.height });
  }
  const index = verification.categoryIndex;
  if (index.presentationVariant === overallPresentation) {
    const validation = canonical.overallSourceValidation;
    assert.deepEqual(verification.overallSourceValidation, validation);
    assert.equal(validation?.kind, 'independent-overall-v3-original-source-oracle');
    assert.equal(validation.edition, 'overall-v3');
    assert.equal(validation.overallSha256, canonical.preservation.overall);
    assert.equal(validation.oracle?.path, 'docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs');
    assert.equal(validation.oracle.initialSha256, verification.acceptanceEvidence.sha256);
    assert.equal(validation.oracle.sha256, verification.acceptanceEvidence.sha256);
    assert.equal(validation.controller?.path, 'docs/work/vasir-benchmarking/storytelling-plot-twists/capture-candidate.mjs');
    assert.equal(verification.canonicalController?.path, `${root}/capture-candidate.mjs`);
    assert.equal(validation.controller.initialSha256, verification.canonicalController.sha256);
    assert.equal(validation.controller.sha256, verification.canonicalController.sha256);
    assert.match(verification.canonicalController.sha256, /^[a-f0-9]{64}$/);
    const writingSource = candidate.siteFiles.find(file => file.path === 'writing-data.js');
    assert.ok(writingSource);
    assert.deepEqual(validation.writingSource, { path: writingSource.path, bytes: writingSource.bytes, sha256: writingSource.sha256 });
    for (const proof of writing) assertOverallIntegrationReceipt(proof, canonical, versioned ? { ...index, benchmarkIds: index.activeBenchmarkIds } : index);
  }
  assert.ok(index.presentationVariant === undefined || isCleanLedgerPresentation(index.presentationVariant));
  if (isCleanLedgerPresentation(index.presentationVariant)) assert.equal(index.selectionId, 'all-writing');
  assert.ok([sharedMethod, selectedMethod, availableMethod, versionedMethod].includes(index.method));
  assert.deepEqual([...index.benchmarkIds].sort(), [...benchmarkIds].sort());
  if (versioned) {
    assert.deepEqual(index.writingScoreBasis, paired ? PAIRED_WRITING_SCORE_BASIS : WRITING_ESTABLISHED_SCORE_BASIS);
    assert.equal(index.selectionId, 'all-writing');
    assert.equal(index.weighting, 'equal-fixed-benchmarks-for-ranked-settings');
    assert.deepEqual(index.activeBenchmarkIds, WRITING_ESTABLISHED_SCORE_BASIS.benchmarkIds);
    assert.deepEqual(index.benchmarkWeights, Object.fromEntries(WRITING_ESTABLISHED_SCORE_BASIS.benchmarkIds.map(id => [id, 1 / 3])));
    assert.deepEqual(index.groupIds, ['storytelling']);
    assert.deepEqual(index.groupWeights, published ? { storytelling: 1 } : { storytelling: 1, 'dungeon-master': 0, worldbuilding: 0 });
    assert.deepEqual(index.selectionIds, published ? publishedWritingFields : compactSelections);
    assert.ok(index.rankedSettings > 0);
    assert.equal(index.completeSettings, index.rankedSettings);
    assert.ok(index.partialSettings >= 0);
    assert.equal(typeof index.provisional, 'boolean');
    assert.equal(verification.acceptanceEvidence.path, `${root}/acceptance-evidence.mjs`);
    assert.match(verification.acceptanceEvidence.sha256, /^[a-f0-9]{64}$/);
  } else if (isSelectedMethod(index.method)) {
    assert.ok(['storytelling', 'all-writing'].includes(index.selectionId));
    const allWriting = index.selectionId === 'all-writing';
    if (allWriting) {
      assert.equal(index.method, availableMethod);
      assert.equal(index.weighting, 'equal-tracks-equal-benchmarks');
      assert.deepEqual(index.benchmarkIds, allWritingBenchmarks);
      assert.deepEqual(index.groupIds, ['storytelling', 'dungeon-master']);
      assert.deepEqual(index.groupWeights, { storytelling: 1 / 2, 'dungeon-master': 1 / 2 });
    }
    assert.deepEqual(index.selectionIds, allWriting ? allWritingFields : selectedFields);
    assert.deepEqual(index.activeBenchmarkIds, selectionBenchmarks(index.selectionId));
    assert.deepEqual(index.benchmarkWeights, selectionWeights(index.selectionId));
    assert.ok((index.method === availableMethod ? index.rankedSettings : index.completeSettings) > 0);
    if (index.method === availableMethod) {
      assert.equal(index.completeSettings, index.rankedSettings);
      assert.ok(index.partialSettings >= 0);
    }
    assert.equal(typeof index.provisional, 'boolean');
    assert.equal(verification.acceptanceEvidence.path, `${root}/acceptance-evidence.mjs`);
    assert.match(verification.acceptanceEvidence.sha256, /^[a-f0-9]{64}$/);
  } else {
  assert.equal(index.declaredRosterSelection, 'widest-finalized-official-source');
  assert.ok(index.completeSettings > 0, 'the shared frame may not hide all completed results');
  assert.ok(index.declaredConfigurationIds.length >= index.completeSettings);
  assert.ok(index.sourceCoverage.some(source => source.benchmarkId === index.declaredRosterBenchmarkId && source.executionComplete && source.completedSettingCount > 0));
  const included = index.sourceCoverage.filter(source => source.included);
  assert.deepEqual(included.map(source => source.benchmarkId).sort(), [...index.activeBenchmarkIds].sort());
  assert.ok(included.every(source => source.executionComplete && source.readyForComparison && source.matchesDeclaredRoster && source.completedSettingCount >= index.completeSettings && source.exclusionReason === null));
  assert.equal(index.sourceCoverage.length, sharedBenchmarks.length);
  assert.deepEqual(index.sourceCoverage.map(source => source.benchmarkId).sort(), [...sharedBenchmarks].sort());
  assert.ok(Math.abs(Object.values(index.benchmarkWeights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-8);
  }
  assert.equal(writing.length, benchmarkIds.length * focusedViewports.length, 'every declared Writing benchmark needs three fresh viewport proofs');
  assert.equal(verification.writingBrowserProofs.length, writing.length);
  assert.equal(new Set(writing.map(proof => `${proof.benchmarkId}/${proof.width}`)).size, writing.length);
  const names = new Map(sharedBenchmarks.map((id, i) => [id, ['core', 'twists', 'dm', 'magic'][i]]));
  for (const id of compactBenchmarkIds) names.set(id, id);
  for (const benchmarkId of benchmarkIds) for (const viewport of focusedViewports) {
    const proof = writing.find(item => item.benchmarkId === benchmarkId && item.width === viewport.width);
    const record = verification.writingBrowserProofs.find(item => item.benchmark === names.get(benchmarkId) && item.width === viewport.width);
    assert.ok(proof && record, `missing Writing proof: ${benchmarkId}/${viewport.width}`);
    assert.equal(record.path, `${root}/writing-${names.get(benchmarkId)}-${viewport.width}/writing-browsercheck.json`);
    assert.equal(proof.kind, 'vasirbenchmark-writing-browsercheck');
    assert.equal(proof.status, 'passed');
    if (versioned || isSelectedMethod(index.method)) assert.equal(proof.acceptanceEvidenceSha256, verification.acceptanceEvidence.sha256, 'Writing browser derivation pin changed');
    assert.equal(proof.height, viewport.height);
    assert.deepEqual(proof.errors, []);
    assert.ok(proof.checks.length > 0);
    assert.deepEqual(record.coverage, proof.coverage);
    assert.deepEqual(record.categoryEvidence, proof.categoryEvidence);
    const category = proof.categoryEvidence;
    assert.equal(category.presentationVariant, index.presentationVariant);
    assert.equal(category.method, index.method);
    if (index.selectionId === 'all-writing') {
      assert.equal(category.weighting, index.weighting);
      assert.deepEqual(category.groupWeights, index.groupWeights);
    }
    for (const field of versioned || isSelectedMethod(index.method) ? ['benchmarkIds', 'activeBenchmarkIds', 'groupIds', 'benchmarkWeights'] : ['benchmarkIds', 'activeBenchmarkIds', 'declaredConfigurationIds', 'sourceCoverage', 'groupIds']) assert.deepEqual(category[field], index[field]);
    for (const field of versioned || isSelectedMethod(index.method) ? ['selectionId', 'provisional', 'completeSettings', 'unscoredSettings'] : ['declaredRosterBenchmarkId', 'declaredRosterSelection', 'completeSettings', 'unscoredSettings']) assert.equal(category[field], index[field]);
    if (versioned || index.method === availableMethod) for (const field of ['rankedSettings', 'partialSettings']) assert.equal(category[field], index[field]);
    assert.deepEqual(category.mismatches, []);
    for (const field of ['rawUnchanged', 'noPicker', 'tabsImmediatelyAfterHeader', 'answersLazy', 'disclosure']) assert.equal(category[field], true);
    assert.ok(!category.partialEvidence, 'rejected partial placeholders are not accepted');
    const presentation = category.presentationEvidence;
    if (published) {
      assert.equal(proof.compactEvidenceHarnessSha256, undefined);
      assert.equal(proof.compactCaseEvidence, undefined);
      assert.equal(record.compactEvidenceHarnessSha256, undefined);
      assert.equal(record.compactCaseEvidence, undefined);
      if (paired && benchmarkId === 'storytelling-plot-twists') {
        assert.deepEqual(record.pairedTwistsEvidence, proof.pairedTwistsEvidence);
        const fresh = proof.pairedTwistsEvidence;
        assert.equal(fresh?.kind, 'vasirbenchmark-paired-twists-browser-evidence');
        assert.equal(fresh.edition, PAIRED_TWISTS_EDITION);
        assert.equal(fresh.benchmarkId, benchmarkId);
        const extension = fresh.coverageExtension, recovery = fresh.technicalRecovery;
        const declaredAppend = extension?.version === 'paired-declared-coverage-extension-v2';
        if (extension && !declaredAppend) assertPairedCoverageExtension(extension);
        const configurations = declaredAppend ? assertPairedEvidenceCohorts(fresh) : extension ? [...pairedOriginalConfigurations, ...pairedAddedConfigurations] : pairedOriginalConfigurations;
        assert.equal(fresh.answers.length, configurations.length * 2);
        assert.equal(fresh.requests.length, configurations.length * 2);
        const judges = ['codex:gpt-6-astra@xhigh', 'codex:gpt-5.6-sol@xhigh'];
        assert.deepEqual(fresh.answers.map(answer => `${answer.configurationId}|${answer.condition}`).sort(), configurations.flatMap(id => ['baseline', 'skill'].map(condition => `${id}|${condition}`)).sort());
        assert.equal(new Set(fresh.requests.map(request => request.requestId)).size, configurations.length * judges.length);
        for (const configurationId of configurations) {
          const pair = fresh.requests.filter(request => request.configurationId === configurationId);
          assert.deepEqual(pair.map(request => request.judgeConfigurationId).sort(), [...judges].sort());
          assert.deepEqual(pair.map(request => request.candidateMap.A).sort(), ['baseline', 'skill']);
        }
        const selected = verification.sourceSelections.find(selection => selection.benchmarkId === benchmarkId);
        assert.equal(selected.lineage?.kind, recovery ? 'declared-writing-technical-recovery' : extension ? 'declared-writing-coverage-extension' : 'declared-writing-source-replacement');
        assert.equal(selected.lineage.edition, PAIRED_TWISTS_EDITION);
        if (extension) {
          if (recovery) {
            const { sha256, acceptedParentSnapshotSha256, ...authorization } = recovery;
            assert.deepEqual(selected.lineage.technicalRecovery, authorization);
            assert.equal(selected.lineage.technicalRecoverySha256, sha256);
            assert.equal(selected.lineage.stoppedSourceSha256, recovery.sourceSnapshotSha256);
            assert.equal(acceptedParentSnapshotSha256, extension.parentSnapshotSha256);
            assert.equal(fresh.recordSources.length, configurations.length * 4);
            assert.equal(fresh.toolIsolationPolicy?.historicalResultsReclassified, false);
          } else assert.deepEqual(selected.lineage.coverageExtension, extension);
          assert.equal(selected.lineage.parentSourceSha256, extension.parentSnapshotSha256);
          assert.equal(fresh.executionValidationPolicy?.version, 'paired-one-turn-last-message-validation-v1');
          assert.match(fresh.executionValidationPolicy.sha256, /^[a-f0-9]{64}$/);
          for (const item of [...fresh.answers, ...fresh.requests]) {
            if (recovery) {
              const kind = item.requestId ? 'judgment' : 'generation';
              const id = item.requestId || 'generation-' + createHash('sha256').update(JSON.stringify([item.configurationId, fresh.caseId, item.condition])).digest('hex').slice(0, 24);
              const record = fresh.recordSources.find(row => row.kind === kind && row.id === id);
              assert.ok(record);
              const { kind: _kind, id: _id, disposition, ...origin } = record;
              assert.deepEqual(item.provenance, { ...origin, recordDisposition: disposition,
                ...(disposition !== 'retained' ? { technicalRecoverySha256: recovery.sha256 } : {}) });
              continue;
            }
            const original = pairedOriginalConfigurations.includes(item.configurationId);
            const { configurationIds, ...provenance } = declaredAppend ? fresh.sourceCohorts.find(cohort => cohort.configurationIds.includes(item.configurationId)) : {};
            assert.deepEqual(item.provenance, declaredAppend ? provenance : { sourceCohort: original ? 'original' : 'supplement',
              sourceSnapshotSha256: original ? extension.parentSnapshotSha256 : fresh.sourceSha256,
              sourceManifestSha256: original ? extension.parentManifestSha256 : fresh.manifestSha256 });
          }
        } else assert.equal(fresh.executionValidationPolicy, undefined);
        assert.equal(selected.sources.length, 1);
        assert.equal(selected.sources[0].sha256, fresh.sourceSha256);
        assert.equal(selected.sources[0].path, `.agents/vasir-evals/${PAIRED_TWISTS_EDITION}/publication-snapshots/${fresh.sourceSha256}/snapshot.json`);
        assert.match(fresh.manifestSha256, /^[a-f0-9]{64}$/);
        assert.ok(fresh.requests.every(request => request.renderedOriginal === true));
        assert.deepEqual(fresh.mismatches, []);
        assert.equal(proof.predecessorArchiveEvidence, undefined);
        assert.equal(proof.trialCount, 1);
      } else {
        assert.equal(proof.pairedTwistsEvidence, undefined);
        assert.equal(record.pairedTwistsEvidence, undefined);
      }
      assertSelectedWritingReceipt(category, index, publishedWritingScope);
    } else if (compact) {
      assert.deepEqual(category.selectionEvidence.map(selection => selection.selectionId), compactSelections);
      for (const selection of category.selectionEvidence) assert.deepEqual(selection.mismatches, []);
      if (compactBenchmarkIds.includes(benchmarkId)) {
        assert.equal(proof.compactEvidenceHarnessSha256, verification.compactEvidenceHarness.sha256);
        assert.deepEqual(record.compactCaseEvidence, proof.compactCaseEvidence);
        assert.equal(record.compactEvidenceHarnessSha256, proof.compactEvidenceHarnessSha256);
        const definition = WRITING_COMPACT_BENCHMARKS.find(item => item.id === benchmarkId);
        assert.equal(proof.compactCaseEvidence.length, definition.caseCount);
        assert.equal(new Set(proof.compactCaseEvidence.map(item => item.caseId)).size, definition.caseCount);
        assert.deepEqual(proof.caseEvidence.map(item => item.caseId), proof.compactCaseEvidence.map(item => item.caseId));
        for (const evidence of proof.compactCaseEvidence) {
          assert.equal(evidence.kind, 'vasirbenchmark-compact-writing-browser-evidence');
          assert.equal(evidence.benchmarkId, benchmarkId);
          assert.equal(evidence.sourceSha256, verification.compactSourceSelection.snapshot.sha256);
          for (const field of ['manifestSha256', 'amendmentSha256', 'judgeValidationSha256']) assert.equal(evidence[field], verification.compactSourceSelection[field]);
          assert.deepEqual(evidence.mismatches, []);
        }
      }
    } else if (isSelectedMethod(index.method)) {
      assertSelectedWritingReceipt(category, index);
    } else {
    for (const field of ['noPlaceholderPanels', 'compactRows', 'matchedOverallFrame', 'packedSegments']) assert.equal(presentation[field], true);
    assert.deepEqual(presentation.mismatches, []);
    assert.equal(presentation.numericPairedSettingIds.length, index.completeSettings);
    assert.equal(new Set(presentation.numericPairedSettingIds).size, index.completeSettings);
    assert.ok(category.visibleSettingIds.length > 0);
    assert.ok(category.visibleSettingIds.every(id => presentation.numericPairedSettingIds.includes(id)));
    assert.equal(new Set(presentation.packedBars.map(bar => `${bar.settingId}/${bar.condition}`)).size, presentation.packedBars.length);
    for (const settingId of category.visibleSettingIds) for (const condition of ['baseline', 'skill']) {
      const bar = presentation.packedBars.find(item => item.settingId === settingId && item.condition === condition);
      assert.ok(bar && Number.isFinite(bar.score) && Number.isFinite(bar.total));
      assert.ok(bar.score >= 0 && bar.score <= 100 && Math.abs(bar.score - bar.total) < 1e-8);
      assert.equal(bar.segmentCount, index.groupIds.length);
    }
    }
    const clean = isCleanLedgerPresentation(index.presentationVariant);
    if (clean) {
      assert.deepEqual(record.reportPresentationEvidence, proof.reportPresentationEvidence);
      assert.equal(proof.reportPresentationEvidence?.benchmarkId, benchmarkId);
      assert.equal(proof.reportPresentationEvidence.modelComparisonHeading, 'Model comparison');
      for (const field of ['defaultClosed', 'modelComparisonFirst', 'secondaryTablesHidden', 'opensForAudit', 'closesAfterAudit']) assert.equal(proof.reportPresentationEvidence[field], true);
      assert.deepEqual(proof.reportPresentationEvidence.mismatches, []);
    }
    const qualifications = clean ? category.provisionalMethodEvidence : category.provisionalDisplayEvidence;
    if (clean) assert.deepEqual(category.provisionalDisplayEvidence || [], []);
    assert.deepEqual(qualifications.map(item => item.benchmarkId), verification.provisionalSourceEvidence.map(item => item.benchmarkId));
    for (const original of verification.provisionalSourceEvidence) {
      const display = qualifications.find(item => item.benchmarkId === original.benchmarkId);
      for (const field of clean ? ['sourceSha256'] : ['sourceSha256', 'rankedSettings', 'incompleteSettings']) assert.equal(display[field], original[field]);
      assert.deepEqual(display.judgeConfigurationIds, [original.judgeConfigurationId]);
      if (clean) {
        assert.equal(display.scope, 'category-methodology');
        for (const field of ['defaultClosed', 'openedForAudit', 'provisional', 'singleJudge', 'closedAfterAudit']) assert.equal(display[field], true);
        assert.equal(display.excludedOverall, index.presentationVariant !== overallPresentation);
        if (index.presentationVariant === overallPresentation) { assert.equal(display.includedOverall, true); assert.equal(display.overallWeight, 0.25); }
        const report = new URL(display.reportHref);
        assert.ok(report.pathname.endsWith('/benchmark-report.html'));
        assert.equal(report.hash.split('/')[0], '#' + original.benchmarkId);
      } else assert.deepEqual(display.activeBenchmarkIds, index.activeBenchmarkIds);
      if (!clean && index.selectionId === 'all-writing') {
        assert.equal(display.placementEvidence?.comparisonBenchmarkId, original.benchmarkId);
        assert.equal(display.placementEvidence?.ledgerBenchmarkId, original.benchmarkId);
        const link = new URL(display.placementEvidence.compareHref);
        assert.equal(link.searchParams.get('score'), original.benchmarkId === 'dungeon-master-adventure-outline' ? 'dungeon-master' : original.benchmarkId);
        assert.equal(link.searchParams.get('setting'), category.benchmarkOverviewEvidence.at(-1).selectedSettingId);
        assert.equal(link.hash, '#capabilities/writing');
      }
      assert.deepEqual(display.mismatches, []);
    }
    const screenshotNames = new Set(proof.screenshots.map(capture => capture.path));
    assert.equal(screenshotNames.size, proof.screenshots.length);
    for (const name of ['writing-models.png', ...(versioned || isSelectedMethod(index.method) ? ['writing-comparison-rows.png', ...(published ? publishedWritingFields : compact ? compactSelections : index.selectionId === 'all-writing' ? allWritingFields : selectedFields).map(id => `writing-selection-${id}.png`)] : ['writing-stacked-rows.png']), 'writing-benchmarks.png', 'writing-efficiency.png', 'writing-efficiency-tokens.png', ...(benchmarkId === 'dungeon-master-adventure-outline' ? ['dungeon-master-report.png'] : ['writing-report.png']), ...(!clean && verification.provisionalSourceEvidence.length ? ['writing-provisional.png'] : [])]) assert.ok(screenshotNames.has(name), `missing Writing capture: ${name}`);
    if (published) assert.deepEqual([...screenshotNames].filter(name => name.startsWith('writing-selection-')).sort(), publishedWritingFields.map(id => `writing-selection-${id}.png`).sort(), 'Public selection captures must not include withdrawn experiments.');
    if (clean) {
      assert.ok(screenshotNames.has('writing-index-method.png'), 'Opened category Methodology must remain visually reviewable');
      assert.ok(screenshotNames.has('writing-report-default.png'), 'Initial closed report must remain visually reviewable');
      assert.ok(![...screenshotNames].some(name => /^writing-provisional(?:-|\.)/.test(name)), 'Removed accordion captures must remain historical');
    }
    assert.ok(!screenshotNames.has('writing-partial.png'));
    for (const capture of proof.screenshots) {
      assert.equal(capture.width, viewport.width); assert.equal(capture.height, viewport.height);
      captures.push({ path: `${dirname(record.path)}/${capture.path}`, bytes: capture.bytes, sha256: capture.sha256, width: capture.width, height: capture.height });
    }
  }
  assert.equal(games.length, 2);
  assert.equal(verification.gamesBrowserProofs.length, 2);
  assert.deepEqual(games.map(proof => proof.width), [1440, 390]);
  for (const proof of games) {
    const record = verification.gamesBrowserProofs.find(item => item.width === proof.width);
    assert.equal(record.path, `${root}/games-${proof.width}/games-browsercheck-${proof.width}.json`);
    assert.equal(proof.kind, 'vasirbenchmark-games-browser-proof');
    assert.ok(!proof.error);
    for (const failures of [proof.coverageFailures, proof.runtimeErrors, proof.mediaFailures, proof.delivery.failures]) assert.deepEqual(failures, []);
    assert.equal(proof.delivery.mode, 'local-pinned-bytes');
    assert.equal(proof.delivery.siteScope.releaseId, verification.releaseId);
    for (const field of ['rows', 'clipsAdvanced', 'gamesLoadedAndInputObserved']) assert.equal(proof.coverage[field], 10);
    for (const field of ['clipsFailed', 'gamesWithObservedFailure', 'gamesUnverified', 'unavailableRows']) assert.equal(proof.coverage[field], 0);
    const prefix = proof.width === 1440 ? 'desktop' : 'mobile';
    for (const suffix of ['', '-ratings', '-playback', '-play', '-fullscreen']) assert.ok(proof.screenshots.some(capture => capture.path === `${prefix}-games${suffix}.png`));
    for (const capture of proof.screenshots) {
      assert.equal(capture.width, proof.width); assert.equal(capture.height, proof.width === 1440 ? 1000 : 844);
      captures.push({ path: `${dirname(record.path)}/${capture.path}`, bytes: capture.bytes, sha256: capture.sha256, width: capture.width, height: capture.height });
    }
  }
  assert.equal(new Set(captures.map(item => item.path)).size, captures.length);
  assert.equal(verification.freshCaptureCount, captures.length);
  assert.deepEqual(manifest.captures, captures, 'fresh capture inventory must exactly equal all canonical/Writing/Games receipts');
  assert.deepEqual(manifest.retainedCaptureEvidence.receipt, verification.previousAcceptance);
}

function assertPublishedWritingCollection(collection, responses, summary = null) {
  assert.deepEqual(collection.publicRelease, publishedWritingRelease);
  const twists = collection.benchmarkPublications?.find(item => item.benchmarkId === 'storytelling-plot-twists')?.projection;
  const paired = twists?.scoreBasis?.edition === PAIRED_TWISTS_EDITION;
  assert.deepEqual(collection.writingScoreBasis, paired ? PAIRED_WRITING_SCORE_BASIS : WRITING_ESTABLISHED_SCORE_BASIS);
  if (paired) deriveExpectedPairedTwistsEvidence(twists, responses.benchmarkResponses.find(item => item.benchmarkId === 'storytelling-plot-twists')?.responseBundle);
  assert.deepEqual(collection.catalog.map(item => item.id), storyBenchmarks);
  for (const item of collection.catalog) {
    assert.equal(item.lifecycle, 'published');
    assert.equal(item.archived, false);
    assert.equal(item.scoreBasisIncluded, true);
    assert.equal(item.trackId, 'storytelling');
    assert.equal(item.detailHref, `benchmark-report.html#${item.id}`);
  }
  const publications = [collection, ...(collection.benchmarkPublications || []).map(item => item.projection)];
  const archives = [responses, ...(responses.benchmarkResponses || []).map(item => item.responseBundle)];
  assert.deepEqual(publications.map(item => item.benchmarks?.[0]?.id), storyBenchmarks);
  assert.deepEqual(collection.benchmarkPublications.map(item => item.benchmarkId), storyBenchmarks.slice(1));
  assert.deepEqual(responses.benchmarkResponses.map(item => item.benchmarkId), storyBenchmarks.slice(1));
  for (const source of [...publications, ...archives]) {
    assert.equal(source.compactBenchmarks, undefined, 'Private compact experiments cannot enter public source modules.');
    assert.equal(source.additionalBenchmarks, undefined, 'The withdrawn Dungeon Master study must stay internal.');
  }
  for (const [index, archive] of archives.entries()) for (const response of archive.responses || []) assert.equal(response.benchmarkId, storyBenchmarks[index]);
  if (summary) {
    assert.deepEqual(summary.publicRelease, collection.publicRelease);
    assert.deepEqual(summary.writingScoreBasis, collection.writingScoreBasis);
    assert.deepEqual(summary.catalog, collection.catalog);
    assert.deepEqual(summary.benchmarkIds, storyBenchmarks);
    assert.deepEqual(summary.benchmarks.map(item => item.id), storyBenchmarks);
    assert.equal(summary.compactBenchmarks, undefined);
    assert.equal(summary.additionalBenchmarks, undefined);
  }
}

async function assertSharedFrameEvidence(manifest, deployment) {
  const verification = manifest.acceptance.verification;
  const published = verification.publicRelease !== undefined;
  const versioned = verification.categoryIndex.method === versionedMethod;
  const compact = versioned && !published;
  const candidate = JSON.parse(await assertLockedFile(verification.candidate));
  const canonical = JSON.parse(await assertLockedFile(verification.canonicalRun));
  const writing = await Promise.all(verification.writingBrowserProofs.map(async record => JSON.parse(await assertLockedFile(record))));
  const games = await Promise.all(verification.gamesBrowserProofs.map(async record => JSON.parse(await assertLockedFile(record))));
  assertSharedFrameInventory(manifest, candidate, canonical, writing, games);
  if (versioned || isSelectedMethod(verification.categoryIndex.method)) await assertLockedFile(verification.acceptanceEvidence);
  assert.deepEqual(candidate.siteFiles.map(file => file.path).sort(), deployment.publicFiles.map(file => file.path).sort());
  assert.equal(new Set(candidate.siteFiles.map(file => file.path)).size, candidate.siteFiles.length);
  const fileMap = new Map(candidate.siteFiles.map(file => [file.path, file]));
  let compactCollection, compactResponses;
  if (versioned) {
    if (compact) await assertLockedFile(verification.compactEvidenceHarness);
    const context = { window: {} };
    for (const name of ['data.js', 'writing-data.js', 'writing-responses.js', ...WRITING_RESPONSE_ARCHIVES.map(item => item.path)]) {
      const bytes = await readFile(join(siteRoot, name)), pin = fileMap.get(name);
      assert.ok(pin); assert.equal(bytes.length, pin.bytes); assert.equal(sha256(bytes), pin.sha256);
      vm.runInNewContext(bytes.toString('utf8'), context, { timeout: 10000 });
    }
    const globals = JSON.parse(JSON.stringify(context.window));
    compactCollection = globals.VASIR_WRITING;
    compactResponses = hydrateWritingResponseArchives(globals.VASIR_WRITING_RESPONSES, globals.VASIR_WRITING_CREATION_RESPONSES,
      Object.fromEntries(WRITING_RESPONSE_ARCHIVES.filter(item => item !== WRITING_CREATION_ARCHIVE && globals[item.globalName]).map(item => [item.benchmarkId, globals[item.globalName]])));
    if (published) {
      assert.deepEqual(compactCollection.publicRelease, verification.publicRelease);
      assertPublishedWritingCollection(compactCollection, compactResponses, globals.VASIR_DATA.writing);
      assert.equal(globals.VASIR_WRITING_DUNGEON_MASTER_RESPONSES, null, 'Withdrawn response bundles are not public release assets.');
    } else {
      assert.deepEqual(compactCollection.writingScoreBasis, WRITING_ESTABLISHED_SCORE_BASIS);
      assert.deepEqual(compactCollection.catalog.map(item => item.id).sort(), [...compactSharedBenchmarks].sort());
      assert.deepEqual(compactCollection.catalog.filter(item => item.archived).map(item => item.id).sort(), ['dungeon-master-adventure-outline', 'storytelling-plot-twists']);
      assert.deepEqual(Object.keys(compactCollection.compactBenchmarks), compactBenchmarkIds);
      assert.deepEqual(Object.keys(compactResponses.compactBenchmarks), compactBenchmarkIds);
    }
    const expected = deriveExpectedWritingCategory(compactCollection, 'all-writing');
    if (compact) expected.compactArchives = new Map(Object.entries(compactResponses.compactBenchmarks));
    expected.creationArchive = globals.VASIR_WRITING_CREATION_RESPONSES;
    expected.provisionalEvidence = deriveExpectedProvisionalEvidence(expected, compactResponses);
    expected.twistsPredecessors = compactResponses.benchmarkResponses?.find(item => item.benchmarkId === 'storytelling-plot-twists')?.responseBundle.supersededResponses;
    if (expected.publications.get('storytelling-plot-twists')?.scoreBasis?.edition === PAIRED_TWISTS_EDITION) expected.pairedTwistsArchive = compactResponses.benchmarkResponses.find(item => item.benchmarkId === 'storytelling-plot-twists').responseBundle;
    const { overall, aiWorkflows, games: _games, writing: summary, ...engineering } = globals.VASIR_DATA;
    if (overall?.scoreBasis?.edition === 'overall-v3') expected.overallV3 = deriveExpectedOverallV3({ engineering, aiWorkflows, writing: compactCollection, identityAliasPolicy: summary?.overallSource?.scoreBasis?.identityAliasPolicy ?? null });
    for (const proof of writing) verifyWritingProofEvidence(proof, expected);
  }
  if (verification.categoryIndex.presentationVariant === overallPresentation) {
    await assertLockedFile(verification.canonicalController);
    const globals = { window: {} };
    for (const name of ['data.js', 'writing-data.js']) {
      const bytes = await readFile(join(siteRoot, name)), pin = fileMap.get(name);
      assert.equal(bytes.length, pin.bytes); assert.equal(sha256(bytes), pin.sha256);
      vm.runInNewContext(bytes.toString('utf8'), globals, { timeout: 10000 });
    }
    const { overall, aiWorkflows, games: _games, writing: _summary, ...engineering } = JSON.parse(JSON.stringify(globals.window.VASIR_DATA));
    const oracle = deriveExpectedOverallV3({ engineering, aiWorkflows, writing: JSON.parse(JSON.stringify(globals.window.VASIR_WRITING)), identityAliasPolicy: _summary?.overallSource?.scoreBasis?.identityAliasPolicy ?? null });
    verifyOverallV3Projection(overall, oracle);
    assert.equal(sha256(JSON.stringify(overall)), canonical.preservation.overall);
    for (const proof of writing) verifyOverallV3Projection(JSON.parse(proof.categoryEvidence.overall), oracle);
  }
  const sourceMap = new Map(candidate.presentationSources.map(file => [file.path, file]));
  assert.equal(sourceMap.size, candidate.presentationSources.length);
  for (const file of manifest.files.filter(file => fileMap.has(file.path))) {
    assertReleasePresentationFile(file, sourceMap.get(file.path), fileMap.get(file.path), await assertLockedFile(file), candidate.releaseId, deployment.publicFiles);
  }
  const harness = name => manifest.files.find(file => file.path === name).sha256;
  assert.equal(canonical.source.path, 'site/vasirbenchmark.com/capture.mjs');
  assert.equal(canonical.source.initialSha256, harness('capture.mjs'));
  assert.equal(canonical.source.sha256, harness('capture.mjs'));
  for (const proof of writing) {
    assert.equal(proof.harnessSha256, harness('writing-browsercheck.mjs'));
    assert.equal(proof.overallSha256, canonical.preservation.overall);
    assert.equal(sha256(proof.categoryEvidence.overall), canonical.preservation.overall);
    const loadedPaths = [];
    for (const loaded of proof.loadedFiles) {
      const url = new URL(loaded.url), prefix = `/releases/${candidate.releaseId}/`;
      assert.equal(url.origin, new URL(proof.url).origin);
      assert.ok(url.pathname.startsWith(prefix));
      const name = url.pathname.slice(prefix.length), expected = fileMap.get(name);
      assert.ok(expected, `unexpected candidate module: ${name}`);
      assert.equal(loaded.sha256, expected.sha256); assert.equal(loaded.bytes, expected.bytes);
      loadedPaths.push(name);
    }
    const magic = proof.benchmarkId === focusedBenchmarkId;
    const splitArchives = candidate.siteFiles.some(file => file.path === 'writing-twists-responses.js');
    const archivePath = magic ? 'writing-creation-responses.js' : splitArchives && proof.benchmarkId === 'storytelling-plot-twists' ? 'writing-twists-responses.js' : splitArchives && proof.benchmarkId === 'dungeon-master-adventure-outline' ? 'writing-dungeon-master-responses.js' : 'writing-responses.js';
    for (const required of ['app.js', 'writing-data.js', 'benchmark-report.js', archivePath]) assert.ok(loadedPaths.includes(required));
    if (magic) assert.ok(!loadedPaths.includes('writing-responses.js'));
  }
  for (const proof of games) {
    assert.equal(proof.harnessSha256, harness('games-browsercheck.mjs'));
    assert.equal(proof.projectionSha256, candidate.projectionSha256);
    assert.equal(proof.delivery.projectionSha256, candidate.projectionSha256);
    assert.equal(proof.delivery.apexCspSha256, candidate.cspSha256);
    for (const loaded of proof.presentationFiles) {
      const expected = fileMap.get(loaded.path);
      assert.ok(expected); assert.equal(loaded.sha256, expected.sha256); assert.equal(loaded.bytes, expected.bytes);
    }
  }
  const unavailable = [];
  for (const selection of verification.sourceSelections) unavailable.push(...await assertSelectedSourceEvidence(selection));
  if (compact) {
    const selected = await assertCompactSelectedSourceEvidence(verification.compactSourceSelection);
    unavailable.push(...selected.unavailable);
    for (const publication of selected.publications ?? []) {
      const id = publication.projection.benchmarks[0].id;
      assert.deepEqual(compactCollection.compactBenchmarks[id], publication.projection);
      assert.deepEqual(compactResponses.compactBenchmarks[id], publication.responseBundle);
    }
  }
  const historical = [], seen = new Set();
  for (let retained = manifest.retainedCaptureEvidence; retained; retained = retained.previousRetainedEvidence) {
    assert.ok(!seen.has(retained.receipt.path), 'historical receipt cycle'); seen.add(retained.receipt.path);
    const previous = JSON.parse(await assertLockedFile(retained.receipt));
    assert.equal(previous.version, retained.version);
    assert.deepEqual(previous.captures, retained.captures);
    assert.deepEqual(previous.retainedCaptureEvidence ?? null, retained.previousRetainedEvidence ?? null);
    for (const capture of retained.captures) {
      assert.ok(!manifest.captures.some(current => current.path === capture.path));
      await assertCapture(capture);
    }
    historical.push(...retained.captures);
  }
  assert.deepEqual(historical.filter(capture => expectedCaptures.includes(capture.path)).map(capture => capture.path), expectedCaptures, 'all original 60 peer captures remain historical evidence');
  return unavailable;
}

function assertReleasePresentationFile(accepted, source, released, contents, releaseId, publicFiles) {
  assert.ok(source, `missing raw presentation source pin: ${accepted.path}`);
  assert.equal(source.path, accepted.path);
  assert.equal(source.sha256, accepted.sha256);
  assert.equal(source.bytes, accepted.bytes);
  assert.equal(contents.length, accepted.bytes);
  assert.equal(sha256(contents), accepted.sha256);
  // The publisher keeps source HTML unchanged and qualifies only immutable
  // relative dependencies. Recompute that exact boundary independently; do
  // not equate source-HTML hashes with published release-qualified HTML.
  let published = contents;
  if (publicFiles.find(file => file.path === accepted.path)?.cacheClass === 'html') {
    let text = contents.toString('utf8');
    for (const file of publicFiles) if (file.cacheClass === 'immutable') text = text.replaceAll(`./${file.path}`, `/releases/${releaseId}/${file.path}`);
    published = Buffer.from(text, 'utf8');
  }
  assert.equal(released.path, accepted.path);
  assert.equal(released.bytes, published.length, `release transform byte length: ${accepted.path}`);
  assert.equal(released.sha256, sha256(published), `release transform SHA-256: ${accepted.path}`);
}

async function assertEngineeringRefreshEvidence(manifest, reader = readFile, visited = new Set()) {
  assert.ok(!visited.has(manifest.version), 'Engineering acceptance lineage cycle');
  visited.add(manifest.version);
  const readLocked = (record, root = siteRoot) => assertLockedFile(record, root, reader);
  const benchmarkIds = ['hyper-scale-chat', 'personalized-home-feed', 'device-telemetry'];
  const isGpt6 = manifest.acceptance.scope.configurationIds?.[0] === 'codex:gpt-6-sol@low';
  const configurationIds = isGpt6
    ? [...['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].map(effort => `codex:gpt-6-sol@${effort}`), ...['low', 'medium', 'high', 'xhigh', 'max'].map(effort => `codex:gpt-6-luna@${effort}`)]
    : ['low', 'medium', 'high', 'xhigh', 'max'].map(effort => `claude:claude-opus-5-5@${effort}`);
  const counts = isGpt6 ? { settings: 52, responses: 312, judgments: 624 } : { settings: 41, responses: 246, judgments: 492 };
  const previousCounts = isGpt6 ? { settings: 41, responses: 246 } : { settings: 36, responses: 216 };
  assert.deepEqual(manifest.acceptance.scope, { kind: 'engineering-data-refresh', schemaVersion: 1, benchmarkIds, configurationIds, viewports: focusedViewports });
  const verification = manifest.acceptance.verification;
  assert.deepEqual(verification.counts, counts);
  assert.equal(verification.localBrowserChecks, 9);
  const previous = JSON.parse(await readLocked(verification.previousAcceptance));
  assert.equal(previous.acceptance.scope.kind, isGpt6 ? 'engineering-data-refresh' : 'shared-writing-category-frame');
  assert.equal(manifest.retainedCaptureEvidence.version, previous.version);
  assert.deepEqual(manifest.retainedCaptureEvidence.receipt, verification.previousAcceptance);
  const historical = previous.acceptance.verification;
  let candidate;
  if (!isGpt6) {
    candidate = JSON.parse(await readLocked(historical.candidate));
    const canonical = JSON.parse(await readLocked(historical.canonicalRun));
    const writing = await Promise.all(historical.writingBrowserProofs.map(async record => JSON.parse(await readLocked(record))));
    const games = await Promise.all(historical.gamesBrowserProofs.map(async record => JSON.parse(await readLocked(record))));
    // These receipts retain their historical candidate identity; they are never
    // substituted for fresh checks of the current Engineering pages.
    assertSharedFrameInventory(previous, candidate, canonical, writing, games);
  }
  for (const capture of previous.captures) await assertCapture(capture);
  assert.deepEqual(manifest.files.map(file => file.path), previous.files.map(file => file.path));
  for (const file of manifest.files) if (file.path !== 'index.html') {
    assert.deepEqual(file, previous.files.find(prior => prior.path === file.path));
  }
  const oldIndex = await readLocked(verification.previousIndex);
  assert.equal(sha256(oldIndex), previous.files.find(file => file.path === 'index.html').sha256);
  assert.equal(await reader(join(siteRoot, 'index.html'), 'utf8'), oldIndex.toString('utf8')
    .replace(`${previousCounts.settings} model settings`, `${counts.settings} model settings`)
    .replace(`${previousCounts.responses} responses`, `${counts.responses} responses`)
    .replace(`3 benchmarks × ${previousCounts.settings} settings × 2 conditions = ${previousCounts.responses} responses`, `3 benchmarks × ${counts.settings} settings × 2 conditions = ${counts.responses} responses`));
  const currentGlobals = { window: {} }, previousGlobals = { window: {} };
  const previousFiles = new Map([[join(siteRoot, 'index.html'), oldIndex]]);
  assert.deepEqual(verification.generatedFiles.map(file => file.path), ['data.js', 'responses.js']);
  for (const [index, name] of ['data.js', 'responses.js'].entries()) {
    const oldPin = index === 0 ? verification.previousData : verification.previousResponses;
    const oldSource = await readLocked(oldPin);
    const priorPin = (isGpt6 ? historical.generatedFiles : candidate.siteFiles).find(file => file.path === name);
    assert.equal(sha256(oldSource), priorPin.sha256); assert.equal(oldSource.length, priorPin.bytes);
    previousFiles.set(join(siteRoot, name), oldSource);
    vm.runInNewContext(oldSource.toString('utf8'), previousGlobals);
    vm.runInNewContext((await readLocked(verification.generatedFiles[index])).toString('utf8'), currentGlobals);
  }
  const oldData = JSON.parse(JSON.stringify(previousGlobals.window.VASIR_DATA));
  const data = JSON.parse(JSON.stringify(currentGlobals.window.VASIR_DATA));
  const oldResponses = JSON.parse(JSON.stringify(previousGlobals.window.VASIR_RESPONSES));
  const responses = JSON.parse(JSON.stringify(currentGlobals.window.VASIR_RESPONSES));
  for (const key of ['writing', 'games', 'aiWorkflows']) assert.deepEqual(data[key], oldData[key], `${key} evidence remains unchanged`);
  for (const file of (candidate?.siteFiles ?? []).filter(file => generatedPublicFiles.has(file.path) && !['data.js', 'responses.js'].includes(file.path))) await readLocked(file);
  assert.equal(data.settings.length, counts.settings); assert.equal(data.benchmarkResults.length, counts.responses);
  assert.equal(oldData.settings.length, previousCounts.settings);
  assert.deepEqual(data.settings.filter(setting => configurationIds.includes(setting.configurationId)).map(setting => setting.configurationId).sort(), [...configurationIds].sort());
  assert.deepEqual(data.overall.settings, oldData.overall.settings, 'Incomplete new settings do not enter Overall rankings');
  assert.deepEqual(data.overall.entries, oldData.overall.entries);
  assert.equal(responses.responses.length, counts.responses);
  assert.equal(responses.responses.reduce((count, response) => count + response.judgments.length, 0), counts.judgments);
  assert.equal(oldResponses.responses.length, previousCounts.responses);
  assert.deepEqual(responses.responses.filter(response => !configurationIds.includes(response.configurationId)), oldResponses.responses);
  assert.deepEqual(responses.messageSets, oldResponses.messageSets);
  const suite = JSON.parse(await readLocked(verification.browserSuite));
  assert.equal(suite.kind, isGpt6 ? 'vasirbenchmark-engineering-gpt6-sol-luna-browser-suite' : 'vasirbenchmark-engineering-opus-5-5-browser-suite');
  assert.equal(suite.mode, 'local'); assert.equal(suite.status, 'passed'); assert.equal(suite.sourceUnchanged, true);
  assert.equal(suite.results.length, 9); assert.equal(manifest.captures.length, 9);
  const harness = await readLocked(verification.browserHarness);
  assert.equal(sha256(harness), suite.harness.sha256); assert.equal(harness.length, suite.harness.bytes);
  const jobs = focusedViewports.flatMap(viewport => ['capabilities', 'capability-benchmarks', 'report'].map(target => ({ ...viewport, target })));
  assert.deepEqual(suite.results.map(({ target, width, height }) => ({ target, width, height })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), jobs.map(({ target, width, height }) => ({ target, width, height })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
  assert.deepEqual(suite.sourcePins.map(record => record.path), ['data.js', 'responses.js', 'index.html', 'app.js', 'benchmark-report.html', 'benchmark-report.js'].map(name => `site/vasirbenchmark.com/${name}`));
  for (const record of suite.sourcePins) await readLocked(record, repoRoot);
  for (const result of suite.results) {
    assert.equal(result.status, 'passed'); assert.equal(result.exitCode, 0); assert.equal(result.stderr, '');
    assert.deepEqual(result.harness, suite.harness); assert.deepEqual(result.sourcePins, suite.sourcePins);
    assert.ok(result.stdout.includes(`${counts.settings} settings / ${counts.settings * 2} condition entries / ${counts.responses} result cells`));
    assert.match(result.stdout, /QA clean/);
    if (result.target === 'report') assert.match(result.stdout, /report evidence checked/);
    const capture = manifest.captures.find(record => record.path.endsWith(`/${result.target}-${result.width}.png`));
    assert.ok(capture); assert.equal(capture.sha256, result.screenshot.sha256); assert.equal(capture.bytes, result.screenshot.bytes);
    assert.equal(capture.width, result.width); assert.equal(capture.height, result.height);
  }
  assert.equal(verification.selection.path, 'benchmarks/public-results.json');
  const selected = JSON.parse(await readLocked(verification.selection, repoRoot));
  assert.deepEqual(verification.selectedRuns.map(record => record.benchmarkId), benchmarkIds);
  const unavailable = [];
  if (isGpt6) {
    const previousSelection = await readLocked(verification.previousSelection);
    assert.equal(sha256(previousSelection), historical.selection.sha256);
    assert.equal(previousSelection.length, historical.selection.bytes);
    previousFiles.set(join(repoRoot, historical.selection.path), previousSelection);
    // Resolve the previous candidate's mutable public paths to the archived
    // bytes captured before this append, while retaining all original pins.
    const previousReader = async (filePath, encoding) => {
      const bytes = previousFiles.get(resolve(filePath));
      return bytes ? (encoding ? bytes.toString(encoding) : bytes) : reader(filePath, encoding);
    };
    unavailable.push(...await assertEngineeringRefreshEvidence(previous, previousReader, visited));
  }
  for (const record of verification.selectedRuns) {
    const selection = selected.selectedRuns.find(item => item.benchmarkId === record.benchmarkId);
    assert.equal(record.path, selection.runPath); assert.equal(record.sha256, selection.sha256);
    let run;
    try { run = JSON.parse(await readLocked(record, repoRoot)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; unavailable.push(record.path); continue; }
    assert.deepEqual(run.extension.extendedConfigurationIds, configurationIds);
    assert.equal(record.source.path, `.agents/vasir-evals/${record.benchmarkId}/${run.extension.sourceRunId}/run.json`);
    try {
      const source = JSON.parse(await readLocked(record.source, repoRoot));
      assert.equal(source.rows.length, previousCounts.responses / 3); assert.equal(run.rows.length, counts.responses / 3);
      for (const row of source.rows) assert.deepEqual(run.rows.find(current => current.rowKey === row.rowKey), row);
    } catch (error) { if (error.code !== 'ENOENT') throw error; unavailable.push(record.source.path); }
    for (const row of run.rows.filter(row => configurationIds.includes(row.configurationId))) {
      const response = responses.responses.find(item => item.benchmarkId === record.benchmarkId && item.configurationId === row.configurationId && item.condition === (row.conditionId === 'clean' ? 'baseline' : 'skill'));
      assert.ok(response); assert.equal(response.outputText, row.outputText);
      assert.deepEqual(responses.messageSets.find(messages => messages.id === response.messageSetId).messages, row.exactMessages);
      assert.equal(response.judgments.length, 2);
    }
  }
  return unavailable;
}

async function assertGamesPresentationRefreshEvidence(manifest) {
  const viewports = [{ width: 1440, height: 1000 }, { width: 390, height: 844 }];
  const changedPaths = ['games.js', 'games.css', 'games-browsercheck.mjs'];
  assert.deepEqual(manifest.acceptance.scope, {
    kind: 'games-presentation-refresh', schemaVersion: 1,
    benchmarkIds: ['2d-jumping-demo'], viewports
  });
  const verification = manifest.acceptance.verification;
  const previous = JSON.parse(await assertLockedFile(verification.previousAcceptance));
  assert.equal(previous.acceptance.scope.kind, 'engineering-data-refresh');
  assert.equal(manifest.retainedCaptureEvidence.version, previous.version);
  assert.deepEqual(manifest.retainedCaptureEvidence.receipt, verification.previousAcceptance);
  assert.deepEqual(manifest.files.map(file => file.path), previous.files.map(file => file.path));
  for (const file of manifest.files) if (!changedPaths.includes(file.path)) {
    assert.deepEqual(file, previous.files.find(prior => prior.path === file.path), `${file.path} remains unchanged`);
  }
  assert.deepEqual(verification.previousFiles.map(file => file.sourcePath), changedPaths);
  const previousFiles = new Map();
  for (const record of verification.previousFiles) {
    const bytes = await assertLockedFile(record);
    const prior = previous.files.find(file => file.path === record.sourcePath);
    assert.equal(bytes.length, prior.bytes); assert.equal(sha256(bytes), prior.sha256);
    previousFiles.set(join(siteRoot, record.sourcePath), bytes);
  }
  const previousReader = async (filePath, encoding) => {
    const bytes = previousFiles.get(resolve(filePath));
    return bytes ? (encoding ? bytes.toString(encoding) : bytes) : readFile(filePath, encoding);
  };
  const unavailable = await assertEngineeringRefreshEvidence(previous, previousReader);
  for (const capture of previous.captures) await assertCapture(capture);
  assert.deepEqual(verification.generatedFiles.map(file => file.path).sort(), [...generatedPublicFiles].sort());
  for (const record of verification.generatedFiles) {
    await assertLockedFile(record);
    const prior = previous.acceptance.verification.generatedFiles.find(file => file.path === record.path);
    if (prior) assert.deepEqual(record, prior, `${record.path} retains the accepted Engineering evidence`);
  }
  const globals = { window: {} };
  vm.runInNewContext(await readFile(join(siteRoot, 'data.js'), 'utf8'), globals);
  const data = JSON.parse(JSON.stringify(globals.window.VASIR_DATA));
  const harness = await assertLockedFile(verification.browserHarness);
  const acceptedHarness = manifest.files.find(file => file.path === 'games-browsercheck.mjs');
  assert.equal(harness.length, acceptedHarness.bytes); assert.equal(sha256(harness), acceptedHarness.sha256);
  const rehearsalBytes = await assertLockedFile(verification.rehearsalManifest);
  const rehearsal = JSON.parse(rehearsalBytes);
  assert.equal(rehearsal.projectionSha256, sha256(JSON.stringify(data)));
  const deployment = JSON.parse(await readFile(join(siteRoot, 'deployment.json'), 'utf8'));
  assert.deepEqual(rehearsal.siteFiles.map(file => file.path).sort(), deployment.publicFiles.map(file => file.path).sort());
  for (const released of rehearsal.siteFiles) {
    const source = [...manifest.files, ...verification.generatedFiles].find(file => file.path === released.path);
    assert.ok(source);
    assertReleasePresentationFile(source, source, released, await assertLockedFile(source), rehearsal.releaseId, deployment.publicFiles);
  }
  assert.equal(verification.localBrowserChecks, 2);
  assert.deepEqual(verification.browserProofs.map(({ width, height }) => ({ width, height })), viewports);
  assert.equal(manifest.captures.length, 10);
  const releaseIds = new Set();
  for (const record of verification.browserProofs) {
    const proof = JSON.parse(await assertLockedFile(record));
    assert.equal(proof.kind, 'vasirbenchmark-games-browser-proof');
    assert.equal(proof.width, record.width); assert.equal(proof.height, record.height);
    assert.equal(proof.harnessSha256, acceptedHarness.sha256);
    assert.equal(proof.projectionSha256, sha256(JSON.stringify(data)));
    assert.equal(proof.delivery.mode, 'local-pinned-bytes');
    assert.deepEqual(proof.delivery.failures, []);
    assert.equal(proof.delivery.siteScope.mapping, 'immutable-release');
    assert.match(proof.delivery.siteScope.releaseId, /^[a-f0-9]{64}$/);
    assert.equal(proof.delivery.siteScope.releaseId, rehearsal.releaseId);
    assert.equal(proof.delivery.manifest.sha256, sha256(rehearsalBytes));
    assert.equal(proof.delivery.manifest.bytes, rehearsalBytes.length);
    releaseIds.add(proof.delivery.siteScope.releaseId);
    for (const field of ['coverageFailures', 'runtimeErrors', 'mediaFailures']) assert.deepEqual(proof[field], []);
    for (const field of ['rows', 'clipsAdvanced', 'gamesLoadedAndInputObserved']) assert.equal(proof.coverage[field], 10);
    for (const field of ['clipsFailed', 'gamesWithObservedFailure', 'gamesUnverified', 'unavailableRows']) assert.equal(proof.coverage[field], 0);
    const expectedOrder = [
      ['codex:gpt-6-astra@ultra', '1'], ['claude:claude-fable-5-1@max', '2'],
      ['codex:gpt-6-astra@medium', '2'], ['codex:gpt-5.6-sol@max', '4'], ['codex:gpt-5.6-terra@max', '5']
    ];
    assert.equal(proof.ratings.version, '4'); assert.equal(proof.ratings.heading, 'Model comparison');
    assert.equal(proof.ratings.beforeGames, true);
    assert.deepEqual(proof.ratings.comparison.map(row => [row.configurationId, row.rank]), expectedOrder);
    assert.deepEqual(proof.ratings.modelButtons, expectedOrder.map(([id]) => id));
    assert.equal(proof.ratings.defaultSelection, expectedOrder[0][0]);
    for (const row of proof.ratings.comparison) {
      assert.equal(row.nativeDisclosure, true); assert.equal(row.closed, true); assert.ok(row.plotWidth > 0);
      assert.deepEqual(row.marks.map(mark => mark.condition), ['bare', 'vasir']);
      for (const mark of row.marks) {
        const run = data.games.runs.find(run => run.configurationId === row.configurationId && run.conditionId === mark.condition);
        assert.equal(mark.score, run.score.value);
        assert.equal(Number(mark.summary.match(/[+-]?\d+(?:\.\d+)?/)[0]), run.score.value);
        assert.ok(Number.isFinite(mark.center) && Number.isFinite(mark.expectedCenter));
        assert.ok(Math.abs(mark.center - mark.expectedCenter) < 2);
      }
    }
    assert.equal(proof.ratings.rows.length, data.games.runs.length);
    for (const rating of proof.ratings.rows) {
      const run = data.games.runs.find(run => run.id === rating.id);
      assert.ok(run); assert.equal(rating.combined, String(run.score.value));
      assert.deepEqual(rating.judges, run.judgments.map(judge => ({ judge: judge.judge, value: Number(judge.score?.value ?? judge.score ?? judge.value).toFixed(1) })));
      assert.equal(rating.status, run.status === 'timeout' ? 'Incomplete · time limit' : 'Built');
      assert.equal(rating.qualification, run.score.eligible === false ? 'Diagnostic only' : run.score.eligible === null ? 'Functional proof incomplete' : '');
    }
    assert.deepEqual(proof.modelSelections.map(selection => selection.configurationId), expectedOrder.map(([id]) => id));
    for (const selection of proof.modelSelections) {
      const runIds = data.games.conditions.map(condition => data.games.runs.find(run => run.configurationId === selection.configurationId && run.conditionId === condition.id).id);
      assert.deepEqual(selection.actualRuns, runIds); assert.deepEqual(selection.expectedRuns, runIds);
      assert.equal(selection.selected, selection.configurationId); assert.equal(selection.urlModel, selection.configurationId);
      assert.equal(selection.eagerMedia, 0); assert.deepEqual(selection.disclosure, { open: true, judges: 4, visible: true });
    }
    for (const presentation of proof.presentationFiles) {
      const accepted = manifest.files.find(file => file.path === presentation.path);
      assert.ok(accepted, `Unaccepted browser presentation input ${presentation.path}`);
      assert.equal(presentation.sourceSha256, accepted.sha256, presentation.path);
      assert.equal(presentation.observation, 'CDP Network.getResponseBody for the completed browser-loaded response');
    }
    assert.deepEqual(proof.presentationFiles.map(file => file.path), ['games.html', 'games.css', 'games.js', 'style.css', 'assets/kanit-latin-900-normal.woff2']);
    const prefix = proof.width === 1440 ? 'desktop' : 'mobile';
    assert.deepEqual(proof.screenshots.map(capture => capture.path), ['', '-ratings', '-playback', '-play', '-fullscreen'].map(suffix => `${prefix}-games${suffix}.png`));
    for (const screenshot of proof.screenshots) {
      const capture = manifest.captures.find(item => item.path === `${dirname(record.path)}/${screenshot.path}`);
      assert.ok(capture); assert.equal(capture.sha256, screenshot.sha256); assert.equal(capture.bytes, screenshot.bytes);
      assert.equal(capture.width, proof.width); assert.equal(capture.height, proof.height);
    }
  }
  assert.equal(releaseIds.size, 1, 'Both viewports exercised the same immutable candidate');
  assert.equal(verification.visualReview.authority, 'agent');
  assert.ok(verification.visualReview.capturePaths.length >= 2);
  for (const capturePath of verification.visualReview.capturePaths) assert.ok(manifest.captures.some(capture => capture.path === capturePath));
  return unavailable;
}

async function assertGamesDataExtensionEvidence(manifest, deployment) {
  const viewports = [{ width: 1440, height: 1000 }, { width: 390, height: 844 }];
  const configurationIds = ['claude:claude-opus-5-5@high', 'claude:claude-opus-5-5@max'];
  assert.deepEqual(manifest.acceptance.scope, { kind: 'games-data-extension', schemaVersion: 1, benchmarkIds: ['2d-jumping-demo'], configurationIds, viewports });
  const verification = manifest.acceptance.verification;
  assert.deepEqual([verification.configurations, verification.outputs, verification.judgments, verification.preservedOutputs, verification.localBrowserChecks], [7, 14, 28, 10, 2]);
  const previous = JSON.parse(await assertLockedFile(verification.previousAcceptance));
  assert.equal(previous.kind, 'vasirbenchmark-site-template-lock'); assert.equal(previous.status, 'accepted');
  assert.equal(manifest.retainedCaptureEvidence.version, previous.version);
  assert.deepEqual(manifest.retainedCaptureEvidence.receipt, verification.previousAcceptance);
  assert.deepEqual(manifest.files.map(file => file.path), previous.files.map(file => file.path));
  const changed = manifest.files.filter(file => file.sha256 !== previous.files.find(prior => prior.path === file.path)?.sha256);
  assert.deepEqual(verification.previousFiles.map(record => record.sourcePath), changed.map(file => file.path));
  for (const file of changed) assert.ok(['games-browsercheck.mjs', 'games.js', 'games.css', 'deployment.json'].includes(file.path), `Unrelated presentation drift: ${file.path}`);
  for (const record of verification.previousFiles) {
    const bytes = await assertLockedFile(record), prior = previous.files.find(file => file.path === record.sourcePath);
    assert.equal(bytes.length, prior.bytes); assert.equal(sha256(bytes), prior.sha256);
  }
  // Historical locks and captures remain history. Do not reinterpret their data
  // against this larger current projection or label earlier screenshots current.
  const baseline = JSON.parse(await assertLockedFile(verification.baselineManifest));
  const beforeBytes = await assertLockedFile(verification.previousData);
  const readData = bytes => { const globals = { window: {} }; vm.runInNewContext(bytes.toString('utf8'), globals); return JSON.parse(JSON.stringify(globals.window.VASIR_DATA)); };
  const before = readData(beforeBytes), data = readData(await readFile(join(siteRoot, 'data.js')));
  const baselinePin = name => baseline.pins.find(record => record.path === `site/vasirbenchmark.com/${name}`);
  assert.equal(beforeBytes.length, baselinePin('data.js').bytes); assert.equal(sha256(beforeBytes), baselinePin('data.js').sha256);
  const withoutGames = ({ games, ...remaining }) => remaining;
  assert.deepEqual(withoutGames(data), withoutGames(before), 'Every non-Games projection remains identical.');
  assert.equal(before.games.configurations.length, 5); assert.equal(before.games.runs.length, 10);
  assert.equal(data.games.configurations.length, 7); assert.equal(data.games.runs.length, 14);
  assert.equal(new Set(data.games.runs.map(run => run.id)).size, 14);
  assert.equal(data.games.runs.reduce((sum, run) => sum + run.judgments.length, 0), 28);
  assert.deepEqual(data.games.conditions, before.games.conditions);
  assert.equal(data.games.benchmark.prompt, before.games.benchmark.prompt);
  for (const run of before.games.runs) assert.deepEqual(data.games.runs.find(current => current.id === run.id), run, `Original output or review changed: ${run.id}`);
  for (const configuration of before.games.configurations) assert.deepEqual(data.games.configurations.find(current => current.id === configuration.id), configuration);
  const added = data.games.runs.filter(run => !before.games.runs.some(original => original.id === run.id));
  assert.deepEqual(added.map(run => `${run.configurationId}|${run.conditionId}`).sort(), configurationIds.flatMap(id => ['bare', 'vasir'].map(condition => `${id}|${condition}`)).sort());
  assert.ok(added.every(run => ['complete', 'completed', 'timeout'].includes(run.status) && run.artifact.playUrl && run.artifact.videoUrl && run.artifact.posterUrl));
  const previousResponses = await assertLockedFile(verification.previousResponses);
  assert.equal(sha256(previousResponses), baselinePin('responses.js').sha256);
  assert.deepEqual(await readFile(join(siteRoot, 'responses.js')), previousResponses);
  for (const name of [...generatedPublicFiles].filter(name => name.startsWith('writing-'))) await assertLockedFile({ ...baselinePin(name), path: name });
  assert.deepEqual(verification.generatedFiles.map(file => file.path).sort(), [...generatedPublicFiles].sort());
  for (const record of verification.generatedFiles) await assertLockedFile(record);
  const preserved = JSON.parse(await assertLockedFile(verification.preservedWorkspaceManifest));
  assert.deepEqual(verification.preservedWorkspaceFiles.map(record => record.sourcePath), ['games.js', 'games.css']);
  for (const record of verification.preservedWorkspaceFiles) {
    const bytes = await assertLockedFile(record), pinned = preserved.pins.find(file => file.path === record.sourcePath);
    assert.equal(bytes.length, pinned.bytes); assert.equal(sha256(bytes), pinned.sha256);
    assert.deepEqual(await readFile(join(siteRoot, record.sourcePath)), bytes, `Preexisting workspace file changed: ${record.sourcePath}`);
  }
  const budget = verification.deploymentBudget;
  const beforeDeploymentBytes = await assertLockedFile(budget.before), beforeDeployment = JSON.parse(beforeDeploymentBytes);
  const previousDeploymentPin = preserved.pins.find(file => file.path === 'deployment.json');
  assert.equal(beforeDeploymentBytes.length, previousDeploymentPin.bytes); assert.equal(sha256(beforeDeploymentBytes), previousDeploymentPin.sha256);
  assert.deepEqual(JSON.parse(await assertLockedFile(budget.after)), deployment);
  const normalized = structuredClone(deployment); normalized.limits.maxCompressedLandingBytes = beforeDeployment.limits.maxCompressedLandingBytes;
  normalized.limits.maxPhysicalStorageBytes = beforeDeployment.limits.maxPhysicalStorageBytes;
  assert.deepEqual(normalized, beforeDeployment, 'Deployment changes are confined to measured landing transfer and retained-storage budgets.');
  assert.equal(budget.previousLimit, beforeDeployment.limits.maxCompressedLandingBytes); assert.equal(budget.currentLimit, deployment.limits.maxCompressedLandingBytes);
  assert.ok(budget.measuredCompressedLandingBytes <= budget.currentLimit);
  if (budget.previousLimit !== budget.currentLimit) {
    assert.ok(budget.measuredCompressedLandingBytes > budget.previousLimit);
    assert.ok(budget.currentLimit <= Math.ceil(budget.measuredCompressedLandingBytes / 10000) * 10000);
  }
  if (deployment.limits.maxPhysicalStorageBytes !== beforeDeployment.limits.maxPhysicalStorageBytes) {
    const storage = budget.storage, rejection = JSON.parse(await assertLockedFile(storage.rejection)), measured = rejection.context;
    assert.equal(rejection.code, 'BENCHMARK_PUBLISH_STORAGE_BUDGET_EXCEEDED');
    assert.equal(measured.stage, 'cleanup'); assert.equal(measured.rollback.status, 'not-needed'); assert.deepEqual(measured.expiredReleaseIds, []);
    for (const field of ['physicalBytes', 'candidateBytes', 'projectedBytes']) assert.ok(Number.isSafeInteger(measured[field]) && measured[field] > 0);
    assert.equal(measured.projectedBytes, measured.physicalBytes + measured.candidateBytes);
    assert.equal(storage.previousLimit, beforeDeployment.limits.maxPhysicalStorageBytes); assert.equal(storage.currentLimit, deployment.limits.maxPhysicalStorageBytes);
    assert.equal(storage.boundaryBytes, 16 * 1024 * 1024);
    assert.ok(measured.projectedBytes > storage.previousLimit && measured.projectedBytes <= storage.currentLimit);
    assert.ok(storage.currentLimit <= Math.ceil(measured.projectedBytes / storage.boundaryBytes) * storage.boundaryBytes);
  }
  const previousSelection = await assertLockedFile(verification.previousSelection);
  const selectionPin = baseline.pins.find(record => record.path === 'benchmarks/2d-jumping-demo/publication.json');
  assert.equal(previousSelection.length, selectionPin.bytes); assert.equal(sha256(previousSelection), selectionPin.sha256);
  const selectedBytes = await assertLockedFile(verification.selectedPublication), selected = JSON.parse(selectedBytes);
  assert.deepEqual(await readFile(join(repoRoot, 'benchmarks/2d-jumping-demo/publication.json')), selectedBytes);
  const unavailable = [];
  try { await assertLockedFile(selected.source, repoRoot); }
  catch (error) { if (error.code !== 'ENOENT') throw error; unavailable.push(selected.source.path); }
  const candidate = JSON.parse(await assertLockedFile(verification.candidate));
  assert.equal(candidate.kind, 'vasirbenchmark-games-extension-candidate'); assert.equal(candidate.schemaVersion, 1);
  if (budget.storage) assert.equal(JSON.parse(await assertLockedFile(budget.storage.rejection)).context.releaseId, candidate.releaseId);
  assert.equal(candidate.releaseId, sha256(Buffer.from(`${JSON.stringify({ sourceManifest: candidate.sourceManifest, projectionBasisSha256: candidate.projectionBasisSha256 })}\n`)));
  assert.deepEqual([candidate.configurations, candidate.outputs, candidate.judgments, candidate.preservedOutputs], [7, 14, 28, 10]);
  assert.deepEqual(candidate.addedConfigurationIds, configurationIds); assert.deepEqual(candidate.addedOutputIds, added.map(run => run.id));
  assert.equal(candidate.selection.sha256, sha256(selectedBytes)); assert.equal(candidate.selection.bytes, selectedBytes.length);
  assert.equal(candidate.compressedLandingBytes, budget.measuredCompressedLandingBytes);
  const harness = await assertLockedFile(verification.browserHarness), acceptedHarness = manifest.files.find(file => file.path === 'games-browsercheck.mjs');
  assert.equal(harness.length, acceptedHarness.bytes); assert.equal(sha256(harness), acceptedHarness.sha256);
  assert.deepEqual(candidate.browserHarness, { path: acceptedHarness.path, bytes: acceptedHarness.bytes, sha256: acceptedHarness.sha256 });
  const rehearsalBytes = await assertLockedFile(verification.rehearsalManifest), rehearsal = JSON.parse(rehearsalBytes);
  assert.equal(candidate.rehearsal.sha256, sha256(rehearsalBytes)); assert.equal(candidate.rehearsal.bytes, rehearsalBytes.length);
  assert.equal(rehearsal.releaseId, candidate.releaseId); assert.equal(rehearsal.projectionSha256, sha256(JSON.stringify(data))); assert.equal(candidate.projectionSha256, rehearsal.projectionSha256);
  assert.deepEqual(rehearsal.siteFiles.map(file => file.path).sort(), deployment.publicFiles.map(file => file.path).sort());
  assert.deepEqual(candidate.sourceManifest.map(file => file.path).sort(), deployment.publicFiles.map(file => file.path).sort());
  for (const released of rehearsal.siteFiles) {
    const accepted = [...manifest.files, ...verification.generatedFiles].find(file => file.path === released.path);
    assertReleasePresentationFile(accepted, candidate.sourceManifest.find(file => file.path === released.path), released, await assertLockedFile(accepted), candidate.releaseId, deployment.publicFiles);
  }
  const scoreRows = data.games.configurations.map(configuration => {
    const pair = data.games.conditions.map(condition => {
      const runs = data.games.runs.filter(run => run.configurationId === configuration.id && run.conditionId === condition.id);
      assert.equal(runs.length, 1); const run = runs[0];
      assert.equal(run.judgments.length, 2); assert.equal(new Set(run.judgments.map(judge => judge.judge)).size, 2);
      const scores = run.judgments.map(judge => judge.score?.value ?? judge.score ?? judge.value);
      assert.ok(scores.every(score => Number.isFinite(score) && score >= 0 && score <= 100));
      assert.equal(run.score.value, Number(((scores[0] + scores[1]) / 2).toFixed(1)));
      return run;
    });
    const vasir = pair.find(run => run.conditionId === 'vasir');
    return { id: configuration.id, label: configuration.label || configuration.id, score: vasir.score.value, eligible: vasir.score.eligible === true };
  }).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
  const expectedOrder = scoreRows.map(row => [row.id, row.eligible ? String(scoreRows.filter(other => other.eligible && other.score > row.score).length + 1) : '']);
  assert.deepEqual(verification.browserProofs.map(({ width, height }) => ({ width, height })), viewports);
  assert.equal(manifest.captures.length, 94); assert.equal(new Set(manifest.captures.map(capture => capture.path)).size, 94);
  for (const record of verification.browserProofs) {
    const proof = JSON.parse(await assertLockedFile(record));
    assert.equal(proof.kind, 'vasirbenchmark-games-browser-proof'); assert.equal(proof.width, record.width); assert.equal(proof.height, record.height);
    assert.equal(proof.harnessSha256, acceptedHarness.sha256); assert.equal(proof.projectionSha256, rehearsal.projectionSha256);
    assert.equal(proof.delivery.mode, 'local-pinned-bytes'); assert.equal(proof.delivery.siteScope.mapping, 'immutable-release'); assert.equal(proof.delivery.siteScope.releaseId, candidate.releaseId);
    assert.equal(proof.delivery.manifest.sha256, sha256(rehearsalBytes)); assert.equal(proof.delivery.manifest.bytes, rehearsalBytes.length);
    assert.deepEqual(proof.delivery.failures, []); for (const field of ['coverageFailures', 'runtimeErrors', 'mediaFailures']) assert.deepEqual(proof[field], []);
    assert.equal(proof.coverage.rows, 14); assert.equal(proof.coverage.clipsAdvanced, 14);
    assert.equal(proof.coverage.gamesLoadedAndInputObserved + proof.coverage.gamesWithObservedFailure, 14);
    for (const field of ['clipsFailed', 'gamesUnverified', 'unavailableRows']) assert.equal(proof.coverage[field], 0);
    assert.deepEqual(proof.artifacts.map(item => item.id).sort(), data.games.runs.map(run => run.id).sort());
    for (const artifact of proof.artifacts) {
      assert.equal(artifact.video.status, 'advancing'); assert.ok(['loaded-and-input-observed', 'observed-failure'].includes(artifact.game.status));
      if (artifact.game.status === 'observed-failure') assert.equal(artifact.game.declaredFunctionalFailure, true);
    }
    assert.equal(proof.ratings.version, '4'); assert.equal(proof.ratings.beforeGames, true); assert.equal(proof.ratings.heading, 'Model comparison');
    assert.deepEqual(proof.ratings.comparison.map(row => [row.configurationId, row.rank]), expectedOrder);
    assert.deepEqual(proof.ratings.modelButtons, expectedOrder.map(([id]) => id)); assert.equal(proof.ratings.defaultSelection, expectedOrder[0][0]);
    assert.equal(proof.ratings.rows.length, 14);
    for (const rating of proof.ratings.rows) {
      const run = data.games.runs.find(run => run.id === rating.id); assert.ok(run);
      assert.equal(rating.combined, String(run.score.value));
      assert.deepEqual(rating.judges, run.judgments.map(judge => ({ judge: judge.judge, value: Number(judge.score?.value ?? judge.score ?? judge.value).toFixed(1) })));
      assert.equal(rating.status, run.status === 'timeout' ? 'Incomplete · time limit' : 'Built');
      assert.equal(rating.qualification, run.score.eligible === false ? 'Diagnostic only' : run.score.eligible === null ? 'Functional proof incomplete' : '');
    }
    for (const row of proof.ratings.comparison) {
      assert.equal(row.nativeDisclosure, true); assert.equal(row.closed, true); assert.ok(row.plotWidth > 0);
      assert.deepEqual(row.marks.map(mark => mark.condition), ['bare', 'vasir']);
      for (const mark of row.marks) {
        const run = data.games.runs.find(run => run.configurationId === row.configurationId && run.conditionId === mark.condition);
        assert.equal(mark.score, run.score.value); assert.equal(Number(mark.summary.match(/[+-]?\d+(?:\.\d+)?/)[0]), run.score.value);
        assert.ok(Number.isFinite(mark.center) && Number.isFinite(mark.expectedCenter) && Math.abs(mark.center - mark.expectedCenter) < 2);
      }
    }
    assert.deepEqual(proof.modelSelections.map(selection => selection.configurationId), expectedOrder.map(([id]) => id));
    for (const selection of proof.modelSelections) {
      const runIds = data.games.conditions.map(condition => data.games.runs.find(run => run.configurationId === selection.configurationId && run.conditionId === condition.id).id);
      assert.deepEqual(selection.actualRuns, runIds); assert.deepEqual(selection.expectedRuns, runIds);
      assert.equal(selection.selected, selection.configurationId); assert.equal(selection.urlModel, selection.configurationId); assert.equal(selection.eagerMedia, 0);
      assert.deepEqual(selection.disclosure, { open: true, judges: 4, visible: true });
    }
    assert.deepEqual(proof.presentationFiles.map(file => file.path), ['games.html', 'games.css', 'games.js', 'style.css', 'assets/kanit-latin-900-normal.woff2']);
    for (const presentation of proof.presentationFiles) assert.equal(presentation.sourceSha256, manifest.files.find(file => file.path === presentation.path)?.sha256);
    const prefix = proof.width === 1440 ? 'desktop' : 'mobile';
    const expectedScreenshots = ['', '-ratings', '-playback', '-play', '-fullscreen'].map(suffix => `${prefix}-games${suffix}.png`);
    for (let index = 1; index <= 14; index++) for (const suffix of ['playback', 'before-input', 'after-input']) expectedScreenshots.push(`${proof.width}-${index}-${suffix}.png`);
    assert.deepEqual(proof.screenshots.map(screenshot => screenshot.path), expectedScreenshots);
    for (const screenshot of proof.screenshots) {
      const capture = manifest.captures.find(item => item.path === `${dirname(record.path)}/${screenshot.path}`); assert.ok(capture);
      assert.equal(capture.sha256, screenshot.sha256); assert.equal(capture.bytes, screenshot.bytes); assert.equal(capture.width, proof.width); assert.equal(capture.height, proof.height);
    }
  }
  assert.equal(verification.visualReview.authority, 'agent');
  for (const prefix of ['desktop-', 'mobile-']) assert.ok(verification.visualReview.capturePaths.some(capture => capture.split('/').at(-1).startsWith(prefix)));
  for (const capturePath of verification.visualReview.capturePaths) assert.ok(manifest.captures.some(capture => capture.path === capturePath));
  return unavailable;
}

const suiteQualityAcceptanceChecks = ['engineering-52-settings', 'suite-quality-headline', 'suite-quality-settings', 'original-quality-assessments', 'pilot-remains-separate', 'report-section-links', 'native-details-keyboard', 'ledger-navigation', 'browser-history', 'overall-excludes-backend-testing', 'hyper-scale-chat-report', 'no-root-overflow'];
const currentTestingAcceptanceChecks = ['engineering-52-settings', 'paired-repair-comparison', 'paired-repair-evidence', 'report-section-links', 'native-details-keyboard', 'ledger-navigation', 'browser-history', 'overall-excludes-backend-testing', 'hyper-scale-chat-report', 'no-root-overflow'];

function assertSuiteQualityAcceptanceBoundaries({ selected, previousSelection, before, data, beforeResponses, responses, compactPlan }) {
  if (selected.schemaVersion === 4) {
    assert.equal(selected.kind, 'vasirbenchmark-backend-testing-selection');
    assert.deepEqual(Object.keys(selected).sort(), ['kind', 'schemaVersion', 'plan', 'skill', 'rubric', 'generation', 'reviewPlan', 'packet', 'mapping', 'review', 'authors', 'judges'].sort());
    assert.equal(selected.authors.length, 8); assert.equal(selected.judges.length, 2);
    const sources = [...['plan', 'skill', 'rubric', 'generation', 'reviewPlan', 'packet', 'mapping', 'review'].map(key => selected[key]), compactPlan.sourceAuthorPlan, compactPlan.fixture, ...selected.authors.flatMap(author => [author.receipt, author.launch, author.outcome, ...(author.verification ? [author.verification] : [])]), ...selected.judges.flatMap(judge => [judge.receipt, judge.launch, ...(judge.validated ? [judge.validated] : [])])];
    for (const source of sources) {
      assert.deepEqual(Object.keys(source).sort(), ['path', 'sha256']);
      assert.ok(source.path.startsWith('.agents/vasir-evals/backend-testing/') && source.path.split('/').every(segment => segment && segment !== '.' && segment !== '..'));
      assert.match(source.sha256, /^[a-f0-9]{64}$/);
    }
    assert.equal(new Set(sources.map(source => source.path)).size, sources.length);
    assert.equal(data.executableTesting.schemaVersion, 4);
    const withoutData = ({ executableTesting, ...other }) => other;
    assert.deepEqual(withoutData(data), withoutData(before), 'Other benchmark data must be unchanged.');
    const { backendTestingCurrentRound, backendTestingFiles, ...otherResponses } = responses;
    assert.equal(backendTestingCurrentRound?.kind, 'backend-testing-current-round');
    assert.equal(backendTestingFiles?.kind, 'backend-testing-files');
    assert.deepEqual(otherResponses, beforeResponses, 'Only the selected current backend round may be published.');
    return sources;
  }
  if (selected.schemaVersion === 3) {
    assert.equal(selected.kind, 'vasirbenchmark-backend-testing-selection');
    assert.deepEqual(Object.keys(selected).sort(), ['kind', 'schemaVersion', 'pairedRepair', 'rubric', ...(selected.taste ? ['taste'] : [])].sort());
    const paired = selected.pairedRepair;
    assert.deepEqual(Object.keys(paired).sort(), ['plan', 'skill', 'generation', 'review', 'mapping', 'authors', 'judges'].sort());
    assert.equal(paired.authors.length, 8); assert.equal(paired.judges.length, 2);
    const sources = [selected.rubric, ...['plan', 'skill', 'generation', 'review', 'mapping'].map(key => paired[key]), ...paired.authors.flatMap(author => [author.receipt, author.launch, author.outcome, ...(author.verification ? [author.verification] : [])]), ...paired.judges.flatMap(judge => [judge.receipt, judge.launch, ...(judge.validated ? [judge.validated] : [])])];
    if (selected.taste) {
      assert.deepEqual(Object.keys(selected.taste).sort(), ['plan', 'packet', 'mapping', 'summary', 'judges', ...(selected.taste.rubric ? ['rubric'] : []), ...(selected.taste.retry ? ['retry'] : [])].sort());
      assert.equal(selected.taste.judges.length, 2);
      if (selected.taste.retry) assert.deepEqual(Object.keys(selected.taste.retry).sort(), ['amendment', 'priorReceipt', 'priorLaunch'].sort());
      sources.push(...(selected.taste.rubric ? [selected.taste.rubric] : []), ...['plan', 'packet', 'mapping', 'summary'].map(key => selected.taste[key]), ...(selected.taste.retry ? ['amendment', 'priorReceipt', 'priorLaunch'].map(key => selected.taste.retry[key]) : []), ...selected.taste.judges.flatMap(judge => [judge.receipt, judge.launch, ...(judge.validated ? [judge.validated] : [])]));
    }
    for (const source of sources) {
      assert.deepEqual(Object.keys(source).sort(), ['path', 'sha256']);
      assert.ok(source.path.startsWith('.agents/vasir-evals/backend-testing/') && source.path.split('/').every(segment => segment && segment !== '.' && segment !== '..'));
      assert.match(source.sha256, /^[a-f0-9]{64}$/);
    }
    assert.equal(new Set(sources.map(source => source.path)).size, sources.length);
    assert.equal(data.executableTesting.schemaVersion, 3);
    for (const field of ['suiteQuality', 'faultDetectionPilot', 'repairCheck']) assert.equal(data.executableTesting[field], undefined, 'Historical backend results must not be published.');
    const withoutData = ({ executableTesting, ...other }) => other;
    assert.deepEqual(withoutData(data), withoutData(before), 'Other benchmark data must be unchanged.');
    const { backendTestingPairedRepair, backendTestingTaste, backendTestingFiles, ...otherResponses } = responses;
    assert.ok(backendTestingPairedRepair); assert.equal(Boolean(backendTestingTaste), Boolean(selected.taste));
    if (data.executableTesting.overall) assert.equal(backendTestingFiles?.kind, 'backend-testing-files');
    assert.deepEqual(otherResponses, beforeResponses, 'Only current backend responses may be added to the incumbent bundle.');
    return sources;
  }
  assert.deepEqual(Object.keys(selected).sort(), ['kind', 'schemaVersion', 'suiteQuality', 'faultDetectionPilot', ...(selected.repairCheck ? ['repairCheck'] : []), ...(selected.pairedRepair ? ['pairedRepair'] : [])].sort());
  assert.equal(selected.kind, 'vasirbenchmark-backend-testing-selection'); assert.equal(selected.schemaVersion, 2);
  assert.equal(previousSelection.schemaVersion, 1);
  assert.deepEqual(selected.faultDetectionPilot, previousSelection, 'The original pilot selection must remain byte-equivalent.');
  assert.deepEqual(Object.keys(selected.suiteQuality).sort(), ['evaluation', 'generation', 'judging', 'rubric']);
  const sources = [...['generation', 'evaluation', 'judging', 'rubric'].map(key => selected.suiteQuality[key]), previousSelection.generation, previousSelection.evaluation];
  if (selected.repairCheck) {
    const repair = selected.repairCheck;
    assert.deepEqual(Object.keys(repair).sort(), ['plan', 'report', 'reviewSummary', 'skill', 'verification', 'authors', 'judges'].sort());
    assert.equal(repair.authors.length, 4); assert.equal(repair.judges.length, 2);
    sources.push(...['plan', 'report', 'reviewSummary', 'skill', 'verification'].map(key => repair[key]), ...repair.authors, ...repair.judges.flatMap(judge => [judge.receipt, judge.validated]));
  }
  if (selected.pairedRepair) {
    const paired = selected.pairedRepair;
    assert.deepEqual(Object.keys(paired).sort(), ['plan', 'skill', 'generation', 'review', 'mapping', 'authors', 'judges'].sort());
    assert.equal(paired.authors.length, 8); assert.equal(paired.judges.length, 2);
    sources.push(...['plan', 'skill', 'generation', 'review', 'mapping'].map(key => paired[key]), ...paired.authors.flatMap(author => [author.receipt, author.launch, author.outcome, ...(author.verification ? [author.verification] : [])]), ...paired.judges.flatMap(judge => [judge.receipt, judge.launch, ...(judge.validated ? [judge.validated] : [])]));
  }
  for (const source of sources) {
    assert.deepEqual(Object.keys(source).sort(), ['path', 'sha256']);
    assert.ok(source.path.startsWith('.agents/vasir-evals/backend-testing/') && source.path.split('/').every(segment => segment && segment !== '.' && segment !== '..'), 'Every selected source must remain in the private benchmark archive.');
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
  }
  assert.equal(new Set(sources.map(source => source.path)).size, sources.length, 'All source pins must identify distinct archived files.');
  assert.equal(before.schemaVersion, 7); assert.equal(data.schemaVersion, 7);
  assert.equal(before.executableTesting.schemaVersion, 1); assert.equal(data.executableTesting.schemaVersion, 2);
  assert.deepEqual(data.executableTesting.faultDetectionPilot, before.executableTesting, 'The published pilot must remain byte-equivalent.');
  const incumbentData = ({ executableTesting, ...incumbent }) => incumbent;
  assert.deepEqual(incumbentData(data), incumbentData(before), 'Every incumbent projection must remain unchanged.');
  assert.equal(beforeResponses.backendTesting, undefined);
  const { backendTesting, backendTestingRepair, backendTestingPairedRepair, ...incumbentResponses } = responses;
  assert.equal(Boolean(backendTestingRepair), Boolean(selected.repairCheck));
  assert.equal(Boolean(backendTestingPairedRepair), Boolean(selected.pairedRepair));
  assert.equal(backendTesting?.kind, 'vasirbenchmark-backend-testing-assessments');
  assert.deepEqual(incumbentResponses, beforeResponses, 'Existing public answers and reviews must remain unchanged.');
  return sources;
}

async function assertSolArchitectureAppend({ verification, data, taskData, responses, taskResponses }) {
  const append = verification.architectureAppend, configurationId = 'codex:gpt-6.1-sol@xhigh';
  assert.equal(append.configurationId, configurationId);
  assert.deepEqual(append.benchmarkIds, ['hyper-scale-chat', 'personalized-home-feed', 'device-telemetry']);
  await assertLockedFile(append.plan, repoRoot);
  const previousSelection = JSON.parse(await assertLockedFile(append.previousSelection));
  const selection = JSON.parse(await assertLockedFile(append.selection, repoRoot));
  assert.deepEqual(selection.workSpecRun, previousSelection.workSpecRun);
  assert.equal(selection.pendingArchitectureRuns, undefined);
  assert.equal(data.architecturePending, undefined); assert.equal(responses.architecturePending, undefined);
  const omitArchitectureSelection = ({ selectedRuns, pendingArchitectureRuns, ...remaining }) => remaining;
  assert.deepEqual(omitArchitectureSelection(selection), omitArchitectureSelection(previousSelection));
  assert.deepEqual(selection.selectedRuns.map(run => run.benchmarkId), append.benchmarkIds);
  for (const current of selection.selectedRuns) {
    const old = previousSelection.selectedRuns.find(run => run.benchmarkId === current.benchmarkId);
    const oldBytes = await readFile(join(repoRoot, old.runPath)), currentBytes = await readFile(join(repoRoot, current.runPath));
    assert.equal(sha256(oldBytes), old.sha256); assert.equal(sha256(currentBytes), current.sha256); assert.notEqual(current.sha256, old.sha256);
    const source = JSON.parse(oldBytes), run = JSON.parse(currentBytes);
    assert.equal(source.rows.length, 104); assert.equal(run.rows.length, 106);
    assert.equal(run.extension.sourceRunId, source.runId); assert.deepEqual(run.extension.extendedConfigurationIds, [configurationId]);
    assert.deepEqual(run.benchmark, source.benchmark); assert.deepEqual(run.treatment, source.treatment); assert.deepEqual(run.conditions, source.conditions);
    assert.equal(run.runStatus, 'complete'); assert.equal(run.judging.status, 'complete');
    assert.equal(run.configurations.length, 53);
    for (const configuration of source.configurations) assert.deepEqual(run.configurations.find(row => row.id === configuration.id), configuration);
    for (const row of source.rows) assert.deepEqual(run.rows.find(currentRow => currentRow.rowKey === row.rowKey), row, 'An original architecture answer, usage or score changed.');
    const added = run.rows.filter(row => row.configurationId === configurationId);
    assert.equal(added.length, 2); assert.ok(added.every(row => row.rowStatus === 'complete' && row.outputText.trim() && Number.isFinite(row.score.total)));
  }
  for (const key of ['testAuthoring', 'executableTesting', ...(!verification.writingAppend ? ['writing'] : []), 'aiWorkflows', 'games']) assert.deepEqual(data[key], taskData[key], `${key} must remain exact.`);
  const cellKey = row => `${row.configurationId}|${row.condition}|${row.benchmarkId}`;
  for (const cell of taskData.benchmarkResults) assert.deepEqual(data.benchmarkResults.find(row => cellKey(row) === cellKey(cell)), cell);
  for (const setting of taskData.settings) assert.deepEqual(data.settings.find(row => row.configurationId === setting.configurationId), setting);
  assert.equal(data.settings.length, 53); assert.equal(data.benchmarkResults.length, 318);
  const responseKey = row => `${cellKey(row)}|${row.trialNumber}`;
  for (const response of taskResponses.responses) assert.deepEqual(responses.responses.find(row => responseKey(row) === responseKey(response)), response, 'Every old answer and raw judge reason remains exact.');
  for (const messages of taskResponses.messageSets) assert.deepEqual(responses.messageSets.find(row => row.id === messages.id), messages);
  const withoutArchitecture = ({ counts, responses: architectureResponses, messageSets, architecturePending, ...remaining }) => remaining;
  assert.deepEqual(withoutArchitecture(responses), withoutArchitecture(taskResponses));
  const addedResponses = responses.responses.filter(row => row.configurationId === configurationId);
  assert.equal(addedResponses.length, 6); assert.ok(addedResponses.every(row => append.benchmarkIds.includes(row.benchmarkId) && row.outputText.trim() && row.judgments.length === 2));
  assert.equal(responses.responses.length, taskResponses.responses.length + 6);
  assert.equal(taskResponses.architecturePending.responses.length, 6);
  for (const previous of taskResponses.architecturePending.responses) {
    const current = addedResponses.find(row => responseKey(row) === responseKey(previous));
    assert.ok(current); assert.equal(current.outputText, previous.outputText);
    assert.deepEqual(current.judgments.find(judge => judge.judgeConfigurationId === 'codex:gpt-6-astra@xhigh'), previous.judgments[0], 'The original completed Astra review must be reused exactly.');
    assert.deepEqual(responses.messageSets.find(messages => messages.id === current.messageSetId).messages, taskResponses.architecturePending.messageSets.find(messages => messages.id === previous.messageSetId).messages, 'The exact saved input messages must remain unchanged across the pending and canonical response channels.');
  }

  assert.deepEqual(data.engineering.settings.map(row => row.configurationId).sort(), taskData.engineering.settings.map(row => row.configurationId).sort());
  assert.deepEqual(data.overall.settings.map(row => row.configurationId).sort(), taskData.overall.settings.map(row => row.configurationId).sort());
  for (const [aggregate, previous, expected] of [[data.engineering, taskData.engineering, 5], [data.overall, taskData.overall, verification.writingAppend ? 8 : 5]]) {
    assert.equal(aggregate.settings.find(row => row.configurationId === configurationId).completedTaskCount, expected);
    for (const entry of previous.entries.filter(row => row.configurationId !== configurationId)) assert.equal(aggregate.entries.find(row => row.configurationId === entry.configurationId && row.condition === entry.condition).exactScore, entry.exactScore, 'Only Sol aggregates may change.');
  }
  const previousAcceptance = JSON.parse(await assertLockedFile(verification.aggregateBaseline.acceptance));
  const deploymentPin = previousAcceptance.files.find(file => file.path === 'deployment.json');
  assert.deepEqual(await assertLockedFile(deploymentPin), await readFile(join(siteRoot, 'deployment.json')), 'Append keeps every accepted deployment limit unchanged.');
}

async function assertSolWritingAppend({ verification, data, responses, readModule }) {
  const append = verification.writingAppend, configurationId = 'codex:gpt-6.1-sol@xhigh';
  assert.equal(append.configurationId, configurationId);
  assert.deepEqual(append.benchmarkIds, storyBenchmarks);
  const baseline = append.baseline, accepted = JSON.parse(await assertLockedFile(baseline.acceptance, repoRoot));
  assert.equal(accepted.status, 'accepted'); assert.equal(accepted.acceptance.scope.schemaVersion, 10);
  const previousData = readModule(await assertLockedFile(baseline.data, repoRoot), 'VASIR_DATA');
  const previousResponses = readModule(await assertLockedFile(baseline.responses, repoRoot), 'VASIR_RESPONSES');
  const omitWriting = ({ writing, overall, ...remaining }) => remaining;
  assert.deepEqual(omitWriting(data), omitWriting(previousData), 'Every non-Writing task and the whole Engineering projection remain exact.');
  assert.deepEqual(responses, previousResponses, 'Every architecture answer, review and testing artifact remains exact.');
  assert.deepEqual(JSON.parse(await assertLockedFile(baseline.architectureSelection, repoRoot)), JSON.parse(await readFile(join(repoRoot, 'benchmarks/public-results.json'), 'utf8')));
  assert.deepEqual(await assertLockedFile(baseline.dungeonResponses, repoRoot), await readFile(join(siteRoot, 'writing-dungeon-master-responses.js')));
  assert.deepEqual(append.selections.map(record => record.path), append.benchmarkIds.map(id => `benchmarks/${id}/publication.json`));
  for (const selection of append.selections) await assertLockedFile(selection, repoRoot);
  assert.equal(append.previousSelections.length, 3); for (const selection of append.previousSelections) await assertLockedFile(selection, repoRoot);
  const moduleFor = async (pin, globalName) => readModule(await assertLockedFile(pin, repoRoot), globalName);
  const previousWriting = await moduleFor(baseline.writingData, 'VASIR_WRITING');
  const writing = readModule(await readFile(join(siteRoot, 'writing-data.js')), 'VASIR_WRITING');
  const publications = root => [root, ...root.benchmarkPublications.map(child => child.projection)];
  assert.deepEqual(publications(writing).map(publication => publication.benchmarks[0].id), append.benchmarkIds);
  assert.deepEqual(writing.writingScoreBasis, previousWriting.writingScoreBasis);
  const oldBundles = [await moduleFor(baseline.writingResponses, 'VASIR_WRITING_RESPONSES'), await moduleFor(baseline.twistsResponses, 'VASIR_WRITING_TWISTS_RESPONSES'), await moduleFor(baseline.creationResponses, 'VASIR_WRITING_CREATION_RESPONSES')];
  const currentBundles = await Promise.all(['writing-responses.js', 'writing-twists-responses.js', 'writing-creation-responses.js'].map(async (file, index) => readModule(await readFile(join(siteRoot, file)), ['VASIR_WRITING_RESPONSES', 'VASIR_WRITING_TWISTS_RESPONSES', 'VASIR_WRITING_CREATION_RESPONSES'][index])));
  const identity = row => `${row.configurationId}|${row.condition}|${row.caseId}|${row.trialNumber ?? 1}`;
  const omitSourceFingerprint = (response, index) => ({ ...response, provenance: Object.fromEntries(Object.entries(response.provenance).filter(([key]) => !['sourceSha256', 'judgingSha256', ...(index === 1 ? ['manifestSha256'] : [])].includes(key))) });
  for (const [index, previous] of publications(previousWriting).entries()) {
    const current = publications(writing)[index];
    assert.deepEqual(current.cases, previous.cases); assert.deepEqual(current.conditions, previous.conditions);
    if (index === 1) for (const publication of [previous, current]) assert.equal(publication.scoreBasis.id, `${publication.scoreBasis.edition}:${publication.scoreBasis.sourceSha256}`);
    const rubric = basis => Object.fromEntries(Object.entries(basis).filter(([key]) => !['sourceSha256', 'judgingSha256', 'manifestSha256', 'sourcePins', 'coverage', ...(index === 1 ? ['id'] : [])].includes(key)));
    assert.deepEqual(rubric(current.scoreBasis), rubric(previous.scoreBasis), 'Original Writing score formulas and panels remain exact.');
    assert.deepEqual(current.methodology.derivedScoreBasis, previous.methodology.derivedScoreBasis);
    assert.deepEqual(current.settings.map(row => row.configurationId).sort(), [...previous.settings.map(row => row.configurationId), configurationId].sort());
    for (const cell of previous.caseResults) assert.deepEqual(current.caseResults.find(row => identity(row) === identity(cell)), cell, 'Every original case score and resource record remains exact.');
    for (const entry of previous.entries) assert.equal(current.entries.find(row => row.configurationId === entry.configurationId && row.condition === entry.condition)?.exactScore, entry.exactScore);
    for (const response of oldBundles[index].responses) {
      const currentResponse = currentBundles[index].responses.find(row => identity(row) === identity(response));
      if (index === 1) assert.equal(currentResponse.provenance.manifestSha256, currentBundles[index].sourceContract.manifestSha256);
      assert.deepEqual(omitSourceFingerprint(currentResponse, index), omitSourceFingerprint(response, index), 'Original answer bytes, inputs, reviews and runtime facts remain exact.');
    }
    for (const messages of oldBundles[index].messageSets) assert.deepEqual(currentBundles[index].messageSets.find(row => row.id === messages.id), messages);
    for (const request of oldBundles[index].judgeRequests ?? []) assert.deepEqual(currentBundles[index].judgeRequests.find(row => row.id === request.id), request);
    assert.deepEqual(currentBundles[index].headToHeads, oldBundles[index].headToHeads, 'Pinned non-scoring comparisons remain exact.');
    const cases = current.methodology.derivedScoreBasis?.caseIds ?? current.cases.map(story => story.id);
    const target = current.caseResults.filter(row => row.configurationId === configurationId && cases.includes(row.caseId));
    assert.equal(target.length, [22, 2, 6][index]); assert.ok(target.every(row => row.coverage.completedJudgments === [1, 2, 4][index]));
    for (const condition of ['baseline', 'skill']) {
      const scores = target.filter(row => row.condition === condition).map(row => index === 0 ? currentBundles[index].responses.find(response => identity(response) === identity(row)).judgments.find(judge => judge.judgeConfigurationId === 'codex:gpt-6-astra@xhigh').score : row.exactScore);
      assert.ok(scores.every(Number.isFinite));
      const source = data.writing.overallSource.benchmarkResults.find(row => row.configurationId === configurationId && row.condition === condition && row.benchmarkId === append.benchmarkIds[index]);
      assert.ok(source); assert.ok(Math.abs(source.exactScore - scores.reduce((sum, score) => sum + score, 0) / scores.length) < 1e-9);
    }
  }
  for (const entry of previousData.overall.entries.filter(row => row.configurationId !== configurationId)) assert.equal(data.overall.entries.find(row => row.configurationId === entry.configurationId && row.condition === entry.condition)?.exactScore, entry.exactScore, 'Only Sol Overall scores may change.');
  for (const condition of ['baseline', 'skill']) {
    const entry = data.overall.entries.find(row => row.configurationId === configurationId && row.condition === condition);
    assert.equal(entry.completedTaskCount, 8); assert.equal(entry.expectedTaskCount, 9);
    assert.deepEqual(entry.categories.filter(row => row.available).map(row => row.category), ['engineering', 'writing']);
  }
  assert.equal(append.handoffs.length, 3); for (const handoff of append.handoffs) await assertLockedFile(handoff, repoRoot);
  for (const source of append.parentSourcePins) await assertLockedFile(source, repoRoot);
  const usage = JSON.parse(await assertLockedFile(append.taskUsage, repoRoot));
  assert.equal(usage.status, 'complete'); assert.equal(usage.completedValidCalls, 55); assert.equal(usage.maximumNativeAttempts, 56);
  assert.equal(usage.excludedOperationalUsage.length, 1); assert.equal(usage.excludedOperationalUsage[0].usage.totalTokens, 391916);
}


function assertSuiteQualityBrowserProof(proof, expected) {
  assert.equal(proof.kind, 'vasirbenchmark-backend-testing-browser-proof'); assert.equal(proof.status, 'passed');
  assert.equal(proof.publicationSchemaVersion, expected.schemaVersion ?? 2);
  assert.notEqual(proof.notAcceptanceEvidence, true, 'Layout rehearsal cannot establish final acceptance.');
  assert.equal(proof.previewState, undefined, 'Preview state cannot establish final acceptance.');
  for (const key of ['width', 'height', 'harnessSha256', 'publicationSha256', 'overallSha256']) assert.equal(proof[key], expected[key], `${key} must match the accepted candidate.`);
  if (expected.pairedRepair) assert.equal(proof.pairedRepairSha256, expected.pairedRepairSha256, 'Paired follow-up proof must match the selected public evidence.');
  if (expected.taste) assert.equal(proof.tasteSha256, expected.tasteSha256, 'Craft review proof must match the selected original judgments.');
  if (expected.currentRoundSha256) assert.equal(proof.currentRoundSha256, expected.currentRoundSha256, 'Compact-round proof must match the exact selected native reviews.');
  if (expected.backendTestingOverallSha256) assert.equal(proof.backendTestingOverallSha256, expected.backendTestingOverallSha256, 'Combined-score proof must match the exact selected arithmetic.');
  if (expected.backendTestingFilesSha256) assert.equal(proof.backendTestingFilesSha256, expected.backendTestingFilesSha256, 'File inspection proof must match the exact public test source.');
  if (expected.testAuthoring) {
    assert.equal(proof.benchmarkId, 'test-authoring');
    for (const key of ['testAuthoringRoundSha256', 'testAuthoringOverallSha256', 'testAuthoringFilesSha256', 'incumbentBackendSha256']) assert.equal(proof[key], expected[key], `${key} must match the selected source and unchanged incumbent.`);
  }
  if (expected.integrated) {
    assert.equal(proof.engineeringSha256, expected.engineeringSha256, 'Combined Engineering proof must bind the exact new aggregate.');
    const integration = proof.aggregateIntegration;
    assert.equal(integration?.engineeringSha256, expected.engineeringSha256);
    assert.equal(integration?.sourceTaskScoresVerified, true);
    if (expected.manualInspection) {
      assert.deepEqual(integration.manualInspection.plain, { strips: 0, selectedRows: 0, pressedRows: 0 });
      assert.deepEqual(integration.manualInspection.query, { strips: 0, selectedRows: 0, pressedRows: 0 });
      assert.equal(integration.manualInspection.closedAfterSelection, true);
      assert.equal(integration.manualInspection.userClickRevealed, true);
      assert.equal(integration.overallPartialLink.initialBreakdownAbsent, true);
    }

    if (expected.available) {
      assert.equal(integration?.availableCoverage, true);
      for (const field of ['pairedCoverageVerified', 'equalAvailableTaskMeanVerified', 'categoryRenormalizationVerified']) assert.equal(integration[field], true);
      assert.equal(integration.mainRows.length, 53); assert.equal(integration.overallMainRows.length, 56);
      assert.ok(integration.mainRows.every(row => row.visible && row.count > 0 && row.expected === 5));
      assert.ok(integration.overallMainRows.every(row => row.visible && row.count > 0 && row.expected === 9));
      assert.equal(integration.calculation.configurationId, 'codex:gpt-6.1-sol@xhigh');
      assert.equal(integration.calculation.rows.filter(row => row.weight > 0).length, expected.architectureAppend ? 5 : 2);
      if (expected.architectureAppend) {
        assert.equal(integration.architectureAppended, true); assert.equal(integration.solCompletedTaskCount, 5);
        assert.deepEqual(integration.architectureReports.map(report => report.benchmarkId), ['hyper-scale-chat', 'personalized-home-feed', 'device-telemetry']);
        assert.ok(integration.architectureReports.every(report => report.answers === 2 && report.judgments === 4 && report.exactSourceMatches && report.deepLinkOpened && report.copyMatches));
        assert.equal(integration.overallSolCoverage.count, expected.writingAppend ? 8 : 5); assert.ok(integration.overallSolCoverage.label.includes(expected.writingAppend ? '8/9 tests' : '5/9 tests'));
      }
      if (expected.writingAppend) {
        assert.equal(integration.writingAppend.completedWritingTasks, 3); assert.equal(integration.writingAppend.sourceMatches, true);
        assert.deepEqual(integration.writingAppend.components.map(row => row.benchmarkId), storyBenchmarks);
        assert.deepEqual(integration.writingAppend.reports.map(row => row.benchmarkId), storyBenchmarks);
        assert.deepEqual(integration.writingAppend.reports.map(row => row.judgments), [2, 4, 8]);
        assert.ok(integration.writingAppend.reports.every(row => row.answers === 2 && row.exactSourceMatches && row.deepLinkOpened && row.copyMatches));
      }
      if (expected.pendingArchitecture) {
        assert.equal(integration.pendingArchitecture.descriptorSha256, expected.pendingDescriptorSha256);
        assert.equal(integration.pendingArchitectureResponsesSha256, expected.pendingResponsesSha256);
        assert.deepEqual(integration.pendingArchitectureReports.map(report => report.benchmarkId), ['hyper-scale-chat', 'personalized-home-feed', 'device-telemetry']);
        assert.ok(integration.pendingArchitectureReports.every(report => report.answers === 2 && report.judgments === 2 && report.finalScores === null && report.exactSourceMatches && report.exactPromptsMatch && report.copyMatches && report.deepLinkOpened));
        assert.ok(integration.calculation.rows.filter(row => row.weight === 0).every(row => row.pendingReview && row.text.includes('Awaiting review')));
      }
    } else {
      assert.equal(integration?.fullPairEligibilityVerified, true);
      assert.equal(integration?.equalTaskMeanVerified, true);
    }
    assert.equal(integration?.calculation.rows.length, 5, 'The displayed breakdown must contain all five task scores.');
    assert.equal(integration?.coverage.count, expected.architectureAppend ? 49 : 50);
    const solCoverage = expected.architectureAppend ? '5/5 tests' : expected.available ? '2/5 tests' : '2/5 tests · unranked';
    assert.ok(integration?.coverage.label.includes(solCoverage));
    assert.ok(integration?.overallPartialLink.label.includes(solCoverage), 'Overall category links must retain the requested setting.');
    for (const id of ['test-authoring', 'backend-testing']) assert.ok(integration?.reportInclusion[id].footer.includes('Included in Engineering and Overall'));
  }
  for (const field of ['failures', 'runtimeErrors', 'networkErrors']) assert.deepEqual(proof[field], []);
  const expectedChecks = expected.testAuthoring || [3, 4].includes(expected.schemaVersion) ? [...currentTestingAcceptanceChecks, ...(expected.testAuthoring || expected.taste || expected.schemaVersion === 4 ? ['taste-comparison', 'taste-evidence'] : [])] : [...suiteQualityAcceptanceChecks, ...(expected.repairCheck ? ['repair-outcomes-and-limits', 'repair-review-and-budget-evidence'] : []), ...(expected.pairedRepair ? ['paired-repair-comparison', 'paired-repair-evidence'] : [])];
  const requiredChecks = expected.integrated ? expectedChecks.map(id => ({ 'engineering-52-settings': 'engineering-all-benchmarks', 'overall-excludes-backend-testing': 'overall-includes-testing' }[id] || id)) : expectedChecks;
  assert.deepEqual(proof.checks.map(check => check.id).sort(), requiredChecks.sort());
  for (const check of proof.checks) { assert.equal(check.passed, true, check.id); assert.ok(check.evidence != null && JSON.stringify(check.evidence) !== '{}', `${check.id} needs observed evidence`); }
}

async function assertSuiteQualityTestingEvidence(manifest, deployment) {
  const authoring = manifest.acceptance.scope.benchmarkId === 'test-authoring';
  const integrated = authoring && [6, 7, 9, 10, 11].includes(manifest.acceptance.scope.schemaVersion);
  const available = integrated && [7, 9, 10, 11].includes(manifest.acceptance.scope.schemaVersion);
  const pendingArchitecture = integrated && manifest.acceptance.scope.schemaVersion === 9;
  const architectureAppend = integrated && [10, 11].includes(manifest.acceptance.scope.schemaVersion);
  const writingAppend = integrated && manifest.acceptance.scope.schemaVersion === 11;
  assert.equal(Boolean(manifest.acceptance.verification.writingAppend), writingAppend);
  assert.ok(authoring ? [5, 6, 7, 9, 10, 11].includes(manifest.acceptance.scope.schemaVersion) : [2, 3, 4].includes(manifest.acceptance.scope.schemaVersion));
  assert.deepEqual(manifest.acceptance.scope, { kind: 'executable-testing-benchmark', schemaVersion: manifest.acceptance.scope.schemaVersion, benchmarkId: authoring ? 'test-authoring' : 'backend-testing', viewports: focusedViewports });
  const verification = manifest.acceptance.verification, previous = JSON.parse(await assertLockedFile(verification.previousAcceptance));
  assert.equal(previous.kind, 'vasirbenchmark-site-template-lock'); assert.equal(previous.status, 'accepted');
  assert.equal(previous.acceptance.scope.kind, 'executable-testing-benchmark'); assert.equal(previous.acceptance.scope.schemaVersion, authoring ? 4 : 1);
  assert.equal(manifest.retainedCaptureEvidence.version, previous.version);
  assert.deepEqual(manifest.retainedCaptureEvidence.receipt, verification.previousAcceptance);
  assert.deepEqual(manifest.files.map(file => file.path).sort(), previous.files.map(file => file.path).sort(), 'Suite-quality publication adds no new assets.');
  const changed = manifest.files.filter(file => file.sha256 !== previous.files.find(prior => prior.path === file.path)?.sha256);
  assert.ok(changed.every(file => ['app.js', 'benchmark-report.js', 'benchmark-report.css', 'backend-testing-browsercheck.mjs'].includes(file.path) || (authoring && file.path === 'style.css') || (available && file.path === 'deployment.json')), 'Unrelated presentation or deployment drift.');
  assert.deepEqual(verification.previousFiles.map(record => record.sourcePath).sort(), changed.map(file => file.path).sort());
  for (const record of verification.previousFiles) {
    const bytes = await assertLockedFile(record), prior = previous.files.find(file => file.path === record.sourcePath);
    assert.equal(bytes.length, prior.bytes); assert.equal(sha256(bytes), prior.sha256);
  }
  for (const file of manifest.files.filter(file => !changed.includes(file))) assert.deepEqual(file, previous.files.find(prior => prior.path === file.path));
  for (const capture of previous.captures) await assertCapture(capture);
  const previousData = await assertLockedFile(verification.previousData), previousDataPin = previous.acceptance.verification.generatedFiles.find(file => file.path === 'data.js');
  assert.equal(previousData.length, previousDataPin.bytes); assert.equal(sha256(previousData), previousDataPin.sha256);
  const previousResponses = await assertLockedFile(verification.previousResponses), previousSelectionBytes = await assertLockedFile(verification.previousSelection);
  const previousCandidate = JSON.parse(await assertLockedFile(previous.acceptance.verification.candidate)), previousResponsePin = previousCandidate.files.find(file => file.path === 'responses.js');
  assert.ok(previousResponsePin); assert.equal(previousResponses.length, previousResponsePin.bytes); assert.equal(sha256(previousResponses), previousResponsePin.sha256);
  const priorSelectionPin = previous.acceptance.verification.selection;
  assert.equal(previousSelectionBytes.length, priorSelectionPin.bytes); assert.equal(sha256(previousSelectionBytes), priorSelectionPin.sha256);
  assert.deepEqual(verification.generatedFiles.map(file => file.path), writingAppend ? ['data.js', 'responses.js', 'writing-data.js', 'writing-responses.js', 'writing-creation-responses.js', 'writing-twists-responses.js', 'writing-dungeon-master-responses.js'] : ['data.js', 'responses.js']);
  const readModule = (bytes, globalName) => { const context = { window: {} }; vm.runInNewContext(bytes.toString('utf8'), context); return JSON.parse(JSON.stringify(context.window[globalName])); };
  const before = readModule(previousData, 'VASIR_DATA'), beforeResponses = readModule(previousResponses, 'VASIR_RESPONSES');
  const data = readModule(await assertLockedFile(verification.generatedFiles[0]), 'VASIR_DATA'), responses = readModule(await assertLockedFile(verification.generatedFiles[1]), 'VASIR_RESPONSES');
  assert.equal(verification.selection.path, authoring ? 'benchmarks/test-authoring/publication.json' : 'benchmarks/backend-testing/publication.json');
  const selected = JSON.parse(await assertLockedFile(verification.selection, repoRoot)), previousSelection = JSON.parse(previousSelectionBytes);
  if (verification.manualInspection) {
    const manual = verification.manualInspection, priorManual = JSON.parse(await assertLockedFile(manual.previousAcceptance, repoRoot));
    assert.equal(priorManual.status, 'accepted'); assert.equal(priorManual.acceptance.scope.schemaVersion, 10);
    for (const [name, content] of [['data', data], ['responses', responses]]) {
      const previousModule = await assertLockedFile(manual[name], repoRoot);
      const old = readModule(previousModule, name === 'data' ? 'VASIR_DATA' : 'VASIR_RESPONSES');
      const invariant = value => writingAppend && name === 'data' ? Object.fromEntries(Object.entries(value).filter(([key]) => !['writing', 'overall'].includes(key))) : value;
      assert.deepEqual(invariant(old), invariant(content), 'Manual inspection changes no score or source data outside the separately verified Writing append.');
      assert.equal(priorManual.acceptance.verification.generatedFiles.find(file => file.path === `${name}.js`).sha256, manual[name].sha256);
    }
    assert.deepEqual(JSON.parse(await assertLockedFile(manual.selection, repoRoot)), JSON.parse(await readFile(join(repoRoot, 'benchmarks/public-results.json'), 'utf8')));
  }
  if (writingAppend) await assertSolWritingAppend({ verification, data, responses, readModule });

  const compactPlan = authoring || selected.schemaVersion === 4 ? JSON.parse(await assertLockedFile(verification.sourcePins.find(record => record.path === selected.plan.path && record.sha256 === selected.plan.sha256), repoRoot)) : undefined;
  const selectedSources = authoring ? await (async () => {
    const { testAuthoring, schemaVersion, ...incumbent } = data;
    assert.equal(schemaVersion, integrated ? 9 : 8);
    if (integrated) {
      const baseline = verification.aggregateBaseline;
      assert.ok(baseline, 'Combined Engineering requires its pinned previous task data.');
      const taskData = readModule(await assertLockedFile(baseline.data), 'VASIR_DATA');
      const taskResponses = readModule(await assertLockedFile(baseline.responses), 'VASIR_RESPONSES');
      const omitAggregates = ({ engineering, overall, schemaVersion: aggregateSchema, ...tasks }) => tasks;
      if (architectureAppend) await assertSolArchitectureAppend({ verification, data, taskData, responses, taskResponses });
      else if (pendingArchitecture) {
        const { architecturePending: descriptor, ...officialData } = data;
        const { architecturePending: appendix, ...officialResponses } = responses;
        assert.deepEqual(officialData, taskData, 'Pending answers must leave every official score, rank, identity and aggregate exact.');
        assert.deepEqual(officialResponses, taskResponses, 'Pending answers must leave every original answer and judgment exact.');
        const { validateBenchmarkPublicationResponses } = await import('../cli/eval/benchmark-publication-projection.js');
        validateBenchmarkPublicationResponses(responses, data);
        const pendingEvidence = verification.architecturePending;
        const previousArchitectureSelection = JSON.parse(await assertLockedFile(pendingEvidence.previousSelection));
        const currentArchitectureSelection = JSON.parse(await assertLockedFile(pendingEvidence.selection, repoRoot));
        const { pendingArchitectureRuns, ...scoredSelection } = currentArchitectureSelection;
        assert.deepEqual(scoredSelection, previousArchitectureSelection);
        assert.deepEqual(pendingEvidence.sourcePins.map(({ path, sha256 }) => ({ runPath: path, sha256 })), pendingArchitectureRuns.map(({ runPath, sha256 }) => ({ runPath, sha256 })));
        for (const source of pendingEvidence.sourcePins) await assertLockedFile(source, repoRoot);
        const { buildBenchmarkPublicationProjection } = await import('../cli/eval/benchmark-publication-projection.js');
        const canonical = buildBenchmarkPublicationProjection({ repoRootDirectory: repoRoot });
        assert.deepEqual(descriptor, canonical.projection.architecturePending);
        assert.deepEqual(appendix, canonical.responseBundle.architecturePending, 'Saved pending answers and individual reviews must match exact immutable native checkpoints.');
        assert.equal(pendingEvidence.descriptorSha256, sha256(JSON.stringify(descriptor)));
        assert.equal(pendingEvidence.responsesSha256, sha256(JSON.stringify(appendix)));
        const priorAccepted = JSON.parse(await assertLockedFile(baseline.acceptance));
        const priorDeployment = priorAccepted.files.find(file => file.path === 'deployment.json');
        assert.equal(sha256(await readFile(join(siteRoot, 'deployment.json'))), priorDeployment.sha256, 'Pending publication keeps all accepted deployment limits unchanged.');
      } else {
        assert.deepEqual(omitAggregates(data), omitAggregates(taskData), 'Only Engineering and Overall projections may change. Every task score remains exact.');
        assert.deepEqual(responses, taskResponses, 'Every original authored source and review remains exact.');
      }
      assert.deepEqual(selected, JSON.parse(await assertLockedFile(baseline.selection, repoRoot)), 'Test-authoring selection remains unchanged.');
      assert.deepEqual(previousSelection, JSON.parse(await assertLockedFile(baseline.backendSelection, repoRoot)), 'Backend-testing selection remains unchanged.');
      const { validateEngineeringPublication } = await import('../cli/eval/engineering-publication.js');
      const { validateOverallPublication } = await import('../cli/eval/overall-publication.js');
      validateEngineeringPublication(data.engineering, { architecture: architectureAppend ? data : taskData, testAuthoring: taskData.testAuthoring, executableTesting: taskData.executableTesting });
      validateOverallPublication(data.overall, { engineering: data.engineering, aiWorkflows: taskData.aiWorkflows, writing: writingAppend ? data.writing.overallSource : taskData.writing.overallSource });
      assert.equal(data.engineering?.scoreBasis.edition, available ? 'engineering-available-pairs-v2' : 'engineering-all-tasks-v1');
      assert.equal(data.overall?.scoreBasis.edition, available ? 'overall-v5' : 'overall-v4');
      assert.deepEqual(data.engineering.scoreBasis.benchmarkIds, ['hyper-scale-chat', 'personalized-home-feed', 'device-telemetry', 'test-authoring', 'backend-testing']);
      assert.deepEqual(data.overall.categories.map(({ id, weight }) => ({ id, weight })), [{ id: 'engineering', weight: 0.5 }, { id: 'writing', weight: 0.25 }, { id: 'ai-workflows', weight: 0.25 }]);
      for (const [aggregate, expected] of [[data.engineering, [available ? 53 : 3, 53, architectureAppend ? 49 : 50, architectureAppend ? 334 : 328, 5]], [data.overall, [available ? 56 : 2, 56, 54, writingAppend ? 590 : architectureAppend ? 584 : 578, 9]]]) {
        assert.deepEqual([aggregate.settings.length, aggregate.coverage.totalSettings, aggregate.coverage.incompleteSettings, aggregate.benchmarkResults.length, aggregate.scoreBasis.taskCount], expected);
        for (const record of aggregate.coverage.records) {
          if (available) {
            const ids = aggregate.scoreBasis.benchmarkIds.filter(id => ['baseline', 'skill'].every(condition => aggregate.benchmarkResults.some(cell => cell.configurationId === record.configurationId && cell.condition === condition && cell.benchmarkId === id && Number.isFinite(cell.exactScore))));
            assert.deepEqual(record.availableBenchmarkIds, ids); assert.equal(record.completedTaskCount, ids.length); assert.equal(record.expectedTaskCount, aggregate.scoreBasis.taskCount);
            assert.equal(record.eligible, ids.length > 0); assert.equal(record.complete, ids.length === aggregate.scoreBasis.taskCount);
          } else {
            const complete = ['baseline', 'skill'].every(condition => record.conditions[condition].assessableTaskCount === aggregate.scoreBasis.taskCount);
            assert.equal(record.eligible, complete, 'Both arms must contain every task before ranking.');
            if (!complete) { assert.deepEqual(record.exactScores, { baseline: null, skill: null }); assert.deepEqual(record.ranks, { baseline: null, skill: null }); }
          }
        }
      }
      const taskScores = [...(architectureAppend ? data : taskData).benchmarkResults.map(cell => ({ ...cell, exactScore: cell.score })), ...[[taskData.testAuthoring, 'current'], [taskData.executableTesting, 'repaired']].flatMap(([publication, skill]) => publication.overall.rows.map(row => ({ configurationId: row.configurationId, benchmarkId: publication.benchmark.id, condition: row.condition === 'none' ? 'baseline' : skill === row.condition ? 'skill' : null, exactScore: row.score })))];
      const expectedCells = new Map(taskScores.map(cell => [`${cell.configurationId}|${cell.condition}|${cell.benchmarkId}`, cell.exactScore]));
      for (const cell of data.engineering.benchmarkResults) assert.equal(cell.exactScore, expectedCells.get(`${cell.configurationId}|${cell.condition}|${cell.benchmarkId}`), 'Engineering retains each authoritative final task score.');
      for (const entry of data.engineering.entries) {
        const ids = available ? entry.availableBenchmarkIds : data.engineering.scoreBasis.benchmarkIds;
        const values = ids.map(id => expectedCells.get(`${entry.configurationId}|${entry.condition}|${id}`));
        assert.ok(values.length && values.every(Number.isFinite));
        assert.ok(Math.abs(entry.exactScore - values.reduce((sum, score) => sum + score, 0) / values.length) < 1e-9, 'Engineering must equally average its declared paired tasks.');
      }
      if (available) {
        const priorAcceptance = JSON.parse(await assertLockedFile(baseline.acceptance));
        assert.equal(priorAcceptance.acceptance.scope.schemaVersion, architectureAppend ? 9 : pendingArchitecture ? 7 : 6);
        assert.equal(priorAcceptance.acceptance.verification.generatedFiles.find(file => file.path === 'data.js').sha256, baseline.data.sha256);
        for (const [aggregate, old] of [[data.engineering, taskData.engineering], [data.overall, taskData.overall]]) {
          assert.equal(aggregate.coverage.rankedSettings, aggregate.settings.length); assert.equal(aggregate.coverage.unrankedSettings, 0);
          for (const previousEntry of old.entries.filter(entry => !architectureAppend || entry.configurationId !== 'codex:gpt-6.1-sol@xhigh')) assert.equal(aggregate.entries.find(entry => entry.configurationId === previousEntry.configurationId && entry.condition === previousEntry.condition)?.exactScore, previousEntry.exactScore, 'Every previously complete score remains exact.');
        }
        assert.ok(taskData.settings.every(setting => data.engineering.settings.some(current => current.configurationId === setting.configurationId)), 'Every original architecture model remains in Engineering.');
      }
      for (const entry of data.overall.entries) {
        const parts = entry.categories;
        const previousEntry = taskData.overall.entries.find(row => row.configurationId === entry.configurationId && row.condition === entry.condition);
        const baseWeights = { engineering: 0.5, writing: 0.25, 'ai-workflows': 0.25 };
        const presentWeight = parts.filter(part => Number.isFinite(part.exactScore)).reduce((sum, part) => sum + baseWeights[part.category], 0);
        if (!available) assert.ok(previousEntry, 'A ranked Overall row must retain its original complete Writing and AI inputs.');
        for (const part of parts) {
          assert.equal(part.weight, available ? Number.isFinite(part.exactScore) ? baseWeights[part.category] / presentWeight : 0 : baseWeights[part.category]);
          if (!available && part.category !== 'engineering') assert.deepEqual(part, previousEntry.categories.find(old => old.category === part.category), 'Writing and AI category scores and contributions remain unchanged.');
          if (available && !Number.isFinite(part.exactScore)) { assert.equal(part.exactScore, null); assert.equal(part.exactContribution, null); }
        }
        assert.ok(Math.abs(entry.exactScore - parts.reduce((sum, part) => sum + (Number.isFinite(part.exactScore) ? part.exactScore * part.weight : 0), 0)) < 1e-9, 'Overall must apply the unchanged category weights.');
        const engineering = data.engineering.entries.find(row => row.configurationId === entry.configurationId && row.condition === entry.condition);
        assert.equal(parts.find(part => part.category === 'engineering').exactScore, engineering?.exactScore ?? null);
      }
    } else assert.deepEqual({ ...incumbent, schemaVersion: 7 }, before, 'Adding new test authoring must preserve every incumbent score.');
    const { testAuthoringRound, testAuthoringFiles, ...incumbentResponses } = responses;
    assert.deepEqual(architectureAppend ? Object.fromEntries(Object.entries(incumbentResponses).filter(([key]) => !['counts','responses','messageSets'].includes(key))) : pendingArchitecture ? Object.fromEntries(Object.entries(incumbentResponses).filter(([key]) => key !== 'architecturePending')) : incumbentResponses, architectureAppend ? Object.fromEntries(Object.entries(beforeResponses).filter(([key]) => !['counts','responses','messageSets'].includes(key))) : beforeResponses, 'Every incumbent answer, review and raw test file must remain exact.');
    assert.equal(selected.kind, 'vasirbenchmark-test-authoring-selection'); assert.ok([1, 2].includes(selected.schemaVersion));
    assert.deepEqual(JSON.parse(await readFile(join(repoRoot, 'benchmarks/backend-testing/publication.json'), 'utf8')), previousSelection, 'Incumbent selection must remain unchanged.');
    const { testAuthoringSourcePins, validateTestAuthoringRound, validateTestAuthoringPublication, validateTestAuthoringFiles } = await import('../cli/eval/test-authoring-publication.js');
    validateTestAuthoringRound(testAuthoringRound); validateTestAuthoringPublication(testAuthoring, testAuthoringRound); validateTestAuthoringFiles(testAuthoringFiles, testAuthoringRound);
    return testAuthoringSourcePins(selected, compactPlan);
  })() : assertSuiteQualityAcceptanceBoundaries({ selected, previousSelection, before, data, beforeResponses, responses, compactPlan });
  const { validateBackendTestingPublication, validateBackendTestingSuiteQuality, buildBackendTestingPublication } = await import('../cli/eval/backend-testing-publication.js');
  validateBackendTestingPublication(data.executableTesting);
  if (selected.schemaVersion === 4) assert.equal(data.executableTesting.overall.schemaVersion, 2);
  if (!authoring && selected.schemaVersion === 2) validateBackendTestingSuiteQuality(data.executableTesting.suiteQuality, responses.backendTesting);
  assert.deepEqual(verification.sourcePins.map(({ path, sha256 }) => ({ path, sha256 })), selectedSources);
  const unavailable = [];
  for (const record of verification.sourcePins) {
    try { await assertLockedFile(record, repoRoot); }
    catch (error) { if (error.code !== 'ENOENT') throw error; unavailable.push(record.path); }
  }
  if (!unavailable.length) {
    if (authoring) {
      const { buildTestAuthoringPublication } = await import('../cli/eval/test-authoring-publication.js');
      const source = buildTestAuthoringPublication({ repoRootDirectory: repoRoot });
      assert.deepEqual(data.testAuthoring, source.projection); assert.deepEqual(responses.testAuthoringRound, source.round); assert.deepEqual(responses.testAuthoringFiles, source.files);
    }
    const source = buildBackendTestingPublication({ repoRootDirectory: repoRoot });
    assert.deepEqual(data.executableTesting, source.projection); assert.deepEqual(responses.backendTesting, source.assessments);
    assert.deepEqual(responses.backendTestingRepair, source.repairCheck);
    assert.deepEqual(responses.backendTestingPairedRepair, source.pairedRepair);
    assert.deepEqual(responses.backendTestingTaste, source.taste);
    assert.deepEqual(responses.backendTestingFiles, source.files);
    assert.deepEqual(responses.backendTestingCurrentRound, source.currentRound);
  }
  const candidate = JSON.parse(await assertLockedFile(verification.candidate));
  assert.equal(candidate.kind, 'vasirbenchmark-release-manifest'); assert.equal(candidate.schemaVersion, 1); assert.match(candidate.releaseId, /^[a-f0-9]{64}$/);
  if (available) {
    const budget = verification.landingBudget;
    const beforeDeployment = JSON.parse(await assertLockedFile(budget.before));
    assert.deepEqual(JSON.parse(await assertLockedFile(budget.after)), deployment);
    const normalized = structuredClone(deployment);
    normalized.limits.maxCompressedLandingBytes = beforeDeployment.limits.maxCompressedLandingBytes;
    assert.deepEqual(normalized, beforeDeployment, 'Only the measured compressed landing allowance may change.');
    assert.equal(budget.previousLimit, 320000); assert.equal(beforeDeployment.limits.maxCompressedLandingBytes, budget.previousLimit);
    assert.equal(budget.currentLimit, 344000); assert.equal(deployment.limits.maxCompressedLandingBytes, budget.currentLimit);
    let measuredLandingBytes = 0;
    for (const path of ['index.html', 'style.css', 'assets/d3.v7.min.js', 'app.js', 'data.js', 'assets/kanit-latin-900-normal.woff2']) {
      let bytes = await readFile(join(siteRoot, path));
      if (path === 'index.html') {
        let text = bytes.toString('utf8');
        for (const file of deployment.publicFiles) if (file.cacheClass === 'immutable') text = text.replaceAll(`./${file.path}`, `/releases/${candidate.releaseId}/${file.path}`);
        bytes = Buffer.from(text, 'utf8');
      }
      measuredLandingBytes += gzipSync(bytes, { level: 9 }).length;
    }
    assert.equal(budget.measuredCompressedLandingBytes, measuredLandingBytes);
    assert.ok(budget.measuredCompressedLandingBytes > budget.previousLimit && budget.measuredCompressedLandingBytes <= budget.currentLimit);
    assert.ok(budget.currentLimit - budget.measuredCompressedLandingBytes <= 9000, 'Budget headroom stays below 9 KB.');
    assert.ok(budget.reason.includes('53 Engineering') && budget.reason.includes('56 Overall'));
  }
  assert.deepEqual(candidate.files.map(file => file.path).sort(), deployment.publicFiles.map(file => file.path).sort());
  // The pilot regenerated data.js; its prior acceptance still owns the unchanged Writing modules.
  const inherited = JSON.parse(await assertLockedFile(previous.acceptance.verification.previousAcceptance));
  const acceptedFiles = [...manifest.files, ...verification.generatedFiles, ...previous.acceptance.verification.generatedFiles, ...inherited.acceptance.verification.generatedFiles];
  if (authoring) {
    let ancestor = inherited;
    for (let depth = 0; depth < 8 && ancestor.acceptance.verification.previousAcceptance; depth++) {
      ancestor = JSON.parse(await assertLockedFile(ancestor.acceptance.verification.previousAcceptance));
      acceptedFiles.push(...ancestor.acceptance.verification.generatedFiles);
      if (candidate.files.every(file => acceptedFiles.some(pin => pin.path === file.path))) break;
    }
  }
  for (const released of candidate.files) {
    const accepted = acceptedFiles.find(file => file.path === released.path);
    assert.ok(accepted, released.path);
    assertReleasePresentationFile(accepted, accepted, released, await assertLockedFile(accepted), candidate.releaseId, deployment.publicFiles);
  }
  const harnessPath = 'backend-testing-browsercheck.mjs', harness = await assertLockedFile(verification.browserHarness), harnessPin = manifest.files.find(file => file.path === harnessPath);
  assert.equal(verification.browserHarness.path, harnessPath); assert.equal(harness.length, harnessPin.bytes); assert.equal(sha256(harness), harnessPin.sha256);
  assert.deepEqual(verification.browserProofs.map(({ width, height }) => ({ width, height })), focusedViewports);
  const capturePaths = [];
  for (const record of verification.browserProofs) {
    const proof = JSON.parse(await assertLockedFile(record));
    assertSuiteQualityBrowserProof(proof, authoring ? { width: record.width, height: record.height, harnessSha256: harnessPin.sha256, publicationSha256: sha256(JSON.stringify(data.testAuthoring)), overallSha256: sha256(JSON.stringify(data.overall)), schemaVersion: data.testAuthoring.schemaVersion, testAuthoring: true, ...(integrated ? { integrated, available, architectureAppend, writingAppend, pendingArchitecture, manualInspection: Boolean(verification.manualInspection), ...(pendingArchitecture ? { pendingDescriptorSha256: sha256(JSON.stringify(data.architecturePending)), pendingResponsesSha256: sha256(JSON.stringify(responses.architecturePending)) } : {}), engineeringSha256: sha256(JSON.stringify(data.engineering)) } : {}), testAuthoringRoundSha256: sha256(JSON.stringify(responses.testAuthoringRound)), testAuthoringOverallSha256: sha256(JSON.stringify(data.testAuthoring.overall)), testAuthoringFilesSha256: sha256(JSON.stringify(responses.testAuthoringFiles)), incumbentBackendSha256: sha256(JSON.stringify(before.executableTesting)) } : { width: record.width, height: record.height, harnessSha256: harnessPin.sha256, publicationSha256: sha256(JSON.stringify(data.executableTesting)), overallSha256: sha256(JSON.stringify(data.overall)), schemaVersion: selected.schemaVersion, repairCheck: Boolean(selected.repairCheck), pairedRepair: Boolean(selected.pairedRepair), pairedRepairSha256: responses.backendTestingPairedRepair ? sha256(JSON.stringify(responses.backendTestingPairedRepair)) : undefined, currentRoundSha256: responses.backendTestingCurrentRound ? sha256(JSON.stringify(responses.backendTestingCurrentRound)) : undefined, taste: Boolean(selected.taste), tasteSha256: responses.backendTestingTaste ? sha256(JSON.stringify(responses.backendTestingTaste)) : undefined, backendTestingOverallSha256: data.executableTesting.overall ? sha256(JSON.stringify(data.executableTesting.overall)) : undefined, backendTestingFilesSha256: responses.backendTestingFiles ? sha256(JSON.stringify(responses.backendTestingFiles)) : undefined });
    assert.equal(new Set(proof.sourcePins.map(file => file.path)).size, proof.sourcePins.length);
    for (const name of ['data.js', 'responses.js', 'app.js', 'benchmark-report.js', 'benchmark-report.css', 'style.css']) assert.ok(proof.sourcePins.some(file => file.path === name), `Missing loaded dependency: ${name}`);
    for (const loaded of proof.sourcePins) { const accepted = acceptedFiles.find(file => file.path === loaded.path); assert.ok(accepted, loaded.path); assert.equal(loaded.sha256, accepted.sha256); assert.equal(loaded.bytes, accepted.bytes); }
    assert.deepEqual([...new Set(proof.loadedFiles.map(file => file.path))].sort(), proof.sourcePins.map(file => file.path).sort());
    for (const loaded of proof.loadedFiles) {
      const url = new URL(loaded.url), pin = proof.sourcePins.find(file => file.path === loaded.path), released = candidate.files.find(file => file.path === loaded.path);
      assert.ok(['http:', 'https:'].includes(url.protocol)); assert.equal(url.origin, new URL(proof.loadedUrl).origin);
      assert.equal(url.pathname, `/releases/${candidate.releaseId}/${loaded.path}`, 'Browser must load this immutable candidate.');
      assert.ok(released, loaded.path); assert.equal(loaded.sha256, pin.sha256); assert.equal(loaded.bytes, pin.bytes);
      assert.equal(loaded.sha256, released.sha256); assert.equal(loaded.bytes, released.bytes);
    }
    assert.ok(proof.screenshots.length > 0);
    for (const screenshot of proof.screenshots) {
      const capturePath = `${dirname(record.path)}/${screenshot.path}`, capture = manifest.captures.find(item => item.path === capturePath); assert.ok(capture, capturePath);
      assert.equal(capture.sha256, screenshot.sha256); assert.equal(capture.bytes, screenshot.bytes);
      assert.equal(capture.width, proof.width); assert.equal(capture.height, proof.height); capturePaths.push(capturePath);
    }
  }
  assert.deepEqual(manifest.captures.map(capture => capture.path).sort(), capturePaths.sort()); assert.equal(new Set(capturePaths).size, capturePaths.length);
  assert.equal(verification.visualReview.authority, 'agent'); assert.ok(verification.visualReview.verdict.trim());
  for (const width of [1440, 390]) assert.ok(verification.visualReview.capturePaths.some(path => manifest.captures.some(capture => capture.path === path && capture.width === width)));
  for (const path of verification.visualReview.capturePaths) assert.ok(manifest.captures.some(capture => capture.path === path));
  return unavailable;
}

test('compact backend acceptance pins reused source and exposes only the selected round', () => {
  const pin = name => ({ path: `.agents/vasir-evals/backend-testing/compact-round-test/${name}.json`, sha256: sha256(name) });
  const fixture = () => ({
    selected: { kind: 'vasirbenchmark-backend-testing-selection', schemaVersion: 4, ...Object.fromEntries(['plan', 'skill', 'rubric', 'generation', 'reviewPlan', 'packet', 'mapping', 'review'].map(key => [key, pin(key)])), authors: Array.from({ length: 8 }, (_, index) => Object.fromEntries(['receipt', 'launch', 'outcome', 'verification'].map(key => [key, pin(`author-${index}-${key}`)]))), judges: Array.from({ length: 2 }, (_, index) => Object.fromEntries(['receipt', 'launch', 'validated'].map(key => [key, pin(`judge-${index}-${key}`)]))) },
    compactPlan: { sourceAuthorPlan: pin('baseline-plan'), fixture: pin('fixture') },
    before: { overall: { score: 73 } }, data: { overall: { score: 73 }, executableTesting: { schemaVersion: 4 } }, beforeResponses: { responses: [{ outputText: 'Original answer' }] }, responses: { responses: [{ outputText: 'Original answer' }], backendTestingCurrentRound: { kind: 'backend-testing-current-round' }, backendTestingFiles: { kind: 'backend-testing-files' } }
  });
  assert.equal(assertSuiteQualityAcceptanceBoundaries(fixture()).length, 48);
  const changedOverall = fixture(); changedOverall.data.overall.score = 74;
  assert.throws(() => assertSuiteQualityAcceptanceBoundaries(changedOverall), /Other benchmark data/);
  const oldPayload = fixture(); oldPayload.responses.backendTestingTaste = {};
  assert.throws(() => assertSuiteQualityAcceptanceBoundaries(oldPayload), /Only the selected current backend round/);
  const missingRound = fixture(); delete missingRound.responses.backendTestingCurrentRound;
  assert.throws(() => assertSuiteQualityAcceptanceBoundaries(missingRound));
  const changedSource = fixture(); changedSource.compactPlan.sourceAuthorPlan.path = '/private/secret.json';
  assert.throws(() => assertSuiteQualityAcceptanceBoundaries(changedSource));
});

test('current backend acceptance removes historical payloads while protecting unrelated public results', () => {
  const pin = name => ({ path: `.agents/vasir-evals/backend-testing/current-review/${name}.json`, sha256: sha256(name) });
  const pairedRepair = { ...Object.fromEntries(['plan', 'skill', 'generation', 'review', 'mapping'].map(key => [key, pin(key)])), authors: Array.from({ length: 8 }, (_, i) => Object.fromEntries(['receipt', 'launch', 'outcome', 'verification'].map(key => [key, pin(`author-${i}-${key}`)]))), judges: Array.from({ length: 2 }, (_, i) => Object.fromEntries(['receipt', 'launch', 'validated'].map(key => [key, pin(`judge-${i}-${key}`)]))) };
  const fixture = () => ({ selected: { kind: 'vasirbenchmark-backend-testing-selection', schemaVersion: 3, pairedRepair, rubric: pin('rubric') }, previousSelection: { schemaVersion: 1 }, before: { overall: { score: 73 }, executableTesting: { schemaVersion: 1 } }, data: { overall: { score: 73 }, executableTesting: { schemaVersion: 3 } }, beforeResponses: { responses: [{ id: 'incumbent', outputText: 'Original answer' }] }, responses: { responses: [{ id: 'incumbent', outputText: 'Original answer' }], backendTestingPairedRepair: { rows: [] } } });
  assert.equal(assertSuiteQualityAcceptanceBoundaries(fixture()).length, 44);
  const retryFixture = () => {
    const input = fixture();
    input.selected.taste = { ...Object.fromEntries(['rubric', 'plan', 'packet', 'mapping', 'summary'].map(key => [key, pin(`taste-${key}`)])), retry: { amendment: pin('retry-amendment'), priorReceipt: pin('prior-timeout-receipt'), priorLaunch: pin('prior-timeout-launch') }, judges: Array.from({ length: 2 }, (_, index) => Object.fromEntries(['receipt', 'launch', 'validated'].map(key => [key, pin(`taste-judge-${index}-${key}`)]))) };
    input.responses.backendTestingTaste = { rows: [] };
    return input;
  };
  const retrySources = assertSuiteQualityAcceptanceBoundaries(retryFixture());
  assert.equal(retrySources.length, 58);
  assert.deepEqual(retrySources.slice(49, 52).map(source => source.path), ['retry-amendment', 'prior-timeout-receipt', 'prior-timeout-launch'].map(name => `.agents/vasir-evals/backend-testing/current-review/${name}.json`));
  for (const mutate of [
    input => { delete input.selected.taste.retry.priorReceipt; },
    input => { input.selected.taste.retry.authorization = 'Unpinned'; },
    input => { input.selected.taste.retry.priorLaunch = input.selected.taste.judges[0].launch; }
  ]) { const input = retryFixture(); mutate(input); assert.throws(() => assertSuiteQualityAcceptanceBoundaries(input)); }

  for (const mutate of [
    input => { input.data.executableTesting.suiteQuality = { rows: ['historical'] }; },
    input => { input.responses.backendTestingRepair = { rows: ['partial'] }; },
    input => { input.data.overall.score = 99; },
    input => { input.responses.responses[0].outputText = 'Rewritten'; }
  ]) { const input = fixture(); mutate(input); assert.throws(() => assertSuiteQualityAcceptanceBoundaries(input)); }
});

test('suite-quality acceptance preserves the executed pilot, incumbent scores, original answers and every source pin', () => {
  const pin = name => ({ path: `.agents/vasir-evals/backend-testing/publication-snapshots/${name}.json`, sha256: sha256(name) });
  const previousSelection = { kind: 'vasirbenchmark-backend-testing-selection', schemaVersion: 1, generation: pin('pilot-generation'), evaluation: pin('pilot-evaluation'), conditions: [{ id: 'none', skillSha256: null }] };
  const before = { schemaVersion: 7, overall: { score: 73 }, executableTesting: { schemaVersion: 1, rows: [{ detectedFaultIds: ['read-counter'] }] } };
  const beforeResponses = { schemaVersion: 2, responses: [{ id: 'incumbent-response', outputText: 'Original public answer' }] };
  const fixture = () => ({ previousSelection: structuredClone(previousSelection), before: structuredClone(before), beforeResponses: structuredClone(beforeResponses),
    selected: { kind: 'vasirbenchmark-backend-testing-selection', schemaVersion: 2, suiteQuality: Object.fromEntries(['generation', 'evaluation', 'judging', 'rubric'].map(name => [name, pin(`quality-${name}`)])), faultDetectionPilot: structuredClone(previousSelection) },
    data: { ...structuredClone(before), executableTesting: { schemaVersion: 2, suiteQuality: { score: 61.25 }, faultDetectionPilot: structuredClone(before.executableTesting) } },
    responses: { ...structuredClone(beforeResponses), backendTesting: { kind: 'vasirbenchmark-backend-testing-assessments' } } });
  assert.equal(assertSuiteQualityAcceptanceBoundaries(fixture()).length, 6);
  for (const mutate of [
    input => { input.data.executableTesting.faultDetectionPilot.rows[0].detectedFaultIds = []; },
    input => { input.data.overall.score = 90; },
    input => { input.responses.responses[0].outputText = 'Rewritten answer'; },
    input => { input.selected.faultDetectionPilot.generation.sha256 = sha256('substituted pilot'); },
    input => { delete input.selected.suiteQuality.rubric; },
    input => { input.selected.suiteQuality.judging = input.selected.suiteQuality.evaluation; }
  ]) { const input = fixture(); mutate(input); assert.throws(() => assertSuiteQualityAcceptanceBoundaries(input)); }
});

test('suite-quality acceptance rejects rehearsal receipts, stale release hashes and missing original-rating proof', () => {
  const expected = { width: 390, height: 844, harnessSha256: sha256('harness'), publicationSha256: sha256('publication'), overallSha256: sha256('overall') };
  const fixture = () => ({ kind: 'vasirbenchmark-backend-testing-browser-proof', status: 'passed', publicationSchemaVersion: 2, ...expected, failures: [], runtimeErrors: [], networkErrors: [], checks: suiteQualityAcceptanceChecks.map(id => ({ id, passed: true, evidence: { observed: true } })) });
  assert.doesNotThrow(() => assertSuiteQualityBrowserProof(fixture(), expected));
  for (const mutate of [
    proof => { proof.notAcceptanceEvidence = true; },
    proof => { proof.previewState = { state: 'complete' }; },
    proof => { proof.publicationSha256 = sha256('another release'); },
    proof => { proof.checks = proof.checks.filter(check => check.id !== 'original-quality-assessments'); },
    proof => { proof.checks.find(check => check.id === 'pilot-remains-separate').passed = false; },
    proof => { proof.runtimeErrors.push({ message: 'Broken report' }); }
  ]) { const proof = fixture(); mutate(proof); assert.throws(() => assertSuiteQualityBrowserProof(proof, expected)); }
});

test('test-authoring browser acceptance binds new findings and the unchanged incumbent', () => {
  const expected = { width: 390, height: 844, harnessSha256: sha256('harness'), publicationSha256: sha256('authoring'), overallSha256: sha256('overall'), schemaVersion: 1, testAuthoring: true, testAuthoringRoundSha256: sha256('native findings'), testAuthoringOverallSha256: sha256('final score'), testAuthoringFilesSha256: sha256('exact JS'), incumbentBackendSha256: sha256('incumbent') };
  const fixture = () => ({ kind: 'vasirbenchmark-backend-testing-browser-proof', benchmarkId: 'test-authoring', status: 'passed', publicationSchemaVersion: 1, ...expected, failures: [], runtimeErrors: [], networkErrors: [], checks: [...currentTestingAcceptanceChecks, 'taste-comparison', 'taste-evidence'].map(id => ({ id, passed: true, evidence: { observed: true } })) });
  assert.doesNotThrow(() => assertSuiteQualityBrowserProof(fixture(), expected));
  for (const mutate of [proof => { proof.incumbentBackendSha256 = sha256('changed incumbent'); }, proof => { proof.testAuthoringFilesSha256 = sha256('changed code'); }, proof => { proof.checks = proof.checks.filter(check => check.id !== 'taste-evidence'); }]) {
    const proof = fixture(); mutate(proof); assert.throws(() => assertSuiteQualityBrowserProof(proof, expected));
  }
});

test('combined Engineering acceptance requires current aggregate hashes and complete-coverage browser proof', () => {
  const expected = { width: 390, height: 844, harnessSha256: sha256('harness'), publicationSha256: sha256('authoring'), overallSha256: sha256('overall-v4'), engineeringSha256: sha256('five-task Engineering'), schemaVersion: 1, testAuthoring: true, integrated: true, testAuthoringRoundSha256: sha256('native findings'), testAuthoringOverallSha256: sha256('task score'), testAuthoringFilesSha256: sha256('exact JS'), incumbentBackendSha256: sha256('incumbent') };
  const checks = [...currentTestingAcceptanceChecks, 'taste-comparison', 'taste-evidence'].map(id => ({ 'engineering-52-settings': 'engineering-all-benchmarks', 'overall-excludes-backend-testing': 'overall-includes-testing' }[id] || id));
  const fixture = () => ({ kind: 'vasirbenchmark-backend-testing-browser-proof', benchmarkId: 'test-authoring', status: 'passed', publicationSchemaVersion: 1, ...expected, aggregateIntegration: { engineeringSha256: expected.engineeringSha256, sourceTaskScoresVerified: true, fullPairEligibilityVerified: true, equalTaskMeanVerified: true, calculation: { rows: Array(5).fill({}) }, coverage: { count: 50, label: '2/5 tests · unranked' }, overallPartialLink: { label: '2/5 tests · unranked' }, reportInclusion: Object.fromEntries(['test-authoring', 'backend-testing'].map(id => [id, { footer: 'Included in Engineering and Overall' }])) }, failures: [], runtimeErrors: [], networkErrors: [], checks: checks.map(id => ({ id, passed: true, evidence: { observed: true } })) });
  assert.doesNotThrow(() => assertSuiteQualityBrowserProof(fixture(), expected));
  for (const mutate of [proof => { proof.engineeringSha256 = sha256('architecture only'); }, proof => { proof.aggregateIntegration.fullPairEligibilityVerified = false; }, proof => { proof.aggregateIntegration.coverage.label = 'Ranked'; }, proof => { proof.checks.find(check => check.id === 'overall-includes-testing').id = 'overall-excludes-backend-testing'; }]) {
    const proof = fixture(); mutate(proof); assert.throws(() => assertSuiteQualityBrowserProof(proof, expected));
  }
  const availableExpected = { ...expected, available: true }, availableFixture = () => {
    const proof = fixture(); Object.assign(proof.aggregateIntegration, { availableCoverage: true, pairedCoverageVerified: true, equalAvailableTaskMeanVerified: true, categoryRenormalizationVerified: true, mainRows: Array.from({ length: 53 }, () => ({ visible: true, count: 3, expected: 5 })), overallMainRows: Array.from({ length: 56 }, () => ({ visible: true, count: 4, expected: 9 })), calculation: { configurationId: 'codex:gpt-6.1-sol@xhigh', rows: [0.5, 0.5, 0, 0, 0].map(weight => ({ weight })) }, coverage: { count: 50, label: '2/5 tests · partial' }, overallPartialLink: { label: '2/5 tests · partial' } }); return proof;
  };
  assert.doesNotThrow(() => assertSuiteQualityBrowserProof(availableFixture(), availableExpected));
  for (const mutate of [proof => proof.aggregateIntegration.mainRows.pop(), proof => { proof.aggregateIntegration.overallMainRows[0].visible = false; }, proof => { proof.aggregateIntegration.categoryRenormalizationVerified = false; }]) { const proof = availableFixture(); mutate(proof); assert.throws(() => assertSuiteQualityBrowserProof(proof, availableExpected)); }
});

async function assertExecutableTestingEvidence(manifest, deployment) {
  if ([2, 3, 4, 5, 6, 7, 9, 10, 11].includes(manifest.acceptance.scope.schemaVersion)) return assertSuiteQualityTestingEvidence(manifest, deployment);
  assert.deepEqual(manifest.acceptance.scope, { kind: 'executable-testing-benchmark', schemaVersion: 1, benchmarkId: 'backend-testing', viewports: focusedViewports });
  const verification = manifest.acceptance.verification;
  const previous = JSON.parse(await assertLockedFile(verification.previousAcceptance));
  assert.equal(previous.kind, 'vasirbenchmark-site-template-lock'); assert.equal(previous.status, 'accepted');
  assert.equal(manifest.retainedCaptureEvidence.version, previous.version);
  assert.deepEqual(manifest.retainedCaptureEvidence.receipt, verification.previousAcceptance);
  const harnessPath = 'backend-testing-browsercheck.mjs';
  assert.deepEqual(manifest.files.map(file => file.path).sort(), [...previous.files.map(file => file.path), harnessPath].sort());
  const changed = manifest.files.filter(file => file.path !== harnessPath && file.sha256 !== previous.files.find(prior => prior.path === file.path)?.sha256);
  assert.deepEqual(changed.map(file => file.path).sort(), ['app.js', 'benchmark-report.css', 'benchmark-report.js']);
  assert.deepEqual(verification.previousFiles.map(record => record.sourcePath).sort(), changed.map(file => file.path).sort());
  for (const record of verification.previousFiles) {
    const bytes = await assertLockedFile(record), prior = previous.files.find(file => file.path === record.sourcePath);
    assert.equal(bytes.length, prior.bytes); assert.equal(sha256(bytes), prior.sha256);
  }
  for (const file of manifest.files.filter(file => file.path !== harnessPath && !changed.includes(file))) {
    assert.deepEqual(file, previous.files.find(prior => prior.path === file.path), `Unrelated presentation or deployment drift: ${file.path}`);
  }
  for (const capture of previous.captures) await assertCapture(capture);
  const previousData = await assertLockedFile(verification.previousData);
  const previousDataPin = previous.acceptance.verification.generatedFiles.find(file => file.path === 'data.js');
  assert.equal(previousData.length, previousDataPin.bytes); assert.equal(sha256(previousData), previousDataPin.sha256);
  assert.deepEqual(verification.generatedFiles.map(file => file.path), ['data.js']);
  const currentData = await assertLockedFile(verification.generatedFiles[0]);
  const readData = bytes => { const context = { window: {} }; vm.runInNewContext(bytes.toString('utf8'), context); return JSON.parse(JSON.stringify(context.window.VASIR_DATA)); };
  const before = readData(previousData), data = readData(currentData);
  assert.equal(before.schemaVersion, 6); assert.equal(data.schemaVersion, 7);
  assert.equal(before.executableTesting, undefined); assert.ok(data.executableTesting);
  const incumbentData = ({ executableTesting, schemaVersion, ...incumbent }) => incumbent;
  assert.deepEqual(incumbentData(data), incumbentData(before), 'Every incumbent projection remains identical.');
  for (const record of previous.acceptance.verification.generatedFiles.filter(file => file.path !== 'data.js')) await assertLockedFile(record);
  const acceptedFiles = [...manifest.files, ...verification.generatedFiles, ...previous.acceptance.verification.generatedFiles];
  const candidate = JSON.parse(await assertLockedFile(verification.candidate));
  assert.equal(candidate.kind, 'vasirbenchmark-release-manifest'); assert.equal(candidate.schemaVersion, 1);
  assert.match(candidate.releaseId, /^[a-f0-9]{64}$/);
  assert.deepEqual(candidate.files.map(file => file.path).sort(), deployment.publicFiles.map(file => file.path).sort());
  for (const released of candidate.files) {
    const accepted = acceptedFiles.find(file => file.path === released.path); assert.ok(accepted, released.path);
    assertReleasePresentationFile(accepted, accepted, released, await assertLockedFile(accepted), candidate.releaseId, deployment.publicFiles);
  }

  assert.equal(verification.selection.path, 'benchmarks/backend-testing/publication.json');
  const selected = JSON.parse(await assertLockedFile(verification.selection, repoRoot));
  assert.equal(selected.kind, 'vasirbenchmark-backend-testing-selection'); assert.equal(selected.schemaVersion, 1);
  assert.deepEqual(selected.conditions.map(condition => condition.id), ['none', 'previous', 'revised']);
  assert.equal(selected.conditions[0].skillSha256, null);
  for (const condition of selected.conditions.slice(1)) assert.match(condition.skillSha256, /^[a-f0-9]{64}$/);
  const selectedSources = [selected.generation, selected.evaluation];
  assert.deepEqual(verification.sourcePins.map(({ path, sha256 }) => ({ path, sha256 })), selectedSources);
  const unavailable = [];
  for (const record of verification.sourcePins) {
    assert.ok(record.path.startsWith('.agents/vasir-evals/backend-testing/'), 'Private source remains in the benchmark archive.');
    try { await assertLockedFile(record, repoRoot); }
    catch (error) { if (error.code !== 'ENOENT') throw error; unavailable.push(record.path); }
  }
  assert.equal(data.executableTesting.sourceSha256, sha256(`${selected.generation.sha256}\n${selected.evaluation.sha256}`));
  if (!unavailable.length) {
    const { buildBackendTestingPublication } = await import('../cli/eval/backend-testing-publication.js');
    const source = buildBackendTestingPublication({ repoRootDirectory: repoRoot });
    assert.deepEqual(data.executableTesting, source.projection, 'Published executable results remain bound to the verified selected sources.');
  }

  assert.equal(verification.browserHarness.path, harnessPath);
  const harness = await assertLockedFile(verification.browserHarness);
  const harnessPin = manifest.files.find(file => file.path === harnessPath);
  assert.equal(harness.length, harnessPin.bytes); assert.equal(sha256(harness), harnessPin.sha256);
  const requiredChecks = ['row-derived-totals', 'rendered-summary-totals', 'rendered-condition-totals', 'rendered-trial-rows', 'native-details-keyboard', 'table-keyboard-scroll', 'report-section-links', 'ledger-navigation', 'browser-history', 'no-root-overflow', 'engineering-52-settings', 'overall-excludes-backend-testing', 'hyper-scale-chat-report'];
  assert.deepEqual(verification.browserProofs.map(({ width, height }) => ({ width, height })), focusedViewports);
  const capturePaths = [];
  for (const record of verification.browserProofs) {
    const proof = JSON.parse(await assertLockedFile(record));
    assert.equal(proof.kind, 'vasirbenchmark-backend-testing-browser-proof'); assert.equal(proof.status, 'passed');
    assert.notEqual(proof.notAcceptanceEvidence, true, 'Layout rehearsal cannot establish final acceptance.');
    assert.equal(proof.previewState, undefined, 'Preview state cannot establish final acceptance.');
    assert.equal(proof.width, record.width); assert.equal(proof.height, record.height); assert.equal(proof.harnessSha256, harnessPin.sha256);
    assert.equal(proof.publicationSha256, sha256(JSON.stringify(data.executableTesting)));
    assert.equal(proof.overallSha256, sha256(JSON.stringify(data.overall)));
    for (const field of ['failures', 'runtimeErrors', 'networkErrors']) assert.deepEqual(proof[field], []);
    assert.deepEqual(proof.checks.map(check => check.id).sort(), [...requiredChecks].sort());
    for (const check of proof.checks) { assert.equal(check.passed, true, check.id); assert.ok(check.evidence != null && JSON.stringify(check.evidence) !== '{}', `${check.id} needs observed evidence`); }
    assert.equal(new Set(proof.sourcePins.map(file => file.path)).size, proof.sourcePins.length);
    for (const name of ['data.js', 'app.js', 'benchmark-report.js', 'benchmark-report.css', 'style.css']) assert.ok(proof.sourcePins.some(file => file.path === name), `Missing loaded dependency: ${name}`);
    for (const loaded of proof.sourcePins) {
      const accepted = acceptedFiles.find(file => file.path === loaded.path);
      assert.ok(accepted, `Unaccepted loaded dependency: ${loaded.path}`); assert.equal(loaded.sha256, accepted.sha256); assert.equal(loaded.bytes, accepted.bytes);
    }
    assert.deepEqual([...new Set(proof.loadedFiles.map(file => file.path))].sort(), proof.sourcePins.map(file => file.path).sort());
    for (const loaded of proof.loadedFiles) {
      const url = new URL(loaded.url), pin = proof.sourcePins.find(file => file.path === loaded.path);
      assert.ok(['http:', 'https:'].includes(url.protocol)); assert.equal(url.origin, new URL(proof.loadedUrl).origin);
      assert.equal(url.pathname, `/releases/${candidate.releaseId}/${loaded.path}`, 'Browser must load this immutable candidate.');
      const released = candidate.files.find(file => file.path === loaded.path); assert.ok(released, loaded.path);
      assert.equal(loaded.sha256, pin.sha256); assert.equal(loaded.bytes, pin.bytes);
      assert.equal(loaded.sha256, released.sha256); assert.equal(loaded.bytes, released.bytes);
    }
    assert.ok(proof.screenshots.length > 0);
    for (const screenshot of proof.screenshots) {
      const capturePath = `${dirname(record.path)}/${screenshot.path}`;
      const capture = manifest.captures.find(item => item.path === capturePath); assert.ok(capture, capturePath);
      assert.equal(capture.sha256, screenshot.sha256); assert.equal(capture.bytes, screenshot.bytes);
      assert.equal(capture.width, proof.width); assert.equal(capture.height, proof.height); capturePaths.push(capturePath);
    }
  }
  assert.equal(new Set(capturePaths).size, capturePaths.length);
  assert.deepEqual(manifest.captures.map(capture => capture.path).sort(), capturePaths.sort());
  assert.equal(verification.visualReview.authority, 'agent'); assert.ok(verification.visualReview.verdict.trim());
  for (const width of [1440, 390]) assert.ok(verification.visualReview.capturePaths.some(path => manifest.captures.some(capture => capture.path === path && capture.width === width)), `Missing visual review at ${width}px`);
  for (const path of verification.visualReview.capturePaths) assert.ok(manifest.captures.some(capture => capture.path === path));
  return unavailable;
}

test('canonical VasirBench site matches its accepted template lock', async t => {
  const manifest = JSON.parse(await readFile(join(siteRoot, 'template-lock.json'), 'utf8'));
  const deployment = JSON.parse(await readFile(join(siteRoot, 'deployment.json'), 'utf8'));
  const focused = manifest.acceptance.scope?.kind === 'focused-writing-benchmark';
  const shared = manifest.acceptance.scope?.kind === 'shared-writing-category-frame';
  const engineeringRefresh = manifest.acceptance.scope?.kind === 'engineering-data-refresh';
  const gamesRefresh = manifest.acceptance.scope?.kind === 'games-presentation-refresh';
  const gamesExtension = manifest.acceptance.scope?.kind === 'games-data-extension';
  const executableTesting = manifest.acceptance.scope?.kind === 'executable-testing-benchmark';
  const versioned = shared && manifest.acceptance.verification?.categoryIndex?.method === versionedMethod;
  const scoped = focused || shared || engineeringRefresh || gamesRefresh || gamesExtension || executableTesting;
  assert.ok(!manifest.acceptance.scope || scoped, 'unrecognized acceptance scope');
  const expectedFiles = [...new Set([
    ...deployment.publicFiles.map(({ path }) => path).filter((path) => !generatedPublicFiles.has(path)),
    ...acceptanceOnlyFiles,
    // The shared browser harness still imports this byte-pinned audit helper;
    // its presence never authorizes compact source data or public reports.
    ...(versioned || engineeringRefresh || gamesRefresh || gamesExtension || executableTesting ? [compactHarness] : []),
    ...(scoped ? ['deployment.json', 'infra/production.yml'] : []),
    ...(executableTesting ? ['backend-testing-browsercheck.mjs'] : [])
  ])].sort();

  assert.equal(manifest.kind, 'vasirbenchmark-site-template-lock');
  assert.equal(manifest.status, 'accepted');
  assert.equal(manifest.canonicalPath, 'site/vasirbenchmark.com');
  assert.equal(manifest.acceptance.authority, 'user');
  assert.equal(manifest.deployment.status, 'active');
  assert.equal(manifest.deployment.targetDomain, 'vasirbenchmark.com');
  assert.equal(manifest.deployment.awsAccountAlias, 'faedark');
  assert.equal(deployment.publicFiles.length, 18);
  assert.equal(new Set(deployment.publicFiles.map(({ path }) => path)).size, 18);
  assert.deepEqual(manifest.deployment.topology, {
    owner: 'CloudFormation',
    stack: 'vasirbenchmark-production',
    origin: 'private-s3-oac',
    edge: 'cloudfront-release-router',
    dns: 'route53-apex-alias'
  });

  assert.deepEqual(manifest.files.map(({ path }) => path).sort(), expectedFiles);
  if (scoped) {
    const unavailable = await (executableTesting ? assertExecutableTestingEvidence(manifest, deployment) : gamesExtension ? assertGamesDataExtensionEvidence(manifest, deployment) : gamesRefresh ? assertGamesPresentationRefreshEvidence(manifest) : engineeringRefresh ? assertEngineeringRefreshEvidence(manifest) : shared ? assertSharedFrameEvidence(manifest, deployment) : assertFocusedEvidence(manifest, deployment));
    if (unavailable.length) t.diagnostic(`Tracked selection hashes and archived source metadata verified; ${unavailable.length} gitignored private source files are absent. Restore their exact selected publication-snapshots to repeat private-byte verification or rebuild/publish. Their byte assertions were not performed; presentation and portable browser-evidence assertions remain mandatory.`);
  }
  else assert.deepEqual(manifest.captures.map(({ path }) => path), expectedCaptures);

  for (const record of manifest.files) await assertLockedFile(record);
  for (const record of manifest.captures) await assertCapture(record);
});

test('focused acceptance source pins keep tracked selections mandatory and disclose absent private bytes', async () => {
  const sources = ['run.json', 'skill-snapshot.json'].map((name, index) => ({ path: `.agents/vasir-evals/${focusedBenchmarkId}/publication-snapshots/example/${name}`, bytes: 10, sha256: String(index + 1).repeat(64) }));
  const selection = { benchmarkId: focusedBenchmarkId, path: `benchmarks/${focusedBenchmarkId}/publication.json`, bytes: 10, sha256: 'a'.repeat(64), sources };
  const selectedBytes = Buffer.from(JSON.stringify({ run: sources[0], skill: sources[1] }));
  const calls = [];
  const absentArchive = async record => {
    calls.push(record.path);
    if (record.path === selection.path) return selectedBytes;
    throw Object.assign(new Error('Private archive absent'), { code: 'ENOENT' });
  };
  assert.deepEqual(await assertSelectedSourceEvidence(selection, absentArchive), sources.map(source => source.path));
  assert.equal(calls[0], selection.path);
  await assert.rejects(assertSelectedSourceEvidence(selection, async () => { throw Object.assign(new Error('Tracked selection absent'), { code: 'ENOENT' }); }), /Tracked selection absent/);
  const substituted = structuredClone(selection); substituted.sources[0].sha256 = 'b'.repeat(64);
  await assert.rejects(assertSelectedSourceEvidence(substituted, absentArchive), /accepted source metadata differs/);
});

test('focused acceptance source pins do not skip available-byte drift or non-missing archive errors', async () => {
  const sources = ['run.json', 'skill-snapshot.json'].map(name => ({ path: `.agents/vasir-evals/${focusedBenchmarkId}/publication-snapshots/example/${name}`, bytes: 10, sha256: 'c'.repeat(64) }));
  const selection = { benchmarkId: focusedBenchmarkId, path: `benchmarks/${focusedBenchmarkId}/publication.json`, sources };
  const selectedBytes = Buffer.from(JSON.stringify({ run: sources[0], skill: sources[1] }));
  for (const failure of [new Error('SHA-256 drifted'), Object.assign(new Error('Permission denied'), { code: 'EACCES' })]) {
    await assert.rejects(assertSelectedSourceEvidence(selection, async record => { if (record.path === selection.path) return selectedBytes; throw failure; }), error => error === failure);
  }
});

test('fresh source selection accepts one independently pinned snapshot only with explicit preserved original lineage', async () => {
  const snapshot = { path: `.agents/vasir-evals/${PAIRED_TWISTS_EDITION}/publication-snapshots/${'b'.repeat(64)}/snapshot.json`, bytes: 12, sha256: 'b'.repeat(64) };
  const previousSources = ['run.json', 'skill-snapshot.json'].map((name, index) => ({ path: `.agents/vasir-evals/storytelling-plot-twists/publication-snapshots/old/${name}`, bytes: 10, sha256: String(index + 1).repeat(64) }));
  const selected = { kind: 'vasirbenchmark-plot-twists-paired-source', schemaVersion: 1, edition: PAIRED_TWISTS_EDITION, snapshot: { path: snapshot.path, sha256: snapshot.sha256 } };
  const selection = { benchmarkId: 'storytelling-plot-twists', path: 'benchmarks/storytelling-plot-twists/publication.json', bytes: 10, sha256: 'a'.repeat(64), sources: [snapshot],
    lineage: { kind: 'declared-writing-source-replacement', edition: PAIRED_TWISTS_EDITION, previousSelection: { path: 'benchmarks/storytelling-plot-twists/publication.json', bytes: 10, sha256: 'c'.repeat(64) },
      previousSources, originalEvidencePreserved: true, priorAnswersAndReviewsReused: false } };
  const reader = async record => { if (record.path === selection.path) return Buffer.from(JSON.stringify(selected)); throw Object.assign(new Error('Private archive absent'), { code: 'ENOENT' }); };
  assert.deepEqual(await assertSelectedSourceEvidence(selection, reader), [snapshot.path, ...previousSources.map(source => source.path)]);
  for (const mutate of [
    value => { delete value.lineage; },
    value => { value.lineage.priorAnswersAndReviewsReused = true; },
    value => { value.lineage.previousSources.pop(); },
    value => { value.sources.push(previousSources[0]); },
    value => { value.sources[0].sha256 = 'd'.repeat(64); },
    value => { value.lineage.previousSources[0].path = '.agents/other-evidence/run.json'; }
  ]) {
    const changed = structuredClone(selection); mutate(changed);
    await assert.rejects(assertSelectedSourceEvidence(changed, reader));
  }
  await assert.rejects(assertSelectedSourceEvidence(selection, async record => {
    if (record.path === selection.path) return Buffer.from(JSON.stringify(selected));
    throw new Error('Available source bytes drifted');
  }), /bytes drifted/);
  const expanded = structuredClone(selection);
  const parent = { ...snapshot, sha256: 'e'.repeat(64), path: `.agents/vasir-evals/${PAIRED_TWISTS_EDITION}/publication-snapshots/${'e'.repeat(64)}/snapshot.json` };
  expanded.lineage = { kind: 'declared-writing-coverage-extension', edition: PAIRED_TWISTS_EDITION,
    coverageExtension: { version: 'paired-reasoning-coverage-extension-v1', purpose: 'Explicit post-original coverage append.',
      parentSnapshotSha256: parent.sha256, parentManifestSha256: 'f'.repeat(64), addedConfigurations: pairedAddedConfigurations,
      retainedConfigurationCount: 6, additionalGenerationCount: 16, additionalJudgeRequestCount: 16 },
    parentSourceSha256: parent.sha256, previousSelection: selection.lineage.previousSelection, previousSources: [parent],
    previousLineage: selection.lineage, originalEvidencePreserved: true, answersAndCompletedReviewsPreserved: true, originalSettingsRerun: false };
  assert.deepEqual(await assertSelectedSourceEvidence(expanded, reader), [snapshot.path, parent.path, ...previousSources.map(source => source.path)]);
  const chained = structuredClone(expanded);
  const immediateParent = { ...parent, sha256: 'f'.repeat(64), path: `.agents/vasir-evals/${PAIRED_TWISTS_EDITION}/publication-snapshots/${'f'.repeat(64)}/snapshot.json` };
  chained.lineage = { ...structuredClone(expanded.lineage), parentSourceSha256: immediateParent.sha256,
    previousSources: [immediateParent], previousLineage: expanded.lineage,
    coverageExtension: { ...expanded.lineage.coverageExtension, version: 'paired-declared-coverage-extension-v2',
      parentSnapshotSha256: immediateParent.sha256, addedConfigurations: ['codex:gpt-6-astra@high'],
      retainedConfigurationCount: pairedOriginalConfigurations.length + pairedAddedConfigurations.length,
      additionalGenerationCount: 2, additionalJudgeRequestCount: 2 } };
  assert.deepEqual(await assertSelectedSourceEvidence(chained, reader), [snapshot.path, immediateParent.path, parent.path, ...previousSources.map(source => source.path)]);
  const recovered = structuredClone(expanded);
  const technicalRecovery = { version: 'paired-tool-isolation-recovery-v1', sourceSnapshotSha256: immediateParent.sha256,
    sourceManifestSha256: 'd'.repeat(64), purpose: 'Explicit approved technical recovery.' };
  recovered.lineage = { kind: 'declared-writing-technical-recovery', edition: PAIRED_TWISTS_EDITION,
    parentSourceSha256: parent.sha256, stoppedSourceSha256: immediateParent.sha256, technicalRecovery,
    technicalRecoverySha256: createHash('sha256').update(JSON.stringify(technicalRecovery)).digest('hex'),
    previousSelection: selection.lineage.previousSelection, previousSources: [parent], previousLineage: selection.lineage,
    originalEvidencePreserved: true, cleanAnswersAndCompletedReviewsPreserved: true, supersededOriginalAttemptsPreserved: true,
    originalSettingsRerun: true, scoreBasedReplacementSelection: false };
  assert.deepEqual(await assertSelectedSourceEvidence(recovered, reader), [snapshot.path, parent.path, ...previousSources.map(source => source.path)]);
  for (const mutate of [
    value => { value.lineage.scoreBasedReplacementSelection = true; },
    value => { value.lineage.cleanAnswersAndCompletedReviewsPreserved = false; },
    value => { value.lineage.supersededOriginalAttemptsPreserved = false; },
    value => { value.lineage.technicalRecoverySha256 = 'a'.repeat(64); },
    value => { value.lineage.stoppedSourceSha256 = snapshot.sha256; }
  ]) { const changed = structuredClone(recovered); mutate(changed); await assert.rejects(assertSelectedSourceEvidence(changed, reader)); }
  for (const mutate of [
    value => { value.lineage.originalSettingsRerun = true; },
    value => { value.lineage.parentSourceSha256 = '0'.repeat(64); },
    value => { delete value.lineage.previousLineage; },
    value => { value.lineage.coverageExtension.addedConfigurations = pairedAddedConfigurations.slice(1); }
  ]) {
    const changed = structuredClone(expanded); mutate(changed);
    await assert.rejects(assertSelectedSourceEvidence(changed, reader));
  }
});

test('compact source evidence requires tracked selection bytes and separately discloses missing private snapshots', async () => {
  const source = { kind: 'vasirbenchmark-compact-writing-source-verification', benchmarkIds: compactBenchmarkIds,
    selection: { path: 'benchmarks/writing-compact-v1/publication.json', sha256: 'a'.repeat(64), bytes: 100 },
    snapshot: { path: `.agents/vasir-evals/writing-compact-v1/publication-snapshots/${'b'.repeat(64)}/snapshot.json`, sha256: 'b'.repeat(64), bytes: 200 } };
  const selected = JSON.stringify({ kind: 'vasirbenchmark-writing-compact-source', schemaVersion: 1, snapshot: { path: source.snapshot.path, sha256: source.snapshot.sha256 } });
  const missing = Object.assign(new Error('absent private bytes'), { code: 'ENOENT' });
  const read = async record => { if (record.path === source.selection.path) return selected; throw missing; };
  assert.deepEqual(await assertCompactSelectedSourceEvidence(source, read), { unavailable: [source.snapshot.path], publications: null });
  await assert.rejects(() => assertCompactSelectedSourceEvidence(source, async () => { throw missing; }), /absent private bytes/);
  await assert.rejects(() => assertCompactSelectedSourceEvidence(source, async record => record.path === source.selection.path ? selected : Promise.reject(new Error('hash drift'))), /hash drift/);
  const changed = structuredClone(source); changed.snapshot.sha256 = 'c'.repeat(64);
  await assert.rejects(() => assertCompactSelectedSourceEvidence(changed, read));
});

function sharedFrameFixture() {
  const releaseId = 'd'.repeat(64), root = `reviews/writing-category/${releaseId}`;
  const candidate = { releaseId };
  const image = (path, width, height) => ({ path, width, height, bytes: 100, sha256: 'e'.repeat(64) });
  const canonical = { kind: 'vasirbenchmark-canonical-candidate-review', status: 'passed', releaseId, preservation: { overall: 'f'.repeat(64) }, results: sharedCanonicalTasks.map(task => ({ ...task, code: 0, bytes: 100, sha256: 'e'.repeat(64) })) };
  const sourceCoverage = sharedBenchmarks.map(benchmarkId => ({ benchmarkId, plannedSettingCount: 1, completedSettingCount: benchmarkId === focusedBenchmarkId ? 1 : 0, executionComplete: benchmarkId === focusedBenchmarkId, matchesDeclaredRoster: true, readyForComparison: benchmarkId === focusedBenchmarkId, included: benchmarkId === focusedBenchmarkId, exclusionReason: benchmarkId === focusedBenchmarkId ? null : 'official-scores-unavailable' }));
  const categoryIndex = { method: sharedMethod, benchmarkIds: sharedBenchmarks, activeBenchmarkIds: [focusedBenchmarkId], declaredConfigurationIds: ['model'], declaredRosterBenchmarkId: focusedBenchmarkId, declaredRosterSelection: 'widest-finalized-official-source', sourceCoverage, groupIds: ['storytelling'], benchmarkWeights: { [focusedBenchmarkId]: 1 }, completeSettings: 1, unscoredSettings: 0 };
  const categoryEvidence = { ...categoryIndex, mismatches: [], rawUnchanged: true, noPicker: true, tabsImmediatelyAfterHeader: true, answersLazy: true, disclosure: true, visibleSettingIds: ['model'], provisionalDisplayEvidence: [], presentationEvidence: { noPlaceholderPanels: true, compactRows: true, matchedOverallFrame: true, packedSegments: true, mismatches: [], numericPairedSettingIds: ['model'], packedBars: ['baseline', 'skill'].map(condition => ({ settingId: 'model', condition, segmentCount: 1, score: 80, total: 80 })) } };
  const writing = sharedBenchmarks.flatMap(benchmarkId => focusedViewports.map(({ width, height }) => ({ kind: 'vasirbenchmark-writing-browsercheck', status: 'passed', benchmarkId, width, height, errors: [], checks: ['passed'], coverage: { completedSettingCount: 1 }, categoryEvidence: structuredClone(categoryEvidence), screenshots: ['writing-models.png', 'writing-stacked-rows.png', 'writing-benchmarks.png', 'writing-efficiency.png', 'writing-efficiency-tokens.png', benchmarkId === 'dungeon-master-adventure-outline' ? 'dungeon-master-report.png' : 'writing-report.png'].map(path => image(path, width, height)) })));
  const games = [1440, 390].map(width => ({ kind: 'vasirbenchmark-games-browser-proof', width, height: width === 1440 ? 1000 : 844, coverageFailures: [], runtimeErrors: [], mediaFailures: [], delivery: { mode: 'local-pinned-bytes', failures: [], siteScope: { releaseId } }, coverage: { rows: 10, clipsAdvanced: 10, gamesLoadedAndInputObserved: 10, clipsFailed: 0, gamesWithObservedFailure: 0, gamesUnverified: 0, unavailableRows: 0 }, screenshots: ['', '-ratings', '-playback', '-play', '-fullscreen'].map(suffix => image(`${width === 1440 ? 'desktop' : 'mobile'}-games${suffix}.png`, width, width === 1440 ? 1000 : 844)) }));
  const writingBrowserProofs = writing.map(proof => { const benchmark = ['core', 'twists', 'dm', 'magic'][sharedBenchmarks.indexOf(proof.benchmarkId)]; return { benchmark, width: proof.width, path: `${root}/writing-${benchmark}-${proof.width}/writing-browsercheck.json`, coverage: proof.coverage, categoryEvidence: proof.categoryEvidence }; });
  const gamesBrowserProofs = games.map(proof => ({ width: proof.width, path: `${root}/games-${proof.width}/games-browsercheck-${proof.width}.json` }));
  const captures = [
    ...canonical.results.map(result => image(`${root}/canonical/${result.filename}`, result.width, result.height)),
    ...writing.flatMap((proof, index) => proof.screenshots.map(capture => ({ ...capture, path: `${dirname(writingBrowserProofs[index].path)}/${capture.path}` }))),
    ...games.flatMap((proof, index) => proof.screenshots.map(capture => ({ ...capture, path: `${dirname(gamesBrowserProofs[index].path)}/${capture.path}` })))
  ];
  const previousAcceptance = { path: `${root}/previous-template-lock.json`, bytes: 100, sha256: 'a'.repeat(64) };
  const manifest = { acceptance: { scope: { kind: 'shared-writing-category-frame', schemaVersion: 1, benchmarkIds: sharedBenchmarks, viewports: focusedViewports }, verification: { releaseId, freshCaptureRoot: root, candidate: { path: `${root}/candidate.json` }, canonicalRun: { path: `${root}/canonical/canonical-receipt.json` }, previousAcceptance, sourceSelections: sharedBenchmarks.map(benchmarkId => ({ benchmarkId })), localBrowserChecks: 32, preservedProjectionFields: canonical.preservation, categoryIndex, writingBrowserProofs, gamesBrowserProofs, provisionalSourceEvidence: [], freshCaptureCount: captures.length } }, captures, retainedCaptureEvidence: { receipt: previousAcceptance } };
  return { manifest, candidate, canonical, writing, games };
}

test('shared-frame acceptance supports a harness-bound QA namespace without relaxing legacy paths', () => {
  const legacy = sharedFrameFixture();
  assertSharedFrameInventory(legacy.manifest, legacy.candidate, legacy.canonical, legacy.writing, legacy.games);
  const namespaced = () => {
    const fixture = sharedFrameFixture(), legacyRoot = fixture.manifest.acceptance.verification.freshCaptureRoot;
    const sha256 = 'a'.repeat(64);
    fixture.canonical.source = { path: 'site/vasirbenchmark.com/capture.mjs', initialSha256: sha256, sha256 };
    fixture.manifest.files = [{ path: 'capture.mjs', sha256 }];
    return JSON.parse(JSON.stringify(fixture).replaceAll(legacyRoot, `${legacyRoot}/qa-${sha256}`));
  };
  const good = namespaced();
  assertSharedFrameInventory(good.manifest, good.candidate, good.canonical, good.writing, good.games);
  for (const mutate of [
    fixture => { fixture.manifest.acceptance.verification.freshCaptureRoot += '/extra'; },
    fixture => { fixture.manifest.acceptance.verification.freshCaptureRoot = `reviews/writing-category/${'b'.repeat(64)}/qa-${'a'.repeat(64)}`; },
    fixture => { fixture.canonical.source.sha256 = 'b'.repeat(64); },
    fixture => { fixture.canonical.source.initialSha256 = 'b'.repeat(64); },
    fixture => { fixture.manifest.files[0].sha256 = 'b'.repeat(64); },
    fixture => { fixture.canonical.source.sha256 = '../escape'; },
    fixture => { delete fixture.canonical.source; }
  ]) {
    const fixture = namespaced(); mutate(fixture);
    assert.throws(() => assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games));
  }
});

test('shared-frame acceptance requires the exact full canonical, four-benchmark and Games capture union', () => {
  const fixture = sharedFrameFixture();
  assert.doesNotThrow(() => assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games));
  for (const mutate of [
    value => { value.writing.pop(); },
    value => { value.writing[0].benchmarkId = focusedBenchmarkId; },
    value => { value.writing[0].height = 999; },
    value => { value.canonical.results[0].code = 1; },
    value => { value.canonical.results[0].filename = value.canonical.results[1].filename; },
    value => { value.manifest.captures.pop(); },
    value => { value.manifest.captures[0].sha256 = 'b'.repeat(64); },
    value => { value.manifest.captures[0].path = 'desktop.png'; },
    value => { value.manifest.acceptance.verification.freshCaptureCount++; },
    value => { value.manifest.acceptance.verification.sourceSelections.pop(); },
    value => { value.games[0].coverage.gamesLoadedAndInputObserved = 9; },
    value => { value.games[0].delivery.siteScope.releaseId = 'c'.repeat(64); }
  ]) {
    const changed = sharedFrameFixture(); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

function selectedFrameFixture() {
  const fixture = sharedFrameFixture();
  const { manifest, writing } = fixture;
  const verification = manifest.acceptance.verification;
  const index = { method: selectedMethod, selectionId: 'storytelling', selectionIds: selectedFields, provisional: true, benchmarkIds: sharedBenchmarks, activeBenchmarkIds: storyBenchmarks, groupIds: ['storytelling'], benchmarkWeights: Object.fromEntries(storyBenchmarks.map(id => [id, 1 / 3])), completeSettings: 1, unscoredSettings: 0 };
  verification.categoryIndex = index;
  verification.acceptanceEvidence = { path: `${verification.freshCaptureRoot}/acceptance-evidence.mjs`, bytes: 100, sha256: 'b'.repeat(64) };
  const rows = [{ settingId: 'model', exactBaseline: 60, exactSkill: 80, exactDelta: 20, baselineRank: 1, skillRank: 1, baselinePosition: 60, skillPosition: 80, ariaLabel: 'Plain 60.0, skill 80.0' }];
  const selectionEvidence = selectedFields.map(selectionId => {
    const ids = selectionId === 'storytelling' ? storyBenchmarks : selectionId === 'dungeon-master' ? ['dungeon-master-adventure-outline'] : [selectionId];
    return { selectionId, activeBenchmarkIds: ids, benchmarkWeights: Object.fromEntries(ids.map(id => [id, 1 / ids.length])), provisional: ['storytelling', 'storytelling-core-idea'].includes(selectionId), completeSettings: 1, rowEvidence: structuredClone(rows), componentEvidence: ids.map(benchmarkId => ({ settingId: 'model', benchmarkId, exactBaseline: 60, exactSkill: 80, weight: 1 / ids.length })), mismatches: [] };
  });
  for (const proof of writing) {
    proof.acceptanceEvidenceSha256 = verification.acceptanceEvidence.sha256;
    proof.categoryEvidence = { ...structuredClone(index), rawUnchanged: true, noPicker: true, tabsImmediatelyAfterHeader: true, answersLazy: true, disclosure: true, mismatches: [], visibleSettingIds: ['model'], provisionalDisplayEvidence: [], selectionEvidence: structuredClone(selectionEvidence), presentationEvidence: { noPlaceholderPanels: true, compactRows: true, matchedEngineeringFrame: true, dumbbellGeometry: true, mismatches: [], numericPairedSettingIds: ['model'], dumbbellRows: structuredClone(rows) } };
    const name = ['core', 'twists', 'dm', 'magic'][sharedBenchmarks.indexOf(proof.benchmarkId)];
    verification.writingBrowserProofs.find(record => record.benchmark === name && record.width === proof.width).categoryEvidence = proof.categoryEvidence;
    proof.screenshots.find(image => image.path === 'writing-stacked-rows.png').path = 'writing-comparison-rows.png';
    for (const selectionId of selectedFields) proof.screenshots.push({ ...proof.screenshots[0], path: `writing-selection-${selectionId}.png` });
  }
  const oldWriting = manifest.captures.filter(image => /\/writing-(?:core|twists|dm|magic)-/.test(image.path));
  const first = manifest.captures.indexOf(oldWriting[0]);
  const replacements = writing.flatMap((proof, index) => proof.screenshots.map(image => ({ ...image, path: `${dirname(verification.writingBrowserProofs[index].path)}/${image.path}` })));
  manifest.captures.splice(first, oldWriting.length, ...replacements);
  verification.freshCaptureCount = manifest.captures.length;
  return fixture;
}

test('selected-score acceptance preserves historical branches and requires all five new dumbbell captures', () => {
  const fixture = selectedFrameFixture();
  assert.doesNotThrow(() => assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games));
  for (const mutate of [
    value => { value.writing[0].categoryEvidence.selectionEvidence.pop(); },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].benchmarkWeights[storyBenchmarks[0]] = 1; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].provisional = false; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[1].rowEvidence[0].skillPosition = 81; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[1].componentEvidence[0].exactSkill = 90; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.matchedEngineeringFrame = false; },
    value => { value.writing[0].acceptanceEvidenceSha256 = 'c'.repeat(64); },
    value => { value.writing[0].screenshots = value.writing[0].screenshots.filter(image => image.path !== 'writing-selection-storytelling.png'); }
  ]) {
    const changed = selectedFrameFixture(); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

function availableFrameFixture() {
  const fixture = selectedFrameFixture();
  const { manifest, writing } = fixture;
  const index = manifest.acceptance.verification.categoryIndex;
  Object.assign(index, { method: availableMethod, rankedSettings: 1, partialSettings: 2 });
  for (const proof of writing) {
    const category = proof.categoryEvidence;
    Object.assign(category, { method: availableMethod, rankedSettings: 1, partialSettings: 2, visibleSettingIds: ['model', 'two-tests', 'one-test'] });
    for (const selection of category.selectionEvidence) {
      const story = selection.selectionId === 'storytelling';
      const roster = ['model'];
      if (story || ['storytelling-core-idea', focusedBenchmarkId].includes(selection.selectionId)) roster.push('two-tests');
      if (story || selection.selectionId === focusedBenchmarkId) roster.push('one-test');
      selection.rowEvidence = roster.map(settingId => {
        const partial = story && settingId !== 'model';
        return { settingId, exactBaseline: 60, exactSkill: 80, exactDelta: 20, baselineRank: partial ? null : 1, skillRank: partial ? null : 1, baselinePosition: 60, skillPosition: 80, partial, asteriskRendered: partial, ariaLabel: `Plain 60.0${partial ? '*' : ''}, skill 80.0${partial ? '*' : ''}` };
      });
      Object.assign(selection, { completeSettings: story ? 1 : roster.length, rankedSettings: story ? 1 : roster.length, partialSettings: story ? 2 : 0 });
      selection.componentEvidence = roster.flatMap(settingId => {
        const ids = !story || settingId === 'model' ? selection.activeBenchmarkIds
          : settingId === 'two-tests' ? ['storytelling-core-idea', focusedBenchmarkId] : [focusedBenchmarkId];
        return ids.map(benchmarkId => ({ settingId, benchmarkId, exactBaseline: 60, exactSkill: 80, weight: 1 / ids.length }));
      });
      selection.headerEvidence = [{ condition: 'skill', entryId: 'model-skill', partial: false, asteriskRendered: false }];
      selection.sidebarPartial = false;
      selection.sidebarAsteriskRendered = false;
      selection.partialFootnote = '* Unranked mean of available scores, not a comparable aggregate. Missing tests are not zero. Only models with every selected test receive a rank.';
      selection.aggregateEvidence = roster.map(settingId => ({ settingId, exactBaseline: 60, exactSkill: 80, partial: story && settingId !== 'model', asteriskRendered: story && settingId !== 'model', divisor: selection.componentEvidence.filter(component => component.settingId === settingId).length }));
    }
    const aggregate = category.selectionEvidence[0];
    category.presentationEvidence.numericPairedSettingIds = ['model', 'two-tests', 'one-test'];
    category.presentationEvidence.dumbbellRows = structuredClone(aggregate.rowEvidence);
  }
  return fixture;
}

test('common-test acceptance keeps incomplete means visible without ranking them', () => {
  const fixture = availableFrameFixture();
  assert.doesNotThrow(() => assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games));
  for (const mutate of [
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rowEvidence[1].asteriskRendered = false; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rowEvidence[1].partial = false; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].componentEvidence.find(component => component.settingId === 'two-tests').weight = 1 / 3; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].componentEvidence.find(component => component.settingId === 'one-test').weight = 1 / 3; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rankedSettings = 2; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].partialSettings = 0; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rowEvidence[1].ariaLabel = 'Plain 60.0, skill 80.0'; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rowEvidence.pop(); }
  ]) {
    const changed = availableFrameFixture(); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

function allWritingFrameFixture() {
  const fixture = availableFrameFixture(), { manifest, writing } = fixture;
  const verification = manifest.acceptance.verification, index = verification.categoryIndex;
  Object.assign(index, { selectionId: 'all-writing', selectionIds: allWritingFields, benchmarkIds: allWritingBenchmarks, activeBenchmarkIds: allWritingBenchmarks, benchmarkWeights: allWritingWeights, groupIds: ['storytelling', 'dungeon-master'], groupWeights: { storytelling: 1 / 2, 'dungeon-master': 1 / 2 }, weighting: 'equal-tracks-equal-benchmarks' });
  const roster = ['model', 'mixed-partial', 'story-partial'];
  const availableIds = id => id === 'model' ? sharedBenchmarks : id === 'mixed-partial' ? [storyBenchmarks[0], 'dungeon-master-adventure-outline'] : [storyBenchmarks[1], focusedBenchmarkId];
  const baseline = id => ({ [storyBenchmarks[0]]: 80, [storyBenchmarks[1]]: 60, [focusedBenchmarkId]: 40, 'dungeon-master-adventure-outline': 20 })[id];
  const selections = allWritingFields.map(selectionId => {
    const ids = selectionBenchmarks(selectionId), weights = selectionWeights(selectionId);
    const componentEvidence = roster.flatMap(settingId => {
      const present = ids.filter(id => availableIds(settingId).includes(id)), sum = present.reduce((value, id) => value + weights[id], 0);
      return present.map(benchmarkId => ({ settingId, benchmarkId, exactBaseline: baseline(benchmarkId), exactSkill: baseline(benchmarkId) + 10, weight: weights[benchmarkId] / sum }));
    });
    const rowEvidence = roster.filter(settingId => componentEvidence.some(item => item.settingId === settingId)).map(settingId => {
      const components = componentEvidence.filter(item => item.settingId === settingId), partial = components.length < ids.length;
      const exactBaseline = components.reduce((sum, item) => sum + item.exactBaseline * item.weight, 0), exactSkill = components.reduce((sum, item) => sum + item.exactSkill * item.weight, 0);
      const baselinePosition = Math.round(exactBaseline * 10) / 10, skillPosition = Math.round(exactSkill * 10) / 10;
      return { settingId, exactBaseline, exactSkill, exactDelta: exactSkill - exactBaseline, baselinePosition, skillPosition, partial, asteriskRendered: partial, ariaLabel: `Plain ${baselinePosition.toFixed(1)}${partial ? '*' : ''}, skill ${skillPosition.toFixed(1)}${partial ? '*' : ''}` };
    });
    for (const row of rowEvidence) for (const condition of ['baseline', 'skill']) row[condition + 'Rank'] = row.partial ? null : 1 + rowEvidence.filter(other => !other.partial && other[condition === 'baseline' ? 'exactBaseline' : 'exactSkill'] > row[condition === 'baseline' ? 'exactBaseline' : 'exactSkill']).length;
    const leader = rowEvidence.find(row => row.skillRank === 1), rankedSettings = rowEvidence.filter(row => !row.partial).length;
    const aggregateEvidence = rowEvidence.map(row => {
      const components = componentEvidence.filter(item => item.settingId === row.settingId), equal = components.every(item => Math.abs(item.weight - 1 / components.length) < 1e-8);
      const formulas = ['exactBaseline', 'exactSkill'].map(field => equal ? `(${components.map(item => item[field]).join(' + ')}) ÷ ${components.length} = ${row[field]}${row.partial ? '*' : ''}` : `${components.map(item => `${item[field]} × ${item.weight === 1 / 6 ? '1/6' : String(item.weight)}`).join(' + ')} = ${row[field]}${row.partial ? '*' : ''}`);
      return { settingId: row.settingId, exactBaseline: row.exactBaseline, exactSkill: row.exactSkill, partial: row.partial, asteriskRendered: row.partial, divisor: equal ? components.length : null, method: equal ? 'arithmetic-mean' : 'weighted-sum', sourceCount: components.length, componentWeights: Object.fromEntries(components.map(item => [item.benchmarkId, item.weight])), formulas };
    });
    return { selectionId, activeBenchmarkIds: ids, benchmarkWeights: weights, provisional: ids.includes(storyBenchmarks[0]), completeSettings: rankedSettings, rankedSettings, partialSettings: rowEvidence.length - rankedSettings, rowEvidence, componentEvidence, aggregateEvidence, headerEvidence: leader ? [{ condition: 'skill', entryId: leader.settingId + '-skill', partial: false, asteriskRendered: false }] : [], sidebarPartial: false, sidebarAsteriskRendered: false, sidebarScore: '50.0', sidebarLabel: 'All Writing skill 50.0 out of 100', partialFootnote: '* Unranked mean of available scores, not a comparable aggregate. Missing tests are not zero. Only models with every selected test receive a rank.', mismatches: [] };
  });
  const control = (mode, selectionId, selectedSettingId = null) => ({ mode, selectionId, selectedSettingId, hash: '#capabilities/writing' + (mode === 'models' ? '' : '/' + mode), sidebarScore: '50.0', visible: true, mismatches: [] });
  const overview = (selectionId, selectedSettingId) => {
    const selection = selections.find(item => item.selectionId === selectionId), row = selection.rowEvidence.find(item => item.settingId === selectedSettingId);
    return { selectionId, selectedSettingId, selectedSettingIds: roster, exactBaseline: row?.exactBaseline ?? null, exactSkill: row?.exactSkill ?? null, components: selection.componentEvidence.filter(item => item.settingId === selectedSettingId).map(({ settingId, ...component }) => component), fieldMeans: sharedBenchmarks.map(benchmarkId => {
      const fieldSelection = benchmarkId === 'dungeon-master-adventure-outline' ? 'dungeon-master' : benchmarkId;
      return { benchmarkId, selectionId: fieldSelection, baseline: 67, skill: 77, provisional: benchmarkId === storyBenchmarks[0], renderedBaseline: '67.0', renderedSkill: '77.0', compareHref: `https://example.test/index.html?score=${fieldSelection}&setting=${selectedSettingId}#capabilities/writing` };
    }), mismatches: [] };
  };
  for (const proof of writing) {
    Object.assign(proof.categoryEvidence, structuredClone(index), { settingIds: roster, selectionEvidence: structuredClone(selections), visibleSettingIds: roster, sharedScoreSelector: true, selectorInsideLeaderboard: false, selectorOptions: allWritingFields, sharedSelectorEvidence: ['models', 'benchmarks', 'efficiency'].map(mode => control(mode, 'all-writing')).concat(control('models', 'storytelling-plot-twists', 'mixed-partial')), historyEvidence: [{ direction: 'back', ...control('benchmarks', 'all-writing', 'mixed-partial') }, { direction: 'forward', ...control('benchmarks', focusedBenchmarkId, 'mixed-partial') }], benchmarkOverviewEvidence: [overview('all-writing', 'model'), overview('all-writing', 'mixed-partial'), overview(focusedBenchmarkId, 'mixed-partial'), overview('all-writing', 'mixed-partial')] });
    Object.assign(proof.categoryEvidence.presentationEvidence, { numericPairedSettingIds: roster, dumbbellRows: structuredClone(selections[0].rowEvidence) });
    proof.screenshots.push({ ...proof.screenshots[0], path: 'writing-selection-all-writing.png' });
  }
  const oldWriting = manifest.captures.filter(image => /\/writing-(?:core|twists|dm|magic)-/.test(image.path));
  manifest.captures.splice(manifest.captures.indexOf(oldWriting[0]), oldWriting.length, ...writing.flatMap((proof, index) => proof.screenshots.map(image => ({ ...image, path: `${dirname(verification.writingBrowserProofs[index].path)}/${image.path}` }))));
  verification.freshCaptureCount = manifest.captures.length;
  return fixture;
}

test('All Writing site-lock receipts retain legacy branches and verify equal-track complete and partial arithmetic', () => {
  const fixture = allWritingFrameFixture();
  assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games);
  const all = fixture.writing[0].categoryEvidence.selectionEvidence[0];
  assert.ok(Math.abs(all.rowEvidence.find(row => row.settingId === 'model').exactSkill - 50) < 1e-8);
  assert.equal(all.rowEvidence.find(row => row.settingId === 'mixed-partial').exactSkill, 45);
  assert.equal(all.rowEvidence.find(row => row.settingId === 'story-partial').exactSkill, 60);
  assert.deepEqual(all.componentEvidence.filter(item => item.settingId === 'mixed-partial').map(item => item.weight), [0.25, 0.75]);
  assert.deepEqual(all.componentEvidence.filter(item => item.settingId === 'story-partial').map(item => item.weight), [0.5, 0.5]);
});

test('All Writing site-lock rejects flat weights, partial promotion, stale selectors, formula drift and disconnected shared views', () => {
  for (const mutate of [
    value => { value.manifest.acceptance.verification.categoryIndex.benchmarkIds = [...sharedBenchmarks]; },
    value => { value.manifest.acceptance.verification.categoryIndex.activeBenchmarkIds = [...sharedBenchmarks]; },
    value => { value.manifest.acceptance.verification.categoryIndex.benchmarkWeights = Object.fromEntries(sharedBenchmarks.map(id => [id, 1 / 4])); },
    value => { value.manifest.acceptance.verification.categoryIndex.groupWeights.storytelling = 3 / 4; },
    value => { value.manifest.acceptance.verification.categoryIndex.weighting = 'equal-fixed-benchmarks-for-ranked-settings'; },
    value => { value.writing[0].categoryEvidence.selectionEvidence.shift(); },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].componentEvidence.find(item => item.settingId === 'mixed-partial').weight = 1 / 2; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rowEvidence[1].skillRank = 1; },
    value => { value.writing[0].categoryEvidence.selectionEvidence.at(-1).rowEvidence[0].exactSkill++; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].aggregateEvidence[0].divisor = 4; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].aggregateEvidence[0].formulas[0] = '90 × 16.7% + 30 × 50% = 50'; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].aggregateEvidence[0].componentWeights[storyBenchmarks[0]] = 1 / 4; },
    value => { value.writing[0].categoryEvidence.sharedScoreSelector = false; },
    value => { value.writing[0].categoryEvidence.selectorInsideLeaderboard = true; },
    value => { value.writing[0].categoryEvidence.selectorOptions = selectedFields; },
    value => { value.writing[0].categoryEvidence.sharedSelectorEvidence[0].sidebarScore = '70.0'; },
    value => { value.writing[0].categoryEvidence.historyEvidence[0].selectedSettingId = 'model'; },
    value => { value.writing[0].categoryEvidence.benchmarkOverviewEvidence[1].components[0].weight = 1 / 2; },
    value => { value.writing[0].categoryEvidence.benchmarkOverviewEvidence[1].exactSkill = 60; },
    value => { value.writing[0].categoryEvidence.benchmarkOverviewEvidence[1].fieldMeans[0].skill = 45; },
    value => { value.writing[0].categoryEvidence.benchmarkOverviewEvidence[1].fieldMeans.at(-1).compareHref = 'https://example.test/?score=storytelling&setting=model#capabilities/writing'; },
    value => { value.writing[0].screenshots = value.writing[0].screenshots.filter(image => image.path !== 'writing-selection-all-writing.png'); }
  ]) {
    const fixture = allWritingFrameFixture(); mutate(fixture);
    assert.throws(() => assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games));
  }
});

function cleanLedgerFrameFixture() {
  const fixture = allWritingFrameFixture(), { manifest, writing } = fixture, verification = manifest.acceptance.verification;
  verification.categoryIndex.presentationVariant = cleanLedgerPresentation;
  const original = { benchmarkId: storyBenchmarks[0], sourceSha256: 'a'.repeat(64), judgeConfigurationId: 'codex:gpt-6-astra@xhigh', rankedSettings: 3, incompleteSettings: 0 };
  verification.provisionalSourceEvidence = [original];
  for (const proof of writing) {
    const category = proof.categoryEvidence;
    category.presentationVariant = cleanLedgerPresentation;
    category.sharedSelectorEvidence = category.sharedSelectorEvidence.filter(item => item.mode !== 'benchmarks');
    category.historyEvidence = category.historyEvidence.map(item => ({ ...item, mode: 'models', hash: '#capabilities/writing' }));
    category.leaderboardCleanEvidence = { noProvisionalBanner: true, noVerboseCounts: true, methodologyAvailable: true, mismatches: [] };
    category.modelDisclosureEvidence = { defaultClosed: true, opensForAudit: true, closesAfterAudit: true, mismatches: [] };
    for (const selection of category.selectionEvidence) {
      selection.modelDisclosureEvidence = structuredClone(category.modelDisclosureEvidence);
      selection.partialFootnote = '* Incomplete results are shown separately, without a rank.';
    }
    category.cleanLedgerEvidence = category.benchmarkOverviewEvidence.map((overview, index) => ({ selectionId: index === 3 ? 'storytelling-plot-twists' : overview.selectionId, selectedSettingId: overview.selectedSettingId,
      groups: [{ trackId: 'storytelling', benchmarkIds: storyBenchmarks }, { trackId: 'dungeon-master', benchmarkIds: ['dungeon-master-adventure-outline'] }],
      rows: allWritingBenchmarks.map(benchmarkId => {
        const field = overview.fieldMeans.find(item => item.benchmarkId === benchmarkId);
        return { ...field, trackId: benchmarkId === 'dungeon-master-adventure-outline' ? 'dungeon-master' : 'storytelling', delta: 10, renderedDelta: '+10.0', sourceKind: field.provisional ? 'provisional-single-judge' : 'official-panel', sourceSha256: 'a'.repeat(64), metadata: { settingCount: 3, caseCount: 1, trialCount: 1, judgeCount: field.provisional ? 1 : 2 }, reportHref: 'https://example.test/benchmark-report.html#' + benchmarkId };
      }), noModelSelector: true, noBreakdown: true, noFormula: true, noScoreSelector: true, noInlineProvisional: true, noExplanationEssay: true, noPartialFootnote: true, noVisibleNoise: true, mismatches: [] }));
    delete category.benchmarkOverviewEvidence;
    category.provisionalMethodEvidence = [{ benchmarkId: original.benchmarkId, sourceSha256: original.sourceSha256, judgeConfigurationIds: [original.judgeConfigurationId], scope: 'category-methodology', defaultClosed: true, openedForAudit: true, provisional: true, singleJudge: true, excludedOverall: true, reportHref: 'https://example.test/benchmark-report.html#' + original.benchmarkId, closedAfterAudit: true, mismatches: [] }];
    proof.reportPresentationEvidence = { benchmarkId: proof.benchmarkId, defaultClosed: true, modelComparisonFirst: true, modelComparisonHeading: 'Model comparison', secondaryTablesHidden: true, opensForAudit: true, closesAfterAudit: true, mismatches: [] };
    verification.writingBrowserProofs.find(record => record.width === proof.width && record.categoryEvidence === category).reportPresentationEvidence = proof.reportPresentationEvidence;
    proof.screenshots.push({ ...proof.screenshots[0], path: 'writing-index-method.png' });
    proof.screenshots.push({ ...proof.screenshots[0], path: 'writing-report-default.png' });
  }
  const oldWriting = manifest.captures.filter(image => /\/writing-(?:core|twists|dm|magic)-/.test(image.path));
  manifest.captures.splice(manifest.captures.indexOf(oldWriting[0]), oldWriting.length, ...writing.flatMap((proof, index) => proof.screenshots.map(image => ({ ...image, path: `${dirname(verification.writingBrowserProofs[index].path)}/${image.path}` }))));
  verification.freshCaptureCount = manifest.captures.length;
  return fixture;
}

test('clean-ledger site-lock keeps original scoring gates and historical presentation branches', () => {
  const fixture = cleanLedgerFrameFixture();
  assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games);
  const legacy = allWritingFrameFixture();
  assertSharedFrameInventory(legacy.manifest, legacy.candidate, legacy.canonical, legacy.writing, legacy.games);
  for (const mutate of [
    value => { value.manifest.acceptance.verification.categoryIndex.presentationVariant = 'unreviewed-layout'; },
    value => { delete value.writing[0].categoryEvidence.presentationVariant; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].noModelSelector = false; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].noScoreSelector = false; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].noInlineProvisional = false; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows.reverse(); },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[1].rows[0].skill++; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[1].rows[0].metadata.judgeCount++; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[1].rows[0].reportHref = 'https://example.test/benchmark-report.html#another-test'; },
    value => { value.writing[0].categoryEvidence.provisionalMethodEvidence[0].singleJudge = false; },
    value => { value.writing[0].categoryEvidence.provisionalMethodEvidence[0].sourceSha256 = 'b'.repeat(64); },
    value => { value.writing[0].categoryEvidence.provisionalDisplayEvidence = [{}]; },
    value => { value.writing[0].categoryEvidence.modelDisclosureEvidence.defaultClosed = false; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[1].modelDisclosureEvidence.closesAfterAudit = false; },
    value => { value.writing[0].categoryEvidence.leaderboardCleanEvidence.noProvisionalBanner = false; },
    value => { value.writing[0].reportPresentationEvidence.secondaryTablesHidden = false; },
    value => { value.writing[0].reportPresentationEvidence.modelComparisonHeading = 'Different report'; },
    value => { value.writing[0].screenshots = value.writing[0].screenshots.filter(image => image.path !== 'writing-index-method.png'); },
    value => { value.writing[0].screenshots = value.writing[0].screenshots.filter(image => image.path !== 'writing-report-default.png'); },
    value => { value.writing[0].screenshots.push({ ...value.writing[0].screenshots[0], path: 'writing-provisional.png' }); },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rowEvidence[1].skillRank = 1; }
  ]) {
    const changed = cleanLedgerFrameFixture(); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

function leadersLedgerFrameFixture() {
  const fixture = cleanLedgerFrameFixture(), { manifest, writing } = fixture;
  manifest.acceptance.verification.categoryIndex.presentationVariant = leadersLedgerPresentation;
  const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  for (const proof of writing) {
    const category = proof.categoryEvidence;
    category.presentationVariant = leadersLedgerPresentation;
    for (const selected of category.selectionEvidence) for (const row of selected.rowEvidence) {
      row.configurationId = { model: 'z-config', 'mixed-partial': 'A-config', 'story-partial': 'a-config' }[row.settingId];
      row.label = 'Original ' + row.settingId;
    }
    category.presentationEvidence.dumbbellRows = structuredClone(category.selectionEvidence[0].rowEvidence);
    for (const ledger of category.cleanLedgerEvidence) for (const row of ledger.rows) {
      const candidates = category.selectionEvidence.find(item => item.selectionId === (row.benchmarkId === 'dungeon-master-adventure-outline' ? 'dungeon-master' : row.benchmarkId)).rowEvidence.filter(item => !item.partial);
      const high = Math.max(...candidates.map(item => item.exactSkill));
      const ties = candidates.filter(item => item.exactSkill === high).sort((a, b) => a.configurationId < b.configurationId ? -1 : a.configurationId > b.configurationId ? 1 : 0), winner = ties[0];
      if (!winner) { row.topModel = null; continue; }
      const delta = receiptScorePosition(winner.exactSkill - winner.exactBaseline, true);
      row.topModel = { settingId: winner.settingId, configurationId: winner.configurationId, label: winner.label, exactBaseline: winner.exactBaseline, exactSkill: winner.exactSkill, exactDelta: winner.exactSkill - winner.exactBaseline, tiedCount: ties.length,
        renderedBaseline: receiptScorePosition(winner.exactBaseline, true).toFixed(1), renderedSkill: receiptScorePosition(winner.exactSkill, true).toFixed(1), renderedDelta: delta > 0 ? '+' + delta.toFixed(1) : delta < 0 ? '−' + Math.abs(delta).toFixed(1) : '±0.0', visible: true,
        geometry: { viewportWidth: proof.width, row: rect(5, 5, 380, 120), comparison: rect(15, 15, 360, 100), block: rect(20, 20, 350, 90), fields: [{ name: 'label', rect: rect(25, 25, 200, 20) }, { name: 'baseline', rect: rect(25, 55, 70, 20) }, { name: 'skill', rect: rect(105, 55, 70, 20) }, { name: 'delta', rect: rect(185, 55, 70, 20) }], withinRow: true, withinComparison: true, withinViewport: true, fieldsWithinBlock: true, fieldsNonOverlapping: true, noTextOverflow: true }, mismatches: [] };
    }
  }
  return fixture;
}

test('benchmark-leader site-lock independently reconciles exact tied winners with single-benchmark model rows', () => {
  const fixture = leadersLedgerFrameFixture();
  assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games);
  const core = fixture.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0];
  assert.equal(core.topModel.configurationId, 'A-config');
  assert.equal(core.topModel.tiedCount, 2);
  assert.equal(core.skill, 77);
  assert.equal(core.topModel.exactSkill, 90);
  for (const mutate of [
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel = null; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.settingId = 'model'; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.configurationId = 'z-config'; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.label = 'Different model'; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.exactBaseline++; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.exactDelta++; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.tiedCount = 1; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.geometry.block.right = 400; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.geometry.fields[1].rect = { ...value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.geometry.fields[2].rect }; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.geometry.noTextOverflow = false; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[2].rowEvidence[0].configurationId = 'unrelated'; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[1].rows[0].skill = 90; }
  ]) {
    const changed = leadersLedgerFrameFixture(); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

function overallFrameFixture(fixture = leadersLedgerFrameFixture()) {
  const { manifest, candidate, canonical, writing } = fixture;
  const verification = manifest.acceptance.verification, root = verification.freshCaptureRoot;
  const writingBenchmarkIds = verification.categoryIndex.activeBenchmarkIds;
  const writingWeights = verification.categoryIndex.benchmarkWeights;
  verification.categoryIndex.presentationVariant = overallPresentation;
  const writingSource = { path: 'writing-data.js', bytes: 100, sha256: 'b'.repeat(64) };
  candidate.siteFiles = [writingSource];
  verification.canonicalController = { path: `${root}/capture-candidate.mjs`, bytes: 100, sha256: 'a'.repeat(64) };
  canonical.overallSourceValidation = { kind: 'independent-overall-v3-original-source-oracle', edition: 'overall-v3', writingSource,
    oracle: { path: 'docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs', initialSha256: verification.acceptanceEvidence.sha256, sha256: verification.acceptanceEvidence.sha256 },
    controller: { path: 'docs/work/vasir-benchmarking/storytelling-plot-twists/capture-candidate.mjs', initialSha256: verification.canonicalController.sha256, sha256: verification.canonicalController.sha256 } };
  verification.overallSourceValidation = canonical.overallSourceValidation;
  for (const proof of writing) {
    const category = proof.categoryEvidence;
    category.presentationVariant = overallPresentation;
    const selected = category.selectionEvidence.find(item => item.selectionId === 'all-writing');
    const row = selected.rowEvidence.find(item => !item.partial);
    const categories = [{ id: 'engineering', weight: 0.5 }, { id: 'writing', weight: 0.25 }, { id: 'ai-workflows', weight: 0.25 }];
    const benchmarkWeights = [{ benchmarkId: 'e1', familyId: 'engineering', weight: 0.5 }, ...writingBenchmarkIds.map(benchmarkId => ({ benchmarkId, familyId: 'writing', weight: writingWeights[benchmarkId] * 0.25 })), { benchmarkId: 'ai1', familyId: 'ai-workflows', weight: 0.25 }];
    const entries = ['baseline', 'skill'].map(condition => {
      const components = categories.map(category => ({ category: category.id, weight: category.weight, exactScore: category.id === 'writing' ? row[condition === 'skill' ? 'exactSkill' : 'exactBaseline'] : condition === 'skill' ? 80 : 60 }));
      for (const component of components) component.exactContribution = component.exactScore * component.weight;
      return { id: `${row.settingId}-${condition}`, settingId: row.settingId, configurationId: row.configurationId, condition, categories: components, exactScore: components.reduce((sum, item) => sum + item.exactContribution, 0), rank: 1 };
    });
    category.overall = JSON.stringify({ scoreBasis: { edition: 'overall-v3', taskCount: benchmarkWeights.length, benchmarkIds: benchmarkWeights.map(item => item.benchmarkId), benchmarkWeights }, categories, entries, coverage: { eligibleSettings: 1 }, portfolioCategories: [{ id: 'games', weight: 0, status: 'coming-soon', benchmarkIds: [] }] });
    proof.overallSha256 = sha256(category.overall);
    canonical.preservation.overall = proof.overallSha256;
    canonical.overallSourceValidation.overallSha256 = proof.overallSha256;
    const clicked = entries.find(item => item.condition === 'skill'), component = clicked.categories.find(item => item.category === 'writing');
    category.overallIntegrationEvidence = { edition: 'overall-v3', sourceOverallSha256: proof.overallSha256, includedCategoryIds: categories.map(item => item.id), categoryWeights: Object.fromEntries(categories.map(item => [item.id, item.weight])), writingBenchmarkWeights: { ...writingWeights }, writingSelectionId: 'all-writing', gamesExcluded: true, sourceScoreVerified: true, lazyBeforeWriting: true, answersLazy: true, mismatches: [],
      writingSegmentNavigation: { clicked: { entryId: clicked.id, settingId: clicked.settingId, configurationId: clicked.configurationId, exactScore: component.exactScore, weight: component.weight, staleSelection: 'storytelling' }, destination: { selectionId: 'all-writing', hash: '#capabilities/writing', settingId: row.settingId, configurationId: row.configurationId, exactScore: row.exactSkill }, mismatches: [] } };
    for (const record of category.provisionalMethodEvidence) Object.assign(record, { excludedOverall: false, includedOverall: true, overallWeight: 0.25 });
  }
  return fixture;
}

test('Overall v3 site-lock binds source validation, nested weights, complete Writing pairs and real segment navigation', () => {
  const fixture = overallFrameFixture();
  assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games);
  for (const mutate of [
    value => { delete value.canonical.overallSourceValidation; },
    value => { value.canonical.overallSourceValidation.oracle.initialSha256 = 'c'.repeat(64); },
    value => { value.canonical.overallSourceValidation.controller.sha256 = 'c'.repeat(64); },
    value => { value.candidate.siteFiles[0] = { ...value.candidate.siteFiles[0], bytes: 101 }; },
    value => { value.writing[0].categoryEvidence.overallIntegrationEvidence.categoryWeights.writing = 0; },
    value => { value.writing[0].categoryEvidence.overallIntegrationEvidence.writingBenchmarkWeights[focusedBenchmarkId] = 0.25; },
    value => { value.writing[0].categoryEvidence.overallIntegrationEvidence.sourceScoreVerified = false; },
    value => { value.writing[0].categoryEvidence.overallIntegrationEvidence.lazyBeforeWriting = false; },
    value => { value.writing[0].categoryEvidence.overallIntegrationEvidence.gamesExcluded = false; },
    value => { value.writing[0].categoryEvidence.overallIntegrationEvidence.writingSegmentNavigation.clicked.exactScore++; },
    value => { value.writing[0].categoryEvidence.overallIntegrationEvidence.writingSegmentNavigation.destination.selectionId = 'storytelling'; },
    value => { value.writing[0].categoryEvidence.overallIntegrationEvidence.writingSegmentNavigation.destination.configurationId = 'a-config'; },
    value => { value.writing[0].categoryEvidence.provisionalMethodEvidence[0].excludedOverall = true; },
    value => { value.writing[0].categoryEvidence.provisionalMethodEvidence[0].overallWeight = 0; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel = null; }
  ]) {
    const changed = overallFrameFixture(); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
  for (const mutate of [
    overall => { overall.entries[0].categories[1].exactScore++; },
    overall => { overall.entries[0].rank++; },
    overall => { overall.entries.pop(); },
    overall => { overall.scoreBasis.benchmarkWeights.find(item => item.familyId === 'writing').weight *= 2; },
    overall => { overall.portfolioCategories[0].weight = 0.1; }
  ]) {
    const changed = overallFrameFixture(), proof = changed.writing[0];
    const overall = JSON.parse(proof.categoryEvidence.overall); mutate(overall);
    proof.categoryEvidence.overall = JSON.stringify(overall); proof.overallSha256 = sha256(proof.categoryEvidence.overall);
    proof.categoryEvidence.overallIntegrationEvidence.sourceOverallSha256 = proof.overallSha256;
    assert.throws(() => assertOverallIntegrationReceipt(proof, { preservation: { overall: proof.overallSha256 } }, changed.manifest.acceptance.verification.categoryIndex));
  }
  const legacy = leadersLedgerFrameFixture();
  legacy.writing[0].categoryEvidence.provisionalMethodEvidence[0].excludedOverall = false;
  assert.throws(() => assertSharedFrameInventory(legacy.manifest, legacy.candidate, legacy.canonical, legacy.writing, legacy.games));
});

test('All Writing site-lock honors the established display-only ULP policy without changing historical rounding', () => {
  assert.equal(receiptScorePosition(84.14999999999999, true), 84.2);
  assert.equal(receiptScorePosition(84.14999999999999, false), 84.1);
  assert.equal(receiptScorePosition(84.149999999, true), 84.1);
  assert.equal(receiptScorePosition(0, true), 0);
  assert.equal(receiptScorePosition(100, true), 100);
});

test('shared-frame acceptance rejects placeholder panels, missing numeric pairs, incoherent bars and an unready source index', () => {
  for (const mutate of [
    value => { value.writing[0].categoryEvidence.partialEvidence = {}; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.noPlaceholderPanels = false; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.compactRows = false; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.matchedOverallFrame = false; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.numericPairedSettingIds = []; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.packedBars.pop(); },
    value => { value.writing[0].categoryEvidence.presentationEvidence.packedBars[0].total = null; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.packedBars[0].score = 0; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.packedBars[0].segmentCount = 2; },
    value => { value.manifest.acceptance.verification.categoryIndex.completeSettings = 0; },
    value => { value.manifest.acceptance.verification.categoryIndex.sourceCoverage.at(-1).executionComplete = false; },
    value => { value.manifest.acceptance.verification.categoryIndex.benchmarkWeights[focusedBenchmarkId] = 0.5; },
    value => { value.manifest.acceptance.verification.categoryIndex.declaredRosterSelection = 'widest-planned-fallback'; }
  ]) {
    const changed = sharedFrameFixture(); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

test('shared-frame HTML source pins reproduce the exact release dependency transform without changing stable routes', () => {
  const releaseId = 'a'.repeat(64);
  const contents = Buffer.from('<script src="./app.js"></script><a href="./games.html">Games</a>');
  const accepted = { path: 'index.html', bytes: contents.length, sha256: sha256(contents) };
  const publicFiles = [{ path: 'index.html', cacheClass: 'html' }, { path: 'app.js', cacheClass: 'immutable' }, { path: 'games.html', cacheClass: 'html' }];
  const published = Buffer.from(`<script src="/releases/${releaseId}/app.js"></script><a href="./games.html">Games</a>`);
  const released = { path: accepted.path, bytes: published.length, sha256: sha256(published) };
  assert.doesNotThrow(() => assertReleasePresentationFile(accepted, { ...accepted }, released, contents, releaseId, publicFiles));
  assert.throws(() => assertReleasePresentationFile(accepted, { ...accepted, sha256: 'b'.repeat(64) }, released, contents, releaseId, publicFiles));
  assert.throws(() => assertReleasePresentationFile(accepted, { ...accepted }, { ...accepted }, contents, releaseId, publicFiles));
  assert.throws(() => assertReleasePresentationFile(accepted, { ...accepted }, released, contents, 'c'.repeat(64), publicFiles));
  assert.throws(() => assertReleasePresentationFile(accepted, { ...accepted }, released, contents, releaseId, publicFiles.map(file => ({ ...file, cacheClass: 'immutable' }))));
});

function compactFrameFixture() {
  let fixture = sharedFrameFixture();
  const previousRoot = fixture.manifest.acceptance.verification.freshCaptureRoot, harnessSha = 'a'.repeat(64);
  fixture.canonical.source = { path: 'site/vasirbenchmark.com/capture.mjs', initialSha256: harnessSha, sha256: harnessSha };
  fixture.manifest.files = [{ path: 'capture.mjs', sha256: harnessSha }, { path: compactHarness, bytes: 100, sha256: harnessSha }];
  fixture = JSON.parse(JSON.stringify(fixture).replaceAll(previousRoot, `${previousRoot}/qa-${harnessSha}`));
  const { manifest } = fixture, verification = manifest.acceptance.verification, root = verification.freshCaptureRoot;
  manifest.acceptance.scope.benchmarkIds = compactSharedBenchmarks;
  verification.compactEvidenceHarness = { path: `${root}/${compactHarness}`, bytes: 100, sha256: harnessSha };
  verification.acceptanceEvidence = { path: `${root}/acceptance-evidence.mjs`, sha256: harnessSha };
  verification.compactSourceSelection = { kind: 'vasirbenchmark-compact-writing-source-verification', benchmarkIds: compactBenchmarkIds,
    selection: { path: 'benchmarks/writing-compact-v1/publication.json', bytes: 100, sha256: harnessSha },
    snapshot: { path: `.agents/vasir-evals/writing-compact-v1/publication-snapshots/${harnessSha}/snapshot.json`, bytes: 100, sha256: harnessSha },
    manifestSha256: harnessSha, amendmentSha256: harnessSha, judgeValidationSha256: harnessSha };
  const index = verification.categoryIndex = { method: versionedMethod, selectionId: 'all-writing', selectionIds: compactSelections,
    writingScoreBasis: WRITING_ESTABLISHED_SCORE_BASIS, benchmarkIds: compactSharedBenchmarks,
    activeBenchmarkIds: WRITING_ESTABLISHED_SCORE_BASIS.benchmarkIds, benchmarkWeights: Object.fromEntries(WRITING_ESTABLISHED_SCORE_BASIS.benchmarkIds.map(id => [id, 1 / 3])),
    groupIds: ['storytelling'], groupWeights: { storytelling: 1, 'dungeon-master': 0, worldbuilding: 0 },
    weighting: 'equal-fixed-benchmarks-for-ranked-settings', provisional: true, completeSettings: 1, rankedSettings: 1, partialSettings: 0, unscoredSettings: 0 };
  const template = fixture.writing[0];
  fixture.writing = compactSharedBenchmarks.flatMap(benchmarkId => focusedViewports.map(({ width, height }) => {
    const proof = structuredClone(template);
    Object.assign(proof, { benchmarkId, width, height, acceptanceEvidenceSha256: harnessSha });
    proof.categoryEvidence = { ...proof.categoryEvidence, ...index, selectionEvidence: compactSelections.map(selectionId => ({ selectionId, mismatches: [] })) };
    const names = ['writing-models.png', 'writing-comparison-rows.png', ...compactSelections.map(id => `writing-selection-${id}.png`),
      'writing-benchmarks.png', 'writing-efficiency.png', 'writing-efficiency-tokens.png', benchmarkId === 'dungeon-master-adventure-outline' ? 'dungeon-master-report.png' : 'writing-report.png'];
    proof.screenshots = names.map(path => ({ path, width, height, bytes: 100, sha256: harnessSha }));
    if (compactBenchmarkIds.includes(benchmarkId)) {
      proof.compactEvidenceHarnessSha256 = harnessSha;
      proof.compactCaseEvidence = Array.from({ length: WRITING_COMPACT_BENCHMARKS.find(item => item.id === benchmarkId).caseCount }, (_, number) => ({
        kind: 'vasirbenchmark-compact-writing-browser-evidence', benchmarkId, caseId: `${benchmarkId}-${number}`,
        sourceSha256: harnessSha, manifestSha256: harnessSha, amendmentSha256: harnessSha, judgeValidationSha256: harnessSha, mismatches: [] }));
      proof.caseEvidence = proof.compactCaseEvidence.map(({ caseId }) => ({ caseId }));
    }
    return proof;
  }));
  verification.writingBrowserProofs = fixture.writing.map(proof => {
    const benchmark = ['core', 'twists', 'dm', 'magic'][sharedBenchmarks.indexOf(proof.benchmarkId)] || proof.benchmarkId;
    return { benchmark, width: proof.width, path: `${root}/writing-${benchmark}-${proof.width}/writing-browsercheck.json`, coverage: proof.coverage,
      categoryEvidence: proof.categoryEvidence, ...(proof.compactCaseEvidence ? { compactCaseEvidence: proof.compactCaseEvidence, compactEvidenceHarnessSha256: harnessSha } : {}) };
  });
  manifest.captures = [
    ...manifest.captures.filter(image => image.path.includes('/canonical/')),
    ...fixture.writing.flatMap((proof, index) => proof.screenshots.map(image => ({ ...image, path: `${dirname(verification.writingBrowserProofs[index].path)}/${image.path}` }))),
    ...manifest.captures.filter(image => /\/games-\d+\//.test(image.path))
  ];
  verification.freshCaptureCount = manifest.captures.length;
  return fixture;
}

test('compact site-lock keeps four historical sources and requires the exact seven-report registry with a fixed broad basis', () => {
  const fixture = compactFrameFixture();
  assert.doesNotThrow(() => assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games));
  for (const mutate of [
    value => { value.manifest.acceptance.scope.benchmarkIds.pop(); },
    value => { value.manifest.acceptance.verification.sourceSelections.pop(); },
    value => { value.manifest.acceptance.verification.compactSourceSelection.benchmarkIds.pop(); },
    value => { value.manifest.acceptance.verification.compactSourceSelection.snapshot.sha256 = 'b'.repeat(64); },
    value => { value.manifest.acceptance.verification.categoryIndex.writingScoreBasis.id = 'other'; },
    value => { value.manifest.acceptance.verification.categoryIndex.benchmarkWeights['dungeon-master-adventure-outline'] = 0.5; },
    value => { value.manifest.acceptance.verification.categoryIndex.selectionIds.pop(); },
    value => { value.manifest.files.pop(); },
    value => { value.writing.pop(); },
    value => { value.writing.at(-1).compactCaseEvidence[0].judgeValidationSha256 = null; },
    value => { value.writing.at(-1).compactCaseEvidence[0].mismatches.push('changed original'); },
    value => { value.writing.at(-1).caseEvidence = []; },
    value => { value.writing.at(-1).screenshots.pop(); },
    value => { value.games[0].coverage.clipsAdvanced = 9; },
    value => { value.manifest.captures.pop(); }
  ]) {
    const changed = structuredClone(fixture); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

function publishedFrameFixture() {
  const fixture = leadersLedgerFrameFixture(), { manifest } = fixture;
  const verification = manifest.acceptance.verification;
  verification.publicRelease = structuredClone(publishedWritingRelease);
  manifest.acceptance.scope.benchmarkIds = [...storyBenchmarks];
  Object.assign(verification.categoryIndex, { method: versionedMethod, selectionIds: [...publishedWritingFields],
    writingScoreBasis: structuredClone(WRITING_ESTABLISHED_SCORE_BASIS), benchmarkIds: [...storyBenchmarks],
    activeBenchmarkIds: [...storyBenchmarks], benchmarkWeights: publishedWritingScope.weights('all-writing'),
    groupIds: ['storytelling'], groupWeights: { storytelling: 1 }, weighting: 'equal-fixed-benchmarks-for-ranked-settings' });
  fixture.writing = fixture.writing.filter(proof => storyBenchmarks.includes(proof.benchmarkId));
  verification.writingBrowserProofs = verification.writingBrowserProofs.filter(record => record.benchmark !== 'dm');
  for (const proof of fixture.writing) {
    const category = proof.categoryEvidence;
    const all = { ...structuredClone(category.selectionEvidence.find(item => item.selectionId === 'storytelling')), selectionId: 'all-writing' };
    Object.assign(category, structuredClone(verification.categoryIndex));
    category.selectionEvidence = [all, ...category.selectionEvidence.filter(item => publishedWritingFields.includes(item.selectionId) && item.selectionId !== 'all-writing')];
    category.selectorOptions = [...publishedWritingFields];
    category.presentationEvidence.dumbbellRows = structuredClone(all.rowEvidence);
    const sidebarScore = all.rowEvidence.find(row => row.skillRank === 1).skillPosition.toFixed(1);
    for (const selection of category.selectionEvidence) selection.sidebarScore = sidebarScore;
    for (const control of [...category.sharedSelectorEvidence, ...category.historyEvidence]) control.sidebarScore = sidebarScore;
    category.sharedSelectorEvidence.find(item => item.selectionId === 'storytelling-plot-twists').selectionId = storyBenchmarks[0];
    category.cleanLedgerEvidence.at(-1).selectionId = storyBenchmarks[0];
    for (const ledger of category.cleanLedgerEvidence) {
      ledger.groups = structuredClone(publishedWritingScope.groups);
      ledger.rows = ledger.rows.filter(row => storyBenchmarks.includes(row.benchmarkId));
    }
    proof.screenshots = proof.screenshots.filter(image => !image.path.startsWith('writing-selection-')
      || publishedWritingFields.some(id => image.path === `writing-selection-${id}.png`));
  }
  manifest.captures = [
    ...manifest.captures.filter(image => image.path.includes('/canonical/')),
    ...fixture.writing.flatMap((proof, index) => proof.screenshots.map(image => ({ ...image, path: `${dirname(verification.writingBrowserProofs[index].path)}/${image.path}` }))),
    ...manifest.captures.filter(image => /\/games-\d+\//.test(image.path))
  ];
  verification.freshCaptureCount = manifest.captures.length;
  return overallFrameFixture(fixture);
}

test('published Storytelling lock requires exactly three public tests, five selections and nine fresh proofs while retaining four-source lineage', () => {
  const fixture = publishedFrameFixture();
  assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games);
  assert.equal(fixture.writing.length, 9);
  assert.deepEqual(fixture.manifest.acceptance.verification.sourceSelections.map(item => item.benchmarkId), sharedBenchmarks);
  const category = fixture.writing[0].categoryEvidence;
  assert.deepEqual(category.selectionEvidence[0].rowEvidence, category.selectionEvidence[1].rowEvidence);
  assert.equal(category.selectionEvidence[0].rowEvidence.find(row => row.settingId === 'model').exactSkill, 70);
});

test('paired-edition lock requires the complete declared original or coverage-append source and actual review proofs', async t => {
  const completeDeclaredFixture = async t => {
    const parent = await completeSupplementalPairedFixture(t), root = dirname(parent.runDirectoryPath);
    const parentSnapshotPath = join(root, 'lock-accepted-parent.json'), runDirectoryPath = join(root, 'lock-declared-append');
    await writeFile(parentSnapshotPath, JSON.stringify(parent.snapshot, null, 2) + '\n', { flag: 'wx' });
    preparePairedRun({ runDirectoryPath, parentSnapshotPath, addedConfigurations: ['codex:gpt-6-astra@high'] });
    await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider() });
    return runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider() });
  };
  for (const factory of [completePairedFixture, completeSupplementalPairedFixture, completeDeclaredFixture]) await t.test(factory.name, async t => {
  const { snapshot } = await factory(t), sourceSha256 = sha256(JSON.stringify(snapshot));
  const built = projectPlotTwistsPairedRun({ snapshot, sourceSha256 });
  const evidence = deriveExpectedPairedTwistsEvidence(built.projection, built.responseBundle);
  const fixture = publishedFrameFixture(), verification = fixture.manifest.acceptance.verification;
  verification.categoryIndex.writingScoreBasis = structuredClone(PAIRED_WRITING_SCORE_BASIS);
  Object.assign(verification.sourceSelections.find(item => item.benchmarkId === 'storytelling-plot-twists'), {
    sources: [{ path: `.agents/vasir-evals/${PAIRED_TWISTS_EDITION}/publication-snapshots/${sourceSha256}/snapshot.json`, sha256: sourceSha256 }],
    lineage: { kind: evidence.coverageExtension ? 'declared-writing-coverage-extension' : 'declared-writing-source-replacement', edition: PAIRED_TWISTS_EDITION,
      ...(evidence.coverageExtension ? { coverageExtension: structuredClone(evidence.coverageExtension), parentSourceSha256: evidence.coverageExtension.parentSnapshotSha256 } : {}) }
  });
  for (const [index, proof] of fixture.writing.entries()) if (proof.benchmarkId === 'storytelling-plot-twists') {
    proof.trialCount = 1;
    proof.pairedTwistsEvidence = structuredClone(evidence);
    verification.writingBrowserProofs[index].pairedTwistsEvidence = structuredClone(evidence);
  }
  assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games);
  for (const mutate of [
    value => { value.manifest.acceptance.verification.categoryIndex.writingScoreBasis = structuredClone(WRITING_ESTABLISHED_SCORE_BASIS); },
    value => { delete value.writing.find(proof => proof.benchmarkId === 'storytelling-plot-twists').pairedTwistsEvidence; },
    value => { value.writing.find(proof => proof.benchmarkId === 'storytelling-plot-twists').trialCount = 10; },
    value => { value.writing.find(proof => proof.benchmarkId === 'storytelling-plot-twists').predecessorArchiveEvidence = {}; },
    value => { value.manifest.acceptance.verification.sourceSelections.find(item => item.benchmarkId === 'storytelling-plot-twists').sources[0].sha256 = 'f'.repeat(64); },
    value => { delete value.manifest.acceptance.verification.sourceSelections.find(item => item.benchmarkId === 'storytelling-plot-twists').lineage; }
  ]) {
    const changed = structuredClone(fixture); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
  for (const mutate of [
    value => { value.answers.pop(); },
    value => { value.answers[0].configurationId = 'codex:gpt-6-astra@high'; },
    value => { value.requests[0].renderedOriginal = false; },
    value => { value.requests[0].judgeConfigurationId = 'codex:gpt-6-astra@medium'; },
    value => { value.requests[1].candidateMap.A = value.requests[0].candidateMap.A; },
    value => { value.edition = 'storytelling-plot-twists-v1'; },
    value => { value.mismatches.push('changed original'); }
  ]) {
    const changed = structuredClone(fixture);
    for (const [index, proof] of changed.writing.entries()) if (proof.benchmarkId === 'storytelling-plot-twists') {
      mutate(proof.pairedTwistsEvidence);
      changed.manifest.acceptance.verification.writingBrowserProofs[index].pairedTwistsEvidence = structuredClone(proof.pairedTwistsEvidence);
    }
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
  if (evidence.coverageExtension) for (const mutate of [
    value => { value.coverageExtension.addedConfigurations.pop(); },
    value => { value.answers[0].provenance.sourceCohort = 'supplement'; },
    value => { value.requests.at(-1).provenance.sourceSnapshotSha256 = value.coverageExtension.parentSnapshotSha256; },
    value => { delete value.coverageExtension; }
  ]) {
    const changed = structuredClone(fixture);
    for (const [index, proof] of changed.writing.entries()) if (proof.benchmarkId === 'storytelling-plot-twists') {
      mutate(proof.pairedTwistsEvidence);
      changed.manifest.acceptance.verification.writingBrowserProofs[index].pairedTwistsEvidence = structuredClone(proof.pairedTwistsEvidence);
    }
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
  });
});

test('published Storytelling lock rejects omitted active tests, changed arithmetic, private experiments and incomplete proof inventories', () => {
  const valid = publishedFrameFixture();
  for (const mutate of [
    value => { delete value.manifest.acceptance.verification.publicRelease; },
    value => { value.manifest.acceptance.verification.publicRelease.id = 'unknown-release'; },
    value => { value.manifest.acceptance.verification.publicRelease.lifecycle = 'draft'; },
    value => { value.manifest.acceptance.scope.benchmarkIds.pop(); },
    value => { value.manifest.acceptance.verification.categoryIndex.benchmarkIds.push(compactBenchmarkIds[0]); },
    value => { value.manifest.acceptance.verification.categoryIndex.activeBenchmarkIds.pop(); },
    value => { value.manifest.acceptance.verification.categoryIndex.writingScoreBasis.coreIdeaScoring = 'official-panel'; },
    value => { value.manifest.acceptance.verification.categoryIndex.benchmarkWeights[storyBenchmarks[0]] = 0.5; },
    value => { value.manifest.acceptance.verification.categoryIndex.groupWeights['dungeon-master'] = 0; },
    value => { value.manifest.acceptance.verification.categoryIndex.selectionIds.push('worldbuilding'); },
    value => { value.manifest.acceptance.verification.sourceSelections = value.manifest.acceptance.verification.sourceSelections.filter(item => item.benchmarkId !== 'dungeon-master-adventure-outline'); },
    value => { value.manifest.acceptance.verification.compactSourceSelection = {}; },
    value => { value.manifest.acceptance.verification.compactEvidenceHarness = {}; },
    value => { value.writing.pop(); },
    value => { value.writing[0].benchmarkId = compactBenchmarkIds[0]; },
    value => { value.writing[0].categoryEvidence.selectorOptions.push('worldbuilding'); },
    value => { value.writing[0].categoryEvidence.selectionEvidence.pop(); },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rowEvidence[1].skillRank = 1; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].componentEvidence[0].weight = 0.5; },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows.pop(); },
    value => { value.writing[0].categoryEvidence.cleanLedgerEvidence[0].rows[0].topModel.exactSkill++; },
    value => { value.writing[0].compactCaseEvidence = []; },
    value => { value.writing[0].screenshots = value.writing[0].screenshots.filter(image => image.path !== 'writing-selection-storytelling-plot-twists.png'); },
    value => { value.writing[0].screenshots.push({ ...value.writing[0].screenshots[0], path: 'writing-selection-dungeon-master.png' }); },
    value => { value.games[0].coverage.gamesLoadedAndInputObserved = 9; },
    value => { value.manifest.captures.pop(); }
  ]) {
    const changed = structuredClone(valid); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

test('public source modules cannot import omitted experiments, stale catalogs or a different score basis', () => {
  const publications = storyBenchmarks.map(id => ({ benchmarks: [{ id }] }));
  const archive = id => ({ responses: [{ benchmarkId: id, outputText: 'Original retained answer' }] });
  const collection = { ...publications[0], publicRelease: structuredClone(publishedWritingRelease),
    writingScoreBasis: structuredClone(WRITING_ESTABLISHED_SCORE_BASIS),
    catalog: storyBenchmarks.map(id => ({ id, lifecycle: 'published', archived: false, scoreBasisIncluded: true, trackId: 'storytelling', detailHref: `benchmark-report.html#${id}` })),
    benchmarkPublications: publications.slice(1).map(projection => ({ benchmarkId: projection.benchmarks[0].id, projection })) };
  const responses = { ...archive(storyBenchmarks[0]), benchmarkResponses: storyBenchmarks.slice(1).map(benchmarkId => ({ benchmarkId, responseBundle: archive(benchmarkId) })) };
  const summary = { publicRelease: structuredClone(publishedWritingRelease), writingScoreBasis: structuredClone(WRITING_ESTABLISHED_SCORE_BASIS),
    catalog: structuredClone(collection.catalog), benchmarkIds: [...storyBenchmarks], benchmarks: storyBenchmarks.map(id => ({ id })) };
  assertPublishedWritingCollection(collection, responses, summary);
  for (const mutate of [
    value => { value.collection.catalog.pop(); },
    value => { value.collection.catalog[1].archived = true; },
    value => { value.collection.catalog[1].lifecycle = 'withdrawn'; },
    value => { value.collection.writingScoreBasis.benchmarkIds.pop(); },
    value => { value.collection.benchmarkPublications.pop(); },
    value => { value.collection.benchmarkPublications[0].projection.compactBenchmarks = {}; },
    value => { value.collection.additionalBenchmarks = { 'dungeon-master-adventure-outline': {} }; },
    value => { value.responses.compactBenchmarks = { [compactBenchmarkIds[0]]: {} }; },
    value => { value.responses.benchmarkResponses[0].responseBundle.responses[0].benchmarkId = compactBenchmarkIds[0]; },
    value => { value.responses.benchmarkResponses.pop(); },
    value => { value.summary.benchmarkIds.push('dungeon-master-adventure-outline'); },
    value => { value.summary.catalog[0].archived = true; }
  ]) {
    const changed = structuredClone({ collection, responses, summary }); mutate(changed);
    assert.throws(() => assertPublishedWritingCollection(changed.collection, changed.responses, changed.summary));
  }
});
