import test from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runCommandLine } from "../cli/command-runner.js";

const DOCS_BASE_URL = "https://github.com/erikhazzard/vasir/blob/main";

function createTemporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vasir-dev-ux-"));
}

function writeFile(filePath, fileContents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, fileContents);
}

function runGitCommand(repositoryDirectory, argumentList) {
  const commandResult = childProcess.spawnSync("git", argumentList, {
    cwd: repositoryDirectory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (commandResult.error) {
    throw commandResult.error;
  }

  if (commandResult.status !== 0) {
    throw new Error((commandResult.stderr || commandResult.stdout || "git command failed").trim());
  }

  return (commandResult.stdout || "").trim();
}

function createFixtureRepository() {
  const repositoryDirectory = createTemporaryDirectory();
  const registry = {
    version: "0.1.0",
    repo: "https://github.com/erikhazzard/vasir",
    raw_base: "https://raw.githubusercontent.com/erikhazzard/vasir/main",
    skills: [
      {
        name: "react",
        path: "skills/react",
        entry: "SKILL.md",
        description: "React component boundaries and effect discipline",
        category: "frontend",
        tags: ["react"],
        version: "1.0.0",
        recommends: [],
        files: ["SKILL.md"]
      }
    ]
  };

  writeFile(path.join(repositoryDirectory, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);
  writeFile(
    path.join(repositoryDirectory, "templates", "agents", "AGENTS.md"),
    `# AGENTS.md: [Project Name] Root Manifest
<!-- vasir:profile:generic -->

**Last Updated:** [YYYY-MM-DD - update alongside major architectural PRs]
<!-- vasir:purpose:start -->
**Purpose:** [Describe this repository in 2-3 repo-specific sentences. Replace this block first. State the product or user loop, what correctness means here, and what agents must optimize for.]
<!-- vasir:purpose:end -->
<!-- vasir:routing:start -->
* **[Example] Core Area:** If touching \`/src/\`, you must first read that directory's local \`AGENTS.md\`.
<!-- vasir:routing:end -->
`
  );
  writeFile(
    path.join(repositoryDirectory, "templates", "agents", "profiles", "frontend.md"),
    `# AGENTS.md: [Project Name] Root Manifest
<!-- vasir:profile:frontend -->

**Last Updated:** [YYYY-MM-DD - update alongside major architectural PRs]
<!-- vasir:purpose:start -->
**Purpose:** [Describe this frontend repository in 2-3 repo-specific sentences. Replace this block first. State the main user experience, what correctness means here, and what agents must optimize for.]
<!-- vasir:purpose:end -->
## 1. Topography & Routing Protocol (The Map)
<!-- vasir:routing:start -->
* **UI Surface:** If touching \`/src/components/\`, you must first read that directory's local \`AGENTS.md\`.
<!-- vasir:routing:end -->
`
  );
  writeFile(
    path.join(repositoryDirectory, "templates", "agents", "profiles", "backend.md"),
    `# AGENTS.md: [Project Name] Root Manifest
<!-- vasir:profile:backend -->

**Last Updated:** [YYYY-MM-DD - update alongside major architectural PRs]
<!-- vasir:purpose:start -->
**Purpose:** [Describe this backend repository in 2-3 repo-specific sentences. Replace this block first. State the core API or system contract, what correctness means here, and what agents must optimize for.]
<!-- vasir:purpose:end -->
<!-- vasir:routing:start -->
* **API Surface:** If touching \`/src/api/\`, you must first read that directory's local \`AGENTS.md\`.
<!-- vasir:routing:end -->
`
  );
  writeFile(
    path.join(repositoryDirectory, "templates", "agents", "profiles", "ios.md"),
    `# AGENTS.md: [Project Name] Root Manifest
<!-- vasir:profile:ios -->

**Last Updated:** [YYYY-MM-DD - update alongside major architectural PRs]
<!-- vasir:purpose:start -->
**Purpose:** [Describe this iOS repository in 2-3 repo-specific sentences. Replace this block first. State the main user experience, what correctness means here, and what agents must optimize for.]
<!-- vasir:purpose:end -->
<!-- vasir:routing:start -->
* **App Lifecycle:** If touching \`/ios/App/\`, you must first read that directory's local \`AGENTS.md\`.
<!-- vasir:routing:end -->
`
  );
  writeFile(
    path.join(repositoryDirectory, "skills", "react", "SKILL.md"),
    `---
name: react
description: React component boundaries and effect discipline.
category: frontend
tags: [react]
recommends: []
version: 1.0.0
---

# React

Use local state first.`
  );

  runGitCommand(repositoryDirectory, ["init"]);
  runGitCommand(repositoryDirectory, ["config", "user.email", "test@example.com"]);
  runGitCommand(repositoryDirectory, ["config", "user.name", "Test Runner"]);
  runGitCommand(repositoryDirectory, ["add", "."]);
  runGitCommand(repositoryDirectory, ["commit", "-m", "fixture"]);

  return {
    repositoryUrl: pathToFileURL(repositoryDirectory).href
  };
}

function captureCommandWriters() {
  const standardOutput = [];
  const standardError = [];

  return {
    stdoutWriter(message) {
      standardOutput.push(message);
    },
    stderrWriter(message) {
      standardError.push(message);
    },
    readStdout() {
      return standardOutput.join("");
    },
    readStderr() {
      return standardError.join("");
    }
  };
}

test("help output documents json support across commands and the explicit replace path", async () => {
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "--help"], capturedOutput);

  assert.equal(statusCode, 0);
  assert.match(capturedOutput.readStdout(), /^vasir/m);
  assert.match(capturedOutput.readStdout(), /vasir init \[--json\]/);
  assert.match(capturedOutput.readStdout(), /vasir update \[--json\]/);
  assert.match(capturedOutput.readStdout(), /vasir list \[--json\]/);
  assert.match(
    capturedOutput.readStdout(),
    /vasir add <skill> \[skill...\] \[--json\] \[--replace\] \[--agents-profile <name>\]/
  );
  assert.match(capturedOutput.readStdout(), /vasir remove <skill> \[skill...\] \[--json\]/);
  assert.match(capturedOutput.readStdout(), /vasir agents init <profile> \[--json\] \[--replace\]/);
  assert.match(capturedOutput.readStdout(), /vasir agents draft-purpose \[--json\] \[--write\] \[--model <name>\]/);
  assert.match(capturedOutput.readStdout(), /vasir agents draft-routing \[--json\] \[--write\]/);
  assert.match(capturedOutput.readStdout(), /vasir agents validate \[--json\]/);
  assert.match(capturedOutput.readStdout(), /vasir eval run <skill> \[--json\] \[--model <name>\] \[--trials <count>\]/);
  assert.match(capturedOutput.readStdout(), /vasir eval inspect <skill> \[run-id\] \[--json\]/);
  assert.match(capturedOutput.readStdout(), /vasir eval rescore <skill> \[run-id\] \[--json\]/);
  assert.match(capturedOutput.readStdout(), /vasir --version/);
  assert.match(capturedOutput.readStdout(), /vasir add all/i);
  assert.match(capturedOutput.readStdout(), /--json/);
  assert.match(capturedOutput.readStdout(), /--replace/);
  assert.match(capturedOutput.readStdout(), /--repo-root <path>/);
  assert.match(capturedOutput.readStdout(), /--dry-run/);
  assert.match(capturedOutput.readStdout(), /--write/);
  assert.match(capturedOutput.readStdout(), /--trials <count>/);
  assert.match(capturedOutput.readStdout(), /--model openai, --model opus, --model mock/i);
  assert.match(capturedOutput.readStdout(), /init inside a repo installs the full catalog into that repo/i);
  assert.match(capturedOutput.readStdout(), /refreshes the skills tracked by the current repo/i);
  assert.match(capturedOutput.readStdout(), /mutates only the current repo/i);
  assert.match(capturedOutput.readStdout(), /agents init mutates only the current repo root/i);
  assert.match(capturedOutput.readStdout(), /agents validate fails closed/i);
  assert.match(capturedOutput.readStdout(), /auto-initializes the global catalog if needed/i);
  assert.match(capturedOutput.readStdout(), /remove mutates only the current repo root/i);
  assert.doesNotMatch(capturedOutput.readStdout(), /vasir doctor/);
  assert.doesNotMatch(capturedOutput.readStdout(), /npx vasir/);
});

test("version output gives a beginner the installed cli version immediately", async () => {
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "--version"], capturedOutput);

  assert.equal(statusCode, 0);
  assert.equal(capturedOutput.readStdout().trim(), "vasir 0.1.0");
  assert.equal(capturedOutput.readStderr(), "");
});

