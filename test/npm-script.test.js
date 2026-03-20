import test from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

test("npm run eval accepts a positional skill name without requiring --", () => {
  const commandResult = runCommand(
    "npm",
    ["run", "eval", "react", "mock"],
    REPO_ROOT,
    {
      NO_COLOR: "1"
    }
  );

  assert.equal(commandResult.status, 0, commandResult.stderr);
  assert.match(commandResult.stdout, /Starting Eval react/i);
  assert.match(commandResult.stdout, /Preparing Eval react/i);
  assert.match(commandResult.stdout, /0\/12/i);
  assert.match(commandResult.stdout, /12\/12 mock:skill-aware .*trial-3 .*treatment/i);
  assert.match(commandResult.stdout, /Summary/i);
  assert.match(commandResult.stdout, /summary via:\s+mock:skill-aware/i);
  assert.match(commandResult.stdout, /Inspect/i);
});

test("npm run eval infers the skill from INIT_CWD and accepts a positional model selector", () => {
  const commandResult = runCommand(
    "npm",
    ["run", "eval", "mock"],
    path.join(REPO_ROOT, "skills", "react"),
    {
      NO_COLOR: "1"
    }
  );

  assert.equal(commandResult.status, 0, commandResult.stderr);
  assert.match(commandResult.stdout, /Starting Eval react/i);
  assert.match(commandResult.stdout, /Eval react/);
  assert.match(commandResult.stdout, /Summary/i);
});

test("repo eval wrapper makes the eval-ready skill split explicit when no skill is specified", () => {
  const commandResult = runCommand(
    "node",
    ["./scripts/eval.js"],
    REPO_ROOT,
    {
      NO_COLOR: "1"
    }
  );

  assert.equal(commandResult.status, 1);
  assert.match(commandResult.stderr, /Eval-Ready Skills/i);
  assert.match(commandResult.stderr, /Missing Built-In Evals/i);
  assert.match(commandResult.stderr, /react/i);
  assert.match(commandResult.stderr, /combat/i);
});

test("repo eval wrapper infers a non-eval skill from INIT_CWD before treating a positional model as the target", () => {
  const commandResult = runCommand(
    "node",
    ["./scripts/eval.js", "mock", "--json"],
    REPO_ROOT,
    {
      INIT_CWD: path.join(REPO_ROOT, "skills", "combat"),
      NO_COLOR: "1"
    }
  );

  assert.equal(commandResult.status, 1);
  const parsedError = JSON.parse(commandResult.stderr);
  assert.equal(parsedError.code, "EVAL_SUITE_NOT_FOUND");
  assert.match(parsedError.message, /combat/i);
});
