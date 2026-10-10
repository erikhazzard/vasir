#!/usr/bin/env node
// Explicit fresh-session recovery for a stopped cohort's provider usage-limit failures.
// Never retries authored failures, changes a task, or resumes a partially written candidate.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFixture } from './fixture.mjs';
import { run } from './run.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (path, value) => { await mkdir(dirname(path), { recursive: true, mode: 0o700 }); await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: 'wx' }); };
const events = text => text.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });

async function recover(originalPlanPath) {
  originalPlanPath = resolve(originalPlanPath);
  const originalPlanBytes = await readFile(originalPlanPath), original = JSON.parse(originalPlanBytes);
  const originalRunPath = join(original.history, 'run.json'), originalRunBytes = await readFile(originalRunPath), previous = JSON.parse(originalRunBytes);
  assert.equal(previous.runId, original.runId);
  assert.equal(previous.rows.length, original.rows.length);
  assert.equal(sha256(await readFile(join(dirname(fileURLToPath(import.meta.url)), 'run.mjs'))), original.runnerSha256, 'Frozen runner changed');
  const failed = previous.rows.filter(row => row.status !== 'complete');
  assert.equal(failed.length, 3, 'This bounded recovery expects exactly the three interrupted seats');
  assert.deepEqual(failed.map(row => row.condition).sort(), ['none', 'previous', 'revised']);
  for (const row of failed) {
    assert.equal(row.configuration.id, 'codex:gpt-6-astra@ultra'); assert.equal(row.trial, 2);
    assert.equal(row.status, 'failed'); assert.equal(row.timedOut, false); assert.equal(row.outputLimitExceeded, false);
    assert.equal(row.submission.forbiddenChanges.length, 0);
    const stream = events(await readFile(join(row.history, 'stdout.jsonl'), 'utf8'));
    assert.match(stream.findLast(event => event.type === 'turn.failed')?.error?.message ?? '', /hit your usage limit/i, 'Recovery requires explicit provider usage-limit evidence');
  }
  const selectedIds = failed.map(row => row.rowId), fixture = await readJson(original.fixturePath);
  const recoveryId = `${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
  const history = join(original.history, 'recoveries', recoveryId), batchRoot = await realpath(await mkdtemp('/private/tmp/backend-testing-recovery-'));
  await mkdir(history, { recursive: true, mode: 0o700 });
  await cp(join(original.history, 'calibration-approved.json'), join(history, 'calibration-approved.json'));
  const rows = [];
  for (const originalRow of original.rows) {
    if (!selectedIds.includes(originalRow.rowId)) { rows.push(originalRow); continue; }
    const version = spawnSync(originalRow.command, ['--version'], { encoding: 'utf8' });
    assert.equal(version.status, 0); assert.equal(version.stdout.trim(), original.preflight.versions[originalRow.configuration.provider], 'Provider CLI changed since the interrupted cohort');
    const root = join(batchRoot, originalRow.rowId), row = { ...originalRow, root, home: join(root, 'home'), workspace: join(root, 'workspace'), history: join(history, 'rows', originalRow.rowId), sandboxPath: join(root, 'isolation.sb') };
    row.arguments = originalRow.arguments.map(value => value.replaceAll(originalRow.root, root));
    row.workspaceBefore = { ...originalRow.workspaceBefore, directory: row.workspace };
    for (const directory of [row.history, join(row.home, '.codex'), join(row.home, '.claude'), join(root, 'tmp')]) await mkdir(directory, { recursive: true, mode: 0o700 });
    await copyFixture({ fixture, destination: row.workspace });
    const prompt = await readFile(join(originalRow.history, 'prompt.txt')); assert.equal(sha256(prompt), originalRow.promptSha256);
    await writeFile(join(row.history, 'prompt.txt'), prompt, { mode: 0o600, flag: 'wx' });
    for (const name of ['mcp.json', 'claude-settings.json']) await cp(join(originalRow.root, name), join(root, name));
    await writeFile(row.sandboxPath, (await readFile(originalRow.sandboxPath, 'utf8')).replaceAll(originalRow.root, root), { mode: 0o600, flag: 'wx' });
    await writeJson(join(row.history, 'launch.json'), row); rows.push(row);
  }
  const recovery = {
    recoveryId, preparedAt: new Date().toISOString(), policy: 'Fresh sessions only for explicit provider usage-limit interruptions; original source, prompt, configuration and execution policy unchanged; no candidate reuse or feedback.',
    originalRunPath, originalRunSha256: sha256(originalRunBytes), originalPlanPath, originalPlanSha256: sha256(originalPlanBytes),
    recoveredRowIds: selectedIds, orchestratorSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
  };
  const plan = { ...original, history, batchRoot, rows, recovery }, planPath = join(history, 'plan.json');
  await writeJson(planPath, plan);
  process.stdout.write(`${JSON.stringify({ event: 'recovery-prepared', runId: plan.runId, planPath, recovery, selectedRows: selectedIds })}\n`);
  await run(planPath, selectedIds);
  const recoveredRun = await readJson(join(history, 'run.json'));
  const summarize = async (row, attempt) => {
    const resultPath = join(row.history, 'result.json');
    const usageLimited = row.status === 'failed' && events(await readFile(join(row.history, 'stdout.jsonl'), 'utf8')).some(event => /hit your usage limit/i.test(event.error?.message ?? event.message ?? ''));
    return { attempt, kind: attempt === 1 ? 'initial' : 'fresh-session-operational-recovery', status: row.status,
      cause: usageLimited ? 'provider-usage-limit' : null,
      elapsedMs: row.elapsedMs, usage: row.usage, costUsd: row.costUsd, resultPath, resultSha256: sha256(await readFile(resultPath)),
      sourceHash: original.basis.sourceHash, promptSha256: row.promptSha256, treatmentSha256: row.treatmentSha256, configurationId: row.configuration.id };
  };
  const combinedRows = [];
  for (const row of recoveredRun.rows) {
    const prior = previous.rows.find(candidate => candidate.rowId === row.rowId), attempts = [await summarize(prior, 1)];
    if (selectedIds.includes(row.rowId)) attempts.push(await summarize(row, 2));
    combinedRows.push({ ...row, attempts, resourcesSummary: { attemptCount: attempts.length,
      totalElapsedMs: attempts.reduce((sum, attempt) => sum + attempt.elapsedMs, 0), usageComplete: attempts.every(attempt => attempt.usage !== null),
      knownUsage: attempts.filter(attempt => attempt.usage !== null).map(attempt => ({ attempt: attempt.attempt, usage: attempt.usage })),
      missingUsageAttempts: attempts.filter(attempt => attempt.usage === null).map(attempt => attempt.attempt) } });
  }
  const aggregatePath = join(history, 'run-with-attempts.json');
  await writeJson(aggregatePath, { ...recoveredRun, recovery: { ...recovery, recoveryPlanPath: planPath }, rows: combinedRows });
  process.stdout.write(`${JSON.stringify({ event: 'recovery-recorded', aggregatePath, complete: combinedRows.filter(row => row.status === 'complete').length, incomplete: combinedRows.filter(row => row.status !== 'complete').map(row => row.rowId), automaticAdditionalRetries: 0 })}\n`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Usage: node benchmarks/backend-testing/recover.mjs <original-plan.json>');
  await recover(process.argv[2]);
}
