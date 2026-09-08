import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = join(repoRoot, 'site', 'vasirbenchmark.com');
const generatedPublicFiles = new Set(['data.js', 'responses.js', 'writing-data.js', 'writing-responses.js', 'writing-creation-responses.js']);
const acceptanceOnlyFiles = [
  'capture.mjs',
  'capture.sh',
  'games-browsercheck.mjs',
  'writing-browsercheck.mjs'
];
const focusedBenchmarkId = 'storytelling-magic-discovery';
const focusedViewports = [{ width: 1440, height: 1000 }, { width: 820, height: 1000 }, { width: 390, height: 844 }];
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

async function assertSelectedSourceEvidence(selection, readLockedFile = assertLockedFile) {
  assert.equal(selection.path, `benchmarks/${selection.benchmarkId}/publication.json`);
  // The tracked source selection is always required and byte-verified, even on a bare checkout.
  const selected = JSON.parse(await readLockedFile(selection, repoRoot));
  assert.ok(selection.sources.length >= 2);
  const byPath = (left, right) => left.path.localeCompare(right.path) || left.sha256.localeCompare(right.sha256);
  assert.deepEqual(selection.sources.map(({ path, sha256 }) => ({ path, sha256 })).sort(byPath), selectedSourceReferences(selected).sort(byPath), 'accepted source metadata differs from the tracked selection');
  const unavailable = [];
  for (const source of selection.sources) {
    assert.ok(source.path.startsWith(`.agents/vasir-evals/${selection.benchmarkId}/publication-snapshots/`), 'optional private evidence must belong to the selected immutable archive');
    try { await readLockedFile(source, repoRoot); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // Raw runtime archives are intentionally ignored by Git. Absence is not a byte-verification pass.
      unavailable.push(source.path);
    }
  }
  return unavailable;
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

test('canonical VasirBench site matches its accepted template lock', async t => {
  const manifest = JSON.parse(await readFile(join(siteRoot, 'template-lock.json'), 'utf8'));
  const deployment = JSON.parse(await readFile(join(siteRoot, 'deployment.json'), 'utf8'));
  const focused = manifest.acceptance.scope !== undefined;
  const expectedFiles = [...new Set([
    ...deployment.publicFiles.map(({ path }) => path).filter((path) => !generatedPublicFiles.has(path)),
    ...acceptanceOnlyFiles,
    ...(focused ? ['deployment.json', 'infra/production.yml'] : [])
  ])].sort();

  assert.equal(manifest.kind, 'vasirbenchmark-site-template-lock');
  assert.equal(manifest.status, 'accepted');
  assert.equal(manifest.canonicalPath, 'site/vasirbenchmark.com');
  assert.equal(manifest.acceptance.authority, 'user');
  assert.equal(manifest.deployment.status, 'active');
  assert.equal(manifest.deployment.targetDomain, 'vasirbenchmark.com');
  assert.equal(manifest.deployment.awsAccountAlias, 'faedark');
  assert.equal(deployment.publicFiles.length, 16);
  assert.equal(new Set(deployment.publicFiles.map(({ path }) => path)).size, 16);
  assert.deepEqual(manifest.deployment.topology, {
    owner: 'CloudFormation',
    stack: 'vasirbenchmark-production',
    origin: 'private-s3-oac',
    edge: 'cloudfront-release-router',
    dns: 'route53-apex-alias'
  });

  assert.deepEqual(manifest.files.map(({ path }) => path).sort(), expectedFiles);
  if (focused) {
    const unavailable = await assertFocusedEvidence(manifest, deployment);
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
