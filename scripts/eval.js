import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { readSkillMetadata } from "../install/skill-metadata.js";
import { runCommandLine } from "../install/command-runner.js";
import { createCommandUi } from "./ui/command-output.js";
import { interactiveSelect } from "./ui/interactive-select.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSITIONAL_MODEL_ALIASES = new Set([
  "anthropic",
  "claude-opus-4-6",
  "gpt-5.4",
  "mock",
  "openai",
  "opus",
  "opus-4.6",
  "opus4.6"
]);
const DEFAULT_EVAL_MODELS_LABEL = "openai:gpt-5.4, anthropic:claude-opus-4-6";

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listEvalCandidates() {
  const skillsDirectoryPath = path.join(REPO_ROOT, "skills");
  if (!fs.existsSync(skillsDirectoryPath)) {
    return [];
  }

  return fs.readdirSync(skillsDirectoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const skillName = entry.name;
      const suiteFilePath = path.join(skillsDirectoryPath, skillName, "evals", "suite.json");
      if (!fs.existsSync(suiteFilePath)) {
        return null;
      }

      let suiteId = skillName;
      let description = "";
      try {
        const suiteDefinition = readJsonFile(suiteFilePath);
        suiteId = suiteDefinition.id || suiteId;
      } catch {
        // Keep the fallback values. The CLI will validate the suite if this skill is selected.
      }

      try {
        const skillMetadata = readSkillMetadata(path.join(REPO_ROOT, "skills", skillName));
        description = skillMetadata.description || "";
      } catch {
        // Keep the fallback description when the skill manifest or compatibility metadata cannot be parsed.
      }

      return {
        name: skillName,
        suiteId,
        description
      };
    })
    .filter(Boolean)
    .sort((leftCandidate, rightCandidate) => leftCandidate.name.localeCompare(rightCandidate.name));
}

function inferSkillFromInvocationDirectory(candidateNames) {
  const invocationDirectoryPath = process.env.INIT_CWD
    ? path.resolve(process.env.INIT_CWD)
    : process.cwd();
  const relativeInvocationPath = path.relative(REPO_ROOT, invocationDirectoryPath);
  if (relativeInvocationPath.startsWith("..")) {
    return null;
  }

  const pathSegments = relativeInvocationPath.split(path.sep).filter(Boolean);
  const inferredSkillName =
    pathSegments[0] === "skills" && pathSegments[1]
      ? pathSegments[1]
      : pathSegments[0] === "evals" && pathSegments[1] === "suites" && pathSegments[2]
        ? pathSegments[2]
        : null;

  return inferredSkillName && candidateNames.has(inferredSkillName) ? inferredSkillName : null;
}

function looksLikeModelSelector(argumentText) {
  return argumentText.includes(":") || POSITIONAL_MODEL_ALIASES.has(argumentText.toLowerCase());
}

function parseWrapperArguments(rawArguments, { candidateNames, inferredSkillName }) {
  const passthroughArguments = [];
  const positionalArguments = [];
  const explicitModelSelectors = [];
  let jsonOutput = false;

  for (let argumentIndex = 0; argumentIndex < rawArguments.length; argumentIndex += 1) {
    const rawArgument = rawArguments[argumentIndex];
    if (rawArgument === "--json") {
      jsonOutput = true;
      passthroughArguments.push(rawArgument);
      continue;
    }

    if (rawArgument === "--model") {
      const modelArgument = rawArguments[argumentIndex + 1];
      passthroughArguments.push(rawArgument);
      if (modelArgument) {
        passthroughArguments.push(modelArgument);
        explicitModelSelectors.push(modelArgument);
        argumentIndex += 1;
      }
      continue;
    }

    if (rawArgument.startsWith("--")) {
      passthroughArguments.push(rawArgument);
      continue;
    }

    positionalArguments.push(rawArgument);
  }

  let explicitSkillName = null;
  let positionalModelSelectors = [];

  if (positionalArguments.length > 0) {
    const firstPositionalArgument = positionalArguments[0];
    if (candidateNames.has(firstPositionalArgument)) {
      explicitSkillName = firstPositionalArgument;
      positionalModelSelectors = positionalArguments.slice(1);
    } else if (inferredSkillName && looksLikeModelSelector(firstPositionalArgument)) {
      positionalModelSelectors = positionalArguments;
    } else {
      explicitSkillName = firstPositionalArgument;
      positionalModelSelectors = positionalArguments.slice(1);
    }
  }

  const forwardedArguments = [...passthroughArguments];
  for (const modelSelector of positionalModelSelectors) {
    forwardedArguments.push("--model", modelSelector);
  }

  return {
    explicitSkillName,
    forwardedArguments,
    jsonOutput,
    modelSelectors: [...explicitModelSelectors, ...positionalModelSelectors]
  };
}

