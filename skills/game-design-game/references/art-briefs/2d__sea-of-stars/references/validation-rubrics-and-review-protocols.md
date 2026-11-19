# Validation Rubrics and Review Protocols

Read this reference when reviewing, approving, rejecting, scoring, or giving fix notes on Sea-of-Stars character sprites, tilemaps, animation, lighting/FX, scenes, or automated pipeline output.

## Table of Contents

1. Review philosophy
2. Pass/fail gates vs scored heuristics
3. Review order
4. Character rubric
5. World/tilemap rubric
6. Animation rubric
7. Lighting/FX rubric
8. Pipeline output rubric
9. Test scenes and review boards
10. Approval language
11. Fix prioritization
12. Common review mistakes
13. Final review checklist

---

## 1. Review Philosophy

The goal of review is not to describe preferences. It is to protect the art target.

Core sentence:

> Review fundamentals before polish: readability, silhouette/path, identity, grounding, traversal, motion, and scene integration must pass before style detail matters.

A good review is:

- specific
- prioritized
- tied to the quality bar
- actionable
- honest about blockers
- aware of source asset vs runtime presentation

A bad review is:

- vibes-only
- detail-first
- overly polite while missing blockers
- overly rigid about heuristics
- focused on enlarged previews
- blind to gameplay scale

---

## 2. Pass/Fail Gates vs Scored Heuristics

Not every rule has equal authority.

### Hard pass/fail gates

An asset cannot pass if these fail:

```text
character silhouette read
character identity anchor read
sprite grounding / contact
world walkable path read
world traversal affordance read
player readability in scene
animation foot/contact integrity
no literal cloning / asset copying
no blurred source sprite silhouette
required technical format validity
```

### Scored heuristics

These can be graded and improved:

```text
palette elegance
cluster quality
material richness
secondary animation charm
lighting mood
prop density
tile variation
color temperature nuance
```

### Review implication

Do not give a high score to an asset that fails a hard gate because it has good polish.

---

## 3. Review Order

Use this order to avoid being seduced by detail.

### Character review order

```text
1. gameplay-scale read
2. flat silhouette
3. body type / role match
4. identity anchor
5. dominant color/value
6. face/hands/feet/gesture
7. cluster/palette/ramp quality
8. outline quality
9. animation/grounding
10. scene integration
```

### World review order

```text
1. walkable path
2. blockers/collision
3. traversal affordances
4. player readability
5. interactable privilege
6. depth planes/occlusion
7. composition/landmark
8. material grammar
9. texture/clutter/tile variation
10. lighting/FX integration
```

### Animation review order

```text
1. playback at gameplay scale
2. contacts/feet
3. body weight/bob
4. arm/leg opposition
5. silhouette stability
6. secondary overlap
7. shadow stability
8. personality polish
```

---

## 4. Character Rubric

Score each category 0–4. Hard gates marked `GATE` cannot be compensated by other categories.

| Category | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| GATE: Silhouette | unreadable | generic blob | partial role read | clear role read | iconic and memorable |
| GATE: Identity anchor | absent | tiny/detail-dependent | visible but weak | clear in most views | unmistakable in all views |
| Body type | accidental | inconsistent | acceptable | role-supportive | role-defining |
| Proportions | realistic/mushy | weak chibi | acceptable | charming/readable | exceptional toy-like read |
| Dominant color | muddy | unclear | present | strong | instantly recognizable |
| Face/focal marks | noisy/misaligned | too small | acceptable | clean | expressive with minimal pixels |
| Hands/feet/gesture | lost | weak | acceptable | readable | expressive and grounded |
| Palette/ramps | random/muddy | fragmented | acceptable | controlled | elegant and efficient |
| Cluster quality | noise | over-rendered | functional | authored | masterful form/material clusters |
| Outline | black sticker | inconsistent | acceptable | local/weighted | invisible sophistication |
| Grounding | floats | weak | acceptable | planted | weighty and integrated |
| Direction consistency | different character | major drift | minor drift | stable | seamless all-around design |

### Character pass threshold

Suggested:

```text
All gates >= 3
Average non-gate score >= 3
No category below 2 unless explicitly exempted
```

For hero/main cast:

```text
All gates = 4 preferred
Average non-gate score >= 3.5
```

