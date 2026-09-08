import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { isBenchmarkAgentRuntimeReceiptCompatible } from "./agent-runtime.js";
import { createBenchmarkHash } from "./benchmark-source.js";
import { buildDungeonMasterPublication, DUNGEON_MASTER_BENCHMARK_ID, validateDungeonMasterPublication } from "./dungeon-master-publication.js";
import { buildStorytellingCreationPublication, prepareStorytellingCreationPublicationSource, STORYTELLING_CREATION_BENCHMARK_ID, validateStorytellingCreationPublication } from "./storytelling-creation-publication.js";
import { createStorytellingSkillInstruction, isStorytellingRequiredSkillReadReceiptCompatible, validateStorytellingSkillSnapshot } from "./storytelling-agent-runtime.js";
import { serializeWritingCreationResponseArchive } from "./writing-response-archives.js";

export const WRITING_BENCHMARK_ID = "storytelling-core-idea";
export const WRITING_SELECTION_PATH = "benchmarks/storytelling-core-idea/publication.json";
const HASH = /^[a-f0-9]{64}$/;
const PANEL = ["codex:gpt-6-astra@xhigh", "claude:claude-fable-5-1@max"];
export const PLOT_TWISTS_BENCHMARK_ID = "storytelling-plot-twists";
const TWISTS_PANEL = ["codex:gpt-6-astra@xhigh", "codex:gpt-5.6-sol@xhigh"];
const BENCHMARK_IDS = [WRITING_BENCHMARK_ID, PLOT_TWISTS_BENCHMARK_ID, STORYTELLING_CREATION_BENCHMARK_ID];
export const writingSelectionPath = benchmarkId => {
  requireEvidence(BENCHMARK_IDS.includes(benchmarkId), "unsupported Writing benchmark.");
  return `benchmarks/${benchmarkId}/publication.json`;
};
const CONDITIONS = [
  { id: "baseline", sourceId: "clean", short: "Plain", label: "Plain answer", color: "#72777f", shape: "circle" },
  { id: "skill", sourceId: "skill:writing-storytelling", short: "Storytelling", label: "Storytelling skill", color: "#1f6fff", shape: "square" }
];
const LABELS = {
  "gpt-6-astra": "GPT-6 Astra", "gpt-5.6-sol": "GPT-5.6 Sol", "gpt-5.6-terra": "GPT-5.6 Terra",
  "gpt-5.6-luna": "GPT-5.6 Luna", "claude-fable-5-1": "Claude Fable 5.1", "claude-opus-5": "Claude Opus 5"
};
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const finite = value => typeof value === "number" && Number.isFinite(value);
const mean = values => values.length && values.every(finite) ? values.reduce((a, b) => a + b, 0) / values.length : null;
const availableMean = values => mean(values.filter(finite));
const round = value => finite(value) ? Math.round((value + Number.EPSILON) * 10) / 10 : null;
const words = value => value.trim() ? value.trim().split(/\s+/u).length : 0;
const characters = value => Array.from(value).length;
const publicUsage = usage => Object.fromEntries([
  "inputTokens", "cachedInputTokens", "cacheWriteInputTokens", "cacheCreationInputTokens", "cacheReadInputTokens", "outputTokens", "reasoningOutputTokens", "totalTokens"
].map(field => [field, finite(usage?.[field]) && usage[field] >= 0 ? usage[field] : null]));
const key = cell => `${cell.benchmarkId}:${cell.settingId}:${cell.condition}:${cell.caseId}:${cell.trialNumber ?? 1}`;
const privateMetadata = value => /\/Users\/|file:\/\/|"(?:threadId|sessionId|session_id|cliArguments|stdout|stderr)"/u.test(JSON.stringify(value));
function requireEvidence(condition, message) {
  if (!condition) throw new Error(`Writing publication: ${message}`);
}
function relative(value) {
  requireEvidence(typeof value === "string" && value.length && !path.isAbsolute(value) && !value.includes("\\") && value.split("/").every(part => part && part !== "." && part !== ".."), "unsafe source path.");
  return value;
}
function readPinned(repoRootDirectory, pin, reader) {
  requireEvidence(HASH.test(pin?.sha256 ?? ""), "a selected source has no valid SHA-256.");
  const text = reader(path.join(repoRootDirectory, relative(pin.path)), "utf8");
  requireEvidence(digest(text) === pin.sha256, "a selected immutable source changed.");
  return JSON.parse(text);
}
function identity(configuration) {
  requireEvidence(LABELS[configuration.model] && ["codex", "claude"].includes(configuration.provider) && configuration.id === `${configuration.provider}:${configuration.model}@${configuration.reasoning}` && ["none", "low", "medium", "high", "xhigh", "max", "ultra"].includes(configuration.reasoning), "invalid or substituted model identity.");
  return {
    id: configuration.id.replace(/[^a-zA-Z0-9-]/g, "-"), configurationId: configuration.id,
    modelId: `${configuration.provider}:${configuration.model}`, provider: configuration.provider,
    family: LABELS[configuration.model], reasoning: configuration.reasoning,
    label: `${LABELS[configuration.model]} · ${configuration.reasoning}`
  };
}
function publicFailure(row) {
  if (row.rowStatus === "complete") return null;
  if (["pending", "running"].includes(row.rowStatus)) return "Generation not completed in this snapshot.";
  const code = row.error?.code;
  if (code === "EVAL_STORYTELLING_REQUIRED_READ_INCOMPLETE") return "Required frozen skill reading was not verified. The returned answer is retained for inspection but was not scored.";
  const context = row.error?.context;
  // The CLI retains only the last 2,000 stdout characters, which may not be
  // parseable JSON. Require the explicit terminal-error fields and exact API
  // result together; never publish the retained diagnostic or infer filtering
  // from a generic error, a prompt, or an answer mentioning a policy.
  if (row.provider === "claude" && code === "EVAL_AGENT_RUNTIME_FAILED" && context?.apiErrorStatus === 400 && typeof context.stdout === "string"
    && /"type"\s*:\s*"result"/u.test(context.stdout) && /"is_error"\s*:\s*true/u.test(context.stdout)
    && /"result"\s*:\s*"API Error: 400 Output blocked by content filtering policy"/u.test(context.stdout)) {
    return "Provider output filtering blocked the response; no final answer was returned or scored.";
  }
  if (/auth|oauth|authenticate|session expired/i.test(JSON.stringify(row.error ?? {}))) return "Provider authentication unavailable; no answer was scored.";
  if (/timeout/i.test(code ?? "")) return "Generation timed out; no answer was scored.";
  return row.rowStatus === "unavailable" ? "Requested configuration unavailable; no substitute was used." : "Generation failed; no answer was scored.";
}
function metrics(cells) {
  return {
    meanLatencyMs: round(mean(cells.map(cell => cell.latencyMs))),
    meanInputTokens: round(mean(cells.map(cell => cell.inputTokens))),
    meanOutputTokens: round(mean(cells.map(cell => cell.outputTokens))),
    meanTotalTokens: round(mean(cells.map(cell => cell.totalTokens))),
    meanCostUsd: null, costCoverage: "not-comparable",
    meanWordCount: round(mean(cells.map(cell => cell.wordCount)))
  };
}
const trialPairKey = cell => `${cell.settingId}:${cell.caseId}:${cell.trialNumber ?? 1}`;
function writingExecutionCoverage(cells) {
  const excludedPairs = new Set(cells.filter(cell => cell.generationDisposition === "terminal-protocol-failure").map(trialPairKey));
  const terminalGenerationFailureCount = cells.filter(cell => cell.generationDisposition === "terminal-protocol-failure").length;
  const pendingGenerationCount = cells.filter(cell => cell.generationDisposition === "unresolved").length;
  const terminallyExcludedJudgmentCount = cells.filter(cell => excludedPairs.has(trialPairKey(cell))).reduce((sum, cell) => sum + cell.coverage.expectedJudgments, 0);
  const pendingJudgmentCount = cells.filter(cell => !excludedPairs.has(trialPairKey(cell))).reduce((sum, cell) => sum + cell.coverage.expectedJudgments - cell.coverage.completedJudgments, 0);
  const executionComplete = pendingGenerationCount === 0 && pendingJudgmentCount === 0;
  return { validResponseCount: cells.filter(cell => cell.generationDisposition === "complete").length,
    terminalGenerationFailureCount, terminallyExcludedPairCount: excludedPairs.size, terminallyExcludedJudgmentCount,
    pendingGenerationCount, pendingJudgmentCount, executionComplete,
    executionStatus: executionComplete ? excludedPairs.size ? "complete-with-exclusions" : "complete" : "in-progress" };
}
function summarizePairs(cells, configurationIds, caseIds) {
  const trials = [...new Set(cells.map(cell => cell.trialNumber ?? 1))];
  const pairs = configurationIds.flatMap(settingId => caseIds.flatMap(caseId => trials.map(trialNumber => ({
    baseline: cells.find(cell => cell.settingId === settingId && cell.caseId === caseId && (cell.trialNumber ?? 1) === trialNumber && cell.condition === "baseline")?.exactScore ?? null,
    treatment: cells.find(cell => cell.settingId === settingId && cell.caseId === caseId && (cell.trialNumber ?? 1) === trialNumber && cell.condition === "skill")?.exactScore ?? null
  })))).filter(pair => finite(pair.baseline) && finite(pair.treatment));
  return {
    baseline: round(mean(pairs.map(pair => pair.baseline))), treatment: round(mean(pairs.map(pair => pair.treatment))),
    delta: round(mean(pairs.map(pair => pair.treatment - pair.baseline))),
    wins: pairs.filter(pair => pair.treatment > pair.baseline).length,
    ties: pairs.filter(pair => pair.treatment === pair.baseline).length,
    losses: pairs.filter(pair => pair.treatment < pair.baseline).length,
    usablePairs: pairs.length, expectedPairs: configurationIds.length * caseIds.length * trials.length
  };
}

