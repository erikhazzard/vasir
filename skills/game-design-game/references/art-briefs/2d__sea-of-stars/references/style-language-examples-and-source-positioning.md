# Style Language, Prompt Patterns, and Source Positioning

Read this reference when translating “Sea of Stars quality” into safe, reusable art-direction language, prompts, specs, critique notes, reference briefs, or source-positioning statements.

## Table of Contents

1. Positioning: class-of-craft, not clone
2. Public source notes
3. The Sea-of-Stars style thesis
4. Taste vocabulary
5. What to ask for instead of “make it like Sea of Stars”
6. Character prompt patterns
7. World/tilemap prompt patterns
8. Animation prompt patterns
9. Lighting/FX prompt patterns
10. Negative guidance patterns
11. Contrastive examples
12. Reference-board guidance
13. Final language checklist

---

## 1. Positioning: Class-of-Craft, Not Clone

Use Sea of Stars as a benchmark for **quality class**, not as a literal copying target.

Safe framing:

```text
Sea-of-Stars-adjacent in craft quality
premium modern pixel-RPG presentation
retro-readable, modern-lit, authored pixel art
charming chibi overworld sprites with rich scene integration
```

Unsafe framing:

```text
copy Sea of Stars exactly
same palettes/assets/maps/characters
identical sprite proportions and compositions
make it indistinguishable from Sea of Stars
```

Replacement sentence:

> We are targeting the same class of polish: readable authored pixel art, expressive overworld characters, rich but controlled maps, traversal clarity, dynamic-feeling presentation, and disciplined scene composition—not literal reproduction.

---

## 2. Public Source Notes

This skill is inspired by publicly observable and publicly described qualities of Sea of Stars, especially:

- Sabotage Studio positions Sea of Stars as a retro-inspired turn-based RPG with premium 2D pixel-art presentation and a custom render pipeline that supports dynamic lighting.
- The official Sea of Stars site describes dynamic lighting, time-of-day/weather-like mood changes, recoloring, and shadow rendering as part of the game’s presentation.
- Public Kickstarter-era and press-kit material describes pixel-perfect rendering, dynamic sprite lighting, depth/shadow support, and a tactile world as part of the technical/art direction pitch.

Useful public reference URLs for factual grounding when needed:

```text
https://sabotagestudio.com/presskits/sea-of-stars/
https://seaofstarsgame.co/
https://www.kickstarter.com/projects/sabotagestudio/sea-of-stars
```

Do not import copyrighted assets, exact palettes, maps, compositions, characters, or proprietary pipeline implementation details. Use public high-level qualities as inspiration and build an original project-specific art language.

---

## 3. The Sea-of-Stars Style Thesis

The desired style is:

```text
premium authored 2D RPG pixel art
clean chibi character readability
rich but disciplined tile/world construction
strong traversal and map readability
modern lighting/shadow/atmosphere integration
expressive animation with authored timing
warm, charming, iconic, toy-like shape language
```

It is not:

```text
AI image compressed into pixels
3D render with palette reduction
noisy retro imitation
uniform black outline sprites
flat tile wallpaper
high-detail surfaces with poor gameplay read
```

The art should feel:

- intentional
- approachable
- tactile
- readable
- playful but premium
- lush without noise
- modern without losing pixel identity

---

## 4. Taste Vocabulary

Use precise art-direction language. Avoid vague “better” or “more polished.”

### Good target words

```text
authored
iconic
readable
charming
toy-like
grounded
layered
tactile
composed
clustered
disciplined
warm
expressive
selective
gameplay-first
scene-integrated
```

### Useful critique words

```text
mushy
noisy
rendered
over-textured
under-authored
generic
flat
pasted-on
sticker-outlined
muddy
micro-detail dependent
path-confusing
false-affordance
jittery
sliding
```

### Quality phrases

```text
silhouette-first character design
dominant distance-read color
one strong identity anchor
hard-stepped material ramps
local colored outline
cluster discipline
large mass before texture
walkable path hierarchy
foreground/play-plane/background separation
contact shadow grounding
dynamic lighting that preserves pixel readability
```

---

## 5. What to Ask For Instead of “Make It Like Sea of Stars”

Instead of:

```text
Make this look like Sea of Stars.
```

Ask for:

```text
Make this a premium modern pixel-RPG asset with Sea-of-Stars-adjacent craft quality: clean chibi readability, authored pixel clusters, strong silhouette, controlled palette ramps, selective local-color outlines, and scene-aware lighting/shadow compatibility.
```

Instead of:

```text
Use the same tile style as Sea of Stars.
```

Ask for:

```text
Create a rich but readable top-down RPG tilemap language with clear walkable paths, traversal edges, depth layering, interactable hierarchy, restrained material texture, and a strong area landmark.
```

Instead of:

```text
Copy the character proportions.
```

Ask for:

```text
Use stylized overworld proportions: large readable head, compact torso, broad grounding feet, visible hands, and one dominant identity anchor readable at gameplay scale.
```

---

## 6. Character Prompt Patterns

### Character creation prompt

```text
Create an original premium 2D RPG overworld character sprite, Sea-of-Stars-adjacent in craft quality but not a clone. The character is [role/personality]. Use clean chibi proportions: large readable head, compact torso, visible oversized hands, broad planted feet, and a [body type] silhouette. Give the character one dominant identity anchor: [hair/hat/helmet/weapon/scarf/etc.]. Use one dominant distance-read color: [color]. Render with authored pixel clusters, hard-stepped material ramps, selective local-color outlines, no pure black sticker outline, no soft gradients, no texture noise, and no realistic anatomy. The sprite must read clearly at gameplay scale and on both bright and dark RPG backgrounds.
```

### Character critique prompt

```text
Critique this as a premium 2D RPG overworld sprite. Review in order: gameplay-scale read, silhouette, body type, identity anchor, dominant color, face/hands/feet, pixel clusters, palette ramps, outline, grounding shadow, direction consistency, and in-scene readability. Name blockers before polish notes. Do not suggest more detail unless the read already passes.
```

### Character sheet prompt

```text
Create a 4x4 transparent walk sprite sheet for an original top-down RPG character. Rows: front, back, left, right. Columns: contact-right, pass-A, contact-left, pass-B. Preserve the same proportions, palette, identity anchor, and outline logic across all directions. The walk must show planted feet, subtle bob, arm/leg opposition, one-beat hair/cloth/prop lag where appropriate, and stable contact shadow in every frame. No empty cells, no foot sliding, no frame jitter.
```

---

## 7. World / Tilemap Prompt Patterns

### Environment creation prompt

```text
Create an original premium top-down RPG environment, Sea-of-Stars-adjacent in craft quality but not a clone. Area: [biome/town/dungeon]. The scene must prioritize readable walkable paths, clear blockers, clear traversal affordances, foreground/play-plane/background separation, and one strong landmark. Use authored pixel clusters and controlled material texture: rich but not noisy. Critical interactables must be visually privileged over ambient decoration. The player sprite must remain readable on all major surfaces. Avoid texture soup, wallpaper repetition, false affordances, and over-detailed clutter.
```

### Tileset prompt

```text
Design a tilemap material set for [biome/material]. Define base tiles, edge tiles, corner tiles, transition tiles, height/drop variants, and restrained variation decals. The material should read as a large clean mass first, with texture only where it supports form, path, or traversal. Keep the pixel clusters authored and grouped. Avoid random speckles, repeated obvious motifs, and even-detail distribution.
```

### Town prompt

```text
Design a premium pixel-RPG town scene with clear hub/path logic, readable building entrances, strong cultural motifs, a memorable landmark, and organized prop hierarchy. Use foreground framing and depth layering, but keep player tracking clear. Class A interactables such as doors, chests, signs, or quest props must not be buried in barrels, plants, or market clutter.
```

### Dungeon prompt

```text
Design a readable premium pixel-RPG dungeon room. Prioritize path, exits, hazards, puzzle elements, combat space boundaries, and traversal grammar. The floor texture must stay quiet enough for enemies/player to read. Puzzle objects must be distinct from decoration. Use lighting and shadows to support depth without hiding gameplay-critical edges.
```

---

## 8. Animation Prompt Patterns

### Walk cycle prompt

```text
Create a 4-frame overworld walk cycle with authored pixel timing. Frame semantics: contact-right, pass-A, contact-left, pass-B. Contacts are slightly lower/heavier; passing frames are slightly higher/centered. Arms oppose legs. Feet feel planted with no sliding. The head remains stable and appealing. Hair/cloth/prop elements lag by one beat where appropriate. The shadow persists and grounds the sprite in every frame. Preserve silhouette, palette, and outline consistency across the loop.
```

### Idle prompt

```text
Create a restrained overworld idle loop for [character role]. Use subtle breathing or weight shift, tiny hair/cloth/prop drift, and optional blink. Keep the silhouette stable and avoid distracting constant motion. The idle should feel alive, not bouncy or jittery.
```

### Animation critique prompt

```text
Review this animation at gameplay scale. Check contacts and feet first, then body weight, arm/leg opposition, silhouette stability, secondary overlap, shadow stability, timing personality, and frame-to-frame pixel jitter. Name any hard blockers such as sliding, floating, or random outline flicker before polish notes.
```

---

## 9. Lighting / FX Prompt Patterns

### Lighting prompt

```text
Apply modern pixel-RPG scene presentation while preserving crisp source pixel readability. Use dynamic-feeling lighting, coherent warm/cool recolor, contact shadows, and depth-supporting cast shadows. The sprite silhouette must stay crisp; the player must remain trackable; path and interactables must remain readable. Lighting should integrate the asset into the scene, not hide weak art.
```

