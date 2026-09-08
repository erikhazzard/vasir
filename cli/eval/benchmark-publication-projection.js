import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  buildBenchmarkCatalogCategories,
  normalizeBenchmarkCatalogEntry
} from "./benchmark-catalog.js";
import { normalizeBenchmarkReportData } from "./benchmark-report.js";
import { VasirCliError } from "../cli-error.js";
import { BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF } from "../docs-ref.js";
import { buildWorkSpecPublication, validateWorkSpecPublication, validateWorkSpecTrack, WORK_SPEC_TRACK_ID } from "./work-spec-publication.js";
import { buildOverallPublication, validateOverallPublication } from "./overall-publication.js";
import { buildGamesPublication, validateGamesPublication } from "./games-publication.js";
import { buildWritingPublication, validateWritingSummary, serializeWritingModule } from "./writing-publication.js";

const TAXONOMY_PATH = path.join("benchmarks", "capability-taxonomy.json");
const PUBLIC_RESULTS_PATH = path.join("benchmarks", "public-results.json");
const EXPECTED_BENCHMARK_IDS = Object.freeze([
  "hyper-scale-chat",
  "personalized-home-feed",
  "device-telemetry"
]);
const SCORE_EDITION = "backend-architecture-panel-consensus-v2";
const SCORE_EDITION_LABEL = "Engineering v2";
const JUDGE_AGGREGATION = "unanimity-gates-mean-dimensions-v1";
const JUDGE_BATCH_UNIT = "matched-pair";
const FIXED_JUDGE_PANEL = Object.freeze([
  "codex:gpt-6-astra@xhigh",
  "claude:claude-fable-5-1@max"
]);
const PUBLIC_FAMILIES_BY_TRACK = Object.freeze({
  "backend-architecture": Object.freeze({
    id: "engineering",
    title: "Engineering",
    description:
      "Software and infrastructure work judged by the correctness, durability, and operability of the resulting system."
  })
});
const PUBLIC_CLAUDE_MODEL_LABELS = Object.freeze({
  "claude:fable": "Claude Fable 5",
  "claude:claude-fable-5-1": "Claude Fable 5.1",
  "claude:opus": "Claude Opus 5"
});
const PUBLIC_CONDITIONS = Object.freeze([
  Object.freeze({
    id: "baseline",
    sourceId: "clean",
    normalizedSourceId: "clean",
    short: "Minimal",
    label: "Minimal baseline",
    color: "#72777f",
    shape: "circle"
  }),
  Object.freeze({
    id: "skill",
    sourceId: "skill:plan__question-spec-architecture",
    normalizedSourceId: "vasir",
    short: "Architecture",
    label: "Architecture skill",
    color: "#1f6fff",
    shape: "square"
  })
]);
const EXPECTED_BENCHMARK_COUNT = EXPECTED_BENCHMARK_IDS.length;
const EXPECTED_CONDITION_COUNT = PUBLIC_CONDITIONS.length;
const PUBLIC_RESPONSES_KIND = "vasirbenchmark-public-responses";
const PUBLIC_RESPONSES_SCHEMA_VERSION = 2;
const PUBLIC_RELEASE_LABEL = "Development snapshot · September 2026";
const RESULT_BLOCKERS = Object.freeze([
  Object.freeze({
    code: "author-calibration-pending",
    message: "Author calibration is pending for all three development runs."
  }),
  Object.freeze({
    code: "panel-audit-required",
    message: "Saved judging panels require independent audit before verified claims."
  }),
  Object.freeze({
    code: "public-eligibility-unverified",
    message: "The shared public-result eligibility validator has not verified these development runs."
  })
]);
const RESULT_AVAILABILITY = Object.freeze({
  status: "development",
  verification: "unverified",
  code: "development-unverified-results",
  message: "Development results — not verified benchmark claims.",
  detail:
    "Three complete matched runs are shown for development inspection; author calibration and shared public eligibility remain pending.",
  blockers: RESULT_BLOCKERS
});
const PRIVATE_PATH_PATTERN = /(?:^|[^A-Za-z0-9_])\.agents(?:[/\\]|$)|(?:^|[^.])\.\.[/\\]|file:\/\/|(?:^|[\s"'(=>])[A-Za-z]:[/\\]|(?:^|[^A-Za-z0-9_])vasir-evals(?:[/\\]|$)/i;
// Keep the Mac home prefix case-sensitive so ordinary /users/ API routes remain publishable.
const containsPrivatePath = value => PRIVATE_PATH_PATTERN.test(value) || value.includes("/Users/");
const NONSEMANTIC_JUDGE_NOTE_PATTERN = /[\u0000\u200B\u200C\u2063]/g;
const FIXTURE_TOKEN_PATTERN = /\b(?:fake|illustrative|synthetic|simulated|fixture|mock)\b/i;
const FORBIDDEN_PUBLIC_KEYS = new Set([
  "content",
  "exactMessages",
  "outputText",
  "promptFiles",
  "rationale",
  "risks",
  "runPath",
  "sourceHref",
  "strengths",
  "synthesisReason"
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const KEBAB_IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMMUTABLE_RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const INTERNAL_LIMITATION_PATTERN = /development benchmark|uncontaminated holdout/i;

function projectionError({ code = "BENCHMARK_PUBLISH_PROJECTION_INVALID", message, suggestion, context = {} }) {
  return new VasirCliError({
    code,
    message,
    suggestion,
    docsRef: BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF,
    context: {
      stage: "projection",
      releaseId: null,
      stackName: null,
      safeRetry: code !== "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      rollback: { status: "not-needed", releaseId: null },
      ...context
    }
  });
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort((leftKey, rightKey) => leftKey.localeCompare(rightKey))
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function siteLimitations(limitations) {
  return limitations.filter((limitation) => !INTERNAL_LIMITATION_PATTERN.test(limitation));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function round(value, digits = 1) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function mean(values) {
  return values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw projectionError({
      message: `${label} must be a non-empty string.`,
      suggestion: "Repair the checked-in taxonomy, benchmark definition, or public result selection before publishing."
    });
  }
}

function assertIdentifier(value, label) {
  assertNonEmptyString(value, label);
  if (!KEBAB_IDENTIFIER_PATTERN.test(value)) {
    throw projectionError({
      message: `${label} must be a stable kebab-case identifier.`,
      suggestion: "Use lowercase letters, numbers, and single hyphens in public benchmark identifiers."
    });
  }
}

function assertExactObjectKeys(value, expectedKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw projectionError({
      message: `Public projection ${label} must be an object.`,
      suggestion: "Restore the reviewed public projection schema before publishing."
    });
  }
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(sortedExpectedKeys)) {
    throw projectionError({
      message: `Public projection ${label} contains unsupported or missing fields.`,
      suggestion: "Regenerate the projection from selected immutable evidence instead of editing public result values.",
      context: { field: label, expectedKeys: sortedExpectedKeys, actualKeys }
    });
  }
}

function assertConfigurationCohort(configurationIds, expectedConfigurationIds, {
  label,
  code = "BENCHMARK_PUBLISH_PROJECTION_INVALID",
  context = {}
}) {
  const actualIds = Array.isArray(configurationIds) ? configurationIds : [];
  const actualIdSet = new Set(actualIds);
  const expectedIds = Array.isArray(expectedConfigurationIds) ? expectedConfigurationIds : [];
  const expectedIdSet = new Set(expectedIds);
  const duplicatedConfigurationIds = actualIds.filter((configurationId, index) => (
    actualIds.indexOf(configurationId) !== index
  ));
  const missingConfigurationIds = expectedIds.filter(
    (configurationId) => !actualIdSet.has(configurationId)
  );
  const unexpectedConfigurationIds = [...actualIdSet].filter(
    (configurationId) => !expectedIdSet.has(configurationId)
  );
  if (
    expectedIds.length === 0 ||
    expectedIdSet.size !== expectedIds.length ||
    actualIds.length !== expectedIds.length ||
    duplicatedConfigurationIds.length > 0 ||
    missingConfigurationIds.length > 0 ||
    unexpectedConfigurationIds.length > 0
  ) {
    throw projectionError({
      code,
      message: `${label} does not preserve the shared ${expectedIds.length}-setting public cohort.`,
      suggestion: "Select complete runs containing the same configuration cohort for every benchmark in the score edition.",
      context: {
        expectedConfigurationCount: expectedIds.length,
        observedConfigurationCount: actualIds.length,
        missingConfigurationIds,
        unexpectedConfigurationIds,
        duplicatedConfigurationIds: [...new Set(duplicatedConfigurationIds)],
        ...context
      }
    });
  }
}

function readText({ filePath, label, readFileSyncImplementation }) {
  try {
    return readFileSyncImplementation(filePath, "utf8");
  } catch (error) {
    throw projectionError({
      message: `Cannot read ${label}: ${filePath}`,
      suggestion: "Restore the selected checked-in source or immutable benchmark run and retry.",
      context: { source: label }
    });
  }
}

function parseJson({ contents, filePath, label }) {
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw projectionError({
      message: `${label} is not valid JSON: ${filePath}`,
      suggestion: "Repair the source JSON before publishing.",
      context: { source: label }
    });
  }
}

function readJson({ filePath, label, readFileSyncImplementation }) {
  return parseJson({
    contents: readText({ filePath, label, readFileSyncImplementation }),
    filePath,
    label
  });
}

function validatePublicResultsManifest(manifest) {
  if (
    !manifest ||
    manifest.kind !== "vasirbenchmark-public-results" ||
    ![1, 2].includes(manifest.schemaVersion) ||
    !Array.isArray(manifest.selectedRuns)
  ) {
    throw projectionError({
      message: "The public result selection has an unsupported kind, schema version, or selectedRuns field.",
      suggestion: "Restore benchmarks/public-results.json schema version 1."
    });
  }
  assertExactObjectKeys(manifest, ["kind", "schemaVersion", "selectedRuns", ...(manifest.schemaVersion === 2 ? ["workSpecRun"] : [])], "selection manifest");
  if (manifest.schemaVersion === 2) assertExactObjectKeys(manifest.workSpecRun, ["benchmarkId", "runPath", "sha256"], "workSpecRun");

  const selectedBenchmarkIds = new Set();
  for (const [index, selection] of manifest.selectedRuns.entries()) {
    assertExactObjectKeys(selection, ["benchmarkId", "runPath", "sha256"], `selectedRuns[${index}]`);
    assertIdentifier(selection.benchmarkId, `selectedRuns[${index}].benchmarkId`);
    assertNonEmptyString(selection.runPath, `selectedRuns[${index}].runPath`);
    const runPathParts = selection.runPath.split("/");
    if (
      runPathParts.length !== 5 ||
      runPathParts[0] !== ".agents" ||
      runPathParts[1] !== "vasir-evals" ||
      runPathParts[2] !== selection.benchmarkId ||
      !runPathParts[3] ||
      runPathParts[3] === "." ||
      runPathParts[3] === ".." ||
      runPathParts[4] !== "run.json"
    ) {
      throw projectionError({
        message: `selectedRuns[${index}].runPath is outside the standard immutable benchmark history root.`,
        suggestion: "Select .agents/vasir-evals/<benchmark-id>/<run-id>/run.json with its exact digest."
      });
    }
    if (selectedBenchmarkIds.has(selection.benchmarkId)) {
      throw projectionError({
        message: `A benchmark is selected more than once: ${selection.benchmarkId}`,
        suggestion: "Promote exactly one immutable development artifact per benchmark."
      });
    }
    selectedBenchmarkIds.add(selection.benchmarkId);
    if (!SHA256_PATTERN.test(selection.sha256 ?? "")) {
      throw projectionError({
        message: `selectedRuns[${index}].sha256 must be a lowercase SHA-256 digest.`,
        suggestion: "Record the exact immutable run.json SHA-256 before selecting it for publication."
      });
    }
  }

  if (
    manifest.selectedRuns.length !== EXPECTED_BENCHMARK_IDS.length ||
    EXPECTED_BENCHMARK_IDS.some((benchmarkId) => !selectedBenchmarkIds.has(benchmarkId))
  ) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: "The development snapshot must select exactly one immutable run for each current public benchmark.",
      suggestion: "Select the reviewed hyper-scale chat, personalized home feed, and device telemetry runs together.",
      context: { selectedBenchmarkIds: [...selectedBenchmarkIds] }
    });
  }
  return manifest;
}

function validateTaxonomy(taxonomy) {
  const workflowTracks = taxonomy?.categories?.filter(track => track.id === WORK_SPEC_TRACK_ID) ?? [];
  if (workflowTracks.length > 0) {
    if (workflowTracks.length !== 1) throw projectionError({ message: "The work-spec taxonomy track is duplicated.", suggestion: "Declare one primary work-spec track." });
    validateWorkSpecTrack(workflowTracks[0]);
    validateEngineeringTaxonomy({ ...taxonomy, categories: taxonomy.categories.filter(track => track.id !== WORK_SPEC_TRACK_ID) });
    return taxonomy;
  }
  return validateEngineeringTaxonomy(taxonomy);
}

