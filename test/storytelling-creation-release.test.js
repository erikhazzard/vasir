import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  assertCreationReady,
  assertArtifactMatchesState,
  captureSelectionPins,
  copyReviewedAcceptanceToRepository,
  createFocusedAcceptanceLock,
  extractProductionPolicy,
  publishReviewedCandidate,
  validateBrowserProof
} from '../docs/work/vasir-benchmarking/storytelling-magic-discovery/publish-release.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = 'storytelling-magic-discovery';
const releaseId = 'a'.repeat(64);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const temporary = t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-creation-release-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
};
function readyFixture() {
  return {
    projection: { benchmarks: [{ id }], coverage: { executionComplete: true, executionStatus: 'complete', pendingGenerationCount: 0, pendingJudgmentCount: 0,
      settingCount: 33, expectedResponseCount: 198, expectedPairs: 99, expectedJudgmentCount: 792, expectedJudgeRequestCount: 396,
      judgmentCount: 792, terminalJudgmentFailureCount: 0, terminallyExcludedJudgmentCount: 0 } },
    judging: { pairs: Array.from({ length: 99 }, () => ({ eligible: true, judgments: Array.from({ length: 4 }, () => ({ status: 'complete', attempts: [{ retryable: false }] })) })) }
  };
}
function artifactFixture() {
  const files = [{ path: 'writing-creation-responses.js', bytes: 12, sha256: 'b'.repeat(64), contentType: 'text/javascript; charset=utf-8' }];
  const publicManifest = { releaseId, files };
  const artifact = { releaseId, files, publicManifest, dispose() {} };
  const state = { releaseId, files, publicManifestSha256: hash(`${JSON.stringify(publicManifest, null, 2)}\n`), repo: '/source', frozenRoot: '/frozen' };
  return { artifact, state };
}

test('release readiness requires all planned work while permitting reconciled terminal exclusions', () => {
  const { projection, judging } = readyFixture();
  assert.equal(assertCreationReady(projection, judging), projection.coverage);
  projection.coverage.executionStatus = 'complete-with-exclusions';
  projection.coverage.judgmentCount -= 8;
  projection.coverage.terminallyExcludedJudgmentCount = 8;
  judging.pairs[0].eligible = false;
  judging.pairs[0].judgments.forEach(judge => { judge.status = 'ineligible'; });
  assert.doesNotThrow(() => assertCreationReady(projection, judging));
  projection.coverage.judgmentCount -= 2;
  projection.coverage.terminalJudgmentFailureCount = 2;
  judging.pairs[1].judgments[0].status = 'error';
  assert.doesNotThrow(() => assertCreationReady(projection, judging));
  judging.pairs[1].judgments[0].attempts[0].retryable = true;
  assert.throws(() => assertCreationReady(projection, judging), /unresolved/);
  projection.coverage.executionComplete = false;
  assert.throws(() => assertCreationReady(projection, judging), /incomplete/);
});

test('candidate HTTP policy uses the actual production router and unchanged CSP', () => {
  const infra = fs.readFileSync(path.join(repo, 'site/vasirbenchmark.com/infra/production.yml'), 'utf8');
  const policy = extractProductionPolicy(infra, releaseId);
  assert.match(policy.csp, /connect-src 'none'/);
  assert.match(policy.csp, /script-src 'self'/);
  assert.equal(policy.route('/').uri, `/releases/${releaseId}/index.html`);
  assert.equal(policy.route(`/releases/${releaseId}/writing-creation-responses.js`).uri, `/releases/${releaseId}/writing-creation-responses.js`);
  for (const uri of ['/writing-creation-responses.js', `/releases/${releaseId}/../data.js`, `/releases/${releaseId}/%2e%2e/data.js`, '/private/source.json']) {
    assert.equal(policy.route(uri).statusCode, 403);
  }
});

