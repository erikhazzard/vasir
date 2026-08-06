# Worker Simulation, Handoff, Queueing, and Thread-Migration Economics

Use this reference when physics or rendering is off-main-thread, when worker messages are suspected, or when a thread migration is proposed.

## 1. Preserve topology during attribution

Do not move Rapier to a worker merely because workers sound scalable. First measure the current critical path.

Worker migration is justified only when at least one explicit objective is met:

- main-thread deadline misses are materially caused by physics work
- input/UI responsiveness needs isolation even if average FPS will not rise
- simulation authority or architecture requires a worker
- measured parallel overlap exceeds added marshal/transfer/synchronization cost

A GPU-bound app may gain no FPS. A tiny simulation may become slower. A worker that the main thread waits on synchronously is not meaningfully decoupled.

## 2. Break-even model

Before migration, model or prototype:

```yaml
worker_break_even:
  main_thread_work_removed_ms:
  worker_step_ms:
  command_encode_ms:
  command_transfer_ms:
  worker_queue_wait_ms:
  result_marshal_ms:
  result_transfer_ms:
  main_apply_ms:
  synchronization_wait_ms:
  update_density:
  bytes_per_tick:
  ticks_per_render_frame:
  expected_parallel_overlap_ms:
  responsiveness_goal:
```

The useful question is not “is worker step fast?” but:

```text
critical-path work removed > communication + coordination + remaining wait
```

Measure p95/p99 and backlog, not only mean bytes or step time.

## 3. Queueing model

Treat each direction as a producer/consumer queue.

Record:

- arrival rate and service rate
- queue depth and oldest-message age
- commands per tick
- bytes per tick
- late tick count
- dropped/coalesced commands
- result age at render time
- buffer availability stalls
- worker/main clock and tick mapping

Define backpressure explicitly:

```yaml
backpressure:
  max_command_queue_ticks:
  max_result_age_ticks:
  coalescible_command_types:
  never_drop_command_types:
  overflow_policy:
  resync_policy:
  telemetry:
```

Never silently drop, reorder, or coalesce commands that affect authoritative replay semantics.

## 4. Command and result representation

Prefer stable schemas and flat data:

- typed arrays or compact binary records for hot paths
- stable integer entity IDs plus generation counters
- batched commands per simulation tick
- explicit opcode and payload layout
- fixed or bounded variable-length regions
- pooled transfer buffers or a ring/double buffer
- separate structural events from high-volume transforms

Avoid:

- JSON
- object graphs with repeated keys
- one `postMessage` per body/event
- per-message closures or arrays
- map lookups by mutable Rapier handles without generation checks
- full-world snapshots when only a small change set moved

### Example command schema

```ts
const enum PhysicsOp {
  ApplyImpulse = 1,
  SetKinematicTarget = 2,
  SpawnBody = 3,
  RemoveBody = 4,
}

// [op, entityId, generation, a, b, c, d, ...]
interface CommandBatch {
  tick: number;
  count: number;
  words: Int32Array;
  scalars: Float32Array;
}
```

The exact layout should reflect measured command mix; do not build a generic binary protocol larger than the problem.

## 5. Changed-body result protocol

A robust result stream needs more than transforms:

```yaml
result_record:
  tick:
  entity_id:
  generation:
  flags: spawned | moved | slept | woke | removed | teleported
  position_rotation:
  optional_velocity_or_aux_state:
```

Requirements:

- send only changed/required bodies when that is cheaper
- send a final pose when a body sleeps
- initialize spawned or newly rendered bodies
- tombstone removed entities
- ignore stale generation records
- preserve tick ordering
- bound buffer growth

### Flat changed-body example

```ts
// Worker side. Reuse these arrays; resize only at a measured bounded high-water mark.
const ids = new Uint32Array(capacity);
const generations = new Uint16Array(capacity);
const flags = new Uint8Array(capacity);
const transforms = new Float32Array(capacity * 7);

let count = 0;
world.forEachActiveRigidBody((body) => {
  const entity = body.userData as { id: number; generation: number };
  ids[count] = entity.id;
  generations[count] = entity.generation;
  flags[count] = 1;
  const t = body.translation();
  const r = body.rotation();
  const o = count * 7;
  transforms[o] = t.x;
  transforms[o + 1] = t.y;
  transforms[o + 2] = t.z;
  transforms[o + 3] = r.x;
  transforms[o + 4] = r.y;
  transforms[o + 5] = r.z;
  transforms[o + 6] = r.w;
  count++;
});
```

