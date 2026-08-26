import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { VasirCliError } from "../cli-error.js";
import { EVAL_REFERENCE_DOCS_REF, EVAL_TROUBLESHOOTING_DOCS_REF } from "../docs-ref.js";
import { buildProjectPaths } from "../path-layout.js";
import { resolveBenchmarkConfiguration } from "./benchmark-models.js";

const DEFAULT_CATALOG_ROOT_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function failInvalidBenchmark({ benchmarkFilePath, message, suggestion }) {
  throw new VasirCliError({
    code: "EVAL_BENCHMARK_INVALID",
    message: `${message} at ${benchmarkFilePath}.`,
    suggestion,
    docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
  });
}

function readBenchmarkFile(benchmarkFilePath) {
  try {
    return JSON.parse(fs.readFileSync(benchmarkFilePath, "utf8"));
  } catch (error) {
    throw new VasirCliError({
      code: "EVAL_BENCHMARK_INVALID",
      message: `Benchmark definition is invalid at ${benchmarkFilePath}.`,
      suggestion: "Fix the benchmark JSON and rerun the eval.",
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

export function createBenchmarkHash(benchmarkDefinition) {
  return crypto.createHash("sha256").update(stableSerialize(benchmarkDefinition)).digest("hex");
}

export function createBenchmarkGenerationHash(benchmarkDefinition) {
  return createBenchmarkHash({
    schemaVersion: benchmarkDefinition.schemaVersion,
    id: benchmarkDefinition.id,
    taskKind: benchmarkDefinition.taskKind,
    outputContract: benchmarkDefinition.outputContract ?? null,
    cases: benchmarkDefinition.cases
  });
}

export function createBenchmarkScoringHash(benchmarkDefinition) {
  return createBenchmarkHash({
    scoring: benchmarkDefinition.scoring,
    judging: benchmarkDefinition.judging ?? null
  });
}

function validateUniqueIds(entries, { benchmarkFilePath, label }) {
  const ids = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || !entry.id.trim()) {
      failInvalidBenchmark({
        benchmarkFilePath,
        message: `Benchmark ${label} entry is missing a non-empty id`,
        suggestion: `Give every ${label} entry a stable string id.`
      });
    }
    if (ids.has(entry.id)) {
      failInvalidBenchmark({
        benchmarkFilePath,
        message: `Benchmark ${label} id is duplicated: ${entry.id}`,
        suggestion: `Give every ${label} entry a unique id.`
      });
    }
    ids.add(entry.id);
  }
}

function validateScoring(scoring, benchmarkFilePath) {
  if (!scoring || typeof scoring !== "object") {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark scoring contract is missing",
      suggestion: "Define an anchored scoring contract owned by the benchmark."
    });
  }

  const { scoreRange, ratingScale, gates, dimensions } = scoring;
  if (
    typeof scoring.version !== "string" ||
    !scoring.version.trim() ||
    typeof scoring.judgeInstructions !== "string" ||
    !scoring.judgeInstructions.trim()
  ) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark scoring metadata is incomplete",
      suggestion: "Define non-empty `version` and `judgeInstructions` strings."
    });
  }

  if (
    !scoreRange ||
    !Number.isFinite(scoreRange.min) ||
    !Number.isFinite(scoreRange.max) ||
    scoreRange.min >= scoreRange.max ||
    !ratingScale ||
    !Number.isInteger(ratingScale.min) ||
    !Number.isInteger(ratingScale.max) ||
    ratingScale.min >= ratingScale.max
  ) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark scoreRange or ratingScale is invalid",
      suggestion: "Define increasing numeric score bounds and increasing integer rating bounds."
    });
  }

  if (
    scoreRange.min !== 0 ||
    scoreRange.max !== 100 ||
    ratingScale.min !== 0 ||
    ratingScale.max !== 4
  ) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark schemaVersion 1 requires a 0–100 score range and 0–4 rating scale",
      suggestion: "Use scoreRange 0–100 and ratingScale 0–4 until a later schema version defines other numeric bases."
    });
  }

  if (!Array.isArray(gates) || gates.length === 0 || !Array.isArray(dimensions) || dimensions.length === 0) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark gates or dimensions are missing",
      suggestion: "Define at least one semantic gate and one anchored scoring dimension."
    });
  }

  validateUniqueIds(gates, { benchmarkFilePath, label: "gate" });
  for (const gate of gates) {
    if (
      typeof gate.criterion !== "string" ||
      !gate.criterion.trim() ||
      !Number.isFinite(gate.failureCap) ||
      gate.failureCap < scoreRange.min ||
      gate.failureCap > scoreRange.max
    ) {
      failInvalidBenchmark({
        benchmarkFilePath,
        message: `Benchmark gate is invalid: ${gate.id}`,
        suggestion: "Give every gate a criterion and a failureCap inside the score range."
      });
    }
  }

  validateUniqueIds(dimensions, { benchmarkFilePath, label: "dimension" });
  let weightTotal = 0;
  for (const dimension of dimensions) {
    const anchors = dimension.anchors;
    if (
      typeof dimension.title !== "string" ||
      !dimension.title.trim() ||
      typeof dimension.criterion !== "string" ||
      !dimension.criterion.trim() ||
      !Number.isFinite(dimension.weight) ||
      dimension.weight <= 0 ||
      !anchors ||
      typeof anchors !== "object" ||
      typeof anchors[String(ratingScale.min)] !== "string" ||
      typeof anchors[String(ratingScale.max)] !== "string"
    ) {
      failInvalidBenchmark({
        benchmarkFilePath,
        message: `Benchmark dimension is invalid: ${dimension.id}`,
        suggestion:
          "Give every dimension a title, criterion, positive weight, and text anchors at both rating bounds."
      });
    }
    weightTotal += dimension.weight;
  }

  if (Math.abs(weightTotal - 100) > Number.EPSILON) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: `Benchmark dimension weights total ${weightTotal}, not 100`,
      suggestion: "Adjust dimension weights so the numeric score has an explicit 100-point basis."
    });
  }
}

