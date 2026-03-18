import test from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function createTemporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vasir-package-"));
}

function writeFile(filePath, fileContents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, fileContents);
}

function runCommand(commandName, argumentList, currentWorkingDirectory, environmentVariables = {}) {
  const commandResult = childProcess.spawnSync(commandName, argumentList, {
    cwd: currentWorkingDirectory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ...environmentVariables
    }
  });

  if (commandResult.error) {
    throw commandResult.error;
  }

  return commandResult;
}

function runGitCommand(repositoryDirectory, argumentList) {
  const commandResult = runCommand("git", argumentList, repositoryDirectory);

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
  writeFile(path.join(repositoryDirectory, "skills", "react", "SKILL.md"), "# React\n");
  writeFile(
    path.join(repositoryDirectory, "skills", "react", "meta.json"),
    `${JSON.stringify(
      {
        name: "react",
        version: "1.0.0",
        description: "React component boundaries and effect discipline",
        category: "frontend",
        tags: ["react"],
        recommends: [],
        files: ["SKILL.md"]
      },
      null,
      2
    )}\n`
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

test("npm pack produces a runnable vasir binary with help and add support", () => {
  const packDirectory = createTemporaryDirectory();
  const { repositoryUrl } = createFixtureRepository();
  const homeDirectory = createTemporaryDirectory();
  const projectDirectory = createTemporaryDirectory();
  const npmCacheDirectory = path.join(packDirectory, "npm-cache");
  const npmEnvironmentVariables = {
    npm_config_cache: npmCacheDirectory
  };
  const packResult = runCommand("npm", ["pack", REPO_ROOT], packDirectory, npmEnvironmentVariables);
  assert.equal(packResult.status, 0, packResult.stderr);

  const tarballFileName = packResult.stdout.trim().split("\n").at(-1);
  const installPrefixDirectory = path.join(packDirectory, "prefix");
  const installResult = runCommand(
    "npm",
    ["install", "--prefix", installPrefixDirectory, path.join(packDirectory, tarballFileName)],
    packDirectory,
    npmEnvironmentVariables
  );
  assert.equal(installResult.status, 0, installResult.stderr);

  const binaryPath = path.join(
    installPrefixDirectory,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "vasir.cmd" : "vasir"
  );

  const helpResult = runCommand(binaryPath, ["--help"], packDirectory);
  assert.equal(helpResult.status, 0, helpResult.stderr);
  assert.match(helpResult.stdout, /vasir add <skill> \[skill...\] \[--json\] \[--replace\]/);
  assert.doesNotMatch(helpResult.stdout, /vasir doctor/);

  const versionResult = runCommand(binaryPath, ["--version"], packDirectory);
  assert.equal(versionResult.status, 0, versionResult.stderr);
  assert.equal(versionResult.stdout.trim(), "vasir 0.1.0");

  const addEnvironmentVariables = {
    ...npmEnvironmentVariables,
    HOME: homeDirectory,
    USERPROFILE: homeDirectory,
    VASIR_REPOSITORY_URL: repositoryUrl
  };
  const addResult = runCommand(binaryPath, ["add", "react"], projectDirectory, addEnvironmentVariables);
  assert.equal(addResult.status, 0, addResult.stderr);
  assert.match(addResult.stdout, /Installed react/);
  assert.match(addResult.stdout, /Project skills ready at/);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "react", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectDirectory, "AGENTS.md")));
});
