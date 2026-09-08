import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { buildGamesPublication, GAME_ARTIFACT_ORIGIN, prepareGamesPublicationSource, validateGamesPublication } from "../cli/eval/games-publication.js";
import { calculateProjectedPublicationBytes } from "../cli/benchmark-publish.js";
import { buildBenchmarkPublicationProjection } from "../cli/eval/benchmark-publication-projection.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = contents => crypto.createHash("sha256").update(contents).digest("hex");
const RUBRIC = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "benchmarks/2d-jumping-demo/rubric.json")));

function setup(t, { ratings = [2, 4], gate = "pass", judgmentCount = 2, runtimeSuffix = "" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-games-publication-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (relative, contents) => {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), contents);
  };
  const writeJson = (relative, value) => write(relative, JSON.stringify(value));
  const game = '<!doctype html><title>Jump</title><canvas></canvas><script>window.playable = true;</script>' + runtimeSuffix;
  const sourceDirectory = ".agents/vasir-evals/2d-jumping-demo/run/rows/sol-bare/source";
  const runPath = ".agents/vasir-evals/2d-jumping-demo/run/run.json";
  write(`${sourceDirectory}/index.html`, game);
  // Private executor receipts may coexist with runtime output; only runtime files are selected.
  write(`${sourceDirectory}/provider.json`, '{"private":"not public"}');
  const raw = { rowId: "sol-bare", configuration: { id: "codex:gpt-5.6-sol@max", provider: "codex", model: "gpt-5.6-sol", reasoning: "max" }, condition: "bare", status: "completed", elapsedMs: 120000, usage: { totalTokens: 6000 }, costUsd: null, source: { directory: path.join(root, sourceDirectory), sha256: hash(game), entries: [{ path: "index.html", type: "file", bytes: Buffer.byteLength(game), sha256: hash(game) }, { path: "provider.json", type: "file", bytes: 24, sha256: hash('private') }] } };
  writeJson(runPath, { schemaVersion: 1, benchmark: "2d-jumping-demo", batchId: "run", prompt: RUBRIC.task, rows: [raw] });
  writeJson("benchmarks/2d-jumping-demo/rubric.json", RUBRIC);
  const judgments = RUBRIC.judges.slice(0, judgmentCount).map((judgeId, index) => {
    const relative = `.agents/vasir-evals/2d-jumping-demo/run/sol-bare-judge-${index}.json`;
    writeJson(relative, { kind: "vasir-game-judgment", schemaVersion: 1, reviewRunId: "a".repeat(32), inspection: { status: "passed" }, judgeId, status: "completed", artifactHash: raw.source.sha256, evaluation: { gates: Object.fromEntries(["boot", "mobilePlay", "recovery"].map(id => [id, { status: gate, reason: "Observed actual browser play." }])), dimensions: RUBRIC.dimensions.map(dimension => ({ id: dimension.id, rating: ratings[index], reason: "Ordinary actions and recovery sustain this rating." })), summary: "Observed play supports this assessment.", limitations: ["No physical-phone test."] } });
    return relative;
  });
  const input = { repoRootDirectory: root, runPath, benchmark: { title: "2D jumping game", method: "One fresh run with browser evidence.", limitations: ["Developmental assessment."] }, conditions: [{ id: "bare", label: "Bare" }], judgmentsByRowId: { "sol-bare": judgments } };
  const select = () => {
    const prepared = prepareGamesPublicationSource(input);
    writeJson(prepared.selectionPath, prepared.selection);
    return prepared;
  };
  const prepared = select();
  return { root, raw, input, select, prepared, write, writeJson, sourceDirectory, game, judgments, build: () => buildGamesPublication({ repoRootDirectory: root }) };
}

