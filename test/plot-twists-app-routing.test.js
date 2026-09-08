import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const app = fs.readFileSync(new URL("../site/vasirbenchmark.com/app.js", import.meta.url), "utf8");
const CORE = "storytelling-core-idea";
const TWISTS = "storytelling-plot-twists";
const DM = "dungeon-master-adventure-outline";

// Exercise shipped declarations, not a second implementation of the router.
function section(start, end) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, "App declaration boundaries changed: " + start);
  return app.slice(from, to);
}

const routeSource = section("  const routeFromHash", "  const initialRoute");
const hashSource = section("  const capabilityHash", "  const escapeHtml");
const categorySource = section("function buildWritingCategoryCollection", "(async function");

function context(href) {
  return {
    URL,
    URLSearchParams,
    rootData: { categories: [{ id: "engineering" }] },
    window: { location: new URL(href, "https://example.test/index.html") },
    categoryById: new Map(["writing", "overall", "games", "engineering"].map(id => [id, { id }])),
    CAPABILITY_MODES: ["models", "benchmarks", "efficiency"],
    COMBINED_CAPABILITY: { id: "overall" }
  };
}

function route(href) {
  return JSON.parse(JSON.stringify(vm.runInNewContext(routeSource + "\nrouteFromHash();", context(href), { timeout: 1000 })));
}

test("Writing has the same category-level modes as the rest of the site", () => {
  assert.deepEqual(route("#capabilities/writing"), { category: "writing", mode: "models", canonical: true });
  for (const mode of ["benchmarks", "efficiency"]) {
    assert.deepEqual(route("#capabilities/writing/" + mode), { category: "writing", mode, canonical: true });
  }
  assert.equal(route("#capabilities/writing/models").mode, "models");
  assert.equal(route("#capabilities/writing/models").canonical, false);
});

test("legacy subgroup routes preserve mode but canonicalize to the Writing category", () => {
  for (const subgroup of ["storytelling", "dungeon-master", "prose", "poetry"]) {
    assert.deepEqual(route("#capabilities/writing/" + subgroup), { category: "writing", mode: "models", canonical: false });
    for (const mode of ["models", "benchmarks", "efficiency"]) {
      const observed = route("#capabilities/writing/" + subgroup + "/" + mode);
      assert.equal(observed.category, "writing");
      assert.equal(observed.mode, mode);
      assert.equal(observed.canonical, false);
      assert.equal(observed.writingSubsection, undefined);
    }
  }
});

test("old benchmark-selection queries cannot replace the category hierarchy", () => {
  for (const benchmark of [CORE, TWISTS, DM, "unknown"]) {
    for (const fragment of ["capabilities/writing", "capabilities/writing/benchmarks", "capabilities/writing/efficiency", "capabilities/writing/storytelling/benchmarks", "capabilities/writing/dungeon-master/efficiency"]) {
      assert.deepEqual(route("?writing=" + benchmark + "&keep=1#" + fragment), route("#" + fragment));
    }
  }
});

test("canonical Writing hashes contain no selected benchmark or subgroup", () => {
  for (const mode of ["models", "benchmarks", "efficiency"]) {
    const observed = vm.runInNewContext(hashSource + "\ncapabilityHash();", {
      state: { capabilityCategory: "writing", capabilityMode: mode },
      requestedWritingBenchmark: TWISTS,
      writingSubcategory: "storytelling"
    });
    assert.equal(observed, "#capabilities/writing" + (mode === "models" ? "" : "/" + mode));
  }
});

test("unknown and non-Writing routes keep existing fallbacks", () => {
  assert.equal(route("#capabilities/unknown").category, "overall");
  assert.equal(route("#capabilities/writing/unknown").mode, "models");
  assert.deepEqual(route("#capabilities/games/benchmarks"), { category: "games", mode: "benchmarks", canonical: true });
  assert.deepEqual(route("#capabilities/engineering/efficiency"), { category: "engineering", mode: "efficiency", canonical: true });
  assert.deepEqual(route("#leaderboard"), { category: "overall", mode: "models", legacy: true });
});

test("category adapter ignores URL hints and preserves every raw publication", () => {
  const fixtureContext = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL("../site/vasirbenchmark.com/writing-data.js", import.meta.url), "utf8"), fixtureContext);
  const fixture = fixtureContext.window.VASIR_WRITING;
  const before = JSON.stringify(fixture);
  const expectedIds = [fixture.benchmarks[0].id, ...(fixture.benchmarkPublications || []).map(item => item.benchmarkId), ...Object.values(fixture.additionalBenchmarks || {}).map(item => item.benchmarks[0].id)].sort();
  let initial;
  for (const id of [CORE, TWISTS, DM, "unknown"]) {
    const result = vm.runInNewContext(categorySource + "\nbuildWritingCategoryCollection(collection);", { collection: fixture, requestedWritingBenchmark: id, window: { location: new URL("https://example.test/?writing=" + id + "#capabilities/writing/storytelling") } }, { timeout: 1000 });
    assert.deepEqual(Array.from(result.benchmarks, item => item.id).sort(), expectedIds);
    assert.equal(JSON.stringify(fixture), before, "Building the index must not mutate an original projection.");
    const serialized = JSON.stringify(result);
    if (initial) assert.equal(serialized, initial);
    initial = serialized;
  }
});

test("Writing view tabs follow the header without an intervening benchmark picker", () => {
  const source = section("  const capabilityModeMarkup", "  const efficiencyPanelMarkup");
  assert.doesNotMatch(source, /writingSubsectionsMarkup|writingBenchmarkPickerMarkup|writingProgressMarkup|writingCohortsMarkup/u);
  assert.match(source, /\$\{capabilityHeaderMarkup\(category\)\}\s*<nav class="capability-mode"/u);
});
