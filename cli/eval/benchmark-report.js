import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const D3_SOURCE_FILE_PATH = fileURLToPath(new URL("./vendor/d3.v7.min.js", import.meta.url));
const REPORT_FONT_DIRECTORY_PATH = fileURLToPath(new URL("./vendor/fonts/", import.meta.url));

const REPORT_FONT_FILES = [
  {
    family: "Kanit",
    fileName: "kanit-900-italic.woff2.b64",
    weight: 900,
    style: "italic"
  },
  {
    family: "Plus Jakarta Sans",
    fileName: "plus-jakarta-400.woff2.b64",
    weight: 400,
    style: "normal"
  },
  {
    family: "Plus Jakarta Sans",
    fileName: "plus-jakarta-700.woff2.b64",
    weight: 700,
    style: "normal"
  },
  {
    family: "JetBrains Mono",
    fileName: "jetbrains-mono-600.woff2.b64",
    weight: 600,
    style: "normal"
  }
];

function renderEmbeddedFontStyles() {
  return REPORT_FONT_FILES.map((font) => {
    const encodedFont = fs.readFileSync(
      path.join(REPORT_FONT_DIRECTORY_PATH, font.fileName),
      "utf8"
    ).replace(/\s+/g, "");
    return `@font-face {
      font-family: "${font.family}";
      src: url("data:font/woff2;base64,${encodedFont}") format("woff2");
      font-style: ${font.style};
      font-weight: ${font.weight};
      font-display: swap;
    }`;
  }).join("\n");
}

function readFirstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function readText(...values) {
  const value = readFirstDefined(...values);
  return typeof value === "string" ? value.trim() : "";
}

function readFiniteNumber(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function clampScore(score) {
  return score === null ? null : Math.max(0, Math.min(100, score));
}

function normalizeScoreValue(value, { maxScore = null, fraction = false } = {}) {
  const score = readFiniteNumber(value);
  if (score === null) {
    return null;
  }

  if (readFiniteNumber(maxScore) > 0) {
    return clampScore((score / maxScore) * 100);
  }

  if (fraction) {
    return clampScore(score * 100);
  }

  return clampScore(score);
}

function normalizeCondition(conditionValue) {
  const rawCondition = readText(conditionValue) || "unknown";
  const condition = rawCondition.toLowerCase();

  if (
    condition === "clean" ||
    condition.includes("baseline") ||
    condition.endsWith(":none") ||
    condition === "none"
  ) {
    return { id: "clean", label: "Clean", raw: rawCondition };
  }

  if (
    condition === "vasir" ||
    condition.includes("vasir") ||
    condition.includes("treatment") ||
    condition.startsWith("skill:")
  ) {
    return { id: "vasir", label: "Vasir", raw: rawCondition };
  }

  return {
    id: condition.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown",
    label: rawCondition,
    raw: rawCondition
  };
}

function normalizeReasoningEffort(row, modelDefinition = {}) {
  return readText(
    row.reasoningEffort,
    row.reasoning,
    row.effort,
    row.modelConfig?.reasoningEffort,
    row.modelConfig?.reasoning,
    modelDefinition.reasoningEffort,
    modelDefinition.reasoning,
    modelDefinition.effort
  ) || "default";
}

function normalizeProvider(row, modelDefinition = {}) {
  const provider = readText(
    row.provider,
    row.modelConfig?.provider,
    modelDefinition.provider
  );
  if (provider) {
    return provider;
  }

  const modelId = readText(row.modelId, row.modelConfigId, row.model);
  return modelId.includes(":") ? modelId.split(":", 1)[0] : "model";
}

function normalizeModelId(row, modelDefinition = {}) {
  return readText(
    row.modelId,
    row.modelConfig?.model,
    row.model,
    modelDefinition.modelId,
    modelDefinition.model,
    row.configurationId,
    row.modelConfigId,
    row.configId,
    modelDefinition.id
  ) || "unknown-model";
}

function formatModelName(modelId) {
  return modelId
    .replace(/^[^:]+:/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/^Gpt (\d+(?:\.\d+)*)\b/, "GPT-$1")
    .replace(/\bGpt\b/g, "GPT");
}

function normalizeCriteria(criteriaValue) {
  if (!criteriaValue) {
    return [];
  }

  if (Array.isArray(criteriaValue)) {
    return criteriaValue.map((criterion, index) => {
      if (typeof criterion === "string") {
        return { id: `criterion-${index + 1}`, label: criterion, score: null, rationale: "" };
      }

      const score = normalizeScoreValue(
        readFiniteNumber(
          criterion?.normalizedScore,
          criterion?.score,
          criterion?.value,
          criterion?.earned,
          criterion?.rating
        ),
        {
          maxScore: readFiniteNumber(
            criterion?.maxScore,
            criterion?.max,
            criterion?.earned !== undefined ? criterion?.weight : null,
            criterion?.maxRating
          )
        }
      );
      return {
        id: readText(criterion?.id, criterion?.key) || `criterion-${index + 1}`,
        label: readText(criterion?.label, criterion?.title, criterion?.name, criterion?.criterion) || `Criterion ${index + 1}`,
        score,
        rationale: readText(criterion?.rationale, criterion?.reason, criterion?.note, criterion?.criterion)
      };
    });
  }

  if (typeof criteriaValue === "object") {
    return Object.entries(criteriaValue).map(([key, criterion]) => {
      if (typeof criterion === "number") {
        return {
          id: key,
          label: key.replace(/[-_]+/g, " "),
          score: normalizeScoreValue(criterion),
          rationale: ""
        };
      }

      if (typeof criterion === "string") {
        return {
          id: key,
          label: key.replace(/[-_]+/g, " "),
          score: null,
          rationale: criterion
        };
      }

      return {
        id: key,
        label: readText(criterion?.label, criterion?.title, criterion?.name) || key.replace(/[-_]+/g, " "),
        score: normalizeScoreValue(
          readFiniteNumber(
            criterion?.normalizedScore,
            criterion?.score,
            criterion?.value,
            criterion?.earned,
            criterion?.rating
          ),
          {
            maxScore: readFiniteNumber(
              criterion?.maxScore,
              criterion?.max,
              criterion?.earned !== undefined ? criterion?.weight : null,
              criterion?.maxRating
            )
          }
        ),
        rationale: readText(criterion?.rationale, criterion?.reason, criterion?.note, criterion?.criterion)
      };
    });
  }

  return [];
}

function normalizeGates(gatesValue) {
  if (!Array.isArray(gatesValue)) {
    return [];
  }

  return gatesValue.map((gate, index) => {
    const status = readText(gate?.status).toLowerCase();
    const rawLabel = readText(gate?.title, gate?.id) || `Gate ${index + 1}`;
    return {
      id: readText(gate?.id) || `gate-${index + 1}`,
      type: "gate",
      status: status || "unknown",
      label: rawLabel.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
      score: status === "pass" ? 100 : status === "fail" ? 0 : null,
      rationale: readText(gate?.reason, gate?.rationale)
    };
  });
}

function buildRankingLookup(run) {
  const rankingValues = readFirstDefined(
    run.rankings,
    run.judging?.rankings,
    run.judging?.ranking,
    run.judge?.rankings,
    run.results?.rankings,
    run.results?.ranking
  );
  const rankings = Array.isArray(rankingValues) ? rankingValues : [];
  const byResponseId = new Map();
  const byCoordinates = new Map();

  for (const ranking of rankings) {
    const responseId = readText(ranking?.responseId, ranking?.rowKey, ranking?.id);
    if (responseId) {
      byResponseId.set(responseId, ranking);
    }

    const modelId = readText(ranking?.modelConfigId, ranking?.modelId, ranking?.model);
    const condition = normalizeCondition(
      readFirstDefined(ranking?.conditionId, ranking?.condition, ranking?.variant)
    ).id;
    const trialNumber = readFiniteNumber(ranking?.trialNumber, ranking?.trial) ?? 1;
    const caseId = readText(ranking?.caseId, ranking?.promptId) || "prompt";
    if (modelId) {
      byCoordinates.set(`${modelId}::${caseId}::${trialNumber}::${condition}`, ranking);
      byCoordinates.set(`${modelId}::*::${trialNumber}::${condition}`, ranking);
    }
  }

  return { byResponseId, byCoordinates };
}

function findRankingForRow(row, rowId, modelId, conditionId, trialNumber, caseId, rankingLookup) {
  return rankingLookup.byResponseId.get(rowId) ??
    rankingLookup.byCoordinates.get(`${modelId}::${caseId}::${trialNumber}::${conditionId}`) ??
    rankingLookup.byCoordinates.get(`${modelId}::*::${trialNumber}::${conditionId}`) ??
    null;
}

function normalizeUsage(row) {
  const usage = row.usage ?? row.tokenUsage ?? {};
  const inputTokens = readFiniteNumber(
    usage.inputTokens,
    usage.input_tokens,
    usage.promptTokens,
    usage.prompt_tokens
  );
  const outputTokens = readFiniteNumber(
    usage.outputTokens,
    usage.output_tokens,
    usage.completionTokens,
    usage.completion_tokens
  );
  const totalTokens = readFiniteNumber(usage.totalTokens, usage.total_tokens) ??
    (inputTokens !== null || outputTokens !== null
      ? (inputTokens ?? 0) + (outputTokens ?? 0)
      : null);

  return { inputTokens, outputTokens, totalTokens };
}

function normalizeRow(row, index, modelDefinitions, conditionDefinitions, treatment, rankingLookup) {
  const configurationId = readText(
    row.configurationId,
    row.modelConfigId,
    row.configId,
    row.modelConfig?.id
  );
  const provisionalModelId = normalizeModelId(row);
  const modelDefinition = modelDefinitions.get(configurationId) ?? modelDefinitions.get(provisionalModelId) ?? {};
  const modelId = normalizeModelId(row, modelDefinition);
  const provider = normalizeProvider(row, modelDefinition);
  const reasoningEffort = normalizeReasoningEffort(row, modelDefinition);
  const modelLabel = readText(
    row.modelLabel,
    row.modelConfig?.label,
    modelDefinition.label,
    modelDefinition.name
  ) || formatModelName(modelId);
  const rawConditionId = readFirstDefined(row.conditionId, row.condition, row.variant, row.treatment);
  const normalizedCondition = normalizeCondition(rawConditionId);
  const conditionDefinition = conditionDefinitions.get(readText(rawConditionId)) ?? {};
  const definitionType = readText(conditionDefinition.type).toLowerCase();
  const isTreatment = readText(rawConditionId) === treatment.id || definitionType === "treatment";
  const condition = isTreatment
    ? { ...normalizedCondition, id: "vasir", label: treatment.label }
    : normalizedCondition;
  const conditionLabel = condition.id === "vasir"
    ? treatment.label
    : readText(conditionDefinition.label) || condition.label;
  const trialNumber = readFiniteNumber(row.trialNumber, row.trial) ?? 1;
  const caseId = readText(row.caseId, row.promptId, row.case?.id) || "prompt";
  const rowId = readText(row.responseId, row.rowKey, row.id) ||
    `${modelId}::${caseId}::${trialNumber}::${condition.id}::${index + 1}`;
  const ranking = findRankingForRow(
    row,
    rowId,
    modelId,
    condition.id,
    trialNumber,
    caseId,
    rankingLookup
  );
  const explicitScore = readFiniteNumber(
    ranking?.normalizedScore,
    ranking?.score,
    row.normalizedScore,
    row.finalScore,
    row.overallScore,
    row.judgeScore,
    row.score?.total,
    row.score?.uncapped,
    typeof row.score === "number" ? row.score : null,
    row.judgment?.normalizedScore,
    row.judgment?.score,
    row.judge?.score
  );
  const score = explicitScore !== null
    ? normalizeScoreValue(explicitScore, {
        maxScore: readFiniteNumber(
          ranking?.maxScore,
          row.scoreMax,
          row.maxScore,
          row.judgment?.maxScore,
          row.judge?.maxScore
        )
      })
    : normalizeScoreValue(row.hardScore?.score, { fraction: true });
  const criteria = [
    ...normalizeGates(row.score?.gates),
    ...normalizeCriteria(
    readFirstDefined(
      ranking?.criteria,
      ranking?.criterionScores,
      row.score?.dimensions,
      row.criteria,
      row.criteriaScores,
      row.judgment?.criteria,
      row.judge?.criteria
    )
    ).map((criterion) => ({ ...criterion, type: "dimension" }))
  ];
  const statusValue = readText(row.status, row.rowStatus, ranking?.status) || "scored";

  return {
    id: rowId,
    configurationId: configurationId || readText(modelDefinition.id) || modelId,
    modelId,
    modelLabel,
    modelKey: configurationId || readText(modelDefinition.id) || `${provider}:${modelId}:${reasoningEffort}`,
    provider,
    reasoningEffort,
    configurationLabel: `${modelLabel} · ${reasoningEffort}`,
    conditionId: condition.id,
    conditionLabel,
    rawCondition: condition.raw,
    caseId,
    trialNumber,
    status: statusValue,
    score,
    rank: readFiniteNumber(ranking?.rank, row.rank, row.judgment?.rank),
    outputText: readText(row.outputText, row.responseText, row.response, row.output, row.text),
    rationale: readText(
      ranking?.rationale,
      ranking?.reason,
      ranking?.summary,
      row.judgeRationale,
      row.rationale,
      row.score?.reason,
      row.judgment?.rationale,
      row.judgment?.reason,
      row.judge?.rationale,
      row.judge?.reason,
      row.pairJudgment?.consensus?.reason,
      row.pairJudgment?.summaryReason
    ),
    selectedReviewerId: readText(row.score?.selectedReviewerId) || null,
    synthesisReason: readText(row.score?.synthesisReason),
    criteria,
    usage: normalizeUsage(row),
    costUsd: readFiniteNumber(row.costUsd, row.cost?.usd),
    durationMs: readFiniteNumber(row.durationMs, row.runtimeReceipt?.durationMs),
    strengths: Array.isArray(row.score?.strengths) ? row.score.strengths.map((value) => readText(value)).filter(Boolean) : [],
    risks: Array.isArray(row.score?.risks) ? row.score.risks.map((value) => readText(value)).filter(Boolean) : [],
    error: readText(row.error?.message, row.error)
  };
}

function mean(values) {
  const finiteValues = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  return finiteValues.length === 0
    ? null
    : finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
}

function aggregateRows(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = `${row.modelKey}::${row.conditionId}`;
    const group = groups.get(key) ?? {
      key,
      modelKey: row.modelKey,
      modelId: row.modelId,
      modelLabel: row.modelLabel,
      configurationLabel: row.configurationLabel,
      provider: row.provider,
      reasoningEffort: row.reasoningEffort,
      conditionId: row.conditionId,
      conditionLabel: row.conditionLabel,
      scores: []
    };
    if (row.score !== null && row.status !== "error") {
      group.scores.push(row.score);
    }
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      score: mean(group.scores),
      minimumScore: group.scores.length === 0 ? null : Math.min(...group.scores),
      maximumScore: group.scores.length === 0 ? null : Math.max(...group.scores),
      measuredCount: group.scores.length
    }))
    .sort((left, right) =>
      (right.score ?? -Infinity) - (left.score ?? -Infinity) ||
      left.configurationLabel.localeCompare(right.configurationLabel) ||
      left.conditionLabel.localeCompare(right.conditionLabel)
    );
}

