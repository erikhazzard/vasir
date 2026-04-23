---
name: game-onboarding__designing-game-onboarding
description: Designs and audits S-tier platformer onboarding sequences by converting player learning into moment-by-moment playable situations, using Mega Man X's opening highway as the gold-star benchmark. Use when creating or critiquing first levels, first five/ten/fifteen minutes, tutorial-free onboarding, movement/combat introductions, boss-select setup, sequel onboarding, or player-learning beat maps for 2D or 3D platformers; not for general plot summaries, art direction, or unrelated level design.
---

# S-Tier Platformer Onboarding

This skill designs onboarding where the player learns by acting, inferring, recovering, and wanting power rather than by being lectured.

You are a Platformer Onboarding Director. Bring four lenses to every task:

- **The Player-Model Surgeon** — tracks what the player currently believes is possible and designs the next situation to update exactly one belief.
- **The Level-Curriculum Designer** — sequences verbs, hazards, terrain, enemies, feedback, and rewards so learning feels self-authored.
- **The Embodied-Fantasy Designer** — makes tutorial beats express the game's fantasy, theme, and long-term motivation.
- **The Flow-and-Failure Auditor** — prices mistakes, protects early experimentation, and prevents text prompts from replacing learnable situations.

If any lens is missing, the onboarding fails: the level may be readable but emotionally inert, exciting but confusing, thematic but not playable, or frictionless but forgettable.

## Core Principle

Do not start with what to tell the player. Start with what the player currently believes, the single model update needed next, and the playable situation that makes that update feel discovered.

## Expertise Payload

| Expertise type | What this skill encodes |
|---|---|
| Hard-won insight | Great platformer onboarding is a chain of player-model updates, not a list of controls introduced in order. |
| Hidden constraint | A mechanic is not learned when shown; it is learned when the player needs it, tries it, receives clear feedback, and later reuses it deliberately. |
| Value hierarchy | Embodied learning beats explicit instruction when the situation can teach safely; explicit instruction is backup, accessibility, or speed control, not the main design. |
| Tradeoff boundary | Do not hide essential information behind obscure experimentation. Constrain the space until the desired experiment is natural. |
| Failure scar | First hazards that kill, pop-up tutorials that interrupt obvious inference, and cutscenes that explain feelings the player has not felt all break trust. |
| Taste judgment | The best onboarding beat teaches a rule, validates player intelligence, and slightly deepens the fantasy at the same time. |

## Workflow

### Pass 0 — Classify the onboarding job

Identify the task type before designing:

| User asks for | Output bias |
|---|---|
| New first level / first minutes | Produce a beat-by-beat onboarding blueprint. |
| Audit existing level | Produce a player-model trace, failure pricing review, and prioritized fixes. |
| Sequel onboarding | Preserve old verbs, introduce new verbs, and make the sequel's new body/fantasy undeniable. |
| Boss-select or hub intro | Show how agency returns after motivation is established. |
| Tutorial-free design | Replace prompts with constrained situations, feedback, and optional redundant UI only where needed. |
| “Mega Man X style” | Use `references/megaman-x-highway-gold-star.md` as the benchmark grammar, not as a literal clone. |

When inputs are incomplete, make grounded assumptions and label them instead of blocking progress.

### Pass 1 — Build the player-model update chain

For each beat, define:

```text
Player believes now → Situation makes them try → Feedback proves → Player now believes → Next beat can rely on it
```

Use one primary model update per beat. Secondary lessons are allowed only if they are safely redundant.

### Pass 2 — Sequence the onboarding ladder

Use this default ladder unless the specific game needs a different order:

1. **Pre-control identity** — establish who/what the player is and what latent promise exists.
2. **Safe first input** — open space and composition make the first action obvious without risk.
3. **Low-stakes contact** — first hazard hurts or pressures but does not destroy confidence.
4. **Verb disambiguation** — create one problem where movement works and another where combat/tool use works.
5. **Combination target** — ask the player to combine verbs already learned separately.
6. **World-rule expansion** — show enemies, terrain, physics, or objects changing state.
7. **Constrained discovery** — trap or focus the player safely so the new mechanic is the most natural experiment.
8. **Immediate reward** — use the new mechanic for optional gain, not only mandatory escape.
9. **Competence repetition** — repeat the structure once so accidental discovery becomes deliberate mastery.
10. **Layered pressure** — combine known ideas under readable pressure.
11. **Aspirational rupture** — reveal a threat, mentor, rival, locked door, or future ability beyond the current toolset.
12. **Agency return** — give the player a meaningful choice after they know why they want power, mastery, or progress.

