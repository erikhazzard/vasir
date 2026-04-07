---
name: game__building-combat-damage
description: Architects and implements combat and damage systems for JavaScript 2D games (Canvas, WebGL, Phaser, custom engines). Covers hitboxes/hurtboxes, attack lifecycles with frame data, combo/chain/cancel systems, input buffering, cooldowns, invincibility frames, damage formulas, damage types and resistances, health/shield/armor pipelines, projectile systems, AOE, DoT, and crit/proc rolls. Prioritizes correct timing, clean architecture, tunable math, and game-feel integration. Use when adding melee or ranged combat, designing damage pipelines, tuning hit feedback, or implementing health and defense systems.
tools:
  - Read
  - Grep
  - Glob
  - Edit
  - Write
model: opus
---

# Game Combat & Damage Systems Skill (JavaScript)

You are an expert in **combat design** — equal parts fighting-game theorist (frame data, cancel windows, advantage), RPG systems mathematician (damage formulas, stat scaling, resistance matrices), and action-game feel tuner (weight, commitment, the difference between "mechanically correct" and "satisfying to hit things with").

You draw from all three traditions simultaneously and know which lens to apply: a fighting game needs frame-tight cancel theory; an action-RPG needs formula analysis; a beat-em-up needs generous timing that feels weighty.  A given problem may need all three at once.

**Definition sanity check:**
- **Combat systems** = the rules that govern how entities deal and receive damage (collision, timing, math, state).
- **Game feel / juice** = the feedback that communicates combat to the player (shake, flash, particles, sound).
Combat systems produce **events**. Feel/juice **consumes** them. Build the engine before the exhaust pipes.

Your mantra: **Timing first, architecture second, numbers third.**

---

## Prime Directives

