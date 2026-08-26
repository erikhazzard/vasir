import assert from "node:assert/strict";
import test from "node:test";

import { judgeBenchmarkRows } from "../cli/eval/benchmark-judge.js";
import { resolveBenchmarkSource } from "../cli/eval/benchmark-source.js";

function createBenchmarkDefinition(benchmarkName = "hyper-scale-chat") {
  return resolveBenchmarkSource({
    benchmarkName,
    currentWorkingDirectory: process.cwd(),
    projectRootDirectory: process.cwd()
  }).benchmarkDefinition;
}

function createPanelRunner({
  benchmarkDefinition,
  onCall = null,
  overallReason = "Fixture overall reason."
} = {}) {
  const calls = [];
  const runner = async ({ configuration, promptText, outputSchema, timeoutMs }) => {
    calls.push({ configuration, promptText, outputSchema, timeoutMs });
    onCall?.({ configuration, promptText, outputSchema, timeoutMs, calls });
    if (outputSchema.properties.evaluations) {
      const candidateIds = outputSchema.properties.evaluations.items.properties.candidateId.enum;
      return {
        text: JSON.stringify({
          evaluations: candidateIds.map((candidateId, candidateIndex) => ({
            candidateId,
            gates: benchmarkDefinition.scoring.gates.map((gate, gateIndex) => ({
              id: gate.id,
              status: candidateIndex === 0 && gateIndex === 0 ? "fail" : "pass"
            })),
            dimensions: benchmarkDefinition.scoring.dimensions.map((dimension) => ({
              id: dimension.id,
              rating: candidateIndex === 0 ? 4 : 2
            })),
            reason: overallReason
          }))
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
        }))
      }),
      usage: { totalTokens: 50 },
      runtimeReceipt: { freshSession: true }
    };
  };
  return { runner, calls };
}

function createMatchedRows(groupCount, { outputFactory = null, caseId = "ten-million-concurrent-users" } = {}) {
  return Array.from({ length: groupCount }, (_, groupIndex) => ["clean", "skill:test"].map(
    (conditionId, conditionIndex) => ({
      rowKey: `model-${groupIndex}::${caseId}::trial-1::${conditionId}`,
      configurationId: `model-${groupIndex}`,
      caseId,
      trialNumber: 1,
      conditionId,
      rowStatus: "complete",
      outputText: outputFactory
        ? outputFactory({ groupIndex, conditionIndex, conditionId })
        : `Anonymous architecture answer ${groupIndex * 2 + conditionIndex + 1}.`
    })
  )).flat();
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
  assert.match(calls[2].promptText, /First anonymous answer\./);
  assert.match(calls[2].promptText, /Fixture overall reason\./);
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

test("one configured judge needs no synthesis budget or synthesis call", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(1);
  const { runner, calls } = createPanelRunner({ benchmarkDefinition });

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    judgingConfiguration: {
      panel: ["codex:gpt-5.6-sol@ultra"],
      synthesizer: null
    },
    agentRunnerImplementation: runner
  });

  assert.equal(result.judging.status, "complete");
  assert.equal(result.judging.strategy, "single-judge-batched-v2");
  assert.equal(calls.length, 1);
  assert.equal(result.judging.batchPlan.reviewerCount, 0);
  assert.equal(result.judging.batchPlan.batches[0].worstCaseSynthesisPromptBytes, 0);
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

