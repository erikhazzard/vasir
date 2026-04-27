# Character Sprite Quality Bar

Read this reference when directing, critiquing, generating, or validating premium top-down / isometric-ish 2D RPG character sprites, NPCs, overworld enemies, or 3D-to-sprite output.

## Table of Contents

1. Quality definition
2. Read hierarchy
3. Source scale and sheet conventions
4. Proportion system
5. Body-type library
6. Identity anchor system
7. Head, face, hair, and headgear
8. Hands, feet, props, and gesture
9. Palette and material ramps
10. Shading and pixel-cluster discipline
11. Outline and contour language
12. Grounding and shadow
13. Directional consistency
14. Character prompt/spec template
15. Common failure modes
16. Character approval checklist

---

## 1. Quality Definition

A Sea-of-Stars character must read as a premium authored overworld sprite: iconic, expressive, toy-like, legible, and disciplined. It should feel hand-designed even when produced through a pipeline.

The character is not approved because it looks attractive enlarged. It is approved because it remains clear, charming, and role-specific at gameplay scale, in all required directions, in motion, and inside representative scenes.

Core sentence:

> A character sprite passes when its silhouette, body type, identity anchor, dominant color, planted feet, and motion grammar all read before any micro-detail matters.

---

## 2. Read Hierarchy

Every character must read in this order:

```text
1. overall silhouette
2. body type / role read
3. dominant color mass
4. identity anchor
5. pose / action / direction
6. face and focal accents
7. material detail and accessories
```

The face is a focal accent, not the identity system. Clothing seams, belts, trims, tiny highlights, and facial marks cannot be asked to carry the character.

### Half-second test

At gameplay scale, ask:

```text
Can I identify the character's role and approximate personality in under half a second?
```

If no, fix silhouette, proportion, dominant color, or identity anchor before adding any detail.

---

## 3. Source Scale and Sheet Conventions

These are local conventions, not universal laws. Adjust to project runtime, but keep the ratios.

Reference authoring layout:

```text
CELL:       256 x 256 px for high-res reference checking
SHEET:      1024 x 1024 px
GRID:       4 columns x 4 rows
DIRECTIONS: front, back, left, right
FRAMES:     4 per direction for standard walk
EXPORT:     transparent PNG sheet or equivalent atlas
```

Common runtime layout:

```text
CELL:       64 x 64 px or similar
GRID:       same semantic order
RATIOS:     preserved from reference scale
```

Hard sheet constraints when the project declares a 4x4 walk sheet:

```text
[ ] no empty cells
[ ] row 0 = front
[ ] row 1 = back
[ ] row 2 = left
[ ] row 3 = right
[ ] frame 0 = contact-right
[ ] frame 1 = center/pass A
[ ] frame 2 = contact-left
[ ] frame 3 = center/pass B
```

Do not let sheet validity masquerade as art quality. Sheet validity is only the floor.

---

## 4. Proportion System

Use ratios rather than absolute pixels.

### Base proportion target

```text
Character height within cell:      55–65%
Head height of character:          35–42%
Torso height of character:         22–30%
Leg height of character:           30–38%
Head-to-body ratio:                ~2.25–2.75 heads tall
Hands:                             intentionally enlarged for gesture/read
Feet:                              broad enough to ground at gameplay scale
Shoulder/head relationship:        head width near shoulder width for cute/chibi read
```

These are heuristics. Break them only when the read improves and the body type remains intentional.

### Why these ratios exist

| Feature | Bad default | Damage | Better instinct |
|---|---|---|---|
| Small head | Realistic model proportions | Character loses charm and face/identity read | Enlarge head and upper-body read |
| Long torso | Anatomical literalism | Mid-body becomes mush; legs vanish | Compress torso into clear block |
| Tiny hands | Source model preservation | Gesture disappears | Enlarge hands as readable mitts/forms |
| Tiny feet | Realistic anatomy | Sprite floats/slides | Widen feet; emphasize contact |
| Narrow silhouette | Literal render contour | Role/personality unclear | Push body-type silhouette |

### Compression rule

For overworld sprites, compress detail into symbolic masses:

```text
head / upper identity / torso block / arm masses / feet / prop
```

Do not preserve every anatomical transition from the source.

---

## 5. Body-Type Library

Pick one dominant body type. Do not blend casually.

### Type A — Lean / Agile

Use for protagonists, scouts, rangers, young adventurers, lightly armored characters.

