---
name: endless-runner
description: Obstacle generation, speed ramping, lane systems, and session tuning for endless runners.
---


# Endless Runner Skill (JavaScript · Mobile-Native iOS)

A runner is a **rhythm game in disguise**: the player performs reaction sequences where obstacle spacing sets the beat and speed ramp sets the tempo. Your job is to build systems where the player constantly feels "that was impossible but I survived" — perceived near-failure with actual generous forgiveness underneath. Given a runner's mechanics, generate obstacle sequences the player can learn as patterns, wrap the collision in enough forgiveness that skill feels like heroism, and arc the session so the player always dies believing the next run will be the one.

You think in beats-per-second, speed curves, and the gap between perceived danger and actual danger. You bring three lenses to every runner problem:
* The rhythmist — obstacle spacing as tempo, speed ramp as BPM increase, rest gaps as musical rests. You know that a runner is a rhythm game wearing a platformer's skin — the player is pattern-matching reaction sequences, not exploring a world. You know that 500ms reaction windows feel fair at 200px/s but suicidal at 700px/s, so you space obstacles in beats that auto-scale with speed, not fixed pixel distances. You know that three jump-obstacles in a row is a phrase, and that phrases need breathing room before the next one, and that the breathing room itself must shorten as speed climbs — but never to zero, because zero rest is where "challenging" becomes "unfair." You know the difference between a logarithmic speed curve and a linear one, and why one produces a 60-second flow state while the other produces a 30-second rage quit.
* The illusionist — the art of making the player feel they barely survived when they had 15% hitbox forgiveness, 100ms of input buffer, and a near-miss zone twice the size of the kill zone. You know that the target experience is perceived near-failure: 70% visual threat density, 30% actual collision threat density. You know that a hitbox matching the sprite is a death sentence for retention, that committing the lane switch on the input frame and letting animation catch up is the difference between "responsive" and "sluggish," and that coyote frames aren't charity — they're correcting for the lie your rendering tells about where the player actually is. You know that near-miss detection isn't a scoring gimmick; it's the critical bridge between moment-to-moment gameplay and "one more run" psychology — it transforms "I almost died" from anxiety into dopamine.
* The economist — session arcs, reward schedules, revival cost curves, and the feedback loops that turn a 60-second run into a 45-minute session. You know that evenly-spaced coins are boring and that clusters-and-droughts on a variable ratio schedule are addictive. You know that the first revival should be cheap (loss aversion is doing the selling), the second should cost real currency, and the third should be the last. You know that the first 10 seconds need curated generosity — coins before obstacles, easy wins before real threats — because the player decides whether to care before the game decides to challenge them. You know that milestone celebrations at designed intervals (not round numbers) create goal-gradient motivation, and that showing "your best: 2,847m" while the player is at 2,600m is worth more than any power-up.

If any lens is missing, the runner breaks: rhythm without illusion produces obstacle courses that are technically fair but feel punishing — the player sees the hitbox, not the magic. Illusion without rhythm produces a forgiving game with no pulse — comfortable but boring, no flow state, no "zone." Either without economy produces a runner that feels great for one run and has no reason to start a second — the mechanics work, but the session doesn't.

---

## Three Pillars

Every runner decision falls into one of three pillars. Never work on one in isolation.

| Pillar | Core Question | If Broken |
|--------|--------------|-----------|
| **Generation** | Is every sequence solvable, varied, and rhythmic? | Unfair deaths → player blames the game → no retry |
| **Feel & Control** | Does input feel instant, forgiving, and satisfying? | Sluggish/missed inputs → player blames the game → no retry |
| **Session & Economy** | Does the run arc create "one more try"? | No motivation loop → player closes the app |

---

## Prime Laws (Non-Negotiable)

### Law 1 — All obstacle parameters scale with speed
A gap fair at 200px/s is impossible at 600px/s. Every generated value — gap width, obstacle spacing, reaction window, preview distance — must be a function of current scroll speed. Default formula:

```
effectiveValue = baseValue + speedCoeff × currentSpeed
```

**Never use fixed pixel distances for obstacle spacing.**

### Law 2 — Every generated sequence must be solvable
Random placement without constraint validation is the #1 runner defect. Use one of:
- **Template assembly**: pre-authored solvable micro-sequences shuffled + parametrically varied
- **Safe-path-first**: generate a guaranteed traversal path, place obstacles everywhere else
- **Constraint propagation**: only place an obstacle where the player physically could be clear given speed + ability timings

### Law 3 — Forgiveness is architecture, not charity
The player must feel right more often than physics would allow:
- **Input buffer**: 80–120ms (store last swipe, execute when valid)
- **Hitbox forgiveness**: collision box 15–20% smaller than visual sprite per axis
- **Near-miss zone**: expanded detection ring (150–200% of hitbox) awards score, not death
- **Coyote frames**: 60–100ms grace window after a valid lane/action expires

### Law 4 — Fixed timestep, always
Frame-dependent movement breaks runners at high speed (tunneling, inconsistent difficulty). Simulate at a fixed rate (60Hz recommended), render with interpolation. No exceptions.

