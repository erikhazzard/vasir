import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { reportBenchmarkEval } from "../cli/eval/report-benchmark-eval.js";
import { extendBenchmarkEval } from "../cli/eval/extend-benchmark-eval.js";
import { judgeBenchmarkRows } from "../cli/eval/benchmark-judge.js";
import {
  BENCHMARK_HARNESS_VERSION,
  createBenchmarkConditions,
  createBenchmarkGenerationPrompt,
  createBenchmarkPromptModeOverrides,
  createBenchmarkRowBasisHash,
  createBenchmarkRowPlans,
  FABLE_5_1_ULTRACODE_CONFIGURATION_ID,
  FABLE_5_1_ULTRACODE_HARNESS_INSTRUCTION,
  FABLE_5_1_ULTRACODE_LEGACY_HARNESS_INSTRUCTION,
  FABLE_5_1_ULTRACODE_LEGACY_PROMPT_MODE_ID,
  FABLE_5_1_ULTRACODE_PROMPT_MODE_ID,
  generateBenchmarkRows,
  NEUTRAL_HARNESS_INSTRUCTION,
  resolveBenchmarkPromptMode,
  runBenchmarkEval
} from "../cli/eval/run-benchmark-eval.js";
import { rejudgeBenchmarkEval } from "../cli/eval/rejudge-benchmark-eval.js";

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function createPanelResponse(outputSchema) {
  if (outputSchema.properties.evaluations) {
    const evaluationSchema = outputSchema.properties.evaluations.items;
    const candidateIds = evaluationSchema.properties.candidateId.enum;
    const gateIds = evaluationSchema.properties.gates.items.properties.id.enum;
    const dimensionIds = evaluationSchema.properties.dimensions.items.properties.id.enum;
    return {
      text: JSON.stringify({
        evaluations: candidateIds.map((candidateId) => ({
          candidateId,
          gates: gateIds.map((id) => ({ id, status: "pass" })),
          dimensions: dimensionIds.map((id) => ({ id, rating: 3 })),
          reason: "The response provides concrete authority, bounded work, durability, and recovery evidence."
        }))
      }),
      runtimeReceipt: { freshSession: true }
    };
  }

  const selectionSchema = outputSchema.properties.selections.items;
  const candidateIds = selectionSchema.properties.candidateId.enum;
  const reviewerIds = selectionSchema.properties.reviewerId.enum;
  return {
    text: JSON.stringify({
      selections: candidateIds.map((candidateId) => ({
        candidateId,
        reviewerId: reviewerIds[0],
        reason: "This reviewer applies the benchmark rubric consistently to the decisive response evidence."
      }))
    }),
    runtimeReceipt: { freshSession: true }
  };
}

async function createExtensionSourceFixture(projectDirectory, modelSelector = "sol@max") {
  writeFile(path.join(projectDirectory, "package.json"), "{}\n");
  writeFile(
    path.join(projectDirectory, ".agents", "skills", "test-architecture", "SKILL.md"),
    `---
name: test-architecture
description: Test architecture guidance.
---
Use one authority.`
  );
  return runBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    treatmentId: "skill:test-architecture",
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: [modelSelector],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => ({ text: promptText }),
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 50 }])),
      judging: { status: "complete", promptText: "source judge", candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>")
  });
}

test("benchmark prompt modes preserve legacy bytes and bind Workflow only to exact Fable 5.1 ultracode rows", () => {
  const defaultConfigurations = [
    { id: "claude:fable@max" },
    { id: "claude:claude-fable-5-1@xhigh" },
    { id: "claude:claude-fable-5-1@max" },
    { id: "claude:claude-fable-5-1@ultracode-similar" }
  ];
  for (const configuration of defaultConfigurations) {
    const promptMode = resolveBenchmarkPromptMode(configuration);
    assert.equal(promptMode.instruction, NEUTRAL_HARNESS_INSTRUCTION);
    assert.equal(promptMode.isOverride, false);
  }

  const ultracodeConfiguration = {
    id: FABLE_5_1_ULTRACODE_CONFIGURATION_ID,
    provider: "claude",
    model: "claude-fable-5-1",
    reasoning: "ultracode"
  };
  const ultracodePromptMode = resolveBenchmarkPromptMode(ultracodeConfiguration);
  assert.equal(ultracodePromptMode.id, FABLE_5_1_ULTRACODE_PROMPT_MODE_ID);
  assert.equal(ultracodePromptMode.instruction, FABLE_5_1_ULTRACODE_HARNESS_INSTRUCTION);
  assert.match(ultracodePromptMode.instruction, /invoke the available Workflow tool exactly once/);
  assert.match(ultracodePromptMode.instruction, /exactly one worker agent/);
  assert.match(ultracodePromptMode.instruction, /Do not set a worker model override/);

  const legacyBasisInputs = {
    benchmarkGenerationHash: "generation-hash",
    configurationId: "claude:fable@max",
    caseId: "case-a",
    trialCount: 1,
    conditionHash: "condition-hash"
  };
  const expectedLegacyBasisHash = crypto.createHash("sha256").update([
    legacyBasisInputs.benchmarkGenerationHash,
    legacyBasisInputs.configurationId,
    legacyBasisInputs.caseId,
    legacyBasisInputs.trialCount,
    NEUTRAL_HARNESS_INSTRUCTION,
    BENCHMARK_HARNESS_VERSION,
    legacyBasisInputs.conditionHash
  ].join(":")).digest("hex");
  assert.equal(createBenchmarkRowBasisHash(legacyBasisInputs), expectedLegacyBasisHash);
  assert.equal(
    createBenchmarkRowBasisHash({
      ...legacyBasisInputs,
      harnessInstruction: NEUTRAL_HARNESS_INSTRUCTION
    }),
    expectedLegacyBasisHash
  );
  assert.notEqual(
    createBenchmarkRowBasisHash({
      ...legacyBasisInputs,
      configurationId: FABLE_5_1_ULTRACODE_CONFIGURATION_ID,
      harnessInstruction: FABLE_5_1_ULTRACODE_HARNESS_INSTRUCTION
    }),
    expectedLegacyBasisHash
  );

  const treatment = {
    id: "skill:test-architecture",
    label: "Vasir · test-architecture",
    type: "skill",
    hash: "treatment-hash",
    content: "Use one authority."
  };
  const conditions = createBenchmarkConditions(treatment);
  const rowPlans = createBenchmarkRowPlans({
    benchmarkSource: {
      benchmarkGenerationHash: "generation-hash",
      benchmarkDefinition: {
        cases: [{ id: "case-a", task: "Design the system." }],
        outputContract: "Return one concrete design."
      }
    },
    configurations: [ultracodeConfiguration],
    trialCount: 1,
    conditions,
    treatment
  });
  assert.equal(rowPlans.length, 2);
  assert.ok(rowPlans.every((rowPlan) =>
    rowPlan.promptText.startsWith(FABLE_5_1_ULTRACODE_HARNESS_INSTRUCTION)
  ));
  assert.doesNotMatch(rowPlans[0].promptText, /Vasir Skill Guidance Start/);
  assert.match(rowPlans[1].promptText, /Vasir Skill Guidance Start/);
  assert.deepEqual(createBenchmarkPromptModeOverrides([
    ...defaultConfigurations,
    ultracodeConfiguration
  ]), {
    [FABLE_5_1_ULTRACODE_CONFIGURATION_ID]: {
      id: FABLE_5_1_ULTRACODE_PROMPT_MODE_ID,
      instruction: FABLE_5_1_ULTRACODE_HARNESS_INSTRUCTION,
      hash: ultracodePromptMode.hash
    }
  });

  const legacyPrompt = createBenchmarkGenerationPrompt({
    caseDefinition: { task: "Design the system." },
    outputContract: "Return one concrete design."
  });
  assert.equal(legacyPrompt, `${NEUTRAL_HARNESS_INSTRUCTION}

Task:
Design the system.

Output contract:
Return one concrete design.`);
});