test("Games publication derives scores from pinned judgments and exposes unchanged runtime bytes only", t => {
  const fixture = setup(t);
  const first = fixture.build();
  const second = fixture.build();
  assert.equal(first.basisSha256, second.basisSha256);
  assert.deepEqual(first.projection, second.projection);
  const row = first.projection.runs[0];
  assert.equal(row.score.value, 75);
  assert.equal(row.score.eligible, true);
  assert.deepEqual(row.judgments.map(judgment => judgment.score), [50, 100]);
  assert.equal(row.metrics.durationMs, 120000);
  assert.equal(row.metrics.costUsd, null);
  assert.equal(row.artifact.videoUrl, null);
  assert.ok(row.artifact.playUrl.startsWith(`${GAME_ARTIFACT_ORIGIN}/artifacts/`));
  assert.equal(first.artifactFiles.length, 1);
  assert.equal(fs.readFileSync(first.artifactFiles[0].sourcePath, "utf8"), fixture.game);
  assert.equal(first.artifactFiles[0].sha256, hash(fixture.game));
  assert.doesNotMatch(JSON.stringify(first.projection), /\.agents|provider\.json|sourceDirectory|promptSha256|\/Users\//);
});

test("A new generation batch adds its original output without rewriting or dropping earlier submissions", t => {
  const fixture = setup(t);
  const before = fixture.build().projection.runs[0];
  const originalRun = fs.readFileSync(path.join(fixture.root, fixture.input.runPath));
  const extraPath = ".agents/vasir-evals/2d-jumping-demo/ultra-extension/run.json";
  const extra = { benchmark: "2d-jumping-demo", prompt: RUBRIC.task, rows: [{ ...fixture.raw, rowId: "ultra-bare", configuration: { id: "codex:gpt-6-astra@ultra", model: "gpt-6-astra", reasoning: "ultra" } }] };
  fixture.writeJson(extraPath, extra);
  fixture.input.additionalRunPaths = [extraPath];
  fixture.select();
  const data = fixture.build().projection;
  assert.deepEqual(data.runs[0], before);
  assert.equal(data.runs.length, 2);
  assert.equal(data.runs[1].configurationId, "codex:gpt-6-astra@ultra");
  assert.equal(data.runs[1].score, null);
  assert.equal(data.configurations.length, 2);
  assert.deepEqual(fs.readFileSync(path.join(fixture.root, fixture.input.runPath)), originalRun);
  extra.prompt = "A changed instruction must not become the same benchmark trial.";
  fixture.writeJson(extraPath, extra);
  assert.throws(fixture.build, /digest or size changed/);
  fixture.select();
  assert.throws(fixture.build, /additional generation task differs/);
  extra.prompt = RUBRIC.task; extra.rows[0].rowId = fixture.raw.rowId;
  fixture.writeJson(extraPath, extra); fixture.select();
  assert.throws(fixture.build, /every generated row exactly once/);
  extra.rows[0].rowId = 'a-second-original-model-trial';
  extra.rows[0].configuration = fixture.raw.configuration;
  fixture.writeJson(extraPath, extra); fixture.select();
  assert.throws(fixture.build, /repeated configuration and condition/);
});

test("Games publication preserves harmless file-scheme comments while rejecting private URLs and paths", t => {
  const harmless = setup(t, { runtimeSuffix: '\n<script>// runs from file:// without a bundler or module server.\n// The strings "file://" and `file://` name the scheme.\n</script>' });
  const published = harmless.build();
  assert.equal(fs.readFileSync(published.artifactFiles[0].sourcePath, "utf8"), harmless.game);
  assert.equal(published.artifactFiles[0].sha256, hash(harmless.game));

  for (const privateText of [
    'file:///private/tmp/game.html',
    'file://localhost/private/tmp/game.html',
    'file://server/share/game.html',
    'file:///C:/private/game.html',
    '/Users/private-user/code/game.js',
    '.agents/vasir-evals/run/source/game.js'
  ]) {
    const leaked = setup(t, { runtimeSuffix: `\n<script>// Source: ${privateText}\n</script>` });
    assert.throws(leaked.build, /runtime file contains private paths or credential material/, privateText);
  }
});

test("Games publication leaves missing judgments unscored and marks failed gates as diagnostic", t => {
  const partial = setup(t, { judgmentCount: 1 }).build().projection.runs[0];
  assert.equal(partial.score, null);
  assert.equal(partial.judgments.length, 1);
  assert.match(partial.qualityStatus, /incomplete/);
  const failed = setup(t, { gate: "fail" }).build().projection.runs[0];
  assert.equal(failed.score.value, 75);
  assert.equal(failed.score.eligible, false);
  assert.match(failed.qualityStatus, /Diagnostic.*failed/);
  const unverified = setup(t, { gate: "unverified" }).build().projection.runs[0];
  assert.equal(unverified.score.eligible, null);
  const unknown = setup(t, { ratings: [null, 4] }).build().projection.runs[0];
  assert.equal(unknown.score, null);
});

test("Original review mappings clarify anonymous labels and a timed-out reviewer stays finally incomplete", t => {
  const fixture = setup(t, { judgmentCount: 1 });
  const base = ".agents/vasir-evals/2d-jumping-demo/run/reviews";
  const assessmentBytes = fs.readFileSync(path.join(fixture.root, fixture.judgments[0]));
  const seats = RUBRIC.judges.map((judgeId, index) => ({ id: `seat-${index}`, judgeId, history: path.join(fixture.root, base, `seat-${index}`), mappings: [{ rowId: fixture.raw.rowId, artifactHash: fixture.raw.source.sha256, id: index === 0 ? "B" : "A" }] }));
  const plan = { kind: "vasir-game-judge-plan", executionEligible: true, reviewRunId: "a".repeat(32), timeoutMs: 1200000, seats };
  const planPath = `${base}/plan.json`;
  fixture.writeJson(planPath, plan);
  fixture.writeJson(`${base}/seat-0/result.json`, { kind: "vasir-game-judge-result", reviewRunId: plan.reviewRunId, judgeId: seats[0].judgeId, status: "completed", outputs: [{ rowId: fixture.raw.rowId, path: path.join(fixture.root, fixture.judgments[0]), sha256: hash(assessmentBytes) }] });
  fixture.writeJson(`${base}/seat-1/result.json`, { kind: "vasir-game-judge-result", reviewRunId: plan.reviewRunId, judgeId: seats[1].judgeId, status: "failed", elapsedMs: 1200070, exitCode: 143 });
  fixture.input.judgmentsByRowId = { [fixture.raw.rowId]: [{ assessment: fixture.judgments[0], reviewPlan: planPath, seatId: seats[0].id }] };
  fixture.input.reviewOutcomesByRowId = { [fixture.raw.rowId]: seats.map(seat => ({ reviewPlan: planPath, seatId: seat.id })) };
  fixture.select();
  const row = fixture.build().projection.runs[0];
  assert.equal(row.score, null);
  assert.equal(row.judgments[0].candidateLabel, "B");
  assert.equal(row.judgments[0].label, "GPT-6 Astra · Extra high reasoning");
  assert.equal(row.judgments[0].summary, JSON.parse(assessmentBytes).evaluation.summary);
  assert.deepEqual(row.reviewOutcomes.map(outcome => outcome.status), ["completed", "failed"]);
  assert.match(row.reviewOutcomes[1].reason, /20-minute review limit/);
  assert.equal(row.qualityStatus, "Unscored: review panel incomplete");
  assert.equal(hash(fs.readFileSync(path.join(fixture.root, fixture.judgments[0]))), hash(assessmentBytes));
  plan.seats[0].mappings[0].artifactHash = "b".repeat(64);
  fixture.writeJson(planPath, plan); fixture.select();
  assert.throws(fixture.build, /does not map this submitted row/);
});

test("Completing a reviewer seat retains its failed earlier attempt without lowering or inventing a score", t => {
  const fixture = setup(t);
  const directory = '.agents/vasir-evals/2d-jumping-demo/review-retry';
  const judgeId = RUBRIC.judges[1];
  const planPath = `${directory}/plan.json`;
  const plan = { kind: 'vasir-game-judge-plan', executionEligible: true, reviewRunId: 'b'.repeat(32), timeoutMs: 1200000, seats: [{ id: 'failed-seat', judgeId, history: path.join(fixture.root,directory), mappings: [{ id:'A',rowId:fixture.raw.rowId,artifactHash:fixture.raw.source.sha256 }] }] };
  fixture.writeJson(planPath,plan);
  fixture.writeJson(`${directory}/result.json`,{ kind:'vasir-game-judge-result',reviewRunId:plan.reviewRunId,judgeId,status:'failed',exitCode:143,elapsedMs:1200001,timedOut:true });
  fixture.input.previousReviewOutcomesByRowId = { [fixture.raw.rowId]:[{reviewPlan:planPath,seatId:'failed-seat'}] };
  fixture.select();
  const row = fixture.build().projection.runs[0];
  assert.equal(row.score.value,75);
  assert.deepEqual(row.judgments.map(item=>item.score),[50,100]);
  assert.equal(row.reviewHistory.length,1);
  assert.equal(row.reviewHistory[0].judge,judgeId);
  assert.match(row.reviewHistory[0].reason,/earlier review attempt.*time limit/);
  plan.seats[0].mappings[0].artifactHash='c'.repeat(64); fixture.writeJson(planPath,plan); fixture.select();
  assert.throws(fixture.build,/does not map this submitted row/);
});

test("Amended validation preserves the raw rejection and pins every input before accepting an assessment", t => {
  const fixture = setup(t);
  const directory = ".agents/vasir-evals/2d-jumping-demo/run/synthetic-amendment";
  const pin = relative => { const bytes = fs.readFileSync(path.join(fixture.root, relative)); return { path: relative, bytes: bytes.length, sha256: hash(bytes) }; };
  const seats = RUBRIC.judges.map((judgeId, index) => ({ id: `seat-${index}`, judgeId, history: path.join(fixture.root, directory, `seat-${index}`), mappings: [{ rowId: fixture.raw.rowId, artifactHash: fixture.raw.source.sha256, id: "A" }] }));
  const planPath = `${directory}/plan.json`, originalPath = `${directory}/seat-1/result.json`, amendmentPath = `${directory}/amendment.json`;
  const plan = { kind: "vasir-game-judge-plan", executionEligible: true, reviewRunId: "a".repeat(32), timeoutMs: 1200000, seats };
  fixture.writeJson(planPath, plan);
  const output = index => ({ rowId: fixture.raw.rowId, path: path.join(fixture.root, fixture.judgments[index]), sha256: pin(fixture.judgments[index]).sha256 });
  fixture.writeJson(`${directory}/seat-0/result.json`, { kind: "vasir-game-judge-result", status: "completed", reviewRunId: plan.reviewRunId, judgeId: seats[0].judgeId, outputs: [output(0)] });
  const original = { kind: "vasir-game-judge-result", status: "failed", reviewRunId: plan.reviewRunId, judgeId: seats[1].judgeId, error: "Game judge: Claude review loaded skills", exitCode: 0, elapsedMs: 633399, timedOut: false, outputLimitExceeded: false };
  fixture.writeJson(originalPath, original);
  const inputPaths = [`${directory}/stdout.jsonl`, `${directory}/audit.jsonl`, `${directory}/requests.json`, "benchmarks/2d-jumping-demo/revalidate-game-reviews.mjs"];
  for (const file of inputPaths) fixture.write(file, "Explicit synthetic amendment boundary fixture.");
  const amendment = { kind: "vasir-game-judge-amended-validation", schemaVersion: 1, rule: "native-skill-advertisement-v1", reviewRunId: plan.reviewRunId, judgeId: seats[1].judgeId, seatId: seats[1].id, status: "completed", originalStatus: "failed", reviewPlan: pin(planPath), originalResult: pin(originalPath), checks: { status: "passed", skillToolAvailable: false, skillOrHelperInvocations: 0, externalCatalogs: { claude: [], codex: [], agents: [] } }, inspection: { status: "passed" }, inputs: inputPaths.map(pin), outputs: [output(1)] };
  const companions = seats.map((seat, index) => ({ reviewPlan: planPath, seatId: seat.id, ...(index === 1 ? { validationAmendment: amendmentPath } : {}) }));
  fixture.input.reviewOutcomesByRowId = { [fixture.raw.rowId]: companions };
  fixture.input.judgmentsByRowId = { [fixture.raw.rowId]: companions.map((companion, index) => ({ ...companion, assessment: fixture.judgments[index] })) };
  const select = () => { fixture.writeJson(amendmentPath, amendment); fixture.select(); };
  select();
  const row = fixture.build().projection.runs[0];
  assert.equal(row.score.value, 75); assert.deepEqual(row.reviewOutcomes.map(outcome => outcome.status), ["completed", "completed"]);
  assert.match(row.notes.join(" "), /original validation rejection is retained/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(fixture.root, originalPath))).status, "failed");
  fixture.write(inputPaths[0], "Changed retained native output.");
  assert.throws(fixture.build, /digest or size changed/);
  fixture.write(inputPaths[0], "Explicit synthetic amendment boundary fixture.");
  original.timedOut = true; original.exitCode = 143; original.elapsedMs = 1200090; fixture.writeJson(originalPath, original);
  amendment.originalResult = pin(originalPath); select();
  assert.throws(fixture.build, /cannot replace an unfinished or failed review process/);
});

