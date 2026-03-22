import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "./cli-error.js";
import {
  ALIAS_TROUBLESHOOTING_DOCS_REF,
  COMMANDS_REFERENCE_DOCS_REF
} from "./docs-ref.js";

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

function createDirectoryLink({ aliasPath, targetPath, platform }) {
  const aliasParentDirectory = path.dirname(aliasPath);
  const relativeTargetPath = path.relative(aliasParentDirectory, targetPath);

  if (platform !== "win32") {
    fs.symlinkSync(relativeTargetPath, aliasPath, "dir");
    return "symlink";
  }

  try {
    fs.symlinkSync(relativeTargetPath, aliasPath, "dir");
    return "symlink";
  } catch (symbolicLinkError) {
    if (!["EPERM", "EINVAL", "UNKNOWN"].includes(symbolicLinkError.code)) {
      throw symbolicLinkError;
    }

    fs.symlinkSync(path.resolve(targetPath), aliasPath, "junction");
    return "junction";
  }
}

export function ensureDirectoryAlias({ aliasPath, targetPath, platform = process.platform } = {}) {
  if (!aliasPath) {
    throw new VasirCliError({
      code: "INVALID_ALIAS_REQUEST",
      message: "aliasPath is required for directory alias creation.",
      suggestion: "Update the CLI invocation to provide a concrete alias path.",
      docsRef: COMMANDS_REFERENCE_DOCS_REF
    });
  }

  if (!targetPath) {
    throw new VasirCliError({
      code: "INVALID_ALIAS_REQUEST",
      message: "targetPath is required for directory alias creation.",
      suggestion: "Update the CLI invocation to provide a concrete alias target.",
      docsRef: COMMANDS_REFERENCE_DOCS_REF
    });
  }

  if (!fs.existsSync(targetPath)) {
    throw new VasirCliError({
      code: "ALIAS_TARGET_MISSING",
      message: `Alias target does not exist: ${targetPath}`,
      suggestion: "Run `vasir init` for global aliases or `vasir add <skill>` for project aliases.",
      docsRef: ALIAS_TROUBLESHOOTING_DOCS_REF
    });
  }

  const canonicalTargetPath = fs.realpathSync(targetPath);
  fs.mkdirSync(path.dirname(aliasPath), { recursive: true });

  if (pathExistsWithoutFollowingDirectoryLink(aliasPath)) {
    const canonicalAliasTargetPath = safeRealPath(aliasPath);
    if (canonicalAliasTargetPath === canonicalTargetPath) {
      return { action: "verified", linkType: "existing" };
    }

    const aliasStats = fs.lstatSync(aliasPath);
    if (!aliasStats.isSymbolicLink()) {
      throw new VasirCliError({
        code: "ALIAS_CONFLICT",
        message: `Alias path already exists and is not repairable: ${aliasPath}`,
        suggestion: "Move the conflicting path out of the way, then rerun the Vasir command.",
        docsRef: ALIAS_TROUBLESHOOTING_DOCS_REF
      });
    }

    fs.rmSync(aliasPath, { force: true, recursive: true });
  }

  const linkType = createDirectoryLink({ aliasPath, targetPath, platform });
  const repairedAliasTargetPath = safeRealPath(aliasPath);
  if (repairedAliasTargetPath !== canonicalTargetPath) {
    throw new VasirCliError({
      code: "ALIAS_REPAIR_FAILED",
      message: `Alias path does not resolve to canonical target: ${aliasPath}`,
      suggestion: "Delete the broken alias path, then rerun the Vasir command.",
      docsRef: ALIAS_TROUBLESHOOTING_DOCS_REF
    });
  }

  return { action: "created", linkType };
}
