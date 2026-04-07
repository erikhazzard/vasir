# .agents/

Cross-platform agent skills for this repository. These follow the [Agent Skills open standard](https://agentskills.io/specification) and work across Claude Code, OpenAI Codex, GitHub Copilot, Gemini CLI, Kiro, and 20+ other tools.

## Setup

Symlink into each tool's expected directory so they all read from one source of truth:

```bash
# Claude Code
ln -s ../.agents/skills .claude/skills

# Codex (optional — it reads .agents/skills/ natively)
ln -s ../.agents/skills .codex/skills
```

## Directory Structure

```
.agents/
├── README.md              ← you are here
└── skills/
    └── <skill-name>/
        ├── SKILL.md       ← required — instructions + metadata
        ├── scripts/       ← optional — executable code
        ├── references/    ← optional — extra docs loaded on demand
        └── assets/        ← optional — templates, configs, boilerplate
```

## Writing a Skill

### SKILL.md (required)

Every skill needs a `SKILL.md` with YAML frontmatter and markdown instructions.

```markdown
---
name: my-skill
description: One-paragraph description of WHEN this skill should trigger.  Be specific — this is how the agent decides whether to use it.
---

## Steps

1. Do the first thing
2. Do the second thing

## Rules

- Don't do this
- Always do that
```

#### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | **yes** | Skill identifier. Should match the folder name. |
| `description` | **yes** | When to use this skill. This is the agent's decision boundary — be explicit about triggers and non-triggers. |
| `license` | no | License name or path to license file. |
| `metadata` | no | Freeform key-value pairs (author, version, tags, etc.) |

#### Writing Good Descriptions

The description is everything. It determines whether the agent auto-selects your skill. Include:

- **What it does**: "Fixes bugs and debugs errors"
- **When to use it**: "Use when investigating unexpected behavior, stack traces, or test failures"
- **When NOT to use it**: "Do not use for feature work, refactors, or performance optimization"

Bad: `"Helps with bugs"`
Good: `"Use when fixing bugs, debugging errors, or investigating unexpected behavior. Trigger on stack traces, error messages, failing tests, or user-reported issues. Do NOT use for new features, refactors, or performance work."`

#### Writing Good Instructions

The markdown body after frontmatter is what the agent follows. Keep it under ~5000 tokens. Tips:

- Write imperative steps, not descriptions ("Run the tests" not "Tests should be run")
- Be specific about inputs and outputs
- Include concrete examples where helpful
- Reference files in `scripts/` and `references/` by relative path — agents load them on demand

### scripts/ (optional)

Executable code the agent runs directly. Use for deterministic behavior where you don't want the agent improvising.

```
scripts/
├── run-tests.sh            # bash scripts
├── validate-output.py      # python scripts
├── lint-check.js           # node scripts
└── ...
```

Guidelines:
- Scripts should be **self-contained** or clearly document dependencies
- Include a shebang line (`#!/bin/bash`, `#!/usr/bin/env python3`)
- Handle errors gracefully — print useful messages on failure
- Reference them from SKILL.md: `"Run the validation script at ./scripts/validate-output.py"`

### references/ (optional)

Extra documentation the agent reads **only when needed** during skill execution. This is how you give the agent deep knowledge without bloating the context window at startup.

```
references/
├── error-codes.md          # domain-specific reference material
├── architecture.md         # system design docs
├── api-contracts.md        # API specs relevant to this skill
├── style-guide.md          # coding conventions
└── ...
```

Guidelines:
- Keep individual files focused — one topic per file
- These load on demand, so smaller files = less context waste
- Reference them from SKILL.md: `"See ./references/error-codes.md for the full error code table"`
- Good for: API docs, coding standards, architecture decisions, checklists

### assets/ (optional)

Templates, config files, boilerplate, or any static resources the skill needs.

```
assets/
├── pr-template.md          # template for pull requests
├── test-scaffold.py        # boilerplate test file
├── config.example.json     # example configuration
└── ...
```

## How It Works (Progressive Disclosure)

Skills use a three-tier loading strategy to protect the context window:

1. **Startup** — Agent reads only `name` + `description` from every skill (~30-50 tokens each). Hundreds of skills = no performance hit.
2. **Activation** — When the agent decides a skill matches your task, it loads the full `SKILL.md` body.
3. **Execution** — As the agent works, it pulls in `scripts/`, `references/`, and `assets/` files only as needed.

This means you can have a large `references/` folder and it costs nothing until the agent actually needs it.

## Invoking Skills

| Tool | Explicit | Auto |
|------|----------|------|
| Claude Code | `/skill <name>` or mention by name | ✅ matches on description |
| Codex | `$<name>` or `/skills` menu | ✅ matches on description |
| Copilot | `/skills` menu or mention by name | ✅ matches on description |

For auto-invocation, just describe your task naturally and the agent picks the right skill.

## Example: bug-fix Skill

```
skills/
└── bug-fix/
    ├── SKILL.md
    ├── scripts/
    │   └── repro-test.sh
    └── references/
        └── common-pitfalls.md
```

**SKILL.md:**
```markdown
---
name: bug-fix
description: >
  Use when fixing bugs, debugging errors, or investigating unexpected behavior.
  Triggers: stack traces, error messages, failing tests, user-reported issues.
  Do NOT use for new features, refactors, or performance optimization.
---

## Steps

1. Read the bug report or error carefully. Identify the expected vs actual behavior.
2. Find relevant source files — grep for the error message, trace the call stack.
3. Write a failing test that reproduces the bug BEFORE making any code changes.
   Run `./scripts/repro-test.sh` to scaffold the test if helpful.
4. Fix the bug with the smallest possible change.
5. Run the full test suite to confirm the fix and check for regressions.
6. If the bug was caused by a missing edge case, scan for similar patterns elsewhere.
7. See `./references/common-pitfalls.md` for known gotchas in this codebase.

## Rules

- Never refactor unrelated code during a bug fix.
- Always explain the root cause in your commit message.
- If you can't reproduce the bug, say so — don't guess.
- Prefer targeted fixes over broad defensive coding.
```

## Example: code-review Skill

```markdown
---
name: code-review
description: >
  Use when reviewing code changes, pull requests, or diffs.
  Triggers: PR review requests, "review this", diff analysis.
  Do NOT use for writing new code or making changes.
---

## Steps

1. Read the full diff. Understand the intent before commenting.
2. Check for correctness — does the logic actually do what it claims?
3. Check for edge cases — null, empty, concurrent, error paths.
4. Check for test coverage — are the new paths tested?
5. Check for readability — would a new team member understand this?
6. Keep feedback constructive. Say what to do, not just what's wrong.

## Rules

- Start with what's good before noting issues.
- Distinguish blocking issues from nits.
- Don't bikeshed on style if there's a formatter/linter.
- If unsure about something, ask — don't assume it's wrong.
```

## Tips

- **Keep skills focused** — one job per skill. "bug-fix" not "bug-fix-and-refactor".
- **Test your descriptions** — try prompts that should and shouldn't trigger the skill.
- **< ~5000 tokens** for SKILL.md body. Offload detail to `references/`.
- **Commit your skills** — they're version-controlled project knowledge. Your team benefits.
- **Global skills** go in `~/.claude/skills/` or `~/.codex/skills/` for personal workflows.