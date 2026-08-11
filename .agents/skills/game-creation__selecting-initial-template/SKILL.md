---
name: game-creation__selecting-initial-template
description: Selects the initial Idavoll game creation template and orchestrates the autonomous first-playable proof/repair loop for new games. Use during create-game initialization, first-playable scaffolding, local starter-template selection, or "make/build/create this game" requests after a spec exists.
---

# Game Creation Initial Template Selector

Choose the smallest Idavoll starter template that makes the first playable easier without smuggling backend/frontend template routing back into Studio.

## Core Principle

The template is a substrate, not a product decision: pick the least powerful template that can honestly support the spec, copy/adapt it only when the workspace needs a scaffold, then immediately build the actual game.

All games are mobile-native portrait products. Desktop, web, and landscape are secondary concerns and must not become the proof target for first-playable readiness.

This skill is also the create-game initialization root. Studio and local Codex must use the same skill stack; Studio may prepare the workspace, but it must not secretly route prompts, choose templates, or inject hidden design rules that local Codex cannot run.

When a creator explicitly asks to make, build, create, initialize, or finish a game, that request is durable approval evidence for the named first-playable scope — not “full approval.” Record the actor, source, date, exact scope, and current spec revision; exclude publish/deploy, destructive, external-message, and unrelated product decisions unless the request includes them. Within that current scope, proceed through implementation and proportional proof without repeatedly asking permission. If the creator requested spec-only or approval-first work, do not launch.

## Applicable Initialization Skill Routes

After reading the approved `README__game-spec.md`, load only the local skills whose judgment the game actually needs. This list is routing, not an artifact or skill-count quota:

1. **Template substrate**: this skill chooses the starter template and states `Selected template: <template path> - <reason>.`
2. **Game direction**: use `game__directing` for coherence unless a narrower genre skill is clearly the stronger fit.
3. **Genre/system skill**: use `game__genre-routing`, combat, loot, inventory, economy, or procedural skills when the spec meaningfully depends on that domain. Route auto-battlers, tactics drafts, shop/bench/board games, party synergies, or automated combat after player setup through `game__genre-routing`.
4. **Art direction**: use `game__art-directing` before implementing the first screen if the game has any visual world, characters, enemies, cards, pieces, board, arena, or branded object language.
5. **Player-facing shell UI**: use `ui__revamping-game-shell-ui` for any HUD, card row, upgrade/draft surface, controls, pause, results, or runtime overlay. A first playable is not complete if the first screen is generic debug chrome.
6. **First-playable comprehension proof**: when the user requests an audit or a specific false-first-playable/mobile-comprehension risk warrants independent review, `game-proof__auditing-first-playable-comprehension` can own that focused review. Do not add another audit merely because the skill exists.
7. **Juice/polish**: use `game__adding-juice` once the loop is readable, especially for taps, hits, kills, rewards, transitions, and failure.

Do not paste these skill bodies into the prompt. Let Codex load the skills normally from `.codex/skills` or `.agents/skills`. If a required skill is missing, say which skill is missing, use the nearest available repo guidance, and treat that as a skill-sync bug to fix rather than a reason to invent backend prompt choreography.

## Autonomous First-Playable Algorithm

Run this algorithm until the workspace reaches exactly one terminal state: `Ready`, `Candidate`, or `Blocked`.

0. **Authority pass**: confirm the creator requested make/build/create/initialize/finish or otherwise approved autonomous implementation. If the creator asked for spec-only or approval-first work, do not run this algorithm.
1. **Spec pass**: read `README__game-spec.md`. If it is missing, placeholder, vague, or contradicted by the creator request, invoke `game-creation__writing-game-spec`; after the spec is written, continue unless that skill stopped for explicit approval-first handling.
2. **Template pass**: inspect local template inventory, choose the smallest viable substrate, and emit `Selected template: <template path> - <reason>.`
3. **Skill-routing pass**: load the applicable routes above. Record only decisions a skill materially changes; no ledger entry exists just to prove a skill was mentioned.
4. **Build pass**: adapt or create the actual game loop, controls, feedback, UI, and assets required by the approved spec. Add tests, simulations, metadata hooks, or new harness code only when a specific material failure cannot be guarded more simply.
5. **Proof pass**: map plausible material failures to sufficient existing evidence, the cheapest warranted proof, or an authorized narrowed claim. Observe the real player loop at its public surface. A 390 x 844 portrait render is the mobile authority seam when visual/mobile truth is being proved; a stored screenshot, video, browser harness, simulation, or durable test is not automatic.
6. **Optional audit pass**: run one focused independent review only when the user requests it or a named high-regret risk warrants independent judgment. Add gameplay/UI/art/QA lenses only for the specific blind spot; otherwise proceed without an audit.
7. **Repair pass**: fix the highest-severity in-scope blocker, rerun only affected proof, and return the resolution to the terminal verdict. Do not drift into unrelated polish while a real blocker remains.
8. **Terminal-state pass**:
   - `Ready`: the public player loop shows action, immediate feedback, state consequence, later outcome, and result/restart; all warranted objective proof and required human acceptance are current; the claim is no broader than that evidence.
   - `Candidate`: the game runs and has a plausible loop, but subjective feel, art/readability, metadata, or proof depth still needs human review or another pass.
   - `Blocked`: a missing tool, API key, package, auth state, unsafe/copyright ambiguity, or impossible proof dependency prevents the required loop.

