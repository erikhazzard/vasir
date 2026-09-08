import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createBenchmarkHash } from '../cli/eval/benchmark-source.js';
import { createStorytellingSkillInstruction } from '../cli/eval/storytelling-agent-runtime.js';
import { createTwistsCompletion, createRetainedTwistsAgentRunner, eligibleCompletionPlans, executeTwistsCompletion, validateTwistsCompletion, TWISTS_PARENT_DIRECTORY, TWISTS_PARENT_SHA256 } from '../cli/eval/plot-twists-completion.js';
import { projectWritingRun, validateWritingPublication } from '../cli/eval/writing-publication.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const parentPath = `${root}${TWISTS_PARENT_DIRECTORY}/run.json`;
const available = fs.existsSync(parentPath);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const parentSource = available ? fs.readFileSync(parentPath, 'utf8') : null;
const snapshot = available ? JSON.parse(fs.readFileSync(`${root}${TWISTS_PARENT_DIRECTORY}/skill-snapshot.json`, 'utf8')) : null;
const fixture = () => createTwistsCompletion({ parentSource, snapshot, runId: 'synthetic-completion-test', frozenAt: '2026-09-08T18:00:00Z' });
const check = (name, fn) => test(name, { skip: !available && 'Pinned private original source is not present; no substitute results are used.' }, fn);

// Synthetic provider receipts exist only inside these in-memory tests. They are
// never saved into a real benchmark directory or eligible publication source.
function readReceipt(snapshot, required, transport) {
  let next = 0;
  const mcp = transport === 'mcp-chunks';
  return { policyVersion: mcp ? 'successful-frozen-mcp-chunks-v1' : 'successful-frozen-read-tool-chunks-v1',
    requiredFiles: [...required].sort(), evidence: mcp ? 'successful-mcp-tool-output-frozen-byte-match' : 'successful-read-tool-output-frozen-byte-match', status: 'complete',
    files: [...required].sort().map(relativePath => {
      const file = snapshot.files.find(file => file.relativePath === relativePath), chunks = [];
      let content = '', bytes = 0;
      const flush = () => { chunks.push({ index: next++, bytes, sha256: hash(content), toolEventId: 'synthetic-test-event' }); content = ''; bytes = 0; };
      for (const character of file.contents) { const size = Buffer.byteLength(character); if (bytes + size > 8000) flush(); content += character; bytes += size; }
      if (content || !chunks.length) flush();
      return { relativePath, sha256: file.sha256, bytes: Buffer.byteLength(file.contents), requiredChunkCount: chunks.length, complete: true, observedChunks: chunks };
    }) };
}
function syntheticAgent(args) {
  const { configuration, promptText, skillSnapshot, requiredSkillFiles = [], requiredSkillReadTransport: transport, outputSchema } = args;
  const text = outputSchema ? JSON.stringify({ evaluations: outputSchema.properties.evaluations.items.properties.candidateId.enum.map(candidateId => ({ candidateId, gates: [],
    dimensions: JSON.parse(parentSource).benchmark.definition.scoring.dimensions.map(dimension => ({ id: dimension.id, rating: 7 })), reason: 'Synthetic unit-test review; not measured benchmark evidence.' })) }) : 'Synthetic unit-test outline; never dispatch or publish this text.';
  const source = JSON.parse(parentSource).rows.find(row => row.rowStatus === 'complete' && row.conditionId === (skillSnapshot ? 'skill:writing-storytelling' : 'clean'));
  const runtimeReceipt = { ...structuredClone(source.runtimeReceipt), requestedConfiguration: { ...configuration }, requestedModel: configuration.model, requestedReasoning: configuration.reasoning,
    effectiveEffortRequested: configuration.reasoning, userPromptSha256: hash(promptText), outputSha256: hash(text), skillHash: skillSnapshot?.hash ?? null,
    instructionHash: skillSnapshot ? hash(createStorytellingSkillInstruction({ skillSnapshot, requiredSkillFiles, requiredSkillReadTransport: transport, skillDirectoryPath: '<frozen-skill-directory>' })) : null,
    runtimeVersion: transport === 'mcp-chunks' ? 'progressive-frozen-skill-mcp-chunks-v1' : transport === 'read-tool' ? 'progressive-frozen-skill-read-tool-v1' : 'progressive-frozen-skill-v2',
    nonMessageItemCount: 0, allowedTools: [], cli: configuration.provider };
  if (transport) Object.assign(runtimeReceipt, { requiredSkillReadTransport: transport,
    writingIsolation: { version: 'writing-frozen-workspace-only-v1', hostSkillDiscovery: false, projectInstructions: false, externalResources: false, fileScope: 'fresh-workspace-only' },
    ...(transport === 'read-tool' ? { fileToolScope: 'restricted-working-directory' } : { localReadTool: 'benchmark_reader.read_chunk', localReadToolScope: 'frozen-chunk-indices-only' }) });
  delete runtimeReceipt.requiredSkillReads;
  if (configuration.provider === 'claude') Object.assign(runtimeReceipt, { canonicalModels: [configuration.model], targetCanonicalModel: configuration.model, targetCanonicalModelOutputTokens: 8, allowedTools: ['Read'] });
  if (skillSnapshot) runtimeReceipt.requiredSkillReads = readReceipt(skillSnapshot, requiredSkillFiles, transport);
  return { text, runtimeReceipt, durationMs: 1, usage: null, costUsd: null };
}