test('selection pins retain all older experiments and detect changed selected source bytes', t => {
  const root = temporary(t);
  for (const benchmarkId of ['storytelling-core-idea', 'storytelling-plot-twists', 'dungeon-master-adventure-outline', id]) {
    fs.mkdirSync(path.join(root, 'benchmarks', benchmarkId), { recursive: true });
    const sources = Object.fromEntries(['run', 'skill'].map(name => {
      const relative = `benchmarks/${benchmarkId}/${name}.json`, text = JSON.stringify({ benchmarkId, name });
      fs.writeFileSync(path.join(root, relative), text);
      return [name, { path: relative, sha256: hash(text) }];
    }));
    fs.writeFileSync(path.join(root, 'benchmarks', benchmarkId, 'publication.json'), JSON.stringify(sources));
  }
  const pins = captureSelectionPins(root);
  assert.deepEqual(pins.map(pin => pin.benchmarkId), ['storytelling-core-idea', 'storytelling-plot-twists', 'dungeon-master-adventure-outline', id]);
  assert.ok(pins.every(pin => pin.sources.length === 2));
  fs.appendFileSync(path.join(root, 'benchmarks/storytelling-core-idea/run.json'), '\n');
  assert.throws(() => captureSelectionPins(root), /source hash differs/);
});

test('browser evidence must prove candidate archive bytes and the actual screenshot viewport', t => {
  const directory = temporary(t);
  const image = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(image);
  image.write('IHDR', 12, 'ascii');
  image.writeUInt32BE(390, 16); image.writeUInt32BE(844, 20);
  fs.writeFileSync(path.join(directory, 'mobile.png'), image);
  const state = { releaseId, harness: { sha256: 'c'.repeat(64) }, coverage: { executionComplete: true },
    files: [{ path: 'writing-creation-responses.js', bytes: 17, sha256: 'd'.repeat(64) }] };
  const proof = { kind: 'vasirbenchmark-writing-browsercheck', status: 'passed', benchmarkId: id, trialCount: 3, width: 390, height: 844,
    harnessSha256: state.harness.sha256, errors: [], checks: ['Actual harness checks'], coverage: state.coverage, url: 'http://127.0.0.1:9000/',
    loadedFiles: [{ url: `http://127.0.0.1:9000/releases/${releaseId}/writing-creation-responses.js`, bytes: 17, sha256: 'd'.repeat(64) }],
    screenshots: [{ path: 'mobile.png', bytes: image.length, sha256: hash(image), width: 390, height: 844 }] };
  const verify = () => validateBrowserProof({ proof, directory, state, viewport: { width: 390, height: 844 }, baseUrl: proof.url });
  assert.equal(verify().length, 1);
  proof.screenshots[0].height = 1000;
  assert.throws(verify, /dimensions or viewport metadata/);
  proof.screenshots[0].height = 844;
  proof.loadedFiles[0].url = 'http://127.0.0.1:9000/writing-creation-responses.js';
  assert.throws(verify, /differ from the frozen candidate/);
  proof.loadedFiles = [];
  assert.throws(verify, /no loaded-byte evidence/);
});

