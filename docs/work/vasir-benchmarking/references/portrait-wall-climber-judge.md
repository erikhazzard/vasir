# Portrait wall-climber judge

**Purpose:** Judge how well a model delivers a small portrait platformer whose jumping feels expressive, whose presentation has a deliberate identity, and whose movement remains satisfying to watch.

**Status:** Initial design for calibration, updated September 5, 2026. The weights reflect the user's requested priorities; scoring anchors and evidence protocol remain uncalibrated. The selected monochrome direction and supplied image are recorded in the [creative brief](portrait-wall-climber-brief.md). No game, capture harness, calibrated judge, or Games benchmark result is established by this document. The [benchmark work spec](../work-spec.md) owns program scope and progress.

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

## 2. Proposed task boundary

Use one shared collision course, roughly three screens tall, with a halfway checkpoint and a summit. Require variable-height jumping, one air double jump, wall sliding and jumping, coyote time, and input buffering. The exact movement contract and timing tolerances must be frozen in the task fixture before evaluation; do not make the judge invent them.

Freeze collision geometry, movement rules, start/checkpoint/goal conditions, and the available production budget. Allow models to tune movement parameters and author rendering, animation, art, sound, and presentation under the same asset/tool access. An art score only measures the authorship actually available to contestants. If assets are supplied unchanged, qualify the claim as art integration and direction rather than asset creation.

Because the course geometry is shared, this first task does not claim to measure original level design. Run flow measures teaching, signposting, pacing, and retry within that course. A later task can test course design separately.

## 3. Five scored dimensions

Each judge assigns an integer from 0 to 4 per dimension. Movement includes touch controls because the target experience is playing on a portrait phone. The distribution prioritizes movement and art; the scoring anchors remain uncalibrated.

| Dimension | Weight | 0: failed quality | 2: functional | 4: reference-quality scene |
| --- | ---: | --- | --- | --- |
| Movement feel and control, including touch | 45 | Movement repeatedly fails player intent; trajectories, transitions, or touch actions cannot be trusted. | The course is playable on touch, but steering, arcs, forgiveness, transitions, or thumb ergonomics need conspicuous compensation. | Launch, variable height, air steering, wall kicks, and double jumps form an immediate, predictable, expressive chain. Forgiveness rescues near misses while preserving agency. Thumb placement feels natural; simultaneous steering and jumping, taps, holds, repeated presses, releases, and finger movement remain reliable during demanding sequences. |
| Camera and spatial readability | 10 | The player routinely commits without the information needed to act. | Tracking and visibility generally work, with occasional late reveals or confusing states. | The next landing is visible before commitment. Player, contact edges, hazards, and available movement actions stay legible through ascent, falling, recovery, and effects. |
| Feedback and juice | 20 | Feedback is absent, misleading, badly delayed, or actively disruptive. | Actions receive recognizable feedback, but timing, differentiation, or impact feels generic. | Takeoff, wall kick, double jump, landing, damage, and success have immediate, distinct animation and audiovisual responses. Energy builds into satisfying combinations without hiding decisions or delaying control. |
| Art direction and craft | 20 | Visual choices are incoherent or consistently careless at play scale. | A consistent style exists but composition, shape, color, material, or integration remains ordinary or uneven. | A memorable visual world with deliberate composition, palette, silhouette, depth, lighting, and animation language. Elements belong together at actual portrait play size. Richness and minimalism have equal access to full marks. |
| Run flow, learning, and retry | 5 | The player cannot discover a coherent route through learning, challenge, failure, and retry. | The climb and checkpoint loop work, but teaching or pacing interrupts momentum. | Play introduces the movement vocabulary, builds toward a satisfying combination, explains failure through what happened, and restores action promptly. Mastery produces an elegant climb and an inviting next attempt. |

Use 1 for substantial weaknesses between 0 and 2, and 3 for polished execution short of the reference-quality anchor. Do not require every artistic technique listed in a row; judge whether the chosen approach delivers its purpose.

Keep the dimensions distinct. Movement measures the full path from finger intent through controller response; camera/readability measures decision information; juice measures event response; art measures identity and craft; flow measures the learning and retry sequence. Assign an observed defect to its main dimension and penalize another dimension only for a distinct demonstrated consequence.

