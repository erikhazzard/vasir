import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "./cli-error.js";
import {
  ADD_REFERENCE_DOCS_REF,
  ADD_REQUEST_TROUBLESHOOTING_DOCS_REF,
  REPLACE_SAFETY_TROUBLESHOOTING_DOCS_REF
} from "./docs-ref.js";
import { ensureDirectoryAlias } from "./link-directory.js";
import { buildProjectPaths } from "./path-layout.js";
import {
  assertProjectSkillReplaceSafety,
  createProjectSkillInstallStateEntry,
  readProjectInstallState,
  writeProjectInstallState
} from "./project-install-state.js";
import { listSkillFiles } from "./skill-metadata.js";

function copyFileIntoProject({ sourceFilePath, targetFilePath }) {
  fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
  fs.copyFileSync(sourceFilePath, targetFilePath);
}

function copySkillDirectory({
  sourceSkillDirectory,
  targetSkillDirectory,
  replaceExistingSkills
}) {
  if (fs.existsSync(targetSkillDirectory)) {
    if (!replaceExistingSkills) {
      throw new VasirCliError({
        code: "PROJECT_SKILL_EXISTS",
        message: `Project skill already exists: ${targetSkillDirectory}`,
        suggestion:
          "Rerun `vasir add --replace <skill>` to refresh an unmodified project-local copy, or back up/delete the directory manually first.",
        docsRef: REPLACE_SAFETY_TROUBLESHOOTING_DOCS_REF
      });
    }

    fs.rmSync(targetSkillDirectory, { recursive: true, force: true });
  }

  fs.mkdirSync(targetSkillDirectory, { recursive: true });
  const managedRelativeFilePaths = listSkillFiles(sourceSkillDirectory);

  for (const relativeFilePath of managedRelativeFilePaths) {
    copyFileIntoProject({
      sourceFilePath: path.join(sourceSkillDirectory, relativeFilePath),
      targetFilePath: path.join(targetSkillDirectory, relativeFilePath)
    });
  }

  return managedRelativeFilePaths;
}

export function installSkillsIntoProject({
  registry,
  globalCatalogDirectory,
  skillNames,
  replaceExistingSkills = false,
  currentWorkingDirectory = process.cwd(),
  platform = process.platform
}) {
  const projectPaths = buildProjectPaths({ currentWorkingDirectory });
  const projectInstallState = readProjectInstallState({ projectPaths });

  const skillEntriesByName = new Map(registry.skills.map((skillEntry) => [skillEntry.name, skillEntry]));
  const seenSkillNames = new Set();

  for (const skillName of skillNames) {
    if (seenSkillNames.has(skillName)) {
      throw new VasirCliError({
        code: "DUPLICATE_SKILL_REQUEST",
        message: `Duplicate skill requested: ${skillName}`,
        suggestion: "List each requested skill only once in the same `vasir add` command.",
        docsRef: ADD_REQUEST_TROUBLESHOOTING_DOCS_REF
      });
    }
    seenSkillNames.add(skillName);
  }

  for (const skillName of skillNames) {
    const skillEntry = skillEntriesByName.get(skillName);
    if (!skillEntry) {
      throw new VasirCliError({
        code: "UNKNOWN_SKILL",
        message: `Unknown skill: ${skillName}`,
        suggestion: "Run `vasir list` to see valid skill names.",
        docsRef: ADD_REFERENCE_DOCS_REF
      });
    }

    const targetSkillDirectory = path.join(projectPaths.projectSkillsDirectory, skillName);
    if (fs.existsSync(targetSkillDirectory) && !replaceExistingSkills) {
      throw new VasirCliError({
        code: "PROJECT_SKILL_EXISTS",
        message: `Project skill already exists: ${targetSkillDirectory}`,
        suggestion:
          "Rerun `vasir add --replace <skill>` to refresh an unmodified project-local copy, or back up/delete the directory manually first.",
        docsRef: REPLACE_SAFETY_TROUBLESHOOTING_DOCS_REF
      });
    }

    if (fs.existsSync(targetSkillDirectory) && replaceExistingSkills) {
      assertProjectSkillReplaceSafety({
        projectInstallState,
        skillName,
        targetSkillDirectory
      });
    }
  }

  fs.mkdirSync(projectPaths.projectSkillsDirectory, { recursive: true });
  ensureDirectoryAlias({
    aliasPath: projectPaths.claudeSkillsAliasPath,
    targetPath: projectPaths.projectSkillsDirectory,
    platform
  });
  ensureDirectoryAlias({
    aliasPath: projectPaths.codexSkillsAliasPath,
    targetPath: projectPaths.projectSkillsDirectory,
    platform
  });

  const installedSkillNames = [];
  const replacedSkillNames = [];

  for (const skillName of skillNames) {
    const skillEntry = skillEntriesByName.get(skillName);

    const sourceSkillDirectory = path.join(globalCatalogDirectory, skillEntry.path);
    const targetSkillDirectory = path.join(projectPaths.projectSkillsDirectory, skillName);
    const willReplaceExistingSkill = fs.existsSync(targetSkillDirectory);

    const managedRelativeFilePaths = copySkillDirectory({
      sourceSkillDirectory,
      targetSkillDirectory,
      replaceExistingSkills
    });
    projectInstallState.skills[skillName] = createProjectSkillInstallStateEntry({
      targetSkillDirectory,
      managedRelativeFilePaths
    });
    installedSkillNames.push(skillName);
    if (willReplaceExistingSkill) {
      replacedSkillNames.push(skillName);
    }
  }

  const projectAgentsFilePath = path.join(projectPaths.projectRootDirectory, "AGENTS.md");
  if (!fs.existsSync(projectAgentsFilePath)) {
    copyFileIntoProject({
      sourceFilePath: path.join(globalCatalogDirectory, "templates", "AGENTS.md"),
      targetFilePath: projectAgentsFilePath
    });
  }

  writeProjectInstallState({
    projectPaths,
    projectInstallState
  });

  return {
    projectPaths,
    installedSkillNames,
    replacedSkillNames
  };
}
