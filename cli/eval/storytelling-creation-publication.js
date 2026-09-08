import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { isBenchmarkAgentRuntimeReceiptCompatible } from "./agent-runtime.js";
import { createBenchmarkHash, createBenchmarkGenerationHash, createBenchmarkScoringHash } from "./benchmark-source.js";
import { createStorytellingSkillInstruction, STORYTELLING_RUNTIME_VERSION, validateStorytellingSkillSnapshot } from "./storytelling-agent-runtime.js";
import { STORYTELLING_CREATION_ISOLATION_VERSION } from "./storytelling-creation-runtime.js";
import { parseStorytellingCreationJudgment, validateStorytellingCreationJudging } from "./judge-storytelling-creation.js";

export const STORYTELLING_CREATION_BENCHMARK_ID = "storytelling-magic-discovery";
export const STORYTELLING_CREATION_SELECTION_PATH = `benchmarks/${STORYTELLING_CREATION_BENCHMARK_ID}/publication.json`;
const ID = STORYTELLING_CREATION_BENCHMARK_ID;
const HASH = /^[a-f0-9]{64}$/u;
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const finite = value => typeof value === "number" && Number.isFinite(value);
const mean = values => values.length && values.every(finite) ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const round = value => finite(value) ? Math.round((value + Number.EPSILON) * 10) / 10 : null;
const words = value => value.trim() ? value.trim().split(/\s+/u).length : 0;
const key = cell => `${cell.settingId}:${cell.caseId}:${cell.trialNumber}:${cell.condition}`;
const pairKey = cell => `${cell.settingId}:${cell.caseId}:${cell.trialNumber}`;
const MODES = ["naive", "informed"];
const SEATS = ["astra-xhigh-naive", "astra-xhigh-informed", "sol-xhigh-naive", "sol-xhigh-informed"];
const MODELS = {
  "gpt-6-astra": "GPT-6 Astra", "gpt-5.6-sol": "GPT-5.6 Sol", "gpt-5.6-terra": "GPT-5.6 Terra", "gpt-5.6-luna": "GPT-5.6 Luna",
  "claude-fable-5-1": "Claude Fable 5.1", "claude-opus-5": "Claude Opus 5"
};
const INVENTORY = Object.keys(MODELS).flatMap(model => (["low", "medium", "high", "xhigh", "max", ...(["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra"].includes(model) ? ["ultra"] : [])]).map(reasoning => `${model.startsWith("claude") ? "claude" : "codex"}:${model}@${reasoning}`));
const CONDITIONS = [
  { id: "baseline", sourceId: "clean", short: "Plain", label: "Plain answer", color: "#72777f", shape: "circle" },
  { id: "skill", sourceId: "skill:writing-storytelling", short: "Storytelling", label: "Storytelling skill", color: "#1f6fff", shape: "square" }
];
const DIMENSIONS = ["discovery-premise", "magic-coherence", "desire-and-stakes", "character-agency", "causal-progression", "resistance-and-relationships", "originality-and-specificity", "thematic-consequences", "earned-ending", "synopsis-clarity"];
const USAGE = ["inputTokens", "cachedInputTokens", "cacheWriteInputTokens", "cacheCreationInputTokens", "cacheReadInputTokens", "outputTokens", "reasoningOutputTokens", "totalTokens"];
const publicUsage = usage => Object.fromEntries(USAGE.map(field => [field, finite(usage?.[field]) && usage[field] >= 0 ? usage[field] : null]));
function requireEvidence(condition, message) {
  if (!condition) throw new Error(`Storytelling creation publication: ${message}`);
}
function publicOnly(value) {
  requireEvidence(!/\/Users\/|file:\/\/|"(?:threadId|sessionId|session_id|cliArguments|stdout|stderr|access_token|refresh_token|apiKey|hiddenReasoning)"/u.test(JSON.stringify(value)), "private runtime details reached public evidence.");
}
function safeRelative(value) {
  requireEvidence(typeof value === "string" && value.length && !path.isAbsolute(value) && !value.includes("\\") && value.split("/").every(part => part && part !== "." && part !== ".."), "unsafe source path.");
  return value;
}
function readPinned(root, pin, reader) {
  requireEvidence(HASH.test(pin?.sha256 ?? ""), "source fingerprint missing.");
  const text = reader(path.join(root, safeRelative(pin.path)), "utf8");
  requireEvidence(hash(text) === pin.sha256, "selected immutable source changed.");
  return JSON.parse(text);
}
function metrics(cells) {
  return { ...Object.fromEntries(["latencyMs", "inputTokens", "outputTokens", "totalTokens", "wordCount"].map(field => [`mean${field[0].toUpperCase()}${field.slice(1)}`, round(mean(cells.map(cell => cell[field])))])), meanCostUsd: null, costCoverage: "not-comparable" };
}
function identity(configuration) {
  requireEvidence(INVENTORY.includes(configuration.id) && configuration.id === `${configuration.provider}:${configuration.model}@${configuration.reasoning}`, "substituted generator identity.");
  return { id: configuration.id.replace(/[^a-zA-Z0-9-]/gu, "-"), configurationId: configuration.id, modelId: `${configuration.provider}:${configuration.model}`, provider: configuration.provider, family: MODELS[configuration.model], reasoning: configuration.reasoning, label: `${MODELS[configuration.model]} · ${configuration.reasoning}` };
}

