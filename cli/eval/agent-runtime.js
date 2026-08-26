import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { VasirCliError } from "../cli-error.js";
import { EVAL_TROUBLESHOOTING_DOCS_REF } from "../docs-ref.js";

export const DEFAULT_AGENT_TIMEOUT_MS = 20 * 60 * 1000;

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

function parseClaudeResult(processResult, configuration) {
  let payload = null;
  try {
    payload = JSON.parse(processResult.stdout.trim());
  } catch {
    // The structured error below includes the useful tail without exposing an unbounded transcript.
  }

  const outputText = String(payload?.result ?? "").trim();
  if (processResult.exitCode !== 0 || payload?.is_error === true || outputText.length === 0) {
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
        stdout: processResult.stdout.trim().slice(-2000)
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
      sessionId: payload?.session_id ?? null,
      canonicalModels: Object.values(payload?.modelUsage ?? {})
        .map((entry) => entry?.canonicalModel)
        .filter(Boolean),
      numTurns: Number(payload?.num_turns ?? 0),
      permissionDenials: Array.isArray(payload?.permission_denials)
        ? payload.permission_denials
        : [],
      subagentStats: payload?.subagent_stats ?? null,
      freshSession: true,
      persistedSession: false
    }
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
  return [
    "--print",
    "--safe-mode",
    "--disable-slash-commands",
    "--tools",
    "",
    "--permission-mode",
    "dontAsk",
    "--model",
    configuration.model,
    "--effort",
    configuration.reasoning,
    "--no-session-persistence",
    "--output-format",
    "json",
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
        environmentVariables,
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
