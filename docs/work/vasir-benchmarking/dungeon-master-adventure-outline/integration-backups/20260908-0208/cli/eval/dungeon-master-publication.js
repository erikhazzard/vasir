import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createStorytellingSkillInstruction, isStorytellingRequiredSkillReadReceiptCompatible, validateStorytellingSkillSnapshot } from "./storytelling-agent-runtime.js";

export const DUNGEON_MASTER_BENCHMARK_ID = "dungeon-master-adventure-outline";
export const DUNGEON_MASTER_SELECTION_PATH = `benchmarks/${DUNGEON_MASTER_BENCHMARK_ID}/publication.json`;
const CONFIGURATION_ID = "codex:gpt-6-astra@ultra";
const REVIEWERS = ["astra-ultra-review-1", "astra-ultra-review-2"];
const PRIMARY_PROMPT = "create an outline for TTRPG adventure";
const HASH = /^[a-f0-9]{64}$/u;
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const finite = value => typeof value === "number" && Number.isFinite(value);
const mean = values => values.length && values.every(finite) ? values.reduce((a, b) => a + b, 0) / values.length : null;
const sameScore = (a, b) => a === b || finite(a) && finite(b) && Math.abs(a - b) < 1e-10;
const round = value => finite(value) ? Math.round((value + Number.EPSILON) * 10) / 10 : null;
const wordCount = value => value.trim() ? value.trim().split(/\s+/u).length : 0;
const cellKey = value => `${value.benchmarkId}:${value.settingId}:${value.caseId}:${value.trialNumber}:${value.condition}`;
const CONDITIONS = [
  { id: "baseline", sourceId: "clean", short: "Plain", label: "Plain answer", color: "#72777f", shape: "circle" },
  { id: "skill", sourceId: "skill:dungeon-master", short: "Dungeon Master", label: "Dungeon Master skill", color: "#1f6fff", shape: "square" }
];
const USAGE_FIELDS = ["inputTokens", "cachedInputTokens", "cacheWriteInputTokens", "cacheCreationInputTokens", "cacheReadInputTokens", "outputTokens", "reasoningOutputTokens", "totalTokens"];
const publicUsage = usage => Object.fromEntries(USAGE_FIELDS.map(field => [field, finite(usage?.[field]) && usage[field] >= 0 ? usage[field] : null]));

function requireEvidence(condition, message) {
  if (!condition) throw new Error(`Dungeon Master publication: ${message}`);
}
function requirePublic(value) {
  requireEvidence(!/\/Users\/|file:\/\/|"(?:threadId|sessionId|session_id|cliArguments|stdout|stderr)"/u.test(JSON.stringify(value)), "private runtime details reached public evidence.");
}
function relative(value) {
  requireEvidence(typeof value === "string" && value.length && !path.isAbsolute(value) && !value.includes("\\") && value.split("/").every(part => part && part !== "." && part !== ".."), "unsafe source path.");
  return value;
}
function pinned(root, pin, reader) {
  requireEvidence(HASH.test(pin?.sha256 ?? ""), "missing source fingerprint.");
  const text = reader(path.join(root, relative(pin.path)), "utf8");
  requireEvidence(hash(text) === pin.sha256, "selected immutable source changed.");
  return JSON.parse(text);
}
function metrics(cells) {
  return { meanLatencyMs: round(mean(cells.map(cell => cell.latencyMs))), meanInputTokens: round(mean(cells.map(cell => cell.inputTokens))), meanOutputTokens: round(mean(cells.map(cell => cell.outputTokens))), meanTotalTokens: round(mean(cells.map(cell => cell.totalTokens))), meanWordCount: round(mean(cells.map(cell => cell.wordCount))), meanCostUsd: null, costCoverage: "not-comparable" };
}
function summary(cells, cases) {
  const pairs = cases.map(story => ({ story, baseline: cells.find(cell => cell.caseId === story.id && cell.condition === "baseline"), skill: cells.find(cell => cell.caseId === story.id && cell.condition === "skill") })).filter(pair => finite(pair.baseline?.exactScore) && finite(pair.skill?.exactScore));
  const members = cells.filter(cell => cases.some(story => story.id === cell.caseId));
  return { baseline: round(mean(pairs.map(pair => pair.baseline.exactScore))), treatment: round(mean(pairs.map(pair => pair.skill.exactScore))), delta: round(mean(pairs.map(pair => pair.skill.exactScore - pair.baseline.exactScore))), wins: pairs.filter(pair => pair.skill.exactScore > pair.baseline.exactScore).length, ties: pairs.filter(pair => pair.skill.exactScore === pair.baseline.exactScore).length, losses: pairs.filter(pair => pair.skill.exactScore < pair.baseline.exactScore).length, usablePairs: pairs.length, expectedPairs: cases.length, complete: pairs.length === cases.length, sourcePromptCount: new Set(cases.map(story => story.sourceCaseId)).size, pairCount: pairs.length, responseCount: members.filter(cell => cell.coverage.completedResponses).length, judgmentCount: members.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0) };
}
function validRuntime(receipt, prompt, output, configuration, skillHash) {
  requireEvidence(receipt?.freshSession === true && receipt.cli === "codex" && receipt.requestedModel === "gpt-6-astra" && receipt.requestedReasoning === "ultra" && equal(receipt.requestedConfiguration, configuration) && receipt.userPromptSha256 === hash(prompt) && receipt.outputSha256 === hash(output) && receipt.skillHash === skillHash, "fresh runtime identity, input, output, or treatment changed.");
}
function preferences(cases, responses) {
  return cases.flatMap(story => responses.find(response => response.caseId === story.id && response.condition === "baseline").judgments.map(judge => ({ caseId: story.id, reviewerId: judge.reviewerId, ...judge.preference })));
}
function failureRates(responses) {
  return CONDITIONS.map(condition => ({ condition: condition.id, reviewedAnswers: responses.filter(response => response.condition === condition.id && response.judgments.length === 2).length, ...Object.fromEntries(["fundamentalRepairRequired", "taskNoncompletion"].map(flag => [flag, responses.filter(response => response.condition === condition.id && response.judgments.length === 2 && response.judgments.some(judge => judge.flags[flag].value)).length])) }));
}

