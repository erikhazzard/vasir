# Revision13 — living ash and force at the contact

Playable: **http://localhost:8317/?v=13**. This packet freezes the character/contact response revision following the creator’s rejection of revision12 as still static and insufficiently impactful. Latest human overall calibration remains revision10 **solid A**. No S acceptance or numerical improvement factor is inferred.

The five [supplied references](user-references/1.png) establish a round dense eyed head, torn trailing ash, an eruption at the wall and a substantial landing. The final body has an explicitly round airborne nucleus leading a narrower deforming mantle; its air jump compresses, peels a compact fold, sheds and reforms. Landing spreads the lower body while retaining head and eye volume. Wall contact leaves a short fractured core and size-graded ballistic material at the resolved face; landings and departures respond proportionally.

Three runtime files change from revision12: [character.js](source/character.js), [surface-ash.js](source/surface-ash.js), and [renderer.js](source/renderer.js). Existing duplicate world-contact marks/chips and radial air-jump dots are removed. Controls, collision, course, suspension, scenery, shaders, image assets, UI and audio remain source-identical. No new render target, runtime shader, image or frame owner is introduced. The expanded contact pool is bounded at16 contacts ×38 ballistic shards, alongside existing224 attached residue grains; the character retains44 wake and38 death-burst slots and reuses15 mantle cross-sections.

## Actual play and cost

| Evidence | Observed result | Scope |
|---|---|---|
| [Touch opening](touch-opening.json), [continuous recording](touch-opening.webm) | All5 opening contacts at6.117 game seconds; no deaths or browser errors | Actual touches on visible controls; informed route |
| [Full climb](full-route.json), [continuous recording](full-climb.webm) | Summit at35.208 seconds;29 landings; deliberate checkpoint death, recovery and actual restart; no browser errors | Ordinary browser keyboard handlers; informed route |
| [Quiet pacing](performance.json) |26 repeated suspended contacts;1,093 frames; median/p95 16.7ms, p99/max16.8ms; none above33.4ms | Desktop Chrome390×844, DPR2; no screenshots/video in measured window |
| [Character boundaries](character/edge-report.json) |11 checks pass; air-charge/refill/interrupt/direction, death/reset, pool, zero-delta and Canvas/game-state boundaries | Actual deterministic game steps with explicit initial fixtures |
| [Contact boundaries](contact/causal-check.json) |14 checks pass; actual faces, direction, attached versus detached motion, real support, gentle spawn/toggle, bounds, expiry and reset | Focused scratch browser probe |

A final [desktop/small-portrait smoke](final-forms/receipt.json) captures the final morph at1280×900 and the actual gentle-effects toggle at320×568: no browser errors or horizontal overflow, all15 source hashes matched.

The character-only [cost probe](character/cost-report.json) additionally exercises normal, gentle and missing-atlas drawing without game-state mutation. Its small desktop CPU timings are supporting evidence, not a speedup or whole-renderer GPU claim. The unchanged controller suite and unchanged GPU lifecycle are not rerun merely to inflate coverage.

[Source identities](source-identities.json), [asset identities](asset-identities.json) and [served-source checks](served-source-checks.json) tie the runtime receipts to the frozen candidate. All15 served modules match in the final touch, route, pacing and independent contact-closure runs. Module-specific character/contact receipts also match their final source.

## Independent visual review and rejected stages

The fresh Astra [baseline critique](critic/baseline-review.md) agrees with the creator: the old moving triangle, invisible birthplace and flattened landing failed the desired response. This corrects revision12’s optimistic local approval.

The final [review](critic/review.md) closes the observed static-motion, robe/fin proportion and contact-birthplace findings using ordinary-time native sequences. [Character motion receipt](critic/character-final/receipt.json) covers three repeated releases; [final integrated contact receipt](critic/contact-closure/receipt.json) covers exposed ribs and outer walls. Original recordings and selected25fps frames are retained in those folders. Character motion was recorded before the last contact-only correction; the final integrated contact run matches all15 final modules. These are scoped visual judgments, not human feel or whole-game S acceptance.

[Rejected-stage receipts](critic/rejected-stages/) preserve source identities and selected earlier views. The first animated mantle could still resemble a robe; a pale closed peel resembled a ring; a volume-losing landing resembled an eyelid. Pressure arcs later overtook the head like whiskers, and late chips alone failed to show a birthplace. Their repairs target those relationships, rather than add independent effects indefinitely. The [process log](../../process-log.md) records the full sequence for later skill extraction; no skills are changed in this pass.

## Practical limits

Near foreground still partly occludes some left contact origins; outward debris emerges into open air. Exposed contacts show the complete birthplace. Moving ash does not fracture collision geometry. Desktop browser evidence does not establish physical-phone frame pacing, thermal behavior or tactile feel. The creator’s assessment remains the authority on the requested quality bar.
