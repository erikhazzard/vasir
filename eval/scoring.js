function normalizeText(text) {
  return String(text ?? "").toLowerCase();
}

export const SCORER_VERSION = 4;

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

  return {
    passed: missingRequiredSubstrings.length === 0 && presentForbiddenSubstrings.length === 0,
    score: totalChecks === 0 ? 1 : passedChecks / totalChecks,
    missingRequiredSubstrings,
    presentForbiddenSubstrings
  };
}

function createConditionAggregate(rows) {
  const rowCount = rows.length;
  const totalScore = rows.reduce((sum, row) => sum + row.hardScore.score, 0);
  const passedCount = rows.filter((row) => row.hardScore.passed).length;

  return {
    rowCount,
    averageScore: rowCount === 0 ? 0 : totalScore / rowCount,
    passRate: rowCount === 0 ? 0 : passedCount / rowCount
  };
}

function createLiftSummary({ baselineRows, treatmentRows, totalPairCount }) {
  const baseline = createConditionAggregate(baselineRows);
  const treatment = createConditionAggregate(treatmentRows);
  const comparablePairCount = Math.min(baseline.rowCount, treatment.rowCount);

  return {
    baseline,
    treatment,
    comparablePairCount,
    totalPairCount,
    incompletePairCount: Math.max(0, totalPairCount - comparablePairCount),
    averageScoreLift: treatment.averageScore - baseline.averageScore,
    passRateLift: treatment.passRate - baseline.passRate
  };
}

function isScoredRow(row) {
  return row?.rowStatus !== "error" && row?.hardScore && typeof row.hardScore.score === "number";
}

function createComparablePairs(rows) {
  const pairedRows = new Map();
  for (const row of rows) {
    const rowKey = `${row.modelId}::${row.caseId}`;
    const existingPair = pairedRows.get(rowKey) ?? {};
    if (row.conditionId === "baseline:none") {
      existingPair.baselineRow = row;
    } else {
      existingPair.treatmentRow = row;
    }
    pairedRows.set(rowKey, existingPair);
  }

  return [...pairedRows.values()].filter(
    (rowPair) => isScoredRow(rowPair.baselineRow) && isScoredRow(rowPair.treatmentRow)
  );
}

export function summarizeEvalRows({ rows, expectedPairCount = null }) {
  const comparablePairs = createComparablePairs(rows);
  const baselineRows = comparablePairs.map((rowPair) => rowPair.baselineRow);
  const treatmentRows = comparablePairs.map((rowPair) => rowPair.treatmentRow);
  const rowsByModel = new Map();
  const comparablePairsByModel = new Map();

  for (const row of rows) {
    const existingRows = rowsByModel.get(row.modelId) ?? [];
    existingRows.push(row);
    rowsByModel.set(row.modelId, existingRows);
  }

  for (const rowPair of comparablePairs) {
    const existingPairs = comparablePairsByModel.get(rowPair.baselineRow.modelId) ?? [];
    existingPairs.push(rowPair);
    comparablePairsByModel.set(rowPair.baselineRow.modelId, existingPairs);
  }

  const perModel = [...rowsByModel.entries()]
    .map(([modelId, modelRows]) => {
      const comparableModelPairs = comparablePairsByModel.get(modelId) ?? [];
      const modelBaselineRows = comparableModelPairs.map((rowPair) => rowPair.baselineRow);
      const modelTreatmentRows = comparableModelPairs.map((rowPair) => rowPair.treatmentRow);
      const allPairKeys = new Set(modelRows.map((row) => `${row.modelId}::${row.caseId}`));
      return {
        modelId,
        ...createLiftSummary({
          baselineRows: modelBaselineRows,
          treatmentRows: modelTreatmentRows,
          totalPairCount: allPairKeys.size
        })
      };
    })
    .sort((leftEntry, rightEntry) => leftEntry.modelId.localeCompare(rightEntry.modelId));

  const scoredRowCount = rows.filter(isScoredRow).length;
  const failedRowCount = rows.filter((row) => row?.rowStatus === "error").length;
  const totalPairCount = expectedPairCount ?? comparablePairs.length;

  return {
    global: createLiftSummary({
      baselineRows,
      treatmentRows,
      totalPairCount
    }),
    perModel,
    rowCounts: {
      planned: rows.length,
      scored: scoredRowCount,
      failed: failedRowCount
    }
  };
}
