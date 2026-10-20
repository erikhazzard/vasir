# Physics, workers, and network presentation

Use the actual physics/network implementation. Rapier examples below describe its
concepts; do not assume the project uses Rapier or substitute Unity component names.

## 1. Keep physics proportional to gameplay

Use boxes, spheres, and capsules as the default collision proxies. Decorative scenery
gets no collision unless interaction requires it. Players get the minimum useful body/
hand/head proxies—not a rigid body or collider for every bone, finger, or clothing mesh.
Separate visual hierarchy from collision representation.

Keep fixed scenery fixed. A collider does not necessarily need its own dynamic rigid
body; in Rapier, standalone colliders are supported. Use kinematic bodies for deliberately
controlled moving objects where appropriate and dynamic bodies only when response to
forces/contacts is part of gameplay. Do not move nominally fixed colliders every frame
and continue budgeting them as untouched scenery. [S25, S26]

**Mesh collider policy:** no automatic collider-from-render-mesh workflow; no moving
concave triangle-mesh bodies by default. Prefer primitives, then simple convex proxies
where geometry requires them. Static terrain/buildings can justify an explicit simplified
trimesh/heightfield exception. Rapier supports these; they are not universally invalid.
Compare against the alternative: replacing one reasonable static mesh with hundreds of
primitive proxies can increase cost and worsen contact behavior. [S25]

Measure active/moving bodies, collider shapes, contact pairs, solver work, query counts,
CCD, and shape updates—not only total scene collider count. Sleeping, untouched objects
are different from objects continuously awakened or teleported. Restrict collision/query
groups to meaningful pairs and request events only where consumed. Use CCD selectively
where tunneling matters; disabling necessary CCD is a correctness change. [S25, S26]

Avoid reconstructing colliders, regenerating triangle meshes, or rebuilding broad-phase
state because a visual mesh changed. Cache appropriately. Profile repeated player probes,
raycasts, and scene queries separately; a query-heavy game may have little solver cost.
Use collision proxies for interaction rather than exact skinned-triangle tests unless
that precision is a stated requirement. [S2]

## 2. Preserve simulation correctness when reducing CPU work

Rendering/animation LOD must not silently remove required collision or authority checks.
Do not reduce fixed-step frequency or solver iterations merely to improve a graph.
Those changes affect contacts, stability, feel, and replay/determinism contracts; treat
them as explicit behavior changes and validate the affected interactions.

Preserve an existing deterministic worker simulation. For new frame-critical simulation,
favor worker ownership when practical, but verify handoff cost. Use bounded buffers and
compact snapshots; avoid per-object messages, full-world serialization, synchronous
main-thread waits, or a growing snapshot backlog. Keep message age and interpolation
latency visible. More threads are not a substitute for doing less unnecessary work.

Respect ownership of physics state. Skip cosmetic work when offscreen; do not skip
simulation work solely because the camera cannot see it. Keep existing replay/network
semantics intact when staggering work.

## 3. Separate the clocks

| Clock | Default policy |
|---|---|
| Local head/hand input and presentation | Current XR frame; never throttled to the network rate. |
| Gameplay simulation / authority | Existing fixed-step and authority contract; not dictated by our replication cap. |
| Ordinary transform replication | At most 30 state updates/second; less where relevance/change permits. |
| Remote presentation | Smooth frame-rate interpolation between buffered state; no packet-arrival snapping. |
| Noncritical remote body IK/animation | Lower/staggered rates according to visible importance and acceptable target error. |
| Discrete gameplay events | Deliver promptly according to their semantics; not silently dropped by a state-update throttle. |

The 30 Hz ceiling is our house rule for ordinary replicated state, not a universal
latency optimum. Suggested starting tiers: 20–30 Hz for nearby important motion;
10–15 Hz for routine nearby objects; 2–5 Hz for low-value distant changes;
event/change-driven sends for stationary objects. Treat these as experiments, not
measured requirements. High-speed gameplay may justify a named exception.

Replicate root/locomotion plus head and hands for remote avatars, with compact grip or
expression data where needed. Do not replicate the full skeleton by default. Reconstruct body
presentation cheaply and keep local-player controllers, sensing, and full-body physics
out of ordinary remote representations.

Use interest management, change thresholds, batching, and quantization within an explicit
error budget. Timestamp and sequence state. Choose interpolation buffering from actual
jitter; bound extrapolation and handle teleports, ownership transfers, and stale state
explicitly. Preserve critical reliable events and any periodic recovery/full-state
mechanism needed by the protocol.

On an ordered reliable transport, queued stale poses can still arrive late. Coalesce or
skip superseded *unsent* state, bound outbound queues, and respect backpressure; do not
claim a WebSocket can unsend bytes already transmitted. Do not redesign the transport
without evidence that it is the limiting issue.

## 4. Validation that earns its cost

Exercise the affected cases: walking/stairs, grabbing, body contacts, thrown/high-speed
objects where present, remote hand alignment, joins/leaves, teleports, and jitter/loss
behavior appropriate to the transport. Check both active gameplay and crowded idle scenes.

Report physics CPU, main-thread handoff work, active-pair/query counts, bytes/updates,
and state age as available. A lower send rate is not a win if hands become visibly stale;
a smaller collider count is not a win if contacts become unreliable. Reuse existing
interactive/E2E scenarios. Add a narrow isolated check only for a named correctness gap.

Source keys: [primary sources](mobile-xr-sources.md).
