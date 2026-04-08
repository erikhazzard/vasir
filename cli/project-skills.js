import fs from "node:fs";
import path from "node:path";

import { assertSupportedAgentsProfile, initializeProjectAgentsFile } from "./agents.js";
import { VasirCliError } from "./cli-error.js";
import {
  ADD_REFERENCE_DOCS_REF,
  ADOPT_REFERENCE_DOCS_REF,
  ADD_REQUEST_TROUBLESHOOTING_DOCS_REF,
  REPLACE_SAFETY_TROUBLESHOOTING_DOCS_REF
} from "./docs-ref.js";
import { ensureDirectoryAlias } from "./link-directory.js";
import { buildProjectPaths } from "./path-layout.js";
import { createTrackingProjectConfig, readProjectConfig, writeProjectConfig } from "./project-config.js";
import {
  assertProjectSkillReplaceSafety,
  createEmptyProjectInstallState,
  createProjectSkillInstallStateEntry,
  readProjectInstallState,
  writeProjectInstallState
} from "./project-install-state.js";
import { listSkillFiles } from "./skill-metadata.js";

function copyFileIntoProject({ sourceFilePath, targetFilePath }) {
  fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
  fs.copyFileSync(sourceFilePath, targetFilePath);
}

function listProjectSkillDirectoryNames(projectPaths) {
  if (!fs.existsSync(projectPaths.projectSkillsDirectory)) {
    return [];
  }

  return fs.readdirSync(projectPaths.projectSkillsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((leftSkillName, rightSkillName) => leftSkillName.localeCompare(rightSkillName));
}

function writeTrackingPolicy({
  projectPaths,
  trackingMode,
  trackedSkillNames
}) {
  if (trackingMode !== "all" && trackingMode !== "selected") {
    return;
  }

  writeProjectConfig({
    projectPaths,
    projectConfig: createTrackingProjectConfig({
      trackingMode,
      selectedSkillNames: trackingMode === "selected" ? trackedSkillNames : []
    })
  });
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
  agentsProfileName = null,
  initializeAgentsFile = true,
  catalogProvenance = null,
  trackingMode = null,
  replaceExistingSkills = false,
  projectRootDirectory = null,
  currentWorkingDirectory = process.cwd(),
  platform = process.platform
}) {
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  const projectInstallState = readProjectInstallState({ projectPaths });
  const projectAgentsFilePath = path.join(projectPaths.projectRootDirectory, "AGENTS.md");

  if (agentsProfileName !== null) {
    assertSupportedAgentsProfile(agentsProfileName);
    if (fs.existsSync(projectAgentsFilePath) && !replaceExistingSkills) {
      throw new VasirCliError({
        code: "AGENTS_FILE_EXISTS",
        message: `AGENTS.md already exists at ${projectAgentsFilePath}`,
        suggestion:
          "Review the existing file, or rerun `vasir add <skill> --agents-profile <profile> --replace` if you explicitly want to overwrite it as part of add.",
        docsRef: REPLACE_SAFETY_TROUBLESHOOTING_DOCS_REF
      });
    }
  }

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
      managedRelativeFilePaths,
      provenance: {
        installedAt: new Date().toISOString(),
        installedByVersion: catalogProvenance?.packageVersion ?? null,
        sourceHash: catalogProvenance?.sourceHash ?? null,
        skillVersion: skillEntry.version ?? null,
        sourcePath: skillEntry.path ?? null
      }
    });
    installedSkillNames.push(skillName);
    if (willReplaceExistingSkill) {
      replacedSkillNames.push(skillName);
    }
  }

  projectInstallState.catalog = catalogProvenance
    ? {
        packageVersion: catalogProvenance.packageVersion ?? null,
        sourceHash: catalogProvenance.sourceHash ?? null
      }
    : projectInstallState.catalog ?? null;
  if (projectInstallState.catalog && trackingMode !== null) {
    projectInstallState.catalog.trackingMode = trackingMode;
  } else if (projectInstallState.catalog === null && trackingMode !== null) {
    projectInstallState.catalog = {
      packageVersion: null,
      sourceHash: null,
      trackingMode
    };
  }

  const agentsInitialization = initializeAgentsFile
    ? initializeProjectAgentsFile({
        globalCatalogDirectory,
        projectRootDirectory: projectPaths.projectRootDirectory,
        profileName: agentsProfileName,
        ifExists: agentsProfileName ? replaceExistingSkills ? "replace" : "error" : "skip"
      })
    : {
        agentsFilePath: path.join(projectPaths.projectRootDirectory, "AGENTS.md"),
        profile: null,
        wroteAgentsFile: false
      };

  writeProjectInstallState({
    projectPaths,
    projectInstallState
  });
  writeTrackingPolicy({
    projectPaths,
    trackingMode,
    trackedSkillNames: Object.keys(projectInstallState.skills)
  });

  return {
    projectPaths,
    installedSkillNames,
    replacedSkillNames,
    agentsFilePath: agentsInitialization.agentsFilePath,
    agentsProfile: agentsInitialization.profile,
    wroteAgentsFile: agentsInitialization.wroteAgentsFile
  };
}

