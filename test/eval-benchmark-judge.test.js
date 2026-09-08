import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  DEFAULT_BENCHMARK_JUDGING,
  judgeBenchmarkRows
} from "../cli/eval/benchmark-judge.js";
import { resolveBenchmarkSource } from "../cli/eval/benchmark-source.js";

function createBenchmarkDefinition(benchmarkName = "hyper-scale-chat") {
  const benchmarkDefinition = resolveBenchmarkSource({
    benchmarkName,
    currentWorkingDirectory: process.cwd(),
    projectRootDirectory: process.cwd()
  }).benchmarkDefinition;
  return {
    ...benchmarkDefinition,
    judging: {
      panel: ["codex:gpt-5.6-sol@ultra", "claude:opus@max"],
      synthesizer: "codex:gpt-5.6-sol@ultra"
    }
  };
}

function createStablePanelBenchmarkDefinition(benchmarkName = "hyper-scale-chat") {
  const benchmarkDefinition = createBenchmarkDefinition(benchmarkName);
  return {
    ...benchmarkDefinition,
    judging: {
      panel: [
        "codex:gpt-5.6-sol@ultra",
        "codex:gpt-5.6-terra@ultra",
        "claude:opus@max"
      ],
      synthesizer: null
    }
  };
}

function createConsensusPanelBenchmarkDefinition() {
  return {
    ...createBenchmarkDefinition(),
    judging: DEFAULT_BENCHMARK_JUDGING
  };
}

function createFixtureRuntimeReceipt({ configuration }) {
  if (configuration.provider !== "claude") {
    return { cli: "codex", freshSession: true };
  }
  const targetCanonicalModel = {
    fable: "claude-fable-5",
    "claude-fable-5-1": "claude-fable-5-1",
    opus: "claude-opus-5"
  }[configuration.model];
  return {
    cli: "claude",
    canonicalModels: ["claude-haiku-4-5", targetCanonicalModel],
    targetCanonicalModel,
    targetCanonicalModelOutputTokens: 8,
    freshSession: true
  };
}

function createPanelRunner({
  benchmarkDefinition,
  onCall = null,
  overallReason = "Fixture overall reason.",
  synthesisReason = "This review applies the rubric most consistently.",
  dimensionRating = null,
  failFirstGate = true,
  gateStatus = null,
  runtimeReceipt = createFixtureRuntimeReceipt
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
              status: typeof gateStatus === "function"
                ? gateStatus({ configuration, candidateId, candidateIndex, gate, gateIndex })
                : failFirstGate && candidateIndex === 0 && gateIndex === 0 ? "fail" : "pass"
            })),
            dimensions: benchmarkDefinition.scoring.dimensions.map((dimension) => ({
              id: dimension.id,
              rating: typeof dimensionRating === "function"
                ? dimensionRating({ configuration, candidateId, candidateIndex, dimension })
                : dimensionRating ?? (candidateIndex === 0 ? 4 : 2)
            })),
            reason: typeof overallReason === "function"
              ? overallReason({ configuration, candidateId, candidateIndex })
              : overallReason
          }))
        }),
        usage: { totalTokens: 100 },
        runtimeReceipt: typeof runtimeReceipt === "function"
          ? runtimeReceipt({ configuration })
          : runtimeReceipt
      };
    }

    const candidateIds = outputSchema.properties.selections.items.properties.candidateId.enum;
    const reviewerIds = outputSchema.properties.selections.items.properties.reviewerId.enum;
    return {
      text: JSON.stringify({
        selections: candidateIds.map((candidateId, index) => ({
          candidateId,
          reviewerId: reviewerIds[index % reviewerIds.length],
          reason: typeof synthesisReason === "function"
            ? synthesisReason({ configuration, candidateId, candidateIndex: index })
            : synthesisReason
        }))
      }),
      usage: { totalTokens: 50 },
      runtimeReceipt: typeof runtimeReceipt === "function"
        ? runtimeReceipt({ configuration })
        : runtimeReceipt
    };
  };
  return { runner, calls };
}

function stableDigest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
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

