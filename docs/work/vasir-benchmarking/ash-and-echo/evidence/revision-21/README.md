# Revision 21 — embodied ash and fog around the pillars

September 6, 2026. Playable: http://localhost:8317/?v=21.

The creator accepted revision20 as “Much better,” then requested another character elevation and fog moving behind/in front of pillars. The latest human overall grade remains unchanged; this packet does not certify S-tier quality.

## What changed

The raven has a broader, lower near wing and a raised, foreshortened far wing. Two wrist-flex springs and one rear-crust spring add secondary response to movement. Ordinary acceleration/braking affects the mantle; existing particles now release at actual curved feather tips during extension and folding. Broader diffuse ash shading and softened shoulder overlaps give the body more interior form. Light normalization runs once per draw; impulse-driven flow displacement no longer grows with session age. The existing five audio voices remain, with quiet recovery moved to the395ms fold.

Fog retains its three existing ordered draws. Rear opacity increases .25→.68 before the gallery; middle decreases .90→.48 before close stone; front remains restrained at .30. Anisotropic banks pass through existing alpha openings and stop at opaque pillar faces. The lighter front bank crosses those faces separately. Canvas fallback reuses the existing fog bitmap at the same three depths, adding two bounded image draws.

No new render owner, target, texture, particle pool or gameplay mechanic. World fog keeps eight noise texture taps per covered fragment and the existing resolution cap. The character keeps its288² body surface,256² live shader,144 wake slots and38 burst slots; three scalar spring pairs and three shader floats are added. Controller, level and revision19 heavy-fall presentation remain authoritative.

## Independent critique and repairs

Fresh Astra character/fog authors and a separate fresh Astra critic inspected a frozen20 baseline and two integrated candidates at native390×844 and enlarged game size. Character timing uses real keyboard input and normal RAF from arranged starting/contact states; environment pairs keep the camera fixed while fog advances, alongside ordinary ascent/run/wall sequences.

Round1 accepted the stronger banking and visible fog occlusion, but rejected the near-black native body and enlarged folded-leather appearance. Round2 broadened low-contrast diffuse ash beneath quieter grain and softened the painted overlap bands. The final critic sees a shaded underside, side and wing roots, with clear eyes, contact/rebound and Gentle states. It finds no new concrete blocking visual defect. Its highest material ambition remains CLOSE: native ordinary-body improvement is restrained; this is a stylized shaded raven, not volumetric smoke. Do not describe that narrower gain as dramatic or turn it into a numerical quality multiplier.

Fog's specific spatial finding closes in the observed views: moving bay banks are interrupted by continuous pillar flutes and arch frames while a faint separate veil crosses stone. Three fixed-camera heights and ordinary ascent showed no new crop seam, washed overlay or camera-driven fog jump.

See `critic/{baseline,round1,round2}-review.md`. This compact packet retains selected whole-context frames, fog time pairs, source/receipts and baseline/final normal-time videos. Full extraction sets remain in `tmp/ash-and-echo/embodied-depth-pass/critic`; report references to unselected supporting frames refer to that original set. Native final pose: `critic/round2-native/double-pose-context.png`; fog: `critic/round2-environment-native/ledge-7-fog-{a,b}.png` and ledge20 pair.

## Final proof

`source-bindings.json` verifies ten final receipts against the same sixteen served modules. `source/` freezes those modules, HTML/CSS and the implementation contract. Asset hashes are unchanged from revision20.

| Observation | Result | Evidence |
|---|---|---|
| Existing controller suite |22/22 passed |`controller-tests.txt`|
| Visible touch controls |Five opening contacts, one double jump, no death/error |`played-touch-opening/receipt.json`, video|
| Full keyboard route |Summit35.383s,29 landings,26 doubles, deliberate checkpoint death/recovery, actual restart; no errors |`played-full-route/receipt.json`, video|
| Ordinary cadence |22 doubles/22 landings,1,401 frames; median/p9516.7ms,p99/max16.8ms;zero>33.4ms |`routine-performance/receipt.json`|
| Maximum-impact cadence |16 arranged650-unit actual-collision falls, severity1;1,800 frames with the same cadence range |`landing-performance/receipt.json`|
| Resource/lifecycle |Warm camera sweeps/12 restarts plateau;91 cached canvases,2GLcontexts/programs/buffers,7world textures/uploads,0FBO or runtime GPU readbacks;3same-context character restores preserve paused pixels |`resources/receipt.json`|
| Pause/Gentle/fallback |Frozen pixels; missing/lost world and character GL preserve playable fallback; restoration returns live rendering |`fallback/checks.json`, `resources/receipt.json`|
| World restoration |3cycles return identical paused world pixels |`fog/lifecycle/receipt.json`|
| Shader precision/disposal |New uniforms survive3restores; forced mediump compiles/renders; repeated dispose releases resources |`material/restore-metrics.json`|
| Audio |Eight offline baseline/candidate phrases: no clipping/nonfinite samples, no pre-unlock sound, tails end and nodes clean up; unchanged voice counts |`audio/summary.json`, paired WAV reels|

The character author's isolated body proof also found no clipped surface edges, paused drift or stale wings after contact. See `character/candidate4/proof.json`. The fog author's exact-clock before/after images are controlled composition diagnostics, not normal-time gameplay proof; their owning file hashes remain final, while unrelated character files in those earlier captures may predate the last material repair.

Cadence is desktop Chrome at390×844,DPR2 on this Mac with capture browsers/ffmpeg closed during measurement. It does not establish physical-phone, thermal or GPU elapsed-time performance. Routes are informed scripts, not newcomer or human-feel scores. Forced mediump runs on this host, not a limited-precision handset. Offline audio is synthesis/cleanup evidence, not headphone judgment. Canvas fallback preserves ordering with softer radial banks, not shader-quality clouds.

The rationale, rejected material attempt and qualified outcome are recorded in `../../process-log.md`, section25. Skill extraction remains deferred.
