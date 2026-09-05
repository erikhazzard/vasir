import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { VasirCliError } from "../cli-error.js";
import { EVAL_REFERENCE_DOCS_REF } from "../docs-ref.js";
import { createCommandUi } from "../ui/command-output.js";
import { runBenchmarkAgent } from "./agent-runtime.js";
import { createBenchmarkRowScoreBasisHash } from "./benchmark-basis.js";
import { writeBenchmarkCatalog } from "./benchmark-catalog.js";
import {
  judgeBenchmarkRows,
  resolveBenchmarkJudgingConfiguration
} from "./benchmark-judge.js";
import { resolveBenchmarkConfiguration } from "./benchmark-models.js";
import { writeBenchmarkReport } from "./benchmark-report.js";
import {
  createBenchmarkGenerationHash,
  createBenchmarkScoringHash,
  resolveBenchmarkSource
} from "./benchmark-source.js";
import {
  buildRunDirectoryPath,
  getEvalHistoryRootDirectory,
  readEvalRunArtifacts,
  writeEvalRunArtifacts
} from "./history.js";
import {
  BENCHMARK_HARNESS_VERSION,
  FABLE_5_1_ULTRACODE_CONFIGURATION_ID,
  FABLE_5_1_ULTRACODE_HARNESS_INSTRUCTION,
  FABLE_5_1_ULTRACODE_LEGACY_HARNESS_INSTRUCTION,
  FABLE_5_1_ULTRACODE_LEGACY_PROMPT_MODE_ID,
  createBenchmarkConditions,
  createBenchmarkGenerationPrompt,
  createBenchmarkPairs,
  createBenchmarkPromptModeOverrides,
  createBenchmarkRowBasisHash,
  createBenchmarkRowPlans,
  createBenchmarkSummary,
  generateBenchmarkRows,
  MAX_BENCHMARK_GENERATION_CONCURRENCY,
  NEUTRAL_HARNESS_INSTRUCTION,
  resolveBenchmarkTreatment
} from "./run-benchmark-eval.js";

function stableDigest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function createExtensionRunId(startedAt, sourceRunId, configurationIds) {
  const identityHash = stableDigest(JSON.stringify({
    sourceRunId,
    configurationIds,
    startedAt: startedAt.toISOString()
  })).slice(0, 12);
  return `${startedAt.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z")}__extend__${identityHash}`;
}

function failExtension({ code = "EVAL_BENCHMARK_EXTENSION_INCOMPATIBLE", message, suggestion }) {
  throw new VasirCliError({
    code,
    message,
    suggestion,
    docsRef: EVAL_REFERENCE_DOCS_REF
  });
}

function resolveExactConfigurations(requestedModelArguments) {
  if (!Array.isArray(requestedModelArguments) || requestedModelArguments.length === 0) {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_MODEL_REQUIRED",
      message: "Benchmark extension requires at least one exact model selector.",
      suggestion: "Use `--model <provider:model@effort>` once for every configuration to add."
    });
  }

  const configurations = requestedModelArguments.map((selector) =>
    resolveBenchmarkConfiguration(selector)
  );
  const configurationIds = new Set();
  for (const configuration of configurations) {
    if (configurationIds.has(configuration.id)) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_DUPLICATE",
        message: `Benchmark extension configuration is duplicated: ${configuration.id}`,
        suggestion: "Pass each exact `--model <provider:model@effort>` selector only once."
      });
    }
    configurationIds.add(configuration.id);
  }
  return configurations;
}

function compareStringArrays(left, right) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function promptModeOverridesMatch(recordedOverrides, expectedOverrides) {
  if (recordedOverrides === undefined) {
    return Object.keys(expectedOverrides).length === 0;
  }
  if (
    recordedOverrides === null ||
    Array.isArray(recordedOverrides) ||
    typeof recordedOverrides !== "object"
  ) {
    return false;
  }
  const recordedConfigurationIds = Object.keys(recordedOverrides).sort();
  const expectedConfigurationIds = Object.keys(expectedOverrides).sort();
  if (!compareStringArrays(recordedConfigurationIds, expectedConfigurationIds)) {
    return false;
  }
  return expectedConfigurationIds.every((configurationId) => {
    const recorded = recordedOverrides[configurationId];
    const expected = expectedOverrides[configurationId];
    return (
      recorded !== null &&
      !Array.isArray(recorded) &&
      typeof recorded === "object" &&
      compareStringArrays(Object.keys(recorded).sort(), ["hash", "id", "instruction"]) &&
      recorded.id === expected.id &&
      recorded.instruction === expected.instruction &&
      recorded.hash === expected.hash
    );
  });
}

function createLegacyUltracodeOverride() {
  return {
    id: FABLE_5_1_ULTRACODE_LEGACY_PROMPT_MODE_ID,
    instruction: FABLE_5_1_ULTRACODE_LEGACY_HARNESS_INSTRUCTION,
    hash: stableDigest(FABLE_5_1_ULTRACODE_LEGACY_HARNESS_INSTRUCTION)
  };
}