test("stable Engineering v1 scoring uses one pair, three judges, majority gates, and median ratings", async () => {
  const benchmarkDefinition = createStablePanelBenchmarkDefinition();
  const rows = createMatchedRows(1);
  const ratingsByJudge = new Map([
    ["codex:gpt-5.6-sol@ultra", 0],
    ["claude:opus@max", 4],
    ["codex:gpt-5.6-terra@ultra", 2]
  ]);
  const { runner, calls } = createPanelRunner({
    benchmarkDefinition,
    dimensionRating: ({ configuration }) => ratingsByJudge.get(configuration.id),
    gateStatus: ({ configuration, candidateIndex, gateIndex }) =>
      candidateIndex === 0 &&
      gateIndex === 0 &&
      configuration.id !== "codex:gpt-5.6-terra@ultra"
        ? "fail"
        : "pass"
  });

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    agentRunnerImplementation: runner
  });

  assert.equal(result.judging.status, "complete");
  assert.equal(result.judging.strategy, "matched-pair-panel-median-v1");
  assert.deepEqual(result.judging.aggregation, {
    method: "majority-gates-median-dimensions-v1",
    judgeCount: 3
  });
  assert.equal(result.judging.synthesis, null);
  assert.equal(result.judging.judges.length, 3);
  assert.equal(result.judging.batchPlan.version, "matched-pairs-v2");
  assert.equal(result.judging.batchPlan.batches.length, 1);
  assert.equal(result.judging.batchPlan.batches[0].candidateIds.length, 2);
  assert.equal(calls.length, 3);
  assert.equal(calls.every((call) => call.outputSchema.properties.evaluations), true);
  assert.equal(calls.every((call) => call.promptText.includes("Do not call tools")), true);

  const finalScores = [...result.scoresByRowKey.values()];
  assert.equal(finalScores.length, 2);
  assert.equal(finalScores.every((score) =>
    score.dimensions.every((dimension) => dimension.rating === 2)
  ), true);
  assert.deepEqual(
    finalScores.map((score) => score.total).sort((left, right) => left - right),
    [benchmarkDefinition.scoring.gates[0].failureCap, 50]
  );
  const majorityFailed = finalScores.find((score) => score.gates[0].status === "fail");
  assert.ok(majorityFailed);
  assert.deepEqual(Object.keys(majorityFailed.aggregation), [
    "method",
    "judgeCount",
    "evaluations",
    "minScore",
    "maxScore",
    "spread"
  ]);
  assert.equal(majorityFailed.aggregation.judgeCount, 3);
  assert.deepEqual(
    majorityFailed.aggregation.evaluations.map((evaluation) => evaluation.reviewerId),
    majorityFailed.aggregation.evaluations
      .map((evaluation) => evaluation.reviewerId)
      .sort()
  );
  assert.equal(majorityFailed.aggregation.evaluations.every((evaluation) =>
    /^[a-f0-9]{64}$/u.test(evaluation.evaluationHash)
  ), true);
  assert.equal(majorityFailed.aggregation.minScore, 0);
  assert.equal(majorityFailed.aggregation.maxScore, 50);
  assert.equal(majorityFailed.aggregation.spread, 50);
  assert.equal(result.judging.judges.every((judge) =>
    judge.evaluations.every((evaluation) => evaluation.reason === "Fixture overall reason.")
  ), true);
});

test("Engineering v2 averages two integer reviews and caps any gate disagreement", async (t) => {
  const scenarios = [
    { name: "both pass", failedBy: [], expectedCap: 100 },
    { name: "Astra fails", failedBy: ["codex"], expectedCap: 49 },
    { name: "Fable fails", failedBy: ["claude"], expectedCap: 59 },
    { name: "both fail different gates", failedBy: ["codex", "claude"], expectedCap: 49 }
  ];
  for (const { name, failedBy, expectedCap } of scenarios) {
    await t.test(name, async () => {
      const benchmarkDefinition = createConsensusPanelBenchmarkDefinition();
      const { runner, calls } = createPanelRunner({
        benchmarkDefinition,
        dimensionRating: ({ configuration }) => configuration.provider === "codex" ? 4 : 3,
        gateStatus: ({ configuration, gateIndex }) =>
          failedBy.includes(configuration.provider) &&
          gateIndex === (configuration.provider === "codex" ? 0 : 3)
            ? "fail"
            : "pass"
      });
      const result = await judgeBenchmarkRows({
        benchmarkDefinition,
        rows: createMatchedRows(1),
        agentRunnerImplementation: runner
      });

      assert.equal(result.judging.status, "complete");
      assert.equal(result.judging.strategy, "matched-pair-panel-consensus-v1");
      assert.deepEqual(result.judging.aggregation, {
        method: "unanimity-gates-mean-dimensions-v1",
        judgeCount: 2
      });
      assert.deepEqual(calls.map((call) => call.configuration.id), [
        "codex:gpt-6-astra@xhigh",
        "claude:claude-fable-5-1@max"
      ]);
      assert.equal(calls.every((call) => call.outputSchema.properties.evaluations), true);
      assert.equal(calls.every((call) =>
        call.promptText.includes("at most 600 characters; aim for 450 characters or fewer")
      ), true);
      assert.equal(result.judging.batchPlan.batches.length, 1);
      assert.equal(result.scoresByRowKey.size, 2);
      for (const score of result.scoresByRowKey.values()) {
        assert.equal(score.dimensions.every((dimension) => dimension.rating === 3.5), true);
        assert.equal(score.uncapped, 87.5);
        assert.equal(score.gateCap, expectedCap);
        assert.equal(score.total, Math.min(87.5, expectedCap));
        assert.equal(score.aggregation.judgeCount, 2);
        assert.equal(score.aggregation.evaluations.length, 2);
      }
    });
  }
});

