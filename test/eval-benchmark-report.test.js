import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  normalizeBenchmarkReportData,
  renderBenchmarkReportHtml,
  writeBenchmarkReport
} from "../cli/eval/benchmark-report.js";

function createRunFixture({ maliciousOutput = false } = {}) {
  const treatmentId = "skill:plan__question-spec-architecture";
  return {
    kind: "benchmark",
    schemaVersion: 1,
    benchmarkName: "hyper-scale-chat",
    benchmark: {
      id: "hyper-scale-chat",
      title: "Hyper-scale chat architecture",
      definition: {
        cases: [{
          id: "chat-10m",
          prompt: "Architect a chat app infrastructure that supports 10 million concurrent users."
        }],
        scoring: {
          judgeInstructions: "Reward a small, horizontally scalable shape and penalize unforced topology.",
          gates: [{
            id: "lasting-shape",
            criterion: "The day-one topology reaches the scale target by adding partitions and replicas.",
            failureCap: 49
          }],
          dimensions: [{
            id: "shape",
            title: "Lasting architecture shape",
            criterion: "How directly the topology scales without replacement.",
            weight: 100
          }]
        }
      }
    },
    treatment: {
      id: treatmentId,
      label: "Vasir architecture skill",
      type: "skill"
    },
    conditions: [
      { id: "clean", label: "Clean", type: "clean" },
      { id: treatmentId, label: "Vasir architecture skill", type: "treatment" }
    ],
    configurations: [{
      id: "openai:gpt-5.6-sol@max",
      provider: "openai",
      model: "gpt-5.6-sol",
      reasoning: "max"
    }],
    generation: { trialCount: 1, concurrency: 2 },
    rows: [
      {
        rowKey: "clean-row",
        configurationId: "openai:gpt-5.6-sol@max",
        modelId: "gpt-5.6-sol",
        provider: "openai",
        model: "gpt-5.6-sol",
        reasoning: "max",
        caseId: "chat-10m",
        trialNumber: 1,
        conditionId: "clean",
        rowStatus: "scored",
        outputText: maliciousOutput
          ? "</script><script>globalThis.__BENCHMARK_XSS__ = true</script><img src=x onerror=alert(1)>"
          : "Use a websocket gateway, queue, and several projection services.",
        usage: { inputTokens: 80, outputTokens: 100, totalTokens: 180 },
        costUsd: 0.014,
        durationMs: 1_800,
        score: {
          total: 58,
          gates: [{ id: "lasting-shape", status: "fail", failureCap: 49, reason: "A later topology rewrite is implied." }],
          dimensions: [{ id: "shape", title: "Lasting architecture shape", rating: 2, earned: 50, weight: 100, reason: "The ownership rule is incomplete." }],
          reason: "The answer adds failure planes before proving they are needed."
        }
      },
      {
        rowKey: "treatment-row",
        configurationId: "openai:gpt-5.6-sol@max",
        modelId: "gpt-5.6-sol",
        provider: "openai",
        model: "gpt-5.6-sol",
        reasoning: "max",
        caseId: "chat-10m",
        trialNumber: 1,
        conditionId: treatmentId,
        rowStatus: "scored",
        outputText: "Use stateless GET polling over a partitioned Valkey event log.",
        usage: { inputTokens: 120, outputTokens: 70, totalTokens: 190 },
        costUsd: 0.011,
        durationMs: 1_250,
        score: {
          total: 92,
          gates: [{ id: "lasting-shape", status: "pass", failureCap: 49, reason: "Partitions and replicas preserve the shape." }],
          dimensions: [{ id: "shape", title: "Lasting architecture shape", rating: 4, earned: 100, weight: 100, reason: "The ownership and scale functions are explicit." }],
          reason: "The answer preserves horizontal scale with a much smaller failure surface."
        }
      }
    ],
    pairs: [{
      configurationId: "openai:gpt-5.6-sol@max",
      caseId: "chat-10m",
      trialNumber: 1,
      cleanRowKey: "clean-row",
      treatmentRowKey: "treatment-row",
      cleanScore: 58,
      treatmentScore: 92,
      lift: 34
    }],
    judging: {
      status: "complete",
      judgeConfiguration: { model: "gpt-5.6-sol", reasoning: "max" },
      freshContext: true,
      calibrationStatus: "uncalibrated",
      candidateOrder: [
        { candidateId: "Candidate-001", rowKey: "treatment-row" },
        { candidateId: "Candidate-002", rowKey: "clean-row" }
      ],
      comparativeNote: "Candidate-001 has a smaller failure surface than Candidate-002."
    },
    summary: {
      matchedPairCount: 1,
      averageLift: 34,
      bestConfigurationId: "openai:gpt-5.6-sol@max"
    },
    runId: "20260825T120000Z-hyper-scale-chat",
    runStatus: "complete",
    completedAt: "2026-08-25T12:00:00.000Z"
  };
}

