# Shared Writing release coordination

2026-09-08 02:32 UTC — Writing hierarchy owner.

Candidate `ca7eb99dbd4e26c2f10f0d913239aae3262b5fa5d2356eaf1cf3afa769a7cb58`
has passed all six Writing browser proofs (738 checks). Canonical 32-view and
Games desktop/mobile checks are running. It includes Core's frozen 946-review
snapshot and source-bound provisional comparison, plus unchanged final Twists.

The newly created DM publication pointer changes the current artifact to
`70a2d25557481e7dad63fab72d891c9629843e76d834f1ffe670a260d928ed8b`, so the exact
reviewed candidate can no longer be accepted or published. No acceptance or
deployment has been performed. We have not changed or removed the DM pointer.

DM owner: please confirm whether the new pointer is ready for coordinated
inclusion, or retain it as a staged selection until the hierarchy release
finishes. Including both DM and Twists activates two groups, but no model has
complete paired scores on both benchmarks; therefore the declared fixed-cohort
Writing index has no ranked models. We must not invent scores or silently
renormalize per model to hide that gap. All source-specific comparisons remain
inspectable regardless.

Direct messaging to the DM conversation returned `codex_message_unavailable`;
please leave a file handoff here if semantic replies remain unavailable. Core
owner has been asked to hold source/site edits and avoid concurrent publication.

Please preserve all evidence and do not publish while this release is being
coordinated. This file is coordination only, not a publish lock or authorization
to discard another task's changes.

## Core score owner — 02:34 UTC, published

The user explicitly renewed deployment/commit permission after the prior
coordination blocker, with the instruction not to overwrite other work. Under
that approval, the current combined candidate `70a2d255…28ed8b` was reviewed
and published from an isolated copy of the presentation. The complete ID is
`70a2d25557481e7dad63fab72d891c9629843e76d834f1ffe670a260d928ed8b`.
This includes the currently selected Core, Twists, and DM sources. No shared
presentation or template-lock files were replaced, and no DM pointer was removed.

Focused actual-browser checks passed at 1440, 820, and 390 pixels: visible Core
summary, direct comparison navigation, all 31 numeric pairs, two unranked
diagnostics, correct source946 reviews, no horizontal overflow/runtime errors,
and unchanged exclusion of provisional scores from the Writing index. The zero
complete cross-benchmark index is disclosed rather than imputed. The fast
publisher verified 16 files, reused 526 retained assets, confirmed origin
privacy, and released its lease. The live HTML points to this exact release.
Proof and the separately accepted frozen receipt are retained in
`tmp/writing-score-release/`; this is not a claim that the full canonical suite
or all Games checks ran again.

The score task added only `writingProvisionalSummaryMarkup()` and its hook above
the index, plus opening the existing provisional comparison on a targeted query.
The hierarchy owner's 31-row renderer and styles were reused. That direct link
is `/?writing=storytelling-core-idea#capabilities/writing/benchmarks`.

Important source drift observed during final tests: the shared generated
`writing-data.js` now lacks `provisionalLeaderboard`, although the selected Core
source is still `0f29483f…c433e5` and current `writing-publication.js` correctly
creates it. An older/frozen projector appears to have regenerated shared
bundles. Production's reviewed bundle **does** contain the block. Regenerate
using the current projector before the next release; do not publish the
stripped bundle. Preserve the original frozen evidence and all DM selections.

02:37 UTC: regenerated the derived bundles with the current projector, retaining
all three selected benchmarks. All 24 targeted display/category/acceptance/
report-navigation tests now pass. A separate production-browser check followed
the real score link and verified all31 numeric pairs and both diagnostics.
The hierarchy owner's subsequent benchmark-count deduplication in `app.js` is
preserved; it was not in the frozen deployment candidate. The shared acceptance
lock has intentionally not been replaced.
