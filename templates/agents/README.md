# AGENTS/CLAUDE Templates

Start here.

This folder is the canonical source for root operating-contract starter content.
The shared root operating-contract structure lives in [AGENTS.md](./AGENTS.md)
and [CLAUDE.md](./CLAUDE.md); stack-specific profile content lives in
[snippets/](./snippets/) and is inserted into both canonical structures.

## Template Assembly Contract

Vasir has three layers:

1. `.agents/skills/<skill>/SKILL.md` is the source of truth for reusable agent behavior. Skill files own their workflow, quality bar, and any skill-specific artifacts.
2. `templates/agents/AGENTS.md` and `templates/agents/CLAUDE.md` are repo-root operating contracts. They own the shared structure, precedence rules, planning/eval requirements, and the sections that reference skills. `AGENTS.md` is for Codex and other non-Claude agents; `CLAUDE.md` keeps the Claude/Fable-specific routing text.
3. `templates/agents/snippets/*-inserts.md` is the profile selection layer. Snippets decide which stack-specific purpose, routing, and doctrine content gets inserted for `backend`, `frontend`, or `ios`.

Root contract files have three jobs:

- Root `AGENTS.md` + `CLAUDE.md`: repo-wide operating contracts, generated from these templates.
- Nested root `AGENTS.md` + `CLAUDE.md`: generated app/package root contracts in a monorepo, created with `vasir agents sync --scope <path>`.
- Folder `AGENTS.md`: hand-authored local steering map for one subtree. Do not generate it with `vasir agents sync --scope`.

Rules:

- Do not duplicate skill instructions in `AGENTS.md` or `CLAUDE.md`; route to skills instead.
- Do not collapse the twin files into one template. Shared laws must match, but model-routing sections intentionally differ.
- Do not create `profiles/` templates. CLI profiles are selectors, not source files.
- Each snippet must contain exactly the marker blocks the composer reads:
  - `vasir:purpose`
  - `vasir:routing`
  - `vasir:engineering-doctrine-inserts`
- Generated repo-root `AGENTS.md` and `CLAUDE.md` files are outputs. Edit the source files here only when the starter system itself should change.

Fastest path:

1. Run `vasir agents sync`. It infers the profile, renders the current canonical templates, fills purpose/routing from local repo context, injects `AGENTS__non-obvious.md` into both root contracts, and validates the generated `AGENTS.md` result.
2. Use `vasir agents sync --profile frontend|backend|ios|generic` when inference needs an explicit profile.
3. Use `vasir agents sync --scope frontend --profile frontend` when a folder is a nested app/package root.
4. Use `vasir agents sync --dry-run` to preview without writing.
5. Author ordinary folder AGENTS directly as steering maps, or use the installed `agents__creating-folder-agents` skill.
6. Run `vasir add <skill>` or `vasir update` separately when the repo-local skill catalog itself needs to change.

If you want to edit the source templates directly, use the table below and stop there.

## Which File Do I Edit?

| Goal | Edit this file |
|---|---|
| Change backend profile content | [snippets/backend-inserts.md](./snippets/backend-inserts.md) |
| Change frontend profile content | [snippets/frontend-inserts.md](./snippets/frontend-inserts.md) |
| Change iOS profile content | [snippets/ios-inserts.md](./snippets/ios-inserts.md) |
| Change shared root-contract laws | [AGENTS.md](./AGENTS.md) and [CLAUDE.md](./CLAUDE.md) |
| Change Codex/non-Claude routing text | [AGENTS.md](./AGENTS.md) |
| Change Claude/Fable routing text | [CLAUDE.md](./CLAUDE.md) |
| See a filled example instead of the source template | [../../docs/example-agents.md](../../docs/example-agents.md) |

## Recommended Workflow

1. Run `vasir agents sync --dry-run`.
2. Run `vasir agents sync` when the preview is right.
3. Add repo-specific landmines in `AGENTS__non-obvious.md`.
4. Edit both [AGENTS.md](./AGENTS.md) and [CLAUDE.md](./CLAUDE.md) when shared laws change.
5. Edit the matching snippet only when the stack-specific doctrine should change.
