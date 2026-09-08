import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";

import { createBenchmarkGenerationHash, createBenchmarkScoringHash, resolveBenchmarkSource } from "../cli/eval/benchmark-source.js";
import { resolveBenchmarkConfigurations } from "../cli/eval/benchmark-models.js";
import { judgeBenchmarkRows } from "../cli/eval/benchmark-judge.js";
import { identifyStorytellingJudgeQuotaExhaustion, runStorytellingBenchmark, STORYTELLING_DEFAULT_MODELS } from "../cli/eval/run-storytelling-benchmark.js";
import { runBenchmarkEval } from "../cli/eval/run-benchmark-eval.js";
import { probeStorytellingJudge } from "../cli/eval/probe-storytelling-judge.js";
import { createStorytellingSkillInstruction, freezeStorytellingSkill, isStorytellingRequiredSkillReadReceiptCompatible, runStorytellingAgent, STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION, STORYTELLING_RUNTIME_VERSION, validateStorytellingSkillSnapshot } from "../cli/eval/storytelling-agent-runtime.js";

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value));
}

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-storytelling-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const skillDirectory = path.join(directory, ".agents", "skills", "writing-storytelling");
  fs.mkdirSync(path.join(skillDirectory, "references"), { recursive: true });
  fs.writeFileSync(path.join(skillDirectory, "SKILL.md"), "---\nname: writing-storytelling\n---\nRead [controlling idea](references/controlling-idea.md) for an existing work.");
  fs.writeFileSync(path.join(skillDirectory, "references", "controlling-idea.md"), "Frozen specialist reference; explain causes, avoid inventing outcomes.");
  const definition = {
    schemaVersion: 2, id: "storytelling-core-idea", title: "Core idea", status: "source-verified",
    taskKind: "response",
    cases: [{ id: "the-story", task: "What is the core idea of The Story (specified edition)?",
      judgeEvidence: { facts: ["Private source packet: the protagonist refuses the crown."], sources: [{ id: "primary", url: "https://example.com/primary" }] } }],
    judging: { panel: ["codex:gpt-6-astra@xhigh", "claude:claude-fable-5-1@max"], synthesizer: null },
    scoring: {
      version: "storytelling-test-v1", kind: "anchored-llm", judgeInstructions: "Score the story's explanation against evidence; interpretations can differ.",
      scoreRange: { min: 0, max: 100 }, ratingScale: { min: 1, max: 10 }, gates: [],
      aggregation: { method: "unanimity-gates-mean-dimensions-v1", judgeCount: 2, batchUnit: "matched-pair" },
      dimensions: ["accuracy", "orientation", "theme-clarity-interconnectedness", "causal-explanation", "character", "concrete-support", "depth", "nuance", "prose-clarity", "relevance"].map((id) => ({
        id, title: id, criterion: `Assess ${id}.`, weight: 10,
        anchors: { 1: "Severely deficient.", 5: "Partially developed.", 10: "Excellent and supported." }
      }))
    }
  };
  const definitionPath = path.join(directory, "benchmarks", definition.id, "benchmark.json");
  writeJson(definitionPath, definition);
  return { directory, skillDirectory, definition, definitionPath };
}

function fakeResponse({ configuration, promptText, skillSnapshot, text = "The refusal separates the hero's moral victory from political success." }) {
  return {
    text, durationMs: 100, costUsd: null, usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
    runtimeReceipt: {
      cli: configuration.provider, freshSession: true, persistedSession: false,
      runtimeVersion: STORYTELLING_RUNTIME_VERSION, userPromptSha256: hash(promptText),
      skillHash: skillSnapshot?.hash ?? null, requestedConfiguration: configuration,
      ...(configuration.provider === "claude" ? {
        canonicalModels: [configuration.model], targetCanonicalModel: configuration.model,
        targetCanonicalModelOutputTokens: 10
      } : {})
    }
  };
}

function fakeJudgment(args, definition, rating = 8) {
  const ids = args.outputSchema.properties.evaluations.items.properties.candidateId.enum;
  return fakeResponse({ ...args, text: JSON.stringify({ evaluations: ids.map((candidateId) => ({
    candidateId, gates: [], dimensions: definition.scoring.dimensions.map(({ id }) => ({ id, rating })),
    reason: "The protagonist's refusal connects the moral victory to the unresolved political consequences."
  })) }) });
}

function fakeJudgeRuntimeFailure(configuration, message = "You're out of usage credits.", apiErrorStatus = 429) {
  // Like the real adapter's 2,000-character tail, this is not a complete JSON
  // document. The intact provider result field is still usable as evidence.
  const stdout = `truncated-prefix",${JSON.stringify({
    is_error: true, result: `API Error: ${apiErrorStatus} ${message}`,
    session_id: "private-fixture-session", accountPath: "/private/fixture-account"
  }).slice(1)}`;
  return Object.assign(new Error(`${configuration.id}: the session did not return a final answer`), {
    code: "EVAL_AGENT_RUNTIME_FAILED", suggestion: "Original provider failure remains unchanged.",
    context: {
      apiErrorStatus, stdout, stderr: "", streamSha256: hash(stdout),
      requestedConfiguration: { ...configuration }
    }
  });
}

function extendFixtureCases(f, count) {
  const original = f.definition.cases[0];
  f.definition.cases = Array.from({ length: count }, (_, index) => ({
    ...structuredClone(original), id: `story-${index + 1}`,
    task: `What is the core idea of Story ${index + 1} (specified edition)?`
  }));
  writeJson(f.definitionPath, f.definition);
}

function spawnStub(output, onSpawn = () => {}) {
  return (command, args, options) => {
    onSpawn(command, args, options);
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    child.kill = () => {};
    queueMicrotask(() => {
      child.stdout.end(typeof output === "function" ? output(command, args, options) : output);
      child.emit("close", 0, null);
    });
    return child;
  };
}

function requiredReadSpawn({ changeRead = (item) => item, onSpawn = () => {} } = {}) {
  return spawnStub((_command, args, options) => {
    const override = args.find((argument) => argument.startsWith("developer_instructions="));
    const instruction = override ? JSON.parse(override.slice("developer_instructions=".length)) : "";
    const reads = [...instruction.matchAll(/^node '([^']+)' ([0-9]+) # (.+)$/gmu)].map((match) => {
      const [, helperPath, index] = match;
      assert.equal(fs.statSync(helperPath).mode & 0o222, 0);
      const item = { type: "command_execution", id: `read-${index}`,
        command: `node '${helperPath}' ${index}`, status: "completed", exit_code: 0,
        aggregated_output: execFileSync(process.execPath, [helperPath, index], { encoding: "utf8", cwd: options.cwd }) };
      return changeRead(item, Number(index));
    }).filter(Boolean);
    return [
      { type: "thread.started", thread_id: "required-read-fixture" },
      ...reads.map((item) => ({ type: "item.completed", item })),
      { type: "item.completed", item: { type: "agent_message", text: "The original story outline." } },
      { type: "turn.completed", usage: { input_tokens: 400, output_tokens: 12 } }
    ].map(JSON.stringify).join("\n");
  }, onSpawn);
}

test("storytelling defaults contain 33 exact target configurations and no workflow mode", () => {
  const configs = resolveBenchmarkConfigurations({ requestedModelArguments: STORYTELLING_DEFAULT_MODELS }).filter((entry) => entry.reasoning !== "ultracode");
  assert.equal(configs.length, 33);
  assert.ok(configs.some((entry) => entry.id === "claude:claude-fable-5-1@low"));
  assert.ok(configs.some((entry) => entry.id === "claude:claude-opus-5@max"));
  assert.ok(!configs.some((entry) => ["fable", "opus"].includes(entry.model)));
});

