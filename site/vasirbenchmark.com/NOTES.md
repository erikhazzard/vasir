# VasirBench canonical site template · design notes

This explanation records the accepted SDK-editorial production design for the canonical repository template in `site/vasirbenchmark.com/`. The renewed `template-lock.json` binds this square-and-rule redesign and its clean capture suite to the user-authorized `faedark` publication target; subsequent visual drift requires a fresh capture suite and renewed acceptance.

## Final information architecture

The compact masthead remains the publication frame. Directly below it, one capability explorer answers three related questions without changing shells:

1. **Model leaderboard:** Who is best overall or at this capability, and where does Vasir change the result?
2. **Benchmark tests:** Which tests and evidence make up that field?
3. **Efficiency:** What does that field’s quality cost?

The persistent field index begins with **00 Combined**, followed by the five real capability dimensions numbered **01–05**. Combined absorbs the former standalone Leaderboard rather than duplicating it: `#capabilities/overall` is the only aggregate ranking surface. The three-view rail sits inside the selected field’s canvas and switches between its ranking, benchmark inventory, and Efficiency plane. There is no higher-level Capabilities/Efficiency switcher.

The navigation hierarchy changes grammar at each level. On desktop, the six score fields form one persistent ruled index beneath a black section header. Each square row carries a mono index, category name, aligned best score, and a saturated category rail that remains roughly 11px wide at rest. On a fine-pointer hover that rail sweeps across the whole row in 150ms and all labels become warm white without changing geometry; keyboard focus gets the same full-color contrast immediately. The selected field remains a flat blue band with a persistent lime rail and explicit `Selected` label. Category color remains evidence identity, while blue communicates current state. The analytical canvas opens with a black editorial hero, oversized italic capability title, and lime readings. A compact three-way `View` ledger fills the canvas width; its current mode uses blue type and a hard blue underline on the same paper surface.

Tablet flattens the index into six equal ruled cells. Mobile turns it into a visible two-column grid, keeping all six fields discoverable without a hidden horizontal scroller. In every layout, Combined and named fields use the same index and three local views even though their ranking visualizations intentionally differ.

## State and routing

The durable state has one active capability field, one local view, one shared result selection, and one Efficiency resource metric:

```text
Capability field: overall | engineering | games | product | writing | workflows
Capability view: models | benchmarks | efficiency
Shared selection: selectedId
Resource metric: cost | latency | tokens
```

The explorer defaults to `overall` and `models`, producing `#capabilities/overall`. `#capabilities/<category>/benchmarks` and `#capabilities/<category>/efficiency` preserve both the selected field and local view through refresh, sharing, and browser history. Empty and unknown routes resolve to the Combined default. The legacy aliases use history replacement:

- `#leaderboard` → `#capabilities/overall`
- `#efficiency` → `#capabilities/overall/efficiency`
- `#vasir-effect` → `#capabilities/engineering`
- `#capabilities` → `#capabilities/overall`

A Combined row or named-capability row represents one model/reasoning setting and selects its Full Vasir entry. The same setting stays structurally highlighted when the field or local view changes. Efficiency can select any of the 60 condition entries; returning to either ranking preserves that matched setting.

Every weighted Combined segment is a native category drill control. Activating a segment on either composition preserves that row’s Full entry, opens `#capabilities/<category>`, selects the named category, and focuses its heading. Each 24px-minimum composition owns an independent five-button roving keyboard group; the larger six-field index remains the canonical category path.

## Capability contracts

### Combined

Combined is the aggregate Capabilities home, not a sixth category in the benchmark fixture. It uses the approved weighted Overall score and exposes all 24 tests in benchmark mode.

In model mode, 20 matched model/reasoning settings are ordered by With Vasir Overall score. The first 10 are shown initially; one disclosure expands the same ordered list to all 20 and can collapse it again. The header holds exactly three global readings:

- **Best with Vasir:** the leading Full Vasir aggregate score and setting.
- **Median uplift:** the median With-minus-Without movement across all 20 matched settings.
- **Improved settings:** improved settings out of 20, with regressions stated directly.

Every row shows two aligned five-segment compositions: **With Vasir** first and a quiet **Without Vasir** comparison immediately below. One vendored D3 linear scale maps `0–100` score points to the full track. Each segment's length is its weighted-point contribution, so the composition endpoint is the displayed composite and the empty tail makes model magnitude comparable across every row. Each segment label contains only its category abbreviation and raw `/100` score. Per-category uplift is intentionally absent because the paired scores already expose that comparison; the signed row uplift remains the single change callout. Condition ranks and exact Overall totals stay aligned. The two totals are the primary numeric role at `24/24` desktop and `18/18` compact; uplift is supporting context at `18/18` and `15/15`. All use the bundled Kanit 900 callout face with tabular lining numerals. There is no Skill row, filter, movement overlay, or baseline marker.

