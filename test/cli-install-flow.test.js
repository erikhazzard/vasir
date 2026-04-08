import test from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runCommandLine } from "../cli/command-runner.js";

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
        path: ".agents/skills/react",
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
        path: ".agents/skills/roguelike",
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
  writeFile(path.join(repositoryDirectory, "templates", "agents", "AGENTS.md"), "# Project Agents\n");
  writeFile(path.join(repositoryDirectory, "templates", "agents", "profiles", "frontend.md"), "# Frontend Agents\n");
  writeFile(path.join(repositoryDirectory, "templates", "agents", "profiles", "backend.md"), "# Backend Agents\n");
  writeFile(path.join(repositoryDirectory, "templates", "agents", "profiles", "ios.md"), "# iOS Agents\n");
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
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
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "roguelike", "SKILL.md"),
    `---
name: roguelike
description: Run structure and procedural dungeon design.
category: games
tags: [games]
recommends: []
version: 1.0.0
---

# Roguelike

Build run structure around clear escalation.`
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

function createFakeTtyInputStream() {
  return new (class extends EventEmitter {
    constructor() {
      super();
      this.isTTY = true;
      this.isRaw = false;
    }

    setRawMode(nextRawMode) {
      this.isRaw = nextRawMode;
    }
  })();
}

function createFakeTtyOutputStream() {
  const writes = [];

  return {
    isTTY: true,
    columns: 100,
    write(chunk) {
      writes.push(chunk);
    },
    readOutput() {
      return writes.join("");
    }
  };
}

test("init creates the canonical global catalog and compatibility aliases", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const currentWorkingDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "init"], {
    homeDirectory,
    currentWorkingDirectory,
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

test("init inside a repo installs and tracks the full catalog", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  runGitCommand(projectDirectory, ["init"]);
  runGitCommand(projectDirectory, ["config", "user.email", "test@example.com"]);
  runGitCommand(projectDirectory, ["config", "user.name", "Test Runner"]);
  writeFile(
    path.join(projectDirectory, "package.json"),
    `${JSON.stringify({ name: "space-admin-console", dependencies: { react: "^19.0.0" } }, null, 2)}\n`
  );
  writeFile(path.join(projectDirectory, "src", "components", "Button.tsx"), "export function Button() { return null; }\n");

  const statusCode = await runCommandLine(["node", "vasir", "init"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "roguelike", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectDirectory, "AGENTS.md")));
  const projectConfig = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, ".agents", "vasir.json"), "utf8")
  );
  assert.equal(projectConfig.tracking.mode, "all");
  const installState = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, ".agents", "vasir-install-state.json"), "utf8")
  );
  assert.equal(installState.catalog.trackingMode, "all");
  assert.match(capturedOutput.readStdout(), /Tracking Full catalog/);
});

test("update bootstraps the canonical global catalog when it is missing", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const currentWorkingDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "update"], {
    homeDirectory,
    currentWorkingDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  assert.ok(fs.existsSync(path.join(homeDirectory, ".agents", "vasir", "registry.json")));
  assert.match(capturedOutput.readStdout(), /Global catalog updated/);
});

test("update refreshes Vasir-managed project-local skills when run inside the repo", async () => {
  const { repositoryDirectory, repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const addOutput = captureCommandWriters();
  const updateOutput = captureCommandWriters();

  const addStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...addOutput
  });

  assert.equal(addStatusCode, 0);
  assert.match(
    fs.readFileSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md"), "utf8"),
    /Use local state first\./
  );

  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `---
name: react
description: React component boundaries and effect discipline.
category: frontend
tags: [react]
recommends: []
version: 1.1.0
---

# React

Use AbortController in async effects.`
  );
  runGitCommand(repositoryDirectory, ["add", "."]);
  runGitCommand(repositoryDirectory, ["commit", "-m", "update react skill"]);

  const updateStatusCode = await runCommandLine(["node", "vasir", "update"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...updateOutput
  });

  assert.equal(updateStatusCode, 0);
  assert.match(updateOutput.readStdout(), /Updated react/);
  assert.match(
    fs.readFileSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md"), "utf8"),
    /Use AbortController in async effects\./
  );
});

