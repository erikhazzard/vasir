# Rapier Simulation, Collision, Solver, Queries, and Fixed-Step Semantics

Use this reference when physics computation, contacts, wakeups, colliders, CCD, events, queries, catch-up, or physics/render synchronization may constrain the workload.

## 1. Resolve physics provenance

Record:

```yaml
rapier_identity:
  package:
  version:
  build_or_wasm_id:
  dimension: 2d | 3d
  simd_or_deterministic_flavor_if_known:
  fixed_dt:
  integration_parameters:
  thread_location: main | worker
  authority_model:
  input_command_order:
  spawn_remove_order:
  rng_seed:
  replay_digest:
```

Do not assume fixed timestep alone guarantees replay equivalence. Package/build, initial state, command ordering, entity/body creation and removal order, initialization math, and queries/events may affect outcomes.

The default correctness target is gameplay-level replay: the same command tape must preserve canonical state and event outcomes within declared tolerances. Bitwise physics state is optional unless explicitly required.

## 2. Fixed-step loop and deadline behavior

A fixed step protects simulation semantics but can create a spiral when the application falls behind.

Measure:

- fixed tick rate
- rendered frames per tick and ticks per rendered frame
- catch-up steps per frame
- accumulator size
- dropped/clamped elapsed time
- worker late-tick count
- command backlog
- interpolation alpha and stale-state age

Define product behavior for:

- normal catch-up
- severe frame hitch
- hidden tab/session pause
- worker stall
- device resume
- multiplayer authority drift

Any elapsed-time clamp, skipped tick, command coalescing, or max-catch-up cap is a behavior decision. Label it and verify replay/gameplay effects.

### Fixed-step skeleton

```ts
const FIXED_DT = 1 / 60;
let accumulator = 0;
let previous = performance.now() / 1000;

function frame(nowMs: number): void {
  const now = nowMs / 1000;
  const elapsed = now - previous;
  previous = now;

  // Product policy: do not invent a clamp silently.
  accumulator += elapsed;

  let steps = 0;
  while (accumulator >= FIXED_DT && steps < configuredMaxCatchupSteps) {
    applyCommandsForTick(simTick);
    world.timestep = FIXED_DT;
    world.step(eventQueue);
    simTick++;
    accumulator -= FIXED_DT;
    steps++;
  }

  const alpha = accumulator / FIXED_DT;
  renderInterpolated(alpha);
}
```

The code is incomplete until the project declares what happens when `configuredMaxCatchupSteps` is reached.

## 3. Prefer Rapier-native phase attribution

When the installed version/build supports profiling, capture native phase timings in addition to outer `world.step()` timing:

- total step
- user-change propagation
- island construction
- broadphase
- narrowphase
- solver
- CCD stages
- other exposed phases

Correlate phase spikes with:

- active bodies
- awake islands and island sizes
- broadphase candidate pairs
- contact/intersection pairs
- solver contacts/joints
- CCD bodies and fast-motion events
- scene queries
- events/hooks
- body/collider creation/removal
- command volume

A slow aggregate step does not justify collider, solver, or CCD changes until the phase and workload correlation are known.

## 4. Active working set

Total body/collider count is context. Hot cost is more often driven by:

- active dynamic bodies
- sleeping/awake transitions
- island size and connectivity
- broadphase candidate density
- narrowphase contact manifold count
- solver constraints and joints
- CCD candidates
- events/hooks/queries
- world mutations
- changed bodies exported to rendering

Track ratios:

```yaml
physics_working_set:
  active_dynamic_over_total_dynamic:
  changed_over_active:
  contact_pairs_per_active_body:
  candidate_pairs_per_active_body:
  ccd_over_active:
  event_pairs_over_contacts:
  queried_candidates_per_query:
  synced_bodies_over_active:
```

Optimize the ratio or the work per active element, not merely total counts.

## 5. Sleeping is invalidation control, not a universal switch

Sleeping removes inactive bodies and islands from recurring work. Aggressive thresholds can also change responsiveness, wake propagation, stacked-object behavior, and replay outcomes.

Before changing sleep policy:

- prove active-body or island work is material
- identify why bodies remain awake
- inspect tiny forces, joints, kinematic contacts, scripted writes, and transform resets
- separate naturally active gameplay objects from accidental wake churn
- measure wake/sleep transitions and time-to-sleep

Prefer removing unnecessary writes or contacts that continually wake bodies over globally raising sleep aggressiveness.

Semantic checks:

- wake on expected collision/force/input
- stack settling
- trigger/contact timing
- moving platforms and kinematics
- network/replay outcomes

## 6. Broadphase and collision filtering

Broadphase cost grows with spatial overlap and candidate generation; narrowphase cost grows with actual shape-pair testing and contacts.

High-leverage levers:

- collision groups to prevent impossible interactions before narrowphase/solver work
- solver groups when contacts may be detected but should not enter the solver
- spatial partition and world-scale sanity
- correct collider bounds and placement
- fewer colliders per hot dynamic object
- avoid huge overlapping sensor volumes when a query or partitioned trigger can express the behavior

Do not call “many colliders” the bottleneck without candidate/contact and phase evidence.

### Filtering acceptance

For each group change, verify:

- intended collision matrix
- sensors/triggers
- damage and contact events
- ray/shape query filters
- joints and gameplay scripts
- replay event digest

## 7. Collider choice

Collider cost depends on shape type, motion, contact frequency, and scene density.

General high-value rules:

- simple primitives are cheapest and most stable when they model the needed behavior
- convex/compound proxies are usually preferable to detailed moving meshes
- static level geometry can use detail that would be inappropriate on many moving bodies
- collider count and compound structure can trade broadphase entries against narrowphase complexity
- a visually faithful collider is not necessarily a gameplay-faithful collider

Do not replace a collider solely because another shape is “faster.” Measure the implicated phase and test gameplay surfaces: traversal, snagging, stacking, contact points, trigger reach, projectile hits, and replay outcomes.

Dynamic hot trimeshes require exceptional evidence. Per-frame collider rebuilds are almost always an architecture smell unless the workload is tiny and measured safe.

## 8. Solver work and joints

Measure solver phase, contacts, constraints, joint count, island connectivity, and stability failures before changing iterations.

Prefer:

- local extra solver iterations only on bodies/islands that need stability
- simpler contact topology
- fewer unnecessary joints/constraints
- better mass/inertia and scale sanity
- contact skin only where a small gap is acceptable

Do not globally increase iterations to fix a local instability. Do not globally reduce them and call the result equivalent without testing stacks, joints, penetration, restitution, friction, and gameplay outcomes.

## 9. CCD and fast motion

CCD is a selective correctness tool with nontrivial cost.

Measure:

- bodies with tunneling risk
- actual fast-motion/tunneling incidents
- CCD phase time
- CCD-enabled active ratio
- soft-CCD prediction distance and candidate growth

Prefer narrow coverage based on body role, speed, size, and gameplay consequence. Consider analytic/projectile queries or swept tests when they better express the mechanic, but label behavior/architecture differences.

Never enable CCD globally because one projectile tunnels. Never disable it globally because the phase is expensive.

## 10. Events, hooks, and contact forces

Event and hook cost includes engine work, queueing, JS/WASM boundary work, filtering, allocation, and game-handler execution.

Audit:

- collider coverage for collision/intersection/contact-force events
- event volume per tick
- duplicate or ignored events
- hook coverage and execution time
- queue drain cadence
- handler allocations and lookups
- stale handles after despawn

Enable only the event classes and collider families the game consumes. Use stable IDs/generations to prevent late events from targeting reused entities. Drain and free queues predictably.

## 11. Scene queries and interaction

Track ray, shape, point, and intersection queries separately:

- count per tick/frame
- candidate count and filters
- query shape complexity
- duplicate queries from multiple systems
- result allocation and sorting
- whether Three.js raycasting duplicates Rapier spatial work

Use the spatial system whose representation matches the question. Rapier queries are appropriate for gameplay collision space; Three.js/BVH-style queries may be required for detailed render geometry. Do not force one structure to answer every query.

Batch or reduce queries only when latency and ordering semantics permit. Cache static query inputs, not dynamic results that may become stale.

## 12. Spawn/despawn and world mutation

Spikes may come from body/collider creation, broadphase insertion, first contacts, event bursts, handle maps, and result-buffer growth—not only steady stepping.

Measure separately:

- command decode/apply
- body/collider creation
- broadphase insertion
- first step after spawn
- first contact/event generation
- worker result-buffer resize
- despawn/removal and stale-reference cleanup

Staggering, pooling, or precreation may be a quality/behavior/memory trade. A pool that retains the world’s maximum historical body count forever can solve hitches while creating a memory problem; bound it and record high-water marks.

## 13. Sync only changed bodies, with semantic care

Exporting every body each tick can make a fast simulation look slow.

Prefer changed/active-body iteration when available, but distinguish:

- bodies changed by the simulation
- kinematic/scripted bodies changed by commands
- bodies that went to sleep and need a final pose
- bodies removed or newly spawned
- bodies whose render representation requires auxiliary state

Use stable entity IDs plus generation counters. A reused numeric handle without a generation can apply a late transform/event to the wrong entity.

Verify that sleeping bodies receive their final state and that newly visible/rendered bodies are initialized even if not currently active.

## 14. Physics action examples

### Confirmed broadphase/contact pressure

```yaml
action:
  change: Split debris into collision groups so debris-debris pairs are disabled while debris still hits world, player, and damage volumes.
  trade: intended_equivalent
  equivalence_status: untested
  prediction: broadphase/narrowphase and contact counts fall; solver time falls if debris-debris contacts were solved
  semantic_surface: debris piles no longer self-collide unless that behavior was intentionally irrelevant
  required_checks: collision matrix, damage events, trigger queries, replay event digest
```

This is only `intended_equivalent` if debris-debris interaction is outside the gameplay contract; otherwise it is a behavior trade.

### Local solver intervention

```yaml
action:
  change: Add solver iterations only to the unstable carried-object body family.
  trade: intended_equivalent
  prediction: local stability improves with negligible global solver growth
  validation: solver p95, carried-object jitter/penetration assertions, unaffected stress scene
```

### Worker result reduction

Route implementation details to `worker-handoff.md`; physics must still define the authoritative changed-body set and final-state semantics.

## 15. Physics acceptance matrix

```yaml
physics_acceptance:
  step_median_p95_p99:
  broadphase_p95:
  narrowphase_p95:
  solver_p95:
  ccd_p95:
  active_body_ratio:
  candidate_and_contact_counts:
  catchup_steps_and_spirals:
  event_volume:
  query_volume:
  changed_body_sync:
  canonical_replay_digest:
  collision_trigger_assertions:
  sleep_wake_assertions:
  spawn_despawn_stress:
  suspension_resume:
```

A step-time improvement fails if it changes required collision, trigger, query, or gameplay outcomes without an authorized trade.

