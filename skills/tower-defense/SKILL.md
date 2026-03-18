---
name: tower-defense
description: Path systems, tower placement, wave pacing, targeting rules, and economy tuning for tower defense games.
---


# Tower Defense Game Design Skill 

You make placement feel like investment and wave-clear feel like vindication.  You think in interlocking economies, escalation curves, and spatial control. You bring three lenses to every tower defense problem:
- The economist — income curves, cost ratios, scarcity pressure, feedback loops. You know that if income per wave exceeds 70% of ideal spending, tension evaporates and the player stops making interesting choices. You design the budget constraint before you design the first tower.
- The teacher — information hierarchy, failure readability, progressive complexity. You know that a player who leaks a creep and doesn't understand why has learned nothing — and a game that doesn't teach is a game that frustrates. Every pixel on screen either aids a decision or wastes attention.
- The architect — system coupling, data-driven extensibility, simulation integrity. You know that a tower defined as a class is a tower that requires a programmer to extend. You know that fast-forward implemented as larger dt is a simulation that lies. You build systems that are correct first, then beautiful.

If any lens is missing, the game breaks: economy without teaching produces balanced but opaque spreadsheets. Teaching without economy produces clear but tensionless toy boxes. Either without architecture produces a game that works at 20 creeps and collapses at 200.

*Your job*: given a core loop, design the defense layer so that every placement feels like a bet, every wave feels like a verdict, and the next upgrade always feels like it matters.

TD is a placement economy with real-time validation. The player makes investment decisions (which tower, where, which upgrade). Waves test those decisions. Every system serves this loop: decide → invest → observe → adapt.
*Your mantra*: Place thing → kill things → earn things → place better things — and always feel one tower short of comfortable.

---

## Prime Directives

### 1) TD is interlocking systems, not isolated features
Never design a tower without a creep it counters. Never design a creep without a tower it pressures. Never design waves without an economy that constrains choices. Systems that exist in isolation are untestable and unbalanceable.

**Minimum viable TD** requires ALL of these, even as stubs:
- Grid + placement rules
- Path system (waypoints or flow field)
- ≥2 tower types with *different roles*
- Creeps with health scaling
- Projectile → damage → death loop
- Gold economy (earn on kill, spend on towers)
- Win/lose conditions
- Pause + at least 2x fast-forward

### 2) Data drives everything
Tower types, creep types, wave compositions, upgrade stats — **all defined as config objects, never as class hierarchies**. Adding a new tower should mean adding a data entry, not writing a new class.

```js
// YES: tower as data
const TOWERS = {
  archer:  { cost: 100, range: 120, damage: 15, fireRate: 1.2, projectile: 'arrow', targeting: 'first' },
  cannon:  { cost: 200, range: 90,  damage: 60, fireRate: 0.5, projectile: 'cannonball', targeting: 'strongest', splash: 40 },
  frost:   { cost: 150, range: 100, damage: 8,  fireRate: 0.8, projectile: 'ice_bolt', targeting: 'first', slow: { factor: 0.5, duration: 2000 } },
};
// NO: class ArcherTower extends Tower { ... }
```

### 3) Simulation and presentation are separate
The game sim runs at **fixed timestep** (e.g. 60 Hz). Visual effects run at display frame rate. Fast-forward = run multiple sim steps per render frame, not bigger dt. This is what makes fast-forward deterministic. Non-negotiable.

### 4) Every game state the player needs must be visible
Range circles, health bars, damage types, creep properties, targeting lines, income, wave preview — these aren't cosmetic. They're the core learning feedback. TD players can only learn from failure if they see *why* they failed.

---

## Design Workflow

When asked to build or extend a TD, follow this pipeline:

### Pass 0 — Clarify the variant
Determine which path model:
- **Fixed-path** (Kingdom Rush): curated tower spots or free placement alongside pre-authored waypoint paths. Simpler. Better for hand-designed encounters.
- **Dynamic-path / mazing** (Desktop TD, some Bloons maps): towers block paths; creeps pathfind around them. Requires flow field + placement validity. Deeper emergent strategy.
- **Hybrid**: fixed lanes with limited blocking.

State which and why. This choice shapes every other system.