/** Validate recorded creator controls without exposing argv or session identity. */
export function validateStorytellingCreationCreatorReceipt({ runtimeReceipt: receipt, configuration, runtimePolicy }) {
  const isolation = receipt?.creationIsolation, args = receipt?.cliArguments;
  const valid = (condition, message) => requireEvidence(condition, `creator isolation ${message}`);
  valid(runtimePolicy?.creationIsolation === STORYTELLING_CREATION_ISOLATION_VERSION && runtimePolicy.runtimeVersion === STORYTELLING_RUNTIME_VERSION
    && runtimePolicy.codexCommonOverrides?.skip_host_skill_discovery === true && runtimePolicy.codexCommonOverrides.skill_search === false && runtimePolicy.codexCommonOverrides.project_doc_max_bytes === 0, "differs from the frozen runtime policy.");
  valid(isolation?.version === runtimePolicy.creationIsolation && isolation.role === "creator" && isolation.toolPolicy === "progressive-frozen-skill-files" && isolation.hiddenProviderInstructionsVerified === false, "version, role, tool policy, or verification claim changed.");
  valid(receipt.cli === configuration.provider && receipt.runtimeVersion === runtimePolicy.runtimeVersion && receipt.freshSession === true && receipt.persistedSession === false && receipt.workingDirectoryIsolation === "fresh-temporary-directory", "requires a fresh non-persisted temporary-directory invocation.");
  valid(Array.isArray(args) && args.length > 0 && args.every(arg => typeof arg === "string"), "actual CLI arguments are missing.");
  const values = flag => args.flatMap((arg, index) => arg === flag ? [args[index + 1]] : arg.startsWith(`${flag}=`) ? [arg.slice(flag.length + 1)] : []);
  const onlyValue = (flag, expected) => values(flag).length > 0 && values(flag).every(value => value === expected);
  const noFlags = flags => !args.some(arg => flags.some(flag => arg === flag || arg.startsWith(`${flag}=`)));
  valid(noFlags(["--resume", "--continue", "--session-id", "--fork-session", "--resume-session-at", "-r"]), "cannot resume, continue, or reuse an explicit session.");
  if (configuration.provider === "codex") {
    valid(isolation.hostSkillDiscovery === "explicitly-disabled" && args[0] === "exec" && args.at(-1) === "-", "Codex host discovery or fresh exec shape changed.");
    valid(["--ephemeral", "--ignore-user-config", "--ignore-rules"].every(flag => args.includes(flag)) && onlyValue("--sandbox", "read-only"), "Codex fresh-session flags or read-only sandbox are missing or overridden.");
    valid(values("--enable").includes("skip_host_skill_discovery") && !values("--disable").some(value => value?.split(",").includes("skip_host_skill_discovery"))
      && values("--disable").includes("skill_search") && !values("--enable").some(value => value?.split(",").includes("skill_search")), "Codex host-skill flags are missing or contradicted.");
    const configs = [...values("--config"), ...values("-c")];
    const configValues = name => configs.filter(value => typeof value === "string" && value.split("=", 1)[0].trim() === name).map(value => value.slice(value.indexOf("=") + 1).trim());
    const configEquals = (name, expected, required = true) => (!required || configValues(name).length > 0) && configValues(name).every(value => expected.includes(value));
    valid(configEquals("project_doc_max_bytes", [String(runtimePolicy.codexCommonOverrides.project_doc_max_bytes)]) && configEquals("web_search", ['"disabled"']), "Codex project-document or web-search overrides are missing or contradicted.");
    valid(configEquals("features.skip_host_skill_discovery", ["true"], false) && configEquals("features.skill_search", ["false"], false)
      && configEquals("sandbox_mode", ['"read-only"'], false) && noFlags(["--dangerously-bypass-approvals-and-sandbox", "--yolo", "--full-auto", "--search"]), "Codex controls are overridden by conflicting CLI options.");
  } else {
    valid(configuration.provider === "claude" && isolation.hostSkillDiscovery === "existing-claude-safe-mode-and-disabled-slash-commands", "Claude host discovery mode changed.");
    valid(["--print", "--safe-mode", "--disable-slash-commands", "--no-session-persistence"].every(flag => args.includes(flag)) && onlyValue("--tools", "Read") && equal(receipt.allowedTools, ["Read"]), "Claude safe-mode, disabled commands, Read-only tools, or non-persistence flags are missing or overridden.");
    valid(noFlags(["-c", "--allowedTools", "--allowed-tools", "--add-dir", "--mcp-config", "--dangerously-skip-permissions"]), "Claude tool or session controls are overridden.");
  }
  return { version: isolation.version, role: isolation.role, hostSkillDiscovery: isolation.hostSkillDiscovery, toolPolicy: isolation.toolPolicy, hiddenProviderInstructionsVerified: false };
}
function contextScores(judgments) {
  return Object.fromEntries(MODES.map(mode => {
    const members = judgments.filter(judge => judge.contextMode === mode);
    return [mode, members.length === 2 ? mean(members.map(judge => judge.score)) : null];
  }));
}
function pairSummary(cells, settingIds, trialNumbers = [1, 2, 3], mode = null) {
  const pairs = settingIds.flatMap(settingId => trialNumbers.map(trialNumber => {
    const score = condition => {
      const cell = cells.find(candidate => candidate.settingId === settingId && candidate.trialNumber === trialNumber && candidate.condition === condition);
      return mode ? cell?.contextScores[mode] : cell?.exactScore;
    };
    return { baseline: score("baseline"), treatment: score("skill") };
  })).filter(pair => finite(pair.baseline) && finite(pair.treatment));
  return { baseline: round(mean(pairs.map(pair => pair.baseline))), treatment: round(mean(pairs.map(pair => pair.treatment))), delta: round(mean(pairs.map(pair => pair.treatment - pair.baseline))), wins: pairs.filter(pair => pair.treatment > pair.baseline).length, ties: pairs.filter(pair => pair.treatment === pair.baseline).length, losses: pairs.filter(pair => pair.treatment < pair.baseline).length, usablePairs: pairs.length, expectedPairs: settingIds.length * trialNumbers.length };
}
function trialEffects(cells) {
  const trials = [1, 2, 3].map(trialNumber => {
    const baseline = cells.find(cell => cell.trialNumber === trialNumber && cell.condition === "baseline")?.exactScore ?? null;
    const treatment = cells.find(cell => cell.trialNumber === trialNumber && cell.condition === "skill")?.exactScore ?? null;
    return { trialNumber, baseline, treatment, delta: finite(baseline) && finite(treatment) ? treatment - baseline : null };
  });
  const values = trials.map(trial => trial.delta);
  const average = mean(values);
  return { trials, complete: finite(average), count: values.filter(finite).length, expectedCount: 3, mean: average, sampleStandardDeviation: finite(average) ? Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / 2) : null, minimum: finite(average) ? Math.min(...values) : null, maximum: finite(average) ? Math.max(...values) : null, range: finite(average) ? Math.max(...values) - Math.min(...values) : null };
}
function coverageFor(cells) {
  const settingIds = [...new Set(cells.map(cell => cell.settingId))];
  const terminalPairs = new Set(cells.filter(cell => cell.generationDisposition === "terminal-failure").map(pairKey));
  const pendingGenerationCount = cells.filter(cell => cell.generationDisposition === "unresolved").length;
  const pendingJudgmentCount = cells.filter(cell => !terminalPairs.has(pairKey(cell))).reduce((sum, cell) => sum + cell.reviewerStatuses.filter(review => !["complete", "terminal-failure"].includes(review.disposition)).length, 0);
  const terminalJudgmentFailureCount = cells.reduce((sum, cell) => sum + cell.reviewerStatuses.filter(review => review.disposition === "terminal-failure").length, 0);
  const terminallyExcludedJudgmentCount = cells.filter(cell => terminalPairs.has(pairKey(cell))).reduce((sum, cell) => sum + 4 - cell.coverage.completedJudgments, 0);
  const executionComplete = pendingGenerationCount === 0 && pendingJudgmentCount === 0;
  return { benchmarkCount: 1, caseCount: 1, promptCount: 1, trialCount: 3, settingCount: settingIds.length, completedSettingCount: settingIds.filter(id => cells.filter(cell => cell.settingId === id).every(cell => finite(cell.exactScore))).length,
    responseCount: cells.filter(cell => cell.coverage.completedResponses).length, validResponseCount: cells.filter(cell => cell.generationDisposition === "complete").length, expectedResponseCount: cells.length, scoredResponseCount: cells.filter(cell => finite(cell.exactScore)).length,
    usablePairs: pairSummary(cells, settingIds).usablePairs, expectedPairs: cells.length / 2, judgmentCount: cells.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0), expectedJudgmentCount: cells.length * 4, expectedJudgeRequestCount: cells.length * 2, completedJudgeRequestCount: cells.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0) / 2,
    terminalGenerationFailureCount: cells.filter(cell => cell.generationDisposition === "terminal-failure").length, terminalJudgmentFailureCount, terminallyExcludedPairCount: terminalPairs.size, terminallyExcludedJudgmentCount, pendingGenerationCount, pendingJudgmentCount, executionComplete, executionStatus: executionComplete ? terminalPairs.size || terminalJudgmentFailureCount ? "complete-with-exclusions" : "complete" : "in-progress" };
}
function publicFailure(row) {
  if (row.rowStatus === "complete") return null;
  if (["pending", "running", "interrupted"].includes(row.rowStatus)) return "Generation not completed in this snapshot.";
  if (row.rowStatus === "unavailable") return "Requested configuration unavailable; no substitute was used.";
  return "Generation failed; the missing answer has no imputed score.";
}

