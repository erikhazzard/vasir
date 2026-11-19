# Load, Decode, Transcode, Upload, Compile, and First-Use Performance

Use this reference for startup stalls, scene transitions, first-use hitches, spawn spikes, asset repipeline decisions, or cold-versus-warm confusion.

## 1. Build a cold-resource ledger

“First use is slow” is not one bottleneck. Record each stage independently:

```yaml
cold_resource:
  asset_or_feature:
  network_fetch:
  cache_state:
  decoder_or_wasm_init:
  decode_or_transcode:
  parse_and_object_creation:
  CPU_geometry_processing:
  texture_or_buffer_upload:
  shader_program_pipeline_compile:
  render_target_or_shadow_allocation:
  body_collider_creation:
  broadphase_insertion:
  first_contact_event_cost:
  first_visible_frame:
  owner_and_lifetime:
```

Instrument boundaries close to the real work. A loader promise duration may combine network, decode, parse, object creation, and main-thread scheduling.

## 2. Separate cost classes

### Wire/download

Affected by file size, caching, compression, request strategy, and network. It does not directly prove runtime FPS.

### Decode/transcode/parse

Includes GLTF parsing, Draco/Meshopt decode, KTX2 transcoding, image decode, JSON/object creation, and WASM initialization. May run on main or worker depending on loader/runtime.

### GPU upload/allocation

Includes texture/buffer upload, mip generation, render targets, shadows, environment maps, and backend resource creation. Can stall first visible use even when parse completed earlier.

### Shader/program/pipeline compilation

Use the installed renderer's supported compile path, such as `compileAsync(scene, camera)` where appropriate. It targets material/program/pipeline readiness; it does not by itself warm textures, render targets, shadows, physics contacts, or application activation.

Depends on actual renderer/backend, material variants, lights, shadows, fog, skinning, morphs, defines, and post passes. `compileAsync()` or an equivalent compile path targets this class, not all cold work.

### Physics/world insertion

Includes body/collider creation, broadphase insertion, first step, contact manifolds, events, and worker result-buffer growth.

### Application activation

Includes scene add/remove, framework state, UI/layout, event registration, audio, gameplay scripts, and one-time caches.

Report which class is measured. Do not call an end-to-end improvement a shader, network, or decoder win without decomposition.

## 3. Cold-versus-warm benchmark rules

Declare:

- browser HTTP/cache state
- loader/decoder/WASM initialization state
- decoded asset cache
- GPU resource residency assumption
- compiled material variants
- render-target/shadow state
- physics object/world state
- previous scene visits

A “warm” run that manually visits all content before capture may be unlike production. A “cold” run that restarts the browser for a resource normally cached may overstate user impact. Benchmark the product’s intended state and label it.

## 4. Staged warmup policy

Default to staged, predicted-next-use warmup rather than warming the entire application.

Prioritize by:

```yaml
warmup_candidate:
  probability_of_near_term_use:
  hitch_severity_if_cold:
  warmup_cost:
  retained_memory:
  bandwidth_or_power_cost:
  eviction_risk:
  available_idle_or_transition_window:
```

Warm the highest expected user-impact resources within a bounded budget. Examples:

- compile materials for the next arena during a transition
- upload the next weapon’s textures when selected in UI
- initialize decoder/WASM modules before a user can trigger content
- allocate a small pool of common projectiles/bodies before combat
- precreate the next shadow/target configuration when the camera transition is known

Do not warm rare content at startup merely to eliminate a theoretical hitch. Log warmup misses so the staging policy can improve.

## 5. First-use isolation protocol

For a reproducible cold hitch:

1. Capture total hitch and frame-stage timings.
2. Warm decoder/WASM only; replay.
3. Warm parse/object creation only; replay.
4. Warm GPU uploads only; replay.
5. Warm shader/program/pipeline variants only; replay.
6. Warm targets/shadows only; replay.
7. Precreate physics/world structures only; replay.
8. Pre-step or stage initial contacts only when semantically safe; replay.
9. Compare which isolated stage removes which portion.

The sequence may be reordered based on evidence. Avoid “warm everything” until individual attribution is complete.

## 6. GLTF, Draco, and Meshopt

Evaluate separately:

- wire-size reduction
- decoder initialization
- decode CPU time and thread location
- parse/object-creation cost
- output geometry size/layout
- runtime upload size
- runtime vertex/index/cache behavior
- memory retention

