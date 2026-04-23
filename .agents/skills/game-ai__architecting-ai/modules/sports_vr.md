# Module: Sports / VR Sports AI

Use for sports opponents, teammates, coaches, defenders, goalies, pickup-game bots, VR sports avatars, and embodied multiplayer-like bots.

## Player experience target

Sports AI should feel physically plausible, readable, competitive, and socially aware. In VR, comfort and body-scale believability are as important as tactical skill.

## Core primitives

```text
Safety: non-collision, comfortable personal space, stable locomotion, avoid startling the player.
Progress: shot quality, possession value, field/court advantage, objective pressure.
Threat: open opponent, drive lane, passing lane, shot angle, rebound position, fast break.
Opportunity: mismatch, open lane, weak-side cut, screen, pass window, defender overcommit.
Commitment: shot, pass, jump, catch, block, defensive slide, screen, tackle/check attempt.
Spacing: distance to player, teammates, opponents, boundaries, goal/hoop, ball path.
Embodiment: hand/head gaze, body orientation, reach zone, animation feasibility, latency.
Fairness: no impossible reaction, no clipping through player, no inhuman acceleration unless stylized.
```

## Common architecture

Recommended defaults:

```text
Role/state machine for sports phase + utility for action/position choice + tactical position selection for spacing + director/coach for team roles.
```

Common phases:

```text
Offense
Defense
Transition
LooseBall
SetPlay
Recovery
Celebration/Reset
```

## VR-specific constraints

```text
Respect personal space and comfort zones.
Avoid sudden head-level lunges unless heavily telegraphed.
Use gaze/head/hand cues as perception inputs if available.
Keep movement readable at body scale.
Prefer physically plausible acceleration and turning.
Do not crowd the player into discomfort or nausea.
Do not block real-world comfort-critical space.
```

## Position scoring

```text
position_score =
    role_fit
  + spacing_quality
  + pass_lane_quality
  + shot_lane_quality
  + defensive_coverage
  + rebound_value
  - collision_risk
  - comfort_violation
  - impossible_motion_cost
```

## Action scoring

```text
Shoot:
  + shot_quality
  + clock_pressure
  + mismatch
  - block_risk
  - pass_better_than_shot

Pass:
  + teammate_shot_quality
  + lane_openness
  + pressure_escape
  - interception_risk
  - receiver_unready

Drive/Cut:
  + open_lane
  + defender_overcommit
  + role_fit
  - collision_risk
  - stamina/motion_cost

Defend:
  + opponent_threat
  + role_assignment
  + lane_value
  - overcommit_risk
```

## Director/coach layer

```text
Assign offensive/defensive roles.
Throttle bot pressure around human player.
Create recoverable openings for learning.
Adjust bot teamwork by difficulty.
Select play style: casual, realistic, arcade, training, nightmare.
Detect repeated exploit patterns.
```

## Pseudocode

```text
every sports_tick:
    phase = classify_game_phase(ball, score, possession, clock)
    role = team_director.assign_role(agent, phase)

    if vr_comfort_violation_predicted(agent):
        select_comfort_safe_reposition()
        return

    position = select_tactical_position(agent, phase, role)
    action_candidates = generate_sports_actions(agent, phase, role, position)
    action_candidates = reject_physical_or_fairness_violations(action_candidates)
    action = utility_select(action_candidates, sports_context, agent.profile)

    execute_with_readable_body_cues(action, position)
```

## Difficulty/personality

```text
Easy: slower reactions, more open lanes, weaker prediction, lower pressure, training-friendly errors.
Normal: plausible spacing, moderate prediction, varied but readable tactics.
Hard: better anticipation, stronger role discipline, tighter spacing, fewer unforced errors.
Nightmare: high anticipation and team coordination, still obeys VR comfort and physical plausibility unless stylized.
```

Personalities:

```text
Playmaker: high pass/window creation.
Shooter: high shot selection, off-ball spacing.
Defender: high lane denial, conservative overcommit.
Aggressor: high drive/pressure, higher foul/collision risk if game supports it.
Trainer: creates readable openings and demonstrates skills.
```

## Debug views

```text
Role assignment
Phase classification
Shot quality map
Pass lane map
Defensive coverage map
Comfort zones
Collision prediction
Top action scores
Body cue/telegraph timers
```

## Tests

```text
No-crowding VR comfort test.
Reaction plausibility test.
Pass-lane selection test.
Defensive spacing test.
Exploit repeated-drive test.
Team role duplication test.
Loose-ball recovery test.
Replay determinism test.
```
