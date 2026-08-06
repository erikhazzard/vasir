# Frame Pacing, Pipeline Attribution, and Discriminating Tests

Use this reference for every task. The central question is not “what code is expensive?” but “which stage prevents the next frame from meeting the presentation deadline?”

## 1. Pipeline model

Model the runtime as overlapping stages:

```text
input / game update / animation / scene mutation
        ↘ physics commands → worker queue → Rapier step → result marshal/transfer ↘
scene traversal / culling / sorting / render submission → GPU execution → compositor/presentation
DOM, browser tasks, GC, loading, uploads, and compilation may interrupt or stall any stage
```

CPU, worker, and GPU durations may overlap. Do not sum them naively. A busy stage is not necessarily the constraining stage; the bottleneck is the stage whose completion or dependency chain causes presentation deadlines to be missed.

Separate:

- CPU update cost
- render traversal/submission cost
- worker computation
- worker queue/transfer/wait cost
- GPU execution
- browser/compositor/presentation behavior
- asynchronous cold work and synchronous stalls

## 2. Frame metrics

At the target refresh rate, track:

- median/mean frame time
- p95 and p99
- frames over budget percentage
- severe-hitch count
- longest consecutive over-budget cluster
- frame-to-frame delta variance
- subsystem p95/p99 and correlation with bad frames

Average FPS can improve while player-visible pacing worsens. A single 80 ms frame is not represented meaningfully by a 60-second average.

### Frame-budget examples

- 60 Hz: 16.67 ms
- 72 Hz: 13.89 ms
- 90 Hz: 11.11 ms
- 120 Hz: 8.33 ms

Reserve headroom. A build that barely meets the median target but misses p95 under normal variation is not stable.

## 3. Instrumentation hierarchy

Prefer the closest reliable clock to the work:

1. Native subsystem timing: Rapier phase profiler, GPU timer query, browser trace category.
2. Named region timing: `performance.mark()` / `performance.measure()` around update, traversal/submission, queue drain, marshal, transfer, and upload orchestration.
3. Counters and active-set measures.
4. Symptoms and heuristics.

Instrumentation itself can perturb timing. Sample expensive probes, record capability/invalid samples, and compare with instrumentation disabled before shipping conclusions.

### Minimum frame loop regions

```ts
performance.mark('frame:start');

performance.mark('update:start');
updateGame();
performance.mark('update:end');

performance.mark('physics-sync:start');
applyPhysicsResults();
performance.mark('physics-sync:end');

performance.mark('render:start');
renderer.render(scene, camera);
performance.mark('render:end');

performance.mark('frame:end');
```

Use a low-allocation ring buffer for production-like sampling. Do not create marks, labels, arrays, or logs per frame indefinitely without measuring their overhead.

## 4. Evidence roles

Label every signal:

- `diagnostic_evidence`: supports or falsifies a bottleneck
- `explanatory_context`: describes workload but does not prove causality
- `acceptance_metric`: determines whether a patch passes

Examples:

- 4,000 draw calls are context until render-submission or GPU timing and a draw-reduction perturbation implicate them.
- 2,000 rigid bodies are context; active bodies, contacts, Rapier phase time, and a collision-pruning test are evidence.
- A heap sawtooth is context; GC pauses correlated with bad frames and an allocation-reduction test are evidence.

## 5. Diagnosis status

Use:

- `confirmed`: controlled perturbation causes predicted metric movement beyond noise; alternatives materially weakened
- `probable`: multiple independent signals converge; clean isolation unavailable
- `plausible`: symptom and architecture fit; evidence incomplete
- `unproven`: no causal evidence

Never upgrade confidence merely because a familiar optimization exists.

## 6. Discriminating test library

Use the smallest reversible perturbation that causes competing hypotheses to predict different outcomes. Maintain the same command tape and fixed quality unless quality itself is the tested variable.

### GPU fill/bandwidth/overdraw probe

**Perturbation:** reduce drawing-buffer pixel count materially while preserving scene, update, physics, and pass topology.

**Supports:** GPU time, p95, and budget misses improve strongly.

**Weakens:** GPU time is unchanged or CPU submission remains dominant.

**Caveat:** lowering DPR may also change LOD, post-processing branches, or UI behavior; freeze those if possible.

### Draw/state/submission probe

**Perturbation:** render a representative scene subset or replace repeated objects with a temporary single proxy while preserving approximate pixel coverage.

**Supports:** main render-submission time and/or GPU command time falls with draw/material/program count.

**Weakens:** timings remain flat; the scene may be fill/shader bound instead.

### Render-versus-update probe

**Perturbation:** continue input, game update, physics, and worker traffic but replace scene rendering with a trivial clear or minimal scene.

**Supports render bottleneck:** frame pacing recovers.

**Supports non-render bottleneck:** little change.

