#!/usr/bin/env node

// Explicit modes only. Importing this module does not prepare, accept, or publish.
// Keep the original repo and earlier release evidence untouched.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildBenchmarkPublicationArtifact } from '../../../../cli/benchmark-publication-artifact.js';
import { publishBenchmarkSite } from '../../../../cli/benchmark-publish.js';
import { buildStorytellingCreationPublication } from '../../../../cli/eval/storytelling-creation-publication.js';
import { WRITING_CREATION_ARCHIVE } from '../../../../cli/eval/writing-response-archives.js';

const HELPER_PATH = fileURLToPath(import.meta.url);
const DEFAULT_REPO = path.resolve(path.dirname(HELPER_PATH), '../../../..');
const BENCHMARK_ID = WRITING_CREATION_ARCHIVE.benchmarkId;
const SELECTION_IDS = ['storytelling-core-idea', 'storytelling-plot-twists', 'dungeon-master-adventure-outline', BENCHMARK_ID];
const VIEWPORTS = [{ width: 1440, height: 1000 }, { width: 820, height: 1000 }, { width: 390, height: 844 }];
const FOCUSED_SCOPE = { kind: 'focused-writing-benchmark', schemaVersion: 1, benchmarkId: BENCHMARK_ID, viewports: VIEWPORTS };
const QA_FILES = ['capture.mjs', 'capture.sh', 'games-browsercheck.mjs', 'writing-browsercheck.mjs'];
const GENERATED_FILES = new Set(['data.js', 'responses.js', 'writing-data.js', 'writing-responses.js', WRITING_CREATION_ARCHIVE.path]);
const AUTHORIZATION = {
  response: 'Come back when the full benchmark has been run and the page has been updated / pushed',
  continuingDeploymentApproval: "you'll need to update the benchmarks page and vasir repo - you have full approval and can push / publish / deploy",
  preserveOtherWork: "you're good to deploy and stuff, you can just git add git commit changes just dont overwrite their stuff"
};
const requireEvidence = (condition, message) => { if (!condition) throw new Error(message); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const writeNew = (file, value) => fs.writeFileSync(file, json(value), { flag: 'wx' });
const now = () => new Date().toISOString();
const pin = file => {
  const stats = fs.lstatSync(file);
  requireEvidence(stats.isFile() && !stats.isSymbolicLink(), `Expected a regular, unlinked file: ${file}`);
  const bytes = fs.readFileSync(file);
  return { bytes: bytes.length, sha256: hash(bytes) };
};
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const checkedPin = (file, expected) => {
  const actual = pin(file);
  requireEvidence(actual.bytes === expected.bytes && actual.sha256 === expected.sha256, `Pinned bytes changed: ${file}`);
  return actual;
};
function within(root, relative) {
  requireEvidence(typeof relative === 'string' && relative && !path.isAbsolute(relative) && !relative.includes('\\') && relative.split('/').every(part => part && part !== '.' && part !== '..'), `Unsafe relative path: ${relative}`);
  const target = path.join(root, relative);
  let component = root;
  for (const part of relative.split('/')) {
    component = path.join(component, part);
    let stats;
    try { stats = fs.lstatSync(component); } catch (error) { if (error.code === 'ENOENT') break; throw error; }
    requireEvidence(!stats.isSymbolicLink(), `Symbolic-link path components are not permitted: ${relative}`);
  }
  if (fs.existsSync(target)) requireEvidence(fs.realpathSync(target).startsWith(`${fs.realpathSync(root)}${path.sep}`), `Path escapes its root: ${relative}`);
  return target;
}
function sourceReferences(value, found = []) {
  if (!value || typeof value !== 'object') return found;
  if (typeof value.path === 'string' && /^[a-f0-9]{64}$/.test(value.sha256 ?? '')) found.push(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') sourceReferences(child, found);
  return found;
}

export function captureSelectionPins(repo) {
  return SELECTION_IDS.map(benchmarkId => {
    const relative = `benchmarks/${benchmarkId}/publication.json`;
    const file = within(repo, relative);
    requireEvidence(fs.existsSync(file), `Selected publication is required before preparation: ${benchmarkId}`);
    const selection = read(file);
    const sources = sourceReferences(selection).map(reference => {
      const actual = pin(within(repo, reference.path));
      requireEvidence(actual.sha256 === reference.sha256, `Selected source hash differs: ${reference.path}`);
      return { path: reference.path, ...actual };
    });
    requireEvidence(sources.length >= 2, `Selection lacks retained source pins: ${benchmarkId}`);
    return { benchmarkId, path: relative, ...pin(file), sources };
  });
}

export function assertCreationReady(projection, judging) {
  const coverage = projection?.coverage;
  requireEvidence(projection?.benchmarks?.[0]?.id === BENCHMARK_ID && coverage?.executionComplete === true &&
    ['complete', 'complete-with-exclusions'].includes(coverage.executionStatus) &&
    coverage.pendingGenerationCount === 0 && coverage.pendingJudgmentCount === 0 &&
    coverage.settingCount === 33 && coverage.expectedResponseCount === 198 && coverage.expectedPairs === 99 &&
    coverage.expectedJudgmentCount === 792 && coverage.expectedJudgeRequestCount === 396,
  'Creation execution is incomplete or differs from the frozen 33-setting, three-trial inventory.');
  requireEvidence(coverage.judgmentCount + coverage.terminalJudgmentFailureCount + coverage.terminallyExcludedJudgmentCount === 792,
    'Creation judgment coverage does not reconcile completed assessments and explicit terminal exclusions.');
  requireEvidence(Array.isArray(judging?.pairs) && judging.pairs.length === 99, 'The complete original judge-pair inventory is required.');
  for (const pair of judging.pairs) {
    requireEvidence(Array.isArray(pair.judgments) && pair.judgments.length === 4, 'A pair lacks the four frozen judge seats.');
    requireEvidence(pair.judgments.every(judge => pair.eligible
      ? judge.status === 'complete' || (judge.status === 'error' && judge.attempts?.length > 0 && judge.attempts.at(-1).retryable !== true)
      : judge.status === 'ineligible'), 'An eligible judge request is still unresolved.');
  }
  return coverage;
}

function selectedCreation(repo) {
  const publication = buildStorytellingCreationPublication({ repoRootDirectory: repo });
  requireEvidence(publication, 'Prepare requires an existing creation publication selection; this helper never switches sources.');
  const selection = read(within(repo, `benchmarks/${BENCHMARK_ID}/publication.json`));
  assertCreationReady(publication.projection, read(within(repo, selection.judging.path)));
  return publication;
}

export function extractProductionPolicy(infra, releaseId) {
  requireEvidence(/^[a-f0-9]{64}$/.test(releaseId), 'Invalid release identifier.');
  const policyBlock = infra.slice(infra.indexOf('Name: vasirbenchmark-production-security-v1'));
  const csp = policyBlock.match(/ContentSecurityPolicy: >-\n((?:[ ]{14}[^\n]+\n)+)/)?.[1].trim().split(/\n\s*/).join(' ');
  const routerSource = infra.split('  ReleaseRouterFunction:\n')[1]?.split('      FunctionConfig:')[0]?.split('      FunctionCode: !Sub |\n')[1];
  requireEvidence(csp && routerSource && csp.includes("script-src 'self'") && csp.includes("connect-src 'none'"), 'The actual production CSP or router is missing.');
  const sandbox = vm.createContext({});
  vm.runInContext(routerSource.replaceAll('${ActiveReleaseId}', releaseId), sandbox, { timeout: 1000 });
  requireEvidence(typeof sandbox.handler === 'function', 'The actual production release router is unavailable.');
  return { csp, cspSha256: hash(csp), routerSha256: hash(routerSource), route: uri => sandbox.handler({ request: { uri } }) };
}

function fileInventory(artifact) {
  return artifact.files.map(({ path, bytes, sha256, contentType }) => ({ path, bytes, sha256, contentType })).sort((a, b) => a.path.localeCompare(b.path));
}
export function assertArtifactMatchesState(artifact, state) {
  requireEvidence(artifact.releaseId === state.releaseId && same(fileInventory(artifact), state.files.map(({ outputPath, ...file }) => file).sort((a, b) => a.path.localeCompare(b.path))) &&
    hash(json(artifact.publicManifest)) === state.publicManifestSha256, 'Frozen release bytes changed after preparation; do not publish this candidate.');
  return artifact;
}
function verifyState(state) {
  requireEvidence(state.kind === 'vasirbenchmark-writing-creation-release' && state.schemaVersion === 1 &&
    path.dirname(state.frozenRoot) === os.tmpdir() && path.basename(state.frozenRoot).startsWith('vasir-magic-presentation-') &&
    state.site === path.join(state.frozenRoot, 'site/vasirbenchmark.com'), 'The state does not identify an isolated presentation copy.');
  checkedPin(HELPER_PATH, state.helper);
  for (const selection of state.selections) {
    checkedPin(within(state.repo, selection.path), selection);
    for (const source of selection.sources) checkedPin(within(state.repo, source.path), source);
  }
  for (const source of state.presentationFiles) checkedPin(within(state.site, source.path), source);
  for (const file of state.files) checkedPin(file.outputPath, file);
  checkedPin(within(state.output, 'candidate-manifest.json'), { bytes: state.publicManifestBytes, sha256: state.publicManifestSha256 });
}
function rebuild(state, validateAcceptance = false) {
  verifyState(state);
  const artifact = buildBenchmarkPublicationArtifact({ repoRootDirectory: state.frozenRoot, publicationSourceRootDirectory: state.repo, validateAcceptance });
  try { assertArtifactMatchesState(artifact, state); } catch (error) { artifact.dispose(); throw error; }
  return artifact;
}
function newAttempt(output, category) {
  const parent = path.join(output, category);
  fs.mkdirSync(parent, { recursive: true });
  const directory = fs.mkdtempSync(path.join(parent, `${now().replaceAll(/[:.]/g, '-')}-`));
  writeNew(path.join(directory, 'started.json'), { startedAt: now() });
  return directory;
}
function latestAttempt(output, category) {
  const parent = path.join(output, category);
  requireEvidence(fs.existsSync(parent), `No ${category} evidence exists.`);
  const names = fs.readdirSync(parent, { withFileTypes: true }).filter(entry => entry.isDirectory() && !entry.isSymbolicLink()).map(entry => entry.name).sort();
  requireEvidence(names.length, `No ${category} evidence exists.`);
  return within(parent, names.at(-1));
}

export function validateBrowserProof({ proof, directory, state, viewport, baseUrl }) {
  requireEvidence(proof.kind === 'vasirbenchmark-writing-browsercheck' && proof.status === 'passed' && proof.benchmarkId === BENCHMARK_ID && proof.trialCount === 3 &&
    proof.width === viewport.width && proof.height === viewport.height && proof.harnessSha256 === state.harness.sha256 &&
    proof.errors?.length === 0 && Array.isArray(proof.checks) && proof.checks.length > 0 && same(proof.coverage, state.coverage), 'The fresh creation browser proof is incomplete or belongs to another candidate.');
  requireEvidence(new URL(proof.url).origin === new URL(baseUrl).origin, 'Browser proof used an unexpected origin.');
  const files = new Map(state.files.map(file => [`/releases/${state.releaseId}/${file.path}`, file]));
  requireEvidence(proof.loadedFiles?.length > 0, 'The browser proof contains no loaded-byte evidence.');
  for (const loaded of proof.loadedFiles) {
    const url = new URL(loaded.url), expected = files.get(url.pathname);
    requireEvidence(url.origin === new URL(baseUrl).origin && expected && loaded.sha256 === expected.sha256 && loaded.bytes === expected.bytes, `Browser-loaded bytes differ from the frozen candidate: ${url.pathname}`);
  }
  requireEvidence(proof.loadedFiles.some(file => new URL(file.url).pathname === `/releases/${state.releaseId}/${WRITING_CREATION_ARCHIVE.path}`), 'The dedicated creation archive was not observed in the browser.');
  const captures = [...(proof.screenshots ?? []), ...(proof.failureScreenshots ?? [])];
  requireEvidence(captures.length > 0, 'The proof contains no fresh screenshots to inspect.');
  for (const capture of captures) {
    const file = within(directory, capture.path);
    checkedPin(file, capture);
    const bytes = fs.readFileSync(file);
    requireEvidence(capture.width === viewport.width && capture.height === viewport.height && bytes.length >= 24 &&
      bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && bytes.subarray(12, 16).toString('ascii') === 'IHDR' &&
      bytes.readUInt32BE(16) === capture.width && bytes.readUInt32BE(20) === capture.height,
    'Screenshot dimensions or viewport metadata differ from the actual image.');
  }
  return captures;
}

async function runHarness({ state, baseUrl, directory, viewport }) {
  fs.mkdirSync(directory, { recursive: false });
  const args = [within(state.site, 'writing-browsercheck.mjs'), '--url', `${baseUrl.replace(/\/$/, '')}/`, '--benchmark', BENCHMARK_ID,
    '--output-dir', directory, '--width', String(viewport.width), '--height', String(viewport.height)];
  writeNew(path.join(directory, 'invocation.json'), { executable: process.execPath, args, harness: state.harness, startedAt: now() });
  const stdout = fs.openSync(path.join(directory, 'stdout.log'), 'wx'), stderr = fs.openSync(path.join(directory, 'stderr.log'), 'wx');
  process.stdout.write(`${JSON.stringify({ event: 'browser-start', ...viewport, directory })}\n`);
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, { cwd: state.frozenRoot, stdio: ['ignore', stdout, stderr], env: process.env });
      let killTimer;
      const timer = setTimeout(() => { child.kill('SIGTERM'); killTimer = setTimeout(() => child.kill('SIGKILL'), 5000); }, 240000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', (code, signal) => { clearTimeout(timer); clearTimeout(killTimer); code === 0 ? resolve() : reject(new Error(`Creation browser check failed at ${viewport.width}: ${signal ?? code}; inspect ${directory}`)); });
    });
  } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
  const proof = read(path.join(directory, 'writing-browsercheck.json'));
  const captures = validateBrowserProof({ proof, directory, state, viewport, baseUrl });
  return { directory, ...viewport, proof: { path: path.join(directory, 'writing-browsercheck.json'), ...pin(path.join(directory, 'writing-browsercheck.json')) }, captures };
}