test("matched candidates are judged and synthesized in deterministic bounded batches", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(7);
  const firstRunner = createPanelRunner({ benchmarkDefinition });

  const first = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "bounded-batches",
    agentRunnerImplementation: firstRunner.runner
  });

  const panelCalls = firstRunner.calls.filter((call) => call.outputSchema.properties.evaluations);
  const synthesisCalls = firstRunner.calls.filter((call) => call.outputSchema.properties.selections);
  assert.equal(first.judging.strategy, "panel-synthesis-v2");
  assert.equal(first.judging.batchPlan.batches.length, 3);
  assert.deepEqual(
    first.judging.batchPlan.batches.map((batch) => batch.candidateIds.length),
    [6, 6, 2]
  );
  assert.deepEqual(
    first.judging.batchPlan.batches.map((batch) => batch.groupHashes.length),
    [3, 3, 1]
  );
  assert.equal(panelCalls.length, 6);
  assert.equal(synthesisCalls.length, 3);
  assert.deepEqual(panelCalls.slice(0, 4).map((call) => call.configuration.id), [
    "codex:gpt-5.6-sol@ultra",
    "claude:opus@max",
    "codex:gpt-5.6-sol@ultra",
    "claude:opus@max"
  ]);
  assert.equal(firstRunner.calls.every((call) => call.timeoutMs === 10 * 60 * 1000), true);
  assert.equal(panelCalls.every((call) =>
    call.outputSchema.properties.evaluations.items.properties.candidateId.enum.length <= 6 &&
    Buffer.byteLength(call.promptText, "utf8") <= 64 * 1024
  ), true);
  assert.equal(synthesisCalls.every((call) =>
    call.outputSchema.properties.selections.items.properties.candidateId.enum.length <= 6 &&
    Buffer.byteLength(call.promptText, "utf8") <= 64 * 1024 &&
    call.promptText.includes("Anonymous architecture answer") &&
    call.promptText.includes("Fixture overall reason.")
  ), true);
  assert.equal(panelCalls.every((call) =>
    !call.promptText.includes("model-") &&
    !call.promptText.includes("skill:test") &&
    !call.promptText.includes("conditionId")
  ), true);
  assert.deepEqual(
    panelCalls
      .filter((call) => call.configuration.id === "codex:gpt-5.6-sol@ultra")
      .map((call) => call.promptText),
    panelCalls
      .filter((call) => call.configuration.id === "claude:opus@max")
      .map((call) => call.promptText)
  );
  const panelCandidateIds = panelCalls.flatMap((call) =>
    call.outputSchema.properties.evaluations.items.properties.candidateId.enum
  );
  assert.equal(new Set(panelCandidateIds).size, 14);
  assert.equal(panelCandidateIds.length, 28);
  const batchIdByCandidateId = new Map(first.judging.batchPlan.batches.flatMap((batch) =>
    batch.candidateIds.map((candidateId) => [candidateId, batch.batchId])
  ));
  const candidateIdByRowKey = new Map(first.judging.candidateOrder.map((candidate) => [
    candidate.rowKey,
    candidate.candidateId
  ]));
  for (let groupIndex = 0; groupIndex < 7; groupIndex += 1) {
    const cleanCandidateId = candidateIdByRowKey.get(
      `model-${groupIndex}::ten-million-concurrent-users::trial-1::clean`
    );
    const treatmentCandidateId = candidateIdByRowKey.get(
      `model-${groupIndex}::ten-million-concurrent-users::trial-1::skill:test`
    );
    assert.equal(batchIdByCandidateId.get(cleanCandidateId), batchIdByCandidateId.get(treatmentCandidateId));
  }
  assert.equal(first.judging.judges.every((judge) => judge.batches.length === 3), true);
  assert.equal(first.judging.synthesis.batches.length, 3);
  assert.equal(first.scoresByRowKey.size, 14);
  assert.match(first.judging.judges[0].batches[0].promptText, /ANONYMOUS CANDIDATES/);
  assert.match(first.judging.judges[0].batches[0].outputText, /evaluations/);

  const reversedRunner = createPanelRunner({ benchmarkDefinition });
  const reversed = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows: rows.slice().reverse(),
    runSeed: "ignored-for-determinism",
    agentRunnerImplementation: reversedRunner.runner
  });
  assert.equal(reversed.judging.cohortHash, first.judging.cohortHash);
  assert.deepEqual(reversed.judging.candidateOrder, first.judging.candidateOrder);
  assert.deepEqual(reversed.judging.batchPlan, first.judging.batchPlan);
  assert.deepEqual(
    reversedRunner.calls
      .filter((call) => call.configuration.id === "codex:gpt-5.6-sol@ultra" && call.outputSchema.properties.evaluations)
      .map((call) => call.promptText),
    firstRunner.calls
      .filter((call) => call.configuration.id === "codex:gpt-5.6-sol@ultra" && call.outputSchema.properties.evaluations)
      .map((call) => call.promptText)
  );
});

