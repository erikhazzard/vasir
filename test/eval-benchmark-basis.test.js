import assert from "node:assert/strict";
import test from "node:test";

import { upgradeBenchmarkRunBasis } from "../cli/eval/benchmark-basis.js";

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