test("two-judge scores and recovered evidence are invariant to panel and candidate order", async () => {
  const benchmarkDefinition = createConsensusPanelBenchmarkDefinition();
  const rows = createMatchedRows(2);
  const firstRunner = createPanelRunner({
    benchmarkDefinition,
    dimensionRating: ({ configuration }) => configuration.provider === "codex" ? 4 : 3
  });
  const first = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    agentRunnerImplementation: firstRunner.runner
  });
  const retryRunner = createPanelRunner({ benchmarkDefinition });
  const retry = await judgeBenchmarkRows({
    benchmarkDefinition,
    judgingConfiguration: {
      panel: [...benchmarkDefinition.judging.panel].reverse(),
      synthesizer: null
    },
    rows: [...rows].reverse(),
    priorJudging: first.judging,
    agentRunnerImplementation: retryRunner.runner
  });

  assert.equal(first.judging.status, "complete");
  assert.equal(retry.judging.status, "complete");
  assert.equal(retryRunner.calls.length, 0);
  assert.equal(retry.judging.judges.every((judge) => judge.reused), true);
  assert.equal(retry.judging.basisHash, first.judging.basisHash);
  assert.deepEqual(retry.scoresByRowKey, first.scoresByRowKey);
});

test("new pair prompts invalidate old-panel evidence and effort changes rerun only the changed judge", async () => {
  const benchmarkDefinition = createConsensusPanelBenchmarkDefinition();
  const rows = createMatchedRows(1);
  const priorRunner = createPanelRunner({ benchmarkDefinition });
  const prior = await judgeBenchmarkRows({
    benchmarkDefinition,
    judgingConfiguration: {
      panel: [...benchmarkDefinition.judging.panel, "codex:gpt-5.6-terra@ultra"],
      synthesizer: null
    },
    rows,
    agentRunnerImplementation: priorRunner.runner
  });
  const currentRunner = createPanelRunner({ benchmarkDefinition });
  const current = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    priorJudging: prior.judging,
    agentRunnerImplementation: currentRunner.runner
  });

  assert.equal(prior.judging.status, "complete");
  assert.equal(prior.judging.aggregation.method, "majority-gates-median-dimensions-v1");
  assert.equal(current.judging.status, "complete");
  assert.equal(currentRunner.calls.length, 2);
  assert.notEqual(current.judging.basisHash, prior.judging.basisHash);
  assert.notEqual(current.judging.panelPromptHash, prior.judging.panelPromptHash);

  const nextRunner = createPanelRunner({ benchmarkDefinition });
  const next = await judgeBenchmarkRows({
    benchmarkDefinition,
    judgingConfiguration: {
      panel: ["codex:gpt-6-astra@max", "claude:claude-fable-5-1@max"],
      synthesizer: null
    },
    rows,
    priorJudging: current.judging,
    agentRunnerImplementation: nextRunner.runner
  });
  assert.equal(next.judging.status, "complete");
  assert.deepEqual(nextRunner.calls.map((call) => call.configuration.id), ["codex:gpt-6-astra@max"]);
  assert.equal(next.judging.judges.find((judge) => judge.configuration.provider === "claude").reused, true);
  assert.notEqual(next.judging.basisHash, current.judging.basisHash);
});

