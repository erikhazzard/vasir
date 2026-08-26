# Render Topology Guard

Use this reference when planning or reviewing batching, instancing, material, pass, post-processing, UI-composition, renderer, or other render-hot-path work. Its job is to stop a local optimization from multiplying frame-global work.

## Contents

- [Hard guard](#hard-guard)
- [Backend-safe vocabulary](#backend-safe-vocabulary)
- [Ownership and topology delta](#ownership-and-topology-delta)
- [Cardinality and cost](#cardinality-and-cost)
- [Required contrasts](#required-contrasts)
- [Legitimate multipass exceptions](#legitimate-multipass-exceptions)
- [Dispositions and proof boundary](#dispositions-and-proof-boundary)

## Hard guard

For a local batching or instancing change, frame topology stays constant. Entity, type, material, or batch cardinality may change draw groups inside existing eligible passes; it must not create render owners, scene submissions, full-scene or G-buffer passes, render targets, or terminal-output writes.

Reject the local patch before benchmarking when it:

- creates a full-scene or G-buffer pass/target per entity, type, material, batch, or instance group
- adds an independent renderer, composer, pipeline, animation loop, or frame callback
- adds a terminal canvas/default-framebuffer/current-texture write, including a separate UI render
- hides topology growth behind lower draw calls, unchanged screenshots, or acceptable timing on one device

Only a separately requested architecture change may expand this topology, and it must satisfy the exception and proof requirements below. A topology reduction is allowed when pass removal is itself in scope and semantics survive.

## Backend-safe vocabulary

Do not use “pass,” “render,” or “present” without naming the level:

| Term | Meaning |
|---|---|
| `frame_owner` | The one application authority that schedules rendering for an output surface. |
| `scene_submission` | One application request to render a scene/view, regardless of how the backend expands it. |
| `logical_pass` | A declared graph/composer/node stage such as shadow, geometry, lighting, post, picking, or UI. |
| `backend_render_pass` | A WebGPU render pass or the closest observable WebGL framebuffer/attachment execution scope. |
| `target_write_pass` | One execution that writes an offscreen target, default framebuffer, current canvas texture, or XR layer. |
| `full_scene_pass` | A pass that traverses/submits a scene-scale visible set, even if a layer or material filter narrows draws. |
| `gbuffer_pass` | Geometry submission that writes the deferred attachment set; MRT attachments in one execution remain one G-buffer pass. |
| `draw_group` | A compatible draw or instance batch within a pass; it does not own a frame-global target or pass. |
| `terminal_output_chain` | The owned route whose final result reaches one canvas/XR output. |
| `presentation` | Browser/XR compositor publication. It may be implicit and is not inferred from `renderer.render()` count. |

One scene submission can expand into shadows and several backend passes. Several backend passes can write the same current canvas texture before one presentation. WebGPURenderer may fall back to WebGL, and a logical graph may fuse stages. Record declared topology and executed topology separately when observable; never make the guard depend on one backend API name.

## Ownership and topology delta

One `frame_owner` owns each output surface. World, UI, post, picking, mirrors, and effects contribute data or graph nodes to that owner; they do not independently drive the renderer. Multiple canvases or XR layers may have distinct owners only when the product architecture explicitly requires them.

Capture this before approving a render change:

```yaml
render_topology_delta:
  scenario:
  output_surface:
  counts:
    frame_owners: { before:, after:, delta: }
    scene_submissions_per_frame: { before:, after:, delta: }
    logical_pass_executions: { before:, after:, delta: }
    backend_render_passes_if_observable: { before:, after:, delta: }
    full_scene_pass_executions: { before:, after:, delta: }
    gbuffer_pass_executions: { before:, after:, delta: }
    offscreen_targets: { before:, after:, delta: }
    terminal_target_write_passes: { before:, after:, delta: }
  added_nodes:
  removed_nodes:
  changed_multiplicity:
  expected_draw_group_delta:
```

For every added or changed pass, record:

```yaml
pass:
  id:
  owner:
  purpose:
  level: logical | backend | target_write
  multiplicity_axis:
  frequency:
  scene_camera_or_view:
  draw_scope:
  reads:
  target_and_attachments:
  dimensions_samples_formats:
  clear_load_store_resolve:
  terminal_output: true | false
```

Static call sites are insufficient: a single call inside a type loop is several executions. If backend passes are opaque, owners, scene submissions, logical passes, target binds/writes, allocations, and terminal writes are still required.

## Cardinality and cost

Legitimate multiplicity axes include frame, view/eye, camera, light, cascade, cube face, portal/reflection, quality tier, and on-demand event. Entity, instance, enemy type, material, batch, selection, and UI-component count are suspicious axes for any scene-scale pass or target.

State the scaling law. Examples:

- G-buffer executions and attachment sets scale with required views, not enemy types.
- Instanced draw groups may scale with compatible geometry/material families; frame owners and terminal writes do not.
- Picking may scale with pointer/request events; it should not silently become an always-on per-object pass.
- Targets scale with declared effects/views and return to a lifecycle plateau; spawning content must not grow them.

Sweep the implicated axis when risk is material—for example enemy types `1 → 2 → 5`—and verify topology invariants, resource plateau, submission slope, GPU time, and frame-budget misses.

Evaluate cost both ways before approving a deliberate extra pass:

- **Cost of adding:** repeated traversal/culling/sorting, vertex and fragment work, attachment clear/load/store bandwidth, resolves/copies, state transitions, target memory, variants/compile, synchronization, lifecycle, and thermal load.
- **Cost of refusing or merging:** broken depth/order/color semantics, incompatible attachment/sample requirements, UI readability at scaled resolution, lost effect quality, larger shaders or variants, worse culling, backend limitations, or excessive implementation complexity.

Choose from target facts, not “fewer passes” or “cleaner architecture” alone. Model attachment traffic per pass as a sum over executions, dimensions, samples, formats, and load/store/resolve behavior; heterogeneous passes cannot be represented faithfully by one global pass multiplier.

## Required contrasts

### Instanced enemies and a G-buffer

**Acceptable:** one `InstancedMesh` per compatibility key, often one enemy type when geometry/material differ, participates in the existing geometry/G-buffer and existing shadow/depth/picking paths. Increasing types may add draw groups and shader variants; G-buffer pass/target count, scene submissions, and terminal writes stay constant.

**Reject:** each enemy type owns a scene pass, G-buffer/MRT target, lighting resolve, composer, or render invocation. “One batch per type” means one draw group per type inside a shared eligible pass, never one deferred pipeline per type.

Expected `1 → 5` type sweep: draw groups may rise by four; G-buffer executions remain `1 → 1` per required view, with unchanged attachments and terminal writes. A transparent or otherwise incompatible type may join an existing forward/transparency path; it does not earn a new full G-buffer.

### World and UI

**Acceptable:** DOM overlay composed by the browser, UI draws contributed to the owned scene/graph, or a native-resolution UI target composed by the existing terminal chain. The frame owner controls order, depth clearing, color transform, and output.

**Reject:** the world renderer/composer writes the terminal target, then a UI subsystem independently calls a renderer/composer/pipeline and writes it again—especially when introduced inside an unrelated instancing patch.

A second terminal-target write can be legitimate when native-resolution UI, post-tone-map ordering, depth semantics, XR composition, or backend constraints force it. It remains inside one owner and terminal chain, declares load/store and color behavior, and is an explicit measured architecture decision rather than incidental UI plumbing.

## Legitimate multipass exceptions

Multipass rendering is not itself a defect. Shadows by light/cascade/face, deferred geometry plus lighting, reflections/refractions/portals, transparency, post-processing, on-demand GPU picking, XR views or multiview, and UI after tone mapping can require distinct work.

Approve an added pass only when all are true:

1. A named visual, interaction, or platform contract requires it.
2. Its multiplicity follows that contract, not content population by accident.
3. One frame owner and terminal chain retain authority.
4. Inputs, outputs, attachments, resolution, samples, and lifecycle are bounded.
5. Fusion, reuse of an existing pass, DOM composition, on-demand cadence, or lower resolution was considered with its downside.
6. The active backend/fallback supports the design and the executed topology is checked where observable.
7. Proof matches the reason for expansion: an optimization shows target-device break-even against the current alternative; a correctness- or platform-required pass demonstrates why cheaper topology cannot satisfy the contract and shows measured target-budget headroom.

An exception may not be smuggled into a local batching, instancing, or material patch. Split it into a separately reviewable architecture decision. When the new topology must exist to measure either proof route, authorize only the smallest reversible isolated prototype; do not merge it into the production path or treat it as accepted architecture before proof.

## Dispositions and proof boundary

Use one local-change domain disposition:

- `SAFE_LOCAL_CHANGE` — the patch stays inside the requested boundary, preserves required topology, and passes the relevant semantic checks. This is not a measured performance-win claim.
- `REJECT_UNFORCED_MULTIPLIER` — the patch makes leaf/content cardinality create frame-global work, terminal work, or another owner; reject regardless of current headroom.
- `ARCHITECTURE_PROOF_REQUIRED` — extra work may be legitimate, but explicit authorization, necessity, cost-both-ways, or target proof is missing. Do not merge or accept the expansion on the production path; a separately authorized, reversible isolated prototype may obtain the missing proof.

After a separately requested architecture change satisfies every exception gate and target-device proof, record that approval in the architecture plan; do not relabel it as a local optimization.

The topology delta proves structure, multiplicity, ownership, and patch scope. It does not prove the current bottleneck or a performance win. Pass/draw/target counts are not causal timing evidence; GPU timers, CPU submission timing, repeated same-workload frame distributions, target-device coverage, and thermal tests establish runtime cost.

Proof must also preserve the touched semantics: visible set, culling, picking identity, shadow inclusion, transparency order, depth, color/tone mapping, UI order/readability, resolution policy, XR behavior, and target disposal/loss recovery. When runtime proof is unavailable, report the topology disposition and remaining measurement honestly; never convert an unknown timing result into permission for structural fan-out.
