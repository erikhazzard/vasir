import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { continueCoreClaude } from './core-claude-recovery.mjs';
const { values } = parseArgs({ options: { dispatch: { type: 'boolean' }, authorization: { type: 'string' }, 'capacity-proof': { type: 'string' },
  'max-calls': { type: 'string', default: '20' }, concurrency: { type: 'string', default: '4' } } });
if (!values.dispatch || !values.authorization || !values['capacity-proof']) throw Error('Requires --dispatch --authorization FILE --capacity-proof FILE [--max-calls 20 --concurrency 4]');
const report = value => process.stdout.write(JSON.stringify(value) + '\n');
let paused = false;
const pause = signal => { paused = true; report({ event: 'pause-requested', signal, pid: process.pid }); };
process.on('SIGINT', pause); process.on('SIGTERM', pause);
try {
  report(await continueCoreClaude({ repoRootDirectory: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..'),
    dispatch: true, authorizationPath: values.authorization, capacityProofPath: values['capacity-proof'], maximumCalls: Number(values['max-calls']),
    concurrency: Number(values.concurrency), shouldPause: () => paused, report }));
} finally { process.removeListener('SIGINT', pause); process.removeListener('SIGTERM', pause); }