function nativeEvidenceAmendment(t, rule) {
  const fixture = setup(t);
  const directory = ".agents/vasir-evals/2d-jumping-demo/native-evidence-fixture";
  const pin = relative => { const bytes = fs.readFileSync(path.join(fixture.root, relative)); return { path: relative, bytes: bytes.length, sha256: hash(bytes) }; };
  const planPath = `${directory}/plan.json`, originalPath = `${directory}/seat/result.json`, amendmentPath = `${directory}/validation.json`;
  const seat = { id: "native-seat", judgeId: RUBRIC.judges[1], history: path.join(fixture.root, directory, "seat"), root: path.join(fixture.root, "native-seat"), mappings: [{ id: "A", rowId: fixture.raw.rowId, artifactHash: fixture.raw.source.sha256 }], candidates: [{ id: "A", hasRuntime: true, liveId: "A-live", media: [{ id: "A-m02", type: "image", path: "A/media/A-m02.png" }] }] };
  seat.workspace = path.join(seat.root, "workspace");
  const runnerPath = `${directory}/judge-games.before.mjs`, helperPath = "benchmarks/2d-jumping-demo/revalidate-review-evidence.mjs";
  fixture.write(runnerPath, "// Explicit synthetic original runner fixture."); fixture.write(helperPath, "// Explicit synthetic correction source fixture.");
  const plan = { kind: "vasir-game-judge-plan", executionEligible: true, reviewRunId: "a".repeat(32), runnerSha256: pin(runnerPath).sha256, rubricSha256: hash(JSON.stringify(RUBRIC)), timeoutMs: 1200000, seats: [seat] };
  const original = { kind: "vasir-game-judge-result", reviewRunId: plan.reviewRunId, judgeId: seat.judgeId, status: "failed", error: rule === "native-failed-evidence-lookup-v1" ? "Game judge: review read outside supplied evidence" : "Game judge: rating cites unknown evidence", exitCode: 0, elapsedMs: 633399, timedOut: false, outputLimitExceeded: false };
  const wrapper = JSON.parse(fs.readFileSync(path.join(fixture.root, fixture.judgments[1])));
  const alias = rule === "native-captured-evidence-alias-v1";
  wrapper.evaluation.dimensions[0].evidence = [{ mediaId: alias ? "A-help" : "A-m02", atSeconds: null }];
  const structured = { candidates: [{ id: "A", evaluation: structuredClone(wrapper.evaluation) }] };
  const calls = [], responses = [];
  const call = (id, name, input, content, is_error = false) => {
    calls.push({ type: "tool_use", id, name, input }); responses.push({ type: "tool_result", tool_use_id: id, content, is_error });
  };
  const failedEvidenceLookups = [], supplementalLiveEvidence = [], nativeReadImages = [];
  if (alias) {
    // Valid one-pixel PNG; this is an explicit native-delivery boundary fixture, not game evidence.
    const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3foAAAAASUVORK5CYII=", "base64");
    const sourcePath = path.join(seat.workspace, "A-help.png"), imagePath = `${directory}/A-help.png`;
    fixture.write(imagePath, imageBytes);
    call("navigate", "mcp__browser__browser_navigate", { url: "http://127.0.0.1:4000/A/index.html" }, "Navigated.");
    call("capture", "mcp__browser__browser_run_code_unsafe", { code: "async (page) => { await page.screenshot({ path: 'A-help.png' }); }" }, "Captured.");
    call("read", "Read", { file_path: sourcePath }, [{ type: "image", source: { type: "base64", media_type: "image/png", data: imageBytes.toString("base64") } }]);
    supplementalLiveEvidence.push({ id: "A-help", candidateId: "A", type: "image", atSeconds: null, image: pin(imagePath), readToolUseId: "read", captureToolUseId: "capture", sourceSha256: hash(imageBytes), deliveredSha256: hash(imageBytes) });
    nativeReadImages.push({ toolUseId: "read", sourcePath, sourceSha256: hash(imageBytes), deliveredSha256: hash(imageBytes) });
  } else {
    const attemptedPath = path.join(seat.root, "A/media/A-m02.png");
    call("read", "Read", { file_path: attemptedPath }, `File does not exist. Note: your current working directory is ${seat.workspace}.`, true);
    failedEvidenceLookups.push({ toolUseId: "read", attemptedPath, candidateId: "A", mediaId: "A-m02", deliveredBytes: 0 });
  }
  call("structured", "StructuredOutput", structuredClone(structured), "Accepted.");
  const final = { type: "result", subtype: "success", is_error: false, structured_output: structured, modelUsage: { "claude-fable-5-1": {} } };
  const inputs = [`${directory}/seat/stdout.jsonl`, `${directory}/seat/browser-audit.jsonl`, `${directory}/seat/requests.json`, `${directory}/seat/input-basis.json`, runnerPath, helperPath];
  fixture.write(inputs[1], '{"syntheticFixture":true}\n'); fixture.writeJson(inputs[2], [{ path: "/A/index.html" }]);
  fixture.writeJson(inputs[3], { runnerSha256: plan.runnerSha256, rubricSha256: plan.rubricSha256 });
  const amendment = { kind: "vasir-game-judge-amended-validation", schemaVersion: 1, rule, reviewRunId: plan.reviewRunId, judgeId: seat.judgeId, seatId: seat.id, status: "completed", originalStatus: "failed", checks: { status: "passed", skillToolAvailable: false, skillOrHelperInvocations: 0, externalCatalogs: { claude: [], agents: [], codex: [] }, failedEvidenceLookups, outputUnchanged: true, originalRunnerSha256: plan.runnerSha256, structuredOutputSha256: hash(JSON.stringify(structured)) }, inspection: { status: "passed", nativeReadImages }, supplementalLiveEvidence };
  const companion = { reviewPlan: planPath, seatId: seat.id, validationAmendment: amendmentPath };
  fixture.input.judgmentsByRowId[fixture.raw.rowId] = [fixture.judgments[0], { ...companion, assessment: fixture.judgments[1] }];
  fixture.input.reviewOutcomesByRowId = { [fixture.raw.rowId]: [companion] };
  const save = () => {
    fixture.writeJson(planPath, plan); fixture.writeJson(originalPath, original); fixture.writeJson(fixture.judgments[1], wrapper);
    fixture.write(inputs[0], [...calls.map(value => ({ type: "assistant", message: { content: [value] } })), ...responses.map(value => ({ type: "user", message: { content: [value] } })), final].map(JSON.stringify).join("\n"));
    amendment.reviewPlan = pin(planPath); amendment.originalResult = pin(originalPath); amendment.inputs = inputs.map(pin);
    amendment.outputs = [{ rowId: fixture.raw.rowId, path: path.join(fixture.root, fixture.judgments[1]), sha256: pin(fixture.judgments[1]).sha256 }];
    fixture.writeJson(amendmentPath, amendment); fixture.select();
  };
  save();
  return { ...fixture, save, amendment, original, wrapper, calls, responses, final, plan, pin };
}

