# Animation and Motion Quality Bar

Read this reference when directing, critiquing, generating, or validating overworld walk cycles, idle cycles, NPC motion, enemy overworld motion, prop motion, and animation polish for premium 2D RPG pixel art.

## Table of Contents

1. Quality definition
2. Animation read hierarchy
3. Motion principles for tiny sprites
4. Walk cycle contract
5. Walk cycle frame semantics
6. Direction-specific animation notes
7. Idle animation
8. Hair, cloth, prop, and accessory overlap
9. Grounding, feet, and shadow
10. Timing, cadence, and personality
11. Animation constraints for automated pipelines
12. Animation prompt/spec template
13. Common failure modes
14. Animation approval checklist

---

## 1. Quality Definition

A premium overworld sprite must feel authored in motion. A still frame can be beautiful and still fail if the cycle slides, floats, puppets, or moves all parts equally.

Core sentence:

> A Sea-of-Stars animation passes when contact, weight, timing, opposition, overlap, and shadow all support the character's role at gameplay scale.

Animation should communicate:

- physical grounding
- personality
- direction
- state/intent
- material behavior
- charm

It should not communicate:

- mechanical interpolation
- frame morphing
- arbitrary jitter
- ungrounded float
- paper-doll limb swings

---

## 2. Animation Read Hierarchy

Evaluate animation in this order:

```text
1. feet / contact points
2. body weight and vertical rhythm
3. direction of travel
4. arm/leg opposition
5. head stability and appeal
6. hair/cloth/prop overlap
7. secondary accents
8. decorative flicker
```

Do not approve an animation because secondary details look lively if the feet slide or the body has no weight.

---

## 3. Motion Principles for Tiny Sprites

Tiny sprites need exaggerated clarity, not realistic subtlety.

### Principle A — Contacts drive everything

For walking, feet/contact frames are the structural truth. If contacts are wrong, every other flourish is wasted.

### Principle B — Body moves as a hierarchy

Not every part should move equally. Motion should cascade:

```text
feet/contact → hips/body mass → arms → head settle → hair/cloth/prop lag
```

### Principle C — Pixel animation is pose design

Small sprites often cannot afford smooth in-betweening. They need clear pose grammar.

Good:

```text
contact pose clearly lower and wider
passing pose clearly taller and centered
```

Bad:

```text
four barely different frames with foot smearing
```

### Principle D — The silhouette must survive motion

Animation should enrich the silhouette, not erode it.

Failure:

- arms disappear into torso
- hair becomes noisy flicker
- prop tangents body
- feet merge with shadow

---

## 4. Walk Cycle Contract

A standard top-down/overworld walk cycle should use four semantic slots per direction unless the project declares another convention.

```text
Frame 0: contact-right
Frame 1: center/pass A
Frame 2: contact-left
Frame 3: center/pass B
```

Recommended sheet row order when using a 4x4 sheet:

```text
Row 0: front
Row 1: back
Row 2: left
Row 3: right
```

### Required walk signals

```text
[ ] contact frames show one foot forward / one back or clear equivalent
[ ] contact frames sit slightly lower or wider
[ ] passing frames sit slightly higher or more centered
[ ] arms oppose legs when visible
[ ] hair/cloth/prop lags by one beat where appropriate
[ ] shadow persists and supports contact
[ ] left/right timing is consistent
[ ] front/back rhythm is consistent
```

### Optional personality signals

```text
light bounce for cheerful/young
heavy downbeat for stocky/armored
small glide for elegant/mage
wide stomp for warrior
quick tight cadence for agile scout
swaying accessory for merchant/elder/cozy NPC
```

---

## 5. Walk Cycle Frame Semantics

### Frame 0 — Contact Right

Intent: right-side step contact or first major contact beat.

Expected cues:

```text
right foot forward / dominant contact
opposite arm forward when visible
body slightly lower than passing frame
shadow slightly fuller or contact-weighted
hair/cloth trailing previous motion
```

### Frame 1 — Center / Passing A

Intent: body passes over support.

Expected cues:

```text
feet closer to neutral
body at highest or most centered point
arms closer to neutral
hair/cloth catching up
silhouette compact but not dead
```

### Frame 2 — Contact Left

Intent: mirrored contact beat.

Expected cues:

```text
left foot forward / opposite contact
opposite arm forward
body slightly lower than passing frame
hair/cloth trailing opposite direction
shadow consistent with grounding
```

### Frame 3 — Center / Passing B

Intent: second passing beat, not a duplicate error.

Expected cues:

```text
similar height to frame 1
small variation if needed to avoid robotic loop
arms close to neutral
hair/cloth catching up
```

