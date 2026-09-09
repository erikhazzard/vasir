import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateBenchmarkAcceptance } from '../cli/benchmark-publication-artifact.js';

const helper = 'writing-compact-browser-evidence.mjs';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

test('compact acceptance pins its independent helper and archived bytes without changing historical QA requirements', () => {
  const siteRootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-compact-acceptance-'));
  const config = { target: { domain: 'example.test', profile: 'test' }, publicFiles: [{ path: 'app.js' }] };
  const writeRecord = (relative, text) => {
    const target = path.join(siteRootDirectory, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
    return { path: relative, bytes: Buffer.byteLength(text), sha256: digest(text) };
  };
  const lock = { kind: 'vasirbenchmark-site-template-lock', status: 'accepted',
    acceptance: { authority: 'user' }, deployment: { targetDomain: 'example.test', awsAccountAlias: 'test' },
    files: ['app.js', 'capture.mjs', 'capture.sh', 'games-browsercheck.mjs', 'writing-browsercheck.mjs'].map(file => writeRecord(file, file)),
    captures: [writeRecord('review.png', 'historical capture')] };
  const validate = value => {
    fs.writeFileSync(path.join(siteRootDirectory, 'template-lock.json'), JSON.stringify(value));
    return validateBenchmarkAcceptance({ config, siteRootDirectory });
  };
  const changed = mutate => { const value = structuredClone(lock); mutate(value); return () => validate(value); };
  try {
    assert.doesNotThrow(() => validate(lock), 'Historical acceptance needs no compact helper.');
    lock.acceptance.scope = { benchmarkIds: ['writing-place-generation-v1'] };
    assert.throws(() => validate(lock), error => error.context.changedPaths.includes(helper));
    const freshCaptureRoot = `reviews/writing-category/${'a'.repeat(64)}/qa-${'b'.repeat(64)}`;
    const text = 'export async function inspectCompactWritingReportInDocument() {}\n';
    lock.files.push(writeRecord(helper, text));
    lock.acceptance.verification = { freshCaptureRoot,
      compactSourceSelection: { kind: 'vasirbenchmark-compact-writing-source-verification' },
      compactEvidenceHarness: writeRecord(`${freshCaptureRoot}/${helper}`, text) };
    assert.doesNotThrow(() => validate(lock));
    assert.throws(changed(value => { delete value.acceptance.verification.compactSourceSelection; }), /accepted VasirBench source drifted/);
    assert.throws(changed(value => { delete value.acceptance.verification.compactEvidenceHarness; }), /accepted VasirBench source drifted/);
    assert.throws(changed(value => { value.acceptance.verification.compactEvidenceHarness.sha256 = 'c'.repeat(64); }), /accepted VasirBench source drifted/);
    assert.throws(changed(value => { value.acceptance.verification.freshCaptureRoot = '../outside'; }), /accepted VasirBench source drifted/);
    assert.throws(changed(value => { value.files = value.files.filter(file => file.path !== helper); }), error => error.context.changedPaths.includes(helper));
    fs.appendFileSync(path.join(siteRootDirectory, helper), '// drift');
    assert.throws(() => validate(lock), error => error.context.changedPaths.includes(helper));
    fs.writeFileSync(path.join(siteRootDirectory, helper), text);
    fs.appendFileSync(path.join(siteRootDirectory, freshCaptureRoot, helper), '// archive drift');
    assert.throws(() => validate(lock), error => error.context.changedPaths.includes(`${freshCaptureRoot}/${helper}`));
  } finally { fs.rmSync(siteRootDirectory, { recursive: true, force: true }); }
});
