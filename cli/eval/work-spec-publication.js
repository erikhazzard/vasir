import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "../cli-error.js";
import { BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF } from "../docs-ref.js";

export const WORK_SPEC_BENCHMARK_ID = "work-spec-chat";
export const WORK_SPEC_TRACK_ID = "work-specification";
export const WORK_SPEC_EDITION = "work-spec-generation-v1";
export const WORK_SPEC_WEIGHTS = Object.freeze({ V: 25, G: 15, A: 20, D: 15, S: 15, C: 10 });
const PANEL = ["codex:gpt-6-astra@xhigh", "claude:claude-fable-5-1@max"];
const READINESS = ["Implement as written", "Implement after the named correction", "Fix spec first", "Sound spec; decision required", "Not assessable"];
const CONDITIONS = [
  { id: "baseline", sourceId: "clean", short: "Minimal", label: "Minimal baseline", color: "#72777f", shape: "circle" },
  { id: "skill", sourceId: "skill:plan__maintain-work-spec", short: "Work spec", label: "Work-spec skill", color: "#1f6fff", shape: "square" }
];
const FAMILY = { id: "ai-workflows", title: "AI Workflows", description: "Useful specifications that preserve product intent and direct subsequent work.", trackIds: [WORK_SPEC_TRACK_ID] };
const LIMITATIONS = [
  "One authored chat scenario and one trial per condition; this does not establish performance across AI workflows.",
  "The rubric is not yet calibrated against human judgments or downstream implementation outcomes.",
  "The treatment is the frozen work-spec skill plus its required dependency excerpts; it is not Full Vasir.",
  "The judges also appear among the candidates. Candidates are anonymized, but judge agreement does not establish correctness.",
  "Readiness is reported separately from the numerical score; disagreements remain unresolved."
];
const AVAILABILITY = { status: "development", verification: "unverified", code: "development-unverified-results", message: "Exploratory development results — unverified.", detail: "One scenario, one trial, two independent judges; human calibration and downstream validation remain pending.", blockers: [{ code: "author-calibration-pending", message: "Human calibration and downstream implementation validation are pending." }] };
const HASH = /^[a-f0-9]{64}$/;
const PRIVATE_PATH = /(?:^|[^A-Za-z0-9_])\.agents(?:[/\\]|$)|file:\/\/|(?:^|[\s"'(=>])[A-Za-z]:[/\\]|(?:^|[^A-Za-z0-9_])vasir-evals(?:[/\\]|$)/i;
// Literal Mac home paths are case-sensitive here: authored /users/me API routes are valid evidence.
const containsPrivatePath = value => PRIVATE_PATH.test(value) || value.includes("/Users/");
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
const equal = (a, b) => stable(a) === stable(b);
const mean = values => values.some(value => value === null) || !values.length ? null : values.reduce((a, b) => a + b, 0) / values.length;
const round = value => value === null ? null : Math.round((value + Number.EPSILON) * 10) / 10;
const clone = value => structuredClone(value);
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function requireEvidence(ok, message) {
  if (!ok) throw new VasirCliError({ code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE", message: `Work-spec publication: ${message}`, suggestion: "Repair or finish the saved evidence, then pin a new immutable source; do not edit public scores.", docsRef: BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF, context: { stage: "projection", safeRetry: false } });
}
function safeRelative(relative) {
  requireEvidence(typeof relative === "string" && relative.length > 0 && !path.isAbsolute(relative) && !relative.includes("\\") && relative.split("/").every(part => part && part !== "." && part !== ".."), "source paths must be relative and cannot traverse parents.");
  return relative;
}
function read(root, relative, reader = fs.readFileSync) {
  try { return reader(path.join(root, safeRelative(relative)), "utf8"); }
  catch (error) { requireEvidence(false, `required source is unavailable: ${relative}.`); }
}
function json(text, label) {
  try { return JSON.parse(text); } catch { requireEvidence(false, `invalid JSON in ${label}.`); }
}
function numbered(text, prefix) { return text.split("\n").map((line, index) => `${prefix}${String(index + 1).padStart(3, "0")} ${line}`).join("\n"); }
function generationPrompt(manifest, condition, inputs) {
  const guidance = condition === "skill" ? `\n\n--- Vasir Skill Guidance Start ---\n${inputs.treatment.trim()}\n--- Vasir Skill Guidance End ---` : "";
  return `${manifest.neutralHarness}${guidance}\n\nTask:\n${inputs.task.trim()}\n\nOutput contract:\n${manifest.outputContract}\n`;
}
function judgePrompt(inputs, candidate) {
  return `${inputs.adapter}\n--- Frozen rubric ---\n${inputs.rubric}\n--- Assigned task ---\n${numbered(inputs.task, "B")}\n--- Anonymous candidate ---\n${numbered(candidate, "L")}\n--- End candidate ---\nApply the rubric and return the required JSON assessment.\n`;
}

// The index pins existing raw evidence. It never rewrites answers or assessments.
export function prepareWorkSpecPublicationSource({ repoRootDirectory, artifactRoot, runId, expectedConfigurationIds }) {
  safeRelative(artifactRoot);
  requireEvidence(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId ?? ""), "run identity is invalid.");
  const root = path.join(repoRootDirectory, artifactRoot);
  const manifest = json(read(root, "manifest.json"), "manifest");
  const files = new Set(["manifest.json", "inputs/task.md", "inputs/judge-rubric.md", "inputs/treatment-bundle.md", "inputs/judge-adapter.txt", ...(manifest.files ?? []).map(file => file.snapshot)]);
  for (const cell of manifest.cells ?? []) {
    const generationDirectory = `generations/${cell.id}`;
    const generation = json(read(root, `${generationDirectory}/result.json`), "generation");
    for (const file of ["result.json", "spec.md", `attempt-${generation.attempt}/prompt.txt`, `attempt-${generation.attempt}/answer.txt`, `attempt-${generation.attempt}/process-1.json`]) files.add(`${generationDirectory}/${file}`);
    for (let judgeIndex = 0; judgeIndex < PANEL.length; judgeIndex += 1) {
      const directory = `judgments/${cell.id}/judge-${judgeIndex + 1}`;
      const result = json(read(root, `${directory}/result.json`), "judge result");
      for (const file of ["assessment.json", "result.json", `attempt-${result.attempt}/prompt.txt`, `attempt-${result.attempt}/answer.txt`, `attempt-${result.attempt}/process-1.json`]) files.add(`${directory}/${file}`);
    }
  }
  const source = { kind: "vasir-work-spec-publication-source", schemaVersion: 1, runId, artifactRoot, expectedConfigurationIds: expectedConfigurationIds ?? manifest.configurations.map(configuration => configuration.id), files: [...files].sort().map(file => { const contents = read(root, file); return { path: file, bytes: Buffer.byteLength(contents), sha256: digest(contents) }; }) };
  const contents = `${JSON.stringify(source, null, 2)}\n`;
  const runPath = `.agents/vasir-evals/${WORK_SPEC_BENCHMARK_ID}/${runId}/run.json`;
  const target = path.join(repoRootDirectory, runPath);
  const track = json(read(repoRootDirectory, "benchmarks/capability-taxonomy.json"), "taxonomy").categories.find(candidate => candidate.id === WORK_SPEC_TRACK_ID);
  buildWorkSpecPublication({ repoRootDirectory, selection: { benchmarkId: WORK_SPEC_BENCHMARK_ID, runPath, sha256: digest(contents) }, track, readFileSyncImplementation: (filePath, encoding) => filePath === target ? contents : fs.readFileSync(filePath, encoding) });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) requireEvidence(fs.readFileSync(target, "utf8") === contents, "an immutable source index already exists with different contents.");
  else fs.writeFileSync(target, contents, { encoding: "utf8", flag: "wx" });
  return { benchmarkId: WORK_SPEC_BENCHMARK_ID, runPath, sha256: digest(contents) };
}

export function validateWorkSpecTrack(track) {
  requireEvidence(track?.id === WORK_SPEC_TRACK_ID && equal(track.benchmarkIds, [WORK_SPEC_BENCHMARK_ID]) && track.modelScore?.edition === WORK_SPEC_EDITION && track.modelScore?.label === "Work Specs v1" && track.modelScore?.method === "equal-benchmark-absolute-mean-v1" && track.modelScore?.benchmarkWeighting === "equal" && track.modelScore?.scaleMaximum === 100 && equal(track.modelScore?.judging?.panel, PANEL) && track.modelScore?.judging?.judgeCount === 2 && track.modelScore?.judging?.batchUnit === "individual-response" && track.modelScore?.judging?.aggregation === "mean-weighted-dimensions-no-gates-v1" && track.modelScore?.judging?.synthesizer === null && track.effect?.method === "paired-absolute-delta-v1" && track.effect?.unit === "rubric-points" && track.uncertainty?.status === "not-estimated", "taxonomy changed the declared independent two-judge score contract.");
  return track;
}
function validateAssessment(assessment, label) {
  requireEvidence(assessment.assessment?.mode === "controlled" && ["assessable", "partially assessable", "insufficient case context", "invalid candidate"].includes(assessment.assessment.status) && Array.isArray(assessment.assessment.verification) && Array.isArray(assessment.assessment.limitations), `${label} lacks a controlled assessment and verification record.`);
  requireEvidence(["beneficiary", "need", "outcome", "causal_connection"].every(key => typeof assessment.value?.[key] === "string" && assessment.value[key].trim()) && Array.isArray(assessment.value.evidence) && assessment.value.evidence.length > 0, `${label} lacks a substantive value assessment.`);
  requireEvidence(equal(Object.keys(assessment.dimensions ?? {}).sort(), Object.keys(WORK_SPEC_WEIGHTS).sort()), `${label} must contain all six dimensions.`);
  for (const [id, dimension] of Object.entries(assessment.dimensions)) requireEvidence((dimension.rating === null || Number.isInteger(dimension.rating) && dimension.rating >= 0 && dimension.rating <= 4) && typeof dimension.reason === "string" && dimension.reason.length > 0 && Array.isArray(dimension.evidence) && dimension.evidence.length > 0 && (dimension.rating !== null || assessment.assessment.limitations.length > 0), `${label} has an invalid or unexplained ${id} rating.`);
  requireEvidence(READINESS.includes(assessment.result?.readiness) && Array.isArray(assessment.findings), `${label} has no valid readiness/findings.`);
  const ids = new Set(assessment.findings.map(finding => finding.id));
  requireEvidence(ids.size === assessment.findings.length && Array.isArray(assessment.result.priority_finding_ids) && assessment.result.priority_finding_ids.length <= 3 && assessment.result.priority_finding_ids.every(id => ids.has(id)), `${label} has invalid finding references.`);
  for (const finding of assessment.findings) requireEvidence(["correction", "blocker"].includes(finding.severity) && Object.hasOwn(WORK_SPEC_WEIGHTS, finding.dimension) && ["candidate_evidence", "source_basis", "consequence", "smallest_correction"].every(key => finding[key]), `${label} has an unsupported material finding.`);
  const readiness = assessment.result.readiness;
  const blockers = assessment.findings.filter(finding => finding.severity === "blocker");
  requireEvidence((blockers.length === 0 || readiness === "Fix spec first") && (readiness !== "Fix spec first" || blockers.length > 0) && (readiness !== "Implement after the named correction" || assessment.findings.length > 0) && (!["Implement as written", "Sound spec; decision required"].includes(readiness) || assessment.findings.length === 0) && (readiness !== "Sound spec; decision required" || typeof assessment.result.decision_dependency === "string" && assessment.result.decision_dependency.trim()) && (readiness !== "Not assessable" || assessment.assessment.limitations.length > 0), `${label} readiness contradicts its findings or decision dependency.`);
  const ratings = Object.values(assessment.dimensions).map(dimension => dimension.rating);
  return ratings.some(rating => rating === null) ? null : Object.entries(WORK_SPEC_WEIGHTS).reduce((sum, [id, weight]) => sum + weight * assessment.dimensions[id].rating, 0) / 4;
}
function comparableScore(assessment, total) { return assessment.assessment.status === "assessable" ? total : null; }
function validateReceipt(result, label, allowEmpty = false) {
  requireEvidence(typeof result.text === "string" && (allowEmpty || result.text.trim()) && Number.isInteger(result.attempt) && result.attempt > 0 && HASH.test(result.promptSha256 ?? "") && digest(result.text) === result.answerSha256, `${label} has incomplete answer or prompt provenance.`);
  requireEvidence(result.runtimeReceipt?.freshSession === true && result.runtimeReceipt?.persistedSession === false && (result.runtimeReceipt.cli !== "codex" || result.runtimeReceipt.nonMessageItemCount === 0), `${label} violates the fresh-session/no-tools condition.`);
  for (const metric of [result.durationMs, result.usage?.inputTokens, result.usage?.outputTokens, result.usage?.totalTokens]) requireEvidence(Number.isFinite(metric) && metric >= 0, `${label} lacks a recorded duration or token metric.`);
}
function validateInvocation(result, configuration, directory, get) {
  const invocation = json(get(`${directory}/attempt-${result.attempt}/process-1.json`), "invocation");
  const args = invocation.args ?? [];
  requireEvidence(invocation.command === configuration.provider && args[args.indexOf("--model") + 1] === configuration.model, "recorded invocation does not use the declared model.");
  if (configuration.provider === "codex") requireEvidence(args.includes(`model_reasoning_effort="${configuration.reasoning}"`) && args.includes("--ephemeral"), "recorded Codex invocation does not use the declared effort and isolation.");
  else requireEvidence(args[args.indexOf("--effort") + 1] === configuration.reasoning && result.runtimeReceipt.requestedReasoning === configuration.reasoning && result.runtimeReceipt.effectiveEffort === configuration.reasoning && Array.isArray(result.runtimeReceipt.allowedTools) && result.runtimeReceipt.allowedTools.length === 0, "recorded Claude invocation does not use the declared effort and tool isolation.");
}
function metrics(result) { return { sampleCount: 1, meanLatencyMs: round(result.durationMs), meanInputTokens: result.usage.inputTokens, meanOutputTokens: result.usage.outputTokens, meanTotalTokens: result.usage.totalTokens, costUsd: null }; }
function modelIdentity(configuration) {
  const names = { "gpt-6-astra": "GPT-6 Astra", "gpt-5.6-sol": "GPT-5.6 Sol", "gpt-5.6-terra": "GPT-5.6 Terra", "gpt-5.6-luna": "GPT-5.6 Luna", "claude-fable-5-1": "Claude Fable 5.1", opus: "Claude Opus 5" };
  requireEvidence(names[configuration.model] && configuration.id === `${configuration.provider}:${configuration.model}@${configuration.reasoning}`, "configuration model/effort identity is inconsistent or unsupported.");
  return { id: configuration.id.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase(), configurationId: configuration.id, modelId: `${configuration.provider}:${configuration.model}`, provider: configuration.provider, family: names[configuration.model], reasoning: configuration.reasoning, label: `${names[configuration.model]} · ${configuration.reasoning}` };
}

export function buildWorkSpecPublication({ repoRootDirectory, selection, track, readFileSyncImplementation = fs.readFileSync }) {
  validateWorkSpecTrack(track);
  requireEvidence(selection?.benchmarkId === WORK_SPEC_BENCHMARK_ID && HASH.test(selection.sha256 ?? "") && /^\.agents\/vasir-evals\/work-spec-chat\/[A-Za-z0-9][A-Za-z0-9._-]*\/run\.json$/.test(selection.runPath ?? ""), "selected source is not an immutable work-spec run.");
  const sourceText = read(repoRootDirectory, selection.runPath, readFileSyncImplementation);
  requireEvidence(digest(sourceText) === selection.sha256, "selected source digest changed.");
  const source = json(sourceText, "source index");
  requireEvidence(source.kind === "vasir-work-spec-publication-source" && source.schemaVersion === 1 && selection.runPath.endsWith(`/${source.runId}/run.json`) && Array.isArray(source.files) && Array.isArray(source.expectedConfigurationIds), "source index is malformed.");
  const root = path.join(repoRootDirectory, safeRelative(source.artifactRoot));
  const texts = new Map();
  for (const pin of source.files) {
    const contents = read(root, pin.path, readFileSyncImplementation);
    requireEvidence(!texts.has(pin.path) && HASH.test(pin.sha256 ?? "") && digest(contents) === pin.sha256 && Buffer.byteLength(contents) === pin.bytes, `source digest or byte length changed: ${pin.path}.`);
    texts.set(pin.path, contents);
  }
  const get = relative => { requireEvidence(texts.has(relative), `source index omits ${relative}.`); return texts.get(relative); };
  const manifest = json(get("manifest.json"), "manifest");
  const inputs = { task: get("inputs/task.md"), treatment: get("inputs/treatment-bundle.md"), rubric: get("inputs/judge-rubric.md"), adapter: get("inputs/judge-adapter.txt") };
  const definitionText = read(repoRootDirectory, "benchmarks/work-spec-chat/publication.json", readFileSyncImplementation);
  const definition = json(definitionText, "benchmark definition");
  requireEvidence(definition.id === WORK_SPEC_BENCHMARK_ID && definition.schemaVersion === 1 && definition.edition === WORK_SPEC_EDITION && equal(definition.weights, WORK_SPEC_WEIGHTS) && equal(definition.judges, PANEL) && definition.gates === null && definition.caps === null, "benchmark definition changed the score contract.");
  requireEvidence(digest(stable({ neutralHarness: manifest.neutralHarness, outputContract: manifest.outputContract })) === definition.generationContractSha256, "the neutral harness or output contract changed.");
  for (const [name, contents] of Object.entries(inputs)) requireEvidence(digest(contents) === definition.inputSha256[name], `frozen ${name} input does not match the declared benchmark.`);
  requireEvidence(manifest.case === WORK_SPEC_BENCHMARK_ID && manifest.authoredScenario === true && manifest.developmentCase === true && equal(manifest.judges?.map(judge => judge.id), PANEL) && manifest.treatment?.sha256 === digest(inputs.treatment), "manifest does not preserve the authored scenario, treatment, or panel.");
  for (const judge of manifest.judges) modelIdentity(judge);
  requireEvidence(Array.isArray(manifest.configurations) && manifest.configurations.length > 0 && equal(manifest.configurations.map(configuration => configuration.id).sort(), [...source.expectedConfigurationIds].sort()) && new Set(source.expectedConfigurationIds).size === source.expectedConfigurationIds.length && manifest.cells?.length === manifest.configurations.length * 2, "configuration cohort or paired matrix is incomplete.");
  for (const pin of manifest.files ?? []) requireEvidence(digest(get(pin.snapshot)) === pin.sha256 && Buffer.byteLength(get(pin.snapshot)) === pin.bytes, "an original manifest source pin changed.");
  const identities = new Map(manifest.configurations.map(configuration => [configuration.id, modelIdentity(configuration)]));
  const cells = [], responses = [], messageSets = new Map(), seen = new Set();
  for (const cell of manifest.cells) {
    requireEvidence(/^[a-f0-9]+$/.test(cell.id ?? "") && identities.has(cell.configuration?.id) && equal(cell.configuration, manifest.configurations.find(configuration => configuration.id === cell.configuration.id)) && ["baseline", "skill"].includes(cell.condition) && cell.trial === 1, "candidate identity or condition is invalid.");
    const identity = identities.get(cell.configuration.id);
    const key = `${cell.configuration.id}:${cell.condition}`;
    requireEvidence(!seen.has(key), "candidate condition is duplicated."); seen.add(key);
    const directory = `generations/${cell.id}`;
    const result = json(get(`${directory}/result.json`), "generation result"); validateReceipt(result, key, true);
    validateInvocation(result, cell.configuration, directory, get);
    const prompt = get(`${directory}/attempt-${result.attempt}/prompt.txt`);
    const answer = get(`${directory}/attempt-${result.attempt}/answer.txt`);
    const candidate = get(`${directory}/spec.md`);
    requireEvidence(prompt === generationPrompt(manifest, cell.condition, inputs) && digest(prompt) === result.promptSha256 && answer === result.text && candidate === `${answer}\n`, "generation text or effective prompt differs from its recorded source.");
    const judgments = PANEL.map((judgeConfigurationId, index) => {
      const judgeDirectory = `judgments/${cell.id}/judge-${index + 1}`;
      const raw = json(get(`${judgeDirectory}/result.json`), "judge result"); validateReceipt(raw, `${key} ${judgeConfigurationId}`);
      validateInvocation(raw, manifest.judges[index], judgeDirectory, get);
      const effectivePrompt = get(`${judgeDirectory}/attempt-${raw.attempt}/prompt.txt`);
      requireEvidence(effectivePrompt === judgePrompt(inputs, candidate) && digest(effectivePrompt) === raw.promptSha256 && get(`${judgeDirectory}/attempt-${raw.attempt}/answer.txt`) === raw.text, "judge effective prompt or answer source changed.");
      const assessment = json(get(`${judgeDirectory}/assessment.json`), "assessment");
      const parsed = json(raw.text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""), "raw judge answer");
      const { host, ...assessed } = assessment;
      requireEvidence(equal(assessed, parsed) && host?.candidateSha256 === digest(candidate) && host?.adapterSha256 === digest(inputs.adapter), "assessment does not describe the pinned candidate and raw judge answer.");
      const rawScore = validateAssessment(assessment, `${key} ${judgeConfigurationId}`);
      const score = comparableScore(assessment, rawScore);
      requireEvidence(host.benchmark_total === rawScore && host.judge_reported_total === parsed.result.benchmark_total && host.arithmeticMatches === (rawScore === parsed.result.benchmark_total), "host assessment arithmetic changed.");
      return { kind: "work-spec", judgeConfigurationId, score, rawScore, dimensions: assessment.dimensions, readiness: assessment.result.readiness, assessmentStatus: assessment.assessment.status, findings: assessment.findings, rationale: Object.entries(assessment.dimensions).map(([id, dimension]) => `${id}: ${dimension.reason}`).join("\n\n"), assessment, promptSha256: digest(effectivePrompt), answerSha256: raw.answerSha256 };
    });
    const exactScore = mean(judgments.map(judgment => judgment.score));
    const readiness = judgments.map(judgment => judgment.readiness);
    const dimensions = Object.fromEntries(Object.keys(WORK_SPEC_WEIGHTS).map(id => [id, mean(judgments.map(judgment => judgment.dimensions[id].rating))]));
    const readinessLabel = new Set(readiness).size > 1 ? "Readiness unresolved" : readiness[0];
    const assessmentStatus = exactScore === null ? "not-fully-assessable" : "assessable";
    const coverage = { expectedJudgments: 2, completedJudgments: 2, assessableJudgments: judgments.filter(judgment => judgment.score !== null).length };
    const provenance = { candidateId: cell.id, sourceSha256: selection.sha256, promptSha256: result.promptSha256, answerSha256: result.answerSha256, candidateSha256: digest(candidate), assessmentSha256: PANEL.map((_, index) => digest(get(`judgments/${cell.id}/judge-${index + 1}/assessment.json`))) };
    cells.push({ settingId: identity.id, configurationId: identity.configurationId, condition: cell.condition, benchmarkId: WORK_SPEC_BENCHMARK_ID, category: FAMILY.id, score: round(exactScore), exactScore, trials: 1, calibrated: false, status: "development", latencyMs: round(result.durationMs), inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, totalTokens: result.usage.totalTokens, costUsd: null, metrics: metrics(result), dimensions, readiness, readinessLabel, assessmentStatus, readinessConflict: new Set(readiness).size > 1, coverage, provenance });
    const messages = [{ role: "user", content: prompt }];
    const messageSetId = digest(stable(messages)); messageSets.set(messageSetId, { id: messageSetId, messages });
    responses.push({ benchmarkId: WORK_SPEC_BENCHMARK_ID, settingId: identity.id, configurationId: identity.configurationId, condition: cell.condition, trialNumber: 1, messageSetId, outputText: result.text, judgments, readinessLabel, assessmentStatus, provenance });
  }
  const exactScoreFor = (settingId, condition) => cells.find(cell => cell.settingId === settingId && cell.condition === condition)?.exactScore ?? null;
  const settings = [...identities.values()].map(identity => {
    const baseline = cells.find(cell => cell.settingId === identity.id && cell.condition === "baseline");
    const skill = cells.find(cell => cell.settingId === identity.id && cell.condition === "skill");
    requireEvidence(baseline && skill, "a configuration is missing its matched condition.");
    const delta = baseline.exactScore === null || skill.exactScore === null ? null : round(skill.exactScore - baseline.exactScore);
    return { ...identity, scores: { baseline: baseline.score, skill: skill.score }, deltas: { skill: delta }, categories: { baseline: [{ category: FAMILY.id, score: baseline.score }], skill: [{ category: FAMILY.id, score: skill.score }] }, metrics: { baseline: baseline.metrics, skill: skill.metrics }, readiness: { baseline: baseline.readiness, skill: skill.readiness }, readinessConflict: { baseline: baseline.readinessConflict, skill: skill.readinessConflict }, readinessLabel: { baseline: baseline.readinessLabel, skill: skill.readinessLabel }, assessmentStatus: { baseline: baseline.assessmentStatus, skill: skill.assessmentStatus }, coverage: { baseline: baseline.coverage, skill: skill.coverage } };
  }).sort((a, b) => (exactScoreFor(b.id, "skill") ?? -1) - (exactScoreFor(a.id, "skill") ?? -1) || a.configurationId.localeCompare(b.configurationId));
  const entries = settings.flatMap(setting => CONDITIONS.map(condition => ({ id: `${setting.id}-${condition.id}`, settingId: setting.id, configurationId: setting.configurationId, modelId: setting.modelId, provider: setting.provider, family: setting.family, reasoning: setting.reasoning, label: setting.label, condition: condition.id, conditionLabel: condition.label, score: setting.scores[condition.id], baselineScore: setting.scores.baseline, delta: condition.id === "baseline" ? 0 : setting.deltas.skill, categories: setting.categories[condition.id], baselineCategories: setting.categories.baseline, cost: null, latency: setting.metrics[condition.id].meanLatencyMs / 1000, tokens: setting.metrics[condition.id].meanOutputTokens, metrics: setting.metrics[condition.id], readiness: setting.readiness[condition.id], readinessLabel: setting.readinessLabel[condition.id], assessmentStatus: setting.assessmentStatus[condition.id], readinessConflict: setting.readinessConflict[condition.id], coverage: setting.coverage[condition.id] })));
  for (const condition of CONDITIONS) entries.filter(entry => entry.condition === condition.id).sort((a, b) => (exactScoreFor(b.settingId, condition.id) ?? -1) - (exactScoreFor(a.settingId, condition.id) ?? -1) || a.configurationId.localeCompare(b.configurationId)).forEach((entry, index, ranked) => { const exactScore = exactScoreFor(entry.settingId, condition.id); entry.rank = exactScore === null ? null : index > 0 && exactScore === exactScoreFor(ranked[index - 1].settingId, condition.id) ? ranked[index - 1].rank : index + 1; });
  const baselineScore = round(mean(cells.filter(cell => cell.condition === "baseline").map(cell => cell.exactScore)));
  const treatmentScore = round(mean(cells.filter(cell => cell.condition === "skill").map(cell => cell.exactScore)));
  const delta = round(mean(settings.map(setting => {
    const baseline = cells.find(cell => cell.settingId === setting.id && cell.condition === "baseline").exactScore;
    const skill = cells.find(cell => cell.settingId === setting.id && cell.condition === "skill").exactScore;
    return baseline === null || skill === null ? null : skill - baseline;
  })));
  const record = { wins: settings.filter(setting => setting.deltas.skill > 0).length, ties: settings.filter(setting => setting.deltas.skill === 0).length, losses: settings.filter(setting => setting.deltas.skill < 0).length };
  const judgingScope = { mode: "independent-response-panel", aggregationMethod: "mean-weighted-dimensions-no-gates-v1", judgeCount: 2, responseCount: cells.length, completedJudgmentCount: responses.length * 2, gates: null, caps: null };
  const result = { benchmarkId: WORK_SPEC_BENCHMARK_ID, runId: source.runId, readinessLabel: "Readiness varies by candidate", assessmentStatus: cells.every(cell => cell.exactScore !== null) ? "assessable" : "partially assessable", completedAt: null, status: "development", verification: "unverified", blockers: clone(AVAILABILITY.blockers), judgingScope, baselineScore, treatmentScore, delta, record, responseCount: cells.length, matchedConfigurationCount: settings.length, configurations: settings.map(setting => ({ settingId: setting.id, configurationId: setting.configurationId, baselineScore: setting.scores.baseline, treatmentScore: setting.scores.skill, delta: setting.deltas.skill, baselineMetrics: setting.metrics.baseline, skillMetrics: setting.metrics.skill })) };
  const benchmark = { id: WORK_SPEC_BENCHMARK_ID, trackId: WORK_SPEC_TRACK_ID, familyId: FAMILY.id, category: FAMILY.id, suite: track.title, name: definition.title, title: definition.title, description: definition.description, taskKind: "work-spec-generation", task: { id: "ten-million-concurrent-chat", text: inputs.task }, prompt: inputs.task, judging: { panel: PANEL, synthesizer: null }, limitations: LIMITATIONS, reportFragment: WORK_SPEC_BENCHMARK_ID, detailHref: `benchmark-report.html#${WORK_SPEC_BENCHMARK_ID}`, evidenceKind: "development", resultAvailability: clone(AVAILABILITY), measured: { baseline: baselineScore, treatment: treatmentScore, delta, ...record, complete: cells.length, total: cells.length, treatmentLabel: "Work-spec skill", calibration: "Calibration pending" } };
  const counts = { families: 1, tracks: 1, benchmarks: 1, categories: 1, conditions: 2, settings: settings.length, resultEntries: entries.length, responses: cells.length, developmentResultSets: 1, eligibleResultSets: 0, withheldResultSets: 0 };
  const scoreBasis = { id: `${WORK_SPEC_EDITION}:${digest(stable({ definition, track }))}`, label: "Work Specs v1", edition: WORK_SPEC_EDITION, method: "equal-benchmark-absolute-mean-v1", unit: "rubric-points", range: { minimum: 0, maximum: 100 }, benchmarkWeighting: "equal", benchmarkIds: [WORK_SPEC_BENCHMARK_ID], taskCount: 1, trialsPerTask: 1, judgeCount: 2, judges: PANEL, aggregation: "mean-weighted-dimensions-no-gates-v1", batchUnit: "individual-response", effectMethod: "paired-absolute-delta-v1", effectUnit: "rubric-points", calibrationStatus: "development-uncalibrated", uncertainty: clone(track.uncertainty), weights: WORK_SPEC_WEIGHTS, ratingMaximum: 4, gates: null, caps: null, sourceSha256: selection.sha256, inputSha256: definition.inputSha256 };
  const regressions = entries.filter(entry => entry.condition === "skill" && entry.delta < 0);
  const leader = entries.filter(entry => entry.condition === "skill" && entry.score !== null).sort((a, b) => b.score - a.score)[0];
  const projection = { kind: "vasirbenchmark-work-spec-projection", schemaVersion: 1, program: { id: "vasirbench", title: "VasirBench", status: "development", evidenceStatus: "development", verification: "unverified" }, meta: { release: "Development snapshot · September 2026", status: "Exploratory development results · unverified", categories: 1, benchmarks: 1, settings: settings.length, conditions: 2, trials: 1, aggregateCells: cells.length, runs: 1, calibration: 0, vasirVersion: null }, scoreBasis, conditions: CONDITIONS, categories: [{ id: FAMILY.id, name: FAMILY.title, title: FAMILY.title, short: "AI", weight: 1, color: "#7650bc", trackIds: [WORK_SPEC_TRACK_ID] }], families: [FAMILY], tracks: [{ id: WORK_SPEC_TRACK_ID, familyId: FAMILY.id, title: track.title, description: track.description, benchmarkIds: [WORK_SPEC_BENCHMARK_ID], resultAvailability: clone(AVAILABILITY) }], benchmarks: [benchmark], results: [result], settings, entries, benchmarkResults: cells, benchmarkSummaries: [{ benchmarkId: WORK_SPEC_BENCHMARK_ID, runId: source.runId, status: "development", verification: "unverified", blockers: clone(AVAILABILITY.blockers), evidenceKind: "development", baselineLabel: "Minimal baseline", treatmentLabel: "Work-spec skill", baseline: baselineScore, treatment: treatmentScore, delta, ...record, complete: cells.length, total: cells.length, completionLabel: "responses", calibration: "Calibration pending", judgingScope, detailHref: `./benchmark-report.html#${WORK_SPEC_BENCHMARK_ID}`, sourceHref: null }], categoryLeaders: leader ? [{ category: FAMILY.id, entry: { ...leader, categoryScore: leader.score } }] : [], efficientFrontier: [], regressions, callouts: { overall: "One authored work-spec scenario; model scores are exploratory.", value: "Cost comparison is withheld because provider cost coverage is incomplete.", regression: `${regressions.length} matched settings score lower with the Work-spec skill.`, category: "Scores measure specification quality; readiness remains a separate judgment." }, availability: clone(AVAILABILITY), counts };
  responses.sort((a, b) => a.benchmarkId.localeCompare(b.benchmarkId) || a.settingId.localeCompare(b.settingId) || a.condition.localeCompare(b.condition));
  const responseBundle = { kind: "vasirbenchmark-public-responses", schemaVersion: 3, counts: { benchmarks: 1, settings: settings.length, conditions: 2, responses: responses.length, messageSets: messageSets.size, judgments: responses.length * 2 }, messageSets: [...messageSets.values()].sort((a, b) => a.id.localeCompare(b.id)), responses };
  validateWorkSpecPublication(projection, responseBundle);
  return { projection, responseBundle, basisSha256: digest(stable({ definition, track, sourceSha256: selection.sha256 })) };
}

export function validateWorkSpecPublication(projection, responseBundle) {
  requireEvidence(projection?.kind === "vasirbenchmark-work-spec-projection" && projection.schemaVersion === 1 && projection.scoreBasis?.edition === WORK_SPEC_EDITION && equal(projection.scoreBasis?.weights, WORK_SPEC_WEIGHTS) && equal(projection.scoreBasis?.judges, PANEL) && projection.scoreBasis?.gates === null && projection.scoreBasis?.caps === null && projection.counts?.benchmarks === 1 && projection.counts?.conditions === 2 && projection.counts?.settings > 0, "public workflow score basis is invalid.");
  requireEvidence(!containsPrivatePath(JSON.stringify(projection)), "public workflow summary exposes a private source path.");
  const settings = new Map(projection.settings.map(setting => [setting.id, setting]));
  const cells = new Map(projection.benchmarkResults.map(cell => [`${cell.settingId}:${cell.condition}`, cell]));
  requireEvidence(settings.size === projection.settings.length && settings.size === projection.counts.settings && cells.size === projection.benchmarkResults.length && cells.size === settings.size * 2 && projection.counts.responses === cells.size && projection.entries.length === cells.size && projection.counts.resultEntries === cells.size && projection.benchmarks.length === 1 && projection.results.length === 1 && projection.benchmarkSummaries.length === 1, "public workflow cohort is incomplete or duplicated.");
  for (const cell of cells.values()) {
    requireEvidence(settings.get(cell.settingId)?.configurationId === cell.configurationId && cell.benchmarkId === WORK_SPEC_BENCHMARK_ID && cell.trials === 1 && cell.coverage.completedJudgments === 2 && cell.coverage.expectedJudgments === 2 && cell.readiness.length === 2 && cell.readiness.every(value => READINESS.includes(value)) && cell.readinessConflict === (new Set(cell.readiness).size > 1), "public workflow cell has invalid identity, coverage, or readiness.");
    requireEvidence(equal(Object.keys(cell.dimensions).sort(), Object.keys(WORK_SPEC_WEIGHTS).sort()) && Object.values(cell.dimensions).every(value => value === null || Number.isFinite(value) && value >= 0 && value <= 4 && Number.isInteger(value * 2)) && [0, 1, 2].includes(cell.coverage.assessableJudgments), "public workflow cell contains invalid aggregate ratings or assessability coverage.");
    const exactScore = cell.coverage.assessableJudgments !== 2 || Object.values(cell.dimensions).some(value => value === null) ? null : Object.entries(WORK_SPEC_WEIGHTS).reduce((sum, [id, weight]) => sum + weight * cell.dimensions[id], 0) / 4;
    requireEvidence(cell.exactScore === exactScore && cell.score === round(exactScore) && settings.get(cell.settingId).scores[cell.condition] === cell.score, "public workflow cell score does not follow its dimension ratings.");
    requireEvidence(cell.readinessLabel === (cell.readinessConflict ? "Readiness unresolved" : cell.readiness[0]) && cell.assessmentStatus === (exactScore === null ? "not-fully-assessable" : "assessable"), "public workflow cell label conceals readiness or assessability.");
  }
  for (const setting of settings.values()) {
    const baseline = cells.get(`${setting.id}:baseline`), skill = cells.get(`${setting.id}:skill`);
    requireEvidence(baseline && skill && setting.deltas.skill === (baseline.exactScore === null || skill.exactScore === null ? null : round(skill.exactScore - baseline.exactScore)), "public workflow uplift does not preserve its matched pair.");
    for (const cell of [baseline, skill]) requireEvidence(equal(setting.readiness[cell.condition], cell.readiness) && setting.readinessLabel[cell.condition] === cell.readinessLabel && setting.readinessConflict[cell.condition] === cell.readinessConflict && setting.assessmentStatus[cell.condition] === cell.assessmentStatus && equal(setting.coverage[cell.condition], cell.coverage) && equal(setting.metrics[cell.condition], cell.metrics), "public workflow setting changes its underlying response coverage or readiness.");
  }
  const entryKeys = new Set();
  for (const entry of projection.entries) {
    const key = `${entry.settingId}:${entry.condition}`, cell = cells.get(key), setting = settings.get(entry.settingId);
    requireEvidence(cell && setting && !entryKeys.has(key) && entry.configurationId === cell.configurationId && entry.score === cell.score && entry.baselineScore === setting.scores.baseline && entry.delta === (entry.condition === "baseline" ? 0 : setting.deltas.skill) && entry.readinessLabel === cell.readinessLabel && entry.assessmentStatus === cell.assessmentStatus && entry.readinessConflict === cell.readinessConflict && equal(entry.readiness, cell.readiness) && equal(entry.coverage, cell.coverage) && equal(entry.metrics, cell.metrics) && entry.tokens === cell.outputTokens && entry.latency === cell.metrics.meanLatencyMs / 1000, "public workflow displayed entry differs from its scored response.");
    entryKeys.add(key);
    const rank = cell.exactScore === null ? null : [...cells.values()].filter(other => other.condition === entry.condition && other.exactScore !== null && other.exactScore > cell.exactScore).length + 1;
    requireEvidence(entry.rank === rank, "public workflow rank ignores a tie or missing score.");
  }
  const baselineScore = round(mean([...cells.values()].filter(cell => cell.condition === "baseline").map(cell => cell.exactScore)));
  const treatmentScore = round(mean([...cells.values()].filter(cell => cell.condition === "skill").map(cell => cell.exactScore)));
  const delta = round(mean([...settings.values()].map(setting => {
    const baseline = cells.get(`${setting.id}:baseline`).exactScore, skill = cells.get(`${setting.id}:skill`).exactScore;
    return baseline === null || skill === null ? null : skill - baseline;
  })));
  const result = projection.results[0], summary = projection.benchmarkSummaries[0], measured = projection.benchmarks[0].measured;
  requireEvidence(result.benchmarkId === WORK_SPEC_BENCHMARK_ID && result.baselineScore === baselineScore && result.treatmentScore === treatmentScore && result.delta === delta && result.responseCount === cells.size && result.matchedConfigurationCount === settings.size && summary.baseline === baselineScore && summary.treatment === treatmentScore && summary.delta === delta && measured.baseline === baselineScore && measured.treatment === treatmentScore && measured.delta === delta, "public workflow summary differs from its full cohort.");
  if (responseBundle === undefined) return projection;
  requireEvidence(responseBundle?.kind === "vasirbenchmark-public-responses" && responseBundle.schemaVersion === 3 && responseBundle.responses?.length === cells.size && responseBundle.counts?.judgments === cells.size * 2 && !containsPrivatePath(JSON.stringify(responseBundle)), "public workflow responses have invalid coverage or expose private paths.");
  const messages = new Map(responseBundle.messageSets.map(set => [set.id, set]));
  for (const set of messages.values()) requireEvidence(digest(stable(set.messages)) === set.id && set.messages.length === 1 && set.messages[0].role === "user" && typeof set.messages[0].content === "string", "public workflow exact messages lost content addressing.");
  const observed = new Set();
  for (const response of responseBundle.responses) {
    const key = `${response.settingId}:${response.condition}`, cell = cells.get(key);
    requireEvidence(cell && !observed.has(key) && response.configurationId === cell.configurationId && response.benchmarkId === WORK_SPEC_BENCHMARK_ID && messages.has(response.messageSetId) && response.judgments.length === 2 && equal(response.judgments.map(judgment => judgment.judgeConfigurationId), PANEL) && digest(response.outputText) === cell.provenance.answerSha256 && digest(messages.get(response.messageSetId).messages[0].content) === cell.provenance.promptSha256 && equal(response.provenance, cell.provenance), "public workflow response lost candidate, prompt, or judge provenance."); observed.add(key);
    for (const judgment of response.judgments) requireEvidence(judgment.kind === "work-spec" && judgment.rawScore === validateAssessment(judgment.assessment, key) && judgment.score === comparableScore(judgment.assessment, judgment.rawScore) && equal(judgment.dimensions, judgment.assessment.dimensions) && equal(judgment.findings, judgment.assessment.findings) && judgment.assessmentStatus === judgment.assessment.assessment.status && judgment.readiness === judgment.assessment.result.readiness, "public workflow judgment changed its evidence or arithmetic.");
    requireEvidence(cell.exactScore === mean(response.judgments.map(judgment => judgment.score)) && equal(cell.readiness, response.judgments.map(judgment => judgment.readiness)) && cell.coverage.assessableJudgments === response.judgments.filter(judgment => judgment.score !== null).length && response.readinessLabel === cell.readinessLabel && response.assessmentStatus === cell.assessmentStatus && Object.keys(WORK_SPEC_WEIGHTS).every(id => cell.dimensions[id] === mean(response.judgments.map(judgment => judgment.dimensions[id].rating))), "public workflow aggregate differs from the independent judgments.");
  }
  return projection;
}
