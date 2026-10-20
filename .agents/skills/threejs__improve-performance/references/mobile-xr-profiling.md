# Profiling, WebXR, and frame-time judgment

## Contents

- [Runtime and representative capture](#1-establish-the-runtime-then-capture-the-real-failure)
- [Measurement semantics](#2-keep-the-measurements-honest)
- [Controlled perturbations](#3-use-controlled-perturbations-not-visual-guesses)
- [XR execution rules](#4-xr-specific-execution-rules)
- [Multiview](#5-multiview-targeted-submission-optimization-not-render-one-eye-twice)
- [Hitches, recurring work, and evidence](#6-remove-hitches-and-recurring-overhead)

## 1. Establish the runtime, then capture the real failure

Read the lockfile and actual renderer construction. Record only what changes the result:
Three.js/version and backend, relevant custom shaders/renderer patches, headset/browser,
XR refresh rate, eye-buffer dimensions, MSAA/foveation, quality tier, population, scene,
and thread ownership. Inspect existing observability before adding instrumentation.
Do not confuse a desktop mirror, emulated XR view, or mobile flat-mode result with
headset performance.

The refresh interval is `1000 / Hz`: 72 Hz → 13.89 ms; 90 Hz → 11.11 ms;
120 Hz → 8.33 ms. This is a deadline interval, not permission to spend the entire interval
inside app JavaScript. Preserve headroom for scheduling variability and the rendering
pipeline. Read actual session/device behavior rather than assuming the requested rate.

Capture a warm, repeatable representative run plus the specific hitch scenario. Include
crowds, motion, interactions, joins, and streaming where relevant. Check sustained use,
not just a cold headset's first moments. Hold settings constant during comparison;
disable adaptive quality for diagnosis, then evaluate it separately if appropriate.
Use enough frames and repeated runs to distinguish a change from ordinary variation.
Do not build a benchmark framework when an existing scenario and trace suffice.

## 2. Keep the measurements honest

| Signal | What it establishes / what it does not |
|---|---|
| XR callback intervals | Application callback cadence; not complete proof of compositor presentation or GPU duration. |
| Main-thread profile | JavaScript/animation/IK, renderer preparation, scheduling, GC, and other observed work; identify inclusive versus self time. |
| Timer around `renderer.render()` | CPU wall time including submission and possible driver stalls; not direct GPU execution time. |
| Supported GPU timestamp query | GPU duration for the instrumented work when valid; not the compositor's entire pipeline. |
| Renderer counters | Submitted draw/primitive counts and resource-object counts; not memory bytes or a bottleneck diagnosis. |
| Physics/worker timing | Work on that thread; include message age, copies, queueing, and presentation handoff, not just simulation duration. |

For WebGL2 GPU queries, feature-detect `EXT_disjoint_timer_query_webgl2`. Poll results
asynchronously and discard invalid/disjoint samples. Never block on availability or add
`gl.finish()`/readback to manufacture a production benchmark. If queries are unavailable,
state that GPU time is unavailable; do not relabel CPU time. [S23]

With multiple renders/passes, use the installed renderer's accounting correctly. In the
documented WebGL path, disable `renderer.info.autoReset`, record the complete application
frame, then reset once. Do not double-count views or reset between passes accidentally.
`info.memory.textures` and `.geometries` count objects, not bytes. Multiview/batching may
change primitive/call counter semantics; inspect before comparing unlike paths. [S7]

Measure p50/p95/p99, worst recurrent spikes, and deadline misses where available. Label
callback-derived missed intervals as estimates, not device compositor drop statistics.
Do not sum CPU and GPU durations into a fictitious frame total: their timelines can
overlap. Do not sum independent p95 values or overlapping parent/child profiler spans.
For a requested 100% time breakdown, define the measured timeline/window, use exclusive
categories, and retain an unattributed remainder. Unobserved time is not automatically GPU.

## 3. Use controlled perturbations, not visual guesses

| Suspect | Targeted diagnostic experiment | Important qualification |
|---|---|---|
| Fragment/fill cost | Reduce actual XR eye-buffer resolution; disable selected transparent effects/expensive shading | Resolution sensitivity is evidence, not a full cause. Keep geometry/animation unchanged. |
| Vertex/skinning cost | Substitute lower geometry LODs or rigid proxy rendering | Keep material/pixel footprint comparable; track changed draws and appearance. |
| CPU animation/IK | Freeze remote pose evaluation while continuing to render the posed meshes | This isolates CPU pose work; GPU skinning may still run. |
| CPU submission | Cull a known draw-heavy category or batch compatible objects | Removing a category also changes GPU work; compare profiles, not FPS alone. |
| Physics | Freeze presentation from a known state and isolate the physics step in a diagnostic mode | Never ship this as a gameplay optimization; include worker/handoff cost. |
| GC | Correlate allocation sites and actual GC events with bad frames | A sawtooth graph or periodic spike alone does not establish GC. |
| First-use/upload | Repeat the same asset/effect after warmup; inspect compile, decode, upload spans | A warm second run does not prove the first-use hitch has been fixed. |

Change one mechanism per experiment. Use draw counts as the first inventory, not the
answer to every problem. Keep sample sizes and quality settings attached to comparisons.
Chrome's profiles/allocation tools can provide evidence; profiling overhead itself can
alter pacing, so corroborate with a lightweight in-app capture. [S24]

## 4. XR-specific execution rules

Use the renderer's supported XR animation-loop integration. Update local head and hands
from current XR pose data; do not gate them behind a network tick, remote IK budget,
or delayed worker response. Avoid duplicate per-eye simulation or animation evaluation.
The standard WebXR session/frame interface is window-exposed; this does not mean every
supporting computation must run on the window thread. [S7, S22]

Offload suitable simulation, data preparation, or decoding using the project's existing
worker model. Preserve ownership, fixed-step/replay semantics where required, and bounded
handoffs. Avoid synchronous waits and expensive structured-clone traffic. A worker can
reduce main-thread contention while still doing substantial total work; measure both.
Do not rewrite thread topology before identifying the limiting work.

For XR resolution, inspect actual projection-layer dimensions. Desktop `setPixelRatio`
is not evidence that XR render resolution changed. In documented `WebXRManager`,
`setFramebufferScaleFactor()` cannot be changed during an active XR session; use a
controlled session setup/restart or a verified backend-specific mechanism. Feature-detect
foveation and inspect the effective result. Do not change MSAA, resolution, foveation,
and shaders together and credit only one of them. [S19]

## 5. Multiview: targeted submission optimization, not “render one eye twice”

Multiview can submit compatible geometry to layered targets for multiple views. It still
produces distinct eye images; preserve each eye's view/projection matrices and view-
dependent shading. It does not erase the need to shade both views. [S21]

Before changing anything, determine whether the actual renderer path already supports
multiview. Current Three.js documents a multiview option for `WebGPURenderer`/its common
XR manager, with support-dependent behavior. That is not a setting to blindly copy into
`WebGLRenderer`; nor does the class name prove the active backend is WebGPU. Verify the
installed revision, selected backend, device support, material compatibility, and actual
active path. [S19, S20]

If duplicated stereo submissions are a measured bottleneck, prefer an existing supported
implementation. Otherwise evaluate a narrowly scoped, feature-flagged prototype with
ordinary stereo fallback. Do not migrate the renderer solely because an option exists.
Verify projection layers/framebuffers, MSAA/depth, custom/skinned/instanced shaders,
transparency, UI, culling, and view-dependent effects. Preserve visual settings in the A/B.

Compare renderer-submission time and deadline misses, plus GPU duration when available.
Fewer JavaScript draw calls alone is not sufficient. Reject one-eye rendering, reused
left-eye matrices, or broken eye-dependent specular/normal behavior as “optimizations.”

## 6. Remove hitches and recurring overhead

Use reusable vectors/quaternions/matrices, typed buffers, stable arrays, and existing
scratch storage in hot loops. Avoid repeated clones, object spreads, array-building
chains, JSON work, scene-wide scans, material creation, and resource churn in frame-critical
paths. Optimize evidenced allocation sites; do not introduce elaborate pooling everywhere.
Stagger noncritical UI, remote animation, relevance checks, and maintenance work. [S24]

Audit repeated material `needsUpdate`, redundant transform/buffer writes, shader-variant
explosion, texture resizing, and decode/compile/upload bursts. Prewarm known variants with
the supported `compileAsync` path where appropriate, configured for the real scene;
verify XR-specific variants too. Compilation does not automatically warm all textures,
render targets, drivers, or runtime-only variants. Stage these separately. [S7, S15]

Warm/stage avatar joins, first VFX, scene transitions, and resource uploads. Dispose
or reuse resources on lifecycle boundaries with shared ownership respected. Bound caches;
an ever-growing cache is not a performance fix. Retest the first interaction as well as
steady state, and remove intrusive diagnostics after the comparison. [S11]

**Evidence bar:** a repeatable target-hardware improvement to the limiting metric,
correct rendering/behavior, and an explicit quality trade if one was made. Without
hardware access, report inspection and code changes as such—not measured FPS gains.

Source keys: [primary sources](mobile-xr-sources.md).
