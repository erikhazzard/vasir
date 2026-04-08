import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  inspectRecommendedAgentsProfile,
  resolveRecommendedAgentsProfile,
  runAgents
} from "./agents.js";
import {
  formatCliErrorForJson,
  formatCliErrorForText,
  VasirCliError,
  wrapUnknownCliError
} from "./cli-error.js";
import {
  COMMANDS_REFERENCE_DOCS_REF,
  DIFF_REFERENCE_DOCS_REF,
  REPAIR_REFERENCE_DOCS_REF,
  ADD_REFERENCE_DOCS_REF,
  EVAL_REFERENCE_DOCS_REF,
  REMOVE_REFERENCE_DOCS_REF,
  REPLACE_REFERENCE_DOCS_REF,
  UNKNOWN_COMMAND_TROUBLESHOOTING_DOCS_REF
} from "./docs-ref.js";
import { readPackageMetadata } from "./package-metadata.js";
import {
  inspectGlobalCatalog,
  readCatalogSourceRegistry,
  readGlobalRegistry,
  synchronizeGlobalCatalog
} from "./global-catalog.js";
import { ensureDirectoryAlias } from "./link-directory.js";
import { buildGlobalPaths, buildProjectPaths } from "./path-layout.js";
import {
  createTrackingProjectConfig,
  getProjectConfigFilePath,
  readProjectConfig,
  writeProjectConfig
} from "./project-config.js";
import {
  adoptProjectSkills,
  installSkillsIntoProject,
  listInstalledProjectSkills,
  listManagedProjectSkills,
  removeSkillsFromProject
} from "./project-skills.js";
import {
  createEmptyProjectInstallState,
  createProjectSkillInstallStateEntry,
  getProjectInstallStateFilePath,
  inspectProjectSkillReplaceSafety,
  readProjectInstallState,
  writeProjectInstallState
} from "./project-install-state.js";
import { listSkillFiles } from "./skill-metadata.js";
import { canPromptInteractively, promptForMissingProviderCredential } from "./eval/interactive.js";
import { inspectSkillEval } from "./eval/inspect-skill-eval.js";
import { rescoreSkillEval } from "./eval/rescore-skill-eval.js";
import { runSkillEval } from "./eval/run-skill-eval.js";
import { createCommandUi } from "./ui/command-output.js";
import { interactiveMultiSelect } from "./ui/interactive-select.js";
import { isLikelyTextBuffer, renderUnifiedDiff } from "./unified-diff.js";

const ADD_ALL_SKILLS_KEYWORD = "all";
const CONTEXT_SCHEMA_VERSION = 2;
const CONTEXT_MAX_RELEVANT_AGENTS_FILES = 12;
const CONTEXT_MAX_RECOMMENDED_SKILLS = 8;
const CONTEXT_MAX_DEBUG_RECOMMENDATIONS = 12;

function writeLine(outputWriter, message) {
  outputWriter(`${message}\n`);
}

function writeJson(outputWriter, payload) {
  outputWriter(`${JSON.stringify(payload, null, 2)}\n`);
}

function formatVersionText() {
  const packageMetadata = readPackageMetadata();
  return `${packageMetadata.name} ${packageMetadata.version}`;
}

function startTiming() {
  return process.hrtime.bigint();
}

function durationInMilliseconds(startTime) {
  return Number(process.hrtime.bigint() - startTime) / 1e6;
}

function computeFileSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function safeRealPath(targetPath) {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return null;
  }
}

