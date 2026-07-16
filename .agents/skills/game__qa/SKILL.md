---
name: game__qa
description: Runs browser-game feature QA end to end — owner brief, test-plan enumeration and sign-off, orchestrated parallel execution, evidence and playtest review, one verdict — via role contracts in references/; also bootstraps a project's qa rig once. Triggers on "request QA", "verify X", "QA this", "make sure it works" on game feature work. Not for tooling, build scripts, infra, or non-game code.
---

# Game QA

One skill, seven roles, one pipeline. The default it replaces: an engineer verifying their own feature, in their own context, against their own expectations — which produces the same artifact every time, a green run that proves the engineer's assumptions. This skill installs a division of labor instead. The builder sets the bar. An architect turns promises into cases. Engineers produce evidence without judging it. Judges who never saw the code deliver verdicts from evidence alone. The roles are connected by artifacts, never by trust.

Every participant reads this file's Laws plus exactly one role file. Nothing else in this skill is for you.

## The Laws — bind every role; cited, never cloned

1. **Game features only.** Tooling, build scripts, infra, generic web apps: refuse and route elsewhere. This boundary lives here and only here — role files do not restate it.
2. **Player promises → player journeys → evidence → verdict.** Every case is something a player was promised, walked the way a player would reach it, judged from what the run left behind.
3. **`arrange:` sets state. It never performs the action under test.** The boundary is case-relative — the same primitive is a legal precondition in one case and a shortcut in the next; the case defines which. Taxonomy: `references/arrange-vs-shortcut.md`.
4. **Real input for player-action cases.** `inputMode: authentic | both` means `perform:`. A case "verified" through the debug surface has verified the debug surface.
5. **Missing capability = ticket + halt. Never a workaround.** Capability-gap tickets are how the rig learns; improvisation is how it lies.
6. **Insufficient evidence = `unverified-*`. Never a guess.** An honest "couldn't verify" outranks a hopeful pass.
7. **Tickets stream the moment they exist.** The owner fixes in parallel; a batched ticket is a delayed fix.
8. **Roles never bleed.** Each role owns its column and never touches the other's:

| Role | Owns | Never |
|---|---|---|
| Owner | goals, scope, plan sign-off, ship call | authors cases or journeys, runs QA |
| Enumerator | the test plan | writes code, runs commands, spawns |
| Lead | coverage gate, dispatch, rollup | authors cases/journeys, executes, judges |
| Engineer | journey YAML, the run, the evidence | judges results, writes Playwright JS, spawns |
| Reviewer | verdicts and tickets | runs anything, spawns |
| Playtest | one chartered live session | scripted checks, spawns |

## The Pipeline

```
Owner ── brief ──▶ Enumerator ── test-cases.json ──▶ Owner signs off
Owner ──▶ Lead ── coverage gate ──▶ ∥ Engineers   (journeys → evidence)
                                    ∥ Reviewers   (evidence → verdicts)
                                    ∥ Playtest    (charters → sessions)
        ◀────────── tickets stream throughout ──────────
Lead ── verdict.json ──▶ Owner ── fixes ──▶ re-verify failed slice ──▶ ship / no-ship
```

The Owner spawns the Enumerator, then the Lead. The Lead spawns Engineers, Reviewers, and Playtest sessions in parallel. Leaves spawn nothing. A verdict with fixes behind it is re-verified by re-dispatching the failed and unverified slice — not the whole plan, and not by taking the fixer's word.

## Routing — read exactly one

| Situation | Read |
|---|---|
| You built a feature; someone says "QA this / verify / ready for QA" | `references/role-owner.md` |
| The project has no `qa/` rig yet | `references/bootstrap.md` — once, before anything else |
| Dispatched as **enumerator** | `references/role-enumerator.md` |
| Dispatched as **lead** | `references/role-lead.md` |
| Dispatched as **engineer** | `references/role-engineer.md` |
| Dispatched as **reviewer** | `references/role-reviewer.md` |
| Dispatched as **playtest** | `references/role-playtest.md` |

Never freelance a role you weren't given. If you're dispatched into one role and tempted by another's work, that temptation has a row in your role file's rationalization table.

## Dispatch contract

Every spawn prompt names three things: the role file to read, this SKILL.md for the Laws, and the inputs — artifact dir, case-slice or journey brief, adapter path. A sub-agent reads the Laws and its role file, then begins. Everything else it needs arrives as artifacts on disk, never as narration from the agent that spawned it.

## Artifact home

```
qa-runs/<date>_<feature>/
  brief.md · test-cases.json · adapter-coverage-report.json · journey-plan.json
  journeys/<slug>/   (journey.yaml, output.json, screenshots/, dom/, console/)
  reviews/ · tickets/ · verdict.json
```

## References — when to read

- `references/role-*.md` — your dispatch names yours; read it and no other.
- `references/bootstrap.md` — once per project, to stand up the rig.
- `references/case-schema.md` — enumerator writing cases; reviewer checking case fields.
- `references/journey-schema.md` — engineer authoring journeys; the contract the runner accepts.
- `references/ticket-schema.md` — any role filing a ticket.
- `references/brief-schema.md` — owner writing the brief.
- `references/adapter-contract.md` — bootstrap; engineer validating primitives.
- `references/arrange-vs-shortcut.md` — enumerator and engineer, any time a primitive smells like the action under test.