export function removeSkillsFromProject({
  skillNames,
  projectRootDirectory = null,
  currentWorkingDirectory = process.cwd()
}) {
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  const projectConfig = readProjectConfig({ projectPaths });
  const projectInstallState = readProjectInstallState({ projectPaths });
  const removedSkillNames = [];
  const missingSkillNames = [];

  for (const skillName of skillNames) {
    const targetSkillDirectory = path.join(projectPaths.projectSkillsDirectory, skillName);
    if (fs.existsSync(targetSkillDirectory)) {
      fs.rmSync(targetSkillDirectory, { recursive: true, force: true });
      removedSkillNames.push(skillName);
    } else {
      missingSkillNames.push(skillName);
    }

    delete projectInstallState.skills[skillName];
  }

  const currentTrackingMode = projectConfig?.tracking?.mode ??
    (projectInstallState.catalog?.trackingMode === "all" || projectInstallState.catalog?.trackingMode === "selected"
      ? projectInstallState.catalog.trackingMode
      : "selected");
  const switchedTrackingModeToSelected =
    currentTrackingMode === "all" && removedSkillNames.length > 0;

  if (switchedTrackingModeToSelected) {
    projectInstallState.catalog.trackingMode = "selected";
  }

  writeProjectInstallState({
    projectPaths,
    projectInstallState
  });
  writeTrackingPolicy({
    projectPaths,
    trackingMode: switchedTrackingModeToSelected ? "selected" : currentTrackingMode,
    trackedSkillNames: Object.keys(projectInstallState.skills)
  });

  return {
    projectPaths,
    removedSkillNames,
    missingSkillNames,
    switchedTrackingModeToSelected
  };
}

export function adoptProjectSkills({
  registry,
  catalogProvenance = null,
  projectRootDirectory = null,
  currentWorkingDirectory = process.cwd(),
  platform = process.platform
}) {
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  const installedSkillNames = listProjectSkillDirectoryNames(projectPaths);
  if (installedSkillNames.length === 0) {
    throw new VasirCliError({
      code: "ADOPT_SKILLS_MISSING",
      message: `No project-local skills exist under ${projectPaths.projectSkillsDirectory}.`,
      suggestion: "Run `vasir init` to install the full catalog, or `vasir add <skill>` to install a selected subset first.",
      docsRef: ADOPT_REFERENCE_DOCS_REF
    });
  }

  const skillEntriesByName = new Map(registry.skills.map((skillEntry) => [skillEntry.name, skillEntry]));
  const adoptedSkillNames = [];
  const skippedSkillNames = [];
  const projectInstallState = createEmptyProjectInstallState();

  for (const skillName of installedSkillNames) {
    const skillEntry = skillEntriesByName.get(skillName);
    if (!skillEntry) {
      skippedSkillNames.push(skillName);
      continue;
    }

    const targetSkillDirectory = path.join(projectPaths.projectSkillsDirectory, skillName);
    const managedRelativeFilePaths = listSkillFiles(targetSkillDirectory);
    projectInstallState.skills[skillName] = createProjectSkillInstallStateEntry({
      targetSkillDirectory,
      managedRelativeFilePaths,
      provenance: {
        installedAt: new Date().toISOString(),
        installedByVersion: catalogProvenance?.packageVersion ?? null,
        sourceHash: catalogProvenance?.sourceHash ?? null,
        skillVersion: skillEntry.version ?? null,
        sourcePath: skillEntry.path ?? null
      }
    });
    adoptedSkillNames.push(skillName);
  }

  if (adoptedSkillNames.length === 0) {
    throw new VasirCliError({
      code: "ADOPT_SKILLS_UNKNOWN",
      message: `No installed project-local skills match the current Vasir catalog in ${projectPaths.projectSkillsDirectory}.`,
      suggestion: "Keep those custom directories unmanaged, or install a listed Vasir skill with `vasir add <skill>` before retrying `vasir adopt`.",
      docsRef: ADOPT_REFERENCE_DOCS_REF,
      context: {
        installedSkillNames
      }
    });
  }

  projectInstallState.catalog = {
    packageVersion: catalogProvenance?.packageVersion ?? null,
    sourceHash: catalogProvenance?.sourceHash ?? null,
    trackingMode:
      adoptedSkillNames.length === registry.skills.length &&
      registry.skills.every((skillEntry) => adoptedSkillNames.includes(skillEntry.name))
        ? "all"
        : "selected"
  };

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

  writeProjectInstallState({
    projectPaths,
    projectInstallState
  });
  writeTrackingPolicy({
    projectPaths,
    trackingMode: projectInstallState.catalog.trackingMode,
    trackedSkillNames: adoptedSkillNames
  });

  return {
    projectPaths,
    adoptedSkillNames,
    skippedSkillNames,
    trackingMode: projectInstallState.catalog.trackingMode
  };
}

export function listInstalledProjectSkills({
  projectRootDirectory = null,
  currentWorkingDirectory = process.cwd()
}) {
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  readProjectInstallState({ projectPaths });

  return {
    projectPaths,
    skillNames: listProjectSkillDirectoryNames(projectPaths)
  };
}

export function listManagedProjectSkills({
  projectRootDirectory = null,
  currentWorkingDirectory = process.cwd()
}) {
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  const projectInstallState = readProjectInstallState({ projectPaths });

  return {
    projectPaths,
    skillNames: Object.keys(projectInstallState.skills)
      .sort((leftSkillName, rightSkillName) => leftSkillName.localeCompare(rightSkillName))
  };
}