function resolveResumePromptModeMigration({
  resumeRun,
  configurations,
  addedConfigurations,
  addedRowPlans,
  benchmarkSource,
  treatment,
  trialCount
}) {
  const expectedOverrides = createBenchmarkPromptModeOverrides(configurations);
  const recordedOverrides = resumeRun.generation?.promptModeOverrides;
  if (promptModeOverridesMatch(recordedOverrides, expectedOverrides)) {
    return {
      configurationIds: new Set(),
      records: []
    };
  }

  const migrationConfiguration = addedConfigurations.find(
    (configuration) => configuration.id === FABLE_5_1_ULTRACODE_CONFIGURATION_ID
  );
  const currentOverride = expectedOverrides[FABLE_5_1_ULTRACODE_CONFIGURATION_ID];
  if (!migrationConfiguration || !currentOverride) {
    return null;
  }
  const legacyOverride = createLegacyUltracodeOverride();
  const legacyExpectedOverrides = {
    ...expectedOverrides,
    [FABLE_5_1_ULTRACODE_CONFIGURATION_ID]: legacyOverride
  };
  if (!promptModeOverridesMatch(recordedOverrides, legacyExpectedOverrides)) {
    return null;
  }

  const recordedRows = Array.isArray(resumeRun.rows) ? resumeRun.rows : [];
  const migrationRows = recordedRows.filter(
    (row) => row.configurationId === FABLE_5_1_ULTRACODE_CONFIGURATION_ID
  );
  if (migrationRows.some((row) => row.rowStatus === "complete")) {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_RESUME_INCOMPATIBLE",
      message: `Extension checkpoint contains completed ${FABLE_5_1_ULTRACODE_CONFIGURATION_ID} evidence under the retired prompt mode.`,
      suggestion: "Start a new extension run; completed paid evidence can never be silently rebased onto a new generation prompt."
    });
  }

  const migrationRowKeys = addedRowPlans
    .filter((rowPlan) => rowPlan.configuration.id === FABLE_5_1_ULTRACODE_CONFIGURATION_ID)
    .map((rowPlan) => createRowKey(rowPlan));
  const migrationRowKeySet = new Set(migrationRowKeys);
  if (migrationRows.some((row) => !migrationRowKeySet.has(row.rowKey))) {
    return null;
  }

  for (const rowPlan of addedRowPlans) {
    if (rowPlan.configuration.id !== FABLE_5_1_ULTRACODE_CONFIGURATION_ID) {
      continue;
    }
    const recordedRow = migrationRows.find((row) => row.rowKey === createRowKey(rowPlan));
    if (!recordedRow) {
      continue;
    }
    const treatmentForPrompt = rowPlan.condition.type === "skill" ? treatment : null;
    const legacyPromptText = createBenchmarkGenerationPrompt({
      caseDefinition: rowPlan.caseDefinition,
      outputContract: benchmarkSource.benchmarkDefinition.outputContract,
      treatment: treatmentForPrompt,
      harnessInstruction: FABLE_5_1_ULTRACODE_LEGACY_HARNESS_INSTRUCTION
    });
    const legacyRowPlan = {
      ...rowPlan,
      promptText: legacyPromptText,
      exactMessages: [{ role: "user", content: legacyPromptText }],
      basisHash: createBenchmarkRowBasisHash({
        benchmarkGenerationHash: benchmarkSource.benchmarkGenerationHash,
        configurationId: rowPlan.configuration.id,
        caseId: rowPlan.caseDefinition.id,
        trialCount,
        conditionHash: rowPlan.condition.hash,
        harnessInstruction: FABLE_5_1_ULTRACODE_LEGACY_HARNESS_INSTRUCTION
      })
    };
    validateAddedCheckpointRow({
      row: recordedRow,
      rowPlan: legacyRowPlan,
      resumeRunId: resumeRun.runId
    });
  }

  return {
    configurationIds: new Set([FABLE_5_1_ULTRACODE_CONFIGURATION_ID]),
    records: [{
      type: "failed-row-prompt-mode-upgrade",
      configurationId: FABLE_5_1_ULTRACODE_CONFIGURATION_ID,
      from: legacyOverride,
      to: currentOverride,
      migratedRowKeys: migrationRowKeys,
      priorRows: migrationRows.map((row) => ({
        rowKey: row.rowKey,
        rowStatus: row.rowStatus,
        error: row.error ?? null
      })),
      completedRowsRebased: 0,
      reason: "The v1 dynamic Workflow contract exceeded the one-shot lifecycle window; v2 bounds the retry to one phase and one worker."
    }]
  };
}

function createRowKey(rowPlan) {
  return [
    rowPlan.configuration.id,
    rowPlan.caseDefinition.id,
    `trial-${rowPlan.trialNumber}`,
    rowPlan.condition.id
  ].join("::");
}

function createPendingRow(rowPlan) {
  return {
    rowKey: createRowKey(rowPlan),
    configurationId: rowPlan.configuration.id,
    modelId: `${rowPlan.configuration.provider}:${rowPlan.configuration.model}`,
    provider: rowPlan.configuration.provider,
    model: rowPlan.configuration.model,
    reasoning: rowPlan.configuration.reasoning,
    caseId: rowPlan.caseDefinition.id,
    trialNumber: rowPlan.trialNumber,
    conditionId: rowPlan.condition.id,
    rowStatus: "pending",
    exactMessages: rowPlan.exactMessages,
    promptText: rowPlan.promptText,
    outputText: null,
    usage: null,
    costUsd: null,
    durationMs: null,
    runtimeReceipt: null,
    basisHash: rowPlan.basisHash,
    score: null,
    scoreBasisHash: null,
    error: null
  };
}

function validateAddedCheckpointRow({ row, rowPlan, resumeRunId }) {
  const expectedRow = createPendingRow(rowPlan);
  if (
    row?.rowKey !== expectedRow.rowKey ||
    row?.basisHash !== expectedRow.basisHash ||
    row?.configurationId !== expectedRow.configurationId ||
    row?.modelId !== expectedRow.modelId ||
    row?.provider !== expectedRow.provider ||
    row?.model !== expectedRow.model ||
    row?.reasoning !== expectedRow.reasoning ||
    row?.caseId !== expectedRow.caseId ||
    row?.trialNumber !== expectedRow.trialNumber ||
    row?.conditionId !== expectedRow.conditionId ||
    row?.promptText !== expectedRow.promptText ||
    JSON.stringify(row?.exactMessages) !== JSON.stringify(expectedRow.exactMessages) ||
    !["pending", "complete", "error", "unavailable"].includes(row?.rowStatus)
  ) {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_RESUME_INCOMPATIBLE",
      message: `Extension checkpoint row disagrees with the current generation plan: ${row?.rowKey ?? expectedRow.rowKey}`,
      suggestion: `Resume only the exact extension plan recorded by ${resumeRunId}.`
    });
  }
  if (
    row.rowStatus === "complete" &&
    (typeof row.outputText !== "string" || row.outputText.trim() === "")
  ) {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_RESUME_INCOMPATIBLE",
      message: `Extension checkpoint marks an empty response complete: ${row.rowKey}`,
      suggestion: "Use an untampered checkpoint or start a new extension run from the immutable source."
    });
  }
}

function sourceEvidenceSnapshot(row) {
  return {
    rowKey: row.rowKey,
    configurationId: row.configurationId,
    modelId: row.modelId,
    provider: row.provider,
    model: row.model,
    reasoning: row.reasoning,
    caseId: row.caseId,
    trialNumber: row.trialNumber,
    conditionId: row.conditionId,
    rowStatus: row.rowStatus,
    exactMessages: row.exactMessages,
    promptText: row.promptText,
    outputText: row.outputText,
    usage: row.usage,
    costUsd: row.costUsd,
    durationMs: row.durationMs,
    runtimeReceipt: row.runtimeReceipt,
    basisHash: row.basisHash,
    score: row.score,
    scoreBasisHash: row.scoreBasisHash,
    error: row.error
  };
}