function pathExistsWithoutFollowingDirectoryLink(targetPath) {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch {
    return false;
  }
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

function inspectDirectoryAlias({
  aliasPath,
  targetPath,
  expectAlias
}) {
  const aliasExists = pathExistsWithoutFollowingDirectoryLink(aliasPath);
  const targetExists = fs.existsSync(targetPath);

  if (!aliasExists) {
    return {
      status: expectAlias ? "missing" : "absent",
      aliasPath,
      targetPath
    };
  }

  const aliasStats = fs.lstatSync(aliasPath);
  if (!aliasStats.isSymbolicLink()) {
    return {
      status: "conflict",
      aliasPath,
      targetPath
    };
  }

  if (!targetExists) {
    return {
      status: "broken",
      aliasPath,
      targetPath
    };
  }

  const canonicalAliasTargetPath = safeRealPath(aliasPath);
  const canonicalTargetPath = safeRealPath(targetPath);
  if (canonicalAliasTargetPath !== null && canonicalAliasTargetPath === canonicalTargetPath) {
    return {
      status: "ok",
      aliasPath,
      targetPath
    };
  }

  return {
    status: "broken",
    aliasPath,
    targetPath
  };
}

function repoLooksInitialized(projectPaths) {
  return (
    fs.existsSync(path.join(projectPaths.projectRootDirectory, ".git")) ||
    fs.existsSync(projectPaths.projectConfigFilePath) ||
    fs.existsSync(projectPaths.projectSkillsDirectory) ||
    fs.existsSync(getProjectInstallStateFilePath(projectPaths)) ||
    fs.existsSync(path.join(projectPaths.projectRootDirectory, "AGENTS.md"))
  );
}

function createStatusIssue({
  scope,
  code,
  level,
  message,
  detail = null
}) {
  return {
    scope,
    code,
    level,
    message,
    detail
  };
}

function inspectGlobalSurface({
  homeDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation
}) {
  const globalPaths = buildGlobalPaths({ homeDirectory });
  const issues = [];
  let catalogInspection = null;

  try {
    catalogInspection = inspectGlobalCatalog({
      homeDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation
    });
  } catch (error) {
    const normalizedError = wrapUnknownCliError(error);
    issues.push(
      createStatusIssue({
        scope: "global",
        code: normalizedError.code,
        level: "warn",
        message: normalizedError.message,
        detail: normalizedError.suggestion ?? null
      })
    );
  }

  const globalCatalogDirectoryExists = fs.existsSync(globalPaths.globalCatalogDirectory);
  const globalAliasStates = [
    {
      label: "Claude alias",
      ...inspectDirectoryAlias({
        aliasPath: globalPaths.globalClaudeAliasPath,
        targetPath: globalPaths.globalCatalogDirectory,
        expectAlias: globalCatalogDirectoryExists
      })
    },
    {
      label: "Codex alias",
      ...inspectDirectoryAlias({
        aliasPath: globalPaths.globalCodexAliasPath,
        targetPath: globalPaths.globalCatalogDirectory,
        expectAlias: globalCatalogDirectoryExists
      })
    }
  ];

  for (const aliasState of globalAliasStates) {
    if (aliasState.status === "ok" || aliasState.status === "absent") {
      continue;
    }

    issues.push(
      createStatusIssue({
        scope: "global",
        code:
          aliasState.status === "missing"
            ? "GLOBAL_ALIAS_MISSING"
            : aliasState.status === "conflict"
              ? "GLOBAL_ALIAS_CONFLICT"
              : "GLOBAL_ALIAS_BROKEN",
        level: "warn",
        message: `${aliasState.label} is not pointing at the canonical global catalog.`,
        detail: aliasState.aliasPath
      })
    );
  }

  const globalCatalogStatus = catalogInspection
    ? catalogInspection.catalogState.needsSynchronization
      ? globalCatalogDirectoryExists ? "outdated" : "missing"
      : "current"
    : "error";

  return {
    globalPaths,
    globalCatalogDirectoryExists,
    globalCatalogStatus,
    packageVersion: readPackageMetadata().version,
    catalogInspection,
    aliasStates: globalAliasStates,
    issues
  };
}

function inspectProjectSurface({
  currentWorkingDirectory,
  projectRootDirectory,
  registry,
  globalCatalogDirectory
}) {
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  const installedSkillNames = listProjectSkillDirectoryNames(projectPaths);
  const repoDetected = projectRootDirectory !== null || repoLooksInitialized(projectPaths);
  const issues = [];
  let projectConfig = null;
  let projectConfigError = null;
  let projectInstallState = null;
  let installStateError = null;

  try {
    projectConfig = readProjectConfig({ projectPaths });
  } catch (error) {
    const normalizedError = wrapUnknownCliError(error);
    projectConfigError = normalizedError;
    issues.push(
      createStatusIssue({
        scope: "repo",
        code: normalizedError.code,
        level: "warn",
        message: normalizedError.message,
        detail: normalizedError.suggestion ?? null
      })
    );
  }

  try {
    projectInstallState = readProjectInstallState({ projectPaths });
  } catch (error) {
    const normalizedError = wrapUnknownCliError(error);
    installStateError = normalizedError;
    issues.push(
      createStatusIssue({
        scope: "repo",
        code: normalizedError.code,
        level: "warn",
        message: normalizedError.message,
        detail: normalizedError.suggestion ?? null
      })
    );
  }

  const managedSkillNames = projectInstallState
    ? Object.keys(projectInstallState.skills)
      .sort((leftSkillName, rightSkillName) => leftSkillName.localeCompare(rightSkillName))
    : [];
  const configuredSkillNames =
    projectConfig?.tracking?.mode === "all"
      ? registry?.skills.map((skillEntry) => skillEntry.name) ?? []
      : projectConfig?.tracking?.mode === "selected"
        ? [...projectConfig.tracking.skillNames]
        : managedSkillNames;
  const managedSkillNameSet = new Set(configuredSkillNames);
  const unmanagedInstalledSkillNames = installedSkillNames.filter(
    (installedSkillName) => !managedSkillNameSet.has(installedSkillName)
  );
  const trackingMode =
    registry
      ? resolveProjectTrackingPolicy({
          projectConfig,
          projectInstallState,
          registry,
          managedSkillNames
        }).trackingMode
      : projectConfig?.tracking?.mode ?? projectInstallState?.catalog?.trackingMode ?? null;
  const projectAliasStates = [
    {
      label: "Claude skills alias",
      ...inspectDirectoryAlias({
        aliasPath: projectPaths.claudeSkillsAliasPath,
        targetPath: projectPaths.projectSkillsDirectory,
        expectAlias: installedSkillNames.length > 0 || managedSkillNames.length > 0
      })
    },
    {
      label: "Codex skills alias",
      ...inspectDirectoryAlias({
        aliasPath: projectPaths.codexSkillsAliasPath,
        targetPath: projectPaths.projectSkillsDirectory,
        expectAlias: installedSkillNames.length > 0 || managedSkillNames.length > 0
      })
    }
  ];

  for (const aliasState of projectAliasStates) {
    if (aliasState.status === "ok" || aliasState.status === "absent") {
      continue;
    }

    issues.push(
      createStatusIssue({
        scope: "repo",
        code:
          aliasState.status === "missing"
            ? "PROJECT_ALIAS_MISSING"
            : aliasState.status === "conflict"
              ? "PROJECT_ALIAS_CONFLICT"
              : "PROJECT_ALIAS_BROKEN",
        level: "warn",
        message: `${aliasState.label} is not pointing at the canonical project skills directory.`,
        detail: aliasState.aliasPath
      })
    );
  }

  let syncPlan = null;
  if (
    projectInstallState &&
    registry &&
    globalCatalogDirectory &&
    (projectConfig?.tracking !== null || managedSkillNames.length > 0)
  ) {
    syncPlan = createProjectSyncPlan({
      registry,
      globalCatalogDirectory,
      projectPaths,
      projectConfig,
      projectInstallState,
      managedSkillNames
    });

    for (const blockedSkillPlan of syncPlan.blockedSkillPlans) {
      issues.push(
        createStatusIssue({
          scope: "repo",
          code: blockedSkillPlan.error.code,
          level: "warn",
          message: `Tracked skill is blocked from updates: ${blockedSkillPlan.skillName}`,
          detail: blockedSkillPlan.reason
        })
      );
    }
  }

  if (repoDetected && unmanagedInstalledSkillNames.length > 0) {
    issues.push(
      createStatusIssue({
        scope: "repo",
        code: "PROJECT_ADOPTION_REQUIRED",
        level: "warn",
        message: "Local project skills exist but are not tracked by Vasir yet.",
        detail: unmanagedInstalledSkillNames.join(", ")
      })
    );
  }

  let repoStatus = "no-repo";
  if (repoDetected) {
    if (projectConfigError || installStateError) {
      repoStatus = "invalid-install-state";
    } else if (projectConfig === null && (managedSkillNames.length > 0 || installedSkillNames.length > 0)) {
      repoStatus = "adoption-required";
    } else if (projectConfig?.tracking === null || projectConfig === null) {
      repoStatus = "not-initialized";
    } else {
      repoStatus = "tracked";
    }
  }

  const nextSteps = [];
  if (!repoDetected) {
    nextSteps.push("Run `vasir init` inside a repo when you want the full catalog, or `vasir add <skill>` in a specific repo root.");
  } else if (repoStatus === "invalid-install-state") {
    nextSteps.push("Run `vasir repair` in this repo to rebuild Vasir metadata and aliases from the current repo state.");
  } else if (repoStatus === "adoption-required") {
    nextSteps.push("Run `vasir repair` in this repo to bring the existing `.agents/skills` tree under Vasir management.");
  } else if (repoStatus === "not-initialized") {
    nextSteps.push("Run `vasir init` in this repo to install the full catalog, or `vasir add <skill>` to install a selected subset.");
  } else if ((syncPlan?.updatedSkillNames.length ?? 0) > 0 || (syncPlan?.installedSkillNames.length ?? 0) > 0) {
    nextSteps.push("Run `vasir update --dry-run`, then `vasir update`, to refresh the tracked skills in this repo.");
  } else {
    nextSteps.push("Run `vasir update` later in this repo after upgrading the installed Vasir CLI.");
  }

  return {
    projectPaths,
    repoDetected,
    repoStatus,
    projectConfig,
    projectConfigError,
    installedSkillNames,
    configuredSkillNames,
    managedSkillNames,
    unmanagedInstalledSkillNames,
    projectInstallState,
    installStateError,
    trackingMode,
    aliasStates: projectAliasStates,
    syncPlan,
    issues,
    nextSteps
  };
}

function resolveProjectRootDirectoryFlag(projectRootArgument) {
  if (projectRootArgument === null) {
    return null;
  }

  const resolvedProjectRootDirectory = path.resolve(projectRootArgument);
  if (!fs.existsSync(resolvedProjectRootDirectory)) {
    throw new VasirCliError({
      code: "PROJECT_ROOT_NOT_FOUND",
      message: `Project root does not exist: ${resolvedProjectRootDirectory}`,
      suggestion: "Pass `--repo-root <path>` with an existing directory when targeting a specific repo root.",
      docsRef: COMMANDS_REFERENCE_DOCS_REF
    });
  }

  if (!fs.statSync(resolvedProjectRootDirectory).isDirectory()) {
    throw new VasirCliError({
      code: "PROJECT_ROOT_NOT_DIRECTORY",
      message: `Project root must be a directory: ${resolvedProjectRootDirectory}`,
      suggestion: "Pass `--repo-root <path>` with a directory that should be treated as the repo root.",
      docsRef: COMMANDS_REFERENCE_DOCS_REF
    });
  }

  return resolvedProjectRootDirectory;
}

function buildCatalogSkillEntryMap(registry) {
  return new Map(registry.skills.map((skillEntry) => [skillEntry.name, skillEntry]));
}

function resolveLegacyProjectTrackingMode({
  projectInstallState,
  registry,
  managedSkillNames
}) {
  const explicitTrackingMode = projectInstallState.catalog?.trackingMode ?? null;
  if (explicitTrackingMode === "all" || explicitTrackingMode === "selected") {
    return explicitTrackingMode;
  }

  if (managedSkillNames.length === 0) {
    return null;
  }

  const installedSkillNameSet = new Set(managedSkillNames);
  const catalogSkillNames = registry.skills.map((skillEntry) => skillEntry.name);
  const coversFullCatalog =
    installedSkillNameSet.size === catalogSkillNames.length &&
    catalogSkillNames.every((skillName) => installedSkillNameSet.has(skillName));

  return coversFullCatalog ? "all" : "selected";
}

function resolveProjectTrackingPolicy({
  projectConfig,
  projectInstallState,
  registry,
  managedSkillNames
}) {
  if (projectConfig?.tracking?.mode === "all") {
    return {
      trackingMode: "all",
      desiredSkillNames: registry.skills.map((skillEntry) => skillEntry.name)
    };
  }

  if (projectConfig?.tracking?.mode === "selected") {
    return {
      trackingMode: "selected",
      desiredSkillNames: [...projectConfig.tracking.skillNames]
    };
  }

  const legacyTrackingMode = resolveLegacyProjectTrackingMode({
    projectInstallState,
    registry,
    managedSkillNames
  });

  return {
    trackingMode: legacyTrackingMode,
    desiredSkillNames:
      legacyTrackingMode === "all"
        ? registry.skills.map((skillEntry) => skillEntry.name)
        : managedSkillNames
  };
}

function classifyManagedSkillUpdates({
  desiredSkillNames,
  registry,
  globalCatalogDirectory,
  projectPaths,
  projectInstallState
}) {
  const skillEntriesByName = buildCatalogSkillEntryMap(registry);
  const planEntries = [];

  for (const skillName of desiredSkillNames) {
    const targetSkillDirectory = path.join(projectPaths.projectSkillsDirectory, skillName);
    const trackedSkillEntry = projectInstallState.skills[skillName] ?? null;
    const catalogSkillEntry = skillEntriesByName.get(skillName) ?? null;

    if (!catalogSkillEntry) {
      planEntries.push({
        skillName,
        status: "blocked",
        installedVersion: trackedSkillEntry?.provenance?.skillVersion ?? null,
        availableVersion: null,
        reason: "Skill no longer exists in the current Vasir catalog.",
        error: new VasirCliError({
          code: "UNKNOWN_SKILL",
          message: `Unknown skill: ${skillName}`,
          suggestion: "Run `vasir list` to see valid skill names.",
          docsRef: ADD_REFERENCE_DOCS_REF
        })
      });
      continue;
    }

    if (!fs.existsSync(targetSkillDirectory)) {
      planEntries.push({
        skillName,
        status: "install",
        installedVersion: null,
        availableVersion: catalogSkillEntry.version ?? null,
        reason: "Skill is part of this repo's tracking policy but is not installed locally."
      });
      continue;
    }

    const safetyInspection = inspectProjectSkillReplaceSafety({
      projectInstallState,
      skillName,
      targetSkillDirectory
    });

    if (!safetyInspection.ok) {
      planEntries.push({
        skillName,
        status: "blocked",
        installedVersion: trackedSkillEntry?.provenance?.skillVersion ?? null,
        availableVersion: catalogSkillEntry.version ?? null,
        reason: safetyInspection.error.message,
        error: safetyInspection.error
      });
      continue;
    }

    const sourceSkillDirectory = path.join(globalCatalogDirectory, catalogSkillEntry.path);
    const sourceRelativeFilePaths = listSkillFiles(sourceSkillDirectory).sort();
    const trackedRelativeFilePaths = [...safetyInspection.trackedSkillEntry.managedFiles].sort();
    const fileSetMatches =
      sourceRelativeFilePaths.length === trackedRelativeFilePaths.length &&
      sourceRelativeFilePaths.every((relativeFilePath, index) => relativeFilePath === trackedRelativeFilePaths[index]);
    const hashMatches =
      fileSetMatches &&
      sourceRelativeFilePaths.every(
        (relativeFilePath) =>
          computeFileSha256(path.join(sourceSkillDirectory, relativeFilePath)) ===
            safetyInspection.trackedSkillEntry.fileHashes[relativeFilePath]
      );

    planEntries.push({
      skillName,
      status: hashMatches ? "unchanged" : "update",
      installedVersion: trackedSkillEntry?.provenance?.skillVersion ?? null,
      availableVersion: catalogSkillEntry.version ?? null,
      reason: hashMatches ? "Already matches the current bundled catalog." : "Local copy differs from the current bundled catalog."
    });
  }

  return planEntries;
}

function createProjectSyncPlan({
  registry,
  globalCatalogDirectory,
  projectPaths,
  projectConfig,
  projectInstallState,
  managedSkillNames
}) {
  const trackingPolicy = resolveProjectTrackingPolicy({
    projectConfig,
    projectInstallState,
    registry,
    managedSkillNames
  });
  const trackingMode = trackingPolicy.trackingMode;
  const desiredSkillNames = trackingPolicy.desiredSkillNames;
  const planEntries = desiredSkillNames.length > 0
    ? classifyManagedSkillUpdates({
        desiredSkillNames,
        registry,
        globalCatalogDirectory,
        projectPaths,
        projectInstallState
      })
    : [];

  return {
    trackingMode,
    desiredSkillNames,
    planEntries,
    blockedSkillPlans: planEntries.filter((planEntry) => planEntry.status === "blocked"),
    installedSkillNames: planEntries
      .filter((planEntry) => planEntry.status === "install")
      .map((planEntry) => planEntry.skillName),
    updatedSkillNames: planEntries
      .filter((planEntry) => planEntry.status === "update")
      .map((planEntry) => planEntry.skillName),
    unchangedSkillNames: planEntries
      .filter((planEntry) => planEntry.status === "unchanged")
      .map((planEntry) => planEntry.skillName)
  };
}

function createProjectSkillFilePath({ skillName, relativeFilePath }) {
  return path.posix.join(
    ".agents",
    "skills",
    skillName,
    relativeFilePath.replace(/\\/g, "/")
  );
}

function buildSkillFileChanges({
  skillName,
  planEntry,
  registry,
  globalCatalogDirectory,
  projectPaths
}) {
  if (planEntry.status === "blocked" || planEntry.status === "unchanged") {
    return [];
  }

  const catalogSkillEntry = buildCatalogSkillEntryMap(registry).get(skillName);
  if (!catalogSkillEntry) {
    return [];
  }

  const sourceSkillDirectory = path.join(globalCatalogDirectory, catalogSkillEntry.path);
  const targetSkillDirectory = path.join(projectPaths.projectSkillsDirectory, skillName);
  const sourceRelativeFilePaths = listSkillFiles(sourceSkillDirectory);
  const targetRelativeFilePaths = fs.existsSync(targetSkillDirectory)
    ? listSkillFiles(targetSkillDirectory)
    : [];

  if (planEntry.status === "install") {
    return sourceRelativeFilePaths.map((relativeFilePath) => ({
      status: "added",
      format: "summary",
      relativeFilePath,
      projectRelativePath: createProjectSkillFilePath({
        skillName,
        relativeFilePath
      }),
      unifiedDiff: null
    }));
  }

  const fileChangeEntries = [];
  const comparedRelativeFilePaths = [...new Set([
    ...sourceRelativeFilePaths,
    ...targetRelativeFilePaths
  ])].sort((leftRelativeFilePath, rightRelativeFilePath) => leftRelativeFilePath.localeCompare(rightRelativeFilePath));

  for (const relativeFilePath of comparedRelativeFilePaths) {
    const sourceFilePath = path.join(sourceSkillDirectory, relativeFilePath);
    const targetFilePath = path.join(targetSkillDirectory, relativeFilePath);
    const sourceExists = fs.existsSync(sourceFilePath);
    const targetExists = fs.existsSync(targetFilePath);
    const projectRelativePath = createProjectSkillFilePath({
      skillName,
      relativeFilePath
    });

    if (sourceExists && !targetExists) {
      fileChangeEntries.push({
        status: "added",
        format: "summary",
        relativeFilePath,
        projectRelativePath,
        unifiedDiff: null
      });
      continue;
    }

    if (!sourceExists && targetExists) {
      fileChangeEntries.push({
        status: "removed",
        format: "summary",
        relativeFilePath,
        projectRelativePath,
        unifiedDiff: null
      });
      continue;
    }

    const sourceBuffer = fs.readFileSync(sourceFilePath);
    const targetBuffer = fs.readFileSync(targetFilePath);
    if (sourceBuffer.equals(targetBuffer)) {
      continue;
    }

    const isTextChange = isLikelyTextBuffer(sourceBuffer) && isLikelyTextBuffer(targetBuffer);
    fileChangeEntries.push({
      status: "modified",
      format: isTextChange ? "text" : "binary",
      relativeFilePath,
      projectRelativePath,
      unifiedDiff: isTextChange
        ? renderUnifiedDiff({
            previousFileLabel: `a/${projectRelativePath}`,
            nextFileLabel: `b/${projectRelativePath}`,
            previousText: targetBuffer.toString("utf8"),
            nextText: sourceBuffer.toString("utf8")
          })
        : null
    });
  }

  return fileChangeEntries;
}

function summarizeBlockedSkillPlan(planEntry) {
  const errorContext = planEntry.error?.context ?? {};

  return {
    modifiedRelativeFilePaths: Array.isArray(errorContext.modifiedRelativeFilePaths)
      ? [...errorContext.modifiedRelativeFilePaths]
      : [],
    missingRelativeFilePaths: Array.isArray(errorContext.missingRelativeFilePaths)
      ? [...errorContext.missingRelativeFilePaths]
      : [],
    unexpectedRelativeFilePaths: Array.isArray(errorContext.unexpectedRelativeFilePaths)
      ? [...errorContext.unexpectedRelativeFilePaths]
      : []
  };
}

function resolveRequestedDiffSkillNames({
  requestedSkillNames,
  syncPlan
}) {
  if (requestedSkillNames.length === 0) {
    return [];
  }

  const dedupedSkillNames = [...new Set(requestedSkillNames)];
  if (dedupedSkillNames.length !== requestedSkillNames.length) {
    const duplicateSkillNames = requestedSkillNames.filter(
      (skillName, skillIndex) => requestedSkillNames.indexOf(skillName) !== skillIndex
    );
    throw new VasirCliError({
      code: "DUPLICATE_SKILL_REQUEST",
      message: `Duplicate skill requested: ${duplicateSkillNames[0]}`,
      suggestion: "List each requested skill only once in the same `vasir diff` command.",
      docsRef: DIFF_REFERENCE_DOCS_REF
    });
  }

  const desiredSkillNameSet = new Set(syncPlan.desiredSkillNames);
  const untrackedSkillNames = dedupedSkillNames.filter(
    (skillName) => !desiredSkillNameSet.has(skillName)
  );
  if (untrackedSkillNames.length > 0) {
    throw new VasirCliError({
      code: "DIFF_SKILL_NOT_TRACKED",
      message: `Requested skill is not part of this repo's Vasir tracking policy: ${untrackedSkillNames[0]}`,
      suggestion:
        "Run `vasir status` to inspect the current tracking policy, or install the skill into this repo before diffing it.",
      docsRef: DIFF_REFERENCE_DOCS_REF,
      context: {
        untrackedSkillNames
      }
    });
  }

  return dedupedSkillNames;
}

function assertRepoReadyForDiff(projectState) {
  if (!projectState.repoDetected) {
    throw new VasirCliError({
      code: "DIFF_REPO_NOT_FOUND",
      message: "`vasir diff` must be run inside a repo, or with `--repo-root <path>`.",
      suggestion: "Run `vasir init` inside the target repo first, or pass `--repo-root <path>` explicitly.",
      docsRef: DIFF_REFERENCE_DOCS_REF
    });
  }

  if (projectState.repoStatus === "tracked") {
    return;
  }

  if (projectState.repoStatus === "adoption-required") {
    throw new VasirCliError({
      code: "PROJECT_ADOPTION_REQUIRED",
      message: "This repo has local Vasir skills that are not under Vasir management yet.",
      suggestion: "Run `vasir repair` in this repo, then rerun `vasir diff`.",
      docsRef: DIFF_REFERENCE_DOCS_REF
    });
  }

  if (projectState.repoStatus === "invalid-install-state") {
    const repairError = projectState.projectConfigError ?? projectState.installStateError;
    throw new VasirCliError({
      code: repairError?.code ?? "INVALID_PROJECT_INSTALL_STATE",
      message: repairError?.message ?? "This repo needs Vasir metadata repair before diffs are trustworthy.",
      suggestion: "Run `vasir doctor`, then `vasir repair`, before rerunning `vasir diff`.",
      docsRef: DIFF_REFERENCE_DOCS_REF
    });
  }

  throw new VasirCliError({
    code: "DIFF_REPO_NOT_TRACKED",
    message: "This repo is not tracking any Vasir skills yet.",
    suggestion: "Run `vasir init` for the full catalog, or `vasir add <skill>` for a selected subset, then rerun `vasir diff`.",
    docsRef: DIFF_REFERENCE_DOCS_REF
  });
}

function readAgentsProfileHintFromFile(agentsFilePath) {
  if (!fs.existsSync(agentsFilePath)) {
    return null;
  }

  const agentsText = fs.readFileSync(agentsFilePath, "utf8");
  return agentsText.match(/<!--\s*vasir:profile:([a-z0-9-]+)\s*-->/i)?.[1] ?? null;
}

function createContextAction({
  argv,
  reason,
  mutatesFiles
}) {
  return {
    kind: "contextAction",
    argv,
    commandText: argv.join(" "),
    reason,
    mutatesFiles
  };
}

function createContextWarning({
  code,
  message,
  detail = null
}) {
  return {
    kind: "contextWarning",
    code,
    message,
    detail
  };
}

function createContextAgentsFileRecord({
  scope,
  path: absolutePath,
  repoRelativePath,
  exists,
  discoveredBy
}) {
  return {
    kind: "agentsFile",
    scope,
    path: absolutePath,
    repoRelativePath,
    exists,
    discoveredBy
  };
}

function createContextSkillRecommendationSignal({
  signalKind,
  scoreDelta,
  label,
  matchedValues = []
}) {
  return {
    kind: "recommendationSignal",
    signalKind,
    scoreDelta,
    label,
    matchedValues
  };
}

function createContextSkillRecommendation({
  skillName,
  score,
  matchedSignals,
  alreadyTracked,
  alreadyInstalled
}) {
  return {
    kind: "skillRecommendation",
    skillName,
    score,
    alreadyTracked,
    alreadyInstalled,
    reasons: matchedSignals.map((matchedSignal) => matchedSignal.label),
    matchedSignals
  };
}

function createBlockedContextSkillChange(planEntry) {
  return {
    kind: "blockedSkillChange",
    skillName: planEntry.skillName,
    reason: planEntry.reason,
    code: planEntry.error.code
  };
}

function toRepoRelativePath({
  projectRootDirectory,
  absolutePath
}) {
  return path.relative(projectRootDirectory, absolutePath).replace(/\\/g, "/") || ".";
}

function extractContextAgentsPathHints(rootAgentsText) {
  const pathHints = [];
  const seenPathHints = new Set();
  const backtickedTokenPattern = /`([^`]+)`/g;

  for (const match of rootAgentsText.matchAll(backtickedTokenPattern)) {
    const rawToken = String(match[1] ?? "").trim();
    if (rawToken.length === 0) {
      continue;
    }

    const normalizedToken = rawToken
      .replace(/\\/g, "/")
      .replace(/^[.]\//, "")
      .replace(/[),.;:]+$/g, "")
      .trim();

    if (
      normalizedToken.length === 0 ||
      !normalizedToken.includes("/") ||
      /^https?:\/\//i.test(normalizedToken)
    ) {
      continue;
    }

    const pathHint = normalizedToken.toLowerCase().endsWith("agents.md")
      ? normalizedToken
      : path.posix.basename(normalizedToken).includes(".")
        ? null
        : `${normalizedToken.replace(/\/+$/g, "")}/AGENTS.md`;

    if (!pathHint || seenPathHints.has(pathHint)) {
      continue;
    }

    seenPathHints.add(pathHint);
    pathHints.push(pathHint);
  }

  return pathHints;
}

function collectContextAgentsFiles({
  projectRootDirectory,
  rootAgentsText
}) {
  const rootAgentsFilePath = path.join(projectRootDirectory, "AGENTS.md");
  const relevantAgentsFiles = [
    createContextAgentsFileRecord({
      scope: "root",
      path: rootAgentsFilePath,
      repoRelativePath: "AGENTS.md",
      exists: fs.existsSync(rootAgentsFilePath),
      discoveredBy: "root"
    })
  ];
  const routedAgentsPathHints = extractContextAgentsPathHints(rootAgentsText);

  for (const routedAgentsPathHint of routedAgentsPathHints) {
    if (relevantAgentsFiles.length >= CONTEXT_MAX_RELEVANT_AGENTS_FILES) {
      break;
    }

    const relativeAgentsFilePath = routedAgentsPathHint.replace(/^\/+/, "");
    const absoluteAgentsFilePath = path.resolve(projectRootDirectory, relativeAgentsFilePath);
    if (
      absoluteAgentsFilePath === rootAgentsFilePath ||
      (!absoluteAgentsFilePath.startsWith(`${projectRootDirectory}${path.sep}`) && absoluteAgentsFilePath !== projectRootDirectory)
    ) {
      continue;
    }

    relevantAgentsFiles.push(
      createContextAgentsFileRecord({
        scope: "scoped",
        path: absoluteAgentsFilePath,
        repoRelativePath: toRepoRelativePath({
          projectRootDirectory,
          absolutePath: absoluteAgentsFilePath
        }),
        exists: fs.existsSync(absoluteAgentsFilePath),
        discoveredBy: "routing"
      })
    );
  }

  return {
    agentsFiles: relevantAgentsFiles,
    pathHints: routedAgentsPathHints
  };
}

function tokenizeContextText(value) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

function buildContextSkillRecommendations({
  registry,
  projectState,
  repositoryContext,
  agentsProfileName
}) {
  const trackedSkillNameSet = new Set(projectState.configuredSkillNames);
  const installedSkillNameSet = new Set(projectState.installedSkillNames);
  const trackedSubsetMode = projectState.trackingMode === "selected";
  const packageSummary = repositoryContext.packageJson ?? null;
  const dependencyNames = [
    ...(packageSummary?.dependencies ?? []),
    ...(packageSummary?.devDependencies ?? [])
  ].map((dependencyName) => String(dependencyName).toLowerCase());
  const dependencyNameSet = new Set(dependencyNames);
  const signalTokens = new Set([
    ...tokenizeContextText(packageSummary?.name ?? ""),
    ...tokenizeContextText(packageSummary?.description ?? ""),
    ...tokenizeContextText((packageSummary?.scripts ?? []).join(" ")),
    ...tokenizeContextText((packageSummary?.dependencies ?? []).join(" ")),
    ...tokenizeContextText((packageSummary?.devDependencies ?? []).join(" ")),
    ...tokenizeContextText(repositoryContext.readmeExcerpt ?? ""),
    ...tokenizeContextText(repositoryContext.topLevelEntries.map((entry) => entry.name).join(" ")),
    ...tokenizeContextText(agentsProfileName ?? "")
  ]);
  const trackedSkillEntriesByName = buildCatalogSkillEntryMap(registry);
  const recommendationBoostBySkillName = new Map();

  for (const trackedSkillName of trackedSkillNameSet) {
    const trackedSkillEntry = trackedSkillEntriesByName.get(trackedSkillName);
    for (const recommendedSkillName of trackedSkillEntry?.recommends ?? []) {
      const existingBoost = recommendationBoostBySkillName.get(recommendedSkillName) ?? {
        score: 0,
        trackedSkillNames: []
      };
      existingBoost.score += 12;
      existingBoost.trackedSkillNames.push(trackedSkillName);
      recommendationBoostBySkillName.set(recommendedSkillName, existingBoost);
    }
  }

  const scoredSkillRecommendations = registry.skills
    .map((skillEntry) => {
      let score = 0;
      const matchedSignals = [];
      const normalizedCategory = String(skillEntry.category ?? "").toLowerCase();
      const normalizedTags = (skillEntry.tags ?? []).map((tag) => String(tag).toLowerCase());
      const skillTokens = new Set([
        ...tokenizeContextText(skillEntry.name),
        ...tokenizeContextText(skillEntry.description ?? ""),
        ...tokenizeContextText(skillEntry.category ?? ""),
        ...normalizedTags.flatMap((tag) => tokenizeContextText(tag))
      ]);
      const trackedRecommendationBoost = recommendationBoostBySkillName.get(skillEntry.name) ?? null;
      const matchedSkillTokens = [...skillTokens]
        .filter((skillToken) => signalTokens.has(skillToken))
        .sort();

      function addSignal(signalKind, scoreDelta, label, matchedValues = []) {
        score += scoreDelta;
        matchedSignals.push(
          createContextSkillRecommendationSignal({
            signalKind,
            scoreDelta,
            label,
            matchedValues
          })
        );
      }

      if (trackedRecommendationBoost) {
        addSignal(
          "tracked-recommendation",
          trackedRecommendationBoost.score,
          `Tracked repo skills recommend ${skillEntry.name}.`,
          trackedRecommendationBoost.trackedSkillNames
        );
      }

      if (trackedSubsetMode && trackedSkillNameSet.has(skillEntry.name)) {
        addSignal("tracked-selection", 100, "This repo explicitly tracks this skill.");
      } else if (installedSkillNameSet.has(skillEntry.name)) {
        addSignal("installed-skill", 18, "This skill is already installed in the repo.");
      }

      if (agentsProfileName && normalizedCategory === agentsProfileName) {
        addSignal(
          "agents-profile-category",
          20,
          `The skill category matches the inferred ${agentsProfileName} AGENTS profile.`,
          [agentsProfileName]
        );
      }

      if (agentsProfileName && normalizedTags.includes(agentsProfileName)) {
        addSignal(
          "agents-profile-tag",
          10,
          `The skill tags match the inferred ${agentsProfileName} AGENTS profile.`,
          [agentsProfileName]
        );
      }

      if (dependencyNameSet.has(skillEntry.name.toLowerCase())) {
        addSignal(
          "dependency-match",
          60,
          "The repo dependencies directly reference this skill name.",
          [skillEntry.name]
        );
      }

      if (matchedSkillTokens.length > 0) {
        addSignal(
          "token-match",
          matchedSkillTokens.length * 8,
          `Repo metadata overlaps with this skill's tokens: ${matchedSkillTokens.join(", ")}.`,
          matchedSkillTokens
        );
      }

      return createContextSkillRecommendation({
        skillName: skillEntry.name,
        score,
        matchedSignals,
        alreadyTracked: trackedSkillNameSet.has(skillEntry.name),
        alreadyInstalled: installedSkillNameSet.has(skillEntry.name)
      });
    })
    .filter((skillRecommendation) => skillRecommendation.score > 0)
    .sort((leftRecommendation, rightRecommendation) => {
      if (rightRecommendation.score !== leftRecommendation.score) {
        return rightRecommendation.score - leftRecommendation.score;
      }

      return leftRecommendation.skillName.localeCompare(rightRecommendation.skillName);
    });

  if (scoredSkillRecommendations.length === 0) {
    return [];
  }

  return scoredSkillRecommendations
    .slice(0, CONTEXT_MAX_DEBUG_RECOMMENDATIONS);
}

