import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
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

function createUltracodeStream({
  includeInit = true,
  initCount = 1,
  cliVersion = "2.1.257",
  includeToolUse = true,
  toolUseId = "toolu_workflow_1",
  includeStart = true,
  startToolUseId = toolUseId,
  startTaskId = "wlocal123",
  startTaskType = "local_workflow",
  includeNotification = true,
  notificationTaskId = startTaskId,
  notificationToolUseId = toolUseId,
  notificationStatus = "completed",
  notificationUsage = { total_tokens: 144, tool_uses: 3, duration_ms: 900 },
  includeWorkerStart = true,
  includeWorkerTerminal = true,
  workerIndex = 1,
  workerModel = "claude-fable-5-1",
  workerFallbackModel,
  workerIsolation,
  workerCached = false,
  workerTerminalState = "done",
  modelUsage = {
    ancillary: { canonicalModel: "claude-haiku-4-5", outputTokens: 2 },
    primary: { canonicalModel: "claude-fable-5-1", outputTokens: 12 }
  }
} = {}) {
  const events = [];
  for (let initIndex = 0; includeInit && initIndex < initCount; initIndex += 1) {
    events.push({
      type: "system",
      subtype: "init",
      claude_code_version: cliVersion,
      session_id: "session-ultracode",
      model: "claude-fable-5-1"
    });
  }
  if (includeToolUse) {
    events.push({
      type: "assistant",
      parent_tool_use_id: null,
      session_id: "session-ultracode",
      message: {
        content: [{
          type: "tool_use",
          id: toolUseId,
          name: "Workflow",
          input: { prompt: "private workflow input" }
        }]
      }
    });
  }
  if (includeStart) {
    events.push({
      type: "system",
      subtype: "task_started",
      task_id: startTaskId,
      tool_use_id: startToolUseId,
      task_type: startTaskType,
      description: "private workflow description",
      workflow_name: "private-workflow",
      session_id: "session-ultracode"
    });
  }
  const workerProgress = (state) => ({
    type: "system",
    subtype: "task_progress",
    task_id: startTaskId,
    tool_use_id: toolUseId,
    description: "private workflow description",
    session_id: "session-ultracode",
    usage: { total_tokens: 10, tool_uses: 0, duration_ms: 100 },
    workflow_progress: [{
      type: "workflow_agent",
      index: workerIndex,
      agentId: "private-agent-id",
      label: "private worker label",
      promptPreview: "private worker prompt",
      model: workerModel,
      state,
      ...(workerFallbackModel !== undefined
        ? { fallbackModel: workerFallbackModel }
        : {}),
      ...(workerIsolation !== undefined ? { isolation: workerIsolation } : {}),
      ...(workerCached ? { cached: true } : {})
    }]
  });
  if (includeWorkerStart) {
    events.push(workerProgress("start"));
  }
  events.push({
    type: "result",
    subtype: "success",
    is_error: false,
    result: "Workflow launched; waiting for completion.",
    session_id: "session-ultracode",
    total_cost_usd: 0.2,
    usage: { input_tokens: 3, output_tokens: 4 },
    modelUsage: {
      primary: { canonicalModel: "claude-fable-5-1" }
    }
  });
  if (includeNotification) {
    if (includeWorkerTerminal) {
      events.push(workerProgress(workerTerminalState));
    }
    events.push({
      type: "system",
      subtype: "task_notification",
      task_id: notificationTaskId,
      tool_use_id: notificationToolUseId,
      status: notificationStatus,
      output_file: "/private/workflow/output",
      summary: "private workflow summary",
      session_id: "session-ultracode",
      usage: notificationUsage
    });
  }
  events.push({
    type: "result",
    subtype: "success",
    is_error: false,
    result: "Workflow-synthesized answer",
    session_id: "session-ultracode",
    total_cost_usd: 0.8,
    usage: { input_tokens: 5, output_tokens: 12 },
    modelUsage,
    // Claude explicitly excludes Workflow agents from this counter. A zeroed
    // value must neither establish nor disprove Workflow execution.
    subagent_stats: {
      spawned: 0,
      requested: { background: 0, foreground: 0, unset: 0 },
      started_in_background: 0,
      by_type: {},
      max_depth: 0,
      spawned_by_subagents: 0,
      completed: 0,
      failed: 0,
      killed: { parent: 0, user: 0, system: 0 },
      refused: { depth_limit: 0, concurrency_limit: 0, budget: 0 }
    }
  });
  return events.map((event) => JSON.stringify(event)).join("\n");
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
          ancillary: { canonicalModel: "claude-haiku-4-5", outputTokens: 2 },
          opus: { canonicalModel: "claude-opus-5", outputTokens: 10 }
        }
      })
    })
  });

  assert.equal(result.text, "Keep one authority.");
  assert.equal(result.usage.totalTokens, 100);
  assert.equal(result.costUsd, 0.12);
  assert.deepEqual(result.runtimeReceipt.canonicalModels, [
    "claude-haiku-4-5",
    "claude-opus-5"
  ]);
  assert.equal(result.runtimeReceipt.targetCanonicalModel, "claude-opus-5");
  assert.deepEqual(result.runtimeReceipt.allowedCanonicalModels, [
    "claude-opus-5",
    "claude-haiku-4-5"
  ]);
  assert.equal(result.runtimeReceipt.targetCanonicalModelOutputTokens, 10);
  assert.equal(result.runtimeReceipt.requestedReasoning, "xhigh");
  assert.equal(result.runtimeReceipt.effectiveEffort, "xhigh");
  assert.equal(result.runtimeReceipt.workflowModeRequested, false);
  assert.equal(result.runtimeReceipt.workflowExecutionObserved, false);
  assert.equal(result.runtimeReceipt.isolationMode, "safe-mode");
  assert.deepEqual(result.runtimeReceipt.allowedTools, []);
  assert.equal(result.runtimeReceipt.maxBudgetUsd, null);
});

