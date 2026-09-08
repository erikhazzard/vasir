import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { eligibleCompletionPlans, resumeTwistsCompletionDirectory, validateTwistsCompletion } from './plot-twists-completion.js';
import { inspectRetainedWritingFailures } from './writing-provider-failures.js';

// Operational scheduling only. The completion manifest, runtime and scoring
// modules stay byte-for-byte frozen and still validate every normal checkpoint.
export const TWISTS_OPERATIONAL_RECOVERY = 'plot-twists-verified-capacity-recovery-v1';
export const TWISTS_OPERATIONAL_MAX_CONCURRENCY = 16;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const retainedFailureIdentity = failure => JSON.stringify([
  failure.provider, failure.configurationId, failure.rowKey ?? null,
  failure.reviewerId ?? null, failure.batchId ?? null,
  failure.source.path, failure.source.sha256, failure.source.bytes
]);

export function codexCapacityProofFromReceipt(receipt, authenticationContextDirectory) {
  assert.equal(receipt.kind, 'sanitized-read-only-capacity-receipt');
  assert.equal(receipt.authenticationContextDirectory, authenticationContextDirectory,
    'The process must use the same authentication context that was checked.');
  assert.ok(authenticationContextDirectory, 'The authentication context must be explicit.');
  assert.equal(receipt.account.type, 'chatgpt');
  assert.equal(receipt.rateLimits.limitId, 'codex');
  assert.equal(receipt.rateLimits.spendControlReached, false);
  assert.equal(receipt.rateLimits.rateLimitReachedType, null);
  assert.equal(receipt.rateLimits.credits.hasCredits, false);
  assert.equal(receipt.rateLimits.credits.unlimited, false);
  assert.equal(Number(receipt.rateLimits.credits.balance), 0);
  assert.ok(Number.isFinite(receipt.rateLimits.primary?.usedPercent)
    && receipt.rateLimits.primary.usedPercent < 100);
  if (receipt.rateLimits.secondary) assert.ok(receipt.rateLimits.secondary.usedPercent < 100);
  return { provider: 'codex', sameAccountVerified: true, capacityAvailable: true,
    accountSwitchAllowed: false, creditConsumptionAllowed: false, modelSubstitutionAllowed: false,
    verifiedAt: receipt.checkedAt, source: receipt.source };
}

export function validateCodexCapacityProof(proof, now = Date.now()) {
  assert.equal(proof.provider, 'codex', 'This continuation is limited to Codex.');
  assert.equal(proof.sameAccountVerified, true, 'Same-account capacity must be verified.');
  assert.equal(proof.capacityAvailable, true, 'Capacity must be available.');
  assert.equal(proof.accountSwitchAllowed, false, 'Account switching is forbidden.');
  assert.equal(proof.creditConsumptionAllowed, false, 'Credit consumption is forbidden.');
  assert.equal(proof.modelSubstitutionAllowed, false, 'Model substitution is forbidden.');
  const verified = Date.parse(proof.verifiedAt);
  assert.ok(Number.isFinite(verified) && verified <= now && now - verified <= 60 * 60 * 1000,
    'A capacity verification no more than one hour old is required.');
  assert.ok(typeof proof.source === 'string' && proof.source.trim(), 'Capacity evidence source is required.');
  return verified;
}

export function selectCodexOperationalRecovery({ run, failures, proof, now, mode = 'generation' }) {
  assert.ok(['generation', 'judging'].includes(mode));
  const verified = validateCodexCapacityProof(proof, now);
  const quotas = failures.filter(failure => failure.provider === 'codex' && failure.kind === 'quota');
  const byRow = new Map(quotas.filter(failure => failure.rowKey).map(failure => [failure.rowKey, failure]));
  for (const rowKey of byRow.keys()) assert.ok(Date.parse(run.rows.find(row => row.rowKey === rowKey)?.attempts.at(-1)?.completedAt) < verified,
    'A quota failure after the capacity check requires new capacity evidence.');
  // Judging valid pairs never asks for permission to retry unrelated creator
  // failures. Its unchanged full panel still requires capacity and quota guards.
  const selected = mode === 'generation' ? eligibleCompletionPlans(run, { stage: 'codex', retryFailed: true }) : [];
  for (const plan of selected) {
    const row = run.rows.find(candidate => candidate.rowKey === plan.rowKey);
    assert.equal(plan.configuration.provider, 'codex');
    assert.ok(!row.outputText?.trim(), 'Returned answers cannot be retried.');
    if (row.rowStatus === 'pending') continue;
    assert.equal(row.rowStatus, 'error', 'Only pending or verified quota failures may run.');
    assert.ok(byRow.has(row.rowKey), `Unapproved operational retry: ${row.rowKey}`);
    assert.ok(Date.parse(row.attempts.at(-1)?.completedAt) < verified,
      'A quota failure after the capacity check requires new capacity evidence.');
  }
  return { selected, quotas };
}

export function findNewCodexQuotaFailures(failures, acknowledged) {
  return failures.filter(failure => failure.provider === 'codex' && failure.kind === 'quota'
    && !acknowledged.has(retainedFailureIdentity(failure)));
}

export function validateRecoveryConcurrency(concurrency) {
  assert.ok(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= TWISTS_OPERATIONAL_MAX_CONCURRENCY,
    'Maximum allocated concurrency is sixteen.');
}

