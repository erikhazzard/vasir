import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import vm from "node:vm";

import { serializeWritingModule } from "../cli/eval/writing-publication.js";
import { encodeWritingCreationResponseArchive, hydrateWritingCreationResponseArchive, serializeWritingCreationResponseArchive } from "../cli/eval/writing-response-archives.js";

const hash = text => crypto.createHash("sha256").update(text).digest("hex");
const id = "storytelling-magic-discovery";
const dimensions = ["discovery-premise", "magic-coherence", "desire-and-stakes", "character-agency", "causal-progression", "resistance-and-relationships", "originality-and-specificity", "thematic-consequences", "earned-ending", "synopsis-clarity"];
function fixture() {
  const judgeProfiles = ["astra", "sol"].flatMap(model => ["naive", "informed"].map(contextMode => ({
    id: `${model}-xhigh-${contextMode}`, configurationId: `codex:gpt-${model}@xhigh`, contextMode, contextSha256: hash(contextMode === "naive" ? "" : "Frozen full context.")
  })));
  const archive = { kind: "vasirbenchmark-writing-responses", schemaVersion: 1, judgeProfiles,
    promptFiles: [{ id: "frozen-context", content: "Exact frozen context.\n", sha256: hash("Exact frozen context.\n") }],
    judgePromptSegments: [{ sha256: hash("Exact prompt part."), content: "Exact prompt part." }], judgeRequests: [], responses: [] };
  for (const trialNumber of [1, 2, 3]) {
    const responses = ["baseline", "skill"].map(condition => {
      const outputText = `Original ${condition} outline, trial ${trialNumber}: 世界, café, 🌍.\n  Exact spaces and \"quotes\".\n</script><script>window.injected=true</script>\u2028\u2029\ud800`;
      return { benchmarkId: id, caseId: "magic-discovery", trialNumber, condition, outputText,
        provenance: { outputSha256: hash(outputText) }, judgments: [] };
    });
    for (const [seat, profile] of judgeProfiles.entries()) {
      const candidates = seat % 2 ? [...responses].reverse() : responses;
      const original = { evaluations: candidates.map((_response, candidateIndex) => ({
        candidateId: candidateIndex ? "B" : "A", dimensions: dimensions.map((dimensionId, dimensionIndex) => ({
          id: dimensionId, rating: 1 + (seat + trialNumber + dimensionIndex) % 10,
          evidence: `Specific ${dimensionId} story evidence—世界, \"magic\". `.repeat(5)
        })), review: `Exact ${profile.contextMode} overall review.\nThe ending follows the original choice. `.repeat(8)
      })), winner: null };
      const outputText = ` ${JSON.stringify(original, null, 2)}\n`;
      const promptSha256 = hash(`Original ${profile.id} prompt, trial ${trialNumber}.`), requestId = `${profile.id}:${promptSha256}`;
      const request = { id: requestId, profileId: profile.id, status: "complete", disposition: "complete", failureReason: null,
        promptSha256, promptParts: [{ textSha256: archive.judgePromptSegments[0].sha256 }],
        candidateOrder: candidates.map((response, index) => ({ candidateId: index ? "B" : "A", outputSha256: response.provenance.outputSha256 })),
        outputText, outputSha256: hash(outputText) };
      archive.judgeRequests.push(request);
      for (const [candidateIndex, response] of candidates.entries()) {
        const candidate = original.evaluations[candidateIndex];
        response.judgments.push({ reviewerId: profile.id, profileId: profile.id, judgeLabel: `${profile.id} label`,
          judgeConfigurationId: profile.configurationId, contextMode: profile.contextMode, contextSha256: profile.contextSha256,
          requestId, candidateId: candidate.candidateId, promptSha256, answerSha256: request.outputSha256,
          score: candidate.dimensions.reduce((sum, dimension) => sum + dimension.rating, 0),
          dimensions: Object.fromEntries(candidate.dimensions.map(d => [d.id, { rating: d.rating, reason: null, evidence: d.evidence }])),
          rationale: candidate.review, resources: { scope: "shared-matched-pair-batch", usage: { inputTokens: 19000, outputTokens: 2200 } } });
      }
    }
    archive.responses.push(...responses);
  }
  // Invalid final JSON and not-yet-returned requests remain byte-exact and do not
  // acquire a readable review or an imputed score during hydration.
  for (const [status, outputText] of [["error", "Exact invalid original final.\n"], ["running", null]]) {
    const profile = judgeProfiles[0], promptSha256 = hash(`${status} request`);
    archive.judgeRequests.push({ id: `${profile.id}:${promptSha256}`, profileId: profile.id, promptSha256,
      status, candidateOrder: archive.judgeRequests[0].candidateOrder, outputText, outputSha256: outputText === null ? null : hash(outputText) });
  }
  return archive;
}