for (const rule of ["native-failed-evidence-lookup-v1", "native-captured-evidence-alias-v1"]) {
  test(`${rule} accepts the original answer only with its exact native evidence`, t => {
    const fixture = nativeEvidenceAmendment(t, rule), row = fixture.build().projection.runs[0];
    assert.equal(row.score.value, 75);
    assert.equal(row.judgments[1].summary, fixture.wrapper.evaluation.summary);
    assert.equal(row.judgments[1].dimensions[0].rating, fixture.wrapper.evaluation.dimensions[0].rating);
    assert.match(row.notes.join(" "), /unchanged native answer.*original validation rejection is retained/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(fixture.root, fixture.amendment.originalResult.path))).status, "failed");
  });
  test(`${rule} rejects incomplete processes and repinned answer or provenance changes`, t => {
    for (const mutate of [
      fixture => { fixture.original.timedOut = true; },
      fixture => { fixture.original.elapsedMs = fixture.plan.timeoutMs + 1; },
      fixture => { fixture.original.outputLimitExceeded = true; },
      fixture => { fixture.original.error = "Another unrelated validator error"; },
      fixture => { fixture.wrapper.evaluation.summary = "A rewritten assessment."; },
      fixture => { fixture.calls.at(-1).input.candidates[0].evaluation.dimensions[0].rating = 0; },
      fixture => { fixture.amendment.checks.originalRunnerSha256 = "0".repeat(64); },
      fixture => { fixture.final.subtype = "error_during_execution"; }
    ]) {
      const fixture = nativeEvidenceAmendment(t, rule); mutate(fixture); fixture.save();
      assert.throws(fixture.build, /validation amendment/);
    }
  });
}

