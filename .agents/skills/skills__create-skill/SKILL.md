---
name: create-skill
description: Designs, rewrites, audits, and debugs reusable agent skills by encoding expert judgment into decision steering. Use when creating skills, extracting durable doctrine, fixing triggers, choosing granularity, or pruning manifests.
---

# Designing Agent Skills

A skill is a compact expertise capsule that installs a targeted rewrite of the model's default prior. It compresses hard-won knowledge, values, tradeoffs, taste, non-obvious constraints, and failure scars into a memory object that changes behavior for a repeated task class.

The primary job is **transferring expert judgment**: what the agent notices, what it prioritizes, which tempting move it avoids, what it does instead, and when that choice reverses. Do not merely summarize what an expert knows; encode how that knowledge changes a decision.

**Preserve the judgment → make the steering unmistakable → place it where it matters → compress without losing the mechanism.** Brevity, templates, and validation serve this operation; none substitutes for it.

## Five Lenses

- **Expertise Curator** — finds the knowledge, values, taste, and scars worth compressing; prevents prompt tricks with no domain substance.
- **Prior Surgeon** — names the bad default and installs a replacement instinct; prevents knowledge dumps the model admires but does not use.
- **Router** — reasons about classifier boundaries, false positives/negatives, and collisions; prevents skills that never load or load everywhere.
- **Attention Architect** — places each rule at the cheapest effective layer; prevents context landfills, premature compression, and output ceremony.
- **Systems Cartographer** — locates the skill among root laws, siblings, genera, and conventions; prevents a locally excellent skill that conflicts with its operating system.

## The Core Operation

Identify what must transfer. If there is no decision-changing expertise or recurring procedural value, prefer a checklist, document, or existing tool. Procedures and artifact schemas can earn a skill when packaging them prevents recurring mistakes; do not invent an expert insight to justify them.

| Expertise type | Question |
|---|---|
| Hard-won insight | What does an expert know from being burned? |
| Hidden constraint | What true rule is not obvious from docs, code, or generic best practice? |
| Value hierarchy | When two good things conflict, which wins, and why? |
| Tradeoff boundary | Where does the preferred approach stop being correct? |
| Taste / judgment | What distinguishes expert output from merely valid output? |
| Failure scar | What tempting move causes subtle damage? |
| Local ontology | What terms, categories, and authority lines must be preserved? |
| Exception logic | What facts override the default recommendation? |

Extract **decisions, not just opinions**. From an interview or example, recover the situation, cues, alternatives, choice, accepted cost, and a nearby case where the recommendation would reverse. Preserve the expert's discriminating distinctions rather than smoothing them into generic advice.

Turn “it depends” into the variables that change the decision. When recommendations conflict, recover their scopes and conditions; do not average them into a vague compromise or invent a missing tie-breaker.

Distinguish observations, causal interpretations, preferences, and heuristics. Preserve material qualifiers and source context; do not invent mechanisms, thresholds, outcomes, or consensus. When evidence is incomplete, encode the supported judgment with a clear boundary and identify the specific uncertainty—not a fabricated rule or a blanket refusal to distill.

Convert each major piece into a rewrite chain:

```text
Scar/value/constraint → bad default prior → why it fails
→ replacement instinct → manifest anchor → boundary (when not to apply)
```

Build one chain per major rule as working material. Revise or delete any rule whose changed decision is unclear. A likely bad default is an authoring hypothesis, not an observed failure unless the source establishes it.

## Encode Steering, Not Maxims

A useful working form:

```text
When [decision cue], prefer [replacement] over [tempting default],
because [mechanism or value hierarchy]. Accept [cost] to protect
[priority]. Change course when [boundary].
```

Use only the clauses that carry judgment. A hard constraint is not granted an exception by this pattern.

Encode the cues the expert notices, the variables that change the choice, and the tie-breaker when desirable outcomes conflict. Keep a short causal explanation when it lets the agent generalize beyond the example. For taste, use contrastive examples that isolate the decisive difference; adjectives alone do not transfer judgment.

