/** @fileoverview Freezes the real Redis queue and author-only context; held-out checks never enter model inputs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareFixture, readJson, sha256, writeJson } from '../backend-testing/fixture.mjs';

const caseRoot = path.dirname(fileURLToPath(import.meta.url));
export const CASE_ID = 'redis-work-queue';
export const TEST_PATH = 'test/domains/platform/runtime/queue/redis-work-queue__authored.spec.js';
const queueSourcePath = 'src/adapters/queue/queue.redis.js';
const supportPath = 'test/benchmark-support/queue-runtime.js';

export const TASK = `Write a new, maintainable automated test suite for the Redis-backed work queue from the supplied production code and contract. There is no existing test suite to edit or preserve. Submit exactly one concise, complete plain JavaScript ESM Mocha test file at ${TEST_PATH}. Maximum accepted UTF-8 source size: 24 KiB, checked after generation without truncation. You cannot run tools during this authoring request; the evaluator executes your exact file without repair.

Behavior contract
Workers use createQueue to enqueue JSON jobs, claim work, acknowledge completion, retry unsuccessful work, and quarantine unusable jobs. The supported subject is the Redis backend with positive redisVisibilityTimeoutSeconds; SQS and legacy destructive mode are outside this task.

Ready jobs are delivered in FIFO order. A claimed job is temporarily invisible to other consumers but remains unfinished backlog until settled. Equal payloads represent independent jobs. If an attempt's visibility expires, another consumer can recover its original payload under a new opaque receipt; the previous attempt no longer owns the job. Renewing a live receipt changes its remaining visibility. A receipt can settle only its own live attempt, once. Explicit retry puts the unchanged body at the ready tail immediately. Dead-letter settlement preserves the original raw body, reason and Redis timestamp. Malformed JSON is quarantined and reported to the caller as a parse error while later valid work remains consumable. Pending-work checks are non-consuming; backlog includes ready and unacknowledged jobs, with dead-letter counts reported separately. Explicit queue/DLQ key overrides must remain distinct and share a nonempty Redis hash tag; invalid configuration or storage types must not consume ready work.

Runtime and imports
- Mocha runs this one file with --exit --no-config --timeout 10000 against a fresh, owned real Redis server. The server URL is injected through the normal environment loader; never hardcode a port or create a fake queue/Redis implementation.
- Import { createQueue } from '../../../../../src/adapters/queue.js'. Call createQueue({ env: context.env, redis: context.redis, redisVisibilityTimeoutSeconds: 120 }) with the supplied caller-owned client. Other legal visibility durations follow the source contract.
- Import { createQueueTestContext } from '../../../../benchmark-support/queue-runtime.js'. Await it during setup; it returns env, redis, queueKey, dlqKey, reset(), close(). Reset your scope before each case and close it after the suite. The helper performs infrastructure lifecycle only, with no assertions or queue behavior.
- Use node:assert/strict. The caller-owned ioredis client supports ordinary Redis operations for setup or independent observation. Do not read source files, evaluator files or process metadata, patch production functions, access other services, call process.exit, skip cases or alter the harness.
- Return JSON only in the requested {"file":{"path":"...","content":"..."}} envelope. Do not include prose outside that JSON.`;

// The six faults implement the predeclared G1 failure classes. Each anchor must match once.
function declaredFaults() {
  return [
    ['fifo-reversal', 'Ready jobs delivered in reverse order', "local body = redis.call('LPOP', KEYS[1])", "local body = redis.call('RPOP', KEYS[1])"],
    ['lost-expired-work', 'Expired work removed without returning its body', "if body then redis.call('RPUSH', KEYS[1], body) end", '-- fault: expired body is discarded'],
    ['expired-receipt-settlement', 'Expired attempt can settle before recovery', 'if not deadline or deadline <= now then return 0 end', 'if not deadline then return 0 end'],
    ['retry-ordering', 'Retry jumps ahead of already-ready work', "if ARGV[2] == 'retry' then redis.call('RPUSH', KEYS[1], body) end", "if ARGV[2] == 'retry' then redis.call('LPUSH', KEYS[1], body) end"],
    ['omitted-inflight-count', 'Unacknowledged jobs disappear from backlog', "redis.call('LLEN', KEYS[1]) + redis.call('ZCARD', KEYS[2])", "redis.call('LLEN', KEYS[1])"],
    ['omitted-malformed-quarantine', 'Malformed claimed job is not quarantined', "await this.moveToDlq(receipt, 'invalid_json');", "// fault: malformed job remains claimed"],
  ].map(([id, label, before, after]) => ({ id, label, replacements: [{ file: queueSourcePath, before, after }] }));
}

async function sourceClosure(backendRoot, initialPaths) {
  const found = new Set();
  async function visit(relativePath) {
    if (found.has(relativePath)) return;
    found.add(relativePath);
    const content = await fs.readFile(path.join(backendRoot, relativePath), 'utf8');
    // Repository modules use literal ESM imports; this includes dynamic literal imports and re-exports.
    for (const match of content.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
      if (!match[1].startsWith('.')) continue;
      await visit(path.normalize(path.join(path.dirname(relativePath), match[1])));
    }
  }
  for (const relativePath of initialPaths) await visit(relativePath);
  return [...found].sort();
}

export async function prepare({ backendRoot, roundRoot }) {
  backendRoot = path.resolve(backendRoot); roundRoot = path.resolve(roundRoot);
  await fs.mkdir(roundRoot, { recursive: true });
  const configPath = path.join(roundRoot, 'private-config.json');
  const sourcePaths = await sourceClosure(backendRoot, ['src/adapters/queue.js', 'test/helpers/redis-clean.js']);
  if (sourcePaths.some(file => file.endsWith('.spec.js'))) throw new Error('Existing test leaked into fixture closure');
  const faults = declaredFaults();
  const queueSource = await fs.readFile(path.join(backendRoot, queueSourcePath), 'utf8');
  for (const fault of faults) if (queueSource.split(fault.replacements[0].before).length !== 2) throw new Error(`Fault anchor drift: ${fault.id}`);
  await writeJson(configPath, {
    allowlist: [...sourcePaths, 'package.json', 'package-lock.json'], exclude: [],
    supportFiles: [{ source: path.join(caseRoot, 'queue-runtime.js'), destination: supportPath }],
    submissionPrefix: 'test/domains/platform/runtime/queue/', taskPath: 'author-packet.json',
    testTimeoutMs: 30000, mochaArgs: ['--no-config', '--timeout', '10000'],
    runtime: { redisBinary: '/opt/homebrew/bin/redis-server' }, faults,
  });
  const fixture = await prepareFixture({ backendRoot, fixtureDir: path.join(roundRoot, 'fixture'), configPath });
  const sourceFiles = [];
  for (const relativePath of ['src/adapters/queue.js', queueSourcePath]) {
    const content = await fs.readFile(path.join(fixture.sourceDir, relativePath), 'utf8');
    sourceFiles.push({ path: relativePath, sha256: sha256(content), content });
  }
  const keysSource = await fs.readFile(path.join(fixture.sourceDir, 'src/keys.js'), 'utf8');
  const excerptStart = keysSource.indexOf('  // Queue and DLQ (Redis local)');
  const excerptEnd = keysSource.indexOf('  // Playable-share card rendering');
  const keysExcerpt = keysSource.slice(excerptStart, excerptEnd);
  sourceFiles.push({ path: 'src/keys.js (queue excerpt)', sha256: sha256(keysExcerpt), content: keysExcerpt,
    sourcePath: 'src/keys.js', sourceSha256: fixture.fileHashes['src/keys.js'],
    sourceStartLine: keysSource.slice(0, excerptStart).split('\n').length,
    sourceEndLine: keysSource.slice(0, excerptEnd).split('\n').length - 1 });
  const helper = await fs.readFile(path.join(fixture.sourceDir, supportPath), 'utf8');
  const supportFiles = [{ path: supportPath, sha256: sha256(helper), content: helper }];
  const packet = { schemaVersion: 1, caseId: CASE_ID, task: TASK, sourceFiles, supportFiles, fixtureSourceHash: fixture.sourceHash };
  await writeJson(path.join(roundRoot, 'author-packet.json'), packet);
  await writeJson(path.join(roundRoot, 'shared-review-context.json'), { files: [
    { path: 'shared/contract.md', sha256: sha256(TASK), content: TASK },
    ...sourceFiles.map(file => ({ ...file, path: file.sourcePath ? 'shared/src/keys.queue-excerpt.js' : `shared/${file.path}` })),
    ...supportFiles.map(file => ({ ...file, path: `shared/${file.path}` })),
  ] });
  return { fixturePath: path.join(roundRoot, 'fixture/manifest.json'), sourceHash: fixture.sourceHash,
    sourceFiles: sourcePaths.length, packetBytes: Buffer.byteLength(JSON.stringify(packet)), testPath: TEST_PATH };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [backendRoot, roundRoot] = process.argv.slice(2);
  if (!backendRoot || !roundRoot) throw new Error('Usage: node benchmarks/test-authoring/prepare.mjs <backend-root> <new-private-round-root>');
  console.log(JSON.stringify(await prepare({ backendRoot, roundRoot })));
}