function createPanelRunFixture({ maliciousJudgeOutput = false } = {}) {
  const run = createRunFixture();
  const candidateOrder = run.judging.candidateOrder;
  run.rows[0].score.selectedReviewerId = "reviewer-001";
  run.rows[0].score.synthesisReason = "Opus applied the failure gate more faithfully.";
  run.rows[1].score.selectedReviewerId = "reviewer-002";
  run.rows[1].score.synthesisReason = "Sol preserved the stronger complete evaluation.";
  run.judging = {
    status: "complete",
    strategy: "panel-synthesis-v1",
    freshContext: true,
    blinded: true,
    calibrationStatus: "author-calibration-pending",
    cohortHash: "a".repeat(64),
    cohortSize: 2,
    candidateOrder,
    panelPromptHash: "b".repeat(64),
    basisHash: "c".repeat(64),
    judgeConfigurations: [
      { id: "claude:opus@max", provider: "claude", model: "opus", reasoning: "max" },
      { id: "codex:gpt-5.6-sol@ultra", provider: "codex", model: "gpt-5.6-sol", reasoning: "ultra" }
    ],
    synthesizerConfiguration: {
      id: "codex:gpt-5.6-sol@ultra",
      provider: "codex",
      model: "gpt-5.6-sol",
      reasoning: "ultra"
    },
    judges: [
      {
        reviewerId: "reviewer-001",
        configuration: { id: "claude:opus@max", provider: "claude", model: "opus", reasoning: "max" },
        status: "complete",
        promptHash: "b".repeat(64),
        comparativeNote: "Candidate-001 is stronger than Candidate-002.",
        outputText: maliciousJudgeOutput
          ? "</script><script>globalThis.__JUDGE_XSS__ = true</script>"
          : "Exact Opus judgment."
      },
      {
        reviewerId: "reviewer-002",
        configuration: { id: "codex:gpt-5.6-sol@ultra", provider: "codex", model: "gpt-5.6-sol", reasoning: "ultra" },
        status: "complete",
        promptHash: "b".repeat(64),
        comparativeNote: "Candidate-002 misses the lasting shape.",
        outputText: "Exact Sol judgment."
      }
    ],
    disagreement: {
      candidateCount: 2,
      candidatesWithDisagreement: 1,
      maxScoreSpread: 18,
      candidates: []
    },
    synthesis: {
      configuration: {
        id: "codex:gpt-5.6-sol@ultra",
        provider: "codex",
        model: "gpt-5.6-sol",
        reasoning: "ultra"
      },
      status: "complete",
      promptHash: "d".repeat(64),
      comparativeNote: "Candidate-001 wins after resolving the panel disagreement.",
      outputText: "Exact synthesis judgment.",
      sourceReviewerIds: ["reviewer-001", "reviewer-002"],
      selections: [
        { candidateId: "Candidate-002", rowKey: "clean-row", reviewerId: "reviewer-001", reason: "Opus applied the failure gate more faithfully.", score: 58 },
        { candidateId: "Candidate-001", rowKey: "treatment-row", reviewerId: "reviewer-002", reason: "Sol preserved the stronger complete evaluation.", score: 92 }
      ]
    }
  };
  return run;
}

test("normalizes the benchmark runner contract into matched report evidence", () => {
  const report = normalizeBenchmarkReportData(createRunFixture());

  assert.equal(report.treatment.label, "Vasir architecture skill");
  assert.equal(report.rows[0].configurationLabel, "GPT-5.6 Sol · max");
  assert.equal(report.rows[1].conditionLabel, "Vasir architecture skill");
  assert.equal(report.rows[1].score, 92);
  assert.equal(report.rows[1].rationale, "The answer preserves horizontal scale with a much smaller failure surface.");
  assert.equal(report.rows[1].criteria[0].label, "Lasting Shape");
  assert.equal(report.rows[1].criteria[0].type, "gate");
  assert.equal(report.rows[1].criteria[0].status, "pass");
  assert.equal(report.rows[1].criteria[1].label, "Lasting architecture shape");
  assert.equal(report.rows[1].criteria[1].score, 100);
  assert.equal(report.observedLift, 34);
  assert.equal(report.bestConfiguration.score, 92);
  assert.equal(report.judge.model, "gpt-5.6-sol");
  assert.equal(report.judge.reasoningEffort, "max");
  assert.equal(
    report.judge.summary,
    "GPT-5.6 Sol · max · Vasir architecture skill has a smaller failure surface than GPT-5.6 Sol · max · Clean."
  );
  assert.equal(report.rubric.summary, "Reward a small, horizontally scalable shape and penalize unforced topology.");
  assert.equal(report.rubric.criteria[0].label, "Required gate: lasting shape");
  assert.match(report.rubric.criteria[0].rationale, /Failure caps the total score at 49\./);
});