// Candidate text is retained once. Replacing these references with the exact
// output bytes reconstructs the entire original judge prompt without loss.
function archivePrompt(prompt, candidates, segments) {
  const parts = [];
  let cursor = 0;
  const addText = content => {
    const sha256 = hash(content);
    segments.set(sha256, { sha256, content });
    parts.push({ textSha256: sha256 });
  };
  for (const candidate of candidates) {
    const encoded = JSON.stringify(candidate.outputText);
    const start = prompt.indexOf(encoded, cursor);
    requireEvidence(start >= cursor, "judge prompt is missing its exact candidate answer.");
    addText(prompt.slice(cursor, start));
    parts.push({ outputSha256: candidate.outputHash, encoding: "json-string" });
    cursor = start + encoded.length;
  }
  addText(prompt.slice(cursor));
  return parts;
}

export function projectStorytellingCreationRun({ run, snapshot, judging, contextSnapshot, sourceSha256, judgingSha256, skillSnapshotSha256, contextSha256 }) {
  const definition = run?.benchmark?.definition;
  requireEvidence(run?.kind === "benchmark" && definition?.id === ID && !String(definition.status).includes("draft"), "unsupported or draft frozen benchmark.");
  requireEvidence(run.benchmark.hash === createBenchmarkHash(definition) && run.benchmark.generationHash === createBenchmarkGenerationHash(definition) && run.benchmark.scoringHash === createBenchmarkScoringHash(definition), "frozen benchmark identity changed.");
  for (const value of [sourceSha256, judgingSha256, skillSnapshotSha256, contextSha256]) requireEvidence(HASH.test(value ?? ""), "an immutable source fingerprint is missing.");
  validateStorytellingSkillSnapshot(snapshot);
  requireEvidence(snapshot.files.every(file => file.bytes === Buffer.byteLength(file.contents)) && snapshot.skillName === "writing-storytelling" && snapshot.hash === run.treatment?.hash && run.treatment.id === "skill:writing-storytelling" && !(run.treatment.requiredSkillFiles?.length), "frozen treatment or progressive-reference policy changed.");
  requireEvidence(run.generation.trialCount === 3 && definition.cases?.length === 1 && definition.cases[0].id === "magic-discovery", "the single-prompt three-trial inventory changed.");
  requireEvidence(run.configurations?.length === 33 && equal(run.configurations.map(config => config.id).sort(), [...INVENTORY].sort()), "predeclared 33-configuration inventory changed.");
  requireEvidence(equal(definition.scoring?.dimensions?.map(d => d.id), DIMENSIONS) && definition.scoring.dimensions.every(d => d.weight === 10) && definition.scoring.ratingScale?.min === 1 && definition.scoring.ratingScale?.max === 10 && !(definition.scoring.gates?.length), "ten equal ungated 1–10 dimensions are required.");
  validateStorytellingCreationJudging({ run, skillSnapshot: snapshot, judging, contextSnapshot, runSha256: sourceSha256 });
  requireEvidence(judging.profiles?.length === 4 && equal(judging.profiles.map(profile => profile.id).sort(), [...SEATS].sort()), "crossed four-seat panel changed.");
  const profiles = judging.profiles.map(profile => {
    requireEvidence(MODES.includes(profile.contextMode) && profile.configuration.provider === "codex" && profile.configuration.reasoning === "xhigh" && ["gpt-6-astra", "gpt-5.6-sol"].includes(profile.configuration.model), "judge context or canonical identity changed.");
    return { id: profile.id, reviewerId: profile.id, configurationId: profile.configuration.id, judgeConfigurationId: profile.configuration.id, modelId: `${profile.configuration.provider}:${profile.configuration.model}`, provider: profile.configuration.provider, model: profile.configuration.model, reasoning: profile.configuration.reasoning, contextMode: profile.contextMode, contextSha256: profile.contextSha256, label: `${MODELS[profile.configuration.model]} · xhigh · skill-${profile.contextMode}`, contextFileId: profile.contextMode === "informed" ? "frozen-informed-judge-context" : null };
  });
  const sourcePins = { run: sourceSha256, skill: skillSnapshotSha256, judging: judgingSha256, judgeContext: contextSha256 };
  const dimensions = definition.scoring.dimensions.map(d => ({ id: d.id, title: d.title, label: d.title, description: d.criterion ?? d.description ?? "", weight: 10, anchors: d.anchors }));
  const story = { id: definition.cases[0].id, benchmarkId: ID, title: definition.cases[0].title ?? definition.title, prompt: definition.cases[0].task, medium: "fantasy synopsis or short outline", version: null, creator: null };
  const rootInstruction = createStorytellingSkillInstruction({ skillSnapshot: snapshot, skillDirectoryPath: "<frozen-skill-directory>", requiredSkillFiles: [] });
  const promptFiles = [{ id: "frozen-skill-root", title: "Frozen storytelling skill provider instruction (directory normalized)", content: rootInstruction, sha256: hash(rootInstruction) },
    { id: "frozen-judge-rubric", title: "Frozen creation judging rubric", content: JSON.stringify(definition.scoring, null, 2), sha256: hash(JSON.stringify(definition.scoring, null, 2)) },
    { id: "frozen-informed-judge-context", title: "Exact context supplied to skill-informed judges", content: contextSnapshot.text, sha256: hash(contextSnapshot.text) },
    ...snapshot.files.filter(file => file.relativePath !== "SKILL.md").map(file => ({ id: `frozen-library-${hash(file.relativePath).slice(0, 16)}`, title: file.relativePath, content: file.contents, sha256: file.sha256 }))];
  const judgeRequests = [], judgedRows = new Map(), judgePromptSegments = new Map(), rowReviewerStatuses = new Map();
  for (const pair of judging.pairs) for (const judge of pair.judgments) {
    const profile = profiles.find(item => item.id === judge.profileId);
    requireEvidence(profile, "unknown original judge profile.");
    const disposition = judge.status === "complete" ? "complete" : judge.status === "ineligible" ? "terminal-excluded" : judge.status === "error" && judge.attempts.at(-1)?.retryable !== true ? "terminal-failure" : "pending";
    for (const candidate of pair.candidates) {
      if (!rowReviewerStatuses.has(candidate.rowKey)) rowReviewerStatuses.set(candidate.rowKey, []);
      rowReviewerStatuses.get(candidate.rowKey).push({ reviewerId: profile.id, status: judge.status, disposition, hasFinalResponse: typeof judge.outputText === "string" });
    }
    if (judge.promptText === null) continue;
    const requestId = `${judge.profileId}:${judge.promptSha256}`;
    const candidates = judge.candidateOrder.map(candidate => run.rows.find(row => row.rowKey === candidate.rowKey));
    judgeRequests.push({ id: requestId, profileId: profile.id, status: judge.status, disposition, failureReason: disposition === "terminal-failure" ? "The original reviewer response did not satisfy the frozen protocol; no replacement score was imputed." : null, promptSha256: judge.promptSha256, promptParts: archivePrompt(judge.promptText, candidates, judgePromptSegments), candidateOrder: judge.candidateOrder.map(candidate => ({ candidateId: candidate.candidateId, outputSha256: candidate.outputSha256 })), outputText: judge.outputText, outputSha256: judge.outputSha256 });
    if (judge.status !== "complete") continue;
    for (const candidate of judge.candidateOrder) {
      const assessment = judge.evaluation.evaluations.find(item => item.candidateId === candidate.candidateId);
      const ratings = Object.fromEntries(dimensions.map(d => {
        const source = assessment.dimensions.find(item => item.id === d.id);
        return [d.id, { rating: source.rating, reason: null, evidence: source.evidence }];
      }));
      const review = { reviewerId: profile.id, profileId: profile.id, judgeLabel: profile.label, judgeConfigurationId: profile.configurationId, contextMode: profile.contextMode, contextSha256: profile.contextSha256, score: dimensions.reduce((sum, d) => sum + ratings[d.id].rating, 0), dimensions: ratings, rationale: assessment.review, candidateId: candidate.candidateId, promptSha256: judge.promptSha256, answerSha256: judge.outputSha256, requestId, resources: { scope: "shared-matched-pair-batch", candidateCount: 2, durationMs: finite(judge.durationMs) ? judge.durationMs : null, usage: publicUsage(judge.usage) } };
      if (!judgedRows.has(candidate.rowKey)) judgedRows.set(candidate.rowKey, []);
      judgedRows.get(candidate.rowKey).push(review);
    }
  }
  const cells = [], responses = [], messageSets = new Map(), observedCreatorSessions = new Set();
  const identities = run.configurations.map(identity);
  requireEvidence(run.rows?.length === 198 && new Set(run.rows.map(row => row.rowKey)).size === 198, "generation inventory is missing or duplicated.");
  for (const setting of identities) for (const trialNumber of [1, 2, 3]) for (const condition of CONDITIONS) {
    const matches = run.rows.filter(row => row.configurationId === setting.configurationId && row.caseId === story.id && row.trialNumber === trialNumber && row.conditionId === condition.sourceId);
    requireEvidence(matches.length === 1, "missing or duplicated generation cell.");
    const row = matches[0], configuration = run.configurations.find(config => config.id === setting.configurationId);
    requireEvidence(equal(row.exactMessages, [{ role: "user", content: story.prompt }]) && row.promptText === story.prompt && ["complete", "pending", "running", "interrupted", "error", "failed", "unavailable"].includes(row.rowStatus), "generation prompt or status changed.");
    const complete = row.rowStatus === "complete", hasOutput = typeof row.outputText === "string" && Boolean(row.outputText.trim());
    const receipt = row.runtimeReceipt;
    let publicIsolation = null;
    if (hasOutput || complete) {
      publicIsolation = validateStorytellingCreationCreatorReceipt({ runtimeReceipt: receipt, configuration, runtimePolicy: definition.runtimePolicy });
      for (const session of new Set([receipt.threadId, receipt.sessionId].filter(value => typeof value === "string" && value.length))) {
        const sessionKey = `${configuration.provider}:${session}`;
        requireEvidence(!observedCreatorSessions.has(sessionKey), "creator isolation reused an observed session across generation rows.");
        observedCreatorSessions.add(sessionKey);
      }
      requireEvidence(hasOutput && hash(row.outputText) === row.outputHash && receipt?.freshSession === true && receipt.userPromptSha256 === hash(story.prompt) && receipt.outputSha256 === row.outputHash && receipt.skillHash === (condition.id === "skill" ? snapshot.hash : null) && receipt.instructionHash === (condition.id === "skill" ? hash(rootInstruction) : null), "answer or frozen generation instruction changed.");
      requireEvidence(equal(receipt.requestedConfiguration, configuration) && receipt.requestedModel === configuration.model && receipt.requestedReasoning === configuration.reasoning && row.provider === configuration.provider && row.model === configuration.model && row.reasoning === configuration.reasoning && isBenchmarkAgentRuntimeReceiptCompatible({ configuration, runtimeReceipt: receipt }), "generation runtime identity changed.");
      requireEvidence((receipt.referenceAccess?.observedPaths ?? []).every(file => snapshot.files.some(source => source.relativePath === file)) && (condition.id === "skill" || !(receipt.referenceAccess?.observedPaths ?? []).length), "reference access crossed the frozen condition boundary.");
    }
    const judgments = judgedRows.get(row.rowKey) ?? [], reviewerStatuses = rowReviewerStatuses.get(row.rowKey) ?? [];
    requireEvidence(complete || judgments.length === 0, "a failed generation acquired a judgment.");
    requireEvidence(new Set(judgments.map(judge => judge.reviewerId)).size === judgments.length, "duplicate original reviewer seat.");
    const exactScore = judgments.length === 4 ? mean(judgments.map(judge => judge.score)) : null;
    const ratings = Object.fromEntries(dimensions.map(d => [d.id, judgments.length === 4 ? mean(judgments.map(judge => judge.dimensions[d.id].rating)) : null]));
    const contexts = contextScores(judgments);
    const disagreement = judgments.length === 4 ? { scoreSpread: Math.max(...judgments.map(judge => judge.score)) - Math.min(...judgments.map(judge => judge.score)), dimensionRanges: dimensions.map(d => ({ id: d.id, spread: Math.max(...judgments.map(judge => judge.dimensions[d.id].rating)) - Math.min(...judgments.map(judge => judge.dimensions[d.id].rating)) })), informedMinusNaive: contexts.informed - contexts.naive } : null;
    const outputText = hasOutput ? row.outputText : "";
    const status = finite(exactScore) ? "scored" : complete ? "unscored" : row.rowStatus;
    const generationDisposition = complete ? "complete" : ["pending", "running", "interrupted"].includes(row.rowStatus) ? "unresolved" : "terminal-failure";
    const cell = { benchmarkId: ID, caseId: story.id, trialNumber, settingId: setting.id, configurationId: setting.configurationId, condition: condition.id, category: "writing", status, generationDisposition, score: round(exactScore), exactScore, dimensions: ratings, contextScores: contexts, disagreement, trials: 1, calibrated: false,
      latencyMs: hasOutput && finite(row.durationMs) ? row.durationMs : null, ...Object.fromEntries(["inputTokens", "outputTokens", "totalTokens"].map(field => [field, hasOutput ? publicUsage(row.usage)[field] : null])), wordCount: hasOutput ? words(outputText) : null, costUsd: null,
      coverage: { expectedResponses: 1, completedResponses: hasOutput ? 1 : 0, expectedJudgments: 4, completedJudgments: judgments.length }, reviewerStatuses, failureReason: publicFailure(row), attemptCount: row.attempts?.length ?? 0 };
    cell.metrics = metrics([cell]); cells.push(cell);
    const messages = [...(condition.id === "skill" ? [{ role: configuration.provider === "codex" ? "developer" : "system", content: "Frozen storytelling skill provider instruction; see the shared Method archive.", fileId: "frozen-skill-root" }] : []), { role: "user", content: story.prompt }];
    const messageSetId = hash(JSON.stringify(messages)); messageSets.set(messageSetId, { id: messageSetId, messages });
    responses.push({ benchmarkId: ID, caseId: story.id, trialNumber, settingId: setting.id, configurationId: setting.configurationId, condition: condition.id, status, generationDisposition, failureReason: cell.failureReason, outputText, wordCount: cell.wordCount, characterCount: hasOutput ? Array.from(outputText).length : null, score: cell.score, contextScores: contexts, judgments, reviewerStatuses, disagreement, messageSetId,
      provenance: { sourceSha256, judgingSha256, outputSha256: hasOutput ? row.outputHash : null, questionSha256: hash(story.prompt), skillSha256: condition.id === "skill" ? snapshot.hash : null },
      runtime: hasOutput ? { freshSession: true, creationIsolation: publicIsolation, modelVerification: receipt.modelVerification ?? "explicit-cli-request-only", reasoningVerification: receipt.reasoningVerification ?? "explicit-cli-request-only", executionMode: receipt.executionMode ?? configuration.reasoning, referenceFilesRead: receipt.referenceAccess?.observedPaths ?? [], observedCollaborationEvents: receipt.itemTypeCounts?.collab_tool_call ?? 0, rawProviderStreamRetained: receipt.rawStreamsRetained === true, durationMs: cell.latencyMs, usage: publicUsage(row.usage) } : null });
  }
  const aggregates = [], effects = [];
  const settings = identities.map(setting => {
    const cohort = cells.filter(cell => cell.settingId === setting.id), complete = cohort.every(cell => finite(cell.exactScore));
    const scores = {}, settingMetrics = {}, coverage = {}, settingContexts = {};
    effects.push({ settingId: setting.id, configurationId: setting.configurationId, ...trialEffects(cohort) });
    for (const condition of CONDITIONS) {
      const members = cohort.filter(cell => cell.condition === condition.id), exactScore = complete ? mean(members.map(cell => cell.exactScore)) : null;
      scores[condition.id] = round(exactScore); settingMetrics[condition.id] = metrics(members);
      coverage[condition.id] = { expectedCases: 3, scoredCases: members.filter(cell => finite(cell.exactScore)).length, expectedResponses: 3, completedResponses: members.filter(cell => cell.coverage.completedResponses).length, expectedJudgments: 12, completedJudgments: members.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0) };
      settingContexts[condition.id] = Object.fromEntries(MODES.map(mode => [mode, complete ? mean(members.map(cell => cell.contextScores[mode])) : null]));
      aggregates.push({ benchmarkId: ID, settingId: setting.id, configurationId: setting.configurationId, condition: condition.id, category: "writing", exactScore, score: round(exactScore), eligibleForRank: complete, status: complete ? "scored" : "incomplete", dimensions: Object.fromEntries(dimensions.map(d => [d.id, complete ? mean(members.map(cell => cell.dimensions[d.id])) : null])), contextScores: settingContexts[condition.id], coverage: coverage[condition.id], metrics: settingMetrics[condition.id], trials: 3, calibrated: false });
    }
    return { ...setting, scores, deltas: { skill: complete ? round(aggregates.at(-1).exactScore - aggregates.at(-2).exactScore) : null }, metrics: settingMetrics, coverage, contextScores: settingContexts, eligibleForRank: complete, categories: Object.fromEntries(CONDITIONS.map(condition => [condition.id, [{ category: "writing", score: scores[condition.id], exactScore: aggregates.find(item => item.settingId === setting.id && item.condition === condition.id).exactScore }]])) };
  });
  const entries = settings.flatMap(setting => CONDITIONS.map(condition => {
    const aggregate = aggregates.find(item => item.settingId === setting.id && item.condition === condition.id);
    return { ...Object.fromEntries(["modelId", "provider", "family", "reasoning", "label", "configurationId"].map(field => [field, setting[field]])), id: `${setting.id}-${condition.id}`, settingId: setting.id, condition: condition.id, conditionLabel: condition.label, score: aggregate.score, exactScore: aggregate.exactScore, eligibleForRank: aggregate.eligibleForRank, rank: finite(aggregate.exactScore) ? 1 + aggregates.filter(item => item.condition === condition.id && finite(item.exactScore) && item.exactScore > aggregate.exactScore).length : null, baselineScore: setting.scores.baseline, delta: condition.id === "baseline" ? setting.eligibleForRank ? 0 : null : setting.deltas.skill, contextScores: aggregate.contextScores, categories: setting.categories[condition.id], baselineCategories: setting.categories.baseline, metrics: aggregate.metrics, coverage: aggregate.coverage, cost: null, latency: finite(aggregate.metrics.meanLatencyMs) ? aggregate.metrics.meanLatencyMs / 1000 : null, tokens: aggregate.metrics.meanOutputTokens };
  }));
  const coverage = coverageFor(cells), completeIds = settings.filter(setting => setting.eligibleForRank).map(setting => setting.id);
  const summary = pairSummary(cells, completeIds), detailHref = `benchmark-report.html#${ID}`;
  const contextSummaries = Object.fromEntries(MODES.map(mode => [mode, { ...pairSummary(cells, completeIds, [1, 2, 3], mode), cohort: "same-complete-four-seat-three-trial-configurations" }]));
  const limitations = [...(definition.limitations ?? []), "Three trials on one exact prompt support descriptive repeat variation, not confidence intervals or significance claims.", "The four review seats cross two related model families with two context conditions; they are not four independent training sources.", "Incomplete paired configurations have no aggregate score or rank. Missing answers and reviews are never imputed."];
  const availability = { status: "development", verification: "unverified", code: "development-uncalibrated", message: "Exploratory model-judged results", detail: "Three fresh trials per condition with four crossed judge seats. Writing remains excluded from Overall.", blockers: [{ code: "human-calibration-pending", message: "Not calibrated against a human panel." }] };
  const scoreBasis = { id: `${definition.edition}:${run.benchmark.scoringHash}:crossed-context-v1`, label: `Storytelling · ${definition.title}`, edition: definition.edition, method: "four-seat-three-complete-paired-trial-mean-v1", unit: "rubric-points", range: { minimum: 10, maximum: 100 }, benchmarkIds: [ID], taskCount: 1, trialsPerTask: 3, judgeCount: 4, judges: profiles.map(profile => profile.configurationId), reviewers: profiles, judgeConfigurations: profiles.map(profile => ({ reviewerId: profile.id, configurationId: profile.configurationId, contextMode: profile.contextMode })), dimensions, weights: Object.fromEntries(dimensions.map(d => [d.id, 10])), ratingMinimum: 1, ratingMaximum: 10, gates: null, caps: null, aggregation: "sum-ten-ratings-then-mean-four-reviews-then-mean-three-trials", batchUnit: "matched-pair", calibrationStatus: "development-uncalibrated", panelMethod: "Each fresh reviewer scores ten equally weighted dimensions from 1 to 10; their sum is 10–100. An answer requires all four reviews and averages their totals. Configuration scores require all three paired trials and average those answer scores. Naive and informed means each average the two canonical judge models; the primary score weights all four seats equally.", blinding: "Each fresh judge receives the exact task, frozen rubric and anonymous candidate answers. Generator, reasoning and condition labels are withheld. Informed judges additionally receive the archived frozen skill context; naive judges do not. Reviews are not shared across judges. Recognizable writing style can reveal a condition.", sourceSha256, judgingSha256, sourcePins, coverage, uncertainty: { status: "descriptive-repeated-trials", reason: "Raw three-trial deltas, their mean, sample standard deviation and range are reported. No confidence interval or significance claim is made." } };
  const methodology = { corpusSha256: run.benchmark.hash, rubricSha256: hash(JSON.stringify(definition.scoring)), skillSha256: snapshot.hash, judgingSha256, judgeContextSha256: contextSha256, sourcePins, corpus: [{ id: story.id, title: story.title, sha256: hash(story.prompt) }], skillFiles: snapshot.files.map(file => ({ path: file.relativePath, sha256: file.sha256, bytes: file.bytes })), judgeProfiles: profiles, informedSkillFiles: contextSnapshot.informedSkillFiles, generationContract: definition.preRegistration?.generationContract ?? "The exact task is the entire user message in every fresh isolated generation session. Treatment adds the frozen storytelling root instruction and progressively accessible references. There are no mandatory reference reads, revisions, score-based output selection, or extra output limits.", blinding: scoreBasis.blinding, limitations, execution: { trialCount: 3, generationOrderPolicy: run.generation.orderPolicy ?? null, generationOrderSeed: run.generation.orderSeed ?? null, runnerVersion: run.storytelling?.runnerVersion ?? null, runtimeVersion: run.storytelling?.runtimeVersion ?? null }, resourceAccounting: "Generation usage belongs to each answer. Judge usage covers a shared matched-pair request and repeats on both candidate records; count each profile and prompt SHA once. Missing provider usage remains unknown. Latency, length and usage are separate from quality. Ultra can include runtime collaboration; fresh sessions do not establish the number of underlying agents." };
  const benchmark = { id: ID, trackId: "storytelling", familyId: "writing", category: "writing", suite: "Storytelling", name: definition.title, title: definition.title, description: definition.description, taskKind: "story-outline", prompt: story.prompt, judging: { panel: profiles.map(profile => profile.id), synthesizer: null }, limitations, reportFragment: ID, detailHref, evidenceKind: "development", resultAvailability: availability, measured: { ...summary, complete: coverage.scoredResponseCount, total: 198, treatmentLabel: "Storytelling skill", calibration: "Human calibration pending" } };
  const trialSummaries = [1, 2, 3].map(trialNumber => ({ benchmarkId: ID, caseId: story.id, trialNumber, ...pairSummary(cells, identities.map(setting => setting.id), [trialNumber]) }));
  const caseSummaries = [{ benchmarkId: ID, caseId: story.id, ...pairSummary(cells, identities.map(setting => setting.id)), complete: coverage.scoredResponseCount, total: 198, detailHref: `${detailHref}/${story.id}` }];
  const counts = { families: 1, tracks: 1, benchmarks: 1, categories: 1, cases: 1, conditions: 2, settings: 33, resultEntries: 66, responses: coverage.responseCount, developmentResultSets: 1, eligibleResultSets: 0, withheldResultSets: 0 };
  const leader = entries.filter(entry => entry.condition === "skill" && finite(entry.exactScore)).sort((a, b) => a.rank - b.rank || a.configurationId.localeCompare(b.configurationId))[0];
  const projection = { kind: "vasirbenchmark-writing-projection", schemaVersion: 1, subcategory: "storytelling", subcategoryTitle: "Storytelling", trialCount: 3, caseLabel: "prompt", trialLabel: "Trial", program: { id: "vasirbench", title: "VasirBench", status: "development", evidenceStatus: "development", verification: "unverified" }, meta: { release: "Development snapshot · September 2026", status: availability.message, categories: 1, benchmarks: 1, settings: 33, conditions: 2, trials: 3, aggregateCells: 198, runs: 1, calibration: 0 }, scoreBasis, conditions: CONDITIONS, categories: [{ id: "writing", name: "Writing", title: "Writing", short: "WRITE", weight: 1, color: "#b65a31", trackIds: ["storytelling"] }], families: [{ id: "writing", title: "Writing", description: "Writing benchmarks with task-specific scores.", trackIds: ["storytelling"] }], tracks: [{ id: "storytelling", familyId: "writing", title: "Storytelling", description: "Understanding and creating narrative.", benchmarkIds: [ID], resultAvailability: availability }], benchmarks: [benchmark], results: [{ benchmarkId: ID, runId: run.runId, status: "development", verification: "unverified", baselineScore: summary.baseline, treatmentScore: summary.treatment, delta: summary.delta, responseCount: coverage.responseCount, matchedConfigurationCount: completeIds.length, coverage }], settings, entries, benchmarkResults: aggregates, benchmarkSummaries: [{ benchmarkId: ID, runId: run.runId, status: "development", verification: "unverified", evidenceKind: "development", baselineLabel: "Plain answer", treatmentLabel: "Storytelling skill", ...summary, complete: coverage.scoredResponseCount, total: 198, completionLabel: "scored responses", calibration: "Human calibration pending", detailHref, sourceHref: null }], cases: [story], caseSummaries, trialSummaries, caseResults: cells, trialEffects: effects, contextSummaries, methodology, coverage, categoryLeaders: leader ? [{ category: "writing", entry: { ...leader, categoryScore: leader.score } }] : [], efficientFrontier: [], regressions: entries.filter(entry => entry.condition === "skill" && finite(entry.delta) && entry.delta < 0), callouts: { overall: "Writing is excluded from Overall.", value: "Quality, length and latency are separate outcomes.", regression: "Every trial and paired loss remains visible.", category: "One exact fantasy creation prompt; not a general writing score." }, availability, counts };
  const responseBundle = { kind: "vasirbenchmark-writing-responses", schemaVersion: 1, counts: { ...coverage, responses: responses.length, messageSets: messageSets.size, judgments: coverage.judgmentCount, judgeRequests: judgeRequests.length }, promptFiles, messageSets: [...messageSets.values()], judgeProfiles: profiles, judgeRequests, judgePromptSegments: [...judgePromptSegments.values()], responses };
  const stub = { kind: "vasirbenchmark-writing-summary", dataHref: "./writing-data.js", responsesHref: "./writing-responses.js", category: { id: "writing", name: "Writing", short: "WRITE" }, benchmarkId: ID, benchmarkTitle: definition.title, subcategory: "storytelling", title: "Storytelling", subsections: [{ id: "storytelling", title: "Storytelling", status: coverage.scoredResponseCount ? "measured" : "unscored" }, { id: "prose", title: "Prose", status: "unscored" }, { id: "poetry", title: "Poetry", status: "unscored" }], coverage, treatmentLabel: "Storytelling skill", scoreBasisLabel: scoreBasis.label, detailHref, status: coverage.scoredResponseCount ? "measured" : "unscored", ...(leader ? { leader: { id: leader.id, settingId: leader.settingId, family: leader.family, reasoning: leader.reasoning, score: leader.score } } : {}) };
  validateStorytellingCreationPublication(projection, responseBundle);
  return { projection, responseBundle, stub, sourcePins, benchmarkId: ID, basisSha256: hash(JSON.stringify(sourcePins)) };
}