test("Claude benchmark aliases resolve to their expected canonical target models", async () => {
  for (const [model, targetCanonicalModel] of [
    ["fable", "claude-fable-5"],
    ["claude-fable-5-1", "claude-fable-5-1"],
    ["opus", "claude-opus-5"]
  ]) {
    const result = await runBenchmarkAgent({
      configuration: {
        id: `claude:${model}@max`,
        provider: "claude",
        model,
        reasoning: "max"
      },
      promptText: "Judge it.",
      spawnImplementation: createSpawnStub({
        stdout: JSON.stringify({
          is_error: false,
          result: "Rubric-grounded judgment.",
          modelUsage: {
            ancillary: { canonicalModel: "claude-haiku-4-5", outputTokens: 1 },
            target: { canonicalModel: targetCanonicalModel, outputTokens: 8 }
          }
        })
      })
    });

    assert.equal(result.runtimeReceipt.targetCanonicalModel, targetCanonicalModel);
    assert.deepEqual(result.runtimeReceipt.allowedCanonicalModels, [
      targetCanonicalModel,
      "claude-haiku-4-5"
    ]);
    assert.equal(result.runtimeReceipt.targetCanonicalModelOutputTokens, 8);
  }
});

test("Claude Opus alias fails closed when the runtime reports another target model", async () => {
  await assert.rejects(
    runBenchmarkAgent({
      configuration: {
        id: "claude:opus@max",
        provider: "claude",
        model: "opus",
        reasoning: "max"
      },
      promptText: "Judge it.",
      spawnImplementation: createSpawnStub({
        stdout: JSON.stringify({
          is_error: false,
          result: "Wrong-model judgment.",
          modelUsage: {
            target: { canonicalModel: "claude-fable-5-1", outputTokens: 8 }
          }
        })
      })
    }),
    (error) => {
      assert.equal(error.code, "EVAL_AGENT_RUNTIME_FAILED");
      assert.match(error.message, /Opus 5 canonical-model policy/);
      assert.equal(error.context.targetCanonicalModel, "claude-opus-5");
      assert.deepEqual(error.context.observedCanonicalModels, ["claude-fable-5-1"]);
      return true;
    }
  );
});