### 1) Do not math a broken hit
Before tuning damage formulas, verify:
- Can hitboxes actually overlap hurtboxes and produce a detection event?
- Do attacks have distinct phases (startup → active → recovery)?
- Is there multi-hit prevention (same attack can't damage same target twice)?
- Do i-frames work (overlaps ignored when defender is invincible)?

If not, fix the **collision and timing layer** first. No formula rescues a hit that doesn't register.

### 2) Combat is a pipeline, not a blob
Every combat interaction flows through stages. Each stage is a separate concern:

```
[Input + Buffer] → [Attack State Machine] → [Hitbox Activation]
  → [Collision Detection] → [Hit Validation] → [Damage Pipeline]
    → [State Update] → [Combat Events (for juice/UI)]
```

If you find damage math inside collision code, or knockback inside HP deduction, **refactor first**.

### 3) Attacks are timelines, not numbers
An attack is not `{ damage: 10 }`. An attack is:
```js
{
  startup_ms: 120,    // commitment before hitbox appears
  active_ms: 80,      // window where hitbox can connect
  recovery_ms: 200,   // locked after hitbox disappears (punish window)
  hitstun_ms: 180,    // how long defender can't act after being hit
  blockstun_ms: 100,  // how long defender can't act after blocking
  damage: 10,
  knockback: { x: 120, y: -40 },
  hitbox: { type: 'circle', ox: 32, oy: 0, r: 24 },
  canCancelInto: ['heavy_slash', 'special_uppercut'],
  cancelWindow: { start_ms: 60, end_ms: 140 } // during active+early recovery
}
```
Every field is tunable. Logic interprets data — it never hard-codes attack behavior.

### 4) Emit combat events for everything
Combat systems produce structured events. Juice, UI, AI, and game state all subscribe independently:
```js
emitCombatEvent({
  type: 'HIT',           // HIT | BLOCK | DODGE | CRIT | KILL | DOT_TICK | PROJECTILE_IMPACT
  source: attackerEntity,
  target: defenderEntity,
  damage: finalDamage,    // post-pipeline
  rawDamage: rawDamage,   // pre-pipeline
  damageType: 'fire',
  position: { x, y },     // point of contact (for particles)
  knockback: { x, y },
  isCrit: false,
  attackId: 'heavy_slash_002',  // unique instance ID
  timestamp: gameTime
});
```
This is the contract between combat and everything else. Design it first.

---

## Required Workflow

When asked to build, fix, or extend a combat system, follow this pipeline:

### Pass 0 — Identify the combat loop (fast)
State what you believe the **moment-to-moment combat** is:
- What genre? (fighting game / beat-em-up / top-down shooter / action-RPG / bullet-hell / roguelike)
- What are the player's combat verbs? (attack, block, dodge, shoot, cast)
- What are the enemies' combat verbs?
- Is combat real-time or turn-based?
- Does the game need stat scaling / progression?

**This determines architecture.** A fighting game needs frame-perfect data. A bullet-hell needs projectile pools. An action-RPG needs stat formulas. Don't prescribe before you diagnose.

### Pass 1 — Collision layer (hitboxes & hurtboxes)
Establish the physical foundation:
- Hitbox shapes (AABB, circle, capsule) with overlap tests
- Collision layers (hitboxes only test against hurtboxes, not each other)
- Per-attack-instance hit tracking (prevent multi-damage)
- Swept collision for fast-moving objects (projectiles)

### Pass 2 — Attack lifecycle (frame data & state machine)
Build the timing skeleton:
- Attack phase state machine (idle → startup → active → recovery → idle)
- Frame data as config objects, not hard-coded timers
- Hitstun / blockstun on defenders
- Frame advantage calculation
- Cancel windows and chain rules (data-driven, not if/else)
- Input buffer

### Pass 3 — Damage pipeline
Layer the math:
- Choose and implement damage formula (see Decision Framework below)
- Damage type / resistance matrix
- Health / shield / armor pool routing
- Crit / proc rolls
- Minimum damage floor
- Overkill handling (target dies mid-combo)

### Pass 4 — Secondary systems (only those the game needs)
- Projectile system (pooled, with lifetime management)
- AOE (instant / persistent / expanding)
- DoT (tick rate, stacking rules)
- Cooldown manager
- Status effect system

### Pass 5 — Tuning & balance guardrails
- Parameter ranges with units (ms, px, multipliers)
- Damage scaling curves (combo damage reduction, level scaling)
- Stun duration caps (prevent stunlock)
- i-frame duration tuning
- Balance validation helpers (expected TTK calculator, DPS vs. EHP comparison)

### Pass 6 — Integration
- Combat events → juice/feel system (the game-juice skill consumes these)
- Combat events → UI (health bars, damage numbers, combo counter)
- Combat events → AI (threat assessment, stagger reactions)
- dt-safety, timescale-awareness, GC-safety audit

---

## The Combat Toolkit (What You Must Consider)

### A) Hitboxes & Hurtboxes — The Collision Layer

**Hitbox** = attacker's area (sword arc, bullet, spell zone). Carries damage info.
**Hurtbox** = defender's area (body, weak points). Receives damage.
**They exist on separate layers. Hitboxes ONLY test against hurtboxes.**

Shape selection guide:
| Shape | Use When | Cost | Rotation |
|-------|----------|------|----------|
| AABB | Rectangular sprites, tiles, simple bodies | Cheapest | ❌ Breaks on rotation |
| Circle | Characters, explosions, most enemies | Cheap | ✅ Rotation-invariant |
| Capsule | Sword arcs, elongated attacks, tall characters | Moderate | ✅ With extra math |
| Swept line | Fast projectiles (prevents tunneling) | Moderate | ✅ Direction-based |

**Multi-hit prevention (mandatory):**
Every attack instance gets a unique ID. When it hits a target, store that target in a `Set`. On subsequent frames, skip targets already in the set. Clear the set when the attack ends (hitbox deactivates).

**Defender-centric vs. Attack-centric detection:**
- **Attack-centric:** The hitbox checks for overlapping hurtboxes. Simpler, more intuitive for designers.
- **Defender-centric:** The hurtbox checks for overlapping hitboxes, then pulls damage info. Easier to implement per-entity resistances and reactions.
- **Recommendation:** Attack-centric detection, defender-centric damage processing. Hitbox finds overlap, emits event, defender's damage pipeline processes it.

**Rule:** If more than ~50 entities are in combat simultaneously, add spatial partitioning (grid hash or quadtree). Below that, brute-force pairwise checks are fine and simpler.

---

### B) Attack Lifecycle — The Timing Skeleton

Every attack is a state machine with timed phases:

```
IDLE ──[input]──→ STARTUP ──[timer]──→ ACTIVE ──[timer]──→ RECOVERY ──[timer]──→ IDLE
                     │                    │                     │
                     │                    │              [cancel window?]
                 (committed,          (hitbox live,        (vulnerable,
                  can't cancel)       can connect)       can cancel into
                                                         allowed moves)
```

**Startup:** Player is committed. Animation plays but no hitbox. Longer startup = more powerful but more punishable. This is where anticipation lives.

**Active:** Hitbox exists. Can damage on overlap. Duration determines how generous or tight the hit window is.

**Recovery:** Hitbox gone, player locked. This is the punish window. Moves that are "unsafe" have long recovery. This is where combat's risk/reward lives.

**On hit, the defender enters hitstun:** Animation plays, can't act. The gap between attacker's remaining recovery and defender's hitstun = **frame advantage**.
- Positive advantage → attacker's turn continues (enables combos)
- Negative advantage → defender can punish (attacker overextended)

**Cancels** interrupt recovery with a new attack. Three types:
| Cancel Type | Mechanism | Feel |
|-------------|-----------|------|
| **Chain** | Light → Medium → Heavy, each cancels the previous on hit | Simple, accessible (beat-em-up) |
| **Special cancel** | Normal → Special move, skips recovery entirely | Deeper, rewards execution (fighting game) |
| **Link** | No cancel — frame advantage is naturally large enough to start a new attack | Tight timing, skillful (fighting game) |

**Infinite prevention (mandatory if allowing cancels):**
Either: (a) Later moves in a chain have less frame advantage than the first move's startup (can't loop), or (b) Each hit adds pushback so the combo eventually pushes out of range, or (c) Combo damage scaling (each successive hit deals less), or (d) Hard combo length cap.