---

## 5. World / Tilemap Rubric

| Category | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| GATE: Walkable path | unclear | confusing | acceptable | clear | elegant guidance |
| GATE: Traversal read | absent | misleading | acceptable | clear | intuitive and delightful |
| GATE: Player readability | player lost | weak | acceptable | reliable | excellent across scene |
| Blockers/collision | misleading | inconsistent | acceptable | clear | visually trustworthy |
| Interactable privilege | buried | weak | acceptable | clear | compositionally excellent |
| Depth planes | flat | partial | acceptable | layered | rich, readable space |
| Composition/landmark | none | weak | functional | strong | memorable and directed |
| Material grammar | random | noisy | acceptable | distinct | rich and disciplined |
| Texture control | soup | busy | acceptable | restrained | premium detail hierarchy |
| Tile variation | obvious repeats | some repeats | acceptable | controlled | invisible system quality |
| Biome identity | generic | weak | acceptable | distinct | instantly memorable |
| Prop/clutter hierarchy | cluttered | distracting | acceptable | organized | world-building without noise |

### World pass threshold

Suggested:

```text
All gates >= 3
Composition/landmark >= 3 for important areas
Material grammar >= 3 for shipped biomes
No false affordance on critical path
```

---

## 6. Animation Rubric

| Category | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| GATE: Foot/contact integrity | sliding/floating | weak contacts | acceptable | planted | excellent weight/contact |
| GATE: Playback read | unreadable | confusing | acceptable | clear | charming and clear |
| Body weight/bob | absent/wrong | weak | acceptable | good | role-specific and polished |
| Arm/leg opposition | absent | inconsistent | acceptable | clear | expressive and economical |
| Silhouette stability | collapses | jitters | acceptable | stable | motion enhances silhouette |
| Secondary overlap | absent/noisy | weak | acceptable | good lag | high-authorship charm |
| Shadow stability | absent/flicker | weak | acceptable | grounding | excellent integration |
| Direction consistency | broken | drift | acceptable | stable | seamless set |
| Personality | generic | weak | acceptable | roleful | memorable motion signature |

### Animation pass threshold

```text
All gates >= 3
No foot sliding
No random jitter
Playback approved at gameplay scale
```

---

## 7. Lighting / FX Rubric

| Category | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| GATE: Sprite readability | lost | weak | acceptable | clear | excellent in all states |
| GATE: Path/interactable readability | obscured | weak | acceptable | clear | enhanced by lighting |
| Contact shadow | absent | weak | acceptable | grounding | elegant and stable |
| Dynamic light coherence | contradictory | muddy | acceptable | coherent | rich and controlled |
| Depth/atmosphere | flat/confusing | weak | acceptable | layered | premium scene depth |
| FX style cohesion | clashes | noisy | acceptable | coherent | distinctive and tasteful |
| Water/glow/weather | distracting | weak | acceptable | supportive | mood-rich and readable |
| Palette preservation | muddy | inconsistent | acceptable | stable | enhances palette identity |
| Occlusion/sorting | broken | popping | acceptable | predictable | invisible integration |

### Presentation pass threshold

```text
All gates >= 3
No blurred source sprite silhouette
No FX rescue of failed base asset
No lighting state makes player untrackable
```

---

## 8. Pipeline Output Rubric

| Category | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Semantic interpretation | none | weak | partial | clear | robust and role-aware |
| Source stylization | literal render | weak | acceptable | stylized | art-directed transformation |
| Silhouette compiler | absent | weak | acceptable | clear | excellent design shaping |
| Cluster pass | filter noise | weak | acceptable | authored | highly intentional |
| Palette/ramp pass | random | fragmented | acceptable | controlled | elegant and role-aware |
| Animation semantics | none | interpolation | acceptable | contact-aware | expressive and validated |
| Metadata integration | absent | inconsistent | partial | coherent | production-ready |
| Validation architecture | syntax only | shallow | acceptable | mixed gates | robust art+machine review |
| Scene testing | absent | minimal | partial | representative | comprehensive stress matrix |

### Pipeline pass threshold

```text
Semantic stages present
Stop rules implemented
Human review gates defined
Machine checks do not pretend to replace art direction
```

---

## 9. Test Scenes and Review Boards

