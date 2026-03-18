function normalizeText(text) {
  return String(text ?? "").toLowerCase();
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
    (substring) => outputTextLowerCase.includes(normalizeText(substring))
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

function createLiftSummary({ baselineRows, treatmentRows }) {
  const baseline = createConditionAggregate(baselineRows);
  const treatment = createConditionAggregate(treatmentRows);

  return {
    baseline,
    treatment,
    averageScoreLift: treatment.averageScore - baseline.averageScore,
    passRateLift: treatment.passRate - baseline.passRate
  };
}

export function summarizeEvalRows(rows) {
  const baselineRows = rows.filter((row) => row.conditionId === "baseline:none");
  const treatmentRows = rows.filter((row) => row.conditionId !== "baseline:none");
  const rowsByModel = new Map();

  for (const row of rows) {
    const existingRows = rowsByModel.get(row.modelId) ?? [];
    existingRows.push(row);
    rowsByModel.set(row.modelId, existingRows);
  }

  const perModel = [...rowsByModel.entries()]
    .map(([modelId, modelRows]) => {
      const modelBaselineRows = modelRows.filter((row) => row.conditionId === "baseline:none");
      const modelTreatmentRows = modelRows.filter((row) => row.conditionId !== "baseline:none");
      return {
        modelId,
        ...createLiftSummary({
          baselineRows: modelBaselineRows,
          treatmentRows: modelTreatmentRows
        })
      };
    })
    .sort((leftEntry, rightEntry) => leftEntry.modelId.localeCompare(rightEntry.modelId));

  return {
    global: createLiftSummary({
      baselineRows,
      treatmentRows
    }),
    perModel
  };
}