test("Fable 5.1 native modes keep the exact model, requested effort, and tool isolation", async () => {
  for (const reasoning of ["xhigh", "max"]) {
    let capturedCommand = null;
    let capturedArguments = [];
    let capturedOptions = null;
    const spawnStub = (command, commandArguments, options) => {
      capturedCommand = command;
      capturedArguments = commandArguments;
      capturedOptions = options;
      return createSpawnStub({
        stdout: JSON.stringify({
          is_error: false,
          result: `${reasoning} answer`,
          session_id: `session-${reasoning}`,
          total_cost_usd: 0.2,
          usage: { input_tokens: 4, output_tokens: 6 },
          modelUsage: {
            ancillary: { canonicalModel: "claude-haiku-4-5", outputTokens: 1 },
            primary: { canonicalModel: "claude-fable-5-1", outputTokens: 6 }
          }
        })
      })(command, commandArguments, options);
    };

    const result = await runBenchmarkAgent({
      configuration: {
        id: `claude:claude-fable-5-1@${reasoning}`,
        provider: "claude",
        model: "claude-fable-5-1",
        reasoning
      },
      promptText: "Architect it.",
      environmentVariables: {
        PATH: "/usr/bin",
        CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL: "ambient",
        CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: "ambient",
        CLAUDE_CODE_SUBAGENT_MODEL: "ambient-model",
        CLAUDE_CODE_SUBAGENT_MODEL_FORCE: "ambient"
      },
      spawnImplementation: spawnStub
    });

    assert.equal(capturedCommand, "claude");
    assert.deepEqual(capturedArguments, [
      "--print",
      "--safe-mode",
      "--disable-slash-commands",
      "--tools",
      "",
      "--permission-mode",
      "dontAsk",
      "--model",
      "claude-fable-5-1",
      "--effort",
      reasoning,
      "--no-session-persistence",
      "--output-format",
      "json"
    ]);
    assert.equal(result.runtimeReceipt.requestedReasoning, reasoning);
    assert.equal(result.runtimeReceipt.effectiveEffort, reasoning);
    assert.equal(result.runtimeReceipt.workflowModeRequested, false);
    assert.equal(result.runtimeReceipt.workflowExecutionObserved, false);
    assert.equal(result.runtimeReceipt.workflowWorkerModelPolicy, null);
    assert.equal(result.runtimeReceipt.workflowWorkerModel, null);
    assert.equal(result.runtimeReceipt.isolationMode, "safe-mode");
    assert.deepEqual(result.runtimeReceipt.allowedTools, []);
    assert.equal(result.runtimeReceipt.maxBudgetUsd, null);
    assert.deepEqual(result.runtimeReceipt.canonicalModels, [
      "claude-haiku-4-5",
      "claude-fable-5-1"
    ]);
    assert.equal(
      result.runtimeReceipt.canonicalModelPolicy,
      "target-plus-ancillary-allowlist"
    );
    assert.deepEqual(result.runtimeReceipt.allowedCanonicalModels, [
      "claude-fable-5-1",
      "claude-haiku-4-5"
    ]);
    assert.equal(result.runtimeReceipt.targetCanonicalModelOutputTokens, 6);
    assert.deepEqual(capturedOptions.env, { PATH: "/usr/bin" });
  }
});