test("a missing pair judge or fractional individual rating cannot produce final scores", async (t) => {
  for (const failure of ["unavailable", "fractional rating"]) {
    await t.test(failure, async () => {
      const benchmarkDefinition = createConsensusPanelBenchmarkDefinition();
      const { runner } = createPanelRunner({
        benchmarkDefinition,
        onCall: ({ configuration }) => {
          if (failure === "unavailable" && configuration.provider === "claude") {
            throw new Error("Judge unavailable.");
          }
        },
        dimensionRating: ({ configuration }) =>
          failure === "fractional rating" && configuration.provider === "claude" ? 3.5 : 4
      });
      const result = await judgeBenchmarkRows({
        benchmarkDefinition,
        rows: createMatchedRows(1),
        agentRunnerImplementation: runner
      });

      assert.equal(result.judging.status, "error");
      assert.equal(result.judging.error.code, "EVAL_BENCHMARK_PANEL_INCOMPLETE");
      assert.deepEqual(result.judging.error.context.failedJudgeIds, ["claude:claude-fable-5-1@max"]);
      assert.equal(result.scoresByRowKey.size, 0);
      assert.equal(result.judging.judges.find((judge) => judge.configuration.provider === "codex").status, "complete");
    });
  }
});

test("adding a model leaves incumbent pair prompts, candidate ids, and scores unchanged", async () => {
  const benchmarkDefinition = createStablePanelBenchmarkDefinition();
  const originalRows = createMatchedRows(2);
  const firstRunner = createPanelRunner({ benchmarkDefinition, failFirstGate: false });
  const first = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows: originalRows,
    agentRunnerImplementation: firstRunner.runner
  });
  const extendedRows = [...originalRows, ...createMatchedRows(1).map((row) => ({
    ...row,
    rowKey: row.rowKey.replace("model-0", "model-new"),
    configurationId: "model-new",
    outputText: `${row.outputText} New model.`
  }))];
  const secondRunner = createPanelRunner({ benchmarkDefinition, failFirstGate: false });
  const second = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows: extendedRows,
    priorJudging: first.judging,
    agentRunnerImplementation: secondRunner.runner
  });

  assert.equal(first.judging.status, "complete");
  assert.equal(second.judging.status, "complete");
  assert.equal(first.judging.batchPlan.batches.length, 2);
  assert.equal(second.judging.batchPlan.batches.length, 3);
  assert.equal(secondRunner.calls.length, 3);
  assert.equal(
    second.judging.judges.flatMap((judge) => judge.batches).filter((batch) => batch.reused).length,
    6
  );

  const originalCandidateIds = new Map(first.judging.candidateOrder.map((candidate) => [
    candidate.rowKey,
    candidate.candidateId
  ]));
  const extendedCandidateIds = new Map(second.judging.candidateOrder.map((candidate) => [
    candidate.rowKey,
    candidate.candidateId
  ]));
  for (const row of originalRows) {
    assert.equal(extendedCandidateIds.get(row.rowKey), originalCandidateIds.get(row.rowKey));
    assert.deepEqual(second.scoresByRowKey.get(row.rowKey), first.scoresByRowKey.get(row.rowKey));
  }
  const originalPromptHashes = new Set(first.judging.batchPlan.batches.map((batch) => batch.promptHash));
  assert.equal(
    second.judging.batchPlan.batches.filter((batch) => originalPromptHashes.has(batch.promptHash)).length,
    2
  );
});

test("stable panel checkpoints can resume at individual judge-batch granularity", async () => {
  const benchmarkDefinition = createStablePanelBenchmarkDefinition();
  const rows = createMatchedRows(1);
  const firstRunner = createPanelRunner({ benchmarkDefinition });
  const checkpoints = [];
  const first = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    judgingCheckpointImplementation: async (checkpoint) => {
      checkpoints.push(structuredClone(checkpoint));
    },
    agentRunnerImplementation: firstRunner.runner
  });

  assert.equal(first.judging.status, "complete");
  assert.equal(checkpoints.length, 3);
  assert.deepEqual(checkpoints.map((checkpoint) => checkpoint.completedBatchCount), [1, 2, 3]);
  assert.equal(checkpoints[0].totalBatchCount, 3);
  assert.equal(checkpoints[0].judging.judges.flatMap((judge) => judge.batches).length, 1);

  const retryRunner = createPanelRunner({ benchmarkDefinition });
  const retry = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    priorJudging: checkpoints[0].judging,
    agentRunnerImplementation: retryRunner.runner
  });
  assert.equal(retry.judging.status, "complete");
  assert.equal(retryRunner.calls.length, 2);
  assert.equal(
    retry.judging.judges.flatMap((judge) => judge.batches).filter((batch) => batch.reused).length,
    1
  );
});