function focusedAcceptanceFixture(t) {
  const root = temporary(t), sourceRepo = path.join(root, 'repo'), site = path.join(root, 'frozen/site/vasirbenchmark.com');
  const sharedSite = path.join(sourceRepo, 'site/vasirbenchmark.com'), output = path.join(root, 'release');
  for (const directory of [site, sharedSite, output]) fs.mkdirSync(directory, { recursive: true });
  const write = (file, value) => { const bytes = typeof value === 'string' || Buffer.isBuffer(value) ? value : `${JSON.stringify(value, null, 2)}\n`; fs.writeFileSync(file, bytes); return { bytes: Buffer.byteLength(bytes), sha256: hash(bytes) }; };
  const previous = { kind: 'vasirbenchmark-site-template-lock', version: 'prior-peer-acceptance', status: 'accepted', captures: [{ path: 'desktop.png', bytes: 7, sha256: hash('old png'), width: 1440, height: 1000 }] };
  const previousAcceptance = write(path.join(site, 'template-lock.json'), previous);
  write(path.join(sharedSite, 'template-lock.json'), previous);
  write(path.join(site, 'desktop.png'), 'old png'); write(path.join(sharedSite, 'desktop.png'), 'old png');
  const app = write(path.join(site, 'app.js'), '// reviewed source\n'); write(path.join(sharedSite, 'app.js'), '// reviewed source\n');
  const manifest = { releaseId, files: [{ path: 'writing-creation-responses.js', bytes: 12, sha256: 'b'.repeat(64) }] };
  const manifestPin = write(path.join(output, 'candidate-manifest.json'), manifest);
  const state = { repo: sourceRepo, site, output, releaseId, previousAcceptance, publicManifestBytes: manifestPin.bytes, publicManifestSha256: manifestPin.sha256,
    presentationFiles: [{ path: 'app.js', ...app }], selections: [], coverage: readyFixture().projection.coverage, helper: { bytes: 10, sha256: 'c'.repeat(64) } };
  const checkDirectory = path.join(output, 'checks/fresh-check'); fs.mkdirSync(checkDirectory, { recursive: true });
  const reports = [{ width: 1440, height: 1000 }, { width: 820, height: 1000 }, { width: 390, height: 844 }].map(viewport => {
    const directory = path.join(checkDirectory, String(viewport.width)); fs.mkdirSync(directory);
    const image = Buffer.alloc(24); Buffer.from('89504e470d0a1a0a', 'hex').copy(image); image.write('IHDR', 12, 'ascii');
    image.writeUInt32BE(viewport.width, 16); image.writeUInt32BE(viewport.height, 20);
    const capture = { path: 'writing-report.png', ...write(path.join(directory, 'writing-report.png'), image), ...viewport, viewport: { ...viewport }, state: 'report' };
    const proofPath = path.join(directory, 'writing-browsercheck.json');
    return { directory, ...viewport, captures: [capture], proof: { path: proofPath, ...write(proofPath, { ...viewport, screenshots: [capture] }) } };
  });
  const proof = { kind: 'vasirbenchmark-creation-release-check', status: 'passed', reports }, proofPath = path.join(checkDirectory, 'check.json'); write(proofPath, proof);
  const check = { directory: checkDirectory, proofPath, proof }, acceptanceDirectory = path.join(output, 'acceptances/fresh-acceptance'); fs.mkdirSync(acceptanceDirectory, { recursive: true });
  return { state, check, previous, acceptanceDirectory, sharedSite, write };
}

test('focused acceptance retains portable prior evidence and only fresh three-viewport captures', t => {
  const fixture = focusedAcceptanceFixture(t), { state, check, previous, acceptanceDirectory, sharedSite } = fixture;
  const lock = createFocusedAcceptanceLock({ state, check, previous, acceptanceDirectory });
  assert.deepEqual(lock.acceptance.scope, { kind: 'focused-writing-benchmark', schemaVersion: 1, benchmarkId: id,
    viewports: [{ width: 1440, height: 1000 }, { width: 820, height: 1000 }, { width: 390, height: 844 }] });
  assert.equal(lock.acceptance.verification.fullGamesAudit, false);
  assert.match(lock.acceptance.basis, /no fresh human screenshot approval/);
  assert.deepEqual(lock.retainedCaptureEvidence.captures, previous.captures);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(state.site, lock.retainedCaptureEvidence.receipt.path))), previous);
  assert.equal(lock.captures.length, 3);
  for (const [index, capture] of lock.captures.entries()) {
    assert.deepEqual(capture.viewport, check.proof.reports[index].captures[0].viewport);
    assert.equal(capture.height, capture.viewport.height);
    assert.ok(capture.path.startsWith(`reviews/${id}/fresh-acceptance/`));
    assert.ok(!previous.captures.some(prior => prior.path === capture.path));
  }
  const verification = lock.acceptance.verification;
  for (const record of [lock.retainedCaptureEvidence.receipt, verification.candidateManifest, verification.browserProof, ...verification.browserReports, ...lock.captures]) {
    assert.equal(path.isAbsolute(record.path), false);
    assert.equal(hash(fs.readFileSync(path.join(state.site, record.path))), record.sha256);
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(sharedSite, 'template-lock.json'))), previous, 'construction changes no shared receipt');
});

