# Platformer Onboarding Beat Canvas

## Table of Contents

- [1. Setup](#1-setup)
- [2. Onboarding Thesis](#2-onboarding-thesis)
- [3. Core Verbs and Model Updates](#3-core-verbs-and-model-updates)
- [4. Moment-by-Moment Beat Table](#4-moment-by-moment-beat-table)
- [5. Hypothesis-Control Map](#5-hypothesis-control-map)
- [6. Failure Pricing Plan](#6-failure-pricing-plan)
- [7. Mechanic-Theme Fusion](#7-mechanic-theme-fusion)
- [8. Instruction Layer Decision](#8-instruction-layer-decision)
- [9. First Real Choice / Agency Return](#9-first-real-choice--agency-return)
- [10. Playtest Questions](#10-playtest-questions)
- [11. Output Template](#11-output-template)

Use this reference when creating a new first level, first five/ten/fifteen minutes, or onboarding slice. It turns the skill's principles into a working design artifact.

Do not begin by listing controls. Begin by defining the player's model of the world and how that model changes beat by beat.

## 1. Setup

```text
Game / prototype:
Platformer type: 2D side-scroller | 3D platformer | precision platformer | action platformer | metroidvania | other
Camera model:
Player character fantasy:
Starting player assumptions:
Desired end-of-onboarding belief:
Core verbs to teach:
Core world rules to teach:
Emotional arc:
First real choice after onboarding:
```

## 2. Onboarding Thesis

Write one sentence:

```text
By the end of onboarding, the player should feel/know/want: ______________________
```

Good examples of shape:

- “By the end, the player should feel nimble but fragile, understand that walls are recoverable surfaces, and want to enter the ruins to earn stronger movement.”
- “By the end, the player should know that every enemy machine has an exploitable state, feel clever for repurposing one, and choose a first mission to acquire a missing traversal verb.”

Weak examples:

- “Teach movement and combat.”
- “Explain all controls.”
- “Introduce the story.”

## 3. Core Verbs and Model Updates

| Verb / system | Player's initial model | Desired model update | Safest first need | First optional reward | First pressure use |
|---|---|---|---|---|---|
| Move |  |  |  |  |  |
| Jump |  |  |  |  |  |
| Attack / tool |  |  |  |  |  |
| Recovery verb |  |  |  |  |  |
| New sequel verb |  |  |  |  |  |
| Progression system |  |  |  |  |  |

## 4. Moment-by-Moment Beat Table

Use this as the main artifact.

| Beat | Screen / space | Player model before | Situation design | Invited action | Feedback | Failure price | Model update | Next dependency |
|---|---|---|---|---|---|---|---|---|
| 0 | Pre-control identity |  |  |  |  | None |  |  |
| 1 | Safe first input |  |  |  |  | None |  |  |
| 2 | First low-stakes hazard |  |  |  |  | Minor |  |  |
| 3 | Verb disambiguation |  |  |  |  | Minor/moderate |  |  |
| 4 | First terrain commitment |  |  |  |  | Fair only if taught |  |  |
| 5 | Verb combination |  |  |  |  | Minor/moderate |  |  |
| 6 | World-rule expansion |  |  |  |  | Depends |  |  |
| 7 | Constrained discovery |  |  |  |  | Low |  |  |
| 8 | Optional reward |  |  |  |  | Low |  |  |
| 9 | Competence repetition |  |  |  |  | Moderate |  |  |
| 10 | Layered pressure |  |  |  |  | Fair challenge |  |  |
| 11 | Aspirational rupture |  |  |  |  | Scripted or safe |  |  |
| 12 | Agency return |  |  |  |  | None |  |  |

## 5. Hypothesis-Control Map

For every new mechanic, reduce noise until the correct experiment is likely.

| Mechanic / rule | Wrong hypotheses players may try | How the level narrows options | Observable clue | Correct experiment | Confirmation |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

Example pattern:

| Mechanic / rule | Wrong hypotheses players may try | How the level narrows options | Observable clue | Correct experiment | Confirmation |
|---|---|---|---|---|---|
| Wall-jump | Search for hidden exit; wait; shoot wall | Safe pit with only walls and no enemies | Wall-slide slows descent / dust effect | Jump while touching wall | Player climbs and escapes |

## 6. Failure Pricing Plan

| Beat / mechanic | First exposure price | Second exposure price | Pressure use price | Why fair? |
|---|---|---|---|---|
|  | Free / minor / setback / death / scripted |  |  |  |

Rules of thumb:

- First input should be free.
- First enemy contact should usually be minor damage.
- First lethal terrain should come after jump/recovery is established.
- First discovery trap should be safe.
- First scripted loss should follow real player agency.

## 7. Mechanic-Theme Fusion

| Mechanic / beat | What the player does | What the player feels | Theme/fantasy expressed | Future desire created |
|---|---|---|---|---|
|  |  |  |  |  |

A beat is strong when all columns align. If the story says “you are becoming powerful” but the mechanic is a generic pickup with no felt change, the beat is weak.

## 8. Instruction Layer Decision

For each concept, choose the lowest sufficient instruction layer.

| Concept | Geometry / composition | Enemy/object behavior | Camera/audio/animation | Reward placement | UI/text needed? | Why? |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |

Text is justified when the rule is invisible, inaccessible, ambiguous, or too costly to miss. Text is weak when it interrupts an obvious inference.

## 9. First Real Choice / Agency Return

If the onboarding leads to a boss select, hub, map, route split, loadout screen, or mission choice, define how the prologue changes the meaning of that choice.

```text
Choice shown:
What the player would think if shown immediately:
What the player thinks after onboarding:
Why the choice now matters:
Soft-authored first route, if any:
How the game preserves agency while still guiding:
```

S-tier pattern:

```text
Do not ask “where do you want to go?” before the player knows what they want.
First create desire, then return choice.
```

## 10. Playtest Questions

Ask these after a playable prototype:

- What did players try first when control began?
- Did players discover any mechanic without text? Which one?
- Where did players blame themselves versus blame the game?
- What was the first moment players felt clever?
- What was the first moment players felt powerful?
- What was the first moment players felt outmatched?
- Did the first major choice have emotional meaning?
- Did players know why they wanted the next upgrade, stage, or route?
- Which explicit prompts were still needed after level revisions?
- Which beat taught too many things at once?

## 11. Output Template

```markdown
# Onboarding Blueprint: [Game / Level]

## Onboarding Thesis
[One sentence.]

## Player Starting Model
[What the player likely believes before control.]

## Desired End Model
[What they should believe, feel, and want after onboarding.]

## Core Verbs / Systems
[Bullet list with model updates, not just controls.]

## Moment-by-Moment Beat Table
[Use the beat table.]

## Failure Pricing Plan
[Use the failure pricing table.]

## Mechanic-Theme Fusion
[Use the fusion table.]

## Agency Return / First Real Choice
[How choice arrives after motivation.]

## Accessibility and Redundancy Notes
[Prompts, control remapping, slow learners, fail-safes, optional reminders.]

## Risks and Playtest Questions
[Highest uncertainty and what to test.]
```
