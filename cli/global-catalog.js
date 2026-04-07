import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { VasirCliError } from "./cli-error.js";
import { GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF } from "./docs-ref.js";
import { ensureDirectoryAlias } from "./link-directory.js";
import { getPackageRootDirectory, readPackageMetadata } from "./package-metadata.js";
import { buildGlobalPaths } from "./path-layout.js";

const CATALOG_DIRECTORY_PATHS = Object.freeze([".agents/skills", "templates"]);
const CATALOG_ROOT_FILES = Object.freeze(["registry.json"]);
const GLOBAL_CATALOG_STATE_FILE_NAME = ".vasir-catalog-state.json";
const ALLOWED_GLOBAL_CATALOG_ROOT_ENTRIES = new Set([
  ...new Set(CATALOG_DIRECTORY_PATHS.map((directoryPath) => directoryPath.split("/")[0])),
  ...CATALOG_ROOT_FILES,
  GLOBAL_CATALOG_STATE_FILE_NAME
]);

export const DEFAULT_REPOSITORY_URL = null;

function normalizeLocalCatalogSourcePath(repositoryUrl) {
  if (!repositoryUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(repositoryUrl);
    if (parsedUrl.protocol === "file:") {
      return fileURLToPath(parsedUrl);
    }

    throw new VasirCliError({
      code: "CATALOG_SOURCE_UNSUPPORTED",
      message: `Unsupported Vasir catalog source override: ${repositoryUrl}`,
      suggestion:
        "Use `VASIR_REPOSITORY_URL` only with a local directory path or `file:///...` URL that contains registry.json, .agents/skills/, and templates/.",
      docsRef: GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF
    });
  } catch (error) {
    if (error instanceof VasirCliError) {
      throw error;
    }

    return path.resolve(repositoryUrl);
  }
}

function resolveCatalogSourceDirectory({ repositoryUrl = DEFAULT_REPOSITORY_URL } = {}) {
  const candidateDirectory = normalizeLocalCatalogSourcePath(repositoryUrl) ?? getPackageRootDirectory();

  assertCatalogDirectoryLooksValid({
    catalogDirectory: candidateDirectory,
    label: repositoryUrl ? "catalog source override" : "bundled catalog"
  });

  return candidateDirectory;
}

function assertCatalogDirectoryLooksValid({ catalogDirectory, label }) {
  for (const requiredRootFile of CATALOG_ROOT_FILES) {
    if (!fs.existsSync(path.join(catalogDirectory, requiredRootFile))) {
      throw new VasirCliError({
        code: "INVALID_GLOBAL_CATALOG",
        message: `${label} is missing ${requiredRootFile}: ${catalogDirectory}`,
        suggestion: "Repair the bundled catalog or override path, then rerun the Vasir command.",
        docsRef: GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF
      });
    }
  }

  for (const requiredDirectory of CATALOG_DIRECTORY_PATHS) {
    const requiredDirectoryPath = path.join(catalogDirectory, requiredDirectory);
    if (!fs.existsSync(requiredDirectoryPath) || !fs.statSync(requiredDirectoryPath).isDirectory()) {
      throw new VasirCliError({
        code: "INVALID_GLOBAL_CATALOG",
        message: `${label} is missing ${requiredDirectory}/: ${catalogDirectory}`,
        suggestion: "Repair the bundled catalog or override path, then rerun the Vasir command.",
        docsRef: GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF
      });
    }
  }
}

function readCatalogSnapshotEntries(catalogDirectory) {
  const snapshotEntries = [];

  for (const rootFileName of CATALOG_ROOT_FILES) {
    snapshotEntries.push({
      absolutePath: path.join(catalogDirectory, rootFileName),
      relativePath: rootFileName
    });
  }

  for (const rootDirectoryPathFragment of CATALOG_DIRECTORY_PATHS) {
    const rootDirectoryPath = path.join(catalogDirectory, rootDirectoryPathFragment);
    const directoryEntries = fs.readdirSync(rootDirectoryPath, { withFileTypes: true });

    function walk(currentDirectoryPath, currentRelativeDirectoryPath) {
      for (const directoryEntry of fs.readdirSync(currentDirectoryPath, { withFileTypes: true })) {
        const entryAbsolutePath = path.join(currentDirectoryPath, directoryEntry.name);
        const entryRelativePath = path.join(currentRelativeDirectoryPath, directoryEntry.name).replace(/\\/g, "/");

        if (directoryEntry.isDirectory()) {
          walk(entryAbsolutePath, entryRelativePath);
          continue;
        }

        if (directoryEntry.isFile()) {
          snapshotEntries.push({
            absolutePath: entryAbsolutePath,
            relativePath: entryRelativePath
          });
        }
      }
    }

    for (const directoryEntry of directoryEntries) {
      const entryAbsolutePath = path.join(rootDirectoryPath, directoryEntry.name);
      const entryRelativePath = path.join(rootDirectoryPathFragment, directoryEntry.name).replace(/\\/g, "/");

      if (directoryEntry.isDirectory()) {
        walk(entryAbsolutePath, entryRelativePath);
        continue;
      }

      if (directoryEntry.isFile()) {
        snapshotEntries.push({
          absolutePath: entryAbsolutePath,
          relativePath: entryRelativePath
        });
      }
    }
  }

  return snapshotEntries.sort((leftEntry, rightEntry) => leftEntry.relativePath.localeCompare(rightEntry.relativePath));
}

