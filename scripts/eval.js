import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { runCommandLine } from "../install/command-runner.js";
import { createCommandUi } from "./ui/command-output.js";
import { interactiveSelect } from "./ui/interactive-select.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listEvalCandidates() {
  const suitesDirectoryPath = path.join(REPO_ROOT, "evals", "suites");
  if (!fs.existsSync(suitesDirectoryPath)) {
    return [];
  }

  return fs.readdirSync(suitesDirectoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const skillName = entry.name;
      const suiteFilePath = path.join(suitesDirectoryPath, skillName, "suite.json");
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

      const metaFilePath = path.join(REPO_ROOT, "skills", skillName, "meta.json");
      if (fs.existsSync(metaFilePath)) {
        try {
          const skillMetadata = readJsonFile(metaFilePath);
          description = skillMetadata.description || "";
        } catch {
          // Keep the fallback description when metadata cannot be parsed.
        }
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
    ui.formatBullet("Run `npm run eval react --model mock` for a zero-cost local smoke test.")
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

async function main() {
  const rawArguments = process.argv.slice(2);
  const explicitSkillName =
    rawArguments[0] && !rawArguments[0].startsWith("--")
      ? rawArguments[0]
      : null;
  const forwardedArguments = explicitSkillName ? rawArguments.slice(1) : rawArguments;
  const candidates = listEvalCandidates();
  const resolvedSkillName = await resolveSkillName(explicitSkillName, candidates);

  if (!resolvedSkillName) {
    process.stderr.write(renderMissingSkillHelp(candidates));
    return 1;
  }

  return runCommandLine(
    ["node", "vasir", "eval", "run", resolvedSkillName, ...forwardedArguments],
    {
      currentWorkingDirectory: process.env.INIT_CWD
        ? path.resolve(process.env.INIT_CWD)
        : process.cwd()
    }
  );
}

process.exit(await main());
