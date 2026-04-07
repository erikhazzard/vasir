import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { resolveRecommendedAgentsProfile, runAgents } from "./agents.js";
import {
  formatCliErrorForJson,
  formatCliErrorForText,
  VasirCliError,
  wrapUnknownCliError
} from "./cli-error.js";
import {
  COMMANDS_REFERENCE_DOCS_REF,
  ADD_REFERENCE_DOCS_REF,
  EVAL_REFERENCE_DOCS_REF,
  REMOVE_REFERENCE_DOCS_REF,
  REPLACE_REFERENCE_DOCS_REF,
  UNKNOWN_COMMAND_TROUBLESHOOTING_DOCS_REF
} from "./docs-ref.js";
import { readPackageMetadata } from "./package-metadata.js";
import { inspectGlobalCatalog, readGlobalRegistry, synchronizeGlobalCatalog } from "./global-catalog.js";
import { buildProjectPaths } from "./path-layout.js";
import {
  installSkillsIntoProject,
  listInstalledProjectSkills,
  listManagedProjectSkills,
  removeSkillsFromProject
} from "./project-skills.js";
import { inspectProjectSkillReplaceSafety, readProjectInstallState } from "./project-install-state.js";
import { listSkillFiles } from "./skill-metadata.js";
import { canPromptInteractively, promptForMissingProviderCredential } from "./eval/interactive.js";
import { inspectSkillEval } from "./eval/inspect-skill-eval.js";
import { rescoreSkillEval } from "./eval/rescore-skill-eval.js";
import { runSkillEval } from "./eval/run-skill-eval.js";
import { createCommandUi } from "./ui/command-output.js";
import { interactiveMultiSelect } from "./ui/interactive-select.js";

const ADD_ALL_SKILLS_KEYWORD = "all";

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

function computeFileSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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

function resolveProjectTrackingMode({
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
  projectInstallState,
  managedSkillNames
}) {
  const trackingMode = resolveProjectTrackingMode({
    projectInstallState,
    registry,
    managedSkillNames
  });
  const desiredSkillNames = trackingMode === "all"
    ? registry.skills.map((skillEntry) => skillEntry.name)
    : managedSkillNames;
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

function readAgentsProfileHintFromFile(agentsFilePath) {
  if (!fs.existsSync(agentsFilePath)) {
    return null;
  }

  const agentsText = fs.readFileSync(agentsFilePath, "utf8");
  return agentsText.match(/<!--\s*vasir:profile:([a-z0-9-]+)\s*-->/i)?.[1] ?? null;
}

function formatUsage() {
  return `vasir

Usage:
  vasir init [--json] [--repo-root <path>]         Sync ~/.agents/vasir; inside a repo, install and track the full catalog
  vasir update [--json] [--dry-run] [--repo-root <path>] Sync ~/.agents/vasir and update the tracked Vasir skills in this repo
  vasir list [--json]                               Show available skills from the global catalog
  vasir add <skill> [skill...] [--json] [--replace] [--agents-profile <name>] [--repo-root <path>] Copy skills into the current repo root at .agents/skills
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
  Use --json for automation and LLM consumers.
  init outside a repo mutates only the global catalog under ~/.agents/vasir.
  init inside a repo installs the full catalog into that repo and marks it for full-catalog updates.
  update mutates the global catalog under ~/.agents/vasir and refreshes the skills tracked by the current repo.
  update --dry-run shows the global refresh and repo-local skill changes without mutating either location.
  add mutates only the current repo root (nearest parent with .git, or the current directory if none exists).
  Pass --repo-root <path> to target an explicit repo root, including monorepo subprojects.
  Use "vasir add all" to install every catalog skill into the current repo.
  add auto-initializes the global catalog if needed.
  add also seeds AGENTS.md when it is missing; --agents-profile backend|frontend|ios overrides profile inference.
  agents init mutates only the current repo root and writes AGENTS.md from the selected profile.
  agents draft-purpose reads local repo context and can replace the AGENTS purpose placeholder when --write is set.
  agents draft-routing suggests repo-aware Section 1 lanes and can replace the routing placeholder when --write is set.
  agents validate fails closed when AGENTS.md still contains known scaffold placeholders or broken repo routes.
  Use --replace only to refresh an unmodified project-local skill from the global catalog or intentionally overwrite AGENTS.md during vasir agents init.
  remove mutates only the current repo root and also updates .agents/vasir-install-state.json.
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
  let jsonOutput = false;
  let helpRequested = false;
  let agentsProfileName = null;
  let dryRunRequested = false;
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

  const commandName = positionalArguments[0] ?? "init";
  return {
    commandName,
    commandArguments: positionalArguments.slice(1),
    jsonOutput,
    agentsProfileName,
    dryRunRequested,
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
  const repoTargeted =
    projectRootDirectory !== null ||
    fs.existsSync(path.join(resolvedProjectPaths.projectRootDirectory, ".git"));

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
  const projectInstallState = readProjectInstallState({
    projectPaths: managedProjectSkills.projectPaths
  });
  const syncPlan = createProjectSyncPlan({
    registry,
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    projectPaths: managedProjectSkills.projectPaths,
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
    projectSkillsDirectory: managedProjectSkills.projectPaths.projectSkillsDirectory,
    trackingMode: effectiveTrackingMode,
    installedSkills,
    updatedSkills,
    unchangedSkills,
    agentsFilePath,
    wroteAgentsFile
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
  dryRunRequested,
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

  if (
    projectRootArgument !== null &&
    !["init", "update", "add", "remove", "agents", "eval"].includes(commandName)
  ) {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--repo-root is only supported by repo-bound commands.",
      suggestion: "Use `--repo-root <path>` with `vasir init`, `update`, `add`, `remove`, `agents`, or `eval`.",
      docsRef: COMMANDS_REFERENCE_DOCS_REF
    });
  }

  const projectRootDirectory = resolveProjectRootDirectoryFlag(projectRootArgument);

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
  let commandName = rawArguments.find((argument) => !argument.startsWith("--")) ?? "init";
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
      dryRunRequested: invocation.dryRunRequested,
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

    if (jsonOutput) {
      writeJson(stdoutWriter, {
        command: commandName,
        status: "success",
        ...commandResult
      });
    }

    return 0;
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