test("the frozen progressive skill detects changed files and path traversal", (t) => {
  const f = fixture(t);
  const snapshot = freezeStorytellingSkill({ skillDirectoryPath: f.skillDirectory });
  assert.equal(snapshot.files.length, 2);
  const changed = structuredClone(snapshot);
  changed.files[0].contents += " changed";
  assert.throws(() => validateStorytellingSkillSnapshot(changed), /changed file/);
  changed.files[0].relativePath = "../outside";
  assert.throws(() => validateStorytellingSkillSnapshot(changed), /unsafe/);
});

test("Codex gets an exact user question and a separate short skill root with frozen local references", async (t) => {
  const f = fixture(t);
  const snapshot = freezeStorytellingSkill({ skillDirectoryPath: f.skillDirectory });
  let cwd;
  let capturedArguments;
  const promptText = f.definition.cases[0].task;
  const result = await runStorytellingAgent({
    configuration: { id: "codex:gpt-5.6-luna@low", provider: "codex", model: "gpt-5.6-luna", reasoning: "low" },
    promptText, skillSnapshot: snapshot,
    spawnImplementation: spawnStub((_command, _args, options) => [
      { type: "thread.started", thread_id: "fresh-test" },
      { type: "item.completed", item: { type: "command_execution", command: `cat ${options.cwd}/.benchmark-skill/writing-storytelling/references/controlling-idea.md`, status: "completed" } },
      { type: "item.completed", item: { type: "agent_message", text: "The answer." } },
      { type: "turn.completed", usage: { input_tokens: 40, output_tokens: 3 } }
    ].map(JSON.stringify).join("\n"), (_command, args, options) => {
      cwd = options.cwd; capturedArguments = args;
      assert.equal(fs.readFileSync(path.join(cwd, ".benchmark-skill", "writing-storytelling", "references", "controlling-idea.md"), "utf8"), snapshot.files.find((file) => file.relativePath.startsWith("references/")).contents);
      const injected = args.find((argument) => argument.startsWith("developer_instructions="));
      assert.match(injected, /Use the writing-storytelling skill/);
      assert.doesNotMatch(injected, /Frozen specialist reference/);
      assert.ok(args.indexOf(injected) > args.indexOf("exec"));
      assert.ok(args.indexOf('web_search="disabled"') > args.indexOf("exec"));
    })
  });
  assert.equal(result.runtimeReceipt.userPromptSha256, hash(promptText));
  assert.equal(result.runtimeReceipt.skillHash, snapshot.hash);
  assert.deepEqual(result.runtimeReceipt.referenceAccess.observedPaths, ["references/controlling-idea.md"]);
  assert.equal(result.runtimeReceipt.modelVerification, "explicit-cli-request-only");
  assert.ok(capturedArguments.includes("--ignore-user-config"));
  assert.equal(fs.existsSync(cwd), false);
  assert.doesNotMatch(JSON.stringify(result.runtimeReceipt.cliArguments), /name: writing-storytelling/);
  assert.equal(result.runtimeReceipt.requiredSkillReads, undefined);
  assert.equal(createStorytellingSkillInstruction({ skillSnapshot: snapshot, skillDirectoryPath: "<frozen-skill-directory>" }),
    `Use the writing-storytelling skill for this request. Its frozen directory is <frozen-skill-directory>. Resolve linked reference paths relative to that directory and read the references selected by the skill.\n\n${snapshot.files.find((file) => file.relativePath === "SKILL.md").contents}`);
});

test("required skill reads expose every frozen UTF-8 byte through bounded successful helper results", async (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.skillDirectory, "references", "twists-and-revelations.md"), "A revelation changes meaning. 🌌\n".repeat(850));
  const snapshot = freezeStorytellingSkill({ skillDirectoryPath: f.skillDirectory });
  const requiredSkillFiles = ["SKILL.md", "references/twists-and-revelations.md"];
  const delivered = new Map(requiredSkillFiles.map((relativePath) => [relativePath, ""]));
  const result = await runStorytellingAgent({
    configuration: { id: "codex:gpt-5.6-luna@max", provider: "codex", model: "gpt-5.6-luna", reasoning: "max" },
    promptText: "Create a brief outline of a scifi story with one or more major plot twists",
    skillSnapshot: snapshot, requiredSkillFiles: [...requiredSkillFiles].reverse(),
    spawnImplementation: requiredReadSpawn({ changeRead: (item) => {
      const match = item.aggregated_output.match(/^<<<BENCHMARK_SKILL_READ (.+)>>>\n([\s\S]*)\n<<<END_BENCHMARK_SKILL_READ [0-9]+>>>\n$/u);
      assert.ok(match);
      const metadata = JSON.parse(match[1]);
      assert.equal(Buffer.byteLength(match[2]), metadata.bytes);
      assert.ok(metadata.bytes <= 8000);
      assert.equal(hash(match[2]), metadata.sha256);
      delivered.set(metadata.relativePath, delivered.get(metadata.relativePath) + match[2]);
      return item;
    } })
  });
  for (const relativePath of requiredSkillFiles) {
    assert.equal(delivered.get(relativePath), snapshot.files.find((file) => file.relativePath === relativePath).contents);
  }
  const receipt = result.runtimeReceipt.requiredSkillReads;
  assert.equal(receipt.status, "complete");
  assert.ok(receipt.files[1].requiredChunkCount > 1);
  assert.ok(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles, receipt }));
  assert.equal(result.runtimeReceipt.instructionHash, hash(createStorytellingSkillInstruction({
    skillSnapshot: snapshot, skillDirectoryPath: "<frozen-skill-directory>", requiredSkillFiles
  })));
  const tampered = structuredClone(receipt);
  tampered.files[1].observedChunks[0].sha256 = "0".repeat(64);
  assert.equal(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles, receipt: tampered }), false);
});

test("required reads reject failed, partial, missing, and hash-only tool evidence while retaining the answer", async (t) => {
  const f = fixture(t);
  const snapshot = freezeStorytellingSkill({ skillDirectoryPath: f.skillDirectory });
  const requiredSkillFiles = ["SKILL.md", "references/controlling-idea.md"];
  const changes = [
    (item) => ({ ...item, status: "failed", exit_code: 1 }),
    (item) => ({ ...item, aggregated_output: item.aggregated_output.replace("Frozen specialist", "[truncated]") }),
    (item) => ({ ...item, aggregated_output: item.aggregated_output.split("\n").filter((line) => line.startsWith("<<<")).join("\n") }),
    (item) => ({ ...item, command: "echo references/controlling-idea.md" }),
    () => null
  ];
  for (const change of changes) {
    const result = await runStorytellingAgent({
      configuration: { id: "codex:gpt-5.6-luna@low", provider: "codex", model: "gpt-5.6-luna", reasoning: "low" },
      promptText: f.definition.cases[0].task, skillSnapshot: snapshot, requiredSkillFiles,
      spawnImplementation: requiredReadSpawn({ changeRead: (item, index) => index === 1 ? change(item) : item })
    });
    assert.equal(result.text, "The original story outline.");
    const receipt = result.runtimeReceipt.requiredSkillReads;
    assert.equal(receipt.status, "incomplete");
    assert.equal(receipt.files[0].complete, true);
    assert.equal(receipt.files[1].complete, false);
    assert.equal(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles, receipt }), false);
    assert.equal(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles, receipt, requireComplete: false }), true);
  }
});