test("Fable 5.1 ultracode maps to bounded xhigh Workflow orchestration", async () => {
  let capturedArguments = [];
  let capturedOptions = null;
  const spawnStub = (command, commandArguments, options) => {
    capturedArguments = commandArguments;
    capturedOptions = options;
    return createSpawnStub({
      stdout: createUltracodeStream({ initCount: 2, workerFallbackModel: "" })
    })(command, commandArguments, options);
  };

  const result = await runBenchmarkAgent({
    configuration: {
      id: "claude:claude-fable-5-1@ultracode",
      provider: "claude",
      model: "claude-fable-5-1",
      reasoning: "ultracode"
    },
    promptText: "Architect it.",
    environmentVariables: { PATH: "/usr/bin" },
    spawnImplementation: spawnStub
  });

  assert.equal(result.text, "Workflow-synthesized answer");
  assert.equal(result.costUsd, 0.8);
  assert.deepEqual(capturedArguments, [
    "--print",
    "--restricted",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--tools",
    "Workflow",
    "--allowedTools",
    "Workflow",
    "--permission-mode",
    "dontAsk",
    "--model",
    "claude-fable-5-1",
    "--effort",
    "xhigh",
    "--settings",
    '{"ultracode":true,"workflowSizeGuideline":"small"}',
    "--max-budget-usd",
    "5",
    "--no-session-persistence",
    "--output-format",
    "stream-json",
    "--verbose"
  ]);
  assert.equal(result.runtimeReceipt.requestedReasoning, "ultracode");
  assert.equal(result.runtimeReceipt.effectiveEffort, "xhigh");
  assert.equal(result.runtimeReceipt.workflowModeRequested, true);
  assert.equal(result.runtimeReceipt.workflowExecutionObserved, true);
  assert.equal(result.runtimeReceipt.cliVersion, "2.1.257");
  assert.equal(
    result.runtimeReceipt.workflowWorkerModelPolicy,
    "forced-exact-model"
  );
  assert.equal(
    result.runtimeReceipt.workflowWorkerModel,
    "claude-fable-5-1"
  );
  assert.equal(result.runtimeReceipt.workflowSizeGuideline, "small");
  assert.equal(result.runtimeReceipt.workflowWaitCeilingMs, 900000);
  assert.equal(result.runtimeReceipt.isolationMode, "restricted");
  assert.deepEqual(result.runtimeReceipt.allowedTools, ["Workflow"]);
  assert.equal(result.runtimeReceipt.maxBudgetUsd, 5);
  assert.deepEqual(result.runtimeReceipt.workflowLifecycle, {
    topLevelWorkflowToolUses: 1,
    correlatedWorkflowStarts: 1,
    completedWorkflows: 1,
    unresolvedWorkflowToolUses: 0,
    invalidWorkflowEvents: 0,
    tasks: [{
      toolUseId: "toolu_workflow_1",
      taskId: "wlocal123",
      status: "completed",
      totalTokens: 144,
      toolUses: 3,
      durationMs: 900
    }]
  });
  assert.deepEqual(result.runtimeReceipt.workflowWorkers, {
    progressEventCount: 2,
    distinctWorkers: 1,
    distinctStarted: 1,
    distinctCompleted: 1,
    models: ["claude-fable-5-1"],
    fallbackModels: [],
    fallbackModelEvents: 0,
    missingModelEvents: 0,
    errors: 0,
    remote: 0,
    cached: 0,
    localUncachedCompleted: 1,
    incomplete: 0,
    invalidProgressEvents: 0
  });
  assert.equal(Object.hasOwn(result.runtimeReceipt, "subagentStats"), false);
  assert.doesNotMatch(JSON.stringify(result.runtimeReceipt), /private workflow|private worker|private-agent/);
  assert.deepEqual(capturedOptions.env, {
    PATH: "/usr/bin",
    CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL: "1",
    CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: "900000",
    CLAUDE_CODE_SUBAGENT_MODEL: "claude-fable-5-1",
    CLAUDE_CODE_SUBAGENT_MODEL_FORCE: "1"
  });
  assert.match(capturedOptions.cwd, /vasir-benchmark-agent-/);
  assert.equal(fs.existsSync(capturedOptions.cwd), false);
});

test("Fable 5.1 fails closed when Claude reports a different canonical model", async () => {
  await assert.rejects(
    runBenchmarkAgent({
      configuration: {
        id: "claude:claude-fable-5-1@max",
        provider: "claude",
        model: "claude-fable-5-1",
        reasoning: "max"
      },
      promptText: "Architect it.",
      spawnImplementation: createSpawnStub({
        stdout: JSON.stringify({
          is_error: false,
          result: "Fallback answer",
          session_id: "session-fallback",
          total_cost_usd: 0.1,
          usage: { input_tokens: 3, output_tokens: 4 },
          modelUsage: {
            fallback: { canonicalModel: "claude-fable-5" }
          }
        })
      })
    }),
    (error) => {
      assert.equal(error.code, "EVAL_AGENT_RUNTIME_FAILED");
      assert.match(error.message, /did not satisfy the Fable 5\.1 canonical-model policy/);
      assert.deepEqual(error.context, {
        canonicalModelPolicy: "target-plus-ancillary-allowlist",
        targetCanonicalModel: "claude-fable-5-1",
        allowedCanonicalModels: ["claude-fable-5-1", "claude-haiku-4-5"],
        observedCanonicalModels: ["claude-fable-5"],
        unexpectedCanonicalModels: ["claude-fable-5"],
        modelUsageEntriesWithoutCanonicalModel: 0,
        targetOutputAttributionAvailable: false,
        targetOutputAttributionInvalid: false,
        targetOutputTokens: null
      });
      return true;
    }
  );
});

