import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createBenchmarkHash as objectHash } from './benchmark-source.js';
import { eligibleCompletionPlans, resumeTwistsCompletionDirectory, createRetainedTwistsAgentRunner, validateTwistsCompletion } from './plot-twists-completion.js';
import { generateBenchmarkRows, createBenchmarkPairs, createBenchmarkSummary } from './run-benchmark-eval.js';
import { isStorytellingRequiredSkillReadReceiptCompatible } from './storytelling-agent-runtime.js';
import { identifyStorytellingJudgeQuotaExhaustion } from './run-storytelling-benchmark.js';
import { inspectRetainedWritingFailures } from './writing-provider-failures.js';
import { retainedFailureIdentity, validateRecoveryConcurrency } from './plot-twists-operational-recovery.js';

export const CLAUDE_RECOVERY_VERSION = 'plot-twists-claude-single-quota-recovery-v1';
export const CLAUDE_QUOTA_ROW = 'claude:claude-fable-5-1@high::scifi-outline::trial-3::skill:writing-storytelling';
export const CLAUDE_QUOTA_STREAM = { path: 'provider-streams/5234239e-9886-485f-b14b-49d8e7d77650/stdout.jsonl',
  sha256: 'd220eef1a1175d835f860e55934d633ec31c0ba59de78798ea16dbd8caad984c', bytes: 146278 };
const REQUIRED = ['SKILL.md', 'references/twists-and-revelations.md'];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const generationEvidence = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['score', 'scoreBasisHash'].includes(key)));

export function validateClaudeCapacityProof(proof, { now = Date.now(), environmentVariables = process.env } = {}) {
  assert.equal(proof.kind, 'sanitized-read-only-capacity-receipt');
  assert.equal(proof.accountContext, 'unchanged default Claude context; no CLAUDE_CONFIG_DIR override');
  assert.equal(environmentVariables.CLAUDE_CONFIG_DIR, undefined, 'Claude context overrides are forbidden.');
  assert.equal(environmentVariables.ANTHROPIC_API_KEY, undefined, 'Claude API-key overrides are forbidden.');
  assert.equal(environmentVariables.CLAUDE_CODE_OAUTH_TOKEN, undefined, 'Claude OAuth overrides are forbidden.');
  const checkedAt = Date.parse(proof.checkedAt ?? proof.checkedAtApproximate);
  assert.ok(Number.isFinite(checkedAt) && checkedAt <= now && now - checkedAt <= 3_600_000, 'Recent Claude capacity evidence is required.');
  for (const key of ['sessionUsedPercent', 'weekAllModelsUsedPercent', 'weekFableUsedPercent'])
    assert.ok(Number.isFinite(proof[key]) && proof[key] >= 0 && proof[key] < 100, `Claude capacity unavailable: ${key}`);
  assert.equal(proof.usageCreditsEnabled, false, 'The Claude /usage panel must confirm usage credits are off.');
  assert.equal(proof.resetCreditConsumptionAllowed, false, 'Reset credits are forbidden by continuation policy.');
  assert.ok(typeof proof.source === 'string' && proof.source.trim());
  return checkedAt;
}

export function selectClaudePendingPlans(run, failures, maxRows = null) {
  const selected = eligibleCompletionPlans(run, { stage: 'claude', retryFailed: false, maxRows });
  for (const plan of selected) {
    const row = run.rows.find(item => item.rowKey === plan.rowKey);
    assert.equal(row.rowStatus, 'pending');
    assert.equal(plan.configuration.provider, 'claude');
    assert.ok(!row.outputText?.trim());
    assert.ok(!failures.some(item => item.rowKey === row.rowKey), 'An untouched slot cannot have a retained terminal failure.');
  }
  return selected;
}

