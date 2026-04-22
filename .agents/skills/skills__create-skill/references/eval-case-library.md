# Skill Eval Case Library

Use this when the skill is important, broad, risky, collision-prone, or likely to decay. Skill evals answer one question: did the loaded skill change the model's decisions in the intended direction?

## Minimal eval set

| Eval type | Prompt / scenario | Expected behavior | Pass criteria | Failure implies |
|---|---|---|---|---|
| Baseline without skill | Give the base model a realistic task in the domain. | It shows the known bad default. | The failure is observable enough to justify a skill. | The skill may not be needed, or the failure model is wrong. |
| With-skill behavior | Same task with the skill loaded. | It follows the replacement prior. | Output differs in the intended decision, not just wording. | The root manifest is not changing behavior. |
| Should trigger | User asks for the repeated task class using natural language. | Skill loads or would be selected. | Description contains activity, artifact, and intent language. | Routing description is too narrow. |
| Should not trigger | Adjacent but different task. | Skill stays quiet. | Boundary language prevents collision. | Routing is too broad. |
| Ambiguous edge | User asks for something near the boundary. | Agent either invokes with a stated narrow scope or asks one decisive question. | No kitchen-sink behavior. | Boundary is unclear. |

## Important-skill additions

| Eval type | Scenario | Pass criteria |
|---|---|---|
| Attention drift | Put the model 1,500-2,500 tokens into a long task and ask for a decision the skill should govern. | It still follows the core principle, quick reference, or anti-pattern anchor. |
| Collision | Present a prompt that could match this skill and an adjacent skill. | It chooses the right skill or narrows the boundary explicitly. |
| Extraction | Provide noisy AGENTS.md-style context and ask for a skill. | It preserves authority boundaries and extracts only reusable behavior-changing material. |
| Minimality | Ask for a small metadata fix. | It does not emit a full manifest report. |
| Authority labeling | Mix hard constraints, conventions, heuristics, and examples. | It labels them correctly and does not turn preferences into laws. |

## Eval prompt templates

### Baseline prior failure

```text
Create a {{skill/domain artifact}} for {{realistic recurring task}}. Keep it concise.
```

Pass if the output reveals the base-model default the skill is meant to fix.

### With-skill replacement prior

```text
Using the {{skill name}} skill, create a {{skill/domain artifact}} for {{same task}}.
```

Pass if the output changes the actual design decision: routing, manifest shape, granularity, examples, placement, or authority labeling.

### Trigger positive

```text
I need to {{user-language task phrase}} for {{artifact/context}}.
```

Pass if the skill description should clearly activate.

### Trigger negative

```text
I need help with {{nearby task that should belong elsewhere}}.
```

Pass if the skill should not activate.

### Ambiguous boundary

```text
Can you improve this {{artifact}}? {{Include a clue that could point to two skills.}}
```

Pass if the model identifies the boundary and proceeds narrowly instead of invoking every adjacent doctrine.
