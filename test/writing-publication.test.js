import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { runStorytellingBenchmark } from "../cli/eval/run-storytelling-benchmark.js";
import { STORYTELLING_RUNTIME_VERSION, STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION, createStorytellingSkillInstruction } from "../cli/eval/storytelling-agent-runtime.js";
import {
  buildWritingPublication, prepareWritingPublicationSource, projectWritingRun,
  serializeWritingModule, validateWritingPublication, validateWritingSummary,
  WRITING_BENCHMARK_ID, WRITING_SELECTION_PATH, PLOT_TWISTS_BENCHMARK_ID, writingSelectionPath
} from "../cli/eval/writing-publication.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = JSON.parse(fs.readFileSync(path.join(REPO, "benchmarks/storytelling-core-idea/benchmark.json"), "utf8"));
const CONFIG = "codex:gpt-5.6-luna@low";
const SECOND_CONFIG = "claude:claude-opus-5@low";
const PANEL = ["codex:gpt-6-astra@xhigh", "claude:claude-fable-5-1@max"];
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const wordCount = value => value.trim().split(/\s+/u).length;
const publicKey = value => [value.settingId, value.condition, value.caseId].join("::");

function write(root, relative, contents) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof contents === "string" ? contents : `${JSON.stringify(contents, null, 2)}\n`);
}

function grades({ provider, caseIndex, treatment }, judgeIndex) {
  if (provider === "claude") return Array(10).fill(treatment ? 9 : 8);
  if (caseIndex === 0 && !treatment) return judgeIndex === 0 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : Array(10).fill(6);
  if (caseIndex === 0) return Array(10).fill(judgeIndex === 0 ? 8 : 9);
  return Array(10).fill(treatment ? (judgeIndex === 0 ? 3 : 5) : (judgeIndex === 0 ? 6 : 7));
}

// All source creation and runner output stays in a disposable test directory.
// Using the real runner retains its opaque candidate identities, independent
// reviewer IDs, original batch/evaluation hashes, and pending-row inventory.
async function fixture(t, { models = [CONFIG], fail = () => false, missingJudge = false,
  prepareOnly = false, generationOnly = false, ratings = grades, definitionOverride = null, trials = 1, requiredSkillFiles = [], incompleteRead = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-writing-publication-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const definition = structuredClone(definitionOverride ?? CORPUS);
  if (!definitionOverride) definition.cases = definition.cases.slice(0, 2);
  write(root, `benchmarks/${definition.id}/benchmark.json`, definition);
  write(root, ".agents/skills/writing-storytelling/SKILL.md", "---\nname: writing-storytelling\n---\nRead [the reference](references/idea.md) when analyzing a story.\n");
  write(root, ".agents/skills/writing-storytelling/references/idea.md", "Test-only frozen reference. Explain the story's consequences without inventing events.\n");
  const answers = new Map();
  let agentCalls = 0;
  const result = await runStorytellingBenchmark({
    projectRootDirectory: root, currentWorkingDirectory: root, requestedModelArguments: models, benchmarkName: definition.id, trialCount: trials, requiredSkillFiles,
    runId: "writing-publication-fixture", seed: "writing-publication-fixture-v1", prepareOnly, generationOnly,
    environmentVariables: {}, nowImplementation: () => new Date("2026-09-07T12:00:00Z"),
    agentRunnerImplementation: async args => {
      agentCalls += 1;
      const { configuration, promptText, skillSnapshot, outputSchema } = args;
      let text;
      if (outputSchema) {
        if (missingJudge && (configuration.provider === "claude" || configuration.model === "gpt-5.6-sol")) throw Object.assign(new Error("Fixture judge unavailable"), { code: "AUTH_UNAVAILABLE" });
        const candidateAnswers = new Map([...promptText.matchAll(/<candidate id="([^"]+)" case="[^"]+">[\s\S]*?<answer>([\s\S]*?)<\/answer>\n<\/candidate>/gu)].map(match => [match[1], match[2]]));
        text = JSON.stringify({ evaluations: outputSchema.properties.evaluations.items.properties.candidateId.enum.map(candidateId => {
          const answer = answers.get(candidateAnswers.get(candidateId));
          assert.ok(answer, "Every anonymous judge candidate must be one retained fixture answer.");
          const scores = ratings(answer, configuration.provider === "codex" && configuration.model !== "gpt-5.6-sol" ? 0 : 1);
          return { candidateId, gates: [], dimensions: definition.scoring.dimensions.map((dimension, index) => ({ id: dimension.id, rating: scores[index] })), reason: "The retained answer connects the protagonist's choice to its consequence; this fixture keeps the original independent ratings and notes the missing counterexample." };
        }) });
      } else {
        const caseIndex = definition.cases.findIndex(story => story.task === promptText);
        assert.notEqual(caseIndex, -1, "Generation receives only an exact corpus question.");
        const answer = { provider: configuration.provider, caseIndex, treatment: Boolean(skillSnapshot) };
        if (fail(answer)) throw Object.assign(new Error("Fixture OAuth session expired; private diagnostic must not be published."), { code: "AUTH_UNAVAILABLE", context: { stderr: "fixture-private-diagnostic", session_id: "fixture-private-session" } });
        const marker = `${configuration.provider === "codex" ? "A" : "B"}${caseIndex}${skillSnapshot ? "T" : "C"}`;
        text = `Fixture ${marker}.\n\nChoice  and consequence—café, 世界, 🌍.\nA claim\tneeds evidence.`;
        if (trials > 1) text += `\nIndependent retained answer ${agentCalls}.`;
        if (caseIndex === 0 && skillSnapshot) text += `\n\n${Array(1600).fill("unabridged").join(" ")}\nFinal sentence remains intact.`;
        answers.set(text, answer);
      }
      const normalizedInstruction = skillSnapshot ? createStorytellingSkillInstruction({ skillSnapshot, skillDirectoryPath: "<frozen-skill-directory>", requiredSkillFiles }) : null;
      const missingRequiredRead = skillSnapshot && (typeof incompleteRead === "function" ? incompleteRead({ configuration }) : incompleteRead);
      return {
        text, durationMs: 1250, costUsd: null, usage: { inputTokens: 300, outputTokens: 50, totalTokens: 350 },
        runtimeReceipt: {
          cli: configuration.provider, freshSession: true, persistedSession: false,
          runtimeVersion: STORYTELLING_RUNTIME_VERSION, requestedConfiguration: { ...configuration },
          requestedModel: configuration.model, requestedReasoning: configuration.reasoning,
          effectiveEffortRequested: configuration.reasoning, executionMode: "standard",
          userPromptSha256: hash(promptText), outputSha256: hash(text), skillHash: skillSnapshot?.hash ?? null,
          skillInjection: skillSnapshot ? "root-instruction-progressive-file-access" : null,
          instructionHash: normalizedInstruction ? hash(normalizedInstruction) : null,
          modelVerification: "explicit-cli-request-only", reasoningVerification: "explicit-cli-request-only",
          referenceAccess: { observedPaths: skillSnapshot ? ["references/idea.md"] : [], observation: "tool-event-paths" },
          nonMessageItemCount: 0, allowedTools: [],
          ...(skillSnapshot && requiredSkillFiles.length ? { requiredSkillReads: {
            policyVersion: STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION, requiredFiles: [...requiredSkillFiles].sort(), evidence: "successful-command-output-frozen-byte-match", status: missingRequiredRead ? "incomplete" : "complete",
            files: [...requiredSkillFiles].sort().map((relativePath, index) => {
              const file = skillSnapshot.files.find(file => file.relativePath === relativePath);
              const bytes = Buffer.byteLength(file.contents);
              return { relativePath, sha256: file.sha256, bytes, requiredChunkCount: 1, complete: !missingRequiredRead,
                observedChunks: missingRequiredRead ? [] : [{ index, bytes, sha256: hash(file.contents), toolEventId: "private-tool-event" }] };
            })
          } } : {}),
          ...(configuration.provider === "claude" ? { canonicalModels: [configuration.model], targetCanonicalModel: configuration.model, targetCanonicalModelOutputTokens: 50 } : {})
        }
      };
    }
  });
  const runText = fs.readFileSync(path.join(result.outputDirectory, "run.json"), "utf8");
  const snapshotText = fs.readFileSync(path.join(result.outputDirectory, "skill-snapshot.json"), "utf8");
  const run = JSON.parse(runText), snapshot = JSON.parse(snapshotText);
  const project = (source = run, frozen = snapshot) => projectWritingRun({ run: source, snapshot: frozen, sourceSha256: hash(JSON.stringify(source)) });
  return { root, run, snapshot, runText, snapshotText, outputDirectory: result.outputDirectory, project, agentCalls, answers };
}

