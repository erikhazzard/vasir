import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildBenchmarkCatalogCategories,
  normalizeBenchmarkCatalogEntry,
  readBenchmarkCatalogRunRecords,
  readBenchmarkCapabilityTaxonomy,
  renderBenchmarkCatalogHtml,
  selectBenchmarkCatalogRuns,
  writeBenchmarkCatalog
} from "../cli/eval/benchmark-catalog.js";

const TREATMENT_ID = "skill:plan__question-spec-architecture";

function createRun({
  benchmarkId = "alpha-prompt",
  title = "Alpha prompt",
  prompt = "Design the alpha product.",
  runId = "2026-08-26T10-00-00Z__alpha",
  completedAt = "2026-08-26T10:00:00.000Z",
  complete = true,
  lift = 25,
  calibrationStatus = "author-calibration-pending"
} = {}) {
  const completedRows = complete ? 2 : 1;
  return {
    kind: "benchmark",
    schemaVersion: 2,
    benchmarkName: benchmarkId,
    benchmark: {
      id: benchmarkId,
      title,
      definition: {
        title,
        description: "A benchmark description.",
        cases: [{ id: "case", task: prompt }],
        scoring: {
          version: `${benchmarkId}-rubric-v1`,
          judgeInstructions: "Judge the result.",
          gates: [],
          dimensions: [{ id: "quality", title: "Quality", criterion: "Quality", weight: 100 }]
        }
      }
    },
    treatment: { id: TREATMENT_ID, label: "Vasir architecture skill", type: "skill" },
    conditions: [
      { id: "clean", label: "Clean", type: "clean" },
      { id: TREATMENT_ID, label: "Vasir architecture skill", type: "skill" }
    ],
    configurations: [{
      id: "codex:gpt-5.6-sol@ultra",
      provider: "codex",
      model: "gpt-5.6-sol",
      reasoning: "ultra"
    }],
    rows: [
      {
        rowKey: "clean",
        configurationId: "codex:gpt-5.6-sol@ultra",
        provider: "codex",
        model: "gpt-5.6-sol",
        reasoning: "ultra",
        caseId: "case",
        trialNumber: 1,
        conditionId: "clean",
        rowStatus: "complete",
        outputText: "Clean answer",
        score: { total: 50, gates: [], dimensions: [] }
      },
      {
        rowKey: "treatment",
        configurationId: "codex:gpt-5.6-sol@ultra",
        provider: "codex",
        model: "gpt-5.6-sol",
        reasoning: "ultra",
        caseId: "case",
        trialNumber: 1,
        conditionId: TREATMENT_ID,
        rowStatus: complete ? "complete" : "error",
        outputText: complete ? "Treatment answer" : "",
        score: complete ? { total: 50 + lift, gates: [], dimensions: [] } : null
      }
    ],
    pairs: complete ? [{
      configurationId: "codex:gpt-5.6-sol@ultra",
      caseId: "case",
      trialNumber: 1,
      cleanRowKey: "clean",
      treatmentRowKey: "treatment",
      cleanScore: 50,
      treatmentScore: 50 + lift,
      lift
    }] : [],
    judging: {
      status: complete ? "complete" : "incomplete",
      calibrationStatus,
      judgeConfiguration: { model: "gpt-5.6-sol", reasoning: "ultra" }
    },
    summary: {
      rowCounts: { expected: 2, complete: completedRows },
      averageLift: complete ? lift : null,
      bestConfigurationId: complete ? "codex:gpt-5.6-sol@ultra" : null
    },
    scorerVersion: `${benchmarkId}-rubric-v1`,
    runId,
    runStatus: complete ? "complete" : "incomplete",
    completedAt
  };
}

function writeRun(historyRootDirectory, benchmarkName, run) {
  const runDirectoryPath = path.join(historyRootDirectory, benchmarkName, run.runId);
  fs.mkdirSync(runDirectoryPath, { recursive: true });
  fs.writeFileSync(path.join(runDirectoryPath, "run.json"), `${JSON.stringify(run)}\n`);
  fs.writeFileSync(path.join(runDirectoryPath, "report.html"), "<!doctype html>");
}