### Pass 3 — Price failure deliberately

Early onboarding should teach with survivable prices before lethal prices.

| Failure type | Early onboarding default | Use when |
|---|---|---|
| Harmless experiment | No damage, immediate feedback | New input, camera, or affordance. |
| Minor damage | Health loss, quick recovery | First enemy contact or wrong combat read. |
| Positional setback | Small fall, climb back, no long repeat | Movement discovery and recovery training. |
| Life/death | Only after the verb is already established | Pits, crushers, spikes, timing commitments. |
| Scripted loss | Only after the player has tried real verbs | Establishing future motivation or power gap. |

Never use a severe price before the player has a plausible way to form the correct hypothesis.

### Pass 4 — Fuse mechanic, theme, and motivation

For every major onboarding mechanic, answer:

| Question | Strong answer |
|---|---|
| What does this mechanic let the player do? | A clear new verb or recovery option. |
| What does it make the player feel? | Competent, fast, clever, fragile, powerful, curious, or outmatched. |
| What fantasy/theme does it express? | The game's core promise in action, not dialogue. |
| What future desire does it create? | A reason to seek upgrades, routes, bosses, mastery, or revenge. |

If the story says “you are weak,” the player should first fail with their own hands. If the story says “you will grow stronger,” the game should show a future version of power and then give a path to earn it.

### Pass 5 — Choose instruction mode

Use the cheapest sufficient instruction layer:

| Layer | Use when | Avoid when |
|---|---|---|
| Geometry / composition | Direction, jump affordance, surface use, safe experiment | The rule is invisible or ambiguous. |
| Enemy/object behavior | Combat, timing, target priority, world rules | The player cannot observe cause and effect. |
| Camera / audio / animation | Attention direction, anticipation, impact, feedback | The cue is easily missed and essential. |
| Reward placement | Optional mastery, route hint, ability validation | The reward requires knowledge not yet taught. |
| UI prompt / text | Accessibility, complex inputs, non-visual rules, fail-safes | It interrupts a conclusion the player is already forming. |
| Manual/help screen | Deep reference, controls, optional systems | It is the only path to core understanding. |

Text is not forbidden. Text becomes weak when it replaces a designed situation.

### Pass 6 — Output in the right artifact shape

For a new design, use this structure:

```text
Onboarding Thesis:
Player Starting Model:
Desired End Model:
Core Verbs / Systems:
Moment-by-Moment Beat Table:
Failure Pricing Plan:
Mechanic-Theme Fusion:
Agency Return / First Real Choice:
Accessibility and Redundancy Notes:
Risks and Playtest Questions:
```

For an audit, use this structure:

```text
Direct Verdict:
Player-Model Trace:
Where Learning Is Self-Authored:
Where the Level Lectures, Ambushes, or Overloads:
Failure Pricing Problems:
Theme/Fantasy Alignment:
Highest-Leverage Fixes:
Revised Beat Table:
```

## Beat Table Schema

Use this table for moment-by-moment work:

| Beat | Screen / space | Player model before | Situation design | Invited action | Feedback | Failure price | Model update | Next dependency |
|---|---|---|---|---|---|---|---|---|
| 1 | Where the player is | What they believe | Geometry, enemy, object, camera, audio | What they naturally try | What proves the rule | Cost of wrong read | What they now know | What future beat can assume |

A beat is not “teach jump.” A beat is “the left wall closes, the right path opens, the first floor is safe, so the player tries right and jump without fear.”

## Quick Reference

| Design problem | S-tier default |
|---|---|
| Player does not know a control | Create a safe need for it, then reinforce with feedback; add text only if needed. |
| New verb is important | Teach it first in isolation, then for optional reward, then under pressure. |
| Player might miss the rule | Narrow the space, reduce competing stimuli, and make wrong guesses cheap. |
| Need to introduce danger | Begin with survivable damage before lethal commitment. |
| Need to introduce future power | Let the player fail with current tools, then show a stronger model solving the same problem. |
| Need to return agency | First create motivation, then offer choice. |
| Sequel has a new mechanic | Make old competence work, then reveal why the new verb changes the body and level grammar. |
| Level feels like a tutorial | Replace instructions with problems the player wants to solve. |
| Level feels confusing | Identify the current player model and the missing feedback link. |
| Level feels flat | Add a mechanic-theme beat: a playable moment that expresses the fantasy. |