function selectedReader(f) {
  const runPath = ".agents/vasir-evals/storytelling-core-idea/test-pins/run.json";
  const skillPath = ".agents/vasir-evals/storytelling-core-idea/test-pins/skill-snapshot.json";
  const selection = { kind: "vasirbenchmark-writing-source", schemaVersion: 1, run: { path: runPath, sha256: hash(f.runText) }, skill: { path: skillPath, sha256: hash(f.snapshotText) } };
  const files = new Map([[runPath, f.runText], [skillPath, f.snapshotText]]);
  const reads = [];
  const build = () => buildWritingPublication({ repoRootDirectory: f.root, readFileSyncImplementation: filePath => {
    const relative = path.relative(f.root, filePath);
    reads.push(relative);
    if (relative === WRITING_SELECTION_PATH) return JSON.stringify(selection);
    if (!files.has(relative)) throw Object.assign(new Error("Fixture source missing"), { code: "ENOENT" });
    return files.get(relative);
  } });
  return { selection, files, reads, build };
}

function changeMessageSet(value, messageSet, change) {
  const previousId = messageSet.id;
  change(messageSet.messages);
  messageSet.id = hash(JSON.stringify(messageSet.messages));
  for (const response of value.responseBundle.responses) {
    if (response.messageSetId === previousId) response.messageSetId = messageSet.id;
  }
}

test("Writing recomputes ten 1–10 dimensions from both original judges and equally weights cases", async t => {
  const f = await fixture(t);
  const { projection, responseBundle, stub } = f.project();
  assert.deepEqual(projection.settings[0].scores, { baseline: 61.3, skill: 62.5 });
  assert.equal(projection.settings[0].deltas.skill, 1.3, "Round only after subtracting the unrounded case means.");
  assert.equal(projection.benchmarkResults.find(result => result.condition === "baseline").exactScore, 61.25);
  assert.equal(projection.benchmarkResults.find(result => result.condition === "baseline").dimensions.accuracy, 5);
  assert.deepEqual(projection.scoreBasis.range, { minimum: 10, maximum: 100 });
  assert.deepEqual(projection.scoreBasis.judges, PANEL);
  assert.equal(projection.scoreBasis.dimensions.length, 10);
  assert.ok(projection.scoreBasis.dimensions.every(dimension => dimension.weight === 10 && dimension.description));
  assert.equal(projection.scoreBasis.gates, null);
  assert.equal(projection.scoreBasis.caps, null);
  const first = responseBundle.responses.find(response => response.caseId === f.run.benchmark.definition.cases[0].id && response.condition === "baseline");
  assert.deepEqual(first.judgments.map(judge => judge.score), [55, 60]);
  assert.deepEqual(first.judgments.map(judge => judge.judgeConfigurationId), PANEL);
  assert.equal(first.score, 57.5);
  assert.equal(first.characterCount, Array.from(first.outputText).length);
  assert.notEqual(first.characterCount, first.outputText.length, "Unicode code points do not count a surrogate pair twice.");
  assert.deepEqual(first.runtime.usage, { inputTokens: 300, cachedInputTokens: null, cacheWriteInputTokens: null, cacheCreationInputTokens: null, cacheReadInputTokens: null, outputTokens: 50, reasoningOutputTokens: null, totalTokens: 350 });
  assert.equal(first.runtime.durationMs, 1250);
  assert.ok(first.judgments.every(judge => judge.resources.scope === "shared-matched-pair-batch" && judge.resources.candidateCount === 2 && judge.resources.durationMs === 1250));
  assert.equal(first.disagreement.scoreSpread, 5);
  assert.equal(first.disagreement.dimensionRanges.find(dimension => dimension.id === "accuracy").spread, 5);
  assert.equal(projection.benchmarkSummaries[0].wins, 1);
  assert.equal(projection.benchmarkSummaries[0].losses, 1);
  assert.equal(responseBundle.counts.judgments, 8);
  assert.equal(stub.status, "measured");
  assert.equal(projection.provisionalLeaderboard, null, "A finished panel does not retain an alternative provisional leaderboard.");
  assert.equal(validateWritingSummary(stub), stub);
  const changed = structuredClone(f.run);
  changed.rows[0].score.total = 100;
  assert.throws(() => f.project(changed), /independent panel mean/);
});

test("one is ten points, ten is one hundred, and missing ratings never become zero", async t => {
  const f = await fixture(t, { ratings: answer => Array(10).fill(answer.treatment ? 10 : 1) });
  const { projection } = f.project();
  assert.deepEqual(projection.settings[0].scores, { baseline: 10, skill: 100 });
  assert.equal(projection.settings[0].deltas.skill, 90);
  for (const rating of [0, 11, 5.5, null]) {
    const changed = structuredClone(f.run);
    changed.judging.judges[0].batches[0].evaluations[0].dimensions[0].rating = rating;
    assert.throws(() => f.project(changed), /Writing publication:/, `Reject invalid individual rating ${rating}.`);
  }
});

