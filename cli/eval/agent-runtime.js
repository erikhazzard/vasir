import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { VasirCliError } from "../cli-error.js";
import { EVAL_TROUBLESHOOTING_DOCS_REF } from "../docs-ref.js";

export const DEFAULT_AGENT_TIMEOUT_MS = 20 * 60 * 1000;

const FABLE_5_1_MODEL = "claude-fable-5-1";
const CLAUDE_HAIKU_4_5_MODEL = "claude-haiku-4-5";
const CLAUDE_CANONICAL_MODEL_POLICY = "target-plus-ancillary-allowlist";
const CLAUDE_CANONICAL_TARGETS = Object.freeze({
  fable: Object.freeze({
    targetCanonicalModel: "claude-fable-5",
    displayName: "Fable 5"
  }),
  [FABLE_5_1_MODEL]: Object.freeze({
    targetCanonicalModel: FABLE_5_1_MODEL,
    displayName: "Fable 5.1"
  }),
  opus: Object.freeze({
    targetCanonicalModel: "claude-opus-5",
    displayName: "Opus 5"
  })
});
const CLAUDE_ULTRACODE_MINIMUM_CLI_VERSION = "2.1.257";
const CLAUDE_ULTRACODE_MAX_BUDGET_USD = 5;
const CLAUDE_ULTRACODE_WORKFLOW_SIZE_GUIDELINE = "small";
const CLAUDE_ULTRACODE_WORKFLOW_WAIT_CEILING_MS = 15 * 60 * 1000;
const CLAUDE_ULTRACODE_TOOLS = Object.freeze(["Workflow"]);
const CLAUDE_CONTROLLED_ENVIRONMENT_VARIABLES = Object.freeze([
  "CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL",
  "CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS",
  "CLAUDE_CODE_SUBAGENT_MODEL",
  "CLAUDE_CODE_SUBAGENT_MODEL_FORCE"
]);

function createRuntimeError({ configuration, message, context = null }) {
  return new VasirCliError({
    code: "EVAL_AGENT_RUNTIME_FAILED",
    message: `${configuration.id}: ${message}`,
    suggestion:
      "Confirm the selected model and reasoning effort are available in the logged-in agent CLI, then rerun the failed benchmark cell.",
    context,
    docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
  });
}

function runProcess({
  command,
  arguments: commandArguments,
  currentWorkingDirectory,
  inputText,
  environmentVariables,
  timeoutMs,
  spawnImplementation
}) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnImplementation(command, commandArguments, {
        cwd: currentWorkingDirectory,
        env: environmentVariables,
        stdio: ["pipe", "pipe", "pipe"]
      });
    } catch (error) {
      reject(error);
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      if (!settled) {
        timedOut = true;
        child.kill("SIGTERM");
      }
    }, timeoutMs);

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      reject(error);
    });
    child.on("close", (exitCode, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
        // CLI wrappers can translate SIGTERM into exit code 143 and clear the signal.
        // The harness owns the deadline, so record the timer firing directly.
        timedOut
      });
    });

    child.stdin?.end(inputText);
  });
}

