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
    cases: benchmarkDefinition.schemaVersion === 2
      ? benchmarkDefinition.cases.map(({ id, task }) => ({ id, task }))
      : benchmarkDefinition.cases
  });
}

export function createBenchmarkScoringHash(benchmarkDefinition) {
  return createBenchmarkHash({
    scoring: benchmarkDefinition.scoring,
    judging: benchmarkDefinition.judging ?? null,
    ...(benchmarkDefinition.schemaVersion === 2 ? {
      judgeEvidence: benchmarkDefinition.cases.map(({ id, judgeEvidence }) => ({
        id,
        judgeEvidence: judgeEvidence ?? null
      }))
    } : {})
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

function validateScoring(scoring, benchmarkFilePath, schemaVersion = 1) {
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
    ratingScale.min !== (schemaVersion === 2 ? 1 : 0) ||
    ratingScale.max !== (schemaVersion === 2 ? 10 : 4)
  ) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: `Benchmark schemaVersion ${schemaVersion} requires a 0–100 score range and ${schemaVersion === 2 ? "1–10" : "0–4"} rating scale`,
      suggestion: "Use the rating scale defined by the selected benchmark schema version."
    });
  }

  if (!Array.isArray(gates) || (schemaVersion === 1 && gates.length === 0) || !Array.isArray(dimensions) || dimensions.length === 0) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark gates or dimensions are missing",
      suggestion: "Define at least one semantic gate and one anchored scoring dimension."
    });
  }

  if (schemaVersion === 2 && gates.length !== 0) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark schemaVersion 2 uses direct 1–10 ratings without gate caps",
      suggestion: "Set gates to an empty array; scores equal weighted ratings divided by 10."
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

  if (scoring.aggregation !== undefined) {
    const aggregation = scoring.aggregation;
    const validMethodAndCount = aggregation && (
      (aggregation.method === "majority-gates-median-dimensions-v1" &&
        Number.isInteger(aggregation.judgeCount) && aggregation.judgeCount >= 3 &&
        aggregation.judgeCount % 2 === 1) ||
      (aggregation.method === "unanimity-gates-mean-dimensions-v1" &&
        aggregation.judgeCount === 2)
    );
    if (
      !aggregation ||
      typeof aggregation !== "object" ||
      !validMethodAndCount ||
      aggregation.batchUnit !== "matched-pair"
    ) {
      failInvalidBenchmark({
        benchmarkFilePath,
        message: "Benchmark scoring aggregation contract is invalid",
        suggestion:
          "Use unanimity-gates-mean-dimensions-v1 with exactly 2 judges, or majority-gates-median-dimensions-v1 with an odd judgeCount of at least 3; batchUnit must be `matched-pair`."
      });
    }
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
      if (judging.panel.length !== 2 && (judging.panel.length < 3 || judging.panel.length % 2 === 0)) {
        failInvalidBenchmark({
          benchmarkFilePath,
          message: "A synthesis-free judge panel requires two judges for unanimity or an odd majority",
          suggestion: "Use two distinct exact model selectors with unanimity aggregation, or an odd panel of at least three."
        });
      }
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

function validateScoringJudgingAgreement({ scoring, judging, benchmarkFilePath }) {
  const aggregation = scoring?.aggregation;
  if (!aggregation) {
    if (judging?.panel?.length > 1 && judging?.synthesizer == null) {
      failInvalidBenchmark({
        benchmarkFilePath,
        message: "A synthesis-free judge panel has no deterministic aggregation contract",
        suggestion: "Define `scoring.aggregation` with the panel's exact method, judge count, and matched-pair batches."
      });
    }
    return;
  }

  if (!judging || judging.synthesizer != null || judging.panel.length !== aggregation.judgeCount) {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark scoring aggregation and judge panel disagree",
      suggestion:
        "Use a synthesis-free judging panel whose length exactly matches `scoring.aggregation.judgeCount`."
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

  if (![1, 2].includes(benchmarkDefinition.schemaVersion) || benchmarkDefinition.taskKind !== "response") {
    failInvalidBenchmark({
      benchmarkFilePath,
      message: "Benchmark schemaVersion or taskKind is unsupported",
      suggestion: "Use schemaVersion 1 (0–4 with gates) or 2 (1–10 without gates), and taskKind `response`."
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

  validateScoring(benchmarkDefinition.scoring, benchmarkFilePath, benchmarkDefinition.schemaVersion);
  validateJudging(benchmarkDefinition.judging, benchmarkFilePath);
  validateScoringJudgingAgreement({
    scoring: benchmarkDefinition.scoring,
    judging: benchmarkDefinition.judging,
    benchmarkFilePath
  });
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