test("answers remain unabridged with exact whitespace, word counts, provider messages, and output identities", async t => {
  const f = await fixture(t, { models: [CONFIG, SECOND_CONFIG] });
  const { projection, responseBundle } = f.project();
  assert.equal(responseBundle.responses.length, 8);
  assert.equal(new Set(responseBundle.responses.map(publicKey)).size, 8);
  for (const response of responseBundle.responses) {
    const row = f.run.rows.find(candidate => candidate.configurationId === response.configurationId && candidate.caseId === response.caseId && candidate.conditionId === (response.condition === "baseline" ? "clean" : "skill:writing-storytelling"));
    assert.equal(response.outputText, row.outputText);
    assert.ok(f.answers.has(response.outputText));
    assert.equal(response.wordCount, wordCount(row.outputText));
    assert.equal(response.provenance.outputSha256, hash(row.outputText));
    assert.equal(response.benchmarkId, WRITING_BENCHMARK_ID);
    assert.equal(response.trialNumber, 1);
    assert.equal(response.provenance.questionSha256, hash(row.promptText));
    assert.equal(response.provenance.skillSha256, response.condition === "skill" ? f.snapshot.hash : null);
    const setting = projection.settings.find(candidate => candidate.id === response.settingId);
    assert.equal(setting.configurationId, response.configurationId);
    const messages = responseBundle.messageSets.find(messageSet => messageSet.id === response.messageSetId).messages;
    assert.equal(response.messageSetId, hash(JSON.stringify(messages)));
    assert.deepEqual(messages.at(-1), { role: "user", content: row.promptText });
    assert.equal(messages.length, response.condition === "skill" ? 2 : 1);
    if (response.condition === "skill") {
      assert.equal(messages[0].role, setting.provider === "codex" ? "developer" : "system");
      assert.equal(messages[0].fileId, "frozen-skill-root");
    }
  }
  const long = responseBundle.responses.find(response => response.wordCount > 1600);
  assert.ok(long);
  assert.match(long.outputText, /Final sentence remains intact\.$/);
  assert.ok(projection.settings.every(setting => setting.metrics.skill.meanWordCount > setting.metrics.baseline.meanWordCount));
  assert.ok(projection.settings.every(setting => setting.metrics.skill.meanCostUsd === null));
  assert.equal(projection.entries.find(entry => entry.configurationId === SECOND_CONFIG && entry.condition === "skill").rank, 1);
});

test("an incomplete configuration keeps its case evidence but neither arm enters ranking or the corpus mean", async t => {
  const f = await fixture(t, { models: [CONFIG, SECOND_CONFIG], fail: answer => answer.provider === "codex" && answer.caseIndex === 1 && answer.treatment });
  const { projection, responseBundle } = f.project();
  const incomplete = projection.settings.find(setting => setting.configurationId === CONFIG);
  assert.deepEqual(incomplete.scores, { baseline: null, skill: null });
  assert.equal(incomplete.deltas.skill, null);
  assert.ok(projection.entries.filter(entry => entry.configurationId === CONFIG).every(entry => entry.rank === null && entry.score === null && entry.delta === null));
  assert.equal(projection.coverage.responseCount, 7);
  assert.equal(projection.coverage.scoredResponseCount, 6);
  assert.equal(projection.coverage.expectedResponseCount, 8);
  assert.equal(projection.coverage.completedSettingCount, 1);
  assert.equal(projection.coverage.usablePairs, 3);
  assert.equal(projection.coverage.expectedPairs, 4);
  assert.equal(projection.benchmarkSummaries[0].baseline, 80);
  assert.equal(projection.benchmarkSummaries[0].treatment, 90);
  assert.equal(projection.benchmarkSummaries[0].usablePairs, 2);
  const unavailable = responseBundle.responses.find(response => response.status === "unavailable");
  assert.equal(unavailable.score, null);
  assert.equal(unavailable.outputText, "");
  assert.equal(unavailable.wordCount, null);
  assert.deepEqual(unavailable.judgments, []);
  assert.match(unavailable.failureReason, /authentication unavailable/);
  assert.doesNotMatch(JSON.stringify({ projection, responseBundle }), /fixture-private/);
});

test("an explicit provider output-filtering error publishes only a bounded reason and preserves the failed cell", async t => {
  const f = await fixture(t, { models: [SECOND_CONFIG], prepareOnly: true });
  const run = structuredClone(f.run);
  const row = run.rows.find(candidate => candidate.conditionId === "skill:writing-storytelling");
  // Match the retained CLI tail: the original JSON can be truncated at its
  // beginning, while these terminal-result fields are still complete.
  const error = {
    code: "EVAL_AGENT_RUNTIME_FAILED", message: "No final answer; fixture-private-message",
    context: { apiErrorStatus: 400, stdout: 'fixture-private-prefix,"type":"result","is_error":true,"result":"API Error: 400 Output blocked by content filtering policy","session_id":"fixture-private-session"}', stderr: "fixture-private-stderr", sessionId: "fixture-private-session", cliArguments: ["/Users/private-user/workspace"] }
  };
  Object.assign(row, { rowStatus: "error", error, attempts: [{ status: "error", error }] });
  const before = JSON.stringify(run);
  const { projection, responseBundle, stub } = f.project(run);
  const response = responseBundle.responses.find(candidate => candidate.caseId === row.caseId && candidate.condition === "skill");
  const cell = projection.caseResults.find(candidate => candidate.caseId === row.caseId && candidate.condition === "skill");
  const reason = "Provider output filtering blocked the response; no final answer was returned or scored.";
  assert.equal(response.failureReason, reason);
  assert.equal(cell.failureReason, reason);
  assert.equal(response.status, "error");
  assert.equal(cell.status, "error");
  assert.equal(cell.attemptCount, 1);
  assert.equal(response.outputText, "");
  assert.equal(response.score, null);
  assert.equal(cell.exactScore, null);
  assert.equal(response.runtime, null);
  assert.deepEqual(response.judgments, []);
  assert.ok(projection.entries.every(entry => entry.score === null && entry.rank === null));
  assert.equal(stub.coverage.completedSettingCount, 0);
  assert.equal(JSON.stringify(run), before, "Projecting an error does not rewrite its original attempt.");
  assert.doesNotMatch(JSON.stringify({ projection, responseBundle, stub }), /fixture-private|\/Users\/private-user|API Error: 400|"(?:stdout|stderr|session_id|sessionId|cliArguments)"/);
});

test("filtering disclosure requires the explicit terminal record and leaves other error labels unchanged", async t => {
  const f = await fixture(t, { models: [SECOND_CONFIG], prepareOnly: true });
  const terminal = { type: "result", is_error: true, result: "API Error: 400 Output blocked by content filtering policy" };
  const originalError = { code: "EVAL_AGENT_RUNTIME_FAILED", context: { apiErrorStatus: 400, stdout: JSON.stringify(terminal) } };
  const cases = [
    ["missing HTTP 400", row => { row.error.context.apiErrorStatus = null; }, "Generation failed; no answer was scored."],
    ["different HTTP status", row => { row.error.context.apiErrorStatus = 429; }, "Generation failed; no answer was scored."],
    ["missing terminal type", row => { row.error.context.stdout = JSON.stringify({ ...terminal, type: "assistant" }); }, "Generation failed; no answer was scored."],
    ["successful result", row => { row.error.context.stdout = JSON.stringify({ ...terminal, is_error: false }); }, "Generation failed; no answer was scored."],
    ["different API error", row => { row.error.context.stdout = JSON.stringify({ ...terminal, result: "API Error: 400 Invalid request" }); }, "Generation failed; no answer was scored."],
    ["phrase only in diagnostic", row => { row.error.context.stdout = "Output blocked by content filtering policy"; }, "Generation failed; no answer was scored."],
    ["phrase only in message", row => { delete row.error.context.stdout; row.error.message = terminal.result; }, "Generation failed; no answer was scored."],
    ["different runtime error code", row => { row.error.code = "OTHER_ERROR"; }, "Generation failed; no answer was scored."],
    ["different provider", row => { row.provider = "codex"; }, "Generation failed; no answer was scored."],
    ["authentication", row => { row.error = { code: "AUTH_UNAVAILABLE", message: "OAuth session expired" }; }, "Provider authentication unavailable; no answer was scored."],
    ["timeout", row => { row.error = { code: "EVAL_AGENT_TIMEOUT" }; }, "Generation timed out; no answer was scored."],
    ["unavailable", row => { row.rowStatus = "unavailable"; row.error = { code: "MODEL_UNAVAILABLE" }; }, "Requested configuration unavailable; no substitute was used."],
    ["pending", row => { row.rowStatus = "pending"; }, "Generation not completed in this snapshot."],
    ["running", row => { row.rowStatus = "running"; }, "Generation not completed in this snapshot."]
  ];
  for (const [name, change, expected] of cases) await t.test(name, () => {
    const run = structuredClone(f.run);
    const row = run.rows.find(candidate => candidate.conditionId === "skill:writing-storytelling");
    Object.assign(row, { rowStatus: "error", error: structuredClone(originalError) });
    change(row);
    const { responseBundle } = f.project(run);
    const response = responseBundle.responses.find(candidate => candidate.caseId === row.caseId && candidate.condition === "skill");
    assert.equal(response.failureReason, expected);
  });
});

