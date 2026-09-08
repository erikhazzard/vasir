import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { classifyWritingProviderFailure, blockedWritingDispatchProviders, inspectRetainedWritingFailures } from '../cli/eval/writing-provider-failures.js';

const codex = { id: 'codex:gpt-6-astra@low', provider: 'codex', model: 'gpt-6-astra', reasoning: 'low' };
const claude = { id: 'claude:claude-opus-5@xhigh', provider: 'claude', model: 'claude-opus-5', reasoning: 'xhigh' };
const error = configuration => ({ code: 'EVAL_AGENT_RUNTIME_FAILED', context: { requestedConfiguration: configuration } });
const quota = "You've hit your usage limit. Visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at Sep 14th, 2026 9:21 PM.";
const classify = (configuration, events, failure = error(configuration)) => classifyWritingProviderFailure({ configuration, error: failure, stdout: events.map(event => JSON.stringify(event)).join('\n') });

test('Codex terminal usage limits are recognized even when adapter stdout is absent', () => {
  const result = classify(codex, [{ type: 'error', message: quota }, { type: 'turn.failed', error: { message: quota } }]);
  assert.equal(result.kind, 'quota');
  assert.equal(result.provider, 'codex');
  assert.equal(result.resetHint, 'Sep 14th, 2026 9:21 PM');
});
test('candidate text, warnings, generic throttling and mismatched contexts cannot open a quota circuit', () => {
  for (const events of [
    [{ type: 'item.completed', item: { type: 'agent_message', text: quota } }],
    [{ type: 'item.completed', item: { type: 'error', message: quota } }],
    [{ type: 'turn.failed', error: { message: '429 rate limit; slow down' } }],
    [{ type: 'assistant', message: { content: [{ type: 'text', text: quota }] } }]
  ]) assert.equal(classify(codex, events), null);
  assert.equal(classify(codex, [{ type: 'turn.failed', error: { message: quota } }], error(claude)), null);
});
test('explicit Claude refusals remain policy failures, not operational or quota retries', () => {
  const result = classify(claude, [{ type: 'result', is_error: true, terminal_reason: 'api_error', stop_reason: 'refusal', result: 'Opus5 safeguards flagged this message [reasoning_extraction]' }]);
  assert.equal(result.kind, 'policy');
  assert.equal(result.reason, 'explicit-provider-refusal');
  assert.equal(classify(claude, [{ type: 'result', is_error: false, stop_reason: 'refusal', result: 'A fictional policy refusal' }]), null);
});
test('quota guards affect only the planned providers, never substitute a different judge', () => {
  const failures = [{ kind: 'quota', provider: 'claude' }, { kind: 'policy', provider: 'codex' }];
  assert.deepEqual(blockedWritingDispatchProviders({ failures, stage: 'codex', mode: 'generation' }), []);
  assert.deepEqual(blockedWritingDispatchProviders({ failures, stage: 'all', mode: 'generation' }), ['claude']);
  assert.deepEqual(blockedWritingDispatchProviders({ failures, mode: 'judging', judgeConfigurations: [codex] }), []);
  assert.deepEqual(blockedWritingDispatchProviders({ failures, mode: 'judging', judgeConfigurations: [codex, claude] }), ['claude']);
});

test('hash-verified failed judge streams stop dispatch without requiring a failed creator', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'writing-judge-quota-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const bytes = Buffer.from(JSON.stringify({ type: 'turn.failed', error: { message: quota } }) + '\n');
  fs.writeFileSync(path.join(directory, 'stdout.jsonl'), bytes);
  const failure = error(codex);
  failure.context.rawStreams = { stdout: { path: 'stdout.jsonl', bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') } };
  const run = { rows: [], configurations: [codex], judging: { judges: [{ configuration: codex, batches: [{ batchId: 'failed-judge', status: 'error', error: failure }] }] } };
  const observed = inspectRetainedWritingFailures({ run, directory });
  assert.equal(observed[0].batchId, 'failed-judge');
  assert.equal(observed[0].kind, 'quota');
  assert.deepEqual(blockedWritingDispatchProviders({ failures: observed, mode: 'judging', judgeConfigurations: [codex] }), ['codex']);
  fs.appendFileSync(path.join(directory, 'stdout.jsonl'), 'changed');
  assert.throws(() => inspectRetainedWritingFailures({ run, directory }), /byte count changed/);
});
