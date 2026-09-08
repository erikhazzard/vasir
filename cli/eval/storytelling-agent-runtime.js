import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";

import { runBenchmarkAgent } from "./agent-runtime.js";
import { frozenChunkMcpSource } from "./frozen-chunk-mcp-source.js";

export const STORYTELLING_RUNTIME_VERSION = "progressive-frozen-skill-v2";
export const STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION = "successful-frozen-chunk-reads-v1";
export const STORYTELLING_READ_TOOL_RUNTIME_VERSION = "progressive-frozen-skill-read-tool-v1";
export const STORYTELLING_READ_TOOL_POLICY_VERSION = "successful-frozen-read-tool-chunks-v1";
export const STORYTELLING_BOUNDED_COMMAND_RUNTIME_VERSION = "progressive-frozen-skill-bounded-command-v1";
export const STORYTELLING_BOUNDED_COMMAND_POLICY_VERSION = "successful-frozen-bounded-command-chunks-v1";
export const STORYTELLING_MCP_RUNTIME_VERSION = "progressive-frozen-skill-mcp-chunks-v1";
export const STORYTELLING_MCP_POLICY_VERSION = "successful-frozen-mcp-chunks-v1";
export const STORYTELLING_FROZEN_WORKSPACE_ISOLATION = Object.freeze({
  version: "writing-frozen-workspace-only-v1", hostSkillDiscovery: false,
  projectInstructions: false, externalResources: false, fileScope: "fresh-workspace-only"
});
const REQUIRED_READ_HELPER = ".required-skill-read.cjs";
const REQUIRED_READ_DIRECTORY = ".required-skill-reads";
const REQUIRED_READ_CHUNK_BYTES = 8000;
const BOUNDED_COMMAND_CHUNK_BYTES = 3000;

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

export function normalizeStorytellingRequiredSkillFiles(skillSnapshot, requiredSkillFiles = []) {
  if (!Array.isArray(requiredSkillFiles) || new Set(requiredSkillFiles).size !== requiredSkillFiles.length ||
    requiredSkillFiles.some((relativePath) => typeof relativePath !== "string" ||
      !skillSnapshot?.files.some((file) => file.relativePath === relativePath))) {
    throw new Error("Required skill files must be distinct paths in the frozen skill snapshot.");
  }
  return [...requiredSkillFiles].sort();
}

function createRequiredReadChunks(snapshot, requiredSkillFiles, chunkBytes = REQUIRED_READ_CHUNK_BYTES) {
  const chunks = [];
  for (const relativePath of requiredSkillFiles) {
    const file = snapshot.files.find((entry) => entry.relativePath === relativePath);
    let contents = "";
    let bytes = 0;
    let start = 0;
    function flush() {
      chunks.push({ index: chunks.length, relativePath, start, end: start + contents.length,
        contents, bytes, sha256: digest(contents), fileSha256: file.sha256 });
      start += contents.length;
      contents = "";
      bytes = 0;
    }
    // Iterate Unicode code points so a page never splits a UTF-8 character.
    for (const character of file.contents) {
      const size = Buffer.byteLength(character);
      if (bytes + size > chunkBytes) flush();
      contents += character;
      bytes += size;
    }
    if (contents || start === 0) flush();
  }
  return chunks;
}

function requiredReadFrame(chunk) {
  const metadata = JSON.stringify({ index: chunk.index, relativePath: chunk.relativePath,
    bytes: chunk.bytes, sha256: chunk.sha256 });
  return `<<<BENCHMARK_SKILL_READ ${metadata}>>>\n${chunk.contents}\n<<<END_BENCHMARK_SKILL_READ ${chunk.index}>>>\n`;
}

