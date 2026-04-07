import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { readSkillMetadata } from "./skill-metadata.js";
import { runCommandLine } from "./command-runner.js";
import { createCommandUi } from "./ui/command-output.js";
import { interactiveSelect } from "./ui/interactive-select.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KNOWN_EVAL_SUBCOMMANDS = new Set(["run", "inspect", "rescore"]);
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

function listSkills() {
  const skillsDirectoryPath = path.join(REPO_ROOT, ".agents", "skills");
  if (!fs.existsSync(skillsDirectoryPath)) {
    return [];
  }

  return fs.readdirSync(skillsDirectoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const skillName = entry.name;
      const suiteFilePath = path.join(skillsDirectoryPath, skillName, "evals", "suite.json");
      const hasEvalSuite = fs.existsSync(suiteFilePath);

      if (!fs.existsSync(suiteFilePath)) {
        let description = "";
        try {
          const skillMetadata = readSkillMetadata(path.join(REPO_ROOT, ".agents", "skills", skillName));
          description = skillMetadata.description || "";
        } catch {
          // Keep the fallback description when the skill manifest or compatibility metadata cannot be parsed.
        }

        return {
          name: skillName,
          suiteId: null,
          description,
          hasEvalSuite
        };
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
        const skillMetadata = readSkillMetadata(path.join(REPO_ROOT, ".agents", "skills", skillName));
        description = skillMetadata.description || "";
      } catch {
        // Keep the fallback description when the skill manifest or compatibility metadata cannot be parsed.
      }

      return {
        name: skillName,
        suiteId,
        description,
        hasEvalSuite
      };
    })
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
    pathSegments[0] === ".agents" && pathSegments[1] === "skills" && pathSegments[2]
      ? pathSegments[2]
      : null;

  return inferredSkillName && candidateNames.has(inferredSkillName) ? inferredSkillName : null;
}

function looksLikeModelSelector(argumentText) {
  return argumentText.includes(":") || POSITIONAL_MODEL_ALIASES.has(argumentText.toLowerCase());
}

function splitSubcommand(rawArguments) {
  const firstArgument = rawArguments[0] ?? null;
  if (firstArgument && KNOWN_EVAL_SUBCOMMANDS.has(firstArgument)) {
    return {
      subcommand: firstArgument,
      commandArguments: rawArguments.slice(1)
    };
  }

  return {
    subcommand: "run",
    commandArguments: rawArguments
  };
}

