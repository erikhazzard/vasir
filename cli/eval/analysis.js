import { classifyLiftOutcome, createComparableRowPairs } from "./scoring.js";

function diffCheckNames(nextValues, previousValues) {
  const previousValueSet = new Set(previousValues);
  return nextValues.filter((value) => !previousValueSet.has(value));
}

function formatCheckList(checkNames, limit = 3) {
  if (checkNames.length === 0) {
    return "";
  }

  const preview = checkNames.slice(0, limit).join(", ");
  return checkNames.length > limit ? `${preview}, +${checkNames.length - limit} more` : preview;
}

function createMovementReasons({ baselineRow, treatmentRow }) {
  const newMissingRequired = diffCheckNames(
    treatmentRow.hardScore.missingRequiredSubstrings,
    baselineRow.hardScore.missingRequiredSubstrings
  );
  const clearedMissingRequired = diffCheckNames(
    baselineRow.hardScore.missingRequiredSubstrings,
    treatmentRow.hardScore.missingRequiredSubstrings
  );
  const newForbiddenHits = diffCheckNames(
    treatmentRow.hardScore.presentForbiddenSubstrings,
    baselineRow.hardScore.presentForbiddenSubstrings
  );
  const clearedForbiddenHits = diffCheckNames(
    baselineRow.hardScore.presentForbiddenSubstrings,
    treatmentRow.hardScore.presentForbiddenSubstrings
  );

  const regressionReasons = [];
  const improvementReasons = [];

  if (newMissingRequired.length > 0) {
    regressionReasons.push(`lost required checks: ${formatCheckList(newMissingRequired)}`);
  }

  if (newForbiddenHits.length > 0) {
    regressionReasons.push(`introduced forbidden hits: ${formatCheckList(newForbiddenHits)}`);
  }

  if (clearedMissingRequired.length > 0) {
    improvementReasons.push(`recovered required checks: ${formatCheckList(clearedMissingRequired)}`);
  }

  if (clearedForbiddenHits.length > 0) {
    improvementReasons.push(`cleared forbidden hits: ${formatCheckList(clearedForbiddenHits)}`);
  }

  return {
    regressionReasons,
    improvementReasons
  };
}

export function createMovementSummary(rows) {
  const movements = createComparableRowPairs(rows).map((pair) => ({
    modelId: pair.modelId,
    caseId: pair.caseId,
    trialNumber: pair.trialNumber,
    baselineRow: pair.baselineRow,
    treatmentRow: pair.treatmentRow,
    outcome: classifyLiftOutcome({
      averageScoreDelta: pair.averageScoreLift,
      passRateDelta: pair.passRateLift
    }),
    averageScoreDelta: pair.averageScoreLift,
    passRateDelta: pair.passRateLift,
    ...createMovementReasons({
      baselineRow: pair.baselineRow,
      treatmentRow: pair.treatmentRow
    })
  }));

  const sortByImpact = (leftMovement, rightMovement) => (
    Math.abs(rightMovement.passRateDelta) - Math.abs(leftMovement.passRateDelta) ||
    Math.abs(rightMovement.averageScoreDelta) - Math.abs(leftMovement.averageScoreDelta) ||
    leftMovement.modelId.localeCompare(rightMovement.modelId) ||
    leftMovement.caseId.localeCompare(rightMovement.caseId) ||
    leftMovement.trialNumber - rightMovement.trialNumber
  );

  return {
    regressions: movements
      .filter((movement) => movement.outcome === "worse" || movement.outcome === "mixed")
      .sort(sortByImpact),
    improvements: movements
      .filter((movement) => movement.outcome === "better")
      .sort(sortByImpact)
  };
}

export function createFailedRowSummary(rows) {
  return rows
    .filter((row) => row.rowStatus === "error" && row.error)
    .map((row) => ({
      modelId: row.modelId,
      caseId: row.caseId,
      trialNumber: row.trialNumber ?? 1,
      conditionId: row.conditionId,
      code: row.error.code,
      message: row.error.message
    }));
}