function parseJsonLines(outputText) {
  return String(outputText ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.endsWith("}"))
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function normalizeCodexUsage(usage) {
  if (!usage || typeof usage !== "object") {
    return null;
  }

  return {
    inputTokens: Number(usage.input_tokens ?? 0),
    cachedInputTokens: Number(usage.cached_input_tokens ?? 0),
    cacheWriteInputTokens: Number(usage.cache_write_input_tokens ?? 0),
    outputTokens: Number(usage.output_tokens ?? 0),
    reasoningOutputTokens: Number(usage.reasoning_output_tokens ?? 0),
    totalTokens: Number(usage.input_tokens ?? 0) + Number(usage.output_tokens ?? 0)
  };
}

function parseCodexResult(processResult, configuration) {
  const events = parseJsonLines(processResult.stdout);
  const completedItems = events
    .filter((event) => event?.type === "item.completed" && typeof event?.item?.type === "string")
    .map((event) => event.item);
  const messageEvents = events.filter(
    (event) => event?.type === "item.completed" && event?.item?.type === "agent_message"
  );
  const completionEvent = events.findLast((event) => event?.type === "turn.completed");
  const threadEvent = events.find((event) => event?.type === "thread.started");
  const itemTypeCounts = completedItems.reduce((counts, item) => ({
    ...counts,
    [item.type]: Number(counts[item.type] ?? 0) + 1
  }), {});
  const outputText = String(messageEvents.at(-1)?.item?.text ?? "").trim();

  if (processResult.exitCode !== 0 || outputText.length === 0) {
    throw createRuntimeError({
      configuration,
      message: processResult.timedOut
        ? "the Codex session timed out"
        : "the Codex session did not return a final answer",
      context: {
        exitCode: processResult.exitCode,
        signal: processResult.signal,
        stderr: processResult.stderr.trim().slice(-2000)
      }
    });
  }

  return {
    text: outputText,
    usage: normalizeCodexUsage(completionEvent?.usage),
    costUsd: null,
    runtimeReceipt: {
      cli: "codex",
      threadId: threadEvent?.thread_id ?? null,
      itemTypeCounts,
      nonMessageItemCount: completedItems.filter((item) =>
        !["agent_message", "reasoning"].includes(item.type)
      ).length,
      freshSession: true,
      persistedSession: false
    }
  };
}

function normalizeClaudeUsage(payload) {
  const usage = payload?.usage;
  if (!usage || typeof usage !== "object") {
    return null;
  }

  const inputTokens = Number(usage.input_tokens ?? 0);
  const cacheCreationInputTokens = Number(usage.cache_creation_input_tokens ?? 0);
  const cacheReadInputTokens = Number(usage.cache_read_input_tokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? 0);
  return {
    inputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
    outputTokens,
    reasoningOutputTokens: Number(usage.output_tokens_details?.thinking_tokens ?? 0),
    totalTokens: inputTokens + cacheCreationInputTokens + cacheReadInputTokens + outputTokens
  };
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function getClaudeCanonicalModelContract(configuration) {
  const target = CLAUDE_CANONICAL_TARGETS[configuration?.model];
  if (!target) {
    return null;
  }
  return {
    ...target,
    canonicalModelPolicy: CLAUDE_CANONICAL_MODEL_POLICY,
    allowedCanonicalModels: [
      target.targetCanonicalModel,
      CLAUDE_HAIKU_4_5_MODEL
    ]
  };
}

function requireClaudeCanonicalModelContract(configuration) {
  const contract = getClaudeCanonicalModelContract(configuration);
  if (contract) {
    return contract;
  }
  throw createRuntimeError({
    configuration,
    message: "the Claude benchmark configuration has no canonical target-model mapping",
    context: { requestedModel: configuration.model }
  });
}

export function isBenchmarkAgentRuntimeReceiptCompatible({
  configuration,
  runtimeReceipt
}) {
  if (configuration?.provider !== "claude") {
    return true;
  }
  const contract = getClaudeCanonicalModelContract(configuration);
  if (!contract || !isRecord(runtimeReceipt)) {
    return false;
  }
  if (runtimeReceipt.cli != null && runtimeReceipt.cli !== "claude") {
    return false;
  }
  if (!Array.isArray(runtimeReceipt.canonicalModels)) {
    return false;
  }
  const observedCanonicalModels = runtimeReceipt.canonicalModels
    .filter(isNonEmptyString)
    .map((model) => model.trim());
  if (
    !observedCanonicalModels.includes(contract.targetCanonicalModel) ||
    observedCanonicalModels.some((model) => !contract.allowedCanonicalModels.includes(model))
  ) {
    return false;
  }

  const recordedTarget = runtimeReceipt.targetCanonicalModel;
  if (recordedTarget != null && recordedTarget !== contract.targetCanonicalModel) {
    return false;
  }
  if (
    runtimeReceipt.canonicalModelPolicy != null &&
    runtimeReceipt.canonicalModelPolicy !== contract.canonicalModelPolicy
  ) {
    return false;
  }
  if (
    runtimeReceipt.allowedCanonicalModels != null &&
    (
      !Array.isArray(runtimeReceipt.allowedCanonicalModels) ||
      !runtimeReceipt.allowedCanonicalModels.includes(contract.targetCanonicalModel) ||
      runtimeReceipt.allowedCanonicalModels.some(
        (model) => !contract.allowedCanonicalModels.includes(model)
      )
    )
  ) {
    return false;
  }
  const recordedTargetOutputTokens = runtimeReceipt.targetCanonicalModelOutputTokens;
  const hasPositiveTargetOutputAttribution =
    typeof recordedTargetOutputTokens === "number" &&
    Number.isFinite(recordedTargetOutputTokens) &&
    recordedTargetOutputTokens > 0;
  // Receipts emitted after canonical target pinning name the target explicitly,
  // so they must also carry positive target-output attribution. Existing receipts
  // already identify the same target in canonicalModels and remain reusable.
  if (recordedTarget != null && !hasPositiveTargetOutputAttribution) {
    return false;
  }
  if (recordedTargetOutputTokens != null && !hasPositiveTargetOutputAttribution) {
    return false;
  }
  return true;
}

function parseClaudeStream(outputText) {
  const events = [];
  let malformedLineCount = 0;
  for (const line of String(outputText ?? "").split(/\r?\n/)) {
    if (line.trim().length === 0) {
      continue;
    }
    try {
      const event = JSON.parse(line);
      if (isRecord(event)) {
        events.push(event);
      } else {
        malformedLineCount += 1;
      }
    } catch {
      malformedLineCount += 1;
    }
  }
  return { events, malformedLineCount };
}

function normalizeWorkflowUsage(usage) {
  return {
    totalTokens: Number.isInteger(usage?.total_tokens) && usage.total_tokens >= 0
      ? usage.total_tokens
      : null,
    toolUses: Number.isInteger(usage?.tool_uses) && usage.tool_uses >= 0
      ? usage.tool_uses
      : null,
    durationMs: Number.isInteger(usage?.duration_ms) && usage.duration_ms >= 0
      ? usage.duration_ms
      : null
  };
}

function inspectClaudeWorkflowLifecycle(events, finalResultIndex, finalSessionId) {
  const toolUses = [];
  const starts = [];
  const notifications = [];
  for (const [index, event] of events.entries()) {
    if (
      event.type === "assistant" &&
      event.parent_tool_use_id === null &&
      Array.isArray(event.message?.content)
    ) {
      for (const content of event.message.content) {
        if (content?.type === "tool_use" && content.name === "Workflow") {
          toolUses.push({
            index,
            toolUseId: content.id,
            sessionId: event.session_id
          });
        }
      }
    }
    if (event.type === "system" && event.subtype === "task_started") {
      starts.push({
        index,
        taskId: event.task_id,
        toolUseId: event.tool_use_id,
        taskType: event.task_type,
        sessionId: event.session_id
      });
    }
    if (event.type === "system" && event.subtype === "task_notification") {
      notifications.push({
        index,
        taskId: event.task_id,
        toolUseId: event.tool_use_id,
        status: event.status,
        sessionId: event.session_id,
        usage: normalizeWorkflowUsage(event.usage)
      });
    }
  }

  let correlatedWorkflowStarts = 0;
  let completedWorkflows = 0;
  let unresolvedWorkflowToolUses = 0;
  let invalidWorkflowEvents = 0;
  const tasks = [];
  const toolUseIdCounts = toolUses.reduce((counts, toolUse) => {
    if (isNonEmptyString(toolUse.toolUseId)) {
      counts.set(toolUse.toolUseId, (counts.get(toolUse.toolUseId) ?? 0) + 1);
    }
    return counts;
  }, new Map());

  for (const toolUse of toolUses) {
    if (
      !isNonEmptyString(toolUse.toolUseId) ||
      toolUseIdCounts.get(toolUse.toolUseId) !== 1 ||
      !isNonEmptyString(toolUse.sessionId) ||
      toolUse.sessionId !== finalSessionId
    ) {
      unresolvedWorkflowToolUses += 1;
      invalidWorkflowEvents += 1;
      continue;
    }

    const startCandidates = starts.filter(
      (start) => start.toolUseId === toolUse.toolUseId
    );
    const validStarts = startCandidates.filter(
      (start) =>
        start.index > toolUse.index &&
        start.index < finalResultIndex &&
        start.taskType === "local_workflow" &&
        isNonEmptyString(start.taskId) &&
        start.sessionId === finalSessionId
    );
    if (startCandidates.length !== 1 || validStarts.length !== 1) {
      unresolvedWorkflowToolUses += 1;
      if (startCandidates.length > 0) {
        invalidWorkflowEvents += 1;
      }
      continue;
    }

    correlatedWorkflowStarts += 1;
    const start = validStarts[0];
    const relatedNotifications = notifications.filter(
      (notification) =>
        notification.index > start.index &&
        (
          notification.taskId === start.taskId ||
          notification.toolUseId === toolUse.toolUseId
        )
    );
    const validNotifications = relatedNotifications.filter(
      (notification) =>
        notification.index < finalResultIndex &&
        notification.taskId === start.taskId &&
        notification.toolUseId === toolUse.toolUseId &&
        notification.sessionId === finalSessionId
    );
    invalidWorkflowEvents += relatedNotifications.length - validNotifications.length;
    if (validNotifications.length === 0) {
      unresolvedWorkflowToolUses += 1;
      continue;
    }

    const invalidTerminals = validNotifications.filter(
      (notification) =>
        notification.status !== "completed" ||
        !Number.isInteger(notification.usage.totalTokens) ||
        notification.usage.totalTokens <= 0
    );
    if (invalidTerminals.length > 0) {
      invalidWorkflowEvents += invalidTerminals.length;
      continue;
    }

    const terminal = validNotifications.at(-1);
    completedWorkflows += 1;
    tasks.push({
      toolUseId: toolUse.toolUseId,
      taskId: start.taskId,
      status: terminal.status,
      totalTokens: terminal.usage.totalTokens,
      toolUses: terminal.usage.toolUses,
      durationMs: terminal.usage.durationMs
    });
  }

  const summary = {
    topLevelWorkflowToolUses: toolUses.length,
    correlatedWorkflowStarts,
    completedWorkflows,
    unresolvedWorkflowToolUses,
    invalidWorkflowEvents,
    tasks
  };
  return {
    completed: toolUses.length === 1 &&
      correlatedWorkflowStarts === toolUses.length &&
      completedWorkflows === toolUses.length &&
      unresolvedWorkflowToolUses === 0 &&
      invalidWorkflowEvents === 0,
    summary
  };
}

function inspectClaudeCanonicalModels(payloads, finalPayload, targetCanonicalModel) {
  const observedCanonicalModels = [];
  let modelUsageEntriesWithoutCanonicalModel = 0;
  for (const payload of payloads) {
    if (payload?.modelUsage == null) {
      continue;
    }
    if (!isRecord(payload.modelUsage)) {
      modelUsageEntriesWithoutCanonicalModel += 1;
      continue;
    }
    for (const entry of Object.values(payload.modelUsage)) {
      const canonicalModel = typeof entry?.canonicalModel === "string"
        ? entry.canonicalModel.trim()
        : "";
      if (!canonicalModel) {
        modelUsageEntriesWithoutCanonicalModel += 1;
      } else if (!observedCanonicalModels.includes(canonicalModel)) {
        observedCanonicalModels.push(canonicalModel);
      }
    }
  }

  let targetOutputAttributionAvailable = false;
  let targetOutputAttributionInvalid = false;
  let targetOutputTokens = 0;
  if (isRecord(finalPayload?.modelUsage)) {
    for (const entry of Object.values(finalPayload.modelUsage)) {
      if (entry?.canonicalModel !== targetCanonicalModel || !Object.hasOwn(entry, "outputTokens")) {
        continue;
      }
      targetOutputAttributionAvailable = true;
      const outputTokens = entry.outputTokens;
      if (typeof outputTokens !== "number" || !Number.isFinite(outputTokens) || outputTokens < 0) {
        targetOutputAttributionInvalid = true;
      } else {
        targetOutputTokens += outputTokens;
      }
    }
  }
  return {
    observedCanonicalModels,
    modelUsageEntriesWithoutCanonicalModel,
    targetOutputAttributionAvailable,
    targetOutputAttributionInvalid,
    targetOutputTokens: targetOutputAttributionAvailable && !targetOutputAttributionInvalid
      ? targetOutputTokens
      : null
  };
}

function assertClaudeCanonicalModels({ configuration, contract, modelEvidence }) {
  const {
    observedCanonicalModels,
    modelUsageEntriesWithoutCanonicalModel,
    targetOutputAttributionAvailable,
    targetOutputAttributionInvalid,
    targetOutputTokens
  } = modelEvidence;
  const unexpectedCanonicalModels = observedCanonicalModels.filter(
    (model) => !contract.allowedCanonicalModels.includes(model)
  );
  const targetModelObserved = observedCanonicalModels.includes(contract.targetCanonicalModel);
  const targetOutputAccepted = targetOutputAttributionAvailable && (
    !targetOutputAttributionInvalid && targetOutputTokens > 0
  );
  if (
    modelUsageEntriesWithoutCanonicalModel === 0 &&
    unexpectedCanonicalModels.length === 0 &&
    targetModelObserved &&
    targetOutputAccepted
  ) {
    return;
  }
  throw createRuntimeError({
    configuration,
    message: `the Claude runtime did not satisfy the ${contract.displayName} canonical-model policy`,
    context: {
      canonicalModelPolicy: contract.canonicalModelPolicy,
      targetCanonicalModel: contract.targetCanonicalModel,
      allowedCanonicalModels: [...contract.allowedCanonicalModels],
      observedCanonicalModels,
      unexpectedCanonicalModels,
      modelUsageEntriesWithoutCanonicalModel,
      targetOutputAttributionAvailable,
      targetOutputAttributionInvalid,
      targetOutputTokens
    }
  });
}

function inspectClaudeCliVersion(events, finalResultIndex, finalSessionId) {
  const initEvents = events.slice(0, finalResultIndex).filter(
    (event) => event.type === "system" && event.subtype === "init"
  );
  const validInitEvents = initEvents.filter(
    (event) =>
      isNonEmptyString(event.claude_code_version) &&
      isNonEmptyString(event.session_id) &&
      event.session_id === finalSessionId
  );
  return {
    initEventCount: initEvents.length,
    validInitEventCount: validInitEvents.length,
    observedVersions: [...new Set(validInitEvents.map(
      (event) => event.claude_code_version.trim()
    ))]
  };
}

function isSupportedClaudeUltracodeCliVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version);
  if (!match) {
    return false;
  }
  const observed = match.slice(1).map(Number);
  const minimum = CLAUDE_ULTRACODE_MINIMUM_CLI_VERSION.split(".").map(Number);
  for (let index = 0; index < observed.length; index += 1) {
    if (observed[index] !== minimum[index]) {
      return observed[index] > minimum[index];
    }
  }
  return true;
}