On a desktop fine pointer, the complete Combined score field behaves as one synchronized quantitative surface. Pointer x is inverted through the exact D3 scale used for every segment width, then rendered as a compact black/lime `/100` readout and a two-pixel black/paper rule spanning the whole visible result list. The rule follows the ruler rather than any single row, so one position compares all With and Without endpoints at once. Expanding from 10 to 20 settings remeasures the same guide against the new list height. Pointer exit clears it; keyboard focus on a segment places it at that segment's cumulative weighted contribution boundary. The overlay is non-interactive, has no spatial easing, causes no layout shift, and remains supplemental to permanent labels and accessible control text. Touch layouts keep those direct values and do not depend on hover.

Engineering (24%), Games (20%), Product Design (20%), Writing (16%), and AI Workflows (20%) determine the approved Overall composite. Width now truthfully encodes weighted contribution on the common score ruler; hue names the capability, direct labels carry raw scores, and the adjacent total provides exact lookup. Every native segment retains raw score, category weight, normalized weighted contribution, and category-delta metadata without rendering that delta as a third label token. The browser harness proves each segment's category-and-score-only visual label, metadata, width and cumulative endpoint, the five-point sum, the composite endpoint, and the paired uplift distance against fixture truth.

The ranking axis is the only header between the local mode rail and rows. It labels the two output columns simply as **Overall** and **Uplift**. The row pair already names With and Without Vasir, so the axis does not repeat condition hints or restate the shared scale. A redundant score-field title/count toolbar is intentionally absent; the Combined canvas header, mode tab, axis, and disclosure already communicate field, scope, and list state.

### Named capabilities

Engineering, Games, Product Design, Writing, and AI Workflows are capability-first comparisons. Their canvas header names the active field once and provides exactly two readings: **Leader with Vasir** and **Best without Vasir**. The independent baseline winner matters because it need not be the same setting as the With Vasir winner.

Each named field ranks all 20 settings by its With Vasir category score. Rows use one shared 0–100 dot/dumbbell scale: a neutral hollow Without marker, a blue square With Vasir marker, and a saturated six-pixel blue change band with darker top and bottom edges. The band preserves exact center-to-center endpoints while surviving pale selected rows, paper rows, high-resolution displays, and screenshot downsampling; the contextual full-width axis remains a quiet one-pixel rule. Red is reserved for an actual regression and receives the same high-contrast band treatment. The first cell combines primary rank with model/reasoning; exact condition scores, compact condition ranks, and signed With-minus-Without deltas remain aligned. Isolated Skill is deliberately absent.

The named-capability model view and Combined paired-composition view share the same `#capability-ranking` panel contract, but they do not share a row grammar. This distinction keeps Combined’s five-category composition legible while making a single capability’s direct score movement easy to compare.

### Benchmark tests

The local mode rail exposes the ranking, **Benchmark tests**, and **Efficiency** as peer views under every selected field. All three controlled tab panels remain mounted with exactly one visible, preserving `aria-controls`, focus, and view identity during switches.

The test index follows one durable hierarchy: **Capability → Track → Benchmark → Report**. Combined groups all 24 tests; each named field shows only its own tracks and tests. For example, Engineering contains the Backend Architecture track, which contains Hyper-scale chat, Personalized home feed, and High-volume device telemetry. Track headers explain the shared capability. Benchmark rows align intent, evidence-correct condition labels and scores, signed change, completion, outcomes, calibration, and a report action. The whole row is one native link. On mobile, the row stacks identity, matched comparison, evidence status, and action without horizontal scrolling.

Evidence layers remain explicit. The future five-category aggregate ranking is illustrative. The three current Backend Architecture rows are development evidence comparing **Minimal baseline** against the isolated **Architecture skill**, not Full Vasir, and remain calibration-pending. Other tests open visibly illustrative report previews and cannot be mistaken for measured runs.

## Efficiency contract

Efficiency belongs to the active capability field rather than a separate global page. All 60 configurations remain visible on a full-width quality × Cost/Latency/Tokens plane. The selected field is the quality axis, so the view has no duplicate quality-field selector. Its only native selects are **Selected result** and **Resource axis**. The editorial headline states the selected result's defensible finding—highest quality, on the frontier, or a dominated trade-off—without claiming an unstated universal notion of value.

The chart has a deliberate layer order: quiet population marks, the complete ink-black Pareto frontier, frontier nodes, the selected setting's blue Minimal → Skill → Full trajectory, then its selected mark and guide lines. Minimal is a hollow circle, Skill a diamond, and Full a square, so condition never depends on color. The quality scale is explicitly disclosed as a 55–95 zoom. Dominance requires quality `>=`, resource `<=`, and at least one strict inequality, preventing equal-quality higher-resource points from surviving.

Desktop docks the exact selected inspector in the empty corner opposite its point; the harness proves it stays inside the canvas and covers no frontier node. Hover and keyboard focus inspect another result with the same fields without changing the persistent selection. One roving plot tab stop and directional keys avoid a 60-stop tab sequence. Mobile removes the persistent overlay entirely and relies on the selected ring, guides, and adjacent exact-value summary, preserving the chart's scarce plotting area. Metric changes preserve object continuity with transform/opacity motion and become immediate under reduced-motion preference.

