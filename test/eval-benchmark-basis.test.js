import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  createBenchmarkRowScoreBasisHash,
  upgradeBenchmarkRunBasis
} from "../cli/eval/benchmark-basis.js";

test("basis migration derives condition and exact judge-cohort fingerprints without changing evidence", () => {
  const run = {
    kind: "benchmark",
    benchmark: {
      hash: "benchmark-hash",
      definition: { scoring: { version: "rubric-v1" } }
    },
    conditions: [
      { id: "clean", hash: "clean-hash" },
      { id: "skill:test", hash: "skill-hash" }
    ],
    generation: {
      trialCount: 1,
      neutralHarnessInstruction: "neutral"
    },
    harnessVersion: 1,
    scorerVersion: "rubric-v1",
    rows: [
      {
        rowKey: "row-clean",
        configurationId: "codex:model@max",
        caseId: "case",
        conditionId: "clean",
        outputText: "Clean answer",
        score: { total: 40 }
      },
      {
        rowKey: "row-skill",
        configurationId: "codex:model@max",
        caseId: "case",
        conditionId: "skill:test",
        outputText: "Skill answer",
        score: { total: 70 }
      }
    ],
    judging: {
      judgeConfiguration: { id: "codex:judge@max" },
      promptText: "Exact judge prompt",
      candidateOrder: [
        { candidateId: "candidate-001", rowKey: "row-skill" },
        { candidateId: "candidate-002", rowKey: "row-clean" }
      ]
    }
  };

  upgradeBenchmarkRunBasis(run);

  assert.equal(run.judging.promptHash.length, 64);
  assert.equal(run.judging.cohortHash.length, 64);
  assert.equal(run.judging.cohortSize, 2);
  assert.equal(run.rows[0].basisHash.length, 64);
  assert.equal(run.rows[0].scoreBasisHash.length, 64);
  assert.notEqual(run.rows[0].basisHash, run.rows[1].basisHash);
  assert.equal(run.rows[0].score.total, 40);
  assert.equal(run.rows[0].outputText, "Clean answer");
  assert.equal(run.artifactMigrations[0].id, "benchmark-basis-v2");
});

test("rejudge basis migration keeps configuration prompt overrides instead of rebinding them to neutral", () => {
  const configurationId = "claude:claude-fable-5-1@ultracode";
  const generationHash = "generation-hash";
  const conditionHash = "clean-hash";
  const neutralInstruction = "neutral harness";
  const ultracodeInstruction = "exact Fable 5.1 Ultracode v2 harness";
  const createExpectedBasisHash = (rowConfigurationId, harnessInstruction) => crypto
    .createHash("sha256")
    .update([
      generationHash,
      rowConfigurationId,
      "case",
      1,
      harnessInstruction,
      2,
      conditionHash
    ].join(":"))
    .digest("hex");
  const overrideBasisHash = createExpectedBasisHash(configurationId, ultracodeInstruction);
  const incorrectlyNeutralBasisHash = createExpectedBasisHash(configurationId, neutralInstruction);
  const legacyConfigurationId = "codex:gpt-5.6-sol@max";
  const legacyNeutralBasisHash = createExpectedBasisHash(
    legacyConfigurationId,
    neutralInstruction
  );
  const run = {
    kind: "benchmark",
    rescoredFromRunId: "source-run",
    benchmark: {
      generationHash,
      scoringHash: "scoring-hash",
      definition: { scoring: { version: "rubric-v1" } }
    },
    conditions: [{ id: "clean", hash: conditionHash }],
    generation: {
      sourceRunId: "source-run",
      trialCount: 1,
      neutralHarnessInstruction: neutralInstruction,
      promptModeOverrides: {
        [configurationId]: {
          id: "fable-5.1-ultracode-workflow-v2",
          instruction: ultracodeInstruction,
          hash: crypto.createHash("sha256").update(ultracodeInstruction).digest("hex")
        }
      }
    },
    harnessVersion: 2,
    rows: [
      {
        rowKey: "fable-ultracode-clean",
        configurationId,
        caseId: "case",
        conditionId: "clean",
        basisHash: overrideBasisHash,
        outputText: "Response",
        score: null
      },
      {
        rowKey: "legacy-clean",
        configurationId: legacyConfigurationId,
        caseId: "case",
        conditionId: "clean",
        basisHash: legacyNeutralBasisHash,
        outputText: "Legacy response",
        score: null
      }
    ],
    judging: { candidateOrder: [] }
  };

  upgradeBenchmarkRunBasis(run);

  assert.equal(run.rows[0].basisHash, overrideBasisHash);
  assert.notEqual(run.rows[0].basisHash, incorrectlyNeutralBasisHash);
  assert.equal(run.rows[1].basisHash, legacyNeutralBasisHash);
});

