import assert from "node:assert/strict";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";

import { createBenchmarkHash, createBenchmarkScoringHash } from "../cli/eval/benchmark-source.js";
import { resolveBenchmarkConfiguration } from "../cli/eval/benchmark-models.js";
import { freezeStorytellingSkill, STORYTELLING_RUNTIME_VERSION } from "../cli/eval/storytelling-agent-runtime.js";
import { creationIsolationArguments, STORYTELLING_CREATION_ISOLATION_VERSION } from "../cli/eval/storytelling-creation-runtime.js";
import { createStorytellingCreationJudgingMetadata, parseStorytellingCreationJudgment,
  runStorytellingCreationJudgeAgent, runStorytellingCreationJudging, STORYTELLING_CREATION_INFORMED_FILES,
  validateStorytellingCreationJudging } from "../cli/eval/judge-storytelling-creation.js";

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const writeJson = (filePath, value) => fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);

function fixture(t, { modelCount = 1, trialCount = 1 } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-creation-judging-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const skillDirectory = path.join(directory, "skill-source");
  fs.mkdirSync(path.join(skillDirectory, "references"), { recursive: true });
  for (const [index, relativePath] of STORYTELLING_CREATION_INFORMED_FILES.entries()) {
    fs.writeFileSync(path.join(skillDirectory, relativePath), `Frozen ${relativePath}: SECRET_CRAFT_SENTINEL_${index} 🌠\nComplete causal character context.\n`);
  }
  fs.writeFileSync(path.join(skillDirectory, "references", "not-selected.md"), "DO_NOT_INCLUDE_THIS_UNROUTED_REFERENCE");
  const snapshot = freezeStorytellingSkill({ skillDirectoryPath: skillDirectory });
  const definition = JSON.parse(fs.readFileSync(new URL("../benchmarks/storytelling-magic-discovery/benchmark.json", import.meta.url), "utf8"));
  const configurations = ["codex:gpt-5.6-luna@low", "codex:gpt-5.6-luna@medium"].slice(0, modelCount).map(resolveBenchmarkConfiguration);
  const run = {
    runId: "creation-fixture", storytelling: { manifestHash: hash("frozen-manifest") },
    benchmark: { hash: createBenchmarkHash(definition), scoringHash: createBenchmarkScoringHash(definition), definition },
    treatment: { hash: snapshot.hash }, configurations,
    conditions: [{ id: "clean", type: "clean" }, { id: "skill:writing-storytelling", type: "skill" }],
    generation: { trialCount, orderSeed: "reproducible-order" }, rows: []
  };
  for (const configuration of configurations) for (let trialNumber = 1; trialNumber <= trialCount; trialNumber++) {
    for (const condition of run.conditions) {
      const outputText = condition.type === "clean"
        ? "A fisherman discovers names can change the tide. He spends his own name to save the harbor, and his family forgets him."
        : "A surveyor finds spells in disputed boundaries. She gives up her ancestral land to break the city's siege and redraws a common border.";
      run.rows.push({ rowKey: `${configuration.id}::magic-discovery::trial-${trialNumber}::${condition.id}`,
        configurationId: configuration.id, caseId: "magic-discovery", trialNumber, conditionId: condition.id,
        rowStatus: "complete", promptText: definition.cases[0].task, outputText, outputHash: hash(outputText) });
    }
  }
  writeJson(path.join(directory, "run.json"), run);
  writeJson(path.join(directory, "manifest.json"), { runId: run.runId, manifestHash: run.storytelling.manifestHash });
  writeJson(path.join(directory, "skill-snapshot.json"), snapshot);
  return { directory, snapshot, run, scoring: definition.scoring };
}

function payload(scoring, { ratingA = 6, ratingB = 7, winner = "B" } = {}) {
  return { evaluations: ["A", "B"].map((candidateId) => ({ candidateId,
    dimensions: scoring.dimensions.map(({ id }) => ({ id, rating: candidateId === "A" ? ratingA : ratingB,
      evidence: `${candidateId}'s irreversible sacrifice changes the family or city's future through an established magic rule.` })),
    review: `${candidateId}'s ending follows the protagonist's sacrifice; the social consequences give the magic a concrete cost.` })), winner };
}

