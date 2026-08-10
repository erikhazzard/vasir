# Baseline-Clone Rebuild Specification

The rebuild spec is a validated observational contract, not a claim to have recovered source code. It must be precise enough that two implementers make materially compatible systems and that a clone can be checked against the supplied footage.

## Fidelity target

Define fidelity in layers:

- **Trace exact:** event order, visible values, timings, states, and outcomes that the footage establishes tightly.
- **Bounded:** behavior must remain within a measured interval or relation.
- **Functional:** recreate the visible player-facing effect when the hidden implementation is unknowable.
- **Reference implementation:** selected parsimonious behavior among observationally equivalent models.
- **Free:** unconstrained by the footage and non-load-bearing for the observed experience.

The spec README states which layer applies to every major subsystem.

## Required top-level structure

`spec/rebuild-spec.json` contains:

```text
schema_version
spec_id
source_context
fidelity_target
global_semantics
entities
state_machines
mechanics
content
presentation
unknowns
validation_fixtures
```

Large projects may split arrays into `spec/systems/*.json`; `rebuild-spec.json` remains the index and all references remain resolvable.

## Global semantics

Define before subsystem values:

### Clock domains

For each clock:

- ID and unit;
- source of advancement;
- fixed/variable/resampled timestep assumption;
- pause, slow-motion, hit-stop, menu, cinematic, and death behavior;
- order relative to state updates, physics, damage, spawning, UI, and presentation.

If the simulation tick is unidentifiable, choose a reference timestep and state that fixtures validate outputs, not historical internals.

### Coordinate systems

For each system:

- ID, origin, axes, handedness, unit, scale;
- mapping to source pixels or landmarks;
- camera transform and validity interval;
- uncertainty.

### Update and event order

Specify observable ordering, for example:

```text
read action state → advance timers → choose AI actions → integrate movement → resolve collision
→ generate hits → apply damage/status → process death/rewards → update progression/spawns
→ update camera → render feedback/UI
```

Do not invent exact order where footage cannot distinguish it. Mark partial order constraints instead:

```text
hit-stop begins no later than target flash; HP change appears within 1 source frame of the flash;
death reward occurs after HP reaches zero and before the next level-up menu.
```

### Numeric semantics

Define:

- precision assumptions;
- rounding mode and stage;
- min/max/caps/floors;
- stacking group order;
- random-number policy;
- display formatting separately from internal value.

## Spec value contract

Every configurable value uses the same structure:

```json
{
  "value": 40,
  "unit": "display_damage_per_hit",
  "range": {"min": 39, "max": 40},
  "uncertainty_basis": "one-pixel glyph ambiguity plus display rounding",
  "coordinate_system": null,
  "clock_domain": null,
  "support": "supported",
  "implementation_basis": "reference_implementation",
  "claim_ids": ["clm_damage_004"],
  "model_id": "mdl_damage_formula_001",
  "validity_scope": {"weapon": "weapon_01", "target_class": "enemy_basic", "era": "upgrade_2"},
  "notes": "Additive and rounded multiplicative models are observationally equivalent in the supplied trace."
}
```

Omit fields only when semantically inapplicable, not because the information was forgotten.

## Entities and components

Each entity defines:

- stable ID, role, visible identity cues;
- lifecycle: spawn, active, hidden/offscreen, disabled, death/despawn;
- observable components and parameters;
- state-machine refs;
- collider/hitbox approximations and coordinate system;
- presentation hooks;
- content variants and unknown fields.

Prefer composable components over duplicating whole entity definitions when the footage supports shared behavior.

## State machines

Each transition includes:

- source state(s), target state(s);
- trigger/event;
- guard/preconditions;
- effects;
- priority and interrupt rules;
- clock domain and timing;
- evidence/claim/model IDs;
- support and implementation basis.

Use orthogonal state machines when locomotion, attack, status, and interaction can overlap. Do not collapse unseen transitions into a generic “other.”

