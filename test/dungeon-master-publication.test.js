import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createStorytellingSkillInstruction, freezeStorytellingSkill, STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION } from "../cli/eval/storytelling-agent-runtime.js";
import { createDungeonMasterRows } from "../cli/eval/run-dungeon-master-benchmark.js";
import { dmCandidateOrder, dmJudgePrompt, dmPairs, validateDmJudgeOutput } from "../cli/eval/judge-dungeon-master-benchmark.js";
import { buildDungeonMasterPublication, DUNGEON_MASTER_BENCHMARK_ID, DUNGEON_MASTER_SELECTION_PATH, prepareDungeonMasterPublicationSource, projectDungeonMasterRun, validateDungeonMasterPublication } from "../cli/eval/dungeon-master-publication.js";
import { buildWritingPublication, prepareWritingPublicationSource, validateWritingPublication, validateWritingSummary } from "../cli/eval/writing-publication.js";
import { runStorytellingBenchmark } from "../cli/eval/run-storytelling-benchmark.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const digest = value => crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const CONFIG = { id: "codex:gpt-6-astra@ultra", provider: "codex", model: "gpt-6-astra", reasoning: "ultra" };
const SEATS = ["astra-ultra-review-1", "astra-ultra-review-2"];
const REQUIRED = ["references/adventure-design.md"];
const definition = JSON.parse(fs.readFileSync(path.join(REPO, "benchmarks/dungeon-master-adventure-outline/benchmark.json"), "utf8"));

function write(root, relative, value) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n");
}
function receipt(prompt, output, snapshot, instruction) {
  return { cli: "codex", freshSession: true, requestedConfiguration: CONFIG, requestedModel: CONFIG.model, requestedReasoning: CONFIG.reasoning, userPromptSha256: digest(prompt), outputSha256: digest(output), skillHash: snapshot?.hash ?? null, instructionHash: instruction ? digest(instruction) : null, executionMode: "ultra", modelVerification: "explicit-cli-request-only", reasoningVerification: "explicit-cli-request-only", rawStreamsRetained: true, referenceAccess: { observedPaths: snapshot ? REQUIRED : [] }, sessionId: "private-session-must-not-escape", cliArguments: ["private-cli-must-not-escape"] };
}
function fixture(t, { missingJudge = false, ratings } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-dm-publication-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const skillDirectory = path.join(root, "skill");
  write(skillDirectory, "SKILL.md", "---\nname: dungeon-master\n---\nRead the adventure-design reference.\n");
  write(skillDirectory, REQUIRED[0], "A short test-only adventure design reference.\n");
  const snapshot = freezeStorytellingSkill({ skillDirectoryPath: skillDirectory, skillName: "dungeon-master" });
  const instruction = createStorytellingSkillInstruction({ skillSnapshot: snapshot, skillDirectoryPath: "<frozen-skill-directory>", requiredSkillFiles: REQUIRED });
  const run = { kind: "dungeon-master-benchmark", schemaVersion: 1, runId: "dm-publication-test", benchmark: { definition: structuredClone(definition), hash: digest(definition) }, configurations: [CONFIG], treatment: { id: "skill:dungeon-master", hash: snapshot.hash, requiredSkillFiles: REQUIRED }, generation: { expectedRows: 32, expectedPairs: 16 }, rows: createDungeonMasterRows(definition, CONFIG), judging: { schemaVersion: 1, rubricHash: digest(definition.scoring.judgeInstructions), panel: SEATS.map(id => ({ ...CONFIG, configurationId: CONFIG.id, id })), pairs: [] } };
  for (const row of run.rows) {
    const treatment = row.conditionId !== "clean";
    row.outputText = `Outline ${row.caseId} ${row.trialNumber} ${treatment ? "blue" : "green"}.\n\nChoice  and consequence—café, 世界, 🌍.\nRetain exact whitespace.\n`;
    row.outputHash = digest(row.outputText); row.rowStatus = "complete"; row.durationMs = 1250;
    row.usage = { inputTokens: 100, outputTokens: 30, totalTokens: 130 };
    row.runtimeReceipt = receipt(row.promptText, row.outputText, treatment ? snapshot : null, treatment ? instruction : null);
    if (treatment) {
      const file = snapshot.files.find(candidate => candidate.relativePath === REQUIRED[0]);
      row.runtimeReceipt.requiredSkillReads = { policyVersion: STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION, evidence: "successful-command-output-frozen-byte-match", status: "complete", requiredFiles: REQUIRED, files: [{ relativePath: file.relativePath, sha256: file.sha256, bytes: file.bytes, requiredChunkCount: 1, complete: true, observedChunks: [{ index: 0, bytes: file.bytes, sha256: file.sha256 }] }] };
    }
  }
  for (const pair of dmPairs(run)) {
    const judges = SEATS.slice(0, missingJudge ? 1 : 2).map((judgeId, seat) => {
      const candidates = dmCandidateOrder(pair, seat);
      const promptText = dmJudgePrompt({ task: candidates[0].promptText, scoring: definition.scoring, rubricText: definition.scoring.judgeInstructions, candidates });
      const value = { assessments: candidates.map((row, index) => ({ candidateId: index === 0 ? "A" : "B", dimensions: definition.scoring.dimensions.map(d => ({ id: d.id, score: ratings ? ratings(row, seat, d.id) : row.caseId === "primary" ? (row.conditionId === "clean" ? 1 + seat : 4 + seat) : (row.conditionId === "clean" ? 5 - seat : seat), evidence: "Choice and consequence", reason: "The outline establishes a playable choice." })), fundamentalRepairRequired: { value: false, reason: "No fundamental contradiction observed." }, taskNoncompletion: { value: false, reason: "An outline is present." } })), preference: { winner: "A", confidence: "medium", reason: "Candidate A offers a clearer activity." } };
      const outputText = JSON.stringify(value);
      return { judgeId, status: "completed", promptText, promptHash: digest(promptText), outputText, outputHash: digest(outputText), candidateOrder: candidates.map(row => row.rowKey), ...validateDmJudgeOutput(outputText, definition.scoring, candidates), runtimeReceipt: receipt(promptText, outputText), durationMs: 2000, usage: { inputTokens: 300, outputTokens: 100, totalTokens: 400 } };
    });
    run.judging.pairs.push({ pairId: pair.pairId, caseId: pair.caseId, trialNumber: pair.trialNumber, configurationId: pair.configurationId, judges });
  }
  const project = () => projectDungeonMasterRun({ run, snapshot, sourceSha256: digest(run) });
  return { root, run, snapshot, project };
}

