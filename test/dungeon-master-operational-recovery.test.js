import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyRecoveryConcurrency } from '../docs/work/vasir-benchmarking/dungeon-master-adventure-outline/model-coverage-extension/recover-capacity-20260908.mjs';

const attempt = (start, end) => ({ startedAt: new Date(start).toISOString(), completedAt: new Date(end).toISOString() });

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
