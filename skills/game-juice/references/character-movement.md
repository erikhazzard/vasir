# Character Movement Juice (Portable Recipe)

**Core Principles**
- **Fast reaction, slow recovery** — snap to input; ease back to neutral.
- **Guard against jitter** — never let near-zero velocity drive sign flips, bob, or rotation.
- **Cap animation rates** — “too fast” reads as vibration, not energy.
- **Keep sim and juice separate** — deterministic movement in the sim; juice is render-only and derived from sim velocity.

**Movement Physics (Simulation)**
- **Acceleration + friction model** — don’t set position directly; update velocity then integrate position.
  - Fixed-tick form: `v = (v + input * a) * f; p += v`
  - Variable-`dt` form: `v += input * accel * dt; v *= pow(fPerFrame, dt * fps); p += v * dt`
- **Diagonal normalization** — multiply both axes by `0.707` so diagonal isn’t faster than cardinal.
- **Fixed-tick terminal-speed derivation (handy)** — if you use `v_{t+1} = (v_t + a) * f` then steady-state is `v* = a*f/(1-f)`.
  - Choose `a = maxSpeed * (1-f)/f` (optionally `* accelMultiplier`) so the cap is stable.

**Squash & Stretch (Event Punctuation + Elastic Recovery)**
- **Movement start** (still→moving): squash horizontally, stretch vertically `(0.85x, 1.2y)`.
- **Movement stop** (moving→still): opposite squash `(1.2x, 0.85y)`.
- **Direction change** (sign flip at speed): big horizontal stretch `(1.25x, 0.8y)`.
- **Elastic recovery** (fast reaction, slow settle):
  - Target drifts back: `target = lerp(target, 1, 0.08)`
  - Actual follows target: `scale = lerp(scale, target, 0.18)`
- **Anti-jitter rule (critical):**
  - Detect flips using the **last non-zero sign** (don’t treat `0` as a sign).
  - Require a speed threshold (e.g. `> 30px/s`) so friction/epsilon crossings don’t spam squash.

**Bob / Footstep Cycle**
- **Sine-wave vertical offset** — `offsetY = sin(phase) * 4px * intensity`.
- **Intensity gate** — `intensity → 1 when moving, → 0 when not` (lerp), and lerp `offsetY` toward `0` on stop.
- **Speed-reactive frequency (unit sanity):**
  - If you think in **Hz** (cycles/sec): `radPerSec = 2π * Hz`.
  - The reference “10–14” in the demo is **radians per second** (≈1.6–2.2Hz), not “10–14Hz”.
- **Update correctly (avoid vibration):**
  - Fixed-tick: `phase += radPerSec / tickRateHz`
  - Variable-`dt`: `phase += radPerSec * dtSeconds`
- **Footstep scale pulse (continuous, not discrete):**
  - `pulse = abs(sin(phase))`
  - Blend into the target scale so it “breathes” with steps.
  - Emoji often need a slightly larger pulse (`~0.06–0.09`) to read.

**Lean / Rotation**
- **Velocity-based tilt** — `rotTarget = vx * 0.0004` (small degrees at full speed).
- **Deadzone** — if `|vx| < ~15px/s`, set target to `0` (prevents micro-lean jitter).
- **Ease** — `rotation = lerp(rotation, rotTarget, 0.12)`.

**Particles (Dust Poofs)**
- **Spawn moments:** start (3), stop (4), direction change (5).
- **Simple physics:** friction `~0.96`, short life `~200ms`, shrink + fade over lifetime.
- **Replay-friendly visuals:** if you care about consistent playback, seed VFX from `tickIndex` + stable ids (don’t use `Math.random()` in deterministic lanes).

**Afterimages / Trail**
Two distinct design intents (pick one, don’t mix accidentally):
- **“Fast movement” visualization** — spawn above an absolute threshold (e.g. `> 65% maxSpeed`).
- **“Bonus speed” indicator** — *no trail at baseline*; trail ramps with move-speed buffs.
  - Compute `speedRatio = speed / baseSpeed`.
  - Gate: `speedRatio > 1 + eps` (`eps ~ 0.02–0.05`).
  - Scale: `bonus01 = clamp((speedRatio - 1)/range, 0, 1)`.
  - Spawn interval + alpha should scale from **0 at baseline** → stronger at high bonus.
- **Performance:** use a small ring buffer/pool; decay alpha by multiplier (`≈0.88`) and kill at `~0.02`.

**Rendering / Transform Order**
- Typical: `translate → rotate → mirror → scale → draw`.
- Mirror **after** rotate if you don’t want facing flips to invert lean direction.

**Timing Hierarchy (keeps it feeling alive)**

| Layer | Speed | Purpose |
|---|---|---|
| Input → acceleration | Instant | Responsiveness |
| Squash on event | ~120ms recovery | Punctuation on actions |
| Scale elastic recovery | ~200–300ms | Springy settle |
| Lean lerp | Continuous (`~0.12`) | Weight/momentum feel |
| Bob cycle | ~450–650ms period | Locomotion rhythm |
| Dust particles | ~200ms lifetime | Environmental feedback |
| Afterimage fade | ~300ms | Speed visualization |

**Common Failure Modes (what “feels bad”)**
- **Bob too fast (unit mismatch):** treating `10–14` as rad/tick instead of rad/sec → vibration.
- **Sign-flip spam near zero:** using `Math.sign(v)` without thresholds / last-nonzero tracking.
- **Trail always-on:** gating only on speed, not on the “bonus speed” intent.
- **Micro-lean jitter:** no deadzone, so tiny `vx` noise drives rotation.
