# Three.js Rendering, GPU, Scene Graph, Materials, and VRAM

Use this reference when the symptom may involve rendering, scene traversal, material/program proliferation, pixels, passes, shadows, transparency, batching, or renderer/backend behavior.

## 1. Resolve renderer identity before advice

Record independently:

```yaml
renderer_identity:
  three_version:
  renderer_class: WebGLRenderer | WebGPURenderer | custom | unknown
  actual_backend: webgl2 | webgpu | fallback_webgl2 | unknown
  material_stack: built_in | ShaderMaterial | RawShaderMaterial | TSL_nodes | mixed | unknown
  postprocessing_stack:
  renderer_init_flags:
  target_capabilities_extensions:
  context_or_device_loss_path:
```

Do not infer actual WebGPU use from the renderer class. Do not prescribe TSL/node, `ShaderMaterial`, render-target, timer, or static-object APIs without checking the installed Three.js version and active backend.

Audit version-sensitive settings and flags only when present in the project, including:

- antialiasing and render-target samples
- alpha/compositing behavior
- preserveDrawingBuffer
- precision
- logarithmic or reversed depth path
- power preference
- color space/tone mapping
- shadow type
- post-processing target formats

No flag is a universal free win.

## 2. Separate four rendering cost families

### A. Pixel/fill/bandwidth

Driven by physical drawing-buffer size across every pass, overdraw, blending, samples, texture bandwidth, shader complexity, transmission/refraction, volumetrics, and large intermediate targets.

Measure:

- physical width × height × views × passes × samples
- per-pass target dimensions and formats
- transparent/particle coverage and layer count
- fullscreen pass count
- GPU time sensitivity to DPR and effect resolution
- texture bandwidth/residency indicators

Logical viewport size is not GPU pixel cost. Count all offscreen, shadow, reflection, refraction, bloom, blur, and XR view work.

### B. Draw/state/submission

Driven by render-item count, state/program/material switches, buffer binds, uniform updates, sorting, command encoding, and driver/backend overhead.

Measure:

- render calls per pass, not only final frame total
- material/program/variant count
- geometry/buffer layout changes
- transparent sorting set
- shadow-caster submissions per light
- render-submission timing
- GPU time after controlling pixel coverage

### C. Main-thread scene/update

Driven by object traversal, matrix propagation, culling, bounds, sorting, animation/morph updates, material churn, scene mutations, raycasting, and framework/DOM work.

Measure active/change ratios:

- visible/total objects
- transformed/total objects
- matrix-world-updated/total objects
- animated/total objects
- material/define mutations per frame
- attributes and bytes uploaded per frame
- scene additions/removals per frame

### D. Cold pipeline/resource work

Driven by shader/program/pipeline compilation, texture upload, target allocation, first shadow allocation, lazy material variants, and decoder/loader initialization. Route detailed load work to `load-first-use-assets.md`.

## 3. `renderer.info` is context, not causal proof

Use it for directional counts, with these safeguards:

- know when it resets; for a custom multi-pass loop, use the installed renderer's supported equivalent of `renderer.info.autoReset = false`, then reset exactly once after all passes
- label custom renderer/backend omissions
- distinguish per-pass and total counts where possible
- do not assume every counter is exact for every path/version
- cross-check with CPU submission and GPU timings
- do not equate high triangle count with vertex bottleneck or high calls with draw bottleneck

Useful explicit counts beyond `renderer.info`:

- opaque and transparent render items
- shadow casters per light
- visible objects per pass
- unique material families and program/variant keys
- render targets, attachments, dimensions, formats, mip levels, and samples
- dynamic buffer update bytes/ranges
- readbacks
- skinned/morph meshes and active animations

## 4. Shader and material variant audit

A “material count” can hide many compiled variants; a “program count” does not explain why they exist.

Build a variant ledger keyed by relevant project factors:

```yaml
shader_variant:
  material_family:
  backend:
  defines:
  lights:
  shadows:
  fog:
  skinning:
  morph_targets:
  clipping:
  instancing:
  transparency_blending:
  tone_mapping_or_output:
  custom_hooks:
  first_used_scene:
```

Look for:

- per-object material clones that differ only in uniform data
- defines toggled at runtime
- unique `onBeforeCompile` bodies or cache keys
- material flags that create avoidable variants
- lights/shadows/fog changes that fan out variants
- lazy variants first encountered during interaction
- shader compilation triggered by scene transitions

