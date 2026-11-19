# 07 — Pipeline, Validation, and Review Protocols

Use this reference for production workflows, art reviews, validation suites, audit rubrics, pipeline implications, and converting the Overwatch-class standard into repeatable gates.

## Table of Contents

1. Review philosophy
2. Production pipeline overview
3. Validation decks
4. Hero validation protocol
5. Skin validation protocol
6. VFX validation protocol
7. Map validation protocol
8. Animation/camera validation protocol
9. Scoring rubric
10. Audit output templates
11. Automation and machine-checkable helpers
12. Stop rules
13. Final master checklist

---

## 1. Review philosophy

The review standard is:

```text
approve only what works in gameplay conditions
```

Do not approve from:

- hero beauty renders alone
- skin concept art alone
- VFX clips on black background alone
- map screenshots alone
- animation playblasts without camera/context

Approve from:

- gameplay camera
- first-person and third-person views
- motion
- partial occlusion
- representative maps
- team-fight clutter
- skin variants
- platform/performance constraints
- spectator/replay views when relevant

The review order is:

```text
readability → identity → gameplay fairness → motion feel → world believability → premium detail → polish
```

---

## 2. Production pipeline overview

### New hero pipeline

```text
1. Gameplay role / kit verb
2. Roster gap and collision analysis
3. Archetype + personality thesis
4. Silhouette thumbnails
5. Weapon/tool exploration
6. Shape/color/material direction
7. In-game camera mockup
8. First-person weapon mockup
9. Animation/VFX needs pass
10. Skin future-proofing pass
11. Gameplay map visibility tests
12. Detail/render polish
13. Final validation deck
```

### Skin pipeline

```text
1. Hero identity anchor map
2. Theme fit and research
3. Risk-zone marking
4. Silhouette-safe concept thumbnails
5. Weapon/tool integration
6. Material/construction pass
7. First/third-person mockup
8. VFX/audio parity pass
9. Map visibility test
10. Premium detail pass
11. Fairness and performance validation
```

### VFX pipeline

```text
1. Ability function and criticality
2. Ownership/team-read definition
3. State grammar design
4. Shape/color/motion exploration
5. First-person target visibility test
6. Enemy third-person counterplay test
7. Team-fight stack test
8. Cosmetic variant parity pass
9. Spectator/replay test
10. Performance/opacity/duration tuning
```

### Map pipeline

```text
1. Mode and gameplay constraints
2. Blockout and combat-space tests
3. Lane/cover/verticality plan
4. Landmark/callout plan
5. Lighting/navigation plan
6. Reference and world identity pass
7. Hero visibility test
8. Deco/story density pass
9. Dynamic atmosphere/interactable pass
10. Full-match readability review
```

---

## 3. Validation decks

Create standardized review decks. Do not let every review invent new evidence.

### Hero deck

```text
front / side / back / 3/4 neutral render
black silhouette lineup
run silhouette lineup
weapon/tool silhouette
first-person view
third-person enemy view
ability pose thumbnails
skin-safe anchor map
bright/dark/busy map screenshots
team-fight screenshot/GIF
```

### Skin deck

```text
base vs skin side-by-side
silhouette overlay
motion pose comparison
weapon/tool comparison
first-person comparison
third-person enemy comparison
VFX/audio delta summary
map visibility matrix
hit-read/perceived bulk notes
premium close-up detail sheet
```

### VFX deck

```text
state sequence: anticipation/cast/active/impact/decay
self/ally/enemy views
team-color/ownership variants
bright/dark map variants
team-fight stack
spectator view
skin variant comparison
opacity/duration/coverage notes
```

### Map deck

```text
mode diagram
blockout vs arted comparison
lane/cover/verticality overlay
objective/callout landmark sheet
lighting plan
hero visibility screenshots
prop density map
dynamic atmosphere examples
full route flythrough or playtest clip
```

---

## 4. Hero validation protocol

### Test 1 — Silhouette ID

Show black silhouettes to reviewers.

Pass if:

- hero is recognized without color/face
- role/archetype is broadly understood
- weapon/tool read survives
- no roster collision dominates

### Test 2 — Motion ID

Show short black-shape locomotion and ability clips.

Pass if:

- hero remains identifiable
- motion personality reads
- ability intent reads
- weapon/tool source reads

### Test 3 — Camera ID

Review first-person, enemy third-person, ally, and spectator angles.

Pass if:

- player view is aim-safe
- enemy can identify threat/source
- ally can identify support/coordination signals
- spectator can follow the action

### Test 4 — Map visibility

Place hero in representative maps:

```text
bright exterior
dark interior
warm light
cool light
busy prop zone
high-saturation signage zone
heavy VFX fight
```

Pass if:

