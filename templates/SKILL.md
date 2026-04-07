# Skill Template

## How to use this template

Copy the skeleton below into a new `SKILL.md`. Replace every `{{placeholder}}` and every `<!-- instruction -->` block with your actual content. Delete this "How to use" section and everything above the `---` frontmatter when you're done.

### What makes a skill work

A skill is a behavioral contract between you and the model. It exists because the model's training-distribution default for your domain is wrong, generic, or missing. Every line in the skill should either **redirect a default the model would otherwise follow** or **inject knowledge the model doesn't have**. If a line does neither, cut it.

### Structural principles

1. **Progressive disclosure.** The model reads the SKILL.md on every trigger. Keep it under ~500 lines. Push deep reference material, framework-specific code, and worked examples into `references/` and tell the model when to read them.

2. **The description is the trigger.** The frontmatter `description` is the *only* thing the system sees when deciding whether to load your skill. Make it specific, keyword-rich, and slightly pushy. List the user phrases and contexts that should activate it. Undertriggering is the dominant failure mode.

3. **One forcing function.** The Core Principle section is what the model will remember when context gets long and attention drifts. If you could only inject one sentence into the model's reasoning, this is it.

4. **Concrete > abstract.** Real code with real numbers beats prose explanations. Tables with defaults beat paragraphs describing ranges. The model will pattern-match your examples far more reliably than it will follow your instructions.

5. **Ban the default, don't just suggest the alternative.** The Anti-Patterns section exists because LLMs have strong priors. If you only say "do X," the model will sometimes do X and sometimes fall back to its training default. If you say "never do Y, do X instead," the contrast anchors the behavior.

6. **Persona frames shift reasoning, not just tone.** When a domain has multiple competing concerns (e.g., technical correctness vs. aesthetic quality vs. cognitive budget), the model's default is to optimize one and ignore the rest. A persona frame with 2-3 named lenses forces simultaneous reasoning across all of them. The key move is the **interaction rule** — stating what breaks when each lens is absent. "Physics without animation = tight but sterile; animation without physics = beautiful but fights the player" isn't flavor text, it's a structural constraint that prevents the model from collapsing to a single axis. Use this when experts in the domain hold multiple frames simultaneously. Skip it for procedural or informational skills.

### Anatomy of a skill directory

```
skill-name/
├── SKILL.md              # Required. Under 500 lines.
│   ├── YAML frontmatter   # name + description (trigger mechanism)
│   └── Markdown body       # Core instructions
├── references/            # Optional. Deep dives loaded on demand.
│   ├── topic-a.md
│   └── topic-b.md
├── scripts/               # Optional. Deterministic tasks.
└── assets/                # Optional. Templates, fonts, icons.
```

---

## Evaluation criteria

Use these to judge whether a skill is working:

1. **Trigger accuracy.** Does it fire when it should and stay quiet when it shouldn't? Test with 5-10 realistic prompts (both positive and negative).
2. **Default override.** Run the same prompt with and without the skill. Is the difference obvious and in the right direction?
3. **Degradation under length.** Does the model still follow the skill's constraints 2000 tokens into a long response, or does it drift back to training defaults? The Core Principle and Quick Reference carry this weight.
4. **Minimal footprint.** Could you delete any section without losing behavioral impact? If yes, delete it.

---

## Skeleton

Everything below this line is your skill. Copy from the `---` frontmatter down.

---

