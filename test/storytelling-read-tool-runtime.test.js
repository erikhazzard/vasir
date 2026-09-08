import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { runStorytellingAgent, isStorytellingRequiredSkillReadReceiptCompatible,
  STORYTELLING_READ_TOOL_RUNTIME_VERSION, STORYTELLING_READ_TOOL_POLICY_VERSION } from "../cli/eval/storytelling-agent-runtime.js";

const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const configuration = { id: "claude:claude-opus-5@low", provider: "claude", model: "claude-opus-5", reasoning: "low" };
const files = [{ relativePath: "SKILL.md", contents: "---\nname: fixture\n---\nUse the reference." },
  { relativePath: "references/test.md", contents: "First 🌌\n\n12\tcontent stays exact\n".repeat(400) }]
  .map(file => ({ ...file, sha256: hash(file.contents), bytes: Buffer.byteLength(file.contents) }));
const snapshot = { schemaVersion: 1, skillName: "fixture", files,
  hash: hash(JSON.stringify(files.map(({ relativePath, sha256 }) => ({ relativePath, sha256 })))) };
const requiredSkillFiles = files.map(file => file.relativePath);

function fakeSpawn(change = events => events, inspect = () => {}) {
  return (command, args, options) => {
    inspect(command, args, options);
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough(); child.kill = () => {};
    queueMicrotask(() => {
      const instruction = args[args.indexOf("--append-system-prompt") + 1] ?? "";
      const events = [...instruction.matchAll(/^Read (".+") in full\./gmu)].flatMap((match, index) => {
        const filePath = JSON.parse(match[1]);
        assert.equal(fs.statSync(filePath).mode & 0o222, 0);
        const body = fs.readFileSync(filePath, "utf8").split("\n").map((line, i) => `${String(i + 1).padStart(6)}→${line}`).join("\n");
        return [{ type: "assistant", message: { content: [{ type: "tool_use", id: `read-${index}`, name: "Read", input: { file_path: filePath } }] } },
          { type: "user", message: { content: [{ type: "tool_result", tool_use_id: `read-${index}`, content: body }] } }];
      });
      events.push({ type: "result", subtype: "success", is_error: false, result: "An outline.", session_id: "fixture",
        modelUsage: { main: { canonicalModel: "claude-opus-5", outputTokens: 3 } }, usage: { input_tokens: 10, output_tokens: 3 } });
      child.stdout.end(change(events).map(JSON.stringify).join("\n")); child.emit("close", 0, null);
    });
    return child;
  };
}

test("opt-in Claude required reads verify exact UTF-8 output and retain isolated raw stream", async () => {
  let raw = "";
  const spawn = fakeSpawn(events => events, (command, args) => {
    assert.equal(command, "claude");
    for (const flag of ["--safe-mode", "--restricted", "--strict-mcp-config", "--disable-slash-commands"]) assert.ok(args.includes(flag));
    assert.equal(args[args.indexOf("--tools") + 1], "Read");
  });
  const result = await runStorytellingAgent({ configuration, promptText: "Outline", skillSnapshot: snapshot, requiredSkillFiles,
    requiredSkillReadTransport: "read-tool", spawnImplementation: (...args) => {
      const child = spawn(...args); child.stdout.on("data", chunk => { raw += chunk; }); return child;
    } });
  assert.equal(result.runtimeReceipt.runtimeVersion, STORYTELLING_READ_TOOL_RUNTIME_VERSION);
  const receipt = result.runtimeReceipt.requiredSkillReads;
  assert.equal(receipt.policyVersion, STORYTELLING_READ_TOOL_POLICY_VERSION);
  assert.equal(receipt.status, "complete");
  assert.ok(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles, receipt }));
  assert.equal(result.runtimeReceipt.streamSha256, hash(raw));
  assert.ok(raw.includes('"tool_result"'));
});

for (const [name, mutate] of Object.entries({
  failed: events => { events[1].message.content[0].is_error = true; return events; },
  wrongPath: events => { events[0].message.content[0].input.file_path += ".other"; return events; },
  noCall: events => events.slice(1),
  assistantClaim: events => { events[1].type = "assistant"; return events; },
  omittedByte: events => { events[1].message.content[0].content = events[1].message.content[0].content.replace("Use the reference", "Use reference"); return events; },
  missingChunk: events => events.slice(2),
  mismatchedId: events => { events[1].message.content[0].tool_use_id = "unknown"; return events; }
})) test(`read-tool proof rejects ${name} without discarding the answer`, async () => {
  const result = await runStorytellingAgent({ configuration, promptText: "Outline", skillSnapshot: snapshot, requiredSkillFiles,
    requiredSkillReadTransport: "read-tool", spawnImplementation: fakeSpawn(mutate) });
  assert.equal(result.text, "An outline.");
  assert.equal(result.runtimeReceipt.requiredSkillReads.status, "incomplete");
  assert.equal(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles,
    receipt: result.runtimeReceipt.requiredSkillReads }), false);
});

test("clean Claude arm has the identical Read tool and workspace boundary but no skill injection", async () => {
  const result = await runStorytellingAgent({ configuration, promptText: "Outline", requiredSkillReadTransport: "read-tool",
    spawnImplementation: fakeSpawn(events => events, (_command, args) => {
      assert.ok(args.includes("--restricted")); assert.ok(args.includes("--safe-mode"));
      assert.equal(args[args.indexOf("--tools") + 1], "Read");
      assert.equal(args.includes("--append-system-prompt"), false);
    }) });
  assert.equal(result.runtimeReceipt.skillHash, null);
  assert.equal(result.runtimeReceipt.requiredSkillReads, undefined);
});

test("bounded Codex command transport limits payloads to 3000 bytes and never reinterprets legacy receipts", async () => {
  const result = await runStorytellingAgent({ configuration: { id: "codex:gpt-5.6-luna@low", provider: "codex", model: "gpt-5.6-luna", reasoning: "low" },
    promptText: "Outline", skillSnapshot: snapshot, requiredSkillFiles, requiredSkillReadTransport: "bounded-command",
    spawnImplementation: (_command, args, options) => {
      const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough(); child.kill = () => {};
      queueMicrotask(() => {
        const instruction = JSON.parse(args.find(arg => arg.startsWith("developer_instructions=")).slice("developer_instructions=".length));
        const reads = [...instruction.matchAll(/^node '([^']+)' (\d+) #/gmu)].map((match, i) => {
          const output = execFileSync(process.execPath, [match[1], match[2]], { encoding: "utf8", cwd: options.cwd });
          const metadata = JSON.parse(output.match(/^<<<BENCHMARK_SKILL_READ (.+)>>>/u)[1]);
          assert.ok(metadata.bytes <= 3000);
          return { type: "item.completed", item: { type: "command_execution", id: `read-${i}`, command: `node '${match[1]}' ${match[2]}`, status: "completed", exit_code: 0, aggregated_output: output } };
        });
        child.stdout.end([...reads, { type: "item.completed", item: { type: "agent_message", text: "An outline." } },
          { type: "turn.completed", usage: { input_tokens: 10, output_tokens: 3 } }].map(JSON.stringify).join("\n")); child.emit("close", 0, null);
      }); return child;
    } });
  const receipt = result.runtimeReceipt.requiredSkillReads;
  assert.equal(result.runtimeReceipt.runtimeVersion, "progressive-frozen-skill-bounded-command-v1");
  assert.equal(receipt.status, "complete");
  assert.ok(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles, receipt }));
  assert.equal(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles,
    receipt: { ...receipt, policyVersion: "successful-frozen-chunk-reads-v1" } }), false);
});