### Contact vs passing contrast

A good 4-frame walk is not four arbitrary frames. It is two contacts and two passes.

If frame 1 and frame 3 are identical, that can be acceptable for simple sprites, but high-end sprites often benefit from tiny asymmetry in hair, hands, or cloth.

---

## 6. Direction-Specific Animation Notes

### Front walk

Most readable elements:

- feet alternating below torso
- hands/arms swinging around side of body
- torso bob
- head stability
- hair bounce

Risks:

- legs hidden under torso
- arms merging into clothing
- face bobbing too much
- feet sliding sideways

### Back walk

Most readable elements:

- back hair/headgear rhythm
- shoulder/arm alternation
- feet alternating below cloak/torso
- backpack/cape movement

Risks:

- back view becomes empty
- hair/helmet shape does not animate
- arms invisible
- cloak hides all foot contact

### Side walk

Most readable elements:

- front/back foot separation
- arm swing in profile
- head/torso forward lean if appropriate
- prop silhouette

Risks:

- one-pixel foot flicker
- body morphs instead of steps
- arm tangents with torso
- side silhouette collapses into vertical stick

### Diagonal / 8-direction, if used

If the project uses 8-direction motion, diagonal frames must not be lazy blends. Diagonal direction needs:

```text
[ ] clear foot contact
[ ] torso orientation readable
[ ] face/head angle stable
[ ] identity anchor still visible
[ ] not a stretched side/front hybrid
```

---

## 7. Idle Animation

Idle motion should make the character feel alive without breaking silhouette or distracting from gameplay.

### Acceptable idle ingredients

```text
subtle breathing
slight hair/cloth drift
tiny blink
weight shift
hand/finger accent for expressive NPCs
prop bob or sway
rare posture settle
```

### Idle timing guidance

- shorter loops can feel mechanical
- longer loops can feel authored but cost more
- offset secondary motion from body motion
- use holds; do not animate every frame equally

### Idle risks

```text
constant bounce that feels hyperactive
hair flicker that reads as artifact
breathing that distorts body shape too much
blink that becomes the only readable expression
prop motion that distracts from player control
```

### Player vs NPC idle

Player idles should be readable but not distracting. NPC idles can carry more personality if they do not clutter the scene.

---

## 8. Hair, Cloth, Prop, and Accessory Overlap

Secondary motion sells authorship.

### Overlap rule

The primary body moves first. Secondary elements follow.

```text
body shifts → hair/cloth/prop trails → secondary catches up → settles
```

### One-slot lag heuristic

For 4-frame walks, hair/cape/scarf often works well with a one-frame or one-beat lag relative to torso direction.

This is a heuristic, not a law. Use it when it improves charm and does not confuse silhouette.

### Material-specific motion

| Material | Motion feel |
|---|---|
| Short hair | small bounce, minimal lag |
| Long hair | visible delayed swing, grouped mass |
| Cape/cloak | broad delayed wave, not noisy fringe |
| Scarf | stronger trailing curve, clear silhouette |
| Backpack | small weight shift, not floppy |
| Metal armor | reduced secondary motion, heavier body beat |
| Staff/weapon | stable grip; slight arc or bob |

### Avoid

- every hair strand moving independently
- cape edge flicker
- prop drifting away from hand
- accessory motion stronger than body motion
- secondary motion that changes identity anchor unpredictably

---

## 9. Grounding, Feet, and Shadow

Grounding is the non-negotiable pass/fail criterion for walk animation.

### Feet rules

```text
[ ] contact foot stays visually planted for its beat
[ ] feet do not slide relative to ground in preview
[ ] contact pose has readable foot spread
[ ] side foot does not disappear into one-pixel noise
[ ] front/back foot alternation is clear enough for scale
```

### Shadow rules

```text
[ ] shadow exists in every grounded frame
[ ] shadow remains centered enough to anchor
[ ] shadow subtly responds to vertical bob if useful
[ ] shadow does not flicker or resize wildly
[ ] shadow does not hide feet
```

### Bob rules

A subtle vertical bob helps weight, but excessive bob feels bouncy or cartoonish.

Guidance:

```text
contact frames: slightly lower / heavier
passing frames: slightly higher / lighter
```

For heavy characters, emphasize downbeat. For elegant characters, reduce bob and use smoother silhouette shifts.

---

## 10. Timing, Cadence, and Personality

Animation timing should support character role.

### Cadence examples

