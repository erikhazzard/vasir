import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  normalizeBenchmarkCatalogEntry,
  readBenchmarkCatalogRunRecords,
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
    schemaVersion: 1,
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

test("catalog renders a stable, self-contained prompt ledger and escapes artifact content", () => {
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
  assert.match(html, /No overall score yet\./);
  assert.match(html, /Prompt-local matched result/);
  assert.match(html, /font\/woff2;base64/);
  assert.doesNotMatch(html, /<script>globalThis\.pwned/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.doesNotMatch(html, /display:grid/);
});

test("catalog writer derives index.html from run artifacts", (context) => {
  const historyRootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-catalog-write-"));
  context.after(() => fs.rmSync(historyRootDirectory, { recursive: true, force: true }));
  writeRun(historyRootDirectory, "alpha-prompt", createRun());

  const outputFilePath = writeBenchmarkCatalog({ historyRootDirectory });
  assert.equal(outputFilePath, path.join(historyRootDirectory, "index.html"));
  assert.match(fs.readFileSync(outputFilePath, "utf8"), /\.\/alpha-prompt\/2026-08-26T10-00-00Z__alpha\/report\.html/);
});