### Character board

Create a review board with:

```text
transparent sheet
flat silhouette row
25% scale preview
grayscale preview
front/back/side stills
per-direction GIFs
bright grass scene
dark cave scene
warm interior scene
cool moonlight scene
dense town scene
water-edge scene
```

### World board

Create a review board with:

```text
full scene screenshot
collision/walkability overlay
traversal overlay
interactable overlay
player positions across surfaces
squint/blur preview
grayscale preview
lighting variants
```

### Animation board

Create a review board with:

```text
sprite sheet
per-direction loops
loop over grid floor
loop in representative scene
slow-motion playback
contact-point marks if debugging
```

### Pipeline board

Create a review board with:

```text
source input
semantic parse labels
stylized silhouette intermediate
cluster/palette intermediate
final output
validation report
representative scene test
known failure notes
```

---

## 10. Approval Language

Use crisp approval states.

### Approved

Use only when all hard gates pass and polish is acceptable.

```text
Approved. The asset passes gameplay-scale read, silhouette/path gate, identity/traversal gate, and in-scene integration. Remaining notes are polish-level.
```

### Approved with notes

Use when gates pass but polish improvements remain.

```text
Approved with notes. No blocker remains. Improve [specific category] in the next polish pass.
```

### Blocked

Use when a hard gate fails.

```text
Blocked. Do not polish forward. The blocker is [silhouette/path/contact/etc.]. Fix [specific root cause], then rerun [validation test].
```

### Rework direction

Use for broad failures.

```text
Rework direction. The asset is solving the wrong problem: [render fidelity/detail/texture] instead of [readability/identity/path]. Restart from [silhouette/path/semantic brief] before detail.
```

### Needs context

Use when asset cannot be judged in isolation.

```text
Needs context. The isolated preview is insufficient; review in [test scene/animation/runtime lighting] before approval.
```

---

## 11. Fix Prioritization

Prioritize fixes by dependency order.

### Character fix order

```text
1. silhouette/body type
2. identity anchor
3. proportions/hands/feet
4. dominant color/value
5. cluster/ramp cleanup
6. outline treatment
7. animation/contact
8. scene integration polish
```

### World fix order

```text
1. path/walkability read
2. blockers/traversal read
3. player readability
4. interactable hierarchy
5. depth/composition
6. material grammar
7. texture/clutter variation
8. lighting/FX polish
```

### Animation fix order

```text
1. frame semantics
2. foot/contact locking
3. body weight/bob
4. arm opposition
5. silhouette stability
6. secondary overlap
7. timing personality
8. polish pixels
```

### Pipeline fix order

```text
1. add missing semantic stage
2. add stop rules
3. fix source stylization
4. fix cluster/palette pass
5. add scene validation
6. add deterministic checks
7. polish performance/export details
```

---

## 12. Common Review Mistakes

### Reviewing enlarged only

Damage: micro-detail looks better than it will in game.

Correction: always review gameplay scale first.

### Praising effort instead of read

Damage: noisy/detailed work escapes critique.

Correction: tie praise and critique to hierarchy, not labor.

### Treating heuristics as laws

Damage: good exceptions get rejected; mediocre compliant assets pass.

Correction: label hard gates vs heuristics.

### Ignoring runtime context

Damage: sprites pass on transparency but fail in scenes.

Correction: require scene integration tests.

### Polishing past blockers

Damage: time is spent on colors/detail while silhouette/path/contact fails.

Correction: enforce stop rules.

### Letting metrics overrule taste

Damage: assets pass palette/dimension checks but feel cheap.

Correction: machine gates are necessary but not sufficient.

---

## 13. Final Review Checklist

```text
[ ] Reviewed at gameplay scale first
[ ] Hard gates identified before polish notes
[ ] Source asset separated from runtime presentation
[ ] Character silhouette/identity or world path/traversal tested
[ ] Player readability tested in representative scenes
[ ] Animation reviewed as playback when applicable
[ ] Palette/cluster feedback is specific, not generic
[ ] Notes are prioritized by dependency order
[ ] Approval state is explicit: approved, approved with notes, blocked, rework, or needs context
[ ] Fix notes name the validation test to rerun
[ ] No literal cloning or asset-copying requested or approved
```