test("DM retains every repetition and ranks only the six exact primary pairs", t => {
  const f = fixture(t); const { projection, responseBundle } = f.project();
  assert.equal(projection.cases.length, 16); assert.equal(projection.caseResults.length, 32);
  assert.equal(new Set(responseBundle.responses.map(row => `${row.caseId}:${row.condition}`)).size, 32);
  assert.deepEqual(projection.settings[0].scores, { baseline: 30, skill: 90 });
  assert.equal(projection.settings[0].deltas.skill, 60);
  assert.equal(projection.cohortSummaries.transfer.baseline, 90);
  assert.equal(projection.cohortSummaries.transfer.treatment, 10);
  assert.equal(projection.cohortSummaries.transfer.delta, -80);
  assert.equal(projection.cohortSummaries.primary.usablePairs, 6);
  assert.equal(projection.cohortSummaries.transfer.usablePairs, 10);
  assert.equal(projection.coverage.judgmentCount, 64);
  assert.equal(projection.pairwisePreferences.length, 32);
  assert.equal(responseBundle.responses[0].outputText, f.run.rows[0].outputText);
  assert.equal(responseBundle.responses[0].characterCount, [...f.run.rows[0].outputText].length);
  assert.equal(responseBundle.responses[0].runtime.rawProviderStreamRetained, true);
  assert.ok(!JSON.stringify({ projection, responseBundle }).includes("private-session"));
  assert.equal(new Set(responseBundle.responses[0].judgments.map(judge => judge.reviewerId)).size, 2);
});

test("zero and five map to 0 and 100 without gates or score caps", t => {
  const f = fixture(t, { ratings: row => row.conditionId === "clean" ? 0 : 5 });
  assert.deepEqual(f.project().projection.settings[0].scores, { baseline: 0, skill: 100 });
});