test("A denied-lookup correction cannot excuse delivered data, another file, or an existing file", t => {
  for (const mutate of [
    fixture => { fixture.responses[0].is_error = false; },
    fixture => { fixture.responses[0].content = [{ type: "image", source: { type: "base64", data: "c2VjcmV0" } }]; },
    fixture => { fixture.amendment.checks.failedEvidenceLookups[0].deliveredBytes = 12; },
    fixture => { fixture.calls[0].input.file_path = path.join(fixture.root, "private.txt"); },
    fixture => { fixture.write(path.relative(fixture.root, fixture.calls[0].input.file_path), "Already present."); }
  ]) {
    const fixture = nativeEvidenceAmendment(t, "native-failed-evidence-lookup-v1"); mutate(fixture); fixture.save();
    assert.throws(fixture.build, /validation amendment/);
  }
});

test("A live-image alias must preserve captured pixels, candidate identity, and actual delivery", t => {
  for (const mutate of [
    fixture => { fixture.amendment.supplementalLiveEvidence[0].candidateId = "B"; },
    fixture => { fixture.responses.find(response => response.tool_use_id === "read").content[0].source.data = Buffer.from("Other pixels").toString("base64"); },
    fixture => { const proof = fixture.amendment.supplementalLiveEvidence[0]; fixture.write(proof.image.path, "Other pixels"); proof.image = fixture.pin(proof.image.path); },
    fixture => { fixture.calls.find(call => call.id === "capture").input.code = "async (page) => page.title()"; },
    fixture => { fixture.calls.find(call => call.id === "navigate").input.url = "http://127.0.0.1:4000/B/index.html"; },
    fixture => { fixture.calls.splice(1, 0, { type: "tool_use", id: "switch", name: "mcp__browser__browser_run_code_unsafe", input: { code: "async (page) => page.goto('/B/index.html')" } }); }
  ]) {
    const fixture = nativeEvidenceAmendment(t, "native-captured-evidence-alias-v1"); mutate(fixture); fixture.save();
    assert.throws(fixture.build, /validation amendment/);
  }
});

test("Token totals preserve native provider semantics and leave unreported costs null", t => {
  for (const [provider, usage, expected] of [
    ["codex", { input_tokens: 80, cached_input_tokens: 60, output_tokens: 20 }, 100],
    ["claude", { input_tokens: 80, cache_creation_input_tokens: 40, cache_read_input_tokens: 60, output_tokens: 20 }, 200],
    ["codex", {}, null]
  ]) {
    const fixture = setup(t);
    fixture.raw.configuration.provider = provider;
    fixture.raw.usage = usage;
    fixture.writeJson(fixture.input.runPath, { schemaVersion: 1, benchmark: "2d-jumping-demo", prompt: RUBRIC.task, rows: [fixture.raw] });
    fixture.select();
    assert.equal(fixture.build().projection.runs[0].metrics.totalTokens, expected);
    assert.equal(fixture.build().projection.runs[0].metrics.costUsd, null);
  }
});

test("Published playback is bound to the observed submitted runtime and excludes synthetic captures", t => {
  for (const mutation of [null, "artifact", "response", "package", "original", "synthetic"]) {
    const fixture = setup(t);
    const base = ".agents/vasir-evals/2d-jumping-demo/run/media";
    const pin = relative => { const bytes = fs.readFileSync(path.join(fixture.root, relative)); return { path: relative, bytes: bytes.length, sha256: hash(bytes) }; };
    for (const name of ["original.webm", "video.mp4", "poster.png", "frame.png"]) fixture.write(`${base}/${name}`, `Explicit test-only media: ${name}`);
    const files = fixture.raw.source.entries.filter(file => file.path === "index.html").map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 }));
    const capture = { inputArtifactHash: fixture.raw.source.sha256, packageVerifiedAfterCapture: true, package: { entries: files }, responses: [{ path: "index.html", sha256: files[0].sha256, matchesPackage: true }], originalVideo: path.join(fixture.root, base, "original.webm") };
    if (mutation === "response") capture.responses[0].matchesPackage = false;
    if (mutation === "original") capture.originalVideo = path.join(fixture.root, base, "frame.png");
    fixture.writeJson(`${base}/capture.json`, capture);
    const receipt = { kind: "vasir-game-media-receipt", schemaVersion: 1, artifactHash: fixture.raw.source.sha256, package: { root: fixture.sourceDirectory, entries: structuredClone(files) }, capture: pin(`${base}/capture.json`), originalVideo: pin(`${base}/original.webm`), video: pin(`${base}/video.mp4`), poster: pin(`${base}/poster.png`), frames: [{ ...pin(`${base}/frame.png`), id: "frame-00", atSeconds: 0 }] };
    if (mutation === "artifact") receipt.artifactHash = "b".repeat(64);
    if (mutation === "package") receipt.package.entries[0].sha256 = "b".repeat(64);
    if (mutation === "synthetic") receipt.synthetic = true;
    fixture.writeJson(`${base}/receipt.json`, receipt);
    fixture.input.mediaByRowId = { "sol-bare": mutation ? { receipt: `${base}/receipt.json`, video: `${base}/video.mp4`, poster: `${base}/poster.png` } : { mediaReceipt: pin(`${base}/receipt.json`), video: pin(`${base}/video.mp4`), poster: pin(`${base}/poster.png`) } };
    fixture.select();
    if (mutation) assert.throws(fixture.build, /submitted|runtime|captured|recording/, mutation);
    else {
      const publication = fixture.build();
      assert.equal(publication.artifactFiles.length, 3);
      assert.ok(publication.projection.runs[0].artifact.videoUrl.includes(pin(`${base}/video.mp4`).sha256));
      assert.doesNotMatch(JSON.stringify(publication.projection), /capture\.json|receipt\.json|original\.webm/);
    }
  }
});

test("Changed runtime bytes, judgments, rubric, and mismatched artifact identity fail publication", t => {
  for (const changed of ["runtime", "judgment", "rubric", "identity", "synthetic"]) {
    const fixture = setup(t);
    if (changed === "runtime") fixture.write(`${fixture.sourceDirectory}/index.html`, fixture.game + "changed");
    if (changed === "judgment") fixture.write(fixture.judgments[0], "{}");
    if (changed === "rubric") fixture.write("benchmarks/2d-jumping-demo/rubric.json", "{}");
    if (changed === "identity" || changed === "synthetic") {
      const assessment = JSON.parse(fs.readFileSync(path.join(fixture.root, fixture.judgments[0])));
      if (changed === "identity") assessment.artifactHash = "a".repeat(64);
      else assessment.kind = "vasir-game-judge-synthetic";
      fixture.writeJson(fixture.judgments[0], assessment);
      fixture.select();
    }
    assert.throws(fixture.build, /digest|artifact|rubric|real media-review/i, changed);
  }
});