### Pass 1 — Core architecture (dependency order)
Build in this order — each depends on the previous:
1. Game loop (fixed timestep)
2. Grid + rendering
3. Path system
4. Creeps + movement
5. Towers + range + targeting
6. Projectiles + damage
7. Economy
8. Waves + win/lose
9. Upgrades
10. UI/HUD
11. Time controls

### Pass 2 — Balance pass
Verify with these questions:
- Can the player afford ~1 tower per wave in early game?
- Does difficulty outpace income (forcing upgrades, not just more towers)?
- Does every tower type have waves where it's the best choice?
- Is "new tower vs. upgrade existing" a real decision?
- Can a player trace *why* a creep leaked?

### Pass 3 — Feel + juice pass
Layer feedback using the game-juice skill: tower fire effects, creep death pops, wave-clear fanfare, placement snap, damage numbers. Reference `/mnt/skills/user/game-juice/SKILL.md`.

### Pass 4 — Mobile + performance pass
- Touch targets ≥44pt
- Object pooling for projectiles, particles, creeps
- Spatial indexing for range queries
- Static layer caching

---

## The Design Systems

### A) The Grid — Spatial Backbone

The grid is how the player thinks about the game. Every placement is a grid decision.

**Design constraints:**
- Cell size must be large enough for touch (≥40px on mobile, ≥44pt ideally)
- Every cell has a clear state: empty/buildable, path, tower, obstacle
- Grid-to-world and world-to-grid conversion must be trivial and consistent
- Visual grid overlay should be subtle but readable during placement

**Placement validation rules:**
- For **fixed-path games**: cell must be empty (not path, not obstacle, not occupied)
- For **mazing games**: additionally, placing cannot block ALL paths from spawn to exit. Temporarily mark cell as blocked → recompute flow field → check if all spawn points still connect. If not, reject placement with clear visual feedback (red flash + shake)
- **Sell/refund**: selling must restore the cell and recompute paths. Refund at 60-70% of total investment (purchase + upgrades). Selling should feel like a real loss, not free repositioning.

---

### B) Path System — How Creeps Move

**Two models, choose based on variant:**

**Waypoint paths (fixed-path):**
- Array of world-space points. Creeps walk toward the next waypoint.
- *Design tip*: include curves and turns — straight-line paths are boring and reduce tower diversity (every spot is equally good). Chokepoints and bends create "premium" tower spots.
- Handle the "overshoot" problem: if a creep's step overshoots a waypoint, recurse with remaining distance. Otherwise speed becomes frame-dependent.
- Track `distanceTraveled` per creep for "first" targeting priority.

**Flow fields (mazing/dynamic):**
- Single Dijkstra/BFS from exit. Every cell stores a direction vector toward the exit.
- Compute once when grid changes (tower placed/sold). Creeps just sample their cell's direction each tick.
- **Triple duty**: one flow field serves (a) creep pathfinding, (b) placement validity ("is spawn still connected to exit?"), and (c) "first" targeting priority (cell distance = progress toward exit).
- Use bilinear interpolation of cell directions for smooth movement (prevents visible 8-direction snapping).
- Allow diagonal movement but prevent corner-cutting through blocked cells.

**Path design principles (for level designers / procedural generation):**
- **Chokepoints** create "hero moments" — one well-placed tower dominates
- **Forks** create "resource tension" — can't cover everything
- **Long straight sections** favor rapid-fire towers; tight turns favor AoE/slow
- **Elevation** (if supported) creates strategic depth beyond just range coverage
- Path length determines game tempo: longer paths = more tower opportunities = more forgiving. Shorter = faster = more punishing.

---

### C) Creep Design — The Threat Vocabulary

Creeps aren't enemies — they're **test cases for the player's build**. Each type should pressure a specific tower configuration.

**Creep type design matrix:**

| Type | Role | What it pressures | Counter |
|------|------|-------------------|---------|
| Normal | Baseline | Nothing specifically | Any tower |
| Fast | Speed check | Slow fire-rate towers, poor placement | Slow/freeze, high fire-rate, path chokepoints |
| Armored | Durability check | Low-damage towers, chip damage | High single-target DPS, armor-piercing |
| Swarm | Quantity check | Single-target towers | AoE, splash damage |
| Flying | Path bypass | Ground-only towers, maze investment | Anti-air towers (critical to have at least one) |
| Boss | Full build check | Everything — tests whole defense | Coordinated multi-tower setup |
| Regen | Sustained DPS check | Burst damage | Consistent DPS, poison/burn |
| Shielded | Damage type check | Single damage type | Mixed damage types |

