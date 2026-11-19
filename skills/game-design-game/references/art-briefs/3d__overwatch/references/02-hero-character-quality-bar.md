# 02 — Hero Character Quality Bar

Use this reference for new heroes, playable avatars, 3D character redesigns, hero roster audits, class/role readability, and stylized character pipelines.

## Table of Contents

1. Hero quality definition
2. The hero identity stack
3. Role-first visual language
4. Silhouette and posture
5. Shape language and proportion
6. Weapon/tool as identity
7. Color and material hierarchy
8. Face, personality, and story
9. Roster collision control
10. Hero briefs and approval gates
11. Common failure modes
12. Final checklist

---

## 1. Hero quality definition

An Overwatch-class hero is not merely a cool character. It is a **gameplay-readable identity system**.

A passing hero must be:

- instantly recognizable from a gameplay camera
- readable under motion, partial occlusion, and team-fight VFX
- distinct from the existing roster
- aligned with a role/archetype and kit fantasy
- appealing in close-up, but not dependent on close-up detail
- expressive through body language, not only face or VO
- stylized with clean large shapes and controlled detail density
- compatible with skins, animation, first-person weapon view, and enemy readability

The strongest designs feel inevitable:

```text
kit verb + role + silhouette + weapon + posture + motion + personality = one coherent hero fantasy
```

---

## 2. The hero identity stack

Design and audit every hero through this stack.

| Layer | Question | Failure if weak |
|---|---|---|
| Silhouette | Could I identify this hero as a black shape? | Roster confusion. |
| Posture / carriage | Does the body say how this hero moves and fights? | Generic humanoid. |
| Weapon / tool | Is the gameplay function visible? | Kit feels arbitrary. |
| Role mass | Does the body imply tank/damage/support or equivalent role? | Wrong threat expectation. |
| Dominant color/value | Is there a long-distance read? | Character merges with map or roster. |
| Motion signature | Does locomotion/ability movement identify the hero? | Identity vanishes in animation. |
| Face/head anchor | Is there a memorable upper-body focal point? | Low appeal and weak recognition. |
| Material/faction logic | Does the construction belong to the world? | Costume collage. |
| Personality | Does the design imply attitude before voice/text? | Beautiful but empty. |

Hard rule:

```text
No hero should depend on face detail, small decals, or lore knowledge for recognition.
```

---

## 3. Role-first visual language

Role is visual information, not just balance data.

### Tank visual tendencies

A tank or front-line anchor usually reads through:

- large mass and protected volume
- broad shoulders or dominant torso armor
- stable base / heavy stance
- shield, gauntlet, mech, barrier, anchor weapon, or body-as-cover logic
- forward-facing posture
- durable materials
- fewer but larger details

Common shape families:

```text
square / block / dome / slab / shield / heavy cylinder
```

Failure modes:

- too slim to read as durable
- armor detail too noisy to read as mass
- weapon implies damage carry rather than space control
- silhouette collides with damage heroes

### Damage visual tendencies

A damage hero usually reads through:

- directional stance
- weapon-forward posture
- sharper diagonals
- readable aim line or attack vector
- lighter mass than tanks
- high mobility or precision cues
- aggressive or predatory silhouette accents

Common shape families:

```text
diagonal / wedge / blade / rifle line / angular cloak / kinetic asymmetry
```

Failure modes:

- looks like a tank due to mass
- weapon is too small or unclear
- silhouette lacks attack direction
- reads as generic sci-fi soldier

### Support visual tendencies

A support hero usually reads through:

- open, protective, elegant, or service-oriented shapes
- healing/buff device or visible utility tool
- clear ally-facing gesture language
- softer or more luminous material logic
- readable mobility/support affordances
- stable silhouette that does not feel helpless

Common shape families:

```text
circle / arc / wing / staff / halo / pack / beacon / channeling device
```

Failure modes:

- too fragile or passive
- weapon reads only as damage
- healing/utility source is invisible
- support identity relies entirely on color or UI

