import crypto from "node:crypto";

function stableDigest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function compareText(left, right) {
  return String(left).localeCompare(String(right));
}

function createCohortHash(run) {
  const rowsByKey = new Map((run.rows ?? []).map((row) => [row.rowKey, row]));
  const candidateOrder = Array.isArray(run.judging?.candidateOrder)
    ? run.judging.candidateOrder
    : [];
  const cohortEntries = candidateOrder.map((candidate) => {
    const row = rowsByKey.get(candidate.rowKey);
    return {
      rowKey: candidate.rowKey,
      outputHash: stableDigest(row?.outputText ?? "")
    };
  });
  return cohortEntries.length > 0 ? stableDigest(JSON.stringify(cohortEntries)) : null;
}

function resolveRowHarnessInstruction(run, configurationId) {
  const overrideInstruction = run.generation?.promptModeOverrides?.[configurationId]?.instruction;
  // Rejudges retain paid generation evidence, so each row must remain bound to the
  // configuration-specific prompt bytes that produced it.
  return typeof overrideInstruction === "string"
    ? overrideInstruction
    : run.generation?.neutralHarnessInstruction;
}

function normalizePanelEvaluationEvidence(score) {
  const evaluations = score?.aggregation?.evaluations;
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return null;
  }

  const normalized = evaluations.map((evaluation) => {
    const reviewerId = typeof evaluation?.reviewerId === "string"
      ? evaluation.reviewerId
      : null;
    const evaluationHash = typeof evaluation?.evaluationHash === "string" &&
      /^[a-f0-9]{64}$/u.test(evaluation.evaluationHash)
      ? evaluation.evaluationHash
      : null;
    if (!reviewerId || !evaluationHash || !Number.isFinite(evaluation?.total)) {
      return null;
    }
    return {
      reviewerId,
      evaluationHash,
      total: evaluation.total
    };
  });
  if (normalized.some((evaluation) => evaluation === null)) {
    return null;
  }

  return normalized.sort((left, right) =>
    compareText(left.reviewerId, right.reviewerId) ||
    compareText(left.evaluationHash, right.evaluationHash)
  );
}

/**
 * Creates the score identity for one response only. Adding or removing another
 * model from a benchmark run cannot change this hash because no cohort, batch,
 * prompt, or run-wide judgment digest participates in it.
 */
export function createBenchmarkRowScoreBasisHash({
  row,
  scoringHash,
  scoringVersion = null
}) {
  if (!row?.score || typeof row.basisHash !== "string" || !row.basisHash) {
    return null;
  }

  const aggregation = row.score.aggregation;
  const evaluations = normalizePanelEvaluationEvidence(row.score);
  if (
    !aggregation ||
    typeof aggregation.method !== "string" ||
    !aggregation.method ||
    !Number.isInteger(aggregation.judgeCount) ||
    aggregation.judgeCount < 1 ||
    !evaluations ||
    evaluations.length !== aggregation.judgeCount ||
    typeof scoringHash !== "string" ||
    !scoringHash
  ) {
    return null;
  }

  return stableDigest(JSON.stringify({
    generationBasisHash: row.basisHash,
    outputHash: stableDigest(row.outputText ?? ""),
    scoringHash,
    scoringVersion,
    aggregation: {
      method: aggregation.method,
      judgeCount: aggregation.judgeCount,
      evaluations,
      total: row.score.total
    }
  }));
}

export function upgradeBenchmarkRunBasis(run) {
  if (run?.kind !== "benchmark" || !Array.isArray(run.rows)) {
    throw new Error("Only independent benchmark run artifacts can receive benchmark basis metadata.");
  }

  const conditionsById = new Map((run.conditions ?? []).map((condition) => [condition.id, condition]));
  const scoringVersion = run.benchmark?.definition?.scoring?.version ?? run.scorerVersion;
  const judgeConfigurationId = run.judging?.judgeConfiguration?.id ?? "unknown-judge";
  const promptHash = run.judging?.promptHash ?? (typeof run.judging?.promptText === "string"
    ? stableDigest(run.judging.promptText)
    : null);
  const cohortHash = run.judging?.cohortHash ?? createCohortHash(run);
  const generationHash = run.benchmark?.generationHash ?? null;
  const scoringHash = run.benchmark?.scoringHash ?? null;
  const judgingBasisHash = run.judging?.basisHash ?? null;
  let rowLocalScoreBasisCount = 0;

  for (const row of run.rows) {
    const conditionHash = conditionsById.get(row.conditionId)?.hash ?? "unknown-condition";
    const harnessInstruction = resolveRowHarnessInstruction(run, row.configurationId);
    row.basisHash = generationHash
      ? stableDigest([
        generationHash,
        row.configurationId,
        row.caseId,
        run.generation?.trialCount,
        harnessInstruction,
        run.harnessVersion,
        conditionHash
      ].join(":"))
      : stableDigest([
        run.benchmark?.hash,
        row.configurationId,
        row.caseId,
        run.generation?.trialCount,
        harnessInstruction,
        scoringVersion,
        run.harnessVersion,
        conditionHash
      ].join(":"));
    const rowLocalScoreBasisHash = createBenchmarkRowScoreBasisHash({
      row,
      scoringHash,
      scoringVersion
    });
    if (rowLocalScoreBasisHash) {
      rowLocalScoreBasisCount += 1;
    }
    // Keep legacy migrations readable, but every score emitted by the fixed
    // panel aggregator takes the row-local path above.
    row.scoreBasisHash = rowLocalScoreBasisHash ?? (
      row.score && judgingBasisHash && scoringHash
        ? stableDigest([row.basisHash, scoringHash, judgingBasisHash].join(":"))
        : row.score && promptHash && cohortHash
          ? stableDigest([
            row.basisHash,
            judgeConfigurationId,
            scoringVersion,
            promptHash,
            cohortHash
          ].join(":"))
          : null
    );
  }

  run.judging = {
    ...run.judging,
    promptHash,
    cohortHash,
    cohortSize: Array.isArray(run.judging?.candidateOrder) && run.judging.candidateOrder.length > 0
      ? run.judging.candidateOrder.length
      : Number.isInteger(run.judging?.cohortSize)
        ? run.judging.cohortSize
        : run.rows.filter((row) => row.rowStatus === "complete").length,
    scoreBasisScope: rowLocalScoreBasisCount > 0 ? "row-local-panel-evidence-v1" : undefined
  };
  const usesRowLocalScoreBasis = rowLocalScoreBasisCount > 0;
  run.artifactMigrations = [
    ...(Array.isArray(run.artifactMigrations) ? run.artifactMigrations : []),
    {
      id: usesRowLocalScoreBasis
        ? "benchmark-basis-v4"
        : judgingBasisHash && scoringHash
          ? "benchmark-basis-v3"
          : "benchmark-basis-v2",
      note: usesRowLocalScoreBasis
        ? "Derived each score basis from that row's response, fixed scoring contract, and independent panel evaluations. Scores and outputs were not changed."
        : judgingBasisHash && scoringHash
          ? "Derived separate generation and panel-synthesis score bases from evidence already stored in this artifact. Scores and outputs were not changed."
        : "Derived condition, judge-prompt, and candidate-cohort basis hashes from evidence already stored in this artifact. Scores and outputs were not changed."
    }
  ].filter((migration, index, migrations) =>
    migrations.findIndex((candidate) => candidate.id === migration.id) === index
  );

  return run;
}
