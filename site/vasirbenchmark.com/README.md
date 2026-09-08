# VasirBench site

The dependency-free production source for `https://vasirbenchmark.com`. The site keeps the accepted full-bleed SDK-editorial benchmark interface and renders the selected Engineering v2 results.

## Games pilot

`#capabilities/games` opens the native Games category with the shared compact Leaderboard, a benchmark collection and recorded-time Efficiency. Its row spacing, typography, 0–100 axis, circle/square markers and selected state reuse Engineering's components. Individual scores carry a dagger and compact judge count; detailed review evidence remains in the report. `games.html?benchmark=2d-jumping-demo` compares the selected task’s fresh mobile game submissions with recorded playback and isolated playable builds. `benchmarks/2d-jumping-demo/publication.json`, when present, pins the generation run, rubric, source-bound media and independent assessments. Game tasks retain their own ratings; this addition preserves existing Engineering, AI Workflows and Overall score projections. The five ordinary model rows include GPT-6 Astra Ultra with its fresh single-prompt bare game, Mossbound, and the designated Ash & Echo revision 23 Vasir output. Creation history is available in methodology details. The Ultra difference compares assessed artifacts with different creation methods; it is not a controlled estimate of the skills’ effect.

The sole contestant prompt is “Create a 2D jumping platformer for mobile browsers in portrait mode. Pick a strong art direction.” Bare receives no extra coaching or repair pass. For the four original paired configurations, the Vasir condition adds native discovery of the frozen skill catalog. Each provider keeps its normal coding tools, with shared browser/image tools and a 60-minute execution cap. Build completion, observed functionality and model quality ratings are distinct states. See the [experiment work spec](../../docs/work/vasir-benchmarking/2d-jumping-demo/work-spec.md) for current execution and proof status.

Public runtime files and recordings use immutable paths on the distribution hostname, separate from the benchmark site origin. The publisher rejects artifact execution on the apex domain, applies a restricted game CSP and verifies every selected artifact's bytes. `games-browsercheck.mjs` exercises playback, game activation, cleanup and origin isolation at desktop and mobile sizes. Capture and judging happen after submission and cannot improve the contestant.

## Writing category

`#capabilities/writing` opens one category-wide Writing leaderboard. The category header leads directly to **Leaderboard / Benchmark tests / Efficiency**, following the existing Overall and Engineering hierarchy. The leaderboard reuses Overall's paired stacked bars, with one segment per measured Writing subcategory. Clicking a segment opens that subcategory's track in Benchmark tests. The ledger groups Core idea and Plot twists under Storytelling, plus any separately published tracks such as Dungeon Master; it does not replace the category with a selected benchmark. Unmeasured Prose and Poetry appear in the method disclosure, never as invented score segments.

The category is explicitly an **uncalibrated development index**, derived without mutating the raw benchmark projections. A benchmark joins the active cohort when it has at least one complete paired configuration under its original headline rules. Measured subcategories share equal weight; active benchmarks within a subcategory share equal weight. Every ranked setting must complete the identical active benchmark cohort under both conditions. Missing scores are never zero or a basis for per-model weight renormalization. Resource means use the same weights and require complete recorded resource evidence. A changing active cohort changes this display index; it does not rescore any benchmark. The index is not a calibrated measure of general writing ability and remains excluded from Overall.

Old `#capabilities/writing/storytelling[/mode]` and `#capabilities/writing/dungeon-master[/mode]` links canonicalize to the Writing category while preserving mode. `?writing=<benchmark-id>` remains a focus hint in Benchmark tests, not a dataset filter. Report deep links stay benchmark-specific. Selecting a model exposes its original benchmark answers; models without index coverage remain inspectable in an unranked coverage section.

**Plot twists** asks exactly “Create a brief outline of a scifi story with one or more major plot twists”. Four configured runtimes each receive ten fresh plain and ten fresh skill-assisted attempts. The treatment adds the frozen master skill and mandatory verified reading of its twists reference. Astra and Sol xhigh independently judge eligible pairs against seven weighted dimensions. Reports use `benchmark-report.html#storytelling-plot-twists/scifi-outline/trial-N`, with a ten-trial selector and trial-specific joins. The final snapshot retains 80 outputs, 78 valid generations, 152 completed assessments and eight terminally excluded assessment slots. Astra/Terra's incomplete ten-pair headline scores remain withheld; Sol/Luna have complete cohorts. This is a same-provider outline-design experiment, not a human-reader surprise test. See [full results](../../docs/work/vasir-benchmarking/storytelling-plot-twists/results.md).