test("Only runtime MIME types inside the frozen workspace can enter the public allowlist", t => {
  const fixture = setup(t);
  const source = JSON.parse(fs.readFileSync(path.join(fixture.root, fixture.prepared.sourcePath)));
  source.rows[0].bundle.files.push({ path: "provider.json", bytes: 24, sha256: hash('private') });
  const contents = JSON.stringify(source);
  fixture.write(fixture.prepared.sourcePath, contents);
  fixture.writeJson(fixture.prepared.selectionPath, { ...fixture.prepared.selection, source: { path: fixture.prepared.sourcePath, bytes: Buffer.byteLength(contents), sha256: hash(contents) } });
  assert.throws(fixture.build, /MIME allowlist/);
});

test("A derived runtime needs an exact build receipt and missing entrypoints retain the failed row", t => {
  const fixture = setup(t);
  const outputRoot = ".agents/vasir-evals/2d-jumping-demo/run/build";
  const body = '<!doctype html><title>Built game</title><canvas></canvas>';
  fixture.write(`${outputRoot}/index.html`, body);
  const files = [{ path: "index.html", type: "file", bytes: Buffer.byteLength(body), sha256: hash(body) }];
  const receiptPath = ".agents/vasir-evals/2d-jumping-demo/run/build.json";
  fixture.writeJson(receiptPath, { kind: "vasir-game-build-receipt", schemaVersion: 1, inputArtifactHash: fixture.raw.source.sha256, exitCode: 0, output: { directory: outputRoot, entries: files } });
  fixture.input.mediaByRowId = { "sol-bare": { bundle: { root: outputRoot, entrypoint: "index.html", files }, buildReceipt: receiptPath } };
  fixture.select();
  assert.equal(fixture.build().artifactFiles[0].sha256, hash(body));
  delete fixture.input.mediaByRowId["sol-bare"].buildReceipt;
  fixture.select();
  assert.throws(fixture.build, /generated workspace/);
  fixture.raw.status = "failed";
  fixture.raw.source = { directory: fixture.raw.source.directory, sha256: hash("empty"), entries: [] };
  fixture.writeJson(fixture.input.runPath, { schemaVersion: 1, benchmark: "2d-jumping-demo", prompt: RUBRIC.task, rows: [fixture.raw] });
  fixture.input.mediaByRowId = {};
  fixture.input.judgmentsByRowId = {};
  fixture.select();
  const failed = fixture.build().projection.runs[0];
  assert.equal(failed.status, "failed");
  assert.equal(failed.artifact.playUrl, null);
  assert.equal(failed.score, null);
});

test("An explicit unavailable build preserves the row and its execution notes without publishing raw source", t => {
  const fixture = setup(t, { judgmentCount: 0 });
  fixture.input.mediaByRowId = { "sol-bare": { bundle: null, notes: ["No runnable submission produced."] } };
  fixture.select();
  const publication = fixture.build();
  assert.equal(publication.artifactFiles.length, 0);
  assert.equal(publication.projection.runs[0].artifact.playUrl, null);
  assert.equal(publication.projection.runs[0].score, null);
  assert.deepEqual(publication.projection.runs[0].notes, ["No runnable submission produced."]);
});

test("Publication rechecks retained upstream font pins in a source-bound packaging derivation", t => {
  const fixture = setup(t);
  const directory = ".agents/vasir-evals/2d-jumping-demo/run/dependencies";
  const pin = (name, bytes) => { fixture.write(`${directory}/${name}`, bytes); return { path: name, bytes: Buffer.byteLength(bytes), sha256: hash(bytes) }; };
  const stylesheet = pin("font.css", "/* explicit synthetic stylesheet */");
  const license = pin("license.txt", "Explicit synthetic license fixture.");
  const font = pin("font.woff2", "wOF2 explicit synthetic bytes");
  const manifest = { kind: "vasir-game-font-dependencies", schemaVersion: 1, inputArtifactHash: fixture.raw.source.sha256, stylesheet, license, fonts: [font] };
  const manifestText = JSON.stringify(manifest);
  fixture.write(`${directory}/manifest.json`, manifestText);
  const receiptPath = `${directory}/build.json`;
  fixture.writeJson(receiptPath, { kind: "vasir-game-build-receipt", schemaVersion: 1, inputArtifactHash: fixture.raw.source.sha256, exitCode: 0, output: { directory: fixture.sourceDirectory, entries: fixture.raw.source.entries }, derivations: [{ kind: "vasir-game-font-relocation", inputArtifactHash: fixture.raw.source.sha256, sourceEdited: false, dependencyManifest: { path: `${directory}/manifest.json`, bytes: Buffer.byteLength(manifestText), sha256: hash(manifestText) }, originalStylesheet: stylesheet, packagedEntrypoint: fixture.raw.source.entries[0], additions: [] }] });
  fixture.input.mediaByRowId = { "sol-bare": { buildReceipt: receiptPath } };
  fixture.select();
  assert.ok(fixture.build().projection.runs[0].artifact.playUrl);
  fixture.write(`${directory}/font.woff2`, "changed upstream dependency");
  assert.throws(fixture.build, /digest or size changed/);
});