function inspectClaudeWorkflowWorkers(events, finalResultIndex) {
  const workers = new Map();
  const models = new Set();
  const fallbackModels = new Set();
  let progressEventCount = 0;
  let invalidProgressEvents = 0;
  let missingModelEvents = 0;
  let fallbackModelEvents = 0;

  function observe(progress) {
    if (!isRecord(progress) || progress.type !== "workflow_agent") {
      return;
    }
    progressEventCount += 1;
    if (!Number.isInteger(progress.index) || progress.index < 1) {
      invalidProgressEvents += 1;
      return;
    }
    let worker = workers.get(progress.index);
    if (!worker) {
      worker = {
        started: false,
        latestState: null,
        error: false,
        remote: false,
        cached: false
      };
      workers.set(progress.index, worker);
    }

    if (!["start", "progress", "done", "error"].includes(progress.state)) {
      invalidProgressEvents += 1;
    } else {
      worker.latestState = progress.state;
      worker.started ||= progress.state === "start";
      worker.error ||= progress.state === "error";
    }
    worker.remote ||= progress.isolation === "remote" ||
      isNonEmptyString(progress.remoteSessionId);
    worker.cached ||= progress.cached === true;

    if (isNonEmptyString(progress.model)) {
      models.add(progress.model.trim());
    } else {
      missingModelEvents += 1;
    }
    if (Object.hasOwn(progress, "fallbackModel") && progress.fallbackModel != null) {
      if (typeof progress.fallbackModel !== "string") {
        invalidProgressEvents += 1;
      } else if (progress.fallbackModel.trim().length > 0) {
        fallbackModelEvents += 1;
        fallbackModels.add(progress.fallbackModel.trim());
      }
    }
  }

  for (const event of events.slice(0, finalResultIndex)) {
    if (event.type === "progress") {
      observe(event.data);
    }
    if (event.type === "system" && event.subtype === "task_progress") {
      const workflowProgress = Array.isArray(event.workflow_progress)
        ? event.workflow_progress
        : Array.isArray(event.workflowProgress)
          ? event.workflowProgress
          : [];
      for (const progress of workflowProgress) {
        observe(progress);
      }
    }
  }

  const workerValues = [...workers.values()];
  const distinctStarted = workerValues.filter((worker) => worker.started).length;
  const distinctCompleted = workerValues.filter(
    (worker) => worker.started && worker.latestState === "done"
  ).length;
  const errors = workerValues.filter((worker) => worker.error).length;
  const remote = workerValues.filter((worker) => worker.remote).length;
  const cached = workerValues.filter((worker) => worker.cached).length;
  const localUncachedCompleted = workerValues.filter(
    (worker) =>
      worker.started &&
      worker.latestState === "done" &&
      !worker.remote &&
      !worker.cached
  ).length;
  const incomplete = workerValues.filter(
    (worker) => !worker.started || worker.latestState !== "done"
  ).length;
  const summary = {
    progressEventCount,
    distinctWorkers: workers.size,
    distinctStarted,
    distinctCompleted,
    models: [...models].sort(),
    fallbackModels: [...fallbackModels].sort(),
    fallbackModelEvents,
    missingModelEvents,
    errors,
    remote,
    cached,
    localUncachedCompleted,
    incomplete,
    invalidProgressEvents
  };
  return {
    completed:
      distinctStarted === 1 &&
      localUncachedCompleted === 1 &&
      distinctCompleted === distinctStarted &&
      workers.size === 1 &&
      summary.models.length === 1 &&
      summary.models[0] === FABLE_5_1_MODEL &&
      fallbackModelEvents === 0 &&
      missingModelEvents === 0 &&
      errors === 0 &&
      remote === 0 &&
      cached === 0 &&
      incomplete === 0 &&
      invalidProgressEvents === 0,
    summary
  };
}