check('completion freezes all33 settings and preserves original source, valid answers and failures', () => {
  const { run, manifest } = fixture();
  assert.equal(hash(run.completion.parentSource), TWISTS_PARENT_SHA256);
  assert.equal(run.rows.length, 660); assert.equal(run.configurations.length, 33);
  assert.deepEqual(Object.fromEntries(['cleanup', 'codex', 'claude', 'all'].map(stage => [stage, eligibleCompletionPlans(run, { stage }).length])), { cleanup: 2, codex: 382, claude: 200, all: 582 });
  assert.equal(run.rows.filter(row => row.rowStatus === 'complete').length, 78);
  assert.equal(run.completion.failedAttempts.length, 2);
  assert.equal(manifest.origins.filter(origin => origin.kind === 'inherited').length, 78);
  assert.equal(manifest.origins.filter(origin => origin.kind === 'recovery').length, 2);
  assert.equal(manifest.origins.filter(origin => origin.kind === 'new').length, 580);
  assert.equal(manifest.runtimeSources.length, 9);
  assert.ok(eligibleCompletionPlans(run, { stage: 'all' }).slice(0, 2).every(plan => manifest.origins.find(origin => origin.rowKey === plan.rowKey).kind === 'recovery'));
});

check('completion rejects original-answer, failed-lineage, score, task and transport tampering', () => {
  for (const mutate of [
    run => { run.rows.find(row => row.rowStatus === 'complete').outputText += ' changed'; },
    run => { run.completion.failedAttempts[0].outputText += ' changed'; },
    run => { run.rows.find(row => row.score).score.total = 0; },
    run => { run.benchmark.definition.cases[0].task += ' changed'; },
    run => { run.completion.manifest.origins[0].transport = 'read-tool'; run.storytelling.manifestHash = createBenchmarkHash(run.completion.manifest); }
  ]) { const { run } = fixture(); mutate(run); assert.throws(() => validateTwistsCompletion({ run, snapshot })); }
});

check('execution requires explicit dispatch and reuses all76 original judge calls without provider calls', async () => {
  const { run } = fixture();
  await assert.rejects(executeTwistsCompletion({ run, snapshot }), /explicit dispatch/);
  const before = structuredClone(run.judging.judges.flatMap(judge => judge.batches));
  let calls = 0;
  await executeTwistsCompletion({ run, snapshot, dispatch: true, mode: 'judging', agentRunnerImplementation: () => { calls++; throw Error('No new pairs exist'); } });
  assert.equal(calls, 0);
  assert.deepEqual(run.judging.judges.flatMap(judge => judge.batches).sort((a, b) => a.promptHash.localeCompare(b.promptHash)), before.sort((a, b) => a.promptHash.localeCompare(b.promptHash)));
});