test("resuming an interrupted provider pass never drops compatible paid batches from checkpoints", async () => {
  const benchmarkDefinition = createConsensusPanelBenchmarkDefinition();
  const rows = createMatchedRows(12);
  const firstRunner = createPanelRunner({ benchmarkDefinition });
  const first = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    agentRunnerImplementation: (args) => {
      if (args.configuration.provider === "claude") {
        throw Object.assign(new Error("Provider intentionally deferred."), { code: "EVAL_BENCHMARK_JUDGE_DEFERRED" });
      }
      return firstRunner.runner(args);
    }
  });
  assert.equal(first.judging.status, "error");
  assert.equal(firstRunner.calls.length, 12);
  const paidBatches = first.judging.judges.find((judge) => judge.configuration.provider === "codex").batches;
  assert.equal(paidBatches.length, 12);
  const immutableEvidence = (batch) => Object.fromEntries([
    "promptHash", "basisHash", "evaluationHash", "evaluations", "runtimeReceipt", "usage", "costUsd"
  ].map((key) => [key, batch[key]]));
  const expectedEvidence = paidBatches.map(immutableEvidence);
  let interruptedCheckpoint;
  const resumeRunner = createPanelRunner({ benchmarkDefinition });
  await assert.rejects(() => judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    priorJudging: first.judging,
    agentRunnerImplementation: resumeRunner.runner,
    judgingCheckpointImplementation: (checkpoint) => {
      interruptedCheckpoint = structuredClone(checkpoint);
      const retained = checkpoint.judging.judges.find((judge) => judge.configuration.provider === "codex").batches;
      assert.equal(retained.length, 12, "even the first resumed checkpoint must retain every compatible paid batch");
      assert.deepEqual(retained.map(immutableEvidence), expectedEvidence);
      assert.equal(checkpoint.judging.judges.flatMap((judge) => judge.batches).length, checkpoint.completedBatchCount);
      if (checkpoint.completedBatch.configuration.provider === "claude") throw new Error("Simulated interruption after checkpoint persistence.");
    }
  }), /Simulated interruption/);
  assert.ok(resumeRunner.calls.every((call) => call.configuration.provider === "claude"));
  const retainedClaude = interruptedCheckpoint.judging.judges.find((judge) => judge.configuration.provider === "claude").batches.filter((batch) => batch.status === "complete");
  assert.ok(retainedClaude.length > 0 && retainedClaude.length < 12, "the interruption must leave a genuinely partial second provider pass");
  const retainedPrompts = new Set(retainedClaude.map((batch) => batch.promptHash));
  const finalRunner = createPanelRunner({ benchmarkDefinition });
  const finished = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    priorJudging: interruptedCheckpoint.judging,
    agentRunnerImplementation: finalRunner.runner
  });
  assert.equal(finished.judging.status, "complete");
  assert.equal(finalRunner.calls.length, 12 - retainedClaude.length);
  assert.ok(finalRunner.calls.every((call) => call.configuration.provider === "claude" && !retainedPrompts.has(stableDigest(call.promptText))));
  assert.deepEqual(finished.judging.judges.find((judge) => judge.configuration.provider === "codex").batches.map(immutableEvidence), expectedEvidence);
});

test("legacy rubric prompts retain their declared 0/2/4 anchors and missing midpoint fallback", async () => {
  const benchmarkDefinition = createConsensusPanelBenchmarkDefinition();
  delete benchmarkDefinition.scoring.dimensions[0].anchors["2"];
  const { runner, calls } = createPanelRunner({ benchmarkDefinition });
  await judgeBenchmarkRows({ benchmarkDefinition, rows: createMatchedRows(1), agentRunnerImplementation: runner });
  for (const { promptText } of calls) {
    assert.match(promptText, /Dimensions \(rate each 0–4\)/);
    for (const dimension of benchmarkDefinition.scoring.dimensions) {
      const expectedBlock = `- ${dimension.id} — ${dimension.weight} points: ${dimension.criterion}
  0: ${dimension.anchors["0"]}
  2: ${dimension.anchors["2"] ?? "Materially incomplete."}
  4: ${dimension.anchors["4"]}`;
      assert.ok(promptText.includes(expectedBlock));
    }
  }
});