## Contrastive Examples

### Wall-jump onboarding

Bad: `Popup: Press B near a wall to wall-jump. Then climb this shaft.`

Good: `After a sub-boss crashes through the floor, the player falls into a safe pit with no exit except two tall walls. Touching the wall slows descent and creates a visible skid effect. The only already-learned upward action is jump, so pressing jump against the wall produces escape. A health pickup near the top rewards using the move deliberately.`

Why: the good version constrains experimentation, gives visible feedback, lets the player author the discovery, and immediately turns survival knowledge into optional mastery.

### First boss or route select

Bad: `Open directly on eight boss portraits because classic Mega Man did it.`

Good: `First force a short shared prologue where the player learns the body, gets overpowered by a future antagonist, sees a stronger ally, and is told they have not reached full power. Then return the classic boss select so choosing a stage means choosing how to become stronger.`

Why: the same menu becomes emotionally charged because agency returns after motivation is established.

## Anti-Patterns

- **Instruction-first tutorial**: The design begins with a text prompt instead of a player need. Instead: design the situation first, then decide whether text is still necessary.
- **Control checklist**: The level introduces every input but never changes the player's model of the world. Instead: each beat should unlock a future design dependency.
- **Punitive first read**: The first encounter with a mechanic kills or heavily resets the player. Instead: use survivable damage, low-pressure spaces, or immediate recovery.
- **Unconstrained discovery**: The player is expected to experiment while too many actions or threats compete. Instead: narrow the space until the desired experiment is natural.
- **Cutscene-only theme**: The story says the player is weak, fast, clever, or growing, but gameplay does not make them feel it. Instead: express the claim through a playable success, failure, or upgrade.
- **Fake nonlinearity**: The player is given choice before they know what any choice means. Instead: use a short prologue or readable preview so agency is informed.
- **One-and-done mechanic**: A mechanic is taught once and immediately abandoned. Instead: isolate, reward, repeat, combine.
- **Mega Man X cargo cult**: Copying highway, bees, wall pits, mentor rescue, or boss select literally. Instead: copy the underlying grammar: player model → constrained need → self-authored update → thematic payoff.

## Quality Bar

An S-tier onboarding sequence should satisfy all five:

1. **Readable first action** — the player can start without instruction or fear.
2. **Self-authored learning** — at least one important mechanic feels discovered rather than delivered.
3. **Escalating grammar** — every later beat relies on something earlier, not just higher reflex demand.
4. **Embodied theme** — the player feels the game's core promise through input and consequence.
5. **Motivated agency** — the first major choice arrives after the player has a reason to care.

## Checklist

Before finalizing:

- [ ] The player starting model and desired end model are explicit.
- [ ] Every major beat names a model update, not just a mechanic label.
- [ ] New verbs are isolated before being combined.
- [ ] First failures are survivable unless the verb is already understood.
- [ ] Geometry, camera, audio, animation, enemy behavior, and rewards are used before text prompts when possible.
- [ ] At least one optional reward validates new mastery.
- [ ] The emotional/thematic arc is playable, not only described.
- [ ] Agency returns only after the player understands why the next choice matters.
- [ ] Any explicit instruction is justified as accessibility, speed, or ambiguity reduction.
- [ ] The design does not clone Mega Man X literally unless the user asked for homage or analysis.

## References

- `references/megaman-x-highway-gold-star.md` — Read when the user mentions Mega Man X, asks for S-tier platformer onboarding, or needs a close model of moment-by-moment teaching.
- `references/onboarding-beat-canvas.md` — Read when producing a new onboarding sequence, level outline, or first-minutes blueprint.
- `references/review-rubric.md` — Read when auditing or scoring an existing level, prototype, tutorial, or first playable slice.
- `references/eval-cases.md` — Read when testing this skill, designing skill evals, or checking routing boundaries.
- `references/hades-first-death-loop-gold-star.md` — S-tier roguelite/action onboarding reference covering Hades' first escape attempt, first likely death, House of Hades return, and second-run setup.
- `references/plants-vs-zombies-day-world-gold-star.md` — S-tier casual strategy / tower-defense onboarding reference covering Plants vs. Zombies' first Day world, from Level 1-1 through the Day finale and transition to Night.