test("Fable 5.1 native mode rejects mixed canonical model usage", async () => {
  await assert.rejects(
    runBenchmarkAgent({
      configuration: {
        id: "claude:claude-fable-5-1@max",
        provider: "claude",
        model: "claude-fable-5-1",
        reasoning: "max"
      },
      promptText: "Architect it.",
      spawnImplementation: createSpawnStub({
        stdout: JSON.stringify({
          is_error: false,
          result: "Mixed answer",
          modelUsage: {
            primary: { canonicalModel: "claude-fable-5-1" },
            fallback: { canonicalModel: "claude-opus-5" }
          }
        })
      })
    }),
    (error) => {
      assert.equal(error.code, "EVAL_AGENT_RUNTIME_FAILED");
      assert.match(error.message, /did not satisfy the Fable 5\.1 canonical-model policy/);
      assert.deepEqual(error.context.observedCanonicalModels, [
        "claude-fable-5-1",
        "claude-opus-5"
      ]);
      return true;
    }
  );
});

test("Fable 5.1 rejects model-usage entries without canonical identity", async () => {
  await assert.rejects(
    runBenchmarkAgent({
      configuration: {
        id: "claude:claude-fable-5-1@max",
        provider: "claude",
        model: "claude-fable-5-1",
        reasoning: "max"
      },
      promptText: "Architect it.",
      spawnImplementation: createSpawnStub({
        stdout: JSON.stringify({
          is_error: false,
          result: "Unattributed answer",
          modelUsage: {
            primary: { canonicalModel: "claude-fable-5-1" },
            unattributed: { inputTokens: 2, outputTokens: 3 }
          }
        })
      })
    }),
    (error) => {
      assert.equal(error.code, "EVAL_AGENT_RUNTIME_FAILED");
      assert.match(error.message, /did not satisfy the Fable 5\.1 canonical-model policy/);
      assert.deepEqual(error.context, {
        canonicalModelPolicy: "target-plus-ancillary-allowlist",
        targetCanonicalModel: "claude-fable-5-1",
        allowedCanonicalModels: ["claude-fable-5-1", "claude-haiku-4-5"],
        observedCanonicalModels: ["claude-fable-5-1"],
        unexpectedCanonicalModels: [],
        modelUsageEntriesWithoutCanonicalModel: 1,
        targetOutputAttributionAvailable: false,
        targetOutputAttributionInvalid: false,
        targetOutputTokens: null
      });
      return true;
    }
  );
});

test("Fable 5.1 requires positive target output attribution", async () => {
  for (const [label, modelUsage, expected] of [
    [
      "ancillary-only",
      { ancillary: { canonicalModel: "claude-haiku-4-5", outputTokens: 2 } },
      { available: false, tokens: null }
    ],
    [
      "target without output attribution",
      { primary: { canonicalModel: "claude-fable-5-1" } },
      { available: false, tokens: null }
    ],
    [
      "zero target output",
      {
        ancillary: { canonicalModel: "claude-haiku-4-5", outputTokens: 2 },
        primary: { canonicalModel: "claude-fable-5-1", outputTokens: 0 }
      },
      { available: true, tokens: 0 }
    ]
  ]) {
    await assert.rejects(
      runBenchmarkAgent({
        configuration: {
          id: "claude:claude-fable-5-1@xhigh",
          provider: "claude",
          model: "claude-fable-5-1",
          reasoning: "xhigh"
        },
        promptText: "Architect it.",
        spawnImplementation: createSpawnStub({
          stdout: JSON.stringify({
            is_error: false,
            result: "Unproven answer",
            usage: { input_tokens: 3, output_tokens: 4 },
            modelUsage
          })
        })
      }),
      (error) => {
        assert.equal(error.code, "EVAL_AGENT_RUNTIME_FAILED", label);
        assert.match(error.message, /did not satisfy the Fable 5\.1 canonical-model policy/);
        assert.equal(
          error.context.targetOutputAttributionAvailable,
          expected.available,
          label
        );
        assert.equal(error.context.targetOutputTokens, expected.tokens, label);
        return true;
      }
    );
  }
});

