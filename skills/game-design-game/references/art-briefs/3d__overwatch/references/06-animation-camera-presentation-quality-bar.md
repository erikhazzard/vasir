# 06 — Animation, Camera, and Presentation Quality Bar

Use this reference for locomotion, ability animation, first-person presentation, third-person enemy readability, spectator readability, emotes, cinematics/gameplay splits, and camera constraints.

## Table of Contents

1. Animation quality definition
2. Motion as identity
3. Locomotion and posture
4. Ability animation grammar
5. First-person presentation
6. Third-person enemy read
7. Skins, rigs, and animation constraints
8. Emotes, intros, and non-combat animation
9. Cinematic vs gameplay split
10. Camera, spectator, and replay readability
11. Optional first-person/VR branch
12. Common failure modes
13. Final checklist

---

## 1. Animation quality definition

Overwatch-class animation is not just smooth, expensive, or expressive. It is **identity in motion**.

A passing animation must:

- communicate hero identity
- reveal gameplay intent
- preserve silhouette under motion
- signal timing and counterplay
- feel responsive in first person
- read clearly to enemies and allies
- support skins without misleading behavior
- reinforce role, personality, and physicality

Smoothness is secondary to read.

---

## 2. Motion as identity

A hero should be recognizable by how they move.

Motion identity comes from:

- stance
- gait
- weight
- tempo
- arm carriage
- weapon handling
- head/torso behavior
- ability windups
- airborne posture
- landing recovery
- idle behavior
- follow-through on hair/cloth/gear

A black silhouette animation test should still suggest who the hero is.

### Motion signature template

```markdown
# Motion Signature

- Locomotion tempo:
- Center of mass:
- Arm/weapon carriage:
- Head/torso attitude:
- Idle rhythm:
- Jump/fall behavior:
- Ability anticipation style:
- Ultimate pose language:
- Hit/recovery behavior:
- Personality adjectives:
```

---

## 3. Locomotion and posture

### Locomotion communicates role

| Role/archetype | Motion tendencies |
|---|---|
| Tank / anchor | grounded, wider stance, slower center shifts, powerful weight transfer |
| Flanker | light, low, fast directional changes, compressed anticipation |
| Sniper | controlled, upright or disciplined, minimal wasted movement |
| Brawler | forward weight, aggressive shoulders, heavy impacts |
| Support | readable hand/tool gestures, protective or flowing rhythm |
| Trickster | asymmetry, playful timing, sudden shifts |
| Floating/ethereal | clear hover logic, stable silhouette, distinct vertical rhythm |

These are tendencies, not laws. Exceptions need stronger compensating cues.

### Idle pose

Idle should reinforce:

- personality
- role
- weapon readiness
- silhouette
- emotional state

Idle should not:

- break the silhouette constantly
- create false ability cues
- hide weapon/tool
- over-animate in a way that distracts in gameplay

### Movement readability

Movement must preserve:

```text
head/upper-body identity anchor
weapon/tool line
role mass
team/enemy read
hitbox expectation
ability readiness cues
```

---

## 4. Ability animation grammar

Ability animations are gameplay communication.

### Ability animation states

```text
anticipation → commitment → active execution → impact/reaction → recovery/cancel/readiness
```

### Anticipation

Anticipation should communicate:

- which ability is coming
- direction or target if relevant
- threat/support level
- interrupt/counterplay window when relevant

### Commitment

Commitment should match gameplay risk. A major ability usually needs a more legible pose or sound/VFX cue than a minor one.

### Active execution

The active pose should preserve:

- source location
- aim direction
- active boundary or projectile path
- hero silhouette
- hit/read consistency

### Recovery

Recovery should show whether the hero can act again. A recovery pose that looks active after gameplay has ended creates false information.

### Animation/VFX/audio lock

Animation, VFX, and audio should agree on timing. If a hand releases late, the projectile appears early, and audio fires at a third timing, players lose trust.

---

## 5. First-person presentation

First-person presentation is an art-direction problem, not just camera implementation.

### First-person priorities

1. aim and target visibility
2. input responsiveness
3. weapon/tool identity
4. ability state feedback
5. tactile fantasy
6. polish/detail

### Weapon position

The first-person weapon/tool should:

- identify the hero
- reveal state/charge/reload when needed
- avoid blocking center aim space
- avoid excessive peripheral noise
- support skins safely
- maintain consistent source relationship to projectiles

### Screen-space VFX

Self VFX should be rich but bounded:

- avoid center-screen opacity during aiming
- avoid sustained flashes that hide targets
- use periphery for flavor when possible
- make charge/ultimate states clear
- scale down persistent effects during target-critical moments

### Camera motion

Camera movement can sell power, but it is risky:

- shake should be brief and gameplay-safe
- recoil should support feel without fighting aim unfairly
- dash/blink/teleport should communicate displacement without nausea
- ultimate cameras should not hide critical enemy information unless gameplay intentionally does so

---

## 6. Third-person enemy read

Enemy-facing animation is the fairness layer.

Enemies must understand:

```text
who the hero is
what ability is being used
where it is aimed
when it becomes dangerous
whether they can interrupt/counter/avoid it
when it is over
```

### Enemy read rules

- Major abilities need clear anticipation.
- Animation should expose weapon/tool source.
- Silhouette should not collapse into generic poses.
- Similar heroes need distinct cast shapes.
- Movement abilities need readable start/end points.
- Transformations must preserve hero identity or clearly indicate state.

### Partial occlusion