function validateEngineeringTaxonomy(taxonomy) {
  if (
    !taxonomy ||
    taxonomy.schemaVersion !== 3 ||
    typeof taxonomy.version !== "string" ||
    !taxonomy.version.trim() ||
    typeof taxonomy.status !== "string" ||
    !taxonomy.status.trim() ||
    !Array.isArray(taxonomy.categories) ||
    taxonomy.categories.length !== 1
  ) {
    throw projectionError({
      message: "The public capability taxonomy must contain the one supported Backend Architecture track.",
      suggestion: "Repair benchmarks/capability-taxonomy.json before publishing."
    });
  }
  const benchmarkIds = new Set();
  for (const track of taxonomy.categories) {
    assertIdentifier(track?.id, "taxonomy category id");
    assertNonEmptyString(track.title, `taxonomy category ${track.id} title`);
    assertNonEmptyString(track.description, `taxonomy category ${track.id} description`);
    if (!PUBLIC_FAMILIES_BY_TRACK[track.id]) {
      throw projectionError({
        message: `Taxonomy track has no reviewed public job-family mapping: ${track.id}`,
        suggestion: "Add and review the track's primary job family before publishing it."
      });
    }
    if (
      !Array.isArray(track.benchmarkIds) ||
      track.benchmarkIds.length !== EXPECTED_BENCHMARK_IDS.length ||
      track.modelScore?.label !== SCORE_EDITION_LABEL ||
      track.modelScore?.edition !== SCORE_EDITION ||
      track.modelScore?.method !== "equal-benchmark-absolute-mean-v1" ||
      track.modelScore?.benchmarkWeighting !== "equal" ||
      track.modelScore?.scaleMaximum !== 100 ||
      stableSerialize(track.modelScore?.judging?.panel) !== stableSerialize(FIXED_JUDGE_PANEL) ||
      track.modelScore?.judging?.judgeCount !== FIXED_JUDGE_PANEL.length ||
      track.modelScore?.judging?.batchUnit !== JUDGE_BATCH_UNIT ||
      track.modelScore?.judging?.aggregation !== JUDGE_AGGREGATION ||
      track.modelScore?.judging?.synthesizer !== null ||
      track.effect?.method !== "paired-absolute-delta-v1" ||
      track.effect?.benchmarkWeighting !== "equal" ||
      track.effect?.unit !== "rubric-points" ||
      track.uncertainty?.status !== "not-estimated" ||
      typeof track.uncertainty?.reason !== "string" ||
      !track.uncertainty.reason.trim()
    ) {
      throw projectionError({
        message: `Taxonomy track ${track.id} does not preserve the fixed Engineering v2 score contract.`,
        suggestion: "Restore the two-judge matched-pair scorer, equal-task mean, paired uplift, and uncertainty declaration."
      });
    }
    for (const benchmarkId of track.benchmarkIds) {
      assertIdentifier(benchmarkId, `taxonomy benchmark id in ${track.id}`);
      if (benchmarkIds.has(benchmarkId)) {
        throw projectionError({
          message: `A benchmark is mapped more than once in the public taxonomy: ${benchmarkId}`,
          suggestion: "Give every benchmark exactly one primary public track."
        });
      }
      benchmarkIds.add(benchmarkId);
    }
  }
  if (EXPECTED_BENCHMARK_IDS.some((benchmarkId) => !benchmarkIds.has(benchmarkId))) {
    throw projectionError({
      message: "The public taxonomy does not map the exact three selected development benchmarks.",
      suggestion: "Restore the reviewed Backend Architecture benchmark mapping."
    });
  }
  return taxonomy;
}

function validateBenchmarkDefinition(definition, { benchmarkId }) {
  if (!definition || definition.schemaVersion !== 1 || definition.id !== benchmarkId) {
    throw projectionError({
      message: `Benchmark definition identity is invalid: ${benchmarkId}`,
      suggestion: "Restore a schema-version 1 definition whose id matches its benchmark directory."
    });
  }
  assertNonEmptyString(definition.title, `${benchmarkId}.title`);
  assertNonEmptyString(definition.description, `${benchmarkId}.description`);
  assertNonEmptyString(definition.taskKind, `${benchmarkId}.taskKind`);
  if (!Array.isArray(definition.cases) || definition.cases.length !== 1) {
    throw projectionError({
      message: `Benchmark ${benchmarkId} must expose exactly one public task.`,
      suggestion: "Design multi-case public report routing before adding another case."
    });
  }
  assertIdentifier(definition.cases[0]?.id, `${benchmarkId}.cases[0].id`);
  assertNonEmptyString(definition.cases[0]?.task, `${benchmarkId}.cases[0].task`);
  if (
    !Array.isArray(definition.limitations) ||
    definition.limitations.length === 0 ||
    definition.limitations.some((limitation) => typeof limitation !== "string" || !limitation.trim())
  ) {
    throw projectionError({
      message: `Benchmark ${benchmarkId} must expose at least one non-empty limitation.`,
      suggestion: "State the benchmark's current evidence boundary before publishing its definition."
    });
  }
  if (
    !definition.judging ||
    !Array.isArray(definition.judging.panel) ||
    stableSerialize(definition.judging.panel) !== stableSerialize(FIXED_JUDGE_PANEL) ||
    definition.judging.synthesizer !== null ||
    definition.scoring?.version !== `${benchmarkId}-rubric-v3` ||
    definition.scoring?.kind !== "anchored-llm" ||
    definition.scoring?.aggregation?.method !== JUDGE_AGGREGATION ||
    definition.scoring?.aggregation?.judgeCount !== FIXED_JUDGE_PANEL.length ||
    definition.scoring?.aggregation?.batchUnit !== JUDGE_BATCH_UNIT
  ) {
    throw projectionError({
      message: `Benchmark ${benchmarkId} has an invalid Engineering v2 scoring configuration.`,
      suggestion: "Use the fixed two-judge panel, matched-pair batches, unanimous gates, mean dimension ratings, and no synthesizer."
    });
  }
  return definition;
}

function readSelectedRun({ repoRootDirectory, selection, readFileSyncImplementation }) {
  const filePath = path.resolve(repoRootDirectory, selection.runPath);
  const evidenceRoot = `${path.resolve(repoRootDirectory, ".agents", "vasir-evals")}${path.sep}`;
  if (!filePath.startsWith(evidenceRoot)) {
    throw projectionError({
      message: `Selected evidence escaped the immutable history root: ${selection.benchmarkId}`,
      suggestion: "Use the standard checked-in selection path without traversal segments."
    });
  }
  const label = `selected immutable run ${selection.benchmarkId}`;
  const contents = readText({ filePath, label, readFileSyncImplementation });
  const observedSha256 = sha256(contents);
  if (observedSha256 !== selection.sha256) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: `Selected benchmark evidence changed after review: ${selection.benchmarkId}`,
      suggestion: "Stop, inspect the immutable run, and update selection only after reviewing its new exact digest.",
      context: {
        benchmarkId: selection.benchmarkId,
        expectedSha256: selection.sha256,
        observedSha256
      }
    });
  }
  const run = parseJson({ contents, filePath, label });
  const expectedRunId = selection.runPath.split("/")[3];
  const observedBenchmarkId = run?.benchmark?.id ?? run?.benchmarkName;
  if (
    run?.kind !== "benchmark" ||
    run?.schemaVersion !== 1 ||
    run?.runId !== expectedRunId ||
    observedBenchmarkId !== selection.benchmarkId
  ) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: `Selected benchmark evidence identity is invalid: ${selection.benchmarkId}`,
      suggestion: "Select a schema-version 1 run whose benchmark and run ids match its immutable path.",
      context: { benchmarkId: selection.benchmarkId }
    });
  }
  return { run, observedSha256 };
}

function createCatalogSelection(benchmarkId, run) {
  const record = {
    benchmarkName: benchmarkId,
    runDirectoryPath: "",
    runFilePath: "",
    reportFilePath: "",
    run
  };
  return { benchmarkId, featured: record, latest: record };
}

function publicSettingId(configurationId) {
  return String(configurationId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicConditionFromNormalizedId(conditionId) {
  const condition = PUBLIC_CONDITIONS.find((candidate) => (
    candidate.normalizedSourceId === conditionId ||
    (candidate.id === "skill" && conditionId === "treatment")
  ));
  if (!condition) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: `Selected evidence contains an unsupported condition: ${conditionId}`,
      suggestion: "Use one clean baseline and the exact Architecture skill condition."
    });
  }
  return condition;
}

function publicConditionFromSourceId(conditionId) {
  const condition = PUBLIC_CONDITIONS.find((candidate) => candidate.sourceId === conditionId);
  if (!condition) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: `Selected evidence contains an unsupported raw response condition: ${conditionId}`,
      suggestion: "Use one clean baseline and the exact Architecture skill condition."
    });
  }
  return condition;
}

function cloneBlockers() {
  return RESULT_BLOCKERS.map((blocker) => ({ ...blocker }));
}

function cloneAvailability() {
  return {
    status: RESULT_AVAILABILITY.status,
    verification: RESULT_AVAILABILITY.verification,
    code: RESULT_AVAILABILITY.code,
    message: RESULT_AVAILABILITY.message,
    detail: RESULT_AVAILABILITY.detail,
    blockers: cloneBlockers()
  };
}

function assertFiniteMetric(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: `Selected evidence has an incomplete ${label}.`,
      suggestion: "Select complete runs with recorded latency and token usage for every response."
    });
  }
  return value;
}

function createMetrics(rows) {
  if (rows.length === 0) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: "Selected evidence cannot produce an empty resource-metric aggregate.",
      suggestion: "Select complete matched benchmark rows."
    });
  }
  const latencyValues = rows.map((row) => assertFiniteMetric(row.durationMs, "response latency"));
  const inputTokenValues = rows.map((row) => assertFiniteMetric(row.usage?.inputTokens, "input-token count"));
  const outputTokenValues = rows.map((row) => assertFiniteMetric(row.usage?.outputTokens, "output-token count"));
  const totalTokenValues = rows.map((row) => assertFiniteMetric(row.usage?.totalTokens, "total-token count"));
  return {
    sampleCount: rows.length,
    meanLatencyMs: round(mean(latencyValues), 1),
    meanInputTokens: round(mean(inputTokenValues), 1),
    meanOutputTokens: round(mean(outputTokenValues), 1),
    meanTotalTokens: round(mean(totalTokenValues), 1),
    // Provider cost coverage is incomplete across the shared cohort, so the
    // public comparison must not imply a like-for-like cost axis.
    costUsd: null
  };
}

function legacyMetrics(metrics) {
  return {
    cost: metrics.costUsd,
    latency: round(metrics.meanLatencyMs / 1000, 3),
    tokens: round(metrics.meanOutputTokens, 1)
  };
}

function createReportRowLookup(report) {
  return new Map(report.rows.map((row) => [`${row.configurationId}\u0000${row.conditionId}`, row]));
}

function readFullRescoreScope(run, benchmarkId, expectedResponseCount) {
  const scope = run?.rescoreScope ?? run?.judging?.rescoreScope;
  if (
    scope?.strategy !== "saved-responses-full-rescore-v1" ||
    typeof scope.sourceRunId !== "string" || !scope.sourceRunId.trim() ||
    !Number.isInteger(scope.rowCount) || scope.rowCount !== expectedResponseCount ||
    scope.generationReused !== true ||
    scope.sourceScoresPreserved !== false
  ) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: `Selected run does not contain the complete Engineering v2 rescore: ${benchmarkId}`,
      suggestion: "Rescore every saved response with the fixed two-judge panel, then select that immutable run."
    });
  }
  return {
    strategy: scope.strategy,
    responseCount: scope.rowCount,
    generationReused: true,
    sourceScoresPreserved: false
  };
}

function appendLineageError({ benchmarkId, runId, reason }) {
  return projectionError({
    code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
    message: `Selected append-only run does not preserve an auditable Engineering v2 lineage: ${benchmarkId}`,
    suggestion: "Select an untampered append-only run whose incumbent rows exactly match its immutable source and whose lineage ends at a complete Engineering v2 full rescore.",
    context: { benchmarkId, runId, reason }
  });
}

function readAppendSourceRun({
  repoRootDirectory,
  benchmarkId,
  sourceRunId,
  readFileSyncImplementation
}) {
  if (!IMMUTABLE_RUN_ID_PATTERN.test(sourceRunId ?? "")) {
    throw appendLineageError({
      benchmarkId,
      runId: sourceRunId ?? null,
      reason: "invalid-source-run-id"
    });
  }
  const sourceRunPath = path.resolve(
    repoRootDirectory,
    ".agents",
    "vasir-evals",
    benchmarkId,
    sourceRunId,
    "run.json"
  );
  const benchmarkHistoryRoot = `${path.resolve(
    repoRootDirectory,
    ".agents",
    "vasir-evals",
    benchmarkId
  )}${path.sep}`;
  if (!sourceRunPath.startsWith(benchmarkHistoryRoot)) {
    throw appendLineageError({
      benchmarkId,
      runId: sourceRunId,
      reason: "source-run-path-escaped-history"
    });
  }
  const sourceRun = readJson({
    filePath: sourceRunPath,
    label: `append-only source run ${benchmarkId}/${sourceRunId}`,
    readFileSyncImplementation
  });
  if (
    sourceRun?.kind !== "benchmark" ||
    sourceRun?.schemaVersion !== 1 ||
    sourceRun?.runId !== sourceRunId ||
    (sourceRun?.benchmark?.id ?? sourceRun?.benchmarkName) !== benchmarkId
  ) {
    throw appendLineageError({
      benchmarkId,
      runId: sourceRunId,
      reason: "source-run-identity-mismatch"
    });
  }
  return sourceRun;
}

function appendContract(run) {
  return {
    benchmark: run?.benchmark,
    harnessVersion: run?.harnessVersion,
    scorerVersion: run?.scorerVersion,
    treatment: run?.treatment,
    conditions: run?.conditions,
    generation: {
      trialCount: run?.generation?.trialCount,
      neutralHarnessInstruction: run?.generation?.neutralHarnessInstruction,
      freshAgentSessions: run?.generation?.freshAgentSessions
    },
    judging: {
      strategy: run?.judging?.strategy,
      judgeConfigurations: run?.judging?.judgeConfigurations,
      synthesizerConfiguration: run?.judging?.synthesizerConfiguration,
      calibrationStatus: run?.judging?.calibrationStatus,
      batchPlanVersion: run?.judging?.batchPlan?.version
    }
  };
}

