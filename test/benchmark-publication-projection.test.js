import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import {
  buildBenchmarkPublicationProjection,
  validateBenchmarkPublicationProjection,
  validateBenchmarkPublicationResponses
} from "../cli/eval/benchmark-publication-projection.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_BENCHMARK_IDS = [
  "hyper-scale-chat",
  "personalized-home-feed",
  "device-telemetry"
];
const EXPECTED_JUDGE_PANEL = [
  "codex:gpt-6-astra@xhigh",
  "claude:claude-fable-5-1@max"
];
const NONSEMANTIC_JUDGE_NOTE_PATTERN = /[\u0000\u200B\u200C\u2063]/g;
const EXPECTED_FABLE_CONFIGURATION_IDS = [
  "claude:claude-fable-5-1@max",
  "claude:claude-fable-5-1@ultracode",
  "claude:claude-fable-5-1@xhigh"
];
const EXPECTED_ASTRA_CONFIGURATION_IDS = ["low", "medium", "high", "xhigh", "max", "ultra"]
  .map((reasoning) => `codex:gpt-6-astra@${reasoning}`);
const EXPECTED_CLAUDE_FAMILY_BY_MODEL_ID = Object.freeze({
  "claude:fable": "Claude Fable 5",
  "claude:claude-fable-5-1": "Claude Fable 5.1",
  "claude:opus": "Claude Opus 5"
});
const EXPECTED_COUNTS = {
  families: 1,
  tracks: 1,
  benchmarks: 3,
  categories: 1,
  conditions: 2,
  settings: 36,
  resultEntries: 72,
  responses: 216,
  developmentResultSets: 3,
  eligibleResultSets: 0,
  withheldResultSets: 0
};
const EXPECTED_RESPONSE_BUNDLE_COUNTS = {
  benchmarks: 3,
  settings: 36,
  conditions: 2,
  responses: 216,
  messageSets: 12,
  judgments: 432
};
const EXPECTED_ROUTES = {
  entrypoints: ["/", "/index.html", "/benchmark-report.html"],
  familyFragments: [
    "/#capabilities/overall",
    "/#capabilities/engineering"
  ],
  viewFragments: [
    "/#capabilities/overall/benchmarks",
    "/#capabilities/overall/efficiency",
    "/#capabilities/engineering/benchmarks",
    "/#capabilities/engineering/efficiency"
  ],
  reportFragments: EXPECTED_BENCHMARK_IDS.map((id) => `/benchmark-report.html#${id}`)
};

function createTemporaryRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const APPEND_LINEAGE_FIXTURE_RUN_PATHS = Object.freeze({
  "hyper-scale-chat": ".agents/vasir-evals/hyper-scale-chat/2026-09-01T23-13-14Z__extend__9db1c50db2c7/run.json",
  "personalized-home-feed": ".agents/vasir-evals/personalized-home-feed/2026-09-01T23-13-14Z__extend__6868e92c033a/run.json",
  "device-telemetry": ".agents/vasir-evals/device-telemetry/2026-09-01T23-13-14Z__extend__b9faa8878808/run.json"
});

function jsonSource(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256Source(source) {
  return crypto.createHash("sha256").update(source).digest("hex");
}

function judgeConfiguration(configurationId) {
  const [provider, modelAndReasoning] = configurationId.split(":");
  const separatorIndex = modelAndReasoning.lastIndexOf("@");
  const model = modelAndReasoning.slice(0, separatorIndex);
  const reasoning = modelAndReasoning.slice(separatorIndex + 1);
  return { id: configurationId, provider, model, reasoning };
}

function createAppendLineageFixture() {
  const sourceByRelativePath = new Map();
  const roots = new Map();
  const extensions = new Map();
  const panel = EXPECTED_JUDGE_PANEL.map(judgeConfiguration);

  for (const benchmarkId of EXPECTED_BENCHMARK_IDS) {
    const extensionPath = APPEND_LINEAGE_FIXTURE_RUN_PATHS[benchmarkId];
    const recordedExtension = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, extensionPath), "utf8"));
    const sourceRunId = recordedExtension.extension.sourceRunId;
    const sourcePath = `.agents/vasir-evals/${benchmarkId}/${sourceRunId}/run.json`;
    const recordedRoot = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, sourcePath), "utf8"));
    const definition = JSON.parse(fs.readFileSync(
      path.join(REPO_ROOT, "benchmarks", benchmarkId, "benchmark.json"),
      "utf8"
    ));
    // Reuse historical response shapes with synthetic current-edition judgments.
    // The immutable Engineering v1 artifacts are not republished or modified.
    const normalizeEngineeringV2Contract = (recordedRun) => {
      const run = structuredClone(recordedRun);
      run.benchmark = {
        ...run.benchmark,
        title: definition.title,
        description: definition.description,
        hash: sha256Source(JSON.stringify(definition)),
        scoringHash: sha256Source(JSON.stringify(definition.scoring)),
        definition: structuredClone(definition)
      };
      run.scorerVersion = definition.scoring.version;
      run.runStatus = "complete";
      run.judging = {
        ...run.judging,
        status: "complete",
        strategy: "matched-pair-panel-consensus-v1",
        judgeConfiguration: structuredClone(panel[0]),
        judgeConfigurations: structuredClone(panel),
        synthesizerConfiguration: null,
        calibrationStatus: "author-calibration-pending",
        batchPlan: {
          ...run.judging.batchPlan,
          version: "matched-pairs-v2"
        }
      };
      run.judging.judges = panel.map((configuration, judgeIndex) => {
        const reviewerId = `${run.runId}-reviewer-${judgeIndex + 1}`;
        return {
          status: "complete",
          configuration: structuredClone(configuration),
          reviewerId,
          evaluations: run.rows.map((row) => ({
            rowKey: row.rowKey,
            candidateId: row.score.candidateId,
            total: row.score.total,
            uncapped: row.score.uncapped,
            gateCap: row.score.gateCap,
            gates: structuredClone(row.score.gates),
            reason: `Independent assessment for ${row.rowKey}.`,
            evaluationHash: sha256Source(`${reviewerId}\u0000${row.rowKey}`)
          }))
        };
      });
      for (const row of run.rows) {
        const evaluations = run.judging.judges.map((judge) => {
          const evaluation = judge.evaluations.find((candidate) => candidate.rowKey === row.rowKey);
          return {
            reviewerId: judge.reviewerId,
            evaluationHash: evaluation.evaluationHash,
            total: evaluation.total
          };
        });
        row.score.aggregation = {
          ...row.score.aggregation,
          method: "unanimity-gates-mean-dimensions-v1",
          judgeCount: panel.length,
          evaluations,
          minScore: row.score.total,
          maxScore: row.score.total,
          spread: 0
        };
      }
      return run;
    };
    const root = normalizeEngineeringV2Contract(recordedRoot);
    const rescoreScope = {
      strategy: "saved-responses-full-rescore-v1",
      sourceRunId: `pre-engineering-v2-${benchmarkId}`,
      rowCount: root.rows.length,
      generationReused: true,
      sourceScoresPreserved: false
    };
    root.rescoreScope = rescoreScope;
    root.judging.rescoreScope = structuredClone(rescoreScope);

    const extension = normalizeEngineeringV2Contract(recordedExtension);
    delete extension.rescoreScope;
    delete extension.judging.rescoreScope;
    const rootConfigurationIds = new Set(root.configurations.map(({ id }) => id));
    const extendedConfigurationIds = extension.configurations
      .map(({ id }) => id)
      .filter((configurationId) => !rootConfigurationIds.has(configurationId));
    // Real extensions carry only new judgments; incumbent evidence stays in its source run.
    extension.rows = [
      ...structuredClone(root.rows),
      ...extension.rows.filter((row) => !rootConfigurationIds.has(row.configurationId))
    ];
    for (const judge of extension.judging.judges) {
      judge.evaluations = judge.evaluations.filter((evaluation) =>
        extension.rows.some((row) => (
          row.rowKey === evaluation.rowKey && !rootConfigurationIds.has(row.configurationId)
        ))
      );
    }
    const extensionScope = {
      strategy: "appended-rows-only-v1",
      sourceRunId: root.runId,
      sourceRowCount: root.rows.length,
      appendedRowCount: extension.rows.length - root.rows.length,
      combinedRowCount: extension.rows.length,
      sourceScoresPreserved: true,
      sourceJudgingStatus: root.judging.status,
      sourceJudgingBasisHash: root.judging.basisHash
    };
    extension.extension = {
      ...extension.extension,
      sourceRunId: root.runId,
      sourceRowCount: root.rows.length,
      extendedConfigurationIds,
      judgingScope: extensionScope
    };
    extension.judging.extensionScope = structuredClone(extensionScope);

    roots.set(benchmarkId, { path: sourcePath, run: root });
    extensions.set(benchmarkId, { path: extensionPath, run: extension });
    sourceByRelativePath.set(sourcePath, jsonSource(root));
    sourceByRelativePath.set(extensionPath, jsonSource(extension));
  }

  const readerFor = (selectedRuns) => {
    const manifest = {
      kind: "vasirbenchmark-public-results",
      schemaVersion: 1,
      selectedRuns: EXPECTED_BENCHMARK_IDS.map((benchmarkId) => {
        const selected = selectedRuns.get(benchmarkId);
        const source = sourceByRelativePath.get(selected.path);
        return {
          benchmarkId,
          runPath: selected.path,
          sha256: sha256Source(source)
        };
      })
    };
    return (filePath, encoding) => {
      const relativePath = path.relative(REPO_ROOT, filePath);
      if (relativePath === "benchmarks/public-results.json") return jsonSource(manifest);
      if (sourceByRelativePath.has(relativePath)) return sourceByRelativePath.get(relativePath);
      return fs.readFileSync(filePath, encoding);
    };
  };
  return { roots, extensions, sourceByRelativePath, readerFor };
}

