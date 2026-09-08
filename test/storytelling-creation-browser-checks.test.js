import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { buildStorytellingBrowserProofChecks } from "../cli/benchmark-publish.js";

const options = (reportFragments) => ({ routes: { reportFragments }, siteRootDirectory: "/site", targetUrl: "https://vasirbenchmark.com", outputDirectory: "/proof" });

test("creation full-audit discovery adds three scored viewport checks without adding Games", () => {
  const checks = buildStorytellingBrowserProofChecks(options([
    "/benchmark-report.html#storytelling-magic-discovery", "/games.html?benchmark=2d-jumping-demo"
  ]));
  assert.deepEqual(checks.map(({ benchmarkId, width, height }) => ({ benchmarkId, width, height })),
    [[1440, 1000], [390, 844], [820, 1000]].map(([width, height]) => ({ benchmarkId: "storytelling-magic-discovery", width, height })));
  assert.ok(checks.every((check) => check.args.includes("--require-scored")));
  assert.equal(new Set(checks.map((check) => check.args[check.args.indexOf("--output-dir") + 1])).size, 3);
  assert.deepEqual(buildStorytellingBrowserProofChecks(options(["/games.html?benchmark=2d-jumping-demo"])), []);
});

test("creation checks preserve every existing Core, Twists, and Dungeon Master proof command", () => {
  const previous = ["storytelling-core-idea", "storytelling-plot-twists", "dungeon-master-adventure-outline"].map((id) => `/benchmark-report.html#${id}`);
  const baseline = buildStorytellingBrowserProofChecks(options(previous));
  const expanded = buildStorytellingBrowserProofChecks(options([...previous, "/benchmark-report.html#storytelling-magic-discovery"]));
  assert.equal(expanded.length, 12);
  assert.deepEqual(expanded.filter((check) => check.benchmarkId !== "storytelling-magic-discovery"), baseline);
});

test("creation browser evaluations compile without launching a browser or substituting benchmark data", async () => {
  const source = fs.readFileSync(new URL("../site/vasirbenchmark.com/writing-browsercheck.mjs", import.meta.url), "utf8");
  const start = source.indexOf("const verifyCreationArchiveAndContexts =");
  const end = source.indexOf("const verifyDungeonMaster =", start);
  assert.ok(start >= 0 && end > start);
  const expressions = [];
  const context = vm.createContext({
    evaluate: async (expression) => {
      new vm.Script(expression);
      expressions.push(expression);
      return { mismatches: [] };
    },
    check: (_name, passed) => assert.equal(passed, true),
    noOverflow: async () => {}
  });
  await new vm.Script(`(async () => { ${source.slice(start, end)}
    await verifyCreationArchiveAndContexts();
    await verifyCreationExpandedReviews("magic-discovery", 3);
  })()`).runInContext(context);
  assert.equal(expressions.length, 2);
});
