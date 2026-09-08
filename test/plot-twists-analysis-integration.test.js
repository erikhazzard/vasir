import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";

import { analyzeTwistRun } from "../benchmarks/storytelling-plot-twists/analyze.mjs";
import { runStorytellingBenchmark } from "../cli/eval/run-storytelling-benchmark.js";
import { runStorytellingAgent } from "../cli/eval/storytelling-agent-runtime.js";
import { projectWritingRun } from "../cli/eval/writing-publication.js";

const REPO = path.resolve(import.meta.dirname, "..");
const DEFINITION = JSON.parse(fs.readFileSync(path.join(REPO, "benchmarks/storytelling-plot-twists/benchmark.json"), "utf8"));
const REQUIRED_FILES = ["SKILL.md", "references/twists-and-revelations.md"];
const hash = value => crypto.createHash("sha256").update(value).digest("hex");

function writeFixture(root, relativePath, contents) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

// This replaces only the provider process. The real runtime stages its frozen
// helper, parses tool events, and constructs receipts; the real runner and
// judge then build the durable inventory, anonymous mappings, and score hashes.
// The only child processes launched by this test are local Node read helpers.
function fixtureProvider({ configuration, text, generation, onRead }) {
  return (command, args, options) => {
    assert.equal(command, "codex");
    assert.equal(args[args.indexOf("--model") + 1], configuration.model);
    const events = [{ type: "thread.started", thread_id: "private-fixture-thread" }];
    const override = args.find(argument => argument.startsWith("developer_instructions="));
    if (override) {
      assert.equal(generation, true, "Judges must never receive the storytelling instructions.");
      const instruction = JSON.parse(override.slice("developer_instructions=".length));
      const commands = [...instruction.matchAll(/^node '([^']+)' ([0-9]+) # (.+)$/gmu)];
      assert.equal(commands.length, 2, "Both small frozen fixture files must be read.");
      for (const [, helperPath, index, relativePath] of commands) {
        const output = execFileSync(process.execPath, [helperPath, index], { cwd: options.cwd, encoding: "utf8" });
        onRead(relativePath);
        events.push({ type: "item.completed", item: { type: "command_execution", id: `private-read-${index}`,
          command: `node '${helperPath}' ${index}`, status: "completed", exit_code: 0, aggregated_output: output } });
      }
    }
    events.push({ type: "item.completed", item: { type: "agent_message", text } },
      { type: "turn.completed", usage: { input_tokens: 100, output_tokens: 25 } });
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    child.kill = () => {};
    queueMicrotask(() => {
      child.stdout.end(events.map(JSON.stringify).join("\n"));
      child.emit("close", 0, null);
    });
    return child;
  };
}

