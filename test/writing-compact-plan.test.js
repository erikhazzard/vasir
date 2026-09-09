import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildCompactPlan } from '../benchmarks/writing-compact-v1/plan.mjs';

const readSpec = () => JSON.parse(fs.readFileSync(
  new URL('../benchmarks/writing-compact-v1/specification.json', import.meta.url), 'utf8'));

test('compact Writing uses only the two requested Claude models and three efforts', () => {
  const plan = buildCompactPlan(readSpec());
  assert.equal(plan.configurations.length, 6);
  assert.deepEqual([...new Set(plan.configurations.map(row => row.model))].sort(),
    ['claude-fable-5-1', 'claude-opus-5']);
  assert.deepEqual([...new Set(plan.configurations.map(row => row.reasoning))].sort(),
    ['low', 'max', 'medium']);
});

test('five once-only paired tasks require 60 responses and 60 paired reviews', () => {
  const plan = buildCompactPlan(readSpec());
  assert.equal(plan.totalGenerations, 60);
  assert.equal(plan.totalPairedJudgeCalls, 60);
  assert.equal(plan.totalCalls, 120);
  assert.deepEqual(plan.rows.map(row => row.totalCalls).sort((a, b) => a - b), [24, 24, 72]);
  assert.ok(plan.rows.every(row => row.repetitionsPerPrompt === 1));
  assert.equal(plan.status, 'planned-not-executed');
});

test('expanded model sweeps and duplicate settings fail closed', () => {
  const expanded = readSpec();
  expanded.configurations.push('claude:claude-opus-5@high');
  assert.throws(() => buildCompactPlan(expanded), /exactly Fable/);
  const duplicate = readSpec();
  duplicate.configurations[1] = duplicate.configurations[0];
  assert.throws(() => buildCompactPlan(duplicate), /exactly Fable/);
});

test('extra tasks and duplicate task identifiers fail closed', () => {
  const expanded = readSpec();
  expanded.cases.push({ ...expanded.cases[0], id: 'extra-task' });
  assert.throws(() => buildCompactPlan(expanded), /exactly five/);
  const duplicate = readSpec();
  duplicate.cases[1].id = duplicate.cases[0].id;
  assert.throws(() => buildCompactPlan(duplicate), /unique/);
});

test('planning does not mutate the definition', () => {
  const spec = readSpec();
  const original = JSON.stringify(spec);
  buildCompactPlan(spec);
  assert.equal(JSON.stringify(spec), original);
});

test('repeated trials, extra judges, and tool-read loops cannot silently expand the plan', () => {
  const repeated = readSpec();
  repeated.coverage.trialsPerConfigurationCaseCondition = 10;
  assert.throws(() => buildCompactPlan(repeated), /no repeated trials/);
  const extraJudge = readSpec();
  extraJudge.judging.panel.push('codex:gpt-6-astra@ultra');
  assert.throws(() => buildCompactPlan(extraJudge), /two declared/);
  const toolReads = readSpec();
  toolReads.treatment.deliveryMode = 'progressive-tool-reads';
  assert.throws(() => buildCompactPlan(toolReads), /once inline/);
});

test('declared coverage must agree with the derived plan', () => {
  const spec = readSpec();
  spec.coverage.generationRowCount = 820;
  assert.throws(() => buildCompactPlan(spec));
});