```markdown
---
name: {{skill-name}}
description: {{Dense description of what this skill does. Include specific trigger phrases, file types, user intents, and contexts. Err on the side of pushy — undertriggering is worse than overtriggering. ~50-100 words.}}
---

# {{Skill Name}}

<!-- One sentence: what this does and why it matters. This is the model's
     anchor when context is long and attention is thin. -->

<!-- =======================================================================
  PERSONA FRAME (optional — delete if the skill is purely procedural)

  Use when the domain has multiple competing concerns that the model will
  collapse into one by default. The persona forces simultaneous reasoning
  across all of them.

  Structure:
  1. Define 2-3 named lenses. Each lens is a mode of reasoning that
     catches failure modes the others miss.
  2. For each lens, name the specific concepts it thinks in and give
     1-2 concrete examples of what it catches.
  3. Close with the INTERACTION RULE: state what breaks when each lens
     is absent. This is what makes it structural rather than flavor text.

  Example (game juice):
    - The physicist — acceleration curves, input buffering, coyote time...
    - The animator — squash & stretch, anticipation, follow-through...
    - The mixer — feedback stacking, sensory contrast, diminishing returns...
    Then: "physics without animation = tight but sterile. Animation without
    physics = beautiful but fights the player. Either without mixing =
    incredible for 90 seconds, exhausting by minute 10."

  When NOT to use:
    - The skill is a checklist or procedure (follow steps → get output)
    - The skill is informational (here are the token values / API shapes)
    - There's only one axis of quality, not competing tensions

  When to use:
    - The domain has 2-3 concerns that are each necessary but insufficient
    - The model's default is to optimize one axis and ignore the others
    - Experts in the domain hold multiple frames simultaneously
========================================================================= -->

You are a {{Domain}} Expert. You bring {{N}} lenses to every problem:

- **The {{lens-1-name}}** — {{concepts this lens thinks in}}. You know that {{concrete example of what this lens catches that the others miss}}.
- **The {{lens-2-name}}** — {{concepts this lens thinks in}}. You know that {{concrete example of what this lens catches that the others miss}}.
- **The {{lens-3-name}}** — {{concepts this lens thinks in}}. You know that {{concrete example of what this lens catches that the others miss}}.

<!-- INTERACTION RULE: What breaks when each lens is absent. This is the
     structural claim that makes the persona more than flavor text. -->

If any lens is missing, the system breaks: {{lens-1}} without {{lens-2}} produces {{specific failure mode}}. {{lens-2}} without {{lens-1}} produces {{opposite failure mode}}. Either without {{lens-3}} produces {{third failure mode}}.

## Core Principle

<!-- The single most important forcing function. If the model internalizes
     one thing from this entire skill, it should be this. Frame it as a
     constraint or a test, not a wish.

     Good: "Every meaningful action must trigger at least 3 feedback channels."
     Good: "Correct usage is the default path; misuse requires deliberate effort."
     Bad:  "Try to make things feel good." (vague, no test, no anchor) -->

## Workflow

<!-- Define the mandatory sequence the model follows for any request in
     this domain. Number the passes. Each pass should have a clear gate
     condition ("only if needed," "only if ROI is high"). This prevents
     the model from jumping straight to the exciting part and skipping
     fundamentals.

     If your skill doesn't have a multi-pass workflow, delete this section
     and let Quick Reference carry the weight. -->

### Pass 0 — {{Diagnose / Classify}} (fast)
<!-- What does the model assess before doing anything? -->

### Pass 1 — {{Fix fundamentals}} (only if needed)
<!-- What must be right before polish/details matter? -->

### Pass 2 — {{Core implementation}}
<!-- The main work. Minimum viable version. -->

### Pass 3 — {{Secondary / polish}} (only if ROI justifies)
<!-- Nice-to-haves, cascading effects, advanced touches. -->

### Pass 4 — {{Guardrails / validation}}
<!-- Safety, accessibility, edge cases, toggles. -->

## Quick Reference

<!-- The highest-signal rules in the most scannable format.
     Tables > bullets > paragraphs. Include concrete defaults.

     This section is what the model will actually use mid-generation.
     If your skill were reduced to just this section, it should still
     produce noticeably better output than the model's default. -->

| {{Context}}    | {{Default / Rule}}                          |
|----------------|---------------------------------------------|
| {{situation}}  | {{concrete value, range, or behavior}}      |
| {{situation}}  | {{concrete value, range, or behavior}}      |
| {{situation}}  | {{concrete value, range, or behavior}}      |

## Implementation Patterns

<!-- Real code. No pseudocode. Each pattern should be copy-paste ready
     and demonstrate one concept clearly. Include parameter ranges and
     tuning notes inline. Prefer 3-6 patterns that cover the 80% case.

     If patterns vary by framework/platform, put the universal version
     here and push framework-specific variants into references/. -->

### {{Pattern Name}}

<!-- 1-2 sentences: when to use this, what it solves. -->

```{{language}}
// Real, working code with real numbers
```

<!-- Tuning notes: what to change and why. -->

### {{Pattern Name}}

```{{language}}
// Real, working code with real numbers
```

### {{Pattern Name}}

```{{language}}
// Real, working code with real numbers
```

## Anti-Patterns

<!-- The model's training-distribution defaults that this skill must
     override. Format: what the model will want to do → why it's wrong
     → what to do instead.

     Be specific. "Don't write bad code" is useless. "Don't use
     setTimeout for animation timing — it drifts under load and breaks
     on tab-switch; use dt-based tweens instead" is useful. -->

- **{{Bad default}}**: {{Why it's wrong}}. Instead: {{correct approach}}.
- **{{Bad default}}**: {{Why it's wrong}}. Instead: {{correct approach}}.
- **{{Bad default}}**: {{Why it's wrong}}. Instead: {{correct approach}}.

## Checklist

<!-- Ship gate. The model should verify these before considering the
     task complete. Frame as testable assertions, not aspirations. -->

### {{Category}} (e.g., Fundamentals)
- [ ] {{Testable assertion}}
- [ ] {{Testable assertion}}

### {{Category}} (e.g., Quality)
- [ ] {{Testable assertion}}
- [ ] {{Testable assertion}}

### {{Category}} (e.g., Engineering)
- [ ] {{Testable assertion}}
- [ ] {{Testable assertion}}

## References

<!-- Only if you have references/ files. List them with clear guidance
     on WHEN to read each one — the model should not read all of them
     every time. -->

- `references/{{topic}}.md` — {{When to read this}}
- `references/{{topic}}.md` — {{When to read this}}
```