test("a missing independent judge preserves the available judgment without inventing an aggregate", async t => {
  const f = await fixture(t, { missingJudge: true });
  const { projection, responseBundle, stub } = f.project();
  assert.equal(projection.coverage.responseCount, 4);
  assert.equal(projection.coverage.judgmentCount, 4);
  assert.equal(projection.coverage.expectedJudgmentCount, 8);
  assert.equal(projection.coverage.scoredResponseCount, 0);
  assert.ok(responseBundle.responses.every(response => response.status === "unscored" && response.score === null && response.judgments.length === 1 && response.outputText));
  assert.ok(projection.caseResults.every(cell => cell.exactScore === null && Object.values(cell.dimensions).every(rating => rating === null)));
  assert.ok(projection.entries.every(entry => entry.rank === null && entry.score === null));
  assert.equal(stub.status, "unscored");
  assert.equal(stub.leader, undefined);
  const provisional = projection.provisionalLeaderboard;
  assert.deepEqual(provisional.judgeConfigurationIds, [PANEL[0]]);
  assert.deepEqual(provisional.caseIds, projection.cases.map(story => story.id));
  assert.equal(provisional.sourceSha256, projection.scoreBasis.sourceSha256);
  assert.equal(provisional.corpusSha256, projection.methodology.corpusSha256);
  assert.equal(provisional.skillSha256, projection.methodology.skillSha256);
  assert.equal(provisional.rankedSettingCount, 1);
  assert.deepEqual(provisional.entries.map(entry => [entry.condition, entry.exactScore, entry.delta, entry.rank]), [["baseline", 57.5, 0, 1], ["skill", 55, -2.5, 1]]);
  assert.deepEqual(provisional.entries[0].metrics, projection.entries[0].metrics);
  assert.equal(provisional.entries[0].family, projection.entries[0].family);
  assert.equal(provisional.entries[0].cost, null);
  assert.equal(validateWritingPublication(projection, responseBundle), projection);
});

test("provisional ranks share exact ties and keep incomplete story pairs in separate diagnostics", async t => {
  const f = await fixture(t, { models: [CONFIG, SECOND_CONFIG, "claude:claude-opus-5@high"], missingJudge: true,
    fail: answer => answer.provider === "codex" && answer.caseIndex === 1 && answer.treatment });
  const original = JSON.stringify(f.run);
  const { projection } = f.project();
  assert.equal(JSON.stringify(f.run), original, "Projection never alters retained evidence.");
  const provisional = projection.provisionalLeaderboard;
  assert.equal(provisional.rankedSettingCount, 2);
  assert.equal(provisional.expectedSettingCount, 3);
  assert.ok(provisional.entries.filter(entry => entry.eligibleForRank).every(entry => entry.rank === 1));
  assert.ok(provisional.entries.filter(entry => !entry.eligibleForRank).every(entry => entry.score === null && entry.exactScore === null && entry.rank === null && entry.delta === null && entry.metrics === null));
  const diagnostic = provisional.incompleteSettings[0];
  assert.equal(diagnostic.configurationId, CONFIG);
  assert.equal(diagnostic.completedPairCount, 1);
  assert.equal(diagnostic.expectedPairCount, 2);
  assert.deepEqual(diagnostic.includedCaseIds, [projection.cases[0].id]);
  assert.deepEqual(diagnostic.missingCaseIds, [projection.cases[1].id]);
  assert.deepEqual(diagnostic.exactScores, { baseline: 55, skill: 80 });
  assert.equal(diagnostic.exactDelta, 25);
  assert.equal(diagnostic.eligibleForRank, false);
  assert.equal(provisional.summary.exactBaseline, 80);
  assert.equal(provisional.summary.exactTreatment, 90);
  assert.equal(provisional.summary.usablePairs, 4);
  assert.ok(projection.entries.every(entry => entry.score === null && entry.rank === null));
});

test("uneven Fable progress cannot change the fixed Astra provisional scores or ranks", async t => {
  const f = await fixture(t, { models: [CONFIG, SECOND_CONFIG] });
  const partial = structuredClone(f.run);
  const first = partial.judging.judges[1].batches[0];
  partial.judging.judges[1].batches = [first];
  for (const row of partial.rows) row.score = null;
  const withoutFable = structuredClone(partial);
  withoutFable.judging.judges[1].batches = [];
  const one = f.project(partial).projection;
  const none = f.project(withoutFable).projection;
  assert.deepEqual(one.provisionalLeaderboard.entries, none.provisionalLeaderboard.entries);
  assert.deepEqual(one.provisionalLeaderboard.summary, none.provisionalLeaderboard.summary);
  assert.equal(one.coverage.scoredResponseCount, 2);
  assert.equal(none.coverage.scoredResponseCount, 0);
  assert.ok(one.entries.every(entry => entry.score === null && entry.rank === null));
});

test("provisional validation rejects judge mixing, cohort changes, forged diagnostics and premature ranks", async t => {
  const f = await fixture(t, { models: [CONFIG, SECOND_CONFIG], missingJudge: true,
    fail: answer => answer.provider === "codex" && answer.caseIndex === 1 && answer.treatment });
  const built = f.project();
  const changes = [
    ["judge substitution", provisional => { provisional.judgeConfigurationIds = [PANEL[1]]; }],
    ["missing corpus story", provisional => { provisional.caseIds.pop(); }],
    ["different source", provisional => { provisional.sourceSha256 = hash("other checkpoint"); }],
    ["modified score", provisional => { provisional.entries.find(entry => entry.eligibleForRank).exactScore += 1; }],
    ["modified delta", provisional => { provisional.entries.find(entry => entry.eligibleForRank).delta += 1; }],
    ["incomplete rank", provisional => { provisional.entries.find(entry => !entry.eligibleForRank).rank = 1; }],
    ["incomplete score", provisional => { provisional.entries.find(entry => !entry.eligibleForRank).score = 80; }],
    ["modified diagnostic", provisional => { provisional.incompleteSettings[0].exactScores.skill += 1; }],
    ["different diagnostic story", provisional => { provisional.incompleteSettings[0].includedCaseIds = provisional.caseIds; }],
    ["modified summary", provisional => { provisional.summary.exactTreatment += 1; }],
    ["false ranked count", provisional => { provisional.rankedSettingCount += 1; }]
  ];
  for (const [name, change] of changes) await t.test(name, () => {
    const changed = structuredClone(built);
    change(changed.projection.provisionalLeaderboard);
    assert.throws(() => validateWritingPublication(changed.projection, changed.responseBundle), /provisional/);
  });
  const hidden = structuredClone(built);
  hidden.projection.provisionalLeaderboard = null;
  assert.throws(() => validateWritingPublication(hidden.projection, hidden.responseBundle), /provisional/);
});