### Role exceptions

The role read can be subverted, but subversion must be intentional. A slim tank, heavy support, or soft-looking damage hero needs extra clarity in weapon, posture, animation, and VFX to prevent wrong threat assumptions.

---

## 4. Silhouette and posture

### The silhouette contract

A hero silhouette must survive:

```text
flat black render
fast movement
partial cover
skin variants
low resolution
crowded team fight
bright and dark maps
enemy distance
spectator camera
```

### Silhouette anchors

Every hero needs 2–4 large anchors. Examples:

- distinctive headgear/hair/helmet
- shoulder silhouette
- backpack/wing/jetpack
- weapon length/angle
- cloak/cape/coat
- leg stance/base width
- asymmetrical arm/gauntlet
- hovering/floating body plan
- mech/body companion shape

### Upper-body priority

Upper-body mass is more valuable than lower-body micro-detail because it survives camera framing and partial occlusion better. Put important read features near:

```text
head / shoulders / upper back / weapon line / hands/tool
```

### Posture as identity

A hero should have a recognizable default carriage:

- upright commander
- hunched predator
- light-footed flanker
- floating monk
- cocky duelist
- planted fortress
- nervous scientist
- relaxed trickster
- precise sniper
- reckless brawler

Do not treat posture as an animation-only task. Posture begins in concept art.

### Silhouette collision test

Create a black-shape lineup of the full roster and test:

```text
[ ] standing idle
[ ] run pose
[ ] crouch/aim pose
[ ] ability pose
[ ] ultimate pose
[ ] skin variants
[ ] partial cover crop
```

A new hero fails if viewers confuse it with an existing hero more than occasionally.

---

## 5. Shape language and proportion

### Stylized proportion rules

Overwatch-class stylization exaggerates for clarity and appeal:

- heads and hands can be larger than realistic proportions
- shoulders, torso, hips, and weapon lines can be pushed for identity
- armor and tech use simplified planes rather than dense realism
- curves and bevels soften hard-surface design into toy-like appeal
- asymmetry is used to create role and personality anchors

Hard rule:

```text
Stylization must clarify the gameplay fantasy, not merely make anatomy cute or cool.
```

### Large-medium-small distribution

Every hero design should have a controlled distribution:

```text
large masses: identity and role
medium forms: material construction and weapon logic
small details: personality, lore, reward, close-up charm
```

If large/medium/small are evenly distributed everywhere, the hero becomes visual static.

### Shape language table

| Shape | Emotional / gameplay association | Use carefully because |
|---|---|---|
| Square/block | stable, durable, tanky, engineered | Can become boring or too heavy. |
| Circle/arc | friendly, healing, shielding, flow | Can become soft or non-threatening. |
| Triangle/wedge | speed, threat, precision, aggression | Can become spiky noise. |
| Vertical line | elegance, discipline, sniper, authority | Can become fragile or stiff. |
| Wide base | grounded, powerful, stubborn | Can slow the implied motion. |
| Floating mass | mystical, advanced, support, alien | Can undermine grounding and hit-read. |
| Asymmetry | personality, specialization, damage | Can become chaotic if not anchored. |

### Proportion roles

Do not use a single “hero body” template. Use proportion to communicate:

- age/energy
- role/durability
- movement speed
- mechanical augmentation
- faction/material access
- personality
- weapon handling

Avoid generic attractive humanoids with pasted-on gadgets.

---

## 6. Weapon/tool as identity

The weapon or tool is often the most important gameplay prop.

A weapon must communicate:

```text
range
fire cadence
threat type
precision vs area
projectile vs beam vs melee
support vs damage
reload/charge affordance
hero identity
first-person shape
third-person silhouette
```

### Weapon silhouette rules

- The weapon should read in profile and three-quarter view.
- Primary aim/fire direction should be clear.
- Large moving parts should have understandable mechanical logic.
- The weapon must not collide with existing weapons in the roster.
- The weapon should be readable in first person without blocking too much of the screen.
- The weapon should support animation poses that identify the hero.