test("stable panel recovery reruns a Claude batch whose receipt contradicts its target model", async () => {
  const benchmarkDefinition = createStablePanelBenchmarkDefinition();
  const rows = createMatchedRows(1);
  const firstRunner = createPanelRunner({
    benchmarkDefinition,
    runtimeReceipt: ({ configuration }) => configuration.id === "claude:opus@max"
      ? {
          cli: "claude",
          canonicalModels: ["claude-haiku-4-5", "claude-opus-5"],
          canonicalModelPolicy: null,
          allowedCanonicalModels: null,
          targetCanonicalModelOutputTokens: null,
          freshSession: true
        }
      : createFixtureRuntimeReceipt({ configuration })
  });
  const first = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    agentRunnerImplementation: firstRunner.runner
  });
  const currentReceiptRetry = createPanelRunner({ benchmarkDefinition });
  const currentReceiptResult = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    priorJudging: first.judging,
    agentRunnerImplementation: currentReceiptRetry.runner
  });

  assert.equal(currentReceiptResult.judging.status, "complete");
  assert.equal(currentReceiptRetry.calls.length, 0);

  const contradictoryPriorJudging = structuredClone(first.judging);
  const opusBatch = contradictoryPriorJudging.judges
    .find((judge) => judge.configuration.id === "claude:opus@max")
    .batches[0];
  opusBatch.runtimeReceipt = {
    ...opusBatch.runtimeReceipt,
    canonicalModels: ["claude-haiku-4-5", "claude-fable-5-1"],
    targetCanonicalModel: "claude-fable-5-1"
  };
  const contradictoryReceiptRetry = createPanelRunner({ benchmarkDefinition });
  const contradictoryReceiptResult = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    priorJudging: contradictoryPriorJudging,
    agentRunnerImplementation: contradictoryReceiptRetry.runner
  });

  assert.equal(contradictoryReceiptResult.judging.status, "complete");
  assert.equal(contradictoryReceiptRetry.calls.length, 1);
  assert.equal(contradictoryReceiptRetry.calls[0].configuration.id, "claude:opus@max");
  assert.equal(
    contradictoryReceiptResult.judging.judges
      .find((judge) => judge.configuration.id === "claude:opus@max")
      .batches[0].reused,
    false
  );
});

test("legacy synthesis recovery reruns a Claude batch whose receipt contradicts its target model", async () => {
  const source = createBenchmarkDefinition();
  const benchmarkDefinition = {
    ...source,
    judging: {
      panel: ["codex:gpt-5.6-sol@ultra", "claude:fable@max"],
      synthesizer: "claude:opus@max"
    }
  };
  const rows = createMatchedRows(1);
  const firstRunner = createPanelRunner({ benchmarkDefinition });
  const first = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    agentRunnerImplementation: firstRunner.runner
  });
  const contradictoryPriorJudging = structuredClone(first.judging);
  contradictoryPriorJudging.synthesis.batches[0].runtimeReceipt = {
    cli: "claude",
    canonicalModels: ["claude-haiku-4-5", "claude-fable-5-1"],
    targetCanonicalModel: "claude-fable-5-1",
    targetCanonicalModelOutputTokens: 8,
    freshSession: true
  };
  const retryRunner = createPanelRunner({ benchmarkDefinition });
  const retry = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    priorJudging: contradictoryPriorJudging,
    agentRunnerImplementation: retryRunner.runner
  });

  assert.equal(retry.judging.status, "complete");
  assert.equal(retryRunner.calls.length, 1);
  assert.equal(retryRunner.calls[0].configuration.id, "claude:opus@max");
  assert.ok(retryRunner.calls[0].outputSchema.properties.selections);
  assert.equal(retry.judging.synthesis.batches[0].reused, false);
});

test("stable panel fails closed if a configured judge uses tools", async () => {
  const benchmarkDefinition = createStablePanelBenchmarkDefinition();
  const rows = createMatchedRows(1);
  const { runner } = createPanelRunner({
    benchmarkDefinition,
    runtimeReceipt: ({ configuration }) => configuration.id === "codex:gpt-5.6-sol@ultra"
      ? { cli: "codex", nonMessageItemCount: 1, freshSession: true }
      : { cli: "claude", allowedTools: [], freshSession: true }
  });
  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    agentRunnerImplementation: runner
  });

  assert.equal(result.judging.status, "error");
  assert.equal(result.judging.error.code, "EVAL_BENCHMARK_PANEL_INCOMPLETE");
  assert.equal(result.scoresByRowKey.size, 0);
  const failedBatch = result.judging.judges
    .find((judge) => judge.configuration.id === "codex:gpt-5.6-sol@ultra")
    .batches[0];
  assert.equal(failedBatch.error.code, "EVAL_BENCHMARK_JUDGE_TOOL_USE");
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

