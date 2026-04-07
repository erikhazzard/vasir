import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runCommandLine } from "../cli/command-runner.js";

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
    path.join(repositoryDirectory, ".agents", "skills", "react", "meta.json"),
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
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `# React

Use local state first.
Use AbortController in async effects.
Use startTransition and useDeferredValue for expensive search updates.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "evals", "suite.json"),
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
  assert.equal(firstRun.runStatus, "complete");
  assert.equal(firstRun.trialCount, 3);
  assert.ok(typeof firstRun.scorerVersion === "number");
  assert.ok(typeof firstRun.suiteHash === "string" && firstRun.suiteHash.length > 0);
  assert.ok(firstRun.summary.global.averageScoreLift > 0);
  assert.equal(firstRun.previousVersionComparison.outcome, "no_prior");
  assert.ok(fs.existsSync(path.join(firstRun.outputDirectory, "run.json")));

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
  assert.equal(secondRun.previousComparison.comparable, true);
  assert.equal(secondRun.previousComparison.previousRunId, firstRun.runId);
});

test("eval run aggregates provider token usage into the saved summary", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "openai", "--trials", "1"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test"
      },
      fetchImplementation: async (_url, requestOptions = {}) => {
        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions}\n${requestBody.input}`;
        const isUserPanel = promptText.includes("UserPanel");
        const skillApplied = promptText.includes("--- Skill Guidance Start ---");

        return {
          ok: true,
          async json() {
            return {
              output_text: isUserPanel
                ? (skillApplied
                  ? "Use AbortController with a loading state and role=\"alert\" for errors."
                  : "Fetch the user and render the result.")
                : (skillApplied
                  ? "Use startTransition and useDeferredValue for the SearchBox."
                  : "Use useEffect(() => runQuery()) for the SearchBox."),
              usage: skillApplied
                ? { input_tokens: 140, output_tokens: 30, total_tokens: 170 }
                : { input_tokens: 100, output_tokens: 20, total_tokens: 120 }
            };
          }
        };
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0, capturedOutput.readStderr());
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.deepEqual(parsedOutput.usageSummary.total, {
    available: true,
    rowCount: 4,
    rowsWithUsage: 4,
    rowsWithoutUsage: 0,
    inputTokens: 480,
    outputTokens: 100,
    totalTokens: 580
  });
  assert.equal(parsedOutput.summary.usage.baseline.totalTokens, 240);
  assert.equal(parsedOutput.summary.usage.treatment.totalTokens, 340);
  assert.equal(parsedOutput.summary.perModel[0].usage.totalTokens, 580);
});

test("eval run resolves the suite from a project-local skill copy", async () => {
  const repositoryDirectory = createTemporaryDirectory();

  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "meta.json"),
    `${JSON.stringify(
      {
        name: "react",
        version: "1.0.0",
        description: "React component boundaries and effect discipline",
        category: "frontend",
        tags: ["react"],
        recommends: [],
        files: ["SKILL.md", "evals/README.md", "evals/suite.json"]
      },
      null,
      2
    )}\n`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `# React

Use local state first.
Use AbortController in async effects.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "evals", "README.md"),
    "# React Eval\n"
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "react-core",
        cases: [
          {
            id: "abortable-user-fetch",
            task: "Implement a React component named UserPanel that fetches a user whenever userId changes.",
            requiredSubstrings: ["AbortController"],
            forbiddenSubstrings: ["useContext("]
          }
        ]
      },
      null,
      2
    )}\n`
  );

  const capturedOutput = captureCommandWriters();
  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "mock"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0, capturedOutput.readStderr());
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.command, "eval");
  assert.equal(parsedOutput.status, "success");
  assert.equal(parsedOutput.suiteId, "react-core");
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
  assert.match(capturedOutput.readStdout(), /0\/12/i);
  assert.match(capturedOutput.readStdout(), /12\/12 mock:skill-aware .*trial-3 .*treatment/i);
  assert.match(capturedOutput.readStdout(), /Summary/i);
  assert.match(capturedOutput.readStdout(), /summary via:\s+mock:skill-aware/i);
  assert.match(capturedOutput.readStdout(), /Key Evidence/i);
  assert.match(capturedOutput.readStdout(), /History/i);
  assert.match(capturedOutput.readStdout(), /last run:\s+NO PRIOR VERSION/i);
  assert.match(capturedOutput.readStdout(), /Inspect/i);
  assert.match(capturedOutput.readStdout(), /vasir eval inspect react/i);
});

