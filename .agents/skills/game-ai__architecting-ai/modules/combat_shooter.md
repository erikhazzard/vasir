# Module: Combat / Shooter AI

Use for shooters, action combat, melee enemies, bosses, squads, stealth enemies, and cover-based encounters.

## Player experience target

Combat AI should create readable pressure, tactical opportunity, and fair punishment. The player should believe enemies perceive, coordinate, fear exposure, exploit mistakes, and occasionally misjudge.

## Core primitives

```text
Safety: cover quality, exposure time, retreat route, health, suppression, distance band.
Progress: damage pressure, objective pressure, better angle, forced movement, resource drain.
Threat: player line of sight, aim cone, grenade radius, flank route, melee range, cooldown status.
Opportunity: exposed player, reload window, isolated target, flank angle, broken cover, low health.
Commitment: reload, vault, melee windup, grenade throw, flank route, peek timing, boss phase action.
Team advantage: crossfire, spacing, role assignment, active attacker budget, suppression support.
Information: last known position, confidence, sound event, decoy, fog/stealth uncertainty.
Fairness: no wallhacks, no instant snap, no unavoidable attack without telegraph.
```

## Common architecture

Recommended defaults:

```text
Individual enemy: BT/HFSM for combat sequencing + utility for tactical action choice.
Squad: director or squad coordinator assigns pressure roles.
Boss: phase script/HFSM + local utility + telegraphed commitments.
Stealth: perception/memory model + investigation state machine.
```

## Behavior modes/tasks

```text
Idle / Patrol
Investigate
AcquireTarget
TakeCover
Suppress
Flank
Advance
Retreat
Reload
Melee
ThrowGrenade
CallForHelp
SearchLastKnownPosition
BossPhaseAction
```

## Hard invariants

```text
Never shoot before target is perceived and reaction delay has elapsed.
Never shoot through non-wallbang cover unless game rules allow it.
Never attack before required telegraph.
Never select unreachable cover.
Never assign more active attackers than director pressure budget.
Never flank through forbidden or obviously suicidal route unless profile allows sacrifice.
```

## Utility considerations

```text
TakeCover:
  + exposure danger
  + low health
  + reload need
  + cover quality
  - distance to cover

Attack:
  + clear line of sight
  + target exposure
  + weapon effective range
  + role permission from director
  - recent attack saturation
  - fairness telegraph debt

Flank:
  + target fixation on ally
  + valid route quality
  + angle improvement
  - route danger
  - time away from objective

Retreat:
  + low health
  + suppression
  + no valid attack
  + safe retreat route
```

## Squad/director layer

```text
Assign roles: pusher, suppressor, flanker, guard, sniper, support.
Cap active attackers to avoid unfair dogpiles.
Stagger grenade/melee threats.
Create recovery windows after intense bursts.
Control reinforcements and spawn angles.
Prevent enemies from all choosing the same cover or route.
```

## Pseudocode

```text
every combat_tick:
    update_perception_with_delay(agent)
    update_last_known_target_position(agent)

    if critical_hard_rule_triggered(agent):
        execute_emergency_behavior()
        return

    if squad_director.exists:
        role = squad_director.get_role(agent)
    else:
        role = infer_local_role(agent)

    candidates = actions_allowed_by_role_and_state(role, agent)
    candidates = reject_unfair_or_illegal_actions(candidates)
    selected = utility_select(candidates, combat_context, agent.profile)

    execute_with_telegraph_and_commitment(selected)
```

## Difficulty/personality

```text
Easy: slower perception, wider misses, shorter flanks, lower coordination, generous telegraphs.
Normal: readable cover use, occasional flank, moderate coordination.
Hard: faster cover selection, better grenade timing, tighter aim, stronger squad roles.
Nightmare: near-optimal positioning and coordination, still respects telegraphs unless explicit cheat mode.
```

Personalities:

```text
Coward: high retreat/cover values.
Berserker: high advance/melee, low self-preservation.
Tactician: high flank/team spacing, avoids repeated patterns.
Suppressor: high fire-to-move, low chase.
Sniper: high distance/LOS, low reposition frequency.
```

## Debug views

```text
Perceived target vs true target
Line-of-sight confidence
Cover score map
Current role
Active attacker budget
Top action scores
Telegraph/commitment timers
Last known position age
Veto reasons
```

## Tests

```text
No-wallhack test.
Reaction-delay test.
Cover-selection test.
Flank-route validity test.
Dogpile pressure-cap test.
Telegraph fairness test.
Grenade spam cooldown test.
Blocked-cover fallback test.
Replay determinism test.
```
