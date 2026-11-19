# Skill Template — the Full Create/Rewrite Arc

Read this when producing a complete new skill or a full rewrite. For audits, trigger fixes, or metadata answers, the root manifest alone is enough.

Use these passes as working structures at the depth the task needs. The creator's `SKILL.md` owns scope, authority and output: retain enabling knowledge and useful procedures, and surface only material decisions rather than printing every worksheet.

**Contents:** 1. The Eight Passes · 2. Mechanism Matrix · 3. Component Selection Matrix · 4. Annotated SKILL.md Skeleton · 5. Per-Genus Blocks · 6. Drafting Rules · 7. Output Shapes by Mode

---

## 1. The Eight Passes

### Pass 0 — Mode, runtime, and fit
Pick the smallest useful mode (create/rewrite · audit · trigger-debug · extraction · metadata-only · reference planning). Use a skill for repeated workflows, stable judgment, hidden constraints, or value tradeoffs that materially change behavior. Do not create one for one-off tasks, fast-changing facts, or rules deterministic tooling enforces better. Runtime unknown → portable frontmatter only (`name`, `description`, body); runtime-specific fields only when the user named a runtime that supports them.

### Pass 0.5 — Map the system
Root contract, siblings, genus, provenance (root manifest, "Map the System"). Map owns / cites / borders and the applicable conventions; explain only consequential ownership or routing decisions in the result.

### Pass 1 — Extract the expertise payload

```text
Repeated task class:
Expertise payload:
Hard-won insight:
Values/tradeoffs:
Non-obvious constraints:
Failure scars:
What not to encode:
```

A thin map calls for checking whether a template, checklist, document or existing tool would suffice. Recurring procedures and artifact schemas can still earn a skill when packaging them prevents repeated mistakes; do not invent expert insights to fill the map.

### Pass 2 — Build the prior-rewrite map
One row per major rule, using the root manifest's chain:

```text
Scar/value:
Bad default prior:
Why it fails:
Replacement instinct:
Manifest anchor:
Boundary / exception:
```

Delete any row whose changed decision is unclear.

### Pass 3 — Choose mechanism and components
Pick the primary mechanism (§2) and only the components that carry it (§3). Every selected component must name the cognitive failure it prevents; never fill sections by habit.

### Pass 4 — Design routing
Classifier grammar, name rule, and routing deliverables per the root manifest. Write the positive/negative/borderline trigger lists before the description — the description is their compression.

### Pass 5 — Draft the manifest as a memory object
Drafting rules in §6. Draft the core principle and anti-patterns first (they carry the prior rewrite), the workflow last (it is the cheapest part to get right).

### Pass 6 — Eval cases
Select cases that can reveal missing or misdirected steering; the seven types in [Evaluation case design](eval-case-library.md) are a coverage menu. Follow the destination's actual evaluation requirements, freeze criteria before inference, and distinguish authored cases from observed results. Lightweight validation in `SKILL.md` governs ordinary authoring; this template adds no automatic live run or mandatory seven-case gate.

### Pass 7 — Emit the smallest complete artifact
Match the output shape to the mode (§7). The root contract owns approval and halt behavior; this skill owns the design artifact and a compact Skill Result.

---

## 2. Mechanism Matrix

Classify how the skill changes behavior; the primary mechanism determines manifest shape. Most serious skills are hybrids — one mechanism must still be primary.

| Mechanism | What it changes | Manifest emphasizes | Avoid |
|---|---|---|---|
| **Routing** | Whether the skill loads | Trigger grammar, exclusions, collisions | Long workflow doctrine |
| **Workflow** | Order of operations | Passes, gates, halt conditions | Taste essays |
| **Judgment** | Tradeoffs and taste | Persona lenses, contrastive examples, quality bars | Rigid scripts |
| **Constraint injection** | Hidden invariants | Non-obvious rules, authority labels, failure cases | Generic style guides |
| **Artifact shaping** | Output structure | Templates, schemas, examples | Broad domain theory |
| **Tool-use** | Tool choice and safety | Tool boundaries, preflight, failure behavior | Tool menus |
| **Extraction** | Raw context → reusable behavior | Distillation pipeline, placement rules | Copying source docs |
| **Audit** | Finding defects in an artifact | Diagnostic ladder, ranked fixes, patch shapes | Full rewrites by default |

---

## 3. Component Selection Matrix