test("adopt snapshots an existing project-local skill tree without copying files", async () => {
  const { repositoryDirectory, repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  writeFile(
    path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md"),
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

  const statusCode = await runCommandLine(["node", "vasir", "adopt", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.command, "adopt");
  assert.deepEqual(parsedOutput.adoptedSkills, ["react"]);
  assert.deepEqual(parsedOutput.skippedSkills, []);
  assert.equal(parsedOutput.trackingMode, "selected");
  const projectConfig = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, ".agents", "vasir.json"), "utf8")
  );
  assert.equal(projectConfig.tracking.mode, "selected");
  assert.deepEqual(projectConfig.tracking.skillNames, ["react"]);
  assert.equal(
    fs.realpathSync(path.join(projectDirectory, ".claude", "skills")),
    fs.realpathSync(path.join(projectDirectory, ".agents", "skills"))
  );
  assert.equal(
    fs.realpathSync(path.join(projectDirectory, ".codex", "skills")),
    fs.realpathSync(path.join(projectDirectory, ".agents", "skills"))
  );

  const installState = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, ".agents", "vasir-install-state.json"), "utf8")
  );
  assert.equal(installState.catalog.trackingMode, "selected");
  assert.equal(installState.skills.react.provenance.sourcePath, ".agents/skills/react");

  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `---
name: react
description: React component boundaries and effect discipline.
category: frontend
tags: [react]
recommends: []
version: 1.1.0
---

# React

Prefer narrow component ownership.`
  );
  runGitCommand(repositoryDirectory, ["add", "."]);
  runGitCommand(repositoryDirectory, ["commit", "-m", "update react skill after adopt"]);

  const dryRunOutput = captureCommandWriters();
  const dryRunStatusCode = await runCommandLine(["node", "vasir", "update", "--dry-run", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...dryRunOutput
  });

  assert.equal(dryRunStatusCode, 0);
  const dryRunResult = JSON.parse(dryRunOutput.readStdout());
  assert.deepEqual(dryRunResult.updatedSkills, ["react"]);
});

test("repair rebuilds repo metadata and aliases from an existing skill tree", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const projectDirectory = createTemporaryDirectory();
  const repairOutput = captureCommandWriters();

  writeFile(
    path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md"),
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

  const repairStatusCode = await runCommandLine(["node", "vasir", "repair", "--json"], {
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...repairOutput
  });

  assert.equal(repairStatusCode, 0);
  const repairResult = JSON.parse(repairOutput.readStdout());
  assert.equal(repairResult.command, "repair");
  assert.equal(repairResult.trackingMode, "selected");
  assert.equal(repairResult.trackingSource, "installed-tree");
  assert.equal(repairResult.rebuiltProjectConfig, true);
  assert.equal(repairResult.rebuiltInstallState, true);
  assert.deepEqual(repairResult.restoredSkills, []);
  assert.equal(
    fs.realpathSync(path.join(projectDirectory, ".claude", "skills")),
    fs.realpathSync(path.join(projectDirectory, ".agents", "skills"))
  );
  assert.equal(
    fs.realpathSync(path.join(projectDirectory, ".codex", "skills")),
    fs.realpathSync(path.join(projectDirectory, ".agents", "skills"))
  );
  const projectConfig = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, ".agents", "vasir.json"), "utf8")
  );
  assert.equal(projectConfig.tracking.mode, "selected");
  assert.deepEqual(projectConfig.tracking.skillNames, ["react"]);
  const installState = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, ".agents", "vasir-install-state.json"), "utf8")
  );
  assert.equal(installState.catalog.trackingMode, "selected");
  assert.ok(installState.skills.react);
});

test("repair restores missing tracked skills from explicit repo config", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const addOutput = captureCommandWriters();
  const repairOutput = captureCommandWriters();

  const addStatusCode = await runCommandLine(["node", "vasir", "add", "react", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...addOutput
  });

  assert.equal(addStatusCode, 0);
  fs.rmSync(path.join(projectDirectory, ".agents", "skills", "react"), { recursive: true, force: true });

  const repairStatusCode = await runCommandLine(["node", "vasir", "repair", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...repairOutput
  });

  assert.equal(repairStatusCode, 0);
  const repairResult = JSON.parse(repairOutput.readStdout());
  assert.equal(repairResult.command, "repair");
  assert.equal(repairResult.trackingMode, "selected");
  assert.equal(repairResult.trackingSource, "project-config");
  assert.deepEqual(repairResult.restoredSkills, ["react"]);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md")));
});

