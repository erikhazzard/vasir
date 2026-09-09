import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildBenchmarkPublicationProjection } from './eval/benchmark-publication-projection.js';
import { WRITING_RESPONSE_ARCHIVES } from './eval/writing-response-archives.js';

// All aggregate math and benchmark discovery belong to the validated publisher.
// This command only synchronizes its disposable generated browser modules.
export function refreshBenchmarkSite({ repoRootDirectory, check = false,
  buildProjection = buildBenchmarkPublicationProjection } = {}) {
  if (!repoRootDirectory) throw new Error('An explicit repository root is required.');
  const repo = path.resolve(repoRootDirectory);
  const built = buildProjection({ repoRootDirectory: repo });
  const modules = new Map([
    ['data.js', built.dataSource], ['responses.js', built.responsesSource],
    ['writing-data.js', built.writingDataSource], ['writing-responses.js', built.writingResponsesSource],
    ['writing-creation-responses.js', built.writingCreationResponsesSource],
    ...Object.entries(built.writingAdditionalResponseSources || {})
  ].filter(([, contents]) => contents != null));
  const allowed = new Set(['data.js', 'responses.js', 'writing-data.js', 'writing-responses.js',
    ...WRITING_RESPONSE_ARCHIVES.map(archive => archive.path)]);
  for (const [name, contents] of modules) {
    if (!allowed.has(name) || typeof contents !== 'string') throw new Error(`Invalid generated benchmark module: ${name}`);
  }
  const directory = path.join(repo, 'site/vasirbenchmark.com');
  const changed = [...modules].filter(([name, contents]) => {
    try { return fs.readFileSync(path.join(directory, name), 'utf8') !== contents; }
    catch (error) { if (error.code === 'ENOENT') return true; throw error; }
  });
  if (!check) {
    fs.mkdirSync(directory, { recursive: true });
    for (const [name, contents] of changed) {
      const staged = path.join(directory, `.${name}.refresh-${crypto.randomUUID()}`);
      try {
        fs.writeFileSync(staged, contents, { flag: 'wx' });
        fs.renameSync(staged, path.join(directory, name));
      } finally {
        if (fs.existsSync(staged)) fs.unlinkSync(staged);
      }
    }
  }
  const overall = built.projection?.overall;
  return { status: check && changed.length ? 'stale' : 'current', check,
    changedFiles: changed.map(([name]) => name), moduleCount: modules.size,
    overall: overall ? { edition: overall.scoreBasis.edition,
      benchmarks: overall.benchmarks.length, categories: overall.categories.map(category => ({ id: category.id, weight: category.weight })),
      rankedSettings: overall.settings.length } : null };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { check: { type: 'boolean', default: false }, repo: { type: 'string' } } });
  const result = refreshBenchmarkSite({ repoRootDirectory: values.repo || process.cwd(), check: values.check });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (result.status === 'stale') process.exitCode = 1;
}