test("required-read protocol failures preserve output and receipts and cannot be rerolled on retry", async (t) => {
  const f = fixture(t);
  const requiredSkillFiles = ["SKILL.md", "references/controlling-idea.md"];
  const result = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    requestedModelArguments: ["codex:gpt-5.6-luna@low"], requiredSkillFiles,
    runId: "required-read-failure", generationOnly: true,
    agentRunnerImplementation: (args) => runStorytellingAgent({ ...args,
      spawnImplementation: requiredReadSpawn({ changeRead: (item, index) => index === 1 ? null : item }) })
  });
  const runPath = path.join(result.outputDirectory, "run.json");
  const before = JSON.parse(fs.readFileSync(runPath, "utf8"));
  const failure = before.rows.find((row) => row.conditionId !== "clean");
  assert.equal(failure.rowStatus, "error");
  assert.equal(failure.error.code, "EVAL_STORYTELLING_REQUIRED_READ_INCOMPLETE");
  assert.equal(failure.outputText, "The original story outline.");
  assert.equal(failure.outputHash, hash(failure.outputText));
  assert.ok(failure.usage.totalTokens > 0);
  assert.equal(failure.runtimeReceipt.requiredSkillReads.status, "incomplete");
  assert.equal(failure.attempts.length, 1);
  fs.writeFileSync(path.join(f.skillDirectory, "SKILL.md"), "Mutable skill changed after the run.");
  await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    resumeRunId: result.runId, retryFailed: true,
    agentRunnerImplementation: () => assert.fail("Neither the completed plain output nor protocol failure may be rerolled."),
    judgeRowsImplementation: async ({ rows }) => {
      assert.deepEqual(rows, [], "The incomplete pair must never be scored.");
      return { judging: { status: "incomplete" }, scoresByRowKey: new Map() };
    }
  });
  const after = JSON.parse(fs.readFileSync(runPath, "utf8"));
  assert.deepEqual(after.rows, before.rows);
  assert.deepEqual(after.treatment, before.treatment);
  assert.equal(after.executionHistory.at(-1).selectedGenerationRowCount, 0);
});

test("required files are frozen in condition identity and resume rejects removed or changed policy", async (t) => {
  const f = fixture(t);
  const options = { projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    requestedModelArguments: ["codex:gpt-5.6-luna@low"], prepareOnly: true };
  const plain = await runStorytellingBenchmark({ ...options, runId: "legacy-policy" });
  const enforced = await runStorytellingBenchmark({ ...options, runId: "frozen-policy",
    requiredSkillFiles: ["references/controlling-idea.md", "SKILL.md"] });
  const legacy = JSON.parse(fs.readFileSync(path.join(plain.outputDirectory, "run.json"), "utf8"));
  const runPath = path.join(enforced.outputDirectory, "run.json");
  const frozen = JSON.parse(fs.readFileSync(runPath, "utf8"));
  assert.equal(legacy.treatment.requiredSkillFiles, undefined);
  assert.equal(legacy.conditions[1].hash, legacy.treatment.hash);
  assert.equal(frozen.treatment.hash, legacy.treatment.hash);
  assert.notEqual(frozen.conditions[1].hash, legacy.conditions[1].hash);
  assert.equal(frozen.conditions[0].hash, legacy.conditions[0].hash);
  assert.notEqual(frozen.storytelling.manifestHash, legacy.storytelling.manifestHash);
  assert.deepEqual(frozen.treatment.requiredSkillFiles, ["SKILL.md", "references/controlling-idea.md"]);
  assert.equal(frozen.treatment.requiredSkillReadPolicyVersion, STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION);
  for (const modify of [
    (run) => { delete run.treatment.requiredSkillFiles; delete run.treatment.requiredSkillReadPolicyVersion; },
    (run) => { run.treatment.requiredSkillFiles = ["SKILL.md"]; },
    (run) => { run.treatment.requiredSkillReadPolicyVersion = "changed-policy"; }
  ]) {
    const changed = structuredClone(frozen);
    modify(changed);
    writeJson(runPath, changed);
    await assert.rejects(() => runStorytellingBenchmark({ projectRootDirectory: f.directory,
      currentWorkingDirectory: f.directory, resumeRunId: enforced.runId, generationOnly: true,
      agentRunnerImplementation: () => assert.fail("Policy mutation must fail before invocation.") }), /required skill-file policy/);
    assert.equal(fs.existsSync(path.join(enforced.outputDirectory, "run.lock")), false);
  }
});

test("repeatable required-file CLI flags prepare the exact frozen file list without invoking a model", (t) => {
  const f = fixture(t);
  const runner = path.resolve(import.meta.dirname, "../cli/eval/run-storytelling-benchmark.js");
  execFileSync(process.execPath, [runner, "--prepare", "--run-id", "required-cli",
    "--model", "codex:gpt-5.6-luna@max", "--required-skill-file", "SKILL.md",
    "--required-skill-file", "references/controlling-idea.md"], { cwd: f.directory, encoding: "utf8" });
  const runPath = path.join(f.directory, ".agents", "vasir-evals", "storytelling-core-idea", "required-cli", "run.json");
  const run = JSON.parse(fs.readFileSync(runPath, "utf8"));
  assert.deepEqual(run.treatment.requiredSkillFiles, ["SKILL.md", "references/controlling-idea.md"]);
  assert.ok(run.rows.every((row) => row.rowStatus === "pending" && row.attempts.length === 0));
});

test("Claude streams progressive Read evidence while retaining canonical-model validation", async (t) => {
  const f = fixture(t);
  const snapshot = freezeStorytellingSkill({ skillDirectoryPath: f.skillDirectory });
  const result = await runStorytellingAgent({
    configuration: { id: "claude:claude-opus-5@low", provider: "claude", model: "claude-opus-5", reasoning: "low" },
    promptText: f.definition.cases[0].task, skillSnapshot: snapshot,
    spawnImplementation: spawnStub((_command, _args, options) => [
      { type: "system", subtype: "init", model: "claude-opus-5", session_id: "fresh-claude" },
      { type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: `${options.cwd}/.benchmark-skill/writing-storytelling/references/controlling-idea.md` } }] } },
      { type: "result", subtype: "success", is_error: false, session_id: "fresh-claude", result: "The answer.",
        modelUsage: { main: { canonicalModel: "claude-opus-5", outputTokens: 4 } }, usage: { input_tokens: 40, output_tokens: 4 } }
    ].map(JSON.stringify).join("\n"), (_command, args) => {
      assert.ok(args.includes("--safe-mode"));
      assert.equal(args[args.indexOf("--tools") + 1], "Read");
      assert.equal(args[args.indexOf("--output-format") + 1], "stream-json");
    })
  });
  assert.equal(result.text, "The answer.");
  assert.equal(result.runtimeReceipt.targetCanonicalModel, "claude-opus-5");
  assert.deepEqual(result.runtimeReceipt.allowedTools, ["Read"]);
  assert.deepEqual(result.runtimeReceipt.referenceAccess.observedPaths, ["references/controlling-idea.md"]);
});

test("Claude plain and judge tool receipts match their existing CLI tool settings", async () => {
  for (const outputSchema of [null, { type: "object", properties: { answer: { type: "string" } }, required: ["answer"], additionalProperties: false }]) {
    const result = await runStorytellingAgent({
      configuration: { id: "claude:claude-opus-5@low", provider: "claude", model: "claude-opus-5", reasoning: "low" },
      promptText: "A harmless request.", outputSchema,
      spawnImplementation: spawnStub(JSON.stringify({
        type: "result", subtype: "success", is_error: false, result: '{"answer":"The answer."}',
        modelUsage: { main: { canonicalModel: "claude-opus-5", outputTokens: 4 } }, usage: { input_tokens: 40, output_tokens: 4 }
      }), (_command, args) => {
        assert.equal(args[args.indexOf("--tools") + 1], outputSchema ? "" : "Read");
      })
    });
    assert.deepEqual(result.runtimeReceipt.allowedTools, outputSchema ? [] : ["Read"]);
  }
});