test("benchmark generation serializes Ultracode rows after ordinary work while preserving plan order", async () => {
  const ordinaryConfigurations = [
    { id: "ordinary-a", provider: "claude", model: "claude-fable-5-1", reasoning: "xhigh" },
    { id: "ordinary-b", provider: "claude", model: "claude-fable-5-1", reasoning: "max" }
  ];
  const ultracodeConfiguration = {
    id: FABLE_5_1_ULTRACODE_CONFIGURATION_ID,
    provider: "claude",
    model: "claude-fable-5-1",
    reasoning: "ultracode"
  };
  const createPlan = (configuration, conditionId) => ({
    configuration,
    caseDefinition: { id: "case-a" },
    trialNumber: 1,
    condition: { id: conditionId },
    exactMessages: [{ role: "user", content: `${configuration.id}:${conditionId}` }],
    promptText: `${configuration.id}:${conditionId}`,
    basisHash: `${configuration.id}:${conditionId}:basis`
  });
  const rowPlans = [
    createPlan(ultracodeConfiguration, "clean"),
    createPlan(ordinaryConfigurations[0], "clean"),
    createPlan(ultracodeConfiguration, "skill:test"),
    createPlan(ordinaryConfigurations[1], "clean")
  ];
  const events = [];
  let activeOrdinary = 0;
  let activeUltracode = 0;
  let releaseOrdinary;
  const ordinaryBarrier = new Promise((resolve) => {
    releaseOrdinary = resolve;
  });
  const rowsPromise = generateBenchmarkRows({
    rowPlans,
    concurrency: 2,
    agentRunnerImplementation: async ({ configuration, promptText }) => {
      const isUltracode = configuration.id === FABLE_5_1_ULTRACODE_CONFIGURATION_ID;
      if (isUltracode) {
        activeUltracode += 1;
        events.push(`start:${promptText}`);
        assert.equal(activeOrdinary, 0);
        assert.equal(activeUltracode, 1);
        await Promise.resolve();
        events.push(`finish:${promptText}`);
        activeUltracode -= 1;
      } else {
        activeOrdinary += 1;
        events.push(`start:${promptText}`);
        if (activeOrdinary === 2) {
          releaseOrdinary();
        }
        await ordinaryBarrier;
        events.push(`finish:${promptText}`);
        activeOrdinary -= 1;
      }
      return { text: promptText };
    }
  });
  const rows = await rowsPromise;
  assert.deepEqual(rows.map((row) => row.rowKey), rowPlans.map((rowPlan) => [
    rowPlan.configuration.id,
    rowPlan.caseDefinition.id,
    "trial-1",
    rowPlan.condition.id
  ].join("::")));
  const firstUltracodeStart = events.findIndex((event) =>
    event.startsWith(`start:${FABLE_5_1_ULTRACODE_CONFIGURATION_ID}`)
  );
  const lastOrdinaryFinish = Math.max(
    ...events.map((event, index) => event.startsWith("finish:ordinary-") ? index : -1)
  );
  assert.ok(firstUltracodeStart > lastOrdinaryFinish);
});

test("benchmark extension requires exact prompt-mode metadata for an Ultracode source", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-ultracode-mode-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  const source = await createExtensionSourceFixture(projectDirectory, "fable-5.1@ultracode");
  const sourceRunFilePath = path.join(source.outputDirectory, "run.json");
  const sourceRun = JSON.parse(fs.readFileSync(sourceRunFilePath, "utf8"));
  const expectedOverrides = createBenchmarkPromptModeOverrides(sourceRun.configurations);
  assert.deepEqual(sourceRun.generation.promptModeOverrides, expectedOverrides);
  assert.deepEqual(Object.keys(expectedOverrides), [FABLE_5_1_ULTRACODE_CONFIGURATION_ID]);
  assert.ok(sourceRun.rows.every((row) =>
    row.promptText.startsWith(FABLE_5_1_ULTRACODE_HARNESS_INSTRUCTION)
  ));

  let generationCallCount = 0;
  const extensionArguments = {
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["terra@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => {
      generationCallCount += 1;
      return { text: promptText };
    },
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 50 }])),
      judging: { status: "complete", promptText: "extension judge", candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>")
  };

  const missingOverrides = structuredClone(sourceRun);
  delete missingOverrides.generation.promptModeOverrides;
  writeFile(sourceRunFilePath, `${JSON.stringify(missingOverrides, null, 2)}\n`);
  await assert.rejects(
    extendBenchmarkEval(extensionArguments),
    (error) => error?.code === "EVAL_BENCHMARK_EXTENSION_INCOMPATIBLE"
  );

  const tamperedOverrides = structuredClone(sourceRun);
  tamperedOverrides.generation.promptModeOverrides[FABLE_5_1_ULTRACODE_CONFIGURATION_ID].hash = "0".repeat(64);
  writeFile(sourceRunFilePath, `${JSON.stringify(tamperedOverrides, null, 2)}\n`);
  await assert.rejects(
    extendBenchmarkEval(extensionArguments),
    (error) => error?.code === "EVAL_BENCHMARK_EXTENSION_INCOMPATIBLE"
  );
  assert.equal(generationCallCount, 0);

  writeFile(sourceRunFilePath, `${JSON.stringify(sourceRun, null, 2)}\n`);
  const extension = await extendBenchmarkEval(extensionArguments);
  const extensionRun = JSON.parse(fs.readFileSync(
    path.join(extension.outputDirectory, "run.json"),
    "utf8"
  ));
  assert.deepEqual(extensionRun.generation.promptModeOverrides, expectedOverrides);
  assert.equal(generationCallCount, 2);
});

test("independent benchmark runs matched fresh clean and skill conditions and persists the judged report basis", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-run-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  writeFile(path.join(projectDirectory, "package.json"), "{}\n");
  writeFile(
    path.join(projectDirectory, ".agents", "skills", "test-architecture", "SKILL.md"),
    `---
name: test-architecture
description: Test architecture guidance.
---
Use one sharded authority.`
  );

  const seenPrompts = [];
  const result = await runBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    treatmentId: "skill:test-architecture",
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["sol@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => {
      seenPrompts.push(promptText);
      return {
        text: promptText.includes("Vasir Skill Guidance")
          ? "Treatment answer"
          : "Clean answer",
        usage: { totalTokens: 10 },
        runtimeReceipt: { freshSession: true }
      };
    },
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(
        rows.map((row) => [
          row.rowKey,
          {
            candidateId: `candidate-${row.conditionId}`,
            total: row.conditionId === "clean" ? 50 : 80,
            uncapped: row.conditionId === "clean" ? 50 : 80,
            gateCap: 100,
            gates: [],
            dimensions: [],
            reason: "fixture",
            strengths: [],
            risks: []
          }
        ])
      ),
      judging: {
        status: "complete",
        usage: { totalTokens: 5 },
        costUsd: null,
        ranking: [],
        freshContext: true,
        blinded: true
      }
    }),
    reportWriterImplementation: ({ outputFilePath }) => {
      writeFile(outputFilePath, "<!doctype html><title>Benchmark</title>");
    }
  });

  assert.equal(seenPrompts.length, 2);
  assert.ok(!seenPrompts[0].includes("Use one sharded authority."));
  assert.ok(seenPrompts[1].includes("Use one sharded authority."));
  assert.equal(result.summary.averageLift, 30);
  assert.equal(result.summary.bestConfigurationId, "codex:gpt-5.6-sol@max");
  assert.ok(fs.existsSync(result.reportFilePath));
  assert.ok(fs.existsSync(result.catalogFilePath));
  assert.match(fs.readFileSync(result.catalogFilePath, "utf8"), /Hyper-scale chat architecture/);

  const run = JSON.parse(fs.readFileSync(path.join(result.outputDirectory, "run.json"), "utf8"));
  assert.equal(run.benchmark.id, "hyper-scale-chat");
  assert.equal(run.treatment.id, "skill:test-architecture");
  assert.deepEqual(run.generation.promptModeOverrides, {});
  assert.equal(run.rows[0].exactMessages[0].content, seenPrompts[0]);
  assert.equal(run.rows[1].exactMessages[0].content, seenPrompts[1]);
  assert.equal(run.rows[0].runtimeReceipt.freshSession, true);
  assert.notEqual(run.rows[0].basisHash, run.rows[1].basisHash);
  assert.equal(run.rows[0].scoreBasisHash.length, 64);
  assert.equal(run.rows[1].scoreBasisHash.length, 64);
  assert.equal(run.judging.promptHash.length, 64);
  assert.equal(run.judging.cohortHash.length, 64);
  assert.equal(run.judging.cohortSize, 2);

  fs.rmSync(result.catalogFilePath);
  const regenerated = reportBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    runId: result.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 })
  });
  assert.ok(fs.existsSync(regenerated.catalogFilePath));
  assert.match(fs.readFileSync(regenerated.reportFilePath, "utf8"), /All prompts/);
});

