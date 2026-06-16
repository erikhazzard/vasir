# Active-Play Visual Quality Gate

Use this reference when judging whether a playable game actually looks and reads
like an authored game during play. This is not a post-match results screen
rubric. Score active gameplay after the first meaningful act, not a title
screen, result screen, modal, or isolated asset showroom.

## Core Principle

Visual quality is proven in the frame where the player must decide. A screenshot
is good only if it makes the next player action easier to understand while
carrying a coherent visual language.

Do not score provider usage, asset count, or polish vocabulary. Score what the
player can parse and what the game can sustain.

## Required Evidence

Minimum evidence for this gate:

- one active-play desktop screenshot
- one active-play mobile screenshot when mobile is in scope
- the player, a current objective, and at least one threat, reward, or decision surface visible
- artifact path or screenshot name for each score
- browser/runtime evidence if visual changes can affect performance

Invalid evidence:

- title screen, start menu, result screen, or marketing hero
- static scene before the player can act
- screenshot after debug tools obscure the play surface
- isolated character/model render with no gameplay context
- claims based only on "it uses generated assets" or "it has postprocessing"

## Scoring Scale

Use 0-3. Half points are allowed only when evidence is mixed.

| Score | Meaning |
|---|---|
| 0 | Placeholder or unproven. The player cannot reliably parse the game state. |
| 1 | Styled prototype. The theme is visible, but readability or authored language is weak. |
| 2 | Ship-quality active play. The frame is readable, coherent, and intentionally authored. |
| 3 | Showcase active play. The frame is memorable, highly readable, and visually specific without waste. |

## Categories

1. Core-loop readability
   - 0: Cannot tell what to do next.
   - 1: The objective exists but depends on text/debug state or guessing.
   - 2: Verb, objective, danger/reward, and next action are legible at a glance.
   - 3: The frame teaches the loop visually, even without instructions.

2. Player/threat/reward hierarchy
   - 0: Player, threats, rewards, or goals blend together.
   - 1: Hierarchy is mostly color or size only.
   - 2: Player, threat, reward, and objective have distinct value, shape, motion, or placement roles.
   - 3: Hierarchy survives motion, clutter, mobile size, and effect bursts.

3. Shape language and silhouette
   - 0: Default primitives or interchangeable silhouettes dominate.
   - 1: Some authored forms exist, but categories reuse the same silhouette.
   - 2: Shape families encode player/friend/threat/reward/environment roles.
   - 3: The game has a reusable silhouette grammar that can scale to more content.

4. Semantic color and value system
   - 0: Palette is arbitrary or one-note.
   - 1: Theme colors exist, but gameplay meaning is inconsistent.
   - 2: Colors and values carry stable semantic roles and work without color alone.
   - 3: Palette, value ramps, and forbidden combinations create strong state communication.

5. World and environment support
   - 0: Empty plane, sparse arena, box skyline, or decorative noise.
   - 1: Theme props exist but do not support scale, route, danger, or decision making.
   - 2: Foreground/midground/background and prop kits support readability and fantasy.
   - 3: Environment communicates rules, mood, route, and stakes without stealing focus.

6. Motion, feedback, and VFX clarity
   - 0: No visible feedback or random effects.
   - 1: Effects exist but are generic, late, or hide important state.
   - 2: Feedback is event-driven and clarifies input, hit, collect, fail, progress, or combo.
   - 3: Motion and VFX create strong feel while preserving the next decision.

7. UI/HUD integration
   - 0: Debug text, generic stat cards, clipped labels, or missing state.
   - 1: HUD reports state but feels detached or covers play.
   - 2: HUD is compact, genre-specific, state-driven, and safe on mobile.
   - 3: UI and world share visual language and transitions without reducing clarity.

8. Mobile fit and accessibility
   - 0: Text/control overlap, unsafe areas, tiny targets, or unreadable contrast.
   - 1: Mostly fits but lacks proof under smallest target viewport or reduced-motion needs.
   - 2: Safe areas, touch zones, contrast, text fit, and reduced-motion posture are covered.
   - 3: Mobile framing improves the game instead of merely squeezing desktop layout.

9. Performance and resource discipline
   - 0: No runtime evidence after visual changes.
   - 1: Informal "seems fine" or only desktop proof.
   - 2: Build/browser proof plus renderer or frame-budget evidence for changed surfaces.
   - 3: Before/after or budget-aware diagnostics show the visual language is sustainable.

## Thresholds

Ship-quality active play:

- every category is at least 2, or the final answer names the exact blocker
- average score is at least 2.2
- no automatic failure remains
- screenshots are active-play artifacts, not menus/results/showrooms

Showcase active play:

- at least five categories score 3
- no category below 2
- average score is at least 2.7
- performance/resource evidence supports the visual density

## Automatic Failures

Any of these prevents a ship-quality or showcase visual claim:

- the active frame does not show what the player can do next
- player/threat/reward are not visually separable
- default primitives, flat arenas, or repeated boxes dominate the screenshot
- VFX, bloom, darkness, particles, or camera shake hide missing authored form
- HUD is mostly debug text or generic dashboard cards
- UI overlaps the play path, clips text, or fails mobile safe areas
- screenshot evidence is from title/results/showroom instead of active play
- visual changes lack browser/runtime proof when they touch render cost

## Repair Order

Fix failures in this order:

1. Make the next player action readable.
2. Separate player, threat, reward, and objective by value/shape/placement.
3. Establish shape language and semantic color roles.
4. Replace primitive-dominant visible surfaces with authored forms.
5. Make feedback event-driven and proportional.
6. Integrate HUD state without covering play.
7. Add density, lighting, materials, and effects only after readability holds.
8. Prove mobile fit and runtime cost.

## Report Format

```text
Active-play visual gate:
- Evidence:
  - Desktop active-play screenshot:
  - Mobile active-play screenshot:
  - Runtime/performance evidence:
- Scores:
  - Core-loop readability: X/3 - evidence:
  - Player/threat/reward hierarchy: X/3 - evidence:
  - Shape language and silhouette: X/3 - evidence:
  - Semantic color and value system: X/3 - evidence:
  - World and environment support: X/3 - evidence:
  - Motion, feedback, and VFX clarity: X/3 - evidence:
  - UI/HUD integration: X/3 - evidence:
  - Mobile fit and accessibility: X/3 - evidence:
  - Performance and resource discipline: X/3 - evidence:
- Average:
- Automatic failures remaining:
- Highest-leverage visual repair:
```

If the gate fails, do not call the game visually finished. State the exact next
repair pass instead.