test("authentication failures exclude synthetic and init model claims and retain no raw credential diagnostics", async () => {
  await assert.rejects(() => runStorytellingAgent({
    configuration: { id: "claude:claude-opus-5@low", provider: "claude", model: "claude-opus-5", reasoning: "low" },
    promptText: "A harmless question.",
    spawnImplementation: spawnStub([
      { type: "system", subtype: "init", model: "claude-opus-5" },
      { type: "assistant", message: { model: "<synthetic>", content: [] } },
      { type: "result", is_error: true, result: "Failed to authenticate: OAuth session expired and could not be refreshed", modelUsage: {} }
    ].map(JSON.stringify).join("\n"))
  }), (error) => {
    assert.equal(error.code, "AUTH_UNAVAILABLE");
    assert.equal(error.context.credentialValuesStored, false);
    assert.equal(error.context.stdout, undefined);
    assert.equal(error.context.observed.modelVerification, "explicit-cli-request-only");
    assert.deepEqual(error.context.observed.observedModels, []);
    assert.deepEqual(error.context.observed.declaredModels, ["claude-opus-5"]);
    return true;
  });
});

test("schema 2 keeps judge-only evidence out of generation identity and accepts ten-point ungated ratings", (t) => {
  const f = fixture(t);
  assert.equal(resolveBenchmarkSource({ benchmarkName: f.definition.id, currentWorkingDirectory: f.directory }).benchmarkDefinition.scoring.ratingScale.max, 10);
  const changed = structuredClone(f.definition);
  changed.cases[0].judgeEvidence.facts.push("The final scene corroborates the refusal.");
  assert.equal(createBenchmarkGenerationHash(f.definition), createBenchmarkGenerationHash(changed));
  assert.notEqual(createBenchmarkScoringHash(f.definition), createBenchmarkScoringHash(changed));
});

test("prepare writes a durable frozen plan with identical questions before any agent call", async (t) => {
  const f = fixture(t);
  const result = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    requestedModelArguments: ["codex:gpt-5.6-luna@low"], runId: "prepared", prepareOnly: true,
    agentRunnerImplementation: () => assert.fail("Preparing must not run an agent.")
  });
  const run = JSON.parse(fs.readFileSync(path.join(result.outputDirectory, "run.json"), "utf8"));
  assert.equal(run.rows.length, 2);
  assert.ok(run.rows.every((row) => row.promptText === f.definition.cases[0].task));
  assert.ok(run.rows.every((row) => row.rowStatus === "pending"));
  assert.doesNotMatch(JSON.stringify(run.rows), /Private source packet|Frozen specialist reference|Output contract/);
  assert.equal(fs.existsSync(path.join(result.outputDirectory, "skill-snapshot.json")), true);
  assert.equal(fs.existsSync(path.join(result.outputDirectory, "run.lock")), false);
});

test("the generic benchmark entrypoint refuses to create a different storytelling experiment", async (t) => {
  const f = fixture(t);
  await assert.rejects(() => runBenchmarkEval({
    benchmarkName: "storytelling-core-idea", treatmentId: "skill:writing-storytelling",
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    agentRunnerImplementation: () => assert.fail("The generic harness must never generate a storytelling cell.")
  }), (error) => {
    assert.equal(error.code, "EVAL_STORYTELLING_RUNNER_REQUIRED");
    assert.match(error.suggestion, /run-storytelling-benchmark\.js/);
    return true;
  });
  assert.equal(fs.existsSync(path.join(f.directory, ".agents", "vasir-evals")), false);
});

test("resume preserves completed cells, retries explicit failures, and uses the frozen skill after local edits", async (t) => {
  const f = fixture(t);
  let calls = 0;
  const result = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    requestedModelArguments: ["codex:gpt-5.6-luna@low"], runId: "resumable", generationOnly: true,
    agentRunnerImplementation: async (args) => {
      calls += 1;
      if (args.skillSnapshot) throw Object.assign(new Error("Provider unavailable"), { code: "EVAL_AGENT_RUNTIME_FAILED" });
      return fakeResponse(args);
    }
  });
  assert.equal(result.summary.rowCounts.complete, 1);
  assert.equal(result.summary.rowCounts.failed, 1);
  fs.writeFileSync(path.join(f.skillDirectory, "SKILL.md"), "Changed live skill must not contaminate resume.");
  fs.writeFileSync(f.definitionPath, "{}\n");
  const resumed = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory, resumeRunId: result.runId,
    generationOnly: true, retryFailed: true,
    agentRunnerImplementation: async (args) => {
      calls += 1;
      assert.doesNotMatch(args.skillSnapshot.files.find((file) => file.relativePath === "SKILL.md").contents, /Changed live skill/);
      return fakeResponse(args);
    }
  });
  assert.equal(calls, 3);
  assert.equal(resumed.summary.rowCounts.complete, 2);
  assert.equal(resumed.summary.failedAttemptCount, 1);
  const run = JSON.parse(fs.readFileSync(path.join(result.outputDirectory, "run.json"), "utf8"));
  assert.equal(run.rows.find((row) => row.conditionId.startsWith("skill:")).attempts.length, 2);
  run.rows[0].outputText = "Tampered";
  writeJson(path.join(result.outputDirectory, "run.json"), run);
  await assert.rejects(() => runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory, resumeRunId: result.runId,
    agentRunnerImplementation: () => assert.fail("Tampered evidence must fail before generation.")
  }), /changed or lacks a compatible receipt/);
});

test("resume locks before loading a producer's checkpoint and preserves its final completed cell", async (t) => {
  const f = fixture(t);
  const options = { projectRootDirectory: f.directory, currentWorkingDirectory: f.directory };
  const prepared = await runStorytellingBenchmark({
    ...options, requestedModelArguments: ["codex:gpt-5.6-luna@low"],
    runId: "resume-lock", prepareOnly: true
  });
  const runPath = path.join(prepared.outputDirectory, "run.json");
  const lockPath = path.join(prepared.outputDirectory, "run.lock");
  const staleCheckpoint = fs.readFileSync(runPath, "utf8");
  await runStorytellingBenchmark({
    ...options, resumeRunId: prepared.runId, generationOnly: true, maxGenerationRows: 1,
    agentRunnerImplementation: async (args) => fakeResponse({ ...args, text: "Saved incumbent answer." })
  });
  const finalCheckpoint = fs.readFileSync(runPath, "utf8");
  const incumbent = JSON.parse(finalCheckpoint).rows.find((row) => row.rowStatus === "complete");
  fs.writeFileSync(runPath, staleCheckpoint);
  writeJson(lockPath, { pid: process.pid });
  let producerHandoffReached = false;
  await assert.rejects(() => runStorytellingBenchmark({
    ...options, resumeRunId: prepared.runId, generationOnly: true, maxGenerationRows: 1,
    nowImplementation: () => {
      // This used to run after loading the stale checkpoint but before locking.
      // Simulate the producer finishing in that gap: the reader must not get here.
      producerHandoffReached = true;
      fs.writeFileSync(runPath, finalCheckpoint);
      fs.unlinkSync(lockPath);
      return new Date();
    },
    agentRunnerImplementation: () => assert.fail("A competing resume cannot invoke an agent.")
  }), (error) => error.code === "EVAL_STORYTELLING_LOCKED");
  assert.equal(producerHandoffReached, false);
  assert.equal(fs.readFileSync(runPath, "utf8"), staleCheckpoint);
  assert.equal(fs.existsSync(lockPath), true, "a rejected reader must not remove the producer's lock");

  fs.writeFileSync(runPath, finalCheckpoint);
  fs.unlinkSync(lockPath);
  let missingCalls = 0;
  await runStorytellingBenchmark({
    ...options, resumeRunId: prepared.runId, generationOnly: true,
    agentRunnerImplementation: async (args) => {
      missingCalls += 1;
      assert.notEqual(args.skillSnapshot ? "skill:writing-storytelling" : "clean", incumbent.conditionId);
      return fakeResponse({ ...args, text: "New missing answer." });
    }
  });
  const resumed = JSON.parse(fs.readFileSync(runPath, "utf8"));
  assert.equal(missingCalls, 1);
  assert.deepEqual(resumed.rows.find((row) => row.rowKey === incumbent.rowKey), incumbent);
  assert.equal(resumed.summary.rowCounts.complete, 2);
  assert.equal(fs.existsSync(lockPath), false);
});

