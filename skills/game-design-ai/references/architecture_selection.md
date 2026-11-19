# Architecture Selection Reference

Architecture is a production tradeoff, not a prestige choice. Select the simplest system that expresses the desired behavior, supports designer iteration, fits runtime budget, and exposes good debug information.

## Quick decision matrix

| Problem shape | Prefer | Why | Watch out for |
|---|---|---|---|
| Few clear modes | FSM/HFSM | Simple, explicit, cheap | Transition explosion |
| Sequencing and fallback | Behavior Tree | Readable, modular, toolable | Giant trees, hidden state, brittle decorators |
| Continuous tradeoffs | Utility AI | Smooth risk/reward decisions | Bad curves, score thrashing, poor normalization |
| Many goal/action combinations | GOAP | Declarative action composition | Hard debugging, world-state complexity |
| Designer-shaped long tasks | HTN | Controlled task decomposition | Authoring burden, rigid methods |
| Spatial pressure/positioning | Influence maps / tactical position selection | Strong for movement, territory, cover, group pressure | Cost, stale maps, misleading scores |
| Small bounded adversarial lookahead | Minimax/MCTS | Strong for board/tactical lookahead | Branching cost, less designer control |
| Pacing/spawn/difficulty | Director AI | Shapes experience globally | Can feel unfair if hidden cheating is visible |
| Learning from many simulations | ML/RL | Can discover strong policies | Training cost, opacity, determinism, tuning/fun risk |
| Narrative/social language | LLM-assisted authoring or constrained generation | Expressive text/spec generation | Runtime safety, latency, cost, moderation, determinism |

## Default runtime policy

Default to deterministic classical runtime AI. Use LLMs offline for:

- writing specs,
- generating variants,
- producing test scenarios,
- summarizing telemetry,
- suggesting tuning changes,
- creating dialogue/content drafts subject to validation.

Use runtime LLMs only if the game explicitly needs open-ended language or behavior generation and can handle safety, latency, cost, moderation, determinism, and fallback requirements.

## FSM / HFSM

Use when:

- states are few and stable,
- transitions are obvious,
- behavior is mode-based,
- cheap runtime and easy debugging matter.

Good for:

```text
Idle → Patrol → Alert → Chase → Attack → Retreat
InsideTerritory → Expanding → Returning → Hunting
```

Avoid when every new behavior adds many cross-state transitions.

## Behavior Tree

Use when:

- behavior is naturally expressed as sequences, selectors, decorators, services, and leaf tasks,
- designers need readable flow,
- fallback behavior matters,
- interruption is manageable.

Good pattern:

```text
Root
  Selector
    Sequence: IfCriticalDanger → Escape
    Sequence: IfHasClearAttack → Telegraph → Attack
    Sequence: IfNeedsBetterPosition → MoveToTacticalPosition
    Sequence: PatrolOrIdle
```

Avoid using BTs to encode large amounts of continuous tactical scoring. Put that scoring in services or utility selectors.

## Utility AI

Use when:

- decisions are continuous risk/reward tradeoffs,
- multiple actions are plausible,
- personality/difficulty should be weight-driven,
- hard yes/no logic would feel brittle.

Required design elements:

```text
Candidate actions
Input considerations
Normalization
Response curves
Weights
Hard vetoes
Hysteresis/commitment
Tie-breaking/randomness
Debug score readout
```

Avoid raw weighted sums with unnormalized inputs. Most utility failures are bad inputs, bad curves, or missing commitment.

## GOAP

Use when:

- the agent has multiple goals,
- many action sequences can satisfy goals,
- hand-authoring all transitions would explode,
- emergent action ordering is desirable.

Required design elements:

```text
World-state facts
Goals
Actions with preconditions/effects/costs
Planner budget
Plan invalidation rules
Fallback behavior
Debug plan trace
```

Avoid when world state is too noisy, actions are too many, or designers cannot understand planner choices.

## HTN

Use when:

- high-level tasks need decomposition,
- designers know the valid behavior shapes,
- long-horizon behavior matters,
- control matters more than open-ended emergence.

Required design elements:

```text
Compound tasks
Methods
Primitive tasks
Preconditions
Decomposition priority
Plan repair/interruption
Debug decomposition trace
```

Good for squads, missions, routines, social/narrative beats, and long-form NPC behavior.

## Influence maps and tactical position selection

Use when location choice is central.

Required design elements:

```text
Candidate generation
Hard filters
Score layers
Aggregation method
Cache/update rate
Debug map overlays
Fallback destination
```

Good for:

- cover selection,
- territory pressure,
- team spacing,
- danger fields,
- chase/escape,
- sports positioning,
- RTS map control.

## Director AI

Use when experience depends on pacing, spawns, pressure, composition, rubber-banding, or resource flow. Always evaluate it even if the final design uses none.

Good director responsibilities:

```text
Spawn placement
Threat pacing
Encounter composition
Difficulty escalation
Bot population management
Resource drop timing
Objective pressure
Offscreen simulation fidelity
Comeback/rubber-band rules
```

## Hybrid patterns

Common strong hybrids:

```text
HFSM for major modes + utility for local action choice.
Behavior tree for sequencing + utility selector for tactical decisions.
HTN for long-horizon task decomposition + BT for execution.
GOAP for plan generation + utility for goal selection.
Influence maps for spatial scoring + any decision model for choosing intent.
Director AI for pacing + simple agents for local believability.
```

## Architecture selection output

Always include:

```text
Recommended architecture:
Problem shape:
Why this fits:
Alternatives considered:
Why alternatives lose:
Hybrid layers:
Runtime budget:
Debug story:
Tuning story:
Determinism story:
```
