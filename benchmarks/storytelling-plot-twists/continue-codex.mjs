import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { resumeTwistsAfterVerifiedCodexCapacity } from '../../cli/eval/plot-twists-operational-recovery.js';

const { values } = parseArgs({ options: {
  dispatch: { type: 'boolean' }, 'run-id': { type: 'string' }, 'capacity-proof': { type: 'string' },
  mode: { type: 'string', default: 'generation' }, concurrency: { type: 'string', default: '16' },
  'max-rows': { type: 'string' }
} });
if (!values.dispatch || !values['capacity-proof']) throw new Error('Requires --dispatch --run-id ID --capacity-proof FILE [--mode generation|judging --concurrency 16 --max-rows N]');
const repoRootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const report = message => process.stdout.write(JSON.stringify(message) + '\n');
let pauseRequested = false;
const pause = signal => { pauseRequested = true; report({ event: 'pause-requested', signal, pid: process.pid }); };
process.on('SIGINT', pause); process.on('SIGTERM', pause);
try {
  report(await resumeTwistsAfterVerifiedCodexCapacity({ repoRootDirectory, runId: values['run-id'],
    proofPath: values['capacity-proof'], mode: values.mode, concurrency: Number(values.concurrency),
    maxRows: values['max-rows'] === undefined ? null : Number(values['max-rows']),
    report, shouldPause: () => pauseRequested }));
} finally {
  process.removeListener('SIGINT', pause); process.removeListener('SIGTERM', pause);
}