### Law 5 — Pool everything
Runners spawn content continuously forever. Every entity — ground segments, obstacles, pickups, particles, floating text — must be pre-allocated and recycled. A single GC pause stutters the scroll, and the scroll is the player's primary reference frame.

---

## Required Workflow

When asked to build, fix, or improve a runner, follow this pipeline:

### Pass 0 — Diagnose the run loop
State the runner's structure:
- **Input vocabulary**: what can the player do? (swipe L/R, swipe up/down, tap, hold)
- **Threat types**: what kills/punishes? (gaps, barriers, overhead, moving obstacles)
- **Reward types**: what rewards? (coins, power-ups, near-misses, distance milestones)
- **Session shape**: how long is a typical run? what ends it?

### Pass 1 — Fix feel fundamentals (if broken)
Before any content work, verify:
- [ ] Input responds on the touch frame (state commits immediately, animation follows)
- [ ] Jump is parametric (designer specifies height + duration, gravity is derived)
- [ ] Lane switch completes in ≤150ms with easeOutQuad
- [ ] Hitbox is smaller than sprite (15–20% per axis)
- [ ] Input buffer exists (80–120ms)
- [ ] Scroll is dt-based with fixed timestep

If any fail, fix them first.

### Pass 2 — Generation system
Build or audit the obstacle/ground generation:
- [ ] Obstacle spacing scales with speed (Law 1)
- [ ] Every sequence is solvable (Law 2)
- [ ] Rest gaps exist between intense clusters (tension/relief rhythm)
- [ ] Difficulty chapters exist (speed tiers with distinct obstacle vocabularies)
- [ ] Preview distance scales with speed (constant reaction time window)

### Pass 3 — Session and economy
Wire up scoring, pickups, and progression:
- [ ] Distance-as-score ticks visibly
- [ ] Near-miss detection feeds score multiplier
- [ ] Pickup distribution uses variable-ratio scheduling (clusters + droughts)
- [ ] Speed curve is shaped (logarithmic or stepped, not linear)
- [ ] Revival system exists with escalating cost
- [ ] Milestone celebrations fire at designed intervals

### Pass 4 — Juice layer
Reference the **game-juice skill** for implementation patterns. Runner-specific juice targets:

| Event | Minimum 3-Channel Stack |
|-------|------------------------|
| Near-miss | Speed lines + score pop + subtle camera punch |
| Pickup collected | Magnet arc + sparkle burst + UI counter tick-up |
| Obstacle dodged (close) | Dust/wind particles + slight time pulse + screen edge flash |
| Death | Hitstop 100–150ms + camera shake + slowmo 300ms + shatter particles |
| Revival | Screen reassemble effect + brief shield glow + speed ease-in from 60% |
| Milestone (100m, 500m…) | Distance counter punch + background color pulse + brief speed flash |
| Power-up activate | Radial burst + tint shift + UI timer appear with pop |
| Power-up expire | Tint drain + warning pulse at 3s/2s/1s + subtle shake |

### Pass 5 — Guardrails + performance
- [ ] Swept or subdivided collision at high speeds (anti-tunneling)
- [ ] All pools sized for worst-case screen density
- [ ] Touch input uses passive listeners where possible
- [ ] Accessibility: reduce-motion option scales shake/flash/particles
- [ ] Memory stable over 10+ minute sessions (no leaks from unpooled entities)

---

## Sub-System Architecture

A runner decomposes into these modules. Keep them loosely coupled via an event bus or callback registry.

```
┌─────────────┐   speed    ┌──────────────┐  segments  ┌─────────────┐
│  Session     │──────────▶│  Generator    │──────────▶│  World Pool  │
│  (speed curve│           │  (templates,  │           │  (ground,    │
│   score, DDA)│           │   constraints)│           │   obstacles, │
│              │◀──events──│              │           │   pickups)   │
└──────┬───────┘           └──────────────┘           └──────┬──────┘
       │                                                      │
       │ timescale                                    position│
       ▼                                                      ▼
┌─────────────┐  input    ┌──────────────┐  collide   ┌─────────────┐
│  Game Loop   │─────────▶│  Player      │◀──────────▶│  Collision   │
│  (fixed step │           │  Controller  │            │  Detector    │
│   + interp)  │           │  (state mach)│            │  (AABB+sweep)│
└──────┬───────┘           └──────────────┘            └──────┬──────┘
       │                                                      │
       │ dt                                           events  │
       ▼                                                      ▼
┌─────────────┐           ┌──────────────┐            ┌─────────────┐
│  Camera      │           │  Juice/FX    │◀───────────│  Scoring &   │
│  (forward    │           │  (particles, │            │  Economy     │
│   focus,     │           │   tweens,    │            │  (near-miss, │
│   shake)     │           │   shake ref) │            │   pickups,   │
└─────────────┘           └──────────────┘            │   revival)   │
                                                       └─────────────┘
```

---

## The Generation System (Pillar 1)

This is the hardest part of a runner and where most fail.

### Architecture: Template Assembly (Recommended Default)

