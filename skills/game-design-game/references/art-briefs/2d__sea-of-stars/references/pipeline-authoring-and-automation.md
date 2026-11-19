# Pipeline, Authoring, and Automation Requirements

Read this reference when designing or critiquing a 3D-to-sprite, AI-to-sprite, sprite-semantic-compiler, automated tilemap, map-generation, or validation pipeline for Sea-of-Stars-quality art.

## Table of Contents

1. Pipeline thesis
2. The primary automation failure
3. Source asset vs semantic asset
4. Character pipeline architecture
5. World/tilemap pipeline architecture
6. Animation pipeline architecture
7. Presentation metadata pipeline
8. Validation architecture
9. Human art-director checkpoints
10. Machine-checkable gates
11. Prompting and generation control
12. Output artifacts and metadata
13. Common pipeline failure modes
14. Pipeline approval checklist

---

## 1. Pipeline Thesis

A premium pixel-art pipeline cannot be a render/export/filter pipeline. It must be a semantic authoring pipeline.

Core sentence:

> The pipeline must convert source input into designed pixel grammar: role, silhouette, identity, cluster, palette, animation, and scene metadata.

A naive pipeline does this:

```text
3D model or prompt → render → pixelate → palette reduce → outline → export
```

A Sea-of-Stars pipeline must do this:

```text
source → semantic parse → stylization → silhouette design → cluster authoring → ramp assignment → outline logic → motion semantics → scene metadata → validation
```

---

## 2. The Primary Automation Failure

The primary failure is not low technical fidelity. It is **preserving the wrong truth**.

Automated systems often preserve:

- literal 3D anatomy
- source material texture
- baked render lighting
- tiny contours
- realistic proportions
- arbitrary camera artifacts
- anti-aliased edges
- noisy gradients

But premium pixel art needs to preserve:

- gameplay read
- role/identity
- silhouette
- material category
- gesture
- controlled ramps
- cluster intent
- scene compatibility

### Prior rewrite for automation

```text
Bad instinct: preserve source fidelity.
Better instinct: preserve design intent and re-author the visible result.
```

The source is input evidence, not the final authority.

---

## 3. Source Asset vs Semantic Asset

### Source asset

Input may be:

```text
3D character model
GLB/FBX
concept art
text prompt
AI image
rough sketch
existing sprite
material library
tile mockup
map screenshot
```

### Semantic asset

The pipeline must infer or declare:

```text
role
body type
head/torso/limb regions
identity anchor
dominant color
material groups
walkability/collision
height/depth
interactable class
animation state
lighting needs
```

If these semantics are not represented, the pipeline will default to image processing.

### Semantic authority rule

Where source appearance conflicts with target readability, semantic art direction wins.

Example:

```text
Source model has realistic shoes.
Target sprite needs broad readable feet.
Result should widen/simplify feet, not preserve shoe realism.
```

---

## 4. Character Pipeline Architecture

A Sea-of-Stars character pipeline should include these stages.

### Stage 1 — Intake and semantic parse

Extract:

```text
head
face
hair/headgear
torso
arms/hands
legs/feet
primary clothing
secondary clothing
accessories
weapon/tool
material groups
dominant source colors
```

Also infer:

```text
role
body type candidate
identity anchor candidate
motion personality
```

### Stage 2 — Art-direction classification

Declare the target:

```text
body type: lean / stocky / round / tall / creature
role read:
personality read:
primary identity anchor:
dominant color block:
required directions:
required animation states:
```

Without this stage, generation becomes generic.

### Stage 3 — Proportion stylizer

Enforce target ratios:

```text
head 35–42% of character height
compact torso
readable hands
broad grounding feet
role-specific width/height
```

This stage deliberately violates source realism when necessary.

### Stage 4 — Silhouette compiler

Simplify and strengthen:

```text
outer contour
head/upper anchor
shoulder/torso mass
hand/arm separation
foot stance
prop silhouette
```

Remove:

```text
tiny source contours
unreadable straps
thin appendages
random asymmetries
texture-driven silhouette bumps
```

