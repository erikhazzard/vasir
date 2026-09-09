import assert from "node:assert/strict";
import test from "node:test";
import { buildStorytellingBrowserProofChecks } from "../cli/benchmark-publish.js";

const options = reportFragments => ({ routes: { reportFragments }, siteRootDirectory: "/site", targetUrl: "https://vasirbenchmark.com", outputDirectory: "/proof" });
const argument = (check, key) => check.args[check.args.indexOf(key) + 1];

test("production checks cover each selected Writing benchmark at desktop, mobile and tablet", () => {
  const checks = buildStorytellingBrowserProofChecks(options([
    "/benchmark-report.html#storytelling-core-idea", "/benchmark-report.html#storytelling-plot-twists",
    "/benchmark-report.html#dungeon-master-adventure-outline", "/games.html?benchmark=2d-jumping-demo"
  ]));
  assert.equal(checks.length, 9);
  assert.equal(new Set(checks.map(check => argument(check, "--output-dir"))).size, 9);
  for (const id of ["storytelling-core-idea", "storytelling-plot-twists", "dungeon-master-adventure-outline"]) {
    const selected = checks.filter(check => check.benchmarkId === id);
    assert.deepEqual(selected.map(check => [check.width, check.height]), [[1440, 1000], [390, 844], [820, 1000]]);
    assert.ok(selected.every(check => argument(check, "--benchmark") === id));
    assert.ok(selected.every(check => check.args.includes("--require-scored") === (id !== "storytelling-core-idea")));
  }
});

test("unselected Writing sources are not requested and incomplete Core idea stays publishable", () => {
  assert.deepEqual(buildStorytellingBrowserProofChecks(options([])), []);
  const checks = buildStorytellingBrowserProofChecks(options(["/benchmark-report.html#storytelling-core-idea"]));
  assert.equal(checks.length, 3);
  assert.ok(checks.every(check => !check.args.includes("--require-scored")));
});

test('all three compact editions receive scored browser proofs without replacing legacy reports', () => {
  const ids = ['storytelling-core-idea', 'storytelling-plot-twists', 'dungeon-master-adventure-outline',
    'storytelling-plot-twists-compact-v2', 'writing-place-generation-v1', 'storytelling-one-shot-v1'];
  const checks = buildStorytellingBrowserProofChecks(options(ids.map(id => `/benchmark-report.html#${id}`)));
  assert.equal(checks.length, ids.length * 3);
  assert.deepEqual([...new Set(checks.map(check => check.benchmarkId))], ids);
  for (const id of ids.slice(3)) {
    const selected = checks.filter(check => check.benchmarkId === id);
    assert.equal(selected.length, 3);
    assert.ok(selected.every(check => check.args.includes('--require-scored')));
    assert.ok(selected.every(check => argument(check, '--benchmark') === id));
  }
});
