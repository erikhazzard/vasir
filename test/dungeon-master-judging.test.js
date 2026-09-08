import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { dmCandidateOrder, dmJudgePrompt, validateDmJudgeOutput, judgeDungeonMasterRun } from "../cli/eval/judge-dungeon-master-benchmark.js";

const hash = text => crypto.createHash("sha256").update(text).digest("hex");
const scoring = { dimensions: ["causal-coherence", "play-and-consequence", "structure-clarity-scope", "distinctiveness-evocation", "active-forces", "setup-information"].map(id => ({ id, weight: 1 })) };
const rows = ["plain", "skill"].map(conditionId => ({ rowKey: `model::case::trial-1::${conditionId}`, configurationId: "model", caseId: "case", trialNumber: 1,
  conditionId, outputText: `Exact ${conditionId} output\nwith second line.`, outputHash: hash(`Exact ${conditionId} output\nwith second line.`), promptText: "create an outline for TTRPG adventure" }));
const pair = { pairId: "model::case::trial-1", rows };
function review() { return { assessments: ["A", "B"].map(candidateId => ({ candidateId, dimensions: scoring.dimensions.map(({ id }) => ({ id, score: candidateId === "A" ? 2 : 4, evidence: "Concrete passage.", reason: "Explains its effect." })),
  fundamentalRepairRequired: { value: false, reason: "No fatal contradiction." }, taskNoncompletion: { value: false, reason: "An outline is supplied." } })),
  preference: { winner: "B", confidence: "medium", reason: "More useful connections." } }; }

test("DM seats use opposite orders and retain exact candidate bytes", () => {
  const first = dmCandidateOrder(pair, 0), second = dmCandidateOrder(pair, 1);
  assert.deepEqual(first.map(r => r.rowKey), second.map(r => r.rowKey).reverse());
  const prompt = dmJudgePrompt({ task: rows[0].promptText, scoring, rubricText: "Independent rubric.", candidates: first });
  assert.ok(prompt.includes(`<task>${rows[0].promptText}</task>`));
  assert.ok(prompt.includes(`<rubric>${JSON.stringify(scoring)}</rubric>`));
  assert.ok(prompt.includes(`<candidate id="A">\n<answer>${first[0].outputText}</answer>\n</candidate>`));
  const result = validateDmJudgeOutput(JSON.stringify(review()), scoring, first);
  assert.equal(result.assessments.find(a => a.candidateId === "B").rowKey, first[1].rowKey);
});

test("DM judge normalization rejects missing, duplicate and unsupported ratings", () => {
  const duplicate = review(); duplicate.assessments[0].dimensions[1].id = duplicate.assessments[0].dimensions[0].id;
  assert.throws(() => validateDmJudgeOutput(JSON.stringify(duplicate), scoring, rows), /dimensions/);
  const score = review(); score.assessments[0].dimensions[0].score = 6;
  assert.throws(() => validateDmJudgeOutput(JSON.stringify(score), scoring, rows), /dimensions/);
  const blank = review(); blank.assessments[0].dimensions[0].evidence = "";
  assert.throws(() => validateDmJudgeOutput(JSON.stringify(blank), scoring, rows), /dimensions/);
  const candidates = review(); candidates.assessments[1].candidateId = "A";
  assert.throws(() => validateDmJudgeOutput(JSON.stringify(candidates), scoring, rows), /candidates/);
});

test("DM checkpoint resumes retained reviews without new calls or dropping evidence", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dm-judge-test-"));
  try {
    fs.writeFileSync(path.join(directory, "run.json"), JSON.stringify({ runId: "fixture", status: "completed", benchmark: { definition: { scoring } }, rows }));
    fs.writeFileSync(path.join(directory, "judge-rubric.md"), "Frozen rubric.");
    let calls = 0;
    const runtime = async ({ evidenceDirectory, promptText }) => {
      calls++; fs.mkdirSync(evidenceDirectory, { recursive: true });
      return { text: JSON.stringify(review()), usage: { outputTokens: 100 }, durationMs: 1, runtimeReceipt: { userPromptSha256: hash(promptText), freshSession: true } };
    };
    const first = await judgeDungeonMasterRun({ runDirectory: directory, concurrency: 2, runtime });
    assert.equal(calls, 2); assert.equal(first.pairs[0].judges.length, 2);
    const saved = JSON.parse(JSON.stringify(first.pairs));
    const resumed = await judgeDungeonMasterRun({ runDirectory: directory, concurrency: 2, runtime });
    assert.equal(calls, 2); assert.deepEqual(resumed.pairs, saved);
    assert.equal(fs.existsSync(path.join(directory, "judges.lock")), false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