export async function resumeTwistsAfterVerifiedCodexCapacity({ repoRootDirectory, runId, proofPath,
  mode = 'generation', concurrency = 16, maxRows = null, report = () => {}, shouldPause = () => false }) {
  assert.ok(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId || ''), 'Invalid completion run ID.');
  assert.ok(['generation', 'judging'].includes(mode), 'Invalid continuation mode.');
  validateRecoveryConcurrency(concurrency);
  const directory = path.join(repoRootDirectory, '.agents/vasir-evals/storytelling-plot-twists', runId);
  const readRun = () => JSON.parse(fs.readFileSync(path.join(directory, 'run.json'), 'utf8'));
  const initialBytes = fs.readFileSync(path.join(directory, 'run.json'));
  const initial = JSON.parse(initialBytes);
  const snapshot = JSON.parse(fs.readFileSync(path.join(directory, 'skill-snapshot.json'), 'utf8'));
  validateTwistsCompletion({ run: initial, snapshot });
  const proofBytes = fs.readFileSync(proofPath);
  const receipt = JSON.parse(proofBytes);
  const proof = codexCapacityProofFromReceipt(receipt, process.env.CODEX_HOME);
  const failures = inspectRetainedWritingFailures({ run: initial, directory });
  const { selected, quotas } = selectCodexOperationalRecovery({ run: initial, failures, proof, mode });
  assert.ok(initial.judging.judges.every(judge => judge.configuration.provider === 'codex'),
    'The entire unchanged judge panel must have verified capacity.');
  for (const failure of quotas.filter(item => !item.rowKey)) {
    const attempt = initial.completion.judgeAttempts.findLast(item =>
      item.error?.context?.rawStreams?.stdout?.path === failure.source.path);
    const callFile = path.join(directory, path.dirname(failure.source.path), 'call.json');
    assert.ok(attempt && Date.parse(JSON.parse(fs.readFileSync(callFile)).startedAt) < Date.parse(proof.verifiedAt),
      'Judge quota evidence must predate the capacity check.');
  }
  const acknowledged = new Set(quotas.map(retainedFailureIdentity));
  const auditDirectory = path.join(directory, 'operational-recoveries');
  fs.mkdirSync(auditDirectory, { recursive: true, mode: 0o700 });
  const id = crypto.randomUUID();
  const prestatePath = path.join(auditDirectory, `${id}.before.run.json`);
  fs.writeFileSync(prestatePath, initialBytes, { flag: 'wx', mode: 0o600 });
  const sources = ['cli/eval/plot-twists-operational-recovery.js', 'cli/eval/writing-provider-failures.js', 'benchmarks/storytelling-plot-twists/continue-codex.mjs'].map(file => {
    const bytes = fs.readFileSync(path.join(repoRootDirectory, file));
    const retainedPath = path.join(auditDirectory, `${id}.${path.basename(file)}`);
    fs.writeFileSync(retainedPath, bytes, { flag: 'wx', mode: 0o600 });
    return { path: file, sha256: sha(bytes), retainedPath: path.relative(directory, retainedPath) };
  });
  const record = { version: TWISTS_OPERATIONAL_RECOVERY, id, runId, mode, concurrency, maxRows,
    pid: process.pid, startedAt: new Date().toISOString(), initialRunSha256: sha(initialBytes),
    initialRunPath: path.relative(directory, prestatePath), initialRunBytes: initialBytes.length,
    proof: { ...proof, path: path.resolve(proofPath), sha256: sha(proofBytes) },
    sources,
    acknowledgedHistoricalQuotas: quotas,
    selectedGenerationRowKeys: mode === 'generation' ? selected.slice(0, maxRows ?? Infinity).map(plan => plan.rowKey) : [],
    terminalPolicyFailures: failures.filter(failure => failure.kind === 'policy') };
  fs.writeFileSync(path.join(auditDirectory, `${id}.started.json`), JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  let stop = null;
  const paused = () => {
    if (stop || shouldPause()) return true;
    try {
      const current = readRun();
      const fresh = findNewCodexQuotaFailures(inspectRetainedWritingFailures({ run: current, directory }), acknowledged);
      const auth = current.executionHistory.filter(invocation => !initial.executionHistory.some(prior => prior.id === invocation.id))
        .flatMap(invocation => invocation.quotaStops).filter(item => item.reason === 'authentication-unavailable');
      if (fresh.length || auth.length) {
        stop = { kind: fresh.length ? 'new-provider-quota' : 'authentication-unavailable', failures: fresh, auth };
        report({ event: 'recovery-dispatch-stopped', ...stop });
      }
    } catch (error) {
      stop = { kind: 'evidence-integrity', message: error.message };
      report({ event: 'recovery-dispatch-stopped', ...stop });
    }
    return Boolean(stop);
  };
  report({ event: 'verified-capacity-continuation', id, pid: process.pid, mode,
    acknowledgedQuotaCount: quotas.length, selectedGenerationRows: record.selectedGenerationRowKeys.length,
    terminalPolicyFailureCount: record.terminalPolicyFailures.length, concurrency });
  let outcome;
  try {
    // The directory runner owns the lock, source pins, retained-stream checks,
    // attempt lineage and unchanged provider calls. No error row is rewritten.
    outcome = await resumeTwistsCompletionDirectory({ repoRootDirectory, runId, dispatch: true,
      mode, stage: 'codex', concurrency, maxRows, retryFailed: mode === 'generation',
      shouldPause: paused, onProgress: report });
    return outcome;
  } finally {
    fs.writeFileSync(path.join(auditDirectory, `${id}.finished.json`), JSON.stringify({
      id, finishedAt: new Date().toISOString(), stop, outcome: outcome ?? null,
      finalRunSha256: sha(fs.readFileSync(path.join(directory, 'run.json')))
    }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
}