check('two operational recoveries use declared MCP transport, retain failed predecessors, then receive only four new reviews', async () => {
  const { run } = fixture(); let calls = 0; const events = [];
  const agent = args => { calls++; assert.equal(args.requiredSkillReadTransport, args.outputSchema ? undefined : 'mcp-chunks'); return syntheticAgent(args); };
  await executeTwistsCompletion({ run, snapshot, dispatch: true, stage: 'cleanup', agentRunnerImplementation: agent, onCheckpoint: ({ event }) => events.push(event) });
  assert.equal(calls, 2); assert.equal(run.rows.filter(row => row.rowStatus === 'complete').length, 80);
  assert.equal(run.completion.generationDispatches.length, 2); assert.equal(run.completion.generationAttempts.length, 2);
  assert.equal(run.completion.failedAttempts.length, 2); assert.equal(eligibleCompletionPlans(run).length, 0);
  assert.ok(events.indexOf('generation-dispatched') < events.indexOf('generation-complete'));
  await executeTwistsCompletion({ run, snapshot, dispatch: true, mode: 'judging', agentRunnerImplementation: agent });
  assert.equal(calls, 6); assert.equal(run.rows.filter(row => row.score).length, 80);
  assert.equal(run.completion.judgeAttempts.length, 4);
  const projected = projectWritingRun({ run, snapshot, sourceSha256: hash(JSON.stringify(run)) });
  assert.equal(projected.projection.coverage.completedSettingCount, 4);
  assert.equal(projected.responseBundle.supersededResponses.length, 2);
  validateWritingPublication(projected.projection, projected.responseBundle);
});

check('quota, authentication, output policy and nonempty failed reads are never empty-output retries', async () => {
  for (const failure of [
    { code: 'AUTH_UNAVAILABLE', message: 'Authentication unavailable' },
    { code: 'EVAL_AGENT_RUNTIME_FAILED', message: "You've hit your usage limit", context: { apiErrorStatus: 429 } },
    { code: 'EVAL_AGENT_RUNTIME_FAILED', message: 'Policy failed', context: { apiErrorStatus: 400, stdout: '{"type":"result","is_error":true,"result":"API Error: 400 Output blocked by content filtering policy"}' } }
  ]) {
    const { run } = fixture(); const stage = failure.context?.apiErrorStatus === 400 ? 'claude' : 'cleanup';
    await executeTwistsCompletion({ run, snapshot, dispatch: true, stage, maxRows: 1, agentRunnerImplementation: () => { throw Object.assign(Error(failure.message), failure); } });
    const failed = run.completion.generationAttempts[0].rowKey;
    assert.ok(!eligibleCompletionPlans(run, { stage, retryFailed: true }).some(plan => plan.rowKey === failed));
  }
});

check('pause drains the active request and leaves undispatched work resumable', async () => {
  const { run } = fixture(); let paused = false, calls = 0;
  const result = await executeTwistsCompletion({ run, snapshot, dispatch: true, concurrency: 1, shouldPause: () => paused,
    agentRunnerImplementation: args => { calls++; paused = true; return syntheticAgent(args); } });
  assert.equal(calls, 1); assert.equal(result.invocation.paused, true); assert.equal(eligibleCompletionPlans(run).length, 1);
  assert.equal(run.summary.unresolvedDispatchCount, 0);
});

