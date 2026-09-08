# Writing category hierarchy correction

## Current user correction — 8 September 2026

The latest request explicitly removes the complete-cohort display gate: show every model with an aggregate of its available published paired benchmark scores, and mark incomplete aggregates with an asterisk. Equal weights are normalized over that model's available benchmarks, using the same subset in both conditions. Storytelling combines Core idea, Plot twists, and First discovery of magic where available; all 33 model settings are visible. Writing retains Engineering's compact circle-to-square comparison rows and the native selector for individual tests and Dungeon Master. See [the current score and presentation contract](storytelling-aggregate.md). The remaining sections retain earlier decisions and release history, not the current target.

## Requested outcome

The user rejected the benchmark-specific Writing picker. Writing must use the same information hierarchy as Overall and Engineering: category header, immediately followed by Leaderboard / Benchmark tests / Efficiency; paired stacked model bars whose segments represent subcategories; individual benchmarks grouped under the Benchmark tests tab. The supplied screenshots are the visual reference. This is a presentation correction, not permission to regenerate contestants, change their scores, or repair excluded trials.

## Presentation and score boundary

`buildWritingCategoryCollection` derives a separate, explicitly uncalibrated development index from the selected raw Writing publication collection. The collection remains unchanged, and reports retain every benchmark's own prompt, rubric, panel, trial rules, headline scores, exclusions, and archived answers.

A benchmark is active in this display index when at least one configuration has complete baseline and treatment headline totals. Active subcategories share equal weight; active benchmarks share equal weight within their subcategory. Every ranked model must complete the identical active benchmark cohort under both conditions. Missing evidence is neither zero nor a reason to renormalize weights for an individual model. Resource means use the same weights and remain unavailable when required resource evidence is missing. Adding measured benchmarks changes the index cohort, not the underlying benchmark scores.

At implementation start there are two Storytelling benchmarks and 33 unique model settings. Core idea has no complete full-corpus configuration totals; Plot twists has two complete ten-pair configurations. Consequently the current display has one Storytelling segment, two ranked models, and 31 settings with coverage gaps. There are no fabricated Prose, Poetry, or Dungeon Master scores. The benchmark ledger still exposes both tests and all available evidence. Separate Core idea work may update its source-bound scoring coverage; freeze and verify the actual selected source before publication.

## Routes and interactions

- Canonical category routes are `#capabilities/writing`, `/benchmarks`, and `/efficiency`.
- Old `/writing/storytelling[/mode]` and `/writing/dungeon-master[/mode]` links preserve mode and canonicalize to the category.
- `?writing=<benchmark-id>` is a legacy focus hint in Benchmark tests, not a filter that replaces the category dataset.
- A stacked segment opens Benchmark tests and focuses its subcategory track.
- Selecting a model exposes links to that model's original benchmark answers. Coverage gaps remain inspectable without category ranks.
- Existing benchmark report, story, model, section, and trial deep links remain intact.

## Acceptance

Use the existing paired-bar typography, grid, condition styling, keyboard navigation, and responsive breakpoints. Do not add a second navigation hierarchy above the view tabs. Verify desktop, tablet, and mobile with actual pinned release data; recompute category weights and scores independently from the raw published totals. Verify legacy routes, group navigation, sparse coverage, benchmark report joins, and lazy bundles. Preserve Overall/Engineering/Games/AI Workflows data. Retain unsuccessful rehearsal receipts and previous accepted captures. Refresh accepted proof only after reviewing the exact candidate, then use the guarded publisher and verify the live release separately.

## Execution notes

The first pinned rehearsal (`aba1974eea35556939b633a9e8a2fc991e2c1d31e5aaa361f1a6a9a0fe92e37c`) passed hierarchy, arithmetic, typography, navigation, and no-overflow checks on desktop/mobile, then exposed a real Efficiency crash: the shared chart needed an explicit top-level `fieldConfig.writing` after subcategories became the stacked components. That mapping was added; the failed original receipts remain under `tmp/writing-hierarchy/rehearsal-01/`. No benchmark data was changed to address this UI failure.

The fourth rehearsal (`ca7eb99dbd4e26c2f10f0d913239aae3262b5fa5d2356eaf1cf3afa769a7cb58`) passed six Writing browser runs at 1440/820/390px (738 checks), all 32 canonical category/report checks, and Games desktop/mobile checks with all ten clips advancing and all ten games accepting observed input. It additionally exposed Core idea's source-bound provisional comparison inside Benchmark tests: 31 complete twelve-story cohorts and two unranked diagnostics, independently reconstructed from 788 original fixed-Astra reviews. These provisional scores remain excluded from Writing and Overall.

