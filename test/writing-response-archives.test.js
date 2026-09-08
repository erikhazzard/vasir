import assert from "node:assert/strict";
import test from "node:test";
import { splitWritingResponseArchives, hydrateWritingResponseArchives, WRITING_CREATION_ARCHIVE } from "../cli/eval/writing-response-archives.js";

test("creation archives split losslessly without changing older evidence or the input", () => {
  const source = { responses: [{ outputText: "Original core answer" }], benchmarkResponses: [
    { benchmarkId: "storytelling-plot-twists", responseBundle: { responses: ["Original twist"] } },
    { benchmarkId: WRITING_CREATION_ARCHIVE.benchmarkId, responseBundle: { responses: ["Original new outline"], judgeRequests: ["Exact review"] } }
  ], additionalBenchmarks: { dm: { responses: ["Original adventure"] } } };
  const before = structuredClone(source);
  const split = splitWritingResponseArchives(source);
  assert.deepEqual(source, before);
  assert.deepEqual(split.primary.responses, source.responses);
  assert.deepEqual(split.primary.benchmarkResponses[0], source.benchmarkResponses[0]);
  assert.deepEqual(split.primary.additionalBenchmarks, source.additionalBenchmarks);
  assert.equal(split.primary.benchmarkResponses[1].responseBundle, undefined);
  assert.deepEqual(hydrateWritingResponseArchives(split.primary, split.creation), source);
  assert.throws(() => hydrateWritingResponseArchives(split.primary, null), /missing/);
  split.primary.benchmarkResponses[1].archive.href = "https://other.example/archive.js";
  assert.throws(() => hydrateWritingResponseArchives(split.primary, split.creation), /descriptor/);
});

test("unselected archive stays null and existing collections remain byte-identical", () => {
  assert.deepEqual(splitWritingResponseArchives(null), { primary: null, creation: null });
  const original = { responses: [{ outputText: "kept" }] };
  assert.equal(JSON.stringify(splitWritingResponseArchives(original).primary), JSON.stringify(original));
  assert.deepEqual(hydrateWritingResponseArchives(original, null), original);
  assert.throws(() => hydrateWritingResponseArchives(null, {}), /Unselected/);
  assert.throws(() => hydrateWritingResponseArchives(original, {}), /Unselected/);
});