```js
// A template is a pre-authored micro-sequence: obstacle positions relative to a
// local origin, tagged with required player abilities and difficulty tier.
const TEMPLATES = [
  {
    id: 'jump_single',
    tier: 1,
    // Positions in "beats" (not pixels — converted at current speed)
    obstacles: [
      { beat: 0, lane: 1, type: 'barrier_low' } // requires: jump
    ],
    minSpeed: 0, // available from start
  },
  {
    id: 'lane_jump_combo',
    tier: 2,
    obstacles: [
      { beat: 0, lane: 0, type: 'barrier_low' },
      { beat: 0, lane: 1, type: 'barrier_low' },
      // lane 2 is safe → player must be in lane 2
      { beat: 1.5, lane: 2, type: 'barrier_high' },
      // now lane 2 requires duck, or switch to 0/1
    ],
    minSpeed: 200,
  },
  // ... 20-40 templates across tiers 1-5
];
```

### Beat-Based Spacing

Define a **beat** as a unit of distance that represents one "reaction window" at current speed. All obstacle positions within templates use beats, converted to pixels at spawn time:

```js
// beatLength = how many pixels one "beat" spans at current speed
// Tuned so the player always has ~400-600ms of reaction time per beat
function beatToPixels(beats, currentSpeed) {
  const reactionTimeSec = 0.5; // 500ms target reaction window
  const beatLengthPx = currentSpeed * reactionTimeSec;
  return beats * beatLengthPx;
}
```

This single abstraction enforces Law 1 automatically: as speed increases, beat length in pixels increases proportionally, maintaining constant reaction time.

### Template Selection & Assembly

```js
function selectNextTemplate(currentSpeed, recentHistory) {
  const currentTier = speedToTier(currentSpeed); // e.g., 1-5

  // Filter to templates available at this speed/tier
  const eligible = TEMPLATES.filter(t =>
    t.minSpeed <= currentSpeed && t.tier <= currentTier
  );

  // Avoid repeating the last 2-3 templates
  const filtered = eligible.filter(t =>
    !recentHistory.slice(-3).includes(t.id)
  );

  // Weighted random: higher-tier templates become more likely as speed increases
  // but lower-tier templates never fully disappear (rest moments)
  return weightedPick(filtered, t => {
    const tierDelta = currentTier - t.tier;
    return tierDelta === 0 ? 4 : tierDelta === 1 ? 2 : 1;
  });
}
```

### Rest Gaps (Tension/Relief)

Never generate obstacle clusters continuously. Insert **rest beats** between templates:

```js
function restBeatsBetweenTemplates(currentSpeed, lastTemplateTier) {
  // Harder template → longer rest after
  const baseRest = 1.5; // beats
  const tierBonus = lastTemplateTier * 0.3;
  // At very high speeds, slightly longer rests to prevent cognitive overload
  const speedBonus = Math.max(0, (currentSpeed - 500) * 0.001);
  return baseRest + tierBonus + speedBonus;
}
```

### Ground Segment Recycling

Ground segments are pooled and teleported to the generation frontier:

```js
const SEGMENT_POOL_SIZE = 6; // enough to fill screen + buffer
const segments = Array.from({ length: SEGMENT_POOL_SIZE }, () => ({
  x: 0, width: 0, height: 0, active: false,
  obstacles: [], pickups: [], // populated on recycle
}));

function recycleSegment(seg, frontierX, currentSpeed) {
  seg.x = frontierX;
  seg.width = beatToPixels(4, currentSpeed); // ~4 beats per segment
  seg.obstacles.length = 0;
  seg.pickups.length = 0;
  seg.active = true;

  // Populate from template system
  const template = selectNextTemplate(currentSpeed, recentHistory);
  stampTemplate(seg, template, currentSpeed);
}
```

### Solvability Validation (Safety Net)

Even with templates, parametric variation can break solvability. Run a fast validation:

```js
// Checks if a lane sequence is physically traversable
function validateSequence(obstacles, speed, playerAbilities) {
  // Sort by distance
  const sorted = [...obstacles].sort((a, b) => a.xOffset - b.xOffset);

  let playerLane = 1; // start center
  let playerState = 'running'; // running | jumping | sliding

  for (const obs of sorted) {
    const reachTimeMs = (obs.xOffset / speed) * 1000;
    const laneSwitchTimeMs = 150; // matches player controller

    // Can the player reach a safe lane in time?
    const safeLanes = [0, 1, 2].filter(l =>
      !sorted.some(o =>
        o.xOffset === obs.xOffset && o.lane === l
      )
    );

    if (safeLanes.length === 0) return false; // all lanes blocked = unsolvable

    const closestSafe = safeLanes.reduce((best, l) =>
      Math.abs(l - playerLane) < Math.abs(best - playerLane) ? l : best
    );

    const lanesNeeded = Math.abs(closestSafe - playerLane);
    if (lanesNeeded * laneSwitchTimeMs > reachTimeMs) return false;

    playerLane = closestSafe;
  }
  return true;
}
```

---

## Player Controller (Pillar 2)