function buildContextActionPlan(projectState) {
  if (!projectState.repoDetected) {
    return [
      createContextAction({
        argv: ["vasir", "init"],
        reason: "Run this inside the repo you want Vasir to manage when you want the full catalog installed there.",
        mutatesFiles: true
      })
    ];
  }

  if (projectState.repoStatus === "invalid-install-state" || projectState.repoStatus === "adoption-required") {
    return [
      createContextAction({
        argv: ["vasir", "doctor"],
        reason: "Inspect why this repo needs Vasir attention before changing files.",
        mutatesFiles: false
      }),
      createContextAction({
        argv: ["vasir", "repair"],
        reason: "Rebuild safe Vasir metadata and aliases from the current repo state.",
        mutatesFiles: true
      })
    ];
  }

  if (projectState.repoStatus === "not-initialized") {
    return [
      createContextAction({
        argv: ["vasir", "init"],
        reason: "Install the full Vasir catalog into this repo and mark it for future updates.",
        mutatesFiles: true
      }),
      createContextAction({
        argv: ["vasir", "list"],
        reason: "Inspect the catalog first if you want to track only a selected subset of skills.",
        mutatesFiles: false
      })
    ];
  }

  if ((projectState.syncPlan?.blockedSkillPlans.length ?? 0) > 0) {
    return [
      createContextAction({
        argv: ["vasir", "diff"],
        reason: "Review the tracked skill entries that are currently blocked from safe replacement.",
        mutatesFiles: false
      }),
      createContextAction({
        argv: ["vasir", "doctor"],
        reason: "Inspect the blocked local edits and repair guidance before updating.",
        mutatesFiles: false
      })
    ];
  }

  if (
    (projectState.syncPlan?.updatedSkillNames.length ?? 0) > 0 ||
    (projectState.syncPlan?.installedSkillNames.length ?? 0) > 0
  ) {
    return [
      createContextAction({
        argv: ["vasir", "diff"],
        reason: "Review the exact tracked skill files that would change before applying updates.",
        mutatesFiles: false
      }),
      createContextAction({
        argv: ["vasir", "update"],
        reason: "Refresh the repo-local skills tracked by this repo from the installed Vasir bundle.",
        mutatesFiles: true
      })
    ];
  }

  return [
    createContextAction({
      argv: ["vasir", "update"],
      reason: "Refresh this repo's tracked skills after you upgrade the installed Vasir CLI.",
      mutatesFiles: true
    })
  ];
}

function formatUsage() {
  return `vasir

Usage:
  vasir status [--json] [--repo-root <path>]       Inspect global and repo-local Vasir state without mutating files
  vasir context [--json] [--debug] [--repo-root <path>] Emit a purely local repo handshake for LLMs: repo facts, AGENTS files, recommended skills, and next commands
  vasir doctor [--json] [--repo-root <path>]       Diagnose drift, alias problems, and blocked skill updates
  vasir repair [--json] [--repo-root <path>]       Repair repo-local Vasir metadata, aliases, and missing tracked skills without auto-upgrading content
  vasir diff [skill...] [--json] [--exit-code] [--repo-root <path>] Review the exact repo-local skill changes pending from the installed Vasir bundle
  vasir init [--json] [--repo-root <path>]         Sync ~/.agents/vasir; inside a repo, install and track the full catalog
  vasir update [--json] [--dry-run] [--repo-root <path>] Sync ~/.agents/vasir and update the tracked Vasir skills in this repo
  vasir list [--json]                               Show available skills from the global catalog
  vasir add <skill> [skill...] [--json] [--replace] [--agents-profile <name>] [--repo-root <path>] Copy skills into the current repo root at .agents/skills
  vasir adopt [--json] [--repo-root <path>]        Bring an existing .agents/skills tree under Vasir management without copying files
  vasir remove <skill> [skill...] [--json] [--repo-root <path>] Remove project-local skills from the current repo root
  vasir agents init <profile> [--json] [--replace] [--repo-root <path>] Write AGENTS.md in the current repo root from a stack-specific starter
  vasir agents draft-purpose [--json] [--write] [--model <name>] [--repo-root <path>] Draft a repo-specific AGENTS purpose paragraph
  vasir agents draft-routing [--json] [--write] [--repo-root <path>] Draft repo-aware Section 1 routing lanes for AGENTS.md
  vasir agents validate [--json] [--repo-root <path>] Fail closed when AGENTS.md still contains scaffold placeholders
  vasir eval run <skill> [--json] [--model <name>] [--trials <count>] [--repo-root <path>] Run the built-in baseline vs treatment eval for a skill
  vasir eval inspect <skill> [run-id] [--json] [--repo-root <path>] Inspect the latest or named eval artifact for a skill
  vasir eval rescore <skill> [run-id] [--json] [--repo-root <path>] Rescore an existing eval artifact with the current scorer
  vasir --version [--json]                          Print the installed Vasir CLI version
  vasir --help

Notes:
  Running plain "vasir" defaults to "vasir status" so the zero-arg path is read-only.
  Use --json for automation and LLM consumers.
  Use --debug with "vasir context" when you want timing detail, routing evidence, and candidate recommendations.
  status is the inspect-first command: it shows what the current repo tracks and what the next safe action is.
  context is the repo-handshake command: it stays local-only and returns repo facts, AGENTS files, recommended skills, and next commands without using any model or token.
  doctor is the repair-oriented command: it surfaces alias drift, invalid install state, adoption needs, and blocked updates.
  repair is the one-command recovery path: it rebuilds safe repo metadata, repairs aliases, and restores missing tracked skills.
  diff is the review command: it shows the exact tracked skill files that would change before you run update.
  init outside a repo mutates only the global catalog under ~/.agents/vasir.
  init inside a repo installs the full catalog into that repo and marks it for full-catalog updates.
  update mutates the global catalog under ~/.agents/vasir and refreshes the skills tracked by the current repo.
  update --dry-run shows the global refresh and repo-local skill changes without mutating either location.
  add mutates only the current repo root (nearest parent with .git, or the current directory if none exists).
  adopt never copies or overwrites skill files; it snapshots the existing .agents/skills tree into .agents/vasir.json and .agents/vasir-install-state.json.
  Pass --repo-root <path> to target an explicit repo root, including monorepo subprojects.
  Use "vasir add all" to install every catalog skill into the current repo.
  add auto-initializes the global catalog if needed.
  add also seeds AGENTS.md when it is missing; --agents-profile backend|frontend|ios overrides profile inference.
  agents init mutates only the current repo root and writes AGENTS.md from the selected profile.
  agents draft-purpose reads local repo context and can replace the AGENTS purpose placeholder when --write is set.
  agents draft-routing suggests repo-aware Section 1 lanes and can replace the routing placeholder when --write is set.
  agents validate fails closed when AGENTS.md still contains known scaffold placeholders or broken repo routes.
  Use --replace only to refresh an unmodified project-local skill from the global catalog or intentionally overwrite AGENTS.md during vasir agents init.
  remove mutates only the current repo root and also updates .agents/vasir.json and .agents/vasir-install-state.json.
  eval auto-resolves the local source skill when present, otherwise falls back to the installed or global catalog copy.
  eval defaults to openai:gpt-5.4 and anthropic:claude-opus-4-6.
  Pass --model openai, --model opus, --model mock, or --model <provider:model> to override.
  Pass --trials <count> to repeat each model/case baseline-vs-treatment pair.
  If a default live provider is missing credentials and the terminal is interactive, Vasir prompts you to paste a key or skip it.
`;
}

function groupSkillsByCategory(skillEntries) {
  const groupedSkills = new Map();
  for (const skillEntry of skillEntries) {
    const existingCategorySkills = groupedSkills.get(skillEntry.category) ?? [];
    existingCategorySkills.push(skillEntry);
    groupedSkills.set(skillEntry.category, existingCategorySkills);
  }
  return groupedSkills;
}

function resolveRequestedAddSkillNames({ requestedSkillNames, registry }) {
  if (requestedSkillNames.length === 0) {
    throw new VasirCliError({
      code: "SKILL_NAME_REQUIRED",
      message: "At least one skill name is required.",
      suggestion: "Run `vasir list` to discover valid skill names, then rerun `vasir add <skill>` or `vasir add all`.",
      docsRef: ADD_REFERENCE_DOCS_REF
    });
  }

  const wantsAll = requestedSkillNames.some(
    (requestedSkillName) => requestedSkillName.toLowerCase() === ADD_ALL_SKILLS_KEYWORD
  );

  if (!wantsAll) {
    return requestedSkillNames;
  }

  const nonAllSkillNames = requestedSkillNames.filter(
    (requestedSkillName) => requestedSkillName.toLowerCase() !== ADD_ALL_SKILLS_KEYWORD
  );

  if (nonAllSkillNames.length > 0) {
    throw new VasirCliError({
      code: "ALL_SKILLS_REQUEST_CONFLICT",
      message: "`all` installs the full catalog and cannot be combined with specific skill names in the same command.",
      suggestion: "Use `vasir add all` to install every catalog skill, or remove `all` and list only the specific skills you want.",
      docsRef: ADD_REFERENCE_DOCS_REF,
      context: {
        conflictingSkillNames: nonAllSkillNames
      }
    });
  }

  return registry.skills.map((skillEntry) => skillEntry.name);
}