async function createRunFixture(t, { failOneSolBatch = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-twists-analysis-integration-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeFixture(root, `benchmarks/${DEFINITION.id}/benchmark.json`, JSON.stringify(DEFINITION));
  writeFixture(root, ".agents/skills/writing-storytelling/SKILL.md",
    "---\nname: writing-storytelling\n---\nRead references/twists-and-revelations.md completely. This is synthetic test material.\n");
  writeFixture(root, ".agents/skills/writing-storytelling/references/twists-and-revelations.md",
    "Synthetic test reference: connect the stated consequence to the specified action. Unicode fixture: 🌌.\n");
  const answers = new Map();
  const calls = { generations: 0, judges: [], reads: [] };
  let failed = false;
  const result = await runStorytellingBenchmark({
    benchmarkName: DEFINITION.id, projectRootDirectory: root, currentWorkingDirectory: root,
    requestedModelArguments: DEFINITION.preRegistration.modelSelectors,
    trialCount: DEFINITION.preRegistration.trialsPerConfigurationAndCondition,
    seed: DEFINITION.preRegistration.generationOrderSeed, requiredSkillFiles: REQUIRED_FILES,
    generationConcurrency: 4, judgeConcurrency: 4,
    runId: failOneSolBatch ? "incomplete-fixture" : "complete-fixture", environmentVariables: {},
    agentRunnerImplementation: async args => {
      const { configuration, outputSchema, skillSnapshot, promptText } = args;
      let text;
      if (!outputSchema) {
        assert.equal(promptText, DEFINITION.cases[0].task);
        calls.generations += 1;
        text = `Synthetic integration response ${calls.generations}. The stated action has a consequential result.`;
        answers.set(text, { treatment: Boolean(skillSnapshot) });
      } else {
        calls.judges.push(configuration.id);
        assert.equal(skillSnapshot, undefined);
        if (failOneSolBatch && configuration.model === "gpt-5.6-sol" && !failed) {
          failed = true;
          throw Object.assign(new Error("One synthetic judge transport failed."), { code: "EVAL_AGENT_RUNTIME_FAILED" });
        }
        const anonymousAnswers = new Map([...promptText.matchAll(/<candidate id="([^"]+)" case="[^"]+">[\s\S]*?<answer>([\s\S]*?)<\/answer>\n<\/candidate>/gu)]
          .map(match => [match[1], match[2]]));
        text = JSON.stringify({ evaluations: outputSchema.properties.evaluations.items.properties.candidateId.enum.map(candidateId => {
          const answer = answers.get(anonymousAnswers.get(candidateId));
          assert.ok(answer, "Every judge input must contain an original retained fixture answer.");
          return { candidateId, gates: [], dimensions: DEFINITION.scoring.dimensions.map((dimension, index) => ({
            id: dimension.id, rating: 6 + Number(answer.treatment) + Number(configuration.model === "gpt-5.6-sol" && index === 4)
          })), reason: "The retained fixture connects its specified action to a consequential result; the independent rating records that relationship." };
        }) });
      }
      return runStorytellingAgent({ ...args, spawnImplementation: fixtureProvider({ configuration, text,
        generation: !outputSchema, onRead: relativePath => calls.reads.push(relativePath) }) });
    }
  });
  const runPath = path.join(result.outputDirectory, "run.json");
  const source = fs.readFileSync(runPath, "utf8");
  const run = JSON.parse(source);
  const snapshot = JSON.parse(fs.readFileSync(path.join(result.outputDirectory, "skill-snapshot.json"), "utf8"));
  const project = (value = run) => projectWritingRun({ run: value, snapshot, sourceSha256: hash(JSON.stringify(value)) });
  const analyze = (value = run) => analyzeTwistRun(value, { snapshot, sourceSha256: hash(JSON.stringify(value)) });
  return { run, runPath, source, snapshot, calls, project, analyze };
}