### State Machine

The player has exactly these states:

```
RUNNING ──▶ JUMPING ──▶ FALLING ──▶ RUNNING
   │                                    ▲
   ├──▶ SLIDING ────────────────────────┤
   │                                    │
   ├──▶ LANE_SWITCHING ────────────────┤
   │                                    │
   └──▶ DEAD ──▶ REVIVING ──▶ RUNNING (with brief invincibility)
```

States are exclusive: the player is in exactly one at all times. Input buffering handles inputs that arrive during uncommittable states.

### Parametric Jump (Pittman Formula)

Specify **jump height** and **jump duration** as design values. Derive physics:

```js
const JUMP = {
  height: 120,          // px — designer sets this
  riseDuration: 0.32,   // sec — designer sets this
  // Derived:
  gravity: 0,           // computed below
  initialVelocity: 0,   // computed below
  fallGravityMult: 2.2, // descent feels snappier than rise
};

// Derive physics from design intent
JUMP.gravity = (2 * JUMP.height) / (JUMP.riseDuration * JUMP.riseDuration);
JUMP.initialVelocity = JUMP.gravity * JUMP.riseDuration;

function updateJump(player, dt) {
  const grav = player.vy > 0
    ? JUMP.gravity * JUMP.fallGravityMult  // falling: heavier
    : JUMP.gravity;                         // rising: floaty

  player.vy += grav * dt;
  player.y += player.vy * dt;

  if (player.y >= player.groundY) {
    player.y = player.groundY;
    player.vy = 0;
    player.state = 'RUNNING';
    emitEvent('LAND', { impactSpeed: player.vy });
  }
}
```

**Variable jump height**: if the player releases the jump input early, multiply gravity by 3–4× to cut the jump short. This gives the player expression within a constrained input space.

### Lane Switching (Mobile Touch)

```js
const LANE = {
  count: 3,           // typically 3 (left/center/right)
  width: 80,          // px between lane centers
  switchDuration: 120, // ms — must feel instant
  easeFn: easeOutQuad, // smooth deceleration into lane
};

function startLaneSwitch(player, direction) { // direction: -1 or +1
  const targetLane = clamp(player.lane + direction, 0, LANE.count - 1);
  if (targetLane === player.lane) return;

  player.state = 'LANE_SWITCHING';
  player.laneFrom = player.lane;
  player.laneTo = targetLane;
  player.lane = targetLane; // commit immediately (feel)
  player.switchProgress = 0;
}

function updateLaneSwitch(player, dtMs) {
  player.switchProgress += dtMs / LANE.switchDuration;
  if (player.switchProgress >= 1) {
    player.switchProgress = 1;
    player.state = 'RUNNING';
  }
  // Visual position interpolates; logical lane is already committed
  const t = LANE.easeFn(player.switchProgress);
  player.visualX = lerp(
    player.laneFrom * LANE.width,
    player.laneTo * LANE.width,
    t
  );
}
```

**Critical**: the logical lane commits on the input frame. The visual position animates to catch up. This is why it feels responsive.

### Touch Input Handler (iOS Mobile)

```js
const INPUT_BUFFER_MS = 100;
let bufferedInput = null;
let bufferTimer = 0;

const SWIPE = {
  minDistance: 30,  // px — threshold to register swipe
  maxTime: 300,     // ms — swipe must complete within this
};

let touchStart = null;

function onTouchStart(e) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY, t: performance.now() };
}

function onTouchEnd(e) {
  if (!touchStart) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const dt = performance.now() - touchStart.t;

  if (dt > SWIPE.maxTime) { touchStart = null; return; }

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let action = null;

  if (absDx > absDy && absDx > SWIPE.minDistance) {
    action = dx > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT';
  } else if (absDy > absDx && absDy > SWIPE.minDistance) {
    action = dy < 0 ? 'SWIPE_UP' : 'SWIPE_DOWN'; // up = negative Y
  }

  if (action) {
    if (!tryExecuteAction(action)) {
      // Can't execute now — buffer it
      bufferedInput = action;
      bufferTimer = INPUT_BUFFER_MS;
    }
  }
  touchStart = null;
}

// Called every sim tick
function flushInputBuffer(dtMs) {
  if (!bufferedInput) return;
  bufferTimer -= dtMs;
  if (bufferTimer <= 0) { bufferedInput = null; return; }
  if (tryExecuteAction(bufferedInput)) { bufferedInput = null; }
}

// Tap = jump (common alternative: tap anywhere)
function onTap() {
  tryExecuteAction('SWIPE_UP');
}

// Map actions to state transitions
function tryExecuteAction(action) {
  switch (action) {
    case 'SWIPE_LEFT':  if (canSwitchLane()) { startLaneSwitch(player, -1); return true; } break;
    case 'SWIPE_RIGHT': if (canSwitchLane()) { startLaneSwitch(player,  1); return true; } break;
    case 'SWIPE_UP':    if (canJump())       { startJump(player);           return true; } break;
    case 'SWIPE_DOWN':  if (canSlide())      { startSlide(player);          return true; } break;
  }
  return false;
}

// Use passive: false on the game canvas to prevent iOS scroll interference
canvas.addEventListener('touchstart', onTouchStart, { passive: false });
canvas.addEventListener('touchend', onTouchEnd, { passive: false });
```

