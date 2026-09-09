# Benchmark averages with a paired top-model result

The user wants to retain each benchmark's average skill uplift and also see the
top model's plain/skill scores. Each shared benchmark ledger row now preserves
its field means and adds a compact **Top with skill** line beneath them. It names
the skill-score leader and shows that same model's baseline, skill score, and
paired delta. Writing, Engineering, AI Workflows, and their Overall ledger rows
reuse the same component. No dropdown, expanded breakdown, or new page was added.

## Selection contract

- Select the highest exact skill score among complete paired benchmark results.
  Never combine the highest baseline from one model with another model's skill.
- Writing uses the existing per-benchmark projection and uniform source-basis
  policy, independent of the category scope selected on the leaderboard.
- Engineering and AI Workflows use their benchmark-local published score pairs,
  not model/category aggregates. The Overall ledger uses those original cohorts.
- Missing, partial, ineligible, duplicate, and nonfinite pairs cannot lead. Zero
  remains valid. An explicitly missing exact score cannot fall back to a rounded
  score. Benchmarks without an assessable pair omit the top-model line.
- Exact skill ties use configuration-identity codepoint ordering for a stable
  representative and visibly state the total number tied. Rounded equal values
  do not manufacture a tie. Display uses the existing half-tenth ULP policy.
- Rendering escapes model/identity text and retains exact source values as
  evidence attributes. Source data and answer archives are unchanged.

## Reviewed source results

| Benchmark | Top with skill | Same-model baseline | Skill | Exact skill ties |
| --- | --- | ---: | ---: | ---: |
| Core idea | GPT-6 Astra · max | 83.083333 | 92.5 | 1 |
| Plot twists | GPT-6 Astra · ultra | 81.925 | 97.875 | 1 |
| First discovery of magic | GPT-6 Astra · high | 92.25 | 97.916667 | 2 |
| Adventure outline | GPT-5.6 Sol · ultra | 75.555556 | 98.055556 | 1 |

## Verification

New `writing-benchmark-leaders-v1` receipts extend the clean-ledger contract with
independently derived paired leader identity, exact scores, delta, ties, visible
text, and contained geometry. Historical ledger receipts retain their original
requirements. Existing average, source, ranking, archive, and no-clutter gates
remain mandatory.

Candidate evidence is under `tmp/writing-top-model-20260909/`.

## Deployment and live verification

Published release `66b0a582de0fbe53bcbdf788a6484cd37aded036a0773c4b43d10d5fa8546fd8`
successfully at 2026-09-09T05:45:52.612Z. The guarded publisher completed its full
live audit: 545 verified files, 9 report routes, and 15 capability routes. The
publication lease was released; no rollback was needed. The public entrypoint
was independently rechecked and serves this release.

- Fresh acceptance: 372 captures, 12 Writing browser proofs, and 2 Games proofs.
- Targeted live Writing checks: 12/12 passed, including exact paired leaders,
  ties, unchanged averages, responsive geometry, and release-pinned assets.
- Shared non-Writing live checks: 6 desktop/mobile views and 16 benchmark rows,
  with 18 screenshots and no errors or overflow.
- All seven published data/response JavaScript files are byte-identical to the
  previous release. Scores, source selections, weights, and archives did not
  change.

Receipts: `candidate-01/publish-result.json`,
`live-top-66b0-01/live-top-model-smoke.json`, and
`live-66b0a582/visual-review.json` beneath the evidence directory above.
