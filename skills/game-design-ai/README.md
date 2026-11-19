# Game AI Architect Skill Package

This package defines a reusable skill for designing production-grade game AI. It is intended for agents that produce natural-language design specs and pseudocode, not engine-specific runtime code.

## Files

- `SKILL.md` — main operating procedure and output format.
- `references/` — core frameworks used by the skill.
- `modules/` — genre/problem modules layered on top of the core skill.
- `examples/` — templates and concrete examples.
- `checklists/` — review rubrics for final validation.

## Default design philosophy

- Offline LLM/spec authoring is allowed.
- Runtime AI is deterministic by default.
- Every design includes agent AI, director-layer evaluation, testing, observability, and tuning.
- Plausible implementation guesses may be used as inspiration but should be labeled when discussing existing shipped games.