- silhouette separates from background
- color/value read survives
- weapon/tool remains visible
- role read remains clear

### Test 5 — Roster matrix

Compare against closest roster neighbors.

Pass if:

- silhouette anchors differ
- weapon/tool line differs
- posture differs
- motion differs
- color/material profile differs enough

---

## 5. Skin validation protocol

### Test 1 — Base identity overlay

Overlay skin silhouette with base silhouette.

Pass if:

- core identity anchors remain
- changes are intentional and not misleading
- weapon/tool line remains clear

### Test 2 — Enemy recognition

Show skin in enemy third-person camera during movement and abilities.

Pass if:

- hero ID is immediate
- ability ID is immediate
- no false hitbox/bulk read
- no excessive visibility advantage/disadvantage

### Test 3 — First-person usability

Pass if:

- weapon skin does not block aim
- charge/reload/state remains clear
- self VFX is not obstructive

### Test 4 — Variant parity

For customizable/mythic skins, compare all variants.

Pass if:

- none are materially easier/harder to see
- none alter perceived hitbox meaningfully
- none change enemy-facing VFX grammar
- none change audio detectability unfairly

### Test 5 — Theme/craft quality

Pass if:

- theme fits hero
- construction feels built/equipped
- close-up detail rewards ownership
- cultural references are researched and integrated respectfully

---

## 6. VFX validation protocol

### Test 1 — State readability

Review the effect frame-by-frame and in real time.

Pass if:

- anticipation is clear when needed
- active state is distinct
- impact/result is clear
- decay does not imply false danger

### Test 2 — Ownership clarity

Pass if:

- self/ally/enemy/neutral ownership is clear
- color is not the only cue
- team fight ownership remains legible

### Test 3 — Target visibility

Pass if:

- effect does not hide aim targets
- projectile trails do not create fog
- muzzle/impact does not obscure follow-up actions

### Test 4 — Stack test

Run multiple common effects together.

Pass if:

- critical signals rise above flavor
- ultimate/CC/area denial boundaries remain clear
- spectator view remains understandable

### Test 5 — Cosmetic parity

Pass if:

- base and variant are functionally recognizable
- enemies do not relearn projectile/ability/ultimate grammar
- premium fantasy does not create advantage/disadvantage

---

## 7. Map validation protocol

### Test 1 — New-player route read

Show a static and short movement clip to someone unfamiliar with the map.

Pass if they can identify:

- objective direction
- main path
- likely side path
- cover
- high ground or vertical route

### Test 2 — Experienced-player callouts

Ask experienced players to name locations after a short playtest.

Pass if:

- local landmarks are memorable
- callouts converge naturally
- districts/rooms are distinct

### Test 3 — Hero visibility

Place varied heroes/skins across common fight locations.

Pass if:

- heroes do not merge with backgrounds
- VFX colors do not collide with map palette
- sightline backings are controlled

### Test 4 — Mode integrity

Pass if:

- art supports mode constraints
- objective state remains readable
- route hierarchy matches intended strategy
- fairness is not altered by visual asymmetry

### Test 5 — Atmosphere budget

Pass if:

- fog/weather/particles do not hide threats
- mood remains subordinate to combat signals
- dynamic events do not confuse collision/cover

---

## 8. Animation/camera validation protocol

### Test 1 — Motion silhouette

Pass if:

- hero ID remains in black-shape locomotion
- ability poses are distinct
- role and personality read

### Test 2 — Timing alignment

Pass if:

- animation/VFX/audio/gameplay frames agree
- active windows are visually accurate
- recovery does not look active

### Test 3 — First-person comfort/usability

Pass if:

- weapon/VFX do not block aim
- camera motion does not harm control
- state feedback is clear
- effects are safe for prolonged play

### Test 4 — Skin animation compatibility

Pass if:

- no meaningful clipping in key poses
- attachments do not create false hitbox
- cast poses remain readable
- motion identity remains intact

---

## 9. Scoring rubric

Use this when a numerical score helps prioritize fixes. Scores are diagnostic, not a substitute for art direction.

| Category | Weight | 1 | 3 | 5 |
|---|---:|---|---|---|
| Gameplay read | 25 | confusing under pressure | readable in simple cases | readable under combat chaos |
| Identity | 20 | generic/colliding | recognizable with context | iconic and distinct |
| Role/kit communication | 15 | role unclear | broad role clear | kit verb and role readable |
| Fairness/parity | 15 | creates advantage/confusion | mostly safe | robust across skins/views |
| Stylized craft | 10 | noisy/realism soup | decent hierarchy | clean, appealing, authored |
| World believability | 5 | pasted/costume/theme park | plausible | specific and integrated |
| Motion/presentation | 5 | stiff or obstructive | serviceable | expressive and readable |
| Premium delight | 5 | little charm | some reward | high close-up and emotional appeal |

