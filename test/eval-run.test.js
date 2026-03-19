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
  assert.equal(firstRun.previousVersionComparison.outcome, "no_prior");
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

test("eval run prints preparation and per-step progress in text mode", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--model", "mock"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      outputStream: { isTTY: false },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0, capturedOutput.readStderr());
  assert.match(capturedOutput.readStdout(), /Preparing react/i);
  assert.match(capturedOutput.readStdout(), /Preparing Eval react/i);
  assert.match(capturedOutput.readStdout(), /0\/4/i);
  assert.match(capturedOutput.readStdout(), /4\/4 mock:skill-aware .*treatment/i);
  assert.match(capturedOutput.readStdout(), /Vs No Skill/i);
  assert.match(capturedOutput.readStdout(), /Vs Previous Version/i);
  assert.match(capturedOutput.readStdout(), /no older skill hash recorded yet/i);
});

test("eval run compares against the previous recorded skill version when the hash changes", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const firstOutput = captureCommandWriters();

  const firstStatusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "mock"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      ...firstOutput
    }
  );

  assert.equal(firstStatusCode, 0, firstOutput.readStderr());
  const firstRun = JSON.parse(firstOutput.readStdout());

  writeFile(
    path.join(repositoryDirectory, "skills", "react", "SKILL.md"),
    [
      "# React",
      "",
      "Use local state first.",
      "Prefer explicit loading and error states.",
      "Use AbortController in async effects.",
      "Use startTransition and useDeferredValue for expensive search updates."
    ].join("\n")
  );

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
  assert.notEqual(secondRun.skillHash, firstRun.skillHash);
  assert.equal(secondRun.previousVersionComparison.comparable, true);
  assert.equal(secondRun.previousVersionComparison.previousSkillHash, firstRun.skillHash);
});

test("eval run dispatches planned rows concurrently", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const capturedOutput = captureCommandWriters();
  let inFlightRequestCount = 0;
  let maxInFlightRequestCount = 0;
  let requestCount = 0;

  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "openai"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test"
      },
      fetchImplementation: async (_url, requestOptions = {}) => {
        requestCount += 1;
        inFlightRequestCount += 1;
        maxInFlightRequestCount = Math.max(maxInFlightRequestCount, inFlightRequestCount);

        await Promise.resolve();
        await Promise.resolve();

        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions}\n${requestBody.input}`;
        const skillApplied = promptText.includes("--- Skill Guidance Start ---");
        const responseText = promptText.includes("UserPanel")
          ? skillApplied
            ? "Use AbortController with a loading state and role=\"alert\" for errors."
            : "Fetch the user and render the result."
          : skillApplied
            ? "Use startTransition and useDeferredValue for the SearchBox."
            : "Use useEffect to run the query.";

        return {
          ok: true,
          async json() {
            inFlightRequestCount -= 1;
            return {
              output_text: responseText,
              usage: null
            };
          }
        };
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0, capturedOutput.readStderr());
  assert.equal(requestCount, 4);
  assert.ok(maxInFlightRequestCount > 1);
});

test("eval run loads provider credentials from repo-root keys.json", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  writeFile(
    path.join(repositoryDirectory, "keys.json"),
    `${JSON.stringify(
      {
        OPENAI_API_KEY: "sk-from-keys-file"
      },
      null,
      2
    )}\n`
  );
  const capturedOutput = captureCommandWriters();
  const authorizationHeaders = [];

  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "openai"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      fetchImplementation: async (url, requestOptions = {}) => {
        authorizationHeaders.push(requestOptions.headers?.authorization ?? "");
        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions}\n${requestBody.input}`;
        const skillApplied = promptText.includes("--- Skill Guidance Start ---");
        const responseText = promptText.includes("UserPanel")
          ? skillApplied
            ? "Use AbortController with a loading state and role=\"alert\" for errors."
            : "Fetch the user and render the result."
          : skillApplied
            ? "Use startTransition and useDeferredValue for the SearchBox."
            : "Use useEffect to run the query.";

        return {
          ok: true,
          async json() {
            return {
              output_text: responseText,
              usage: null
            };
          }
        };
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0, capturedOutput.readStderr());
  assert.ok(authorizationHeaders.length > 0);
  assert.ok(authorizationHeaders.every((value) => value === "Bearer sk-from-keys-file"));
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.command, "eval");
  assert.equal(parsedOutput.status, "success");
});

test("eval run fails with a structured error when keys.json is invalid", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  writeFile(path.join(repositoryDirectory, "keys.json"), "{not valid json}\n");
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "openai"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.command, "eval");
  assert.equal(parsedError.code, "EVAL_KEYS_INVALID");
});
