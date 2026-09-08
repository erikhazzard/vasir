import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";

import { runBenchmarkAgent } from "./agent-runtime.js";

export const STORYTELLING_RUNTIME_VERSION = "progressive-frozen-skill-v2";

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function snapshotIdentity(files) {
  return digest(JSON.stringify(files.map(({ relativePath, sha256 }) => ({ relativePath, sha256 }))));
}

export function validateStorytellingSkillSnapshot(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.files) ||
    !/^[a-z0-9][a-z0-9_-]*$/u.test(snapshot.skillName ?? "")) {
    throw new Error("Storytelling skill snapshot is invalid.");
  }
  const seen = new Set();
  for (const file of snapshot.files) {
    if (typeof file.relativePath !== "string" || file.relativePath.includes("\\") ||
      path.posix.isAbsolute(file.relativePath) ||
      file.relativePath.split("/").some((part) => !part || part === "." || part === "..") ||
      seen.has(file.relativePath) || typeof file.contents !== "string" ||
      digest(file.contents) !== file.sha256) {
      throw new Error("Storytelling skill snapshot has an unsafe, duplicate, or changed file.");
    }
    seen.add(file.relativePath);
  }
  if (!seen.has("SKILL.md") || snapshotIdentity(snapshot.files) !== snapshot.hash) {
    throw new Error("Storytelling skill snapshot hash or root is invalid.");
  }
  return snapshot;
}