test("eval run prints a human bottom line with better and worse models", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--model", "openai", "--model", "opus"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test",
        ANTHROPIC_API_KEY: "sk-ant-test"
      },
      outputStream: { isTTY: false },
      fetchImplementation: async (_url, requestOptions = {}) => {
        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions ?? requestBody.system ?? ""}\n${requestBody.input ?? requestBody.messages?.[0]?.content ?? ""}`;
        const isSummary = promptText.includes("Eval summary facts:");
        const skillApplied = promptText.includes("--- Skill Guidance Start ---");
        const isOpenAi = requestBody.model === "gpt-5.4";
        const isUserPanel = promptText.includes("UserPanel");

        let responseText = "";
        if (isSummary) {
          responseText = JSON.stringify({
            headline: "No signal across models.",
            summary: "The skill helps Anthropic but hurts OpenAI, so this run is mixed overall.",
            decisiveReasons: [
              "Hard-check aggregates split by model.",
              "Anthropic is the best fit while OpenAI is the weakest fit."
            ],
            nextStep: "Inspect the saved run before tightening the skill."
          });
        } else if (isOpenAi) {
          responseText = skillApplied
            ? (isUserPanel
              ? "Use a global store and useContext for the user panel."
              : "Use useEffect(() => runQuery()) for the SearchBox.")
            : (isUserPanel
              ? "Use AbortController with a loading state and role=\"alert\" for errors."
              : "Use startTransition and useDeferredValue for the SearchBox.");
        } else {
          responseText = skillApplied
            ? (isUserPanel
              ? "Use AbortController with a loading state and role=\"alert\" for errors."
              : "Use startTransition and useDeferredValue for the SearchBox.")
            : (isUserPanel
              ? "Fetch the user and render the result."
              : "Use useEffect(() => runQuery()) for the SearchBox.");
        }

        return {
          ok: true,
          async json() {
            if (isOpenAi) {
              return {
                output_text: responseText,
                usage: {
                  input_tokens: 120,
                  output_tokens: 30,
                  total_tokens: 150
                }
              };
            }

            return {
              content: [{ type: "text", text: responseText }],
              usage: {
                input_tokens: 100,
                output_tokens: 20
              }
            };
          }
        };
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0, capturedOutput.readStderr());
  assert.match(capturedOutput.readStdout(), /Summary/i);
  assert.match(capturedOutput.readStdout(), /result:\s+NO SIGNAL/i);
  assert.match(capturedOutput.readStdout(), /summary via:\s+anthropic:claude-opus-4-6/i);
  assert.match(capturedOutput.readStdout(), /headline:\s+No signal across models\./i);
  assert.match(capturedOutput.readStdout(), /note:\s+The skill helps Anthropic but hurts OpenAI, so this run is mixed overall\./i);
  assert.match(capturedOutput.readStdout(), /tokens:\s+3,240 total/i);
  assert.match(capturedOutput.readStdout(), /Inspect/i);
  assert.match(capturedOutput.readStdout(), /vasir eval inspect react/i);
});

test("eval run records fixed dual-judge consensus when a suite defines judgePrompt", async () => {
  const repositoryDirectory = createTemporaryDirectory();
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "meta.json"),
    `${JSON.stringify(
      {
        name: "deterministic",
        version: "1.0.0",
        description: "Replay testing, seeded fixtures, and injected clocks",
        category: "testing",
        tags: ["deterministic"],
        recommends: [],
        files: ["SKILL.md"]
      },
      null,
      2
    )}\n`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "SKILL.md"),
    `# Deterministic