function indexedUniqueValues(values, keyForValue) {
  const byKey = new Map();
  for (const value of values) {
    const key = keyForValue(value);
    if (typeof key !== "string" || !key || byKey.has(key)) return null;
    byKey.set(key, value);
  }
  return byKey;
}

function validateAppendEdge({ run, sourceRun, benchmarkId, scope }) {
  const sourceRows = Array.isArray(sourceRun?.rows) ? sourceRun.rows : [];
  const combinedRows = Array.isArray(run?.rows) ? run.rows : [];
  const sourceConfigurations = Array.isArray(sourceRun?.configurations)
    ? sourceRun.configurations
    : [];
  const combinedConfigurations = Array.isArray(run?.configurations)
    ? run.configurations
    : [];
  const declaredAddedConfigurationIds = run?.extension?.extendedConfigurationIds;
  const sourceRowsByKey = indexedUniqueValues(sourceRows, (row) => row?.rowKey);
  const combinedRowsByKey = indexedUniqueValues(combinedRows, (row) => row?.rowKey);
  const sourceConfigurationsById = indexedUniqueValues(
    sourceConfigurations,
    (configuration) => configuration?.id
  );
  const combinedConfigurationsById = indexedUniqueValues(
    combinedConfigurations,
    (configuration) => configuration?.id
  );
  const declaredAddedIdSet = Array.isArray(declaredAddedConfigurationIds)
    ? new Set(declaredAddedConfigurationIds)
    : null;
  const actualAddedConfigurations = combinedConfigurations.filter(
    (configuration) => !sourceConfigurationsById?.has(configuration?.id)
  );
  const actualAddedConfigurationIds = actualAddedConfigurations.map(
    (configuration) => configuration.id
  );
  const appendedRows = combinedRows.filter((row) => !sourceRowsByKey?.has(row?.rowKey));
  const appendedRowConfigurationIds = new Set(appendedRows.map((row) => row?.configurationId));
  const contractsMatch = stableSerialize(appendContract(run)) === stableSerialize(appendContract(sourceRun));
  const sourceRowsPreserved = sourceRowsByKey !== null && combinedRowsByKey !== null && sourceRows.every((sourceRow) => {
    const combinedRow = combinedRowsByKey.get(sourceRow.rowKey);
    return (
      SHA256_PATTERN.test(sourceRow.basisHash ?? "") &&
      SHA256_PATTERN.test(sourceRow.scoreBasisHash ?? "") &&
      Number.isFinite(sourceRow.score?.total) &&
      stableSerialize(combinedRow) === stableSerialize(sourceRow)
    );
  });
  const configurationsPreserved = (
    sourceConfigurationsById !== null &&
    combinedConfigurationsById !== null &&
    sourceConfigurations.every((sourceConfiguration) => (
      stableSerialize(combinedConfigurationsById.get(sourceConfiguration.id)) ===
      stableSerialize(sourceConfiguration)
    ))
  );
  const declaredAddedConfigurationsMatch = (
    declaredAddedIdSet !== null &&
    declaredAddedIdSet.size === declaredAddedConfigurationIds.length &&
    declaredAddedIdSet.size === actualAddedConfigurationIds.length &&
    actualAddedConfigurationIds.every((configurationId) => declaredAddedIdSet.has(configurationId)) &&
    appendedRowConfigurationIds.size === declaredAddedIdSet.size &&
    [...appendedRowConfigurationIds].every((configurationId) => declaredAddedIdSet.has(configurationId))
  );
  const appendedRowsAreScored = appendedRows.every((row) => (
    row?.rowStatus === "complete" &&
    Number.isFinite(row?.score?.total) &&
    SHA256_PATTERN.test(row?.basisHash ?? "") &&
    SHA256_PATTERN.test(row?.scoreBasisHash ?? "")
  ));

  let reason = null;
  if (sourceRun?.runStatus !== "complete" || sourceRun?.judging?.status !== "complete") {
    reason = "source-run-incomplete";
  } else if (!contractsMatch) {
    reason = "source-contract-mismatch";
  } else if (!sourceRowsPreserved) {
    reason = "incumbent-row-mismatch";
  } else if (!configurationsPreserved) {
    reason = "incumbent-configuration-mismatch";
  } else if (!declaredAddedConfigurationsMatch) {
    reason = "appended-configuration-mismatch";
  } else if (!appendedRowsAreScored) {
    reason = "appended-row-incomplete";
  } else if (
    scope.sourceRunId !== run?.extension?.sourceRunId ||
    scope.sourceRowCount !== run?.extension?.sourceRowCount ||
    scope.sourceRowCount !== sourceRows.length ||
    scope.appendedRowCount !== appendedRows.length ||
    scope.combinedRowCount !== combinedRows.length ||
    scope.combinedRowCount !== scope.sourceRowCount + scope.appendedRowCount ||
    scope.sourceScoresPreserved !== true ||
    scope.sourceJudgingStatus !== sourceRun.judging.status ||
    !SHA256_PATTERN.test(scope.sourceJudgingBasisHash ?? "") ||
    scope.sourceJudgingBasisHash !== sourceRun.judging.basisHash
  ) {
    reason = "extension-claim-mismatch";
  }
  if (reason) {
    throw appendLineageError({ benchmarkId, runId: run?.runId ?? null, reason });
  }
}

function readEngineeringV2JudgingScope({
  run,
  benchmarkId,
  expectedResponseCount,
  repoRootDirectory,
  readFileSyncImplementation,
  judgmentSources,
  visitedRunIds = new Set()
}) {
  if (visitedRunIds.has(run?.runId)) {
    throw appendLineageError({
      benchmarkId,
      runId: run?.runId ?? null,
      reason: "lineage-cycle"
    });
  }
  visitedRunIds.add(run.runId);

  const fullRescoreScope = run?.rescoreScope ?? run?.judging?.rescoreScope;
  if (fullRescoreScope !== null && fullRescoreScope !== undefined) {
    const scope = readFullRescoreScope(run, benchmarkId, expectedResponseCount);
    judgmentSources.push({ run, rows: run.rows });
    return scope;
  }

  const scope = run?.extension?.judgingScope;
  if (
    scope?.strategy !== "appended-rows-only-v1" ||
    stableSerialize(scope) !== stableSerialize(run?.judging?.extensionScope) ||
    !Number.isInteger(scope.sourceRowCount) || scope.sourceRowCount <= 0 ||
    !Number.isInteger(scope.appendedRowCount) || scope.appendedRowCount <= 0 ||
    !Number.isInteger(scope.combinedRowCount) || scope.combinedRowCount !== expectedResponseCount
  ) {
    throw appendLineageError({
      benchmarkId,
      runId: run?.runId ?? null,
      reason: "invalid-extension-scope"
    });
  }
  const sourceRun = readAppendSourceRun({
    repoRootDirectory,
    benchmarkId,
    sourceRunId: scope.sourceRunId,
    readFileSyncImplementation
  });
  validateAppendEdge({ run, sourceRun, benchmarkId, scope });
  readEngineeringV2JudgingScope({
    run: sourceRun,
    benchmarkId,
    expectedResponseCount: sourceRun.rows.length,
    repoRootDirectory,
    readFileSyncImplementation,
    judgmentSources,
    visitedRunIds
  });
  // Append runs judge only their new rows. Keep each judgment tied to the
  // immutable run that owns its reviewer identity and score evidence.
  const inheritedRowKeys = new Set(sourceRun.rows.map((row) => row.rowKey));
  judgmentSources.push({
    run,
    rows: run.rows.filter((row) => !inheritedRowKeys.has(row.rowKey))
  });
  return {
    strategy: scope.strategy,
    incumbentResponseCount: scope.sourceRowCount,
    appendedResponseCount: scope.appendedRowCount,
    combinedResponseCount: scope.combinedRowCount,
    incumbentScoresPreserved: true
  };
}

function readCompleteRow(rowLookup, configurationId, conditionId, benchmarkId) {
  const row = rowLookup.get(`${configurationId}\u0000${conditionId}`);
  if (!row || row.status !== "complete" || !Number.isFinite(row.score)) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: `Selected evidence is missing a complete scored response for ${benchmarkId}.`,
      suggestion: "Select a complete run with one scored row per configuration and condition.",
      context: { benchmarkId, configurationId, conditionId }
    });
  }
  return row;
}

function createProjectionSources({
  selections,
  taxonomy,
  definitions,
  repoRootDirectory,
  readFileSyncImplementation
}) {
  const runRecords = new Map();
  const catalogEntries = [];
  let expectedConfigurationIds = null;
  for (const selection of selections) {
    const definition = definitions.get(selection.benchmarkId);
    if (stableSerialize(selection.run?.benchmark?.definition) !== stableSerialize(definition)) {
      throw projectionError({
        code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
        message: `Selected evidence was generated from a different benchmark definition: ${selection.benchmarkId}`,
        suggestion: "Select a run whose embedded task, judging, scoring, and limitations exactly match the current public definition.",
        context: { benchmarkId: selection.benchmarkId, runId: selection.run.runId }
      });
    }
    const normalized = normalizeBenchmarkCatalogEntry(
      createCatalogSelection(selection.benchmarkId, selection.run)
    );
    const report = normalizeBenchmarkReportData(selection.run);
    if (expectedConfigurationIds === null) {
      expectedConfigurationIds = [...normalized.compatibility.configurationIds];
    }
    assertConfigurationCohort(normalized.compatibility.configurationIds, expectedConfigurationIds, {
      label: `Selected run ${selection.benchmarkId}`,
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      context: { benchmarkId: selection.benchmarkId, runId: selection.run.runId }
    });
    assertConfigurationCohort(
      normalized.configurationScores.map((score) => score.configurationId),
      expectedConfigurationIds,
      {
        label: `Selected scored matrix ${selection.benchmarkId}`,
        code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
        context: { benchmarkId: selection.benchmarkId, runId: selection.run.runId }
      }
    );
    assertConfigurationCohort(
      [...new Set(report.rows.map((row) => row.configurationId))],
      expectedConfigurationIds,
      {
        label: `Selected response matrix ${selection.benchmarkId}`,
        code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
        context: { benchmarkId: selection.benchmarkId, runId: selection.run.runId }
      }
    );
    const expectedConfigurationCount = expectedConfigurationIds.length;
    const expectedResultEntryCount = expectedConfigurationCount * EXPECTED_CONDITION_COUNT;
    if (
      normalized.featuredStatus !== "complete" ||
      normalized.calibrationStatus !== "Pending" ||
      normalized.completedRowCount !== expectedResultEntryCount ||
      normalized.expectedRowCount !== expectedResultEntryCount ||
      normalized.matchedPairCount !== expectedConfigurationCount ||
      normalized.expectedMatchedPairCount !== expectedConfigurationCount ||
      normalized.configurationScores.length !== expectedConfigurationCount ||
      report.source.matrixComplete !== true ||
      report.rows.length !== expectedResultEntryCount
    ) {
      throw projectionError({
        code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
        message: `Selected development evidence does not preserve the complete ${expectedConfigurationCount}-pair matrix: ${selection.benchmarkId}`,
        suggestion: "Select the reviewed complete featured run for every benchmark.",
        context: { benchmarkId: selection.benchmarkId, runId: selection.run.runId }
      });
    }
    const rawConditions = new Set(report.rows.map((row) => row.rawCondition));
    if (
      rawConditions.size !== PUBLIC_CONDITIONS.length ||
      PUBLIC_CONDITIONS.some((condition) => !rawConditions.has(condition.sourceId))
    ) {
      throw projectionError({
        code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
        message: `Selected development evidence has a different condition contract: ${selection.benchmarkId}`,
        suggestion: "Select runs comparing the clean baseline with the exact Architecture skill snapshot."
      });
    }
    catalogEntries.push(normalized);
    const judgmentSources = [];
    runRecords.set(selection.benchmarkId, {
      run: selection.run,
      normalized,
      report,
      rowLookup: createReportRowLookup(report),
      definition,
      judgmentSources,
      judgingScope: readEngineeringV2JudgingScope({
        run: selection.run,
        benchmarkId: selection.benchmarkId,
        expectedResponseCount: expectedResultEntryCount,
        repoRootDirectory,
        readFileSyncImplementation,
        judgmentSources
      })
    });
  }

  const categories = buildBenchmarkCatalogCategories(catalogEntries, taxonomy);
  const category = categories[0];
  const expectedConfigurationCount = expectedConfigurationIds?.length ?? 0;
  const expectedResultEntryCount = expectedConfigurationCount * EXPECTED_CONDITION_COUNT;
  if (category) {
    assertConfigurationCohort(
      category.modelScores.map((score) => score.configurationId),
      expectedConfigurationIds,
      {
        label: "Selected absolute-score category",
        code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE"
      }
    );
    assertConfigurationCohort(
      [...new Set(category.modelRuns.map((modelRun) => modelRun.configurationId))],
      expectedConfigurationIds,
      {
        label: "Selected absolute-score category runs",
        code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE"
      }
    );
  }
  if (
    categories.length !== 1 ||
    category?.id !== "backend-architecture" ||
    category.problems.length !== 0 ||
    category.modelScoreProblems.length !== 0 ||
    category.modelScores.length !== expectedConfigurationCount ||
    category.modelRuns.length !== expectedResultEntryCount ||
    category.calibrationStatus !== "Provisional"
  ) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: `Selected development runs cannot form one compatible ${expectedConfigurationCount}-configuration absolute-score category.`,
      suggestion: "Select runs with the same model matrix, condition contract, treatment snapshot, and judging basis.",
      context: {
        categoryProblems: category?.problems ?? ["category unavailable"],
        modelScoreProblems: category?.modelScoreProblems ?? ["model scores unavailable"]
      }
    });
  }
  return { runRecords, category, configurationIds: expectedConfigurationIds };
}

