# AGENTS Templates

Start here.

This folder is the canonical source for AGENTS starter content.

Fastest path:

1. Run `vasir add <skill> --agents-profile backend|frontend|ios`, or run `vasir agents init backend|frontend|ios` if you only want the AGENTS starter.
2. Open the generated repo-root `AGENTS.md`.
3. Rewrite the `Purpose` block and replace the Section 1 routing examples.
4. Optional: run `vasir agents draft-purpose --write --model openai` for a repo-aware first draft of the opening paragraph.
5. Finish with `vasir agents validate`.

If you want to edit the source templates directly, use the table below and stop there.

## Which File Do I Edit?

| Goal | Edit this file |
|---|---|
| Start from a backend-first AGENTS | [profiles/backend.md](./profiles/backend.md) |
| Start from a frontend-first AGENTS | [profiles/frontend.md](./profiles/frontend.md) |
| Start from an iOS-first AGENTS | [profiles/ios.md](./profiles/ios.md) |
| Change the shared AGENTS section structure | [AGENTS.md](./AGENTS.md) |
| Add advanced reusable inserts for custom composition | [snippets/backend-inserts.md](./snippets/backend-inserts.md), [snippets/frontend-inserts.md](./snippets/frontend-inserts.md), [snippets/ios-inserts.md](./snippets/ios-inserts.md) |
| See a filled example instead of a blank starter | [../../docs/example-agents.md](../../docs/example-agents.md) |

## Recommended Workflow

1. Pick the closest profile.
2. Copy it into the target repo root as `AGENTS.md`.
3. Replace placeholders with verified repo truth.
4. Delete any line that is not true in that repo.
5. Only open the shared [AGENTS.md](./AGENTS.md) if you need to change the section structure.
6. Only open the `snippets/` files if the profile is close but you need custom inserts.