function sourceJudgments(run, row, dimensions) {
  const pairs = run.judging?.pairs ?? [];
  const matching = pairs.filter(pair => pair.caseId === row.caseId && pair.trialNumber === row.trialNumber && pair.configurationId === row.configurationId);
  requireEvidence(matching.length <= 1, "duplicate judged pair.");
  if (!matching.length) return [];
  const pair = matching[0];
  requireEvidence(Array.isArray(pair.judges) && new Set(pair.judges.map(judge => judge.judgeId)).size === pair.judges.length && pair.judges.every(judge => REVIEWERS.includes(judge.judgeId)), "unknown or duplicated reviewer seat.");
  const completed = pair.judges.filter(judge => judge.status === "completed");
  if (completed.length === 2) requireEvidence(equal(completed[0].candidateOrder, [...completed[1].candidateOrder].reverse()), "independent pair orders were not counterbalanced.");
  return completed.map(judge => {
    const seat = run.judging.panel.find(candidate => candidate.id === judge.judgeId);
    const configuration = seat.configuration ?? { id: CONFIGURATION_ID, provider: seat.provider, model: seat.model, reasoning: seat.reasoning };
    requireEvidence(configuration.id === CONFIGURATION_ID && configuration.provider === "codex" && configuration.model === "gpt-6-astra" && configuration.reasoning === "ultra", "substituted judge configuration.");
    requireEvidence(hash(judge.promptText ?? "") === judge.promptHash && hash(judge.outputText ?? "") === judge.outputHash, "judge source bytes changed.");
    validRuntime(judge.runtimeReceipt, judge.promptText, judge.outputText, configuration, null);
    requireEvidence(judge.runtimeReceipt.instructionHash === null, "judge received a treatment instruction.");
    requireEvidence(Array.isArray(judge.candidateOrder) && judge.candidateOrder.length === 2 && new Set(judge.candidateOrder).size === 2, "invalid anonymous candidate order.");
    const candidates = judge.candidateOrder.map(key => run.rows.find(candidate => candidate.rowKey === key));
    requireEvidence(candidates.every(candidate => candidate?.rowStatus === "complete" && candidate.caseId === row.caseId && candidate.trialNumber === row.trialNumber && candidate.configurationId === row.configurationId) && new Set(candidates.map(candidate => candidate.conditionId)).size === 2, "judge pair differs from the declared generation pair.");
    requireEvidence(judge.promptText.includes(`<task>${row.promptText}</task>`) && judge.promptText.includes(`<rubric>${JSON.stringify(run.benchmark.definition.scoring)}</rubric>`), "judge task or frozen rubric differs.");
    for (const [index, candidate] of candidates.entries()) requireEvidence(judge.promptText.includes(`<candidate id="${index === 0 ? "A" : "B"}">\n<answer>${candidate.outputText}</answer>\n</candidate>`), "judge did not receive the exact anonymous answer.");
    let raw;
    try { raw = JSON.parse(judge.outputText.trim().replace(/^```(?:json)?\s*/u, "").replace(/\s*```$/u, "")); }
    catch { requireEvidence(false, "judge output is not JSON."); }
    requireEvidence(Array.isArray(raw.assessments) && raw.assessments.length === 2 && new Set(raw.assessments.map(item => item.candidateId)).size === 2 && raw.assessments.every(item => ["A", "B"].includes(item.candidateId)), "incomplete original pair assessment.");
    requireEvidence(judge.assessments?.length === 2, "normalized pair assessment missing.");
    for (const item of judge.assessments) {
      const { rowKey, ...body } = item;
      requireEvidence(rowKey === judge.candidateOrder[item.candidateId === "A" ? 0 : 1] && equal(body, raw.assessments.find(original => original.candidateId === item.candidateId)), "normalized assessment differs from the original judgment.");
    }
    requireEvidence(equal(raw.preference, judge.preference) && ["A", "B", "tie"].includes(raw.preference?.winner) && ["low", "medium", "high"].includes(raw.preference?.confidence) && typeof raw.preference.reason === "string" && raw.preference.reason.trim(), "invalid original pair preference.");
    const assessment = judge.assessments.find(item => item.rowKey === row.rowKey);
    requireEvidence(assessment?.dimensions?.length === dimensions.length && new Set(assessment.dimensions.map(d => d.id)).size === dimensions.length, "incomplete dimension assessment.");
    const ratings = Object.fromEntries(dimensions.map(dimension => {
      const item = assessment.dimensions.find(candidate => candidate.id === dimension.id);
      requireEvidence(Number.isInteger(item?.score) && item.score >= 0 && item.score <= 5 && typeof item.reason === "string" && item.reason.trim() && (typeof item.evidence === "string" ? item.evidence.trim() : Array.isArray(item.evidence) && item.evidence.length && item.evidence.every(part => typeof part === "string" && part.trim())), "invalid dimension rating or missing evidence.");
      return [dimension.id, { rating: item.score, reason: item.reason, evidence: item.evidence }];
    }));
    for (const flag of ["fundamentalRepairRequired", "taskNoncompletion"]) requireEvidence(typeof assessment[flag]?.value === "boolean" && typeof assessment[flag].reason === "string", "missing independent failure flag.");
    const candidateConditions = candidates.map(candidate => CONDITIONS.find(condition => condition.sourceId === candidate.conditionId).id);
    const winner = raw.preference.winner === "tie" ? "tie" : candidateConditions[raw.preference.winner === "A" ? 0 : 1];
    return { reviewerId: judge.judgeId, judgeConfigurationId: CONFIGURATION_ID, candidateId: assessment.candidateId, score: mean(Object.values(ratings).map(dimension => dimension.rating)) * 20, dimensions: ratings, rationale: dimensions.map(dimension => `${dimension.title}: ${ratings[dimension.id].reason}`).join("\n\n"), flags: { fundamentalRepairRequired: assessment.fundamentalRepairRequired, taskNoncompletion: assessment.taskNoncompletion }, preference: { winner, candidateACondition: candidateConditions[0], candidateBCondition: candidateConditions[1], confidence: raw.preference.confidence, reason: raw.preference.reason }, promptSha256: judge.promptHash, answerSha256: judge.outputHash, resources: { scope: "shared-matched-pair-batch", candidateCount: 2, durationMs: finite(judge.durationMs) ? judge.durationMs : null, usage: publicUsage(judge.usage) } };
  });
}

