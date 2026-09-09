import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { preparePairedRun, runPairedGenerations, runPairedJudgments, applyPairedRuntimeValidationErratum } from '../../cli/eval/plot-twists-paired-runtime.js';

export function createPairedFixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-paired-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const runDirectoryPath = path.join(directory, 'mock-run'); preparePairedRun({ runDirectoryPath });
  return runDirectoryPath;
}
export function pairedAssessment(ids) {
  const assessment = candidateLabel => ({ candidateLabel, ratings: ids.map(criterionId => ({ criterionId,
    score: candidateLabel === 'A' ? 3 : 4, evidence: 'The sealed room is revealed to be the narrator.', reason: 'The clue changes the ending.' })) });
  return { assessmentA: assessment('A'), assessmentB: assessment('B'), preference: { candidate: 'B',
    reason: 'B develops the consequence more clearly than A.', confidence: 'medium' } };
}
export function codexPairedOutput(text, { extra = [], threadId = 'synthetic-thread' } = {}) {
  return [{ type: 'thread.started', thread_id: threadId }, { type: 'turn.started' }, ...extra,
    { type: 'item.completed', item: { type: 'agent_message', text } },
    { type: 'turn.completed', usage: { input_tokens: 100, output_tokens: 50 } }].map(event => JSON.stringify(event)).join('\n') + '\n';
}
export function claudePairedOutput(model, result) {
  return { type: 'result', subtype: 'success', is_error: false, result, stop_reason: 'end_turn', num_turns: 1,
    session_id: 'synthetic-session', permission_denials: [], usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    modelUsage: { primary: { canonicalModel: model, outputTokens: 50 } }, total_cost_usd: 0.01 };
}
export function mockPairedProvider({ calls = [], answer = null, delayMs = 0, stderr = '', exitCode = 0, track = null } = {}) {
  return (command, args, options) => {
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    child.kill = signal => { child.emit('close', null, signal); return true; };
    const call = { command, args, options, inputText: '' }; calls.push(call); track?.start();
    child.stdin.on('data', chunk => { call.inputText += chunk; });
    child.stdin.on('finish', () => setTimeout(() => {
      const model = args[args.indexOf('--model') + 1];
      let content;
      if (answer) content = answer(call, calls.indexOf(call));
      else if (args.includes('--output-schema')) {
        const schema = JSON.parse(fs.readFileSync(args[args.indexOf('--output-schema') + 1]));
        content = codexPairedOutput(JSON.stringify(pairedAssessment(schema.properties.assessmentA.properties.ratings.items.properties.criterionId.enum)));
      } else content = command === 'codex' ? codexPairedOutput('The sealed room wakes. Its occupant was a memory; the door opens.')
        : claudePairedOutput(model, 'The sealed room wakes. Its occupant was a memory; the door opens.');
      child.stdout.end(typeof content === 'string' ? content : JSON.stringify(content)); child.stderr.end(stderr);
      track?.end(); child.emit('close', exitCode, null);
    }, delayMs));
    return child;
  };
}
export async function completePairedFixture(t) {
  const runDirectoryPath = createPairedFixture(t);
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider() });
  const { snapshot } = await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider() });
  return { runDirectoryPath, snapshot };
}

export async function completeErratumPairedFixture(t) {
  const runDirectoryPath = createPairedFixture(t);
  await runPairedGenerations({ runDirectoryPath, limit: 2, concurrency: 2, spawnImplementation: mockPairedProvider({ answer: (_call, index) => {
    const text = codexPairedOutput('Original corrected final answer ' + index + '.', { extra: index ? [
      { type: 'item.completed', item: { type: 'agent_message', text: 'I am using the supplied storytelling material.' } }
    ] : [] });
    const events = text.trim().split('\n').map(line => JSON.parse(line));
    events.splice(1, 0, { type: 'item.completed', item: { type: 'error',
      message: 'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.' } });
    return events.map(event => JSON.stringify(event)).join('\n') + '\n';
  } }) });
  applyPairedRuntimeValidationErratum({ runDirectoryPath });
  await runPairedGenerations({ runDirectoryPath, spawnImplementation: mockPairedProvider() });
  const { snapshot } = await runPairedJudgments({ runDirectoryPath, spawnImplementation: mockPairedProvider() });
  return { runDirectoryPath, snapshot };
}
