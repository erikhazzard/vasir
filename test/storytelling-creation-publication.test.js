import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { resolveBenchmarkConfiguration } from "../cli/eval/benchmark-models.js";
import { createBenchmarkHash, createBenchmarkGenerationHash, createBenchmarkScoringHash } from "../cli/eval/benchmark-source.js";
import { createStorytellingSkillInstruction, freezeStorytellingSkill, STORYTELLING_RUNTIME_VERSION } from "../cli/eval/storytelling-agent-runtime.js";
import { creationIsolationArguments, STORYTELLING_CREATION_ISOLATION_VERSION } from "../cli/eval/storytelling-creation-runtime.js";
import { createStorytellingCreationJudgePrompt, parseStorytellingCreationJudgment, runStorytellingCreationJudging, STORYTELLING_CREATION_INFORMED_FILES } from "../cli/eval/judge-storytelling-creation.js";
import { runStorytellingBenchmark } from "../cli/eval/run-storytelling-benchmark.js";
import { buildWritingPublication, prepareWritingPublicationSource, serializeWritingModule, validateWritingPublication, validateWritingSummary, writingSelectionPath } from "../cli/eval/writing-publication.js";
import { buildStorytellingCreationPublication, prepareStorytellingCreationPublicationSource, projectStorytellingCreationRun, STORYTELLING_CREATION_BENCHMARK_ID, STORYTELLING_CREATION_SELECTION_PATH, validateStorytellingCreationCreatorReceipt, validateStorytellingCreationPublication } from "../cli/eval/storytelling-creation-publication.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ID = STORYTELLING_CREATION_BENCHMARK_ID;
const hash = value => crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
function write(root, name, value) {
  const target = path.join(root, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : json(value));
}
function generationReceipt(configuration, prompt, output, snapshot, instruction) {
  const codex = configuration.provider === "codex";
  const cliArguments = codex ? ["exec", "--ephemeral", "--ignore-user-config", "--ignore-rules", "--sandbox", "read-only", "--config", 'web_search="disabled"', ...creationIsolationArguments("creator"), "-"] : ["--print", "--safe-mode", "--disable-slash-commands", "--tools", "Read", "--permission-mode", "dontAsk", "--no-session-persistence"];
  return { cli: configuration.provider, requestedConfiguration: configuration, requestedModel: configuration.model, requestedReasoning: configuration.reasoning, freshSession: true, persistedSession: false, workingDirectoryIsolation: "fresh-temporary-directory", cliArguments, creationIsolation: { version: STORYTELLING_CREATION_ISOLATION_VERSION, role: "creator", hostSkillDiscovery: codex ? "explicitly-disabled" : "existing-claude-safe-mode-and-disabled-slash-commands", toolPolicy: "progressive-frozen-skill-files", hiddenProviderInstructionsVerified: false }, ...(codex ? {} : { allowedTools: ["Read"] }), userPromptSha256: hash(prompt), outputSha256: hash(output), skillHash: snapshot?.hash ?? null, instructionHash: instruction ? hash(instruction) : null, referenceAccess: { observedPaths: snapshot ? ["references/core-model.md"] : [] }, canonicalModels: codex ? undefined : [configuration.model], sessionId: `private-generation-session-${hash(output)}`, stdout: "private-provider-stream", durationMs: 500, runtimeVersion: STORYTELLING_RUNTIME_VERSION };
}
function judgeReceipt(configuration, prompt, output) {
  return { ...generationReceipt(configuration, prompt, output), persistedSession: false, workingDirectoryIsolation: "fresh-temporary-directory", nonMessageItemCount: 0, toolCalls: [], cliArguments: ["--ephemeral", "--ignore-user-config", "--ignore-rules", "--output-schema", "private-schema-path", '--config', 'web_search="disabled"', ...creationIsolationArguments("judge")], creationIsolation: { version: STORYTELLING_CREATION_ISOLATION_VERSION, role: "judge", hostSkillDiscovery: "explicitly-disabled" } };
}
// Construct expected normalized metadata for synthetic original final reviews.
// Every projection test still passes through the production source validator.
function refresh(f) {
  const { run, judging, snapshot } = f;
  judging.sourceRun = { runId: run.runId, manifestHash: run.storytelling.manifestHash, runSha256: hash(json(run)), benchmarkHash: run.benchmark.hash, scoringHash: run.benchmark.scoringHash, skillSnapshotHash: snapshot.hash, generationRowsHash: hash(run.rows.map(row => ({ rowKey: row.rowKey, rowStatus: row.rowStatus, outputSha256: typeof row.outputText === "string" ? hash(row.outputText) : null }))) };
  judging.results = judging.pairs.filter(pair => pair.eligible && pair.judgments.every(judge => judge.status === "complete")).flatMap(pair => pair.candidates.map(candidate => {
    const original = pair.judgments.map(judge => ({ profile: judging.profiles.find(profile => profile.id === judge.profileId), evaluation: judge.evaluation.evaluations.find(evaluation => evaluation.candidateId === judge.candidateOrder.find(item => item.rowKey === candidate.rowKey).candidateId) }));
    const totals = original.map(item => item.evaluation.total), score = mean(totals);
    const naiveMean = mean(original.filter(item => item.profile.contextMode === "naive").map(item => item.evaluation.total));
    const informedMean = mean(original.filter(item => item.profile.contextMode === "informed").map(item => item.evaluation.total));
    return { rowKey: candidate.rowKey, outputSha256: candidate.outputSha256, score, naiveMean, informedMean, judgeTotals: original.map(item => ({ profileId: item.profile.id, total: item.evaluation.total })), dimensions: run.benchmark.definition.scoring.dimensions.map(({ id }) => ({ id, rating: mean(original.map(item => item.evaluation.dimensions.find(d => d.id === id).rating)) })), disagreement: { range: Math.max(...totals) - Math.min(...totals), standardDeviation: Math.sqrt(mean(totals.map(total => (total - score) ** 2))), informedMinusNaive: informedMean - naiveMean } };
  }));
  const all = judging.pairs.flatMap(pair => pair.judgments);
  const counts = entries => Object.fromEntries(["pending", "running", "complete", "error", "ineligible"].map(status => [status, entries.filter(entry => entry.status === status).length]));
  judging.summary = { pairCount: judging.pairs.length, eligiblePairCount: judging.pairs.filter(pair => pair.eligible).length, completePairCount: judging.results.length / 2, scoredAnswerCount: judging.results.length, judgmentCounts: counts(all), attemptCount: all.reduce((sum, entry) => sum + entry.attempts.length, 0), failedAttemptCount: all.flatMap(entry => entry.attempts).filter(attempt => ["error", "interrupted"].includes(attempt.status)).length, byProfile: judging.profiles.map(profile => ({ profileId: profile.id, judgmentCounts: counts(all.filter(entry => entry.profileId === profile.id)) })) };
  judging.status = judging.summary.completePairCount === judging.pairs.length ? "complete" : "incomplete";
  return f;
}
let originalPromise;
async function originalFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-creation-publication-source-"));
  try {
    for (const name of STORYTELLING_CREATION_INFORMED_FILES) write(path.join(root, "skill"), name, name === "SKILL.md" ? "---\nname: writing-storytelling\n---\nUse progressive references.\n" : `Frozen test reference ${name}.\n`);
    const snapshot = freezeStorytellingSkill({ skillDirectoryPath: path.join(root, "skill") });
    const definition = JSON.parse(fs.readFileSync(path.join(REPO, `benchmarks/${ID}/benchmark.json`), "utf8"));
    const configurations = definition.coverage.configurationSelectors.map(resolveBenchmarkConfiguration);
    const prompt = definition.cases[0].task;
    const instruction = createStorytellingSkillInstruction({ skillSnapshot: snapshot, skillDirectoryPath: "<frozen-skill-directory>", requiredSkillFiles: [] });
    const run = { kind: "benchmark", runId: "synthetic-frozen-creation", benchmark: { definition, hash: createBenchmarkHash(definition), generationHash: createBenchmarkGenerationHash(definition), scoringHash: createBenchmarkScoringHash(definition) }, configurations, conditions: [{ id: "clean", type: "clean", hash: hash("clean") }, { id: "skill:writing-storytelling", type: "skill", hash: snapshot.hash }], treatment: { id: "skill:writing-storytelling", hash: snapshot.hash }, generation: { trialCount: 3, orderSeed: "test-frozen" }, storytelling: { manifestHash: hash("synthetic-manifest"), runnerVersion: "storytelling-core-idea-v1", runtimeVersion: STORYTELLING_RUNTIME_VERSION }, rows: [] };
    for (const configuration of configurations) for (const trialNumber of [1, 2, 3]) for (const condition of run.conditions) {
      const rowKey = `${configuration.id}::magic-discovery::trial-${trialNumber}::${condition.id}`;
      const outputText = `Synopsis ${rowKey}:\n\nMara chooses  to free the river—世界, café, 🌍.\n"Magic" changes who can remember.\n`;
      run.rows.push({ rowKey, configurationId: configuration.id, provider: configuration.provider, model: configuration.model, reasoning: configuration.reasoning, caseId: "magic-discovery", trialNumber, conditionId: condition.id, rowStatus: "complete", promptText: prompt, exactMessages: [{ role: "user", content: prompt }], outputText, outputHash: hash(outputText), runtimeReceipt: generationReceipt(configuration, prompt, outputText, condition.type === "skill" ? snapshot : null, condition.type === "skill" ? instruction : null), usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 }, durationMs: 1250, attempts: [] });
    }
    write(root, "run.json", run); write(root, "skill-snapshot.json", snapshot); write(root, "manifest.json", { runId: run.runId, manifestHash: run.storytelling.manifestHash });
    const { judging } = await runStorytellingCreationJudging({ runDirectory: root, prepareOnly: true });
    const contextSnapshot = JSON.parse(fs.readFileSync(path.join(root, "creation-judge-context.json"), "utf8"));
    for (const pair of judging.pairs) for (const [seat, judge] of pair.judgments.entries()) {
      const profile = judging.profiles[seat];
      const payload = { evaluations: judge.candidateOrder.map(candidate => {
        const row = run.rows.find(row => row.rowKey === candidate.rowKey);
        const rating = (row.conditionId === "clean" ? 2 : 3 + row.trialNumber) + (seat % 2) + Math.floor(seat / 2);
        return { candidateId: candidate.candidateId, dimensions: definition.scoring.dimensions.map(d => ({ id: d.id, rating, evidence: `Mara's choice shapes the ${d.id} outcome.` })), review: `Exact final ${profile.contextMode} review: Mara frees the river.\nThe ending follows her costly choice.` };
      }), winner: null };
      judge.promptText = createStorytellingCreationJudgePrompt({ run, pair, judgment: judge, profile, contextSnapshot }); judge.promptSha256 = hash(judge.promptText);
      judge.outputText = JSON.stringify(payload); judge.outputSha256 = hash(judge.outputText); judge.evaluation = parseStorytellingCreationJudgment(judge.outputText, definition.scoring); judge.status = "complete";
      judge.runtimeReceipt = judgeReceipt(profile.configuration, judge.promptText, judge.outputText); judge.durationMs = 2200; judge.usage = { inputTokens: 500, outputTokens: 100, totalTokens: 600 };
      judge.attempts = [{ status: "complete", promptSha256: judge.promptSha256, contextSha256: profile.contextSha256, outputText: judge.outputText, outputSha256: judge.outputSha256, runtimeReceipt: judge.runtimeReceipt, retryable: false }];
    }
    return refresh({ run, snapshot, judging, contextSnapshot });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