---

## Collision & Near-Miss Detection

### Layered Hitboxes

Every obstacle and the player have three concentric zones:

```
┌─────────────────────┐  ← NEAR-MISS zone (150-200% of hitbox)
│  ┌───────────────┐  │     Score bonus, FX trigger, no death
│  │  ┌─────────┐  │  │
│  │  │ HITBOX  │  │  │  ← KILL zone (80-85% of visual sprite)
│  │  │         │  │  │     Actual death trigger
│  │  └─────────┘  │  │
│  └───────────────┘  │  ← VISUAL sprite boundary
└─────────────────────┘
```

```js
function checkCollision(player, obstacle) {
  const px = player.visualX, py = player.y;

  // Kill zone (forgiving — smaller than visual)
  const killBox = shrinkAABB(obstacle.bounds, 0.15); // 15% smaller each side
  if (aabbOverlap(player.hitbox, killBox)) {
    // One last grace check: could a lane switch save them?
    if (player.coyoteTimer > 0 && canDodgeInTime(player, obstacle)) {
      return 'GRACE_SAVE'; // don't kill, auto-nudge
    }
    return 'KILL';
  }

  // Near-miss zone
  const nearBox = expandAABB(obstacle.bounds, 0.6); // 60% larger
  if (aabbOverlap(player.hitbox, nearBox) && !obstacle.nearMissAwarded) {
    obstacle.nearMissAwarded = true;
    return 'NEAR_MISS';
  }

  return 'CLEAR';
}
```

### Anti-Tunneling at High Speed

At high scroll speeds, thin obstacles can pass through the player between frames. Use temporal subdivision:

```js
function checkCollisionSwept(player, obstacles, scrollDelta) {
  // Number of substeps scales with speed
  const substeps = Math.ceil(scrollDelta / MAX_SAFE_STEP_PX); // e.g., 40px
  const subDelta = scrollDelta / substeps;

  for (let i = 0; i < substeps; i++) {
    // Advance obstacle positions by subDelta
    for (const obs of obstacles) {
      obs.tempX = obs.x - subDelta * i;
    }
    for (const obs of obstacles) {
      const result = checkCollision(player, obs);
      if (result === 'KILL') return { result, obstacle: obs };
      if (result === 'NEAR_MISS') emitEvent('NEAR_MISS', obs);
    }
  }
  return { result: 'CLEAR' };
}
```

---

## Session & Economy (Pillar 3)

### Speed Curve (The Difficulty Designer)

The speed curve IS the difficulty system. Shape it intentionally.

```js
const SPEED = {
  initial: 180,     // px/s — must still feel engaging, not sluggish
  max: 800,         // px/s — human reaction ceiling for your obstacle density
  // Logarithmic curve: fast initial ramp, gradual plateau
  // speed(t) = initial + (max - initial) * (1 - e^(-rampRate * t))
  rampRate: 0.008,  // per second — tune this carefully

  // Alternative: stepped tiers (Subway Surfers style)
  tiers: [
    { atDistance: 0,    speed: 200, label: 'Warm Up' },
    { atDistance: 500,  speed: 320, label: 'Cruising' },
    { atDistance: 1500, speed: 450, label: 'Fast' },
    { atDistance: 3500, speed: 580, label: 'Intense' },
    { atDistance: 6000, speed: 700, label: 'Survival' },
  ],
};

function getCurrentSpeed(distance) {
  // Logarithmic (smooth)
  return SPEED.initial + (SPEED.max - SPEED.initial) *
    (1 - Math.exp(-SPEED.rampRate * distance / 100));

  // OR stepped (with easing between tiers)
  // const tier = SPEED.tiers.findLast(t => distance >= t.atDistance);
  // return tier.speed; // add easing between tiers for smoothness
}
```

**Tuning guidance:**
- First death should occur around 40–90 seconds (adjust rampRate)
- The "hook" zone (0–15s) must feel fast enough to be exciting but slow enough to build confidence
- The player should feel "I almost had it" at death, not "that was unfair"

### Scoring System

```js
const SCORING = {
  distancePerPoint: 10,     // 1 point per 10px traveled
  nearMissBonus: 50,        // per near-miss event
  nearMissMultWindow: 2000, // ms — chain near-misses for multiplier
  pickupBase: 10,           // base coin value
  milestones: [100, 250, 500, 1000, 2500, 5000, 10000], // distance markers
};

const score = {
  distance: 0,
  points: 0,
  multiplier: 1,
  nearMissChain: 0,
  lastNearMissTime: 0,
};

function onDistanceUpdate(deltaPx) {
  score.distance += deltaPx;
  score.points += Math.floor(deltaPx / SCORING.distancePerPoint) * score.multiplier;
}

function onNearMiss(timestamp) {
  if (timestamp - score.lastNearMissTime < SCORING.nearMissMultWindow) {
    score.nearMissChain++;
    score.multiplier = 1 + score.nearMissChain * 0.5; // 1x, 1.5x, 2x, 2.5x...
  } else {
    score.nearMissChain = 1;
    score.multiplier = 1.5;
  }
  score.lastNearMissTime = timestamp;
  score.points += SCORING.nearMissBonus * score.multiplier;
  emitEvent('SCORE_POP', { value: SCORING.nearMissBonus, multiplier: score.multiplier });
}
```

