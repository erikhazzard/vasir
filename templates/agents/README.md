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

1. Run `vasir add <skill>`. Vasir now seeds `AGENTS.md` automatically, and `--agents-profile backend|frontend|ios` is the override when you want to force a stronger starter.
2. If you only want the AGENTS starter, run `vasir agents init backend|frontend|ios`.
3. Open the generated repo-root `AGENTS.md`.
4. Rewrite the `Purpose` block and replace the Section 1 routing examples, or run `vasir agents draft-purpose --write --model openai` plus `vasir agents draft-routing --write`.
5. Create any scoped `AGENTS.md` files that Section 1 points at, or collapse those rules back into the root file.
6. Finish with `vasir agents validate`.

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

1. Pick the closest profile with `vasir agents init backend|frontend|ios`.
2. Let Vasir compose [AGENTS.md](./AGENTS.md) with the matching snippet.
3. Replace placeholders with verified repo truth.
4. Delete any line that is not true in that repo.
5. Only edit the shared [AGENTS.md](./AGENTS.md) when the section structure itself should change.
6. Edit the matching snippet only when the stack-specific doctrine should change.