function validateJudging(judging, benchmarkFilePath) {
  if (judging === undefined) {
    return;
  }
  if (!judging || typeof judging !== "object" || !Array.isArray(judging.panel) || judging.panel.length === 0) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark judging configuration is invalid",
      suggestion: "Define `judging.panel` as a non-empty array of exact model selectors."
    });
  }

  const panelIds = new Set();
  for (const selector of judging.panel) {
    try {
      const configuration = resolveBenchmarkConfiguration(selector);
      if (panelIds.has(configuration.id)) {
        failInvalidBenchmark({
          benchmarkFilePath,
          message: `Benchmark judge is duplicated: ${configuration.id}`,
          suggestion: "Give each independent panel seat a distinct model configuration."
        });
      }
      panelIds.add(configuration.id);
    } catch (error) {
      if (error?.code === "EVAL_BENCHMARK_INVALID") {
        throw error;
      }
      failInvalidBenchmark({
        benchmarkFilePath,
        message: `Benchmark judge selector is invalid: ${String(selector)}`,
        suggestion: error?.suggestion ?? "Use an exact supported model selector with a reasoning effort."
      });
    }
  }

  if (judging.synthesizer === null || judging.synthesizer === undefined) {
    if (judging.panel.length > 1) {
      failInvalidBenchmark({
        benchmarkFilePath,
        message: "A multi-judge benchmark has no synthesis authority",
        suggestion: "Set `judging.synthesizer` to one exact model selector."
      });
    }
    return;
  }

  try {
    resolveBenchmarkConfiguration(judging.synthesizer);
  } catch (error) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: `Benchmark synthesizer selector is invalid: ${String(judging.synthesizer)}`,
      suggestion: error?.suggestion ?? "Use an exact supported model selector with a reasoning effort."
    });
  }
}

