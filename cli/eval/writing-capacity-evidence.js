import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dmDigest, validateDungeonMasterExpansion } from './dungeon-master-expansion-manifest.js';

// Operational admission only. This module never dispatches, writes evidence,
// changes authentication, or turns absent quota fields into numeric capacity.
export const ARCHIVED_CLAUDE_CAPACITY_KIND = 'archived-claude-success-capacity-v1';
export const DEFAULT_CLAUDE_CONTEXT = 'unchanged default Claude context; no CLAUDE_CONFIG_DIR override';
const DM_MANIFEST = '57ba82bd9dedff7e038a2d4ff6855b06b68a40ba9a61dffca483ac7041544592';
const MODELS = ['claude-fable-5-1', 'claude-opus-5'];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const noOverrides = ['CLAUDE_CONFIG_DIR', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL',
  'CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_CUSTOM_HEADERS', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY'];

function immutableRead(directory, pin) {
  assert.ok(pin && typeof pin.path === 'string' && !path.isAbsolute(pin.path)
    && !pin.path.includes('\\') && !pin.path.split('/').some(part => !part || part === '.' || part === '..'), 'Unsafe archive evidence path.');
  assert.match(pin.sha256, /^[a-f0-9]{64}$/u);
  const file = path.join(directory, pin.path), real = fs.realpathSync(file), stat = fs.statSync(file);
  assert.equal(real, file, 'Archive evidence symlinks are forbidden.');
  assert.ok(stat.isFile() && (stat.mode & 0o222) === 0, 'Capacity evidence must be an immutable file.');
  const bytes = fs.readFileSync(file);
  if (pin.bytes !== undefined) assert.equal(bytes.length, pin.bytes, 'Archive evidence size changed.');
  assert.equal(hash(bytes), pin.sha256, 'Archive evidence hash changed.');
  return bytes;
}

function verifiedArchive(source, repoRootDirectory, environmentVariables) {
  const parent = fs.realpathSync(path.join(repoRootDirectory, '.agents/vasir-evals/dungeon-master-adventure-outline/completion-checkpoints'));
  const directory = path.resolve(source.archiveDirectory);
  assert.equal(path.dirname(directory), parent, 'Capacity requires an original DM completion archive.');
  assert.equal(fs.realpathSync(directory), directory, 'Archive directory symlinks are forbidden.');
  const archive = JSON.parse(immutableRead(directory, { path: 'checkpoint-archive.json', sha256: source.archiveReceiptSha256 }));
  assert.equal(archive.method, 'exact-drained-dm-expansion-tree-v1');
  assert.equal(archive.runId, 'dm-model-coverage-20260908-v2');
  assert.equal(archive.manifestHash, DM_MANIFEST);
  assert.equal(archive.runSha256, source.runSha256);
  assert.equal(dmDigest(archive.files), archive.treeSha256);
  assert.equal(new Set(archive.files.map(file => file.path)).size, archive.files.length);
  for (const pin of archive.files) {
    assert.ok(!pin.path.endsWith('.lock'), 'Archive contains a writer lock.');
    immutableRead(directory, pin);
  }
  const runPin = archive.files.find(file => file.path === 'run.json');
  assert.equal(runPin?.sha256, source.runSha256);
  const run = JSON.parse(immutableRead(directory, runPin)), extension = run.cohortExtension;
  validateDungeonMasterExpansion(run);
  assert.equal(extension.manifestHash, DM_MANIFEST);
  assert.equal(dmDigest({ edition: extension.edition, runId: run.runId, configurations: run.configurations,
    benchmarkHash: run.benchmark.hash, treatmentHash: run.treatment.hash, generation: run.generation,
    implementation: extension.implementation, parentEvidenceHash: dmDigest(extension.parentEvidence.files),
    preparationLineageHash: extension.preparationLineage.hash }), DM_MANIFEST);
  const validatorPin = extension.implementation.files.find(file => file.path === 'cli/eval/dungeon-master-expansion-manifest.js');
  assert.equal(hash(fs.readFileSync(fileURLToPath(new URL('./dungeon-master-expansion-manifest.js', import.meta.url)))), validatorPin.sha256);
  for (const pin of extension.implementation.files) immutableRead(directory, { ...pin, path: `runtime-source/${pin.path}` });
  assert.equal(run.expansionExecution.accountContexts.claude, hash(path.join(environmentVariables.HOME, '.claude')), 'Claude authentication context changed.');
  assert.equal(run.expansionExecution.quotaCircuitOpen, false);
  assert.equal(run.expansionExecution.operationalCircuitOpen, false);
  assert.ok(!run.expansionExecution.attempts.some(item => item.status === 'running'));
  assert.ok(!run.expansionExecution.sessions.some(item => item.status === 'running'));
  return { directory, archive, run };
}

// Stream checks alone do not grant admission; the public proof validator below
// first binds these bytes to the immutable original run and successful attempt.
export function inspectClaudeCapacityStream(stdout, { model, sessionId, targetOutputTokens, answer }) {
  const events = stdout.split(/\r?\n/u).filter(line => line.trim()).map(line => JSON.parse(line));
  assert.ok(!events.some(event => ['error', 'turn.failed'].includes(event.type) || event.is_error
    || event.stop_reason === 'refusal' || event.message?.stop_reason === 'refusal'), 'Terminal or refusal evidence cannot establish capacity.');
  const results = events.filter(event => event.type === 'result');
  assert.equal(results.length, 1); const result = results[0];
  assert.equal(result.subtype, 'success'); assert.equal(result.is_error, false); assert.equal(result.session_id, sessionId);
  assert.ok(typeof result.result === 'string' && result.result.trim() === answer.trim(), 'Provider output differs from the successful answer.');
  const usage = Object.entries(result.modelUsage ?? {}).map(([name, value]) => ({ ...value, model: value.canonicalModel ?? name }));
  const targetTokens = usage.filter(item => item.model === model).reduce((total, item) => total + item.outputTokens, 0);
  assert.ok(Number.isFinite(targetTokens) && targetTokens > 0, 'Actual requested target-model output is required.');
  assert.equal(targetTokens, targetOutputTokens);
  assert.ok(usage.every(item => [model, 'claude-haiku-4-5'].includes(item.model)), 'Unexpected output model.');
  const limits = events.filter(event => event.type === 'rate_limit_event');
  assert.ok(limits.length > 0, 'Actual provider rate-limit metadata is required.');
  for (const event of limits) {
    assert.equal(event.session_id, sessionId); const info = event.rate_limit_info;
    assert.equal(info?.status, 'allowed'); assert.equal(info.isUsingOverage, false);
    assert.equal(info.overageStatus, 'rejected'); assert.equal(info.overageDisabledReason, 'out_of_credits');
    assert.ok(typeof info.rateLimitType === 'string' && Number.isFinite(info.resetsAt));
  }
  return limits.map(event => event.rate_limit_info);
}

export function validateArchivedClaudeCapacityProof(proof, { repoRootDirectory, requiredModels, maximumCalls, concurrency,
  now = Date.now(), environmentVariables = process.env } = {}) {
  assert.equal(proof.kind, ARCHIVED_CLAUDE_CAPACITY_KIND);
  assert.equal(proof.accountContext, DEFAULT_CLAUDE_CONTEXT);
  for (const key of noOverrides) assert.equal(environmentVariables[key], undefined, `${key} overrides are forbidden.`);
  assert.ok(typeof environmentVariables.HOME === 'string' && path.isAbsolute(environmentVariables.HOME), 'Default Claude HOME is required.');
  assert.equal(proof.resetCreditConsumptionAllowed, false);
  assert.equal(proof.rootAuthorization?.actor, 'root');
  assert.ok(typeof proof.rootAuthorization.reason === 'string' && proof.rootAuthorization.reason.trim(), 'Explicit root authorization is required.');
  assert.equal(proof.rootAuthorization.maximumCalls, 20);
  assert.equal(proof.rootAuthorization.concurrency, 4);
  assert.ok(Number.isInteger(maximumCalls) && maximumCalls > 0 && maximumCalls <= 20, 'This capacity proof permits at most 20 calls.');
  assert.ok(Number.isInteger(concurrency) && concurrency > 0 && concurrency <= 4, 'This capacity proof permits at most four concurrent calls.');
  assert.ok(Array.isArray(requiredModels) && requiredModels.length > 0 && new Set(requiredModels).size === requiredModels.length
    && requiredModels.every(model => MODELS.includes(model)), 'Explicit original target models are required.');
  assert.ok(Array.isArray(proof.sources) && proof.sources.length === requiredModels.length, 'One successful source per required model is required.');
  const archives = new Map(), sessions = new Set(), models = new Set(), sources = [];
  for (const source of proof.sources) {
    const archiveKey = JSON.stringify([source.archiveDirectory, source.archiveReceiptSha256, source.runSha256]);
    if (!archives.has(archiveKey)) archives.set(archiveKey, verifiedArchive(source, repoRootDirectory, environmentVariables));
    const { directory, archive, run } = archives.get(archiveKey);
    const attempts = run.expansionExecution.attempts.filter(item => item.key === source.attemptKey && item.configurationId === source.configurationId
      && item.runtimeReceipt?.sessionId === source.sessionId);
    assert.equal(attempts.length, 1, 'Capacity must bind one actual successful original attempt.');
    const attempt = attempts[0], receipt = attempt.runtimeReceipt;
    assert.equal(attempt.kind, 'writer'); assert.equal(attempt.status, 'complete');
    const row = run.rows.find(item => item.rowKey === attempt.key), configuration = run.configurations.find(item => item.id === source.configurationId);
    assert.equal(row?.rowStatus, 'complete'); assert.equal(configuration?.provider, 'claude');
    assert.ok(requiredModels.includes(configuration.model) && !models.has(configuration.model), 'Required target model missing or duplicated.');
    assert.deepEqual(receipt, row.runtimeReceipt); assert.deepEqual(receipt.requestedConfiguration, configuration);
    assert.equal(receipt.cli, 'claude'); assert.equal(receipt.freshSession, true); assert.equal(receipt.persistedSession, false);
    assert.ok(typeof source.sessionId === 'string' && source.sessionId.trim() && !sessions.has(source.sessionId), 'Fresh provider session identity is required.');
    assert.equal(receipt.requestedModel, configuration.model); assert.equal(receipt.targetCanonicalModel, configuration.model);
    assert.equal(receipt.userPromptSha256, hash(row.promptText));
    const completedAt = Date.parse(attempt.completedAt), startedAt = Date.parse(attempt.startedAt);
    assert.ok(Number.isFinite(completedAt) && startedAt < completedAt && completedAt <= now && now - completedAt <= 3_600_000, 'Successful capacity evidence must be at most one hour old.');
    const invocation = run.expansionExecution.sessions.find(item => item.id === attempt.sessionId);
    assert.ok(invocation && Date.parse(invocation.completedAt) >= completedAt && Date.parse(archive.archivedAt) >= Date.parse(invocation.completedAt));
    assert.ok(!run.expansionExecution.attempts.some(item => item.configurationId.startsWith('claude:')
      && ['quota', 'operational'].includes(item.failureClass) && Date.parse(item.completedAt) >= completedAt), 'Newer Claude interruption invalidates capacity evidence.');
    assert.deepEqual(source.stdout, { path: `${attempt.evidenceDirectory}/stdout.jsonl`, bytes: receipt.stdoutBytes, sha256: receipt.stdoutSha256 });
    assert.deepEqual(archive.files.find(file => file.path === source.stdout.path), source.stdout);
    const stdout = immutableRead(directory, source.stdout).toString('utf8');
    immutableRead(directory, { path: `${attempt.evidenceDirectory}/stderr.txt`, bytes: receipt.stderrBytes, sha256: receipt.stderrSha256 });
    const answer = immutableRead(directory, archive.files.find(file => file.path === `${attempt.evidenceDirectory}/answer.md`)).toString('utf8');
    assert.ok(answer.trim()); assert.equal(answer, row.outputText); assert.equal(hash(answer), attempt.outputHash); assert.equal(attempt.outputHash, row.outputHash);
    const rateLimitEvents = inspectClaudeCapacityStream(stdout, { model: configuration.model, sessionId: source.sessionId,
      targetOutputTokens: receipt.targetCanonicalModelOutputTokens, answer });
    models.add(configuration.model); sessions.add(source.sessionId);
    sources.push({ ...source, model: configuration.model, completedAt: attempt.completedAt,
      rateLimitEvents });
  }
  assert.deepEqual([...models].sort(), [...requiredModels].sort(), 'Every required target model needs its own successful evidence.');
  return { verifiedAt: Math.min(...sources.map(source => Date.parse(source.completedAt))), models: [...models], sources };
}
