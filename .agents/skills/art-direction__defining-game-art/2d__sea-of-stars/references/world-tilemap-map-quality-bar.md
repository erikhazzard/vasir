# World, Tilemap, and Map Quality Bar

Read this reference when directing, critiquing, specifying, or generating 2D RPG environments: tilemaps, towns, dungeons, overworld areas, biomes, terrain sets, prop kits, traversal surfaces, and map screenshots.

## Table of Contents

1. Quality definition
2. World read hierarchy
3. Gameplay readability before beauty
4. Tile grammar vs texture wallpaper
5. Terrain material language
6. Path, collision, and traversal readability
7. Depth planes, occlusion, and layering
8. Props, interactables, and clutter hierarchy
9. Composition and landmarks
10. Biome identity and palette logic
11. Architecture and town design
12. Dungeons and combat spaces
13. Tile repetition and variation control
14. World prompt/spec template
15. Common failure modes
16. World approval checklist

---

## 1. Quality Definition

A Sea-of-Stars world must feel touchable, navigable, layered, and alive. It should be rich enough to invite exploration but disciplined enough that the player instantly understands where to go, what matters, what blocks movement, and what belongs to which depth plane.

The environment is not a painted backdrop. It is a gameplay surface.

Core sentence:

> A world scene passes when walkability, depth, traversal, interactables, and focal composition read before decorative texture.

---

## 2. World Read Hierarchy

Every map or scene must read in this order:

```text
1. walkable path / play plane
2. blockers and edges
3. depth planes / vertical structure
4. traversal affordances
5. critical interactables
6. landmark / focal point
7. biome and material identity
8. decorative texture / ambient detail
```

If texture, props, or lighting obscure path and traversal, the art has failed even if the screenshot looks impressive.

### The first-screen question

When the player enters a room, they should understand:

```text
Where am I?
Where can I move?
What matters here?
What is the mood?
What might be interactable?
```

---

## 3. Gameplay Readability Before Beauty

World art must serve navigation.

### Must-read categories

```text
walkable ground
blocked ground
ledge / drop
stair / ramp
bridge / crossing
water edge
climbable / traversable feature
foreground occluder
background plane
door / exit / entrance
interactable prop
pure decoration
```

The player should not need collision feedback to learn basic spatial grammar.

### Good visual hierarchy

| Element | Visual treatment |
|---|---|
| Walkable path | broad readable mass, lower texture noise, clear edge logic |
| Collision/blockers | stronger silhouette, height cues, occlusion, shadows |
| Traversal | distinct edge/shape markers, consistent material grammar |
| Interactables | contrast/focus, readable shape, local composition privilege |
| Decoration | lower contrast, subordinate clusters, no false affordance |

---

## 4. Tile Grammar vs Texture Wallpaper

A tilemap is not just repeated surface art. It is a grammar system.

A strong tile set defines:

```text
base surface
edge behavior
corner behavior
height transition
material transition
wear/breakup logic
repeat variation
decoration rules
collision relation
lighting relation
```

### Texture wallpaper failure

A scene becomes wallpaper when:

- every tile has similar detail density
- edges do not clarify collision or height
- props are distributed evenly without composition
- repeated motifs reveal the grid
- material texture overwhelms large shapes

### Grammar-first correction

Before adding detail, define:

```text
What is the large terrain mass?
Where are its gameplay edges?
How does it transition to the next material?
What details are allowed in the center vs edge?
What details are forbidden near interactables or path-critical areas?
```

---

## 5. Terrain Material Language

Each material needs a distinct pixel grammar. Materials should not all be “base color + random speckles.”

### Grass

Read: soft living surface, walkable unless edge says otherwise.

Rules:

```text
[ ] broad green mass first
[ ] sparse cluster blades, not TV static
[ ] edge breakup strongest at borders
[ ] high contrast reserved for path/flowers/interactables
[ ] no uniform stipple blanket
```

Failure: grass chatter competes with characters and props.

### Dirt / Path

Read: travel route, worn ground, movement guidance.

Rules:

```text
[ ] lower noise than grass/stone around it
[ ] path edges guide player direction
[ ] color/value separates from surrounding terrain
[ ] cracks/pebbles subordinate to route shape
```

