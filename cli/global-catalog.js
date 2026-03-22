import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { VasirCliError } from "./cli-error.js";
import {
  GIT_TROUBLESHOOTING_DOCS_REF,
  GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF
} from "./docs-ref.js";
import { ensureDirectoryAlias } from "./link-directory.js";
import { buildGlobalPaths } from "./path-layout.js";

export const DEFAULT_REPOSITORY_URL = "https://github.com/erikhazzard/vasir.git";

export function probeGitAvailability({
  spawnSyncImplementation = childProcess.spawnSync
} = {}) {
  const commandResult = spawnSyncImplementation("git", ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (commandResult.error) {
    if (commandResult.error.code === "ENOENT") {
      return {
        available: false,
        error: new VasirCliError({
          code: "GIT_NOT_FOUND",
          message: "Git is required but was not found on PATH.",
          suggestion: "Install Git, confirm `git --version` works, then rerun the Vasir command.",
          docsRef: GIT_TROUBLESHOOTING_DOCS_REF
        })
      };
    }

    return {
      available: false,
      error: new VasirCliError({
        code: "GIT_UNAVAILABLE",
        message: `Git could not be started: ${commandResult.error.message}`,
        suggestion: "Fix the local Git installation, confirm `git --version` works, then rerun the Vasir command.",
        docsRef: GIT_TROUBLESHOOTING_DOCS_REF
      })
    };
  }

  if (commandResult.status !== 0) {
    return {
      available: false,
      error: new VasirCliError({
        code: "GIT_UNAVAILABLE",
        message: (commandResult.stderr || commandResult.stdout || "Git is unavailable.").trim(),
        suggestion: "Fix the local Git installation, confirm `git --version` works, then rerun the Vasir command.",
        docsRef: GIT_TROUBLESHOOTING_DOCS_REF
      })
    };
  }

  return {
    available: true,
    versionText: (commandResult.stdout || commandResult.stderr || "").trim()
  };
}

function assertGitAvailable({ spawnSyncImplementation = childProcess.spawnSync } = {}) {
  const gitProbe = probeGitAvailability({ spawnSyncImplementation });
  if (!gitProbe.available) {
    throw gitProbe.error;
  }
}

function runGitCommand({
  argumentList,
  currentWorkingDirectory,
  spawnSyncImplementation = childProcess.spawnSync
}) {
  assertGitAvailable({ spawnSyncImplementation });
  const commandResult = spawnSyncImplementation("git", argumentList, {
    cwd: currentWorkingDirectory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (commandResult.error) {
    if (commandResult.error.code === "ENOENT") {
      throw new VasirCliError({
        code: "GIT_NOT_FOUND",
        message: "Git is required but was not found on PATH.",
        suggestion: "Install Git, confirm `git --version` works, then rerun the Vasir command.",
        docsRef: GIT_TROUBLESHOOTING_DOCS_REF
      });
    }

    throw new VasirCliError({
      code: "GIT_UNAVAILABLE",
      message: `Git could not be started: ${commandResult.error.message}`,
      suggestion: "Fix the local Git installation, confirm `git --version` works, then rerun the Vasir command.",
      docsRef: GIT_TROUBLESHOOTING_DOCS_REF
    });
  }

  if (commandResult.status !== 0) {
    throw new VasirCliError({
      code: "GIT_COMMAND_FAILED",
      message: (commandResult.stderr || commandResult.stdout || "git command failed").trim(),
      suggestion: "Inspect the Git repository state, then rerun the Vasir command.",
      docsRef: GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF
    });
  }

  return (commandResult.stdout || "").trim();
}

function assertGlobalCatalogLooksValid(globalCatalogDirectory) {
  if (!fs.existsSync(path.join(globalCatalogDirectory, ".git"))) {
    throw new VasirCliError({
      code: "INVALID_GLOBAL_CATALOG",
      message: `Global catalog is missing .git metadata: ${globalCatalogDirectory}`,
      suggestion: "Remove the broken global catalog directory, then rerun `vasir init`.",
      docsRef: GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF
    });
  }

  if (!fs.existsSync(path.join(globalCatalogDirectory, "registry.json"))) {
    throw new VasirCliError({
      code: "INVALID_GLOBAL_CATALOG",
      message: `Global catalog is missing registry.json: ${globalCatalogDirectory}`,
      suggestion: "Remove the broken global catalog directory, then rerun `vasir init`.",
      docsRef: GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF
    });
  }
}

function assertGlobalCatalogIsClean({ globalCatalogDirectory, spawnSyncImplementation }) {
  const porcelainOutput = runGitCommand({
    argumentList: ["status", "--porcelain"],
    currentWorkingDirectory: globalCatalogDirectory,
    spawnSyncImplementation
  });

  if (porcelainOutput.length > 0) {
    throw new VasirCliError({
      code: "GLOBAL_CATALOG_DIRTY",
      message: `Global catalog has uncommitted changes at ${globalCatalogDirectory}. Refusing to update or install from a dirty source.`,
      suggestion: "Clean or relocate the modified global catalog directory, then rerun the Vasir command.",
      docsRef: GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF
    });
  }
}

function repairGlobalAliases({ globalPaths, platform }) {
  ensureDirectoryAlias({
    aliasPath: globalPaths.globalClaudeAliasPath,
    targetPath: globalPaths.globalCatalogDirectory,
    platform
  });
  ensureDirectoryAlias({
    aliasPath: globalPaths.globalCodexAliasPath,
    targetPath: globalPaths.globalCatalogDirectory,
    platform
  });
}

function cloneGlobalCatalog({
  globalCatalogDirectory,
  repositoryUrl,
  spawnSyncImplementation
}) {
  fs.mkdirSync(path.dirname(globalCatalogDirectory), { recursive: true });
  runGitCommand({
    argumentList: ["clone", "--depth", "1", repositoryUrl, globalCatalogDirectory],
    currentWorkingDirectory: process.cwd(),
    spawnSyncImplementation
  });
}

function pullGlobalCatalog({
  globalCatalogDirectory,
  spawnSyncImplementation
}) {
  runGitCommand({
    argumentList: ["-C", globalCatalogDirectory, "pull", "--ff-only"],
    currentWorkingDirectory: process.cwd(),
    spawnSyncImplementation
  });
}

export function ensureGlobalCatalogPresent({
  homeDirectory,
  repositoryUrl = DEFAULT_REPOSITORY_URL,
  platform = process.platform,
  spawnSyncImplementation = childProcess.spawnSync
} = {}) {
  const globalPaths = buildGlobalPaths({ homeDirectory });

  if (!fs.existsSync(globalPaths.globalCatalogDirectory)) {
    cloneGlobalCatalog({
      globalCatalogDirectory: globalPaths.globalCatalogDirectory,
      repositoryUrl,
      spawnSyncImplementation
    });
  }

  assertGlobalCatalogLooksValid(globalPaths.globalCatalogDirectory);
  assertGlobalCatalogIsClean({
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    spawnSyncImplementation
  });
  repairGlobalAliases({ globalPaths, platform });

  return globalPaths;
}

export function synchronizeGlobalCatalog({
  homeDirectory,
  repositoryUrl = DEFAULT_REPOSITORY_URL,
  platform = process.platform,
  spawnSyncImplementation = childProcess.spawnSync
} = {}) {
  const globalPaths = buildGlobalPaths({ homeDirectory });

  if (!fs.existsSync(globalPaths.globalCatalogDirectory)) {
    cloneGlobalCatalog({
      globalCatalogDirectory: globalPaths.globalCatalogDirectory,
      repositoryUrl,
      spawnSyncImplementation
    });
  } else {
    assertGlobalCatalogLooksValid(globalPaths.globalCatalogDirectory);
    assertGlobalCatalogIsClean({
      globalCatalogDirectory: globalPaths.globalCatalogDirectory,
      spawnSyncImplementation
    });
    pullGlobalCatalog({
      globalCatalogDirectory: globalPaths.globalCatalogDirectory,
      spawnSyncImplementation
    });
  }

  assertGlobalCatalogLooksValid(globalPaths.globalCatalogDirectory);
  assertGlobalCatalogIsClean({
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    spawnSyncImplementation
  });
  repairGlobalAliases({ globalPaths, platform });

  return globalPaths;
}

export function readGlobalRegistry({
  homeDirectory,
  repositoryUrl = DEFAULT_REPOSITORY_URL,
  platform = process.platform,
  spawnSyncImplementation = childProcess.spawnSync
} = {}) {
  const globalPaths = ensureGlobalCatalogPresent({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });

  return {
    globalPaths,
    registry: (() => {
      try {
        return JSON.parse(fs.readFileSync(path.join(globalPaths.globalCatalogDirectory, "registry.json"), "utf8"));
      } catch (error) {
        throw new VasirCliError({
          code: "INVALID_GLOBAL_CATALOG",
          message: `Global catalog registry is invalid at ${globalPaths.globalCatalogDirectory}.`,
          suggestion: "Remove the broken global catalog directory, then rerun `vasir init`.",
          docsRef: GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF,
          cause: error
        });
      }
    })()
  };
}