test("resume validation and launch metadata failures release ownership without rewriting the checkpoint", async (t) => {
  const f = fixture(t);
  const options = { projectRootDirectory: f.directory, currentWorkingDirectory: f.directory };
  const prepared = await runStorytellingBenchmark({
    ...options, requestedModelArguments: ["codex:gpt-5.6-luna@low"],
    runId: "resume-lock-cleanup", prepareOnly: true
  });
  const runPath = path.join(prepared.outputDirectory, "run.json");
  const lockPath = path.join(prepared.outputDirectory, "run.lock");
  const original = fs.readFileSync(runPath, "utf8");
  await assert.rejects(() => runStorytellingBenchmark({
    ...options, resumeRunId: prepared.runId, prepareOnly: true,
    nowImplementation: () => { throw new Error("Launch metadata failure."); }
  }), /Launch metadata failure/);
  assert.equal(fs.readFileSync(runPath, "utf8"), original);
  assert.equal(fs.existsSync(lockPath), false);
  const invalid = JSON.parse(original);
  invalid.benchmark.hash = hash("changed benchmark");
  writeJson(runPath, invalid);
  const invalidText = fs.readFileSync(runPath, "utf8");
  await assert.rejects(() => runStorytellingBenchmark({
    ...options, resumeRunId: prepared.runId, prepareOnly: true
  }), /frozen task/);
  assert.equal(fs.readFileSync(runPath, "utf8"), invalidText);
  assert.equal(fs.existsSync(lockPath), false);
});

test("native 1–10 panel scoring is blinded, evidence-backed, and resumable without repeated paid cells", async (t) => {
  const f = fixture(t);
  let generationCalls = 0;
  let judgeCalls = 0;
  const agent = async (args) => {
    if (!args.outputSchema) {
      generationCalls += 1;
      return fakeResponse(args);
    }
    judgeCalls += 1;
    assert.match(args.promptText, /Private source packet/);
    assert.doesNotMatch(args.promptText, /writing-storytelling|skill:|gpt-5.6-luna/);
    assert.match(args.promptText, /Dimensions \(rate each 1–10\)/);
    assert.match(args.promptText, /Hard gates: none; no gate caps apply\./);
    assert.doesNotMatch(args.promptText, /undefined|^  [024]:/m);
    assert.equal((args.promptText.match(/^  (?:1|5|10):/gm) ?? []).length, 30);
    for (const dimension of f.definition.scoring.dimensions) {
      const expectedBlock = `- ${dimension.id} — ${dimension.weight} points: ${dimension.criterion}
  1: ${dimension.anchors["1"]}
  5: ${dimension.anchors["5"]}
  10: ${dimension.anchors["10"]}`;
      assert.ok(args.promptText.includes(expectedBlock), `${dimension.id} must carry all three declared anchors`);
    }
    const properties = args.outputSchema.properties.evaluations.items.properties;
    assert.equal(properties.dimensions.items.properties.rating.minimum, 1);
    assert.equal(properties.dimensions.items.properties.rating.maximum, 10);
    const rating = args.configuration.provider === "codex" ? 7 : 8;
    return fakeResponse({ ...args, text: JSON.stringify({ evaluations: properties.candidateId.enum.map((candidateId) => ({
      candidateId, gates: [], dimensions: f.definition.scoring.dimensions.map((dimension) => ({ id: dimension.id, rating })),
      reason: "The refusal supports a moral victory; political consequences are underdeveloped."
    })) }) });
  };
  const result = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    requestedModelArguments: ["codex:gpt-5.6-luna@low"], runId: "scored", agentRunnerImplementation: agent,
    judgeConcurrency: 16,
    judgeRowsImplementation: (args) => {
      assert.equal(args.judgeConcurrency, 16);
      return judgeBenchmarkRows(args);
    }
  });
  assert.equal(result.runStatus, "complete");
  const run = JSON.parse(fs.readFileSync(path.join(result.outputDirectory, "run.json"), "utf8"));
  assert.ok(run.rows.every((row) => row.score.total === 75));
  assert.ok(run.rows.every((row) => row.score.gateCap === null));
  assert.ok(run.rows.every((row) => row.score.dimensions.every((dimension) => dimension.rating === 7.5)));
  assert.equal(run.judging.judges.length, 2);
  assert.equal(run.judging.comparativeNote, "Mean dimension ratings from two independent judges; no gate caps.");
  assert.equal(run.executionHistory[0].judgeConcurrencyLimit, 16);
  assert.equal(run.judging.candidateOrder.length, 2);
  const resumed = await runStorytellingBenchmark({ projectRootDirectory: f.directory, currentWorkingDirectory: f.directory, resumeRunId: result.runId, agentRunnerImplementation: agent });
  assert.equal(resumed.runStatus, "complete");
  assert.equal(generationCalls, 2);
  assert.equal(judgeCalls, 2);
});

test("an explicitly selected judge probe preserves its retained source and stays outside the scored panel", async (t) => {
  const f = fixture(t);
  const retained = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    requestedModelArguments: ["codex:gpt-5.6-luna@low"], runId: "probe-source",
    generationOnly: true, agentRunnerImplementation: async (args) => fakeResponse(args)
  });
  const sourceRunFilePath = path.join(retained.outputDirectory, "run.json");
  const originalSource = fs.readFileSync(sourceRunFilePath, "utf8");
  const outputFilePath = path.join(f.directory, "fable-judge-probe.json");
  const selector = "claude:claude-fable-5-1@max";
  const summary = await probeStorytellingJudge({
    sourceRunFilePath, outputFilePath, judgeSelector: selector,
    environmentVariables: { PROBE_TEST_CONTEXT: "non-secret-fixture" },
    agentRunnerImplementation: async (args) => {
      assert.equal(args.configuration.id, selector);
      assert.equal(args.environmentVariables.PROBE_TEST_CONTEXT, "non-secret-fixture");
      const ids = args.outputSchema.properties.evaluations.items.properties.candidateId.enum;
      return fakeResponse({ ...args, text: JSON.stringify({ evaluations: ids.map((candidateId) => ({
        candidateId, gates: [], dimensions: f.definition.scoring.dimensions.map(({ id }) => ({ id, rating: 8 })),
        reason: "The protagonist's refusal supports the moral victory while retaining political consequences."
      })) }) });
    }
  });
  assert.equal(summary.status, "complete");
  assert.equal(summary.validatedEvaluationCount, 2);
  assert.equal(summary.dimensions, 10);
  assert.deepEqual(summary.ratingScale, { min: 1, max: 10 });
  assert.equal(fs.readFileSync(sourceRunFilePath, "utf8"), originalSource);
  const evidence = JSON.parse(fs.readFileSync(outputFilePath, "utf8"));
  assert.deepEqual(evidence.requestedJudging.panel, [selector]);
  assert.match(evidence.exclusion, /Not a benchmark panel or public score/);
  await assert.rejects(() => probeStorytellingJudge({ sourceRunFilePath, outputFilePath, judgeSelector: selector }), /already exists/);
});

