import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "../cli-error.js";
import { EVAL_REFERENCE_DOCS_REF, EVAL_TROUBLESHOOTING_DOCS_REF } from "../docs-ref.js";
import { readGlobalRegistry } from "../global-catalog.js";
import { buildProjectPaths } from "../path-layout.js";
import {
  listSkillPromptMarkdownFiles,
  readSkillMetadata as readSkillMetadataFromDirectory,
  SKILL_MANIFEST_FILE_NAME
} from "../skill-metadata.js";

function tryReadSkillMetadata(skillDirectoryPath) {
  const manifestPath = path.join(skillDirectoryPath, SKILL_MANIFEST_FILE_NAME);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return readSkillMetadataFromDirectory(skillDirectoryPath);
  } catch (error) {
    throw new VasirCliError({
      code: "EVAL_SKILL_INVALID",
      message: `Skill metadata is invalid at ${skillDirectoryPath}.`,
      suggestion: "Fix the local skill manifest or compatibility metadata, then rerun the eval.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF,
      cause: error
    });
  }
}

function buildSkillPromptFiles({ skillDirectoryPath }) {
  return listSkillPromptMarkdownFiles(skillDirectoryPath).map((relativeFilePath) => ({
    relativeFilePath,
    contents: fs.readFileSync(path.join(skillDirectoryPath, relativeFilePath), "utf8")
  }));
}

function serializeSkillPromptText(promptFiles) {
  return promptFiles
    .map(
      (promptFile) =>
        `--- ${promptFile.relativeFilePath} ---\n${promptFile.contents.trim()}\n`
    )
    .join("\n");
}

function createSkillHash(promptText) {
  return crypto.createHash("sha256").update(promptText).digest("hex");
}

function isCatalogSourceRepository(projectRootDirectory) {
  return (
    fs.existsSync(path.join(projectRootDirectory, "registry.json")) &&
    fs.existsSync(path.join(projectRootDirectory, "templates")) &&
    fs.statSync(path.join(projectRootDirectory, "templates")).isDirectory()
  );
}

function tryResolveLocalSkill({ projectRootDirectory, skillName }) {
  const projectSkillDirectory = path.join(projectRootDirectory, ".agents", "skills", skillName);
  const skillMetadata = tryReadSkillMetadata(projectSkillDirectory);
  if (!skillMetadata) {
    return null;
  }

  const promptFiles = buildSkillPromptFiles({
    skillDirectoryPath: projectSkillDirectory
  });
  const promptText = serializeSkillPromptText(promptFiles);

  return {
    skillName,
    sourceType: isCatalogSourceRepository(projectRootDirectory) ? "repo-source" : "project-local",
    skillDirectoryPath: projectSkillDirectory,
    skillMetadata,
    promptFiles,
    promptText,
    skillHash: createSkillHash(promptText)
  };
}

export function resolveSkillSource({
  skillName,
  currentWorkingDirectory,
  projectRootDirectory = null,
  homeDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation
}) {
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  const localSkill = tryResolveLocalSkill({
    projectRootDirectory: projectPaths.projectRootDirectory,
    skillName
  });

  if (localSkill) {
    return {
      ...localSkill,
      projectPaths,
      globalCatalogDirectory: null
    };
  }

  const { globalPaths, registry } = readGlobalRegistry({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const registrySkillEntry = registry.skills.find((skillEntry) => skillEntry.name === skillName);
  if (!registrySkillEntry) {
    throw new VasirCliError({
      code: "EVAL_SKILL_NOT_FOUND",
      message: `Eval skill not found: ${skillName}`,
      suggestion:
        "Use a skill that exists locally under `.agents/skills/`, or install/list the available skills before running `vasir eval run <skill>`.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  const skillDirectoryPath = path.join(globalPaths.globalCatalogDirectory, registrySkillEntry.path);
  const skillMetadata = tryReadSkillMetadata(skillDirectoryPath);
  if (!skillMetadata) {
    throw new VasirCliError({
      code: "EVAL_SKILL_INVALID",
      message: `Eval skill is missing metadata: ${skillDirectoryPath}`,
      suggestion: "Repair the global catalog or choose a different skill, then rerun the eval.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  const promptFiles = buildSkillPromptFiles({
    skillDirectoryPath
  });
  const promptText = serializeSkillPromptText(promptFiles);

  return {
    skillName,
    sourceType: "global-catalog",
    skillDirectoryPath,
    skillMetadata,
    promptFiles,
    promptText,
    skillHash: createSkillHash(promptText),
    projectPaths,
    globalCatalogDirectory: globalPaths.globalCatalogDirectory
  };
}
