# Revision 7 — weight and place

Playable at **http://localhost:8317/**. The creator’s **B+ / A−** grade applies to revision6. This repair addresses their weak foreground, pasted-building and insufficient chain/world-response feedback. Fresh Astra critique closed the two material findings after further repair: foreground cache ends and scarcely visible chain recoil. It recommends human review, without assigning a new grade or claiming a literal tenfold improvement. S acceptance remains open.

## Retained changes

- One continuous Gothic facade replaces the ground-level arcade: unequal lancets, connected arch heads and uninterrupted piers. No rubble feet or floating underside in the traversed view.
- Near stone has a visible curved, fluted face and authored broken ends. A folded pennant answers wind and nearby impulses. Rejected the earlier hidden column/horizontal spur, three parallel needle strips, and then exposed rectangular cache caps.
- Hanging stones compress and rebound through the actual collider, carrying planted feet. Chains transmit a fast contact wave and slower opposing recoil, reaching about21px bow on an ordinary landing, capped25px with fixed endpoints. Grit releases at the pins; cages/bells follow through; stone response dominates reduced camera punch.
- Character recoil transfers weight through shoulders/eyes and curved falling tendrils; a delayed ash-shedding accent accompanies recovery. Input and authored jump impulse remain immediate. Bell/checkpoint events briefly startle the existing distant flocks.

## Evidence

| Claim | Receipt | Scope |
| --- | --- | --- |
| Full climb, checkpoint retry and restart | [Summary](route-summary.json), [full receipt](route-verified.json), [played video](played-route.webm) | Actual browser keys/read-only live geometry: all28 ledges, one wall kick, one deliberate death, grounded summit at34.5333 game seconds and restart. Predates only the final flock-startle direction correction. |
| Contact and controller integrity | `node --test test/ash-and-echo.test.js`:15/15 pass; [independent review](runtime-review.md) | Direct and wall-kick simulation routes, exact rider carry, authored jump velocity, buffer/coyote, restart and frame subdivision. Independent focused probes also passed. |
| Perceived foreground/weight repairs | [Fresh review](visual-review.md), [opening](opening-phone.png), [refuge](refuge-phone.png), [summit](summit-phone.png), [Retina summit](summit-retina.png) | Native motion reviewed before final closure from images/native recorded sequence. Scene-location images are arranged composition probes, not route evidence. |
| Chain load and recovery | [Native contact receipt](chain-contact.json), [contact video](chain-contact.webm), [load](chain-load.png), [recovery](chain-recovery.png), [cage](cage-follow-through.png), [bell](bell-response.png) | Touch start/keyboard opening contact plus explicitly arranged local bell/spider probes. [Numerical sweep](chain-bow-sweep.json) verifies capped bow and exact endpoints; [implementation notes](chain-recoil.md) qualify timing. |
| Character response | [Landing](character-land.png), [rebound](character-rebound.png), [fall](character-fall.png), [wall kick](character-wall-kick.png), [contract](character-contract.json) | Native-input poses. Isolated1,800-frame/73-event check: no simulation mutation, canvas-state leak or pause drift. Desktop character-only timing is not whole-device proof. |
| Quiet final frame pacing | [Receipt](renderer-pacing.json) | 1,217 frames, median/p95 16.7ms, p99/max16.8ms, no frames>33.4ms. Chrome152 on M5 Pro,390×844 DPR2 emulation, no recording/captures during measurement. All ten served JS hashes match the saved source. Stress workload includes deaths; not route proof. |
| Repeated suspension impact pacing | [Impact receipt](impact-pacing.json) | Actual keys mount the first hanging stone and repeat26 jumps;27 suspended contacts including initial mount, no deaths.1,470 sampled frames, p95 16.7ms, p99/max16.8ms, none>33.4ms. Same final ten JS hashes and desktop emulation; specifically exercises active chain/recoil/grit. |
| Bounded resources, pause and restoration | [Resource receipt](resource-receipt.json), [runtime checks](runtime-checks.json) | Four camera sweeps plateau:89 cached canvases, six total GPU textures, one buffer/program, zero offscreen targets; no allocations/uploads on repeated sweeps. Active pause frozen, shader gentle time/wake zero. Context loss/unavailable fallback and restoration playable;12 restarts stable; paused gentle frames byte-identical. |
| Shell/input and assets | [Shell receipt](shell-check.json) | Ten images loaded, keyboard start/jump/restart, pause focus containment and effects setting;320×568 portrait controls separated and at least64/82px, no horizontal overflow. |

The critic still sees room to improve the middle buttress’s fragment-like shape and ambient activity. Those are retained artistic limits, not evidence of a new failure. Physical phone/Safari performance, thermal headroom and human listening remain unverified. The Canvas2D fallback preserves play but does not reproduce the GPU cloud shader.

[Source identities](source-identities.json) cover current runtime/assets/contracts; `source/` preserves final JS/HTML/CSS. [Human-reviewed identities](human-reviewed-source-identities.json) preserve revision6. The new facade’s exact prompt, generated original and inspection are in [asset provenance](facade-provenance.md). Original PNG retained without raster editing;887×1774 RGBA with genuine openings, slightly translucent generated stone. No image-model identity was returned by the tool.

The [process log](../../process-log.md) preserves calibration and rejected candidates for later skill extraction. No skills were changed.