### Subagent Lanes

Delegate only when a bounded lane repays spawn overhead or a warranted audit requires independent conversational review. The root agent remains responsible for integration, final files, and the terminal state. The lanes below are optional lenses, not a mandatory four-agent fan-out.

- **Gameplay/agency auditor**: checks core verb, meaningful choice, feedback, state consequence, and renewed intent.
- **UI/comprehension auditor**: checks first frame, controls, HUD, overlays, results, labels, and mobile readability.
- **Art/assets auditor**: checks game-specific visual identity, generated/promoted bitmap assets, sprite/background readability, and placeholder leakage.
- **QA/proof auditor**: checks warranted tests, builds, browser artifacts, screenshots/video, metadata readiness, and missing proof.

Use the existing repo folder throughout (root §7). Subagents may read broadly; they may edit only when the root agent assigns a narrow file lane. If an independent terminal reviewer is required but unavailable, report that exact blocker; do not manufacture several same-conversation “independent” audits.

## Skill Evidence Ledger

When multiple skills materially influence the build, keep a compact ledger of the skills actually used:

```text
Skill Evidence Ledger:
- <skill-name>: <decision/result it changed> -> <artifact, code path, screenshot, sim, or proof it affected>
```

The ledger is not ceremonial. If a skill does not change a design decision, implementation decision, proof target, or handoff risk, omit it. A single-skill lane needs no empty ledger; completion depends on the player journey and warranted proof, not a skill count.

## First-Screen Quality Check

Before calling initialization done, inspect the first playable screen through the narrowest faithful preview already available. Retain a durable visual artifact only when later human review, expensive/non-regenerable evidence, or handoff needs it. Reject the experience if any of these are true:

- The inspected authority surface is not mobile portrait when the product claim is mobile portrait; 390 x 844 is the default reference size, not an automatic screenshot requirement.
- The screen reads as instrumentation, debug HUD, or generic neon prototype instead of the game promised by the spec.
- The first viewport has no strong subject-matter signal: no readable enemy, board, avatar, place, object, card art language, or game-specific interaction focus.
- The stage is mostly empty while UI chrome carries the experience.
- Live HUD/status appears as detached pill/card/dashboard clutter instead of stage-first overlay posture.
- Touch targets, labels, or card text are too small at 390 x 844 portrait; 320-430px width variants are secondary stress checks, not replacements.
- The palette is a one-note dark blue/purple/neon or beige/brown theme without a deliberate art-direction reason.
- A player-facing control, result, draft, or upgrade surface bypasses the Idavoll UI-kit posture expected by `ui__revamping-game-shell-ui`.

The check is done only when the player loop and first-screen visual quality agree at the claimed authority surface. Deterministic proof is required only for a deterministic claim or risk.

## First-Playable Value-Path Observation

The terminal claim must observe a real player loop, not only a boot screen or result overlay. Keep a durable packet only when later inspection or human acceptance needs it:

1. **First frame**: the player can identify what is interactive and what situation they are in.
2. **Intentional player action**: a tap, drag, swipe, placement, choice, or movement that is not merely tap-to-continue.
3. **Immediate feedback**: visible response within the game surface, not only a hidden state counter.
4. **State consequence**: board, score, survival, position, build, enemy intent, inventory, route, or outcome changes because of the action.
5. **Later outcome**: win, loss, survival, failure, reward, enemy defeat, route open, combo, or other consequence that follows from the earlier choice.
6. **Result / restart**: terminal or loop-reset state that explains what happened and what to try next.

Invalid proof:

- a timeline whose frames are all results, loading, splash, or modal states;
- proof that relies on forced fast-results mode;
- a deterministic sim diff with no player-readable observation at the authority surface;
- screenshots that already show missing art, opaque sprite boxes, mismatched identity, distortion, unreadable UI, or hidden causality.
- desktop-only or landscape-only observation used as a substitute for a mobile-portrait claim.

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

Use the Autonomous First-Playable Algorithm above as the controlling loop. These template mechanics are the substrate-selection subroutine inside that algorithm:

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
9. Use the applicable skill routes above and record only material decisions before declaring the first playable complete.
10. Observe the First-Playable value path, retain only necessary artifacts, and loop through affected Proof -> Repair until `Ready`, `Candidate`, or `Blocked`; run a terminal audit only when explicitly requested or warranted by a named high-regret risk.
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

Name the selected template and reason before implementation begins, then repeat it in the final response alongside material skill decisions, game changes, the observed player journey, retained artifacts, exact proof commands/actions, and anything not run. If you ran metadata ensure, report `ready`, `queued`, or the blocking status plainly.

## Routing Boundaries

- Use this skill for create-game initialization, starter-template selection, and autonomous first-playable creation from a concrete `README__game-spec.md`.
- Do not use this skill for narrow polish or juice work after the substrate is already correct; use the focused gameplay, UI, art, or proof skill instead.
- If a genre/system skill also applies, this skill owns only the substrate decision and first-playable orchestration; the genre/system skill owns domain mechanics.
- Template selection must follow mechanics, not theme language: collisions do not imply Rapier, and fantasy depth does not imply 3D.
- Proof exhaustion still wins over optimism: if the browser proof lacks player action and consequence, return `Candidate` or repair instead of claiming `Ready`.
