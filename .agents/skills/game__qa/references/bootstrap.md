# Bootstrap: Game-QA Rig

**Binding:** the Laws in `../SKILL.md` apply throughout — including Law 1's project boundary. This file is the one-time setup.

You are setting up game-qa infrastructure for a browser-game project. The skill ships three reference artifacts you'll copy and adapt:

- `runner.ts` — project-agnostic runner (copy as-is, do not modify)
- `qa-adapter.template.ts` — adapter skeleton (copy and fill in)
- `journey-schema.md` — the YAML contract the runner consumes (don't copy; engineers read it to author journeys)

**The seam:** the runner is **framework-fixed**, the adapter is **project-specific**. New behavior means a new adapter primitive or a schema extension — never a forked runner.

**Run once per project.** If parts exist, gap-fill — don't rebuild.

## The Iron Law

```
RUN ONCE. GAP-FILL, DON'T REPLACE.
ARRANGE/PROBE PRIMITIVES ONLY — NEVER ACTIONS-UNDER-TEST.
A RIG THAT HASN'T EXERCISED REAL INPUT ISN'T BOOTSTRAPPED.
```

## What to Build (in order)

1. **Debug system.** An action registry (server-authoritative for multiplayer projects; client-side for single-player), reflection-driven catalog (`debug.help()`), `window.debug.<action>` proxy on the client, and a one-shot `console.log("[debug-ready]")` once it's wired. If the project has these, verify and move on. If not, build the minimum: a `window.debug` object exposing project actions plus the ready marker.

2. **Drop the runner.** Copy `runner.ts` to `<project>/qa/runner.ts`. Start unmodified. The runner is extensible — add new `perform:` types or `capture: at:` kinds your game needs (see "Extending the framework") — but don't silently change existing semantics. Plain-JS projects: run via `tsx` / `ts-node` / `vite-node`, or strip type annotations after copy. The runner imports `./adapter.ts` — the next step creates it.

3. **Adapt the adapter.** Copy `qa-adapter.template.ts` to `<project>/qa/adapter.ts`. Fill in:
   - `url` — the project's dev URL
   - `readyMarker` — the console string the project emits when `window.debug` is wired
   - `hudSelector` — optional CSS selector so `capture: at: [hud]` works
   - `arrange.*` — wrappers around `window.debug.*` for state setup (arrange-vs-shortcut discipline binds — Laws 3–4)
   - `probe.*` — read-only state queries; always include `snapshot` as the default fallback
   - `events.subscribe` / `events.drain` — wired to the project's event source (DOM events, EventEmitter, WebSocket messages)
   - `reset` — idempotent between-journey reset
   - `clearByTag` — sweep entities this runner created (the `spawnTracker` pattern in the template)

4. **Match the rig to the game's form factor.** The template's input vocabulary and viewport are desktop defaults. A portrait one-thumb game gets its device profile and `tap`/`swipe` `perform:` extensions *now*, as the first runner extensions — a touch game smoke-tested with desktop clicks has proven nothing about its input chain, and Law 4 doesn't grade on intent.

5. **Sentinel primitives.** A handful of starter `arrange.*` and `probe.*` per major system — enough to prove the wiring. The catalog grows organically as features land; engineers add what they need via capability-gap tickets. Don't pre-build it.

6. **Arrange-vs-shortcut taxonomy doc** at `<project>/docs/qa/arrange-vs-shortcut.md`, seeded from `../references/arrange-vs-shortcut.md`. The discipline: `arrange.*` sets state; it never bypasses the chain the *current case* is verifying. The same primitive may be allowed in one case and forbidden in another — the case defines what's a shortcut. Setup verbs (`set`, `spawn`, `give`, `grant`, `clear`) are usually safe; ban anything that performs the action a case exists to verify.

7. **Smoke-test the rig — both halves.** Author `qa-runs/smoke/journeys/smoke/journey.yaml`: capture initial → one `perform:` against a known element or key → capture after. Run it. Confirm the evidence bundle appears (`output.json`, `screenshots/`) *and* that the perform visibly changed something between the two captures. A capture-only smoke proves the camera works and says nothing about the hands. If this fails, nothing downstream can work — fix it before declaring done.

8. **`qa-runs/` dir** at the project root with a stub README pointing at the `game-qa` skill.

## Extending the framework

The skill ships a skeleton. **Extend it for your game.** The cross-project contract is the *shape*:

- The four-namespace adapter (`arrange` / `probe` / `events` / `reset`)
- The step-vocabulary categories (`arrange`, `perform`, `capture`, `waitForEvent`, `waitForState`, `waitMs`, `expect`, `loop`, `js`)
- The evidence-bundle layout (`output.json` + screenshots + dom + console + tickets)

What's *not* fixed — extend in your project copy as your game needs:

- New `perform:` action types (touch/tap/swipe, pointer-lock mouse-delta, scroll-wheel, key-hold, gamepad)
- New `capture: at:` kinds (regional screenshots, audio events, frame strips, perf traces)
- Project-specific `arrange.*` and `probe.*` primitives — always; that's the adapter's whole point
- Project-specific waits, predicates, and time conventions (tick-based stepping, sim-clock advance)

If an extension feels broadly useful, propose it upstream. Otherwise live with the local extension — that's the framework working as designed.

## When You're Done

- All eight items above shipped (or gap-filled)
- Smoke journey runs end-to-end, exercises one real input, and emits an evidence bundle
- Sentinel `arrange.*` and `probe.*` callable from both browser console and runner
- Tell the user: *"Game-QA bootstrapped. The runner at `qa/runner.ts` is framework code — don't modify it; extend `qa/adapter.ts` instead. Request QA through the game-qa skill. Add `arrange.*` / `probe.*` primitives as features land — never one that shortcuts an action under test; see `docs/qa/arrange-vs-shortcut.md`."*

Then exit.

## Hard Rules

- **Don't break existing debug actions.** Gap-fill, don't rebuild.
- **Never add primitives that bypass an action under test.** A primitive that performs what a case is supposed to verify is not a test — it's a shortcut. Only `arrange.*` (preconditions) and `probe.*` (observation).
- **Extend, don't fork.** New `perform:` types and `capture:` kinds: encouraged. Silently changing existing semantics (e.g., making `arrange:` do real player input): forking — don't.
- **Don't reconstruct the runner.** The skill ships one; copy it and extend in place.
- **Land starter content, not the full catalog.** 2–3 sentinel primitives per system. Features add the rest.
- **Don't run continuously.** Setup, not watcher.

## Red Flags — STOP

- Replacing the project's existing transport → gap-fill instead
- Adding an arrangement whose name verbs a case's action under test → arrange-vs-shortcut violation
- Forking the runner for project-specific reasons → use the adapter
- A touch game whose smoke journey clicks with a mouse → step 4 was skipped
- Continuing past 2–3 sentinel primitives per system → over-anticipates

## The Bottom Line

Debug + adapter + form factor + runner + taxonomy + two-halves smoke + dir. Sentinel primitives only. Done.