---
name: game-build-game
description: "Build a playable game and make it feel right. Use to create a game, rescue a prototype, or raise a whole build's quality through play, critique and repair; or to design, implement, diagnose or tune one part of one: the core loop, pacing, session flow and input-to-feedback timing; combat, damage, hitboxes, health, combos and cooldowns; items, inventory, equipment, crafting and drag-and-drop; loot, drop tables, rarity, pity and reward fanfare; seeded procedural levels, terrain, dungeons, waves and placement; game feel, impact, camera response and feedback; grabbing, holding, throwing, two-hand handling and telekinesis of physics objects in Three.js and WebXR with Rapier; and results, victory, game-over, reward and share screens. A fix inside one of these systems goes to that system's procedure; orchestration is not for an isolated bug, a UI edit or performance diagnosis. Not for deciding what the game is or for a release verdict on a build."
license: MIT
metadata:
  gc-owner: "erik"
  gc-capability: "game-design"
  gc-engine: "agnostic"
  gc-platforms: "agnostic"
  gc-status: "draft"
  gc-tags: "game-development, core-loop, combat, inventory, loot, procedural-generation, game-feel, playable-build"
  gc-source: "https://github.com/erikhazzard/vasir/tree/d04347b0d515d4c3c46b5e012e2c334fdabf83bd/.agents/skills"
  gc-source-skills: "game__orchestrating-playable-build, game__building-core-loop, game__building-combat-damage, game__building-inventory-system, game__building-loot-systems, game__generating-procedural-content, game__adding-juice, physics__creating-interaction-system, design__designing-end-screen"
  gc-source-revision: "d04347b0d515d4c3c46b5e012e2c334fdabf83bd"
---

# Build a Game

Build the game and make it feel right. One procedure here runs a whole build. The other eight each own one part of a game. Deciding what the game is belongs to `game-design-game`. Judging a build that already runs belongs to `game-verify-game`.

## Pick the procedure

| You are asked to | Read | What it gives you |
| --- | --- | --- |
| Make a game, rescue a prototype, or raise a whole build's quality | [Orchestrate a playable build](references/orchestrate/orchestrate.md) (8K) | A play, diagnose, repair and compare loop held to one sentence about what the player does and what the game answers, and the call on which other procedures the work needs. Not for an isolated bug, a UI edit or performance diagnosis. |
| Start, diagnose or tune the moment-to-moment loop, pacing, session flow, or input-to-feedback timing | [Core loop](references/core-loop.md) (61K) | A loop designed backwards from the feeling wanted, with timing budgets, interruption recovery, named anti-patterns, a tuning playbook and a ship checklist. |
| Add or fix melee, ranged attacks, projectiles, hitboxes, health, attack timing, combos, cooldowns, damage formulas or defenses | [Combat and damage](references/combat.md) (34K) | A combat architecture chosen by genre, frame-timing and formula reasoning, JavaScript patterns and a ship checklist. |
| Build items, inventory, equipment slots, crafting, tooltips, stacking or drag-and-drop, or save and load them | [Inventory](references/inventory.md) (35K) | The item model and the container model kept apart, with serialization and integrity guardrails. |
| Build drops, drop tables, rarity tiers, item rolls, pity, pickups, chests or reward fanfare | [Loot](references/loot.md) (37K) | What drops, what the item is and how it feels, designed as three subsystems, with the odds checked by simulation. |
| Generate levels, terrain, dungeons, caves, placement, loot, waves, names or an endless world from a seed | [Procedural content](references/procedural-content.md) (37K) | Generators that are reproducible from a seed, tunable by a designer and playable by construction, with a recipe per kind of content. |
| Make actions feel better: timing, weight, impact, acting, camera response, sound and visual feedback | [Juice](references/juice/juice.md) (9K, plus two reference files) | The response chosen before the effect, motion that carries meaning, and the player's agency protected. |
| Build or repair grabbing, holding, throwing, two-hand handling or telekinesis of physics objects in Three.js and WebXR with Rapier | [Physics interaction](references/physics-interaction/physics-interaction.md) (34K, plus three reference files) | A design in which a held object stays a live physics body, weight comes from mass properties and leverage, every assist is explicit and repeatable, and release works when tracking drops or one hand lets go first. For one subsystem it has a focused mode. |
| Design the screen after a session ends: results, victory, game over, rewards, share card, restart | [End screens](references/end-screen.md) (21K) | The layers a results screen needs, the order they are revealed in, and a share artifact worth sharing. |