test("empty, status, and default judge reasons are not substantive evaluations", async (t) => {
  const rejectedReasons = [
    "",
    "   ",
    "...",
    "0",
    "Evaluation in progress.",
    "Evaluation is currently in progress.",
    "Pending.",
    "Default reason.",
    "No reason provided.",
    "TBD",
    "N/A",
    "Placeholder text.",
    "Lorem ipsum."
  ];

  for (const overallReason of rejectedReasons) {
    await t.test(JSON.stringify(overallReason), async () => {
      const benchmarkDefinition = createBenchmarkDefinition();
      const rows = createMatchedRows(1);
      const { runner, calls } = createPanelRunner({ benchmarkDefinition, overallReason });

      const result = await judgeBenchmarkRows({
        benchmarkDefinition,
        rows,
        judgingConfiguration: {
          panel: ["codex:gpt-5.6-sol@ultra"],
          synthesizer: null
        },
        agentRunnerImplementation: runner
      });

      assert.equal(calls.length, 1);
      assert.equal(result.judging.status, "error");
      assert.equal(result.scoresByRowKey.size, 0);
      assert.equal(
        result.judging.judges[0].batches[0].error.code,
        "EVAL_BENCHMARK_JUDGE_NON_SUBSTANTIVE_REASON"
      );
    });
  }
});

test("one non-substantive panel seat blocks synthesis and the final score", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(1);
  const { runner, calls } = createPanelRunner({
    benchmarkDefinition,
    overallReason: ({ configuration }) => configuration.id === "claude:opus@max"
      ? "Evaluation in progress."
      : "The answer names concrete overload, durability, and recovery mechanisms required by the rubric."
  });

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    agentRunnerImplementation: runner
  });

  assert.equal(calls.length, 2);
  assert.equal(result.judging.status, "error");
  assert.equal(result.judging.error.code, "EVAL_BENCHMARK_PANEL_INCOMPLETE");
  assert.equal(result.judging.judges.filter((judge) => judge.status === "complete").length, 1);
  assert.equal(result.judging.synthesis.status, "skipped");
  assert.equal(result.scoresByRowKey.size, 0);
  const failedBatch = result.judging.judges
    .find((judge) => judge.configuration.id === "claude:opus@max")
    .batches[0];
  assert.equal(failedBatch.error.code, "EVAL_BENCHMARK_JUDGE_NON_SUBSTANTIVE_REASON");
});

test("non-substantive synthesis reasons cannot finalize a substantive 2/2 panel", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(1);
  const { runner, calls } = createPanelRunner({
    benchmarkDefinition,
    synthesisReason: "Default reason."
  });

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    agentRunnerImplementation: runner
  });

  assert.equal(calls.length, 3);
  assert.equal(result.judging.judges.every((judge) => judge.status === "complete"), true);
  assert.equal(result.judging.status, "error");
  assert.equal(result.judging.error.code, "EVAL_BENCHMARK_SYNTHESIS_FAILED");
  assert.equal(result.judging.synthesis.status, "error");
  assert.equal(
    result.judging.synthesis.batches[0].error.code,
    "EVAL_BENCHMARK_SYNTHESIS_NON_SUBSTANTIVE_REASON"
  );
  assert.equal(result.scoresByRowKey.size, 0);
});

test("rubric-grounded zero ratings remain valid evidence", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(1);
  const { runner } = createPanelRunner({
    benchmarkDefinition,
    dimensionRating: 0,
    failFirstGate: false,
    overallReason: "The answer omits explicit overload, durability, recovery, and observability mechanisms required by the rubric."
  });

  const result = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    agentRunnerImplementation: runner
  });

  assert.equal(result.judging.status, "complete");
  assert.equal(result.scoresByRowKey.size, 2);
  assert.deepEqual([...result.scoresByRowKey.values()].map((score) => score.total), [0, 0]);
  assert.equal(result.judging.judges.every((judge) =>
    judge.evaluations.every((evaluation) =>
      evaluation.dimensions.every((dimension) => dimension.rating === 0)
    )
  ), true);
});

