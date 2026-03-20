function normalizeText(text) {
  return String(text ?? "").toLowerCase();
}

export const SCORER_VERSION = 7;

const COMPARISON_EPSILON = 1e-9;

function readNumericUsageValue(...candidateValues) {
  for (const candidateValue of candidateValues) {
    if (typeof candidateValue === "number" && Number.isFinite(candidateValue) && candidateValue >= 0) {
      return candidateValue;
    }
  }

  return null;
}

export function normalizeUsage(usage) {
  if (!usage || typeof usage !== "object") {
    return {
      available: false,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    };
  }

  const inputTokens = readNumericUsageValue(
    usage.input_tokens,
    usage.inputTokens,
    usage.prompt_tokens,
    usage.promptTokens
  );
  const outputTokens = readNumericUsageValue(
    usage.output_tokens,
    usage.outputTokens,
    usage.completion_tokens,
    usage.completionTokens
  );
  const totalTokens = readNumericUsageValue(
    usage.total_tokens,
    usage.totalTokens
  );
  const hasUsage = inputTokens !== null || outputTokens !== null || totalTokens !== null;

  return {
    available: hasUsage,
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0,
    totalTokens: totalTokens ?? ((inputTokens ?? 0) + (outputTokens ?? 0))
  };
}

function mergeUsageSummaries(usageSummaries) {
  const normalizedSummaries = usageSummaries.filter(Boolean);
  return normalizedSummaries.reduce(
    (mergedSummary, usageSummary) => ({
      available: mergedSummary.available || usageSummary.available,
      rowCount: mergedSummary.rowCount + (usageSummary.rowCount ?? 0),
      rowsWithUsage: mergedSummary.rowsWithUsage + (usageSummary.rowsWithUsage ?? 0),
      rowsWithoutUsage: mergedSummary.rowsWithoutUsage + (usageSummary.rowsWithoutUsage ?? 0),
      inputTokens: mergedSummary.inputTokens + (usageSummary.inputTokens ?? 0),
      outputTokens: mergedSummary.outputTokens + (usageSummary.outputTokens ?? 0),
      totalTokens: mergedSummary.totalTokens + (usageSummary.totalTokens ?? 0)
    }),
    {
      available: false,
      rowCount: 0,
      rowsWithUsage: 0,
      rowsWithoutUsage: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    }
  );
}

