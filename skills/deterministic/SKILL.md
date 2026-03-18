---
name: deterministic
description: Replay testing, seeded fixtures, clock control, and deterministic failure triage.
---

# Deterministic Testing

When the system can replay, the tests must replay too.

## Core Principle

Control every source of nondeterminism: seed, time, scheduling, and input order. If a failure cannot be replayed exactly, the test harness is incomplete.

## Quick Reference

- Pass seeds explicitly and log them on failure.
- Replace wall-clock reads with injected clocks.
- Use explicit latches or awaited state transitions, never sleeps for correctness.
- Keep replay artifacts small enough to inspect and stable enough to diff.

## Implementation Patterns

### Pattern 1: Seeded fixture helper

```js
export function withSeed(seed, factory) {
  try {
    return factory(seed >>> 0);
  } catch (error) {
    error.message = `${error.message} (seed=${seed})`;
    throw error;
  }
}
```

### Pattern 2: Replay round-trip test

```js
import test from "node:test";
import assert from "node:assert/strict";

test("replay reproduces the same final score", () => {
  const seed = 42;
  const intents = [{ tick: 1, type: "jump" }, { tick: 8, type: "jump" }];
  const first = runReplay({ seed, intents });
  const second = runReplay({ seed, intents });
  assert.deepEqual(second.finalState, first.finalState);
});
```

### Pattern 3: Injected clock instead of wall time

```js
export function makeTestClock(nowMs = 0) {
  return {
    now: () => nowMs,
    advance: (deltaMs) => {
      nowMs += deltaMs;
      return nowMs;
    }
  };
}
```

## Anti-Patterns

- Do not generate random fixtures with `Math.random()` and then hope the test only fails sometimes.
- Do not use `setTimeout` or arbitrary sleeps to wait for correctness.
- Do not snapshot unstable fields such as timestamps, UUIDs, or environment-dependent paths without normalizing them first.

## Checklist

- [ ] Seeds are explicit and surfaced on failure.
- [ ] Time comes from an injected clock.
- [ ] Async assertions wait on observable conditions.
- [ ] Replay tests compare stable state, not incidental formatting.
- [ ] A failing run can be replayed locally with the same inputs.
