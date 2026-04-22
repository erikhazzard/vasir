# Eval Case Library for Agent Skills

Use this when designing eval cases for important, risky, broad, or collision-prone skills. Skill evals answer whether the loaded memory object transfers expertise and changes model decisions.

## Core Eval Shapes

| Eval type | Prompt shape | Expected behavior | Failure implies |
|---|---|---|---|
| Baseline without skill | Ask for the target task with no skill. | Model follows the known bad default. | The skill may not be needed, or the failure model is wrong. |
| With-skill behavior | Same task with the skill loaded. | Model applies the expertise payload and replacement prior. | Manifest is not strong enough or anchors are misplaced. |
| Should trigger | User names the artifact, workflow, or expertise need. | Skill loads or would be selected. | Description undertriggers. |
| Should not trigger | Adjacent topic without the recurring task class. | Skill stays quiet. | Description overtriggers. |
| Borderline | Similar artifact but different intent. | Model asks one clarifying question or uses nearest boundary. | Routing boundary is vague. |
| Collision | Prompt could match two adjacent skills. | Model chooses, merges, or defers according to boundary. | Catalog design is unclear. |
| Attention drift | Long prompt with distractions before the key task. | Core principle and quick reference still shape output. | Anchors are too weak or buried. |

## Pass Criteria Pattern

Each eval should include:

```text
Scenario:
Skill state: baseline | loaded | ambiguous
Expected behavior:
Pass criteria:
Failure would imply:
```

## What to Measure

Good skill evals check for changed decisions, not pretty prose.

Look for:
- the model names the expertise payload before drafting;
- the model identifies the bad default prior;
- the output uses the replacement instinct;
- routing metadata includes activity, artifact, intent, and expertise need;
- root content excludes inferable noise;
- examples and anti-patterns anchor the highest-risk behavior;
- output shape matches the user's requested mode.

## Minimum Eval Sets

| Skill risk | Minimum set |
|---|---|
| Small metadata fix | Should trigger, should not trigger, revised description quality. |
| Normal create/rewrite skill | Baseline, with-skill, should trigger, should not trigger, borderline. |
| Broad or catalog-adjacent skill | Normal set plus collision and attention-drift. |
| Safety/tooling skill | Normal set plus hostile misuse and tool-boundary cases. |
