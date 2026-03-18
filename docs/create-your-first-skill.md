# Create Your First Skill

Use this tutorial when you want to add a brand new skill to Vasir and verify the full authoring loop end-to-end.

## What you will accomplish

You will create a minimal skill, register it, and prove that the catalog and repo checks accept it.

## Audience

This tutorial assumes you can edit files in the repo and run the npm scripts already used by Vasir.

## Prerequisites

- You are inside the Vasir repo.
- Node 18.17+ is installed.
- Git is available on `PATH`.

## Step 1: Choose one failure mode and one skill name

Pick a single recurring failure mode that a base model gets wrong often enough to deserve a reusable control surface.

For this tutorial, use the placeholder skill name `example-repo-constraints`.

Expected result:

- You can state the skill in one sentence: what it fixes and when to use it.

## Step 2: Create the skill directory

Create:

```text
skills/example-repo-constraints/
```

Expected result:

- The new skill has its own flat directory directly under `skills/`.

## Step 3: Add `meta.json`

Create `skills/example-repo-constraints/meta.json`:

```json
{
  "name": "example-repo-constraints",
  "version": "1.0.0",
  "description": "Repo-specific constraints that keep generated code inside the supported architecture",
  "category": "infra",
  "tags": ["architecture", "constraints"],
  "recommends": [],
  "files": ["SKILL.md"]
}
```

Expected result:

- The skill now has machine-readable metadata.

## Step 4: Add `SKILL.md`

Create `skills/example-repo-constraints/SKILL.md` and keep it dense:

````markdown
---
name: example-repo-constraints
description: Repo-specific constraints that keep generated code inside the supported architecture.
---

# Example Repo Constraints

## Core Principle

All generated work must obey the repo's architectural invariants before convenience or speed.

## Quick Reference

- Route all public behavior through the canonical boundary.
- Fail closed when invariants are unclear.

## Implementation Patterns

### Pattern 1

```js
export function example() {
  return "Replace this with real repo-specific guidance.";
}
```

## Anti-Patterns

- Do not add alternate entrypoints for the same capability.
- Do not document guesses as if they were verified facts.

## Checklist

- [ ] Root invariant is explicit
- [ ] At least one concrete example exists
- [ ] At least two anti-patterns are named
````

Expected result:

- The root skill is specific enough to change model behavior, not just describe a folder.

## Step 5: Rebuild the registry

Run:

```bash
npm run build:registry
```

Expected result:

- `registry.json` now includes `example-repo-constraints`.

## Step 6: Run the repo checks

Run:

```bash
npm test
```

Expected result:

- The metadata inventory and markdown links still validate.

## Step 7: Decide whether the root skill is too broad

If the root skill is getting bloated:

1. Keep the root `SKILL.md` focused on the default path.
2. Move framework or environment variants into `references/`.
3. Add those files to `meta.json.files`.

Expected result:

- The root skill stays sharp and scan-friendly.

## Final outcome

You now have a checked-in skill that appears in the registry and passes the repo validation path.

## Next steps

- Use [docs/writing-skills.md](./writing-skills.md) for the authoring workflow.
- Use [docs/skill-reference.md](./skill-reference.md) when you need field-level facts.
