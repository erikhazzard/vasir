---
name: game-creation__selecting-initial-template
description: Selects the initial Idavoll game creation template and orchestrates the first-playable skill stack for new games. Use during create-game initialization, first-playable scaffolding, or local starter-template selection; keeps template, genre, art/UI, juice, and proof judgment inside Codex skills rather than Studio backend/frontend routing.
---

# Game Creation Initial Template Selector

Choose the smallest Idavoll starter template that makes the first playable easier without smuggling backend/frontend template routing back into Studio.

## Core Principle

The template is a substrate, not a product decision: pick the least powerful template that can honestly support the spec, copy/adapt it only when the workspace needs a scaffold, then immediately build the actual game.

This skill is also the create-game initialization root. Studio and local Codex must use the same skill stack; Studio may prepare the workspace, but it must not secretly route prompts, choose templates, or inject hidden design rules that local Codex cannot run.

## Required Initialization Skill Stack

After reading the approved `README__game-spec.md`, explicitly load or invoke the relevant local skills in this order:

1. **Template substrate**: this skill chooses the starter template and states `Selected template: <template path> - <reason>.`
2. **Game direction**: use `game__directing` for coherence unless a narrower genre skill is clearly the stronger fit.
3. **Genre/system skill**: use the closest `game__genre--building-*`, combat, loot, inventory, economy, or procedural skill when the spec meaningfully depends on that domain. Use `game__genre--building-auto-battler-tactics` for auto-battlers, tactics drafts, shop/bench/board games, party synergies, or automated combat after player setup.
4. **Art direction**: use `game__art-directing` before implementing the first screen if the game has any visual world, characters, enemies, cards, pieces, board, arena, or branded object language.
5. **Player-facing shell UI**: use `design__designing-game-ui-for-idavoll` for any HUD, card row, upgrade/draft surface, controls, pause, results, or runtime overlay. A first playable is not complete if the first screen is generic debug chrome.
6. **First-playable comprehension proof**: use `game-proof__auditing-first-playable-comprehension` to inspect whether a zero-context player can understand goal, action, consequence, score, phase, and win/loss before claiming initialization done.
7. **Juice/polish**: use `game__adding-juice` once the loop is readable, especially for taps, hits, kills, rewards, transitions, and failure.

Do not paste these skill bodies into the prompt. Let Codex load the skills normally from `.codex/skills` or `.agents/skills`. If a required skill is missing, say which skill is missing, use the nearest available repo guidance, and treat that as a skill-sync bug to fix rather than a reason to invent backend prompt choreography.

## Skill Evidence Ledger

Before implementation begins, keep a compact ledger of every required skill:

```text
Skill Evidence Ledger:
- <skill-name>: <decision/result it changed> -> <artifact, code path, screenshot, sim, or proof it affected>
```

The ledger is not ceremonial. If a required skill does not change a design decision, implementation decision, proof target, or handoff risk, it was not meaningfully used. Do not claim complete with a missing or empty ledger; report a blocked or candidate state instead.

## First-Screen Quality Gate

Before calling initialization done, capture or run the narrowest available preview/QA proof and inspect the first playable screen. Fail the pass and revise if any of these are true:

- The screen reads as instrumentation, debug HUD, or generic neon prototype instead of the game promised by the spec.
- The first viewport has no strong subject-matter signal: no readable enemy, board, avatar, place, object, card art language, or game-specific interaction focus.
- The stage is mostly empty while UI chrome carries the experience.
- Live HUD/status appears as detached pill/card/dashboard clutter instead of stage-first overlay posture.
- Touch targets, labels, or card text are too small to read at 320-430px portrait width.
- The palette is a one-note dark blue/purple/neon or beige/brown theme without a deliberate art-direction reason.
- A player-facing control, result, draft, or upgrade surface bypasses the Idavoll UI-kit posture expected by `design__designing-game-ui-for-idavoll`.

The pass is done only when mechanics, deterministic proof, and first-screen visual quality all pass together.

## First-Playable Proof Packet

The proof packet must show a real player loop, not only a boot screen or result overlay:

1. **First frame**: the player can identify what is interactive and what situation they are in.
2. **Intentional player action**: a tap, drag, swipe, placement, choice, or movement that is not merely tap-to-continue.
3. **Immediate feedback**: visible response within the game surface, not only a hidden state counter.
4. **State consequence**: board, score, survival, position, build, enemy intent, inventory, route, or outcome changes because of the action.
5. **Later outcome**: win, loss, survival, failure, reward, enemy defeat, route open, combo, or other consequence that follows from the earlier choice.
6. **Result / restart**: terminal or loop-reset state that explains what happened and what to try next.

Invalid proof:

- a timeline whose frames are all results, loading, splash, or modal states;
- proof that relies on forced fast-results mode;
- a deterministic sim diff with no player-readable browser artifact;
- screenshots that already show missing art, opaque sprite boxes, mismatched identity, distortion, unreadable UI, or hidden causality.

## Expertise Payload

| Expertise type | What this skill encodes |
|---|---|
| Hard-won insight | Heavy templates make simple games slower and harder to repair; most generated games need readable control/feedback loops more than physics machinery. |
| Hidden constraint | Studio backend/frontend should not choose the starter template. Codex chooses from local files after reading the spec and available template inventory. |
| Value hierarchy | Spec fit wins first, simplicity second, implementation speed third. Do not pick Rapier just because the game has collisions. |
| Tradeoff boundary | Physics templates are right when rigid-body simulation is central to play, not when physics is visual polish or simple overlap math. |
| Failure scar | Copying a template and stopping is false progress; the copied scaffold must be adapted into the actual first playable. |
| Failure scar | Passing tests, build, selector QA, or a results overlay can still produce a fake playable unless the proof packet shows action and consequence. |