function createScoreContractHash({ trackDefinition, definitions }) {
  return sha256(stableSerialize({
    label: trackDefinition.modelScore.label,
    edition: trackDefinition.modelScore.edition,
    method: trackDefinition.modelScore.method,
    benchmarkWeighting: trackDefinition.modelScore.benchmarkWeighting,
    scaleMaximum: trackDefinition.modelScore.scaleMaximum,
    judging: trackDefinition.modelScore.judging,
    effect: trackDefinition.effect,
    uncertainty: trackDefinition.uncertainty,
    benchmarks: trackDefinition.benchmarkIds.map((benchmarkId) => {
      const definition = definitions.get(benchmarkId);
      return {
        id: definition.id,
        taskKind: definition.taskKind,
        outputContract: definition.outputContract,
        cases: definition.cases,
        scoring: definition.scoring,
        judging: definition.judging
      };
    })
  }));
}

function createPresentationProjection({ taxonomy, definitions, runRecords, category }) {
  const trackDefinition = taxonomy.categories[0];
  const familyDefinition = PUBLIC_FAMILIES_BY_TRACK[trackDefinition.id];
  const scoreContractHash = createScoreContractHash({ trackDefinition, definitions });
  const configurationCount = category.modelScores.length;
  const resultEntryCount = configurationCount * PUBLIC_CONDITIONS.length;
  const responseCount = resultEntryCount * trackDefinition.benchmarkIds.length;
  const settingsByConfigurationId = new Map();
  const settingIds = new Set();
  const combinedMetrics = new Map();

  for (const score of category.modelScores) {
    const settingId = publicSettingId(score.configurationId);
    if (!settingId || settingIds.has(settingId)) {
      throw projectionError({
        message: `Public setting identity is empty or duplicated: ${score.configurationId}`,
        suggestion: "Use configuration ids that remain unique after safe public slugging."
      });
    }
    settingIds.add(settingId);
    settingsByConfigurationId.set(score.configurationId, { settingId, score });
    for (const condition of PUBLIC_CONDITIONS) {
      const rows = EXPECTED_BENCHMARK_IDS.map((benchmarkId) => {
        const record = runRecords.get(benchmarkId);
        return readCompleteRow(
          record.rowLookup,
          score.configurationId,
          condition.normalizedSourceId,
          benchmarkId
        );
      });
      combinedMetrics.set(`${score.configurationId}\u0000${condition.id}`, createMetrics(rows));
    }
  }

  const categories = [{
    id: familyDefinition.id,
    name: familyDefinition.title,
    title: familyDefinition.title,
    short: "ENG",
    weight: 1,
    color: "#007f99",
    trackIds: [trackDefinition.id]
  }];
  const conditions = PUBLIC_CONDITIONS.map((condition) => ({
    id: condition.id,
    sourceId: condition.sourceId,
    short: condition.short,
    label: condition.label,
    color: condition.color,
    shape: condition.shape
  }));

  const settings = category.modelScores
    .map((score) => {
      const { settingId } = settingsByConfigurationId.get(score.configurationId);
      const baselineMetrics = combinedMetrics.get(`${score.configurationId}\u0000baseline`);
      const skillMetrics = combinedMetrics.get(`${score.configurationId}\u0000skill`);
      return {
        id: settingId,
        configurationId: score.configurationId,
        modelId: score.modelId,
        provider: score.provider,
        family: score.modelLabel,
        reasoning: score.reasoningEffort,
        label: score.configurationLabel,
        scores: {
          baseline: score.baselineScore,
          skill: score.skillScore
        },
        deltas: {
          skill: score.upliftPoints
        },
        categories: {
          baseline: [{ category: familyDefinition.id, score: score.baselineScore }],
          skill: [{ category: familyDefinition.id, score: score.skillScore }]
        },
        metrics: {
          baseline: { ...baselineMetrics },
          skill: { ...skillMetrics }
        }
      };
    })
    .sort((left, right) => (
      right.scores.skill - left.scores.skill ||
      right.scores.baseline - left.scores.baseline ||
      left.configurationId.localeCompare(right.configurationId)
    ));

  const entries = category.modelRuns.map((modelRun) => {
    const condition = publicConditionFromNormalizedId(modelRun.conditionId);
    const { settingId } = settingsByConfigurationId.get(modelRun.configurationId);
    const metrics = combinedMetrics.get(`${modelRun.configurationId}\u0000${condition.id}`);
    const aliases = legacyMetrics(metrics);
    return {
      id: `${settingId}-${condition.id}`,
      settingId,
      configurationId: modelRun.configurationId,
      modelId: modelRun.modelId,
      provider: modelRun.provider,
      family: modelRun.modelLabel,
      reasoning: modelRun.reasoningEffort,
      label: modelRun.configurationLabel,
      condition: condition.id,
      conditionLabel: condition.label,
      score: modelRun.score,
      baselineScore: modelRun.baselineScore,
      delta: condition.id === "baseline" ? 0 : modelRun.upliftPoints,
      categories: [{ category: familyDefinition.id, score: modelRun.score }],
      baselineCategories: [{ category: familyDefinition.id, score: modelRun.baselineScore }],
      cost: aliases.cost,
      latency: aliases.latency,
      tokens: aliases.tokens,
      metrics: { ...metrics },
      rank: modelRun.rank
    };
  });

  const benchmarkResults = [];
  for (const benchmarkId of EXPECTED_BENCHMARK_IDS) {
    const record = runRecords.get(benchmarkId);
    for (const setting of settings) {
      for (const condition of PUBLIC_CONDITIONS) {
        const row = readCompleteRow(
          record.rowLookup,
          setting.configurationId,
          condition.normalizedSourceId,
          benchmarkId
        );
        benchmarkResults.push({
          settingId: setting.id,
          configurationId: setting.configurationId,
          condition: condition.id,
          benchmarkId,
          category: familyDefinition.id,
          score: round(row.score, 1),
          trials: 1,
          calibrated: false,
          status: "development",
          latencyMs: round(row.durationMs, 1),
          inputTokens: round(row.usage.inputTokens, 1),
          outputTokens: round(row.usage.outputTokens, 1),
          totalTokens: round(row.usage.totalTokens, 1),
          costUsd: null
        });
      }
    }
  }

  const results = EXPECTED_BENCHMARK_IDS.map((benchmarkId) => {
    const record = runRecords.get(benchmarkId);
    const normalized = record.normalized;
    const configurations = settings.map((setting) => {
      const score = normalized.configurationScores.find(
        (candidate) => candidate.configurationId === setting.configurationId
      );
      const baselineRow = readCompleteRow(record.rowLookup, setting.configurationId, "clean", benchmarkId);
      const skillRow = readCompleteRow(record.rowLookup, setting.configurationId, "vasir", benchmarkId);
      return {
        settingId: setting.id,
        configurationId: setting.configurationId,
        baselineScore: round(score.cleanScore, 1),
        treatmentScore: round(score.treatmentScore, 1),
        delta: round(score.treatmentScore - score.cleanScore, 1),
        baselineMetrics: createMetrics([baselineRow]),
        skillMetrics: createMetrics([skillRow])
      };
    });
    return {
      benchmarkId,
      runId: record.report.runId,
      completedAt: record.report.completedAt,
      status: "development",
      verification: "unverified",
      blockers: cloneBlockers(),
      judgingScope: { ...record.judgingScope },
      baselineScore: round(normalized.conditionScores.clean, 1),
      treatmentScore: round(normalized.conditionScores.treatment, 1),
      delta: round(normalized.conditionScores.treatment - normalized.conditionScores.clean, 1),
      record: { ...normalized.record },
      responseCount: normalized.completedRowCount,
      matchedConfigurationCount: normalized.matchedPairCount,
      configurations
    };
  });

  const resultByBenchmarkId = new Map(results.map((result) => [result.benchmarkId, result]));
  const benchmarks = EXPECTED_BENCHMARK_IDS.map((benchmarkId) => {
    const definition = definitions.get(benchmarkId);
    const result = resultByBenchmarkId.get(benchmarkId);
    return {
      id: definition.id,
      trackId: trackDefinition.id,
      familyId: familyDefinition.id,
      category: familyDefinition.id,
      suite: trackDefinition.title,
      name: definition.title,
      title: definition.title,
      description: definition.description,
      taskKind: definition.taskKind,
      task: {
        id: definition.cases[0].id,
        text: definition.cases[0].task
      },
      prompt: definition.cases[0].task,
      judging: {
        panel: [...definition.judging.panel],
        synthesizer: definition.judging.synthesizer
      },
      limitations: siteLimitations(definition.limitations),
      reportFragment: definition.id,
      detailHref: `benchmark-report.html#${definition.id}`,
      evidenceKind: "development",
      resultAvailability: cloneAvailability(),
      measured: {
        baseline: result.baselineScore,
        treatment: result.treatmentScore,
        delta: result.delta,
        wins: result.record.wins,
        ties: result.record.ties,
        losses: result.record.losses,
        complete: result.responseCount,
        total: result.responseCount,
        treatmentLabel: "Architecture skill",
        calibration: "Calibration pending"
      }
    };
  });

  const benchmarkSummaries = results.map((result) => ({
    benchmarkId: result.benchmarkId,
    runId: result.runId,
    status: result.status,
    verification: result.verification,
    blockers: cloneBlockers(),
    evidenceKind: "development",
    baselineLabel: "Minimal baseline",
    treatmentLabel: "Architecture skill",
    baseline: result.baselineScore,
    treatment: result.treatmentScore,
    delta: result.delta,
    wins: result.record.wins,
    ties: result.record.ties,
    losses: result.record.losses,
    complete: result.responseCount,
    total: result.responseCount,
    completionLabel: "responses",
    calibration: "Calibration pending",
    judgingScope: { ...result.judgingScope },
    detailHref: `./benchmark-report.html#${result.benchmarkId}`,
    sourceHref: null
  }));

  const skillEntries = entries.filter((entry) => entry.condition === "skill");
  const leader = skillEntries[0];
  const regressions = skillEntries.filter((entry) => entry.delta < 0);
  const record = category.record;
  const projection = {
    kind: "vasirbenchmark-public-projection",
    schemaVersion: 2,
    program: {
      id: "vasirbench",
      title: "VasirBench",
      taxonomyVersion: taxonomy.version,
      status: taxonomy.status,
      evidenceStatus: "development",
      verification: "unverified"
    },
    meta: {
      release: PUBLIC_RELEASE_LABEL,
      status: "Development results · unverified",
      categories: 1,
      benchmarks: EXPECTED_BENCHMARK_COUNT,
      settings: configurationCount,
      conditions: EXPECTED_CONDITION_COUNT,
      trials: 1,
      aggregateCells: responseCount,
      runs: EXPECTED_BENCHMARK_COUNT,
      calibration: 0,
      vasirVersion: null
    },
    scoreBasis: {
      id: `${trackDefinition.modelScore.edition}:${scoreContractHash}`,
      label: trackDefinition.modelScore.label,
      edition: trackDefinition.modelScore.edition,
      method: trackDefinition.modelScore.method,
      unit: "rubric-points",
      range: { minimum: 0, maximum: trackDefinition.modelScore.scaleMaximum },
      benchmarkWeighting: trackDefinition.modelScore.benchmarkWeighting,
      benchmarkIds: [...trackDefinition.benchmarkIds],
      taskCount: trackDefinition.benchmarkIds.length,
      trialsPerTask: 1,
      judgeCount: trackDefinition.modelScore.judging.judgeCount,
      judges: [...trackDefinition.modelScore.judging.panel],
      aggregation: trackDefinition.modelScore.judging.aggregation,
      batchUnit: trackDefinition.modelScore.judging.batchUnit,
      effectMethod: trackDefinition.effect.method,
      effectUnit: trackDefinition.effect.unit,
      calibrationStatus: "development-uncalibrated",
      uncertainty: { ...trackDefinition.uncertainty }
    },
    conditions,
    categories,
    families: [{ ...familyDefinition, trackIds: [trackDefinition.id] }],
    tracks: [{
      id: trackDefinition.id,
      familyId: familyDefinition.id,
      title: trackDefinition.title,
      description: trackDefinition.description,
      benchmarkIds: [...trackDefinition.benchmarkIds],
      resultAvailability: cloneAvailability()
    }],
    benchmarks,
    results,
    settings,
    entries,
    benchmarkResults,
    benchmarkSummaries,
    categoryLeaders: [{
      category: familyDefinition.id,
      entry: { ...leader, categoryScore: leader.score }
    }],
    efficientFrontier: [],
    regressions,
    callouts: {
      overall: `${leader.family} · ${leader.reasoning} with Architecture skill leads the development snapshot at ${leader.score.toFixed(1)} development rubric score.`,
      value: "Cost comparison is withheld because response-level provider cost coverage is incomplete.",
      regression: `${regressions.length} of ${configurationCount} matched settings score lower with the Architecture skill across the fixed three-task score edition.`,
      category: `Engineering contains ${record.wins} improved, ${record.ties} tied, and ${record.losses} lower prompt-level matched outcomes.`
    },
    availability: cloneAvailability(),
    counts: {
      families: 1,
      tracks: 1,
      benchmarks: EXPECTED_BENCHMARK_COUNT,
      categories: 1,
      conditions: EXPECTED_CONDITION_COUNT,
      settings: configurationCount,
      resultEntries: resultEntryCount,
      responses: responseCount,
      developmentResultSets: EXPECTED_BENCHMARK_COUNT,
      eligibleResultSets: 0,
      withheldResultSets: 0
    }
  };
  return projection;
}