test("catalog discovery ignores legacy artifacts and features complete evidence without hiding a newer partial attempt", (context) => {
  const historyRootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-catalog-"));
  context.after(() => fs.rmSync(historyRootDirectory, { recursive: true, force: true }));
  const completeRun = createRun();
  const partialRun = createRun({
    runId: "2026-08-26T11-00-00Z__alpha-partial",
    completedAt: "2026-08-26T11:00:00.000Z",
    complete: false
  });
  writeRun(historyRootDirectory, "alpha-prompt", completeRun);
  writeRun(historyRootDirectory, "alpha-prompt", partialRun);
  writeRun(historyRootDirectory, "beta-prompt", createRun({
    benchmarkId: "beta-prompt",
    title: "Beta prompt",
    runId: "2026-08-26T09-00-00Z__beta",
    completedAt: "2026-08-26T09:00:00.000Z"
  }));
  const legacyDirectory = path.join(historyRootDirectory, "legacy-skill", "legacy-run");
  fs.mkdirSync(legacyDirectory, { recursive: true });
  fs.writeFileSync(path.join(legacyDirectory, "run.json"), JSON.stringify({ kind: "skill", runId: "legacy-run" }));

  const records = readBenchmarkCatalogRunRecords({ historyRootDirectory });
  const selections = selectBenchmarkCatalogRuns(records);
  const alpha = normalizeBenchmarkCatalogEntry(
    selections.find((selection) => selection.benchmarkId === "alpha-prompt")
  );

  assert.equal(records.length, 3);
  assert.deepEqual(selections.map((selection) => selection.benchmarkId), ["alpha-prompt", "beta-prompt"]);
  assert.equal(alpha.featuredRunId, completeRun.runId);
  assert.equal(alpha.featuredStatus, "complete");
  assert.equal(alpha.latestAttempt.runId, partialRun.runId);
  assert.equal(alpha.latestAttempt.status, "incomplete");
  assert.equal(alpha.featuredHref, `./alpha-prompt/${completeRun.runId}/report.html`);
});