**Design rule:** Each creep type must have at least one tower that's clearly "the answer." If no tower counters a creep type well, it feels unfair. If every tower counters it equally, it's just a stat variant.

**Stats as data:**
```js
const CREEP_TYPES = {
  normal:  { hp: 100, speed: 60, armor: 0,  reward: 10, size: 10 },
  fast:    { hp: 60,  speed: 120, armor: 0,  reward: 12, size: 8 },
  armored: { hp: 200, speed: 40, armor: 5,   reward: 20, size: 14 },
  swarm:   { hp: 30,  speed: 80, armor: 0,   reward: 5,  size: 6 },
  boss:    { hp: 2000, speed: 25, armor: 10, reward: 200, size: 20 },
  flying:  { hp: 80,  speed: 70, armor: 0,   reward: 15, size: 10, flying: true },
};
```

**Damage formula philosophy:**
- Armor should reduce physical damage linearly: `effective = max(1, raw - armor)`. Always deal at least 1 damage.
- Magic/fire/poison should ignore armor — this is what makes damage types matter.
- Never make a creep that's immune to all damage. Even bosses should melt eventually.

**Status effects (slow, stun, poison, burn):**
- Don't stack same-source debuffs — refresh duration instead. Stacking leads to instant-kill cheese.
- Slow has a floor (e.g. 20% of base speed). Zero-speed stunlocking feels broken.
- Show status effects visually (blue tint for slow, frozen overlay for stun, green drip for poison). The player must see what's happening.

---

### D) Tower Design — The Player's Vocabulary

**The cardinal rule: every tower must have a situation where it's the best choice.** If Tower A is strictly better than Tower B at the same price, Tower B doesn't exist.

Design towers around **roles**, not just stat variations:

| Role | Example | Strength | Weakness |
|------|---------|----------|----------|
| Sustained DPS | Archer | Consistent damage, good range | Weak vs. armor, single-target |
| Burst AoE | Cannon | Wipes swarms, splash | Slow fire rate, overkill on singles |
| Crowd Control | Frost | Slows for other towers | Low damage, can't solo |
| Anti-Armor | Mage | Ignores armor, magic damage | Short range, expensive |
| Blocker | Barracks | Delays creeps physically | Limited damage, takes a slot |
| Anti-Air | SAM | Only one that hits flyers | Useless vs. ground |

**Why roles work:** they create *synergies*. Frost + Archer is better than 2 Archers because slow multiplies DPS. This emergent combination is where TD strategy lives.

**Targeting priorities as a design system:**
```js
// Each returns a score; highest wins
const TARGETING = {
  first:     (creep) => creep.distanceTraveled,           // Furthest along path (default, usually best)
  last:      (creep) => -creep.distanceTraveled,           // Least progress
  strongest: (creep) => creep.hp,                           // Most HP
  weakest:   (creep) => -creep.hp,                          // Least HP (good for cleanup)
  nearest:   (creep, tower) => -distanceSq(creep, tower),  // Closest to tower
};
```
- "First" is the correct default for most situations (prevents leaks).
- "Strongest" matters for boss waves.
- "Weakest" is good for cleanup towers near the exit.
- Let the player change targeting per tower. It's a meaningful micro-decision.

---

### E) Projectile Archetypes

Don't hardcode projectile movement per tower. Define archetypes:

| Archetype | Behavior | Always hits? | Best for |
|-----------|----------|-------------|----------|
| **Homing** | Locks on, re-aims every tick | Yes | Arrows, bolts — reliable DPS |
| **Pursuit** | Steers toward target with turn rate limit | No (can miss) | Missiles — satisfying, can whiff |
| **Ballistic** | Straight line or arc, no re-aiming | No | Cannonballs, mortars — AoE on impact position |
| **Instant** | No projectile, immediate hit + visual | Yes | Lasers, lightning — pure DPS, no travel time |

**Design implications:**
- Homing is the "safe" archetype — always deals damage. Best for consistent DPS towers.
- Ballistic creates implicit skill expression in placement: position the tower where creeps *will be*, not where they are.
- Pursuit missiles that curve around corners feel amazing (use a turn rate of ~3 radians/sec).
- Instant hits need strong visual feedback (beam flash + damage number) since there's no projectile to watch.

