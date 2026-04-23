# Testing, Observability, and Telemetry Reference

A game-AI design is not shippable until it can be tested, replayed, debugged, and tuned. Include these artifacts by default.

## Required test types

### Scenario tests

Small handcrafted situations that prove specific behavior.

Examples:

```text
Enemy should choose cover when exposed.
Territory bot should return home when trail danger exceeds margin.
Companion should not block doorway while player exits.
Sports defender should protect drive lane over low-value passing lane.
Director should reduce pressure after player death.
```

### Invariant tests

Hard rules that must never fail.

Examples:

```text
No invalid nav target.
No attack before telegraph completes.
No reaction before perception delay.
No path through forbidden zones.
No per-agent query budget overrun.
No director spawn inside unfair zone.
```

### Stress tests

High-load and edge-case tests.

Examples:

```text
100 agents updating at target tick rate.
All agents pathing through narrow chokepoint.
All candidates invalid.
Player rapidly toggles bait behavior.
Network rollback/replay validation.
```

### Exploit tests

Tests designed to catch repeated player abuse.

Examples:

```text
Player baits symmetric movement loops.
Player peeks repeatedly around same cover.
Player kites enemy across nav seams.
Player camps spawn boundary.
Player blocks companion path intentionally.
```

### Golden replays

Deterministic recorded scenarios with expected outcomes.

```text
Seed:
Initial world state:
Player input script:
Expected AI decisions:
Expected metrics:
Allowed variance:
```

## Required debug outputs

Every AI system should expose why it acted.

```text
Current mode/task/plan
Top candidate actions and scores
Hard veto reasons
World-query results
Known/perceived target position
Path or destination
Influence/threat/safety overlays
Director intensity and pressure budget
Current difficulty/personality modifiers
Last decision timestamp and seed
```

## Decision trace format

Use natural-language or log-friendly structure:

```text
Time:
Agent:
Perceived state:
Candidates:
Vetoes:
Scores:
Selected action:
Reason:
Fallback if failed:
Random seed/sample:
```

Example:

```text
Time: 134.20
Agent: TerritoryBot_07
Perceived state: outside territory, trail_len=12, nearest_enemy_cut_time=1.4s, home_time=1.8s
Vetoes: ContinueExpand vetoed because enemy_cut_time < home_time + margin
Scores: ReturnHome=0.92, Hunt=0.21, Expand=0.00
Selected action: ReturnHome
Reason: trail danger invariant
Seed: match_42
```

## Telemetry metrics

Pick metrics tied to player experience and AI quality.

```text
Average survival time
Time spent in each mode
Action selection distribution
Veto frequency by reason
Reaction time distribution
Damage/pressure over time
Player deaths attributed to AI type
Player escapes after telegraph
Territory/objective control changes
Director intensity vs target
Exploit loop detection
Path failure rate
Query budget cost
Replay divergence rate
```

## Automated playtest agents

Use development/autoplay AI to test:

```text
Progression bottlenecks
Economy balance
Exploit strategies
Softlocks
Difficulty spikes
AI blind spots
Map/nav issues
Long-session stability
```

Autoplay agents do not replace human playtests. They find structural failures and regression bugs.

## Final test-plan output

Every design should include:

```text
Scenario tests:
Invariant tests:
Stress tests:
Exploit tests:
Golden replays:
Debug overlays:
Metrics:
Known untested risks:
```
