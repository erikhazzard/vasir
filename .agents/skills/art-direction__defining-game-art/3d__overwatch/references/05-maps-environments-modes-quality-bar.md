# 05 — Maps, Environments, and Modes Quality Bar

Use this reference for hero-shooter arenas, stylized 3D maps, competitive environments, mode readability, objective spaces, cover/lanes/verticality, lighting, and environmental storytelling.

## Table of Contents

1. Environment quality definition
2. Map art as competitive communication
3. Mode-first constraints
4. Blockout-to-art workflow
5. Lanes, cover, range, and verticality
6. Landmarks, callouts, and local identity
7. Lighting and atmosphere
8. Material and shape language
9. Hero readability against the world
10. Dynamic environment and interactables
11. Cultural/geographic reference
12. Review templates
13. Common failure modes
14. Final checklist

---

## 1. Environment quality definition

An Overwatch-class map is not a pretty level. It is a **playable visual communication system**.

A passing map must:

- support the game mode
- communicate objective, lanes, cover, routes, verticality, and spawn flow
- give players memorable landmarks and local callouts
- make heroes visible against the environment
- create distinct fight ranges and movement opportunities
- feel rooted in a real or believable place
- use stylization and lighting to clarify, not obscure
- reward exploration with detail without burying combat information

The highest bar:

```text
The map reads as a place, plays as a sport, and screenshots as a piece of worldbuilding.
```

---

## 2. Map art as competitive communication

Environment art must answer:

```text
Where am I?
Where is the objective?
Where are my exits?
Where is cover?
Where is high ground?
Where are enemies likely to appear?
What range is this space built for?
What is foreground/background/decorative?
What can be destroyed/interacted with?
What is only story flavor?
```

Read hierarchy:

1. objective / mode state
2. player path and route options
3. cover and sightlines
4. enemy/ally hero visibility
5. verticality and traversal
6. landmarks / local identity
7. material and biome identity
8. props and story detail
9. micro-decoration

If decorative richness fights any of the first five, the environment fails.

---

## 3. Mode-first constraints

Different modes need different art constraints. Do not art all maps the same way.

### Control / symmetric point modes

Needs:

- fair team approach readability
- mirrored or equivalently legible routes
- clear point identity
- recognizable flank routes
- strong central landmark
- clean hero visibility around point

Risks:

- one side visually easier to read
- symmetry boring or fake
- point clutter hides enemies
- lighting gives a side advantage

### Escort / payload modes

Needs:

- main route clarity
- payload path readability
- changing fight spaces along route
- readable checkpoints
- staging areas before corners/chokes
- clear high-ground opportunities

Risks:

- decorative path hides payload route
- confusing branch hierarchy
- choke art too busy
- landmarks too similar across segments

### Hybrid modes

Needs:

- strong transition between capture and escort phases
- initial objective clarity
- route shift after payload unlock
- landmarks that track progression

Risks:

- phase transition unclear
- first area and escort area feel like separate maps without connective logic

### Deathmatch / FFA / arena modes

Needs:

- exciting fight spaces
- varied ranges
- loop readability
- vertical opportunities
- fast local orientation
- fewer dead ends

Risks:

- beautiful but unfair sniper nests
- too many tiny routes
- no central identity
- confusing spawn flow

### Push / robot / moving objective modes

Needs:

- long-axis navigation
- clear robot/path identity
- readable forward/backward state
- frequent landmarks along the route
- flanks that do not erase objective read

Risks:

- players lose track of the moving objective
- repeated street segments feel identical
- route bends hide state

### Large multi-point / flashpoint-like modes

Needs:

- macro navigation landmarks
- fast local orientation when a point activates
- readable travel routes
- strong district identity per point
- spawn/rotation clarity

Risks:

- open-world feeling without competitive read
- too much environmental variety with no hierarchy
- players cannot quickly infer active objective direction

---

## 4. Blockout-to-art workflow

### Correct order