test("update installs newly added catalog skills for repos tracking the full catalog", async () => {
  const { repositoryDirectory, repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const initOutput = captureCommandWriters();
  const updateOutput = captureCommandWriters();

  runGitCommand(projectDirectory, ["init"]);
  runGitCommand(projectDirectory, ["config", "user.email", "test@example.com"]);
  runGitCommand(projectDirectory, ["config", "user.name", "Test Runner"]);

  const initStatusCode = await runCommandLine(["node", "vasir", "init"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...initOutput
  });

  assert.equal(initStatusCode, 0);
  assert.ok(!fs.existsSync(path.join(projectDirectory, ".agents", "skills", "platformer", "SKILL.md")));

  const nextRegistry = JSON.parse(fs.readFileSync(path.join(repositoryDirectory, "registry.json"), "utf8"));
  nextRegistry.skills.push({
    name: "platformer",
    path: ".agents/skills/platformer",
    entry: "SKILL.md",
    description: "Tight jump arcs and collision feel",
    category: "games",
    tags: ["games"],
    version: "1.0.0",
    recommends: [],
    files: ["SKILL.md"]
  });
  writeFile(path.join(repositoryDirectory, "registry.json"), `${JSON.stringify(nextRegistry, null, 2)}\n`);
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "platformer", "SKILL.md"),
    `---
name: platformer
description: Tight jump arcs and collision feel.
category: games
tags: [games]
recommends: []
version: 1.0.0
---

# Platformer

Tune jump arcs before adding content.`
  );
  runGitCommand(repositoryDirectory, ["add", "."]);
  runGitCommand(repositoryDirectory, ["commit", "-m", "add platformer skill"]);

  const updateStatusCode = await runCommandLine(["node", "vasir", "update"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...updateOutput
  });

  assert.equal(updateStatusCode, 0);
  assert.match(updateOutput.readStdout(), /Installed platformer/);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "platformer", "SKILL.md")));
});

test("update follows explicit repo config when a selected tracked skill directory is missing", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const addOutput = captureCommandWriters();
  const updateOutput = captureCommandWriters();

  const addStatusCode = await runCommandLine(["node", "vasir", "add", "react", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...addOutput
  });

  assert.equal(addStatusCode, 0);
  const projectConfig = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, ".agents", "vasir.json"), "utf8")
  );
  assert.equal(projectConfig.tracking.mode, "selected");
  assert.deepEqual(projectConfig.tracking.skillNames, ["react"]);

  fs.rmSync(path.join(projectDirectory, ".agents", "skills", "react"), { recursive: true, force: true });

  const updateStatusCode = await runCommandLine(["node", "vasir", "update", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...updateOutput
  });

  assert.equal(updateStatusCode, 0);
  const updateResult = JSON.parse(updateOutput.readStdout());
  assert.deepEqual(updateResult.installedSkills, ["react"]);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md")));
});

test("diff shows the exact modified tracked files before update", async () => {
  const { repositoryDirectory, repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const addOutput = captureCommandWriters();
  const diffOutput = captureCommandWriters();

  const addStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...addOutput
  });

  assert.equal(addStatusCode, 0);

  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `---
name: react
description: React component boundaries and effect discipline.
category: frontend
tags: [react]
recommends: []
version: 1.1.0
---

# React

Use AbortController in async effects.
Prefer narrow component ownership.`
  );
  runGitCommand(repositoryDirectory, ["add", "."]);
  runGitCommand(repositoryDirectory, ["commit", "-m", "update react skill for diff"]);

  const diffStatusCode = await runCommandLine(["node", "vasir", "diff", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...diffOutput
  });

  assert.equal(diffStatusCode, 0);
  const diffResult = JSON.parse(diffOutput.readStdout());
  assert.equal(diffResult.command, "diff");
  assert.equal(diffResult.overallStatus, "changes");
  assert.equal(diffResult.hasDiff, true);
  assert.equal(diffResult.hasBlockedSkills, false);
  assert.deepEqual(diffResult.requestedSkills, []);
  assert.equal(diffResult.skills.length, 1);
  assert.equal(diffResult.skills[0].skillName, "react");
  assert.equal(diffResult.skills[0].status, "update");
  assert.equal(diffResult.skills[0].fileChanges.length, 1);
  assert.equal(diffResult.skills[0].fileChanges[0].status, "modified");
  assert.equal(diffResult.skills[0].fileChanges[0].format, "text");
  assert.match(diffResult.skills[0].fileChanges[0].projectRelativePath, /\.agents\/skills\/react\/SKILL\.md$/);
  assert.match(diffResult.skills[0].fileChanges[0].unifiedDiff, /--- a\/\.agents\/skills\/react\/SKILL\.md/);
  assert.match(diffResult.skills[0].fileChanges[0].unifiedDiff, /\+Use AbortController in async effects\./);
  assert.match(diffResult.skills[0].fileChanges[0].unifiedDiff, /\+Prefer narrow component ownership\./);
});

