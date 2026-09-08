# Active-Play Visual Review

Use this reference when judging whether a playable game looks, moves, and reads as one authored experience during play. It owns the art diagnosis; `$game__orchestrating-playable-build` owns the integrated critique, repair, and replay loop. For response timing, material motion, and interruption, use `$game__adding-juice`.

## Contents

- [Core principle](#core-principle)
- [Material to inspect](#material-to-inspect)
- [First read](#first-read-before-source-inspection)
- [Judgment areas](#judgment-areas)
- [Verdicts](#review-verdicts)
- [Core-loop emphasis](#core-loop-emphasis)
- [Report](#report)

## Core Principle

Judge the decision, its visible consequence, and the return to the next decision. A beautiful still can conceal disconnected material, dead transitions, unreadable consequences, or monotonous ordinary play. A deliberately still board can be excellent. The question is:

```text
Can I tell what matters, what I can do, what changed when I acted, and how this
presentation supports the experience the game promises?
```

Agent judgments are scoped recommendations. Human acceptance, functional correctness, perceptual improvement, and closure of one finding are different claims. No screenshot or local finding closure establishes a whole-game S grade.

## Material To Inspect

Use the actual supported viewports and normal interactions. Include:

- active play at native scale, where focal identity and meaningful state can be judged;
- the presentation that exposed the complaint, including enlarged/Retina output if relevant;
- a before → input/choice → consequence → next-action sequence;
- ordinary repeated actions and relevant interruption/recovery, not only the rare showcase;
- several representative compositions or decision states across the affected loop when claiming a broad visual improvement;
- normal-speed motion when judging motion, VFX, camera, or changing material;
- the changed runtime workload when visual density or rendering work may harm feel.

Follow the project's platform contract. Test mobile when it is a target; desktop emulation does not establish physical-phone performance or comfort. A desktop-only, landscape, or XR brief is not required to pass an unrelated portrait composition.

A dialogue choice, management view, puzzle board, card hand, or planning screen may be the active play surface. Neither an avatar nor a threat is mandatory. Title, results, marketing, and asset-showroom frames cannot substitute for the active loop. Route their own polish to the shell or end-screen skill.

If evidence is insufficient for a motion claim, narrow the claim and obtain the missing sequence before judging it. A still can support a contour or palette finding; it cannot prove that a transformation feels alive. Enlarged body-only probes can diagnose a mask or material, but final character/actor claims need native full context. Record arranged setups or modified diagnostic rendering as such.

## First Read Before Source Inspection

Inspect the play material before reading implementation intent. Use the game's actual actor or decision object; “I am” may mean a commander, puzzle solver, driver, or reader rather than a visible body.

```text
Active-play read:
- My role / current focus:
- The decision or action available:
- What matters in this moment:
- How the presentation answers my action:
- What changed, and what I can do next:
- The strongest intended feeling:
- The biggest visible mismatch with the brief/reference:
- What makes continuation appealing or obstructs it:
```

A useful finding names a visible subject, relationship, and affected moment: “the card result fades before the next selection, losing which target changed,” or “the front pillar shares the rear fog's value and looks like a blurred patch.” “Needs more polish” and lists of missing shader features do not identify a repair.

## Judgment Areas

1. **Decision hierarchy**
   - Are the focal piece/avatar, relevant choices, state, and consequence distinguishable at actual scale?
   - Does priority adapt to the phase of play? A selected target or urgent cue may outrank the player.
   - Does the hierarchy survive dense states, effects, occlusion, and the next input?

2. **Relational authorship**
   - Do neighboring forms agree in scale, edge finish, material, light, and detail density?
   - Do exposed contours and attachments make sense for the fiction, or reveal placed-image boundaries?
   - In spatial games, do overlap, openings, and atmospheric order establish real separation? On boards, do grouping, ownership, and state layers do the corresponding job?
   - Read `relational-game-craft.md` when these relationships fail or when deciding whether depth/ambient motion belongs at all.

3. **Identity through change**
   - Does the focal actor/piece remain trackable through the actual transition?
   - Are ordinary and special states distinguishable without implementation labels?
   - If transformation is requested, does the identity-bearing form change with detached effects hidden?
   - Does released material retain its intended substance through the aftermath? Pass motion repairs to the juice specialist.

4. **Life, quiet, and sequence**
   - Does ambient life have independent timing and appropriate scale, rather than synchronized loops or accidental camera coupling?
   - Is a response staged where the player can perceive it during the ordinary route or interaction?
   - Are quiet inspection and recovery states deliberate? Does the affected loop have more than one repeated composition when variation is intended?
   - Does a large effect settle or hand off without masking the next decision?

5. **Interface and platform fit**
   - Are legal actions, state, controls, and meaningful text readable without covering what the player needs?
   - Do target size, input mapping, safe areas, contrast, and reduced-motion treatment suit the actual platform?
   - Does removing disruptive motion preserve the semantic distinctions?

6. **Runtime support**
   - Does the changed workload create visible jank, lag, or material instability?
   - Is the claimed experience sustained in the tested environment, rather than only captured at a favorable instant?
   - Keep frame pacing/resource evidence separate from visual taste and human feel.

## Review Verdicts

Retain the orchestrator's verdict vocabulary, scoped to the reviewed experience:

| Verdict | Art recommendation |
|---|---|
| `SLAPS` | The reviewed sequence is coherent, readable, and delivers its intended visual feeling; no concrete repair is identified within this scope. |
| `CLOSE` | Direction is coherent, but an observed visual mismatch still weakens the requested experience. |
| `DOES NOT SLAP` | The active moment is materially confusing, generic, incoherent, or unresponsive relative to the brief. |
| `BLOCKED` | The specific claim cannot be judged from the available or current material. |

Do not award `SLAPS` when the next decision is unintentionally obscured, incompatible materials read as accidental assembly, a motion claim relies only on stills, or only the showcase improves while the claimed ordinary loop remains weak. Interpret ambiguity and stillness against the brief; mystery and contemplation are not automatically defects.

A correct controller and a completed route cannot overrule a visible art failure. Conversely, a beautiful effect cannot overrule a broken action. Do not reduce accepted response strength merely because increased scale exposes a material defect; identify the failed relationship and preserve the successful part.

## Core-Loop Emphasis

| Loop | Prioritize in visual review |
|---|---|
| Action / platforming / physics | Actor location, action silhouette, meaningful surfaces, causal contact, hazards, material aftermath, next action. |
| Turn-based tactics / strategy | Selection, legal options, ownership, intent, causal resolution, stable resulting state. |
| Deckbuilder / card | Hand/read area, playability and targeting, resource changes, combo order, next choice. |
| Placement / abstract puzzle | Preview versus commitment, spatial legality, scoring cause, undo clarity, quiet thinking state. |
| Racing / sports | Course/field, participants, actionable trajectories, contact/recovery, anticipation of the next play. |
| Rhythm | Timing reference, approach lanes, cue distinction, accurate visible acknowledgment, next cue clarity. |
| Management / simulation | State density, ownership, causal change, inspection focus, ambient activity below decision data. |
| Narrative / social | Choice, relationship, tone, pacing, readable text/expression, intentional ambiguity. |
| Survivor / auto-battler | Actor/swarm separation, danger density, rewards, build expression, VFX occlusion. |
| Other / hybrid | Derive from the actual decisions and identify which phase governs each visual judgment. |

## Report

Keep only fields needed to support the recommendation; do not emit empty template sections.

```text
Active-play visual review:
- Scope, brief/reference, and reviewed build/material identity:
- Verdict and evidence limits:
- First active-play read:
- Biggest visible mismatch, with frame/sequence location:
- Relationship causing it and proposed repair:
- Successful qualities to preserve:
- Native and requested display/motion evidence:
- Relevant runtime support:
- Remaining uncertainty:
```

The orchestrator chooses and verifies the next integrated repair. This reference does not create a second approval workflow, require repeated human confirmation, or turn a local visual judgment into a release certification.
