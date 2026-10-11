/** @fileoverview Calibrates queue fault detection through real producer/consumer outcomes; never supplied to authors. */
import assert from 'node:assert/strict';
import { createQueue } from '../../../../../src/adapters/queue.js';
import { createQueueTestContext } from '../../../../benchmark-support/queue-runtime.js';

describe('Redis queue producer and worker lifecycle', function () {
  this.timeout(10000);
  let queueContext;
  const openWorkerQueue = () => createQueue({ env: queueContext.env, redis: queueContext.redis, redisVisibilityTimeoutSeconds: 120 });
  before(async () => { queueContext = await createQueueTestContext('queue-calibration'); });
  beforeEach(async () => { await queueContext.reset(); });
  after(async () => { await queueContext?.close(); });

  it('delivers ready jobs in submission order and completes both', async () => {
    const workerQueue = await openWorkerQueue();
    await workerQueue.enqueue({ jobId: 'render-first', assetId: 'forest' });
    await workerQueue.enqueue({ jobId: 'render-second', assetId: 'harbor' });
    const firstDelivery = await workerQueue.dequeueOne();
    assert.deepEqual(firstDelivery?.message, { jobId: 'render-first', assetId: 'forest' });
    assert.equal(await workerQueue.delete(firstDelivery.receipt), true);
    const secondDelivery = await workerQueue.dequeueOne();
    assert.deepEqual(secondDelivery?.message, { jobId: 'render-second', assetId: 'harbor' });
    assert.equal(await workerQueue.delete(secondDelivery.receipt), true);
    assert.equal(await workerQueue.dequeueOne(), null);
  });

  it('recovers abandoned work into a new attempt and completes it', async () => {
    const originalWorkerQueue = await openWorkerQueue();
    await originalWorkerQueue.enqueue({ jobId: 'recover-preview', assetId: 'cavern' });
    const abandonedDelivery = await originalWorkerQueue.dequeueOne();
    assert.equal(await originalWorkerQueue.renewVisibility(abandonedDelivery.receipt, 0), true);
    const replacementWorkerQueue = await openWorkerQueue();
    const recoveredDelivery = await replacementWorkerQueue.dequeueOne();
    assert.deepEqual(recoveredDelivery?.message, { jobId: 'recover-preview', assetId: 'cavern' });
    assert.notEqual(recoveredDelivery.receipt, abandonedDelivery.receipt);
    assert.equal(await replacementWorkerQueue.delete(recoveredDelivery.receipt), true);
    assert.equal(await replacementWorkerQueue.dequeueOne(), null);
  });

  it('rejects acknowledgment from an expired worker before a replacement claims its job', async () => {
    const expiredWorkerQueue = await openWorkerQueue();
    await expiredWorkerQueue.enqueue({ jobId: 'fenced-preview', assetId: 'tower' });
    const expiredDelivery = await expiredWorkerQueue.dequeueOne();
    assert.equal(await expiredWorkerQueue.renewVisibility(expiredDelivery.receipt, 0), true);
    assert.equal(await expiredWorkerQueue.delete(expiredDelivery.receipt), false);
    const replacementWorkerQueue = await openWorkerQueue();
    const recoveredDelivery = await replacementWorkerQueue.dequeueOne();
    assert.deepEqual(recoveredDelivery?.message, { jobId: 'fenced-preview', assetId: 'tower' });
    assert.equal(await replacementWorkerQueue.delete(recoveredDelivery.receipt), true);
  });

  it('retries after already-ready work without duplicating the retried job', async () => {
    const workerQueue = await openWorkerQueue();
    await workerQueue.enqueue({ jobId: 'retry-preview' });
    const retryDelivery = await workerQueue.dequeueOne();
    await workerQueue.enqueue({ jobId: 'waiting-preview' });
    assert.equal(await workerQueue.retry(retryDelivery.receipt), true);
    assert.equal(await workerQueue.retry(retryDelivery.receipt), false);
    const waitingDelivery = await workerQueue.dequeueOne();
    assert.deepEqual(waitingDelivery?.message, { jobId: 'waiting-preview' });
    await workerQueue.delete(waitingDelivery.receipt);
    const retriedDelivery = await workerQueue.dequeueOne();
    assert.deepEqual(retriedDelivery?.message, { jobId: 'retry-preview' });
    assert.notEqual(retriedDelivery.receipt, retryDelivery.receipt);
    await workerQueue.delete(retriedDelivery.receipt);
    assert.equal(await workerQueue.dequeueOne(), null);
  });

  it('counts independent equal-payload jobs while they are claimed and after completion', async () => {
    const workerQueue = await openWorkerQueue();
    await workerQueue.enqueue({ assetId: 'shared-preview' });
    await workerQueue.enqueue({ assetId: 'shared-preview' });
    const firstDelivery = await workerQueue.dequeueOne();
    const secondDelivery = await workerQueue.dequeueOne();
    assert.notEqual(firstDelivery.receipt, secondDelivery.receipt);
    assert.deepEqual(await workerQueue.getApproximateCounts(), {
      source: 'redis', approximate: false, queueBacklogCount: 2, queueDlqCount: 0,
    });
    await workerQueue.delete(firstDelivery.receipt);
    assert.equal((await workerQueue.getApproximateCounts()).queueBacklogCount, 1);
    assert.equal(await workerQueue.delete(firstDelivery.receipt), false);
    await workerQueue.delete(secondDelivery.receipt);
    assert.equal((await workerQueue.getApproximateCounts()).queueBacklogCount, 0);
  });

  it('quarantines exact malformed bytes and allows the next valid job to finish', async () => {
    const workerQueue = await openWorkerQueue();
    const malformedJobBody = '{ malformed preview request';
    await workerQueue.enqueue(malformedJobBody);
    await assert.rejects(workerQueue.dequeueOne(), SyntaxError);
    const deadLetterBodies = await queueContext.redis.lrange(queueContext.dlqKey, 0, 1);
    assert.equal(deadLetterBodies.length, 1);
    const deadLetter = JSON.parse(deadLetterBodies[0]);
    assert.equal(deadLetter.body, malformedJobBody);
    assert.equal(deadLetter.reason, 'invalid_json');
    assert.ok(Number.isSafeInteger(deadLetter.ts_ms) && deadLetter.ts_ms > 0);
    await workerQueue.enqueue({ jobId: 'valid-after-malformed' });
    const validDelivery = await workerQueue.dequeueOne();
    assert.deepEqual(validDelivery?.message, { jobId: 'valid-after-malformed' });
    assert.equal(await workerQueue.delete(validDelivery.receipt), true);
    assert.deepEqual(await workerQueue.getApproximateCounts(), {
      source: 'redis', approximate: false, queueBacklogCount: 0, queueDlqCount: 1,
    });
  });
});
