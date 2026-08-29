# VasirBench canonical site template

The accepted, dependency-free web template for VasirBench. Open `index.html` directly; no build step is required.

## Template lock

- **Canonical source:** `site/vasirbenchmark.com/`. This repository-owned directory supersedes the ignored working prototype under `.agents/vasir-evals/homepage-final-design/`.
- **Accepted state:** Light-mode capability explorer with Combined, five job families, Leaderboard, Benchmark tests, Efficiency, and individual benchmark reports. The exact desktop and mobile captures in this directory are the visual acceptance artifacts.
- **Change rule:** Preserve the information architecture, visual system, interaction grammar, responsive behavior, and evidence boundaries unless an explicit product decision changes them. Any material interface change must regenerate and pass `./capture.sh`, then receive a new human visual acceptance verdict.
- **Deployment boundary:** Hosting is intentionally deferred. The expected destination is `vasirbenchmark.com` in the `fylgya` AWS account; S3/CloudFront/Route 53/ACM topology, deployment automation, and DNS changes are not part of this template lock.

## Product explorer

One persistent capability index and one three-way view switcher expose the whole benchmark. Choose **Combined** or one of five named fields, then move between the model leaderboard, benchmark tests, and Efficiency without changing context.

- `#capabilities/overall` — the default **Combined** field. It ranks matched model/reasoning settings by the weighted Overall With Vasir score. Each row aligns the five-part With Vasir composition with its muted Without Vasir counterpart. The first 10 settings are visible initially, with an explicit control to show all 20. Three summary readings report the best With Vasir result, median Full effect, and improved/regressed outcomes.
- `#capabilities/<category>` — a named capability comparison for `engineering`, `games`, `product`, `writing`, or `workflows`. Each field shows 20 With/Without comparisons on one dot/dumbbell scale and two header readings: Leader with Vasir and Best without Vasir.
- `#capabilities/<category>/benchmarks` — the constituent benchmark index for the active field, grouped into named tracks. Combined exposes all 24 tests; named fields expose their own tests. Every test opens a cohesive report route. The three current Backend Architecture reports retain links to source evidence; future-suite previews remain explicitly illustrative.
- `#capabilities/<category>/efficiency` — all 60 results on a synchronized quality × resource plane using the active capability as the quality field. The plot connects the complete Pareto frontier, traces the selected setting from Minimal through Skill to Full, and keeps exact selection detail in a collision-safe inspector. The selected result and resource-axis controls remain local to this view; there is no duplicate quality-field selector.

Combined is a presentation field, not a sixth fixture category. `#leaderboard` is retained as a legacy entry point and canonicalizes to `#capabilities/overall`. Legacy `#efficiency` canonicalizes to `#capabilities/overall/efficiency`; `#vasir-effect` canonicalizes to `#capabilities/engineering`, where the matched deltas now live. Empty and invalid routes resolve safely to the Combined default.

The selected model/reasoning setting persists across all six capability fields and all three views. A Combined or named-capability row selects its Full Vasir entry; Efficiency retains all three conditions.

## Files

- `index.html` — semantic publication and one permanent capability workspace.
- `style.css` — responsive Idavoll SDK light system and interaction states.
- `assets/kanit-latin-900-normal.woff2` — bundled first-party Kanit numeral face reserved for capability-field and summary scores.
- `app.js` — Combined paired ranking, named-capability comparison, category routing, selection synchronization, plots, and evidence.
- `data.js` — self-contained future-state fixture plus the three current Backend Architecture development summaries.
- `benchmark-report.html` / `.css` / `.js` — responsive test report shell, contextual return path, evidence truth boundary, and within-category previous/next navigation.
- `NOTES.md` — information-architecture and visualization decisions.
- `desktop.png` / `mobile.png` — legacy `#leaderboard` entry at 1440×1000 and 390×844, verified to canonicalize to the default Combined model view.
- `desktop-capabilities.png` / `mobile-capabilities.png` — Engineering model leaderboard at both exact viewports.
- `desktop-capability-benchmarks.png` / `mobile-capability-benchmarks.png` — Engineering benchmark-test index at both exact viewports.
- `desktop-efficiency.png` / `mobile-efficiency.png` — Combined Efficiency (`#capabilities/overall/efficiency`) at both exact viewports.
- `desktop-benchmark-report.png` / `mobile-benchmark-report.png` — measured Hyper-scale chat report at both exact viewports.
- `capture.mjs` / `capture.sh` — repeatable exact-viewport capture and QA harness.
- `template-lock.json` — the human acceptance receipt and SHA-256 binding for the accepted source, harness, font, and ten visual captures.