export function projectDungeonMasterRun({ run, snapshot, sourceSha256 }) {
  const definition = run?.benchmark?.definition;
  requireEvidence(run?.kind === "dungeon-master-benchmark" && definition?.id === DUNGEON_MASTER_BENCHMARK_ID && HASH.test(sourceSha256 ?? "") && run.benchmark.hash === hash(JSON.stringify(definition)), "unsupported or changed frozen benchmark.");
  requireEvidence(!String(definition.status).includes("draft"), "draft diagnostic runs cannot be selected.");
  validateStorytellingSkillSnapshot(snapshot);
  requireEvidence(snapshot.files.every(file => file.bytes === Buffer.byteLength(file.contents)), "frozen skill file byte counts changed.");
  requireEvidence(snapshot.skillName === "dungeon-master" && snapshot.hash === run.treatment?.hash && run.treatment.id === "skill:dungeon-master", "changed frozen treatment.");
  requireEvidence(definition.cases?.length === 6 && definition.cases.filter(c => c.cohort === "primary").length === 1 && definition.cases.filter(c => c.cohort === "transfer").length === 5 && definition.cases.every(c => c.repetitions === (c.cohort === "primary" ? 6 : 2)) && definition.cases.find(c => c.cohort === "primary").task === PRIMARY_PROMPT, "predeclared primary and transfer inventory changed.");
  const rawDimensions = definition.scoring?.dimensions;
  requireEvidence(rawDimensions?.length === 6 && new Set(rawDimensions.map(d => d.id)).size === 6 && rawDimensions.every(d => d.weight === 1) && definition.scoring.ratingScale?.min === 0 && definition.scoring.ratingScale?.max === 5, "six equal 0–5 dimensions are required.");
  const dimensions = rawDimensions.map(d => ({ id: d.id, title: d.title, label: d.title, description: d.criterion, weight: 100 / 6, anchors: { 1: "Severe deficiencies; substantial invention or repair required.", 2: "Partially effective, with an important identifiable weakness.", 4: "Strong, with only minor limitations between competent and exceptional.", ...d.anchors } }));
  requireEvidence(run.configurations?.length === 1 && run.configurations[0].id === CONFIGURATION_ID, "generator inventory changed.");
  const configuration = run.configurations[0];
  requireEvidence(configuration.provider === "codex" && configuration.model === "gpt-6-astra" && configuration.reasoning === "ultra", "generator identity changed.");
  if (run.judging?.pairs) requireEvidence(run.judging.schemaVersion === 1 && run.judging.panel?.length === 2 && equal(run.judging.panel.map(judge => judge.id).sort(), [...REVIEWERS].sort()), "independent judge inventory changed.");
  const setting = { id: "codex-gpt-6-astra-ultra", configurationId: CONFIGURATION_ID, modelId: "codex:gpt-6-astra", provider: "codex", family: "GPT-6 Astra", reasoning: "ultra", label: "GPT-6 Astra · ultra" };
  const cases = definition.cases.flatMap(c => Array.from({ length: c.repetitions }, (_, index) => ({ id: `${c.id}-repeat-${index + 1}`, sourceCaseId: c.id, benchmarkId: DUNGEON_MASTER_BENCHMARK_ID, title: `${c.title} · Repetition ${index + 1}`, prompt: c.task, trialNumber: index + 1, cohort: c.cohort, genre: c.genre, medium: "adventure outline", version: null, creator: null })));
  requireEvidence(new Set(cases.map(c => c.id)).size === 16 && run.rows?.length === 32 && new Set(run.rows.map(row => row.rowKey)).size === 32, "generation inventory is incomplete or duplicated.");
  const requiredSkillFiles = run.treatment.requiredSkillFiles ?? [];
  requireEvidence(equal(requiredSkillFiles, ["references/adventure-design.md"]), "required treatment reference policy changed.");
  const instruction = createStorytellingSkillInstruction({ skillSnapshot: snapshot, skillDirectoryPath: "<frozen-skill-directory>", requiredSkillFiles });
  const rubricText = definition.scoring.judgeInstructions;
  requireEvidence(typeof rubricText === "string" && rubricText.trim(), "frozen judging instructions missing.");
  if (run.judging?.pairs?.some(pair => pair.judges.some(judge => judge.status === "completed"))) requireEvidence(run.judging.rubricHash === hash(rubricText), "judging instructions differ from the frozen rubric.");
  const promptFiles = [{ id: "frozen-skill-root", title: "Frozen Dungeon Master skill provider instruction (directory normalized)", content: instruction, sha256: hash(instruction) }, { id: "frozen-judge-rubric", title: "Frozen adventure-outline judging rubric and interpretation rules", content: rubricText, sha256: hash(rubricText) }, ...snapshot.files.filter(file => file.relativePath !== "SKILL.md").map(file => ({ id: `frozen-library-${hash(file.relativePath).slice(0, 16)}`, title: file.relativePath, content: file.contents, sha256: file.sha256 }))];
  const cells = [], responses = [], messageSets = new Map();
  for (const story of cases) for (const condition of CONDITIONS) {
    const matches = run.rows.filter(row => row.caseId === story.sourceCaseId && row.trialNumber === story.trialNumber && row.configurationId === CONFIGURATION_ID && row.conditionId === condition.sourceId);
    requireEvidence(matches.length === 1, "a repeated generation cell is missing or duplicated.");
    const row = matches[0];
    requireEvidence(row.promptText === story.prompt && ["complete", "pending", "running", "error", "failed", "unavailable", "interrupted"].includes(row.rowStatus), "generation prompt or status changed.");
    const complete = row.rowStatus === "complete";
    if (complete) {
      requireEvidence(typeof row.outputText === "string" && row.outputText.trim() && hash(row.outputText) === row.outputHash && row.provider === "codex" && row.model === "gpt-6-astra" && row.reasoning === "ultra", "generation output or identity changed.");
      validRuntime(row.runtimeReceipt, story.prompt, row.outputText, configuration, condition.id === "skill" ? snapshot.hash : null);
      requireEvidence(row.runtimeReceipt.instructionHash === (condition.id === "skill" ? hash(instruction) : null), "generation instruction changed.");
      if (condition.id === "skill") requireEvidence(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles, receipt: row.runtimeReceipt.requiredSkillReads }), "required frozen reference read is not verified.");
      requireEvidence((row.runtimeReceipt.referenceAccess?.observedPaths ?? []).every(file => snapshot.files.some(source => source.relativePath === file)) && (condition.id === "skill" || !(row.runtimeReceipt.referenceAccess?.observedPaths ?? []).length), "reference access crossed the frozen condition boundary.");
    }
    const judgments = complete ? sourceJudgments(run, row, dimensions) : [];
    const exactScore = judgments.length === 2 ? mean(judgments.map(judge => judge.score)) : null;
    const ratings = Object.fromEntries(dimensions.map(d => [d.id, judgments.length === 2 ? mean(judgments.map(judge => judge.dimensions[d.id].rating)) : null]));
    const disagreement = judgments.length === 2 ? { scoreSpread: Math.abs(judgments[0].score - judgments[1].score), dimensionRanges: dimensions.map(d => ({ id: d.id, spread: Math.abs(judgments[0].dimensions[d.id].rating - judgments[1].dimensions[d.id].rating) })) } : null;
    const text = complete ? row.outputText : "";
    const status = finite(exactScore) ? "scored" : complete ? "unscored" : row.rowStatus;
    const failureReason = complete ? null : ["pending", "running"].includes(status) ? "Generation not completed in this snapshot." : "Generation did not complete; no answer was scored.";
    const cell = { benchmarkId: DUNGEON_MASTER_BENCHMARK_ID, settingId: setting.id, configurationId: CONFIGURATION_ID, caseId: story.id, sourceCaseId: story.sourceCaseId, trialNumber: story.trialNumber, condition: condition.id, category: "writing", cohort: story.cohort, status, exactScore, score: round(exactScore), dimensions: ratings, disagreement, trials: 1, calibrated: false, latencyMs: complete && finite(row.durationMs) ? row.durationMs : null, ...Object.fromEntries(["inputTokens", "outputTokens", "totalTokens"].map(field => [field, complete ? publicUsage(row.usage)[field] : null])), costUsd: null, wordCount: complete ? wordCount(text) : null, coverage: { expectedJudgments: 2, completedJudgments: judgments.length, expectedResponses: 1, completedResponses: complete ? 1 : 0 }, failureReason, attemptCount: row.attempts?.length ?? 0 };
    cell.metrics = metrics([cell]); cells.push(cell);
    const messages = [...(condition.id === "skill" ? [{ role: "developer", content: "Frozen Dungeon Master skill provider instruction; see the shared Method archive.", fileId: "frozen-skill-root" }] : []), { role: "user", content: story.prompt }];
    const messageSetId = hash(JSON.stringify(messages)); messageSets.set(messageSetId, { id: messageSetId, messages });
    responses.push({ benchmarkId: cell.benchmarkId, settingId: setting.id, configurationId: CONFIGURATION_ID, caseId: story.id, sourceCaseId: story.sourceCaseId, trialNumber: story.trialNumber, condition: condition.id, status, failureReason, outputText: text, wordCount: cell.wordCount, characterCount: complete ? Array.from(text).length : null, score: cell.score, judgments, disagreement, messageSetId, provenance: { sourceSha256, outputSha256: complete ? row.outputHash : null, questionSha256: hash(story.prompt), skillSha256: condition.id === "skill" ? snapshot.hash : null }, runtime: complete ? { freshSession: true, modelVerification: row.runtimeReceipt.modelVerification ?? "explicit-cli-request-only", reasoningVerification: row.runtimeReceipt.reasoningVerification ?? "explicit-cli-request-only", executionMode: row.runtimeReceipt.executionMode ?? "ultra", referenceFilesRead: row.runtimeReceipt.referenceAccess?.observedPaths ?? [], observedCollaborationEvents: row.runtimeReceipt.itemTypeCounts?.collab_tool_call ?? 0, rawProviderStreamRetained: row.runtimeReceipt.rawStreamsRetained === true, durationMs: cell.latencyMs, usage: publicUsage(row.usage) } : null });
  }
  const primaryCases = cases.filter(story => story.cohort === "primary");
  const cohortSummaries = { primary: summary(cells, primaryCases), transfer: summary(cells, cases.filter(story => story.cohort === "transfer")), fantasyTransfer: summary(cells, cases.filter(story => story.cohort === "transfer" && story.genre === "fantasy")), otherGenreTransfer: summary(cells, cases.filter(story => story.cohort === "transfer" && story.genre !== "fantasy")) };
  const primary = cohortSummaries.primary;
  const all = summary(cells, cases);
  const aggregates = CONDITIONS.map(condition => {
    const members = cells.filter(cell => cell.cohort === "primary" && cell.condition === condition.id);
    const exactScore = primary.complete ? mean(members.map(cell => cell.exactScore)) : null;
    return { benchmarkId: DUNGEON_MASTER_BENCHMARK_ID, settingId: setting.id, configurationId: CONFIGURATION_ID, condition: condition.id, cohort: "primary", category: "writing", exactScore, score: round(exactScore), status: primary.complete ? "scored" : "incomplete", dimensions: Object.fromEntries(dimensions.map(d => [d.id, primary.complete ? mean(members.map(cell => cell.dimensions[d.id])) : null])), metrics: metrics(members), coverage: { expectedCases: 6, scoredCases: members.filter(cell => finite(cell.exactScore)).length, completedResponses: members.filter(cell => cell.coverage.completedResponses).length, expectedResponses: 6, completedJudgments: members.reduce((sum, cell) => sum + cell.coverage.completedJudgments, 0), expectedJudgments: 12 }, trials: 6, calibrated: false };
  });
  setting.scores = Object.fromEntries(aggregates.map(cell => [cell.condition, cell.score]));
  setting.deltas = { skill: primary.complete ? round(aggregates[1].exactScore - aggregates[0].exactScore) : null };
  setting.metrics = Object.fromEntries(aggregates.map(cell => [cell.condition, cell.metrics]));
  setting.coverage = Object.fromEntries(aggregates.map(cell => [cell.condition, cell.coverage]));
  setting.categories = Object.fromEntries(aggregates.map(cell => [cell.condition, [{ category: "writing", score: cell.score, exactScore: cell.exactScore }]]));
  const entries = aggregates.map(aggregate => ({ ...setting, id: `${setting.id}-${aggregate.condition}`, settingId: setting.id, condition: aggregate.condition, conditionLabel: CONDITIONS.find(condition => condition.id === aggregate.condition).label, score: aggregate.score, exactScore: aggregate.exactScore, rank: primary.complete ? 1 : null, baselineScore: setting.scores.baseline, delta: aggregate.condition === "baseline" ? (primary.complete ? 0 : null) : setting.deltas.skill, categories: setting.categories[aggregate.condition], baselineCategories: setting.categories.baseline, metrics: aggregate.metrics, coverage: aggregate.coverage, cost: null, latency: finite(aggregate.metrics.meanLatencyMs) ? aggregate.metrics.meanLatencyMs / 1000 : null, tokens: aggregate.metrics.meanOutputTokens }));
  const coverage = { benchmarkCount: 1, caseCount: cases.length, promptCount: 6, settingCount: 1, completedSettingCount: primary.complete ? 1 : 0, responseCount: cells.filter(cell => cell.coverage.completedResponses).length, expectedResponseCount: 32, scoredResponseCount: cells.filter(cell => finite(cell.exactScore)).length, usablePairs: all.usablePairs, expectedPairs: 16, judgmentCount: responses.reduce((sum, response) => sum + response.judgments.length, 0), expectedJudgmentCount: 64 };
  const limitations = [...(definition.limitations ?? []), "One generator configuration and two independent reviews by the same model; judge agreement is not cross-model or human calibration.", "The exact primary prompt is reported separately from transfer prompts. Repetitions are writing samples; additional judge ratings do not increase that sample size.", "Ultra can use collaboration. A fresh CLI session does not establish the number of underlying model agents.", "The comparison estimates explicit invocation of this frozen skill in this environment, including its context and tool behavior."];
  const availability = { status: "development", verification: "unverified", code: "development-uncalibrated", message: "Exploratory model-judged results", detail: "Six fresh repetitions of the exact prompt and two of each transfer prompt. Writing remains excluded from Overall.", blockers: [{ code: "human-calibration-pending", message: "Not calibrated against a human panel." }] };
  const scoreBasis = { id: `${definition.edition}:${run.benchmark.hash}`, label: "Dungeon Master · Adventure outline v1", edition: definition.edition, method: "primary-prompt-complete-paired-repeat-mean-v1", unit: "rubric-points", range: { minimum: 0, maximum: 100 }, benchmarkIds: [DUNGEON_MASTER_BENCHMARK_ID], taskCount: 6, trialsPerTask: null, judgeCount: 2, judges: REVIEWERS.map(() => CONFIGURATION_ID), reviewers: REVIEWERS.map(id => ({ id, configurationId: CONFIGURATION_ID })), judgeConfigurations: REVIEWERS.map(id => ({ reviewerId: id, configurationId: CONFIGURATION_ID })), dimensions, weights: Object.fromEntries(dimensions.map(d => [d.id, d.weight])), ratingMinimum: 0, ratingMaximum: 5, gates: null, caps: null, aggregation: "mean-six-ratings-times-twenty-then-mean-two-reviews", batchUnit: "matched-pair", calibrationStatus: "development-uncalibrated", panelMethod: "Each independent reviewer scores six equal dimensions from 0 to 5. Their mean × 20 gives a 0–100 score; the answer requires both reviews and averages those scores. The leaderboard averages all six primary-prompt repetitions in both conditions. Transfer results remain separate.", blinding: "The two fresh reviewers receive anonymous A/B candidates in opposite order, the exact task and the frozen rubric. Condition and generator labels are withheld; style can still reveal the condition. Both reviewers use GPT-6 Astra Ultra.", sourceSha256, coverage, uncertainty: { status: "descriptive-repeated-trials", reason: "Small fixed prompt set and one model configuration; no population-level confidence claim." } };
  const methodology = { corpusSha256: run.benchmark.hash, rubricSha256: hash(JSON.stringify(definition.scoring)), skillSha256: snapshot.hash, corpus: cases.map(story => ({ id: story.id, title: story.title, sha256: hash(story.prompt) })), skillFiles: snapshot.files.map(file => ({ path: file.relativePath, sha256: file.sha256, bytes: file.bytes })), generationContract: "Same exact task in fresh isolated GPT-6 Astra Ultra sessions. Plain receives no skill instruction or reference files; treatment receives the frozen Dungeon Master root instruction, a required verified read of its adventure-design reference, and other model-selected frozen references. Every predeclared repetition is retained; no valid answer is revised or selected by score.", blinding: scoreBasis.blinding, limitations, execution: { trialCount: null, primaryRepetitions: 6, transferRepetitions: 2, generationOrderPolicy: run.generation?.orderPolicy ?? null }, resourceAccounting: "Generation resources belong to each answer. Judge resources cover the matched pair and repeat on both answer records: count each reviewer/prompt SHA-256 once. Missing provider usage remains unknown; saved normalized counts are not a reconstructed bill." };
  const detailHref = `benchmark-report.html#${DUNGEON_MASTER_BENCHMARK_ID}`;
  const benchmark = { id: DUNGEON_MASTER_BENCHMARK_ID, trackId: "dungeon-master", familyId: "writing", category: "writing", suite: "DUNGEON MASTER", name: "Adventure outline", title: "Adventure outline", description: definition.description, taskKind: "adventure-outline", prompt: PRIMARY_PROMPT, judging: { panel: REVIEWERS, synthesizer: null }, limitations, reportFragment: DUNGEON_MASTER_BENCHMARK_ID, detailHref, evidenceKind: "development", resultAvailability: availability, measured: { ...primary, complete: coverage.scoredResponseCount, total: 32, treatmentLabel: "Dungeon Master skill", calibration: "Human calibration pending" } };
  const counts = { families: 1, tracks: 1, benchmarks: 1, categories: 1, cases: 16, conditions: 2, settings: 1, resultEntries: 2, responses: coverage.responseCount, developmentResultSets: 1, eligibleResultSets: 0, withheldResultSets: 0 };
  const caseSummaries = cases.map(story => ({ caseId: story.id, sourceCaseId: story.sourceCaseId, trialNumber: story.trialNumber, benchmarkId: DUNGEON_MASTER_BENCHMARK_ID, ...summary(cells, [story]), total: 2, complete: cells.filter(cell => cell.caseId === story.id && finite(cell.exactScore)).length, detailHref: `${detailHref}/${story.id}` }));
  const pairwisePreferences = preferences(cases, responses);
  const flagRates = failureRates(responses);
  const projection = { kind: "vasirbenchmark-writing-projection", schemaVersion: 1, subcategory: "dungeon-master", subcategoryTitle: "DUNGEON MASTER", caseLabel: "adventure prompt repetition", trialLabel: "Repetition", trialCount: 1, program: { id: "vasirbench", title: "VasirBench", status: "development", evidenceStatus: "development", verification: "unverified" }, meta: { release: "Development snapshot · September 2026", status: availability.message, categories: 1, benchmarks: 1, settings: 1, conditions: 2, trials: 16, aggregateCells: 32, runs: 1, calibration: 0 }, scoreBasis, conditions: CONDITIONS, categories: [{ id: "writing", name: "Writing", title: "Writing", short: "WRITE", weight: 1, color: "#b65a31", trackIds: ["dungeon-master"] }], families: [{ id: "writing", title: "Writing", description: "Writing benchmarks with separate task-local scores.", trackIds: ["dungeon-master"] }], tracks: [{ id: "dungeon-master", familyId: "writing", title: "DUNGEON MASTER", description: "Adventure outlines for tabletop roleplaying.", benchmarkIds: [DUNGEON_MASTER_BENCHMARK_ID], resultAvailability: availability }], benchmarks: [benchmark], results: [{ benchmarkId: DUNGEON_MASTER_BENCHMARK_ID, runId: run.runId, status: "development", verification: "unverified", baselineScore: primary.baseline, treatmentScore: primary.treatment, delta: primary.delta, responseCount: coverage.responseCount, matchedConfigurationCount: coverage.completedSettingCount, coverage }], settings: [setting], entries, benchmarkResults: aggregates, benchmarkSummaries: [{ benchmarkId: DUNGEON_MASTER_BENCHMARK_ID, runId: run.runId, status: "development", verification: "unverified", evidenceKind: "development", baselineLabel: "Plain answer", treatmentLabel: "Dungeon Master skill", ...primary, complete: coverage.scoredResponseCount, total: 32, completionLabel: "scored responses", calibration: "Human calibration pending", detailHref, sourceHref: null }], cases, caseSummaries, trialSummaries: caseSummaries, caseResults: cells, cohortSummaries, pairwisePreferences, flagRates, methodology, coverage, categoryLeaders: primary.complete ? [{ category: "writing", entry: { ...entries[1], categoryScore: entries[1].score } }] : [], efficientFrontier: [], regressions: entries.filter(entry => entry.condition === "skill" && finite(entry.delta) && entry.delta < 0), callouts: { overall: "Writing is excluded from Overall.", value: "Quality, length and latency are separate outcomes.", regression: "Every repeated answer and paired loss remains visible.", category: "Primary-prompt ranking; transfer prompts reported separately." }, availability, counts };
  const responseBundle = { kind: "vasirbenchmark-writing-responses", schemaVersion: 1, counts: { ...coverage, responses: 32, messageSets: messageSets.size, judgments: coverage.judgmentCount }, promptFiles, messageSets: [...messageSets.values()], responses };
  const stub = { benchmarkId: DUNGEON_MASTER_BENCHMARK_ID, benchmarkTitle: "Adventure outline", subcategory: "dungeon-master", title: "DUNGEON MASTER", coverage, treatmentLabel: "Dungeon Master skill", scoreBasisLabel: scoreBasis.label, detailHref, status: coverage.scoredResponseCount ? "measured" : "unscored" };
  validateDungeonMasterPublication(projection, responseBundle);
  return { projection, responseBundle, stub, basisSha256: hash(JSON.stringify({ sourceSha256, skillSha256: snapshot.hash, corpusSha256: run.benchmark.hash })) };
}