test("creation review references losslessly restore three trials, four seats, exact JSON and all metadata", () => {
  const original = fixture(), before = structuredClone(original);
  const wire = encodeWritingCreationResponseArchive(original);
  assert.deepEqual(original, before);
  assert.ok(wire.archive.responses.every(response => response.judgments.every(judge => !Object.hasOwn(judge, "dimensions") && !Object.hasOwn(judge, "rationale"))));
  assert.deepEqual(wire.archive.judgeRequests, original.judgeRequests);
  assert.deepEqual(wire.archive.promptFiles, original.promptFiles);
  assert.deepEqual(wire.archive.judgePromptSegments, original.judgePromptSegments);
  const encodedBefore = structuredClone(wire);
  assert.deepEqual(hydrateWritingCreationResponseArchive(wire), original);
  assert.deepEqual(wire, encodedBefore);
  assert.ok(Buffer.byteLength(JSON.stringify(wire)) < Buffer.byteLength(JSON.stringify(original)) * 0.75);
});

test("serialized creation script hydrates the complete global synchronously without dynamic code or network", () => {
  const original = fixture(), source = serializeWritingModule(original, "VASIR_WRITING_CREATION_RESPONSES");
  const context = vm.createContext({ window: {} }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(source, context, { timeout: 2000 });
  const restored = context.window.VASIR_WRITING_CREATION_RESPONSES;
  assert.ok(Object.isFrozen(restored));
  assert.deepEqual(JSON.parse(JSON.stringify(restored)), original);
  assert.equal(context.window.injected, undefined);
  assert.ok(!source.includes("</script>"));
  assert.ok(!/[\u2028\u2029]/u.test(source));
  assert.ok(!/\beval\s*\(|new\s+Function\b|\bfetch\s*\(|\bimport\s*\(/u.test(source));
  assert.equal(source, serializeWritingCreationResponseArchive(original));
  for (const request of restored.judgeRequests.filter(request => request.outputText !== null)) assert.equal(hash(request.outputText), request.outputSha256);
});

test("encoding rejects changed original bytes or any non-reconstructible readable review", async t => {
  for (const [label, mutate] of [
    ["original final hash", archive => { archive.judgeRequests[0].outputText += " "; }],
    ["readable evidence", archive => { archive.responses[0].judgments[0].dimensions[dimensions[0]].evidence += " altered"; }],
    ["readable overall review", archive => { archive.responses[0].judgments[0].rationale += " altered"; }],
    ["extra dimension metadata", archive => { archive.responses[0].judgments[0].dimensions[dimensions[0]].extra = "cannot discard"; }],
    ["non-null reason", archive => { archive.responses[0].judgments[0].dimensions[dimensions[0]].reason = "cannot discard"; }],
    ["request hash join", archive => { archive.responses[0].judgments[0].answerSha256 = "f".repeat(64); }],
    ["wrong total", archive => { archive.responses[0].judgments[0].score += 1; }]
  ]) await t.test(label, () => {
    const archive = fixture(); mutate(archive);
    assert.throws(() => encodeWritingCreationResponseArchive(archive), /Creation /);
  });
});

test("hydration rejects substituted request, profile, candidate and dimension joins", async t => {
  for (const [label, mutate] of [
    ["unknown encoding", wire => { wire.schemaVersion = 2; }],
    ["duplicate request", wire => { wire.archive.judgeRequests.push(wire.archive.judgeRequests[0]); }],
    ["missing request", wire => { wire.archive.judgeRequests.shift(); }],
    ["profile context", wire => { wire.archive.judgeProfiles[0].contextMode = "informed"; }],
    ["wrong candidate", wire => { wire.archive.responses[0].judgments[0].candidateId = "B"; }],
    ["wrong answer hash", wire => { wire.archive.responses[0].provenance.outputSha256 = "f".repeat(64); }],
    ["duplicate seat", wire => { wire.archive.responses[0].judgments.push(wire.archive.responses[0].judgments[0]); }],
    ["smuggled readable review", wire => { wire.archive.responses[0].judgments[0].rationale = "replacement"; }],
    ["unparseable complete original", wire => { wire.archive.judgeRequests[0].outputText = "not JSON"; }],
    ["duplicate dimension", wire => { const request = wire.archive.judgeRequests[0], original = JSON.parse(request.outputText); original.evaluations[0].dimensions[1].id = original.evaluations[0].dimensions[0].id; request.outputText = JSON.stringify(original); }]
  ]) await t.test(label, () => {
    const wire = encodeWritingCreationResponseArchive(fixture()); mutate(wire);
    assert.throws(() => hydrateWritingCreationResponseArchive(wire), /Creation review archive/);
  });
});

test("legacy modules and the absent creation placeholder retain their exact serialization", () => {
  const original = { responses: [{ outputText: "Untouched prior answer <text>.\u2028" }] };
  const legacy = (value, name) => `(function () { 'use strict'; window.${name} = Object.freeze(${JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029")}); }());\n`;
  for (const name of ["VASIR_WRITING", "VASIR_WRITING_RESPONSES"]) assert.equal(serializeWritingModule(original, name), legacy(original, name));
  assert.equal(serializeWritingModule(null, "VASIR_WRITING_CREATION_RESPONSES"), legacy(null, "VASIR_WRITING_CREATION_RESPONSES"));
  assert.equal(encodeWritingCreationResponseArchive(null), null);
  assert.equal(hydrateWritingCreationResponseArchive(null), null);
});