test("catalog renders a stable, self-contained capability index and escapes artifact content", () => {
  const entries = [
    normalizeBenchmarkCatalogEntry({
      benchmarkId: "zeta-prompt",
      featured: {
        benchmarkName: "zeta-prompt",
        run: createRun({
          benchmarkId: "zeta-prompt",
          title: '<img src=x onerror="alert(1)">',
          prompt: "</style><script>globalThis.pwned=true</script>",
          calibrationStatus: "uncalibrated"
        })
      },
      latest: {
        benchmarkName: "zeta-prompt",
        run: createRun({
          benchmarkId: "zeta-prompt",
          title: '<img src=x onerror="alert(1)">',
          prompt: "</style><script>globalThis.pwned=true</script>",
          calibrationStatus: "uncalibrated"
        })
      }
    }),
    normalizeBenchmarkCatalogEntry({
      benchmarkId: "alpha-prompt",
      featured: { benchmarkName: "alpha-prompt", run: createRun() },
      latest: { benchmarkName: "alpha-prompt", run: createRun() }
    })
  ];

  const html = renderBenchmarkCatalogHtml(entries);
  assert.ok(html.indexOf("Alpha prompt") < html.indexOf("&lt;img"));
  assert.match(html, /<h1 class="catalog-hero__title" id="catalog-title">VasirBench<\/h1>/);
  assert.match(html, /Frontier model benchmark/);
  assert.match(html, /Unmapped benchmarks/);
  assert.match(html, /Open full report/);
  assert.doesNotMatch(html, /Overall Vasir index/);
  assert.match(html, /font\/woff2;base64/);
  assert.doesNotMatch(html, /<script>globalThis\.pwned/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.doesNotMatch(html, /display:grid/);
});

function createCategoryTaxonomy(benchmarkIds) {
  return {
    schemaVersion: 3,
    version: "test-capabilities-v3",
    status: "development",
    categories: [{
      id: "backend-architecture",
      title: "Backend Architecture",
      description: "Tests lasting backend architecture.",
      benchmarkIds,
      modelScore: {
        edition: "backend-architecture-absolute-v1",
        method: "equal-benchmark-absolute-mean-v1",
        benchmarkWeighting: "equal",
        scaleMaximum: 100
      },
      effect: {
        method: "paired-absolute-delta-v1",
        benchmarkWeighting: "equal",
        unit: "rubric-points"
      },
      uncertainty: {
        status: "not-estimated",
        reason: "two-tasks-one-trial-per-condition"
      }
    }]
  };
}

function createCategoryEntry({
  benchmarkId,
  deltas,
  treatmentHash = "shared-treatment-hash",
  featuredStatus = "complete",
  calibrationStatus = "Pending"
}) {
  const record = deltas.reduce((result, delta) => {
    if (delta > 0) result.wins += 1;
    else if (delta < 0) result.losses += 1;
    else result.ties += 1;
    return result;
  }, { wins: 0, ties: 0, losses: 0 });
  return {
    benchmarkId,
    featuredRunId: `${benchmarkId}-run`,
    featuredStatus,
    calibrationStatus,
    matchedPairCount: deltas.length,
    expectedMatchedPairCount: deltas.length,
    expectedScoreCountPerCondition: 1,
    matchedOutcomes: deltas.map((delta) => ({ clean: 50, treatment: 50 + delta, delta })),
    configurationScores: [{
      configurationId: "codex:gpt-5.6-sol@ultra",
      modelId: "codex:gpt-5.6-sol",
      modelLabel: "GPT-5.6 Sol",
      configurationLabel: "GPT-5.6 Sol · ultra",
      provider: "codex",
      reasoningEffort: "ultra",
      cleanScore: 50,
      treatmentScore: 50 + (deltas.reduce((total, delta) => total + delta, 0) / deltas.length),
      cleanCount: 1,
      treatmentCount: 1
    }],
    record,
    treatment: {
      id: TREATMENT_ID,
      label: "Vasir architecture skill",
      hash: treatmentHash
    },
    compatibility: {
      harnessVersion: 2,
      trialCount: 1,
      configurationIds: ["codex:gpt-5.6-sol@ultra"],
      conditionContract: [
        { id: "clean", type: "clean", hash: "clean" },
        { id: TREATMENT_ID, type: "skill", hash: treatmentHash }
      ],
      judgingStrategy: "panel-synthesis-v2",
      panelConfigurationIds: ["codex:gpt-5.6-sol@ultra", "claude:opus@max"],
      synthesizerConfigurationId: "codex:gpt-5.6-sol@ultra",
      batchPlanVersion: "matched-groups-v1",
      judgingBasisHash: `${benchmarkId}-judge-basis`,
      generationHash: `${benchmarkId}-generation`,
      scoringHash: `${benchmarkId}-scoring`
    }
  };
}

const MODEL_CONFIGURATIONS = Object.freeze([
  { id: "model:a@max", modelId: "model:a", modelLabel: "Model A", configurationLabel: "Model A · max" },
  { id: "model:b@max", modelId: "model:b", modelLabel: "Model B", configurationLabel: "Model B · max" },
  { id: "model:c@max", modelId: "model:c", modelLabel: "Model C", configurationLabel: "Model C · max" }
]);

function createModelScoreEntry({
  benchmarkId,
  cleanScores,
  treatmentScores,
  configurations = MODEL_CONFIGURATIONS
}) {
  assert.equal(cleanScores.length, configurations.length);
  assert.equal(treatmentScores.length, configurations.length);
  const entry = createCategoryEntry({
    benchmarkId,
    deltas: cleanScores.map((score, index) => treatmentScores[index] - score)
  });
  const cleanMean = cleanScores.reduce((total, score) => total + score, 0) / cleanScores.length;
  const treatmentMean = treatmentScores.reduce((total, score) => total + score, 0) / treatmentScores.length;
  return {
    ...entry,
    title: benchmarkId,
    description: `Benchmark ${benchmarkId}`,
    prompt: `Solve ${benchmarkId}.`,
    featuredHref: `./${benchmarkId}/run/report.html`,
    completedRowCount: cleanScores.length * 2,
    expectedRowCount: cleanScores.length * 2,
    observedLift: treatmentMean - cleanMean,
    conditionScores: { clean: cleanMean, treatment: treatmentMean },
    latestAttempt: null,
    configurationScores: configurations.map((configuration, index) => ({
      ...configuration,
      configurationId: configuration.id,
      provider: "test",
      reasoningEffort: "max",
      cleanScore: cleanScores[index],
      treatmentScore: treatmentScores[index],
      lift: treatmentScores[index] - cleanScores[index],
      cleanCount: 1,
      treatmentCount: 1
    })),
    compatibility: {
      ...entry.compatibility,
      configurationIds: configurations.map((configuration) => configuration.id)
    }
  };
}

test("category aggregation retains matched outcomes without turning them into a relative rating", () => {
  const benchmarkIds = ["chat", "feed", "telemetry"];
  const categories = buildBenchmarkCatalogCategories([
    createCategoryEntry({ benchmarkId: "chat", deltas: [1, 1, 0, -1] }),
    createCategoryEntry({ benchmarkId: "feed", deltas: [1, 0, -1] }),
    createCategoryEntry({ benchmarkId: "telemetry", deltas: [1, 1, -1] })
  ], createCategoryTaxonomy(benchmarkIds));

  assert.equal(categories.length, 1);
  assert.deepEqual(categories[0].record, { wins: 5, ties: 2, losses: 3 });
  assert.equal(categories[0].matchedPairCount, 10);
  assert.equal(categories[0].modelScoreMethod, "equal-benchmark-absolute-mean-v1");
  assert.equal(categories[0].scoreEdition, "backend-architecture-absolute-v1");
  assert.equal(categories[0].effectMethod, "paired-absolute-delta-v1");
  assert.deepEqual(categories[0].uncertainty, {
    status: "not-estimated",
    reason: "two-tasks-one-trial-per-condition"
  });
  assert.equal("rating" in categories[0], false);
  assert.equal(categories[0].calibrationStatus, "Provisional");
});

test("absolute scoring withholds incompatible or missing evidence", () => {
  const taxonomy = createCategoryTaxonomy(["one", "two"]);
  const missing = buildBenchmarkCatalogCategories([
    createCategoryEntry({ benchmarkId: "one", deltas: [1] })
  ], taxonomy)[0];
  assert.deepEqual(missing.modelScores, []);
  assert.match(missing.problems.join(" "), /Missing mapped benchmarks/);

  const incompatible = buildBenchmarkCatalogCategories([
    createCategoryEntry({ benchmarkId: "one", deltas: [1] }),
    createCategoryEntry({ benchmarkId: "two", deltas: [1], treatmentHash: "different" })
  ], taxonomy)[0];
  assert.deepEqual(incompatible.modelScores, []);
  assert.match(incompatible.problems.join(" "), /treatment id and snapshot/);

  const incomplete = buildBenchmarkCatalogCategories([
    createCategoryEntry({ benchmarkId: "one", deltas: [1] }),
    createCategoryEntry({ benchmarkId: "two", deltas: [1], featuredStatus: "incomplete" })
  ], taxonomy)[0];
  assert.deepEqual(incomplete.modelScores, []);
  assert.match(incomplete.problems.join(" "), /Incomplete featured evidence/);
});

test("synthesis-free three-judge scoring is a complete comparison basis", () => {
  const entries = ["one", "two"].map((benchmarkId) => {
    const entry = createCategoryEntry({ benchmarkId, deltas: [5] });
    return {
      ...entry,
      compatibility: {
        ...entry.compatibility,
        judgingStrategy: "matched-pair-panel-median-v1",
        panelConfigurationIds: [
          "codex:gpt-5.6-sol@ultra",
          "codex:gpt-5.6-terra@ultra",
          "claude:opus@max"
        ],
        synthesizerConfigurationId: ""
      }
    };
  });
  const category = buildBenchmarkCatalogCategories(entries, createCategoryTaxonomy(["one", "two"]))[0];

  assert.deepEqual(category.modelScoreProblems, []);
  assert.equal(category.modelScores.length, 1);
  assert.equal(category.modelScores[0].baselineScore, 50);
  assert.equal(category.modelScores[0].skillScore, 55);
});

test("synthesis-free two-judge consensus is a complete comparison basis", () => {
  const entries = ["one", "two"].map((benchmarkId) => {
    const entry = createCategoryEntry({ benchmarkId, deltas: [5] });
    return {
      ...entry,
      compatibility: {
        ...entry.compatibility,
        judgingStrategy: "matched-pair-panel-consensus-v1",
        panelConfigurationIds: ["codex:gpt-6-astra@xhigh", "claude:claude-fable-5-1@max"],
        synthesizerConfigurationId: ""
      }
    };
  });
  const category = buildBenchmarkCatalogCategories(entries, createCategoryTaxonomy(["one", "two"]))[0];
  assert.deepEqual(category.modelScoreProblems, []);
  assert.equal(category.modelScores.length, 1);
  assert.equal(category.modelScores[0].baselineScore, 50);
  assert.equal(category.modelScores[0].skillScore, 55);
});

test("category model scores are equal-benchmark absolute means with paired uplift and secondary ranks", () => {
  const entries = [
    createModelScoreEntry({ benchmarkId: "one", cleanScores: [90, 80, 70], treatmentScores: [95, 85, 75] }),
    createModelScoreEntry({ benchmarkId: "two", cleanScores: [60, 80, 70], treatmentScores: [95, 85, 75] })
  ];
  const taxonomy = createCategoryTaxonomy(["one", "two"]);
  const category = buildBenchmarkCatalogCategories(entries, taxonomy)[0];

  assert.deepEqual(category.modelScoreProblems, []);
  const modelA = category.modelScores.find((score) => score.configurationId === "model:a@max");
  const modelB = category.modelScores.find((score) => score.configurationId === "model:b@max");
  assert.deepEqual({
    baseline: modelA.baselineScore,
    skill: modelA.skillScore,
    uplift: modelA.upliftPoints,
    baselineRank: modelA.baselineRank,
    skillRank: modelA.skillRank
  }, {
    baseline: 75,
    skill: 95,
    uplift: 20,
    baselineRank: 2,
    skillRank: 1
  });
  assert.deepEqual({
    baseline: modelB.baselineScore,
    skill: modelB.skillScore,
    uplift: modelB.upliftPoints,
    baselineRank: modelB.baselineRank,
    skillRank: modelB.skillRank
  }, {
    baseline: 80,
    skill: 85,
    uplift: 5,
    baselineRank: 1,
    skillRank: 2
  });
  assert.equal(category.modelScoreScaleMaximum, 100);
  assert.deepEqual(modelA.record, { wins: 2, ties: 0, losses: 0 });
  assert.equal(category.modelScoreMethod, "equal-benchmark-absolute-mean-v1");
  assert.equal(category.scoreEdition, "backend-architecture-absolute-v1");
  assert.equal(category.effectMethod, "paired-absolute-delta-v1");
  assert.equal("baselineScoreRaw" in modelA, false);
  assert.equal("skillScoreRaw" in modelA, false);
  assert.equal("upliftPointsRaw" in modelA, false);
  assert.equal(category.modelRuns.length, 6);
  assert.equal(category.modelRuns[0].rank, 1);
  assert.equal(category.modelRuns[0].conditionId, "treatment");
  assert.equal(category.modelRuns[0].score, 95);
  assert.equal(category.modelRuns[0].baselineScore, 75);
  assert.equal(category.modelRuns[0].skillScore, 95);
  assert.equal(category.modelRuns[0].upliftPoints, 20);

  const html = renderBenchmarkCatalogHtml(entries, { taxonomy });
  assert.match(html, /Backend Architecture leaderboard/);
  assert.match(html, /Model \/ reasoning \/ condition/);
  assert.match(html, /Benchmark score/);
  assert.match(html, /Score \/ 100/);
  assert.match(html, /catalog-score-line/);
  assert.match(html, /catalog-score-line__delta/);
  assert.match(html, /catalog-score-line__tick/);
  assert.match(html, /catalog-score-line__tick--midpoint/);
  assert.match(html, /catalog-score-line__tick--endcap/);
  assert.match(html, /catalog-score-line__locator/);
  assert.match(html, /catalog-score-axis__label/);
  assert.match(html, /catalog-score-line__marker--comparison/);
  assert.match(html, /matched without Vasir score/);
  assert.match(html, /Bright = ranked run/);
  assert.match(html, /Muted = matched condition/);
  assert.doesNotMatch(html, /catalog-score-line__measure/);
  assert.match(html, /With Vasir/);
  assert.match(html, /Without Vasir/);
  assert.match(html, /Best observed score/);
  assert.match(html, /Winner’s Vasir change/);
  assert.match(html, /Evidence depth/);
  assert.match(html, /95\.0/);
  assert.doesNotMatch(html, /\bSort\b/);
  assert.doesNotMatch(html, /catalog-rank-with/);
  assert.doesNotMatch(html, /catalog-rank-line/);
  assert.doesNotMatch(html, /Absolute rank/);
  assert.doesNotMatch(html, /catalog-leader/);
  assert.doesNotMatch(html, /What Vasir changed/);
  assert.doesNotMatch(html, /Show remaining/);
  assert.doesNotMatch(html, /benchmark index/i);
  assert.doesNotMatch(html, /catalog-score-track/);
  assert.doesNotMatch(html, /Overall Vasir index/);
  assert.doesNotMatch(html, /peer index/i);
});

test("appending a candidate cannot rewrite incumbent absolute scores or uplift", () => {
  const benchmarkInputs = [
    { benchmarkId: "one", cleanScores: [90, 80, 70], treatmentScores: [95, 85, 75] },
    { benchmarkId: "two", cleanScores: [60, 80, 70], treatmentScores: [95, 85, 75] }
  ];
  const taxonomy = createCategoryTaxonomy(["one", "two"]);
  const incumbentCategory = buildBenchmarkCatalogCategories(
    benchmarkInputs.map((input) => createModelScoreEntry(input)),
    taxonomy
  )[0];
  const appendedConfigurations = [
    ...MODEL_CONFIGURATIONS,
    { id: "model:d@max", modelId: "model:d", modelLabel: "Model D", configurationLabel: "Model D · max" }
  ];
  const appendedCategory = buildBenchmarkCatalogCategories(
    benchmarkInputs.map((input) => createModelScoreEntry({
      ...input,
      cleanScores: [...input.cleanScores, 100],
      treatmentScores: [...input.treatmentScores, 100],
      configurations: appendedConfigurations
    })),
    taxonomy
  )[0];
  const absoluteSnapshot = (category) => Object.fromEntries(category.modelScores
    .filter(({ configurationId }) => configurationId !== "model:d@max")
    .map(({ configurationId, baselineScore, skillScore, upliftPoints }) => [
      configurationId,
      { baselineScore, skillScore, upliftPoints }
    ]));

  assert.deepEqual(absoluteSnapshot(appendedCategory), absoluteSnapshot(incumbentCategory));
  assert.equal(
    incumbentCategory.modelScores.find(({ configurationId }) => configurationId === "model:a@max").skillRank,
    1
  );
  assert.equal(
    appendedCategory.modelScores.find(({ configurationId }) => configurationId === "model:a@max").skillRank,
    2
  );
});

test("checked-in capability taxonomy maps the development backend architecture category", () => {
  const taxonomy = readBenchmarkCapabilityTaxonomy();
  assert.equal(taxonomy.schemaVersion, 3);
  assert.equal(taxonomy.status, "development");
  assert.deepEqual(taxonomy.categories.map((category) => category.id), ["backend-architecture"]);
  assert.deepEqual(taxonomy.categories[0].benchmarkIds, [
    "hyper-scale-chat",
    "personalized-home-feed",
    "device-telemetry"
  ]);
  assert.deepEqual(taxonomy.categories[0].modelScore, {
    label: "Engineering v2",
    edition: "backend-architecture-panel-consensus-v2",
    method: "equal-benchmark-absolute-mean-v1",
    benchmarkWeighting: "equal",
    scaleMaximum: 100,
    judging: {
      panel: [
        "codex:gpt-6-astra@xhigh",
        "claude:claude-fable-5-1@max"
      ],
      judgeCount: 2,
      batchUnit: "matched-pair",
      aggregation: "unanimity-gates-mean-dimensions-v1",
      synthesizer: null
    }
  });
  assert.deepEqual(taxonomy.categories[0].effect, {
    method: "paired-absolute-delta-v1",
    benchmarkWeighting: "equal",
    unit: "rubric-points"
  });
  assert.deepEqual(taxonomy.categories[0].uncertainty, {
    status: "not-estimated",
    reason: "Only one trial per task and condition is published; per-response judge spread is retained."
  });
});

test("catalog writer derives index.html from run artifacts", (context) => {
  const historyRootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-catalog-write-"));
  context.after(() => fs.rmSync(historyRootDirectory, { recursive: true, force: true }));
  writeRun(historyRootDirectory, "alpha-prompt", createRun());

  const outputFilePath = writeBenchmarkCatalog({ historyRootDirectory });
  assert.equal(outputFilePath, path.join(historyRootDirectory, "index.html"));
  assert.match(fs.readFileSync(outputFilePath, "utf8"), /\.\/alpha-prompt\/2026-08-26T10-00-00Z__alpha\/report\.html/);
});
