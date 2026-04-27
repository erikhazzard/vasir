# Lighting, FX, and Scene Integration Quality Bar

Read this reference when directing or validating dynamic lighting, shadows, fog, water, glow, color grading, depth sorting, and scene integration for premium 2D RPG pixel art.

## Table of Contents

1. Quality definition
2. Source asset vs runtime presentation
3. Dynamic lighting principles
4. Shadows and grounding
5. Depth sorting and occlusion
6. Atmosphere, fog, and color grading
7. Water, reflections, and surface FX
8. Glow, magic, weather, and particles
9. Scene integration test matrix
10. Technical metadata for pipelines
11. Presentation prompt/spec template
12. Common failure modes
13. Presentation approval checklist

---

## 1. Quality Definition

Sea-of-Stars presentation uses modern scene tools to make pixel art feel alive while preserving authored pixel readability. Lighting and FX should create mood, depth, and integration; they must not blur silhouettes, muddy palettes, or compensate for weak base art.

Core sentence:

> Presentation passes when lighting, shadow, depth, and FX make strong pixel assets belong to the world without destroying their first read.

---

## 2. Source Asset vs Runtime Presentation

Always separate two layers:

```text
source/albedo asset:    pixel clusters, palette ramps, silhouette, outline, animation
runtime presentation:   lighting, recolor, shadow, fog, water, glow, color grade, depth
```

### Source asset requirements

The source asset should be strong under neutral/flat inspection:

```text
[ ] silhouette reads
[ ] dominant color reads
[ ] pixel clusters are intentional
[ ] material ramps are disciplined
[ ] no baked lighting contradiction
[ ] no render noise
```

### Runtime presentation requirements

The runtime scene may enrich the source:

```text
[ ] dynamic recolor by light/mood
[ ] contact and cast shadows
[ ] fog/atmospheric depth
[ ] water shimmer/reflection/foam
[ ] glow/magic/weather accents
[ ] scene color grading
```

### Absolute boundary

Runtime FX may elevate. Runtime FX may not rescue.

If the flat asset fails, fix the asset. Do not hide it under glow, fog, or dramatic lighting.

---

## 3. Dynamic Lighting Principles

Dynamic lighting can be part of the premium feel, but it must respect pixel art.

### Good dynamic lighting

```text
[ ] recolors the scene coherently
[ ] preserves silhouettes and path read
[ ] strengthens depth and mood
[ ] creates believable contact/cast shadows
[ ] maintains player readability under warm/cool/dark/bright states
[ ] treats characters and world as one lighting system
```

### Bad dynamic lighting

```text
[ ] turns sprites muddy
[ ] creates smooth gradients over tiny pixel forms
[ ] erases material ramps
[ ] conflicts with baked source shading
[ ] lights the world but not the character consistently
[ ] becomes the main read instead of supporting gameplay
```

### Base-light compatibility

Source sprites may use a canonical form-light bias for readability, but should avoid heavy baked cast shadows that contradict runtime light direction.

Good source shading:

```text
softly implied form via stepped ramps
material clarity under neutral light
manageable darks
```

Bad source shading:

```text
strong baked spotlight
realistic render shadow baked into sprite
directional cast shadow inside albedo
```

### Multiple light scenario requirement

Every primary character and biome should be tested under:

```text
neutral daylight
warm interior/torch
cool moonlight
low-light cave
high-saturation outdoor scene
magic/emissive accent scene
```

---

## 4. Shadows and Grounding

Shadows do three jobs:

1. anchor characters/props to the ground
2. communicate light direction and depth
3. separate planes and forms

### Contact shadow

Contact shadows are the highest-priority shadow type for readability.

Requirements:

```text
[ ] every grounded character has contact support
[ ] contact shadow aligns with feet/body footprint
[ ] it is stable across animation frames
[ ] it does not swallow feet
[ ] it works on all common terrain colors
```

### Cast shadow

Cast shadows can add premium depth but must not confuse gameplay.

Requirements:

```text
[ ] direction matches scene light
[ ] opacity/shape does not obscure path or interactables
[ ] shadow style fits pixel language
[ ] dynamic shadows do not flicker distractingly
```

### Character shadow hierarchy

Use this priority:

```text
grounding/contact > player tracking > scene mood > physical realism
```

A physically plausible shadow that hurts player tracking is wrong.

### Prop and world shadows