test("list supports json output for automation and llm consumers", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "list", "--json"], {
    homeDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.command, "list");
  assert.equal(parsedOutput.status, "success");
  assert.equal(parsedOutput.skills.length, 1);
  assert.equal(parsedOutput.skills[0].name, "react");
});

test("unknown skills return a structured json error with a next-step suggestion", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "add", "unknown-skill", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "add");
  assert.equal(parsedError.status, "error");
  assert.equal(parsedError.code, "UNKNOWN_SKILL");
  assert.match(parsedError.suggestion, /vasir list/);
  assert.equal(parsedError.docsRef, `${DOCS_BASE_URL}/docs/cli-reference.md#add`);
});

test("unknown agents profiles fail before add mutates project skills or AGENTS", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(
    ["node", "vasir", "add", "react", "--agents-profile", "desktop", "--json"],
    {
      homeDirectory,
      currentWorkingDirectory: projectDirectory,
      repositoryUrl,
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "add");
  assert.equal(parsedError.status, "error");
  assert.equal(parsedError.code, "AGENTS_PROFILE_UNKNOWN");
  assert.ok(!fs.existsSync(path.join(projectDirectory, ".agents")));
  assert.ok(!fs.existsSync(path.join(projectDirectory, "AGENTS.md")));
});

test("replace is rejected outside the add command", async () => {
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "list", "--replace", "--json"], {
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "list");
  assert.equal(parsedError.status, "error");
  assert.equal(parsedError.code, "INVALID_COMMAND_FLAG");
});

