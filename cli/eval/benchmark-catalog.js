import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeBenchmarkReportData } from "./benchmark-report.js";

const FONT_DIRECTORY_PATH = fileURLToPath(new URL("./vendor/fonts/", import.meta.url));
const CAPABILITY_TAXONOMY_FILE_PATH = fileURLToPath(
  new URL("../../benchmarks/capability-taxonomy.json", import.meta.url)
);
const FONT_FILES = [
  ["Plus Jakarta Sans", "plus-jakarta-400.woff2.b64", 400, "normal"],
  ["Plus Jakarta Sans", "plus-jakarta-700.woff2.b64", 700, "normal"],
  ["JetBrains Mono", "jetbrains-mono-600.woff2.b64", 600, "normal"]
];
const ABSOLUTE_SCORE_METHOD = "equal-benchmark-absolute-mean-v1";
const SYNTHESIS_FREE_JUDGING_STRATEGIES = new Set([
  "matched-pair-panel-median-v1",
  "matched-pair-panel-consensus-v1"
]);

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashValue(value) {
  return crypto.createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function mean(values) {
  return values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderEmbeddedFontStyles() {
  return FONT_FILES.map(([family, fileName, weight, style]) => {
    const encodedFont = fs.readFileSync(path.join(FONT_DIRECTORY_PATH, fileName), "utf8")
      .replace(/\s+/g, "");
    return `@font-face{font-family:"${family}";src:url("data:font/woff2;base64,${encodedFont}") format("woff2");font-style:${style};font-weight:${weight};font-display:swap;}`;
  }).join("\n");
}

function readJson(runFilePath) {
  try {
    return JSON.parse(fs.readFileSync(runFilePath, "utf8"));
  } catch {
    return null;
  }
}

function isKebabIdentifier(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function validateCapabilityTaxonomy(taxonomy, taxonomyFilePath) {
  if (
    taxonomy?.schemaVersion !== 3 ||
    typeof taxonomy.version !== "string" ||
    !taxonomy.version.trim() ||
    !Array.isArray(taxonomy.categories)
  ) {
    throw new Error(`Capability taxonomy is invalid at ${taxonomyFilePath}.`);
  }

  const categoryIds = new Set();
  const mappedBenchmarkIds = new Set();
  for (const category of taxonomy.categories) {
    if (
      !category ||
      !isKebabIdentifier(category.id) ||
      typeof category.title !== "string" ||
      !category.title.trim() ||
      typeof category.description !== "string" ||
      !category.description.trim() ||
      !Array.isArray(category.benchmarkIds) ||
      category.benchmarkIds.length === 0 ||
      !isKebabIdentifier(category.modelScore?.edition) ||
      category.modelScore?.method !== ABSOLUTE_SCORE_METHOD ||
      category.modelScore?.benchmarkWeighting !== "equal" ||
      category.modelScore?.scaleMaximum !== 100 ||
      category.effect?.method !== "paired-absolute-delta-v1" ||
      category.effect?.benchmarkWeighting !== "equal" ||
      category.effect?.unit !== "rubric-points" ||
      category.uncertainty?.status !== "not-estimated" ||
      typeof category.uncertainty?.reason !== "string" ||
      !category.uncertainty.reason.trim()
    ) {
      throw new Error(`Capability category is invalid at ${taxonomyFilePath}.`);
    }
    if (categoryIds.has(category.id)) {
      throw new Error(`Capability category id is duplicated at ${taxonomyFilePath}: ${category.id}.`);
    }
    categoryIds.add(category.id);
    for (const benchmarkId of category.benchmarkIds) {
      if (typeof benchmarkId !== "string" || !benchmarkId.trim() || mappedBenchmarkIds.has(benchmarkId)) {
        throw new Error(`Capability benchmark mapping is invalid at ${taxonomyFilePath}: ${benchmarkId}.`);
      }
      mappedBenchmarkIds.add(benchmarkId);
    }
  }
  return taxonomy;
}

export function readBenchmarkCapabilityTaxonomy({
  taxonomyFilePath = CAPABILITY_TAXONOMY_FILE_PATH
} = {}) {
  const taxonomy = readJson(taxonomyFilePath);
  return validateCapabilityTaxonomy(taxonomy, taxonomyFilePath);
}

function runSortKey(record) {
  const completedAt = typeof record.run?.completedAt === "string" ? record.run.completedAt : "";
  const runId = typeof record.run?.runId === "string" ? record.run.runId : "";
  return `${completedAt}\u0000${runId}`;
}

function reportHref(benchmarkName, runId) {
  return `./${encodeURIComponent(benchmarkName)}/${encodeURIComponent(runId)}/report.html`;
}

function statusFromReport(run, report) {
  return run?.runStatus === "complete" && report.source.matrixComplete
    ? "complete"
    : "incomplete";
}

function normalizeCalibrationStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (!status || status === "unknown") {
    return "Not recorded";
  }
  if (status.includes("pending")) {
    return "Pending";
  }
  if (status.includes("uncalibrated")) {
    return "Uncalibrated";
  }
  if (status.includes("calibrated")) {
    return "Calibrated";
  }
  return status.replaceAll(/[-_]+/g, " ").replace(/^./, (character) => character.toUpperCase());
}

function normalizeAttempt(record) {
  const report = normalizeBenchmarkReportData(record.run);
  return {
    runId: report.runId,
    status: statusFromReport(record.run, report),
    completedRowCount: report.source.completedRowCount,
    expectedRowCount: report.source.expectedRowCount,
    href: reportHref(record.benchmarkName, report.runId)
  };
}

export function readBenchmarkCatalogRunRecords({ historyRootDirectory }) {
  if (!historyRootDirectory || !fs.existsSync(historyRootDirectory)) {
    return [];
  }

  const records = [];
  for (const benchmarkDirectoryEntry of fs.readdirSync(historyRootDirectory, { withFileTypes: true })) {
    if (!benchmarkDirectoryEntry.isDirectory()) {
      continue;
    }
    const benchmarkName = benchmarkDirectoryEntry.name;
    const benchmarkDirectoryPath = path.join(historyRootDirectory, benchmarkName);
    for (const runDirectoryEntry of fs.readdirSync(benchmarkDirectoryPath, { withFileTypes: true })) {
      if (!runDirectoryEntry.isDirectory()) {
        continue;
      }
      const runDirectoryPath = path.join(benchmarkDirectoryPath, runDirectoryEntry.name);
      const runFilePath = path.join(runDirectoryPath, "run.json");
      if (!fs.existsSync(runFilePath)) {
        continue;
      }
      const run = readJson(runFilePath);
      if (run?.kind !== "benchmark" || typeof run.runId !== "string") {
        continue;
      }
      records.push({
        benchmarkName,
        runDirectoryPath,
        runFilePath,
        reportFilePath: path.join(runDirectoryPath, "report.html"),
        run
      });
    }
  }
  return records.sort((left, right) => runSortKey(left).localeCompare(runSortKey(right)));
}

export function selectBenchmarkCatalogRuns(records) {
  const recordsByBenchmark = new Map();
  for (const record of records) {
    const benchmarkId = record.run?.benchmark?.id ?? record.run?.benchmarkName ?? record.benchmarkName;
    if (!recordsByBenchmark.has(benchmarkId)) {
      recordsByBenchmark.set(benchmarkId, []);
    }
    recordsByBenchmark.get(benchmarkId).push(record);
  }

  return [...recordsByBenchmark.entries()].map(([benchmarkId, benchmarkRecords]) => {
    const ordered = [...benchmarkRecords].sort((left, right) => runSortKey(left).localeCompare(runSortKey(right)));
    const latest = ordered.at(-1);
    const complete = ordered.filter((record) => {
      const report = normalizeBenchmarkReportData(record.run);
      return statusFromReport(record.run, report) === "complete";
    });
    return {
      benchmarkId,
      featured: complete.at(-1) ?? latest,
      latest
    };
  }).sort((left, right) => left.benchmarkId.localeCompare(right.benchmarkId));
}

export function normalizeBenchmarkCatalogEntry(selection) {
  const run = selection.featured.run;
  const report = normalizeBenchmarkReportData(run);
  const featuredStatus = statusFromReport(run, report);
  const latestAttempt = normalizeAttempt(selection.latest);
  const featuredAttempt = normalizeAttempt(selection.featured);
  const hasNewerAttempt = latestAttempt.runId !== featuredAttempt.runId;
  const matchedOutcomes = (report.matchedDeltas ?? [])
    .filter((pair) => Number.isFinite(pair.clean) && Number.isFinite(pair.vasir) && Number.isFinite(pair.delta))
    .map((pair) => ({ clean: pair.clean, treatment: pair.vasir, delta: pair.delta }));
  const record = matchedOutcomes.reduce((result, pair) => {
    if (pair.delta > 0) {
      result.wins += 1;
    } else if (pair.delta < 0) {
      result.losses += 1;
    } else {
      result.ties += 1;
    }
    return result;
  }, { wins: 0, ties: 0, losses: 0 });
  const conditionDefinitions = Array.isArray(run.conditions) ? run.conditions : [];
  const configurationCount = Array.isArray(run.configurations) ? run.configurations.length : 0;
  const expectedScoreCountPerCondition = configurationCount > 0 && conditionDefinitions.length > 0
    ? report.source.expectedRowCount / (configurationCount * conditionDefinitions.length)
    : 0;
  const panelConfigurationIds = Array.isArray(run.judging?.judgeConfigurations)
    ? run.judging.judgeConfigurations.map((configuration) => configuration.id)
    : [];
  return {
    benchmarkId: report.benchmarkId,
    title: report.benchmarkTitle,
    description: run?.benchmark?.definition?.description ?? "",
    prompt: report.prompt,
    featuredRunId: report.runId,
    featuredStatus,
    featuredHref: reportHref(selection.featured.benchmarkName, report.runId),
    completedRowCount: report.source.completedRowCount,
    expectedRowCount: report.source.expectedRowCount,
    observedLift: report.observedLift,
    bestConfiguration: report.bestConfiguration
      ? {
          label: report.bestConfiguration.configurationLabel,
          conditionLabel: report.bestConfiguration.conditionLabel,
          score: report.bestConfiguration.score
        }
      : null,
    calibrationStatus: normalizeCalibrationStatus(report.judge.calibrationStatus),
    scorerVersion: report.source.scorerVersion,
    treatment: {
      id: run.treatment?.id ?? report.treatment.id,
      label: run.treatment?.label ?? report.treatment.label,
      hash: run.treatment?.hash ?? ""
    },
    matchedOutcomes,
    matchedPairCount: matchedOutcomes.length,
    expectedMatchedPairCount: report.matchedCount,
    expectedScoreCountPerCondition,
    conditionScores: {
      clean: mean(matchedOutcomes.map((pair) => pair.clean)),
      treatment: mean(matchedOutcomes.map((pair) => pair.treatment))
    },
    configurationScores: report.comparisons.map((comparison) => ({
      configurationId: comparison.modelKey,
      modelId: comparison.modelId,
      modelLabel: comparison.modelLabel,
      configurationLabel: comparison.configurationLabel,
      provider: comparison.provider,
      reasoningEffort: comparison.reasoningEffort,
      cleanScore: comparison.cleanScore,
      treatmentScore: comparison.vasirScore,
      lift: comparison.lift,
      cleanCount: comparison.cleanCount,
      treatmentCount: comparison.vasirCount
    })),
    record,
    compatibility: {
      harnessVersion: run.harnessVersion ?? null,
      trialCount: report.source.trialCount,
      configurationIds: Array.isArray(run.configurations)
        ? run.configurations.map((configuration) => configuration.id).sort((left, right) => left.localeCompare(right))
        : [],
      conditionContract: conditionDefinitions.map((condition) => ({
        id: condition.id,
        type: condition.type,
        hash: condition.hash ?? ""
      })),
      judgingStrategy: run.judging?.strategy ?? "",
      panelConfigurationIds,
      synthesizerConfigurationId: run.judging?.synthesizerConfiguration?.id ?? "",
      batchPlanVersion: run.judging?.batchPlan?.version ?? "",
      judgingBasisHash: run.judging?.basisHash ?? "",
      generationHash: run.benchmark?.generationHash ?? "",
      scoringHash: run.benchmark?.scoringHash ?? ""
    },
    latestAttempt: hasNewerAttempt ? latestAttempt : null
  };
}

function categoryCompatibilityKey(entry) {
  const { compatibility } = entry;
  return stableSerialize({
    harnessVersion: compatibility.harnessVersion,
    trialCount: compatibility.trialCount,
    configurationIds: compatibility.configurationIds,
    conditionContract: compatibility.conditionContract.map((condition) => ({
      id: condition.id,
      type: condition.type
    })),
    judgingStrategy: compatibility.judgingStrategy,
    panelConfigurationIds: compatibility.panelConfigurationIds,
    synthesizerConfigurationId: compatibility.synthesizerConfigurationId,
    batchPlanVersion: compatibility.batchPlanVersion
  });
}

function formatCompatibilityProblem(benchmarkIds, label) {
  return `${label}: ${benchmarkIds.join(", ")}`;
}

function buildCategoryBasisHash(taxonomy, categoryDefinition, entries) {
  return hashValue({
    taxonomyVersion: taxonomy.version,
    categoryId: categoryDefinition.id,
    modelScore: categoryDefinition.modelScore,
    effect: categoryDefinition.effect,
    uncertainty: categoryDefinition.uncertainty,
    sources: entries.map((entry) => ({
      benchmarkId: entry.benchmarkId,
      runId: entry.featuredRunId,
      treatmentId: entry.treatment.id,
      treatmentHash: entry.treatment.hash,
      judgingBasisHash: entry.compatibility.judgingBasisHash,
      generationHash: entry.compatibility.generationHash,
      scoringHash: entry.compatibility.scoringHash
    }))
  });
}

function roundScore(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function rankModelScores(scores, scoreKey, rankKey) {
  const ordered = [...scores].sort((left, right) => (
    right[scoreKey] - left[scoreKey] || left.configurationLabel.localeCompare(right.configurationLabel)
  ));
  let previousScore = null;
  let previousRank = 0;
  for (const [index, score] of ordered.entries()) {
    if (score[scoreKey] !== previousScore) {
      previousRank = index + 1;
      previousScore = score[scoreKey];
    }
    score[rankKey] = previousRank;
  }
}

function calculateCombinedLeaderboardRuns(scores) {
  const runs = scores.flatMap((score) => [
    { conditionId: "clean", conditionLabel: "Without Vasir", scoreKey: "baselineScoreRaw" },
    { conditionId: "treatment", conditionLabel: "With Vasir", scoreKey: "skillScoreRaw" }
  ].map((condition) => {
    const taskScores = score.benchmarks.map((benchmark) => ({
      benchmarkId: benchmark.benchmarkId,
      value: condition.conditionId === "clean" ? benchmark.baselineScore : benchmark.skillScore
    }));
    return {
      runId: `${score.configurationId}:${condition.conditionId}`,
      configurationId: score.configurationId,
      configurationLabel: score.configurationLabel,
      modelId: score.modelId,
      modelLabel: score.modelLabel,
      provider: score.provider,
      reasoningEffort: score.reasoningEffort,
      conditionId: condition.conditionId,
      conditionLabel: condition.conditionLabel,
      scoreRaw: score[condition.scoreKey],
      baselineScore: roundScore(score.baselineScoreRaw),
      skillScore: roundScore(score.skillScoreRaw),
      upliftPoints: roundScore(score.upliftPointsRaw),
      taskScores
    };
  }));

  rankModelScores(runs, "scoreRaw", "rank");
  return runs.map(({ scoreRaw, ...run }) => ({
    ...run,
    score: roundScore(scoreRaw)
  })).sort((left, right) => left.rank - right.rank || left.configurationLabel.localeCompare(right.configurationLabel) || left.conditionId.localeCompare(right.conditionId));
}

function calculateCategoryModelScores(entries, definition) {
  const expectedConfigurationIds = entries[0]?.compatibility.configurationIds ?? [];
  const scores = [];
  const problems = [];
  for (const configurationId of expectedConfigurationIds) {
    const contributions = entries.map((entry) => ({
      entry,
      score: entry.configurationScores.find((candidate) => candidate.configurationId === configurationId)
    }));
    const incomplete = contributions.filter(({ entry, score }) => (
      !score ||
      !Number.isFinite(score.cleanScore) ||
      !Number.isFinite(score.treatmentScore) ||
      score.cleanCount !== entry.expectedScoreCountPerCondition ||
      score.treatmentCount !== entry.expectedScoreCountPerCondition
    ));
    if (incomplete.length > 0) {
      problems.push(`${configurationId} is missing a complete clean/with-Vasir score for ${incomplete.map(({ entry }) => entry.benchmarkId).join(", ")}.`);
      continue;
    }
    const first = contributions[0].score;
    const benchmarkScores = contributions.map(({ entry, score }) => ({
      benchmarkId: entry.benchmarkId,
      title: entry.title,
      href: entry.featuredHref,
      baselineScore: score.cleanScore,
      skillScore: score.treatmentScore,
      upliftPoints: score.treatmentScore - score.cleanScore
    }));
    const record = benchmarkScores.reduce((total, benchmark) => {
      if (benchmark.upliftPoints > 0) total.wins += 1;
      else if (benchmark.upliftPoints < 0) total.losses += 1;
      else total.ties += 1;
      return total;
    }, { wins: 0, ties: 0, losses: 0 });
    const baselineScoreRaw = mean(benchmarkScores.map((benchmark) => benchmark.baselineScore));
    const skillScoreRaw = mean(benchmarkScores.map((benchmark) => benchmark.skillScore));
    const upliftPointsRaw = mean(benchmarkScores.map((benchmark) => benchmark.upliftPoints));
    scores.push({
      configurationId,
      modelId: first.modelId,
      modelLabel: first.modelLabel,
      configurationLabel: first.configurationLabel,
      provider: first.provider,
      reasoningEffort: first.reasoningEffort,
      baselineScoreRaw,
      skillScoreRaw,
      upliftPointsRaw,
      record,
      benchmarkCount: contributions.length,
      requiredBenchmarkCount: definition.benchmarkIds.length,
      benchmarks: benchmarkScores.map((benchmark) => ({
        ...benchmark,
        baselineScore: roundScore(benchmark.baselineScore),
        skillScore: roundScore(benchmark.skillScore),
        upliftPoints: roundScore(benchmark.upliftPoints)
      }))
    });
  }
  rankModelScores(scores, "baselineScoreRaw", "baselineRank");
  rankModelScores(scores, "skillScoreRaw", "skillRank");
  const runs = calculateCombinedLeaderboardRuns(scores);
  const normalizedScores = scores.map(({
    baselineScoreRaw,
    skillScoreRaw,
    upliftPointsRaw,
    ...score
  }) => ({
    ...score,
    baselineScore: roundScore(baselineScoreRaw),
    skillScore: roundScore(skillScoreRaw),
    upliftPoints: roundScore(upliftPointsRaw)
  }));
  return {
    method: definition.modelScore.method,
    edition: definition.modelScore.edition,
    effectMethod: definition.effect.method,
    uncertainty: definition.uncertainty,
    scaleMaximum: definition.modelScore.scaleMaximum,
    scores: normalizedScores.sort((left, right) => left.baselineRank - right.baselineRank || left.configurationLabel.localeCompare(right.configurationLabel)),
    runs,
    problems
  };
}

function normalizeCatalogCategory({ taxonomy, definition, entriesByBenchmarkId }) {
  const benchmarkIds = definition.benchmarkIds;
  const entries = benchmarkIds
    .map((benchmarkId) => entriesByBenchmarkId.get(benchmarkId))
    .filter(Boolean);
  if (entries.length === 0) {
    return null;
  }

  const problems = [];
  const missingBenchmarkIds = benchmarkIds.filter((benchmarkId) => !entriesByBenchmarkId.has(benchmarkId));
  if (missingBenchmarkIds.length > 0) {
    problems.push(formatCompatibilityProblem(missingBenchmarkIds, "Missing mapped benchmarks"));
  }

  const incompleteBenchmarkIds = entries
    .filter((entry) => entry.featuredStatus !== "complete")
    .map((entry) => entry.benchmarkId);
  if (incompleteBenchmarkIds.length > 0) {
    problems.push(formatCompatibilityProblem(incompleteBenchmarkIds, "Incomplete featured evidence"));
  }

  const treatmentIds = new Set(entries.map((entry) => entry.treatment.id));
  const treatmentHashes = new Set(entries.map((entry) => entry.treatment.hash).filter(Boolean));
  const unscoredBenchmarkIds = entries
    .filter((entry) => (
      entry.matchedPairCount === 0 ||
      entry.matchedPairCount !== entry.expectedMatchedPairCount ||
      entry.record.wins + entry.record.ties + entry.record.losses !== entry.matchedPairCount
    ))
    .map((entry) => entry.benchmarkId);
  if (unscoredBenchmarkIds.length > 0) {
    problems.push(formatCompatibilityProblem(unscoredBenchmarkIds, "Incomplete matched outcomes"));
  }
  if (treatmentIds.size !== 1 || treatmentHashes.size !== 1 || entries.some((entry) => !entry.treatment.hash)) {
    problems.push("Mapped prompts do not share one exact treatment id and snapshot.");
  }

  const compatibilityKeys = new Set(entries.map(categoryCompatibilityKey));
  if (compatibilityKeys.size !== 1) {
    problems.push("Mapped prompts do not share one harness, model matrix, condition, and judge contract.");
  }
  const missingBasisIds = entries
    .filter((entry) => (
      !Number.isFinite(entry.compatibility.harnessVersion) ||
      entry.compatibility.configurationIds.length === 0 ||
      !entry.compatibility.judgingStrategy ||
      entry.compatibility.panelConfigurationIds.length === 0 ||
      (
        !SYNTHESIS_FREE_JUDGING_STRATEGIES.has(entry.compatibility.judgingStrategy) &&
        !entry.compatibility.synthesizerConfigurationId
      ) ||
      !entry.compatibility.batchPlanVersion ||
      !entry.compatibility.judgingBasisHash ||
      !entry.compatibility.generationHash ||
      !entry.compatibility.scoringHash
    ))
    .map((entry) => entry.benchmarkId);
  if (missingBasisIds.length > 0) {
    problems.push(formatCompatibilityProblem(missingBasisIds, "Comparison basis is incomplete"));
  }

  const unsupportedCalibrationIds = entries
    .filter((entry) => !["Calibrated", "Pending", "Uncalibrated"].includes(entry.calibrationStatus))
    .map((entry) => entry.benchmarkId);
  if (unsupportedCalibrationIds.length > 0) {
    problems.push(formatCompatibilityProblem(unsupportedCalibrationIds, "Calibration state cannot support this score edition"));
  }

  const complete = problems.length === 0;
  const modelScoreResult = complete
    ? calculateCategoryModelScores(entries, definition)
    : { method: definition.modelScore.method, edition: definition.modelScore.edition, effectMethod: definition.effect.method, uncertainty: definition.uncertainty, scaleMaximum: definition.modelScore.scaleMaximum, scores: [], runs: [], problems: ["Category evidence is incomplete or incompatible."] };
  const record = entries.reduce((total, entry) => ({
    wins: total.wins + entry.record.wins,
    ties: total.ties + entry.record.ties,
    losses: total.losses + entry.record.losses
  }), { wins: 0, ties: 0, losses: 0 });
  const calibratedPromptCount = entries.filter((entry) => entry.calibrationStatus === "Calibrated").length;
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    taxonomyVersion: taxonomy.version,
    taxonomyStatus: taxonomy.status,
    requiredPromptCount: benchmarkIds.length,
    measuredPromptCount: entries.length,
    completePromptCount: entries.filter((entry) => entry.featuredStatus === "complete").length,
    calibratedPromptCount,
    calibrationStatus: calibratedPromptCount === benchmarkIds.length ? "Calibrated" : "Provisional",
    entries,
    problems,
    modelScoreMethod: modelScoreResult.method,
    scoreEdition: modelScoreResult.edition,
    effectMethod: modelScoreResult.effectMethod,
    uncertainty: modelScoreResult.uncertainty,
    modelScoreScaleMaximum: modelScoreResult.scaleMaximum,
    modelScores: modelScoreResult.scores,
    modelRuns: modelScoreResult.runs,
    modelScoreProblems: modelScoreResult.problems,
    record,
    matchedPairCount: entries.reduce((total, entry) => total + entry.matchedPairCount, 0),
    treatment: treatmentIds.size === 1 ? entries[0].treatment : null,
    basisHash: complete ? buildCategoryBasisHash(taxonomy, definition, entries) : null
  };
}

export function buildBenchmarkCatalogCategories(entries, taxonomy) {
  validateCapabilityTaxonomy(taxonomy, "provided capability taxonomy");
  const entriesByBenchmarkId = new Map();
  for (const entry of entries) {
    if (entriesByBenchmarkId.has(entry.benchmarkId)) {
      throw new Error(`Benchmark evidence is duplicated: ${entry.benchmarkId}.`);
    }
    entriesByBenchmarkId.set(entry.benchmarkId, entry);
  }
  const mappedBenchmarkIds = new Set(taxonomy.categories.flatMap((category) => category.benchmarkIds));
  const categories = taxonomy.categories
    .map((definition) => normalizeCatalogCategory({ taxonomy, definition, entriesByBenchmarkId }))
    .filter(Boolean);
  const unmappedEntries = entries.filter((entry) => !mappedBenchmarkIds.has(entry.benchmarkId));
  if (unmappedEntries.length > 0) {
    categories.push({
      id: "unmapped-benchmarks",
      title: "Unmapped benchmarks",
      description: "These prompts remain visible but are not assigned to a score edition in the current taxonomy.",
      taxonomyVersion: taxonomy.version,
      taxonomyStatus: taxonomy.status,
      requiredPromptCount: unmappedEntries.length,
      measuredPromptCount: unmappedEntries.length,
      completePromptCount: unmappedEntries.filter((entry) => entry.featuredStatus === "complete").length,
      calibratedPromptCount: 0,
      calibrationStatus: "No score edition",
      entries: unmappedEntries,
      problems: ["Add an explicit taxonomy mapping before aggregating these prompts."],
      modelScoreMethod: null,
      scoreEdition: null,
      effectMethod: null,
      uncertainty: null,
      modelScoreScaleMaximum: null,
      modelScores: [],
      modelRuns: [],
      modelScoreProblems: ["No category model score is available until these benchmarks are mapped."],
      record: unmappedEntries.reduce((total, entry) => ({
        wins: total.wins + entry.record.wins,
        ties: total.ties + entry.record.ties,
        losses: total.losses + entry.record.losses
      }), { wins: 0, ties: 0, losses: 0 }),
      matchedPairCount: unmappedEntries.reduce((total, entry) => total + entry.matchedPairCount, 0),
      treatment: null,
      basisHash: null
    });
  }
  return categories;
}

function formatLift(value) {
  if (!Number.isFinite(value)) {
    return "No final score";
  }
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} pts`;
}

function formatScore(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "n/a";
}

function renderBenchmarkEntry(entry, index) {
  const completionLabel = entry.featuredStatus === "complete" ? "Complete" : "Partial";
  const attemptWarning = entry.latestAttempt ? `
    <a class="catalog-prompt__attempt" href="${escapeHtml(entry.latestAttempt.href)}">
      <strong>Newer attempt needs attention</strong>
      <span>${escapeHtml(entry.latestAttempt.completedRowCount)}/${escapeHtml(entry.latestAttempt.expectedRowCount)} responses · open attempt →</span>
    </a>` : "";

  return `<article class="catalog-prompt">
    <a class="catalog-prompt__main" href="${escapeHtml(entry.featuredHref)}" aria-label="Open ${escapeHtml(entry.title)} benchmark report">
      <div class="catalog-prompt__identity">
        <span class="catalog-overline">${String(index + 1).padStart(2, "0")} / benchmark</span>
        <h3 class="catalog-prompt__title">${escapeHtml(entry.title)}</h3>
        <p class="catalog-prompt__description">${escapeHtml(entry.description || entry.prompt)}</p>
      </div>
      <div class="catalog-prompt__comparison" aria-label="Without Vasir ${escapeHtml(formatScore(entry.conditionScores.clean))}, with Vasir ${escapeHtml(formatScore(entry.conditionScores.treatment))}, difference ${escapeHtml(formatLift(entry.observedLift))}">
        <div class="catalog-condition">
          <span class="catalog-condition__label">Without Vasir</span>
          <strong class="catalog-condition__score">${escapeHtml(formatScore(entry.conditionScores.clean))}</strong>
        </div>
        <span class="catalog-prompt__arrow" aria-hidden="true">→</span>
        <div class="catalog-condition catalog-condition--skill">
          <span class="catalog-condition__label">With Vasir</span>
          <strong class="catalog-condition__score">${escapeHtml(formatScore(entry.conditionScores.treatment))}</strong>
        </div>
        <strong class="catalog-prompt__lift">${escapeHtml(formatLift(entry.observedLift))}</strong>
      </div>
      <div class="catalog-prompt__facts">
        <span>${completionLabel} · ${escapeHtml(entry.completedRowCount)}/${escapeHtml(entry.expectedRowCount)} responses</span>
        <span>${escapeHtml(entry.record.wins)}W · ${escapeHtml(entry.record.ties)}T · ${escapeHtml(entry.record.losses)}L</span>
        <span>${escapeHtml(entry.calibrationStatus)}</span>
      </div>
      <span class="catalog-prompt__open" aria-hidden="true">Open full report →</span>
    </a>${attemptWarning}
  </article>`;
}

function scorePosition(score, scaleMaximum) {
  if (!Number.isFinite(score) || !Number.isFinite(scaleMaximum) || scaleMaximum <= 0) {
    return 50;
  }
  const boundedScore = Math.max(0, Math.min(scaleMaximum, score));
  return 2 + ((boundedScore / scaleMaximum) * 96);
}

function renderScoreTicks(scaleMaximum) {
  return [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const position = scorePosition(scaleMaximum * fraction, scaleMaximum);
    const modifier = fraction === 0 || fraction === 1
      ? " catalog-score-line__tick--endcap"
      : fraction === 0.5
        ? " catalog-score-line__tick--midpoint"
        : "";
    return `<span class="catalog-score-line__tick${modifier}" style="--tick-position:${position}%" aria-hidden="true"></span>`;
  }).join("");
}

function renderScoreAxis(scaleMaximum) {
  const labels = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const value = Math.round(scaleMaximum * fraction);
    const position = scorePosition(value, scaleMaximum);
    return `<small class="catalog-score-axis__label" style="--tick-position:${position}%">${escapeHtml(value)}</small>`;
  }).join("");
  return `<span class="catalog-score-axis"><span class="catalog-score-axis__title">Benchmark score</span><span class="catalog-score-axis__labels">${labels}</span></span>`;
}

function renderScoreLine(run, scaleMaximum, runCount) {
  const position = scorePosition(run.score, scaleMaximum);
  const comparisonScore = run.conditionId === "treatment" ? run.baselineScore : run.skillScore;
  const comparisonPosition = scorePosition(comparisonScore, scaleMaximum);
  const deltaStart = Math.min(position, comparisonPosition);
  const deltaWidth = Math.max(0.35, Math.abs(position - comparisonPosition));
  const deltaModifier = run.upliftPoints > 0 ? "positive" : run.upliftPoints < 0 ? "negative" : "tied";
  const conditionModifier = run.conditionId === "treatment" ? "skill" : "clean";
  const comparisonModifier = run.conditionId === "treatment" ? "clean" : "skill";
  const comparisonLabel = run.conditionId === "treatment" ? "without Vasir" : "with Vasir";
  return `<div class="catalog-score-line catalog-score-line--${conditionModifier}" role="img" aria-label="${escapeHtml(run.configurationLabel)}, ${escapeHtml(run.conditionLabel)}, absolute rubric score ${escapeHtml(formatScore(run.score))} and rank number ${escapeHtml(run.rank)} of ${escapeHtml(runCount)}; matched ${escapeHtml(comparisonLabel)} score ${escapeHtml(formatScore(comparisonScore))}">
    <span class="catalog-score-line__axis" aria-hidden="true"></span>
    ${renderScoreTicks(scaleMaximum)}
    <span class="catalog-score-line__locator" style="--score-position:${position}%" aria-hidden="true"></span>
    <span class="catalog-score-line__delta catalog-score-line__delta--${deltaModifier}" style="--delta-start:${deltaStart}%;--delta-width:${deltaWidth}%" aria-hidden="true"></span>
    <span class="catalog-score-line__marker catalog-score-line__marker--${comparisonModifier} catalog-score-line__marker--comparison" style="--score-position:${comparisonPosition}%" aria-hidden="true"></span>
    <span class="catalog-score-line__marker catalog-score-line__marker--${conditionModifier} catalog-score-line__marker--active" style="--score-position:${position}%" aria-hidden="true"></span>
  </div>`;
}

function renderModelRunRow(run, scaleMaximum, runCount) {
  const conditionModifier = run.conditionId === "treatment" ? "skill" : "clean";
  return `<tr class="catalog-model-run catalog-model-run--${conditionModifier}">
    <th scope="row">
      <strong>${escapeHtml(run.modelLabel)}</strong>
      <span class="catalog-model-run__reasoning">${escapeHtml(run.reasoningEffort)}</span>
      <span class="catalog-run-condition catalog-run-condition--${conditionModifier}">${run.conditionId === "treatment" ? "◆" : "○"} ${escapeHtml(run.conditionLabel)}</span>
    </th>
    <td class="catalog-score-line-cell">${renderScoreLine(run, scaleMaximum, runCount)}</td>
    <td class="catalog-run-score catalog-run-score--${conditionModifier}">${escapeHtml(formatScore(run.score))}</td>
    <td class="catalog-run-rank">#${escapeHtml(run.rank)}</td>
  </tr>`;
}

function renderBenchmarkScoreCell(benchmark) {
  const liftClass = benchmark.upliftPoints < 0 ? "catalog-matrix-score__lift catalog-matrix-score__lift--negative" : "catalog-matrix-score__lift";
  return `<td>
    <a class="catalog-matrix-score" href="${escapeHtml(benchmark.href)}" aria-label="${escapeHtml(benchmark.title)}: without Vasir ${escapeHtml(formatScore(benchmark.baselineScore))}, with Vasir ${escapeHtml(formatScore(benchmark.skillScore))}, difference ${escapeHtml(formatLift(benchmark.upliftPoints))}">
      <span class="catalog-matrix-score__pair"><span>${escapeHtml(formatScore(benchmark.baselineScore))}</span><span aria-hidden="true">→</span><strong>${escapeHtml(formatScore(benchmark.skillScore))}</strong></span>
      <span class="${liftClass}">${escapeHtml(formatLift(benchmark.upliftPoints))}</span>
    </a>
  </td>`;
}

function renderModelMatrixRow(score) {
  return `<tr>
    <th scope="row"><strong>${escapeHtml(score.modelLabel)}</strong><span>${escapeHtml(score.reasoningEffort)}</span></th>
    ${score.benchmarks.map(renderBenchmarkScoreCell).join("\n")}
  </tr>`;
}

function renderModelRunTable(runs, ariaLabel, scaleMaximum) {
  return `<div class="catalog-table-wrap" tabindex="0" role="region" aria-label="${escapeHtml(ariaLabel)}">
    <table class="catalog-model-table">
      <caption class="visually-hidden">Every model, reasoning, and condition run ranked together on one shared zero to ${escapeHtml(scaleMaximum)} absolute rubric-score scale.</caption>
      <thead><tr>
        <th scope="col">Model / reasoning / condition</th>
        <th scope="col">${renderScoreAxis(scaleMaximum)}</th>
        <th scope="col">Score / 100</th>
        <th scope="col">Rank</th>
      </tr></thead>
      <tbody>${runs.map((run) => renderModelRunRow(run, scaleMaximum, runs.length)).join("\n")}</tbody>
    </table>
  </div>`;
}

function renderModelHeadliners(run, category) {
  const scaleMaximum = category.modelScoreScaleMaximum ?? 100;
  const improvementClass = run.upliftPoints >= 0
    ? "catalog-headliners__value catalog-headliners__value--positive"
    : "catalog-headliners__value catalog-headliners__value--negative";
  return `<dl class="catalog-headliners" aria-label="Leaderboard headline metrics">
    <div class="catalog-headliners__item">
      <dt class="catalog-headliners__label">Best observed score</dt>
      <dd class="catalog-headliners__reading"><strong class="catalog-headliners__value">${escapeHtml(formatScore(run.score))}</strong><span class="catalog-headliners__unit">/ ${escapeHtml(scaleMaximum)}</span><small class="catalog-headliners__context">${escapeHtml(run.configurationLabel)} · ${escapeHtml(run.conditionLabel)}</small></dd>
    </div>
    <div class="catalog-headliners__item">
      <dt class="catalog-headliners__label">Winner’s Vasir change</dt>
      <dd class="catalog-headliners__reading"><strong class="${improvementClass}">${escapeHtml(formatLift(run.upliftPoints))}</strong><small class="catalog-headliners__context">${escapeHtml(formatScore(run.baselineScore))} → ${escapeHtml(formatScore(run.skillScore))} rubric score</small></dd>
    </div>
    <div class="catalog-headliners__item">
      <dt class="catalog-headliners__label">Evidence depth</dt>
      <dd class="catalog-headliners__reading"><strong class="catalog-headliners__value">${escapeHtml(category.requiredPromptCount)} tasks</strong><small class="catalog-headliners__context">1 trial per condition · uncertainty not estimated</small></dd>
    </div>
  </dl>`;
}

function renderModelLeaderboard(category) {
  if (category.modelRuns.length === 0 || category.modelScoreProblems.length > 0) {
    return `<section class="catalog-section" id="models" aria-labelledby="models-title">
      <header class="catalog-section__header">
        <div><span class="catalog-overline">01 / model rankings</span><h2 id="models-title">${escapeHtml(category.title)} rankings</h2></div>
      </header>
      <div class="catalog-no-signal" role="status"><strong>Model ranking withheld.</strong><ul>${category.modelScoreProblems.map((problem) => `<li>${escapeHtml(problem)}</li>`).join("")}</ul></div>
    </section>`;
  }
  const leader = category.modelRuns[0];
  return `<section class="catalog-section catalog-models" id="models" aria-labelledby="models-title">
    <header class="catalog-section__header catalog-section__header--compact">
      <div>
        <h2 id="models-title">${escapeHtml(category.title)} leaderboard</h2>
      </div>
      <p class="catalog-chart-key"><span class="catalog-chart-key__item"><i class="catalog-chart-key__marker" aria-hidden="true"></i>Bright = ranked run</span><span class="catalog-chart-key__item"><i class="catalog-chart-key__marker catalog-chart-key__marker--matched" aria-hidden="true"></i>Muted = matched condition</span></p>
    </header>
    ${renderModelHeadliners(leader, category)}
    <div class="catalog-ranking">
      ${renderModelRunTable(category.modelRuns, "all model runs ranked by absolute rubric score", category.modelScoreScaleMaximum)}
    </div>
    <details class="catalog-matrix">
      <summary>Inspect all ${escapeHtml(category.matchedPairCount * 2)} task scores</summary>
      <div class="catalog-table-wrap" tabindex="0" role="region" aria-label="Per-benchmark model score matrix">
        <table class="catalog-matrix-table">
          <caption class="visually-hidden">Exact without-Vasir and with-Vasir judge scores for every model configuration and benchmark.</caption>
          <thead><tr><th scope="col">Model / reasoning</th>${category.entries.map((entry) => `<th scope="col">${escapeHtml(entry.title)}</th>`).join("")}</tr></thead>
          <tbody>${category.modelScores.map(renderModelMatrixRow).join("\n")}</tbody>
        </table>
      </div>
    </details>
  </section>`;
}

function renderTreatmentEffect(category) {
  const total = category.record.wins + category.record.ties + category.record.losses;
  const width = (value) => total > 0 ? (value / total) * 100 : 0;
  const evidenceLabel = `${category.requiredPromptCount} tasks · 1 trial per condition · uncertainty not estimated`;
  return `<section class="catalog-section catalog-effect" id="effect" aria-labelledby="effect-title">
    <header class="catalog-section__header">
      <div><span class="catalog-overline">02 / Vasir effect</span><h2 id="effect-title">Vasir improved ${escapeHtml(category.record.wins)} of ${escapeHtml(total)} results.</h2></div>
      <p>Every pair used the same model, reasoning setting, prompt, and trial.</p>
    </header>
    <div class="catalog-effect__summary">
      <div class="catalog-effect__record" aria-label="${escapeHtml(category.record.wins)} wins, ${escapeHtml(category.record.ties)} ties, ${escapeHtml(category.record.losses)} losses">
        <span class="catalog-effect__segment catalog-effect__segment--wins" style="width:${width(category.record.wins)}%"></span>
        <span class="catalog-effect__segment catalog-effect__segment--ties" style="width:${width(category.record.ties)}%"></span>
        <span class="catalog-effect__segment catalog-effect__segment--losses" style="width:${width(category.record.losses)}%"></span>
      </div>
      <div class="catalog-effect__labels">
        <strong><span class="catalog-key catalog-key--wins"></span>${escapeHtml(category.record.wins)} improved</strong>
        <strong><span class="catalog-key catalog-key--ties"></span>${escapeHtml(category.record.ties)} tied</strong>
        <strong><span class="catalog-key catalog-key--losses"></span>${escapeHtml(category.record.losses)} worse</strong>
        <span>${escapeHtml(evidenceLabel)}</span>
      </div>
    </div>
    <div class="catalog-effect__benchmarks">
      ${category.entries.map((entry) => `<a href="${escapeHtml(entry.featuredHref)}">
        <span>${escapeHtml(entry.title)}</span>
        <span class="catalog-effect__pair"><small>Without</small>${escapeHtml(formatScore(entry.conditionScores.clean))}<i aria-hidden="true">→</i><small>With Vasir</small>${escapeHtml(formatScore(entry.conditionScores.treatment))}</span>
        <strong>${escapeHtml(formatLift(entry.observedLift))}</strong>
      </a>`).join("\n")}
    </div>
  </section>`;
}

function renderBenchmarkResults(category) {
  return `<section class="catalog-section catalog-benchmarks" id="benchmarks" aria-labelledby="benchmarks-title">
    <header class="catalog-section__header">
      <div><span class="catalog-overline">03 / benchmark results</span><h2 id="benchmarks-title">${escapeHtml(category.title)}</h2></div>
      <p>${escapeHtml(category.description)} Open a benchmark to read every answer and judgment.</p>
    </header>
    ${category.entries.map(renderBenchmarkEntry).join("\n")}
  </section>`;
}

function renderMethod(category) {
  return `<section class="catalog-section catalog-method" id="method" aria-labelledby="method-title">
    <header class="catalog-section__header">
      <div><span class="catalog-overline">04 / scoring</span><h2 id="method-title">Scoring and limits</h2></div>
    </header>
    <div class="catalog-method__columns">
      <div><h3>Run leaderboard</h3><p>Each score is the equal-weight mean of the task-local 0–100 rubric scores in the frozen ${escapeHtml(category.scoreEdition)} edition. Adding another model can change rank, but cannot change an incumbent score.</p></div>
      <div><h3>Matched Vasir effect</h3><p>Uplift is the equal-weight mean of each task’s with-Vasir score minus its matched without-Vasir score, reported in percentage points.</p></div>
      <div><h3>Evidence</h3><p>This release covers ${escapeHtml(category.requiredPromptCount)} ${escapeHtml(category.title)} benchmarks, ${escapeHtml(category.modelScores.length)} model settings, and one trial per condition. Uncertainty is not estimated; treat these development rubric scores as provisional.</p></div>
    </div>
    <details><summary>Run evidence</summary><p>${escapeHtml(category.taxonomyVersion)} · basis ${escapeHtml(category.basisHash ?? "unavailable")} · treatment ${escapeHtml(category.treatment?.hash ?? "unavailable")} · source runs ${category.entries.map((entry) => escapeHtml(entry.featuredRunId)).join(" · ")}</p></details>
  </section>`;
}

const CATALOG_STYLES = String.raw`
  :root {
    --color-canvas: #f3f1ea;
    --color-canvas-ink: #171717;
    --color-canvas-muted: #64625d;
    --color-canvas-line: #d7d3c9;
    --color-surface: #0b0c0e;
    --color-surface-raised: #15171a;
    --color-surface-active: #1b1e22;
    --color-text: #ffffff;
    --color-text-secondary: rgba(255, 255, 255, 0.72);
    --color-text-muted: rgba(255, 255, 255, 0.46);
    --color-border: rgba(255, 255, 255, 0.18);
    --color-border-strong: rgba(255, 255, 255, 0.32);
    --color-chart-divider: rgba(255, 255, 255, 0.11);
    --color-chart-axis: rgba(255, 255, 255, 0.2);
    --color-chart-axis-hover: rgba(255, 255, 255, 0.28);
    --color-chart-tick: rgba(255, 255, 255, 0.28);
    --color-chart-tick-major: rgba(255, 255, 255, 0.5);
    --color-skill: #ddff58;
    --color-skill-soft: rgba(221, 255, 88, 0.12);
    --color-clean: #ff7063;
    --color-clean-soft: rgba(255, 112, 99, 0.12);
    --color-focus: #2b75ff;
    --color-danger-text: #ffc1bb;
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.5rem;
    --space-6: 2rem;
    --space-7: 3rem;
    --space-8: 4rem;
    --space-9: 6rem;
    --radius-full: 999rem;
    --duration-fast: 120ms;
    --ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
    --size-site-header: 4.75rem;
    --size-chart-marker: 0.625rem;
    --size-chart-marker-muted: 0.5rem;
    --size-chart-comparison-stroke: 1px;
    --size-chart-marker-keyline: 2px;
    --size-chart-locator: 1.125rem;
    --size-chart-tick: 0.125rem;
    --size-chart-tick-midpoint: 0.1875rem;
    --size-chart-tick-endcap: 0.75rem;
    --size-chart-tick-width: 1px;
    --radius-chart-marker: 0.1rem;
    --z-chart-header: 5;
    --z-site-header: 10;
    --frame: min(92rem, calc(100vw - 3rem));
    --font-body: "Plus Jakarta Sans", "Helvetica Neue", sans-serif;
    --font-mono: "JetBrains Mono", "SFMono-Regular", monospace;
    --text-small: 0.6875rem;
    --text-micro: 0.625rem;
    --text-label: 0.8125rem;
    --text-body: 1rem;
    --text-lead: 1.125rem;
    --leading-body: 1.6;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html { background: var(--color-canvas); color-scheme: light; scroll-behavior: smooth; }
  body { margin: 0; min-width: 20rem; background: var(--color-canvas); color: var(--color-canvas-ink); font-family: var(--font-body); font-size: var(--text-body); line-height: 1.5; -webkit-font-smoothing: antialiased; }
  a { color: inherit; }
  .catalog-header { background: var(--color-canvas); border-bottom: 1px solid var(--color-canvas-line); }
  .catalog-header__inner { width: var(--frame); min-height: var(--size-site-header); margin: auto; display: flex; align-items: center; justify-content: space-between; gap: var(--space-6); }
  .catalog-brand { font-size: 1.05rem; font-weight: 700; letter-spacing: -0.02em; text-decoration: none; }
  .catalog-brand:focus-visible { outline: 3px solid var(--color-focus); outline-offset: var(--space-1); }
  .catalog-main { width: var(--frame); margin: 0 auto var(--space-7); background: var(--color-surface); color: var(--color-text); }
  .catalog-hero { padding: var(--space-5) clamp(1.5rem, 5vw, 5rem); display: flex; align-items: flex-end; justify-content: space-between; gap: var(--space-7); }
  .catalog-hero__identity { flex: 0 0 auto; }
  .catalog-overline { display: block; color: var(--color-skill); font-family: var(--font-mono); font-size: var(--text-small); font-weight: 600; letter-spacing: 0.13em; line-height: 1.45; text-transform: uppercase; }
  .catalog-hero__title { max-width: 24ch; margin: var(--space-2) 0 0; font-size: clamp(2rem, 2.8vw, 2.6rem); font-weight: 700; letter-spacing: -0.045em; line-height: 1.05; text-wrap: balance; }
  .catalog-method { border-top: 1px solid var(--color-border); }
  .catalog-no-signal { margin: var(--space-6) 0; padding: var(--space-5); border-left: 3px solid var(--color-clean); background: var(--color-clean-soft); color: var(--color-danger-text); }
  .catalog-no-signal ul { margin: var(--space-3) 0 0; padding-left: var(--space-5); }
  .catalog-prompt { border-top: 1px solid var(--color-border); }
  .catalog-prompt__main { position: relative; min-height: 12rem; padding: var(--space-6) clamp(1.5rem, 5vw, 5rem); display: flex; align-items: center; gap: clamp(2rem, 5vw, 5rem); text-decoration: none; transition: background var(--duration-fast) var(--ease-out); }
  .catalog-prompt__main:hover { background: var(--color-surface-raised); }
  .catalog-prompt__main:focus-visible { outline: 3px solid var(--color-focus); outline-offset: -3px; }
  .catalog-prompt__identity { flex: 1 1 40%; min-width: 17rem; }
  .catalog-prompt__title { margin: var(--space-2) 0 var(--space-3); font-size: 1.2rem; letter-spacing: -0.02em; line-height: 1.3; }
  .catalog-prompt__description { max-width: 62ch; margin: 0; overflow: hidden; color: var(--color-text-secondary); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: var(--text-label); line-height: 1.55; }
  .catalog-prompt__comparison { flex: 0 1 25rem; display: flex; align-items: center; justify-content: center; gap: var(--space-4); }
  .catalog-condition { min-width: 5rem; }
  .catalog-condition__label { display: block; color: var(--color-text-muted); font-family: var(--font-mono); font-size: var(--text-small); text-transform: uppercase; }
  .catalog-condition__score { display: block; margin-top: var(--space-1); color: var(--color-clean); font-size: 1.45rem; font-variant-numeric: tabular-nums lining-nums; }
  .catalog-condition--skill .catalog-condition__score { color: var(--color-skill); }
  .catalog-prompt__arrow { color: var(--color-text-muted); }
  .catalog-prompt__lift { padding: var(--space-2) var(--space-3); border-radius: var(--radius-full); background: var(--color-skill-soft); color: var(--color-skill); font-family: var(--font-mono); font-size: var(--text-label); font-variant-numeric: tabular-nums lining-nums; white-space: nowrap; }
  .catalog-prompt__facts { flex: 0 1 15rem; display: flex; flex-direction: column; gap: var(--space-2); color: var(--color-text-muted); font-family: var(--font-mono); font-size: var(--text-small); line-height: 1.45; }
  .catalog-prompt__open { position: absolute; right: clamp(1.5rem, 5vw, 5rem); bottom: var(--space-4); color: var(--color-skill); font-family: var(--font-mono); font-size: var(--text-small); letter-spacing: 0.06em; text-transform: uppercase; }
  .catalog-prompt__attempt { padding: var(--space-3) clamp(1.5rem, 5vw, 5rem); display: flex; justify-content: space-between; gap: var(--space-5); background: var(--color-clean-soft); color: var(--color-danger-text); font-family: var(--font-mono); font-size: var(--text-small); line-height: 1.5; text-decoration: none; }
  .catalog-prompt__attempt:hover { text-decoration: underline; }
  .catalog-prompt__attempt:focus-visible { outline: 3px solid var(--color-focus); outline-offset: -3px; }
  .catalog-empty { padding: var(--space-9) clamp(1.5rem, 5vw, 5rem); color: var(--color-text-secondary); }
  .catalog-footer { padding: var(--space-5) clamp(1.5rem, 5vw, 5rem); border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; gap: var(--space-6); color: var(--color-text-muted); font-family: var(--font-mono); font-size: var(--text-small); line-height: 1.6; }
  .catalog-footer p { margin: 0; }
  @media (max-width: 72rem) {
    .catalog-prompt__main { align-items: flex-start; flex-wrap: wrap; }
    .catalog-prompt__identity { flex-basis: 52%; }
    .catalog-prompt__comparison { justify-content: flex-start; }
    .catalog-prompt__facts { flex-basis: 100%; flex-direction: row; flex-wrap: wrap; gap: var(--space-4); }
    .catalog-prompt__open { position: static; flex-basis: 100%; }
  }
  @media (max-width: 48rem) {
    :root { --frame: 100vw; }
    .catalog-header__inner { min-height: 4.5rem; padding: 0 var(--space-4); }
    .catalog-main { margin-bottom: 0; }
    .catalog-hero { padding: var(--space-5); align-items: flex-start; flex-direction: column; gap: var(--space-4); }
    .catalog-hero__title { font-size: 2rem; }
    .catalog-prompt__main { padding: var(--space-6) var(--space-5); gap: var(--space-5); }
    .catalog-prompt__identity { min-width: 0; flex-basis: 100%; }
    .catalog-prompt__comparison { flex-basis: 100%; justify-content: space-between; }
    .catalog-prompt__facts { flex-direction: column; gap: var(--space-2); }
    .catalog-prompt__attempt { padding: var(--space-3) var(--space-5); flex-direction: column; gap: var(--space-1); }
    .catalog-footer { padding: var(--space-5); flex-direction: column; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .catalog-prompt__main { transition: none; }
  }

  /* Model-first category leaderboard */
  .visually-hidden { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .catalog-header { position: sticky; top: 0; z-index: var(--z-site-header); }
  .catalog-header__nav { display: flex; align-items: center; gap: var(--space-6); }
  .catalog-header__nav a { color: var(--color-canvas-muted); font-size: var(--text-label); font-weight: 700; text-decoration: none; }
  .catalog-header__nav a:hover { color: var(--color-canvas-ink); }
  .catalog-header__nav a:focus-visible { outline: 3px solid var(--color-focus); outline-offset: var(--space-2); }
  .catalog-main { overflow: clip; }
  .catalog-scope { max-width: 58rem; margin: 0; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2) var(--space-5); color: var(--color-text-muted); font-family: var(--font-mono); font-size: var(--text-small); line-height: 1.6; }
  .catalog-scope strong { color: var(--color-text); font-weight: 600; }
  .catalog-scope span::before { content: "·"; margin-right: var(--space-5); color: var(--color-border-strong); }
  .catalog-section { width: 100%; min-width: 0; padding: var(--space-6) clamp(1.5rem, 5vw, 5rem); border-top: 1px solid var(--color-border); overflow: hidden; scroll-margin-top: 4.75rem; }
  .catalog-section__header { margin-bottom: var(--space-5); display: flex; align-items: center; justify-content: space-between; gap: var(--space-8); }
  .catalog-section__header--compact { margin-bottom: var(--space-4); }
  .catalog-section__header > div { flex: 1 1 60%; }
  .catalog-section__header h2 { max-width: 28ch; margin: var(--space-2) 0 0; font-size: clamp(1.65rem, 2.3vw, 2.15rem); letter-spacing: -0.04em; line-height: 1.08; }
  .catalog-section__header > p { flex: 0 1 34rem; margin: 0; color: var(--color-text-secondary); font-size: var(--text-label); line-height: 1.7; }
  .catalog-chart-key { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2) var(--space-5); }
  .catalog-chart-key__item { display: inline-flex; align-items: center; white-space: nowrap; }
  .catalog-chart-key__marker { width: 0.55rem; height: 0.55rem; margin-right: var(--space-2); border-radius: 50%; background: var(--color-text); }
  .catalog-chart-key__marker--matched { background: var(--color-text-muted); }
  .catalog-headliners { margin: 0 0 var(--space-5); border-top: 1px solid var(--color-border-strong); border-bottom: 1px solid var(--color-border-strong); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .catalog-headliners__item { min-width: 0; padding: var(--space-3) var(--space-5); }
  .catalog-headliners__item + .catalog-headliners__item { border-left: 1px solid var(--color-border); }
  .catalog-headliners__label { color: var(--color-text-muted); font-family: var(--font-mono); font-size: var(--text-small); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .catalog-headliners__reading { margin: var(--space-2) 0 0; font-variant-numeric: tabular-nums lining-nums; }
  .catalog-headliners__value { color: var(--color-skill); font-family: var(--font-mono); font-size: clamp(1.5rem, 2vw, 1.9rem); line-height: 1; }
  .catalog-headliners__value--positive { color: var(--color-skill); }
  .catalog-headliners__value--negative { color: var(--color-clean); }
  .catalog-headliners__unit { margin-left: var(--space-2); color: var(--color-text-secondary); font-family: var(--font-mono); font-size: var(--text-label); }
  .catalog-headliners__context { margin-top: var(--space-2); display: block; overflow: hidden; color: var(--color-text-secondary); font-size: var(--text-label); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .catalog-table-wrap { width: 100%; max-width: 100%; min-width: 0; overflow: auto; outline: none; }
  .catalog-table-wrap:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
  .catalog-model-table, .catalog-matrix-table { width: 100%; min-width: 64rem; border-collapse: collapse; font-size: var(--text-label); }
  .catalog-model-table { table-layout: fixed; }
  .catalog-model-table th, .catalog-model-table td, .catalog-matrix-table th, .catalog-matrix-table td { padding: var(--space-3); border-bottom: 1px solid var(--color-border); text-align: left; vertical-align: middle; }
  .catalog-model-table th, .catalog-model-table td { border-bottom-color: var(--color-chart-divider); }
  .catalog-model-table thead th, .catalog-matrix-table thead th { color: var(--color-text-muted); font-family: var(--font-mono); font-size: var(--text-small); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
  .catalog-model-table thead th:first-child { width: 17rem; }
  .catalog-model-table thead th:nth-child(2) { width: auto; }
  .catalog-model-table thead th:nth-child(3) { width: 7.5rem; text-align: right; }
  .catalog-model-table thead th:nth-child(4) { width: 5.5rem; text-align: right; }
  .catalog-model-table tbody th strong, .catalog-matrix-table tbody th strong { display: block; color: var(--color-text); font-size: var(--text-label); }
  .catalog-model-run__reasoning, .catalog-matrix-table tbody th span { margin-top: 0.2rem; color: var(--color-text-muted); font-family: var(--font-mono); font-size: var(--text-small); text-transform: uppercase; }
  .catalog-model-run__reasoning { display: inline-block; }
  .catalog-model-run { --color-chart-row-surface: var(--color-surface); }
  .catalog-model-run:hover { --color-chart-row-surface: var(--color-surface-raised); }
  .catalog-model-table tbody tr:hover, .catalog-matrix-table tbody tr:hover { background: var(--color-surface-raised); }
  .catalog-run-condition { margin: 0 0 0 var(--space-2); padding: var(--space-1) var(--space-2); border: 1px solid color-mix(in oklch, currentColor 48%, transparent); display: inline-flex; align-items: center; background: var(--color-clean-soft); color: var(--color-clean); font-family: var(--font-mono); font-size: var(--text-small); font-weight: 700; letter-spacing: 0.055em; line-height: 1.15; text-transform: uppercase; white-space: nowrap; }
  .catalog-run-condition--skill { background: var(--color-skill-soft); color: var(--color-skill); }
  .catalog-score-axis { min-height: 2.25rem; display: grid; grid-template-rows: auto 1rem; gap: var(--space-1); color: var(--color-text-muted); }
  .catalog-score-axis__title { display: block; overflow: hidden; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
  .catalog-score-axis__labels { position: relative; display: block; }
  .catalog-score-axis__label { position: absolute; left: var(--tick-position); color: var(--color-text-muted); font: inherit; font-variant-numeric: tabular-nums lining-nums; transform: translateX(-50%); white-space: nowrap; }
  .catalog-model-table td.catalog-score-line-cell { padding-right: var(--space-5); padding-left: var(--space-5); }
  .catalog-score-line { position: relative; width: 100%; height: 1.75rem; color: var(--color-clean); }
  .catalog-score-line--skill { color: var(--color-skill); }
  .catalog-score-line__axis, .catalog-score-line__delta { position: absolute; top: 50%; height: 1px; transform: translateY(-50%); }
  .catalog-score-line__axis { right: 2%; left: 2%; background: var(--color-chart-axis); }
  .catalog-score-line__tick { position: absolute; top: 50%; left: var(--tick-position); width: var(--size-chart-tick); height: var(--size-chart-tick); border-radius: var(--radius-full); background: var(--color-chart-tick); transform: translate(-50%, -50%); }
  .catalog-score-line__tick--midpoint { width: var(--size-chart-tick-midpoint); height: var(--size-chart-tick-midpoint); background: var(--color-chart-tick-major); }
  .catalog-score-line__tick--endcap { width: var(--size-chart-tick-width); height: var(--size-chart-tick-endcap); background: var(--color-chart-tick-major); }
  .catalog-score-line__locator { position: absolute; z-index: 1; top: 50%; left: var(--score-position); width: var(--size-chart-tick-width); height: var(--size-chart-locator); border-radius: var(--radius-full); background: currentColor; opacity: 0.36; transform: translate(-50%, -50%); }
  .catalog-score-line__delta { z-index: 1; left: var(--delta-start); width: var(--delta-width); height: 2px; border-radius: var(--radius-full); opacity: 0.82; }
  .catalog-score-line__delta--positive { background: var(--color-skill); }
  .catalog-score-line__delta--negative { background: var(--color-clean); }
  .catalog-score-line__delta--tied { background: var(--color-text-muted); }
  .catalog-score-line__marker { position: absolute; top: 50%; left: var(--score-position); width: var(--size-chart-marker); height: var(--size-chart-marker); border: 2px solid currentColor; border-radius: 50%; background: var(--color-chart-row-surface); color: inherit; transform: translate(-50%, -50%); }
  .catalog-score-line__marker--skill { border: 0; border-radius: var(--radius-chart-marker); background: currentColor; transform: translate(-50%, -50%) rotate(45deg); }
  .catalog-score-line__marker--comparison { z-index: 2; width: var(--size-chart-marker-muted); height: var(--size-chart-marker-muted); border: var(--size-chart-comparison-stroke) solid currentColor; border-radius: 50%; outline: var(--size-chart-marker-keyline) solid var(--color-chart-row-surface); background: var(--color-chart-row-surface); opacity: 1; transform: translate(-50%, -50%); }
  .catalog-score-line__marker--comparison.catalog-score-line__marker--skill { border: var(--size-chart-comparison-stroke) solid currentColor; border-radius: var(--radius-chart-marker); background: var(--color-chart-row-surface); transform: translate(-50%, -50%) rotate(45deg); }
  .catalog-score-line__marker--comparison.catalog-score-line__marker--clean { color: color-mix(in oklch, var(--color-clean) 62%, var(--color-surface-active)); }
  .catalog-score-line__marker--comparison.catalog-score-line__marker--skill { color: color-mix(in oklch, var(--color-skill) 62%, var(--color-surface-active)); }
  .catalog-score-line__marker--active { z-index: 3; outline: var(--size-chart-marker-keyline) solid var(--color-chart-row-surface); }
  .catalog-model-run:hover .catalog-score-line__axis { background: var(--color-chart-axis-hover); }
  .catalog-model-table .catalog-run-score, .catalog-model-table .catalog-run-rank { font-family: var(--font-mono); font-variant-numeric: tabular-nums lining-nums; font-weight: 600; text-align: right; white-space: nowrap; }
  .catalog-model-table .catalog-run-score { color: var(--color-clean); font-size: var(--text-lead); }
  .catalog-model-table .catalog-run-score--skill { color: var(--color-skill); }
  .catalog-model-table .catalog-run-rank { color: var(--color-text-secondary); font-size: var(--text-label); }
  .catalog-matrix { margin-top: var(--space-5); border-top: 1px solid var(--color-border); }
  .catalog-matrix > summary, .catalog-method > details > summary { padding: var(--space-4) 0; color: var(--color-text-secondary); cursor: pointer; font-family: var(--font-mono); font-size: var(--text-small); text-transform: uppercase; }
  .catalog-matrix > summary:focus-visible, .catalog-method > details > summary:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
  .catalog-matrix-score { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); color: inherit; text-decoration: none; }
  .catalog-matrix-score:hover { text-decoration: underline; }
  .catalog-matrix-score__pair { display: flex; align-items: center; gap: var(--space-2); font-family: var(--font-mono); font-variant-numeric: tabular-nums lining-nums; }
  .catalog-matrix-score__pair > span:first-child { color: var(--color-clean); }
  .catalog-matrix-score__pair strong { color: var(--color-skill); }
  .catalog-matrix-score__lift { color: var(--color-skill); font-family: var(--font-mono); font-size: 0.625rem; white-space: nowrap; }
  .catalog-matrix-score__lift--negative { color: var(--color-clean); }
  .catalog-effect__summary { margin-bottom: var(--space-7); }
  .catalog-effect__record { width: 100%; height: 0.75rem; display: flex; overflow: hidden; background: var(--color-surface-active); }
  .catalog-effect__segment { display: block; height: 100%; }
  .catalog-effect__segment--wins { background: var(--color-skill); }
  .catalog-effect__segment--ties { background: var(--color-text-muted); }
  .catalog-effect__segment--losses { background: var(--color-clean); }
  .catalog-effect__labels { margin-top: var(--space-4); display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3) var(--space-6); }
  .catalog-effect__labels strong, .catalog-effect__labels > span { font-family: var(--font-mono); font-size: var(--text-small); font-weight: 600; }
  .catalog-effect__labels > span { margin-left: auto; color: var(--color-text-muted); font-weight: 400; }
  .catalog-key { width: 0.55rem; height: 0.55rem; margin-right: var(--space-2); display: inline-block; }
  .catalog-key--wins { background: var(--color-skill); }
  .catalog-key--ties { background: var(--color-text-muted); }
  .catalog-key--losses { background: var(--color-clean); }
  .catalog-effect__benchmarks { border-top: 1px solid var(--color-border-strong); }
  .catalog-effect__benchmarks > a { min-height: 4.75rem; padding: var(--space-4) 0; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; gap: var(--space-6); text-decoration: none; }
  .catalog-effect__benchmarks > a:hover { background: var(--color-surface-raised); }
  .catalog-effect__benchmarks > a > span:first-child { flex: 1 1 auto; font-weight: 700; }
  .catalog-effect__pair { flex: 0 1 23rem; display: flex; align-items: center; justify-content: flex-end; gap: var(--space-2); color: var(--color-text); font-family: var(--font-mono); font-variant-numeric: tabular-nums lining-nums; }
  .catalog-effect__pair small { color: var(--color-text-muted); font-family: var(--font-body); font-size: 0.625rem; text-transform: uppercase; }
  .catalog-effect__pair i { color: var(--color-text-muted); font-style: normal; }
  .catalog-effect__benchmarks > a > strong { flex: 0 0 6rem; color: var(--color-skill); font-family: var(--font-mono); font-size: var(--text-label); text-align: right; }
  .catalog-benchmarks { padding-bottom: 0; }
  .catalog-benchmarks .catalog-prompt { margin: 0 calc(clamp(1.5rem, 5vw, 5rem) * -1); }
  .catalog-benchmarks .catalog-prompt__main { min-height: 10rem; }
  .catalog-method__columns { display: flex; gap: var(--space-7); }
  .catalog-method__columns > div { flex: 1 1 0; }
  .catalog-method__columns h3 { margin: 0 0 var(--space-3); font-size: 1rem; }
  .catalog-method__columns p { margin: 0; color: var(--color-text-secondary); font-size: var(--text-label); line-height: 1.7; }
  .catalog-method > details { margin-top: var(--space-6); border-top: 1px solid var(--color-border); }
  .catalog-method > details p { overflow-wrap: anywhere; color: var(--color-text-muted); font-family: var(--font-mono); font-size: 0.625rem; line-height: 1.7; }

  @media (max-width: 68rem) {
    .catalog-section__header { align-items: flex-start; flex-direction: column; gap: var(--space-4); }
    .catalog-section__header > div, .catalog-section__header > p { width: 100%; min-width: 0; flex-basis: auto; }
    .catalog-method__columns { flex-wrap: wrap; }
    .catalog-method__columns > div { flex-basis: calc(50% - var(--space-7)); }
  }
  @media (min-width: 80rem) {
    .catalog-main, .catalog-models { overflow: visible; }
    .catalog-ranking .catalog-table-wrap { overflow: visible; }
    .catalog-model-table thead th { position: sticky; top: var(--size-site-header); z-index: var(--z-chart-header); background: var(--color-surface); }
  }
  @media (max-width: 48rem) {
    .catalog-header__nav { display: none; }
    .catalog-scope { max-width: none; flex-direction: column; justify-content: flex-start; gap: var(--space-2); }
    .catalog-scope span::before { display: none; }
    .catalog-section { max-width: 100vw; padding: var(--space-6) var(--space-5); }
    .catalog-section__header { margin-bottom: var(--space-5); }
    .catalog-section__header h2 { width: 100%; max-width: 100%; }
    .catalog-chart-key { justify-content: flex-start; }
    .catalog-headliners { grid-template-columns: 1fr; }
    .catalog-headliners__item { padding: var(--space-3) 0; display: grid; grid-template-columns: 8rem minmax(0, 1fr); align-items: start; gap: var(--space-3); }
    .catalog-headliners__item + .catalog-headliners__item { border-top: 1px solid var(--color-border); border-left: 0; }
    .catalog-headliners__reading { margin-top: 0; text-align: right; }
    .catalog-headliners__value { font-size: 1.5rem; }
    .catalog-headliners__context { overflow: visible; white-space: normal; }
    .catalog-ranking, .catalog-matrix { width: 100%; max-width: 100%; min-width: 0; }
    .catalog-ranking .catalog-table-wrap { overflow: visible; }
    .catalog-model-table { min-width: 0; table-layout: auto; display: block; }
    .catalog-model-table thead, .catalog-model-table tbody { display: block; }
    .catalog-model-table tr { padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border); display: grid; grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: "model score rank" "line line line"; column-gap: var(--space-4); }
    .catalog-model-table th, .catalog-model-table td { padding: var(--space-2) 0; border-bottom: 0; display: block; }
    .catalog-model-table thead th:first-child, .catalog-model-table thead th:nth-child(2), .catalog-model-table thead th:nth-child(3), .catalog-model-table thead th:nth-child(4) { width: auto; }
    .catalog-model-table th:first-child { grid-area: model; }
    .catalog-model-table th:nth-child(2), .catalog-model-table td.catalog-score-line-cell { grid-area: line; }
    .catalog-model-table th:nth-child(3), .catalog-run-score { grid-area: score; }
    .catalog-model-table th:nth-child(4), .catalog-run-rank { grid-area: rank; }
    .catalog-model-table thead tr { padding-top: 0; grid-template-columns: 1fr; grid-template-areas: "line"; }
    .catalog-model-table thead th:first-child, .catalog-model-table thead th:nth-child(3), .catalog-model-table thead th:nth-child(4) { display: none; }
    .catalog-model-table thead th:nth-child(2) { padding-top: 0; }
    .catalog-model-table td.catalog-score-line-cell { padding: var(--space-1) 0 var(--space-2); }
    .catalog-run-score, .catalog-run-rank { align-self: center; }
    .catalog-run-score { font-size: var(--text-body); }
    .catalog-run-rank { font-size: var(--text-label); }
    .catalog-run-score::before, .catalog-run-rank::before { margin-right: var(--space-1); color: var(--color-text-muted); font-size: var(--text-micro); letter-spacing: 0.05em; text-transform: uppercase; }
    .catalog-run-score::before { content: "Score"; }
    .catalog-run-rank::before { content: "Rank"; }
    .catalog-score-axis span { font-size: 0.625rem; }
    .catalog-effect__labels > span { flex-basis: 100%; margin-left: 0; }
    .catalog-effect__benchmarks > a { align-items: flex-start; flex-wrap: wrap; gap: var(--space-2) var(--space-4); }
    .catalog-effect__benchmarks > a > span:first-child { flex-basis: 100%; }
    .catalog-effect__pair { flex: 1 1 auto; justify-content: flex-start; }
    .catalog-method__columns { flex-direction: column; }
    .catalog-method__columns > div { flex-basis: auto; }
  }
`;

export function renderBenchmarkCatalogHtml(entries, {
  taxonomy = readBenchmarkCapabilityTaxonomy()
} = {}) {
  const sortedEntries = [...entries].sort((left, right) => left.benchmarkId.localeCompare(right.benchmarkId));
  const categories = buildBenchmarkCatalogCategories(sortedEntries, taxonomy);
  const primaryCategory = categories.find((category) => category.id !== "unmapped-benchmarks") ?? null;
  const displayCategory = primaryCategory ?? categories[0] ?? null;
  const completeCount = sortedEntries.filter((entry) => entry.featuredStatus === "complete").length;
  const attentionCount = sortedEntries.filter((entry) => entry.latestAttempt).length;
  const rankedRunCount = primaryCategory?.modelRuns.length ?? 0;
  const scoredResponseCount = sortedEntries.reduce((total, entry) => total + entry.completedRowCount, 0);
  const content = primaryCategory
    ? `${renderModelLeaderboard(primaryCategory)}
${renderTreatmentEffect(primaryCategory)}
${renderBenchmarkResults(primaryCategory)}
${renderMethod(primaryCategory)}`
    : displayCategory
      ? renderBenchmarkResults(displayCategory)
      : '<p class="catalog-empty">No compatible benchmark suite has recorded evidence yet.</p>';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>VasirBench</title>
  <style>${renderEmbeddedFontStyles()}\n${CATALOG_STYLES}</style>
</head>
<body>
  <header class="catalog-header">
    <div class="catalog-header__inner">
      <a class="catalog-brand" href="./index.html">VasirBench</a>
      <nav class="catalog-header__nav" aria-label="Benchmark sections">
        <a href="#models">Models</a>
        <a href="#effect">Vasir effect</a>
        <a href="#benchmarks">Benchmarks</a>
        <a href="#method">Method</a>
      </nav>
    </div>
  </header>
  <main class="catalog-main">
    <section class="catalog-hero" aria-labelledby="catalog-title">
      <div class="catalog-hero__identity"><span class="catalog-overline">Frontier model benchmark</span><h1 class="catalog-hero__title" id="catalog-title">VasirBench</h1></div>
      <p class="catalog-scope"><strong>${escapeHtml(displayCategory?.title ?? "No compatible category")}</strong><span>${escapeHtml(sortedEntries.length)} benchmarks</span><span>${escapeHtml(rankedRunCount)} ranked runs</span><span>${escapeHtml(scoredResponseCount)} scored responses</span><span>${escapeHtml(displayCategory?.calibratedPromptCount ?? 0)}/${escapeHtml(displayCategory?.requiredPromptCount ?? 0)} calibrated</span></p>
    </section>
    ${content}
    <footer class="catalog-footer">
      <p>${escapeHtml(completeCount)}/${escapeHtml(sortedEntries.length)} benchmark reports complete${attentionCount ? ` · ${escapeHtml(attentionCount)} newer attempt${attentionCount === 1 ? "" : "s"} need attention` : ""}.</p>
      <p>Generated from local <code>run.json</code> evidence · calibration pending.</p>
    </footer>
  </main>
</body>
</html>`;
}

export function writeBenchmarkCatalog({
  historyRootDirectory,
  outputFilePath = path.join(historyRootDirectory, "index.html")
}) {
  const resolvedOutputFilePath = path.resolve(outputFilePath);
  const records = readBenchmarkCatalogRunRecords({ historyRootDirectory });
  const entries = selectBenchmarkCatalogRuns(records).map(normalizeBenchmarkCatalogEntry);
  fs.mkdirSync(path.dirname(resolvedOutputFilePath), { recursive: true });
  fs.writeFileSync(resolvedOutputFilePath, renderBenchmarkCatalogHtml(entries), "utf8");
  return resolvedOutputFilePath;
}
