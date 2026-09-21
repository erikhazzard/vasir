import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
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

async function assertLockedFile(record, root = siteRoot) {
  assert.equal(typeof record.path, 'string');
  assert.ok(record.path && !record.path.includes('\\') && record.path.split('/').every(part => part && part !== '.' && part !== '..'), 'locked evidence must use a contained relative path');
  assert.match(record.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isInteger(record.bytes) && record.bytes >= 0);
  const contents = await readFile(join(root, record.path));
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

test('canonical VasirBench site matches its accepted template lock', async t => {
  const manifest = JSON.parse(await readFile(join(siteRoot, 'template-lock.json'), 'utf8'));
  const deployment = JSON.parse(await readFile(join(siteRoot, 'deployment.json'), 'utf8'));
  const focused = manifest.acceptance.scope?.kind === 'focused-writing-benchmark';
  const shared = manifest.acceptance.scope?.kind === 'shared-writing-category-frame';
  const versioned = shared && manifest.acceptance.verification?.categoryIndex?.method === versionedMethod;
  assert.ok(!manifest.acceptance.scope || focused || shared, 'unrecognized acceptance scope');
  const expectedFiles = [...new Set([
    ...deployment.publicFiles.map(({ path }) => path).filter((path) => !generatedPublicFiles.has(path)),
    ...acceptanceOnlyFiles,
    // The shared browser harness still imports this byte-pinned audit helper;
    // its presence never authorizes compact source data or public reports.
    ...(versioned ? [compactHarness] : []),
    ...(focused || shared ? ['deployment.json', 'infra/production.yml'] : [])
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
  if (focused || shared) {
    const unavailable = await (shared ? assertSharedFrameEvidence(manifest, deployment) : assertFocusedEvidence(manifest, deployment));
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