// This explicitly separate view holds the judge and corpus constant while the
// original two-judge panel is unfinished. It never fills official score fields.
function coreIdeaProvisionalLeaderboard(projection, responses) {
  if (projection.benchmarks[0].id !== WRITING_BENCHMARK_ID || !responses.some(response => response.judgments.length === 1)) return null;
  const judgeConfigurationIds = [PANEL[0]];
  const caseIds = projection.cases.map(story => story.id);
  const byResponse = new Map(responses.map(response => [`${response.settingId}:${response.caseId}:${response.condition}`, response]));
  const cohorts = projection.settings.map(setting => {
    const pairs = caseIds.map(caseId => ({ caseId, ...Object.fromEntries(CONDITIONS.map(condition => {
      const response = byResponse.get(`${setting.id}:${caseId}:${condition.id}`);
      return [condition.id, response?.judgments.find(judgment => judgment.judgeConfigurationId === PANEL[0])?.score ?? null];
    })) })).filter(pair => finite(pair.baseline) && finite(pair.skill));
    const exactScores = Object.fromEntries(CONDITIONS.map(condition => [condition.id, mean(pairs.map(pair => pair[condition.id]))]));
    const exactDelta = mean(pairs.map(pair => pair.skill - pair.baseline));
    return { settingId: setting.id, configurationId: setting.configurationId, eligibleForRank: pairs.length === caseIds.length,
      completedPairCount: pairs.length, expectedPairCount: caseIds.length, includedCaseIds: pairs.map(pair => pair.caseId),
      missingCaseIds: caseIds.filter(caseId => !pairs.some(pair => pair.caseId === caseId)),
      scores: Object.fromEntries(CONDITIONS.map(condition => [condition.id, round(exactScores[condition.id])])), exactScores,
      delta: round(exactDelta), exactDelta };
  });
  const eligible = cohorts.filter(cohort => cohort.eligibleForRank);
  if (!eligible.length) return null;
  const entries = cohorts.flatMap(cohort => CONDITIONS.map(condition => {
    const exactScore = cohort.eligibleForRank ? cohort.exactScores[condition.id] : null;
    const exactDelta = cohort.eligibleForRank ? condition.id === "baseline" ? 0 : cohort.exactDelta : null;
    const original = projection.entries.find(entry => entry.settingId === cohort.settingId && entry.condition === condition.id);
    const exactBaseline = cohort.eligibleForRank ? cohort.exactScores.baseline : null;
    return { ...Object.fromEntries(["modelId", "provider", "family", "reasoning", "label", "conditionLabel"].map(field => [field, original[field]])),
      id: `${cohort.settingId}-${condition.id}`, settingId: cohort.settingId, configurationId: cohort.configurationId,
      condition: condition.id, score: round(exactScore), exactScore,
      baselineScore: round(exactBaseline),
      delta: round(exactDelta), exactDelta,
      categories: [{ category: "writing", score: round(exactScore), exactScore }],
      baselineCategories: [{ category: "writing", score: round(exactBaseline), exactScore: exactBaseline }],
      metrics: cohort.eligibleForRank ? original.metrics : null, latency: cohort.eligibleForRank ? original.latency : null,
      tokens: cohort.eligibleForRank ? original.tokens : null, cost: null,
      rank: cohort.eligibleForRank ? 1 + eligible.filter(other => other.exactScores[condition.id] > exactScore).length : null,
      eligibleForRank: cohort.eligibleForRank, completedPairCount: cohort.completedPairCount, expectedPairCount: cohort.expectedPairCount };
  }));
  const exactBaseline = mean(eligible.map(cohort => cohort.exactScores.baseline));
  const exactTreatment = mean(eligible.map(cohort => cohort.exactScores.skill));
  const exactDelta = mean(eligible.map(cohort => cohort.exactDelta));
  return { status: "provisional", label: "Astra-only provisional results", benchmarkId: WRITING_BENCHMARK_ID,
    sourceSha256: projection.scoreBasis.sourceSha256, corpusSha256: projection.methodology.corpusSha256, skillSha256: projection.methodology.skillSha256,
    officialScoreBasisId: projection.scoreBasis.id, judgeConfigurationIds, judgeCount: 1, caseIds,
    method: "equal-case-paired-complete-corpus-single-judge-mean-v1", unit: "rubric-points", range: { minimum: 10, maximum: 100 },
    detail: "GPT-6 Astra at xhigh reviews both conditions on the same complete story corpus. These single-judge results are provisional; the original two-judge scores remain separate. Incomplete story cohorts have diagnostics but no rank.",
    expectedCaseCount: caseIds.length, rankedSettingCount: eligible.length, expectedSettingCount: cohorts.length,
    entries, incompleteSettings: cohorts.filter(cohort => !cohort.eligibleForRank),
    summary: { baseline: round(exactBaseline), treatment: round(exactTreatment), delta: round(exactDelta), exactBaseline, exactTreatment, exactDelta,
      usablePairs: eligible.length * caseIds.length, expectedPairs: cohorts.length * caseIds.length } };
}

function publicJudgments(run, row, dimensions, panel = PANEL) {
  const result = [];
  for (const judge of run.judging?.judges ?? []) {
    const reviewerId = judge.configuration?.id;
    requireEvidence(panel.includes(reviewerId), "unrecognized panel seat.");
    identity(judge.configuration);
    const batches = judge.batches ?? [judge];
    const matches = batches.flatMap(batch => (batch.evaluations ?? []).filter(evaluation => evaluation.rowKey === row.rowKey).map(evaluation => ({ batch, evaluation })));
    requireEvidence(matches.length <= 1, "duplicate panel judgment for one response.");
    if (!matches.length) continue;
    const { batch, evaluation } = matches[0];
    requireEvidence(batch.status === "complete" && batch.runtimeReceipt?.freshSession === true, "a judgment lacks a complete fresh-session receipt.");
    const receipt = batch.runtimeReceipt;
    requireEvidence(isBenchmarkAgentRuntimeReceiptCompatible({ configuration: judge.configuration, runtimeReceipt: receipt }) && same(receipt.requestedConfiguration, judge.configuration) && receipt.requestedModel === judge.configuration.model && receipt.requestedReasoning === judge.configuration.reasoning && receipt.runtimeVersion === run.storytelling.runtimeVersion && receipt.userPromptSha256 === batch.promptHash && receipt.outputSha256 === digest(batch.outputText ?? "") && receipt.skillHash === null && receipt.instructionHash === null, "judge runtime identity, input, output or no-skill contract differs from its batch.");
    requireEvidence(receipt.cli === judge.configuration.provider && (judge.configuration.provider === "codex" ? receipt.nonMessageItemCount === 0 : same(receipt.allowedTools, [])), "a judge lacks the declared tool-free provider receipt.");
    requireEvidence(batch.configuration?.id === reviewerId && batch.reviewerId === judge.reviewerId && digest(batch.promptText ?? "") === batch.promptHash && digest(JSON.stringify(batch.evaluations)) === batch.evaluationHash, "judge batch identity or evidence hash changed.");
    const { evaluationHash, ...evaluationBody } = evaluation;
    requireEvidence(digest(JSON.stringify(evaluationBody)) === evaluationHash, "an original judge evaluation changed.");
    requireEvidence(run.judging.candidateOrder?.some(candidate => candidate.candidateId === evaluation.candidateId && candidate.rowKey === row.rowKey) && batch.candidateIds?.includes(evaluation.candidateId), "anonymous candidate identity differs from its source response.");
    const story = run.benchmark.definition.cases.find(candidate => candidate.id === row.caseId);
    const candidateSection = `<candidate id="${evaluation.candidateId}" case="${row.caseId}">\n<task>${story.task}</task>${story.judgeEvidence ? `\n<judge-evidence>${JSON.stringify(story.judgeEvidence)}</judge-evidence>` : ""}\n<answer>${row.outputText}</answer>\n</candidate>`;
    requireEvidence(batch.promptText.includes(candidateSection), "a judge did not receive this original answer under this candidate's identity, task and evidence.");
    let raw;
    try { raw = JSON.parse(batch.outputText.trim().replace(/^```(?:json)?\s*/u, "").replace(/\s*```$/u, "")); }
    catch { requireEvidence(false, "original judge output is not parseable JSON."); }
    const original = raw.evaluations?.find(candidate => candidate.candidateId === evaluation.candidateId);
    requireEvidence(original && String(original.reason).trim() === evaluation.reason && same(original.dimensions.map(d => ({ id: d.id, rating: d.rating })).sort((a, b) => a.id.localeCompare(b.id)), evaluation.dimensions.map(d => ({ id: d.id, rating: d.rating })).sort((a, b) => a.id.localeCompare(b.id))), "normalized judgment differs from the original judge output.");
    requireEvidence(Array.isArray(evaluation.dimensions) && evaluation.dimensions.length === dimensions.length && new Set(evaluation.dimensions.map(d => d.id)).size === dimensions.length && !(evaluation.gates?.length), "judge dimensions or gates differ from the declared rubric.");
    const scores = Object.fromEntries(dimensions.map(dimension => {
      const rating = evaluation.dimensions.find(d => d.id === dimension.id)?.rating;
      requireEvidence(Number.isInteger(rating) && rating >= 1 && rating <= 10, "an individual judge rating is outside 1–10.");
      return [dimension.id, { rating, reason: null }];
    }));
    const score = dimensions.reduce((sum, dimension) => sum + scores[dimension.id].rating * dimension.weight / 10, 0);
    requireEvidence(Math.abs(evaluation.total - score) < 0.0001, "judge total differs from the original dimension ratings.");
    result.push({ judgeConfigurationId: reviewerId, reviewerId, score, dimensions: scores, rationale: evaluation.reason ?? "", candidateId: evaluation.candidateId, promptSha256: digest(batch.promptText ?? ""), answerSha256: digest(batch.outputText ?? ""), resources: { scope: "shared-matched-pair-batch", candidateCount: batch.candidateIds.length, durationMs: finite(batch.durationMs) ? batch.durationMs : null, usage: publicUsage(batch.usage) } });
  }
  requireEvidence(new Set(result.map(judge => judge.reviewerId)).size === result.length, "panel seat duplicated.");
  return result;
}

