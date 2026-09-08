import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { codexCapacityProofFromReceipt, validateCodexCapacityProof, selectCodexOperationalRecovery, findNewCodexQuotaFailures, retainedFailureIdentity, validateRecoveryConcurrency } from '../cli/eval/plot-twists-operational-recovery.js';
import { inspectRetainedWritingFailures } from '../cli/eval/writing-provider-failures.js';

const proof = { provider: 'codex', sameAccountVerified: true, capacityAvailable: true,
  accountSwitchAllowed: false, creditConsumptionAllowed: false, modelSubstitutionAllowed: false,
  verifiedAt: '2026-09-08T18:26:39Z', source: 'Test fixture only; never dispatch.' };
const now = Date.parse('2026-09-08T18:45:00Z');
test('dispatch concurrency stays within the coordinator allocation', () => {
  for (const concurrency of [1, 2, 8, 16]) validateRecoveryConcurrency(concurrency);
  for (const concurrency of [0, 17, 32, 1.5, NaN]) assert.throws(() => validateRecoveryConcurrency(concurrency));
});
test('captured capacity receipt must match the current authentication context and have no credits', () => {
  const receipt = { kind: 'sanitized-read-only-capacity-receipt', authenticationContextDirectory: '/test/account',
    account: { type: 'chatgpt' }, checkedAt: proof.verifiedAt, source: proof.source,
    rateLimits: { limitId: 'codex', spendControlReached: false, rateLimitReachedType: null,
      credits: { hasCredits: false, unlimited: false, balance: '0' }, primary: { usedPercent: 17 }, secondary: null } };
  assert.deepEqual(codexCapacityProofFromReceipt(receipt, '/test/account'), proof);
  assert.throws(() => codexCapacityProofFromReceipt(receipt, '/test/other-account'));
  receipt.rateLimits.credits.hasCredits = true;
  assert.throws(() => codexCapacityProofFromReceipt(receipt, '/test/account'));
});
test('capacity continuation requires recent same-account evidence and forbids credits or substitutions', () => {
  assert.equal(validateCodexCapacityProof(proof, now), Date.parse(proof.verifiedAt));
  for (const change of [{ sameAccountVerified: false }, { capacityAvailable: false }, { accountSwitchAllowed: true },
    { creditConsumptionAllowed: true }, { modelSubstitutionAllowed: true }, { provider: 'claude' },
    { verifiedAt: '2026-09-08T16:26:39Z' }, { verifiedAt: '2026-09-08T19:26:39Z' }]) {
    assert.throws(() => validateCodexCapacityProof({ ...proof, ...change }, now));
  }
});
test('a new quota stream is never excused by the old failure for the same row', () => {
  const old = { provider: 'codex', kind: 'quota', configurationId: 'codex:model@low', rowKey: 'row', source: { path: 'old', sha256: 'a', bytes: 10 } };
  const fresh = { ...old, source: { ...old.source, path: 'new', sha256: 'b' } };
  assert.deepEqual(findNewCodexQuotaFailures([old, fresh], new Set([retainedFailureIdentity(old)])), [fresh]);
});
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(repoRoot, '.agents/vasir-evals/storytelling-plot-twists/storytelling-plot-twists-v1-completion-2026-09-08');
const checkpointPath = path.join(repoRoot, '.agents/vasir-evals/storytelling-plot-twists/publication-snapshots/cc357218c44344dc9d7e981e46e5c99d9f8ef8f9a77ebff3fb7c410555d28d24/run.json');
test('pinned checkpoint retry selection excludes every non-quota error and never changes evidence', { skip: !fs.existsSync(checkpointPath) }, () => {
  const run = JSON.parse(fs.readFileSync(checkpointPath));
  const before = JSON.stringify(run);
  const failures = inspectRetainedWritingFailures({ run, directory });
  const { selected } = selectCodexOperationalRecovery({ run, failures, proof, now });
  assert.ok(selected.every(plan => plan.configuration.provider === 'codex'));
  assert.equal(JSON.stringify(run), before);
  const row = run.rows.find(candidate => selected.some(plan => plan.rowKey === candidate.rowKey) && candidate.rowStatus === 'error');
  if (row) {
    assert.throws(() => selectCodexOperationalRecovery({ run, failures: failures.filter(item => item.rowKey !== row.rowKey), proof, now }), /Unapproved operational retry/);
    row.attempts.at(-1).completedAt = '2026-09-08T18:30:00Z';
    assert.throws(() => selectCodexOperationalRecovery({ run, failures, proof, now }), /after the capacity check/);
  }
});
test('judging is independent of unrelated unapproved creator retries', { skip: !fs.existsSync(checkpointPath) }, () => {
  const run = JSON.parse(fs.readFileSync(checkpointPath));
  const failures = inspectRetainedWritingFailures({ run, directory });
  const row = run.rows.find(item => item.provider === 'codex' && item.rowStatus === 'pending');
  assert.ok(row);
  row.rowStatus = 'error'; row.error = { code: 'EVAL_AGENT_RUNTIME_FAILED', message: 'Synthetic operational test failure; no provider call.' };
  assert.throws(() => selectCodexOperationalRecovery({ run, failures, proof, now }), /Unapproved operational retry/);
  assert.equal(selectCodexOperationalRecovery({ run, failures, proof, now, mode: 'judging' }).selected.length, 0);
});
