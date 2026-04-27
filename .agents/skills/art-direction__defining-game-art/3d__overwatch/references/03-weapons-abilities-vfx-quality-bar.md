# 03 — Weapons, Abilities, and VFX Quality Bar

Use this reference for weapons, projectiles, ultimates, status effects, first-person ability presentation, cosmetic VFX variants, and combat readability audits.

## Table of Contents

1. Combat VFX quality definition
2. Ability grammar
3. Criticality ladder
4. Ownership and team readability
5. Shape, color, timing, and audio/animation coupling
6. Weapon readability
7. First-person vs third-person vs spectator view
8. Ultimate and high-impact ability rules
9. Cosmetic and mythic VFX rules
10. VFX budgets
11. Review templates
12. Common failure modes
13. Final checklist

---

## 1. Combat VFX quality definition

Overwatch-class VFX is not “maximum spectacle.” It is **gameplay-safe spectacle**.

A passing effect must answer:

```text
Who owns this?
Is it ally, enemy, self, neutral, or environmental?
What type of action is it?
Where is the dangerous or useful area?
When does it start being active?
When does it stop being active?
What should the player do about it?
How important is it relative to everything else on screen?
```

The highest bar is an effect that is exciting, iconic, branded to the hero, and readable during visual overload.

---

## 2. Ability grammar

Every ability should be designed as a sequence of readable states.

```text
anticipation → cast/release → travel/area establishment → active effect → impact/result → decay/cleanup
```

### State requirements

| State | Must communicate | Typical tools |
|---|---|---|
| Anticipation | Something is about to happen; source and direction. | Pose, wind-up, glow build, sound cue, reticle/hand motion. |
| Cast/release | Ability has started; ownership and vector. | muzzle flash, hand burst, projectile birth, cast circle, voice cue. |
| Travel / area setup | Path, speed, destination, danger or utility. | trail, leading edge, ground decal, beam, arc, icon, boundary. |
| Active | Exact gameplay zone and state. | shape boundary, pulse cadence, team color, opacity hierarchy. |
| Impact/result | Damage, heal, cleanse, stun, shield, buff, debuff, displacement. | hit spark, body effect, status icon, sound, animation reaction. |
| Decay/cleanup | Effect is no longer dangerous/useful. | fast fade, dissolve, particles retreat, color desaturation. |

Hard rule:

```text
An effect is not complete until its active and inactive states are visually distinguishable.
```

---

## 3. Criticality ladder

Budget VFX intensity by gameplay importance.

| Priority | Signal type | Visual treatment |
|---:|---|---|
| 1 | Immediate lethal threat / ultimate / hard crowd control | Highest clarity, unique shape, strong audio, unmistakable boundary, low ambiguity. |
| 2 | High-value enemy projectile / area denial / sniper or burst indicator | Clear source, path, danger, timing; avoid opaque clutter. |
| 3 | Ally save / heal / shield / cleanse / mobility enable | Clear enough for teammates, less visually dominant for enemies unless it changes their decisions. |
| 4 | Sustained primary-fire feedback | Recognizable but not screen-filling; must not obscure target tracking. |
| 5 | Status and buffs/debuffs | Iconic local cue, not full-screen spam. |
| 6 | Cosmetic flourish / skin fantasy | Richest in self/ally/hero-gallery views; restrained enemy-facing function. |
| 7 | Ambient environmental particles | Subordinate to all combat signals. |

Do not let lower-priority effects visually overpower higher-priority ones.

---

## 4. Ownership and team readability

Every active effect needs ownership clarity.

### Ownership classes

```text
self
ally
enemy
neutral / environmental
objective / map mode
```

### Team-read rules

- Enemy danger should be readable immediately and consistently.
- Ally utility should be visible enough to coordinate, but not so intense that it hides enemies.
- Self effects can be richer, but must not block aiming or target tracking.
- Neutral/map effects need distinct treatment so they are not mistaken for hero abilities.
- Skins must not change ownership read in enemy-facing gameplay.

### Color rules

Color can help ownership, but should not be the only cue. Use redundant cues:

```text
color + shape + motion + position + audio + icon/reticle/context
```

Relying only on red/blue/green/yellow is fragile because lighting, colorblindness, skins, and map palettes can interfere.

---

## 5. Shape, color, timing, and audio/animation coupling

### Shape is the fastest read

Effects should have unique shape families:

- beam
- orb
- pulse
- cone
- ring
- wall
- trail
- projectile bolt
- swarm
- ribbon
- blade arc
- ground decal
- shield plane
- tether

If two abilities share a similar color, shape should differentiate them. If shape is similar, timing and motion should differentiate them.

### Timing is information

VFX timing should match gameplay timing:

- wind-up before danger
- active state exactly aligned to hit/effect window
- decay fast enough to avoid false danger
- lingering only when gameplay remains active
- projectile trails long enough to read origin/path, not so long they become fog

