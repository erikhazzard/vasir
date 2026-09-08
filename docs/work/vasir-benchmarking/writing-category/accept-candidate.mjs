import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { isDeepStrictEqual } from 'node:util';
import { projectWritingRun } from '../../../../cli/eval/writing-publication.js';
import { deriveExpectedWritingCategory, verifyCandidateCategoryProjection, verifyWritingProofEvidence } from './acceptance-evidence.mjs';
import { buildBenchmarkPublicationArtifact } from '../../../../cli/benchmark-publication-artifact.js';

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
const appSource = pinnedCandidateModule('app.js');
const appBoundary = appSource.indexOf('(async function () {');
requireEvidence(appBoundary > 0, 'The candidate category projection is not isolated before the application.');
const categoryContext = vm.createContext({});
vm.runInContext(appSource.slice(0, appBoundary), categoryContext, { timeout: 10000 });
requireEvidence(typeof categoryContext.buildWritingCategoryCollection === 'function', 'Candidate category builder is missing.');
verifyCandidateCategoryProjection(categoryContext.buildWritingCategoryCollection(writingSource), writingExpected);
// Pin the original experiment, including exact public raw scores, rather than
// accepting any new run with coincidentally matching headline coverage counts.
const twistsSelection = read(path.join(repo, 'benchmarks/storytelling-plot-twists/publication.json'));
const twistsRunSha = '97d1172df61311ca493c53ef99d193d607652de9bc0827bba2d3d6ca3fb41399';
const twistsSkillSha = 'bd95674e5a5dfd99b4b47571bf08742f7c736bd1465d21ba8357bc42638f07e4';
requireEvidence(twistsSelection.run?.sha256 === twistsRunSha && twistsSelection.skill?.sha256 === twistsSkillSha, 'The frozen Plot twists experiment selection changed.');
const frozenJson = selected => {
  const file = contained(repo, selected.path);
  requireEvidence(pin(file).sha256 === selected.sha256, 'The frozen Plot twists source bytes changed.');
  return read(file);
};
const frozenTwists = JSON.parse(JSON.stringify(projectWritingRun({ run: frozenJson(twistsSelection.run), snapshot: frozenJson(twistsSelection.skill), sourceSha256: twistsRunSha }).projection));
requireEvidence(isDeepStrictEqual(writingExpected.publications.get('storytelling-plot-twists'), frozenTwists), 'Candidate Plot twists scores or original experiment metadata changed.');
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
requireEvidence(new Set(canonical.results.map(result => result.filename)).size === 32, 'Canonical captures contain duplicate tasks.');
for (const task of canonicalTasks) {
  const result = canonical.results.find(result => result.filename === task.filename);
  requireEvidence(result && result.code === 0 && ['target', 'viewport', 'width', 'height'].every(key => result[key] === task[key]), `Missing or failed canonical task: ${task.filename}`);
  const screenshot = verifyPng(path.join(directory, 'canonical'), result, task.width, task.height, task.filename);
  if (task.viewport !== 'tablet') captures.set(task.filename, screenshot);
}
const harnessSha = pin(path.join(site, 'writing-browsercheck.mjs')).sha256;
const proofs = [];
for (const benchmark of ['core', 'twists']) for (const width of [1440, 820, 390]) {
  const file = path.join(directory, `writing-${benchmark}-${width}/writing-browsercheck.json`);
  const proof = read(file);
  const benchmarkId = benchmark === 'core' ? 'storytelling-core-idea' : 'storytelling-plot-twists';
  requireEvidence(proof.kind === 'vasirbenchmark-writing-browsercheck' && proof.status === 'passed' && empty(proof.errors) && proof.harnessSha256 === harnessSha && proof.benchmarkId === benchmarkId && proof.trialCount === (benchmark === 'core' ? 1 : 10) && proof.width === width && proof.height === heightFor(width) && Array.isArray(proof.checks) && proof.checks.length > 0, 'Writing proof failed or has another benchmark, viewport, or harness.');
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
  requireEvidence(['app.js', 'writing-data.js', 'benchmark-report.js', 'writing-responses.js'].every(file => loadedPaths.has(file)), 'Writing proof omitted a required loaded module.');
  verifyWritingProofEvidence(proof, writingExpected);
  requireEvidence(hash(proof.categoryEvidence.overall) === canonical.preservation.overall, 'Writing category altered Overall.');
  requireEvidence(Array.isArray(proof.screenshots) && proof.screenshots.length > 0 && Array.isArray(proof.failureScreenshots), 'Writing screenshot inventory is missing.');
  const screenshotNames = new Set();
  for (const screenshot of [...proof.screenshots, ...(proof.failureScreenshots || [])]) {
    requireEvidence(!screenshotNames.has(screenshot.path) && screenshot.width === width && screenshot.height === heightFor(width), 'Duplicate or wrong-viewport Writing screenshot.');
    screenshotNames.add(screenshot.path);
    verifyPng(path.dirname(file), screenshot, width, heightFor(width));
  }
  requireEvidence(['writing-models.png', 'writing-stacked-rows.png', 'writing-benchmarks.png', 'writing-efficiency.png', 'writing-efficiency-tokens.png', 'writing-report.png'].every(name => screenshotNames.has(name)), 'Writing proof omitted required category, stacked-row, benchmark, efficiency, or report captures.');
  proofs.push({ benchmark, width, file, proof, ...record(file) });
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
    if (requiredCaptures.includes(screenshot.path)) captures.set(screenshot.path, verified);
  }
  requireEvidence(requiredCaptures.every(file => captures.has(file)), 'Games proof omitted a required report capture.');
  gamesProofs.push({ width, proof, ...record(file) });
}
const lockPath = path.join(site, 'template-lock.json');
const previousBytes = fs.readFileSync(lockPath);
const previousPath = path.join(directory, 'previous-template-lock.json');
const lock = JSON.parse(previousBytes);
const acceptedCaptureNames = new Set(lock.captures.map(capture => capture.path));
for (const { benchmark, width, file, proof } of proofs) {
  if (benchmark !== 'core' || width === 820) continue;
  const prefix = width === 1440 ? 'desktop' : 'mobile';
  for (const screenshot of proof.screenshots) {
    const name = `${prefix}-${screenshot.path}`;
    if (acceptedCaptureNames.has(name)) captures.set(name, { path: path.join(path.dirname(file), screenshot.path), bytes: screenshot.bytes, sha256: screenshot.sha256 });
  }
}
requireEvidence(Array.isArray(lock.files) && lock.files.length === 15 && new Set(lock.files.map(file => file.path)).size === 15 && Array.isArray(lock.captures) && lock.captures.length === 60 && new Set(lock.captures.map(capture => capture.path)).size === 60 && captures.size === 60, 'Acceptance source or capture inventory changed.');
// Validate every replacement before modifying any accepted source or capture.
for (const capture of lock.captures) {
  const replacement = captures.get(capture.path);
  requireEvidence(replacement && pin(replacement.path).sha256 === replacement.sha256, `Missing or changed current capture: ${capture.path}`);
  contained(site, capture.path);
}
lock.version = `2026-09-08-writing-category-hierarchy-${candidate.releaseId.slice(0, 12)}`;
lock.acceptance = {
  authority: 'user', acceptedAt: new Date().toISOString(),
  verdict: 'Authorized Writing category hierarchy correction; candidate visually reviewed and browser-verified by the agent',
  response: 'Correct Writing to use the Overall category hierarchy: one paired stacked-bar leaderboard with subcategory segments; show grouped benchmark breakdowns under the Benchmark tests tab.',
  basis: 'The user explicitly authorized this benchmark and website publication. This records agent review under that authority, not fresh human screenshot approval.',
  criterion: 'Writing reuses Overall paired stacks and typography, removes benchmark/subcategory pickers above the mode tabs, and groups benchmark tests under the category. The provisional index weights active subcategories equally and active benchmarks equally within each subcategory; every ranked setting must have a complete pair on the same active cohort. Candidate-derived report coverage, frozen Plot twists raw scores and exclusions, original answer/review routes, and existing category data remain unchanged.',
  verification: {
    releaseId: candidate.releaseId, finalRunSha256: '97d1172df61311ca493c53ef99d193d607652de9bc0827bba2d3d6ca3fb41399',
    candidate: record(path.join(directory, 'candidate.json')), previousAcceptance: { path: path.relative(repo, previousPath), bytes: previousBytes.length, sha256: hash(previousBytes) },
    canonicalRun: record(canonicalPath), localBrowserChecks: canonical.results.length,
    preservedProjectionFields: canonical.preservation,
    categoryIndex: { method: 'equal-active-subcategory-equal-active-benchmark-complete-paired-index-v1', benchmarkIds: writingExpected.benchmarkIds, activeBenchmarkIds: writingExpected.activeBenchmarkIds, groupIds: writingExpected.groupIds, benchmarkWeights: writingExpected.benchmarkWeights, completeSettings: writingExpected.completeSettings, unscoredSettings: writingExpected.unscoredSettings },
    writingBrowserProofs: proofs.map(({ benchmark, width, path: proofPath, bytes, sha256, proof }) => ({ benchmark, width, path: proofPath, bytes, sha256, checks: proof.checks.length, coverage: proof.coverage, categoryEvidence: proof.categoryEvidence, scoredBranchCoverage: proof.scoredBranchCoverage })),
    gamesBrowserProofs: gamesProofs.map(({ width, proof, ...record }) => ({ width, ...record, checks: proof.checks.length, coverage: proof.coverage, delivery: proof.delivery.mode })),
    gamesReportCaptures: 'All ten standalone Games report captures are refreshed from the same pinned candidate; desktop and mobile each establish ten advancing clips and ten game input observations with no delivery or runtime failures.',
    totalBytes: candidate.totalBytes, compressedLandingBytes: candidate.compressedLandingBytes,
    visualReview: 'Agent inspected the corrected category hierarchy, paired stacked rows, grouped Benchmark tests and efficiency on desktop/mobile, plus original report and exclusion evidence. All category/report browser checks cover three viewport sizes. Extra stacked-row captures remain retained in their proof directories without changing the exact 60 accepted capture inventory.'
  }
};
lock.claimBoundary = 'Writing is a provisional display index: equal active subcategories, equal active benchmarks within each, and complete paired totals across the same active benchmark cohort for every ranked setting. This is not cross-rubric calibration or a claim of general writing ability. Original benchmark scores and report-specific cohorts are unchanged. Plot twists retains its frozen 80 outlines, 78 valid generations, 152 completed reviews and eight excluded slots; only Sol and Luna have ten complete pairs. Core idea coverage is verified against this exact candidate, not an older checkpoint. Writing remains excluded from Overall. Acceptance is not live deployment proof.';
lock.files = lock.files.map(file => ({ ...file, ...pin(contained(site, file.path)) }));
lock.captures = lock.captures.map(capture => ({ ...capture, bytes: captures.get(capture.path).bytes, sha256: captures.get(capture.path).sha256 }));
const serialized = JSON.stringify(lock, null, 2) + '\n';
requireEvidence(!fs.existsSync(previousPath) && !fs.existsSync(path.join(directory, 'template-lock.json')) && !fs.existsSync(path.join(directory, 'previous-captures')), 'Use a new acceptance attempt; prior evidence must remain intact.');
requireEvidence(buildBenchmarkPublicationArtifact({ repoRootDirectory: repo, validateAcceptance: false }).releaseId === candidate.releaseId, 'Candidate changed during acceptance validation.');
fs.writeFileSync(previousPath, previousBytes, { flag: 'wx' });
fs.mkdirSync(path.join(directory, 'previous-captures'));
for (const capture of lock.captures) fs.copyFileSync(contained(site, capture.path), contained(path.join(directory, 'previous-captures'), capture.path), fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(directory, 'template-lock.json'), serialized, { flag: 'wx' });
for (const capture of lock.captures) fs.copyFileSync(captures.get(capture.path).path, contained(site, capture.path));
fs.writeFileSync(lockPath, serialized);
process.stdout.write(JSON.stringify({ version: lock.version, releaseId: candidate.releaseId, captures: lock.captures.length, writingProofs: proofs.length, gamesProofs: gamesProofs.length }) + '\n');
