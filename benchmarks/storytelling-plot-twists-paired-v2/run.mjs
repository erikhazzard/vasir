import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparePairedRun, exportPairedRun, runPairedGenerations, runPairedJudgments, applyPairedRuntimeValidationErratum } from '../../cli/eval/plot-twists-paired-runtime.js';

export async function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args;
  assert.ok(['prepare', 'status', 'export', 'generate', 'judge', 'apply-runtime-erratum'].includes(command),
    'Usage: run.mjs <prepare|status|export|generate|judge|apply-runtime-erratum> --run-dir PATH [--limit N] [--concurrency 1|2] [--output FILE]');
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index], value = rest[index + 1];
    assert.ok(['--run-dir', '--limit', '--concurrency', '--output'].includes(key) && value && !value.startsWith('--'), 'Unknown option or missing value.');
    assert.ok(!Object.hasOwn(options, key), 'Duplicate option.'); options[key] = value;
  }
  assert.ok(options['--run-dir'], '--run-dir is required.');
  const runDirectoryPath = path.resolve(options['--run-dir']);
  if (command === 'apply-runtime-erratum') { assert.equal(Object.keys(options).length, 1); return applyPairedRuntimeValidationErratum({ runDirectoryPath }); }
  if (command === 'prepare') { assert.equal(Object.keys(options).length, 1); return preparePairedRun({ runDirectoryPath }); }
  if (['status', 'export'].includes(command)) {
    assert.ok(!options['--limit'] && !options['--concurrency'], 'Read-only commands cannot dispatch.');
    const snapshot = exportPairedRun({ runDirectoryPath });
    if (command === 'status') { assert.ok(!options['--output']); return summarize(snapshot); }
    if (!options['--output']) return snapshot;
    const outputPath = path.resolve(options['--output']); fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
    return { outputPath, runId: snapshot.runId, manifestSha256: snapshot.manifestSha256 };
  }
  assert.ok(!options['--output'], 'Export separately after dispatch.');
  const controller = new AbortController(), abort = () => controller.abort();
  process.once('SIGINT', abort); process.once('SIGTERM', abort);
  try {
    const result = await (command === 'generate' ? runPairedGenerations : runPairedJudgments)({ runDirectoryPath,
      limit: options['--limit'] === undefined ? Infinity : Number(options['--limit']),
      concurrency: options['--concurrency'] === undefined ? 2 : Number(options['--concurrency']), signal: controller.signal,
      onProgress: event => process.stderr.write(JSON.stringify(event) + '\n') });
    return { dispatched: result.dispatched, halted: result.halted, interrupted: result.interrupted, ...summarize(result.snapshot) };
  } finally { process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort); }
}
function summarize(snapshot) {
  return { runId: snapshot.runId, manifestSha256: snapshot.manifestSha256, globalStop: snapshot.globalStop,
    runtimeValidationErratumSha256: snapshot.runtimeValidationErratumSha256 || null,
    ...Object.fromEntries(['generations', 'judgments'].map(kind => [kind, snapshot[kind].reduce((counts, row) => {
      counts[row.status] = (counts[row.status] || 0) + 1; return counts;
    }, {})])) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
  .then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
