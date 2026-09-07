# Revision 12 — connected ash morph and substantial masonry

[Play Ash & Echo](http://localhost:8317/?v=12).

The creator reported recurring flat projecting stone faces and asked for a much stronger character morph, supplying comet, landing and ash-fragment references. Those five unchanged images are retained in `user-references/`. This revision changes only production `character.js` and `renderer.js`, plus documentation. Controller, course, hazards, shaders, audio, shell and image assets match revision11.

The character's dense eyed head now leads a connected, velocity-aligned torn body. A brief compression releases into a mantle up to 109 logical pixels long; broad unequal tears dissolve into the existing porous material. Both wall kicks preserve the directional relationship. Incoming ash folds into a contact-clipped fan over 180 ms, with larger irregular fragments, then the creature reforms. The nucleus and eyes share their transform. Immediate input, spent/refill state, planted contacts, quiet rest and gentle effects remain.

All four projecting ribs now use uneven interlocking courses, rough faces, broad illuminated returns and a shared fractured cap. Small per-course edge breaks stay within the existing solid profile. Rendering still uses the same cached bitmaps and one image draw per visible rib.

## Review-driven repairs

The first masonry attempt looked too much like regular brickwork. Its replacement improved the front face but retained a thin, straight exposed rim in the creator's enlarged viewing context. The final version gives individual stones 12–19px rough side faces and 0.6–2.3px chipped edges. [Independent closure](critic/masonry-closure.md) compares all four native mobile/desktop views and enlarged details: the stones visibly turn the corner, closing the reported side-sheet mechanism. The rejected stages remain under `masonry/`.

The first comet tail could resemble a tassel. A denser shoulder and three larger unequal cuts preserve connected mass before it breaks apart. Contact initially removed the mantle instantly; it now visibly collapses after the head arrests, while a new jump immediately interrupts that recovery. Eye height was adjusted after exaggerated landing compression thinned the face too far.

The [fresh Astra movement review](critic/review.md) used ordinary browser input and continuous recordings. It finds a convincing connected comet, coherent compression/release, both wall directions, visible landing reformation and a restrained gentle mode. Its verdict applies to the reviewed movement slice, with no required motion repair. Its masonry section is explicitly intermediate; the later closure above covers final masonry. No new human overall grade or quantitative 10× claim is inferred. Latest human overall anchor remains revision10 solid A.

## Final play and supporting proof

- [Touch opening](touch-opening.webm), [receipt](touch-opening.json): actual contacts on visible controls complete the five opening landmarks at 5.875 game seconds, including wall kick, air jump and suspended contact; no death or page errors.
- [Full climb](full-climb.webm), [receipt](full-route.json): ordinary keyboard handlers reach summit at 35.042 game seconds, including deliberate checkpoint death/recovery, 29 landings and restart; no page errors. These are informed scripted routes, not newcomer testing or human feel measurements.
- [Quiet frame pacing](performance.json): 390×844 DPR2 desktop Chrome, 26 repeated suspended contacts, 1,093 frames; median/p95 16.7 ms, p99/max 16.8 ms, none over 33.4 ms. This session held 60 fps; it does not erase revision11's documented browser-wide 30 Hz scheduling result or establish physical-phone/thermal performance.
- [Character proof](character/README.md): 22 paired native gameplay snapshots remain exactly equal to baseline; 11 semantic state/interrupt/pool checks pass. Both kick directions, spent/refill, buffered rebound, death/reset and zero-delta freeze are covered. Final native/diagonal/desktop captures and final normal/gentle/missing-atlas draw checks are retained. Prior gentle/fallback screenshots predate the last small shoulder/eye tuning; the independent review separately exercises final character gentle mode through the real UI.
- [Masonry proof](masonry/README.md): all four ribs at native mobile and desktop scale, unchanged cache dimensions, alpha255 three logical pixels inside actual contact faces, no page errors. These are arranged static composition checks; final route videos provide active-play context.
- [Source identities](served-source-checks.json): all 15 modules in final touch, full climb and pacing receipts match the frozen source. The character review precedes the final cached-wall refinement, with the final renderer separately matched by masonry closure.

## Cost and evidence limits

Same frame owner, GPU passes/targets, wall-cache dimensions, 224×224 body surface, six current chains, 44 wake slots and 38 burst slots. No new image, canvas, runtime shader, emitter, readback or worker. The existing two mantle atlas draws now contribute to one clipped world-space shape; its ordinary airborne window is broader than the old air-jump-only gesture. Cache construction is more detailed and runs only on misses. Kit changes invalidate dependent walls.

The final alternating character microbenchmark records baseline/candidate median submission 0.0352/0.0437 ms, or 0.0447/0.0460 ms including an end-of-batch flush. This is a bounded desktop CPU check, not a claimed speedup or mobile GPU measurement. Existing GPU fallback/loss behavior is unchanged from revision11 and was not broadly retested; the changed optional-atlas drawing paths were checked. No new physics test was warranted because authoritative source is unchanged.

This packet retains selected native frames, original recordings, exact source, full receipts, references and rejected candidates. Specialist notes also describe the larger scratch capture catalog. Probe scripts preserve the original repository-relative scratch destinations and this machine's existing Playwright installation. Image assets are identified by hash rather than duplicated; they remain in the game asset directory. Physical-phone play and headphone listening remain unverified. The [process log](../../process-log.md) records this iteration for later skill extraction; no skill was edited.
