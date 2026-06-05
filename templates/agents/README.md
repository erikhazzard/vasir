# AGENTS Templates

Start here.

This folder is the canonical source for AGENTS starter content. The shared
root manifest structure lives in [AGENTS.md](./AGENTS.md); stack-specific
profile content lives in [snippets/](./snippets/) and is inserted into the
canonical structure.

## Template Assembly Contract

Vasir has three layers:

1. `.agents/skills/<skill>/SKILL.md` is the source of truth for reusable agent behavior. Skill files own their workflow, quality bar, and any skill-specific artifacts.
2. `templates/agents/AGENTS.md` is the repo-root operating contract. It owns the shared structure, precedence rules, planning/eval requirements, and the sections that reference skills.
3. `templates/agents/snippets/*-inserts.md` is the profile selection layer. Snippets decide which stack-specific purpose, routing, and doctrine content gets inserted for `backend`, `frontend`, or `ios`.

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
2. Use `vasir agents sync --profile frontend|backend|ios` when inference needs an explicit profile.
3. Use `vasir agents sync --scope frontend --profile frontend` when a folder needs its own scoped AGENTS root.
4. Use `vasir agents sync --dry-run` to preview without writing.
5. Run `vasir add <skill>` or `vasir update` separately when the repo-local skill catalog itself needs to change.

If you want to edit the source templates directly, use the table below and stop there.

## Which File Do I Edit?

| Goal | Edit this file |
|---|---|
| Change backend profile content | [snippets/backend-inserts.md](./snippets/backend-inserts.md) |
| Change frontend profile content | [snippets/frontend-inserts.md](./snippets/frontend-inserts.md) |
| Change iOS profile content | [snippets/ios-inserts.md](./snippets/ios-inserts.md) |
| Change the shared AGENTS section structure | [AGENTS.md](./AGENTS.md) |
| See a filled example instead of a blank starter | [../../docs/example-agents.md](../../docs/example-agents.md) |

## Recommended Workflow

1. Run `vasir agents sync --dry-run`.
2. Run `vasir agents sync` when the preview is right.
3. Add repo-specific landmines in `AGENTS__non-obvious.md`.
4. Only edit the shared [AGENTS.md](./AGENTS.md) when the section structure itself should change.
5. Edit the matching snippet only when the stack-specific doctrine should change.
