---
name: game-design-game
description: "Decide what a game is, before or while it is built. Use to establish or revise a game's concept, design brief, core mechanics and scope; to bring genre knowledge (platformer, roguelike, idle, tower defense, endless runner, grid puzzle, auto-battler, MMO) to a design, tuning or critique decision; to model systems with explicit state, resources, randomness and invariants; to balance economy and progression: XP, currencies, sinks, unlock trees, difficulty, reward schedules, prestige; to design a first level that teaches through play; to architect narrative and canon for a world that runs for years; and to art-direct: visual identity, shape language, materials, composition, readability, art specs and art briefs. They design, model, tune and critique, a playable build's look included, and systems and economy carry production JavaScript. Not for assembling a whole game or for a release verdict."
license: MIT
metadata:
  gc-owner: "erik"
  gc-capability: "game-design"
  gc-engine: "agnostic"
  gc-platforms: "agnostic"
  gc-status: "draft"
  gc-tags: "game-design, direction, genre, systems, economy, onboarding, narrative, art-direction"
  gc-source: "https://github.com/erikhazzard/vasir/tree/d04347b0d515d4c3c46b5e012e2c334fdabf83bd/.agents/skills"
  gc-source-skills: "game__directing, game__genre-routing, game__designing-systems, game__tuning-economy-progression, game-onboarding__designing-game-onboarding, game-narrative__everlasting-architecture, game__art-directing, art-direction__defining-game-art"
  gc-source-revision: "d04347b0d515d4c3c46b5e012e2c334fdabf83bd"
---

# Design a Game

Decide what the game is: what the player wants, does and feels, and the rules, numbers and look that follow. These eight procedures produce briefs, models, specs and critiques. Systems and Economy also carry production JavaScript for what they model, and Art direction diagnoses a playable build as readily as a description. Putting a whole game together belongs to `game-build-game`. A release verdict on a build belongs to `game-verify-game`.

## Pick the procedure

| You are asked to | Read | What it gives you |
| --- | --- | --- |
| Set or change what the game is: concept, player intent, core mechanics, scope, or direction that has drifted | [Direct](references/direct.md) (11K) | The smallest useful design brief and the bets it makes. It owns the brief. Everything else here works inside it. |
| Make a design, tuning or critique decision that knowing the genre's conventions would change | [Genre playbooks](references/genre/genre.md) (4K selector, 43 playbook files) | The playbooks that fit the actual mechanics: platformer, roguelike, idle, tower defense, endless runner, grid puzzle, auto-battler, and a large MMO set. Read the selector, then only what it picks. A missing playbook is a gap, never a reason to change the game. The folder also holds [an analysis for reviewing an MMO whitepaper](references/genre/references/whitepaper__analyze-mmo-whitepaper/analyze-mmo-whitepaper.md), used only when asked for. |
| Model or tune a system: an economy, progression, crafting, a combat loop, loot, difficulty, unlocks, AI arbitration, systemic events | [Systems](references/systems.md) (14K) | State, resources, flows, randomness and invariants written out so they can be proven wrong, with a simulation only where the risk earns one. |
| Balance or debug XP, currencies, sinks, unlock trees, difficulty, loot rarity, reward schedules, prestige or progression pacing | [Economy and progression](references/economy.md) (37K) | Curves and schedules traced through their knock-on effects and validated by simulation, with ethical guardrails, save and load notes and a tuning playbook. |
| Design or critique a first level, an introduction with no tutorial, or how movement and combat are taught | [Onboarding](references/onboarding/onboarding.md) (14K, plus six reference files) | A beat table in which each playable situation changes one thing the player believes. Written for platformers. |
| Plan canon, world evolution, overlapping arcs, seasons, re-entry, or story for a live or persistent world | [Long-running narrative](references/narrative.md) (58K) | A narrative architecture with explicit state, canon authority, a portfolio of arcs and narrative debt, and a production cadence. |
| Define or repair how the game looks: composition, materials, shape language, visual hierarchy, animation grammar, spatial pacing, art specs | [Art direction](references/art-direction/art-direction.md) (56K, plus five reference files) | A visual system derived from where the game sits on the style spectrum, its core loop type and its viewport, with a ship checklist. |
| Write an art brief or critique for characters, environments, weapons, VFX, animation, maps or assets, in a premium 2D pixel-RPG style or a stylized 3D hero-action style | [Art briefs](references/art-briefs/art-briefs.md) (1K router, two reference packs) | A bounded brief or critique built from the matching pack. Read the router, then one pack. |

## Telling them apart

- **Direct and everything else.** Direct owns the brief. Systems, economy, onboarding and art direction work within it. If a new system would not fit the scope the brief set, take it back to Direct before designing it.
- **Systems and economy.** Systems is the modelling language for any system. Economy is the specialist for currencies, XP, unlocks and reward pacing, with JavaScript implementation. Model with Systems; balance progression numbers with Economy.
- **Art direction and art briefs.** Art direction derives a visual system for this game. Art briefs writes against two specific reference styles. If neither style is the game's, use art direction.
- **Art direction, juice and VFX.** Art direction owns what things look like: material, shape, composition. How actions respond belongs to juice in `game-build-game`. Authored effects belong to `game-make-vfx`.
- **Genre and Direct.** Genre supplies knowledge. It never writes a second brief and never widens the game to fit a genre checklist.
- **Narrative here and stories elsewhere.** This narrative procedure is architecture for a world that keeps going. One story, with its characters, plot and scenes, is `writing-create-story`.

## Using more than one

- A new game usually runs Direct, then Genre if conventions matter, then Systems or Economy for the parts with numbers, then art direction.
- Each procedure produces a document. Keep one authority: the project's own design document, or its work spec on substantial work. Add to it; do not start a rival.
- Three of these are over 35K. Reading two is a decision, not a default.

## What these procedures assume

- Systems and economy give their examples in JavaScript. Onboarding is written for platformers. Art briefs covers two styles only. Outside those, keep the reasoning, adapt the specifics, and say that you did.

## What holds for every procedure

- Read the procedure the request needs and no other, unless it sends you to one. The sizes above are what each costs to load.
- A path to a file that ships with a procedure is relative to that procedure's own file. A path the procedure tells you to read, run or write in the project, such as `docs/...`, `tmp/...` or a source file, is relative to the project you are working in, never to this package.
- The destination project's instructions and the user's existing scope come first. A procedure adds judgement. It grants no authority, and it adds no approval step the user did not ask for.
- Each procedure states what it must deliver. Deliver that, and say which procedure you used.

## Other skills

Use these where they are installed. If one is absent, carry on with this package's procedures and say which judgement was not available.

- `game-review-design-coherence` to pressure-test whether the fantasy, loop, incentives and pillars hold together.
- `game-build-game` to build what these procedures specify.
- `game-design-ai` for enemy, companion, bot and director behavior.
- `plan-manage-work-spec` when the design feeds a substantial build that must stay pointed at its outcome.
- `product-design-social-loops` for invite, share, challenge and co-play loops, creator supply, and how the game reaches people. That is distribution, and it is a package of its own.
- `writing-create-story` and `writing-style-prose` for a single story and for prose.
