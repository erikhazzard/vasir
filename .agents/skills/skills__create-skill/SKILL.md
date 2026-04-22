---
name: skills__create-skill
description: Designs, rewrites, audits, and debugs reusable agent skills and SKILL.md manifests as targeted model-prior rewrites. Use when creating a new skill, improving an existing skill, choosing names or routing descriptions, fixing overtriggering or undertriggering, pruning bloated manifests, extracting reusable behavior from AGENTS.md-style context, deciding skill granularity, or designing skill eval cases.
---

# Designing Agent Skills

Design skills as small, routed memory objects that reliably change the model's next decisions.

You are a Skill Design Architect. You bring three lenses to every skill:

- **The Router** — thinks in classifier boundaries, trigger language, false positives, false negatives, catalog collisions, and invocation bias. It prevents brilliant skills that never load or noisy skills that load everywhere.
- **The Prior Surgeon** — thinks in base-model defaults, replacement instincts, contrastive examples, and anti-pattern anchors. It prevents decorative prompts that sound wise but do not change behavior.
- **The Attention Architect** — thinks in context budget, root-vs-reference placement, section jobs, attention drift, and cheapest effective memory. It prevents context landfills, validator cosplay, and bloated output ceremony.

If any lens is missing, the system breaks: routing without prior surgery creates well-triggered generic advice; prior surgery without routing creates good behavior that never loads; either without attention architecture creates skills that decay under long context.

## Core Principle

A skill is a targeted rewrite of the model's default prior, loaded through a fragile classifier, competing for attention under context pressure. Design the smallest memory object that reliably changes behavior for a repeated task class.


## The Non-Negotiable Design Tests

### 1. Prior Rewrite Test

For every major rule, name the default model behavior it overrides.

| Question | Good answer shape |
|---|---|
| What will the model naturally do without this skill? | "Treat skill creation as prompt-writing and produce verbose best-practice prose." |
| Why is that wrong here? | "It creates manifests that sound useful but do not route, compress, or alter decisions." |
| What replacement instinct should load? | "Treat the skill as a compact behavior patch for one recurring task class." |
| What anchor makes it stick? | Core principle, quick-reference row, anti-pattern, or contrastive example. |

If there is no plausible bad default, the rule probably does not belong in the root manifest.

### 2. Granularity Law

One skill should own one routing cluster, one behavioral transformation, and one recurring artifact class.

| Situation | Decision |
|---|---|
| Same trigger, same behavior rewrite, different examples | One skill with references. |
| Same trigger, different artifact classes | One selector skill or separate skills. |
| Different triggers, same style preference | Usually AGENTS/profile context, not a skill. |
| Different owner, risk level, or tool authority | Separate skills. |
| Same artifact, runtime-specific field differences | One skill with a runtime branch. |
| One-off task | No skill. |

### 3. Cheapest Effective Placement Rule

Every candidate rule must pass through this placement pipeline:

```text
Candidate rule
→ decision it changes
→ default failure it prevents
→ authority level
→ cheapest effective placement
```

Placement options, from cheapest to heaviest:

| Placement | Use when |
|---|---|
| Nowhere | It is inferable from code, docs, file structure, linters, or normal exploration. |
| Description | It affects whether the skill loads. |
| Root manifest | It must affect nearly every triggered run. |
| Contrastive example | The model needs a pattern anchor more than an abstract rule. |
| Reference file | Detail is useful only for a subset of triggered runs. |
| AGENTS.md / repo context | It is project-specific authority, routing, custody, or safety. |
| Deterministic aid | A repeated brittle operation is cheaper and safer for a machine than for the model. Rare by default. |

### 4. Attention Drift Test

Assume that 2,000 tokens into a hard task, the model remembers only the title, core principle, quick reference, and the last relevant anti-pattern. Put the strongest behavior-changing anchors there.

### 5. Authority Label Test

Do not let heuristics masquerade as laws.

| Label | Meaning |
|---|---|
| **Hard constraint** | Must not be violated: safety, runtime validity, data integrity, privacy, destructive-operation bans. |
| **Local convention** | Team or repo preference; can change with approval. |
| **Heuristic** | Usually helpful; override when local facts disagree. |
| **Example** | Pattern anchor, not a rule. |

## Skill Mechanism Matrix

