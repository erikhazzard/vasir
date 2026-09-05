import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveBenchmarkSource } from "../cli/eval/benchmark-source.js";
import { resolveSuiteSource } from "../cli/eval/suite-source.js";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function createTemporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vasir-benchmark-source-"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createValidBenchmark(id) {
  return {
    schemaVersion: 1,
    id,
    taskKind: "response",
    cases: [
      {
        id: "case-one",
        task: "Recommend one design."
      }
    ],
    scoring: {
      version: "rubric-v1",
      judgeInstructions: "Score each anonymous answer independently.",
      scoreRange: { min: 0, max: 100 },
      ratingScale: { min: 0, max: 4 },
      gates: [
        {
          id: "correct",
          criterion: "The answer is correct.",
          failureCap: 49
        }
      ],
      dimensions: [
        {
          id: "quality",
          title: "Quality",
          criterion: "The answer satisfies the task.",
          weight: 100,
          anchors: {
            0: "Does not satisfy the task.",
            4: "Fully satisfies the task."
          }
        }
      ]
    }
  };
}

test("resolves the checked-in hyper-scale-chat benchmark independently from any skill", () => {
  const source = resolveBenchmarkSource({
    benchmarkName: "hyper-scale-chat",
    currentWorkingDirectory: REPOSITORY_ROOT
  });

  assert.equal(source.benchmarkId, "hyper-scale-chat");
  assert.equal(source.sourceType, "repo-source");
  assert.equal(
    source.benchmarkDefinition.cases[0].task,
    "Architect a chat app infrastructure that supports 10 million concurrent users."
  );
  assert.equal(source.benchmarkDefinition.scoring.scoreRange.max, 100);
  assert.equal(
    source.benchmarkDefinition.scoring.dimensions.reduce(
      (total, dimension) => total + dimension.weight,
      0
    ),
    100
  );
  assert.ok(/^[a-f0-9]{64}$/.test(source.benchmarkHash));
  assert.ok(/^[a-f0-9]{64}$/.test(source.benchmarkGenerationHash));
  assert.ok(/^[a-f0-9]{64}$/.test(source.benchmarkScoringHash));
  assert.deepEqual(source.benchmarkDefinition.judging.panel, [
    "codex:gpt-6-astra@xhigh",
    "claude:claude-fable-5-1@max"
  ]);
  assert.equal(source.benchmarkDefinition.judging.synthesizer, null);
  assert.deepEqual(source.benchmarkDefinition.scoring.aggregation, {
    method: "unanimity-gates-mean-dimensions-v1",
    judgeCount: 2,
    batchUnit: "matched-pair"
  });
  assert.equal(Object.hasOwn(source.benchmarkDefinition, "conditions"), false);
  assert.equal(Object.hasOwn(source.benchmarkDefinition, "treatments"), false);
});

test("resolves the checked-in device telemetry benchmark as a vendor-neutral benchmark definition", () => {
  const source = resolveBenchmarkSource({
    benchmarkName: "device-telemetry",
    currentWorkingDirectory: REPOSITORY_ROOT
  });

  assert.equal(source.benchmarkId, "device-telemetry");
  assert.equal(source.sourceType, "repo-source");
  assert.equal(source.benchmarkDefinition.cases.length, 1);
  assert.match(source.benchmarkDefinition.cases[0].task, /10 million simultaneously active devices/);
  assert.equal(source.benchmarkDefinition.scoring.gates.length, 5);
  assert.equal(
    source.benchmarkDefinition.scoring.dimensions.reduce(
      (total, dimension) => total + dimension.weight,
      0
    ),
    100
  );
  assert.deepEqual(source.benchmarkDefinition.judging.panel, [
    "codex:gpt-6-astra@xhigh",
    "claude:claude-fable-5-1@max"
  ]);
  assert.equal(source.benchmarkDefinition.judging.synthesizer, null);
  assert.doesNotMatch(source.benchmarkDefinition.scoring.judgeInstructions, /must use (scylla|dynamodb|redis)/i);
  assert.equal(Object.hasOwn(source.benchmarkDefinition, "conditions"), false);
  assert.equal(Object.hasOwn(source.benchmarkDefinition, "treatments"), false);
});