## Mechanics

Each mechanic defines:

- inputs and outputs;
- formula or algorithm/pseudocode;
- parameters using the spec-value contract;
- state/clock dependencies;
- update/order constraints;
- stacking/rounding/caps;
- RNG candidates and reference policy;
- observable side effects;
- evidence/claims/models;
- alternatives and unknowns.

Categories include movement, physics, collision, camera, combat, status, interaction, resources, progression, items, upgrades, AI, spawning, objectives, scoring, session/meta, UI, audio/VFX, and genre-specific systems.

## Content

Inventory every visible content item needed for the baseline:

- entity/enemy/unit/character classes;
- weapons/abilities/moves/cards/items/upgrades;
- levels/rooms/tracks/waves/objectives;
- UI states and text;
- VFX/audio cue classes;
- relationships, prerequisites, rarity/tier, and observed variants.

A content item observed once remains `n=1`; the clone can include it without converting its occurrence into a probability law.

## Presentation

The baseline clone must encode visible feel, not only arithmetic:

- camera behavior and impulses;
- animation states and measured timing;
- VFX event graph, onset, duration, layering, scale, color relationships;
- audio cue timing, class, and synchronization where audible;
- hit stop/slow motion;
- UI feedback, number formatting, transitions, menu pause behavior;
- source-resolution-independent layout rules inferred from stable proportions.

Do not extract or redistribute original assets. Specify observable properties and timing needed for fidelity.

## Unknowns and alternatives

Every unresolved field records:

- unknown taxonomy;
- why the footage cannot decide;
- viable alternatives;
- clone consequence;
- selected reference implementation, if required;
- parameterization point for later replacement.

Do not hide ambiguity in comments or README prose only.

## Validation fixtures

A fixture is a source-backed scenario, not a unit test fabricated from the selected model.

Required fields:

- fixture ID and purpose;
- source interval and evidence IDs;
- preconditions and observable initial state;
- input/action trace if visible, otherwise `unknown`;
- expected ordered events;
- expected values/ranges;
- expected screen/world positions or relationships;
- timing windows and clock domains;
- tolerances and uncertainty basis;
- claims/models exercised;
- negative constraints;
- limitations.

Example:

```json
{
  "fixture_id": "fx_hit_basic_001",
  "source_interval": {"source_id": "src_001", "start_pts_s": 32.100, "end_pts_s": 32.650},
  "preconditions": ["weapon_01 ready", "enemy_basic alive", "no pause or slow motion"],
  "input_trace": "not_visible",
  "expected_events": [
    {"event": "attack_visual_onset", "window_ms": [0, 34]},
    {"event": "target_flash", "window_ms": [150, 184]},
    {"event": "hp_loss_visible", "relative_to": "target_flash", "window_ms": [0, 34]},
    {"event": "damage_number", "value_range": [39, 40]}
  ],
  "negative_constraints": ["no second hit before 300 ms"],
  "tolerance_basis": "30 unique fps source plus one-frame effect-onset ambiguity"
}
```

## Validation levels

1. **Schema validation:** all JSON and references are valid.
2. **Semantic validation:** units, clocks, coordinate systems, operation order, and unknowns are defined.
3. **Fixture validation:** an implementation reproduces selected source scenarios within tolerance.
4. **Cross-system reconciliation:** damage/HP/kill, economy/inventory, spawn/population, movement/camera, and pause/timer systems agree.
5. **Presentation validation:** key feedback stacks and UI transitions match visible ordering and cadence.

A spec that passes only schema validation is machine-readable, not clone-ready.

## Spec README

`spec/README.md` must state:

- exact fidelity target;
- source files and hashes;
- supported game/run scope;
- selected reference implementations and why;
- observationally equivalent and unidentifiable systems;
- fixture coverage;
- known drift risks;
- how to replace provisional parameters without breaking IDs;
- what the clone must not claim about the original game.
