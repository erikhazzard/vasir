import process from "node:process";

import { VasirCliError } from "../install/cli-error.js";
import { EVAL_TROUBLESHOOTING_DOCS_REF } from "../install/docs-ref.js";
import { createCommandUi } from "../scripts/ui/command-output.js";
import { createBottomLine as createEvalBottomLine } from "./evidence.js";
import { readEvalRunArtifacts, writeEvalRunArtifacts } from "./history.js";
import {
  classifyLiftOutcome,
  createComparableRowPairs,
  scoreCaseOutput,
  SCORER_VERSION,
  summarizePairResults
} from "./scoring.js";

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

function createRulesReason({ baselineRow, treatmentRow, outcome }) {
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

  if (outcome === "better") {
    const reasons = [];
    if (clearedMissingRequired.length > 0) {
      reasons.push(`recovered required checks: ${formatCheckList(clearedMissingRequired)}`);
    }
    if (clearedForbiddenHits.length > 0) {
      reasons.push(`cleared forbidden hits: ${formatCheckList(clearedForbiddenHits)}`);
    }
    return reasons.join(" | ") || "treatment improved the measured checks";
  }

  if (outcome === "worse" || outcome === "mixed") {
    const reasons = [];
    if (newMissingRequired.length > 0) {
      reasons.push(`lost required checks: ${formatCheckList(newMissingRequired)}`);
    }
    if (newForbiddenHits.length > 0) {
      reasons.push(`introduced forbidden hits: ${formatCheckList(newForbiddenHits)}`);
    }
    return reasons.join(" | ") || "treatment regressed on the measured checks";
  }

  return "baseline and treatment tied on the measured checks";
}

function createRulesPairResult(pair) {
  const averageScoreLift = pair.treatmentRow.hardScore.score - pair.baselineRow.hardScore.score;
  const passRateLift = Number(pair.treatmentRow.hardScore.passed) - Number(pair.baselineRow.hardScore.passed);
  const outcome = classifyLiftOutcome({
    averageScoreDelta: averageScoreLift,
    passRateDelta: passRateLift
  });

  return {
    pairKey: pair.pairKey,
    pairStatus: "scored",
    modelId: pair.modelId,
    caseId: pair.caseId,
    trialNumber: pair.trialNumber,
    baseline: {
      rowKey: pair.baselineRow.rowKey,
      outputText: pair.baselineRow.outputText,
      score: pair.baselineRow.hardScore.score,
      passed: pair.baselineRow.hardScore.passed,
      usage: pair.baselineRow.usage
    },
    treatment: {
      rowKey: pair.treatmentRow.rowKey,
      outputText: pair.treatmentRow.outputText,
      score: pair.treatmentRow.hardScore.score,
      passed: pair.treatmentRow.hardScore.passed,
      usage: pair.treatmentRow.usage
    },
    averageScoreLift,
    passRateLift,
    outcome,
    confidence: null,
    reason: createRulesReason({
      baselineRow: pair.baselineRow,
      treatmentRow: pair.treatmentRow,
      outcome
    }),
    pairJudgment: pair.pairJudgment ?? null
  };
}

export function rescoreSkillEval({
  skillName,
  runId = null,
  currentWorkingDirectory = process.cwd(),
  outputStream = process.stdout,
  stdoutWriter,
  jsonOutput
}) {
  const { runDirectoryPath, run } = readEvalRunArtifacts({
    currentWorkingDirectory,
    skillName,
    runId
  });

  const previousScoreLift = run.summary?.global?.averageScoreLift ?? 0;
  const previousPassLift = run.summary?.global?.passRateLift ?? 0;
  const previousScorerVersion = run.scorerVersion ?? null;

  const rescoredRows = run.rows.map((row) => {
    if (row.rowStatus === "error") {
      return row;
    }

    if (!row.caseDefinitionSnapshot) {
      throw new VasirCliError({
        code: "EVAL_RUN_NOT_RESCORABLE",
        message: `Eval run row cannot be rescored because the case contract for ${row.caseId} was not recorded.`,
        suggestion: "Rerun the eval so Vasir can persist the case contract alongside the outputs.",
        docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
      });
    }

    return {
      ...row,
      scorerVersion: SCORER_VERSION,
      hardScore: scoreCaseOutput({
        caseDefinition: row.caseDefinitionSnapshot,
        outputText: row.outputText
      })
    };
  });

  const rescoredPairs = createComparableRowPairs(rescoredRows).map((pair) => createRulesPairResult(pair));
  const rebuiltSummary = summarizePairResults({
    pairs: rescoredPairs,
    rows: rescoredRows,
    expectedPairCount: run.summary.pairCounts?.planned ?? run.caseCount * run.modelIds.length * (run.trialCount ?? 1),
    modelIds: run.modelIds
  });
  const rebuiltRunStatus = rebuiltSummary.rowCounts.failed > 0 || rebuiltSummary.pairCounts.failed > 0
    ? "incomplete"
    : "complete";
  const rescoredAt = new Date().toISOString();
  const rebuiltBottomLine = createEvalBottomLine({
    summary: rebuiltSummary,
    judgeStatus: run.judgeStatus ?? "not_configured",
    judgeModelIds: run.judgeModels ?? []
  });

  const updatedRun = {
    ...run,
    scorerVersion: SCORER_VERSION,
    runStatus: rebuiltRunStatus,
    completedAt: rescoredAt,
    summary: rebuiltSummary,
    bottomLine: rebuiltBottomLine,
    primaryEvidence: rebuiltBottomLine.primaryEvidence,
    rows: rescoredRows,
    pairs: rescoredPairs,
    rescoredAt,
    lastRescoredFromScorerVersion: previousScorerVersion,
    previousComparison: null,
    previousVersionComparison: null
  };

  writeEvalRunArtifacts({
    currentWorkingDirectory,
    skillName,
    runId: run.runId,
    runPayload: updatedRun
  });

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const labelWidth = 16;
    stdoutWriter(
      ui.renderPanel({
        title: `Rescored Eval ${skillName}`,
        lines: [
          ui.formatField("run", run.runId, { labelWidth }),
          ui.formatField("artifacts", ui.formatPath(runDirectoryPath), { labelWidth }),
          ui.formatField("scorer", `${previousScorerVersion ?? "unknown"} -> ${SCORER_VERSION}`, { labelWidth }),
          ui.formatField(
            "score edge",
            `${ui.formatLift(previousScoreLift)} -> ${ui.formatLift(updatedRun.summary.global.averageScoreLift)} (${ui.formatLift(updatedRun.summary.global.averageScoreLift - previousScoreLift)})`,
            { labelWidth }
          ),
          ui.formatField(
            "pass edge",
            `${ui.formatLift(previousPassLift)} -> ${ui.formatLift(updatedRun.summary.global.passRateLift)} (${ui.formatLift(updatedRun.summary.global.passRateLift - previousPassLift)})`,
            { labelWidth }
          ),
          ui.formatField("status", ui.formatOutcome(updatedRun.runStatus), { labelWidth }),
          ui.formatField("rescored at", rescoredAt, { labelWidth })
        ]
      })
    );
  }

  return {
    subcommand: "rescore",
    skillName,
    runId: run.runId,
    outputDirectory: runDirectoryPath,
    scorerVersion: SCORER_VERSION,
    previousScorerVersion,
    averageScoreLiftDelta: updatedRun.summary.global.averageScoreLift - previousScoreLift,
    passRateLiftDelta: updatedRun.summary.global.passRateLift - previousPassLift,
    summary: updatedRun
  };
}
