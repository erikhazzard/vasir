import crypto from "node:crypto";

function stableDigest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
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

  for (const row of run.rows) {
    const conditionHash = conditionsById.get(row.conditionId)?.hash ?? "unknown-condition";
    row.basisHash = generationHash
      ? stableDigest([
        generationHash,
        row.configurationId,
        row.caseId,
        run.generation?.trialCount,
        run.generation?.neutralHarnessInstruction,
        run.harnessVersion,
        conditionHash
      ].join(":"))
      : stableDigest([
        run.benchmark?.hash,
        row.configurationId,
        row.caseId,
        run.generation?.trialCount,
        run.generation?.neutralHarnessInstruction,
        scoringVersion,
        run.harnessVersion,
        conditionHash
      ].join(":"));
    row.scoreBasisHash = row.score && judgingBasisHash && scoringHash
      ? stableDigest([row.basisHash, scoringHash, judgingBasisHash].join(":"))
      : row.score && promptHash && cohortHash
        ? stableDigest([
          row.basisHash,
          judgeConfigurationId,
          scoringVersion,
          promptHash,
          cohortHash
        ].join(":"))
        : null;
  }

  run.judging = {
    ...run.judging,
    promptHash,
    cohortHash,
    cohortSize: Array.isArray(run.judging?.candidateOrder)
      ? run.judging.candidateOrder.length
      : 0
  };
  run.artifactMigrations = [
    ...(Array.isArray(run.artifactMigrations) ? run.artifactMigrations : []),
    {
      id: judgingBasisHash && scoringHash ? "benchmark-basis-v3" : "benchmark-basis-v2",
      note: judgingBasisHash && scoringHash
        ? "Derived separate generation and panel-synthesis score bases from evidence already stored in this artifact. Scores and outputs were not changed."
        : "Derived condition, judge-prompt, and candidate-cohort basis hashes from evidence already stored in this artifact. Scores and outputs were not changed."
    }
  ].filter((migration, index, migrations) =>
    migrations.findIndex((candidate) => candidate.id === migration.id) === index
  );

  return run;
}