This is illustrative, not automatically optimal. Verify installed API behavior, final sleeping poses, kinematic/scripted changes, and transfer strategy.

## 6. Transport choices

### Structured clone

Use for low-rate control messages or small workloads. Measure object creation and clone time before replacing it.

### Transferable `ArrayBuffer`

Useful for ownership handoff without copying, but requires buffer pools and clear ownership. A sender cannot keep using a transferred buffer until it returns or a replacement is available.

### SharedArrayBuffer

Consider only when:

- cross-origin isolation and secure deployment are available
- the synchronization protocol is simpler than the data copy it removes
- atomics, sequence counters, and memory ownership are well-defined
- field/browser/runtime support matches product targets

Shared memory is an architecture/deployment change, not a free optimization. Account for headers, third-party resource compatibility, deadlock/livelock risk, cache contention, and debugging complexity.

### Ring/double buffer

Useful when producer and consumer proceed asynchronously. Define:

- writer and reader sequence numbers
- overwrite policy
- stale-frame tolerance
- memory barriers/atomics if shared
- how structural events are never overwritten
- buffer capacity and resize policy

## 7. Interpolation and extrapolation

Off-thread fixed simulation often produces states at a different cadence than rendering.

Declare:

```yaml
presentation_policy:
  simulation_hz:
  render_hz:
  interpolation_delay_ticks:
  extrapolation_limit:
  teleport_snap_rule:
  stale_state_rule:
  local_player_prediction:
  replay_semantic_scope:
```

Interpolation changes presentation, not authoritative physics, but can alter picking, camera attachment, contact visuals, and perceived latency. Extrapolation can visibly diverge and must be bounded.

Do not make render interpolation feed back into authoritative commands unless the architecture explicitly defines it.

## 8. Main-thread waits

Find hidden waits:

- awaiting a worker response inside the frame
- polling a ready flag until completion
- blocking on a buffer slot
- serial command generation that starts too late
- applying a large result payload just before render
- waiting for physics even when the rendered state could be one tick delayed

Measure wait separately from step and transfer. A worker can be fast while the main thread still misses because results arrive at the wrong point in the frame.

## 9. Worker migration experiment

Before full migration, build the smallest representative prototype:

1. Record a command tape and body-change density from the current simulation.
2. Replay equivalent work in a worker.
3. Measure step, encode, queue, transfer, apply, result age, and critical-path overlap.
4. Test representative, stress, and spawn scenarios.
5. Test tab suspend/resume and backlog.
6. Verify gameplay digest and event ordering.
7. Compare against the current topology.

Only proceed when the measured objective—not architectural fashion—wins.

### Migration action example

```yaml
action:
  change: Move authoritative Rapier stepping from main thread to a dedicated worker using batched typed-array commands and double-buffered changed-body results.
  subsystem: handoff
  trade: architecture_change
  expected_gain_basis: measured prototype
  prediction: main update+physics p95 falls below 8 ms while handoff+apply stays below 1.5 ms and result age remains <= 1 tick
  risk: high
  semantic_surface: command order, event order, body identity, interpolation, pause/resume, teardown
  rollback_unit: retain current main-thread adapter behind the same physics interface
```

## 10. Spawn/despawn and structural events

Separate high-frequency state from structural changes.

- batch spawns/removals per tick
- preserve deterministic order
- assign stable IDs before sending commands
- return creation success/failure and generation
- prevent result records from resurrecting removed/reused entities
- measure buffer growth and first-contact bursts
- do not pool indefinitely without a bounded policy

## 11. Worker lifecycle

Test:

- startup/WASM initialization
- ready handshake and version/schema compatibility
- normal teardown
- worker crash/error
- page visibility loss and resume
- renderer/context/device loss coordination
- hot reload or scene reload
- outstanding transferred buffers
- Rapier world/event queue free
- message listener removal

A terminated worker does not automatically prove all main-thread references, buffers, or callbacks were released.

## 12. Worker acceptance matrix

```yaml
worker_acceptance:
  step_p95_p99:
  command_encode_p95:
  command_bytes_per_tick:
  queue_depth_p95_max:
  result_marshal_transfer_p95:
  main_apply_p95:
  synchronization_wait_p95:
  result_age_ticks_p95:
  late_tick_rate:
  dropped_or_coalesced_commands:
  changed_body_ratio:
  replay_digest:
  event_order_assertions:
  suspend_resume_backlog:
  teardown_plateau:
```

A worker change fails when it merely relocates time, increases latency/backlog, or changes authoritative outcomes without an authorized trade.

