# Revision 7 focused runtime contract review

Mode: Release Audit / FOCUSED CODE. Scope: current game.js, renderer.js, audio.js, character.js, depth.js, foreground.js against evidence/revision-6/source. Read-only product review; no browser started.

Verdict: SHIP at this bounded coverage. No material correctness or lifecycle finding. This is not an aesthetic verdict or a measured performance claim.

FACT — Node simulation probe placed the character above ledge-1 at downward speed 700. Contact emitted exactly one suspended land event. Across the next 240 authoritative steps, maximum foot/support separation was 0 pixels, repeated land events were zero, peak depression was 9.409571 pixels, and final loaded depression was 4.194799 pixels. The next jump emitted authored vertical speed −820.512821 (post-gravity player speed −802.980495). Restart restored every suspended platform to home coordinates with zero velocity and elapsed=0. A separate expired-coyote/no-air-charge probe emitted [land,jump] in a single step, with player airborne at −820.512821. A one-second step and 120 steps of 1/120 produced identical serialized player, suspension, event, and elapsed state (elapsed=0.9999999999999989).

FACT — game.js:184–208 advances suspension once per authoritative tick and carries the rider by displacement before input resolves. game.js:246–250 clears support on jump; 314–322 applies the stronger impulse only on newly acquired support. Fixed-step shell ownership and elapsed accounting remain unchanged (main.js:240–257; game.js:366–370,449 onward).

FACT — renderer.js:633–719 bounds cached rigging to eligible authored platforms, each with two cables, eight pairs of immutable segment Path2Ds and two full-length rest Path2Ds per cable. Resting cables execute two strokes; recent contact executes sixteen strokes per cable for <1.4 seconds. No per-frame path allocation or new frame owner, scene-scale pass, GPU target, readback, or terminal canvas is introduced. Existing Canvas2D world owner and atmosphere output topology remain unchanged. Foreground replaces the former near-plane cached raster with one cached rib raster plus at most the visible authored cloth shapes. Preparation uses an asset-identity guard; obsolete temporary rasters have no retained owner. Domain disposition: SAFE_LOCAL_CHANGE. Runtime timing remains root's separate measurement boundary.

FACT — renderer.js:529–544 advances rigging age and triggers anchor grit once when crossing 170ms; dt=0 neither ages the wave nor crosses the threshold. main.js:256 supplies zero renderer delta during pause. renderer.js:676 suppresses segmented waves under reduced motion, while socket transforms continue to follow the authoritative platform. resetEffects sets all rigging ages to 10 (renderer.js:117–131), suppressing pending wave/grit after restart without rebuilding immutable caches. Particle storage remains a fixed pool of 128. Toggling reduced motion suppresses presentation, not authoritative support movement.

FACT — audio changes only two existing chain-landing voices' envelopes/frequencies. Existing counted source budget, scheduled stop and onended disconnect paths remain intact (audio.js:147–184,291–292,324–331). Character recoil and foreground gust remain presentation-owned and read simulation state.

Needs validation: no additional correctness discriminator required at this scope. No browser performance, GPU allocation plateau, target-device smoothness, or aesthetic grade was measured here. Canonical 15-test pass was supplied by the parent and was not rerun.

Action: none from this review; proceed with the parent's existing focused visual/performance validation.
