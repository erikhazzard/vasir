# WebXR and Standalone-Headset Performance

Use this reference whenever immersive VR/AR, standalone XR, headset browsers/runtimes, foveation, multiview, or compositor misses are in scope. XR is a separate performance regime, not desktop rendering with a smaller budget.

Start with a repeatable workload on the target headset. Separate application update, CPU render submission, GPU execution, and compositor/presentation before choosing an intervention. **Render bypass identifies render-side cost; resolution sensitivity identifies pixel-scaled cost. Neither alone proves a CPU/GPU or vertex/fragment verdict.**

## Contents

- [Runtime identity](#1-xr-runtime-identity)
- [Deadlines, Quest capture, and diagnostic sequence](#2-xr-deadline-model)
- [Views, passes, and composition layers](#3-view-and-pass-multiplication)
- [Multiview](#4-multiview)
- [Foveation and framebuffer scale](#5-foveation-and-framebuffer-scale)
- [Animation loop and simulation cadence](#6-xr-animation-loop-and-simulation-cadence)
- [Input and interaction](#7-input-hands-controllers-and-interaction)
- [Thermal behavior](#8-standalone-thermal-and-sustained-behavior)
- [First-use stalls](#9-xr-specific-first-use-stalls)
- [Presentation semantics](#10-presentation-and-replay-semantics)
- [Action example](#11-xr-action-example)
- [Acceptance](#12-xr-acceptance-matrix)
- [Primary sources](#13-primary-sources)

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

Callback cadence can remain locked to the display rate while application cost changes underneath it. Track work durations and missed/stale frames alongside cadence; do not interpret unchanged FPS as an unchanged workload. Application GPU time below budget also does not prove a CPU bottleneck: scheduling and compositor work can still cause misses.

### Quest capture procedure

Use the shared [benchmark contract](benchmark-replay.md#1-benchmark-contract), then:

1. Record the identity above, build, repeatable scene/action path, fixed quality, warmup, thermal state, and capture interval. Keep headset motion and visibility comparable; record live-pose variation when exact replay is unavailable.
2. Capture a minimally instrumented headset baseline. Add the tool that can distinguish the current hypotheses:

   | Evidence needed | Tool and interpretation |
   |---|---|
   | Headset frame delivery and GPU/runtime context | [OVR Metrics through MQDH](https://developers.meta.com/vr/documentation/spatial-sdk/ts-mqdh-logs-metrics/): record available app GPU, compositor GPU, stale-frame, eye-buffer, refresh, and clock/thermal signals. |
   | JavaScript, GC, update, traversal/submission | [Quest Browser remote DevTools](https://developers.meta.com/vr/documentation/web/browser-remote-debugging/): inspect named frame regions and main-thread traces; timing `renderer.render()` measures CPU-side work and any stalls, not GPU execution duration. |
   | Expensive draws, depth rejection, vertex/fragment evidence | [RenderDoc for Browser](https://developers.meta.com/vr/documentation/web/webxr-perf-renderdoc/) for frame inspection; [ovrgpuprofiler](https://developers.meta.com/vr/documentation/web/webxr-perf-tools/) where supported for device GPU evidence. Capture/replay draw timings guide attribution; they do not establish normal headset presentation cost. |

3. Record metric names, units, source, sampling interval, and unavailable fields. OVR CPU utilization is a percentage of the busiest core, not JavaScript/main-thread milliseconds. Some GPU-duration fields use microseconds; normalize before comparing with the millisecond budget. Consult the [OVR metric definitions](https://developers.meta.com/vr/documentation/unreal/ts-ovrstats/), not the label alone. Do not add overlapping sampled metrics into a fabricated serial frame time.
4. Run one controlled perturbation, then return to baseline. Repeat comparable captures and check drift. For acceptance, restore temporary capture flags and use the same minimal instrumentation for both variants: [advanced metrics add overhead](https://developers.meta.com/vr/documentation/unreal/ts-ovr-best-practices/). Follow the current tool setup for the actual headset/browser/tool versions rather than copying old device-specific flags.

Interpret durations at comparable observed clock/performance states. Dynamic frequency scaling can hide reduced work behind lower clocks or produce shorter times at higher clocks; repeat under comparable states or keep attribution provisional. [Meta's GPU measurement guidance](https://developers.meta.com/vr/documentation/unity/po-per-frame-gpu/) controls these factors for isolated timing. Any supported overrides are diagnostic conditions: restore normal power and compositor policy for acceptance.

If target-headset access or a metric is unavailable, report that boundary and the next discriminating capture. Desktop results remain diagnostic context; they cannot certify headset performance.

### Diagnostic sequence

Adapt [Meta's workflow](https://developers.meta.com/vr/documentation/web/webxr-perf-workflow/) using the shared [discriminating tests](frame-pacing-attribution.md#6-discriminating-test-library):

| Controlled observation | Warranted conclusion and next step |
|---|---|
| Replacing scene rendering with a minimal clear improves pacing while input, simulation, worker traffic, and XR frame scheduling continue | Render-side work matters. Separate CPU traversal/submission from GPU time; the bypass removed both. Little improvement redirects investigation toward update, handoff, scheduling, or presentation without excluding a mixed bottleneck. |
| Reducing actual XR eye-buffer pixels improves GPU duration with geometry, draw count, material, foveation, and pass topology fixed | Pixel-scaled work is implicated. Isolate an expensive pass, material, overdraw, or bandwidth contributor next. Inspect actual target dimensions; changing desktop DPR or a requested value without changing XR buffers is not a valid probe. |
| Resolution reduction has little effect | Check whether the expensive target actually changed: fixed-size shadows/reflections may not have. Inspect CPU submission and use the shared [geometry/vertex probe](frame-pacing-attribution.md#gpu-geometryvertex-probe); do not infer vertex limitation by elimination. |
| Application measurements improve but headset misses persist | Inspect compositor/runtime signals, submission timing, refresh changes, thermal state, and capture overhead. Keep the verdict mixed or unproven until the remaining deadline constraint is isolated. |

Use a substantial supported scale reduction for diagnosis, verify applied dimensions, and restore quality afterward. If changing scale requires a new session, warm and replay each variant after its own session setup; exclude startup allocation from steady-state comparisons. Re-profile after every accepted change.

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

Record whether dimensions describe a per-eye texture, a stereo atlas, or a texture array. Do not multiply an atlas that already contains both eyes by two again; account for array layers, viewports, samples, and repeated passes explicitly.

### Composition layers: remove redraw work only when the representation fits

Consider native composition layers when a measured cost comes from suitable planar UI, video, or a distant panorama. [Meta's layer guidance](https://developers.meta.com/vr/documentation/web/webxr-layers/) describes these uses. Distinguish the main projection layer from independently composed content: an `XRProjectionLayer` alone does not cache the world.

- For unchanged content, retain the layer image through the supported lifecycle and honor runtime redraw/resource-loss requests. Video and changing UI still have update work. The [Layers specification](https://www.w3.org/TR/webxrlayers-1/) defines `needsRedraw` and static-layer restrictions; “only redraw when app data changes” is insufficient.
- Static world geometry can still change its projected image with head translation. Do not flatten a nearby 3D scene into a panorama without testing parallax, stereo, and occlusion; that is a representation change, not automatic equivalence.
- Verify requested features, successful layer creation, and the installed renderer's integration. Measure app work removed against texture memory, uploads, layer management, and compositor cost added. Keep the existing frame/session owner and pass the candidate through `$code__threejs-rapier-performance`'s topology guard.
- Check layer order, alpha edges, color handling, hands/controllers intersecting content, six-degree-of-freedom movement, session restart, and fallback. Ordinary scene depth occlusion must not be assumed across composition layers.

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

For Three.js `WebGLRenderer`, use the installed version's [WebXRManager contract](https://threejs.org/docs/pages/WebXRManager.html):

| Control | Lifecycle and proof |
|---|---|
| `renderer.xr.setFramebufferScaleFactor(scale)` | Set before XR session setup. This API cannot resize the active session's framebuffer; compare separately initialized sessions. Verify the resulting layer dimensions rather than treating the requested scale as applied. |
| `renderer.xr.setFoveation(value)` | The documented range is 0 (none) to 1 (maximum). Verify support on the active layer/runtime before adapting during a session; record the initial setting and measured effect. Do not assume foveation starts disabled. |

Desktop `setPixelRatio()` is not evidence of changed XR resolution. Likewise, a successful foveation setter or manager getter is not proof of hardware behavior: [WebXRManager's implementation](https://github.com/mrdoob/three.js/blob/dev/src/renderers/webxr/WebXRManager.js) can report stored configuration. Check active-layer support and target-headset results; unsupported `fixedFoveation` may be a no-op under the [Layers contract](https://www.w3.org/TR/webxrlayers-1/#xrprojectionlayer).

After GPU pixel pressure is confirmed and quality trades are allowed:

- use bounded scale/foveation tiers
- adapt only controls verified to work during the session, slowly with hysteresis
- target sustained headroom, not the exact deadline
- avoid reacting to one shader/GC/spawn hitch
- log actual scale/foveation with performance telemetry
- test visual quality in peripheral and central regions
- ensure UI/readability and interaction targets remain acceptable

Treat scale and foveation changes as `quality_trade`. For a setup-only control, choose the tested tier before entry or on the next normal session restart; do not restart immersive sessions to chase frame spikes. A different dynamic-resolution mechanism requires its own verified API, ownership, and visual contract. Check the actual backend's API separately for `WebGPURenderer` or custom runtimes.

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
- recovery period to restore the declared starting thermal/power state
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

Use this shape only after a target-headset scale experiment supports the trade; fill the chosen value and acceptance thresholds from that benchmark. It does not prescribe a dynamic framebuffer-resize API.

```yaml
action:
  change: Select the measured readable framebuffer scale before XR session setup and hold it fixed for the session.
  subsystem: xr
  trade: quality_trade
  equivalence_status: not_applicable
  diagnosis_link: confirmed pixel-scaled GPU pressure with other quality settings fixed
  expected_gain_basis: repeated target-headset scale perturbation with matched warmup and thermal state
  prediction: GPU time and headset missed-frame rate improve beyond baseline variance while per-eye readability passes
  risk: medium
  semantic_surface: UI readability, reticle precision, central/peripheral detail, session lifecycle
  validation: actual layer dimensions, GPU/frame metrics, missed-frame rate, per-eye visual QA, thermal replay, session restart
```

## 12. XR acceptance matrix

```yaml
xr_acceptance:
  headset_runtime:
  metric_sources_units_and_unavailable_fields:
  capture_overhead_and_baseline_drift:
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
  composition_layer_redraw_occlusion_and_fallback_if_changed:
```

An XR patch fails if it only improves the desktop mirror, violates headset presentation or interaction semantics, or depends on an unavailable capability without fallback.

## 13. Primary sources

Use the linked official pages for tool setup and API details; verify the installed versions before implementation. This reference adapts the workflow into conservative diagnostic rules rather than treating its CPU/GPU and vertex/fragment shortcuts as proof.

- [Meta WebXR optimization workflow](https://developers.meta.com/vr/documentation/web/webxr-perf-workflow/) — staged perturbations and iteration.
- [Meta WebXR performance tools](https://developers.meta.com/vr/documentation/web/webxr-perf-tools/) — target-device capture capabilities.
- [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html) — scale, foveation, and session lifecycle; match the project's version.
- [WebXR Layers specification](https://www.w3.org/TR/webxrlayers-1/) — layer lifecycle and composition semantics; specification support does not establish device support.