function requiredReadHelperSource(chunks, lingerMs = 0) {
  return `"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const chunks = ${JSON.stringify(chunks.map(({ contents, ...chunk }) => chunk))};
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
if (process.argv.length !== 3 || !/^(0|[1-9][0-9]*)$/.test(process.argv[2])) throw new Error("Pass exactly one required chunk index.");
const chunk = chunks[Number(process.argv[2])];
if (!chunk) throw new Error("Unknown required chunk index.");
const source = fs.readFileSync(path.join(__dirname, chunk.relativePath), "utf8");
if (hash(source) !== chunk.fileSha256) throw new Error("Frozen skill file changed.");
chunk.contents = source.slice(chunk.start, chunk.end);
if (hash(chunk.contents) !== chunk.sha256 || Buffer.byteLength(chunk.contents) !== chunk.bytes) throw new Error("Frozen skill chunk changed.");
process.stdout.write((${requiredReadFrame.toString()})(chunk));
${lingerMs ? `setTimeout(() => {}, ${lingerMs});\n` : ""}\
`;
}

export function createStorytellingSkillInstruction({ skillSnapshot, skillDirectoryPath, requiredSkillFiles = [], requiredSkillReadTransport = "command" }) {
  const required = normalizeStorytellingRequiredSkillFiles(skillSnapshot, requiredSkillFiles);
  const root = skillSnapshot.files.find((file) => file.relativePath === "SKILL.md");
  const introduction = `Use the ${skillSnapshot.skillName} skill for this request. Its frozen directory is ${skillDirectoryPath}. Resolve linked reference paths relative to that directory and read the references selected by the skill.`;
  if (!required.length) return `${introduction}\n\n${root.contents}`;
  if (requiredSkillReadTransport === "mcp-chunks") {
    const calls = createRequiredReadChunks(skillSnapshot, required).map(chunk =>
      `benchmark_reader.read_chunk ${JSON.stringify({ index: chunk.index })} # ${chunk.relativePath}`).join("\n");
    return `${introduction}\n\nRequired file-reading protocol (${STORYTELLING_MCP_POLICY_VERSION}): Before composing your answer, read every byte of ${required.map(file => JSON.stringify(file)).join(" and ")}. Call the local benchmark_reader read_chunk tool for every index below and read its entire returned text. Each successful result contains a bounded, verbatim chunk of the frozen file with identifying frames. If a result is missing or truncated, repeat that read before composing your answer. A path listing, search, summary, or hash alone is not a complete read. Other references remain available through ordinary read-only file access. Return the requested answer without describing this protocol.\n\n${calls}\n\n${root.contents}`;
  }
  if (requiredSkillReadTransport === "read-tool") {
    const reads = createRequiredReadChunks(skillSnapshot, required).map((chunk) =>
      `Read ${JSON.stringify(path.posix.join(skillDirectoryPath, REQUIRED_READ_DIRECTORY, `chunk-${chunk.index}.txt`))} in full. # ${chunk.relativePath}`).join("\n");
    return `${introduction}\n\nRequired file-reading protocol (${STORYTELLING_READ_TOOL_POLICY_VERSION}): Before composing your answer, read every byte of ${required.map((file) => JSON.stringify(file)).join(" and ")}. The files listed below contain bounded, verbatim chunks of those frozen files, with identifying frames. Use the Read tool on every listed chunk separately, without an offset or limit, and read its entire output. If a result is truncated, read the omitted portion before answering. A path listing, search, summary, or hash alone is not a complete read. Other references remain available through ordinary read-only file access. Return the requested answer without describing this protocol.\n\n${reads}\n\n${root.contents}`;
  }
  const helperPath = path.posix.join(skillDirectoryPath, REQUIRED_READ_HELPER);
  const quotedHelperPath = `'${helperPath.replaceAll("'", "'\\''")}'`;
  const bounded = requiredSkillReadTransport === "bounded-command";
  const commands = createRequiredReadChunks(skillSnapshot, required, bounded ? BOUNDED_COMMAND_CHUNK_BYTES : REQUIRED_READ_CHUNK_BYTES)
    .map((chunk) => `node ${quotedHelperPath} ${chunk.index} # ${chunk.relativePath}`).join("\n");
  return `${introduction}\n\nRequired file-reading protocol (${bounded ? STORYTELLING_BOUNDED_COMMAND_POLICY_VERSION : STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION}): Before composing your answer, read every byte of ${required.map((file) => JSON.stringify(file)).join(" and ")}. Use the staged read-only helper below. Each command prints one bounded chunk, with no omissions. Execute every listed command separately and read its entire output. Request at least 6000 output tokens per command; if a result is truncated, repeat that chunk with a larger output limit. A path listing, search, summary, or hash alone is not a complete read. Other references remain available through ordinary read-only file access. Return the requested answer without describing this protocol.\n\n${commands}\n\n${root.contents}`;
}

