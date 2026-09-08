import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createDungeonMasterRows, isTechnicalFailure } from "../cli/eval/run-dungeon-master-benchmark.js";
import { dungeonMasterIsolationArguments } from "../cli/eval/dungeon-master-agent-runtime.js";

const definition = JSON.parse(fs.readFileSync(new URL("../benchmarks/dungeon-master-adventure-outline/benchmark.json", import.meta.url)));

test("frozen corpus preserves exact primary task, six primary repeats, five twice-repeated transfer tasks, and matched prompts", () => {
  const rows = createDungeonMasterRows(definition, definition.generation.configuration);
  assert.equal(rows.length, 32);
  assert.equal(new Set(rows.map((row) => row.rowKey)).size, 32);
  const pairs = Map.groupBy(rows, (row) => row.pairId);
  assert.equal(pairs.size, 16);
  assert.equal(rows.filter((row) => row.promptText === "create an outline for TTRPG adventure").length, 12);
  for (const pair of pairs.values()) {
    assert.equal(pair.length, 2);
    assert.equal(pair[0].promptText, pair[1].promptText);
    assert.deepEqual(pair.map((row) => row.conditionId), ["clean", "skill:dungeon-master"]);
  }
});

test("runtime replaces broad read-only sandbox with restricted filesystem policy and isolates skill discovery", () => {
  const args = dungeonMasterIsolationArguments(["exec", "--sandbox", "read-only", "--config", 'model_reasoning_effort="ultra"', "-"], "/tmp/dm-test-workspace");
  assert.equal(args.includes("--sandbox"), false);
  const permission = args.find((arg) => arg.startsWith("permissions="));
  assert.match(permission, /":root"="deny"/u);
  assert.match(permission, /"\/tmp\/dm-test-workspace"="read"/u);
  assert.match(permission, /enabled=false/u);
  assert.ok(args.includes("features.skip_host_skill_discovery=true"));
  assert.ok(args.includes('shell_environment_policy.inherit="none"'));
  assert.ok(args.includes('project_doc_max_bytes=0'));
  assert.equal(args.at(-1), "-");
});

test("technical retries exclude low-quality content, output filtering, quota, auth and configuration failures", () => {
  assert.equal(isTechnicalFailure(new Error("ETIMEDOUT: socket timed out")), true);
  assert.equal(isTechnicalFailure(new Error("the Codex session did not return a final answer")), true);
  for (const message of ["Provider output filtering", "quota exceeded", "OAuth authentication failed", "Error loading config.toml", "permission denied", "poor outline", "missing required reference read"]) {
    assert.equal(isTechnicalFailure(new Error(message)), false, message);
  }
});

test("independent rubric retains six equal 0–5 dimensions and two counterbalanced fresh Astra ultra seats", () => {
  assert.equal(definition.scoring.dimensions.length, 6);
  for (const dimension of definition.scoring.dimensions) {
    assert.equal(dimension.weight, 1);
    for (const anchor of ["0", "1", "2", "3", "4", "5"]) assert.ok(dimension.anchors[anchor]);
  }
  assert.equal(definition.judging.panel.length, 2);
  assert.ok(definition.judging.panel.every((seat) => seat.model === "gpt-6-astra" && seat.reasoning === "ultra"));
  assert.match(definition.scoring.judgeInstructions, /A linear, agreed mission can score fully/u);
  assert.match(definition.scoring.judgeInstructions, /Do not apply overall score caps/u);
});
