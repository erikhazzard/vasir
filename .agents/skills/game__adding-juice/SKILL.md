---
name: game__adding-juice
description: Designs and implements responsive game feel, expressive acting, and consequential feedback across genres and 2D or 3D games. Use when improving action timing, character or object performance, impacts, transformations, camera response, audiovisual feedback, or interaction satisfaction.
tools: Read, Grep, Glob, Edit, Write
---

# Game Feel and Consequential Feedback

Make the player's intent, the action's force or meaning, and its consequence perceptible through time. A beautiful peak frame cannot rescue an unchanged body, an invisible contact, or a recovery that fights the next input.

Use three competing lenses: the **controller** protects agency and dependable rules; the **animator** gives intent, weight, identity and follow-through to the meaningful focus; the **mixer** preserves contrast across quiet, ordinary and exceptional events. The focus may be a creature, vehicle, weapon, card, tile, cursor, board region or resource transfer. A calm puzzle can answer superbly through a precise placement and readable new relationship, with no particles or camera motion.

**Ownership.** This skill owns response timing, acting and feedback behavior. `$game__art-directing` owns material/shape language, composition and visual hierarchy; use its direction to judge what a response should look like. `$game__orchestrating-playable-build` owns the integrated play-and-repair loop and acceptance record. `$game__genre-routing` owns genre rules and authored control commitments; `$design__animating-interfaces` owns isolated interface transitions. Route Three.js/Rapier hot-path implementation through `$code__threejs-rapier-performance`; observed performance symptoms through `$threejs__improve-performance`. Do not install a new engine to avoid directing existing motion.

## Choose the response before the effect

For the action being improved, identify **intent → acknowledgment → consequence → aftermath → next action** from actual play. Name the experienced failure: cannot tell whether the card was accepted, charge looks like normal fire, collision barely registers, morph looks pasted on, or previous effects conceal the next decision. If input or outcomes are broken, repair that boundary with the owning gameplay skill before embellishing it. Do not change rules merely to fit an animation.

Judge the following as contextual craft heuristics, not mandatory effect recipes:

| Decision | Replacement instinct | Boundary |
|---|---|---|
| What acts? | Give the identity-bearing focus state-specific behavior. Anticipation, commitment, braking, waiting, loss and recovery need different intentions where play distinguishes them. | An abstract tile need not acquire eyes, limbs or elastic deformation. Suggest known affordances without making choices for the player or revealing hidden state. |
| Does a special action feel different? | Change the defining gesture, silhouette, topology, articulation or temporal structure; compare ordinary and special action without labels. | Add a transformed form only when the game promises transformation. Extra brightness or debris can punctuate a special action without pretending to morph it. |
| How strong is it? | Derive feedback from meaningful event data and consequence, then spend that range visibly across common and exceptional events. Inspect what reaches every consumer. | Distance, speed, damage, combo, charge or strategic significance mean different things. No universal weight ladder or fixed effects count. |
| What survives afterward? | Let the material leave, age and resolve in a way that belongs to it; preserve the causal origin after the focus moves away. | A crisp electronic confirmation may end cleanly. Lingering matter is useful only when it communicates material or state. |
| What responds nearby? | Stage a readable chain of cause: source, receiving object, connected elements, delayed settling. Independent ambience keeps its own motion. | Do not make distant scenery, the whole board, or all fog answer every small input. Rest can be alive without constant motion. |
| How much feedback? | Select the smallest mix that delivers the requested perceptual change at actual play size. Preserve successful force while repairing the wrong shape or material. | No channel quota. Do not mistake restraint for adequate response when the ordinary action is still imperceptible. |

Read [response-and-material.md](references/response-and-material.md) when designing transformations, trails, impact ranges, reactive worlds or repeat-action sequences; it includes cross-genre decisions and diagnostic comparisons.

## Make motion carry meaning

Separate leading intent, committed action and following mass. A vehicle turns its steering geometry before its chassis settles; a card lifts from its stack before committing to a slot; eyes can orient before a crown follows. Drive that relation from authored state and valid player intent, not only velocity. Released input and residual momentum differ. Near-zero sign changes should not repeatedly trigger reversal poses.

For a morph, hide detached VFX temporarily and ask what the connected subject becomes. Carry a stable identity anchor through intermediate poses and back into the next action. A larger burst around the same subject is a different effect, not a body transformation. If a recognizable form still feels like a stamp, inspect internal articulation, unequal timing, material flow and recovery; more emissions will not make the connected form exert force.

Controlled variation changes timing, mass, erosion, drift and secondary detail within a coherent gesture. Keep direction, contact point, action identity and essential state stable. Independent particle ages and trajectories matter more than continually randomizing the whole silhouette. Purely cosmetic randomness must not feed gameplay; respect the repo's replay/randomness contract.

## Protect agency, geometry and clocks

- Preserve the game's intentional timing and commitments. Presentation may follow or anticipate within that contract; do not secretly add input delay for a wind-up, or remove authored recovery/cancel rules in the name of responsiveness. Use the existing animation/gameplay authority, including established root motion where applicable.
- Newly accepted input or state changes retarget/cancel incompatible presentation. If a landing/reward/reload is interrupted, retain a short readable onset and allow appropriate world aftermath to finish without retaining a stale body pose or blocking the next choice.
- Keep gameplay state and presentation state distinct at their existing seam. If responsive scenery carries bodies or changes reachable geometry, route every displacement through the authoritative collision/constraint system. A later position clamp does not repair an invalid carrier path.
- Reuse the existing frame owner and pause/time-scale policy. Use elapsed-time or authored-tick motion consistently; bound resource lifetimes and repeated-action work. Pause, retry and scene exit must not retain old impulses, emitters or detached objects.
- Camera response serves information first. Check actual composed displacement and coverage at both extremes, with rotation/zoom when used; all affected layers must agree and screen-fixed UI must stay correctly placed. A nominal shake parameter proves neither visible force nor covered borders.
- When disruptive motion, flashes or dense effects are used, support the game's comfort setting and retain semantic acknowledgment in that mode. Avoid rapid full-screen flashing; do not require unused shake/particle controls in games without those effects. Use host integrations such as `idv.haptics` where the repo requires them.

## Judge the whole phrase

Review at normal cadence and target play scale before enlarging or slowing down for diagnosis. Include an ordinary action, a meaningfully different action, a repeated/rapid sequence and an interruption relevant to the changed behavior. Watch from intent through the next decision, including the source left behind. Review calm waiting as well when independent ambience is part of the claim. Inspect audio by listening when its perceived quality is claimed; waveform or scheduling checks prove only those properties.

Compare meaningful ranges on comparable recipients/context. If a powerful response looks wrong, isolate its shape, timing, material, layering and actual displayed size before reducing every channel. If it looks absent, determine whether it is missing, hidden, too short, too small or suppressed by a setting. Retain a gain only when it survives ordinary play without losing threats, targeting, contact or the next action. Performance/lifecycle checks support that decision; they do not award an artistic grade.

For a narrow change, report the experienced difference, the played sequence and any material limit. Broad requests return these findings to the orchestrator's existing record; no separate juice scorecard or seven-section response is required.

## Optional implementation reference

[character-movement.md](references/character-movement.md) — read for elastic 2D locomotion with velocity-based lean, bob or trails. Its examples are bounded starting points, not a movement model for cards, vehicles, rigid characters or 3D rigs.
