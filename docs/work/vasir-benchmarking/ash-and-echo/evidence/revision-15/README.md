# Revision 15: the body becomes an ash raven

Playable: http://localhost:8317/?v=15

The creator’s revision14 screenshot showed an unchanged round character above white cuts and large detached fragments. This revision changes the connected character anatomy: coal unfolds into a pointed head/beak, narrow torso and textured ragged wings, makes one downstroke, then folds back. Eyes move into the transformed head. The white rupture and large-clump burst are removed; independent drifting smoke/cinders remain.

Only `character.js` changes at runtime from revision14. Its SHA-256 is `83f913c96e31a97396d4c128ba9dca5f4cd99c011d6bbe961b322d0521025439`. Existing fixed pools, the 224×224 body surface and optional ash atlas are reused. The raven reaches full shape by 87 ms, sweeps down from 170–295 ms and reforms from 300–490 ms. Gentle mode preserves that form with fewer shed particles.

## Visual judgment

[Independent Astra review](critic/review.md) compares fresh frozen-v14 and final normal-time native playback. The body still reads as a raven with its detached wake hidden. Centered, left/right, nearby contact and actual gentle-setting sequences retain a readable beat and foldback. The root also inspects native body-only and production frames. This closes the specific character-transformation finding; it is not a human concept approval or whole-game S grade.

- [Body-only peak](critic/candidate-body-open/sequence/frame-038.png), [fold](critic/candidate-body-open/sequence/frame-043.png), [recovery](critic/candidate-body-open/sequence/frame-047.png).
- [Production peak](critic/candidate-full/sequence/frame-040.png), [downstroke](critic/candidate-full/sequence/frame-045.png), [recovery](critic/candidate-full/sequence/frame-049.png).
- [Old full effect](critic/baseline-full/sequence/frame-036.png) and [old body alone](critic/baseline-body/sequence/frame-036.png).
- [Desktop](final-forms/desktop-air.png) and [320×568 gentle](final-forms/small-gentle-air.png).

The body-only routes are explicit diagnostics: scratch source omits only `drawWake(c)`, plus an explanatory comment. Original and served source bytes and hashes are retained separately. Simulation, connected body, eyes and environment remain present. The production critic receipt matches all 15 unchanged/original served modules. Arranged starts and informed inputs are visual evidence, not first-player comprehension evidence. One deliberately held diagonal critic path reaches thorns; successful route proof is separate below.

## Integrated evidence

| Check | Result | Receipt |
| --- | --- | --- |
| Actual Chrome touch controls | Five opening contacts at 6.367 game seconds; no deaths/errors | [Touch](touch-opening.json) |
| Ordinary keyboard climb | Summit at 35.017 seconds; 29 landings; deliberate checkpoint death/recovery at 19.233 seconds; restart succeeds | [Route](full-route.json) |
| Quiet combined runtime | 22 double jumps and 22 landings, 1,401 frames; median/p95 16.7 ms, p99/max 16.8 ms; none above 33.4 ms | [Pacing](performance.json) |
| Character lifecycle and bounds | 12 checks pass; 50 morph poses have transparent surface borders; charge/refill, reset, death, pause and wall-release checks pass | [Character](character/edge-report.json) |
| Normal/gentle/fallback drawing | No game mutations; all drawing completes | [Local cost and invariants](character/cost-report.json) |
| Native form factors | Desktop and small gentle have no browser errors or horizontal overflow | [Forms](final-forms/receipt.json) |
| Source identity | All 15 production modules match root play/pacing/forms, critic and final live HTTP responses | [Identity checks](served-source-checks.json) |

The quiet pacing sample is desktop Chrome at 390×844 DPR2, without screenshots/video during measurement. It does not establish physical-phone performance. The separate alternating 600-step character/game CPU probe records approximately 0.130 ms per candidate submission versus 0.148 ms for v14; it is not a full-game GPU or hardware speedup claim. The author’s controlled 120 Hz pose captures establish timing and bounds, while the independent ordinary-RAF clips establish the visual sequence.

## Preserved record

- `source/`, `source-identities.json` and `asset-identities.json`: frozen production files and asset inventory. Existing assets remain in the game directory; this packet does not duplicate them.
- `user-reference.png`: latest creator screenshot; `baseline-identities.json` and [revision14](../revision-14/README.md) preserve the preceding source.
- `character/stage-00/`: unchanged v14 character. `character/stage-01/`: first functioning raven and selected frames. Final adds transparent feather nicks and deletes unused large-clump drawing; it retains that stage’s anatomy and timing.
- `critic/`: baseline/full/body-only original clips, source bytes, receipts, review and selected native frames. Complete extracted frame sequences stay in `tmp/ash-and-echo/raven-pass/critic/`; frames explicitly cited by the review are retained here.
- `touch-opening.webm`, `full-climb.webm`, `probes/`, `character/` and `final-forms/`: bounded integrated and diagnostic evidence. Probe files retain their original scratch output paths and local Playwright/Chrome dependencies.
- [Process log](../../process-log.md): records the failed burst interpretation, the isolation gate and the chosen anatomy. Skill extraction remains deferred.

No new human grade or numerical improvement multiplier is inferred.
