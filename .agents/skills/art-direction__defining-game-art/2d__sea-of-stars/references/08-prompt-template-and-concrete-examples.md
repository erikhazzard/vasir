# 08 — Prompt Template, Baseline Prompts, and Concrete Examples

Use this reference when you want the **actual reusable prompt template** for Sea-of-Stars-adjacent 2D RPG pixel-art generation, plus paired **bare-minimum baseline prompts** and **skill-compressed prompts** you can run manually to see whether the art direction is producing the right kind of output.

This file is deliberately **not** a meta wrapper.
It does **not** say “use the skill.”
It is the **compiled prompt form** of the skill.

Each concrete example includes two prompts:

1. **Baseline prompt** — the bare minimum request without the skill's quality-bar language. This should still get the core subject, but will often expose the default model failure: generic pixel art, noisy detail, weak silhouettes, muddy tilemaps, poor walk-sheet semantics, or shallow “Sea of Stars inspired” mimicry.
2. **Skill-compressed prompt** — the same request with the full art-direction prior compiled into the prompt. This is the prompt that should produce the S-tier direction.

Use the pair as an A/B test. The baseline is not meant to be excellent. It is meant to reveal what the skill improves.

The target is **Sea-of-Stars-adjacent craft**, not a literal clone of Sea of Stars characters, tiles, monsters, palettes, UI, maps, logos, compositions, or official artwork.

## Core Principle

The fixed part of the prompt should carry the Sea-of-Stars-adjacent art-direction prior:

- original premium 2D RPG pixel art
- gameplay-scale readability before decorative detail
- clean chibi / overworld character proportions
- strong silhouette and identity anchor
- authored pixel clusters, not generated noise
- disciplined palette ramps and material grouping
- hard-stepped base shading
- selective colored outlines, not uniform black sticker lines
- readable tile/world path hierarchy
- clear foreground / play plane / background separation
- modern lighting, shadows, water, and atmosphere only when they preserve pixel readability
- premium hand-authored charm, not “rendered then pixelated” output

The variable part should only describe the specific character, sheet, tilemap, biome, scene, animation state, lighting condition, or optional production constraints.

---

## Base Template

Use this as the default house template:

```text
Create an original premium 2D RPG pixel-art [asset type]. Do not copy any existing Sea of Stars character, monster, environment, tileset, UI, logo, composition, palette, or official artwork. Target Sea-of-Stars-adjacent craft: instantly readable gameplay-scale forms, authored pixel clusters, clean chibi stylization where appropriate, disciplined color ramps, hard-stepped shading, selective colored outlines, strong silhouette/path hierarchy, and modern scene-aware presentation that never blurs the pixel language.

Design [subject name or environment name], a [role / asset role]. Core fantasy: [core fantasy]. Primary identity anchor: [silhouette, hair/hat/prop/weapon/color/world landmark]. Dominant read: [dominant color, shape, material, or traversal cue]. The design must instantly communicate [read goals].

Show [pose, sheet layout, tilemap sample, map vignette, animation moment, or scene state]. Format/framing: [format]. Background/context: [background or scene context].

Prioritize large readable masses, gameplay-scale clarity, intentional cluster shapes, clean material separation, grounded contact shadows, and original premium 2D RPG charm. Avoid photorealism, generic pixel filters, anti-aliased blur, smooth gradient shading, noisy texture soup, uniform pure-black outlines, tiny anatomy/facial detail, unreadable clutter, and effects that hide the base art.

Optional notes:
Palette/material notes: [optional]
Lighting/FX notes: [optional]
Animation notes: [optional]
Tilemap/world notes: [optional]
Extra constraints: [optional]
```

---

## Field Guidance