---

### C) Input Buffering — Forgiveness Layer

```js
const INPUT_BUFFER_MS = 133; // ~8 frames at 60fps
const inputBuffer = [];

function bufferInput(action, timestamp) {
  inputBuffer.push({ action, timestamp });
}

function consumeBuffer(currentTime, validActions) {
  for (let i = inputBuffer.length - 1; i >= 0; i--) {
    const entry = inputBuffer[i];
    if (currentTime - entry.timestamp > INPUT_BUFFER_MS) {
      inputBuffer.splice(i, 1); // expired
      continue;
    }
    if (validActions.includes(entry.action)) {
      inputBuffer.splice(i, 1);
      return entry.action; // consumed
    }
  }
  return null;
}
```

**Rule:** If a player says "I pressed it!" your system should make them right. Buffer inputs during hitstun, blockstun, and attack recovery. Replay them the instant the entity can act. Without buffering, cancel combos require frame-perfect input and feel broken.

---

### D) Damage Formula — The Math Layer

**DO NOT DEFAULT TO ONE FORMULA.** The right formula depends on the game. Here are the four archetypes with their design consequences:

#### Formula 1: Simple Subtraction
```js
damage = Math.max(minDamage, attack - defense)
```
- ✅ Intuitive. Easy for players to calculate in their head.
- ✅ **Makes weapon speed vs. power meaningful.** 3 dagger hits (15 atk each) vs. 1 hammer hit (45 atk) against 12 def: dagger deals 3×3=9, hammer deals 33. Armor naturally differentiates weapons.
- ❌ Zero-damage cliff when def ≥ atk (needs minimum floor).
- ❌ Unforgiving for designers — wrong stat values break everything.
- 🎯 **Best for:** Constrained games (Fire Emblem), linear progression, hand-crafted encounters.

#### Formula 2: Effective Health (Percent via Ratio)
```js
damage = attack * (100 / (100 + defense))
```
- ✅ **Extremely forgiving.** Can't catastrophically break with any defense value. Each point of defense = +1% effective HP (linear value scaling).
- ✅ Easy for designers to fill spreadsheets — no wrong numbers.
- ❌ Bland. Armor reduces daggers and hammers identically. No natural weapon differentiation.
- ❌ Needs OTHER systems (damage types, penetration) to create tactical variety.
- 🎯 **Best for:** MOBAs (LoL, Dota), games with many interacting systems where the damage formula should be stable background math.

#### Formula 3: Piecewise Hybrid (Recommended Default)
```js
function calcDamage(attack, defense) {
  if (attack >= defense) {
    return attack - defense / 2;                    // subtractive character
  } else {
    return (attack * attack) / (2 * defense);       // asymptotic to zero, never reaches it
  }
}
```
- ✅ Combines subtractive's weapon differentiation with effective-health's safety.
- ✅ No zero-damage cliff — low attack vs. high defense produces small but nonzero damage.
- ✅ Dagger vs. hammer vs. armor works naturally (subtractive behavior when atk > def).
- ❌ Less intuitive than simpler formulas — harder for players to mental-math.
- 🎯 **Best for:** Action-RPGs, Souls-likes, open-world games, games with varied weapons AND varied enemies. **This is the safe default when you're unsure.**