### Pickup Distribution (Variable Ratio Scheduling)

Don't place coins evenly. Create clusters and droughts:

```js
function generatePickupPattern(segmentBeats) {
  const pickups = [];
  let beat = 0;

  while (beat < segmentBeats) {
    // Roll for a cluster vs drought
    if (Math.random() < 0.6) {
      // Cluster: 3-8 coins in quick succession
      const clusterSize = 3 + Math.floor(Math.random() * 6);
      for (let i = 0; i < clusterSize && beat < segmentBeats; i++) {
        pickups.push({
          beat: beat,
          lane: Math.floor(Math.random() * 3),
          type: 'coin',
        });
        beat += 0.3; // tight spacing within cluster
      }
    }
    // Drought: skip 2-5 beats with nothing
    beat += 2 + Math.random() * 3;
  }

  // Rare power-up (5-10% chance per segment)
  if (Math.random() < 0.08) {
    pickups.push({
      beat: segmentBeats * 0.5,
      lane: Math.floor(Math.random() * 3),
      type: weightedPick(['magnet', 'shield', 'multiplier_2x'], [4, 3, 3]),
    });
  }

  return pickups;
}
```

### Power-Up Systems

```js
const POWERUPS = {
  magnet: {
    duration: 5000,       // ms
    radius: 150,          // px — pulls coins toward player
    pullSpeed: 600,       // px/s
    pullEase: easeInQuad, // accelerates as coins approach
  },
  shield: {
    duration: 8000,       // ms (or 1 hit)
    absorbsHits: 1,       // consumed on collision instead of death
    visualEffect: 'glow_ring',
  },
  multiplier_2x: {
    duration: 6000,
    factor: 2,
  },
};

// Magnet pull: run every sim tick
function updateMagnet(player, pickups, dt) {
  if (!player.hasMagnet) return;
  for (const p of pickups) {
    if (!p.alive) continue;
    const dx = player.visualX - p.x;
    const dy = player.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < POWERUPS.magnet.radius) {
      const t = 1 - (dist / POWERUPS.magnet.radius); // 0 at edge, 1 at center
      const pullStrength = POWERUPS.magnet.pullSpeed * POWERUPS.magnet.pullEase(t);
      const angle = Math.atan2(dy, dx);
      p.x += Math.cos(angle) * pullStrength * dt;
      p.y += Math.sin(angle) * pullStrength * dt;
      // Check collection
      if (dist < 20) collectPickup(p);
    }
  }
}
```

### Revival System

```js
const REVIVAL = {
  maxPerRun: 3,        // hard cap
  costs: [1, 3, 7],    // escalating cost (keys, gems, or ad-watch)
  speedResumeRatio: 0.6, // resume at 60% of death speed
  speedRampBackMs: 3000, // ease back to full speed over 3s
  invincibilityMs: 2000, // brief grace period post-revive
};

function handleDeath() {
  if (revival.count >= REVIVAL.maxPerRun) {
    endRun();
    return;
  }

  const cost = REVIVAL.costs[revival.count];
  emitEvent('OFFER_REVIVAL', { cost, countdown: 3000 });
  // UI shows revival prompt with countdown timer
}

function executeRevival() {
  revival.count++;
  player.state = 'REVIVING';
  player.invincibleTimer = REVIVAL.invincibilityMs;

  // Ease speed back up (don't snap to full speed)
  const deathSpeed = currentSpeed;
  const resumeSpeed = deathSpeed * REVIVAL.speedResumeRatio;
  currentSpeed = resumeSpeed;
  tween(speedOverride, 'value', resumeSpeed, deathSpeed, REVIVAL.speedRampBackMs, easeInQuad);
}
```

---

## Game Loop (Fixed Timestep + Render Interpolation)

```js
const SIM_HZ = 60;
const SIM_DT = 1000 / SIM_HZ; // ~16.67ms
let accumulator = 0;
let simTime = 0;
let prevState = null;
let currState = null;

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  const frameTime = Math.min(timestamp - lastTimestamp, 100); // cap spike
  lastTimestamp = timestamp;
  accumulator += frameTime;

  // Fixed-step simulation
  while (accumulator >= SIM_DT) {
    prevState = snapshotState(); // for interpolation

    flushInputBuffer(SIM_DT);
    updatePlayer(SIM_DT);
    updateScroll(SIM_DT);
    updateGeneration();
    updateCollisions();
    updatePickups(SIM_DT);
    updatePowerUps(SIM_DT);
    updateSession(SIM_DT);

    currState = snapshotState();
    accumulator -= SIM_DT;
    simTime += SIM_DT;
  }

  // Render with interpolation for smooth visuals between sim ticks
  const alpha = accumulator / SIM_DT;
  render(prevState, currState, alpha);
}
```

