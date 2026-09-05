# VasirBench site

The dependency-free production source for `https://vasirbenchmark.com`. The site keeps the accepted full-bleed SDK-editorial benchmark interface and renders the selected Engineering v2 results.

## Current Engineering v2 results

The September 2026 release projects three digest-pinned Backend Architecture runs:

- Hyper-scale chat architecture
- Personalized home-feed architecture
- High-volume device telemetry architecture

Together they contain one Engineering category, three benchmarks, 36 matched model/reasoning settings, two conditions, 72 aggregate condition entries, 216 prompt-level result cells, and 432 individual judge evaluations. The field preserves the 30 published settings, including Claude Fable 5.1 at xhigh, max, and ultracode, and adds GPT-6 Astra at low, medium, high, xhigh, max, and ultra. The compared conditions are **Minimal baseline** and the isolated **Architecture skill**.

`Claude Fable 5.1 · Ultracode` is the v2 execution mode: xhigh plus exactly one single-phase Workflow with exactly one local, uncached Fable 5.1 worker. Ultracode rows run serially after ordinary rows with Claude's `small` workflow-size guideline and a 15-minute Workflow wait ceiling inside the 20-minute harness deadline. Claude Code 2.1.257-or-newer receipts must prove that complete lifecycle and exact worker identity or the row fails closed. Claude Code may also make ancillary Haiku 4.5 query-pipeline calls; measured runtime and cost include that traffic.

All 216 saved responses are rescored under this edition without regenerating the answers; prior edition artifacts remain preserved.

The site describes this compactly as **Engineering v2 · 3 tasks × 1 trial · 2 judges**. It is a development comparison of three Backend Architecture tasks with one trial per condition. Calibration remains score metadata rather than repeated interface chrome. Raw run artifacts remain private; the report-only inspector publishes the selected generation evidence and a tightly allowlisted judge-rationale projection. Cost is not rendered because attribution is incomplete.

## Score contract

The active score edition is `backend-architecture-panel-consensus-v2`, displayed as **Engineering v2**. Each benchmark owns a fixed 0–100 rubric. One stable matched Minimal/Architecture pair is sent independently to the same two judges:

- `codex:gpt-6-astra@xhigh`
- `claude:claude-fable-5-1@max`

There is no synthesizer. The aggregation method is `unanimity-gates-mean-dimensions-v1`: both judges must pass each gate, and either failure applies its cap. Dimensions use the arithmetic mean of the two integer ratings, including half points. The task score is recomputed from those means before applying the lowest failed-gate cap. Every configuration/condition score is then the equal-weight arithmetic mean of its three task scores:

```text
absolute score = (chat score + feed score + telemetry score) / 3
uplift = Architecture skill absolute score - Minimal baseline absolute score
```

Uplift is reported in rubric points. Rank is a derived, secondary field: adding another model can change rank, but it cannot change any incumbent score or paired uplift. A new model therefore requires only its six responses and six judge calls under the frozen edition. Each incumbent score has a row-local basis and is never rescored merely because the field changed.

Saved generations may be rescored when the scoring edition changes; a rescore uses one pair per prompt, checkpoints every judge/pair batch, and resumes without regenerating model answers. A change to the task set, rubric, generation contract, judge panel, aggregation method, or trial policy starts a new edition rather than mixing incompatible scores. This edition has one trial per task and does not estimate a confidence interval; per-response judge spread is retained for inspection.

## Product explorer

The permanent capability index opens either **Combined** or **Engineering**, with three local views:

- `#capabilities/overall` — 36 settings ordered by Architecture skill absolute score, with rank shown as secondary metadata. The first ten rows are visible initially and one disclosure expands all 36. Each row compares Architecture skill and Minimal baseline on the same D3 0–100 task-score scale. The colored endpoint is quantitative; the empty tail preserves comparison across rows. Pointer movement on desktop produces one synchronized vertical guide across the visible chart.
- `#capabilities/engineering` — the same scores as a direct Engineering score-change leaderboard. Hollow baseline circles, solid treatment squares, and high-contrast connectors share one 0–100 D3 scale.
- `#capabilities/<scope>/benchmarks` — the three real benchmark summaries, exact prompt-local scores and outcomes, method notes, and stable report links.
- `#capabilities/<scope>/efficiency` — all 72 condition entries on quality × latency or quality × output-token planes. Cost is intentionally absent.
- `benchmark-report.html#<benchmark-id>` — one report for each selected task, including the exact prompt, aggregate condition result, outcomes, all 36 matched settings, scoring method, limitations, exact model inputs/outputs, and two saved judge rationales per response.

`#leaderboard`, `#efficiency`, `#vasir-effect`, and `#capabilities` remain safe legacy entry points and canonicalize to the corresponding capability route.

## Data and publication flow

Do not hand-edit public result values or responses in the site source. `benchmarks/public-results.json` pins the selected run paths and SHA-256 digests. `cli/eval/benchmark-publication-projection.js` verifies those immutable inputs and derives Engineering v2 scores, paired rubric-point uplift, task scores, derived ranks, outcomes, latency, token usage, and score-method metadata into `data.js`. It separately derives the exact selected generation inputs and model outputs plus each response's two source-joined judge scores, gate mechanics, and saved bounded rationales into the report-only `responses.js` bundle. The publisher generates both modules inside the candidate artifact. Raw judge prompts/completions, reviewer ids, hashes, sessions, receipts, usage, cost, and local paths never cross that public boundary.

The supported one-command path is:

```bash
node ./bin/vasir.js benchmark publish
```

It regenerates the Engineering projection, validates the accepted browser surface, builds the immutable ten-file release, targets the fixed `faedark` account, stages and activates the release, invalidates `/`, `/index.html`, and `/benchmark-report.html`, and verifies the exact live bytes and browser routes. The limits remain 2 MiB per file, 5 MiB for the full artifact, and 256 KB compressed for landing dependencies. Use `--dry-run` for the same local build and read-only AWS plan.

## Files

- `index.html`, `style.css`, `app.js` — the capability explorer shell, styles, and D3 interaction logic.
- `benchmark-report.html`, `benchmark-report.css`, `benchmark-report.js` — the benchmark report shell and renderer.
- `assets/d3.v7.min.js` — vendored D3 v7.9 runtime.
- `assets/kanit-latin-900-normal.woff2` — bundled display face for approved headline and numeric roles.
- `data.js` — local inspection snapshot; publication regenerates this module from the pinned selected runs.
- `responses.js` — report-only local inspection snapshot; publication regenerates its exact input/output and bounded judge-rationale records from the same runs.
- `capture.mjs`, `capture.sh` — the desktop/mobile interaction and capture harness.
- `template-lock.json` — the user-authorized presentation and capture receipt.

## Local review and QA

```bash
cd /Users/erikhazzard/code/vasir/site/vasirbenchmark.com
./capture.sh
```

The harness regenerates ten 1440×1000 and 390×844 captures: Combined, Engineering leaderboard, Engineering benchmarks, Overall efficiency, and Hyper-scale chat report. It also performs transient main-page and report audits at 820×1000, and fails if any rendered Claude Fable 5.1 identity has `scrollWidth > clientWidth`. The same run checks the Engineering v2 contract, rubric-score and uplift language, the compact `Engineering v2 · 3 tasks × 1 trial · 2 judges` disclosure, real-data cardinalities, all-setting reports, collapsed-by-default exact input prompts and judge rationales, independent native disclosure behavior, exact two-judge identities/scores/mechanics/notes, complete model outputs, route closure, D3 geometry, synchronized guide, responsive behavior, accessible interactions, runtime/network errors, and overflow.