```text
Height:       55–60% of cell
Width:        30–35% of cell
Read:         quick, clear, open, mobile
Silhouette:   compact vertical with readable head/feet
Risk:         becoming too thin or generic
```

Design notes:

- keep feet readable despite smaller width
- give identity anchor extra emphasis
- avoid tiny arms/hands

### Type B — Stocky / Grounded

Use for guards, warriors, blacksmiths, authority figures, heavy workers.

```text
Height:       58–65% of cell
Width:        40–50% of cell
Read:         strong, dependable, planted
Silhouette:   broad shoulders, broad feet, compact torso
Risk:         becoming rectangular or blob-like
```

Design notes:

- use shoulder/helmet/tool silhouette to avoid boxiness
- make stance clearly grounded
- reduce torso micro-detail to avoid mud

### Type C — Round / Cozy

Use for merchants, elders, children, comedic NPCs, warm villagers.

```text
Height:       50–56% of cell
Width:        38–46% of cell
Read:         soft, approachable, warm
Silhouette:   round head/body, simple limbs
Risk:         losing feet and arm readability
```

Design notes:

- keep hands/feet visible
- use accessory or head shape for identity
- avoid making the character a featureless blob

### Type D — Tall / Elegant

Use for mages, royalty, nobles, ethereal figures, elegant villains.

```text
Height:       62–70% of cell
Width:        32–38% of cell
Read:         refined, vertical, elevated
Silhouette:   elongated cloak/hair/staff shapes
Risk:         becoming too realistic or spindly
```

Design notes:

- preserve chibi head ratio enough for setting cohesion
- exaggerate robe/cape/staff as identity anchor
- keep feet/contact shadow grounded

### Type E — Creature / Mascot

Use for nonhuman companions, small monsters, familiars, mascots.

```text
Height:       role-dependent
Width:        role-dependent
Read:         one-sentence silhouette gimmick
Silhouette:   dominated by creature-specific head/body/limb shape
Risk:         over-detailing texture/fur/scales
```

Design notes:

- one dominant read: ears, tail, shell, wings, horns, jaw, etc.
- do not rely on face markings alone
- ensure animation supports creature weight

---

## 6. Identity Anchor System

Every character needs one dominant identity anchor that survives gameplay scale.

Valid identity anchors:

```text
hair mass
hat / helmet
horns / ears
beard / moustache
cape / scarf
weapon / staff / tool
backpack / shoulder piece
dominant color block
unique posture
nonhuman silhouette feature
```

### Anchor requirements

```text
[ ] breaks generic skull/torso silhouette
[ ] reads in all required directions
[ ] remains visible at 25% preview scale
[ ] does not depend on face micro-detail
[ ] carries more identity than clothing trim
```

### Anchor hierarchy

Use one primary anchor and one optional secondary anchor.

Bad:

```text
hair + hat + scarf + shoulder armor + weapon + backpack all competing equally
```

Good:

```text
primary: crescent helmet silhouette
secondary: blue cloak color mass
all other detail subordinate
```

### Cast differentiation

A party or village cast should not share the same anchor type too often. Vary:

- top silhouette
- width/height ratio
- dominant hue
- accessory category
- posture/stance
- motion personality

---

## 7. Head, Face, Hair, and Headgear

### Head construction

The head is a major read mass. Treat it as design real estate, not anatomy.

```text
Upper head:      hair/headgear/forehead frame
Mid-lower head:  eyes and facial focal zone
Lower face:      tiny optional mouth/nose hint
```

### Face rules

```text
Eyes:         clear dark focal marks; tiny highlight allowed
Eye spacing:  stable and simple
Nose:         omitted or minimal hint
Mouth:        omitted or tiny controlled accent
Brow:         only if expression/role requires it
```

Failure:

- tiny realistic nose and lips
- multiple facial lines competing at low scale
- eyes drifting between directions
- expression only readable enlarged

### Hair rules

Hair must usually be designed as a few big masses, not strands.

```text
[ ] breaks skull silhouette
[ ] has one dominant flow
[ ] uses 3–5 controlled tones
[ ] avoids strand-noise and random spikes
[ ] supports identity more than texture
```

Hair extension heuristic:

```text
Hair/headgear can extend 10–25% beyond the neutral skull height when it improves identity.
```

### Headgear rules

Hats and helmets should be treated like hair: silhouette-first, detail-second.

Good headgear:

- obvious outer contour
- readable brim/crown/crest/horn
- local color outline
- minimal internal trim

Bad headgear:

- too many tiny bands/rivets
- literal 3D helmet facets
- dark mass that merges with face

---

## 8. Hands, Feet, Props, and Gesture

### Hands

Hands are gesture anchors. They may be oversized relative to realistic anatomy.

Requirements:

```text
[ ] visible against torso/clothing
[ ] wider or brighter than forearm when needed
[ ] pose supports character role
[ ] not lost in side/back views
```

### Feet

Feet are grounding anchors.

Requirements:

```text
[ ] readable planted contact
[ ] broad enough to prevent hovering
[ ] clear front/back/side orientation
[ ] not hidden by long torso or cloak unless shadow/contact compensates
```

### Props and weapons

Props must either carry identity or stay subordinate.

Rules:

- a staff/sword/tool may be primary identity anchor
- prop silhouette must not tangent-confuse with body outline
- tiny prop detail is less important than clean prop shape
- prop motion must follow animation hierarchy

---

## 9. Palette and Material Ramps

Palette quality is not just color count. It is ramp discipline, value hierarchy, and color identity.

### Suggested source-sprite budgets

```text
Hero / main cast:        24–36 colors target, 40 hard max
Major NPC:               16–28 colors target
Minor NPC:               10–20 colors target
Tiny background NPC:      8–16 colors target
```

These apply to the source/albedo sprite, not the final lit runtime screenshot.

### Material tone budgets

```text
Skin:                    3–5 tones
Hair:                    3–5 tones
Primary clothing:        3–5 tones
Secondary clothing:      2–4 tones
Metal/accessories:       2–4 tones
Eyes/focal accents:      1–3 tiny colors
```

### Ramp requirements

```text
[ ] each ramp has clear highlight/base/shadow/deep-shadow role
[ ] shadows hue-shift deliberately, not randomly
[ ] skin shadows stay warm/living, not dead gray-brown
[ ] darks separate materials without becoming black soup
[ ] highlights are scarce and meaningful
```

### Dominant color rule

Every character needs one dominant distance-read color or color relationship.

Examples:

```text
red hair + cream face
blue cloak + pale staff
gold helmet + dark armor
green backpack + tan explorer outfit
```

At reduced scale, the character should still be identifiable by silhouette + dominant color + identity anchor.

---

## 10. Shading and Pixel-Cluster Discipline

### Cluster principle

A pixel cluster must do at least one job:

```text
form | material | motion | hierarchy | silhouette | focal accent
```

If it does none of those, remove or merge it.

### Base shading rules

```text
[ ] hard stepped forms
[ ] no uncontrolled gradients
[ ] no painterly blend mush
[ ] no texture noise from source render
[ ] no single-pixel peppering except intentional focal accents
[ ] no dithering unless the project explicitly chooses that aesthetic
```

### Cluster shape guidance

Strong clusters are:

- grouped
- readable as planes or forms
- aligned with material logic
- different by material category
- quiet where the silhouette already works
- concentrated around focal areas

Weak clusters are:

- evenly distributed
- single-pixel speckle
- copied from source texture
- random lighting artifacts
- tiny anatomy bumps
- noisy hair strands

### Detail density rule

Detail density should generally follow:

```text
face / identity anchor: highest, still restrained
upper torso / prop:     medium
legs / feet:            clear shape, lower texture
back views:             simpler but not empty
```

---

## 11. Outline and Contour Language

Outlines are local, selective, and directional. They are not a uniform black shell.

### Outline rules

```text
Outer silhouette:        usually present
Bottom/right/shadow side: darker or heavier
Top/left/lit side:       lighter, thinner, partial, or absent
Internal lines:          only major separations
Pure black:              forbidden unless project-specific exception
Outline color:           darkened local fill color
```

### Why local outlines matter

A blue cloak edge, skin cheek edge, and brown boot edge should not all have the same contour color. Local outlines preserve material and prevent sticker-flatness.

### Internal line restraint

Use interior lines only for:

- face focal marks
- arm/torso separation
- major clothing boundary
- prop crossing body
- hair/face separation

Do not outline every fold, belt, seam, strand, or armor plate.

---

## 12. Grounding and Shadow

The character must feel attached to the world.

### Requirements

```text
[ ] feet visibly contact the ground
[ ] contact shadow or grounding shadow persists in all frames
[ ] shadow is stable enough to anchor, responsive enough to motion
[ ] no frame appears to float unintentionally
[ ] character scale matches scene tile scale
```

### Shadow types