test("benchmark extension preserves source scores and judges only appended rows", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-extend-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  writeFile(path.join(projectDirectory, "package.json"), "{}\n");
  writeFile(
    path.join(projectDirectory, ".agents", "skills", "test-architecture", "SKILL.md"),
    `---
name: test-architecture
description: Test architecture guidance.
---
Use one authority.`
  );

  const source = await runBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    treatmentId: "skill:test-architecture",
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["sol@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => ({
      text: promptText.includes("Vasir Skill Guidance") ? "Source treatment" : "Source clean",
      usage: { totalTokens: 11 },
      durationMs: 12,
      runtimeReceipt: { freshSession: true, source: true }
    }),
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 40 }])),
      judging: { status: "complete", promptText: "source judge", candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>")
  });
  const sourceRunFilePath = path.join(source.outputDirectory, "run.json");
  const legacySourceRun = JSON.parse(fs.readFileSync(sourceRunFilePath, "utf8"));
  assert.deepEqual(legacySourceRun.generation.promptModeOverrides, {});
  delete legacySourceRun.generation.promptModeOverrides;
  writeFile(sourceRunFilePath, `${JSON.stringify(legacySourceRun, null, 2)}\n`);
  const sourceBytesBefore = fs.readFileSync(sourceRunFilePath);
  const sourceRunBefore = JSON.parse(sourceBytesBefore);
  const generatedPrompts = [];
  let checkpoint = null;
  const extension = await extendBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["codex:gpt-5.6-terra@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => {
      generatedPrompts.push(promptText);
      return {
        text: promptText.includes("Vasir Skill Guidance") ? "New treatment" : "New clean",
        usage: { totalTokens: 22 },
        durationMs: 23,
        runtimeReceipt: { freshSession: true, extension: true }
      };
    },
    judgeRowsImplementation: async ({ rows }) => {
      const benchmarkHistoryDirectory = path.join(
        projectDirectory,
        ".agents",
        "vasir-evals",
        "hyper-scale-chat"
      );
      const extensionRunId = fs.readdirSync(benchmarkHistoryDirectory)
        .find((candidateRunId) => candidateRunId.includes("__extend__"));
      checkpoint = JSON.parse(fs.readFileSync(
        path.join(benchmarkHistoryDirectory, extensionRunId, "run.json"),
        "utf8"
      ));
      assert.equal(rows.length, 2);
      assert.ok(rows.every((row) => row.configurationId === "codex:gpt-5.6-terra@max"));
      assert.ok(rows.every((row) => row.score === null && row.scoreBasisHash === null));
      return {
        scoresByRowKey: new Map(rows.map((row) => [
          row.rowKey,
          { total: row.conditionId === "clean" ? 60 : 80 }
        ])),
        judging: {
          status: "complete",
          cohortSize: rows.length,
          promptText: "appended cohort judge",
          candidateOrder: rows.map((row, index) => ({
            candidateId: `candidate-${index + 1}`,
            rowKey: row.rowKey
          }))
        }
      };
    },
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: (() => {
      const dates = [
        new Date("2026-09-01T12:00:00.000Z"),
        new Date("2026-09-01T12:00:01.000Z")
      ];
      return () => dates.shift();
    })()
  });

  assert.equal(extension.runStatus, "complete");
  assert.equal(extension.sourceRunId, source.runId);
  assert.equal(extension.sourceRowCount, 2);
  assert.deepEqual(extension.extendedConfigurationIds, ["codex:gpt-5.6-terra@max"]);
  assert.equal(generatedPrompts.length, 2);
  assert.equal(checkpoint?.runStatus, "incomplete");
  assert.equal(checkpoint?.judging.status, "pending");
  assert.equal(checkpoint?.rows.length, 4);
  assert.deepEqual(checkpoint?.rows.slice(0, 2), sourceRunBefore.rows);
  assert.ok(checkpoint?.rows.slice(2).every((row) => row.score === null && row.scoreBasisHash === null));
  assert.deepEqual(checkpoint?.extension, {
    sourceRunId: source.runId,
    sourceRowCount: 2,
    extendedConfigurationIds: ["codex:gpt-5.6-terra@max"],
    judgingScope: {
      strategy: "appended-rows-only-v1",
      sourceRunId: source.runId,
      sourceRowCount: 2,
      appendedRowCount: 2,
      combinedRowCount: 4,
      sourceScoresPreserved: true,
      sourceJudgingStatus: "complete",
      sourceJudgingBasisHash: sourceRunBefore.judging.basisHash
    }
  });

  const extensionRun = JSON.parse(fs.readFileSync(path.join(extension.outputDirectory, "run.json"), "utf8"));
  assert.equal(extensionRun.rows.length, 4);
  assert.equal(extensionRun.configurations.length, 2);
  assert.ok(extensionRun.rows.every((row) => Number.isFinite(row.score.total)));
  assert.ok(extensionRun.rows.every((row) => row.scoreBasisHash.length === 64));
  assert.deepEqual(extensionRun.rows.slice(0, sourceRunBefore.rows.length), sourceRunBefore.rows);
  assert.deepEqual(extensionRun.rows.slice(2).map((row) => row.score.total), [60, 80]);
  assert.equal(extensionRun.judging.cohortSize, 2);
  assert.deepEqual(extensionRun.judging.extensionScope, extensionRun.extension.judgingScope);
  assert.deepEqual(fs.readFileSync(sourceRunFilePath), sourceBytesBefore);
});