export function validateStorytellingCreationPublication(projection, responseBundle) {
  requireEvidence(projection?.kind === "vasirbenchmark-writing-projection" && projection.schemaVersion === 1 && projection.benchmarks?.length === 1 && projection.benchmarks[0].id === ID && projection.trialCount === 3 && projection.cases?.length === 1 && projection.cases[0].id === "magic-discovery", "invalid public benchmark identity.");
  const dimensions = projection.scoreBasis?.dimensions, cells = projection.caseResults;
  requireEvidence(equal(dimensions?.map(d => d.id), DIMENSIONS) && dimensions.every(d => d.weight === 10) && projection.scoreBasis.judgeCount === 4 && projection.scoreBasis.ratingMinimum === 1 && projection.scoreBasis.ratingMaximum === 10, "public rubric or crossed panel changed.");
  requireEvidence(cells?.length === 198 && new Set(cells.map(key)).size === 198 && projection.settings?.length === 33 && projection.entries?.length === 66 && projection.benchmarkResults?.length === 66, "public generation inventory changed.");
  requireEvidence(equal(projection.settings.map(setting => setting.configurationId).sort(), [...INVENTORY].sort()), "public model inventory changed.");
  for (const cell of cells) {
    requireEvidence(cell.benchmarkId === ID && cell.caseId === "magic-discovery" && [1, 2, 3].includes(cell.trialNumber) && CONDITIONS.some(condition => condition.id === cell.condition) && projection.settings.some(setting => setting.id === cell.settingId && setting.configurationId === cell.configurationId), "public cell identity changed.");
    const score = cell.coverage.completedJudgments === 4 ? dimensions.reduce((sum, d) => sum + cell.dimensions[d.id], 0) : null;
    requireEvidence(cell.exactScore === score && cell.score === round(score) && (score === null || score >= 10 && score <= 100) && cell.coverage.expectedJudgments === 4, "public score differs from independent dimensions.");
    requireEvidence(cell.reviewerStatuses?.length === 4 && equal(cell.reviewerStatuses.map(review => review.reviewerId).sort(), [...SEATS].sort()) && cell.reviewerStatuses.filter(review => review.disposition === "complete").length === cell.coverage.completedJudgments, "public review completion coverage changed.");
  }
  requireEvidence(equal(projection.coverage, coverageFor(cells)), "public planned or actual coverage changed.");
  for (const setting of projection.settings) {
    const cohort = cells.filter(cell => cell.settingId === setting.id), complete = cohort.length === 6 && cohort.every(cell => finite(cell.exactScore));
    requireEvidence(equal(projection.trialEffects.find(effect => effect.settingId === setting.id), { settingId: setting.id, configurationId: setting.configurationId, ...trialEffects(cohort) }), "three-trial descriptive statistics changed.");
    for (const condition of CONDITIONS) {
      const members = cohort.filter(cell => cell.condition === condition.id), exact = complete ? mean(members.map(cell => cell.exactScore)) : null;
      const aggregate = projection.benchmarkResults.find(item => item.settingId === setting.id && item.condition === condition.id), entry = projection.entries.find(item => item.settingId === setting.id && item.condition === condition.id);
      requireEvidence(aggregate?.exactScore === exact && aggregate.score === round(exact) && setting.scores[condition.id] === round(exact) && entry?.exactScore === exact && entry.score === round(exact) && entry.eligibleForRank === complete, "incomplete trials acquired an aggregate or public scores changed.");
      const rank = complete ? 1 + projection.benchmarkResults.filter(item => item.condition === condition.id && finite(item.exactScore) && item.exactScore > exact).length : null;
      requireEvidence(entry.rank === rank, "rank differs from exact complete-panel means.");
      const contexts = Object.fromEntries(MODES.map(mode => [mode, complete ? mean(members.map(cell => cell.contextScores[mode])) : null]));
      requireEvidence(equal(aggregate.contextScores, contexts) && equal(entry.contextScores, contexts) && equal(setting.contextScores[condition.id], contexts), "context-specific aggregate means changed.");
    }
  }
  const completeIds = projection.settings.filter(setting => setting.eligibleForRank).map(setting => setting.id);
  for (const mode of MODES) requireEvidence(equal(projection.contextSummaries[mode], { ...pairSummary(cells, completeIds, [1, 2, 3], mode), cohort: "same-complete-four-seat-three-trial-configurations" }), "context-specific summary cohort changed.");
  publicOnly(projection);
  if (!responseBundle) return projection;
  publicOnly(responseBundle);
  requireEvidence(responseBundle.kind === "vasirbenchmark-writing-responses" && responseBundle.responses?.length === 198 && new Set(responseBundle.responses.map(key)).size === 198, "public answer inventory changed.");
  const files = responseBundle.promptFiles, sets = new Map(responseBundle.messageSets.map(set => [set.id, set])), requests = new Map(responseBundle.judgeRequests.map(request => [request.id, request]));
  requireEvidence(new Set(files.map(file => file.id)).size === files.length && files.every(file => hash(file.content) === file.sha256) && sets.size === responseBundle.messageSets.length && [...sets.values()].every(set => hash(JSON.stringify(set.messages)) === set.id), "public prompt archive changed.");
  requireEvidence(requests.size === responseBundle.judgeRequests.length && equal(responseBundle.judgeProfiles, projection.methodology.judgeProfiles), "public judge archive or profiles changed.");
  const answers = new Map(responseBundle.responses.filter(response => response.outputText).map(response => [response.provenance.outputSha256, response.outputText]));
  const originalReviews = new Map();
  const segments = new Map(responseBundle.judgePromptSegments.map(segment => [segment.sha256, segment.content]));
  requireEvidence(segments.size === responseBundle.judgePromptSegments.length && [...segments].every(([sha256, content]) => hash(content) === sha256), "original judge prompt fragments changed.");
  for (const request of requests.values()) {
    const prompt = request.promptParts.map(part => part.textSha256 ? segments.get(part.textSha256) : JSON.stringify(answers.get(part.outputSha256))).join("");
    requireEvidence(hash(prompt) === request.promptSha256 && (request.outputText === null ? request.outputSha256 === null : hash(request.outputText) === request.outputSha256) && SEATS.includes(request.profileId), "original judge prompt or final review changed.");
    if (request.status === "complete") originalReviews.set(request.id, parseStorytellingCreationJudgment(request.outputText, { dimensions }));
  }
  for (const response of responseBundle.responses) {
    const cell = cells.find(candidate => key(candidate) === key(response)), story = projection.cases[0], messages = sets.get(response.messageSetId)?.messages;
    requireEvidence(cell && response.score === cell.score && response.wordCount === (response.outputText ? words(response.outputText) : null) && response.characterCount === (response.outputText ? Array.from(response.outputText).length : null) && response.provenance.outputSha256 === (response.outputText ? hash(response.outputText) : null) && response.provenance.sourceSha256 === projection.scoreBasis.sourceSha256 && response.provenance.judgingSha256 === projection.scoreBasis.judgingSha256, "public answer or provenance changed.");
    requireEvidence(messages?.length === (response.condition === "skill" ? 2 : 1) && messages.at(-1).role === "user" && messages.at(-1).content === story.prompt && response.provenance.questionSha256 === hash(story.prompt) && response.provenance.skillSha256 === (response.condition === "skill" ? projection.methodology.skillSha256 : null), "public generation prompt or treatment changed.");
    if (response.outputText) {
      const isolation = response.runtime?.creationIsolation, provider = projection.settings.find(setting => setting.id === response.settingId)?.provider;
      requireEvidence(response.runtime?.freshSession === true && isolation?.version === STORYTELLING_CREATION_ISOLATION_VERSION && isolation.role === "creator" && isolation.toolPolicy === "progressive-frozen-skill-files" && isolation.hiddenProviderInstructionsVerified === false && isolation.hostSkillDiscovery === (provider === "codex" ? "explicitly-disabled" : "existing-claude-safe-mode-and-disabled-slash-commands"), "public creator isolation evidence changed.");
    }
    const judges = response.judgments;
    requireEvidence(judges.length === cell.coverage.completedJudgments && new Set(judges.map(judge => judge.reviewerId)).size === judges.length && judges.length <= 4 && equal(response.reviewerStatuses, cell.reviewerStatuses), "public reviewer seat repeated or omitted.");
    for (const judge of judges) {
      const profile = responseBundle.judgeProfiles.find(candidate => candidate.id === judge.reviewerId), request = requests.get(judge.requestId);
      requireEvidence(profile && judge.judgeConfigurationId === profile.configurationId && judge.contextMode === profile.contextMode && judge.contextSha256 === profile.contextSha256 && request?.profileId === profile.id && request.promptSha256 === judge.promptSha256 && request.outputSha256 === judge.answerSha256, "public judge identity or exposure changed.");
      requireEvidence(dimensions.every(d => Number.isInteger(judge.dimensions[d.id]?.rating) && judge.dimensions[d.id].rating >= 1 && judge.dimensions[d.id].rating <= 10) && judge.score === dimensions.reduce((sum, d) => sum + judge.dimensions[d.id].rating, 0), "public reviewer total differs from its ten ratings.");
      const original = originalReviews.get(request.id)?.evaluations.find(item => item.candidateId === judge.candidateId);
      requireEvidence(original && request.candidateOrder.some(candidate => candidate.candidateId === judge.candidateId && candidate.outputSha256 === response.provenance.outputSha256) && original.review === judge.rationale && original.total === judge.score && original.dimensions.every(d => equal(judge.dimensions[d.id], { rating: d.rating, reason: null, evidence: d.evidence })), "displayed review differs from the original final judgment.");
    }
    requireEvidence(cell.exactScore === (judges.length === 4 ? mean(judges.map(judge => judge.score)) : null) && dimensions.every(d => cell.dimensions[d.id] === (judges.length === 4 ? mean(judges.map(judge => judge.dimensions[d.id].rating)) : null)) && equal(cell.contextScores, contextScores(judges)) && equal(response.contextScores, cell.contextScores), "public panel or context means differ from original reviews.");
  }
  return projection;
}

