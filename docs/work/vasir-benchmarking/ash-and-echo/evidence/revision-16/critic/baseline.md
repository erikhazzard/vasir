# Revision16 shader baseline critique

Verdict: **CLOSE for the requested shader elevation.** The active game is readable and authored, but its atmosphere often applies a broad pale treatment across too much architecture. Additional effect count will not establish a stronger depth hierarchy.

Frozen baseline: revision15 source, captured through scratch routes. Full per-module identities and served identities are in `baseline-v15/receipt.json`; original source bytes are in `baseline-v15/source/`. No production files changed. Images remain the existing live asset set.

Material: native390×844 and desktop1280×1300 opening, middle, checkpoint and upper before/input/after frames; native and desktop normal-time videos; a5fps native sequence for qualitative atmosphere comparison. Starting positions were arranged, then real keyboard input and normalRAF drive jump/air-jump/landing. Screenshots interrupt timing briefly, so these are not performance captures. All24 images completed with0page errors. Browser contexts are closed pending candidate review.

## Active-play read

I am the ash creature climbing toward the next ledge. The raven transformation clearly answers the extra jump, and the pale eyes keep the head identifiable. Crimson/ivory thorns mark hazards. I would keep playing from these moments. The current shortcoming is environmental hierarchy and material integration, rather than confusing the core action.

## Strongest three improvements

1. **Fog needs more volumetric form and selective placement.** In `baseline-v15/native-middle-before.png` and `native-upper-before.png`, several broad soft horizontal gray bands read as an overlay across the shaft. The center is often similar brightness from top to bottom. Give banks a legible light-facing edge and denser body, directional light pockets and substantial calm gaps. Preserve architectural edges outside the actual cloud volume. Avoid returning to jump-driven fog deformation or a global white veil.
2. **Depth planes need distinct contrast and occlusion.** The long middle/back façades frequently share pale, fine texture and similar edge quality. This is strongest enlarged in `desktop-middle-before.png`. Attenuation should differ by depth, with air accumulating around specific forms and openings, so one can read a nearer architectural mass, distant towers and space between them. Uniformly brightening or blurring the background would reduce the distinctions further.
3. **Light must also belong to the physical stone/material plane.** The air has much more visual treatment than the playable ledges and bell structures. `desktop-upper-air.png` shows that separation clearly: the dark stone is a comparatively flat inserted layer over luminous air. A small number of spatially anchored rough light catches and dark material pockets can unite them. Avoid outlining every edge, brightening every chain, or making the world compete with eyes and thorns.

## Preserve

- Raven/body recognition and bright head anchor. `native-checkpoint-air.png` is already clear against the pale shaft.
- Crimson hazard edges; remain readable through haze and at the edge of a bank.
- Dark near foreground as a distinct depth cue, with its existing occlusion and parallax. Do not solve every dark region with bloom.
- Existing moving supports/contact eruptions. They already establish local causality.
- World-fixed lighting and fog that evolves independently of jumping.

## Candidate gates

Round1 must show a visibly stronger light/fog hierarchy at native scale across all four sampled regions, not merely a busier opening shot. Reject blanket wash, gray/brown blobs, screen-space light strips, hard shader seams, plastic outlines, or fog that hides the next landing.

Round2 must close the strongest concrete first-round issue and preserve the raven, hazards and landing read during normal-time movement. Root owns quiet combined runtime/fallback proof; visible shader compile failures or obvious capture jank remain immediate blockers here.

No new overall game letter grade or S-tier claim is assigned.