function response(args, scoring, modify = (value) => value) {
  const informed = args.promptText.includes("SECRET_CRAFT_SENTINEL_0");
  const base = (args.configuration.model === "gpt-6-astra" ? 5 : 6) + (informed ? 2 : 0);
  const text = JSON.stringify(modify(payload(scoring, { ratingA: base, ratingB: base + 1 })));
  return { text, durationMs: 10, usage: { inputTokens: 100, outputTokens: 50 }, costUsd: null,
    runtimeReceipt: { cli: "codex", freshSession: true, persistedSession: false,
      runtimeVersion: STORYTELLING_RUNTIME_VERSION, userPromptSha256: hash(args.promptText), outputSha256: hash(text),
      skillHash: null, instructionHash: null, requestedConfiguration: { ...args.configuration },
      workingDirectoryIsolation: "fresh-temporary-directory", nonMessageItemCount: 0, toolCalls: [],
      cliArguments: ["exec", "--ephemeral", "--ignore-user-config", "--ignore-rules", "--output-schema", "<schema>",
        "--config", 'web_search="disabled"', ...creationIsolationArguments("judge"), "-"],
      creationIsolation: { version: STORYTELLING_CREATION_ISOLATION_VERSION, role: "judge", hostSkillDiscovery: "explicitly-disabled" } }
  };
}

function loadArchive(f) {
  return { run: JSON.parse(fs.readFileSync(path.join(f.directory, "run.json"), "utf8")), skillSnapshot: f.snapshot,
    judging: JSON.parse(fs.readFileSync(path.join(f.directory, "creation-judging.json"), "utf8")),
    contextSnapshot: JSON.parse(fs.readFileSync(path.join(f.directory, "creation-judge-context.json"), "utf8")),
    runSha256: hash(fs.readFileSync(path.join(f.directory, "run.json"), "utf8")) };
}

test("context freezes the complete selected bytes and gives canonical models two separate seats", (t) => {
  const f = fixture(t);
  const metadata = createStorytellingCreationJudgingMetadata({ skillSnapshot: f.snapshot });
  assert.equal(metadata.profiles.length, 4);
  assert.equal(new Set(metadata.profiles.map((profile) => profile.configuration.id)).size, 2);
  assert.equal(new Set(metadata.profiles.map((profile) => profile.id)).size, 4);
  assert.equal(metadata.profiles[0].contextSha256, hash(""));
  assert.equal(metadata.profiles[2].contextSha256, hash(""));
  assert.equal(metadata.profiles[1].contextSha256, metadata.profiles[3].contextSha256);
  for (const file of metadata.contextSnapshot.files) {
    assert.ok(metadata.contextSnapshot.text.includes(file.contents));
    assert.equal(file.bytes, Buffer.byteLength(file.contents));
  }
  assert.doesNotMatch(metadata.contextSnapshot.text, /DO_NOT_INCLUDE_THIS_UNROUTED_REFERENCE/);
  assert.throws(() => createStorytellingCreationJudgingMetadata({ skillSnapshot: f.snapshot, informedSkillFiles: ["references/core-model.md"] }), /SKILL.md/);
});

test("paid judging cannot shrink or reorder the preregistered informed file pack", async (t) => {
  const f = fixture(t);
  for (const informedSkillFiles of [["SKILL.md"], [...STORYTELLING_CREATION_INFORMED_FILES].reverse()]) {
    await assert.rejects(runStorytellingCreationJudging({ runDirectory: f.directory, informedSkillFiles,
      agentRunnerImplementation: () => assert.fail("Context drift must fail before a provider invocation.") }), /frozen creation profile protocol/);
    assert.equal(fs.existsSync(path.join(f.directory, "creation-judging.json")), false);
    assert.equal(fs.existsSync(path.join(f.directory, "creation-judge-context.json")), false);
  }
});

test("the supported judge panel, seats, context labels, and order must match the frozen benchmark", async (t) => {
  const f = fixture(t);
  for (const mutate of [
    (definition) => { definition.judging.panel.reverse(); },
    (definition) => { definition.judging.profileProtocol.seatIds.reverse(); },
    (definition) => { definition.judging.contextProfiles.reverse(); },
    (definition) => { definition.judging.profileProtocol.orderRule = "Always present plain as A."; },
    (definition) => { definition.judging.contextProfiles[1].skillFiles = ["SKILL.md"]; }
  ]) {
    const run = structuredClone(f.run);
    mutate(run.benchmark.definition);
    run.benchmark.hash = createBenchmarkHash(run.benchmark.definition);
    run.benchmark.scoringHash = createBenchmarkScoringHash(run.benchmark.definition);
    writeJson(path.join(f.directory, "run.json"), run);
    await assert.rejects(runStorytellingCreationJudging({ runDirectory: f.directory, prepareOnly: true }), /frozen creation profile protocol/);
  }
});