function inspectRequiredSkillReads(events, snapshot, requiredSkillFiles, transport = "command", fixtureDirectoryPath = null, fixtureRealPath = null) {
  const chunks = createRequiredReadChunks(snapshot, requiredSkillFiles, transport === "bounded-command" ? BOUNDED_COMMAND_CHUNK_BYTES : REQUIRED_READ_CHUNK_BYTES);
  const observed = new Map();
  const calls = new Map();
  for (const event of events) {
    if (transport === "mcp-chunks") {
      const item = event.type === "item.completed" ? event.item : null;
      if (item?.type !== "mcp_tool_call" || item.status !== "completed" || item.server !== "benchmark_reader" || item.tool !== "read_chunk" || item.error || item.result?.isError) continue;
      const index = item.arguments?.index;
      const chunk = Number.isInteger(index) ? chunks[index] : null;
      if (chunk && item.result?.content?.some(part => part.type === "text" && part.text === requiredReadFrame(chunk))) observed.set(index, item.id ?? null);
      continue;
    }
    if (transport === "read-tool") {
      for (const content of event.message?.content ?? []) {
        if (event.type === "assistant" && content.type === "tool_use" && content.name === "Read" && typeof content.id === "string" && typeof content.input?.file_path === "string") {
          calls.set(content.id, content.input?.file_path);
        }
        if (event.type !== "user" || content.type !== "tool_result" || content.is_error || !calls.has(content.tool_use_id)) continue;
        const pieces = typeof content.content === "string" ? [content.content] :
          Array.isArray(content.content) ? content.content.filter((part) => part.type === "text").map((part) => part.text) : [];
        for (const body of pieces.filter((part) => typeof part === "string")) {
          // Read prefixes physical lines with a line number. Strip ONLY that
          // presentation prefix: preserve every byte of the frozen payload.
          const normalized = body.replace(/^[ \t]*\d+(?:→|\t)/gmu, "");
          for (const chunk of chunks) {
            const expectedPath = path.join(fixtureDirectoryPath, ".benchmark-skill", snapshot.skillName,
              REQUIRED_READ_DIRECTORY, `chunk-${chunk.index}.txt`);
            const realPath = path.join(fixtureRealPath ?? fixtureDirectoryPath, ".benchmark-skill", snapshot.skillName,
              REQUIRED_READ_DIRECTORY, `chunk-${chunk.index}.txt`);
            if (![expectedPath, realPath].includes(path.resolve(fixtureDirectoryPath, calls.get(content.tool_use_id)))) continue;
            const frame = requiredReadFrame(chunk);
            // The Read renderer may omit the final display newline, not bytes
            // within the framed original file contents.
            if ([body, normalized].some(text => text.includes(frame) || text.endsWith(frame.slice(0, -1)))) {
              observed.set(chunk.index, content.tool_use_id);
            }
          }
        }
      }
      continue;
    }
    const item = event.type === "item.completed" ? event.item : null;
    if (item?.type !== "command_execution" || item.status !== "completed" || item.exit_code !== 0 ||
      typeof item.command !== "string" || !item.command.includes(REQUIRED_READ_HELPER) ||
      typeof item.aggregated_output !== "string") continue;
    for (const chunk of chunks) {
      // Full framed bytes must appear in a successful tool result. A footer,
      // claimed hash, failed read, or truncated body cannot establish access.
      if (item.aggregated_output.includes(requiredReadFrame(chunk))) observed.set(chunk.index, item.id ?? null);
    }
  }
  const files = requiredSkillFiles.map((relativePath) => {
    const file = snapshot.files.find((entry) => entry.relativePath === relativePath);
    const fileChunks = chunks.filter((chunk) => chunk.relativePath === relativePath);
    const observedChunks = fileChunks.filter((chunk) => observed.has(chunk.index)).map((chunk) => ({
      index: chunk.index, bytes: chunk.bytes, sha256: chunk.sha256, toolEventId: observed.get(chunk.index)
    }));
    return { relativePath, sha256: file.sha256, bytes: Buffer.byteLength(file.contents),
      requiredChunkCount: fileChunks.length, observedChunks, complete: observedChunks.length === fileChunks.length };
  });
  return { policyVersion: transport === "mcp-chunks" ? STORYTELLING_MCP_POLICY_VERSION : transport === "read-tool" ? STORYTELLING_READ_TOOL_POLICY_VERSION : transport === "bounded-command" ? STORYTELLING_BOUNDED_COMMAND_POLICY_VERSION : STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION,
    requiredFiles: requiredSkillFiles, evidence: transport === "mcp-chunks" ? "successful-mcp-tool-output-frozen-byte-match" : transport === "read-tool" ? "successful-read-tool-output-frozen-byte-match" : "successful-command-output-frozen-byte-match",
    status: files.every((file) => file.complete) ? "complete" : "incomplete", files };
}

