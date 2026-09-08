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
  assert.match(source, /\$\{capabilityHeaderMarkup\(category\)\}\$\{capabilityTabsMarkup\(category.name,/u);
  const markup = vm.runInNewContext(source + '\ncapabilityModeMarkup({id:"writing",name:"Writing"});', {
    categoryBenchmarks: () => [{ suite: 'Storytelling' }],
    isWriting: true, isWorkSpec: false, TREATMENT_CONDITION_ID: 'skill',
    data: { entries: [{ condition: 'skill', score: 90 }] },
    capabilityHeaderMarkup: () => '<header>Writing</header>',
    capabilityTabsMarkup: (name, tabs) => `<nav aria-label="${name}">${tabs.map(tab => tab[1]).join('|')}</nav>`
  });
  assert.match(markup, /^<header>Writing<\/header><nav/u);
  assert.match(markup, /Leaderboard\|Benchmark tests\|Efficiency/u);
});

test("changing the score keeps the current view, other query parameters and selected model", () => {
  const source = section('  const writingScoreHref', '  const writingLeaderboardControlsMarkup');
  const href = vm.runInNewContext(source + '\nwritingScoreHref("storytelling-magic-discovery");', {
    URL,
    window: { location: new URL('https://example.test/index.html?score=storytelling&keep=1#capabilities/writing/efficiency') },
    selectedEntry: () => ({ settingId: 'codex-gpt-5-6-sol-ultra' })
  });
  const observed = new URL(href);
  assert.equal(observed.searchParams.get('score'), 'storytelling-magic-discovery');
  assert.equal(observed.searchParams.get('keep'), '1');
  assert.equal(observed.searchParams.get('setting'), 'codex-gpt-5-6-sol-ultra');
  assert.equal(observed.hash, '#capabilities/writing/efficiency');
  assert.match(app, /buildWritingCategoryCollection\(writingData, writingScoreRequest\)/);
  assert.match(app, /window\.location\.assign\(writingScoreHref\(event\.target\.value\)\)/);
});

test("the native score selector offers the aggregate, three tests and Dungeon Master inside the leaderboard", () => {
  const fixtureContext = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-data.js', import.meta.url), 'utf8'), fixtureContext);
  const data = vm.runInNewContext(categorySource + '\nbuildWritingCategoryCollection(collection);', { collection: fixtureContext.window.VASIR_WRITING });
  const controlsSource = section('  const writingLeaderboardControlsMarkup', '  const capabilityHeaderFrameMarkup');
  const formatters = section('  const escapeHtml', '  const scoreFor');
  const html = vm.runInNewContext(formatters + controlsSource + '\nwritingLeaderboardControlsMarkup();', {
    data, scoreBasis: data.scoreBasis, isWriting: true, TREATMENT_CONDITION_ID: 'skill',
    RANKED_SETTING_COUNT: data.writingCategory.rankedSettingCount,
    benchmarkById: new Map(data.benchmarks.map(benchmark => [benchmark.id, benchmark]))
  });
  assert.deepEqual([...html.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]), ['storytelling', CORE, TWISTS, 'storytelling-magic-discovery', 'dungeon-master']);
  assert.match(html, /<label[^>]*for="writing-score-selection"/);
  assert.match(html, /<select[^>]*aria-describedby="writing-score-basis"/);
  assert.match(html, /<option value="storytelling" selected>Storytelling aggregate/);
  assert.match(html, /4 ranked · 3 equally weighted tests/);
  assert.match(html, /Provisional/);
  assert.doesNotMatch(html, /Outside cohort|Unranked settings|complete paired settings/);
  const renderer = section('  const renderCapabilities', '  const plotPointSnapshot');
  assert.ok(renderer.indexOf('writingLeaderboardControlsMarkup()') > renderer.indexOf('id="capability-ranking"'));
});