async function checkCandidate(state, live = false) {
  verifyState(state);
  const artifact = rebuild(state);
  artifact.dispose();
  const directory = newAttempt(state.output, live ? 'live-checks' : 'checks');
  const policy = extractProductionPolicy(fs.readFileSync(within(state.site, 'infra/production.yml'), 'utf8'), state.releaseId);
  const entries = new Map(state.files.map(file => [`/releases/${state.releaseId}/${file.path}`, file]));
  const requests = [], reports = [];
  let server, baseUrl = state.targetUrl;
  const result = { kind: 'vasirbenchmark-creation-release-check', schemaVersion: 1, releaseId: state.releaseId, mode: live ? 'live-network' : 'local-frozen-bytes', status: 'running', startedAt: now(), reports, requests,
    cspSha256: policy.cspSha256, routerSha256: policy.routerSha256, sourceSelections: state.selections,
    claimBoundary: live ? 'Independent browser requests to production with no local interception; loaded hashes must match the reviewed candidate.' : 'Local HTTP rehearsal of pinned candidate files using the actual production CSP and release router; this does not establish uploaded bytes or live delivery.' };
  try {
    if (!live) {
      server = http.createServer((request, response) => {
        const routed = policy.route(String(request.url).split('?')[0]);
        const file = entries.get(routed.uri);
        if (!['GET', 'HEAD'].includes(request.method) || !file) { response.writeHead(routed.statusCode ?? 403, { 'Cache-Control': 'no-store' }); response.end(); return; }
        const body = fs.readFileSync(file.outputPath);
        if (hash(body) !== file.sha256) { response.writeHead(500); response.end(); return; }
        requests.push({ uri: request.url, servedPath: routed.uri, bytes: file.bytes, sha256: file.sha256 });
        response.writeHead(200, { 'Content-Type': file.contentType, 'Content-Security-Policy': policy.csp, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' });
        response.end(request.method === 'HEAD' ? undefined : body);
      });
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      baseUrl = `http://127.0.0.1:${server.address().port}`;
    }
    result.baseUrl = baseUrl;
    for (const viewport of live ? [VIEWPORTS[0]] : VIEWPORTS) reports.push(await runHarness({ state, baseUrl, directory: path.join(directory, String(viewport.width)), viewport }));
    verifyState(state);
    result.status = 'passed';
  } catch (error) { result.status = 'failed'; result.error = error.stack; throw error; }
  finally {
    if (server) await new Promise(resolve => server.close(resolve));
    result.completedAt = now();
    writeNew(path.join(directory, 'check.json'), result);
    process.stdout.write(`${JSON.stringify({ status: result.status, mode: result.mode, proof: path.join(directory, 'check.json') })}\n`);
  }
  return result;
}

function reviewedCheck(state) {
  const directory = latestAttempt(state.output, 'checks');
  const proofPath = path.join(directory, 'check.json'), proof = read(proofPath);
  const policy = extractProductionPolicy(fs.readFileSync(within(state.site, 'infra/production.yml'), 'utf8'), state.releaseId);
  requireEvidence(proof.status === 'passed' && proof.mode === 'local-frozen-bytes' && proof.releaseId === state.releaseId &&
    proof.cspSha256 === policy.cspSha256 && proof.routerSha256 === policy.routerSha256 && same(proof.sourceSelections, state.selections) &&
    same(proof.reports.map(({ width, height }) => ({ width, height })), VIEWPORTS), 'The latest local check must pass all three required viewports under the frozen policy and source selections.');
  for (const report of proof.reports) {
    checkedPin(report.proof.path, report.proof);
    validateBrowserProof({ proof: read(report.proof.path), directory: report.directory, state, viewport: report, baseUrl: proof.baseUrl });
  }
  return { directory, proofPath, proof };
}

export function createFocusedAcceptanceLock({ state, check, previous, acceptanceDirectory }) {
  const reviewRoot = `reviews/${BENCHMARK_ID}/${path.basename(acceptanceDirectory)}`;
  const retain = (source, relative, expected) => {
    checkedPin(source, expected);
    const destination = within(state.site, `${reviewRoot}/${relative}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    return { path: `${reviewRoot}/${relative}`, ...checkedPin(destination, expected) };
  };
  const previousReceipt = retain(within(state.site, 'template-lock.json'), 'previous-template-lock.json', state.previousAcceptance);
  const browserProof = retain(check.proofPath, 'check.json', pin(check.proofPath));
  const candidateManifest = retain(within(state.output, 'candidate-manifest.json'), 'candidate-manifest.json', { bytes: state.publicManifestBytes, sha256: state.publicManifestSha256 });
  const lock = structuredClone(previous);
  lock.version = `writing-magic-discovery-${state.releaseId.slice(0, 12)}`;
  lock.status = 'accepted';
  lock.retainedCaptureEvidence = { explanation: 'Historical captures remain prior evidence and are not claimed to depict this candidate.', version: previous.version, receipt: previousReceipt, captures: previous.captures, previousRetainedEvidence: previous.retainedCaptureEvidence ?? null };
  lock.claimBoundary = 'Focused magic-discovery benchmark review at three viewports. Existing selected Core idea, Plot twists, and Dungeon Master source bytes are pinned and preserved. Retained Games assets and other site views are not a new exhaustive browser audit.';
  lock.files = state.presentationFiles.map(file => ({ ...file }));
  lock.captures = [];
  const browserReports = [];
  for (const report of check.proof.reports) {
    browserReports.push({ width: report.width, height: report.height, ...retain(report.proof.path, `${report.width}/writing-browsercheck.json`, report.proof) });
    for (const capture of report.captures) lock.captures.push({ ...capture, ...retain(within(report.directory, capture.path), `${report.width}/${capture.path}`, capture) });
  }
  lock.acceptance = { authority: 'user', scope: structuredClone(FOCUSED_SCOPE), acceptedAt: now(), verdict: 'Agent-reviewed additive creation benchmark under explicit user publication approval', ...AUTHORIZATION,
    basis: 'The agent inspected fresh screenshots after three successful benchmark-specific browser checks. User authority comes from the quoted task and standing deployment approval; no fresh human screenshot approval is claimed.',
    verification: { releaseId: state.releaseId, browserProof, browserReports, candidateManifest, viewports: VIEWPORTS, coverage: state.coverage, sourceSelections: state.selections, helper: state.helper, fullGamesAudit: false } };
  return lock;
}

async function acceptCandidate(state, visualReviewComplete) {
  requireEvidence(visualReviewComplete, 'Inspect the fresh candidate screenshots before passing --visual-review-complete. This flag records agent visual review, not new human screenshot approval.');
  verifyState(state);
  const check = reviewedCheck(state), directory = newAttempt(state.output, 'acceptances');
  const rebuilt = rebuild(state); rebuilt.dispose();
  const lockPath = within(state.site, 'template-lock.json');
  checkedPin(lockPath, state.previousAcceptance);
  const previousBytes = fs.readFileSync(lockPath), previous = JSON.parse(previousBytes);
  fs.writeFileSync(path.join(directory, 'previous-template-lock.json'), previousBytes, { flag: 'wx' });
  const lock = createFocusedAcceptanceLock({ state, check, previous, acceptanceDirectory: directory });
  const replacement = json(lock), temporaryLock = `${lockPath}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporaryLock, replacement, { flag: 'wx' });
    fs.renameSync(temporaryLock, lockPath);
    const accepted = rebuild(state, true); accepted.dispose();
    const receipt = { kind: 'vasirbenchmark-creation-release-acceptance', status: 'accepted', releaseId: state.releaseId, acceptedAt: now(), lock: { path: lockPath, ...pin(lockPath) }, browserProof: { path: check.proofPath, ...pin(check.proofPath) }, sourceSelections: state.selections };
    writeNew(path.join(directory, 'acceptance.json'), receipt);
    return receipt;
  } catch (error) {
    if (fs.existsSync(lockPath) && hash(fs.readFileSync(lockPath)) === hash(replacement)) fs.writeFileSync(lockPath, previousBytes);
    writeNew(path.join(directory, 'failure.json'), { failedAt: now(), error: error.stack });
    throw error;
  }
}

// Explicitly invoked by the operator only; no release mode copies into the shared tree.
export function copyReviewedAcceptanceToRepository({ state, verifyPins = verifyState }) {
  verifyPins(state);
  const receipt = read(path.join(latestAttempt(state.output, 'acceptances'), 'acceptance.json'));
  requireEvidence(receipt.status === 'accepted' && receipt.releaseId === state.releaseId, 'Copy-back requires the reviewed acceptance receipt.');
  checkedPin(receipt.lock.path, receipt.lock);
  const lock = read(receipt.lock.path), sharedSite = path.join(state.repo, 'site/vasirbenchmark.com');
  requireEvidence(same(lock.acceptance?.scope, FOCUSED_SCOPE) && lock.acceptance.verification.releaseId === state.releaseId, 'Copy-back requires the focused reviewed receipt.');
  const assertSharedUnchanged = () => {
    for (const source of state.presentationFiles) checkedPin(within(sharedSite, source.path), source);
    checkedPin(within(sharedSite, 'template-lock.json'), state.previousAcceptance);
    for (const selection of state.selections) {
      checkedPin(within(state.repo, selection.path), selection);
      for (const source of selection.sources) checkedPin(within(state.repo, source.path), source);
    }
    let retained = lock.retainedCaptureEvidence, first = true;
    requireEvidence(retained?.receipt, 'Copy-back requires the retained historical acceptance chain.');
    while (retained) {
      const previousPath = within(state.site, retained.receipt.path);
      checkedPin(previousPath, retained.receipt);
      const previous = read(previousPath);
      requireEvidence(previous.version === retained.version && same(previous.captures, retained.captures) &&
        same(previous.retainedCaptureEvidence ?? null, retained.previousRetainedEvidence ?? null), 'Historical acceptance metadata changed.');
      if (!first) checkedPin(within(sharedSite, retained.receipt.path), retained.receipt);
      for (const capture of retained.captures) checkedPin(within(sharedSite, capture.path), capture);
      retained = retained.previousRetainedEvidence;
      first = false;
    }
  };
  assertSharedUnchanged();
  const verification = lock.acceptance.verification;
  const records = [lock.retainedCaptureEvidence.receipt, verification.browserProof, verification.candidateManifest, ...verification.browserReports, ...lock.captures];
  const pending = [];
  for (const record of records) {
    requireEvidence(record.path.startsWith(`reviews/${BENCHMARK_ID}/`), 'Copy-back is limited to new focused review evidence.');
    const source = within(state.site, record.path), destination = within(sharedSite, record.path);
    checkedPin(source, record);
    if (fs.existsSync(destination)) checkedPin(destination, record);
    else pending.push({ source, destination, record });
  }
  // Evidence is additive; an interrupted copy may leave new evidence but never replace peer source files.
  for (const { source, destination, record } of pending) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    checkedPin(destination, record);
  }
  assertSharedUnchanged();
  const target = within(sharedSite, 'template-lock.json'), temporaryLock = `${target}.${crypto.randomUUID()}.tmp`;
  fs.copyFileSync(receipt.lock.path, temporaryLock, fs.constants.COPYFILE_EXCL);
  checkedPin(temporaryLock, receipt.lock);
  assertSharedUnchanged();
  fs.renameSync(temporaryLock, target);
  return { kind: 'vasirbenchmark-focused-acceptance-copy-back', releaseId: state.releaseId, lock: { path: target, ...checkedPin(target, receipt.lock) }, addedEvidenceCount: pending.length };
}

export async function publishReviewedCandidate({ state, buildArtifact = buildBenchmarkPublicationArtifact, publish = publishBenchmarkSite, verifyPins = verifyState, onProgress = () => {} }) {
  verifyPins(state);
  const guardedBuild = options => {
    verifyPins(state);
    const artifact = buildArtifact({ ...options, publicationSourceRootDirectory: state.repo });
    try { return assertArtifactMatchesState(artifact, state); } catch (error) { artifact.dispose(); throw error; }
  };
  // Finish the byte check before entering the mutation-capable publisher.
  const preflight = guardedBuild({ repoRootDirectory: state.frozenRoot, validateAcceptance: true }); preflight.dispose();
  return publish({ repoRootDirectory: state.frozenRoot, fullAudit: false, buildArtifactImplementation: guardedBuild, onProgress });
}

export async function main(argv = process.argv.slice(2), repo = DEFAULT_REPO) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: { 'visual-review-complete': { type: 'boolean', default: false } } });
  const [mode] = positionals;
  requireEvidence(positionals.length === 1 && ['prepare', 'check', 'check-live', 'accept', 'publish'].includes(mode), 'Use prepare, check, check-live, accept --visual-review-complete, or publish.');
  const output = path.join(repo, 'tmp/writing-magic-release'), statePath = path.join(output, 'state.json');
  if (mode === 'prepare') {
    requireEvidence(!fs.existsSync(statePath), 'A retained magic candidate already exists; do not overwrite its state or evidence.');
    const selections = captureSelectionPins(repo), creation = selectedCreation(repo);
    fs.mkdirSync(output, { recursive: true });
    const frozenRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-magic-presentation-'));
    const site = path.join(frozenRoot, 'site/vasirbenchmark.com');
    fs.mkdirSync(path.dirname(site), { recursive: true });
    fs.cpSync(path.join(repo, 'site/vasirbenchmark.com'), site, { recursive: true, force: false, errorOnExist: true });
    const artifact = buildBenchmarkPublicationArtifact({ repoRootDirectory: frozenRoot, publicationSourceRootDirectory: repo, validateAcceptance: false });
    requireEvidence(artifact.fileCount === 16 && artifact.files.some(file => file.path === WRITING_CREATION_ARCHIVE.path), 'The frozen artifact lacks the sixteenth creation archive.');
    const previous = read(path.join(site, 'template-lock.json'));
    const presentationPaths = [...new Set([...previous.files.map(file => file.path).filter(file => !GENERATED_FILES.has(file)),
      ...artifact.config.publicFiles.map(file => file.path).filter(file => !GENERATED_FILES.has(file)), ...QA_FILES, 'deployment.json', 'infra/production.yml'])].sort();
    const presentationFiles = presentationPaths.map(relative => ({ path: relative, ...pin(within(site, relative)) }));
    const manifestText = json(artifact.publicManifest);
    const state = { kind: 'vasirbenchmark-writing-creation-release', schemaVersion: 1, repo, output, frozenRoot, site,
      releaseId: artifact.releaseId, targetUrl: artifact.config.target.url, files: artifact.files.map(file => ({ path: file.path, bytes: file.bytes, sha256: file.sha256, contentType: file.contentType, outputPath: file.outputPath })),
      publicManifestSha256: hash(manifestText), publicManifestBytes: Buffer.byteLength(manifestText), totalBytes: artifact.totalBytes, compressedLandingBytes: artifact.compressedLandingBytes,
      selections, coverage: creation.projection.coverage, presentationFiles, helper: pin(HELPER_PATH), harness: pin(path.join(site, 'writing-browsercheck.mjs')),
      previousAcceptance: pin(path.join(site, 'template-lock.json')), createdAt: now() };
    requireEvidence(same(captureSelectionPins(repo), selections), 'Publication selection changed while the candidate was frozen.');
    fs.writeFileSync(path.join(output, 'candidate-manifest.json'), manifestText, { flag: 'wx' });
    writeNew(statePath, state);
    process.stdout.write(`${JSON.stringify({ status: 'prepared', state: statePath, releaseId: state.releaseId, totalBytes: state.totalBytes, compressedLandingBytes: state.compressedLandingBytes, frozenRoot })}\n`);
    return state;
  }
  const state = read(statePath);
  requireEvidence(state.repo === repo && state.output === output, 'State belongs to another repository or release directory.');
  if (mode === 'check' || mode === 'check-live') return checkCandidate(state, mode === 'check-live');
  if (mode === 'accept') return acceptCandidate(state, values['visual-review-complete']);
  verifyState(state);
  const acceptance = read(path.join(latestAttempt(output, 'acceptances'), 'acceptance.json'));
  requireEvidence(acceptance.status === 'accepted' && acceptance.releaseId === state.releaseId, 'The frozen candidate has not been accepted after visual review.');
  checkedPin(acceptance.lock.path, acceptance.lock);
  checkedPin(acceptance.browserProof.path, acceptance.browserProof);
  reviewedCheck(state);
  const directory = newAttempt(output, 'publications'), progress = [];
  let result, failure;
  try {
    result = await publishReviewedCandidate({ state, onProgress: event => {
      const entry = { ...event, at: now() }; progress.push(entry);
      fs.appendFileSync(path.join(directory, 'progress.jsonl'), `${JSON.stringify(entry)}\n`);
      process.stdout.write(`${JSON.stringify(entry)}\n`);
    } });
    verifyState(state);
    return result;
  } catch (error) { failure = error; throw error; }
  finally { writeNew(path.join(directory, 'publication.json'), { kind: 'vasirbenchmark-creation-publication-attempt', status: failure ? 'failed' : 'completed', releaseId: state.releaseId, result: result ?? null, error: failure?.stack ?? null, progress, fullAudit: false, sourceSelections: state.selections, completedAt: now() }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === HELPER_PATH) {
  main().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
}