test("completed but not-yet-judged answers remain available without scores or leaderboard entries", async t => {
  const f = await fixture(t, { generationOnly: true });
  const { projection, responseBundle, stub } = f.project();
  assert.equal(f.agentCalls, 4, "No judge is invoked by generation-only execution.");
  assert.equal(projection.coverage.responseCount, 4);
  assert.equal(projection.coverage.scoredResponseCount, 0);
  assert.equal(projection.coverage.judgmentCount, 0);
  assert.ok(responseBundle.responses.every(response => response.status === "unscored" && response.outputText && response.wordCount > 0 && response.judgments.length === 0 && response.score === null));
  assert.ok(projection.entries.every(entry => entry.score === null && entry.rank === null));
  assert.equal(stub.status, "unscored");
  assert.equal(stub.leader, undefined);
  assert.equal(projection.provisionalLeaderboard, null);
});

test("frozen task, skill, answer, receipt, and judge-source tampering are rejected", async t => {
  const f = await fixture(t);
  f.project();
  const changes = [
    ["corpus source", run => { run.benchmark.definition.cases[0].judgeEvidence.facts[0].statement += " Changed."; }],
    ["question", run => { run.rows[0].promptText += " Include the preferred interpretation."; }],
    ["exact messages", run => { run.rows[0].exactMessages.push({ role: "user", content: "Extra coaching." }); }],
    ["answer", run => { run.rows[0].outputText = run.rows[0].outputText.replace("Choice", "Changed"); }],
    ["answers swapped inside a matched judge batch", run => {
      const pair = run.rows.filter(row => row.caseId === run.benchmark.definition.cases[0].id);
      [pair[0].outputText, pair[1].outputText] = [pair[1].outputText, pair[0].outputText];
      for (const row of pair) row.runtimeReceipt.outputSha256 = row.outputHash = hash(row.outputText);
    }],
    ["fresh session", run => { run.rows[0].runtimeReceipt.freshSession = false; }],
    ["question receipt", run => { run.rows[0].runtimeReceipt.userPromptSha256 = hash("other question"); }],
    ["skill receipt", run => { run.rows.find(row => row.conditionId === "skill:writing-storytelling").runtimeReceipt.skillHash = hash("other skill"); }],
    ["injected root receipt", run => { run.rows.find(row => row.conditionId === "skill:writing-storytelling").runtimeReceipt.instructionHash = hash("other instruction"); }],
    ["requested generator", run => { run.rows[0].runtimeReceipt.requestedConfiguration.model = "gpt-6-astra"; }],
    ["requested effort", run => { run.rows[0].runtimeReceipt.requestedReasoning = "high"; }],
    ["judge prompt", run => { run.judging.judges[0].batches[0].promptText += " Altered rubric."; }],
    ["judge evaluation", run => { run.judging.judges[0].batches[0].evaluations[0].reason += " Altered finding."; }],
    ["judge output", run => { run.judging.judges[0].batches[0].outputText = "{}"; }],
    ["judge receipt model", run => { run.judging.judges[0].batches[0].runtimeReceipt.requestedModel = "other-model"; }],
    ["judge receipt configuration", run => { run.judging.judges[0].batches[0].runtimeReceipt.requestedConfiguration.model = "other-model"; }],
    ["judge receipt effort", run => { run.judging.judges[0].batches[0].runtimeReceipt.requestedReasoning = "low"; }],
    ["judge receipt prompt", run => { run.judging.judges[0].batches[0].runtimeReceipt.userPromptSha256 = hash("other prompt"); }],
    ["judge receipt output", run => { run.judging.judges[0].batches[0].runtimeReceipt.outputSha256 = hash("other output"); }],
    ["judge receipt runtime", run => { run.judging.judges[0].batches[0].runtimeReceipt.runtimeVersion = "old-runtime"; }],
    ["judge receipt skill contamination", run => { run.judging.judges[0].batches[0].runtimeReceipt.skillHash = hash("skill"); }],
    ["judge receipt tool use", run => { run.judging.judges[0].batches[0].runtimeReceipt.nonMessageItemCount = 1; }],
    ["judge canonical provider", run => { run.judging.judges.find(judge => judge.configuration.provider === "claude").batches[0].runtimeReceipt.canonicalModels = ["other-model"]; }],
    ["candidate mapping", run => { run.judging.candidateOrder[0].candidateId = "candidate-forged"; }],
    ["judge identity", run => { run.judging.judges[0].configuration.model = "gpt-5.6-luna"; }]
  ];
  for (const [name, change] of changes) await t.test(name, () => {
    const changed = structuredClone(f.run); change(changed);
    assert.throws(() => f.project(changed), /Writing publication:/);
  });
  for (const change of [snapshot => { snapshot.files[0].contents += " Changed."; }, snapshot => { snapshot.files[0].relativePath = "../outside"; }]) {
    const changed = structuredClone(f.snapshot); change(changed);
    assert.throws(() => f.project(f.run, changed), /snapshot/);
  }
});

test("duplicate generation cells and duplicate or substituted jury seats cannot inflate coverage", async t => {
  const f = await fixture(t);
  f.project();
  const changes = [
    ["duplicate row key", run => { run.rows[1].rowKey = run.rows[0].rowKey; }],
    ["duplicate cell identity", run => { run.rows[1].conditionId = run.rows[0].conditionId; }],
    ["missing planned cell", run => { run.rows.pop(); }],
    ["duplicate panel seat", run => { run.judging.judges.push(structuredClone(run.judging.judges[0])); }],
    ["duplicate evaluation", run => { const batch = run.judging.judges[0].batches[0]; batch.evaluations.push(structuredClone(batch.evaluations[0])); }],
    ["model alias substitution", run => { run.configurations[0].model = "luna"; }]
  ];
  for (const [name, change] of changes) await t.test(name, () => {
    const changed = structuredClone(f.run); change(changed);
    assert.throws(() => f.project(changed), /Writing publication:/);
  });
});