function validateResumeRun({
  resumeRun,
  resumeRunId,
  sourceRun,
  sourceRows,
  configurations,
  addedConfigurations,
  addedRowPlans,
  benchmarkSource,
  treatment,
  conditions,
  trialCount
}) {
  const promptModeMigration = resolveResumePromptModeMigration({
    resumeRun,
    configurations,
    addedConfigurations,
    addedRowPlans,
    benchmarkSource,
    treatment,
    trialCount
  });
  const expectedJudgingScope = createExtensionJudgingScope({
    sourceRun,
    sourceRows,
    addedRows: addedRowPlans
  });
  if (resumeRun.runId !== resumeRunId || resumeRun.kind !== "benchmark") {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_RESUME_INCOMPATIBLE",
      message: `Resume target is not the requested benchmark extension: ${resumeRunId}`,
      suggestion: "Use the exact incomplete extension run id returned by `vasir eval extend`."
    });
  }
  if (resumeRun.runStatus === "complete") {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_ALREADY_COMPLETE",
      message: `Benchmark extension is already complete: ${resumeRunId}`,
      suggestion: "Use the completed artifact, or start a new extension from another immutable source run."
    });
  }
  const expectedConfigurationIds = configurations.map((configuration) => configuration.id);
  const recordedConfigurationIds = Array.isArray(resumeRun.configurations)
    ? resumeRun.configurations.map((configuration) => configuration.id)
    : [];
  if (
    resumeRun.extension?.sourceRunId !== sourceRun.runId ||
    resumeRun.extension?.sourceRowCount !== sourceRows.length ||
    !compareStringArrays(
      resumeRun.extension?.extendedConfigurationIds ?? [],
      addedConfigurations.map((configuration) => configuration.id)
    ) ||
    !compareStringArrays(recordedConfigurationIds, expectedConfigurationIds) ||
    resumeRun.benchmark?.generationHash !== benchmarkSource.benchmarkGenerationHash ||
    resumeRun.harnessVersion !== BENCHMARK_HARNESS_VERSION ||
    resumeRun.generation?.trialCount !== trialCount ||
    resumeRun.generation?.neutralHarnessInstruction !== NEUTRAL_HARNESS_INSTRUCTION ||
    promptModeMigration === null ||
    JSON.stringify(resumeRun.extension?.judgingScope) !== JSON.stringify(expectedJudgingScope) ||
    JSON.stringify(resumeRun.judging?.extensionScope) !== JSON.stringify(expectedJudgingScope) ||
    resumeRun.treatment?.id !== treatment.id ||
    resumeRun.treatment?.hash !== treatment.hash ||
    !Array.isArray(resumeRun.conditions) ||
    resumeRun.conditions.length !== conditions.length ||
    conditions.some((condition, index) =>
      resumeRun.conditions[index]?.id !== condition.id ||
      resumeRun.conditions[index]?.hash !== condition.hash
    )
  ) {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_RESUME_INCOMPATIBLE",
      message: `Extension checkpoint does not match the requested source, configurations, or generation basis: ${resumeRunId}`,
      suggestion: "Use the exact source run and exact --model selectors recorded by the incomplete extension."
    });
  }

  const recordedRows = Array.isArray(resumeRun.rows) ? resumeRun.rows : [];
  const recordedRowsByKey = new Map();
  for (const row of recordedRows) {
    if (recordedRowsByKey.has(row.rowKey)) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_RESUME_INCOMPATIBLE",
        message: `Extension checkpoint contains a duplicate row key: ${row.rowKey}`,
        suggestion: "Use an untampered incomplete extension artifact."
      });
    }
    recordedRowsByKey.set(row.rowKey, row);
  }
  const expectedRowKeys = new Set([
    ...sourceRows.map((row) => row.rowKey),
    ...addedRowPlans.map((rowPlan) => createRowKey(rowPlan))
  ]);
  for (const recordedRowKey of recordedRowsByKey.keys()) {
    if (!expectedRowKeys.has(recordedRowKey)) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_RESUME_INCOMPATIBLE",
        message: `Extension checkpoint contains an unplanned row key: ${recordedRowKey}`,
        suggestion: "Use an untampered checkpoint for the exact recorded configuration set."
      });
    }
  }
  for (const sourceRow of sourceRows) {
    const recordedRow = recordedRowsByKey.get(sourceRow.rowKey);
    if (
      !recordedRow ||
      JSON.stringify(sourceEvidenceSnapshot(recordedRow)) !==
        JSON.stringify(sourceEvidenceSnapshot(sourceRow))
    ) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_RESUME_INCOMPATIBLE",
        message: `Extension checkpoint changed immutable source evidence: ${sourceRow.rowKey}`,
        suggestion: "Use an untampered checkpoint linked to the named immutable source run."
      });
    }
  }
  const addedRowsByKey = new Map();
  for (const rowPlan of addedRowPlans) {
    const rowKey = createRowKey(rowPlan);
    const row = recordedRowsByKey.get(rowKey);
    if (!row) {
      continue;
    }
    if (!promptModeMigration.configurationIds.has(rowPlan.configuration.id)) {
      validateAddedCheckpointRow({ row, rowPlan, resumeRunId });
    }
    addedRowsByKey.set(rowKey, row);
  }
  return {
    addedRowsByKey,
    promptModeMigrations: promptModeMigration.records
  };
}

function validateConfiguration(configuration) {
  let resolved;
  try {
    resolved = resolveBenchmarkConfiguration(configuration?.id);
  } catch {
    failExtension({
      message: `Source configuration is not a currently supported exact selector: ${configuration?.id ?? "<missing>"}`,
      suggestion: "Choose an unmodified benchmark run whose configuration metadata is currently resolvable."
    });
  }
  if (
    resolved.id !== configuration.id ||
    resolved.provider !== configuration.provider ||
    resolved.model !== configuration.model ||
    resolved.reasoning !== configuration.reasoning
  ) {
    failExtension({
      message: `Source configuration metadata disagrees with its exact selector: ${configuration?.id ?? "<missing>"}`,
      suggestion: "Choose an unmodified benchmark run whose configuration metadata is internally consistent."
    });
  }
}