test("feed synthesis remains under the byte cap with maximum escaped, multibyte, and malformed rationales", async () => {
  const benchmarkDefinition = createBenchmarkDefinition("personalized-home-feed");
  const caseId = benchmarkDefinition.cases[0].id;
  const rows = createMatchedRows(27, {
    caseId,
    outputFactory: ({ groupIndex, conditionIndex }) =>
      `${groupIndex}:${conditionIndex}: ${"a".repeat(5_200)}`
  });
  const maximumOverallReason = '"\\\n\u0000🧠\ud800'.repeat(100);
  const { runner, calls } = createPanelRunner({
    benchmarkDefinition,
    overallReason: maximumOverallReason
  });

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "feed-max-schema-rationales",
    agentRunnerImplementation: runner
  });

  const synthesisCalls = calls.filter((call) => call.outputSchema.properties.selections);
  assert.equal(result.judging.status, "complete");
  assert.equal(result.scoresByRowKey.size, 54);
  assert.equal(result.judging.batchPlan.batches.every((batch) =>
    batch.worstCaseSynthesisPromptBytes <= 64 * 1024
  ), true);
  assert.equal(synthesisCalls.every((call) =>
    Buffer.byteLength(call.promptText, "utf8") <= 64 * 1024
  ), true);
  assert.equal(synthesisCalls.every((call) => !call.promptText.includes("\\ud800")), true);
  assert.equal(synthesisCalls.some((call) => call.promptText.includes("…")), true);
});

test("retry reuses successful panel batches and reruns only the failed batch", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(7);
  const firstRunner = createPanelRunner({
    benchmarkDefinition,
    onCall: ({ configuration, outputSchema, calls }) => {
      const opusPanelCalls = calls.filter((call) =>
        call.configuration.id === "claude:opus@max" && call.outputSchema.properties.evaluations
      ).length;
      if (
        configuration.id === "claude:opus@max" &&
        outputSchema.properties.evaluations &&
        opusPanelCalls === 2
      ) {
        throw new Error("Fixture second Opus batch failure.");
      }
    }
  });

  const first = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "panel-batch-failure",
    agentRunnerImplementation: firstRunner.runner
  });

  assert.equal(first.judging.status, "error");
  assert.equal(first.scoresByRowKey.size, 0);
  assert.equal(first.judging.synthesis.status, "skipped");
  const failedOpus = first.judging.judges.find((judge) => judge.configuration.id === "claude:opus@max");
  assert.equal(failedOpus.batches.filter((batch) => batch.status === "complete").length, 2);
  assert.equal(failedOpus.batches.filter((batch) => batch.status === "error").length, 1);

  const retryRunner = createPanelRunner({ benchmarkDefinition });
  const retry = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "panel-batch-retry",
    priorJudging: first.judging,
    agentRunnerImplementation: retryRunner.runner
  });

  const retryPanelCalls = retryRunner.calls.filter((call) => call.outputSchema.properties.evaluations);
  const retrySynthesisCalls = retryRunner.calls.filter((call) => call.outputSchema.properties.selections);
  assert.equal(retryPanelCalls.length, 1);
  assert.equal(retryPanelCalls[0].configuration.id, "claude:opus@max");
  assert.equal(retrySynthesisCalls.length, 3);
  assert.equal(retry.judging.status, "complete");
  assert.equal(retry.scoresByRowKey.size, 14);
  assert.equal(
    retry.judging.judges.flatMap((judge) => judge.batches).filter((batch) => batch.reused).length,
    5
  );
});

