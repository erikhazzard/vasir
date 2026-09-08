import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { resumeTwistsAfterVerifiedClaudeCapacity } from '../../cli/eval/plot-twists-claude-recovery.js';
const { values } = parseArgs({ options: { dispatch: { type: 'boolean' }, 'run-id': { type: 'string' }, 'capacity-proof': { type: 'string' },
  mode: { type: 'string', default: 'pending' }, concurrency: { type: 'string', default: '2' }, 'max-rows': { type: 'string' } } });
if (!values.dispatch || !values['capacity-proof']) throw new Error('Requires --dispatch --run-id ID --capacity-proof FILE --mode pending|quota-recovery [--concurrency N --max-rows N]');
const report = value => process.stdout.write(JSON.stringify(value) + '\n');
let pauseRequested = false;
const pause = signal => { pauseRequested = true; report({ event: 'pause-requested', signal, pid: process.pid }); };
process.on('SIGINT', pause); process.on('SIGTERM', pause);
try {
  report(await resumeTwistsAfterVerifiedClaudeCapacity({ repoRootDirectory: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
    runId: values['run-id'], proofPath: values['capacity-proof'], dispatch: true, mode: values.mode,
    concurrency: Number(values.concurrency), maxRows: values['max-rows'] === undefined ? null : Number(values['max-rows']), report, shouldPause: () => pauseRequested }));
} finally { process.removeListener('SIGINT', pause); process.removeListener('SIGTERM', pause); }