test("App-home relocation proves exactly one transport change and binds any following font step", t => {
  const fixture = setup(t, { judgmentCount: 0 });
  const directory = ".agents/vasir-evals/2d-jumping-demo/run/relocation";
  const from = '<a class="brand" href="/" aria-label="Synthetic game home">';
  const to = from.replace('href="/"', 'href="./"');
  const original = `<!doctype html>${from}Home</a><canvas></canvas>`;
  const relocated = original.replace(from, to);
  const filePin = (contents, name = "index.html") => ({ path: name, bytes: Buffer.byteLength(contents), sha256: hash(contents) });
  const originalPin = filePin(original), packagedPin = filePin(relocated);
  const snapshotPath = `${directory}/original.html`, receiptPath = `${directory}/build.json`;
  fixture.write(snapshotPath, original);
  fixture.write(`${fixture.sourceDirectory}/index.html`, relocated);
  const derivation = { kind: "vasir-game-base-navigation-relocation", schemaVersion: 1, inputArtifactHash: fixture.raw.source.sha256, sourceEdited: false, originalBuiltEntrypoint: originalPin, originalBuiltEntrypointSnapshot: { ...originalPin, path: snapshotPath }, packagedEntrypoint: packagedPin, rewrites: [{ file: "index.html", from, to, occurrences: 1 }] };
  const receipt = { kind: "vasir-game-build-receipt", schemaVersion: 1, inputArtifactHash: fixture.raw.source.sha256, exitCode: 0, output: { directory: fixture.sourceDirectory, entries: [{ ...packagedPin, type: "file" }] }, derivations: [derivation] };
  const select = () => { fixture.writeJson(receiptPath, receipt); fixture.input.mediaByRowId = { "sol-bare": { bundle: { root: fixture.sourceDirectory, entrypoint: "index.html", files: [receipt.output.entries[0]] }, buildReceipt: receiptPath } }; fixture.select(); };
  select();
  assert.ok(fixture.build().projection.runs[0].artifact.playUrl);
  const font = { kind: "vasir-game-font-relocation", inputArtifactHash: fixture.raw.source.sha256, sourceEdited: false, originalEntrypoint: { ...packagedPin, sha256: "b".repeat(64) } };
  receipt.derivations.push(font); select();
  assert.throws(fixture.build, /preceding entrypoint derivation/);
  receipt.derivations.pop();
  const dependencyPin = (name, contents) => { fixture.write(`${directory}/${name}`, contents); return filePin(contents, name); };
  const stylesheet = dependencyPin("font.css", "/* explicit synthetic captured stylesheet */");
  const license = dependencyPin("license.txt", "Explicit synthetic license fixture.");
  const fontBytes = dependencyPin("font.woff2", "wOF2 explicit synthetic font fixture");
  const manifest = JSON.stringify({ kind: "vasir-game-font-dependencies", schemaVersion: 1, inputArtifactHash: fixture.raw.source.sha256, stylesheet, license, fonts: [fontBytes] });
  fixture.write(`${directory}/manifest.json`, manifest);
  Object.assign(font, { originalEntrypoint: packagedPin, packagedEntrypoint: packagedPin, dependencyManifest: filePin(manifest, `${directory}/manifest.json`), originalStylesheet: stylesheet, additions: [] });
  const correctionSnapshot = `${directory}/before-correction.html`;
  fixture.write(correctionSnapshot, relocated);
  const correctedAnchor = to.replace('href="./"', 'href="./index.html"');
  const corrected = relocated.replace(to, correctedAnchor), correctedPin = filePin(corrected);
  const correction = { ...derivation, originalBuiltEntrypoint: packagedPin, originalBuiltEntrypointSnapshot: { ...packagedPin, path: correctionSnapshot }, packagedEntrypoint: correctedPin, rewrites: [{ file: "index.html", from: to, to: correctedAnchor, occurrences: 1 }] };
  receipt.derivations.push(font, correction);
  receipt.output.entries = [{ ...correctedPin, type: "file" }]; fixture.write(`${fixture.sourceDirectory}/index.html`, corrected); select();
  assert.ok(fixture.build().projection.runs[0].artifact.playUrl);
  receipt.derivations.splice(1);
  const changed = `${relocated}<script>repairGame()</script>`;
  derivation.packagedEntrypoint = filePin(changed);
  receipt.output.entries = [{ ...derivation.packagedEntrypoint, type: "file" }];
  fixture.write(`${fixture.sourceDirectory}/index.html`, changed); select();
  assert.throws(fixture.build, /additional HTML change/);
});

test("Games projection extends the existing published evidence without changing its scores", t => {
  const fixture = setup(t);
  for (const name of ["capability-taxonomy.json", "public-results.json", "hyper-scale-chat", "personalized-home-feed", "device-telemetry", "work-spec-chat"]) {
    fs.symlinkSync(path.join(REPO_ROOT, "benchmarks", name), path.join(fixture.root, "benchmarks", name));
  }
  for (const name of ["hyper-scale-chat", "personalized-home-feed", "device-telemetry", "work-spec-chat"]) {
    fs.symlinkSync(path.join(REPO_ROOT, ".agents/vasir-evals", name), path.join(fixture.root, ".agents/vasir-evals", name));
  }
  fs.symlinkSync(path.join(REPO_ROOT, "tmp"), path.join(fixture.root, "tmp"));
  const before = buildBenchmarkPublicationProjection({ repoRootDirectory: REPO_ROOT });
  const after = buildBenchmarkPublicationProjection({ repoRootDirectory: fixture.root });
  assert.deepEqual(after.projection.benchmarkResults, before.projection.benchmarkResults);
  assert.deepEqual(after.projection.overall, before.projection.overall);
  assert.deepEqual(after.responseBundle, before.responseBundle);
  assert.equal(after.projection.games.runs[0].score.value, 75);
  assert.equal(after.projection.schemaVersion, 5);
  assert.ok(after.routes.entrypoints.includes("/games.html"));
  assert.equal(after.artifactFiles.length, 1);
});

test("Public Games URLs cannot use the site origin or another artifact host", t => {
  const fixture = setup(t);
  for (const url of ["https://vasirbenchmark.com/artifacts/a/index.html", "https://other.example/game.html", `${GAME_ARTIFACT_ORIGIN}/artifacts/${"a".repeat(64)}/index.html?next=elsewhere`]) {
    const projection = fixture.build().projection;
    projection.runs[0].artifact.playUrl = url;
    assert.throws(() => validateGamesPublication(projection), /isolated immutable artifact origin/);
  }
});

test("Publication storage accounting includes newly staged artifacts and reuses existing digest keys", () => {
  const artifact = { releaseId: "a".repeat(64), files: [{ path: "index.html", bytes: 100 }], artifactFiles: [{ key: `artifacts/${"b".repeat(64)}/index.html`, bytes: 200 }], publicManifest: {} };
  const empty = calculateProjectedPublicationBytes({ listing: { versions: [] }, artifact });
  assert.equal(empty.candidateBytes, 300 + Buffer.byteLength("{}\n"));
  const reused = calculateProjectedPublicationBytes({ listing: { versions: [{ Key: artifact.artifactFiles[0].key, Size: 200, IsLatest: true }] }, artifact });
  assert.equal(reused.candidateBytes, 100 + Buffer.byteLength("{}\n"));
  assert.equal(reused.physicalBytes, 200);
});