check('publication keeps two failed predecessor answers separate from660 active logical cells', () => {
  const { run } = fixture(); const result = projectWritingRun({ run, snapshot, sourceSha256: hash(JSON.stringify(run)) });
  assert.equal(result.responseBundle.responses.length, 660);
  assert.equal(result.responseBundle.supersededResponses.length, 2);
  assert.ok(result.responseBundle.supersededResponses.every(response => response.judgments.length === 0 && response.score === null));
  assert.equal(result.projection.coverage.judgmentCount, 152);
  assert.ok(result.responseBundle.promptFiles.some(file => file.id === 'frozen-skill-root-mcp-chunks'));
  assert.ok(result.responseBundle.promptFiles.some(file => file.id === 'frozen-skill-root-read-tool'));
  const bad = structuredClone(result.responseBundle); bad.supersededResponses[0].score = 100;
  assert.throws(() => validateWritingPublication(result.projection, bad), /original failed/);
});

check('both new Claude arms use the identical declared transport with no skill in the plain arm', async () => {
  const { run } = fixture(), exposures = [];
  await executeTwistsCompletion({ run, snapshot, dispatch: true, stage: 'claude', maxRows: 2, agentRunnerImplementation: args => {
    assert.equal(args.requiredSkillReadTransport, 'read-tool'); exposures.push(Boolean(args.skillSnapshot)); return syntheticAgent(args);
  } });
  assert.deepEqual(exposures.sort(), [false, true]);
  const publication = projectWritingRun({ run, snapshot, sourceSha256: hash(JSON.stringify(run)) });
  const generated = publication.responseBundle.responses.filter(response => response.provenance.completion.origin === 'new' && response.outputText);
  assert.equal(generated.length, 2);
  assert.equal(generated.find(response => response.condition === 'baseline').provenance.skillSha256, null);
  assert.equal(generated.find(response => response.condition === 'skill').provenance.completion.instructionFileId, 'frozen-skill-root-read-tool');
});

check('a pre-dispatch interruption does not silently replay an unresolved slot', async () => {
  const { run } = fixture(); let calls = 0;
  await assert.rejects(executeTwistsCompletion({ run, snapshot, dispatch: true, concurrency: 1, agentRunnerImplementation: () => { calls++; },
    onCheckpoint: ({ event }) => { if (event === 'generation-dispatched') throw Error('Synthetic interrupted checkpoint'); } }), /Synthetic interrupted/);
  assert.equal(calls, 0);
  assert.equal(run.completion.generationDispatches.length, 1);
  assert.equal(run.completion.generationAttempts.length, 0);
  assert.equal(eligibleCompletionPlans(run, { retryFailed: true }).length, 1);
  validateTwistsCompletion({ run, snapshot });
});

test('private raw streams are captured before Claude canonical adaptation with exact bytes', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'twists-stream-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const stdout = [{ type: 'assistant', message: { content: [{ type: 'text', text: 'Synthetic raw event Ω.' }] } },
    { type: 'result', subtype: 'success', is_error: false, result: 'Synthetic result.', session_id: 'private-test-session', modelUsage: { main: { canonicalModel: 'claude-opus-5', outputTokens: 3 } }, usage: { input_tokens: 10, output_tokens: 3 } }].map(JSON.stringify).join('\n');
  const stderr = 'Synthetic diagnostic Ω.\n';
  const runner = createRetainedTwistsAgentRunner({ directory, spawnImplementation: () => {
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough(); child.kill = () => {};
    queueMicrotask(() => { child.stdout.end(stdout); child.stderr.end(stderr); child.emit('close', 0, null); }); return child;
  } });
  const result = await runner({ configuration: { id: 'claude:claude-opus-5@low', provider: 'claude', model: 'claude-opus-5', reasoning: 'low' }, promptText: 'Synthetic non-benchmark stream test.', requiredSkillReadTransport: 'read-tool' });
  const receipt = result.runtimeReceipt.rawStreams;
  assert.equal(fs.readFileSync(path.join(directory, receipt.stdout.path), 'utf8'), stdout);
  assert.equal(fs.readFileSync(path.join(directory, receipt.stderr.path), 'utf8'), stderr);
  assert.equal(receipt.stdout.sha256, hash(stdout)); assert.equal(receipt.stderr.sha256, hash(stderr));
  assert.equal(receipt.stdout.sha256, result.runtimeReceipt.streamSha256);
  assert.equal(result.text, 'Synthetic result.');
});
