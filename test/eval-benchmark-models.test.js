import assert from "node:assert/strict";
import test from "node:test";

import {
  getDefaultBenchmarkConfigurationCount,
  resolveBenchmarkConfiguration,
  resolveBenchmarkConfigurations
} from "../cli/eval/benchmark-models.js";

test("default benchmark matrix preserves every advertised model and reasoning tuple", () => {
  const configurations = resolveBenchmarkConfigurations();
  assert.equal(configurations.length, 36);
  assert.equal(getDefaultBenchmarkConfigurationCount(), 36);
  assert.ok(configurations.some((entry) => entry.id === "codex:gpt-6-astra@ultra"));
  assert.ok(configurations.some((entry) => entry.id === "codex:gpt-5.6-sol@ultra"));
  assert.ok(configurations.some((entry) => entry.id === "claude:opus@max"));
  assert.ok(configurations.some((entry) => entry.id === "claude:claude-fable-5-1@ultracode"));
  assert.ok(!configurations.some((entry) => entry.id === "claude:opus@ultra"));
});

test("explicit model and reasoning filters produce distinct visible configurations", () => {
  assert.deepEqual(
    resolveBenchmarkConfigurations({
      requestedModelArguments: ["sol", "claude:fable"],
      requestedReasoningArguments: ["xhigh", "max"]
    }).map((entry) => entry.id),
    [
      "codex:gpt-5.6-sol@xhigh",
      "codex:gpt-5.6-sol@max",
      "claude:fable@xhigh",
      "claude:fable@max"
    ]
  );
});

test("Fable 5.1 keeps an immutable model identity and exactly three visible modes", () => {
  assert.deepEqual(
    resolveBenchmarkConfigurations({
      requestedModelArguments: ["fable-5.1"]
    }),
    [
      {
        id: "claude:claude-fable-5-1@xhigh",
        provider: "claude",
        model: "claude-fable-5-1",
        reasoning: "xhigh"
      },
      {
        id: "claude:claude-fable-5-1@max",
        provider: "claude",
        model: "claude-fable-5-1",
        reasoning: "max"
      },
      {
        id: "claude:claude-fable-5-1@ultracode",
        provider: "claude",
        model: "claude-fable-5-1",
        reasoning: "ultracode"
      }
    ]
  );
  assert.equal(
    resolveBenchmarkConfiguration("claude:claude-fable-5-1@ultracode").id,
    "claude:claude-fable-5-1@ultracode"
  );
  assert.equal(
    resolveBenchmarkConfigurations({
      requestedModelArguments: ["fable"],
      requestedReasoningArguments: ["xhigh"]
    })[0].id,
    "claude:fable@xhigh"
  );
  assert.throws(
    () => resolveBenchmarkConfiguration("claude:claude-fable-5-1@high"),
    (error) => error.code === "EVAL_BENCHMARK_REASONING_UNSUPPORTED"
  );
});