Inject clocks.
Seed rng.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "deterministic-core",
        judgePrompt:
          "Prefer the answer that makes randomness and time explicit and replayable. Return tie if both are equally good or equally bad.",
        cases: [
          {
            id: "reward-replay",
            task: "Add a replayable random reward to combat.",
            requiredSubstrings: ["seed", "clock"],
            forbiddenSubstrings: ["Math.random", "Date.now"]
          }
        ]
      },
      null,
      2
    )}\n`
  );

  const capturedOutput = captureCommandWriters();
  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "deterministic", "--json", "--model", "openai", "--trials", "1"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test",
        ANTHROPIC_API_KEY: "sk-ant-test"
      },
      fetchImplementation: async (_url, requestOptions = {}) => {
        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions ?? requestBody.system ?? ""}\n${requestBody.input ?? requestBody.messages?.[0]?.content ?? ""}`;
        const skillApplied = promptText.includes("--- Skill Guidance Start ---");
        const isJudge = promptText.includes("Output A:") && promptText.includes("Output B:");
        const isOpenAi = requestBody.model === "gpt-5.4";

        if (isJudge) {
          const responseText = JSON.stringify({
            winner: "treatment",
            confidence: 0.8,
            summaryReason: "B makes the replay boundary explicit."
          });

          return {
            ok: true,
            async json() {
              return isOpenAi
                ? { output_text: responseText, usage: { input_tokens: 80, output_tokens: 20, total_tokens: 100 } }
                : { content: [{ type: "text", text: responseText }], usage: { input_tokens: 80, output_tokens: 20 } };
            }
          };
        }

        const responseText = skillApplied
          ? "Use a seed-driven rng and injected clock so the run can replay exactly."
          : "Use Math.random() and Date.now() to pick the reward.";

        return {
          ok: true,
          async json() {
            return isOpenAi
              ? { output_text: responseText, usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 } }
              : { content: [{ type: "text", text: responseText }], usage: { input_tokens: 90, output_tokens: 20 } };
          }
        };
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0, capturedOutput.readStderr());
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.judgeStatus, "complete");
  assert.equal(parsedOutput.bottomLine.overallVerdict, "BETTER");
  assert.equal(parsedOutput.summary.judge.betterPairCount, 1);
  assert.equal(parsedOutput.summary.judge.judgedPairCount, 1);

  const persistedRun = JSON.parse(
    fs.readFileSync(path.join(parsedOutput.outputDirectory, "run.json"), "utf8")
  );
  assert.equal(persistedRun.judgeStatus, "complete");
  assert.equal(persistedRun.pairs[0].pairJudgment.pairVerdict, "better");
  assert.equal(
    persistedRun.pairs[0].pairJudgment.judges["anthropic:claude-opus-4-6"].winner,
    "treatment"
  );
});

