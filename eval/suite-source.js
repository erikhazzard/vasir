import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "../install/cli-error.js";
import { EVAL_REFERENCE_DOCS_REF, EVAL_TROUBLESHOOTING_DOCS_REF } from "../install/docs-ref.js";

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

function buildLegacySuiteFilePath(skillSource) {
  if (skillSource.sourceType === "global-catalog") {
    return skillSource.globalCatalogDirectory
      ? path.join(skillSource.globalCatalogDirectory, "evals", "suites", skillSource.skillName, "suite.json")
      : null;
  }

  return path.join(
    skillSource.projectPaths.projectRootDirectory,
    "evals",
    "suites",
    skillSource.skillName,
    "suite.json"
  );
}

function buildSuiteCandidatePaths(skillSource) {
  const candidatePaths = [
    path.join(skillSource.skillDirectoryPath, "evals", "suite.json")
  ];
  const legacySuiteFilePath = buildLegacySuiteFilePath(skillSource);
  if (legacySuiteFilePath && !candidatePaths.includes(legacySuiteFilePath)) {
    candidatePaths.push(legacySuiteFilePath);
  }
  return candidatePaths;
}

export function resolveSuiteSource({ skillSource }) {
  for (const suiteFilePath of buildSuiteCandidatePaths(skillSource)) {
    if (!fs.existsSync(suiteFilePath)) {
      continue;
    }

    const suiteDefinition = readSuiteFile(suiteFilePath);
    validateSuiteDefinition(suiteDefinition, suiteFilePath);
    return {
      sourceType: skillSource.sourceType,
      suiteFilePath,
      suiteDefinition
    };
  }

  throw new VasirCliError({
    code: "EVAL_SUITE_NOT_FOUND",
    message: `No built-in eval suite was found for ${skillSource.skillName}.`,
    suggestion:
      "Add `skills/<skill>/evals/suite.json` to the skill directory or choose a skill that already owns a built-in eval suite.",
    docsRef: EVAL_REFERENCE_DOCS_REF
  });
}