### Stage 5 — Pixel cluster authoring

Convert forms into cluster logic:

```text
large base masses
hard-stepped highlights/shadows
material-specific cluster shapes
no orphan noise
no render speckle
no fake gradients
```

This is not palette reduction. It is form redesign.

### Stage 6 — Palette and ramp assignment

Assign:

```text
skin ramp
hair/headgear ramp
primary clothing ramp
secondary clothing ramp
accessory/metal ramp
outline colors by local material
accent colors
```

Rules:

```text
[ ] every ramp has purpose
[ ] dominant read color protected
[ ] shadow hue shifts controlled
[ ] color count budget appropriate to role
[ ] runtime lighting compatibility considered
```

### Stage 7 — Local outline pass

Apply:

```text
shadow-side heavier/darker contour
lit-side partial/lighter contour
local-color outline
minimal internal boundaries
no pure black sticker outline
```

### Stage 8 — Direction generation and consistency

Generate front/back/left/right using the same semantic model.

Check:

```text
height consistency
anchor consistency
dominant color consistency
body-type consistency
feet/contact consistency
outline consistency
```

### Stage 9 — Animation semantic pass

For walk cycles, produce semantic frames:

```text
contact-right
pass-A
contact-left
pass-B
```

Then add:

```text
vertical body offset
arm opposition
hair/cloth/prop lag
shadow footprint
feet contact validation
```

### Stage 10 — Scene metadata

Emit or derive:

```text
alpha mask
contact shadow footprint
height/depth mask
sort anchor
material ID mask
normal/light response map if supported
emissive mask if supported
```

### Stage 11 — Validation suite

Run:

```text
silhouette test
thumbnail test
grayscale/value test
direction consistency test
animation/GIF test
scene integration test
palette/cluster audit
```

---

## 5. World / Tilemap Pipeline Architecture

A premium world pipeline must preserve gameplay grammar, not only texture style.

### Stage 1 — Area intent

Declare:

```text
area type: town / dungeon / biome / overworld / interior / combat space
mood
gameplay purpose
main route
exits
landmark
critical interactables
traversal affordances
```

### Stage 2 — Semantic map layers

Create or infer:

```text
walkability
collision/blockers
height/depth
foreground occluders
background planes
interactables
hazards
traversal links
material zones
lighting zones
```

### Stage 3 — Macro composition

Before tile detail, solve:

```text
main path shape
negative space
landmark placement
prop clusters
quiet zones
player readability zones
foreground framing
```

### Stage 4 — Material grammar assignment

For each terrain/material:

```text
base mass color/value
edge tile logic
corner logic
transition logic
texture density
decal rules
variation rules
collision relationship
```

### Stage 5 — Tile generation

Generate tiles with:

```text
center variants
edge variants
corner variants
transition variants
height/drop variants
shadow variants
prop anchor variants
```

Avoid one perfect tile repeated everywhere.

### Stage 6 — Clutter placement

Classify props:

```text
Class A critical interactable
Class B functional world prop
Class C ambient decoration
```

Rules:

```text
[ ] Class A not buried in B/C
[ ] clutter sparse near path-critical edges
[ ] repeated props varied by macro composition
[ ] false affordances minimized
```

### Stage 7 — Player readability overlay

Place representative player sprites throughout:

```text
path center
near cliffs
near water
inside shadow
behind foreground occluder
near interactables
busy prop clusters
```

Adjust terrain detail, value, and outlines until the player tracks.

### Stage 8 — Lighting/presentation metadata

Emit or derive:

```text
light zones
shadow casters/receivers
height map
occlusion masks
water masks
emissive masks
weather/fog regions
```

### Stage 9 — Map validation

Run:

```text
path-read test
collision-read test
traversal-read test
interactable privilege test
texture-noise test
player-read test
composition/focal test
```

---

## 6. Animation Pipeline Architecture

Animation generation must be semantic, not just interpolated.

### Required animation data