/** Build only from frozen responses and the original independent judgments.
 * Configuration totals require both conditions on the same complete case cohort.
 * The source run stays private; public records use an explicit field allowlist.
 */
export function projectWritingRun({ run, snapshot, sourceSha256 }) {
  const benchmarkId = run?.benchmark?.definition?.id;
  const isTwists = benchmarkId === PLOT_TWISTS_BENCHMARK_ID;
  const panel = isTwists ? TWISTS_PANEL : PANEL;
  const trialCount = run?.generation?.trialCount;
  requireEvidence(run?.kind === "benchmark" && BENCHMARK_IDS.includes(benchmarkId) && benchmarkId !== STORYTELLING_CREATION_BENCHMARK_ID && ["storytelling-core-idea-v1", "storytelling-response-v2"].includes(run.storytelling?.runnerVersion), "unsupported source run.");
  requireEvidence(run.benchmark.hash === createBenchmarkHash(run.benchmark.definition), "frozen benchmark hash changed.");
  validateStorytellingSkillSnapshot(snapshot);
  requireEvidence(snapshot.hash === run.treatment?.hash && run.treatment?.id === "skill:writing-storytelling" && Number.isInteger(trialCount) && trialCount >= 1 && (isTwists || trialCount === 1), "treatment or trial contract changed.");
  requireEvidence(!String(run.benchmark.definition.status).includes("draft"), "plumbing smoke or unverified draft corpus cannot be published as measured evidence.");
  const definition = run.benchmark.definition;
  if (isTwists && definition.preRegistration) {
    requireEvidence(trialCount === definition.preRegistration.trialsPerConfigurationAndCondition && same([...run.configurations.map(configuration => configuration.id)].sort(), [...definition.preRegistration.modelSelectors].sort()), "Plot twists inventory differs from its predeclared cohort.");
    requireEvidence(run.generation.orderSeed === definition.preRegistration.generationOrderSeed && run.treatment.requiredSkillFiles?.includes("references/twists-and-revelations.md"), "Plot twists order or required reference exposure differs from its predeclared treatment.");
  }
  const dimensions = definition.scoring.dimensions.map(d => ({ id: d.id, label: d.title, title: d.title, weight: d.weight, description: d.criterion ?? d.description ?? d.criteria ?? "", anchors: d.anchors }));
  requireEvidence((isTwists ? dimensions.length === 7 : dimensions.length === 10 && dimensions.every(d => d.weight === 10)) && new Set(dimensions.map(d => d.id)).size === dimensions.length && dimensions.every(d => finite(d.weight) && d.weight > 0) && dimensions.reduce((sum, d) => sum + d.weight, 0) === 100 && definition.scoring.ratingScale?.min === 1 && definition.scoring.ratingScale?.max === 10 && !definition.scoring.gates.length, "the declared weighted 1–10 ungated rubric changed.");
  const cases = definition.cases.map(c => ({ id: c.id, benchmarkId, title: c.title ?? c.work?.title ?? definition.title, prompt: c.task, medium: c.work?.medium ?? null, version: c.work?.version ?? null, creator: c.work?.creator ?? null, familiarity: c.familiarity?.band ?? null, familiarityBasis: c.familiarity?.rationale ?? null, trainingExposure: "unknown", evidence: c.judgeEvidence }));
  requireEvidence(cases.length > 0 && new Set(cases.map(c => c.id)).size === cases.length, "empty or duplicate story cases.");
  const identities = run.configurations.map(identity);
  requireEvidence(identities.length && new Set(identities.map(setting => setting.id)).size === identities.length, "empty or duplicate model settings.");
  const expected = identities.length * cases.length * trialCount * 2;
  requireEvidence(run.rows.length === expected && new Set(run.rows.map(row => row.rowKey)).size === expected, "the declared generation inventory is incomplete or duplicated.");
  const responses = [], cells = [], messageSets = new Map();
  const root = snapshot.files.find(file => file.relativePath === "SKILL.md");
  const requiredSkillFiles = run.treatment.requiredSkillFiles ?? [];
  const rootInstruction = createStorytellingSkillInstruction({ skillSnapshot: snapshot, skillDirectoryPath: "<frozen-skill-directory>", requiredSkillFiles });
  const promptFiles = [
    { id: "frozen-skill-root", title: "Frozen skill provider instruction (temporary directory normalized)", content: rootInstruction, sha256: digest(rootInstruction) },
    ...snapshot.files.filter(file => file.relativePath !== "SKILL.md").map(file => ({
      id: `frozen-library-${digest(file.relativePath).slice(0, 16)}`,
      title: `${file.relativePath} · ${requiredSkillFiles.includes(file.relativePath) ? "mandatory verified tool read before scoring" : "available for model-selected access, not automatically injected"}`,
      content: file.contents, sha256: file.sha256
    }))
  ];
  for (const setting of identities) for (const story of cases) for (let trialNumber = 1; trialNumber <= trialCount; trialNumber += 1) for (const condition of CONDITIONS) {
    const row = run.rows.find(candidate => candidate.configurationId === setting.configurationId && candidate.caseId === story.id && candidate.conditionId === condition.sourceId && candidate.trialNumber === trialNumber);
    requireEvidence(row && row.promptText === story.prompt && same(row.exactMessages, [{ role: "user", content: story.prompt }]), "a cell is missing or the minimal user question changed.");
    const configuration = run.configurations.find(candidate => candidate.id === setting.configurationId);
    const complete = row.rowStatus === "complete";
    const protocolFailure = row.error?.code === "EVAL_STORYTELLING_REQUIRED_READ_INCOMPLETE";
    const hasOutput = complete || (protocolFailure && typeof row.outputText === "string" && Boolean(row.outputText.trim()));
    if (hasOutput) {
      requireEvidence(typeof row.outputText === "string" && row.outputText.trim() && digest(row.outputText) === row.outputHash && row.runtimeReceipt?.freshSession === true && row.runtimeReceipt?.userPromptSha256 === digest(story.prompt) && row.runtimeReceipt?.skillHash === (condition.id === "skill" ? snapshot.hash : null) && isBenchmarkAgentRuntimeReceiptCompatible({ configuration, runtimeReceipt: row.runtimeReceipt }), "a completed response changed or lacks compatible fresh-session provenance.");
      requireEvidence(row.provider === configuration.provider && row.model === configuration.model && row.reasoning === configuration.reasoning && row.runtimeReceipt.requestedModel === configuration.model && row.runtimeReceipt.requestedReasoning === configuration.reasoning && same(row.runtimeReceipt.requestedConfiguration, configuration), "requested generation identity or reasoning differs from its declared cell.");
      if (condition.id === "skill" && requiredSkillFiles.length) requireEvidence(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles, receipt: row.runtimeReceipt.requiredSkillReads, requireComplete: complete }), "required frozen skill read evidence is incompatible.");
      requireEvidence(row.runtimeReceipt.outputSha256 === row.outputHash, "response output differs from its runtime receipt.");
      requireEvidence(row.runtimeReceipt.instructionHash === (condition.id === "skill" ? digest(rootInstruction) : null), "frozen skill instruction differs from its runtime receipt.");
      requireEvidence((row.runtimeReceipt.referenceAccess?.observedPaths ?? []).every(file => snapshot.files.some(source => source.relativePath === file)), "a public reference path is not in the frozen skill manifest.");
    }
    const judgments = complete ? publicJudgments(run, row, dimensions, panel) : [];
    const exactScore = judgments.length === 2 ? mean(judgments.map(judge => judge.score)) : null;
    if (row.score) requireEvidence(finite(exactScore) && Math.abs(row.score.total - (isTwists ? round(exactScore) : exactScore)) < 0.0001, "stored aggregate does not equal the independent panel mean.");
    const ratings = Object.fromEntries(dimensions.map(d => [d.id, judgments.length === 2 ? mean(judgments.map(judge => judge.dimensions[d.id].rating)) : null]));
    const disagreement = judgments.length === 2 ? { scoreSpread: Math.abs(judgments[0].score - judgments[1].score), dimensionRanges: dimensions.map(d => ({ id: d.id, spread: Math.abs(judgments[0].dimensions[d.id].rating - judgments[1].dimensions[d.id].rating) })) } : null;
    const outputText = hasOutput ? row.outputText : "";
    const status = finite(exactScore) ? "scored" : complete ? "unscored" : row.rowStatus;
    const cell = {
      settingId: setting.id, configurationId: setting.configurationId, condition: condition.id,
      benchmarkId, caseId: story.id, trialNumber, category: "writing", status,
      score: round(exactScore), exactScore, dimensions: ratings, trials: 1, calibrated: false,
      latencyMs: hasOutput ? row.durationMs : null, inputTokens: hasOutput ? row.usage?.inputTokens ?? null : null,
      outputTokens: hasOutput ? row.usage?.outputTokens ?? null : null, totalTokens: hasOutput ? row.usage?.totalTokens ?? null : null,
      costUsd: null, wordCount: hasOutput ? words(outputText) : null, disagreement,
      coverage: { expectedJudgments: 2, completedJudgments: judgments.length, expectedResponses: 1, completedResponses: hasOutput ? 1 : 0 },
      failureReason: publicFailure(row), attemptCount: row.attempts?.length ?? 1
    };
    if (isTwists) cell.generationDisposition = complete ? "complete" : protocolFailure ? "terminal-protocol-failure" : "unresolved";
    cell.metrics = metrics([cell]); cells.push(cell);
    const messages = [...(condition.id === "skill" ? [{ role: configuration.provider === "codex" ? "developer" : "system", content: "Frozen storytelling skill provider instruction; see shared Method source. Temporary directory is normalized for privacy.", fileId: "frozen-skill-root" }] : []), { role: "user", content: story.prompt }];
    const messageSetId = digest(JSON.stringify(messages)); messageSets.set(messageSetId, { id: messageSetId, messages });
    responses.push({ benchmarkId, caseId: story.id, settingId: setting.id, configurationId: setting.configurationId, condition: condition.id, trialNumber, messageSetId, outputText, wordCount: cell.wordCount, status, failureReason: cell.failureReason, judgments, disagreement, score: cell.score, provenance: { sourceSha256, outputSha256: hasOutput ? row.outputHash : null, questionSha256: digest(story.prompt), skillSha256: condition.id === "skill" ? snapshot.hash : null }, runtime: hasOutput ? { freshSession: true, modelVerification: row.runtimeReceipt.modelVerification, reasoningVerification: row.runtimeReceipt.reasoningVerification, executionMode: row.runtimeReceipt.executionMode, referenceFilesRead: row.runtimeReceipt.referenceAccess?.observedPaths ?? [] } : null });
  }
  for (const response of responses) {
    response.characterCount = response.outputText ? characters(response.outputText) : null;
    if (response.runtime) {
      const row = run.rows.find(candidate => candidate.configurationId === response.configurationId && candidate.caseId === response.caseId && candidate.conditionId === (response.condition === "skill" ? "skill:writing-storytelling" : "clean") && candidate.trialNumber === response.trialNumber);
      response.runtime.observedCollaborationEvents = row.runtimeReceipt.itemTypeCounts?.collab_tool_call ?? 0;
      response.runtime.rawProviderStreamRetained = false;
      response.runtime.durationMs = row.durationMs;
      response.runtime.usage = publicUsage(row.usage);
      if (row.runtimeReceipt.requiredSkillReads) {
        const receipt = row.runtimeReceipt.requiredSkillReads;
        response.runtime.requiredSkillReads = {
          policyVersion: receipt.policyVersion, requiredFiles: receipt.requiredFiles, evidence: receipt.evidence, status: receipt.status,
          files: receipt.files.map(file => ({ relativePath: file.relativePath, sha256: file.sha256, bytes: file.bytes, requiredChunkCount: file.requiredChunkCount, complete: file.complete,
            observedChunks: file.observedChunks.map(chunk => ({ index: chunk.index, bytes: chunk.bytes, sha256: chunk.sha256 })) }))
        };
      }
    }
  }
  const aggregates = [], settings = identities.map(setting => {
    const cohort = cells.filter(cell => cell.settingId === setting.id);
    // Both arms need the identical, complete corpus to enter either leaderboard.
    const pairComplete = cohort.length === cases.length * trialCount * 2 && cohort.every(cell => finite(cell.exactScore));
    const scores = {}, settingMetrics = {}, coverage = {};
    for (const condition of CONDITIONS) {
      const members = cohort.filter(cell => cell.condition === condition.id);
      const exactScore = pairComplete ? mean(members.map(cell => cell.exactScore)) : null;
      scores[condition.id] = round(exactScore); settingMetrics[condition.id] = metrics(members);
      coverage[condition.id] = { expectedCases: cases.length * trialCount, scoredCases: members.filter(cell => finite(cell.score)).length, completedResponses: members.filter(cell => cell.coverage.completedResponses).length, expectedResponses: cases.length * trialCount, completedJudgments: members.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0), expectedJudgments: cases.length * trialCount * 2 };
      aggregates.push({ settingId: setting.id, configurationId: setting.configurationId, condition: condition.id, benchmarkId, category: "writing", score: round(exactScore), exactScore, status: pairComplete ? "scored" : "incomplete", dimensions: Object.fromEntries(dimensions.map(d => [d.id, pairComplete ? mean(members.map(cell => cell.dimensions[d.id])) : null])), metrics: settingMetrics[condition.id], coverage: coverage[condition.id], trials: 1, calibrated: false });
    }
    return { ...setting, scores, deltas: { skill: pairComplete ? round(aggregates.at(-1).exactScore - aggregates.at(-2).exactScore) : null }, metrics: settingMetrics, coverage, categories: Object.fromEntries(CONDITIONS.map(condition => [condition.id, [{ category: "writing", score: scores[condition.id], exactScore: aggregates.find(aggregate => aggregate.settingId === setting.id && aggregate.condition === condition.id).exactScore }]])) };
  });
  const entries = settings.flatMap(setting => CONDITIONS.map(condition => ({ id: `${setting.id}-${condition.id}`, settingId: setting.id, configurationId: setting.configurationId, modelId: setting.modelId, provider: setting.provider, family: setting.family, reasoning: setting.reasoning, label: setting.label, condition: condition.id, conditionLabel: condition.label, score: setting.scores[condition.id], baselineScore: setting.scores.baseline, delta: condition.id === "baseline" ? (finite(setting.scores.baseline) ? 0 : null) : setting.deltas.skill, categories: setting.categories[condition.id], baselineCategories: setting.categories.baseline, metrics: setting.metrics[condition.id], cost: null, latency: setting.metrics[condition.id].meanLatencyMs === null ? null : setting.metrics[condition.id].meanLatencyMs / 1000, tokens: setting.metrics[condition.id].meanOutputTokens, coverage: setting.coverage[condition.id] })));
  for (const entry of entries) {
    const exact = aggregates.find(cell => cell.settingId === entry.settingId && cell.condition === entry.condition).exactScore;
    entry.exactScore = exact;
    entry.rank = finite(exact) ? 1 + aggregates.filter(cell => cell.condition === entry.condition && finite(cell.exactScore) && cell.exactScore > exact).length : null;
  }
  const completeSettings = settings.filter(setting => finite(setting.scores.baseline) && finite(setting.scores.skill));
  const summary = summarizePairs(cells, completeSettings.map(setting => setting.id), cases.map(story => story.id));
  const allPairs = summarizePairs(cells, settings.map(setting => setting.id), cases.map(story => story.id));
  const coverage = { benchmarkCount: 1, caseCount: cases.length, settingCount: settings.length, completedSettingCount: completeSettings.length, responseCount: cells.filter(cell => cell.coverage.completedResponses).length, expectedResponseCount: expected, scoredResponseCount: cells.filter(cell => finite(cell.score)).length, usablePairs: allPairs.usablePairs, expectedPairs: expected / 2, judgmentCount: responses.reduce((sum, response) => sum + response.judgments.length, 0), expectedJudgmentCount: expected * 2 };
  if (isTwists) {
    Object.assign(coverage, writingExecutionCoverage(cells));
    const excludedPairs = new Set(cells.filter(cell => cell.generationDisposition === "terminal-protocol-failure").map(trialPairKey));
    for (const cell of cells) {
      const excluded = excludedPairs.has(trialPairKey(cell));
      requireEvidence(!excluded || cell.coverage.completedJudgments === 0 && cell.exactScore === null, "a terminally excluded trial pair acquired a judgment.");
      cell.judgingDisposition = excluded ? "terminal-excluded" : cell.coverage.completedJudgments === 2 ? "complete" : "pending";
      const response = responses.find(response => key(response) === key(cell));
      response.generationDisposition = cell.generationDisposition;
      response.judgingDisposition = cell.judgingDisposition;
    }
  }
  const availability = { status: "development", verification: "unverified", code: "development-uncalibrated", message: "Exploratory model-judged results", detail: "One trial per story and condition. Human calibration is pending; Writing is not included in Overall.", blockers: [{ code: "human-calibration-pending", message: "Not calibrated against a human panel." }] };
  const scoreBasis = { id: `${definition.edition}:${run.benchmark.scoringHash}`, label: "Storytelling · Core idea v1", edition: definition.edition, method: "equal-case-paired-complete-cohort-mean-v1", unit: "rubric-points", range: { minimum: 10, maximum: 100 }, benchmarkIds: [benchmarkId], taskCount: cases.length, trialsPerTask: trialCount, judgeCount: 2, judges: panel, dimensions, weights: Object.fromEntries(dimensions.map(d => [d.id, d.weight])), ratingMaximum: 10, ratingMinimum: 1, gates: null, caps: null, aggregation: "mean-independent-dimension-ratings-no-gates-v1", batchUnit: "matched-pair", calibrationStatus: "development-uncalibrated", panelMethod: "Two independent provider judges; mean ratings, with each judgment retained.", blinding: "Opaque candidate IDs and deterministic hash-based order; model, condition, skill and configuration labels withheld from judges. Both judges see the same within-pair order; no order-swapped replication is performed. Writing style can still reveal a condition.", sourceSha256, coverage, uncertainty: { status: "not-estimated", reason: "One trial per curated case; no population-level confidence claim." } };
  const methodology = { corpusSha256: run.benchmark.hash, skillSha256: snapshot.hash, corpus: cases.map(story => ({ id: story.id, title: story.title, sha256: digest(story.prompt) })), skillFiles: snapshot.files.map(file => ({ path: file.relativePath, sha256: file.sha256, bytes: file.bytes })), generationContract: "Same exact user question in fresh isolated CLI sessions. Plain: no storytelling instruction. Skill: frozen SKILL.md in a provider instruction and progressively accessible frozen reference files. No supplied story texts, browsing, word cap, or answer template. Skill reference use is model-selected. Provider tooling differs; model/effort request verification is reported separately from provider confirmation.", blinding: scoreBasis.blinding, limitations: definition.limitations };
  scoreBasis.panelMethod = "Each judge scores ten equally weighted dimensions from 1 to 10; their sum is 10–100. The response score is the mean of the two independent judge totals. Configuration scores average the same complete case corpus in both conditions; there are no gates, caps or missing-score imputations.";
  methodology.generationContract += " Ultra is a runtime mode, not an effort-only control; collaboration events can occur, and a CLI session does not establish the number of underlying model agents. Parsed receipts, final answers and stream hashes are retained, but complete raw provider streams and provider-internal base instructions are not available for reconstruction.";
  methodology.execution = { runnerVersion: run.storytelling.runnerVersion, runtimeVersion: run.storytelling.runtimeVersion, harnessVersion: run.harnessVersion, trialCount: run.generation.trialCount, generationOrderPolicy: run.generation.orderPolicy, generationOrderSeed: run.generation.orderSeed };
  methodology.resourceAccounting = "Generation resource counts belong to each answer. Judge resource counts belong to the entire matched-pair batch and are repeated on its two answer records for inspection; count each judge/promptSha256 once when totaling them. Counts are the saved CLI-normalized usage, not a reconstructed provider bill, and are not directly comparable across tokenizers. The original normalizer replaced missing token components with zero; a saved zero therefore does not prove that the provider reported zero. Fields absent from the saved receipt remain null. Claude cache creation/read and Codex cache write/cached-input fields retain their distinct names. Cached and reasoning counts are components, not extra amounts to add to saved totals. Character counts use Unicode code points, not grapheme clusters.";
  const benchmark = { id: benchmarkId, trackId: "storytelling", familyId: "writing", category: "writing", suite: "Storytelling", name: "Core idea", title: "Core idea", description: definition.description, taskKind: "story-interpretation", prompt: "What is the core idea of [specified story]?", judging: { panel, synthesizer: null }, limitations: definition.limitations, reportFragment: benchmarkId, detailHref: `benchmark-report.html#${benchmarkId}`, evidenceKind: "development", resultAvailability: availability, measured: { ...summary, complete: coverage.scoredResponseCount, total: expected, treatmentLabel: "Storytelling skill", calibration: "Human calibration pending" } };
  const trialSummaries = cases.flatMap(story => Array.from({ length: trialCount }, (_, index) => ({ caseId: story.id, benchmarkId, trialNumber: index + 1, ...summarizePairs(cells.filter(cell => cell.trialNumber === index + 1), settings.map(setting => setting.id), [story.id]) })));
  const caseSummaries = cases.map(story => ({ caseId: story.id, benchmarkId, ...summarizePairs(cells, settings.map(setting => setting.id), [story.id]), complete: cells.filter(cell => cell.caseId === story.id && finite(cell.score)).length, total: settings.length * trialCount * 2, detailHref: `benchmark-report.html#${benchmarkId}/${story.id}` }));
  const counts = { families: 1, tracks: 1, benchmarks: 1, categories: 1, cases: cases.length, conditions: 2, settings: settings.length, resultEntries: entries.length, responses: coverage.responseCount, developmentResultSets: 1, eligibleResultSets: 0, withheldResultSets: 0 };
  const leader = entries.filter(entry => entry.condition === "skill" && finite(entry.score)).sort((a, b) => a.rank - b.rank || a.configurationId.localeCompare(b.configurationId))[0];
  const projection = { kind: "vasirbenchmark-writing-projection", schemaVersion: 1, program: { id: "vasirbench", title: "VasirBench", status: "development", evidenceStatus: "development", verification: "unverified" }, trialCount, caseLabel: isTwists ? "prompt" : "story", trialLabel: "Trial", meta: { release: "Development snapshot · September 2026", status: "Exploratory model-judged results", categories: 1, benchmarks: 1, settings: settings.length, conditions: 2, trials: trialCount, aggregateCells: expected, runs: 1, calibration: 0 }, scoreBasis, conditions: CONDITIONS, categories: [{ id: "writing", name: "Writing", title: "Writing", short: "WRITE", weight: 1, color: "#b65a31", trackIds: ["storytelling"] }], families: [{ id: "writing", title: "Writing", description: "Storytelling, with future prose and poetry benchmarks.", trackIds: ["storytelling"] }], tracks: [{ id: "storytelling", familyId: "writing", title: "Storytelling", description: "Understanding and creating narrative. This first benchmark tests explanations of a story's core idea.", benchmarkIds: [benchmarkId], resultAvailability: availability }], benchmarks: [benchmark], results: [{ benchmarkId, runId: run.runId, status: "development", verification: "unverified", baselineScore: summary.baseline, treatmentScore: summary.treatment, delta: summary.delta, responseCount: coverage.responseCount, matchedConfigurationCount: completeSettings.length, coverage }], settings, entries, benchmarkResults: aggregates, benchmarkSummaries: [{ benchmarkId, runId: run.runId, status: "development", verification: "unverified", evidenceKind: "development", baselineLabel: "Plain answer", treatmentLabel: "Storytelling skill", ...summary, complete: coverage.scoredResponseCount, total: expected, completionLabel: "scored responses", calibration: "Human calibration pending", detailHref: benchmark.detailHref, sourceHref: null }], cases, caseSummaries, trialSummaries, caseResults: cells, methodology, coverage, categoryLeaders: leader ? [{ category: "writing", entry: { ...leader, categoryScore: leader.score } }] : [], efficientFrontier: [], regressions: entries.filter(entry => entry.condition === "skill" && finite(entry.delta) && entry.delta < 0), callouts: { overall: "Writing is reported separately and does not change Overall.", value: "Quality, length and latency are separate; provider cost coverage is not comparable.", regression: "Case-level losses remain visible even when the corpus average improves.", category: "One interpretation benchmark, twelve curated stories—not a score for all writing." }, availability, counts };
  const responseBundle = { kind: "vasirbenchmark-writing-responses", schemaVersion: 1, counts: { ...coverage, responses: responses.length, messageSets: messageSets.size, judgments: coverage.judgmentCount }, promptFiles, messageSets: [...messageSets.values()], responses };
  const stub = { kind: "vasirbenchmark-writing-summary", status: coverage.scoredResponseCount ? "measured" : "unscored", dataHref: "./writing-data.js", responsesHref: "./writing-responses.js", category: { id: "writing", name: "Writing", short: "WRITE" }, benchmarkId, benchmarkTitle: "Core idea", subsections: [{ id: "storytelling", title: "Storytelling", status: coverage.scoredResponseCount ? "measured" : "unscored" }, { id: "prose", title: "Prose", status: "unscored" }, { id: "poetry", title: "Poetry", status: "unscored" }], coverage, scoreBasisLabel: scoreBasis.label, treatmentLabel: "Storytelling skill", ...(leader ? { leader: { id: leader.id, settingId: leader.settingId, family: leader.family, reasoning: leader.reasoning, score: leader.score } } : {}) };
  if (isTwists) {
    benchmark.name = definition.title;
    benchmark.title = definition.title;
    benchmark.prompt = cases[0].prompt;
    benchmark.taskKind = "story-outline";
    stub.benchmarkTitle = definition.title;
    scoreBasis.label = `Storytelling · ${definition.title} v1`;
    stub.scoreBasisLabel = scoreBasis.label;
    scoreBasis.method = "equal-trial-paired-complete-cohort-mean-v1";
    scoreBasis.panelMethod = `Each judge scores ${dimensions.length} weighted dimensions from 1 to 10. An answer score is the mean of the two judges’ weighted 10–100 totals. Configuration scores average all ${trialCount} predeclared trials in both conditions; there are no gates, caps or missing-score imputations.`;
    scoreBasis.uncertainty = { status: "descriptive-repeated-trials", reason: "Repeated generations of one exact prompt measure variation within this task; they do not establish general writing ability or uncertainty over prompts and judges." };
    if (definition.preRegistration?.bootstrap) {
      const bootstrap = definition.preRegistration.bootstrap;
      scoreBasis.uncertainty = { status: "paired-bootstrap-protocol", protocol: Object.fromEntries([
        "method", "replicates", "seed", "generator", "intervalPercentiles", "quantileMethod", "seedPolicy", "resamplingUnit", "incompleteCohortPolicy", "interpretation"
      ].filter(field => Object.hasOwn(bootstrap, field)).map(field => [field, bootstrap[field]])),
      reason: `The predeclared exploratory 95% percentile bootstrap resamples complete trial pairs ${bootstrap.replicates.toLocaleString("en-US")} times within each configuration, after averaging the two original judges for each answer, using seed ${bootstrap.seed} reset per configuration. Intervals and the declared-cohort effect require all ${trialCount} trial pairs; partial cohorts retain separately labeled diagnostics. The interval describes repeated-generation variability conditional on this exact prompt, treatment and panel, not uncertainty over prompts, judges or readers.` };
    }
    availability.detail = `${trialCount} fresh trials per prompt and condition. Human calibration is pending; Writing is not included in Overall.`;
    methodology.generationContract = definition.preRegistration?.generationContract ?? definition.generationContract ?? "The exact user prompt is unchanged in fresh isolated sessions. The treatment adds the frozen storytelling root instruction and progressively accessible frozen references; observed reference reads are reported. Generation and judges use the predeclared configurations. No revisions or output selection are performed.";
    if (requiredSkillFiles.length) {
      methodology.requiredSkillFiles = requiredSkillFiles;
      methodology.requiredSkillReadPolicyVersion = run.treatment.requiredSkillReadPolicyVersion;
      methodology.generationContract += " Every skill-condition answer must have byte-verified successful tool reads of the required frozen files before it can be scored. Missing-read answers remain visible as unscored protocol failures.";
    }
    methodology.resourceAccounting += " Trial pairs are separate fresh generations, not shared model sampling seeds.";
    projection.tracks[0].description = "Understanding and creating narrative; this benchmark tests a brief science-fiction outline with major plot twists.";
    projection.callouts.category = "One exact outline prompt with repeated trials; not a score for all writing.";
    for (const aggregate of aggregates) aggregate.trials = trialCount;
  }
  if (!isTwists) projection.provisionalLeaderboard = coreIdeaProvisionalLeaderboard(projection, responses);
  validateWritingPublication(projection, responseBundle);
  return { projection, responseBundle, stub, basisSha256: digest(JSON.stringify({ sourceSha256, skillSha256: snapshot.hash, corpusSha256: run.benchmark.hash })) };
}

