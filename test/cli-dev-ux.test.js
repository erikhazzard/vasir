import test from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runCommandLine } from "../install/command-runner.js";

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
  writeFile(path.join(repositoryDirectory, "templates", "AGENTS.md"), "# Project Agents\n");
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
  assert.match(capturedOutput.readStdout(), /vasir add <skill> \[skill...\] \[--json\] \[--replace\]/);
  assert.match(capturedOutput.readStdout(), /vasir eval run <skill> \[--json\] \[--model <name>\]/);
  assert.match(capturedOutput.readStdout(), /vasir --version/);
  assert.match(capturedOutput.readStdout(), /--json/);
  assert.match(capturedOutput.readStdout(), /--replace/);
  assert.match(capturedOutput.readStdout(), /--model openai, --model opus, --model mock/i);
  assert.match(capturedOutput.readStdout(), /mutate the global catalog under ~\/\.agents\/vasir/i);
  assert.match(capturedOutput.readStdout(), /mutates only the current repo/i);
  assert.match(capturedOutput.readStdout(), /auto-initializes the global catalog if needed/i);
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

test("init fails with a structured actionable error when git is unavailable", async () => {
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "init", "--json"], {
    homeDirectory: createTemporaryDirectory(),
    repositoryUrl: "file:///unused",
    spawnSyncImplementation() {
      return {
        error: Object.assign(new Error("spawn git ENOENT"), { code: "ENOENT" }),
        status: null,
        stdout: "",
        stderr: ""
      };
    },
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.code, "GIT_NOT_FOUND");
  assert.match(parsedError.suggestion, /Install Git/);
  assert.equal(parsedError.command, "init");
  assert.equal(
    parsedError.docsRef,
    `${DOCS_BASE_URL}/docs/troubleshooting.md#git-and-node-prerequisites`
  );
});
