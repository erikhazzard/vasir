import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "../install/cli-error.js";
import { EVAL_REFERENCE_DOCS_REF, EVAL_TROUBLESHOOTING_DOCS_REF } from "../install/docs-ref.js";
import { readGlobalRegistry } from "../install/global-catalog.js";
import { buildProjectPaths } from "../install/path-layout.js";

function readSuiteFile(suiteFilePath) {
  try {
    return JSON.parse(fs.readFileSync(suiteFilePath, "utf8"));
  } catch (error) {
    throw new VasirCliError({
      code: "EVAL_SUITE_INVALID",
      message: `Eval suite is invalid at ${suiteFilePath}.`,
      suggestion: "Fix the suite file and rerun the eval.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF,
      cause: error
    });
  }
}

function validateSuiteDefinition(suiteDefinition, suiteFilePath) {
  if (!suiteDefinition || typeof suiteDefinition !== "object") {
    throw new VasirCliError({
      code: "EVAL_SUITE_INVALID",
      message: `Eval suite is invalid at ${suiteFilePath}.`,
      suggestion: "Ensure the suite JSON contains an object with `id` and `cases`.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  if (!suiteDefinition.id || !Array.isArray(suiteDefinition.cases) || suiteDefinition.cases.length === 0) {
    throw new VasirCliError({
      code: "EVAL_SUITE_INVALID",
      message: `Eval suite is missing required fields at ${suiteFilePath}.`,
      suggestion: "Ensure the suite JSON defines `id` and at least one case.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }
}

function tryResolveLocalSuite({ projectRootDirectory, skillName }) {
  const suiteFilePath = path.join(projectRootDirectory, "evals", "suites", skillName, "suite.json");
  if (!fs.existsSync(suiteFilePath)) {
    return null;
  }

  const suiteDefinition = readSuiteFile(suiteFilePath);
  validateSuiteDefinition(suiteDefinition, suiteFilePath);
  return {
    sourceType: "repo-source",
    suiteFilePath,
    suiteDefinition
  };
}

export function resolveSuiteSource({
  skillName,
  currentWorkingDirectory,
  homeDirectory,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  globalCatalogDirectory = null
}) {
  const projectPaths = buildProjectPaths({ currentWorkingDirectory });
  const localSuite = tryResolveLocalSuite({
    projectRootDirectory: projectPaths.projectRootDirectory,
    skillName
  });
  if (localSuite) {
    return localSuite;
  }

  const resolvedGlobalCatalogDirectory = globalCatalogDirectory ?? readGlobalRegistry({
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  }).globalPaths.globalCatalogDirectory;
  const suiteFilePath = path.join(resolvedGlobalCatalogDirectory, "evals", "suites", skillName, "suite.json");
  if (!fs.existsSync(suiteFilePath)) {
    throw new VasirCliError({
      code: "EVAL_SUITE_NOT_FOUND",
      message: `No built-in eval suite was found for ${skillName}.`,
      suggestion: "Add `evals/suites/<skill>/suite.json` in the repo or choose a skill that already has a built-in eval suite.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  const suiteDefinition = readSuiteFile(suiteFilePath);
  validateSuiteDefinition(suiteDefinition, suiteFilePath);
  return {
    sourceType: "global-catalog",
    suiteFilePath,
    suiteDefinition
  };
}
