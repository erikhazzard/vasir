import { classifyLiftOutcome } from "./scoring.js";

const COMPARISON_EPSILON = 1e-9;

function normalizeModelIds(modelIds) {
  return [...(Array.isArray(modelIds) ? modelIds : [])].sort().join(",");
}

function compareNumbersDescending(leftValue, rightValue) {
  if (rightValue !== leftValue) {
    return rightValue - leftValue;
  }

  return 0;
}

function verdictRank(verdict) {
  if (verdict === "better") {
    return 2;
  }

  if (verdict === "no_change") {
    return 1;
  }

  if (verdict === "inconclusive" || verdict === "mixed") {
    return 0;
  }

  if (verdict === "worse") {
    return -1;
  }

  return -2;
}

function normalizeJudgeVerdict(judgeOutcome) {
  if (judgeOutcome === "tie") {
    return "no_change";
  }

  return judgeOutcome;
}

function isJudgeEvidenceMode(mode) {
  return mode === "dual_judges_with_hard_floor";
}

function isMissingJudgeEvidenceMode(mode) {
  return mode === "hard_floor_without_judges";
}

function buildJudgeEdge(judgeSummary) {
  if (!judgeSummary?.available || judgeSummary.judgedPairCount === 0) {
    return 0;
  }

  return (judgeSummary.betterPairCount - judgeSummary.worsePairCount) / judgeSummary.judgedPairCount;
}

function isCompleteJudgeEvidence({ summary, judgeStatus, judgeModelIds }) {
  return (
    judgeStatus === "complete" &&
    summary?.judge?.available === true &&
    summary.judge.judgedPairCount > 0 &&
    summary.judge.judgedPairCount === summary.judge.totalPairCount &&
    Array.isArray(judgeModelIds) &&
    judgeModelIds.length > 0
  );
}

function createHardModelEvidence(modelEntry) {
  const verdict = describeLiftOutcome(modelEntry);
  return {
    modelId: modelEntry.modelId,
    verdict,
    metricName: "hard_score_lift",
    metricLabel: "hard score lift",
    metricValue: modelEntry.averageScoreLift
  };
}

function createJudgeModelEvidence(modelEntry) {
  const hardOutcome = describeLiftOutcome(modelEntry);
  const judgeOutcome = classifyJudgeOutcome(modelEntry.judge);
  const verdict = hardOutcome === "worse"
    ? "worse"
    : normalizeJudgeVerdict(judgeOutcome);

  return {
    modelId: modelEntry.modelId,
    verdict,
    metricName: "judge_edge",
    metricLabel: "judge edge",
    metricValue: buildJudgeEdge(modelEntry.judge)
  };
}

function createModelEvidence(modelEntry, primaryMode) {
  return isJudgeEvidenceMode(primaryMode)
    ? createJudgeModelEvidence(modelEntry)
    : createHardModelEvidence(modelEntry);
}

function compareModelEvidence(leftEntry, rightEntry, primaryMode) {
  const leftEvidence = createModelEvidence(leftEntry, primaryMode);
  const rightEvidence = createModelEvidence(rightEntry, primaryMode);
  const verdictRankDelta = compareNumbersDescending(
    verdictRank(leftEvidence.verdict),
    verdictRank(rightEvidence.verdict)
  );

  if (verdictRankDelta !== 0) {
    return verdictRankDelta;
  }

  return (
    compareNumbersDescending(leftEvidence.metricValue, rightEvidence.metricValue) ||
    rightEvidence.modelId.localeCompare(leftEvidence.modelId)
  );
}

function selectModelExtremes(perModelEntries, primaryMode) {
  const comparableModels = perModelEntries.filter((modelEntry) => modelEntry.comparablePairCount > 0);
  if (comparableModels.length === 0) {
    return {
      bestModel: null,
      weakestModel: null
    };
  }

  const sortedModels = [...comparableModels].sort((leftEntry, rightEntry) =>
    compareModelEvidence(leftEntry, rightEntry, primaryMode)
  );

  return {
    bestModel: createModelEvidence(sortedModels[0], primaryMode),
    weakestModel: createModelEvidence(sortedModels[sortedModels.length - 1], primaryMode)
  };
}

