import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "../install/cli-error.js";
import { EVAL_REFERENCE_DOCS_REF, EVAL_TROUBLESHOOTING_DOCS_REF } from "../install/docs-ref.js";
import { readGlobalRegistry } from "../install/global-catalog.js";
import { buildProjectPaths } from "../install/path-layout.js";

function readSkillMetadata(skillDirectoryPath) {
  const metadataPath = path.join(skillDirectoryPath, "meta.json");
  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  } catch (error) {
    throw new VasirCliError({
      code: "EVAL_SKILL_INVALID",
      message: `Skill metadata is invalid at ${metadataPath}.`,
      suggestion: "Fix the local skill metadata or use a different skill source, then rerun the eval.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF,
      cause: error
    });
  }
}

function buildSkillPromptFiles({ skillDirectoryPath, skillMetadata }) {
  const managedMarkdownFiles = (skillMetadata.files ?? [])
    .filter((relativeFilePath) => relativeFilePath.endsWith(".md"))
    .sort((leftPath, rightPath) => {
      if (leftPath === "SKILL.md") return -1;
      if (rightPath === "SKILL.md") return 1;
      return leftPath.localeCompare(rightPath);
    });

  if (!managedMarkdownFiles.includes("SKILL.md")) {
    managedMarkdownFiles.unshift("SKILL.md");
  }

  return managedMarkdownFiles.map((relativeFilePath) => ({
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

function tryResolveLocalSkill({ projectRootDirectory, skillName }) {
  const localSourceDirectory = path.join(projectRootDirectory, "skills", skillName);
  const projectSkillDirectory = path.join(projectRootDirectory, ".agents", "skills", skillName);

  for (const candidate of [
    { sourceType: "repo-source", skillDirectoryPath: localSourceDirectory },
    { sourceType: "project-local", skillDirectoryPath: projectSkillDirectory }
  ]) {
    const skillMetadata = readSkillMetadata(candidate.skillDirectoryPath);
    if (!skillMetadata) {
      continue;
    }

    const promptFiles = buildSkillPromptFiles({
      skillDirectoryPath: candidate.skillDirectoryPath,
      skillMetadata
    });
    const promptText = serializeSkillPromptText(promptFiles);

    return {
      skillName,
      sourceType: candidate.sourceType,
      skillDirectoryPath: candidate.skillDirectoryPath,
      skillMetadata,
      promptFiles,
      promptText,
      skillHash: createSkillHash(promptText)
    };
  }

  return null;
}

export function resolveSkillSource({
  skillName,
  currentWorkingDirectory,
  homeDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation
}) {
  const projectPaths = buildProjectPaths({ currentWorkingDirectory });
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
        "Use a skill that exists locally under `skills/` or `.agents/skills/`, or install/list the available skills before running `vasir eval run <skill>`.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  const skillDirectoryPath = path.join(globalPaths.globalCatalogDirectory, registrySkillEntry.path);
  const skillMetadata = readSkillMetadata(skillDirectoryPath);
  if (!skillMetadata) {
    throw new VasirCliError({
      code: "EVAL_SKILL_INVALID",
      message: `Eval skill is missing metadata: ${skillDirectoryPath}`,
      suggestion: "Repair the global catalog or choose a different skill, then rerun the eval.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  const promptFiles = buildSkillPromptFiles({
    skillDirectoryPath,
    skillMetadata
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
