# AGENTS Templates

Start here.

This folder is the canonical source for AGENTS operating-contract starter content. The shared
root operating-contract structure lives in [AGENTS.md](./AGENTS.md); stack-specific
profile content lives in [snippets/](./snippets/) and is inserted into the
canonical structure.

## Template Assembly Contract

Vasir has three layers:

1. `.agents/skills/<skill>/SKILL.md` is the source of truth for reusable agent behavior. Skill files own their workflow, quality bar, and any skill-specific artifacts.
2. `templates/agents/AGENTS.md` is the repo-root operating contract. It owns the shared structure, precedence rules, planning/eval requirements, and the sections that reference skills.
3. `templates/agents/snippets/*-inserts.md` is the profile selection layer. Snippets decide which stack-specific purpose, routing, and doctrine content gets inserted for `backend`, `frontend`, or `ios`.

AGENTS files have three jobs:

- Root `AGENTS.md`: repo-wide operating contract, generated from this template.
- Nested root `AGENTS.md`: generated app/package root contract in a monorepo, created with `vasir agents sync --scope <path>`.
- Folder `AGENTS.md`: hand-authored local steering map for one subtree. Do not generate it with `vasir agents sync --scope`.

Rules:

- Do not duplicate skill instructions in `AGENTS.md`; route to skills instead.
- Do not create `profiles/` templates. CLI profiles are selectors, not source files.
- Each snippet must contain exactly the marker blocks the composer reads:
  - `vasir:purpose`
  - `vasir:routing`
  - `vasir:engineering-doctrine-inserts`
- Generated repo-root `AGENTS.md` files are outputs. Edit the source files here only when the starter system itself should change.

Fastest path:

1. Run `vasir agents sync`. It infers the profile, renders the current canonical template, fills purpose/routing from local repo context, injects `AGENTS__non-obvious.md`, and validates the result.
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
| Change the shared AGENTS section structure | [AGENTS.md](./AGENTS.md) |
| See a filled example instead of the source template | [../../docs/example-agents.md](../../docs/example-agents.md) |

## Recommended Workflow

1. Run `vasir agents sync --dry-run`.
2. Run `vasir agents sync` when the preview is right.
3. Add repo-specific landmines in `AGENTS__non-obvious.md`.
4. Only edit the shared [AGENTS.md](./AGENTS.md) when the section structure itself should change.
5. Edit the matching snippet only when the stack-specific doctrine should change.
