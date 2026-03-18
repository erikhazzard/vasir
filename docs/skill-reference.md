# Skill Reference

Use this page when you need authoritative facts about skill layout, `meta.json`, root manifest structure, or versioning rules.

## Skill Directory Layout

Each skill lives directly under `skills/<name>/`.

Required files:

- `SKILL.md`
- `meta.json`

Optional files:

- `references/...`

## `meta.json`

`meta.json` is the local source of truth. `registry.json` is generated from it.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | string | yes | Unique lowercase hyphenated skill identifier |
| `version` | string | yes | Skill-local semver |
| `description` | string | yes | Dense one-line description used for discovery |
| `category` | string | yes | Display grouping such as `games`, `frontend`, `infra`, or `testing` |
| `tags` | string[] | yes | Searchable keywords |
| `recommends` | string[] | yes | Non-required companion skills |
| `files` | string[] | yes | Every checked-in file in the skill directory except `meta.json` |

Rules:

- `files[0]` should normally be `SKILL.md`.
- `files` must stay in sync with the checked-in file inventory.
- If you add `references/...`, add those files to `files`.

## Root `SKILL.md`

The root skill is the default control surface. Keep it dense and focused.

Recommended root structure:

- frontmatter with `name` and `description`
- core principle
- quick reference
- implementation patterns
- anti-patterns
- checklist

Rules:

- Prefer examples over explanation.
- Put invariants near the top.
- Keep the root small enough to scan quickly.
- Move variants into `references/` instead of bloating the root manifest.

## Versioning

- Patch: typo fixes and clarifications that do not materially change behavior
- Minor: new patterns, examples, or references
- Major: structural changes or materially different conditioning

## Validation

The repo validation path checks:

- skill directories are flat under `skills/<name>/`
- `meta.json.files` matches the checked-in file inventory
- local markdown links resolve
- `registry.json` matches generated output

## Related Pages

- [docs/create-your-first-skill.md](./create-your-first-skill.md)
- [docs/writing-skills.md](./writing-skills.md)
- [templates/SKILL.md](../templates/SKILL.md)