test("one saved reviewer remains evidence and cannot rank either arm", t => {
  const { projection, responseBundle } = fixture(t, { missingJudge: true }).project();
  assert.equal(projection.coverage.judgmentCount, 32);
  assert.equal(projection.coverage.scoredResponseCount, 0);
  assert.equal(projection.entries[0].rank, null);
  assert.deepEqual(projection.settings[0].scores, { baseline: null, skill: null });
  assert.ok(responseBundle.responses.every(row => row.outputText && row.judgments.length === 1 && row.score === null));
});

test("incomplete required-read proof remains scored under the intention-to-invoke design", t => {
  const f = fixture(t);
  const reads = f.run.rows[1].runtimeReceipt.requiredSkillReads;
  reads.status = "incomplete"; reads.files[0].complete = false; reads.files[0].observedChunks = [];
  const result = f.project();
  assert.deepEqual(result.projection.settings[0].scores, { baseline: 30, skill: 90 });
  assert.equal(result.projection.adherenceCoverage.verifiedTreatmentAnswers, 15);
  assert.equal(result.projection.adherenceCoverage.unverifiedTreatmentAnswers, 1);
  assert.equal(result.responseBundle.responses[1].runtime.requiredSkillReads.status, "incomplete");
  assert.equal(result.responseBundle.responses[1].runtime.requiredSkillReads.observedChunkCount, 0);
});

test("nonuniform integer dimensions retain exact panel arithmetic within floating precision", t => {
  const f = fixture(t, { ratings: (row, seat, id) => (definition.scoring.dimensions.findIndex(d => d.id === id) + seat + (row.conditionId === "clean" ? 1 : 2)) % 6 });
  validateDungeonMasterPublication(f.project().projection, f.project().responseBundle);
});

test("transfer summaries keep equal source-prompt weights when repetitions have missing reviews", t => {
  const f = fixture(t, { ratings: row => row.conditionId === "clean" ? 0 : row.caseId === "caravan" ? 5 : 0 });
  f.run.judging.pairs.find(pair => pair.caseId === "caravan" && pair.trialNumber === 2).judges.pop();
  const transfer = f.project().projection.cohortSummaries.transfer;
  assert.equal(transfer.usablePairs, 9);
  assert.equal(transfer.treatment, 20);
  assert.equal(transfer.complete, false);
  assert.equal(transfer.scoredSourcePromptCount, 5);
});

test("source validation rejects answer, order, rubric, review and reference tampering", async t => {
  const mutations = [
    ["answer bytes", f => { f.run.rows[0].outputText += "changed"; }],
    ["rubric bytes", f => { f.run.benchmark.definition.scoring.dimensions[0].title += "changed"; }],
    ["same reviewer order", f => { f.run.judging.pairs[0].judges[1].candidateOrder = f.run.judging.pairs[0].judges[0].candidateOrder; }],
    ["normalized rating", f => { f.run.judging.pairs[0].judges[0].assessments[0].dimensions[0].score = 0; }],
    ["duplicate review seat", f => { f.run.judging.pairs[0].judges[1].judgeId = SEATS[0]; }],
    ["changed original judgment", f => { f.run.judging.pairs[0].judges[0].outputText += " "; }],
    ["crossed baseline reference", f => { f.run.rows[0].runtimeReceipt.referenceAccess.observedPaths = REQUIRED; }],
    ["missing required reference", f => { f.run.rows[1].runtimeReceipt.requiredSkillReads.files[0].observedChunks = []; }],
    ["duplicate repetition", f => { f.run.rows[2] = structuredClone(f.run.rows[0]); }]
  ];
  for (const [name, mutate] of mutations) await t.test(name, child => { const f = fixture(child); mutate(f); assert.throws(f.project, /Dungeon Master publication/); });
});

test("public validators reject altered scores, exact answers, cohort means, and repeated reviewers", async t => {
  for (const mutate of [
    result => { result.projection.caseResults[0].score = 99; },
    result => { result.projection.cohortSummaries.transfer.delta = 99; },
    result => { result.projection.entries[0].exactScore = 99; },
    result => { result.responseBundle.responses[0].outputText += "changed"; },
    result => { result.responseBundle.responses[0].judgments[1].reviewerId = SEATS[0]; },
    result => { result.responseBundle.responses[0].runtime.sessionId = "private"; }
  ]) await t.test("reject tampering", child => { const result = fixture(child).project(); mutate(result); assert.throws(() => validateDungeonMasterPublication(result.projection, result.responseBundle), /Dungeon Master publication/); });
});