function parseWrapperArguments(rawArguments, { candidateNames, inferredSkillName, subcommand }) {
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

    if (rawArgument === "--trials") {
      const trialCountArgument = rawArguments[argumentIndex + 1];
      passthroughArguments.push(rawArgument);
      if (trialCountArgument) {
        passthroughArguments.push(trialCountArgument);
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

  if (subcommand !== "run") {
    if (positionalArguments.length > 0) {
      const firstPositionalArgument = positionalArguments[0];
      if (candidateNames.has(firstPositionalArgument)) {
        explicitSkillName = firstPositionalArgument;
        passthroughArguments.push(...positionalArguments.slice(1));
      } else if (inferredSkillName) {
        passthroughArguments.push(...positionalArguments);
      } else {
        explicitSkillName = firstPositionalArgument;
        passthroughArguments.push(...positionalArguments.slice(1));
      }
    }

    return {
      explicitSkillName,
      forwardedArguments: passthroughArguments,
      jsonOutput,
      modelSelectors: explicitModelSelectors
    };
  }

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
    const evalReadySkills = candidates.filter((candidate) => candidate.hasEvalSuite);
    const missingEvalSkills = candidates.filter((candidate) => !candidate.hasEvalSuite);
    const selection = await interactiveSelect({
      title: "Choose a skill to evaluate",
      promptLabel: "Skill",
      clearOnExit: true,
      items: [
        {
          value: "__eval_enabled__",
          label: "Eval Enabled",
          hint: `${evalReadySkills.length}/${candidates.length}`,
          isSpecial: true,
          selectable: false
        },
        ...evalReadySkills.map((candidate) => ({
          value: candidate.name,
          label: candidate.name,
          hint: candidate.description || candidate.suiteId
        })),
        ...(missingEvalSkills.length > 0
          ? [
            {
              value: "__missing_evals__",
              label: "Not Yet Enabled",
              hint: `${missingEvalSkills.length}/${candidates.length}`,
              isSpecial: true,
              selectable: false
            },
            ...missingEvalSkills.map((candidate) => ({
              value: candidate.name,
              label: candidate.name,
              hint: candidate.description || "no built-in eval suite yet",
              selectable: false
            }))
          ]
          : [])
      ]
    });
    return selection?.value ?? null;
  }

  return null;
}

function renderSkillPreview(ui, skills) {
  return skills.map((skill) =>
    ui.formatBullet(
      skill.hasEvalSuite
        ? `${skill.name} ${skill.description || skill.suiteId}`.trim()
        : `${skill.name} ${skill.description || "no built-in eval suite yet"}`.trim()
    )
  );
}

function renderMissingSkillHelp(skills) {
  const ui = createCommandUi({ stream: process.stderr });
  const evalReadySkills = skills.filter((skill) => skill.hasEvalSuite);
  const missingEvalSkills = skills.filter((skill) => !skill.hasEvalSuite);
  const lines = [
    ui.formatStatusLine({
      kind: "warn",
      text: "No skill was specified for `npm run eval`."
    }),
    ui.formatBullet("Run `npm run eval testing__enforcing-mandate` to target a specific skill."),
    ui.formatBullet("Run `npm run eval testing__enforcing-mandate mock` for a zero-cost local smoke test.")
  ];

  if (skills.length > 0) {
    lines.push("");
    lines.push(ui.colors.header(`Eval-Ready Skills (${evalReadySkills.length}/${skills.length})`));
    lines.push(...renderSkillPreview(ui, evalReadySkills.slice(0, 8)));

    if (missingEvalSkills.length > 0) {
      lines.push("");
      lines.push(ui.colors.header(`Missing Built-In Evals (${missingEvalSkills.length}/${skills.length})`));
      lines.push(...renderSkillPreview(ui, missingEvalSkills.slice(0, 8)));
      if (missingEvalSkills.length > 8) {
        lines.push(ui.formatBullet(`+${missingEvalSkills.length - 8} more without built-in eval suites`));
      }
    }
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
  const { subcommand, commandArguments } = splitSubcommand(process.argv.slice(2));
  const skills = listSkills();
  const skillNames = new Set(skills.map((skill) => skill.name));
  const inferredSkillName = inferSkillFromInvocationDirectory(skillNames);
  const parsedArguments = parseWrapperArguments(commandArguments, {
    candidateNames: skillNames,
    inferredSkillName,
    subcommand
  });
  const resolvedSkillName = await resolveSkillName(parsedArguments.explicitSkillName, skills);
  const resolvedSkill = skills.find((skill) => skill.name === resolvedSkillName) ?? null;

  if (!resolvedSkillName) {
    process.stderr.write(renderMissingSkillHelp(skills));
    return 1;
  }

  if (subcommand === "run" && !parsedArguments.jsonOutput && resolvedSkill?.hasEvalSuite) {
    process.stdout.write(
      renderEvalStart({
        skillName: resolvedSkillName,
        modelSelectors: parsedArguments.modelSelectors
      })
    );
  }

  return runCommandLine(
    ["node", "vasir", "eval", subcommand, resolvedSkillName, ...parsedArguments.forwardedArguments],
    {
      currentWorkingDirectory: process.env.INIT_CWD
        ? path.resolve(process.env.INIT_CWD)
        : process.cwd()
    }
  );
}

process.exit(await main());