test("Fable 5.1 ultracode pins the observable Claude Code Workflow contract", async () => {
  for (const [label, streamOptions, expected] of [
    [
      "missing init",
      { includeInit: false },
      { initEventCount: 0, validInitEventCount: 0, observedVersions: [] }
    ],
    [
      "unsupported old version",
      { cliVersion: "2.1.256" },
      {
        initEventCount: 1,
        validInitEventCount: 1,
        observedVersions: ["2.1.256"]
      }
    ]
  ]) {
    await assert.rejects(
      runBenchmarkAgent({
        configuration: {
          id: "claude:claude-fable-5-1@ultracode",
          provider: "claude",
          model: "claude-fable-5-1",
          reasoning: "ultracode"
        },
        promptText: "Architect it.",
        spawnImplementation: createSpawnStub({
          stdout: createUltracodeStream(streamOptions)
        })
      }),
      (error) => {
        assert.equal(error.code, "EVAL_AGENT_RUNTIME_FAILED", label);
        assert.match(error.message, /did not confirm the supported Ultracode CLI contract/);
        assert.deepEqual(error.context, {
          minimumCliVersion: "2.1.257",
          ...expected
        });
        return true;
      }
    );
  }
});

test("Fable 5.1 ultracode accepts a compatible newer Claude Code patch", async () => {
  const result = await runBenchmarkAgent({
    configuration: {
      id: "claude:claude-fable-5-1@ultracode",
      provider: "claude",
      model: "claude-fable-5-1",
      reasoning: "ultracode"
    },
    promptText: "Architect it.",
    spawnImplementation: createSpawnStub({
      stdout: createUltracodeStream({ cliVersion: "2.1.258" })
    })
  });

  assert.equal(result.runtimeReceipt.cliVersion, "2.1.258");
});

test("Fable 5.1 ultracode rejects unproven, fallback, remote, cached, or incomplete workers", async () => {
  for (const [label, streamOptions, expectedField] of [
    ["missing progress", { includeWorkerStart: false, includeWorkerTerminal: false }, "distinctStarted"],
    ["wrong model", { workerModel: "claude-haiku-4-5" }, "models"],
    ["fallback", { workerFallbackModel: "claude-haiku-4-5" }, "fallbackModelEvents"],
    ["malformed fallback", { workerFallbackModel: { model: "claude-haiku-4-5" } }, "invalidProgressEvents"],
    ["error", { workerTerminalState: "error" }, "errors"],
    ["remote", { workerIsolation: "remote" }, "remote"],
    ["cached", { workerCached: true }, "cached"],
    ["incomplete", { includeWorkerTerminal: false }, "incomplete"]
  ]) {
    await assert.rejects(
      runBenchmarkAgent({
        configuration: {
          id: "claude:claude-fable-5-1@ultracode",
          provider: "claude",
          model: "claude-fable-5-1",
          reasoning: "ultracode"
        },
        promptText: "Architect it.",
        spawnImplementation: createSpawnStub({
          stdout: createUltracodeStream(streamOptions)
        })
      }),
      (error) => {
        assert.equal(error.code, "EVAL_AGENT_RUNTIME_FAILED", label);
        assert.match(error.message, /did not prove exact local Fable 5\.1 Workflow workers/);
        if (expectedField === "models") {
          assert.deepEqual(error.context.workflowWorkers.models, ["claude-haiku-4-5"]);
        } else if (label === "missing progress") {
          assert.equal(error.context.workflowWorkers[expectedField], 0, label);
        } else {
          assert.ok(error.context.workflowWorkers[expectedField] > 0, label);
        }
        assert.doesNotMatch(
          JSON.stringify(error.context),
          /private workflow|private worker|private-agent/,
          label
        );
        return true;
      }
    );
  }
});