### Water prompt

```text
Create stylized pixel-RPG water with clear shore boundaries, readable enterable/blocked status, grouped rhythmic highlights, restrained shimmer animation, and coherent biome color. Avoid random sparkle noise, photorealistic reflection, and water animation that distracts from player/path readability.
```

### Magic/FX prompt

```text
Create a stylized pixel-compatible magic effect with clean shape language, controlled glow, limited palette family, clear gameplay state, and no high-res particle soup. The effect may be smoother than the sprite layer but must not obscure character pose, path, or interactables.
```

---

## 10. Negative Guidance Patterns

Use negative guidance to prevent common model/pipeline defaults.

### Character negatives

```text
no realistic anatomy, no tiny hands or feet, no long torso, no generic silhouette,
no face-dependent identity, no hair strand noise, no soft gradients, no painterly shading,
no uniform pure-black outline, no texture render artifacts, no single-pixel speckle noise,
no muddy ramps, no floating feet, no pasted-on sprite
```

### World negatives

```text
no texture soup, no wallpaper tile repetition, no unclear walkable path,
no false interactables, no evenly distributed clutter, no random grass speckles,
no over-detailed floor competing with player, no ambiguous ledges, no flat single-plane scene,
no buried critical props, no generated-looking prop scatter
```

### Animation negatives

```text
no foot sliding, no floating, no puppet interpolation, no equal movement everywhere,
no random pixel jitter, no shadow flicker, no silhouette collapse, no stiff hair/cape,
no over-bouncy idle, no frame morphing without contact logic
```

### Lighting/FX negatives

```text
no blurred sprite silhouette, no muddy dynamic light, no glow spam, no high-res particle soup,
no fog hiding path, no shadows that look like blockers, no lighting that contradicts source shading,
no FX used to hide weak base art
```

---

## 11. Contrastive Examples

### Example A — Sprite polish note

Weak note:

```text
Make the sprite more detailed and add better highlights.
```

Strong note:

```text
The sprite is not ready for highlight polish. At gameplay scale, the torso and arms merge, the feet do not ground, and the hair shape is the only readable feature. First split the torso/arm value masses, widen the feet, add a stable contact shadow, and reduce clothing trim so the identity anchor and dominant color read clearly.
```

### Example B — Tilemap note

Weak note:

```text
The map needs more variation.
```

Strong note:

```text
The map has plenty of variation but no hierarchy. Grass, stone, props, and interactables all use similar contrast. Quiet the ground plane, strengthen the path edge, give the chest a clean silhouette and negative space, and reserve high-contrast clusters for traversal and interactables.
```

### Example C — Lighting note

Weak note:

```text
Add more dramatic lighting.
```

Strong note:

```text
The scene needs clearer integration, not more drama. The player loses contrast in the warm light and the cast shadow crosses the only exit path like a blocker. Protect player value contrast, reshape the shadow away from the path edge, and use atmosphere to separate background planes instead of darkening the play plane.
```

### Example D — Pipeline note

Weak note:

```text
The pixel filter is close; tune the palette reducer.
```

Strong note:

```text
This is failing before palette reduction. The output preserves the 3D model's realistic torso, tiny hands, baked render shadow, and noisy fabric texture. Add semantic stages: chibi proportion stylizer, identity-anchor amplifier, silhouette simplifier, cluster authoring pass, local outline pass, and scene validation.
```

---

## 12. Reference-Board Guidance

A good reference board should teach decision-making, not encourage copying.

### Include references for

```text
character silhouette variety
body-type range
identity anchors
palette/read hierarchy
tile material grammar
path/traversal readability
scene lighting integration
water/fog/shadow mood
animation contact/overlap examples
```

### Label references by principle

Instead of labeling an image:

```text
Sea of Stars town
```

Label it:

```text
Principle: warm town hub with clear path, roof/door readability, prop hierarchy, and player contrast preserved against dense market detail.
```

### Avoid reference misuse

Do not use references to copy:

- exact character designs
- exact tile motifs
- exact palettes
- exact map compositions
- exact UI/art assets

Use them to extract principles:

- hierarchy
- scene read
- cluster discipline
- material grammar
- presentation integration
- animation feel

---

## 13. Final Language Checklist

```text
[ ] Framed as class-of-craft inspiration, not clone request
[ ] Named the intended first read
[ ] Specified character identity anchor or world landmark
[ ] Prioritized gameplay scale and readability
[ ] Included cluster/palette/outline language for sprites
[ ] Included path/depth/traversal language for worlds
[ ] Included contact/weight/overlap language for animation
[ ] Included source asset vs runtime presentation separation for lighting/FX
[ ] Included negative guidance for likely bad defaults
[ ] Avoided copyrighted asset-copying instructions
[ ] Avoided vague “make it better / more detailed” wording
```