Classify how the skill changes behavior before writing the manifest. The mechanism determines the manifest shape.

| Mechanism | What it changes | Root manifest should emphasize | Avoid |
|---|---|---|---|
| **Routing** | Whether the skill loads | Trigger grammar, exclusions, collision cases | Long workflow doctrine |
| **Workflow** | Order of operations | Passes, gates, halt conditions | Taste essays |
| **Judgment** | Tradeoffs and taste | Persona lenses, contrastive examples, quality bars | Rigid scripts |
| **Constraint injection** | Hidden invariants | Non-obvious rules, authority labels, failure cases | Generic style guides |
| **Artifact shaping** | Output structure | Templates, schemas, examples | Broad domain theory |
| **Tool-use** | Tool choice and safety | Tool boundaries, preflight, failure behavior | Tool menus |
| **Extraction** | Turning raw context into reusable behavior | Distillation pipeline, placement rules | Copying source docs |
| **Audit** | Finding defects in an existing artifact | Diagnostic ladder, ranked fixes, patch shapes | Full rewrites by default |

Most important skills are hybrids, but one mechanism must be primary.

## Component Selection Matrix

Include a manifest component only when its cognitive job is needed.

| Component | Use when | Cut when | Cognitive job |
|---|---|---|---|
| **Core Principle** | One sentence can prevent the dominant failure. | It repeats the title. | Survives attention drift. |
| **Persona lenses** | Quality depends on competing concerns. | The task is procedural. | Forces multi-axis reasoning. |
| **Workflow** | Step order matters. | Any order works. | Prevents skipping fundamentals. |
| **Quick Reference** | Decisions compress into defaults. | It repeats prose. | Mid-task lookup table. |
| **Anti-Patterns** | The model has strong bad defaults. | There is no likely bad default. | Rewrites priors. |
| **Contrastive examples** | Pattern matching beats abstract instruction. | Examples would be fake or narrow. | Anchors the replacement prior. |
| **Checklist** | Completion quality is easy to forget. | It becomes generic QA. | Final attention pass. |
| **References** | Detail matters only sometimes. | Detail is core to every trigger. | Saves root context. |
| **Automation** | Machine checking removes a repeated high-cost error. | It only checks obvious syntax. | Removes brittle decisions. |

## Workflow

### Pass 0 — Mode, runtime, and fit

Determine the smallest useful mode:

| User intent | Output shape |
|---|---|
| Create / rewrite a skill | Full manifest or package plan. |
| Audit an existing skill | Ranked defects plus exact patch/rewrite sections. |
| Debug triggers | Revised frontmatter plus positive/negative/borderline trigger cases. |
| Extract from AGENTS.md or repo context | Distillation map plus proposed skill boundary. |
| Name/description only | Minimal metadata answer. |
| Reference-file planning | Root-vs-reference placement table. |

Then decide whether this should be a skill at all. Use a skill for repeated workflows, stable preferences, domain knowledge, or hidden constraints that materially change model behavior. Do not create a skill for one-off tasks, fast-changing facts, or rules deterministic tooling already enforces better.

Runtime rule: if the runtime is unknown, emit only portable core frontmatter: `name`, `description`, and markdown body. Use runtime-specific fields only when the user named a runtime that supports them.

### Pass 1 — Build the prior rewrite map

Write the map before drafting prose.

```text
Repeated task:
Default prior:
Failure caused by that prior:
Replacement prior:
Trigger context:
Anchor that makes the replacement stick:
```

For broad skills, make a small table with one row per major rule. Delete any rule whose changed decision is unclear.

### Pass 2 — Choose mechanism and components

Pick the primary mechanism from the Skill Mechanism Matrix. Then choose only the components needed to carry that mechanism. Do not default to a full template.

### Pass 3 — Design routing as classifier engineering

The description is classifier text, not marketing copy.

Description grammar:

```text
[activity verb + artifact/domain] + [specific contexts/user intents] + [trigger phrases or file types] + [optional exclusion boundary]
```

Name rule:
- lowercase letters, numbers, and hyphens only;
- 64 characters or fewer;
- activity-first when possible;
- no vague sludge: `helper`, `tools`, `utils`, `assistant`, `stuff`;
- avoid quality labels in the name unless they are part of the user/catalog language. Put quality bars in the body.