test("Fable 5.1 ultracode rejects missing, mismatched, or incomplete Workflow lifecycle evidence", async () => {
  for (const [label, streamOptions, expectedEvidence] of [
    [
      "missing",
      { includeToolUse: false, includeStart: false, includeNotification: false },
      {
        topLevelWorkflowToolUses: 0,
        correlatedWorkflowStarts: 0,
        completedWorkflows: 0,
        unresolvedWorkflowToolUses: 0,
        invalidWorkflowEvents: 0,
        tasks: []
      }
    ],
    [
      "mismatched",
      { notificationTaskId: "wlocal-other" },
      {
        topLevelWorkflowToolUses: 1,
        correlatedWorkflowStarts: 1,
        completedWorkflows: 0,
        unresolvedWorkflowToolUses: 1,
        invalidWorkflowEvents: 1,
        tasks: []
      }
    ],
    [
      "missing terminal tool correlation",
      { notificationToolUseId: null },
      {
        topLevelWorkflowToolUses: 1,
        correlatedWorkflowStarts: 1,
        completedWorkflows: 0,
        unresolvedWorkflowToolUses: 1,
        invalidWorkflowEvents: 1,
        tasks: []
      }
    ],
    [
      "incomplete",
      { includeNotification: false },
      {
        topLevelWorkflowToolUses: 1,
        correlatedWorkflowStarts: 1,
        completedWorkflows: 0,
        unresolvedWorkflowToolUses: 1,
        invalidWorkflowEvents: 0,
        tasks: []
      }
    ]
  ]) {
    await assert.rejects(
      runBenchmarkAgent({
        configuration: {
          id: "claude:claude-fable-5-1@ultracode",
          provider: "claude",
          model: "claude-fable-5-1",
          reasoning: "ultracode"
        },
        promptText: "Architect it.",
        spawnImplementation: createSpawnStub({
          stdout: createUltracodeStream(streamOptions)
        })
      }),
      (error) => {
        assert.equal(error.code, "EVAL_AGENT_RUNTIME_FAILED");
        assert.match(error.message, /did not prove a completed Workflow lifecycle/);
        assert.deepEqual(error.context.workflowLifecycle, expectedEvidence);
        return true;
      }
    );
  }
});

test("Fable 5.1 ultracode rejects more than one completed Workflow or worker", async () => {
  const baseEvents = createUltracodeStream().split("\n").map((line) => JSON.parse(line));
  const finalResultIndex = baseEvents.findLastIndex((event) => event.type === "result");
  const secondWorkflowEvents = [
    {
      type: "assistant",
      parent_tool_use_id: null,
      session_id: "session-ultracode",
      message: {
        content: [{
          type: "tool_use",
          id: "toolu_workflow_2",
          name: "Workflow",
          input: { prompt: "private second workflow input" }
        }]
      }
    },
    {
      type: "system",
      subtype: "task_started",
      task_id: "wlocal456",
      tool_use_id: "toolu_workflow_2",
      task_type: "local_workflow",
      session_id: "session-ultracode"
    },
    {
      type: "system",
      subtype: "task_notification",
      task_id: "wlocal456",
      tool_use_id: "toolu_workflow_2",
      status: "completed",
      session_id: "session-ultracode",
      usage: { total_tokens: 12, tool_uses: 1, duration_ms: 100 }
    }
  ];
  const multipleWorkflowEvents = [...baseEvents];
  multipleWorkflowEvents.splice(finalResultIndex, 0, ...secondWorkflowEvents);
  await assert.rejects(
    runBenchmarkAgent({
      configuration: {
        id: "claude:claude-fable-5-1@ultracode",
        provider: "claude",
        model: "claude-fable-5-1",
        reasoning: "ultracode"
      },
      promptText: "Architect it.",
      spawnImplementation: createSpawnStub({
        stdout: multipleWorkflowEvents.map((event) => JSON.stringify(event)).join("\n")
      })
    }),
    (error) => {
      assert.match(error.message, /did not prove a completed Workflow lifecycle/);
      assert.equal(error.context.workflowLifecycle.topLevelWorkflowToolUses, 2);
      assert.equal(error.context.workflowLifecycle.completedWorkflows, 2);
      return true;
    }
  );

  const multipleWorkerEvents = baseEvents.flatMap((event) => {
    if (
      event.type !== "system" ||
      event.subtype !== "task_progress" ||
      !Array.isArray(event.workflow_progress)
    ) {
      return [event];
    }
    const secondWorker = structuredClone(event);
    secondWorker.workflow_progress[0].index = 2;
    secondWorker.workflow_progress[0].agentId = "private-agent-id-2";
    return [event, secondWorker];
  });
  await assert.rejects(
    runBenchmarkAgent({
      configuration: {
        id: "claude:claude-fable-5-1@ultracode",
        provider: "claude",
        model: "claude-fable-5-1",
        reasoning: "ultracode"
      },
      promptText: "Architect it.",
      spawnImplementation: createSpawnStub({
        stdout: multipleWorkerEvents.map((event) => JSON.stringify(event)).join("\n")
      })
    }),
    (error) => {
      assert.match(error.message, /did not prove exact local Fable 5\.1 Workflow workers/);
      assert.equal(error.context.workflowWorkers.distinctWorkers, 2);
      assert.equal(error.context.workflowWorkers.localUncachedCompleted, 2);
      return true;
    }
  );
});

