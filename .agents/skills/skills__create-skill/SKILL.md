---
name: skills__create-skill
description: Designs, rewrites, audits, and debugs reusable agent skills through precise routing and decision-changing expertise. Use when creating skills, fixing triggers, choosing granularity, pruning manifests, or extracting durable doctrine.
---

# Designing Agent Skills

A skill is a compact expertise capsule that installs a targeted rewrite of the model's default prior. It compresses hard-won knowledge, values, tradeoffs, taste, non-obvious constraints, and failure scars into the smallest memory object that reliably changes behavior for a repeated task class. Do not ask "what instructions should the model follow?" Ask: what expert judgment transfers, what bad default it overrides, what replacement instinct to install, what the smallest memory object is that makes it survive real work — and where the skill sits among root laws and siblings: what it owns, what it cites.

## Five Lenses

- **Expertise Curator** — finds the knowledge, values, taste, and scars worth compressing; prevents prompt tricks with no domain substance.
- **Prior Surgeon** — names the bad default and designs the replacement instinct; prevents knowledge dumps the model admires but does not obey.
- **Router** — thinks in classifier boundaries, false positives/negatives, collisions; prevents brilliant skills that never load and noisy skills that load everywhere.
- **Attention Architect** — places each rule at the cheapest layer that still changes behavior under context pressure; prevents landfills, template bloat, and output ceremony.
- **Systems Cartographer** — places the skill in its constellation: root contract, siblings, genus, conventions; prevents the skill that is excellent in isolation and a split-brain in place.

A skill missing any lens fails in that lens's characteristic way: a long document, generic prompt hacking, a skill that never loads, overtriggered bloat, or a locally-perfect split-brain.

## The Core Operation

Identify the expertise being compressed — if there is none, the right artifact is a checklist or doc, not a skill:

| Expertise type | Question |
|---|---|
| Hard-won insight | What does an expert know from being burned? |
| Hidden constraint | What true rule is not obvious from docs, code, or generic best practice? |
| Value hierarchy | When two good things conflict, which wins? |
| Tradeoff boundary | Where does the preferred approach stop being correct? |
| Taste / judgment | What makes output feel expert instead of merely valid? |
| Failure scar | What tempting move causes subtle damage? |
| Local ontology | What terms, categories, and authority lines must be preserved? |
| Exception logic | When is the default rule overridden? |

Then convert each major piece into a chain the model can follow — one row per rule; delete any row whose changed decision is unclear:

```text
Scar/value → bad default prior → why it fails → replacement instinct → manifest anchor → boundary (when not to apply)
```

A root-manifest rule earns its place only if it carries expertise, states a tradeoff, overrides a likely bad default, names a non-obvious constraint, anchors attention, defines routing, or shapes an artifact. If a line only sounds wise or is inferable from normal exploration, cut it.

## Placement — every rule takes the cheapest effective seat

Assume that 2,000 tokens into a hard task, the model remembers only the title, core principle, quick reference, and the last relevant anti-pattern — placement is what makes rules survive.

| Placement | Use when |
|---|---|
| **Nowhere** | Inferable from code, docs, linters, or normal exploration. |
| **Description** | It affects whether the skill loads. |
| **Root manifest** | It must affect nearly every triggered run. |
| **Contrastive example** | A pattern anchor beats the abstract rule. |
| **`references/`** | Detail matters only for a subset of triggered runs; one level deep, TOC when over 100 lines, each linked with when-to-read. |
| **Cited root/canon law** | System-wide authority, custody, safety, or approval — cite the section, never clone it; a restated law is a second copy that drifts. |
| **Automation** | A repeated brittle operation is high-cost and machine-checkable. Rare by default. |

Shared definitions are single-homed: one skill owns the definition, siblings point at it with `$sibling-name`.

## Map the System Before Authoring

Run this before extracting expertise — skipping it is how a locally-good skill becomes a split-brain.

- **Root contract:** locate the governing `CLAUDE.md`/`AGENTS.md` and any nearer ones; its laws bind by reference (Placement table).
- **Siblings:** find adjacent routing clusters; name what this skill owns vs. what each sibling owns; wire `$` cross-references both ways.
- **Genus** — the kind of skill determines its shape:
  - **Artifact skill** — owns a durable document; needs a schema and an artifact home; rots via schema drift and law-cloning.
  - **Lens / auditor** — persona and fixed output headings are load-bearing for independent-review delegates using the same existing repo folder (root §7); needs a reviewer-input block (inputs are the materials, never the authoring trajectory), a `tmp/<datetime>__<slug>__<name>/report.md` artifact proving it ran, read-only tools, and a verdict framed as a recommendation the orchestrator triages. The persona itself is built per `$prompt__writing-persona`.
  - **Protocol / front-end** — orchestrator-context; owns a decision (what proof, what risk class, what seam) and feeds other skills' artifacts rather than producing a rival one.
  - **Domain orchestrator** — coordinates a specialist family; owns the family boundary; treats specialists as tools — loading a skill is not progress.
- **Provenance:** foreign runtime, foreign infra, or rival-constitution vocabulary means the material was imported — keep the expertise, drop the scaffolding, cite local law.

## House Conventions

