import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "../cli-error.js";
import { EVAL_REFERENCE_DOCS_REF, EVAL_TROUBLESHOOTING_DOCS_REF } from "../docs-ref.js";

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

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const serializedEntries = Object.keys(value)
      .sort((leftKey, rightKey) => leftKey.localeCompare(rightKey))
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`);
    return `{${serializedEntries.join(",")}}`;
  }

  return JSON.stringify(value);
}

function createSuiteHash(suiteDefinition) {
  return crypto.createHash("sha256").update(stableSerialize(suiteDefinition)).digest("hex");
}

function validateCase(caseDefinition, suiteFilePath) {
  if (!caseDefinition || typeof caseDefinition !== "object" || !caseDefinition.id || !caseDefinition.task) {
    throw new VasirCliError({
      code: "EVAL_SUITE_INVALID",
      message: `Eval suite case is invalid at ${suiteFilePath}.`,
      suggestion: "Each suite case must define at least `id` and `task`.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  if (
    Object.hasOwn(caseDefinition, "requiredSubstrings") &&
    !Array.isArray(caseDefinition.requiredSubstrings)
  ) {
    throw new VasirCliError({
      code: "EVAL_SUITE_INVALID",
      message: `Eval suite case requiredSubstrings is invalid at ${suiteFilePath}.`,
      suggestion: "Set `requiredSubstrings` to an array of strings or remove it from the case.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  if (
    Object.hasOwn(caseDefinition, "forbiddenSubstrings") &&
    !Array.isArray(caseDefinition.forbiddenSubstrings)
  ) {
    throw new VasirCliError({
      code: "EVAL_SUITE_INVALID",
      message: `Eval suite case forbiddenSubstrings is invalid at ${suiteFilePath}.`,
      suggestion: "Set `forbiddenSubstrings` to an array of strings or remove it from the case.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  const hardCheckCount =
    (Array.isArray(caseDefinition.requiredSubstrings) ? caseDefinition.requiredSubstrings.length : 0) +
    (Array.isArray(caseDefinition.forbiddenSubstrings) ? caseDefinition.forbiddenSubstrings.length : 0);

  if (hardCheckCount === 0) {
    throw new VasirCliError({
      code: "EVAL_SUITE_INVALID",
      message: `Eval suite case ${caseDefinition.id} is missing hard checks at ${suiteFilePath}.`,
      suggestion:
        "Each case must define at least one `requiredSubstrings` or `forbiddenSubstrings` entry. `judgePrompt` augments the hard floor; it does not replace it.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
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

  if (Object.hasOwn(suiteDefinition, "mode")) {
    throw new VasirCliError({
      code: "EVAL_SUITE_INVALID",
      message: `Eval suite uses an unsupported \`mode\` field at ${suiteFilePath}.`,
      suggestion:
        "Remove `mode` and use hard checks in each case, plus optional `judgePrompt` for the built-in dual-judge layer.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  if (Object.hasOwn(suiteDefinition, "judge")) {
    throw new VasirCliError({
      code: "EVAL_SUITE_INVALID",
      message: `Eval suite uses unsupported judge config at ${suiteFilePath}.`,
      suggestion:
        "Remove `judge` and add `judgePrompt` if the suite needs the built-in OpenAI + Anthropic judge layer.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  if (Object.hasOwn(suiteDefinition, "validator")) {
    throw new VasirCliError({
      code: "EVAL_SUITE_INVALID",
      message: `Eval suite uses unsupported validator config at ${suiteFilePath}.`,
      suggestion:
        "Remove `validator` and express the suite with case-level hard checks plus optional `judgePrompt`.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  if (Object.hasOwn(suiteDefinition, "judgePrompt") && typeof suiteDefinition.judgePrompt !== "string") {
    throw new VasirCliError({
      code: "EVAL_SUITE_INVALID",
      message: `Eval suite judgePrompt must be a string at ${suiteFilePath}.`,
      suggestion: "Set `judgePrompt` to a plain-language string or remove it from the suite.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  for (const caseDefinition of suiteDefinition.cases) {
    validateCase(caseDefinition, suiteFilePath);
  }
}

function buildSuiteCandidatePaths(skillSource) {
  return [
    path.join(skillSource.skillDirectoryPath, "evals", "suite.json")
  ];
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
      suiteDefinition,
      suiteHash: createSuiteHash(suiteDefinition)
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