function computeCatalogSnapshotHash(catalogDirectory) {
  const hash = crypto.createHash("sha256");

  for (const snapshotEntry of readCatalogSnapshotEntries(catalogDirectory)) {
    hash.update(snapshotEntry.relativePath);
    hash.update("\n");
    hash.update(fs.readFileSync(snapshotEntry.absolutePath));
    hash.update("\n");
  }

  return hash.digest("hex");
}

function readGlobalCatalogState(globalCatalogDirectory) {
  const stateFilePath = path.join(globalCatalogDirectory, GLOBAL_CATALOG_STATE_FILE_NAME);
  if (!fs.existsSync(stateFilePath)) {
    return null;
  }

  try {
    const parsedState = JSON.parse(fs.readFileSync(stateFilePath, "utf8"));
    if (
      typeof parsedState !== "object" ||
      parsedState === null ||
      typeof parsedState.sourceHash !== "string" ||
      typeof parsedState.packageVersion !== "string"
    ) {
      return null;
    }

    return parsedState;
  } catch {
    return null;
  }
}

function writeGlobalCatalogState({
  globalCatalogDirectory,
  sourceHash
}) {
  const packageMetadata = readPackageMetadata();
  fs.writeFileSync(
    path.join(globalCatalogDirectory, GLOBAL_CATALOG_STATE_FILE_NAME),
    `${JSON.stringify({
      packageVersion: packageMetadata.version,
      sourceHash
    }, null, 2)}\n`
  );
}

function copyCatalogSnapshot({
  sourceDirectory,
  targetDirectory
}) {
  fs.rmSync(targetDirectory, { recursive: true, force: true });
  fs.mkdirSync(targetDirectory, { recursive: true });

  for (const rootFileName of CATALOG_ROOT_FILES) {
    fs.copyFileSync(
      path.join(sourceDirectory, rootFileName),
      path.join(targetDirectory, rootFileName)
    );
  }

  for (const rootDirectoryPathFragment of CATALOG_DIRECTORY_PATHS) {
    const sourceDirectoryPath = path.join(sourceDirectory, rootDirectoryPathFragment);
    const targetDirectoryPath = path.join(targetDirectory, rootDirectoryPathFragment);
    fs.mkdirSync(path.dirname(targetDirectoryPath), { recursive: true });
    fs.cpSync(
      sourceDirectoryPath,
      targetDirectoryPath,
      { recursive: true }
    );
  }
}

function assertGlobalCatalogLooksValid(globalCatalogDirectory) {
  assertCatalogDirectoryLooksValid({
    catalogDirectory: globalCatalogDirectory,
    label: "global catalog"
  });
}

