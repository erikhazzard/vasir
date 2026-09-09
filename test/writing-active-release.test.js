import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildWritingPublication, validateWritingPublication, validateWritingSummary } from '../cli/eval/writing-publication.js';
import { WRITING_ACTIVE_RELEASE } from '../cli/eval/writing-release-catalog.js';
import { buildOverallWritingSource } from '../cli/eval/overall-writing-source.js';
import { splitWritingResponseArchives, hydrateWritingResponseArchives } from '../cli/eval/writing-response-archives.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const activeIds = ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery'];
const privateIds = ['storytelling-plot-twists-compact-v2', 'writing-place-generation-v1', 'storytelling-one-shot-v1', 'dungeon-master-adventure-outline'];
const privateSelections = ['benchmarks/writing-compact-v1/publication.json', 'benchmarks/dungeon-master-adventure-outline/publication.json'];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const retainedHashes = new Map();

// Retain hashes of private selections and their pinned evidence before the
// public build; exclusion must not delete, repin, or rewrite an experiment.
for (const relative of privateSelections) {
  const filename = path.join(repo, relative);
  const bytes = fs.readFileSync(filename);
  retainedHashes.set(filename, hash(bytes));
  const selection = JSON.parse(bytes);
  for (const pin of Object.values(selection).filter(value => value?.path && value?.sha256)) {
    const source = path.join(repo, pin.path);
    retainedHashes.set(source, hash(fs.readFileSync(source)));
  }
}
const reads = [];
const built = buildWritingPublication({ repoRootDirectory: repo, readFileSyncImplementation(filename, encoding) {
  const relative = path.relative(repo, filename);
  assert.ok(!privateSelections.includes(relative), `Private selection was read: ${relative}`);
  reads.push(relative);
  const bytes = fs.readFileSync(filename);
  retainedHashes.set(filename, hash(bytes));
  return encoding ? bytes.toString(encoding) : bytes;
} });
const publications = [built.projection, ...built.projection.benchmarkPublications.map(item => item.projection)];

test('active release visibility, source membership, and aggregate inputs are the same three tests', () => {
  assert.deepEqual(WRITING_ACTIVE_RELEASE.benchmarks.map(item => item.id), activeIds);
  assert.ok(WRITING_ACTIVE_RELEASE.benchmarks.every(item => item.lifecycle === 'published'));
  assert.deepEqual(built.stub.publicRelease, { id: WRITING_ACTIVE_RELEASE.id, lifecycle: 'published' });
  assert.deepEqual(built.projection.publicRelease, built.stub.publicRelease);
  assert.deepEqual(built.stub.benchmarkIds, activeIds);
  assert.deepEqual(built.stub.catalog.map(item => item.id), activeIds);
  assert.deepEqual(publications.map(item => item.benchmarks[0].id), activeIds);
  assert.deepEqual(built.projection.writingScoreBasis.benchmarkIds, activeIds);
  assert.deepEqual(buildOverallWritingSource(built.projection).scoreBasis.benchmarkIds, activeIds);
  assert.ok(built.stub.catalog.every(item => item.lifecycle === 'published' && item.archived === false && item.scoreBasisIncluded === true));
  assert.ok(publications.every(item => item.settings.some(setting => setting.provider === 'codex') && item.settings.some(setting => setting.provider === 'claude')));
  assert.equal(built.counts.benchmarks, 3);
  assert.equal(built.counts.tracks, 1);
  assert.equal(built.counts.responses, publications.reduce((sum, item) => sum + item.coverage.responseCount, 0));
  assert.equal(built.counts.cases, publications.reduce((sum, item) => sum + item.coverage.caseCount, 0));
  assert.equal(built.counts.resultEntries, publications.reduce((sum, item) => sum + item.counts.resultEntries, 0));
  assert.equal(built.stub.catalogCoverage.benchmarkCount, 3);
  assert.deepEqual(built.stub.catalogCoverage, built.stub.collectionCoverage);
  assert.deepEqual(reads.filter(filename => filename.endsWith('/publication.json')), activeIds.map(id => `benchmarks/${id}/publication.json`));
});

test('private experiments are absent from public data, response archives, descriptors, and counts', () => {
  const payload = JSON.stringify(built);
  for (const id of privateIds) assert.equal(payload.includes(id), false, `${id} must remain private, including the positive one-shot result`);
  for (const value of [built.projection, built.responseBundle, built.stub]) {
    assert.equal(value.compactBenchmarks, undefined);
    assert.equal(value.additionalBenchmarks, undefined);
  }
  const archives = splitWritingResponseArchives(built.responseBundle, { separateBenchmarks: true });
  assert.deepEqual(Object.keys(archives.additional), ['storytelling-plot-twists']);
  assert.deepEqual(hydrateWritingResponseArchives(archives.primary, archives.creation, archives.additional), built.responseBundle);
  for (const [filename, expected] of retainedHashes) assert.equal(hash(fs.readFileSync(filename)), expected, `Raw evidence changed: ${path.relative(repo, filename)}`);
});

test('a missing active selection fails publication instead of reducing the public score basis', () => {
  assert.throws(() => buildWritingPublication({ repoRootDirectory: repo, readFileSyncImplementation(filename, encoding) {
    if (path.relative(repo, filename) === 'benchmarks/storytelling-magic-discovery/publication.json') {
      throw Object.assign(new Error('Selection missing'), { code: 'ENOENT' });
    }
    return fs.readFileSync(filename, encoding);
  } }), /incomplete active release.*storytelling-magic-discovery/);
});

test('current release validation rejects hidden sources, archived score inputs, and lifecycle drift', () => {
  for (const mutate of [
    value => { value.catalog[1].archived = true; },
    value => { value.catalog[1].lifecycle = 'archived'; },
    value => { value.catalog[1].scoreBasisIncluded = false; },
    value => { value.catalog.push({ ...value.catalog[0], id: privateIds[2] }); },
    value => { value.publicRelease.id = 'unregistered-release'; },
    value => { delete value.catalog; },
    value => { value.compactBenchmarks = {}; },
    value => { value.additionalBenchmarks = {}; }
  ]) {
    const projection = structuredClone(built.projection);
    mutate(projection);
    assert.throws(() => validateWritingPublication(projection, built.responseBundle), /Writing publication:/);
    const stub = structuredClone(built.stub);
    mutate(stub);
    assert.throws(() => validateWritingSummary(stub), /Writing publication:/);
  }
  const responses = structuredClone(built.responseBundle);
  responses.compactBenchmarks = { [privateIds[2]]: { responses: [] } };
  assert.throws(() => validateWritingPublication(built.projection, responses), /private Writing sources/);
  assert.equal(validateWritingPublication(built.projection, built.responseBundle), built.projection);
  assert.equal(validateWritingSummary(built.stub), built.stub);
});