function responseIdentity({ benchmarkId, settingId, condition }) {
  return `${benchmarkId}\u0000${settingId}\u0000${condition}`;
}

function compareResponseRecords(left, right) {
  return (
    left.benchmarkId.localeCompare(right.benchmarkId) ||
    left.settingId.localeCompare(right.settingId) ||
    left.condition.localeCompare(right.condition)
  );
}

function assertResponseObjectKeys(value, expectedKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw projectionError({
      message: `Public responses ${label} must be an object.`,
      suggestion: "Regenerate responses.js from the selected immutable benchmark rows."
    });
  }
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(sortedExpectedKeys)) {
    throw projectionError({
      message: `Public responses ${label} contains unsupported or missing fields.`,
      suggestion: "Publish only the exact response-bundle schema derived from selected immutable evidence.",
      context: { field: label, expectedKeys: sortedExpectedKeys, actualKeys }
    });
  }
}

function validateExactMessages(messages, label) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw projectionError({
      message: `Public responses ${label} must contain at least one exact generation message.`,
      suggestion: "Select complete response rows with their ordered generation messages intact."
    });
  }
  for (const [index, message] of messages.entries()) {
    assertResponseObjectKeys(message, ["role", "content"], `${label}[${index}]`);
    assertNonEmptyString(message.role, `${label}[${index}].role`);
    assertNonEmptyString(message.content, `${label}[${index}].content`);
    if (containsPrivatePath(message.content)) {
      throw projectionError({
        message: `Public responses ${label}[${index}].content contains a private local path.`,
        suggestion: "Do not publish response evidence that exposes a local benchmark or filesystem path."
      });
    }
  }
}

function createPublicJudgmentsByRowKey({ run, sourceRows, benchmarkId, judgeConfigurationIds }) {
  const sourceJudges = Array.isArray(run?.judging?.judges) ? run.judging.judges : [];
  const rowsByKey = new Map(sourceRows.map((row) => [row?.rowKey, row]));
  const judgesByConfigurationId = new Map(sourceJudges.map((judge) => [judge?.configuration?.id, judge]));
  if (
    run?.judging?.strategy !== "matched-pair-panel-consensus-v1" ||
    run?.judging?.synthesizerConfiguration !== null ||
    !Array.isArray(run?.judging?.judgeConfigurations) ||
    stableSerialize(run.judging.judgeConfigurations.map((configuration) => configuration?.id)) !==
      stableSerialize(judgeConfigurationIds) ||
    sourceRows.length === 0 ||
    rowsByKey.size !== sourceRows.length ||
    sourceJudges.length !== judgeConfigurationIds.length ||
    judgesByConfigurationId.size !== judgeConfigurationIds.length ||
    judgeConfigurationIds.some((configurationId) => !judgesByConfigurationId.has(configurationId))
  ) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: `Selected judge evidence is incomplete or duplicated for ${benchmarkId}.`,
      suggestion: "Select a complete run with one fixed-panel judgment for every published response."
    });
  }

  const judgmentsByRowKey = new Map(sourceRows.map((row) => [row.rowKey, []]));
  for (const judgeConfigurationId of judgeConfigurationIds) {
    const judge = judgesByConfigurationId.get(judgeConfigurationId);
    const evaluations = Array.isArray(judge?.evaluations) ? judge.evaluations : [];
    if (judge.status !== "complete" || evaluations.length !== sourceRows.length) {
      throw projectionError({
        code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
        message: `Selected judge ${judgeConfigurationId} does not cover every response for ${benchmarkId}.`,
        suggestion: "Complete the fixed-panel judging matrix before publishing score rationales."
      });
    }

    const observedRowKeys = new Set();
    for (const evaluation of evaluations) {
      const row = rowsByKey.get(evaluation?.rowKey);
      const aggregationEvaluations = row?.score?.aggregation?.evaluations;
      const aggregationReference = Array.isArray(aggregationEvaluations)
        ? aggregationEvaluations.find((candidate) => candidate?.reviewerId === judge.reviewerId)
        : null;
      if (
        !row ||
        observedRowKeys.has(evaluation.rowKey) ||
        row.score?.rowKey !== row.rowKey ||
        evaluation.candidateId !== row.score?.candidateId ||
        row.score?.aggregation?.method !== JUDGE_AGGREGATION ||
        row.score?.aggregation?.judgeCount !== judgeConfigurationIds.length ||
        aggregationEvaluations?.length !== judgeConfigurationIds.length ||
        !aggregationReference ||
        aggregationReference.evaluationHash !== evaluation.evaluationHash ||
        aggregationReference.total !== evaluation.total
      ) {
        throw projectionError({
          code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
          message: `Selected judge evidence does not match its scored response for ${benchmarkId}.`,
          suggestion: "Rejudge the immutable response matrix before publishing score rationales."
        });
      }
      observedRowKeys.add(evaluation.rowKey);

      assertScore(evaluation.total, `${benchmarkId}.${evaluation.rowKey}.${judgeConfigurationId}.score`);
      assertScore(evaluation.uncapped, `${benchmarkId}.${evaluation.rowKey}.${judgeConfigurationId}.rawScore`);
      assertScore(evaluation.gateCap, `${benchmarkId}.${evaluation.rowKey}.${judgeConfigurationId}.gateCap`);
      const rationale = typeof evaluation.reason === "string"
        ? evaluation.reason.replace(NONSEMANTIC_JUDGE_NOTE_PATTERN, "")
        : evaluation.reason;
      assertNonEmptyString(rationale, `${benchmarkId}.${evaluation.rowKey}.${judgeConfigurationId}.rationale`);
      if (containsPrivatePath(evaluation.reason)) {
        throw projectionError({
          code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
          message: `Selected judge rationale contains a private local path for ${benchmarkId}.`,
          suggestion: "Do not publish judge evidence that exposes local provenance."
        });
      }
      if (!Array.isArray(evaluation.gates) || evaluation.gates.length === 0) {
        throw projectionError({
          code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
          message: `Selected judge rationale has no gate decisions for ${benchmarkId}.`,
          suggestion: "Rejudge the response with the complete task rubric before publishing."
        });
      }
      const gateIds = new Set();
      for (const gate of evaluation.gates) {
        assertIdentifier(gate?.id, `${benchmarkId}.${evaluation.rowKey}.${judgeConfigurationId}.gate.id`);
        if ((gate.status !== "pass" && gate.status !== "fail") || gateIds.has(gate.id)) {
          throw projectionError({
            code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
            message: `Selected judge rationale has invalid gate decisions for ${benchmarkId}.`,
            suggestion: "Rejudge the response with one decision per rubric gate before publishing."
          });
        }
        gateIds.add(gate.id);
      }

      judgmentsByRowKey.get(row.rowKey).push({
        judgeConfigurationId,
        score: evaluation.total,
        rawScore: evaluation.uncapped,
        gateCap: evaluation.gateCap,
        failedGates: evaluation.gates.filter((gate) => gate.status === "fail").map((gate) => gate.id),
        rationale
      });
    }
  }

  if ([...judgmentsByRowKey.values()].some((judgments) => judgments.length !== judgeConfigurationIds.length)) {
    throw projectionError({
      code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
      message: `Selected judge evidence does not form a complete response matrix for ${benchmarkId}.`,
      suggestion: "Complete all fixed-panel evaluations before publishing score rationales."
    });
  }
  return judgmentsByRowKey;
}

function createBenchmarkPublicationResponses({ projection, runRecords }) {
  const settingsByConfigurationId = new Map(projection.settings.map((setting) => [
    setting.configurationId,
    setting
  ]));
  const messageSetsById = new Map();
  const responses = [];

  for (const benchmarkId of EXPECTED_BENCHMARK_IDS) {
    const record = runRecords.get(benchmarkId);
    const run = record?.run;
    if (!Array.isArray(run?.rows)) {
      throw projectionError({
        code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
        message: `Selected evidence has no response rows for ${benchmarkId}.`,
        suggestion: "Select one complete immutable Engineering v2 run for every benchmark."
      });
    }
    const judgmentsByRowKey = new Map(record.judgmentSources.flatMap((source) => [
      ...createPublicJudgmentsByRowKey({
        run: source.run,
        sourceRows: source.rows,
        benchmarkId,
        judgeConfigurationIds: projection.scoreBasis.judges
      })
    ]));
    for (const row of run.rows) {
      const setting = settingsByConfigurationId.get(row.configurationId);
      const condition = publicConditionFromSourceId(row.conditionId);
      if (!setting || row.rowStatus !== "complete" || row.trialNumber !== 1) {
        throw projectionError({
          code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
          message: `Selected evidence contains an incomplete or unknown response row for ${benchmarkId}.`,
          suggestion: "Select the complete one-trial response matrix for the shared public configuration cohort."
        });
      }
      validateExactMessages(row.exactMessages, `${benchmarkId}.${setting.id}.${condition.id}.messages`);
      assertNonEmptyString(row.outputText, `${benchmarkId}.${setting.id}.${condition.id}.outputText`);
      if (containsPrivatePath(row.outputText)) {
        throw projectionError({
          code: "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE",
          message: `Selected response output contains a private local path for ${benchmarkId}.`,
          suggestion: "Do not publish response evidence that exposes a local benchmark or filesystem path."
        });
      }

      const messages = row.exactMessages.map(({ role, content }) => ({ role, content }));
      const messageSetId = sha256(stableSerialize(messages));
      const existingMessages = messageSetsById.get(messageSetId);
      if (existingMessages && stableSerialize(existingMessages) !== stableSerialize(messages)) {
        throw projectionError({
          message: `Public response message-set identity collided for ${messageSetId}.`,
          suggestion: "Stop publication and inspect the content-addressing implementation."
        });
      }
      messageSetsById.set(messageSetId, messages);
      responses.push({
        benchmarkId,
        settingId: setting.id,
        configurationId: row.configurationId,
        condition: condition.id,
        trialNumber: row.trialNumber,
        messageSetId,
        outputText: row.outputText,
        judgments: judgmentsByRowKey.get(row.rowKey)
      });
    }
  }

  const messageSets = [...messageSetsById]
    .map(([id, messages]) => ({ id, messages }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const sortedResponses = responses.sort(compareResponseRecords);
  const responseBundle = {
    kind: PUBLIC_RESPONSES_KIND,
    schemaVersion: PUBLIC_RESPONSES_SCHEMA_VERSION,
    counts: {
      benchmarks: projection.counts.benchmarks,
      settings: projection.counts.settings,
      conditions: projection.counts.conditions,
      responses: sortedResponses.length,
      messageSets: messageSets.length,
      judgments: sortedResponses.reduce((total, response) => total + response.judgments.length, 0)
    },
    messageSets,
    responses: sortedResponses
  };
  validateBenchmarkPublicationResponses(responseBundle, projection);
  return responseBundle;
}

function validatePublicValue(value, pathParts = []) {
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) validatePublicValue(entry, [...pathParts, String(index)]);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (FORBIDDEN_PUBLIC_KEYS.has(key) && entry !== null) {
        throw projectionError({
          message: `Public projection contains forbidden raw evidence at ${[...pathParts, key].join(".")}.`,
          suggestion: "Publish derived scores and aggregate metrics only; keep raw outputs, judgments, and local paths private."
        });
      }
      validatePublicValue(entry, [...pathParts, key]);
    }
    return;
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw projectionError({
      message: `Public projection contains a non-finite number at ${pathParts.join(".")}.`,
      suggestion: "Project explicit null for unavailable metrics and finite numbers for recorded evidence."
    });
  }
  if (typeof value === "string") {
    if (containsPrivatePath(value)) {
      throw projectionError({
        message: `Public projection contains a private local path at ${pathParts.join(".")}.`,
        suggestion: "Keep ignored evidence paths and local filesystem locations outside public data."
      });
    }
    if (FIXTURE_TOKEN_PATTERN.test(value)) {
      throw projectionError({
        message: `Public projection contains retired fake-data language at ${pathParts.join(".")}.`,
        suggestion: "Publish only real development evidence with an explicit verification boundary."
      });
    }
  }
}

function assertScore(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw projectionError({
      message: `Public projection ${label} must be a finite score from 0 to 100.`,
      suggestion: "Regenerate absolute rubric-score values from the selected immutable runs."
    });
  }
}

function validateMetrics(metrics, label, expectedSamples) {
  assertExactObjectKeys(metrics, [
    "sampleCount",
    "meanLatencyMs",
    "meanInputTokens",
    "meanOutputTokens",
    "meanTotalTokens",
    "costUsd"
  ], label);
  if (
    metrics.sampleCount !== expectedSamples ||
    !Number.isFinite(metrics.meanLatencyMs) || metrics.meanLatencyMs < 0 ||
    !Number.isFinite(metrics.meanInputTokens) || metrics.meanInputTokens < 0 ||
    !Number.isFinite(metrics.meanOutputTokens) || metrics.meanOutputTokens < 0 ||
    !Number.isFinite(metrics.meanTotalTokens) || metrics.meanTotalTokens < 0 ||
    metrics.meanTotalTokens < metrics.meanInputTokens ||
    metrics.meanTotalTokens < metrics.meanOutputTokens ||
    metrics.costUsd !== null
  ) {
    throw projectionError({
      message: `Public projection ${label} does not preserve complete latency/token metrics and explicit unavailable cost.`,
      suggestion: "Regenerate resource metrics from the complete selected rows without estimating provider cost."
    });
  }
}

