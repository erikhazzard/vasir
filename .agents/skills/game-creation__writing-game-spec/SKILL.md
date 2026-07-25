---
name: game-creation__writing-game-spec
description: Writes and revises the canonical README__game-spec.md for Studio game creation. Use when a Studio game has no README__game-spec.md, the creator asks to make a new game, or an existing game spec is too vague to support template selection and first-playable implementation.
---

# Game Creation Spec Writer

Create the smallest durable game brief that lets Codex build a coherent first playable without Studio backend prompt choreography.

## Core Principle

`README__game-spec.md` is the creator-approved game contract, not a backend work plan. It should be readable by a human, useful to game-building skills, and specific enough for template selection, implementation, QA, metadata generation, and publish readiness.

When the creator says "make", "build", "create", or otherwise asks for a game, spec writing is a launch ramp, not a stop sign: infer safe defaults, write the spec, and continue into first-playable creation unless the creator explicitly asked for spec-only or approval-first work.

## When To Use

- A Studio game workspace has no `README__game-spec.md`.
- The creator prompt describes a new game and no approved spec exists yet.
- The existing spec is placeholder/generic, contradicts the creator prompt, or cannot answer what the first playable must prove.
- A later creator request explicitly asks to revise the game spec.

## Non-Negotiables

1. Default to assumption-first game creation. If the creator prompt describes a new game, infer reasonable defaults and create or revise `README__game-spec.md` without an initial question round.
2. Ask questions only when an unanswered choice would materially change the game, implementation substrate, proof gate, asset direction, safety boundary, or copyrighted-reference boundary and there is no safe conservative default.
3. Do not create backend `docs/work/**`, eval plans, XML status blocks, or platform planning artifacts from this skill. If the current turn is explicitly spec-only, do not create product-code scaffolds.
4. If the creator explicitly asks to be questioned first, ask one concise plain-text batch with 1-3 questions. Use this shape: `1. Question: <...>. Recommendation: <recommended default>; Alternative: <credible alternative>.` Do not use JSON, XML, fenced code blocks, or machine-readable question cards for this batch. Then stop before editing files.
5. If the creator explicitly asks for spec-only, review-before-build, or approval-first work, create or revise only `README__game-spec.md` and stop for approval.
6. If the creator asked to make, build, create, implement, initialize, or finish the game, continue after writing the spec by invoking `game-creation__selecting-initial-template` in the same session.
7. Avoid copyrighted game names, characters, assets, UI, story, and exact mechanic bundles. Capture inspiration as broad design intent.
8. Every game spec defaults to **mobile-native portrait**. Desktop, web, and landscape may appear only as additional surfaces; they are secondary concerns.
9. Make the first playable concrete: one primary action, one success loop, one failure pressure, one feedback language, and one proof command/check.

## Spec Hazard Audit

Before writing or approving the spec, classify whether it creates a false-playability hazard. A hazard exists when a spec can produce a running screen that looks like a game while the player's agency, comprehension, or causality is still unproven.

Hard red flags:

- auto-combat, auto-run, idle resolution, scripted survival, or any loop where the most visible action happens after the player stops acting;
- timer-driven phase changes, auto-started matches, auto-advance rewards, or fast results;
- no instruction text or tutorial-free onboarding without an explicit visual teaching plan;
- high-information genres such as auto-battler, tactics, deckbuilder, roguelike, management, economy, tower defense, or strategy;
- hidden scoring, hidden enemy intent, hidden build effects, hidden win/loss causes, or "score went up" as the main payoff;
- art-dependent readability: sprites, cards, tiles, boards, enemies, inventory items, or class icons must carry game meaning.

If any red flag appears, the spec must encode the proof obligations inside the existing required sections rather than adding a custom section:

- `Feed-First Instant Play Contract`: name the first intentional player action, its immediate visible feedback, and the first visible consequence. A timeout/default action cannot be the proof path.
- `Core Loop`: define `player action -> game response -> state consequence -> renewed intent`; for auto-resolving games, name the prior decision that changes the outcome and how the player reads why.
- `Feedback + Juice Spec`: state how the player learns phase transitions, enemy threat, damage, death, score, win/loss, and next action without relying on prose.
- `Acceptance Criteria`: require a proof packet that shows first frame, player action, immediate feedback, consequence, later outcome, and result. Results-only proof is invalid.
- `Technical Envelope` / platform sections: state mobile-native portrait as the primary runtime and require a fresh 390 x 844 portrait screenshot for first-playable approval.
- `Visual Contract` / art sections: require runtime asset identity and layering rules when sprites/cards/units carry gameplay meaning.