| Field | Guidance |
|---|---|
| `[asset type]` | Usually `single overworld character sprite`, `4x4 walk sprite sheet`, `NPC lineup`, `monster overworld sprite`, `tilemap sample`, `environment scene mockup`, `prop sheet`, or `lighting/FX scene test`. |
| `[role / asset role]` | Character examples: protagonist, healer, guard, merchant, child, elder, monster, boss overworld sprite. World examples: village path, forest crossing, cliff traversal, dungeon room, market interior, water-edge scene. |
| `[core fantasy]` | The simple emotional/gameplay idea: wandering lunar scout, cozy apothecary merchant, sturdy town guard, mossy ruin entrance, warm lantern tavern. |
| `[primary identity anchor]` | Character: hair mass, hat, cloak, weapon, backpack, scarf, horns, silhouette, dominant color block. World: landmark tree, bridge, waterfall, stair/ledge structure, shrine, lantern cluster, material contrast. |
| `[dominant read]` | What should survive at reduced scale: red cloak, moon-blue hair, round merchant shape, bright path through dark woods, warm tavern floor, cliff edge, water highlight. |
| `[read goals]` | Character: role, body type, mood, direction, action. World: walkable path, obstacle, interactable, vertical layer, material, focal point. |
| `[pose, sheet layout, tilemap sample...]` | Be explicit. Good prompts describe stance, direction, grid layout, contact frames, path shape, traversal feature, lighting state, and foreground/midground/background. |
| `[format]` | Common values: `single enlarged sprite on transparent background`, `4x4 transparent sprite sheet`, `four-direction turnaround`, `top-down RPG map vignette`, `tilemap test scene`, `prop sheet`, `full scene mockup`. |
| `[background/context]` | Use `transparent background` or `clean neutral background` for pure sprite evals. Use a controlled scenic context only when testing world or integration. |
| `Palette/material notes` | Use when color identity matters. Keep ramps disciplined; avoid muddy shadows and too many unrelated hues. |
| `Lighting/FX notes` | Use when testing runtime presentation. Light, shadow, fog, glow, or water may enrich the scene but must not blur the pixel forms. |
| `Animation notes` | Use for walk-cycle semantics: contact frames, center frames, bob, arm opposition, hair/cloth lag, planted feet. |
| `Tilemap/world notes` | Use for path readability, depth planes, terrain transitions, traversal affordances, prop hierarchy, and landmark composition. |
| `Extra constraints` | Use to enforce no empty grid cells, no anti-aliased blur, no pure black outlines, no texture noise, or same-character consistency. |

---

## Concrete Examples

### Example 1 — Protagonist Overworld Sprite

#### Baseline prompt — bare minimum / no skill

```text
Sea of Stars inspired pixel art of a young adventurer RPG character with golden hair, a short blue cloak, a travel satchel, and a crescent compass. Full-body overworld character sprite on a transparent background.
```

#### Skill-compressed prompt — with art-direction prior

```text
Create an original premium 2D RPG pixel-art single overworld character sprite. Do not copy any existing Sea of Stars character, monster, environment, tileset, UI, logo, composition, palette, or official artwork. Target Sea-of-Stars-adjacent craft: instantly readable gameplay-scale forms, authored pixel clusters, clean chibi stylization, disciplined color ramps, hard-stepped shading, selective colored outlines, strong silhouette hierarchy, and modern scene-aware presentation that never blurs the pixel language.

Design Solwyn Trailkeeper, a young wandering protagonist. Core fantasy: a bright-hearted pathfinder who carries a small travel satchel and a crescent-shaped field compass. Primary identity anchor: oversized swept moon-gold hair, short blue travel cloak, and the crescent compass held near the torso. Dominant read: warm gold hair against cool blue cloak. The design must instantly communicate agile protagonist, optimistic traveler, and readable chibi overworld proportions.

Show a front-facing idle sprite, relaxed but alert, feet planted wide enough to feel grounded, head large and expressive, hands and boots visible at gameplay scale. Format/framing: single enlarged overworld sprite on transparent background, designed to still read clearly if reduced to 64x64. Background/context: transparent background.

Prioritize large readable masses, gameplay-scale clarity, intentional cluster shapes, clean material separation, grounded contact shadow, and original premium 2D RPG charm. Avoid photorealism, generic pixel filters, anti-aliased blur, smooth gradient shading, noisy texture soup, uniform pure-black outlines, tiny anatomy/facial detail, unreadable clutter, and effects that hide the base art.

Optional notes:
Palette/material notes: 3–5 tones for hair, 3–4 tones for cloak, warm skin ramps, cool shadow accents, no muddy grays.
Lighting/FX notes: neutral base light with subtle top-left form read; no dramatic runtime lighting in this sprite.
Animation notes:
Tilemap/world notes:
Extra constraints: no pure black outline; use darker local-color outlines with heavier shadow-side contour.
```

---

### Example 2 — 4x4 Walk Sprite Sheet

#### Baseline prompt — bare minimum / no skill

```text
Sea of Stars inspired 4x4 pixel art walk sprite sheet of the same young adventurer with golden hair, a blue cloak, a satchel, and a crescent compass. Four directions, four frames each, transparent background.
```

#### Skill-compressed prompt — with art-direction prior