test('copy-back refuses peer drift before mutation and copies only reviewed evidence and receipt', t => {
  const fixture = focusedAcceptanceFixture(t), { state, check, previous, acceptanceDirectory, sharedSite, write } = fixture;
  const lock = createFocusedAcceptanceLock({ state, check, previous, acceptanceDirectory });
  const lockPath = path.join(state.site, 'template-lock.json'), acceptedPin = write(lockPath, lock);
  write(path.join(acceptanceDirectory, 'acceptance.json'), { status: 'accepted', releaseId, lock: { path: lockPath, ...acceptedPin } });
  write(path.join(sharedSite, 'app.js'), '// peer changed this\n');
  const copyBack = () => copyReviewedAcceptanceToRepository({ state, verifyPins: () => {} });
  assert.throws(copyBack, /Pinned bytes changed.*app.js/);
  assert.equal(fs.existsSync(path.join(sharedSite, 'reviews')), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(sharedSite, 'template-lock.json'))), previous);
  write(path.join(sharedSite, 'app.js'), '// reviewed source\n');
  const result = copyBack();
  assert.equal(result.releaseId, releaseId);
  assert.equal(hash(fs.readFileSync(path.join(sharedSite, 'template-lock.json'))), acceptedPin.sha256);
  assert.equal(fs.readFileSync(path.join(sharedSite, 'app.js'), 'utf8'), '// reviewed source\n');
  assert.equal(fs.readFileSync(path.join(sharedSite, 'desktop.png'), 'utf8'), 'old png');
  assert.ok(result.addedEvidenceCount >= 8);
  assert.throws(copyBack, /Pinned bytes changed.*template-lock.json/);
});

test('copy-back rejects changed historical captures before adding evidence or replacing the lock', t => {
  const { state, check, previous, acceptanceDirectory, sharedSite, write } = focusedAcceptanceFixture(t);
  const lock = createFocusedAcceptanceLock({ state, check, previous, acceptanceDirectory });
  const lockPath = path.join(state.site, 'template-lock.json'), acceptedPin = write(lockPath, lock);
  write(path.join(acceptanceDirectory, 'acceptance.json'), { status: 'accepted', releaseId, lock: { path: lockPath, ...acceptedPin } });
  write(path.join(sharedSite, 'desktop.png'), 'peer updated this capture');
  assert.throws(() => copyReviewedAcceptanceToRepository({ state, verifyPins: () => {} }), /Pinned bytes changed.*desktop.png/);
  assert.equal(fs.existsSync(path.join(sharedSite, 'reviews')), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(sharedSite, 'template-lock.json'))), previous);
});

test('copy-back refuses a new evidence path beneath a symlinked ancestor', t => {
  const { state, check, previous, acceptanceDirectory, sharedSite, write } = focusedAcceptanceFixture(t);
  const lock = createFocusedAcceptanceLock({ state, check, previous, acceptanceDirectory });
  const lockPath = path.join(state.site, 'template-lock.json'), acceptedPin = write(lockPath, lock);
  write(path.join(acceptanceDirectory, 'acceptance.json'), { status: 'accepted', releaseId, lock: { path: lockPath, ...acceptedPin } });
  const outside = temporary(t);
  fs.symlinkSync(outside, path.join(sharedSite, 'reviews'), 'dir');
  assert.throws(() => copyReviewedAcceptanceToRepository({ state, verifyPins: () => {} }), /Symbolic-link path components/);
  assert.deepEqual(fs.readdirSync(outside), []);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(sharedSite, 'template-lock.json'))), previous);
});

test('changed candidate bytes stop before the mutation-capable publisher is called', async () => {
  const { artifact, state } = artifactFixture();
  assert.equal(assertArtifactMatchesState(artifact, state), artifact);
  const altered = { ...artifact, releaseId: 'e'.repeat(64) };
  let enteredPublisher = false;
  await assert.rejects(publishReviewedCandidate({ state, buildArtifact: () => altered, verifyPins: () => {}, publish: async () => { enteredPublisher = true; } }), /Frozen release bytes changed/);
  assert.equal(enteredPublisher, false);
});

test('publication uses the frozen source root, repeated byte guard, and fast verification only', async () => {
  const { artifact, state } = artifactFixture();
  const builds = [];
  const result = await publishReviewedCandidate({ state, verifyPins: () => {}, buildArtifact: options => { builds.push(options); return artifact; }, publish: async options => {
    assert.equal(options.fullAudit, false);
    assert.equal(options.repoRootDirectory, state.frozenRoot);
    options.buildArtifactImplementation({ repoRootDirectory: state.frozenRoot, validateAcceptance: true });
    return { status: 'unit-test-only' };
  } });
  assert.equal(result.status, 'unit-test-only');
  assert.equal(builds.length, 2);
  assert.ok(builds.every(options => options.publicationSourceRootDirectory === state.repo && options.validateAcceptance === true));
});