export function isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot, requiredSkillFiles, receipt, requireComplete = true }) {
  const required = normalizeStorytellingRequiredSkillFiles(skillSnapshot, requiredSkillFiles);
  if (!required.length) return receipt === undefined;
  const evidenceTypes = {
    [STORYTELLING_REQUIRED_SKILL_READ_POLICY_VERSION]: "successful-command-output-frozen-byte-match",
    [STORYTELLING_READ_TOOL_POLICY_VERSION]: "successful-read-tool-output-frozen-byte-match",
    [STORYTELLING_BOUNDED_COMMAND_POLICY_VERSION]: "successful-command-output-frozen-byte-match",
    [STORYTELLING_MCP_POLICY_VERSION]: "successful-mcp-tool-output-frozen-byte-match"
  };
  if (!Object.hasOwn(evidenceTypes, receipt?.policyVersion ?? "") ||
    receipt.evidence !== evidenceTypes[receipt.policyVersion] ||
    JSON.stringify(receipt.requiredFiles) !== JSON.stringify(required) ||
    !Array.isArray(receipt.files) || receipt.files.length !== required.length) return false;
  const chunks = createRequiredReadChunks(skillSnapshot, required, receipt.policyVersion === STORYTELLING_BOUNDED_COMMAND_POLICY_VERSION ? BOUNDED_COMMAND_CHUNK_BYTES : REQUIRED_READ_CHUNK_BYTES);
  for (let index = 0; index < required.length; index += 1) {
    const file = skillSnapshot.files.find((entry) => entry.relativePath === required[index]);
    const evidence = receipt.files[index];
    const fileChunks = chunks.filter((chunk) => chunk.relativePath === file.relativePath);
    if (evidence?.relativePath !== file.relativePath || evidence.sha256 !== file.sha256 ||
      evidence.bytes !== Buffer.byteLength(file.contents) || evidence.requiredChunkCount !== fileChunks.length ||
      !Array.isArray(evidence.observedChunks) ||
      new Set(evidence.observedChunks.map((chunk) => chunk.index)).size !== evidence.observedChunks.length ||
      evidence.observedChunks.some((chunk) => !fileChunks.some((expected) =>
        chunk.index === expected.index && chunk.bytes === expected.bytes && chunk.sha256 === expected.sha256)) ||
      evidence.complete !== (evidence.observedChunks.length === fileChunks.length)) return false;
  }
  const complete = receipt.files.every((file) => file.complete);
  return receipt.status === (complete ? "complete" : "incomplete") && (!requireComplete || complete);
}

