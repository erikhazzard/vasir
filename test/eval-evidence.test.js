import test from "node:test";
import assert from "node:assert/strict";

import { createBottomLine, createPrimaryEvidence, getRunComparability } from "../cli/eval/evidence.js";

function createRunSummary({
  averageScoreLift = 0.2,
  passRateLift = 1,
  primaryEvidence = null,
  judgeStatus = "not_configured",
  judgeModels = []
} = {}) {
  const summary = {
    global: {
      comparablePairCount: 1,
      totalPairCount: 1,
      averageScoreLift,
      passRateLift
    },
    judge: {
      available: false,
      totalPairCount: 1,
      judgedPairCount: 0,
      betterPairCount: 0,
      worsePairCount: 0,
      tiePairCount: 0,
      inconclusivePairCount: 0
    },
    perModel: []
  };

  return {
    runId: "run-1",
    runStatus: "complete",
    suiteHash: "suite-hash",
    trialCount: 1,
    scorerVersion: 7,
    harnessVersion: 3,
    modelIds: ["openai:gpt-5.4"],
    judgeStatus,
    judgeModels,
    summary,
    primaryEvidence
  };
}

test("judge-configured runs fail closed when the fixed judges are unavailable", () => {
  const summary = {
    global: {
      comparablePairCount: 1,
      totalPairCount: 1,
      averageScoreLift: 0.4,
      passRateLift: 1
    },
    judge: {
      available: false,
      totalPairCount: 1,
      judgedPairCount: 0,
      betterPairCount: 0,
      worsePairCount: 0,
      tiePairCount: 0,
      inconclusivePairCount: 0
    },
    perModel: []
  };

  const primaryEvidence = createPrimaryEvidence({
    summary,
    judgeStatus: "skipped",
    judgeModelIds: ["openai:gpt-5.4", "anthropic:claude-opus-4-6"]
  });
  const bottomLine = createBottomLine({
    summary,
    judgeStatus: "skipped",
    judgeModelIds: ["openai:gpt-5.4", "anthropic:claude-opus-4-6"]
  });

  assert.equal(primaryEvidence.mode, "hard_floor_without_judges");
  assert.equal(primaryEvidence.verdict, "no_data");
  assert.equal(primaryEvidence.hardFloorOutcome, "better");
  assert.equal(bottomLine.overallVerdict, "NO SIGNAL");
  assert.match(bottomLine.evidenceSource, /fixed judges unavailable/i);
});

test("run comparability rejects incomplete judge coverage", () => {
  const currentSummary = createRunSummary({
    primaryEvidence: {
      mode: "hard_floor_without_judges",
      verdict: "no_data",
      metricName: "hard_score_lift",
      metricLabel: "hard score lift",
      metricValue: 0.2,
      hardFloorOutcome: "better"
    },
    judgeStatus: "skipped",
    judgeModels: ["openai:gpt-5.4", "anthropic:claude-opus-4-6"]
  });
  const previousSummary = createRunSummary({
    primaryEvidence: {
      mode: "dual_judges_with_hard_floor",
      verdict: "better",
      metricName: "judge_edge",
      metricLabel: "judge edge",
      metricValue: 1,
      judgeModelIds: ["openai:gpt-5.4", "anthropic:claude-opus-4-6"],
      hardFloorOutcome: "better"
    },
    judgeStatus: "complete",
    judgeModels: ["openai:gpt-5.4", "anthropic:claude-opus-4-6"]
  });

  assert.deepEqual(getRunComparability(currentSummary, previousSummary), {
    comparable: false,
    reason: "one of the runs did not complete the judge layer"
  });
});

test("run comparability rejects judge model set changes", () => {
  const currentSummary = createRunSummary({
    primaryEvidence: {
      mode: "dual_judges_with_hard_floor",
      verdict: "better",
      metricName: "judge_edge",
      metricLabel: "judge edge",
      metricValue: 1,
      judgeModelIds: ["openai:gpt-5.4", "anthropic:claude-opus-4-6"],
      hardFloorOutcome: "better"
    },
    judgeStatus: "complete",
    judgeModels: ["openai:gpt-5.4", "anthropic:claude-opus-4-6"]
  });
  const previousSummary = createRunSummary({
    primaryEvidence: {
      mode: "dual_judges_with_hard_floor",
      verdict: "better",
      metricName: "judge_edge",
      metricLabel: "judge edge",
      metricValue: 1,
      judgeModelIds: ["openai:gpt-5.4", "anthropic:claude-sonnet-4"],
      hardFloorOutcome: "better"
    },
    judgeStatus: "complete",
    judgeModels: ["openai:gpt-5.4", "anthropic:claude-sonnet-4"]
  });

  assert.deepEqual(getRunComparability(currentSummary, previousSummary), {
    comparable: false,
    reason: "the judge model set changed"
  });
});
