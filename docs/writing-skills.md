# How to Write a Skill

Use this guide when you already know you need a new or revised skill and want the shortest reliable path from idea to checked-in artifact.

If you are new to Vasir skill authoring, start with [docs/create-your-first-skill.md](./create-your-first-skill.md). If you need field-level facts, use [docs/skill-reference.md](./skill-reference.md).

## When to create a skill

Create a skill when the base model misses a repo or domain constraint often enough that a reusable control surface will pay for itself.

Good candidates:

- repo or domain constraints that are easy for models to miss
- repeated workflows with one stable preferred path
- architectural patterns that live far from the public-code statistical mode

Do not create a skill for:

- one-off tasks
- facts that change constantly
- generic advice normal code exploration already reveals

## Recommended path

1. Define the exact failure mode the skill is correcting.
2. Choose a dense one-line description that says what the skill does and when to use it.
3. Create `skills/<name>/`.
4. Write the root `SKILL.md` as a control surface, not a brochure.
5. Add concrete examples before you add explanation.
6. Name at least two specific anti-patterns.
7. Add `references/` only if the root skill would otherwise become bloated.
8. Update `meta.json`.
9. If the skill should be measurable with `vasir eval run <skill>`, add `skills/<name>/evals/suite.json` and `skills/<name>/evals/README.md`.
10. Run `npm run build:registry`.
11. Run `npm test`.

## Writing posture

Prefer:

- hard constraints over soft suggestions
- examples over explanation
- non-obvious invariants over repo tours
- one strong default path over buffet-style option dumps

Avoid:

- copied README material
- obvious folder descriptions
- generic style filler
- vague best-practice prose

## Verification

Before you treat a skill as done, ask:

- Does every sentence change likely output?
- Could a human or agent discover the skill from the description alone?
- Are the examples real code or precise patterns?
- Are the anti-patterns specific?
- If the skill owns a built-in eval, does `skills/<name>/evals/` explain what good looks like?
- Does `meta.json.files` match what is on disk?
- Did you rebuild `registry.json` and rerun the tests?

## Related Pages

- [docs/create-your-first-skill.md](./create-your-first-skill.md)
- [docs/skill-reference.md](./skill-reference.md)
- [templates/SKILL.md](../templates/SKILL.md)
