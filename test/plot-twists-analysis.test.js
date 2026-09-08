import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { analyzeTwistRun, pairedBootstrap } from "../benchmarks/storytelling-plot-twists/analyze.mjs";

function fixture() {
  const hash = text => crypto.createHash("sha256").update(text).digest("hex");
  const panel = ["judge-a", "judge-b"];
  const run = { benchmarkName: "storytelling-plot-twists", runId: "fixture", storytelling: { manifestHash: "fixture" },
    benchmark: { hash: "fixture", definition: { id: "storytelling-plot-twists", judging: { panel }, limitations: [],
      cases: [{ id: "case" }], scoring: { dimensions: [{ id: "causality", weight: 60 }, { id: "surprise", weight: 40 }] } } },
    treatment: { id: "skill", hash: "fixture" }, configurations: [{ id: "model" }], generation: { trialCount: 2 }, rows: [],
    judging: { judges: panel.map(id => ({ configuration: { id }, batches: [{ status: "complete", evaluations: [] }] })) } };
  for (let trial = 1; trial <= 2; trial += 1) for (const condition of ["clean", "skill"]) {
    const rowKey = `${trial}-${condition}`, outputText = `Fixture ${rowKey}`;
    run.rows.push({ rowKey, configurationId: "model", caseId: "case", trialNumber: trial, conditionId: condition,
      rowStatus: "complete", outputText, outputHash: hash(outputText), durationMs: 100 });
    for (const [index, judge] of run.judging.judges.entries()) {
      const rating = (condition === "skill" ? (trial === 1 ? 9 : 5) : 6) + index;
      judge.batches[0].evaluations.push({ rowKey, total: rating * 10, dimensions: [{ id: "causality", rating }, { id: "surprise", rating }] });
    }
  }
  return run;
}

test("twist analysis recomputes weighted scores, trial deltas and per-judge effects", () => {
  const result = analyzeTwistRun(fixture()), row = result.configurations[0];
  assert.deepEqual(result.coverage, { expectedAnswers: 4, completeAnswers: 4, expectedAssessments: 8, completeAssessments: 8, completePairs: 2 });
  assert.equal(row.baseline.score, 65); assert.equal(row.skill.score, 75); assert.equal(row.delta, 10);
  assert.equal(row.wins, 1); assert.equal(row.losses, 1); assert.equal(row.ties, 0);
  assert.equal(row.meanJudgeScoreSpread, 10);
  assert.deepEqual(row.perJudgeDeltas, { "judge-a": 10, "judge-b": 10 });
});

test("missing judge excludes a pair without filling scores or hiding denominator", () => {
  const run = fixture(); run.judging.judges[1].batches[0].evaluations.pop();
  const result = analyzeTwistRun(run), row = result.configurations[0];
  assert.equal(result.coverage.completeAssessments, 7); assert.equal(row.expectedPairs, 2); assert.equal(row.completePairs, 1);
  assert.equal(row.delta, null); assert.equal(row.baseline, null); assert.equal(row.skill, null);
  assert.equal(row.availablePairDiagnostics.delta, 30); assert.equal(row.trials[1].delta, null); assert.equal(row.bootstrap95, null);
});

test("analysis rejects score tampering, duplicate evidence and changed answer bytes", () => {
  for (const change of [run => run.judging.judges[0].batches[0].evaluations[0].total++,
    run => run.judging.judges[0].batches[0].evaluations.push(run.judging.judges[0].batches[0].evaluations[0]),
    run => run.rows[0].outputText += " changed",
    run => delete run.judging.judges[0].batches[0].evaluations[0].total,
    run => run.rows.pop(),
    run => run.rows[0].trialNumber = 2]) {
    const run = fixture(); change(run); assert.throws(() => analyzeTwistRun(run));
  }
});

test("bootstrap is reproducible and constant effects stay constant", () => {
  assert.deepEqual(pairedBootstrap([-10, 30]), pairedBootstrap([-10, 30]));
  assert.equal(pairedBootstrap([7, 7, 7]).low, 7); assert.equal(pairedBootstrap([7, 7, 7]).high, 7);
  assert.equal(pairedBootstrap([]), null);
});