test("all four fresh blinded seats preserve original reviews and aggregate the mean of totals", async (t) => {
  const f = fixture(t);
  const originalRun = fs.readFileSync(path.join(f.directory, "run.json"), "utf8");
  const calls = [];
  const result = await runStorytellingCreationJudging({ runDirectory: f.directory, judgeConcurrency: 4,
    agentRunnerImplementation: async (args) => {
      calls.push(args);
      assert.equal(args.role, "judge");
      assert.equal(args.skillSnapshot, null);
      assert.doesNotMatch(args.promptText, /codex:|gpt-5\.6|skill:writing-storytelling|creation-fixture|trial-1/);
      const informed = args.promptText.includes("FROZEN CRAFT CONTEXT");
      if (!informed) assert.doesNotMatch(args.promptText, /SECRET_CRAFT_SENTINEL|references\/|SKILL\.md/);
      else assert.match(args.promptText, /SECRET_CRAFT_SENTINEL_8/);
      assert.doesNotMatch(args.promptText, /DO_NOT_INCLUDE_THIS_UNROUTED_REFERENCE/);
      return response(args, f.scoring);
    } });
  assert.equal(calls.length, 4);
  assert.equal(result.judging.status, "complete");
  assert.equal(result.judging.results.length, 2);
  assert.equal(result.judging.results[0].score, 70);
  assert.equal(result.judging.results[0].naiveMean, 60);
  assert.equal(result.judging.results[0].informedMean, 80);
  assert.equal(result.judging.results[0].disagreement.range, 40);
  assert.equal(result.judging.results[0].disagreement.informedMinusNaive, 20);
  assert.equal(fs.readFileSync(path.join(f.directory, "run.json"), "utf8"), originalRun);
  assert.equal(validateStorytellingCreationJudging(loadArchive(f)), true);
  for (const judgment of result.judging.pairs[0].judgments) {
    assert.equal(judgment.outputText, judgment.attempts[0].outputText);
    assert.equal(judgment.evaluation.evaluations[0].review, JSON.parse(judgment.outputText).evaluations[0].review);
    assert.equal(judgment.outputSha256, hash(judgment.outputText));
  }
});

test("pair order is counterbalanced and remains matched across the two contexts", async (t) => {
  const f = fixture(t, { modelCount: 2, trialCount: 3 });
  const { judging } = await runStorytellingCreationJudging({ runDirectory: f.directory, prepareOnly: true,
    agentRunnerImplementation: () => assert.fail("Preparation invokes no provider.") });
  assert.equal(judging.pairs.length, 6);
  const plainFirst = new Map(judging.profiles.map((profile) => [profile.id, 0]));
  for (const pair of judging.pairs) {
    assert.deepEqual(pair.judgments[0].candidateOrder, pair.judgments[1].candidateOrder);
    assert.deepEqual(pair.judgments[2].candidateOrder, pair.judgments[3].candidateOrder);
    assert.notEqual(pair.judgments[0].candidateOrder[0].rowKey, pair.judgments[2].candidateOrder[0].rowKey);
    for (const judgment of pair.judgments) if (judgment.candidateOrder[0].rowKey.endsWith("::clean")) {
      plainFirst.set(judgment.profileId, plainFirst.get(judgment.profileId) + 1);
    }
  }
  assert.deepEqual([...plainFirst.values()], [3, 3, 3, 3]);
});

