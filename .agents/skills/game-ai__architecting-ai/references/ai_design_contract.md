# AI Design Contract Reference

A game-AI design is not complete until it defines what the AI is for, what it knows, what it can do, what it must never do, how it chooses, how it is tuned, and how it is tested.

## Contract hierarchy

Use this hierarchy for any substantial design:

```text
Game AI Design
  Experience Contract
  AI Scope
    Agent AI
    Director AI
    Development/Autoplay AI
  Knowledge Model
  Architecture Decision
  Agent Contracts
  Director Contract
  Difficulty & Personality Model
  Testing/Observability Plan
  Runtime/Integration Notes
```

## Experience contract

Define the player-facing promise before implementation.

```text
Target fantasy:
Player should believe:
Player should be able to learn:
AI should feel:
AI should not feel:
Core tension:
Fairness boundary:
```

Examples:

```text
Shooter grunt:
Player should believe the enemy values cover, fears exposure, and coordinates lightly with nearby allies. The enemy may miss shots, hesitate, and retreat. It must not pre-aim through walls or instantly punish the player before a readable exposure window.
```

```text
Territory bot:
Player should believe the bot wants to expand safely but can be baited into greed. It should opportunistically cut trails but not perfectly solve the arena.
```

## AI scope classification

Classify the request before designing.

```text
Agent AI: individual decision-making and movement.
Director AI: spawn, pacing, encounter composition, difficulty, resource pressure.
Development/autoplay AI: test agents, exploit finders, tuning bots, simulation agents.
```

Most strong designs include at least agent AI and director evaluation.

## Agent contract

For each agent type, specify:

```text
Name:
Role:
Player-facing read:
Primary goals:
Secondary goals:
Sensors:
Memory:
Actions:
Resources:
Hard invariants:
Soft preferences:
Behavior modes/tasks:
Decision model:
Movement/execution model:
Animation/telegraph hooks:
Tuning knobs:
Difficulty knobs:
Personality knobs:
Debug outputs:
Tests:
Failure modes:
```

## Hard invariants vs soft preferences

Hard invariants are never violated. They are legality, trust, safety, and budget rules.

Examples:

```text
Never choose an unreachable destination.
Never fire before the telegraph window completes.
Never react to unseen player actions faster than the perception delay.
Never exceed the per-agent query budget.
Never knowingly enter a state with no legal fallback.
Never use omniscient player position except in debug or explicitly-cheating modes.
```

Soft preferences are scored and tunable.

Examples:

```text
Prefer nearby cover with line of sight.
Prefer shorter exposed trail length.
Prefer attacking enemies with long recovery time.
Prefer maintaining team spacing.
Prefer high-value resource pickups when safe.
```

## Knowledge model contract

Define knowledge before behavior.

```text
Perceived data:
Known-but-stale data:
Inferred data:
Omniscient/debug-only data:
Memory decay:
Sensor update rate:
World-query update rate:
Cache invalidation rule:
```

## Decision model contract

For any decision system, include:

```text
Candidate actions:
Veto conditions:
Scored considerations:
Normalization:
Selection method:
Tie-breaking/randomness:
Hysteresis/commitment:
Cooldowns:
Fallback action:
Debug explanation:
```

## Utility consideration schema

When using utility AI, specify:

```text
Action:
Consideration:
Input source:
Input range:
Normalization:
Curve shape:
Weight:
Veto threshold:
Hysteresis:
Difficulty modifiers:
Debug label:
```

Example:

```text
Action: ReturnHome
Consideration: Trail danger
Input source: enemy_time_to_cut_own_trail - own_time_to_home
Input range: -5s to +5s
Normalization: map negative values to high danger
Curve: steep sigmoid near 0s
Weight: high
Veto threshold: if enemy can cut >0.5s before closure, force ReturnHome
Hysteresis: stay in ReturnHome until inside territory
Debug label: return_home.trail_danger
```

## Planner action schema

When using GOAP/HTN/planning, specify:

```text
Action/task name:
Preconditions:
Effects:
Cost:
Duration:
Interruptibility:
Required world queries:
Failure handling:
Animation/execution hook:
Debug label:
```

## Director contract

Director AI handles experience shaping that should not be owned by individual agents.

```text
Responsibilities:
Inputs:
Outputs:
Pacing model:
Difficulty model:
Spawn/composition rules:
Fairness constraints:
Rubber-band constraints:
Offscreen simulation rules:
Tuning knobs:
Debug outputs:
Tests:
```

## Difficulty and personality contract

Difficulty should not only make agents “dumber.” Prefer changing perception, timing, risk tolerance, coordination, and tactical vocabulary.

```text
Difficulty profile:
Perception radius:
Reaction time:
Prediction accuracy:
Allowed tactics:
Risk tolerance:
Coordination level:
Mistake frequency:
Mistake severity cap:
Director pressure:
```

Personality should be weight/profile driven where possible:

```text
Aggressive: high opportunity/attack weighting, lower safety margin.
Cautious: high safety/escape weighting, lower chase persistence.
Greedy: high progress/reward weighting, accepts exposure.
Protector: high ally/player-support weighting, low flank greed.
Trickster: high bait/feint/position switching weighting.
```

## Runtime notes

Always include:

```text
Tick/update frequency:
Expensive queries and cache policy:
Per-agent budget:
Group/director budget:
Seeded randomness:
Replay determinism:
Fallback behavior when query fails:
Integration risks:
```