function listUnexpectedCatalogRootEntries(globalCatalogDirectory) {
  if (!fs.existsSync(globalCatalogDirectory)) {
    return [];
  }

  return fs.readdirSync(globalCatalogDirectory, { withFileTypes: true })
    .filter((entry) => !ALLOWED_GLOBAL_CATALOG_ROOT_ENTRIES.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function synchronizeCatalogCache({
  globalCatalogDirectory,
  sourceDirectory
}) {
  fs.mkdirSync(path.dirname(globalCatalogDirectory), { recursive: true });
  copyCatalogSnapshot({
    sourceDirectory,
    targetDirectory: globalCatalogDirectory
  });
  writeGlobalCatalogState({
    globalCatalogDirectory,
    sourceHash: computeCatalogSnapshotHash(sourceDirectory)
  });
}

function inspectCatalogCache({
  globalCatalogDirectory,
  sourceDirectory
}) {
  const expectedSourceHash = computeCatalogSnapshotHash(sourceDirectory);
  const packageMetadata = readPackageMetadata();
  const globalCatalogState = fs.existsSync(globalCatalogDirectory)
    ? readGlobalCatalogState(globalCatalogDirectory)
    : null;

  let actualTargetHash = null;
  if (fs.existsSync(globalCatalogDirectory)) {
    try {
      actualTargetHash = computeCatalogSnapshotHash(globalCatalogDirectory);
    } catch {
      actualTargetHash = null;
    }
  }

  if (
    fs.existsSync(globalCatalogDirectory) &&
    globalCatalogState?.sourceHash &&
    actualTargetHash !== null &&
    actualTargetHash !== globalCatalogState.sourceHash
  ) {
    throw new VasirCliError({
      code: "GLOBAL_CATALOG_DIRTY",
      message: `Global catalog cache has local changes and cannot be refreshed safely: ${globalCatalogDirectory}`,
      suggestion:
        "Move aside or delete `~/.agents/vasir` if you want Vasir to rebuild the cache from the installed bundle or local override source, then rerun the command.",
      docsRef: GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF
    });
  }

  const unexpectedRootEntries = listUnexpectedCatalogRootEntries(globalCatalogDirectory);
  if (unexpectedRootEntries.length > 0) {
    throw new VasirCliError({
      code: "GLOBAL_CATALOG_DIRTY",
      message: `Global catalog cache has local changes and cannot be refreshed safely: ${globalCatalogDirectory}`,
      suggestion:
        "Move aside or delete `~/.agents/vasir` if you want Vasir to rebuild the cache from the installed bundle or local override source, then rerun the command.",
      context: {
        unexpectedRootEntries
      },
      docsRef: GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF
    });
  }

  const needsSynchronization =
    !fs.existsSync(globalCatalogDirectory) ||
    globalCatalogState?.sourceHash !== expectedSourceHash ||
    actualTargetHash !== expectedSourceHash;

  return {
    packageVersion: packageMetadata.version,
    sourceHash: expectedSourceHash,
    needsSynchronization
  };
}

function ensureCatalogCacheCurrent({
  globalCatalogDirectory,
  sourceDirectory
}) {
  const catalogState = inspectCatalogCache({
    globalCatalogDirectory,
    sourceDirectory
  });

  if (catalogState.needsSynchronization) {
    synchronizeCatalogCache({
      globalCatalogDirectory,
      sourceDirectory
    });
  }

  return catalogState;
}

function readRegistryFromCatalogDirectory(catalogDirectory) {
  try {
    return JSON.parse(fs.readFileSync(path.join(catalogDirectory, "registry.json"), "utf8"));
  } catch (error) {
    throw new VasirCliError({
      code: "INVALID_GLOBAL_CATALOG",
      message: `Global catalog registry is invalid at ${catalogDirectory}.`,
      suggestion: "Repair the bundled catalog or override path, then rerun the Vasir command.",
      docsRef: GLOBAL_CATALOG_TROUBLESHOOTING_DOCS_REF,
      cause: error
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

export function ensureGlobalCatalogPresent({
  homeDirectory,
  repositoryUrl = DEFAULT_REPOSITORY_URL,
  platform = process.platform,
  spawnSyncImplementation = null
} = {}) {
  const globalPaths = buildGlobalPaths({ homeDirectory });
  const sourceDirectory = resolveCatalogSourceDirectory({ repositoryUrl });
  const catalogState = ensureCatalogCacheCurrent({
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    sourceDirectory
  });

  assertGlobalCatalogLooksValid(globalPaths.globalCatalogDirectory);
  repairGlobalAliases({ globalPaths, platform });

  return {
    globalPaths,
    sourceDirectory,
    catalogState
  };
}

export function synchronizeGlobalCatalog({
  homeDirectory,
  repositoryUrl = DEFAULT_REPOSITORY_URL,
  platform = process.platform,
  spawnSyncImplementation = null
} = {}) {
  const globalPaths = buildGlobalPaths({ homeDirectory });
  const sourceDirectory = resolveCatalogSourceDirectory({ repositoryUrl });
  const catalogState = ensureCatalogCacheCurrent({
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    sourceDirectory
  });

  if (catalogState.needsSynchronization) {
    synchronizeCatalogCache({
      globalCatalogDirectory: globalPaths.globalCatalogDirectory,
      sourceDirectory
    });
  }
  assertGlobalCatalogLooksValid(globalPaths.globalCatalogDirectory);
  repairGlobalAliases({ globalPaths, platform });

  return {
    globalPaths,
    sourceDirectory,
    catalogState: {
      packageVersion: catalogState.packageVersion,
      sourceHash: catalogState.sourceHash
    }
  };
}

export function inspectGlobalCatalog({
  homeDirectory,
  repositoryUrl = DEFAULT_REPOSITORY_URL,
  platform = process.platform,
  spawnSyncImplementation = null
} = {}) {
  const globalPaths = buildGlobalPaths({ homeDirectory });
  const sourceDirectory = resolveCatalogSourceDirectory({ repositoryUrl });
  const catalogState = inspectCatalogCache({
    globalCatalogDirectory: globalPaths.globalCatalogDirectory,
    sourceDirectory
  });

  assertCatalogDirectoryLooksValid({
    catalogDirectory: sourceDirectory,
    label: repositoryUrl ? "catalog source override" : "bundled catalog"
  });

  return {
    globalPaths,
    sourceDirectory,
    catalogState,
    registry: readRegistryFromCatalogDirectory(sourceDirectory)
  };
}

export function readGlobalRegistry({
  homeDirectory,
  repositoryUrl = DEFAULT_REPOSITORY_URL,
  platform = process.platform,
  spawnSyncImplementation = null
} = {}) {
  const { globalPaths, sourceDirectory, catalogState } = ensureGlobalCatalogPresent({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });

  return {
    globalPaths,
    sourceDirectory,
    catalogState,
    registry: readRegistryFromCatalogDirectory(sourceDirectory)
  };
}