function describeHardMetricStory(globalSummary) {
  const scoreOutcome =
    globalSummary.averageScoreLift > 0
      ? "better"
      : globalSummary.averageScoreLift < 0
        ? "worse"
        : "flat";
  const passOutcome =
    globalSummary.passRateLift > 0
      ? "better"
      : globalSummary.passRateLift < 0
        ? "worse"
        : "flat";

  if (scoreOutcome === "better" && passOutcome === "better") {
    return "the skill raises both check score and full-pass rate";
  }

  if (scoreOutcome === "worse" && passOutcome === "worse") {
    return "the skill lowers both check score and full-pass rate";
  }

  if (scoreOutcome === "better" && passOutcome === "flat") {
    return "the skill raises check score, but full-pass rate is flat";
  }

  if (scoreOutcome === "flat" && passOutcome === "better") {
    return "the skill gets more full passes, while check score stays flat";
  }

  if (scoreOutcome === "flat" && passOutcome === "worse") {
    return "the skill drops full-pass rate, while check score stays flat";
  }

  if (scoreOutcome === "worse" && passOutcome === "flat") {
    return "the skill lowers check score, while full-pass rate stays flat";
  }

  if (scoreOutcome === "better" && passOutcome === "worse") {
    return "the skill raises check score, but full-pass rate gets worse";
  }

  if (scoreOutcome === "worse" && passOutcome === "better") {
    return "the skill gets more full passes, but average check score slips";
  }

  return "the skill is not moving the measured checks enough yet";
}

function describeJudgeMetricStory({ judgeSummary, hardOutcome }) {
  const judgeOutcome = classifyJudgeOutcome(judgeSummary);

  if (hardOutcome === "worse" && judgeOutcome === "better") {
    return "judges prefer the skilled answer, but the hard-check floor regressed";
  }

  if (hardOutcome === "worse") {
    return "the hard-check floor regressed, so the skill is not safe to trust";
  }

  if (judgeOutcome === "better") {
    return "the fixed dual judges prefer the skilled answer";
  }

  if (judgeOutcome === "worse") {
    return "the fixed dual judges prefer the baseline answer";
  }

  if (judgeOutcome === "tie") {
    return "the fixed dual judges call the pairwise result a tie";
  }

  if (judgeOutcome === "inconclusive") {
    return "the fixed judges disagree or produce split pairwise results";
  }

  return "the fixed dual judges did not produce a usable signal";
}

function describeModelStory(perModelEntries, primaryMode) {
  const modelEvidenceEntries = perModelEntries
    .filter((modelEntry) => modelEntry.comparablePairCount > 0)
    .map((modelEntry) => createModelEvidence(modelEntry, primaryMode));

  if (modelEvidenceEntries.length === 0) {
    return "no model pairs were comparable";
  }

  const betterModels = modelEvidenceEntries.filter((modelEntry) => modelEntry.verdict === "better");
  const worseModels = modelEvidenceEntries.filter((modelEntry) => modelEntry.verdict === "worse");
  const mixedModels = modelEvidenceEntries.filter((modelEntry) =>
    modelEntry.verdict === "inconclusive" || modelEntry.verdict === "mixed"
  );

  const sortedBetterModels = [...betterModels].sort((leftEntry, rightEntry) =>
    compareNumbersDescending(leftEntry.metricValue, rightEntry.metricValue) ||
    rightEntry.modelId.localeCompare(leftEntry.modelId)
  );
  const sortedWorseModels = [...worseModels].sort((leftEntry, rightEntry) =>
    compareNumbersDescending(leftEntry.metricValue, rightEntry.metricValue) ||
    rightEntry.modelId.localeCompare(leftEntry.modelId)
  );

  if (sortedBetterModels.length > 0 && sortedWorseModels.length > 0) {
    return `it helps ${sortedBetterModels[0].modelId}, but hurts ${sortedWorseModels[sortedWorseModels.length - 1].modelId}`;
  }

  if (sortedBetterModels.length > 0) {
    if (sortedBetterModels.length === modelEvidenceEntries.length) {
      return "it helps every tested model";
    }

    return `it helps ${sortedBetterModels[0].modelId}, and the other tested models do not clearly regress`;
  }

  if (sortedWorseModels.length > 0) {
    if (sortedWorseModels.length === modelEvidenceEntries.length) {
      return "it hurts every tested model";
    }

    return `it does not clearly help any model, and hurts ${sortedWorseModels[sortedWorseModels.length - 1].modelId}`;
  }

  if (mixedModels.length > 0) {
    return "model-level results are mixed and unstable";
  }

  return "it does not clearly move the tested models";
}

