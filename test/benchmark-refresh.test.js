import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { refreshBenchmarkSite } from '../cli/benchmark-refresh.js';

const withRepo = run => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-benchmark-refresh-test-'));
  try { run(directory); } finally { fs.rmSync(directory, { recursive: true, force: true }); }
};
const projection = () => ({ dataSource: 'DATA', responsesSource: 'ANSWERS', writingDataSource: 'WRITING',
  writingResponsesSource: 'WRITING ANSWERS', writingCreationResponsesSource: 'MAGIC',
  writingAdditionalResponseSources: { 'writing-twists-responses.js': 'TWISTS', 'writing-dungeon-master-responses.js': 'DM' },
  projection: { overall: { scoreBasis: { edition: 'overall-v3' }, benchmarks: [{ id: 'a' }],
    categories: [{ id: 'writing', weight: 1 }], settings: [{ id: 'model' }] } } });

test('refresh synchronizes all generated modules once and has an idempotent read-only stale check', () => withRepo(repo => {
  const built = projection(); let calls = 0;
  const buildProjection = ({ repoRootDirectory }) => { assert.equal(repoRootDirectory, repo); calls++; return built; };
  const options = { repoRootDirectory: repo, buildProjection };
  assert.equal(refreshBenchmarkSite({ ...options, check: true }).status, 'stale');
  assert.equal(fs.existsSync(path.join(repo, 'site')), false, 'check must not create directories');
  const refreshed = refreshBenchmarkSite(options);
  assert.equal(refreshed.status, 'current'); assert.equal(refreshed.changedFiles.length, 7);
  const file = path.join(repo, 'site/vasirbenchmark.com/data.js'), prior = fs.statSync(file).mtimeMs;
  assert.equal(refreshBenchmarkSite({ ...options, check: true }).status, 'current');
  assert.deepEqual(refreshBenchmarkSite(options).changedFiles, []);
  assert.equal(fs.statSync(file).mtimeMs, prior, 'unchanged generated files are not rewritten');
  assert.equal(calls, 4, 'each invocation derives data from the source publisher');
}));

test('new publisher results and benchmarks refresh without a hardcoded homepage inventory', () => withRepo(repo => {
  const built = projection(), options = { repoRootDirectory: repo, buildProjection: () => built };
  refreshBenchmarkSite(options);
  built.projection.overall.benchmarks.push({ id: 'new-registered-benchmark' });
  built.projection.overall.categories.push({ id: 'new-category', weight: 0.5 });
  built.dataSource = 'UPDATED GENERATED DATA';
  const checked = refreshBenchmarkSite({ ...options, check: true });
  assert.deepEqual(checked.changedFiles, ['data.js']);
  assert.equal(fs.readFileSync(path.join(repo, 'site/vasirbenchmark.com/data.js'), 'utf8'), 'DATA');
  const result = refreshBenchmarkSite(options);
  assert.equal(result.overall.benchmarks, 2); assert.equal(result.overall.categories.length, 2);
  assert.equal(fs.readFileSync(path.join(repo, 'site/vasirbenchmark.com/data.js'), 'utf8'), built.dataSource);
}));

test('invalid source builds and unrecognized generated paths fail before changing existing files', () => withRepo(repo => {
  const built = projection(), options = { repoRootDirectory: repo, buildProjection: () => built };
  refreshBenchmarkSite(options);
  assert.throws(() => refreshBenchmarkSite({ ...options, buildProjection: () => { throw new Error('invalid source'); } }), /invalid source/);
  built.dataSource = 'MUST NOT WRITE';
  built.writingAdditionalResponseSources['../../outside.js'] = 'UNSAFE';
  assert.throws(() => refreshBenchmarkSite(options), /Invalid generated benchmark module/);
  assert.equal(fs.readFileSync(path.join(repo, 'site/vasirbenchmark.com/data.js'), 'utf8'), 'DATA');
}));