test("Fable 5.1 ultracode rejects failed, stopped, or zero-token Workflow terminals", async () => {
  for (const [label, streamOptions] of [
    ["failed", { notificationStatus: "failed" }],
    ["stopped", { notificationStatus: "stopped" }],
    ["zero-token", {
      notificationUsage: { total_tokens: 0, tool_uses: 0, duration_ms: 1 }
    }]
  ]) {
    await assert.rejects(
      runBenchmarkAgent({
        configuration: {
          id: "claude:claude-fable-5-1@ultracode",
          provider: "claude",
          model: "claude-fable-5-1",
          reasoning: "ultracode"
        },
        promptText: "Architect it.",
        spawnImplementation: createSpawnStub({
          stdout: createUltracodeStream(streamOptions)
        })
      }),
      (error) => {
        assert.equal(error.code, "EVAL_AGENT_RUNTIME_FAILED", label);
        assert.match(error.message, /did not prove a completed Workflow lifecycle/);
        assert.equal(error.context.workflowLifecycle.invalidWorkflowEvents, 1);
        assert.equal(error.context.workflowLifecycle.completedWorkflows, 0);
        return true;
      }
    );
  }
});

test("Fable 5.1 ultracode rejects mixed or fallback canonical models", async () => {
  await assert.rejects(
    runBenchmarkAgent({
      configuration: {
        id: "claude:claude-fable-5-1@ultracode",
        provider: "claude",
        model: "claude-fable-5-1",
        reasoning: "ultracode"
      },
      promptText: "Architect it.",
      spawnImplementation: createSpawnStub({
        stdout: createUltracodeStream({
          modelUsage: {
            primary: { canonicalModel: "claude-fable-5-1" },
            workflowWorker: { canonicalModel: "claude-opus-5" }
          }
        })
      })
    }),
    (error) => {
      assert.equal(error.code, "EVAL_AGENT_RUNTIME_FAILED");
      assert.match(error.message, /did not satisfy the Fable 5\.1 canonical-model policy/);
      assert.deepEqual(error.context, {
        canonicalModelPolicy: "target-plus-ancillary-allowlist",
        targetCanonicalModel: "claude-fable-5-1",
        allowedCanonicalModels: ["claude-fable-5-1", "claude-haiku-4-5"],
        observedCanonicalModels: ["claude-fable-5-1", "claude-opus-5"],
        unexpectedCanonicalModels: ["claude-opus-5"],
        modelUsageEntriesWithoutCanonicalModel: 0,
        targetOutputAttributionAvailable: false,
        targetOutputAttributionInvalid: false,
        targetOutputTokens: null
      });
      return true;
    }
  );
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
