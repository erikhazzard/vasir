import test from "node:test";
import assert from "node:assert/strict";

import { generateEvalResponse } from "../eval/providers.js";

test("live provider requests time out with a structured eval error", async () => {
  await assert.rejects(
    () =>
      generateEvalResponse({
        modelDescriptor: {
          id: "openai:gpt-5.4",
          provider: "openai",
          model: "gpt-5.4"
        },
        systemPrompt: "system",
        userPrompt: "user",
        environmentVariables: {
          OPENAI_API_KEY: "sk-test"
        },
        requestTimeoutMs: 1,
        fetchImplementation: async () => new Promise(() => {})
      }),
    (error) => {
      assert.equal(error.code, "EVAL_PROVIDER_TIMEOUT");
      return true;
    }
  );
});
