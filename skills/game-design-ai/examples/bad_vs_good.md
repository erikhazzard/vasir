# Bad vs Good Game AI Output

## Example 1: Architecture cargo cult

Bad:

```text
Use a behavior tree with states for patrol, chase, and attack.
```

Why it fails:

```text
No player experience target.
No world queries.
No hard invariants.
No difficulty model.
No director layer.
No tests.
No reason behavior tree is appropriate.
```

Good:

```text
The enemy should feel cautious, readable, and punishable. Use a behavior tree for sequencing combat flow, but place tactical choice inside a utility selector because cover, attack, flank, and retreat are continuous tradeoffs. Required primitives are cover quality, exposure time, line-of-sight confidence, flank route risk, active attacker budget, and player reload/opportunity windows. Hard invariants prevent shooting before perception delay, choosing unreachable cover, or exceeding squad pressure budget. The director assigns active attackers and staggers grenades. Debug views show cover scores, current role, utility scores, target confidence, and veto reasons. Tests cover no-wallhack, reaction delay, blocked cover fallback, dogpile cap, and replay determinism.
```

## Example 2: ML hype

Bad:

```text
Train an RL agent through self-play so it learns optimal behavior.
```

Why it fails:

```text
No justification for training cost.
No determinism story.
No designer control.
No player-perception model.
No debug plan.
No fallback.
```

Good:

```text
Default to deterministic utility/HTN behavior because the game needs designer control, replay determinism, and readable difficulty. Use offline simulation/autoplay agents to tune thresholds and discover exploits. Consider RL only for a separate nightmare bot or development tool if training cost, interpretability, and reproducibility are acceptable.
```

## Example 3: Natural language too vague

Bad:

```text
The bot should be smart and aggressive but sometimes defensive.
```

Good:

```text
Aggression is expressed by hunt_threshold, chase_persistence, and safety_margin. Defensive behavior is expressed by return_home_weight, retreat_route_requirement, and max_exposure_time. The bot may chase only when own_time_to_safety < enemy_time_to_close + margin. On hard difficulty, margin is 0.4s; on easy, margin is 1.2s.
```

## Example 4: No director layer

Bad:

```text
Make enemies decide when to attack based on distance to player.
```

Good:

```text
Individual enemies score attack locally, but the encounter director owns the active attacker budget. It grants attack tokens based on current intensity, player health, recent failures, and phase. Enemies without tokens reposition, suppress, or posture. This prevents unfair dogpiles while preserving local agency.
```