```text
1. mode goals
2. playable blockout
3. sightline/range/cover tests
4. landmark and callout plan
5. lighting/navigation plan
6. material/biome/world reference
7. hero visibility tests
8. prop and detail hierarchy
9. dynamic atmosphere and polish
10. competitive readability pass
```

Do not start from final beauty concept and force gameplay into it.

### Art the blockout

Good environment art clarifies the level-design structure:

- cover becomes readable as cover
- high ground becomes inviting and identifiable
- routes have visual hierarchy
- flank paths have local identity
- objectives have compositional gravity
- landmarks support callouts
- lighting guides orientation

Bad environment art hides the blockout with props, texture, fog, or decorative shapes.

### Blockout preservation audit

At each art pass, compare against the blockout:

```text
[ ] Did we obscure a sightline unintentionally?
[ ] Did we make cover ambiguous?
[ ] Did we make a route look more/less important than intended?
[ ] Did we create misleading climb/jump affordances?
[ ] Did lighting alter fairness or readability?
[ ] Did prop detail create noise in combat zones?
```

---

## 5. Lanes, cover, range, and verticality

### Lanes

Lane art should make route options readable without painting arrows everywhere.

Use:

- architecture orientation
- floor material flow
- lighting gradient
- sign/prop density
- silhouette opening/closing
- landmark alignment
- value contrast

Avoid:

- every corridor same width/material/light
- decorative clutter at route entrances
- ambiguous doors/windows
- props that look like cover but are not

### Cover

Cover must be readable as cover quickly.

Cover should have:

- strong silhouette
- clear height class
- consistent collision expectation
- visible edge and top plane
- distinct treatment from decoration

Cover classes:

```text
low cover / peek cover / full cover / soft visual cover / non-cover decoration / destructible or interactive cover
```

If a prop looks like cover but cannot be used like cover, it creates trust damage.

### Range design

Art should reveal the intended combat range:

- long sightline: clear line, fewer occluding props, strong endpoint landmark
- medium fight: cover rhythm, readable side routes, controlled detail
- close fight: tighter geometry, bold exits, high hero visibility
- vertical duel: readable access routes and ledge edges

### Verticality

Vertical spaces need obvious affordances:

- stairs, ramps, lifts, climb routes, jump pads, rooftops, ledges
- high-ground edges readable from below
- silhouette of accessible upper space distinct from non-playable set dressing
- lighting or material shift to show playable platforms

Failure:

```text
Players can see high ground but cannot tell how to reach it.
```

---

## 6. Landmarks, callouts, and local identity

### Landmark roles

Landmarks support:

- orientation
- team communication
- memory
- worldbuilding
- objective focus
- route selection

Each combat area should have at least one clear local landmark.

### Landmark design rules

A landmark should be:

- visible from multiple angles
- visually distinct from surrounding forms
- short-nameable by players
- tied to layout or objective location
- not so visually loud that it hides heroes

Examples of landmark types:

```text
large statue
distinct shop
bridge
tower
gate
vehicle
signage cluster
unique color-lit room
fountain
train/payload station
arcade/cafe/bar
temple/shrine/industrial machine
```

### Local identity

Players should be able to say:

```text
fight at bridge
rotate through cafe
take high ground over market
enemy in shrine room
push through red hall
```

If locations are only distinguishable by minimap coordinates or designer names, the art has failed as communication.

---

## 7. Lighting and atmosphere

### Lighting jobs

Lighting must serve four jobs:

1. visibility
2. navigation
3. mood
4. world/story

Visibility and navigation win over mood.

### Lighting for navigation

Use lighting to:

- separate zones
- emphasize exits
- frame objectives
- distinguish route types
- call out vertical access
- create landmark contrast
- keep combat silhouettes readable

### Mood safely

Dramatic lighting, fog, rain, ash, smoke, particles, and night settings are allowed when:

```text
[ ] enemy silhouettes remain visible
[ ] objectives remain readable
[ ] route hierarchy survives
[ ] VFX does not blend into atmosphere
[ ] team colors/status cues remain clear
[ ] performance remains stable
```

### Dark maps and red/black palettes

Dark, red, black, smoky, or high-contrast palettes are high risk in competitive play because they can absorb silhouettes and enemy VFX. Use them as bounded mood zones, events, or carefully controlled areas unless the entire game is built around that readability system.

### Atmosphere budget

Atmosphere is a lower-priority effect than combat VFX. It should never visually compete with:

- enemy outlines/silhouettes
- projectiles
- objective markers
- ultimate effects
- sniper sightlines
- route/cover reads

---

## 8. Material and shape language

### Stylized material rules

Materials should be broad and legible:

- clean large planes
- readable bevels/edges
- simplified texture
- controlled wear
- distinct material families
- no photoreal noise maps that fight hero silhouettes

### Architecture rules

Architecture should balance:

```text
real-world reference + stylized simplification + gameplay affordance + futuristic/brand/world twist
```

Avoid copying real streets so literally that gameplay routes and cover become muddy.

### Prop density

Prop detail should be densest where it does not harm combat:

- spawn rooms
- safe corners
- off-route storytelling areas
- vertical background
- close-up hero select/event spaces

Combat-critical lanes and objectives need stricter density control.

### Shape language by space

| Space type | Shape / art approach |
|---|---|
| Main lane | clear directional architecture, readable cover rhythm |
| Flank | narrower, distinct material/lighting, identifiable entrance/exit |
| Objective | strong central composition, low clutter, readable boundary |
| High ground | edge silhouettes, vertical access cues, visible support structures |
| Spawn | rich story and personality, safe complexity |
| Choke | controlled detail, clear sightline/cover, strong contrast |
| Long sightline | simple background, low obstruction, strong endpoint read |

---

## 9. Hero readability against the world

Maps must be designed around hero visibility.

### Background contrast

Test heroes against:

- bright walls
- dark interiors
- saturated signs
- foliage
- snow/sand/stone/wood/metal
- high-detail prop clusters
- ability-heavy areas
- team-color-adjacent materials

### Hero visibility rules

- Avoid background values that swallow common hero silhouettes.
- Avoid excessive edge detail directly behind common sightlines.
- Avoid map colors that mimic critical VFX/team colors in combat zones.
- Keep player-height backgrounds simpler than high/background set dressing.
- Use lighting gradients to separate play plane from background plane.

### Sightline backing

Important sightlines should have clean visual backing. A sniper lane with a noisy neon wall behind the target is harder to read than a lane with restrained value and shape behind enemy silhouettes.

---

## 10. Dynamic environment and interactables

Dynamic elements can make the world feel alive, but they must be hierarchy-safe.

### Allowed dynamic elements

- weather
- fog
- cloth
- particles
- moving props
- sequenced events
- destructibles
- environmental hazards
- animated signage
- distant vehicles/crowds

### Dynamic element rules

```text
[ ] Does not obscure combat-critical sightlines.
[ ] Does not mimic ability VFX.
[ ] Does not mislead players about cover/collision.
[ ] Does not create unfair visibility differences.
[ ] Has clear state if it affects gameplay.
[ ] Can be toned down if it becomes clutter.
```

### Destructibles

Destructibles are best when they add delight without confusing combat:

- breakable arcade machine spawns prizes
- fire extinguisher moves/reacts
- bottles/glass break in safe areas
- market props react but do not alter core cover unless designed as gameplay

If destruction changes gameplay, it must be obvious before and after destruction.

---

## 11. Cultural/geographic reference

Overwatch-class maps often feel like stylized postcards of real places: grounded in reference, amplified by optimism and design clarity.

### Research process

Use:

- real-world photography
- local architecture references
- urban layout patterns
- material/color studies
- signage/typography references
- cultural consultation when appropriate
- historical and contemporary context
- gameplay blockout constraints

### Translation process

