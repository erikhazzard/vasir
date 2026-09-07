# Revision14 — ash-body rebirth

Playable: **http://localhost:8317/?v=14**.

The creator called revision13 “much better” but still read its double jump as repeating the first action, and its attached trail as a sperm-like silhouette. This corrects the previous agent approval. No new human letter grade is supplied; the latest overall anchor remains solid A.

Only [character.js](source/character.js) changes at runtime. The long connected mantle and airborne fibres are removed. Ordinary launches have a short torn release, followed by independent smoke/cinders that drift, expand and fade. The second jump compresses the moving nucleus, releases broad unequal ash masses, erodes them into a lingering aftercloud, and rebuilds the eyed body. Existing world contact, landing, input, collision, scene, UI, sound and GPU topology remain unchanged.

The wake pool grows from44 to144 reused slots. The existing38 death-burst slots, material atlas and224px nucleus canvas remain. No new module, image, shader, target or frame owner is added. See the frozen [implementation contract](source/CONTRACT.md) for timing, ownership and fallback behavior.

## Final proof

| Evidence | Observed result | Scope |
|---|---|---|
| [Touch opening](touch-opening.json), [recording](touch-opening.webm) | Five opening contacts at6.075 game seconds; no deaths/errors | Actual touches on visible controls, informed route |
| [Full climb](full-route.json), [recording](full-climb.webm) | Summit at35.183 seconds;29 landings, deliberate checkpoint death/recovery and actual restart; no browser errors | Ordinary keyboard handlers, informed route |
| [Repeated-double-jump pacing](performance.json) |22 actual double jumps and22 landings;1,401 frames; median/p95 16.7ms, p99/max16.8ms; none above33.4ms | Quiet desktop Chrome390×844 DPR2; no recording/screenshots in measured window |
| [Desktop and gentle portrait](final-forms/receipt.json) |1280×900 desktop and320×568 actual gentle-toggle captures; jump/doubleJump events, no errors/overflow | Final native form smoke check |
| [Character boundaries](character/edge-report.json) |11 cases pass: air charge, wallkick/refill/interrupt, death/respawn/reset, bounded pool, zero-delta, Canvas restoration and game-state integrity | Actual deterministic game steps with explicit initial fixtures |

Final [normal](character/candidate-report.json), [gentle](character/gentle-candidate-report.json) and [missing-atlas](character/fallback-candidate-report.json) timed captures match the frozen character. The [cost probe](character/cost-report.json) adds normal/gentle/fallback drawing without game mutation; its small character/game-step CPU timing is not whole-renderer or phone performance evidence. Quiet full-game cost is measured separately above.

[Source identities](source-identities.json), [asset identities](asset-identities.json) and [served-source checks](served-source-checks.json) bind the evidence to the final build. All15 served modules match in touch, climb, pacing, form and final critic runs. Module-specific character receipts also match. Existing world-contact/GPU/controller tests are not repeated for an unchanged implementation.

## Visual judgment and rejected stages

The fresh Astra [baseline review](critic/baseline-v13/review.md) agrees with the creator: the second input produces a small deformation then resumes the same attached comet; tiny crumbs cannot overcome the dominant string silhouette. Its [native comparison](critic/baseline-v13/jumps-native.png) and original video are preserved.

[Candidate01](critic/candidate-01/review.md) finally makes the second action visibly different, but stable head-sized polygon chunks resemble orbiting rocks and pale cuts resemble paired wings. [Candidate02](critic/candidate-02/review.md) erodes those masses sooner and breaks the pale pairing. Candidate03 varies size, direction and speed and curves the torn contours, preserving the bold eruption while removing the neat orbit.

The final [independent review](critic/candidate-03/review.md) passes the requested response scope: three ordinary-time native jump pairs show compression, rupture, rapid erosion and rebuilding; released smoke continues independently after the player moves away. Cream eyes and hazards stay readable. The [native first/second-action comparison](critic/candidate-03/jumps-native.png), [receipt](critic/candidate-03/receipt.json) and original video are preserved. This is agent perceptual approval, not an S grade, a measured “10x,” or human acceptance.

Each candidate retains source/receipt/review evidence; selected rejected author frames remain in `character/rejected/`. Large diagnostic sheets and every extracted video frame remain in `tmp/ash-and-echo/rebirth-pass/critic/`; this bounded packet retains native jump comparisons and original baseline/final recordings instead of duplicating those sheets. Relative scratch references inside copied reviewer notes retain their original provenance.

The [process log](../../process-log.md) records the human correction, rejected attempts and working lessons for later skill extraction. No skills are changed.

## Limits

Evidence uses desktop Chrome, including phone-shaped emulation; it does not establish physical-phone/thermal performance or tactile feel. Missing atlas keeps the same particulate behavior with coarser tuft detail. The new material is presentation only and does not alter collision or delay input. The creator remains the authority on whether this meets the intended quality bar.