test("unavailable generation cells remain planned while intact matched pairs are judged", async (t) => {
  const f = fixture(t);
  let passedRows;
  const result = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    requestedModelArguments: ["codex:gpt-5.6-luna@low", "claude:claude-opus-5@low"], runId: "partial",
    agentRunnerImplementation: async (args) => {
      if (args.configuration.provider === "claude") throw Object.assign(new Error("CLI unavailable"), { code: "ENOENT" });
      return fakeResponse(args);
    },
    judgeRowsImplementation: async ({ rows }) => {
      passedRows = rows;
      return {
        judging: { status: "complete", judges: [], candidateOrder: [], freshContext: true, blinded: true },
        scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 75, dimensions: [] }]))
      };
    }
  });
  assert.equal(result.runStatus, "incomplete");
  assert.equal(result.summary.rowCounts.expected, 4);
  assert.equal(result.summary.rowCounts.unavailable, 2);
  assert.equal(result.summary.rowCounts.scored, 2);
  assert.equal(passedRows.length, 2);
  const run = JSON.parse(fs.readFileSync(path.join(result.outputDirectory, "run.json"), "utf8"));
  assert.equal(run.judging.eligibility.eligiblePairCount, 1);
  assert.equal(run.judging.eligibility.completePlannedCohort, false);
  assert.equal(run.rows.length, 4);
});

test("execution provider filter preserves pending cells and the complete frozen model inventory", async (t) => {
  const f = fixture(t);
  const result = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    requestedModelArguments: ["codex:gpt-5.6-luna@low", "claude:claude-opus-5@low"],
    runId: "provider-filter", generationOnly: true, generateProvider: "codex",
    agentRunnerImplementation: async (args) => {
      assert.equal(args.configuration.provider, "codex");
      return fakeResponse(args);
    }
  });
  assert.equal(result.summary.rowCounts.expected, 4);
  assert.equal(result.summary.rowCounts.complete, 2);
  assert.equal(result.summary.rowCounts.pending, 2);
  const run = JSON.parse(fs.readFileSync(path.join(result.outputDirectory, "run.json"), "utf8"));
  assert.equal(run.configurations.length, 2);
  assert.ok(run.rows.filter((row) => row.provider === "claude").every((row) => row.attempts.length === 0));
  const resumed = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    resumeRunId: result.runId, generationOnly: true, generateProvider: "claude",
    agentRunnerImplementation: async (args) => {
      assert.equal(args.configuration.provider, "claude");
      return fakeResponse(args);
    }
  });
  assert.equal(resumed.summary.rowCounts.complete, 4);
  assert.equal(resumed.summary.rowCounts.expected, 4);
});

test("exact model execution filtering preserves all 33 configurations and records the resumed concurrency separately", async (t) => {
  const f = fixture(t);
  const prepared = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    runId: "model-filter", prepareOnly: true,
    agentRunnerImplementation: () => assert.fail("Preparation cannot call an agent.")
  });
  const manifestPath = path.join(prepared.outputDirectory, "manifest.json");
  const frozenManifest = fs.readFileSync(manifestPath, "utf8");
  const initial = JSON.parse(fs.readFileSync(path.join(prepared.outputDirectory, "run.json"), "utf8"));
  assert.equal(initial.configurations.length, 33);
  const calls = [];
  const resumed = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    resumeRunId: prepared.runId, generationOnly: true,
    generateProvider: "claude", generateModel: "claude-opus-5", generationConcurrency: 3,
    agentRunnerImplementation: async (args) => {
      calls.push(args.configuration.id);
      assert.equal(args.configuration.provider, "claude");
      assert.equal(args.configuration.model, "claude-opus-5");
      return fakeResponse(args);
    }
  });
  const run = JSON.parse(fs.readFileSync(path.join(resumed.outputDirectory, "run.json"), "utf8"));
  assert.deepEqual(run.configurations, initial.configurations);
  assert.deepEqual(run.rows.map((row) => row.rowKey), initial.rows.map((row) => row.rowKey));
  assert.equal(run.storytelling.manifestHash, initial.storytelling.manifestHash);
  assert.equal(fs.readFileSync(manifestPath, "utf8"), frozenManifest);
  assert.equal(calls.length, 10);
  assert.equal(new Set(calls).size, 5);
  assert.equal(run.summary.rowCounts.expected, 66);
  assert.equal(run.summary.rowCounts.complete, 10);
  assert.equal(run.summary.rowCounts.pending, 56);
  assert.ok(run.rows.filter((row) => row.model !== "claude-opus-5").every((row) => row.rowStatus === "pending" && row.attempts.length === 0));
  assert.equal(run.runStatus, "incomplete");
  assert.equal(run.generation.concurrency, 4, "the original preparation declaration is not rewritten");
  assert.equal(run.executionHistory.length, 2);
  assert.deepEqual(run.executionHistory[0], initial.executionHistory[0]);
  const execution = run.executionHistory[1];
  assert.equal(execution.mode, "generation-only");
  assert.equal(execution.generationConcurrencyLimit, 3);
  assert.equal(execution.generationProviderFilter, "claude");
  assert.equal(execution.generationModelFilter, "claude-opus-5");
  assert.equal(execution.selectedGenerationRowCount, 10);
});

test("unknown model execution filters and empty provider/model intersections fail before changing evidence", async (t) => {
  const f = fixture(t);
  const prepared = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    runId: "filter-validation", prepareOnly: true
  });
  const runPath = path.join(prepared.outputDirectory, "run.json");
  const original = fs.readFileSync(runPath, "utf8");
  for (const filter of [
    { generateModel: "not-a-model" },
    { generateModel: "opus" },
    { generateModel: "claude-opus-5", generateProvider: "codex" }
  ]) {
    await assert.rejects(() => runStorytellingBenchmark({
      projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
      resumeRunId: prepared.runId, generationOnly: true, ...filter,
      agentRunnerImplementation: () => assert.fail("An invalid execution filter cannot call an agent.")
    }), (error) => error.code === "EVAL_STORYTELLING_EXECUTION_FILTER");
    assert.equal(fs.readFileSync(runPath, "utf8"), original);
    assert.equal(fs.existsSync(path.join(prepared.outputDirectory, "run.lock")), false);
  }
  await assert.rejects(() => runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    runId: "unknown-filter", prepareOnly: true, generateModel: "not-a-model"
  }), (error) => error.code === "EVAL_STORYTELLING_EXECUTION_FILTER");
  assert.equal(fs.existsSync(path.join(f.directory, ".agents", "vasir-evals", "storytelling-core-idea", "unknown-filter")), false);
  for (const judgeConcurrency of [0, 17, 1.5]) {
    await assert.rejects(() => runStorytellingBenchmark({
      projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
      resumeRunId: prepared.runId, judgeOnly: true, judgeConcurrency,
      agentRunnerImplementation: () => assert.fail("Invalid judge concurrency cannot invoke a provider.")
    }), (error) => error.code === "EVAL_BENCHMARK_JUDGE_CONCURRENCY");
    assert.equal(fs.readFileSync(runPath, "utf8"), original);
  }
});

test("judge provider deferral records zero calls and preserves the two-seat panel until resume", async (t) => {
  const f = fixture(t);
  const calls = { generation: 0, codex: 0, claude: 0 };
  const agent = async (args) => {
    if (!args.outputSchema) {
      calls.generation += 1;
      return fakeResponse(args);
    }
    calls[args.configuration.provider] += 1;
    const ids = args.outputSchema.properties.evaluations.items.properties.candidateId.enum;
    return fakeResponse({ ...args, text: JSON.stringify({ evaluations: ids.map((candidateId) => ({
      candidateId, gates: [], dimensions: f.definition.scoring.dimensions.map(({ id }) => ({ id, rating: 8 })),
      reason: "The refusal clearly connects the protagonist's choice to the political and moral outcomes."
    })) }) });
  };
  const first = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    requestedModelArguments: ["codex:gpt-5.6-luna@low"], runId: "deferred-judge",
    judgeProvider: "codex", agentRunnerImplementation: agent
  });
  assert.equal(first.runStatus, "incomplete");
  assert.equal(first.summary.rowCounts.scored, 0);
  assert.deepEqual(calls, { generation: 2, codex: 1, claude: 0 });
  const run = JSON.parse(fs.readFileSync(path.join(first.outputDirectory, "run.json"), "utf8"));
  assert.equal(run.benchmark.definition.judging.panel.length, 2);
  const deferred = run.judging.judges.find((judge) => judge.configuration.provider === "claude").batches[0];
  assert.equal(deferred.status, "deferred");
  assert.equal(deferred.executionAttempted, false);
  assert.equal(deferred.durationMs, 0);
  const finished = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    resumeRunId: first.runId, judgeOnly: true, judgeProvider: "claude", agentRunnerImplementation: agent
  });
  assert.equal(finished.runStatus, "complete");
  assert.deepEqual(calls, { generation: 2, codex: 1, claude: 1 });
});