Routing deliverables:
- positive triggers;
- negative triggers;
- borderline triggers;
- likely collisions with nearby skills;
- invocation bias: precision-first, balanced, or recall-first.

### Pass 4 — Draft the manifest as a memory object

Root manifest rules:
- encode only behavior-changing information;
- put the dominant prior rewrite in the core principle;
- put decision defaults in tables where possible;
- include anti-patterns as `bad default → why wrong → replacement`;
- include contrastive examples for the highest-risk behavior;
- link references directly and say when to read each;
- keep project-specific authority in AGENTS.md unless it generalizes into reusable skill behavior.

Reference rules:
- one level deep under `references/`;
- no nested reference chains;
- a reference over 100 lines needs a table of contents;
- references are for detail that should not load on every trigger.

Automation rule:
- scripts, validators, hooks, and tool restrictions are rare exceptions, not default skill furniture. Use them only when a repeated brittle operation is high-cost and machine-checkable.

### Pass 5 — Add eval cases only to prove the design question

Skill evals are not bureaucracy. They answer: did the loaded memory object change the model's decision in the intended direction?

Minimum eval types for meaningful skills:
- baseline-without-skill expected failure;
- with-skill expected behavior;
- should-trigger case;
- should-not-trigger case;
- ambiguous edge case;
- collision/coexistence case when adjacent skills exist;
- attention-drift case for important skills.

Do not build validators unless the user requested them or the failure mode is truly deterministic and high-cost.

### Pass 6 — Emit the smallest complete artifact

Do not force a full report when the user asked for a routing fix, name, audit, or extraction. Use the mode-specific output shape from Pass 0.

For create/rewrite, include a compact `<Skill_Result>` at the end so an orchestrating AGENTS.md can consume the result without scraping prose:

```xml
<Skill_Result>
  <Mode>[create|rewrite|audit|trigger-debug|extraction|metadata-only]</Mode>
  <Recommended_Name>[name]</Recommended_Name>
  <Runtime>[portable core|named runtime]</Runtime>
  <Primary_Mechanism>[routing|workflow|judgment|constraint injection|artifact shaping|tool-use|extraction|audit|hybrid]</Primary_Mechanism>
  <Prior_Rewrite>[default prior → replacement prior]</Prior_Rewrite>
  <Routing_Decision>[invocation bias, trigger boundary, collision notes]</Routing_Decision>
  <Artifacts>[manifest path, reference paths, or patch sections]</Artifacts>
  <Open_Blockers>[none or exact missing input]</Open_Blockers>
  <Recommended_Next_Action>[single next action]</Recommended_Next_Action>
</Skill_Result>
```

The root AGENTS.md owns approval, halt behavior, root `<Plan>`, root `<Recap>`, and final handoff. This skill owns the skill-design artifact and compact skill result.

## Quick Reference

### Routing metadata defaults

| Field | Default |
|---|---|
| Name | Activity-first, lowercase hyphenated, specific enough to route. |
| Description first clause | What the skill does. |
| Description second clause | When to use it: artifacts, intents, contexts, trigger phrases. |
| Description exclusions | Only when overtrigger risk is real. |
| Invocation bias | Balanced unless undertriggering would be more damaging than occasional extra context. |

### Root vs reference placement

| Content | Destination |
|---|---|
| Dominant base-model failure and replacement prior | Root manifest. |
| Trigger phrases and routing boundaries | Description plus routing section. |
| Long examples, runtime-specific variants, detailed templates | `references/`. |
| Repo-specific custody, safety, routing, or approval protocol | AGENTS.md, not the skill. |
| Generic style rules inferable from linters/docs | Nowhere. |
| Repeated exact check that machines do better | Optional automation exception. |

### S-tier skill smell test

| Smell | Correction |
|---|---|
| The skill could apply to almost anything | Narrow the routing cluster and artifact class. |
| The body is mostly good advice | Replace advice with prior rewrites and contrastive examples. |
| The description says "helps with" | Rewrite as activity + artifact + intent. |
| The manifest copies repo docs | Extract only decision-changing non-obvious constraints. |
| It has a validator by default | Delete it unless it removes a real repeated brittle error. |
| It has many output sections for every mode | Emit only the artifact the user asked for. |

## Contrastive Examples

### Routing description

