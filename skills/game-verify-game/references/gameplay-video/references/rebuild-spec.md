# Observational Reconstruction Specification

Read this only when the user explicitly asks for an implementable clone, rebuild, reverse engineering, systems specification, or fixtures.

The reconstruction is an observational contract, not a claim to have recovered source code. It must be precise enough that two implementers make materially compatible player-facing systems and that the result can be checked against the supplied footage.

## Fidelity target

Classify each material subsystem:

- **Trace exact:** reproduce event order, visible values, timing, state, and outcome established tightly by the footage.
- **Bounded:** remain within a measured interval or relation.
- **Functional:** recreate the visible player-facing effect when hidden implementation is unknowable.
- **Baseline choice:** use a stated runnable behavior among observationally equivalent models.
- **Free:** unconstrained by the footage and not load-bearing for the observed experience.

State the coverage boundary and explicit non-claims about the original implementation.

## Default artifact

Start from `templates/reconstruction-spec.md`. Markdown is the default when no named machine consumer exists. If the user or consuming repository requires JSON, YAML, code, or another shape, use that native format without inventing a parallel universal schema.

Separate four things throughout:

1. source-supported behavior;
2. candidate original models;
3. explicit baseline implementation choices;
4. observable fixtures and tolerances.

## Global semantics

Define these before subsystem values.

### Clock domains

For each relevant clock, state:

- unit and source of advancement;
- fixed, variable, or chosen reference timestep;
- pause, slow-motion, hit-stop, menu, cinematic, and death behavior;
- observable ordering relative to state updates, physics, damage, spawning, UI, and presentation.

If the simulation tick is unidentifiable, choose a reference timestep only when implementation needs one. Fixtures validate observable outputs, not historical internals.

### Coordinate systems

For each relevant space, state:

- origin, axes, unit, and scale;
- mapping to source pixels, viewport proportions, tiles, or landmarks;
- camera assumptions and validity interval;
- measurement uncertainty.

### Update and event order

Specify only ordering supported or required for a coherent baseline.

Example full order when evidence distinguishes it:

```text
read action state → advance timers → choose AI actions → integrate movement
→ resolve collision → generate hits → apply damage/status → process death/rewards
→ update progression/spawns → update camera → render feedback/UI
```

Use partial constraints when footage cannot distinguish the internals:

```text
target flash and visible HP change occur within one source frame;
death reward occurs after HP reaches zero and before the next upgrade menu.
```

### Numeric semantics

For material values, state:

- unit and denominator;
- precision assumption;
- rounding stage and mode;
- clamps, floors, caps, and stacking order;
- random policy;
- display formatting separately from the hidden value.

## System entries

Each material system or parameter records:

- name and player-facing role;
- evidence citations;
- status as observed, measured, modeled, or baseline choice;
- value/rule and unit;
- applicable clocks, coordinates, states, and scope;
- alternatives and uncertainty;
- rationale and extrapolation risk for a baseline choice.

Omit systems irrelevant to the requested reconstruction. Do not fill a universal category checklist merely because it exists.

## Entities and state

For relevant entities, define:

- visible identity cues and role;
- lifecycle: spawn, active, hidden/offscreen, disabled, death, and despawn;
- observable state and parameters;
- collision/hitbox approximation when supported;
- state transitions, guards, priority, interrupts, recovery, and timing;
- presentation hooks and observed variants.

Use orthogonal state dimensions when locomotion, attack, status, and interaction visibly overlap. Do not invent unseen transitions.

## Mechanics and content

For each relevant mechanic, define:

- inputs and observable outputs;
- formula, table, algorithm, or state rule;
- state and clock dependencies;
- ordering, stacking, rounding, caps, and RNG policy;
- visible side effects and feedback;
- candidate alternatives and unknowns.

Inventory only visible content needed for the requested baseline: actors, weapons, abilities, items, upgrades, levels, encounters, UI states, VFX/audio cue classes, and observed variants. An item observed once remains `n=1`; inclusion does not turn occurrence into a probability law.

## Presentation fidelity

Encode visible feel when it matters:

- camera behavior and impulses;
- animation states and measured timing;
- VFX onset, duration, layering, scale, and color relationships;
- audible cue timing and synchronization;
- hit stop or slow motion;
- UI feedback, number formatting, transitions, and menu pause behavior;
- source-resolution-independent layout relationships supported by stable proportions.

Do not extract or redistribute original assets. Describe the observable properties necessary for fidelity.

## Unknowns and alternatives

For every implementation-relevant unknown, state:

- why the supplied footage cannot decide;
- viable alternatives;
- observable consequence of choosing among them;
- baseline choice only if a runnable implementation requires it;
- replacement/configuration point when the choice may change later.

Keep an unresolved dimension configurable only when that preserves real ambiguity; do not add generic extension machinery for imagined needs.

## Observable fixtures

A fixture is a source-backed scenario, not a unit test fabricated from the selected model.

Record:

- source interval and purpose;
- preconditions/setup;
- player or system stimulus;
- expected event order, visible state, values/ranges, and timing windows;
- tolerances tied to source cadence and measurement uncertainty;
- negative constraints when opportunity is established;
- candidate-model fork exercised;
- known limitations.

Each major requested mechanic gets at least one fixture. Add a discriminating fixture for a high-impact model fork only when the supplied footage contains a condition on which the candidates diverge.

## Acceptance

Review the reconstruction at four layers:

1. **Semantic:** clocks, units, coordinates, ordering, states, uncertainty, and baseline choices are implementable.
2. **Fixture:** an implementation reproduces the source-backed scenarios within tolerance.
3. **Cross-system:** damage/HP/kills, economy/inventory, spawn/population, movement/camera, and pause/timer behavior reconcile where applicable.
4. **Presentation:** key feedback stacks and UI transitions preserve visible ordering and cadence.

A reconstruction can pass every fixture and still differ internally from the original. Call it observationally faithful within the declared coverage boundary, never source-code equivalent.
