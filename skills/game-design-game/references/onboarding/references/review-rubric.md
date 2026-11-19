# Platformer Onboarding Review Rubric

## Table of Contents

- [Rubric](#rubric)
- [Diagnostic Questions](#diagnostic-questions)
- [Red Flags and Repairs](#red-flags-and-repairs)
- [Audit Output Template](#audit-output-template)

Use this when auditing an existing first level, tutorial, prototype, vertical slice, or first playable build.

Score each category from 0 to 4. The score is less important than the diagnosis and fix.

```text
0 = absent or actively harmful
1 = present but weak / confusing / overexplained
2 = functional but ordinary
3 = strong, clear, mostly embodied
4 = S-tier, teaches mechanically and emotionally with minimal friction
```

## Rubric

| Category | 0 | 2 | 4 | Common fix |
|---|---|---|---|---|
| Readable first action | Player does not know how to start or is punished immediately | Path/control is understandable after minor confusion | Composition makes first action obvious and safe | Close one direction, open the intended path, remove early threat |
| Safe experimentation | Early input experimentation is punished | Some safe testing, some premature danger | Player can try core inputs before danger | Add a no-threat opening pocket |
| Player-model sequencing | Mechanics appear as a checklist | Some order exists but beats do not depend on prior learning | Each beat updates one belief and the next beat relies on it | Rewrite as model-update chain |
| Verb disambiguation | Player cannot tell which verb solves what | Verbs are introduced but not contrasted | Problems clearly distinguish movement, attack, recovery, tool use | Add two adjacent problems solved by different verbs |
| Combination pacing | Multiple mechanics are demanded before isolated | Combination appears after partial intro | Verbs are isolated, rewarded, repeated, then combined | Move the combo later or simplify the arena |
| Failure pricing | First mistakes kill/reset unfairly | Prices are inconsistent but survivable | Error costs escalate only after learning | Make first exposure minor damage/setback |
| Feedback clarity | Cause/effect is invisible or delayed | Feedback is visible but noisy | Feedback instantly proves the rule | Add animation, sound, hit reaction, surface effect |
| Geometry as language | Level shape does not guide | Some affordances communicate | Layout makes the desired experiment natural | Narrow space, frame target, remove competing options |
| Optional mastery reward | New mechanic only gates progress | A reward exists but is weak or late | New mechanic immediately grants optional value | Add pickup/shortcut/position advantage after discovery |
| World-rule expansion | World feels static or arbitrary | One state change is shown | Objects/enemies visibly change categories or terrain | Add threat → tool, enemy → platform, stable → broken transition |
| Emotional/thematic embodiment | Story/fantasy only in text/cutscenes | Some mechanics support fantasy | Player feels the premise through input and consequence | Make the theme a playable success/failure/upgrade |
| Aspirational motivation | No reason to care about progression | Goal exists but feels abstract | Player sees or feels a future power state they want | Add mentor/rival/locked route/unbeatable threat after real agency |
| Agency return | Player chooses before understanding stakes | Choice exists and is functional | First major choice arrives after desire is established | Move choice after prologue or add readable previews |
| Accessibility redundancy | Either no help or intrusive help | Prompts exist but interrupt flow | Text assists without replacing embodied learning | Make prompts optional/contextual/fail-triggered |
| Replay respect | Tutorial is mandatory every time | Some skipping possible | Dense first-run onboarding, low repeat friction | Add skip/checkpoint/password/fast restart |

## Diagnostic Questions

### Player model

- What does the player believe before the beat?
- What exact belief should change?
- What makes the player try the intended action?
- What confirms the update?
- What later beat relies on this update?

### Failure pricing

- What is the first cost of misunderstanding this mechanic?
- Did the player have enough evidence before that cost?
- Does the failure teach, or does it merely punish?
- Can the player immediately retry?

### Instruction quality

- Could geometry, camera, enemy behavior, animation, audio, or reward placement teach this instead of text?
- Is the prompt telling the player something they were already about to infer?
- Is the prompt needed for accessibility or invisible rules?

### Theme and motivation

- What does the first level make the player feel about the character's body?
- Is the core fantasy experienced through input?
- Does the first major choice mean something emotionally?
- What does the player want after onboarding that they did not want before?

## Red Flags and Repairs

| Red flag | Likely damage | Repair |
|---|---|---|
| “Press A to jump” before any safe space | Player feels managed, not trusted | Let them move in a safe opening; add prompt only after inactivity/failure |
| First enemy is complex or lethal | Early blame shifts to game | Replace with low, slow, readable hazard |
| First gap appears before jump feel is established | Lethal commitment too early | Add safe jump opportunity first |
| Wall/ledge/climb mechanic explained by popup only | Mechanic feels procedural | Create a safe trap or reward pocket where the surface behavior is visible |
| Player receives choice immediately but lacks desire | Nonlinearity feels arbitrary | Add short prologue or previews that create a reason to choose |
| New mechanic appears once and vanishes | Player forgets or devalues it | Use isolate → reward → repeat → combine |
| Story says “you are weak” before gameplay proves it | Exposition feels fake | Let the player fight, fail, then name the weakness |
| Story says “you are powerful” but mechanics are generic | Fantasy does not land | Add a situation only this character/body can solve |
| Tutorial prompt pauses during obvious action | Flow break and condescension | Replace with environmental cue or fail-triggered hint |
| Difficulty rises by adding noise | Confusion mistaken for challenge | Increase one axis at a time: enemy, terrain, timing, or resource pressure |

## Audit Output Template

```markdown
# Onboarding Audit: [Game / Level]

## Direct Verdict
[One paragraph: what works, what fails, and whether the onboarding is S-tier, strong, functional, or broken.]

## Score Summary
| Category | Score | Note |
|---|---:|---|
| Readable first action |  |  |
| Safe experimentation |  |  |
| Player-model sequencing |  |  |
| Verb disambiguation |  |  |
| Combination pacing |  |  |
| Failure pricing |  |  |
| Feedback clarity |  |  |
| Geometry as language |  |  |
| Optional mastery reward |  |  |
| World-rule expansion |  |  |
| Emotional/thematic embodiment |  |  |
| Aspirational motivation |  |  |
| Agency return |  |  |
| Accessibility redundancy |  |  |
| Replay respect |  |  |

## Player-Model Trace
[Beat-by-beat table: before → situation → update → dependency.]

## Strongest Self-Authored Learning Beats
[Where the player learns by doing.]

## Biggest Breaks in Trust
[Where the level lectures, ambushes, overloads, or under-feedbacks.]

## Highest-Leverage Fixes
1. [Fix with reason.]
2. [Fix with reason.]
3. [Fix with reason.]

## Revised Beat Table
[Only rewrite the necessary beats unless the level is structurally broken.]

## Playtest Questions
[What to verify next.]
```
