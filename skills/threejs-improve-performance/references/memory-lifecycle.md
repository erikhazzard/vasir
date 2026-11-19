# Memory, Allocation, GC, Resource Ownership, and Lifecycle

Use this reference for periodic hitches, heap/resource growth, long-session degradation, spawn/despawn churn, teardown, pooling, or context/device-loss problems.

## 1. Distinguish memory symptoms

Classify:

- **Allocation churn:** high short-lived allocation rate; may cause periodic GC.
- **Retained leak:** objects/resources remain reachable after their intended lifetime.
- **Bounded cache:** memory rises to a stable useful plateau.
- **Unbounded pool/cache:** intentional retention with no cap or eviction.
- **GPU/resource leak:** JS heap may look stable while textures, buffers, targets, or programs accumulate.
- **WASM/native leak:** Rapier objects or other WASM allocations remain alive outside ordinary JS heap accounting.
- **Fragmentation/capacity growth:** arrays or buffers repeatedly grow and retain high-water capacity.
- **Thermal/power degradation:** may correlate with memory growth but is not proved by it.

Do not call every upward graph a leak. Prove that memory/resource counts fail to return to the expected plateau after a complete lifecycle.

## 2. Allocation is a budget, not a religion

Measure:

```yaml
allocation_profile:
  bytes_or_objects_per_frame:
  allocation_sources:
  gc_frequency:
  gc_pause_median_p95_p99:
  bad_frame_correlation:
  retained_after_gc_or_idle:
  pool_high_water:
```

Remove allocations in hot paths when they materially contribute to GC or CPU time. Do not add elaborate pooling for a tiny allocation source that never causes a meaningful pause.

Common hot-path sources:

- vectors/quaternions/matrices returned by convenience APIs
- arrays from `map/filter/reduce`, spreads, or temporary result collections
- closures and promises created per frame/tick
- string formatting, JSON, logging, and telemetry payloads
- event objects
- query/raycast results
- worker message objects
- material/geometry/attribute creation
- repeated buffer resize

Prefer scratch objects, caller-owned result buffers, bounded reusable arrays, and stable data layouts only where measurement justifies them.

## 3. Ownership graph

Every disposable or retained resource should answer:

```yaml
resource_ownership:
  resource:
  creator:
  logical_owner:
  shared_by:
  release_condition:
  disposer:
  cache_or_pool:
  maximum_retention:
  rebuild_after_loss:
```

Do not call `.dispose()` merely because a scene node is removed. Shared geometry/material/texture resources may still be live. Conversely, removing an object from the scene does not dispose its resources.

Use reference counting, asset-scope ownership, explicit scene/level scopes, or another clear policy. The specific mechanism matters less than eliminating ambiguous ownership.

## 4. Three.js resource ledger

Track at least:

- geometries and buffer attributes
- materials and shader variants
- textures, cube/array/data textures, and video sources
- ImageBitmaps or decoded image resources when applicable
- render targets and depth/stencil attachments
- post-processing passes and internal targets
- skeleton/bone textures and animation resources
- PMREM/environment outputs
- custom GPU buffers/pipelines in backend-specific code
- renderer/cache objects created per scene or restart

For dynamic resources, track creation site, count, approximate bytes, last use, and disposal path.

Watch for:

- per-entity material clones
- hidden duplicate asset loads caused by cache-key differences
- targets recreated on resize without disposing old targets
- scene transitions retaining closures/listeners that reference whole graphs
- post stacks or composers rebuilt repeatedly
- material flags/defines causing program proliferation
- ImageBitmaps not explicitly closed when the loader/lifecycle requires it

## 5. Rapier and WASM lifecycle

Track:

- `World`
- `EventQueue`
- query/debug resources exposed by the installed build
- bodies, colliders, joints, controllers, or handles retained in JS maps
- worker-owned WASM module/world state
- scene reload and worker termination paths

Free engine-owned WASM objects using the installed API and remove all JS references/handle maps. Prevent late worker messages or events from reintroducing references after teardown.

## 6. Worker buffers and pools

