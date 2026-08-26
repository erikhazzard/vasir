import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";

import { runBenchmarkAgent } from "../cli/eval/agent-runtime.js";

function createSpawnStub({ stdout, stderr = "", exitCode = 0 }) {
  return (_command, _arguments, _options) => {
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.stdin = new PassThrough();
    child.kill = () => {};
    queueMicrotask(() => {
      child.stdout.end(stdout);
      child.stderr.end(stderr);
      child.emit("close", exitCode, null);
    });
    return child;
  };
}

test("fresh Codex runtime captures final output, reasoning configuration, and usage", async () => {
  let capturedArguments = [];
  const spawnStub = (command, commandArguments, options) => {
    capturedArguments = commandArguments;
    return createSpawnStub({
      stdout: `${JSON.stringify({ type: "thread.started", thread_id: "thread-1" })}
${JSON.stringify({
  type: "item.completed",
  item: { type: "agent_message", text: "Use a partitioned authority." }
})}
${JSON.stringify({
  type: "turn.completed",
  usage: { input_tokens: 10, cached_input_tokens: 4, output_tokens: 8 }
})}`
    })(command, commandArguments, options);
  };

  const result = await runBenchmarkAgent({
    configuration: {
      id: "codex:gpt-5.6-sol@max",
      provider: "codex",
      model: "gpt-5.6-sol",
      reasoning: "max"
    },
    promptText: "Architect it.",
    spawnImplementation: spawnStub
  });

  assert.equal(result.text, "Use a partitioned authority.");
  assert.equal(result.usage.totalTokens, 18);
  assert.equal(result.runtimeReceipt.freshSession, true);
  assert.ok(capturedArguments.includes("gpt-5.6-sol"));
  assert.ok(capturedArguments.includes('model_reasoning_effort="max"'));
  assert.ok(capturedArguments.includes("--ephemeral"));
});

test("fresh Claude runtime captures output, model receipt, usage, and attributable cost", async () => {
  const result = await runBenchmarkAgent({
    configuration: {
      id: "claude:opus@xhigh",
      provider: "claude",
      model: "opus",
      reasoning: "xhigh"
    },
    promptText: "Architect it.",
    spawnImplementation: createSpawnStub({
      stdout: JSON.stringify({
        is_error: false,
        result: "Keep one authority.",
        session_id: "session-1",
        total_cost_usd: 0.12,
        usage: {
          input_tokens: 20,
          cache_creation_input_tokens: 30,
          cache_read_input_tokens: 40,
          output_tokens: 10
        },
        modelUsage: {
          opus: { canonicalModel: "claude-opus-5" }
        }
      })
    })
  });

  assert.equal(result.text, "Keep one authority.");
  assert.equal(result.usage.totalTokens, 100);
  assert.equal(result.costUsd, 0.12);
  assert.deepEqual(result.runtimeReceipt.canonicalModels, ["claude-opus-5"]);
});

test("a wrapper that converts SIGTERM to exit 143 still reports the harness timeout", async () => {
  const spawnStub = () => {
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.stdin = new PassThrough();
    child.kill = () => queueMicrotask(() => child.emit("close", 143, null));
    return child;
  };

  await assert.rejects(
    runBenchmarkAgent({
      configuration: {
        id: "claude:opus@max",
        provider: "claude",
        model: "opus",
        reasoning: "max"
      },
      promptText: "Judge it.",
      timeoutMs: 1,
      spawnImplementation: spawnStub
    }),
    (error) => error.code === "EVAL_AGENT_RUNTIME_FAILED" && /timed out/.test(error.message)
  );
});
