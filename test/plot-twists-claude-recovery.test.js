import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { inspectRetainedWritingFailures } from '../cli/eval/writing-provider-failures.js';
import { retainedFailureIdentity } from '../cli/eval/plot-twists-operational-recovery.js';
import { validateTwistsCompletion } from '../cli/eval/plot-twists-completion.js';
import { CLAUDE_QUOTA_ROW, CLAUDE_QUOTA_STREAM, validateClaudeCapacityProof, selectClaudePendingPlans,
  selectSingleClaudeQuotaPlan, executeSingleClaudeQuotaRecovery, newClaudeQuotaFailures, newClaudeInvocationStops, claudeProviderWideStops } from '../cli/eval/plot-twists-claude-recovery.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, '.agents/vasir-evals/storytelling-plot-twists/storytelling-plot-twists-v1-completion-2026-09-08');
const archive = path.join(root, '.agents/vasir-evals/storytelling-plot-twists/publication-snapshots/cc357218c44344dc9d7e981e46e5c99d9f8ef8f9a77ebff3fb7c410555d28d24');
const available = fs.existsSync(path.join(archive, 'run.json'));
const check = (name, fn) => test(name, { skip: !available && 'Pinned private archive unavailable; no substitute evidence.' }, fn);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const proof = { kind: 'sanitized-read-only-capacity-receipt', checkedAt: '2026-09-08T20:45:00Z',
  accountContext: 'unchanged default Claude context; no CLAUDE_CONFIG_DIR override', source: 'Synthetic test-only receipt; never permits live dispatch.',
  sessionUsedPercent: 1, weekAllModelsUsedPercent: 30, weekFableUsedPercent: 55,
  usageCreditsEnabled: false, resetCreditConsumptionAllowed: false };
const verifiedAt = Date.parse(proof.checkedAt);
const fixture = () => {
  const run = JSON.parse(fs.readFileSync(path.join(archive, 'run.json')));
  const snapshot = JSON.parse(fs.readFileSync(path.join(archive, 'skill-snapshot.json')));
  const failures = inspectRetainedWritingFailures({ run, directory });
  return { run, snapshot, failures, plan: selectSingleClaudeQuotaPlan({ run, failures, verifiedAt }) };
};

test('Claude continuation requires current subscription capacity, disabled credits, and the unchanged default context', () => {
  const options = { now: verifiedAt + 1000, environmentVariables: {} };
  assert.equal(validateClaudeCapacityProof(proof, options), verifiedAt);
  for (const change of [{ sessionUsedPercent: 100 }, { weekAllModelsUsedPercent: 100 }, { weekFableUsedPercent: 100 },
    { usageCreditsEnabled: true }, { resetCreditConsumptionAllowed: true }, { checkedAt: '2026-09-08T18:40:00Z' },
    { accountContext: 'another account' }]) assert.throws(() => validateClaudeCapacityProof({ ...proof, ...change }, options));
  for (const key of ['CLAUDE_CONFIG_DIR', 'ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN'])
    assert.throws(() => validateClaudeCapacityProof(proof, { ...options, environmentVariables: { [key]: 'test-override' } }));
});

check('only the 192 untouched slots and one exact historical quota plan are selectable; policy refusals stay terminal', () => {
  const { run, failures, plan } = fixture(), before = JSON.stringify(run);
  const pending = selectClaudePendingPlans(run, failures);
  assert.equal(pending.length, 192);
  assert.equal(plan.rowKey, CLAUDE_QUOTA_ROW);
  assert.ok(!pending.some(item => item.rowKey === CLAUDE_QUOTA_ROW));
  for (const failure of failures.filter(item => item.kind === 'policy')) assert.ok(!pending.some(item => item.rowKey === failure.rowKey));
  assert.equal(JSON.stringify(run), before);
  for (const change of [{ kind: 'policy' }, { source: { ...CLAUDE_QUOTA_STREAM, sha256: '0'.repeat(64) } }]) {
    const modified = failures.map(item => item.rowKey === CLAUDE_QUOTA_ROW ? { ...item, ...change } : item);
    assert.throws(() => selectSingleClaudeQuotaPlan({ run, failures: modified, verifiedAt }));
  }
  run.rows.find(item => item.rowKey === CLAUDE_QUOTA_ROW).outputText = 'Already returned answer.';
  assert.throws(() => selectSingleClaudeQuotaPlan({ run, failures, verifiedAt }), /Returned answers/);
});

test('a new quota stream for the same Claude row opens the circuit', () => {
  const old = { rowKey: CLAUDE_QUOTA_ROW, provider: 'claude', kind: 'quota', configurationId: 'claude:claude-fable-5-1@high', source: CLAUDE_QUOTA_STREAM };
  const fresh = { ...old, source: { ...CLAUDE_QUOTA_STREAM, path: 'provider-streams/new/stdout.jsonl', sha256: '1'.repeat(64) } };
  assert.deepEqual(newClaudeQuotaFailures([old, fresh], new Set([retainedFailureIdentity(old)])), [fresh]);
});
test('model-specific circuits stay scoped while session quota and authentication stop the provider', () => {
  const oldStop = { reason: 'session-usage-limit-reached' };
  const modelStop = { key: 'claude:claude-fable-5-1', reason: 'model-usage-limit-reached' };
  const auth = { key: 'claude', reason: 'authentication-unavailable' };
  const run = { executionHistory: [{ id: 'old', quotaStops: [oldStop] }, { id: 'new', quotaStops: [modelStop, auth] }] };
  assert.deepEqual(newClaudeInvocationStops(run, new Set(['old'])), [modelStop, auth]);
  assert.deepEqual(claudeProviderWideStops([modelStop]), []);
  assert.deepEqual(claudeProviderWideStops([modelStop, oldStop, auth]), [oldStop, auth]);
});

