---
name: netcode
description: Authoritative multiplayer netcode with prediction, reconciliation, and bandwidth-aware state sync.
---

# Netcode

Ship multiplayer around explicit authority, bounded latency tricks, and predictable payload costs.

## Core Principle

The server is authoritative. Clients may predict only the state they own and must reconcile from authoritative snapshots without pretending local time is truth.

## Quick Reference

- Inputs travel client -> server as ordered commands with sequence numbers.
- The server simulates, stamps authoritative snapshots, and acknowledges the last processed input.
- Clients predict locally, then rewind and replay unacknowledged inputs after reconciliation.
- Send deltas or compact state projections, not the whole world every tick.

## Implementation Patterns

### Pattern 1: Input command envelope

```js
export function makeInputCommand(playerId, sequence, input, clientFrame) {
  return {
    type: "input",
    playerId,
    sequence,
    clientFrame,
    input
  };
}
```

### Pattern 2: Client reconciliation loop

```js
function applySnapshot(clientState, snapshot) {
  const pending = clientState.pendingInputs.filter((input) => input.sequence > snapshot.lastProcessedSequence);
  let state = snapshot.state;

  for (const input of pending) {
    state = simulateOwnedPlayer(state, input);
  }

  return {
    ...clientState,
    world: state,
    pendingInputs: pending
  };
}
```

### Pattern 3: Delta snapshots by entity version

```js
export function diffEntities(previous, current) {
  const delta = [];
  for (const [entityId, nextEntity] of current.entries()) {
    const prevEntity = previous.get(entityId);
    if (!prevEntity || prevEntity.version !== nextEntity.version) {
      delta.push({ entityId, entity: nextEntity });
    }
  }
  return delta;
}
```

## Anti-Patterns

- Do not trust client clocks for hit validation, cooldown expiry, or ordering. Authority lives on the server timeline.
- Do not send entire world snapshots when only a small slice changed.
- Do not let reconciliation silently teleport the player without preserving pending local inputs.

## Checklist

- [ ] Server authority is explicit.
- [ ] Inputs carry ordering metadata.
- [ ] Snapshots acknowledge processed inputs.
- [ ] Reconciliation replays unacked local commands.
- [ ] Bandwidth cost is bounded by deltas, interest management, or both.