test("source selection pins immutable run and skill bytes and refuses active writers", t => {
  const f = fixture(t); const directory = path.join(f.root, ".agents/vasir-evals", DUNGEON_MASTER_BENCHMARK_ID, "run");
  write(directory, "run.json", f.run); write(directory, "skill-snapshot.json", f.snapshot);
  write(directory, "run.lock", "active");
  assert.throws(() => prepareDungeonMasterPublicationSource({ repoRootDirectory: f.root, runDirectory: directory }), /active run writer/);
  fs.unlinkSync(path.join(directory, "run.lock"));
  const selection = prepareDungeonMasterPublicationSource({ repoRootDirectory: f.root, runDirectory: directory });
  write(f.root, DUNGEON_MASTER_SELECTION_PATH, selection);
  assert.equal(buildDungeonMasterPublication({ repoRootDirectory: f.root }).projection.coverage.scoredResponseCount, 32);
  fs.appendFileSync(path.join(f.root, selection.run.path), " ");
  assert.throws(() => buildDungeonMasterPublication({ repoRootDirectory: f.root }), /immutable source changed/);
  selection.run.path = "../outside.json"; write(f.root, DUNGEON_MASTER_SELECTION_PATH, selection);
  assert.throws(() => buildDungeonMasterPublication({ repoRootDirectory: f.root }), /unsafe source path/);
});

test("additive Writing selection preserves the existing Storytelling projection and answers", async t => {
  const f = fixture(t);
  const corpus = JSON.parse(fs.readFileSync(path.join(REPO, "benchmarks/storytelling-core-idea/benchmark.json"), "utf8"));
  corpus.cases = corpus.cases.slice(0, 1);
  write(f.root, "benchmarks/storytelling-core-idea/benchmark.json", corpus);
  write(f.root, ".agents/skills/writing-storytelling/SKILL.md", "---\nname: writing-storytelling\n---\nExplain the story.\n");
  const run = await runStorytellingBenchmark({ projectRootDirectory: f.root, currentWorkingDirectory: f.root, requestedModelArguments: ["codex:gpt-5.6-luna@low"], runId: "story-test", seed: "test", prepareOnly: true, environmentVariables: {} });
  const storyDirectory = path.join(f.root, ".agents/vasir-evals/storytelling-core-idea/story-test");
  assert.ok(run);
  write(f.root, "benchmarks/storytelling-core-idea/publication.json", prepareWritingPublicationSource({ repoRootDirectory: f.root, runDirectory: storyDirectory }));
  const before = buildWritingPublication({ repoRootDirectory: f.root });
  const dmDirectory = path.join(f.root, ".agents/vasir-evals", DUNGEON_MASTER_BENCHMARK_ID, "run");
  write(dmDirectory, "run.json", f.run); write(dmDirectory, "skill-snapshot.json", f.snapshot);
  write(f.root, DUNGEON_MASTER_SELECTION_PATH, prepareDungeonMasterPublicationSource({ repoRootDirectory: f.root, runDirectory: dmDirectory }));
  const after = buildWritingPublication({ repoRootDirectory: f.root });
  const { additionalBenchmarks, allWritingCoverage, ...defaultProjection } = after.projection;
  const { additionalBenchmarks: additionalResponses, ...defaultResponses } = after.responseBundle;
  assert.deepEqual(defaultProjection, before.projection); assert.deepEqual(defaultResponses, before.responseBundle);
  assert.equal(additionalBenchmarks[DUNGEON_MASTER_BENCHMARK_ID].caseResults.length, 32);
  assert.equal(additionalResponses[DUNGEON_MASTER_BENCHMARK_ID].responses.length, 32);
  assert.equal(allWritingCoverage.benchmarkCount, 2);
  assert.ok(after.stub.subsections.some(section => section.id === "dungeon-master"));
  assert.notEqual(after.basisSha256, before.basisSha256);
  validateWritingSummary(after.stub); validateWritingPublication(after.projection, after.responseBundle);
});