test("selective model/profile resumes never reroll completed ratings or create partial scores", async (t) => {
  const f = fixture(t);
  const run = (extra) => runStorytellingCreationJudging({ runDirectory: f.directory,
    agentRunnerImplementation: async (args) => response(args, f.scoring), ...extra });
  const first = await run({ judgeModel: "gpt-6-astra" });
  assert.equal(first.judging.summary.judgmentCounts.complete, 2);
  assert.equal(first.judging.results.length, 0);
  const originals = first.judging.pairs[0].judgments.slice(0, 2).map((judgment) => JSON.stringify(judgment));
  const second = await run({ judgeProfileIds: ["sol-xhigh-naive"] });
  assert.equal(second.judging.summary.judgmentCounts.complete, 3);
  assert.equal(second.judging.results.length, 0);
  const final = await run({});
  assert.equal(final.judging.status, "complete");
  assert.deepEqual(final.judging.pairs[0].judgments.slice(0, 2).map((judgment) => JSON.stringify(judgment)), originals);
  await run({ retryFailed: true, agentRunnerImplementation: () => assert.fail("Completed ratings cannot reroll.") });
});

test("judge concurrency supports 1 through 32 and archives the configured and observed execution", async (t) => {
  const f = fixture(t, { modelCount: 2, trialCount: 5 });
  for (const judgeConcurrency of [0, 33, 1.5]) {
    await assert.rejects(runStorytellingCreationJudging({ runDirectory: f.directory, judgeConcurrency }), /1 through 32/);
  }
  let active = 0, peak = 0;
  const { judging } = await runStorytellingCreationJudging({ runDirectory: f.directory, judgeConcurrency: 32,
    agentRunnerImplementation: async (args) => {
      active += 1; peak = Math.max(peak, active);
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;
      return response(args, f.scoring);
    } });
  const execution = judging.executionHistory.at(-1);
  assert.equal(peak, 32);
  assert.equal(execution.judgeConcurrencyLimit, 32);
  assert.equal(execution.peakConcurrentInvocations, 32);
  assert.equal(execution.plannedJudgmentCount, 40);
  assert.equal(execution.startedJudgmentCount, 40);
  assert.equal(execution.completedJudgmentCount, 40);
  assert.equal(execution.failedJudgmentCount, 0);
  assert.ok(execution.completedAt);
  assert.ok(judging.pairs.every((pair) => pair.judgments.every((judgment) => judgment.attempts[0].invocationId === execution.invocationId)));
});

test("invalid integers, missing evidence, duplicate dimensions, and contradictory winners are terminal preserved failures", async (t) => {
  const f = fixture(t);
  for (const change of [
    (value) => { value.evaluations[0].dimensions[0].rating = 4.5; },
    (value) => { value.evaluations[0].dimensions[0].rating = 0; },
    (value) => { value.evaluations[0].dimensions[0].evidence = ""; },
    (value) => { value.evaluations[0].dimensions[1].id = value.evaluations[0].dimensions[0].id; },
    (value) => { value.winner = "A"; }
  ]) {
    const value = payload(f.scoring);
    change(value);
    assert.throws(() => parseStorytellingCreationJudgment(JSON.stringify(value), f.scoring), { code: "EVAL_CREATION_JUDGE_INVALID_OUTPUT" });
  }
  const first = await runStorytellingCreationJudging({ runDirectory: f.directory, judgeProfileIds: ["astra-xhigh-naive"],
    agentRunnerImplementation: async (args) => response(args, f.scoring, (value) => ({ ...value, winner: "A" })) });
  const failed = first.judging.pairs[0].judgments[0];
  assert.equal(failed.status, "error");
  assert.equal(failed.attempts[0].retryable, false);
  assert.ok(failed.outputText);
  await runStorytellingCreationJudging({ runDirectory: f.directory, judgeProfileIds: ["astra-xhigh-naive"], retryFailed: true,
    agentRunnerImplementation: () => assert.fail("A returned answer must never be filtered and rerolled.") });
});