function parseCommandInvocation(argumentVector) {
  const rawArguments = argumentVector.slice(2);
  const positionalArguments = [];
  let debugRequested = false;
  let jsonOutput = false;
  let helpRequested = false;
  let agentsProfileName = null;
  let dryRunRequested = false;
  let exitCodeRequested = false;
  let modelArguments = [];
  let projectRootArgument = null;
  let replaceExistingSkills = false;
  let requestedTrialCount = null;
  let versionRequested = false;
  let writeGeneratedOutput = false;

  for (let argumentIndex = 0; argumentIndex < rawArguments.length; argumentIndex += 1) {
    const rawArgument = rawArguments[argumentIndex];
    if (rawArgument === "--json") {
      jsonOutput = true;
      continue;
    }

    if (rawArgument === "--debug") {
      debugRequested = true;
      continue;
    }

    if (rawArgument === "--help") {
      helpRequested = true;
      continue;
    }

    if (rawArgument === "--version") {
      versionRequested = true;
      continue;
    }

    if (rawArgument === "--replace") {
      replaceExistingSkills = true;
      continue;
    }

    if (rawArgument === "--dry-run") {
      dryRunRequested = true;
      continue;
    }

    if (rawArgument === "--exit-code") {
      exitCodeRequested = true;
      continue;
    }

    if (rawArgument === "--repo-root") {
      const projectRootValue = rawArguments[argumentIndex + 1];
      if (!projectRootValue || projectRootValue.startsWith("--")) {
        throw new VasirCliError({
          code: "PROJECT_ROOT_FLAG_VALUE_REQUIRED",
          message: "`--repo-root` requires a directory path.",
          suggestion: "Use `--repo-root /absolute/path/to/repo` or `--repo-root relative/path/to/repo`.",
          docsRef: COMMANDS_REFERENCE_DOCS_REF
        });
      }

      projectRootArgument = projectRootValue;
      argumentIndex += 1;
      continue;
    }

    if (rawArgument === "--agents-profile") {
      const agentsProfileArgument = rawArguments[argumentIndex + 1];
      if (!agentsProfileArgument || agentsProfileArgument.startsWith("--")) {
        throw new VasirCliError({
          code: "AGENTS_PROFILE_FLAG_VALUE_REQUIRED",
          message: "`--agents-profile` requires one of: backend, frontend, ios.",
          suggestion: "Use `--agents-profile backend`, `--agents-profile frontend`, or `--agents-profile ios`.",
          docsRef: REPLACE_REFERENCE_DOCS_REF
        });
      }

      agentsProfileName = agentsProfileArgument;
      argumentIndex += 1;
      continue;
    }

    if (rawArgument === "--write") {
      writeGeneratedOutput = true;
      continue;
    }

    if (rawArgument === "--model") {
      const modelArgument = rawArguments[argumentIndex + 1];
      if (!modelArgument || modelArgument.startsWith("--")) {
        throw new VasirCliError({
          code: "MODEL_FLAG_VALUE_REQUIRED",
          message: "`--model` requires a provider alias or provider:model descriptor.",
          suggestion:
            "Use `--model openai`, `--model opus`, `--model mock`, or `--model <provider:model>`.",
          docsRef: EVAL_REFERENCE_DOCS_REF
        });
      }

      modelArguments = [...modelArguments, modelArgument];
      argumentIndex += 1;
      continue;
    }

    if (rawArgument === "--trials") {
      const trialCountArgument = rawArguments[argumentIndex + 1];
      if (!trialCountArgument || trialCountArgument.startsWith("--")) {
        throw new VasirCliError({
          code: "TRIALS_FLAG_VALUE_REQUIRED",
          message: "`--trials` requires a positive integer value.",
          suggestion: "Use `--trials 3` or another positive integer when running `vasir eval run <skill>`.",
          docsRef: EVAL_REFERENCE_DOCS_REF
        });
      }

      const parsedTrialCount = Number.parseInt(trialCountArgument, 10);
      if (!Number.isInteger(parsedTrialCount) || parsedTrialCount <= 0) {
        throw new VasirCliError({
          code: "TRIALS_FLAG_VALUE_INVALID",
          message: `Invalid trial count: ${trialCountArgument}`,
          suggestion: "Use `--trials` with a positive integer such as `1`, `3`, or `5`.",
          docsRef: EVAL_REFERENCE_DOCS_REF
        });
      }

      requestedTrialCount = parsedTrialCount;
      argumentIndex += 1;
      continue;
    }

    if (rawArgument.startsWith("--")) {
      throw new VasirCliError({
        code: "UNKNOWN_FLAG",
        message: `Unknown flag: ${rawArgument}`,
        suggestion: "Run `vasir --help` to see the supported command contract.",
        docsRef: UNKNOWN_COMMAND_TROUBLESHOOTING_DOCS_REF
      });
    }

    positionalArguments.push(rawArgument);
  }

  const commandName = positionalArguments[0] ?? "status";
  return {
    commandName,
    commandArguments: positionalArguments.slice(1),
    debugRequested,
    jsonOutput,
    agentsProfileName,
    dryRunRequested,
    exitCodeRequested,
    modelArguments,
    projectRootArgument,
    requestedTrialCount,
    replaceExistingSkills,
    writeGeneratedOutput,
    versionRequested,
    helpRequested: helpRequested || commandName === "help"
  };
}

async function runInit({
  homeDirectory,
  currentWorkingDirectory,
  projectRootDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  inputStream,
  outputStream,
  stdoutWriter,
  jsonOutput
}) {
  const { globalPaths, catalogState } = synchronizeGlobalCatalog({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const resolvedProjectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  const repoTargeted = projectRootDirectory !== null || repoLooksInitialized(resolvedProjectPaths);

  if (!repoTargeted) {
    if (!jsonOutput) {
      const ui = createCommandUi({ stream: outputStream });
      stdoutWriter(
        ui.renderPanel({
          title: "Init",
          lines: [
            ui.formatStatusLine({
              kind: "ok",
              text: "Global catalog ready"
            }),
            ui.formatField("path", ui.formatPath(globalPaths.globalCatalogDirectory)),
            ui.formatStatusLine({
              kind: "info",
              text: "Repo setup",
              detail: "Run `vasir init` inside a repo to install and track the full catalog there."
            })
          ]
        })
      );
    }

    return {
      globalCatalogDirectory: globalPaths.globalCatalogDirectory,
      projectInitialized: false,
      projectConfigFilePath: resolvedProjectPaths.projectConfigFilePath,
      trackingMode: null
    };
  }

  const { registry } = readGlobalRegistry({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const managedProjectSkills = listManagedProjectSkills({
    projectRootDirectory,
    currentWorkingDirectory
  });
  const projectConfig = readProjectConfig({
    projectPaths: managedProjectSkills.projectPaths
  });
  const projectInstallState = readProjectInstallState({
    projectPaths: managedProjectSkills.projectPaths
  });
  const syncPlan = createProjectSyncPlan({
    registry,
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    projectPaths: managedProjectSkills.projectPaths,
    projectConfig,
    projectInstallState,
    managedSkillNames: managedProjectSkills.skillNames
  });

  let projectInitialized = false;
  let installedSkills = [];
  let updatedSkills = [];
  let unchangedSkills = [];
  let effectiveTrackingMode = syncPlan.trackingMode;
  let agentsFilePath = path.join(managedProjectSkills.projectPaths.projectRootDirectory, "AGENTS.md");
  let wroteAgentsFile = false;

  if (syncPlan.trackingMode === null) {
    const projectAgentsFilePath = path.join(managedProjectSkills.projectPaths.projectRootDirectory, "AGENTS.md");
    const agentsSelection = fs.existsSync(projectAgentsFilePath)
      ? {
          profileName: null
        }
      : await resolveRecommendedAgentsProfile({
          projectRootDirectory: managedProjectSkills.projectPaths.projectRootDirectory,
          inputStream,
          outputStream,
          jsonOutput
        });
    const initResult = installSkillsIntoProject({
      registry,
      globalCatalogDirectory: globalPaths.globalCatalogDirectory,
      skillNames: registry.skills.map((skillEntry) => skillEntry.name),
      agentsProfileName: agentsSelection.profileName,
      catalogProvenance: catalogState,
      trackingMode: "all",
      replaceExistingSkills: false,
      projectRootDirectory,
      currentWorkingDirectory,
      platform
    });

    projectInitialized = true;
    installedSkills = initResult.installedSkillNames;
    updatedSkills = initResult.replacedSkillNames;
    unchangedSkills = [];
    effectiveTrackingMode = "all";
    agentsFilePath = initResult.agentsFilePath;
    wroteAgentsFile = initResult.wroteAgentsFile;
  } else {
    if (syncPlan.blockedSkillPlans.length > 0) {
      throw syncPlan.blockedSkillPlans[0].error;
    }

    if (syncPlan.desiredSkillNames.length > 0) {
      installSkillsIntoProject({
        registry,
        globalCatalogDirectory: globalPaths.globalCatalogDirectory,
        skillNames: syncPlan.desiredSkillNames,
        initializeAgentsFile: false,
        catalogProvenance: catalogState,
        trackingMode: syncPlan.trackingMode,
        replaceExistingSkills: true,
        projectRootDirectory,
        currentWorkingDirectory,
        platform
      });
    }

    installedSkills = syncPlan.installedSkillNames;
    updatedSkills = syncPlan.updatedSkillNames;
    unchangedSkills = syncPlan.unchangedSkillNames;
  }

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const renderedLines = [
      ui.formatStatusLine({
        kind: "ok",
        text: "Global catalog ready"
      }),
      ui.formatField("path", ui.formatPath(globalPaths.globalCatalogDirectory)),
      ui.formatStatusLine({
        kind: "ok",
        text: projectInitialized ? "Repo initialized" : "Repo synced",
        detail: managedProjectSkills.projectPaths.projectRootDirectory
      }),
      ui.formatStatusLine({
        kind: "info",
        text: "Tracking",
        detail: effectiveTrackingMode === "all" ? "Full catalog" : "Selected skills"
      })
    ];

    for (const installedSkillName of installedSkills) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "ok",
          text: `${projectInitialized ? "Installed" : "Added"} ${installedSkillName}`
        })
      );
    }

    for (const updatedSkillName of updatedSkills) {
      if (installedSkills.includes(updatedSkillName)) {
        continue;
      }

      renderedLines.push(
        ui.formatStatusLine({
          kind: "ok",
          text: `Updated ${updatedSkillName}`
        })
      );
    }

    if (unchangedSkills.length > 0 && !projectInitialized) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "Already current",
          detail: `${unchangedSkills.length} skill${unchangedSkills.length === 1 ? "" : "s"}`
        })
      );
    }

    renderedLines.push(
      ui.formatStatusLine({
        kind: "info",
        text: "Project skills ready at",
        detail: managedProjectSkills.projectPaths.projectSkillsDirectory
      })
    );
    renderedLines.push(
      ui.formatStatusLine({
        kind: "info",
        text: "Repo config ready at",
        detail: managedProjectSkills.projectPaths.projectConfigFilePath
      })
    );

    if (wroteAgentsFile) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "AGENTS starter ready at",
          detail: agentsFilePath
        })
      );
    }

    renderedLines.push(
      ui.formatStatusLine({
        kind: "info",
        text: "Next",
        detail: projectInitialized
          ? "Run `vasir update` later in this repo to keep the tracked skills current."
          : "Run `vasir update` later in this repo to keep the tracked skills current."
      })
    );

    stdoutWriter(
      ui.renderPanel({
        title: "Init",
        lines: renderedLines
      })
    );
  }

  return {
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    projectInitialized,
    projectRootDirectory: managedProjectSkills.projectPaths.projectRootDirectory,
    projectConfigFilePath: managedProjectSkills.projectPaths.projectConfigFilePath,
    projectSkillsDirectory: managedProjectSkills.projectPaths.projectSkillsDirectory,
    trackingMode: effectiveTrackingMode,
    installedSkills,
    updatedSkills,
    unchangedSkills,
    agentsFilePath,
    wroteAgentsFile
  };
}

function runDiff({
  skillNames,
  homeDirectory,
  currentWorkingDirectory,
  projectRootDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  outputStream,
  stdoutWriter,
  jsonOutput,
  exitCodeRequested
}) {
  const catalogSource = readCatalogSourceRegistry({
    repositoryUrl
  });
  const projectState = inspectProjectSurface({
    currentWorkingDirectory,
    projectRootDirectory,
    registry: catalogSource.registry,
    globalCatalogDirectory: catalogSource.sourceDirectory
  });

  assertRepoReadyForDiff(projectState);

  const requestedSkillNames = resolveRequestedDiffSkillNames({
    requestedSkillNames: skillNames,
    syncPlan: projectState.syncPlan
  });
  const selectedPlanEntries = (requestedSkillNames.length === 0
    ? projectState.syncPlan.planEntries.filter((planEntry) => planEntry.status !== "unchanged")
    : projectState.syncPlan.planEntries.filter((planEntry) => requestedSkillNames.includes(planEntry.skillName))
  );

  const skillDiffs = selectedPlanEntries.map((planEntry) => ({
    skillName: planEntry.skillName,
    status: planEntry.status,
    installedVersion: planEntry.installedVersion,
    availableVersion: planEntry.availableVersion,
    reason: planEntry.reason,
    blockedDetails: planEntry.status === "blocked" ? summarizeBlockedSkillPlan(planEntry) : null,
    fileChanges: buildSkillFileChanges({
      skillName: planEntry.skillName,
      planEntry,
      registry: catalogSource.registry,
      globalCatalogDirectory: catalogSource.sourceDirectory,
      projectPaths: projectState.projectPaths
    })
  }));

  const hasDiff = skillDiffs.some(
    (skillDiff) => skillDiff.status === "install" || skillDiff.status === "update"
  );
  const hasBlockedSkills = skillDiffs.some(
    (skillDiff) => skillDiff.status === "blocked"
  );
  const overallStatus = hasBlockedSkills ? "blocked" : hasDiff ? "changes" : "current";
  const nextSteps = hasBlockedSkills
    ? ["Resolve the blocked local skill edits, then rerun `vasir diff` or `vasir update`."]
    : hasDiff
      ? ["Run `vasir update` in this repo when you want to apply these tracked skill changes."]
      : ["No tracked skill changes are pending right now. Run `vasir update` after upgrading Vasir again."];

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const summaryLines = [
      ui.formatStatusLine({
        kind: overallStatus === "blocked" ? "warn" : overallStatus === "changes" ? "info" : "ok",
        text:
          overallStatus === "blocked"
            ? "Repo has tracked skill changes that are currently blocked"
            : overallStatus === "changes"
              ? "Repo has tracked skill changes ready for review"
              : "Repo is already current against the installed Vasir bundle",
        detail: projectState.projectPaths.projectRootDirectory
      }),
      ui.formatStatusLine({
        kind: "info",
        text: "Tracking",
        detail: projectState.trackingMode === "all" ? "Full catalog" : "Selected skills"
      }),
      ui.formatStatusLine({
        kind: "info",
        text: "Repo config",
        detail: projectState.projectPaths.projectConfigFilePath
      })
    ];

    if (skillDiffs.length > 0) {
      summaryLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "Skill entries in diff",
          detail: `${skillDiffs.length}`
        })
      );
    }

    summaryLines.push(
      ui.formatStatusLine({
        kind: "info",
        text: "Next",
        detail: nextSteps[0]
      })
    );

    stdoutWriter(
      ui.renderPanel({
        title: "Diff",
        lines: summaryLines
      })
    );

    for (const skillDiff of skillDiffs) {
      const sectionLines = [
        ui.formatStatusLine({
          kind:
            skillDiff.status === "blocked"
              ? "warn"
              : skillDiff.status === "unchanged"
                ? "info"
                : "ok",
          text:
            skillDiff.status === "install"
              ? `Would install ${skillDiff.skillName}`
              : skillDiff.status === "update"
                ? `Would update ${skillDiff.skillName}`
                : skillDiff.status === "blocked"
                  ? `Blocked ${skillDiff.skillName}`
                  : `Already current ${skillDiff.skillName}`,
          detail:
            skillDiff.installedVersion || skillDiff.availableVersion
              ? `${skillDiff.installedVersion ?? "missing"} -> ${skillDiff.availableVersion ?? "missing"}`
              : skillDiff.reason
        })
      ];

      if (skillDiff.status === "blocked" && skillDiff.blockedDetails) {
        for (const modifiedRelativeFilePath of skillDiff.blockedDetails.modifiedRelativeFilePaths) {
          sectionLines.push(
            ui.formatBullet(`M ${createProjectSkillFilePath({ skillName: skillDiff.skillName, relativeFilePath: modifiedRelativeFilePath })} local edits`)
          );
        }

        for (const missingRelativeFilePath of skillDiff.blockedDetails.missingRelativeFilePaths) {
          sectionLines.push(
            ui.formatBullet(`D ${createProjectSkillFilePath({ skillName: skillDiff.skillName, relativeFilePath: missingRelativeFilePath })} missing locally`)
          );
        }

        for (const unexpectedRelativeFilePath of skillDiff.blockedDetails.unexpectedRelativeFilePaths) {
          sectionLines.push(
            ui.formatBullet(`A ${createProjectSkillFilePath({ skillName: skillDiff.skillName, relativeFilePath: unexpectedRelativeFilePath })} unmanaged local file`)
          );
        }
      }

      for (const fileChange of skillDiff.fileChanges) {
        const changePrefix =
          fileChange.status === "modified" ? "M"
            : fileChange.status === "added" ? "A"
              : "D";
        const changeDetail =
          fileChange.status === "modified" && fileChange.format === "binary"
            ? "binary file"
            : fileChange.status === "added"
              ? "would be added"
              : fileChange.status === "removed"
                ? "would be removed"
                : null;

        sectionLines.push(
          ui.formatBullet(
            `${changePrefix} ${fileChange.projectRelativePath}${changeDetail ? ` ${changeDetail}` : ""}`
          )
        );

        if (fileChange.unifiedDiff) {
          sectionLines.push(fileChange.unifiedDiff);
        }
      }

      stdoutWriter(
        ui.renderSection({
          title: skillDiff.skillName,
          lines: sectionLines
        })
      );
    }
  }

  return {
    overallStatus,
    nextSteps,
    hasDiff,
    hasBlockedSkills,
    catalogSourceDirectory: catalogSource.sourceDirectory,
    projectRootDirectory: projectState.projectPaths.projectRootDirectory,
    projectSkillsDirectory: projectState.projectPaths.projectSkillsDirectory,
    projectConfigFilePath: projectState.projectPaths.projectConfigFilePath,
    trackingMode: projectState.trackingMode,
    requestedSkills: requestedSkillNames,
    skills: skillDiffs,
    processExitCode: exitCodeRequested && (hasDiff || hasBlockedSkills) ? 1 : 0
  };
}