function createComparisons(rows) {
  const aggregates = aggregateRows(rows);
  const byModel = new Map();

  for (const aggregate of aggregates) {
    const comparison = byModel.get(aggregate.modelKey) ?? {
      modelKey: aggregate.modelKey,
      modelId: aggregate.modelId,
      modelLabel: aggregate.modelLabel,
      configurationLabel: aggregate.configurationLabel,
      provider: aggregate.provider,
      reasoningEffort: aggregate.reasoningEffort,
      cleanScore: null,
      vasirScore: null,
      cleanCount: 0,
      vasirCount: 0
    };

    if (aggregate.conditionId === "clean") {
      comparison.cleanScore = aggregate.score;
      comparison.cleanCount = aggregate.measuredCount;
    }
    if (aggregate.conditionId === "vasir") {
      comparison.vasirScore = aggregate.score;
      comparison.vasirCount = aggregate.measuredCount;
    }
    byModel.set(aggregate.modelKey, comparison);
  }

  return [...byModel.values()]
    .map((comparison) => ({
      ...comparison,
      lift: comparison.cleanScore !== null && comparison.vasirScore !== null
        ? comparison.vasirScore - comparison.cleanScore
        : null
    }))
    .sort((left, right) =>
      (right.vasirScore ?? right.cleanScore ?? -Infinity) -
        (left.vasirScore ?? left.cleanScore ?? -Infinity) ||
      left.configurationLabel.localeCompare(right.configurationLabel)
    );
}

function createMatchedDeltas(rows) {
  const pairs = new Map();
  for (const row of rows) {
    if (row.score === null || (row.conditionId !== "clean" && row.conditionId !== "vasir")) {
      continue;
    }

    const key = `${row.modelKey}::${row.caseId}::${row.trialNumber}`;
    const pair = pairs.get(key) ?? { key, clean: null, vasir: null };
    pair[row.conditionId] = row.score;
    pairs.set(key, pair);
  }

  return [...pairs.values()]
    .filter((pair) => pair.clean !== null && pair.vasir !== null)
    .map((pair) => ({ ...pair, delta: pair.vasir - pair.clean }));
}

function normalizeRubric(run, rows) {
  const rubricValue = readFirstDefined(
    run.rubric,
    run.judging?.rubric,
    run.judge?.rubric,
    run.benchmark?.rubric,
    run.benchmark?.definition?.rubric,
    run.benchmark?.definition?.judgeRubric,
    run.benchmark?.definition?.scoring,
    run.suite?.rubric
  );

  if (typeof rubricValue === "string") {
    return { summary: rubricValue.trim(), criteria: [] };
  }

  if (Array.isArray(rubricValue)) {
    return { summary: "", criteria: normalizeCriteria(rubricValue) };
  }

  if (rubricValue && typeof rubricValue === "object") {
    const dimensionCriteria = normalizeCriteria(
      readFirstDefined(rubricValue.criteria, rubricValue.dimensions, rubricValue.items)
    );
    const gateCriteria = Array.isArray(rubricValue.gates)
      ? rubricValue.gates.map((gate, index) => ({
          id: readText(gate?.id) || `gate-${index + 1}`,
          label: `Required gate: ${readText(gate?.title, gate?.label) || (readText(gate?.id) || `gate-${index + 1}`).replace(/[-_]+/g, " ")}`,
          score: null,
          rationale: [
            readText(gate?.criterion),
            readFiniteNumber(gate?.failureCap) === null
              ? ""
              : `Failure caps the total score at ${gate.failureCap}.`
          ].filter(Boolean).join(" ")
        }))
      : [];
    return {
      summary: readText(
        rubricValue.summary,
        rubricValue.description,
        rubricValue.instructions,
        rubricValue.judgeInstructions
      ),
      criteria: [...gateCriteria, ...dimensionCriteria]
    };
  }

  const firstCriteria = rows.find((row) => row.criteria.length > 0)?.criteria ?? [];
  return { summary: "", criteria: firstCriteria.map(({ id, label }) => ({ id, label, score: null, rationale: "" })) };
}

function normalizeJudgeRecord({ record = {}, configuration = {}, run, candidateOrder = [] }) {
  const judgeModels = Array.isArray(run.judgeModels) ? run.judgeModels : [];
  const judgeConfiguration = record.configuration ?? configuration;
  const configurationId = readText(judgeConfiguration.id, record.configurationId, record.id) || "Not recorded";
  return {
    id: readText(record.reviewerId, record.panelMemberId, record.id, judgeConfiguration.id) || "Not recorded",
    reviewerId: readText(record.reviewerId, record.panelMemberId) || null,
    configurationId,
    model: readText(
      judgeConfiguration.model,
      judgeConfiguration.modelId,
      judgeConfiguration.id,
      record.modelId,
      record.model,
      run.judge?.modelId,
      run.judge?.model,
      run.judgeModel,
      judgeModels.join(", ")
    ) || "Not recorded",
    reasoningEffort: readText(
      judgeConfiguration.reasoning,
      judgeConfiguration.reasoningEffort,
      record.reasoningEffort,
      record.reasoning,
      run.judge?.reasoningEffort,
      run.judge?.reasoning
    ) || "Not recorded",
    status: readText(record.status, run.judging?.status, run.judge?.status, run.judgeStatus) || "unknown",
    freshContext: typeof record.freshContext === "boolean"
      ? record.freshContext
      : typeof run.judging?.freshContext === "boolean"
        ? run.judging.freshContext
      : typeof run.judge?.freshContext === "boolean"
        ? run.judge.freshContext
        : null,
    blinded: typeof record.blinded === "boolean"
      ? record.blinded
      : typeof run.judging?.blinded === "boolean"
        ? run.judging.blinded
      : typeof run.judge?.blinded === "boolean"
        ? run.judge.blinded
        : null,
    calibrationStatus: readText(
      record.calibrationStatus,
      run.judging?.calibrationStatus,
      run.judge?.calibrationStatus
    ) || "Not recorded",
    cohortHash: readText(record.cohortHash, run.judging?.cohortHash, run.judge?.cohortHash) || "Not recorded",
    cohortSize: readFiniteNumber(record.cohortSize, run.judging?.cohortSize, run.judge?.cohortSize),
    promptHash: readText(record.promptHash, run.judging?.promptHash, run.judge?.promptHash) || "Not recorded",
    error: readText(
      record.error?.message,
      record.error,
      run.judge?.error?.message,
      run.judge?.error
    ),
    summary: readText(
      record.comparativeNote,
      record.summary,
      run.judge?.summary,
      run.judgeSummary,
      run.bottomLine?.summary
    ),
    outputText: readText(record.outputText),
    candidateOrder: Array.isArray(record.candidateOrder) ? record.candidateOrder : candidateOrder,
    sourceReviewerIds: Array.isArray(record.sourceReviewerIds)
      ? record.sourceReviewerIds.map((value) => readText(value)).filter(Boolean)
      : [],
    selections: Array.isArray(record.selections)
      ? record.selections.map((selection) => ({
        candidateId: readText(selection?.candidateId),
        rowKey: readText(selection?.rowKey),
        reviewerId: readText(selection?.reviewerId, selection?.panelMemberId),
        reason: readText(selection?.reason),
        score: readFiniteNumber(selection?.score)
      }))
      : [],
    usage: record.usage ?? null,
    costUsd: readFiniteNumber(record.costUsd),
    durationMs: readFiniteNumber(record.durationMs)
  };
}

function normalizeJudging(run) {
  const topLevelCandidateOrder = Array.isArray(run.judging?.candidateOrder)
    ? run.judging.candidateOrder
    : Array.isArray(run.judge?.candidateOrder)
      ? run.judge.candidateOrder
      : [];
  const memberSources = Array.isArray(run.judging?.judges)
    ? run.judging.judges
    : Array.isArray(run.judging?.panel?.members)
      ? run.judging.panel.members
      : [];
  const configuredMembers = Array.isArray(run.judging?.judgeConfigurations)
    ? run.judging.judgeConfigurations
    : [];
  const synthesisSource = run.judging?.synthesis ?? run.judging?.synthesizer ?? null;
  const judgingStrategy = readText(run.judging?.strategy);
  const hasPanelShape = judgingStrategy === "panel-synthesis-v1" || memberSources.length > 1 || Boolean(synthesisSource);

  if (hasPanelShape) {
    const members = memberSources.map((record, index) => normalizeJudgeRecord({
      record,
      configuration: configuredMembers[index] ?? {},
      run,
      candidateOrder: topLevelCandidateOrder
    })).sort((left, right) => {
      const leftIsSolUltra = left.model.toLowerCase().endsWith("gpt-5.6-sol") && left.reasoningEffort.toLowerCase() === "ultra";
      const rightIsSolUltra = right.model.toLowerCase().endsWith("gpt-5.6-sol") && right.reasoningEffort.toLowerCase() === "ultra";
      return Number(rightIsSolUltra) - Number(leftIsSolUltra);
    });
    const synthesisConfiguration = synthesisSource?.configuration ??
      run.judging?.synthesizerConfiguration ??
      run.judging?.judgeConfiguration ?? {};
    const synthesis = synthesisSource
      ? normalizeJudgeRecord({
        record: synthesisSource,
        configuration: synthesisConfiguration,
        run,
        candidateOrder: topLevelCandidateOrder
      })
      : null;
    const effective = synthesis ?? members[0] ?? normalizeJudgeRecord({
      record: run.judging ?? {},
      configuration: run.judging?.judgeConfiguration ?? {},
      run,
      candidateOrder: topLevelCandidateOrder
    });
    return {
      mode: "panel",
      members,
      requestedCount: configuredMembers.length || members.length,
      completedCount: members.filter((member) => member.status === "complete").length,
      synthesis,
      scoreAuthority: synthesis?.status === "complete" ? "synthesizer" : "none",
      disagreement: run.judging?.disagreement ?? null,
      panelPromptHash: readText(run.judging?.panelPromptHash) || "Not recorded",
      basisHash: readText(run.judging?.basisHash) || "Not recorded",
      effective
    };
  }

  const effective = normalizeJudgeRecord({
    record: memberSources[0] ?? run.judging ?? {},
    configuration: run.judging?.judgeConfiguration ?? run.judge?.judgeConfiguration ?? {},
    run,
    candidateOrder: topLevelCandidateOrder
  });
  return {
    mode: "single",
    members: [effective],
    requestedCount: 1,
    completedCount: effective.status === "complete" ? 1 : 0,
    synthesis: null,
    scoreAuthority: "single-judge",
    disagreement: null,
    panelPromptHash: effective.promptHash,
    basisHash: readText(run.judging?.basisHash) || "Not recorded",
    effective
  };
}

function resolveJudgeCandidateReferences(summary, candidateOrder, rows) {
  if (!summary || !Array.isArray(candidateOrder)) {
    return summary;
  }

  const rowsByKey = new Map(rows.map((row) => [row.id, row]));
  return candidateOrder.reduce((resolvedSummary, candidate) => {
    const candidateId = readText(candidate?.candidateId);
    const row = rowsByKey.get(readText(candidate?.rowKey));
    if (!candidateId || !row) {
      return resolvedSummary;
    }

    const escapedCandidateId = candidateId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return resolvedSummary.replace(
      new RegExp(escapedCandidateId, "gi"),
      () => `${row.configurationLabel} · ${row.conditionLabel}`
    );
  }, summary);
}

function normalizeLimitations(run, matchedCount) {
  const supplied = readFirstDefined(
    run.limitations,
    run.judging?.limitations,
    run.judge?.limitations,
    run.benchmark?.definition?.limitations
  );
  const limitations = Array.isArray(supplied)
    ? supplied.map((value) => readText(value)).filter(Boolean)
    : readText(supplied)
      ? [readText(supplied)]
      : [];

  if (matchedCount < 2) {
    limitations.push("The observed lift is based on fewer than two matched generations; treat it as directional, not stable.");
  }
  if (
    readText(run.benchmarkId, run.benchmarkName, run.benchmark?.id) === "hyper-scale-chat" &&
    readText(run.treatment?.skillName) === "plan__question-spec-architecture"
  ) {
    limitations.push("The treatment contains a chat-specific worked default. This run measures retrieval and application of that guidance, not novel-task generalization.");
  }
  if (
    readText(run.runStatus, run.status).toLowerCase() !== "complete" ||
    readFiniteNumber(run.summary?.rowCounts?.complete) !== readFiniteNumber(run.summary?.rowCounts?.expected)
  ) {
    limitations.push("The requested matrix is incomplete. Any displayed lift or best answer describes completed cells only and is not an overall benchmark result.");
  }
  limitations.push("Model-judge scores are comparative evidence, not ground truth; inspect the full answers and rationale below.");

  return [...new Set(limitations)];
}

function inferPrompt(run, rowsSource) {
  return readText(
    run.prompt,
    run.benchmarkPrompt,
    run.benchmark?.prompt,
    run.benchmark?.definition?.prompt,
    run.benchmark?.definition?.cases?.[0]?.prompt,
    run.benchmark?.definition?.cases?.[0]?.task,
    run.benchmark?.definition?.cases?.[0]?.input,
    run.suite?.prompt,
    run.case?.prompt,
    rowsSource.find((row) => typeof row?.prompt === "string")?.prompt,
    rowsSource.find((row) => typeof row?.caseDefinitionSnapshot?.prompt === "string")?.caseDefinitionSnapshot?.prompt,
    rowsSource.find((row) => typeof row?.caseDefinitionSnapshot?.input === "string")?.caseDefinitionSnapshot?.input
  ) || "Prompt not recorded in this run artifact.";
}

function normalizeModelDefinitions(run) {
  const models = readFirstDefined(run.models, run.modelConfigurations, run.configurations);
  const modelList = Array.isArray(models) ? models : [];
  const modelDefinitions = new Map();
  for (const [index, model] of modelList.entries()) {
    const id = readText(model?.id, model?.modelConfigId, model?.modelId, model?.model) || `model-${index + 1}`;
    modelDefinitions.set(id, model);
    const modelId = readText(model?.modelId, model?.model);
    if (modelId && !modelDefinitions.has(modelId)) {
      modelDefinitions.set(modelId, model);
    }
  }
  return modelDefinitions;
}

