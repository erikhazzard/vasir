import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { reportBenchmarkEval } from "../cli/eval/report-benchmark-eval.js";
import { runBenchmarkEval } from "../cli/eval/run-benchmark-eval.js";
import { rejudgeBenchmarkEval } from "../cli/eval/rejudge-benchmark-eval.js";

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

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
    agentRunnerImplementation: async ({ promptText }) => ({
      text: promptText.includes("Vasir Skill Guidance") ? "Treatment answer" : "Clean answer"
    }),
    judgeRowsImplementation: async ({ rows }) => ({
      scoresByRowKey: new Map(rows.map((row) => [row.rowKey, { total: 40 }])),
      judging: {
        status: "complete",
        judgeConfiguration: { id: "codex:legacy@max" },
        promptText: "legacy judge",
        candidateOrder: []
      }
    }),
    reportWriterImplementation: ({ outputFilePath }) => {
      writeFile(outputFilePath, "<!doctype html>");
    }
  });
  let capturedPlan = null;
  const rejudged = await rejudgeBenchmarkEval({
    benchmarkName: "hyper-scale-chat",
    runId: original.runId,
    currentWorkingDirectory: projectDirectory,
    projectRootDirectory: projectDirectory,
    jsonOutput: true,
    judgeRowsImplementation: async ({ rows, judgingConfiguration }) => {
      capturedPlan = judgingConfiguration;
      return {
        scoresByRowKey: new Map(rows.map((row) => [
          row.rowKey,
          { total: row.conditionId === "clean" ? 55 : 85 }
        ])),
        judging: {
          status: "complete",
          basisHash: "a".repeat(64),
          cohortHash: "b".repeat(64),
          promptHash: "c".repeat(64),
          promptText: "synthesis",
          candidateOrder: rows.map((row, index) => ({
            candidateId: `candidate-${index + 1}`,
            rowKey: row.rowKey
          })),
          judges: [],
          synthesis: { status: "complete" },
          usage: null,
          costUsd: null
        }
      };
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
    "codex:gpt-5.6-sol@ultra",
    "claude:opus@max"
  ]);
  assert.equal(capturedPlan.synthesizer.id, "codex:gpt-5.6-sol@ultra");
  const rejudgedRun = JSON.parse(fs.readFileSync(path.join(rejudged.outputDirectory, "run.json"), "utf8"));
  assert.equal(rejudgedRun.rescoredFromRunId, original.runId);
  assert.equal(rejudgedRun.generation.sourceRunId, original.runId);
  assert.deepEqual(rejudgedRun.rows.map((row) => row.score.total), [55, 85]);
  assert.equal(rejudgedRun.rows[0].scoreBasisHash.length, 64);
  const originalRun = JSON.parse(fs.readFileSync(path.join(original.outputDirectory, "run.json"), "utf8"));
  assert.deepEqual(originalRun.rows.map((row) => row.score.total), [40, 40]);
});
