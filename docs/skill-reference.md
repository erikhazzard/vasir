# Skill Reference

Use this page when you need authoritative facts about skill layout, manifest frontmatter, optional compatibility metadata, or versioning rules.

## Skill Directory Layout

Each skill lives directly under `.agents/skills/<name>/`.

Required files:

- `SKILL.md`

Optional files:

- `meta.json`
- `references/...`
- `evals/README.md`
- `evals/suite.json`

## Catalog Fields

`registry.json` is generated from each skill directory. `SKILL.md` is the primary source of truth. `meta.json` is optional compatibility metadata for older skills.

| Field | Primary source | Fallback / default |
| --- | --- | --- |
| `name` | `SKILL.md` frontmatter `name` | directory name; if present it must match `.agents/skills/<name>` |
| `description` | `SKILL.md` frontmatter `description` | first prose paragraph in `SKILL.md`, then optional `meta.json.description` |
| `category` | `SKILL.md` frontmatter `category` | `meta.json.category`, then `uncategorized` |
| `tags` | `SKILL.md` frontmatter `tags` | `meta.json.tags`, then `[]` |
| `recommends` | `SKILL.md` frontmatter `recommends` | `meta.json.recommends`, then `[]` |
| `version` | `SKILL.md` frontmatter `version` | `meta.json.version`, then `0.1.0` |
| `files` | inferred from disk | every checked-in file in the skill directory, including optional `meta.json` |

Rules:

- `SKILL.md` must exist directly under `.agents/skills/<name>/`.
- `files` is generated from the checked-in file inventory; there is no manual file list to maintain.
- If you keep `meta.json`, it must live directly under `.agents/skills/<name>/meta.json`.

## Root `SKILL.md`

The root skill is the default control surface. Keep it dense and focused.

Recommended root structure:

- frontmatter with `name`, `description`, and optional catalog fields
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

## Skill-Owned Evals

If a skill ships with a built-in eval, keep that contract inside the skill directory:

- `.agents/skills/<name>/evals/suite.json`
- `.agents/skills/<name>/evals/README.md`

Rules:

- `suite.json` is the machine-readable contract for `vasir eval run <skill>`.
- `README.md` explains the failure mode, win condition, and current limits in plain English.
- `evals/...` files are copied with the skill, but they are not part of the prompt surface that steers generation.

## Versioning

- Patch: typo fixes and clarifications that do not materially change behavior
- Minor: new patterns, examples, or references
- Major: structural changes or materially different conditioning

## Validation

The repo validation path checks:

- skill directories are flat under `.agents/skills/<name>/`
- generated file inventories match the checked-in file inventory
- local markdown links resolve
- `registry.json` matches generated output

## Related Pages

- [docs/create-your-first-skill.md](./create-your-first-skill.md)
- [docs/writing-skills.md](./writing-skills.md)
- [templates/SKILL.md](../templates/SKILL.md)