test("real runner receipts, two-model judging, projection and analysis retain the declared weighted experiment", async t => {
  const f = await createRunFixture(t);
  const { projection, responseBundle } = f.project();
  const analysis = f.analyze();
  assert.equal(f.calls.generations, 80);
  assert.equal(f.calls.judges.length, 80);
  assert.deepEqual([...new Set(f.calls.judges)].sort(), [...DEFINITION.judging.panel].sort());
  assert.ok(f.run.judging.judges.every(judge => judge.configuration.provider === "codex" && judge.batches.length === 40));
  assert.equal(f.calls.reads.length, 80);
  for (const relativePath of REQUIRED_FILES) assert.equal(f.calls.reads.filter(file => file === relativePath).length, 40);
  assert.equal(projection.scoreBasis.dimensions.length, 7);
  assert.deepEqual(projection.scoreBasis.dimensions.map(dimension => dimension.weight), [10, 10, 20, 20, 15, 10, 15]);
  assert.equal(analysis.validation, "publication-source-provenance-and-runtime-validation-plus-independent-arithmetic");
  assert.deepEqual(analysis.coverage, { expectedAnswers: 80, completeAnswers: 80,
    expectedAssessments: 160, completeAssessments: 160, completePairs: 40 });
  for (const row of f.run.rows) assert.equal(row.score.total, row.conditionId === "clean" ? 60.8 : 70.8);
  for (const cell of projection.caseResults) assert.equal(cell.exactScore, cell.condition === "baseline" ? 60.75 : 70.75);
  for (const configuration of analysis.configurations) {
    assert.equal(configuration.baseline.score, 60.75);
    assert.equal(configuration.skill.score, 70.75);
    assert.equal(configuration.delta, 10);
    assert.deepEqual(Object.values(configuration.perJudgeDeltas), [10, 10]);
    assert.equal(configuration.bootstrap95.low, 10);
    assert.equal(configuration.bootstrap95.high, 10);
    assert.equal(configuration.availablePairDiagnostics, null);
    assert.ok(configuration.trials.every(trial => trial.baseline.score === 60.75 && trial.skill.score === 70.75));
  }
  assert.ok(responseBundle.responses.filter(response => response.condition === "skill")
    .every(response => response.runtime.requiredSkillReads.status === "complete"));
  assert.doesNotMatch(JSON.stringify(responseBundle), /private-fixture-thread|private-read-/u);

  await t.test("analysis CLI requires and validates the sibling frozen snapshot", () => {
    const output = JSON.parse(execFileSync(process.execPath,
      [path.join(REPO, "benchmarks/storytelling-plot-twists/analyze.mjs"), f.runPath], { encoding: "utf8" }));
    assert.equal(output.sourceSha256, hash(f.source));
    assert.equal(output.validation, analysis.validation);
    assert.deepEqual(output.configurations, analysis.configurations);
  });

  await t.test("required reading cannot be replaced with a claim of complete exposure", () => {
    const changed = structuredClone(f.run);
    const row = changed.rows.find(row => row.conditionId === "skill:writing-storytelling");
    row.runtimeReceipt.requiredSkillReads.files[1].observedChunks = [];
    assert.throws(() => f.project(changed), /required frozen skill read evidence/u);
    assert.throws(() => f.analyze(changed), /required frozen skill read evidence/u);
  });

  await t.test("changed answer bytes are rejected even after their local hashes are updated", () => {
    const changed = structuredClone(f.run);
    changed.rows[0].outputText += " Altered after judging.";
    changed.rows[0].outputHash = hash(changed.rows[0].outputText);
    changed.rows[0].runtimeReceipt.outputSha256 = changed.rows[0].outputHash;
    assert.throws(() => f.analyze(changed), /original answer/u);
  });

  await t.test("normalized judgments must still match the original provider output", () => {
    const changed = structuredClone(f.run);
    const batch = changed.judging.judges[0].batches[0];
    const original = JSON.parse(batch.outputText);
    original.evaluations[0].dimensions[0].rating += 1;
    batch.outputText = JSON.stringify(original);
    batch.runtimeReceipt.outputSha256 = hash(batch.outputText);
    assert.throws(() => f.analyze(changed), /original judge output/u);
  });

  await t.test("rehashing swapped assessments cannot change their anonymous candidate mapping", () => {
    const changed = structuredClone(f.run);
    const batch = changed.judging.judges[0].batches[0];
    [batch.evaluations[0].rowKey, batch.evaluations[1].rowKey] = [batch.evaluations[1].rowKey, batch.evaluations[0].rowKey];
    for (const evaluation of batch.evaluations) {
      const { evaluationHash: ignored, ...body } = evaluation;
      evaluation.evaluationHash = hash(JSON.stringify(body));
    }
    batch.evaluationHash = hash(JSON.stringify(batch.evaluations));
    assert.throws(() => f.analyze(changed), /anonymous candidate identity/u);
  });
});

test("one failed original judge batch withholds that configuration while retaining all declared slots", async t => {
  const f = await createRunFixture(t, { failOneSolBatch: true });
  const { projection, responseBundle } = f.project();
  const analysis = f.analyze();
  assert.equal(f.run.runStatus, "incomplete");
  assert.equal(analysis.coverage.expectedAnswers, 80);
  assert.equal(analysis.coverage.completeAnswers, 80);
  assert.equal(analysis.coverage.expectedAssessments, 160);
  assert.equal(analysis.coverage.completeAssessments, 158);
  assert.equal(analysis.coverage.completePairs, 39);
  assert.equal(responseBundle.responses.length, 80);
  assert.equal(projection.coverage.completedSettingCount, 3);
  const incomplete = analysis.configurations.filter(configuration => !configuration.cohortComplete);
  assert.equal(incomplete.length, 1);
  const configuration = incomplete[0];
  assert.equal(configuration.expectedPairs, 10);
  assert.equal(configuration.completePairs, 9);
  assert.equal(configuration.baseline, null);
  assert.equal(configuration.skill, null);
  assert.equal(configuration.delta, null);
  assert.equal(configuration.bootstrap95, null);
  assert.equal(configuration.perJudgeDeltas, null);
  assert.equal(configuration.availablePairDiagnostics.delta, 10);
  assert.match(configuration.availablePairDiagnostics.label, /Incomplete available-pair diagnostics/u);
  const entries = projection.entries.filter(entry => entry.configurationId === configuration.configurationId);
  assert.equal(entries.length, 2);
  assert.ok(entries.every(entry => entry.exactScore === null && entry.rank === null));
  assert.equal(configuration.trials.filter(trial => trial.delta === null).length, 1);
  assert.ok(analysis.configurations.filter(configuration => configuration.cohortComplete)
    .every(configuration => configuration.delta === 10 && configuration.bootstrap95.low === 10));
});
