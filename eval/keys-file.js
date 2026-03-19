import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "../install/cli-error.js";
import { EVAL_TROUBLESHOOTING_DOCS_REF } from "../install/docs-ref.js";
import { buildProjectPaths } from "../install/path-layout.js";

const SUPPORTED_KEYS = Object.freeze([
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_BASE_URL",
  "ANTHROPIC_BASE_URL"
]);

function createInvalidKeysFileError({ projectKeysFilePath, reason, cause }) {
  return new VasirCliError({
    code: "EVAL_KEYS_INVALID",
    message: `Eval keys file is invalid at ${projectKeysFilePath}.`,
    suggestion:
      `Fix ${path.basename(projectKeysFilePath)} so it is valid JSON with string values such as OPENAI_API_KEY and ANTHROPIC_API_KEY, or delete it and rerun the eval.`,
    context: {
      reason
    },
    docsRef: EVAL_TROUBLESHOOTING_DOCS_REF,
    cause
  });
}

export function resolveEvalEnvironmentVariables({
  currentWorkingDirectory,
  environmentVariables
}) {
  const projectPaths = buildProjectPaths({ currentWorkingDirectory });
  const projectKeysFilePath = path.join(projectPaths.projectRootDirectory, "keys.json");

  if (!fs.existsSync(projectKeysFilePath)) {
    return {
      environmentVariables,
      projectKeysFilePath,
      projectKeysLoaded: false
    };
  }

  let parsedKeysFile;
  try {
    parsedKeysFile = JSON.parse(fs.readFileSync(projectKeysFilePath, "utf8"));
  } catch (error) {
    throw createInvalidKeysFileError({
      projectKeysFilePath,
      reason: "invalid_json",
      cause: error
    });
  }

  if (!parsedKeysFile || typeof parsedKeysFile !== "object" || Array.isArray(parsedKeysFile)) {
    throw createInvalidKeysFileError({
      projectKeysFilePath,
      reason: "expected_object"
    });
  }

  const fileEnvironmentVariables = {};
  for (const supportedKey of SUPPORTED_KEYS) {
    if (!(supportedKey in parsedKeysFile)) {
      continue;
    }

    const keyValue = parsedKeysFile[supportedKey];
    if (typeof keyValue !== "string") {
      throw createInvalidKeysFileError({
        projectKeysFilePath,
        reason: `${supportedKey.toLowerCase()}_must_be_string`
      });
    }

    if (keyValue.trim().length === 0) {
      continue;
    }

    fileEnvironmentVariables[supportedKey] = keyValue.trim();
  }

  return {
    environmentVariables: {
      ...fileEnvironmentVariables,
      ...environmentVariables
    },
    projectKeysFilePath,
    projectKeysLoaded: Object.keys(fileEnvironmentVariables).length > 0
  };
}