export function validateWritingSummary(stub) {
  if (stub?.additionalBenchmarks) {
    const { additionalBenchmarks, allWritingCoverage, ...existing } = stub;
    requireEvidence(same(Object.keys(additionalBenchmarks), [DUNGEON_MASTER_BENCHMARK_ID]), "unknown additional Writing benchmark.");
    const descriptor = additionalBenchmarks[DUNGEON_MASTER_BENCHMARK_ID];
    const existingBenchmarks = existing.benchmarks.filter(benchmark => benchmark.id !== DUNGEON_MASTER_BENCHMARK_ID);
    const defaultStub = { ...existing, benchmarks: existingBenchmarks, benchmarkIds: existingBenchmarks.map(benchmark => benchmark.id), collectionCoverage: writingCollectionCoverage(existingBenchmarks) };
    validateWritingSummary(defaultStub);
    requireEvidence(descriptor.benchmarkId === DUNGEON_MASTER_BENCHMARK_ID && descriptor.subcategory === "dungeon-master" && descriptor.coverage?.expectedResponseCount === 32 && descriptor.coverage?.expectedJudgmentCount === 64 && stub.benchmarkIds.includes(DUNGEON_MASTER_BENCHMARK_ID), "invalid additional Writing descriptor.");
    requireEvidence(same(allWritingCoverage, writingCollectionCoverage([...existingBenchmarks, descriptor])), "additional Writing summary coverage differs.");
    return stub;
  }
  requireEvidence(stub?.kind === "vasirbenchmark-writing-summary" && BENCHMARK_IDS.includes(stub.benchmarkId) && stub.dataHref === "./writing-data.js" && stub.responsesHref === "./writing-responses.js" && stub.coverage?.settingCount > 0 && stub.coverage?.caseCount > 0 && stub.coverage.benchmarkCount === 1, "invalid public Writing summary.");
  requireEvidence(stub.coverage.responseCount <= stub.coverage.expectedResponseCount && stub.coverage.scoredResponseCount <= stub.coverage.responseCount, "summary coverage exceeds the matrix.");
  if (stub.benchmarks) {
    requireEvidence(Array.isArray(stub.benchmarks) && stub.benchmarks.length > 0 && same(stub.benchmarkIds, stub.benchmarks.map(benchmark => benchmark.id)) && new Set(stub.benchmarkIds).size === stub.benchmarkIds.length && stub.benchmarkIds.every(id => BENCHMARK_IDS.includes(id)) && stub.benchmarkIds[0] === stub.benchmarkId, "invalid Writing benchmark collection summary.");
    requireEvidence(same(stub.benchmarks[0].coverage, stub.coverage) && same(stub.collectionCoverage, writingCollectionCoverage(stub.benchmarks)), "Writing collection summary coverage differs from its benchmarks.");
  }
  return stub;
}