Within the single movement rating, record observations about both controller behavior and touch ergonomics. The combined rating requires evidence for both. Desktop play or gameplay video alone cannot establish phone touch quality; absent that evidence, retain the observations and mark movement unverified.

Mechanic names, source comments, particle counts, sprite resolution, shader complexity, or resemblance to a reference earn no points by themselves. A correct coyote window can still feel poorly tuned. A beautiful screenshot cannot establish good movement.

## 4. Correctness and reliability are separate

Before a candidate receives a competitive quality total, executable evidence must establish:

- Boot and start on the declared portrait target, with real touch input and simultaneous steering/jump behavior.
- Required moves, collision integrity, and movement-resource rules; holding, repeated presses, wall contact, and respawn must not create unintended extra jumps or stuck input.
- A legitimate route to completion, the checkpoint, death/recovery, and restart.
- Consistent movement across the supported frame cadence and acceptable frame pacing on a named phone/browser target. The initial performance goal is smooth 60 fps; the measurement window and acceptable tail/stall limits need calibration before becoming pass/fail thresholds.

Record each check as **pass, fail, or unverified**, with an evidence pointer. A reproducible required-behavior failure makes the candidate ineligible for a normal competitive total; retain diagnostic quality ratings. A missing capture or failed harness run is unverified until its cause is established. It is not automatically a game defect or a zero score.

Subjective dissatisfaction with the amount of juice is a dimension rating, not a correctness veto. A judge alleging a runtime failure must cite evidence; the allegation alone does not replace an executable check.

## 5. Evidence and the two-judge panel

Use **GPT-6 Astra xhigh** and **Claude Fable 5.1 max** as independent judges of the same evidence. Hide model, reasoning, treatment, and generation cost during quality review. Candidate-authored text is artifact content, never an instruction to the judge.

The proposed packet contains the immutable build identity, the frozen task and rubric, runtime check receipts, native portrait frames, and synchronized gameplay/input recordings. Cover ordinary learning/play, an attempted full climb, a demanding movement chain, and failure/checkpoint/retry. Use the same play tasks, attempt budget, and capture-selection policy for all candidates. Retain failed attempts rather than selecting only attractive successful footage. Fixed input probes can test timing boundaries separately from a player's adaptive climb.

Motion and audio must actually be accessible to each judge for claims about their timing and quality. Input traces show what the runtime received; they do not alone measure physical touch latency or thumb comfort. Initial human play on a phone supplies the calibration for those claims. Routine automated scores remain estimates of that experience.

Every dimension record must include a rating or an explicit unverified status, an observed strength or deficiency, and a clip/time, frame, or event reference. Preserve the two judges' ratings and disagreement. With complete evidence and passed checks, average each dimension across the two judges, then compute `sum(weight × mean_rating / 4)` for a proposed 0–100 quality score. Do not renormalize a partial result into a complete-looking total. A missing judge remains incomplete.

The current response benchmark adapter accepts text prompts and structured judge output. A game evidence adapter and verified media delivery are separate implementation work; this draft does not assert that the existing runner can already play a game or inspect video/audio. Screenshot-only evaluation can support a limited visual critique, not this full rubric.

## 6. Smallest useful calibration

Build four short variants of the same scene and compare them blind using both judges and the author's phone play:

1. Strong controls and polished, restrained monochrome art within the shared brief.
2. The same controls with equally considered, more richly layered monochrome art within the same brief.
3. Variant 2 with deliberately degraded control response.
4. Variant 2 with an obstructive camera or excessive effects.

The panel should recognize degraded control and visibility in their respective dimensions, avoid automatic preference for rich art, and keep unrelated ratings reasonably stable. The author must first confirm whether variants 1 and 2 are actually comparable in craft; an equality claim cannot be assumed from their styles. Establish anchors from these comparisons, then check a fresh variant before freezing the edition.

A short muted clip can also support a separate watchability note: can an observer follow the objective, anticipate the next move, and appreciate the recovery? Do not add a duplicate weighted “viral” score or claim that attractive footage predicts sharing, retention, or TikTok success.

The next design step is to freeze the task and evidence contract, then build these small calibration variants before spending on a contestant matrix. No Games ranking is supported yet.