test("eval run fails closed when a suite expects judges but the fixed judge layer is unavailable", async () => {
  const repositoryDirectory = createTemporaryDirectory();
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "meta.json"),
    `${JSON.stringify(
      {
        name: "deterministic",
        version: "1.0.0",
        description: "Replay testing, seeded fixtures, and injected clocks",
        category: "testing",
        tags: ["deterministic"],
        recommends: [],
        files: ["SKILL.md"]
      },
      null,
      2
    )}\n`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "SKILL.md"),
    `# Deterministic

Inject clocks.
Seed rng.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "deterministic-core",
        judgePrompt:
          "Prefer the answer that makes randomness and time explicit and replayable. Return tie if both answers are equally good or equally bad.",
        cases: [
          {
            id: "reward-replay",
            task: "Add a replayable random reward to combat.",
            requiredSubstrings: ["seed", "clock"],
            forbiddenSubstrings: ["Math.random", "Date.now"]
          }
        ]
      },
      null,
      2
    )}\n`
  );

  const capturedOutput = captureCommandWriters();
  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "deterministic", "--json", "--model", "openai", "--trials", "1"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test"
      },
      fetchImplementation: async (_url, requestOptions = {}) => {
        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions ?? requestBody.system ?? ""}\n${requestBody.input ?? requestBody.messages?.[0]?.content ?? ""}`;
        const skillApplied = promptText.includes("--- Skill Guidance Start ---");

        return {
          ok: true,
          async json() {
            return {
              output_text: skillApplied
                ? "Use a seed-driven rng and injected clock so the run can replay exactly."
                : "Use Math.random() and Date.now() to pick the reward.",
              usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 }
            };
          }
        };
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0, capturedOutput.readStderr());
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.judgeStatus, "skipped");
  assert.equal(parsedOutput.bottomLine.overallVerdict, "NO SIGNAL");
  assert.equal(parsedOutput.primaryEvidence.mode, "hard_floor_without_judges");
  assert.equal(parsedOutput.primaryEvidence.hardFloorOutcome, "better");
  assert.match(parsedOutput.bottomLine.evidenceSource, /fixed judges unavailable/i);
});

test("eval run rejects unsupported judge-mode suite fields with migration guidance", async () => {
  const repositoryDirectory = createTemporaryDirectory();
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "meta.json"),
    `${JSON.stringify(
      {
        name: "react",
        version: "1.0.0",
        description: "React component patterns and async effect discipline",
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
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `# React

Prefer local state.
Make async effects explicit.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "react-judge",
        mode: "judge",
        judge: {
          model: "openai:gpt-5.4",
          prompt: "Prefer the answer that keeps state local and handles async work explicitly."
        },
        cases: [
          {
            id: "user-panel",
            task: "Implement a UserPanel that loads user data and renders loading and error states."
          }
        ]
      },
      null,
      2
    )}\n`
  );

  const capturedOutput = captureCommandWriters();
  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "openai", "--trials", "1"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test"
      },
      fetchImplementation: async (_url, requestOptions = {}) => {
        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions ?? requestBody.system ?? ""}\n${requestBody.input ?? requestBody.messages?.[0]?.content ?? ""}`;
        const skillApplied = promptText.includes("--- Skill Guidance Start ---");
        const isJudge = promptText.includes("Output A:") && promptText.includes("Output B:");

        if (isJudge) {
          return {
            ok: true,
            async json() {
              return {
                output_text: JSON.stringify({
                  winner: "treatment",
                  confidence: 0.9,
                  summaryReason: "B handles async state explicitly."
                }),
                usage: { input_tokens: 70, output_tokens: 20, total_tokens: 90 }
              };
            }
          };
        }

        return {
          ok: true,
          async json() {
            return {
              output_text: skillApplied
                ? "Keep state local, show loading and error states, and cancel stale fetches."
                : "Fetch the user and render the result.",
              usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 }
            };
          }
        };
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.code, "EVAL_SUITE_INVALID");
  assert.match(parsedError.message, /unsupported `mode` field/i);
  assert.match(parsedError.suggestion, /judgePrompt/i);
});

test("eval run stays on hard checks when a suite has no judgePrompt", async () => {
  const repositoryDirectory = createTemporaryDirectory();
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "meta.json"),
    `${JSON.stringify(
      {
        name: "deterministic",
        version: "1.0.0",
        description: "Replay testing, seeded fixtures, and injected clocks",
        category: "testing",
        tags: ["deterministic"],
        recommends: [],
        files: ["SKILL.md"]
      },
      null,
      2
    )}\n`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "SKILL.md"),
    `# Deterministic

Inject clocks.
Seed rng.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "deterministic-core",
        cases: [
          {
            id: "reward-replay",
            task: "Add a replayable random reward to combat.",
            requiredSubstrings: ["seed", "clock"],
            forbiddenSubstrings: ["Math.random", "Date.now"]
          }
        ]
      },
      null,
      2
    )}\n`
  );

  const capturedOutput = captureCommandWriters();
  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "deterministic", "--json", "--model", "openai", "--trials", "1"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test",
        ANTHROPIC_API_KEY: "sk-ant-test"
      },
      fetchImplementation: async (_url, requestOptions = {}) => {
        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions ?? requestBody.system ?? ""}\n${requestBody.input ?? requestBody.messages?.[0]?.content ?? ""}`;
        const skillApplied = promptText.includes("--- Skill Guidance Start ---");
        const isOpenAi = requestBody.model === "gpt-5.4";

        const responseText = skillApplied
          ? "Use a seed-driven rng and injected clock so the run can replay exactly."
          : "Use Math.random() and Date.now() to pick the reward.";

        return {
          ok: true,
          async json() {
            return isOpenAi
              ? { output_text: responseText, usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 } }
              : { content: [{ type: "text", text: responseText }], usage: { input_tokens: 90, output_tokens: 20 } };
          }
        };
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0, capturedOutput.readStderr());
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.judgeStatus, "not_configured");
  assert.equal(parsedOutput.primaryEvidence.mode, "hard_checks_only");
  assert.equal(parsedOutput.bottomLine.overallVerdict, "BETTER");
  assert.equal(parsedOutput.summary.global.betterPairCount, 1);
  assert.ok(parsedOutput.summary.global.averageScoreLift > 0);
});