export function selectSingleClaudeQuotaPlan({ run, failures, verifiedAt }) {
  const row = run.rows.find(item => item.rowKey === CLAUDE_QUOTA_ROW);
  assert.equal(row?.rowStatus, 'error');
  assert.ok(!row.outputText?.trim(), 'Returned answers cannot be recovered.');
  const failure = failures.find(item => item.rowKey === CLAUDE_QUOTA_ROW);
  assert.equal(failure?.kind, 'quota', 'Only the explicitly pinned historical quota failure is recoverable.');
  assert.equal(failure.provider, 'claude');
  assert.deepEqual(failure.source, CLAUDE_QUOTA_STREAM, 'The original quota stream must match exactly; a new failure requires a new decision.');
  assert.ok(Date.parse(row.attempts.at(-1).completedAt) < verifiedAt);
  // This temporary view is used only by the original row planner. The canonical
  // row, its error, and its previous-generation hash remain unchanged.
  const view = { ...run, rows: run.rows.map(item => item === row ? { ...item, rowStatus: 'pending', error: null } : item) };
  const plan = eligibleCompletionPlans(view, { stage: 'claude', retryFailed: false }).find(item => item.rowKey === CLAUDE_QUOTA_ROW);
  assert.ok(plan, 'Unresolved dispatches cannot be recovered automatically.');
  return plan;
}

export function newClaudeQuotaFailures(failures, acknowledged) {
  return failures.filter(item => item.provider === 'claude' && item.kind === 'quota'
    && item.reason !== 'model-usage-limit-reached' && !acknowledged.has(retainedFailureIdentity(item)));
}

export function newClaudeInvocationStops(run, priorInvocationIds) {
  return run.executionHistory.filter(item => !priorInvocationIds.has(item.id)).flatMap(item => item.quotaStops);
}

export function claudeProviderWideStops(stops) {
  // The unchanged executor already opens the specific model circuit. Running
  // another pre-registered model's own slot is not a model substitution.
  return stops.filter(item => item.reason !== 'model-usage-limit-reached');
}

function summarize(run) {
  run.pairs = createBenchmarkPairs({ rows: run.rows, treatmentId: run.treatment.id });
  run.summary = createBenchmarkSummary({ rows: run.rows, pairs: run.pairs, configurations: run.configurations, treatmentId: run.treatment.id, judging: run.judging });
  Object.assign(run.summary, { originalFailedAttempts: 2, retainedGenerationAttemptCount: run.completion.generationAttempts.length,
    unresolvedDispatchCount: run.completion.generationDispatches.filter(item => !run.completion.generationAttempts.some(attempt => attempt.id === item.id)).length });
  run.summary.rowCounts.pending = run.rows.filter(row => ['pending', 'running'].includes(row.rowStatus)).length;
  run.runStatus = run.rows.every(row => row.rowStatus === 'complete' && row.score) && run.judging.status === 'complete' ? 'complete' : 'incomplete';
}

