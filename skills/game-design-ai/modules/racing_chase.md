# Module: Racing / Chase / Vehicle AI

Use for racing opponents, police/chase AI, vehicle combat, runners, pursuit/evasion, and path-following competitors.

## Player experience target

Vehicle and chase AI should feel physically plausible, competitive, recoverable, and readable. Rubber-banding can improve experience, but obvious cheating destroys trust.

## Core primitives

```text
Safety: traction, collision avoidance, recovery route, vehicle stability, legal track position.
Progress: lap time, checkpoint distance, target distance closure, intercept progress.
Threat: obstacle, opponent block, corner entry speed, road hazard, interception angle.
Opportunity: overtake gap, draft, shortcut, ram/pit angle, roadblock timing, player mistake.
Commitment: turn entry, drift, jump, overtake, shortcut, intercept, recovery maneuver.
Line quality: racing line, apex timing, braking point, throttle window, surface quality.
Fairness: no impossible acceleration, no teleporting, no unavoidable offscreen intercept unless stylized.
```

## Common architecture

Recommended defaults:

```text
Path/line following + local utility for overtake/block/intercept + director for rubber-band and traffic/pressure.
```

## Hard invariants

```text
Never violate vehicle physics unless explicit arcade mode.
Never rubber-band in a visibly impossible way.
Never select a path with no recovery if safer legal path exists.
Never spawn roadblocks or hazards without fair readability.
Never force unavoidable collision in non-punishment modes.
```

## Utility considerations

```text
FollowRacingLine:
  + line_quality
  + stability
  - obstacle_risk

Overtake:
  + gap_quality
  + speed_advantage
  + track_position_value
  - collision_risk
  - corner_entry_risk

Block:
  + threat_from_behind
  + legal_block_position
  - unfairness_risk
  - self_crash_risk

Intercept:
  + predicted_target_path_confidence
  + intercept_angle_quality
  - physics_cost
  - rubberband_visibility
```

## Director layer

```text
Adjust opponent pressure gradually.
Control traffic/hazard density.
Create recovery/comeback windows.
Throttle rubber-band strength.
Select rival personalities.
Prevent impossible catch-up artifacts.
```

## Pseudocode

```text
every vehicle_tick:
    predicted_state = predict_vehicle_motion(agent)
    base_line = select_best_line(agent, track_context)

    candidates = generate_vehicle_maneuvers(base_line, nearby_agents, objective)
    candidates = reject_physics_or_fairness_violations(candidates)
    selected = utility_select(candidates, racing_context, profile)

    execute_vehicle_control(selected)
    debug.record_line_and_maneuver_scores()
```

## Difficulty/personality

```text
Easy: wider racing lines, earlier braking, lower overtake aggression.
Normal: plausible lines, moderate pressure, occasional mistakes.
Hard: better apex/braking, stronger recovery, smarter overtakes.
Nightmare: near-optimal lines, but no impossible physics unless explicit arcade cheat.
```

Personalities:

```text
Clean racer: avoids contact, optimizes line.
Aggressive blocker: high block/overtake, higher risk.
Police/interceptor: high intercept, coordinated roadblocks.
Showboat: risky shortcuts and drifts.
```

## Debug views

```text
Racing line score
Predicted path
Overtake gap score
Collision risk
Rubber-band strength
Physics constraint vetoes
Director pressure target
```

## Tests

```text
Physics plausibility test.
Rubber-band detectability test.
Overtake gap test.
Blocked track fallback test.
Shortcut risk test.
Roadblock fairness test.
Replay determinism test.
```