| Character type | Timing feel | Motion notes |
|---|---|---|
| Young agile hero | light, crisp | clear bob, responsive arms, small hair bounce |
| Stocky guard | slower, heavier | stronger downbeat, broader stance, reduced hair/cloth motion |
| Mage / noble | controlled, gliding | subtle bob, robe/cape lag, vertical poise |
| Merchant / elder | cozy, uneven | mild sway, shorter steps, prop/hat accent |
| Creature mascot | species-specific | tail/ears/wings can carry rhythm |

### Holds matter

Do not fill every moment with equal change. A strong pose can hold for readability.

### Avoid mechanical loops

A technically looping animation can still feel dead if:

- every frame has same amount of motion
- body has no contact/pass contrast
- secondary elements move in sync with torso
- cycle has no personality

---

## 11. Animation Constraints for Automated Pipelines

Automated pipelines tend to create motion interpolation, not animation design. Correct this with semantic stages.

### Required semantic outputs

```text
pose labels: contact-right, pass-A, contact-left, pass-B
foot contact masks or contact intent
body vertical offset per frame
arm opposition intent
secondary lag channels: hair, cloth, prop
shadow footprint per frame
direction consistency metadata
```

### Pipeline gates

```text
[ ] frame labels are semantically correct
[ ] contact frames are visibly lower/wider than pass frames
[ ] foot positions do not slide in animation preview
[ ] character height/color remains consistent across frames
[ ] secondary motion lags rather than mirrors body
[ ] sprite sheet passes both static and GIF review
```

### Automation warning

Do not validate animation only by measuring frame differences. A bad cycle can have differences; a good cycle has intentional differences.

### Preview requirement

Every generated sheet must be reviewed as:

```text
sheet grid
per-direction GIF
in-scene movement loop
scaled-down gameplay preview
```

---

## 12. Animation Prompt / Spec Template

Use this when producing animation direction.

```markdown
## Animation Spec — [Character / State]

### Purpose
- State:
- Direction count:
- Frame count:
- Gameplay speed:
- Personality:

### Motion Hierarchy
1. Feet/contact:
2. Body bob/weight:
3. Arms:
4. Head:
5. Hair/cloth/prop:
6. Shadow:

### Frame Semantics
- Frame 0:
- Frame 1:
- Frame 2:
- Frame 3:

### Style Constraints
- Pixel clusters:
- Silhouette preservation:
- Palette consistency:
- Outline consistency:

### Failure Avoidance
- No foot sliding
- No equal movement everywhere
- No frame morphing
- No shadow flicker
- No silhouette collapse

### Validation
- Sheet check:
- GIF check:
- In-scene movement check:
- Reduced-scale check:
```

### Prompt phrases

Useful:

```text
clear contact and passing poses, planted feet, subtle vertical bob,
arms oppose legs, one-beat hair/cape lag, stable head, grounded shadow,
authored 4-frame overworld walk, readable in front/back/side directions,
no foot sliding, no puppet interpolation, no random jitter
```

---

## 13. Common Failure Modes

### Too Static

Symptoms:

- no bob
- no arm swing
- hair/cloth rigid
- frames barely differ

Fix:

- strengthen contact/pass contrast
- add opposition
- add restrained overlap
- tune shadow to support weight

### Foot Sliding

Symptoms:

- contact foot moves while supposedly planted
- feet drift relative to ground
- side view glides

Fix:

- lock contact foot for beat
- make pass frame transition clearer
- preview on a grid or test floor

### Puppet Motion

Symptoms:

- limbs rotate mechanically
- every part moves the same amount
- no weight transfer

Fix:

- drive motion from feet/hips
- reduce symmetrical limb movement
- add held poses and secondary lag

### Jitter Instead of Animation

Symptoms:

- pixels flicker randomly
- outline changes between frames
- color clusters shift without purpose

Fix:

- stabilize silhouette and ramps
- animate masses, not noise
- remove orphan pixels

### Over-Animated

Symptoms:

- idle constantly distracts
- hair/cape dominates read
- player sprite feels bouncy or unserious

Fix:

- reduce amplitude
- add holds
- subordinate secondary motion
- protect silhouette

---

## 14. Animation Approval Checklist

```text
[ ] animation reviewed as playback, not only as sheet
[ ] contacts and passing frames are semantically clear
[ ] feet feel planted; no sliding
[ ] body has appropriate vertical/weight rhythm
[ ] arms oppose legs when visible
[ ] head remains stable and appealing
[ ] hair/cloth/prop follows with lag where appropriate
[ ] shadow anchors all grounded frames
[ ] silhouette remains readable throughout loop
[ ] palette and outline remain consistent frame-to-frame
[ ] direction cycles feel like same character
[ ] timing supports body type/personality
[ ] no random pixel jitter
[ ] no excessive secondary motion
[ ] in-scene preview passes at gameplay scale
```
