import { generateEvalResponse } from "./providers.js";

const MAX_DECISIVE_REASONS = 4;

function truncate(text, maxLength = 120) {
  const normalizedText = String(text ?? "").trim().replace(/\s+/g, " ");
  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatPercent(value) {
  return `${(Number(value ?? 0) * 100).toFixed(1)}%`;
}

function formatJudgeVerdict(summary) {
  if (!summary?.available || summary.judgedPairCount === 0) {
    return "no data";
  }

  if (summary.betterPairCount > 0 && summary.worsePairCount === 0 && summary.inconclusivePairCount === 0) {
    return "better";
  }

  if (summary.worsePairCount > 0 && summary.betterPairCount === 0 && summary.inconclusivePairCount === 0) {
    return "worse";
  }

  if (summary.tiePairCount > 0 && summary.betterPairCount === 0 && summary.worsePairCount === 0 && summary.inconclusivePairCount === 0) {
    return "tie";
  }

  return "inconclusive";
}

function createSummaryHeadline(runSummary) {
  return truncate(
    `${runSummary.bottomLine?.overallVerdict ?? "NO SIGNAL"}: ${runSummary.bottomLine?.soWhat ?? "No clear movement yet."}`,
    96
  );
}

function createSummaryNarrative({ runSummary, failureEntries }) {
  const sentences = [];
  const bottomLineStory = String(runSummary.bottomLine?.soWhat ?? "").trim();
  if (bottomLineStory.length > 0) {
    sentences.push(truncate(bottomLineStory, 180));
  }

  if (runSummary.judgeStatus !== "not_configured") {
    sentences.push(
      `Judge layer ${formatJudgeVerdict(runSummary.summary?.judge)} on ${runSummary.summary?.judge?.judgedPairCount ?? 0}/${runSummary.summary?.judge?.totalPairCount ?? 0} pairs.`
    );
  }

  if (runSummary.runStatus === "incomplete" && failureEntries.length > 0) {
    sentences.push(
      `The run is incomplete because ${failureEntries.length} row${failureEntries.length === 1 ? "" : "s"} failed.`
    );
  }

  return truncate(sentences.join(" "), 280);
}

function createMovementReasonSummary(movement, outcomeLabel) {
  const reasonText = truncate(
    [...movement.regressionReasons, ...movement.improvementReasons].join(" | ") || `treatment ${outcomeLabel} on the measured checks`,
    120
  );
  return `${movement.modelId} / ${movement.caseId} / trial ${movement.trialNumber}: ${reasonText}`;
}

function createComparisonReason(comparison, label) {
  if (!comparison || comparison.outcome === "no_prior") {
    return null;
  }

  if (comparison.outcome === "not_comparable") {
    return `${label}: ${comparison.previousRunId} is not comparable (${truncate(comparison.reason, 72)}).`;
  }

  return `${label}: ${comparison.metricLabel} moved ${comparison.metricValueDelta >= 0 ? "+" : ""}${(comparison.metricValueDelta * 100).toFixed(1)} pts vs ${comparison.previousRunId}.`;
}

function createDeterministicReasons({
  runSummary,
  movementSummary,
  failureEntries,
  previousComparison,
  previousVersionComparison
}) {
  const reasons = [
    `Hard checks: score ${formatPercent(runSummary.summary?.global?.baseline?.averageScore)} -> ${formatPercent(runSummary.summary?.global?.treatment?.averageScore)}; pass rate ${formatPercent(runSummary.summary?.global?.baseline?.passRate)} -> ${formatPercent(runSummary.summary?.global?.treatment?.passRate)}.`,
    runSummary.judgeStatus !== "not_configured"
      ? `Judge layer: ${formatJudgeVerdict(runSummary.summary?.judge)} across ${runSummary.summary?.judge?.judgedPairCount ?? 0}/${runSummary.summary?.judge?.totalPairCount ?? 0} pairs.`
      : null,
    movementSummary.regressions[0] ? createMovementReasonSummary(movementSummary.regressions[0], "regressed") : null,
    movementSummary.improvements[0] ? createMovementReasonSummary(movementSummary.improvements[0], "improved") : null,
    failureEntries[0]
      ? `${failureEntries.length} row failure${failureEntries.length === 1 ? "" : "s"}; e.g. ${failureEntries[0].modelId} / ${failureEntries[0].caseId} / trial ${failureEntries[0].trialNumber} ${failureEntries[0].code}.`
      : null,
    createComparisonReason(previousVersionComparison, "Previous version"),
    createComparisonReason(previousComparison, "Last run")
  ].filter(Boolean);

  return reasons.slice(0, MAX_DECISIVE_REASONS).map((reason) => truncate(reason, 132));
}

function createFallbackNextStep(runSummary) {
  return truncate(
    String(runSummary.bottomLine?.shipCall ?? "Inspect the saved run and rerun after tightening the weakest path."),
    132
  );
}

function createSummaryFacts({
  skillName,
  runSummary,
  movementSummary,
  failureEntries,
  previousComparison,
  previousVersionComparison
}) {
  return {
    skillName,
    runId: runSummary.runId,
    runStatus: runSummary.runStatus,
    suiteId: runSummary.suiteId,
    coverage: {
      comparablePairs: runSummary.summary?.global?.comparablePairCount ?? 0,
      totalPairs: runSummary.summary?.global?.totalPairCount ?? 0
    },
    bottomLine: {
      overallVerdict: runSummary.bottomLine?.overallVerdict ?? "NO SIGNAL",
      evidenceSource: runSummary.bottomLine?.evidenceSource ?? "unknown",
      soWhat: runSummary.bottomLine?.soWhat ?? "",
      shipCall: runSummary.bottomLine?.shipCall ?? "",
      bestFitModelId: runSummary.bottomLine?.bestFitModelId ?? null,
      weakestFitModelId: runSummary.bottomLine?.weakestFitModelId ?? null
    },
    hardChecks: {
      outcome: runSummary.primaryEvidence?.hardFloorOutcome ?? "no_signal",
      baselineAverageScore: formatPercent(runSummary.summary?.global?.baseline?.averageScore),
      treatmentAverageScore: formatPercent(runSummary.summary?.global?.treatment?.averageScore),
      baselinePassRate: formatPercent(runSummary.summary?.global?.baseline?.passRate),
      treatmentPassRate: formatPercent(runSummary.summary?.global?.treatment?.passRate),
      betterPairCount: runSummary.summary?.global?.betterPairCount ?? 0,
      worsePairCount: runSummary.summary?.global?.worsePairCount ?? 0,
      noChangePairCount: runSummary.summary?.global?.noChangePairCount ?? 0,
      mixedPairCount: runSummary.summary?.global?.mixedPairCount ?? 0
    },
    judgeLayer: {
      status: runSummary.judgeStatus,
      verdict: formatJudgeVerdict(runSummary.summary?.judge),
      judgedPairCount: runSummary.summary?.judge?.judgedPairCount ?? 0,
      totalPairCount: runSummary.summary?.judge?.totalPairCount ?? 0,
      betterPairCount: runSummary.summary?.judge?.betterPairCount ?? 0,
      worsePairCount: runSummary.summary?.judge?.worsePairCount ?? 0,
      tiePairCount: runSummary.summary?.judge?.tiePairCount ?? 0,
      inconclusivePairCount: runSummary.summary?.judge?.inconclusivePairCount ?? 0
    },
    perModel: (runSummary.summary?.perModel ?? []).map((modelEntry) => ({
      modelId: modelEntry.modelId,
      baselineAverageScore: formatPercent(modelEntry.baseline?.averageScore),
      treatmentAverageScore: formatPercent(modelEntry.treatment?.averageScore),
      averageScoreLiftPoints: Number(((modelEntry.averageScoreLift ?? 0) * 100).toFixed(1))
    })),
    topRegressions: movementSummary.regressions.slice(0, 2).map((movement) => ({
      modelId: movement.modelId,
      caseId: movement.caseId,
      trialNumber: movement.trialNumber,
      reasons: movement.regressionReasons
    })),
    topImprovements: movementSummary.improvements.slice(0, 2).map((movement) => ({
      modelId: movement.modelId,
      caseId: movement.caseId,
      trialNumber: movement.trialNumber,
      reasons: movement.improvementReasons
    })),
    rowFailures: failureEntries.slice(0, 3).map((failureEntry) => ({
      modelId: failureEntry.modelId,
      caseId: failureEntry.caseId,
      trialNumber: failureEntry.trialNumber,
      conditionId: failureEntry.conditionId,
      code: failureEntry.code,
      message: truncate(failureEntry.message, 120)
    })),
    previousRun: previousComparison
      ? {
        outcome: previousComparison.outcome,
        previousRunId: previousComparison.previousRunId ?? null,
        metricLabel: previousComparison.metricLabel ?? null,
        metricValueDelta: previousComparison.metricValueDelta ?? null,
        reason: previousComparison.reason ?? null
      }
      : null,
    previousVersion: previousVersionComparison
      ? {
        outcome: previousVersionComparison.outcome,
        previousRunId: previousVersionComparison.previousRunId ?? null,
        metricLabel: previousVersionComparison.metricLabel ?? null,
        metricValueDelta: previousVersionComparison.metricValueDelta ?? null,
        reason: previousVersionComparison.reason ?? null
      }
      : null
  };
}

function createSummaryPrompt(summaryFacts) {
  return `Write a terse developer-facing CLI summary from the eval facts.
Use only the provided facts. Do not invent causes, numbers, or recommendations.
Keep it compact and concrete.

Return JSON only with keys headline, summary, decisiveReasons, and nextStep.
- headline: one short sentence, max 96 characters.
- summary: one or two short sentences, max 280 characters.
- decisiveReasons: array of 2 to 4 concise bullets, each max 132 characters.
- nextStep: one short sentence, max 132 characters.
- If the run is incomplete, say so.
- If the result is mixed or no signal, say that directly.

Eval summary facts:
${JSON.stringify(summaryFacts, null, 2)}`;
}

function parseSummaryResponse(text) {
  const rawText = String(text ?? "").trim();
  const candidateJson = rawText.startsWith("{") ? rawText : rawText.match(/\{[\s\S]*\}/)?.[0];
  if (!candidateJson) {
    throw new Error("summary response did not contain JSON");
  }

  const parsed = JSON.parse(candidateJson);
  const decisiveReasons = Array.isArray(parsed?.decisiveReasons)
    ? parsed.decisiveReasons
    : typeof parsed?.decisiveReason === "string"
      ? [parsed.decisiveReason]
      : [];

  const normalizedDecisiveReasons = decisiveReasons
    .map((reason) => truncate(reason, 132))
    .filter((reason) => reason.length > 0)
    .slice(0, MAX_DECISIVE_REASONS);

  const headline = truncate(parsed?.headline, 96);
  const summary = truncate(parsed?.summary, 280);
  const nextStep = truncate(parsed?.nextStep, 132);

  if (!headline || !summary || !nextStep || normalizedDecisiveReasons.length === 0) {
    throw new Error("summary response was missing required fields");
  }

  return {
    headline,
    summary,
    decisiveReasons: normalizedDecisiveReasons,
    nextStep
  };
}

export function createDeterministicEvalReportSummary({
  runSummary,
  movementSummary,
  failureEntries,
  previousComparison,
  previousVersionComparison
}) {
  return {
    source: "deterministic",
    modelId: null,
    headline: createSummaryHeadline(runSummary),
    summary: createSummaryNarrative({
      runSummary,
      failureEntries
    }),
    decisiveReasons: createDeterministicReasons({
      runSummary,
      movementSummary,
      failureEntries,
      previousComparison,
      previousVersionComparison
    }),
    nextStep: createFallbackNextStep(runSummary)
  };
}

export async function createEvalReportSummary({
  skillName,
  runSummary,
  movementSummary,
  failureEntries,
  previousComparison,
  previousVersionComparison,
  summaryModelDescriptor,
  environmentVariables,
  fetchImplementation
}) {
  const fallbackSummary = createDeterministicEvalReportSummary({
    runSummary,
    movementSummary,
    failureEntries,
    previousComparison,
    previousVersionComparison
  });

  if (!summaryModelDescriptor) {
    return fallbackSummary;
  }

  const summaryFacts = createSummaryFacts({
    skillName,
    runSummary,
    movementSummary,
    failureEntries,
    previousComparison,
    previousVersionComparison
  });

  try {
    const response = await generateEvalResponse({
      modelDescriptor: summaryModelDescriptor,
      systemPrompt: "Summarize the eval facts. Return only the requested JSON.",
      userPrompt: createSummaryPrompt(summaryFacts),
      environmentVariables,
      fetchImplementation
    });
    const parsedSummary = parseSummaryResponse(response.text);
    return {
      source: "llm",
      modelId: summaryModelDescriptor.id,
      ...parsedSummary
    };
  } catch {
    return fallbackSummary;
  }
}
