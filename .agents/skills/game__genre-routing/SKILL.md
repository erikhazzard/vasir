---
name: game__genre-routing
description: Selects relevant game-design playbooks from the actual mechanics and handles mixed or uncovered genres without forcing a match. Use when genre knowledge would change a game design, implementation, tuning, or critique decision.
tools: Read, Grep, Glob
---

# Game Genre Router

This skill selects domain knowledge. Start with what the player does, what resolves their choice, and the decision being made now. A theme, camera angle, or marketing genre label is not enough to choose a playbook. Load only references that can change that decision.

`$game__directing` owns the coherent brief, `$game__art-directing` the visual grammar, `$game__adding-juice` response design, and `$game__orchestrating-playable-build` integrated play and repair. This selector does not impose a second brief or expand the game to match a genre checklist.

## Available routes

| Relevant mechanics or problem | Read |
| --- | --- |
| Autobattler, autochess, shop/bench/board, formations, synergies, automated combat | `references/auto-battler-tactics.md` |
| Forced running, lane changes, obstacle spacing, distance pacing | `references/endless-runner.md` |
| Production growth, clicker loops, prestige, offline progress, large-number economy | `references/idle-incremental.md` |
| Platform traversal, jumping, dashing, wall moves, checkpoints, collision forgiveness | `references/platformer.md` |
| Grid manipulation, match-3, merge, sliding, Sokoban, falling blocks, cascades, undo, hints | `references/grid-puzzle.md` |
| Run resets, procedural encounters, item synergies, build emergence, meta-progression | `references/roguelike.md` |
| Defensive placement, creep paths, waves, targeting, upgrade economy | `references/tower-defense.md` |
| Persistent shared-world fabric, locality, institutions, guilds, social economies | `references/mmo/overview.md` |

## Mixed mechanics

Choose the dominant decision for the current task and add a second reference only if an interacting mechanic requires it. There is no requirement to load every genre named in a pitch. A broader investigation may need more references; each should have a named design question.

- Runner guidance owns forced motion and obstacle rhythm; platformer guidance owns discretionary traversal and movement contacts. A side view alone selects neither.
- Tower-defense guidance owns path pressure and placement economy; autobattler guidance owns pre-combat commitments and automated combat causality. A board alone does not imply autochess.
- Roguelike guidance owns run resets and build emergence; idle guidance owns long-horizon production and offline catch-up. Progression alone does not settle the route.
- For MMO-specific work, start with the overview and follow only the references relevant to the feature. A single-player open world does not inherit MMO requirements from its size.

## Uncovered genres

A missing playbook is a coverage gap, not permission to change the game. Racing, sports, rhythm, narrative, card games, social deduction, management simulations, or experimental forms may have no direct route here. Do not force a nearby label or create a taxonomy entry merely to continue.

Identify the mechanics that need expertise, then use the existing project design and appropriate specialists. For example, steering and grip may need physics and response design; a card decision may need state, rules, and information hierarchy; dialogue may need narrative, consequence, and readable interaction. Use `$game__building-core-loop`, `$game__designing-systems`, or other specialists only for the part they actually own. Preserve the game's requested platform, control scheme, pace, and expressive form.

If consequential mechanics remain unfamiliar, investigate the specific uncertainty using supplied references, current implementation, a bounded experiment, or primary sources as appropriate. State what remains unproven instead of presenting a borrowed playbook as authority.

## Reference discipline

Read a selected reference before relying on its details. Use its domain expertise within the actual request and governing project contracts. A playbook's example viewport, session duration, effect stack, or system count does not override an explicit platform or turn into a rule for every game. When no route fits, record that briefly and continue with the relevant mechanics; do not invent a mandatory fallback workflow.
