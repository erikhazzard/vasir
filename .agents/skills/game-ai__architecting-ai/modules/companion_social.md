# Module: Companion / Social NPC AI

Use for companions, helpers, guides, teammates, pets, civilians, social NPCs, narrative-adjacent NPCs, and non-combat characters.

## Player experience target

Companion and social AI should support the player’s agency, maintain believability, avoid obstruction, and create emotional continuity. The best companion AI often helps less than it technically could.

## Core primitives

```text
Safety: not blocking, not interrupting, not spoiling, not breaking mission or social trust.
Progress: helping player goal, teaching, emotional beat, narrative state, task completion.
Threat: player frustration, repeated lines, obstruction, tone mismatch, over-helping, wrong timing.
Opportunity: hint, revive, assist, react, celebrate, comfort, foreshadow, teach, comment.
Commitment: current bark, animation, conversation turn, follow task, assist action.
Proxemics: personal space, line of sight, follow distance, social angle, body orientation.
Context: player intent, recent failures, current objective, emotional tone, location, relationship.
Fairness: companion must not solve the game unless that is the fantasy.
```

## Common architecture

Recommended defaults:

```text
HFSM/BT for routines and sequencing + utility for assist/comment/action timing + director for narrative/pacing permissions.
```

Social/dialogue generation may use offline LLM authoring or constrained runtime systems if explicitly requested, but behavior should remain bounded and validated.

## Hard invariants

```text
Never block required player movement.
Never repeat the same bark beyond cooldown rules.
Never reveal hidden information the player should not know.
Never interrupt critical gameplay timing unless emergency support is required.
Never steal a core player victory unless designed.
Never perform an assist that invalidates player learning.
```

## Utility considerations

```text
Follow:
  + player_distance
  + line_of_sight_loss
  - player_focus_on_precision_task
  - crowding_risk

Assist:
  + player_need
  + player_failure_streak
  + assist_relevance
  - agency_loss
  - cooldown

Hint:
  + time_stuck
  + repeated_failed_attempts
  + objective_criticality
  - spoiler_risk
  - hint_recently_given

Comment/React:
  + novelty
  + emotional_fit
  + relationship_fit
  - repetition
  - combat_or_focus_intensity
```

## Director layer

```text
Controls hint permission.
Controls emotional pacing.
Controls companion availability.
Controls narrative beats and relationship state.
Caps repetition.
Suppresses companion chatter during high-focus tasks.
```

## Pseudocode

```text
every companion_tick:
    context = read_player_context_with_privacy_and_design_limits()

    if blocking_or_crowding_player(context):
        move_to_nonblocking_support_position()
        return

    permissions = companion_director.current_permissions(context)
    candidates = generate_companion_actions(context, permissions)
    candidates = reject_agency_or_spoiler_violations(candidates)
    selected = utility_select(candidates, context, companion_profile)

    execute_with_cooldowns_and_commitment(selected)
```

## Difficulty/personality

```text
Supportive: more assists, more emotional reactions, careful not to solve.
Quiet: fewer barks, more spatial support.
Teacher: more hints after failure, clear demonstration behavior.
Comic: higher reaction/comment rate, strict repetition guard.
Protector: high revive/defense support, lower exploration independence.
```

## Debug views

```text
Current relationship/emotional state
Player-stuck estimate
Hint permission state
Bark cooldowns
Crowding score
Assist utility scores
Suppressed actions and reasons
```

## Tests

```text
Doorway blocking test.
Repeated bark test.
Spoiler/hint timing test.
Player agency test.
High-intensity chatter suppression test.
Follow distance test.
Assist cooldown test.
Replay determinism test.
```