test("diff shows newly added full-catalog skills before update", async () => {
  const { repositoryDirectory, repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const initOutput = captureCommandWriters();
  const diffOutput = captureCommandWriters();

  runGitCommand(projectDirectory, ["init"]);
  runGitCommand(projectDirectory, ["config", "user.email", "test@example.com"]);
  runGitCommand(projectDirectory, ["config", "user.name", "Test Runner"]);

  const initStatusCode = await runCommandLine(["node", "vasir", "init"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...initOutput
  });

  assert.equal(initStatusCode, 0);

  const nextRegistry = JSON.parse(fs.readFileSync(path.join(repositoryDirectory, "registry.json"), "utf8"));
  nextRegistry.skills.push({
    name: "platformer",
    path: ".agents/skills/platformer",
    entry: "SKILL.md",
    description: "Tight jump arcs and collision feel",
    category: "games",
    tags: ["games"],
    version: "1.0.0",
    recommends: [],
    files: ["SKILL.md"]
  });
  writeFile(path.join(repositoryDirectory, "registry.json"), `${JSON.stringify(nextRegistry, null, 2)}\n`);
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "platformer", "SKILL.md"),
    `---
name: platformer
description: Tight jump arcs and collision feel.
category: games
tags: [games]
recommends: []
version: 1.0.0
---

# Platformer

Tune jump arcs before adding content.`
  );
  runGitCommand(repositoryDirectory, ["add", "."]);
  runGitCommand(repositoryDirectory, ["commit", "-m", "add platformer skill for diff"]);

  const diffStatusCode = await runCommandLine(["node", "vasir", "diff", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...diffOutput
  });

  assert.equal(diffStatusCode, 0);
  const diffResult = JSON.parse(diffOutput.readStdout());
  assert.equal(diffResult.overallStatus, "changes");
  assert.equal(diffResult.skills.length, 1);
  assert.equal(diffResult.skills[0].skillName, "platformer");
  assert.equal(diffResult.skills[0].status, "install");
  assert.deepEqual(
    diffResult.skills[0].fileChanges.map((fileChange) => fileChange.projectRelativePath),
    [".agents/skills/platformer/SKILL.md"]
  );
});

test("diff --exit-code returns shell-friendly nonzero output when tracked changes exist", async () => {
  const { repositoryDirectory, repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const addOutput = captureCommandWriters();
  const diffOutput = captureCommandWriters();

  const addStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...addOutput
  });

  assert.equal(addStatusCode, 0);

  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `---
name: react
description: React component boundaries and effect discipline.
category: frontend
tags: [react]
recommends: []
version: 1.1.0
---

# React

Use AbortController in async effects.`
  );

  const diffStatusCode = await runCommandLine(["node", "vasir", "diff", "--json", "--exit-code"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...diffOutput
  });

  assert.equal(diffStatusCode, 1);
  const diffResult = JSON.parse(diffOutput.readStdout());
  assert.equal(diffResult.command, "diff");
  assert.equal(diffResult.status, "success");
  assert.equal(diffResult.hasDiff, true);
});

test("update --dry-run previews repo-local refreshes without mutating files", async () => {
  const { repositoryDirectory, repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const addOutput = captureCommandWriters();
  const updateOutput = captureCommandWriters();

  const addStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...addOutput
  });

  assert.equal(addStatusCode, 0);

  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `---
name: react
description: React component boundaries and effect discipline.
category: frontend
tags: [react]
recommends: []
version: 1.1.0
---

# React

Use AbortController in async effects.`
  );

  const updateStatusCode = await runCommandLine(["node", "vasir", "update", "--dry-run"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...updateOutput
  });

  assert.equal(updateStatusCode, 0);
  assert.match(updateOutput.readStdout(), /Would update react/);
  assert.match(
    fs.readFileSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md"), "utf8"),
    /Use local state first\./
  );
  assert.match(
    fs.readFileSync(path.join(homeDirectory, ".agents", "vasir", ".agents", "skills", "react", "SKILL.md"), "utf8"),
    /Use local state first\./
  );
});