```text
Create an original premium 2D RPG pixel-art 4x4 walk sprite sheet. Do not copy any existing Sea of Stars character, monster, environment, tileset, UI, logo, composition, palette, or official artwork. Target Sea-of-Stars-adjacent craft: instantly readable gameplay-scale forms, authored pixel clusters, clean chibi stylization, disciplined color ramps, hard-stepped shading, selective colored outlines, strong silhouette hierarchy, and modern scene-aware presentation that never blurs the pixel language.

Design Solwyn Trailkeeper, the same young wandering protagonist. Core fantasy: bright-hearted pathfinder with a small travel satchel and crescent-shaped field compass. Primary identity anchor: oversized swept moon-gold hair, short blue travel cloak, and crescent compass. Dominant read: warm gold hair plus cool blue cloak. The design must instantly communicate agile protagonist, travel-ready personality, and consistent identity from every direction.

Show a transparent 4x4 walk sheet with four rows and four columns. Row 0: front walk. Row 1: back walk. Row 2: left walk. Row 3: right walk. Frame order per row: contact-right, center-a, contact-left, center-b. Contact frames should sit slightly lower; center frames slightly higher. Arms oppose legs. Hair and cloak lag by one frame. Feet must look planted on contact frames. Every cell must be filled and aligned to the same baseline. Format/framing: 4x4 transparent sprite sheet, evenly spaced cells, clean readable pixel art.

Prioritize large readable masses, gameplay-scale clarity, intentional cluster shapes, clean material separation, grounded contact shadow in every frame, and original premium 2D RPG charm. Avoid photorealism, generic pixel filters, anti-aliased blur, smooth gradient shading, noisy texture soup, uniform pure-black outlines, tiny anatomy/facial detail, empty cells, foot sliding, and effects that hide the base art.

Optional notes:
Palette/material notes: preserve the same palette across all directions and frames.
Lighting/FX notes: no runtime effects; source sprite sheet only.
Animation notes: subtle vertical bob, planted feet, opposite arm swing, one-frame hair/cloak lag, consistent front/back/side timing.
Tilemap/world notes:
Extra constraints: keep character height around 55–65% of each cell and preserve the same identity anchor in every row.
```

---

### Example 3 — Cozy Merchant NPC Sprite

#### Baseline prompt — bare minimum / no skill

```text
Sea of Stars inspired pixel art of a cozy village apothecary merchant with a mushroom-shaped hat, apron, herb pouch, and warm friendly expression. Full-body NPC overworld sprite on a transparent background.
```

#### Skill-compressed prompt — with art-direction prior

```text
Create an original premium 2D RPG pixel-art single overworld character sprite. Do not copy any existing Sea of Stars character, monster, environment, tileset, UI, logo, composition, palette, or official artwork. Target Sea-of-Stars-adjacent craft: instantly readable gameplay-scale forms, authored pixel clusters, clean chibi stylization, disciplined color ramps, hard-stepped shading, selective colored outlines, strong silhouette hierarchy, and modern scene-aware presentation that never blurs the pixel language.

Design Brindle Potts, a cozy village apothecary merchant. Core fantasy: warm, round, helpful shopkeeper who sells herb tonics and tiny lantern charms. Primary identity anchor: wide mushroom-shaped hat, round body type, little apron, and oversized herb pouch. Dominant read: soft amber hat and green apron. The design must instantly communicate friendly merchant, round body type, and cozy town NPC charm.

Show a front-facing idle sprite with a gentle welcoming posture, one hand holding a tiny bottle, the other hand resting near the herb pouch. Format/framing: single enlarged overworld sprite on transparent background, designed to read at 64x64 gameplay scale. Background/context: transparent background.

Prioritize large readable masses, gameplay-scale clarity, intentional cluster shapes, clean material separation, grounded contact shadow, and original premium 2D RPG charm. Avoid photorealism, generic pixel filters, anti-aliased blur, smooth gradient shading, noisy texture soup, uniform pure-black outlines, tiny facial detail, and cluttered apron micro-detail.

Optional notes:
Palette/material notes: warm amber, herbal green, cream apron, warm skin ramps, deep local-color outlines.
Lighting/FX notes: neutral base light; no glow except a single tiny bottle highlight if it remains readable.
Animation notes:
Tilemap/world notes:
Extra constraints: the hat and body silhouette should be recognizable even as a flat black silhouette.
```

---

### Example 4 — Monster Overworld Sprite

#### Baseline prompt — bare minimum / no skill

