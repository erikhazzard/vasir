# Mobile and WebXR House Rules

## Contents

- [Mission](#mission)
- [Our production house rules](#our-production-house-rules)
- [Investigation and optimization process](#investigation-and-optimization-process)
- [Relevant references](#read-only-the-relevant-reference)
- [Mistakes to avoid](#do-not-make-these-mistakes)
- [Output](#output)

## Mission

Make the worst supported headset sustain its actual refresh rate in real gameplay,
including crowded scenes and bad frames. Optimize work, not just counters. Preserve
stereo correctness, responsive local tracking, gameplay semantics, and visual identity.

Use Quest 2 as the performance baseline for WebXR and mobile.
Inspect the repository's Three.js version, renderer/backend, shader customizations, and
thread topology before using an API or prescribing an architectural change.

**These are our opinionated production house rules, not universal engine limits or promised speedups.**
Enforce them for new content. For existing content, identify violations, fix within the
requested scope, and explicitly label quality changes. Do not silently change gameplay,
art direction, network authority, or the supported-device contract to obtain a win.

## Our production house rules

| Area | Opinionated default |
|---|---|
| Avatar geometry | Aim for **2,500–3,000 triangles** per fully assembled highest-detail avatar. Hard cap: **5,000 triangles and 5,000 exported render vertices, tracked separately**. Include body, hair, clothing, hands, and attached cosmetics. Enforce the triangle and render-vertex caps independently. |
| Avatar submissions | Aim for **one opaque body draw per view/pass** through compatible geometry/material consolidation. Count hands, hair, eyes, accessories, and extra passes separately; “one avatar object” is not one draw. |
| Skinning | Prefer ordinary rigid meshes where deformation is unnecessary. Author **one influence for rigid regions, two for deforming regions**; four is an explicit quality exception. Fewer nonzero weights are not automatically a cheaper stock shader. |
| Avatar simplification | Minimize skinned surfaces and rig complexity. Use rigid hand/attachment meshes where articulation is unnecessary; simplify or bake jaw motion when speech/identity requirements permit. Prefer cheap remote IK; test two iterations, then one, for iterative solvers. |
| Remote avatars | Sync root/locomotion state plus head and hands; reconstruct the rest cheaply. No duplicated local-player systems, full-body physics, or full-rig replication by default. |
| LOD | Require a deliberate near/mid/far policy for avatars and substantial/repeated environment assets. Reduce geometry, materials, animation/IK, and update frequency together. Skip pointless extra meshes for already trivial assets. |
| Textures | **256–512 px per dimension** normally; **1024 only by named exception; no 2048/4096 authored surface textures**. Audit decoded/GPU size, not file size. XR eye buffers and render targets have separate budgets. |
| Material maps | Delete constant maps. Use scalar metalness/roughness where possible. Preserve useful color detail; test normals one tier lower and roughness/metalness lower still. Advanced repacking is not the first fix. |
| Sidedness | **FrontSide by default. No blanket DoubleSide.** Correct geometry/winding first; genuinely two-sided thin surfaces need an explicit exception. |
| Lighting | **Bake fixed environments. Zero runtime lights preferred; at most one unshadowed directional light when needed.** No point/spot/area lights, added ambient/hemisphere objects, realtime shadow maps, or dynamic reflection captures by default. Replace needed fill deliberately rather than just making everything dark. |
| Dynamic shading | Prefer an existing cheap unlit/baked or genuine vertex-lit material path. Do not call stock `MeshLambertMaterial` vertex-lit. Avoid general-purpose PBR unless its visible benefit earns its cost. |
| Effects | No postprocessing by default. Minimize blended particles, large transparent layers, outlines, and other extra passes. |
| Physics | Primitive collision proxies; no render-mesh colliders by default. Static stays static. Only gameplay-relevant objects get bodies/colliders; keep moving proxies minimal. |
| Network state | Ordinary replicated transforms: **30 updates/second ceiling**, usually less; relevance and change drive sends. Local tracking and rendered interpolation remain frame-rate responsive. |
| CPU and lifecycle | Near-zero avoidable hot-loop garbage. Update active/changed sets, stagger noncritical work, share resources, and move loading/compile/upload spikes out of interaction-critical frames. |

For a hard-default exception, record the specific asset/system, why the cheaper option
fails, and its measured cost—or mark the cost unmeasured. Do not build an exception
framework or expand global budgets to accommodate one asset. The avatar budget is per
avatar, not permission to render an unlimited crowd.

## Investigation and optimization process

1. **Inspect submissions first; confirm the bottleneck before choosing the fix.**
   Inventory actual draw calls by category, vertices/triangles, textures and dimensions,
   skinned meshes/material groups, lights/passes, and active physics objects. Use wireframe
   to find wasted geometry, then return to normal rendering for timing.
2. **Capture the bad case.** Use the target headset, actual session refresh rate,
   representative crowd/scene, and fixed visual settings. Separate steady-state cost
   from join, first-use, streaming, and GC hitches. Record p50/p95/p99 and deadline misses,
   not just average FPS. Reuse existing traces and scenarios; do not require a new harness.
3. **Name the limiting work.** Distinguish main-thread scripts, animation/IK, renderer
   submission, GPU work, physics/worker work, upload/compile, and synchronization.
   A timer around `renderer.render()` is CPU-side wall time, not GPU duration.
   If GPU timings are unavailable, say so and use controlled perturbations as evidence.
4. **Remove work before reducing quality.** Prioritize dead/invisible work, duplicate
   updates/resources, constant textures, missing culling, unnecessary passes, and avoidable
   allocations. Then target measured draw/vertex/pixel/physics costs using these house rules.
   Prioritize LODs, geometry reduction, rigid avatar parts, smaller textures, baked lighting,
   and simpler collision where they address the limiting work. Reserve custom channel
   packing for a demonstrated remaining need. Clear, evidence-backed fixes do not require
   an elaborate reproduction first.
5. **Make the smallest coherent change.** Prefer simplifying/deleting over patch chains.
   Change one causal lever per comparison. Do not migrate renderer/backend, rewrite the
   networking stack, move all work to workers, or invent a universal shader by default.
6. **Validate what changed.** Re-run the same scenario with the same settings; inspect
   both eyes, close-up faces/hands, crowded views, transitions, and interaction behavior.
   Distinguish measured optimization from an intentional quality trade. A lower counter
   without better limiting time is not demonstrated frame-rate improvement.

## Read only the relevant reference

| Need | Reference |
|---|---|
| Avatar budgets, rigid hands, influences, rig cost, instancing, remote IK/LOD | [Avatars](mobile-xr-avatars.md) |
| Draw calls, environment LOD, textures, packing, lighting, shaders, effects | [Rendering and assets](mobile-xr-rendering-assets.md) |
| CPU/GPU diagnosis, frame accounting, WebXR, multiview, GC, first-use hitches | [Profiling and WebXR](mobile-xr-profiling.md) |
| Collision proxies, active physics, worker handoffs, replication rates | [Physics and networking](mobile-xr-physics-networking.md) |
| Primary documentation/source links and verification date | [Sources](mobile-xr-sources.md) |

## Do not make these mistakes

- Equating a mesh, material, texture, light, or network packet with one GPU draw/pass.
- Assuming `InstancedMesh` batches independently posed skeletons automatically.
- Claiming weight pruning, merging, LOD, smaller textures, or multiview must improve FPS.
- Treating “zero lights” as “zero lighting cost,” or ambient fill as another shadow pass.
- Claiming the red glTF metallic/roughness channel is always unused, or packing data into
  a normal channel without changing its decoder and asset contract.
- Reducing physics correctness, local head/hand updates, or reliable events to satisfy
  a cosmetic animation/network budget.
- Shipping a quality downgrade disguised as an equivalent optimization.

## Output

For a hotspot: give the cause and evidence, the change made/recommended, before/after
limiting metrics, and the remaining uncertainty. Include relevant code/asset locations.
For a broad audit: lead with one compact ranked table:

`Finding | Evidence / location | CPU, GPU, memory, or spike mechanism | Action | Visual / behavior trade`

Honor diagnostic-only requests. Implement when asked to optimize. Keep documentation and
validation proportional; no ceremony, speculative speedup percentages, or reports nobody
asked for. If hardware is unavailable, complete useful inspection/fixes and identify the
specific on-device check still needed—never invent a measured result.