Failure: path blends into terrain or becomes busier than surroundings.

### Stone Floor

Read: solid constructed or natural hard plane.

Rules:

```text
[ ] plane mass first
[ ] cracks/chips follow structural logic
[ ] tile seams clarify orientation if needed
[ ] avoid equal-contrast pebble noise
[ ] use edge shadows for height/drop distinction
```

Failure: stone reads as noisy gravel, not a clear play plane.

### Cliff / Rock Wall

Read: height, blockage, verticality.

Rules:

```text
[ ] top plane and vertical face are value-separated
[ ] ledge edge is unmistakable
[ ] cracks describe planes, not random texture
[ ] base shadow/contact reinforces obstruction
[ ] climbable vs non-climbable cliffs must differ
```

Failure: cliff texture is attractive but elevation is ambiguous.

### Wood

Read: constructed material, direction, warmth.

Rules:

```text
[ ] plank/beam structure first
[ ] grain sparse and directional
[ ] edges and joins show construction
[ ] avoid hairline clutter on every board
```

Failure: wood becomes a field of noisy brown lines.

### Water

Read: liquid surface, boundary, depth/motion.

Rules:

```text
[ ] water identity immediate through hue/value/motion
[ ] surface highlights are rhythmic, not random
[ ] shore edge has consistent foam/wet/transition logic
[ ] depth changes can use value/color temperature shifts
[ ] animation must be calm enough to preserve path clarity
```

Failure: water is just blue floor, or so animated it becomes visual noise.

### Sand / Snow

Read: broad soft terrain with subtle surface variation.

Rules:

```text
[ ] large value mass first
[ ] footprints/ridges only where meaningful
[ ] texture sparse and clustered
[ ] edges and shadows do most spatial work
```

Failure: uniform stippling or overdrawn granules.

### Foliage / Trees

Read: volume, occlusion, biome identity.

Rules:

```text
[ ] canopy mass first
[ ] leaf clusters grouped into volumes
[ ] trunk/ground connection clear
[ ] foreground trees use controlled occlusion
[ ] tree silhouettes vary by biome and landmark importance
```

Failure: leaf noise hides silhouettes or makes foreground unreadable.

---

## 6. Path, Collision, and Traversal Readability

Traversal readability is part of art direction, not only level design.

### Path rules

```text
[ ] main route visible as large connected shape
[ ] optional branches readable but secondary
[ ] exit/entrance direction implied by composition
[ ] path texture quieter than decorative terrain when needed
[ ] no false path cues caused by decorative gaps
```

### Collision rules

Blockers should communicate blockage using:

- height
- shadow
- silhouette
- edge contrast
- occlusion
- material difference
- consistent collision grammar

Do not let a decorative object look more collision-solid than an actual blocker.

### Traversal affordance rules

Each traversal class needs a unique visual language:

| Traversal | Needs to show |
|---|---|
| Stair | direction, climbability, top/bottom plane |
| Ramp | slope continuity, destination plane |
| Ledge | top edge, drop direction, pass/block status |
| Bridge | crossing function, supports, elevation |
| Jump-down | safe drop cue, landing plane |
| Climbable | hand/foot holds or explicit material grammar |
| Water edge | boundary, depth, enterability if relevant |

Failure: the player learns by bumping into things instead of reading the world.

---

## 7. Depth Planes, Occlusion, and Layering

Premium 2D RPG worlds feel spatial. They do not collapse into one decorative plane.

### Required scene planes

```text
foreground occluders
play plane
midground/blocking structures
background/backdrop
vertical accents
```

Not every scene needs all planes, but every scene needs enough separation to understand space.

### Depth tools

Use:

- overlap
- shadow
- value grouping
- color temperature shifts
- edge thickness
- detail density changes
- atmospheric perspective
- parallax if supported
- occlusion sorting

### Player separation rule

The player must remain readable against every expected plane. Test against:

```text
grass, dirt, stone, wood, dark cave, warm interior, water edge, dense town clutter
```

### Foreground occlusion rule

Foreground elements are allowed to cover the player only when:

```text
[ ] sorting is predictable
[ ] silhouette remains trackable or outline/ghosting supports readability
[ ] critical interactions are not hidden
[ ] the occluder reinforces depth rather than confusion
```

---

## 8. Props, Interactables, and Clutter Hierarchy

Props are not equal. Classify them.

### Class A — Critical interactables

Examples:

```text
chest, lever, switch, save point, quest object, door, ladder, shrine, puzzle element
```

Rules:

```text
[ ] readable silhouette
[ ] higher contrast or color privilege
[ ] compositionally placed, not buried
[ ] clear relation to walkable area
[ ] not visually confused with ambient props
```

### Class B — Functional world props

Examples:

```text
barrels, signs, benches, crates, tools, lamps, market stands
```

Rules:

```text
[ ] enrich setting
[ ] support navigation/composition
[ ] avoid false interactable prominence unless actually interactive
```

### Class C — Ambient decoration

Examples:

```text
small rocks, flowers, grass tufts, tiny clutter, cracks, leaves, hanging bits
```

Rules:

```text
[ ] subordinate contrast
[ ] sparse near key interactables
[ ] no path confusion
[ ] no repeated obvious stamp cadence
```

### Clutter budget

Use clutter like seasoning. Dense clutter is allowed only when it is compositionally organized and does not bury gameplay signals.

Bad:

```text
Everything is equally detailed, equally saturated, equally contrasty.
```

Good:

```text
Dense market detail frames a clean path and a bright stall NPC focal point.
```

---

## 9. Composition and Landmarks

Every screen/room/area needs a compositional answer.

Ask:

```text
What is this scene about?
Where should the player look first?
Where should the player move next?
What landmark makes this place memorable?
What details are intentionally quiet?
```

### Composition tools

- path leading lines
- negative space
- value contrast
- hue contrast
- lighting pool
- vertical landmark
- prop framing
- foreground framing
- asymmetry
- scale contrast

### Landmark rule

A landmark does not need to be huge, but it must be memorable:

```text
clock tower, glowing well, twisted tree, bridge, shrine, ship mast, waterfall, market awning, forge furnace
```

If the scene has no landmark, it risks feeling generated.

---

## 10. Biome Identity and Palette Logic

Each biome needs a dominant visual premise, not just a different ground texture.

### Biome palette spec

```text
Dominant hue family:
Secondary support hue:
Accent hue:
Ambient temperature:
Value range:
Contrast strategy:
Player-read strategy:
Unique material/shape motif:
```

### Biome differentiation methods

- terrain silhouette
- foliage shape
- architecture material
- lighting temperature
- atmospheric effects
- prop culture
- edge language
- landmark type
- palette temperature

### Palette warning

Biome identity must survive a squint/blur test. If a biome only differs through tiny decorative detail, it is not visually distinct enough.

---

## 11. Architecture and Town Design

Towns must communicate culture, function, and navigation.

### Building rules

```text
[ ] roof shape readable
[ ] entrance readable
[ ] wall/roof planes separated
[ ] windows/doors do not become noisy pattern fields
[ ] signs or landmarks support navigation
[ ] scale works with character sprite
```

### Town composition

A town should have:

- main path or hub logic
- landmarks
- readable building entrances
- interactable prop hierarchy
- quiet areas for player tracking
- culture-specific motifs

### Architecture material caution

Do not over-render brick, shingles, wood grain, or windows. Let planes and silhouettes do most of the work.

---

## 12. Dungeons and Combat Spaces

Dungeons need stronger affordance clarity than decorative areas.

### Dungeon read priorities

```text
1. path and exits
2. hazards
3. interactables/puzzle elements
4. combat space boundaries
5. locked/unlocked state
6. atmosphere and material detail
```

### Combat space rules

If enemies or combat happen in the map scene:

```text
[ ] combat silhouettes separate from floor texture
[ ] hazards are high-read but not noisy
[ ] floor pattern does not obscure enemy contact points
[ ] lighting supports threat readability
```

### Puzzle readability

Puzzle elements must have stronger visual grammar than decoration.

A puzzle switch should not look like a decorative rock. A decorative rock should not look like a puzzle switch.

---

## 13. Tile Repetition and Variation Control