export function validateWritingPublication(projection, responseBundle) {
  if (projection?.additionalBenchmarks) {
    const { additionalBenchmarks, allWritingCoverage, ...existing } = projection;
    const { additionalBenchmarks: additionalResponses, ...existingResponses } = responseBundle ?? {};
    requireEvidence(same(Object.keys(additionalBenchmarks), [DUNGEON_MASTER_BENCHMARK_ID]) && (!responseBundle || same(Object.keys(additionalResponses ?? {}), [DUNGEON_MASTER_BENCHMARK_ID])), "additional Writing archives differ from their selections.");
    validateWritingPublication(existing, responseBundle ? existingResponses : undefined);
    validateDungeonMasterPublication(additionalBenchmarks[DUNGEON_MASTER_BENCHMARK_ID], additionalResponses?.[DUNGEON_MASTER_BENCHMARK_ID]);
    requireEvidence(same(allWritingCoverage, combinedWritingCoverage(existing, additionalBenchmarks[DUNGEON_MASTER_BENCHMARK_ID])), "additional Writing coverage differs from its sources.");
    return projection;
  }
  if (projection?.benchmarkPublications) {
    const children = projection.benchmarkPublications;
    const { benchmarkPublications, collectionCoverage, ...defaultProjection } = projection;
    const { benchmarkResponses, ...defaultArchive } = responseBundle ?? {};
    const ids = [defaultProjection.benchmarks?.[0]?.id, ...children.map(child => child.benchmarkId)];
    requireEvidence(Array.isArray(children) && new Set(ids).size === ids.length, "duplicate Writing benchmark selections.");
    if (responseBundle) requireEvidence(Array.isArray(benchmarkResponses) && benchmarkResponses.length === children.length && new Set(benchmarkResponses.map(child => child.benchmarkId)).size === children.length, "Writing archive collection differs from benchmark selections.");
    validateWritingPublication(defaultProjection, responseBundle ? defaultArchive : undefined);
    for (const child of children) {
      requireEvidence(child.benchmarkId === child.projection?.benchmarks?.[0]?.id && !child.projection.benchmarkPublications, "Writing child benchmark identity differs.");
      const archive = benchmarkResponses?.find(candidate => candidate.benchmarkId === child.benchmarkId)?.responseBundle;
      if (responseBundle) requireEvidence(archive, "Writing benchmark archive is missing.");
      validateWritingPublication(child.projection, archive);
    }
    requireEvidence(same(collectionCoverage, writingCollectionCoverage([defaultProjection, ...children.map(child => child.projection)])), "Writing collection coverage differs from selected sources.");
    return projection;
  }
  const benchmarkId = projection?.benchmarks?.[0]?.id;
  if (benchmarkId === STORYTELLING_CREATION_BENCHMARK_ID) return validateStorytellingCreationPublication(projection, responseBundle);
  const panel = benchmarkId === PLOT_TWISTS_BENCHMARK_ID ? TWISTS_PANEL : PANEL;
  const trialCount = projection?.trialCount ?? 1;
  requireEvidence(projection?.kind === "vasirbenchmark-writing-projection" && projection.schemaVersion === 1 && projection.benchmarks?.length === 1 && BENCHMARK_IDS.includes(benchmarkId) && projection.scoreBasis?.dimensions?.length === (benchmarkId === PLOT_TWISTS_BENCHMARK_ID ? 7 : 10) && same(projection.scoreBasis.judges, panel), "invalid public Writing projection.");
  const cells = projection.caseResults;
  requireEvidence(Array.isArray(cells) && cells.length === projection.settings.length * projection.cases.length * trialCount * 2 && new Set(cells.map(key)).size === cells.length, "invalid case/setting/condition coverage.");
  for (const cell of cells) {
    requireEvidence(cell.benchmarkId === benchmarkId && projection.cases.some(story => story.id === cell.caseId) && projection.settings.some(setting => setting.id === cell.settingId) && CONDITIONS.some(condition => condition.id === cell.condition) && Number.isInteger(cell.trialNumber ?? 1) && (cell.trialNumber ?? 1) >= 1 && (cell.trialNumber ?? 1) <= trialCount, "invalid public trial identity.");
    const score = cell.coverage.completedJudgments === 2 ? projection.scoreBasis.dimensions.reduce((sum, dimension) => sum + cell.dimensions[dimension.id] * dimension.weight / 10, 0) : null;
    requireEvidence((cell.exactScore === score || finite(cell.exactScore) && finite(score) && Math.abs(cell.exactScore - score) < 1e-10) && cell.score === round(score), "a public score differs from the dimension mean.");
  }
  if (benchmarkId === PLOT_TWISTS_BENCHMARK_ID) {
    requireEvidence(cells.every(cell => ["complete", "terminal-protocol-failure", "unresolved"].includes(cell.generationDisposition)), "invalid generation disposition.");
    const execution = writingExecutionCoverage(cells);
    requireEvidence(Object.entries(execution).every(([field, value]) => projection.coverage[field] === value), "execution status differs from terminal exclusions and unresolved work.");
    requireEvidence(projection.coverage.judgmentCount + execution.terminallyExcludedJudgmentCount + execution.pendingJudgmentCount === projection.coverage.expectedJudgmentCount, "review accounting does not preserve the planned denominator.");
    const excludedPairs = new Set(cells.filter(cell => cell.generationDisposition === "terminal-protocol-failure").map(trialPairKey));
    for (const cell of cells) {
      const excluded = excludedPairs.has(trialPairKey(cell));
      requireEvidence(cell.judgingDisposition === (excluded ? "terminal-excluded" : cell.coverage.completedJudgments === 2 ? "complete" : "pending") && (!excluded || cell.coverage.completedJudgments === 0 && cell.exactScore === null), "terminal exclusion or judgment disposition differs from the trial pair.");
    }
  }
  for (const aggregate of projection.benchmarkResults) {
    const cohort = cells.filter(cell => cell.settingId === aggregate.settingId);
    const complete = cohort.every(cell => finite(cell.exactScore));
    const score = complete ? mean(cohort.filter(cell => cell.condition === aggregate.condition).map(cell => cell.exactScore)) : null;
    requireEvidence(aggregate.exactScore === score && aggregate.score === round(score), "an incomplete or mismatched corpus was ranked.");
  }
  for (const setting of projection.settings) {
    const baseline = projection.benchmarkResults.find(cell => cell.settingId === setting.id && cell.condition === "baseline");
    const skill = projection.benchmarkResults.find(cell => cell.settingId === setting.id && cell.condition === "skill");
    requireEvidence(baseline && skill && baseline.configurationId === setting.configurationId && skill.configurationId === setting.configurationId && setting.scores.baseline === baseline.score && setting.scores.skill === skill.score && setting.deltas.skill === (finite(baseline.exactScore) && finite(skill.exactScore) ? round(skill.exactScore - baseline.exactScore) : null), "a setting changes its scores, paired difference or identity.");
  }
  for (const entry of projection.entries) {
    const aggregate = projection.benchmarkResults.find(cell => cell.settingId === entry.settingId && cell.condition === entry.condition);
    requireEvidence(aggregate && entry.configurationId === aggregate.configurationId && entry.score === aggregate.score && entry.exactScore === aggregate.exactScore, "a leaderboard entry changes its aggregate or model identity.");
    const rank = finite(aggregate.exactScore) ? 1 + projection.benchmarkResults.filter(cell => cell.condition === entry.condition && finite(cell.exactScore) && cell.exactScore > aggregate.exactScore).length : null;
    requireEvidence(entry.rank === rank, "a leaderboard rank ignores an exact tie or missing score.");
  }
  if (projection.provisionalLeaderboard) {
    const provisional = projection.provisionalLeaderboard;
    requireEvidence(benchmarkId === WRITING_BENCHMARK_ID && provisional.status === "provisional" && provisional.benchmarkId === benchmarkId
      && same(provisional.judgeConfigurationIds, [PANEL[0]]) && provisional.judgeCount === 1
      && provisional.sourceSha256 === projection.scoreBasis.sourceSha256 && provisional.corpusSha256 === projection.methodology.corpusSha256
      && provisional.skillSha256 === projection.methodology.skillSha256 && provisional.officialScoreBasisId === projection.scoreBasis.id
      && same(provisional.caseIds, projection.cases.map(story => story.id)) && provisional.expectedCaseCount === projection.cases.length
      && provisional.expectedSettingCount === projection.settings.length
      && provisional.method === "equal-case-paired-complete-corpus-single-judge-mean-v1", "provisional judge, corpus or source basis changed.");
    requireEvidence(Array.isArray(provisional.entries) && provisional.entries.length === projection.entries.length
      && new Set(provisional.entries.map(entry => entry.id)).size === provisional.entries.length, "provisional entry inventory changed.");
    for (const entry of provisional.entries) {
      const original = projection.entries.find(candidate => candidate.id === entry.id);
      requireEvidence(original && original.configurationId === entry.configurationId && original.settingId === entry.settingId && original.condition === entry.condition
        && entry.expectedPairCount === provisional.expectedCaseCount && Number.isInteger(entry.completedPairCount) && entry.completedPairCount >= 0
        && entry.completedPairCount <= entry.expectedPairCount && entry.eligibleForRank === (entry.completedPairCount === entry.expectedPairCount), "provisional entry identity or paired coverage changed.");
      const rank = entry.eligibleForRank ? 1 + provisional.entries.filter(other => other.condition === entry.condition && other.eligibleForRank && other.exactScore > entry.exactScore).length : null;
      requireEvidence(entry.rank === rank && entry.score === round(entry.exactScore)
        && (entry.eligibleForRank ? finite(entry.exactScore) && finite(entry.delta) : entry.exactScore === null && entry.delta === null && entry.exactDelta === null && entry.baselineScore === null), "provisional rank includes an incomplete corpus or changes an exact tie.");
    }
    requireEvidence(provisional.rankedSettingCount === provisional.entries.filter(entry => entry.condition === "skill" && entry.eligibleForRank).length, "provisional ranked coverage changed.");
  }
  requireEvidence(!privateMetadata(projection), "public metadata exposes private runtime details.");
  if (responseBundle) {
    requireEvidence(responseBundle.kind === "vasirbenchmark-writing-responses" && responseBundle.responses.length === cells.length && new Set(responseBundle.responses.map(key)).size === cells.length, "response coverage differs from the public matrix.");
    requireEvidence(!privateMetadata(responseBundle), "public response metadata exposes private runtime details.");
    const messageSets = new Map(responseBundle.messageSets.map(set => [set.id, set]));
    requireEvidence(messageSets.size === responseBundle.messageSets.length && [...messageSets.values()].every(set => set.id === digest(JSON.stringify(set.messages))), "public input message set changed.");
    const promptFiles = new Map(responseBundle.promptFiles.map(file => [file.id, file]));
    requireEvidence(promptFiles.size === responseBundle.promptFiles.length && [...promptFiles.values()].every(file => file.sha256 === digest(file.content)), "shared public instruction content changed.");
    for (const response of responseBundle.responses) {
      const cell = cells.find(candidate => key(candidate) === key(response));
      if (benchmarkId === PLOT_TWISTS_BENCHMARK_ID) requireEvidence(response.generationDisposition === cell?.generationDisposition && response.judgingDisposition === cell?.judgingDisposition, "response disposition differs from its original trial cell.");
      requireEvidence(cell && response.score === cell.score && response.judgments.length === cell.coverage.completedJudgments && response.wordCount === (response.outputText ? words(response.outputText) : null), "public response changed its score, length or panel coverage.");
      requireEvidence(response.characterCount === (response.outputText ? characters(response.outputText) : null), "public response changed its Unicode character count.");
      requireEvidence(response.configurationId === cell.configurationId && response.benchmarkId === benchmarkId && Number.isInteger(response.trialNumber) && response.trialNumber >= 1 && response.trialNumber <= trialCount && messageSets.has(response.messageSetId), "public response identity or input reference changed.");
      const story = projection.cases.find(candidate => candidate.id === response.caseId);
      const messages = messageSets.get(response.messageSetId).messages;
      requireEvidence(messages.length === (response.condition === "skill" ? 2 : 1) && messages.at(-1).role === "user" && messages.at(-1).content === story.prompt && response.provenance.questionSha256 === digest(story.prompt) && (response.condition !== "skill" || messages[0].fileId === "frozen-skill-root" && promptFiles.has(messages[0].fileId) && messages[0].role === (response.configurationId.startsWith("codex:") ? "developer" : "system")), "a public response does not preserve its exact question or treatment instruction reference.");
      requireEvidence(response.provenance.skillSha256 === (response.condition === "skill" ? projection.methodology.skillSha256 : null) && response.provenance.sourceSha256 === projection.scoreBasis.sourceSha256, "public treatment or source fingerprint changed.");
      requireEvidence(response.provenance.outputSha256 === (response.outputText ? digest(response.outputText) : null), "public answer differs from its source hash.");
      requireEvidence(new Set(response.judgments.map(judge => judge.judgeConfigurationId)).size === response.judgments.length, "public panel repeats a judge.");
      for (const judgment of response.judgments) {
        requireEvidence(panel.includes(judgment.judgeConfigurationId) && projection.scoreBasis.dimensions.every(d => Number.isInteger(judgment.dimensions[d.id]?.rating) && judgment.dimensions[d.id].rating >= 1 && judgment.dimensions[d.id].rating <= 10), "public judge identity or rating changed.");
        const score = projection.scoreBasis.dimensions.reduce((sum, d) => sum + judgment.dimensions[d.id].rating * d.weight / 10, 0);
        requireEvidence(judgment.score === score, "public judge total differs from its ratings.");
      }
      requireEvidence(cell.exactScore === (response.judgments.length === 2 ? mean(response.judgments.map(judge => judge.score)) : null), "public response panel differs from its displayed score.");
      requireEvidence(projection.scoreBasis.dimensions.every(dimension => cell.dimensions[dimension.id] === (response.judgments.length === 2 ? mean(response.judgments.map(judge => judge.dimensions[dimension.id].rating)) : null)), "displayed dimensions differ from their corresponding independent panel ratings.");
    }
    if (Object.hasOwn(projection, "provisionalLeaderboard")) requireEvidence(same(projection.provisionalLeaderboard, coreIdeaProvisionalLeaderboard(projection, responseBundle.responses)), "provisional results differ from the original fixed-judge matched pairs.");
  }
  return projection;
}

