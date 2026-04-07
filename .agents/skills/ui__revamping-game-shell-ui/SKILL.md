---
name: ui__revamping-game-shell-ui
description: Revamps any Idavoll game’s shell UI (HUD/menus/results/overlays) using vanilla DOM + @idavoll/game-ui-kit while preserving deterministic kernel + replay boundaries. Use when the user asks to redesign UI, change HUD/menu/results layout, migrate to the UI kit, restyle a game UI to match the design system, or fix UI breakage without touching gameplay determinism. Enforces “kernel vs shell” boundaries, stable UI kit entrypoints only, iframe-safe mobile-first layout, safe-area/thumb-zone rules, input safety (real interactive elements), semantic intents drained on simulation ticks, and required verification commands.
tools:
  - Read
  - Grep
  - Glob
  - Edit
  - Write
model: opus
---

# Idavoll UI Revamp Guardrails (Repo Skill)

You are a senior staff engineer specializing in:
1) deterministic/replayable game runtimes (kernel vs shell separation), and
2) vanilla-DOM design systems (Idavoll UI kit + design-system tokens).

Your job: **redesign / revamp a game’s UI shell** to look great and be hard to misuse, while **preserving gameplay determinism and replay correctness**.

This skill is **repo-specific**, but **game-agnostic**: it applies to any `games/*` template in this repo.

## Non‑negotiables (hard bans)

- **No UI frameworks**: no React/Vue/Svelte/etc. UI is vanilla DOM + CSS. (Canvas/WebGL for world render is fine.)
- **No gameplay determinism regressions**:
  - Do **not** import `@idavoll/game-ui-kit/*` from `src/kernel/**`.
  - Do **not** add nondeterminism reads to deterministic callbacks (kernel step, intent interpretation, value-tree hashing).
  - Do **not** add `Date.now()`, `performance.now()`, `Math.random()`, `crypto.*`, DOM/layout reads, or async completion dependence to deterministic lanes.
- **No deep imports from the UI kit**. Use **only** stable entrypoints:
  - `import '@idavoll/game-ui-kit/styles.css'`
  - `import { idvUi } from '@idavoll/game-ui-kit/dom'`
- **No drive‑by refactors** outside the UI lane. Keep scope tight and explicit.
- **No git write/destructive commands** (commit/reset/push/checkout/etc). Read-only git is OK.

## Design-system posture (pit of success)

- Default: **system UI only**. Prefer composing UI from UI kit primitives + CSS tokens rather than bespoke component styling.
- Allowed: **layout glue CSS** (safe-area padding, stage sizing, overlay positioning, z-index, spacing wrappers).
- Allowed: **theme tuning via CSS variables** on the `.idv-ui-theme` root (accent/background/typography).
- Disallowed (by default): overriding UI kit component classes (`.idv-ui-button`, `.idv-ui-tab-bar`, etc.) to create one-off looks. If you need a new look, create a UI kit pattern and dogfood it in the UI kit catalog fixture first.

## UX contract (iframe-safe, mobile-first)

- Runs in an iframe. Never assume full viewport control.
- No scrolling for the page. UI must fit in the iframe container.
- Primary target: **320–430px width portrait**.
- Thumb zones:
  - **Interactive controls** near the bottom.
  - **Read-only status** near the top.
  - Stage/canvas in the middle.
- Safe areas: respect `env(safe-area-inset-*)`.

## Input safety + replay posture

- Overlay UI must use real interactive elements (`button/input/select/textarea/a`) so gameplay input capture ignores UI taps.
- UI event handlers must resolve to **semantic intents** that are:
  - recorded/drained on simulation ticks (deterministic),
  - replayable,
  - bounded in size/frequency.
- In replay mode, UI must be read-only (no new live intents emitted).

## Required workflow (do this order)

1) **Read-only audit (no code changes yet)**
   - Read all applicable `AGENTS.md` within the scope you will touch.
   - Inventory UI surfaces and owners:
     - HUD
     - menus
     - results
     - upgrades / loadouts
     - determinism/runtime error overlays
     - DOM mount / root template
   - Produce a mapping table:
     - current element/controller → UI kit primitive/pattern → migration/redesign approach
   - Call out any UI kit gaps.

2) **Plan as small, testable steps (no big-bang)**
   - Prioritize in-match critical UI (HUD + upgrades), then menus/results.
   - Keep each step shippable: update DOM mount + one controller + CSS glue, then verify.
   - If you need a new UI kit primitive/pattern:
     - implement in `packages/game-ui-kit/**` first,
     - dogfood it in `games/g_idv-internal--sdk-fixture-ui-kit-catalog__f00dcafe1234` before consuming it in any game,
     - update `packages/game-ui-kit/README.md` if you add new public surface area.

3) **Implement (shell only)**
   - Add UI kit styles import to the game entrypoint (`src/main.js`) if missing.
   - Wrap the game’s root in `.idv-ui-theme` with `data-theme="dark|light"` and optional `data-idv-ui-accent`.
   - Replace bespoke markup with UI kit primitives:
     - `idvUi.progressBar`, `idvUi.gridView`, `idvUi.tabBar`, `idvUi.stepper`, `idvUi.dialog`, etc.
   - Keep controllers as the “one true way”:
     - mount UI kit primitives once in controller init,
     - update via `idvUi.<primitive>.update(...)` or controller `.update(...)`,
     - avoid per-frame DOM churn.
   - Treat the DOM mount’s returned `mountedElements` as a stable API:
     - if you change it, update every consumer (`rg "mountedElements\\."`).

