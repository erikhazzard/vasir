import assert from "node:assert/strict";
import test from "node:test";
import { isCreationOperationalRetry } from "../cli/eval/run-storytelling-creation.js";

test("creation retries operational failures only, never returned answers or policy rejections", () => {
  assert.equal(isCreationOperationalRetry({ error: { code: "EVAL_AGENT_TIMEOUT", message: "Timed out" } }), true);
  assert.equal(isCreationOperationalRetry({ error: { code: "EVAL_CREATION_QUOTA_CIRCUIT_OPEN" } }), true);
  assert.equal(isCreationOperationalRetry({ error: { code: "EVAL_AGENT_RUNTIME_FAILED", message: "API Error: 429 session limit" } }), true);
  assert.equal(isCreationOperationalRetry({ outputText: "A weak but usable outline", error: { code: "EVAL_AGENT_TIMEOUT" } }), false);
  assert.equal(isCreationOperationalRetry({ error: { code: "EVAL_AGENT_RUNTIME_FAILED", message: "API Error: 400 output filter; retry later" } }), false);
  assert.equal(isCreationOperationalRetry({ error: { code: "EVAL_AGENT_RUNTIME_FAILED", message: "Unparseable result" } }), false);
});
