# Revision 18 — landing onset that survives ordinary play

The creator rejected revision 17: it did not feel different, with “no screenshake” or large visible effect. This supersedes that revision's focused judge approval. The correction targets ordinary 50–160-unit descents and immediate rebounds, rather than a held pose or rare maximum drop.

[Play the working game](http://localhost:8317/?v=18). Exact reviewed modules are frozen in `source/`; unchanged raster assets are identified in `identities.json`. Only `renderer.js` and `surface-ash.js` change at runtime from revision 17.

## What was wrong

The old squared spring impulse moved a typical 80-unit landing by about 0.17 mobile CSS pixels. A 300-unit drop produced about 1.65 pixels. Most cathedral scenery, GPU fog and near architecture did not move at all because they were outside the gameplay impact transform. In quick traversal, the crouch ended on the next input before it could carry the effect. The low, dark ash also merged with the receiving stone.

Fresh browser checks loaded matching production modules and found no service worker or stale-build evidence. Gentle mode intentionally disables camera displacement, initially following the OS preference; it survives restart but is not persisted across reloads.

## Final change

A landing now drives a direct downward punch, reverse kick and short lateral rattle across both existing canvas elements. Their transforms match; the DOM HUD stays still. Offset is bounded at 11 logical units. Fixed overscan covers every edge, without another canvas, shader target, render submission or frame owner. The game simulation, jump impulse and fall-weight semantics are unchanged.

| Actual fall | Mobile peak vertical displacement |
|---|---:|
| 80 units | ~4.0 CSS px |
| 160 | ~6.7 px |
| 300 | ~8.9 px |
| 508 | ~9.9 px |

Surface ash uses more of its existing presentation range on ordinary falls. The final effect has a low torn skirt, two asymmetric rising strikes outside the central head/body corridor, brief broken ivory leading edges and existing chips born outside the body. The strike lasts up to 110 ms, then leaves independent fragments. Tiny contacts stay quiet. The character and particle-pool capacities retain revision 17 behavior.

## Review and rejected candidate

[Baseline recalibration](critique/baseline.md) explicitly records why the earlier approval was inadequate. Actual fast-contact native/enlarged traversal showed weak landing onset before the more visible subsequent jump.

[Round 1](critique/round-1.md) accepted the new camera while leaving the surface gate open: low dark shoulders still hid ordinary contact, and the maximum case formed smooth gray oval/petal shapes. Root's native still read agreed. That intermediate source and video remain in `critique/final-common/`; the surface author also retains rejected snapshots.

[Round 2](critique/round-2.md) reviews the corrected strike on final-source actual input sequences. Ordinary 77-unit contact now has an independently legible bright/dark strike before immediate rebound; 146-unit and repeated suspended contacts show transferred force while continuing onward. Enlarged play preserves it. The former oval lobes are absent from the bound check. [Twelve mapped native/enlarged frames](critique/selected-final/selection.json) and original normal-time clips are retained.

This closes the two scoped visibility findings in the model review. It does not establish human satisfaction, a numerical improvement factor or a whole-game S grade. Gentle mode is deliberately much quieter, and near architecture can partly occlude outward material.

## Verification

- **Actual touch:** five opening contacts at 6.017 game seconds, zero deaths/errors. `play/played-touch-opening/`.
- **Actual keyboard climb:** summit at 35.300 seconds, 29 landings, deliberate checkpoint death/recovery and restart. `play/played-full-route/`.
- **Controller:** all 22 existing behavior checks pass. No simulation or test code changed in this revision.
- **Camera composition:** 1,152 samples across 320/390/1280 widths, both directions and four fall heights. Both canvas matrices match the reported camera offset; HUD remains fixed; all corners cover the frame with at least 7.4 CSS pixels of margin. Pause is stable and Gentle/restart clear offsets. `camera/final-camera-receipt.json` and full sample report.
- **Backend/lifecycle:** context loss, restoration, absent WebGL, actual jump and stable paused Gentle rendering pass. `play/fallback/checks.json`.
- **Quiet pacing:** desktop Chrome at 390×844 DPR2, actual keyboard opening followed by 22 double jumps and 22 landings, without screenshots/video during measurement. Across 1,400 frames, median/p95 are 16.7 ms, p99/max 16.8 ms, none above 33.4 ms. `play/routine-performance/receipt.json`. This is not physical-phone or thermal evidence.
- **Surface ownership:** same 608 shard/224 grain capacity and one existing contact owner. Pause, reset, clipping, overflow, Gentle limits and immediate rebound checks pass; ground/wall departure state matches the previous source. `surface/check-results.json`.

All 15 served module identities match final source in touch, full route, pacing, fallback and the four final critic captures. Camera checks match the final renderer. Prior intermediate captures preserve their different hashes explicitly. Large extraction sequences remain scratch material; this packet retains selected frames, clips, receipts and source instead.

The process, failed assumptions and repairs are recorded in [the process log](../../process-log.md). Skills remain unchanged for later extraction. The local page is left running; in Pause, **Gentler effects** must be off to see camera shake.
