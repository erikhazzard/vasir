# WebXR and Standalone-Headset Performance

Use this reference whenever immersive VR/AR, standalone XR, headset browsers/runtimes, foveation, multiview, or compositor misses are in scope. XR is a separate performance regime, not desktop rendering with a smaller budget.

## 1. XR runtime identity

Record:

```yaml
xr_identity:
  three_version:
  renderer_class:
  actual_backend:
  browser_runtime_version:
  headset_device:
  session_mode:
  requested_reference_space:
  actual_refresh_hz:
  view_count:
  projection_layer_type:
  framebuffer_dimensions:
  framebuffer_scale:
  foveation_setting:
  multiview_available:
  multiview_active:
  antialias_and_samples:
  postprocessing_path:
  passthrough_or_composition_layers:
  thermal_power_state:
```

Do not infer actual refresh, view count, framebuffer size, multiview use, or backend from desktop settings or requested values.

## 2. XR deadline model

Track:

- animation-frame callback interval
- main update and render submission
- per-view or multiview pass count
- GPU time if supported in the runtime
- compositor/presentation misses, dropped frames, or reprojection indicators where exposed
- motion-to-photon-sensitive latency and result age
- sustained performance after thermal stabilization

Use the actual headset refresh budget. Leave headroom for runtime/compositor work that the application may not directly observe.

A desktop mirror that looks smooth does not prove the headset met presentation deadlines.

## 3. View and pass multiplication

Audit actual work across:

- left/right or additional views
- shadow passes
- reflection/refraction passes
- post-processing per view versus shared
- UI/composition layers
- depth submission
- passthrough/AR composition
- mirror output

Count physical pixels and samples across all views and targets. A “single fullscreen pass” may execute for each eye at headset resolution.

## 4. Multiview

Multiview can reduce duplicated CPU submission and some rendering work when supported, but it is backend/runtime/material-path dependent.

Before recommending it:

- verify capability and actual activation
- verify shader/material/post stack compatibility
- measure CPU submission and GPU change separately
- inspect per-view data and culling behavior
- test target headset/runtime versions
- retain a fallback path

Do not call multiview a universal 2× win. Pixel shading for two views still exists, and incompatibilities can add complexity.

## 5. Foveation and framebuffer scale

Diagnose at a fixed declared scale/foveation first.

After GPU pixel pressure is confirmed and quality trades are allowed:

- use bounded scale/foveation tiers
- change slowly with hysteresis
- target sustained headroom, not the exact deadline
- avoid reacting to one shader/GC/spawn hitch
- log actual scale/foveation with performance telemetry
- test visual quality in peripheral and central regions
- ensure UI/readability and interaction targets remain acceptable

Treat a scale or foveation change as `quality_trade`. Some XR layer/framebuffer settings may be constrained to session initialization or specific lifecycle points; verify the installed runtime/API path.

## 6. XR animation loop and simulation cadence

Use the renderer/runtime-supported XR animation loop. Do not run a competing normal `requestAnimationFrame` loop that duplicates update or render work.

Separate:

- headset render cadence
- fixed physics tick
- network tick
- interpolation/prediction
- controller/hand input sampling

A 90 Hz render loop does not require 90 Hz physics if the game contract supports a lower fixed tick plus interpolation. Changing tick rate is a behavior/determinism decision, not a render optimization.

## 7. Input, hands, controllers, and interaction

XR input can add:

- per-joint hand-tracking updates
- controller model animation
- raycasts/shape queries per hand
- haptics/event handling
- pose conversions and matrix updates
- DOM overlay or UI layout

Track active joints, queries, updated objects, and allocations. Use candidate filtering and appropriate spatial structures; do not raycast the entire render scene for every joint/controller by default.

## 8. Standalone thermal and sustained behavior

Standalone devices require sustained tests.

Define:

- device starting temperature/power state where observable
- battery/charging state
- preconditioning replay
- capture windows at cold, stabilized, and degraded points
- fanless thermal recovery period
- workload counts to prove the scene stayed constant

Report which stage grows. Adaptive quality may be the correct product policy, but it must be tested as a quality controller, not used to hide an unidentified leak or runaway workload.

## 9. XR-specific first-use stalls

Watch for:

- session start/layer allocation
- first controller/hand model load
- first per-eye material variant
- first depth/passthrough path
- first composition layer
- first shadow/post target at XR size
- runtime permission or device initialization

Warm only likely near-term resources and measure session-start cost separately from first interaction.

## 10. Presentation and replay semantics

Gameplay replay alone does not prove XR presentation equivalence. Check:

- camera/view transforms
- controller/hand pose mapping
- stereo visibility and culling
- UI layer placement/readability
- foveation/scale state
- picking and interaction rays
- teleport/snap-turn behavior
- result age and local prediction

Image comparisons may need per-eye captures or feature-specific assertions; one desktop screenshot is insufficient.

## 11. XR action example

```yaml
action:
  change: Add a three-tier framebuffer-scale controller with 2-second over-budget hysteresis and 5-second recovery, bounded to the tested readable range.
  subsystem: xr
  trade: quality_trade
  equivalence_status: not_applicable
  diagnosis_link: confirmed gpu_fill_bandwidth_overdraw at fixed scale
  expected_gain_basis: measured scale perturbation
  prediction: sustained compositor misses fall below target while tier changes remain rare and visual readability passes
  risk: medium
  semantic_surface: UI readability, reticle precision, session lifecycle, telemetry, oscillation
  validation: headset GPU/frame metrics, missed-frame rate, scale transition log, visual QA, thermal replay
```

## 12. XR acceptance matrix

```yaml
xr_acceptance:
  headset_runtime:
  target_actual_refresh:
  frame_p95_p99:
  missed_or_reprojected_frame_rate:
  longest_miss_cluster:
  main_submission_p95:
  gpu_p95_if_available:
  view_and_pass_count:
  framebuffer_scale_foveation:
  multiview_active:
  input_pose_and_query_cost:
  session_start_first_use:
  sustained_thermal_window:
  per_eye_render_semantics:
  suspend_resume:
  session_end_restart:
```

An XR patch fails if it only improves the desktop mirror, violates headset presentation or interaction semantics, or depends on an unavailable capability without fallback.
