# VasirBench design and scoring notes

## Durable interface

The accepted product is the complete square-and-rule benchmark explorer, not a temporary result card. Its durable parts are:

- a full-bleed warm-paper publication frame with black/lime editorial bands;
- a persistent capability index with saturated category rails and full-row desktop hover fills;
- Combined and named-capability leaderboards;
- benchmark-test and efficiency views in the same workspace;
- paired D3 0–100 profiles with a synchronized vertical comparison guide;
- direct named-capability dumbbells with exact endpoints;
- benchmark reports and desktop/mobile responsive behavior.

Changing the measured scope must never imply removing this interface. The shell and interactions remain while unsupported categories, metrics, and claims disappear.

## Current information architecture

The published Engineering result set currently has one measured category, so the field selector contains **Combined** and **Engineering**. Combined means an equal-weight aggregate across the three selected Backend Architecture benchmarks; it is not an additional category. Engineering exposes the same underlying scores as a single-capability change ranking.

Each field owns three views:

```text
Leaderboard      #capabilities/<scope>
Benchmark tests  #capabilities/<scope>/benchmarks
Efficiency       #capabilities/<scope>/efficiency
```

There are three stable report fragments under `benchmark-report.html`: `hyper-scale-chat`, `personalized-home-feed`, and `device-telemetry`.

## Quantitative contracts

The active score edition is `backend-architecture-panel-consensus-v2`, displayed as **Engineering v2**. Each response is scored by two fixed judges: GPT-6 Astra xhigh and Claude Fable 5.1 max. A judge prompt contains exactly one stable matched Minimal-baseline/Architecture-skill pair. Both judges must pass each gate; either failure applies its cap. Dimensions use the arithmetic mean of the two integer ratings, including half points, and no synthesizer participates. The benchmark recomputes the task's anchored 0–100 rubric score from that aggregate.

Each exact configuration and condition receives the equal-weight arithmetic mean of its three task scores. Architecture-skill uplift is that score minus the matched Minimal-baseline score in rubric points. Candidate membership is absent from both formulas: adding a model can change rank, but it cannot change any incumbent score or uplift. Row-local score hashes include only that response's rubric and two judge records.

The edition contains three tasks with one trial per task and condition: 36 settings, 216 preserved model responses, and 432 individual judge evaluations. Every saved response is rescored under Engineering v2 without regenerating its answer. Per-response judge spread is retained, but a confidence interval is not estimated from three one-trial tasks. A task, rubric, generation contract, judge panel, aggregation method, or trial-policy change starts a new edition; historical artifacts remain preserved. Saved model responses may be rescored without regeneration, and each judge/pair batch is resumable.

### Combined

Thirty-six matched model/reasoning settings are ordered by Architecture-skill absolute score; rank is derived and secondary. Ten rows render initially and a native disclosure expands all 36. The exact roster preserves the 30 published settings, including Claude Fable 5.1 at xhigh, max, and ultracode, and adds GPT-6 Astra at low, medium, high, xhigh, max, and ultra. Each row contains two aligned profiles—Architecture skill above Minimal baseline—on the same D3 linear `0–100` task-score scale. With one real category, the saturated Engineering segment ends at the exact absolute score and the remaining track stays empty. This preserves magnitude comparison rather than normalizing every row to full width.

The score surface owns one synchronized desktop guide. Pointer x is inverted through the same D3 scale used for bar geometry; the resulting rule spans the visible row list so a single x-position can be compared against every treatment and baseline endpoint. Keyboard focus on a segment places the guide at that segment endpoint. Touch layouts retain permanent exact labels and do not depend on hover.

### Engineering

Engineering rows use one D3 `0–100` dumbbell scale. A hollow circle marks Minimal baseline, a solid square marks Architecture skill, and the connector spans their exact centers. Regressions use the regression color; improvements use the saturated interaction color. Exact rubric scores remain the primary numeric role; rubric-point uplift and derived ranks are subordinate.

### Benchmark tests and reports

The ledger and reports show only the three selected tasks. Summary scores, win/tie/loss counts, completion, all 36 matched settings, latency, and token values are derived from the selected run artifacts. Reports explain the exact task and two-judge aggregation, and each setting exposes its exact selected generation messages and model output. Each condition also exposes a collapsed **Why this score** panel containing the two configured judge identities, individual scores, uncapped scores, gate ceilings, failed gates, and saved answer-specific rationales. These notes are bounded to 600 characters and are neither hidden deliberation nor synthesis. Raw judge prompts/completions, reviewer ids, hashes, sessions, local paths, receipts, usage, cost, and treatment content remain unpublished.

### Efficiency

The efficiency view contains 72 points: 36 settings × Minimal baseline and Architecture skill. The quality axis is the current fixed-edition absolute task score. Resource axes are mean latency and mean output tokens. Cost is absent until attribution coverage is complete. The frontier and selected setting trajectory are derived from the same points; there is no extra result roster.

## Interpretation

Public copy uses one compact label: **Engineering v2 · 3 tasks × 1 trial · 2 judges**. Calibration status remains internal score metadata rather than another visible banner. The treatment is the isolated **Architecture skill**, not the full Vasir system. The baseline is **Minimal baseline**. These results compare the displayed model settings on three Backend Architecture prompts; they do not represent broad Engineering performance or full Vasir and must never call the treatment “With Vasir” or “Full Vasir.”

## Visual system

Warm canvas, paper rows, ink, night, interaction blue, signal lime, and the saturated Engineering teal carry the publication hierarchy. Structural surfaces are square, ruled, and shadowless. Kanit 900 is confined to the wordmark, major titles, and high-signal score values; body copy uses the platform UI stack and scoring metadata uses the mono stack. Selection and condition never depend on color alone.

The desktop capability rail remains visibly thick at rest and expands across its row on fine-pointer hover without changing geometry; all row text switches to warm white. Mobile keeps the category accent persistent and never requires hover.

## Browser acceptance

The ten core canonical captures cover Combined, Engineering leaderboard, Engineering benchmark ledger, Overall efficiency, and the Hyper-scale chat report at desktop and mobile sizes. The browser harness checks the Engineering v2 score contract, rubric-point uplift, the exact compact edition label, all 36 report rows, collapsed-by-default prompt and judge-rationale disclosures plus exact visible input/output and two-review evidence for representative rows on all three reports, exact data cardinalities, independent open/close behavior, routes, keyboard behavior, D3 geometry, guide synchronization, responsive overflow, and network/runtime cleanliness. `template-lock.json` binds those accepted presentation files and captures; generated `data.js` and report-only `responses.js` are regenerated from the selected immutable runs for each release.