Do not ship this perturbation; it is an attribution tool.

### Main-update probe

**Perturbation:** replay cached transforms/animation state or temporarily bypass a suspected update subsystem while rendering the same frame workload.

**Supports:** main-update timing and frame misses fall.

**Caveat:** ensure the bypass does not also reduce visible objects, physics contacts, or GPU work.

### Physics computation probe

**Perturbation:** replay recorded body transforms while bypassing `world.step()` and preserving render sync volume.

**Supports:** worker/main physics step disappears and deadline adherence improves.

**Weakens:** frame pacing remains bad; transfer or rendering may dominate.

### Worker handoff probe

**Perturbation:** keep Rapier stepping but suppress or drastically reduce result payload while preserving worker cadence.

**Supports:** main-thread sync/wait and frame misses improve while physics step timing remains similar.

**Weakens:** little change; simulation or rendering is more likely.

### GC/allocation probe

**Perturbation:** remove or pool one measured high-rate allocation source without altering work; compare GC pause distribution and hitch correlation.

**Supports:** allocation rate and GC-correlated spikes fall.

**Weakens:** heap rate changes but bad-frame distribution does not.

Do not force GC in the normal benchmark and call the result production behavior. Forced GC may be used only as a diagnostic boundary and must be labeled.

### First-use decomposition probe

Warm one resource class at a time:

- decoder/WASM initialization
- parse/transcode
- texture upload
- shader/program/pipeline compile
- render-target/shadow allocation
- body/collider allocation
- initial contacts/events

The stage whose isolated warmup removes the hitch is implicated. “Prewarm everything” proves nothing and may hide production cost.

### Pass/shadow probe

Disable exactly one pass, shadow light, or update cadence at a time. Keep resolution and other effects fixed. Attribute both CPU submission and GPU movement.

### UI/browser probe

Temporarily freeze DOM-heavy overlays, framework reconciliation, layout reads/writes, or high-frequency event handlers while preserving the 3D workload. Use browser traces to distinguish script, style/layout, paint/composite, and game-loop work.

### Thermal probe

Run an identical sustained replay from a declared precondition. If frame time degrades while workload counts stay flat, inspect which stage grows. Falling total FPS alone does not prove thermal throttling.

## 7. Browser timing surfaces

Use as available:

- User Timing marks/measures
- browser performance traces and flame charts
- `PerformanceObserver` streams
- Long Tasks
- Long Animation Frames for severe > ordinary-budget main-thread frames
- GPU timer queries with disjoint/invalid sample handling
- memory/resource counters and controlled lifecycle loops
- XR runtime/compositor telemetry where exposed

Long Animation Frames are supplemental because their threshold is much larger than a 60–120 Hz game budget. They help attribute severe stalls, not ordinary 9–20 ms misses.

Avoid synchronous GPU readbacks or compile-status polling in the measurement path unless the suspected stall is exactly that readback.

## 8. Heuristics are starting hypotheses

- DPR sensitivity suggests pixel/fill/bandwidth pressure.
- Object-count sensitivity with low DPR sensitivity suggests CPU traversal/submission or state pressure.
- Spikes correlated with contacts/wakeups suggest Rapier broadphase/narrowphase/solver/CCD pressure.
- Spikes correlated with result count or bytes suggest handoff pressure.
- One-time stalls suggest cold compile/upload/decode/allocation/contact work.
- periodic sawtooth stalls suggest GC, cleanup, streaming, telemetry flushes, or pooled-capacity growth.
- degradation after minutes suggests thermal, leak, pool growth, shader/material proliferation, or accumulating work.

Always confirm with a perturbation. Several causes can coexist.

## 9. Mixed bottlenecks

A workload may cross different limits in different scenes or frames. Report:

```yaml
mixed_profile:
  scene_a: gpu_fill_bandwidth_overdraw
  scene_b: physics_solver
  spawn_frame: cold_upload_and_contacts
  long_session: memory_gc
```

Do not average these into “mixed” and stop. Create a scenario-specific acceptance matrix and rank fixes by user impact, prevalence, and trade cost.

## 10. Attribution example

```yaml
hypothesis:
  name: transparent particle overdraw is the primary battle-scene limit
  status: confirmed
  evidence_for:
    - GPU p95 rises from 7.1 ms to 15.4 ms when effect is active
    - draw submission changes only 0.4 ms
  controlled_perturbation: preserve particle count and simulation but render opaque depth-tested proxy quads at the same draw count
  prediction: GPU time and budget misses fall if blend overdraw/shader cost is causal
  observed: GPU p95 falls to 8.0 ms; calls remain within 3%
  alternative_explanation: particle CPU simulation
  falsifying_result: main update falls while GPU time remains high
```

This is stronger than “particles are expensive” because it isolates the expensive dimension.