export function buildStorytellingCreationPublication({ repoRootDirectory, readFileSyncImplementation = fs.readFileSync }) {
  let selection;
  try { selection = JSON.parse(readFileSyncImplementation(path.join(repoRootDirectory, STORYTELLING_CREATION_SELECTION_PATH), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
  requireEvidence(selection?.kind === "vasirbenchmark-storytelling-creation-source" && selection.schemaVersion === 1 && selection.benchmarkId === ID, "invalid source selection.");
  return projectStorytellingCreationRun({ run: readPinned(repoRootDirectory, selection.run, readFileSyncImplementation), snapshot: readPinned(repoRootDirectory, selection.skill, readFileSyncImplementation), judging: readPinned(repoRootDirectory, selection.judging, readFileSyncImplementation), contextSnapshot: readPinned(repoRootDirectory, selection.judgeContext, readFileSyncImplementation), sourceSha256: selection.run.sha256, skillSnapshotSha256: selection.skill.sha256, judgingSha256: selection.judging.sha256, contextSha256: selection.judgeContext.sha256 });
}

export function prepareStorytellingCreationPublicationSource({ repoRootDirectory, runDirectory, judgingPath }) {
  const root = path.resolve(repoRootDirectory), directory = path.resolve(runDirectory);
  requireEvidence(directory.startsWith(`${path.join(root, ".agents", "vasir-evals", ID)}${path.sep}`), "checkpoint is outside the benchmark artifact directory.");
  requireEvidence(!["run.lock", "judges.lock", "creation-judging.lock"].some(name => fs.existsSync(path.join(directory, name))), "wait for the active run or judge writer before archiving.");
  const selectedJudgingPath = path.resolve(judgingPath ?? path.join(directory, "creation-judging.json"));
  requireEvidence(path.dirname(selectedJudgingPath) === directory, "judge sidecar is outside the generation checkpoint.");
  const sources = { run: ["run.json", fs.readFileSync(path.join(directory, "run.json"), "utf8")], skill: ["skill-snapshot.json", fs.readFileSync(path.join(directory, "skill-snapshot.json"), "utf8")], judging: ["creation-judging.json", fs.readFileSync(selectedJudgingPath, "utf8")], judgeContext: ["creation-judge-context.json", fs.readFileSync(path.join(directory, "creation-judge-context.json"), "utf8")] };
  const pins = Object.fromEntries(Object.entries(sources).map(([name, [, text]]) => [name, hash(text)]));
  projectStorytellingCreationRun({ run: JSON.parse(sources.run[1]), snapshot: JSON.parse(sources.skill[1]), judging: JSON.parse(sources.judging[1]), contextSnapshot: JSON.parse(sources.judgeContext[1]), sourceSha256: pins.run, skillSnapshotSha256: pins.skill, judgingSha256: pins.judging, contextSha256: pins.judgeContext });
  const archive = `.agents/vasir-evals/${ID}/publication-snapshots/${hash(JSON.stringify(pins))}`;
  fs.mkdirSync(path.join(root, archive), { recursive: true });
  for (const [name, text] of Object.values(sources)) {
    const target = path.join(root, archive, name);
    if (fs.existsSync(target)) requireEvidence(fs.readFileSync(target, "utf8") === text, "immutable archive differs.");
    else fs.writeFileSync(target, text, { flag: "wx" });
  }
  return { kind: "vasirbenchmark-storytelling-creation-source", schemaVersion: 1, benchmarkId: ID, ...Object.fromEntries(Object.entries(sources).map(([name, [file]]) => [name, { path: `${archive}/${file}`, sha256: pins[name] }])) };
}