test("benchmark extension checkpoints each returned row and resumes after interruption without repurchasing it", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-extend-interrupt-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  const source = await createExtensionSourceFixture(projectDirectory);
  const sourceRunFilePath = path.join(source.outputDirectory, "run.json");
  const sourceBytes = fs.readFileSync(sourceRunFilePath);
  const initialPrompts = [];
  let extensionRunId = null;

  await assert.rejects(
    extendBenchmarkEval({
      benchmarkName: "hyper-scale-chat",
      sourceRunId: source.runId,
      currentWorkingDirectory: projectDirectory,
      projectRootDirectory: projectDirectory,
      requestedModelArguments: ["terra@max"],
      jsonOutput: true,
      spawnSyncImplementation: () => ({ status: 0 }),
      generationConcurrency: 1,
      agentRunnerImplementation: async ({ promptText }) => {
        const benchmarkHistoryDirectory = path.join(
          projectDirectory,
          ".agents",
          "vasir-evals",
          "hyper-scale-chat"
        );
        extensionRunId = fs.readdirSync(benchmarkHistoryDirectory)
          .find((candidateRunId) => candidateRunId.includes("__extend__"));
        const skeleton = JSON.parse(fs.readFileSync(
          path.join(benchmarkHistoryDirectory, extensionRunId, "run.json"),
          "utf8"
        ));
        assert.deepEqual(
          skeleton.rows.slice(2).map((row) => row.rowStatus),
          ["pending", "pending"]
        );
        initialPrompts.push(promptText);
        return { text: "Paid clean response", runtimeReceipt: { freshSession: true, paid: true } };
      },
      generationCheckpointImplementation: async ({ row, runId }) => {
        const checkpoint = JSON.parse(fs.readFileSync(
          path.join(projectDirectory, ".agents", "vasir-evals", "hyper-scale-chat", runId, "run.json"),
          "utf8"
        ));
        assert.equal(checkpoint.rows.find((candidate) => candidate.rowKey === row.rowKey).rowStatus, "complete");
        throw Object.assign(new Error("fixture process interruption"), { code: "FIXTURE_PROCESS_INTERRUPTED" });
      },
      reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
      nowImplementation: () => new Date("2026-09-01T17:00:00.000Z")
    }),
    (error) => error?.code === "FIXTURE_PROCESS_INTERRUPTED"
  );

  assert.equal(initialPrompts.length, 1);
  const interruptedRunPath = path.join(
    projectDirectory,
    ".agents",
    "vasir-evals",
    "hyper-scale-chat",
    extensionRunId,
    "run.json"
  );
  const interruptedRun = JSON.parse(fs.readFileSync(interruptedRunPath, "utf8"));
  assert.deepEqual(interruptedRun.rows.slice(2).map((row) => row.rowStatus), ["complete", "pending"]);
  assert.equal(interruptedRun.rows[2].outputText, "Paid clean response");

  // A hard interruption can leave the last planned cell absent rather than pending.
  // Resume must reconstruct that cell from the validated extension plan without
  // repurchasing the row that was already durably checkpointed.
  interruptedRun.rows = interruptedRun.rows.filter((row) => row.rowStatus !== "pending");
  fs.writeFileSync(interruptedRunPath, `${JSON.stringify(interruptedRun, null, 2)}\n`);

  const resumedPrompts = [];
  const resumed = await extendBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    resumeRunId: extensionRunId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["terra@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => {
      resumedPrompts.push(promptText);
      return { text: "Paid treatment response", runtimeReceipt: { freshSession: true, paid: true } };
    },
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 75 }])),
      judging: { status: "complete", cohortSize: rows.length, promptText: "resume judge", candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: () => new Date("2026-09-01T17:01:00.000Z")
  });

  assert.equal(resumed.runId, extensionRunId);
  assert.equal(resumed.runStatus, "complete");
  assert.equal(resumedPrompts.length, 1);
  assert.match(resumedPrompts[0], /Vasir Skill Guidance/);
  const resumedRun = JSON.parse(fs.readFileSync(interruptedRunPath, "utf8"));
  assert.equal(resumedRun.rows[2].outputText, "Paid clean response");
  assert.equal(resumedRun.rows[3].outputText, "Paid treatment response");
  assert.deepEqual(fs.readFileSync(sourceRunFilePath), sourceBytes);
});

test("benchmark extension resume reruns only a failed cell and preserves the successful paid response", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-extend-cell-retry-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  const source = await createExtensionSourceFixture(projectDirectory);
  const firstAttemptPrompts = [];
  const firstAttempt = await extendBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["terra@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => {
      firstAttemptPrompts.push(promptText);
      if (promptText.includes("Vasir Skill Guidance")) {
        throw Object.assign(new Error("one paid cell failed"), { code: "FIXTURE_CELL_FAILED" });
      }
      return {
        text: "Durable successful paid response",
        usage: { totalTokens: 99 },
        runtimeReceipt: { freshSession: true, paid: true }
      };
    },
    judgeRowsImplementation: async () => {
      throw new Error("partial response cohorts must not be judged");
    },
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: (() => {
      const dates = [new Date("2026-09-01T18:00:00.000Z"), new Date("2026-09-01T18:00:01.000Z")];
      return () => dates.shift();
    })()
  });
  assert.equal(firstAttempt.runStatus, "incomplete");
  assert.equal(firstAttemptPrompts.length, 2);

  const retryPrompts = [];
  const resumed = await extendBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    resumeRunId: firstAttempt.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["terra@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => {
      retryPrompts.push(promptText);
      return { text: "Recovered paid treatment response", runtimeReceipt: { freshSession: true, paid: true } };
    },
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 75 }])),
      judging: { status: "complete", cohortSize: rows.length, promptText: "retry judge", candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: () => new Date("2026-09-01T18:01:00.000Z")
  });
  assert.equal(resumed.runStatus, "complete");
  assert.equal(retryPrompts.length, 1);
  assert.match(retryPrompts[0], /Vasir Skill Guidance/);
  const resumedRun = JSON.parse(fs.readFileSync(path.join(resumed.outputDirectory, "run.json"), "utf8"));
  const durableRow = resumedRun.rows.find((row) => row.outputText === "Durable successful paid response");
  assert.equal(durableRow.usage.totalTokens, 99);
  assert.deepEqual(durableRow.runtimeReceipt, { freshSession: true, paid: true });
});

