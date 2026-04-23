# Module: Simulation / Economy / Management AI

Use for city builders, management games, progression systems, economies, NPC workers, market agents, colony sims, tycoon games, crafting/resource systems, and systemic simulations.

## Player experience target

Simulation AI should create understandable systemic behavior, meaningful tradeoffs, recoverable failures, and long-term texture. It should be legible enough for players to form strategies, not a black box that feels arbitrary.

## Core primitives

```text
Safety: avoiding collapse, starvation, bankruptcy, deadlock, softlock, or runaway exploit.
Progress: production, satisfaction, growth, objective completion, resource flow.
Threat: bottleneck, shortage, oversupply, exploit, player confusion, runaway feedback loop.
Opportunity: surplus conversion, market gap, worker assignment, upgrade timing, trade route.
Commitment: build queue, route assignment, contract, production cycle, cooldown, debt.
Resource advantage: stockpile, throughput, margin, conversion efficiency, redundancy.
Information: player-visible state, hidden simulation state, forecast confidence.
Fairness: players should understand why the system changed or failed.
```

## Common architecture

Recommended defaults:

```text
Rule-based systems + utility/resource scoring + director/economy manager + simulation tests/autoplay.
```

Use planning for multi-step agent routines only when local utility/rules cannot express the behavior.

## Hard invariants

```text
Never create unrecoverable deadlock unless it is an intentional fail state.
Never silently violate economy rules.
Never hide critical causal information from the player.
Never allow unbounded runaway growth unless designed.
Never exceed simulation budget during large populations.
```

## Utility considerations

```text
AssignWorker:
  + bottleneck_reduction
  + skill_match
  + objective_priority
  - travel_time
  - disruption_cost

ProduceResource:
  + demand
  + margin/value
  + shortage_pressure
  - input_scarcity
  - storage_overflow

AdjustEconomyPressure:
  + player_success_streak
  + resource_surplus
  - confusion_risk
  - recovery_need
```

## Director/economy manager layer

```text
Monitors resource flows.
Detects bottlenecks and runaway loops.
Adjusts demand/supply pressure where allowed.
Schedules tutorial or warning beats.
Controls pacing of unlocks and challenges.
Runs autoplay simulations for progression balance.
```

## Pseudocode

```text
every economy_tick:
    flows = measure_resource_flows()
    bottlenecks = detect_bottlenecks(flows)
    exploit_signals = detect_runaway_or_loop_exploit(flows)

    if hard_invariant_at_risk:
        apply_recovery_or_warning()

    for agent in worker_agents:
        task = utility_select(available_tasks(agent), economy_context, profile)
        assign_if_valid(task)

    director.adjust_pressure_with_fairness_constraints(flows, player_progress)
```

## Difficulty/personality

```text
Easy: more forgiving shortages, slower decay, more warnings, stronger recovery tools.
Normal: balanced resource pressure and clear causal feedback.
Hard: tighter margins, faster bottlenecks, fewer automatic recoveries.
Nightmare: optimization challenge, but causal information remains legible.
```

## Debug views

```text
Resource flow graph
Bottleneck list
Worker assignment scores
Demand/supply curves
Runaway exploit detector
Player-visible vs hidden state
Director pressure state
```

## Tests

```text
Long-run stability test.
Deadlock/softlock test.
Runaway exploit test.
Bottleneck readability test.
Autoplay progression test.
Save/load determinism test.
High-population budget test.
```
