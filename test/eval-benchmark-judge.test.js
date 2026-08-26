import assert from "node:assert/strict";
import test from "node:test";

import { judgeBenchmarkRows } from "../cli/eval/benchmark-judge.js";
import { resolveBenchmarkSource } from "../cli/eval/benchmark-source.js";

function createBenchmarkDefinition() {
  return resolveBenchmarkSource({
    benchmarkName: "hyper-scale-chat",
    currentWorkingDirectory: process.cwd(),
    projectRootDirectory: process.cwd()
  }).benchmarkDefinition;
}

function createPanelRunner({ benchmarkDefinition, onCall = null } = {}) {
  const calls = [];
  const runner = async ({ configuration, promptText, outputSchema }) => {
    calls.push({ configuration, promptText, outputSchema });
    onCall?.({ configuration, promptText, outputSchema, calls });
    if (outputSchema.properties.evaluations) {
      const candidateIds = outputSchema.properties.evaluations.items.properties.candidateId.enum;
      return {
        text: JSON.stringify({
          evaluations: candidateIds.map((candidateId, candidateIndex) => ({
            candidateId,
            gates: benchmarkDefinition.scoring.gates.map((gate, gateIndex) => ({
              id: gate.id,
              status: candidateIndex === 0 && gateIndex === 0 ? "fail" : "pass",
              reason: "Fixture gate reason."
            })),
            dimensions: benchmarkDefinition.scoring.dimensions.map((dimension) => ({
              id: dimension.id,
              rating: candidateIndex === 0 ? 4 : 2,
              reason: "Fixture dimension reason."
            })),
            reason: "Fixture overall reason.",
            strengths: ["Bounded path"],
            risks: ["Unproven skew"]
          })),
          comparativeNote: "Fixture panel comparison."
        }),
        usage: { totalTokens: 100 },
        runtimeReceipt: { freshSession: true }
      };
    }

    const candidateIds = outputSchema.properties.selections.items.properties.candidateId.enum;
    const reviewerIds = outputSchema.properties.selections.items.properties.reviewerId.enum;
    return {
      text: JSON.stringify({
        selections: candidateIds.map((candidateId, index) => ({
          candidateId,
          reviewerId: reviewerIds[index % reviewerIds.length],
          reason: "This review applies the rubric most consistently."
        })),
        comparativeNote: "Fixture synthesis comparison."
      }),
      usage: { totalTokens: 50 },
      runtimeReceipt: { freshSession: true }
    };
  };
  return { runner, calls };
}

test("two fresh blinded judges feed one fresh synthesis authority", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = [
    {
      rowKey: "model::case::trial-1::clean",
      configurationId: "codex:gpt-5.6-sol@max",
      caseId: "ten-million-concurrent-users",
      conditionId: "clean",
      rowStatus: "complete",
      outputText: "First anonymous answer."
    },
    {
      rowKey: "model::case::trial-1::skill:test",
      configurationId: "codex:gpt-5.6-sol@max",
      caseId: "ten-million-concurrent-users",
      conditionId: "skill:test",
      rowStatus: "complete",
      outputText: "Second anonymous answer."
    }
  ];
  const { runner, calls } = createPanelRunner({ benchmarkDefinition });

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "seed",
    agentRunnerImplementation: runner
  });

  const scores = [...result.scoresByRowKey.values()].map((score) => score.total).sort((a, b) => a - b);
  assert.deepEqual(scores, [49, 50]);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((call) => call.configuration.id), [
    "codex:gpt-5.6-sol@ultra",
    "claude:opus@max",
    "codex:gpt-5.6-sol@ultra"
  ]);
  assert.equal(calls[0].promptText, calls[1].promptText);
  assert.ok(!calls[0].promptText.includes("conditionId"));
  assert.ok(!calls[0].promptText.includes("codex:gpt-5.6-sol@max"));
  assert.ok(!calls[2].promptText.includes("claude:opus@max"));
  assert.ok(!calls[2].promptText.includes("gpt-5.6-sol"));
  assert.match(calls[2].promptText, /ANONYMOUS INDEPENDENT REVIEWS/);
  assert.equal(result.judging.status, "complete");
  assert.equal(result.judging.blinded, true);
  assert.equal(result.judging.cohortSize, 2);
  assert.equal(result.judging.cohortHash.length, 64);
  assert.equal(result.judging.judges.length, 2);
  assert.equal(result.judging.synthesis.configuration.id, "codex:gpt-5.6-sol@ultra");
  assert.equal(result.judging.synthesis.selections.length, 2);
  assert.equal(result.judging.ranking.length, 2);
  assert.equal(result.judging.basisHash.length, 64);
  assert.equal(result.judging.usage.totalTokens, 250);
});