export function describeLiftOutcome(summarySlice) {
  if (!summarySlice || summarySlice.comparablePairCount === 0) {
    return "no_data";
  }

  return classifyLiftOutcome({
    averageScoreDelta: summarySlice.averageScoreLift,
    passRateDelta: summarySlice.passRateLift
  });
}

export function classifyJudgeOutcome(judgeSummary) {
  if (!judgeSummary?.available || judgeSummary.judgedPairCount === 0) {
    return "no_data";
  }

  if (judgeSummary.betterPairCount > 0 && judgeSummary.worsePairCount === 0 && judgeSummary.inconclusivePairCount === 0) {
    return "better";
  }

  if (judgeSummary.worsePairCount > 0 && judgeSummary.betterPairCount === 0 && judgeSummary.inconclusivePairCount === 0) {
    return "worse";
  }

  if (judgeSummary.tiePairCount > 0 && judgeSummary.betterPairCount === 0 && judgeSummary.worsePairCount === 0 && judgeSummary.inconclusivePairCount === 0) {
    return "tie";
  }

  return "inconclusive";
}

export function createPrimaryEvidence({
  summary,
  judgeStatus,
  judgeModelIds = []
}) {
  const hardOutcome = describeLiftOutcome(summary?.global);
  const usingJudgeSignal = isCompleteJudgeEvidence({
    summary,
    judgeStatus,
    judgeModelIds
  });

  if (usingJudgeSignal) {
    const judgeOutcome = classifyJudgeOutcome(summary.judge);
    const verdict = hardOutcome === "worse"
      ? "worse"
      : normalizeJudgeVerdict(judgeOutcome);

    return {
      mode: "dual_judges_with_hard_floor",
      verdict,
      metricName: "judge_edge",
      metricLabel: "judge edge",
      metricValue: buildJudgeEdge(summary.judge),
      confidence: typeof summary.judge.directionConfidence === "number"
        ? summary.judge.directionConfidence
        : summary.judge.averageConfidence,
      judgeModelIds: [...judgeModelIds],
      judgeOutcome,
      hardFloorOutcome: hardOutcome
    };
  }

  if (typeof judgeStatus === "string" && judgeStatus !== "not_configured" && judgeStatus !== "disabled") {
    return {
      mode: "hard_floor_without_judges",
      verdict: hardOutcome === "worse" ? "worse" : "no_data",
      metricName: "hard_score_lift",
      metricLabel: "hard score lift",
      metricValue: summary?.global?.averageScoreLift ?? 0,
      confidence: null,
      judgeModelIds: [...judgeModelIds],
      judgeOutcome: "no_data",
      hardFloorOutcome: hardOutcome
    };
  }

  return {
    mode: "hard_checks_only",
    verdict: hardOutcome,
    metricName: "hard_score_lift",
    metricLabel: "hard score lift",
    metricValue: summary?.global?.averageScoreLift ?? 0,
    confidence: summary?.global?.directionConfidence ?? null,
    judgeModelIds: [],
    judgeOutcome: "no_data",
    hardFloorOutcome: hardOutcome
  };
}

