import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = join(repoRoot, 'site', 'vasirbenchmark.com');
const generatedPublicFiles = new Set(['data.js', 'responses.js', 'writing-data.js', 'writing-responses.js']);
const acceptanceOnlyFiles = [
  'capture.mjs',
  'capture.sh',
  'games-browsercheck.mjs',
  'writing-browsercheck.mjs'
];
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

async function assertLockedFile(record) {
  const contents = await readFile(join(siteRoot, record.path));
  assert.equal(contents.length, record.bytes, `${record.path} byte length drifted`);
  assert.equal(sha256(contents), record.sha256, `${record.path} SHA-256 drifted`);
  return contents;
}

test('canonical VasirBench site matches its accepted template lock', async () => {
  const manifest = JSON.parse(await readFile(join(siteRoot, 'template-lock.json'), 'utf8'));
  const deployment = JSON.parse(await readFile(join(siteRoot, 'deployment.json'), 'utf8'));
  const expectedFiles = [...new Set([
    ...deployment.publicFiles.map(({ path }) => path).filter((path) => !generatedPublicFiles.has(path)),
    ...acceptanceOnlyFiles
  ])].sort();

  assert.equal(manifest.kind, 'vasirbenchmark-site-template-lock');
  assert.equal(manifest.status, 'accepted');
  assert.equal(manifest.canonicalPath, 'site/vasirbenchmark.com');
  assert.equal(manifest.acceptance.authority, 'user');
  assert.equal(manifest.deployment.status, 'active');
  assert.equal(manifest.deployment.targetDomain, 'vasirbenchmark.com');
  assert.equal(manifest.deployment.awsAccountAlias, 'faedark');
  assert.equal(deployment.publicFiles.length, 15);
  assert.equal(new Set(deployment.publicFiles.map(({ path }) => path)).size, 15);
  assert.deepEqual(manifest.deployment.topology, {
    owner: 'CloudFormation',
    stack: 'vasirbenchmark-production',
    origin: 'private-s3-oac',
    edge: 'cloudfront-release-router',
    dns: 'route53-apex-alias'
  });

  assert.deepEqual(manifest.files.map(({ path }) => path).sort(), expectedFiles);
  assert.deepEqual(manifest.captures.map(({ path }) => path), expectedCaptures);

  for (const record of manifest.files) await assertLockedFile(record);
  for (const record of manifest.captures) {
    const contents = await assertLockedFile(record);
    assert.deepEqual(pngDimensions(contents), {
      width: record.width,
      height: record.height
    }, `${record.path} viewport dimensions drifted`);
  }
});