function buildSelectedWritingPublication({ repoRootDirectory, benchmarkId, readFileSyncImplementation = fs.readFileSync }) {
  if (benchmarkId === STORYTELLING_CREATION_BENCHMARK_ID) return buildStorytellingCreationPublication({ repoRootDirectory, readFileSyncImplementation });
  let selectionText;
  try { selectionText = readFileSyncImplementation(path.join(repoRootDirectory, writingSelectionPath(benchmarkId)), "utf8"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
  const selection = JSON.parse(selectionText);
  requireEvidence(selection.kind === "vasirbenchmark-writing-source" && selection.schemaVersion === 1, "invalid source selection.");
  const run = readPinned(repoRootDirectory, selection.run, readFileSyncImplementation);
  const snapshot = readPinned(repoRootDirectory, selection.skill, readFileSyncImplementation);
  requireEvidence(run.benchmark?.definition?.id === benchmarkId, "selected source belongs to another Writing benchmark.");
  return projectWritingRun({ run, snapshot, sourceSha256: selection.run.sha256 });
}

function writingCollectionCoverage(projections) {
  const coverage = { benchmarkCount: projections.length };
  for (const field of ["caseCount", "settingCount", "completedSettingCount", "responseCount", "expectedResponseCount", "scoredResponseCount", "usablePairs", "expectedPairs", "judgmentCount", "expectedJudgmentCount"]) coverage[field] = projections.reduce((sum, projection) => sum + projection.coverage[field], 0);
  return coverage;
}

function buildStorytellingPublications(options) {
  const selected = BENCHMARK_IDS.map(benchmarkId => buildSelectedWritingPublication({ ...options, benchmarkId })).filter(Boolean);
  if (!selected.length) return null;
  requireEvidence(selected[0].projection.benchmarks[0].id !== STORYTELLING_CREATION_BENCHMARK_ID, "Creation publication is additive; preserve an existing Writing benchmark as the collection default.");
  if (selected.length === 1 && selected[0].projection.benchmarks[0].id === WRITING_BENCHMARK_ID) return selected[0];
  const primary = selected[0];
  const benchmarkPublications = selected.slice(1).map(item => ({ benchmarkId: item.projection.benchmarks[0].id, projection: item.projection }));
  const benchmarkResponses = selected.slice(1).map(item => ({ benchmarkId: item.projection.benchmarks[0].id, responseBundle: item.responseBundle }));
  const collectionCoverage = writingCollectionCoverage(selected.map(item => item.projection));
  const projection = { ...primary.projection, benchmarkPublications, collectionCoverage };
  const responseBundle = { ...primary.responseBundle, benchmarkResponses };
  const benchmarks = selected.map(item => ({ id: item.stub.benchmarkId, title: item.stub.benchmarkTitle, coverage: item.stub.coverage, scoreBasisLabel: item.stub.scoreBasisLabel }));
  const stub = { ...primary.stub, benchmarks, benchmarkIds: benchmarks.map(benchmark => benchmark.id), collectionCoverage };
  validateWritingPublication(projection, responseBundle);
  const counts = { ...primary.projection.counts, benchmarks: selected.length, cases: collectionCoverage.caseCount, responses: collectionCoverage.responseCount,
    resultEntries: selected.reduce((sum, item) => sum + item.projection.counts.resultEntries, 0), developmentResultSets: selected.length };
  const settings = [...new Map(selected.flatMap(item => item.projection.settings).map(setting => [setting.configurationId, setting])).values()];
  counts.settings = settings.length;
  return { projection, responseBundle, stub, counts, settings, basisSha256: digest(JSON.stringify(selected.map(item => item.basisSha256))) };
}

function combinedWritingCoverage(existing, additional) {
  const coverage = writingCollectionCoverage([{ coverage: existing.collectionCoverage ?? existing.coverage }, additional]);
  coverage.benchmarkCount = (existing.collectionCoverage?.benchmarkCount ?? existing.coverage.benchmarkCount) + 1;
  return coverage;
}

export function buildWritingPublication(options) {
  const existing = buildStorytellingPublications(options);
  const dungeonMaster = buildDungeonMasterPublication(options);
  if (!dungeonMaster) return existing;
  requireEvidence(existing, "Dungeon Master requires the existing Writing collection; its default must not be replaced.");
  const id = DUNGEON_MASTER_BENCHMARK_ID;
  const allWritingCoverage = combinedWritingCoverage(existing.projection, dungeonMaster.projection);
  const projection = { ...existing.projection, additionalBenchmarks: { [id]: dungeonMaster.projection }, allWritingCoverage };
  const responseBundle = { ...existing.responseBundle, additionalBenchmarks: { [id]: dungeonMaster.responseBundle } };
  const existingDescriptors = existing.stub.benchmarks ?? [{ id: existing.stub.benchmarkId, title: existing.stub.benchmarkTitle, coverage: existing.stub.coverage, scoreBasisLabel: existing.stub.scoreBasisLabel }];
  const benchmarks = [...existingDescriptors, { id, title: dungeonMaster.stub.benchmarkTitle, subcategory: "dungeon-master", coverage: dungeonMaster.stub.coverage, scoreBasisLabel: dungeonMaster.stub.scoreBasisLabel }];
  const stub = { ...existing.stub, benchmarks, benchmarkIds: benchmarks.map(benchmark => benchmark.id), additionalBenchmarks: { [id]: dungeonMaster.stub }, allWritingCoverage, subsections: [...existing.stub.subsections, { id: "dungeon-master", title: "DUNGEON MASTER", benchmarkId: id, status: dungeonMaster.stub.status }] };
  validateWritingPublication(projection, responseBundle);
  validateWritingSummary(stub);
  const counts = { ...(existing.counts ?? existing.projection.counts) };
  for (const field of ["tracks", "benchmarks", "cases", "responses", "resultEntries", "developmentResultSets"]) counts[field] = (counts[field] ?? 0) + (dungeonMaster.projection.counts[field] ?? 0);
  const settings = [...new Map([...(existing.settings ?? existing.projection.settings), ...dungeonMaster.projection.settings].map(setting => [setting.configurationId, setting])).values()];
  counts.settings = settings.length;
  return { projection, responseBundle, stub, counts, settings, basisSha256: digest(JSON.stringify({ existing: existing.basisSha256, dungeonMaster: dungeonMaster.basisSha256 })) };
}

/** Pin an immutable checkpoint without editing any answer or judgment. */
export function prepareWritingPublicationSource({ repoRootDirectory, runDirectory, benchmarkId = WRITING_BENCHMARK_ID }) {
  if (benchmarkId === STORYTELLING_CREATION_BENCHMARK_ID) return prepareStorytellingCreationPublicationSource({ repoRootDirectory, runDirectory });
  const root = path.resolve(repoRootDirectory);
  const directory = path.resolve(runDirectory);
  requireEvidence(directory.startsWith(`${path.join(root, ".agents", "vasir-evals", benchmarkId)}${path.sep}`), "checkpoint source is outside the benchmark artifact directory.");
  requireEvidence(!fs.existsSync(path.join(directory, "run.lock")), "wait for the active run writer before archiving.");
  writingSelectionPath(benchmarkId);
  const runText = fs.readFileSync(path.join(directory, "run.json"), "utf8");
  requireEvidence(JSON.parse(runText).benchmark?.definition?.id === benchmarkId, "checkpoint benchmark differs from selected benchmark.");
  const snapshotText = fs.readFileSync(path.join(directory, "skill-snapshot.json"), "utf8");
  const runHash = digest(runText);
  projectWritingRun({ run: JSON.parse(runText), snapshot: JSON.parse(snapshotText), sourceSha256: runHash });
  const archive = `.agents/vasir-evals/${benchmarkId}/publication-snapshots/${runHash}`;
  fs.mkdirSync(path.join(root, archive), { recursive: true });
  for (const [name, text] of [["run.json", runText], ["skill-snapshot.json", snapshotText]]) {
    const target = path.join(root, archive, name);
    if (fs.existsSync(target)) requireEvidence(fs.readFileSync(target, "utf8") === text, "immutable publication checkpoint already differs.");
    else fs.writeFileSync(target, text, { flag: "wx" });
  }
  return { kind: "vasirbenchmark-writing-source", schemaVersion: 1, run: { path: `${archive}/run.json`, sha256: runHash }, skill: { path: `${archive}/skill-snapshot.json`, sha256: digest(snapshotText) } };
}

export function serializeWritingModule(value, globalName) {
  requireEvidence(["VASIR_WRITING", "VASIR_WRITING_RESPONSES", "VASIR_WRITING_CREATION_RESPONSES"].includes(globalName), "invalid public module name.");
  if (globalName === "VASIR_WRITING_CREATION_RESPONSES") return serializeWritingCreationResponseArchive(value);
  const serialized = JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  return `(function () { 'use strict'; window.${globalName} = Object.freeze(${serialized}); }());\n`;
}
