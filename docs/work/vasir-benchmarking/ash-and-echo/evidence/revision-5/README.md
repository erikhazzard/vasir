# Atmosphere and character revision — September 5, 2026

Playable: http://localhost:8317/. Latest **human** anchor is world **B**, character/juice **B+**, on the preceding build. The final fresh Astra **developer estimate** is world **A−**, visual juice **B+**. **S is not established**, and no formal weighted benchmark result is claimed. See [final review](final-review.md) and the continuing [process log](../../process-log.md).

## Result

The world now separates a soft distant city, offset bell landmarks, darker middle arches, crisp playable stone and brief blurred foreground fragments. Competing remote arches were removed. One diagonal light volume and localized moving fog sit between scenery distances. A final exposed column top was concealed behind the wall by changing composition, rather than covering it with additional fog.

The character has stronger launch, apex, falling mantle, wall catch/kick, second-jump bloom, landing compression/rebound and death/reform states. Trails are short connected ink gestures with broken hairs. Old round smoke discs and a respawn circle through the floor were removed. The [pose sheet](character-poses.png) is explicitly arranged animation evidence; it is not a live-play proof.

No new source bitmap assets, engine dependency or physics/input changes were introduced. `game.js` and `main.js` remain byte-identical to the exact human B build at `tmp/ash-and-echo/atmosphere-pass/b-baseline/`.

## Proof and limits

| Check | Result and scope |
| --- | --- |
| Canonical controller checks | `node --test test/ash-and-echo.test.js`: 12 passed. Existing direct/wall-kick simulation routes reach all 28 ledges. |
| Native actual-key route | [Receipt](native-route.json), [recording](native-route.webm): grounded win at 34.9417 game seconds, all 28 ledges, wall kick, intentional checkpoint death/recovery and restart. Predates final beam placement/width and middle-column composition changes. |
| Independent desktop route | [Receipt](desktop-route.json), [recording](desktop-route.webm): 34.6833 seconds, all 28 targets, genuine wall kick, checkpoint death/recovery, grounded summit and restart. Predates only final background placements and hidden-base-draw removal. Screenshot-perturbed timing is retained; it is not the performance verdict. |
| Native touch | [Events](touch-events.json): simultaneous CDP steer/jump, double jump and wall slide. An attempted touch wall kick was actually a ground jump; the reviewer corrected the attribution. Desktop route proves the genuine wall kick. |
| Final composition | Native 390×844 and desktop 1280×968/DPR2. [Opening](retina-opening.png), [ascent](retina-ascent.png), [summit](retina-summit.png). Later-platform captures are arranged composition probes, not route proof. |
| Character contract | [Receipt](character-contract.json): 1,800 deterministic simulation frames / 73 events, no game mutation, Canvas state leaks or pause drift; reset and gentler effects covered. |
| Current-source quiet timing | [Receipt](performance.json): 1,217 frames, p95 16.7ms, p99/max 16.8ms, zero above 33.4ms. Chrome 152 on Mac, 390×844/DPR2, no screenshots/video during sample. All seven served JS hashes match [final identities](source-identities.json). The repeated jump/left workload includes thorn deaths; it is a rendering stress sample, not a route-quality test. |
| GPU lifecycle/fallback | [Receipt](runtime-checks.json): WebGL unavailable and real context loss both retain play; restoration returns to WebGL with three scenery textures; twelve restarts preserve that count. Zero GL/page errors. Paused gentle-mode pixels match after the CSS overlay transition. Apple M5 Pro / ANGLE Metal. |
| Shell | [Receipt](shell-checks.json): keyboard start/jump/restart, pause focus containment, gentler effects, all nine assets, separate 64/82px controls and no overflow at 320×568/DPR2. |

These checks do not establish physical-phone frame time, thermal/battery behavior, physical-thumb comfort, human audio quality or normal-speed subjective animation excellence. The fresh judge had image/frame access to captured play, not audiovisual video playback. Its A−/B+ judgment remains bounded accordingly. No frame-time regression appeared against the preceding Mac sample; this is not a universal performance claim.

## Rendering decision

The existing frame owner now coordinates two browser-composited canvases: WebGL scenery behind transparent Canvas2D gameplay. This is an intentional architecture change from one canvas to two. It avoids uploading the moving gameplay canvas into a GPU texture each frame. Three.js and a postprocessing chain were considered; this effect uses neither a 3D scene graph nor offscreen targets. See [MDN's WebGL guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) and [Three.js postprocessing topology](https://threejs.org/manual/en/post-processing.html) for the technical tradeoff considered.

One RAF owner remains; offscreen targets remain zero. The GPU owns one program, one quad buffer, one noise texture and three scenery textures under the fixed preload lifecycle. It draws three air quads plus the visible scenery quads into one default framebuffer. A base quad is needed only before the opaque city loads. The environment buffer is capped at DPR1.5 / 1.1 million pixels; the gameplay buffer remains DPR2. There are no per-frame image uploads or texture readbacks. Context loss falls back to the painted 2D path; restoration rebuilds GPU resources.

The first GPU attempt was not accepted on feature presence. Its fog changed a sampled open-air region by only 0.28/255 on average over 3.6 seconds; [critique](first-gpu-critique.md) drove the stronger localized lighting. Static review also caught signed-input GLSL `pow` and an unused mismatched-precision uniform; both were repaired. The user-authorized hybrid is accepted for this local preview with measured Mac headroom and verified fallback; physical-phone performance remains unknown.

## Remaining bar

The final judge still finds some middle/summit apertures too evenly gray and the shelf/chain rhythm familiar. State silhouettes are more expressive, but the available review surface does not establish exceptional ordinary-speed animation across every transition. The process log preserves these limits, the failed attempts and the original human judgments for later skill extraction. No skill has been created or rewritten in this pass.