## Open locally

Direct file URLs work. A local server is useful when sharing deep links:

```bash
cd /Users/erikhazzard/code/vasir/site/vasirbenchmark.com
python3 -m http.server 4175
```

Then open `http://127.0.0.1:4175/#capabilities/overall`, `http://127.0.0.1:4175/#capabilities/engineering`, `http://127.0.0.1:4175/#capabilities/engineering/benchmarks`, or `http://127.0.0.1:4175/#capabilities/engineering/efficiency`. Opening `#leaderboard` or `#efficiency` verifies the legacy aliases before the URL is replaced with the canonical Combined route.

## Capture and QA

Run:

```bash
./capture.sh
```

The script launches an isolated Chrome session for each target and viewport, regenerates ten canonical images, and checks:

- exact 1440×1000 or 390×844 viewport and PNG dimensions;
- no initial or post-interaction overflow or runtime exceptions;
- deterministic bundled Kanit loading through `document.fonts.load(...)` followed by `document.fonts.check(...)`;
- unique IDs, valid routes, accessible names, native controls, and visible focus;
- one permanent workspace with no obsolete global lens tabs or standalone Efficiency panel;
- six capability fields and three native local view tabs with complete width, `aria-selected`, roving focus, and Arrow/Home/End behavior;
- Combined as the default field and model leaderboard as its default view;
- legacy `#leaderboard` replacement with `#capabilities/overall`, `#efficiency` replacement with `#capabilities/overall/efficiency`, `#vasir-effect` replacement with `#capabilities/engineering`, and safe invalid-route fallback;
- exact-selection persistence across all six score fields and all three local views;
- exactly three Combined summary readings with fixture-matched leader, median effect, and outcome values;
- 10 collapsed and 20 expanded Combined settings in With-rank order, with a single native show-all disclosure;
- exactly two ordered compositions per Combined row—With Vasir first, Without Vasir second—with five fixture-matched segments apiece, exact normalized width sums, condition-specific ranks/delta, and no baseline marker;
- native 24px-minimum segment drilldown for both compositions across all five named capabilities, including independent roving keyboard groups, category state, hash, selection, and focus;
- one readable six-field selector, exactly one structural `Selected` state, and a stable local mode rail;
- named capability captures opening Engineering models with 20 dot/dumbbell rows, two condition readings, direct ranks, exact scores, deltas, and two markers;
- benchmark captures opening Engineering benchmarks with exact track/test order, score pair, delta, completion, W/T/L, calibration, evidence kind, and report route;
- report hierarchy, truthful measured labels, source links, section deep links, fixture disclaimers, and responsive overflow;
- exhaustive fixture validation for Combined and all five named capability rankings: separate 20-entry With/Without ranks, exact values, selector winners, and no isolated-Skill point;
- exactly two Efficiency selects, no duplicate quality-field control, all 60 plot points, category-scoped scores and complete frontier paths across all six fields, the selected three-condition trajectory, a collision-safe exact annotation, three-condition legend, 55–95 zoom disclosure, pointer-center selection, hover/focus inspection, one roving plot tab stop, directional navigation, and keyboard activation;
- Kanit confinement to capability-field scores and capability-header summary readings.

The lightweight repository guard verifies that the checked-in template still matches the accepted lock without launching Chrome:

```bash
cd /Users/erikhazzard/code/vasir
node --test test/vasirbenchmark-site-lock.test.js
```

## Fixture

`24 benchmarks × 20 settings × 3 conditions × 3 trials = 4,320 scored runs`

The default aggregate leader is GPT-5.6 Sol · max with Full Vasir at 89.8. Median Full Vasir effect is +3.8; Full improves 18 settings and regresses two. Those cross-category rankings are illustrative. Three Backend Architecture rows expose real development evidence comparing Minimal baseline against the isolated Architecture skill, with author calibration pending.