test("--model is rejected outside the eval command", async () => {
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "list", "--model", "mock", "--json"], {
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "list");
  assert.equal(parsedError.status, "error");
  assert.equal(parsedError.code, "INVALID_COMMAND_FLAG");
});

test("--write is rejected outside agents draft-purpose", async () => {
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "list", "--write", "--json"], {
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "list");
  assert.equal(parsedError.status, "error");
  assert.equal(parsedError.code, "INVALID_COMMAND_FLAG");
});

test("--agents-profile is rejected outside the add command", async () => {
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "list", "--agents-profile", "frontend", "--json"], {
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "list");
  assert.equal(parsedError.status, "error");
  assert.equal(parsedError.code, "INVALID_COMMAND_FLAG");
});

test("--model requires a value", async () => {
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "eval", "run", "react", "--json", "--model"], {
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "eval");
  assert.equal(parsedError.status, "error");
  assert.equal(parsedError.code, "MODEL_FLAG_VALUE_REQUIRED");
});

test("doctor is not part of the public command surface", async () => {
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "doctor", "--json"], {
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "doctor");
  assert.equal(parsedError.status, "error");
  assert.equal(parsedError.code, "UNKNOWN_COMMAND");
  assert.equal(
    parsedError.docsRef,
    `${DOCS_BASE_URL}/docs/troubleshooting.md#unknown-command-or-flag`
  );
});

test("text add output tells a beginner exactly where Vasir wrote project skills", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  assert.match(capturedOutput.readStdout(), /Installed react/);
  assert.match(
    capturedOutput.readStdout(),
    new RegExp(
      path
        .join(projectDirectory, ".agents", "skills")
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    )
  );
});