test("selected immutable runs deterministically project the exact real development dataset", () => {
  const publicResults = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, "benchmarks", "public-results.json"),
    "utf8"
  ));
  const selectedRunsByBenchmarkId = new Map(publicResults.selectedRuns.map((selection) => [
    selection.benchmarkId,
    JSON.parse(fs.readFileSync(path.join(REPO_ROOT, selection.runPath), "utf8"))
  ]));
  const sourcePathsByBenchmarkId = new Map(EXPECTED_BENCHMARK_IDS.map((benchmarkId) => [
    benchmarkId,
    `.agents/vasir-evals/${benchmarkId}/${selectedRunsByBenchmarkId.get(benchmarkId).rescoreScope.sourceRunId}/run.json`
  ]));
  const sourceRunsByBenchmarkId = new Map([...sourcePathsByBenchmarkId].map(([benchmarkId, sourcePath]) => [
    benchmarkId,
    JSON.parse(fs.readFileSync(path.join(REPO_ROOT, sourcePath), "utf8"))
  ]));
  const reads = [];
  const first = buildBenchmarkPublicationProjection({
    repoRootDirectory: REPO_ROOT,
    readFileSyncImplementation(filePath, encoding) {
      reads.push(path.relative(REPO_ROOT, filePath));
      return fs.readFileSync(filePath, encoding);
    }
  });
  const second = buildBenchmarkPublicationProjection({ repoRootDirectory: REPO_ROOT });
  const workflow = first.projection.aiWorkflows;
  const games = first.projection.games;
  const writing = first.projection.writing;

  assert.match(first.basisSha256, /^[a-f0-9]{64}$/);
  assert.equal(first.basisSha256, second.basisSha256);
  assert.equal(first.dataSource, second.dataSource);
  assert.equal(first.responsesSource, second.responsesSource);
  assert.deepEqual(first.projection, second.projection);
  assert.deepEqual(first.responseBundle, second.responseBundle);
  assert.deepEqual(first.projection.counts, EXPECTED_COUNTS, "Engineering retains its complete family-local cohort");
  const expectedCounts = workflow ? { ...EXPECTED_COUNTS, families: games ? 3 : 2, tracks: games ? 3 : 2, benchmarks: games ? 5 : 4, categories: 2, resultEntries: 124, responses: 268, developmentResultSets: 4 } : { ...EXPECTED_COUNTS };
  if (writing) {
    const selectedWriting = first.writing;
    assert.deepEqual(writing.coverage, selectedWriting.coverage);
    assert.equal(first.projection.schemaVersion, 6);
    for (const field of ["families", "tracks", "benchmarks", "categories", "resultEntries", "developmentResultSets"]) {
      expectedCounts[field] += selectedWriting.counts[field];
    }
    expectedCounts.responses += selectedWriting.coverage.responseCount;
    expectedCounts.settings = new Set([
      ...first.projection.settings, ...(workflow?.settings ?? []), ...selectedWriting.settings
    ].map(setting => setting.configurationId)).size;
  }
  assert.deepEqual(first.counts, expectedCounts, "Global counts add the selected Writing snapshot without changing family-local evidence");
  const expectedRoutes = workflow ? { ...EXPECTED_ROUTES, familyFragments: [...EXPECTED_ROUTES.familyFragments, "/#capabilities/ai-workflows"], viewFragments: [...EXPECTED_ROUTES.viewFragments, "/#capabilities/ai-workflows/benchmarks", "/#capabilities/ai-workflows/efficiency"], reportFragments: [...EXPECTED_ROUTES.reportFragments, "/benchmark-report.html#work-spec-chat"] } : EXPECTED_ROUTES;
  assert.deepEqual(first.routes, {
    ...expectedRoutes,
    entrypoints: [...expectedRoutes.entrypoints, ...(games ? ["/games.html"] : [])],
    familyFragments: ["/#capabilities/overall", "/#capabilities/engineering", ...(games ? ["/#capabilities/games"] : []), ...(workflow ? ["/#capabilities/ai-workflows"] : []), ...(writing ? ["/#capabilities/writing/storytelling"] : [])],
    viewFragments: [...EXPECTED_ROUTES.viewFragments, ...(games ? ["/#capabilities/games/benchmarks", "/#capabilities/games/efficiency"] : []), ...(workflow ? ["/#capabilities/ai-workflows/benchmarks", "/#capabilities/ai-workflows/efficiency"] : []), ...(writing ? ["/#capabilities/writing/storytelling/benchmarks", "/#capabilities/writing/storytelling/efficiency"] : [])],
    reportFragments: [...expectedRoutes.reportFragments, ...(games ? ["/games.html?benchmark=2d-jumping-demo"] : []), ...(writing ? [`/benchmark-report.html#${writing.benchmarkId}`] : [])]
  });
  if (games) {
    assert.equal(games.runs.length, 10);
    assert.equal(games.configurations.length, 5);
    assert.equal(games.conditions.length, 2);
    assert.equal(games.reference, null, "The already-published reference is represented once in the artifact-quality row");
    const ultraConfiguration = games.configurations.find(configuration => configuration.reasoning === "ultra");
    assert.equal(ultraConfiguration.comparison.kind, "artifact-quality");
    assert.equal(ultraConfiguration.comparison.controlled, false, "The guided example is not a controlled skill-effect estimate");
    const guidedReference = games.runs.find(run => run.id === "ash-and-echo-r23");
    assert.equal(guidedReference.configurationId, ultraConfiguration.id);
    assert.equal(guidedReference.status, "reference");
    assert.match(guidedReference.provenance, /human (?:direction|directed)/i);
    assert.match(guidedReference.provenance, /not a fresh single-prompt trial/i);
    if (guidedReference.score !== null) assert.equal(guidedReference.judgments.length, 2, "The reference rating requires its own complete assessment panel");
    assert.ok(!first.responseBundle.responses.some(response => games.runs.some(run => run.id === response.id)), "Game artifacts do not become response-benchmark results");
  }
  assert.deepEqual({
    runs: first.projection.meta.runs,
    settings: first.projection.meta.settings,
    aggregateCells: first.projection.meta.aggregateCells
  }, {
    runs: 3,
    settings: 36,
    aggregateCells: 216
  });
  const engineeringReads = [
    "benchmarks/public-results.json",
    "benchmarks/capability-taxonomy.json",
    "benchmarks/hyper-scale-chat/benchmark.json",
    "benchmarks/personalized-home-feed/benchmark.json",
    "benchmarks/device-telemetry/benchmark.json",
    ...EXPECTED_BENCHMARK_IDS.map((benchmarkId) => (
      publicResults.selectedRuns.find((selection) => selection.benchmarkId === benchmarkId).runPath
    ))
  ];
  assert.deepEqual(reads.slice(0, engineeringReads.length), engineeringReads);
  if (workflow) {
    assert.equal(workflow.counts.settings, 26);
    assert.equal(workflow.counts.responses, 52);
    assert.equal(first.responseBundle.aiWorkflows.counts.judgments, 104);
    assert.ok(reads.includes(publicResults.workSpecRun.runPath));
    assert.ok(reads.includes("benchmarks/work-spec-chat/publication.json"));
  } else assert.equal(reads.length, engineeringReads.length);

  const { projection } = first;
  const { responseBundle } = first;
  assert.equal(responseBundle.kind, "vasirbenchmark-public-responses");
  assert.equal(responseBundle.schemaVersion, workflow ? 3 : 2);
  assert.deepEqual(responseBundle.counts, EXPECTED_RESPONSE_BUNDLE_COUNTS);
  assert.equal(responseBundle.responses.length, EXPECTED_COUNTS.responses);
  assert.ok(responseBundle.messageSets.length > 0);
  assert.ok(responseBundle.messageSets.length < responseBundle.responses.length);
  assert.deepEqual(
    responseBundle.messageSets.map(({ id }) => id),
    responseBundle.messageSets.map(({ id }) => id).sort((left, right) => left.localeCompare(right))
  );
  const responseIdentities = responseBundle.responses.map((response) => (
    `${response.benchmarkId}\u0000${response.settingId}\u0000${response.condition}`
  ));
  assert.equal(new Set(responseIdentities).size, EXPECTED_COUNTS.responses);
  assert.deepEqual(
    responseIdentities,
    [...responseIdentities].sort((left, right) => left.localeCompare(right))
  );
  const messageSetsById = new Map(responseBundle.messageSets.map(({ id, messages }) => [id, messages]));
  for (const benchmarkId of EXPECTED_BENCHMARK_IDS) {
    const selectedRun = selectedRunsByBenchmarkId.get(benchmarkId);
    const sourceRun = sourceRunsByBenchmarkId.get(benchmarkId);
    assert.equal(sourceRun.rows.length, 72);
    assert.equal(selectedRun.rows.length, 72);
    assert.deepEqual(selectedRun.rescoreScope, {
      strategy: "saved-responses-full-rescore-v1",
      sourceRunId: sourceRun.runId,
      rowCount: 72,
      generationReused: true,
      sourceScoresPreserved: false
    });
    assert.equal(selectedRun.judging.strategy, "matched-pair-panel-consensus-v1");
    assert.deepEqual(selectedRun.judging.judgeConfigurations.map(({ id }) => id), EXPECTED_JUDGE_PANEL);
    const selectedRowsByKey = new Map(selectedRun.rows.map((row) => [row.rowKey, row]));
    for (const sourceRow of sourceRun.rows) {
      const selectedRow = selectedRowsByKey.get(sourceRow.rowKey);
      for (const key of ["configurationId", "conditionId", "trialNumber", "exactMessages", "outputText", "durationMs", "usage"]) {
        assert.deepEqual(selectedRow[key], sourceRow[key], `${benchmarkId}/${sourceRow.rowKey}/${key}`);
      }
      assert.equal(selectedRow.score.aggregation.method, "unanimity-gates-mean-dimensions-v1");
      assert.equal(selectedRow.score.aggregation.judgeCount, 2);
    }
    assert.deepEqual(
      selectedRun.configurations.map(({ id }) => id).filter((id) => id.startsWith("codex:gpt-6-astra@"))
        .sort(),
      [...EXPECTED_ASTRA_CONFIGURATION_IDS].sort()
    );
    assert.equal(selectedRun.judging.judges.length, 2);
    assert.ok(selectedRun.judging.judges.every((judge) => judge.evaluations.length === 72));
  }
  for (const response of responseBundle.responses) {
    const rawConditionId = response.condition === "baseline"
      ? "clean"
      : "skill:plan__question-spec-architecture";
    const sourceRow = selectedRunsByBenchmarkId.get(response.benchmarkId).rows.find((row) => (
      row.configurationId === response.configurationId &&
      row.conditionId === rawConditionId &&
      row.trialNumber === response.trialNumber
    ));
    assert.ok(sourceRow, `${response.benchmarkId}/${response.configurationId}/${response.condition}`);
    assert.deepEqual(messageSetsById.get(response.messageSetId), sourceRow.exactMessages);
    assert.equal(response.outputText, sourceRow.outputText);
    assert.deepEqual(response.judgments, EXPECTED_JUDGE_PANEL.map((judgeConfigurationId) => {
      const judgeSourceRun = selectedRunsByBenchmarkId.get(response.benchmarkId);
      const sourceJudge = judgeSourceRun.judging.judges.find(
        (judge) => judge.configuration.id === judgeConfigurationId
      );
      const sourceEvaluation = sourceJudge.evaluations.find((evaluation) => evaluation.rowKey === sourceRow.rowKey);
      return {
        judgeConfigurationId,
        score: sourceEvaluation.total,
        rawScore: sourceEvaluation.uncapped,
        gateCap: sourceEvaluation.gateCap,
        failedGates: sourceEvaluation.gates
          .filter((gate) => gate.status === "fail")
          .map((gate) => gate.id),
        rationale: sourceEvaluation.reason.replace(NONSEMANTIC_JUDGE_NOTE_PATTERN, "")
      };
    }));
  }
  validateBenchmarkPublicationResponses(responseBundle, projection);
  assert.equal(projection.schemaVersion, writing ? 6 : games ? 5 : workflow ? 4 : 2);
  assert.deepEqual({
    label: projection.scoreBasis.label,
    edition: projection.scoreBasis.edition,
    method: projection.scoreBasis.method,
    unit: projection.scoreBasis.unit,
    range: projection.scoreBasis.range,
    benchmarkWeighting: projection.scoreBasis.benchmarkWeighting,
    benchmarkIds: projection.scoreBasis.benchmarkIds,
    taskCount: projection.scoreBasis.taskCount,
    trialsPerTask: projection.scoreBasis.trialsPerTask,
    judgeCount: projection.scoreBasis.judgeCount,
    judges: projection.scoreBasis.judges,
    aggregation: projection.scoreBasis.aggregation,
    batchUnit: projection.scoreBasis.batchUnit,
    effectMethod: projection.scoreBasis.effectMethod,
    effectUnit: projection.scoreBasis.effectUnit,
    calibrationStatus: projection.scoreBasis.calibrationStatus,
    uncertainty: projection.scoreBasis.uncertainty
  }, {
    label: "Engineering v2",
    edition: "backend-architecture-panel-consensus-v2",
    method: "equal-benchmark-absolute-mean-v1",
    unit: "rubric-points",
    range: { minimum: 0, maximum: 100 },
    benchmarkWeighting: "equal",
    benchmarkIds: EXPECTED_BENCHMARK_IDS,
    taskCount: 3,
    trialsPerTask: 1,
    judgeCount: 2,
    judges: EXPECTED_JUDGE_PANEL,
    aggregation: "unanimity-gates-mean-dimensions-v1",
    batchUnit: "matched-pair",
    effectMethod: "paired-absolute-delta-v1",
    effectUnit: "rubric-points",
    calibrationStatus: "development-uncalibrated",
    uncertainty: {
      status: "not-estimated",
      reason: "Only one trial per task and condition is published; per-response judge spread is retained."
    }
  });
  assert.match(projection.scoreBasis.id, /^backend-architecture-panel-consensus-v2:[a-f0-9]{64}$/);
  assert.deepEqual(projection.conditions.map(({ id, label }) => ({ id, label })), [
    { id: "baseline", label: "Minimal baseline" },
    { id: "skill", label: "Architecture skill" }
  ]);
  assert.deepEqual(projection.categories.map(({ id, name, weight }) => ({ id, name, weight })), [
    { id: "engineering", name: "Engineering", weight: 1 }
  ]);
  assert.deepEqual(projection.benchmarks.map(({ id }) => id), EXPECTED_BENCHMARK_IDS);
  assert.ok(projection.benchmarks.every((benchmark) => (
    benchmark.limitations.every((limitation) => !/development benchmark|uncontaminated holdout/i.test(limitation))
  )));
  assert.deepEqual(projection.availability.blockers.map(({ code }) => code), [
    "author-calibration-pending",
    "panel-audit-required",
    "public-eligibility-unverified"
  ]);
  assert.ok(projection.benchmarks.every((benchmark) => (
    benchmark.evidenceKind === "development" &&
    benchmark.resultAvailability.verification === "unverified" &&
    benchmark.detailHref === `benchmark-report.html#${benchmark.id}` &&
    benchmark.task.text.length > 0 &&
    JSON.stringify(benchmark.judging) === JSON.stringify({
      panel: EXPECTED_JUDGE_PANEL,
      synthesizer: null
    })
  )));
  assert.deepEqual(
    projection.benchmarkSummaries.map(({ benchmarkId }) => benchmarkId),
    EXPECTED_BENCHMARK_IDS
  );
  assert.ok(projection.benchmarkSummaries.every((summary) => (
    Number.isFinite(summary.baseline) &&
    Number.isFinite(summary.treatment) &&
    Number.isFinite(summary.delta) &&
    Math.abs(summary.delta - (summary.treatment - summary.baseline)) < 0.11 &&
    summary.wins + summary.ties + summary.losses === 36
  )));
  assert.deepEqual(
    projection.benchmarkSummaries.map((summary) => summary.judgingScope),
    EXPECTED_BENCHMARK_IDS.map(() => ({
      strategy: "saved-responses-full-rescore-v1",
      responseCount: 72,
      generationReused: true,
      sourceScoresPreserved: false
    }))
  );

  const skillEntries = projection.entries.filter(({ condition }) => condition === "skill");
  const leader = projection.categoryLeaders[0].entry;
  assert.equal(leader.condition, "skill");
  assert.equal(leader.rank, 1);
  assert.equal(leader.score, Math.max(...skillEntries.map(({ score }) => score)));
  assert.ok(Number.isFinite(leader.baselineScore));
  assert.ok(Number.isFinite(leader.delta));
  assert.ok(Number.isFinite(leader.latency));
  assert.ok(Number.isFinite(leader.tokens));
  assert.equal(leader.cost, null);
  assert.deepEqual(
    projection.regressions.map(({ id }) => id).sort(),
    skillEntries.filter(({ delta }) => delta < 0).map(({ id }) => id).sort()
  );
  assert.ok(projection.entries.every((entry) => entry.cost === null && entry.metrics.costUsd === null));
  assert.ok(projection.benchmarkResults.every((cell) => (
    cell.status === "development" &&
    cell.calibrated === false &&
    cell.costUsd === null &&
    Number.isFinite(cell.latencyMs) &&
    Number.isFinite(cell.outputTokens)
  )));

  const chatSkillCell = projection.benchmarkResults.find((cell) => (
    cell.benchmarkId === "hyper-scale-chat" &&
    cell.configurationId === "codex:gpt-5.6-sol@max" &&
    cell.condition === "skill"
  ));
  assert.equal(chatSkillCell.settingId, "codex-gpt-5-6-sol-max");
  assert.equal(chatSkillCell.category, "engineering");
  assert.ok(Number.isFinite(chatSkillCell.score));
  assert.equal(chatSkillCell.trials, 1);
  assert.equal(chatSkillCell.calibrated, false);
  assert.equal(chatSkillCell.status, "development");
  assert.equal(chatSkillCell.costUsd, null);

  const fableSettings = projection.settings
    .filter(({ configurationId }) => configurationId.startsWith("claude:claude-fable-5-1@"))
    .map(({ configurationId, family, label }) => ({ configurationId, family, label }))
    .sort((left, right) => left.configurationId.localeCompare(right.configurationId));
  assert.deepEqual(fableSettings, [
    {
      configurationId: "claude:claude-fable-5-1@max",
      family: "Claude Fable 5.1",
      label: "Claude Fable 5.1 · max"
    },
    {
      configurationId: "claude:claude-fable-5-1@ultracode",
      family: "Claude Fable 5.1",
      label: "Claude Fable 5.1 · ultracode"
    },
    {
      configurationId: "claude:claude-fable-5-1@xhigh",
      family: "Claude Fable 5.1",
      label: "Claude Fable 5.1 · xhigh"
    }
  ]);

  const claudeSettings = projection.settings.filter(({ configurationId }) => (
    configurationId.startsWith("claude:")
  ));
  assert.equal(claudeSettings.length, 13);
  for (const setting of claudeSettings) {
    const expectedFamily = EXPECTED_CLAUDE_FAMILY_BY_MODEL_ID[setting.modelId];
    assert.equal(setting.provider, "claude", setting.configurationId);
    assert.equal(setting.family, expectedFamily, setting.configurationId);
    assert.equal(setting.label, `${expectedFamily} · ${setting.reasoning}`, setting.configurationId);
  }

  const claudeEntries = projection.entries.filter(({ configurationId }) => (
    configurationId.startsWith("claude:")
  ));
  assert.equal(claudeEntries.length, 26);
  for (const entry of claudeEntries) {
    const expectedFamily = EXPECTED_CLAUDE_FAMILY_BY_MODEL_ID[entry.modelId];
    assert.equal(entry.provider, "claude", entry.id);
    assert.equal(entry.family, expectedFamily, entry.id);
    assert.equal(entry.label, `${expectedFamily} · ${entry.reasoning}`, entry.id);
  }

  const expectedFableCells = EXPECTED_FABLE_CONFIGURATION_IDS.flatMap((configurationId) => (
    EXPECTED_BENCHMARK_IDS.flatMap((benchmarkId) => (
      ["baseline", "skill"].map((condition) => `${configurationId}|${benchmarkId}|${condition}`)
    ))
  )).sort();
  const fableCells = projection.benchmarkResults.filter(({ configurationId }) => (
    configurationId.startsWith("claude:claude-fable-5-1@")
  ));
  assert.equal(fableCells.length, 18);
  assert.deepEqual(fableCells.map(({ configurationId, benchmarkId, condition }) => (
    `${configurationId}|${benchmarkId}|${condition}`
  )).sort(), expectedFableCells);
  const familyBySettingId = new Map(projection.settings.map(({ id, family }) => [id, family]));
  assert.ok(fableCells.every(({ settingId }) => familyBySettingId.get(settingId) === "Claude Fable 5.1"));
  assert.ok(projection.entries
    .filter(({ configurationId }) => configurationId.startsWith("claude:claude-fable-5-1@"))
    .every(({ family, label }) => family === "Claude Fable 5.1" && label.startsWith("Claude Fable 5.1 · ")));

  const fableAbsoluteScores = Object.fromEntries(projection.settings
    .filter(({ configurationId }) => configurationId.startsWith("claude:claude-fable-5-1@"))
    .map(({ configurationId, scores, deltas }) => [configurationId, {
      baseline: scores.baseline,
      skill: scores.skill,
      uplift: deltas.skill
    }]));
  assert.deepEqual(Object.keys(fableAbsoluteScores).sort(), [...EXPECTED_FABLE_CONFIGURATION_IDS].sort());
  assert.ok(Object.values(fableAbsoluteScores).every(({ baseline, skill, uplift }) => (
    Number.isFinite(baseline) &&
    Number.isFinite(skill) &&
    Number.isFinite(uplift) &&
    Math.abs(uplift - (skill - baseline)) < 0.11
  )));

  for (const setting of projection.settings) {
    const baselineEntry = projection.entries.find((entry) => (
      entry.configurationId === setting.configurationId && entry.condition === "baseline"
    ));
    const skillEntry = projection.entries.find((entry) => (
      entry.configurationId === setting.configurationId && entry.condition === "skill"
    ));
    assert.deepEqual({
      settingBaseline: setting.scores.baseline,
      baselineEntryScore: baselineEntry.score,
      baselineEntryReference: baselineEntry.baselineScore,
      settingSkill: setting.scores.skill,
      skillEntryScore: skillEntry.score,
      skillEntryReference: skillEntry.baselineScore,
      settingUplift: setting.deltas.skill,
      skillEntryUplift: skillEntry.delta,
      baselineEntryUplift: baselineEntry.delta
    }, {
      settingBaseline: setting.scores.baseline,
      baselineEntryScore: setting.scores.baseline,
      baselineEntryReference: setting.scores.baseline,
      settingSkill: setting.scores.skill,
      skillEntryScore: setting.scores.skill,
      skillEntryReference: setting.scores.baseline,
      settingUplift: setting.deltas.skill,
      skillEntryUplift: setting.deltas.skill,
      baselineEntryUplift: 0
    }, setting.configurationId);
  }

  assert.equal(
    fs.readFileSync(path.join(REPO_ROOT, "site", "vasirbenchmark.com", "data.js"), "utf8"),
    first.dataSource
  );
  assert.equal(
    fs.readFileSync(path.join(REPO_ROOT, "site", "vasirbenchmark.com", "responses.js"), "utf8"),
    first.responsesSource
  );
  assert.match(crypto.createHash("sha256").update(first.dataSource).digest("hex"), /^[a-f0-9]{64}$/);
  const sandbox = { window: {} };
  vm.runInNewContext(first.dataSource, sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.VASIR_DATA)), projection);
  vm.runInNewContext(first.responsesSource, sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.VASIR_RESPONSES)), responseBundle);
  assert.match(first.responsesSource, /window\.VASIR_RESPONSES/);
  assert.doesNotMatch(first.dataSource, /(?:^|[/\\])\.agents(?:[/\\]|$)|file:\/\//i);
  assert.doesNotMatch(first.dataSource, /\/Users\//);
  assert.doesNotMatch(first.dataSource, /\b(?:fake|illustrative|synthetic|simulated|fixture|mock)\b/i);
  assert.doesNotMatch(first.dataSource, /"(?:outputText|rationale|synthesisReason|exactMessages|promptFiles|runPath)"\s*:/);
  assert.doesNotMatch(first.responsesSource, /"(?:reviewerId|evaluationHash|promptText|runtimeReceipt|costUsd|usage)"\s*:/);
  assert.doesNotMatch(first.responsesSource, /(?:^|[/\\])\.agents(?:[/\\]|$)|file:\/\//i);
  assert.doesNotMatch(first.responsesSource, /\/Users\//);
  assert.doesNotMatch(first.dataSource, /peer index/i);
});

test("Engineering projection accepts lowercase users API routes and rejects literal private Mac homes", () => {
  const { projection } = buildBenchmarkPublicationProjection({ repoRootDirectory: REPO_ROOT });
  const allowed = structuredClone(projection);
  allowed.callouts.value = "The user routes are /users/me and /users/lookup?handle=friend.";
  assert.doesNotThrow(() => validateBenchmarkPublicationProjection(allowed));
  const privateHome = structuredClone(projection);
  privateHome.callouts.value = "Read /Users/private-user/code/work-spec.md.";
  assert.throws(() => validateBenchmarkPublicationProjection(privateHome), /private local path/);
});

test("an append-only Engineering v2 lineage projects without changing incumbent scores", () => {
  const fixture = createAppendLineageFixture();
  const rootBuild = buildBenchmarkPublicationProjection({
    repoRootDirectory: REPO_ROOT,
    readFileSyncImplementation: fixture.readerFor(fixture.roots)
  });
  const extensionBuild = buildBenchmarkPublicationProjection({
    repoRootDirectory: REPO_ROOT,
    readFileSyncImplementation: fixture.readerFor(fixture.extensions)
  });
  const rootProjection = rootBuild.projection;
  const extensionProjection = extensionBuild.projection;
  const incumbentConfigurationIds = fixture.roots.get(EXPECTED_BENCHMARK_IDS[0]).run.configurations
    .map(({ id }) => id);

  assert.equal(rootProjection.settings.length, 27);
  assert.equal(extensionProjection.settings.length, 30);
  assert.deepEqual(extensionProjection.benchmarkSummaries.map(({ judgingScope }) => judgingScope), [
    {
      strategy: "appended-rows-only-v1",
      incumbentResponseCount: 54,
      appendedResponseCount: 6,
      combinedResponseCount: 60,
      incumbentScoresPreserved: true
    },
    {
      strategy: "appended-rows-only-v1",
      incumbentResponseCount: 54,
      appendedResponseCount: 6,
      combinedResponseCount: 60,
      incumbentScoresPreserved: true
    },
    {
      strategy: "appended-rows-only-v1",
      incumbentResponseCount: 54,
      appendedResponseCount: 6,
      combinedResponseCount: 60,
      incumbentScoresPreserved: true
    }
  ]);
  for (const configurationId of incumbentConfigurationIds) {
    const rootSetting = rootProjection.settings.find((setting) => (
      setting.configurationId === configurationId
    ));
    const extensionSetting = extensionProjection.settings.find((setting) => (
      setting.configurationId === configurationId
    ));
    assert.deepEqual(extensionSetting.scores, rootSetting.scores, configurationId);
    assert.deepEqual(extensionSetting.deltas, rootSetting.deltas, configurationId);

    const incumbentCellValues = (projection) => projection.benchmarkResults
      .filter((cell) => cell.configurationId === configurationId)
      .map((cell) => ({
        benchmarkId: cell.benchmarkId,
        condition: cell.condition,
        score: cell.score,
        latencyMs: cell.latencyMs,
        inputTokens: cell.inputTokens,
        outputTokens: cell.outputTokens,
        totalTokens: cell.totalTokens
      }))
      .sort((left, right) => (
        left.benchmarkId.localeCompare(right.benchmarkId) ||
        left.condition.localeCompare(right.condition)
      ));
    assert.deepEqual(
      incumbentCellValues(extensionProjection),
      incumbentCellValues(rootProjection),
      configurationId
    );

    const incumbentResponses = (build) => {
      const messagesById = new Map(build.responseBundle.messageSets.map(({ id, messages }) => [id, messages]));
      return build.responseBundle.responses
        .filter((response) => response.configurationId === configurationId)
        .map((response) => ({
          ...response,
          messages: messagesById.get(response.messageSetId)
        }))
        .sort((left, right) => (
          left.benchmarkId.localeCompare(right.benchmarkId) ||
          left.condition.localeCompare(right.condition)
        ));
    };
    assert.deepEqual(
      incumbentResponses(extensionBuild),
      incumbentResponses(rootBuild),
      `${configurationId} response transcript`
    );
  }

  const selectedChat = fixture.extensions.get("hyper-scale-chat");
  const untamperedSource = fixture.sourceByRelativePath.get(selectedChat.path);
  for (const tamper of [
    (run) => { run.rows[0].score.total += 0.1; },
    (run) => { run.rows[0].scoreBasisHash = "0".repeat(64); }
  ]) {
    const tamperedRun = structuredClone(selectedChat.run);
    tamper(tamperedRun);
    fixture.sourceByRelativePath.set(selectedChat.path, jsonSource(tamperedRun));
    assert.throws(
      () => buildBenchmarkPublicationProjection({
        repoRootDirectory: REPO_ROOT,
        readFileSyncImplementation: fixture.readerFor(fixture.extensions)
      }),
      (error) => (
        error.code === "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE" &&
        error.context.reason === "incumbent-row-mismatch"
      )
    );
  }
  fixture.sourceByRelativePath.set(selectedChat.path, untamperedSource);

  const sourceChat = fixture.roots.get("hyper-scale-chat");
  const untamperedRoot = fixture.sourceByRelativePath.get(sourceChat.path);
  for (const [record, tamper, expectedMessage] of [
    [sourceChat, (run) => { run.judging.judges[0].evaluations.pop(); }, /does not cover every response/],
    [sourceChat, (run) => {
      run.judging.judges[0].evaluations[0].evaluationHash = "0".repeat(64);
    }, /does not match its scored response/],
    [selectedChat, (run) => { run.judging.judges[0].evaluations.pop(); }, /does not cover every response/]
  ]) {
    const tamperedRun = structuredClone(record.run);
    tamper(tamperedRun);
    fixture.sourceByRelativePath.set(record.path, jsonSource(tamperedRun));
    assert.throws(
      () => buildBenchmarkPublicationProjection({
        repoRootDirectory: REPO_ROOT,
        readFileSyncImplementation: fixture.readerFor(fixture.extensions)
      }),
      (error) => (
        error.code === "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE" &&
        expectedMessage.test(error.message)
      )
    );
    fixture.sourceByRelativePath.set(sourceChat.path, untamperedRoot);
    fixture.sourceByRelativePath.set(selectedChat.path, untamperedSource);
  }
});

test("Engineering v2 publication requires the declared panel and aggregation in the saved judgments", () => {
  const fixture = createAppendLineageFixture();
  const selectedChat = fixture.roots.get("hyper-scale-chat");
  for (const tamper of [
    (run) => { run.judging.strategy = "matched-pair-panel-median-v1"; },
    (run) => { run.judging.judgeConfigurations[0] = judgeConfiguration("codex:gpt-5.6-sol@ultra"); },
    (run) => { run.judging.synthesizerConfiguration = judgeConfiguration("claude:opus@max"); },
    (run) => { run.rows[0].score.aggregation.method = "majority-gates-median-dimensions-v1"; },
    (run) => { run.rows[0].score.aggregation.judgeCount = 3; }
  ]) {
    const tamperedRun = structuredClone(selectedChat.run);
    tamper(tamperedRun);
    fixture.sourceByRelativePath.set(selectedChat.path, jsonSource(tamperedRun));
    assert.throws(
      () => buildBenchmarkPublicationProjection({
        repoRootDirectory: REPO_ROOT,
        readFileSyncImplementation: fixture.readerFor(fixture.roots)
      }),
      (error) => error.code === "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE"
    );
  }
});

test("a selected run digest mismatch fails before the run can be parsed or projected", () => {
  const manifest = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, "benchmarks", "public-results.json"),
    "utf8"
  ));
  const selectedChat = manifest.selectedRuns.find(({ benchmarkId }) => benchmarkId === "hyper-scale-chat");
  const reads = [];
  assert.throws(
    () => buildBenchmarkPublicationProjection({
      repoRootDirectory: REPO_ROOT,
      readFileSyncImplementation(filePath, encoding) {
        const relativePath = path.relative(REPO_ROOT, filePath);
        reads.push(relativePath);
        const contents = fs.readFileSync(filePath, encoding);
        return relativePath === selectedChat.runPath
          ? `${contents}\n`
          : contents;
      }
    }),
    (error) => {
      assert.equal(error.code, "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE");
      assert.match(error.message, /changed after review/);
      assert.equal(error.context.benchmarkId, "hyper-scale-chat");
      assert.equal(error.context.expectedSha256, selectedChat.sha256);
      assert.match(error.context.observedSha256, /^[a-f0-9]{64}$/);
      assert.equal(error.context.safeRetry, false);
      return true;
    }
  );
  assert.equal(reads.at(-1), selectedChat.runPath);
  assert.equal(reads.filter((filePath) => filePath.includes("/run.json")).length, 1);
});

