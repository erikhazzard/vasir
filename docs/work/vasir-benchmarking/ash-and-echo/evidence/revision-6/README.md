# Revision 6 — living air, weight and ash

Playable at **http://localhost:8317/**. This packet records the living-world repair after the creator’s **B-ish environment** feedback on revision 5. That remains the latest human anchor. The fresh Astra review placed the candidate at **B+ before the last summit-framing repair**. Its image-only follow-up retained the framing but supplied no new grade. S acceptance remains open; no complete weighted score or human feel rating is inferred.

## What changed

- Restored the city’s source aspect, contours and useful tonal range; removed baked birds through imagegen; added a coherent open arcade. Separate scene distances stay recognizable through moving white/gray cloud banks.
- Two independently flying flocks, airborne ash at different distances, local air disturbances and more frequent complete foreground ledges.
- Simulation-owned suspended stones carry planted feet, sag under weight and recover after departure. Chains retain fixed anchors; cages, bell bodies and clappers receive bounded contact/proximity impulses.
- Spiders track the player and regrip. A first hidden placement failed native-size review; the middle spider now faces the ordinary crossing, with exposed knees and stronger eye readability.
- Double jump breaks into unequal ash fragments around an eye nucleus and gathers by approximately 470ms. Rejected an earlier bat-wing silhouette.
- An asymmetric darker arch frames a pale summit opening. The final 24-logical-pixel upward adjustment clears a tangent with the portal crown. The atmosphere still reads as an upper stone chamber; a fully convincing above-cloud reveal is not established.

## Evidence and scope

| Claim | Receipt | Scope |
| --- | --- | --- |
| All 28 ledges, one wall kick, deliberate checkpoint death/retry, missed-landing recovery, summit and restart | [Route summary](route-summary.json), [full receipt](route-verified.json), [silent actual-key video](played-route.webm) | 39.0333 game seconds. Browser keys and read-only live geometry; no arranged movement. Predates only final summit scenery/air changes. |
| Independent complete route | [Independent receipt](independent-route.json), [visual review](visual-review.md) | Won with no deaths. Informed play; not unprimed learning or physical touch evidence. |
| Deterministic movement and translated support | `node --test test/ash-and-echo.test.js`: 15/15 pass; [edge probes](moving-contact-edges.json) | Existing movement suite plus three support/carry/restart cases; independent coyote and live-spring death/retry probes. |
| White/gray fog visible while stationary | [Start](stationary-0.png), [three seconds later](stationary-3s.png), [review](visual-review.md) | Native 390×844. Before final summit-only changes; same ordinary fog/flight behavior. |
| Stone, cage and bell reaction | [Prop receipt](props-response.json), [contact](stone-contact.png), [loaded](stone-loaded.png), [release/cage](stone-release-and-cage.png), [bell](bell-response.png) | Opening actual input plus explicitly arranged local bell/spider probes in receipt. The old spider location in this receipt is superseded. |
| Final spider response reaches lit edge | [Approach](spider-approach.png), [near answer](spider-near-answer.png), [pass head](spider-pass-head.png), [receipt](spider-response.json) | Arranged initial ledge position followed by actual keyboard approach/jump/leave. Local response evidence; not route proof. Eye/head response stays quieter than the player’s effects. |
| Ash breakup, reformation, pause/context discipline | [Phone sequence](character-mobile-sequence.png), [desktop sequence](character-desktop-sequence.png), [contract](character-contract.json) | Sequences combine native-input frames with labels. 1,800 frames / 73 events; final character source unchanged afterward. |
| Final summit composition | [Phone](summit-phone.png), [Retina](summit-retina.png), [refuge comparison](refuge-phone.png) | Arranged composition. Final summit images include clearance fix after reviewer addendum; no new whole-game grade. |
| Stable quiet frame pacing | [Receipt](renderer-pacing.json) | 1,222 frames; median/p95 16.7ms, p99/max16.8ms, none >33.4ms. Chrome152 on Apple M5 Pro, 390×844 DPR2 emulation, no capture/video during window. Final nine served JS hashes verified. Stress jumping includes deaths; not a route or physical-phone test. |
| Fallback, restoration, restart and pause | [Runtime checks](runtime-checks.json), [independent review](runtime-review.md), [resource receipt](runtime-review-receipt.json) | WebGL unavailable/lost fallback playable; restored five cached image textures; 12 restarts stable; paused gentler-effects frames byte-identical. Separate resource review plateaued at 90 cached canvases, six total GPU textures, one buffer/program, no offscreen targets or repeat uploads. |
| Desktop keyboard shell and smallest portrait | [Shell check](shell-check.json) | Ten images loaded; focus containment, effects setting, start/jump/restart pass; 320×568 has separate64/82px controls and no horizontal overflow. |

Physical phone/Safari performance, thermal headroom and human listening remain unverified. The optional Canvas2D fallback preserves play and painted atmosphere, but does not reproduce the GPU’s cloud shader. These limits do not explain away or replace the creator’s artistic feedback.

## Provenance

[Source identities](source-identities.json) cover runtime, asset files and contract documents. The `source/` directory preserves final JS/HTML/CSS; original PNGs remain in the game’s asset directory with their hashes. [Human B-ish build identities](human-bish-build-identities.txt) identify the preceding frozen source.

[Depth diagnosis](depth-diagnosis.md) documents the blur/aspect/value evidence. [Asset provenance](asset-provenance.md) preserves both new imagegen prompts, original exports, alpha checks and deviations. No model-version metadata was returned by the image tool. Historical review/source identities remain scoped to their earlier captures.

The [process log](../../process-log.md) records rejected attempts and calibration misses for later skill extraction. No skills were created or changed in this pass.
