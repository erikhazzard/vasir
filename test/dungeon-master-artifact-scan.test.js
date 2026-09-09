import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { writingCreationLocalPathScanSource, writingParentPathScanSource } from "../cli/benchmark-publication-artifact.js";
import { serializeWritingModule } from "../cli/eval/writing-publication.js";

const id = "dungeon-master-adventure-outline";
const writing = { additionalBenchmarks: { [id]: { methodology: { skillFiles: [{path:"references/prep.md"},{path:"assets/session.md"}] } } } };
const responses = content => ({ additionalBenchmarks: { [id]: { promptFiles: [{title:"references/prep.md",content}] } } });

test("privacy scan permits only known frozen skill parent links without changing source", () => {
  const value = responses("Use [session](../assets/session.md#starting) for preparation.");
  const before = JSON.stringify(value);
  assert.ok(!writingParentPathScanSource(writing,value).includes("../"));
  assert.equal(JSON.stringify(value),before);
});
test("privacy scan retains unknown destinations, raw paths and other response fields", () => {
  const value = responses("[private](../../evidence/answer.md) and ../assets/session.md");
  value.outputText="[read](../assets/session.md)";
  const scanned=writingParentPathScanSource(writing,value);
  assert.ok(scanned.includes("../../evidence/answer.md"));
  assert.ok(scanned.includes("and ../assets/session.md"));
  assert.ok(scanned.includes('"outputText":"[read](../assets/session.md)"'));
});

const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const drive = /(?:^|[\s"'(=>])[A-Za-z]:[/\\]/u;
const dmArchive = outputText => ({ responses: [{ benchmarkId: id, outputText, provenance: { outputSha256: hash(outputText) } }] });
const moduleSource = archive => serializeWritingModule(archive, "VASIR_WRITING_DUNGEON_MASTER_RESPONSES");

test("DM scan normalizes escaped authored punctuation only in an exact hash-verified answer scan copy", () => {
  const outputText = "What the villagers don't:\n\n<They do not open the door.>\n";
  const archive = dmArchive(outputText), before = structuredClone(archive);
  const source = moduleSource(archive);
  assert.ok(drive.test(source));
  assert.ok(!drive.test(writingCreationLocalPathScanSource(source, archive)));
  assert.deepEqual(archive, before);
  assert.equal(moduleSource(archive), source);
  assert.equal(hash(archive.responses[0].outputText), archive.responses[0].provenance.outputSha256);
  archive.responses[0].provenance.outputSha256 = "f".repeat(64);
  assert.equal(writingCreationLocalPathScanSource(source, archive), source);
});

test("DM scan preserves true private paths, literal backslashes, reviews and unrelated source for rejection", () => {
  for (const privatePath of ["'C:\\private\\answer.txt'", "C:/private/answer.txt", ".agents/private", "vasir-evals/private", "file:///private/answer.txt", "/Users/private/answer.txt", "../private/answer.txt"]) {
    const outputText = `What the villagers don't:\n${privatePath}\n`;
    const archive = dmArchive(outputText);
    const review = "Reviewer says 'C:\\private\\review.txt'";
    archive.responses[0].judgments = [{ rationale: review }];
    const source = moduleSource(archive);
    const scanned = writingCreationLocalPathScanSource(source, archive);
    assert.ok(scanned.includes(JSON.stringify(privatePath).slice(1, -1)), privatePath);
    assert.ok(scanned.includes(JSON.stringify(review)));
    assert.equal(archive.responses[0].outputText, outputText);
  }
  const archive = dmArchive("What the villagers don't:\\n");
  const source = moduleSource(archive);
  assert.equal(writingCreationLocalPathScanSource(source, archive), source);
  const otherSource = "const privatePath = 'C:\\private\\code.txt';";
  assert.ok(writingCreationLocalPathScanSource(otherSource + source, archive).startsWith(otherSource));
});