test("eval run rejects suites whose cases do not define a hard-check floor", async () => {
  const repositoryDirectory = createTemporaryDirectory();
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "integration", "meta.json"),
    `${JSON.stringify(
      {
        name: "integration",
        version: "1.0.0",
        description: "Outcome-driven integration testing strategies",
        category: "testing",
        tags: ["integration"],
        recommends: [],
        files: ["SKILL.md"]
      },
      null,
      2
    )}\n`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "integration", "SKILL.md"),
    `# Integration

Prove user-visible behavior with deterministic integration tests.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "integration", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "integration-core",
        judgePrompt: "Prefer the answer that proves the user-visible journey with a deterministic integration test.",
        cases: [
          {
            id: "purchase-flow",
            task: "Describe the first test you would add for a broken purchase flow."
          }
        ]
      },
      null,
      2
    )}\n`
  );

  const capturedOutput = captureCommandWriters();
  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "integration", "--json", "--model", "openai", "--trials", "1"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test"
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.code, "EVAL_SUITE_INVALID");
  assert.match(parsedError.message, /missing hard checks/i);
  assert.match(parsedError.suggestion, /requiredSubstrings|forbiddenSubstrings/i);
});

test("eval run rejects unsupported command-mode suite fields with migration guidance", async () => {
  const repositoryDirectory = createTemporaryDirectory();
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "meta.json"),
    `${JSON.stringify(
      {
        name: "deterministic",
        version: "1.0.0",
        description: "Replay testing, seeded fixtures, and injected clocks",
        category: "testing",
        tags: ["deterministic"],
        recommends: [],
        files: ["SKILL.md"]
      },
      null,
      2
    )}\n`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "SKILL.md"),
    `# Deterministic

Inject clocks.
Seed rng.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "deterministic-core",
        mode: "command",
        validator: {
          command: ["node", "./validator.mjs"]
        },
        cases: [
          {
            id: "reward-replay",
            task: "Add a replayable random reward to combat."
          }
        ]
      },
      null,
      2
    )}\n`
  );
  const capturedOutput = captureCommandWriters();
  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "deterministic", "--json", "--model", "openai", "--trials", "1"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test",
        ANTHROPIC_API_KEY: "sk-ant-test"
      },
      fetchImplementation: async (_url, requestOptions = {}) => {
        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions ?? requestBody.system ?? ""}\n${requestBody.input ?? requestBody.messages?.[0]?.content ?? ""}`;
        const skillApplied = promptText.includes("--- Skill Guidance Start ---");

        return {
          ok: true,
          async json() {
            return {
              output_text: skillApplied
                ? "Use a seed-driven rng and injected clock so the run can replay exactly."
                : "Use Math.random() and Date.now() to pick the reward.",
              usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 }
            };
          }
        };
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.code, "EVAL_SUITE_INVALID");
  assert.match(parsedError.message, /unsupported `mode` field/i);
  assert.match(parsedError.suggestion, /judgePrompt/i);
});

test("eval run rejects stray judge config without mode", async () => {
  const repositoryDirectory = createTemporaryDirectory();
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "meta.json"),
    `${JSON.stringify(
      {
        name: "react",
        version: "1.0.0",
        description: "React component patterns and async effect discipline",
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
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `# React

Prefer local state.
Make async effects explicit.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "react-core",
        judge: {
          model: "openai:gpt-5.4",
          prompt: "Prefer the answer that handles async state explicitly."
        },
        cases: [
          {
            id: "user-panel",
            task: "Implement a UserPanel that loads user data and renders loading and error states."
          }
        ]
      },
      null,
      2
    )}\n`
  );

  const capturedOutput = captureCommandWriters();
  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "openai", "--trials", "1"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test"
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.code, "EVAL_SUITE_INVALID");
  assert.match(parsedError.message, /unsupported judge config/i);
  assert.match(parsedError.suggestion, /judgePrompt/i);
});

test("eval run rejects stray validator config without mode", async () => {
  const repositoryDirectory = createTemporaryDirectory();
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "meta.json"),
    `${JSON.stringify(
      {
        name: "deterministic",
        version: "1.0.0",
        description: "Replay testing, seeded fixtures, and injected clocks",
        category: "testing",
        tags: ["deterministic"],
        recommends: [],
        files: ["SKILL.md"]
      },
      null,
      2
    )}\n`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "SKILL.md"),
    `# Deterministic

Inject clocks.
Seed rng.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "deterministic-core",
        validator: {
          command: ["node", "./validator.mjs"]
        },
        cases: [
          {
            id: "reward-replay",
            task: "Add a replayable random reward to combat."
          }
        ]
      },
      null,
      2
    )}\n`
  );

  const capturedOutput = captureCommandWriters();
  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "deterministic", "--json", "--model", "openai", "--trials", "1"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test"
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 1);
  const parsedError = JSON.parse(capturedOutput.readStderr());
  assert.equal(parsedError.code, "EVAL_SUITE_INVALID");
  assert.match(parsedError.message, /unsupported validator config/i);
  assert.match(parsedError.suggestion, /judgePrompt/i);
});

