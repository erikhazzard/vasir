# Writing aggregate ranking correction

## Problem

The v4 display ranked averages over different available benchmark subsets. Opus 5 Max's Magic-only 96.25 outranked Astra Ultra's three-test 95.7638889, even though Astra scored higher on their shared Magic benchmark (97.1666667). The source scores were genuine; treating their unlike means as comparable ranks was the error.

## v5 policy

- Ranking requires complete paired totals on **every selected benchmark**. All ranked models use identical tests, equal weights and the same published basis per benchmark.
- Complete paired totals from the published Core provisional cohort remain eligible, uniformly; this correction does not change judges or introduce per-model panel fallbacks.
- Incomplete models retain their available-score means, paired uplift, source components and answer links. They appear in an explicit alphabetical, unranked section, with coverage and missing-test disclosure. No missing score becomes zero.
- Partial means cannot contribute to ranks, category leaders, header/rail leaders, headline uplift statistics or comparative efficiency frontiers.
- Individual benchmark choices still rank all models with complete results for that chosen benchmark. Selecting a model preserves the ability to inspect its original results.
- Writing remains excluded from Overall. No benchmark generations, judgments, rubric scores or source selection pointers change for this fix.

With the current checkpoint: Storytelling has four comparable ranked settings and 29 visible incomplete settings. Astra Ultra leads at 95.8. Opus Max's 96.3 remains visible, explicitly unranked and based on one test.

## Verification and retained iterations

- Regression test models the precise missing-unfavorable-test failure: an incomplete model's higher mean cannot claim first place; completing its missing test restores a comparable rank.
- Projection and independent arithmetic checks verify ranks separately from score visibility, including disjoint cohorts, zeros, ties, panel precedence and incomplete diagnostics.
- Browser checks validate every dropdown choice, numeric rows, separate incomplete results, absent partial ranks, source formulas, leaders, resource frontiers and report links.
- Candidate 01 was a development probe; the efficiency verifier still expected partial points and failed. This assertion was updated to require the same complete-test cohort as the leaderboard, not removed.
- Candidate 02 passed 12 Writing browser suites and 32 canonical captures. Visual review found compressed model names in incomplete rows; it was not published.
- Candidate 03 adjusts only that coverage-label layout. Its fresh publication acceptance must bind to its own browser captures and immutable source data. Earlier attempts remain retained under `tmp/writing-ranking-fix-20260908/`.

No provider generation/judging calls were made; existing quota-blocked backfills remain paused.

## Published and verified

Release `22e19f1396e8ba3a2856fdfda8126a6f66ff6f768ae84ee2d4305ba1a54a42c2` is live at `https://vasirbenchmark.com`. The guarded publisher succeeded and verified the public files; rollback was not needed.

- 93 final regression/acceptance tests passed.
- Fresh acceptance includes 32 canonical captures, 12 Writing browser suites, two Games isolation suites, and 348 captured views.
- Live desktop Core suite: 141 checks passed. Live mobile Plot twists suite: 231 checks passed. Both exercise the common-test aggregate, all dropdown selections, incomplete rows, component calculations, and efficiency rules.
- Every asset loaded by both live suites matched the accepted release URL, length and SHA-256.
- All generated benchmark-data and answer-archive file hashes match the previous published checkpoint. Only application/layout assets and release-pinned HTML changed.
- Publication receipt: `tmp/writing-ranking-fix-20260908/candidate-03/publish-result.json`. Live evidence: `tmp/writing-ranking-fix-20260908/live-core-1440/` and `live-twists-390/`.
- Task-owned rehearsal servers were stopped. No benchmark backfills were restarted.