function stageSnapshot(snapshot, directoryPath, requiredSkillFiles = [], transport = "command") {
  const skillDirectoryPath = path.join(directoryPath, ".benchmark-skill", snapshot.skillName);
  for (const file of snapshot.files) {
    const target = path.join(skillDirectoryPath, file.relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.contents, { mode: 0o444, flag: "wx" });
  }
  if (requiredSkillFiles.length) {
    if (transport === "mcp-chunks") return skillDirectoryPath;
    if (transport === "read-tool") {
      const chunkDirectory = path.join(skillDirectoryPath, REQUIRED_READ_DIRECTORY);
      fs.mkdirSync(chunkDirectory, { mode: 0o700 });
      for (const chunk of createRequiredReadChunks(snapshot, requiredSkillFiles)) {
        fs.writeFileSync(path.join(chunkDirectory, `chunk-${chunk.index}.txt`), requiredReadFrame(chunk), { mode: 0o444, flag: "wx" });
      }
      return skillDirectoryPath;
    }
    fs.writeFileSync(path.join(skillDirectoryPath, REQUIRED_READ_HELPER),
      requiredReadHelperSource(createRequiredReadChunks(snapshot, requiredSkillFiles, transport === "bounded-command" ? BOUNDED_COMMAND_CHUNK_BYTES : REQUIRED_READ_CHUNK_BYTES), transport === "bounded-command" ? 100 : 0), { mode: 0o444, flag: "wx" });
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
  requiredSkillFiles = [],
  requiredSkillReadTransport = "command",
  outputSchema = null,
  environmentVariables = process.env,
  timeoutMs,
  spawnImplementation = childProcess.spawn
}) {
  if (configuration.reasoning === "ultracode") {
    throw new Error("Ultracode changes workflow/agent count and is outside the storytelling reasoning matrix.");
  }
  if (skillSnapshot) validateStorytellingSkillSnapshot(skillSnapshot);
  const required = normalizeStorytellingRequiredSkillFiles(skillSnapshot, requiredSkillFiles);
  if (!["command", "read-tool", "bounded-command", "mcp-chunks"].includes(requiredSkillReadTransport) ||
      requiredSkillReadTransport === "read-tool" && (configuration.provider !== "claude" || outputSchema)) {
    throw new Error("Read-tool transport requires a Claude contestant without an output schema.");
  }
  if (["bounded-command", "mcp-chunks"].includes(requiredSkillReadTransport) && (configuration.provider !== "codex" || outputSchema)) {
    throw new Error("Command/MCP chunk transport requires a Codex contestant without an output schema.");
  }
  if (required.length && (configuration.provider !== "codex" && requiredSkillReadTransport !== "read-tool" || outputSchema)) {
    throw new Error("Required skill-file read verification currently supports Codex contestants only.");
  }
  const runtimeVersion = requiredSkillReadTransport === "mcp-chunks" ? STORYTELLING_MCP_RUNTIME_VERSION : requiredSkillReadTransport === "read-tool" ? STORYTELLING_READ_TOOL_RUNTIME_VERSION :
    requiredSkillReadTransport === "bounded-command" ? STORYTELLING_BOUNDED_COMMAND_RUNTIME_VERSION : STORYTELLING_RUNTIME_VERSION;
  let stdout = "";
  let actualArguments = [];
  let instructionHash = null;
  let fixtureDirectoryPath = null;
  let fixtureRealPath = null;
  const startedAt = new Date().toISOString();
  const spawnWithSkill = (command, commandArguments, options) => {
    fixtureDirectoryPath = options.cwd;
    fixtureRealPath = fs.realpathSync(options.cwd);
    const args = commandArguments.slice();
    if (skillSnapshot) {
      const stagedDirectory = stageSnapshot(skillSnapshot, options.cwd, required, requiredSkillReadTransport);
      const instruction = createStorytellingSkillInstruction({ skillSnapshot, skillDirectoryPath: stagedDirectory, requiredSkillFiles: required, requiredSkillReadTransport });
      instructionHash = digest(instruction.replaceAll(stagedDirectory, "<frozen-skill-directory>"));
      // Codex exec owns these overrides: global-before-subcommand config can be
      // discarded by exec's isolated config loading. The sentinel live probe
      // verifies that the same override after `exec` reaches the model.
      if (configuration.provider === "codex") args.splice(args.indexOf("-"), 0, "--config", `developer_instructions=${JSON.stringify(instruction)}`);
      else args.push("--append-system-prompt", instruction);
    }
    if (configuration.provider === "codex") args.splice(args.indexOf("-"), 0, "--config", 'web_search="disabled"');
    if (requiredSkillReadTransport === "mcp-chunks") {
      const serverFile = path.join(options.cwd, ".benchmark-frozen-reader.cjs");
      const directory = skillSnapshot ? path.join(options.cwd, ".benchmark-skill", skillSnapshot.skillName) : options.cwd;
      fs.writeFileSync(serverFile, frozenChunkMcpSource(skillSnapshot ? createRequiredReadChunks(skillSnapshot, required) : [], directory, requiredReadFrame), { flag: "wx", mode: 0o444 });
      const sandboxIndex = args.indexOf("--sandbox");
      if (sandboxIndex >= 0) args.splice(sandboxIndex, 2);
      const nodeDirectory = path.dirname(process.execPath);
      const isolation = [
        'default_permissions="writing-benchmark"',
        `permissions={ writing-benchmark={ filesystem={ ":root"="deny", ":minimal"="read", ${JSON.stringify(options.cwd)}="read", ${JSON.stringify(nodeDirectory)}="read" }, network={ enabled=false } } }`,
        'approval_policy="never"', 'features.skip_host_skill_discovery=true',
        'features.skill_search=false', 'features.plugins=false', 'features.apps=false',
        'features.browser_use=false', 'features.computer_use=false', 'features.shell_snapshot=false',
        'project_doc_max_bytes=0', 'shell_environment_policy.inherit="none"',
        `shell_environment_policy.set.PATH=${JSON.stringify(`${nodeDirectory}:/usr/bin:/bin:/usr/sbin:/sbin`)}`
      ];
      args.splice(args.indexOf("-"), 0, ...isolation.flatMap(value => ["--config", value]));
      args.splice(args.indexOf("-"), 0, "--config", `mcp_servers.benchmark_reader={command=${JSON.stringify(process.execPath)},args=[${JSON.stringify(serverFile)}],enabled_tools=["read_chunk"]}`);
    }
    if (configuration.provider === "claude" && !outputSchema) {
      args[args.indexOf("--tools") + 1] = "Read";
      // Stream events make progressive reads auditable; the normal runtime expects
      // one result object, so the adapter below presents the terminal result to it.
      args[args.indexOf("--output-format") + 1] = "stream-json";
      args.push("--verbose");
      if (requiredSkillReadTransport === "read-tool") args.push("--restricted", "--strict-mcp-config");
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
        ...(required.length ? { requiredSkillReads: inspectRequiredSkillReads(parseEvents(stdout), skillSnapshot, required, requiredSkillReadTransport, fixtureDirectoryPath, fixtureRealPath) } : {}),
        // The wrapper exposes Read to contestants; the generic receipt assumes tool-free calls.
        ...(configuration.provider === "claude" && !outputSchema ? { allowedTools: ["Read"] } : {}),
        runtimeVersion,
        ...(["mcp-chunks", "read-tool"].includes(requiredSkillReadTransport) ? { writingIsolation: { ...STORYTELLING_FROZEN_WORKSPACE_ISOLATION } } : {}),
        ...(requiredSkillReadTransport === "read-tool" ? { requiredSkillReadTransport, fileToolScope: "restricted-working-directory" } : {}),
        ...(requiredSkillReadTransport === "bounded-command" ? { requiredSkillReadTransport } : {}),
        ...(requiredSkillReadTransport === "mcp-chunks" ? { requiredSkillReadTransport, localReadTool: "benchmark_reader.read_chunk", localReadToolScope: "frozen-chunk-indices-only" } : {}),
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
      runtimeVersion,
      requestedConfiguration: { ...configuration },
      startedAt,
      completedAt: new Date().toISOString(),
      streamSha256: digest(stdout),
      observed: inspectEvidence(events, configuration, skillSnapshot, fixtureDirectoryPath),
      ...(required.length ? { requiredSkillReads: inspectRequiredSkillReads(events, skillSnapshot, required, requiredSkillReadTransport, fixtureDirectoryPath, fixtureRealPath) } : {})
    };
    // Keep the exact local temporary path out of user-facing error receipts.
    if (fixtureDirectoryPath && typeof error.context.stderr === "string") {
      error.context.stderr = error.context.stderr.replaceAll(fixtureDirectoryPath, "<fresh-workspace>");
    }
    throw error;
  }
}
