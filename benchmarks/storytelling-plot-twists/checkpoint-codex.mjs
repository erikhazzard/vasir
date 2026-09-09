import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { validateTwistsCompletion } from '../../cli/eval/plot-twists-completion.js';
import { inspectRetainedWritingFailures } from '../../cli/eval/writing-provider-failures.js';
import { projectWritingRun } from '../../cli/eval/writing-publication.js';

export function projectTwistsCheckpointEvidence({ run, snapshot, sourceSha256 }) {
  const { projection } = projectWritingRun({ run, snapshot, sourceSha256 });
  const fullSettings = projection.settings.filter(setting => ['baseline', 'skill'].every(condition => {
    const entry = projection.entries.find(item => item.settingId === setting.id && item.condition === condition);
    return Number.isFinite(entry?.exactScore);
  })).map(setting => {
    const entries = projection.entries.filter(item => item.settingId === setting.id);
    return { configurationId: setting.configurationId, provider: setting.provider,
      scores: Object.fromEntries(entries.map(entry => [entry.condition, entry.score])),
      exactScores: Object.fromEntries(entries.map(entry => [entry.condition, entry.exactScore])),
      exactDelta: entries.find(entry => entry.condition === 'skill').exactScore - entries.find(entry => entry.condition === 'baseline').exactScore };
  });
  return { projection, fullSettings };
}

// Local evidence retention only: no provider calls, source selection or publication.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
const { values } = parseArgs({ options: { 'run-id': { type: 'string' }, retain: { type: 'boolean' } } });
assert.match(values['run-id'] || '', /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const benchmarkDirectory = path.join(repo, '.agents/vasir-evals/storytelling-plot-twists');
const directory = path.join(benchmarkDirectory, values['run-id']);
assert.ok(!fs.existsSync(path.join(directory, 'completion.lock')), 'A running stage must finish before checkpoint retention.');
const initialSha = 'cc357218c44344dc9d7e981e46e5c99d9f8ef8f9a77ebff3fb7c410555d28d24';
const initialPath = path.join(benchmarkDirectory, 'publication-snapshots', initialSha, 'run.json');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const initialBytes = fs.readFileSync(initialPath);
assert.equal(hash(initialBytes), initialSha);
const initial = JSON.parse(initialBytes);
const runBytes = fs.readFileSync(path.join(directory, 'run.json'));
const run = JSON.parse(runBytes);
const snapshotBytes = fs.readFileSync(path.join(directory, 'skill-snapshot.json'));
const manifestBytes = fs.readFileSync(path.join(directory, 'manifest.json'));
assert.equal(run.runId, values['run-id']);
assert.deepEqual(run.completion.manifest, JSON.parse(manifestBytes));
validateTwistsCompletion({ run, snapshot: JSON.parse(snapshotBytes) });
assert.equal(run.summary.unresolvedDispatchCount, 0);
assert.ok(run.executionHistory.every(invocation => invocation.completedAt));
const codexRows = run.rows.filter(row => row.provider === 'codex');
assert.equal(codexRows.length, 460);
const { projection, fullSettings } = projectTwistsCheckpointEvidence({ run, snapshot: JSON.parse(snapshotBytes), sourceSha256: hash(runBytes) });
const codexCells = projection.caseResults.filter(cell => cell.configurationId.startsWith('codex:'));
assert.equal(codexCells.length, 460);
assert.ok(codexRows.every(row => row.rowStatus === 'complete') && codexCells.every(cell =>
  cell.status === 'scored' && Number.isFinite(cell.exactScore)
  && cell.coverage.completedJudgments === 2 && cell.coverage.expectedJudgments === 2),
  'All 460 original Codex slots must have valid answers and complete panel scores.');
const generation = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['score', 'scoreBasisHash'].includes(key)));
const priorValid = initial.rows.filter(row => row.rowStatus === 'complete');
for (const row of priorValid) assert.deepEqual(generation(run.rows.find(item => item.rowKey === row.rowKey)), generation(row));
for (const key of ['generationAttempts', 'generationDispatches', 'judgeAttempts']) {
  assert.deepEqual(run.completion[key].slice(0, initial.completion[key].length), initial.completion[key]);
}
const currentBatches = run.judging.judges.flatMap(judge => judge.batches);
const priorBatches = initial.judging.judges.flatMap(judge => judge.batches).filter(batch => batch.status === 'complete');
for (const batch of priorBatches) assert.deepEqual(currentBatches.find(item =>
  item.configuration.id === batch.configuration.id && item.promptHash === batch.promptHash), batch);