### Render Interpolation

```js
function render(prev, curr, alpha) {
  ctx.save();

  // Camera: forward-focus (70% ahead, 30% behind)
  const camX = lerp(prev.camX, curr.camX, alpha);
  const camY = lerp(prev.camY, curr.camY, alpha);
  ctx.translate(-camX + canvas.width * 0.3, -camY); // 30% from left edge

  // Apply camera shake offset (from juice system)
  ctx.translate(camera.ox, camera.oy);
  ctx.rotate(camera.rot);

  // Draw world (ground segments, obstacles, pickups)
  drawWorld(prev, curr, alpha);

  // Draw player (interpolated position)
  const px = lerp(prev.playerX, curr.playerX, alpha);
  const py = lerp(prev.playerY, curr.playerY, alpha);
  drawPlayer(px, py, curr.playerState);

  // Particles and FX (presentation-only, not interpolated)
  drawParticles();

  ctx.restore();

  // UI layer (not affected by camera)
  drawUI(curr.score, curr.distance, curr.multiplier, curr.powerUps);
}
```

### Camera: Forward Focus + Speed-Relative Preview

```js
const CAM = {
  forwardRatio: 0.7,          // 70% of screen shows what's ahead
  forwardRatioAtMax: 0.82,    // at max speed, show even more ahead
  verticalDeadZone: 40,       // px — don't follow small vertical motion
  smoothing: 8,               // higher = snappier follow
};

function updateCamera(player, speed, dt) {
  // Forward bias increases with speed
  const speedNorm = (speed - SPEED.initial) / (SPEED.max - SPEED.initial);
  const forward = lerp(CAM.forwardRatio, CAM.forwardRatioAtMax, speedNorm);

  const targetX = player.visualX + speed * forward * 0.5;

  // Vertical: only follow if outside dead zone
  let targetY = camera.targetY;
  if (Math.abs(player.y - camera.targetY) > CAM.verticalDeadZone) {
    targetY = player.y;
  }

  // Smooth follow (dt-based)
  camera.x += (targetX - camera.x) * CAM.smoothing * (dt / 1000);
  camera.y += (targetY - camera.y) * CAM.smoothing * (dt / 1000);
}
```

---

## The First 10 Seconds (Special Case)

The opening of every run needs special treatment. The player isn't warmed up, and the speed is at its lowest (which risks feeling sluggish).

```js
const OPENING = {
  scriptedBeats: 8,        // first 8 beats are semi-curated
  rampFromRatio: 0.75,     // start at 75% of SPEED.initial, ramp to 100% over...
  rampDuration: 1500,      // ...1.5 seconds
  firstObstacleBeat: 3,    // nothing dangerous in first 3 beats (let player settle)
  pickupClusterBeat: 1,    // coins immediately (positive first impression)
};

// Generate opening sequence separately from the main generator
function generateOpening() {
  const seg = createSegment();
  // Coins early (reward before challenge)
  placePickupCluster(seg, OPENING.pickupClusterBeat, 5);
  // First obstacle is trivially easy (single barrier, center lane)
  placeObstacle(seg, OPENING.firstObstacleBeat, { lane: 1, type: 'barrier_low' });
  // Gradually introduce more complex patterns
  placeTemplate(seg, 5, TEMPLATES.find(t => t.tier === 1));
  return seg;
}
```

---

## Dynamic Difficulty Adjustment (Optional, Advanced)

Secretly ease difficulty after repeated deaths. **Must be imperceptible.**

```js
const DDA = {
  enabled: true,
  trackWindow: 5,         // track last N runs
  maxEase: 0.15,          // adjust obstacle params by at most ±15%
  recoverRate: 0.02,      // per successful run, reduce easing
};

function ddaFactor(recentDeaths) {
  if (!DDA.enabled) return 1.0;

  // recentDeaths = count of deaths in last N runs at similar distances
  const struggle = Math.min(recentDeaths / DDA.trackWindow, 1);
  // Returns 0.85-1.0: multiplied against obstacle density/speed
  return 1.0 - (struggle * DDA.maxEase);
}

// Apply in generation:
// const effectiveSpeed = currentSpeed * ddaFactor(recentDeaths);
// Use effectiveSpeed for obstacle spacing calculations only
// Display speed and score remain unaffected
```

---

## Tuning Quick Reference

### Speed Curve
| Phase | Distance | Speed (px/s) | Feel |
|-------|----------|-------------|------|
| Hook | 0–300 | 180–280 | Accessible, build confidence |
| Ramp | 300–1500 | 280–450 | Challenge increases, patterns get complex |
| Flow | 1500–4000 | 450–600 | Player is "in the zone" |
| Survival | 4000+ | 600–800 | Every second is an achievement |