test("eval run keeps successful rows when one row fails and marks the run incomplete", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "openai"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test"
      },
      fetchImplementation: async (_url, requestOptions = {}) => {
        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions}\n${requestBody.input}`;
        const skillApplied = promptText.includes("--- Skill Guidance Start ---");

        if (promptText.includes("SearchBox") && skillApplied) {
          throw new Error("provider exploded");
        }

        const responseText = promptText.includes("UserPanel")
          ? skillApplied
            ? "Use AbortController with a loading state and role=\"alert\" for errors."
            : "Fetch the user and render the result."
          : skillApplied
            ? "Use startTransition and useDeferredValue for the SearchBox."
            : "Use useEffect(() => runQuery()) for the SearchBox.";

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
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.runStatus, "incomplete");
  assert.equal(parsedOutput.summary.rowCounts.failed, 3);
  assert.equal(parsedOutput.summary.global.comparablePairCount, 3);
  assert.equal(parsedOutput.summary.global.totalPairCount, 6);
  const persistedRun = JSON.parse(
    fs.readFileSync(path.join(parsedOutput.outputDirectory, "run.json"), "utf8")
  );
  assert.equal(persistedRun.rows.filter((row) => row.rowStatus === "error").length, 3);
});

test("eval run explains why treatment regressed against baseline", async () => {
  const repositoryDirectory = createTemporaryDirectory();
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "meta.json"),
    `${JSON.stringify(
      {
        name: "deterministic",
        version: "1.0.0",
        description: "Replay testing, seeded fixtures, and injected clocks",
        category: "testing",
        tags: ["deterministic"],
        recommends: [],
        files: ["SKILL.md"]
      },
      null,
      2
    )}\n`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "SKILL.md"),
    `# Deterministic

Inject clocks.
Seed rng.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "deterministic-core",
        cases: [
          {
            id: "replayable-random-reward",
            task: "Add a random reward selection step to a replayable gameplay system.",
            requiredSubstrings: ["seed", "rng", "clock"],
            forbiddenSubstrings: ["Math.random", "Date.now"]
          }
        ]
      },
      null,
      2
    )}\n`
  );

  const capturedOutput = captureCommandWriters();
  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "deterministic", "--model", "openai"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test"
      },
      outputStream: { isTTY: false },
      fetchImplementation: async (_url, requestOptions = {}) => {
        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions}\n${requestBody.input}`;
        const skillApplied = promptText.includes("--- Skill Guidance Start ---");

        return {
          ok: true,
          async json() {
            return {
              output_text: skillApplied
                ? "Use a seed-driven rng and injected clock, but call Math.random() for the final reward roll."
                : "Use a seed-driven rng and injected clock.",
              usage: null
            };
          }
        };
      },
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0, capturedOutput.readStderr());
  assert.match(capturedOutput.readStdout(), /result:\s+WORSE/i);
  assert.match(capturedOutput.readStdout(), /Summary/i);
  assert.match(capturedOutput.readStdout(), /Key Evidence/i);
  assert.match(capturedOutput.readStdout(), /introduced forbidden hits: Math\.random/i);
  assert.match(capturedOutput.readStdout(), /Inspect/i);
  assert.match(capturedOutput.readStdout(), /vasir eval inspect deterministic/i);
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
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `# React

Use local state first.
Prefer explicit loading and error states.
Use AbortController in async effects.
Use startTransition and useDeferredValue for expensive search updates.`
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