function createCatalogBackedInstallState({
  projectPaths,
  registry,
  catalogProvenance,
  trackingMode,
  trackedSkillNames
}) {
  const projectInstallState = createEmptyProjectInstallState();
  const skillEntriesByName = buildCatalogSkillEntryMap(registry);

  for (const skillName of trackedSkillNames) {
    const skillEntry = skillEntriesByName.get(skillName);
    const targetSkillDirectory = path.join(projectPaths.projectSkillsDirectory, skillName);
    if (!skillEntry || !fs.existsSync(targetSkillDirectory)) {
      continue;
    }

    projectInstallState.skills[skillName] = createProjectSkillInstallStateEntry({
      targetSkillDirectory,
      managedRelativeFilePaths: listSkillFiles(targetSkillDirectory),
      provenance: {
        installedAt: new Date().toISOString(),
        installedByVersion: catalogProvenance?.packageVersion ?? null,
        sourceHash: catalogProvenance?.sourceHash ?? null,
        skillVersion: skillEntry.version ?? null,
        sourcePath: skillEntry.path ?? null
      }
    });
  }

  projectInstallState.catalog = {
    packageVersion: catalogProvenance?.packageVersion ?? null,
    sourceHash: catalogProvenance?.sourceHash ?? null,
    trackingMode
  };

  return projectInstallState;
}

function resolveRepairTrackingPolicy({
  projectConfig,
  projectInstallState,
  registry,
  installedSkillNames
}) {
  const managedSkillNames = projectInstallState
    ? Object.keys(projectInstallState.skills)
      .sort((leftSkillName, rightSkillName) => leftSkillName.localeCompare(rightSkillName))
    : [];

  if (projectConfig?.tracking?.mode === "all" || projectConfig?.tracking?.mode === "selected") {
    return {
      source: "project-config",
      ...resolveProjectTrackingPolicy({
        projectConfig,
        projectInstallState,
        registry,
        managedSkillNames
      })
    };
  }

  if (managedSkillNames.length > 0) {
    return {
      source: "install-state",
      ...resolveProjectTrackingPolicy({
        projectConfig: null,
        projectInstallState,
        registry,
        managedSkillNames
      })
    };
  }

  const skillEntriesByName = buildCatalogSkillEntryMap(registry);
  const knownInstalledSkillNames = installedSkillNames
    .filter((skillName) => skillEntriesByName.has(skillName))
    .sort((leftSkillName, rightSkillName) => leftSkillName.localeCompare(rightSkillName));

  if (knownInstalledSkillNames.length === 0) {
    return null;
  }

  const catalogSkillNames = registry.skills.map((skillEntry) => skillEntry.name);
  const coversFullCatalog =
    knownInstalledSkillNames.length === catalogSkillNames.length &&
    catalogSkillNames.every((skillName) => knownInstalledSkillNames.includes(skillName));

  return {
    source: "installed-tree",
    trackingMode: coversFullCatalog ? "all" : "selected",
    desiredSkillNames: coversFullCatalog ? catalogSkillNames : knownInstalledSkillNames
  };
}

function dedupeStrings(values) {
  return [...new Set(values)];
}

function runStatus({
  homeDirectory,
  currentWorkingDirectory,
  projectRootDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  outputStream,
  stdoutWriter,
  jsonOutput
}) {
  const globalState = inspectGlobalSurface({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const projectState = inspectProjectSurface({
    currentWorkingDirectory,
    projectRootDirectory,
    registry: globalState.catalogInspection?.registry ?? null,
    globalCatalogDirectory: globalState.catalogInspection?.sourceDirectory ?? null
  });
  const issues = [...globalState.issues, ...projectState.issues];
  const nextSteps = dedupeStrings([
    globalState.globalCatalogStatus === "missing"
      ? "Run `vasir init` or `vasir update` once to prepare the global catalog cache under `~/.agents/vasir`."
      : globalState.globalCatalogStatus === "outdated"
        ? "Run `vasir update` to refresh the global catalog cache to the installed Vasir version."
        : globalState.globalCatalogStatus === "error"
          ? "Fix the reported global catalog problem first, then rerun `vasir status` or `vasir doctor`."
          : null,
    ...projectState.nextSteps
  ].filter(Boolean));
  const overallStatus = issues.length === 0 ? "healthy" : "attention";

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const renderedLines = [
      ui.formatStatusLine({
        kind:
          globalState.globalCatalogStatus === "current"
            ? "ok"
            : globalState.globalCatalogStatus === "error"
              ? "warn"
              : "info",
        text:
          globalState.globalCatalogStatus === "current"
            ? "Global catalog current"
            : globalState.globalCatalogStatus === "missing"
              ? "Global catalog not initialized yet"
              : globalState.globalCatalogStatus === "outdated"
                ? "Global catalog would refresh to the installed bundle"
                : "Global catalog needs repair",
        detail: globalState.globalPaths.globalCatalogDirectory
      })
    ];

    if (globalState.catalogInspection?.registry) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "Bundled catalog",
          detail: `${globalState.catalogInspection.registry.skills.length} skills`
        })
      );
    }

    if (projectState.repoDetected) {
      renderedLines.push(
        ui.formatStatusLine({
          kind:
            projectState.repoStatus === "tracked"
              ? "ok"
              : projectState.repoStatus === "not-initialized"
                ? "info"
                : "warn",
          text:
            projectState.repoStatus === "tracked"
              ? "Repo tracked by Vasir"
              : projectState.repoStatus === "not-initialized"
                ? "Repo not initialized"
                : projectState.repoStatus === "adoption-required"
                  ? "Repo needs adoption"
                  : "Repo needs repair",
          detail: projectState.projectPaths.projectRootDirectory
        })
      );

      if (projectState.repoStatus === "tracked") {
        renderedLines.push(
          ui.formatStatusLine({
            kind: "info",
            text: "Tracking",
            detail: projectState.trackingMode === "all" ? "Full catalog" : "Selected skills"
          })
        );
        renderedLines.push(
          ui.formatStatusLine({
            kind: "info",
            text: "Repo config",
            detail: projectState.projectPaths.projectConfigFilePath
          })
        );
      }

      if (projectState.installedSkillNames.length > 0) {
        renderedLines.push(
          ui.formatStatusLine({
            kind: "info",
            text: "Project skills",
            detail: `${projectState.installedSkillNames.length} installed under ${projectState.projectPaths.projectSkillsDirectory}`
          })
        );
      }

      if ((projectState.syncPlan?.updatedSkillNames.length ?? 0) > 0) {
        renderedLines.push(
          ui.formatStatusLine({
            kind: "info",
            text: "Tracked skills behind",
            detail: `${projectState.syncPlan.updatedSkillNames.length} skill${projectState.syncPlan.updatedSkillNames.length === 1 ? "" : "s"} would update`
          })
        );
      }

      if ((projectState.syncPlan?.installedSkillNames.length ?? 0) > 0) {
        renderedLines.push(
          ui.formatStatusLine({
            kind: "info",
            text: "New Vasir skills pending",
            detail: `${projectState.syncPlan.installedSkillNames.length} skill${projectState.syncPlan.installedSkillNames.length === 1 ? "" : "s"} would install`
          })
        );
      }

      if (projectState.unmanagedInstalledSkillNames.length > 0) {
        renderedLines.push(
          ui.formatStatusLine({
            kind: "warn",
            text: "Unmanaged local skills",
            detail: projectState.unmanagedInstalledSkillNames.join(", ")
          })
        );
      }
    } else {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "No repo detected",
          detail: currentWorkingDirectory
        })
      );
    }

    if (nextSteps.length > 0) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "Next",
          detail: nextSteps[0]
        })
      );
    }

    stdoutWriter(
      ui.renderPanel({
        title: "Status",
        lines: renderedLines
      })
    );
  }

  return {
    overallStatus,
    nextSteps,
    globalCatalogDirectory: globalState.globalPaths.globalCatalogDirectory,
    globalCatalogStatus: globalState.globalCatalogStatus,
    bundledSkillCount: globalState.catalogInspection?.registry.skills.length ?? null,
    projectRootDirectory: projectState.repoDetected ? projectState.projectPaths.projectRootDirectory : null,
    projectSkillsDirectory: projectState.repoDetected ? projectState.projectPaths.projectSkillsDirectory : null,
    projectConfigFilePath: projectState.repoDetected ? projectState.projectPaths.projectConfigFilePath : null,
    repoDetected: projectState.repoDetected,
    repoStatus: projectState.repoStatus,
    trackingMode: projectState.trackingMode,
    installedSkills: projectState.installedSkillNames,
    managedSkills: projectState.configuredSkillNames,
    installStateSkills: projectState.managedSkillNames,
    unmanagedSkills: projectState.unmanagedInstalledSkillNames,
    outdatedSkills: projectState.syncPlan?.updatedSkillNames ?? [],
    pendingInstalledSkills: projectState.syncPlan?.installedSkillNames ?? [],
    blockedSkills: projectState.syncPlan
      ? projectState.syncPlan.blockedSkillPlans.map((planEntry) => ({
          skillName: planEntry.skillName,
          reason: planEntry.reason,
          code: planEntry.error.code
        }))
      : [],
    issues
  };
}