function validateAvailability(availability, label) {
  assertExactObjectKeys(availability, [
    "status",
    "verification",
    "code",
    "message",
    "detail",
    "blockers"
  ], label);
  if (
    availability.status !== "development" ||
    availability.verification !== "unverified" ||
    availability.code !== "development-unverified-results" ||
    !Array.isArray(availability.blockers) ||
    availability.blockers.length !== RESULT_BLOCKERS.length
  ) {
    throw projectionError({
      message: `Public projection ${label} weakens the development/unverified evidence boundary.`,
      suggestion: "Keep the reviewed status, verification state, and explicit blockers on every result surface."
    });
  }
}

function validateEngineeringV2JudgingScope(scope, label, expectedResponseCount) {
  if (scope?.strategy === "saved-responses-full-rescore-v1") {
    assertExactObjectKeys(scope, [
      "strategy",
      "responseCount",
      "generationReused",
      "sourceScoresPreserved"
    ], label);
    if (
      !Number.isInteger(scope.responseCount) || scope.responseCount !== expectedResponseCount ||
      scope.generationReused !== true ||
      scope.sourceScoresPreserved !== false
    ) {
      throw projectionError({
        message: `Public projection ${label} does not describe complete Engineering v2 judging.`,
        suggestion: "Project either a complete saved-response full rescore or a verified append-only extension rooted in one."
      });
    }
    return;
  }
  if (scope?.strategy === "appended-rows-only-v1") {
    assertExactObjectKeys(scope, [
      "strategy",
      "incumbentResponseCount",
      "appendedResponseCount",
      "combinedResponseCount",
      "incumbentScoresPreserved"
    ], label);
    if (
      !Number.isInteger(scope.incumbentResponseCount) || scope.incumbentResponseCount <= 0 ||
      !Number.isInteger(scope.appendedResponseCount) || scope.appendedResponseCount <= 0 ||
      !Number.isInteger(scope.combinedResponseCount) ||
      scope.combinedResponseCount !== expectedResponseCount ||
      scope.combinedResponseCount !== scope.incumbentResponseCount + scope.appendedResponseCount ||
      scope.incumbentScoresPreserved !== true
    ) {
      throw projectionError({
        message: `Public projection ${label} does not describe complete Engineering v2 judging.`,
        suggestion: "Project either a complete saved-response full rescore or a verified append-only extension rooted in one."
      });
    }
    return;
  }
  throw projectionError({
    message: `Public projection ${label} does not describe complete Engineering v2 judging.`,
    suggestion: "Project either a complete saved-response full rescore or a verified append-only extension rooted in one."
  });
}

export function validateBenchmarkPublicationProjection(projection) {
  if (projection?.schemaVersion === 6 && projection.writing) {
    const { writing, ...existing } = projection;
    validateBenchmarkPublicationProjection({ ...existing, schemaVersion: existing.games ? 5 : existing.overall ? 4 : existing.aiWorkflows ? 3 : 2 });
    validateWritingSummary(writing);
    return projection;
  }
  if (projection?.schemaVersion === 5 && projection.games) {
    const { games, ...existing } = projection;
    validateBenchmarkPublicationProjection({ ...existing, schemaVersion: existing.overall ? 4 : existing.aiWorkflows ? 3 : 2 });
    validateGamesPublication(games);
    return projection;
  }
  if (projection?.schemaVersion === 4 && projection.overall && projection.aiWorkflows) {
    const { overall, ...sources } = projection;
    validateBenchmarkPublicationProjection({ ...sources, schemaVersion: 3 });
    validateOverallPublication(overall, { engineering: sources, aiWorkflows: sources.aiWorkflows });
    return projection;
  }
  if (projection?.schemaVersion === 3 && projection.aiWorkflows) {
    const { aiWorkflows, ...engineering } = projection;
    validateBenchmarkPublicationProjection({ ...engineering, schemaVersion: 2 });
    validateWorkSpecPublication(aiWorkflows);
    return projection;
  }
  assertExactObjectKeys(projection, [
    "kind", "schemaVersion", "program", "meta", "scoreBasis", "conditions", "categories", "families", "tracks",
    "benchmarks", "results", "settings", "entries", "benchmarkResults", "benchmarkSummaries",
    "categoryLeaders", "efficientFrontier", "regressions", "callouts", "availability", "counts"
  ], "root");
  if (projection.kind !== "vasirbenchmark-public-projection" || projection.schemaVersion !== 2) {
    throw projectionError({
      message: "The public projection kind or schema version is unsupported.",
      suggestion: "Regenerate schema-version 2 public data."
    });
  }
  assertExactObjectKeys(projection.scoreBasis, [
    "id", "label", "edition", "method", "unit", "range", "benchmarkWeighting", "benchmarkIds",
    "taskCount", "trialsPerTask", "judgeCount", "judges", "aggregation", "batchUnit",
    "effectMethod", "effectUnit", "calibrationStatus", "uncertainty"
  ], "scoreBasis");
  assertExactObjectKeys(projection.scoreBasis.range, ["minimum", "maximum"], "scoreBasis.range");
  assertExactObjectKeys(projection.scoreBasis.uncertainty, ["status", "reason"], "scoreBasis.uncertainty");
  if (
    typeof projection.scoreBasis.id !== "string" ||
    !projection.scoreBasis.id.startsWith(`${SCORE_EDITION}:`) ||
    !SHA256_PATTERN.test(projection.scoreBasis.id.slice(SCORE_EDITION.length + 1)) ||
    projection.scoreBasis.label !== SCORE_EDITION_LABEL ||
    projection.scoreBasis.edition !== SCORE_EDITION ||
    projection.scoreBasis.method !== "equal-benchmark-absolute-mean-v1" ||
    projection.scoreBasis.unit !== "rubric-points" ||
    projection.scoreBasis.range.minimum !== 0 || projection.scoreBasis.range.maximum !== 100 ||
    projection.scoreBasis.benchmarkWeighting !== "equal" ||
    stableSerialize(projection.scoreBasis.benchmarkIds) !== stableSerialize(EXPECTED_BENCHMARK_IDS) ||
    projection.scoreBasis.taskCount !== EXPECTED_BENCHMARK_COUNT ||
    projection.scoreBasis.trialsPerTask !== 1 ||
    projection.scoreBasis.judgeCount !== FIXED_JUDGE_PANEL.length ||
    stableSerialize(projection.scoreBasis.judges) !== stableSerialize(FIXED_JUDGE_PANEL) ||
    projection.scoreBasis.aggregation !== JUDGE_AGGREGATION ||
    projection.scoreBasis.batchUnit !== JUDGE_BATCH_UNIT ||
    projection.scoreBasis.effectMethod !== "paired-absolute-delta-v1" ||
    projection.scoreBasis.effectUnit !== "rubric-points" ||
    projection.scoreBasis.calibrationStatus !== "development-uncalibrated" ||
    projection.scoreBasis.uncertainty.status !== "not-estimated" ||
    !projection.scoreBasis.uncertainty.reason
  ) {
    throw projectionError({
      message: "The public projection score basis does not preserve Engineering v2.",
      suggestion: "Regenerate from the fixed three-task, two-judge rubric-score contract."
    });
  }
  assertExactObjectKeys(projection.meta, [
    "release", "status", "categories", "benchmarks", "settings", "conditions", "trials",
    "aggregateCells", "runs", "calibration", "vasirVersion"
  ], "meta");
  const expectedConfigurationCount = Array.isArray(projection.settings) ? projection.settings.length : 0;
  const expectedResultEntryCount = expectedConfigurationCount * EXPECTED_CONDITION_COUNT;
  const expectedResponseCount = expectedResultEntryCount * EXPECTED_BENCHMARK_COUNT;
  if (
    projection.meta.release !== PUBLIC_RELEASE_LABEL ||
    projection.meta.categories !== 1 || projection.meta.benchmarks !== EXPECTED_BENCHMARK_COUNT ||
    expectedConfigurationCount === 0 || projection.meta.settings !== expectedConfigurationCount ||
    projection.meta.conditions !== EXPECTED_CONDITION_COUNT ||
    projection.meta.trials !== 1 || projection.meta.aggregateCells !== expectedResponseCount ||
    projection.meta.runs !== EXPECTED_BENCHMARK_COUNT || projection.meta.calibration !== 0
  ) {
    throw projectionError({
      message: "The public projection metadata confuses the snapshot identity, selected runs, settings, or response cells.",
      suggestion: `Preserve the September 2026 snapshot with ${EXPECTED_BENCHMARK_COUNT} selected runs and one complete shared setting cohort.`
    });
  }
  assertExactObjectKeys(projection.counts, [
    "families", "tracks", "benchmarks", "categories", "conditions", "settings", "resultEntries",
    "responses", "developmentResultSets", "eligibleResultSets", "withheldResultSets"
  ], "counts");
  const expectedCounts = {
    families: 1,
    tracks: 1,
    benchmarks: EXPECTED_BENCHMARK_COUNT,
    categories: 1,
    conditions: EXPECTED_CONDITION_COUNT,
    settings: expectedConfigurationCount,
    resultEntries: expectedResultEntryCount,
    responses: expectedResponseCount,
    developmentResultSets: EXPECTED_BENCHMARK_COUNT,
    eligibleResultSets: 0,
    withheldResultSets: 0
  };
  if (stableSerialize(projection.counts) !== stableSerialize(expectedCounts)) {
    throw projectionError({
      message: "The public projection does not preserve the exact development snapshot counts.",
      suggestion: `Regenerate one category, ${EXPECTED_BENCHMARK_COUNT} runs, and the complete shared configuration cohort.`
    });
  }
  if (
    projection.families?.length !== 1 || projection.tracks?.length !== 1 ||
    projection.categories?.length !== 1 || projection.conditions?.length !== EXPECTED_CONDITION_COUNT ||
    projection.benchmarks?.length !== EXPECTED_BENCHMARK_COUNT ||
    projection.results?.length !== EXPECTED_BENCHMARK_COUNT ||
    projection.entries?.length !== expectedResultEntryCount ||
    projection.benchmarkResults?.length !== expectedResponseCount ||
    projection.benchmarkSummaries?.length !== EXPECTED_BENCHMARK_COUNT
  ) {
    throw projectionError({
      message: "The public projection arrays do not match the exact development snapshot counts.",
      suggestion: "Regenerate from the three selected complete run matrices."
    });
  }
  if (
    projection.program?.status !== "development" ||
    projection.program?.evidenceStatus !== "development" ||
    projection.program?.verification !== "unverified"
  ) {
    throw projectionError({
      message: "The public program must remain explicitly development and unverified.",
      suggestion: "Do not represent development data as verified benchmark results."
    });
  }
  validateAvailability(projection.availability, "availability");

  const conditionIds = projection.conditions.map((condition) => condition.id);
  if (JSON.stringify(conditionIds) !== JSON.stringify(["baseline", "skill"])) {
    throw projectionError({
      message: "The public projection must contain only Minimal baseline and Architecture skill conditions.",
      suggestion: "Regenerate the exact two-condition development comparison."
    });
  }
  if (
    projection.categories[0].id !== "engineering" || projection.categories[0].weight !== 1 ||
    projection.families[0].id !== "engineering" || projection.tracks[0].id !== "backend-architecture"
  ) {
    throw projectionError({
      message: "The public projection must preserve one Engineering family and Backend Architecture track.",
      suggestion: "Regenerate from the canonical capability taxonomy."
    });
  }
  validateAvailability(projection.tracks[0].resultAvailability, "tracks[0].resultAvailability");

  const benchmarkIds = projection.benchmarks.map((benchmark) => benchmark.id);
  if (JSON.stringify(benchmarkIds) !== JSON.stringify(EXPECTED_BENCHMARK_IDS)) {
    throw projectionError({
      message: "The public projection benchmark order or identity changed.",
      suggestion: "Preserve canonical taxonomy order for the three selected benchmarks."
    });
  }
  for (const benchmark of projection.benchmarks) {
    assertIdentifier(benchmark.id, "benchmark.id");
    assertNonEmptyString(benchmark.title, `${benchmark.id}.title`);
    assertNonEmptyString(benchmark.prompt, `${benchmark.id}.prompt`);
    validateAvailability(benchmark.resultAvailability, `${benchmark.id}.resultAvailability`);
    if (
      benchmark.familyId !== "engineering" || benchmark.category !== "engineering" ||
      benchmark.trackId !== "backend-architecture" || benchmark.reportFragment !== benchmark.id ||
      benchmark.detailHref !== `benchmark-report.html#${benchmark.id}` || benchmark.evidenceKind !== "development" ||
      stableSerialize(benchmark.judging?.panel) !== stableSerialize(FIXED_JUDGE_PANEL) ||
      benchmark.judging?.synthesizer !== null
    ) {
      throw projectionError({
        message: `Public benchmark membership, status, or report route is invalid: ${benchmark.id}`,
        suggestion: "Keep every definition in Engineering / Backend Architecture with its stable report fragment."
      });
    }
  }

  const settingIds = new Set();
  const configurationIds = new Set();
  for (const setting of projection.settings) {
    assertIdentifier(setting.id, "setting.id");
    assertNonEmptyString(setting.configurationId, `${setting.id}.configurationId`);
    if (settingIds.has(setting.id) || configurationIds.has(setting.configurationId)) {
      throw projectionError({
        message: `Public setting identity is duplicated: ${setting.id}`,
        suggestion: "Project one unique setting for each canonical configuration."
      });
    }
    settingIds.add(setting.id);
    configurationIds.add(setting.configurationId);
    const expectedClaudeLabel = PUBLIC_CLAUDE_MODEL_LABELS[setting.modelId];
    const isClaudeConfiguration = String(setting.configurationId).startsWith("claude:");
    if (
      isClaudeConfiguration &&
      (
        !expectedClaudeLabel ||
        setting.provider !== "claude" ||
        setting.family !== expectedClaudeLabel ||
        setting.label !== `${expectedClaudeLabel} · ${setting.reasoning}`
      )
    ) {
      throw projectionError({
        message: `Public Claude model identity omits or changes its release number: ${setting.configurationId}`,
        suggestion: "Render Claude Fable 5, Claude Fable 5.1, or Claude Opus 5 explicitly on every public surface."
      });
    }
    assertScore(setting.scores?.baseline, `${setting.id}.scores.baseline`);
    assertScore(setting.scores?.skill, `${setting.id}.scores.skill`);
    validateMetrics(setting.metrics?.baseline, `${setting.id}.metrics.baseline`, 3);
    validateMetrics(setting.metrics?.skill, `${setting.id}.metrics.skill`, 3);
  }
  assertConfigurationCohort([...configurationIds], [...configurationIds], {
    label: "Public projection settings"
  });

  const entryIds = new Set();
  const entryPairs = new Set();
  for (const entry of projection.entries) {
    if (
      entryIds.has(entry.id) || !settingIds.has(entry.settingId) || !conditionIds.includes(entry.condition) ||
      entry.cost !== null || !Number.isFinite(entry.latency) || entry.latency < 0 ||
      !Number.isFinite(entry.tokens) || entry.tokens < 0 || !Number.isInteger(entry.rank) ||
      entry.rank < 1 || entry.rank > expectedResultEntryCount
    ) {
      throw projectionError({
        message: `Public leaderboard entry is invalid: ${entry.id}`,
        suggestion: `Regenerate the ${expectedResultEntryCount} condition runs from compatible absolute-score evidence and recorded resources.`
      });
    }
    entryIds.add(entry.id);
    const expectedClaudeLabel = PUBLIC_CLAUDE_MODEL_LABELS[entry.modelId];
    const isClaudeConfiguration = String(entry.configurationId).startsWith("claude:");
    if (
      isClaudeConfiguration &&
      (
        !expectedClaudeLabel ||
        entry.provider !== "claude" ||
        entry.family !== expectedClaudeLabel ||
        entry.label !== `${expectedClaudeLabel} · ${entry.reasoning}`
      )
    ) {
      throw projectionError({
        message: `Public Claude entry identity omits or changes its release number: ${entry.configurationId}`,
        suggestion: "Keep the explicit Claude release number in leaderboard and efficiency labels."
      });
    }
    const pairKey = `${entry.settingId}\u0000${entry.condition}`;
    if (entryPairs.has(pairKey)) {
      throw projectionError({
        message: `Public leaderboard contains a duplicated matched condition: ${entry.id}`,
        suggestion: "Project exactly one entry per setting and condition."
      });
    }
    entryPairs.add(pairKey);
    assertScore(entry.score, `${entry.id}.score`);
    assertScore(entry.baselineScore, `${entry.id}.baselineScore`);
    validateMetrics(entry.metrics, `${entry.id}.metrics`, 3);
  }

  const resultCells = new Set();
  for (const cell of projection.benchmarkResults) {
    const cellKey = `${cell.benchmarkId}\u0000${cell.settingId}\u0000${cell.condition}`;
    if (
      resultCells.has(cellKey) || !benchmarkIds.includes(cell.benchmarkId) || !settingIds.has(cell.settingId) ||
      !conditionIds.includes(cell.condition) || cell.status !== "development" || cell.calibrated !== false ||
      cell.trials !== 1 || cell.costUsd !== null || !Number.isFinite(cell.latencyMs) || cell.latencyMs < 0 ||
      !Number.isFinite(cell.inputTokens) || cell.inputTokens < 0 || !Number.isFinite(cell.outputTokens) ||
      cell.outputTokens < 0 || !Number.isFinite(cell.totalTokens) || cell.totalTokens < 0
    ) {
      throw projectionError({
        message: `Public raw-score cell is invalid: ${cellKey}`,
        suggestion: "Regenerate every cell from one complete immutable response row."
      });
    }
    resultCells.add(cellKey);
    assertScore(cell.score, `${cellKey}.score`);
  }

  for (const setting of projection.settings) {
    const conditionScore = (condition) => {
      const cells = projection.benchmarkResults.filter((cell) => (
        cell.settingId === setting.id && cell.condition === condition
      ));
      if (cells.length !== EXPECTED_BENCHMARK_COUNT) {
        throw projectionError({
          message: `Public setting does not contain one score per task and condition: ${setting.id}`,
          suggestion: "Regenerate the complete task matrix before computing an aggregate score."
        });
      }
      return round(mean(cells.map((cell) => cell.score)), 1);
    };
    const baselineScore = conditionScore("baseline");
    const skillScore = conditionScore("skill");
    const upliftPoints = round(mean(benchmarkIds.map((benchmarkId) => {
      const baselineCell = projection.benchmarkResults.find((cell) => (
        cell.settingId === setting.id && cell.condition === "baseline" && cell.benchmarkId === benchmarkId
      ));
      const skillCell = projection.benchmarkResults.find((cell) => (
        cell.settingId === setting.id && cell.condition === "skill" && cell.benchmarkId === benchmarkId
      ));
      return skillCell.score - baselineCell.score;
    })), 1);
    const baselineEntry = projection.entries.find((entry) => (
      entry.settingId === setting.id && entry.condition === "baseline"
    ));
    const skillEntry = projection.entries.find((entry) => (
      entry.settingId === setting.id && entry.condition === "skill"
    ));
    if (
      setting.scores.baseline !== baselineScore || setting.scores.skill !== skillScore ||
      setting.deltas?.skill !== upliftPoints ||
      baselineEntry?.score !== baselineScore || baselineEntry?.baselineScore !== baselineScore ||
      baselineEntry?.delta !== 0 ||
      skillEntry?.score !== skillScore || skillEntry?.baselineScore !== baselineScore ||
      skillEntry?.delta !== upliftPoints
    ) {
      throw projectionError({
        message: `Public setting mixes incompatible score meanings: ${setting.id}`,
        suggestion: "Use the same equal-task absolute mean for settings and entries, and compute uplift only as the matched score difference.",
        context: {
          settingScores: setting.scores,
          settingDelta: setting.deltas?.skill,
          recomputed: { baselineScore, skillScore, upliftPoints },
          baselineEntry: baselineEntry && { score: baselineEntry.score, baselineScore: baselineEntry.baselineScore, delta: baselineEntry.delta },
          skillEntry: skillEntry && { score: skillEntry.score, baselineScore: skillEntry.baselineScore, delta: skillEntry.delta }
        }
      });
    }
  }

  for (const result of projection.results) {
    if (
      !benchmarkIds.includes(result.benchmarkId) || result.status !== "development" ||
      result.verification !== "unverified" || result.responseCount !== expectedResultEntryCount ||
      result.matchedConfigurationCount !== expectedConfigurationCount ||
      result.configurations?.length !== expectedConfigurationCount ||
      !Array.isArray(result.blockers) || result.blockers.length !== RESULT_BLOCKERS.length
    ) {
      throw projectionError({
        message: `Public benchmark result boundary is invalid: ${result.benchmarkId}`,
        suggestion: `Keep every result set explicitly development/unverified with the shared ${expectedConfigurationCount}-setting cohort.`
      });
    }
    validateEngineeringV2JudgingScope(
      result.judgingScope,
      `${result.benchmarkId}.judgingScope`,
      expectedResultEntryCount
    );
    assertConfigurationCohort(
      result.configurations.map((configuration) => configuration.configurationId),
      [...configurationIds],
      { label: `Public benchmark result ${result.benchmarkId}` }
    );
    assertScore(result.baselineScore, `${result.benchmarkId}.baselineScore`);
    assertScore(result.treatmentScore, `${result.benchmarkId}.treatmentScore`);
    for (const configuration of result.configurations) {
      if (!settingIds.has(configuration.settingId)) {
        throw projectionError({
          message: `Public result references an unknown setting: ${configuration.settingId}`,
          suggestion: `Regenerate result configurations from the shared ${expectedConfigurationCount}-setting cohort.`
        });
      }
      assertScore(configuration.baselineScore, `${result.benchmarkId}.baselineScore`);
      assertScore(configuration.treatmentScore, `${result.benchmarkId}.treatmentScore`);
      validateMetrics(configuration.baselineMetrics, `${result.benchmarkId}.baselineMetrics`, 1);
      validateMetrics(configuration.skillMetrics, `${result.benchmarkId}.skillMetrics`, 1);
    }
  }

  for (const summary of projection.benchmarkSummaries) {
    validateEngineeringV2JudgingScope(
      summary.judgingScope,
      `${summary.benchmarkId}.judgingScope`,
      expectedResultEntryCount
    );
  }

  validatePublicValue(projection);
  return projection;
}

