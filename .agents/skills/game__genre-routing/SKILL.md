---
name: game__genre-routing
description: Routes genre-specific game design / game development / building / tweaking work to the right genre playbook. Use when designing, creating, tuning platformers, runners, puzzles, roguelikes, idle/incremental games, tower defense, autobattler/tactics, or MMO systems.
tools:
  - Read
  - Grep
  - Glob
  - Edit
  - Write
---

# Game Genre Router

Use this as a selector, not as a mega-skill. Pick the closest route, read only the needed reference, and combine it with `game__building-core-loop`, `game__directing`, or system skills only when the task needs that extra layer.

## Route Table

| Task shape | Read |
| --- | --- |
| Autobattler, autochess, squad tactics, shop/bench/board, formations, synergies, automated combat | `references/auto-battler-tactics.md` |
| Endless runner, auto-runner, lane runner, scroll runner, obstacle spacing, distance scoring | `references/endless-runner.md` |
| Idle, incremental, clicker, prestige, offline progress, big-number economy, background catch-up | `references/idle-incremental.md` |
| Platformer, side-scroller, jumping, dashing, wall moves, hazards, checkpoints, collision feel | `references/platformer.md` |
| Grid puzzle, match-3, merge, sliding, Sokoban, falling blocks, cascades, undo, hints | `references/grid-puzzle.md` |
| Roguelike or roguelite runs, procedural levels, item synergies, meta-progression, one-more-run pacing | `references/roguelike.md` |
| Tower defense, placement grids, creep paths, waves, targeting, upgrades, economy balance | `references/tower-defense.md` |
| MMO/MMORPG, persistent-world fabric, locality, institutions, guilds, economies, social retention | `references/mmo/overview.md` |

## Collision Rules

- If the task mixes genres, name the primary genre and read at most two genre references before acting.
- Runner vs platformer: runner owns forced motion, obstacle rhythm, and distance pacing; platformer owns authored movement vocabulary, jump feel, and collision forgiveness.
- Tower defense vs autobattler: tower defense owns path pressure, placement economy, waves, and targeting; autobattler owns pre-combat commitment, unit synergies, and automated combat causality.
- Roguelike vs idle: roguelike owns run resets, build emergence, procedural levels, and one-more-run arcs; idle owns long-horizon production curves, offline progress, prestige, and notation.
- MMO is a special route: read `references/mmo/overview.md` first, then only the specific MMO reference files needed for the feature under review.

## Reference Discipline

The reference is the genre authority. Do not summarize or partially reconstruct a genre playbook from memory when the selected reference exists; read it before implementation, critique, or balance work.
