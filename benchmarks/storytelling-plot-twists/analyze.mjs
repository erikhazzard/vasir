import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { projectWritingRun } from "../../cli/eval/writing-publication.js";

const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const words = text => text?.trim() ? text.trim().split(/\s+/u).length : 0;
const hash = text => crypto.createHash("sha256").update(text).digest("hex");

export function pairedBootstrap(deltas, { seed = 20260907, resamples = 10000 } = {}) {
  if (deltas.length < 2) return null;
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const samples = Array.from({ length: resamples }, () => mean(deltas.map(() => deltas[Math.floor(random() * deltas.length)]))).sort((a, b) => a - b);
  const quantile = fraction => {
    const position = fraction * (samples.length - 1), lower = Math.floor(position);
    return samples[lower] + (samples[Math.ceil(position)] - samples[lower]) * (position - lower);
  };
  return { low: quantile(0.025), high: quantile(0.975), seed, resamples,
    interpretation: "Exploratory percentile interval over these complete repeated-generation trial pairs, not uncertainty over prompts, judges, or readers." };
}

export function analyzeTwistRun(run, { snapshot = null, sourceSha256 = null } = {}) {
  if (run.benchmarkName !== "storytelling-plot-twists") throw new Error("Wrong benchmark.");
  // The CLI requires this independent provenance/receipt validation. Unit
  // fixtures may exercise arithmetic alone, explicitly labeled below.
  if (snapshot) projectWritingRun({ run, snapshot, sourceSha256: sourceSha256 ?? hash(JSON.stringify(run)) });
  const definition = run.benchmark.definition;
  const dimensions = definition.scoring.dimensions;
  const panel = definition.judging.panel;
  if (dimensions.reduce((sum, item) => sum + item.weight, 0) !== 100 || panel.length !== 2) throw new Error("Unexpected scoring protocol.");
  const rowKeys = new Set(run.rows.map(row => row.rowKey));
  if (rowKeys.size !== run.rows.length) throw new Error("Duplicate row identity.");
  const slotKeys = new Set(run.rows.map(row => JSON.stringify([row.configurationId, row.caseId, row.trialNumber, row.conditionId])));
  if (slotKeys.size !== run.rows.length || run.rows.length !== run.configurations.length * definition.cases.length * run.generation.trialCount * 2) throw new Error("Incomplete or duplicate planned inventory.");
  for (const row of run.rows) {
    if (!run.configurations.some(configuration => configuration.id === row.configurationId) ||
      !definition.cases.some(entry => entry.id === row.caseId) || !Number.isInteger(row.trialNumber) ||
      row.trialNumber < 1 || row.trialNumber > run.generation.trialCount || !["clean", run.treatment.id].includes(row.conditionId)) throw new Error("Unplanned logical slot.");
  }
  const judgesByRow = new Map(run.rows.map(row => [row.rowKey, new Map()]));
  for (const judge of run.judging.judges ?? []) {
    const judgeId = judge.configuration?.id ?? judge.id;
    if (!panel.includes(judgeId)) throw new Error(`Unexpected judge identity: ${judgeId}`);
    for (const batch of judge.batches ?? []) {
      if (batch.status !== "complete") continue;
      for (const evaluation of batch.evaluations ?? []) {
        const target = judgesByRow.get(evaluation.rowKey);
        if (!target || target.has(judgeId)) throw new Error("Unknown or duplicate completed assessment.");
        const ratings = new Map(evaluation.dimensions.map(item => [item.id, item.rating]));
        if (ratings.size !== dimensions.length || evaluation.dimensions.length !== dimensions.length) throw new Error("Incomplete dimensions.");
        let score = 0;
        for (const dimension of dimensions) {
          const rating = ratings.get(dimension.id);
          if (!Number.isInteger(rating) || rating < 1 || rating > 10) throw new Error("Invalid individual rating.");
          score += dimension.weight * rating / 10;
        }
        if (!Number.isFinite(evaluation.total) || Math.abs(score - evaluation.total) > 1e-8) throw new Error("Saved assessment differs from independent weighted recomputation.");
        target.set(judgeId, { score, ratings: Object.fromEntries(ratings) });
      }
    }
  }
  const scoreRow = row => {
    if (!row || row.rowStatus !== "complete") return null;
    if (!row.outputText?.trim() || hash(row.outputText) !== row.outputHash) throw new Error("Completed answer digest mismatch.");
    const judges = judgesByRow.get(row.rowKey);
    if (judges.size !== panel.length) return null;
    return { score: mean([...judges.values()].map(item => item.score)), judges: Object.fromEntries(judges),
      dimensions: Object.fromEntries(dimensions.map(dimension => [dimension.id, mean([...judges.values()].map(item => item.ratings[dimension.id]))])),
      words: words(row.outputText), durationMs: row.durationMs ?? null };
  };
  const configurations = run.configurations.map(configuration => {
    const rows = run.rows.filter(row => row.configurationId === configuration.id);
    const trials = [];
    for (const caseDefinition of definition.cases) for (let trial = 1; trial <= run.generation.trialCount; trial += 1) {
      const selected = condition => rows.find(row => row.caseId === caseDefinition.id && row.trialNumber === trial && row.conditionId === condition);
      const baselineRow = selected("clean"), skillRow = selected(run.treatment.id);
      const baseline = scoreRow(baselineRow), skill = scoreRow(skillRow);
      trials.push({ caseId: caseDefinition.id, trial, baselineRowKey: baselineRow?.rowKey, skillRowKey: skillRow?.rowKey,
        baseline, skill, delta: baseline && skill ? skill.score - baseline.score : null });
    }
    const complete = trials.filter(trial => trial.delta !== null);
    const cohortComplete = complete.length === trials.length;
    const deltas = complete.map(trial => trial.delta);
    const conditionSummary = condition => ({
      score: mean(complete.map(trial => trial[condition].score)),
      words: mean(complete.map(trial => trial[condition].words)),
      durationMs: mean(complete.map(trial => trial[condition].durationMs).filter(Number.isFinite)),
      dimensions: Object.fromEntries(dimensions.map(dimension => [dimension.id, mean(complete.map(trial => trial[condition].dimensions[dimension.id]))]))
    });
    return { configurationId: configuration.id, expectedPairs: trials.length, completePairs: complete.length,
      cohortComplete, baseline: cohortComplete ? conditionSummary("baseline") : null, skill: cohortComplete ? conditionSummary("skill") : null,
      delta: cohortComplete ? mean(deltas) : null,
      availablePairDiagnostics: cohortComplete ? null : { label: "Incomplete available-pair diagnostics; not the declared-cohort effect or a comparable rank.",
        completePairs: complete.length, expectedPairs: trials.length, baseline: conditionSummary("baseline"), skill: conditionSummary("skill"), delta: mean(deltas) },
      wins: deltas.filter(delta => delta > 1e-8).length, ties: deltas.filter(delta => Math.abs(delta) <= 1e-8).length,
      losses: deltas.filter(delta => delta < -1e-8).length, bootstrap95: cohortComplete ? pairedBootstrap(deltas) : null,
      perJudgeDeltas: cohortComplete ? Object.fromEntries(panel.map(judgeId => [judgeId, mean(complete.map(trial => trial.skill.judges[judgeId].score - trial.baseline.judges[judgeId].score))])) : null,
      meanJudgeScoreSpread: mean(complete.flatMap(trial => ["baseline", "skill"].map(condition => Math.abs(trial[condition].judges[panel[0]].score - trial[condition].judges[panel[1]].score)))),
      trials };
  });
  return { benchmarkId: definition.id, runId: run.runId, manifestHash: run.storytelling.manifestHash,
    validation: snapshot ? "publication-source-provenance-and-runtime-validation-plus-independent-arithmetic" : "arithmetic-fixture-only-no-provenance-claim",
    benchmarkHash: run.benchmark.hash, skillHash: run.treatment.hash, panel, configurations,
    coverage: { expectedAnswers: run.rows.length, completeAnswers: run.rows.filter(row => row.rowStatus === "complete").length,
      expectedAssessments: run.rows.length * panel.length, completeAssessments: [...judgesByRow.values()].reduce((sum, judges) => sum + judges.size, 0),
      completePairs: configurations.reduce((sum, item) => sum + item.completePairs, 0) },
    failures: run.rows.filter(row => row.rowStatus !== "complete").map(row => ({ rowKey: row.rowKey, status: row.rowStatus, errorCode: row.error?.code ?? null })),
    limitations: definition.limitations };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length < 3 || process.argv.length > 4) throw new Error("Usage: node benchmarks/storytelling-plot-twists/analyze.mjs PATH_TO_RUN_JSON [NEW_REPORT_JSON]");
  const source = fs.readFileSync(path.resolve(process.argv[2]), "utf8");
  const snapshot = JSON.parse(fs.readFileSync(path.join(path.dirname(path.resolve(process.argv[2])), "skill-snapshot.json"), "utf8"));
  const report = { sourceSha256: hash(source), ...analyzeTwistRun(JSON.parse(source), { snapshot, sourceSha256: hash(source) }) };
  if (process.argv[3]) {
    const destination = path.resolve(process.argv[3]);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
    process.stdout.write(`${JSON.stringify({ outputPath: destination, sourceSha256: report.sourceSha256, coverage: report.coverage,
      configurations: report.configurations.map(({ trials, ...configuration }) => configuration) }, null, 2)}\n`);
  } else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