function readPrimaryEvidence(summaryPayload) {
  if (summaryPayload?.primaryEvidence && typeof summaryPayload.primaryEvidence === "object") {
    return summaryPayload.primaryEvidence;
  }

  return createPrimaryEvidence({
    summary: summaryPayload?.summary,
    judgeStatus: summaryPayload?.judgeStatus ?? "disabled",
    judgeModelIds: summaryPayload?.judgeModels ?? []
  });
}

export function getRunComparability(currentSummary, previousSummary) {
  if (!previousSummary) {
    return {
      comparable: false,
      reason: "no previous summary recorded"
    };
  }

  if (currentSummary.runStatus !== "complete" || previousSummary.runStatus !== "complete") {
    return {
      comparable: false,
      reason: "one of the runs is incomplete"
    };
  }

  if (!currentSummary.suiteHash || !previousSummary.suiteHash || currentSummary.suiteHash !== previousSummary.suiteHash) {
    return {
      comparable: false,
      reason: "the suite version changed"
    };
  }

  if ((currentSummary.trialCount ?? 1) !== (previousSummary.trialCount ?? 1)) {
    return {
      comparable: false,
      reason: "the trial count changed"
    };
  }

  if (currentSummary.scorerVersion !== previousSummary.scorerVersion) {
    return {
      comparable: false,
      reason: "the scorer version changed"
    };
  }

  if (currentSummary.harnessVersion !== previousSummary.harnessVersion) {
    return {
      comparable: false,
      reason: "the eval harness version changed"
    };
  }

  if (normalizeModelIds(currentSummary.modelIds) !== normalizeModelIds(previousSummary.modelIds)) {
    return {
      comparable: false,
      reason: "the model set changed"
    };
  }

  const currentPrimaryEvidence = readPrimaryEvidence(currentSummary);
  const previousPrimaryEvidence = readPrimaryEvidence(previousSummary);

  if (
    isMissingJudgeEvidenceMode(currentPrimaryEvidence.mode) ||
    isMissingJudgeEvidenceMode(previousPrimaryEvidence.mode)
  ) {
    return {
      comparable: false,
      reason: "one of the runs did not complete the judge layer"
    };
  }

  if (currentPrimaryEvidence.verdict === "no_data" || previousPrimaryEvidence.verdict === "no_data") {
    return {
      comparable: false,
      reason: "one of the runs did not produce a usable verdict"
    };
  }

  if (currentPrimaryEvidence.mode !== previousPrimaryEvidence.mode) {
    return {
      comparable: false,
      reason: "the primary evidence mode changed"
    };
  }

  if (
    isJudgeEvidenceMode(currentPrimaryEvidence.mode) &&
    normalizeModelIds(currentPrimaryEvidence.judgeModelIds) !== normalizeModelIds(previousPrimaryEvidence.judgeModelIds)
  ) {
    return {
      comparable: false,
      reason: "the judge model set changed"
    };
  }

  return {
    comparable: true,
    reason: ""
  };
}

export function createEvidenceComparison({ currentSummary, previousSummary }) {
  if (!previousSummary) {
    return {
      outcome: "no_prior",
      comparable: false
    };
  }

  const comparability = getRunComparability(currentSummary, previousSummary);
  if (!comparability.comparable) {
    return {
      outcome: "not_comparable",
      comparable: false,
      previousRunId: previousSummary.runId,
      reason: comparability.reason
    };
  }

  const currentPrimaryEvidence = readPrimaryEvidence(currentSummary);
  const previousPrimaryEvidence = readPrimaryEvidence(previousSummary);
  const verdictRankDelta =
    verdictRank(currentPrimaryEvidence.verdict) - verdictRank(previousPrimaryEvidence.verdict);
  const metricValueDelta = currentPrimaryEvidence.metricValue - previousPrimaryEvidence.metricValue;

  let outcome = "no_change";
  if (verdictRankDelta > 0) {
    outcome = "better";
  } else if (verdictRankDelta < 0) {
    outcome = "worse";
  } else if (metricValueDelta > COMPARISON_EPSILON) {
    outcome = "better";
  } else if (metricValueDelta < -COMPARISON_EPSILON) {
    outcome = "worse";
  }

  return {
    outcome,
    comparable: true,
    previousRunId: previousSummary.runId,
    evidenceMode: currentPrimaryEvidence.mode,
    metricName: currentPrimaryEvidence.metricName,
    metricLabel: currentPrimaryEvidence.metricLabel,
    currentMetricValue: currentPrimaryEvidence.metricValue,
    previousMetricValue: previousPrimaryEvidence.metricValue,
    metricValueDelta,
    currentVerdict: currentPrimaryEvidence.verdict,
    previousVerdict: previousPrimaryEvidence.verdict
  };
}

