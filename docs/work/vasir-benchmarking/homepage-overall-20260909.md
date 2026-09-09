# Overall homepage: Writing integration and automatic refresh

The user requested that the homepage include the newer benchmark results and
that future benchmark additions no longer require hand-rebuilding the homepage.

## Implementation

- Overall v3 uses the existing category priorities, normalized over its paired
  categories: Engineering 50%, Writing 25%, AI Workflows 25%.
- Writing is exactly the existing All Writing score (equal tracks, equal tests
  within each track), not a second four-test average. Eight current benchmarks
  produce 19 complete ranked configurations from a 44-configuration union.
- Each model must have both arms of every included test to receive an Overall
  rank. Missing scores and missing resource readings remain unknown, not zero.
- The homepage retains its paired stacked bars. All eight benchmarks share the
  existing ledger with field means, paired top-model scores, and report links.
- A Writing segment opens that exact configuration's All Writing score, even
  when the incoming URL contains a stale Storytelling score filter.
- The normal publication builder derives the Overall dataset and ledger from
  registered sources. New Writing tests and new tracks automatically update the
  hierarchy and within-category weights. No homepage-specific score arithmetic
  or per-benchmark markup is needed.
- `npm run benchmark:refresh` regenerates all seven browser data/answer modules;
  `npm run benchmark:check` detects stale generated modules without writing.
  Neither command runs providers or deploys to production.

## Data and transfer safeguards

Historical Overall v2 calculations and serialization remain unchanged when no
Writing source is included. The v3 homepage embeds a compact Writing source
adapter, validated again against the full Writing evidence during artifact
construction. Overall values are independently reconstructed in browser
acceptance, including exact scores, weights, ranks, source cohorts, and nulls.

The first candidate exceeded the existing compressed landing budget. Candidate02
stores repeated family collections once and synchronously reconstructs the same
full public object without fetching. Evaluated data is deeply identical to the
unpacked projection. The landing bundle is 288,057 compressed bytes, within the
unchanged 300,000-byte limit and below the prior release's 297,987 bytes.

No benchmark generations, judgments, selected checkpoints, or answer archives
were changed. The Games pilot remains separate because it lacks a comparable
plain-answer/skill pair; task rubrics remain uncalibrated.

## Evidence

Candidate02: `22a7c6242cc810e9f9d678b30e8cee6f62f98303d557a819a96aaa3932a01342`.
Evidence is retained under `tmp/homepage-overall-20260909/`.

Source/UI/automation suites passed, including automatic benchmark/track growth,
unchanged v2 behavior, exact unpacking, and stale-scope navigation. The local
refresh check reports no stale generated modules.

Desktop/mobile Overall integrations and the 159-check Core integration passed.
All 32 canonical checks and 14 Writing/Games browser runs passed. Acceptance
records 372 captures, 12 Writing proofs, and two Games proofs; the exact site-lock
suite passed all 15 tests. A supplementary 1440px/390px visual review verified all
eight ledger rows, their original means and paired leaders, and report-return
navigation without browser errors.

## Production

Candidate02 was published successfully on 2026-09-09 at 06:34:05 UTC, replacing
`66b0a582de0fbe53bcbdf788a6484cd37aded036a0773c4b43d10d5fa8546fd8`.
The guarded publisher exited successfully and released its publication lease.
Its full audit verified 545 files, nine report routes, 15 capability routes, and
all 12 live Writing browser runs. Origin privacy remains enabled.

An independent live 1440px/390px smoke check verified the exact release, all eight
benchmark rows, original field means and paired leaders, and report-return
navigation. The Overall leader is Astra Ultra at 88.6; its Writing segment is
95.5208333333 and remains that exact All Writing score after navigation. The
Writing sidebar's own category leader remains 96.2. No browser errors or material
visual issues were found.

Production receipt: `tmp/homepage-overall-20260909/candidate-02/publish-result.json`.
Independent live proof and screenshots:
`tmp/homepage-overall-20260909/live-overall-22a7-01/visual-review.json`.
