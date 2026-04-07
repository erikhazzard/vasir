import test from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

test("npm pack produces a runnable vasir binary with help and add support", () => {
  const packDirectory = createTemporaryDirectory();
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
  assert.match(
    helpResult.stdout,
    /vasir add <skill> \[skill...\] \[--json\] \[--replace\] \[--agents-profile <name>\]/
  );
  assert.match(helpResult.stdout, /vasir remove <skill> \[skill...\] \[--json\]/);
  assert.match(helpResult.stdout, /vasir agents init <profile> \[--json\] \[--replace\]/);
  assert.match(helpResult.stdout, /vasir agents draft-purpose \[--json\] \[--write\] \[--model <name>\]/);
  assert.match(helpResult.stdout, /vasir agents draft-routing \[--json\] \[--write\]/);
  assert.match(helpResult.stdout, /vasir agents validate \[--json\]/);
  assert.match(helpResult.stdout, /vasir eval run <skill> \[--json\] \[--model <name>\] \[--trials <count>\]/);
  assert.match(helpResult.stdout, /vasir eval inspect <skill> \[run-id\] \[--json\]/);
  assert.match(helpResult.stdout, /vasir eval rescore <skill> \[run-id\] \[--json\]/);
  assert.match(helpResult.stdout, /vasir add all/i);
  assert.doesNotMatch(helpResult.stdout, /vasir doctor/);

  const versionResult = runCommand(binaryPath, ["--version"], packDirectory);
  assert.equal(versionResult.status, 0, versionResult.stderr);
  assert.equal(versionResult.stdout.trim(), "vasir 0.1.0");

  const addEnvironmentVariables = {
    ...npmEnvironmentVariables,
    HOME: homeDirectory,
    USERPROFILE: homeDirectory
  };
  writeFile(
    path.join(projectDirectory, "package.json"),
    `${JSON.stringify({ name: "space-admin-console", dependencies: { react: "^19.0.0" } }, null, 2)}\n`
  );
  writeFile(path.join(projectDirectory, "src", "components", "Button.tsx"), "export function Button() { return null; }\n");
  const addResult = runCommand(
    binaryPath,
    ["add", "design__building-frontend"],
    projectDirectory,
    addEnvironmentVariables
  );
  assert.equal(addResult.status, 0, addResult.stderr);
  assert.match(addResult.stdout, /Installed design__building-frontend/);
  assert.match(addResult.stdout, /Project skills ready at/);
  assert.match(addResult.stdout, /AGENTS starter ready at \(frontend, inferred\)/);
  assert.ok(fs.existsSync(path.join(projectDirectory, ".agents", "skills", "design__building-frontend", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(projectDirectory, "AGENTS.md")));
  assert.match(
    fs.readFileSync(path.join(projectDirectory, "AGENTS.md"), "utf8"),
    /<!-- vasir:profile:frontend -->/
  );

  const validateResult = runCommand(binaryPath, ["agents", "validate", "--json"], projectDirectory, addEnvironmentVariables);
  assert.equal(validateResult.status, 1);
  assert.match(validateResult.stderr, /AGENTS_VALIDATION_FAILED/);

  const removeResult = runCommand(binaryPath, ["remove", "design__building-frontend"], projectDirectory, addEnvironmentVariables);
  assert.equal(removeResult.status, 0, removeResult.stderr);
  assert.match(removeResult.stdout, /Removed design__building-frontend/);
  assert.ok(!fs.existsSync(path.join(projectDirectory, ".agents", "skills", "design__building-frontend")));

  const evalResult = runCommand(
    binaryPath,
    ["eval", "run", "testing__enforcing-mandate", "--model", "mock"],
    REPO_ROOT,
    npmEnvironmentVariables
  );
  assert.equal(evalResult.status, 0, evalResult.stderr);
  assert.match(evalResult.stdout, /Summary/i);
  assert.match(evalResult.stdout, /Inspect/i);
});
