# Ash & Echo — revision 23

This pass develops the creator's accepted “pretty good baseline” through purposeful ordinary movement, visible raven-to-ash recovery, a more varied cathedral climb and cohesive charcoal materials. The creator approved implementation toward S tier; that approval is not a new human quality grade.

## Player-visible change

Ash looks toward plausible landing surfaces, with the crown following the eyes and distinct braking/reversal responses. Raven wings retain their reach while material breaks off from tips toward shoulders and the core gathers independently. Detached primaries become porous strips, separating cinders and finer ash. Contact or a new action releases gathering immediately. The existing strong landing, wall-kick and chain responses remain intact.

The climb passes the nave's broken crown into distant spires and upper sky. Fixed architecture placement and source-aware values create the spatial reveal; fog still occupies the existing three depths. Thorn hooks retain pale warning shapes and dark crimson roots, with matte grain and shaded flanks. Unequal worn rims and fractures tie slabs and masonry together.

## Review history

[Baseline critique](reviews/baseline-review.md) identifies weak material recovery and repetitive pale arch framing. Root's first thorn treatment became too quiet; broader pale faces and a muted crimson root restored warning clarity. [Integrated round 1](reviews/round1-review.md) sees clearer native disassembly and the spatial reveal, but rejects persistent smooth primary fragments. The second character candidate replaces the late paper-like pieces with porous material and finer breakup. The reviewer rules out a suspected landing-crest problem after inspecting its brief motion chronology; no blanket reduction of impact strength is warranted.

[Integrated round 2](reviews/round2-review.md) closes the fragment finding at native and enlarged scale: the strong release remains, and later remnants become finer cinders. Eyes, immediate contact/rebound and ordinary intention remain clear. No further concrete visual repair is identified in the reviewed sequences. Frozen runtime is in [source/](source/); [source-verification.json](source-verification.json) binds the proof receipts. [Asset identities](asset-identities.json) identify the unchanged existing game art under `site/ash-and-echo/assets/`. Selected before/after world frames and rejected/refined character sheets preserve the actual visual decisions. The complete scratch review lives under `tmp/ash-and-echo/finishing-pass/`.

## Proof and limits

- [Touch](proof/touch.json): real visible touch controls reach all five opening contacts, including a wall kick and delayed double jump, with zero deaths/errors.
- [Keyboard climb](proof/keyboard.json) and [normal-time video](play/full-climb.webm): actual input reaches summit in 35.000 simulation seconds with 29 landings, deliberate checkpoint death/recovery and restart. An informed route, not newcomer or human feel evidence.
- Existing controller suite: 23 checks pass; the controller remains byte-identical to the accepted revision 22 wall fix.
- [Ordinary pacing](proof/ordinary-pacing.json): quiet desktop Chrome at 390×844, DPR 2,22 double jumps and 22 landings, 1,401 frames. Median/p95 16.7 ms, p99/max 16.8 ms, none above 33.4 ms. No recording or screenshots during measurement; no physical-phone or thermal claim.
- [Large-fall pacing](proof/heavy-pacing.json): sixteen arranged 650-unit falls through an intact upper-course column produce maximum-severity contacts. The rolling 1,800-frame window records median/p95 16.7 ms, p99/max 16.8 ms, none above 33.4 ms. This effects diagnostic retains all colliders and normal rendering; it is not natural-route or physical-phone proof.
- [Resource/lifecycle check](proof/resources.json): same 104 canvases, two GL contexts/programs/buffers and seven world textures as a [controlled frozen revision 22 run](proof/resources-baseline22.json). No warm-cache/restart growth, offscreen GPU targets or runtime GPU readbacks. Pause/Gentle pixels and three material context restores match.
- [Graphics fallback](proof/fallback.json) and [character material modes](proof/character-material.json): unavailable WebGL, world loss/restoration, Gentle and forced mediump pass. Character modes retain bounded GPU ownership and dispose their resources. These are capability fixtures, not phone certification.

The character remains a stylized shaded ash creature. Ordinary intention is a quieter gain than the transformation and world reveal. Model critique cannot award human S-tier acceptance.
