import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBenchmarkConfiguration } from '../../cli/eval/benchmark-models.js';

const expectedModels = ['claude-fable-5-1', 'claude-opus-5'];
const expectedEfforts = ['low', 'medium', 'max'];
const defaultSpecificationPath = fileURLToPath(new URL('./specification.json', import.meta.url));

// Read-only planning: deliberately imports no executor or publication helpers.
export function buildCompactPlan(specification) {
  const selectors = specification.configurations.map(configuration =>
    typeof configuration === 'string' ? configuration : configuration.id);
  const expectedSelectors = expectedModels.flatMap(model =>
    expectedEfforts.map(effort => `claude:${model}@${effort}`));
  assert.deepEqual([...selectors].sort(), [...expectedSelectors].sort(),
    'Compact sampling requires exactly Fable 5.1 and Opus 5 at low, medium, max.');
  const configurations = selectors.map(resolveBenchmarkConfiguration);
  assert.deepEqual(specification.conditions.map(condition => condition.id), ['baseline', 'skill'],
    'Exactly two conditions are required.');
  assert.equal(specification.coverage.trialsPerConfigurationCaseCondition, 1,
    'Compact sampling has no repeated trials.');
  assert.deepEqual(specification.judging.panel,
    ['codex:gpt-6-astra@medium', 'codex:gpt-5.6-sol@medium'],
    'Use exactly the two declared medium-effort judge seats.');
  assert.equal(specification.judging.judgeCount, 2);
  assert.equal(specification.judging.callsPerPairPerSeat, 1);
  assert.equal(specification.treatment.deliveryMode, 'frozen-inline-once',
    'Deliver skill content once inline, not through tool-read loops.');
  assert.deepEqual(specification.treatment.creatorTools, []);
  assert.equal(specification.treatment.optionalReferenceReads, false);
  assert.equal(specification.cases.length, 5, 'Compact sampling has exactly five distinct tasks.');
  assert.equal(new Set(specification.cases.map(task => task.id)).size, 5, 'Task IDs must be unique.');
  const groups = Object.groupBy
    ? Object.groupBy(specification.cases, task => task.benchmarkId)
    : specification.cases.reduce((result, task) => {
      (result[task.benchmarkId] ??= []).push(task);
      return result;
    }, {});
  assert.deepEqual(Object.values(groups).map(tasks => tasks.length).sort(), [1, 1, 3],
    'Expected one place, one one-shot, and three plot-twist tasks.');
  assert.equal(groups['writing-place-generation-v1']?.length, 1);
  assert.equal(groups['storytelling-one-shot-v1']?.length, 1);
  assert.equal(groups['storytelling-plot-twists-compact-v2']?.length, 3);
  for (const task of specification.cases) {
    assert.ok(typeof task.task === 'string' && task.task.trim(), `Missing prompt: ${task.id}`);
  }
  const rows = Object.entries(groups).map(([benchmarkId, tasks]) => ({
    benchmarkId,
    distinctPrompts: tasks.length,
    configurations: configurations.length,
    repetitionsPerPrompt: 1,
    generationsPerConfiguration: tasks.length * 2,
    pairedJudgeCallsPerConfiguration: tasks.length * 2,
    generations: tasks.length * configurations.length * 2,
    pairedJudgeCalls: tasks.length * configurations.length * 2,
    totalCalls: tasks.length * configurations.length * 4
  }));
  const totalGenerations = rows.reduce((sum, row) => sum + row.generations, 0);
  const totalPairedJudgeCalls = rows.reduce((sum, row) => sum + row.pairedJudgeCalls, 0);
  assert.equal(specification.coverage.generationRowCount, totalGenerations);
  assert.equal(specification.coverage.judgeRequestCount, totalPairedJudgeCalls);
  assert.equal(specification.coverage.matchedPairCount, totalGenerations / 2);
  assert.equal(specification.coverage.individualAnswerAssessmentCount, totalPairedJudgeCalls * 2);
  return {
    id: specification.id,
    edition: specification.edition,
    status: 'planned-not-executed',
    configurations,
    rows,
    totalGenerations,
    totalPairedJudgeCalls,
    totalCalls: rows.reduce((sum, row) => sum + row.totalCalls, 0),
    note: 'A paired judge call evaluates both answers. Counts are CLI sessions, not a claim about hidden provider requests. No provider calls or file writes are performed by this command.'
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 2, 'This read-only command takes no arguments and cannot execute benchmarks.');
  const specification = JSON.parse(fs.readFileSync(defaultSpecificationPath, 'utf8'));
  console.log(JSON.stringify(buildCompactPlan(specification), null, 2));
}
