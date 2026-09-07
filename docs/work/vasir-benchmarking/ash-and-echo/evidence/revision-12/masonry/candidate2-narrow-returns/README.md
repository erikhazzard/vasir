# Revision 12 masonry repair

The user’s right-rib screenshot shows a cap pasted onto a long flat rectangular side. The original cache filled that silhouette with a single 240-pixel facet, then clipped the broken ledge image across its top. Its lower steps came directly from six real solid collision segments.

The revised cache builds the rib’s face from broad overlapping stone courses. Unequal heights and staggered end stones break the long panel into structural masses. Each stone has an upper plane, a rough face from the existing charcoal/stone assets, a short return face, and a recessed underside. The fractured ledge cap overlaps its supporting masonry. Lower courses follow the existing solid shoulders, with small corner bevels inside the contact profile. Dark joints remain opaque.

The first candidate was rejected after native-scale inspection: its uniform spacing, smooth top, and repeated highlights resembled a brick grid. Its unchanged captures and receipt are in `rejected-regular-courses/`.

## Proof scope

`capture.mjs` arranges the player and camera beside all four actual ribs and captures the full game frame at native mobile and desktop CSS scale. RAF is disabled for reproducible still inspection. It routes the frozen revision-11 renderer for before images, the candidate renderer for after images, and the same frozen character module in both. These are arranged gameplay views, not a played climb or character-feel proof.

The harness exposes the existing wall cache through temporary response instrumentation and records bitmap size and opacity three logical pixels inside each actual segment face. This instrumentation is absent from production. Raw renderer source hashes are recorded before instrumentation.

Final capture: 16 before/after frames across four ribs at 390×844 mobile and a 1400×1000 desktop viewport, DPR2, exported at native CSS scale. No page errors. All eight candidate rib/viewport probes report minimum alpha255 three logical pixels inside the contact faces; cache dimensions match the baseline. `renderer-captured.js` is the exact uninstrumented candidate, SHA-256 `8b486d7216e61b9234f311fbe3039ab48c1e90a7f980972c6d9d3be4a37d9201`. JavaScript syntax check passed.

Visual read: the new ribs have coarse stone relief across the exposed mass, a connected broken cap, and recessed lower shoulders. The previous long flat panel is gone. The stepped support remains constrained by the existing solid geometry; these stills do not establish a new overall visual grade or prove wall-kick motion, performance, or full-route behavior.

## Rendering scope

`SAFE_LOCAL_CHANGE`: construction changes only `buildWall` and architecture-kit cache invalidation in `renderer.js`.

| Owner/work | Before | After |
| --- | --- | --- |
| Application frame owners | Existing main.js owner | Unchanged |
| Scene submissions, global passes, terminal writes | Existing renderer/depth/atmosphere chain | Unchanged |
| Rib bitmap caches | One per rib; four authored ribs | Unchanged |
| Cache dimensions | `(rib.w + 8) × rib.h × artScale²` | Unchanged |
| Visible rib drawing | One existing cropped `drawImage` per rib | Unchanged |
| Per-frame masonry paths or texture construction | None | None |
| Main-wall 8px bleed and finished outer shading | Existing | Unchanged |
| Simulation, colliders, wall-kick rules | game.js | Unchanged by this repair |

Course and block work runs only on existing cache misses. It does not introduce a renderer, frame callback, target, shader, worker, runtime asset, or scene traversal. The small bounded construction stays on the existing main-thread cache path; worker ownership/messages would add complexity without removing recurring frame work. This is a topology claim, not a measured timing improvement.