// The sole execution extension is this one historical quota row. Untouched
// Claude rows are always executed by the unchanged frozen directory runner.
export async function executeSingleClaudeQuotaRecovery({ run, snapshot, plan, dispatch = false,
  agentRunnerImplementation, onCheckpoint = () => {}, shouldPause = () => false, now = () => new Date().toISOString() }) {
  assert.equal(dispatch, true);
  assert.equal(plan.rowKey, CLAUDE_QUOTA_ROW);
  validateTwistsCompletion({ run, snapshot });
  const index = run.rows.findIndex(row => row.rowKey === plan.rowKey), prior = run.rows[index];
  assert.equal(prior.rowStatus, 'error'); assert.ok(!prior.outputText?.trim());
  assert.deepEqual(prior.error?.context?.rawStreams?.stdout, CLAUDE_QUOTA_STREAM);
  assert.equal(plan.trialNumber, prior.trialNumber, 'The frozen trial number cannot change.');
  assert.equal(plan.promptText, prior.promptText); assert.deepEqual(plan.exactMessages, prior.exactMessages);
  assert.equal(plan.basisHash, prior.basisHash);
  assert.deepEqual(plan.configuration, run.configurations.find(item => item.id === prior.configurationId));
  assert.deepEqual(plan.condition, run.conditions.find(item => item.id === prior.conditionId));
  assert.deepEqual(plan.caseDefinition, run.benchmark.definition.cases.find(item => item.id === prior.caseId));
  const invocation = { id: crypto.randomUUID(), controllerVersion: CLAUDE_RECOVERY_VERSION, startedAt: now(), mode: 'generation', stage: 'claude',
    concurrency: 1, retryFailed: false, explicitOperationalRecovery: CLAUDE_QUOTA_ROW,
    selectedGenerationRowCount: 1, providerCalls: 0, quotaStops: [] };
  run.executionHistory.push(invocation);
  const save = async event => { run.lastCheckpointAt = now(); summarize(run); await onCheckpoint({ run, event }); };
  await save('started');
  if (!shouldPause()) {
    const id = crypto.randomUUID(), startedAt = now(), previousGenerationSha256 = objectHash(generationEvidence(prior));
    const record = { id, invocationId: invocation.id, rowKey: plan.rowKey, startedAt, previousGenerationSha256 };
    run.completion.generationDispatches.push({ ...record, sha256: objectHash(record) });
    await save('generation-dispatched');
    await generateBenchmarkRows({ rowPlans: [plan], concurrency: 1,
      agentRunnerImplementation: async args => {
        invocation.providerCalls++;
        try {
          return await agentRunnerImplementation({ ...args,
            privateAudit: { invocationId: invocation.id, generationAttemptId: id, rowKey: plan.rowKey },
            skillSnapshot: snapshot, requiredSkillFiles: REQUIRED, requiredSkillReadTransport: 'read-tool' });
        } catch (error) {
          const quota = identifyStorytellingJudgeQuotaExhaustion({ error, configuration: args.configuration });
          if (quota || error.code === 'AUTH_UNAVAILABLE') invocation.quotaStops.push({ key: 'claude', configurationId: args.configuration.id,
            ...(quota ?? { reason: 'authentication-unavailable' }) });
          throw error;
        }
      }, onRowComplete: async row => {
        row.outputHash = typeof row.outputText === 'string' ? sha(row.outputText) : null;
        if (row.rowStatus === 'complete' && !row.outputText?.trim()) {
          row.rowStatus = 'error'; row.error = { code: 'EVAL_STORYTELLING_EMPTY_OUTPUT', message: 'No final answer was returned.' };
        }
        if (row.rowStatus === 'complete' && !isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles: REQUIRED, receipt: row.runtimeReceipt?.requiredSkillReads })) {
          row.rowStatus = 'error'; row.error = { code: 'EVAL_STORYTELLING_REQUIRED_READ_INCOMPLETE', message: 'Required frozen reads were incomplete; returned answer retained and excluded. No automatic replacement is permitted.' };
        }
        const attempt = { number: prior.attempts.length + 1, status: row.rowStatus, startedAt, completedAt: now(), error: row.error, usage: row.usage, durationMs: row.durationMs, costUsd: row.costUsd };
        row.attempts = [...structuredClone(prior.attempts), attempt];
        const generation = { id, invocationId: invocation.id, rowKey: row.rowKey, previousGenerationSha256, generation: structuredClone(generationEvidence(row)) };
        run.completion.generationAttempts.push({ ...generation, sha256: objectHash(generation) });
        run.rows[index] = row;
        await save('generation-complete');
      } });
  }
  invocation.completedAt = now(); invocation.paused = shouldPause();
  validateTwistsCompletion({ run, snapshot });
  await save('finished');
  return { runId: run.runId, runStatus: run.runStatus, summary: run.summary, invocation };
}