## Visual and responsive system

The site uses the SDK editorial system: warm canvas `#f3f1ea`, paper `#fffdf8`, ink `#151515`, night `#0c0d0f`, interaction blue `#1769ff`, deep blue `#0c4fd4`, and signal lime `#dfff65`. Category hues are evidence accents—dots, small rules, score-cell tints, and plot marks—not competing shells. Structural surfaces, rows, tabs, controls, score cells, summaries, and report sections use zero radius and no decorative shadow; only semantically circular markers remain round. Hierarchy comes from ruled boundaries, solid publication bands, type scale, and spacing.

Typography has three functional voices. Bundled Kanit 900 supplies the italic publication wordmark, oversized capability/report titles, and high-signal numeric callouts. The platform UI stack carries readable body and control copy. `SFMono-Regular`/Consolas supplies compact labels, indices, evidence metadata, and tabular numerals. Uppercase is reserved for short evidence, axis, and state labels with open tracking; body copy keeps normal casing and a readable line rhythm.

Font shipping remains one preloaded WOFF2 file with `font-display: swap`; the fixed mast and hero heights contain metric change during loading. Functional body UI stays on the platform stack. Localization policy: benchmark names, evidence claims, and descriptions wrap; model/reasoning labels may truncate only when the row cannot expand; capability cells reflow rather than squeeze; translated controls keep their minimum width; and non-Latin scripts must disable case transformation and added tracking rather than inheriting English all-caps assumptions.

At 390×844:

- the three local view tabs remain one compact, complete-width row;
- Combined exposes its three-reading summary, paired score matrices, exact totals, ranks, overall uplift, and show-all disclosure without document overflow;
- the named-capability capture opens Engineering and exposes its two readings plus complete dot/dumbbell rows;
- all six capability fields remain visible in one two-column ruled grid;
- named Capability rows reflow to identity, common track, direct paired readings, and delta;
- benchmark rows remain complete without horizontal document scrolling.

All primary controls are native, focus-visible, and reduced-motion safe. Selection never depends on color alone. On desktop fine pointers, an unselected capability field expands its saturated category ink from the persistent rail to the complete tab while every text layer switches to warm white; the return is slightly faster than the fill. The Combined score guide tracks pointer movement without interpolation because it is a precision instrument, while focus updates it immediately. Tablet and mobile keep a persistent 0.4rem category rule and never depend on hover for identity. Keyboard navigation is immediate, focus reproduces the full-color state without animation, and reduced-motion preference makes every state change instantaneous.

## Evidence captures and gates

- `desktop.png` and `mobile.png`: enter through legacy `#leaderboard`, then verify and capture the canonical default Combined model route.
- `desktop-capabilities.png` and `mobile-capabilities.png`: Engineering model leaderboard.
- `desktop-capability-benchmarks.png` and `mobile-capability-benchmarks.png`: Engineering benchmark-test index.
- `desktop-efficiency.png` and `mobile-efficiency.png`: Combined Efficiency at `#capabilities/overall/efficiency`.
- `desktop-benchmark-report.png` and `mobile-benchmark-report.png`: measured Hyper-scale chat report.

`capture.sh` regenerates all ten exact-viewport artifacts. The harness verifies the absence of global lens chrome; default and legacy routing; shared selection; the six-field selector; the desktop category rail’s opaque 8–16px resting width, full-tab hover width, warm-white text, and unchanged geometry; three-view tab semantics and complete-width geometry; Combined’s exact **Overall** and **Uplift** axis labels with no stale condition hints, three readings, 10/20 disclosure, paired score-matrix order, category-and-score-only segment labels with preserved delta metadata, exact contribution metadata, ranks, totals that remain at least two pixels larger than uplift at desktop and compact widths, and category drilldown; the synchronized guide's exact D3-inverted score, readout, two-pixel position, full 10/20-row height, segment-focus boundary, exit cleanup, and zero geometry shift; each named capability’s two readings, 20-row dot/dumbbell order, exact marker centers, and six-pixel bordered connector geometry across desktop and compact layouts; Engineering model and benchmark capture targets; all track/test metadata and report routes; bundled-Kanit readiness and confinement to approved headline values; and category-scoped 60-point Efficiency behavior with exactly two selects, complete Pareto paths, selected matched trajectories, collision-safe annotation, condition legend, pointer inspection, and roving directional focus. Fixture-wide checks cover Combined plus all five named fields in both ranking and Efficiency modes, not only the screenshot routes.

## Data contract

`data.js` remains the approved self-contained future-state fixture:

`24 benchmarks × 20 model/reasoning settings × 3 conditions × 3 trials = 4,320 scored runs`

It supplies 60 aggregate results, five categories, matched condition scores, cost, latency, tokens, 1,440 aggregate benchmark cells, and the two documented Full Vasir regressions.