- One-line plain `description` value with no block-scalar marker and no colon in the value. State what it does, then `Use when ...` for the routing boundary. This surface is always loaded, so spend tokens like they cost.
- No `model:` pins — model tier is the operating contract's decision; note tier in the body only where load-bearing.
- Tools inline and minimal; auditors and challengers are read-only (no Edit/Write); skills that write code or tests keep Edit/Write and say so.
- No versioning apparatus — stale skills are synced, not versioned; the skill file is the one schema truth.
- Conformance checks run pre-write and are never stored in the artifact — self-graded scorecards are fake proof.
- No N/A filler — omit empty sections; one honest line beats a scaffold of placeholders.
- Depth scales with blast radius — a load-bearing skill earns a full arc, a narrow one a compressed one; say which.

## Routing — the description is a classifier, not marketing

```text
[activity verb + artifact/domain] + [contexts/intents] + [trigger phrases or file types] + [exclusion boundary if overtrigger risk is real]
```

Name: lowercase hyphenated, ≤64 chars, activity-first, no `helper`/`utils` sludge, no quality labels. When routing is in scope, deliver positive, negative, and borderline triggers, collision notes, and an invocation bias — precision-first when overtriggering pollutes, recall-first when undertriggering loses high-value behavior, balanced otherwise.

## Granularity Law

One skill owns one routing cluster, one prior-rewrite family, one recurring artifact class.

| Situation | Decision |
|---|---|
| Same trigger, same rewrite, different examples | One skill with references. |
| Same trigger, different artifact classes | Selector skill or separate skills. |
| Different triggers, same style preference | Root/profile context, not a skill. |
| Different owner, risk level, or tool authority | Separate skills. |
| Adjacent angles on one artifact | Sibling skills with explicit boundaries, not a mega-skill. |
| One-off task | No skill. |

## Authority Labels

Do not let heuristics masquerade as laws: **hard constraint** (safety, integrity, destructive-op bans — never violated) · **local convention** (changeable with approval) · **heuristic** (override when local facts disagree) · **example** (pattern anchor, not a rule).

## Workflow

Map the system → extract the payload → build the rewrite chain → place each rule → design routing → draft the manifest → emit the smallest artifact for the mode (full manifest, ranked audit, revised frontmatter, distillation map, or metadata answer). The full arc with fill-in maps, the mechanism and component matrices, and the annotated skeleton live in `references/skill-template.md`.

## Anti-Patterns

- **Prompt brochure** — describes how valuable it is instead of changing the next decision. → Decision tables, contrastive examples, anti-pattern anchors.
- **Template obedience** — filling every section because the template has it. → Choose components by the cognitive failure each prevents.
- **Context landfill** — copying README, root contract, or style guides into the manifest. → Keep only decision-changing expertise; cite the rest.
- **Root-law cloning** — restating a root law creates a second copy that drifts. → Cite the section; one law, one home.
- **Blast-radius escalation** — a skill invents an error posture or turns a local fault into collection, service, startup, or process unavailability. → Cite root §9; encode only the domain-specific affected subject, named unsafe effect, and independent behavior that continues.
- **Sibling collision** — overlapping a sibling's routing cluster or restating its single-homed definition. → Merge, narrow, or write the boundary with cross-references.
- **Foreign-system import** — shipping another system's runtime, infra, or constitution vocabulary. → Keep the expertise, drop the scaffolding, re-ground to local law.
- **Validator cosplay** — scripts that check obvious syntax and create maintenance drag. → Automation only for repeated brittle machine-checkable errors.
- **Heuristic-as-law** — taste presented as a hard constraint. → Apply the authority labels.
- **Values hidden in prose** — many things matter, nothing wins. → State the hierarchy and its exceptions.

## Contrastive Examples

Routing — bad: `Helps create better skills.` Good:

```yaml
description: Designs and rewrites reusable agent skills by extracting expert judgment and placing each rule at its cheapest effective layer. Use when creating skills, fixing triggers, converting repo doctrine into skills, or choosing skill granularity.
```

Root rule — bad: `Be concise and high quality.` Good: `Every root-manifest rule must carry expertise, name the default it overrides, define a routing boundary, or shape an artifact the model would otherwise produce incorrectly.`

Placement — bad: the skill restates the root custody rule in its own words, and the two drift apart on the next contract edit. Good: the skill writes `custody binds throughout (root §8)` and moves on.

## Skill Result

Required elements, any readable shape: mode · should-exist (yes/no + why) · recommended name · genus and placement (owns / cites / borders) · expertise payload · prior rewrite (bad default → replacement → anchors) · routing boundary (positive/negative/borderline + collisions) · artifacts (paths or patch sections) · open risks · next action.

## Final Check

- [ ] System mapped: root, siblings, genus, provenance — placement explicit.
- [ ] Every major rule has a rewrite chain row; laws cited, shared definitions single-homed.
- [ ] Strongest anchors placed where attention drift can reach them.
- [ ] Description is one-line classifier text with no colon in its value; name is activity-first.
- [ ] References linked with when-to-read; nothing in root that belongs below.

## References

- `references/skill-template.md` — read when producing a complete new skill or full rewrite: the eight-pass arc, mechanism and component matrices, annotated skeleton with per-genus blocks.
- `references/agent-context-extraction.md` — read when extracting skills from a root contract or large agent-context file: boundary test, distillation table, split method, re-grounding.