Interpretation:

```text
90–100: S-tier candidate; polish and edge-case review.
75–89: Strong but needs targeted fixes.
60–74: Promising but not production-safe.
<60: Rework from recognition contract.
```

Hard gates override scores. A beautiful 92 that creates cosmetic advantage still fails.

---

## 10. Audit output templates

### Hero audit

```markdown
# Hero Art Audit

## Verdict
[pass / revise / rework]

## Highest-Risk Failures
1. [issue] — [gameplay damage] — [fix]
2. [issue] — [gameplay damage] — [fix]
3. [issue] — [gameplay damage] — [fix]

## Identity Stack
- Silhouette:
- Posture:
- Weapon/tool:
- Color/value:
- Motion:
- Face/personality:
- Material/world logic:

## Roster Collision
- Closest collisions:
- Required differentiators:

## Action Plan
- Immediate shape changes:
- Camera tests:
- Animation/VFX needs:
- Polish after gates:
```

### Skin audit

```markdown
# Skin Audit

## Verdict
[pass / revise / rework]

## Parity Risks
- Silhouette:
- Weapon/tool:
- Animation/rig:
- VFX/audio:
- Visibility/fairness:

## Theme Quality
- Fit:
- Construction:
- Materials:
- Cultural/research notes:
- Premium value:

## Fixes
1. [must-fix]
2. [should-fix]
3. [polish]
```

### VFX audit

```markdown
# VFX Audit

## Verdict
[pass / revise / rework]

## Read Contract
- Owner:
- Function:
- Danger/support boundary:
- Timing:
- Counterplay:

## Failures
- Obstruction:
- Ambiguity:
- State mismatch:
- Cosmetic parity:
- Performance/noise:

## Fixes
- Shape:
- Color/value:
- Duration/opacity:
- Decay:
- View-specific tuning:
```

### Map audit

```markdown
# Map Art Audit

## Verdict
[pass / revise / rework]

## Mode Read
- Objective:
- Routes:
- Cover:
- High ground:
- Fight ranges:

## Visual Communication
- Landmarks:
- Lighting:
- Hero visibility:
- Prop density:
- Atmosphere:

## Gameplay Damage Risks
1. [issue] → [damage] → [fix]
2. [issue] → [damage] → [fix]
3. [issue] → [damage] → [fix]
```

---

## 11. Automation and machine-checkable helpers

Do not add validators by default. Use tools only for repeated brittle checks.

Useful automated helpers if the pipeline supports them:

### Silhouette comparison

- render black silhouettes for base/skin/roster
- compare outline overlap and unique protrusions
- flag large deviations in locked anchors

### Color/value visibility

- sample hero contrast against representative map backdrops
- flag low-contrast combinations
- test grayscale/value separation

### VFX coverage

- measure average/max screen coverage and opacity during effect lifetime
- flag long lingering high-opacity effects
- compare base vs cosmetic variant duration and footprint

### First-person obstruction

- estimate weapon/VFX coverage near aim center
- compare skin variants
- flag sustained obstruction during primary fire/ability use

### Map prop density

- heatmap player-height visual detail in combat zones
- flag high-detail backdrops behind common sightlines

### Caveat

Automation can catch risks. It cannot replace art judgment. A pass from a metric is not approval.

---

## 12. Stop rules

Stop and rework before polish if:

```text
[ ] hero/skin cannot be identified from silhouette and posture
[ ] new hero collides with existing roster identity
[ ] weapon/tool function is unclear in first or third person
[ ] ability VFX hides targets or has unclear active boundaries
[ ] cosmetic variant changes enemy-facing ability comprehension
[ ] map route/objective/cover/high-ground read is unclear
[ ] lighting/atmosphere reduces hero visibility
[ ] artifact only succeeds in beauty view, not gameplay view
```

Do not detail your way out of these failures.

---

## 13. Final master checklist

```text
[ ] Gameplay read defined before aesthetics.
[ ] Big shapes locked before micro-detail.
[ ] Identity stack explicit.
[ ] Roster collision reviewed.
[ ] Weapon/tool read validated.
[ ] Ability grammar and VFX criticality defined.
[ ] Skin/cosmetic parity enforced.
[ ] First-person and third-person views tested.
[ ] Map art supports mode, routes, cover, high ground, landmarks, and objective.
[ ] Lighting/atmosphere protects visibility and navigation.
[ ] Animation carries identity and timing.
[ ] Spectator/replay readability considered when relevant.
[ ] Platform/performance risks considered.
[ ] Premium detail added only after hard gates pass.
[ ] Final approval based on gameplay conditions, not beauty shots.
```
