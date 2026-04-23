# Primitive Discovery Reference

Great game AI usually comes from the right primitives, not the fanciest architecture. A primitive is a game-specific measurement, query, or concept that lets an agent judge the situation.

## Required primitive categories

For every game, identify the equivalents of these concepts:

```text
Safety: what keeps the agent alive, legal, comfortable, trusted, or recoverable?
Progress: what moves the agent toward its goal?
Threat: what can harm the agent, player, team, objective, economy, or experience?
Opportunity: what can be exploited now?
Commitment: what has the agent already started that constrains future action?
Escape/recovery: how does the agent return to safety or repair a bad state?
Spatial advantage: what locations, angles, distances, or regions matter?
Resource advantage: what consumables, cooldowns, stamina, ammo, health, score, or time matter?
Information advantage: what is known, guessed, hidden, stale, or uncertain?
Fairness: what would feel like cheating?
Visible mistake: what would the player notice and judge?
Exploit risk: what can the player abuse repeatedly?
```

## Discovery method

Use this sequence:

1. Describe how a strong human would play the role.
2. List what the human is constantly estimating.
3. Convert each estimate into a query, score, or state variable.
4. Identify which estimates are cheap enough to run every tick and which need caching.
5. Identify which estimates must be exact and which can be approximate.
6. Identify which primitives are visible to the player and which are internal.

## Examples by game shape

### Territory/arena control

```text
Safety: distance/time to own territory, safe zone, or non-exposed state
Progress: area captured, line closed, objective control, expansion value
Threat: enemy time-to-cut, collision cone, pinch risk, boundary risk
Opportunity: enemy exposed trail, undefended region, local numerical advantage
Commitment: current loop/trail depth, route length, current capture path
Exploit risk: baiting symmetry, inducing overextension, camping border
```

### Shooter/combat

```text
Safety: cover quality, exposure time, retreat route, health, suppression
Progress: damage pressure, objective progress, better angle, resource denial
Threat: player line of sight, grenade radius, flank route, reload timing
Opportunity: exposed player, weak cover, low ammo, isolated target, crossfire
Commitment: reload, vault, flank route, melee windup, grenade throw
Exploit risk: predictable peeking, omniscient tracking, instant reaction
```

### Sports / VR sports

```text
Safety: non-collision, comfortable spacing, stable locomotion, defensive position
Progress: shot quality, pass lane, possession advantage, court/field spacing
Threat: open opponent, passing lane against, drive lane, rebound risk
Opportunity: mismatch, open lane, weak-side cut, teammate screen, goalie gap
Commitment: jump, shot, pass, catch attempt, defensive slide
Exploit risk: unnatural body motion, impossible reaction, crowding the player
```

### Companion / social NPC

```text
Safety: not blocking player, not interrupting critical action, social distance
Progress: supporting player goal, maintaining believability, narrative beat
Threat: player frustration, repeated line, path blocking, tone mismatch
Opportunity: help, hint, revive, comment, react, teach, foreshadow
Commitment: current bark, animation, conversation turn, follow behavior
Exploit risk: robotic repetition, over-helping, revealing hidden info unfairly
```

### Strategy / tactics

```text
Safety: unit survival, formation integrity, supply, retreat path, base defense
Progress: map control, economy, tech timing, objective pressure
Threat: enemy army position, fog-of-war uncertainty, flank, timing attack
Opportunity: undefended expansion, overextended army, tech mismatch
Commitment: build order, attack timing, unit production, marching army
Exploit risk: predictable build, map hacks, brittle scripted response
```

### Racing / chase

```text
Safety: traction, collision avoidance, line stability, recovery from spin
Progress: lap time, racing line, checkpoint distance, target distance closure
Threat: obstacle, opponent block, corner entry speed, police/player intercept
Opportunity: overtake gap, shortcut, draft, ram angle, roadblock timing
Commitment: turn entry, drift, overtake, jump, shortcut path
Exploit risk: obvious rubber-banding, impossible acceleration, path cheating
```

## Primitive quality test

A primitive is useful if it is:

- tied to player-visible behavior,
- queryable or estimable at runtime,
- cheap enough or cacheable,
- tunable by difficulty/personality,
- useful for both decisions and debug overlays,
- robust under edge cases.

Reject primitives that sound smart but cannot be measured, queried, tuned, or tested.
