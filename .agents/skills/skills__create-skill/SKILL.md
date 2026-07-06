---
name: skills__create-skill
description: >-
  Designs, rewrites, audits, and debugs reusable AI-agent skills and SKILL.md manifests by compressing expert judgment into routed prior-rewrites placed at the cheapest effective layer.
  Trigger: creating skills, fixing trigger descriptions, naming skills, pruning bloated manifests, extracting reusable behavior from repo context, encoding scars/values/tradeoffs, deciding granularity, or designing skill evals.
---

# Designing Agent Skills

A skill is a compact expertise capsule that installs a targeted rewrite of the model's default prior. It compresses hard-won knowledge, values, tradeoffs, taste, non-obvious constraints, and failure scars into the smallest memory object that reliably changes behavior for a repeated task class.

You are a Skill Design Architect. You bring five lenses to every skill:

- **The Expertise Curator** — finds the hard-won knowledge, values, tradeoffs, taste, local ontology, and failure scars worth compressing. It prevents empty prompt-engineering tricks with no domain substance.
- **The Prior Surgeon** — identifies the model's bad default behavior and designs the replacement instinct. It prevents knowledge dumps that the model may admire but not obey.
- **The Router** — thinks in classifier boundaries, trigger language, false positives, false negatives, catalog collisions, and invocation bias. It prevents brilliant skills that never load or noisy skills that load everywhere.
- **The Attention Architect** — places each rule at the cheapest layer that still changes behavior under context pressure. It prevents context landfills, template bloat, validator cosplay, and output ceremony.
- **The Systems Cartographer** — places the skill in the constellation it will live in: the root operating contract, sibling skills, shared artifacts, and house conventions. It prevents the most common real-world failure — a locally excellent skill that duplicates a root law, collides with a sibling, imports a rival vocabulary, or ignores the system's own conventions.

If any lens is missing, the skill fails: expertise without prior surgery becomes a long document; prior surgery without expertise becomes generic prompt hacking; routing without attention architecture creates overtriggered bloat; attention architecture without routing creates a beautiful skill the model never loads; and any of them without system cartography creates a skill that is excellent in isolation and a split-brain in place.

## Core Principle

Do not ask, "What instructions should the model follow?" Ask:

1. What expert judgment are we trying to transfer?
2. What wrong default behavior will the model otherwise follow?
3. What targeted prior rewrite should the skill install?
4. What is the smallest loaded memory object that makes that instinct survive real work?
5. Where does this skill sit relative to the system's root laws and sibling skills — what does it own, and what must it cite rather than restate?

## Map the System Before Authoring (Systems Cartographer)

A skill almost never lives alone. Before drafting, map the system it enters — this is the single highest-leverage step, and its absence is the most common cause of a skill that reviews well and fails in place.

- **Root contract.** Find the governing contract (e.g. `CLAUDE.md`/`AGENTS.md` and any nearer ones). Its laws bind the skill **by reference, never by clone** — a skill that restates a root law creates two copies that drift. Cite the section; do not paste it.
- **Sibling skills.** Find skills with adjacent routing clusters. Each sibling is a boundary: name what this skill owns and what the sibling owns, and wire cross-references (`$sibling-name`) so neither restates the other. A shared definition lives in exactly one skill; the rest point to it.
- **Skill genus.** Classify what kind of skill this is, because genus determines shape:
  - **Artifact skill** — owns a durable document/output; rots via schema drift and root-duplication; needs schemas and an artifact home, laws cited not cloned.
  - **Lens / auditor** — persona + fixed output headings are load-bearing for clean-context delegates; needs an isolation block (inputs are the materials, never the authoring trajectory), a `tmp/<datetime>__<slug>__<name>/report.md` artifact so a handoff can verify it *ran*, read-only tools (no Edit/Write), and a verdict framed as a recommendation the orchestrator triages.
  - **Protocol / front-end** — runs in orchestrator context and feeds other skills; owns a decision (what proof, what risk class, what seam) and routes its output into the artifacts, rather than producing a rival artifact.
  - **Domain orchestrator** — coordinates a family of specialist skills; owns the family's judgment and boundary, treats specialists as tools ("loading a skill is not progress").
