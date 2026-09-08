import assert from "node:assert/strict";
import test from "node:test";
import { writingParentPathScanSource } from "../cli/benchmark-publication-artifact.js";

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
