# Revision 11 — living material through the full climb

The creator approved the shader proposals and clarified that the treatment must extend beyond the bell crossing. The playable page is [Ash & Echo](http://localhost:8317/?v=11). Latest human grade remains revision10 **solid A**; this packet does not award S.

Broad fog banks now have lit faces and shaded interiors throughout the ascent. Eleven architectural openings cover the first hops, hanging sections, checkpoint and summit. Selected moving stones and bells cast soft shadows into air and receiving architecture. The character's mantle and wake share a rolling, porous ash material, with the solid core, eyes, spent crescent and immediate controls preserved. Course, controller, audio and shell remain identical to revision10.

## Review and repairs

The fresh Astra critic inspected native movement and an informed full climb before reading implementation or comparisons. Its [initial review](critic-initial.md) found a strong A/A+ result, readable hierarchy and coherent ash, but insufficient causal shadow visibility. The checkpoint walkway's light missed its bell. A separate sidelight below the stone corrected that relationship; the [follow-up](critic-intermediate-hold.md) found improved attribution, still subtle at native size, and exposed new pale diagonal fog artifacts.

A smooth blend of aperture-directed fog samples failed to close the artifact. Raw-layer ablations localized it to varying the filtered sampling direction across narrow beams. High precision and removing casters did not help. A steady diffuse skylight removes the seams while apertures continue to affect transmitted light and cast shadows. Exact derivative/LOD behavior is a supported explanation, not an independently measured driver fact. Rejected views/source and the successful direction ablation remain in `rejected-ghost-edges/`.

The [final independent closure](critic-final/review.md) inspects the same upper before/jump/after sequence at native and enlarged scale: diagonals gone, rounded fog retained, clear player/chain/contact/hazard separation. This closes the finding without inventing a new overall grade. The [source audit](source-audit.md) finds no required production repair.

## Final playable evidence

- [Touch opening](touch-opening.webm), [receipt](touch-opening.json): actual visible-control touch contacts complete the five opening landmarks at 6.133 game seconds, without death or page errors. Wall kick, air jump, suspended contact and refuge are exercised.
- [Complete climb](full-climb.webm), [receipt](full-route.json): ordinary keyboard handlers reach summit at 35.408 seconds, including deliberate checkpoint death/recovery, 29 landings and restart; no page errors. These are informed scripted routes, not newcomer or human feel measurements.
- [Final fallback checks](fallback-checks.json): unavailable/lost/restored WebGL, repeated restarts, paused gentle-mode pixel stability and working jump. `fallback-sidelight.png` is an arranged active-play composition verifying the new horizontal painted-light path; an earlier paused capture obscured it and was discarded as visual evidence.
- [Source matches](served-source-checks.json): all 15 served JavaScript module hashes match frozen source in the final touch, climb, performance, fallback and critic-closure receipts.
- Character captures and qualified measurements are in [the character record](character/README.md). Ten semantic state/pool/interrupt checks pass. The 24-frame atlas is baked offline by the retained WebGL shader, not generated imagery: 230,925 file bytes, 393,216 nominal decoded RGBA bytes. Missing-atlas and gentle behavior are captured. The character-only desktop microbenchmark is not whole-game or phone performance proof.

## Performance and limits

The [final 26-contact run](performance.json) records 569 frames at median 33.3ms/p95 33.4ms. This differed from the [earlier11 candidate](performance-before-edge-fix.json), which held 16.7ms before the final sampling-direction repair. A [six-run control](cadence-diagnostic.json) alternates blank animation loop, revision10 and final revision11: every case is visible/focused and has the same approximately 30 Hz cadence. This supports a session scheduling limit, without establishing final 60 fps or physical-phone performance. No production timing workaround was added. Tiny floating-point overshoots of 33.4ms are preserved in raw receipts; they are not evidence of extra missed 30 Hz frames.

The earlier revision11 [resource sweep](resource-checks.json) plateaus at 90 canvas creations, seven GPU textures/uploads, one buffer/program, zero framebuffer targets and zero subuploads. It precedes the final light-placement and fog-direction repairs; those change math/uniform values within the same allocation topology. It counts creations, not retained memory or browser-internal Canvas resources. Final context recovery is separately verified above. Nineteen existing controller/camera tests passed earlier in this pass; that source remains unchanged.

Frozen source and asset identities are included. Only the new atlas is duplicated; existing raster assets remain in the game asset directory with their hashes recorded. Probe scripts preserve original repository-relative scratch paths. Character notes enumerate the larger scratch capture set; this packet retains selected native examples and their full receipts. Physical-phone play, thermal behavior and headphone listening remain unverified. The [process log](../../process-log.md) records the feedback, rejected attempts and lessons for later skill extraction; no skill was edited.