export function validateDungeonMasterPublication(projection, responseBundle) {
  requireEvidence(projection?.kind === "vasirbenchmark-writing-projection" && projection.schemaVersion === 1 && projection.benchmarks?.length === 1 && projection.benchmarks[0].id === DUNGEON_MASTER_BENCHMARK_ID && projection.subcategory === "dungeon-master" && projection.scoreBasis?.dimensions?.length === 6 && projection.scoreBasis.ratingMinimum === 0 && projection.scoreBasis.ratingMaximum === 5 && equal(projection.scoreBasis.judges, REVIEWERS.map(() => CONFIGURATION_ID)), "invalid public benchmark projection.");
  const dimensions = projection.scoreBasis.dimensions;
  const cells = projection.caseResults;
  requireEvidence(cells?.length === 32 && new Set(cells.map(cellKey)).size === 32 && projection.cases?.length === 16 && new Set(projection.cases.map(story => story.id)).size === 16, "public repetition coverage changed.");
  for (const cell of cells) {
    const story = projection.cases.find(candidate => candidate.id === cell.caseId);
    requireEvidence(story && cell.benchmarkId === DUNGEON_MASTER_BENCHMARK_ID && cell.configurationId === CONFIGURATION_ID && story.trialNumber === cell.trialNumber && story.sourceCaseId === cell.sourceCaseId && story.cohort === cell.cohort && ["baseline", "skill"].includes(cell.condition), "public cell identity changed.");
    const score = cell.coverage.completedJudgments === 2 ? mean(dimensions.map(d => cell.dimensions[d.id])) * 20 : null;
    requireEvidence(sameScore(cell.exactScore, score) && cell.score === round(score), "public score differs from independent dimensions.");
  }
  for (const [cohort, predicate] of Object.entries({ primary: story => story.cohort === "primary", transfer: story => story.cohort === "transfer", fantasyTransfer: story => story.cohort === "transfer" && story.genre === "fantasy", otherGenreTransfer: story => story.cohort === "transfer" && story.genre !== "fantasy" })) requireEvidence(equal(projection.cohortSummaries[cohort], summary(cells, projection.cases.filter(predicate))), "cohort summary differs from paired repetitions.");
  const primary = projection.cohortSummaries.primary;
  requireEvidence(projection.settings?.length === 1 && projection.entries?.length === 2 && projection.benchmarkResults?.length === 2, "public model inventory changed.");
  for (const aggregate of projection.benchmarkResults) {
    const members = cells.filter(cell => cell.cohort === "primary" && cell.condition === aggregate.condition);
    const exactScore = primary.complete ? mean(members.map(cell => cell.exactScore)) : null;
    requireEvidence(aggregate.exactScore === exactScore && aggregate.score === round(exactScore), "ranking mixed primary and transfer evidence.");
    const entry = projection.entries.find(candidate => candidate.condition === aggregate.condition);
    requireEvidence(entry?.exactScore === exactScore && entry.score === aggregate.score && entry.rank === (primary.complete ? 1 : null) && projection.settings[0].scores[aggregate.condition] === aggregate.score, "public ranking changed.");
  }
  requirePublic(projection);
  if (responseBundle) {
    requireEvidence(responseBundle.kind === "vasirbenchmark-writing-responses" && responseBundle.responses?.length === 32 && new Set(responseBundle.responses.map(cellKey)).size === 32, "public answer coverage changed.");
    requirePublic(responseBundle);
    const sets = new Map(responseBundle.messageSets.map(set => [set.id, set]));
    requireEvidence(sets.size === responseBundle.messageSets.length && [...sets.values()].every(set => hash(JSON.stringify(set.messages)) === set.id) && new Set(responseBundle.promptFiles.map(file => file.id)).size === responseBundle.promptFiles.length && responseBundle.promptFiles.every(file => hash(file.content) === file.sha256), "public prompt archive changed.");
    for (const response of responseBundle.responses) {
      const cell = cells.find(candidate => cellKey(candidate) === cellKey(response));
      const story = projection.cases.find(candidate => candidate.id === response.caseId);
      const messages = sets.get(response.messageSetId)?.messages;
      requireEvidence(cell && response.score === cell.score && response.judgments.length === cell.coverage.completedJudgments && response.wordCount === (response.outputText ? wordCount(response.outputText) : null) && response.characterCount === (response.outputText ? Array.from(response.outputText).length : null) && response.provenance.outputSha256 === (response.outputText ? hash(response.outputText) : null), "public answer, length or score changed.");
      requireEvidence(messages?.length === (response.condition === "skill" ? 2 : 1) && messages.at(-1).content === story.prompt && messages.at(-1).role === "user" && response.provenance.questionSha256 === hash(story.prompt) && response.provenance.sourceSha256 === projection.scoreBasis.sourceSha256 && response.provenance.skillSha256 === (response.condition === "skill" ? projection.methodology.skillSha256 : null), "public task or provenance changed.");
      if (response.condition === "skill") requireEvidence(messages[0].role === "developer" && messages[0].fileId === "frozen-skill-root" && responseBundle.promptFiles.some(file => file.id === messages[0].fileId), "public treatment instruction reference changed.");
      requireEvidence(new Set(response.judgments.map(judge => judge.reviewerId)).size === response.judgments.length, "public reviewer seat repeated.");
      for (const judge of response.judgments) {
        requireEvidence(REVIEWERS.includes(judge.reviewerId) && judge.judgeConfigurationId === CONFIGURATION_ID && dimensions.every(d => Number.isInteger(judge.dimensions[d.id]?.rating) && judge.dimensions[d.id].rating >= 0 && judge.dimensions[d.id].rating <= 5) && judge.score === mean(dimensions.map(d => judge.dimensions[d.id].rating)) * 20, "public judge rating changed.");
      }
      requireEvidence(cell.exactScore === (response.judgments.length === 2 ? mean(response.judgments.map(judge => judge.score)) : null) && dimensions.every(d => cell.dimensions[d.id] === (response.judgments.length === 2 ? mean(response.judgments.map(judge => judge.dimensions[d.id].rating)) : null)), "public panel differs from displayed dimensions.");
    }
    requireEvidence(equal(projection.pairwisePreferences, preferences(projection.cases, responseBundle.responses)) && equal(projection.flagRates, failureRates(responseBundle.responses)), "public preferences or failure rates differ from retained judgments.");
  }
  return projection;
}