test("response bundle validation rejects message, matrix, and schema drift", () => {
  const { projection, responseBundle } = buildBenchmarkPublicationProjection({ repoRootDirectory: REPO_ROOT });

  const changedMessages = structuredClone(responseBundle);
  changedMessages.messageSets[0].messages[0].content += " changed";
  assert.throws(
    () => validateBenchmarkPublicationResponses(changedMessages, projection),
    (error) => /message-set content does not match its identity/.test(error.message)
  );

  const missingResponse = structuredClone(responseBundle);
  missingResponse.responses.pop();
  assert.throws(
    () => validateBenchmarkPublicationResponses(missingResponse, projection),
    (error) => /complete benchmark response matrix/.test(error.message)
  );

  const extraRawField = structuredClone(responseBundle);
  extraRawField.responses[0].runtimeReceipt = { provider: "private" };
  assert.throws(
    () => validateBenchmarkPublicationResponses(extraRawField, projection),
    (error) => /unsupported or missing fields/.test(error.message)
  );

  const missingJudgment = structuredClone(responseBundle);
  missingJudgment.responses[0].judgments.pop();
  assert.throws(
    () => validateBenchmarkPublicationResponses(missingJudgment, projection),
    (error) => /do not preserve the fixed panel/.test(error.message)
  );

  const reorderedJudgments = structuredClone(responseBundle);
  reorderedJudgments.responses[0].judgments.reverse();
  assert.throws(
    () => validateBenchmarkPublicationResponses(reorderedJudgments, projection),
    (error) => /do not preserve the fixed panel/.test(error.message)
  );

  const leakedJudgmentField = structuredClone(responseBundle);
  leakedJudgmentField.responses[0].judgments[0].reviewerId = "private-reviewer";
  assert.throws(
    () => validateBenchmarkPublicationResponses(leakedJudgmentField, projection),
    (error) => /unsupported or missing fields/.test(error.message)
  );

  const leakedJudgmentPath = structuredClone(responseBundle);
  leakedJudgmentPath.responses[0].judgments[0].rationale = "Read /Users/private/source.txt.";
  assert.throws(
    () => validateBenchmarkPublicationResponses(leakedJudgmentPath, projection),
    (error) => /private local path/.test(error.message)
  );

  const changedCount = structuredClone(responseBundle);
  changedCount.counts.responses -= 1;
  assert.throws(
    () => validateBenchmarkPublicationResponses(changedCount, projection),
    (error) => /counts\.responses does not match the published response matrix/.test(error.message)
  );

  const changedJudgmentCount = structuredClone(responseBundle);
  changedJudgmentCount.counts.judgments -= 1;
  assert.throws(
    () => validateBenchmarkPublicationResponses(changedJudgmentCount, projection),
    (error) => /counts\.judgments does not match the published response matrix/.test(error.message)
  );
});