function parseClaudeResult(processResult, configuration) {
  const execution = createClaudeExecutionContract(configuration);
  const canonicalModelContract = requireClaudeCanonicalModelContract(configuration);
  let payload = null;
  let evidencePayloads = [];
  let finalResultIndex = -1;
  let streamEventCount = 0;
  let terminalResultEvent = null;
  if (execution.workflowModeRequested) {
    const stream = parseClaudeStream(processResult.stdout);
    streamEventCount = stream.events.length;
    const resultIndexes = stream.events.flatMap((event, index) =>
      event.type === "result" ? [index] : []
    );
    terminalResultEvent = resultIndexes.length > 0
      ? stream.events[resultIndexes.at(-1)]
      : null;
    const successfulResultIndexes = resultIndexes.filter((index) => {
      const event = stream.events[index];
      return event.subtype === "success" &&
        event.is_error !== true &&
        String(event.result ?? "").trim().length > 0;
    });
    finalResultIndex = successfulResultIndexes.at(-1) ?? -1;
    payload = finalResultIndex >= 0 ? stream.events[finalResultIndex] : null;
    evidencePayloads = stream.events;
    if (stream.malformedLineCount > 0 || resultIndexes.length === 0) {
      throw createRuntimeError({
        configuration,
        message: "the Claude stream did not contain a valid final result",
        context: {
          streamEventCount,
          malformedLineCount: stream.malformedLineCount,
          resultEventCount: resultIndexes.length,
          successfulResultEventCount: successfulResultIndexes.length
        }
      });
    }
  } else {
    try {
      payload = JSON.parse(processResult.stdout.trim());
      evidencePayloads = [payload];
    } catch {
      // The structured error below includes the useful tail without exposing an unbounded transcript.
    }
  }

  const outputText = String(payload?.result ?? "").trim();
  const invalidStreamResult = execution.workflowModeRequested && (
    payload?.type !== "result" ||
    payload?.subtype !== "success"
  );
  if (
    processResult.exitCode !== 0 ||
    payload?.is_error === true ||
    invalidStreamResult ||
    outputText.length === 0
  ) {
    throw createRuntimeError({
      configuration,
      message: processResult.timedOut
        ? "the Claude session timed out"
        : "the Claude session did not return a final answer",
      context: {
        exitCode: processResult.exitCode,
        signal: processResult.signal,
        apiErrorStatus: payload?.api_error_status ?? null,
        stderr: processResult.stderr.trim().slice(-2000),
        ...(execution.workflowModeRequested
          ? {
              streamEventCount,
              terminalResultSubtype: terminalResultEvent?.subtype ?? null,
              terminalResultIsError: terminalResultEvent?.is_error === true,
              terminalResultText: String(terminalResultEvent?.result ?? "").trim().slice(-1000)
            }
          : { stdout: processResult.stdout.trim().slice(-2000) })
      }
    });
  }

  const modelEvidence = inspectClaudeCanonicalModels(
    evidencePayloads,
    payload,
    canonicalModelContract.targetCanonicalModel
  );
  assertClaudeCanonicalModels({
    configuration,
    contract: canonicalModelContract,
    modelEvidence
  });

  const cliVersionEvidence = execution.workflowModeRequested
    ? inspectClaudeCliVersion(evidencePayloads, finalResultIndex, payload?.session_id)
    : { observedVersions: [] };
  if (
    execution.workflowModeRequested &&
    (
      cliVersionEvidence.initEventCount < 1 ||
      cliVersionEvidence.validInitEventCount !== cliVersionEvidence.initEventCount ||
      cliVersionEvidence.observedVersions.length !== 1 ||
      !isSupportedClaudeUltracodeCliVersion(cliVersionEvidence.observedVersions[0])
    )
  ) {
    throw createRuntimeError({
      configuration,
      message: "the Claude runtime did not confirm the supported Ultracode CLI contract",
      context: {
        minimumCliVersion: CLAUDE_ULTRACODE_MINIMUM_CLI_VERSION,
        ...cliVersionEvidence
      }
    });
  }

  const workflowEvidence = execution.workflowModeRequested
    ? inspectClaudeWorkflowLifecycle(
        evidencePayloads,
        finalResultIndex,
        payload?.session_id
      )
    : { completed: false, summary: null };
  if (execution.workflowModeRequested && !workflowEvidence.completed) {
    throw createRuntimeError({
      configuration,
      message: "the Claude runtime did not prove a completed Workflow lifecycle",
      context: {
        workflowLifecycle: workflowEvidence.summary
      }
    });
  }

  const workflowWorkerEvidence = execution.workflowModeRequested
    ? inspectClaudeWorkflowWorkers(evidencePayloads, finalResultIndex)
    : { completed: false, summary: null };
  if (execution.workflowModeRequested && !workflowWorkerEvidence.completed) {
    throw createRuntimeError({
      configuration,
      message: "the Claude runtime did not prove exact local Fable 5.1 Workflow workers",
      context: {
        workflowWorkers: workflowWorkerEvidence.summary
      }
    });
  }

  return {
    text: outputText,
    usage: normalizeClaudeUsage(payload),
    costUsd: Number.isFinite(Number(payload?.total_cost_usd))
      ? Number(payload.total_cost_usd)
      : null,
    runtimeReceipt: {
      cli: "claude",
      cliVersion: cliVersionEvidence.observedVersions[0] ?? null,
      sessionId: payload?.session_id ?? null,
      canonicalModels: modelEvidence.observedCanonicalModels,
      canonicalModelPolicy: canonicalModelContract.canonicalModelPolicy,
      targetCanonicalModel: canonicalModelContract.targetCanonicalModel,
      allowedCanonicalModels: [...canonicalModelContract.allowedCanonicalModels],
      targetCanonicalModelOutputTokens: modelEvidence.targetOutputTokens,
      requestedReasoning: execution.requestedReasoning,
      effectiveEffort: execution.effectiveEffort,
      workflowModeRequested: execution.workflowModeRequested,
      workflowExecutionObserved: workflowEvidence.completed,
      workflowLifecycle: workflowEvidence.summary,
      workflowWorkers: workflowWorkerEvidence.summary,
      workflowWorkerModelPolicy: execution.workflowWorkerModelPolicy,
      workflowWorkerModel: execution.workflowWorkerModel,
      workflowSizeGuideline: execution.workflowSizeGuideline,
      workflowWaitCeilingMs: execution.workflowWaitCeilingMs,
      isolationMode: execution.isolationMode,
      allowedTools: execution.allowedTools,
      maxBudgetUsd: execution.maxBudgetUsd,
      numTurns: Number(payload?.num_turns ?? 0),
      permissionDenials: Array.isArray(payload?.permission_denials)
        ? payload.permission_denials
        : [],
      freshSession: true,
      persistedSession: false
    }
  };
}