test("benchmark extension upgrades only failed Ultracode v1 rows and preserves completed paid cells", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-ultracode-upgrade-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  const source = await createExtensionSourceFixture(projectDirectory);
  const sourceRunFilePath = path.join(source.outputDirectory, "run.json");
  const sourceBytes = fs.readFileSync(sourceRunFilePath);
  const requestedModelArguments = [
    "claude:claude-fable-5-1@xhigh",
    "claude:claude-fable-5-1@max",
    FABLE_5_1_ULTRACODE_CONFIGURATION_ID
  ];
  const firstAttempt = await extendBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments,
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ configuration, promptText }) => {
      if (configuration.id === FABLE_5_1_ULTRACODE_CONFIGURATION_ID) {
        throw Object.assign(new Error("v1 workflow exceeded its lifecycle window"), {
          code: "FIXTURE_WORKFLOW_TIMEOUT"
        });
      }
      return {
        text: `Durable ${configuration.reasoning} ${promptText.includes("Vasir Skill Guidance") ? "skill" : "clean"}`,
        usage: { totalTokens: configuration.reasoning === "xhigh" ? 101 : 202 },
        costUsd: configuration.reasoning === "xhigh" ? 0.1 : 0.2,
        durationMs: configuration.reasoning === "xhigh" ? 1001 : 2002,
        runtimeReceipt: { freshSession: true, paid: true, reasoning: configuration.reasoning }
      };
    },
    judgeRowsImplementation: async () => {
      throw new Error("partial response cohorts must not be judged");
    },
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: (() => {
      const dates = [new Date("2026-09-01T19:00:00.000Z"), new Date("2026-09-01T19:00:01.000Z")];
      return () => dates.shift();
    })()
  });
  assert.equal(firstAttempt.runStatus, "incomplete");

  const runFilePath = path.join(firstAttempt.outputDirectory, "run.json");
  const legacyRun = JSON.parse(fs.readFileSync(runFilePath, "utf8"));
  const durableEvidence = (row) => ({
    rowKey: row.rowKey,
    rowStatus: row.rowStatus,
    exactMessages: row.exactMessages,
    promptText: row.promptText,
    outputText: row.outputText,
    usage: row.usage,
    costUsd: row.costUsd,
    durationMs: row.durationMs,
    runtimeReceipt: row.runtimeReceipt,
    basisHash: row.basisHash,
    error: row.error
  });
  const completedPaidRowsBefore = legacyRun.rows
    .filter((row) => row.configurationId.includes("claude-fable-5-1@") && row.rowStatus === "complete")
    .map(durableEvidence);
  const legacyOverride = {
    id: FABLE_5_1_ULTRACODE_LEGACY_PROMPT_MODE_ID,
    instruction: FABLE_5_1_ULTRACODE_LEGACY_HARNESS_INSTRUCTION,
    hash: crypto.createHash("sha256")
      .update(FABLE_5_1_ULTRACODE_LEGACY_HARNESS_INSTRUCTION)
      .digest("hex")
  };
  legacyRun.generation.promptModeOverrides[FABLE_5_1_ULTRACODE_CONFIGURATION_ID] = legacyOverride;
  for (const row of legacyRun.rows.filter(
    (candidate) => candidate.configurationId === FABLE_5_1_ULTRACODE_CONFIGURATION_ID
  )) {
    assert.ok(row.promptText.startsWith(FABLE_5_1_ULTRACODE_HARNESS_INSTRUCTION));
    row.promptText = FABLE_5_1_ULTRACODE_LEGACY_HARNESS_INSTRUCTION +
      row.promptText.slice(FABLE_5_1_ULTRACODE_HARNESS_INSTRUCTION.length);
    row.exactMessages = [{ role: "user", content: row.promptText }];
    const condition = legacyRun.conditions.find((candidate) => candidate.id === row.conditionId);
    row.basisHash = createBenchmarkRowBasisHash({
      benchmarkGenerationHash: legacyRun.benchmark.generationHash,
      configurationId: row.configurationId,
      caseId: row.caseId,
      trialCount: legacyRun.generation.trialCount,
      conditionHash: condition.hash,
      harnessInstruction: FABLE_5_1_ULTRACODE_LEGACY_HARNESS_INSTRUCTION
    });
  }
  writeFile(runFilePath, `${JSON.stringify(legacyRun, null, 2)}\n`);

  const completedRebase = structuredClone(legacyRun);
  const firstLegacyUltracodeRow = completedRebase.rows.find(
    (row) => row.configurationId === FABLE_5_1_ULTRACODE_CONFIGURATION_ID
  );
  firstLegacyUltracodeRow.rowStatus = "complete";
  firstLegacyUltracodeRow.outputText = "Completed v1 evidence must not be rebased.";
  firstLegacyUltracodeRow.error = null;
  writeFile(runFilePath, `${JSON.stringify(completedRebase, null, 2)}\n`);
  let rejectedGenerationCalls = 0;
  await assert.rejects(
    extendBenchmarkEval({
      benchmarkName: "hyper-scale-chat",
      sourceRunId: source.runId,
      resumeRunId: firstAttempt.runId,
      currentWorkingDirectory: projectDirectory,
      projectRootDirectory: projectDirectory,
      requestedModelArguments,
      jsonOutput: true,
      spawnSyncImplementation: () => ({ status: 0 }),
      agentRunnerImplementation: async () => {
        rejectedGenerationCalls += 1;
        return { text: "must not run" };
      }
    }),
    (error) => error?.code === "EVAL_BENCHMARK_EXTENSION_RESUME_INCOMPATIBLE"
  );
  assert.equal(rejectedGenerationCalls, 0);
  writeFile(runFilePath, `${JSON.stringify(legacyRun, null, 2)}\n`);

  const retryConfigurationIds = [];
  const resumed = await extendBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    resumeRunId: firstAttempt.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments,
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ configuration, promptText }) => {
      retryConfigurationIds.push(configuration.id);
      assert.equal(configuration.id, FABLE_5_1_ULTRACODE_CONFIGURATION_ID);
      assert.ok(promptText.startsWith(FABLE_5_1_ULTRACODE_HARNESS_INSTRUCTION));
      return {
        text: "Recovered bounded Ultracode response",
        runtimeReceipt: { freshSession: true, workflowExecutionObserved: true }
      };
    },
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 75 }])),
      judging: { status: "complete", cohortSize: rows.length, promptText: "upgrade judge", candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: () => new Date("2026-09-01T19:01:00.000Z")
  });
  assert.equal(resumed.runStatus, "complete");
  assert.deepEqual(retryConfigurationIds, [
    FABLE_5_1_ULTRACODE_CONFIGURATION_ID,
    FABLE_5_1_ULTRACODE_CONFIGURATION_ID
  ]);
  const resumedRun = JSON.parse(fs.readFileSync(runFilePath, "utf8"));
  assert.deepEqual(
    resumedRun.rows
      .filter((row) => row.configurationId.includes("claude-fable-5-1@") && row.reasoning !== "ultracode")
      .map(durableEvidence),
    completedPaidRowsBefore
  );
  assert.equal(resumedRun.extension.promptModeMigrations.length, 1);
  assert.equal(
    resumedRun.extension.promptModeMigrations[0].configurationId,
    FABLE_5_1_ULTRACODE_CONFIGURATION_ID
  );
  assert.equal(resumedRun.extension.promptModeMigrations[0].completedRowsRebased, 0);
  assert.deepEqual(fs.readFileSync(sourceRunFilePath), sourceBytes);
});

test("benchmark extension rejects duplicate or incompatible evidence before generation", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-extend-invalid-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  writeFile(path.join(projectDirectory, "package.json"), "{}\n");
  writeFile(
    path.join(projectDirectory, ".agents", "skills", "test-architecture", "SKILL.md"),
    `---
name: test-architecture
description: Test architecture guidance.
---
Use one authority.`
  );
  const source = await runBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    treatmentId: "skill:test-architecture",
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["sol@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => ({ text: promptText }),
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 50 }])),
      judging: { status: "complete", promptText: "judge", candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>")
  });
  let generationCallCount = 0;
  await assert.rejects(
    extendBenchmarkEval({
      benchmarkName: "hyper-scale-chat",
      sourceRunId: source.runId,
      currentWorkingDirectory: projectDirectory,
      projectRootDirectory: projectDirectory,
      requestedModelArguments: ["terra"],
      spawnSyncImplementation: () => ({ status: 0 }),
      agentRunnerImplementation: async () => {
        generationCallCount += 1;
        return { text: "should not run" };
      }
    }),
    (error) => error?.code === "EVAL_BENCHMARK_REASONING_REQUIRED"
  );
  await assert.rejects(
    extendBenchmarkEval({
      benchmarkName: "hyper-scale-chat",
      sourceRunId: source.runId,
      currentWorkingDirectory: projectDirectory,
      projectRootDirectory: projectDirectory,
      requestedModelArguments: ["terra@max", "codex:gpt-5.6-terra@max"],
      spawnSyncImplementation: () => ({ status: 0 }),
      agentRunnerImplementation: async () => {
        generationCallCount += 1;
        return { text: "should not run" };
      }
    }),
    (error) => error?.code === "EVAL_BENCHMARK_EXTENSION_DUPLICATE"
  );

  const sourceRunFilePath = path.join(source.outputDirectory, "run.json");
  const sourceRunBeforeTamper = JSON.parse(fs.readFileSync(sourceRunFilePath, "utf8"));
  const scoringDriftSource = structuredClone(sourceRunBeforeTamper);
  scoringDriftSource.benchmark.definition.scoring.judgeInstructions += " Changed rubric.";
  fs.writeFileSync(sourceRunFilePath, `${JSON.stringify(scoringDriftSource, null, 2)}\n`);
  await assert.rejects(
    extendBenchmarkEval({
      benchmarkName: "hyper-scale-chat",
      sourceRunId: source.runId,
      currentWorkingDirectory: projectDirectory,
      projectRootDirectory: projectDirectory,
      requestedModelArguments: ["terra@max"],
      spawnSyncImplementation: () => ({ status: 0 }),
      agentRunnerImplementation: async () => {
        generationCallCount += 1;
        return { text: "should not run" };
      }
    }),
    (error) => error?.code === "EVAL_BENCHMARK_EXTENSION_INCOMPATIBLE"
  );

  const tamperedSource = structuredClone(sourceRunBeforeTamper);
  tamperedSource.rows[0].basisHash = "0".repeat(64);
  fs.writeFileSync(sourceRunFilePath, `${JSON.stringify(tamperedSource, null, 2)}\n`);
  await assert.rejects(
    extendBenchmarkEval({
      benchmarkName: "hyper-scale-chat",
      sourceRunId: source.runId,
      currentWorkingDirectory: projectDirectory,
      projectRootDirectory: projectDirectory,
      requestedModelArguments: ["terra@max"],
      spawnSyncImplementation: () => ({ status: 0 }),
      agentRunnerImplementation: async () => {
        generationCallCount += 1;
        return { text: "should not run" };
      }
    }),
    (error) => error?.code === "EVAL_BENCHMARK_EXTENSION_INCOMPATIBLE"
  );
  assert.equal(generationCallCount, 0);
});

