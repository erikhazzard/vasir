import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareCompactHealthyContinuation, runCompactHealthyContinuation } from '../../cli/eval/writing-compact-pending-controller.js';

export async function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args;
  assert.ok(['prepare', 'generate'].includes(command), 'Usage: continue-healthy.mjs <prepare|generate> --run-dir PATH [--limit N] [--concurrency 1|2]');
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index], value = rest[index + 1];
    assert.ok(['--run-dir', '--limit', '--concurrency'].includes(key) && value && !value.startsWith('--'));
    assert.ok(!Object.hasOwn(options, key));
    options[key] = value;
  }
  assert.ok(options['--run-dir'], '--run-dir is required.');
  const runDirectoryPath = path.resolve(options['--run-dir']);
  if (command === 'prepare') {
    assert.equal(Object.keys(options).length, 1);
    return prepareCompactHealthyContinuation({ runDirectoryPath });
  }
  const controller = new AbortController(), abort = () => controller.abort();
  process.once('SIGINT', abort); process.once('SIGTERM', abort);
  try {
    const result = await runCompactHealthyContinuation({ runDirectoryPath,
      limit: options['--limit'] === undefined ? Infinity : Number(options['--limit']),
      concurrency: options['--concurrency'] === undefined ? 2 : Number(options['--concurrency']), signal: controller.signal,
      onProgress: event => process.stderr.write(`${JSON.stringify(event)}\n`) });
    return { dispatched: result.dispatched, halted: result.halted, interrupted: result.interrupted,
      scopeSha256: result.scopeSha256, generations: result.snapshot.generations.reduce((counts, row) => {
        counts[row.status] = (counts[row.status] ?? 0) + 1; return counts;
      }, {}) };
  } finally { process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
    console.error(error.stack ?? error.message); process.exitCode = 1;
  });
}