function validateSourceRun({
  sourceRun,
  benchmarkSource,
  treatment,
  conditions,
  addedConfigurations
}) {
  if (sourceRun.kind !== "benchmark" || !sourceRun.benchmark?.definition) {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_SOURCE_UNSUPPORTED",
      message: `Source run is not an independent benchmark artifact: ${sourceRun.runId}`,
      suggestion: "Choose a run created by `vasir eval run <benchmark>`."
    });
  }
  if (sourceRun.runStatus !== "complete" || sourceRun.judging?.status !== "complete") {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_SOURCE_INCOMPLETE",
      message: `Source run ${sourceRun.runId} is not a complete scored benchmark artifact.`,
      suggestion: "Choose a complete source run whose response rows already have final scores."
    });
  }
  if (
    sourceRun.benchmark.id !== benchmarkSource.benchmarkId ||
    sourceRun.benchmark.definition.id !== benchmarkSource.benchmarkId
  ) {
    failExtension({
      message: `Source run ${sourceRun.runId} belongs to a different benchmark.`,
      suggestion: `Choose an immutable ${benchmarkSource.benchmarkId} run.`
    });
  }

  const recordedGenerationHash = createBenchmarkGenerationHash(sourceRun.benchmark.definition);
  if (
    sourceRun.benchmark.generationHash !== recordedGenerationHash ||
    recordedGenerationHash !== benchmarkSource.benchmarkGenerationHash
  ) {
    failExtension({
      message: `Source run ${sourceRun.runId} does not match the current benchmark generation contract.`,
      suggestion: "Choose a source run created from the current benchmark cases and output contract."
    });
  }
  const recordedScoringHash = createBenchmarkScoringHash(sourceRun.benchmark.definition);
  if (
    sourceRun.benchmark.scoringHash !== recordedScoringHash ||
    recordedScoringHash !== benchmarkSource.benchmarkScoringHash
  ) {
    failExtension({
      message: `Source run ${sourceRun.runId} does not use the current scoring rubric and judging panel.`,
      suggestion: "Choose a source run scored under the current benchmark scoring and judging contract."
    });
  }
  if (sourceRun.harnessVersion !== BENCHMARK_HARNESS_VERSION) {
    failExtension({
      message: `Source run ${sourceRun.runId} uses benchmark harness version ${sourceRun.harnessVersion ?? "<missing>"}, not ${BENCHMARK_HARNESS_VERSION}.`,
      suggestion: "Choose a source run created with the current benchmark harness."
    });
  }

  const trialCount = sourceRun.generation?.trialCount;
  if (!Number.isInteger(trialCount) || trialCount <= 0) {
    failExtension({
      message: `Source run ${sourceRun.runId} has an invalid trial count.`,
      suggestion: "Choose a source run with a recorded positive generation trial count."
    });
  }
  if (sourceRun.generation?.neutralHarnessInstruction !== NEUTRAL_HARNESS_INSTRUCTION) {
    failExtension({
      message: `Source run ${sourceRun.runId} does not use the current neutral benchmark harness.`,
      suggestion: "Choose a source run created with the current neutral harness instruction."
    });
  }
  if (sourceRun.generation?.freshAgentSessions !== true) {
    failExtension({
      message: `Source run ${sourceRun.runId} does not prove fresh generation sessions.`,
      suggestion: "Choose a source run whose generation metadata records fresh agent sessions."
    });
  }
  if (sourceRun.treatment?.id !== treatment.id || sourceRun.treatment?.hash !== treatment.hash) {
    failExtension({
      message: `Source run ${sourceRun.runId} treatment no longer resolves to the same immutable content.`,
      suggestion: "Restore the exact source treatment or create a fresh full-cohort benchmark run."
    });
  }

  const recordedConditions = Array.isArray(sourceRun.conditions) ? sourceRun.conditions : [];
  if (
    recordedConditions.length !== conditions.length ||
    conditions.some((condition, index) => {
      const recorded = recordedConditions[index];
      return recorded?.id !== condition.id || recorded?.type !== condition.type || recorded?.hash !== condition.hash;
    })
  ) {
    failExtension({
      message: `Source run ${sourceRun.runId} condition identities do not match the current extension plan.`,
      suggestion: "Choose a source run with the current clean and treatment condition hashes."
    });
  }

  if (!Array.isArray(sourceRun.benchmark.definition.cases)) {
    failExtension({
      message: `Source run ${sourceRun.runId} has no recorded benchmark case set.`,
      suggestion: "Choose an unmodified benchmark run with its complete benchmark definition."
    });
  }
  const currentCaseIds = benchmarkSource.benchmarkDefinition.cases.map((caseDefinition) => caseDefinition.id);
  const sourceCaseIds = sourceRun.benchmark.definition.cases.map((caseDefinition) => caseDefinition.id);
  if (!compareStringArrays(sourceCaseIds, currentCaseIds)) {
    failExtension({
      message: `Source run ${sourceRun.runId} case set does not match the current benchmark.`,
      suggestion: "Choose a source run with the current ordered case set."
    });
  }

  const sourceConfigurations = Array.isArray(sourceRun.configurations)
    ? sourceRun.configurations
    : [];
  if (sourceConfigurations.length === 0) {
    failExtension({
      message: `Source run ${sourceRun.runId} has no benchmark configurations.`,
      suggestion: "Choose a source run with a complete recorded configuration matrix."
    });
  }
  const sourceConfigurationIds = new Set();
  for (const configuration of sourceConfigurations) {
    validateConfiguration(configuration);
    if (sourceConfigurationIds.has(configuration.id)) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_DUPLICATE",
        message: `Source run configuration is duplicated: ${configuration.id}`,
        suggestion: "Choose an immutable source run with unique configuration ids."
      });
    }
    sourceConfigurationIds.add(configuration.id);
  }
  const expectedPromptModeOverrides = createBenchmarkPromptModeOverrides(sourceConfigurations);
  if (!promptModeOverridesMatch(
    sourceRun.generation?.promptModeOverrides,
    expectedPromptModeOverrides
  )) {
    failExtension({
      message: `Source run ${sourceRun.runId} has incompatible benchmark prompt-mode metadata.`,
      suggestion: "Choose an unmodified source run whose recorded prompt modes match its exact configurations."
    });
  }
  for (const configuration of addedConfigurations) {
    if (sourceConfigurationIds.has(configuration.id)) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_DUPLICATE",
        message: `Benchmark configuration already exists in source run ${sourceRun.runId}: ${configuration.id}`,
        suggestion: "Pass only exact model configurations that are absent from the source cohort."
      });
    }
  }

  const sourceRowPlans = createBenchmarkRowPlans({
    benchmarkSource,
    configurations: sourceConfigurations,
    trialCount,
    conditions,
    treatment
  });
  const expectedPlansByRowKey = new Map(
    sourceRowPlans.map((rowPlan) => [createRowKey(rowPlan), rowPlan])
  );
  const sourceRows = Array.isArray(sourceRun.rows) ? sourceRun.rows : [];
  if (sourceRows.length !== expectedPlansByRowKey.size) {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_SOURCE_INCOMPLETE",
      message: `Source run ${sourceRun.runId} has ${sourceRows.length} rows; its configuration matrix requires ${expectedPlansByRowKey.size}.`,
      suggestion: "Choose a source run with every configuration, case, trial, and condition cell present."
    });
  }

  const rowsByKey = new Map();
  for (const row of sourceRows) {
    if (rowsByKey.has(row.rowKey)) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_DUPLICATE",
        message: `Source run row key is duplicated: ${row.rowKey}`,
        suggestion: "Choose an immutable source run with unique row keys."
      });
    }
    rowsByKey.set(row.rowKey, row);

    const rowPlan = expectedPlansByRowKey.get(row.rowKey);
    const configuration = sourceConfigurations.find((entry) => entry.id === row.configurationId);
    if (!rowPlan || !configuration) {
      failExtension({
        message: `Source run contains a row outside its declared matrix: ${row.rowKey}`,
        suggestion: "Choose an unmodified source run whose rows match its declared configurations."
      });
    }
    if (row.rowStatus !== "complete" || typeof row.outputText !== "string" || row.outputText.trim() === "") {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_SOURCE_INCOMPLETE",
        message: `Source row is not reusable and complete: ${row.rowKey}`,
        suggestion: "Choose a source run whose every response row completed with non-empty output."
      });
    }
    if (!Number.isFinite(row.score?.total) || typeof row.scoreBasisHash !== "string" || row.scoreBasisHash === "") {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_SOURCE_INCOMPLETE",
        message: `Source row has no reusable final score basis: ${row.rowKey}`,
        suggestion: "Choose a source run whose every response row has a final score and score basis hash."
      });
    }

    const expectedBasisHash = rowPlan.basisHash;
    if (
      row.basisHash !== expectedBasisHash ||
      row.configurationId !== configuration.id ||
      row.modelId !== `${configuration.provider}:${configuration.model}` ||
      row.provider !== configuration.provider ||
      row.model !== configuration.model ||
      row.reasoning !== configuration.reasoning ||
      row.caseId !== rowPlan.caseDefinition.id ||
      row.trialNumber !== rowPlan.trialNumber ||
      row.conditionId !== rowPlan.condition.id ||
      row.promptText !== rowPlan.promptText ||
      JSON.stringify(row.exactMessages) !== JSON.stringify(rowPlan.exactMessages)
    ) {
      failExtension({
        message: `Source row generation basis disagrees with the current extension plan: ${row.rowKey}`,
        suggestion: "Choose an unmodified source run with current row basis hashes and exact prompts."
      });
    }
  }
  for (const expectedRowKey of expectedPlansByRowKey.keys()) {
    if (!rowsByKey.has(expectedRowKey)) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_SOURCE_INCOMPLETE",
        message: `Source run is missing required row: ${expectedRowKey}`,
        suggestion: "Choose a source run with a complete response matrix."
      });
    }
  }

  return { sourceConfigurations, sourceRows, sourceRowKeys: new Set(rowsByKey.keys()), trialCount };
}

