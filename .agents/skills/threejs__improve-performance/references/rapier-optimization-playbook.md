# Rapier Optimization Playbook

This file is non-authoritative supporting context for the skill. The main `SKILL.md` is authoritative.

## Physics cost centers

Physics step cost is usually dominated by some combination of:

- too many active bodies
- too many colliders
- bad collider choices
- too many potential pairs in the broadphase
- too many actual contacts in the narrowphase
- too much solver work
- too much CCD
- too many events / hooks / scene queries
- too much worker handoff / render sync

## High-leverage Rapier levers

### Sleeping
Sleeping is not an optional polish detail. It is a core perf feature.
Audit:
- how many bodies are awake
- what wakes them unnecessarily
- whether sleeping bodies are still being synced/render-updated anyway

### Active-body sync
Do not pull every rigid-body transform every frame.
Sync active or changed bodies only.

### Collider strategy
Prefer:
- fixed colliders for static world
- simple primitives where possible
- convex hulls or compound colliders for hot moving bodies

Avoid detailed scene-mesh colliders on many moving bodies.

### Collision groups and solver groups
Prune useless interactions early.
If two systems never need contact resolution, do not let them reach the solver.

### Solver work
If only a few bodies need more rigidity, use local additional solver iterations there.
Do not globally raise solver iterations unless the whole simulation needs it.

### CCD
CCD is for fast/small/high-value tunneling cases.
Do not enable it globally.
Soft CCD can be cheaper than full CCD, but large prediction distances can still hurt broadphase work.

### Contact skin
A small contact skin can improve stability and sometimes performance, but it creates a visible gap.
Only use it where that gap is acceptable or hidden by visuals.

### Events and hooks
Only enable collision/contact-force events where gameplay consumes them.
Global event reporting is easy to forget and expensive to carry.

### Scene queries
Count them.
Ray casts, shape casts, and overlap checks can quietly become a major CPU cost if done per-agent or per-bullet without budgets.

## Spawn/despawn spikes

Common spike causes:
- creating many bodies and colliders in one tick
- generating complex collider shapes at runtime
- enabling many bodies at once inside dense contact zones
- building large command/result arrays on the fly

Fixes:
- pool bodies/entities where feasible
- stage activation over multiple ticks
- prebuild collider descriptors or shape handles
- batch creation and removal in stable queues
