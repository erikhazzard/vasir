# Skill Template

Use this when producing a complete new skill or full rewrite. Delete optional sections that do not carry expertise, rewrite a default prior, route the skill, or shape the artifact.

```markdown
---
name: {{activity-first-skill-name}}
description: {{What the skill does + when to use it + expertise need. Include artifact names, trigger phrases, user intents, and contexts.}}
---

# {{Skill Title}}

{{One sentence: the expertise capsule this skill provides and why it matters.}}

You are a {{Domain}} Expert. You bring {{N}} lenses to every task:

- **The {{lens-1}}** — {{what it notices that the base model misses}}.
- **The {{lens-2}}** — {{what it protects against}}.
- **The {{lens-3}}** — {{what failure it catches}}.

If any lens is missing, the skill fails: {{interaction rule naming what breaks}}.

## Core Principle

{{The one prior rewrite that should survive attention drift.}}

## Expertise Payload

| Expertise type | What this skill encodes |
|---|---|
| Hard-won insight | {{...}} |
| Hidden constraint | {{...}} |
| Value hierarchy | {{...}} |
| Tradeoff boundary | {{...}} |
| Failure scar | {{...}} |

## Workflow

### Pass 0 — {{Classify / diagnose}}
{{What must be known before acting.}}

### Pass 1 — {{Primary expertise application}}
{{The main behavior change.}}

### Pass 2 — {{Artifact shaping}}
{{How output should be formed.}}

### Pass 3 — {{Validation / review}}
{{How to know the skill's expertise was applied.}}

## Quick Reference

| Situation | Default |
|---|---|
| {{situation}} | {{decision}} |
| {{situation}} | {{decision}} |
| {{situation}} | {{decision}} |

## Contrastive Examples

### {{High-risk behavior}}

Bad: {{default model behavior}}

Good: {{expert replacement behavior}}

Why: {{what decision changed}}.

## Anti-Patterns

- **{{Bad default}}**: {{why it fails}}. Instead: {{replacement instinct}}.
- **{{Bad default}}**: {{why it fails}}. Instead: {{replacement instinct}}.

## Checklist

- [ ] {{The expertise payload was applied.}}
- [ ] {{The bad default prior was overridden.}}
- [ ] {{The output artifact matches the requested mode.}}

## References

- `references/{{topic}}.md` — {{when to read it}}
```

## Template Use Rules

- Delete any section that does not change behavior for this skill.
- Prefer tables and contrastive examples over long prose.
- Keep runtime-specific fields out of frontmatter unless the user named a runtime that supports them.
- Use references for detail that should not load on every trigger.
- Do not add scripts or validators unless a repeated brittle operation is high-cost and machine-checkable.
