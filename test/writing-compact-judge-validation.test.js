import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectCompactJudgeOriginal, COMPACT_JUDGE_DIAGNOSTIC_POLICY } from '../cli/eval/writing-compact-judge-validation.js';
import { compactDigest } from '../cli/eval/writing-compact-runtime.js';

function fixture() {
  const configuration = { id: 'codex:gpt-6-astra@medium', provider: 'codex', model: 'gpt-6-astra', reasoning: 'medium' };
  const task = { rubric: ['fulfillment-and-usefulness', 'coherent-story', 'revelation-quality', 'consequence-and-interest'].map(id => ({ id })) };
  const assessment = label => ({ candidateLabel: label, ratings: task.rubric.map(({ id }) => ({
    criterionId: id, score: 3, evidence: 'The protagonist saves the town.', reason: 'The decision determines the ending.'
  })) });
  const responseText = JSON.stringify({ assessmentA: assessment('A'), assessmentB: assessment('B'),
    preference: { candidate: 'tie', reason: 'Both outcomes follow the choices.', confidence: 'medium' } });
  const args = ['exec', '--ephemeral', '--ignore-user-config', '--ignore-rules', '--skip-git-repo-check',
    '--sandbox', 'read-only', '--model', 'gpt-6-astra', '--config', 'model_reasoning_effort="medium"', '--json',
    '--output-schema', '/temporary/output-schema.json', '--enable', 'skip_host_skill_discovery',
    ...['skill_search', 'shell_tool', 'apps', 'multi_agent', 'unbounded_connection_retries', 'plugins', 'remote_plugin',
      'browser_use', 'browser_use_external', 'in_app_browser', 'image_generation', 'view_image'].flatMap(feature => ['--disable', feature]),
    '--config', 'project_doc_max_bytes=0', '--config', 'developer_instructions=""', '--config', 'web_search="disabled"', '-'];
  const events = [
    { type: 'thread.started', thread_id: 'original-thread' },
    { type: 'item.completed', item: { id: 'item_0', type: 'error',
      message: `${COMPACT_JUDGE_DIAGNOSTIC_POLICY.allowedWarningPrefix}/test account/config.toml.` } },
    { type: 'turn.started' },
    { type: 'item.completed', item: { id: 'item_1', type: 'agent_message', text: responseText } },
    { type: 'turn.completed', usage: { input_tokens: 100, cached_input_tokens: 20, output_tokens: 50, reasoning_output_tokens: 10 } }
  ];
  const promptText = 'Original task and intact anonymous pair.';
  const record = { status: 'failed', error: { name: 'AssertionError', code: 'ERR_ASSERTION',
    message: 'Judges cannot use tools.\n\n1 !== 0\n' }, responseText,
    globalStopReason: null, outputSha256: compactDigest(responseText), promptText, promptSha256: compactDigest(promptText),
    inputPayloadSha256: compactDigest({ systemAppend: null, user: promptText }), bundleSha256: null,
    usage: { inputTokens: 100, cachedInputTokens: 20, cacheWriteInputTokens: 0, outputTokens: 50, reasoningOutputTokens: 10, totalTokens: 150 },
    runtimeReceipt: { cli: 'codex', requestedModel: 'gpt-6-astra', requestedReasoning: 'medium',
      freshSession: true, persistedSession: false, exitCode: 0, signal: null, rawStreamsRetained: true,
      terminalEvidence: null, cliArguments: args, outputSha256: compactDigest(responseText), promptSha256: compactDigest(promptText),
      inputPayloadSha256: compactDigest({ systemAppend: null, user: promptText }), threadId: 'original-thread',
      itemTypeCounts: { error: 1, agent_message: 1 }, nonMessageItemCount: 1 }
  };
  return { configuration, task, record, events };
}

function input(fixture) {
  const rawStdout = fixture.events.map(event => JSON.stringify(event)).join('\n');
  fixture.record.runtimeReceipt.rawStdoutSha256 = compactDigest(rawStdout);
  return { ...fixture, rawStdout };
}