check('single-row recovery passes the exact frozen provider arguments and preserves all other evidence', async () => {
  const { run, snapshot, plan } = fixture(), before = structuredClone(run);
  const source = run.rows.find(row => row.provider === 'claude' && row.model === plan.configuration.model && row.rowStatus === 'complete' && row.conditionId === plan.condition.id);
  assert.ok(source);
  const text = 'Synthetic in-memory unit-test outline. Never dispatch or publish this fixture.';
  const runtimeReceipt = { ...structuredClone(source.runtimeReceipt), requestedConfiguration: structuredClone(plan.configuration),
    requestedReasoning: plan.configuration.reasoning, effectiveEffortRequested: plan.configuration.reasoning,
    outputSha256: hash(text), streamSha256: hash('Synthetic in-memory test stream'), syntheticFixture: true };
  delete runtimeReceipt.rawStreams;
  let calls = 0;
  const result = await executeSingleClaudeQuotaRecovery({ run, snapshot, plan, dispatch: true,
    agentRunnerImplementation: async args => {
      calls++;
      assert.deepEqual(Object.keys(args).sort(), ['configuration', 'promptText', 'environmentVariables', 'privateAudit', 'skillSnapshot', 'requiredSkillFiles', 'requiredSkillReadTransport'].sort());
      assert.deepEqual(args.configuration, before.configurations.find(item => item.id === 'claude:claude-fable-5-1@high'));
      assert.equal(args.promptText, before.benchmark.definition.cases[0].task);
      assert.equal(args.environmentVariables, undefined);
      assert.equal(args.skillSnapshot, snapshot);
      assert.deepEqual(args.requiredSkillFiles, ['SKILL.md', 'references/twists-and-revelations.md']);
      assert.equal(args.requiredSkillReadTransport, 'read-tool');
      assert.equal(args.privateAudit.rowKey, CLAUDE_QUOTA_ROW);
      const dispatch = run.completion.generationDispatches.at(-1);
      assert.equal(args.privateAudit.generationAttemptId, dispatch.id);
      assert.equal(args.privateAudit.invocationId, dispatch.invocationId);
      assert.equal(run.rows.find(item => item.rowKey === CLAUDE_QUOTA_ROW).rowStatus, 'error');
      return { text, runtimeReceipt, usage: null, durationMs: 1, costUsd: null };
    } });
  assert.equal(calls, 1); assert.equal(result.invocation.providerCalls, 1);
  const row = run.rows.find(item => item.rowKey === CLAUDE_QUOTA_ROW), oldRow = before.rows.find(item => item.rowKey === CLAUDE_QUOTA_ROW);
  assert.equal(row.rowStatus, 'complete');
  assert.deepEqual(row.attempts.slice(0, -1), oldRow.attempts);
  for (const previous of before.rows.filter(item => item.rowKey !== CLAUDE_QUOTA_ROW))
    assert.deepEqual(run.rows.find(item => item.rowKey === previous.rowKey), previous);
  assert.deepEqual(run.judging, before.judging);
  assert.deepEqual(run.completion.generationAttempts.slice(0, -1), before.completion.generationAttempts);
  assert.deepEqual(run.completion.judgeAttempts, before.completion.judgeAttempts);
  assert.deepEqual(run.completion.manifest, before.completion.manifest);
  validateTwistsCompletion({ run, snapshot });
});

check('quota and authentication failures append one attempt and pause without retrying', async () => {
  for (const failure of [
    { code: 'AUTH_UNAVAILABLE', message: 'Synthetic authentication failure.' },
    { code: 'EVAL_AGENT_RUNTIME_FAILED', message: 'Synthetic quota failure.', context: { apiErrorStatus: 429, terminalResultIsError: true, terminalResultText: "You've hit your session limit · resets 4:40pm" } }
  ]) {
    const { run, snapshot, plan } = fixture(), oldCount = run.completion.generationAttempts.length;
    let calls = 0;
    const result = await executeSingleClaudeQuotaRecovery({ run, snapshot, plan, dispatch: true,
      shouldPause: () => Boolean(run.executionHistory.at(-1)?.quotaStops?.length),
      agentRunnerImplementation: () => { calls++; throw Object.assign(new Error(failure.message), failure); } });
    assert.equal(calls, 1); assert.equal(result.invocation.paused, true);
    assert.equal(result.invocation.quotaStops.length, 1);
    assert.equal(run.completion.generationAttempts.length, oldCount + 1);
    assert.equal(run.rows.find(item => item.rowKey === CLAUDE_QUOTA_ROW).error.code, failure.code);
    validateTwistsCompletion({ run, snapshot });
  }
});

check('prompt tampering and a pre-dispatch pause cannot make a provider call', async () => {
  const { run, snapshot, plan } = fixture(); let calls = 0;
  const agent = () => { calls++; throw new Error('No test provider call expected.'); };
  await assert.rejects(executeSingleClaudeQuotaRecovery({ run, snapshot, plan: { ...plan, promptText: plan.promptText + ' Changed.' }, dispatch: true, agentRunnerImplementation: agent }));
  await assert.rejects(executeSingleClaudeQuotaRecovery({ run, snapshot, plan: { ...plan, trialNumber: plan.trialNumber + 1 }, dispatch: true, agentRunnerImplementation: agent }), /frozen trial number/);
  await executeSingleClaudeQuotaRecovery({ run, snapshot, plan, dispatch: true, shouldPause: () => true, agentRunnerImplementation: agent });
  assert.equal(calls, 0);
  assert.equal(run.rows.find(item => item.rowKey === CLAUDE_QUOTA_ROW).rowStatus, 'error');
});