test("selected evidence must match the current public benchmark definition exactly", () => {
  assert.throws(
    () => buildBenchmarkPublicationProjection({
      repoRootDirectory: REPO_ROOT,
      readFileSyncImplementation(filePath, encoding) {
        const contents = fs.readFileSync(filePath, encoding);
        if (path.relative(REPO_ROOT, filePath) !== "benchmarks/hyper-scale-chat/benchmark.json") return contents;
        const definition = JSON.parse(contents);
        definition.description = `${definition.description} changed`;
        return `${JSON.stringify(definition)}\n`;
      }
    }),
    (error) => (
      error.code === "BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE" &&
      /different benchmark definition/.test(error.message) &&
      error.context.benchmarkId === "hyper-scale-chat"
    )
  );
});

test("promotion intent cannot smuggle hand-authored values or select outside immutable history", () => {
  const temporaryRoot = createTemporaryRoot("vasirbenchmark-public-fields-");
  try {
    writeJson(path.join(temporaryRoot, "benchmarks", "public-results.json"), {
      kind: "vasirbenchmark-public-results",
      schemaVersion: 1,
      selectedRuns: [],
      scores: []
    });
    assert.throws(
      () => buildBenchmarkPublicationProjection({ repoRootDirectory: temporaryRoot }),
      (error) => error.code === "BENCHMARK_PUBLISH_PROJECTION_INVALID" && /unsupported or missing fields/.test(error.message)
    );

    writeJson(path.join(temporaryRoot, "benchmarks", "public-results.json"), {
      kind: "vasirbenchmark-public-results",
      schemaVersion: 1,
      selectedRuns: EXPECTED_BENCHMARK_IDS.map((benchmarkId) => ({
        benchmarkId,
        runPath: benchmarkId === "hyper-scale-chat"
          ? `.agents/vasir-evals/${benchmarkId}/../private/run.json`
          : `.agents/vasir-evals/${benchmarkId}/run-1/run.json`,
        sha256: "a".repeat(64)
      }))
    });
    assert.throws(
      () => buildBenchmarkPublicationProjection({ repoRootDirectory: temporaryRoot }),
      (error) => error.code === "BENCHMARK_PUBLISH_PROJECTION_INVALID" && /outside the standard immutable benchmark history root/.test(error.message)
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("projection validation rejects raw outputs, private paths, fake-data language, invalid scores, cost claims, and unversioned Claude identities", () => {
  const { projection } = buildBenchmarkPublicationProjection({ repoRootDirectory: REPO_ROOT });

  const withRelativeScoreBasis = structuredClone(projection);
  withRelativeScoreBasis.scoreBasis.method = "equal-benchmark-peer-index-v1";
  assert.throws(
    () => validateBenchmarkPublicationProjection(withRelativeScoreBasis),
    (error) => error.code === "BENCHMARK_PUBLISH_PROJECTION_INVALID" && /Engineering v2/.test(error.message)
  );

  const withRawOutput = structuredClone(projection);
  withRawOutput.results[0].configurations[0].outputText = "private response";
  assert.throws(
    () => validateBenchmarkPublicationProjection(withRawOutput),
    (error) => error.code === "BENCHMARK_PUBLISH_PROJECTION_INVALID" && /forbidden raw evidence/.test(error.message)
  );

  for (const privatePath of [
    ".agents/vasir-evals/hyper-scale-chat/run.json",
    "../private/run.json",
    "C:/private/run.json",
    "C:\\private\\run.json"
  ]) {
    const withPrivatePath = structuredClone(projection);
    withPrivatePath.benchmarks[0].description = privatePath;
    assert.throws(
      () => validateBenchmarkPublicationProjection(withPrivatePath),
      (error) => error.code === "BENCHMARK_PUBLISH_PROJECTION_INVALID" && /private local path/.test(error.message),
      privatePath
    );
  }

  const withFakeLanguage = structuredClone(projection);
  withFakeLanguage.benchmarks[0].description = "Fake preview";
  assert.throws(
    () => validateBenchmarkPublicationProjection(withFakeLanguage),
    (error) => error.code === "BENCHMARK_PUBLISH_PROJECTION_INVALID" && /retired fake-data language/.test(error.message)
  );

  const withInvalidScore = structuredClone(projection);
  withInvalidScore.entries[0].score = 101;
  assert.throws(
    () => validateBenchmarkPublicationProjection(withInvalidScore),
    (error) => error.code === "BENCHMARK_PUBLISH_PROJECTION_INVALID" && /finite score from 0 to 100/.test(error.message)
  );

  const withCostClaim = structuredClone(projection);
  withCostClaim.entries[0].metrics.costUsd = 0.01;
  assert.throws(
    () => validateBenchmarkPublicationProjection(withCostClaim),
    (error) => error.code === "BENCHMARK_PUBLISH_PROJECTION_INVALID" && /explicit unavailable cost/.test(error.message)
  );

  const withUnversionedClaude = structuredClone(projection);
  const fableSetting = withUnversionedClaude.settings.find(({ modelId }) => modelId === "claude:fable");
  fableSetting.provider = "anthropic";
  fableSetting.family = "Fable";
  fableSetting.label = `Fable · ${fableSetting.reasoning}`;
  assert.throws(
    () => validateBenchmarkPublicationProjection(withUnversionedClaude),
    (error) => error.code === "BENCHMARK_PUBLISH_PROJECTION_INVALID" && /release number/.test(error.message)
  );
});
