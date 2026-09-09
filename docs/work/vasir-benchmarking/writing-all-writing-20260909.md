# All Writing and understandable score breakdowns

The previous Writing navigation score was the highest complete **Storytelling
model aggregate**. The benchmark cards instead showed each test's **average
across complete model settings**. Both were real, but the UI did not make the
change of population clear enough. Storytelling also omitted the published
Dungeon Master track from the category score.

## Scoring and presentation

- Add **All Writing**, the default category score: equal track weights, with
  equal benchmark weights within each track. Currently Storytelling is 50%
  and Dungeon Master is 50%; Core Idea, Plot Twists and Magic each contribute
  1/6, and Adventure Outline contributes 1/2.
- Keep Storytelling, each individual Storytelling benchmark, and Dungeon Master
  selectable. Their original within-track arithmetic remains unchanged.
- Rank only models with complete paired totals on every selected benchmark.
  Missing results remain separately visible and unranked. Their available-score
  means normalize the selected fixed weights over available paired scores,
  identically for both conditions and resource readings.
- The sidebar always shows the complete All Writing leader. The score scope
  selector is shared across Leaderboard, Benchmark tests, and Efficiency.
- Benchmark tests shows the selected model's actual source scores and aggregate
  equation above a separate, explicitly labeled all-model-average section.
  A model dropdown preserves selection in the URL/history. Every benchmark has
  a link to compare all model settings, alongside original-answer report access.
- Pretty weighted equations use exact reciprocal fractions rather than rounded
  percentages. Exact-score metadata remains unrounded.

For the selected complete-model evidence, Astra Max's Storytelling scores are
92.5, 97.85, and 97.83333333333333: their mean is 96.0611111111111 (96.1).
Its Dungeon Master primary score is 96.3888888888889. All Writing is
(96.0611111111111 + 96.3888888888889) / 2 = 96.225 (96.2).
The previous 84.0 / 85.1 / 92.0 cards were field means over 31 / 23 / 33 model
settings; they were never that model's component scores.

## Saved evidence included

The previous sidebar-only deployment left newer audited completion checkpoints
unselected. This change selects Twists `ac7128bdbeec86d7bb144c19f3fc778fda91ba4b9afdfea0a0c3f004ee3e8cac`
and Dungeon Master `5827eb54dcb3794bc99dfc49cbdaa7e48c59bc259ba14ff4b54e2c09d15983de`
through the normal immutable publication preparation and lineage checks.
They add 19 Twists and 48 Dungeon Master valid outlines. Twists gains 18 fully
scored answers and 36 individual judgments. Dungeon Master gains four individual
judgments but no newly complete scored answers. The same 23 complete-model
scores and ranks per benchmark are preserved exactly. No provider jobs were run.

Core retains its previous uniform 31-model provisional comparison. A newer
private review checkpoint has only one complete official model; silently
selecting it would switch the whole benchmark's score basis and invalidate the
current comparison population. Magic's complete source remains unchanged.

## Verification and publication

Fresh arithmetic, source-lineage, sidebar, browser-interaction and artifact
privacy checks are required before acceptance and guarded deployment. Candidate
and publication receipts live under `tmp/writing-all-writing-20260909/`.
This note does not establish successful live deployment; append the verified
publication outcome after the guarded publisher completes.

Candidate `b032ebcebd0d6b0bfdbbbdcb3a9b7e899a32208a2b349d3ad6368de8a0b06ec5`
passed all 32 canonical page checks, all 12 Writing browser proofs (four
benchmarks at three viewport sizes), and both Games regression proofs.
Independent acceptance bound 360 screenshots to the exact candidate and source
selections. The focused arithmetic, navigation, lineage, privacy, and acceptance
regression batch passed 74 tests. Actual Back/Forward navigation is exercised,
including native form-state restoration, not only synthetic route updates.

## Verified live outcome

The guarded publisher completed successfully at `2026-09-09T03:34:48Z`, replacing
`eca33af1915830a52be741e7300a37700b423d9066eac81c2ef92176a218c822`
with candidate `b032ebcebd0d6b0bfdbbbdcb3a9b7e899a32208a2b349d3ad6368de8a0b06ec5`.
Full audit passed: 545 files, nine report routes, and 15 capability routes, with
live browser verification and the private origin intact. The publication lease
was released normally. Receipt: `tmp/writing-all-writing-20260909/candidate-03/publish-result.json`.

A separate fresh-browser public-site smoke passed all 12 checks: query-free
Writing defaults to All Writing; Astra Max's four exact weighted components sum
to 96.225; field means remain separately labeled; all four comparison links
preserve model selection; and the sidebar stays 96.2 through Engineering and
Games navigation. Evidence and screenshots:
`tmp/writing-all-writing-20260909/live-ux-smoke-b032/`.
The final exact site-lock suite passed 12 tests. No benchmark provider calls were
made, and incomplete judge panels remain incomplete rather than being filled
with inferred scores.