**Splash damage rules:**
- Splash should deal 40-60% of direct hit damage to nearby targets.
- Splash radius scales with upgrade tiers — this is what makes AoE upgrades feel impactful.
- Always show splash radius visually on impact (brief circle flash).

---

### F) Economy — This IS the Game

The economy determines whether your TD creates interesting decisions or degenerates into a solved puzzle. Get this wrong and nothing else matters.

**Income sources:**
- **Kill rewards**: per-creep gold. Primary income. Scale with creep difficulty.
- **Wave bonus**: flat gold on wave completion. Creates incentive to not leak.
- **Interest** (optional, Bloons-style): % of banked gold per wave. Creates "save vs. spend" tension.

**The fundamental tension:** `income_per_wave ≈ 60-70% of ideal spending`. The player can afford *most* of what they want, but not everything. This forces prioritization — the core decision in TD.

**Balance reference table:**

| Parameter | Range | Design intent |
|-----------|-------|---------------|
| Starting gold | 150–300 | Affords 1-2 cheapest towers. Enough to feel agency, not enough to feel safe. |
| Cheapest tower | 75–125 | Low barrier to entry. Player should place 1-2 towers before wave 1. |
| Income per wave (early) | 80–150 | ~1 tower per wave. Feels like progress without abundance. |
| Kill reward scaling | 1.0–1.3× per tier | Harder creeps = more gold. Incentivizes tackling difficulty. |
| Upgrade cost | 0.6–0.8× base tower cost per tier | Upgrades slightly cheaper than new tower. Rewards commitment. |
| Upgrade power | +30–40% per tier | Consistent percentage gain. Each tier feels equally impactful relative to current power. |
| Sell refund | 60–70% of total invested | Real loss, not free repositioning. High enough that selling a mistake isn't devastating. |
| Wave difficulty scaling | 1.12–1.20× HP per wave | Outpaces linear income. Forces upgrades + strategy adaptation. |
| Lives | 10–25 | Low = punishing (hardcore). High = forgiving (casual). Leaking 1-2 creeps should sting, not end the game. |

**Economy feedback loops:**
- **Positive**: kills → gold → towers → more kills. Winning snowballs. This is satisfying.
- **Negative**: wave difficulty scales regardless of player performance. This prevents runaway dominance.
- **The balance**: positive feedback must be slightly weaker than negative. Player should feel like they're *barely* keeping up, not comfortably ahead. Comfort = boredom.

**The "new tower vs. upgrade" decision:**
This is the most important economic decision in TD. Both must be viable:
- New tower: covers more ground, adds flexibility, but starts weak
- Upgrade: concentrated power, better efficiency per gold, but sunk into one spot

If upgrades are always better → boring turtle strategies. If new towers are always better → no upgrade engagement. **The answer should depend on the current wave composition.**

---

### G) Wave Design — The Content

Waves are to TD what levels are to a platformer. They're the teaching tool, the difficulty curve, and the narrative arc.

**Wave pacing principles:**

1. **Introduce one threat at a time.** Waves 1-3: normal only. Wave 4-5: introduce fast. Wave 6-8: introduce armored. Each new type gets 2-3 waves of "learning time" before the next is introduced.

2. **Alternate intensity.** Hard → breather → harder. Never 3 brutal waves in a row. The breather isn't wasted time — it's when the player plans their next investment.

3. **Boss waves at milestones.** Every 5th or 10th wave. Bosses should test the *entire* defense, not just one tower. They're the "exam" for the preceding learning arc.

4. **Variety forces adaptation.** If wave 5 is all fast creeps and wave 6 is all armored, the player must build different towers. This is how you prevent "solved" builds.

5. **Late-game should feel chaotic but readable.** Multiple creep types per wave, higher counts, tighter spacing. The spectacle should escalate — but the player must always see what's happening.

**Wave budget system (for procedural generation):**

Each wave has a "threat budget" that scales with wave number:
```
budget = baseBudget × (1 + waveNumber × growthRate)
```

Creep type costs (threat units):
```js
const THREAT_COST = {
  normal: 1, fast: 1.5, armored: 2.2, swarm: 0.4, boss: 12, flying: 1.8, regen: 2.0
};
```

Fill the budget by selecting from available types (types unlock per the intro schedule). Bias toward recently introduced types to keep them fresh.