let retainedStreams = 0;
const receipts = [...run.completion.generationAttempts.map(attempt => attempt.generation.runtimeReceipt?.rawStreams || attempt.generation.error?.context?.rawStreams),
  ...run.completion.judgeAttempts.map(attempt => attempt.result?.runtimeReceipt?.rawStreams || attempt.error?.context?.rawStreams)];
for (const receipt of receipts.filter(Boolean)) for (const stream of [receipt.stdout, receipt.stderr]) {
  assert.match(stream.path, /^provider-streams\/[a-f0-9-]+\/(stdout\.jsonl|stderr\.txt)$/);
  const bytes = fs.readFileSync(path.join(directory, stream.path));
  assert.equal(bytes.length, stream.bytes); assert.equal(hash(bytes), stream.sha256); retainedStreams++;
}
for (const source of run.completion.manifest.runtimeSources) {
  assert.equal(hash(fs.readFileSync(path.join(repo, source.path))), source.sha256);
  assert.equal(hash(fs.readFileSync(path.join(directory, 'frozen-runtime', path.basename(source.path)))), source.sha256);
}
assert.equal(fullSettings.filter(item => item.provider === 'codex').length, 23);
const sourceBytes = fs.readFileSync(fileURLToPath(import.meta.url));
const audit = { kind: 'plot-twists-complete-codex-checkpoint', version: 1, verifiedAt: new Date().toISOString(),
  runId: run.runId, runSha256: hash(runBytes), runBytes: runBytes.length,
  initialSource: { path: path.relative(repo, initialPath), sha256: initialSha },
  preservedInitialValidAnswers: priorValid.length, preservedInitialReviews: priorBatches.length,
  preservedInitialAttemptPrefixes: true, retainedStreamsVerified: retainedStreams,
  retainedProviderStreamDirectory: path.relative(repo, directory), rawProviderStreamsCopied: false,
  frozenRuntimeSourcesVerified: run.completion.manifest.runtimeSources,
  skillSnapshotSha256: hash(snapshotBytes), manifestSha256: hash(manifestBytes), auditScriptSha256: hash(sourceBytes),
  rowCounts: run.summary.rowCounts, publicationCoverage: projection.coverage, fullSettings,
  scoreAuthority: 'projectWritingRun: exact weighted original panel ratings, not rounded harness summaries',
  remainingFailures: inspectRetainedWritingFailures({ run, directory }),
  providerCalls: 0, publicationChanges: false };
if (values.retain) {
  assert.ok(!fs.existsSync(path.join(directory, 'completion.lock')));
  assert.deepEqual(fs.readFileSync(path.join(directory, 'run.json')), runBytes, 'Run changed while auditing.');
  const parent = path.join(directory, 'operational-checkpoints');
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const destination = path.join(parent, audit.runSha256);
  fs.mkdirSync(destination, { mode: 0o700 }); // Fail rather than overwrite an existing checkpoint.
  for (const [name, bytes] of [['run.json', runBytes], ['skill-snapshot.json', snapshotBytes], ['manifest.json', manifestBytes],
    ['checkpoint-codex.mjs', sourceBytes], ['audit.json', Buffer.from(JSON.stringify(audit, null, 2) + '\n')]]) {
    fs.writeFileSync(path.join(destination, name), bytes, { flag: 'wx', mode: 0o444 });
  }
  fs.chmodSync(destination, 0o555);
  audit.retainedDirectory = path.relative(repo, destination);
}
process.stdout.write(JSON.stringify(audit, null, 2) + '\n');
}
