import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { isDeepStrictEqual } from 'node:util';
import { projectWritingRun } from '../../../../cli/eval/writing-publication.js';
import { buildStorytellingCreationPublication } from '../../../../cli/eval/storytelling-creation-publication.js';
import { WRITING_CATEGORY_METHOD, deriveExpectedWritingCategory, deriveExpectedProvisionalEvidence, verifyCandidateCategoryProjection, verifyWritingProofEvidence } from './acceptance-evidence.mjs';
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
const writingExpected = deriveExpectedWritingCategory(writingSource);
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
const twistsSelection = read(path.join(repo, 'benchmarks/storytelling-plot-twists/publication.json'));
const twistsRunSha = twistsSelection.run.sha256;
const twistsSkillSha = 'bd95674e5a5dfd99b4b47571bf08742f7c736bd1465d21ba8357bc42638f07e4';
requireEvidence(twistsSelection.skill?.sha256 === twistsSkillSha, 'The frozen Plot twists skill changed.');
const frozenJson = selected => {
  const file = contained(repo, selected.path);
  requireEvidence(pin(file).sha256 === selected.sha256, 'The frozen Plot twists source bytes changed.');
  return read(file);
};
const selectedTwists = projectWritingRun({ run: frozenJson(twistsSelection.run), snapshot: frozenJson(twistsSelection.skill), sourceSha256: twistsRunSha });
const frozenTwists = JSON.parse(JSON.stringify(selectedTwists.projection));
requireEvidence(isDeepStrictEqual(writingExpected.publications.get('storytelling-plot-twists'), frozenTwists), 'Candidate Plot twists scores or original experiment metadata changed.');
if (frozenTwists.methodology.completion) {
  const loadedArchive = loadedWritingResponses.benchmarkResponses.find(item => item.benchmarkId === 'storytelling-plot-twists')?.responseBundle;
  requireEvidence(isDeepStrictEqual(JSON.parse(JSON.stringify(loadedArchive)), JSON.parse(JSON.stringify(selectedTwists.responseBundle))), 'Plot twists completion archive differs from its pinned source.');
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
const captureRoot = `reviews/writing-category/${candidate.releaseId}`;
const reviewFiles = new Map([
  [`${captureRoot}/candidate.json`, path.join(directory, 'candidate.json')],
  [`${captureRoot}/acceptance-evidence.mjs`, acceptanceEvidencePath],
  [`${captureRoot}/source-lineage.mjs`, sourceLineagePath],
  [`${captureRoot}/canonical/canonical-receipt.json`, canonicalPath]
]);
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
const writingBenchmarks = [ ['core', 'storytelling-core-idea'], ['twists', 'storytelling-plot-twists'], ...(writingExpected.publications.has('dungeon-master-adventure-outline') ? [['dm', 'dungeon-master-adventure-outline']] : []), ...(writingExpected.publications.has('storytelling-magic-discovery') ? [['magic', 'storytelling-magic-discovery']] : []) ];
for (const [benchmark, benchmarkId] of writingBenchmarks) for (const width of [1440, 820, 390]) {
  const file = path.join(directory, `writing-${benchmark}-${width}/writing-browsercheck.json`);
  const proof = read(file);
  requireEvidence(proof.acceptanceEvidenceSha256 === acceptanceEvidenceSha, 'Independent Writing acceptance derivation changed during or after browser review.');
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
  for (const [index, provisional] of writingExpected.provisionalEvidence.entries()) requireEvidence(screenshotNames.has(index ? `writing-provisional-${provisional.benchmarkId}.png` : 'writing-provisional.png'), 'Writing proof omitted the candidate provisional benchmark capture.');
  requireEvidence(!screenshotNames.has('writing-partial.png'), 'Rejected partial placeholder capture remains in this candidate.');
  proofs.push({ benchmark, width, file, proof, ...record(file) });
  reviewFiles.set(`${captureRoot}/writing-${benchmark}-${width}/writing-browsercheck.json`, file);
}
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
requireEvidence(Array.isArray(sourceSelections) && isDeepStrictEqual([...sourceSelections.map(item => item.benchmarkId)].sort(), [...writingExpected.benchmarkIds].sort()), 'Previous accepted original Writing source selections are missing or changed.');
requireEvidence(isDeepStrictEqual(verifyWritingSourceSelections({ repo, previousSelections: previousSourceSelections }), sourceSelections), 'Writing source selection changed during acceptance.');
requireEvidence(Array.isArray(lock.files) && lock.files.length === 17 && new Set(lock.files.map(file => file.path)).size === 17 && Array.isArray(historicalCaptures) && historicalCaptures.length > 0 && new Set(historicalCaptures.map(capture => capture.path)).size === historicalCaptures.length, 'Current accepted presentation or historical capture inventory is invalid.');
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
  response: 'Show all available model scores in the shared Engineering dumbbell leaderboard. Average each model’s available paired Core idea, Plot twists and Magic discovery benchmark scores; append an asterisk when tests are missing. Keep each individual benchmark and Dungeon Master selectable.',
  basis: 'The user explicitly authorized this benchmark and website publication. This records agent review under that authority, not fresh human screenshot approval.',
  criterion: 'Writing uses the shared Engineering header, dumbbell rows and mode tabs. The native score selector exposes Storytelling, all three individual Storytelling benchmarks and Dungeon Master. Each model averages its available complete paired benchmark totals with equal weights over the same subset for both conditions. At least one available benchmark score permits ranking; missing selected benchmarks require visible asterisks in both row scores, leaders, sidebar and selected calculation, with the explicit available-score footnote. Browser evidence independently checks every model and selected formulas for every available benchmark-count group. Each benchmark uses one source for every model: complete official pairs when available, otherwise its complete published provisional pairs. Included provisional components qualify that model’s score. Core idea fixed-Astra provisional means are independently reproduced from the original reviews. New results require a validated completion lineage preserving every prior valid answer and completed review. Original failed attempts remain archived and unscored; individual complete-cohort requirements and the frozen skill/rubric bytes remain unchanged.',
  verification: {
    releaseId: candidate.releaseId, finalRunSha256: twistsRunSha,
    candidate: reviewedRecord('candidate.json', path.join(directory, 'candidate.json')), previousAcceptance: { path: `${captureRoot}/previous-template-lock.json`, bytes: previousBytes.length, sha256: hash(previousBytes) },
    acceptanceEvidence: reviewedRecord('acceptance-evidence.mjs', acceptanceEvidencePath),
    sourceLineage: reviewedRecord('source-lineage.mjs', sourceLineagePath),
    canonicalRun: reviewedRecord('canonical/canonical-receipt.json', canonicalPath), localBrowserChecks: canonical.results.length,
    sourceSelections, freshCaptureCount: captures.size, freshCaptureRoot: captureRoot,
    preservedProjectionFields: canonical.preservation,
    categoryIndex: { method: WRITING_CATEGORY_METHOD, selectionId: writingExpected.selectionId, selectionIds: writingExpected.selectionIds, provisional: writingExpected.provisional, benchmarkIds: writingExpected.benchmarkIds, activeBenchmarkIds: writingExpected.activeBenchmarkIds, groupIds: writingExpected.groupIds, benchmarkWeights: writingExpected.benchmarkWeights, completeSettings: writingExpected.completeSettings, rankedSettings: writingExpected.rankedSettings, partialSettings: writingExpected.partialSettings, unscoredSettings: writingExpected.unscoredSettings },
    writingBrowserProofs: proofs.map(({ benchmark, width, file, bytes, sha256, proof }) => ({ benchmark, width, path: `${captureRoot}/writing-${benchmark}-${width}/writing-browsercheck.json`, bytes, sha256, checks: proof.checks.length, coverage: proof.coverage, categoryEvidence: proof.categoryEvidence, provisionalArchiveEvidence: proof.provisionalArchiveEvidence, predecessorArchiveEvidence: proof.predecessorArchiveEvidence, scoredBranchCoverage: proof.scoredBranchCoverage })),
    provisionalSourceEvidence: writingExpected.provisionalEvidence,
    gamesBrowserProofs: gamesProofs.map(({ width, proof, ...record }) => ({ width, ...record, path: `${captureRoot}/games-${width}/games-browsercheck-${width}.json`, checks: proof.checks.length, coverage: proof.coverage, delivery: proof.delivery.mode })),
    gamesReportCaptures: 'All ten standalone Games report captures are refreshed from the same pinned candidate; desktop and mobile each establish ten advancing clips and ten game input observations with no delivery or runtime failures.',
    totalBytes: candidate.totalBytes, compressedLandingBytes: candidate.compressedLandingBytes,
    visualReview: 'Agent inspected the shared Engineering/Writing frame, numeric dumbbell pairs, all five score selections, available-component averages and asterisks, qualified provisional scores, and original answer, judgment and exclusion views. Fresh immutable captures and their byte-pinned receipts cover all 32 canonical views, every selected Writing benchmark at 1440, 820 and 390 pixels, and both exhaustive Games checks. The dedicated Magic answer archive and all original score sources are verified separately. Earlier accepted captures are retained unchanged as historical evidence, never presented as fresh screenshots.'
  }
};
lock.claimBoundary = 'The Storytelling score is each model’s mean of its available complete paired benchmark totals from Core idea, Plot twists and Magic discovery. Models may be averaged over different tests; an asterisk identifies missing selected benchmarks. Both conditions use the same available test subset and equal weights within that subset. Their rubrics and judge panels are uncalibrated. One source basis is used per benchmark for every model, with official pairs preferred over published provisional pairs; included provisional components qualify that model’s score. Missing scores are never zero-filled, individual incomplete trial totals never become benchmark headlines, and missing resource readings are not renormalized separately. Coverage counts describe the exact selected immutable checkpoints, not expected future results. Completion editions preserve original valid evidence and retain failed predecessor attempts without scoring them; the later cohort expansion and changed read transports remain explicit limitations. Core provisional values are independently reproduced from the original archive. All individual tests and Dungeon Master remain selectable, and the full original evidence stays archived. Writing remains excluded from Overall. Acceptance is not live deployment proof.';
lock.files = lock.files.map(file => ({ ...file, ...pin(contained(site, file.path)) }));
lock.retainedCaptureEvidence = { explanation: 'Previous acceptance captures remain unchanged at their original paths. They are historical evidence, not claimed to depict this release.', version: JSON.parse(previousBytes).version, receipt: { path: `${captureRoot}/previous-template-lock.json`, bytes: previousBytes.length, sha256: hash(previousBytes) }, captures: historicalCaptures, previousRetainedEvidence: lock.retainedCaptureEvidence ?? null };
lock.captures = [...captures].map(([capturePath, capture]) => { const bytes = fs.readFileSync(capture.path); return { path: capturePath, bytes: capture.bytes, sha256: capture.sha256, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }; });
const serialized = JSON.stringify(lock, null, 2) + '\n';
requireEvidence(!fs.existsSync(previousPath) && !fs.existsSync(path.join(directory, 'template-lock.json')) && !fs.existsSync(contained(site, captureRoot)), 'Use a new acceptance attempt; prior evidence must remain intact.');
requireEvidence(buildBenchmarkPublicationArtifact({ repoRootDirectory: repo, validateAcceptance: false }).releaseId === candidate.releaseId, 'Candidate changed during acceptance validation.');
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