A pool is correct only when it is bounded and its ownership is explicit.

Record:

- buffer size classes
- active, free, in-flight, and transferred counts
- high-water mark
- growth trigger
- shrink/eviction policy
- behavior after scene transition
- behavior after tab suspension or worker restart

Avoid:

- allocating a new result buffer every tick
- retaining every historical maximum forever
- returning transferred buffers to multiple owners
- unbounded command/event queues
- pooled objects that retain references to large graphs

## 7. Lifecycle plateau test

Use a repeated scenario:

```text
load scene → warm → spawn/use content → despawn → unload → idle/settle → repeat
```

Capture each cycle:

- JS heap trend where observable
- live scene-node count
- `renderer.info` resource counts, interpreted cautiously
- owned texture/geometry/material/target counts
- worker buffer counts/bytes
- Rapier world/body/collider/joint/event counts
- listeners, timers, observers, subscriptions
- GPU/renderer recreation counts

Pass when counts and memory converge to a bounded plateau consistent with declared caches/pools. A one-time warm cache rise can be valid; growth proportional to cycle count is not.

Do not depend on forced GC as the production acceptance test. It may help distinguish reachability during diagnosis, but the normal runtime must remain stable under normal collection behavior.

## 8. Periodic GC attribution

To implicate GC:

1. Record allocation rate and suspected sources.
2. Correlate pauses with bad frames.
3. Remove one high-rate source without changing gameplay/render work.
4. Verify allocation and GC pauses fall.
5. Verify frame p95/p99 or hitch count improves.

A heap sawtooth alone is normal generational collection behavior, not proof of a problem.

## 9. Shader/material/resource proliferation

Long-session degradation can come from accumulating unique materials/program variants or transient targets, not only JS objects.

Track unique stable keys for:

- material family and variant
- geometry/buffer layout
- texture source and sampler state
- render-target specification
- post-processing configuration

Alert when “same logical asset” creates new GPU resources repeatedly. Reuse only when semantics and ownership match.

## 10. Context and device loss

Test normal teardown and forced loss separately.

Verify:

- loss notification pauses or degrades safely
- logical game/physics state is preserved or intentionally restarted
- all GPU resources are recreated exactly once
- caches do not retain dead backend resources
- post stacks, targets, materials, and custom buffers reconnect
- worker/physics pipelines do not continue sending unusable render results indefinitely
- restored resource counts return to the expected plateau

A resource may be logically owned across loss even though its GPU representation must be rebuilt.

## 11. DOM/framework and listener lifecycle

Audit non-Three.js memory that can retain the scene:

- event listeners on window/document/canvas
- animation-frame or interval loops
- ResizeObserver/IntersectionObserver/PerformanceObserver
- framework subscriptions and stores
- input/gamepad/XR listeners
- loader callbacks and promises
- worker message handlers
- debug panels and telemetry queues

Teardown should be idempotent. Double teardown must not crash; double setup must not create duplicate loops/listeners.

## 12. Memory action example

```yaml
action:
  change: Replace per-frame worker result objects with a bounded double-buffered typed-array result pool.
  trade: intended_equivalent
  equivalence_status: untested
  prediction: allocation rate and GC-correlated frame spikes fall; worker bytes and body count remain unchanged
  risk: medium
  semantic_surface: buffer ownership, stale generation records, sleep final poses, teardown
  validation: allocation rate, GC p95/p99, frame hitch count, in-flight buffer high-water, replay digest
```

## 13. Acceptance matrix

```yaml
memory_acceptance:
  allocation_rate:
  gc_pause_p95_p99:
  gc_bad_frame_correlation:
  lifecycle_cycle_count:
  heap_or_resource_plateau:
  geometry_material_texture_target_counts:
  shader_variant_count:
  worker_pool_high_water:
  rapier_wasm_teardown:
  listener_timer_observer_counts:
  context_or_device_loss_restore:
  long_session_frame_distribution:
```

A memory patch fails if it hides allocations behind an unbounded pool, disposes shared live resources, or improves heap metrics without improving the reported performance symptom.