test("panel score bases depend on only that response, the fixed rubric, and its three evaluations", () => {
  const createScore = (total, suffix) => ({
    total,
    aggregation: {
      method: "majority-gates-median-dimensions-v1",
      judgeCount: 3,
      evaluations: [
        { reviewerId: "reviewer-003", evaluationHash: `c${suffix}`.padEnd(64, "c"), total: total + 1 },
        { reviewerId: "reviewer-001", evaluationHash: `a${suffix}`.padEnd(64, "a"), total: total - 1 },
        { reviewerId: "reviewer-002", evaluationHash: `b${suffix}`.padEnd(64, "b"), total }
      ],
      minScore: total - 1,
      maxScore: total + 1,
      spread: 2
    }
  });
  const incumbent = {
    rowKey: "incumbent",
    basisHash: "generation-basis-incumbent",
    outputText: "Incumbent response",
    score: createScore(80, "1")
  };
  const run = {
    kind: "benchmark",
    benchmark: {
      generationHash: "generation-hash",
      scoringHash: "fixed-scoring-contract",
      definition: { scoring: { version: "rubric-v2" } }
    },
    conditions: [{ id: "clean", hash: "condition-hash" }],
    generation: { trialCount: 1, neutralHarnessInstruction: "neutral" },
    harnessVersion: 2,
    rows: [{
      ...incumbent,
      configurationId: "codex:incumbent@max",
      caseId: "case",
      conditionId: "clean"
    }],
    judging: {
      basisHash: "run-wide-basis",
      promptText: "all run prompts",
      candidateOrder: [{ candidateId: "candidate-old", rowKey: "incumbent" }]
    }
  };

  upgradeBenchmarkRunBasis(run);
  const before = run.rows[0].scoreBasisHash;

  assert.equal(createBenchmarkRowScoreBasisHash({
    row: run.rows[0],
    scoringHash: "fixed-scoring-contract",
    scoringVersion: "rubric-v2"
  }), before);
  assert.equal(run.judging.scoreBasisScope, "row-local-panel-evidence-v1");
  assert.equal(run.artifactMigrations.at(-1).id, "benchmark-basis-v4");

  const changedOtherCandidate = structuredClone(run);
  changedOtherCandidate.rows.push({
    rowKey: "new-candidate",
    configurationId: "codex:new@max",
    caseId: "case",
    conditionId: "clean",
    outputText: "Completely different new response",
    score: createScore(95, "3")
  });
  changedOtherCandidate.judging.candidateOrder.unshift({
    candidateId: "candidate-new",
    rowKey: "new-candidate"
  });
  changedOtherCandidate.judging.basisHash = "different-run-wide-basis";
  changedOtherCandidate.judging.promptText = "different batch prompts";
  upgradeBenchmarkRunBasis(changedOtherCandidate);
  assert.equal(changedOtherCandidate.rows[0].scoreBasisHash, before);
});

test("two-judge score bases preserve fractional scores and bind method, panel, and both reviews", () => {
  const row = {
    basisHash: "generation-basis",
    outputText: "Architecture response",
    score: {
      total: 87.5,
      aggregation: {
        method: "unanimity-gates-mean-dimensions-v1",
        judgeCount: 2,
        evaluations: [
          { reviewerId: "astra-xhigh", evaluationHash: "a".repeat(64), total: 100 },
          { reviewerId: "fable-5.1-max", evaluationHash: "b".repeat(64), total: 75 }
        ]
      }
    }
  };
  const scoreBasis = (candidate) => createBenchmarkRowScoreBasisHash({
    row: candidate,
    scoringHash: "scoring-v2",
    scoringVersion: "rubric-v2"
  });
  const originalBasis = scoreBasis(row);
  assert.match(originalBasis, /^[a-f0-9]{64}$/u);

  const reordered = structuredClone(row);
  reordered.score.aggregation.evaluations.reverse();
  assert.equal(scoreBasis(reordered), originalBasis);
  for (const change of [
    (candidate) => { candidate.score.total = 87; },
    (candidate) => { candidate.score.aggregation.method = "majority-gates-median-dimensions-v1"; },
    (candidate) => { candidate.score.aggregation.evaluations[0].reviewerId = "astra-max"; },
    (candidate) => { candidate.score.aggregation.evaluations[1].evaluationHash = "c".repeat(64); }
  ]) {
    const changed = structuredClone(row);
    change(changed);
    assert.notEqual(scoreBasis(changed), originalBasis);
  }
  const missingReview = structuredClone(row);
  missingReview.score.aggregation.evaluations.pop();
  assert.equal(scoreBasis(missingReview), null);
});