### Tool/weapon integration

The strongest Overwatch-class weapons feel like extensions of the hero fantasy:

```text
hero verb → weapon mechanism → pose → VFX → sound → UI/reticle → personality
```

Examples of verb-driven tool logic:

- drill/dig/excavate
- heal/channel/protect
- blink/harry/flank
- snipe/observe/punish
- shield/advance/anchor
- hack/disrupt/vanish
- boop/boost/move
- trap/zone/control

If the weapon can be swapped with another hero’s weapon without harming identity, it is under-designed.

---

## 7. Color and material hierarchy

### Color read

Color should serve:

1. hero identity
2. role/archetype reinforcement
3. faction/world believability
4. team/enemy overlays and gameplay states
5. cosmetic variation

A hero should have:

```text
one dominant identity color or value mass
one secondary supporting color/material
one accent family for focal details or tech
clear separation from UI/team danger colors when needed
```

### Material read

Materials must be stylized and readable:

- metal: broad planes, bevel accents, restrained scratches
- cloth: large folds, silhouette behavior, limited texture
- tech: clean panels, readable glowing elements, functional seams
- organic: simplified masses, no pore/noise realism
- armor: big protective forms first, panel lines second

Avoid material realism that competes with shape. Stylized characters should not look like they were kitbashed from photorealistic assets.

### Lighting compatibility

Hero colors and values must survive:

- bright daylight
- night/interior lighting
- warm/cool map palettes
- ability lighting
- outline/highlight systems
- team tinting
- low-health and status states

Do not approve palette from a neutral turntable only.

---

## 8. Face, personality, and story

Faces matter, especially for appeal, marketing, hero gallery, and story. But gameplay identity cannot depend on small facial read.

### Face/head rules

- The head should have a readable focal anchor: hair, helmet, visor, mask, glasses, facial hair, horns, hood, headset, etc.
- The face should reinforce personality quickly: kind, smug, intense, noble, chaotic, anxious, cold, goofy.
- Facial detail can be richer in cinematic/hero select assets than gameplay read requires.
- Head shape must remain compatible with skins and animation.

### Personality through design

A hero’s personality should appear in:

- posture
- hand pose
- weapon handling
- asymmetry
- material care or disrepair
- color confidence
- animation tempo
- facial expression
- stance width
- silhouette attitude

### Story through construction

Story details should answer:

```text
Who built this?
Why does the hero wear/use it?
How is it maintained?
What culture/faction/history does it imply?
What is the one detail players will remember?
```

Avoid lore stickers. Put story into construction logic and silhouette-safe motifs.

---

## 9. Roster collision control

A hero exists in a roster, not in isolation.

### Collision dimensions

Audit against existing roster on:

- silhouette
- height/mass
- posture
- weapon line
- head/shoulder shape
- color/value profile
- material/faction profile
- movement style
- ability/VFX shape
- role fantasy
- skin theming overlap

### Roster map

Maintain a simple roster matrix:

```text
Hero | Role | Primary verb | Silhouette anchors | Weapon/tool | Motion signature | Dominant color/material | Avoid overlap with
```

New heroes should fill an empty or under-served space, not duplicate an existing one with different lore.

### Archetype specificity

Generic archetypes fail. Use sharp combinations:

Bad:

```text
sci-fi soldier
fast ninja
healer mage
big robot tank
```

Better:

```text
disgraced precision medic with long-range biotic rifle
wall-riding sonic support DJ with circular speaker tech
reckless demolitionist with asymmetrical tire/trap silhouette
gravity scientist whose floating posture and orbs imply altered physics
```

---

## 10. Hero briefs and approval gates

### Hero art brief template