function normalizeConditionDefinitions(run) {
  const conditions = Array.isArray(run.conditions) ? run.conditions : [];
  return new Map(conditions.map((condition, index) => [
    readText(condition?.id, condition?.conditionId) || `condition-${index + 1}`,
    condition
  ]));
}

function normalizeTreatment(run) {
  const treatment = run.treatment && typeof run.treatment === "object" ? run.treatment : {};
  const skillName = readText(treatment.skillName);
  const recordedLabel = readText(treatment.label, skillName) || "Vasir";
  return {
    id: readText(treatment.id) || "vasir",
    label: skillName === "plan__question-spec-architecture"
      ? "Vasir architecture skill"
      : recordedLabel,
    type: readText(treatment.type) || "treatment"
  };
}

export function normalizeBenchmarkReportData(runArtifact) {
  const run = runArtifact && typeof runArtifact === "object" ? runArtifact : {};
  const rowsSourceValue = readFirstDefined(
    run.rows,
    run.responses,
    run.outputs,
    run.results?.responses,
    run.results?.rows
  );
  const rowsSource = Array.isArray(rowsSourceValue) ? rowsSourceValue : [];
  const modelDefinitions = normalizeModelDefinitions(run);
  const conditionDefinitions = normalizeConditionDefinitions(run);
  const treatment = normalizeTreatment(run);
  const rankingLookup = buildRankingLookup(run);
  const rows = rowsSource.map((row, index) => normalizeRow(
    row,
    index,
    modelDefinitions,
    conditionDefinitions,
    treatment,
    rankingLookup
  ));
  const aggregates = aggregateRows(rows);
  const comparisons = createComparisons(rows);
  const matchedDeltas = createMatchedDeltas(rows);
  const measuredAggregates = aggregates.filter((aggregate) => aggregate.score !== null);
  const bestConfiguration = measuredAggregates[0] ?? null;
  const observedLift = mean(matchedDeltas.map((pair) => pair.delta));
  const fallbackLift = observedLift ?? (() => {
    const cleanMean = mean(rows.filter((row) => row.conditionId === "clean").map((row) => row.score));
    const vasirMean = mean(rows.filter((row) => row.conditionId === "vasir").map((row) => row.score));
    return cleanMean !== null && vasirMean !== null ? vasirMean - cleanMean : null;
  })();
  const benchmarkId = readText(
    run.benchmarkId,
    run.benchmarkName,
    run.benchmark?.id,
    run.suiteId,
    run.skillName
  ) || "benchmark";
  const benchmarkTitle = readText(
    run.benchmarkTitle,
    run.title,
    run.benchmark?.title,
    run.suite?.title
  ) || benchmarkId.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
  const completedAt = readText(run.completedAt, run.finishedAt, run.createdAt);
  const judging = normalizeJudging(run);
  const judge = judging.effective;
  const reviewersById = new Map(judging.members
    .filter((member) => member.reviewerId)
    .map((member) => [member.reviewerId, member]));
  for (const row of rows) {
    const selectedReviewer = reviewersById.get(row.selectedReviewerId);
    row.selectedReviewerLabel = selectedReviewer
      ? `${selectedReviewer.model} · ${selectedReviewer.reasoningEffort}`
      : "";
  }
  for (const member of judging.members) {
    member.summary = resolveJudgeCandidateReferences(
      member.summary,
      member.candidateOrder,
      rows
    );
  }
  if (judging.synthesis) {
    judging.synthesis.summary = resolveJudgeCandidateReferences(
      judging.synthesis.summary,
      judging.synthesis.candidateOrder,
      rows
    );
  }
  judge.summary = resolveJudgeCandidateReferences(
    judge.summary,
    judge.candidateOrder,
    rows
  );
  const rubric = normalizeRubric(run, rows);
  const requestedConfigurationCount = Array.isArray(run.requestedModels)
    ? run.requestedModels.length
    : Array.isArray(run.configurations)
      ? run.configurations.length
      : Array.isArray(run.modelConfigurations)
        ? run.modelConfigurations.length
        : new Set(rows.map((row) => row.modelKey)).size;
  const measuredConfigurationCount = new Set(
    rows.filter((row) => row.score !== null).map((row) => row.modelKey)
  ).size;
  const expectedRowCount = readFiniteNumber(run.summary?.rowCounts?.expected) ?? rows.length;
  const completedRowCount = readFiniteNumber(run.summary?.rowCounts?.complete) ??
    rows.filter((row) => row.status === "complete" || row.status === "scored").length;
  const matrixComplete =
    readText(run.runStatus, run.status).toLowerCase() === "complete" &&
    completedRowCount === expectedRowCount &&
    measuredConfigurationCount === requestedConfigurationCount;

  return {
    schemaVersion: 1,
    benchmarkId,
    benchmarkTitle,
    treatment,
    runId: readText(run.runId, run.id) || "unidentified-run",
    runStatus: readText(run.runStatus, run.status) || "unknown",
    completedAt,
    prompt: inferPrompt(run, rowsSource),
    rows,
    aggregates,
    comparisons,
    matchedDeltas,
    matchedCount: matchedDeltas.length,
    observedLift: fallbackLift,
    bestConfiguration,
    judge,
    judging,
    scoreLabel: judging.scoreAuthority === "synthesizer"
      ? "synthesized score"
      : judging.scoreAuthority === "single-judge"
        ? "judge score"
        : "score",
    rubric,
    limitations: normalizeLimitations(run, matchedDeltas.length),
    source: {
      harnessVersion: readText(run.harnessVersion) || "Not recorded",
      scorerVersion: readText(run.scorerVersion) || (run.scorerVersion ?? "Not recorded"),
      trialCount: readFiniteNumber(run.generation?.trialCount, run.trialCount) ?? new Set(rows.map((row) => row.trialNumber)).size,
      totalCostUsd: readFiniteNumber(
        run.summary?.costUsd,
        run.summary?.costUsd?.total,
        run.summary?.cost?.usd,
        run.summary?.cost?.totalUsd
      ),
      totalTokens: readFiniteNumber(
        run.summary?.usage?.totalTokens,
        run.summary?.usage?.total_tokens,
        run.summary?.usage?.total?.totalTokens,
        run.summary?.usage?.total?.total_tokens
      ),
      requestedConfigurationCount,
      measuredConfigurationCount,
      expectedRowCount,
      completedRowCount,
      matrixComplete,
      skipped: Array.isArray(run.skippedProviders)
        ? run.skippedProviders
        : Array.isArray(run.skippedConfigurations)
          ? run.skippedConfigurations
          : []
    }
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function serializeJsonForHtml(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function formatScore(score) {
  return score === null ? "—" : score.toFixed(1);
}

function formatLift(lift) {
  if (lift === null) {
    return "No paired score";
  }
  const sign = lift > 0 ? "+" : "";
  return `${sign}${lift.toFixed(1)} pts`;
}

function formatDate(dateText) {
  if (!dateText) {
    return "Date not recorded";
  }
  const parsed = new Date(dateText);
  return Number.isNaN(parsed.valueOf()) ? dateText : parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function renderCriteriaList(criteria) {
  if (criteria.length === 0) {
    return '<p class="benchmark-method__empty">No criterion-level rubric was recorded.</p>';
  }

  return `<ol class="benchmark-method__criteria">${criteria.map((criterion) => `
    <li class="benchmark-method__criterion">
      <span class="benchmark-method__criterion-name">${escapeHtml(criterion.label)}</span>
      ${criterion.rationale ? `<span class="benchmark-method__criterion-note">${escapeHtml(criterion.rationale)}</span>` : ""}
    </li>`).join("")}
  </ol>`;
}

function renderLimitations(limitations) {
  return limitations.map((limitation) => `<li class="benchmark-method__limitation">${escapeHtml(limitation)}</li>`).join("");
}

function renderJudgePanelEvidence(judging) {
  if (judging.mode !== "panel") {
    return "";
  }
  const disagreement = judging.disagreement;
  const disagreementText = judging.completedCount < 2
    ? `Disagreement is unavailable because only ${judging.completedCount}/${judging.requestedCount} judgments completed.`
    : disagreement && Number.isFinite(disagreement.candidateCount)
    ? `${disagreement.candidatesWithDisagreement ?? 0}/${disagreement.candidateCount} candidates drew different judgments${
      Number.isFinite(disagreement.maxScoreSpread)
        ? ` · widest score spread ${formatScore(disagreement.maxScoreSpread)}`
        : ""
    }.`
    : "Per-candidate disagreement was not recorded.";
  const members = judging.members.map((member) => `
    <article class="benchmark-method__panel-member">
      <div class="benchmark-method__panel-heading">
        <span class="benchmark-method__panel-model">${member.reviewerId ? `${escapeHtml(member.reviewerId)} · ` : ""}${escapeHtml(member.model)} · ${escapeHtml(member.reasoningEffort)}</span>
        <span class="benchmark-method__panel-status">${escapeHtml(member.status)}</span>
      </div>
      ${member.error
        ? `<p class="benchmark-method__panel-copy">Failure: ${escapeHtml(member.error)}</p>`
        : member.summary
          ? `<p class="benchmark-method__panel-copy">${escapeHtml(member.summary)}</p>`
          : '<p class="benchmark-method__panel-copy">No comparative note was recorded.</p>'}
      ${member.outputText ? `
      <details class="benchmark-method__judge-output">
        <summary class="benchmark-method__judge-output-summary">Read exact judge output</summary>
        <pre class="benchmark-method__judge-output-text">${escapeHtml(member.outputText)}</pre>
      </details>` : ""}
    </article>`).join("");
  const synthesisOutput = judging.synthesis?.outputText ? `
    <details class="benchmark-method__judge-output">
      <summary class="benchmark-method__judge-output-summary">Read exact synthesis output</summary>
      <pre class="benchmark-method__judge-output-text">${escapeHtml(judging.synthesis.outputText)}</pre>
    </details>` : "";

  return `
    <p class="benchmark-method__panel-summary">${escapeHtml(disagreementText)}</p>
    ${synthesisOutput}
    <details class="benchmark-method__panel">
      <summary class="benchmark-method__panel-toggle">Panel evidence · ${escapeHtml(judging.completedCount)}/${escapeHtml(judging.requestedCount)} judgments complete</summary>
      <div class="benchmark-method__panel-members">${members}</div>
    </details>`;
}

function renderTableRows(rows) {
  if (rows.length === 0) {
    return '<tr class="benchmark-table__row"><td class="benchmark-table__cell" colspan="10">No responses were recorded.</td></tr>';
  }

  return rows.map((row) => `
    <tr class="benchmark-table__row">
      <td class="benchmark-table__cell">${escapeHtml(row.modelLabel)}</td>
      <td class="benchmark-table__cell">${escapeHtml(row.reasoningEffort)}</td>
      <td class="benchmark-table__cell"><span class="ui-pill ui-pill--${row.conditionId === "vasir" ? "vasir" : "clean"}">${escapeHtml(row.conditionLabel)}</span></td>
      <td class="benchmark-table__cell benchmark-table__cell--numeric">${escapeHtml(row.trialNumber)}</td>
      <td class="benchmark-table__cell benchmark-table__cell--numeric">${escapeHtml(formatScore(row.score))}</td>
      <td class="benchmark-table__cell">${escapeHtml(row.status)}</td>
      <td class="benchmark-table__cell benchmark-table__cell--numeric">${row.usage.totalTokens === null ? "—" : escapeHtml(row.usage.totalTokens.toLocaleString("en-US"))}</td>
      <td class="benchmark-table__cell benchmark-table__cell--numeric">${row.costUsd === null ? "—" : escapeHtml(`$${row.costUsd.toFixed(4)}`)}</td>
      <td class="benchmark-table__cell benchmark-table__cell--numeric">${row.durationMs === null ? "—" : escapeHtml(`${Math.round(row.durationMs).toLocaleString("en-US")} ms`)}</td>
      <td class="benchmark-table__cell">
        <details class="benchmark-table__response">
          <summary class="benchmark-table__summary">Read full answer</summary>
          <pre class="benchmark-table__output">${escapeHtml(row.outputText || row.error || "No response text recorded.")}</pre>
          ${row.rationale ? `<p class="benchmark-table__rationale"><strong class="benchmark-table__rationale-label">Judge:</strong> ${escapeHtml(row.rationale)}</p>` : ""}
          ${row.synthesisReason ? `<p class="benchmark-table__rationale"><strong class="benchmark-table__rationale-label">Synthesis${row.selectedReviewerLabel ? ` · ${escapeHtml(row.selectedReviewerLabel)}` : ""}:</strong> ${escapeHtml(row.synthesisReason)}</p>` : ""}
        </details>
      </td>
    </tr>`).join("");
}

const REPORT_STYLES = String.raw`
  :root {
    --space-1: 0.35rem;
    --space-2: 0.55rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.25rem;
    --space-6: 1.5rem;
    --space-7: 2rem;
    --space-8: 2.5rem;
    --space-9: 3rem;
    --space-10: 4rem;
    --space-11: 5rem;
    --space-12: 7rem;

    --radius-sm: 0.55rem;
    --radius-md: 1rem;
    --radius-lg: 1.75rem;
    --radius-full: 9999px;

    --z-base: 0;
    --z-raised: 10;
    --z-sticky: 200;

    --duration-instant: 80ms;
    --duration-fast: 120ms;
    --duration-ui: 180ms;
    --duration-page: 360ms;
    --ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);

    --color-canvas: #f3f1ea;
    --color-paper: #fffdf8;
    --color-ink: #151515;
    --color-ink-soft: #5f5e59;
    --color-canvas-line: #d9d6cd;
    --color-surface: #0c0d0f;
    --color-surface-deep: #07080b;
    --color-surface-raised: #17191c;
    --color-surface-soft: #202226;
    --color-text-primary: #ffffff;
    --color-text-secondary: rgba(255, 255, 255, 0.72);
    --color-text-muted: rgba(255, 255, 255, 0.54);
    --color-accent: #dfff65;
    --color-accent-strong: #edffad;
    --color-clean: #ff6d5e;
    --color-clean-soft: #ffafa6;
    --color-interaction: #1769ff;
    --color-interaction-deep: #0c4fd4;
    --color-danger: #ff6d5e;
    --color-border: rgba(255, 255, 255, 0.2);
    --color-border-strong: rgba(255, 255, 255, 0.34);
    --color-grid: rgba(255, 255, 255, 0.12);
    --color-hero-scrim: rgba(12, 13, 15, 0.82);
    --color-focus: #1769ff;
    --color-selection: #dce8ff;

    --font-display: "Kanit", "Arial Black", "Helvetica Neue", Arial, sans-serif;
    --font-body: "Plus Jakarta Sans", "Avenir Next", Avenir, "Helvetica Neue", sans-serif;
    --font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    --text-xs: 0.68rem;
    --text-sm: 0.82rem;
    --text-base: 1rem;
    --text-lg: clamp(1rem, 1.2vw, 1.15rem);
    --text-xl: clamp(1.5rem, 2.2vw, 2.3rem);
    --text-2xl: clamp(1.9rem, 2.8vw, 3rem);
    --text-3xl: clamp(2.75rem, 4vw, 4rem);
    --leading-tight: 0.94;
    --leading-normal: 1.5;
    --leading-relaxed: 1.62;
    --weight-normal: 400;
    --weight-medium: 700;
    --weight-bold: 700;
    --tracking-label: 0.12em;
    --tracking-tight: -0.004em;

    --frame-width: 92rem;
    --page-width: min(var(--frame-width), calc(100vw - 3rem));
    --reading-width: 62ch;
    --control-height: 3rem;
    --masthead-primary-height: 4.25rem;
    --masthead-local-height: 2.75rem;
    --chart-min-height: 16rem;
    --hairline: 1px;
    --focus-width: 3px;
    --point-size: 0.45rem;
    --chart-stroke: 2px;
  }

  *, *::before, *::after { box-sizing: border-box; }

  html {
    color-scheme: light;
    scroll-behavior: smooth;
    background: var(--color-canvas);
  }

  body {
    margin: 0;
    min-width: 20rem;
    background: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-body);
    font-size: var(--text-base);
    line-height: var(--leading-normal);
    -webkit-font-smoothing: antialiased;
  }

  ::selection {
    background: var(--color-selection);
    color: var(--color-ink);
  }

  a { color: inherit; }

  button,
  select { font: inherit; }

  .layout-frame {
    width: var(--page-width);
    margin-inline: auto;
  }

  .layout-stack {
    display: flex;
    flex-direction: column;
    gap: var(--stack-space, var(--space-5));
  }

  .layout-stack--compact { --stack-space: var(--space-4); }

  .ui-pill {
    display: inline-flex;
    align-items: center;
    min-height: var(--space-5);
    padding-inline: var(--space-2);
    border: var(--hairline) solid currentColor;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    letter-spacing: var(--tracking-label);
    line-height: var(--leading-tight);
    text-transform: uppercase;
  }

  .ui-pill--vasir { color: var(--color-accent); }
  .ui-pill--clean { color: var(--color-clean-soft); }

  .ui-select {
    width: 100%;
    min-height: var(--control-height);
    padding: var(--space-2) var(--space-4);
    border: var(--hairline) solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-surface-deep);
    color: var(--color-text-primary);
    cursor: pointer;
  }

  .ui-select:focus-visible,
  .benchmark-answer__rubric-summary:focus-visible,
  .benchmark-table__summary:focus-visible,
  .benchmark-chart__point:focus-visible {
    outline: var(--focus-width) solid var(--color-focus);
    outline-offset: var(--space-2);
  }

  .benchmark-report {
    position: relative;
    isolation: isolate;
    min-height: 100svh;
  }

  .benchmark-report__header,
  .benchmark-report__main,
  .benchmark-report__footer {
    position: relative;
    z-index: var(--z-raised);
  }

  .benchmark-report__header {
    position: sticky;
    z-index: var(--z-sticky);
    top: 0;
    border-bottom: var(--hairline) solid var(--color-canvas-line);
    background: var(--color-canvas);
    color: var(--color-ink);
  }

  .benchmark-report__masthead {
    display: grid;
    min-height: var(--masthead-primary-height);
    align-items: center;
    gap: var(--space-6);
    grid-template-columns: auto minmax(0, 1fr);
  }

  .benchmark-report__nav {
    display: flex;
    min-width: 0;
    align-items: stretch;
    justify-content: flex-end;
    gap: var(--space-1);
  }

  .benchmark-report__nav-link {
    position: relative;
    display: inline-flex;
    min-height: var(--masthead-local-height);
    align-items: center;
    justify-content: center;
    padding-inline: var(--space-4);
    color: var(--color-ink-soft);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    line-height: 1.15;
    text-align: center;
    text-decoration: none;
    text-wrap: balance;
  }

  .benchmark-report__nav-link::after {
    position: absolute;
    right: var(--space-4);
    bottom: 0;
    left: var(--space-4);
    height: var(--space-1);
    background: var(--color-interaction);
    content: "";
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .benchmark-report__nav-link--current {
    color: var(--color-ink);
  }

  .benchmark-report__nav-link--current::after { transform: scaleX(1); }

  .benchmark-report__local-nav {
    display: flex;
    min-height: var(--masthead-local-height);
    align-items: stretch;
    border-top: var(--hairline) solid var(--color-canvas-line);
    gap: var(--space-6);
  }

  .benchmark-report__local-link {
    display: inline-flex;
    min-height: var(--masthead-local-height);
    align-items: center;
    color: var(--color-ink-soft);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    letter-spacing: 0.02em;
    line-height: 1;
    text-decoration: none;
  }

  .benchmark-report__nav-link:focus-visible,
  .benchmark-report__local-link:focus-visible,
  .benchmark-report__brand:focus-visible {
    outline: var(--focus-width) solid var(--color-interaction);
    outline-offset: var(--space-1);
  }

  .benchmark-report__brand {
    display: inline-flex;
    min-height: var(--masthead-local-height);
    align-items: center;
    color: var(--color-ink);
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-style: italic;
    font-weight: 900;
    gap: var(--space-2);
    letter-spacing: -0.035em;
    line-height: 1;
    text-decoration: none;
    text-transform: uppercase;
  }

  .benchmark-report__brand-product {
    color: var(--color-interaction);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    font-style: normal;
    letter-spacing: 0.16em;
  }

  .benchmark-report__meta {
    align-self: center;
    margin-left: auto;
    max-width: 100%;
    color: var(--color-ink-soft);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .benchmark-report__main {
    color-scheme: dark;
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-block: 0 var(--space-8);
    padding: 0;
    min-width: 0;
    overflow: hidden;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .benchmark-report__footer {
    width: var(--page-width);
    margin-inline: auto;
    padding-block: var(--space-5) var(--space-7);
    border-top: var(--hairline) solid var(--color-canvas-line);
    color: var(--color-ink-soft);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .benchmark-hero {
    isolation: isolate;
    position: relative;
    display: grid;
    min-width: 0;
    overflow: hidden;
    padding: clamp(var(--space-9), 5vw, var(--space-11)) clamp(var(--space-7), 4vw, var(--space-10)) 0;
    align-items: center;
    background: var(--color-surface-deep);
    gap: clamp(var(--space-7), 3vw, var(--space-9));
    grid-template-areas:
      "hero-copy hero-aside"
      "hero-proof hero-proof";
    grid-template-columns: minmax(0, 1.45fr) minmax(18rem, 0.55fr);
  }

  .benchmark-hero__content {
    position: relative;
    z-index: var(--z-raised);
    display: grid;
    min-width: 0;
    max-width: 56rem;
    align-self: center;
    gap: var(--space-5);
    grid-area: hero-copy;
  }

  .benchmark-hero__eyebrow,
  .benchmark-section__eyebrow,
  .benchmark-method__label,
  .benchmark-answer__label {
    color: var(--color-accent);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }

  .benchmark-hero__headline {
    margin: 0;
    max-width: 15ch;
    color: var(--color-text-primary);
    font-family: var(--font-display);
    font-size: var(--text-3xl);
    font-style: italic;
    font-weight: 900;
    letter-spacing: var(--tracking-tight);
    line-height: var(--leading-tight);
    text-wrap: balance;
    text-transform: uppercase;
    word-spacing: 0.05em;
  }

  .benchmark-hero__copy {
    max-width: 52ch;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--text-lg);
    line-height: var(--leading-relaxed);
    overflow-wrap: anywhere;
  }

  .benchmark-hero__copy--strong {
    color: var(--color-text-primary);
    font-weight: var(--weight-bold);
  }

  .benchmark-hero__prompt {
    margin: 0;
    max-width: 68ch;
    padding: var(--space-4) 0 0;
    border-top: var(--hairline) solid var(--color-border);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.02em;
    line-height: var(--leading-relaxed);
    overflow-wrap: anywhere;
  }

  .benchmark-hero__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .ui-action {
    display: inline-flex;
    min-height: 3.25rem;
    align-items: center;
    justify-content: space-between;
    padding-inline: var(--space-5);
    border: var(--hairline) solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    gap: var(--space-6);
    text-decoration: none;
    transition:
      background-color var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out),
      transform var(--duration-fast) var(--ease-out);
  }

  .ui-action--primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-surface);
  }

  .ui-action--secondary { background: var(--color-hero-scrim); }

  .ui-action:focus-visible {
    outline: var(--focus-width) solid var(--color-accent);
    outline-offset: var(--space-2);
  }

  .benchmark-hero__aside {
    position: relative;
    z-index: var(--z-raised);
    min-width: 0;
    align-self: end;
    padding: clamp(var(--space-6), 3vw, var(--space-8));
    border: var(--hairline) solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-hero-scrim);
    grid-area: hero-aside;
  }

  .benchmark-hero__aside-title {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .benchmark-hero__aside-value {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(3.5rem, 5vw, 5.25rem);
    font-style: italic;
    font-weight: 900;
    letter-spacing: var(--tracking-tight);
    line-height: var(--leading-tight);
    font-variant-numeric: tabular-nums;
  }

  .benchmark-hero__aside-note {
    margin: 0;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    overflow-wrap: anywhere;
  }

  .benchmark-hero__proof {
    position: relative;
    z-index: var(--z-raised);
    display: grid;
    min-width: 0;
    margin-inline: calc(clamp(var(--space-7), 4vw, var(--space-10)) * -1);
    border-top: var(--hairline) solid var(--color-border);
    grid-area: hero-proof;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .benchmark-hero__proof-item {
    display: grid;
    min-width: 0;
    padding: var(--space-6) clamp(var(--space-6), 3vw, var(--space-8));
    border-left: var(--hairline) solid var(--color-border);
    gap: var(--space-2);
  }

  .benchmark-hero__proof-item:first-child { border-left: 0; }

  .benchmark-hero__proof-label {
    color: var(--color-accent);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }

  .benchmark-hero__proof-value {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    line-height: var(--leading-normal);
    overflow-wrap: anywhere;
  }

  .benchmark-section {
    min-width: 0;
    padding: clamp(var(--space-9), 5vw, var(--space-11)) clamp(var(--space-7), 4vw, var(--space-10));
    border-bottom: var(--hairline) solid var(--color-border);
    scroll-margin-top: calc(var(--masthead-primary-height) + var(--space-4));
  }

  .benchmark-section__header {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(20rem, 0.8fr);
    gap: clamp(var(--space-7), 4vw, var(--space-10));
    align-items: end;
    padding-bottom: var(--space-8);
  }

  .benchmark-section__heading,
  .benchmark-section__summary {
    min-width: 0;
  }

  .benchmark-section__title {
    max-width: 18ch;
    margin: var(--space-3) 0 0;
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-style: italic;
    font-weight: 900;
    letter-spacing: var(--tracking-tight);
    line-height: var(--leading-tight);
    text-wrap: balance;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }

  .benchmark-section__summary {
    max-width: var(--reading-width);
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    line-height: var(--leading-relaxed);
    overflow-wrap: anywhere;
  }

  .benchmark-chart {
    max-width: 100%;
    min-width: 0;
    min-height: var(--chart-min-height);
    padding-block: var(--space-7) var(--space-4);
    border-top: var(--hairline) solid var(--color-border);
    overflow-x: auto;
    overscroll-behavior-inline: contain;
  }

  .benchmark-chart__svg {
    display: block;
    width: 100%;
    overflow: visible;
  }

  .benchmark-chart__axis,
  .benchmark-chart__label,
  .benchmark-chart__value,
  .benchmark-chart__empty {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .benchmark-chart__axis { color: var(--color-text-muted); }
  .benchmark-chart__axis line { stroke: var(--color-grid); }
  .benchmark-chart__axis path { stroke: var(--color-border-strong); }
  .benchmark-chart__label { fill: var(--color-text-secondary); }
  .benchmark-chart__sublabel { fill: var(--color-text-muted); font-size: var(--text-xs); }
  .benchmark-chart__value { fill: var(--color-text-primary); font-weight: var(--weight-bold); }
  .benchmark-chart__empty { fill: var(--color-text-muted); }
  .benchmark-chart__line { stroke: var(--color-border-strong); stroke-width: var(--chart-stroke); }
  .benchmark-chart__point { fill: var(--color-accent); stroke: var(--color-surface-deep); stroke-width: var(--chart-stroke); cursor: default; }
  .benchmark-chart__point--clean { fill: var(--color-surface-deep); stroke: var(--color-clean); }
  .benchmark-chart__point--vasir { fill: var(--color-accent); stroke: var(--color-surface-deep); }
  .benchmark-chart__range { stroke: var(--color-border-strong); stroke-width: var(--chart-stroke); }
  .benchmark-chart__line {
    animation: benchmark-trace-in var(--duration-page) var(--ease-out) both;
    transform-box: fill-box;
    transform-origin: left center;
  }

  .benchmark-chart__point {
    animation: benchmark-point-in var(--duration-page) var(--ease-out) both;
  }

  .benchmark-answer {
    overflow: hidden;
    border: var(--hairline) solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .benchmark-answer__toolbar {
    display: grid;
    grid-template-columns: minmax(18rem, 1fr) minmax(12rem, 0.42fr);
    gap: var(--space-4);
    padding: var(--space-6) clamp(var(--space-6), 3vw, var(--space-8));
    border-bottom: var(--hairline) solid var(--color-border);
    background: var(--color-surface-soft);
  }

  .benchmark-answer__condition {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .benchmark-answer__field {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--space-2);
  }

  .benchmark-answer__toggle {
    display: grid;
    min-height: var(--control-height);
    overflow: hidden;
    border: var(--hairline) solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-surface-deep);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .benchmark-answer__toggle-input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .benchmark-answer__toggle-label {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) var(--space-4);
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    text-align: center;
  }

  .benchmark-answer__toggle-label + .benchmark-answer__toggle-input + .benchmark-answer__toggle-label {
    border-left: var(--hairline) solid var(--color-border-strong);
  }

  .benchmark-answer__toggle-input:focus-visible + .benchmark-answer__toggle-label {
    outline: var(--focus-width) solid var(--color-focus);
    outline-offset: calc(var(--focus-width) * -1);
  }

  .benchmark-answer__toggle-input[value="clean"]:checked + .benchmark-answer__toggle-label {
    background: var(--color-clean);
    color: var(--color-surface-deep);
  }

  .benchmark-answer__toggle-input[value="vasir"]:checked + .benchmark-answer__toggle-label {
    background: var(--color-accent);
    color: var(--color-surface-deep);
  }

  .benchmark-answer__scope {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .benchmark-answer__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .benchmark-answer__card {
    display: flex;
    min-width: 0;
    flex-direction: column;
    padding: clamp(var(--space-6), 3vw, var(--space-8));
    background: var(--color-surface);
  }

  .benchmark-answer__card[hidden] { display: none; }

  .benchmark-answer__card + .benchmark-answer__card {
    border-left: var(--hairline) solid var(--color-border);
  }

  .benchmark-answer[data-condition="clean"] .benchmark-answer__card {
    border-top: var(--space-1) solid var(--color-clean);
  }

  .benchmark-answer[data-condition="vasir"] .benchmark-answer__card {
    border-top: var(--space-1) solid var(--color-accent);
  }

  .benchmark-answer__metrics {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: var(--space-4);
    margin-top: var(--space-6);
  }

  .benchmark-answer__score {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(2.25rem, 3.5vw, 3.5rem);
    font-style: italic;
    font-weight: 900;
    letter-spacing: var(--tracking-tight);
    line-height: var(--leading-tight);
    font-variant-numeric: tabular-nums;
  }

  .benchmark-answer__delta {
    margin: 0 0 var(--space-1);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    font-variant-numeric: tabular-nums;
  }

  .benchmark-answer__status {
    min-height: 2.5em;
    margin: var(--space-3) 0 0;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: var(--leading-normal);
  }

  .benchmark-answer__output {
    height: 31rem;
    margin: var(--space-5) 0 0;
    padding: var(--space-5);
    overflow: auto;
    border: var(--hairline) solid var(--color-border);
    background: var(--color-surface-deep);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    line-height: var(--leading-relaxed);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .benchmark-answer__rationale {
    margin: var(--space-5) 0 0;
    padding-top: var(--space-4);
    border-top: var(--hairline) solid var(--color-border);
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    line-height: var(--leading-relaxed);
    white-space: pre-line;
  }

  .benchmark-answer__assessment {
    display: grid;
    gap: var(--space-3);
    margin-top: var(--space-5);
    padding-top: var(--space-4);
    border-top: var(--hairline) solid var(--color-border);
  }

  .benchmark-answer__assessment-overview {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .benchmark-answer__assessment-chip {
    display: inline-flex;
    min-height: 1.75rem;
    align-items: center;
    padding-inline: var(--space-3);
    border: var(--hairline) solid var(--color-border-strong);
    border-radius: var(--radius-full);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
  }

  .benchmark-answer__assessment-chip--pass {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .benchmark-answer__assessment-chip--fail {
    border-color: var(--color-clean);
    color: var(--color-clean-soft);
  }

  .benchmark-answer__assessment-note {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    line-height: var(--leading-normal);
  }

  .benchmark-answer__rubric {
    border-top: var(--hairline) solid var(--color-border);
  }

  .benchmark-answer__rubric-summary {
    display: flex;
    min-height: var(--control-height);
    align-items: center;
    justify-content: space-between;
    color: var(--color-text-primary);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    list-style: none;
  }

  .benchmark-answer__rubric-summary::-webkit-details-marker { display: none; }

  .benchmark-answer__rubric-summary::after {
    color: var(--color-accent);
    content: "+";
    font-size: var(--text-base);
  }

  .benchmark-answer__rubric:open .benchmark-answer__rubric-summary::after { content: "−"; }

  .benchmark-answer__rubric-content {
    display: grid;
    gap: var(--space-5);
    padding: var(--space-2) 0 var(--space-4);
  }

  .benchmark-answer__rubric-section { min-width: 0; }

  .benchmark-answer__rubric-label {
    margin: 0 0 var(--space-2);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }

  .benchmark-answer__gates {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .benchmark-answer__gate {
    display: inline-flex;
    min-height: 2rem;
    align-items: center;
    padding-inline: var(--space-3);
    border: var(--hairline) solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    gap: var(--space-2);
  }

  .benchmark-answer__gate--pass { color: var(--color-accent); }
  .benchmark-answer__gate--fail { color: var(--color-clean-soft); }

  .benchmark-answer__dimensions { margin: 0; }

  .benchmark-answer__dimension {
    display: grid;
    min-width: 0;
    grid-template-columns: minmax(0, 1fr) 3rem;
    gap: var(--space-3);
    padding-block: var(--space-2);
    border-top: var(--hairline) solid var(--color-border);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .benchmark-answer__dimension:first-child { border-top: 0; }
  .benchmark-answer__dimension--partial { color: var(--color-clean-soft); }

  .benchmark-answer__dimension-label { min-width: 0; }

  .benchmark-answer__dimension-score {
    margin: 0;
    color: inherit;
    font-weight: var(--weight-bold);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .benchmark-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .benchmark-table__wrap {
    overflow-x: auto;
    border: var(--hairline) solid var(--color-border);
    border-radius: var(--radius-md);
    overscroll-behavior-inline: contain;
  }

  .benchmark-table__head {
    background: var(--color-accent);
    color: var(--color-surface);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-align: left;
    text-transform: uppercase;
  }

  .benchmark-table__cell {
    padding: var(--space-3) var(--space-4);
    border-bottom: var(--hairline) solid var(--color-border);
    border-left: var(--hairline) solid var(--color-border);
    vertical-align: top;
  }

  .benchmark-table__cell:first-child { border-left: 0; }

  .benchmark-table__cell--numeric {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .benchmark-table__row:last-child .benchmark-table__cell { border-bottom: 0; }

  .benchmark-table__summary {
    min-height: var(--control-height);
    color: var(--color-text-primary);
    cursor: pointer;
  }

  .benchmark-table__response { min-width: 12rem; }

  .benchmark-table__caption {
    padding: var(--space-3);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    text-align: left;
  }

  .benchmark-table__output {
    max-width: min(72vw, var(--reading-width));
    max-height: 30rem;
    padding: var(--space-4);
    overflow: auto;
    background: var(--color-surface-deep);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: var(--leading-relaxed);
    white-space: pre-wrap;
  }

  .benchmark-table__rationale {
    max-width: var(--reading-width);
    color: var(--color-text-secondary);
  }

  .benchmark-table__rationale-label { color: var(--color-accent); }

  .benchmark-method {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    overflow: hidden;
    border: var(--hairline) solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .benchmark-method__judge,
  .benchmark-method__rubric,
  .benchmark-method__limits {
    padding: clamp(var(--space-6), 3vw, var(--space-8));
    border-left: var(--hairline) solid var(--color-border);
    background: var(--color-surface);
  }

  .benchmark-method__judge { grid-column: span 4; }
  .benchmark-method__rubric { grid-column: span 5; }
  .benchmark-method__limits { grid-column: span 3; }

  .benchmark-method__judge { border-left: 0; }

  .benchmark-method__title {
    margin: var(--space-2) 0 var(--space-4);
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-style: italic;
    font-weight: 900;
    letter-spacing: var(--tracking-tight);
    line-height: var(--leading-tight);
    text-transform: uppercase;
  }

  .benchmark-method__copy,
  .benchmark-method__empty,
  .benchmark-method__criterion-note {
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
  }

  .benchmark-method__facts {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-2) var(--space-4);
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .benchmark-method__term { color: var(--color-text-muted); }
  .benchmark-method__definition { margin: 0; color: var(--color-text-primary); overflow-wrap: anywhere; }

  .benchmark-method__panel-summary {
    margin: var(--space-5) 0 0;
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
  }

  .benchmark-method__panel {
    margin-top: var(--space-4);
    border-top: var(--hairline) solid var(--color-border);
  }

  .benchmark-method__panel-toggle,
  .benchmark-method__judge-output-summary {
    min-height: var(--control-height);
    padding-block: var(--space-3);
    color: var(--color-accent);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
  }

  .benchmark-method__panel-toggle:focus-visible,
  .benchmark-method__judge-output-summary:focus-visible {
    outline: var(--focus-width) solid var(--color-focus);
    outline-offset: var(--space-2);
  }

  .benchmark-method__panel-members {
    display: flex;
    flex-direction: column;
    border-bottom: var(--hairline) solid var(--color-border);
  }

  .benchmark-method__panel-member {
    padding-block: var(--space-4);
    border-top: var(--hairline) solid var(--color-border);
  }

  .benchmark-method__panel-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .benchmark-method__panel-model,
  .benchmark-method__panel-status {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
  }

  .benchmark-method__panel-model { color: var(--color-text-primary); }
  .benchmark-method__panel-status { color: var(--color-accent); text-transform: uppercase; }

  .benchmark-method__panel-copy {
    margin: var(--space-2) 0 0;
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
  }

  .benchmark-method__judge-output { margin-top: var(--space-2); }

  .benchmark-method__judge-output-text {
    max-height: 24rem;
    margin: 0;
    padding: var(--space-4);
    overflow: auto;
    border-radius: var(--radius-sm);
    background: var(--color-surface-deep);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: var(--leading-relaxed);
    white-space: pre-wrap;
  }

  .benchmark-method__criteria,
  .benchmark-method__limitations {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0;
    padding-left: var(--space-5);
  }

  .benchmark-method__criterion-name {
    display: block;
    color: var(--color-text-primary);
    font-weight: var(--weight-medium);
  }

  .benchmark-method__criterion-note { display: block; margin-top: var(--space-1); }
  .benchmark-method__limitation { color: var(--color-text-secondary); font-size: var(--text-sm); }

  @keyframes benchmark-trace-in {
    from { opacity: 0; transform: scaleX(0.25); }
    to { opacity: 1; transform: scaleX(1); }
  }

  @keyframes benchmark-point-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (hover: hover) and (pointer: fine) {
    .benchmark-report__nav-link:hover,
    .benchmark-report__local-link:hover {
      color: var(--color-interaction-deep);
    }

    .benchmark-report__nav-link:hover::after { transform: scaleX(1); }
    .ui-action:hover { transform: translateY(-2px); }
    .ui-action--primary:hover { background: var(--color-accent-strong); }
  }

  @media (max-width: 64rem) {
    .benchmark-hero {
      min-height: auto;
      grid-template-areas:
        "hero-copy"
        "hero-aside"
        "hero-proof";
      grid-template-columns: minmax(0, 1fr);
    }

    .benchmark-hero__aside { width: min(100%, 32rem); }
    .benchmark-section__header { grid-template-columns: minmax(0, 1fr); }
    .benchmark-answer__grid { grid-template-columns: minmax(0, 1fr); }
    .benchmark-answer__card + .benchmark-answer__card {
      border-top: var(--hairline) solid var(--color-border);
      border-left: 0;
    }
    .benchmark-answer__output {
      height: auto;
      max-height: 34rem;
    }
    .benchmark-method__judge,
    .benchmark-method__rubric { grid-column: span 6; }
    .benchmark-method__limits {
      border-top: var(--hairline) solid var(--color-border);
      border-left: 0;
      grid-column: span 12;
    }
  }

  @media (max-width: 54rem) {
    .benchmark-report__masthead {
      align-items: stretch;
      padding-block: var(--space-1) var(--space-2);
      gap: var(--space-2);
      grid-template-columns: minmax(0, 1fr);
    }

    .benchmark-report__nav {
      display: grid;
      overflow: hidden;
      background: var(--color-canvas-line);
      gap: var(--hairline);
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .benchmark-report__nav-link {
      min-height: var(--masthead-local-height);
      padding-inline: var(--space-2);
      background: var(--color-canvas);
      font-size: var(--text-xs);
    }

    .benchmark-report__local-nav { display: none; }
  }

  @media (max-width: 46rem) {
    :root { --page-width: calc(100vw - 1.25rem); }

    .benchmark-report__main { border-radius: 0 0 var(--radius-md) var(--radius-md); }

    .benchmark-hero {
      padding: var(--space-9) var(--space-6) 0;
      gap: var(--space-7);
    }

    .benchmark-hero__headline {
      max-width: 100%;
      font-size: clamp(2rem, 8vw, 2.75rem);
      overflow-wrap: anywhere;
    }

    .benchmark-hero__actions {
      align-items: stretch;
      flex-direction: column;
    }

    .ui-action { width: 100%; }

    .benchmark-hero__proof {
      width: 100%;
      margin-inline: 0;
      grid-template-columns: minmax(0, 1fr);
    }

    .benchmark-hero__proof-item {
      border-top: var(--hairline) solid var(--color-border);
      border-left: 0;
    }

    .benchmark-hero__proof-item:first-child { border-top: 0; }

    .benchmark-section { padding: var(--space-9) var(--space-6); }
    .benchmark-section__header { padding-bottom: var(--space-7); }
    .benchmark-section__title { max-width: 100%; font-size: clamp(1.75rem, 7vw, 2.35rem); overflow-wrap: anywhere; }
    .benchmark-section__summary { font-size: var(--text-base); }

    .benchmark-answer__toolbar { grid-template-columns: minmax(0, 1fr); }
    .benchmark-answer__scope { grid-column: auto; }

    .benchmark-method__judge,
    .benchmark-method__rubric,
    .benchmark-method__limits {
      border-top: var(--hairline) solid var(--color-border);
      border-left: 0;
      grid-column: span 12;
    }

    .benchmark-method__judge { border-top: 0; }
    .benchmark-hero__prompt { font-size: var(--text-xs); }
  }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

const REPORT_SCRIPT = String.raw`
  (() => {
    "use strict";

    const report = JSON.parse(document.getElementById("benchmark-report-data").textContent);
    const scoreFormat = d3.format(".1f");
    const signedFormat = d3.format("+.1f");

    function getChartMargin(width) {
      if (width < 600) {
        return {
          top: 18,
          right: 44,
          bottom: 42,
          left: Math.max(136, Math.round(width * 0.48)),
        };
      }
      return { top: 18, right: 80, bottom: 42, left: 190 };
    }

    function formatScore(value) {
      return Number.isFinite(value) ? scoreFormat(value) : "—";
    }

    function formatLift(value) {
      return Number.isFinite(value) ? signedFormat(value) + " pts" : "—";
    }

    function addChartSemantics(svg, title, description) {
      svg.attr("role", "img").attr("aria-label", title + ". " + description);
      svg.append("title").text(title);
      svg.append("desc").text(description);
    }

    function addEmptyState(svg, width, message) {
      svg.append("text")
        .attr("class", "benchmark-chart__empty")
        .attr("x", width / 2)
        .attr("y", 90)
        .attr("text-anchor", "middle")
        .text(message);
    }

    function drawScoreAxis(svg, x, plotHeight, width, chartMargin) {
      const axis = d3.axisBottom(x).ticks(width < 660 ? 3 : 5).tickSize(-plotHeight).tickFormat(function(value) {
        return value;
      });
      svg.append("g")
        .attr("class", "benchmark-chart__axis")
        .attr("transform", "translate(0," + (chartMargin.top + plotHeight) + ")")
        .call(axis);
    }

    function observeChart(selector, draw) {
      const element = document.querySelector(selector);
      if (!element) return;
      let frame = null;
      const render = function() {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(function() {
          draw(element, Math.max(300, Math.floor(element.clientWidth || 300)));
          frame = null;
        });
      };
      render();
      if ("ResizeObserver" in window) {
        new ResizeObserver(render).observe(element);
      }
    }

    function drawRanking(element, width) {
      const chartMargin = getChartMargin(width);
      const data = report.aggregates.filter(function(item) { return Number.isFinite(item.score); });
      const rowHeight = 40;
      const plotHeight = Math.max(110, data.length * rowHeight);
      const height = chartMargin.top + plotHeight + chartMargin.bottom;
      const svg = d3.select(element).html("").append("svg")
        .attr("class", "benchmark-chart__svg")
        .attr("viewBox", "0 0 " + width + " " + height);
      addChartSemantics(
        svg,
        "Model configuration ranking",
        data.length ? "Mean " + report.scoreLabel + " on a common zero to one hundred scale; every condition is shown separately." : "No scored responses were recorded."
      );
      if (!data.length) {
        addEmptyState(svg, width, "No scored responses were recorded.");
        return;
      }
      const x = d3.scaleLinear().domain([0, 100]).range([chartMargin.left, width - chartMargin.right]);
      const y = d3.scaleBand().domain(data.map(function(item) { return item.key; })).range([chartMargin.top, chartMargin.top + plotHeight]).padding(0.46);
      drawScoreAxis(svg, x, plotHeight, width, chartMargin);
      svg.selectAll(".benchmark-chart__range")
        .data(data)
        .join("line")
        .attr("class", "benchmark-chart__range")
        .attr("x1", x(0))
        .attr("x2", function(item) { return x(item.score); })
        .attr("y1", function(item) { return y(item.key) + y.bandwidth() / 2; })
        .attr("y2", function(item) { return y(item.key) + y.bandwidth() / 2; });
      svg.selectAll(".benchmark-chart__point")
        .data(data)
        .join("path")
        .attr("class", function(item) { return "benchmark-chart__point benchmark-chart__point--" + (item.conditionId === "vasir" ? "vasir" : "clean"); })
        .attr("d", function(item) { return d3.symbol().type(item.conditionId === "vasir" ? d3.symbolDiamond : d3.symbolCircle).size(92)(); })
        .attr("transform", function(item) { return "translate(" + x(item.score) + "," + (y(item.key) + y.bandwidth() / 2) + ")"; })
        .attr("tabindex", 0)
        .attr("role", "img")
        .attr("aria-label", function(item) { return item.configurationLabel + ", " + item.conditionLabel + ", " + formatScore(item.score) + " points"; })
        .append("title")
        .text(function(item) { return item.configurationLabel + " · " + item.conditionLabel + ": " + formatScore(item.score); });
      const labels = svg.selectAll(".benchmark-chart__label")
        .data(data)
        .join("text")
        .attr("class", "benchmark-chart__label")
        .attr("x", chartMargin.left - 12)
        .attr("y", function(item) { return y(item.key) + y.bandwidth() / 2 - 3; })
        .attr("text-anchor", "end");
      labels.append("tspan")
        .attr("x", chartMargin.left - 12)
        .text(function(item) { return item.configurationLabel; });
      labels.append("tspan")
        .attr("class", "benchmark-chart__sublabel")
        .attr("x", chartMargin.left - 12)
        .attr("dy", 14)
        .text(function(item) { return item.conditionLabel; });
      svg.selectAll(".benchmark-chart__value")
        .data(data)
        .join("text")
        .attr("class", "benchmark-chart__value")
        .attr("x", function(item) { return x(item.score) + 12; })
        .attr("y", function(item) { return y(item.key) + y.bandwidth() / 2 + 4; })
        .text(function(item) { return formatScore(item.score); });
    }

    function drawLift(element, width) {
      const chartMargin = getChartMargin(width);
      const data = report.comparisons.filter(function(item) { return Number.isFinite(item.cleanScore) && Number.isFinite(item.vasirScore); });
      const rowHeight = 46;
      const plotHeight = Math.max(110, data.length * rowHeight);
      const height = chartMargin.top + plotHeight + chartMargin.bottom;
      const svg = d3.select(element).html("").append("svg")
        .attr("class", "benchmark-chart__svg")
        .attr("viewBox", "0 0 " + width + " " + height);
      addChartSemantics(
        svg,
        "Clean versus " + report.treatment.label + " score by model configuration",
        data.length ? "Each line joins the mean clean score to the mean " + report.treatment.label + " score on the same zero to one hundred scale." : "No matched clean and treatment scores were recorded."
      );
      if (!data.length) {
        addEmptyState(svg, width, "No matched clean and treatment scores were recorded.");
        return;
      }
      const x = d3.scaleLinear().domain([0, 100]).range([chartMargin.left, width - chartMargin.right]);
      const y = d3.scaleBand().domain(data.map(function(item) { return item.modelKey; })).range([chartMargin.top, chartMargin.top + plotHeight]).padding(0.5);
      drawScoreAxis(svg, x, plotHeight, width, chartMargin);
      svg.selectAll(".benchmark-chart__line")
        .data(data)
        .join("line")
        .attr("class", "benchmark-chart__line")
        .attr("x1", function(item) { return x(item.cleanScore); })
        .attr("x2", function(item) { return x(item.vasirScore); })
        .attr("y1", function(item) { return y(item.modelKey) + y.bandwidth() / 2; })
        .attr("y2", function(item) { return y(item.modelKey) + y.bandwidth() / 2; });
      svg.selectAll(".benchmark-chart__point--clean")
        .data(data)
        .join("circle")
        .attr("class", "benchmark-chart__point benchmark-chart__point--clean")
        .attr("cx", function(item) { return x(item.cleanScore); })
        .attr("cy", function(item) { return y(item.modelKey) + y.bandwidth() / 2; })
        .attr("r", 6)
        .attr("tabindex", 0)
        .attr("role", "img")
        .attr("aria-label", function(item) { return item.configurationLabel + " clean score " + formatScore(item.cleanScore); });
      svg.selectAll(".benchmark-chart__point--vasir")
        .data(data)
        .join("path")
        .attr("class", "benchmark-chart__point benchmark-chart__point--vasir")
        .attr("d", d3.symbol().type(d3.symbolDiamond).size(105)())
        .attr("transform", function(item) { return "translate(" + x(item.vasirScore) + "," + (y(item.modelKey) + y.bandwidth() / 2) + ")"; })
        .attr("tabindex", 0)
        .attr("role", "img")
        .attr("aria-label", function(item) { return item.configurationLabel + " " + report.treatment.label + " score " + formatScore(item.vasirScore); });
      svg.selectAll(".benchmark-chart__label")
        .data(data)
        .join("text")
        .attr("class", "benchmark-chart__label")
        .attr("x", chartMargin.left - 12)
        .attr("y", function(item) { return y(item.modelKey) + y.bandwidth() / 2 + 4; })
        .attr("text-anchor", "end")
        .text(function(item) { return item.configurationLabel; });
      svg.selectAll(".benchmark-chart__value")
        .data(data)
        .join("text")
        .attr("class", "benchmark-chart__value")
        .attr("x", width - chartMargin.right + 12)
        .attr("y", function(item) { return y(item.modelKey) + y.bandwidth() / 2 + 4; })
        .text(function(item) { return formatLift(item.lift); });
    }

    function hashText(value) {
      let hash = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }

    function drawTrials(element, width) {
      const chartMargin = getChartMargin(width);
      const data = report.rows.filter(function(item) { return Number.isFinite(item.score); });
      const groups = Array.from(new Set(data.map(function(item) { return item.modelKey; })));
      const rowHeight = 48;
      const plotHeight = Math.max(110, groups.length * rowHeight);
      const height = chartMargin.top + plotHeight + chartMargin.bottom;
      const svg = d3.select(element).html("").append("svg")
        .attr("class", "benchmark-chart__svg")
        .attr("viewBox", "0 0 " + width + " " + height);
      addChartSemantics(
        svg,
        "Raw trial scores",
        data.length ? "Every scored generation is shown. Circles are clean runs and diamonds are " + report.treatment.label + " runs; vertical offset only prevents overlap." : "No scored trial data were recorded."
      );
      if (!data.length) {
        addEmptyState(svg, width, "No scored trial data were recorded.");
        return;
      }
      const x = d3.scaleLinear().domain([0, 100]).range([chartMargin.left, width - chartMargin.right]);
      const y = d3.scaleBand().domain(groups).range([chartMargin.top, chartMargin.top + plotHeight]).padding(0.38);
      drawScoreAxis(svg, x, plotHeight, width, chartMargin);
      svg.selectAll(".benchmark-chart__label")
        .data(groups)
        .join("text")
        .attr("class", "benchmark-chart__label")
        .attr("x", chartMargin.left - 12)
        .attr("y", function(modelKey) { return y(modelKey) + y.bandwidth() / 2 + 4; })
        .attr("text-anchor", "end")
        .text(function(modelKey) {
          const row = data.find(function(item) { return item.modelKey === modelKey; });
          return row ? row.configurationLabel : modelKey;
        });
      svg.selectAll(".benchmark-chart__point")
        .data(data)
        .join("path")
        .attr("class", function(item) { return "benchmark-chart__point benchmark-chart__point--" + (item.conditionId === "vasir" ? "vasir" : "clean"); })
        .attr("d", function(item) { return d3.symbol().type(item.conditionId === "vasir" ? d3.symbolDiamond : d3.symbolCircle).size(75)(); })
        .attr("transform", function(item) {
          const offset = ((hashText(item.id) % 1000) / 999 - 0.5) * 18;
          return "translate(" + x(item.score) + "," + (y(item.modelKey) + y.bandwidth() / 2 + offset) + ")";
        })
        .attr("tabindex", 0)
        .attr("role", "img")
        .attr("aria-label", function(item) { return item.configurationLabel + ", " + item.conditionLabel + ", trial " + item.trialNumber + ", " + formatScore(item.score) + " points"; })
        .append("title")
        .text(function(item) { return item.configurationLabel + " · " + item.conditionLabel + " · Trial " + item.trialNumber + ": " + formatScore(item.score); });
    }

    function renderCriteria(container, criteria) {
      container.html("");
      if (!criteria.length) {
        container.append("p")
          .attr("class", "benchmark-answer__assessment-note")
          .text("No criterion-level scores were recorded.");
        return;
      }

      const gates = criteria.filter(function(item) {
        return item.type === "gate" || item.label.startsWith("Gate ·");
      });
      const dimensions = criteria.filter(function(item) { return !gates.includes(item); });
      const passedGates = gates.filter(function(item) { return item.status === "pass" || item.score === 100; });
      const failedGates = gates.filter(function(item) { return item.status === "fail" || item.score === 0; });
      const scoredDimensions = dimensions.filter(function(item) { return Number.isFinite(item.score); });
      const fullDimensions = scoredDimensions.filter(function(item) { return item.score >= 99.95; });
      const partialDimensions = scoredDimensions
        .filter(function(item) { return item.score < 99.95; })
        .sort(function(left, right) { return left.score - right.score; });

      function compactScore(value) {
        if (!Number.isFinite(value)) return "—";
        return Math.abs(value - Math.round(value)) < 0.05 ? String(Math.round(value)) : formatScore(value);
      }

      const overview = container.append("div").attr("class", "benchmark-answer__assessment-overview");
      if (gates.length) {
        overview.append("span")
          .attr("class", "benchmark-answer__assessment-chip benchmark-answer__assessment-chip--" + (failedGates.length ? "fail" : "pass"))
          .text(passedGates.length + "/" + gates.length + " gates passed");
      }
      if (scoredDimensions.length) {
        overview.append("span")
          .attr("class", "benchmark-answer__assessment-chip")
          .text(fullDimensions.length + "/" + scoredDimensions.length + " dimensions at 100");
      }

      const findings = [];
      if (failedGates.length) {
        findings.push("Failed gate: " + failedGates.map(function(item) { return item.label; }).join(", "));
      }
      if (partialDimensions.length) {
        findings.push("Lowest dimension: " + partialDimensions[0].label + " " + compactScore(partialDimensions[0].score));
      } else if (scoredDimensions.length) {
        findings.push("Every scored dimension received 100");
      }
      if (findings.length) {
        container.append("p")
          .attr("class", "benchmark-answer__assessment-note")
          .text(findings.join(" · ") + ".");
      }

      const details = container.append("details").attr("class", "benchmark-answer__rubric");
      details.append("summary")
        .attr("class", "benchmark-answer__rubric-summary")
        .text("Full rubric · " + criteria.length + " checks");
      const content = details.append("div").attr("class", "benchmark-answer__rubric-content");

      if (gates.length) {
        const gateSection = content.append("div").attr("class", "benchmark-answer__rubric-section");
        gateSection.append("h4").attr("class", "benchmark-answer__rubric-label").text("Required gates");
        const gateItems = gateSection.append("ul")
          .attr("class", "benchmark-answer__gates")
          .selectAll("li")
          .data(gates)
          .join("li")
          .attr("class", function(item) {
            const status = item.status === "pass" || item.score === 100 ? "pass" : "fail";
            return "benchmark-answer__gate benchmark-answer__gate--" + status;
          })
          .text(function(item) {
            const passed = item.status === "pass" || item.score === 100;
            return (passed ? "Pass · " : "Fail · ") + item.label;
          });
        gateItems.attr("title", function(item) { return item.rationale || item.label; });
      }

      if (dimensions.length) {
        const dimensionSection = content.append("div").attr("class", "benchmark-answer__rubric-section");
        dimensionSection.append("h4").attr("class", "benchmark-answer__rubric-label").text("Scored dimensions");
        const dimensionItems = dimensionSection.append("dl")
          .attr("class", "benchmark-answer__dimensions")
          .selectAll("div")
          .data(dimensions)
          .join("div")
          .attr("class", function(item) {
            return Number.isFinite(item.score) && item.score < 99.95
              ? "benchmark-answer__dimension benchmark-answer__dimension--partial"
              : "benchmark-answer__dimension";
          });
        dimensionItems.append("dt")
          .attr("class", "benchmark-answer__dimension-label")
          .text(function(item) { return item.label; });
        dimensionItems.append("dd")
          .attr("class", "benchmark-answer__dimension-score")
          .text(function(item) { return compactScore(item.score); });
      }
    }

    function initializeAnswerInspector() {
      const answerRoot = document.querySelector(".benchmark-answer");
      const modelSelects = [1, 2, 3].map(function(slot) {
        return document.getElementById("benchmark-answer-model-" + slot);
      });
      const trialSelect = document.getElementById("benchmark-answer-trial");
      const conditionInputs = Array.from(document.querySelectorAll('input[name="benchmark-answer-condition"]'));
      const scope = document.getElementById("benchmark-answer-scope");
      if (!answerRoot || modelSelects.some(function(select) { return !select; }) || !trialSelect || !conditionInputs.length) return;

      const modelGroups = d3.groups(report.rows, function(row) { return row.modelKey; });
      modelSelects.forEach(function(select) {
        d3.select(select).selectAll("option")
          .data(modelGroups)
          .join("option")
          .attr("value", function(group) { return group[0]; })
          .text(function(group) { return group[1][0].configurationLabel; });
      });

      const preferredConfigurations = [
        function(row) { return row.modelId.toLowerCase().endsWith(":gpt-5.6-sol") && row.reasoningEffort.toLowerCase() === "ultra"; },
        function(row) { return row.modelId.toLowerCase().endsWith(":opus") && row.reasoningEffort.toLowerCase() === "max"; },
        function(row) { return row.modelId.toLowerCase().endsWith(":fable") && row.reasoningEffort.toLowerCase() === "max"; },
      ];
      const rankedModelKeys = [];
      report.aggregates
        .filter(function(item) { return Number.isFinite(item.score) && item.conditionId === "vasir"; })
        .concat(report.aggregates.filter(function(item) { return Number.isFinite(item.score) && item.conditionId !== "vasir"; }))
        .forEach(function(item) {
          if (!rankedModelKeys.includes(item.modelKey)) rankedModelKeys.push(item.modelKey);
        });
      const usedModelKeys = new Set();
      modelSelects.forEach(function(select, index) {
        const preferred = modelGroups.find(function(group) {
          return !usedModelKeys.has(group[0]) && preferredConfigurations[index](group[1][0]);
        });
        const bestUnusedKey = rankedModelKeys.find(function(modelKey) { return !usedModelKeys.has(modelKey); });
        const bestUnused = bestUnusedKey
          ? modelGroups.find(function(group) { return group[0] === bestUnusedKey; })
          : null;
        const fallback = modelGroups.find(function(group) { return !usedModelKeys.has(group[0]); });
        const selected = preferred || bestUnused || fallback;
        if (selected) {
          select.value = selected[0];
          usedModelKeys.add(selected[0]);
        } else {
          select.disabled = true;
          select.closest(".benchmark-answer__card").hidden = true;
        }
      });

      function updateUnavailableModelOptions() {
        const selectedKeys = modelSelects.map(function(select) { return select.value; }).filter(Boolean);
        modelSelects.forEach(function(select) {
          Array.from(select.options).forEach(function(option) {
            option.disabled = option.value !== select.value && selectedKeys.includes(option.value);
          });
        });
      }

      if (!report.rows.some(function(row) { return row.conditionId === "vasir"; })) {
        const cleanInput = conditionInputs.find(function(input) { return input.value === "clean"; });
        if (cleanInput) cleanInput.checked = true;
      }

      function selectedCondition() {
        const selected = conditionInputs.find(function(input) { return input.checked; });
        return selected ? selected.value : "vasir";
      }

      function availableTrials() {
        const trialsByModel = modelSelects.filter(function(select) { return select.value; }).map(function(select) {
          return new Set(report.rows
            .filter(function(row) { return row.modelKey === select.value; })
            .map(function(row) { return row.trialNumber; }));
        });
        if (!trialsByModel.length) return [];
        const shared = Array.from(trialsByModel[0]).filter(function(trial) {
          return trialsByModel.every(function(trials) { return trials.has(trial); });
        });
        if (shared.length) return shared.sort(function(left, right) { return left - right; });
        return Array.from(new Set(trialsByModel.flatMap(function(trials) { return Array.from(trials); })))
          .sort(function(left, right) { return left - right; });
      }

      function populateTrials() {
        const current = Number(trialSelect.value);
        const trials = availableTrials();
        d3.select(trialSelect).selectAll("option")
          .data(trials)
          .join("option")
          .attr("value", function(trial) { return trial; })
          .text(function(trial) { return "Trial " + trial; });
        if (trials.includes(current)) {
          trialSelect.value = String(current);
        } else if (trials.length) {
          trialSelect.value = String(trials[0]);
        }
      }

      function gateSummary(row) {
        if (!row) return "No matching response was recorded.";
        const gates = row.criteria.filter(function(item) {
          return item.type === "gate" || item.label.startsWith("Gate ·");
        });
        if (!gates.length) return row.status + " · no required-gate detail recorded";
        const passed = gates.filter(function(item) { return item.score === 100; }).length;
        return row.status + " · " + passed + "/" + gates.length + " required gates passed";
      }

      function renderCard(slot, modelSelect) {
        const trial = Number(trialSelect.value);
        const conditionId = selectedCondition();
        const oppositeConditionId = conditionId === "vasir" ? "clean" : "vasir";
        const row = report.rows.find(function(candidate) {
          return candidate.modelKey === modelSelect.value && candidate.trialNumber === trial && candidate.conditionId === conditionId;
        });
        const oppositeRow = report.rows.find(function(candidate) {
          return candidate.modelKey === modelSelect.value && candidate.trialNumber === trial && candidate.conditionId === oppositeConditionId;
        });
        const prefix = "benchmark-answer-";
        const cleanConditionLabel = report.treatment.type === "skill" ? "Without skill" : "Clean";
        const treatmentConditionLabel = report.treatment.type === "skill"
          ? "With " + report.treatment.label
          : report.treatment.label;
        const conditionLabel = conditionId === "vasir" ? treatmentConditionLabel : cleanConditionLabel;
        document.getElementById(prefix + "condition-" + slot).textContent = conditionLabel;
        document.getElementById(prefix + "score-" + slot).textContent = row && Number.isFinite(row.score)
          ? formatScore(row.score) + " / 100"
          : "Not measured";
        const delta = row && oppositeRow && Number.isFinite(row.score) && Number.isFinite(oppositeRow.score)
          ? row.score - oppositeRow.score
          : null;
        document.getElementById(prefix + "delta-" + slot).textContent = delta === null
          ? "No matched comparison"
          : formatLift(delta) + (conditionId === "vasir" ? " vs clean" : " vs treatment");
        document.getElementById(prefix + "status-" + slot).textContent = gateSummary(row);
        document.getElementById(prefix + "output-" + slot).textContent = row
          ? (row.outputText || row.error || "No response text recorded.")
          : "No matching response was recorded.";
        const assessment = row && row.rationale
          ? "Judge · " + row.rationale
          : "Judge · No row-level rationale was recorded.";
        const synthesis = row && row.synthesisReason
          ? "\nSynthesis" + (row.selectedReviewerLabel ? " · selected " + row.selectedReviewerLabel : "") + " · " + row.synthesisReason
          : "";
        document.getElementById(prefix + "rationale-" + slot).textContent = assessment + synthesis;
        renderCriteria(d3.select("#" + prefix + "criteria-" + slot), row ? row.criteria : []);
      }

      function renderInspector() {
        const conditionId = selectedCondition();
        answerRoot.dataset.condition = conditionId;
        const cleanConditionLabel = report.treatment.type === "skill" ? "without-skill" : "clean";
        scope.textContent = conditionId === "vasir"
          ? "Showing " + report.treatment.label + " responses for the same trial across all three models."
          : "Showing " + cleanConditionLabel + " responses for the same trial across all three models.";
        modelSelects.forEach(function(select, index) { renderCard(index + 1, select); });
      }

      modelSelects.forEach(function(select) {
        select.addEventListener("change", function() {
          updateUnavailableModelOptions();
          populateTrials();
          renderInspector();
        });
      });
      trialSelect.addEventListener("change", renderInspector);
      conditionInputs.forEach(function(input) { input.addEventListener("change", renderInspector); });
      updateUnavailableModelOptions();
      populateTrials();
      renderInspector();
    }

    observeChart("#benchmark-ranking-chart", drawRanking);
    observeChart("#benchmark-lift-chart", drawLift);
    observeChart("#benchmark-trials-chart", drawTrials);
    initializeAnswerInspector();
  })();
`;

export function renderBenchmarkReportHtml(runArtifact) {
  const report = normalizeBenchmarkReportData(runArtifact);
  const isPanelJudging = report.judging.mode === "panel";
  const hasSynthesizedScores = report.judging.scoreAuthority === "synthesizer";
  const d3Source = fs.readFileSync(D3_SOURCE_FILE_PATH, "utf8");
  const fontStyles = renderEmbeddedFontStyles();
  const heroTreatmentLabel = report.treatment.label === "Vasir architecture skill"
    ? "Vasir"
    : report.treatment.label;
  const cleanConditionLabel = report.treatment.type === "skill" ? "Without skill" : "Clean";
  const treatmentConditionLabel = report.treatment.type === "skill"
    ? `With ${report.treatment.label}`
    : report.treatment.label;
  const liftHeadline = report.observedLift === null
    ? `The run did not produce a matched ${report.treatment.label} comparison.`
    : !report.source.matrixComplete
      ? `Partial run: completed pairs moved ${formatLift(report.observedLift)}; the declared matrix did not finish.`
    : report.observedLift > 0
      ? `${report.treatment.label} received higher ${hasSynthesizedScores ? "synthesized" : "judge"} scores across ${report.matchedCount || "the available"} matched generation${report.matchedCount === 1 ? "" : "s"}.`
      : report.observedLift < 0
        ? `${report.treatment.label} received lower ${hasSynthesizedScores ? "synthesized" : "judge"} scores across ${report.matchedCount || "the available"} matched generation${report.matchedCount === 1 ? "" : "s"}.`
        : `${report.treatment.label} produced no observed score change in this run.`;
  const heroDisplayHeadline = report.observedLift === null
    ? "No matched score signal."
    : !report.source.matrixComplete
      ? `Partial result: ${formatLift(report.observedLift)} across completed pairs.`
    : report.observedLift > 0
        ? `${heroTreatmentLabel} raised scores by ${report.observedLift.toFixed(1)} pts.`
        : report.observedLift < 0
          ? `${heroTreatmentLabel} lowered scores by ${Math.abs(report.observedLift).toFixed(1)} pts.`
          : `${heroTreatmentLabel} produced no score change.`;
  const bestLabel = report.bestConfiguration
    ? `${report.bestConfiguration.configurationLabel} · ${report.bestConfiguration.conditionLabel}`
    : "No scored configuration";
  const bestScore = report.bestConfiguration ? formatScore(report.bestConfiguration.score) : "—";
  const rubricSummary = report.rubric.summary || "The artifact did not record a prose rubric summary; criterion labels are shown when available.";
  const judgeContextTitle = isPanelJudging
    ? hasSynthesizedScores
      ? `${report.judging.requestedCount} independent judges → one synthesis`
      : `${report.judging.completedCount}/${report.judging.requestedCount} judges complete · synthesis unavailable`
    : report.judge.freshContext === true && report.judge.blinded === true
      ? "Fresh, blinded evaluation"
      : report.judge.freshContext === true
        ? "Fresh evaluation context"
        : "Recorded evaluation context";
  const calibrationNote = report.judge.calibrationStatus === "author-calibration-pending"
    ? "Judge calibration is pending; numeric scores are directional evidence, not ground truth."
    : `Judge calibration: ${report.judge.calibrationStatus}.`;
  const judgeAsideNote = isPanelJudging
    ? hasSynthesizedScores
      ? `${report.judging.requestedCount}-judge panel · ${report.judge.model} synthesis`
      : `${report.judging.completedCount}/${report.judging.requestedCount} judges · no final score`
    : `${report.judge.model} judge`;
  const judgeContractNote = isPanelJudging
    ? `${report.judging.completedCount}/${report.judging.requestedCount} independent judgments · ${
      report.judging.synthesis?.status === "complete" ? "fresh synthesis complete" : "no final synthesis"
    }.`
    : `${report.judge.freshContext === true ? "Fresh context" : "Freshness not proven"} · ${report.judge.blinded === true ? "blinded identities" : "blinding not proven"} · ${report.judge.reasoningEffort} effort.`;
  const judgeMethodSummary = isPanelJudging
    ? hasSynthesizedScores
      ? "The page reports synthesized scores from independent blinded judgments. It does not turn that panel or a small sample into ground truth."
      : "The configured judge panel did not complete, so this page publishes no final score. Completed judge evidence remains inspectable for a safe retry."
    : "The page reports what this run observed. It does not turn one model judge or a small sample into ground truth.";
  const judgePanelEvidence = renderJudgePanelEvidence(report.judging);
  const tableRows = renderTableRows(report.rows);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(report.benchmarkTitle)} · Vasir benchmark</title>
  <style>${fontStyles}\n${REPORT_STYLES}</style>
</head>
<body>
  <article class="benchmark-report">
    <header class="benchmark-report__header">
      <div class="benchmark-report__masthead layout-frame">
        <a class="benchmark-report__brand" href="../../index.html" aria-label="View all benchmark prompts"><span aria-hidden="true">←</span> All prompts <span class="benchmark-report__brand-product">Vasir benchmarks</span></a>
        <nav class="benchmark-report__nav" aria-label="Benchmark destinations">
          <a class="benchmark-report__nav-link benchmark-report__nav-link--current" href="#overview">Result</a>
          <a class="benchmark-report__nav-link" href="#ranking">Model ranking</a>
          <a class="benchmark-report__nav-link" href="#lift">Treatment lift</a>
          <a class="benchmark-report__nav-link" href="#answers">Answers</a>
          <a class="benchmark-report__nav-link" href="#matrix">Evidence</a>
          <a class="benchmark-report__nav-link" href="#method">Method</a>
        </nav>
      </div>
      <nav class="benchmark-report__local-nav layout-frame" aria-label="On this report">
        <a class="benchmark-report__local-link" href="#ranking">The winner</a>
        <a class="benchmark-report__local-link" href="#trials">Raw trials</a>
        <a class="benchmark-report__local-link" href="#answers">Full responses</a>
        <a class="benchmark-report__local-link" href="#method">Measurement contract</a>
        <span class="benchmark-report__meta">${escapeHtml(report.runId)} · ${escapeHtml(formatDate(report.completedAt))}</span>
      </nav>
    </header>

    <main class="benchmark-report__main layout-frame">
      <section class="benchmark-hero" id="overview" aria-labelledby="benchmark-hero-title">
        <div class="benchmark-hero__content">
          <span class="benchmark-hero__eyebrow">${report.source.matrixComplete ? "The Vasir benchmark standard" : `Partial observed ${escapeHtml(report.treatment.label)} lift`} · ${escapeHtml(report.benchmarkTitle)}</span>
          <h1 class="benchmark-hero__headline" id="benchmark-hero-title">${escapeHtml(heroDisplayHeadline)}</h1>
          <p class="benchmark-hero__copy benchmark-hero__copy--strong">${escapeHtml(liftHeadline)}</p>
          <p class="benchmark-hero__copy">Score lift is the mean matched score difference: ${escapeHtml(report.treatment.label)} minus clean, on the ${isPanelJudging ? "synthesized" : "judge’s"} 0–100 scale. ${escapeHtml(calibrationNote)} The raw trials, full answers, rubric, and caveats remain visible below.</p>
          <nav class="benchmark-hero__actions" aria-label="Explore benchmark evidence">
            <a class="ui-action ui-action--primary" href="#ranking"><span>See model ranking</span><span aria-hidden="true">→</span></a>
            <a class="ui-action ui-action--secondary" href="#answers"><span>Compare full answers</span><span aria-hidden="true">→</span></a>
          </nav>
          <blockquote class="benchmark-hero__prompt">Prompt / “${escapeHtml(report.prompt)}”</blockquote>
        </div>
        <aside class="benchmark-hero__aside">
          <div class="layout-stack layout-stack--compact">
            <span class="benchmark-hero__eyebrow">Best observed answer</span>
            <p class="benchmark-hero__aside-value">${escapeHtml(bestScore)}</p>
            <p class="benchmark-hero__aside-title">${escapeHtml(bestLabel)}</p>
            <p class="benchmark-hero__aside-note">${escapeHtml(report.source.measuredConfigurationCount)}/${escapeHtml(report.source.requestedConfigurationCount)} measured configurations · ${escapeHtml(report.source.completedRowCount)}/${escapeHtml(report.source.expectedRowCount)} responses complete · ${escapeHtml(judgeAsideNote)}</p>
          </div>
        </aside>
        <div class="benchmark-hero__proof" aria-label="Run coverage">
          <div class="benchmark-hero__proof-item">
            <span class="benchmark-hero__proof-label">Model matrix</span>
            <p class="benchmark-hero__proof-value">${escapeHtml(report.source.measuredConfigurationCount)} of ${escapeHtml(report.source.requestedConfigurationCount)} configurations measured.</p>
          </div>
          <div class="benchmark-hero__proof-item">
            <span class="benchmark-hero__proof-label">Response coverage</span>
            <p class="benchmark-hero__proof-value">${escapeHtml(report.source.completedRowCount)} of ${escapeHtml(report.source.expectedRowCount)} fresh responses complete.</p>
          </div>
          <div class="benchmark-hero__proof-item">
            <span class="benchmark-hero__proof-label">Judge contract</span>
            <p class="benchmark-hero__proof-value">${escapeHtml(judgeContractNote)}</p>
          </div>
        </div>
      </section>

      <section class="benchmark-section" id="ranking" aria-labelledby="ranking-title">
        <header class="benchmark-section__header">
          <div class="benchmark-section__heading">
            <span class="benchmark-section__eyebrow">01 / answer the winner question</span>
            <h2 class="benchmark-section__title" id="ranking-title">Which configuration answered best?</h2>
          </div>
          <p class="benchmark-section__summary">Every scored model × reasoning × condition cell, ranked on one honest 0–100 axis. Diamonds are ${escapeHtml(report.treatment.label)}; outlined circles are clean. Means never hide the raw trials below.</p>
        </header>
        <div class="benchmark-chart" id="benchmark-ranking-chart"></div>
      </section>

      <section class="benchmark-section" id="lift" aria-labelledby="lift-title">
        <header class="benchmark-section__header">
          <div class="benchmark-section__heading">
            <span class="benchmark-section__eyebrow">02 / isolate the treatment</span>
            <h2 class="benchmark-section__title" id="lift-title">How much did ${escapeHtml(report.treatment.label)} change each model?</h2>
          </div>
          <p class="benchmark-section__summary">Each dumbbell keeps the model fixed and changes only the condition. Moving right is improvement; moving left is regression. The number at right is ${escapeHtml(report.treatment.label)} minus clean.</p>
        </header>
        <div class="benchmark-chart" id="benchmark-lift-chart"></div>
      </section>

      <section class="benchmark-section" id="trials" aria-labelledby="trials-title">
        <header class="benchmark-section__header">
          <div class="benchmark-section__heading">
            <span class="benchmark-section__eyebrow">03 / inspect the variance</span>
            <h2 class="benchmark-section__title" id="trials-title">The means are not the evidence. These trials are.</h2>
          </div>
          <p class="benchmark-section__summary">Every judged response is plotted. Small vertical offsets prevent overlap and carry no quantitative meaning. Focus a point for its model, condition, trial, and score.</p>
        </header>
        <div class="benchmark-chart" id="benchmark-trials-chart"></div>
      </section>

      <section class="benchmark-section" id="answers" aria-labelledby="answers-title">
        <header class="benchmark-section__header">
          <div class="benchmark-section__heading">
            <span class="benchmark-section__eyebrow">04 / read what was judged</span>
            <h2 class="benchmark-section__title" id="answers-title">Compare any three model configurations.</h2>
          </div>
          <p class="benchmark-section__summary">Choose any three available configurations, then switch all three between clean and treatment responses with one control.</p>
        </header>
        <div class="benchmark-answer" data-condition="vasir">
          <div class="benchmark-answer__toolbar">
            <fieldset class="benchmark-answer__condition">
              <legend class="benchmark-answer__label">Run condition · applies to all three</legend>
              <div class="benchmark-answer__toggle">
                <input class="benchmark-answer__toggle-input" type="radio" name="benchmark-answer-condition" id="benchmark-answer-condition-clean" value="clean">
                <label class="benchmark-answer__toggle-label" for="benchmark-answer-condition-clean">${escapeHtml(cleanConditionLabel)}</label>
                <input class="benchmark-answer__toggle-input" type="radio" name="benchmark-answer-condition" id="benchmark-answer-condition-vasir" value="vasir" checked>
                <label class="benchmark-answer__toggle-label" for="benchmark-answer-condition-vasir">${escapeHtml(treatmentConditionLabel)}</label>
              </div>
            </fieldset>
            <label class="benchmark-answer__field" for="benchmark-answer-trial">
              <span class="benchmark-answer__label">Trial · applies to all three</span>
              <select class="ui-select" id="benchmark-answer-trial"></select>
            </label>
            <p class="benchmark-answer__scope" id="benchmark-answer-scope">Showing ${escapeHtml(report.treatment.label)} responses for the same trial across all three models.</p>
          </div>
          <div class="benchmark-answer__grid">
            ${[1, 2, 3].map((slot) => `
            <article class="benchmark-answer__card" data-answer-slot="${slot}">
              <label class="benchmark-answer__field" for="benchmark-answer-model-${slot}">
                <span class="benchmark-answer__label">Model ${slot}</span>
                <select class="ui-select" id="benchmark-answer-model-${slot}"></select>
              </label>
              <div class="benchmark-answer__metrics">
                <div>
                  <span class="benchmark-answer__label" id="benchmark-answer-condition-${slot}">${escapeHtml(treatmentConditionLabel)}</span>
                  <p class="benchmark-answer__score" id="benchmark-answer-score-${slot}">—</p>
                </div>
                <p class="benchmark-answer__delta" id="benchmark-answer-delta-${slot}"></p>
              </div>
              <p class="benchmark-answer__status" id="benchmark-answer-status-${slot}">Loading score evidence…</p>
              <pre class="benchmark-answer__output" id="benchmark-answer-output-${slot}">Loading response…</pre>
              <p class="benchmark-answer__rationale" id="benchmark-answer-rationale-${slot}"></p>
              <div class="benchmark-answer__assessment" id="benchmark-answer-criteria-${slot}"></div>
            </article>`).join("")}
          </div>
        </div>
      </section>

      <section class="benchmark-section" id="matrix" aria-labelledby="matrix-title">
        <header class="benchmark-section__header">
          <div class="benchmark-section__heading">
            <span class="benchmark-section__eyebrow">05 / complete matrix</span>
            <h2 class="benchmark-section__title" id="matrix-title">Nothing is hidden behind the charts.</h2>
          </div>
          <p class="benchmark-section__summary">This is the exact accessible lookup layer: every response, status, score, token count, answer, and recorded rationale. It remains useful if chart JavaScript is unavailable.</p>
        </header>
        <div class="benchmark-table__wrap">
          <table class="benchmark-table">
            <caption class="benchmark-table__caption">All measured benchmark responses and their recorded evidence.</caption>
            <thead class="benchmark-table__head">
              <tr class="benchmark-table__row">
                <th class="benchmark-table__cell" scope="col">Model</th>
                <th class="benchmark-table__cell" scope="col">Reasoning</th>
                <th class="benchmark-table__cell" scope="col">Condition</th>
                <th class="benchmark-table__cell" scope="col">Trial</th>
                <th class="benchmark-table__cell" scope="col">Score</th>
                <th class="benchmark-table__cell" scope="col">Status</th>
                <th class="benchmark-table__cell" scope="col">Tokens</th>
                <th class="benchmark-table__cell" scope="col">Cost</th>
                <th class="benchmark-table__cell" scope="col">Latency</th>
                <th class="benchmark-table__cell" scope="col">Response evidence</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </section>

      <section class="benchmark-section" id="method" aria-labelledby="method-title">
        <header class="benchmark-section__header">
          <div class="benchmark-section__heading">
            <span class="benchmark-section__eyebrow">06 / measurement contract</span>
            <h2 class="benchmark-section__title" id="method-title">What produced these numbers?</h2>
          </div>
          <p class="benchmark-section__summary">${escapeHtml(judgeMethodSummary)}</p>
        </header>
        <div class="benchmark-method">
          <article class="benchmark-method__judge">
            <span class="benchmark-method__label">${isPanelJudging ? "Judging" : "Judge"}</span>
            <h3 class="benchmark-method__title">${escapeHtml(judgeContextTitle)}</h3>
            <dl class="benchmark-method__facts">
              ${isPanelJudging ? `<dt class="benchmark-method__term">Panel</dt><dd class="benchmark-method__definition">${escapeHtml(`${report.judging.completedCount}/${report.judging.requestedCount} complete`)}</dd>` : ""}
              <dt class="benchmark-method__term">${isPanelJudging ? "Synthesizer" : "Model"}</dt><dd class="benchmark-method__definition">${escapeHtml(report.judge.model)}</dd>
              <dt class="benchmark-method__term">Effort</dt><dd class="benchmark-method__definition">${escapeHtml(report.judge.reasoningEffort)}</dd>
              <dt class="benchmark-method__term">Status</dt><dd class="benchmark-method__definition">${escapeHtml(report.judge.status)}</dd>
              <dt class="benchmark-method__term">Fresh</dt><dd class="benchmark-method__definition">${report.judge.freshContext === null ? "Not recorded" : report.judge.freshContext ? "Yes" : "No"}</dd>
              <dt class="benchmark-method__term">Blinded</dt><dd class="benchmark-method__definition">${report.judge.blinded === null ? "Not recorded" : report.judge.blinded ? "Yes" : "No"}</dd>
              <dt class="benchmark-method__term">Calibration</dt><dd class="benchmark-method__definition">${escapeHtml(report.judge.calibrationStatus)}</dd>
              <dt class="benchmark-method__term">Judge cohort</dt><dd class="benchmark-method__definition">${report.judge.cohortSize === null ? "Not recorded" : `${escapeHtml(report.judge.cohortSize)} anonymous answers`}</dd>
              <dt class="benchmark-method__term">Cohort basis</dt><dd class="benchmark-method__definition">${escapeHtml(report.judge.cohortHash === "Not recorded" ? report.judge.cohortHash : report.judge.cohortHash.slice(0, 12))}</dd>
              ${isPanelJudging ? `<dt class="benchmark-method__term">Panel prompt</dt><dd class="benchmark-method__definition">${escapeHtml(report.judging.panelPromptHash === "Not recorded" ? report.judging.panelPromptHash : report.judging.panelPromptHash.slice(0, 12))}</dd>` : ""}
              <dt class="benchmark-method__term">${isPanelJudging ? "Synthesis prompt" : "Judge prompt"}</dt><dd class="benchmark-method__definition">${escapeHtml(report.judge.promptHash === "Not recorded" ? report.judge.promptHash : report.judge.promptHash.slice(0, 12))}</dd>
              <dt class="benchmark-method__term">Harness</dt><dd class="benchmark-method__definition">${escapeHtml(report.source.harnessVersion)}</dd>
            </dl>
            ${report.judge.error ? `<p class="benchmark-method__copy">Judge failure: ${escapeHtml(report.judge.error)}</p>` : ""}
            ${report.judge.summary ? `<p class="benchmark-method__copy">${escapeHtml(report.judge.summary)}</p>` : ""}
            ${judgePanelEvidence}
          </article>
          <article class="benchmark-method__rubric">
            <span class="benchmark-method__label">Rubric</span>
            <h3 class="benchmark-method__title">What “better” meant</h3>
            <p class="benchmark-method__copy">${escapeHtml(rubricSummary)}</p>
            ${renderCriteriaList(report.rubric.criteria)}
          </article>
          <article class="benchmark-method__limits">
            <span class="benchmark-method__label">Limits</span>
            <h3 class="benchmark-method__title">Read before claiming</h3>
            <ul class="benchmark-method__limitations">${renderLimitations(report.limitations)}</ul>
          </article>
        </div>
      </section>
    </main>

    <footer class="benchmark-report__footer">
      Offline report · D3 v7.9.0 embedded · full responses retained · ${escapeHtml(report.runStatus)} run
    </footer>
  </article>

  <script type="application/json" id="benchmark-report-data">${serializeJsonForHtml(report)}</script>
  <script>${d3Source}</script>
  <script>${REPORT_SCRIPT}</script>
</body>
</html>`;
}

export function writeBenchmarkReport({ run, outputFilePath }) {
  if (typeof outputFilePath !== "string" || outputFilePath.trim().length === 0) {
    throw new TypeError("outputFilePath is required to write a benchmark report.");
  }

  const resolvedOutputFilePath = path.resolve(outputFilePath);
  fs.mkdirSync(path.dirname(resolvedOutputFilePath), { recursive: true });
  fs.writeFileSync(resolvedOutputFilePath, renderBenchmarkReportHtml(run), "utf8");
  return resolvedOutputFilePath;
}