test("retry regenerates a legacy placeholder batch while preserving valid recovered evidence", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(1);
  const firstRunner = createPanelRunner({ benchmarkDefinition });
  const first = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    agentRunnerImplementation: firstRunner.runner
  });
  const priorJudging = structuredClone(first.judging);
  const invalidJudge = priorJudging.judges[0];
  const invalidBatch = invalidJudge.batches[0];
  invalidBatch.evaluations[0].reason = "Evaluation in progress.";
  invalidBatch.evaluationHash = stableDigest(JSON.stringify(invalidBatch.evaluations));
  const retryRunner = createPanelRunner({ benchmarkDefinition });

  const retry = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    priorJudging,
    agentRunnerImplementation: retryRunner.runner
  });

  assert.equal(retry.judging.status, "complete");
  assert.deepEqual(retryRunner.calls.map((call) => call.configuration.id), [invalidJudge.configuration.id]);
  assert.equal(
    retry.judging.judges.find((judge) => judge.configuration.id === invalidJudge.configuration.id).reused,
    false
  );
  assert.equal(
    retry.judging.judges.find((judge) => judge.configuration.id !== invalidJudge.configuration.id).reused,
    true
  );
  assert.equal(retry.judging.synthesis.reused, true);
  assert.equal(retry.scoresByRowKey.size, 2);
});

test("retry regenerates a legacy placeholder synthesis while preserving both valid panel seats", async () => {
  const benchmarkDefinition = createBenchmarkDefinition();
  const rows = createMatchedRows(1);
  const firstRunner = createPanelRunner({ benchmarkDefinition });
  const first = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    agentRunnerImplementation: firstRunner.runner
  });
  const priorJudging = structuredClone(first.judging);
  const invalidBatch = priorJudging.synthesis.batches[0];
  invalidBatch.selections[0].reason = "Evaluation in progress.";
  invalidBatch.selectionHash = stableDigest(JSON.stringify(invalidBatch.selections));
  const retryRunner = createPanelRunner({ benchmarkDefinition });

  const retry = await judgeBenchmarkRows({
    benchmarkDefinition,
    rows,
    priorJudging,
    agentRunnerImplementation: retryRunner.runner
  });

  assert.equal(retry.judging.status, "complete");
  assert.deepEqual(retryRunner.calls.map((call) => call.configuration.id), [
    priorJudging.synthesis.configuration.id
  ]);
  assert.equal(retry.judging.judges.every((judge) => judge.reused), true);
  assert.equal(retry.judging.synthesis.reused, false);
  assert.equal(retry.scoresByRowKey.size, 2);
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
  assert.equal(firstRunner.calls.every((call) => call.timeoutMs === 20 * 60 * 1000), true);
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
  const maximumOverallReason = `Rubric evidence identifies concrete constraints. ${'"\\\n\u0000🧠\ud800'.repeat(100)}`;
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

test("independent panel execution concurrency is bounded and leaves prompts, score bases, and results unchanged", async () => {
  const benchmarkDefinition = createConsensusPanelBenchmarkDefinition();
  const rows = createMatchedRows(10);
  let reference;
  for (const judgeConcurrency of [undefined, 1, 3, 16]) {
    const baseRunner = createPanelRunner({ benchmarkDefinition });
    let activeCalls = 0;
    let maximumActiveCalls = 0;
    const result = await judgeBenchmarkRows({
      benchmarkDefinition, rows, judgeConcurrency,
      agentRunnerImplementation: async (args) => {
        activeCalls += 1;
        maximumActiveCalls = Math.max(maximumActiveCalls, activeCalls);
        await new Promise((resolve) => setImmediate(resolve));
        try { return await baseRunner.runner(args); }
        finally { activeCalls -= 1; }
      }
    });
    assert.equal(result.judging.status, "complete");
    assert.equal(maximumActiveCalls, judgeConcurrency ?? 8);
    const evidence = { scores: result.scoresByRowKey, basisHash: result.judging.basisHash, promptHash: result.judging.promptHash };
    if (reference) assert.deepEqual(evidence, reference);
    else reference = evidence;
  }
});

test("invalid judge concurrency is rejected before any provider invocation", async () => {
  for (const judgeConcurrency of [0, -1, 17, 1.5, NaN, "4"]) {
    await assert.rejects(() => judgeBenchmarkRows({
      benchmarkDefinition: createConsensusPanelBenchmarkDefinition(), rows: createMatchedRows(1), judgeConcurrency,
      agentRunnerImplementation: () => assert.fail("Invalid concurrency cannot invoke a provider.")
    }), (error) => error.code === "EVAL_BENCHMARK_JUDGE_CONCURRENCY");
  }
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