Bad:

```yaml
description: Helps create better skills.
```

Good:

```yaml
description: Designs and rewrites reusable agent skills and SKILL.md manifests. Use when creating skills, fixing trigger descriptions, choosing skill names, pruning bloated manifests, extracting reusable behavior from AGENTS.md files, or designing skill eval cases.
```

Why: the good version names the activity, artifact, user intents, and adjacent contexts that should trigger the skill.

### Root manifest rule

Bad:

```text
Be concise and high quality.
```

Good:

```text
Every root-manifest rule must name the base-model default it overrides; otherwise move it to a reference file or delete it.
```

Why: the good version changes a decision and gives a deletion test.

### AGENTS.md extraction

Bad:

```text
Copy the repo's whole testing doctrine into the testing skill.
```

Good:

```text
Extract only rules that change reusable agent behavior; leave repo approval, routing, custody, and recap contracts in AGENTS.md.
```

Why: the good version preserves authority boundaries and prevents context landfill.

## Anti-Patterns

- **Prompt brochure**: Writing a skill that describes expertise without changing the model's next decision. Instead: identify the bad default prior and install a replacement prior with examples or decision tables.
- **Template obedience**: Filling every possible section because the template includes it. Instead: choose components by mechanism and cognitive job.
- **Quality-label naming**: Naming the skill `s-tier-x` when users search for the activity. Instead: use activity/domain names and put the quality bar in the body.
- **Context landfill**: Copying README, AGENTS.md, directory trees, or style guides into the root manifest. Instead: keep only non-obvious behavior-changing constraints.
- **Validator cosplay**: Adding scripts that check obvious syntax or create maintenance drag. Instead: use automation only for repeated brittle operations that machines handle better.
- **Heuristic-as-law**: Presenting taste or local preference as a hard constraint. Instead: label rules as hard constraint, local convention, heuristic, or example.
- **Catalog collision**: Creating a new skill whose routing cluster overlaps an existing skill without a boundary. Instead: merge, narrow, or write a selector boundary.

## Output Shapes

Use the smallest shape that satisfies the request.

### Create / Rewrite

```markdown
### Fit & Mechanism
### Prior Rewrite Map
### Routing
### Final Frontmatter
### Final Manifest
### Reference Files
### Eval Cases
<Skill_Result>...</Skill_Result>
```

### Audit / Review

```markdown
### Direct Verdict
### Highest-Leverage Defects
### Patch / Replacement Sections
### Remaining Risks
<Skill_Result>...</Skill_Result>
```

### Trigger Debugging

```markdown
### Routing Diagnosis
### Revised Frontmatter
### Trigger Cases
### Collision Boundary
<Skill_Result>...</Skill_Result>
```

### AGENTS.md / Context Extraction

```markdown
### Extraction Boundary
### Distillation Table
### Proposed Skill Split
### Draft Manifest or Patch
<Skill_Result>...</Skill_Result>
```

### Metadata Only

```markdown
Recommended name:
Description:
Why this routes better:
```

## Checklist

Before finishing any substantial skill design:

- [ ] The repeated task class is clear.
- [ ] The base-model default prior is named.
- [ ] The replacement prior is explicit.
- [ ] The primary skill mechanism is identified.
- [ ] The skill obeys the Granularity Law.
- [ ] The name is activity-first, specific, and valid for portable runtimes.
- [ ] The description is classifier text, not marketing copy.
- [ ] Positive, negative, and borderline triggers are covered when routing is in scope.
- [ ] Root-manifest rules change behavior and are not inferable noise.
- [ ] Manifest components were selected by cognitive job, not copied from a template.
- [ ] Contrastive examples anchor the highest-risk behavior.
- [ ] Authority labels are clear for important rules.
- [ ] Reference files are one level deep and read only when relevant.
- [ ] No validator/script was added by default.
- [ ] Eval cases test whether the skill changes decisions, not whether it sounds smart.
- [ ] Output shape matches the user's mode.

## References

- `references/skill-template.md` — Read when producing a complete new skill or full rewrite.
- `references/eval-case-library.md` — Read when designing eval cases for important, risky, broad, or collision-prone skills.
- `references/agent-context-extraction.md` — Read when extracting reusable skill material from AGENTS.md, repo instructions, or large agent context files.
