---
name: game-creation__writing-game-spec
description: Writes and revises the canonical README__game-spec.md for Studio game creation. Use when a Studio game has no README__game-spec.md, the creator asks to make a new game, or an existing game spec is too vague to support template selection and first-playable implementation.
---

# Game Creation Spec Writer

Create the smallest durable game brief that lets Codex build a coherent first playable without Studio backend prompt choreography.

## Core Principle

`README__game-spec.md` is the creator-approved game contract, not a backend work plan. It should be readable by a human, useful to game-building skills, and specific enough for template selection, implementation, QA, metadata generation, and publish readiness.

## When To Use

- A Studio game workspace has no `README__game-spec.md`.
- The creator prompt describes a new game and no approved spec exists yet.
- The existing spec is placeholder/generic, contradicts the creator prompt, or cannot answer what the first playable must prove.
- A later creator request explicitly asks to revise the game spec.

## Non-Negotiables

1. In a missing-spec Studio game creation turn with no prior Studio question answers, ask the creator one initial question batch before creating `README__game-spec.md`, even if the prompt seems specific enough.
2. Do not create backend `docs/work/**`, eval plans, implementation plans, XML status blocks, or product-code scaffolds during the spec-only turn.
3. The initial Studio question batch should contain 1-3 concise questions that most affect genre focus, input model, platform orientation, theme boundaries, implementation substrate, or first-playable proof. Include exactly one valid fenced JSON block with `"kind": "studio_questions"` matching the Studio question-card shape, then stop before editing files.
4. After the creator answers the initial Studio question batch, create or revise only `README__game-spec.md` unless the creator explicitly asks for other files.
5. Avoid copyrighted game names, characters, assets, UI, story, and exact mechanic bundles. Capture inspiration as broad design intent.
6. Make the first playable concrete: one primary action, one success loop, one failure pressure, one feedback language, and one proof command/check.

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

After creating or revising `README__game-spec.md`, stop for creator approval unless the creator explicitly approved autonomous implementation. In the visible response, name that the spec is ready and summarize the first playable in one sentence.

## Skill Eval Cases

- Should trigger question-first: "Make me a mobile fantasy battler" in a Studio workspace with no `README__game-spec.md`.
- Should trigger spec creation: the creator answers the initial Studio question batch in a workspace with no `README__game-spec.md`.
- Should trigger: "The spec is too vague, rewrite it before building."
- Should trigger: "Ask me whatever you need before creating the game doc."
- Should not trigger: "Implement the approved spec" when `README__game-spec.md` is already concrete and approved.
- Borderline: If the creator asks for both a new game and immediate implementation, write the spec first, then continue only if approval/autonomy is explicit.