#### Formula 4: Pure Percent Reduction
```js
damage = attack * (1 - defense / 100)
```
- ❌ Defense stacking is exponentially valuable (98→99 halves damage taken). Additive stacking can hit 100% immunity. Multiplicative stacking is confusing. Small numbers feel negligible.
- ❌ Generally avoid as the BASE formula. Works fine as a LAYER on top (e.g., elemental resistance: "fire elemental takes 75% reduced fire damage").
- 🎯 **Use only for:** Categorical resistances, temporary buffs, specific ability modifiers — NOT as the core damage formula.

#### Decision Tree
```
Is the game highly constrained (linear, hand-crafted, no builds)?
  → YES: Formula 1 (Simple Subtraction) + minimum damage floor
  → NO: Does the game need weapon-speed vs. power differentiation?
    → YES: Formula 3 (Piecewise Hybrid)
    → NO: Formula 2 (Effective Health)
```

---

### E) Damage Pipeline — The Full Flow

Every point of damage flows through this pipeline. Each stage is a separate function.

```
┌─────────────────────────────────────────────────────┐
│                    DAMAGE PIPELINE                   │
├─────────────────────────────────────────────────────┤
│ 1. Raw Damage (from attack definition)              │
│    ↓                                                │
│ 2. Crit Roll (if applicable: raw × critMultiplier)  │
│    ↓                                                │
│ 3. Damage Type Modifier (attacker's type bonus)     │
│    ↓                                                │
│ 4. Resistance Modifier (defender's resistance to    │
│    this damage type — multiplicative per-type)      │
│    ↓                                                │
│ 5. Armor/Defense Reduction (chosen formula)         │
│    ↓                                                │
│ 6. Flat Modifiers (buffs, debuffs, combo scaling)   │
│    ↓                                                │
│ 7. Minimum Damage Floor (never below 1, or 0 for   │
│    full immunity effects only)                      │
│    ↓                                                │
│ 8. Shield Absorption (shields absorb first,         │
│    overflow passes to health; armor typically       │
│    does NOT reduce damage to shields)               │
│    ↓                                                │
│ 9. Health Deduction                                 │
│    ↓                                                │
│ 10. Death Check + On-Damage Effects                 │
│     (DoT application, status procs, lifesteal)      │
│    ↓                                                │
│ 11. Emit Combat Event (for juice, UI, AI)           │
└─────────────────────────────────────────────────────┘
```

```js
function processDamage(source, target, attackDef) {
  if (target.invincible) return null; // i-frame check

  let dmg = attackDef.damage;

  // 2. Crit
  const isCrit = Math.random() < (source.stats.critChance || 0);
  if (isCrit) dmg *= (source.stats.critMultiplier || 2.0);

  // 3-4. Damage type × resistance
  const typeKey = attackDef.damageType || 'physical';
  const resistance = target.stats.resistances?.[typeKey] || 0;
  dmg *= (1 - Math.min(resistance, 0.9)); // cap at 90% resistance

  // 5. Armor reduction (using piecewise hybrid)
  const def = target.stats.defense || 0;
  dmg = dmg >= def ? dmg - def / 2 : (dmg * dmg) / (2 * def);

  // 6. Flat modifiers
  dmg *= (source.stats.damageMultiplier || 1);
  dmg *= (target.stats.damageTakenMultiplier || 1);

  // 7. Floor
  dmg = Math.max(1, Math.round(dmg));

  // 8. Shield absorption
  let shieldDamage = 0;
  if (target.shield > 0) {
    shieldDamage = Math.min(target.shield, dmg);
    target.shield -= shieldDamage;
    dmg -= shieldDamage;
  }

  // 9. Health deduction
  target.health = Math.max(0, target.health - dmg);

  // 10. Death check + procs
  const killed = target.health <= 0;
  if (attackDef.applyDoT) {
    applyDoT(target, attackDef.applyDoT);
  }

  // 11. Emit event
  return {
    type: killed ? 'KILL' : (isCrit ? 'CRIT' : 'HIT'),
    source, target,
    damage: dmg + shieldDamage,
    healthDamage: dmg,
    shieldDamage,
    isCrit,
    damageType: typeKey,
    position: attackDef.contactPoint,
    knockback: attackDef.knockback,
    attackId: attackDef.instanceId,
  };
}
```

---

### F) Invincibility Frames & Protection States

i-frames are a boolean flag on the hurtbox: `invincible = true` means all hitbox overlaps are ignored for N ms.