test("judge changes alter scoring identity without invalidating generation identity", () => {
  const projectRootDirectory = createTemporaryDirectory();
  const firstDefinition = createValidBenchmark("judge-hash");
  firstDefinition.judging = {
    panel: ["claude:opus@max", "codex:gpt-5.6-sol@ultra"],
    synthesizer: "codex:gpt-5.6-sol@ultra"
  };
  const secondDefinition = {
    ...firstDefinition,
    judging: {
      panel: ["claude:fable@max", "codex:gpt-5.6-terra@max"],
      synthesizer: "claude:opus@max"
    }
  };
  writeJson(
    path.join(projectRootDirectory, "benchmarks", "judge-hash", "benchmark.json"),
    firstDefinition
  );

  const first = resolveBenchmarkSource({
    benchmarkName: "judge-hash",
    currentWorkingDirectory: projectRootDirectory,
    projectRootDirectory
  });
  writeJson(
    path.join(projectRootDirectory, "benchmarks", "judge-hash", "benchmark.json"),
    secondDefinition
  );
  const second = resolveBenchmarkSource({
    benchmarkName: "judge-hash",
    currentWorkingDirectory: projectRootDirectory,
    projectRootDirectory
  });

  assert.equal(first.benchmarkGenerationHash, second.benchmarkGenerationHash);
  assert.notEqual(first.benchmarkHash, second.benchmarkHash);
  assert.notEqual(first.benchmarkScoringHash, second.benchmarkScoringHash);
});

test("rejects duplicate judges before launching a benchmark", () => {
  const projectRootDirectory = createTemporaryDirectory();
  const benchmarkDefinition = createValidBenchmark("duplicate-judges");
  benchmarkDefinition.judging = {
    panel: ["claude:opus@max", "claude:opus@max"],
    synthesizer: "codex:gpt-5.6-sol@ultra"
  };
  writeJson(
    path.join(projectRootDirectory, "benchmarks", "duplicate-judges", "benchmark.json"),
    benchmarkDefinition
  );

  assert.throws(
    () => resolveBenchmarkSource({
      benchmarkName: "duplicate-judges",
      currentWorkingDirectory: projectRootDirectory,
      projectRootDirectory
    }),
    (error) => {
      assert.equal(error.code, "EVAL_BENCHMARK_INVALID");
      assert.match(error.message, /duplicated/i);
      return true;
    }
  );
});

test("accepts an odd synthesis-free panel only with its exact deterministic aggregation contract", () => {
  const projectRootDirectory = createTemporaryDirectory();
  const benchmarkDefinition = createValidBenchmark("panel-median");
  benchmarkDefinition.scoring.aggregation = {
    method: "majority-gates-median-dimensions-v1",
    judgeCount: 3,
    batchUnit: "matched-pair"
  };
  benchmarkDefinition.judging = {
    panel: [
      "codex:gpt-5.6-sol@ultra",
      "codex:gpt-5.6-terra@ultra",
      "claude:opus@max"
    ],
    synthesizer: null
  };
  const benchmarkFilePath = path.join(
    projectRootDirectory,
    "benchmarks",
    "panel-median",
    "benchmark.json"
  );
  writeJson(benchmarkFilePath, benchmarkDefinition);

  const source = resolveBenchmarkSource({
    benchmarkName: "panel-median",
    currentWorkingDirectory: projectRootDirectory,
    projectRootDirectory
  });
  assert.equal(source.benchmarkDefinition.judging.panel.length, 3);
  assert.equal(source.benchmarkDefinition.judging.synthesizer, null);

  const evenPanel = structuredClone(benchmarkDefinition);
  evenPanel.scoring.aggregation.judgeCount = 2;
  evenPanel.judging.panel.pop();
  writeJson(benchmarkFilePath, evenPanel);
  assert.throws(
    () => resolveBenchmarkSource({
      benchmarkName: "panel-median",
      currentWorkingDirectory: projectRootDirectory,
      projectRootDirectory
    }),
    (error) => error?.code === "EVAL_BENCHMARK_INVALID" && /aggregation|majority/i.test(error.message)
  );

  const mismatchedPanel = structuredClone(benchmarkDefinition);
  mismatchedPanel.scoring.aggregation.judgeCount = 5;
  writeJson(benchmarkFilePath, mismatchedPanel);
  assert.throws(
    () => resolveBenchmarkSource({
      benchmarkName: "panel-median",
      currentWorkingDirectory: projectRootDirectory,
      projectRootDirectory
    }),
    (error) => error?.code === "EVAL_BENCHMARK_INVALID" && /disagree/i.test(error.message)
  );
});

test("two synthesis-free judges require explicit unanimity aggregation and exact count", () => {
  const projectRootDirectory = createTemporaryDirectory();
  const definition = createValidBenchmark("panel-consensus");
  definition.judging = {
    panel: ["codex:gpt-6-astra@xhigh", "claude:claude-fable-5-1@max"],
    synthesizer: null
  };
  definition.scoring.aggregation = {
    method: "unanimity-gates-mean-dimensions-v1", judgeCount: 2, batchUnit: "matched-pair"
  };
  const filePath = path.join(projectRootDirectory, "benchmarks", "panel-consensus", "benchmark.json");
  const resolve = () => resolveBenchmarkSource({
    benchmarkName: "panel-consensus", currentWorkingDirectory: projectRootDirectory, projectRootDirectory
  });
  writeJson(filePath, definition);
  const source = resolve();
  assert.deepEqual(source.benchmarkDefinition.judging, definition.judging);
  for (const mutation of [
    (candidate) => { delete candidate.scoring.aggregation; },
    (candidate) => { candidate.scoring.aggregation.judgeCount = 3; },
    (candidate) => { candidate.judging.panel.pop(); },
    (candidate) => { candidate.judging.synthesizer = "codex:gpt-6-astra@xhigh"; }
  ]) {
    const candidate = structuredClone(definition);
    mutation(candidate);
    writeJson(filePath, candidate);
    assert.throws(resolve, (error) => error.code === "EVAL_BENCHMARK_INVALID");
  }
});