Do not treat "no instruction text" as a quality bar by itself. It is only acceptable when composition, affordance, animation, feedback, and failure pricing teach the first action and consequence.

## Required `README__game-spec.md` Template

Use the canonical template file exactly:

1. In Studio workspaces, read `.studio-ai-runtime/docs/llm/create-game-spec-format.md` first.
2. If that workspace runtime copy is missing, read `docs/llm/create-game-spec-format.md`.
3. If neither file exists, stop and report that the canonical game-spec template is missing. Do not invent a fallback format.

The required `README__game-spec.md` content is the numbered format under `# REQUIRED README__game-spec.md FORMAT:` in that file. Preserve the section order and section names from the template, including `## 1. One-Line Promise`, `## 2. Feed-First Instant Play Contract`, and the remaining numbered sections through `## 20. **Game Inspiration**`.

Do not use the older short format with sections like `## One-Sentence Pitch`, `## Player Promise`, `## Platform & Session`, or `## Acceptance Criteria`; that format is obsolete for Studio game creation.

## Quality Bar

- The title and pitch should be original even when the creator gives a reference game.
- Each system bullet must expose the player decision, state change, and feedback; a noun list is not enough.
- Acceptance criteria must be observable in the first playable, not aspirational future features.
- Acceptance criteria must require a 390 x 844 portrait screenshot that proves the first playable reads at mobile-native size.
- The technical envelope should guide `game-creation__selecting-initial-template` without choosing a template because of theme words alone.
- If the spec needs metadata later, leave enough visual/theme detail for `node .studio-ai-runtime/tools/studio/ensure-game-metadata.js --json` to produce ontology and marketing assets.
- If the spec uses automation, timers, or indirect strategy decisions, it must make the player's readable decision and readable consequence stronger than the automation.

## Anti-Patterns

- **Genre soup**: "RPG roguelike idle battler with crafting and PvP" without one primary moment-to-moment action.
- **Reference cloning**: copyrighted names, exact assets, exact UI, or exact progression from a commercial game.
- **Plan leakage**: filling `README__game-spec.md` with task lists, implementation milestones, or backend Work Spec XML.
- **Hidden substrate choice**: saying "3D world" when gameplay is actually 2D screen-space decisions.
- **Unprovable acceptance**: criteria like "feels fun" without concrete readable state, controls, loop completion, and local proof.
- **Autoplay alibi**: specifying auto-combat, auto-start, or auto-advance while failing to specify the decision that makes the automated outcome intelligible.
- **Tutorial-free cargo cult**: banning text while not designing visual affordances, safe first action, feedback, and recovery that teach the rule.

## Handoff

After creating or revising `README__game-spec.md`, stop only when the creator explicitly asked for spec-only, approval-first, or ask-first work. Otherwise, a direct “make/build/create this game” request is approval evidence for the exact game/first-playable scope at the current spec revision; preserve that actor/source/date/scope boundary when routing into `game-creation__selecting-initial-template`. It does not authorize publish/deploy, destructive, external-message, or unrelated product work.

In the visible response, state the assumptions briefly and summarize the first playable in one sentence. Do not present assumptions as a blocker unless they are genuinely unsafe, copyrighted, impossible, or proof-changing.

## Mode Boundaries

- **Autonomous creation**: missing or vague spec plus a make/build/create request means write the spec from assumptions, then continue into first-playable creation.
- **Ask-first**: ask questions only when the creator explicitly asks to be questioned first, or when no safe assumption exists for a proof-changing decision.
- **Spec-only**: stop after `README__game-spec.md` only when the creator explicitly asks for spec-only, review-before-build, or approval-first work.
- **Approved-spec implementation**: when a concrete spec already exists and the creator asks to implement it, skip this skill and use `game-creation__selecting-initial-template`.