test("agents init writes a stack-specific starter with the project name and purpose placeholder", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  writeFile(
    path.join(projectDirectory, "package.json"),
    `${JSON.stringify({ name: "space-admin-console" }, null, 2)}\n`
  );

  const statusCode = await runCommandLine(["node", "vasir", "agents", "init", "frontend", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.command, "agents");
  assert.equal(parsedOutput.status, "success");
  assert.equal(parsedOutput.subcommand, "init");
  assert.equal(parsedOutput.profile, "frontend");
  assert.equal(parsedOutput.projectRootDirectory, projectDirectory);

  const agentsFilePath = path.join(projectDirectory, "AGENTS.md");
  const agentsText = fs.readFileSync(agentsFilePath, "utf8");
  assert.match(agentsText, /# AGENTS\.md: space-admin-console Root Manifest/);
  assert.match(agentsText, /<!-- vasir:profile:frontend -->/);
  assert.match(agentsText, /\*\*Last Updated:\*\* \d{4}-\d{2}-\d{2} - update alongside major architectural PRs/);
  assert.match(agentsText, /Replace this block first\./);
});

test("add can install skills and seed a stack-specific AGENTS starter in one command", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  writeFile(
    path.join(projectDirectory, "package.json"),
    `${JSON.stringify({ name: "space-admin-console" }, null, 2)}\n`
  );

  const statusCode = await runCommandLine(
    ["node", "vasir", "add", "react", "--agents-profile", "frontend", "--json"],
    {
      homeDirectory,
      currentWorkingDirectory: projectDirectory,
      repositoryUrl,
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0);
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.command, "add");
  assert.equal(parsedOutput.status, "success");
  assert.equal(parsedOutput.agentsProfile, "frontend");
  assert.equal(parsedOutput.wroteAgentsFile, true);

  const agentsText = fs.readFileSync(path.join(projectDirectory, "AGENTS.md"), "utf8");
  assert.match(agentsText, /<!-- vasir:profile:frontend -->/);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md")));
});

test("add all installs the full catalog into the current repo", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  writeFile(
    path.join(projectDirectory, "package.json"),
    `${JSON.stringify({ name: "space-admin-console" }, null, 2)}\n`
  );

  const statusCode = await runCommandLine(["node", "vasir", "add", "all", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.command, "add");
  assert.equal(parsedOutput.status, "success");
  assert.deepEqual(parsedOutput.installedSkills, ["react"]);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md")));
});

test("add rejects mixing all with specific skill names", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "add", "all", "react", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "add");
  assert.equal(parsedError.code, "ALL_SKILLS_REQUEST_CONFLICT");
  assert.match(parsedError.message, /cannot be combined/i);
});

test("add infers a stronger AGENTS profile when the repo shape is obvious", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  writeFile(
    path.join(projectDirectory, "package.json"),
    `${JSON.stringify({ name: "space-admin-console", dependencies: { react: "^19.0.0" } }, null, 2)}\n`
  );
  writeFile(path.join(projectDirectory, "src", "components", "Button.tsx"), "export function Button() { return null; }\n");

  const statusCode = await runCommandLine(["node", "vasir", "add", "react", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.command, "add");
  assert.equal(parsedOutput.status, "success");
  assert.equal(parsedOutput.agentsProfile, "frontend");
  assert.equal(parsedOutput.agentsProfileSource, "inferred");
  assert.equal(parsedOutput.wroteAgentsFile, true);
  assert.match(
    fs.readFileSync(path.join(projectDirectory, "AGENTS.md"), "utf8"),
    /<!-- vasir:profile:frontend -->/
  );
});