```text
state name
frame count
frame semantics
contact foot / contact point
body vertical offset
arm opposition
head stability
secondary lag channels
shadow footprint per frame
direction metadata
```

### Walk pipeline

```text
1. generate contact-right pose
2. generate pass-A pose
3. generate contact-left pose
4. generate pass-B pose
5. enforce proportion consistency
6. add arm opposition
7. add secondary lag
8. generate per-frame shadow
9. preview as GIF
10. validate foot locking and silhouette stability
```

### Anti-interpolation rule

Do not merely morph frame 0 to frame 2. Pixel walk cycles need designed contact and pass poses.

### Machine checks for animation

Useful checks:

```text
bounding box height changes match bob intent
foot contact pixels remain stable for contact frame
palette colors consistent across frames
alpha silhouette not jittering unexpectedly
shadow exists in all frames
frame count and row order valid
```

Human checks still required for charm, role, and motion personality.

---

## 7. Presentation Metadata Pipeline

If the runtime supports modern presentation, plan for it early.

### Character metadata

```text
alpha mask
depth/height mask
contact footprint
normal/light response map
material IDs
emissive mask
shadow caster flag
shadow receiver flag
sort anchor
```

### World metadata

```text
walkability
collision
height/depth
occluder masks
light zones
fog/weather zones
water regions
material IDs
interactable class layer
hazard layer
```

### Metadata integration rule

The drawn art, collision, depth, and lighting metadata must agree. Inconsistency destroys trust.

Bad:

```text
The player appears behind a low flower but in front of a tall fence.
```

Good:

```text
All tall foreground objects share sort anchors and fade behavior.
```

---

## 8. Validation Architecture

Validation should combine deterministic checks and art-director review.

### Deterministic checks

Use machines for:

```text
sheet dimensions
grid completeness
alpha boundaries
palette counts / color histograms
empty cells
row/column order
frame count
color consistency across frames
known forbidden pure black if project requires
presence of shadow layer/mask
metadata file existence
collision/visual mismatch flags where possible
```

### Judgment checks

Use human/art-director review for:

```text
silhouette appeal
identity anchor quality
cluster intentionality
charm
world composition
traversal clarity
player readability
animation personality
lighting taste
```

### Automation warning

Do not confuse measurable with important. Many critical quality failures are judgment failures.

---

## 9. Human Art-Director Checkpoints

Insert human review where mistakes compound.

### Character checkpoints

```text
1. role/body/identity brief approval
2. silhouette approval
3. palette/ramp approval
4. direction consistency approval
5. animation playback approval
6. in-scene integration approval
```

### World checkpoints

```text
1. area intent and route sketch approval
2. path/traversal/collision read approval
3. material grammar approval
4. landmark/composition approval
5. prop hierarchy approval
6. lighting/in-scene player-read approval
```

### Stop rules

Stop downstream work if:

```text
silhouette fails
identity anchor fails
path read fails
traversal read fails
player readability fails
```

Adding polish past a failed stop rule creates expensive rework.

---

## 10. Machine-Checkable Gates

These are useful checks, not replacements for art review.

### Sprite gates

```text
[ ] output PNG exists
[ ] transparent background correct
[ ] grid size matches spec
[ ] all cells non-empty
[ ] alpha coverage within expected bounds
[ ] palette count within role budget
[ ] no disallowed pure black if configured
[ ] no semi-transparent edge pixels if source asset requires hard alpha
[ ] frame order valid
[ ] ground shadow present or explicitly exempt
```

### Animation gates

```text
[ ] all directions have same frame count
[ ] frame dimensions consistent
[ ] palette stable across frames
[ ] contact/pass vertical offsets within expected range
[ ] shadow present in all grounded frames
[ ] bounding boxes do not jitter unintentionally
```

### World gates

```text
[ ] tileset dimensions valid
[ ] required autotile variants present
[ ] collision layer exists
[ ] height/depth layer exists if runtime needs it
[ ] interactable class layer exists
[ ] map has at least one path from entry to exit
[ ] no critical interactable fully occluded
[ ] player test positions sampled
```

