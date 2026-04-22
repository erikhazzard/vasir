# Skill Template

Use this only when producing a complete skill or full rewrite. Delete optional sections that do not carry the skill's primary mechanism.

## Table of Contents

- Skill directory shape
- Manifest skeleton
- Component deletion guide

```text
skill-name/
├── SKILL.md
└── references/
    └── optional-detail.md
```

```markdown
---
name: {{activity-first-hyphenated-name}}
description: {{Activity + artifact/domain. Use when {{specific intents, contexts, file types, or trigger phrases}}. Optional exclusion only if overtrigger risk is real.}}
---

# {{Human Skill Title}}

{{One sentence: the behavior this skill installs and why it matters.}}

{{Optional persona frame. Use only when competing concerns must be held simultaneously.}}

You are a {{domain}} expert. You bring {{2-3}} lenses to every problem:

- **The {{lens}}** — {{what it optimizes and what failure it catches}}.
- **The {{lens}}** — {{what it optimizes and what failure it catches}}.
- **The {{lens}}** — {{what it optimizes and what failure it catches}}.

If any lens is missing, the system breaks: {{interaction rule}}.

## Core Principle

{{The single prior rewrite that should survive attention drift.}}

## Prior Rewrite Map

| Default prior | Why it fails | Replacement prior | Anchor |
|---|---|---|---|
| {{what model naturally does}} | {{specific failure}} | {{new instinct}} | {{principle/table/example/anti-pattern}} |

## Quick Reference

{{Decision table. Use this section for compact defaults, not prose summaries.}}

| Context | Default decision |
|---|---|
| {{situation}} | {{behavior}} |

## Workflow

{{Include only if order matters.}}

### Pass 0 — {{classify / diagnose}}
{{Gate or action.}}

### Pass 1 — {{core work}}
{{Gate or action.}}

### Pass 2 — {{validation / closeout}}
{{Gate or action.}}

## Patterns / Examples

{{Use contrastive examples or copy-ready patterns. Pattern matching beats abstract advice.}}

### {{Bad default}} → {{Replacement}}

Bad:

```text
{{bad output}}
```

Good:

```text
{{good output}}
```

Why: {{what decision changed}}.

## Anti-Patterns

- **{{Bad default}}**: {{why it fails}}. Instead: {{replacement behavior}}.
- **{{Bad default}}**: {{why it fails}}. Instead: {{replacement behavior}}.

## Checklist

- [ ] {{Testable decision-quality assertion}}.
- [ ] {{Testable decision-quality assertion}}.

## References

- `references/{{file}}.md` — {{Read when this subset of triggered work needs deeper detail}}.
```

## Component deletion guide

| Section | Delete when |
|---|---|
| Persona frame | The skill is procedural or has only one quality axis. |
| Prior Rewrite Map | The skill is tiny and the core principle plus anti-patterns already carry it. |
| Workflow | Step order does not matter. |
| Patterns / Examples | There is no stable example that would improve pattern matching. |
| Checklist | It would only restate generic quality expectations. |
| References | The root manifest already contains all detail needed on every trigger. |