export function createBottomLine({
  summary,
  judgeStatus,
  judgeModelIds = []
}) {
  const primaryEvidence = createPrimaryEvidence({
    summary,
    judgeStatus,
    judgeModelIds
  });
  const overallOutcome = primaryEvidence.verdict;
  let overallVerdict = "NO SIGNAL";
  let shipCall = "tighten the skill or suite, then rerun it";
  const usesJudgeEvidence = primaryEvidence.mode === "dual_judges_with_hard_floor";
  const missingJudgeEvidence = isMissingJudgeEvidenceMode(primaryEvidence.mode);

  if (overallOutcome === "better") {
    overallVerdict = "BETTER";
    shipCall = usesJudgeEvidence
      ? "keep it and expand the suite before locking it in"
      : "the hard floor improved; keep it only if the suite measures the behavior you care about";
  } else if (overallOutcome === "worse") {
    overallVerdict = "WORSE";
    shipCall = missingJudgeEvidence
      ? "the hard floor regressed and the fixed judge layer was unavailable; revise the skill and rerun with both judge providers"
      : usesJudgeEvidence
      ? "revise the skill before trusting it"
      : "hard checks regressed; revise the skill before trusting it";
  } else if (overallOutcome === "inconclusive" && usesJudgeEvidence) {
    overallVerdict = "INCONCLUSIVE";
    shipCall = "inspect the split pairs, tighten the skill, and rerun it";
  } else if (missingJudgeEvidence) {
    overallVerdict = "NO SIGNAL";
    shipCall = "rerun with both fixed judge providers before trusting the suite-level verdict";
  }

  const primaryMode = primaryEvidence.mode;
  const {
    bestModel,
    weakestModel
  } = selectModelExtremes(summary.perModel, primaryMode);
  const evidenceSource = usesJudgeEvidence
    ? `fixed dual judges + hard floor${summary.judge?.selfJudgedPairCount > 0 ? " (includes self-judging)" : ""}`
    : missingJudgeEvidence
      ? "hard floor only; fixed judges unavailable"
      : "hard checks only";
  const soWhat = usesJudgeEvidence
    ? `${describeJudgeMetricStory({ judgeSummary: summary.judge, hardOutcome: primaryEvidence.hardFloorOutcome })}; ${describeModelStory(summary.perModel, primaryMode)}`
    : missingJudgeEvidence
      ? `${describeHardMetricStory(summary.global)}; the fixed judge layer was unavailable, so this run cannot prove semantic lift`
      : `${describeHardMetricStory(summary.global)}; ${describeModelStory(summary.perModel, primaryMode)}`;

  return {
    overallVerdict,
    evidenceSource,
    soWhat,
    shipCall,
    confidenceBand: (() => {
      const confidenceValue = primaryEvidence.confidence;
      if (typeof confidenceValue !== "number") {
        return "unknown";
      }
      if (confidenceValue < 0.55) {
        return "low";
      }
      if (confidenceValue < 0.75) {
        return "medium";
      }
      return "high";
    })(),
    bestFitModelId: bestModel?.modelId ?? null,
    bestFitVerdict: bestModel?.verdict ?? "none",
    weakestFitModelId: weakestModel?.modelId ?? null,
    weakestFitVerdict: weakestModel?.verdict ?? "none",
    primaryEvidence
  };
}
