# Wall-kick edge repair

Scope: only `site/ash-and-echo/renderer.js` was changed for this repair. Scratch proof is retained here; no durable regression suite added for this bounded visual correction.

## Observed mechanism

The player kicks off either wall through native keyboard input. The renderer moves walls, character, platforms and hazards through its existing shared impact transform. The left wall cache previously stopped at x=0, exposing the stationary bright atmosphere during positive horizontal displacement. The right cache had three extra units of stone texture, but its dark facet and edge gradient stopped at x=420, making the revealed extension visibly grey. Viewport-height source clipping also failed to account for vertical impact displacement.

The repair extends the outer silhouette, facet and gradient by eight world units (five-unit impact limit plus three units of raster bleed), extends full outer walls below the world's floor, and crops wall sources outside the impact range. Inner collision profiles, simulation state, camera and shared impact response retain their original coordinates.

## Matched pre/post proof

`probe.mjs before` and `probe.mjs after` drive the shipping main tick under manually advanced RAF with native keyboard events. Each direction's near-wall starting position is arranged at y=4300; the subsequent contact and wallJump are produced by the production simulation. This local boundary probe alone does not establish route reachability. A separate native route starts from the opening and reaches the left wall without repositioning. `repeated.mjs` also captures the real opening → first pier → right corbel → right-wall-kick route.

All 48 matched pre/post frames have identical complete game snapshots and shared impact transforms. No browser errors occurred.

| 390×844 case | Before edge | After edge |
| --- | --- | --- |
| Left kick, DPR1 | Canvas alpha 107; composite luminance 72.36 | Alpha 255; luminance 9.45 |
| Left kick, DPR2 | Canvas alpha 107; composite luminance 72.26 | Alpha 255; luminance 9.40 |
| Right kick, DPR1 | Alpha 255; composite luminance 28.69 | Alpha 255; luminance 9.24 |
| Right kick, DPR2 | Alpha 255; composite luminance 28.67 | Alpha 255; luminance 9.25 |

Luminance is the mean RGB-channel value in the edge column across the middle 80% of the composite `#game-frame` screenshot. The defect is visible in the preserved `before-*-kick4.png` captures; corresponding after captures show contiguous dark masonry.

- Pause keeps the player and shared transform unchanged across 30 paused RAF ticks at both DPRs.
- Gentler effects suppress the impact displacement at both DPRs.
- Repeated native contact sequences start from one arranged contact per side, then use uninterrupted simulation with no repositioning: six left kicks and five right kicks per DPR, followed by landing/right-side death impacts. All four sequences retain alpha 255 across both full-height edge columns in 722 sampled motion frames. The raw event log survives restarts, so `repeated.json` contains earlier-side events too; count current-side wallJump events by their velocity sign.
- `bounds.mjs` injects deliberately excessive presentation events, distinct from route proof. All eight DPR1/2 × horizontal ±5 × vertical ±5 cases retain alpha 255 across the full height of the outer two pixel columns on each side, including top and bottom corners.

## Source identity and topology

- Before renderer SHA256: `82c5070cf8f9e0102df99dc99f4ee3cadd06af53f72b9baedddd9d950fe84172`
- After renderer SHA256: `3ae67f363c3c1321a6a0c255fc890c6bfd7841cc227a282454cc119b6d636698`
- Preserved sources: `before-renderer.js`, `after-renderer.js`.
- `node --check site/ash-and-echo/renderer.js` passed.
- Hot-path disposition: `SAFE_LOCAL_CHANGE`. The existing main RAF remains the sole frame owner; the existing Canvas2D/world and WebGL atmosphere output chain is unchanged. No new renderer, scene submission, logical pass, GPU/offscreen target, terminal write, RAF, traversal, per-frame cache allocation or wall draw call is introduced. Only existing cached wall bitmap dimensions and source/destination rectangles change. Wall cache identity, invalidation and count are unchanged.
- No performance claim or broad timing run was made. Concurrent review browsers make timing unsuitable, and this correction preserves the frame topology.

This receipt certifies the wall-edge repair, not a full-game release verdict. The root separately owns the integrated atmosphere/facade visual review.