Do not merge materials when independent render state is semantically required. Prefer shared programs plus per-object/instance data when the installed renderer path supports it and the upload cost is lower than the eliminated state churn.

## 5. Batching and instancing eligibility

Batching is a representation and invalidation decision, not merely a draw-call reduction.

### `InstancedMesh` candidate

Use when objects can share geometry, material/program, attribute layout, and compatible render state. Verify:

- transform or instance-data update frequency
- per-object visibility/hide requirements
- picking and stable ID requirements
- culling granularity and spatial spread
- bounds update policy
- transparent ordering
- shadows and alternate-pass participation
- lifecycle/capacity behavior
- whether full instance-buffer uploads erase the CPU win

### `BatchedMesh` candidate

Use when geometry differs but material/program and render-state constraints align. Verify:

- geometry/instance capacity and growth behavior
- per-object culling/sorting support in the installed version/backend
- geometry update frequency
- ID/picking mapping
- bounds and visibility
- fragmentation/rebuild cost

### Merged geometry candidate

Use for truly static spatially coherent objects when fine-grained visibility, culling, picking, material state, or teardown is unnecessary. Large global merges often reduce culling effectiveness and make updates/rebuilds expensive.

### Keep individual objects when

- objects are sparse and culling removes most of them
- independent transparent order is required
- only a small active subset changes
- per-object interaction/lifecycle dominates
- batching would upload or rebuild more data than it removes

### Required batching semantic tests

- visible set from representative camera paths
- hide/show and layer behavior
- frustum/occlusion behavior if used
- pick/raycast ID
- transparency order
- shadow inclusion
- transform accuracy
- bounds after mutation
- teardown and capacity reuse

Example card:

```yaml
action:
  change: Convert 4,000 nearby opaque static crates sharing one mesh/material into spatially partitioned InstancedMesh groups.
  trade: intended_equivalent
  equivalence_status: untested
  prediction: calls and render-submission p95 fall; GPU time changes only if command/state limited
  non_obvious_constraint: one global instance group would keep off-screen crates active and weaken culling, so partition by stable spatial cells
  semantic_checks: visibility, pick IDs, shadows, bounds, cell migration policy
```

## 6. Active/change-set and invalidation design

Prefer reducing touched work:

- use `Object3D.matrixAutoUpdate = false` and, where appropriate, `matrixWorldAutoUpdate = false` only for objects whose manual update contract is explicit
- update dirty subtrees, not every static node
- mark true static objects with the installed backend’s supported static mechanism, such as a version-supported `Object3D.static` path, only when they will not mutate after initial rendering
- avoid scene add/remove churn for reusable objects
- update only changed instance/vertex ranges when the API/backend supports it
- keep material/program-affecting flags stable
- recompute bounds only when geometry or transforms require it
- separate immutable, occasionally mutable, and per-frame data

The key question is: **what action invalidates how much work?**

Examples:

- one material define change can invalidate/recompile many objects
- one giant batch transform update may upload all instances
- one scene mutation can rebuild/sort render lists
- one animated parent may force a large matrix subtree update

Do not add dirty-tracking complexity when the workload is too small for the bookkeeping to win.

## 7. Culling and bounds

Wrong or missing bounds are both correctness and performance failures.

Audit:

- geometry bounding boxes/spheres after custom buffer mutation
- instance/batch aggregate and per-object bounds
- skinned/morphed bounds when poses extend beyond static geometry
- LOD thresholds and hysteresis
- camera/layer masks
- objects intentionally exempted from culling
- spatial partition granularity

A batching change that reduces calls but renders thousands of previously culled objects may lose overall.

## 8. Shadows

Shadow cost includes CPU submissions, shadow-view culling, material variants, depth rendering, target size, filtering, update cadence, and number of casting lights.

Measure per light:

- map size, cascades/faces, samples/filter path
- visible casters and draw calls
- update cadence and cause of invalidation
- GPU and submission time
- first allocation/compile cost

High-value non-obvious levers:

- static or event-driven shadow updates when light/casters are stable; use the installed equivalent of `shadowMap.autoUpdate = false` plus explicit `needsUpdate` invalidation
- restrict caster sets/layers rather than only lowering resolution
- reduce the number of independent shadow views
- spatially bound shadow coverage
- avoid material/alpha-test variants on unnecessary casters
- stage first shadow allocation before critical interaction