test("public validators reject forged scores, ranks, messages, and retained response identities", async t => {
  const f = await fixture(t);
  const built = f.project();
  const changes = [
    ["case arithmetic", value => { value.projection.caseResults[0].exactScore = 100; }],
    ["dimension means changed while total stays equal", value => {
      value.projection.caseResults[0].dimensions.accuracy += 1;
      value.projection.caseResults[0].dimensions.orientation -= 1;
    }],
    ["corpus arithmetic", value => { value.projection.benchmarkResults[0].score = 100; }],
    ["setting score", value => { value.projection.settings[0].scores.baseline = 100; }],
    ["entry score", value => { value.projection.entries[0].score = 100; }],
    ["entry rank", value => { value.projection.entries[0].rank = 7; }],
    ["answer with unchanged word count", value => { value.responseBundle.responses[0].outputText = value.responseBundle.responses[0].outputText.replace("Choice", "Changed"); }],
    ["output digest", value => { value.responseBundle.responses[0].provenance.outputSha256 = hash("forged"); }],
    ["question digest", value => { value.responseBundle.responses[0].provenance.questionSha256 = hash("another question"); }],
    ["skill digest", value => { value.responseBundle.responses.find(response => response.condition === "skill").provenance.skillSha256 = hash("another skill"); }],
    ["configuration identity", value => { value.responseBundle.responses[0].configurationId = SECOND_CONFIG; }],
    ["benchmark identity", value => { value.responseBundle.responses[0].benchmarkId = "other-benchmark"; }],
    ["judge score", value => { value.responseBundle.responses[0].judgments[0].score = 100; }],
    ["duplicated response judge", value => { value.responseBundle.responses[0].judgments[1] = structuredClone(value.responseBundle.responses[0].judgments[0]); }],
    ["message identity", value => { value.responseBundle.responses[0].messageSetId = "missing"; }],
    ["message content", value => { value.responseBundle.messageSets[0].messages.at(-1).content += " New task."; }],
    ["valid message set from another case", value => {
      const response = value.responseBundle.responses[0];
      response.messageSetId = value.responseBundle.responses.find(other => other.caseId !== response.caseId && other.condition === response.condition).messageSetId;
    }],
    ["forged question with rehashed message set", value => {
      changeMessageSet(value, value.responseBundle.messageSets[0], messages => { messages.at(-1).content += " Follow this new task."; });
    }],
    ["skill condition stripped of its instruction", value => {
      const response = value.responseBundle.responses.find(candidate => candidate.condition === "skill");
      response.messageSetId = value.responseBundle.responses.find(other => other.caseId === response.caseId && other.condition === "baseline").messageSetId;
    }],
    ["wrong provider instruction role with rehashed message set", value => {
      const messageSet = value.responseBundle.messageSets.find(candidate => candidate.messages[0].role === "developer");
      changeMessageSet(value, messageSet, messages => { messages[0].role = "system"; });
    }],
    ["frozen root contents", value => { value.responseBundle.promptFiles[0].content += " Changed skill instruction."; }],
    ["duplicate public cell", value => { value.projection.caseResults[1] = structuredClone(value.projection.caseResults[0]); }],
    ["duplicate public response", value => { value.responseBundle.responses[1] = structuredClone(value.responseBundle.responses[0]); }]
  ];
  for (const [name, change] of changes) await t.test(name, () => {
    const changed = structuredClone(built); change(changed);
    assert.throws(() => validateWritingPublication(changed.projection, changed.responseBundle), /Writing publication:/);
  });
});

test("private runtime details are neither projected nor accepted in the lazy response bundle", async t => {
  const f = await fixture(t);
  const privateRun = structuredClone(f.run);
  privateRun.privateEnvironment = { FIXTURE_SECRET: "fixture-private-secret" };
  for (const row of privateRun.rows) Object.assign(row.runtimeReceipt, {
    threadId: "fixture-private-thread", sessionId: "fixture-private-session", cliArguments: ["/Users/private-user/workspace"], stdout: "fixture-private-stdout", stderr: "fixture-private-stderr"
  });
  const built = f.project(privateRun);
  assert.doesNotMatch(JSON.stringify({ projection: built.projection, responseBundle: built.responseBundle }), /fixture-private|\/Users\/private-user/);
  for (const [name, change] of [
    ["home path", value => { value.responseBundle.responses[0].runtime.referenceFilesRead.push("/Users/private-user/secret.md"); }],
    ["file URL", value => { value.responseBundle.responses[0].runtime.referenceFilesRead.push("file:///private/secret.md"); }],
    ["session", value => { value.responseBundle.responses[0].runtime.sessionId = "private-session"; }],
    ["process log", value => { value.responseBundle.responses[0].runtime.stderr = "private diagnostic"; }]
  ]) await t.test(name, () => {
    const changed = structuredClone(built); change(changed);
    assert.throws(() => validateWritingPublication(changed.projection, changed.responseBundle), /Writing publication:/);
  });
});

test("selection pins both immutable sources and rejects hash drift, missing pins, and traversal", async t => {
  const f = await fixture(t, { prepareOnly: true });
  const pinned = selectedReader(f);
  const built = pinned.build();
  assert.deepEqual(pinned.reads, [WRITING_SELECTION_PATH, pinned.selection.run.path, pinned.selection.skill.path, "benchmarks/storytelling-plot-twists/publication.json", "benchmarks/dungeon-master-adventure-outline/publication.json"]);
  assert.equal(built.projection.scoreBasis.sourceSha256, hash(f.runText));
  assert.ok(built.responseBundle.responses.every(response => response.provenance.sourceSha256 === hash(f.runText)));
  assert.deepEqual(pinned.build(), built, "Identical selected bytes project reproducibly.");
  for (const source of ["run", "skill"]) {
    const changed = selectedReader(f);
    changed.files.set(changed.selection[source].path, `${changed.files.get(changed.selection[source].path)} `);
    assert.throws(changed.build, /immutable source changed/);
    const missing = selectedReader(f);
    delete missing.selection[source].sha256;
    assert.throws(missing.build, /valid SHA-256/);
  }
  for (const unsafe of ["../outside.json", "/tmp/outside.json", "folder/../outside.json", "folder\\outside.json"]) {
    const changed = selectedReader(f); changed.selection.run.path = unsafe;
    assert.throws(changed.build, /unsafe source path/);
  }
  assert.equal(buildWritingPublication({ repoRootDirectory: f.root, readFileSyncImplementation: () => { throw Object.assign(new Error("No selection"), { code: "ENOENT" }); } }), null);
  assert.throws(() => buildWritingPublication({ repoRootDirectory: f.root, readFileSyncImplementation: () => "{}" }), /invalid source selection/);
  const missingSource = selectedReader(f);
  missingSource.files.delete(missingSource.selection.run.path);
  assert.throws(missingSource.build, { code: "ENOENT" }, "A missing selected artifact is an error, not an absent benchmark.");
  const selection = prepareWritingPublicationSource({ repoRootDirectory: f.root, runDirectory: f.outputDirectory });
  assert.deepEqual(prepareWritingPublicationSource({ repoRootDirectory: f.root, runDirectory: f.outputDirectory }), selection);
  assert.equal(fs.readFileSync(path.join(f.root, selection.run.path), "utf8"), f.runText);
  assert.equal(fs.readFileSync(path.join(f.root, selection.skill.path), "utf8"), f.snapshotText);
});

test("lazy serialization escapes HTML and line separators without executing answer text or setting other globals", () => {
  const payload = { text: "</script><script>window.compromised = true</script>\u2028\u2029", nested: { quote: "'\"\\" } };
  for (const name of ["VASIR_WRITING", "VASIR_WRITING_RESPONSES"]) {
    const source = serializeWritingModule(payload, name);
    assert.doesNotMatch(source, /<|\u2028|\u2029/u);
    assert.match(source, /\\u003c\/script>/);
    const context = { window: {} };
    vm.runInNewContext(source, context, { timeout: 1000 });
    assert.deepEqual(JSON.parse(JSON.stringify(context.window[name])), payload);
    assert.deepEqual(Object.keys(context.window), [name]);
    assert.ok(Object.isFrozen(context.window[name]));
    assert.equal(context.window.compromised, undefined);
  }
  assert.throws(() => serializeWritingModule(payload, "VASIR_WRITING;window.compromised=true"), /invalid public module name/);
});

