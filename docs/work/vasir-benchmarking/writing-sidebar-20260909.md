# Writing sidebar score on every capability page

The non-Writing sidebar read `writing.categoryIndex.leader` from the compact
landing bundle, but the generator never supplied that field. The hydrated
Writing page derived its leader correctly; fresh Games/Overall/Engineering
loads instead showed the `Results` fallback.

The compact bundle now includes the default Storytelling aggregate leader,
derived with the same isolated pure presentation functions as the Writing
leaderboard. Both routes use consistent labels and provisional metadata.
The publisher additionally checks compact-versus-hydrated parity against the
exact candidate application source. No full Writing dataset is fetched to
render the score off the Writing page, and no independent scoring algorithm,
hand-entered score, benchmark rerun, or source selection was introduced.

For the unchanged published sources the leader is Astra Max: exact
96.0611111111111, displayed **96.1/100**, provisional. Higher incomplete
settings cannot become leaders; genuinely missing leaders retain the fallback
and a measured zero remains numeric.

Verification:

- 64 source/projection/acceptance/lineage/browser-contract regressions passed
  after regenerating the checked-in compact bundle. The initial pre-generation
  comparison correctly rejected the stale generated file; its assertion was
  not weakened.
- Five new sidebar tests passed, covering fresh non-Writing pages, all Writing
  score selectors, no extra data loading, partial exclusion, zero and absence.
- 32 canonical captures, 12 Writing proofs and two Games proofs passed.
- Targeted actual Games-to-Writing navigation passed at 1440 and 390 pixels:
  96.1 before and after; no Writing dataset on Games; zero runtime errors or
  horizontal overflow; actual loaded app/data/Writing-data bytes match the
  release. Initial verifier-only one-ULP arithmetic comparison failures remain
  retained with the original harness; the corrected independent comparison
  allows two floating-point rounding steps, with identity/display exact.
- Desktop/mobile Games and Writing screenshots were visually inspected.

Accepted candidate:
`eca33af1915830a52be741e7300a37700b423d9066eac81c2ef92176a218c822`.
Evidence is under `tmp/writing-sidebar-results-20260909/candidate-01/`.
18 public files total 43,644,408 bytes; compressed landing dependencies are
296,576 bytes, below the unchanged 300,000-byte limit. All source selectors,
benchmark data, scores and ranks remain unchanged. The only public content
changes are `app.js`, `data.js`, and release-qualified dependency URLs in HTML.

Publication is bound to previous release
`1a0410226973783b5ec53f27c0caa3c72a29e1c57145bad3c7be6d0b7cb12232`;
acceptance alone does not establish live deployment. The guarded publisher
retains the deployment outcome in `candidate-01/publish-result.json`.

## First publication: rolled back; verification retry

Candidate 01's live desktop/mobile sidebar checks passed, but the publisher's
broader AI Workflows desktop capture timed out waiting for `Page.loadEventFired`
after 15 seconds. The guarded publisher correctly restored the previous release.
The first receipt and live screenshots remain historical evidence, not proof
that the fix remained deployed. An unchanged-harness reproduction subsequently
passed against the restored production page; the exact original network cause
is not established.

The capture harness now clears fulfilled event timers, removes timed-out event
waiters, retains page-error diagnostics on failure, and allows a bounded
30-second navigation load-event wait. It still subscribes before navigation and
requires the real event, DOM readiness, fonts, and all existing assertions.
Five focused protocol tests pass; no verification gate was removed. The original
harness is retained alongside the reproduction evidence. Fixed-harness local
and live Workflows smoke checks both passed.

Candidate 02 is a fresh rehearsal of the same public release, with new browser
evidence and acceptance required for the changed QA harness. No new benchmark
results or source selections are included in this sidebar-only publication.

Candidate 02 passed all 32 canonical, 12 Writing, and two Games checks, plus
14 targeted sidebar/navigation checks at each of desktop and mobile widths.
Fresh Games and Writing screenshots were inspected. Acceptance passed with 348
screenshots. The acceptance utility now separates QA-only re-reviews under the
exact public-release and capture-harness hashes; the original review and first
failed publication receipt remain intact. The retry outcome is recorded at
`candidate-02/publish-result.json` and must succeed before deployment is claimed.

## Successful live deployment

The guarded retry completed successfully at **2026-09-09 02:27:59 UTC**, with
`verification.status: passed`, `mode: full-audit`, and the lease released.
It verified 545 files, nine report routes, and 15 capability routes. The active
release is `eca33af1915830a52be741e7300a37700b423d9066eac81c2ef92176a218c822`.

Fresh live targeted checks at 1440 and 390 pixels each passed all 14 assertions:
the exact Games URL with `?score=storytelling` shows **96.1/100** before clicking
Writing, and the loaded Writing page shows the identical aggregate. Actual
loaded module hashes match the release, without loading the full Writing data
on Games. Live screenshots were visually inspected. Evidence is retained in
`candidate-02/live-sidebar-1440/` and `candidate-02/live-sidebar-390/`.
All benchmark source selections, full score data, rankings, and original answer
archives are unchanged by this deployment.