**State the supported default directly. Put qualifiers on the conditions that change it, not on every action.** Give the replacement move, not just a prohibition.

A root-manifest rule earns its place if it carries expertise, resolves a tradeoff, overrides a likely bad default, names a non-obvious constraint, anchors attention, defines routing, or shapes an artifact the agent would otherwise produce incorrectly. Cut decorative wisdom and generic narration before cutting mechanisms, priorities, or boundaries.

## Placement — Every Rule Takes the Cheapest Effective Seat

Design for attention loss: assume task pressure leaves the title, core principle, quick reference, and a relevant anti-pattern more accessible than a buried paragraph.

| Placement | Use when |
|---|---|
| **Nowhere** | Generic or readily inferable, with no added decision value or recurring operational leverage. |
| **Description** | It affects whether the skill loads. |
| **Root manifest** | It must steer nearly every triggered run. |
| **Contrastive example** | A concrete distinction carries judgment better than an abstract rule. |
| **`references/`** | Detail matters only for a subset of runs; link directly with when-to-read guidance, keep one level deep, and add a TOC over 100 lines. |
| **Cited root/canon law** | System-wide authority, custody, safety, or approval; resolve and cite the actual section rather than cloning it. |
| **Automation** | A repeated, brittle, machine-checkable operation justifies its maintenance cost. Rare by default. |

Cheapest means least costly **without losing the steering**—not fewest words at any price. Keep the recognition cue and governing decision in the root when the agent must recognize when to retrieve deeper detail.

Shared definitions are single-homed. Use `$sibling-name` where the local system supports that convention; otherwise use a resolvable local reference. A citation is not a substitute for access: read a required dependency unless it is already in context, and never infer an unresolved law's contents.

## Map the System Before Authoring

Choose the mode and scale first. For creation or substantial rewrites, map the relevant system before distillation. For a narrow patch, inspect only the context that can change that patch; do not turn a description edit into a repository-wide audit.

- **Root contract:** locate the governing `CLAUDE.md`/`AGENTS.md` and nearer contracts. Cite real sections; do not import section numbers from another system.
- **Siblings:** identify adjacent routing clusters and what each owns. Add reciprocal references when edits are in scope; otherwise propose them without changing neighboring files.
- **Genus:** choose the shape by responsibility, as below.
- **Runtime provenance:** imported runtime, infrastructure, or rival-constitution vocabulary is scaffolding, not expertise. Preserve the judgment and re-ground it in the actual local contract.

| Genus | Load-bearing shape |
|---|---|
| **Artifact skill** | Owns a durable artifact, its schema, and its home. Avoid schema drift and cloned laws. |
| **Lens / auditor** | Owns an independent review angle. Specify reviewer inputs, persona, and useful report headings; supply the materials, not the author's self-justification. For independent delegates, exclude the authoring trajectory. Reviewers are read-only and return findings; the orchestrator persists `tmp/<datetime>__<slug>__<name>/report.md`. Verdicts are recommendations for the orchestrator, not proof. Use `$prompt__writing-persona` if it is an available local dependency. |
| **Protocol / front-end** | Owns an orchestrator decision—such as risk class, proof needed, or handoff—and feeds existing artifacts rather than creating a rival one. |
| **Domain orchestrator** | Owns a specialist family's boundary and coordinates its members. Loading a specialist is not progress; applying its expertise is. |

Unresolved context limits only the decisions that depend on it. State the limitation and continue supported work; do not invent authority or escalate a local missing reference into global unavailability.

## House Conventions

Apply these within the governing runtime and root contract:

- One-line plain `description`, no block scalar or colon in its value. State what it does, then `Use when ...`. This surface is always loaded; spend it on routing.
- No `model:` pins; model tier belongs to the operating contract. Mention tier in the body only when load-bearing.
- Tools inline and minimal. Auditors and challengers are read-only; writers receive only the write access their responsibility needs. Report persistence belongs to the orchestrator when the reviewer cannot write.
- No per-skill versioning apparatus or duplicate schema truth.
- Check conformance before writing and inspect the final artifact. Do not embed self-graded scorecards or working checklists in the skill as proof.
- No N/A filler. Omit empty sections and unnecessary scaffolding.
- Depth scales with blast radius and mode. Use a full arc for load-bearing changes and a compressed one for narrow changes.

## Routing — The Description Is a Classifier, Not Marketing

```text
[activity verb + artifact/domain] + [contexts/intents]
+ [trigger phrases or file types] + [exclusion boundary if needed]
```

Names are lowercase hyphenated, at most 64 characters, activity-first, without `helper`/`utils` sludge or quality labels. Keep internal namespace identifiers distinct from manifest names where necessary.

When routing changes, work through positive, negative, and borderline triggers; sibling collisions; and invocation bias. Prefer precision when overtriggering pollutes unrelated work, recall when undertriggering loses high-value behavior, and balance otherwise. Surface the cases needed to explain the boundary.

## Granularity Law

One skill owns one coherent responsibility, one routing cluster, and one related family of decision changes. Whether it owns an artifact depends on its genus.

| Situation | Decision |
|---|---|
| Same trigger, same rewrite, different examples | One skill with references. |
| Same trigger, materially different responsibilities or artifacts | Selector skill or separate skills. |
| Different triggers, same pervasive style preference | Root/profile context, not a skill. |
| Different owner, risk level, or tool authority | Separate skills. |
| Adjacent review angles on one artifact | Bounded sibling lenses, not a mega-skill. |
| One-off task | Usually no skill. |

## Authority Labels

Do not let heuristics masquerade as laws: **hard constraint**—binding safety, integrity, or authority limit; **local convention**—changeable through the applicable approval process; **heuristic**—override when local facts warrant; **example**—pattern anchor, not a universal rule.

An expert's confidence does not turn a heuristic into a hard constraint. Label authority where confusion would change behavior.

## Workflow

Select mode and depth → map relevant context → extract expertise → build rewrite chains → encode cues, choices, tradeoffs, and boundaries → place rules → design routing → draft → inspect the final artifact → emit the smallest complete result for the mode.

Do not compress before understanding what must survive. For a complete new skill or full rewrite, read `references/skill-template.md` for the authoring arc, mechanism and component matrices, and annotated per-genus skeletons. Use its working structures selectively; the requested artifact is the deliverable, not the worksheets.

## Anti-Patterns

- **Prompt brochure** — explains how valuable the skill is instead of changing the next decision. → Encode choices, contrastive examples, and failure anchors.
- **Template obedience** — fills every section because it exists. → Include components only for the cognitive failure each prevents.
- **Context landfill / root-law cloning** — copies docs or canon into a second, drifting authority. → Keep the steering; resolve and cite the source.
- **Compression damage** — removes the mechanism or exception to hit a length target. → Cut generic narration first; move depth rather than destroying judgment.
- **Unsupported doctrine** — turns expert interpretation or an author's inference into established fact. → Preserve source status, qualifiers, and applicability.
- **Values hidden in prose** — many things matter, nothing wins. → State the hierarchy, accepted cost, and reversal condition.
- **Heuristic-as-law** — promotes taste or contextual advice into an absolute. → Preserve authority and boundary.
- **Sibling collision** — overlaps a sibling's responsibility or creates an ambiguous routing collision. → Merge, narrow, or cross-reference explicit boundaries.
- **Foreign-system import** — ships another system's runtime or constitution. → Keep the expertise, replace scaffolding with local references.
- **Blast-radius escalation** — turns a local fault into broader unavailability. → Follow the actual root error posture; encode the affected subject, unsafe effect, and independent behavior that continues.
- **Validator cosplay** — substitutes elaborate checks or reviewer agreement for encoded judgment. → Distill first; use proportionate checks, not self-awarded proof.

