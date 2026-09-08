---
name: game__orchestrating-playable-build
description: Builds and polishes playable games through coordinated specialists and evidence-led play, critique, and repair. Use for game creation, broad quality upgrades, prototype rescue, or playable handoff across genres and engines. Excludes isolated bugs, UI edits, and performance diagnosis.
tools: Read, Grep, Glob, Bash, Edit, Write
---

# Playable Build Orchestrator

Deliver the game's promised experience in the player's hand. For broad quality work, actively find the failures the creator should not have to point out: a beautiful still with dead movement, disconnected materials, identical responses to different actions, a striking effect that obscures the next decision, or scenery that repeats without a meaningful change in composition. Specialist output is useful when it changes that experience.

## Start from this game

Keep one play sentence in view:

> I <acted or chose>; the game <answered>; <something meaningful changed>; next I wanted to <act, inspect, plan, read or continue>.

Derive the focus, time scale, camera and input from the brief and existing game. The focus can be an avatar, vehicle, piece, hand of cards, settlement, dialogue or whole board. The relevant interval can be a second, a turn, a passage or a production cycle. Honor the actual platform and orientation; mobile portrait is an optional default for an unspecified touch-browser game, not a substitute for a stated target.

A quiet puzzle can remain still while the player thinks. A rhythm game must preserve timing through its strongest accents. A racing camera must preserve steering information. A narrative choice needs readable text and a meaningful consequence. None needs an invented jump, enemy, fog bank, particle burst or failure timer to qualify as polished.

## Ownership and routing

Use the smallest specialist set that can resolve the active gap. For a broad art/feel upgrade, art direction and juice supply the craft judgment even if the user never names those skills. Load their relevant references, then implement; collecting skill names is not progress.

| Work that is needed now | Owner |
| --- | --- |
| Missing or conflicting game promise, aesthetic or scope | `$game__directing` |
| Core act, consequence, progression or retry is weak | `$game__building-core-loop`; `$game-design__ensuring-design-coherence` when the fantasy and incentives conflict |
| Genre-specific mechanics | `$game__genre-routing`; uncovered or mixed genres retain the actual brief |
| Visual/material/shape language, composition, readability | `$game__art-directing` |
| State-specific acting, response envelopes, force, variation and aftermath | `$game__adding-juice` |
| Rules, resources, combat, inventory, loot or procedural content | Relevant game-system owner only where the requested experience needs it |
| HUD, menu or results | `$ui__revamping-game-shell-ui` or the relevant interface/end-screen skill |
| Three.js / Rapier hot-path implementation | `$code__threejs-rapier-performance` |
| Observed Three.js performance failure | `$threejs__improve-performance`, with the hot-path guard for a candidate patch |
| 3D physical object manipulation | `$physics__creating-interaction-system` when that interaction is actually in scope |
| First-playable comprehension is the specific question | `$game-proof__auditing-first-playable-comprehension` |

This skill owns the integrated critique/repair loop. Art owns what the visual relationships communicate; juice owns how an action and its consequences unfold. Do not duplicate their recipes here. Pure design belongs to the director. An isolated known bug belongs to `$code__fixing-bugs`; a narrow UI or performance request keeps its own scope. Full game QA is not automatically required by a craft pass.

## Establish the reference before increasing effort

Name the intended experience and the largest observable gap. A supplied reference defines relationships worth matching—material, hierarchy, response, pacing—not permission to import its genre or add its features. If the user asks for “10×” or “S tier,” translate that ambition into perceivable differences in this game and make the strongest fitting improvement; a gain multiplier or agent grade is not the target.

For an existing game, preserve a cheap comparison point before materially changing it: the current diff/source plus the few stills or motion segments that expose the problem. Use existing work-spec/process notes when present. Do not require a new document tree, recording suite or snapshot of every asset for each edit.

For a new game, route a coherent brief and build a real first meaningful act, consequence and continuation. Keep the user's full promised journey visible while working in lasting slices; a smaller implementation slice does not authorize replacing the requested game with a different one.

## Play → diagnose → repair → compare

Read [the craft loop](references/craft-loop.md) when performing a broad quality pass, translating subjective criticism, or judging whether a claimed improvement really changed play. It provides cross-game observation choices and the stopping boundary.

1. **Observe the real interval.** Play or watch ordinary inputs at the intended presentation. See the most repeated interaction, a meaningful contrast, and the recovery or next decision. Extend past the opening when the complaint spans the world/session. Use native timing first; isolated frames and slow motion explain a failure but do not establish its felt duration.
2. **Name the experienced failure.** State what the player sees or feels, the plausible cause, and what would look different if repaired. “Needs polish” and “add shaders” are not diagnoses. Prefer the largest failure that affects the requested experience, not the easiest decoration to add.
3. **Implement the cause-level repair.** Connect the relevant owners. Keep response tied to real event/state/space; preserve immediate control, legal state changes and established visual signals. More layers or effects earn their cost through the actual improvement. Existing rendering and simulation boundaries remain authoritative.
4. **Revisit the same interval, then the next action.** Compare against the preserved version. Inspect ordinary scale and repetition, not only the new effect's best frame. Reject improvements that break a different material, hide a threat/choice, linger into the next command, or weaken an already successful accent.
5. **Repeat for a remaining concrete gap.** A substantial subjective pass benefits from a fresh reviewer when available. Give it the brief, references and current playable evidence; let it identify failures independently before supplying the author's diagnosis. The parent triages its findings. Repair observed issues; do not manufacture endless rounds or stop at the first flattering verdict.

When useful, retain one compact entry: **experienced failure → hypothesis → change → observed result → keep/reject**. User-requested process recording preserves the instructive failures as well as the final success. A lesson such as “remnants read as paper” should be checked in other relevant emitters, rather than rediscovered asset by asset.

## Proof and completion

Match the check to the changed claim: layout can use a still; state transitions need the actual interaction; camera/material motion needs normal-time observation; a new rendering cost needs an appropriate pacing/resource check. A plausible simulation or arranged fixture is useful when labeled, but does not prove natural route reachability. Existing tests, pause/restart and fallback checks support the change where those boundaries could fail. No fixed test or effect quota applies to every game.

Judge clarity, response, consequence and desire to continue on the game's own cadence. First-active-seconds review helps a fast toy; a full choice/resolution or planning cycle may be the minimum useful interval elsewhere. When the core toy is broken, repair it before polishing around it. When the user has accepted the toy and asked for craft, spend the pass on the named visual and temporal bar.

Complete the authorized repair and qualified review without repeatedly asking permission. Stop this pass when the requested observable improvement is present, the relevant checks pass, and no concrete in-scope blocker remains. Report unresolved material limits or a genuinely unavailable observation. Agent judgment is a recommendation; record a human taste verdict when supplied without inventing a grade or requiring the human to reapprove already authorized implementation.

Lead the handoff with the playable result, the changes the player will notice, what was actually observed, and any remaining limitation that matters. Include the playable entrypoint and useful process/evidence location. Avoid self-scored quality multipliers and a checklist of every loaded skill.