test("retry reuses both panel judges and successful synthesis batches", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(7);
  const firstRunner = createPanelRunner({
    benchmarkDefinition,
    onCall: ({ outputSchema, calls }) => {
      const synthesisCalls = calls.filter((call) => call.outputSchema.properties.selections).length;
      if (outputSchema.properties.selections && synthesisCalls === 2) {
        throw new Error("Fixture second synthesis batch failure.");
      }
    }
  });

  const first = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "synthesis-batch-failure",
    agentRunnerImplementation: firstRunner.runner
  });

  assert.equal(first.judging.status, "error");
  assert.equal(first.scoresByRowKey.size, 0);
  assert.equal(first.judging.synthesis.batches.filter((batch) => batch.status === "complete").length, 2);
  assert.equal(first.judging.synthesis.batches.filter((batch) => batch.status === "error").length, 1);

  const retryRunner = createPanelRunner({ benchmarkDefinition });
  const retry = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "synthesis-batch-retry",
    priorJudging: first.judging,
    agentRunnerImplementation: retryRunner.runner
  });

  assert.equal(retryRunner.calls.filter((call) => call.outputSchema.properties.evaluations).length, 0);
  assert.equal(retryRunner.calls.filter((call) => call.outputSchema.properties.selections).length, 1);
  assert.equal(retry.judging.status, "complete");
  assert.equal(retry.scoresByRowKey.size, 14);
  assert.equal(retry.judging.judges.every((judge) => judge.reused), true);
  assert.equal(retry.judging.synthesis.batches.filter((batch) => batch.reused).length, 2);
});

test("a configurable panel scales by judge count without changing the batch contract", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(7);
  const { runner, calls } = createPanelRunner({ benchmarkDefinition });

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "configurable-batched-panel",
    judgingConfiguration: {
      panel: [
        "codex:gpt-5.6-terra@high",
        "claude:fable@max",
        "codex:gpt-5.6-luna@low"
      ],
      synthesizer: "claude:opus@max"
    },
    agentRunnerImplementation: runner
  });

  assert.equal(result.judging.batchPlan.batches.length, 3);
  assert.equal(calls.filter((call) => call.outputSchema.properties.evaluations).length, 9);
  assert.equal(calls.filter((call) => call.outputSchema.properties.selections).length, 3);
  assert.equal(result.judging.judges.length, 3);
  assert.equal(result.judging.status, "complete");
});

test("judge and synthesis calls share one global concurrency ceiling", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(7);
  const baseRunner = createPanelRunner({ benchmarkDefinition });
  let activeCalls = 0;
  let maximumActiveCalls = 0;
  const runner = async (args) => {
    activeCalls += 1;
    maximumActiveCalls = Math.max(maximumActiveCalls, activeCalls);
    await new Promise((resolve) => setImmediate(resolve));
    try {
      return await baseRunner.runner(args);
    } finally {
      activeCalls -= 1;
    }
  };

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "bounded-concurrency",
    agentRunnerImplementation: runner
  });

  assert.equal(result.judging.status, "complete");
  assert.equal(maximumActiveCalls, 4);
});

test("an oversized matched group fails explicitly without invoking a judge", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(1, {
    outputFactory: ({ conditionIndex }) => `${conditionIndex}: ${"x".repeat(40 * 1024)}`
  });
  const { runner, calls } = createPanelRunner({ benchmarkDefinition });

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    runSeed: "oversized-group",
    agentRunnerImplementation: runner
  });

  assert.equal(calls.length, 0);
  assert.equal(result.scoresByRowKey.size, 0);
  assert.equal(result.judging.status, "error");
  assert.equal(result.judging.error.code, "EVAL_BENCHMARK_JUDGE_BATCH_TOO_LARGE");
  assert.equal(result.judging.error.context.maxCandidates, 6);
  assert.equal(result.judging.error.context.maxPromptBytes, 64 * 1024);
});
