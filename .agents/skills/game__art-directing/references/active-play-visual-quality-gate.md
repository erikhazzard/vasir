# Active-Play Visual Slap Review

Use this reference when judging whether a playable game actually looks, moves,
and reads like a real authored game during play. This is not a post-match
results, marketing, title-screen, still-screenshot, or asset-showroom rubric.

## Core Principle

Visual quality is judged in the decision moment and the response immediately
after it. A beautiful still can fail if the input answer, motion, camera,
feedback, or consequence feels dead. The human QA question is simple:

```text
Can I instantly tell what matters, what I can do, what changed when I acted, and
why I would keep playing?
```

If the answer is no, the visual pass does not slap yet. Notes explain the
reason; they do not overrule the human read.

## What To Look At

Use real active-play material:

- one desktop active-play frame at actual game scale;
- one mobile active-play frame when mobile is in scope;
- one before/input/after sequence for the first meaningful act;
- player, objective, and at least one threat, reward, or decision surface;
- a short clip or frame sequence when motion, VFX, hit feedback, or camera movement matters;
- a live run or runtime sanity check when visual density may hurt feel.

Default mobile in scope for web/mobile games unless the user or game explicitly
says desktop-only.

Stop the review if the material is:

- title screen, start menu, result screen, death/result/share screen, or marketing hero
- static scene before the player can act
- debug overlay obscuring the play surface
- isolated character/model render with no gameplay context
- screenshot that hides controls, objective, threat/reward, or decision state
- still-only material for a game whose feel depends on motion, impact, camera,
  timing, or state-change feedback
- claims based only on "generated assets", postprocessing, or asset count

## Active-Play Slap Test

Before judging, inspect the active play sequence without reading code or a
design doc:

```text
Active-play read:
- I am:
- I should:
- I should care because:
- When I act, the game visually answers by:
- What changed after the action:
- The biggest visual confusion is:
- Would I keep playing from this moment?: yes/no
```

If "I should", "I should care because", "When I act", or "What changed" is
unclear, the verdict cannot be `SLAPS`. If "Would I keep playing" is no, the
verdict cannot be `SLAPS`.

## Slap Verdicts

| Verdict | Meaning |
|---|---|
| `SLAPS` | The active sequence is readable, authored, and makes the next action more tempting. |
| `CLOSE` | The game has a real visual direction, but one visible blocker hurts desire or clarity. |
| `DOES NOT SLAP` | The moment feels confusing, generic, dead, unreadable, or not worth another try. |
| `BLOCKED` | Valid active-play material is missing or stale. |

## Judgment Areas

1. Next-action readability
   - Can a human tell what to do next without instructions?
   - Are verb, objective, danger/reward, and pressure visible at actual scale?

2. Player/threat/reward hierarchy
   - Do player, threat, reward, objective, and interactables separate by value,
     shape, placement, motion, or scale?
   - Does the hierarchy survive clutter, mobile scale, and effects?

3. Authored visual identity
   - Does the sequence look designed, not assembled from defaults?
   - Are silhouettes, materials, colors, and props part of a reusable grammar?
   - Intentional abstract geometry is valid; default primitives with no semantic
     system are not.

4. Feedback and motion readability
   - Does the sequence show that input, hit, collect, fail, combo, progress,
     or danger feedback clarifies play?
   - Do VFX and camera work make the next decision clearer instead of hiding it?

5. HUD, mobile fit, and accessibility
   - Is state visible without covering the play path?
   - Are touch zones, safe areas, text, contrast, and reduced-motion posture
     credible on the smallest target viewport?

6. Runtime sustainability
   - Does the visual density create visible jank, input lag, unreadable blur, or
     thermal/perf risk that hurts feel?
   - Is the look sustainable, or only pretty in a still?

## Hard Blockers

Any blocker prevents `SLAPS` no matter how polished the screenshot looks:

- no valid active-play material;
- no clear next action in the active-play read;
- no visible before/input/after read for the first meaningful act when motion or
  feedback matters;
- player, threat, reward, objective, or interactables blend together;
- motion/VFX claims rely on a still screenshot for a motion-heavy game;
- mobile is in scope but the mobile frame is missing, cropped, or unreadable;
- render-cost changes create visible jank or have no sanity check when cost is
  plausibly high;
- the only attractive material is a menu, result, death, share, or showroom
  screen.

The point is not to grade missing material. The point is to avoid calling a
game visually good when the active moment does not help play.

- Results/death/share/menu screenshots may support a separate results-screen
  review, but they cannot raise the active-play verdict.

## Core-Loop Profiles

Pick the closest profile before judging. Use it to weight the repair.

| Loop | What must slap visually |
|---|---|
| Action combat | Player location, enemy intent, safe/unsafe space, hit feedback, and VFX occlusion. |
| Turn-based tactics | Board state, legal options, threat previews, consequences, and selected unit focus. |
| Deckbuilder/card | Card affordances, resource math, target state, combo feedback, and hand/read area. |
| Survivor/auto-battler | Player/swarm separation, pickup/reward visibility, density control, build feedback. |
| Exploration/physics | Terrain affordances, hazards, material rules, route choices, and interaction cues. |
| Hybrid | Name primary and secondary loop; primary loop wins conflicts. |

## Repair Order

Fix the single biggest "does not slap" reason first:

1. Make the next player action obvious.
2. Separate player, threat, reward, objective, and interactables.
3. Make feedback event-driven and readable.
4. Replace default-looking surfaces with authored visual grammar.
5. Integrate HUD/state without covering play.
6. Check mobile fit where relevant.
7. Check runtime cost when visual density could hurt feel.
8. Add style, lighting, particles, and detail only after the active moment reads.

Do not add beauty around confusion. Do not praise a frame or clip that does not
make a human want another attempt.

## Report Format

```text
Active-play visual slap review:
- Verdict: SLAPS / CLOSE / DOES NOT SLAP / BLOCKED
- Active-play read:
  - I am:
  - I should:
  - I should care because:
  - When I act, the game visually answers by:
  - What changed after the action:
  - Biggest visual confusion:
  - Would I keep playing from this moment?:
- Material:
  - Desktop active-play frame:
  - Mobile active-play frame:
  - Before/input/after sequence:
  - Motion/feedback clip:
  - Runtime sanity check:
- Core-loop profile:
- Judgment:
  - Next-action readability:
  - Player/threat/reward hierarchy:
  - Authored visual identity:
  - Feedback and motion readability:
  - HUD, mobile fit, and accessibility:
  - Runtime sustainability:
- Hard blockers:
- Single biggest reason it does or does not slap:
- Next repair pass:
```
