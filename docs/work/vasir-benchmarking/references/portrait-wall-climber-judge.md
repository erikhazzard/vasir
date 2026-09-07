# Portrait wall-climber judge

**Purpose:** Judge how well a model delivers a small portrait platformer whose jumping feels expressive, whose presentation has a deliberate identity, and whose movement remains satisfying to watch.

**Status:** Human calibration anchors, September 5, 2026. The user's played **C** build remains the frozen comparison; their later C/C+, B/B+, B-ish, B+ / A− and latest **solid A− / borderline A** assessments record further calibration. The latest judgment applies to revision7, after the weight-and-place repair. These judgments concern the reviewed builds, not an unreviewed current candidate. The A/S thresholds below are proposals to test, not an established scientific calibration or a Games benchmark result. The weights retain the user's priorities. The selected monochrome direction and supplied image are recorded in the [creative brief](portrait-wall-climber-brief.md). The [benchmark work spec](../work-spec.md) owns program scope and progress.

## 1. The quality bar

Target one excellent 30–45 second climb: wall kick, steer, late double jump, precise landing, immediate launch. The player can understand the next move, trust the controls, recover from a mistake, and improve the next attempt. Scope stays small enough to judge execution closely.

Use different references for different qualities. These are selected design anchors, not a claim of an objective ranking among commercial games.