test("Deployed route functions isolate artifacts, including encoded/default-behavior requests", () => {
  const template = fs.readFileSync(path.join(REPO_ROOT, "site/vasirbenchmark.com/infra/production.yml"), "utf8");
  const execute = (resource, uri, host) => {
    const source = template.split(`  ${resource}:`)[1].split("      FunctionCode:")[1].split("      FunctionConfig:")[0].split("\n").slice(1).map(line => line.replace(/^        /, "")).join("\n").replaceAll("${ActiveReleaseId}", "a".repeat(64));
    const context = vm.createContext({});
    vm.runInContext(source, context);
    return context.handler({ request: { uri, headers: { host: { value: host } } } });
  };
  const key = `/artifacts/${"b".repeat(64)}/index.html`;
  assert.equal(execute("GameArtifactOriginGuard", key, new URL(GAME_ARTIFACT_ORIGIN).hostname).uri, key);
  assert.equal(execute("GameArtifactOriginGuard", key, "vasirbenchmark.com").statusCode, 403);
  for (const uri of [key, key.replace("artifacts", "%61rtifacts"), "/_deploy/control/publish-lock.json", `/releases/${"a".repeat(64)}/../${key}`]) assert.equal(execute("ReleaseRouterFunction", uri, "vasirbenchmark.com").statusCode, 403);
  assert.equal(execute("ReleaseRouterFunction", "/games.html", "vasirbenchmark.com").uri, `/releases/${"a".repeat(64)}/games.html`);
  assert.match(template, /sandbox allow-scripts allow-same-origin/);
  assert.match(template, /worker-src 'none'/);
});

test('Designated Astra Ultra assessment keeps its artifact, provenance and rating when shown beside a fresh bare output', t => {
  const fixture = setup(t), before = fixture.build().projection.runs;
  const directory = '.agents/vasir-evals/2d-jumping-demo/reference-test';
  const pin = relative => { const bytes = fs.readFileSync(path.join(fixture.root, relative)); return { path: relative, bytes: bytes.length, sha256: hash(bytes) }; };
  const originalPath = `${directory}/reference.json`, selectionPath = `${directory}/selection.json`, planPath = `${directory}/plan.json`;
  const original = { id: 'historical-artifact', label: 'Original unscored reference', provenance: 'Historical human-directed example.', bundle: { root: fixture.sourceDirectory, entrypoint: 'index.html', files: [{ path: 'index.html', bytes: Buffer.byteLength(fixture.game), sha256: hash(fixture.game) }] }, video: null, poster: null, width: 390, height: 844 };
  fixture.writeJson(originalPath, original);
  const originalPin = pin(originalPath);
  const seats = RUBRIC.judges.map((judgeId, index) => ({ id: `reference-seat-${index}`, judgeId, history: path.join(fixture.root, directory, `seat-${index}`), mappings: [{ rowId: original.id, artifactHash: originalPin.sha256, id: 'A' }] }));
  const plan = { kind: 'vasir-game-judge-plan', executionEligible: true, reviewRunId: 'a'.repeat(32), timeoutMs: 1200000, seats };
  fixture.writeJson(planPath, plan);
  const assessments = seats.map((seat, index) => {
    const relative = `${directory}/seat-${index}/assessment.json`, assessment = JSON.parse(fs.readFileSync(path.join(fixture.root, fixture.judgments[index])));
    assessment.artifactHash = originalPin.sha256;
    fixture.writeJson(relative, assessment);
    const resultPath = `${directory}/seat-${index}/result.json`;
    fixture.writeJson(resultPath, { kind: 'vasir-game-judge-result', reviewRunId: plan.reviewRunId, judgeId: seat.judgeId, status: 'completed', outputs: [{ rowId: original.id, path: path.join(fixture.root, relative), sha256: pin(relative).sha256 }] });
    return { assessment: pin(relative), reviewPlan: pin(planPath), result: pin(resultPath), seatId: seat.id };
  });
  const selection = { kind: 'vasir-game-reference-review-selection', schemaVersion: 1, referenceId: original.id, referenceManifest: originalPin, configuration: { id: 'codex:gpt-6-astra@ultra', label: 'GPT-6 Astra', reasoning: 'ultra' }, authorship: 'human-directed', label: 'Ash & Echo', provenance: 'Human-directed historical artifact; not a fresh single-prompt run.', assessments, reviewOutcomes: assessments.map(({ assessment, ...companion }) => companion) };
  fixture.input.referencePath = originalPath; fixture.input.referenceReviewSelectionPath = selectionPath;
  const select = () => { fixture.writeJson(selectionPath, selection); fixture.select(); };
  select();
  let data = fixture.build().projection;
  assert.deepEqual(data.runs, before); assert.equal(data.configurations.length, 1);
  assert.equal(data.reference.configuration.id, 'codex:gpt-6-astra@ultra'); assert.equal(data.reference.score.value, 75);
  assert.equal(data.reference.status, 'reference'); assert.deepEqual(data.reference.judgments.map(value => value.score), [50, 100]);
  assert.equal(pin(originalPath).sha256, originalPin.sha256);
  const reference = data.reference;
  fixture.input.referenceAsRun = true;
  select();
  assert.throws(fixture.build, /fresh bare configuration/);
  const extraPath = `${directory}/new-bare-run.json`;
  fixture.writeJson(extraPath, { benchmark: '2d-jumping-demo', prompt: RUBRIC.task, rows: [{ ...fixture.raw, rowId: 'ultra-bare', configuration: { ...selection.configuration, model: 'gpt-6-astra' } }] });
  fixture.input.additionalRunPaths = [extraPath];
  fixture.input.conditions.push({ id: 'vasir', label: 'With Vasir' });
  select();
  data = fixture.build().projection;
  assert.equal(data.reference, null);
  assert.equal(data.runs.length, 3);
  assert.deepEqual(data.runs[0], before[0]);
  const ultra = data.runs.find(row => row.id === original.id);
  assert.equal(ultra.configurationId, 'codex:gpt-6-astra@ultra');
  assert.equal(ultra.conditionId, 'vasir');
  assert.deepEqual(ultra.score, reference.score);
  assert.deepEqual(ultra.artifact, reference.artifact);
  assert.equal(ultra.provenance, reference.provenance);
  assert.equal(ultra.metrics.durationMs, null);
  assert.equal(data.configurations.find(item => item.id === ultra.configurationId).comparison.controlled, false);
  assert.equal(pin(originalPath).sha256, originalPin.sha256);
  fixture.input.referenceAsRun = false;
  selection.assessments.pop();
  const failed = { kind: 'vasir-game-judge-result', reviewRunId: plan.reviewRunId, judgeId: seats[1].judgeId, status: 'failed', elapsedMs: 1200001, exitCode: 143, timedOut: true };
  fixture.writeJson(`${directory}/seat-1/result.json`, failed);
  selection.reviewOutcomes[1].result = pin(`${directory}/seat-1/result.json`); select();
  data = fixture.build().projection;
  assert.equal(data.reference.score, null); assert.equal(data.reference.judgments.length, 1);
  assert.match(data.reference.qualityStatus, /incomplete/);
  fixture.writeJson(originalPath, { ...original, provenance: 'Changed original historical evidence.' });
  assert.throws(fixture.build, /digest or size changed/);
});