test("add records install provenance for safer repo updates", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();

  const addStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...captureCommandWriters()
  });

  assert.equal(addStatusCode, 0);
  const installState = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, ".agents", "vasir-install-state.json"), "utf8")
  );

  assert.equal(installState.schemaVersion, 3);
  assert.equal(installState.catalog.packageVersion, "0.1.0");
  assert.equal(typeof installState.catalog.sourceHash, "string");
  assert.ok(installState.catalog.sourceHash.length > 0);
  assert.equal(installState.catalog.trackingMode, "selected");
  assert.equal(installState.skills.react.provenance.skillVersion, "1.0.0");
  assert.equal(installState.skills.react.provenance.sourcePath, ".agents/skills/react");
  assert.equal(installState.skills.react.provenance.installedByVersion, "0.1.0");
  assert.equal(typeof installState.skills.react.provenance.installedAt, "string");
});

test("add and update honor --repo-root for monorepo subprojects", async () => {
  const { repositoryDirectory, repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const monorepoDirectory = createTemporaryDirectory();
  const appDirectory = path.join(monorepoDirectory, "packages", "web");
  const addOutput = captureCommandWriters();
  const updateOutput = captureCommandWriters();

  runGitCommand(monorepoDirectory, ["init"]);
  runGitCommand(monorepoDirectory, ["config", "user.email", "test@example.com"]);
  runGitCommand(monorepoDirectory, ["config", "user.name", "Test Runner"]);
  writeFile(
    path.join(appDirectory, "package.json"),
    `${JSON.stringify({ name: "web", dependencies: { react: "^19.0.0" } }, null, 2)}\n`
  );
  writeFile(path.join(appDirectory, "src", "components", "Button.tsx"), "export function Button() { return null; }\n");

  const addStatusCode = await runCommandLine(
    ["node", "vasir", "add", "react", "--repo-root", appDirectory],
    {
      homeDirectory,
      currentWorkingDirectory: monorepoDirectory,
      repositoryUrl,
      ...addOutput
    }
  );

  assert.equal(addStatusCode, 0);
  assert.ok(fs.existsSync(path.join(appDirectory, ".agents", "skills", "react", "SKILL.md")));
  assert.ok(!fs.existsSync(path.join(monorepoDirectory, ".agents", "skills", "react", "SKILL.md")));

  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `---
name: react
description: React component boundaries and effect discipline.
category: frontend
tags: [react]
recommends: []
version: 1.1.0
---

# React

Use AbortController in async effects.`
  );

  const updateStatusCode = await runCommandLine(
    ["node", "vasir", "update", "--repo-root", appDirectory],
    {
      homeDirectory,
      currentWorkingDirectory: monorepoDirectory,
      repositoryUrl,
      ...updateOutput
    }
  );

  assert.equal(updateStatusCode, 0);
  assert.match(updateOutput.readStdout(), /Updated react/);
  assert.match(
    fs.readFileSync(path.join(appDirectory, ".agents", "skills", "react", "SKILL.md"), "utf8"),
    /Use AbortController in async effects\./
  );
});

test("update fails closed when a Vasir-managed project-local skill has local edits", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const addOutput = captureCommandWriters();
  const updateOutput = captureCommandWriters();

  const addStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...addOutput
  });

  assert.equal(addStatusCode, 0);
  writeFile(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md"), "# locally edited\n");

  const updateStatusCode = await runCommandLine(["node", "vasir", "update", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...updateOutput
  });

  assert.equal(updateStatusCode, 1);
  const parsedError = JSON.parse(updateOutput.readStderr());
  assert.equal(parsedError.command, "update");
  assert.equal(parsedError.code, "PROJECT_SKILL_MODIFIED");
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

test("add all installs every catalog skill into the repository root", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "add", "all"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...capturedOutput
  });

  assert.equal(statusCode, 0);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "roguelike", "SKILL.md")));
  assert.match(capturedOutput.readStdout(), /Installed react/);
  assert.match(capturedOutput.readStdout(), /Installed roguelike/);
});