test("agents draft-purpose can replace the untouched purpose placeholder with a repo-aware draft", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedInitOutput = captureCommandWriters();

  writeFile(
    path.join(projectDirectory, "package.json"),
    `${JSON.stringify({ name: "vasir-app", description: "Repo-aware AGENTS scaffolding" }, null, 2)}\n`
  );
  writeFile(
    path.join(projectDirectory, "README.md"),
    "# Vasir App\n\nThis repo ships tooling and markdown for agent guidance.\n"
  );

  const initStatusCode = await runCommandLine(["node", "vasir", "agents", "init", "backend", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedInitOutput
  });
  assert.equal(initStatusCode, 0);

  const capturedDraftOutput = captureCommandWriters();
  const draftStatusCode = await runCommandLine(
    ["node", "vasir", "agents", "draft-purpose", "--model", "mock", "--write", "--json"],
    {
      currentWorkingDirectory: projectDirectory,
      ...capturedDraftOutput
    }
  );

  assert.equal(draftStatusCode, 0);
  const parsedOutput = JSON.parse(capturedDraftOutput.readStdout());
  assert.equal(parsedOutput.command, "agents");
  assert.equal(parsedOutput.status, "success");
  assert.equal(parsedOutput.subcommand, "draft-purpose");
  assert.equal(parsedOutput.model, "mock:skill-aware");
  assert.equal(parsedOutput.wrotePurpose, true);
  assert.match(parsedOutput.purpose, /tooling and authored markdown/i);

  const agentsText = fs.readFileSync(path.join(projectDirectory, "AGENTS.md"), "utf8");
  assert.doesNotMatch(agentsText, /<!-- vasir:purpose:start -->/);
  assert.doesNotMatch(agentsText, /Replace this block first\./);
  assert.match(agentsText, /\*\*Purpose:\*\* This repository appears to ship tooling and authored markdown/i);
});

test("agents draft-routing can replace the Section 1 placeholder with repo-aware lanes", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedInitOutput = captureCommandWriters();

  writeFile(path.join(projectDirectory, "src", "components", "Button.tsx"), "export function Button() { return null; }\n");
  writeFile(path.join(projectDirectory, "src", "styles", "tokens.css"), ":root {}\n");

  const initStatusCode = await runCommandLine(["node", "vasir", "agents", "init", "frontend", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedInitOutput
  });
  assert.equal(initStatusCode, 0);

  const capturedDraftOutput = captureCommandWriters();
  const draftStatusCode = await runCommandLine(
    ["node", "vasir", "agents", "draft-routing", "--write", "--json"],
    {
      currentWorkingDirectory: projectDirectory,
      ...capturedDraftOutput
    }
  );

  assert.equal(draftStatusCode, 0);
  const parsedOutput = JSON.parse(capturedDraftOutput.readStdout());
  assert.equal(parsedOutput.command, "agents");
  assert.equal(parsedOutput.status, "success");
  assert.equal(parsedOutput.subcommand, "draft-routing");
  assert.equal(parsedOutput.wroteRouting, true);
  assert.ok(parsedOutput.routingLines.some((line) => line.includes("/src/components/")));

  const agentsText = fs.readFileSync(path.join(projectDirectory, "AGENTS.md"), "utf8");
  assert.match(agentsText, /<!-- vasir:routing:start -->/);
  assert.match(agentsText, /\/src\/components\//);
  assert.doesNotMatch(agentsText, /\[Example\]/);
});

test("agents validate fails closed on leftover scaffold markers and passes once the file is clean", async () => {
  const projectDirectory = createTemporaryDirectory();
  const capturedInvalidOutput = captureCommandWriters();

  writeFile(
    path.join(projectDirectory, "AGENTS.md"),
    `# AGENTS.md: [Project Name] Root Manifest
> EDIT THESE FIRST
<!-- vasir:purpose:start -->
**Purpose:** [Describe this repository in 2-3 repo-specific sentences. Replace this block first.]
<!-- vasir:purpose:end -->
`
  );

  const invalidStatusCode = await runCommandLine(["node", "vasir", "agents", "validate", "--json"], {
    currentWorkingDirectory: projectDirectory,
    ...capturedInvalidOutput
  });

  assert.equal(invalidStatusCode, 1);
  const parsedError = JSON.parse(capturedInvalidOutput.readStderr());
  assert.equal(parsedError.command, "agents");
  assert.equal(parsedError.code, "AGENTS_VALIDATION_FAILED");
  assert.ok(Array.isArray(parsedError.context.issues));
  assert.ok(parsedError.context.issues.length >= 2);

  writeFile(
    path.join(projectDirectory, "AGENTS.md"),
    `# AGENTS.md: Clean Root Manifest

**Last Updated:** 2026-03-21 - update alongside major architectural PRs
**Purpose:** This repository ships a clean AGENTS manifest for deterministic local agent work.
`
  );

  const capturedValidOutput = captureCommandWriters();
  const validStatusCode = await runCommandLine(["node", "vasir", "agents", "validate", "--json"], {
    currentWorkingDirectory: projectDirectory,
    ...capturedValidOutput
  });

  assert.equal(validStatusCode, 0);
  const parsedOutput = JSON.parse(capturedValidOutput.readStdout());
  assert.equal(parsedOutput.command, "agents");
  assert.equal(parsedOutput.subcommand, "validate");
  assert.deepEqual(parsedOutput.issues, []);
});