export function validateBenchmarkPublicationResponses(responseBundle, projection) {
  if (projection?.schemaVersion === 6 && projection.writing) {
    validateBenchmarkPublicationProjection(projection);
    const { writing, ...existing } = projection;
    return validateBenchmarkPublicationResponses(responseBundle, { ...existing, schemaVersion: existing.games ? 5 : existing.overall ? 4 : existing.aiWorkflows ? 3 : 2 });
  }
  if (projection?.schemaVersion === 5 && projection.games) {
    validateBenchmarkPublicationProjection(projection);
    const { games, ...existing } = projection;
    return validateBenchmarkPublicationResponses(responseBundle, { ...existing, schemaVersion: existing.overall ? 4 : existing.aiWorkflows ? 3 : 2 });
  }
  if (projection?.schemaVersion === 4 && projection.overall) {
    validateBenchmarkPublicationProjection(projection);
    const { overall, ...sources } = projection;
    return validateBenchmarkPublicationResponses(responseBundle, { ...sources, schemaVersion: 3 });
  }
  if (projection?.schemaVersion === 3 && projection.aiWorkflows) {
    validateBenchmarkPublicationProjection(projection);
    const { aiWorkflows, ...engineeringProjection } = projection;
    const { aiWorkflows: workflowResponses, ...engineeringResponses } = responseBundle;
    if (responseBundle.schemaVersion !== 3 || !workflowResponses) throw projectionError({ message: "The workflow projection is missing its response evidence.", suggestion: "Regenerate both public modules from the same selected evidence." });
    validateBenchmarkPublicationResponses({ ...engineeringResponses, schemaVersion: 2 }, { ...engineeringProjection, schemaVersion: 2 });
    validateWorkSpecPublication(aiWorkflows, workflowResponses);
    return responseBundle;
  }
  validateBenchmarkPublicationProjection(projection);
  assertResponseObjectKeys(responseBundle, [
    "kind", "schemaVersion", "counts", "messageSets", "responses"
  ], "root");
  if (
    responseBundle.kind !== PUBLIC_RESPONSES_KIND ||
    responseBundle.schemaVersion !== PUBLIC_RESPONSES_SCHEMA_VERSION
  ) {
    throw projectionError({
      message: "The public responses kind or schema version is unsupported.",
      suggestion: `Regenerate schema-version ${PUBLIC_RESPONSES_SCHEMA_VERSION} response data.`
    });
  }
  if (!Array.isArray(responseBundle.messageSets) || !Array.isArray(responseBundle.responses)) {
    throw projectionError({
      message: "Public responses must contain messageSets and responses arrays.",
      suggestion: "Regenerate responses.js from the selected immutable benchmark rows."
    });
  }
  assertResponseObjectKeys(responseBundle.counts, [
    "benchmarks", "settings", "conditions", "responses", "messageSets", "judgments"
  ], "counts");

  const messageSetsById = new Map();
  for (const [index, messageSet] of responseBundle.messageSets.entries()) {
    assertResponseObjectKeys(messageSet, ["id", "messages"], `messageSets[${index}]`);
    if (
      !SHA256_PATTERN.test(messageSet.id ?? "") ||
      messageSetsById.has(messageSet.id) ||
      (index > 0 && responseBundle.messageSets[index - 1].id.localeCompare(messageSet.id) >= 0)
    ) {
      throw projectionError({
        message: `Public response message-set identity or ordering is invalid at index ${index}.`,
        suggestion: "Content-address and sort every unique ordered message set exactly once."
      });
    }
    validateExactMessages(messageSet.messages, `messageSets[${index}].messages`);
    if (sha256(stableSerialize(messageSet.messages)) !== messageSet.id) {
      throw projectionError({
        message: `Public response message-set content does not match its identity: ${messageSet.id}.`,
        suggestion: "Regenerate the content-addressed message sets from exact ordered messages."
      });
    }
    messageSetsById.set(messageSet.id, messageSet.messages);
  }

  const settingsById = new Map(projection.settings.map((setting) => [setting.id, setting]));
  const expectedCells = new Map(projection.benchmarkResults.map((cell) => [
    responseIdentity(cell),
    cell
  ]));
  const observedResponses = new Set();
  const referencedMessageSetIds = new Set();
  let judgmentCount = 0;
  for (const [index, response] of responseBundle.responses.entries()) {
    assertResponseObjectKeys(response, [
      "benchmarkId", "settingId", "configurationId", "condition", "trialNumber", "messageSetId", "outputText",
      "judgments"
    ], `responses[${index}]`);
    const identity = responseIdentity(response);
    const cell = expectedCells.get(identity);
    const setting = settingsById.get(response.settingId);
    if (
      observedResponses.has(identity) ||
      !cell ||
      !setting ||
      setting.configurationId !== response.configurationId ||
      response.trialNumber !== cell.trials ||
      !messageSetsById.has(response.messageSetId) ||
      (index > 0 && compareResponseRecords(responseBundle.responses[index - 1], response) >= 0)
    ) {
      throw projectionError({
        message: `Public response identity, source mapping, or ordering is invalid: ${identity}.`,
        suggestion: "Project one deterministically ordered response for every benchmark, setting, and condition cell."
      });
    }
    assertNonEmptyString(response.outputText, `responses[${index}].outputText`);
    if (containsPrivatePath(response.outputText)) {
      throw projectionError({
        message: `Public responses responses[${index}].outputText contains a private local path.`,
        suggestion: "Do not publish response evidence that exposes a local benchmark or filesystem path."
      });
    }
    if (
      !Array.isArray(response.judgments) ||
      response.judgments.length !== projection.scoreBasis.judgeCount ||
      stableSerialize(response.judgments.map(({ judgeConfigurationId }) => judgeConfigurationId)) !==
        stableSerialize(projection.scoreBasis.judges)
    ) {
      throw projectionError({
        message: `Public response judgments do not preserve the fixed panel: ${identity}.`,
        suggestion: "Project every judge rationale once in canonical panel order."
      });
    }
    for (const [judgmentIndex, judgment] of response.judgments.entries()) {
      const judgmentLabel = `responses[${index}].judgments[${judgmentIndex}]`;
      assertResponseObjectKeys(judgment, [
        "judgeConfigurationId", "score", "rawScore", "gateCap", "failedGates", "rationale"
      ], judgmentLabel);
      assertNonEmptyString(judgment.judgeConfigurationId, `${judgmentLabel}.judgeConfigurationId`);
      assertScore(judgment.score, `${judgmentLabel}.score`);
      assertScore(judgment.rawScore, `${judgmentLabel}.rawScore`);
      assertScore(judgment.gateCap, `${judgmentLabel}.gateCap`);
      assertNonEmptyString(judgment.rationale, `${judgmentLabel}.rationale`);
      if (containsPrivatePath(judgment.rationale)) {
        throw projectionError({
          message: `Public response ${judgmentLabel}.rationale contains a private local path.`,
          suggestion: "Do not publish judge evidence that exposes local provenance."
        });
      }
      if (
        !Array.isArray(judgment.failedGates) ||
        new Set(judgment.failedGates).size !== judgment.failedGates.length
      ) {
        throw projectionError({
          message: `Public response ${judgmentLabel}.failedGates is invalid.`,
          suggestion: "Project each failed rubric gate at most once."
        });
      }
      for (const [gateIndex, gateId] of judgment.failedGates.entries()) {
        assertIdentifier(gateId, `${judgmentLabel}.failedGates[${gateIndex}]`);
      }
      judgmentCount += 1;
    }
    observedResponses.add(identity);
    referencedMessageSetIds.add(response.messageSetId);
  }

  if (
    responseBundle.responses.length !== expectedCells.size ||
    observedResponses.size !== expectedCells.size ||
    [...expectedCells].some(([identity]) => !observedResponses.has(identity))
  ) {
    throw projectionError({
      message: "Public responses do not preserve the complete benchmark response matrix.",
      suggestion: "Project one response for every published benchmark, setting, and condition."
    });
  }
  if (
    referencedMessageSetIds.size !== messageSetsById.size ||
    [...messageSetsById.keys()].some((id) => !referencedMessageSetIds.has(id))
  ) {
    throw projectionError({
      message: "Public responses contain an unreferenced or missing exact message set.",
      suggestion: "Publish only content-addressed message sets referenced by the complete response matrix."
    });
  }
  const actualCounts = {
    benchmarks: new Set(responseBundle.responses.map(({ benchmarkId }) => benchmarkId)).size,
    settings: new Set(responseBundle.responses.map(({ settingId }) => settingId)).size,
    conditions: new Set(responseBundle.responses.map(({ condition }) => condition)).size,
    responses: responseBundle.responses.length,
    messageSets: responseBundle.messageSets.length,
    judgments: judgmentCount
  };
  const expectedCounts = {
    benchmarks: projection.counts.benchmarks,
    settings: projection.counts.settings,
    conditions: projection.counts.conditions,
    responses: projection.counts.responses,
    messageSets: actualCounts.messageSets,
    judgments: projection.counts.responses * projection.scoreBasis.judgeCount
  };
  for (const key of Object.keys(actualCounts)) {
    if (
      !Number.isInteger(responseBundle.counts[key]) ||
      responseBundle.counts[key] !== actualCounts[key] ||
      responseBundle.counts[key] !== expectedCounts[key]
    ) {
      throw projectionError({
        message: `Public responses counts.${key} does not match the published response matrix.`,
        suggestion: "Regenerate responses.js so declared counts match the validated projection and response records.",
        context: {
          key,
          declared: responseBundle.counts[key],
          actual: actualCounts[key],
          expected: expectedCounts[key]
        }
      });
    }
  }
  return responseBundle;
}