test("remove deletes installed project-local skills and updates install state", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const addOutput = captureCommandWriters();
  const removeOutput = captureCommandWriters();

  const addStatusCode = await runCommandLine(["node", "vasir", "add", "react", "roguelike"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...addOutput
  });

  assert.equal(addStatusCode, 0);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "roguelike", "SKILL.md")));

  const removeStatusCode = await runCommandLine(["node", "vasir", "remove", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...removeOutput
  });

  assert.equal(removeStatusCode, 0);
  assert.ok(!fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react")));
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "roguelike", "SKILL.md")));
  assert.equal(
    fs.realpathSync(path.join(projectDirectory, ".claude", "skills")),
    fs.realpathSync(path.join(projectDirectory, ".agents", "skills"))
  );
  assert.equal(
    fs.realpathSync(path.join(projectDirectory, ".codex", "skills")),
    fs.realpathSync(path.join(projectDirectory, ".agents", "skills"))
  );

  const installState = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, ".agents", "vasir-install-state.json"), "utf8")
  );
  assert.deepEqual(Object.keys(installState.skills).sort(), ["roguelike"]);
  assert.match(removeOutput.readStdout(), /Removed react/);
});

test("remove reports already-absent skills and prunes stale install-state entries", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const addOutput = captureCommandWriters();
  const removeOutput = captureCommandWriters();

  const addStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...addOutput
  });

  assert.equal(addStatusCode, 0);
  fs.rmSync(path.join(projectDirectory, ".agents", "skills", "react"), { recursive: true, force: true });

  const removeStatusCode = await runCommandLine(["node", "vasir", "remove", "react", "--json"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...removeOutput
  });

  assert.equal(removeStatusCode, 0, removeOutput.readStderr());
  const parsedOutput = JSON.parse(removeOutput.readStdout());
  assert.deepEqual(parsedOutput.removedSkills, []);
  assert.deepEqual(parsedOutput.missingSkills, ["react"]);

  const installState = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, ".agents", "vasir-install-state.json"), "utf8")
  );
  assert.deepEqual(installState.skills, {});
});

test("remove prompts interactively when no skill names are provided", async () => {
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const addOutput = captureCommandWriters();
  const inputStream = createFakeTtyInputStream();
  const outputStream = createFakeTtyOutputStream();
  const stderrOutput = [];

  const addStatusCode = await runCommandLine(["node", "vasir", "add", "react"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    ...addOutput
  });

  assert.equal(addStatusCode, 0);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md")));

  const removePromise = runCommandLine(["node", "vasir", "remove"], {
    homeDirectory,
    currentWorkingDirectory: projectDirectory,
    repositoryUrl,
    inputStream,
    outputStream,
    stdoutWriter: (message) => outputStream.write(message),
    stderrWriter: (message) => stderrOutput.push(message)
  });

  setTimeout(() => {
    inputStream.emit("keypress", " ", { name: "space" });
    inputStream.emit("keypress", "\r", { name: "return" });
  }, 0);

  const removeStatusCode = await removePromise;
  assert.equal(removeStatusCode, 0, stderrOutput.join(""));
  assert.ok(!fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react")));
  assert.match(outputStream.readOutput(), /Choose skills to remove/i);
  assert.match(outputStream.readOutput(), /Removed react/i);
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
  writeFile(path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"), "# React Updated\n");
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
  const currentWorkingDirectory = createTemporaryDirectory();

  const initOutput = captureCommandWriters();
  const initStatusCode = await runCommandLine(["node", "vasir", "init"], {
    homeDirectory,
    currentWorkingDirectory,
    repositoryUrl,
    ...initOutput
  });
  assert.equal(initStatusCode, 0);

  const globalCatalogDirectory = path.join(homeDirectory, ".agents", "vasir");
  writeFile(path.join(globalCatalogDirectory, "LOCAL_OVERRIDE.md"), "dirty\n");

  const updateOutput = captureCommandWriters();
  const updateStatusCode = await runCommandLine(["node", "vasir", "update"], {
    homeDirectory,
    currentWorkingDirectory,
    repositoryUrl,
    ...updateOutput
  });

  assert.equal(updateStatusCode, 1);
  assert.match(updateOutput.readStderr(), /local changes/i);
});