```text
Sea of Stars inspired pixel art of a small mossy turtle forest monster with glowing seed-like eyes. Cute but slightly dangerous overworld monster sprite on a transparent background.
```

#### Skill-compressed prompt — with art-direction prior

```text
Create an original premium 2D RPG pixel-art monster overworld sprite. Do not copy any existing Sea of Stars character, monster, environment, tileset, UI, logo, composition, palette, or official artwork. Target Sea-of-Stars-adjacent craft: instantly readable gameplay-scale forms, authored pixel clusters, clean stylized proportions, disciplined color ramps, hard-stepped shading, selective colored outlines, strong silhouette hierarchy, and modern scene-aware presentation that never blurs the pixel language.

Design a Mossback Wisp-Turtle, a small forest monster that hides as a mossy stone and pops awake when approached. Core fantasy: cute but dangerous woodland ambush creature. Primary identity anchor: squat turtle-like shell covered with two large moss tufts and glowing seed-like eyes. Dominant read: rounded dark shell, bright moss top, tiny warm eye sparks. The design must instantly communicate small monster, forest camouflage, and readable threat without becoming noisy.

Show a three-quarter front overworld sprite in a crouched alert pose, shell low to the ground, moss tufts creating a distinct silhouette, eyes visible as tiny focal accents. Format/framing: single enlarged overworld monster sprite on transparent background, designed to read clearly if reduced to 64x64. Background/context: transparent background.

Prioritize large readable masses, gameplay-scale clarity, intentional cluster shapes, clean material separation, grounded contact shadow, and original premium 2D RPG charm. Avoid photorealism, generic pixel filters, anti-aliased blur, smooth gradient shading, noisy texture soup, uniform pure-black outlines, tiny scale/grass detail, and monster detail that collapses into a green blob.

Optional notes:
Palette/material notes: moss greens, cool stone-shell shadows, warm tiny eye accents; 3–4 tones per material.
Lighting/FX notes: no runtime glow beyond controlled eye accents.
Animation notes:
Tilemap/world notes:
Extra constraints: preserve a simple readable silhouette; moss texture must be clustered, not evenly noisy.
```

---

### Example 5 — Forest Path Tilemap Sample

#### Baseline prompt — bare minimum / no skill

```text
Sea of Stars inspired pixel art tilemap of a magical forest dirt path with moss, stones, tiny flowers, fern canopies, and a small wooden footbridge.
```

#### Skill-compressed prompt — with art-direction prior

```text
Create an original premium 2D RPG pixel-art tilemap sample. Do not copy any existing Sea of Stars character, monster, environment, tileset, UI, logo, composition, palette, or official artwork. Target Sea-of-Stars-adjacent craft: instantly readable gameplay-scale forms, authored pixel clusters, disciplined color ramps, hard-stepped material shapes, selective colored outlines where needed, strong path hierarchy, layered depth, and modern scene-aware presentation that never blurs the pixel language.

Design Moonfern Crossing, a small forest path environment. Core fantasy: a magical green woodland crossing with a readable dirt path, soft moss, low stone edges, tiny flowers, and a simple wooden footbridge. Primary identity anchor: curved moon-shaped path leading to a small bridge under fern canopies. Dominant read: walkable warm dirt path cutting through cooler green forest. The design must instantly communicate where the player can walk, what blocks movement, and where the path leads.

Show a top-down / three-quarter RPG tilemap scene sample with clear walkable path, grass borders, small rocks, low ledges, a bridge, and a few decorative props. Format/framing: square map vignette or tilemap test scene, no UI. Background/context: forest biome with foreground foliage framing the scene but not hiding the path.

Prioritize walkable path readability, large terrain masses, intentional material clusters, clean transitions between dirt/grass/stone/wood, foreground/play-plane/background separation, and premium hand-authored pixel charm. Avoid photorealism, generic pixel filters, noisy grass texture, uniform pebble clutter, ambiguous collision edges, anti-aliased blur, smooth gradients, and decorative detail that hides the navigation read.

Optional notes:
Palette/material notes: cool lush greens, warm readable dirt path, restrained flower accents, darker local outlines only at important edges.
Lighting/FX notes: soft daytime canopy light; subtle contact shadows under bridge/rocks; no heavy fog.
Animation notes:
Tilemap/world notes: path must remain readable at a squint; bridge must read as traversable; low stone edges must read as blockers.
Extra constraints: texture supports form; it must not become wallpaper.
```

---