test("quota exhaustion stops unscheduled provider seats and explicit resume retains the failure", async (t) => {
  const f = fixture(t);
  let calls = 0;
  const first = await runStorytellingCreationJudging({ runDirectory: f.directory, judgeConcurrency: 1,
    agentRunnerImplementation: async ({ configuration }) => {
      calls++;
      throw Object.assign(new Error("You've hit your usage limit."), { code: "EVAL_AGENT_RUNTIME_FAILED",
        context: { requestedConfiguration: configuration, apiErrorStatus: 429 } });
    } });
  assert.equal(calls, 1);
  assert.equal(first.judging.summary.judgmentCounts.error, 1);
  assert.equal(first.judging.summary.judgmentCounts.pending, 3);
  assert.equal(first.judging.executionPauses.length, 1);
  const failedProfileId = first.judging.pairs[0].judgments.find((judgment) => judgment.status === "error").profileId;
  const second = await runStorytellingCreationJudging({ runDirectory: f.directory, retryFailed: true,
    agentRunnerImplementation: async (args) => response(args, f.scoring) });
  assert.equal(second.judging.status, "complete");
  const retried = second.judging.pairs[0].judgments.find((judgment) => judgment.profileId === failedProfileId);
  assert.equal(retried.attempts.length, 2);
  assert.equal(retried.attempts[0].status, "error");
  assert.match(retried.attempts[0].error.message, /usage limit/);
});

test("provider output-policy failures remain terminal even with explicit retry", async (t) => {
  const f = fixture(t);
  await runStorytellingCreationJudging({ runDirectory: f.directory, judgeProfileIds: ["astra-xhigh-naive"],
    agentRunnerImplementation: async () => { throw Object.assign(new Error("API Error: 400 output policy filter"), {
      code: "EVAL_AGENT_RUNTIME_FAILED", context: { apiErrorStatus: 400 } }); } });
  const { judging } = await runStorytellingCreationJudging({ runDirectory: f.directory, judgeProfileIds: ["astra-xhigh-naive"], retryFailed: true,
    agentRunnerImplementation: () => assert.fail("Provider output filters cannot trigger retries.") });
  assert.equal(judging.pairs[0].judgments[0].attempts.length, 1);
});

test("a final judge response followed by CLI teardown failure is archived and never rerolled", async (t) => {
  const f = fixture(t);
  const finalText = JSON.stringify(payload(f.scoring));
  const spawnImplementation = () => {
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough(); child.kill = () => {};
    queueMicrotask(() => {
      child.stdout.end(`${JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: finalText } })}\n`);
      child.stderr.end("timeout waiting for cleanup");
      child.emit("close", 1, null);
    });
    return child;
  };
  const { judging } = await runStorytellingCreationJudging({ runDirectory: f.directory, judgeProfileIds: ["astra-xhigh-naive"],
    agentRunnerImplementation: (args) => runStorytellingCreationJudgeAgent({ ...args, spawnImplementation }) });
  const failed = judging.pairs[0].judgments[0];
  assert.equal(failed.status, "error");
  assert.equal(failed.outputText, finalText);
  assert.equal(failed.attempts[0].outputText, finalText);
  assert.equal(failed.attempts[0].retryable, false);
  assert.equal(failed.error.context.finalResponseObservedBeforeFailure, true);
  await runStorytellingCreationJudging({ runDirectory: f.directory, judgeProfileIds: ["astra-xhigh-naive"], retryFailed: true,
    agentRunnerImplementation: () => assert.fail("An observed final rating cannot reroll after teardown failure.") });
});

test("checkpointed raw output is parsed after interruption without a fresh provider invocation", async (t) => {
  const f = fixture(t);
  const { judging } = await runStorytellingCreationJudging({ runDirectory: f.directory, judgeProfileIds: ["astra-xhigh-naive"],
    agentRunnerImplementation: async (args) => response(args, f.scoring) });
  const original = judging.pairs[0].judgments[0];
  const before = original.outputText;
  original.status = "running";
  original.evaluation = null;
  original.attempts[0].status = "running";
  original.attempts[0].completedAt = null;
  judging.summary.judgmentCounts.complete = 0;
  judging.summary.judgmentCounts.running = 1;
  judging.summary.byProfile[0].judgmentCounts.complete = 0;
  judging.summary.byProfile[0].judgmentCounts.running = 1;
  writeJson(path.join(f.directory, "creation-judging.json"), judging);
  const recovered = await runStorytellingCreationJudging({ runDirectory: f.directory, judgeProfileIds: ["astra-xhigh-naive"],
    agentRunnerImplementation: () => assert.fail("The original final answer is already checkpointed.") });
  assert.equal(recovered.judging.pairs[0].judgments[0].status, "complete");
  assert.equal(recovered.judging.pairs[0].judgments[0].outputText, before);
  assert.equal(recovered.judging.pairs[0].judgments[0].attempts.length, 1);
});

