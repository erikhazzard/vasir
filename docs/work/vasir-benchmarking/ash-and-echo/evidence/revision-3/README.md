# Ash & Echo — environmental depth revision

The author called the previous hazard/character revision “MUCH better” but rated its environmental art direction approximately **C−** against the supplied LIMBO frame. That human calibration supersedes the previous model A-candidate visual recommendation. This packet records the resulting depth repair, not a new human grade or a scored Games benchmark result.

The revised game is served at `http://localhost:8317/`. The exact earlier C− source remains at `tmp/ash-and-echo/cminus-depth-baseline/`, served on port 8319. The original C anchor remains separately on port 8318.

## Visible change and independent judgment

One massive generated Gothic arch now occupies the middle distance; crisp platforms occlude it, smaller spires appear inside its opening, and mist dissolves its lower support. The light is localized instead of filling a continuous white shaft. A soft, irregular near pier crosses lighter wall masonry with a separate camera response. Platform underside detail is quieter while the true top edges remain crisp. Character, movement, hazards, audio and layout retain the previous gains.

The first independent Astra critique rejected the early pass's uniform softness, detached upper fragment and weak near contour. Those findings drove placement, focus, light and foreground repairs. A fresh Astra reviewer then inspected the human references before the revised material, captured independent actual-input mobile/desktop sequences, and found the environment materially deeper and spatially composed. Its final bounded follow-up confirms that the near pier visibly occludes the wall without an observed body, thorn or contact-edge clarity regression. The verdict supports handing back this depth revision; it does not establish LIMBO parity, A/S, physical-phone feel or new human approval.

- [User's C− screenshot](human-cminus-baseline.png) and [LIMBO depth reference](human-limbo-depth-reference.png).
- [Same-size earlier build](review-baseline-native.png).
- Final native 390×844 DPR1: [actionable before](final-review-cached/mobile-00-before.png), [first input](final-review-cached/mobile-01-input.png), [double jump](final-review-cached/mobile-02-double-jump.png), [settled first landing](final-review-cached/mobile-03-after.png).
- [Final active desktop frame](final-review-cached/desktop-01-active.png), 1280×900 DPR1.
- [Initial critique](first-critique.md), [fresh review and final closure](final-depth-review.md), [direction brief](depth-direction.md).

The reviewed first action is a rightward leap and air jump onto the first ledge. The body changes pose, the player gains height, and the settled frame makes the next ledge above-left apparent. The native mobile frame keeps controls, HUD, body, landing edge and floor thorns visible; the reviewer would continue the climb. This is bounded visual comprehension evidence, not human touch-latency or ordinary-speed audio assessment. Recordings accompany the frame sequences; the reviewers did not claim to watch or hear full playback through an unavailable media tool.

## Current-code verification

The final actual-key route reaches the grounded summit in **45.500 game seconds**, including missed-landing recoveries and one intentional checkpoint death, then restarts through the real result button. There are no page errors. The route is source-informed automation and establishes coverage/reachability, not unprimed learning quality. The earlier routes finished in 33.675 and 48.625 seconds; all are retained without selecting only the cleaner run.

- [Final full-route receipt](route-cached/route-verified.json) and its native frames/recording in `route-cached/`.
- [Final checkpoint frame](route-cached/13-checkpoint.png), [wall kick](route-cached/11-route-wall-kick.png), [upper approach](route-cached/route-target-26.png).
- [Independent fixed-input capture receipt](final-review-cached/capture-notes.json).
- [Shell check](shell-final.json): seven required/optional assets decoded, keyboard start/jump/restart, pause focus containment, gentler-effects setting, and separate 64/82px controls without overflow at 320×568. This shell run precedes only the final wall-tone/near-angle correction; HTML, CSS, input and asset loading are identical. The current 390×844 and desktop captures above verify the final appearance.

The full-route capture's first frames retain the title fade and are not used as the clean actionable opening. The independent `final-review-cached` sequence supplies that evidence.

## Rendering performance

All samples are desktop Chrome with a 390×844 CSS viewport and DPR2, with actual keys and no screenshots or video during timing. They do not establish physical-phone performance.

The **final source** ten-second sample recorded603 frames with median/p95 ≈ 16.7 ms, p99/max ≈ 16.8 ms and no frame above 33.4 ms ([receipt](performance.json)). Two alternating baseline/candidate comparisons also stayed within 16.8 ms after the final caching correction ([comparison](performance-comparison.json)). This supports the tested desktop rendering budget; physical-phone performance remains unmeasured.

A prior version issued a full-view `multiply` blend each frame and showed intermittent 33 ms scheduling despite CPU submission p95 ≈ 0.3 ms. The [earlier final-at-the-time sample](performance-before-cache.json), [diagnostic windows](performance-diagnostic.json), and [alternating comparison before repair](performance-comparison-before-cache.json) retain that mixed result. The final implementation bakes the far-air blend once per asset/resize, then uses an ordinary opaque image draw. The later measurements above support the repair in this environment; no GPU-completion profile or physical-device claim is inferred.

Fresh cached-source mobile/desktop captures and an independent review qualification confirm that the performance correction preserves the opening, foreground overlap, checkpoint lighting and upper-route readability. `final-review-near/` and `route/` remain the preceding near-correction evidence; `final-review-cached/` and `route-cached/` are final.

## Source and generation provenance

[Final source hashes](source-sha256.json) identify the runtime and assets. [source/](source/) preserves the changed source files. `game.js`, `character.js`, `audio.js`, `style.css` and `index.html` match the human-reviewed C− baseline byte for byte. The final performance receipt hashes match all six loaded JavaScript modules. `source-before-near/`, `source-before-near-sha256.json`, `route-before-near/`, and `final-review/` preserve the preceding reviewed composition rather than silently relabeling it as final.

[The new arch's full generation prompt and alpha validation](depth-asset.md) records its source. The built-in image tool did not expose its actual model name. Original PNG bytes are unchanged; runtime canvases cache the tone/focus treatment. The prior `midground.png` is retained as source art but is no longer downloaded. The renderer caps DPR at2, uses bounded effects, and creates no per-frame blur surfaces or pixel-read pipeline.
