# AGENTS.md / Agent Context Extraction

Use this when converting large agent context, repo doctrine, or AGENTS.md rules into one or more skills. The goal is not to copy authority. The goal is to extract reusable behavior that belongs in a routed skill.

## Extraction boundary

Keep these in AGENTS.md or repo context:

| Source material | Why it usually stays out of a skill |
|---|---|
| Safety, privacy, destructive-operation bans | Higher-precedence global authority. |
| Shared worktree custody | Repo/session operating contract. |
| Approval, halt, recap, handoff formats | Orchestration contract, not reusable skill behavior. |
| Directory routing and scoped AGENTS rules | Repo topology changes by project. |
| Active work-spec state | Task memory, not general skill doctrine. |
| Exact commands for one repo | Better discovered locally or kept in repo docs. |

Good candidates for skills:

| Source material | Skill destination |
|---|---|
| Repeated planning artifact design | Planning/work-spec skill. |
| Eval gate design patterns | Eval-design skill. |
| Skill design doctrine | Skill-creation skill. |
| Fileoverview/header custody doctrine | Documentation/code-context skill. |
| Domain-specific hidden invariants | Scoped domain skill when reusable across tasks. |

## Distillation pipeline

For each candidate rule, fill this table before writing skill prose.

| Raw rule | Source authority | Decision changed | Base-model failure prevented | Generality | Placement |
|---|---|---|---|---|---|
| {{quoted or summarized rule}} | hard / local / heuristic / example | {{what the agent would do differently}} | {{bad default}} | repo-only / domain-general / skill-general | description / root / reference / AGENTS / nowhere |

Delete the row if `Decision changed` is vague.

## Compression rules

- Preserve the constraint, not the source wording.
- Replace long doctrine with a decision test.
- Keep examples only when they anchor a pattern the model would otherwise miss.
- Move detailed schemas into references unless every triggered run needs them.
- Do not import root AGENTS ceremony into a skill just because it looks S-tier.

## Example

Raw AGENTS.md material:

```text
Every human-facing terminal message from an active agent work turn MUST include exactly one <Recap> block.
```

Extraction decision:

| Field | Value |
|---|---|
| Source authority | Hard root-agent orchestration constraint. |
| Decision changed | Whether the agent emits root terminal protocol. |
| Base-model failure prevented | Ending work turns without a handoff record. |
| Generality | Repo/orchestrator-specific. |
| Placement | AGENTS.md, not skill. |

Do not copy this into a skill-creation skill.

Raw skill-design material:

```text
Encode only information that changes behavior.
```

Extraction decision:

| Field | Value |
|---|---|
| Source authority | Skill-design hard constraint. |
| Decision changed | Whether a manifest line is included. |
| Base-model failure prevented | Bloated skill manifests full of generic advice. |
| Generality | Skill-general. |
| Placement | Root manifest core principle / quick reference. |

This belongs in the skill.