test("agents validate fails when a routed lane points at a directory without a scoped AGENTS file", async () => {
  const projectDirectory = createTemporaryDirectory();
  const capturedInvalidOutput = captureCommandWriters();

  fs.mkdirSync(path.join(projectDirectory, "src", "components"), { recursive: true });
  writeFile(
    path.join(projectDirectory, "AGENTS.md"),
    `# AGENTS.md: Clean Root Manifest

**Last Updated:** 2026-03-21 - update alongside major architectural PRs
**Purpose:** This repository ships a clean AGENTS manifest for deterministic local agent work.

## 1. Topography & Routing Protocol (The Map)

* **UI Surface:** If touching \`/src/components/\`, you must first read that directory's local \`AGENTS.md\` before changing component structure.
`
  );

  const invalidStatusCode = await runCommandLine(["node", "vasir", "agents", "validate", "--json"], {
    currentWorkingDirectory: projectDirectory,
    ...capturedInvalidOutput
  });

  assert.equal(invalidStatusCode, 1);
  const parsedError = JSON.parse(capturedInvalidOutput.readStderr());
  assert.equal(parsedError.command, "agents");
  assert.equal(parsedError.code, "AGENTS_VALIDATION_FAILED");
  assert.ok(parsedError.context.issues.some((issue) => issue.code === "SCOPED_AGENTS_MISSING"));

  writeFile(
    path.join(projectDirectory, "src", "components", "AGENTS.md"),
    "# UI Lane Manifest\n"
  );

  const capturedValidOutput = captureCommandWriters();
  const validStatusCode = await runCommandLine(["node", "vasir", "agents", "validate", "--json"], {
    currentWorkingDirectory: projectDirectory,
    ...capturedValidOutput
  });

  assert.equal(validStatusCode, 0);
});

test("add success supports json output for automation consumers", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "add", "react", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.command, "add");
  assert.equal(parsedOutput.status, "success");
  assert.equal(parsedOutput.projectRootDirectory, projectDirectory);
  assert.deepEqual(parsedOutput.installedSkills, ["react"]);
  assert.deepEqual(parsedOutput.replacedSkills, []);
});

test("replace on an untracked manual skill returns a structured json error with docs guidance", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  writeFile(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md"), "# Manual React\n");

  const statusCode = await runCommandLine(["node", "vasir", "add", "react", "--replace", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "add");
  assert.equal(parsedError.status, "error");
  assert.equal(parsedError.code, "PROJECT_SKILL_UNTRACKED");
  assert.equal(
    parsedError.docsRef,
    `${DOCS_BASE_URL}/docs/troubleshooting.md#replace-safety-errors`
  );
});

test("init rejects unsupported remote catalog overrides with structured guidance", async () => {
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "init", "--json"], {
    homeDirectory: createTemporaryDirectory(),
    repositoryUrl: "https://example.com/vasir.git",
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.code, "CATALOG_SOURCE_UNSUPPORTED");
  assert.match(parsedError.suggestion, /local directory path/i);
  assert.equal(parsedError.command, "init");
  assert.equal(
    parsedError.docsRef,
    `${DOCS_BASE_URL}/docs/troubleshooting.md#global-catalog-problems`
  );
});