**Wave announcement:** Always preview what's coming. Show creep type icons and count before the wave starts. "Wave 7 — 🛡️×8 ⚡×5" tells the player to invest in anti-armor. Blind waves feel unfair.

**Difficulty scaling formula:**
```
creepHpMultiplier = 1 + waveNumber × scalingFactor
```
- `scalingFactor = 0.10` → gentle (casual)
- `scalingFactor = 0.15` → standard
- `scalingFactor = 0.25` → brutal (hardcore)

---

### H) Upgrade Trees — The Commitment Economy

Upgrades aren't just stat boosts — they're **commitment decisions**. Once you invest in a path, switching wastes resources. This creates the sunk-cost tension that makes TD strategic.

**Branching path model (Bloons-style):**
- Each tower has 2-3 upgrade paths
- Each path has 2-3 tiers
- You can max ONE path; other paths are capped at tier 1
- This means each tower placement has multiple possible "builds," multiplying strategic depth without adding tower types

**Tier design philosophy:**
- **Tier 1** (~0.6-0.8× tower cost): +30-40% power. Cheap, immediate payoff. Players should upgrade early towers before buying new ones.
- **Tier 2** (~1.2-1.5× tower cost): +30-40% over tier 1 baseline. Adds a secondary mechanic (splash, range, speed).
- **Tier 3** (~2-3× tower cost): **Transforms the tower's identity.** A tier-3 archer is fundamentally different from tier-0. This is the exciting choice. Examples: "Sniper" (huge range + damage, slow rate) vs. "Arrow Storm" (3 arrows per shot, lower damage each).

**Mutual exclusivity is the point.** If the player could max all paths, there's no decision. The commitment cost — "I chose Sniper, so I can't have Arrow Storm on this tower" — is what makes each placement meaningful.

**Upgrade data example:**
```js
const UPGRADE_TREES = {
  archer: {
    paths: [
      { name: 'Sharpshooter', tiers: [
        { cost: 80,  effects: { damage: +12 }, name: 'Sharp Arrows' },
        { cost: 160, effects: { damage: +20, range: +15 }, name: 'Eagle Eye' },
        { cost: 350, effects: { damage: +40, fireRate: +0.8 }, name: 'Sniper' },
      ]},
      { name: 'Multishot', tiers: [
        { cost: 100, effects: { fireRate: +0.5 }, name: 'Quick Draw' },
        { cost: 200, effects: { multishot: 2 }, name: 'Double Shot' },
        { cost: 400, effects: { multishot: 3, damage: +10 }, name: 'Arrow Storm' },
      ]},
    ],
    maxOnePath: 3,
    otherPathCap: 1,
  },
};
```

---

### I) Information Display — The Player's Eyes

**The readability principle:** TD attention is distributed across the entire map, not focused on one avatar. Every visual system must be readable at a glance from zoomed-out.

**Always visible (HUD):**
- Gold (with flash animation on gain/loss)
- Lives (with pulse on loss)
- Current wave / total waves
- Speed controls (pause, 1×, 2×, 4×) — large touch targets
- Next wave button or countdown

**On tower selection:**
- Range circle (semi-transparent fill + stroke)
- Stats: damage, fire rate, range, targeting priority
- Upgrade options with costs and stat delta previews (+12 dmg, +15 range)
- Sell button with refund amount
- Targeting priority selector (cycle: first → strongest → weakest → nearest)

**During placement:**
- Grid overlay: green = valid, red = invalid (on each cell)
- Range circle preview at cursor/finger position
- Cost displayed clearly
- Invalid placement feedback: subtle shake + red flash + reason ("would block path")

**On creeps (always):**
- Health bar above each creep (green → yellow → red based on % remaining)
- Armor indicator (small shield icon) if armored
- Status effect indicators: blue tint for slow, frozen overlay for stun, green for poison
- Flying indicator if applicable
- Boss creeps should be visually distinct (larger, glow, unique color)

**Wave start:**
- Brief announcement: "Wave 5 — Armored Creeps! 🛡️"
- Creep type icons showing what's coming and approximate count
- 2-3 second delay before spawning so the announcement registers

**Death/leak feedback:**
- Creep killed: pop particles + gold float text rising from death position
- Creep leaked (reached exit): screen edge red pulse + lives counter shake
- Player must feel the difference between "I killed it" and "it got through"

---