function createClaudeExecutionContract(configuration) {
  const workflowModeRequested = configuration.reasoning === "ultracode";
  const forceWorkflowWorkerModelInheritance = workflowModeRequested &&
    configuration.model === FABLE_5_1_MODEL;
  return {
    requestedReasoning: configuration.reasoning,
    effectiveEffort: workflowModeRequested ? "xhigh" : configuration.reasoning,
    workflowModeRequested,
    forceWorkflowWorkerModelInheritance,
    workflowWorkerModelPolicy: forceWorkflowWorkerModelInheritance
      ? "forced-exact-model"
      : null,
    workflowWorkerModel: forceWorkflowWorkerModelInheritance
      ? FABLE_5_1_MODEL
      : null,
    workflowSizeGuideline: workflowModeRequested
      ? CLAUDE_ULTRACODE_WORKFLOW_SIZE_GUIDELINE
      : null,
    workflowWaitCeilingMs: workflowModeRequested
      ? CLAUDE_ULTRACODE_WORKFLOW_WAIT_CEILING_MS
      : null,
    isolationMode: workflowModeRequested ? "restricted" : "safe-mode",
    allowedTools: workflowModeRequested ? [...CLAUDE_ULTRACODE_TOOLS] : [],
    maxBudgetUsd: workflowModeRequested ? CLAUDE_ULTRACODE_MAX_BUDGET_USD : null
  };
}

