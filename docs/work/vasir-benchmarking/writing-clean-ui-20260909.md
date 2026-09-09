# Shared benchmark layout and clean Writing navigation

The user rejected the expanded selected-model panel, equations, repeated
provisional notices, and the report-specific Magic context table. This revision
changes presentation only. Published source selections, responses, judgments,
score arithmetic, aggregate weights, ranks, and incomplete-score treatment stay
unchanged from the accepted All Writing release.

## Layout contract

- Benchmark tests opens directly to the shared grouped ledger: three Storytelling
  tests and one Dungeon Master test. No score-scope dropdown, model dropdown,
  component cards, equations, explanation essay, inline provisional leaderboard,
  or aggregate footnote appears in that view.
- Each test retains its actual all-model averages, uplift, concise source counts,
  report link, and model-comparison link. Core's displayed source still has one
  review per answer; the presentation never claims its planned two-judge panel
  is complete. The closed header Methodology disclosure explains source status.
- Leaderboard and Efficiency retain the All Writing / track / test selector.
  Their selected-model scores and original-answer links are in a closed
  Scores & answers disclosure, rather than an expanded panel.
- All standard benchmark reports use the same renderer and order: navigation,
  hero and prompt, one Model comparison dumbbell list, one closed Judge & trial
  details disclosure, and pagination. Report-specific context, cohort, progress,
  method, predecessor, and flag-rate detail belongs inside that common disclosure.
- Method and archived-prompt deep links open the enclosing disclosures before
  focusing or scrolling. No underlying audit evidence is discarded.

## Verification

Clean-view receipts use `writing-benchmark-ledger-v1`, with explicit absence
checks for rejected UI and independent checks for unchanged field means, weights,
ranking, source qualifications, answer bytes, trial results, and report layout.
Historical receipts retain their original presentation assertions.

The first candidate exposed an actual tab-transition issue: the incremental tab
switch retained controls and the footer created on the leaderboard. Writing now
rebuilds its conditional view frame on tab switches, preserving score/model state.
A regression covers both directions and Efficiency. Failed proof attempts remain
under `tmp/writing-clean-ui-20260909/`.

Candidate 03 (`3273cfefb876e9b3549b74ab2da90bbf1717b8c0f0bfc55f07f6eaaf960c1f30`)
passed all 32 canonical page checks. Desktop and mobile screenshots confirm the
clean ledger and identical comparison structure in Magic and Engineering.

Native closed `<details>` content can retain layout rectangles while not being
painted. The browser check now tests native visibility, opens the actual summary,
waits for rendering, verifies positive visibility and geometry, then verifies the
content is hidden again after closing. Permanent hidden content and content that
stays painted after closing still fail. The first full browser attempt, including
two rendering-timing failures, is preserved under `candidate-03/browser-attempt-01`.

## Published and verified

Release `3273cfefb876e9b3549b74ab2da90bbf1717b8c0f0bfc55f07f6eaaf960c1f30`
replaced the reviewed `b032ebcebd0d6b0bfdbbbdcb3a9b7e899a32208a2b349d3ad6368de8a0b06ec5`
release. The guarded publisher exited successfully on 2026-09-09 at 04:52:10 UTC,
with full-audit verification passed and the publication lease released. Its live
audit verified 545 files, nine report routes, and fifteen capability routes. A
subsequent public HTML check confirmed the new release remained active.

Fresh acceptance bound 32 canonical checks, twelve Writing browser runs, two Games
runs, and 372 captures to this exact release. The accepted template lock passed
all thirteen tests. Focused regression suites also passed, including the 56-test
Writing visibility and overview suite and the 27-test acceptance suite.

The separate live UX smoke passed all fourteen checks with zero browser, network,
or HTTP errors. Six desktop/mobile screenshots were reviewed: clean Writing
ledger, shared Magic/Engineering comparison layouts, native closed-by-default
judge details, functioning answer and copy controls, restored leaderboard scope,
and the unchanged 96.2 Writing sidebar score. Every observed app/report/data URL
was pinned to the new release.

All seven published score-data and answer-archive JavaScript files are byte-for-byte
identical to the previous release. No benchmark generations, judgments, source
selections, weights, or ranks were changed during this UI revision.

Evidence:

- `tmp/writing-clean-ui-20260909/candidate-03/publish-result.json`
- `tmp/writing-clean-ui-20260909/candidate-03/browser-run-logs/results.json`
- `tmp/writing-clean-ui-20260909/live-clean-3273-01/live-clean-ux-smoke.json`

All root-owned rehearsal servers were stopped after verification. Prior failed
proofs and final successful evidence were preserved.