Any stale-shadow possibility is a quality/correctness surface and must be tested.

## 9. Transparency, particles, transmission, and overdraw

Transparent object count is weaker than covered pixels × layers × shader cost.

Audit:

- blended pixel coverage and overlap
- sorting set and sort stability
- depth write/test behavior
- particle quads whose empty pixels still shade
- soft-particle/depth sampling
- transmission/refraction scene copies or extra passes
- volumetric step count and target resolution
- alpha-tested versus blended alternatives

When testing particle cost, preserve simulation and draw count while changing blend/coverage/shader work; otherwise CPU simulation and GPU overdraw remain confounded.

## 10. DPR, MSAA, render targets, and adaptive quality

During diagnosis:

- use a fixed physical resolution and effect settings
- report actual drawing-buffer dimensions
- freeze LOD/effect-tier reactions to DPR changes when possible

After confirming GPU pixel pressure and receiving permission for quality trades:

- use bounded dynamic resolution with hysteresis and cooldown
- target deadline headroom, not 100% utilization
- avoid reacting to one bad frame or a cold hitch
- separate UI/text resolution when possible
- coordinate effect-resolution tiers and XR foveation
- log every quality-state change in field data

A simple controller should use a smoothed GPU/frame metric, sustained over/under-budget windows, min/max bounds, and slow recovery to prevent oscillation.

MSAA and post-AA are not interchangeable; compare actual visual and GPU cost on target devices. Render-target samples multiply attachment work and memory.

## 11. Texture and VRAM ledger

Do not report “estimated VRAM pressure” without a method.

For each major texture/target, record:

```yaml
resource:
  owner:
  kind: texture | cube | array | depth | render_target_attachment
  dimensions:
  layers_or_faces:
  mip_levels:
  format_or_compression:
  estimated_bytes_per_texel_or_block:
  samples:
  estimated_bytes:
  residency_or_streaming_assumption:
  duplicate_copies:
  lifecycle:
```

Approximate uncompressed mipmapped 2D texture memory as base-level bytes × about 4/3 when the full mip chain exists; compressed block formats require block-based calculation. Multiply cube textures by six, arrays by layers, multisampled render targets by samples plus any resolve target, and include depth/stencil attachments. Label all estimates because browser/driver residency and internal copies are not fully observable.

Look for:

- oversized textures with low on-screen footprint
- unnecessary alpha/HDR/precision
- duplicate decoded/uploaded resources from cache misses
- large persistent targets at full DPR
- unused mip chains or missing mip chains causing bandwidth/quality issues
- render targets retained after scene transitions
- texture uploads during interaction

## 12. KTX2 and asset compression eligibility

KTX2 is a container/transcode path, not one universal optimization. Decide by:

- color, normal, mask, UI, HDR, and data-texture role
- alpha requirements
- artifact tolerance
- ETC1S versus UASTC-like quality/size/transcode trade
- supported target GPU formats
- transcode latency and WASM initialization
- runtime memory/bandwidth target
- offline pipeline complexity

Validate image quality, cold transcode/upload, warm GPU memory, and target-device sampling performance separately. Draco and Meshopt primarily affect wire/parse/decode and geometry representation; they are not automatic steady-state FPS wins.

## 13. Context/device loss and renderer lifecycle

When the project creates custom resources or supports long sessions, verify:

- context/device-loss notification path
- recreation of textures, buffers, targets, pipelines, post passes, and caches
- worker/physics coordination during loss
- no duplicate resources after restore
- gameplay state preserved or intentionally reloaded
- disposal ownership during renderer replacement

Use the installed renderer’s supported loss-testing hooks where available. A successful normal teardown does not prove loss recovery.

## 14. Rendering acceptance matrix

A rendering patch should name the metrics and semantics it must move/preserve:

```yaml
render_acceptance:
  calls_per_pass:
  submission_p95_ms:
  gpu_p95_ms:
  frames_over_budget_pct:
  shader_variant_count:
  dynamic_upload_bytes:
  target_memory_estimate:
  visible_set_match:
  pick_id_match:
  transparent_order_check:
  shadow_check:
  context_or_device_loss_check:
```

Re-profile after each accepted patch. A call-count win can expose fill pressure; a DPR win can expose CPU submission; a material merge can expose culling or upload costs.