function createClaudeEnvironment(configuration, environmentVariables) {
  const isolatedEnvironmentVariables = { ...environmentVariables };
  for (const variableName of CLAUDE_CONTROLLED_ENVIRONMENT_VARIABLES) {
    delete isolatedEnvironmentVariables[variableName];
  }
  const execution = createClaudeExecutionContract(configuration);
  if (!execution.forceWorkflowWorkerModelInheritance) {
    return isolatedEnvironmentVariables;
  }
  return {
    ...isolatedEnvironmentVariables,
    CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL: "1",
    CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: String(execution.workflowWaitCeilingMs),
    CLAUDE_CODE_SUBAGENT_MODEL: FABLE_5_1_MODEL,
    CLAUDE_CODE_SUBAGENT_MODEL_FORCE: "1"
  };
}

function createCodexArguments(configuration, outputSchemaFilePath = null) {
  return [
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--model",
    configuration.model,
    "--config",
    `model_reasoning_effort=\"${configuration.reasoning}\"`,
    "--color",
    "never",
    "--json",
    ...(outputSchemaFilePath ? ["--output-schema", outputSchemaFilePath] : []),
    "-"
  ];
}

function createClaudeArguments(configuration, outputSchema = null) {
  const execution = createClaudeExecutionContract(configuration);
  return [
    "--print",
    ...(execution.workflowModeRequested
      ? ["--restricted", "--strict-mcp-config"]
      : ["--safe-mode"]),
    "--disable-slash-commands",
    "--tools",
    execution.allowedTools.join(","),
    ...(execution.workflowModeRequested
      ? ["--allowedTools", ...execution.allowedTools]
      : []),
    "--permission-mode",
    "dontAsk",
    "--model",
    configuration.model,
    "--effort",
    execution.effectiveEffort,
    ...(execution.workflowModeRequested
      ? [
          "--settings",
          JSON.stringify({
            ultracode: true,
            workflowSizeGuideline: execution.workflowSizeGuideline
          }),
          "--max-budget-usd",
          String(execution.maxBudgetUsd)
        ]
      : []),
    "--no-session-persistence",
    "--output-format",
    execution.workflowModeRequested ? "stream-json" : "json",
    ...(execution.workflowModeRequested ? ["--verbose"] : []),
    ...(outputSchema ? ["--json-schema", JSON.stringify(outputSchema)] : [])
  ];
}