async function runContext({
  currentWorkingDirectory,
  projectRootDirectory,
  repositoryUrl,
  outputStream,
  stdoutWriter,
  jsonOutput,
  debugRequested = false
}) {
  const totalStartTime = startTiming();
  const debugTimings = {};

  let phaseStartTime = startTiming();
  const catalogSource = readCatalogSourceRegistry({
    repositoryUrl
  });
  debugTimings.catalogRead = durationInMilliseconds(phaseStartTime);

  phaseStartTime = startTiming();
  const repoInspection = inspectProjectSurface({
    currentWorkingDirectory,
    projectRootDirectory,
    registry: catalogSource.registry,
    globalCatalogDirectory: catalogSource.sourceDirectory
  });
  debugTimings.repoInspection = durationInMilliseconds(phaseStartTime);

  const targetDirectory = repoInspection.projectPaths.projectRootDirectory;
  const rootAgentsFilePath = path.join(targetDirectory, "AGENTS.md");
  const rootAgentsText = fs.existsSync(rootAgentsFilePath)
    ? fs.readFileSync(rootAgentsFilePath, "utf8")
    : "";

  phaseStartTime = startTiming();
  const inspectedProfileRecommendation = inspectRecommendedAgentsProfile({
    projectRootDirectory: targetDirectory,
    agentsText: rootAgentsText
  });
  debugTimings.repoContextInspection = durationInMilliseconds(phaseStartTime);

  const repositoryContext = inspectedProfileRecommendation.repositoryContext;
  const profileHint = repositoryContext.profileHint === "generic"
    ? null
    : repositoryContext.profileHint;
  const recommendedAgentsProfile = profileHint
    ? {
        kind: "agentsProfileRecommendation",
        profileName: profileHint,
        source: "AGENTS.md",
        reason: "Root AGENTS.md already declares the repo's intended starter profile."
      }
    : {
        kind: "agentsProfileRecommendation",
        ...inspectedProfileRecommendation.recommendation
      };

  phaseStartTime = startTiming();
  const agentsFileDiscovery = collectContextAgentsFiles({
    projectRootDirectory: targetDirectory,
    rootAgentsText
  });
  debugTimings.agentsFileDiscovery = durationInMilliseconds(phaseStartTime);
  const relevantAgentsFiles = agentsFileDiscovery.agentsFiles;

  phaseStartTime = startTiming();
  const recommendationCandidates = buildContextSkillRecommendations({
    registry: catalogSource.registry,
    projectState: repoInspection,
    repositoryContext,
    agentsProfileName: recommendedAgentsProfile.profileName
  });
  debugTimings.skillRecommendation = durationInMilliseconds(phaseStartTime);
  const recommendedSkills = recommendationCandidates.slice(0, CONTEXT_MAX_RECOMMENDED_SKILLS);
  const pendingSkillChanges = {
    kind: "pendingSkillChanges",
    install: repoInspection.syncPlan?.installedSkillNames ?? [],
    update: repoInspection.syncPlan?.updatedSkillNames ?? [],
    blocked: repoInspection.syncPlan?.blockedSkillPlans.map((planEntry) => createBlockedContextSkillChange(planEntry)) ?? []
  };
  const warnings = [
    ...(
      repoInspection.repoDetected && !relevantAgentsFiles[0].exists
        ? [createContextWarning({
            code: "ROOT_AGENTS_MISSING",
            message: "Root AGENTS.md is missing from this repo.",
            detail: rootAgentsFilePath
          })]
        : []
    ),
    ...relevantAgentsFiles
      .filter((agentsFile) => agentsFile.scope === "scoped" && !agentsFile.exists)
      .map((agentsFile) =>
        createContextWarning({
          code: "SCOPED_AGENTS_MISSING",
          message: "Root AGENTS.md references a scoped AGENTS.md file that does not exist yet.",
          detail: agentsFile.repoRelativePath
        })
      ),
    ...repoInspection.issues.map((issue) =>
      createContextWarning({
        code: issue.code,
        message: issue.message,
        detail: issue.detail
      })
    )
  ];
  const nextActions = buildContextActionPlan(repoInspection);
  debugTimings.total = durationInMilliseconds(totalStartTime);
  const contextDebug = debugRequested
    ? {
        kind: "contextDebug",
        timingsMs: debugTimings,
        agentsFileDiscovery: {
          kind: "agentsFileDiscovery",
          strategy: "root-plus-routing-path-hints",
          referencedPathHints: agentsFileDiscovery.pathHints,
          discoveredCount: relevantAgentsFiles.length
        },
        profileInference: {
          kind: "profileInference",
          profileName: inspectedProfileRecommendation.inference.profileName,
          confident: Boolean(inspectedProfileRecommendation.inference.confident),
          reason: inspectedProfileRecommendation.inference.reason,
          scores: inspectedProfileRecommendation.inference.scores ?? null,
          reasons: inspectedProfileRecommendation.inference.reasons ?? null
        },
        candidateSkillRecommendations: recommendationCandidates.slice(0, CONTEXT_MAX_DEBUG_RECOMMENDATIONS)
      }
    : null;

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const renderedLines = [
      ui.formatStatusLine({
        kind: repoInspection.repoDetected ? "ok" : "info",
        text: repoInspection.repoDetected ? "Local repo context ready" : "Directory context ready",
        detail: targetDirectory
      }),
      ui.formatStatusLine({
        kind: "info",
        text: "Execution",
        detail: "Purely local. No model calls, no token usage, no network."
      }),
      ui.formatStatusLine({
        kind: "info",
        text: "Repo status",
        detail: repoInspection.repoDetected ? repoInspection.repoStatus : "no-repo"
      }),
      ui.formatStatusLine({
        kind: "info",
        text: "Tracking",
        detail: repoInspection.trackingMode ?? "none"
      }),
      ui.formatStatusLine({
        kind: "info",
        text: "AGENTS profile",
        detail:
          recommendedAgentsProfile.profileName
            ? `${recommendedAgentsProfile.profileName} (${recommendedAgentsProfile.source})`
            : "none"
      })
    ];

    if (recommendedSkills.length > 0) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "Recommended skills",
          detail: recommendedSkills.map((skillRecommendation) => skillRecommendation.skillName).join(", ")
        })
      );
    }

    if (nextActions.length > 0) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "Next",
          detail: nextActions[0].commandText
        })
      );
    }

    stdoutWriter(
      ui.renderPanel({
        title: "Context",
        lines: renderedLines
      })
    );

    if (relevantAgentsFiles.some((agentsFile) => agentsFile.exists)) {
      stdoutWriter(
        ui.renderSection({
          title: "AGENTS Files",
          lines: relevantAgentsFiles
            .filter((agentsFile) => agentsFile.exists)
            .map((agentsFile) => ui.formatBullet(`${agentsFile.scope} ${agentsFile.repoRelativePath}`))
        })
      );
    }

    if (recommendedSkills.length > 0) {
      stdoutWriter(
        ui.renderSection({
          title: "Recommended Skills",
          lines: recommendedSkills.map((skillRecommendation) =>
            ui.formatBullet(
              `${skillRecommendation.skillName} (${skillRecommendation.score}) ${skillRecommendation.reasons.slice(0, 2).join(" ")}`
            )
          )
        })
      );
    }

    if (nextActions.length > 0) {
      stdoutWriter(
        ui.renderSection({
          title: "Next Actions",
          lines: nextActions.map((nextAction) =>
            ui.formatBullet(`${nextAction.commandText} ${nextAction.reason}`)
          )
        })
      );
    }

    if (warnings.length > 0) {
      stdoutWriter(
        ui.renderSection({
          title: "Warnings",
          lines: warnings.map((warning) =>
            ui.formatBullet(`${warning.code}: ${warning.message}${warning.detail ? ` (${warning.detail})` : ""}`)
          )
        })
      );
    }

    if (debugRequested && contextDebug) {
      stdoutWriter(
        ui.renderSection({
          title: "Debug",
          lines: [
            ui.formatBullet(
              `timings ${Object.entries(contextDebug.timingsMs)
                .map(([timingName, timingValue]) => `${timingName}=${timingValue.toFixed(1)}ms`)
                .join(", ")}`
            ),
            ui.formatBullet(
              `path hints ${contextDebug.agentsFileDiscovery.referencedPathHints.length > 0
                ? contextDebug.agentsFileDiscovery.referencedPathHints.join(", ")
                : "none"}`
            ),
            ...contextDebug.candidateSkillRecommendations.slice(0, 5).map((skillRecommendation) =>
              ui.formatBullet(
                `${skillRecommendation.skillName} (${skillRecommendation.score}) ${skillRecommendation.reasons[0] ?? "No explanation recorded."}`
              )
            )
          ]
        })
      );
    }
  }

  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    execution: {
      kind: "executionContract",
      mode: "local",
      usesModel: false,
      usesNetwork: false,
      prompts: false
    },
    catalog: {
      kind: "catalogSnapshot",
      sourceKind: repositoryUrl ? "override" : "bundled",
      sourceDirectory: catalogSource.sourceDirectory,
      packageVersion: catalogSource.catalogState.packageVersion,
      sourceHash: catalogSource.catalogState.sourceHash,
      skillCount: catalogSource.registry.skills.length
    },
    currentWorkingDirectory,
    targetDirectory,
    repoDetected: repoInspection.repoDetected,
    repoRootDirectory: repoInspection.repoDetected ? targetDirectory : null,
    repoStatus: repoInspection.repoStatus,
    trackingMode: repoInspection.trackingMode,
    projectConfigFilePath: repoInspection.repoDetected ? repoInspection.projectPaths.projectConfigFilePath : null,
    projectSkillsDirectory: repoInspection.repoDetected ? repoInspection.projectPaths.projectSkillsDirectory : null,
    repoFacts: {
      kind: "repositoryContext",
      ...repositoryContext
    },
    agentsProfile: recommendedAgentsProfile,
    trackedSkills: repoInspection.configuredSkillNames,
    installedSkills: repoInspection.installedSkillNames,
    unmanagedSkills: repoInspection.unmanagedInstalledSkillNames,
    recommendedSkillNames: recommendedSkills.map((skillRecommendation) => skillRecommendation.skillName),
    recommendedSkills,
    relevantAgentsFiles,
    pendingSkillChanges,
    nextActions,
    warnings,
    ...(contextDebug ? { debug: contextDebug } : {})
  };
}

function runDoctor({
  homeDirectory,
  currentWorkingDirectory,
  projectRootDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  outputStream,
  stdoutWriter,
  jsonOutput
}) {
  const globalState = inspectGlobalSurface({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const projectState = inspectProjectSurface({
    currentWorkingDirectory,
    projectRootDirectory,
    registry: globalState.catalogInspection?.registry ?? null,
    globalCatalogDirectory: globalState.catalogInspection?.sourceDirectory ?? null
  });

  const checks = [
    {
      scope: "global",
      level:
        globalState.globalCatalogStatus === "current"
          ? "ok"
          : globalState.globalCatalogStatus === "error"
            ? "warn"
            : "info",
      message:
        globalState.globalCatalogStatus === "current"
          ? "Global catalog matches the installed Vasir bundle."
          : globalState.globalCatalogStatus === "missing"
            ? "Global catalog cache has not been initialized yet."
            : globalState.globalCatalogStatus === "outdated"
              ? "Global catalog cache is behind the installed Vasir bundle."
              : "Global catalog cache needs repair before normal commands can trust it.",
      detail: globalState.globalPaths.globalCatalogDirectory
    },
    ...globalState.aliasStates.map((aliasState) => ({
      scope: "global",
      level: aliasState.status === "ok" || aliasState.status === "absent" ? "ok" : "warn",
      message:
        aliasState.status === "ok"
          ? `${aliasState.label} is healthy.`
          : aliasState.status === "absent"
            ? `${aliasState.label} is not needed yet.`
            : `${aliasState.label} needs repair.`,
      detail: aliasState.aliasPath
    }))
  ];

  if (projectState.repoDetected) {
    checks.push({
      scope: "repo",
      level:
        projectState.repoStatus === "tracked"
          ? "ok"
          : projectState.repoStatus === "not-initialized"
            ? "info"
            : "warn",
      message:
        projectState.repoStatus === "tracked"
          ? "Repo is tracked by Vasir."
          : projectState.repoStatus === "not-initialized"
            ? "Repo is not initialized for Vasir yet."
            : projectState.repoStatus === "adoption-required"
              ? "Repo has local skills that need adoption."
              : "Repo needs repair before updates are safe.",
      detail: projectState.projectPaths.projectRootDirectory
    });

    checks.push(
      ...projectState.aliasStates.map((aliasState) => ({
        scope: "repo",
        level: aliasState.status === "ok" || aliasState.status === "absent" ? "ok" : "warn",
        message:
          aliasState.status === "ok"
            ? `${aliasState.label} is healthy.`
            : aliasState.status === "absent"
              ? `${aliasState.label} is not needed yet.`
              : `${aliasState.label} needs repair.`,
        detail: aliasState.aliasPath
      }))
    );

    if (projectState.syncPlan) {
      checks.push({
        scope: "repo",
        level: projectState.syncPlan.blockedSkillPlans.length > 0 ? "warn" : "ok",
        message:
          projectState.syncPlan.blockedSkillPlans.length > 0
            ? "One or more tracked skills are blocked from safe replacement."
            : "Tracked skills can be refreshed safely.",
        detail:
          projectState.syncPlan.blockedSkillPlans.length > 0
            ? projectState.syncPlan.blockedSkillPlans.map((planEntry) => planEntry.skillName).join(", ")
            : null
      });
    }
  } else {
    checks.push({
      scope: "repo",
      level: "info",
      message: "No repo was detected from the current working directory.",
      detail: currentWorkingDirectory
    });
  }

  const issues = [...globalState.issues, ...projectState.issues];
  const nextSteps = dedupeStrings([
    globalState.globalCatalogStatus === "missing"
      ? "Run `vasir init` or `vasir update` once to create the global catalog cache."
      : globalState.globalCatalogStatus === "outdated"
        ? "Run `vasir update` to refresh the global catalog cache."
        : globalState.globalCatalogStatus === "error"
          ? "Repair the global catalog cache under `~/.agents/vasir`, then rerun `vasir doctor`."
          : null,
    ...projectState.nextSteps,
    projectState.syncPlan?.blockedSkillPlans.length
      ? "Resolve the blocked project-local skill edits before running `vasir update`."
      : null
  ].filter(Boolean));
  const overallStatus = issues.length === 0 ? "healthy" : "attention";

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const renderedLines = checks.map((check) =>
      ui.formatStatusLine({
        kind: check.level === "ok" ? "ok" : check.level === "warn" ? "warn" : "info",
        text: check.message,
        detail: check.detail ?? ""
      })
    );

    if (nextSteps.length > 0) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "Next",
          detail: nextSteps[0]
        })
      );
    }

    stdoutWriter(
      ui.renderPanel({
        title: overallStatus === "healthy" ? "Doctor" : "Doctor Attention",
        lines: renderedLines
      })
    );
  }

  return {
    overallStatus,
    nextSteps,
    globalCatalogDirectory: globalState.globalPaths.globalCatalogDirectory,
    projectRootDirectory: projectState.repoDetected ? projectState.projectPaths.projectRootDirectory : null,
    projectSkillsDirectory: projectState.repoDetected ? projectState.projectPaths.projectSkillsDirectory : null,
    projectConfigFilePath: projectState.repoDetected ? projectState.projectPaths.projectConfigFilePath : null,
    checks,
    issues
  };
}

function runRepair({
  currentWorkingDirectory,
  projectRootDirectory,
  repositoryUrl,
  platform,
  outputStream,
  stdoutWriter,
  jsonOutput
}) {
  const catalogSource = readCatalogSourceRegistry({
    repositoryUrl
  });
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  const repoDetected = projectRootDirectory !== null || repoLooksInitialized(projectPaths);
  if (!repoDetected) {
    throw new VasirCliError({
      code: "REPAIR_REPO_NOT_FOUND",
      message: "`vasir repair` must be run inside a repo, or with `--repo-root <path>`.",
      suggestion: "Run `vasir init` inside the target repo first, or pass `--repo-root <path>` explicitly.",
      docsRef: REPAIR_REFERENCE_DOCS_REF
    });
  }

  const projectConfigFileExists = fs.existsSync(projectPaths.projectConfigFilePath);
  const projectInstallStateFileExists = fs.existsSync(getProjectInstallStateFilePath(projectPaths));
  const installedSkillNames = listProjectSkillDirectoryNames(projectPaths);
  const skillEntriesByName = buildCatalogSkillEntryMap(catalogSource.registry);
  const projectState = inspectProjectSurface({
    currentWorkingDirectory,
    projectRootDirectory,
    registry: catalogSource.registry,
    globalCatalogDirectory: catalogSource.sourceDirectory
  });

  const repairTrackingPolicy = resolveRepairTrackingPolicy({
    projectConfig: projectState.projectConfigError ? null : projectState.projectConfig,
    projectInstallState: projectState.installStateError ? null : projectState.projectInstallState,
    registry: catalogSource.registry,
    installedSkillNames
  });

  if (!repairTrackingPolicy) {
    throw new VasirCliError({
      code: "REPAIR_NOTHING_TO_DO",
      message: "This repo does not have any Vasir-managed state to repair yet.",
      suggestion: "Run `vasir init` for the full catalog, or `vasir add <skill>` for a selected subset, before using `vasir repair`.",
      docsRef: REPAIR_REFERENCE_DOCS_REF
    });
  }

  const desiredSkillNames = [...new Set(repairTrackingPolicy.desiredSkillNames)]
    .sort((leftSkillName, rightSkillName) => leftSkillName.localeCompare(rightSkillName));
  const knownDesiredSkillNames = desiredSkillNames.filter((skillName) => skillEntriesByName.has(skillName));
  const unknownDesiredSkillNames = desiredSkillNames.filter((skillName) => !skillEntriesByName.has(skillName));
  const existingKnownDesiredSkillNames = knownDesiredSkillNames.filter((skillName) =>
    fs.existsSync(path.join(projectPaths.projectSkillsDirectory, skillName))
  );
  const missingKnownDesiredSkillNames = knownDesiredSkillNames.filter((skillName) =>
    !fs.existsSync(path.join(projectPaths.projectSkillsDirectory, skillName))
  );
  const shouldExpectProjectAliases =
    installedSkillNames.length > 0 || existingKnownDesiredSkillNames.length > 0 || missingKnownDesiredSkillNames.length > 0;

  if (shouldExpectProjectAliases) {
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
  }

  let rebuiltInstallState = false;
  if (projectState.installStateError || !projectInstallStateFileExists || repairTrackingPolicy.source === "installed-tree") {
    writeProjectInstallState({
      projectPaths,
      projectInstallState: createCatalogBackedInstallState({
        projectPaths,
        registry: catalogSource.registry,
        catalogProvenance: catalogSource.catalogState,
        trackingMode: repairTrackingPolicy.trackingMode,
        trackedSkillNames: existingKnownDesiredSkillNames
      })
    });
    rebuiltInstallState = true;
  }

  writeProjectConfig({
    projectPaths,
    projectConfig: createTrackingProjectConfig({
      trackingMode: repairTrackingPolicy.trackingMode,
      selectedSkillNames:
        repairTrackingPolicy.trackingMode === "selected"
          ? desiredSkillNames
          : []
    })
  });
  const rebuiltProjectConfig =
    projectState.projectConfigError !== null ||
    !projectConfigFileExists ||
    repairTrackingPolicy.source !== "project-config";

  let restoredSkillNames = [];
  if (missingKnownDesiredSkillNames.length > 0) {
    const restoredSkills = installSkillsIntoProject({
      registry: catalogSource.registry,
      globalCatalogDirectory: catalogSource.sourceDirectory,
      skillNames: missingKnownDesiredSkillNames,
      initializeAgentsFile: false,
      catalogProvenance: catalogSource.catalogState,
      trackingMode: repairTrackingPolicy.trackingMode,
      replaceExistingSkills: false,
      projectRootDirectory,
      currentWorkingDirectory,
      platform
    });
    restoredSkillNames = restoredSkills.installedSkillNames;
    writeProjectConfig({
      projectPaths,
      projectConfig: createTrackingProjectConfig({
        trackingMode: repairTrackingPolicy.trackingMode,
        selectedSkillNames:
          repairTrackingPolicy.trackingMode === "selected"
            ? desiredSkillNames
            : []
      })
    });
  }

  const repairedProjectState = inspectProjectSurface({
    currentWorkingDirectory,
    projectRootDirectory,
    registry: catalogSource.registry,
    globalCatalogDirectory: catalogSource.sourceDirectory
  });
  const unresolvedIssues = repairedProjectState.issues;
  const overallStatus = unresolvedIssues.length === 0 ? "healthy" : "attention";
  const nextSteps = unresolvedIssues.length === 0
    ? ["Run `vasir diff`, then `vasir update`, when you want to review and apply newer Vasir skill changes."]
    : repairedProjectState.nextSteps;

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const renderedLines = [
      ui.formatStatusLine({
        kind: overallStatus === "healthy" ? "ok" : "warn",
        text: overallStatus === "healthy" ? "Repo repaired" : "Repo repaired with remaining attention items",
        detail: projectPaths.projectRootDirectory
      }),
      ui.formatStatusLine({
        kind: "info",
        text: "Tracking",
        detail: repairTrackingPolicy.trackingMode === "all" ? "Full catalog" : "Selected skills"
      }),
      ui.formatStatusLine({
        kind: "info",
        text: "Repair source",
        detail:
          repairTrackingPolicy.source === "project-config"
            ? ".agents/vasir.json"
            : repairTrackingPolicy.source === "install-state"
              ? ".agents/vasir-install-state.json"
              : ".agents/skills/"
      })
    ];

    if (rebuiltProjectConfig) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "ok",
          text: "Repo config rebuilt",
          detail: projectPaths.projectConfigFilePath
        })
      );
    }

    if (rebuiltInstallState) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "ok",
          text: "Install state rebuilt",
          detail: getProjectInstallStateFilePath(projectPaths)
        })
      );
    }

    for (const restoredSkillName of restoredSkillNames) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "ok",
          text: `Restored ${restoredSkillName}`
        })
      );
    }

    if (unknownDesiredSkillNames.length > 0) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "warn",
          text: "Tracked skills missing from the current catalog",
          detail: unknownDesiredSkillNames.join(", ")
        })
      );
    }

    if (repairedProjectState.unmanagedInstalledSkillNames.length > 0) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "warn",
          text: "Left unmanaged",
          detail: repairedProjectState.unmanagedInstalledSkillNames.join(", ")
        })
      );
    }

    if (repairedProjectState.syncPlan?.blockedSkillPlans.length > 0) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "warn",
          text: "Still blocked",
          detail: repairedProjectState.syncPlan.blockedSkillPlans.map((planEntry) => planEntry.skillName).join(", ")
        })
      );
    }

    renderedLines.push(
      ui.formatStatusLine({
        kind: "info",
        text: "Next",
        detail: nextSteps[0]
      })
    );

    stdoutWriter(
      ui.renderPanel({
        title: overallStatus === "healthy" ? "Repair" : "Repair Attention",
        lines: renderedLines
      })
    );
  }

  return {
    overallStatus,
    nextSteps,
    catalogSourceDirectory: catalogSource.sourceDirectory,
    projectRootDirectory: projectPaths.projectRootDirectory,
    projectSkillsDirectory: projectPaths.projectSkillsDirectory,
    projectConfigFilePath: projectPaths.projectConfigFilePath,
    trackingMode: repairTrackingPolicy.trackingMode,
    trackingSource: repairTrackingPolicy.source,
    rebuiltProjectConfig,
    rebuiltInstallState,
    restoredSkills: restoredSkillNames,
    unresolvedSkills: [
      ...unknownDesiredSkillNames,
      ...(repairedProjectState.syncPlan?.blockedSkillPlans.map((planEntry) => planEntry.skillName) ?? [])
    ],
    unmanagedSkills: repairedProjectState.unmanagedInstalledSkillNames,
    issues: unresolvedIssues
  };
}