World shadows should support depth:

- roof overhangs
- cliff bases
- tree canopies
- interior light pools
- bridge shadows
- doorway thresholds

Avoid shadow clutter that creates false blockers or hides path edges.

---

## 5. Depth Sorting and Occlusion

Scene integration requires more than shadows. Characters must occupy the world correctly.

### Sorting rules

```text
[ ] character appears behind foreground blockers when appropriate
[ ] character appears in front of background/ground objects correctly
[ ] transitions are predictable
[ ] no popping that breaks immersion
[ ] tall props/buildings use consistent anchor points
```

### Occlusion readability

Foreground occlusion is allowed, but player tracking remains sacred.

Options when occlusion hides the player too much:

- cutaway fade
- outline/ghost overlay
- transparency fade
- camera framing adjustment
- restrict occluder placement
- alter prop silhouette

### Depth metadata

For generated assets, consider producing:

```text
height/depth mask
sort anchor
occluder mask
contact footprint
shadow receiver/caster flags
material ID mask
```

Do not rely on color image alone for depth behavior.

---

## 6. Atmosphere, Fog, and Color Grading

Atmosphere should organize depth and mood.

### Good atmosphere

```text
[ ] separates planes
[ ] reinforces biome mood
[ ] keeps path/interactables readable
[ ] softens distant detail without blurring critical sprites
[ ] uses hue/value shifts coherently
```

### Bad atmosphere

```text
[ ] covers everything uniformly
[ ] lowers contrast on player/interactables too much
[ ] turns scene gray/brown/blue mud
[ ] fights palette identity
[ ] hides collision or traversal edges
```

### Color grading rule

Color grading is presentation-level. It should not replace source palette design.

Test:

```text
Would this scene still have good material/color hierarchy with grading disabled?
```

If not, source palettes may be too weak.

---

## 7. Water, Reflections, and Surface FX

Water often defines premium scenes, but it can easily become distracting.

### Water read priorities

```text
1. boundary / shore edge
2. enterable vs blocked status
3. depth / danger / shallowness
4. surface motion
5. reflection / sparkle / foam
```

### Water rules

```text
[ ] water reads immediately as liquid
[ ] shore transition is consistent
[ ] highlights are rhythmic and grouped
[ ] animation does not become noise
[ ] reflection/shimmer does not obscure player/interactables
[ ] water hue supports biome palette
```

### Reflection caution

Reflections can add richness, but must be stylized. Avoid photoreal mirror behavior that clashes with pixel abstraction.

### Foam/edge logic

Foam and shore highlights should emphasize contact between water and land. They should not appear randomly across the whole water surface unless that is a deliberate storm/rapid effect.

---

## 8. Glow, Magic, Weather, and Particles

FX should feel integrated into the pixel world.

### Glow / emissive

Rules:

```text
[ ] source object remains readable without glow
[ ] glow shape supports object silhouette
[ ] glow does not obscure path/interactables
[ ] color is coherent with scene palette
[ ] intensity has hierarchy; not every magical thing screams
```

### Magic effects

Magic can be smoother than base sprites, but must retain style compatibility.

Good magic:

- clean shape language
- readable arc/impact
- limited palette family
- controlled bloom
- clear gameplay state

Bad magic:

- high-res particle soup
- random sparkles everywhere
- overexposed bloom
- effect hides character pose

### Weather

Weather adds mood but can harm readability.

Rules:

```text
[ ] rain/snow/fog density does not hide path
[ ] particles do not match player outline color too closely
[ ] weather has depth layering where possible
[ ] weather intensity can be tuned for gameplay moments
```

### Particle hierarchy

Particles should support events:

```text
ambient low contrast < interactable feedback < combat/action feedback < critical state feedback
```

---

## 9. Scene Integration Test Matrix

Test assets in representative scenes, not only on transparency.

### Required test scenes

```text
A. bright grassland / saturated daylight
B. dark cave / low contrast
C. warm interior / torch or lantern light
D. cool moonlight exterior
E. dense town / prop-heavy environment
F. water edge / reflective or animated surface
G. high-contrast dungeon / hazard elements
```

### Per-scene checks

```text
[ ] player remains trackable
[ ] feet/contact shadow anchor correctly
[ ] path and blockers remain readable
[ ] interactables remain distinct
[ ] lighting enhances mood without mud
[ ] outline does not halo or clash
[ ] FX does not obscure gameplay
[ ] depth sorting/occlusion behaves predictably
```