4) **Verify (tests are part of the change)**
   - Run the game’s own test suite (`cd games/<gameId> && npm test`).
   - Run repo-level guardrails required by the project (especially kernel import forbids).

## Copy/paste prompt template (use this to drive an LLM)

Paste the following prompt into your LLM session (fill in placeholders). It is intentionally strict.

```txt
You are a senior staff engineer working in the `idavoll-games` repo.
You specialize in deterministic/replayable game runtimes (kernel vs shell separation) and vanilla DOM design systems.
Optimize for “pit of success” Dev UX: one true way, hard to misuse.

TASK
- Redesign the UI shell for the game at:
  - Game folder: <GAMES/<gameId>/>
- Revamp HUD / menus / results / upgrades / runtime error overlays to look excellent and fully on-system.
- Preserve gameplay behavior, determinism, replay correctness, and tests.

NON‑NEGOTIABLES
- NO git write/destructive commands (no commit/reset/push/checkout/etc). Read-only git is OK.
- NO React/Vue/Svelte/etc. UI must remain vanilla DOM + CSS (canvas ok for world render).
- Deterministic kernel must remain deterministic:
  - Do NOT import `@idavoll/game-ui-kit/*` from `src/kernel/**`.
  - Do NOT add time/random/layout/DOM reads to deterministic callbacks.
- “One true way” UI kit usage only:
  - `import '@idavoll/game-ui-kit/styles.css'`
  - `import { idvUi } from '@idavoll/game-ui-kit/dom'`
  - No deep imports.
- Off-system styling is forbidden:
  - Do not override UI kit component classes to create bespoke looks.
  - Only allow layout glue CSS + theme tokens on `.idv-ui-theme`.
  - If a missing UI pattern is required, add it to `packages/game-ui-kit/**` first AND show it in the UI kit catalog fixture before using it in the game.
- Input safety:
  - Overlays must use real interactive elements so gameplay input capture ignores UI taps.
- Replay posture:
  - All UI actions must resolve to semantic intents drained on simulation ticks (replayable).
  - In replay mode the UI must be read-only.

WORKFLOW (STRICT ORDER)
1) Read-only audit first (no code changes):
   - Read and obey all applicable `AGENTS.md` in the directories you will touch.
   - Identify current UI surfaces and owners:
     - DOM mount file(s)
     - HUD controllers
     - upgrade/loadout overlay controllers
     - menu overlay controllers
     - results overlay controllers
     - determinism/runtime error overlay controllers
   - Produce a mapping table:
     “current element/controller → UI kit primitive/pattern → migration/redesign approach”
   - List any UI kit gaps.

2) Plan the redesign as small, testable steps:
   - Prioritize in-match critical UI first (HUD + upgrades), then menu/results.
   - Each step must be shippable and testable.
   - If you need a new UI kit primitive/pattern:
     - implement it in `packages/game-ui-kit/**`,
     - dogfood it in `games/g_idv-internal--sdk-fixture-ui-kit-catalog__f00dcafe1234`,
     - only then consume it in the game,
     - update `packages/game-ui-kit/README.md` if public API changes.

3) Implement:
   - Add UI kit styles import to the game `src/main.js`.
   - Wrap root in `.idv-ui-theme` with `data-theme="dark|light"` and optional `data-idv-ui-accent`.
   - Replace bespoke markup/styles with UI kit primitives/patterns.
   - Preserve semantic intent posture: UI event handlers must not directly mutate kernel state.
   - Preserve determinism: no kernel changes unless absolutely required; if required, justify and add tests.

4) Verification (run and paste outputs):
   - From repo root (always):
     - `npm test -- tests/core-flow__ui-kit-kernel-import-forbidden.spec.js`
     - `npm test -- tests/core-flow__forbid-game-ui-kit-imports-in-kernel.spec.js`
   - If UI kit package changed:
     - `npm test -- tests/game-ui-kit__*.spec.js`
   - From the game folder:
     - `cd <gameFolder> && npm test`

OUTPUT REQUIREMENTS
- After each milestone, output a recap in this format:
  **Checkpoint — <milestone>**
  - **Did:** <1 line, include file paths>
  - **User Journey Unlocks:** <1 line>
  - **Tested:** <1 line>
  - **Plan impact:** ✅ On track | ⚠️ Adjust — <why> | 🔴 Replan — <why>
  - **Need from me:** <blocking question + suggestion, or “Nothing”>
  - **Suggest next:** <next step and why>

DESIGN DIRECTION (DON’T IGNORE)
- Mobile-first portrait UI.
- HUD: compact, readable, not a huge slab. Use UI kit card/scrim patterns and stat rows.
- Menus/results: card surfaces, clear hierarchy, good spacing, no bespoke gradients.
- Motion: use UI kit motion primitives/tokens; avoid custom keyframes unless added to UI kit as a pattern and cataloged.
```

## Verification defaults (repo-wide)

When in doubt, require (at minimum):
- repo root:
  - `npm test -- tests/core-flow__ui-kit-kernel-import-forbidden.spec.js`
  - `npm test -- tests/core-flow__forbid-game-ui-kit-imports-in-kernel.spec.js`
- game folder:
  - `npm test`

If kernel is touched (avoid it), also run the game’s determinism/replay suites as defined by that game’s `AGENTS.md`.

