import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { runStorytellingAgent } from "./storytelling-agent-runtime.js";

export const DUNGEON_MASTER_RUNTIME_VERSION = "dm-restricted-progressive-v1";
export const DUNGEON_MASTER_CONFIGURATION = Object.freeze({ id: "codex:gpt-6-astra@ultra", provider: "codex", model: "gpt-6-astra", reasoning: "ultra" });
export const REQUIRED_DM_FILES = ["references/adventure-design.md"];
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

export function disabledHostSkillConfiguration(environmentVariables = process.env) {
  const hostHome = environmentVariables.HOME;
  const authHome = environmentVariables.CODEX_HOME ?? path.join(hostHome, ".codex");
  const files = new Set();
  const visited = new Set();
  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    const real = fs.realpathSync(directory);
    if (visited.has(real)) return;
    visited.add(real);
    if (fs.existsSync(path.join(directory, "SKILL.md"))) {
      files.add(path.join(directory, "SKILL.md")); files.add(path.join(real, "SKILL.md"));
    }
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory() || entry.isSymbolicLink() && fs.statSync(candidate).isDirectory()) visit(candidate);
    }
  }
  for (const directory of [path.join(hostHome, ".agents/skills"), path.join(hostHome, ".codex/skills"), path.join(authHome, "skills"), "/etc/codex/skills"]) visit(directory);
  return `skills={ config=[${[...files].sort().map((file) => `{path=${JSON.stringify(file)},enabled=false}`).join(",")}] }`;
}

/** The host CLI retains its existing auth context; only model-executed commands
 * receive this restricted filesystem/environment policy. Host skill discovery,
 * project instruction loading, plugins and external resource tools are disabled.
 * Neither auth values nor process environment values are serialized. */
export function dungeonMasterIsolationArguments(arguments_, workingDirectory) {
  const args = [...arguments_];
  const oldSandbox = args.indexOf("--sandbox");
  if (oldSandbox >= 0) args.splice(oldSandbox, 2);
  const nodeDirectory = path.dirname(process.execPath);
  const overrides = [
    'default_permissions="dm-benchmark"',
    `permissions={ dm-benchmark={ filesystem={ ":root"="deny", ":minimal"="read", ${JSON.stringify(workingDirectory)}="read", ${JSON.stringify(nodeDirectory)}="read" }, network={ enabled=false } } }`,
    'approval_policy="never"',
    'features.skip_host_skill_discovery=true',
    'features.skill_search=false',
    'features.plugins=false',
    'features.apps=false',
    'features.browser_use=false',
    'features.computer_use=false',
    'features.shell_snapshot=false',
    'project_doc_max_bytes=0',
    'shell_environment_policy.inherit="none"',
    `shell_environment_policy.set.PATH=${JSON.stringify(`${nodeDirectory}:/usr/bin:/bin:/usr/sbin:/sbin`)}`,
    'web_search="disabled"'
  ];
  args.splice(args.indexOf("-"), 0, ...overrides.flatMap((override) => ["--config", override]));
  return args;
}

export async function runDungeonMasterAgent({ promptText, skillSnapshot = null, requiredSkillFiles = skillSnapshot ? REQUIRED_DM_FILES : [],
  configuration = DUNGEON_MASTER_CONFIGURATION, evidenceDirectory, timeoutMs = 20 * 60 * 1000,
  outputSchema = null, spawnImplementation = childProcess.spawn, environmentVariables = process.env }) {
  if (configuration.provider !== "codex") throw new Error("DM v1 requires the declared Codex configuration.");
  if (!evidenceDirectory) throw new Error("An evidence directory is required.");
  fs.mkdirSync(evidenceDirectory, { recursive: true, mode: 0o700 });
  let stdout = "";
  let stderr = "";
  let actualArguments = [];
  let workspace;
  const cliEnvironment = Object.fromEntries(["PATH", "HOME", "TMPDIR", "SHELL", "USER", "LOGNAME", "LANG", "LC_ALL", "CODEX_HOME"]
    .filter((name) => typeof environmentVariables[name] === "string").map((name) => [name, environmentVariables[name]]));
  const invoke = (command, args, options) => {
    workspace = options.cwd;
    const isolated = dungeonMasterIsolationArguments(args, workspace);
    isolated.splice(isolated.indexOf("-"), 0, "--config", disabledHostSkillConfiguration(cliEnvironment));
    actualArguments = isolated.map((arg) => arg.startsWith("developer_instructions=")
      ? `<frozen-skill-instruction:${hash(arg.replaceAll(workspace, "<fresh-workspace>"))}>`
      : arg.startsWith("skills=") ? `<disabled-global-skills:${hash(arg)}>`
      : arg.replaceAll(workspace, "<fresh-workspace>"));
    const child = spawnImplementation(command, isolated, options);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    return child;
  };
  function retain() {
    fs.writeFileSync(path.join(evidenceDirectory, "stdout.jsonl"), stdout, { mode: 0o600 });
    fs.writeFileSync(path.join(evidenceDirectory, "stderr.txt"), stderr, { mode: 0o600 });
    return { stdoutSha256: hash(stdout), stderrSha256: hash(stderr), stdoutBytes: Buffer.byteLength(stdout), stderrBytes: Buffer.byteLength(stderr), rawStreamsRetained: true };
  }
  try {
    const result = await runStorytellingAgent({ configuration, promptText, skillSnapshot, requiredSkillFiles, outputSchema,
      timeoutMs, environmentVariables: cliEnvironment, spawnImplementation: invoke });
    const streams = retain();
    const usageEvent = stdout.split(/\r?\n/u).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } })
      .filter((event) => event.type === "turn.completed").at(-1);
    const receipt = { ...result.runtimeReceipt, inheritedRuntimeVersion: result.runtimeReceipt.runtimeVersion,
      runtimeVersion: DUNGEON_MASTER_RUNTIME_VERSION, cliArguments: actualArguments,
      isolation: { policy: "restricted-root-deny-workspace-read-v1", hostSkillDiscovery: false, projectInstructions: false,
        externalResources: false, shellEnvironment: "minimal-path-only", hostEnvironment: "allowlisted-runtime-and-auth-context-only",
        hostSkillDirectoryReads: "discovery-disabled", authentication: "existing-host-cli-context-not-serialized" },
      providerUsage: usageEvent?.usage ?? null, ...streams };
    return { ...result, outputText: result.text, runtimeReceipt: receipt };
  } catch (error) {
    const streams = retain();
    error.context = { ...(error.context ?? {}), ...streams, runtimeVersion: DUNGEON_MASTER_RUNTIME_VERSION, cliArguments: actualArguments };
    throw error;
  }
}