### Worst-case background test

Place the sprite against:

```text
similar hue background
similar value background
busy texture background
dark background
bright background
warm light
cool light
```

A sprite does not need to be equally perfect everywhere, but it must remain playable everywhere expected.

---

## 10. Technical Metadata for Pipelines

For automated or semi-automated pipelines, a single color PNG may be insufficient for premium scene integration.

### Recommended sprite outputs

```text
albedo/color sheet
alpha mask
contact shadow footprint
height/depth mask
normal map or directional-light response map, if supported
material ID mask, if supported
emissive mask, if needed
occlusion/sort anchor metadata
```

### Recommended tile/world outputs

```text
albedo tilemap
collision/walkability map
height/depth layer map
occluder mask
shadow receiver/caster flags
material ID map
interactable class map
biome/lighting zone map
```

### Metadata discipline

Metadata should support art direction. It should not create a parallel system that contradicts the drawn art.

Example failure:

```text
A cliff visually reads as blocked, but collision says walkable.
```

Example success:

```text
The drawn ledge, collision, height mask, and shadow all communicate the same traversal rule.
```

---

## 11. Presentation Prompt / Spec Template

Use this shape when producing lighting/FX direction.

```markdown
## Presentation Spec — [Scene / Asset]

### Intent
- Mood:
- Gameplay purpose:
- Time/weather/light source:
- Critical readability risks:

### Source Asset Requirements
- Must remain readable flat:
- Baked lighting limits:
- Required masks/metadata:

### Lighting
- Key/ambient direction:
- Warm/cool palette behavior:
- Dynamic state changes:
- Character/world consistency:

### Shadows
- Contact shadow:
- Cast shadow:
- Occlusion/depth sorting:

### FX
- Fog/atmosphere:
- Water:
- Glow/emissive:
- Weather/particles:

### Validation
- Test scenes:
- Player-read checks:
- Path/interactable checks:
- Failure modes to avoid:
```

### Prompt phrases

Useful:

```text
pixel-disciplined source asset, dynamic lighting that preserves sprite silhouette,
contact shadow grounding, local colored outline remains readable, coherent warm/cool recolor,
layered atmosphere, readable path under lighting, stylized water shimmer, controlled glow,
no blur on sprite silhouette, no muddy palette, no FX masking weak art
```

---

## 12. Common Failure Modes

### FX Rescue Attempt

Symptoms:

- weak sprite looks acceptable only under glow/fog
- lighting hides bad silhouette
- source asset fails flat test

Fix:

- repair source art first
- reintroduce presentation after flat pass

### Muddy Dynamic Light

Symptoms:

- characters become brown/gray/blue blobs
- material ramps collapse
- player loses contrast

Fix:

- adjust light response curves
- protect player contrast
- separate albedo ramps from grade
- test warm/cool/dark states

### Blurred Pixel Language

Symptoms:

- sprite edges softened
- bloom/fog smears pixel clusters
- high-res particles clash with sprite scale

Fix:

- preserve nearest/pixel silhouette
- restrict blur to presentation layers behind/around asset
- stylize particles to pixel scale

### Shadow Confusion

Symptoms:

- cast shadows look like blockers
- contact shadow hides feet
- dynamic shadow direction conflicts with baked sprite

Fix:

- prioritize grounding and path read
- lighten/shape shadows near gameplay affordances
- reduce baked source shadow

### Occlusion Failure

Symptoms:

- player disappears behind foreground props
- depth popping breaks tracking
- tall objects sort inconsistently

Fix:

- define sort anchors
- add occlusion masks/fade
- test player around all vertical props

---

## 13. Presentation Approval Checklist

```text
[ ] source asset passes flat/no-FX inspection
[ ] sprite silhouette remains crisp under lighting
[ ] player remains readable in all required light states
[ ] contact shadow grounds character/props
[ ] cast shadows support depth without path confusion
[ ] depth sorting and occlusion are predictable
[ ] atmosphere separates planes without flattening scene
[ ] water/FX/glow stay stylized and controlled
[ ] dynamic lighting does not muddy palette ramps
[ ] interactables remain distinct under presentation
[ ] no FX hides weak source art
[ ] no high-res effects clash with pixel language
[ ] scene feels integrated, not pasted together
```
