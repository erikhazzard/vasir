# Revision 16: rolling air and shared material light

Playable: http://localhost:8317/?v=16

The creator liked the raven transformation and requested a substantial shader elevation with several rounds of judging and repair. This build strengthens the whole climb’s fog, architectural depth and material lighting while preserving the accepted body transformation and controls.

Large rolling banks now have shaded interiors, directional lit faces and calm gaps. Fixed cathedral openings supply local shafts and light selected stone chips, coal and raven feathers. Architectural grades distinguish near structure from distant towers. Detached soot deforms independently instead of repeating hollow cellular stamps.

Six runtime modules change: `atmosphere.js`, `fog-volume.js`, `depth.js`, `renderer.js`, `character.js` and `ash-flow.js`. The existing frame owner, WebGL program/default framebuffer, three interleaved air submissions, fixed character surface and pools remain. No assets are added or changed. Eight noise samples replace six per covered air fragment. Fragment high precision is conditional on support, with the mediump fallback retained.

## Judging and repair

1. [Baseline critique](critic/baseline.md): broad gray ribbons, similar pale architectural planes and comparatively flat playable material.
2. [Round 1](critic/round-1.md): more directional volume reveals architecture, but a repeated quilt of pale/dark patches still covers too much of the shaft. Rejected.
3. Local sparse revision: removing that coverage improves clarity but loses too much visible air. Preserved as `atmosphere/candidate-02/` and `stage-02/`.
4. [Integrated round 2](critic/round-2.md): larger rotated banks, light spans that scale with cloud size, calm corridors and coordinated stone/character material close the environment finding across opening, middle, checkpoint and upper climb.
5. [Additional fresh Astra challenge](fresh-final-review.md): independently compares saved baseline/final gameplay without reading earlier verdicts; finds no major visual blocker. A minor dark raven-tail/roof contrast watchpoint in gentle mode remains.

The reviewers pass the scoped visual improvement. Neither supplies human acceptance of S tier or proof of a universal ceiling. Some bright released pieces read as dry ash/feather flakes rather than turbulent smoke; the reviewer retains that stylistic observation without calling for another emitter redesign.

Useful comparisons:

- Middle depth: [baseline](critic/baseline-v15/native-middle-before.png), [rejected patch quilt](critic/round-1/native-middle-before.png), [final](critic/round-2/native-middle-before.png).
- Upper action: [first round](critic/round-1/native-upper-air.png), [final](critic/round-2/native-upper-air.png).
- Whole-climb language: [opening](critic/round-2/native-opening-air.png), [checkpoint](critic/round-2/native-checkpoint-air.png), [enlarged middle](critic/round-2/desktop-middle-before.png), [gentle upper](critic/round-2/gentle-upper-air.png).
- Ambient motion: [stationary hold A](critic/round-2/native-sequence/frame-043.png), [hold B](critic/round-2/native-sequence/frame-057.png). Original ordinary-time videos remain under each critic stage’s video folders.

Critic scene starts are arranged, followed by real browser keys. The root’s complete route and touch proof are separate. Character diagnostic captures control frame advancement to inspect poses and material; they do not establish full-rate feel. Review frame paths are relative to `critic/`. Large raw frame sequences remain in `tmp/ash-and-echo/shader-pass/critic/`; cited keyframes and original videos are preserved here.

## Integrated proof

| Check | Final observation | Receipt |
| --- | --- | --- |
| Actual Chrome touch controls | Five opening contacts at 5.942 game seconds; zero deaths/errors | [Touch](touch-opening.json) |
| Ordinary keyboard climb | Summit at 35.108 seconds; 29 landings; deliberate checkpoint death/recovery at 19.258 seconds; restart works | [Full route](full-route.json) |
| Quiet combined pacing | 22 double jumps and 22 landings; 1,401 frames; median/p95 16.7 ms, p99/max 16.8 ms; none above 33.4 ms | [Pacing](performance.json) |
| Resource plateau | Camera sweeps stop adding resources at 103 canvas creations, seven GL textures/uploads, one program/buffer and zero framebuffer targets; no paused texture uploads | [Resources](runtime/resource-receipt.json) |
| Fallback and lifecycle | Lost/restored/unavailable WebGL, paused gentle pixels, repeated restart and actual jumping pass | [Fallback](runtime/fallback-receipt.json) |
| Character boundaries | Twelve state/surface cases pass; raven anatomy, eyes and timing unchanged from v15 | [Character checks](character/edge-report.json), [anatomy](character/anatomy-invariants.json) |
| Form factors | Desktop and 320×568 actual gentle setting have no overflow or browser errors | [Forms](final-forms/receipt.json) |
| Identity | All 15 final served modules match root play/runtime/forms, round2 critic and final live HTTP | [Source checks](served-source-checks.json) |

Pacing is desktop Chrome at 390×844 DPR2 with all other agent browsers closed and no screenshots/video during the measured window. It is not physical-phone or thermal evidence. Canvas creation counters establish a plateau, not a live-object census. Restoration lazily reloads only the textures visible at the restored viewpoint.

The isolated atmosphere GPU probe covers only backdrop plus three air layers at 585×1266: valid timestamps around 0.177 ms for final versus 0.199 ms for baseline in one run, expected draw count, zero GL errors, identical pixels at equal time and changed pixels under continuous wind. Although the artifact filename contains `quiet`, root-route overlap cannot be excluded. This is supporting bounded-cost evidence, not a claimed optimization win; the uncontended combined sample above owns the pacing conclusion.

The beam-only character comparison and `character/beam-candidate-report.json` belong to material round01 (`85e79d3…`), before the final soot-opacity correction. They match the preserved round01 character bytes. Final state, native candidate and integrated play proof match final `c70b10e3…`. The local character CPU comparison shares the current atlas helper across both character versions and is not a complete old/new renderer comparison.

## Record

`source/` freezes the final 20 production/source-document files; source and asset identity JSONs identify exact bytes. Prior source remains in [revision15](../revision-15/README.md). `critic/`, `atmosphere/` and `character/` preserve rejected stages, final reports and bounded media. Root play videos, probe scripts and fallback views are included; scripts retain their original local browser dependencies and scratch output paths.

The [process log](../../process-log.md) records the coverage failure, too-quiet intermediate, material correction, two judging rounds and fresh independent challenge. Skill extraction remains deferred. This feedback-rich reference is not a clean benchmark contestant.
