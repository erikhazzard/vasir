import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "./cli-error.js";
import { REPLACE_SAFETY_TROUBLESHOOTING_DOCS_REF } from "./docs-ref.js";

const PROJECT_INSTALL_STATE_SCHEMA_VERSION = 1;

function createEmptyProjectInstallState() {
  return {
    schemaVersion: PROJECT_INSTALL_STATE_SCHEMA_VERSION,
    skills: {}
  };
}

function computeFileSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function listRelativeFilePathsRecursively(rootDirectory, currentDirectory = rootDirectory) {
  const relativeFilePaths = [];
  const directoryEntries = fs.readdirSync(currentDirectory, { withFileTypes: true });

  for (const directoryEntry of directoryEntries) {
    const entryPath = path.join(currentDirectory, directoryEntry.name);
    if (directoryEntry.isDirectory()) {
      relativeFilePaths.push(...listRelativeFilePathsRecursively(rootDirectory, entryPath));
      continue;
    }

    if (directoryEntry.isFile()) {
      relativeFilePaths.push(path.relative(rootDirectory, entryPath));
    }
  }

  return relativeFilePaths.sort();
}

function createModifiedSkillError({ targetSkillDirectory, detailMessage, context = {} }) {
  return new VasirCliError({
    code: "PROJECT_SKILL_MODIFIED",
    message: `Project skill has local changes and cannot be safely replaced: ${targetSkillDirectory}. ${detailMessage}`,
    suggestion:
      "Back up or delete the project-local skill directory manually if you want to discard local edits, then rerun `vasir add <skill>`.",
    context,
    docsRef: REPLACE_SAFETY_TROUBLESHOOTING_DOCS_REF
  });
}

export function getProjectInstallStateFilePath(projectPaths) {
  return path.join(projectPaths.agentsDirectory, "vasir-install-state.json");
}

export function readProjectInstallState({ projectPaths }) {
  const projectInstallStateFilePath = getProjectInstallStateFilePath(projectPaths);
  if (!fs.existsSync(projectInstallStateFilePath)) {
    return createEmptyProjectInstallState();
  }

  try {
    const parsedInstallState = JSON.parse(fs.readFileSync(projectInstallStateFilePath, "utf8"));
    if (
      parsedInstallState.schemaVersion !== PROJECT_INSTALL_STATE_SCHEMA_VERSION ||
      typeof parsedInstallState.skills !== "object" ||
      parsedInstallState.skills === null ||
      Array.isArray(parsedInstallState.skills)
    ) {
      throw new Error("Unexpected install state schema.");
    }

    return parsedInstallState;
  } catch (error) {
    throw new VasirCliError({
      code: "INVALID_PROJECT_INSTALL_STATE",
      message: `Project install state is invalid at ${projectInstallStateFilePath}.`,
      suggestion:
        "Delete `.agents/vasir-install-state.json` if you want Vasir to stop trusting prior install snapshots, then reinstall the needed skills.",
      docsRef: REPLACE_SAFETY_TROUBLESHOOTING_DOCS_REF,
      cause: error
    });
  }
}

export function writeProjectInstallState({ projectPaths, projectInstallState }) {
  fs.mkdirSync(projectPaths.agentsDirectory, { recursive: true });
  fs.writeFileSync(
    getProjectInstallStateFilePath(projectPaths),
    `${JSON.stringify(projectInstallState, null, 2)}\n`
  );
}

export function createProjectSkillInstallStateEntry({
  targetSkillDirectory,
  managedRelativeFilePaths
}) {
  const sortedManagedRelativeFilePaths = [...managedRelativeFilePaths].sort();
  const fileHashes = {};

  for (const relativeFilePath of sortedManagedRelativeFilePaths) {
    fileHashes[relativeFilePath] = computeFileSha256(path.join(targetSkillDirectory, relativeFilePath));
  }

  return {
    managedFiles: sortedManagedRelativeFilePaths,
    fileHashes
  };
}

export function assertProjectSkillReplaceSafety({
  projectInstallState,
  skillName,
  targetSkillDirectory
}) {
  const trackedSkillEntry = projectInstallState.skills[skillName];
  if (!trackedSkillEntry) {
    throw new VasirCliError({
      code: "PROJECT_SKILL_UNTRACKED",
      message: `Project skill cannot be safely replaced because Vasir has no install snapshot for ${targetSkillDirectory}.`,
      suggestion:
        "Delete the project-local skill directory manually if you want a fresh copy, then rerun `vasir add <skill>`.",
      docsRef: REPLACE_SAFETY_TROUBLESHOOTING_DOCS_REF
    });
  }

  const actualRelativeFilePaths = listRelativeFilePathsRecursively(targetSkillDirectory);
  const expectedRelativeFilePaths = [...trackedSkillEntry.managedFiles].sort();
  const unexpectedRelativeFilePaths = actualRelativeFilePaths.filter(
    (relativeFilePath) => !expectedRelativeFilePaths.includes(relativeFilePath)
  );
  const missingRelativeFilePaths = expectedRelativeFilePaths.filter(
    (relativeFilePath) => !actualRelativeFilePaths.includes(relativeFilePath)
  );

  if (unexpectedRelativeFilePaths.length > 0 || missingRelativeFilePaths.length > 0) {
    throw createModifiedSkillError({
      targetSkillDirectory,
      detailMessage: "The on-disk file inventory no longer matches the last Vasir-managed snapshot.",
      context: {
        unexpectedRelativeFilePaths,
        missingRelativeFilePaths
      }
    });
  }

  const modifiedRelativeFilePaths = [];
  for (const relativeFilePath of expectedRelativeFilePaths) {
    const actualHash = computeFileSha256(path.join(targetSkillDirectory, relativeFilePath));
    if (actualHash !== trackedSkillEntry.fileHashes[relativeFilePath]) {
      modifiedRelativeFilePaths.push(relativeFilePath);
    }
  }

  if (modifiedRelativeFilePaths.length > 0) {
    throw createModifiedSkillError({
      targetSkillDirectory,
      detailMessage: "One or more managed files were edited after installation.",
      context: {
        modifiedRelativeFilePaths
      }
    });
  }
}