test("eval run refuses to compare previous versions across suite hash changes", async () => {
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

  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "SKILL.md"),
    `# React

Use local state first.
Prefer explicit loading and error states.
Use AbortController in async effects.
Use startTransition and useDeferredValue for expensive search updates.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "react", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "react-core",
        cases: [
          {
            id: "abortable-user-fetch",
            task: "Implement a React component named UserPanel that fetches a user whenever userId changes. Include loading and accessible errors.",
            requiredSubstrings: ["AbortController", "loading", "role=\"alert\"", "error"],
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
  assert.equal(secondRun.previousVersionComparison.outcome, "not_comparable");
  assert.match(secondRun.previousVersionComparison.reason, /suite version changed/i);
  assert.equal(secondRun.previousComparison.outcome, "not_comparable");
});

test("eval run honors an explicit trial count override", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const capturedOutput = captureCommandWriters();

  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "mock", "--trials", "2"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      ...capturedOutput
    }
  );

  assert.equal(statusCode, 0, capturedOutput.readStderr());
  const parsedOutput = JSON.parse(capturedOutput.readStdout());
  assert.equal(parsedOutput.trialCount, 2);
  assert.equal(parsedOutput.summary.global.totalPairCount, 4);
  assert.equal(parsedOutput.summary.global.comparablePairCount, 4);
});

test("eval inspect returns the latest recorded run and pair-level movement details", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const runOutput = captureCommandWriters();
  const runStatusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "mock", "--trials", "2"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      ...runOutput
    }
  );

  assert.equal(runStatusCode, 0, runOutput.readStderr());

  const inspectOutput = captureCommandWriters();
  const inspectStatusCode = await runCommandLine(
    ["node", "vasir", "eval", "inspect", "react", "--json"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      ...inspectOutput
    }
  );

  assert.equal(inspectStatusCode, 0, inspectOutput.readStderr());
  const parsedInspect = JSON.parse(inspectOutput.readStdout());
  assert.equal(parsedInspect.subcommand, "inspect");
  assert.equal(parsedInspect.summary.trialCount, 2);
  assert.ok(parsedInspect.rows.length > 0);
  assert.ok(parsedInspect.movementEntries.length > 0);
});

test("eval rescore recomputes a stored run from saved outputs and case snapshots", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const runOutput = captureCommandWriters();
  const runStatusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "mock", "--trials", "1"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      ...runOutput
    }
  );

  assert.equal(runStatusCode, 0, runOutput.readStderr());
  const recordedRun = JSON.parse(runOutput.readStdout());
  const runFilePath = path.join(recordedRun.outputDirectory, "run.json");
  const storedRun = JSON.parse(fs.readFileSync(runFilePath, "utf8"));
  const storedRows = storedRun.rows;

  for (const row of storedRows) {
    if (row.rowStatus === "scored") {
      row.hardScore = {
        passed: false,
        score: 0,
        missingRequiredSubstrings: [],
        presentForbiddenSubstrings: ["tampered"]
      };
      row.scorerVersion = 1;
    }
  }

  storedRun.scorerVersion = 1;
  storedRun.summary.global.averageScoreLift = 0;
  storedRun.summary.global.passRateLift = 0;
  storedRun.rows = storedRows;
  fs.writeFileSync(runFilePath, `${JSON.stringify(storedRun, null, 2)}\n`);

  const rescoreOutput = captureCommandWriters();
  const rescoreStatusCode = await runCommandLine(
    ["node", "vasir", "eval", "rescore", "react", recordedRun.runId, "--json"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      ...rescoreOutput
    }
  );

  assert.equal(rescoreStatusCode, 0, rescoreOutput.readStderr());
  const parsedRescore = JSON.parse(rescoreOutput.readStdout());
  assert.equal(parsedRescore.subcommand, "rescore");
  assert.equal(parsedRescore.previousScorerVersion, 1);
  assert.ok(parsedRescore.averageScoreLiftDelta > 0);
  const rescoredRun = JSON.parse(fs.readFileSync(runFilePath, "utf8"));
  assert.equal(rescoredRun.scorerVersion, parsedRescore.scorerVersion);
});

test("eval rescore preserves persisted judge evidence and rebuilds the bottom line from it", async () => {
  const repositoryDirectory = createTemporaryDirectory();
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "meta.json"),
    `${JSON.stringify(
      {
        name: "deterministic",
        version: "1.0.0",
        description: "Replay testing, seeded fixtures, and injected clocks",
        category: "testing",
        tags: ["deterministic"],
        recommends: [],
        files: ["SKILL.md"]
      },
      null,
      2
    )}\n`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "SKILL.md"),
    `# Deterministic

Inject clocks.
Seed rng.`
  );
  writeFile(
    path.join(repositoryDirectory, ".agents", "skills", "deterministic", "evals", "suite.json"),
    `${JSON.stringify(
      {
        id: "deterministic-core",
        judgePrompt:
          "Prefer the answer that makes randomness and time explicit and replayable. Return tie if both answers are equally good or equally bad.",
        cases: [
          {
            id: "reward-replay",
            task: "Add a replayable random reward to combat.",
            requiredSubstrings: ["seed", "clock"],
            forbiddenSubstrings: ["Math.random", "Date.now"]
          }
        ]
      },
      null,
      2
    )}\n`
  );

  const runOutput = captureCommandWriters();
  const runStatusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "deterministic", "--json", "--model", "openai", "--trials", "1"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test",
        ANTHROPIC_API_KEY: "sk-ant-test"
      },
      fetchImplementation: async (_url, requestOptions = {}) => {
        const requestBody = JSON.parse(requestOptions.body);
        const promptText = `${requestBody.instructions ?? requestBody.system ?? ""}\n${requestBody.input ?? requestBody.messages?.[0]?.content ?? ""}`;
        const isJudge = promptText.includes("Output A:") && promptText.includes("Output B:");
        const isOpenAi = requestBody.model === "gpt-5.4";

        if (isJudge) {
          const responseText = JSON.stringify({
            winner: "treatment",
            confidence: 0.8,
            summaryReason: "B makes the replay boundary explicit."
          });

          return {
            ok: true,
            async json() {
              return isOpenAi
                ? { output_text: responseText, usage: { input_tokens: 80, output_tokens: 20, total_tokens: 100 } }
                : { content: [{ type: "text", text: responseText }], usage: { input_tokens: 80, output_tokens: 20 } };
            }
          };
        }

        return {
          ok: true,
          async json() {
            return isOpenAi
              ? {
                output_text: "Use a seed-driven rng and injected clock so the run can replay exactly.",
                usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 }
              }
              : {
                content: [{ type: "text", text: "Use a seed-driven rng and injected clock so the run can replay exactly." }],
                usage: { input_tokens: 90, output_tokens: 20 }
              };
          }
        };
      },
      ...runOutput
    }
  );

  assert.equal(runStatusCode, 0, runOutput.readStderr());
  const recordedRun = JSON.parse(runOutput.readStdout());
  const runFilePath = path.join(recordedRun.outputDirectory, "run.json");
  const storedRun = JSON.parse(fs.readFileSync(runFilePath, "utf8"));
  const storedRows = storedRun.rows;

  for (const row of storedRows) {
    if (row.rowStatus === "scored") {
      row.hardScore = {
        passed: false,
        score: 0,
        measuredCheckCount: 2,
        missingRequiredSubstrings: ["seed", "clock"],
        presentForbiddenSubstrings: []
      };
      row.scorerVersion = 1;
    }
  }

  storedRun.scorerVersion = 1;
  storedRun.rows = storedRows;
  fs.writeFileSync(runFilePath, `${JSON.stringify(storedRun, null, 2)}\n`);

  const rescoreOutput = captureCommandWriters();
  const rescoreStatusCode = await runCommandLine(
    ["node", "vasir", "eval", "rescore", "deterministic", recordedRun.runId, "--json"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {},
      ...rescoreOutput
    }
  );

  assert.equal(rescoreStatusCode, 0, rescoreOutput.readStderr());
  const parsedRescore = JSON.parse(rescoreOutput.readStdout());
  assert.equal(parsedRescore.subcommand, "rescore");

  const rescoredRun = JSON.parse(fs.readFileSync(runFilePath, "utf8"));
  assert.equal(rescoredRun.bottomLine.overallVerdict, "BETTER");
  assert.equal(rescoredRun.primaryEvidence.mode, "dual_judges_with_hard_floor");
  assert.equal(rescoredRun.pairs[0].pairJudgment.pairVerdict, "better");
});

test("eval run dispatches planned rows concurrently", async () => {
  const repositoryDirectory = createEvalFixtureRepository();
  const capturedOutput = captureCommandWriters();
  let inFlightRequestCount = 0;
  let maxInFlightRequestCount = 0;
  let requestCount = 0;

  const statusCode = await runCommandLine(
    ["node", "vasir", "eval", "run", "react", "--json", "--model", "openai", "--model", "opus"],
    {
      currentWorkingDirectory: repositoryDirectory,
      environmentVariables: {
        OPENAI_API_KEY: "sk-test",
        ANTHROPIC_API_KEY: "sk-ant-test"
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
  assert.equal(requestCount, 24);
  assert.ok(maxInFlightRequestCount > 1);
  assert.ok(maxInFlightRequestCount <= 4);
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