## Telling them apart

- **Orchestrate and the other seven.** Orchestrate owns the integrated loop of playing, criticising and repairing, and the handoff. It sends work to the specialists and does not replace them. For one system, skip it.
- **Juice, art direction and VFX.** Juice owns response timing, acting and feedback behavior. How the game looks, its materials, shape language, composition and visual hierarchy, belongs to art direction in `game-design-game`. Authored effects such as spells, impacts, telegraphs and particles belong to `game-make-vfx`.
- **Loot and economy.** Loot owns what drops, what the item is and how the reward lands. Currencies, XP curves, sinks and unlock pacing belong to economy in `game-design-game`. They meet at rarity: change one and check the other.
- **Inventory and loot.** Inventory owns how items are defined, stored, moved and shown. Loot owns how they are awarded.
- **Loot and procedural content.** Rolls that must come out the same from the same seed are procedural content. Odds, rarity, pity and how the reward is presented are loot. Loot's examples roll with `Math.random()`, so where rolls must be reproducible, take the generator from procedural content.
- **Physics interaction, combat and juice.** Physics interaction owns how objects are grabbed, held, thrown and collide as physics bodies. Combat owns damage and hit rules. Juice owns how the response feels.
- **Physics interaction and performance.** Its runtime guidance overlaps the Rapier and worker references in `threejs-improve-performance`, and it defaults to simulating in a worker where that skill asks for the move to be justified first. Where both are loaded, the performance skill decides whether simulation belongs in a worker.
- **Core loop and direction.** Core loop designs and tunes the loop of a game whose promise is settled. If what the game is remains open, settle it with `game-design-game` first.

## Using more than one

- For a new game or a broad upgrade, read Orchestrate first. It names the rest as the work needs them.
- Otherwise the loop comes before anything that decorates it: core loop, then the systems it needs, then juice once the action exists and works, then end screens once a session can end.
- Six of these are tens of kilobytes each. Reading two is a decision, not a default.

## What these procedures assume

- Core loop, combat, inventory, loot and procedural content are written for JavaScript games. Core loop and end screens assume mobile play, one-handed and in portrait unless the game says otherwise. On another engine or platform, keep the design reasoning, translate the code and the budgets, and say that you did.
- Physics interaction is written for Three.js, WebXR and Rapier, and says so of itself: it will not give an answer shaped for another engine. It is a draft that has been called rarely and never measured.

## What holds for every procedure

- Read the procedure the request needs and no other, unless it sends you to one. The sizes above are what each costs to load.
- A path to a file that ships with a procedure is relative to that procedure's own file. A path the procedure tells you to read, run or write in the project, such as `docs/...`, `tmp/...` or a source file, is relative to the project you are working in, never to this package.
- The destination project's instructions and the user's existing scope come first. A procedure adds judgement. It grants no authority, and it adds no approval step the user did not ask for.
- Each procedure states what it must deliver. Deliver that, and say which procedure you used.

## Other skills

Use these where they are installed. If one is absent, carry on with this package's procedures and say which judgement was not available.

- `game-design-game` when what the game is, its numbers or its look is still undecided.
- `game-make-vfx` for authored effects, and `game-design-ai` for enemies, companions, bots and directors.
- `threejs-improve-performance` for Three.js rendering, Rapier and WebXR performance.
- `plan-manage-work-spec` for a build substantial enough to need its outcome and proof written down.
- `code-write-tests` whenever code or tests change.
- `game-verify-game` to judge the running result, and `game-review-design-coherence` to ask whether the design holds together.