test("benchmark extension checkpoints generation failures and preserves judge failures for exact resume", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-extend-recovery-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  writeFile(path.join(projectDirectory, "package.json"), "{}\n");
  writeFile(
    path.join(projectDirectory, ".agents", "skills", "test-architecture", "SKILL.md"),
    `---
name: test-architecture
description: Test architecture guidance.
---
Use one authority.`
  );
  const source = await runBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    treatmentId: "skill:test-architecture",
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["sol@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => ({ text: promptText }),
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 50 }])),
      judging: { status: "complete", promptText: "judge", candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>")
  });
  const sourceRunFilePath = path.join(source.outputDirectory, "run.json");
  const sourceBytes = fs.readFileSync(sourceRunFilePath);
  let judgeCalled = false;
  const generationFailure = await extendBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["terra@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => {
      if (promptText.includes("Vasir Skill Guidance")) {
        throw Object.assign(new Error("generation failed"), { code: "FIXTURE_GENERATION_FAILED" });
      }
      return { text: "New clean" };
    },
    judgeRowsImplementation: async () => {
      judgeCalled = true;
      throw new Error("must not judge a partial cohort");
    },
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: (() => {
      const dates = [new Date("2026-09-01T13:00:00.000Z"), new Date("2026-09-01T13:00:01.000Z")];
      return () => dates.shift();
    })()
  });
  const generationFailureRun = JSON.parse(fs.readFileSync(
    path.join(generationFailure.outputDirectory, "run.json"),
    "utf8"
  ));
  assert.equal(generationFailure.runStatus, "incomplete");
  assert.equal(generationFailureRun.judging.status, "pending");
  assert.equal(generationFailureRun.summary.rowCounts.failed, 1);
  assert.equal(judgeCalled, false);

  const judgeFailure = await extendBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["luna@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => ({ text: promptText }),
    judgeRowsImplementation: async () => {
      throw Object.assign(new Error("judge interrupted"), { code: "FIXTURE_JUDGE_INTERRUPTED" });
    },
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: (() => {
      const dates = [new Date("2026-09-01T14:00:00.000Z"), new Date("2026-09-01T14:00:01.000Z")];
      return () => dates.shift();
    })()
  });
  const judgeFailureRun = JSON.parse(fs.readFileSync(path.join(judgeFailure.outputDirectory, "run.json"), "utf8"));
  assert.equal(judgeFailure.runStatus, "incomplete");
  assert.equal(judgeFailureRun.judging.status, "error");
  assert.equal(judgeFailureRun.judging.error.code, "FIXTURE_JUDGE_INTERRUPTED");
  assert.ok(judgeFailureRun.rows.every((row) => row.rowStatus === "complete"));
  assert.ok(judgeFailureRun.rows.slice(0, 2).every((row) => row.score && row.scoreBasisHash));
  assert.ok(judgeFailureRun.rows.slice(2).every((row) => row.score === null && row.scoreBasisHash === null));

  const recovered = await extendBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    resumeRunId: judgeFailure.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["luna@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async () => {
      throw new Error("completed extension rows must not be regenerated during judge recovery");
    },
    judgeRowsImplementation: async ({ rows }) => {
      assert.equal(rows.length, 2);
      assert.ok(rows.every((row) => row.configurationId === "codex:gpt-5.6-luna@max"));
      assert.ok(rows.every((row) => row.score === null && row.scoreBasisHash === null));
      return {
        scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 75 }])),
        judging: { status: "complete", basisHash: "a".repeat(64), promptText: "recovered", candidateOrder: [] }
      };
    },
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: () => new Date("2026-09-01T15:00:00.000Z")
  });
  assert.equal(recovered.sourceRunId, source.runId);
  assert.equal(recovered.runId, judgeFailure.runId);
  assert.equal(recovered.runStatus, "complete");
  const recoveredRun = JSON.parse(fs.readFileSync(path.join(recovered.outputDirectory, "run.json"), "utf8"));
  assert.deepEqual(recoveredRun.rows.slice(0, 2), judgeFailureRun.rows.slice(0, 2));
  assert.deepEqual(recoveredRun.rows.slice(2).map((row) => row.score.total), [75, 75]);
  assert.deepEqual(fs.readFileSync(sourceRunFilePath), sourceBytes);
});

test("benchmark extension resume retains completed appended judge batches and reruns only missing evidence", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-extend-panel-retry-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  writeFile(path.join(projectDirectory, "package.json"), "{}\n");
  writeFile(
    path.join(projectDirectory, ".agents", "skills", "test-architecture", "SKILL.md"),
    `---
name: test-architecture
description: Test architecture guidance.
---
Use one authority.`
  );
  const source = await runBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    treatmentId: "skill:test-architecture",
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["sol@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => ({ text: promptText }),
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 50 }])),
      judging: { status: "complete", promptText: "source judge", candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>")
  });

  const firstJudgeCalls = [];
  const extension = await extendBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["terra@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ configuration, promptText, outputSchema }) => {
      if (!outputSchema) {
        return { text: promptText };
      }
      firstJudgeCalls.push(configuration.id);
      if (configuration.id === "claude:claude-fable-5-1@max") {
        throw Object.assign(new Error("fixture panel interruption"), { code: "FIXTURE_PANEL_INTERRUPTED" });
      }
      return createPanelResponse(outputSchema);
    },
    judgeRowsImplementation: judgeBenchmarkRows,
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: (() => {
      const dates = [new Date("2026-09-01T16:00:00.000Z"), new Date("2026-09-01T16:00:01.000Z")];
      return () => dates.shift();
    })()
  });
  assert.equal(extension.runStatus, "incomplete");
  assert.deepEqual(firstJudgeCalls, [
    "codex:gpt-6-astra@xhigh",
    "claude:claude-fable-5-1@max"
  ]);
  const extensionRun = JSON.parse(fs.readFileSync(path.join(extension.outputDirectory, "run.json"), "utf8"));
  assert.equal(extensionRun.judging.status, "error");
  assert.equal(extensionRun.judging.error.code, "EVAL_BENCHMARK_PANEL_INCOMPLETE");
  assert.equal(extensionRun.judging.judges.filter((judge) => judge.status === "complete").length, 1);
  assert.ok(extensionRun.rows.slice(0, 2).every((row) => row.score && row.scoreBasisHash));
  assert.ok(extensionRun.rows.slice(2).every((row) => row.score === null && row.scoreBasisHash === null));

  const retryCalls = [];
  const recovered = await extendBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    sourceRunId: source.runId,
    resumeRunId: extension.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["terra@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ configuration, outputSchema }) => {
      retryCalls.push(configuration.id);
      return createPanelResponse(outputSchema);
    },
    judgeRowsImplementation: judgeBenchmarkRows,
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: (() => {
      const dates = [new Date("2026-09-01T16:01:00.000Z"), new Date("2026-09-01T16:01:01.000Z")];
      return () => dates.shift();
    })()
  });
  assert.equal(recovered.runStatus, "complete");
  assert.equal(recovered.runId, extension.runId);
  assert.deepEqual(retryCalls, ["claude:claude-fable-5-1@max"]);
  const recoveredRun = JSON.parse(fs.readFileSync(path.join(recovered.outputDirectory, "run.json"), "utf8"));
  assert.equal(
    recoveredRun.judging.judges.find((judge) => judge.configuration.id === "codex:gpt-6-astra@xhigh").reused,
    true
  );
});

