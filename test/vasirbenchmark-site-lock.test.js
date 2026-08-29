import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = join(repoRoot, 'site', 'vasirbenchmark.com');
const expectedFiles = [
  'index.html',
  'style.css',
  'app.js',
  'data.js',
  'benchmark-report.html',
  'benchmark-report.css',
  'benchmark-report.js',
  'capture.mjs',
  'capture.sh',
  'assets/kanit-latin-900-normal.woff2'
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
  'mobile-benchmark-report.png'
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

  assert.equal(manifest.kind, 'vasirbenchmark-site-template-lock');
  assert.equal(manifest.status, 'accepted');
  assert.equal(manifest.canonicalPath, 'site/vasirbenchmark.com');
  assert.equal(manifest.acceptance.authority, 'user');
  assert.equal(manifest.deployment.status, 'deferred');
  assert.equal(manifest.deployment.targetDomain, 'vasirbenchmark.com');
  assert.equal(manifest.deployment.awsAccountAlias, 'fylgya');
  assert.equal(manifest.deployment.topology, null);

  assert.deepEqual(manifest.files.map(({ path }) => path), expectedFiles);
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