export function serializeBenchmarkPublicationProjection(projection) {
  validateBenchmarkPublicationProjection(projection);
  const serialized = JSON.stringify(projection)
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
  return `(function () {\n  'use strict';\n\n  window.VASIR_DATA = Object.freeze(${serialized});\n}());\n`;
}

export function serializeBenchmarkPublicationResponses(responseBundle, projection) {
  validateBenchmarkPublicationResponses(responseBundle, projection);
  const serialized = JSON.stringify(responseBundle)
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
  return `(function () {\n  'use strict';\n\n  window.VASIR_RESPONSES = Object.freeze(${serialized});\n}());\n`;
}

export function buildBenchmarkPublicationRoutes(projection) {
  validateBenchmarkPublicationProjection(projection);
  return {
    entrypoints: ["/", "/index.html", "/benchmark-report.html", ...(projection.games ? ["/games.html"] : [])],
    familyFragments: ["/#capabilities/overall", "/#capabilities/engineering", ...(projection.games ? ["/#capabilities/games"] : []), ...(projection.aiWorkflows ? ["/#capabilities/ai-workflows"] : []), ...(projection.writing ? ["/#capabilities/writing/storytelling"] : [])],
    viewFragments: [
      "/#capabilities/overall/benchmarks",
      "/#capabilities/overall/efficiency",
      "/#capabilities/engineering/benchmarks",
      "/#capabilities/engineering/efficiency",
      ...(projection.games ? ["/#capabilities/games/benchmarks", "/#capabilities/games/efficiency"] : []),
      ...(projection.aiWorkflows ? ["/#capabilities/ai-workflows/benchmarks", "/#capabilities/ai-workflows/efficiency"] : []),
      ...(projection.writing ? ["/#capabilities/writing/storytelling/benchmarks", "/#capabilities/writing/storytelling/efficiency"] : [])
    ],
    reportFragments: [
      ...Array.from(
        [...projection.benchmarks, ...(projection.aiWorkflows?.benchmarks ?? [])],
        (benchmark) => `/benchmark-report.html#${benchmark.reportFragment}`
      ),
      ...(projection.games ? (projection.games.benchmarks ?? [projection.games]).map(report => `/games.html?benchmark=${encodeURIComponent(report.benchmark.id)}`) : []),
      ...(projection.writing ? [`/benchmark-report.html#${projection.writing.benchmarkId}`] : [])
    ]
  };
}

export function buildBenchmarkPublicationProjection({
  repoRootDirectory,
  readFileSyncImplementation = fs.readFileSync
}) {
  assertNonEmptyString(repoRootDirectory, "repoRootDirectory");
  const publicResults = validatePublicResultsManifest(readJson({
    filePath: path.join(repoRootDirectory, PUBLIC_RESULTS_PATH),
    label: "VasirBench public result selection",
    readFileSyncImplementation
  }));
  const taxonomy = validateTaxonomy(readJson({
    filePath: path.join(repoRootDirectory, TAXONOMY_PATH),
    label: "VasirBench capability taxonomy",
    readFileSyncImplementation
  }));
  const engineeringTaxonomy = { ...taxonomy, categories: taxonomy.categories.filter(track => track.id !== WORK_SPEC_TRACK_ID) };

  const definitions = new Map();
  for (const benchmarkId of engineeringTaxonomy.categories[0].benchmarkIds) {
    const definition = validateBenchmarkDefinition(readJson({
      filePath: path.join(repoRootDirectory, "benchmarks", benchmarkId, "benchmark.json"),
      label: `VasirBench benchmark definition ${benchmarkId}`,
      readFileSyncImplementation
    }), { benchmarkId });
    definitions.set(benchmarkId, definition);
  }

  const selectedByBenchmarkId = new Map(publicResults.selectedRuns.map((selection) => [
    selection.benchmarkId,
    selection
  ]));
  const selections = EXPECTED_BENCHMARK_IDS.map((benchmarkId) => {
    const selection = selectedByBenchmarkId.get(benchmarkId);
    const selectedRun = readSelectedRun({ repoRootDirectory, selection, readFileSyncImplementation });
    return { ...selection, ...selectedRun };
  });
  const { runRecords, category } = createProjectionSources({
    selections,
    taxonomy: engineeringTaxonomy,
    definitions,
    repoRootDirectory,
    readFileSyncImplementation
  });
  const projection = createPresentationProjection({ taxonomy: engineeringTaxonomy, definitions, runRecords, category });
  validateBenchmarkPublicationProjection(projection);
  const responseBundle = createBenchmarkPublicationResponses({ projection, runRecords });
  const workflows = publicResults.workSpecRun ? buildWorkSpecPublication({ repoRootDirectory, selection: publicResults.workSpecRun, track: taxonomy.categories.find(track => track.id === WORK_SPEC_TRACK_ID), readFileSyncImplementation }) : null;
  if (workflows) {
    projection.schemaVersion = 3;
    projection.aiWorkflows = workflows.projection;
    responseBundle.schemaVersion = 3;
    responseBundle.aiWorkflows = workflows.responseBundle;
    projection.overall = buildOverallPublication({ engineering: projection, aiWorkflows: workflows.projection });
    projection.schemaVersion = 4;
  }

  const games = buildGamesPublication({ repoRootDirectory, readFileSyncImplementation });
  if (games) {
    projection.schemaVersion = 5;
    projection.games = games.projection;
  }

  const writing = buildWritingPublication({ repoRootDirectory, readFileSyncImplementation });
  if (writing) {
    projection.schemaVersion = 6;
    projection.writing = writing.stub;
  }

  const basisSha256 = sha256(stableSerialize({
    taxonomy,
    definitions: EXPECTED_BENCHMARK_IDS.map((benchmarkId) => definitions.get(benchmarkId)),
    selectedRuns: selections.map(({ benchmarkId, observedSha256 }) => ({ benchmarkId, sha256: observedSha256 })),
    ...(workflows ? { aiWorkflows: workflows.basisSha256, overall: projection.overall.scoreBasis.id } : {}),
    ...(games ? { games: games.basisSha256 } : {}),
    ...(writing ? { writing: writing.basisSha256 } : {})
  }));
  return {
    projection,
    dataSource: serializeBenchmarkPublicationProjection(projection),
    artifactFiles: games?.artifactFiles ?? [],
    responseBundle,
    responsesSource: serializeBenchmarkPublicationResponses(responseBundle, projection),
    writing: writing?.projection ?? null,
    writingResponses: writing?.responseBundle ?? null,
    writingDataSource: serializeWritingModule(writing?.projection ?? null, "VASIR_WRITING"),
    writingResponsesSource: serializeWritingModule(writing?.responseBundle ?? null, "VASIR_WRITING_RESPONSES"),
    basisSha256,
    routes: buildBenchmarkPublicationRoutes(projection),
    counts: workflows ? {
      ...projection.counts,
      families: projection.counts.families + workflows.projection.counts.families + (games ? 1 : 0) + (writing ? 1 : 0),
      tracks: projection.counts.tracks + workflows.projection.counts.tracks + (games ? 1 : 0) + (writing ? 1 : 0),
      benchmarks: projection.counts.benchmarks + workflows.projection.counts.benchmarks + (games ? 1 : 0) + (writing ? 1 : 0),
      categories: projection.counts.categories + workflows.projection.counts.categories + (writing ? 1 : 0),
      settings: new Set([...projection.settings, ...workflows.projection.settings, ...(writing?.projection.settings ?? [])].map(setting => setting.configurationId)).size,
      resultEntries: projection.counts.resultEntries + workflows.projection.counts.resultEntries + (writing?.projection.counts.resultEntries ?? 0),
      responses: projection.counts.responses + workflows.projection.counts.responses + (writing?.projection.counts.responses ?? 0),
      developmentResultSets: projection.counts.developmentResultSets + workflows.projection.counts.developmentResultSets + (writing ? 1 : 0)
    } : {
      ...projection.counts,
      ...(writing ? {
        families: projection.counts.families + 1,
        tracks: projection.counts.tracks + 1,
        benchmarks: projection.counts.benchmarks + 1,
        categories: projection.counts.categories + 1,
        settings: new Set([...projection.settings, ...writing.projection.settings].map(setting => setting.configurationId)).size,
        resultEntries: projection.counts.resultEntries + writing.projection.counts.resultEntries,
        responses: projection.counts.responses + writing.projection.counts.responses,
        developmentResultSets: projection.counts.developmentResultSets + 1
      } : {})
    }
  };
}