async function resolveSkillName(explicitSkillName, candidates) {
  if (explicitSkillName) {
    return explicitSkillName;
  }

  const candidateNames = new Set(candidates.map((candidate) => candidate.name));
  const inferredSkillName = inferSkillFromInvocationDirectory(candidateNames);
  if (inferredSkillName) {
    return inferredSkillName;
  }

  if (candidates.length === 1) {
    return candidates[0].name;
  }

  if (process.stdin.isTTY && process.stdout.isTTY) {
    const selection = await interactiveSelect({
      title: "Choose a skill to evaluate",
      promptLabel: "Skill",
      clearOnExit: true,
      items: candidates.map((candidate) => ({
        value: candidate.name,
        label: candidate.name,
        hint: candidate.description || candidate.suiteId
      }))
    });
    return selection?.value ?? null;
  }

  return null;
}

function renderMissingSkillHelp(candidates) {
  const ui = createCommandUi({ stream: process.stderr });
  const previewCandidates = candidates.slice(0, 6).map((candidate) =>
    ui.formatBullet(`${candidate.name} ${candidate.description || candidate.suiteId}`.trim())
  );
  const lines = [
    ui.formatStatusLine({
      kind: "warn",
      text: "No skill was specified for `npm run eval`."
    }),
    ui.formatBullet("Run `npm run eval react` to target a specific skill."),
    ui.formatBullet("Run `npm run eval react mock` for a zero-cost local smoke test.")
  ];

  if (previewCandidates.length > 0) {
    lines.push("");
    lines.push(ui.colors.header("Available skills"));
    lines.push(...previewCandidates);
  }

  return ui.renderPanel({
    title: "Eval",
    lines
  });
}

function renderEvalStart({ skillName, modelSelectors }) {
  const ui = createCommandUi({ stream: process.stdout });
  return ui.renderPanel({
    title: `Starting Eval ${skillName}`,
    lines: [
      ui.formatStatusLine({
        kind: "info",
        text: `Selected ${skillName}`,
        detail: "starting eval setup"
      }),
      ui.formatField(
        "models",
        modelSelectors.length > 0 ? modelSelectors.join(", ") : DEFAULT_EVAL_MODELS_LABEL
      ),
      ui.formatStatusLine({
        kind: "info",
        text: "Preparing providers, suite, and history"
      })
    ]
  });
}

async function main() {
  const rawArguments = process.argv.slice(2);
  const candidates = listEvalCandidates();
  const candidateNames = new Set(candidates.map((candidate) => candidate.name));
  const inferredSkillName = inferSkillFromInvocationDirectory(candidateNames);
  const parsedArguments = parseWrapperArguments(rawArguments, {
    candidateNames,
    inferredSkillName
  });
  const resolvedSkillName = await resolveSkillName(parsedArguments.explicitSkillName, candidates);

  if (!resolvedSkillName) {
    process.stderr.write(renderMissingSkillHelp(candidates));
    return 1;
  }

  if (!parsedArguments.jsonOutput) {
    process.stdout.write(
      renderEvalStart({
        skillName: resolvedSkillName,
        modelSelectors: parsedArguments.modelSelectors
      })
    );
  }

  return runCommandLine(
    ["node", "vasir", "eval", "run", resolvedSkillName, ...parsedArguments.forwardedArguments],
    {
      currentWorkingDirectory: process.env.INIT_CWD
        ? path.resolve(process.env.INIT_CWD)
        : process.cwd()
    }
  );
}

process.exit(await main());