Test ability poses when only head/shoulders/weapon/upper torso are visible. Many combat decisions happen around corners and cover.

---

## 7. Skins, rigs, and animation constraints

Skins must respect animation logic.

### Rig-aware skin design

Before approving a skin, ask:

```text
Will cloth/armor clip during key poses?
Will added shapes fake a different attack arc?
Will the weapon still align with existing hand/IK positions?
Will moving parts imply new mechanics?
Will silhouette additions obscure ability anticipation?
Does the skin require rig behavior that the base hero does not have?
```

### Skin animation parity

Skin variants must preserve:

- locomotion identity
- ability anticipation poses
- weapon handling
- ultimate pose recognition
- hit/recovery behavior
- perceived mobility

### Dynamic attachments

Capes, hair, tails, chains, wings, and dangling props are high-risk because they can:

- create extra silhouette noise
- obscure weapon/tool
- imply false hitbox
- clip during movement
- distract in first person or enemy view

Use with restraint and test in combat.

---

## 8. Emotes, intros, and non-combat animation

Non-combat animation can push personality harder than combat animation.

### Safe push zones

- hero select
- emotes
- highlight intros
- victory poses
- inspect animations
- lobby/menus
- cinematics

### Still preserve identity

Even non-combat animation should respect:

- hero personality
- role fantasy
- body mechanics
- skin construction
- world tone

### Do not let non-combat animation pollute combat expectations

If a hero can do something spectacular in an emote that looks like an ability, players may misread the character. Keep non-combat fantasy distinct from gameplay signals when needed.

---

## 9. Cinematic vs gameplay split

Cinematics and gameplay have different needs.

### Cinematic assets can emphasize

- facial nuance
- emotional acting
- cloth/hair detail
- cinematic lighting
- secondary props
- camera-specific composition
- close-up material detail

### Gameplay assets must emphasize

- silhouette
- weapon/tool read
- ability timing
- motion identity
- collision/hit-read
- responsiveness
- VFX clarity

### Shared identity

The cinematic and gameplay versions should feel like the same character. Do not let cinematic realism undermine gameplay stylization or vice versa.

---

## 10. Camera, spectator, and replay readability

Hero action games are watched as well as played.

### Spectator needs

- hero ID at pulled-back camera
- ultimate and objective state readability
- team-fight hierarchy
- clear kill/impact moments
- lane/objective context
- reduced VFX clutter from overview angles

### Replay/killcam needs

- causality clarity
- readable source of damage or save
- ability identity
- no misleading cosmetic effects
- fair explanation of what happened

### Marketing/hero-gallery needs

Marketing can showcase details that gameplay cannot, but marketing should not misrepresent the gameplay read. Hero-gallery poses should highlight the same identity anchors used in combat.

---

## 11. Optional first-person/VR branch

If the project is first-person-heavy or VR-adjacent, apply stricter presentation rules.

### VR/embodied camera cautions

- weapon/tool silhouette must not occlude hands or targets excessively
- VFX near the camera should be less opaque and less strobing
- camera shake should be minimized
- motion effects must avoid nausea
- hit feedback should use peripheral, haptic, audio, and spatial cues rather than full-screen obstruction
- ally/enemy effects need spatial clarity from multiple head positions

### Embodied gesture readability

In VR or embodied systems, hands and tools become more important identity carriers. Make sure:

- hand poses are clear
- tool function is readable from player viewpoint
- gestures have anticipation/confirmation
- self effects do not cover interaction affordances

---

## 12. Common failure modes

### 12.1 Smooth but generic

Symptoms:

- clean animation
- no unique posture or timing
- could belong to any hero

Fix:

- define motion signature
- exaggerate role-specific center of mass
- build hero-specific weapon handling

### 12.2 First-person spectacle obstruction

Symptoms:

- great-looking weapon/VFX
- target hidden
- center screen cluttered
- recoil/shake too strong

Fix:

- move effects peripheral
- reduce opacity/brightness near aim line
- retime muzzle/impact
- test at combat speed

### 12.3 Ability cue mismatch

Symptoms:

- animation suggests one timing, gameplay another
- VFX arrives before gesture
- recovery looks active

Fix:

- lock animation/VFX/audio/gameplay frames
- distinguish active/decay states
- align anticipation with counterplay

### 12.4 Skin breaks motion

Symptoms:

- cloth/armor clips
- added parts hide cast pose
- silhouette changes during locomotion
- weapon grip no longer believable

Fix:

- reduce dynamic attachments
- re-anchor additions to existing moving parts
- test in ability poses before render polish

### 12.5 Cinematic drift

Symptoms:

- cinematic version too realistic
- gameplay version feels cheap by comparison
- facial/detail expectations do not match combat asset

Fix:

- define shared identity anchors
- separate close-up detail from gameplay read
- keep stylized construction consistent

---

## 13. Final checklist

```text
[ ] Hero has a defined motion signature.
[ ] Locomotion reinforces role and personality.
[ ] Ability animations communicate anticipation, active state, and recovery.
[ ] First-person weapon/tool view is aim-safe and identity-rich.
[ ] Enemy third-person view communicates source, timing, and counterplay.
[ ] Animation, VFX, audio, and gameplay timing align.
[ ] Skins preserve rig logic and motion identity.
[ ] Dynamic attachments do not create silhouette noise or false hitboxes.
[ ] Non-combat animations push personality without confusing gameplay signals.
[ ] Cinematic and gameplay versions share identity anchors.
[ ] Spectator/replay views remain understandable.
[ ] VR/embodied camera constraints are handled when relevant.
```