export function buildDungeonMasterPublication({ repoRootDirectory, readFileSyncImplementation = fs.readFileSync }) {
  let selection;
  try { selection = JSON.parse(readFileSyncImplementation(path.join(repoRootDirectory, DUNGEON_MASTER_SELECTION_PATH), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
  requireEvidence(selection?.kind === "vasirbenchmark-dungeon-master-source" && selection.schemaVersion === 1, "invalid source selection.");
  return projectDungeonMasterRun({ run: pinned(repoRootDirectory, selection.run, readFileSyncImplementation), snapshot: pinned(repoRootDirectory, selection.skill, readFileSyncImplementation), sourceSha256: selection.run.sha256 });
}

export function prepareDungeonMasterPublicationSource({ repoRootDirectory, runDirectory }) {
  const root = path.resolve(repoRootDirectory), directory = path.resolve(runDirectory);
  requireEvidence(directory.startsWith(`${path.join(root, ".agents", "vasir-evals", DUNGEON_MASTER_BENCHMARK_ID)}${path.sep}`), "checkpoint is outside the benchmark artifact directory.");
  requireEvidence(!fs.existsSync(path.join(directory, "run.lock")), "wait for the active run writer before archiving.");
  const runText = fs.readFileSync(path.join(directory, "run.json"), "utf8"), snapshotText = fs.readFileSync(path.join(directory, "skill-snapshot.json"), "utf8"), runHash = hash(runText);
  projectDungeonMasterRun({ run: JSON.parse(runText), snapshot: JSON.parse(snapshotText), sourceSha256: runHash });
  const archive = `.agents/vasir-evals/${DUNGEON_MASTER_BENCHMARK_ID}/publication-snapshots/${runHash}`;
  fs.mkdirSync(path.join(root, archive), { recursive: true });
  for (const [name, text] of [["run.json", runText], ["skill-snapshot.json", snapshotText]]) {
    const target = path.join(root, archive, name);
    if (fs.existsSync(target)) requireEvidence(fs.readFileSync(target, "utf8") === text, "immutable archive differs.");
    else fs.writeFileSync(target, text, { flag: "wx" });
  }
  return { kind: "vasirbenchmark-dungeon-master-source", schemaVersion: 1, run: { path: `${archive}/run.json`, sha256: runHash }, skill: { path: `${archive}/skill-snapshot.json`, sha256: hash(snapshotText) } };
}
