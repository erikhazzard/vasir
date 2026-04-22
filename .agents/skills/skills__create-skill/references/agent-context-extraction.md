# Agent Context Extraction

Use this when extracting reusable skill material from AGENTS.md, repo instructions, large prompts, or existing agent doctrine.

## Extraction Pipeline

Convert raw context into skill material through this pipeline:

```text
Raw rule
→ source authority
→ expertise payload
→ decision it changes
→ base-model failure it prevents
→ generality level
→ cheapest effective placement
→ compressed wording
```

## Placement Decisions

| Raw material | Best destination |
|---|---|
| Safety, destructive-operation bans, approval, custody | AGENTS.md or root operating contract, not skill. |
| Repo routing, scoped file ownership, local paths | AGENTS.md unless it generalizes into skill behavior. |
| Work-spec or eval-plan schemas | The relevant planning/eval skill. |
| Reusable design doctrine | Skill root manifest if it changes nearly every triggered run. |
| Detailed examples, templates, long rationale | `references/`. |
| One-off task instruction | Nowhere; do not skillify. |
| Inferable directory structure or style rule | Nowhere unless non-obvious and behavior-changing. |
| Repeated brittle machine-checkable operation | Optional automation exception. |

## Distillation Table

Use this table before drafting a skill from large context:

| Raw rule | Authority | Expertise payload | Bad default prevented | Placement | Final wording |
|---|---|---|---|---|---|
| {{source text}} | hard / convention / heuristic / example | {{knowledge/tradeoff/scar}} | {{model failure}} | {{where it belongs}} | {{compressed rule}} |

## Keep Out of Skills by Default

- root approval and halt protocols;
- terminal recap formats owned by AGENTS.md;
- mutable repo routing maps;
- exhaustive directory trees;
- broad style guides already enforced by tooling;
- copied README prose;
- time-sensitive facts;
- project-specific secrets, credentials, or operational identifiers.

## High-Value Extraction Targets

Extract these when they generalize:

- hidden invariants that make obvious fixes wrong;
- value hierarchies that decide tradeoffs;
- failure scars that prevent repeated model mistakes;
- local ontology that prevents category errors;
- trigger boundaries that keep skills from colliding;
- artifact shapes the model commonly mangles;
- attention anchors that survive long-context drift.