async function fixture(t) {
  originalPromise ??= originalFixture();
  const f = structuredClone(await originalPromise);
  f.root = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-creation-publication-"));
  t.after(() => fs.rmSync(f.root, { recursive: true, force: true }));
  f.project = () => projectStorytellingCreationRun({ run: f.run, snapshot: f.snapshot, judging: f.judging, contextSnapshot: f.contextSnapshot, sourceSha256: hash(json(f.run)), judgingSha256: hash(json(f.judging)), skillSnapshotSha256: hash(json(f.snapshot)), contextSha256: hash(json(f.contextSnapshot)) });
  f.save = () => {
    const directory = path.join(f.root, ".agents", "vasir-evals", ID, "synthetic");
    for (const [name, value] of [["run.json", f.run], ["skill-snapshot.json", f.snapshot], ["creation-judging.json", f.judging], ["creation-judge-context.json", f.contextSnapshot]]) write(directory, name, value);
    return directory;
  };
  return f;
}

test("creation publishes all 198 exact answers and 792 crossed-context reviews", async t => {
  const f = await fixture(t), result = f.project();
  const { projection, responseBundle } = result;
  assert.equal(projection.cases.length, 1); assert.equal(projection.trialCount, 3);
  assert.equal(projection.caseResults.length, 198); assert.equal(responseBundle.judgeRequests.length, 396);
  assert.equal(projection.coverage.expectedJudgmentCount, 792); assert.equal(projection.coverage.judgmentCount, 792);
  assert.equal(projection.coverage.completedSettingCount, 33); assert.equal(projection.coverage.executionStatus, "complete");
  assert.equal(responseBundle.responses[0].outputText, f.run.rows[0].outputText);
  assert.equal(responseBundle.responses[0].characterCount, Array.from(f.run.rows[0].outputText).length);
  assert.deepEqual(projection.settings[0].scores, { baseline: 30, skill: 60 });
  assert.deepEqual(projection.settings[0].contextScores, { baseline: { naive: 25, informed: 35 }, skill: { naive: 55, informed: 65 } });
  assert.deepEqual(projection.trialEffects[0].trials.map(trial => trial.delta), [20, 30, 40]);
  assert.equal(projection.trialEffects[0].sampleStandardDeviation, 10); assert.equal(projection.trialEffects[0].range, 20);
  assert.equal(projection.entries.find(entry => entry.condition === "skill").exactScore, 60);
  assert.equal(new Set(responseBundle.judgeProfiles.map(profile => profile.id)).size, 4);
  assert.equal(new Set(responseBundle.judgeProfiles.map(profile => profile.configurationId)).size, 2);
  assert.equal(responseBundle.promptFiles.find(file => file.id === "frozen-informed-judge-context").content, f.contextSnapshot.text);
  assert.ok(responseBundle.judgePromptSegments.length < 10);
  assert.ok(!JSON.stringify(result).includes("private-generation-session")); assert.ok(!JSON.stringify(result).includes("private-provider-stream"));
  assert.equal(responseBundle.judgeRequests[0].outputText, f.judging.pairs[0].judgments[0].outputText);
  assert.equal(Object.keys(result.sourcePins).length, 4);
  assert.deepEqual(responseBundle.responses[0].runtime.creationIsolation, { version: STORYTELLING_CREATION_ISOLATION_VERSION, role: "creator", hostSkillDiscovery: "explicitly-disabled", toolPolicy: "progressive-frozen-skill-files", hiddenProviderInstructionsVerified: false });
  assert.ok(!Object.hasOwn(responseBundle.responses[0].runtime, "cliArguments"));
});

