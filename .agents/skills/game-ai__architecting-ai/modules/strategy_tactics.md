# Module: Strategy / Tactical AI

Use for RTS, tactics, squad command, tower defense, turn-based tactics, autobattlers, tactical RPGs, and strategic map control.

## Player experience target

Strategic AI should create understandable plans, pressure, adaptation, and exploitable personality. It should not feel omniscient unless the game explicitly allows cheating AI.

## Core primitives

```text
Safety: unit survival, base defense, retreat path, supply, formation integrity.
Progress: economy, tech, map control, objective capture, damage to enemy plan.
Threat: enemy army, fog uncertainty, timing attack, flank, economy lead, tech mismatch.
Opportunity: undefended expansion, overextension, isolated unit, tech window, map objective.
Commitment: build order, production queue, army movement, cooldown, attack timing.
Information: scouting data, fog of war, stale sightings, inferred enemy composition.
Coordination: role assignment, formation, focus fire, support timing, retreat threshold.
Fairness: no perfect map knowledge unless explicit; cheating must be masked or declared.
```

## Common architecture

Recommended defaults:

```text
Strategic layer: HTN/GOAP/scripted build plans + utility goal selection.
Tactical layer: influence maps/tactical position selection + utility.
Unit layer: BT/FSM for execution.
Director layer: difficulty, pacing, spawn/economy tuning if applicable.
```

## Layering

```text
Strategic AI: what plan are we pursuing?
Operational AI: where do groups move and what objectives matter?
Tactical AI: how do units fight locally?
Execution AI: how does each unit move, attack, and recover?
```

## Hard invariants

```text
Never command impossible actions.
Never use hidden information unless allowed by difficulty/fairness policy.
Never strand units without fallback if retreat is possible.
Never violate economy/production rules.
Never exceed per-frame planning budget.
```

## Influence map layers

```text
Enemy threat
Ally strength
Objective value
Resource value
Vision/scouting confidence
Path risk
Retreat safety
Chokepoint control
Expansion value
```

## Pseudocode

```text
every strategic_tick:
    beliefs = update_belief_state_from_scouting_and_memory()
    goals = score_goals(beliefs, economy, difficulty_profile)
    strategic_goal = select_with_commitment(goals)

    plan = decompose_or_repair_plan(strategic_goal, beliefs)
    assign_operational_tasks(plan)


every tactical_tick:
    update_influence_maps()
    for squad in squads:
        squad_order = select_tactical_order(squad, maps, strategic_goal)
        assign_unit_roles(squad, squad_order)
```

## Difficulty/personality

```text
Easy: incomplete scouting inference, slower plan repair, weaker timing, fewer simultaneous fronts.
Normal: coherent plans, readable adaptations, modest scouting.
Hard: better scouting inference, sharper timing windows, stronger tactical positioning.
Nightmare: high optimization, but visible/fair fog rules unless explicit cheat mode.
```

Personalities:

```text
Boomer/economist: high expansion and tech value.
Rusher: high early pressure, low greed.
Turtler: high defense/chokepoint value.
Harasser: high mobility/exploit value.
Balanced: adapts but less extreme.
```

## Debug views

```text
Belief state vs truth
Strategic goal scores
Current plan and decomposition
Influence map layers
Squad assignments
Fog-of-war confidence
Economy/resource priorities
Cheat/omniscience flags
```

## Tests

```text
Fog fairness test.
Build-order commitment test.
Plan repair test.
Retreat threshold test.
Influence map sanity test.
Multi-front pressure test.
Economy rule integrity test.
Replay determinism test.
```
