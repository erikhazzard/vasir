import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "../cli-error.js";

export const GAME_ARTIFACT_ORIGIN = "https://d7us0tudou7ya.cloudfront.net";
export const GAME_PUBLICATION_PATH = "benchmarks/2d-jumping-demo/publication.json";
const HASH = /^[a-f0-9]{64}$/;
const MAX_FILE_BYTES = 128 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
// Authored CJK font CSS alone can reference 366 WOFF2 subsets; bytes stay bounded.
const MAX_FILES = 2048;
const MODEL_LABELS = Object.freeze({ "gpt-6-astra": "GPT-6 Astra", "gpt-5.6-sol": "GPT-5.6 Sol", "gpt-5.6-terra": "GPT-5.6 Terra", "claude-fable-5-1": "Claude Fable 5.1" });
const TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".avif": "image/avif", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg", ".wav": "audio/wav", ".woff2": "font/woff2", ".wasm": "application/wasm"
});
// Authored comments may name the bare file:// scheme without exposing a file URL.
const PRIVATE_TEXT = /\.agents[/\\]|vasir-evals[/\\]|\/Users\/|file:\/\/(?=[^\s'"`<>),;])|(?:sk|sk-ant)-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, (_, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
function requireEvidence(ok, message) {
  if (!ok) throw new VasirCliError({ code: "BENCHMARK_PUBLISH_GAME_EVIDENCE_INVALID", message: `Games publication: ${message}`, suggestion: "Repair the selection or finish the saved evidence, then pin it again. Do not repair contestant artifacts during publication.", context: { stage: "projection", safeRetry: false } });
}
function safePath(value) {
  requireEvidence(typeof value === "string" && value && !path.isAbsolute(value) && !value.includes("\\") && !/[?#%\x00-\x1f]/.test(value) && value.split("/").every(part => part && part !== "." && part !== ".."), "source path must be normalized and relative.");
  return value;
}
function readPinned(root, pin, reader) {
  requireEvidence(pin && HASH.test(pin.sha256 ?? ""), "a source digest is missing.");
  const relative = safePath(pin.path);
  const sourcePath = path.join(root, relative);
  const rootRealPath = fs.realpathSync(root);
  const realPath = fs.realpathSync(sourcePath);
  requireEvidence(realPath.startsWith(`${rootRealPath}${path.sep}`) && fs.lstatSync(sourcePath).isFile(), "source is not a regular file inside its evidence root.");
  const stats = fs.statSync(sourcePath);
  requireEvidence(stats.size <= MAX_FILE_BYTES, "a source file exceeds the 128 MiB bound.");
  const contents = Buffer.from(reader(sourcePath));
  requireEvidence(digest(contents) === pin.sha256 && (pin.bytes === undefined || pin.bytes === contents.length), `source digest or size changed: ${relative}.`);
  return { contents, sourcePath, bytes: contents.length, sha256: pin.sha256 };
}
function json(contents, label) {
  try { return JSON.parse(contents); } catch { requireEvidence(false, `${label} is invalid JSON.`); }
}
function publicText(value, label) {
  requireEvidence(typeof value === "string" && value.trim() && !PRIVATE_TEXT.test(value), `${label} is empty or contains private evidence.`);
  return value;
}
function publicMetric(value) { return Number.isFinite(value) && value >= 0 ? value : null; }
function judgeLabel(judgeId) {
  const [model, effort] = judgeId.split(":").at(-1).split("@");
  const reasoning = { xhigh: "Extra high reasoning", max: "Max reasoning" }[effort];
  return MODEL_LABELS[model] && reasoning ? `${MODEL_LABELS[model]} · ${reasoning}` : judgeId;
}
function totalTokens(raw) {
  if (Number.isFinite(raw.usage?.totalTokens)) return publicMetric(raw.usage.totalTokens);
  const usage = raw.usage;
  if (!Number.isFinite(usage?.input_tokens) || !Number.isFinite(usage?.output_tokens)) return null;
  return publicMetric(usage.input_tokens + usage.output_tokens + (raw.configuration.provider === "claude" ? (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) : 0));
}

function validateMediaEvidence({ repoRootDirectory, record, raw, reader }) {
  if (!record.video && !record.poster) return;
  requireEvidence(record.bundle && record.mediaReceipt, "published playback needs a capture receipt bound to the submitted game.");
  const receipt = json(readPinned(repoRootDirectory, record.mediaReceipt, reader).contents, "media receipt");
  requireEvidence(receipt.kind === "vasir-game-media-receipt" && receipt.schemaVersion === 1 && receipt.synthetic !== true && receipt.artifactHash === raw.source.sha256, "media receipt does not match a real submitted artifact.");
  const normalizeFiles = files => (files ?? []).map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })).sort((a, b) => a.path.localeCompare(b.path));
  requireEvidence(fs.realpathSync(path.resolve(repoRootDirectory, receipt.package.root)) === fs.realpathSync(path.join(repoRootDirectory, record.bundle.root)), "capture and published runtime roots differ.");
  const packageFiles = new Map((receipt.package.entries ?? []).map(file => [file.path, file]));
  requireEvidence(record.bundle.files.every(file => packageFiles.get(file.path)?.sha256 === file.sha256 && packageFiles.get(file.path)?.bytes === file.bytes), "published runtime differs from the captured package.");
  const capture = json(readPinned(repoRootDirectory, receipt.capture, reader).contents, "capture receipt");
  requireEvidence(capture.inputArtifactHash === raw.source.sha256 && capture.packageVerifiedAfterCapture === true && stable(normalizeFiles(capture.package?.entries)) === stable(normalizeFiles(receipt.package.entries)), "capture did not preserve the submitted package.");
  requireEvidence(capture.responses?.some(response => response.path === record.bundle.entrypoint && response.matchesPackage === true && response.sha256 === packageFiles.get(record.bundle.entrypoint)?.sha256) && !capture.responses.some(response => response.matchesPackage === false), "captured browser did not load the expected runtime bytes.");
  for (const field of ["video", "poster"]) {
    if (!record[field]) continue;
    requireEvidence(record[field].path === receipt[field]?.path && record[field].sha256 === receipt[field]?.sha256, "selected public media differs from its source-bound receipt.");
    readPinned(repoRootDirectory, receipt[field], reader);
  }
  requireEvidence(receipt.originalVideo, "media receipt is missing its recorded original video.");
  const original = readPinned(repoRootDirectory, receipt.originalVideo, reader);
  requireEvidence(fs.realpathSync(capture.originalVideo) === fs.realpathSync(original.sourcePath), "media original differs from the browser recording.");
  for (const frame of receipt.frames ?? []) readPinned(repoRootDirectory, frame, reader);
}

function collectBundle({ repoRootDirectory, bundle, reader }) {
  requireEvidence(bundle && Array.isArray(bundle.files) && bundle.files.length > 0 && bundle.files.length <= MAX_FILES, "runtime bundle is missing its bounded explicit allowlist.");
  const root = path.join(repoRootDirectory, safePath(bundle.root));
  requireEvidence(fs.realpathSync(root).startsWith(`${fs.realpathSync(repoRootDirectory)}${path.sep}`), "runtime bundle root escapes the repository.");
  const names = new Set();
  const files = bundle.files.map(pin => {
    const name = safePath(pin.path);
    requireEvidence(!name.split("/").some(part => part.startsWith(".")) && !names.has(name) && TYPES[path.extname(name).toLowerCase()], "runtime file is hidden, duplicated, or outside the public MIME allowlist.");
    names.add(name);
    const file = readPinned(root, pin, reader);
    const contentType = TYPES[path.extname(name).toLowerCase()];
    if (/^(?:text\/|image\/svg)/.test(contentType)) requireEvidence(!PRIVATE_TEXT.test(file.contents.toString("utf8")), "a runtime file contains private paths or credential material.");
    return { path: name, sourcePath: file.sourcePath, bytes: file.bytes, sha256: file.sha256, contentType };
  }).sort((a, b) => a.path.localeCompare(b.path));
  requireEvidence(names.has(bundle.entrypoint) && path.extname(bundle.entrypoint) === ".html", "bundle entrypoint must be an allowlisted HTML file.");
  const bundleSha256 = digest(stable(files.map(({ sourcePath, ...file }) => file)));
  return {
    playUrl: `${GAME_ARTIFACT_ORIGIN}/artifacts/${bundleSha256}/${bundle.entrypoint}`,
    files: files.map(file => ({ ...file, key: `artifacts/${bundleSha256}/${file.path}`, publicUrl: `${GAME_ARTIFACT_ORIGIN}/artifacts/${bundleSha256}/${file.path}` }))
  };
}

function collectMedia({ repoRootDirectory, pin, type, reader }) {
  if (!pin) return { url: null, files: [] };
  const file = readPinned(repoRootDirectory, pin, reader);
  const extension = path.extname(pin.path).toLowerCase();
  const contentType = TYPES[extension];
  requireEvidence(contentType?.startsWith(`${type}/`) && extension !== ".svg", "media must be an allowlisted raster image or video.");
  const key = `artifacts/${file.sha256}/${type === "video" ? "playback" : "poster"}${extension}`;
  const publicUrl = `${GAME_ARTIFACT_ORIGIN}/${key}`;
  return { url: publicUrl, files: [{ sourcePath: file.sourcePath, path: key.split("/").at(-1), key, publicUrl, bytes: file.bytes, sha256: file.sha256, contentType }] };
}

// These two corrections accept an unchanged native answer, never a repaired rating.
// Keep the original process result and independently bind the exceptional evidence
// to its native tool call; a passed amendment flag alone is insufficient.
function validateRetainedEvidenceAmendment({ repoRootDirectory, amendment, plan, seat, reader }) {
  const input = name => {
    const pins = amendment.inputs.filter(pin => path.resolve(repoRootDirectory, pin.path) === path.join(seat.history, name));
    requireEvidence(pins.length === 1, `validation amendment lacks its original ${name}.`);
    return readPinned(repoRootDirectory, pins[0], reader).contents;
  };
  requireEvidence(HASH.test(plan.runnerSha256 ?? "") && amendment.checks.originalRunnerSha256 === plan.runnerSha256 && amendment.inputs.some(pin => pin.sha256 === plan.runnerSha256 && pin.path.endsWith(".mjs")) && amendment.checks.outputUnchanged === true, "validation amendment lacks the original runner and unchanged-output proof.");
  const basis = json(input("input-basis.json"), "review input basis");
  requireEvidence(basis.runnerSha256 === plan.runnerSha256 && basis.rubricSha256 === plan.rubricSha256, "validation amendment changed the original review basis.");
  input("browser-audit.jsonl"); input("requests.json");
  const events = input("stdout.jsonl").toString("utf8").trim().split("\n").map(line => json(line, "native review event"));
  const blocks = events.flatMap(event => event.message?.content ?? []);
  const calls = blocks.filter(block => block.type === "tool_use"), responses = blocks.filter(block => block.type === "tool_result");
  const final = events.findLast(event => event.type === "result"), structured = final?.structured_output;
  const submitted = calls.filter(call => call.name === "StructuredOutput").at(-1);
  requireEvidence(final?.subtype === "success" && final.is_error === false && structured && submitted && stable(structured) === stable(submitted.input) && digest(JSON.stringify(structured)) === amendment.checks.structuredOutputSha256, "validation amendment differs from the successful native structured answer.");
  requireEvidence(Object.keys(final.modelUsage ?? {}).length > 0 && Object.keys(final.modelUsage).every(model => ["claude-fable-5-1", "claude-haiku-4-5"].includes(model)) && !calls.some(call => /^(Skill|Agent|Task)$/.test(call.name)), "validation amendment has unexpected native model or helper usage.");
  requireEvidence(Array.isArray(structured.candidates) && structured.candidates.length === seat.mappings.length && new Set(structured.candidates.map(candidate => candidate.id)).size === seat.mappings.length, "validation amendment changed the reviewed candidate set.");
  const unknown = [];
  for (const mapping of seat.mappings) {
    const candidate = seat.candidates?.find(candidate => candidate.id === mapping.id);
    const answer = structured.candidates.find(answer => answer.id === mapping.id);
    const output = amendment.outputs.find(output => output.rowId === mapping.rowId);
    requireEvidence(candidate && answer?.evaluation && output, "validation amendment omits a native candidate answer.");
    const wrapper = json(readPinned(repoRootDirectory, { ...output, path: path.relative(repoRootDirectory, path.resolve(repoRootDirectory, output.path)) }, reader).contents, "amended assessment");
    requireEvidence(wrapper.reviewRunId === plan.reviewRunId && wrapper.judgeId === seat.judgeId && wrapper.artifactHash === mapping.artifactHash && stable(wrapper.evaluation) === stable(answer.evaluation), "validation amendment changed a native evaluation.");
    for (const dimension of answer.evaluation.dimensions ?? []) for (const evidence of dimension.evidence ?? []) {
      if (evidence.mediaId !== candidate.liveId && !candidate.media.some(media => media.id === evidence.mediaId)) unknown.push({ candidate, evidence });
    }
  }
  requireEvidence(typeof seat.root === "string" && seat.workspace === path.join(seat.root, "workspace"), "validation amendment has an invalid owned review workspace.");
  const roots = [seat.workspace, path.join(seat.root, "browser-output")];
  for (const root of [...roots]) if (fs.existsSync(root)) roots.push(fs.realpathSync(root));
  const outsideReads = calls.filter(call => call.name === "Read" && !roots.some(root => path.resolve(seat.workspace, call.input?.file_path ?? "").startsWith(`${root}${path.sep}`)));
  const failed = amendment.checks.failedEvidenceLookups, supplemental = amendment.supplementalLiveEvidence;
  requireEvidence(Array.isArray(failed) && Array.isArray(supplemental), "validation amendment lacks bounded exceptional-evidence proof.");
  if (amendment.rule === "native-failed-evidence-lookup-v1") {
    requireEvidence(failed.length === 1 && outsideReads.length === 1 && supplemental.length === 0 && unknown.length === 0, "validation amendment exceeds the single denied evidence lookup.");
    const proof = failed[0], call = outsideReads[0], response = responses.find(response => response.tool_use_id === call.id);
    const candidate = seat.candidates.find(candidate => candidate.id === proof.candidateId), media = candidate?.media.find(media => media.id === proof.mediaId);
    requireEvidence(media?.type === "image" && safePath(media.path) && proof.toolUseId === call.id && proof.attemptedPath === path.join(seat.root, media.path) && path.resolve(seat.workspace, call.input.file_path) === proof.attemptedPath && proof.deliveredBytes === 0 && response?.is_error === true && response.content === `File does not exist. Note: your current working directory is ${seat.workspace}.`, "validation amendment does not prove a denied zero-byte image lookup.");
    let missing = false;
    try { fs.lstatSync(proof.attemptedPath); } catch (error) { missing = error.code === "ENOENT"; }
    requireEvidence(missing, "validation amendment's denied lookup now resolves to a file.");
  } else {
    requireEvidence(failed.length === 0 && outsideReads.length === 0 && supplemental.length === 1 && unknown.length === 1, "validation amendment exceeds the single captured evidence alias.");
    const proof = supplemental[0], { candidate, evidence } = unknown[0];
    requireEvidence(candidate.hasRuntime === true && proof.id === evidence.mediaId && proof.candidateId === candidate.id && proof.type === "image" && proof.atSeconds === null && evidence.atSeconds === null && new RegExp(`^${candidate.id}-[a-z][a-z0-9-]{1,40}$`).test(proof.id), "validation amendment aliases evidence from a different candidate.");
    const filename = `${proof.id}.png`, sourcePath = path.join(seat.workspace, filename);
    const read = calls.find(call => call.id === proof.readToolUseId), capture = calls.find(call => call.id === proof.captureToolUseId);
    const response = responses.find(response => response.tool_use_id === read?.id), captureResponse = responses.find(response => response.tool_use_id === capture?.id);
    const images = Array.isArray(response?.content) ? response.content.filter(content => content.type === "image") : [];
    const capturePattern = new RegExp(`page\\.screenshot\\(\\s*\\{\\s*path:\\s*(['\"])${proof.id}\\.png\\1`);
    requireEvidence(read?.name === "Read" && path.resolve(seat.workspace, read.input.file_path) === sourcePath && response && !response.is_error && images.length === 1 && images[0].source?.type === "base64" && capture?.name.endsWith("browser_run_code_unsafe") && capturePattern.test(capture.input.code ?? "") && calls.indexOf(capture) < calls.indexOf(read) && captureResponse && !captureResponse.is_error, "validation amendment lacks the native capture and image delivery.");
    const beforeCapture = calls.slice(0, calls.indexOf(capture)), navigation = beforeCapture.findLast(call => call.name.endsWith("browser_navigate"));
    let navigationPath;
    try { navigationPath = new URL(navigation?.input?.url).pathname; } catch { /* Invalid navigation is not evidence. */ }
    requireEvidence(navigationPath === `/${candidate.id}/index.html` && !beforeCapture.slice(beforeCapture.indexOf(navigation) + 1).some(call => call.name.endsWith("browser_tabs") || /\.goto\(|\.setContent\(|\.newPage\(/.test(call.input?.code ?? "")), "validation amendment's live screenshot is not from its candidate.");
    const retained = readPinned(repoRootDirectory, proof.image, reader), delivered = Buffer.from(images[0].source.data, "base64");
    const inspected = amendment.inspection.nativeReadImages?.find(image => image.toolUseId === read.id);
    requireEvidence(retained.sha256 === proof.sourceSha256 && retained.sha256 === proof.deliveredSha256 && digest(delivered) === retained.sha256 && delivered.length === retained.bytes && inspected?.sourcePath === sourcePath && inspected.sourceSha256 === retained.sha256 && inspected.deliveredSha256 === retained.sha256, "validation amendment's retained image differs from the image the judge saw.");
  }
}

function readReviewCompanion({ repoRootDirectory, selection, rowId, artifactHash, reader }) {
  const plan = json(readPinned(repoRootDirectory, selection.reviewPlan, reader).contents, "review plan");
  let result = json(readPinned(repoRootDirectory, selection.result, reader).contents, "review result");
  const seat = plan.seats?.find(seat => seat.id === selection.seatId);
  const mapping = seat?.mappings?.find(mapping => mapping.rowId === rowId);
  requireEvidence(plan.kind === "vasir-game-judge-plan" && plan.executionEligible === true && seat && mapping && ["A", "B"].includes(mapping.id) && mapping.artifactHash === artifactHash, "review companion does not map this submitted row.");
  requireEvidence(result.kind === "vasir-game-judge-result" && result.reviewRunId === plan.reviewRunId && result.judgeId === seat.judgeId && ["completed", "failed"].includes(result.status), "review result disagrees with its original plan and seat.");
  let validationNote = null;
  if (selection.validationAmendment) {
    const amendment = json(readPinned(repoRootDirectory, selection.validationAmendment, reader).contents, "amended validation");
    const errors = { "native-skill-advertisement-v1": "Game judge: Claude review loaded skills", "native-failed-evidence-lookup-v1": "Game judge: review read outside supplied evidence", "native-captured-evidence-alias-v1": "Game judge: rating cites unknown evidence" };
    const evidenceCorrection = ["native-failed-evidence-lookup-v1", "native-captured-evidence-alias-v1"].includes(amendment.rule);
    requireEvidence(amendment.kind === "vasir-game-judge-amended-validation" && amendment.schemaVersion === 1 && Object.hasOwn(errors, amendment.rule) && amendment.status === "completed" && amendment.originalStatus === "failed", "unsupported review validation amendment.");
    requireEvidence(amendment.reviewRunId === plan.reviewRunId && amendment.seatId === seat.id && amendment.judgeId === seat.judgeId && amendment.reviewPlan?.sha256 === selection.reviewPlan.sha256 && amendment.originalResult?.sha256 === selection.result.sha256, "validation amendment disagrees with its original plan or failed result.");
    requireEvidence(result.status === "failed" && result.error === errors[amendment.rule] && result.exitCode === 0 && !result.timedOut && !result.outputLimitExceeded && Number.isFinite(result.elapsedMs) && result.elapsedMs > 0 && result.elapsedMs <= plan.timeoutMs, "validation amendment cannot replace an unfinished or failed review process.");
    requireEvidence(amendment.checks?.status === "passed" && amendment.checks.skillToolAvailable === false && amendment.checks.skillOrHelperInvocations === 0 && Object.values(amendment.checks.externalCatalogs ?? {}).length === 3 && Object.values(amendment.checks.externalCatalogs).every(files => Array.isArray(files) && files.length === 0) && amendment.inspection?.status === "passed", "validation amendment lacks skill-isolation and image-delivery proof.");
    const validatorPath = `benchmarks/2d-jumping-demo/${evidenceCorrection ? "revalidate-review-evidence" : "revalidate-game-reviews"}.mjs`;
    requireEvidence(Array.isArray(amendment.inputs) && amendment.inputs.length >= (evidenceCorrection ? 6 : 4) && amendment.inputs.length <= 8 && amendment.inputs.some(pin => pin.path === validatorPath), "validation amendment lacks bounded retained inputs and validator source.");
    for (const pin of [amendment.reviewPlan, amendment.originalResult, ...amendment.inputs]) readPinned(repoRootDirectory, pin, reader);
    requireEvidence(amendment.outputs?.length === seat.mappings.length && seat.mappings.every(mapping => amendment.outputs.some(output => output.rowId === mapping.rowId && HASH.test(output.sha256 ?? ""))), "validation amendment does not retain every reviewed candidate.");
    if (evidenceCorrection) validateRetainedEvidenceAmendment({ repoRootDirectory, amendment, plan, seat, reader });
    result = { ...result, status: "completed", outputs: amendment.outputs };
    validationNote = evidenceCorrection ? "One completed review was accepted after verifying its unchanged native answer against the retained image evidence. The original validation rejection is retained." : "One completed review was accepted after correcting validation of advertised native skill metadata. The original validation rejection is retained.";
  }
  return { plan, result, seat, mapping, validationNote };
}

function projectScore({ repoRootDirectory, assessmentPins, rubric, artifactHash, rowId, reader }) {
  if (!assessmentPins?.length) return { score: null, judgments: [], qualityStatus: "Unverified: judgments pending" };
  requireEvidence(rubric && Array.isArray(rubric.dimensions) && rubric.dimensions.length > 0 && rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0) === 100 && rubric.judges?.length === 2 && assessmentPins.length <= 2, "scored rows need the declared two-judge panel and 100-point rubric.");
  const assessments = assessmentPins.map(selection => {
    const pin = selection.assessment ?? selection;
    const file = readPinned(repoRootDirectory, pin, reader);
    const assessment = json(file.contents, "assessment");
    if (selection.assessment) {
      const { plan, result, seat, mapping } = readReviewCompanion({ repoRootDirectory, selection, rowId, artifactHash, reader });
      requireEvidence(assessment.reviewRunId === plan.reviewRunId && assessment.judgeId === seat.judgeId && result.status === "completed" && result.outputs?.some(output => output.rowId === rowId && output.sha256 === pin.sha256 && fs.realpathSync(path.resolve(repoRootDirectory, output.path)) === fs.realpathSync(file.sourcePath)), "assessment is not an output of its pinned review seat.");
      return { ...assessment, publicCandidateLabel: mapping.id };
    }
    return { ...assessment, publicCandidateLabel: undefined };
  });
  const ids = new Set();
  for (const assessment of assessments) {
    requireEvidence(assessment.kind === "vasir-game-judgment" && assessment.schemaVersion === 1 && /^[a-f0-9]{32}$/.test(assessment.reviewRunId ?? "") && assessment.inspection?.status === "passed", "assessment lacks a completed real media-review envelope.");
    requireEvidence(rubric.judges.includes(assessment.judgeId) && !ids.has(assessment.judgeId) && assessment.artifactHash === artifactHash, "assessment identity or artifact digest disagrees with generation.");
    ids.add(assessment.judgeId);
    requireEvidence(assessment.status === "completed" && assessment.evaluation && Array.isArray(assessment.evaluation.dimensions), "an assessment is incomplete.");
  }
  const judgments = assessments.map(assessment => {
    const evaluation = assessment.evaluation;
    requireEvidence(evaluation.dimensions.length === rubric.dimensions.length && new Set(evaluation.dimensions.map(dimension => dimension.id)).size === rubric.dimensions.length, "judge dimension identities are incomplete or duplicated.");
    const dimensions = rubric.dimensions.map(dimension => {
      const observed = evaluation.dimensions.find(value => value.id === dimension.id);
      requireEvidence(observed && (observed.rating === null || Number.isInteger(observed.rating) && observed.rating >= 0 && observed.rating <= 4), "an assessment has an invalid 0–4 rating.");
      return { id: dimension.id, label: publicText(dimension.label, "dimension label"), weight: dimension.weight, rating: observed.rating, maximum: 4, reason: publicText(observed.reason, "dimension reason") };
    });
    const gates = Object.fromEntries(["boot", "mobilePlay", "recovery"].map(id => {
      const gate = evaluation.gates?.[id];
      requireEvidence(gate && ["pass", "fail", "unverified"].includes(gate.status), "judge gate evidence is incomplete.");
      return [id, { status: gate.status, reason: publicText(gate.reason, "gate reason") }];
    }));
    const score = dimensions.some(dimension => dimension.rating === null) ? null : dimensions.reduce((sum, dimension) => sum + dimension.weight * dimension.rating / 4, 0);
    return { judge: assessment.judgeId, label: judgeLabel(assessment.judgeId), ...(assessment.publicCandidateLabel ? { candidateLabel: assessment.publicCandidateLabel } : {}), score, dimensions, gates, summary: publicText(evaluation.summary, "judge summary"), limitations: (evaluation.limitations ?? []).map(value => publicText(value, "judge limitation")) };
  });
  if (judgments.length !== 2 || judgments.some(judgment => judgment.score === null)) return { score: null, judgments, qualityStatus: "Unverified: incomplete quality evidence" };
  const dimensions = rubric.dimensions.map(dimension => ({ id: dimension.id, label: dimension.label, weight: dimension.weight, rating: judgments.reduce((sum, judgment) => sum + judgment.dimensions.find(value => value.id === dimension.id).rating, 0) / 2, maximum: 4 }));
  const gates = judgments.flatMap(judgment => Object.values(judgment.gates));
  const eligible = gates.some(gate => gate.status === "fail") ? false : gates.every(gate => gate.status === "pass") ? true : null;
  return {
    score: { value: Math.round(judgments.reduce((sum, judgment) => sum + judgment.score, 0) / 2 * 10) / 10, maximum: 100, dimensions, eligible, summary: judgments.map(judgment => judgment.summary).join("\n\n") },
    judgments,
    qualityStatus: eligible ? "Developmental AI assessment" : gates.some(gate => gate.status === "fail") ? "Diagnostic score: required behavior failed" : "Diagnostic score: play evidence incomplete"
  };
}

function projectReviewOutcomes({ repoRootDirectory, record, rubric, artifactHash, assessment, reader }) {
  requireEvidence((record.reviewOutcomes ?? []).length <= 2, "review outcomes exceed the fixed panel.");
  const outcomeJudges = new Set();
  const reviewOutcomes = (record.reviewOutcomes ?? []).map(selection => {
    const { plan, result, seat, validationNote } = readReviewCompanion({ repoRootDirectory, selection, rowId: record.id, artifactHash, reader });
    requireEvidence(rubric.judges.includes(seat.judgeId) && !outcomeJudges.has(seat.judgeId), "review outcome has an unknown or repeated judge.");
    requireEvidence((result.status === "completed") === assessment.judgments.some(judgment => judgment.judge === seat.judgeId), "review outcome disagrees with the retained assessments.");
    outcomeJudges.add(seat.judgeId);
    const timedOut = result.timedOut === true || result.exitCode === 143 && result.elapsedMs >= plan.timeoutMs;
    return { judge: seat.judgeId, label: judgeLabel(seat.judgeId), status: result.status, reason: result.status === "completed" ? "Assessment completed." : timedOut ? "Reviewer reached the 20-minute review limit without a completed assessment." : "Reviewer did not return a validated assessment.", ...(validationNote ? { validationNote } : {}) };
  });
  if (assessment.score === null && reviewOutcomes.some(outcome => outcome.status === "failed")) assessment.qualityStatus = "Unscored: review panel incomplete";
  return reviewOutcomes;
}

function projectReviewHistory({ repoRootDirectory, record, rubric, artifactHash, reader }) {
  requireEvidence(Array.isArray(record.previousReviewOutcomes ?? []) && (record.previousReviewOutcomes ?? []).length <= 8, "previous review attempts exceed the retained bound.");
  return (record.previousReviewOutcomes ?? []).map(selection => {
    const { plan, result, seat } = readReviewCompanion({ repoRootDirectory, selection, rowId: record.id, artifactHash, reader });
    requireEvidence(rubric.judges.includes(seat.judgeId) && result.status === "failed", "only a failed review seat may be superseded by a completion attempt.");
    const timedOut = result.timedOut === true || result.exitCode === 143 && result.elapsedMs >= plan.timeoutMs;
    return { judge: seat.judgeId, label: judgeLabel(seat.judgeId), status: "failed", reason: timedOut ? "An earlier review attempt reached the review time limit." : "An earlier review attempt did not return a validated assessment." };
  });
}

/** Selects exact saved bytes. Runtime files are copied unchanged by the release builder. */
export function buildGamesPublication({ repoRootDirectory, readFileSyncImplementation = fs.readFileSync }) {
  const selectionPath = path.join(repoRootDirectory, GAME_PUBLICATION_PATH);
  if (!fs.existsSync(selectionPath)) return null;
  const selectionText = readFileSyncImplementation(selectionPath, "utf8");
  const selection = json(selectionText, "selection");
  requireEvidence(selection.kind === "vasirbenchmark-games-selection" && selection.schemaVersion === 1, "unsupported selection schema.");
  const sourceFile = readPinned(repoRootDirectory, selection.source, readFileSyncImplementation);
  const source = json(sourceFile.contents, "publication source");
  requireEvidence(source.kind === "vasirbenchmark-games-source" && source.schemaVersion === 1 && source.benchmark?.id === "2d-jumping-demo", "unsupported publication source.");
  const rubricFile = readPinned(repoRootDirectory, source.rubricSource, readFileSyncImplementation);
  requireEvidence(stable(json(rubricFile.contents, "rubric")) === stable(source.rubric), "source rubric differs from its frozen definition.");
  const runFile = readPinned(repoRootDirectory, source.run, readFileSyncImplementation);
  const run = json(runFile.contents, "generation run");
  requireEvidence(run.benchmark === source.benchmark.id && run.prompt === source.benchmark.prompt && Array.isArray(run.rows) && Array.isArray(source.rows), "publication and generation task disagree.");
  requireEvidence(Array.isArray(source.additionalRuns ?? []) && (source.additionalRuns ?? []).length <= 32, "additional generation batches exceed the publication bound.");
  const additionalRunFiles = (source.additionalRuns ?? []).map(pin => readPinned(repoRootDirectory, pin, readFileSyncImplementation));
  const generationRuns = [run, ...additionalRunFiles.map(file => json(file.contents, "additional generation run"))];
  requireEvidence(generationRuns.every(batch => batch.benchmark === run.benchmark && batch.prompt === run.prompt && Array.isArray(batch.rows)), "additional generation task differs from the original prompt.");
  const generatedRows = generationRuns.flatMap(batch => batch.rows);
  const rawRows = new Map(generatedRows.map(row => [row.rowId, row]));
  requireEvidence(rawRows.size === generatedRows.length && source.rows.length === generatedRows.length, "publication must preserve every generated row exactly once.");
  // This edition displays one artifact per cell; a repeated trial would be hidden by selection.
  requireEvidence(new Set(generatedRows.map(row => JSON.stringify([row.configuration.id, row.condition]))).size === generatedRows.length, "this single-trial edition cannot publish a repeated configuration and condition.");
  const files = new Map();
  function artifact(record) {
    const runtime = record.bundle ? collectBundle({ repoRootDirectory, bundle: record.bundle, reader: readFileSyncImplementation }) : { playUrl: null, files: [] };
    const video = collectMedia({ repoRootDirectory, pin: record.video, type: "video", reader: readFileSyncImplementation });
    const poster = collectMedia({ repoRootDirectory, pin: record.poster, type: "image", reader: readFileSyncImplementation });
    for (const file of [...runtime.files, ...video.files, ...poster.files]) {
      requireEvidence(!files.has(file.key) || files.get(file.key).sha256 === file.sha256, "artifact key collision.");
      files.set(file.key, file);
    }
    return { playUrl: runtime.playUrl, videoUrl: video.url, posterUrl: poster.url, width: record.width ?? 390, height: record.height ?? 844 };
  }
  const seen = new Set();
  const runs = source.rows.map(record => {
    const raw = rawRows.get(record.id);
    requireEvidence(raw && !seen.has(record.id), "selected row identity is missing or duplicated.");
    seen.add(record.id);
    if (record.bundle) {
      const sourceRoot = fs.realpathSync(path.join(repoRootDirectory, safePath(record.bundle.root)));
      const generatedRoot = fs.realpathSync(path.resolve(repoRootDirectory, raw.source.directory));
      let generatedFiles;
      if (record.buildReceipt) {
        const receipt = json(readPinned(repoRootDirectory, record.buildReceipt, readFileSyncImplementation).contents, "build receipt");
        requireEvidence(receipt.kind === "vasir-game-build-receipt" && receipt.schemaVersion === 1 && receipt.inputArtifactHash === raw.source.sha256 && receipt.exitCode === 0 && Array.isArray(receipt.output?.entries), "derived build lacks a successful receipt bound to the submitted artifact.");
        requireEvidence(sourceRoot === fs.realpathSync(path.resolve(repoRootDirectory, receipt.output.directory)), "runtime bundle differs from the recorded build output.");
        generatedFiles = new Map(receipt.output.entries.filter(entry => entry.type === "file").map(entry => [entry.path, entry]));
        const derivations = receipt.derivations ?? [];
        requireEvidence(derivations.filter(derivation => derivation.kind === "vasir-game-base-navigation-relocation").length <= 2, "base navigation relocation exceeds the initial and corrective steps.");
        let derivedEntrypoint;
        const samePin = (first, second) => first?.path === second?.path && first?.sha256 === second?.sha256 && first?.bytes === second?.bytes;
        for (const derivation of derivations) {
          if (derivation.kind === "vasir-game-base-navigation-relocation") {
            requireEvidence(derivation.schemaVersion === 1 && derivation.inputArtifactHash === raw.source.sha256 && derivation.sourceEdited === false, "base navigation relocation is not bound to the submitted artifact.");
            const original = derivation.originalBuiltEntrypoint, packaged = derivation.packagedEntrypoint;
            const snapshot = readPinned(repoRootDirectory, derivation.originalBuiltEntrypointSnapshot, readFileSyncImplementation);
            requireEvidence(original?.path === "index.html" && packaged?.path === original.path && original.sha256 === snapshot.sha256 && original.bytes === snapshot.bytes, "base navigation original HTML snapshot disagrees with its build pin.");
            requireEvidence(!derivedEntrypoint || samePin(derivedEntrypoint, original), "base navigation input disagrees with the preceding entrypoint derivation.");
            const rewrite = derivation.rewrites?.[0];
            const fromHref = typeof rewrite?.from === "string" && rewrite.from.match(/^<a\s[^<>]*\bhref="(\/|\.\/)"[^<>]*>$/)?.[1];
            const targets = fromHref === "/" ? ["./", "./index.html"] : ["./index.html"];
            requireEvidence(derivation.rewrites?.length === 1 && rewrite.file === original.path && rewrite.occurrences === 1 && fromHref && rewrite.from.length <= 1024 && targets.some(target => rewrite.to === rewrite.from.replace(`href="${fromHref}"`, `href="${target}"`)), "base navigation relocation must contain one app-home href replacement.");
            const html = snapshot.contents.toString("utf8");
            requireEvidence(html.split(rewrite.from).length === 2, "base navigation replacement does not match exactly one authored anchor.");
            const relocated = Buffer.from(html.replace(rewrite.from, rewrite.to));
            requireEvidence(digest(relocated) === packaged.sha256 && relocated.length === packaged.bytes, "base navigation relocation includes an additional HTML change.");
            derivedEntrypoint = packaged;
            continue;
          }
          if (derivation.kind !== "vasir-game-font-relocation") continue;
          requireEvidence(derivation.inputArtifactHash === raw.source.sha256 && derivation.sourceEdited === false, "font relocation is not bound to the submitted artifact.");
          requireEvidence(!derivedEntrypoint || samePin(derivedEntrypoint, derivation.originalEntrypoint), "font relocation input disagrees with the preceding entrypoint derivation.");
          derivedEntrypoint = derivation.packagedEntrypoint;
          const manifestPin = { ...derivation.dependencyManifest, path: path.relative(repoRootDirectory, path.resolve(repoRootDirectory, derivation.dependencyManifest.path)).split(path.sep).join("/") };
          const manifestFile = readPinned(repoRootDirectory, manifestPin, readFileSyncImplementation);
          const manifest = json(manifestFile.contents, "font dependency manifest");
          requireEvidence(manifest.kind === "vasir-game-font-dependencies" && [1, 2].includes(manifest.schemaVersion) && manifest.inputArtifactHash === raw.source.sha256 && manifest.stylesheet.sha256 === derivation.originalStylesheet.sha256, "font dependency snapshot disagrees with its derivation.");
          const licenses = manifest.schemaVersion === 2 ? manifest.licenses : [manifest.license];
          requireEvidence(Array.isArray(licenses) && licenses.length > 0 && licenses.length <= 8, "font dependency snapshot lacks its bounded license notices.");
          for (const file of [manifest.stylesheet, ...licenses, ...manifest.fonts]) readPinned(path.dirname(manifestFile.sourcePath), file, readFileSyncImplementation);
          for (const file of [...derivation.additions, ...(derivation.rewrittenStylesheets ?? []).map(stylesheet => stylesheet.packaged)]) requireEvidence(generatedFiles.get(file.path)?.sha256 === file.sha256 && generatedFiles.get(file.path)?.bytes === file.bytes, "packaged font relocation differs from the build receipt.");
        }
        requireEvidence(!derivedEntrypoint || samePin(derivedEntrypoint, generatedFiles.get(derivedEntrypoint.path)), "final relocated entrypoint differs from the build receipt.");
      } else {
        requireEvidence(sourceRoot === generatedRoot || sourceRoot.startsWith(`${generatedRoot}${path.sep}`), "runtime bundle does not come from the generated workspace.");
        const prefix = path.relative(generatedRoot, sourceRoot).split(path.sep).join("/");
        generatedFiles = new Map(raw.source.entries.filter(entry => entry.type === "file").map(entry => [prefix ? entry.path.startsWith(`${prefix}/`) ? entry.path.slice(prefix.length + 1) : null : entry.path, entry]));
      }
      for (const file of record.bundle.files) requireEvidence(generatedFiles.get(file.path)?.sha256 === file.sha256 && generatedFiles.get(file.path)?.bytes === file.bytes, "allowlisted runtime file differs from its generation or build receipt.");
    }
    validateMediaEvidence({ repoRootDirectory, record, raw, reader: readFileSyncImplementation });
    const assessment = projectScore({ repoRootDirectory, assessmentPins: record.assessments, rubric: source.rubric, artifactHash: raw.source?.sha256, rowId: record.id, reader: readFileSyncImplementation });
    const reviewOutcomes = projectReviewOutcomes({ repoRootDirectory, record, rubric: source.rubric, artifactHash: raw.source?.sha256, assessment, reader: readFileSyncImplementation });
    const reviewHistory = projectReviewHistory({ repoRootDirectory, record, rubric: source.rubric, artifactHash: raw.source?.sha256, reader: readFileSyncImplementation });
    requireEvidence(record.bundle || assessment.score === null && assessment.judgments.every(judgment => judgment.score === null), "an absent runtime cannot receive a quality score.");
    if (!record.bundle) assessment.qualityStatus = "Unscored: no runnable submission produced";
    requireEvidence((record.notes ?? []).length <= 8, "a row has too many execution notes.");
    const notes = (record.notes ?? []).map(value => { requireEvidence(value.length <= 1200, "a row execution note is too long."); return publicText(value, "row execution note"); });
    for (const outcome of reviewOutcomes) if (outcome.validationNote && !notes.includes(outcome.validationNote)) notes.push(outcome.validationNote);
    return {
      id: publicText(record.id, "row id"), configurationId: publicText(raw.configuration.id, "configuration id"), conditionId: publicText(raw.condition, "condition"), status: publicText(raw.status, "generation status"),
      artifact: artifact(record), ...assessment,
      notes,
      reviewOutcomes,
      ...(reviewHistory.length ? { reviewHistory } : {}),
      metrics: { durationMs: publicMetric(raw.elapsedMs), totalTokens: totalTokens(raw), costUsd: publicMetric(raw.costUsd) }
    };
  });
  const configurations = [...new Map(generatedRows.map(row => [row.configuration.id, { id: row.configuration.id, label: row.configuration.label ?? MODEL_LABELS[row.configuration.model] ?? row.configuration.model, reasoning: row.configuration.reasoning }])).values()];
  const conditions = source.conditions.map(condition => ({ id: publicText(condition.id, "condition id"), label: publicText(condition.label, "condition label") }));
  requireEvidence(runs.every(row => conditions.some(condition => condition.id === row.conditionId)), "a generated condition is not declared.");
  let reference = null;
  if (source.reference) {
    const record = source.reference;
    let assessment = { score: null, judgments: [], qualityStatus: "Unverified: judgments pending" };
    let reviewOutcomes = [], reviewHistory = [], configuration;
    if (record.reviewSelectionSource) {
      const manifestFile = readPinned(repoRootDirectory, record.manifestSource, readFileSyncImplementation);
      const original = json(manifestFile.contents, "original reference manifest");
      const selection = json(readPinned(repoRootDirectory, record.reviewSelectionSource, readFileSyncImplementation).contents, "reference review selection");
      requireEvidence(selection.kind === "vasir-game-reference-review-selection" && selection.schemaVersion === 1 && selection.referenceManifest?.sha256 === manifestFile.sha256 && selection.referenceManifest.path === record.manifestSource.path && selection.referenceId === record.id, "reference selection disagrees with its immutable historical manifest.");
      requireEvidence(stable([record.bundle, record.video, record.poster, record.width, record.height]) === stable([original.bundle, original.video, original.poster, original.width, original.height]), "assessed reference runtime or playback differs from its historical manifest.");
      requireEvidence(stable(record.assessments) === stable(selection.assessments) && stable(record.reviewOutcomes) === stable(selection.reviewOutcomes), "reference assessments differ from its retained selection.");
      requireEvidence(stable(record.previousReviewOutcomes ?? []) === stable(selection.previousReviewOutcomes ?? []), "reference review history differs from its retained selection.");
      requireEvidence(stable(record.configuration) === stable(selection.configuration) && record.label === selection.label && record.provenance === selection.provenance, "reference designation differs from its retained selection.");
      const designated = record.configuration;
      requireEvidence(designated?.id === "codex:gpt-6-astra@ultra" && designated.reasoning === "ultra" && designated.label === "GPT-6 Astra" && selection.authorship === "human-directed", "reference needs its explicit human-directed Astra Ultra designation.");
      configuration = { ...designated };
      assessment = projectScore({ repoRootDirectory, assessmentPins: record.assessments, rubric: source.rubric, artifactHash: manifestFile.sha256, rowId: record.id, reader: readFileSyncImplementation });
      reviewOutcomes = projectReviewOutcomes({ repoRootDirectory, record, rubric: source.rubric, artifactHash: manifestFile.sha256, assessment, reader: readFileSyncImplementation });
      reviewHistory = projectReviewHistory({ repoRootDirectory, record, rubric: source.rubric, artifactHash: manifestFile.sha256, reader: readFileSyncImplementation });
      requireEvidence(record.bundle || assessment.score === null && assessment.judgments.every(judgment => judgment.score === null), "an absent reference runtime cannot receive a quality score.");
    } else requireEvidence(!record.assessments?.length && !record.reviewOutcomes?.length && !record.configuration, "reference ratings require a pinned historical review selection.");
    reference = { id: publicText(record.id, "reference id"), label: publicText(record.label, "reference label"), provenance: publicText(record.provenance, "reference provenance"), status: "reference", ...(configuration ? { configuration } : {}), artifact: artifact(record), ...assessment, reviewOutcomes, ...(reviewHistory.length ? { reviewHistory } : {}) };
  }
  if (source.referenceAsRun === true) {
    const configuration = configurations.find(item => item.id === reference?.configuration?.id);
    requireEvidence(reference?.configuration && configuration && runs.some(row => row.configurationId === configuration.id && row.conditionId === "bare") && conditions.some(condition => condition.id === "vasir"), "designated Ultra output needs its pinned reference and fresh bare configuration.");
    requireEvidence(!runs.some(row => row.id === reference.id || row.configurationId === configuration.id && row.conditionId === "vasir"), "designated Ultra output would duplicate an existing result.");
    configuration.comparison = { kind: "artifact-quality", controlled: false, reason: "The Ultra bare game uses one fresh prompt; Ash & Echo includes iterative creator feedback." };
    runs.push({ ...reference, configurationId: configuration.id, conditionId: "vasir", metrics: { durationMs: null, totalTokens: null, costUsd: null } });
    reference = null;
  }
  const projection = { kind: "vasirbenchmark-games", schemaVersion: 1, benchmark: { id: source.benchmark.id, title: publicText(source.benchmark.title, "benchmark title"), prompt: publicText(source.benchmark.prompt, "task"), edition: publicText(source.rubric.edition, "score edition"), calibration: publicText(source.rubric.calibration, "calibration status"), method: publicText(source.benchmark.method, "method"), limitations: source.benchmark.limitations.map(value => publicText(value, "limitation")) }, configurations, conditions, runs, reference };
  validateGamesPublication(projection);
  const artifactFiles = [...files.values()].sort((a, b) => a.key.localeCompare(b.key));
  requireEvidence(artifactFiles.length <= MAX_FILES && artifactFiles.reduce((sum, file) => sum + file.bytes, 0) <= MAX_TOTAL_BYTES, "artifacts exceed the 2048-file or 512 MiB publication bound.");
  return { projection, artifactFiles, basisSha256: digest(stable({ source: sourceFile.sha256, run: runFile.sha256, ...(additionalRunFiles.length ? { additionalRuns: additionalRunFiles.map(file => file.sha256) } : {}), selection: digest(selectionText), files: artifactFiles.map(({ sourcePath, ...file }) => file) })) };
}

export function validateGamesPublication(games) {
  requireEvidence(games?.kind === "vasirbenchmark-games" && games.schemaVersion === 1 && Array.isArray(games.runs), "public Games schema is invalid.");
  const publicJson = JSON.stringify(games);
  requireEvidence(!PRIVATE_TEXT.test(publicJson), "public Games data contains private evidence.");
  for (const row of [...games.runs, ...(games.reference ? [games.reference] : [])]) {
    for (const field of ["playUrl", "videoUrl", "posterUrl"]) {
      const url = row.artifact?.[field];
      requireEvidence(url === null || typeof url === "string" && url.startsWith(`${GAME_ARTIFACT_ORIGIN}/artifacts/`) && /^\/artifacts\/[a-f0-9]{64}\/[A-Za-z0-9_./-]+$/.test(new URL(url).pathname) && !new URL(url).search && !new URL(url).hash && !new URL(url).pathname.includes(".."), "public game media must use the isolated immutable artifact origin.");
    }
    requireEvidence(row.score === null || Number.isFinite(row.score?.value) && row.score.value >= 0 && row.score.value <= 100, "public score must be measured or null.");
  }
  return games;
}

/** Pins existing generation, capture and judgment files; never alters game output. */
export function prepareGamesPublicationSource({ repoRootDirectory, runPath, additionalRunPaths = [], benchmark, conditions, rubricPath = "benchmarks/2d-jumping-demo/rubric.json", mediaByRowId = {}, judgmentsByRowId = {}, reviewOutcomesByRowId = {}, previousReviewOutcomesByRowId = {}, referencePath = null, referenceReviewSelectionPath = null, referenceAsRun = false }) {
  const pin = input => {
    const relative = typeof input === "string" ? input : input?.path;
    safePath(relative);
    const contents = fs.readFileSync(path.join(repoRootDirectory, relative));
    if (typeof input !== "string") requireEvidence(input.sha256 === digest(contents) && input.bytes === contents.length, "a supplied capture/assessment pin changed before preparation.");
    return { path: relative, bytes: contents.length, sha256: digest(contents) };
  };
  const runPin = pin(runPath);
  const run = json(fs.readFileSync(path.join(repoRootDirectory, runPath)), "generation run");
  const additionalRuns = additionalRunPaths.map(pin);
  const generatedRows = [run, ...additionalRuns.map(item => json(fs.readFileSync(path.join(repoRootDirectory, item.path)), "additional generation run"))].flatMap(batch => batch.rows);
  const rubric = json(fs.readFileSync(path.join(repoRootDirectory, safePath(rubricPath))), "rubric");
  const companion = selection => {
    const reviewPlan = pin(selection.reviewPlan);
    const plan = json(fs.readFileSync(path.join(repoRootDirectory, reviewPlan.path)), "review plan");
    const seat = plan.seats?.find(seat => seat.id === selection.seatId);
    requireEvidence(seat, "review companion seat is missing.");
    const result = pin(selection.result ?? path.relative(repoRootDirectory, path.join(seat.history, "result.json")).split(path.sep).join("/"));
    return { reviewPlan, result, seatId: selection.seatId, ...(selection.assessment ? { assessment: pin(selection.assessment) } : {}), ...(selection.validationAmendment ? { validationAmendment: pin(selection.validationAmendment) } : {}) };
  };
  const rows = generatedRows.map(raw => {
    const media = mediaByRowId[raw.rowId] ?? {};
    const root = path.relative(repoRootDirectory, path.resolve(repoRootDirectory, raw.source?.directory ?? ".")).split(path.sep).join("/");
    const files = (raw.source?.entries ?? []).filter(entry => entry.type === "file" && TYPES[path.extname(entry.path).toLowerCase()] && !entry.path.split("/").some(part => part.startsWith("."))).map(({ path: filePath, bytes, sha256 }) => ({ path: filePath, bytes, sha256 }));
    const entrypoint = media.entrypoint ?? "index.html";
    return {
      id: raw.rowId,
      bundle: Object.hasOwn(media, "bundle") ? media.bundle : (files.some(file => file.path === entrypoint) ? { root: safePath(root), entrypoint, files } : null),
      buildReceipt: media.buildReceipt ? pin(media.buildReceipt) : null,
      mediaReceipt: media.receipt || media.mediaReceipt ? pin(media.receipt ?? media.mediaReceipt) : null,
      video: media.video ? pin(media.video) : null,
      poster: media.poster ? pin(media.poster) : null,
      width: media.width ?? 390,
      height: media.height ?? 844,
      notes: media.notes ?? [],
      assessments: (judgmentsByRowId[raw.rowId] ?? []).map(selection => selection.assessment ? companion(selection) : pin(selection)),
      reviewOutcomes: (reviewOutcomesByRowId[raw.rowId] ?? []).map(companion),
      ...(previousReviewOutcomesByRowId[raw.rowId]?.length ? { previousReviewOutcomes: previousReviewOutcomesByRowId[raw.rowId].map(companion) } : {})
    };
  });
  let reference = referencePath ? json(fs.readFileSync(path.join(repoRootDirectory, safePath(referencePath))), "reference manifest") : null;
  if (referenceReviewSelectionPath) {
    requireEvidence(referencePath, "reference review needs its original manifest.");
    const reviewSelectionSource = pin(referenceReviewSelectionPath);
    const selection = json(fs.readFileSync(path.join(repoRootDirectory, reviewSelectionSource.path)), "reference review selection");
    reference = { ...reference, manifestSource: pin(referencePath), reviewSelectionSource, configuration: selection.configuration,
      label: selection.label, provenance: selection.provenance,
      assessments: (selection.assessments ?? []).map(companion), reviewOutcomes: (selection.reviewOutcomes ?? []).map(companion),
      ...(selection.previousReviewOutcomes?.length ? { previousReviewOutcomes: selection.previousReviewOutcomes.map(companion) } : {}) };
  }
  const source = { kind: "vasirbenchmark-games-source", schemaVersion: 1, run: runPin, ...(additionalRuns.length ? { additionalRuns } : {}), benchmark: { ...benchmark, id: "2d-jumping-demo", prompt: run.prompt }, conditions, rubric, rubricSource: pin(rubricPath), rows, reference, ...(referenceAsRun ? { referenceAsRun: true } : {}) };
  const contents = `${JSON.stringify(source, null, 2)}\n`;
  const sha256 = digest(contents);
  const sourcePath = `${path.posix.dirname(runPath)}/publication/source-${sha256}.json`;
  const selection = { kind: "vasirbenchmark-games-selection", schemaVersion: 1, source: { path: sourcePath, bytes: Buffer.byteLength(contents), sha256 } };
  fs.mkdirSync(path.dirname(path.join(repoRootDirectory, sourcePath)), { recursive: true });
  if (fs.existsSync(path.join(repoRootDirectory, sourcePath))) requireEvidence(fs.readFileSync(path.join(repoRootDirectory, sourcePath), "utf8") === contents, "immutable publication source already differs.");
  else fs.writeFileSync(path.join(repoRootDirectory, sourcePath), contents, { flag: "wx" });
  return { selection, sourcePath, selectionPath: GAME_PUBLICATION_PATH };
}