Tile repetition is not inherently bad; visible accidental repetition is.

### Control strategies

```text
autotile edge sets
center tile variation
macro decals
hand-placed breakups
large composition shapes
prop clustering
rotated/variant motifs where pixel grammar supports it
lighting and shadow variation
```

### Variation budget

Too little variation: repeated stamp pattern.  
Too much variation: noisy world with no stable read.

The correct target is:

```text
stable material identity + localized variation + composition-scale uniqueness
```

### Grid exposure warning

Avoid patterns that reveal tile grid cadence:

- same flower every N tiles
- same crack orientation repeated
- high-contrast corners lining up
- edge decorations repeating mechanically

---

## 14. World Prompt / Spec Template

Use this shape when producing an environment art prompt or production spec.

```markdown
## World Art Spec — [Area / Biome / Room]

### Intent
- Area role:
- Mood:
- Gameplay purpose:
- Traversal type:
- Camera / tile scale:

### First Read
1. Walkable path:
2. Blockers / edges:
3. Traversal affordances:
4. Critical interactables:
5. Landmark / focal point:

### Material Grammar
- Ground:
- Walls/cliffs:
- Foliage/props:
- Water/FX if any:
- Edge logic:

### Composition
- Focal point:
- Player route:
- Quiet zones:
- Foreground/background planes:

### Palette / Biome
- Dominant hue:
- Accent hue:
- Ambient light:
- Player contrast strategy:

### Forbidden Outcomes
- [noise/clutter/path confusion/etc.]

### Validation
- Path-read test:
- Player-read test:
- Traversal-read test:
- Focal-point test:
- Texture-noise test:
```

### Prompt language patterns

Useful:

```text
readable walkable path, layered top-down RPG tilemap, authored pixel clusters,
clear ledge grammar, strong landmark, low-noise terrain masses, selective texture,
foreground/play-plane/background separation, interactable props visually privileged,
rich but controlled biome palette, no wallpaper repetition, no texture soup
```

Avoid relying on:

```text
highly detailed everywhere, dense grass texture, random rocks, ultra intricate tiles,
photorealistic lighting baked into tiles, maximal clutter, seamless noise pattern
```

---

## 15. Common Failure Modes

### Pretty but Not Playable

Symptoms:

- unclear walkable path
- ledges/stairs ambiguous
- interactables buried
- foreground/background confused

Fix:

- reduce surface detail
- clarify path mass
- standardize traversal grammar
- privilege interactables with contrast/space

### Texture Soup

Symptoms:

- equal detail everywhere
- noisy grass/stone/wood
- player disappears
- screenshot feels crunchy but illegible

Fix:

- group values
- quiet play plane
- reserve contrast for focal elements
- remove repeated tiny marks

### Flat Wallpaper

Symptoms:

- little depth separation
- repeated tile pattern obvious
- props distributed evenly
- no landmark or focal point

Fix:

- add overlap/occlusion planes
- compose around landmark
- vary macro masses
- create foreground framing

### False Affordances

Symptoms:

- decorative props look interactive
- blockers look walkable
- stairs look decorative
- climbable edges same as normal walls

Fix:

- define class-specific shape/value/color rules
- reduce contrast on decoration
- give critical objects composition privilege

### Pasted Character

Symptoms:

- player scale wrong
- contact shadow missing
- environment contrast overwhelms sprite
- depth sorting feels wrong

Fix:

- test player on every biome material
- adjust value/texture under player
- add grounding shadow
- correct sorting/occlusion rules

---

## 16. World Approval Checklist

```text
[ ] walkable path reads immediately
[ ] blockers and collision edges are clear
[ ] foreground / play plane / background are distinct
[ ] traversal affordances are visually distinct
[ ] critical interactables are privileged over decoration
[ ] player remains readable on all major surfaces
[ ] material texture supports form, not noise
[ ] tile repetition is controlled
[ ] scene has a clear landmark or focal point
[ ] biome identity is visible at squint scale
[ ] prop clutter is hierarchically organized
[ ] architecture entrances and planes read clearly
[ ] lighting/atmosphere does not obscure navigation
[ ] no decorative detail creates false affordance
[ ] map feels composed, not generated wallpaper
```