test("every anonymous candidate carries its own case task in a multi-case benchmark", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  benchmarkDefinition.cases = [
    { id: "case-a", task: "Design system A." },
    { id: "case-b", task: "Design system B." }
  ];
  const rows = benchmarkDefinition.cases.map((caseDefinition) => ({
    rowKey: `row-${caseDefinition.id}`,
    caseId: caseDefinition.id,
    rowStatus: "complete",
    outputText: `Answer for ${caseDefinition.id}.`
  }));
  const { runner, calls } = createPanelRunner({ benchmarkDefinition });

  await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "multi-case",
    agentRunnerImplementation: runner
  });

  assert.match(calls[0].promptText, /case="case-a">\n<task>Design system A\.<\/task>/);
  assert.match(calls[0].promptText, /case="case-b">\n<task>Design system B\.<\/task>/);
});

test("judge count and models come entirely from configuration", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = [{
    rowKey: "row-a",
    caseId: "ten-million-concurrent-users",
    rowStatus: "complete",
    outputText: "Answer."
  }];
  const judgingConfiguration = {
    panel: [
      "codex:gpt-5.6-terra@high",
      "claude:fable@max",
      "codex:gpt-5.6-luna@low"
    ],
    synthesizer: "claude:opus@max"
  };
  const { runner, calls } = createPanelRunner({ benchmarkDefinition });

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "custom-panel",
    judgingConfiguration,
    agentRunnerImplementation: runner
  });

  assert.equal(result.judging.judges.length, 3);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls.map((call) => call.configuration.id), [
    "codex:gpt-5.6-terra@high",
    "claude:fable@max",
    "codex:gpt-5.6-luna@low",
    "claude:opus@max"
  ]);
});

test("one failed required judge prevents synthesis and leaves no final scores", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = [{
    rowKey: "row-a",
    caseId: "ten-million-concurrent-users",
    rowStatus: "complete",
    outputText: "Answer."
  }];
  const { runner, calls } = createPanelRunner({
    benchmarkDefinition,
    onCall: ({ configuration }) => {
      if (configuration.id === "claude:opus@max") {
        throw new Error("Fixture judge failure.");
      }
    }
  });

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "failed-panel",
    agentRunnerImplementation: runner
  });

  assert.equal(calls.length, 2);
  assert.equal(result.scoresByRowKey.size, 0);
  assert.equal(result.judging.status, "error");
  assert.equal(result.judging.error.code, "EVAL_BENCHMARK_PANEL_INCOMPLETE");
  assert.equal(result.judging.synthesis.status, "skipped");
});

test("retry reuses compatible completed panel seats and runs only the failed judge plus synthesis", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = [{
    rowKey: "row-a",
    caseId: "ten-million-concurrent-users",
    rowStatus: "complete",
    outputText: "Answer."
  }];
  const firstAttemptRunner = createPanelRunner({
    benchmarkDefinition,
    onCall: ({ configuration }) => {
      if (configuration.id === "claude:opus@max") {
        throw new Error("Fixture judge failure.");
      }
    }
  });
  const firstAttempt = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "retry-panel",
    agentRunnerImplementation: firstAttemptRunner.runner
  });
  const retryRunner = createPanelRunner({ benchmarkDefinition });

  const retry = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "retry-panel-again",
    priorJudging: firstAttempt.judging,
    agentRunnerImplementation: retryRunner.runner
  });

  assert.equal(retry.judging.status, "complete");
  assert.deepEqual(retryRunner.calls.map((call) => call.configuration.id), [
    "claude:opus@max",
    "codex:gpt-5.6-sol@ultra"
  ]);
  assert.equal(
    retry.judging.judges.find((judge) => judge.configuration.id === "codex:gpt-5.6-sol@ultra").reused,
    true
  );
  assert.equal(retry.scoresByRowKey.size, 1);
});
