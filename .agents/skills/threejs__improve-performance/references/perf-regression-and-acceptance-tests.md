# Perf Regression and Acceptance Tests

This file is non-authoritative supporting context for the skill. The main `SKILL.md` is authoritative.

## Minimum acceptance tests

Every serious answer should define tests for at least:

1. **Steady-state runtime**
   - same camera path or same gameplay slice
   - same device tier
   - avg / p95 / p99 / max frame time
   - draw calls / triangles / active bodies tracked alongside frame time

2. **Spike test**
   - stress scenario: mass spawn, explosion, debris, crowd wake-up, or large scene transition
   - capture worst frame and recovery time

3. **Long-session test**
   - 5–15 minute soak
   - watch heap, resource counts, p95 drift, and body/collider counts

4. **Load / compile test**
   - first entry to a heavy scene or first use of a heavy effect
   - record hitch count and largest stall

5. **Determinism / correctness test**
   - unchanged gameplay semantics unless a trade was explicitly chosen
   - fixed-step and replay-sensitive paths still match expected outputs

## Example pass/fail thresholds

Adjust to the requested target, but be concrete.

### 90 Hz target example
- avg frame time <= 10.5 ms
- p95 <= 11.1 ms
- p99 <= 12.5 ms
- no spike above 18 ms during steady-state traversal
- physics worker p95 <= 3.5 ms
- render submission p95 <= 3.0 ms
- GPU p95 <= 6.0 ms

### 60 Hz desktop target example
- avg <= 15.0 ms
- p95 <= 16.67 ms
- p99 <= 20 ms
- no periodic GC spike above 28 ms more than once per minute

## Before/after discipline

For every fix:
- keep the test scene identical
- keep camera path identical
- keep asset set identical
- keep quality settings identical unless the fix is explicitly a quality trade
- capture the exact metric that should improve
- revert if the expected metric does not move

## Hotspot evidence checklist

A fix is not “proven” just because FPS went up a little.
Try to validate the specific metric that the fix should affect:

- batching fix → draw calls / submission time
- shadow fix → GPU time / shadow pass time
- DPR fix → GPU frame time / fill-rate sensitivity
- sleeping / active-body sync fix → worker physics and sync time
- collider simplification fix → physics step p95 in contact-heavy scenes
- disposal fix → heap/resource counts over time
