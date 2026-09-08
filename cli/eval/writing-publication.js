import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { isBenchmarkAgentRuntimeReceiptCompatible } from "./agent-runtime.js";
import { createBenchmarkHash } from "./benchmark-source.js";
import { validateStorytellingSkillSnapshot } from "./storytelling-agent-runtime.js";

export const WRITING_BENCHMARK_ID = "storytelling-core-idea";
export const WRITING_SELECTION_PATH = "benchmarks/storytelling-core-idea/publication.json";
const HASH = /^[a-f0-9]{64}$/;
const PANEL = ["codex:gpt-6-astra@xhigh", "claude:claude-fable-5-1@max"];
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
const key = cell => `${cell.settingId}:${cell.condition}:${cell.caseId}`;
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
function summarizePairs(cells, configurationIds, caseIds) {
  const pairs = configurationIds.flatMap(settingId => caseIds.map(caseId => ({
    baseline: cells.find(cell => cell.settingId === settingId && cell.caseId === caseId && cell.condition === "baseline")?.exactScore ?? null,
    treatment: cells.find(cell => cell.settingId === settingId && cell.caseId === caseId && cell.condition === "skill")?.exactScore ?? null
  }))).filter(pair => finite(pair.baseline) && finite(pair.treatment));
  return {
    baseline: round(mean(pairs.map(pair => pair.baseline))), treatment: round(mean(pairs.map(pair => pair.treatment))),
    delta: round(mean(pairs.map(pair => pair.treatment - pair.baseline))),
    wins: pairs.filter(pair => pair.treatment > pair.baseline).length,
    ties: pairs.filter(pair => pair.treatment === pair.baseline).length,
    losses: pairs.filter(pair => pair.treatment < pair.baseline).length,
    usablePairs: pairs.length, expectedPairs: configurationIds.length * caseIds.length
  };
}
function publicJudgments(run, row, dimensions) {
  const result = [];
  for (const judge of run.judging?.judges ?? []) {
    const reviewerId = judge.configuration?.id;
    requireEvidence(PANEL.includes(reviewerId), "unrecognized panel seat.");
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
  requireEvidence(run?.kind === "benchmark" && run.benchmark?.definition?.id === WRITING_BENCHMARK_ID && run.storytelling?.runnerVersion === "storytelling-core-idea-v1", "unsupported source run.");
  requireEvidence(run.benchmark.hash === createBenchmarkHash(run.benchmark.definition), "frozen benchmark hash changed.");
  validateStorytellingSkillSnapshot(snapshot);
  requireEvidence(snapshot.hash === run.treatment?.hash && run.treatment?.id === "skill:writing-storytelling" && run.generation?.trialCount === 1, "treatment or trial contract changed.");
  requireEvidence(!String(run.benchmark.definition.status).includes("draft"), "plumbing smoke or unverified draft corpus cannot be published as measured evidence.");
  const definition = run.benchmark.definition;
  const dimensions = definition.scoring.dimensions.map(d => ({ id: d.id, label: d.title, title: d.title, weight: d.weight, description: d.criterion ?? d.description ?? d.criteria ?? "", anchors: d.anchors }));
  requireEvidence(dimensions.length === 10 && new Set(dimensions.map(d => d.id)).size === 10 && dimensions.every(d => d.weight === 10) && definition.scoring.ratingScale?.min === 1 && definition.scoring.ratingScale?.max === 10 && !definition.scoring.gates.length, "the ten-dimension 1–10 ungated rubric changed.");
  const cases = definition.cases.map(c => ({ id: c.id, benchmarkId: WRITING_BENCHMARK_ID, title: c.work.title, prompt: c.task, medium: c.work.medium, version: c.work.version, creator: c.work.creator, familiarity: c.familiarity.band, familiarityBasis: c.familiarity.rationale, trainingExposure: "unknown", evidence: c.judgeEvidence }));
  requireEvidence(cases.length > 0 && new Set(cases.map(c => c.id)).size === cases.length, "empty or duplicate story cases.");
  const identities = run.configurations.map(identity);
  requireEvidence(identities.length && new Set(identities.map(setting => setting.id)).size === identities.length, "empty or duplicate model settings.");
  const expected = identities.length * cases.length * 2;
  requireEvidence(run.rows.length === expected && new Set(run.rows.map(row => row.rowKey)).size === expected, "the declared generation inventory is incomplete or duplicated.");
  const responses = [], cells = [], messageSets = new Map();
  const root = snapshot.files.find(file => file.relativePath === "SKILL.md");
  const rootInstruction = `Use the ${snapshot.skillName} skill for this request. Its frozen directory is <frozen-skill-directory>. Resolve linked reference paths relative to that directory and read the references selected by the skill.\n\n${root.contents}`;
  const promptFiles = [
    { id: "frozen-skill-root", title: "Frozen skill provider instruction (temporary directory normalized)", content: rootInstruction, sha256: digest(rootInstruction) },
    ...snapshot.files.filter(file => file.relativePath !== "SKILL.md").map(file => ({
      id: `frozen-library-${digest(file.relativePath).slice(0, 16)}`,
      title: `${file.relativePath} · available for model-selected access, not automatically injected`,
      content: file.contents, sha256: file.sha256
    }))
  ];
  for (const setting of identities) for (const story of cases) for (const condition of CONDITIONS) {
    const row = run.rows.find(candidate => candidate.configurationId === setting.configurationId && candidate.caseId === story.id && candidate.conditionId === condition.sourceId && candidate.trialNumber === 1);
    requireEvidence(row && row.promptText === story.prompt && same(row.exactMessages, [{ role: "user", content: story.prompt }]), "a cell is missing or the minimal user question changed.");
    const configuration = run.configurations.find(candidate => candidate.id === setting.configurationId);
    const complete = row.rowStatus === "complete";
    if (complete) {
      requireEvidence(typeof row.outputText === "string" && row.outputText.trim() && digest(row.outputText) === row.outputHash && row.runtimeReceipt?.freshSession === true && row.runtimeReceipt?.userPromptSha256 === digest(story.prompt) && row.runtimeReceipt?.skillHash === (condition.id === "skill" ? snapshot.hash : null) && isBenchmarkAgentRuntimeReceiptCompatible({ configuration, runtimeReceipt: row.runtimeReceipt }), "a completed response changed or lacks compatible fresh-session provenance.");
      requireEvidence(row.provider === configuration.provider && row.model === configuration.model && row.reasoning === configuration.reasoning && row.runtimeReceipt.requestedModel === configuration.model && row.runtimeReceipt.requestedReasoning === configuration.reasoning && same(row.runtimeReceipt.requestedConfiguration, configuration), "requested generation identity or reasoning differs from its declared cell.");
      requireEvidence(row.runtimeReceipt.outputSha256 === row.outputHash, "response output differs from its runtime receipt.");
      requireEvidence(row.runtimeReceipt.instructionHash === (condition.id === "skill" ? digest(rootInstruction) : null), "frozen skill instruction differs from its runtime receipt.");
      requireEvidence((row.runtimeReceipt.referenceAccess?.observedPaths ?? []).every(file => snapshot.files.some(source => source.relativePath === file)), "a public reference path is not in the frozen skill manifest.");
    }
    const judgments = complete ? publicJudgments(run, row, dimensions) : [];
    const exactScore = judgments.length === 2 ? mean(judgments.map(judge => judge.score)) : null;
    if (row.score) requireEvidence(finite(exactScore) && Math.abs(row.score.total - exactScore) < 0.0001, "stored aggregate does not equal the independent panel mean.");
    const ratings = Object.fromEntries(dimensions.map(d => [d.id, judgments.length === 2 ? mean(judgments.map(judge => judge.dimensions[d.id].rating)) : null]));
    const disagreement = judgments.length === 2 ? { scoreSpread: Math.abs(judgments[0].score - judgments[1].score), dimensionRanges: dimensions.map(d => ({ id: d.id, spread: Math.abs(judgments[0].dimensions[d.id].rating - judgments[1].dimensions[d.id].rating) })) } : null;
    const outputText = complete ? row.outputText : "";
    const status = finite(exactScore) ? "scored" : complete ? "unscored" : row.rowStatus;
    const cell = {
      settingId: setting.id, configurationId: setting.configurationId, condition: condition.id,
      benchmarkId: WRITING_BENCHMARK_ID, caseId: story.id, category: "writing", status,
      score: round(exactScore), exactScore, dimensions: ratings, trials: 1, calibrated: false,
      latencyMs: complete ? row.durationMs : null, inputTokens: complete ? row.usage?.inputTokens ?? null : null,
      outputTokens: complete ? row.usage?.outputTokens ?? null : null, totalTokens: complete ? row.usage?.totalTokens ?? null : null,
      costUsd: null, wordCount: complete ? words(outputText) : null, disagreement,
      coverage: { expectedJudgments: 2, completedJudgments: judgments.length, expectedResponses: 1, completedResponses: complete ? 1 : 0 },
      failureReason: publicFailure(row), attemptCount: row.attempts?.length ?? 1
    };
    cell.metrics = metrics([cell]); cells.push(cell);
    const messages = [...(condition.id === "skill" ? [{ role: configuration.provider === "codex" ? "developer" : "system", content: "Frozen storytelling skill provider instruction; see shared Method source. Temporary directory is normalized for privacy.", fileId: "frozen-skill-root" }] : []), { role: "user", content: story.prompt }];
    const messageSetId = digest(JSON.stringify(messages)); messageSets.set(messageSetId, { id: messageSetId, messages });
    responses.push({ benchmarkId: WRITING_BENCHMARK_ID, caseId: story.id, settingId: setting.id, configurationId: setting.configurationId, condition: condition.id, trialNumber: 1, messageSetId, outputText, wordCount: cell.wordCount, status, failureReason: cell.failureReason, judgments, disagreement, score: cell.score, provenance: { sourceSha256, outputSha256: complete ? row.outputHash : null, questionSha256: digest(story.prompt), skillSha256: condition.id === "skill" ? snapshot.hash : null }, runtime: complete ? { freshSession: true, modelVerification: row.runtimeReceipt.modelVerification, reasoningVerification: row.runtimeReceipt.reasoningVerification, executionMode: row.runtimeReceipt.executionMode, referenceFilesRead: row.runtimeReceipt.referenceAccess?.observedPaths ?? [] } : null });
  }
  for (const response of responses) {
    response.characterCount = response.outputText ? characters(response.outputText) : null;
    if (response.runtime) {
      const row = run.rows.find(candidate => candidate.configurationId === response.configurationId && candidate.caseId === response.caseId && candidate.conditionId === (response.condition === "skill" ? "skill:writing-storytelling" : "clean"));
      response.runtime.observedCollaborationEvents = row.runtimeReceipt.itemTypeCounts?.collab_tool_call ?? 0;
      response.runtime.rawProviderStreamRetained = false;
      response.runtime.durationMs = row.durationMs;
      response.runtime.usage = publicUsage(row.usage);
    }
  }
  const aggregates = [], settings = identities.map(setting => {
    const cohort = cells.filter(cell => cell.settingId === setting.id);
    // Both arms need the identical, complete corpus to enter either leaderboard.
    const pairComplete = cohort.length === cases.length * 2 && cohort.every(cell => finite(cell.exactScore));
    const scores = {}, settingMetrics = {}, coverage = {};
    for (const condition of CONDITIONS) {
      const members = cohort.filter(cell => cell.condition === condition.id);
      const exactScore = pairComplete ? mean(members.map(cell => cell.exactScore)) : null;
      scores[condition.id] = round(exactScore); settingMetrics[condition.id] = metrics(members);
      coverage[condition.id] = { expectedCases: cases.length, scoredCases: members.filter(cell => finite(cell.score)).length, completedResponses: members.filter(cell => cell.coverage.completedResponses).length, expectedResponses: cases.length, completedJudgments: members.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0), expectedJudgments: cases.length * 2 };
      aggregates.push({ settingId: setting.id, configurationId: setting.configurationId, condition: condition.id, benchmarkId: WRITING_BENCHMARK_ID, category: "writing", score: round(exactScore), exactScore, status: pairComplete ? "scored" : "incomplete", dimensions: Object.fromEntries(dimensions.map(d => [d.id, pairComplete ? mean(members.map(cell => cell.dimensions[d.id])) : null])), metrics: settingMetrics[condition.id], coverage: coverage[condition.id], trials: 1, calibrated: false });
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
  const availability = { status: "development", verification: "unverified", code: "development-uncalibrated", message: "Exploratory model-judged results", detail: "One trial per story and condition. Human calibration is pending; Writing is not included in Overall.", blockers: [{ code: "human-calibration-pending", message: "Not calibrated against a human panel." }] };
  const scoreBasis = { id: `${definition.edition}:${run.benchmark.scoringHash}`, label: "Storytelling · Core idea v1", edition: definition.edition, method: "equal-case-paired-complete-cohort-mean-v1", unit: "rubric-points", range: { minimum: 10, maximum: 100 }, benchmarkIds: [WRITING_BENCHMARK_ID], taskCount: cases.length, trialsPerTask: 1, judgeCount: 2, judges: PANEL, dimensions, weights: Object.fromEntries(dimensions.map(d => [d.id, d.weight])), ratingMaximum: 10, ratingMinimum: 1, gates: null, caps: null, aggregation: "mean-independent-dimension-ratings-no-gates-v1", batchUnit: "matched-pair", calibrationStatus: "development-uncalibrated", panelMethod: "Two independent provider judges; mean ratings, with each judgment retained.", blinding: "Opaque candidate IDs and deterministic hash-based order; model, condition, skill and configuration labels withheld from judges. Both judges see the same within-pair order; no order-swapped replication is performed. Writing style can still reveal a condition.", sourceSha256, coverage, uncertainty: { status: "not-estimated", reason: "One trial per curated case; no population-level confidence claim." } };
  const methodology = { corpusSha256: run.benchmark.hash, skillSha256: snapshot.hash, corpus: cases.map(story => ({ id: story.id, title: story.title, sha256: digest(story.prompt) })), skillFiles: snapshot.files.map(file => ({ path: file.relativePath, sha256: file.sha256, bytes: file.bytes })), generationContract: "Same exact user question in fresh isolated CLI sessions. Plain: no storytelling instruction. Skill: frozen SKILL.md in a provider instruction and progressively accessible frozen reference files. No supplied story texts, browsing, word cap, or answer template. Skill reference use is model-selected. Provider tooling differs; model/effort request verification is reported separately from provider confirmation.", blinding: scoreBasis.blinding, limitations: definition.limitations };
  scoreBasis.panelMethod = "Each judge scores ten equally weighted dimensions from 1 to 10; their sum is 10–100. The response score is the mean of the two independent judge totals. Configuration scores average the same complete case corpus in both conditions; there are no gates, caps or missing-score imputations.";
  methodology.generationContract += " Ultra is a runtime mode, not an effort-only control; collaboration events can occur, and a CLI session does not establish the number of underlying model agents. Parsed receipts, final answers and stream hashes are retained, but complete raw provider streams and provider-internal base instructions are not available for reconstruction.";
  methodology.execution = { runnerVersion: run.storytelling.runnerVersion, runtimeVersion: run.storytelling.runtimeVersion, harnessVersion: run.harnessVersion, trialCount: run.generation.trialCount, generationOrderPolicy: run.generation.orderPolicy, generationOrderSeed: run.generation.orderSeed };
  methodology.resourceAccounting = "Generation resource counts belong to each answer. Judge resource counts belong to the entire matched-pair batch and are repeated on its two answer records for inspection; count each judge/promptSha256 once when totaling them. Counts are the saved CLI-normalized usage, not a reconstructed provider bill, and are not directly comparable across tokenizers. The original normalizer replaced missing token components with zero; a saved zero therefore does not prove that the provider reported zero. Fields absent from the saved receipt remain null. Claude cache creation/read and Codex cache write/cached-input fields retain their distinct names. Cached and reasoning counts are components, not extra amounts to add to saved totals. Character counts use Unicode code points, not grapheme clusters.";
  const benchmark = { id: WRITING_BENCHMARK_ID, trackId: "storytelling", familyId: "writing", category: "writing", suite: "Storytelling", name: "Core idea", title: "Core idea", description: definition.description, taskKind: "story-interpretation", prompt: "What is the core idea of [specified story]?", judging: { panel: PANEL, synthesizer: null }, limitations: definition.limitations, reportFragment: WRITING_BENCHMARK_ID, detailHref: `benchmark-report.html#${WRITING_BENCHMARK_ID}`, evidenceKind: "development", resultAvailability: availability, measured: { ...summary, complete: coverage.scoredResponseCount, total: expected, treatmentLabel: "Storytelling skill", calibration: "Human calibration pending" } };
  const caseSummaries = cases.map(story => ({ caseId: story.id, benchmarkId: WRITING_BENCHMARK_ID, ...summarizePairs(cells, settings.map(setting => setting.id), [story.id]), complete: cells.filter(cell => cell.caseId === story.id && finite(cell.score)).length, total: settings.length * 2, detailHref: `benchmark-report.html#${WRITING_BENCHMARK_ID}/${story.id}` }));
  const counts = { families: 1, tracks: 1, benchmarks: 1, categories: 1, cases: cases.length, conditions: 2, settings: settings.length, resultEntries: entries.length, responses: coverage.responseCount, developmentResultSets: 1, eligibleResultSets: 0, withheldResultSets: 0 };
  const leader = entries.filter(entry => entry.condition === "skill" && finite(entry.score)).sort((a, b) => a.rank - b.rank || a.configurationId.localeCompare(b.configurationId))[0];
  const projection = { kind: "vasirbenchmark-writing-projection", schemaVersion: 1, program: { id: "vasirbench", title: "VasirBench", status: "development", evidenceStatus: "development", verification: "unverified" }, meta: { release: "Development snapshot · September 2026", status: "Exploratory model-judged results", categories: 1, benchmarks: 1, settings: settings.length, conditions: 2, trials: 1, aggregateCells: expected, runs: 1, calibration: 0 }, scoreBasis, conditions: CONDITIONS, categories: [{ id: "writing", name: "Writing", title: "Writing", short: "WRITE", weight: 1, color: "#b65a31", trackIds: ["storytelling"] }], families: [{ id: "writing", title: "Writing", description: "Storytelling, with future prose and poetry benchmarks.", trackIds: ["storytelling"] }], tracks: [{ id: "storytelling", familyId: "writing", title: "Storytelling", description: "Understanding and creating narrative. This first benchmark tests explanations of a story's core idea.", benchmarkIds: [WRITING_BENCHMARK_ID], resultAvailability: availability }], benchmarks: [benchmark], results: [{ benchmarkId: WRITING_BENCHMARK_ID, runId: run.runId, status: "development", verification: "unverified", baselineScore: summary.baseline, treatmentScore: summary.treatment, delta: summary.delta, responseCount: coverage.responseCount, matchedConfigurationCount: completeSettings.length, coverage }], settings, entries, benchmarkResults: aggregates, benchmarkSummaries: [{ benchmarkId: WRITING_BENCHMARK_ID, runId: run.runId, status: "development", verification: "unverified", evidenceKind: "development", baselineLabel: "Plain answer", treatmentLabel: "Storytelling skill", ...summary, complete: coverage.scoredResponseCount, total: expected, completionLabel: "scored responses", calibration: "Human calibration pending", detailHref: benchmark.detailHref, sourceHref: null }], cases, caseSummaries, caseResults: cells, methodology, coverage, categoryLeaders: leader ? [{ category: "writing", entry: { ...leader, categoryScore: leader.score } }] : [], efficientFrontier: [], regressions: entries.filter(entry => entry.condition === "skill" && finite(entry.delta) && entry.delta < 0), callouts: { overall: "Writing is reported separately and does not change Overall.", value: "Quality, length and latency are separate; provider cost coverage is not comparable.", regression: "Case-level losses remain visible even when the corpus average improves.", category: "One interpretation benchmark, twelve curated stories—not a score for all writing." }, availability, counts };
  const responseBundle = { kind: "vasirbenchmark-writing-responses", schemaVersion: 1, counts: { ...coverage, responses: responses.length, messageSets: messageSets.size, judgments: coverage.judgmentCount }, promptFiles, messageSets: [...messageSets.values()], responses };
  const stub = { kind: "vasirbenchmark-writing-summary", status: coverage.scoredResponseCount ? "measured" : "unscored", dataHref: "./writing-data.js", responsesHref: "./writing-responses.js", category: { id: "writing", name: "Writing", short: "WRITE" }, benchmarkId: WRITING_BENCHMARK_ID, benchmarkTitle: "Core idea", subsections: [{ id: "storytelling", title: "Storytelling", status: coverage.scoredResponseCount ? "measured" : "unscored" }, { id: "prose", title: "Prose", status: "unscored" }, { id: "poetry", title: "Poetry", status: "unscored" }], coverage, scoreBasisLabel: scoreBasis.label, treatmentLabel: "Storytelling skill", ...(leader ? { leader: { id: leader.id, settingId: leader.settingId, family: leader.family, reasoning: leader.reasoning, score: leader.score } } : {}) };
  validateWritingPublication(projection, responseBundle);
  return { projection, responseBundle, stub, basisSha256: digest(JSON.stringify({ sourceSha256, skillSha256: snapshot.hash, corpusSha256: run.benchmark.hash })) };
}

export function validateWritingSummary(stub) {
  requireEvidence(stub?.kind === "vasirbenchmark-writing-summary" && stub.benchmarkId === WRITING_BENCHMARK_ID && stub.dataHref === "./writing-data.js" && stub.responsesHref === "./writing-responses.js" && stub.coverage?.settingCount > 0 && stub.coverage?.caseCount > 0 && stub.coverage.benchmarkCount === 1, "invalid public Writing summary.");
  requireEvidence(stub.coverage.responseCount <= stub.coverage.expectedResponseCount && stub.coverage.scoredResponseCount <= stub.coverage.responseCount, "summary coverage exceeds the matrix.");
  return stub;
}

export function validateWritingPublication(projection, responseBundle) {
  requireEvidence(projection?.kind === "vasirbenchmark-writing-projection" && projection.schemaVersion === 1 && projection.benchmarks?.length === 1 && projection.scoreBasis?.dimensions?.length === 10 && same(projection.scoreBasis.judges, PANEL), "invalid public Writing projection.");
  const cells = projection.caseResults;
  requireEvidence(Array.isArray(cells) && cells.length === projection.settings.length * projection.cases.length * 2 && new Set(cells.map(key)).size === cells.length, "invalid case/setting/condition coverage.");
  for (const cell of cells) {
    const score = cell.coverage.completedJudgments === 2 ? projection.scoreBasis.dimensions.reduce((sum, dimension) => sum + cell.dimensions[dimension.id] * dimension.weight / 10, 0) : null;
    requireEvidence(cell.exactScore === score && cell.score === round(score), "a public score differs from the dimension mean.");
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
      requireEvidence(cell && response.score === cell.score && response.judgments.length === cell.coverage.completedJudgments && response.wordCount === (response.outputText ? words(response.outputText) : null), "public response changed its score, length or panel coverage.");
      requireEvidence(response.characterCount === (response.outputText ? characters(response.outputText) : null), "public response changed its Unicode character count.");
      requireEvidence(response.configurationId === cell.configurationId && response.benchmarkId === WRITING_BENCHMARK_ID && response.trialNumber === 1 && messageSets.has(response.messageSetId), "public response identity or input reference changed.");
      const story = projection.cases.find(candidate => candidate.id === response.caseId);
      const messages = messageSets.get(response.messageSetId).messages;
      requireEvidence(messages.length === (response.condition === "skill" ? 2 : 1) && messages.at(-1).role === "user" && messages.at(-1).content === story.prompt && response.provenance.questionSha256 === digest(story.prompt) && (response.condition !== "skill" || messages[0].fileId === "frozen-skill-root" && promptFiles.has(messages[0].fileId) && messages[0].role === (response.configurationId.startsWith("codex:") ? "developer" : "system")), "a public response does not preserve its exact question or treatment instruction reference.");
      requireEvidence(response.provenance.skillSha256 === (response.condition === "skill" ? projection.methodology.skillSha256 : null) && response.provenance.sourceSha256 === projection.scoreBasis.sourceSha256, "public treatment or source fingerprint changed.");
      requireEvidence(response.provenance.outputSha256 === (response.outputText ? digest(response.outputText) : null), "public answer differs from its source hash.");
      requireEvidence(new Set(response.judgments.map(judge => judge.judgeConfigurationId)).size === response.judgments.length, "public panel repeats a judge.");
      for (const judgment of response.judgments) {
        requireEvidence(PANEL.includes(judgment.judgeConfigurationId) && projection.scoreBasis.dimensions.every(d => Number.isInteger(judgment.dimensions[d.id]?.rating) && judgment.dimensions[d.id].rating >= 1 && judgment.dimensions[d.id].rating <= 10), "public judge identity or rating changed.");
        const score = projection.scoreBasis.dimensions.reduce((sum, d) => sum + judgment.dimensions[d.id].rating * d.weight / 10, 0);
        requireEvidence(judgment.score === score, "public judge total differs from its ratings.");
      }
      requireEvidence(cell.exactScore === (response.judgments.length === 2 ? mean(response.judgments.map(judge => judge.score)) : null), "public response panel differs from its displayed score.");
      requireEvidence(projection.scoreBasis.dimensions.every(dimension => cell.dimensions[dimension.id] === (response.judgments.length === 2 ? mean(response.judgments.map(judge => judge.dimensions[dimension.id].rating)) : null)), "displayed dimensions differ from their corresponding independent panel ratings.");
    }
  }
  return projection;
}

export function buildWritingPublication({ repoRootDirectory, readFileSyncImplementation = fs.readFileSync }) {
  let selectionText;
  try { selectionText = readFileSyncImplementation(path.join(repoRootDirectory, WRITING_SELECTION_PATH), "utf8"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
  const selection = JSON.parse(selectionText);
  requireEvidence(selection.kind === "vasirbenchmark-writing-source" && selection.schemaVersion === 1, "invalid source selection.");
  const run = readPinned(repoRootDirectory, selection.run, readFileSyncImplementation);
  const snapshot = readPinned(repoRootDirectory, selection.skill, readFileSyncImplementation);
  return projectWritingRun({ run, snapshot, sourceSha256: selection.run.sha256 });
}

/** Pin an immutable checkpoint without editing any answer or judgment. */
export function prepareWritingPublicationSource({ repoRootDirectory, runDirectory }) {
  const root = path.resolve(repoRootDirectory);
  const directory = path.resolve(runDirectory);
  requireEvidence(directory.startsWith(`${path.join(root, ".agents", "vasir-evals", WRITING_BENCHMARK_ID)}${path.sep}`), "checkpoint source is outside the benchmark artifact directory.");
  const runText = fs.readFileSync(path.join(directory, "run.json"), "utf8");
  const snapshotText = fs.readFileSync(path.join(directory, "skill-snapshot.json"), "utf8");
  const runHash = digest(runText);
  projectWritingRun({ run: JSON.parse(runText), snapshot: JSON.parse(snapshotText), sourceSha256: runHash });
  const archive = `.agents/vasir-evals/${WRITING_BENCHMARK_ID}/publication-snapshots/${runHash}`;
  fs.mkdirSync(path.join(root, archive), { recursive: true });
  for (const [name, text] of [["run.json", runText], ["skill-snapshot.json", snapshotText]]) {
    const target = path.join(root, archive, name);
    if (fs.existsSync(target)) requireEvidence(fs.readFileSync(target, "utf8") === text, "immutable publication checkpoint already differs.");
    else fs.writeFileSync(target, text, { flag: "wx" });
  }
  return { kind: "vasirbenchmark-writing-source", schemaVersion: 1, run: { path: `${archive}/run.json`, sha256: runHash }, skill: { path: `${archive}/skill-snapshot.json`, sha256: digest(snapshotText) } };
}

export function serializeWritingModule(value, globalName) {
  requireEvidence(["VASIR_WRITING", "VASIR_WRITING_RESPONSES"].includes(globalName), "invalid public module name.");
  const serialized = JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  return `(function () { 'use strict'; window.${globalName} = Object.freeze(${serialized}); }());\n`;
}
