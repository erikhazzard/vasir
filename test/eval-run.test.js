import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runCommandLine } from "../install/command-runner.js";

function createTemporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vasir-eval-"));
}

function writeFile(filePath, fileContents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, fileContents);
}

function createEvalFixtureRepository() {
  const repositoryDirectory = createTemporaryDirectory();

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
  writeFile(
    path.join(repositoryDirectory, "skills", "react", "SKILL.md"),
    [
      "# React",
      "",
      "Use local state first.",
      "Use AbortController in async effects.",
      "Use startTransition and useDeferredValue for expensive search updates."
    ].join("\n")
  );
  writeFile(
    path.join(repositoryDirectory, "evals", "suites", "react", "suite.json"),
    `${JSON.stringify(
      {
        id: "react-core",
        cases: [
          {
            id: "abortable-user-fetch",
            task: "Implement a React component named UserPanel that fetches a user whenever userId changes. Include loading and accessible errors.",
            requiredSubstrings: ["AbortController", "loading", "role=\"alert\""],
            forbiddenSubstrings: ["useContext("]
          },
          {
            id: "urgent-vs-non-urgent-search",
            task: "Implement a React SearchBox that keeps typing responsive while an expensive query runs in the background.",
            requiredSubstrings: ["startTransition", "useDeferredValue"],
            forbiddenSubstrings: ["useEffect(() => runQuery"]
          }
        ]
      },
      null,
      2
    )}\n`
  );

  return repositoryDirectory;
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

test("eval run fails cleanly in non-interactive mode when default live models have no credentials", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(["node", "vasir", "eval", "run", "react", "--json"], {
    currentWorkingDirectory: repositoryDirectory,
    environmentVariables: {},
    ...capturedOutput
  });

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "eval");
  assert.equal(parsedError.code, "EVAL_MODELS_NOT_CONFIGURED");
});

test("eval run scores baseline vs treatment with --model mock and stores history", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const capturedOutput = captureCommandWriters();

  const firstStatusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "mock"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      ...capturedOutput
    }
  );

  assert.equal(firstStatusCode, 0, capturedOutput.readStderr());
  const firstRun = JSON.parse(capturedOutput.readStdout());
  assert.equal(firstRun.command, "eval");
  assert.equal(firstRun.status, "success");
  assert.equal(firstRun.subcommand, "run");
  assert.equal(firstRun.skillName, "react");
  assert.ok(firstRun.summary.global.averageScoreLift > 0);
  assert.ok(fs.existsSync(path.join(firstRun.outputDirectory, "summary.json")));
  assert.ok(fs.existsSync(path.join(firstRun.outputDirectory, "rows.json")));

  const secondOutput = captureCommandWriters();
  const secondStatusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "mock"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      ...secondOutput
    }
  );

  assert.equal(secondStatusCode, 0, secondOutput.readStderr());
  const secondRun = JSON.parse(secondOutput.readStdout());
  assert.equal(secondRun.previousComparison.previousRunId, firstRun.runId);
});