test("judge quota recognition requires explicit provider exhaustion, not a generic 429, policy block, or answer text", () => {
  const [configuration] = resolveBenchmarkConfigurations({ requestedModelArguments: ["claude:claude-fable-5-1@max"] });
  for (const message of ["You're out of usage credits.", "You’re out of usage credits."]) {
    const error = fakeJudgeRuntimeFailure(configuration, message);
    assert.throws(() => JSON.parse(error.context.stdout));
    assert.deepEqual(identifyStorytellingJudgeQuotaExhaustion({ error, configuration }), {
      reason: "usage-credits-exhausted", apiErrorStatus: 429
    });
  }
  assert.deepEqual(identifyStorytellingJudgeQuotaExhaustion({
    error: fakeJudgeRuntimeFailure(configuration, "You’ve reached your Fable limit."), configuration
  }), { reason: "model-usage-limit-reached", apiErrorStatus: 429 });
  for (const message of ["You've hit your session limit · resets 11:50pm (America/New_York)", "You’ve hit your session limit."]) {
    assert.deepEqual(identifyStorytellingJudgeQuotaExhaustion({
      error: fakeJudgeRuntimeFailure(configuration, message), configuration
    }), { reason: "session-usage-limit-reached", apiErrorStatus: 429 });
  }
  for (const message of ["Too many requests; retry later.", "rate_limit_error", "Quota exceeded: requests per minute."]) {
    assert.equal(identifyStorytellingJudgeQuotaExhaustion({ error: fakeJudgeRuntimeFailure(configuration, message), configuration }), null);
  }
  const blocked = fakeJudgeRuntimeFailure(configuration, "Output blocked by content filtering policy. You're out of usage credits.", 400);
  assert.equal(identifyStorytellingJudgeQuotaExhaustion({ error: blocked, configuration }), null);
  const answerText = fakeJudgeRuntimeFailure(configuration);
  answerText.context.apiErrorStatus = null;
  answerText.context.stdout = JSON.stringify({ is_error: false, result: "You're out of usage credits." });
  assert.equal(identifyStorytellingJudgeQuotaExhaustion({ error: answerText, configuration }), null);
  const wrongIdentity = fakeJudgeRuntimeFailure(configuration);
  wrongIdentity.context.requestedConfiguration.model = "claude-opus-5";
  assert.equal(identifyStorytellingJudgeQuotaExhaustion({ error: wrongIdentity, configuration }), null);
  const parseFailure = fakeJudgeRuntimeFailure(configuration);
  parseFailure.code = "EVAL_BENCHMARK_JUDGE_INVALID_OUTPUT";
  assert.equal(identifyStorytellingJudgeQuotaExhaustion({ error: parseFailure, configuration }), null);
  const [codex] = resolveBenchmarkConfigurations({ requestedModelArguments: ["codex:gpt-6-astra@xhigh"] });
  const codexLimit = fakeJudgeRuntimeFailure(codex);
  codexLimit.context.apiErrorStatus = null;
  codexLimit.context.stdout = "";
  codexLimit.context.stderr = "You've hit your usage limit. Check your plan.";
  assert.deepEqual(identifyStorytellingJudgeQuotaExhaustion({ error: codexLimit, configuration: codex }), {
    reason: "usage-limit-reached", apiErrorStatus: null
  });
});

test("judge quota circuit preserves the first actual error, defers later calls, and resets without rerolling completed evidence", async (t) => {
  const f = fixture(t);
  extendFixtureCases(f, 4);
  const prepared = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    requestedModelArguments: ["codex:gpt-5.6-luna@low"], runId: "quota-resume",
    generationOnly: true, agentRunnerImplementation: async (args) => fakeResponse(args)
  });
  const runPath = path.join(prepared.outputDirectory, "run.json");
  const before = JSON.parse(fs.readFileSync(runPath, "utf8"));
  const frozenFiles = ["manifest.json", "skill-snapshot.json"].map((name) => [name, fs.readFileSync(path.join(prepared.outputDirectory, name), "utf8")]);
  const calls = { codex: 0, claude: 0 };
  let actualError;
  const failed = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    resumeRunId: prepared.runId, judgeOnly: true, judgeConcurrency: 1,
    agentRunnerImplementation: async (args) => {
      assert.ok(args.outputSchema, "Completed generation must not be rerun.");
      calls[args.configuration.provider] += 1;
      if (args.configuration.provider === "claude" && calls.claude === 2) {
        actualError = fakeJudgeRuntimeFailure(args.configuration);
        throw actualError;
      }
      return fakeJudgment(args, f.definition, args.configuration.provider === "codex" ? 7 : 8);
    }
  });
  assert.deepEqual(calls, { codex: 4, claude: 2 });
  assert.equal(failed.runStatus, "incomplete");
  assert.equal(failed.summary.rowCounts.expected, 8);
  assert.equal(failed.summary.rowCounts.scored, 0, "The incomplete generic panel must not fabricate aggregate row scores.");
  const partial = JSON.parse(fs.readFileSync(runPath, "utf8"));
  const batches = partial.judging.judges.flatMap((judge) => judge.batches);
  const actual = batches.find((batch) => batch.status === "error");
  assert.equal(actual.configuration.provider, "claude");
  assert.deepEqual(actual.error, {
    code: actualError.code, message: actualError.message,
    suggestion: actualError.suggestion, context: actualError.context
  });
  assert.notEqual(actual.executionAttempted, false);
  const deferred = batches.filter((batch) => batch.status === "deferred");
  assert.equal(deferred.length, 2);
  const circuit = partial.executionHistory.at(-1).judgeQuotaCircuitBreaker;
  assert.deepEqual(partial.judging.execution.quotaCircuitBreaker, circuit);
  assert.equal(circuit.causes.length, 1);
  const cause = circuit.causes[0];
  assert.equal(cause.runId, partial.runId);
  assert.equal(cause.manifestHash, before.storytelling.manifestHash);
  assert.equal(cause.configurationId, actual.configuration.id);
  assert.equal(cause.promptSha256, actual.promptHash);
  assert.equal(cause.errorSha256, hash(JSON.stringify(actual.error)));
  assert.equal(cause.streamSha256, actual.error.context.streamSha256);
  assert.doesNotMatch(JSON.stringify(circuit), /private-fixture-session|\/private\/fixture-account|stdout|stderr|Original provider failure/);
  for (const batch of deferred) {
    assert.equal(batch.executionAttempted, false);
    assert.equal(batch.durationMs, 0);
    assert.equal(batch.error.code, "EVAL_BENCHMARK_JUDGE_DEFERRED");
    assert.deepEqual(batch.error.context.quotaCause, cause);
    assert.equal(batch.error.context.promptSha256, batch.promptHash);
    assert.deepEqual(batch.evaluations, []);
    assert.deepEqual(batch.ranking, []);
    for (const field of ["outputText", "runtimeReceipt", "usage", "costUsd", "evaluationHash"]) assert.equal(batch[field], null);
  }
  assert.ok(partial.rows.every((row) => row.score === null));
  const completed = batches.filter((batch) => batch.status === "complete");
  const resumedCalls = [];
  const finished = await runStorytellingBenchmark({
    projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
    resumeRunId: prepared.runId, judgeOnly: true, judgeConcurrency: 3,
    agentRunnerImplementation: async (args) => {
      assert.ok(args.outputSchema);
      assert.equal(args.configuration.provider, "claude", "Every completed Codex batch must be reused.");
      resumedCalls.push(hash(args.promptText));
      assert.ok(!completed.some((batch) => batch.configuration.id === args.configuration.id && batch.promptHash === hash(args.promptText)), "A valid completed Fable judgment must not be rerolled.");
      return fakeJudgment(args, f.definition, 8);
    }
  });
  assert.equal(finished.runStatus, "complete");
  assert.equal(resumedCalls.length, 3);
  const final = JSON.parse(fs.readFileSync(runPath, "utf8"));
  const finalBatches = final.judging.judges.flatMap((judge) => judge.batches);
  assert.deepEqual(final.executionHistory.at(-1).judgeQuotaCircuitBreaker.causes, []);
  assert.deepEqual(final.executionHistory[1], partial.executionHistory[1], "Prior source-bound quota cause remains in launch history.");
  for (const batch of completed) {
    assert.deepEqual(finalBatches.find((candidate) => candidate.configuration.id === batch.configuration.id && candidate.promptHash === batch.promptHash), { ...batch, reused: true });
  }
  for (const batch of batches) {
    const current = finalBatches.find((candidate) => candidate.configuration.id === batch.configuration.id && candidate.promptHash === batch.promptHash);
    for (const field of ["basisHash", "promptHash", "promptText", "candidateIds", "groupHashes"]) assert.deepEqual(current[field], batch[field]);
  }
  assert.ok(final.rows.every((row) => row.score.total === 75 && row.score.gateCap === null));
  for (const field of ["benchmark", "treatment", "conditions", "configurations", "generation", "storytelling"]) assert.deepEqual(final[field], before[field]);
  const generationEvidence = (row) => Object.fromEntries(["rowKey", "rowStatus", "promptText", "exactMessages", "basisHash", "outputText", "outputHash", "runtimeReceipt", "attempts", "usage", "costUsd", "durationMs"].map((key) => [key, row[key]]));
  assert.deepEqual(final.rows.map(generationEvidence), before.rows.map(generationEvidence));
  for (const [name, bytes] of frozenFiles) assert.equal(fs.readFileSync(path.join(prepared.outputDirectory, name), "utf8"), bytes);
});

