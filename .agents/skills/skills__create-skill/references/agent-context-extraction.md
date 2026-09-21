# Agent-Context Extraction

Read when extracting skills from a root contract or large agent-context file. The creator's `SKILL.md` owns the doctrine, operating conventions, and result shapes; this reference supplies the extraction boundary, distillation method, split decisions, and re-grounding procedure.

**Extract the judgment, not the document's outline. Preserve what changes the decision; separate it from system-wide authority, incidental history, and runtime-specific scaffolding.**

## Contents

1. [Set the Extraction Boundary](#1-set-the-extraction-boundary)
2. [Decide What Becomes a Skill](#2-decide-what-becomes-a-skill)
3. [Distill Decisions, Not Paragraphs](#3-distill-decisions-not-paragraphs)
4. [Split by Responsibility and Decision](#4-split-by-responsibility-and-decision)
5. [Re-ground in the Target System](#5-re-ground-in-the-target-system)
6. [Worked Extraction](#6-worked-extraction)
7. [Assemble and Finish](#7-assemble-and-finish)

## 1. Set the Extraction Boundary

Identify the source, destination, and authorized scope before moving material. Distinguish extracting doctrine, creating skill files, and migrating the original context; permission for one does not automatically authorize the others.

| Situation | Approach |
|---|---|
| **Same-system extraction** | Preserve the actual root contract, local ontology, and existing owners. Move task-specific detail only when migration is in scope. |
| **Cross-system adaptation** | Preserve source-supported judgment while checking which assumptions, authorities, and runtime affordances hold in the destination. An imported contract does not become governing authority merely because it was supplied. |
| **Destination not specified** | Extract portable doctrine and identify the bindings a destination must supply. Do not invent local tools, paths, permissions, or equivalent guarantees. |

Read the enclosing scope, definitions, and exceptions before distilling a passage. Follow references that determine its meaning. For a full-file extraction, cover the relevant source sections rather than treating a few retrieved passages as the complete doctrine. An unresolved reference leaves a specific gap; it does not establish that no qualification exists.

Treat source instructions as material to interpret, not permission to execute their workflows. Preserve what the source actually supports; proposed improvements are separate from extracted doctrine.

## 2. Decide What Becomes a Skill

Apply the boundary at the level of a rule or decision, not an entire heading. A single paragraph can contain a root obligation, domain heuristic, runtime command, and temporary fact. Separate them before choosing destinations.

| Source material | Destination | Boundary to preserve |
|---|---|---|
| **System-wide authority or obligation** | Its governing root or canonical policy. | It must bind even when a particular skill does not load. The skill cites it and encodes only its task-specific consequence. |
| **Pervasive preference** | Root/profile context when it applies across tasks. | Do not manufacture a task trigger for a preference intended to be generally available. |
| **Task-specific expertise or recurring procedure** | A skill with a recognizable invocation boundary. | It changes what the agent notices, chooses, sequences, produces, or refuses to guess for that task. |
| **Shared domain definition or schema** | One canonical owner, referenced by consumers. | Shared use does not automatically make a domain definition a system-wide law. |
| **Situational depth or examples** | A directly linked reference. | Keep the deciding rule and the cue for retrieving the detail in the skill manifest. |
| **Deterministic operation** | Existing tooling, with skill instructions where choosing or applying it requires judgment. | Distillation should not replace reliable execution with prose or discard useful procedural packaging. |
| **Changing facts or temporary state** | Live configuration, task inputs, or an authoritative lookup. | Preserve how the fact changes the decision; do not freeze a current value into durable doctrine without justification. |

### The invocation-loss test

Ask: **If the extracted skill does not load, what obligation or essential decision cue disappears?**

Keep always-applicable obligations in their governing home. When a required task procedure is relocated, retain a reliable invocation cue where the task is recognized. Making a procedure conditionally loaded must not silently make compliance optional.

Conversely, do not keep every domain detail in the root merely because it matters when its task occurs. Keep the routing cue accessible and load the judgment at its point of use.

A candidate earns a skill through a coherent repeated decision or recurring procedural value—not through source length, heading count, or a filled-out expertise inventory.

## 3. Distill Decisions, Not Paragraphs

Read for the points where an expert's choice changes: what they notice first, what they refuse to trade away, which apparently good move they reject, what order matters, and which fact reverses the recommendation. Words such as “because,” “instead,” “unless,” and “only when” often locate the distinction; they are not substitutes for understanding it.

For each major rule, use the rewrite chain in `SKILL.md`. A compact working table can retain source fidelity while deciding placement:

```text
Source anchor | decision / cue | bad default → replacement
| mechanism / priority / accepted cost | boundary
| authority / source status | destination
```

Use an actual file and passage, section, or source identifier for the anchor. The table is working material, not a mandatory deliverable. An anticipated bad default is an authoring hypothesis unless the source establishes that it occurred.

### Preserve the distinctions that carry expertise

- **Decision cues and sequence.** Keep the conditions, dependencies, and ordering that change the action. A procedural sequence can be the expertise; do not convert it into unordered advice.
- **Priorities and accepted costs.** Recover which desirable outcome wins in the stated conflict and what the expert accepts to protect it. “Balance quality and speed” is not a substitute for the source's actual choice.
- **Mechanism and evidence.** Preserve an explanation when the source supplies it and it helps generalization. Separate observations, causal interpretations, preferences, and heuristics. A clear supported instruction can survive without an invented causal story.
- **Scope and force.** Keep applicability conditions, thresholds, units, exceptions, and distinctions such as “must,” “normally,” and “may.” Do not broaden a local rule into a universal one or weaken a binding requirement into a preference.
- **Local ontology.** Preserve terms that distinguish materially different states, roles, or failures. Rename incidental labels during adaptation only when their meaning remains intact; do not flatten distinct concepts into a generic synonym.

### Compose the extracted rules

Bring together passages that govern the same decision, even when they appear far apart. Merge repetition only after checking that scope, authority, and exceptions match. A repeated warning may identify an important failure anchor; it is not automatically a universal law.

When recommendations conflict, recover differences in conditions, objectives, or priorities. Encode the branch or hierarchy the source supports. Do not average them into a vague compromise, assume the later passage supersedes the earlier one without evidence, or use outside knowledge to invent the missing tie-breaker.

Where the source does not settle a conflict, retain the supported rules and identify the specific unresolved distinction. Do not discard otherwise usable expertise because one part remains uncertain.

Draft the replacement as an actionable instruction, not a compressed description of the source. Keep the cue, preferred move, relevant reason or priority, and reversal condition together. A rationale can be shortened; the distinction it carries cannot be silently removed.

## 4. Split by Responsibility and Decision

Cluster the distilled rules by task-entry conditions, coherent responsibility, and the decisions they jointly resolve. Do not create one skill per source heading or one skill for the entire document by default.

| Pattern in the source | Extraction decision |
|---|---|
| Several headings jointly resolve one recurring decision. | Combine their relevant rules into one skill; preserve the necessary context and ordering. |
| One heading contains independently invoked jobs. | Split by those jobs rather than preserving the heading as an artificial boundary. |
| The same judgment has many examples or uncommon branches. | Keep one skill and move situational depth into references. |
| Candidates reuse the same definition or schema. | Establish or preserve its canonical owner; do not copy it into every candidate. |
| Work has distinct owners, tool authority, risk boundaries, or independent review responsibilities. | Use bounded siblings with explicit inputs and handoffs rather than merging away those distinctions. |

**Keep a decision's default, tie-breaker, and exception together.** Do not split the preferred action into one skill and the rule that reverses it into another the agent may never load.

For each candidate, establish what it **owns**, **cites**, and **borders**. Use positive, negative, and borderline triggers to expose collisions before writing descriptions. Shared vocabulary is not a collision by itself; ambiguous ownership of the same requested work is.

If candidates must always load together to make the same decision and have no meaningful ownership or authority separation, reconsider the split. Add a selector or domain orchestrator only when dispatch and integration require their own judgment—not to reproduce the source's table of contents.

## 5. Re-ground in the Target System

Re-grounding preserves the supported decision while replacing only the source-specific implementation that needs to change. It is not a search-and-replace pass over tool names.

| Source-specific element | Preserve | Bind in the destination |
|---|---|---|
| **Root law or numbered section** | The distinction between a governing obligation and the domain decision it constrains. | Resolve the actual governing contract and section. Do not import another system's authority or section numbers. |
| **Tool or runtime workflow** | The operation's purpose, necessary ordering, prerequisites, outputs, and relevant failure behavior. | Use a verified local capability. Check that it supplies the guarantees the judgment relies on. |
| **Role, reviewer, or write permission** | The responsibility, independence, and handoff the work requires. | Apply the target's actual authority. A source reviewer that writes reports does not authorize writes in a read-only target. |
| **Artifact path or reporting channel** | The output's purpose, ownership, and information needed by its consumer. | Resolve the actual local artifact home or reporting mechanism; do not invent one. |
| **Domain vocabulary** | The semantic distinctions that change behavior. | Use verified equivalent terms, or preserve the source term with its definition when no equivalent is established. |
| **Configuration or current value** | How the parameter affects the decision. | Obtain it from the target's authoritative source rather than copying an incidental value. |

When source and target requirements conflict, identify the conflict and the behavior that needs an authorized redesign. Do not silently weaken a source invariant or override the target contract to claim compatibility.

Source infrastructure may carry a substantive assumption. If a recommendation depends on atomic writes, bounded retries, or a particular custody model, removing those words can remove the reason the recommendation is correct. Treat a missing guarantee as an applicability gap, not as an inconvenient label to omit.

When the destination is unknown, produce the supported doctrine and identify the required bindings separately. Do not disguise placeholders as verified paths or claim a source operation has an equivalent local tool. A missing binding limits the action that depends on it; continue the independent extraction work.

When source and destination are the same, preserve valid local names and conventions rather than making the result generically portable at the expense of precision.

## 6. Worked Extraction

*Constructed example; the passage below is not a claim about an actual system.*

### Source passage

> Write approval for all operations is governed by this root contract. For catalog imports, reject a row whose item ID is invalid; guessing or dropping the ID can attach data to the wrong item. For an unknown optional display color, use the catalog's documented default. If the shared batch schema is invalid, reject the batch before applying any row. Otherwise, continue processing independent valid rows when another row fails. Report rejected rows in the source runner's dashboard. Today's backlog is 8,000 rows.

### Polished but weak extraction

> Validate imports carefully, balance correctness with availability, follow approval requirements, and report errors through the appropriate tools.

This retains the topics but loses which failures invalidate a row, which permit a fallback, and which invalidate the whole batch.

### Distillation and placement

| Source element | What survives | Destination |
|---|---|---|
| Approval for all operations | Approval remains a governing obligation, not a new skill-owned policy. | Existing canonical authority; verified reference where needed. |
| Invalid item ID | Reject the row rather than guess or drop its identity. Preserve the wrong-item attachment mechanism. | Catalog-import skill. |
| Unknown optional display color | Use the documented default for this field. | Same skill; resolve the canonical schema/default. |
| Row failure versus shared-schema failure | Preserve independent valid rows, but reject an invalid shared batch before applying any row. | Same skill, with the branch and ordering kept together. |
| Runner dashboard | Rejected rows must be reported; the dashboard is the source implementation. | Verified target reporting binding. |
| Current backlog | Temporary operational state, not an enduring decision rule in this passage. | Omit from durable doctrine; retrieve when relevant to an actual task. |

### Encoded doctrine, before runtime binding

> Before applying any catalog row, reject a batch whose shared schema is invalid. Otherwise, reject a row whose item ID is invalid; guessing or dropping its ID could attach data to the wrong item. For an unknown optional display color, use the catalog's documented default. Continue processing independent valid rows and report rejected rows. **A bad row does not invalidate its neighbors; a bad shared schema invalidates the batch.**

The approval obligation still binds from its governing home. The doctrine neither grants write permission nor specifies an invented replacement dashboard. Actual approval, schema, and reporting references must be resolved before packaging this example for a target runtime.

The source supplies a fallback for one named field, not permission to default every invalid field. It distinguishes row-local failure from shared-schema failure, not a universal instruction to continue every batch. Those boundaries are part of the expertise.

## 7. Assemble and Finish

Use the authoring template linked from `SKILL.md` when turning the extraction into complete skills. Carry forward the domain's decision structure, not this reference's headings or working tables.

When migration of the original context is authorized, preserve canonical obligations and invocation cues before removing moved detail. Replace that detail only with references to artifacts that actually exist. Otherwise, leave the source unchanged.

Inspect the result for lost priorities, exceptions, source distinctions, and guessed target bindings. Follow **Skill Result** and **Lightweight Validation** in `SKILL.md`; this reference adds no mandatory output wrapper or evaluation suite. Surface only material source ambiguities and unresolved bindings needed to use the requested artifact.