function createUsageSummary(records, readUsage) {
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let rowsWithUsage = 0;

  for (const record of records) {
    const normalizedUsage = normalizeUsage(readUsage(record));
    if (!normalizedUsage.available) {
      continue;
    }

    rowsWithUsage += 1;
    inputTokens += normalizedUsage.inputTokens;
    outputTokens += normalizedUsage.outputTokens;
    totalTokens += normalizedUsage.totalTokens;
  }

  return {
    available: rowsWithUsage > 0,
    rowCount: records.length,
    rowsWithUsage,
    rowsWithoutUsage: Math.max(0, records.length - rowsWithUsage),
    inputTokens,
    outputTokens,
    totalTokens
  };
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lineContainsNegatedForbiddenMention(lineText, normalizedSubstring) {
  const escapedSubstring = escapeRegExp(normalizedSubstring);
  const antiPatternPatterns = [
    new RegExp(
      `\\b(?:do not|don't|never|avoid(?:ing)?|without|no|not|must not|should not|instead of|rather than|replace(?:d|s|ing)?|remove(?:d|s|ing)?|ban(?:ned)?|forbidden|anti-pattern(?:s)?|disallow(?:ed)?)\\b[^\\n]{0,120}${escapedSubstring}`
    ),
    new RegExp(
      `${escapedSubstring}[^\\n]{0,120}\\b(?:instead of|rather than|replace(?:d|s|ing)?|remove(?:d|s|ing)?|avoid(?:ing)?|ban(?:ned)?|forbidden|anti-pattern(?:s)?|disallow(?:ed)?)\\b`
    ),
    new RegExp(
      `\\b(?:must|should)\\s+not\\s+(?:call|use|depend\\s+on)\\b[^\\n]{0,120}${escapedSubstring}`
    ),
    new RegExp(
      `\\b(?:if|when)\\b[^\\n]{0,120}${escapedSubstring}[^\\n]{0,120}\\b(?:replace(?:d|s|ing)?|remove(?:d|s|ing)?|avoid(?:ing)?)\\b`
    ),
    new RegExp(
      `${escapedSubstring}[^\\n]{0,120}\\b(?:is|are)?\\s*(?:not|never)\\s+used\\b`
    )
  ];

  return antiPatternPatterns.some((pattern) => pattern.test(lineText));
}

function hasUnnegatedForbiddenSubstring(outputTextLowerCase, substring) {
  const normalizedSubstring = normalizeText(substring);
  const matchingLines = outputTextLowerCase
    .split("\n")
    .filter((lineText) => lineText.includes(normalizedSubstring));

  if (matchingLines.length === 0) {
    return false;
  }

  return matchingLines.some(
    (lineText) => !lineContainsNegatedForbiddenMention(lineText, normalizedSubstring)
  );
}

function calculateMedian(values) {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((leftValue, rightValue) => leftValue - rightValue);
  const middleIndex = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    : sortedValues[middleIndex];
}

function calculateBinomialCoefficient(n, k) {
  if (k < 0 || k > n) {
    return 0;
  }

  const normalizedK = Math.min(k, n - k);
  let coefficient = 1;
  for (let index = 1; index <= normalizedK; index += 1) {
    coefficient = (coefficient * (n - normalizedK + index)) / index;
  }

  return coefficient;
}

function calculateDirectionConfidence({ betterPairCount, worsePairCount }) {
  const decisivePairCount = betterPairCount + worsePairCount;
  if (decisivePairCount === 0) {
    return null;
  }

  const dominantDirectionCount = Math.max(betterPairCount, worsePairCount);
  let oneSidedTailProbability = 0;
  for (
    let successCount = dominantDirectionCount;
    successCount <= decisivePairCount;
    successCount += 1
  ) {
    oneSidedTailProbability +=
      calculateBinomialCoefficient(decisivePairCount, successCount) /
      (2 ** decisivePairCount);
  }

  return Math.max(0, Math.min(1, 1 - oneSidedTailProbability));
}

export function classifyLiftOutcome({ averageScoreDelta, passRateDelta }) {
  const scoreDirection =
    averageScoreDelta > COMPARISON_EPSILON
      ? 1
      : averageScoreDelta < -COMPARISON_EPSILON
        ? -1
        : 0;
  const passDirection =
    passRateDelta > COMPARISON_EPSILON
      ? 1
      : passRateDelta < -COMPARISON_EPSILON
        ? -1
        : 0;

  if (scoreDirection === 0 && passDirection === 0) {
    return "no_change";
  }

  if (scoreDirection >= 0 && passDirection >= 0) {
    return "better";
  }

  if (scoreDirection <= 0 && passDirection <= 0) {
    return "worse";
  }

  return "mixed";
}

export function scoreCaseOutput({ caseDefinition, outputText }) {
  const outputTextLowerCase = normalizeText(outputText);
  const requiredSubstrings = Array.isArray(caseDefinition.requiredSubstrings)
    ? caseDefinition.requiredSubstrings
    : [];
  const forbiddenSubstrings = Array.isArray(caseDefinition.forbiddenSubstrings)
    ? caseDefinition.forbiddenSubstrings
    : [];

  const missingRequiredSubstrings = requiredSubstrings.filter(
    (substring) => !outputTextLowerCase.includes(normalizeText(substring))
  );
  const presentForbiddenSubstrings = forbiddenSubstrings.filter(
    (substring) => hasUnnegatedForbiddenSubstring(outputTextLowerCase, substring)
  );

  const totalChecks = requiredSubstrings.length + forbiddenSubstrings.length;
  const passedChecks =
    (requiredSubstrings.length - missingRequiredSubstrings.length) +
    (forbiddenSubstrings.length - presentForbiddenSubstrings.length);
  const hasMeasuredChecks = totalChecks > 0;

  return {
    passed: hasMeasuredChecks && missingRequiredSubstrings.length === 0 && presentForbiddenSubstrings.length === 0,
    score: hasMeasuredChecks ? passedChecks / totalChecks : 0,
    measuredCheckCount: totalChecks,
    missingRequiredSubstrings,
    presentForbiddenSubstrings
  };
}

function readTrialNumber(record) {
  return Number.isInteger(record?.trialNumber) && record.trialNumber > 0 ? record.trialNumber : 1;
}

function createPairKey(record) {
  return `${record.modelId}::${record.caseId}::${readTrialNumber(record)}`;
}

function isComparableRow(row) {
  return row?.rowStatus === "scored";
}

function readRowScore(row) {
  if (typeof row?.hardScore?.score === "number") {
    return row.hardScore.score;
  }

  if (typeof row?.score === "number") {
    return row.score;
  }

  return 0;
}

function readRowPassed(row) {
  if (typeof row?.hardScore?.passed === "boolean") {
    return row.hardScore.passed;
  }

  if (typeof row?.passed === "boolean") {
    return row.passed;
  }

  return false;
}

function normalizeJudgeResults(pairJudgment) {
  return pairJudgment && typeof pairJudgment === "object" && pairJudgment.judges && typeof pairJudgment.judges === "object"
    ? pairJudgment.judges
    : {};
}

function readPairJudgment(rowPair) {
  return rowPair.treatmentRow?.pairJudgment ?? rowPair.baselineRow?.pairJudgment ?? null;
}

export function createComparableRowPairs(rows) {
  const pairedRows = new Map();
  for (const row of rows) {
    const rowKey = createPairKey(row);
    const existingPair = pairedRows.get(rowKey) ?? {};
    if (row.conditionId === "baseline:none") {
      existingPair.baselineRow = row;
    } else {
      existingPair.treatmentRow = row;
    }
    pairedRows.set(rowKey, existingPair);
  }

  return [...pairedRows.values()]
    .filter((rowPair) => isComparableRow(rowPair.baselineRow) && isComparableRow(rowPair.treatmentRow))
    .map((rowPair) => {
      const averageScoreLift = readRowScore(rowPair.treatmentRow) - readRowScore(rowPair.baselineRow);
      const passRateLift =
        Number(readRowPassed(rowPair.treatmentRow)) - Number(readRowPassed(rowPair.baselineRow));
      const pairJudgment = readPairJudgment(rowPair);
      return {
        pairKey: createPairKey(rowPair.baselineRow),
        modelId: rowPair.baselineRow.modelId,
        caseId: rowPair.baselineRow.caseId,
        trialNumber: readTrialNumber(rowPair.baselineRow),
        baselineRow: rowPair.baselineRow,
        treatmentRow: rowPair.treatmentRow,
        averageScoreLift,
        passRateLift,
        outcome: classifyLiftOutcome({
          averageScoreDelta: averageScoreLift,
          passRateDelta: passRateLift
        }),
        pairJudgment,
        judgeResults: normalizeJudgeResults(pairJudgment)
      };
    });
}

function readPairCondition(pair, side) {
  if (!pair || typeof pair !== "object") {
    return null;
  }

  if (pair[side] && typeof pair[side] === "object") {
    return pair[side];
  }

  const liveRowKey = side === "baseline" ? "baselineRow" : "treatmentRow";
  return pair[liveRowKey] && typeof pair[liveRowKey] === "object"
    ? pair[liveRowKey]
    : null;
}

function readPairConditionScore(pair, side) {
  const condition = readPairCondition(pair, side);
  if (!condition) {
    return 0;
  }

  if (typeof condition.score === "number") {
    return condition.score;
  }

  if (typeof condition?.hardScore?.score === "number") {
    return condition.hardScore.score;
  }

  return 0;
}

function readPairConditionPassed(pair, side) {
  const condition = readPairCondition(pair, side);
  if (!condition) {
    return false;
  }

  if (typeof condition.passed === "boolean") {
    return condition.passed;
  }

  if (typeof condition?.hardScore?.passed === "boolean") {
    return condition.hardScore.passed;
  }

  return false;
}

function createConditionAggregate(pairResults, side) {
  const rowCount = pairResults.length;
  const totalScore = pairResults.reduce(
    (sum, pair) => sum + Number(readPairConditionScore(pair, side)),
    0
  );
  const passedCount = pairResults.filter((pair) => readPairConditionPassed(pair, side)).length;

  return {
    rowCount,
    averageScore: rowCount === 0 ? 0 : totalScore / rowCount,
    passRate: rowCount === 0 ? 0 : passedCount / rowCount
  };
}

function createLiftSummary({ pairResults, totalPairCount }) {
  const comparablePairCount = pairResults.length;
  const baseline = createConditionAggregate(pairResults, "baseline");
  const treatment = createConditionAggregate(pairResults, "treatment");
  const averageScoreLift = treatment.averageScore - baseline.averageScore;
  const passRateLift = treatment.passRate - baseline.passRate;
  const betterPairCount = pairResults.filter((pair) => pair.outcome === "better").length;
  const worsePairCount = pairResults.filter((pair) => pair.outcome === "worse").length;
  const mixedPairCount = pairResults.filter((pair) => pair.outcome === "mixed").length;
  const noChangePairCount = pairResults.filter((pair) => pair.outcome === "no_change").length;
  const decisivePairCount = betterPairCount + worsePairCount;

  return {
    baseline,
    treatment,
    comparablePairCount,
    totalPairCount,
    incompletePairCount: Math.max(0, totalPairCount - comparablePairCount),
    averageScoreLift,
    medianScoreLift: calculateMedian(pairResults.map((pair) => pair.averageScoreLift ?? 0)),
    passRateLift,
    medianPassRateLift: calculateMedian(pairResults.map((pair) => pair.passRateLift ?? 0)),
    betterPairCount,
    worsePairCount,
    mixedPairCount,
    noChangePairCount,
    decisivePairCount,
    winRate: comparablePairCount === 0 ? 0 : betterPairCount / comparablePairCount,
    lossRate: comparablePairCount === 0 ? 0 : worsePairCount / comparablePairCount,
    tieRate: comparablePairCount === 0 ? 0 : noChangePairCount / comparablePairCount,
    directionConfidence: calculateDirectionConfidence({
      betterPairCount,
      worsePairCount
    })
  };
}

function createJudgeSummary({ pairResults, totalPairCount }) {
  const judgedPairs = [];
  let judgeVoteCount = 0;
  let selfJudgedVoteCount = 0;
  let totalConfidence = 0;

  for (const pair of pairResults) {
    const pairJudgment = pair.pairJudgment;
    if (!pairJudgment || pairJudgment.judgeStatus !== "complete") {
      continue;
    }

    judgedPairs.push(pair);
    totalConfidence += typeof pairJudgment.confidence === "number" ? pairJudgment.confidence : 0;

    for (const judgeResult of Object.values(normalizeJudgeResults(pairJudgment))) {
      judgeVoteCount += 1;
      if (judgeResult?.selfJudged === true) {
        selfJudgedVoteCount += 1;
      }
    }
  }

  const betterPairCount = judgedPairs.filter((pair) => pair.pairJudgment?.pairVerdict === "better").length;
  const worsePairCount = judgedPairs.filter((pair) => pair.pairJudgment?.pairVerdict === "worse").length;
  const tiePairCount = judgedPairs.filter((pair) => pair.pairJudgment?.pairVerdict === "no_change").length;
  const inconclusivePairCount = judgedPairs.filter((pair) => pair.pairJudgment?.pairVerdict === "inconclusive").length;
  const judgedPairCount = judgedPairs.length;
  const decisivePairCount = betterPairCount + worsePairCount;

  return {
    available: judgedPairCount > 0,
    totalPairCount,
    judgedPairCount,
    incompletePairCount: Math.max(0, totalPairCount - judgedPairCount),
    coverageComplete: totalPairCount > 0 && judgedPairCount === totalPairCount,
    betterPairCount,
    worsePairCount,
    tiePairCount,
    inconclusivePairCount,
    decisivePairCount,
    judgeEdge: judgedPairCount === 0 ? 0 : (betterPairCount - worsePairCount) / judgedPairCount,
    averageConfidence: judgedPairCount === 0 ? null : totalConfidence / judgedPairCount,
    directionConfidence: calculateDirectionConfidence({
      betterPairCount,
      worsePairCount
    }),
    judgeVoteCount,
    judgedVoteCount: judgeVoteCount,
    selfJudgedVoteCount,
    independentVoteCount: Math.max(0, judgeVoteCount - selfJudgedVoteCount),
    selfJudgedPairCount: judgedPairs.filter((pair) =>
      Object.values(normalizeJudgeResults(pair.pairJudgment)).some((judgeResult) => judgeResult?.selfJudged === true)
    ).length
  };
}

function createJudgeUsageSummary(pairResults) {
  return createUsageSummary(
    pairResults.flatMap((pair) => Object.values(normalizeJudgeResults(pair.pairJudgment))),
    (judgeResult) => judgeResult?.usage
  );
}

function createPerModelUsageSummary(modelRows, modelPairs) {
  const generationUsageSummary = createUsageSummary(modelRows, (row) => row?.usage);
  const judgeUsageSummary = createUsageSummary(
    modelPairs.flatMap((pair) => Object.values(normalizeJudgeResults(pair.pairJudgment))),
    (judgeResult) => judgeResult?.usage
  );

  return {
    total: mergeUsageSummaries([generationUsageSummary, judgeUsageSummary]),
    generation: generationUsageSummary,
    judges: judgeUsageSummary
  };
}

export function summarizePairResults({
  pairs,
  rows,
  expectedPairCount = null,
  modelIds = []
}) {
  const totalPairCount = expectedPairCount ?? pairs.length;
  const rowsByModel = new Map();
  const pairsByModel = new Map();

  for (const row of rows) {
    const existingRows = rowsByModel.get(row.modelId) ?? [];
    existingRows.push(row);
    rowsByModel.set(row.modelId, existingRows);
  }

  for (const pair of pairs) {
    const existingPairs = pairsByModel.get(pair.modelId) ?? [];
    existingPairs.push(pair);
    pairsByModel.set(pair.modelId, existingPairs);
  }

  const modelIdList = [...new Set([...modelIds, ...rowsByModel.keys()])].sort((leftModelId, rightModelId) =>
    leftModelId.localeCompare(rightModelId)
  );

  const perModel = modelIdList.map((modelId) => {
    const modelRows = rowsByModel.get(modelId) ?? [];
    const modelPairs = pairsByModel.get(modelId) ?? [];
    const plannedPairCount = new Set(modelRows.map((row) => createPairKey(row))).size;
    const usageBreakdown = createPerModelUsageSummary(modelRows, modelPairs);
    const liftSummary = createLiftSummary({
      pairResults: modelPairs,
      totalPairCount: plannedPairCount
    });

    return {
      modelId,
      ...liftSummary,
      judge: createJudgeSummary({
        pairResults: modelPairs,
        totalPairCount: plannedPairCount
      }),
      usage: usageBreakdown.total,
      usageBreakdown
    };
  });

  const generationUsageSummary = {
    total: createUsageSummary(rows, (row) => row?.usage),
    baseline: createUsageSummary(
      rows.filter((row) => row.conditionId === "baseline:none"),
      (row) => row?.usage
    ),
    treatment: createUsageSummary(
      rows.filter((row) => row.conditionId !== "baseline:none"),
      (row) => row?.usage
    )
  };
  const judgeUsageSummary = createJudgeUsageSummary(pairs);

  return {
    global: createLiftSummary({
      pairResults: pairs,
      totalPairCount
    }),
    judge: createJudgeSummary({
      pairResults: pairs,
      totalPairCount
    }),
    perModel,
    usage: {
      total: mergeUsageSummaries([generationUsageSummary.total, judgeUsageSummary]),
      generation: generationUsageSummary.total,
      judges: judgeUsageSummary,
      baseline: generationUsageSummary.baseline,
      treatment: generationUsageSummary.treatment
    },
    rowCounts: {
      planned: rows.length,
      scored: rows.filter((row) => row.rowStatus === "scored").length,
      failed: rows.filter((row) => row.rowStatus === "error").length
    },
    pairCounts: {
      planned: totalPairCount,
      scored: pairs.length,
      failed: Math.max(0, totalPairCount - pairs.length)
    }
  };
}
