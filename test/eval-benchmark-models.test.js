import assert from "node:assert/strict";
import test from "node:test";

import {
  getDefaultBenchmarkConfigurationCount,
  resolveBenchmarkConfiguration,
  resolveBenchmarkConfigurations
} from "../cli/eval/benchmark-models.js";

test("default benchmark matrix preserves every advertised model and reasoning tuple", () => {
  const configurations = resolveBenchmarkConfigurations();
  assert.equal(configurations.length, 39);
  assert.equal(getDefaultBenchmarkConfigurationCount(), 39);
  assert.ok(configurations.some((entry) => entry.id === "codex:gpt-6-astra@ultra"));
  assert.ok(configurations.some((entry) => entry.id === "codex:gpt-5.6-sol@ultra"));
  assert.ok(configurations.some((entry) => entry.id === "claude:opus@max"));
  assert.ok(configurations.some((entry) => entry.id === "claude:claude-fable-5-1@ultracode"));
  assert.ok(!configurations.some((entry) => entry.id === "claude:opus@ultra"));
  assert.ok(!configurations.some((entry) => entry.model === "gpt-6-sol"));
  assert.ok(!configurations.some((entry) => entry.model === "gpt-6-luna"));
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

test("GPT-6 Sol and Luna selectors pin each release's advertised efforts", () => {
  for (const [model, efforts] of [
    ["gpt-6-sol", ["low", "medium", "high", "xhigh", "max", "ultra"]],
    ["gpt-6-luna", ["low", "medium", "high", "xhigh", "max"]]
  ]) {
    assert.deepEqual(
      resolveBenchmarkConfigurations({ requestedModelArguments: [model] }),
      efforts.map((reasoning) => ({
        id: `codex:${model}@${reasoning}`,
        provider: "codex",
        model,
        reasoning
      }))
    );
    assert.deepEqual(
      resolveBenchmarkConfiguration(`codex:${model}@max`),
      resolveBenchmarkConfiguration(`${model}@max`)
    );
  }
  assert.equal(resolveBenchmarkConfiguration("sol@max").model, "gpt-5.6-sol");
  assert.equal(resolveBenchmarkConfiguration("luna@max").model, "gpt-5.6-luna");
});

test("GPT-6 Luna rejects ultra with its supported effort choices", () => {
  assert.throws(
    () => resolveBenchmarkConfiguration("gpt-6-luna@ultra"),
    (error) => error.code === "EVAL_BENCHMARK_REASONING_UNSUPPORTED" &&
      error.message === "codex:gpt-6-luna does not advertise reasoning effort ultra." &&
      error.suggestion === "Use one of: low, medium, high, xhigh, max."
  );
});

test("Opus 5.5 selectors pin its canonical identity and advertised efforts", () => {
  assert.deepEqual(
    resolveBenchmarkConfigurations({ requestedModelArguments: ["opus-5.5"] }),
    ["low", "medium", "high", "xhigh", "max"].map((reasoning) => ({
      id: `claude:claude-opus-5-5@${reasoning}`,
      provider: "claude",
      model: "claude-opus-5-5",
      reasoning
    }))
  );
  assert.deepEqual(
    resolveBenchmarkConfiguration("claude:claude-opus-5-5@max"),
    resolveBenchmarkConfiguration("opus-5.5@max")
  );
  assert.equal(resolveBenchmarkConfiguration("opus@max").model, "opus");
  assert.throws(
    () => resolveBenchmarkConfiguration("opus-5.5@ultracode"),
    (error) => error.code === "EVAL_BENCHMARK_REASONING_UNSUPPORTED"
  );
});

test("Fable 5.1 keeps an immutable model identity across five efforts and ultracode", () => {
  assert.deepEqual(
    resolveBenchmarkConfigurations({
      requestedModelArguments: ["fable-5.1"]
    }),
    [
      ...["low", "medium", "high"].map((reasoning) => ({
        id: `claude:claude-fable-5-1@${reasoning}`,
        provider: "claude",
        model: "claude-fable-5-1",
        reasoning
      })),
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
  assert.equal(resolveBenchmarkConfiguration("claude:claude-fable-5-1@high").reasoning, "high");
  assert.equal(resolveBenchmarkConfiguration("claude:claude-opus-5@low").model, "claude-opus-5");
});