## Contrastive Examples

### Expertise → steering

*Constructed example.*

**Expert's account**

> Our polished trailers got clicks, but people quit when the actual game didn't match the expectation. Rough gameplay clips got fewer clicks but brought us more returning players per dollar. For ongoing acquisition spend, I choose by cost per returning player—not click-through rate or polish. I'll accept fewer clicks. When we're only comparing hooks, click-through is useful, but a hook winner doesn't automatically earn more acquisition spend.

**Polished but weak summary**

> Balance creative quality, click-through rate, and retention to optimize marketing performance.

This names the considerations but loses which one wins, the accepted cost, and the condition that changes the decision.

**Rewrite chain**

```text
Higher-click creatives brought fewer returning players per dollar
→ tempting default: rank acquisition creatives by clicks or polish
→ failure: attention can reward an expectation the game does not fulfill
→ replacement: allocate ongoing spend by cost per returning player
→ anchor: a hook winner is not an acquisition winner
→ boundary: click-through can decide an isolated hook comparison
```

**Encoded instruction**

> For ongoing acquisition spend, choose creatives by cost per returning player, not click-through rate or polish. Attention is not acquisition when the ad sets an expectation the game does not fulfill. Accept fewer clicks or rougher footage when it brings more returning players per dollar. For an isolated hook comparison, use click-through to compare hooks; that result alone does not justify scaling acquisition spend. **A hook winner is not an acquisition winner.**

The encoded version preserves the cue, mechanism, priority, accepted cost, and boundary. The source supplies no retention window or numerical threshold; the skill must not invent one.

### Routing

Bad: `Helps create better skills.`

Good:

```yaml
description: Designs and rewrites reusable agent skills by extracting expert judgment and encoding decision steering. Use when creating skills, fixing triggers, converting repo doctrine into skills, or choosing skill granularity.
```

### Authority and placement

Bad: restate a root custody rule in new words, or cite an assumed section number without resolving it.

Good: resolve the governing custody section, cite its actual location, and encode only the domain-specific decision it constrains.

## Skill Result

| Mode | Deliver |
|---|---|
| **Create / substantial rewrite** | The usable skill and necessary supporting artifacts. Briefly explain only material ownership, routing, or unresolved decisions not apparent in the artifact. |
| **Audit** | Ranked findings with evidence, the decision each defect harms, and the smallest useful fix. Prioritize expertise and steering gaps over cosmetic conformance. |
| **Narrow patch** | Changed fields or sections and the minimum rationale. Preserve unrelated content. |
| **Expertise extraction** | Source-grounded doctrine, rewrite chains, boundaries, and specific unresolved questions. Do not force premature packaging. |
| **Metadata question** | The direct answer or revised metadata. |

The result is complete when the requested usable artifact or answer is delivered.

## Lightweight Validation

When practical, try a representative case, a boundary case, and a nearby non-trigger to reveal missing or misdirected steering. Distinguish inspection from observed behavior; never claim unrun tests.

## Final Check

Use privately; do not print as a completion ritual:

- The expertise is substantive and faithfully bounded; important source distinctions survived.
- Major rules change an identifiable decision, with explicit priorities and applicable exceptions.
- Strong anchors remain accessible; compression has not erased the mechanism.
- Ownership, routing, authority, and required dependencies are coherent for this mode.
- The final artifact follows local format conventions and contains no empty scaffolding or invented references.
- The output matches the request's scope; optional validation has not displaced the distillation.

## References

- [Skill template](references/skill-template.md) — read when producing a complete new skill or full rewrite: the authoring arc, mechanism and component matrices, and annotated per-genus skeletons.
- [Agent-context extraction](references/agent-context-extraction.md) — read when extracting skills from a root contract or large agent-context file: boundary testing, distillation, splitting, and re-grounding.