| Component | Use when | Cut when | Cognitive job |
|---|---|---|---|
| **Core Principle** | One sentence prevents the dominant failure | It repeats the title | Survives attention drift |
| **Persona lenses** | Quality depends on competing concerns | The task is procedural | Forces multi-axis reasoning |
| **Workflow** | Step order matters | Any order works | Prevents skipping fundamentals |
| **Quick Reference** | Decisions compress into defaults | It repeats prose | Mid-task lookup |
| **Values/tradeoffs** | Good goals genuinely conflict | No meaningful conflict | Encodes what wins |
| **Anti-Patterns** | Strong bad defaults exist | No likely bad default | Rewrites priors |
| **Contrastive examples** | Pattern beats abstraction | Examples would be fake or narrow | Anchors the replacement |
| **Checklist** | Completion quality is forgettable | It becomes generic QA | Final attention pass |
| **References** | Detail matters only sometimes | Detail is core to every trigger | Saves root context |
| **Automation** | Repeated brittle machine-checkable error | It only checks obvious syntax | Removes brittle decisions |

---

## 4. Annotated SKILL.md Skeleton

```markdown
---
name: scope-action-subject                   # ≤64 chars; match the destination convention and folder
description: "State what the skill does. Use when the relevant task or context applies; add exclusions only where needed."
# No model pin; tool declarations only through fields supported by the destination runtime.
---

# Title                                       # names the activity, not the aspiration

[Identity: 2–4 sentences — the expertise capsule and the prior it rewrites.]
[Place in the system: what it owns, what it cites ($root §, $siblings), its genus.]

## Core Principle                             # the one sentence that prevents the dominant failure

## [Domain sections]                          # only components that passed §3, each law stated once,
                                              # root laws cited never cloned, contrastive pairs at the
                                              # highest-risk behaviors

## Anti-Patterns                              # bad default → why wrong → replacement; drift-surviving anchors

## [Result / close-out]                       # required elements, any readable shape — no XML ceremony

## References                                 # each with when-to-read; one level deep
```

---

## 5. Per-Genus Blocks

Insert the block matching the skill's genus (root manifest, "Map the System").

**Artifact skill** — after identity:
```markdown
**Artifact home.** [path/pattern]. The artifact is durable — chat is not memory.
[Schema / required sections — the skill file is the single schema truth; no versioning.]
```

**Lens / auditor** — define relevant lenses, earned authority and evidence calibration. An installed persona-authoring skill may help but is not a required dependency. After the identity, adapt:
```markdown
## Independent Review Inputs & Findings
Use an independent reviewer context when independence is required. Inputs: [the materials
under audit], relevant contracts and the declared scope; exclude the author's trajectory
and preferred conclusion. The reviewer is read-only and returns evidence-backed findings.
The orchestrator triages recommendations and persists a report only when requested or
required, using the actual destination artifact home and authority. A report's existence
does not establish review quality; naming a lens does not establish that it ran.
Out-of-scope hazards are flagged, not chased.
```

**Protocol / front-end** — after identity:
```markdown
**Place in the system.** [Root] owns the laws; [the artifact skills] own the artifacts. This
protocol owns [the decision] and feeds its outputs into them — it never spawns a rival artifact.
```

**Domain orchestrator** — near the top:
```markdown
Specialist skills are tools. Loading them is not progress — a phase helped only if it changed
[the outcome the family exists for]. [Two-way routing: what this coordinates; what each
specialist owns; the specialist owns its domain judgment.]
```

---

## 6. Drafting Rules

- Preserve decision-changing expertise, enabling fundamentals and useful recurring procedures; cut generic narration before mechanisms and exceptions.
- The dominant expertise → prior rewrite goes in the core principle; value hierarchies and defaults go in tables.
- Anti-patterns as `bad default → why wrong → replacement`; contrastive examples at the highest-risk behaviors.
- Cite actual root/canonical authority; make sibling references resolvable and update reciprocal boundaries only when those edits are in scope.
- References one level deep; over 100 lines needs a TOC; each linked from root with when-to-read.
- Automation is a rare exception, never furniture.
- Write in solo context: the finished skill reads as if it always existed — no justification of changes, no references to prior versions or the session that produced it.

---

## 7. Output Shapes by Mode

| Mode | Emit |
|---|---|
| Create / rewrite | Usable manifest and necessary supporting resources; briefly explain material ownership, routing or unresolved decisions. Working maps stay private unless requested; include evaluation cases when warranted. |
| Audit / review | Direct verdict · highest-leverage defects ranked · exact patch or replacement sections · remaining risks · Skill Result |
| Trigger debugging | Routing diagnosis · revised frontmatter · trigger cases (pos/neg/borderline) · collision boundary · Skill Result |
| Context extraction | Source-grounded knowledge, decisions, boundaries and unresolved questions; package a manifest or patch when requested. Use working tables only where they help the recipient. |
| Metadata only | Recommended name · description · why this routes better |