test("renders a self-contained accessible D3 report without executable response injection", () => {
  const html = renderBenchmarkReportHtml(createRunFixture({ maliciousOutput: true }));

  assert.match(html, /^<!doctype html>/);
  assert.match(html, /https:\/\/d3js\.org v7\.9\.0/);
  assert.match(html, /id="benchmark-ranking-chart"/);
  assert.match(html, /id="benchmark-lift-chart"/);
  assert.match(html, /id="benchmark-trials-chart"/);
  assert.match(html, /id="benchmark-answer-model-1"/);
  assert.match(html, /id="benchmark-answer-model-2"/);
  assert.match(html, /id="benchmark-answer-model-3"/);
  assert.match(html, /Without skill/);
  assert.match(html, /With Vasir architecture skill/);
  assert.match(html, /endsWith\(":fable"\)/);
  assert.match(html, /endsWith\(":opus"\)/);
  assert.match(html, /endsWith\(":gpt-5\.6-sol"\)/);
  assert.match(html, /endsWith\(":gpt-5\.6-sol"\)[\s\S]*endsWith\(":opus"\)[\s\S]*endsWith\(":fable"\)/);
  assert.match(html, /Full rubric ·/);
  assert.match(html, /benchmark-answer__assessment-chip/);
  assert.doesNotMatch(html, /benchmark-answer__criterion-track/);
  assert.match(html, /<table class="benchmark-table">/);
  assert.match(html, /<nav class="benchmark-report__nav"/);
  assert.match(html, /href="\.\.\/\.\.\/index\.html" aria-label="View all benchmark prompts"[^>]*>[\s\S]*?All prompts/);
  assert.match(html, /The Vasir benchmark standard/);
  assert.match(html, /Vasir raised scores by 34\.0 pts\./);
  assert.match(html, /Compare any three model configurations\./);
  assert.doesNotMatch(html, /lifted chat architecture/);
  assert.doesNotMatch(html, /Start with GPT-5\.6 Sol ultra/);
  assert.match(html, /font-family: "Kanit"/);
  assert.match(html, /data:font\/woff2;base64,/);
  assert.match(html, /--color-canvas: #f3f1ea/);
  assert.match(html, /--color-accent: #dfff65/);
  assert.doesNotMatch(html, /--grid-major-size/);
  assert.doesNotMatch(html, /benchmark-hero::before/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /Vasir architecture skill/);
  assert.match(html, /&lt;\/script&gt;&lt;script&gt;globalThis\.__BENCHMARK_XSS__/);
  assert.doesNotMatch(html, /<script>globalThis\.__BENCHMARK_XSS__/);
  assert.doesNotMatch(html, /<img src=x onerror=/);
});

test("escapes treatment copy rendered into the generic answer controls", () => {
  const run = createRunFixture();
  run.treatment.label = 'Skill </script><script>globalThis.__TREATMENT_XSS__ = true</script>';

  const html = renderBenchmarkReportHtml(run);

  assert.match(html, /With Skill &lt;\/script&gt;&lt;script&gt;globalThis\.__TREATMENT_XSS__/);
  assert.doesNotMatch(html, /<script>globalThis\.__TREATMENT_XSS__/);
});

test("writes report.html to a caller-owned run directory", (context) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-report-"));
  context.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));
  const outputFilePath = path.join(temporaryDirectory, "run", "report.html");

  const writtenPath = writeBenchmarkReport({
    run: createRunFixture(),
    outputFilePath
  });

  assert.equal(writtenPath, outputFilePath);
  assert.equal(fs.existsSync(outputFilePath), true);
  assert.match(fs.readFileSync(outputFilePath, "utf8"), /Which configuration answered best\?/);
});

