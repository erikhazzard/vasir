import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ARCHIVED_CLAUDE_CAPACITY_KIND, DEFAULT_CLAUDE_CONTEXT, inspectClaudeCapacityStream,
  validateArchivedClaudeCapacityProof } from '../cli/eval/writing-capacity-evidence.js';
import { validateClaudeCapacityProof } from '../cli/eval/plot-twists-claude-recovery.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, '.agents/vasir-evals/dungeon-master-adventure-outline/completion-checkpoints/claude-first-success-20260909T0035Z');
const available = fs.existsSync(path.join(directory, 'checkpoint-archive.json'));
const check = (name, fn) => test(name, { skip: !available && 'Original immutable private DM evidence unavailable; no synthetic substitute.' }, fn);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function fixture() {
  const archiveBytes = fs.readFileSync(path.join(directory, 'checkpoint-archive.json'));
  const archive = JSON.parse(archiveBytes), run = JSON.parse(fs.readFileSync(path.join(directory, 'run.json')));
  const attempt = run.expansionExecution.attempts.find(item => item.kind === 'writer' && item.status === 'complete' && item.configurationId === 'claude:claude-fable-5-1@low');
  const receipt = attempt.runtimeReceipt, row = run.rows.find(item => item.rowKey === attempt.key);
  const source = { archiveDirectory: directory, archiveReceiptSha256: hash(archiveBytes), runSha256: archive.runSha256,
    attemptKey: attempt.key, configurationId: attempt.configurationId, sessionId: receipt.sessionId,
    stdout: { path: `${attempt.evidenceDirectory}/stdout.jsonl`, bytes: receipt.stdoutBytes, sha256: receipt.stdoutSha256 } };
  const proof = { kind: ARCHIVED_CLAUDE_CAPACITY_KIND, accountContext: DEFAULT_CLAUDE_CONTEXT, resetCreditConsumptionAllowed: false,
    rootAuthorization: { actor: 'root', reason: 'Read-only validation test; no dispatch.', maximumCalls: 20, concurrency: 4 }, sources: [source] };
  const options = { repoRootDirectory: root, requiredModels: ['claude-fable-5-1'], maximumCalls: 20, concurrency: 4,
    now: Date.parse(attempt.completedAt) + 1000, environmentVariables: { HOME: '/Users/erikhazzard' } };
  const stdout = fs.readFileSync(path.join(directory, source.stdout.path), 'utf8');
  const streamOptions = { model: 'claude-fable-5-1', sessionId: receipt.sessionId,
    targetOutputTokens: receipt.targetCanonicalModelOutputTokens, answer: row.outputText };
  return { proof, options, attempt, stdout, streamOptions };
}

check('archived capacity accepts actual Fable output and preserves raw utilization without inventing model-weekly usage', () => {
  const { proof, options, attempt } = fixture(), result = validateArchivedClaudeCapacityProof(proof, options);
  assert.equal(result.verifiedAt, Date.parse(attempt.completedAt));
  assert.deepEqual(result.models, ['claude-fable-5-1']);
  assert.equal(result.sources[0].rateLimitEvents[0].unifiedWindows.seven_day.utilization, 0.02);
  assert.equal(result.sources[0].rateLimitEvents[0].unifiedWindows.seven_day_fable, undefined);
  assert.equal(result.sources[0].rateLimitEvents[0].isUsingOverage, false);
});

check('Twists admission still requires separate actual evidence for both original Claude models', () => {
  const { proof, options } = fixture();
  assert.throws(() => validateClaudeCapacityProof(proof, options), /One successful source per required model/);
  assert.throws(() => validateArchivedClaudeCapacityProof({ ...proof, sources: [proof.sources[0], proof.sources[0]] },
    { ...options, requiredModels: ['claude-fable-5-1', 'claude-opus-5'] }), /missing or duplicated/);
});

check('archived proof refuses expanded bounds, missing root authorization, changed contexts and authentication overrides', () => {
  const { proof, options } = fixture();
  for (const patch of [{ maximumCalls: null }, { maximumCalls: 21 }, { concurrency: 5 }])
    assert.throws(() => validateArchivedClaudeCapacityProof(proof, { ...options, ...patch }));
  for (const patch of [{ rootAuthorization: { ...proof.rootAuthorization, actor: 'unknown' } },
    { rootAuthorization: { ...proof.rootAuthorization, maximumCalls: 21 } }, { resetCreditConsumptionAllowed: true }, { accountContext: 'switched' }])
    assert.throws(() => validateArchivedClaudeCapacityProof({ ...proof, ...patch }, options));
  for (const key of ['CLAUDE_CONFIG_DIR', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_CUSTOM_HEADERS', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY'])
    assert.throws(() => validateArchivedClaudeCapacityProof(proof, { ...options, environmentVariables: { ...options.environmentVariables, [key]: 'override' } }), /overrides are forbidden/);
});

check('capacity cannot use stale, future, unbound, synthetic, or tampered source evidence', () => {
  const { proof, options, attempt } = fixture();
  for (const now of [Date.parse(attempt.completedAt) - 1, Date.parse(attempt.completedAt) + 3_600_001])
    assert.throws(() => validateArchivedClaudeCapacityProof(proof, { ...options, now }), /one hour old/);
  for (const patch of [{ archiveDirectory: '/tmp/synthetic-capacity' }, { archiveReceiptSha256: '0'.repeat(64) },
    { runSha256: '0'.repeat(64) }, { attemptKey: 'synthetic-success' }, { sessionId: 'different-session' },
    { stdout: { ...proof.sources[0].stdout, sha256: '0'.repeat(64) } }])
    assert.throws(() => validateArchivedClaudeCapacityProof({ ...proof, sources: [{ ...proof.sources[0], ...patch }] }, options));
});

check('raw stream verification rejects refusal, quota, overage, missing usage, session and target-model substitutions', () => {
  const { stdout, streamOptions } = fixture();
  assert.equal(inspectClaudeCapacityStream(stdout, streamOptions).length, 2);
  const mutate = fn => {
    const events = stdout.split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line));
    fn(events); return events.map(event => JSON.stringify(event)).join('\n');
  };
  for (const fn of [
    events => { events.find(event => event.type === 'result').stop_reason = 'refusal'; },
    events => { events.find(event => event.type === 'result').is_error = true; },
    events => { events.find(event => event.type === 'result').session_id = 'other'; },
    events => { events.find(event => event.type === 'result').modelUsage = {}; },
    events => { events.find(event => event.type === 'result').result = 'substituted answer'; },
    events => { events.find(event => event.type === 'rate_limit_event').rate_limit_info.status = 'rejected'; },
    events => { events.find(event => event.type === 'rate_limit_event').rate_limit_info.isUsingOverage = true; },
    events => { delete events.find(event => event.type === 'rate_limit_event').rate_limit_info.overageStatus; },
    events => { events.find(event => event.type === 'rate_limit_event').rate_limit_info.overageDisabledReason = 'unknown'; },
    events => { events.find(event => event.type === 'rate_limit_event').session_id = 'other'; }
  ]) assert.throws(() => inspectClaudeCapacityStream(mutate(fn), streamOptions));
  assert.throws(() => inspectClaudeCapacityStream(stdout.split(/\r?\n/u).filter(line => line && JSON.parse(line).type !== 'rate_limit_event').join('\n'), streamOptions));
  assert.throws(() => inspectClaudeCapacityStream(stdout, { ...streamOptions, model: 'claude-opus-5' }), /target-model output/);
});
