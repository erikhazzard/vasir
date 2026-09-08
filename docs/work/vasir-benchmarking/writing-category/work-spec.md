# Writing category hierarchy correction

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
