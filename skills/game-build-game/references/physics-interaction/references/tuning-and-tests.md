# Tuning, Instrumentation, and Tests (Non-Normative)
## Tuning order

1. Validate runtime contract and determinism first.
2. Tune acquisition clarity.
3. Tune hold lag / settle behavior.
4. Tune release estimation.
5. Tune flight readability.
6. Tune impact payoff.
7. Tune support cheats last and expose them.

## Minimum measurable metrics

Track at least:
- translation settle time
- rotation settle time
- overshoot
- steady-state lag
- obstruction gap under wall contact
- throw dispersion by mode
- replay checksum / snapshot equivalence
- worker packet latency
- hot-path allocations
- active awake bodies
- solver time

## Suggested acceptance tests

### Determinism
- same input stream, same initial snapshot, same output snapshot hash
- repeat after scene reload
- repeat with dense nearby contact set

### Grab / hold
- press held object into wall; object should stop, hand target should continue, visible resistance should be stable
- acquire moving object without teleport
- acquire object from dense pile without unstable candidate flicker

### Throwing
- test 10 throws per object class at fixed distance
- compare manual vs assisted dispersion
- verify no micro-flick exploit produces unrealistic release speed

### Two-hand
- attach second hand while the object is already colliding with the environment
- release secondary hand during swing
- swap primary hand without teleport or state snap

### Performance
- no per-tick allocations in hold / throw hot path
- solver escalation only on engaged objects
- worker packet size remains bounded and predictable
- overload mode preserves determinism before spectacle

## Debug tooling

Useful overlays:
- grip candidates and scores
- proxy/object separation
- pose-history ring buffer
- release-window samples
- contact normals / contact points
- material-pair resolution
- awake/sleep state
- extra solver iteration markers
- packet sequence ids and dropped-frame counters
