# Observational reconstruction

## Scope and fidelity

- Supplied footage and exact intervals:
- Player-facing behavior to reproduce:
- Coverage boundary:
- Explicit non-claims about the original implementation:

## Global semantics

- Clock domains, pause/slow-motion/hit-stop behavior:
- Coordinate systems and mappings:
- Observable update/event ordering:
- Numeric precision, rounding, clamping, stacking, and display formatting:
- Randomness policy and what remains unidentifiable:

## Systems

For each material system, state:

- source-supported behavior and evidence citations;
- candidate original models;
- explicit baseline choice only where the implementation needs one;
- units, clocks, states, transitions, priorities, and side effects;
- alternatives, uncertainty, and extrapolation risk.

Cover only relevant entities, controls, movement, collision, camera, combat, AI, spawning, progression, economy, content, UI, VFX, audio, scoring, victory/failure, restart, and persistence.

## Observable fixtures

| Fixture | Source interval | Setup | Stimulus | Expected observable sequence/values | Tolerance | Model fork exercised |
|---|---|---|---|---|---|---|

Fixtures come from observed scenarios. They test player-visible behavior, not unknowable internal code structure.

## Unknowns and replacement points

| Unknown | Why footage cannot decide | Viable alternatives | Baseline choice, if required | How to replace it later |
|---|---|---|---|---|
