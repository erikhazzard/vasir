# VasirBench site

The dependency-free VasirBench production source. Open `index.html` directly; no local build step is required.

## Template lock

- **Canonical source:** `site/vasirbenchmark.com/`. This repository-owned directory supersedes the ignored working prototype under `.agents/vasir-evals/homepage-final-design/`.
- **Accepted production template:** An SDK-editorial benchmark ledger with warm paper, square ruled surfaces, black/lime publication bands, saturated capability colors, persistent category rails with full-row pointer sweeps, a synchronized D3 score guide and score-first numeric hierarchy for the Combined comparison field, high-contrast dumbbell change bands for named capabilities, Combined plus five job families, Leaderboard, Benchmark tests, Efficiency, and individual benchmark reports. The regenerated desktop and mobile captures are the accepted review artifacts bound by `template-lock.json` and published to `vasirbenchmark.com` through `faedark`.
- **Change rule:** Preserve the information architecture, visual system, interaction grammar, responsive behavior, and evidence boundaries unless an explicit product decision changes them. Any material interface change must regenerate and pass `./capture.sh`, then receive a new human visual acceptance verdict.
- **Deployment boundary:** The accepted template is live at `https://vasirbenchmark.com` in AWS account `339713108333` through `faedark`. Stack `vasirbenchmark-production` owns the private S3/OAC origin, CloudFront distribution and release router, ACM certificate, and Route 53 apex aliases; `vasir benchmark publish` is the sole supported publication path.

## Product explorer

One persistent capability index and one three-way view switcher expose the whole benchmark. Choose **Combined** or one of five named fields, then move between the model leaderboard, benchmark tests, and Efficiency without changing context.

- `#capabilities/overall` — the default **Combined** field. It ranks matched model/reasoning settings by the weighted Overall With Vasir score. Every With/Without composition uses the same D3 0–100 ruler: each category segment spans its weighted-point contribution, the endpoint equals the composite score, and the unfilled tail makes cross-model magnitude directly comparable. On desktop fine pointers, hovering anywhere on that shared ruler produces one exact score readout and one synchronized vertical guide across every visible comparison row; focusing a segment places the same guide at its cumulative contribution boundary. Segment labels contain only the category abbreviation and raw `/100` score; redundant per-category uplift tokens are omitted while the data contract retains each delta. The first 10 settings are visible initially, with an explicit control to show all 20. Three summary readings report the best With Vasir result, median uplift, and improved/regressed settings.
- `#capabilities/<category>` — a named capability comparison for `engineering`, `games`, `product`, `writing`, or `workflows`. Each field shows 20 With/Without comparisons on one dot/dumbbell scale. A saturated six-pixel change band with darker top and bottom edges connects the hollow Without circle to the solid With square, making the interval immediately legible while the marker centers remain the exact endpoints. Two header readings report Leader with Vasir and Best without Vasir.
- `#capabilities/<category>/benchmarks` — the constituent benchmark index for the active field, grouped into named tracks. Combined exposes all 24 tests; named fields expose their own tests. Every test opens a cohesive report route. The three current Backend Architecture reports expose a truthful local-evidence boundary without publishing ignored-workspace URLs; future-suite previews remain explicitly illustrative.
- `#capabilities/<category>/efficiency` — all 60 results on a synchronized quality × resource plane using the active capability as the quality field. The plot connects the complete Pareto frontier, traces the selected setting from Minimal through Skill to Full, and keeps exact selection detail in a collision-safe inspector. The selected result and resource-axis controls remain local to this view; there is no duplicate quality-field selector.

Combined is a presentation field, not a sixth fixture category. `#leaderboard` is retained as a legacy entry point and canonicalizes to `#capabilities/overall`. Legacy `#efficiency` canonicalizes to `#capabilities/overall/efficiency`; `#vasir-effect` canonicalizes to `#capabilities/engineering`, where the matched deltas now live. Empty and invalid routes resolve safely to the Combined default.

The selected model/reasoning setting persists across all six capability fields and all three views. A Combined or named-capability row selects its Full Vasir entry; Efficiency retains all three conditions.

## Files

- `index.html` — semantic publication and one permanent capability workspace.
- `style.css` — responsive SDK-editorial ledger system and interaction states.
- `assets/d3.v7.min.js` — vendored D3 v7.9 runtime for shared quantitative scales.
- `assets/kanit-latin-900-normal.woff2` — bundled first-party Kanit face for approved publication headlines and numeric callouts.
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
- exactly three Combined summary readings with fixture-matched leader, median uplift, and improved-setting values;
- 10 collapsed and 20 expanded Combined settings in With-rank order, with a single native show-all disclosure;
- exactly two ordered score matrices per Combined row—With Vasir first, Without Vasir second—with five fixture-matched capability controls apiece, category-and-score-only visual labels, preserved delta metadata, D3 v7.9 present, every segment and composite endpoint plotted on one rendered 0–100 scale, exact contribution sums in the evidence contract, condition-specific ranks, aligned Overall totals that remain typographically dominant over the supporting uplift, and no baseline marker;
- a desktop synchronized score guide whose pointer position is inverted through that same D3 scale, whose exact readout and two-pixel rule align with the requested score, whose rule spans the full result list at both 10 and 20 rows without geometry shift, whose segment-focus position matches the cumulative weighted endpoint, and which clears after pointer or focus exit;
- native 24px-minimum segment drilldown for both compositions across all five named capabilities, including independent roving keyboard groups, category state, hash, selection, and focus;
- one readable six-field selector, exactly one structural `Selected` state, saturated persistent category rails, a desktop rail that expands from 8–16px to the full tab without geometry shift while every label switches to warm white, and a stable local mode rail;
- named capability captures opening Engineering models with 20 dot/dumbbell rows, two condition readings, direct ranks, exact scores, deltas, two markers, and high-contrast six-pixel change bands aligned center-to-center on the shared 0–100 scale;
- benchmark captures opening Engineering benchmarks with exact track/test order, score pair, delta, completion, W/T/L, calibration, evidence kind, and report route;
- report hierarchy, truthful measured labels, zero public source links, explicit local-evidence boundaries, section deep links, fixture disclaimers, and responsive overflow;
- exhaustive fixture validation for Combined and all five named capability rankings: separate 20-entry With/Without ranks, exact values, selector winners, and no isolated-Skill point;
- exactly two Efficiency selects, no duplicate quality-field control, all 60 plot points, category-scoped scores and complete frontier paths across all six fields, the selected three-condition trajectory, a collision-safe exact annotation, three-condition legend, 55–95 zoom disclosure, pointer-center selection, hover/focus inspection, one roving plot tab stop, directional navigation, and keyboard activation;
- Kanit confinement to the approved publication headline and callout selectors.

The lightweight repository guard verifies the accepted lock without launching Chrome. Any source, harness, font, or capture drift fails closed until the canonical capture suite passes again and a user renews the visual acceptance verdict:

```bash
cd /Users/erikhazzard/code/vasir
node --test test/vasirbenchmark-site-lock.test.js
```

## Fixture

`24 benchmarks × 20 settings × 3 conditions × 3 trials = 4,320 scored runs`

The default aggregate leader is GPT-5.6 Sol · max with Full Vasir at 89.8. Median uplift is +3.8; Full improves 18 settings and regresses two. Those cross-category rankings are illustrative. Three Backend Architecture rows expose real development evidence comparing Minimal baseline against the isolated Architecture skill, with author calibration pending.
