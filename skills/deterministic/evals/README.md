# Deterministic Eval Contract

Use this suite to check whether the `deterministic` skill pushes answers away from wall-clock and unseeded randomness.

## Failure Mode

Without the skill, models often:

- use `Math.random()` directly
- use `Date.now()` or implicit wall-clock time
- describe replayability without naming the seed or clock boundary

## Win Condition

The treatment output should beat baseline by making deterministic control surfaces explicit:

- seeded RNG
- injected or controlled clock
- replay-safe language instead of ambient randomness or time

## Current Cases

- `replayable-random-reward`

## Current Limits

This suite is currently a smoke test. It checks whether the answer names the deterministic boundary, not whether the design is a complete replay architecture.