test("benchmark artifacts retain actionable fresh-agent failure diagnostics", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-failure-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  writeFile(path.join(projectDirectory, "package.json"), "{}\n");
  writeFile(
    path.join(projectDirectory, ".agents", "skills", "test-architecture", "SKILL.md"),
    `---
name: test-architecture
description: Test architecture guidance.
---
Use one authority.`
  );

  const result = await runBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    treatmentId: "skill:test-architecture",
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["luna@low"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => {
      if (!promptText.includes("Vasir Skill Guidance")) {
        const error = new Error("Model alias unavailable.");
        error.code = "EVAL_AGENT_RUNTIME_FAILED";
        error.suggestion = "Choose an advertised model alias.";
        error.context = { exitCode: 2, stderr: "unknown model" };
        throw error;
      }
      return { text: "Treatment answer", runtimeReceipt: { freshSession: true } };
    },
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows
        .filter((row) => row.rowStatus === "complete")
        .map((row) => [row.rowKey, { total: 70 }])),
      judging: { status: "complete", promptText: "judge", candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => {
      writeFile(outputFilePath, "<!doctype html>");
    }
  });

  const run = JSON.parse(fs.readFileSync(path.join(result.outputDirectory, "run.json"), "utf8"));
  const failedRow = run.rows.find((row) => row.rowStatus === "error");
  assert.equal(run.runStatus, "incomplete");
  assert.equal(failedRow.error.suggestion, "Choose an advertised model alias.");
  assert.deepEqual(failedRow.error.context, { exitCode: 2, stderr: "unknown model" });
});

test("persists generated responses before judging so an interrupted run can be rejudged", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-checkpoint-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  writeFile(path.join(projectDirectory, "package.json"), "{}\n");
  writeFile(
    path.join(projectDirectory, ".agents", "skills", "test-architecture", "SKILL.md"),
    `---
name: test-architecture
description: Test architecture guidance.
---
Use one authority.`
  );

  let checkpoint = null;
  let recovered = null;
  const result = await runBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    treatmentId: "skill:test-architecture",
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["sol@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => ({
      text: promptText.includes("Vasir Skill Guidance") ? "Treatment answer" : "Clean answer"
    }),
    judgeRowsImplementation: async ({ rows }) => {
      const benchmarkHistoryDirectory = path.join(
        projectDirectory,
        ".agents",
        "vasir-evals",
        "hyper-scale-chat"
      );
      const [checkpointRunId] = fs.readdirSync(benchmarkHistoryDirectory);
      checkpoint = JSON.parse(fs.readFileSync(
        path.join(benchmarkHistoryDirectory, checkpointRunId, "run.json"),
        "utf8"
      ));
      recovered = await rejudgeBenchmarkEval({
        benchmarkName: "hyper-scale-chat",
        runId: checkpoint.runId,
        currentWorkingDirectory: projectDirectory,
        projectRootDirectory: projectDirectory,
        jsonOutput: true,
        judgeRowsImplementation: async ({ rows: recoveredRows }) => ({
          scoresByRowKey: new Map(recoveredRows.map((row) => [row.rowKey, { total: 75 }])),
          judging: { status: "complete", promptText: "recovery judge", candidateOrder: [] }
        }),
        reportWriterImplementation: ({ outputFilePath }) => {
          writeFile(outputFilePath, "<!doctype html><title>Recovered</title>");
        }
      });
      return {
        scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 80 }])),
        judging: { status: "complete", promptText: "original judge", candidateOrder: [] }
      };
    },
    reportWriterImplementation: ({ outputFilePath }) => {
      writeFile(outputFilePath, "<!doctype html><title>Benchmark</title>");
    }
  });

  assert.equal(checkpoint?.runStatus, "incomplete");
  assert.equal(checkpoint?.judging.status, "pending");
  assert.deepEqual(checkpoint?.rows.map((row) => row.outputText), ["Clean answer", "Treatment answer"]);
  assert.deepEqual(checkpoint?.rows.map((row) => row.score), [null, null]);
  assert.equal(recovered?.sourceRunId, checkpoint?.runId);
  assert.equal(recovered?.runStatus, "complete");
  assert.equal(result.runStatus, "complete");
});

test("saved benchmark responses can be rejudged into a new immutable run with a new panel", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-rejudge-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  writeFile(path.join(projectDirectory, "package.json"), "{}\n");
  writeFile(
    path.join(projectDirectory, ".agents", "skills", "test-architecture", "SKILL.md"),
    `---
name: test-architecture
description: Test architecture guidance.
---
Use one authority.`
  );

  const original = await runBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    treatmentId: "skill:test-architecture",
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["sol@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText, outputSchema }) => outputSchema
      ? createPanelResponse(outputSchema)
      : { text: promptText.includes("Vasir Skill Guidance") ? "Treatment answer" : "Clean answer" },
    judgeRowsImplementation: (options) => judgeBenchmarkRows({
      ...options,
      judgingConfiguration: {
        panel: ["codex:gpt-5.6-sol@ultra", "codex:gpt-5.6-terra@ultra", "claude:opus@max"],
        synthesizer: null
      }
    }),
    reportWriterImplementation: ({ outputFilePath }) => {
      writeFile(outputFilePath, "<!doctype html>");
    }
  });
  const originalRunFilePath = path.join(original.outputDirectory, "run.json");
  const originalRunBytes = fs.readFileSync(originalRunFilePath);
  const originalRun = JSON.parse(originalRunBytes.toString("utf8"));
  assert.equal(originalRun.judging.aggregation.method, "majority-gates-median-dimensions-v1");
  let capturedPlan = null;
  const rejudgeCalls = [];
  const rejudged = await rejudgeBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    runId: original.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    jsonOutput: true,
    agentRunnerImplementation: async ({ configuration, outputSchema }) => {
      assert.ok(outputSchema?.properties.evaluations, "Rejudging saved responses only calls independent judges.");
      rejudgeCalls.push(configuration.id);
      const response = createPanelResponse(outputSchema);
      const payload = JSON.parse(response.text);
      for (const evaluation of payload.evaluations) {
        for (const dimension of evaluation.dimensions) {
          dimension.rating = configuration.provider === "codex" ? 4 : 3;
        }
      }
      return { ...response, text: JSON.stringify(payload) };
    },
    judgeRowsImplementation: async (options) => {
      capturedPlan = options.judgingConfiguration;
      return judgeBenchmarkRows(options);
    },
    reportWriterImplementation: ({ outputFilePath }) => {
      writeFile(outputFilePath, "<!doctype html><title>Rejudged</title>");
    },
    nowImplementation: (() => {
      const dates = [
        new Date("2026-08-26T12:00:00.000Z"),
        new Date("2026-08-26T12:00:01.000Z")
      ];
      return () => dates.shift();
    })()
  });

  assert.notEqual(rejudged.runId, original.runId);
  assert.equal(rejudged.sourceRunId, original.runId);
  assert.ok(fs.existsSync(rejudged.catalogFilePath));
  assert.deepEqual(capturedPlan.panel.map((configuration) => configuration.id), [
    "codex:gpt-6-astra@xhigh",
    "claude:claude-fable-5-1@max"
  ]);
  assert.deepEqual(rejudgeCalls, capturedPlan.panel.map((configuration) => configuration.id));
  assert.equal(capturedPlan.synthesizer, null);
  const rejudgedRun = JSON.parse(fs.readFileSync(path.join(rejudged.outputDirectory, "run.json"), "utf8"));
  assert.equal(rejudgedRun.rescoredFromRunId, original.runId);
  assert.equal(rejudgedRun.generation.sourceRunId, original.runId);
  assert.equal(rejudgedRun.scorerVersion, "hyper-scale-chat-rubric-v3");
  assert.deepEqual(rejudgedRun.rescoreScope, {
    strategy: "saved-responses-full-rescore-v1",
    sourceRunId: original.runId,
    rowCount: 2,
    generationReused: true,
    sourceScoresPreserved: false
  });
  assert.deepEqual(rejudgedRun.judging.rescoreScope, rejudgedRun.rescoreScope);
  assert.deepEqual(rejudgedRun.rows.map((row) => row.score.total), [87.5, 87.5]);
  assert.equal(rejudgedRun.judging.aggregation.method, "unanimity-gates-mean-dimensions-v1");
  assert.equal(rejudgedRun.judging.judges.every((judge) => judge.reused === false), true);
  assert.equal(rejudgedRun.rows[0].scoreBasisHash.length, 64);
  assert.deepEqual(originalRun.rows.map((row) => row.score.total), [75, 75]);
  assert.deepEqual(fs.readFileSync(originalRunFilePath), originalRunBytes);
  const generationEvidence = (rows) => rows.map(({ score, scoreBasisHash, ...evidence }) => evidence);
  assert.deepEqual(generationEvidence(rejudgedRun.rows), generationEvidence(originalRun.rows));
  assert.deepEqual(rejudgedRun.configurations, originalRun.configurations);
  assert.deepEqual(rejudgedRun.conditions, originalRun.conditions);
});

