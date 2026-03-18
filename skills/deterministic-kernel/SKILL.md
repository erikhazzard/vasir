---
name: deterministic-kernel
description: Seeded RNG, tick-based state, and kernel/shell separation for deterministic game replays.
---

# Deterministic Kernel

Build games so the same seed and the same intent stream always produce the same outcome.

## Core Principle

The kernel owns simulation. The shell owns presentation and I/O. The shell may observe state and enqueue intents, but it must never mutate gameplay state directly.

## Quick Reference

- Kernel responsibilities: state, rules, fixed-tick time, RNG, collision, scoring.
- Shell responsibilities: DOM, canvas, audio, network transport, storage, analytics.
- All kernel inputs are serializable intents.
- All randomness comes from a seeded source threaded through state.
- Replay = initial state + seed + ordered intents.

## Implementation Patterns

### Pattern 1: Seeded RNG lives inside state

```js
export function makeMulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function initRun(seed) {
  return {
    tick: 0,
    score: 0,
    rngSeed: seed >>> 0
  };
}

export function nextRandom(state) {
  const random = makeMulberry32(state.rngSeed);
  const value = random();
  return {
    value,
    state: { ...state, rngSeed: (state.rngSeed + 1) >>> 0 }
  };
}
```

### Pattern 2: Pure fixed-step reducer

```js
export function step(state, intents) {
  let next = { ...state, tick: state.tick + 1 };

  for (const intent of intents) {
    if (intent.type === "jump" && next.player.grounded) {
      next = {
        ...next,
        player: { ...next.player, vy: -18, grounded: false }
      };
    }
  }

  return {
    ...next,
    player: {
      ...next.player,
      y: next.player.y + next.player.vy,
      vy: next.player.vy + 1.2
    }
  };
}
```

### Pattern 3: Shell drains semantic intents on tick boundaries

```js
const pendingIntents = [];

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    pendingIntents.push({ type: "jump", issuedAtTick: game.tick + 1 });
  }
});

function frame() {
  const intents = pendingIntents.splice(0, pendingIntents.length);
  game = step(game, intents);
  render(game);
  requestAnimationFrame(frame);
}
```

## Anti-Patterns

- Do not call `Math.random()`, `Date.now()`, or `performance.now()` in kernel code. Those values are not replayable.
- Do not let DOM events, promises, or socket callbacks mutate gameplay state directly. Convert them into semantic intents and drain them on the next simulation step.
- Do not read layout, viewport, or audio state inside simulation code. That couples replay correctness to device conditions.

## Checklist

- [ ] The simulation advances with a fixed step.
- [ ] State and intents are serializable.
- [ ] RNG is seeded and replayable.
- [ ] The shell only renders and enqueues intents.
- [ ] A replay test can prove byte-stable behavior for a known seed.