test("normalizes and renders panel judgments with one explicit synthesis authority", () => {
  const report = normalizeBenchmarkReportData(createPanelRunFixture());

  assert.equal(report.judging.mode, "panel");
  assert.equal(report.judging.requestedCount, 2);
  assert.equal(report.judging.completedCount, 2);
  assert.equal(report.judging.members[0].model, "gpt-5.6-sol");
  assert.equal(report.judging.members[0].reviewerId, "reviewer-002");
  assert.equal(report.judging.members[1].model, "opus");
  assert.equal(report.judging.scoreAuthority, "synthesizer");
  assert.equal(report.judge.model, "gpt-5.6-sol");
  assert.equal(report.judge.reasoningEffort, "ultra");
  assert.deepEqual(report.judge.sourceReviewerIds, ["reviewer-001", "reviewer-002"]);
  assert.equal(report.judge.selections.length, 2);
  assert.equal(report.rows[1].selectedReviewerLabel, "gpt-5.6-sol · ultra");
  assert.match(report.rows[1].synthesisReason, /stronger complete evaluation/);
  assert.match(report.judge.summary, /GPT-5\.6 Sol · max · Vasir architecture skill wins/);
  assert.match(report.judging.members[1].summary, /Vasir architecture skill is stronger/);

  const html = renderBenchmarkReportHtml(createPanelRunFixture({ maliciousJudgeOutput: true }));
  assert.match(html, /2 independent judges → one synthesis/);
  assert.match(html, /2-judge panel · gpt-5\.6-sol synthesis/);
  assert.match(html, /Panel evidence · 2\/2 judgments complete/);
  assert.match(html, /reviewer-002 · gpt-5\.6-sol · ultra[\s\S]*reviewer-001 · opus · max/);
  assert.match(html, /opus · max/);
  assert.match(html, /gpt-5\.6-sol · ultra/);
  assert.match(html, /synthesized score/);
  assert.match(html, /Read exact synthesis output/);
  assert.match(html, /Synthesis · gpt-5\.6-sol · ultra:/);
  assert.match(html, /widest score spread 18\.0/);
  assert.match(html, /&lt;\/script&gt;&lt;script&gt;globalThis\.__JUDGE_XSS__/);
  assert.doesNotMatch(html, /<script>globalThis\.__JUDGE_XSS__/);
});

test("an incomplete panel exposes evidence without claiming synthesis or agreement", () => {
  const run = createPanelRunFixture();
  run.runStatus = "incomplete";
  run.rows.forEach((row) => {
    row.rowStatus = "complete";
    row.score = null;
  });
  run.pairs = [];
  run.judging.status = "error";
  run.judging.judges[1].status = "error";
  run.judging.judges[1].error = { message: "Judge timed out." };
  run.judging.synthesis.status = "skipped";
  run.judging.synthesis.outputText = null;
  run.judging.synthesis.comparativeNote = "";
  run.judging.disagreement = {
    candidateCount: 2,
    candidatesWithDisagreement: 0,
    maxScoreSpread: 0,
    candidates: []
  };

  const report = normalizeBenchmarkReportData(run);
  assert.equal(report.judging.scoreAuthority, "none");
  assert.equal(report.scoreLabel, "score");

  const html = renderBenchmarkReportHtml(run);
  assert.match(html, /1\/2 judges complete · synthesis unavailable/);
  assert.match(html, /Disagreement is unavailable because only 1\/2 judgments completed/);
  assert.match(html, /no final score/);
  assert.doesNotMatch(html, /1\/2 independent judges → one synthesis/);
  assert.doesNotMatch(html, /widest score spread 0\.0/);
});

test("runner single-judge artifacts remain single-judge reports", () => {
  const run = createRunFixture();
  run.judging.strategy = "single-judge-v1";
  run.judging.judges = [{
    reviewerId: "reviewer-001",
    configuration: { id: "codex:gpt-5.6-sol@ultra", provider: "codex", model: "gpt-5.6-sol", reasoning: "ultra" },
    status: "complete",
    comparativeNote: run.judging.comparativeNote,
    promptHash: "e".repeat(64)
  }];
  run.judging.judgeConfiguration = run.judging.judges[0].configuration;
  run.judging.synthesis = null;

  const report = normalizeBenchmarkReportData(run);
  assert.equal(report.judging.mode, "single");
  assert.equal(report.judging.scoreAuthority, "single-judge");
  assert.equal(report.judge.model, "gpt-5.6-sol");
  assert.equal(report.scoreLabel, "judge score");

  const html = renderBenchmarkReportHtml(run);
  assert.doesNotMatch(html, /independent judges → one synthesis/);
  assert.match(html, /gpt-5\.6-sol judge/);
});

test("partial and uncalibrated runs cannot masquerade as a complete benchmark win", () => {
  const run = createRunFixture();
  run.runStatus = "incomplete";
  run.summary.rowCounts = { expected: 4, complete: 2 };
  const html = renderBenchmarkReportHtml(run);

  assert.match(html, /Partial observed Vasir architecture skill lift/);
  assert.match(html, /Partial run: completed pairs moved/);
  assert.match(html, /Judge calibration: uncalibrated/);
  assert.match(html, /2\/4 responses complete/);
  assert.match(html, /not an overall benchmark result/);
});
