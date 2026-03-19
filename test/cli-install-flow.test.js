import test from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runCommandLine } from "../install/command-runner.js";

function createTemporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vasir-"));
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
      },
      {
        name: "roguelike",
        path: "skills/roguelike",
        entry: "SKILL.md",
        description: "Run structure and procedural dungeon design",
        category: "games",
        tags: ["games"],
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
    [
      "---",
      "name: react",
      "description: React component boundaries and effect discipline.",
      "category: frontend",
      "tags: [react]",
      "recommends: []",
      "version: 1.0.0",
      "---",
      "",
      "# React",
      "",
      "Use local state first."
    ].join("\n")
  );
  writeFile(
    path.join(repositoryDirectory, "skills", "roguelike", "SKILL.md"),
    [
      "---",
      "name: roguelike",
      "description: Run structure and procedural dungeon design.",
      "category: games",
      "tags: [games]",
      "recommends: []",
      "version: 1.0.0",
      "---",
      "",
      "# Roguelike",
      "",
      "Build run structure around clear escalation."
    ].join("\n")
  );

  runGitCommand(repositoryDirectory, ["init"]);
  runGitCommand(repositoryDirectory, ["config", "user.email", "test@example.com"]);
  runGitCommand(repositoryDirectory, ["config", "user.name", "Test Runner"]);
  runGitCommand(repositoryDirectory, ["add", "."]);
  runGitCommand(repositoryDirectory, ["commit", "-m", "fixture"]);

  return {
    repositoryDirectory,
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

test("init creates the canonical global catalog and compatibility aliases", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "init"], {
    homeDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  const globalCatalogDirectory = path.join(homeDirectory, ".agents", "vasir");
  assert.ok(fs.existsSync(globalCatalogDirectory));
  assert.equal(fs.realpathSync(path.join(homeDirectory, ".claude", "vasir")), fs.realpathSync(globalCatalogDirectory));
  assert.equal(fs.realpathSync(path.join(homeDirectory, ".codex", "vasir")), fs.realpathSync(globalCatalogDirectory));
  assert.match(capturedOutput.readStdout(), /Global catalog ready/);
});

test("update bootstraps the canonical global catalog when it is missing", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "update"], {
    homeDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  assert.ok(fs.existsSync(path.join(homeDirectory, ".agents", "vasir", "registry.json")));
  assert.match(capturedOutput.readStdout(), /Global catalog updated/);
});

test("list auto-initializes and prints grouped skills", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "list"], {
    homeDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  assert.ok(fs.existsSync(path.join(homeDirectory, ".agents", "vasir", "registry.json")));
  assert.match(capturedOutput.readStdout(), /games/);
  assert.match(capturedOutput.readStdout(), /roguelike - Run structure and procedural dungeon design/);
  assert.match(capturedOutput.readStdout(), /frontend/);
  assert.match(capturedOutput.readStdout(), /react - React component boundaries and effect discipline/);
});

test("add installs skills into repo-local .agents and repairs compatibility aliases", async () => {
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
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectDirectory, "AGENTS.md")));
  assert.equal(
    fs.realpathSync(path.join(projectDirectory, ".claude", "skills")),
    fs.realpathSync(path.join(projectDirectory, ".agents", "skills"))
  );
  assert.equal(
    fs.realpathSync(path.join(projectDirectory, ".codex", "skills")),
    fs.realpathSync(path.join(projectDirectory, ".agents", "skills"))
  );
  assert.match(capturedOutput.readStdout(), /Installed react/);
});

test("add installs into the repository root when invoked from a nested subdirectory", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const projectNestedDirectory = path.join(projectDirectory, "apps", "frontend");
  const capturedOutput = captureCommandWriters();

  fs.mkdirSync(projectNestedDirectory, { recursive: true });
  runGitCommand(projectDirectory, ["init"]);
  runGitCommand(projectDirectory, ["config", "user.email", "test@example.com"]);
  runGitCommand(projectDirectory, ["config", "user.name", "Test Runner"]);

  const statusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectNestedDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectDirectory, "AGENTS.md")));
  assert.ok(!fs.existsSync(path.join(projectNestedDirectory, ".agents")));
  assert.ok(!fs.existsSync(path.join(projectNestedDirectory, "AGENTS.md")));
});

