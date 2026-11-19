# Runtime Contract Notes (Non-Normative)

## WebXR / Three.js

- Held-object follow wants **grip-space** semantics when available.
- Remote aim, telekinesis targeting, and highlight direction want **target-ray** semantics.
- Do not assume `gripSpace` exists on every input source.
- Do not assume `linearVelocity` / `angularVelocity` exists on every pose.
- Treat controller disconnect, hand-tracking loss, temporary invalid pose, and degraded confidence as normal cases.
- Sample XR poses from the active `XRFrame` inside `renderer.setAnimationLoop`.
- Do not treat display prediction as simulation time.

### Hand-tracking fallback pattern

If controllers are absent and hand tracking is active:
- define a synthetic grab frame from wrist + palm / metacarpal joints or an authored palm frame
- state whether pinch state, palm normal, and thumb-index geometry drive acquisition
- keep the construction deterministic and tick-stamped like controller poses

## Worker handoff

Default pattern:
- main thread samples XR once per render frame
- write pose packet into preallocated buffer
- stamp packet with sequence id and render-frame id
- worker consumes complete packets only
- physics tick selects packet deterministically

A minimal pose packet usually contains:
- hand id
- source type: controller / hand-tracking
- grip pose
- aim pose
- optional native linear / angular velocity
- validity / confidence flags
- buttons / grip state / pinch state
- sequence id

## Rapier

- A held object stays dynamic by default.
- If using hand proxies, state whether they are kinematic position-based or kinematic velocity-based.
- Prefer convex or compound dynamic colliders.
- Scope extra solver iterations to the engaged object set, not the whole world.
- Use CCD on fast throws, thin weapons, and penetration-capable objects when needed.
- Use sleeping aggressively for idle background bodies, but wake deterministically on interaction.

## Deterministic ordering

Stable ordering means:
- stable integer entity ids
- deterministic candidate scoring
- deterministic tie-breakers
- deterministic add/remove queues
- deterministic packet selection
- deterministic replay serialization

When in doubt, sort by explicit priority, then stable id.