test("changed input hashes, contexts, aggregates, reviews, and order are rejected", async (t) => {
  const f = fixture(t);
  await runStorytellingCreationJudging({ runDirectory: f.directory, agentRunnerImplementation: async (args) => response(args, f.scoring) });
  for (const mutate of [
    (archive) => { archive.runSha256 = hash("different generation bytes"); },
    (archive) => { archive.contextSnapshot.files[0].contents += "new skill"; },
    (archive) => { archive.judging.results[0].score += 1; },
    (archive) => { archive.judging.pairs[0].judgments[0].evaluation.evaluations[0].review = "Altered review"; },
    (archive) => { archive.judging.pairs[0].judgments[0].candidateOrder.reverse(); },
    (archive) => { archive.judging.pairs[0].judgments[0].status = "pending"; },
    (archive) => { archive.judging.pairs[0].judgments[0].runtimeReceipt.creationIsolation.hostSkillDiscovery = "enabled"; }
  ]) {
    const archive = loadArchive(f);
    mutate(archive);
    assert.throws(() => validateStorytellingCreationJudging(archive));
  }
});

test("observed tool use and missing host-skill isolation make a returned judgment ineligible for scoring", async (t) => {
  const f = fixture(t);
  const { judging } = await runStorytellingCreationJudging({ runDirectory: f.directory,
    agentRunnerImplementation: async (args) => {
      const result = response(args, f.scoring);
      result.runtimeReceipt.nonMessageItemCount = 1;
      result.runtimeReceipt.toolCalls = [{ type: "command_execution", command: "read hidden skill" }];
      return result;
    } });
  assert.equal(judging.results.length, 0);
  assert.equal(judging.summary.judgmentCounts.error, 4);
  for (const judgment of judging.pairs[0].judgments) {
    assert.equal(judgment.error.code, "EVAL_CREATION_JUDGE_ISOLATION");
    assert.equal(judgment.attempts[0].retryable, false);
  }
});

test("harmless CLI infrastructure notices do not invalidate otherwise tool-free judging", async (t) => {
  const f = fixture(t);
  const { judging } = await runStorytellingCreationJudging({ runDirectory: f.directory,
    agentRunnerImplementation: async (args) => {
      const result = response(args, f.scoring);
      result.runtimeReceipt.itemTypeCounts = { reasoning: 1, agent_message: 1, error: 1 };
      result.runtimeReceipt.nonMessageItemCount = 1;
      result.runtimeReceipt.toolCalls = [{ type: "error", command: null, status: null }];
      return result;
    } });
  assert.equal(judging.status, "complete");
  assert.equal(judging.results.length, 2);
});

test("a receipt without the actual host-discovery disable flag cannot attest isolation", async (t) => {
  const f = fixture(t);
  const { judging } = await runStorytellingCreationJudging({ runDirectory: f.directory,
    agentRunnerImplementation: async (args) => {
      const result = response(args, f.scoring);
      result.runtimeReceipt.cliArguments = result.runtimeReceipt.cliArguments.filter((argument) => argument !== "skip_host_skill_discovery");
      return result;
    } });
  assert.equal(judging.results.length, 0);
  assert.equal(judging.summary.judgmentCounts.error, 4);
});

test("the shared run lock rejects active generation and terminal failed generations stay missing", async (t) => {
  const f = fixture(t);
  writeJson(path.join(f.directory, "run.lock"), { pid: process.pid });
  await assert.rejects(runStorytellingCreationJudging({ runDirectory: f.directory, prepareOnly: true }), { code: "EVAL_STORYTELLING_LOCKED" });
  fs.unlinkSync(path.join(f.directory, "run.lock"));
  f.run.rows[0].rowStatus = "error";
  f.run.rows[0].outputText = null;
  f.run.rows[0].outputHash = null;
  writeJson(path.join(f.directory, "run.json"), f.run);
  const { judging } = await runStorytellingCreationJudging({ runDirectory: f.directory,
    agentRunnerImplementation: () => assert.fail("Missing generation pairs cannot be fabricated or scored.") });
  assert.equal(judging.status, "incomplete");
  assert.equal(judging.results.length, 0);
  assert.equal(judging.summary.judgmentCounts.ineligible, 4);
  assert.equal(judging.pairs[0].candidates[0].outputSha256, null);
});