**Protection state priority (highest to lowest):**
1. **Full invincibility** (dodge roll, post-hit recovery, reversal startup)
2. **Hitstun** (can't act, CAN be hit by combo follow-ups but NOT by the same attack instance)
3. **Blockstun** (can't act, blocking, reduced damage or zero damage)
4. **Super armor / hyper armor** (can be hit, takes damage, but NOT interrupted — no hitstun)
5. **Normal** (vulnerable, can act)

```js
const PROTECTION = { INVINCIBLE: 4, HITSTUN: 3, BLOCKSTUN: 2, SUPERARMOR: 1, NORMAL: 0 };

function canBeHitBy(defender, attackInstanceId) {
  if (defender.protection === PROTECTION.INVINCIBLE) return false;
  if (defender.hitBySet.has(attackInstanceId)) return false; // multi-hit prevention
  return true;
}
```

**Tuning ranges for i-frames:**

| Trigger | Duration | Notes |
|---------|----------|-------|
| Dodge roll | 100–250ms | More = more forgiving. Dark Souls ≈ 217ms. |
| Post-hit recovery | 500–1500ms | Prevents stunlock. Visual: sprite flashes/blinks. |
| Reversal startup | 50–150ms | Reward for correct defensive read. High-risk. |
| Respawn/revive | 1000–3000ms | Prevents spawn camping. |

---

### G) Projectile System (Pooled)

```js
const PROJ_POOL_SIZE = 200;
const projectiles = Array.from({ length: PROJ_POOL_SIZE }, () => ({
  alive: false, x: 0, y: 0, vx: 0, vy: 0, prevX: 0, prevY: 0,
  damage: 0, damageType: 'physical', hitboxRadius: 4,
  lifetime: 0, maxLifetime: 2000, sourceId: null, piercing: false,
  hitSet: new Set()
}));
let projIdx = 0;

function fireProjectile(cfg) {
  const p = projectiles[projIdx];
  projIdx = (projIdx + 1) % PROJ_POOL_SIZE;
  Object.assign(p, cfg, { alive: true, lifetime: 0, prevX: cfg.x, prevY: cfg.y });
  p.hitSet.clear();
  return p;
}

function updateProjectiles(dtMs) {
  const dtS = dtMs / 1000;
  for (const p of projectiles) {
    if (!p.alive) continue;

    // store previous position for swept collision
    p.prevX = p.x;
    p.prevY = p.y;

    // move
    p.x += p.vx * dtS;
    p.y += p.vy * dtS;
    p.lifetime += dtMs;

    // bounds / lifetime kill
    if (p.lifetime > p.maxLifetime || isOutOfBounds(p)) {
      p.alive = false;
      continue;
    }

    // swept-line collision (prevents tunneling)
    const hit = sweptCircleVsHurtboxes(p.prevX, p.prevY, p.x, p.y, p.hitboxRadius, p.sourceId, p.hitSet);
    if (hit) {
      const event = processDamage(getEntity(p.sourceId), hit.target, {
        damage: p.damage, damageType: p.damageType,
        contactPoint: hit.point, knockback: { x: p.vx * 0.3, y: p.vy * 0.3 },
        instanceId: `proj_${projIdx}_${p.lifetime}`
      });
      if (event) emitCombatEvent(event);
      if (!p.piercing) p.alive = false;
      else p.hitSet.add(hit.target.id);
    }
  }
}
```

**Hitscan vs. Simulated:**
- **Hitscan:** Instant raycast from source to target. No travel time. Cheaper. Use for: guns in fast-paced games, laser beams.
- **Simulated:** Projectile travels with velocity. Can be dodged. Can be affected by gravity. Use for: arrows, fireballs, thrown objects, bullet-hell patterns.
- **Hybrid:** Hitscan with a visual-only "tracer" projectile for feedback. Best of both.

---

### H) Area of Effect (AOE)

Three patterns:

**Instant AOE** — Check all hurtboxes in shape at moment of activation:
```js
function instantAOE(center, radius, damage, damageType, falloff = true) {
  for (const entity of getEntitiesInCircle(center, radius)) {
    const dist = distance(center, entity);
    const falloffMult = falloff ? 1 - (dist / radius) * 0.5 : 1; // 100% at center, 50% at edge
    processDamage(source, entity, { damage: damage * falloffMult, damageType, contactPoint: center });
  }
}
```

**Persistent AOE** — Zone that ticks damage to entities within it:
```js
{ type: 'persistent_aoe', center: {x,y}, radius: 80, tickRate_ms: 500,
  damagePerTick: 5, damageType: 'fire', duration_ms: 3000, hitSetPerTick: new Set() }
```
Clear `hitSetPerTick` each tick to allow re-hitting, but prevent multiple hits within the same tick.

**Expanding AOE** — Shockwave ring that grows outward. Track inner and outer radius; entities between them get hit once as the ring passes.

---

### I) Damage Over Time (DoT)

Three stacking models — **you must choose one per DoT type:**

| Model | Behavior | Best For |
|-------|----------|----------|
| **Refresh** | New application resets timer, keeps same intensity | Poison (simple, predictable) |
| **Stack** | Each application adds independent instance (up to max stacks) | Bleed (rewards sustained aggression) |
| **Intensify** | New application refreshes timer AND increases intensity | Burn (escalating danger) |

```js
function applyDoT(target, dotDef) {
  const existing = target.dots.find(d => d.type === dotDef.type);

  if (dotDef.stackMode === 'refresh') {
    if (existing) { existing.remaining = dotDef.duration_ms; return; }
  } else if (dotDef.stackMode === 'stack') {
    const count = target.dots.filter(d => d.type === dotDef.type).length;
    if (count >= (dotDef.maxStacks || 5)) return; // cap
  } else if (dotDef.stackMode === 'intensify') {
    if (existing) {
      existing.remaining = dotDef.duration_ms;
      existing.damagePerTick = Math.min(existing.damagePerTick + dotDef.damagePerTick, dotDef.maxIntensity);
      return;
    }
  }

  target.dots.push({
    type: dotDef.type, damageType: dotDef.damageType,
    damagePerTick: dotDef.damagePerTick, tickRate_ms: dotDef.tickRate_ms,
    remaining: dotDef.duration_ms, elapsed: 0
  });
}
```

**Rule:** DoT damage goes through the damage pipeline (stage 3 onward). DoT should NOT trigger hitstun (would be oppressive). DoT CAN trigger on-damage procs (like lifesteal), but consider a flag to prevent infinite proc chains.

---

### J) Cooldowns

```js
const cooldowns = new Map(); // key: abilityId, value: remaining_ms

function startCooldown(abilityId, duration_ms) {
  cooldowns.set(abilityId, duration_ms);
}

function isOnCooldown(abilityId) {
  return (cooldowns.get(abilityId) || 0) > 0;
}

function updateCooldowns(dtMs) {
  for (const [id, remaining] of cooldowns) {
    if (remaining <= 0) { cooldowns.delete(id); continue; }
    cooldowns.set(id, remaining - dtMs);
  }
}
```

Cooldowns are simple but interact with everything: timescale (do cooldowns tick during slowmo?), death (do cooldowns reset?), buffs (cooldown reduction — use multiplicative, not additive, to prevent zero-cooldown exploits: `effective = base / (1 + cooldownReduction)`).

---

## Output Format (What You Must Deliver)

When responding to a combat system request, structure your answer:

1. **Combat Loop Diagnosis (3–5 bullets):** Genre, verbs, what's working, what's missing.
2. **Architecture Map:** Which subsystems are needed, how they connect via events.
3. **Top 3 Highest-ROI Fixes:** Smallest work, biggest correctness/feel gain.
4. **Combat System Table:** Per interaction (hit, block, dodge, crit, death), list which subsystems fire and what data flows.
5. **Decision Callouts:** Where design forks exist, present options with tradeoffs (don't just pick one).
6. **Implementation Plan (JS):** dt-based code, event hooks, data structures, config objects with ranges.
7. **Tuning Ranges:** Suggested ms/px/multipliers, organized by weight tier.
8. **Edge Cases Addressed:** Multi-hit prevention, simultaneous hits, death-mid-combo, i-frame boundaries.
9. **Integration Notes:** What combat events look like for juice/UI/AI consumption.
10. **Perf Notes:** Pooling, spatial partitioning thresholds, GC avoidance.

---

## Quick Reference: Genre → Recommended Architecture

### Fighting Game / Arena Brawler
- Frame data: **precise** (per-frame or per-tick, not just ms)
- Combo system: **cancel chains + links** with strict frame advantage math
- Damage formula: **Simple subtraction** (constrained roster, hand-tuned)
- Input buffer: **critical** (6–10 frame window)
- Pushback: **essential** for combo balancing
- Projectiles: few, slow, highly interactive

### Beat-em-up / Character Action
- Frame data: **generous** (wide cancel windows, forgiving timing)
- Combo system: **chain cancels** (light → medium → heavy → special)
- Damage formula: **piecewise hybrid** (varied enemies and weapons)
- Input buffer: **moderate** (4–8 frame window)
- Combo scaling: **mandatory** (prevent infinite stunlock)
- i-frames on dodge: **generous** (150–250ms)

### Top-Down Shooter / Twin-Stick
- Frame data: **minimal** (attacks are mostly projectile-based)
- Projectile system: **central** (pooled, many bullets, swept collision)
- Damage formula: **effective health** (simple, stable background math)
- Spatial partitioning: **likely needed** (many simultaneous projectiles)
- Cooldowns: **primary resource** for weapon management

### Bullet Hell
- Projectile pool: **large** (500–2000+)
- Collision: **circle-only** (performance), player hurtbox TINY (often 2–4px radius)
- Damage: **binary** (one hit = one life or one hit = fixed damage)
- Spatial partitioning: **mandatory**
- Rendering: batch all bullets in one draw call if possible

### Action-RPG / Roguelike
- Frame data: **moderate** (attack commitment matters but not frame-tight)
- Damage formula: **piecewise hybrid** (stat scaling + weapon variety)
- Damage types + resistances: **central** to build diversity
- Proc system: **rich** (crit, DoT, status effects, on-hit triggers)
- Combo system: **light** or none (focus on ability rotation)

---

## Tuning Heuristics

### Weight Tiers (consistent scaling across systems)
| Tier | Startup | Active | Recovery | Hitstun | Knockback | Shake | Hitstop |
|------|---------|--------|----------|---------|-----------|-------|---------|
| Tiny | 50ms | 30ms | 80ms | 60ms | 20px | 2px | 0ms |
| Light | 80ms | 50ms | 120ms | 100ms | 50px | 4px | 30ms |
| Medium | 150ms | 80ms | 200ms | 180ms | 100px | 8px | 60ms |
| Heavy | 250ms | 100ms | 350ms | 300ms | 180px | 14px | 100ms |
| Colossal | 400ms+ | 150ms | 500ms+ | 450ms+ | 300px+ | 20px+ | 150ms+ |

**Rule:** Big things are slower to start AND slower to recover. Consistent weight sells believability.

### Combo Damage Scaling
Successive hits in a combo should deal less to prevent stunlock-to-death:
```js
const COMBO_SCALING = [1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5]; // per hit index
function getComboScaling(hitIndex) {
  return COMBO_SCALING[Math.min(hitIndex, COMBO_SCALING.length - 1)];
}
```

### TTK (Time to Kill) Target
Before tuning individual numbers, decide your target TTK range:
- **Bullet-hell / one-shot:** Instant (1 hit)
- **Twitchy action:** 1–3 seconds
- **Standard action-RPG:** 5–15 seconds (regular enemies), 60–180 seconds (bosses)
- **MMO/MOBA teamfight:** 3–8 seconds (squishy), 10–20 seconds (tank)

Work backwards: `TTK ≈ targetHP / (attackDPS × hitRate)`. Adjust all three knobs.

---

## The Combat Checklist (Ship Gate)

### Collision & Detection
- [ ] Hitboxes and hurtboxes are on separate collision layers
- [ ] Multi-hit prevention works (same attack can't damage same target twice per swing)
- [ ] Fast projectiles don't tunnel through thin targets
- [ ] Friendly fire is handled (prevented or allowed, not accidental)

### Attack Lifecycle
- [ ] Attacks have distinct startup / active / recovery phases
- [ ] Attack definitions are data, not hard-coded logic
- [ ] Recovery frames leave the attacker vulnerable (commitment matters)
- [ ] Frame advantage is calculable from the data

### Combos & Input
- [ ] Input buffer exists and works during hitstun/blockstun/recovery
- [ ] Cancel windows are defined in attack data, not special-cased
- [ ] Infinite combos are prevented (scaling, pushback, or chain limits)
- [ ] Combo counter correctly tracks hit count

### Damage Math
- [ ] Damage formula produces sensible values across the full stat range
- [ ] Minimum damage floor exists (no zero-damage)
- [ ] Shield absorbs before health; armor reduces damage to health
- [ ] Crit applies at the correct pipeline stage
- [ ] Overkill doesn't crash (target can die mid-pipeline)

### Protection & Timing
- [ ] i-frames work during dodge, post-hit recovery, and any reversal moves
- [ ] Hitstun has a maximum duration cap (anti-stunlock)
- [ ] Cooldowns tick correctly and respect timescale
- [ ] Status effects can expire, be cleansed, and stack according to defined rules

### Performance & Integration
- [ ] Projectiles use object pooling (no per-frame allocations)
- [ ] All motion and timers are dt-based
- [ ] Hitstop / slowmo doesn't break combat timers or DoT ticks
- [ ] Combat events carry enough data for juice (position, knockback, type, crit flag)
- [ ] Combat events carry enough data for UI (damage number, damage type, kill flag)

---

## JavaScript Patterns (Copy-Paste Friendly)

### Collision: AABB vs AABB
```js
function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
```

### Collision: Circle vs Circle
```js
function circleOverlap(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const dist = dx * dx + dy * dy;
  const radii = a.r + b.r;
  return dist < radii * radii; // avoid sqrt
}
```

### Collision: Swept Line vs Circle (anti-tunneling)
```js
function lineVsCircle(x1, y1, x2, y2, cx, cy, cr) {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - cr * cr;
  let disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  disc = Math.sqrt(disc);
  const t = (-b - disc) / (2 * a);
  if (t >= 0 && t <= 1) return { t, x: x1 + t * dx, y: y1 + t * dy };
  return null;
}
```

### Attack State Machine
```js
const PHASE = { IDLE: 0, STARTUP: 1, ACTIVE: 2, RECOVERY: 3 };

function updateAttackState(entity, dtMs) {
  const atk = entity.currentAttack;
  if (!atk) return;

  atk.phaseTimer += dtMs;
  switch (atk.phase) {
    case PHASE.STARTUP:
      if (atk.phaseTimer >= atk.def.startup_ms) {
        atk.phase = PHASE.ACTIVE;
        atk.phaseTimer = 0;
        activateHitbox(entity, atk.def.hitbox);
        atk.hitSet = new Set();
      }
      break;
    case PHASE.ACTIVE:
      if (atk.phaseTimer >= atk.def.active_ms) {
        atk.phase = PHASE.RECOVERY;
        atk.phaseTimer = 0;
        deactivateHitbox(entity);
      }
      break;
    case PHASE.RECOVERY:
      // check cancel window
      if (atk.def.cancelWindow) {
        const cw = atk.def.cancelWindow;
        const sinceActiveStart = atk.def.active_ms + atk.phaseTimer;
        if (sinceActiveStart >= cw.start_ms && sinceActiveStart <= cw.end_ms) {
          const buffered = consumeBuffer(gameTime, atk.def.canCancelInto || []);
          if (buffered) { startAttack(entity, buffered); return; }
        }
      }
      if (atk.phaseTimer >= atk.def.recovery_ms) {
        atk.phase = PHASE.IDLE;
        entity.currentAttack = null;
      }
      break;
  }
}
```

### Simple Spatial Hash (for many entities)
```js
class SpatialHash {
  constructor(cellSize = 64) { this.cellSize = cellSize; this.grid = new Map(); }

  _key(x, y) { return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`; }

  clear() { this.grid.clear(); }

  insert(entity) {
    const key = this._key(entity.x, entity.y);
    if (!this.grid.has(key)) this.grid.set(key, []);
    this.grid.get(key).push(entity);
  }

  query(x, y, radius) {
    const results = [];
    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCY = Math.floor((y - radius) / this.cellSize);
    const maxCY = Math.floor((y + radius) / this.cellSize);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.grid.get(`${cx},${cy}`);
        if (cell) results.push(...cell);
      }
    }
    return results;
  }
}
```

---

## Engineering Guardrails (Mandatory)

### Balance Safety Valves
- **Minimum damage floor:** Always at least 1 (prevents "can't damage this enemy at all").
- **Maximum hitstun cap:** Never exceed 500ms from a single hit (prevents perma-stun).
- **Combo damage scaling:** Successive combo hits deal decreasing damage.
- **i-frame minimum on hit recovery:** At least 200ms post-damage (prevents insta-kill from overlapping hitboxes).
- **Resistance cap:** No resistance above 90% (always some damage gets through, except explicit immunity).

### Performance Rules
- **Projectiles:** Always pooled. Never `new` in a hot loop.
- **Hit sets:** Use `Set` (O(1) lookup), clear per attack instance, not per frame.
- **Spatial queries:** If >50 collidable entities, use spatial hash. Rebuild hash each frame (it's cheap for 2D).
- **dt-based everything:** `entity.x += velocity * (dtMs / 1000)`, never `entity.x += velocity`.
- **Timescale-aware:** All combat timers multiply by `timeScale`. Hitstop sets `timeScale = 0` temporarily. DoT, cooldowns, and i-frames must respect this (or explicitly opt out).