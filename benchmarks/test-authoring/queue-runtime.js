/** @fileoverview Owns isolated real Redis clients for queue tests; contains no queue behavior or assertions. */
import IORedis from 'ioredis';
import { loadEnv } from '../../src/env.js';
import { keys } from '../../src/keys.js';
import { uniqueScope, wipeScope } from '../helpers/redis-clean.js';

export async function createQueueTestContext(scopeLabel = 'authored-queue') {
  const env = loadEnv({ NS: 'test-authoring', SCOPE: uniqueScope(scopeLabel), QUEUE_IMPL: 'redis', SQS_URL: '' });
  const redis = new IORedis(env.CORE_VALKEY_URL, {
    lazyConnect: true, connectTimeout: 2000, commandTimeout: 2000,
    maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null,
  });
  await redis.connect();
  return {
    env, redis,
    queueKey: keys.queue(env.NS, env.SCOPE),
    dlqKey: keys.dlq(env.NS, env.SCOPE),
    async reset() { await wipeScope(redis, env.NS, env.SCOPE); },
    async close() {
      try { await wipeScope(redis, env.NS, env.SCOPE); }
      finally { await redis.quit(); }
    },
  };
}