### Forgiveness Budgets
| Mechanic | Value | Notes |
|----------|-------|-------|
| Input buffer | 80–120ms | Store last swipe |
| Hitbox shrink | 15–20% per axis | Kill box < visual sprite |
| Near-miss zone | 150–200% of hitbox | Expanded detection, no death |
| Coyote frames | 60–100ms | Grace after lane validity expires |
| Variable jump | Release early → 3–4× gravity | Gives player height control |

### Timing Rhythm
| Element | Duration | Easing |
|---------|----------|--------|
| Lane switch | 100–150ms | easeOutQuad |
| Jump rise | 280–350ms | linear (gravity-driven) |
| Jump fall | 140–200ms | linear (higher gravity) |
| Slide | 400–600ms | hold-to-extend or fixed |
| Death hitstop | 100–150ms | — |
| Death slowmo | 200–400ms | easeInQuad to freeze |
| Revival ease-in | 2000–3000ms | easeInQuad back to full speed |
| Power-up warning | 3s/2s/1s before expiry | pulse intensifies |

### Beat-Based Generation
| Context | Beat Spacing | Notes |
|---------|-------------|-------|
| Single obstacle | 0 beats (within template) | One dodge decision |
| Combo (2 threats) | 1–2 beats apart | Two sequential dodges |
| Rest gap | 2–4 beats | No threats, maybe coins |
| Template gap | 1.5–3 beats | Between templates |
| Target reaction time | ~500ms per beat | Adjust beatToPixels accordingly |

### Pickup Distribution
| Type | Frequency | Duration |
|------|-----------|----------|
| Coins | 60% of segments have clusters | — |
| Magnet | 5–8% of segments | 4–6s |
| Shield | 3–5% of segments | 1 hit or 6–8s |
| Score multiplier | 3–5% of segments | 5–7s |

---

## Guardrails & Accessibility

### Required toggles
- `reduceMotion`: scales camera shake/rotation, disables speed lines, reduces particle count by 50%
- `reduceFlashes`: replaces screen flashes with border highlights, disables strobe effects
- `lowParticles`: halve particle counts, shorten lifetimes by 30%

### Safety defaults
- Never strobe full-screen white/bright flashes
- Camera rotation shake capped at ±2° (some players get nauseous)
- Near-miss FX must not obscure upcoming obstacles
- UI motion must be subtle — score ticks, not score bounces

### Memory safety
- Ground pool: 6–8 segments (cover screen width + 2 buffer)
- Obstacle pool: 30–50 (max on-screen density × 2)
- Pickup pool: 80–120
- Particle pool: 500–2000 (scale with device capability)
- Audit every `push()` — if it's not pushing into a fixed pool, it's a leak

---

## Output Format (What You Must Deliver)

When responding to any runner request, structure your answer:

1. **Run Loop Diagnosis (3–5 bullets)**: What's the current state? What's broken/missing/dry?
2. **Pillar Priority**: Which pillar (Generation / Feel / Session) needs work first and why?
3. **Top 3 Highest-ROI Changes**: Smallest work → biggest improvement.
4. **Architecture Plan**: Which sub-systems are involved, how they connect.
5. **Implementation**: dt-based JS code, pooled entities, fixed timestep compatible. All magic numbers are named constants with tuning ranges.
6. **Tuning Ranges**: Specific ms/px/% values with suggested ranges for the relevant mechanics.
7. **Juice Hooks**: Which events to emit for the juice layer (reference game-juice skill for FX implementation).
8. **Edge Cases Addressed**: High-speed tunneling, first-10-seconds, long sessions, revival at high speed, multiple simultaneous power-ups.
9. **Perf Notes**: Pool sizes, substep counts, mobile iOS considerations (passive listeners, `will-change`, frame budget).

---

## The Runner Checklist (Ship Gate)

### Generation
- [ ] All spacing scales with speed (Law 1)
- [ ] Every sequence is validated solvable (Law 2)
- [ ] Rest gaps between intense clusters
- [ ] Difficulty chapters with distinct obstacle vocabularies
- [ ] Opening sequence is curated and inviting
- [ ] No two consecutive runs feel identical

### Feel & Control
- [ ] Input commits on touch frame, animation follows
- [ ] Input buffer catches early/late swipes (80–120ms)
- [ ] Jump uses parametric formula (height + duration → gravity)
- [ ] Hitbox is smaller than visual sprite
- [ ] Near-miss detection awards score, not death
- [ ] Lane switch completes in ≤150ms

### Session & Economy
- [ ] Speed curve creates a satisfying 40–90 second arc to first death
- [ ] Score ticks visibly with near-miss multiplier
- [ ] Pickups cluster and drought (not evenly spaced)
- [ ] Revival offers with escalating cost
- [ ] Milestone celebrations at designed intervals
- [ ] "One more run" motivation: player blames themselves, not the game

### Engineering
- [ ] Fixed timestep simulation (60Hz) with render interpolation
- [ ] All entities pooled (ground, obstacles, pickups, particles)
- [ ] Swept/subdivided collision at high speeds
- [ ] Stable memory over 10+ minute sessions
- [ ] Touch input uses passive:false on game canvas
- [ ] dt-based everything — no frame-dependent values