import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";
import { runStorytellingAgent, isStorytellingRequiredSkillReadReceiptCompatible } from "../cli/eval/storytelling-agent-runtime.js";

const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const files = [{ relativePath: "SKILL.md", contents: "A frozen fixture root.\n" },
  { relativePath: "references/test.md", contents: "Frozen Ω reference with exact bytes.\n".repeat(500) }]
  .map(file => ({ ...file, sha256: hash(file.contents), bytes: Buffer.byteLength(file.contents) }));
const snapshot = { schemaVersion: 1, skillName: "fixture", files,
  hash: hash(JSON.stringify(files.map(({ relativePath, sha256 }) => ({ relativePath, sha256 })))) };
const configuration = { id: "codex:gpt-5.6-luna@low", provider: "codex", model: "gpt-5.6-luna", reasoning: "low" };
const requiredSkillFiles = files.map(file => file.relativePath);

function spawnMcp({ mutate = item => item, plain = false } = {}) {
  return (_command, args, options) => {
    const config = args.find(arg => arg.startsWith("mcp_servers.benchmark_reader="));
    assert.ok(config);
    const serverPath = JSON.parse(config.match(/args=\[("[^"]+")\]/u)[1]);
    const instructionOption = args.find(arg => arg.startsWith("developer_instructions="));
    const instruction = instructionOption ? JSON.parse(instructionOption.slice("developer_instructions=".length)) : "";
    const indexes = plain ? [0] : [...instruction.matchAll(/^benchmark_reader\.read_chunk (\{.+\}) #/gmu)].map(match => JSON.parse(match[1]).index);
    const requests = [{ jsonrpc: "2.0", id: "init", method: "initialize", params: { protocolVersion: "2025-06-18" } },
      { jsonrpc: "2.0", id: "list", method: "tools/list" },
      ...indexes.map(index => ({ jsonrpc: "2.0", id: index, method: "tools/call", params: { name: "read_chunk", arguments: { index } } })),
      { jsonrpc: "2.0", id: "escape", method: "tools/call", params: { name: "read_chunk", arguments: { index: 0, path: "/outside" } } },
      { jsonrpc: "2.0", id: "negative", method: "tools/call", params: { name: "read_chunk", arguments: { index: -1 } } }];
    const responses = execFileSync(process.execPath, [serverPath], { input: requests.map(JSON.stringify).join("\n") + "\n", encoding: "utf8", cwd: options.cwd }).trim().split("\n").map(JSON.parse);
    assert.deepEqual(responses[1].result.tools.map(tool => tool.name), ["read_chunk"]);
    assert.equal(responses.find(response => response.id === "escape").result.isError, true);
    assert.equal(responses.find(response => response.id === "negative").result.isError, true);
    if (plain) { assert.equal(instructionOption, undefined); assert.equal(responses.find(response => response.id === 0).result.isError, true); }
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough(); child.kill = () => {};
    queueMicrotask(() => {
      const items = indexes.map(index => mutate({ type: "mcp_tool_call", id: `read-${index}`, server: "benchmark_reader", tool: "read_chunk",
        arguments: { index }, status: "completed", result: responses.find(response => response.id === index).result }));
      child.stdout.end([...items.filter(Boolean).map(item => ({ type: "item.completed", item })),
        { type: "item.completed", item: { type: "agent_message", text: "An outline." } }, { type: "turn.completed", usage: { input_tokens: 10, output_tokens: 3 } }].map(JSON.stringify).join("\n"));
      child.emit("close", 0, null);
    }); return child;
  };
}

test("local MCP transport returns exact full frozen bytes through bounded index-only reads", async () => {
  const result = await runStorytellingAgent({ configuration, promptText: "Outline", skillSnapshot: snapshot, requiredSkillFiles,
    requiredSkillReadTransport: "mcp-chunks", spawnImplementation: spawnMcp() });
  const receipt = result.runtimeReceipt.requiredSkillReads;
  assert.equal(result.runtimeReceipt.runtimeVersion, "progressive-frozen-skill-mcp-chunks-v1");
  assert.equal(receipt.status, "complete");
  assert.equal(receipt.policyVersion, "successful-frozen-mcp-chunks-v1");
  assert.ok(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles, receipt }));
});

for (const [name, mutate] of Object.entries({
  missing: item => item.arguments.index === 0 ? null : item,
  failed: item => ({ ...item, result: { ...item.result, isError: true } }),
  wrongServer: item => ({ ...item, server: "other" }),
  wrongTool: item => ({ ...item, tool: "other" }),
  wrongIndex: item => ({ ...item, arguments: { index: 1000 } }),
  emptyOutput: item => ({ ...item, result: { content: [], isError: false } }),
  alteredBytes: item => ({ ...item, result: { content: item.result.content.map(part => ({ ...part, text: part.text.replace("Frozen", "Changed") })), isError: false } }),
  unsuccessful: item => ({ ...item, status: "failed" })
})) test(`MCP verification rejects ${name} without replacing the answer`, async () => {
  const result = await runStorytellingAgent({ configuration, promptText: "Outline", skillSnapshot: snapshot, requiredSkillFiles,
    requiredSkillReadTransport: "mcp-chunks", spawnImplementation: spawnMcp({ mutate }) });
  assert.equal(result.text, "An outline."); assert.equal(result.runtimeReceipt.requiredSkillReads.status, "incomplete");
});

test("plain Codex arm exposes the identical local tool but has no frozen skill content", async () => {
  const result = await runStorytellingAgent({ configuration, promptText: "Outline", requiredSkillReadTransport: "mcp-chunks", spawnImplementation: spawnMcp({ plain: true }) });
  assert.equal(result.runtimeReceipt.skillHash, null);
  assert.equal(result.runtimeReceipt.instructionHash, null);
  assert.equal(result.runtimeReceipt.requiredSkillReads, undefined);
});
