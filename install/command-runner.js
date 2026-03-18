import childProcess from "node:child_process";
import process from "node:process";

import {
  formatCliErrorForJson,
  formatCliErrorForText,
  VasirCliError,
  wrapUnknownCliError
} from "./cli-error.js";
import {
  ADD_REFERENCE_DOCS_REF,
  REPLACE_REFERENCE_DOCS_REF,
  UNKNOWN_COMMAND_TROUBLESHOOTING_DOCS_REF
} from "./docs-ref.js";
import { readPackageMetadata } from "./package-metadata.js";
import { readGlobalRegistry, synchronizeGlobalCatalog } from "./global-catalog.js";
import { installSkillsIntoProject } from "./project-skills.js";

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

function formatUsage() {
  return `vasir

Usage:
  vasir init [--json]                               Clone or refresh ~/.agents/vasir and repair global aliases
  vasir update [--json]                             Fast-forward ~/.agents/vasir; bootstraps if missing
  vasir list [--json]                               Show available skills from the global catalog
  vasir add <skill> [skill...] [--json] [--replace] Copy skills into the current repo root at .agents/skills
  vasir --version [--json]                          Print the installed Vasir CLI version
  vasir --help

Notes:
  Requires Git on PATH.
  Use --json for automation and LLM consumers.
  init and update mutate the global catalog under ~/.agents/vasir.
  add mutates only the current repo root (nearest parent with .git, or the current directory if none exists).
  add auto-initializes the global catalog if needed.
  Use --replace only to refresh an unmodified project-local skill from the global catalog.
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

function parseCommandInvocation(argumentVector) {
  const rawArguments = argumentVector.slice(2);
  const positionalArguments = [];
  let jsonOutput = false;
  let helpRequested = false;
  let replaceExistingSkills = false;
  let versionRequested = false;

  for (const rawArgument of rawArguments) {
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
    replaceExistingSkills,
    versionRequested,
    helpRequested: helpRequested || commandName === "help"
  };
}

function runInit({
  homeDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  stdoutWriter,
  jsonOutput
}) {
  const globalPaths = synchronizeGlobalCatalog({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });

  if (!jsonOutput) {
    writeLine(stdoutWriter, `Global catalog ready at ${globalPaths.globalCatalogDirectory}`);
  }

  return {
    globalCatalogDirectory: globalPaths.globalCatalogDirectory
  };
}

function runUpdate({
  homeDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  stdoutWriter,
  jsonOutput
}) {
  const globalPaths = synchronizeGlobalCatalog({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });

  if (!jsonOutput) {
    writeLine(stdoutWriter, `Global catalog updated at ${globalPaths.globalCatalogDirectory}`);
  }

  return {
    globalCatalogDirectory: globalPaths.globalCatalogDirectory
  };
}

function runList({
  homeDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
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
    const groupedSkills = groupSkillsByCategory(registry.skills);
    for (const [categoryName, skillEntries] of groupedSkills.entries()) {
      writeLine(stdoutWriter, categoryName);
      for (const skillEntry of skillEntries) {
        writeLine(stdoutWriter, `  ${skillEntry.name} - ${skillEntry.description}`);
      }
      writeLine(stdoutWriter, "");
    }
  }

  return {
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    skills: registry.skills
  };
}

function runAdd({
  skillNames,
  replaceExistingSkills,
  homeDirectory,
  currentWorkingDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  stdoutWriter,
  jsonOutput
}) {
  if (skillNames.length === 0) {
    throw new VasirCliError({
      code: "SKILL_NAME_REQUIRED",
      message: "At least one skill name is required.",
      suggestion: "Run `vasir list` to discover valid skill names, then rerun `vasir add <skill>`.",
      docsRef: ADD_REFERENCE_DOCS_REF
    });
  }

  const { globalPaths, registry } = readGlobalRegistry({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });

  const installResult = installSkillsIntoProject({
    registry,
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    skillNames,
    replaceExistingSkills,
    currentWorkingDirectory,
    platform
  });

  if (!jsonOutput) {
    for (const installedSkillName of installResult.installedSkillNames) {
      const actionVerb = installResult.replacedSkillNames.includes(installedSkillName) ? "Replaced" : "Installed";
      writeLine(stdoutWriter, `${actionVerb} ${installedSkillName}`);
    }
    writeLine(
      stdoutWriter,
      `Project skills ready at ${installResult.projectPaths.projectSkillsDirectory}`
    );
  }

  return {
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    projectRootDirectory: installResult.projectPaths.projectRootDirectory,
    projectSkillsDirectory: installResult.projectPaths.projectSkillsDirectory,
    installedSkills: installResult.installedSkillNames,
    replacedSkills: installResult.replacedSkillNames
  };
}

function runSelectedCommand({
  commandName,
  commandArguments,
  replaceExistingSkills,
  homeDirectory,
  currentWorkingDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  stdoutWriter,
  jsonOutput
}) {
  if (replaceExistingSkills && commandName !== "add") {
    throw new VasirCliError({
      code: "INVALID_COMMAND_FLAG",
      message: "--replace is only supported by `vasir add`.",
      suggestion: "Use `vasir add --replace <skill>` when you want to refresh a project-local skill copy.",
      docsRef: REPLACE_REFERENCE_DOCS_REF
    });
  }

  if (commandName === "init") {
    return runInit({
      homeDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      stdoutWriter,
      jsonOutput
    });
  }

  if (commandName === "update") {
    return runUpdate({
      homeDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      stdoutWriter,
      jsonOutput
    });
  }

  if (commandName === "list") {
    return runList({
      homeDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      stdoutWriter,
      jsonOutput
    });
  }

  if (commandName === "add") {
    return runAdd({
      skillNames: commandArguments,
      replaceExistingSkills,
      homeDirectory,
      currentWorkingDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      stdoutWriter,
      jsonOutput
    });
  }

  throw new VasirCliError({
    code: "UNKNOWN_COMMAND",
    message: `Unknown command: ${commandName}`,
    suggestion: "Run `vasir --help` to see the supported command contract.",
    docsRef: UNKNOWN_COMMAND_TROUBLESHOOTING_DOCS_REF
  });
}

export function runCommandLine(
  argumentVector,
  {
    homeDirectory,
    currentWorkingDirectory = process.cwd(),
    repositoryUrl,
    platform = process.platform,
    spawnSyncImplementation = childProcess.spawnSync,
    stdoutWriter = (message) => process.stdout.write(message),
    stderrWriter = (message) => process.stderr.write(message)
  } = {}
) {
  let commandName = "init";
  let jsonOutput = false;

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

    const commandResult = runSelectedCommand({
      commandName,
      commandArguments: invocation.commandArguments,
      replaceExistingSkills: invocation.replaceExistingSkills,
      homeDirectory,
      currentWorkingDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation,
      stdoutWriter,
      jsonOutput
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
      stderrWriter(formatCliErrorForText(normalizedError));
    }

    return normalizedError.exitCode;
  }
}