function createExtensionJudgingScope({ sourceRun, sourceRows, addedRows }) {
  return {
    strategy: "appended-rows-only-v1",
    sourceRunId: sourceRun.runId,
    sourceRowCount: sourceRows.length,
    appendedRowCount: addedRows.length,
    combinedRowCount: sourceRows.length + addedRows.length,
    sourceScoresPreserved: true,
    sourceJudgingStatus: sourceRun.judging?.status ?? null,
    sourceJudgingBasisHash: sourceRun.judging?.basisHash ?? null
  };
}

function createPendingJudging(judgingPlan, rows, extensionScope) {
  return {
    status: "pending",
    judgeConfiguration: judgingPlan.synthesizer ?? judgingPlan.panel[0],
    judgeConfigurations: judgingPlan.panel,
    synthesizerConfiguration: judgingPlan.synthesizer,
    freshContext: true,
    blinded: true,
    calibrationStatus: "author-calibration-pending",
    extensionScope,
    cohortHash: null,
    cohortSize: rows.filter((row) => row.rowStatus === "complete").length,
    promptHash: null,
    candidateOrder: [],
    judges: [],
    synthesis: null,
    basisHash: null,
    promptText: null,
    ranking: [],
    comparativeNote: "",
    runtimeReceipt: null,
    usage: null,
    costUsd: null,
    durationMs: null,
    error: null
  };
}

function createJudgingError(error, judgingPlan, rows, extensionScope) {
  return {
    ...createPendingJudging(judgingPlan, rows, extensionScope),
    status: "error",
    error: {
      code: error?.code ?? "EVAL_BENCHMARK_JUDGE_FAILED",
      message: error?.message ?? "Fresh benchmark judging failed.",
      suggestion: error?.suggestion ?? null,
      context: error?.context && typeof error.context === "object" ? error.context : null
    }
  };
}

function openLocalReport({ reportFilePath, platform, spawnSyncImplementation }) {
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const commandArguments = platform === "win32" ? ["/c", "start", "", reportFilePath] : [reportFilePath];
  const result = spawnSyncImplementation(command, commandArguments, { stdio: "ignore" });
  return result?.status === 0;
}