test("prefers a project-local independent benchmark over the bundled catalog", () => {
  const projectRootDirectory = createTemporaryDirectory();
  const catalogRootDirectory = createTemporaryDirectory();
  const projectDefinition = createValidBenchmark("architecture-smoke");
  const catalogDefinition = {
    ...createValidBenchmark("architecture-smoke"),
    title: "Bundled fallback"
  };
  projectDefinition.title = "Project override";

  writeJson(
    path.join(projectRootDirectory, "benchmarks", "architecture-smoke", "benchmark.json"),
    projectDefinition
  );
  writeJson(
    path.join(catalogRootDirectory, "benchmarks", "architecture-smoke", "benchmark.json"),
    catalogDefinition
  );

  const source = resolveBenchmarkSource({
    benchmarkName: "architecture-smoke",
    currentWorkingDirectory: projectRootDirectory,
    projectRootDirectory,
    catalogRootDirectory
  });

  assert.equal(source.sourceType, "project-local");
  assert.equal(source.benchmarkDefinition.title, "Project override");
  assert.equal(source.catalogRootDirectory, path.resolve(catalogRootDirectory));
});

test("rejects treatment content inside an independent benchmark", () => {
  const projectRootDirectory = createTemporaryDirectory();
  const benchmarkDefinition = {
    ...createValidBenchmark("coupled-benchmark"),
    conditions: ["clean", "skill:architecture"]
  };
  writeJson(
    path.join(projectRootDirectory, "benchmarks", "coupled-benchmark", "benchmark.json"),
    benchmarkDefinition
  );

  assert.throws(
    () => resolveBenchmarkSource({
      benchmarkName: "coupled-benchmark",
      currentWorkingDirectory: projectRootDirectory,
      projectRootDirectory
    }),
    (error) => {
      assert.equal(error.code, "EVAL_BENCHMARK_INVALID");
      assert.match(error.message, /owns conditions or treatments/i);
      return true;
    }
  );
});

test("rejects a rubric without an explicit 100-point basis", () => {
  const projectRootDirectory = createTemporaryDirectory();
  const benchmarkDefinition = createValidBenchmark("bad-weights");
  benchmarkDefinition.scoring.dimensions[0].weight = 99;
  writeJson(
    path.join(projectRootDirectory, "benchmarks", "bad-weights", "benchmark.json"),
    benchmarkDefinition
  );

  assert.throws(
    () => resolveBenchmarkSource({
      benchmarkName: "bad-weights",
      currentWorkingDirectory: projectRootDirectory,
      projectRootDirectory
    }),
    (error) => {
      assert.equal(error.code, "EVAL_BENCHMARK_INVALID");
      assert.match(error.message, /weights total 99/i);
      return true;
    }
  );
});

test("schema version 1 rejects score scales the judge cannot faithfully execute", () => {
  const projectRootDirectory = createTemporaryDirectory();
  const benchmarkDefinition = createValidBenchmark("unsupported-scale");
  benchmarkDefinition.scoring.scoreRange = { min: 0, max: 10 };
  writeJson(
    path.join(projectRootDirectory, "benchmarks", "unsupported-scale", "benchmark.json"),
    benchmarkDefinition
  );

  assert.throws(
    () => resolveBenchmarkSource({
      benchmarkName: "unsupported-scale",
      currentWorkingDirectory: projectRootDirectory,
      projectRootDirectory
    }),
    (error) => {
      assert.equal(error.code, "EVAL_BENCHMARK_INVALID");
      assert.match(error.message, /requires a 0–100 score range and 0–4 rating scale/i);
      return true;
    }
  );
});

test("legacy skill-owned suites still resolve unchanged", () => {
  const skillDirectoryPath = createTemporaryDirectory();
  writeJson(path.join(skillDirectoryPath, "evals", "suite.json"), {
    id: "legacy-skill-suite",
    cases: [
      {
        id: "legacy-case",
        task: "Return the required marker.",
        requiredSubstrings: ["marker"]
      }
    ]
  });

  const source = resolveSuiteSource({
    skillSource: {
      skillName: "legacy-skill",
      skillDirectoryPath,
      sourceType: "project-local"
    }
  });

  assert.equal(source.suiteDefinition.id, "legacy-skill-suite");
  assert.equal(source.sourceType, "project-local");
  assert.ok(/^[a-f0-9]{64}$/.test(source.suiteHash));
});