function verifyFiles(run, directory, repoRootDirectory) {
  for (const pin of run.completion.manifest.runtimeSources) {
    assert.equal(sha(fs.readFileSync(path.join(repoRootDirectory, pin.path))), pin.sha256, 'Frozen runtime source drift.');
    assert.equal(sha(fs.readFileSync(path.join(directory, 'frozen-runtime', path.basename(pin.path)))), pin.sha256);
  }
  for (const attempt of [...run.completion.generationAttempts, ...run.completion.judgeAttempts]) {
    const evidence = attempt.generation ?? attempt.result ?? attempt;
    const receipt = evidence.runtimeReceipt?.rawStreams ?? evidence.error?.context?.rawStreams;
    if (receipt) for (const pin of [receipt.stdout, receipt.stderr]) {
      assert.match(pin.path, /^provider-streams\/[a-f0-9-]+\/(stdout\.jsonl|stderr\.txt)$/);
      const file = path.join(directory, pin.path);
      assert.ok(fs.realpathSync(file).startsWith(fs.realpathSync(directory) + path.sep));
      const bytes = fs.readFileSync(file); assert.equal(bytes.length, pin.bytes); assert.equal(sha(bytes), pin.sha256);
    }
  }
}

export async function resumeTwistsAfterVerifiedClaudeCapacity({ repoRootDirectory, runId, proofPath,
  mode = 'pending', concurrency = 2, maxRows = null, dispatch = false, report = () => {}, shouldPause = () => false }) {
  assert.equal(dispatch, true); assert.ok(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId || ''));
  assert.ok(['pending', 'quota-recovery'].includes(mode)); validateRecoveryConcurrency(concurrency);
  assert.ok(maxRows === null || Number.isInteger(maxRows) && maxRows > 0);
  assert.ok(mode !== 'quota-recovery' || concurrency === 1, 'Single-row recovery uses concurrency one.');
  const directory = path.join(repoRootDirectory, '.agents/vasir-evals/storytelling-plot-twists', runId);
  const readRun = () => JSON.parse(fs.readFileSync(path.join(directory, 'run.json')));
  const initialBytes = fs.readFileSync(path.join(directory, 'run.json')), initial = JSON.parse(initialBytes);
  const priorInvocationIds = new Set(initial.executionHistory.map(item => item.id));
  const snapshot = JSON.parse(fs.readFileSync(path.join(directory, 'skill-snapshot.json')));
  validateTwistsCompletion({ run: initial, snapshot }); verifyFiles(initial, directory, repoRootDirectory);
  const proofBytes = fs.readFileSync(proofPath), proof = JSON.parse(proofBytes), verifiedAt = validateClaudeCapacityProof(proof);
  const failures = inspectRetainedWritingFailures({ run: initial, directory });
  const selected = mode === 'pending' ? selectClaudePendingPlans(initial, failures, maxRows)
    : [selectSingleClaudeQuotaPlan({ run: initial, failures, verifiedAt })];
  const oldQuotas = failures.filter(item => item.provider === 'claude' && item.kind === 'quota');
  // Even pending-only continuation acknowledges only this explicitly inspected
  // historical quota. Any newer/different quota requires a separate decision.
  for (const failure of oldQuotas) {
    assert.equal(failure.rowKey, CLAUDE_QUOTA_ROW); assert.deepEqual(failure.source, CLAUDE_QUOTA_STREAM);
  }
  const acknowledged = new Set(oldQuotas.map(retainedFailureIdentity));
  const id = crypto.randomUUID(), auditDirectory = path.join(directory, 'operational-recoveries');
  fs.mkdirSync(auditDirectory, { recursive: true, mode: 0o700 });
  const before = path.join(auditDirectory, `${id}.before.run.json`);
  fs.writeFileSync(before, initialBytes, { flag: 'wx', mode: 0o600 });
  const sources = ['cli/eval/plot-twists-claude-recovery.js', 'cli/eval/plot-twists-operational-recovery.js', 'cli/eval/writing-provider-failures.js', 'benchmarks/storytelling-plot-twists/continue-claude.mjs'].map(file => {
    const bytes = fs.readFileSync(path.join(repoRootDirectory, file)), retained = path.join(auditDirectory, `${id}.${path.basename(file)}`);
    fs.writeFileSync(retained, bytes, { flag: 'wx', mode: 0o600 });
    return { path: file, sha256: sha(bytes), retainedPath: path.relative(directory, retained) };
  });
  const record = { id, version: CLAUDE_RECOVERY_VERSION, mode, pid: process.pid, startedAt: new Date().toISOString(), concurrency, maxRows,
    executionController: mode === 'pending' ? 'unchanged-frozen-plot-twists-completion' : CLAUDE_RECOVERY_VERSION,
    runId, initialRunSha256: sha(initialBytes), initialRunPath: path.relative(directory, before), sources,
    proof: { path: path.resolve(proofPath), sha256: sha(proofBytes), ...proof },
    selectedRowKeys: selected.map(plan => plan.rowKey), acknowledgedHistoricalQuotas: oldQuotas,
    terminalPolicyFailures: failures.filter(item => item.kind === 'policy'), judgesAuthorized: false };
  fs.writeFileSync(path.join(auditDirectory, `${id}.started.json`), JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  let stop = null, outcome;
  const paused = () => {
    if (stop || shouldPause()) return true;
    try {
      const current = readRun(), fresh = newClaudeQuotaFailures(inspectRetainedWritingFailures({ run: current, directory }), acknowledged);
      const terminalStops = claudeProviderWideStops(newClaudeInvocationStops(current, priorInvocationIds));
      const quotaStops = terminalStops.filter(item => item.reason !== 'authentication-unavailable');
      const auth = terminalStops.filter(item => item.reason === 'authentication-unavailable');
      if (fresh.length || quotaStops.length || auth.length) {
        stop = { kind: fresh.length || quotaStops.length ? 'new-provider-quota' : 'authentication-unavailable', failures: fresh, quotaStops, auth };
        report({ event: 'recovery-dispatch-stopped', ...stop });
      }
    } catch (error) { stop = { kind: 'evidence-integrity', message: error.message }; report({ event: 'recovery-dispatch-stopped', ...stop }); }
    return Boolean(stop);
  };
  report({ event: 'verified-claude-capacity-continuation', id, pid: process.pid, mode, selectedRows: selected.length, concurrency });
  try {
    if (mode === 'pending') outcome = await resumeTwistsCompletionDirectory({ repoRootDirectory, runId, dispatch: true,
      mode: 'generation', stage: 'claude', concurrency, maxRows, retryFailed: false, shouldPause: paused, onProgress: report });
    else {
      const lock = path.join(directory, 'completion.lock');
      fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), controllerVersion: CLAUDE_RECOVERY_VERSION }), { flag: 'wx' });
      try {
        assert.equal(sha(fs.readFileSync(path.join(directory, 'run.json'))), sha(initialBytes), 'Checkpoint changed before recovery acquired the lock.');
        assert.equal(objectHash(initial.completion.manifest), objectHash(JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json')))));
        outcome = await executeSingleClaudeQuotaRecovery({ run: initial, snapshot, plan: selected[0], dispatch: true,
          agentRunnerImplementation: createRetainedTwistsAgentRunner({ directory }), shouldPause: paused,
          onCheckpoint: ({ run, event }) => {
            const file = path.join(directory, 'run.json'), temporary = `${file}.${process.pid}.tmp`;
            fs.writeFileSync(temporary, JSON.stringify(run, null, 2) + '\n', { mode: 0o600 }); fs.renameSync(temporary, file);
            report({ event, at: run.lastCheckpointAt, rowCounts: run.summary.rowCounts, unresolvedDispatches: run.summary.unresolvedDispatchCount });
          } });
      } finally { fs.unlinkSync(lock); }
    }
    return outcome;
  } finally {
    fs.writeFileSync(path.join(auditDirectory, `${id}.finished.json`), JSON.stringify({ id, stop, finishedAt: new Date().toISOString(),
      finalRunSha256: sha(fs.readFileSync(path.join(directory, 'run.json'))), outcome: outcome ?? null }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
}
