import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyRecoveryConcurrency, verifyRecoverySessionIdentity } from '../docs/work/vasir-benchmarking/dungeon-master-adventure-outline/model-coverage-extension/recover-capacity-20260908.mjs';

const attempt = (start, end) => ({ startedAt: new Date(start).toISOString(), completedAt: new Date(end).toISOString() });
const receipt = (provider, fields) => ({ requestedConfiguration: { provider }, ...fields });

test('DM operational audit uses provider-specific identities without cross-provider collisions', () => {
  const seen = new Set();
  assert.equal(verifyRecoverySessionIdentity(receipt('codex', { threadId: 'same-id' }), 'codex', seen), 'codex:same-id');
  assert.equal(verifyRecoverySessionIdentity(receipt('claude', { sessionId: 'same-id' }), 'claude', seen), 'claude:same-id');
  assert.equal(seen.size, 2);
});

test('DM operational audit rejects reused sessions across prior and appended successful evidence', () => {
  for (const [provider, field] of [['codex', 'threadId'], ['claude', 'sessionId']]) {
    const seen = new Set();
    verifyRecoverySessionIdentity(receipt(provider, { [field]: 'prior-session' }), provider, seen);
    assert.throws(() => verifyRecoverySessionIdentity(receipt(provider, { [field]: 'prior-session' }), provider, seen), /session was reused/);
    verifyRecoverySessionIdentity(receipt(provider, { [field]: 'new-session' }), provider, seen);
    assert.equal(seen.size, 2);
  }
});

test('DM operational audit rejects missing identities and never substitutes the other provider field', () => {
  for (const [provider, field, other] of [['codex', 'threadId', 'sessionId'], ['claude', 'sessionId', 'threadId']]) {
    for (const id of [undefined, null, '', '  ', 123]) {
      const seen = new Set();
      assert.throws(() => verifyRecoverySessionIdentity(receipt(provider, { [field]: id, [other]: 'wrong-field' }), provider, seen), /Missing/);
      assert.equal(seen.size, 0);
    }
  }
});

test('DM operational audit rejects provider mismatch and unsupported providers', () => {
  assert.throws(() => verifyRecoverySessionIdentity(receipt('claude', { threadId: 'id' }), 'codex', new Set()), /provider mismatch/);
  assert.throws(() => verifyRecoverySessionIdentity(receipt('codex', { sessionId: 'id' }), 'claude', new Set()), /provider mismatch/);
  assert.throws(() => verifyRecoverySessionIdentity(undefined, 'claude', new Set()), /provider mismatch/);
  assert.throws(() => verifyRecoverySessionIdentity(receipt('other', { sessionId: 'id' }), 'other', new Set()), /Unsupported provider/);
});

test('DM operational audit accepts the newly allocated sixteen calls and rejects seventeen', () => {
  const sixteen = Array.from({ length: 16 }, () => attempt(100, 300));
  assert.equal(verifyRecoveryConcurrency(sixteen), 16);
  assert.throws(() => verifyRecoveryConcurrency([...sixteen, attempt(200, 400)]), /exceeds allocation 16/);
  assert.throws(() => verifyRecoveryConcurrency(sixteen, 17), /cannot exceed sixteen/);
});

test('DM operational audit respects the earlier two-call allocation and completion boundaries', () => {
  assert.equal(verifyRecoveryConcurrency([attempt(100, 200), attempt(100, 200), attempt(200, 300)], 2), 2);
  assert.throws(() => verifyRecoveryConcurrency([attempt(100, 300), attempt(100, 300), attempt(200, 400)], 2), /exceeds allocation 2/);
  assert.equal(verifyRecoveryConcurrency([], 2), 0);
});

test('DM operational audit still enforces the earlier eight-call session allocation', () => {
  const eight = Array.from({ length: 8 }, () => attempt(100, 300));
  assert.equal(verifyRecoveryConcurrency(eight, 8), 8);
  assert.throws(() => verifyRecoveryConcurrency([...eight, attempt(200, 400)], 8), /exceeds allocation 8/);
});

test('DM operational audit refuses unfinished or invalid timestamp evidence', () => {
  assert.throws(() => verifyRecoveryConcurrency([{ startedAt: new Date(100).toISOString() }]), /timestamps are invalid/);
  assert.throws(() => verifyRecoveryConcurrency([attempt(300, 200)]), /timestamps are invalid/);
});
