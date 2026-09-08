// Separate transport/read-delivery probe. No story generation and no benchmark score.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import { runStorytellingAgent, validateStorytellingSkillSnapshot } from "../../cli/eval/storytelling-agent-runtime.js";

const hash = text => crypto.createHash("sha256").update(text).digest("hex");
const files = [
  ["SKILL.md", "---\nname: runtime-read-probe\ndescription: Synthetic benchmark plumbing probe only.\n---\nRead the required reference completely and then follow the user's reply instruction.\n"],
  ["references/probe.md", Array.from({ length: 1500 }, (_, index) => `Transport probe line ${index}: this is deliberately not a story or a writing lesson. Ω.\n`).join("")]
].map(([relativePath, contents]) => ({ relativePath, contents, sha256: hash(contents), bytes: Buffer.byteLength(contents) }));
const snapshot = validateStorytellingSkillSnapshot({ schemaVersion: 1, skillName: "runtime-read-probe", files,
  hash: hash(JSON.stringify(files.map(({ relativePath, sha256 }) => ({ relativePath, sha256 })))) });
let stdout = "", stderr = "";
const result = await runStorytellingAgent({
  configuration: { id: "codex:gpt-5.6-luna@low", provider: "codex", model: "gpt-5.6-luna", reasoning: "low" },
  promptText: "After completing the required file reads, reply with exactly READ_PROBE_COMPLETE.",
  requiredSkillReadTransport: process.argv[3] ?? "command",
  spawnImplementation: (command, args, options) => {
    const child = childProcess.spawn(command, args, options);
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    return child;
  },
  skillSnapshot: snapshot, requiredSkillFiles: ["SKILL.md", "references/probe.md"]
});
const evidence = { kind: "excluded-runtime-read-probe", benchmarkGeneration: false,
  output: result.text, durationMs: result.durationMs, usage: result.usage, runtimeReceipt: result.runtimeReceipt };
if (process.argv[2]) {
  const destination = path.resolve(process.argv[2]);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(`${destination}.stdout.jsonl`, stdout, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(`${destination}.stderr.txt`, stderr, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx" });
}
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
if (result.runtimeReceipt.requiredSkillReads.status !== "complete" || result.text.trim() !== "READ_PROBE_COMPLETE") process.exitCode = 1;