```markdown
# Hero Art Brief

## Gameplay Job
- Role:
- Primary verb:
- Range:
- Mobility:
- Threat/support profile:

## Identity Stack
- Silhouette anchors:
- Posture/carriage:
- Weapon/tool:
- Dominant color/value:
- Motion signature:
- Face/head anchor:
- Personality keywords:

## Roster Position
- Closest existing silhouettes:
- How this avoids collision:
- Role/archetype gap filled:

## Shape Language
- Large forms:
- Medium construction forms:
- Small detail accents:
- Asymmetry strategy:

## Material / World Logic
- Faction/culture/source references:
- Manufacturing/construction logic:
- Wear/care logic:

## Camera Requirements
- First-person view needs:
- Third-person enemy read:
- Ally read:
- Spectator read:

## Risks
- Silhouette risks:
- Role-read risks:
- Weapon-read risks:
- Animation/rig risks:
- Skin future-proofing risks:
```

### Approval gates

#### Gate 1 — Verb and role

```text
[ ] The gameplay verb is clear.
[ ] The role/archetype is clear.
[ ] The design is not generic genre filler.
```

#### Gate 2 — Silhouette and roster

```text
[ ] Black silhouette reads.
[ ] Partial occlusion reads.
[ ] Motion silhouette reads.
[ ] No major roster collision.
```

#### Gate 3 — Weapon/tool

```text
[ ] Function reads in first and third person.
[ ] Weapon shape supports kit fantasy.
[ ] Firing/cast posture is distinctive.
```

#### Gate 4 — Stylized believability

```text
[ ] Materials are clear and simplified.
[ ] Construction feels manufactured/equipped, not pasted.
[ ] Story details support hierarchy.
```

#### Gate 5 — Gameplay scene

```text
[ ] Reads on bright map.
[ ] Reads on dark/interior map.
[ ] Reads in team fight.
[ ] Reads with skins/variants considered.
```

---

## 11. Common failure modes

### 11.1 Cool but ambiguous

Symptoms:

- unclear role
- vague weapon/tool
- silhouette could belong to multiple heroes
- too many competing themes

Fix:

- define primary verb
- pick one dominant role fantasy
- exaggerate weapon/tool relationship
- remove secondary themes

### 11.2 Generic sci-fi soldier

Symptoms:

- human proportions
- rifle + armor + visor only
- no unique posture
- no unusual silhouette anchor

Fix:

- push asymmetry
- make weapon specific
- anchor personality in posture
- add one silhouette-defining feature

### 11.3 Overdesigned greeble soup

Symptoms:

- many small panels everywhere
- noisy material transitions
- unreadable value structure
- close-up looks expensive, gameplay read weak

Fix:

- collapse into big material masses
- reserve detail for focal zones
- reduce color accents
- clarify silhouette anchors

### 11.4 Skin-hostile base design

Symptoms:

- identity depends on tiny decals or one fragile accessory
- no clear stable silhouette anchors
- weapon identity too generic
- pose/motion not distinctive

Fix:

- create durable anchors that survive theming
- strengthen posture and weapon line
- define material zones that can be reskinned safely

### 11.5 Beauty-shot-only design

Symptoms:

- incredible portrait/turntable
- poor gameplay camera read
- weapon blocks first-person view
- silhouette collapses in motion

Fix:

- approve from in-engine camera early
- test first-person and third-person simultaneously
- run black-shape motion tests

---

## 12. Final checklist

```text
[ ] The hero has one clear gameplay verb.
[ ] Role/archetype reads visually.
[ ] Silhouette is unique in the roster.
[ ] Posture/carry reads as personality and gameplay.
[ ] Weapon/tool is specific and readable.
[ ] Color/value mass supports distance read.
[ ] Big/medium/small shape hierarchy is controlled.
[ ] Materials are stylized and constructed, not photoreal greebles.
[ ] Face/head anchor is memorable but not the only read.
[ ] Motion signature is planned from concept stage.
[ ] Design works from first-person, enemy third-person, ally, and spectator views.
[ ] Skin future-proofing is considered.
[ ] Hero reads on multiple map palettes and lighting setups.
[ ] The design is appealing after the gameplay read succeeds, not instead of it.
```
