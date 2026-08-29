# VasirBench canonical site template · design notes

This document records the accepted design contract for the canonical repository template in `site/vasirbenchmark.com/`. Material departures require an explicit product decision, a clean capture suite, and renewed human visual acceptance.

## Final information architecture

The compact masthead remains the publication frame. Directly below it, one capability explorer answers three related questions without changing shells:

1. **Model leaderboard:** Who is best overall or at this capability, and where does Vasir change the result?
2. **Benchmark tests:** Which tests and evidence make up that field?
3. **Efficiency:** What does that field’s quality cost?

The persistent field index begins with **00 Combined**, followed by the five real capability dimensions numbered **01–05**. Combined absorbs the former standalone Leaderboard rather than duplicating it: `#capabilities/overall` is the only aggregate ranking surface. The three-view rail sits inside the selected field’s canvas and switches between its ranking, benchmark inventory, and Efficiency plane. There is no higher-level Capabilities/Efficiency switcher.

The navigation hierarchy changes grammar at each level. On desktop, the six score fields form a persistent left index. Every field owns a broad, contrast-matched category-color number spine with a narrow full-chroma outer edge; the selected field switches its main body to cobalt and adds an explicit `Selected` label. Category color communicates identity. Cobalt communicates interaction and current state. The analytical canvas repeats category identity with one narrow field-color rule. A compact three-way `View` rail fills the canvas width without competing with the active field: its current mode uses a pale-blue surface, blue type, and cobalt underline rather than a second solid-cobalt block.

Tablet flattens the index into six equal cells. Mobile turns it into a legible horizontal scroller whose cards retain the numbered identity spine. In every layout, Combined and named fields use the same index and three local views even though their ranking visualizations intentionally differ.

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
- **Median Full effect:** the median With-minus-Without movement across all 20 matched settings.
- **Full outcomes:** improved settings out of 20, with regressions stated directly.

Every row shows two aligned weighted compositions on one 0–100 scale: full-chroma **With Vasir** first and a muted **Without Vasir** comparison immediately below. Rank language is condition-specific among 20 settings, exact totals remain aligned, and one signed delta completes the pair. There is no Skill bar, filter, movement overlay, or baseline marker.

Engineering (24%), Games (20%), Product Design (20%), Writing (16%), and AI Workflows (20%) begin with the fixture’s rounded category score × category weight. The five contributions are proportionally normalized to the approved Overall composite so each composition’s widths sum exactly to its displayed total without presenting the profile as additive Elo.

The dark axis is the only ranking header between the local mode rail and rows. A redundant score-field title/count toolbar is intentionally absent; the Combined canvas header, mode tab, axis, and disclosure already communicate field, scope, and list state.

### Named capabilities

Engineering, Games, Product Design, Writing, and AI Workflows are capability-first comparisons. Their canvas header names the active field once and provides exactly two readings: **Leader with Vasir** and **Best without Vasir**. The independent baseline winner matters because it need not be the same setting as the With Vasir winner.

Each named field ranks all 20 settings by its With Vasir category score. Rows use one shared 0–100 dot/dumbbell scale: a neutral hollow Without marker, a blue square With Vasir marker, and a direct blue connector. Red is reserved for an actual regression. The first cell combines primary rank with model/reasoning; exact condition scores, compact condition ranks, and signed With-minus-Without deltas remain aligned. Isolated Skill is deliberately absent.

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

The report uses the Idavoll SDK light system: warm canvas `#ece9e0`, paper `#fffdf8`, ink `#151515`, interaction blue `#1769ff`, and one bright, white-text-safe identity color per capability—slate-blue `#3977a7`, Engineering teal `#008094`, Games green `#00873a`, Product amber `#ac6400`, Writing coral `#d63a30`, and Workflows violet `#844cff`. Category tokens drive composition segments, selector spines, and content accents; interactive hover, focus, and selected states use blue. Panels stay square with hard rules and no shadows, gradients, skewed panels, or decorative clipping. The publication shell begins at the viewport edge, fills at least one dynamic viewport height, and ends in a full-width dark SDK footer; content remains bounded by the reference system’s readable maximum width.

The typography budget is two families: the platform UI stack (`Avenir Next`, `Segoe UI`, `Helvetica Neue`, Arial, sans-serif) for functional and explanatory roles, plus bundled Kanit 900 for capability-field scores and capability-header summary readings. Row scores, ranks, and deltas use the data face with tabular numerals so the hierarchy stays calm and alignment remains exact. Functional weights are 400, 600, 700, and an 800 data emphasis. Sentence case carries category and model identity; uppercase is confined to compact metadata and condition labels.

At 390×844:

- the three local view tabs remain one compact, complete-width row;
- Combined exposes its three-reading summary, paired compositions, exact totals, ranks, delta, and show-all disclosure without document overflow;
- the named-capability capture opens Engineering and exposes its two readings plus complete dot/dumbbell rows;
- all six capability fields remain reachable in one contained horizontal scroller;
- named Capability rows reflow to identity, common track, direct paired readings, and delta;
- benchmark rows remain complete without horizontal document scrolling.

All primary controls are native, focus-visible, and reduced-motion safe. Selection never depends on color alone. On fine pointers, unselected capability fields receive a restrained blue interaction wash while their category spine preserves identity. Pointer-driven field or view changes use one restrained opacity-plus-vertical handoff. Keyboard navigation is immediate, and reduced-motion preference makes both effects instantaneous.

## Evidence captures and gates

- `desktop.png` and `mobile.png`: enter through legacy `#leaderboard`, then verify and capture the canonical default Combined model route.
- `desktop-capabilities.png` and `mobile-capabilities.png`: Engineering model leaderboard.
- `desktop-capability-benchmarks.png` and `mobile-capability-benchmarks.png`: Engineering benchmark-test index.
- `desktop-efficiency.png` and `mobile-efficiency.png`: Combined Efficiency at `#capabilities/overall/efficiency`.
- `desktop-benchmark-report.png` and `mobile-benchmark-report.png`: measured Hyper-scale chat report.

`capture.sh` regenerates all ten exact-viewport artifacts. The harness verifies the absence of global lens chrome; default and legacy routing; shared selection; the six-field selector; three-view tab semantics and complete-width geometry; Combined’s three readings, 10/20 disclosure, paired composition order, exact normalized widths, ranks, totals, deltas, and segment drilldown; each named capability’s two readings and 20-row dot/dumbbell order; Engineering model and benchmark capture targets; all track/test metadata and report routes; bundled-font readiness and confinement; and category-scoped 60-point Efficiency behavior with exactly two selects, complete Pareto paths, selected matched trajectories, collision-safe annotation, condition legend, pointer inspection, and roving directional focus. Fixture-wide checks cover Combined plus all five named fields in both ranking and Efficiency modes, not only the screenshot routes.

## Data contract

`data.js` remains the approved self-contained future-state fixture:

`24 benchmarks × 20 model/reasoning settings × 3 conditions × 3 trials = 4,320 scored runs`

It supplies 60 aggregate results, five categories, matched condition scores, cost, latency, tokens, 1,440 aggregate benchmark cells, and the two documented Full Vasir regressions.