**Dungeon Master / Adventure outline** compares the exact prompt “create an outline for TTRPG adventure” in six fresh pairs, plus five transfer prompts with two pairs each. Both writers and the two independent reviewer seats request Astra Ultra. The report at `benchmark-report.html#dungeon-master-adventure-outline` preserves all sixteen pairs, six equal 0–5 dimensions, opposite candidate order for the second reviewer, direct preferences and repair flags. Its headline averages only the six primary repetitions; transfer scores remain separate. All thirty-two valid answers are retained. Fifteen of sixteen skill answers have complete required-reference proof; the original answer with incomplete proof remains scored under the frozen intention-to-invoke policy. The full frozen skill, actual prompts, answers and review evidence are inspectable, with operational interruptions disclosed separately from the intended protocol. See [results](../../docs/work/vasir-benchmarking/dungeon-master-adventure-outline/results/results.md) and the [qualitative audit](../../docs/work/vasir-benchmarking/dungeon-master-adventure-outline/qualitative-audit.md).

**Core idea** is a fixed corpus of story cases, each asking for core-idea analysis under Plain answer and the frozen Storytelling skill. Stories are cases within that benchmark, not separate top-level benchmarks. Its report retains the story selector, exact questions and answers, inspectable rubric anchors, individual judge evidence and frozen-input methodology. A lone saved review is evidence, not a complete panel score. Dungeon Master retains its own case/cohort schema and is not forced into the Storytelling repeated-trial schema.

The landing `data.js` contains only a Writing availability and coverage summary. The Writing route loads `writing-data.js`; its report loads `writing-responses.js`. Both URLs resolve relative to the release-qualified renderer, so the immutable release remains consistent. The report deduplicates all archived skill files, renders each once under Method, and links both the skill instruction and recorded reference-file reads to that archive. Collapsed execution details expose recorded model/effort verification, runtime mode, collaboration-event counts, stream-retention status, answer characters and saved CLI-normalized usage when available. A CLI session does not establish the number of underlying model agents. Usage fields absent from the saved receipt remain unknown; historical CLI normalizers synthesized some zero components, so saved zero does not establish provider-reported zero. Distinct provider cache fields remain separate. Judge resource counts belong to a shared two-candidate batch and must be deduplicated by judge and prompt SHA-256, not summed per answer. All values and transcripts are publisher-derived; no fixture results belong in these bundles.

`writing-browsercheck.mjs --url URL --output-dir PATH --width 1440 --height 1000` checks real projected data in Chrome; repeat at 390 × 844 and 820 × 1000. Every run independently recomputes the category's active cohort, subgroup weights, score/resource arithmetic, ranks and stacked contributions from the original publications, and checks the category hierarchy, group navigation, coverage gaps, legacy routes and lazy bundles. It separately resolves the requested report projection (`--benchmark storytelling-plot-twists` for Plot twists), then checks original question/answer/trial joins, runtime evidence, every rubric anchor and archived file, and errors/overflow. Receipts include loaded JavaScript hashes and separate category/report evidence. Screenshots wait for finite UI animations to settle. No synthetic result data is supplied.

For a scored release, add `--require-scored`. This refuses a snapshot without any complete same-corpus paired configuration and requires observed complete panels plus populated latency and token frontiers. The harness recomputes panel/corpus arithmetic, exact-score ranks and co-leaders from the real records, verifies disagreement and per-story means, and records which scored branches were actually exercised in `scoredBranchCoverage`. Ties or regressions that do not occur remain zero observed cases, not fabricated coverage. See the [final scored-snapshot readiness checklist](../../docs/work/vasir-benchmarking/storytelling-core-idea/scored-site-readiness.md) before renewing shared acceptance.

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