function validateBenchmarkDefinition({ benchmarkDefinition, benchmarkFilePath, benchmarkName }) {
  if (!benchmarkDefinition || typeof benchmarkDefinition !== "object") {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark definition is not an object",
      suggestion: "Define a JSON object with `id`, `taskKind`, `cases`, and `scoring`."
    });
  }

  if (benchmarkDefinition.id !== benchmarkName) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: `Benchmark id must match its requested name (${benchmarkName})`,
      suggestion: `Set the definition id to ${JSON.stringify(benchmarkName)}.`
    });
  }

  if (benchmarkDefinition.schemaVersion !== 1 || benchmarkDefinition.taskKind !== "response") {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark schemaVersion or taskKind is unsupported",
      suggestion: "Use schemaVersion 1 and taskKind `response` for the current benchmark runner."
    });
  }

  if (Object.hasOwn(benchmarkDefinition, "conditions") || Object.hasOwn(benchmarkDefinition, "treatments")) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark definition owns conditions or treatments",
      suggestion:
        "Remove condition content from the benchmark. The runner pairs this unchanged task and rubric with clean, skill, or Vasir conditions."
    });
  }

  if (!Array.isArray(benchmarkDefinition.cases) || benchmarkDefinition.cases.length === 0) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark cases are missing",
      suggestion: "Define at least one benchmark case."
    });
  }

  validateUniqueIds(benchmarkDefinition.cases, { benchmarkFilePath, label: "case" });
  for (const caseDefinition of benchmarkDefinition.cases) {
    if (typeof caseDefinition.task !== "string" || !caseDefinition.task.trim()) {
      failInvalidBenchmark({
        benchmarkFilePath,
        message: `Benchmark case is missing a task: ${caseDefinition.id}`,
        suggestion: "Give every case a non-empty task string."
      });
    }
  }

  if (
    Object.hasOwn(benchmarkDefinition, "outputContract") &&
    (typeof benchmarkDefinition.outputContract !== "string" || !benchmarkDefinition.outputContract.trim())
  ) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark outputContract is invalid",
      suggestion: "Set outputContract to a non-empty string or remove it."
    });
  }

  validateScoring(benchmarkDefinition.scoring, benchmarkFilePath);
  validateJudging(benchmarkDefinition.judging, benchmarkFilePath);
}

function isCatalogSourceRepository(directoryPath) {
  return (
    fs.existsSync(path.join(directoryPath, "registry.json")) &&
    fs.existsSync(path.join(directoryPath, "templates"))
  );
}

function buildBenchmarkCandidatePaths({ projectRootDirectory, catalogRootDirectory, benchmarkName }) {
  const candidates = [
    {
      sourceType: isCatalogSourceRepository(projectRootDirectory) ? "repo-source" : "project-local",
      benchmarkFilePath: path.join(projectRootDirectory, "benchmarks", benchmarkName, "benchmark.json")
    }
  ];

  if (path.resolve(catalogRootDirectory) !== path.resolve(projectRootDirectory)) {
    candidates.push({
      sourceType: "bundled-catalog",
      benchmarkFilePath: path.join(catalogRootDirectory, "benchmarks", benchmarkName, "benchmark.json")
    });
  }

  return candidates;
}

export function resolveBenchmarkSource({
  benchmarkName,
  currentWorkingDirectory,
  projectRootDirectory = null,
  catalogRootDirectory = DEFAULT_CATALOG_ROOT_DIRECTORY
}) {
  if (typeof benchmarkName !== "string" || !/^[a-z0-9][a-z0-9_-]*$/.test(benchmarkName)) {
    throw new VasirCliError({
      code: "EVAL_BENCHMARK_INVALID_NAME",
      message: `Invalid benchmark name: ${benchmarkName}`,
      suggestion: "Use a lowercase benchmark name containing only letters, numbers, hyphens, or underscores.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  const projectPaths = buildProjectPaths({ currentWorkingDirectory, projectRootDirectory });
  const candidates = buildBenchmarkCandidatePaths({
    projectRootDirectory: projectPaths.projectRootDirectory,
    catalogRootDirectory,
    benchmarkName
  });

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate.benchmarkFilePath)) {
      continue;
    }

    const benchmarkDefinition = readBenchmarkFile(candidate.benchmarkFilePath);
    validateBenchmarkDefinition({
      benchmarkDefinition,
      benchmarkFilePath: candidate.benchmarkFilePath,
      benchmarkName
    });

    return {
      benchmarkId: benchmarkDefinition.id,
      sourceType: candidate.sourceType,
      benchmarkDirectoryPath: path.dirname(candidate.benchmarkFilePath),
      benchmarkFilePath: candidate.benchmarkFilePath,
      benchmarkDefinition,
      benchmarkHash: createBenchmarkHash(benchmarkDefinition),
      benchmarkGenerationHash: createBenchmarkGenerationHash(benchmarkDefinition),
      benchmarkScoringHash: createBenchmarkScoringHash(benchmarkDefinition),
      projectPaths,
      catalogRootDirectory: path.resolve(catalogRootDirectory)
    };
  }

  throw new VasirCliError({
    code: "EVAL_BENCHMARK_NOT_FOUND",
    message: `Benchmark not found: ${benchmarkName}`,
    suggestion:
      "Choose a bundled benchmark or add `benchmarks/<benchmark>/benchmark.json` to the project.",
    docsRef: EVAL_REFERENCE_DOCS_REF
  });
}