### Example 6 — Cliffside Traversal Map Vignette

#### Baseline prompt — bare minimum / no skill

```text
Sea of Stars inspired pixel art RPG map scene of a sunny cliffside traversal area with golden stone ledges, stairs, a narrow bridge, a lower level, and a wind-bent tree.
```

#### Skill-compressed prompt — with art-direction prior

```text
Create an original premium 2D RPG pixel-art environment scene mockup. Do not copy any existing Sea of Stars character, monster, environment, tileset, UI, logo, composition, palette, or official artwork. Target Sea-of-Stars-adjacent craft: instantly readable gameplay-scale forms, authored pixel clusters, disciplined color ramps, hard-stepped material shapes, strong traversal hierarchy, layered depth, and modern scene-aware presentation that never blurs the pixel language.

Design Sunspine Cliff, a small traversal-focused cliffside map. Core fantasy: a bright rocky path with climbable ledges, stairs, a narrow bridge, and a visible lower level. Primary identity anchor: stacked golden stone ledges with a zig-zagging climb route and one wind-bent tree. Dominant read: warm cliff planes against cool distant shadows. The design must instantly communicate height, ledges, stairs, walkable surfaces, blocked drops, and route direction.

Show a top-down / three-quarter RPG map vignette with clear vertical layering: lower path, raised ledge, stairs, bridge, cliff walls, and foreground overhangs. Include one tiny original player sprite for scale and readability testing. Format/framing: full scene mockup, no UI. Background/context: sunny cliff traversal scene with readable depth planes.

Prioritize traversal readability, large plane separation, clean cliff-edge logic, visible player grounding, material-specific stone clusters, and premium hand-authored pixel charm. Avoid photorealism, generic pixel filters, noisy rock texture, ambiguous ledges, invisible collision logic, anti-aliased blur, smooth gradients, and detail that makes stairs or path edges unclear.

Optional notes:
Palette/material notes: warm ochre stone, cool blue-violet depth shadows, sparse green plant accents.
Lighting/FX notes: bright top-left sunlight with small cast shadows to clarify height; no lighting that hides traversal cues.
Animation notes:
Tilemap/world notes: stairs must read as climbable, bridge as traversable, cliff walls as blockers, lower level as separate plane.
Extra constraints: the player sprite must be readable against every material patch.
```

---

### Example 7 — Warm Interior Prop-Read Scene

#### Baseline prompt — bare minimum / no skill

```text
Sea of Stars inspired pixel art cozy apothecary shop interior with shelves, bottles, rugs, lanterns, herb bundles, a counter, and a clear walking path.
```

#### Skill-compressed prompt — with art-direction prior

```text
Create an original premium 2D RPG pixel-art environment scene mockup. Do not copy any existing Sea of Stars character, monster, environment, tileset, UI, logo, composition, palette, or official artwork. Target Sea-of-Stars-adjacent craft: instantly readable gameplay-scale forms, authored pixel clusters, disciplined color ramps, hard-stepped material shapes, selective colored outlines, clear prop hierarchy, and modern scene-aware presentation that never blurs the pixel language.

Design Hearthroot Apothecary, a small warm shop interior. Core fantasy: cozy herbal shop with shelves, counter, lanterns, bottles, rugs, and a clear player path to the merchant. Primary identity anchor: crescent-shaped counter with hanging herb bundles and a warm central lantern. Dominant read: clear floor path and counter interaction point. The design must instantly communicate where the player can walk, where the merchant stands, what is interactable, and what is decorative clutter.

Show a top-down / three-quarter RPG interior scene with a readable floor path, counter, merchant position, shelves, small props, warm lantern light, and one clear interactable item. Format/framing: full room mockup, no UI. Background/context: warm interior with controlled prop density.

Prioritize path readability, interaction hierarchy, foreground/play-plane separation, clean wood/cloth/glass material clusters, grounded shadows, and premium hand-authored pixel charm. Avoid photorealism, generic pixel filters, noisy shelf clutter, props that bury the interaction point, anti-aliased blur, smooth gradients, uniform black outlines, and decorative detail that makes the room hard to navigate.

Optional notes:
Palette/material notes: warm amber lantern light, honey wood, muted greens, restrained glass highlights.
Lighting/FX notes: lantern glow may tint the scene, but must not blur pixel edges or hide the floor path.
Animation notes:
Tilemap/world notes: classify props visually: counter and merchant are critical, shelves are supporting, tiny bottles are ambient.
Extra constraints: the scene should still read if slightly blurred or viewed at reduced scale.
```