### Motion is meaning

- Straight fast line: precision, projectile, hitscan-like intent.
- Expanding ring: area or activation boundary.
- Downward strike: impact, punishment, vertical threat.
- Swirl/vortex: pull, slow, confusion, area control.
- Flowing ribbon: heal/support/mobility.
- Jagged burst: damage, shock, explosive force.

### Audio and animation coupling

VFX, animation, and audio should reinforce the same action:

```text
pose anticipation + sound anticipation + VFX build
release gesture + muzzle/cast burst + firing sound
impact animation + hit VFX + result sound
```

If VFX says “soft support” and audio says “lethal explosion,” the ability sends mixed messages.

---

## 6. Weapon readability

Weapons must read in both first and third person.

### Weapon read dimensions

| Dimension | Questions |
|---|---|
| Range | Does shape imply close, mid, long, beam, projectile, melee, area? |
| Cadence | Does it look like burst, automatic, charged, single-shot, reload-heavy? |
| Power | Does mass/animation/VFX support expected impact? |
| Source | Can enemies tell where shots originate? |
| Identity | Could the projectile or muzzle flash be recognized before the hero model is visible? |
| State | Can players tell reload, charge, overheat, scoped, alternate mode, empowered? |
| Ergonomics | Does the weapon look holdable and animatable? |

### First-person weapon rules

- The weapon must not dominate screen space during target acquisition.
- Muzzle flashes should communicate firing without hiding the target.
- Reload and state animations should be readable but not overly busy.
- Weapon variants/skins must preserve the reticle-to-muzzle relationship.
- Charged states need clear peripheral information.
- The weapon silhouette should be distinctive even when only the hands/tool are visible.

### Third-person weapon rules

- Weapon length, angle, and pose must identify threat type.
- Enemy muzzle/source should be readable at combat distance.
- Weapon skin variants must not imply different gameplay mechanics.
- Large cosmetic additions must not fake hitbox or shield/bulk changes.

---

## 7. First-person vs third-person vs spectator view

A high-quality combat effect has multiple views.

### Self view

Goal:

```text
feel powerful, responsive, expressive, and satisfying without blocking aim
```

Self-view may use:

- richer weapon animation
- hand/weapon VFX
- controlled screen shake
- UI/reticle feedback
- charge indicators
- higher detail texture/effect work

### Ally view

Goal:

```text
support coordination and reassurance without cluttering target read
```

Ally-view should emphasize:

- healing/support source
- buff/cleanse confirmation
- protective boundaries
- teammate mobility actions
- ultimate callouts

### Enemy view

Goal:

```text
communicate threat, ownership, location, timing, and counterplay
```

Enemy-view must be conservative and consistent. It should not require relearning across skins.

### Spectator/replay view

Goal:

```text
make the fight understandable from a pulled-back or cinematic camera
```

Spectator view often suffers most from VFX clutter. Test team fights from observer cameras, not only player POV.

---

## 8. Ultimate and high-impact ability rules

Ultimates and high-impact abilities require special treatment.

### Ultimate requirements

```text
[ ] unmistakable hero ownership
[ ] strong anticipation or activation cue
[ ] readable danger/support boundary
[ ] clear active duration
[ ] clear counterplay window when applicable
[ ] does not fully hide targets unless hiding is the explicit gameplay mechanic
[ ] decays when the gameplay state ends
[ ] recognizable across skins
```

### Ultimate shape families

Choose one dominant family and keep it iconic:

- linear charge/path
- expanding area
- vertical strike
- persistent field
- summon/construct
- beam/channel
- transformation state
- projectile barrage
- movement burst

Do not combine all families at full intensity.

### Area-of-effect clarity

AoE must show:

```text
center/source
boundary
height/depth if relevant
active timing
ownership
severity
```

Hard rule:

```text
A pretty AoE that does not reveal its boundary is a bad gameplay effect.
```

---

## 9. Cosmetic and mythic VFX rules

Cosmetic VFX is one of the highest-risk live-service art areas.

### Cosmetic VFX parity contract

For enemy-facing gameplay, variants must preserve:

```text
ability identity
source location
timing
projectile size/read
danger/support boundary
impact read
decay timing
team/ownership read
counterplay readability
```

### Where cosmetics may vary more

Cosmetic richness can be higher in:

- hero select
- first-person self effects, within aim-safe limits
- ally celebration/read
- emotes/highlights/victory poses
- killcam flourish, if not misleading
- non-combat inspect animations
- post-impact flavor after gameplay decision is complete

### Enemy relearning ban

Do not make enemies relearn:

- projectile shape family
- active vs inactive state
- ultimate boundary
- cast timing
- ownership color/shape
- weapon range
- hit-read
- silhouette/motion of the casting hero

### Competitive advantage and disadvantage

Both are failures:

- **Pay-to-win**: a cosmetic hides threat, reduces visibility, alters perceived hitbox, or makes the player harder to track.
- **Pay-to-lose**: a cosmetic adds extra noise, louder visual/audio cues, larger apparent shape, or self-obstruction.
- **Pay-to-confuse**: a cosmetic makes hero/ability identity ambiguous.

---

## 10. VFX budgets

Use budgets to prevent good taste from becoming particle soup.

### Budget dimensions

| Dimension | Question |
|---|---|
| Opacity | How much of the scene does this obscure? |
| Duration | How long does it persist after the decision is made? |
| Screen area | How much of the player/spectator view can it cover? |
| Brightness | Does it overpower higher-priority signals? |
| Motion frequency | Does it flicker/pulse enough to distract? |
| Particle count | Does it create noise at combat scale? |
| Color overlap | Does it collide with team, map, or other ability colors? |
| Shape uniqueness | Can players distinguish it from similar effects? |
| Platform cost | Does it threaten performance/read stability? |

### Budget ladder

```text
Critical threat: high clarity, controlled intensity, short/high-signal duration
Sustained fire: moderate intensity, low obstruction, high consistency
Support utility: readable but not target-obscuring
Cosmetic flavor: self/ally-rich, enemy-conservative
Ambient: lowest intensity, easy to disable/reduce if needed
```

### Decay discipline

Effects often fail because the active phase is readable but the decay lingers too long. Decay should usually:

- lose saturation
- reduce opacity quickly
- shrink or disperse away from the action
- avoid false active boundaries
- preserve only flavor, not danger implication

---

## 11. Review templates

### Ability VFX brief

```markdown
# Ability VFX Brief

## Gameplay Function
- Hero:
- Ability:
- Role in kit:
- Damage/heal/control/mobility/status:
- Criticality level:

## Read Contract
- Owner read:
- Ally read:
- Enemy read:
- Self read:
- Counterplay read:

## Grammar
- Anticipation:
- Cast/release:
- Travel/area setup:
- Active state:
- Impact/result:
- Decay/cleanup:

## Visual Language
- Shape family:
- Color/value family:
- Motion behavior:
- Material/element fantasy:
- Audio/animation coupling notes:

## Budgets
- Opacity:
- Duration:
- Screen coverage:
- Brightness:
- Particle density:
- Performance notes:

## Risks
- Similar abilities:
- Map color collisions:
- Skin/cosmetic variant risks:
- Spectator clutter risks:
```

### Weapon review

```text
[ ] Function reads in silhouette.
[ ] First-person view is aim-safe.
[ ] Third-person source/direction reads.
[ ] Muzzle/impact do not hide target tracking.
[ ] State changes are clear.
[ ] Variants preserve weapon identity.
[ ] Weapon shape belongs to hero fantasy.
```

---

## 12. Common failure modes

### 12.1 Spectacle over read

Symptoms:

- big opaque explosions
- too many particles
- lingering smoke/glow
- target hidden during primary combat decisions

Fix:

- reduce opacity
- clarify core shape
- shorten decay
- separate gameplay boundary from flavor

### 12.2 Same-color ability soup

Symptoms:

- multiple heroes/effects use similar hue and glow
- team fight becomes blue/purple/orange haze
- ownership unclear

Fix:

- differentiate shape family
- add motion/timing cues
- adjust saturation/value hierarchy
- reserve color families per signal type where possible

### 12.3 Cosmetic relearning

Symptoms:

- skin variant projectile looks like a different ability
- ultimate boundary changed too much
- enemy cannot identify source

Fix:

- restore base ability silhouette/timing
- move fantasy into post-impact or self/ally view
- keep enemy-facing shape conservative

### 12.4 First-person obstruction

Symptoms:

- weapon blocks center screen
- muzzle flash covers target
- reload/charge animation too busy
- self effect hides enemy

Fix:

- move flourish to periphery
- cut brightness/opacity near aim line
- reduce hand/weapon over-animation
- test at high FOV/low FOV if supported

### 12.5 False active state

Symptoms:

- decay looks dangerous
- AoE boundary remains after effect ends
- projectile trail implies wrong path

Fix:

- create distinct active/inactive visual states
- fade gameplay boundary first
- move flavor away from target space

---

## 13. Final checklist

```text
[ ] Ability grammar has anticipation, active, impact, and decay states.
[ ] Ownership is clear without relying on color alone.
[ ] Criticality matches intensity.
[ ] Danger/support boundaries are readable.
[ ] Effects do not obscure target acquisition.
[ ] First-person view feels powerful but remains aim-safe.
[ ] Third-person enemy view communicates source, timing, and counterplay.
[ ] Spectator view remains understandable.
[ ] Cosmetic variants preserve enemy-facing identity and fairness.
[ ] High-impact abilities have unmistakable but controlled presentation.
[ ] Decay does not create false danger.
[ ] VFX belongs to hero fantasy without overwhelming combat hierarchy.
```