function runAdopt({
  homeDirectory,
  currentWorkingDirectory,
  projectRootDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  outputStream,
  stdoutWriter,
  jsonOutput
}) {
  const { globalPaths, registry, catalogState } = readGlobalRegistry({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const adoptResult = adoptProjectSkills({
    registry,
    catalogProvenance: catalogState,
    projectRootDirectory,
    currentWorkingDirectory,
    platform
  });

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const renderedLines = [
      ui.formatStatusLine({
        kind: "ok",
        text: "Repo adopted into Vasir management",
        detail: adoptResult.projectPaths.projectRootDirectory
      }),
      ui.formatStatusLine({
        kind: "info",
        text: "Tracking",
        detail: adoptResult.trackingMode === "all" ? "Full catalog" : "Selected skills"
      }),
      ui.formatStatusLine({
        kind: "info",
        text: "Repo config ready at",
        detail: adoptResult.projectPaths.projectConfigFilePath
      })
    ];

    for (const adoptedSkillName of adoptResult.adoptedSkillNames) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "ok",
          text: `Adopted ${adoptedSkillName}`
        })
      );
    }

    if (adoptResult.skippedSkillNames.length > 0) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "warn",
          text: "Left unmanaged",
          detail: adoptResult.skippedSkillNames.join(", ")
        })
      );
    }

    renderedLines.push(
      ui.formatStatusLine({
        kind: "info",
        text: "Next",
        detail: "Run `vasir status`, then `vasir update --dry-run`, to inspect the newly managed repo state."
      })
    );

    stdoutWriter(
      ui.renderPanel({
        title: "Adopt",
        lines: renderedLines
      })
    );
  }

  return {
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    projectRootDirectory: adoptResult.projectPaths.projectRootDirectory,
    projectConfigFilePath: adoptResult.projectPaths.projectConfigFilePath,
    projectSkillsDirectory: adoptResult.projectPaths.projectSkillsDirectory,
    adoptedSkills: adoptResult.adoptedSkillNames,
    skippedSkills: adoptResult.skippedSkillNames,
    trackingMode: adoptResult.trackingMode
  };
}

function runUpdate({
  homeDirectory,
  currentWorkingDirectory,
  projectRootDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  outputStream,
  stdoutWriter,
  jsonOutput,
  dryRunRequested
}) {
  const globalCatalogInspection = dryRunRequested
    ? inspectGlobalCatalog({
        homeDirectory,
        repositoryUrl,
        platform,
        spawnSyncImplementation
      })
    : null;
  const synchronizedCatalog = dryRunRequested
    ? null
    : synchronizeGlobalCatalog({
        homeDirectory,
        repositoryUrl,
        platform,
        spawnSyncImplementation
      });
  const { globalPaths, catalogState } = dryRunRequested
    ? globalCatalogInspection
    : synchronizedCatalog;
  const { registry } = dryRunRequested
    ? globalCatalogInspection
    : readGlobalRegistry({
        homeDirectory,
        repositoryUrl,
        platform,
        spawnSyncImplementation
      });
  const managedProjectSkills = listManagedProjectSkills({
    projectRootDirectory,
    currentWorkingDirectory
  });
  const projectConfig = readProjectConfig({
    projectPaths: managedProjectSkills.projectPaths
  });
  const projectInstallState = readProjectInstallState({
    projectPaths: managedProjectSkills.projectPaths
  });
  const comparisonCatalogDirectory = dryRunRequested
    ? globalCatalogInspection.sourceDirectory
    : globalPaths.globalCatalogDirectory;
  const syncPlan = createProjectSyncPlan({
    registry,
    globalCatalogDirectory: comparisonCatalogDirectory,
    projectPaths: managedProjectSkills.projectPaths,
    projectConfig,
    projectInstallState,
    managedSkillNames: managedProjectSkills.skillNames
  });
  const blockedSkillPlans = syncPlan.blockedSkillPlans;
  const installedSkills = syncPlan.installedSkillNames;
  const updatedSkills = syncPlan.updatedSkillNames;
  const unchangedSkills = syncPlan.unchangedSkillNames;

  if (!dryRunRequested && blockedSkillPlans.length > 0) {
    throw blockedSkillPlans[0].error;
  }

  if (!dryRunRequested && syncPlan.desiredSkillNames.length > 0) {
    installSkillsIntoProject({
      registry,
      globalCatalogDirectory: globalPaths.globalCatalogDirectory,
      skillNames: syncPlan.desiredSkillNames,
      initializeAgentsFile: false,
      catalogProvenance: catalogState,
      trackingMode: syncPlan.trackingMode,
      replaceExistingSkills: true,
      projectRootDirectory,
      currentWorkingDirectory,
      platform
    });
  }

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const renderedLines = [
      ui.formatStatusLine({
        kind: dryRunRequested
          ? globalCatalogInspection.catalogState.needsSynchronization ? "info" : "ok"
          : "ok",
        text: dryRunRequested
          ? globalCatalogInspection.catalogState.needsSynchronization ? "Global catalog would refresh" : "Global catalog already current"
          : "Global catalog updated"
      }),
      ui.formatField("path", ui.formatPath(globalPaths.globalCatalogDirectory))
    ];

    if (syncPlan.planEntries.length > 0) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "Tracking",
          detail: syncPlan.trackingMode === "all" ? "Full catalog" : "Selected skills"
        })
      );

      for (const planEntry of syncPlan.planEntries) {
        renderedLines.push(
          ui.formatStatusLine({
            kind:
              planEntry.status === "install" ? (dryRunRequested ? "info" : "ok")
                : planEntry.status === "update" ? (dryRunRequested ? "info" : "ok")
                : planEntry.status === "unchanged" ? "info"
                  : "warn",
            text:
              planEntry.status === "install"
                ? `${dryRunRequested ? "Would install" : "Installed"} ${planEntry.skillName}`
                : planEntry.status === "update"
                ? `${dryRunRequested ? "Would update" : "Updated"} ${planEntry.skillName}`
                : planEntry.status === "unchanged"
                  ? `Already current ${planEntry.skillName}`
                  : `Blocked ${planEntry.skillName}`,
            detail:
              planEntry.installedVersion || planEntry.availableVersion
                ? `${planEntry.installedVersion ?? "unknown"} -> ${planEntry.availableVersion ?? "missing"}`
                : planEntry.reason
          })
        );
      }
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: dryRunRequested ? "Project skills target" : "Project skills updated at",
          detail: managedProjectSkills.projectPaths.projectSkillsDirectory
        })
      );
      if (dryRunRequested && blockedSkillPlans.length > 0) {
        renderedLines.push(
          ui.formatStatusLine({
            kind: "warn",
            text: "Dry run found blocked skills",
            detail: "Actual `vasir update` would fail closed until those local changes are resolved."
          })
        );
      }
    } else {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "warn",
          text: "Repo not initialized",
          detail: "Run `vasir init` in this repo to install and track the full catalog, or `vasir add <skill>` to track a selected set."
        })
      );
    }

    stdoutWriter(
      ui.renderPanel({
        title: "Update",
        lines: renderedLines
      })
    );
  }

  return {
    dryRun: dryRunRequested,
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    projectRootDirectory: managedProjectSkills.projectPaths.projectRootDirectory,
    projectConfigFilePath: managedProjectSkills.projectPaths.projectConfigFilePath,
    projectSkillsDirectory: managedProjectSkills.projectPaths.projectSkillsDirectory,
    trackingMode: syncPlan.trackingMode,
    installedSkills,
    updatedSkills,
    unchangedSkills,
    blockedSkills: blockedSkillPlans.map((planEntry) => ({
      skillName: planEntry.skillName,
      installedVersion: planEntry.installedVersion,
      availableVersion: planEntry.availableVersion,
      reason: planEntry.reason,
      code: planEntry.error.code
    })),
    globalCatalogStatus: dryRunRequested
      ? globalCatalogInspection.catalogState.needsSynchronization ? "would-sync" : "current"
      : "updated"
  };
}

function runList({
  homeDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  outputStream,
  stdoutWriter,
  jsonOutput
}) {
  const { globalPaths, registry } = readGlobalRegistry({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const groupedSkills = groupSkillsByCategory(registry.skills);
    for (const [categoryName, skillEntries] of groupedSkills.entries()) {
      writeLine(stdoutWriter, ui.colors.header(categoryName));
      for (const skillEntry of skillEntries) {
        writeLine(stdoutWriter, `  ${ui.formatBullet(`${skillEntry.name} - ${skillEntry.description}`)}`);
      }
      writeLine(stdoutWriter, "");
    }
  }

  return {
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    skills: registry.skills
  };
}

async function runAdd({
  skillNames,
  agentsProfileName,
  replaceExistingSkills,
  homeDirectory,
  currentWorkingDirectory,
  projectRootDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  inputStream,
  outputStream,
  stdoutWriter,
  jsonOutput
}) {
  const { globalPaths, registry, catalogState } = readGlobalRegistry({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const tracksFullCatalog = skillNames.some(
    (requestedSkillName) => requestedSkillName.toLowerCase() === ADD_ALL_SKILLS_KEYWORD
  );
  const resolvedSkillNames = resolveRequestedAddSkillNames({
    requestedSkillNames: skillNames,
    registry
  });
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  const projectAgentsFilePath = path.join(projectPaths.projectRootDirectory, "AGENTS.md");
  const agentsSelection = agentsProfileName !== null
    ? {
        profileName: agentsProfileName,
        source: "flag",
        reason: "Explicitly requested via --agents-profile."
      }
    : fs.existsSync(projectAgentsFilePath)
      ? {
          profileName: null,
          source: "existing",
          reason: "AGENTS.md already exists, so Vasir left it unchanged."
        }
      : await resolveRecommendedAgentsProfile({
          projectRootDirectory: projectPaths.projectRootDirectory,
          inputStream,
          outputStream,
          jsonOutput
        });

  const installResult = installSkillsIntoProject({
    registry,
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    skillNames: resolvedSkillNames,
    agentsProfileName: agentsSelection.profileName,
    catalogProvenance: catalogState,
    trackingMode: tracksFullCatalog ? "all" : "selected",
    replaceExistingSkills,
    projectRootDirectory,
    currentWorkingDirectory,
    platform
  });
  const effectiveAgentsProfile = installResult.wroteAgentsFile
    ? installResult.agentsProfile
    : agentsSelection.source === "existing"
      ? readAgentsProfileHintFromFile(projectAgentsFilePath) ?? "custom"
      : installResult.agentsProfile;

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const renderedLines = [];
    for (const installedSkillName of installResult.installedSkillNames) {
      const actionVerb = installResult.replacedSkillNames.includes(installedSkillName) ? "Replaced" : "Installed";
      renderedLines.push(
        ui.formatStatusLine({
          kind: "ok",
          text: `${actionVerb} ${installedSkillName}`
        })
      );
    }
    renderedLines.push(
      ui.formatStatusLine({
        kind: "info",
        text: "Project skills ready at",
        detail: installResult.projectPaths.projectSkillsDirectory
      })
    );
    renderedLines.push(
      ui.formatStatusLine({
        kind: "info",
        text: "Repo config ready at",
        detail: installResult.projectPaths.projectConfigFilePath
      })
    );
    if (installResult.wroteAgentsFile) {
      const profileLabel = effectiveAgentsProfile === "generic"
        ? "generic"
        : effectiveAgentsProfile;
      const sourceLabel = agentsSelection.source === "flag"
        ? "explicit"
        : agentsSelection.source === "prompt"
          ? "selected"
          : agentsSelection.source === "inferred"
            ? "inferred"
            : "default";
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: `AGENTS starter ready at (${profileLabel}, ${sourceLabel})`,
          detail: installResult.agentsFilePath
        })
      );
      if (agentsSelection.reason) {
        renderedLines.push(
          ui.formatStatusLine({
            kind: agentsSelection.source === "default-generic" ? "warn" : "info",
            text: "AGENTS profile",
            detail: agentsSelection.reason
          })
        );
      }
    } else {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "info",
          text: "AGENTS left unchanged at",
          detail: installResult.agentsFilePath
        })
      );
    }
    renderedLines.push(
      ui.formatStatusLine({
        kind: "info",
        text: "Next",
        detail:
          "vasir agents draft-purpose --write --model openai, vasir agents draft-routing --write, then vasir agents validate"
      })
    );
    stdoutWriter(
      ui.renderPanel({
        title: "Project Skills",
        lines: renderedLines
      })
    );
  }

  return {
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    projectRootDirectory: installResult.projectPaths.projectRootDirectory,
    projectConfigFilePath: installResult.projectPaths.projectConfigFilePath,
    projectSkillsDirectory: installResult.projectPaths.projectSkillsDirectory,
    installedSkills: installResult.installedSkillNames,
    replacedSkills: installResult.replacedSkillNames,
    agentsFilePath: installResult.agentsFilePath,
    agentsProfile: effectiveAgentsProfile,
    agentsProfileSource: agentsSelection.source,
    wroteAgentsFile: installResult.wroteAgentsFile
  };
}