---

### Example 8 — Water / Lighting / Scene Integration Test

#### Baseline prompt — bare minimum / no skill

```text
Sea of Stars inspired pixel art moonlit shallow-water crossing with stepping stones, glowing water, a tiny hero carrying a lantern, and soft nighttime lighting.
```

#### Skill-compressed prompt — with art-direction prior

```text
Create an original premium 2D RPG pixel-art lighting and scene-integration test. Do not copy any existing Sea of Stars character, monster, environment, tileset, UI, logo, composition, palette, or official artwork. Target Sea-of-Stars-adjacent craft: instantly readable gameplay-scale forms, authored pixel clusters, disciplined color ramps, hard-stepped source forms, readable path hierarchy, layered depth, and modern scene-aware presentation that never blurs the pixel language.

Design Starwell Ford, a moonlit shallow-water crossing. Core fantasy: a quiet blue night scene where a tiny hero crosses stepping stones through glowing water. Primary identity anchor: readable stepping-stone path, moonlit water highlights, and a warm lantern carried by the hero. Dominant read: safe stepping stones and hero silhouette against cool water. The design must instantly communicate walkable stones, water boundary, foreground reeds, background bank, and the hero’s grounded contact.

Show a full scene mockup with one small original hero sprite standing on a stepping stone, shallow water around them, reeds in the foreground, a darker far bank, and controlled moonlight/warm lantern contrast. Format/framing: square gameplay scene mockup, no UI. Background/context: moonlit outdoor water crossing.

Prioritize path readability, player readability, grounded contact shadow/reflection logic, clean water highlight clusters, restrained atmosphere, and premium hand-authored pixel charm. Avoid photorealism, generic pixel filters, noisy water shimmer, bloom that washes out the sprite, anti-aliased blur, smooth gradients, unclear walkable surfaces, and lighting that makes the player merge into the scene.

Optional notes:
Palette/material notes: cool blue water and shadows, small warm lantern accent, restrained moonlight highlights.
Lighting/FX notes: dynamic-feeling moonlight and lantern glow are allowed, but the base pixel forms and stepping-stone path must stay crisp.
Animation notes:
Tilemap/world notes: stepping stones are walkable; water is boundary; reeds are foreground decoration only.
Extra constraints: the player must feel integrated into the scene, not pasted on top.
```

---

## Recommended Use

For each example, run the **baseline prompt first**, then run the **skill-compressed prompt**. Compare the difference in silhouette discipline, palette control, authored clusters, tile/path readability, animation grammar, and scene integration.

For the highest-signal manual check, start with these four:

1. **Example 1 — Protagonist Overworld Sprite**
2. **Example 2 — 4x4 Walk Sprite Sheet**
3. **Example 5 — Forest Path Tilemap Sample**
4. **Example 8 — Water / Lighting / Scene Integration Test**

That set gives fast signal on:

- character silhouette and chibi proportion quality
- sprite-sheet / animation grammar
- tilemap path readability
- scene integration with lighting and water
- whether the output feels authored rather than rendered-and-pixelized

Use **Example 6** when testing traversal readability.
Use **Example 7** when testing prop clutter and interaction hierarchy.
Use **Example 3** when testing NPC body-type variation and charm.
Use **Example 4** when testing monster design without noisy texture collapse.

---

## Fast Evaluation Checklist

Use this short checklist when comparing outputs:

- silhouette or path reads immediately
- asset works at gameplay scale, not only enlarged
- character has a clear identity anchor and dominant color read
- body proportions feel stylized and charming, not semi-realistic mush
- pixel clusters describe form/material/motion instead of becoming noise
- palette ramps are disciplined and not muddy
- outlines are selective/local-color, not pure-black sticker contours
- tile/world art clearly separates walkable path, blockers, depth planes, and interactables
- animation prompts preserve contact frames, bob, arm opposition, and follow-through
- lighting/FX enhance the scene without blurring pixel readability
- the design feels original rather than derivative

Failing outputs usually show one of these patterns:

- high-res illustration with a pixel filter
- pretty sprite that is unreadable at gameplay scale
- tiny realistic anatomy and weak chibi appeal
- uniform black outline around everything
- noisy grass/stone/water texture instead of authored clusters
- tilemap that looks decorative but does not communicate movement
- lighting/fog/bloom that hides the sprite or path
- world scene where the player feels pasted on top
- sprite sheet with inconsistent proportions, empty cells, or sliding feet
