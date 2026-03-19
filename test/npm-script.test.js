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
    ["run", "eval", "react", "--model", "mock"],
    REPO_ROOT,
    {
      NO_COLOR: "1"
    }
  );

  assert.equal(commandResult.status, 0, commandResult.stderr);
  assert.match(commandResult.stdout, /hard score lift/i);
});

test("npm run eval infers the skill from INIT_CWD when invoked inside a skill directory", () => {
  const commandResult = runCommand(
    "npm",
    ["run", "eval"],
    path.join(REPO_ROOT, "skills", "react"),
    {
      NO_COLOR: "1",
      VASIR_EVAL_MODELS: "mock:skill-aware"
    }
  );

  assert.equal(commandResult.status, 0, commandResult.stderr);
  assert.match(commandResult.stdout, /Eval react/);
  assert.match(commandResult.stdout, /hard score lift/i);
});