## What To Read First

1. `README__game-spec.md` if it exists.
2. Available template roots under `tools/idv/data/game-template*`.
3. For plausible templates, inspect `README.md`, `studio.starter-template.json`, `package.json`, `idavoll.game.json`, and local `AGENTS.md` if present.
4. Existing workspace files, because the workspace may already be seeded or partially built.

## Template Decision Table

| Template | Use when | Avoid when |
|---|---|---|
| `tools/idv/data/game-template` | Most 2D arcade, puzzle, grid, card, idle, UI-heavy, custom-collision, authored-movement, or simple action games. | The core mechanic requires real rigid-body simulation or true 3D space. |
| `tools/idv/data/game-template-bullet-heaven-2d` | The spec is centered on arena survival, many enemies, projectile streams, radial attacks, pickups, waves, or upgrade choices under constant pressure. | The game has only a few authored enemies, discrete puzzles, card/menu decisions, or non-combat timing challenges. |
| `tools/idv/data/game-template-character3d` | The spec needs a controllable 3D character, third-person camera, authored spatial navigation, or avatar-centric 3D presentation without heavy rigid-body simulation. | The game is 2D/fake-depth, menu/UI-heavy, or needs full rigid-body physics as the core mechanic. |
| `tools/idv/data/game-template-rapier-2d` | 2D rigid-body simulation is central: stacking, impulses, swinging, ropes, pinball, breakables, physics puzzles, collision-driven toys. | The game only needs overlap checks, tile collisions, projectile hits, knockback, or visual screen shake. |
| `tools/idv/data/game-template-rapier-3d` | The spec needs a real 3D scene: third-person movement, vehicles, rolling worlds, spatial playgrounds, depth-aware puzzles, or 3D physics. | The game is 2D with perspective styling, fake depth, or cosmetic 3D language. |

## Workflow

1. Classify the gameplay substrate from the spec:
   - dimensionality: 2D, fake-depth 2D, or real 3D;
   - physics centrality: none/simple overlaps, authored collisions, or rigid-body simulation;
   - controls/camera: screen-space, world-space 2D, or spatial 3D.
2. Inspect template inventory from the local `tools/idv/data/game-template*` roots. Treat `studio.starter-template.json` and each template README as the source of truth when the local inventory differs from this summary table.
3. Choose the smallest viable template using the decision table.
4. Before copying, adapting, or implementing files, state this visible line in the turn: `Selected template: <template path> - <one-sentence reason>.`
5. Copy/adapt a template only when the workspace lacks a usable scaffold or is clearly on the wrong substrate.
6. Preserve creator/authored truth:
   - never overwrite `README__game-spec.md`;
   - never overwrite `README__studio-ai-master-state.md`;
   - never overwrite `marketing/icon.webp` or user-authored assets without a direct reason.
7. Replace template placeholders such as `{{GAME_ID}}` and `{{TITLE}}` from the spec or existing workspace metadata.
8. Immediately adapt the scaffold into the actual game loop, controls, feedback, and validation path.
9. Run the Required Initialization Skill Stack above and maintain the Skill Evidence Ledger before declaring the first playable complete.
10. Capture the First-Playable Proof Packet. If any required proof segment is missing, hand off as "candidate first playable" or "blocked proof", not complete.
11. Once `README__game-spec.md` exists and the workspace is ready for publish/share metadata, run `node .studio-ai-runtime/tools/studio/ensure-game-metadata.js --json` from the Studio workspace when that tool is available. Treat queued marketing generation as an explicit handoff state, then rerun with `--require-ready` only when readiness must be proven before publish.

## Anti-Patterns

- **Backend recommendation chasing**: waiting for or asking Studio for a template recommendation. Instead: inspect local templates and choose directly.
- **Physics by keyword**: choosing Rapier because the spec says "collision", "bounce", or "enemy hit". Instead: choose Rapier only when simulation behavior is central.
- **3D by theme**: choosing 3D because the fantasy says "world", "arena", or "depth". Instead: choose 3D only when spatial play needs real 3D coordinates/camera.
- **Template as deliverable**: copying files and calling initialization done. Instead: the deliverable is a first playable aligned to the spec.
- **Template hoarding**: copying several starters or leaving unused template folders. Instead: choose one substrate and keep the workspace clean.
- **Hidden metadata hope**: assuming Studio will infer ontology tags or marketing art from the create-game turn. Instead: call the explicit metadata ensure tool when the spec is ready or publish-readiness is requested.
- **Results-overlay proof**: recording only the terminal modal and calling it gameplay. Instead: capture action, immediate feedback, consequence, later outcome, and result.
- **Self-certified skill stack**: saying "coherent" without naming the skills, decisions, artifacts, and unresolved risks. Instead: provide the Skill Evidence Ledger.

## Handoff Note

Name the selected template and reason before implementation begins, then repeat it in the final response alongside the Skill Evidence Ledger, game changes, preview/QA proof packet, and proof commands. If you ran metadata ensure, report `ready`, `queued`, or the blocking status plainly.

## Skill Eval Cases

- Should trigger: "Initialize this Studio game from `README__game-spec.md`."
- Should trigger: "Pick the best starter template and make the first playable."
- Should trigger: "The spec is a pinball-like 2D physics toy with bumpers and impulse chains."
- Should not trigger: "Add juice to an already built game without changing its substrate."
- Borderline: "Make a 2D platformer with collision and knockback" should default to `game-template`, not Rapier, unless rigid-body simulation is central.
- Collision boundary: if a genre skill also triggers, use this skill only for the initial substrate/template decision, then use the genre skill for game-specific implementation judgment.
- Attention-drift case: if tests, build, `npm run qa`, and a results timeline pass but the proof packet lacks player action and consequence, the skill must force a candidate/blocked handoff instead of complete.