export async function extendBenchmarkEval({
  benchmarkName,
  sourceRunId,
  homeDirectory,
  currentWorkingDirectory = process.cwd(),
  projectRootDirectory = null,
  repositoryUrl,
  platform = process.platform,
  spawnSyncImplementation,
  requestedModelArguments = [],
  resumeRunId = null,
  openReport = false,
  stdoutWriter = (message) => process.stdout.write(message),
  jsonOutput = false,
  environmentVariables = process.env,
  agentRunnerImplementation = runBenchmarkAgent,
  judgeRowsImplementation = judgeBenchmarkRows,
  reportWriterImplementation = writeBenchmarkReport,
  generationCheckpointImplementation = null,
  generationConcurrency = MAX_BENCHMARK_GENERATION_CONCURRENCY,
  nowImplementation = () => new Date()
}) {
  const addedConfigurations = resolveExactConfigurations(requestedModelArguments);
  if (
    typeof sourceRunId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sourceRunId)
  ) {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_SOURCE_REQUIRED",
      message: "Benchmark extension requires one valid explicit source run id.",
      suggestion: "Use the exact run directory name from `.agents/vasir-evals/<benchmark>/`."
    });
  }

  const benchmarkSource = resolveBenchmarkSource({
    benchmarkName,
    currentWorkingDirectory,
    projectRootDirectory
  });
  const recorded = readEvalRunArtifacts({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName: benchmarkName,
    runId: sourceRunId
  });
  const sourceRun = recorded.run;
  if (sourceRun.kind !== "benchmark" || !sourceRun.benchmark?.definition) {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_SOURCE_UNSUPPORTED",
      message: `Source run is not an independent benchmark artifact: ${sourceRun.runId}`,
      suggestion: "Choose a run created by `vasir eval run <benchmark>`."
    });
  }
  const treatmentId = sourceRun.treatment?.id;
  if (typeof treatmentId !== "string" || !treatmentId.startsWith("skill:")) {
    failExtension({
      code: "EVAL_BENCHMARK_EXTENSION_SOURCE_UNSUPPORTED",
      message: `Source run ${sourceRun.runId} has no supported benchmark treatment snapshot.`,
      suggestion: "Choose a source run created with `--treatment skill:<name>`."
    });
  }
  const treatment = resolveBenchmarkTreatment({
    treatmentId,
    currentWorkingDirectory,
    projectRootDirectory,
    homeDirectory,
    repositoryUrl,
    platform,
    spawnSyncImplementation
  });
  const conditions = createBenchmarkConditions(treatment);
  const validatedSource = validateSourceRun({
    sourceRun,
    benchmarkSource,
    treatment,
    conditions,
    addedConfigurations
  });
  const addedRowPlans = createBenchmarkRowPlans({
    benchmarkSource,
    configurations: addedConfigurations,
    trialCount: validatedSource.trialCount,
    conditions,
    treatment
  });
  const addedRowKeys = new Set();
  for (const rowPlan of addedRowPlans) {
    const rowKey = createRowKey(rowPlan);
    if (validatedSource.sourceRowKeys.has(rowKey) || addedRowKeys.has(rowKey)) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_DUPLICATE",
        message: `Benchmark extension row key is duplicated: ${rowKey}`,
        suggestion: "Pass only configurations that are disjoint from the source run."
      });
    }
    addedRowKeys.add(rowKey);
  }

  const extendedConfigurationIds = addedConfigurations.map((configuration) => configuration.id);
  const reusedRows = structuredClone(validatedSource.sourceRows);
  const configurations = [
    ...structuredClone(validatedSource.sourceConfigurations),
    ...structuredClone(addedConfigurations)
  ];
  let startedAt;
  let runId;
  let resumedAddedRowsByKey = null;
  let resumedPriorJudging = null;
  let recordedPromptModeMigrations = [];
  let newPromptModeMigrations = [];
  let effectiveGenerationConcurrency = Number.isInteger(generationConcurrency) && generationConcurrency > 0
    ? generationConcurrency
    : MAX_BENCHMARK_GENERATION_CONCURRENCY;
  if (resumeRunId !== null) {
    if (
      typeof resumeRunId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(resumeRunId)
    ) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_RESUME_REQUIRED",
        message: "--resume requires one valid extension run id.",
        suggestion: "Use the exact incomplete extension run directory name."
      });
    }
    const resumeRecorded = readEvalRunArtifacts({
      currentWorkingDirectory,
      projectRootDirectory,
      skillName: benchmarkName,
      runId: resumeRunId
    });
    const parsedStartedAt = new Date(resumeRecorded.run.startedAt);
    if (Number.isNaN(parsedStartedAt.getTime())) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_RESUME_INCOMPATIBLE",
        message: `Extension checkpoint has no valid start time: ${resumeRunId}`,
        suggestion: "Use an untampered incomplete extension artifact."
      });
    }
    const resumeValidation = validateResumeRun({
      resumeRun: resumeRecorded.run,
      resumeRunId,
      sourceRun,
      sourceRows: validatedSource.sourceRows,
      configurations,
      addedConfigurations,
      addedRowPlans,
      benchmarkSource,
      treatment,
      conditions,
      trialCount: validatedSource.trialCount
    });
    resumedAddedRowsByKey = resumeValidation.addedRowsByKey;
    resumedPriorJudging = structuredClone(resumeRecorded.run.judging ?? null);
    recordedPromptModeMigrations = Array.isArray(
      resumeRecorded.run.extension?.promptModeMigrations
    )
      ? structuredClone(resumeRecorded.run.extension.promptModeMigrations)
      : [];
    newPromptModeMigrations = resumeValidation.promptModeMigrations;
    if (
      !Number.isInteger(resumeRecorded.run.generation?.concurrency) ||
      resumeRecorded.run.generation.concurrency <= 0
    ) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_RESUME_INCOMPATIBLE",
        message: `Extension checkpoint has no valid generation concurrency: ${resumeRunId}`,
        suggestion: "Use an untampered incomplete extension artifact."
      });
    }
    effectiveGenerationConcurrency = resumeRecorded.run.generation.concurrency;
    startedAt = parsedStartedAt;
    runId = resumeRunId;
  } else {
    startedAt = nowImplementation();
    runId = createExtensionRunId(startedAt, sourceRun.runId, extendedConfigurationIds);
    const prospectiveRunDirectory = buildRunDirectoryPath({
      currentWorkingDirectory,
      projectRootDirectory,
      skillName: benchmarkName,
      runId
    });
    if (fs.existsSync(prospectiveRunDirectory)) {
      failExtension({
        code: "EVAL_BENCHMARK_EXTENSION_RUN_EXISTS",
        message: `Benchmark extension run already exists: ${runId}`,
        suggestion: "Rerun the extension so it receives a new immutable run id."
      });
    }
  }

  const extensionJudgingScope = createExtensionJudgingScope({
    sourceRun,
    sourceRows: reusedRows,
    addedRows: addedRowPlans
  });
  const extension = {
    sourceRunId: sourceRun.runId,
    sourceRowCount: reusedRows.length,
    extendedConfigurationIds,
    judgingScope: extensionJudgingScope,
    ...(
      recordedPromptModeMigrations.length + newPromptModeMigrations.length > 0
        ? {
            promptModeMigrations: [
              ...recordedPromptModeMigrations,
              ...newPromptModeMigrations
            ]
          }
        : {}
    )
  };
  const runMetadata = {
    kind: "benchmark",
    schemaVersion: 1,
    runId,
    benchmarkName,
    skillName: benchmarkName,
    benchmark: {
      id: benchmarkSource.benchmarkId,
      title: benchmarkSource.benchmarkDefinition.title,
      description: benchmarkSource.benchmarkDefinition.description,
      hash: benchmarkSource.benchmarkHash,
      generationHash: benchmarkSource.benchmarkGenerationHash,
      scoringHash: benchmarkSource.benchmarkScoringHash,
      sourceType: benchmarkSource.sourceType,
      definition: benchmarkSource.benchmarkDefinition
    },
    treatment,
    conditions,
    configurations,
    generation: {
      trialCount: validatedSource.trialCount,
      concurrency: effectiveGenerationConcurrency,
      neutralHarnessInstruction: NEUTRAL_HARNESS_INSTRUCTION,
      promptModeOverrides: createBenchmarkPromptModeOverrides(configurations),
      freshAgentSessions: true
    },
    extension,
    harnessVersion: BENCHMARK_HARNESS_VERSION,
    scorerVersion: benchmarkSource.benchmarkDefinition.scoring.version,
    startedAt: startedAt.toISOString()
  };
  const judgingPlan = resolveBenchmarkJudgingConfiguration(
    benchmarkSource.benchmarkDefinition.judging
  );
  const checkpointAddedRowsByKey = new Map();
  for (const rowPlan of addedRowPlans) {
    const rowKey = createRowKey(rowPlan);
    const resumedRow = resumedAddedRowsByKey?.get(rowKey) ?? null;
    checkpointAddedRowsByKey.set(
      rowKey,
      resumedRow?.rowStatus === "complete"
        ? { ...structuredClone(resumedRow), score: null, scoreBasisHash: null }
        : createPendingRow(rowPlan)
    );
  }
  const createCheckpointRows = () => [
    ...reusedRows,
    ...addedRowPlans.map((rowPlan) => checkpointAddedRowsByKey.get(createRowKey(rowPlan)))
  ];
  const persistGenerationCheckpoint = () => {
    const checkpointRows = createCheckpointRows();
    const checkpointAddedRows = addedRowPlans.map(
      (rowPlan) => checkpointAddedRowsByKey.get(createRowKey(rowPlan))
    );
    const checkpointJudging = createPendingJudging(
      judgingPlan,
      checkpointAddedRows,
      extensionJudgingScope
    );
    const checkpointPairs = createBenchmarkPairs({
      rows: checkpointRows,
      treatmentId: treatment.id
    });
    const checkpointSummary = createBenchmarkSummary({
      rows: checkpointRows,
      pairs: checkpointPairs,
      configurations,
      treatmentId: treatment.id,
      judging: checkpointJudging
    });
    writeEvalRunArtifacts({
      currentWorkingDirectory,
      projectRootDirectory,
      skillName: benchmarkName,
      runId,
      runPayload: {
        ...runMetadata,
        runStatus: "incomplete",
        judging: checkpointJudging,
        summary: checkpointSummary,
        pairs: checkpointPairs,
        rows: checkpointRows,
        completedAt: null
      }
    });
    return checkpointRows;
  };

  persistGenerationCheckpoint();
  const rowPlansToGenerate = addedRowPlans.filter((rowPlan) =>
    checkpointAddedRowsByKey.get(createRowKey(rowPlan))?.rowStatus !== "complete"
  );
  const recoveredRowCount = addedRowPlans.length - rowPlansToGenerate.length;
  const ui = createCommandUi({ stream: process.stdout });
  if (!jsonOutput) {
    stdoutWriter(ui.renderPanel({
      title: resumeRunId ? `Resume benchmark ${benchmarkName}` : `Extend benchmark ${benchmarkName}`,
      lines: [
        ui.formatField("extension run", runId),
        ui.formatField("source run", sourceRun.runId),
        ui.formatField("reuse", `${validatedSource.sourceRows.length} source + ${recoveredRowCount} checkpoint rows`),
        ui.formatField("add", extendedConfigurationIds.join(", ")),
        ui.formatField("generate", `${rowPlansToGenerate.length} fresh agent sessions remaining`),
        ui.formatField(
          "judge",
          `${addedRowPlans.length} appended response rows · preserve ${validatedSource.sourceRows.length} source scores`
        )
      ]
    }));
  }

  let completedCount = 0;
  if (rowPlansToGenerate.length > 0) {
    await generateBenchmarkRows({
      rowPlans: rowPlansToGenerate,
      environmentVariables,
      agentRunnerImplementation,
      concurrency: runMetadata.generation.concurrency,
      onRowComplete: async (row, rowPlan) => {
        const rowKey = createRowKey(rowPlan);
        if (row.rowKey !== rowKey || row.basisHash !== rowPlan.basisHash) {
          failExtension({
            code: "EVAL_BENCHMARK_EXTENSION_CHECKPOINT_INVALID",
            message: `Generated row identity changed before checkpointing: ${rowKey}`,
            suggestion: "Retry the exact extension after repairing the benchmark row generator."
          });
        }
        checkpointAddedRowsByKey.set(rowKey, row);
        persistGenerationCheckpoint();
        await generationCheckpointImplementation?.({
          runId,
          row: structuredClone(row),
          completedRowCount: completedCount + 1,
          remainingRowCount: rowPlansToGenerate.length - completedCount - 1
        });
        completedCount += 1;
        if (!jsonOutput) {
          stdoutWriter(
            `· ${completedCount}/${rowPlansToGenerate.length} ${rowPlan.configuration.id} ${rowPlan.condition.label}\n`
          );
        }
      }
    });
  }
  let rows = createCheckpointRows();
  const addedRows = addedRowPlans.map(
    (rowPlan) => checkpointAddedRowsByKey.get(createRowKey(rowPlan))
  );
  const clearAddedScores = () => {
    for (const row of addedRows) {
      row.score = null;
      row.scoreBasisHash = null;
    }
  };
  let judging = createPendingJudging(judgingPlan, addedRows, extensionJudgingScope);
  let pairs = createBenchmarkPairs({ rows, treatmentId: treatment.id });
  let summary = createBenchmarkSummary({
    rows,
    pairs,
    configurations,
    treatmentId: treatment.id,
    judging
  });

  if (rows.every((row) => row.rowStatus === "complete")) {
    let judgeResult = null;
    try {
      judgeResult = await judgeRowsImplementation({
        benchmarkDefinition: benchmarkSource.benchmarkDefinition,
        rows: addedRows,
        runSeed: runId,
        judgingConfiguration: judgingPlan,
        priorJudging: resumedPriorJudging,
        environmentVariables,
        agentRunnerImplementation
      });
    } catch (error) {
      clearAddedScores();
      judging = createJudgingError(
        error,
        judgingPlan,
        addedRows,
        extensionJudgingScope
      );
    }

    if (judgeResult?.judging?.status !== "complete" && judgeResult !== null) {
      clearAddedScores();
      judging = {
        ...createPendingJudging(judgingPlan, addedRows, extensionJudgingScope),
        ...structuredClone(judgeResult.judging ?? {}),
        status: judgeResult.judging?.status ?? "error",
        extensionScope: extensionJudgingScope,
        basisHash: null
      };
    } else if (judgeResult !== null) {
      try {
        if (!(judgeResult.scoresByRowKey instanceof Map)) {
          failExtension({
            code: "EVAL_BENCHMARK_EXTENSION_JUDGING_INVALID",
            message: "Benchmark extension judging returned no row-score map.",
            suggestion: "Repair the current benchmark judge, then resume this exact extension."
          });
        }
        for (const scoredRowKey of judgeResult.scoresByRowKey.keys()) {
          if (!addedRows.some((row) => row.rowKey === scoredRowKey)) {
            failExtension({
              code: "EVAL_BENCHMARK_EXTENSION_JUDGING_INVALID",
              message: `Benchmark extension judging returned a row outside the appended cohort: ${scoredRowKey}`,
              suggestion: "Repair the current benchmark judge, then resume this exact extension."
            });
          }
        }
        if (
          Number.isInteger(judgeResult.judging.cohortSize) &&
          judgeResult.judging.cohortSize !== addedRows.length
        ) {
          failExtension({
            code: "EVAL_BENCHMARK_EXTENSION_JUDGING_INVALID",
            message: `Benchmark extension judge scored ${judgeResult.judging.cohortSize} candidates, not the full ${addedRows.length}-row appended cohort.`,
            suggestion: "Repair the current benchmark judge, then resume this exact extension."
          });
        }

        const judgeCohortHash = judgeResult.judging.cohortHash ?? stableDigest(
          addedRows.map((row) => row.rowKey).sort().join(":")
        );
        const judgePromptHash = judgeResult.judging.promptHash ?? stableDigest(
          judgeResult.judging.promptText ?? ""
        );
        const judgeBasisHash = judgeResult.judging.basisHash ?? stableDigest([
          judgeResult.judging.judgeConfiguration?.id ?? judgingPlan.synthesizer?.id ?? judgingPlan.panel[0].id,
          benchmarkSource.benchmarkScoringHash,
          judgePromptHash,
          judgeCohortHash
        ].join(":"));
        for (const row of addedRows) {
          const score = judgeResult.scoresByRowKey.get(row.rowKey);
          const scoreMinimum = benchmarkSource.benchmarkDefinition.scoring.scoreRange.min;
          const scoreMaximum = benchmarkSource.benchmarkDefinition.scoring.scoreRange.max;
          if (
            !score ||
            !Number.isFinite(score.total) ||
            score.total < scoreMinimum ||
            score.total > scoreMaximum
          ) {
            failExtension({
              code: "EVAL_BENCHMARK_EXTENSION_JUDGING_INVALID",
              message: `Benchmark extension judge omitted a complete numeric score for ${row.rowKey}.`,
              suggestion: "Repair the current benchmark judge, then resume this exact extension."
            });
          }
          row.score = score;
          row.scoreBasisHash = createBenchmarkRowScoreBasisHash({
            row,
            scoringHash: benchmarkSource.benchmarkScoringHash,
            scoringVersion: benchmarkSource.benchmarkDefinition.scoring.version
          }) ?? stableDigest([
            row.basisHash,
            benchmarkSource.benchmarkScoringHash,
            judgeBasisHash
          ].join(":"));
        }
        judging = {
          ...judgeResult.judging,
          extensionScope: extensionJudgingScope,
          basisHash: judgeBasisHash,
          promptHash: judgePromptHash,
          cohortHash: judgeCohortHash,
          cohortSize: addedRows.length
        };
      } catch (error) {
        clearAddedScores();
        judging = {
          ...createPendingJudging(judgingPlan, addedRows, extensionJudgingScope),
          ...structuredClone(judgeResult.judging),
          status: "error",
          extensionScope: extensionJudgingScope,
          basisHash: null,
          error: {
            code: error?.code ?? "EVAL_BENCHMARK_EXTENSION_JUDGING_INVALID",
            message: error?.message ?? "Benchmark extension judging returned invalid evidence.",
            suggestion: error?.suggestion ?? "Repair the current benchmark judge, then resume this exact extension.",
            context: error?.context && typeof error.context === "object" ? error.context : null
          }
        };
      }
    }
  }

  pairs = createBenchmarkPairs({ rows, treatmentId: treatment.id });
  summary = createBenchmarkSummary({
    rows,
    pairs,
    configurations,
    treatmentId: treatment.id,
    judging
  });
  const runStatus = summary.rowCounts.complete === summary.rowCounts.expected &&
    summary.rowCounts.scored === summary.rowCounts.expected &&
    judging.status === "complete"
    ? "complete"
    : "incomplete";
  const completedAt = nowImplementation();
  const run = {
    ...runMetadata,
    runStatus,
    judging,
    summary,
    pairs,
    rows,
    completedAt: completedAt.toISOString()
  };
  const outputDirectory = writeEvalRunArtifacts({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName: benchmarkName,
    runId,
    runPayload: run
  });
  const reportFilePath = path.join(outputDirectory, "report.html");
  await reportWriterImplementation({ run, outputFilePath: reportFilePath });
  const catalogFilePath = writeBenchmarkCatalog({
    historyRootDirectory: getEvalHistoryRootDirectory({
      currentWorkingDirectory,
      projectRootDirectory
    })
  });
  const reportOpened = openReport
    ? openLocalReport({ reportFilePath, platform, spawnSyncImplementation })
    : false;

  if (!jsonOutput) {
    stdoutWriter(ui.renderPanel({
      title: runStatus === "complete" ? "Benchmark extension complete" : "Benchmark extension incomplete",
      lines: [
        ui.formatField("source run", sourceRun.runId),
        ui.formatField("new run", runId),
        ui.formatField("status", runStatus),
        ui.formatField("responses", `${summary.rowCounts.complete}/${summary.rowCounts.expected}`),
        ui.formatField("scores", `${summary.rowCounts.scored}/${summary.rowCounts.expected}`),
        ...(runStatus === "incomplete"
          ? [ui.formatField(
              "recover",
              `vasir eval extend ${benchmarkName} ${sourceRun.runId} ${extendedConfigurationIds.map((id) => `--model ${id}`).join(" ")} --resume ${runId}`
            )]
          : []),
        ui.formatField("report", reportFilePath),
        ...(openReport ? [ui.formatField("opened", reportOpened ? "yes" : "no")] : [])
      ]
    }));
  }

  return {
    subcommand: "extend",
    runId,
    sourceRunId: sourceRun.runId,
    sourceRowCount: reusedRows.length,
    extendedConfigurationIds,
    resumed: resumeRunId !== null,
    recoveredRowCount,
    generatedRowCount: rowPlansToGenerate.length,
    runStatus,
    benchmarkName,
    outputDirectory,
    reportFilePath,
    catalogFilePath,
    reportOpened,
    summary
  };
}
