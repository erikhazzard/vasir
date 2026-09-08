import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const WRITING_PROVIDER_FAILURE_GUARD = 'writing-retained-terminal-failure-guard-v1';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

// Only provider terminal records count. Candidate prose, generic rate limits,
// warnings and error-looking text inside an assistant answer are not evidence.
export function classifyWritingProviderFailure({ configuration, error, stdout }) {
  if (error?.code !== 'EVAL_AGENT_RUNTIME_FAILED' || typeof stdout !== 'string') return null;
  const requested = error.context?.requestedConfiguration;
  if (requested && ['id', 'provider', 'model', 'reasoning'].some(key => requested[key] !== configuration[key])) return null;
  const events = stdout.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  if (configuration.provider === 'codex') {
    const failed = events.find(event => event.type === 'turn.failed' && typeof event.error?.message === 'string');
    if (failed && /\byou['’]ve hit your usage limit\b/iu.test(failed.error.message)) return { kind: 'quota', provider: 'codex', reason: 'usage-limit-reached', resetHint: failed.error.message.match(/try again at (.+?)(?:\.|$)/iu)?.[1] ?? null };
    if (failed && /\byou['’]re out of usage credits\b/iu.test(failed.error.message)) return { kind: 'quota', provider: 'codex', reason: 'usage-credits-exhausted', resetHint: null };
  }
  if (configuration.provider === 'claude') {
    const failed = events.findLast(event => event.type === 'result' && event.is_error === true && typeof event.result === 'string');
    if (!failed) return null;
    if (/\byou['’]ve hit your session limit\b/iu.test(failed.result)) return { kind: 'quota', provider: 'claude', reason: 'session-usage-limit-reached', resetHint: failed.result.match(/resets?\s+(.+?)(?:\n|$)/iu)?.[1] ?? null };
    const refused = failed.stop_reason === 'refusal' || events.some(event => event.type === 'assistant' && event.message?.stop_reason === 'refusal');
    if (failed.terminal_reason === 'api_error' && refused) return { kind: 'policy', provider: 'claude', reason: 'explicit-provider-refusal', resetHint: null };
    if (failed.result === 'API Error: 400 Output blocked by content filtering policy') return { kind: 'policy', provider: 'claude', reason: 'output-filtering', resetHint: null };
  }
  return null;
}

export function inspectRetainedWritingFailures({ run, directory }) {
  const failures = [
    ...run.rows.filter(row => row.rowStatus === 'error').map(row => ({ identity: { rowKey: row.rowKey }, configuration: run.configurations.find(item => item.id === row.configurationId), error: row.error })),
    ...(run.judging?.judges || []).flatMap(judge => judge.batches.filter(batch => batch.status !== 'complete' && batch.error).map(batch => ({ identity: { batchId: batch.batchId, reviewerId: judge.configuration.id }, configuration: judge.configuration, error: batch.error })))
  ];
  return failures.flatMap(({ identity, configuration, error }) => {
    const pin = error?.context?.rawStreams?.stdout;
    if (!pin) return [];
    assert.ok(typeof pin.path === 'string' && !path.isAbsolute(pin.path) && !pin.path.includes('\\') && pin.path.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe retained failure stream path.');
    const file = path.join(directory, pin.path), root = fs.realpathSync(directory);
    assert.ok(fs.realpathSync(file).startsWith(root + path.sep), 'Retained stream escaped the run.');
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, pin.bytes, 'Retained provider failure byte count changed.');
    assert.equal(sha(bytes), pin.sha256, 'Retained provider failure hash changed.');
    const classification = classifyWritingProviderFailure({ configuration, error, stdout: bytes.toString('utf8') });
    return classification ? [{ ...identity, configurationId: configuration.id, ...classification, source: { ...pin } }] : [];
  });
}

export function blockedWritingDispatchProviders({ failures, stage, mode, judgeConfigurations = [] }) {
  const requested = mode === 'judging' ? judgeConfigurations.map(configuration => configuration.provider) : ['codex', 'claude'].filter(provider => ['all', 'cleanup', provider].includes(stage));
  return [...new Set(failures.filter(item => item.kind === 'quota' && requested.includes(item.provider)).map(item => item.provider))];
}