```text
reference → playable blockout → landmark plan → material palette → stylized simplification → story props → polish
```

### Avoid

- theme park stereotypes
- random cultural props
- unreadable authentic clutter
- copying real street layouts that do not serve the mode
- signs/text as the only local identity
- flattening a culture into one color palette

---

## 12. Review templates

### Map art brief

```markdown
# Map Art Brief

## Mode and Gameplay
- Mode:
- Objective behavior:
- Team flow:
- Primary fight ranges:
- Required symmetry/fairness constraints:

## Layout Read
- Main lanes:
- Flanks:
- High ground:
- Chokes:
- Cover classes:
- Spawn/objective travel concerns:

## Visual Identity
- Location/reference:
- Core fantasy:
- Landmarks:
- District/local callouts:
- Architecture shape language:
- Material palette:

## Lighting / Atmosphere
- Global time/mood:
- Navigation lighting:
- Combat visibility constraints:
- Dynamic atmosphere budget:

## Hero Visibility
- High-risk backgrounds:
- Color collisions:
- Sightline backing:
- VFX conflict areas:

## Story / Props
- Critical interactables:
- Local storytelling props:
- Destructibles:
- Deco density plan:

## Risks
- Fairness risks:
- Navigation risks:
- Readability risks:
- Performance risks:
```

### Environment review pass

```text
[ ] Can a new player identify the objective direction?
[ ] Can an experienced player call out locations verbally?
[ ] Are main/flank/support routes visually distinct?
[ ] Does cover read correctly?
[ ] Is high ground readable and reachable?
[ ] Do heroes remain visible against common backgrounds?
[ ] Does lighting help navigation?
[ ] Does atmosphere stay below combat VFX priority?
[ ] Does prop density respect combat zones?
[ ] Does the map feel like a place, not just an arena skin?
```

---

## 13. Common failure modes

### 13.1 Screenshot map

Symptoms:

- beautiful vistas
- weak route hierarchy
- poor objective read
- confusing combat spaces

Fix:

- return to mode/blockout read
- strengthen landmarks/routes
- simplify combat backgrounds
- validate in motion

### 13.2 Wallpaper detail

Symptoms:

- every surface detailed equally
- no rest areas
- hero silhouettes lost
- prop clutter everywhere

Fix:

- reduce player-height background detail
- create big material/value masses
- move story detail into safe zones
- preserve clean sightline backing

### 13.3 Authentic but unplayable

Symptoms:

- real-world reference copied too literally
- route affordances unclear
- cover sizes inconsistent
- visual complexity uncontrolled

Fix:

- stylize and simplify reference
- prioritize gameplay affordance
- use landmarks and lighting to guide

### 13.4 Mode mismatch

Symptoms:

- deathmatch-like layout for objective mode
- payload route lacks main path read
- symmetric mode has unfair visual clarity

Fix:

- re-art around mode constraints
- audit spawn/objective timing and local identity
- tune visual hierarchy per route

### 13.5 Mood kills visibility

Symptoms:

- fog/smoke hides enemies
- dark palette absorbs silhouettes
- particles compete with VFX
- saturated signs mimic ability colors

Fix:

- reduce atmosphere in combat zones
- simplify backgrounds behind sightlines
- adjust lighting separation
- reserve high saturation for landmarks or non-combat areas

---

## 14. Final checklist

```text
[ ] Map art supports the mode.
[ ] Objective/read direction is clear.
[ ] Main routes, flanks, cover, and high ground are visually distinct.
[ ] Combat spaces support intended ranges.
[ ] Landmarks are memorable and callout-friendly.
[ ] Lighting helps navigation and visibility.
[ ] Atmosphere does not compete with combat signals.
[ ] Heroes remain readable against all major backgrounds.
[ ] Prop density respects gameplay hierarchy.
[ ] Destructibles/interactables are clear and non-misleading.
[ ] Cultural/geographic reference is researched and stylized for play.
[ ] The map feels like a believable place and a readable sport space.
```