Draco and Meshopt are not interchangeable and are not guaranteed steady-state FPS improvements. A smaller file can decode more slowly; a decoded representation can still produce the same runtime draw/material cost.

Use representative target devices, not only desktop development machines.

## 7. KTX2 and texture pipeline

KTX2 decisions require texture-role and device analysis:

- color, normal, masks, UI, HDR, data textures
- alpha and artifact tolerance
- encoding mode/quality
- transcode CPU/WASM initialization
- supported GPU target formats
- uploaded memory and bandwidth
- mip requirements
- fallback path
- offline pipeline complexity

Measure:

- cold transcode and first upload
- warm load
- estimated/resident GPU memory where observable
- sampling/render cost in the implicated scene
- visual quality on target devices

Do not make every texture KTX2 by policy. Some small UI/data textures or high-fidelity assets may have different best tradeoffs.

## 8. Shader/program/pipeline warmup

Build the exact variant set expected for near-term use. Variant identity may include:

- renderer/backend
- material family and defines
- lights and shadows
- fog
- skinning/morphs
- instancing
- clipping
- output/tone mapping
- post-processing configuration

Avoid compiling combinatorial variants that production never uses. Track first-use misses and expand the warm set based on evidence.

Verify that warmup:

- actually uses the active backend
- occurs after required renderer initialization
- includes relevant cameras/lights/shadows/passes
- does not mutate gameplay state
- does not hide texture upload or target allocation
- does not retain a full hidden scene unnecessarily

## 9. Upload and allocation staging

Large uploads/allocations can cause a hitch even after decode/parse.

Options, each requiring measurement:

- upload during a transition/loading scene
- spread uploads across bounded slices
- lower initial mip/LOD and refine later as a quality trade
- allocate/reuse targets before critical interaction
- precreate bounded pools for frequent objects
- stage scene insertion and physics insertion separately

Spreading work changes time-to-ready and can expose partially loaded content. Define readiness and cancellation semantics.

## 10. Spawn spikes

Decompose one mass spawn:

```yaml
spawn_profile:
  game_entity_creation:
  mesh_material_asset_lookup:
  scene_insertion:
  matrix_bounds_initialization:
  body_collider_creation:
  broadphase_insertion:
  first_physics_step:
  first_contacts_events:
  worker_command_and_result_resize:
  first_render_compile_upload:
```

Potential fixes:

- reuse immutable render assets
- bounded entity/body pools
- batch worker structural commands
- stagger noncritical spawns
- spatially stage activation
- preallocate known capacities
- avoid first-time material variants during combat
- prevent all spawned bodies from initially overlapping and generating a contact explosion

Pooling or staggering can be a memory, latency, or behavior trade. Label it.

## 11. Cancellation, scene changes, and stale async work

Load performance is also lifecycle correctness.

Handle:

- user leaves before load completes
- duplicate requests for the same logical asset
- decoder/worker result returns to a destroyed scene
- uploaded resource no longer needed
- partially built Rapier world
- stale warmup task competes with current interaction
- priority inversion between background warmup and critical asset

Use cancellation tokens/generations and ownership. Background warmup must yield or cancel when it threatens current frame budgets.

## 12. Load/first-use action example

```yaml
action:
  change: During arena transition, compile only the next arena's observed material variants and upload its two largest textures; defer rare cosmetic variants.
  subsystem: assets
  trade: intended_equivalent
  equivalence_status: untested
  expected_gain_basis: measured cold-stage trace
  prediction: first-combat hitch p99 falls from 48 ms to <20 ms while transition duration rises <= 30 ms and retained memory stays within budget
  semantic_surface: transition readiness, cancellation, texture ownership, backend-specific variants
  validation: cold replay, warm replay, first-visible frame, transition time, memory plateau, visual comparison
```

## 13. Acceptance matrix

```yaml
load_acceptance:
  cold_fetch:
  decoder_init:
  decode_transcode:
  parse_object_creation:
  upload:
  shader_pipeline_compile:
  target_shadow_allocation:
  physics_creation_first_contacts:
  first_visible_or_interactive_time:
  first_use_frame_p95_p99:
  transition_budget:
  warmup_hit_rate:
  warmup_memory_budget:
  cancellation_and_stale_result_test:
  cold_warm_semantic_match:
```

A load patch fails if it shifts the same hitch into a more critical interaction, warms unrealistic content, leaks staged resources, or improves wire size while worsening the user-visible deadline that motivated the work.