function twistsDefinition() {
  const definition = structuredClone(CORPUS);
  definition.id = PLOT_TWISTS_BENCHMARK_ID;
  definition.title = "Plot twists";
  definition.edition = "storytelling-plot-twists-v1";
  definition.cases = [{ id: "scifi-outline", title: "Science-fiction outline", task: "Create a brief outline of a scifi story with one or more major plot twists" }];
  definition.judging = { panel: ["codex:gpt-6-astra@xhigh", "codex:gpt-5.6-sol@xhigh"], synthesizer: null };
  definition.scoring.dimensions = definition.scoring.dimensions.slice(0, 7).map((dimension, index) => ({ ...dimension, weight: [10, 10, 20, 20, 15, 10, 15][index] }));
  return definition;
}

test("Plot twists retains every trial, weighted ratings and a distinct two-model judge panel", async t => {
  const f = await fixture(t, { definitionOverride: twistsDefinition(), trials: 10,
    ratings: ({ treatment }, judgeIndex) => [1, 2, 3, 4, 5, 6, 7].map(value => value + Number(treatment) + judgeIndex) });
  const { projection, responseBundle } = f.project();
  assert.equal(projection.benchmarks[0].id, PLOT_TWISTS_BENCHMARK_ID);
  assert.equal(projection.benchmarks[0].title, "Plot twists");
  assert.equal(projection.cases.length, 1);
  assert.equal(projection.trialCount, 10);
  assert.equal(projection.caseResults.length, 20);
  assert.equal(projection.trialSummaries.length, 10);
  assert.equal(projection.coverage.completedSettingCount, 1);
  assert.equal(projection.coverage.usablePairs, 10);
  assert.equal(projection.scoreBasis.dimensions.length, 7);
  assert.deepEqual(projection.scoreBasis.judges, twistsDefinition().judging.panel);
  assert.equal(projection.settings[0].deltas.skill, 10);
  assert.equal(new Set(responseBundle.responses.map(response => response.outputText)).size, 20);
  assert.equal(new Set(responseBundle.responses.map(response => `${response.condition}:${response.trialNumber}`)).size, 20);
  for (const response of responseBundle.responses) {
    assert.equal(response.judgments.length, 2);
    const score = response.judgments.reduce((sum, judgment) => sum + projection.scoreBasis.dimensions.reduce((total, dimension) => total + judgment.dimensions[dimension.id].rating * dimension.weight / 10, 0), 0) / 2;
    assert.equal(response.score, score);
  }
  const changed = structuredClone({ projection, responseBundle });
  changed.responseBundle.responses[0].trialNumber = 2;
  assert.throws(() => validateWritingPublication(changed.projection, changed.responseBundle), /Writing publication:/);
});

test("Plot twists ranks use original quarter-point panel means before display rounding", async t => {
  const f = await fixture(t, { definitionOverride: twistsDefinition(), trials: 10,
    ratings: ({ treatment }, judgeIndex) => Array.from({ length: 7 }, (_, index) => 6 + Number(treatment) + Number(judgeIndex === 1 && index === 4)) });
  const { projection } = f.project();
  assert.equal(projection.caseResults[0].exactScore, 60.75);
  assert.equal(projection.caseResults[0].score, 60.8);
  assert.equal(projection.benchmarkResults[0].exactScore, 60.75);
  assert.equal(projection.entries[0].exactScore, 60.75);
});

test("an incomplete Plot twists panel leaves all ten trials visible and excludes both condition ranks", async t => {
  const f = await fixture(t, { definitionOverride: twistsDefinition(), trials: 10, missingJudge: true });
  const { projection, responseBundle } = f.project();
  assert.equal(projection.coverage.responseCount, 20);
  assert.equal(projection.coverage.judgmentCount, 20);
  assert.equal(projection.coverage.completedSettingCount, 0);
  assert.ok(responseBundle.responses.every(response => response.outputText && response.judgments.length === 1));
  assert.ok(projection.entries.every(entry => entry.score === null && entry.rank === null));
  assert.equal(projection.provisionalLeaderboard, undefined, "Core idea provisional scoring never applies to Plot twists.");
});

test("required skill reads preserve precise instructions and redact private event identities", async t => {
  const f = await fixture(t, { definitionOverride: twistsDefinition(), trials: 10, requiredSkillFiles: ["SKILL.md", "references/idea.md"] });
  const { projection, responseBundle } = f.project();
  assert.equal(projection.coverage.completedSettingCount, 1);
  const response = responseBundle.responses.find(response => response.condition === "skill");
  assert.equal(response.runtime.requiredSkillReads.status, "complete");
  assert.ok(response.runtime.requiredSkillReads.files.every(file => file.complete));
  assert.ok(!JSON.stringify(responseBundle).includes("private-tool-event"));
  assert.ok(responseBundle.promptFiles.find(file => file.title.startsWith("references/idea.md · ")).title.includes("mandatory verified tool read before scoring"));
  assert.equal(responseBundle.promptFiles[0].content, createStorytellingSkillInstruction({ skillSnapshot: f.snapshot, skillDirectoryPath: "<frozen-skill-directory>", requiredSkillFiles: ["SKILL.md", "references/idea.md"] }));
  const changed = structuredClone(f.run);
  changed.rows.find(row => row.conditionId === "skill:writing-storytelling").runtimeReceipt.requiredSkillReads.files[0].observedChunks = [];
  assert.throws(() => f.project(changed), /required frozen skill read evidence/);
});

test("missing required reading retains the returned trial answer as unscored protocol evidence", async t => {
  const f = await fixture(t, { definitionOverride: twistsDefinition(), trials: 10, requiredSkillFiles: ["SKILL.md", "references/idea.md"], incompleteRead: true });
  const { projection, responseBundle } = f.project();
  assert.equal(projection.coverage.responseCount, 20);
  assert.equal(projection.coverage.completedSettingCount, 0);
  const responses = responseBundle.responses.filter(response => response.condition === "skill");
  assert.equal(responses.length, 10);
  assert.ok(responses.every(response => response.outputText && response.status === "error" && response.score === null && response.judgments.length === 0 && response.runtime.requiredSkillReads.status === "incomplete"));
  assert.ok(responses.every(response => /Required frozen skill reading/.test(response.failureReason)));
});

