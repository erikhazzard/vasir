# Director Layer Reference

Always evaluate the director layer. Many games feel intelligent because the system controls pacing, pressure, spawn timing, encounter composition, bot population, resource flow, or difficulty—not because each agent is individually brilliant.

## When director AI is needed

Use or evaluate a director when the design depends on:

```text
Spawn timing or placement
Encounter pacing
Difficulty curves
Comeback/rubber-band behavior
Resource drops
Population management
Squad composition
Offscreen simulation
Mission beats
Narrative intensity
Arena pressure
Objective pressure
Player onboarding
```

## Agent vs director responsibilities

Use this split:

```text
Agent AI owns local perception, movement, tactics, execution, and personality.
Director AI owns global pacing, pressure, spawn/composition, difficulty, and experience shaping.
```

Example:

```text
Bad: each enemy independently decides to swarm the player, causing unfair dogpiles.
Good: the director caps active pressure, assigns only two enemies to push, and lets others reposition or posture.
```

## Director contract

Every director design should specify:

```text
Responsibilities:
Inputs:
Outputs:
Player-state model:
Threat/intensity model:
Spawn/composition rules:
Difficulty rules:
Fairness constraints:
Rubber-band constraints:
Cooldowns:
Hysteresis:
Offscreen simulation rules:
Tuning knobs:
Debug views:
Scenario tests:
```

## Common director inputs

```text
Player health/stress/success streak
Player deaths/failures
Player position and velocity
Objective progress
Time since last threat
Time since last reward
Agent population
Territory control
Score delta
Economy/resource state
Skill estimate
Recent exploit patterns
Network/multiplayer constraints
```

## Common director outputs

```text
Spawn agent type X at candidate region Y
Throttle active attackers
Raise/lower pressure budget
Trigger retreat/reposition behavior
Adjust bot personality mix
Open/close resource opportunity
Schedule tutorial hint
Change offscreen simulation fidelity
Queue encounter phase
```

## Intensity model

A simple director can track intensity:

```text
intensity =
    damage_pressure
  + enemy_count_pressure
  + objective_pressure
  + proximity_pressure
  - player_recovery_opportunity
  - recent_success_relief
```

Use hysteresis so the director does not oscillate.

## Fairness constraints

Director fairness rules should be explicit.

```text
Do not spawn threats in impossible-to-read locations.
Do not spawn directly behind the player unless that is a known, telegraphed rule.
Do not increase pressure immediately after failure unless the fantasy demands it.
Do not secretly invalidate learned counterplay.
Do not rubber-band in a way that players can obviously detect as cheating.
Do not give bots information that violates multiplayer fairness.
```

## Rubber-banding rules

Rubber-banding is not forbidden. Invisible dishonest rubber-banding is risky.

Better rubber-banding:

```text
Adjust pressure budgets gradually.
Change bot risk tolerance, not impossible physics.
Expose comeback mechanics diegetically.
Use resource opportunities rather than enemy sabotage.
Throttle enemy coordination when player is overwhelmed.
```

Worse rubber-banding:

```text
Teleporting opponents.
Impossible acceleration.
Perfect offscreen interception.
Spawning unavoidable threats.
Changing rules without player-readable cause.
```

## Director pseudocode pattern

```text
every director_tick:
    read player_state, objective_state, agent_state
    intensity = estimate_current_intensity()
    target = target_intensity_for_phase_and_difficulty()

    if intensity < target - hysteresis:
        increase_pressure_with_fair_options()
    else if intensity > target + hysteresis:
        decrease_pressure_or_add_recovery()

    enforce_population_caps()
    enforce_spawn_fairness()
    update_debug_intensity_graph()
```

## Director debug views

```text
Current intensity vs target intensity
Pressure budget allocation
Active attacker count
Spawn candidate scores
Recent director decisions
Suppression/cooldown timers
Difficulty state
Fairness veto reasons
```

## Director tests

```text
Spawn fairness test: no spawn inside forbidden zones or unreadable angles.
Pressure cap test: active attackers never exceed budget.
Recovery test: after player failure, recovery window appears.
Rubber-band detectability test: no impossible physics or obvious cheating.
Stress test: high agent count does not break director decisions.
Replay test: same seed produces same director outputs.
```