---

## 11. Prompting and Generation Control

Generation prompts should specify read hierarchy, not just style adjectives.

### Character generation prompt pattern

```text
[role/personality] overworld RPG pixel sprite, [body type], [identity anchor],
[dominant color], clean chibi proportions, authored pixel clusters,
hard-stepped material ramps, selective local-color outline, planted feet,
readable at gameplay scale, no render noise, no soft gradients, no uniform black outline
```

### World generation prompt pattern

```text
premium top-down RPG tilemap scene, [biome/area], readable walkable path,
clear traversal affordances, layered foreground/play-plane/background,
strong landmark, controlled terrain texture, material-specific pixel clusters,
critical interactables visually privileged, no texture soup, no wallpaper repetition
```

### Negative prompt concepts

```text
photorealistic, rendered, soft gradient, blurred edges, noisy texture,
uniform black outline, over-detailed, realistic anatomy, tiny hands/feet,
random speckles, clutter everywhere, path unclear, false interactables,
high-res particles, muddy lighting
```

### Prompt warning

Prompting alone will not guarantee quality. Use prompts to establish intent, then apply validation and correction passes.

---

## 12. Output Artifacts and Metadata

A mature pipeline may emit these artifacts.

### Character output package

```text
character_name.walk.png
character_name.idle.png
character_name.albedo.png or atlas
character_name.alpha.png
character_name.shadow.png or shadow metadata
character_name.depth.png
character_name.material_id.png
character_name.normal.png if supported
character_name.anim.json
character_name.validation.json
```

### World output package

```text
tileset.png
terrain_autotiles.png
props.png
map.tmx or equivalent
collision layer
height/depth layer
occlusion layer
interactable layer
lighting zones
water/fx masks
validation report
```

### Validation report fields

```text
asset type
intended role/area
source assumptions
hard constraints pass/fail
heuristic scores
known risks
human review notes
next fix priority
```

---

## 13. Common Pipeline Failure Modes

### Filter Pipeline Masquerading as Art Pipeline

Symptoms:

- output has correct resolution but wrong pixel grammar
- source render noise remains
- anatomy too realistic
- edges soft/aliased

Fix:

- add semantic stylization and cluster passes
- treat image filters as final cleanup, not core authoring

### Validator Cosplay

Symptoms:

- pipeline reports pass because dimensions/palette counts are valid
- art still looks bad
- no silhouette/path/motion review

Fix:

- separate hard technical gates from art-direction gates
- add human review at stop points

### Overfit to One Asset

Symptoms:

- rules work for one hero but fail NPCs/creatures
- palette/body constraints too rigid
- all characters share same hair/stance

Fix:

- classify by role/body type
- use heuristics with exceptions
- test a representative cast matrix

### Scene-Blind Sprite Generation

Symptoms:

- sprite looks good on transparency
- disappears on grass/stone/cave
- outline clashes with lighting

Fix:

- integrate scene test matrix into validation
- adjust source values and presentation metadata

### Map Generator Makes Wallpaper

Symptoms:

- attractive tiles repeat evenly
- route unclear
- no landmark
- clutter uniform

Fix:

- generate macro composition before tile fill
- enforce path/interactable/depth hierarchy

---

## 14. Pipeline Approval Checklist

```text
[ ] pipeline has semantic stages, not just image filters
[ ] source fidelity does not override target readability
[ ] character body type and identity anchor are explicit
[ ] silhouette compilation occurs before detail/palette polish
[ ] pixel cluster pass removes render noise
[ ] local outline pass supports directional/contextual contours
[ ] animation frames have semantic labels and contact logic
[ ] world generation includes walkability/collision/height/interactable layers
[ ] maps solve macro composition before tile decoration
[ ] lighting/presentation metadata is planned, not bolted on
[ ] deterministic checks cover dimensions, grid, palette, metadata presence
[ ] human review gates cover silhouette, identity, path, traversal, animation, charm
[ ] validation tests assets in representative scenes
[ ] stop rules prevent polishing failed fundamentals
```