test("settled terminal exclusions finish execution without shrinking review denominators or ranking partial configurations", async t => {
  const failedModels = new Set();
  const f = await fixture(t, { definitionOverride: twistsDefinition(), trials: 10,
    models: ["codex:gpt-6-astra@low", "codex:gpt-5.6-sol@low", "codex:gpt-5.6-terra@low", "codex:gpt-5.6-luna@low"],
    requiredSkillFiles: ["SKILL.md", "references/idea.md"], incompleteRead: ({ configuration }) => {
      if (!["gpt-6-astra", "gpt-5.6-terra"].includes(configuration.model) || failedModels.has(configuration.model)) return false;
      failedModels.add(configuration.model);
      return true;
    } });
  assert.equal(f.run.runStatus, "incomplete", "The saved runner status is preserved.");
  const { projection, responseBundle } = f.project();
  assert.equal(projection.coverage.responseCount, 80);
  assert.equal(projection.coverage.validResponseCount, 78);
  assert.equal(projection.coverage.terminalGenerationFailureCount, 2);
  assert.equal(projection.coverage.terminallyExcludedPairCount, 2);
  assert.equal(projection.coverage.terminallyExcludedJudgmentCount, 8);
  assert.equal(projection.coverage.expectedJudgmentCount, 160);
  assert.equal(projection.coverage.judgmentCount, 152);
  assert.equal(projection.coverage.pendingGenerationCount, 0);
  assert.equal(projection.coverage.pendingJudgmentCount, 0);
  assert.equal(projection.coverage.executionComplete, true);
  assert.equal(projection.coverage.executionStatus, "complete-with-exclusions");
  assert.equal(projection.coverage.completedSettingCount, 2);
  assert.equal(projection.coverage.settingCount, 4);
  const excluded = responseBundle.responses.filter(response => response.judgingDisposition === "terminal-excluded");
  assert.equal(excluded.length, 4);
  assert.equal(excluded.filter(response => response.generationDisposition === "complete").length, 2);
  assert.ok(excluded.every(response => response.outputText && response.score === null && response.judgments.length === 0));
  assert.ok(projection.entries.filter(entry => /astra|terra/.test(entry.configurationId)).every(entry => entry.score === null && entry.rank === null));
  const changed = structuredClone(projection);
  changed.coverage.pendingJudgmentCount = 8;
  assert.throws(() => validateWritingPublication(changed, responseBundle), /execution status/);
});

test("operational generation failures and missing eligible judges remain unresolved", async t => {
  const f = await fixture(t, { definitionOverride: twistsDefinition(), trials: 10, missingJudge: true,
    fail: ({ treatment }) => treatment });
  const { projection } = f.project();
  assert.equal(projection.coverage.terminalGenerationFailureCount, 0);
  assert.equal(projection.coverage.terminallyExcludedJudgmentCount, 0);
  assert.equal(projection.coverage.pendingGenerationCount, 10);
  assert.equal(projection.coverage.pendingJudgmentCount, 40);
  assert.equal(projection.coverage.executionComplete, false);
  assert.equal(projection.coverage.executionStatus, "in-progress");
});

test("additive Writing publication keeps Core idea bytes and Plot twists archives independently joined", async t => {
  const core = await fixture(t, { prepareOnly: true });
  const twists = await fixture(t, { definitionOverride: twistsDefinition(), trials: 10, prepareOnly: true });
  const before = core.project();
  const coreSelection = prepareWritingPublicationSource({ repoRootDirectory: core.root, runDirectory: core.outputDirectory });
  write(core.root, WRITING_SELECTION_PATH, coreSelection);
  const directory = path.join(core.root, ".agents/vasir-evals/storytelling-plot-twists/fixture");
  write(core.root, path.relative(core.root, path.join(directory, "run.json")), twists.runText);
  write(core.root, path.relative(core.root, path.join(directory, "skill-snapshot.json")), twists.snapshotText);
  const selection = prepareWritingPublicationSource({ repoRootDirectory: core.root, benchmarkId: PLOT_TWISTS_BENCHMARK_ID, runDirectory: directory });
  write(core.root, writingSelectionPath(PLOT_TWISTS_BENCHMARK_ID), selection);
  const built = buildWritingPublication({ repoRootDirectory: core.root });
  assert.deepEqual(built.projection.benchmarks, before.projection.benchmarks);
  assert.deepEqual(built.projection.entries, before.projection.entries);
  assert.equal(built.projection.benchmarkPublications.length, 1, "Do not duplicate the full default archive in the collection.");
  assert.equal(built.projection.benchmarkPublications[0].benchmarkId, PLOT_TWISTS_BENCHMARK_ID);
  assert.equal(built.responseBundle.benchmarkResponses[0].responseBundle.responses.length, 20);
  assert.deepEqual(built.stub.benchmarkIds, [WRITING_BENCHMARK_ID, PLOT_TWISTS_BENCHMARK_ID]);
  assert.equal(built.stub.collectionCoverage.benchmarkCount, 2);
  assert.equal(built.stub.collectionCoverage.expectedResponseCount, 24);
  assert.equal(validateWritingPublication(built.projection, built.responseBundle), built.projection);
  const changed = structuredClone(built);
  changed.responseBundle.benchmarkResponses[0].benchmarkId = WRITING_BENCHMARK_ID;
  assert.throws(() => validateWritingPublication(changed.projection, changed.responseBundle), /Writing publication:/);
});

test("real corpus and full planned model inventory remain transparently zero-scored without provider calls", async t => {
  // This fixture uses the real 12-case corpus and runner's full default matrix,
  // not whichever mutable publication checkpoint happens to be selected today.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-writing-planned-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, "benchmarks/storytelling-core-idea/benchmark.json", CORPUS);
  write(root, ".agents/skills/writing-storytelling/SKILL.md", "---\nname: writing-storytelling\n---\nTest-only frozen skill for a prepare-only inventory.\n");
  const planned = await runStorytellingBenchmark({ projectRootDirectory: root, currentWorkingDirectory: root, runId: "full-planned-fixture", prepareOnly: true, environmentVariables: {}, agentRunnerImplementation: () => assert.fail("Planning never invokes a provider.") });
  const runText = fs.readFileSync(path.join(planned.outputDirectory, "run.json"), "utf8");
  const run = JSON.parse(runText), snapshot = JSON.parse(fs.readFileSync(path.join(planned.outputDirectory, "skill-snapshot.json"), "utf8"));
  const { projection, responseBundle, stub } = projectWritingRun({ run, snapshot, sourceSha256: hash(runText) });
  assert.equal(projection.cases.length, 12);
  assert.equal(projection.settings.length, 33);
  assert.equal(responseBundle.responses.length, 792);
  assert.equal(projection.coverage.expectedResponseCount, 792);
  assert.equal(projection.coverage.expectedJudgmentCount, 1584);
  assert.equal(projection.coverage.responseCount, 0);
  assert.equal(projection.coverage.scoredResponseCount, 0);
  assert.equal(projection.coverage.judgmentCount, 0);
  assert.ok(projection.entries.every(entry => entry.score === null && entry.rank === null && entry.delta === null));
  assert.ok(responseBundle.responses.every(response => response.status === "pending" && response.outputText === "" && response.wordCount === null && response.runtime === null && response.judgments.length === 0));
  assert.ok(projection.cases.every(story => story.trainingExposure === "unknown" && story.evidence.sources.length));
  assert.equal(projection.benchmarks.length, 1);
  assert.equal(projection.tracks[0].id, "storytelling");
  assert.equal(projection.categoryLeaders.length, 0);
  assert.equal(stub.status, "unscored");
  assert.equal(stub.leader, undefined);
  assert.ok(stub.subsections.every(subsection => subsection.status === "unscored"));
  validateWritingSummary(stub);
  const forged = structuredClone(stub); forged.coverage.scoredResponseCount = 1;
  assert.throws(() => validateWritingSummary(forged), /summary coverage/);
});
