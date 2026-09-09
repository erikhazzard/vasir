import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { isDeepStrictEqual } from 'node:util';
import { buildSelectedWritingPublication } from '../../../../cli/eval/writing-publication.js';
import { verifyWritingCompactSourceSelection } from '../../../../cli/eval/writing-compact-publication.js';
import { buildStorytellingCreationPublication } from '../../../../cli/eval/storytelling-creation-publication.js';
import { PAIRED_TWISTS_EDITION, WRITING_LEDGER_PRESENTATION, WRITING_LEADERS_PRESENTATION, WRITING_OVERALL_PRESENTATION, deriveExpectedWritingCategory, deriveExpectedProvisionalEvidence, deriveExpectedOverallV3, verifyOverallV3Projection, verifyCandidateCategoryProjection, verifyWritingProofEvidence } from './acceptance-evidence.mjs';
import { buildBenchmarkPublicationArtifact } from '../../../../cli/benchmark-publication-artifact.js';
import { verifyWritingSourceSelections } from './source-lineage.mjs';
import { WRITING_RESPONSE_ARCHIVES, WRITING_CREATION_ARCHIVE, hydrateWritingResponseArchives } from '../../../../cli/eval/writing-response-archives.js';

// Renew the presentation receipt only after review of this exact candidate.
// Deployment still uses the normal guarded publisher. This script is not a
// substitute for inspecting the captured UI or user authorization to publish.
if (!process.argv[2] || process.argv[3] !== '--visual-review-complete') throw new Error('Pass a rehearsal directory and --visual-review-complete after inspecting captures.');
const repo = process.cwd();
const directory = path.resolve(process.argv[2]);
const site = path.join(repo, 'site/vasirbenchmark.com');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pin = file => { const bytes = fs.readFileSync(file); return { bytes: bytes.length, sha256: hash(bytes) }; };
const record = file => ({ path: path.relative(repo, file), ...pin(file) });
const requireEvidence = (condition, message) => { if (!condition) throw new Error(message); };
const empty = value => Array.isArray(value) && value.length === 0;
const heightFor = width => width === 390 ? 844 : 1000;
const contained = (root, relative) => {
  requireEvidence(typeof relative === 'string' && relative && !path.isAbsolute(relative) && !relative.includes('\\') && relative.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe evidence path.');
  return path.join(root, relative);
};
const verifyPng = (root, screenshot, width, height, filename = screenshot.path) => {
  const file = contained(root, filename);
  const bytes = fs.readFileSync(file);
  requireEvidence(bytes.length >= 24 && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && bytes.readUInt32BE(16) === width && bytes.readUInt32BE(20) === height && bytes.length === screenshot.bytes && hash(bytes) === screenshot.sha256, `Screenshot bytes or dimensions changed: ${filename}`);
  return { path: file, bytes: bytes.length, sha256: screenshot.sha256 };
};
const candidate = read(path.join(directory, 'candidate.json'));
const canonicalPath = path.join(directory, 'canonical/canonical-receipt.json');
const canonical = read(canonicalPath);
requireEvidence(canonical.kind === 'vasirbenchmark-canonical-candidate-review' && canonical.status === 'passed' && Array.isArray(canonical.results) && canonical.results.length === 32 && canonical.releaseId === candidate.releaseId, 'Canonical candidate checks incomplete.');
const captureSha = pin(path.join(site, 'capture.mjs')).sha256;
const acceptanceEvidencePath = path.join(repo, 'docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs');
const acceptanceEvidenceSha = pin(acceptanceEvidencePath).sha256;
const sourceLineagePath = path.join(repo, 'docs/work/vasir-benchmarking/writing-category/source-lineage.mjs');
requireEvidence(canonical.source?.path === 'site/vasirbenchmark.com/capture.mjs' && canonical.source.initialSha256 === captureSha && canonical.source.sha256 === captureSha, 'Canonical capture harness changed during or after review.');
const current = buildBenchmarkPublicationArtifact({ repoRootDirectory: repo, validateAcceptance: false });
if (current.releaseId !== candidate.releaseId) throw new Error('Source changed after candidate capture.');
requireEvidence(Array.isArray(candidate.siteFiles) && candidate.siteFiles.length === current.files.length && new Set(candidate.siteFiles.map(file => file.path)).size === current.files.length && candidate.siteFiles.every(file => current.files.some(actual => actual.path === file.path && actual.bytes === file.bytes && actual.sha256 === file.sha256)), 'Candidate file inventory differs from the current release.');
const candidateFiles = new Map(candidate.siteFiles.map(file => [file.path, file]));
const pinnedCandidateModule = publicPath => {
  const file = candidateFiles.get(publicPath);
  requireEvidence(file && typeof file.sourcePath === 'string', `Missing candidate source: ${publicPath}`);
  const bytes = fs.readFileSync(file.sourcePath);
  requireEvidence(bytes.length === file.bytes && hash(bytes) === file.sha256, `Candidate module changed: ${publicPath}`);
  return bytes.toString('utf8');
};
const writingContext = { window: {} };
vm.runInNewContext(pinnedCandidateModule('writing-data.js'), writingContext, { timeout: 10000 });
const writingSource = JSON.parse(JSON.stringify(writingContext.window.VASIR_WRITING));
const writingExpected = deriveExpectedWritingCategory(writingSource, 'all-writing');
const mainContext = { window: {} };
vm.runInNewContext(pinnedCandidateModule('data.js'), mainContext, { timeout: 10000 });
const { overall: sourceOverall, aiWorkflows: sourceAI, games: _sourceGames, writing: _sourceWritingSummary, ...sourceEngineering } = JSON.parse(JSON.stringify(mainContext.window.VASIR_DATA));
const overallV3 = sourceOverall?.scoreBasis?.edition === 'overall-v3';
if (overallV3) {
  writingExpected.overallV3 = deriveExpectedOverallV3({ engineering: sourceEngineering, aiWorkflows: sourceAI, writing: writingSource, identityAliasPolicy: _sourceWritingSummary?.overallSource?.scoreBasis?.identityAliasPolicy ?? null });
  verifyOverallV3Projection(sourceOverall, writingExpected.overallV3);
  const validation = canonical.overallSourceValidation, source = candidateFiles.get('writing-data.js');
  requireEvidence(validation?.kind === 'independent-overall-v3-original-source-oracle' && validation.edition === 'overall-v3' && validation.overallSha256 === hash(JSON.stringify(sourceOverall)) && validation.overallSha256 === canonical.preservation.overall, 'Canonical Overall v3 lacks original-source validation.');
  requireEvidence(validation.oracle?.path === path.relative(repo, acceptanceEvidencePath) && validation.oracle.initialSha256 === acceptanceEvidenceSha && validation.oracle.sha256 === acceptanceEvidenceSha, 'Canonical Overall oracle changed during or after review.');
  const controllerPath = 'docs/work/vasir-benchmarking/storytelling-plot-twists/capture-candidate.mjs', controllerSha = pin(path.join(repo, controllerPath)).sha256;
  requireEvidence(validation.controller?.path === controllerPath && validation.controller.initialSha256 === controllerSha && validation.controller.sha256 === controllerSha, 'Canonical Overall controller changed during or after review.');
  requireEvidence(validation.writingSource?.path === 'writing-data.js' && validation.writingSource.bytes === source.bytes && validation.writingSource.sha256 === source.sha256, 'Canonical Overall Writing source pin differs from the candidate.');
} else requireEvidence(sourceOverall?.scoreBasis?.edition === 'overall-v2', 'Unknown Overall source edition.');
const responsesContext = { window: {} };
vm.runInNewContext(pinnedCandidateModule('writing-responses.js'), responsesContext, { timeout: 10000 });
for (const archive of WRITING_RESPONSE_ARCHIVES) vm.runInNewContext(pinnedCandidateModule(archive.path), responsesContext, { timeout: 10000 });
const loadedWritingResponses = hydrateWritingResponseArchives(JSON.parse(JSON.stringify(responsesContext.window.VASIR_WRITING_RESPONSES)), JSON.parse(JSON.stringify(responsesContext.window.VASIR_WRITING_CREATION_RESPONSES)), Object.fromEntries(WRITING_RESPONSE_ARCHIVES.filter(archive => archive !== WRITING_CREATION_ARCHIVE && responsesContext.window[archive.globalName]).map(archive => [archive.benchmarkId, JSON.parse(JSON.stringify(responsesContext.window[archive.globalName]))])));
writingExpected.provisionalEvidence = deriveExpectedProvisionalEvidence(writingExpected, loadedWritingResponses);
if (writingExpected.publications.has('storytelling-magic-discovery')) {
  vm.runInNewContext(pinnedCandidateModule('writing-creation-responses.js'), responsesContext, { timeout: 10000 });
  writingExpected.creationArchive = JSON.parse(JSON.stringify(responsesContext.window.VASIR_WRITING_CREATION_RESPONSES));
  const frozenCreation = buildStorytellingCreationPublication({ repoRootDirectory: repo });
  requireEvidence(isDeepStrictEqual(writingExpected.publications.get('storytelling-magic-discovery'), JSON.parse(JSON.stringify(frozenCreation.projection))), 'Magic candidate projection differs from its immutable selected original sources.');
  requireEvidence(isDeepStrictEqual(writingExpected.creationArchive, JSON.parse(JSON.stringify(frozenCreation.responseBundle))), 'Magic candidate archive differs from original selected answers or judgments.');
}
const appSource = pinnedCandidateModule('app.js');
const appBoundary = appSource.indexOf('(async function () {');
requireEvidence(appBoundary > 0, 'The candidate category projection is not isolated before the application.');
const categoryContext = vm.createContext({});
vm.runInContext(appSource.slice(0, appBoundary), categoryContext, { timeout: 10000 });
requireEvidence(typeof categoryContext.buildWritingCategoryCollection === 'function', 'Candidate category builder is missing.');
for (const selectionId of writingExpected.selectionIds) verifyCandidateCategoryProjection(categoryContext.buildWritingCategoryCollection(writingSource, selectionId), deriveExpectedWritingCategory(writingSource, selectionId));
// Admit only the immutable original or the explicitly declared completion
// edition, with original answers/reviews preserved by the lineage validator.
const previousSourceSelections = read(path.join(site, 'template-lock.json')).acceptance?.verification?.sourceSelections;
const sourceSelections = verifyWritingSourceSelections({ repo, previousSelections: previousSourceSelections });
const compactSourceSelection = verifyWritingCompactSourceSelection({ repoRootDirectory: repo, collection: writingSource, responseBundle: loadedWritingResponses });
writingExpected.compactArchives = new Map(Object.entries(loadedWritingResponses.compactBenchmarks ?? {}));
const compactEvidenceHarnessName = 'writing-compact-browser-evidence.mjs';
const compactEvidenceHarnessPath = path.join(site, compactEvidenceHarnessName);
const compactEvidenceHarnessPin = compactSourceSelection ? pin(compactEvidenceHarnessPath) : null;
const twistsSelection = read(path.join(repo, 'benchmarks/storytelling-plot-twists/publication.json'));
const pairedTwists = twistsSelection.edition === PAIRED_TWISTS_EDITION;
const twistsRunSha = pairedTwists ? twistsSelection.snapshot.sha256 : twistsSelection.run.sha256;
const twistsSkillSha = 'bd95674e5a5dfd99b4b47571bf08742f7c736bd1465d21ba8357bc42638f07e4';
if (!pairedTwists) requireEvidence(twistsSelection.skill?.sha256 === twistsSkillSha, 'The frozen Plot twists skill changed.');
const selectedTwists = buildSelectedWritingPublication({ repoRootDirectory: repo, benchmarkId: 'storytelling-plot-twists' });
const frozenTwists = JSON.parse(JSON.stringify(selectedTwists.projection));
requireEvidence(isDeepStrictEqual(writingExpected.publications.get('storytelling-plot-twists'), frozenTwists), 'Candidate Plot twists scores or original experiment metadata changed.');
const loadedTwistsArchive = loadedWritingResponses.benchmarkResponses.find(item => item.benchmarkId === 'storytelling-plot-twists')?.responseBundle;
requireEvidence(isDeepStrictEqual(JSON.parse(JSON.stringify(loadedTwistsArchive)), JSON.parse(JSON.stringify(selectedTwists.responseBundle))), 'Plot twists archive differs from its pinned source.');
if (pairedTwists) writingExpected.pairedTwistsArchive = JSON.parse(JSON.stringify(selectedTwists.responseBundle));
if (frozenTwists.methodology.completion) {
  writingExpected.twistsPredecessors = JSON.parse(JSON.stringify(selectedTwists.responseBundle.supersededResponses));
}
const verifyLoaded = (loaded, publicPath) => {
  const expected = candidateFiles.get(publicPath);
  requireEvidence(expected && expected.sha256 === loaded.sha256 && expected.bytes === loaded.bytes, `Loaded bytes do not belong to candidate: ${publicPath}`);
};
const canonicalViews = [
  ['leaderboard', ''], ['capabilities', '-capabilities'], ['capability-benchmarks', '-capability-benchmarks'],
  ['efficiency', '-efficiency'], ['report', '-benchmark-report'], ['workflows', '-workflows'],
  ['workflow-benchmarks', '-workflow-benchmarks'], ['workflow-efficiency', '-workflow-efficiency'],
  ['workflow-report', '-workflow-report'], ['games', '-game-models'],
  ['game-benchmarks', '-game-benchmarks'], ['game-efficiency', '-game-efficiency']
];
const canonicalTasks = ['desktop', 'mobile'].flatMap(viewport => canonicalViews.map(([target, suffix]) => ({ target, viewport, width: viewport === 'desktop' ? 1440 : 390, height: viewport === 'desktop' ? 1000 : 844, filename: `${viewport}${suffix}.png` })));
for (const target of ['leaderboard', 'capabilities', 'report', 'workflows', 'workflow-report', 'games', 'game-benchmarks', 'game-efficiency']) canonicalTasks.push({ target, viewport: 'tablet', width: 820, height: 1000, filename: `tablet-${target}.png` });
const captures = new Map();
// A QA-only repair can require fresh acceptance of identical public bytes.
// Bind its separate evidence namespace to the exact harness, preserving the
// earlier release review instead of overwriting or treating it as current.
const captureRoot = `reviews/writing-category/${candidate.releaseId}/qa-${captureSha}`;
const reviewFiles = new Map([
  [`${captureRoot}/candidate.json`, path.join(directory, 'candidate.json')],
  [`${captureRoot}/acceptance-evidence.mjs`, acceptanceEvidencePath],
  [`${captureRoot}/source-lineage.mjs`, sourceLineagePath],
  [`${captureRoot}/canonical/canonical-receipt.json`, canonicalPath]
]);
if (overallV3) reviewFiles.set(`${captureRoot}/capture-candidate.mjs`, path.join(repo, canonical.overallSourceValidation.controller.path));
if (compactSourceSelection) reviewFiles.set(`${captureRoot}/${compactEvidenceHarnessName}`, compactEvidenceHarnessPath);
const reviewedRecord = (name, file) => ({ path: `${captureRoot}/${name}`, ...pin(file) });
requireEvidence(new Set(canonical.results.map(result => result.filename)).size === 32, 'Canonical captures contain duplicate tasks.');
for (const task of canonicalTasks) {
  const result = canonical.results.find(result => result.filename === task.filename);
  requireEvidence(result && result.code === 0 && ['target', 'viewport', 'width', 'height'].every(key => result[key] === task[key]), `Missing or failed canonical task: ${task.filename}`);
  const screenshot = verifyPng(path.join(directory, 'canonical'), result, task.width, task.height, task.filename);
  captures.set(`${captureRoot}/canonical/${task.filename}`, screenshot);
}
const harnessSha = pin(path.join(site, 'writing-browsercheck.mjs')).sha256;
const proofs = [];
const writingBenchmarks = [ ['core', 'storytelling-core-idea'], ['twists', 'storytelling-plot-twists'], ...(writingExpected.publications.has('dungeon-master-adventure-outline') ? [['dm', 'dungeon-master-adventure-outline']] : []), ...(writingExpected.publications.has('storytelling-magic-discovery') ? [['magic', 'storytelling-magic-discovery']] : []),
  ...Object.keys(writingSource.compactBenchmarks ?? {}).map(id => [id, id]) ];
for (const [benchmark, benchmarkId] of writingBenchmarks) for (const width of [1440, 820, 390]) {
  const file = path.join(directory, `writing-${benchmark}-${width}/writing-browsercheck.json`);
  const proof = read(file);
  requireEvidence((proof.categoryEvidence?.presentationVariant === WRITING_OVERALL_PRESENTATION) === overallV3, 'Writing presentation and Overall source edition disagree.');
  requireEvidence(proof.acceptanceEvidenceSha256 === acceptanceEvidenceSha, 'Independent Writing acceptance derivation changed during or after browser review.');
  if (writingExpected.compactArchives.has(benchmarkId)) requireEvidence(proof.compactEvidenceHarnessSha256 === compactEvidenceHarnessPin?.sha256, 'Compact Writing evidence helper changed during or after browser review.');
  requireEvidence(proof.kind === 'vasirbenchmark-writing-browsercheck' && proof.status === 'passed' && empty(proof.errors) && proof.harnessSha256 === harnessSha && proof.benchmarkId === benchmarkId && (benchmark === 'dm' ? proof.trialCount === undefined || proof.trialCount === 1 : proof.trialCount === writingExpected.publications.get(benchmarkId).trialCount) && proof.width === width && proof.height === heightFor(width) && Array.isArray(proof.checks) && proof.checks.length > 0, 'Writing proof failed or has another benchmark, viewport, or harness.');
  if (proof.overallSha256 !== canonical.preservation.overall) throw new Error('Writing altered Overall.');
  requireEvidence(Array.isArray(proof.loadedFiles) && proof.loadedFiles.length > 0, 'Writing loaded-file evidence is missing.');
  const loadedPaths = new Set();
  for (const loaded of proof.loadedFiles) {
    const url = new URL(loaded.url);
    const prefix = `/releases/${candidate.releaseId}/`;
    requireEvidence(url.pathname.startsWith(prefix) && url.origin === new URL(proof.url).origin, 'Writing loaded another release or origin.');
    const publicPath = url.pathname.slice(prefix.length);
    verifyLoaded(loaded, publicPath);
    loadedPaths.add(publicPath);
  }
  const requiredArchivePath = WRITING_RESPONSE_ARCHIVES.find(archive => archive.benchmarkId === benchmarkId)?.path || 'writing-responses.js';
  requireEvidence(['app.js', 'writing-data.js', 'benchmark-report.js', requiredArchivePath].every(file => loadedPaths.has(file)), 'Writing proof omitted a required loaded module.');
  if (benchmark === 'magic') requireEvidence(!loadedPaths.has('writing-responses.js'), 'Magic report unexpectedly downloaded the separate original Writing archive.');
  verifyWritingProofEvidence(proof, writingExpected);
  requireEvidence(hash(proof.categoryEvidence.overall) === canonical.preservation.overall, 'Writing category altered Overall.');
  requireEvidence(Array.isArray(proof.screenshots) && proof.screenshots.length > 0 && (Array.isArray(proof.failureScreenshots) || benchmark === 'dm' && proof.failureScreenshots === undefined), 'Writing screenshot inventory is missing.');
  const screenshotNames = new Set();
  for (const screenshot of [...proof.screenshots, ...(proof.failureScreenshots || [])]) {
    requireEvidence(!screenshotNames.has(screenshot.path) && screenshot.width === width && screenshot.height === heightFor(width), 'Duplicate or wrong-viewport Writing screenshot.');
    screenshotNames.add(screenshot.path);
    const verified = verifyPng(path.dirname(file), screenshot, width, heightFor(width));
    if (proof.screenshots.includes(screenshot)) captures.set(`${captureRoot}/writing-${benchmark}-${width}/${screenshot.path}`, verified);
  }
  requireEvidence(['writing-models.png', 'writing-comparison-rows.png', ...writingExpected.selectionIds.map(id => `writing-selection-${id}.png`), 'writing-benchmarks.png', 'writing-efficiency.png', 'writing-efficiency-tokens.png', ...(benchmark === 'dm' ? ['dungeon-master-models.png', 'dungeon-master-benchmarks.png', 'dungeon-master-efficiency.png', 'dungeon-master-report.png', 'dungeon-master-method.png'] : ['writing-report.png'])].every(name => screenshotNames.has(name)), 'Writing proof omitted required dumbbell, score-selection, benchmark, efficiency, or report captures.');
  const cleanLedger = [WRITING_LEDGER_PRESENTATION, WRITING_LEADERS_PRESENTATION, WRITING_OVERALL_PRESENTATION].includes(proof.categoryEvidence.presentationVariant);
  requireEvidence(!proofs.length || proof.categoryEvidence.presentationVariant === proofs[0].proof.categoryEvidence.presentationVariant, 'Writing proofs mix presentation variants.');
  if (cleanLedger) {
    requireEvidence(screenshotNames.has('writing-index-method.png'), 'Clean Writing proof omitted the opened Methodology qualification capture.');
    requireEvidence(screenshotNames.has('writing-report-default.png'), 'Clean Writing proof omitted the initial closed report capture.');
    requireEvidence(![...screenshotNames].some(name => /^writing-provisional(?:-|\.)/.test(name)), 'Removed inline provisional captures cannot be claimed as current.');
  } else for (const [index, provisional] of writingExpected.provisionalEvidence.entries()) requireEvidence(screenshotNames.has(index ? `writing-provisional-${provisional.benchmarkId}.png` : 'writing-provisional.png'), 'Writing proof omitted the candidate provisional benchmark capture.');
  requireEvidence(!screenshotNames.has('writing-partial.png'), 'Rejected partial placeholder capture remains in this candidate.');
  proofs.push({ benchmark, width, file, proof, ...record(file) });
  reviewFiles.set(`${captureRoot}/writing-${benchmark}-${width}/writing-browsercheck.json`, file);
}
const presentationVariant = proofs[0].proof.categoryEvidence.presentationVariant;
const cleanPresentation = [WRITING_LEDGER_PRESENTATION, WRITING_LEADERS_PRESENTATION, WRITING_OVERALL_PRESENTATION].includes(presentationVariant);
const leadersPresentation = [WRITING_LEADERS_PRESENTATION, WRITING_OVERALL_PRESENTATION].includes(presentationVariant);
const overallPresentation = presentationVariant === WRITING_OVERALL_PRESENTATION;
const gamesProofs = [];
const gamesHarnessSha = pin(path.join(site, 'games-browsercheck.mjs')).sha256;
const localManifestPath = path.join(directory, 'local-artifacts.json');
const localManifest = read(localManifestPath);
requireEvidence(localManifest.releaseId === candidate.releaseId && localManifest.projectionSha256 === candidate.projectionSha256 && JSON.stringify(localManifest.siteFiles) === JSON.stringify(candidate.siteFiles) && JSON.stringify(localManifest.artifactFiles) === JSON.stringify(candidate.artifactFiles), 'Games manifest differs from the reviewed candidate.');
for (const width of [1440, 390]) {
  const file = path.join(directory, `games-${width}/games-browsercheck-${width}.json`);
  const proof = read(file);
  requireEvidence(proof.kind === 'vasirbenchmark-games-browser-proof' && !proof.error && proof.width === width && proof.height === heightFor(width) && proof.harnessSha256 === gamesHarnessSha && Array.isArray(proof.checks) && proof.checks.length > 0 && [proof.coverageFailures, proof.runtimeErrors, proof.mediaFailures, proof.delivery?.failures].every(empty), 'Games proof failed or used another viewport or harness.');
  requireEvidence(proof.delivery.mode === 'local-pinned-bytes' && proof.delivery.siteScope?.releaseId === candidate.releaseId && proof.delivery.manifest?.sha256 === pin(localManifestPath).sha256 && proof.delivery.manifest.bytes === pin(localManifestPath).bytes && proof.projectionSha256 === candidate.projectionSha256 && proof.delivery.projectionSha256 === candidate.projectionSha256 && proof.delivery.apexCspSha256 === candidate.cspSha256, 'Games proof does not establish the candidate bytes and policy.');
  const coverage = proof.coverage;
  requireEvidence(coverage?.rows === 10 && coverage.clipsAdvanced === 10 && coverage.gamesLoadedAndInputObserved === 10 && ['clipsFailed', 'gamesWithObservedFailure', 'gamesUnverified', 'unavailableRows'].every(key => coverage[key] === 0), 'Games proof lacks ten successful clip and game observations.');
  requireEvidence(Array.isArray(proof.artifacts) && proof.artifacts.length === 10 && new Set(proof.artifacts.map(artifact => artifact.id)).size === 10 && proof.artifacts.every(artifact => artifact.video?.status === 'advancing' && artifact.game?.status === 'loaded-and-input-observed'), 'Games per-artifact evidence differs from coverage.');
  const presentationPaths = ['games.html', 'games.css', 'games.js', 'style.css', 'assets/kanit-latin-900-normal.woff2'];
  requireEvidence(Array.isArray(proof.presentationFiles) && proof.presentationFiles.length === presentationPaths.length && new Set(proof.presentationFiles.map(file => file.path)).size === presentationPaths.length && presentationPaths.every(file => proof.presentationFiles.some(item => item.path === file)), 'Games presentation evidence is incomplete.');
  for (const loaded of proof.presentationFiles) {
    const url = new URL(loaded.url);
    requireEvidence(url.origin === 'https://vasirbenchmark.com' && url.pathname === (loaded.path === 'games.html' ? '/games.html' : `/releases/${candidate.releaseId}/${loaded.path}`), 'Games loaded a different presentation route.');
    verifyLoaded(loaded, loaded.path);
  }
  requireEvidence(Array.isArray(proof.delivery.siteScope.verifiedSiteFiles) && [...presentationPaths, 'data.js'].every(file => proof.delivery.siteScope.verifiedSiteFiles.includes(file)), 'Games manifest verification omitted a required presentation input.');
  requireEvidence(Array.isArray(proof.screenshots) && proof.screenshots.length > 0 && new Set(proof.screenshots.map(screenshot => screenshot.path)).size === proof.screenshots.length, 'Games screenshot inventory is missing or duplicated.');
  const prefix = width === 1440 ? 'desktop' : 'mobile';
  const requiredCaptures = ['', '-ratings', '-playback', '-play', '-fullscreen'].map(suffix => `${prefix}-games${suffix}.png`);
  for (const screenshot of proof.screenshots) {
    requireEvidence(screenshot.width === width && screenshot.height === heightFor(width), 'Games screenshot has another viewport.');
    const verified = verifyPng(path.dirname(file), screenshot, width, heightFor(width));
    captures.set(`${captureRoot}/games-${width}/${screenshot.path}`, verified);
  }
  requireEvidence(requiredCaptures.every(name => proof.screenshots.some(screenshot => screenshot.path === name)), 'Games proof omitted a required report capture.');
  gamesProofs.push({ width, proof, ...record(file) });
  reviewFiles.set(`${captureRoot}/games-${width}/games-browsercheck-${width}.json`, file);
}
const lockPath = path.join(site, 'template-lock.json');
const previousBytes = fs.readFileSync(lockPath);
const previousPath = path.join(directory, 'previous-template-lock.json');
const lock = JSON.parse(previousBytes);
const historicalCaptures = lock.captures;
// Retain and validate all four original source histories, including the
// withdrawn DM study. Only the explicitly released subset needs public views.
const releasedSourceIds = writingSource.publicRelease?.id === 'writing-storytelling-public-v1'
  ? sourceSelections.filter(item => writingSource.catalog.some(benchmark => benchmark.id === item.benchmarkId)).map(item => item.benchmarkId)
  : sourceSelections.map(item => item.benchmarkId);
requireEvidence(Array.isArray(sourceSelections) && isDeepStrictEqual([...releasedSourceIds, ...(compactSourceSelection?.benchmarkIds ?? [])].sort(), [...writingExpected.benchmarkIds].sort()), 'Previous accepted original Writing source selections or registered compact selections are missing or changed.');
requireEvidence(isDeepStrictEqual(verifyWritingSourceSelections({ repo, previousSelections: previousSourceSelections }), sourceSelections), 'Writing source selection changed during acceptance.');
requireEvidence(isDeepStrictEqual(verifyWritingCompactSourceSelection({ repoRootDirectory: repo, collection: writingSource, responseBundle: loadedWritingResponses }), compactSourceSelection), 'Compact Writing source selection changed during acceptance.');
const establishedAcceptedFiles = ['app.js', 'assets/d3.v7.min.js', 'assets/kanit-latin-900-normal.woff2', 'benchmark-report.css', 'benchmark-report.html', 'benchmark-report.js', 'capture.mjs', 'capture.sh', 'deployment.json', 'games-browsercheck.mjs', 'games.css', 'games.html', 'games.js', 'index.html', 'infra/production.yml', 'style.css', 'writing-browsercheck.mjs'];
const previousAcceptedFiles = Array.isArray(lock.files) ? lock.files.map(file => file.path) : [];
requireEvidence((isDeepStrictEqual([...previousAcceptedFiles].sort(), [...establishedAcceptedFiles].sort()) || isDeepStrictEqual([...previousAcceptedFiles].sort(), [...establishedAcceptedFiles, compactEvidenceHarnessName].sort())) && Array.isArray(historicalCaptures) && historicalCaptures.length > 0 && new Set(historicalCaptures.map(capture => capture.path)).size === historicalCaptures.length, 'Current accepted presentation or historical capture inventory is invalid.');
if (compactEvidenceHarnessPin) requireEvidence(isDeepStrictEqual(pin(compactEvidenceHarnessPath), compactEvidenceHarnessPin), 'Compact Writing evidence helper changed during acceptance.');
// Preserve the current owner's historical review bytes. Fresh captures are
// written only under a new, release-keyed path; no old screenshot is replaced.
for (const capture of historicalCaptures) {
  const file = contained(site, capture.path);
  requireEvidence(pin(file).bytes === capture.bytes && pin(file).sha256 === capture.sha256, `Historical capture changed: ${capture.path}`);
}
for (const [name, capture] of captures) {
  requireEvidence(pin(capture.path).bytes === capture.bytes && pin(capture.path).sha256 === capture.sha256, `Reviewed capture changed: ${name}`);
  contained(site, name);
}
requireEvidence(captures.size === 32 + proofs.reduce((sum, item) => sum + item.proof.screenshots.length, 0) + gamesProofs.reduce((sum, item) => sum + item.proof.screenshots.length, 0), 'Fresh canonical/Writing/Games capture inventory is incomplete.');
lock.version = `2026-09-08-writing-category-hierarchy-${candidate.releaseId.slice(0, 12)}`;
lock.acceptance = {
  scope: { kind: 'shared-writing-category-frame', schemaVersion: 1, benchmarkIds: writingBenchmarks.map(([, id]) => id), viewports: [1440, 820, 390].map(width => ({ width, height: heightFor(width) })) },
  authority: 'user', acceptedAt: new Date().toISOString(),
  verdict: 'Authorized Writing score completion and consistent category frame; candidate visually reviewed and browser-verified by the agent',
  response: cleanPresentation ? 'Keep the scored model and efficiency views, with score details closed by default. Make Benchmark tests a compact grouped field-mean ledger without model controls, formulas, essays or inline provisional accordions. Standardize reports around Model comparison, followed by closed Judge & trial details and original answers. Preserve all scores, ranks, source qualifications and original evidence.' : 'Show all available model scores in the shared Engineering dumbbell frame. Rank only models with complete paired scores on every selected benchmark. Keep incomplete available-score means visible with an asterisk in a separate alphabetical, unranked section. Keep each individual benchmark and Dungeon Master selectable.',
  basis: 'The user explicitly authorized this benchmark and website publication. This records agent review under that authority, not fresh human screenshot approval.',
  criterion: 'Writing uses the shared Engineering header, dumbbell rows and mode tabs. A shared native score selector exposes All Writing first, Storytelling, all three individual Storytelling benchmarks and Dungeon Master across model, benchmark and efficiency views. All Writing gives Storytelling and Dungeon Master equal track weights: each Storytelling benchmark contributes one sixth and Dungeon Master one half. Other selections retain their equal-benchmark means. Competitive ranks require complete paired totals on every selected test, with identical fixed weights for every ranked model. Incomplete models retain unranked weighted available-component means by renormalizing those same fixed weights over their paired subset; both conditions and resource calculations use that subset. Asterisks qualify these partial means, which cannot determine ranks, category or sidebar leaders, headline uplift statistics, or comparative efficiency frontiers. Browser evidence independently checks every model, exact-fraction source formula, selected benchmark set, shared-view navigation and history, and preserved model selection. Benchmark tests distinguish a selected model’s original component scores from the separately labeled all-model field means and preserve model identity in compare-model links. Each benchmark uses one source for every model: complete official pairs when available, otherwise its complete published provisional pairs. Included provisional components qualify that model’s score. Core idea fixed-Astra provisional means are independently reproduced from the original reviews. New results require a validated completion lineage preserving every prior valid answer and completed review. Original failed attempts remain archived and unscored; individual complete-cohort requirements and the frozen skill/rubric bytes remain unchanged.',
  verification: {
    releaseId: candidate.releaseId, finalRunSha256: twistsRunSha,
    ...(writingSource.publicRelease ? { publicRelease: writingSource.publicRelease } : {}),
    candidate: reviewedRecord('candidate.json', path.join(directory, 'candidate.json')), previousAcceptance: { path: `${captureRoot}/previous-template-lock.json`, bytes: previousBytes.length, sha256: hash(previousBytes) },
    acceptanceEvidence: reviewedRecord('acceptance-evidence.mjs', acceptanceEvidencePath),
    sourceLineage: reviewedRecord('source-lineage.mjs', sourceLineagePath),
    canonicalRun: reviewedRecord('canonical/canonical-receipt.json', canonicalPath), localBrowserChecks: canonical.results.length,
    sourceSelections, ...(compactSourceSelection ? { compactSourceSelection, compactEvidenceHarness: reviewedRecord(compactEvidenceHarnessName, compactEvidenceHarnessPath) } : {}), freshCaptureCount: captures.size, freshCaptureRoot: captureRoot,
    preservedProjectionFields: canonical.preservation,
    ...(overallPresentation ? { overallSourceValidation: canonical.overallSourceValidation, canonicalController: reviewedRecord('capture-candidate.mjs', path.join(repo, canonical.overallSourceValidation.controller.path)) } : {}),
    categoryIndex: { method: writingExpected.method, ...(writingExpected.fixedBasis ? { writingScoreBasis: writingExpected.fixedBasis } : {}), ...(cleanPresentation ? { presentationVariant } : {}), selectionId: writingExpected.selectionId, selectionIds: writingExpected.selectionIds, weighting: writingExpected.weighting, provisional: writingExpected.provisional, benchmarkIds: writingExpected.benchmarkIds, activeBenchmarkIds: writingExpected.activeBenchmarkIds, groupIds: writingExpected.groupIds, groupWeights: writingExpected.groupWeights, benchmarkWeights: writingExpected.benchmarkWeights, completeSettings: writingExpected.completeSettings, rankedSettings: writingExpected.rankedSettings, partialSettings: writingExpected.partialSettings, unscoredSettings: writingExpected.unscoredSettings },
    writingBrowserProofs: proofs.map(({ benchmark, width, file, bytes, sha256, proof }) => ({ benchmark, width, path: `${captureRoot}/writing-${benchmark}-${width}/writing-browsercheck.json`, bytes, sha256, checks: proof.checks.length, coverage: proof.coverage, categoryEvidence: proof.categoryEvidence, ...(cleanPresentation ? { reportPresentationEvidence: proof.reportPresentationEvidence } : {}), ...(proof.pairedTwistsEvidence ? { pairedTwistsEvidence: proof.pairedTwistsEvidence } : {}), ...(proof.compactCaseEvidence ? { compactEvidenceHarnessSha256: proof.compactEvidenceHarnessSha256, compactCaseEvidence: proof.compactCaseEvidence } : {}), provisionalArchiveEvidence: proof.provisionalArchiveEvidence, predecessorArchiveEvidence: proof.predecessorArchiveEvidence, scoredBranchCoverage: proof.scoredBranchCoverage })),
    provisionalSourceEvidence: writingExpected.provisionalEvidence,
    gamesBrowserProofs: gamesProofs.map(({ width, proof, ...record }) => ({ width, ...record, path: `${captureRoot}/games-${width}/games-browsercheck-${width}.json`, checks: proof.checks.length, coverage: proof.coverage, delivery: proof.delivery.mode })),
    gamesReportCaptures: 'All ten standalone Games report captures are refreshed from the same pinned candidate; desktop and mobile each establish ten advancing clips and ten game input observations with no delivery or runtime failures.',
    totalBytes: candidate.totalBytes, compressedLandingBytes: candidate.compressedLandingBytes,
    visualReview: 'Agent inspected the shared Engineering/Writing frame, numeric dumbbell pairs, all six score selections, exact-fraction weighted component formulas and asterisks, qualified provisional scores, selected-model versus all-model benchmark means, shared controls and history, and original answer, judgment and exclusion views. Fresh immutable captures and their byte-pinned receipts cover all 32 canonical views, every selected Writing benchmark at 1440, 820 and 390 pixels, and both exhaustive Games checks. The dedicated Magic answer archive and all original score sources are verified separately. Earlier accepted captures are retained unchanged as historical evidence, never presented as fresh screenshots.'
  }
};
if (cleanPresentation) {
  lock.acceptance.criterion = 'Writing retains the shared Engineering dumbbell frame and all six score choices in model and efficiency views. Benchmark tests is only the original four field-mean rows grouped by track, with contributor, case, trial and effective-review metadata and direct comparison/report links. It has no score or model selectors, selected-model panel, formula, explanatory essay or inline provisional accordion. The model score-and-answer detail and each report’s Judge & trial details are closed initially, explicitly opened for numerical audits, and closed again for normal views. Reports share the Model comparison heading and place the existing model comparison directly after the hero. All Writing retains equal track weights: Storytelling benchmarks each contribute one sixth, Dungeon Master one half. Rankings require all selected paired scores; partial means retain the same fixed weights normalized over their available paired subset and remain unranked with asterisks. Both conditions and resources use the same subset, with no independent renormalization of missing resources. Every exact source value, component formula, rank, sidebar leader and efficiency frontier remains independently checked. Benchmark means always describe the same original all-model field, never the retained selected model. Native score selection and history are exercised in scored views, and comparison links retain model identity. Methodology remains a closed, inspectable disclosure of development status, single-judge provisional components and exclusion from Overall. Core’s fixed-Astra values are independently reproduced from original archived reviews. Original reports retain their own protocols; Magic contexts and DM cohort tables remain fully audited inside report details. Every immutable source, completion lineage, failed predecessor, valid answer, completed review, skill byte and rubric remains preserved.';
  lock.acceptance.verification.visualReview = 'Agent inspected clean benchmark ledgers, model and efficiency views with closed score details, the opened category Methodology qualification, and the common report hierarchy with Judge & trial details closed and explicitly opened for audit. All six selections retain independently checked dumbbell scores, weights, exact formulas, ranks and partial markers. Fresh pinned captures cover all 32 canonical views, all four Writing benchmarks at 1440, 820 and 390 pixels, and both exhaustive Games checks. Original reports, answers, reviews, trial/context/cohort tables and exclusions remain verified. Removed accordion and selected-model benchmark captures remain historical only; no prior screenshot is claimed as current.';
}
lock.claimBoundary = 'All Writing is the equal-weight mean of the Storytelling and Dungeon Master track scores. Storytelling remains the equal-weight mean of Core idea, Plot twists and Magic discovery, so the four All Writing benchmark weights are one sixth, one sixth, one sixth and one half. A ranked All Writing model must have complete paired totals for all four benchmarks. Track and individual-test selections retain their original arithmetic and require every selected paired benchmark to rank. Incomplete models remain visible in a separate alphabetical, unranked section; an asterisk identifies a partial weighted mean formed by renormalizing the fixed selected benchmark weights over available paired tests. Both conditions and resources use exactly those weights; missing resource readings are not renormalized separately. Partial means are not comparative ranks, category or sidebar leaders, headline uplift statistics, or efficiency-frontier points. The stable sidebar summarizes All Writing, not the currently selected track. Benchmark tests separate selected-model component scores from benchmark field means across models. Rubrics and judge panels remain uncalibrated. One source basis is used per benchmark for every model, with official pairs preferred over published provisional pairs; included provisional components qualify that model’s score. Missing scores are never zero-filled and individual incomplete trial totals never become benchmark headlines. Coverage counts describe exact selected immutable checkpoints, not future results. Completion editions preserve original valid evidence and retain failed predecessor attempts without scoring them; later cohort expansion and changed read transports remain explicit limitations. Core provisional values are independently reproduced from the original archive. All tracks and individual tests remain selectable, and full original evidence stays archived. Writing remains excluded from Overall. Acceptance is not live deployment proof.';
if (cleanPresentation) lock.claimBoundary = lock.claimBoundary.replace('Benchmark tests separate selected-model component scores from benchmark field means across models.', 'Benchmark tests show only original all-model field means; selected-model components remain in closed score details in the model and efficiency views. Category Methodology retains provisional source qualifications; original reports retain their own protocols, with detailed context, cohort and trial tables closed by default but fully inspectable. This presentation cleanup changes no score, weight, rank, selected source or judge.');
if (leadersPresentation) {
  lock.acceptance.response += ' Show each benchmark’s top-with-skill model beside the unchanged field averages, with that same model’s paired plain score and delta.';
  lock.acceptance.criterion = lock.acceptance.criterion.replace('Benchmark tests is only the original four field-mean rows', 'Benchmark tests retains the original four field-mean rows');
  lock.acceptance.criterion += ' Each row’s separate top-with-skill summary is independently derived from that benchmark’s complete, eligible paired scores using its unchanged source basis. The highest exact skill score wins; exact ties use ascending configuration-identity codepoint order and disclose the full tied count. The plain score and delta belong to the same winning model. Rounded display ties, incomplete diagnostics and higher provisional fallback values cannot change the winner. Visible top-model labels and paired numbers must fit their original benchmark row and comparison block without overlap or text overflow.';
  lock.acceptance.verification.visualReview += ' Each compact top-with-skill summary, its original model label, same-model plain/skill/delta and tie count were checked independently against the per-benchmark model rows, including viewport containment and non-overlap.';
  lock.claimBoundary = lock.claimBoundary.replace('Benchmark tests show only original all-model field means;', 'Benchmark tests retain original all-model field means and add a distinct top-with-skill model summary;');
  lock.claimBoundary += ' The top model is determined by exact skill score among complete paired models on each benchmark, not the field mean, largest uplift or best plain score. Exact ties use configuration-identity codepoint order and retain their tie count. The top summary never changes a benchmark field average, selected-model state, source basis or aggregate ranking.';
}
if (overallPresentation) {
  lock.acceptance.response += ' Include complete All Writing scores in Overall v3: Engineering 50%, Writing 25%, AI Workflows 25%; Games remains excluded.';
  lock.acceptance.criterion = lock.acceptance.criterion.replace('and exclusion from Overall', 'and its 25% contribution to Overall');
  lock.acceptance.criterion += ' Overall v3 is independently rebuilt from original Engineering canonical task scores, AI exact task scores, and complete paired Writing benchmark scores. Eligibility requires every published input in both conditions; missing scores never become zeros or available-only ranks. Writing retains equal track weights and equal benchmark weights within each track. Published benchmark inventories drive task counts and within-category weights automatically. Resource means use the same fixed nested weights and propagate missing constituents without changing score eligibility. Canonical and Writing browser proofs retain the exact newly generated Overall bytes and the independent oracle dependency; all non-Overall source-family preservation pins remain mandatory.';
  lock.acceptance.verification.visualReview += ' Overall’s Engineering, Writing and AI Workflows segments, complete-cohort ranks and nested source-derived scores were checked against the independent original-source oracle; Games remains outside the aggregate.';
  lock.claimBoundary = lock.claimBoundary.replace('Writing remains excluded from Overall.', 'Overall v3 includes Engineering at 50%, complete All Writing at 25%, and AI Workflows at 25%, normalized once from declared published-category priorities. All registered published benchmark inputs are required in both conditions to rank. Games remains excluded. The Writing category’s own benchmark weighting and ranks are unchanged.');
}
if (writingSource.writingScoreBasis) {
  lock.acceptance.criterion = 'Writing uses the explicit writing-established-storytelling-v1 source basis: Core idea published single-judge provisional, original Plot twists, and First discovery of magic, equally weighted. Both conditions require every basis benchmark to rank; partial means are visible but unranked and never become leaders or efficiency-frontier points. Resource means use the same fixed weights and propagate missing readings. Registered compact editions have independent score selections and shared reports without changing the broad Writing cohort. The old Dungeon Master and original Plot twists remain under Past editions with all historical evidence. Every displayed model score, formula, rank, provisional qualification, task inventory and report route is independently checked. Compact reports expose every task rubric and original answer, both blind original judgments, exact hashes, candidate mapping, runtime amendment and no-inference validation lineage. Browser proofs bind each rendered compact case to the immutable archive and the byte-pinned evidence helper. Model details and detailed methodology remain closed initially and inspectable. Benchmark rows retain field means and independent same-model top-with-skill summaries; exact ties retain their count and use configuration identity for display order. Canonical captures, all registered Writing reports at three widths, Games checks, original legacy source validators and historical capture pins remain mandatory.'
    + (overallPresentation ? ' Overall uses Engineering 50%, established Writing 25% and AI Workflows 25%, independently rebuilt from original scores; every included input is required to rank, and Games remains excluded.' : ' Writing remains excluded from Overall.');
  lock.acceptance.verification.visualReview = 'Agent reviewed the shared model and efficiency frame, explicit stable broad Writing basis, each independently selectable registered compact test, current benchmark rows and separate Past editions. Fresh evidence covers all 32 canonical views, every selected Writing report at 1440, 820 and 390 pixels, all original compact task answers and paired reviews, and both Games checks. Score and source assertions are independently checked; original contradictory review ratings and preferences remain unchanged. Historical captures remain intact and are not claimed as current.';
  lock.claimBoundary = 'All Writing uses writing-established-storytelling-v1: Core idea published single-judge provisional scores, the original Plot twists edition, and First discovery of magic, equally weighted. Both conditions must cover the same complete benchmark set to receive a rank. Compact Plot twists, Place generation, and One-shot adventure outline retain their separate six-Claude task cohorts and cannot alter broad Writing weights, roster, or ranks. The old Dungeon Master study and original Plot twists report remain under Past editions with original evidence intact; only original Plot twists remains in the established broad score basis. Compact answer scores average the original two judges after each rates four task-specific criteria from 0 to 5; group scores average every declared task equally. The runtime amendment and offline diagnostic validation retain all original attempts and reviews without another judgment or changed rating. Incomplete means remain visible but unranked. Original rubrics and model-judged scores are uncalibrated. Every compact report and response archive is bound to its immutable export, manifest, amendment and offline validation hashes. '
    + (overallPresentation ? 'Overall uses Engineering 50%, established Writing 25%, and AI Workflows 25%; Games remains excluded. ' : 'Writing remains excluded from Overall. ')
    + 'Acceptance is not live deployment proof.';
}
if (writingSource.publicRelease?.id === 'writing-storytelling-public-v1') {
  const releasedIds = writingSource.catalog.map(item => item.id);
  requireEvidence(isDeepStrictEqual(releasedIds, writingSource.writingScoreBasis.benchmarkIds)
    && releasedIds.length === 3 && !compactSourceSelection
    && !Object.keys(writingSource.additionalBenchmarks ?? {}).length
    && !Object.keys(writingSource.compactBenchmarks ?? {}).length,
  'The public baseline must contain exactly its declared score inputs, without development experiments.');
  lock.acceptance.verdict = 'Authorized public benchmark baseline cleanup; exact candidate visually reviewed and browser-verified by the agent';
  lock.acceptance.response = 'Keep one released benchmark catalog across the homepage, Writing category and reports. Remove development experiments and unfinished-run dashboards from the public flow while preserving their original evidence privately. Retain paired model scores, benchmark field averages, same-model top-score summaries, and closed inspectable methods and coverage.';
  lock.acceptance.criterion = 'The homepage, Writing category and shared reports expose the same explicitly released Core idea, original Plot twists and First discovery of magic sources. Writing weights those three tests equally; Overall retains Engineering 50%, Writing 25% and AI Workflows 25%. Only complete comparable model settings receive ranks. All original published scores, answers, reviews and methodological limitations remain intact. Withdrawn experiments are absent from current public data and report routes; missing-model coverage is a closed compact disclosure without invented totals. Independent source arithmetic, shared report hierarchy, navigation and desktop/tablet/mobile evidence remain mandatory.';
  lock.acceptance.verification.visualReview = 'Agent reviewed the cleaned common leaderboard and benchmark ledgers, retained same-model top scores versus field averages, current report views and compact coverage disclosure. Fresh byte-pinned evidence covers all 32 canonical views, each of the three released Writing reports at 1440, 820 and 390 pixels, and both Games checks. Historical experiment artifacts and prior acceptance evidence remain unchanged, not claimed as fresh results.';
  lock.claimBoundary = 'This is a cleanup of existing published evidence, not a new measurement or a demonstrated skill improvement. Writing is the equal mean of its three visible Storytelling tests. Core idea retains its published single-judge basis; rubrics and judge panels remain uncalibrated. Incomplete model results cannot determine ranks or leaders. All September 9 compact experiments and the legacy Dungeon Master study are outside the current public collection, regardless of their outcomes. No original scores, prompts, answers or judgments were rewritten. Acceptance alone is not live deployment proof.';
  if (pairedTwists) {
    lock.acceptance.verdict = 'Authorized fresh fixed Plot twists paired edition; completed candidate visually reviewed and browser-verified by the agent';
    lock.acceptance.response = 'Publish the complete fresh six-model Plot twists measurement under its stable report ID, alongside the unchanged Core idea and First discovery of magic sources. Preserve the shared leaderboard and report format, exact originals and privately retained earlier edition evidence.';
    lock.acceptance.criterion = 'The current Plot twists source is storytelling-plot-twists-paired-v2: one fixed prompt, six medium creator settings, twelve fresh plain/skill answers, twelve original blind paired reviews from GPT-6 Astra xhigh and GPT-5.6 Sol xhigh, and twenty-four answer-level assessments. The original frozen skill root and twists reference are delivered inline once; actual provider roles, exact delivered messages and source hashes are retained without claiming a tool read or verified model attention. Each original judge score is twenty times its mean of four integer 0–5 ratings; the answer score is the two-judge mean. Exact candidate texts, seeded opposite orders, original review JSON, rating evidence and arithmetic are independently checked. All twelve answers and all six paired model scores are required; no reduced roster, old answers or replacement judgments enter this edition. Writing equally weights unchanged Core idea, the new Plot twists edition and unchanged Magic; its cohort and Overall cohort must be recomputed from their common complete settings. The earlier Plot twists source and all private experiments remain preserved but are not current aggregate inputs. Shared report hierarchy, same-model top scores versus field means, closed inspectable methods, all 32 canonical views, nine Writing proofs and both Games checks remain mandatory.';
    lock.acceptance.verification.visualReview = 'Agent reviewed the shared six-setting Plot twists report, four-criterion 0–5 rubric, twelve paired-review calls versus twenty-four answer assessments, exact original input and review disclosures, recomputed Writing/Overall cohorts, benchmark field means and separate same-model top scores at desktop, tablet and mobile widths. Fresh byte-pinned proofs cover the exact candidate; earlier captures remain historical.';
    lock.claimBoundary = 'This is a fresh single-prompt, single-generation paired measurement, not proof of broad writing quality, skill improvement or precise population rankings. Two model judges share a provider and overlap with creator families; no human calibration is claimed. All declared valid outcomes and disagreements are retained. Core idea keeps its original single-judge provisional basis, and Magic keeps its original source. Writing is the equal mean of those two benchmarks and the new paired Plot twists edition, only for common complete settings. Overall uses Engineering 50%, Writing 25% and AI Workflows 25%, excluding Games and all incomplete settings from ranks. Earlier Plot twists answers and reviews are preserved separately and never mixed into current scores. Provider built-in instructions and model attention to supplied skill text are not independently verified. Acceptance alone is not live deployment proof.';
  }
}
if (compactSourceSelection && !lock.files.some(file => file.path === compactEvidenceHarnessName)) lock.files.push({ path: compactEvidenceHarnessName, role: 'compact-writing-evidence-harness', ...compactEvidenceHarnessPin });
lock.files = lock.files.map(file => ({ ...file, ...pin(contained(site, file.path)) }));
lock.retainedCaptureEvidence = { explanation: 'Previous acceptance captures remain unchanged at their original paths. They are historical evidence, not claimed to depict this release.', version: JSON.parse(previousBytes).version, receipt: { path: `${captureRoot}/previous-template-lock.json`, bytes: previousBytes.length, sha256: hash(previousBytes) }, captures: historicalCaptures, previousRetainedEvidence: lock.retainedCaptureEvidence ?? null };
lock.captures = [...captures].map(([capturePath, capture]) => { const bytes = fs.readFileSync(capture.path); return { path: capturePath, bytes: capture.bytes, sha256: capture.sha256, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }; });
const serialized = JSON.stringify(lock, null, 2) + '\n';
requireEvidence(!fs.existsSync(previousPath) && !fs.existsSync(path.join(directory, 'template-lock.json')) && !fs.existsSync(contained(site, captureRoot)), 'Use a new acceptance attempt; prior evidence must remain intact.');
requireEvidence(buildBenchmarkPublicationArtifact({ repoRootDirectory: repo, validateAcceptance: false }).releaseId === candidate.releaseId, 'Candidate changed during acceptance validation.');
if (compactEvidenceHarnessPin) requireEvidence(isDeepStrictEqual(pin(compactEvidenceHarnessPath), compactEvidenceHarnessPin), 'Compact Writing evidence helper changed before acceptance write.');
fs.writeFileSync(previousPath, previousBytes, { flag: 'wx' });
fs.writeFileSync(path.join(directory, 'template-lock.json'), serialized, { flag: 'wx' });
for (const [name, source] of reviewFiles) {
  const destination = contained(site, name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
}
fs.writeFileSync(contained(site, `${captureRoot}/previous-template-lock.json`), previousBytes, { flag: 'wx' });
for (const capture of lock.captures) {
  const destination = contained(site, capture.path);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(captures.get(capture.path).path, destination, fs.constants.COPYFILE_EXCL);
}
fs.writeFileSync(lockPath, serialized);
process.stdout.write(JSON.stringify({ version: lock.version, releaseId: candidate.releaseId, captures: lock.captures.length, writingProofs: proofs.length, gamesProofs: gamesProofs.length }) + '\n');
