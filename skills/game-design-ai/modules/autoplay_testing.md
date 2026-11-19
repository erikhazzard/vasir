# Module: Development / Autoplay / QA AI

Use when designing agents that test games, tune systems, find exploits, simulate player cohorts, or generate regression scenarios. This is development AI, not necessarily player-facing AI.

## Purpose

Autoplay agents are for repeated measurement, not fun. They should expose structural failures, regressions, exploits, bottlenecks, difficulty spikes, economy issues, and unreachable states.

## Autoplay agent types

```text
Smoke tester: verifies basic completion and no crashes.
Progression tester: plays through content to detect gates and spikes.
Exploit seeker: maximizes reward through degenerate strategies.
Coverage explorer: visits many states and interactions.
Skill profile simulator: approximates novice/normal/expert behavior.
Economy simulator: runs long-session resource/progression loops.
Regression sentinel: replays known problematic seeds/scenarios.
```

## Core primitives

```text
Coverage: states, locations, mechanics, events, branches visited.
Progress: objective completion, level advancement, economy milestones.
Failure: death, softlock, timeout, stuck path, invalid state, crash.
Exploit value: reward per effort, risk-free gain, loop repeatability.
Difficulty: fail count, time-to-complete, input precision, resource margin.
Divergence: replay mismatch, unexpected metric drift.
```

## Architecture

Recommended defaults:

```text
Scripted goal policies + utility action selection + scenario generator + deterministic replay harness.
```

Use ML/RL only if the team can afford training, analysis, and reproducibility work. Most useful autoplay begins with simple scripted/utility agents.

## Pseudocode

```text
for scenario in scenario_suite:
    for seed in scenario.seeds:
        world = initialize_world(scenario, seed)
        agent = create_autoplay_agent(scenario.profile)

        while not scenario.finished(world):
            observation = world.observe_for_test_agent()
            action = agent.choose_action(observation)
            world.step(action)

            assert_invariants(world)
            record_metrics(world, action)

        compare_metrics_to_expected_ranges(scenario, seed)
        store_replay_if_failed_or_interesting()
```

## Exploit-seeking pattern

```text
agent objective:
    maximize reward_per_minute
    minimize risk
    repeat successful loops
    test boundary conditions
    prefer actions that produce high reward with low state change
```

## Required outputs

```text
Scenario suite
Agent profiles
Metrics
Expected ranges
Replay capture rules
Failure triage categories
Regression thresholds
Known blind spots
```

## Metrics

```text
Completion rate
Time to complete
Death/failure count
Softlock count
Invalid state count
Reward per minute
Resource surplus/deficit
State coverage
Mechanic coverage
Replay divergence
Exploit loop score
Difficulty spike score
```

## Tests for autoplay itself

```text
Can reproduce known failure.
Does not require hidden abilities unless profile allows.
Produces deterministic replay with same seed.
Finds seeded exploit in calibration scenario.
Does not falsely fail stable scenario.
Reports useful traces for triage.
```