export function freezeStorytellingSkill({ skillDirectoryPath, skillName = "writing-storytelling" }) {
  const files = [];
  function visit(directoryPath, prefix = "") {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === ".DS_Store" || entry.name === "__pycache__") continue;
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(directoryPath, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Skill snapshots cannot contain symbolic links: ${relativePath}`);
      if (entry.isDirectory()) visit(absolutePath, relativePath);
      else if (entry.isFile()) {
        const contents = fs.readFileSync(absolutePath, "utf8");
        files.push({ relativePath, contents, sha256: digest(contents), bytes: Buffer.byteLength(contents) });
      }
    }
  }
  visit(skillDirectoryPath);
  return validateStorytellingSkillSnapshot({ schemaVersion: 1, skillName, hash: snapshotIdentity(files), files });
}

function stageSnapshot(snapshot, directoryPath) {
  const skillDirectoryPath = path.join(directoryPath, ".benchmark-skill", snapshot.skillName);
  for (const file of snapshot.files) {
    const target = path.join(skillDirectoryPath, file.relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.contents, { mode: 0o444, flag: "wx" });
  }
  return skillDirectoryPath;
}

function parseEvents(stdout) {
  return stdout.split(/\r?\n/u).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

function inspectEvidence(events, configuration, snapshot, fixtureDirectoryPath = null) {
  const observedModels = new Set();
  const declaredModels = new Set();
  const observedEfforts = new Set();
  const reads = new Set();
  const toolCalls = [];
  for (const event of events) {
    for (const model of [event.model, event.model_slug, event.model_info?.slug, event.turn?.model]) {
      if (typeof model === "string" && model && !model.startsWith("<")) declaredModels.add(model);
    }
    for (const model of [event.message?.model, event.response?.model]) {
      if (typeof model === "string" && model && !model.startsWith("<")) observedModels.add(model);
    }
    for (const effort of [event.reasoning_effort, event.reasoning?.effort,
      event.model_reasoning_effort, event.turn?.reasoning_effort]) {
      if (typeof effort === "string" && effort) observedEfforts.add(effort);
    }
    const item = event.type === "item.completed" ? event.item : null;
    if (item && !["reasoning", "agent_message"].includes(item.type)) {
      toolCalls.push({
        type: item.type,
        command: typeof item.command === "string" ? item.command.replaceAll(fixtureDirectoryPath ?? "<unused>", "<fresh-workspace>") : null,
        status: item.status ?? null,
        ...(item.tool ? { tool: item.tool } : {}),
        ...(item.agent_ids ? { agentIds: item.agent_ids } : {})
      });
      for (const file of snapshot?.files ?? []) {
        if (typeof item.command === "string" && item.command.includes(file.relativePath)) reads.add(file.relativePath);
      }
    }
    for (const content of event.message?.content ?? []) {
      if (content.type !== "tool_use") continue;
      const filePath = content.input?.file_path ?? content.input?.path;
      toolCalls.push({ type: content.name, filePath: typeof filePath === "string" ? filePath.replaceAll(fixtureDirectoryPath ?? "<unused>", "<fresh-workspace>") : null });
      for (const file of snapshot?.files ?? []) {
        if (typeof filePath === "string" && filePath.endsWith(`/${file.relativePath}`)) reads.add(file.relativePath);
      }
    }
    for (const entry of Object.values(event.modelUsage ?? {})) {
      if (typeof entry?.canonicalModel === "string" && !entry.canonicalModel.startsWith("<") &&
        Number.isFinite(entry.outputTokens) && entry.outputTokens > 0) observedModels.add(entry.canonicalModel);
    }
  }
  return {
    requestedConfiguration: { ...configuration },
    requestedModel: configuration.model,
    requestedReasoning: configuration.reasoning,
    effectiveEffortRequested: configuration.reasoning,
    executionMode: configuration.reasoning === "ultra" ? "ultra" : "standard",
    observedModels: [...observedModels].sort(),
    declaredModels: [...declaredModels].sort(),
    observedReasoningEfforts: [...observedEfforts].sort(),
    modelVerification: observedModels.size ? "provider-output-attribution" : "explicit-cli-request-only",
    reasoningVerification: observedEfforts.size ? "provider-stream" : "explicit-cli-request-only",
    referenceAccess: { observedPaths: [...reads].sort(), observation: "tool-event-paths" },
    toolCalls
  };
}

/** Reuses the normal fresh CLI runtime, with only the frozen skill root injected.
 * Reference contents remain files and are chosen by the model during the turn.
 * Provider auth remains in the CLI; the receipt never serializes the environment.
 */
export async function runStorytellingAgent({
  configuration,
  promptText,
  skillSnapshot = null,
  outputSchema = null,
  environmentVariables = process.env,
  timeoutMs,
  spawnImplementation = childProcess.spawn
}) {
  if (configuration.reasoning === "ultracode") {
    throw new Error("Ultracode changes workflow/agent count and is outside the storytelling reasoning matrix.");
  }
  if (skillSnapshot) validateStorytellingSkillSnapshot(skillSnapshot);
  let stdout = "";
  let actualArguments = [];
  let instructionHash = null;
  let fixtureDirectoryPath = null;
  const startedAt = new Date().toISOString();
  const spawnWithSkill = (command, commandArguments, options) => {
    fixtureDirectoryPath = options.cwd;
    const args = commandArguments.slice();
    if (skillSnapshot) {
      const stagedDirectory = stageSnapshot(skillSnapshot, options.cwd);
      const root = skillSnapshot.files.find((file) => file.relativePath === "SKILL.md");
      const instruction = `Use the ${skillSnapshot.skillName} skill for this request. Its frozen directory is ${stagedDirectory}. Resolve linked reference paths relative to that directory and read the references selected by the skill.\n\n${root.contents}`;
      instructionHash = digest(instruction.replaceAll(stagedDirectory, "<frozen-skill-directory>"));
      // Codex exec owns these overrides: global-before-subcommand config can be
      // discarded by exec's isolated config loading. The sentinel live probe
      // verifies that the same override after `exec` reaches the model.
      if (configuration.provider === "codex") args.splice(args.indexOf("-"), 0, "--config", `developer_instructions=${JSON.stringify(instruction)}`);
      else args.push("--append-system-prompt", instruction);
    }
    if (configuration.provider === "codex") args.splice(args.indexOf("-"), 0, "--config", 'web_search="disabled"');
    if (configuration.provider === "claude" && !outputSchema) {
      args[args.indexOf("--tools") + 1] = "Read";
      // Stream events make progressive reads auditable; the normal runtime expects
      // one result object, so the adapter below presents the terminal result to it.
      args[args.indexOf("--output-format") + 1] = "stream-json";
      args.push("--verbose");
    }
    actualArguments = args.map((argument, index) => {
      if (args[index - 1] === "--append-system-prompt" || argument.startsWith("developer_instructions=")) {
        return `<frozen-skill-root:${instructionHash}>`;
      }
      return argument.replaceAll(options.cwd, "<fresh-workspace>");
    });
    const child = spawnImplementation(command, args, options);
    if (configuration.provider === "claude" && !outputSchema) {
      // Preserve the full stream privately for receipt inspection while adapting
      // it to the established canonical-model parser's JSON response contract.
      const originalOn = child.stdout.on.bind(child.stdout);
      child.stdout.on = function (name, callback) {
        if (name !== "data") return originalOn(name, callback);
        originalOn("data", (chunk) => { stdout += chunk; });
        child.prependListener("close", () => {
          const result = parseEvents(stdout).filter((event) => event.type === "result").at(-1);
          callback(result ? JSON.stringify(result) : stdout);
        });
        return child.stdout;
      };
    } else {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
    }
    return child;
  };
  try {
    const result = await runBenchmarkAgent({
      configuration, promptText, outputSchema, environmentVariables,
      ...(timeoutMs === undefined ? {} : { timeoutMs }), spawnImplementation: spawnWithSkill
    });
    const evidence = inspectEvidence(parseEvents(stdout), configuration, skillSnapshot, fixtureDirectoryPath);
    return {
      ...result,
      runtimeReceipt: {
        ...result.runtimeReceipt,
        ...evidence,
        // The wrapper exposes Read to contestants; the generic receipt assumes tool-free calls.
        ...(configuration.provider === "claude" && !outputSchema ? { allowedTools: ["Read"] } : {}),
        runtimeVersion: STORYTELLING_RUNTIME_VERSION,
        startedAt,
        completedAt: new Date().toISOString(),
        skillHash: skillSnapshot?.hash ?? null,
        skillInjection: skillSnapshot ? "root-instruction-progressive-file-access" : null,
        instructionHash,
        cliArguments: actualArguments,
        workingDirectoryIsolation: "fresh-temporary-directory",
        outputSha256: digest(result.text),
        streamSha256: digest(stdout),
        userPromptSha256: digest(promptText)
      }
    };
  } catch (error) {
    const events = parseEvents(stdout);
    const terminalDiagnostic = events.filter((event) => event.type === "result" || event.type === "error")
      .map((event) => event.result ?? event.message ?? "").join("\n");
    const authenticationDiagnostic = `${error.message ?? ""}
${error.context?.stderr ?? ""}
${terminalDiagnostic}`;
    if (/OAuth session expired|Failed to authenticate|not logged in|authentication (?:failed|required)|invalid authentication|invalid_api_key/iu.test(authenticationDiagnostic)) {
      error.code = "AUTH_UNAVAILABLE";
      error.message = `${configuration.id}: ${configuration.provider} authentication is unavailable.`;
      error.context = {
        exitCode: error.context?.exitCode ?? null,
        signal: error.context?.signal ?? null,
        authenticationReason: /OAuth session expired/iu.test(authenticationDiagnostic)
          ? "oauth-session-expired-and-refresh-failed" : "authentication-unavailable",
        credentialValuesStored: false
      };
    }
    error.context = {
      ...(error.context ?? {}),
      runtimeVersion: STORYTELLING_RUNTIME_VERSION,
      requestedConfiguration: { ...configuration },
      startedAt,
      completedAt: new Date().toISOString(),
      streamSha256: digest(stdout),
      observed: inspectEvidence(events, configuration, skillSnapshot, fixtureDirectoryPath)
    };
    // Keep the exact local temporary path out of user-facing error receipts.
    if (fixtureDirectoryPath && typeof error.context.stderr === "string") {
      error.context.stderr = error.context.stderr.replaceAll(fixtureDirectoryPath, "<fresh-workspace>");
    }
    throw error;
  }
}