test("the compact creation wire archive restores the full validated 198-answer publication", async t => {
  const f = await fixture(t), { projection, responseBundle } = f.project();
  const source = serializeWritingModule(responseBundle, "VASIR_WRITING_CREATION_RESPONSES");
  const context = vm.createContext({ window: {} }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(source, context, { timeout: 2000 });
  const restored = JSON.parse(JSON.stringify(context.window.VASIR_WRITING_CREATION_RESPONSES));
  assert.deepEqual(restored, responseBundle);
  assert.doesNotThrow(() => validateStorytellingCreationPublication(projection, restored));
  assert.equal(restored.responses.length, 198);
  assert.equal(restored.responses.reduce((sum, response) => sum + response.judgments.length, 0), 792);
  assert.equal(restored.judgeRequests.length, 396);
});

test("creator publication rejects dropped isolation flags, wrong roles, and reused sessions", async t => {
  for (const [name, mutate] of [
    ["missing Codex host-skill override", f => { const args = f.run.rows[0].runtimeReceipt.cliArguments; args.splice(args.indexOf("--enable"), 2); }],
    ["wrong creator role", f => { f.run.rows[0].runtimeReceipt.creationIsolation.role = "judge"; }],
    ["reused session", f => { f.run.rows[1].runtimeReceipt.sessionId = f.run.rows[0].runtimeReceipt.sessionId; }],
    ["missing Claude safe mode", f => { const row = f.run.rows.find(row => row.provider === "claude"); row.runtimeReceipt.cliArguments = row.runtimeReceipt.cliArguments.filter(arg => arg !== "--safe-mode"); }]
  ]) await t.test(name, async child => {
    const f = await fixture(child); mutate(f); refresh(f);
    assert.throws(f.project, /creator isolation/);
  });
});

test("creator receipt validation checks both provider contracts without restricting Ultra collaboration", async t => {
  const f = await fixture(t), runtimePolicy = f.run.benchmark.definition.runtimePolicy;
  for (const provider of ["codex", "claude"]) {
    const row = f.run.rows.find(row => row.provider === provider && (provider !== "codex" || row.reasoning === "ultra"));
    const receipt = structuredClone(row.runtimeReceipt);
    if (provider === "codex") receipt.itemTypeCounts = { collab_tool_call: 4, command_execution: 3 };
    assert.doesNotThrow(() => validateStorytellingCreationCreatorReceipt({ runtimeReceipt: receipt, configuration: f.run.configurations.find(config => config.id === row.configurationId), runtimePolicy }));
    const mutations = provider === "codex" ? [
      r => { r.cliArguments = r.cliArguments.filter(arg => arg !== "--ephemeral"); },
      r => { r.cliArguments[r.cliArguments.indexOf("--sandbox") + 1] = "danger-full-access"; },
      r => { r.cliArguments.splice(-1, 0, "--config", 'web_search="live"'); },
      r => { r.cliArguments.splice(-1, 0, "--config", "project_doc_max_bytes=20000"); },
      r => { r.cliArguments.splice(-1, 0, "--enable", "skill_search"); },
      r => { r.cliArguments.splice(-1, 0, "--disable", "skip_host_skill_discovery"); }
    ] : [
      r => { r.cliArguments = r.cliArguments.filter(arg => arg !== "--disable-slash-commands"); },
      r => { r.cliArguments = r.cliArguments.filter(arg => arg !== "--no-session-persistence"); },
      r => { r.cliArguments[r.cliArguments.indexOf("--tools") + 1] = "Read,Bash"; },
      r => { r.allowedTools.push("Bash"); },
      r => { r.cliArguments.push("--resume", "private-session"); }
    ];
    for (const mutate of [...mutations, r => { r.creationIsolation.version = "changed"; }, r => { r.creationIsolation.toolPolicy = "unrestricted"; }, r => { r.creationIsolation.hostSkillDiscovery = "enabled"; }, r => { r.persistedSession = true; }]) {
      const changed = structuredClone(receipt); mutate(changed);
      assert.throws(() => validateStorytellingCreationCreatorReceipt({ runtimeReceipt: changed, configuration: f.run.configurations.find(config => config.id === row.configurationId), runtimePolicy }), /creator isolation/);
    }
  }
});

test("one missing review preserves completed reviews but prevents both three-trial ranks", async t => {
  const f = await fixture(t), judge = f.judging.pairs[0].judgments[3];
  judge.status = "pending"; judge.evaluation = null; judge.outputText = null; judge.outputSha256 = null; judge.runtimeReceipt = null; judge.attempts = [];
  refresh(f);
  const { projection, responseBundle } = f.project();
  assert.equal(projection.coverage.judgmentCount, 790); assert.equal(projection.coverage.scoredResponseCount, 196);
  assert.equal(projection.coverage.completedSettingCount, 32);
  assert.deepEqual(projection.settings[0].scores, { baseline: null, skill: null });
  assert.ok(projection.entries.filter(entry => entry.settingId === projection.settings[0].id).every(entry => entry.rank === null));
  assert.equal(projection.trialEffects[0].mean, null);
  assert.equal(responseBundle.responses[0].judgments.length, 3); assert.ok(responseBundle.responses[0].outputText);
  assert.equal(projection.caseResults[0].contextScores.naive, 25); assert.equal(projection.caseResults[0].contextScores.informed, null);
});

test("terminal creator failures remain visible, are not zero-scored, and exclude their pair", async t => {
  const f = await fixture(t), pair = f.judging.pairs[0], row = f.run.rows.find(row => row.rowKey === pair.candidates[0].rowKey);
  Object.assign(row, { rowStatus: "error", outputText: null, outputHash: null, runtimeReceipt: null, error: { code: "EVAL_AGENT_RUNTIME_FAILED", context: { stdout: "private-process-output", apiKey: "private-credential" } } });
  pair.eligible = false; pair.exclusionReason = "incomplete-original-generation-pair";
  pair.candidates[0].outputSha256 = null;
  for (const judge of pair.judgments) {
    judge.status = "ineligible"; judge.promptText = null; judge.promptSha256 = null; judge.outputText = null; judge.outputSha256 = null; judge.evaluation = null; judge.runtimeReceipt = null; judge.attempts = [];
    judge.candidateOrder.find(candidate => candidate.rowKey === row.rowKey).outputSha256 = null;
  }
  refresh(f);
  const { projection, responseBundle } = f.project();
  assert.equal(projection.coverage.responseCount, 197); assert.equal(projection.coverage.expectedResponseCount, 198);
  assert.equal(projection.coverage.judgmentCount, 784); assert.equal(projection.coverage.expectedJudgmentCount, 792);
  assert.equal(projection.coverage.terminallyExcludedJudgmentCount, 8); assert.equal(projection.coverage.executionStatus, "complete-with-exclusions");
  assert.equal(projection.coverage.completedSettingCount, 32); assert.equal(projection.caseResults[0].exactScore, null);
  assert.equal(responseBundle.responses[0].outputText, ""); assert.equal(responseBundle.responses[1].judgments.length, 0);
  assert.ok(!JSON.stringify({ projection, responseBundle }).includes("private-credential"));
});

test("a terminal invalid judge final remains archived without a score or replacement", async t => {
  const f = await fixture(t), judge = f.judging.pairs[0].judgments[0];
  judge.status = "error"; judge.evaluation = null; judge.outputText = "Original invalid final review with no rubric JSON."; judge.outputSha256 = hash(judge.outputText);
  judge.runtimeReceipt.outputSha256 = judge.outputSha256;
  judge.attempts[0] = { ...judge.attempts[0], status: "error", outputText: judge.outputText, outputSha256: judge.outputSha256, runtimeReceipt: judge.runtimeReceipt, retryable: false };
  refresh(f);
  const { projection, responseBundle } = f.project();
  assert.equal(projection.coverage.terminalJudgmentFailureCount, 2);
  assert.equal(projection.coverage.executionStatus, "complete-with-exclusions");
  assert.equal(projection.coverage.pendingJudgmentCount, 0);
  assert.equal(projection.settings[0].scores.baseline, null);
  assert.equal(responseBundle.judgeRequests[0].outputText, judge.outputText);
  assert.equal(responseBundle.responses[0].judgments.length, 3);
});

test("frozen joins reject changed answers, original ratings, profiles, context, and inventory", async t => {
  for (const [name, mutate] of [
    ["answer", f => { f.run.rows[0].outputText += "Changed"; }],
    ["original review", f => { f.judging.pairs[0].judgments[0].outputText += " "; }],
    ["normalized rating", f => { f.judging.pairs[0].judgments[0].evaluation.evaluations[0].dimensions[0].rating = 10; }],
    ["profile identity", f => { f.judging.profiles[0].configuration.reasoning = "high"; }],
    ["context", f => { f.contextSnapshot.text += "Changed"; }],
    ["run hash", f => { f.judging.sourceRun.runSha256 = hash("wrong"); }],
    ["trial inventory", f => { f.run.rows[2] = structuredClone(f.run.rows[0]); }],
    ["generator substitution", f => { f.run.configurations[0].reasoning = "none"; }]
  ]) await t.test(name, async child => { const f = await fixture(child); mutate(f); assert.throws(f.project); });
});

test("public validation rejects altered scores, evidence, rankings, prompts and private fields", async t => {
  const f = await fixture(t), source = f.project();
  for (const [name, mutate] of [
    ["cell score", r => { r.projection.caseResults[0].score = 99; }],
    ["rank", r => { r.projection.entries[0].rank = 99; }],
    ["aggregate", r => { r.projection.entries[0].exactScore = 99; }],
    ["review", r => { r.responseBundle.responses[0].judgments[0].rationale = "Changed"; }],
    ["evidence", r => { r.responseBundle.responses[0].judgments[0].dimensions["discovery-premise"].evidence = "Changed"; }],
    ["context means", r => { r.projection.contextSummaries.naive.delta = 99; }],
    ["three trial stats", r => { r.projection.trialEffects[0].sampleStandardDeviation = 0; }],
    ["exact answer", r => { r.responseBundle.responses[0].outputText += "Changed"; }],
    ["original review JSON", r => { r.responseBundle.judgeRequests[0].outputText += " "; }],
    ["original judge prompt", r => { r.responseBundle.judgePromptSegments[0].content += "Changed"; }],
    ["public isolation claim", r => { r.responseBundle.responses[0].runtime.creationIsolation.hiddenProviderInstructionsVerified = true; }],
    ["private metadata", r => { r.responseBundle.responses[0].runtime.sessionId = "private"; }]
  ]) await t.test(name, () => { const result = structuredClone(source); mutate(result); assert.throws(() => validateStorytellingCreationPublication(result.projection, result.responseBundle)); });
});

test("immutable publication archives pin generation, skill, judges, and context exact bytes", async t => {
  const f = await fixture(t), directory = f.save();
  write(directory, "run.lock", "active");
  assert.throws(() => prepareStorytellingCreationPublicationSource({ repoRootDirectory: f.root, runDirectory: directory }), /active run or judge writer/);
  fs.unlinkSync(path.join(directory, "run.lock"));
  const selection = prepareStorytellingCreationPublicationSource({ repoRootDirectory: f.root, runDirectory: directory });
  write(f.root, STORYTELLING_CREATION_SELECTION_PATH, selection);
  assert.equal(buildStorytellingCreationPublication({ repoRootDirectory: f.root }).projection.coverage.scoredResponseCount, 198);
  for (const field of ["run", "skill", "judging", "judgeContext"]) assert.equal(hash(fs.readFileSync(path.join(f.root, selection[field].path), "utf8")), selection[field].sha256);
  const target = path.join(f.root, selection.judging.path), original = fs.readFileSync(target, "utf8");
  fs.appendFileSync(target, " ");
  assert.throws(() => buildStorytellingCreationPublication({ repoRootDirectory: f.root }), /immutable source changed/);
  fs.writeFileSync(target, original);
  selection.judgeContext.path = "../outside.json"; write(f.root, STORYTELLING_CREATION_SELECTION_PATH, selection);
  assert.throws(() => buildStorytellingCreationPublication({ repoRootDirectory: f.root }), /unsafe source path/);
  assert.equal(buildStorytellingCreationPublication({ repoRootDirectory: path.join(f.root, "absent") }), null);
});

test("creation selected alone cannot replace the prior Writing collection default", async t => {
  const f = await fixture(t);
  write(f.root, writingSelectionPath(ID), prepareWritingPublicationSource({ repoRootDirectory: f.root, runDirectory: f.save(), benchmarkId: ID }));
  assert.equal(buildStorytellingCreationPublication({ repoRootDirectory: f.root }).projection.coverage.scoredResponseCount, 198);
  assert.throws(() => buildWritingPublication({ repoRootDirectory: f.root }), /Creation publication is additive; preserve an existing Writing benchmark as the collection default/);
});

test("creation is an additive Storytelling collection child preserving the original projection", async t => {
  const f = await fixture(t);
  const core = JSON.parse(fs.readFileSync(path.join(REPO, "benchmarks/storytelling-core-idea/benchmark.json"), "utf8"));
  core.cases = core.cases.slice(0, 1);
  write(f.root, "benchmarks/storytelling-core-idea/benchmark.json", core);
  for (const file of f.snapshot.files) write(f.root, `.agents/skills/writing-storytelling/${file.relativePath}`, file.contents);
  await runStorytellingBenchmark({ projectRootDirectory: f.root, currentWorkingDirectory: f.root, requestedModelArguments: ["codex:gpt-5.6-luna@low"], runId: "core-original", seed: "test", prepareOnly: true, environmentVariables: {} });
  const coreDirectory = path.join(f.root, ".agents/vasir-evals/storytelling-core-idea/core-original");
  write(f.root, writingSelectionPath("storytelling-core-idea"), prepareWritingPublicationSource({ repoRootDirectory: f.root, runDirectory: coreDirectory }));
  const before = buildWritingPublication({ repoRootDirectory: f.root });
  write(f.root, writingSelectionPath(ID), prepareWritingPublicationSource({ repoRootDirectory: f.root, runDirectory: f.save(), benchmarkId: ID }));
  const after = buildWritingPublication({ repoRootDirectory: f.root });
  const { benchmarkPublications, collectionCoverage, ...defaultProjection } = after.projection;
  const { benchmarkResponses, ...defaultResponses } = after.responseBundle;
  assert.deepEqual(defaultProjection, before.projection); assert.deepEqual(defaultResponses, before.responseBundle);
  assert.equal(benchmarkPublications.length, 1); assert.equal(benchmarkPublications[0].benchmarkId, ID);
  assert.equal(benchmarkResponses[0].responseBundle.responses.length, 198);
  assert.equal(collectionCoverage.benchmarkCount, 2); assert.equal(collectionCoverage.expectedResponseCount, 200);
  assert.deepEqual(after.stub.benchmarkIds, ["storytelling-core-idea", ID]);
  assert.equal(after.stub.subsections.filter(section => section.id === "storytelling").length, 1);
  assert.notEqual(after.basisSha256, before.basisSha256);
  validateWritingSummary(after.stub); validateWritingPublication(after.projection, after.responseBundle);
});