Concurrent authorized Core idea work then published `70a2d25557481e7dad63fab72d891c9629843e76d834f1ffe670a260d928ed8b` at 02:32 UTC on 2026-09-08. That release includes this hierarchy, an additional provisional overview card, and the newly selected Dungeon Master benchmark. Its separate publication receipt is `tmp/writing-score-release/publication.json`. The fourth rehearsal is retained as historical proof, not falsely attributed to that newer release. No rollback or deletion of the concurrent source selection occurred.

The added DM benchmark activates a second equally weighted group, but no setting currently has complete paired scores in both Storytelling and DM. Therefore the primary category correctly has no combined scores or ranks. The follow-up presentation exposes available subgroup pairs as explicitly **partial, unranked** stacked profiles: known subgroup scores retain their fixed weighted contributions, missing subgroup capacity is hatched and unavailable, and combined score/rank/uplift remain absent. Rows use a stable label order, never a ranking of incomparable partial sums. This requires no change to the category arithmetic or original results. The final candidate must be independently reviewed with all three selected benchmarks before publication.

## Accepted follow-up candidate

Candidate `c266a8d078add2906ac0074b4e76da1a0b0e6347dcbec52bcb22c0a7a9f965e0`
is retained under `tmp/writing-hierarchy/rehearsal-07/`. It contains fifteen files,
15,667,706 bytes total, and a 292,504-byte compressed landing payload. The
source selection includes Core idea's 946-review checkpoint, frozen final Plot
twists, and the separately selected completed DM study. No source was rolled
back to obtain a populated category ranking.

All nine Writing report/category browser runs pass at 1440×1000, 820×1000, and
390×844: 1,206 checks. All 32 canonical cross-category/report checks pass, and
both Games checks establish ten advancing clips and ten observed game inputs
with no runtime/delivery failures. The guard independently verifies original
provisional reviews, partial subgroup arithmetic, full DM case evidence, frozen
Twists results/exclusions, loaded module hashes, and screenshot dimensions.
The agent visually reviewed the paired profiles, grouped benchmark ledger,
provisional comparisons, and responsive answer links. The exact 15-source /
60-capture acceptance inventory was renewed, with previous files retained in
the candidate directory. The accepted-site lock test passes.

An earlier visual review found clipped Adventure answer-link metadata in the
three-column layout. Wrapping was corrected. The new browser check measures
both child bounds and actual text-line rectangles; it fails on the retained old
candidate and passes on the corrected one. Earlier tall-tablet proofs are
retained separately as `writing-*-820-tall`; the accepted tablet proofs were
rerun at the specified 1000px height without rewriting receipt metadata.

Publication is performed through the normal guarded fast publisher. Acceptance
above is local evidence; live deployment and CDN/browser verification are
recorded separately below after completion.

## Live completion

The normal publisher completed successfully with release
`c266a8d078add2906ac0074b4e76da1a0b0e6347dcbec52bcb22c0a7a9f965e0` active,
advancing from verified `70a2d255…ed8b`. The full result is retained at
`tmp/writing-hierarchy/rehearsal-07/publish-result.json`. All fifteen site files
plus the retained isolation probe passed live byte verification, 526 unchanged
artifact assets were reused, origin privacy passed, no rollback was needed,
and the publication lease was released.

Nine separate live browser runs then passed all **1,206 checks** at the exact
three accepted viewport sizes. All sixty loaded-module records match the
candidate's release paths, production origin, SHA-256 hashes and byte counts.
Their receipts are under `rehearsal-07/live-writing-{core,twists,dm}-{width}/`.
One mobile Twists navigation timeout is retained in its `-navigation-timeout`
directory; an unchanged serial rerun passed. An initial DM desktop invocation
without the scored flag is retained separately; its accepted live replacement
uses the required flag. Neither original run was relabeled or overwritten.

The final selected test suite passed **195 tests**, including the renewed site
lock, independent category/provisional/partial arithmetic, original benchmark
publication and navigation, and guarded publisher behavior. Source-only changes
are left in the shared worktree; no unrelated edits were reverted. Rehearsal
servers started by this task were stopped; all source and proof files remain.

Public routes:

- `https://vasirbenchmark.com/#capabilities/writing`
- `https://vasirbenchmark.com/#capabilities/writing/benchmarks`
- `https://vasirbenchmark.com/#capabilities/writing/efficiency`