| Shadow type | Use | Notes |
|---|---|---|
| Contact blob | Small overworld sprites | Stable, readable, gameplay-friendly. |
| Directional cast shadow | Dynamic lighting scenes | Must match scene light; do not bake contradictions. |
| Soft runtime shadow | Presentation layer | Allowed if it does not blur sprite silhouette. |
| No shadow | Rare | Only for ghosts/flying entities or explicit style choice. |

---

## 13. Directional Consistency

A character must feel like the same designed object in front, back, left, and right.

### Directional requirements

```text
[ ] height stable across directions
[ ] head size stable
[ ] dominant color distribution stable
[ ] identity anchor readable from front/back/side
[ ] body type not changing between views
[ ] feet/contact logic consistent
[ ] outline language consistent
```

### Side-view caution

Side views often collapse. Protect:

- face/forehead/hair overlap
- chest/back shape
- one visible arm/hand
- foot orientation
- prop silhouette

### Back-view caution

Back views often become empty. Protect:

- hair/headgear back silhouette
- shoulder/torso color block
- cloak/backpack/weapon read
- feet and stance

---

## 14. Character Prompt / Spec Template

Use this shape when producing a character art prompt or production spec.

```markdown
## Character Sprite Spec — [Name / Role]

### Intent
- Role:
- Personality read:
- Gameplay scale:
- Required directions/frames:

### Read Hierarchy
1. Silhouette:
2. Body type:
3. Dominant color:
4. Identity anchor:
5. Secondary accent:

### Proportions
- Body type:
- Head/body ratio:
- Hand/foot exaggeration:
- Stance/grounding:

### Pixel Style
- Cluster language:
- Palette budget:
- Material ramps:
- Outline treatment:
- Forbidden details:

### Animation Notes
- Walk personality:
- Bob/weight:
- Hair/cloth/prop lag:
- Contact shadow behavior:

### Validation
- Silhouette test:
- Thumbnail test:
- In-scene background tests:
- Motion test:
```

### Prompt language patterns

Useful:

```text
authored pixel clusters, clean chibi overworld proportions, iconic silhouette,
selective local-color outline, dominant distance-read color, planted wide feet,
large readable head, one strong identity anchor, hard-stepped material ramps,
no texture noise, no uniform black outline, no painterly gradients
```

Avoid relying on:

```text
highly detailed, realistic anatomy, intricate textures, cinematic render,
soft lighting baked into sprite, ultra smooth shading, black outline everywhere
```

---

## 15. Common Failure Modes

### Rendered Instead of Designed

Symptoms:

- soft edge artifacts
- many meaningless intermediate colors
- tiny material noise
- realistic anatomy preserved
- lighting baked into all surfaces

Fix:

- restylize proportions
- rebuild silhouette
- collapse materials into ramps
- replace texture with clusters
- reapply local outlines

### Too Realistic

Symptoms:

- small head
- narrow shoulders/hands/feet
- long torso
- face requires close view

Fix:

- enlarge head/upper identity mass
- widen hands/feet
- compress torso
- simplify anatomy into blocks

### Too Noisy

Symptoms:

- equal detail everywhere
- many single-pixel accents
- hair/clothing texture competes with face
- color ramps fragmented

Fix:

- remove orphan pixels
- merge ramps
- assign one dominant anchor
- group clusters by form

### Too Generic

Symptoms:

- silhouette matches other cast members
- no identity anchor
- dominant color unclear
- body type does not imply role

Fix:

- choose a sharper body type
- add or enlarge anchor
- clarify color ownership
- remove competing secondary details

### Pasted on Scene

Symptoms:

- no contact shadow
- outline clashes with environment
- sprite contrast does not match scene
- feet do not meet plane

Fix:

- add grounding shadow
- tune outline/value against test backgrounds
- verify scale and depth sorting
- review in representative lighting

---

## 16. Character Approval Checklist

```text
[ ] silhouette reads in flat black
[ ] character reads at gameplay zoom
[ ] character reads at 25% preview scale
[ ] body type supports role
[ ] identity anchor is clear from all required directions
[ ] dominant color block is recognizable
[ ] head/hand/foot proportions support stylization
[ ] face is simple and stable
[ ] palette ramps are controlled
[ ] no random single-pixel noise
[ ] no texture artifacts from source render
[ ] shading is hard-stepped and intentional
[ ] outline is local, selective, and weighted
[ ] feet/contact shadow ground the sprite
[ ] front/back/side views feel like same character
[ ] animation frames preserve proportions and color consistency
[ ] asset passes representative scene tests
```