test("benchmark rejudge refuses to reuse responses after the generation contract changes", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-rejudge-drift-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  writeFile(path.join(projectDirectory, "package.json"), "{}\n");
  writeFile(
    path.join(projectDirectory, ".agents", "skills", "test-architecture", "SKILL.md"),
    `---
name: test-architecture
description: Test architecture guidance.
---
Use one authority.`
  );
  const original = await runBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    treatmentId: "skill:test-architecture",
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["sol@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => ({ text: promptText }),
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 50 }])),
      judging: { status: "complete", basisHash: "a".repeat(64), candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>")
  });
  const originalRun = JSON.parse(fs.readFileSync(
    path.join(original.outputDirectory, "run.json"),
    "utf8"
  ));
  const changedDefinition = structuredClone(originalRun.benchmark.definition);
  changedDefinition.cases[0].task += " The revised task requires a different saved answer.";
  writeFile(
    path.join(projectDirectory, "benchmarks", "hyper-scale-chat", "benchmark.json"),
    `${JSON.stringify(changedDefinition, null, 2)}\n`
  );
  let judgeCalls = 0;

  await assert.rejects(
    rejudgeBenchmarkEval({
      benchmarkName: "hyper-scale-chat",
      runId: original.runId,
      currentWorkingDirectory: projectDirectory,
      projectRootDirectory: projectDirectory,
      jsonOutput: true,
      judgeRowsImplementation: async () => {
        judgeCalls += 1;
        throw new Error("must not judge drifted responses");
      }
    }),
    (error) => error?.code === "EVAL_BENCHMARK_REJUDGE_GENERATION_DRIFT"
  );
  assert.equal(judgeCalls, 0);
});

test("benchmark rejudge checkpoints reusable panel batches before the full rescore finishes", async (context) => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-rejudge-checkpoint-"));
  context.after(() => fs.rmSync(projectDirectory, { recursive: true, force: true }));
  writeFile(path.join(projectDirectory, "package.json"), "{}\n");
  writeFile(
    path.join(projectDirectory, ".agents", "skills", "test-architecture", "SKILL.md"),
    `---
name: test-architecture
description: Test architecture guidance.
---
Use one authority.`
  );
  const original = await runBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    treatmentId: "skill:test-architecture",
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    requestedModelArguments: ["sol@max"],
    jsonOutput: true,
    spawnSyncImplementation: () => ({ status: 0 }),
    agentRunnerImplementation: async ({ promptText }) => ({ text: promptText }),
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 50 }])),
      judging: { status: "complete", basisHash: "a".repeat(64), candidateOrder: [] }
    }),
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>")
  });
  const partialJudging = {
    strategy: "matched-pair-panel-median-v1",
    status: "pending",
    judges: [{
      configuration: { id: "codex:gpt-5.6-sol@ultra" },
      status: "pending",
      batches: [{
        batchId: "batch-001",
        status: "complete",
        promptHash: "b".repeat(64),
        basisHash: "c".repeat(64),
        evaluationHash: "d".repeat(64),
        candidateIds: ["candidate-001", "candidate-002"],
        evaluations: []
      }]
    }]
  };

  await assert.rejects(
    rejudgeBenchmarkEval({
      benchmarkName: "hyper-scale-chat",
      runId: original.runId,
      currentWorkingDirectory: projectDirectory,
      projectRootDirectory: projectDirectory,
      jsonOutput: true,
      judgeRowsImplementation: async ({ progressImplementation }) => {
        await progressImplementation({ judging: partialJudging });
        throw Object.assign(new Error("fixture interruption"), { code: "FIXTURE_INTERRUPTION" });
      },
      nowImplementation: () => new Date("2026-09-01T23:00:00.000Z")
    }),
    /fixture interruption/
  );
  const historyDirectory = path.join(
    projectDirectory,
    ".agents",
    "vasir-evals",
    "hyper-scale-chat"
  );
  const checkpointRunId = fs.readdirSync(historyDirectory).find((candidateRunId) =>
    candidateRunId !== original.runId && candidateRunId.includes("__rejudge__")
  );
  assert.ok(checkpointRunId);
  const checkpointRun = JSON.parse(fs.readFileSync(
    path.join(historyDirectory, checkpointRunId, "run.json"),
    "utf8"
  ));
  assert.equal(checkpointRun.runStatus, "incomplete");
  assert.deepEqual(checkpointRun.judging.judges, partialJudging.judges);
  assert.equal(checkpointRun.rescoreScope.strategy, "saved-responses-full-rescore-v1");

  let restoredJudging = null;
  const recovered = await rejudgeBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    runId: checkpointRunId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    jsonOutput: true,
    judgeRowsImplementation: async ({ rows, priorJudging }) => {
      restoredJudging = priorJudging;
      return {
        scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 75 }])),
        judging: { status: "complete", basisHash: "e".repeat(64), candidateOrder: [] }
      };
    },
    reportWriterImplementation: ({ outputFilePath }) => writeFile(outputFilePath, "<!doctype html>"),
    nowImplementation: (() => {
      const dates = [new Date("2026-09-01T23:01:00.000Z"), new Date("2026-09-01T23:01:01.000Z")];
      return () => dates.shift();
    })()
  });
  assert.equal(recovered.runStatus, "complete");
  assert.deepEqual(restoredJudging.judges, partialJudging.judges);
});
