import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import crypto from 'node:crypto';
import { eligibleCompletionPlans, prepareTwistsCompletionDirectory, resumeTwistsCompletionDirectory, validateTwistsCompletion } from '../../cli/eval/plot-twists-completion.js';
import { WRITING_PROVIDER_FAILURE_GUARD, inspectRetainedWritingFailures, blockedWritingDispatchProviders } from '../../cli/eval/writing-provider-failures.js';

const repoRootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { values } = parseArgs({ options: {
  prepare: { type: 'boolean' }, resume: { type: 'boolean' }, status: { type: 'boolean' }, dispatch: { type: 'boolean' },
  'run-id': { type: 'string' }, mode: { type: 'string', default: 'generation' }, stage: { type: 'string', default: 'cleanup' },
  concurrency: { type: 'string', default: '4' }, 'max-rows': { type: 'string' }, 'retry-failed': { type: 'boolean' }, help: { type: 'boolean' }
} });
const usage = 'node benchmarks/storytelling-plot-twists/complete.mjs --prepare|--status|--resume --run-id ID [--dispatch --mode generation|judging --stage cleanup|codex|claude|all --concurrency 4 --max-rows N --retry-failed]';
if (values.help) console.log(usage);
else {
  if ([values.prepare, values.resume, values.status].filter(Boolean).length !== 1 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(values['run-id'] || '')) throw new Error(usage);
  if (values.dispatch && !values.resume) throw new Error('--dispatch requires --resume. Preparation and status never call providers.');
  const runId = values['run-id'];
  const report = message => process.stdout.write(`${JSON.stringify(message)}\n`);
  if (values.prepare) {
    const prepared = prepareTwistsCompletionDirectory({ repoRootDirectory, runId });
    report({ directory: prepared.directory, runId, rowCounts: prepared.run.summary.rowCounts, providerCalls: 0 });
  } else if (values.status || !values.dispatch) {
    const directory = path.join(repoRootDirectory, '.agents/vasir-evals/storytelling-plot-twists', runId);
    const run = JSON.parse(fs.readFileSync(path.join(directory, 'run.json'), 'utf8'));
    const snapshot = JSON.parse(fs.readFileSync(path.join(directory, 'skill-snapshot.json'), 'utf8'));
    validateTwistsCompletion({ run, snapshot });
    report({ runId, runStatus: run.runStatus, summary: run.summary, pendingByStage: Object.fromEntries(['cleanup', 'codex', 'claude', 'all'].map(stage => [stage, eligibleCompletionPlans(run, { stage, retryFailed: values['retry-failed'] }).length])), providerCalls: 0 });
  } else {
    let pauseRequested = false;
    const directory = path.join(repoRootDirectory, '.agents/vasir-evals/storytelling-plot-twists', runId);
    const guard = { version: WRITING_PROVIDER_FAILURE_GUARD, startedAt: new Date().toISOString(), mode: values.mode, stage: values.stage,
      sources: ['benchmarks/storytelling-plot-twists/complete.mjs', 'cli/eval/writing-provider-failures.js'].map(file => ({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(repoRootDirectory, file))).digest('hex') })), failure: null };
    let lastObserved = null;
    const quotaPaused = () => {
      const file = path.join(directory, 'run.json'), stat = fs.statSync(file), identity = `${stat.mtimeMs}:${stat.size}`;
      if (identity === lastObserved) return Boolean(guard.failure);
      lastObserved = identity;
      const run = JSON.parse(fs.readFileSync(file, 'utf8'));
      const failures = inspectRetainedWritingFailures({ run, directory });
      if (values['retry-failed'] && failures.some(item => item.kind === 'policy')) throw new Error('Generic retries are forbidden when retained provider policy refusals exist. Use an explicitly scoped operational continuation.');
      const blocked = blockedWritingDispatchProviders({ failures, stage: values.stage, mode: values.mode, judgeConfigurations: run.judging.judges.map(judge => judge.configuration) });
      if (blocked.length) {
        guard.failure = { observedAt: new Date().toISOString(), providers: blocked, failures: failures.filter(item => item.kind === 'quota' && blocked.includes(item.provider)) };
        report({ event: 'retained-provider-quota-stop', providers: blocked, message: 'No further provider calls. Restore capacity and provide a separately verified continuation; no account fallback.' });
      }
      return Boolean(guard.failure);
    };
    const guardDirectory = path.join(directory, 'operational-guards');
    fs.mkdirSync(guardDirectory, { recursive: true });
    const guardPath = path.join(guardDirectory, `${crypto.randomUUID()}.json`);
    const pause = signal => { pauseRequested = true; report({ event: 'pause-requested', signal, message: 'No more dispatches; waiting for current requests and durable checkpoints.' }); };
    process.on('SIGINT', pause); process.on('SIGTERM', pause);
    try {
      if (quotaPaused()) throw new Error('Dispatch blocked by hash-verified retained provider quota evidence. No provider call was made.');
      report(await resumeTwistsCompletionDirectory({ repoRootDirectory, runId, dispatch: true, mode: values.mode, stage: values.stage,
        concurrency: Number(values.concurrency), maxRows: values['max-rows'] === undefined ? null : Number(values['max-rows']),
        retryFailed: Boolean(values['retry-failed']), shouldPause: () => {
          if (pauseRequested) return true;
          try { return quotaPaused(); }
          catch (error) { pauseRequested = true; guard.failure = { kind: 'evidence-integrity', message: error.message }; report({ event: 'evidence-integrity-pause', message: 'Stopping new dispatches; active calls will drain.' }); return true; }
        }, onProgress: report }));
    } finally { fs.writeFileSync(guardPath, JSON.stringify({ ...guard, finishedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' }); process.removeListener('SIGINT', pause); process.removeListener('SIGTERM', pause); }
  }
}