async function runRemove({
  skillNames,
  currentWorkingDirectory,
  projectRootDirectory,
  inputStream,
  outputStream,
  stdoutWriter,
  jsonOutput
}) {
  let resolvedSkillNames = [...skillNames];

  if (resolvedSkillNames.length === 0 && !jsonOutput && canPromptInteractively({ inputStream, outputStream })) {
    const installedSkills = listInstalledProjectSkills({
      projectRootDirectory,
      currentWorkingDirectory
    });

    if (installedSkills.skillNames.length === 0) {
      throw new VasirCliError({
        code: "SKILL_NAME_REQUIRED",
        message: "No project-local skills are installed in this repo.",
        suggestion: "Run `vasir add <skill>` first, or rerun `vasir remove <skill>` with an explicit skill name.",
        docsRef: REMOVE_REFERENCE_DOCS_REF
      });
    }

    const selection = await interactiveMultiSelect({
      title: "Choose skills to remove",
      promptLabel: "Skills",
      allowEmpty: false,
      clearOnExit: true,
      inputStream,
      outputStream,
      items: installedSkills.skillNames.map((installedSkillName) => ({
        value: installedSkillName,
        label: installedSkillName
      }))
    });

    resolvedSkillNames = selection?.values ?? [];
  }

  if (resolvedSkillNames.length === 0) {
    throw new VasirCliError({
      code: "SKILL_NAME_REQUIRED",
      message: "At least one skill name is required.",
      suggestion: "Run `vasir remove <skill>` with one or more project-local skill names.",
      docsRef: REMOVE_REFERENCE_DOCS_REF
    });
  }

  const removeResult = removeSkillsFromProject({
    skillNames: resolvedSkillNames,
    projectRootDirectory,
    currentWorkingDirectory
  });

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const renderedLines = [];

    for (const removedSkillName of removeResult.removedSkillNames) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "ok",
          text: `Removed ${removedSkillName}`
        })
      );
    }

    for (const missingSkillName of removeResult.missingSkillNames) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "warn",
          text: `${missingSkillName} already absent`
        })
      );
    }

    renderedLines.push(
      ui.formatStatusLine({
        kind: "info",
        text: "Project skills now live at",
        detail: removeResult.projectPaths.projectSkillsDirectory
      })
    );

    if (removeResult.switchedTrackingModeToSelected) {
      renderedLines.push(
        ui.formatStatusLine({
          kind: "warn",
          text: "Tracking changed",
          detail: "This repo no longer tracks the full catalog automatically; future `vasir update` runs will sync only the remaining installed skills."
        })
      );
    }

    stdoutWriter(
      ui.renderPanel({
        title: "Project Skills",
        lines: renderedLines
      })
    );
  }

  return {
    projectRootDirectory: removeResult.projectPaths.projectRootDirectory,
    projectConfigFilePath: removeResult.projectPaths.projectConfigFilePath,
    projectSkillsDirectory: removeResult.projectPaths.projectSkillsDirectory,
    removedSkills: removeResult.removedSkillNames,
    missingSkills: removeResult.missingSkillNames,
    switchedTrackingModeToSelected: removeResult.switchedTrackingModeToSelected
  };
}

async function runEval({
  evalArguments,
  modelArguments,
  requestedTrialCount,
  homeDirectory,
  currentWorkingDirectory,
  projectRootDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  stdoutWriter,
  jsonOutput,
  inputStream,
  outputStream,
  environmentVariables,
  fetchImplementation
}) {
  const evalSubcommand = evalArguments[0];
  if (!evalSubcommand) {
    throw new VasirCliError({
      code: "EVAL_SUBCOMMAND_REQUIRED",
      message: "An eval subcommand is required.",
      suggestion: "Use `vasir eval run <skill>`, `vasir eval inspect <skill>`, or `vasir eval rescore <skill>`.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  if (!["run", "inspect", "rescore"].includes(evalSubcommand)) {
    throw new VasirCliError({
      code: "UNKNOWN_EVAL_SUBCOMMAND",
      message: `Unknown eval subcommand: ${evalSubcommand}`,
      suggestion: "Use `vasir eval run <skill>`, `vasir eval inspect <skill>`, or `vasir eval rescore <skill>`.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  const skillName = evalArguments[1];
  if (!skillName) {
    throw new VasirCliError({
      code: "EVAL_SKILL_REQUIRED",
      message: "A skill name is required for `vasir eval run`.",
      suggestion: "Run `vasir eval run <skill>` with a skill that exists locally or in the global catalog.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  const runId = evalArguments[2] ?? null;

  const promptForMissingCredential =
    !jsonOutput && canPromptInteractively({ inputStream, outputStream })
      ? (promptOptions) =>
          promptForMissingProviderCredential({
            ...promptOptions,
            inputStream,
            outputStream
          })
      : null;

  if (evalSubcommand === "run") {
    return runSkillEval({
      skillName,
      homeDirectory,
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      requestedModelArguments: modelArguments,
      promptForMissingCredential,
      outputStream,
      stdoutWriter,
      jsonOutput,
      environmentVariables,
      fetchImplementation,
      trialCount: requestedTrialCount ?? undefined
    });
  }

  if (modelArguments.length > 0) {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--model is only supported by `vasir eval run`.",
      suggestion: "Use `vasir eval inspect <skill>` or `vasir eval rescore <skill>` without `--model`.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  if (requestedTrialCount !== null) {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--trials is only supported by `vasir eval run`.",
      suggestion: "Use `vasir eval run <skill> --trials <count>` when you want repeated eval trials.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  if (evalSubcommand === "inspect") {
    return inspectSkillEval({
      skillName,
      runId,
      currentWorkingDirectory,
      projectRootDirectory,
      outputStream,
      stdoutWriter,
      jsonOutput
    });
  }

  return rescoreSkillEval({
    skillName,
    runId,
    currentWorkingDirectory,
    projectRootDirectory,
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation,
    outputStream,
    stdoutWriter,
    jsonOutput
  });
}

async function runSelectedCommand({
  commandName,
  commandArguments,
  agentsProfileName,
  debugRequested,
  dryRunRequested,
  exitCodeRequested,
  modelArguments,
  projectRootArgument,
  requestedTrialCount,
  replaceExistingSkills,
  writeGeneratedOutput,
  homeDirectory,
  currentWorkingDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  stdoutWriter,
  jsonOutput,
  inputStream,
  outputStream,
  environmentVariables,
  fetchImplementation
}) {
  if (
    replaceExistingSkills &&
    !(commandName === "add" || (commandName === "agents" && commandArguments[0] === "init"))
  ) {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--replace is only supported by `vasir add` and `vasir agents init`.",
      suggestion:
        "Use `vasir add --replace <skill>` to refresh a project-local skill copy, or `vasir agents init <profile> --replace` to overwrite AGENTS.md intentionally.",
      docsRef: REPLACE_REFERENCE_DOCS_REF
    });
  }

  if (
    agentsProfileName !== null &&
    commandName !== "add"
  ) {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--agents-profile is only supported by `vasir add`.",
      suggestion: "Use `vasir add <skill> --agents-profile <backend|frontend|ios>` when you want one-command skill install plus AGENTS scaffolding.",
      docsRef: REPLACE_REFERENCE_DOCS_REF
    });
  }

  if (
    modelArguments.length > 0 &&
    !(commandName === "eval" || (commandName === "agents" && commandArguments[0] === "draft-purpose"))
  ) {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--model is only supported by `vasir eval` and `vasir agents draft-purpose`.",
      suggestion:
        "Use `vasir eval run <skill> --model <provider>` or `vasir agents draft-purpose --model <provider>` when you want to override the default model choice.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  if (requestedTrialCount !== null && commandName !== "eval") {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--trials is only supported by `vasir eval`.",
      suggestion:
        "Use `vasir eval run <skill> --trials <count>` when you want repeated eval trials.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  if (
    writeGeneratedOutput &&
    !(commandName === "agents" && ["draft-purpose", "draft-routing"].includes(commandArguments[0]))
  ) {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--write is only supported by `vasir agents draft-purpose` and `vasir agents draft-routing`.",
      suggestion:
        "Use `vasir agents draft-purpose --write` or `vasir agents draft-routing --write` when you want Vasir to replace a placeholder block in AGENTS.md.",
      docsRef: UNKNOWN_COMMAND_TROUBLESHOOTING_DOCS_REF
    });
  }

  if (dryRunRequested && commandName !== "update") {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--dry-run is only supported by `vasir update`.",
      suggestion: "Use `vasir update --dry-run` when you want to preview repo-local refreshes without mutating files.",
      docsRef: COMMANDS_REFERENCE_DOCS_REF
    });
  }

  if (debugRequested && commandName !== "context") {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--debug is only supported by `vasir context`.",
      suggestion: "Use `vasir context --debug` when you want local timing and routing evidence.",
      docsRef: COMMANDS_REFERENCE_DOCS_REF
    });
  }

  if (exitCodeRequested && commandName !== "diff") {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--exit-code is only supported by `vasir diff`.",
      suggestion: "Use `vasir diff --exit-code` when you want shell-friendly diff semantics for repo-local skill drift.",
      docsRef: DIFF_REFERENCE_DOCS_REF
    });
  }

  if (
    projectRootArgument !== null &&
    !["status", "context", "doctor", "repair", "diff", "init", "update", "add", "adopt", "remove", "agents", "eval"].includes(commandName)
  ) {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--repo-root is only supported by repo-bound commands.",
      suggestion: "Use `--repo-root <path>` with `vasir status`, `context`, `doctor`, `repair`, `diff`, `init`, `update`, `add`, `adopt`, `remove`, `agents`, or `eval`.",
      docsRef: COMMANDS_REFERENCE_DOCS_REF
    });
  }

  const projectRootDirectory = resolveProjectRootDirectoryFlag(projectRootArgument);

  if (commandName === "status") {
    return runStatus({
      homeDirectory,
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      outputStream,
      stdoutWriter,
      jsonOutput
    });
  }

  if (commandName === "context") {
    return runContext({
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      outputStream,
      stdoutWriter,
      jsonOutput,
      debugRequested
    });
  }

  if (commandName === "doctor") {
    return runDoctor({
      homeDirectory,
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      outputStream,
      stdoutWriter,
      jsonOutput
    });
  }

  if (commandName === "repair") {
    return runRepair({
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      platform,
      outputStream,
      stdoutWriter,
      jsonOutput
    });
  }

  if (commandName === "diff") {
    return runDiff({
      skillNames: commandArguments,
      homeDirectory,
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      outputStream,
      stdoutWriter,
      jsonOutput,
      exitCodeRequested
    });
  }

  if (commandName === "init") {
    return await runInit({
      homeDirectory,
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      inputStream,
      outputStream,
      stdoutWriter,
      jsonOutput
    });
  }

  if (commandName === "update") {
    return runUpdate({
      homeDirectory,
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      outputStream,
      stdoutWriter,
      jsonOutput,
      dryRunRequested
    });
  }

  if (commandName === "list") {
    return runList({
      homeDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      outputStream,
      stdoutWriter,
      jsonOutput
    });
  }

  if (commandName === "add") {
    return await runAdd({
      skillNames: commandArguments,
      agentsProfileName,
      replaceExistingSkills,
      homeDirectory,
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      inputStream,
      outputStream,
      stdoutWriter,
      jsonOutput
    });
  }

  if (commandName === "adopt") {
    return runAdopt({
      homeDirectory,
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      outputStream,
      stdoutWriter,
      jsonOutput
    });
  }

  if (commandName === "remove") {
    return await runRemove({
      skillNames: commandArguments,
      currentWorkingDirectory,
      projectRootDirectory,
      inputStream,
      outputStream,
      stdoutWriter,
      jsonOutput
    });
  }

  if (commandName === "agents") {
    return runAgents({
      agentsArguments: commandArguments,
      replaceExistingAgentsFile: replaceExistingSkills,
      writeGeneratedOutput,
      modelArguments,
      homeDirectory,
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      inputStream,
      outputStream,
      stdoutWriter,
      jsonOutput,
      environmentVariables,
      fetchImplementation
    });
  }

  if (commandName === "eval") {
    return runEval({
      evalArguments: commandArguments,
      modelArguments,
      requestedTrialCount,
      homeDirectory,
      currentWorkingDirectory,
      projectRootDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      inputStream,
      outputStream,
      environmentVariables,
      fetchImplementation,
      stdoutWriter,
      jsonOutput,
    });
  }

  throw new VasirCliError({
    code: "UNKNOWN_COMMAND",
    message: `Unknown command: ${commandName}`,
    suggestion: "Run `vasir --help` to see the supported command contract.",
    docsRef: UNKNOWN_COMMAND_TROUBLESHOOTING_DOCS_REF
  });
}

export async function runCommandLine(
  argumentVector,
  {
    homeDirectory,
    currentWorkingDirectory = process.cwd(),
    repositoryUrl,
    platform = process.platform,
    spawnSyncImplementation = childProcess.spawnSync,
    inputStream = process.stdin,
    outputStream = process.stdout,
    errorStream = process.stderr,
    environmentVariables = process.env,
    fetchImplementation = globalThis.fetch,
    stdoutWriter = (message) => outputStream.write(message),
    stderrWriter = (message) => errorStream.write(message)
  } = {}
) {
  const rawArguments = argumentVector.slice(2);
  let commandName = rawArguments.find((argument) => !argument.startsWith("--")) ?? "status";
  let jsonOutput = rawArguments.includes("--json");

  try {
    const invocation = parseCommandInvocation(argumentVector);
    commandName = invocation.commandName;
    jsonOutput = invocation.jsonOutput;

    if (invocation.versionRequested) {
      commandName = "version";
      const packageMetadata = readPackageMetadata();

      if (jsonOutput) {
        writeJson(stdoutWriter, {
          command: commandName,
          status: "success",
          name: packageMetadata.name,
          version: packageMetadata.version
        });
      } else {
        writeLine(stdoutWriter, formatVersionText());
      }

      return 0;
    }

    if (invocation.helpRequested) {
      stdoutWriter(formatUsage());
      return 0;
    }

    const commandResult = await runSelectedCommand({
      commandName,
      commandArguments: invocation.commandArguments,
      agentsProfileName: invocation.agentsProfileName,
      debugRequested: invocation.debugRequested,
      dryRunRequested: invocation.dryRunRequested,
      exitCodeRequested: invocation.exitCodeRequested,
      modelArguments: invocation.modelArguments,
      projectRootArgument: invocation.projectRootArgument,
      requestedTrialCount: invocation.requestedTrialCount,
      replaceExistingSkills: invocation.replaceExistingSkills,
      writeGeneratedOutput: invocation.writeGeneratedOutput,
      homeDirectory,
      currentWorkingDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      stdoutWriter,
      jsonOutput,
      inputStream,
      outputStream,
      environmentVariables,
      fetchImplementation
    });
    const { processExitCode = 0, ...commandPayload } = commandResult ?? {};

    if (jsonOutput) {
      writeJson(stdoutWriter, {
        command: commandName,
        status: "success",
        ...commandPayload
      });
    }

    return processExitCode;
  } catch (error) {
    const normalizedError = wrapUnknownCliError(error);

    if (jsonOutput) {
      writeJson(
        stderrWriter,
        formatCliErrorForJson({
          commandName,
          error: normalizedError
        })
      );
    } else {
      stderrWriter(
        formatCliErrorForText(normalizedError, {
          outputStream: errorStream
        })
      );
    }

    return normalizedError.exitCode;
  }
}