test("a quota circuit lets already-invoked judge requests settle while stopping later units", async (t) => {
  for (const secondCallFails of [false, true]) {
    const f = fixture(t);
    extendFixtureCases(f, 5);
    const calls = { codex: 0, claude: 0 };
    let rejectFirst;
    let firstPromptHash;
    const result = await runStorytellingBenchmark({
      projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
      requestedModelArguments: ["codex:gpt-5.6-luna@low"], runId: "quota-in-flight", judgeConcurrency: 4,
      agentRunnerImplementation: async (args) => {
        if (!args.outputSchema) return fakeResponse(args);
        calls[args.configuration.provider] += 1;
        if (args.configuration.provider === "claude" && calls.claude === 1) {
          firstPromptHash = hash(args.promptText);
          return new Promise((_resolve, reject) => { rejectFirst = () => reject(fakeJudgeRuntimeFailure(args.configuration)); });
        }
        if (args.configuration.provider === "claude" && calls.claude === 2) {
          rejectFirst();
          await Promise.resolve();
          await Promise.resolve();
          if (secondCallFails) throw fakeJudgeRuntimeFailure(args.configuration, "You’ve reached your Fable limit.");
        }
        return fakeJudgment(args, f.definition);
      }
    });
    assert.deepEqual(calls, { codex: 5, claude: 2 });
    const run = JSON.parse(fs.readFileSync(path.join(result.outputDirectory, "run.json"), "utf8"));
    const batches = run.judging.judges.find((judge) => judge.configuration.provider === "claude").batches;
    assert.equal(batches.filter((batch) => batch.status === "error").length, secondCallFails ? 2 : 1);
    assert.equal(batches.filter((batch) => batch.status === "complete").length, secondCallFails ? 0 : 1, "The already-started second call must retain its actual outcome.");
    assert.equal(batches.filter((batch) => batch.status === "deferred").length, 3);
    const causes = run.executionHistory.at(-1).judgeQuotaCircuitBreaker.causes;
    assert.equal(causes.length, 1);
    assert.equal(causes[0].reason, "usage-credits-exhausted", "A later in-flight error must not replace the first observed cause.");
    assert.equal(causes[0].promptSha256, firstPromptHash);
  }
});

test("judge quota circuits isolate other models on the same provider and share only an exact provider/model", async (t) => {
  for (const sameModel of [false, true]) {
    const f = fixture(t);
    f.definition.judging.panel = [
      "claude:claude-fable-5-1@max",
      sameModel ? "claude:claude-fable-5-1@low" : "claude:claude-opus-5@low",
      "codex:gpt-6-astra@xhigh"
    ];
    f.definition.scoring.aggregation = { method: "majority-gates-median-dimensions-v1", judgeCount: 3, batchUnit: "matched-pair" };
    extendFixtureCases(f, 3);
    const calls = [];
    const result = await runStorytellingBenchmark({
      projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
      requestedModelArguments: ["codex:gpt-5.6-luna@low"], runId: "quota-scope", judgeConcurrency: 1,
      agentRunnerImplementation: async (args) => {
        if (!args.outputSchema) return fakeResponse(args);
        calls.push(args.configuration.id);
        if (args.configuration.id === "claude:claude-fable-5-1@max") throw fakeJudgeRuntimeFailure(args.configuration, "You’ve reached your Fable limit.");
        return fakeJudgment(args, f.definition);
      }
    });
    assert.equal(calls.filter((id) => id === "claude:claude-fable-5-1@max").length, 1);
    assert.equal(calls.filter((id) => id === "codex:gpt-6-astra@xhigh").length, 3);
    assert.equal(calls.filter((id) => id === f.definition.judging.panel[1]).length, sameModel ? 0 : 3);
    const run = JSON.parse(fs.readFileSync(path.join(result.outputDirectory, "run.json"), "utf8"));
    const peer = run.judging.judges.find((judge) => judge.configuration.id === f.definition.judging.panel[1]);
    assert.ok(peer.batches.every((batch) => batch.status === (sameModel ? "deferred" : "complete")));
  }
});

test("generic 429 and content-filter 400 judge failures do not defer later independent requests", async (t) => {
  for (const [status, message] of [[429, "Too many requests; retry later."], [400, "Output blocked by content filtering policy."]]) {
    const f = fixture(t);
    extendFixtureCases(f, 3);
    const calls = { codex: 0, claude: 0 };
    const result = await runStorytellingBenchmark({
      projectRootDirectory: f.directory, currentWorkingDirectory: f.directory,
      requestedModelArguments: ["codex:gpt-5.6-luna@low"], runId: "not-quota", judgeConcurrency: 1,
      agentRunnerImplementation: async (args) => {
        if (!args.outputSchema) return fakeResponse(args);
        calls[args.configuration.provider] += 1;
        if (args.configuration.provider === "claude" && calls.claude === 1) throw fakeJudgeRuntimeFailure(args.configuration, message, status);
        return fakeJudgment(args, f.definition);
      }
    });
    assert.deepEqual(calls, { codex: 3, claude: 3 });
    const run = JSON.parse(fs.readFileSync(path.join(result.outputDirectory, "run.json"), "utf8"));
    const batches = run.judging.judges.flatMap((judge) => judge.batches);
    assert.equal(batches.filter((batch) => batch.status === "error").length, 1);
    assert.equal(batches.filter((batch) => batch.status === "deferred").length, 0);
    assert.deepEqual(run.executionHistory.at(-1).judgeQuotaCircuitBreaker.causes, []);
  }
});