test('offline validation preserves original ratings and counts the exact pre-turn diagnostic without treating it as a tool', () => {
  const data = fixture(), before = structuredClone(data.record);
  const inspected = inspectCompactJudgeOriginal(input(data));
  assert.equal(inspected.assessmentA.ratings[0].score, 3);
  assert.equal(inspected.preference.candidate, 'tie');
  assert.equal(inspected.validationReceipt.startupDiagnosticCount, 1);
  assert.equal(inspected.validationReceipt.toolCallCount, 0);
  assert.equal(inspected.validationReceipt.additionalInferenceCalls, 0);
  delete data.record.runtimeReceipt.rawStdoutSha256;
  assert.deepEqual(data.record, before, 'The original record is never modified by validation.');
});

test('same warning after turn start, duplicate warnings, and any other error are rejected', () => {
  const after = fixture();
  [after.events[1], after.events[2]] = [after.events[2], after.events[1]];
  assert.throws(() => inspectCompactJudgeOriginal(input(after)), /before the model turn/);
  const duplicate = fixture(); duplicate.events.splice(2, 0, structuredClone(duplicate.events[1]));
  assert.throws(() => inspectCompactJudgeOriginal(input(duplicate)), /Exactly the one known/);
  const changed = fixture(); changed.events[1].item.message += ' Retry the failed request.';
  assert.throws(() => inspectCompactJudgeOriginal(input(changed)), /Other error items/);
  const otherFeature = fixture(); otherFeature.events[1].item.message = otherFeature.events[1].item.message.replace('enabled: skip_host_skill_discovery.', 'enabled: skip_host_skill_discovery, another_feature.');
  assert.throws(() => inspectCompactJudgeOriginal(input(otherFeature)), /Other error items/);
  const error = fixture(); error.events.splice(3, 0, { type: 'error', message: 'Provider failed' });
  assert.throws(() => inspectCompactJudgeOriginal(input(error)), /Unexpected error/);
});

test('actual tool events, including an incomplete tool start, remain forbidden', () => {
  for (const type of ['item.started', 'item.completed']) {
    const data = fixture();
    data.events.splice(3, 0, { type, item: { id: 'tool', type: 'command_execution', command: 'true' } });
    assert.throws(() => inspectCompactJudgeOriginal(input(data)), /all actual tools/);
  }
});

test('missing completion, repeated turns, wrong final text, changed model, and invalid ratings are rejected', () => {
  const incomplete = fixture(); incomplete.events.pop();
  assert.throws(() => inspectCompactJudgeOriginal(input(incomplete)), /completed turn/);
  const repeated = fixture(); repeated.events.splice(3, 0, { type: 'turn.started' });
  assert.throws(() => inspectCompactJudgeOriginal(input(repeated)), /started turn/);
  const changedText = fixture(); changedText.events[3].item.text += ' Extra text';
  assert.throws(() => inspectCompactJudgeOriginal(input(changedText)), /final answer differs/);
  const wrongModel = fixture(); wrongModel.record.runtimeReceipt.requestedModel = 'gpt-5.6-sol';
  assert.throws(() => inspectCompactJudgeOriginal(input(wrongModel)));
  const invalid = fixture(); const value = JSON.parse(invalid.record.responseText); value.assessmentA.ratings[0].score = 3.5;
  invalid.record.responseText = invalid.events[3].item.text = JSON.stringify(value);
  invalid.record.outputSha256 = invalid.record.runtimeReceipt.outputSha256 = compactDigest(invalid.record.responseText);
  assert.throws(() => inspectCompactJudgeOriginal(input(invalid)), /integer/);
});

test('unrelated failures, raw tampering, changed prompt, and changed usage cannot be reclassified', () => {
  const other = fixture(); other.record.error.message = 'A different validation failed.';
  assert.throws(() => inspectCompactJudgeOriginal(input(other)), /Unrelated validation failures/);
  const raw = input(fixture()); raw.rawStdout += '\n';
  assert.throws(() => inspectCompactJudgeOriginal(raw), /raw stream changed/);
  const prompt = fixture(); prompt.record.promptText += ' Changed';
  assert.throws(() => inspectCompactJudgeOriginal(input(prompt)));
  const usage = fixture(); usage.record.usage.outputTokens = 500;
  assert.throws(() => inspectCompactJudgeOriginal(input(usage)), /usage differs/);
});