The capability index opens **Overall**, **Engineering**, **Games**, **Writing**, or **AI Workflows**, with local views. Games and Writing remain excluded from the Overall index:

- `#capabilities/overall` — 26 complete paired settings ordered by the declared category-weighted score across Engineering and AI Workflows. Ten settings with missing task coverage remain unscored. The method exposes measured index coverage and target category weights. Each row compares task-local skill and Minimal baseline on the same D3 0–100 scale, with one synchronized pointer guide on desktop.
- `#capabilities/engineering` — 36 paired settings on the Engineering score-change leaderboard. Hollow baseline circles, solid treatment squares, and high-contrast connectors share one 0–100 D3 scale.
- `#capabilities/games` — task-specific shared leaderboards with condition ranks, complete ratings, descriptive Score Δ, a Benchmarks collection, and the shared Efficiency chart using recorded generation time. Ranks and header leaders use complete panels that pass the functional eligibility checks. Completed diagnostic ratings remain numerical with an explicit qualification. For a single benchmark, the header shows the actual eligible Bare and With Vasir leaders. Selecting a row or chart point exposes its report link. Incomplete panels retain individual scores without an invented combined score, rank or difference. Multiple tasks stay separate until a cross-task aggregation protocol exists.
- `#capabilities/ai-workflows` — 26 paired settings for the one-task work-spec comparison, with its own benchmarks, efficiency view and saved response evidence.
- `#capabilities/writing` — category-wide paired stacked bars with measured-subcategory contributions; append `/benchmarks` for grouped tests or `/efficiency` for the same index's recorded resources. Benchmark-specific reports remain independent. Old subsection links are aliases, not alternative hierarchies.
- `#capabilities/<scope>/benchmarks` — the selected scope's real benchmark summaries, exact prompt-local scores and outcomes, method notes, and stable report links.
- `#capabilities/<scope>/efficiency` — the selected scope's condition entries on quality × latency or quality × output-token planes. Games uses its recorded generation wall time alongside ratings and preserves timeout status; Ash & Echo has no comparable generation budget and is therefore absent from the time plot. Cost is intentionally absent.
- `benchmark-report.html#<benchmark-id>` — one report for each selected Engineering or AI Workflows task, including the exact prompt, aggregate condition result, outcomes, all matched settings, scoring method, limitations, exact model inputs/outputs, and two saved judge rationales per response.
- `benchmark-report.html?setting=<setting-id>#storytelling-core-idea/<case-id>` — the one Core idea benchmark with a selected story and model/reasoning setting, paired answers and all available Writing evidence.

`#leaderboard`, `#efficiency`, `#vasir-effect`, and `#capabilities` remain safe legacy entry points and canonicalize to the corresponding capability route.

## Data and publication flow

Do not hand-edit public result values or responses in the site source. `benchmarks/public-results.json` pins the selected run paths and SHA-256 digests. `cli/eval/benchmark-publication-projection.js` verifies those immutable inputs and derives Engineering v2 scores, paired rubric-point uplift, task scores, derived ranks, outcomes, latency, token usage, and score-method metadata into `data.js`. It separately derives the exact selected generation inputs and model outputs plus each response's two source-joined judge scores, gate mechanics, and saved bounded rationales into the report-only `responses.js` bundle. `benchmarks/storytelling-core-idea/publication.json` separately pins the Writing run, corpus and frozen skill; `cli/eval/writing-publication.js` derives its summary and lazy data/answer bundles. The publisher generates all four modules inside the candidate artifact. Writing deliberately publishes an allowlisted set of reviewer configuration IDs, fingerprints, execution labels and resource counts for inspection; private session IDs, local paths, raw provider streams and provider-internal instructions remain outside that boundary.

The supported one-command path is:

```bash
node ./bin/vasir.js benchmark publish
```

It regenerates the selected projections, validates the accepted presentation, builds the immutable fifteen-file site release, targets the fixed `faedark` account, stages and activates the release, invalidates the four HTML entrypoints including `/games.html`, and verifies the live site bytes. Normal publication reuses unchanged assets from the last verified manifest, checks publication ownership at phase boundaries, and batches live HTTP checks. One retained game HTML isolation probe remains; the full asset library and browser suite are not rechecked on every deploy. Use `--full-audit` only when an exhaustive asset and browser audit is wanted. Output distinguishes fresh byte checks, reused assets and whether browser tests ran.