### J) Time Controls — Respect the Player's Time

**Pause:**
- Full simulation stop. Accumulator freezes. UI interaction still works (place towers, upgrade, change targeting).
- Placing during pause is standard — don't block it unless that's a conscious difficulty design choice.

**Fast-forward:**
- 2× = 2 sim steps per frame. 4× = 4 steps.
- **Never** implement by increasing dt. That changes simulation behavior.
- Cap max steps per frame (e.g. 10) to prevent spiral of death if sim is heavy.
- At high speed, visual effects can run at reduced fidelity — shorter lifetimes, fewer particles. Player chose speed over spectacle.
- Auto-pause on wave complete (let player spend gold before next wave).

**Wave start control:**
- Player manually starts each wave (button or countdown timer).
- Optional: "send early" bonus gold for starting next wave while current is active. Creates risk/reward.

---

### K) Mobile / Touch Design

TD on mobile means fat fingers and no hover state.

- **Touch targets ≥44pt** (Apple HIG). Tower buttons, speed controls, upgrades — all comfortably tappable.
- **Tower bar at bottom** (thumb-reachable). Tap type → tap grid to place.
- **No hover previews.** Tap-to-select shows range; tap-elsewhere deselects. Placement preview follows finger on drag.
- **No right-click menus.** All actions via tap or panel buttons.
- **Double-tap** to quick-upgrade selected tower (convenience shortcut).
- **Long-press** to show detailed info panel.
- **Grid sizing matters**: at 40px/cell on a ~375pt wide phone, you get ~9 columns. 12-16 columns is typical; more requires scrolling or zoom.

---

### L) Event Architecture

Don't couple systems directly. Use an event bus. When a creep dies, that event needs to: award gold, update kill count, spawn death particles, check wave completion, trigger on-kill abilities. Without events, this becomes spaghetti.

**Core event vocabulary for TD:**
```
creepHit        → damage number, hit flash, small shake
creepKilled     → gold award, death particles, gold float text, kill counter
creepReachedEnd → life loss, screen edge pulse, warning
towerPlaced     → placement thunk, grid snap, range circle flash
towerUpgraded   → sparkle effect, stat display update
towerSold       → refund gold, cell freed, path recompute
projectileFired → muzzle flash, recoil tween on tower
projectileHit   → impact particles, screen shake (scaled to damage)
waveStart       → announcement, creep preview display
waveComplete    → fanfare, gold bonus display, breather
gameOver        → defeat overlay
victory         → win overlay, star rating
```

Every game event should trigger feedback in ≥2-3 channels (visual + motion + timing), per the game-juice skill.

---

### M) Performance Constraints (Mobile JS)

These are design constraints that affect architecture:

- **Pool all transient entities.** Creeps, projectiles, particles, damage numbers. Pre-allocate arrays with `alive` flags. No `new` in the hot loop.
- **Spatial index for range queries.** Tower checking every creep every frame is O(towers × creeps). Use grid-buckets or a spatial hash. Tower range cells can be precomputed on placement — not recalculated per frame.
- **Cache static layers.** Grid, decorations, path overlay → offscreen canvas. Redraw only when grid changes.
- **Batch draw calls.** Group same-type entities. Minimize canvas state changes (`fillStyle`, `font`, transforms).
- **Fixed timestep keeps perf predictable.** Sim cost is constant per tick regardless of frame rate. Budget: sim tick <4ms for 200 creeps + 30 towers + 100 projectiles.
- **Particle budget on mobile:** cap ~200 active, lifetimes ≤400ms.

---

## Quick Reference: Tower Balance Matrix

Design towers so each column has 1-2 clear winners. If one tower wins every column, the others don't matter.

| | vs Normal | vs Fast | vs Armored | vs Swarm | vs Flying | vs Boss |
|---|---|---|---|---|---|---|
| Archer | ★★ | ★ | ★ | ★ | ★★ | ★ |
| Cannon | ★★ | ★ | ★★★ | ★★★ | ✗ | ★★ |
| Frost | ★ | ★★★ | ★ | ★★ | ✗ | ★ |
| Mage | ★★ | ★ | ★★★ | ★ | ★★ | ★★ |
| SAM | ✗ | ✗ | ✗ | ✗ | ★★★ | ✗ |

★ = okay · ★★ = good · ★★★ = best choice · ✗ = can't target or ineffective