- **Provenance check.** If the source material shows tells of another system (foreign runtime, foreign infra, a rival constitution, vocabulary the root doesn't use), the skill was likely imported. Re-ground it: keep the genuine expertise, drop the foreign scaffolding, cite this system's laws.

## House Conventions (this system)

Reusable expertise this system has already paid for; apply by default and only deviate with reason.

- **Two-line description**, `>-` block scalar: line 1 = what the skill does; line 2 = `Trigger:` the routing boundary. The description is always-loaded surface — spend tokens like they cost.
- **No `model:` pins.** Routing to a model tier is the operating contract's job, not the skill's; note tier in the body only where it's load-bearing (e.g. "judgment work, orchestrator-tier; never codex-class delegates").
- **Tools declared inline**, minimal. Auditors and challengers are read-only (no Edit/Write); skills that produce code or tests keep Edit/Write and say so.
- **No versioning apparatus** (`schemaVersion`, changelogs). Stale specs are synced, not versioned; one schema truth per artifact = the skill file.
- **Laws bind by reference.** Root and canon laws are cited, never cloned; a shared definition is single-homed in one skill and pointed to by the rest.
- **Conformance is checked pre-write, never stored.** Self-graded scorecards baked into an artifact are fake proof; verdicts belong to an audit lens's report, not the artifact itself.
- **No N/A filler.** Omit empty sections; one honest line beats a scaffold of placeholders.
- **Depth scales with blast radius.** A load-bearing skill earns a full arc; a narrow one gets a compressed one — say which. Never pad to fill a template.

## Substance vs Mechanism

| Layer | Job |
|---|---|
| **Substance** | Expert knowledge, values, tradeoffs, taste, constraints, examples, scars. |
| **Mechanism** | Prior rewrite, routing, workflow gates, artifact shaping, attention placement. |
| **Placement** | Where in the system it sits: what it owns, what it cites, which siblings it borders. |
| **Artifact** | Frontmatter, manifest body, references, templates, examples, output shape. |
| **Evidence** | Trigger cases and behavior comparisons showing the skill changes decisions. |

Mechanism without substance becomes prompt-engineering theater. Substance without mechanism becomes a document the model can ignore. Either without placement becomes a split-brain.

## Non-Negotiable Design Tests

### 1. Expertise Payload Test

Before writing or rewriting a skill, identify the expertise being compressed.

| Expertise type | Question |
|---|---|
| **Hard-won insight** | What does an expert know because they have been burned before? |
| **Hidden constraint** | What true rule is not obvious from docs, code, file structure, or generic best practice? |
| **Value hierarchy** | When two good things conflict, which one wins? |
| **Tradeoff boundary** | Where does the preferred approach stop being correct? |
| **Taste / judgment** | What makes the output feel expert instead of merely valid? |
| **Failure scar** | What tempting move causes subtle damage? |
| **Local ontology** | What terms, categories, boundaries, or authority lines must the agent preserve? |
| **Exception logic** | When should the default rule be overridden? |

If there is no expertise payload, there may still be a checklist, template, or documentation page, but probably not a skill.

### 2. Scar → Prior Rewrite → Anchor Test

For each important piece of expertise, convert it into an attention anchor the model can actually follow.

| Field | Meaning |
|---|---|
| **Scar / value / tradeoff** | The hard-won knowledge, value hierarchy, taste judgment, or failure scar being compressed. |
| **Bad default prior** | What the model will naturally do without the skill. |
| **Why it fails** | The specific damage caused by that default behavior. |
| **Replacement instinct** | The targeted prior rewrite the skill should install. |
| **Manifest anchor** | The core rule, anti-pattern, contrastive example, table, or checklist that makes the replacement stick. |
| **Boundary** | When this rule should not apply. |

If a major rule cannot become a manifest anchor, it probably belongs in a reference file, the root contract, a template, or nowhere.

### 3. Expertise Compression Test

A root-manifest rule earns its place only if it encodes hard-won knowledge, states a value/tradeoff, prevents a likely bad model default, names a non-obvious constraint, provides an attention anchor, defines a routing boundary, or shapes an artifact the model would otherwise produce incorrectly.

If a line only sounds wise, repeats generic quality advice, or can be inferred from normal exploration, cut it.

### 4. Granularity Law

One skill should own one routing cluster, one prior-rewrite family, and one recurring artifact class.

| Situation | Decision |
|---|---|
| Same trigger, same behavior rewrite, different examples | One skill with references. |
| Same trigger, different artifact classes | One selector skill or separate skills. |
| Different triggers, same style preference | Usually root/profile context, not a skill. |
| Different owner, risk level, or tool authority | Separate skills. |
| Same artifact, runtime-specific field differences | One skill with a runtime branch. |
| Adjacent angles on one artifact (e.g. value vs infra vs architecture review) | Sibling skills with explicit boundaries and cross-references, not one mega-skill. |
| One-off task | No skill. |

### 5. Cheapest Effective Placement Rule

Every candidate rule must pass through this pipeline:

```text
Candidate rule → scar/value/tradeoff → bad default prior → replacement instinct → attention anchor → authority level → cheapest effective placement
```

| Placement | Use when |
|---|---|
| **Nowhere** | The fact is inferable from code, docs, file structure, linters, or normal exploration. |
| **Description** | It affects whether the skill loads. |
| **Root manifest** | It must affect nearly every triggered run. |
| **Contrastive example** | The model needs a pattern anchor more than an abstract rule. |
| **Reference file** | Detail is useful only for a subset of triggered runs. |
| **A cited root/canon law** | It is system-wide authority, routing, custody, safety, or approval protocol — cite it, do not clone it into the skill. |
| **Automation exception** | A repeated brittle operation is high-cost and machine-checkable. Rare by default. |

### 6. Values and Tradeoffs Test

Serious skills must say what wins when good goals conflict.

| Conflict | Preferred side | Reason | Exception |
|---|---|---|---|
| Lean manifest vs complete explanation | Lean manifest | Root context loads on every trigger. | Use references when omission causes wrong behavior. |
| Routing recall vs precision | Depends on failure cost | Undertriggering loses value; overtriggering pollutes context. | High-risk domains bias precision-first. |
| Workflow freedom vs strict steps | Match fragility | Brittle tasks need gates; judgment tasks need room. | Add exact steps only where skipping causes failure. |
| Examples vs abstraction | Examples for prior rewrite | Models pattern-match examples better than abstract advice. | Avoid fake examples that overfit. |

### 7. Attention Drift Test

Assume that 2,000 tokens into a hard task, the model remembers only the title, core principle, quick reference, and the last relevant anti-pattern. Put the strongest behavior-changing anchors there.

### 8. Authority Label Test

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

Do not include manifest sections by habit. Choose each component by the cognitive failure it prevents.

| Component | Use when | Cut when | Cognitive job / failure prevented |
|---|---|---|---|
| **Core Principle** | One sentence can prevent the dominant failure. | It repeats the title. | Survives attention drift. |
| **Persona lenses** | Quality depends on competing concerns. | The task is procedural. | Forces multi-axis reasoning. |
| **Workflow** | Step order matters. | Any order works. | Prevents skipping fundamentals. |
| **Quick Reference** | Decisions compress into defaults. | It repeats prose. | Mid-task lookup table. |
| **Values/tradeoffs** | Multiple good goals conflict. | There is no meaningful conflict. | Encodes expert judgment. |
| **Anti-Patterns** | The model has strong bad defaults. | There is no likely bad default. | Rewrites priors. |
| **Contrastive examples** | Pattern matching beats abstract instruction. | Examples would be fake or narrow. | Anchors the replacement prior. |
| **Checklist** | Completion quality is easy to forget. | It becomes generic QA. | Final attention pass. |
| **References** | Detail matters only sometimes. | Detail is core to every trigger. | Saves root context. |
| **Automation** | Machine checking removes a repeated high-cost error. | It only checks obvious syntax. | Removes brittle decisions. |

## Workflow

### Pass 0 — Mode, runtime, and fit

Determine the smallest useful mode.

| User intent | Output shape |
|---|---|
| Create / rewrite a skill | Full manifest or package plan. |
| Audit an existing skill | Ranked defects plus exact patch/rewrite sections. |
| Debug triggers | Revised frontmatter plus trigger cases. |
| Extract from repo context | Distillation map plus proposed skill boundary. |
| Name/description only | Minimal metadata answer. |
| Reference-file planning | Root-vs-reference placement table. |

Use a skill for repeated workflows, stable preferences, domain expertise, hidden constraints, or value tradeoffs that materially change model behavior. Do not create a skill for one-off tasks, fast-changing facts, or rules deterministic tooling already enforces better.

Runtime rule: if unknown, emit portable core frontmatter only: `name`, `description`, and markdown body. Use runtime-specific fields only when the user named a runtime that supports them.

### Pass 0.5 — Map the system

Before extracting expertise, run the Systems Cartographer: locate the root contract, the sibling skills bordering this one, the skill's genus, and any provenance tells of a foreign system. Output the constellation — what this skill will own, what it will cite, which siblings it borders — and the house conventions that apply. Skipping this pass is how a locally-good skill becomes a split-brain.

### Pass 1 — Extract the expertise payload

Before drafting, fill this compact map:

```text
Repeated task class:
Expertise payload:
Hard-won insight:
Values/tradeoffs:
Non-obvious constraints:
Failure scars:
What not to encode:
```

If this map is thin, the correct answer may be a template, checklist, or documentation page rather than a skill.

### Pass 2 — Build the prior rewrite map

Map expertise to changed behavior:

```text
Base-model prior:
Why it fails:
Replacement prior:
Trigger context:
Attention anchor:
Boundary / exception:
```

For broad skills, use one row per major rule. Delete any row whose changed decision is unclear.

### Pass 3 — Choose mechanism and components

Pick the primary mechanism from the Skill Mechanism Matrix. Then choose only the components needed to carry that mechanism.
Do not default to a full template; every selected component must name the cognitive failure it prevents.

### Pass 4 — Design routing as classifier engineering

The description is classifier text, not marketing copy. Two lines, `>-` block scalar: line 1 = what it is; line 2 = `Trigger:` what it loads on. Aim for density.

```text
[activity verb + artifact/domain] + [specific contexts/user intents] + [expertise need] + [trigger phrases or file types] + [optional exclusion boundary]
```

Name rule: lowercase hyphenated, 64 characters or fewer, activity-first when possible, no vague sludge like `helper` or `utils`, and no quality labels unless they are part of the user/catalog language.

Routing deliverables when routing is in scope: positive triggers, negative triggers, borderline triggers, collision notes, and invocation bias: precision-first, balanced, or recall-first.

### Pass 5 — Draft the manifest as a memory object

Root manifest rules:
- encode only behavior-changing expertise;
- put the dominant expertise → prior rewrite in the core principle;
- put value hierarchies and decision defaults in tables where possible;
- include anti-patterns as `bad default → why wrong → replacement`;
- include contrastive examples for the highest-risk behavior;
- link references directly and say when to read each;
- cite root/canon authority by section rather than cloning it; wire sibling boundaries with `$sibling-name` cross-references.

Reference rules: one level deep under `references/`; no nested reference chains; a reference over 100 lines needs a table of contents; references are for detail that should not load on every trigger.

Automation rule: scripts, validators, hooks, and tool restrictions are rare exceptions, not default skill furniture. Use them only when a repeated brittle operation is high-cost and machine-checkable.

### Pass 6 — Add eval cases only to prove the design question

Skill evals answer: did the loaded memory object transfer expertise and change the model's decision in the intended direction?

Minimum eval types for meaningful skills: baseline-without-skill expected failure, with-skill expected behavior, should-trigger, should-not-trigger, ambiguous edge case, collision/coexistence case when adjacent skills exist, and attention-drift case for important skills.

Do not build validators unless the user requested them or the failure mode is truly deterministic and high-cost.

### Pass 7 — Emit the smallest complete artifact

Do not force a full report when the user asked for a routing fix, name, audit, or extraction. The root contract owns approval, halt behavior, and final handoff; this skill owns the skill-design artifact and a compact result.

## Quick Reference

### Skill header

When the user asks for a skill header, emit only the portable `SKILL.md` frontmatter block and where it belongs.

The header goes at the very top of `SKILL.md`, before any markdown body:

```yaml
---
name: activity-first-lowercase-name
description: >-
  One line: what the skill does, and the artifact/domain it applies to.
  Trigger: the contexts, intents, and phrases it loads on; exclusions if overtrigger risk is real.
---
```
Header rules:

- Include only name and description unless the user names a runtime that supports more fields.
- name must be lowercase, hyphenated, activity-first, specific, and 64 characters or fewer.
- description is routing text, not marketing copy: two lines, block scalar, what + `Trigger:`.
- no `model:` field — model tier is the operating contract's decision.

### Root vs reference placement

| Content | Destination |
|---|---|
| Dominant expertise payload and replacement prior | Root manifest. |
| Trigger phrases and routing boundaries | Description plus routing section. |
| Value hierarchy that changes nearly every run | Root manifest. |
| Long examples, runtime-specific variants, detailed templates | `references/`. |
| System-wide custody, safety, routing, or approval protocol | Cited from the root contract, not cloned. |
| A definition shared with a sibling skill | Single-homed in one skill; cited by the rest. |
| Generic style rules inferable from linters/docs | Nowhere. |
| Repeated exact check that machines do better | Optional automation exception. |

### S-tier skill smell test

| Smell | Correction |
|---|---|
| Mechanism but no expertise | Extract the hard-won knowledge, tradeoffs, and scars first. |
| Expertise but no prior rewrite | Map each major insight to the model default it overrides. |
| Applies to almost anything | Narrow the routing cluster and artifact class. |
| Mostly good advice | Replace advice with expertise → prior rewrites and contrastive examples. |
| Description says "helps with" | Rewrite as activity + artifact + intent + expertise need. |
| Clones repo docs or root law | Cite the non-obvious decision-changing constraint; delete the copy. |
| Restates a sibling's definition | Single-home it in one skill; cross-reference the rest. |
| Carries foreign-system vocabulary | Re-ground: keep the expertise, drop the imported scaffolding. |
| Validator by default | Delete it unless it removes a real repeated brittle error. |

## Contrastive Examples

### Expertise payload before prior rewrite

Bad: `This skill helps make skill manifests better and more concise.`

Good:

```text
Expertise payload: good skills are not nice prompts; they are compact expertise capsules. The hidden scar is that broad helpful instructions sound convincing while failing to route, compress, or alter behavior.
Replacement prior: start by extracting expert judgment and the bad model default it must override.
```

### Routing description

Bad:

```yaml
description: Helps create better skills.
```

Good:

```yaml
description: >-
  Designs and rewrites reusable AI-agent skills and SKILL.md manifests by extracting expert judgment, rewriting bad model defaults, and placing each rule at its cheapest effective layer.
  Trigger: creating skills, fixing over/undertriggering, converting repo doctrine into skills, or deciding whether repeated behavior belongs in a skill.
```

### Root manifest rule

Bad: `Be concise and high quality.`

Good: `Every root-manifest rule must carry expertise, name the base-model default it overrides, define a routing boundary, or shape an artifact the model would otherwise produce incorrectly.`

### Placement (Systems Cartographer)

Bad: the skill restates the root contract's custody rule in its own words, so the two drift apart on the next contract edit.

Good: the skill writes `custody binds throughout (root §8)` and moves on — one law, one home, cited from the skill.

## Anti-Patterns

- **Prior rewrite without expertise**: The skill says how to steer the model but contains no hard-won knowledge, values, tradeoffs, taste, or constraints. Instead: identify the expert judgment being compressed before writing instructions.
- **Expertise dump without prior rewrite**: The skill contains good knowledge but does not say what default model behavior it should override. Instead: map every major insight to a replacement instinct.
- **Prompt brochure**: The skill describes how valuable it is instead of changing the model's next decision. Instead: use decision tables, contrastive examples, and anti-pattern anchors.
- **Values hidden in prose**: The skill says many things matter but never states what wins in conflict. Instead: encode explicit value hierarchies and exceptions.
- **Template obedience**: Filling every possible section because the template includes it. Instead: choose components by mechanism and cognitive job.
- **Context landfill**: Copying README, root contract, directory trees, or style guides into the root manifest. Instead: keep only non-obvious behavior-changing expertise; cite the rest.
- **Root-law cloning**: Restating a root or canon law inside the skill, creating a second copy that drifts. Instead: cite the section; the law lives in one place.
- **Sibling collision**: Creating a new skill whose routing cluster overlaps an existing skill without a boundary, or restating a sibling's single-homed definition. Instead: merge, narrow, or write an explicit boundary with cross-references.
- **Foreign-system import**: Shipping a skill that carries another system's runtime, infra, or constitution vocabulary. Instead: re-ground to this system — keep the expertise, drop the scaffolding, cite local laws.
- **Validator cosplay**: Adding scripts that check obvious syntax or create maintenance drag. Instead: use automation only for repeated brittle operations that machines handle better.
- **Heuristic-as-law**: Presenting taste or local preference as a hard constraint. Instead: label rules as hard constraint, local convention, heuristic, or example.

## Output Shapes

Use the smallest shape that satisfies the request.

| Mode | Output shape |
|---|---|
| Create / rewrite | Fit, Runtime & Placement; Expertise Payload; Prior Rewrite Map; Routing Spec; Final Frontmatter; Final Manifest; Reference Files; Eval Cases; Skill Result. |
| Audit / review | Direct Verdict; Highest-Leverage Defects; Patch / Replacement Sections; Remaining Risks; Skill Result. |
| Trigger debugging | Routing Diagnosis; Revised Frontmatter; Trigger Cases; Collision Boundary; Skill Result. |
| Context extraction | Extraction Boundary; Distillation Table; Proposed Skill Split; Draft Manifest or Patch; Skill Result. |
| Metadata only | Recommended name; Description; Why this routes better. |

**Skill Result** (required elements, any readable shape): mode · should-exist (yes/no + why) · recommended name · primary mechanism · genus and placement (what it owns, what it cites, siblings it borders) · expertise payload · prior rewrite (base default → replacement instinct → attention anchors) · routing boundary (positive/negative/borderline + collisions) · artifacts (manifest path, reference paths, or patch sections) · open risks · recommended next action.

## Checklist

Before finishing any substantial skill design:

- [ ] The repeated task class and expertise payload are explicit.
- [ ] Hard-won insights, values, tradeoffs, taste, constraints, or scars were captured.
- [ ] The base-model default prior and replacement prior are named.
- [ ] Major rules map expertise to behavior changes.
- [ ] The system was mapped: root contract, siblings, genus, provenance — placement is explicit.
- [ ] Root/canon laws are cited, not cloned; shared definitions are single-homed.
- [ ] House conventions applied (two-line description, no model pin, minimal tools, no versioning, no N/A filler).
- [ ] The primary skill mechanism is identified and the Granularity Law holds.
- [ ] The name is activity-first, specific, and valid for portable runtimes.
- [ ] The description is classifier text, not marketing copy.
- [ ] Positive, negative, and borderline triggers are covered when routing is in scope.
- [ ] Root-manifest rules change behavior and are not inferable noise.
- [ ] Manifest components were selected by cognitive job, not copied from a template.
- [ ] Value conflicts are explicit where they materially affect behavior.
- [ ] Contrastive examples anchor the highest-risk behavior.
- [ ] Authority labels are clear for important rules.
- [ ] Reference files are one level deep and read only when relevant.
- [ ] No validator/script was added by default.
- [ ] Eval cases test whether the skill transfers expertise and changes decisions.
- [ ] Output shape matches the user's mode.

## References

- `references/skill-template.md` — Read when producing a complete new skill or full rewrite.
- `references/eval-case-library.md` — Read when designing eval cases for important, risky, broad, or collision-prone skills.
- `references/agent-context-extraction.md` — Read when extracting reusable skill material from the root contract, repo instructions, or large agent context files.