| Reference | What it anchors | Limit of the comparison |
| --- | --- | --- |
| [Celeste](https://www.celestegame.com/) | Precise, expressive movement with forgiveness that serves player intent. Its creator's [forgiveness breakdown](https://www.maddymakesgames.com/articles/celeste_and_forgiveness/index.html) explains coyote time, jump buffering, apex behavior, and corner correction. | The task does not require Celeste's dash, stamina system, or campaign. |
| [Super Meat Boy, original](https://store.steampowered.com/app/40800/Super_Meat_Boy/) | Wall-jump rhythm, momentum, and the desire to retry a difficult sequence. | Use as a movement and mastery reference; a mobile game must establish its own touch quality. |
| [Leap Day](https://apps.apple.com/us/app/leap-day/id1083451870) | A direct reference for a platformer designed around portrait presentation and simple touch input. | Its one-touch control scheme differs from the proposed steering-plus-jump scheme. |
| [Sea of Stars](https://seaofstarsgame.co/) | Rich pixel craft, controlled palette, lighting, materials, and environmental depth. | An art reference, not the wall-climber's mechanical template. |
| [LIMBO](https://playdead.com/games/limbo/) | Silhouette, composition, atmosphere, negative space, and visual coherence. | Its restrained movement and pacing do not set the desired energetic controller bar. |

The user's supplied Sea of Stars image demonstrates richly articulated stone and crystal forms against a controlled purple-blue environment. The supplied LIMBO image demonstrates a strong focal hierarchy with very little color or surface detail. Both are valid top-tier art anchors. The images establish visual references; they do not establish animation, responsiveness, or touch feel.

“S-tier” here means reference-quality execution within the submitted small scene. It does not mean matching a commercial game's content volume. Art style is a choice; **art direction and craft** are what receive a score. Minimal silhouettes, rich pixel art, or another coherent visual language can all earn full marks. The references are standards of execution, not mandatory themes or assets.

The primary fantasy is **being a small, elastic soot creature whose climb feels alive and whose danger is readable in time to act**. Atmospheric scenery and functioning mechanics support that fantasy; neither establishes that it has been delivered.

### The frozen C anchor

The user's played Ash & Echo build is the C anchor. Their feedback identifies insufficient contrast, spikes that are hard to see, confusion about repeated deaths, and a character needing substantially more juice. The requested “10–20×” expresses the scale of the desired improvement; it is not a particle, animation, or asset-count target. Preserve the build and [calibration diagnosis](../ash-and-echo/c-calibration.md) for comparison:

```text
renderer.js 619b3ce45d491cbb86c6a1732f6146de98823bf5a0d23184137408e900a9ce60
main.js     8cb7ffbdf5360a7a9118814318abf1fa2d0f69881caf76798ef4a03adaa8537d
game.js     a3cf01f9268624c4172dd01c04091f71b050fb2a9264bfa38cc9394692eefd92
```

The [earlier visual review](../ash-and-echo/evidence/final-visual-review.md) is historical evidence of judge overconfidence: it awarded observed readability 4/4 and visual feedback 3/4 and recommended handoff. Those readiness judgments are superseded by the user's C calibration. Keep its runtime receipts and frames within their actual scope. A successful route establishes reachability; it does not establish that a newcomer can distinguish lethal objects before committing. Missing phone/audio evidence does not explain away the user's experienced visual failures.

### The subsequent C− art-direction anchor

After the danger/character revision, the author called the game “MUCH better” but rated its environmental art direction approximately **C−**, supplying a second LIMBO frame as a depth reference. Preserve this as a separate visual calibration; do not infer new movement or juice ratings from it. The scene had detailed generated stone, distant towers, fog and parallax, yet still read as sharp repeated platforms over a uniformly bright scenic plate. Prior A-candidate visual recommendations did not predict this judgment.

For the chosen atmospheric Gothic direction, evaluate spatial composition in actual play: broad overlapping masses, a coherent place for the light, readable differences in scale and focus, and scenery that remains convincing through camera movement. Layer counts, blur, asset detail and separate scroll factors do not establish depth. Preserve the improved thorn/body visibility through any darker or denser composition. This anchor evaluates the promised layered direction; other deliberate art styles remain valid under the general craft rubric. The [depth evidence packet](../ash-and-echo/evidence/revision-3/README.md) retains the comparison and subsequent repair.

### The subsequent C/C+ environmental anchor

The user's next visual assessment was **C/C+**, supported by LIMBO and current-game screenshots showing clipped free platforms, detached chains, a gateway with a competing material treatment, weak separation between middle architecture and pale air, and an oversized red warning banner. This supersedes the [previous depth review's](../ash-and-echo/evidence/revision-3/final-depth-review.md) recommendation of “no mandatory further environmental repair.” Preserve that recommendation as a calibration miss, alongside its valid runtime evidence; it does not remain the acceptance judgment.

Judge whether the objects form one convincing place before rewarding their detail: complete exposed silhouettes, supported attachments, coherent materials, distinct spatial masses, and warning UI that belongs to the scene. Each plainly visible failure can independently prevent a high art rating, even when the route plays correctly. Relative improvement, generated-asset count, parallax count, and successful traversal do not prove reference-quality art or S. A local repair closes its named finding; it does not award a higher grade.

### The B-ish living-world anchor

The creator subsequently rated the charcoal environment B and character/juice B+, then rated the first shader revision’s environment **B-ish**. A preceding model recommendation of A− did not predict that human experience. No fresh character number was supplied with the latest B-ish feedback. Preserve the full [process history](../ash-and-echo/process-log.md) and the exact reviewed build at `tmp/ash-and-echo/living-world-pass/bish-baseline/`; do not average these grades or infer a weighted total.

For this ash/Gothic direction, time and causality are part of art direction. The latest human critique identifies blurred architecture, scarcely visible fog motion, camera-bound birds, static suspended stones/chains/cages/bells, an unresponsive peripheral spider, ambiguous near shapes and a character insufficiently expressive of ash. A shader, spring or animation in source is not proof that its intended effect reaches the player.

Add stationary → approach → action → recovery sequences to the native-size development review. Before inspecting implementation, describe what changes while the player is still, what responds to contact or proximity, what visibly supports each hanging object, and whether distinct distances stay recognizable during camera motion. For the character, describe the material and force implied by the silhouette at normal speed. Symmetrical fragments that read as bat wings do not establish an ash transformation. A technically reactive spider hidden in dark stone does not close a visibility complaint. Final destinations should create a discernible composition/lighting progression rather than repeat the middle of the climb.

These are direction-specific perceptual probes under the existing weights, not additional weighted dimensions or requirements that every game implement reactive spiders or fog. A repair closes its named failure; high grades still require the complete scene to sustain the reference bar. Record an informed model opinion separately from human acceptance, and never promote visual or reachability evidence into a complete movement/touch score.

### The B+ / A− weight-and-place anchor

The creator’s next response rates revision6 **B+ / A−**, “MUCH better,” while still finding weak foreground, buildings that terminate like pasted images and chain/world response far below the desired strength. Do not assign separate movement or character numbers from this overall statement. Preserve [revision6](../ash-and-echo/evidence/revision-6/README.md) and its later human anchor in the [process log](../ash-and-echo/process-log.md).

Inspect the full exposed contour and support relationship through motion: removing a crop can simply reveal a rectangular cache end elsewhere, and fading rubble feet does not turn a ground-level ruin into a continuous cathedral. Judge whether contact response has perceptible amplitude and time structure at native size. A fast chain wave invisible during an ordinary landing is not equivalent to visible load/recoil even if mathematically implemented. “10×” asks for a much stronger experience, not ten times every parameter. Keep instantaneous control, coherent materials and danger clarity while amplifying it.

### The solid A− / borderline A anchor

The creator subsequently rates revision7 **solid A−, borderline A** and asks how to reach S. This is an overall human quality anchor, not a scored five-dimension result. Preserve its [reviewed build](../ash-and-echo/evidence/revision-7/README.md) and the [strategic proposal](../ash-and-echo/process-log.md). The creator approved that proposal, and [revision8](../ash-and-echo/evidence/revision-8/README.md) now implements an authored opening, coordinated contact response and spatial variation. Its independent play/art reviews prompted a steadier landing camera and visible light on the resting stone; its tests and ordinary-input recordings are supporting evidence. It has no new human grade or full competitive score. The revised development course must be frozen separately before any shared-course benchmark uses it. Existing dimension weights and S floors remain unchanged; do not promote the qualitative A−/A statement into numeric sub-scores.

## 2. Proposed task boundary

Use one shared collision course, roughly three screens tall, with a halfway checkpoint and a summit. Require variable-height jumping, one air double jump, wall sliding and jumping, coyote time, and input buffering. The exact movement contract and timing tolerances must be frozen in the task fixture before evaluation; do not make the judge invent them.

Freeze collision geometry, movement rules, start/checkpoint/goal conditions, and the available production budget. Allow models to tune movement parameters and author rendering, animation, art, sound, and presentation under the same asset/tool access. An art score only measures the authorship actually available to contestants. If assets are supplied unchanged, qualify the claim as art integration and direction rather than asset creation.

Because the course geometry is shared, this first task does not claim to measure original level design. Run flow measures teaching, signposting, pacing, and retry within that course. A later task can test course design separately.

## 3. Five scored dimensions

Each judge assigns an integer from 0 to 4 per dimension. Movement includes touch controls because the target experience is playing on a portrait phone. The C anchor constrains interpretation of the scale; higher anchors still require validation.

| Dimension | Weight | 0: failed quality | 2: functional | 4: reference-quality scene |
| --- | ---: | --- | --- | --- |
| Movement feel and control, including touch | 45 | Movement repeatedly fails player intent; trajectories, transitions, or touch actions cannot be trusted. | The course is playable on touch, but steering, arcs, forgiveness, transitions, or thumb ergonomics need conspicuous compensation. | Launch, variable height, air steering, wall kicks, and double jumps form an immediate, predictable, expressive chain. Forgiveness rescues near misses while preserving agency. Thumb placement feels natural; simultaneous steering and jumping, taps, holds, repeated presses, releases, and finger movement remain reliable during demanding sequences. |
| Camera and spatial readability | 10 | The player routinely commits without the information needed to act; lethal objects blend into decoration or contacts. | Tracking and landing visibility generally work, but danger recognition or contact states remain uncertain. | An unprimed player identifies safe contacts and lethal shapes before commitment, including beside dark walls and during effects. The next landing, player body, and available movement actions remain legible through ascent, falling, and recovery. |
| Feedback and juice | 20 | Feedback is absent, misleading, badly delayed, or actively disruptive; the hero scarcely responds to its own actions. | Actions have cues, but the hero remains stiff or responses feel generic; trails and bursts carry more expression than the body. | At normal speed the hero's body, pose, timing, and follow-through make launch, apex, reversal, wall brace, kick, double jump, landing, and death distinct and satisfying. Audiovisual responses reinforce force, intent, contact, and recovery without hiding decisions or delaying control. |
| Art direction and craft | 20 | Visual choices are incoherent or consistently careless at play scale. | A consistent style exists but composition, silhouette, value separation, material, or integration remains ordinary or uneven. | A memorable world whose composition, values, silhouette, depth, lighting, and animation language serve active play. The creature, safe contacts, lethal hazards, and decoration have distinct visual roles at native portrait size. Richness and minimalism have equal access to full marks. |
| Run flow, learning, and retry | 5 | The player cannot discover a coherent route through learning, challenge, failure, and retry. | The climb and checkpoint loop work, but teaching, unexplained mistakes, or pacing interrupts momentum. | Play introduces the movement vocabulary, builds toward a satisfying combination, makes the cause of a mistake understandable without outside explanation, and restores action promptly. The player can change the next attempt for a reason. Mastery produces an elegant climb and an inviting retry. |

Use 1 for substantial weaknesses between 0 and 2, and 3 for polished execution short of the reference-quality anchor. Do not require every artistic technique listed in a row; judge whether the chosen approach delivers its purpose.

Keep the dimensions distinct. Movement measures the full path from finger intent through controller response; camera/readability measures decision information; juice measures event response; art measures identity and craft; flow measures the learning and retry sequence. Assign an observed defect to its main dimension and penalize another dimension only for a distinct demonstrated consequence.

Within the single movement rating, record observations about both controller behavior and touch ergonomics. The combined rating requires evidence for both. Desktop play or gameplay video alone cannot establish phone touch quality; absent that evidence, retain the observations and mark movement unverified.

Mechanic names, source comments, particle counts, asset quantity or resolution, shader complexity, frame rate, or resemblance to a reference earn no quality points by themselves. A correct coyote window can still feel poorly tuned. Smooth frame pacing can display a stiff character. A beautiful screenshot cannot establish good movement. Presence of stretch, dust, a ring, or a sound does not establish its perceptual strength, timing, or usefulness. Source-aware autoplayer success and slowed or enlarged action frames cannot substitute for ordinary-speed perception at play scale.

### Quality ceilings and proposed letter anchors

Apply ceilings after considering the dimensions. They prevent a high weighted average from concealing failure of the primary fantasy; they are quality judgments, not allegations of runtime bugs. Record each gate as **pass, fail, or unverified** with evidence. An unverified gate does not prove failure, but cannot support an A/S claim.

| Gate or anchor | Decision rule |
| --- | --- |
| Danger comprehension | **At most C** when a representative lethal encounter remains ambiguous before commitment or the player cannot explain its resulting death and a plausible correction from play. Clear landing edges alone do not pass. A single execution mistake after correctly identifying danger is not a failure of this gate. |
| Living character | **At most B** when hazard comprehension passes but repeated normal-speed traversal still looks essentially as stiff or generic as the C hero. Extra scenery, trails, flashes, or particles cannot lift this ceiling. Visual feedback cannot rate above 2 while this condition persists. |
| Environmental craft | **Art cannot rate above 2** while a plainly visible exposed asset crop, floating attachment, unintended material mismatch, collapsed spatial value planes, or visually intrusive warning UI remains. Any one is sufficient; no gameplay obstruction is required. Judge against the chosen visual language at native mobile and the supported desktop raster scale. |
| A: excellent small scene | All three gates pass. Fresh independent reviewers find a material improvement over C in matched normal-speed action sequences and first-play cause/recovery. The character itself carries expressive force and distinct actions through ordinary traversal, and no recurring hazard confusion remains. With complete formal evidence: total **at least 85/100**, each judge rates movement, juice, art, and readability **at least 3**, and flow **at least 2**. |
| S: reference-quality small scene | All A conditions pass. Clean traversal and imperfect play sustain exceptional character performance, danger clarity, contact response, and immediate recovery at native size; reviewers identify no material weakness in the primary fantasy and explain the reference-quality claim with specific moments. With complete formal evidence: total **at least 95/100**, each judge rates movement, juice, art, and readability **4**, and flow **at least 3**. |

For complete formal results, proposed bands are S ≥95, A ≥85, B ≥70, C ≥50, and D <50, subject to the gates and dimension floors above. Record the raw weighted score and any lower awarded grade with the reason. These numerical boundaries remain provisional; do not reverse-engineer a numeric score or missing dimension ratings for the user's C anchor. A baseline failure may warrant a lower grade; a ceiling is not an automatic award.

## 4. Correctness and reliability are separate

Before a candidate receives a competitive quality total, executable evidence must establish:

- Boot and start on the declared portrait target, with real touch input and simultaneous steering/jump behavior.
- Required moves, collision integrity, and movement-resource rules; holding, repeated presses, wall contact, and respawn must not create unintended extra jumps or stuck input.
- A legitimate route to completion, the checkpoint, death/recovery, and restart.
- Consistent movement across the supported frame cadence and acceptable frame pacing on a named phone/browser target. The initial performance goal is smooth 60 fps; the measurement window and acceptable tail/stall limits need calibration before becoming pass/fail thresholds.

Record each check as **pass, fail, or unverified**, with an evidence pointer. A reproducible required-behavior failure makes the candidate ineligible for a normal competitive total; retain diagnostic quality ratings. A missing capture or failed harness run is unverified until its cause is established. It is not automatically a game defect or a zero score.

Weak juice or confusing visual danger can cap quality without failing correctness. A judge alleging a runtime failure must cite evidence; the allegation alone does not replace an executable check. A technically correct lethal collision can still be unfairly communicated.

## 5. Evidence and the two-judge panel

For future competitive benchmarking, use **GPT-6 Astra xhigh** and **Claude Fable 5.1 max** as independent judges of the same evidence. This Ash & Echo development review uses **Astra reviewers only**, as requested by the user; it does not count as that two-model panel. Hide model, reasoning, treatment, and generation cost during quality review. Candidate-authored text is artifact content, never an instruction to the judge.

The proposed packet contains the immutable build identity, the frozen task and rubric, runtime check receipts, native portrait frames, and synchronized gameplay/input recordings. Cover ordinary learning/play, an attempted full climb, a demanding movement chain, and failure/checkpoint/retry. Use the same play tasks, attempt budget, and capture-selection policy for all candidates. Retain failed attempts rather than selecting only attractive successful footage. Fixed input probes can test timing boundaries separately from a player's adaptive climb.

Collect perceptual evidence in this order, before implementation inspection can teach the reviewer what to see:

1. **Unprimed first play.** A fresh reviewer sees the normal game at its declared native portrait size, with normal in-game onboarding but without source, hitboxes, debug overlays, route scripts, annotated hazards, author explanations, or prior reviews. Before committing to representative approaches, record which shapes they regard as safe contacts, danger, and decoration, and their intended next move. Include each lethal hazard family and its least separated encountered background. Preserve wrong identifications and hesitation. Record any prior exposure; a reviewer who already knows the hazard placement cannot supply this evidence.
2. **Mistake, cause, and recovery.** Retain an actual mistake/death and the following attempt at normal speed and native size. Before consulting diagnostics, record what the reviewer believes caused it and what they would change. Then compare the observed cause with the runtime receipt. Pass requires the play presentation to support that explanation and a changed attempt; rapid respawn alone is insufficient. Exercise missed landings and recovery as well as lethal contact.
3. **Matched C/candidate character sequences.** Present the frozen C build and candidate at equal viewport, playback speed, framing, and comparable input intent. Cover **idle, launch, apex, reversal, wall brace, wall kick, double jump, landing, and death**, with uninterrupted traversal as well as event context. Use the same input sequence where applicable; qualify differences if tuning changes the resulting path. Record what the body and silhouette communicate at ordinary speed before inspecting slow motion or close-ups. Compare response strength, anticipation where it preserves control, compression/extension, contact, directional follow-through, and recovery as means to expression, not as an animation checklist. Both failed and successful sequences count.
4. **Diagnostics and scoring.** Only now inspect source, collision overlays, event labels, and route automation to resolve factual questions. Each reviewer independently records gate outcomes, ratings, and specific comparative reasons before reading another verdict. Failed perceptual evidence remains evidence even when the diagnostics show correct mechanics.

For development captures, use the C packet's **390×844 CSS-pixel portrait viewport** as the matched comparison size and report DPR and input device. Preserve original native-size material. Also inspect environmental source adequacy at the supplied desktop scale: approximately **982 raster pixels across the stage**, reproducible with roughly **491 CSS pixels at DPR2**. Record actual CSS bounds, DPR, and crop width; a wide desktop screenshot containing a small DPR1 stage does not exercise this case. Inspect free-platform ends, wall/chain joints, the middle structure, the portal, and death UI at both scales. Soft distance must retain deliberate contours; enlarging a reduced cache into visible blocks or mud is not atmospheric depth. These art checks supplement native motion evidence and physical phone validation. If tooling cannot provide unprimed interaction, record the missing proof and retain a bounded estimate rather than presenting an informed route demonstration as first play.

Motion and audio must actually be accessible to each judge for claims about their timing and quality. Input traces show what the runtime received; they do not alone measure physical touch latency or thumb comfort. Initial human play on a phone supplies the calibration for those claims. Routine automated scores remain estimates of that experience.

Every dimension record must include a rating or an explicit unverified status, an observed strength or deficiency, and a clip/time, frame, or event reference. Preserve the two judges' ratings and disagreement. With complete evidence and passed checks, average each dimension across the two judges, then compute `sum(weight × mean_rating / 4)` for a proposed 0–100 quality score. Do not renormalize a partial result into a complete-looking total. A missing judge remains incomplete.

Always distinguish the **formal competitive result** from the **developer quality estimate**. An incomplete phone/audio/panel packet leaves the formal total unknown. It does not require silence about visible quality: state the best-supported developer letter estimate or ceiling, its observed scope, gate outcomes, confidence, and the next evidence that could change it. For example: “Developer C: lethal objects were mistaken for decoration and deaths remained unexplained; full competitive total unknown.” If only the visual experience supports an A estimate, say so explicitly; do not call the whole game A. Do not bury an observed C-level failure beneath a generic “unverified” verdict or inflate the estimate to meet the requested target.

The current response benchmark adapter accepts text prompts and structured judge output. A game evidence adapter and verified media delivery are separate implementation work; this draft does not assert that the existing runner can already play a game or inspect video/audio. Screenshot-only evaluation can support a limited visual critique, not this full rubric.

## 6. Next calibration work

The human C anchor and subsequent environmental ratings correct optimistic assessments; they do not establish inter-rater reliability, a universally calibrated letter scale, or proven A/S anchors. Freeze C unchanged and retain the latest C/C+ art calibration alongside it. Review the next candidate using the protocol above, then test the proposed A/S rules against the user's play. Keep the user's actual grade, reviewer predictions, disagreements, and reasons; do not relabel the anchors or lower the bar to claim progress.

Build four short variants of the same scene and compare them blind using both judges and the author's phone play:

1. Strong controls and polished, restrained monochrome art within the shared brief.
2. The same controls with equally considered, more richly layered monochrome art within the same brief.
3. Variant 2 with deliberately degraded control response.
4. Variant 2 with an obstructive camera or excessive effects.

The panel should recognize degraded control and visibility in their respective dimensions, avoid automatic preference for rich art, and keep unrelated ratings reasonably stable. The author must first confirm whether variants 1 and 2 are actually comparable in craft; an equality claim cannot be assumed from their styles. Establish anchors from these comparisons, then check a fresh variant before freezing the edition.

A short muted clip can also support a separate watchability note: can an observer follow the objective, anticipate the next move, and appreciate the recovery? Do not add a duplicate weighted “viral” score or claim that attractive footage predicts sharing, retention, or TikTok success.

Before spending on a contestant matrix, validate higher anchors and the discriminating variants above, then freeze the task and evidence contract. No Games ranking is supported yet.
