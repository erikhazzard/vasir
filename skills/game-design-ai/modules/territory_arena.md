# Module: Territory / Arena Control AI

Use for Paper.io-like games, Tron/Snake-like games, capture-loop games, small arena bots, survival arenas, and zone-control games.

## Player experience target

Good territory bots should look intentional but beatable. They should expand, retreat, threaten, and sometimes overcommit. They should initiate kills early enough to feel alive, but not perfectly solve the arena.

## Core primitives

```text
Safety: time/distance to own territory, safe zone, or non-exposed state.
Exposure: trail length, loop depth, distance from safety, time since leaving safety.
Progress: estimated area/score/control gained by closing current loop or holding zone.
Threat: enemy time-to-cut own trail, collision danger, pinch risk, boundary risk.
Opportunity: enemy exposed trail, enemy far from home, undefended territory, local numerical advantage.
Closure: ability to return to safety and convert exposure into score.
Route risk: path intersects danger field or creates self-collision risk.
Border value: value of expanding along current border versus deep incursion.
Exploit risk: predictable symmetry, greedy expansion, border camping, baited chase.
```

## Common architecture

Recommended default:

```text
HFSM for major modes + utility scoring for local action/path choice + director for spawn/pressure.
```

Common modes:

```text
InsideSafe
Expand
ReturnHome
Hunt
Evade
CampBorder / PatrolBorder
RecoverFromBlockedPath
```

Use hard safety invariants around all modes.

## Hard invariants

```text
Never self-collide.
Never choose a route with no legal fallback unless explicitly reckless profile.
Never continue expansion if enemy_cut_time < own_close_time + safety_margin.
Never chase if chase path makes own trail indefensible beyond profile budget.
Never spawn directly into unavoidable player kill unless director explicitly wants free reward.
```

## Utility considerations

```text
Expand:
  + estimated_area_gain
  + border_expansion_efficiency
  - trail_exposure
  - enemy_cut_risk
  - boundary_pinching_risk

ReturnHome:
  + trail_danger
  + loop_completion_value
  + time_outside_safety
  - lost_hunt_opportunity

Hunt:
  + enemy_trail_length
  + enemy_distance_from_safety
  + own_distance_to_enemy_trail_inverse
  - own_exposure_risk
  - chance_enemy_closes_before_cut

Evade:
  + immediate_collision_risk
  + enemy_head_proximity
  + escape_route_quality
```

## Pseudocode

```text
every bot_tick:
    context = perceive_local_arena(bot)

    own_close_time = estimate_time_to_safety(bot, context)
    nearest_cut_time = estimate_enemy_time_to_cut_own_trail(bot, context)

    if bot.outside_safety and nearest_cut_time < own_close_time + bot.safety_margin:
        force_mode(ReturnHome)
    else if immediate_collision_or_pinching_risk(context):
        force_mode(Evade)
    else:
        bot.mode = choose_mode_by_utility([Expand, ReturnHome, Hunt, CampBorder], context)

    candidates = generate_steering_or_path_candidates(bot.mode, context)
    candidates = reject_hard_vetoes(candidates, context)
    selected = score_and_select(candidates, bot.mode.weights, bot.profile)

    execute(selected)
    debug.record(bot.mode, candidates, selected, own_close_time, nearest_cut_time)
```

## Director responsibilities

```text
Maintain bot population.
Spawn bots away from unfair instant death unless intentional.
Adjust aggression mix as player territory/control increases.
Throttle dogpiles.
Create local pressure near player without obvious teleport cheating.
Control offscreen simulation fidelity.
Inject recovery opportunities after player failure.
```

## Difficulty/personality profiles

```text
Cautious: high safety margin, short trails, weak hunt trigger.
Territorial: high border expansion value, moderate safety, low chase persistence.
Aggressive: strong hunt trigger, lower safety margin, higher interception skill.
Greedy: high area gain, low safety, exploitable overextension.
Camper: high border value, low deep expansion, opportunistic cuts.
Nightmare: strong threat prediction, small but nonzero reaction delay, robust anti-bait variation.
```

Difficulty changes:

```text
Perception radius
Threat-prediction accuracy
Closure estimate accuracy
Reaction delay
Safety margin
Allowed trail depth
Hunt trigger threshold
Randomness among near-equal choices
Director aggression mix
```

## Debug views

```text
Bot mode
Own trail length/depth
Time to safety
Enemy time to cut own trail
Candidate route scores
Danger/threat field
Estimated capture area
Hunt target and score
Director spawn pressure
```

## Tests

```text
Overextension test: bot retreats before guaranteed cut.
Kill initiation test: bot attacks exposed enemy trail when safe.
Bait test: bot does not mirror player infinitely.
Closure test: bot can complete loop from multiple depths.
Dogpile test: director caps local pressure.
Spawn fairness test: no unavoidable death spawns.
Replay determinism test: same seed, same decisions.
```