export async function runBenchmarkAgent({
  configuration,
  promptText,
  outputSchema = null,
  environmentVariables = process.env,
  timeoutMs = DEFAULT_AGENT_TIMEOUT_MS,
  spawnImplementation = childProcess.spawn
}) {
  const startedAt = Date.now();
  const fixtureDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-agent-"));
  let outputSchemaFilePath = null;

  if (configuration.provider === "codex" && outputSchema) {
    outputSchemaFilePath = path.join(fixtureDirectoryPath, "output-schema.json");
    fs.writeFileSync(outputSchemaFilePath, `${JSON.stringify(outputSchema, null, 2)}\n`);
  }

  let processResult;
  try {
    if (configuration.provider === "codex") {
      processResult = await runProcess({
        command: "codex",
        arguments: createCodexArguments(configuration, outputSchemaFilePath),
        currentWorkingDirectory: fixtureDirectoryPath,
        inputText: promptText,
        environmentVariables,
        timeoutMs,
        spawnImplementation
      });
      return {
        ...parseCodexResult(processResult, configuration),
        durationMs: Date.now() - startedAt
      };
    }

    if (configuration.provider === "claude") {
      processResult = await runProcess({
        command: "claude",
        arguments: createClaudeArguments(configuration, outputSchema),
        currentWorkingDirectory: fixtureDirectoryPath,
        inputText: promptText,
        environmentVariables: createClaudeEnvironment(
          configuration,
          environmentVariables
        ),
        timeoutMs,
        spawnImplementation
      });
      return {
        ...parseClaudeResult(processResult, configuration),
        durationMs: Date.now() - startedAt
      };
    }

    throw createRuntimeError({
      configuration,
      message: `unsupported fresh-agent provider ${configuration.provider}`
    });
  } finally {
    fs.rmSync(fixtureDirectoryPath, { recursive: true, force: true });
  }
}