test("add --replace refuses to overwrite a manual untracked project skill", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const replaceCommandOutput = captureCommandWriters();

  writeFile(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md"), "# Manual React\n");

  const replaceStatusCode = await runCommandLine(["node", "vasir", "add", "react", "--replace"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...replaceCommandOutput
  });

  assert.equal(replaceStatusCode, 1);
  assert.match(replaceCommandOutput.readStderr(), /PROJECT_SKILL_UNTRACKED/);
});

test("add refuses to overwrite an existing project skill", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();

  const firstCommandOutput = captureCommandWriters();
  const firstStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...firstCommandOutput
  });
  assert.equal(firstStatusCode, 0);

  const secondCommandOutput = captureCommandWriters();
  const secondStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...secondCommandOutput
  });
  assert.equal(secondStatusCode, 1);
  assert.match(secondCommandOutput.readStderr(), /Project skill already exists/);
});

test("add --replace refreshes an unmodified existing project skill from the global catalog", async () => {
  const { repositoryDirectory, repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();

  const firstCommandOutput = captureCommandWriters();
  const firstStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...firstCommandOutput
  });
  assert.equal(firstStatusCode, 0);

  const projectSkillFilePath = path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md");
  writeFile(path.join(repositoryDirectory, "skills", "react", "SKILL.md"), "# React Updated\n");
  runGitCommand(repositoryDirectory, ["add", "."]);
  runGitCommand(repositoryDirectory, ["commit", "-m", "update react skill"]);

  const updateCommandOutput = captureCommandWriters();
  const updateStatusCode = await runCommandLine(["node", "vasir", "update"], {
    homeDirectory,
    repositoryUrl,
    ...updateCommandOutput
  });
  assert.equal(updateStatusCode, 0);

  const replaceCommandOutput = captureCommandWriters();
  const replaceStatusCode = await runCommandLine(["node", "vasir", "add", "react", "--replace"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...replaceCommandOutput
  });

  assert.equal(replaceStatusCode, 0);
  assert.equal(fs.readFileSync(projectSkillFilePath, "utf8"), "# React Updated\n");
  assert.match(replaceCommandOutput.readStdout(), /Replaced react/);
});

test("add --replace refuses to overwrite a locally modified project skill", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();

  const firstCommandOutput = captureCommandWriters();
  const firstStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...firstCommandOutput
  });
  assert.equal(firstStatusCode, 0);

  const projectSkillFilePath = path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md");
  writeFile(projectSkillFilePath, "# Local Override\n");

  const replaceCommandOutput = captureCommandWriters();
  const replaceStatusCode = await runCommandLine(["node", "vasir", "add", "react", "--replace"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...replaceCommandOutput
  });

  assert.equal(replaceStatusCode, 1);
  assert.match(replaceCommandOutput.readStderr(), /PROJECT_SKILL_MODIFIED/);
});

test("add --replace refuses to delete unexpected local files inside a project skill", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();

  const firstCommandOutput = captureCommandWriters();
  const firstStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...firstCommandOutput
  });
  assert.equal(firstStatusCode, 0);

  writeFile(path.join(projectDirectory, ".agents", "skills", "react", "NOTES.md"), "local note\n");

  const replaceCommandOutput = captureCommandWriters();
  const replaceStatusCode = await runCommandLine(["node", "vasir", "add", "react", "--replace"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...replaceCommandOutput
  });

  assert.equal(replaceStatusCode, 1);
  assert.match(replaceCommandOutput.readStderr(), /PROJECT_SKILL_MODIFIED/);
});

test("update fails closed when the global catalog is dirty", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();

  const initOutput = captureCommandWriters();
  const initStatusCode = await runCommandLine(["node", "vasir", "init"], {
    homeDirectory,
    repositoryUrl,
    ...initOutput
  });
  assert.equal(initStatusCode, 0);

  const globalCatalogDirectory = path.join(homeDirectory, ".agents", "vasir");
  writeFile(path.join(globalCatalogDirectory, "LOCAL_OVERRIDE.md"), "dirty\n");

  const updateOutput = captureCommandWriters();
  const updateStatusCode = await runCommandLine(["node", "vasir", "update"], {
    homeDirectory,
    repositoryUrl,
    ...updateOutput
  });

  assert.equal(updateStatusCode, 1);
  assert.match(updateOutput.readStderr(), /uncommitted changes/);
});
