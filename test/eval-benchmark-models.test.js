import assert from "node:assert/strict";
import test from "node:test";

import {
  getDefaultBenchmarkConfigurationCount,
  resolveBenchmarkConfigurations
} from "../cli/eval/benchmark-models.js";

test("default benchmark matrix preserves every advertised model and reasoning tuple", () => {
  const configurations = resolveBenchmarkConfigurations();
  assert.equal(configurations.length, 27);
  assert.equal(getDefaultBenchmarkConfigurationCount(), 27);
  assert.ok(configurations.some((entry) => entry.id === "codex:gpt-5.6-sol@ultra"));
  assert.ok(configurations.some((entry) => entry.id === "claude:opus@max"));
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