**Validation:** Cover each column — if a column has no ★★★, that creep type has no counter (unfair). If a row is all ★★★, that tower is OP (kills strategy).

---

## Quick Reference: Economy Checkpoints

Sanity-check balance at milestone waves:

| Wave | Cumulative Income (approx) | Expected Build | Challenge |
|------|---------------------------|----------------|-----------|
| 1 | Starting gold only (200-250) | 1-2 basic towers | Intro. Trivially beatable. |
| 5 | ~600-800 earned | 3-4 towers, 1-2 upgraded | First real test. Requires some diversity. |
| 10 | ~1500-2000 earned | 6-8 towers, several tier 2 | Boss wave. Tests full build. |
| 15 | ~3000-4000 earned | 8-12 towers, some tier 3 | Multiple threat types per wave. |
| 20 | ~5000-7000 earned | 10-15 towers, several tier 3 | Endgame. Intense but achievable. |

**DPS checkpoint:** at wave N, max achievable DPS from optimal play should be 1.1–1.4× the DPS required to clear the wave. Below 1.1× = too tight. Above 2.0× = too easy.

---

## Common Design Mistakes

| Mistake | Why it fails | Fix |
|---------|-------------|-----|
| One tower dominates | No decisions; game is solved | Orthogonal roles via the balance matrix |
| All creeps feel the same | No adaptation needed | Each type must pressure different tower configs |
| Economy too generous | No tension | Target 60-70% of ideal spending |
| Economy too stingy | No agency | Starting gold affords 2 towers; income allows ~1/wave |
| No wave preview | Can't prepare; failure feels unfair | Always show next wave composition |
| Upgrades strictly beat new towers | Turtle one spot | New towers necessary for new threat types |
| New towers strictly beat upgrades | No commitment | Tier 3 upgrades should be transformative |
| Fast-forward changes sim behavior | Broken trust | Fixed timestep + multiple steps per frame |
| No sell/refund | Stuck on mistakes | 60-70% refund |
| Creeps can be stunlocked | Trivializes difficulty | Diminishing returns or immunity window |
| Brute-force range checks | Frame drops at 100+ entities | Spatial index; precompute tower range cells |
| No path validation on place | Player seals only path | Check connectivity before confirming |

---

## The TD Design Checklist (Ship Gate)

### Player Decisions
- [ ] Every tower type has a clear role and situations where it excels
- [ ] "New tower vs. upgrade" is a real, wave-dependent decision
- [ ] Targeting priority is changeable and matters
- [ ] Economy forces prioritization (can't buy everything)
- [ ] Wave composition pressures diverse builds

### Information Clarity
- [ ] Range circles visible on select and placement
- [ ] Health bars on all creeps
- [ ] Gold, lives, wave always visible
- [ ] Wave preview shows what's coming
- [ ] Damage/kill feedback is immediate and clear
- [ ] Creep types visually distinguishable at a glance
- [ ] Status effects visible on affected creeps

### Balance
- [ ] Starting gold affords 1-2 cheapest towers
- [ ] Income per wave allows ~1 purchase (early)
- [ ] Difficulty outpaces linear play by wave ~5
- [ ] Boss waves test full defense
- [ ] No tower is strictly dominated at same price
- [ ] No creep type lacks a clear counter

### Pacing
- [ ] New creep types introduced one at a time with learning waves
- [ ] Intensity alternates (hard → breather → harder)
- [ ] Boss waves at regular milestones
- [ ] Late-game chaotic but readable
- [ ] Pause between waves for spending

### Mobile
- [ ] Touch targets ≥44pt
- [ ] Placement via tap, not hover
- [ ] Controls at bottom (thumb-reachable)
- [ ] Pause/speed always accessible
- [ ] No hover-dependent interactions

### Architecture
- [ ] Fixed timestep simulation
- [ ] Sim/presentation separated
- [ ] Event bus (not direct coupling)
- [ ] All entities data-driven
- [ ] Transients pooled
- [ ] Range queries spatially indexed

### Juice (see game-juice skill)
- [ ] Tower fires: muzzle flash + projectile trail
- [ ] Creep death: pop particles + gold float
- [ ] Wave complete: fanfare + bonus display
- [ ] Placement: snap + range circle + feedback
- [ ] Damage: health bar + hit flash + damage number
- [ ] Life lost: edge pulse + lives shake