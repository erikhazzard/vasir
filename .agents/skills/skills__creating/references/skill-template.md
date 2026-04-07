# Skill Template

Copy from the frontmatter down. Replace `{{placeholders}}`. Delete `<!-- comments -->` as you fill sections in. Delete any optional section that doesn't apply.

```
skill-name/
├── SKILL.md              # Under 500 lines. The only file loaded on every trigger.
├── references/            # One level deep. Loaded on demand.
└── scripts/               # Deterministic aids. Validators, generators, hooks.
```

---

```markdown
---
name: {{skill-name}}
description: {{What this skill does + when to use it. Include trigger phrases, file types, user intents, contexts. Pushy > conservative — undertriggering is the dominant failure mode. 50-100 words.}}
---

# {{Skill Name}}

{{One sentence: what this does and why it matters.}}

<!-- =======================================================================
  PERSONA FRAME (optional — delete if the skill is purely procedural)

  Use when the domain has 2-3 competing concerns the model will collapse
  into one by default. Each lens is a reasoning mode that catches failure
  modes the others miss. The INTERACTION RULE at the end is what makes
  this structural — it states what breaks when a lens is absent.

  Skip this for checklists, procedures, and purely informational skills.
========================================================================= -->

You are a {{Domain}} Expert. You bring {{N}} lenses to every problem:

- **The {{lens-1}}** — {{concepts it thinks in}}. You know that {{concrete thing this lens catches that others miss}}.
- **The {{lens-2}}** — {{concepts it thinks in}}. You know that {{concrete thing this lens catches that others miss}}.
- **The {{lens-3}}** — {{concepts it thinks in}}. You know that {{concrete thing this lens catches that others miss}}.

If any lens is missing, the system breaks: {{lens-1}} without {{lens-2}} produces {{failure}}. {{lens-2}} without {{lens-1}} produces {{opposite failure}}. Either without {{lens-3}} produces {{third failure}}.

## Core Principle

<!-- The ONE forcing function. If the model remembers one thing from this
     skill under long-context attention drift, it's this. Frame as a
     constraint or test, not a wish.

     Good: "Every meaningful action must trigger ≥3 feedback channels."
     Bad:  "Try to make things feel good." -->

## Workflow (optional)

<!-- Multi-pass sequence with gate conditions. Prevents the model from
     skipping fundamentals and jumping to the exciting part. Delete this
     section if the skill doesn't have a natural pass ordering. -->

### Pass 0 — {{Diagnose / Classify}} (fast)
### Pass 1 — {{Fix fundamentals}} (only if needed)
### Pass 2 — {{Core implementation}}
### Pass 3 — {{Polish / secondary}} (only if ROI justifies)
### Pass 4 — {{Guardrails / validation}}

## Quick Reference

<!-- Highest-signal rules in the most scannable format. Tables > bullets.
     Include concrete defaults, ranges, values. This section carries the
     skill under attention drift — if reduced to just this, it should
     still beat the base model. -->

| {{Context}}   | {{Default / Rule}}                     |
|---------------|----------------------------------------|
| {{situation}} | {{concrete value, range, or behavior}} |
| {{situation}} | {{concrete value, range, or behavior}} |
| {{situation}} | {{concrete value, range, or behavior}} |

## Implementation Patterns

<!-- Real code, not pseudocode. Copy-paste ready. 3-6 patterns covering
     the 80% case. Push framework-specific variants to references/. -->

### {{Pattern Name}}

<!-- 1-2 sentences: when to use, what it solves. -->

` ` `{{language}}
// Real, working code with real numbers
` ` `

### {{Pattern Name}}

` ` `{{language}}
// Real, working code with real numbers
` ` `

### {{Pattern Name}}

` ` `{{language}}
// Real, working code with real numbers
` ` `

## Anti-Patterns

<!-- The model's training-distribution defaults this skill overrides.
     Be specific: name the bad default, why it's wrong, what to do instead.
     "Don't write bad code" = useless.
     "Don't use setTimeout for animation timing — it drifts under load;
      use dt-based tweens instead" = useful. -->

- **{{Bad default}}**: {{why it's wrong}}. Instead: {{correct approach}}.
- **{{Bad default}}**: {{why it's wrong}}. Instead: {{correct approach}}.
- **{{Bad default}}**: {{why it's wrong}}. Instead: {{correct approach}}.

## Checklist

<!-- Ship gate. Testable assertions, not aspirations. -->

### {{Category}}
- [ ] {{Testable assertion}}
- [ ] {{Testable assertion}}

### {{Category}}
- [ ] {{Testable assertion}}
- [ ] {{Testable assertion}}

## References

<!-- Only if you have references/ files. State WHEN to read each one. -->

- `references/{{topic}}.md` — {{When to read this}}
- `references/{{topic}}.md` — {{When to read this}}
```