Site limits are 2 MiB per ordinary file, 8 MiB each for `responses.js` and `writing-responses.js`, 16 MiB total, and 300 KB compressed landing dependencies. Every candidate reports its own measured bytes and remaining budget. The previous 272 KB landing cap was revised for additional source-bound assessments and the fresh Ultra game output; recordings, playable builds and the full Writing bundles remain lazy. Selected game runtime/media assets have a separate 512 MiB/2048-file bound and count toward the same 1 GiB physical storage cap. Use `--dry-run` for the same local build and read-only AWS plan.

## Files

- `index.html`, `style.css`, `app.js` — the capability explorer shell, styles, and D3 interaction logic.
- `benchmark-report.html`, `benchmark-report.css`, `benchmark-report.js` — the benchmark report shell and renderer.
- `games.html`, `games.css`, `games.js` — paired game playback, playable artifacts, assessments and creation-method details.
- `assets/d3.v7.min.js` — vendored D3 v7.9 runtime.
- `assets/kanit-latin-900-normal.woff2` — bundled display face for approved headline and numeric roles.
- `data.js` — local inspection snapshot; publication regenerates this module from the pinned selected runs.
- `responses.js` — report-only local inspection snapshot; publication regenerates its exact input/output and bounded judge-rationale records from the same runs.
- `writing-data.js`, `writing-responses.js` — lazy Writing coverage/results and exact answer, judgment, execution and frozen-file evidence from the pinned Storytelling source.
- `capture.mjs`, `capture.sh` — the desktop/mobile interaction and capture harness.
- `games-browsercheck.mjs` — per-artifact playback/delivery and isolated game-frame proof.
- `writing-browsercheck.mjs` — source-exact Writing evidence, rubric/archive interaction and immutable-byte browser proof.
- `template-lock.json` — the user-authorized presentation and capture receipt.

## Local review and QA

Writing can be published as an explicitly **in-progress** snapshot under the
user's approval. Available answers, original reviews and fully reviewed case
scores remain inspectable; model-setting rankings require the complete paired
story corpus and both independent judges. Missing reviews are never zero-filled.
Acceptance of that presentation is not acceptance of a finished benchmark.

```bash
cd /Users/erikhazzard/code/vasir/site/vasirbenchmark.com
./capture.sh
```

With the current selection, the harness regenerates 24 desktop/mobile homepage/report captures and performs 8 transient 820px checks. Its 32 checks cover Overall, Engineering, AI Workflows and Games category views, benchmark summaries, efficiency and saved response reports. It verifies real-data cardinalities, exact prompts and outputs, independent judge disclosures, score and method language, navigation, D3 geometry, accessible interactions, network/runtime errors and overflow.

Games checks also compare actual row layout with Engineering after navigating between the categories, verify score-marker geometry and unclipped review counts, exercise every result selection/report link, and use native mouse/touch coordinates to select the nearest chart points with overlapping hit areas.

Run `games-browsercheck.mjs --url https://vasirbenchmark.com/games.html --output-dir PATH --width 1440 --height 1000` and again with `--width 390 --height 844` for the Games report. The check exercises all ten published clips and playable artifacts, including both ordinary Astra Ultra outputs. Before upload, `--local-artifacts MANIFEST` rehearses the same genuine hostnames with pinned site and artifact bytes, the actual production origin guard and both apex/artifact CSPs, and no external requests. It accepts the full 15-file candidate manifest or the original 13-file Games subset, verifies all 13 Games-scoped files, and explicitly leaves the two Writing bundles to Writing's dedicated check. Immutable candidate HTML determines the `/releases/<id>/` asset mapping; apex JS/CSS aliases are not supplied. Presentation hashes come from the browser’s loaded CDP response bodies, preserving the apex connect-src restriction. Its receipt explicitly identifies local delivery and verified scope; the default check after publication verifies the live network path. Neither check supplies a gameplay quality score.
