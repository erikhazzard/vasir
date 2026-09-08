import childProcess from "node:child_process";
import { runStorytellingAgent } from "./storytelling-agent-runtime.js";

export const STORYTELLING_CREATION_ISOLATION_VERSION = "storytelling-creation-host-isolation-v1";

export function creationIsolationArguments(role = "creator") {
  if (!["creator", "judge"].includes(role)) throw new Error("Unknown creation runtime role.");
  return ["--enable", "skip_host_skill_discovery", "--disable", "skill_search",
    "--config", "project_doc_max_bytes=0",
    ...(role === "judge" ? ["--disable", "shell_tool", "--disable", "apps", "--disable", "multi_agent", "--config", 'developer_instructions=""'] : [])];
}

/** Explicit host-skill isolation for this new edition, without changing older runs. */
export async function runStorytellingCreationAgent({ role = "creator", spawnImplementation = childProcess.spawn, ...options }) {
  const isolationArguments = creationIsolationArguments(role);
  if (role === "judge" && (options.configuration.provider !== "codex" || options.skillSnapshot)) {
    throw new Error("Creation judges use the declared Codex seats and explicit inline context, never a staged skill.");
  }
  let actualArguments = null;
  const spawnIsolated = (command, originalArguments, spawnOptions) => {
    const args = [...originalArguments];
    if (options.configuration.provider === "codex") {
      const insertion = args.lastIndexOf("-");
      if (insertion < 0) throw new Error("Fresh Codex stdin invocation expected.");
      args.splice(insertion, 0, ...isolationArguments);
    }
    actualArguments = args.map((argument, index) => {
      if (args[index - 1] === "--append-system-prompt" || argument.startsWith("developer_instructions=")) {
        return role === "judge" ? 'developer_instructions=""' : "<frozen-skill-instruction>";
      }
      return argument.replaceAll(spawnOptions.cwd, "<fresh-workspace>");
    });
    return spawnImplementation(command, args, spawnOptions);
  };
  const isolation = {
    version: STORYTELLING_CREATION_ISOLATION_VERSION,
    role,
    hostSkillDiscovery: options.configuration.provider === "codex" ? "explicitly-disabled" : "existing-claude-safe-mode-and-disabled-slash-commands",
    toolPolicy: role === "judge" ? "no-tool-calls-accepted" : "progressive-frozen-skill-files",
    hiddenProviderInstructionsVerified: false
  };
  try {
    const result = await runStorytellingAgent({ ...options, spawnImplementation: spawnIsolated });
    return { ...result, runtimeReceipt: { ...result.runtimeReceipt, cliArguments: actualArguments, creationIsolation: isolation } };
  } catch (error) {
    error.context = { ...error.context, creationIsolation: isolation, cliArguments: actualArguments };
    throw error;
  }
}
