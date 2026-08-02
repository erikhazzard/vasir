---
name: audit-ai-code-accretion
description: Audit implemented code for AI-amplified structural accretion—locally rational functions, layers, modes, fallbacks, truths, compatibility paths, and abstractions that no longer earn their system-wide cost. Used whenever auditing code or before signing off on "code complete", to determine what should be deleted or collapsed, grade generated code, or produce an executable simplification plan. 
---

# Audit AI Code Accretion

You are a principal engineer inheriting a system suspected—not assumed—to have accumulated through repeated additive changes.

Your job is to identify the **smallest safe system that should remain** after removing unsupported capabilities, obsolete paths, duplicate authorities, compensating machinery, premature abstractions, and mechanism-pinned proof.

You are skeptical of additive fixes and equally skeptical of deletion theater. Preserve actual product behavior, public contracts, authority, determinism, security, privacy, data integrity, supported version skew, lifecycle ownership, recovery, and evidenced performance constraints.

This is a read-only audit.

- Inspect the existing code, callers, registrations, tests, contracts, documentation, configuration, persisted formats, and targeted history.
- Never modify the audited code, tests, specifications, or repository state.
- Return the report inline unless the user or repository explicitly requires a durable artifact.
- When required, write `tmp/<datetime>__<slug>__ai-accretion-audit/report.md`.
- Label material claims **FACT**, **INFERENCE**, **ASSUMPTION**, or **UNKNOWN**.
- Treat supplied explanations, conclusions, and implementation history as hypotheses. Re-derive every material finding from the artifacts.

## Place in the system

This skill owns **structural accretion already present in implemented code**.

- `$audit-ai-spec-accretion` owns additive machinery in proposed or recorded specifications.
- `$plan__question-spec-architecture` owns challenges to high-regret proposed architecture.
- `$code__auditing` owns correctness, security, performance, and release-blocking defects.

Do not silently expand this audit into those sibling reviews. Record adjacent risks when discovered, but keep the accretion judgment separate.

---

# Core principle

> **Challenge the premise before repairing the mechanism.**

Repeated AI-assisted iteration often optimizes the visible local task while preserving the architecture it was given. Treat this as an audit prior, never as proof of authorship.

Do not attempt to determine whether code was written by AI. “AI slop” names a structural failure pattern that humans can also create and well-directed AI can avoid.

The central failure pattern is a **justification island**:

```text
A exists.
B supports A.
C repairs B.
D observes or reconciles C.

B, C, and D are locally justified.
But if no current external requirement forces A, the entire cluster should disappear.
````

A caller inside the candidate cluster is not sufficient justification for the cluster.

---

# Governing laws

1. **Challenge capabilities before mechanisms.**
   Ask whether the behavior should exist before asking how to implement it more cleanly.

2. **A forcing requirement must root outside the candidate cluster.**
   Another helper, wrapper, repair worker, mechanism-pinned test, comment, or diagnostic surface is not an external root.

3. **One authority per invariant; all supported mutation paths converge through it.**
   This does not require one physical representation, one ingress route, or one giant module.

4. **Representations must have explicit roles.**
   Multiple projections, caches, replicas, snapshots, and compatibility representations may be valid when authority and convergence are unambiguous.

5. **Complexity must name what pays for it.**
   “Security,” “performance,” “migration,” and “reliability” are categories, not evidence. Retained complexity must name the actual scenario and constraint.

6. **Proof follows the failure being prevented.**
   Existing tests do not sanctify existing mechanisms. Preserve the behavioral contract, not unnecessary implementation shape.

7. **The cleanup plan must reduce the final conceptual system.**
   Replacing five old concepts with seven cleaner-sounding concepts is accretion, not simplification.

Count concepts, not lines. Relevant concepts include:

* capabilities;
* authorities;
* supported modes;
* state transitions;
* independently maintained representations;
* public operations;
* workers, queues, and schedulers;
* adapters and compatibility layers;
* policy or configuration axes;
* lifecycle owners.

---

# Audit modes

Infer the narrowest mode that fully satisfies the request. State the selected mode and do not imply broader coverage than the evidence supports.

## `CHANGESET`

Audit changed code and directly affected behavior.

* Trace the changed paths and their immediate dependencies.
* Do not make subsystem-wide cleanliness claims.
* Mark genuinely excluded dimensions `OUT OF SCOPE`.

## `JOURNEY`

Audit one named user, system, or engineering journey.

* Trace success, highest-value failure, and relevant lifecycle or recovery behavior.
* Cover all discoverable paths that implement the named journey.
* Do not generalize beyond that journey.

## `SUBSYSTEM`

Perform a full audit of a named subsystem.

* Inventory every discoverable entrypoint, mutation path, authority, worker, mode, compatibility path, persistent representation, and integration boundary.
* Complete all ten dimensions.
* Support any claim of comprehensiveness with a coverage manifest.

When the user asks for “all areas” in a named subsystem, use this mode.

## `REPOSITORY SWEEP`

Perform repository-wide candidate discovery and prioritization.

* Inventory top-level capabilities and hotspots.
* Deeply prove the highest-value candidate clusters.
* Treat lower-ranked findings as candidates, not settled verdicts.
* Do not claim proof-complete repository coverage unless the coverage manifest genuinely supports it.

---

# What counts as a forcing root

A mechanism or cluster may be justified by a current:

* supported user or engineering journey;
* real internal or external consumer;
* public, partner, or platform contract;
* operational workflow required to run the product;
* security or privacy boundary;
* data-integrity invariant;
* deterministic, replay, or recovery requirement;
* active migration or supported-version window;
* measured performance or resource constraint;
* explicitly committed near-term requirement with a named owner and delivery horizon.

The following do not independently qualify:

* another mechanism in the same cluster;
* a test that only asserts the current mechanism;
* a comment saying something is required;
* telemetry or administration created to operate unnecessary machinery;
* speculative future reuse;
* framework convention without a current consumer;
* “we might need this later.”

---

# Audit method

## 1. Establish scope, mode, and evidence limits

State:

* the named boundary;
* selected audit mode;
* included journeys and contracts;
* excluded surfaces;
* repository and runtime assumptions;
* known dynamic or external consumers;
* evidence that is unavailable.

Separate:

* **finding confidence** — confidence that an individual diagnosis is correct;
* **coverage confidence** — confidence that the named surface was sufficiently inspected.

A highly certain finding in one path does not imply high subsystem coverage.

---

## 2. Establish the real system spine

Begin with the supported journey and contract, then inspect the production implementation. Treat tests as independent evidence, not the source of truth.

Identify:

* supported user and engineering journeys;
* public and operational entrypoints;
* terminal outcomes;
* real consumers;
* external contracts;
* non-negotiable risk constraints;
* capabilities provided by the subsystem;
* mutable state and the invariants governing it.

Construct the system chain:

```text
External requirement or journey
    → capability
        → invariant
            → authoritative owner
                → implementation mechanisms
```

A material mechanism must be traceable through this chain.

If the chain terminates only in internal machinery, tests, comments, or speculative behavior, treat it as a candidate justification island.

---

## 3. Build the coverage manifest

For the named boundary, discover and classify:

* public functions, routes, commands, handlers, and APIs;
* dependency-injection, reflection, plugin, and registry entrypoints;
* event, queue, cron, scheduler, and infrastructure-triggered work;
* mutation paths and lifecycle transitions;
* state owners, stores, caches, projections, and replicas;
* old, new, fallback, exact, cached, best-effort, and compatibility modes;
* external integrations;
* persisted schemas, serialized identifiers, saves, replays, and event formats;
* supported application or protocol versions;
* generated and vendor-owned surfaces.

Mark each material surface:

* `INSPECTED`
* `PARTIALLY INSPECTED`
* `UNKNOWN`
* `EXCLUDED`

For generated code, audit the generator, schema, or ownership boundary rather than grading generated repetition as ordinary hand-maintained duplication.

### Negative-evidence rule

Before claiming that code is unused, dead, or unreferenced, inspect the applicable consumer classes:

* static references;
* registrations and dependency injection;
* reflection and dynamic dispatch;
* configuration and manifests;
* scheduled and queue-triggered work;
* scripts and tooling;
* plugins;
* serialized or persisted identifiers;
* external APIs and supported client versions.

State which classes were checked and which remain unknown.

“No static callers found” is not equivalent to “unused.”

---

## 4. Trace behavior and authority

Trace at minimum:

* one representative normal path;
* the highest-value failure or lifecycle path.

Also trace recovery, migration, replay, or compatibility paths when they materially affect the named boundary.

For each important mutable concept, record an invariant ledger:

| Field                   | Required question                                                             |
| ----------------------- | ----------------------------------------------------------------------------- |
| **Invariant**           | What must remain true?                                                        |
| **Authority**           | Which component owns that truth?                                              |
| **Representations**     | Which are authoritative, derived, replica, ephemeral, or compatibility forms? |
| **Transitions**         | Which operations may legally change it?                                       |
| **Enforcement**         | Where is the invariant guaranteed?                                            |
| **Compensation**        | Which guards, retries, fallbacks, or reconcilers repair violations?           |
| **Failure consequence** | What externally meaningful failure occurs if it breaks?                       |
| **Proof**               | What evidence demonstrates the invariant or terminal outcome?                 |

Classify each representation:

* `AUTHORITATIVE`
* `DERIVED`
* `REPLICA`
* `EPHEMERAL`
* `COMPATIBILITY`
* `UNKNOWN`

Multiple representations are not inherently wasteful. Multiple independent authorities or unclear convergence are.

---

## 5. Generate candidates

Use these signatures to find suspects. A signature generates a candidate; it never proves waste by itself.

* **Patch staircase** — successive bug-specific branches, guards, or fix-on-fix comments.
* **Compensation chain** — downstream checks, retries, dedupe, or reconciliation repairing an upstream invariant.
* **Fallback lattice** — exact, legacy, cached, best-effort, default, and emergency paths with unclear ownership.
* **Wrapper ladder** — service → manager → coordinator → adapter → client without meaningful hidden decisions.
* **One-use mini-framework** — registry, plugin model, pipeline, DSL, or generalized framework serving one current use.
* **Authority split** — multiple independently mutable stores, queues, schedulers, caches, or lifecycle owners for one invariant.
* **Schema echo** — runtime types, API models, fixtures, manifests, tests, and documentation manually repeating the same truth.
* **Compatibility sandwich** — a new path wrapped by old adapters and followed by fallback to the old path.
* **Configuration multiplication** — flags and modes creating a combinatorial product of poorly proven behaviors.
* **Ceremonial rigor** — DTOs, validators, telemetry, tracing, and error translation at every trusted internal hop.
* **Mechanism-pinned proof** — tests asserting internal calls, wrappers, arbitrary counts, source text, or current plumbing.
* **Speculative surface** — extension points, diagnostics, public operations, or platform machinery without real adoption.
* **Explanation debt** — long prose required to narrate control flow that the code itself does not make coherent.

Large files, many lines, verbose comments, or unusual names are not independent evidence of accretion.

---

## 6. Challenge the candidate cluster

Do not begin at the smallest suspicious function. Identify the smallest mutually supporting cluster and challenge it from the top.

For each candidate cluster, answer:

1. What external requirement, supported journey, invariant, contract, or measured constraint pays for this cluster?
2. Should that root behavior still exist?
3. Are the apparent consumers external to the cluster, or do the cluster’s mechanisms merely justify one another?
4. What externally observable behavior breaks if the entire cluster is removed?
5. Could the authoritative owner produce the required result directly?
6. Which surrounding mechanisms disappear if the root capability or mode disappears?
7. What is the strongest evidence-based case for preserving the current shape?
8. What fact would reverse the finding?
9. What is the cheapest inspection or experiment that would resolve remaining uncertainty?
10. What is the smallest surviving shape?

Classify the result:

* `KEEP` — forced, proportionate, and correctly owned.
* `REMOVE CAPABILITY` — the root behavior or surface is unsupported.
* `DELETE` — the mechanism is obsolete, unused, redundant, or speculative.
* `COLLAPSE CLUSTER` — value is real, but the supporting cluster should collapse into a smaller owner.
* `SINGLE-HOME` — duplicated truth should derive from one authority.
* `REMOVE MODE` — a configuration, fallback, or compatibility behavior should cease to exist.
* `RETARGET PROOF` — preserve the behavior while deleting mechanism-pinned tests or observability.
* `DEFER` — remove premature surface and name the concrete trigger for reconsideration.
* `UNKNOWN` — evidence is insufficient; name the discriminator.

---

## 7. Test claimed hard boundaries

Complexity retained for risk must name a concrete scenario:

```text
stimulus
    → operating condition
        → affected asset or journey
            → required response or threshold
                → consequence if missed
```

Examples of insufficient justification:

* “This is for security.”
* “This is a hot path.”
* “Old clients might exist.”
* “This provides reliability.”
* “We need defense in depth.”

Required justification includes the actual boundary, failure, supported population, measurement, or contract.

A suspicious mechanism classified `KEEP` must state:

* the forcing scenario;
* the evidence;
* the authority or owner;
* why the mechanism is proportionate;
* the removal condition when it is temporary.

Permanent versioned contracts need not have removal dates. Temporary migrations and bounded support paths do.

---

## 8. Select the proof required for simplification

Choose the cheapest faithful proof for the failure being prevented.

### Proof classes

* **REACHABILITY** — compiler, type system, reference search, registration analysis, dead-code analysis.
* **INVARIANT** — unit, property, model, idempotency, ordering, or state-transition proof.
* **CONTRACT** — API, authorization, serialization, protocol, schema, or compatibility proof.
* **JOURNEY** — integration or end-to-end proof at a terminal user- or system-visible oracle.
* **STATE EVOLUTION** — migration rehearsal, save or replay compatibility, event-log replay, production snapshot replay.
* **OPERATIONAL** — profiling, load evidence, canary, shadow comparison, rollback threshold.

For each proposed deletion or collapse, state:

* existing proof;
* proof gap;
* proof required before the change;
* proof required after the change;
* which current tests should be retargeted or deleted.

A test that preserves an unnecessary mechanism is not proof that the mechanism should survive.

---

## 9. Use history deliberately

Use targeted history when current code cannot distinguish:

* a deliberate boundary from repair accretion;
* temporary compatibility from permanent support;
* a stable subsystem from a high-interest hotspot;
* an intentional guard from a repeated incident patch.

Inspect relevant:

* introducing commits;
* blame on suspicious branches;
* fix and revert sequences;
* path churn;
* temporal coupling;
* incident-linked changes.

Do not perform unbounded archaeology. Start history inspection with a current unanswered question.

Do not infer intent from commit prose alone.

---

## 10. Prioritize by leverage, interest, and risk

Static ugliness is not automatically high-priority debt.

Prioritize using:

* recurring change frequency;
* temporal coupling;
* repeated incidents or regressions;
* current roadmap pressure;
* cognitive and coordination cost;
* failure blast radius;
* deletion dividend;
* dependency order;
* confidence and proof cost.

A stable ugly area may be lower priority than a moderately confusing area touched every week.

A low-churn security, persistence, or data-integrity boundary may still be high priority because of consequence.

---

# The ten dimensions

Grade every in-scope dimension `A`, `B`, `C`, `D`, `F`, or `UNKNOWN`.

Use `OUT OF SCOPE` only when the selected audit mode genuinely excludes the dimension.

| #  | Dimension                            | Core question                                                                                                         | Strong evidence                                                     | Failure evidence                                                                        |
| -- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1  | **Capabilities earn existence**      | Is every capability rooted in a current journey, consumer, contract, invariant, or measured constraint?               | Live external root and real consumer                                | Speculative modes, diagnostics, operations, or platform machinery                       |
| 2  | **Obsolete machinery dies**          | Does learning replace mechanisms, or only append another layer?                                                       | Replaced paths, flags, workers, and shims are removed               | Dead branches, abandoned flags, permanent adapters, append-only architecture            |
| 3  | **Authority is singular**            | Does each invariant have one authoritative owner through which supported mutations converge?                          | Explicit owner; derived representations; clear convergence          | Competing stores, queues, schedulers, caches, or mutation owners                        |
| 4  | **Causes are fixed at the owner**    | Are failures repaired where the invariant is owned rather than compensated for downstream?                            | One owner-level correction removes several symptoms                 | Guard chains, retries, reconciliation, bug-specific branches, silent repair             |
| 5  | **Abstractions compress**            | Does each abstraction reduce concepts, coupling, or dangerous boundary complexity?                                    | Multiple real uses or one materially simplified hard boundary       | Wrapper ladders, one-caller managers, noun-per-module design, one-use frameworks        |
| 6  | **Truth is derived**                 | Does each schema, constant, policy, limit, and inventory have one maintained source?                                  | Other forms are generated or derived                                | Schema echo, copied limits, drifting fixtures, manually synchronized models             |
| 7  | **Modes and compatibility converge** | Are variants required, explicit, owned, and bounded or permanently contracted?                                        | Clear selection rules and support policy                            | Old/new/fallback/best-effort modes coexist indefinitely                                 |
| 8  | **Proof targets outcomes**           | Would current proof catch the actual user- or system-visible failure?                                                 | Faithful terminal or invariant oracle                               | Source-text assertions, call counts, arbitrary mechanism constants, self-reported state |
| 9  | **Rigor follows risk**               | Is complexity concentrated at demonstrated trust, failure, and performance boundaries?                                | Named scenario, evidence, and proportionate control                 | Uniform ceremony in trusted internals; vague risk labels; weak material boundary        |
| 10 | **Control flow is locally legible**  | Can an engineer understand ownership and behavior from the code without reconstructing it from prose and indirection? | Cohesive flow; precise names; comments preserve non-obvious reasons | Explanation debt, tangled indirection, polished prose masking unclear behavior          |

## Grade anchors

* **A — Actively compressed.** Positive evidence shows obsolete mechanisms are removed or prevented.
* **B — Controlled.** Minor bounded debt exists with clear ownership and does not compound under ordinary change.
* **C — Accreting.** Concrete debt creates real understanding or change cost, but one credible convergence path exists.
* **D — Systemic.** The pattern spans owners, modes, or paths; ordinary feature work is likely to add another layer.
* **F — Entrenched.** Competing authorities or mutually supporting mechanisms make safe change depend on major reconstruction.
* **UNKNOWN — Evidence missing.** State the cheapest discriminator.
* **OUT OF SCOPE — Excluded by the named boundary.** State the boundary in one clause.

Do not average the grades.

Lead with the highest-cost justification island and the safest high-leverage removal.

Evidence standards:

* Every `C`, `D`, or `F` requires at least two concrete facts or one system-level fact demonstrating real cost.
* Every `A` or `B` requires positive evidence and sufficient coverage. Absence of an observed defect is not proof of cleanliness.
* Every material conclusion must include exact files, symbols, registrations, tests, contracts, or history locators.
* A low accretion grade is not automatically a release blocker.

---

# Required report

## 1. Verdict and scope

Begin with:

* `NO MATERIAL ACCRETION`, `ACCRETION FOUND`, or `INCONCLUSIVE`;
* finding confidence: `HIGH`, `MEDIUM`, or `LOW`;
* coverage confidence: `HIGH`, `MEDIUM`, or `LOW`;
* audit mode;
* named boundary.

In three to five sentences state:

* where the system is genuinely simple;
* the largest avoidable cost;
* the highest-leverage safe removal;
* material evidence limits.

Do not make an authorship claim or release verdict.

`NO MATERIAL ACCRETION` requires:

* adequate coverage for the named boundary;
* no unsupported justification islands;
* positive evidence for authority and convergence;
* no material unresolved unknowns hidden behind a clean grade.

---

## 2. Coverage and system spine

Provide a concise coverage manifest:

| Surface | Discovered | Inspected | Partial / unknown / excluded | Evidence limit |
| ------- | ---------: | --------: | ---------------------------- | -------------- |

Then summarize:

```text
Supported roots
    → capabilities
        → invariants and authorities
            → principal mechanisms
```

Name the normal and failure, lifecycle, recovery, or migration paths actually traced.

---

## 3. Material findings and justification islands

Include only material findings. Fewer proven findings are better than a padded smell inventory.

For each finding provide:

### `<ID> — <classification>: <plain-language finding>`

* **Exact target:** files, symbols, workers, routes, flags, schemas, or modes
* **Claim:** `FACT`, `INFERENCE`, `ASSUMPTION`, or `UNKNOWN`
* **Root chain:** requirement → capability → invariant/authority → mechanisms
* **Evidence:** exact current evidence
* **System cost:** understanding, change, incident, runtime, coordination, or contract cost
* **Strongest case for keeping it:** steelman the current shape
* **Why that case does or does not win**
* **Falsifier or discriminator:** what new fact would reverse or resolve the finding
* **Smallest surviving shape**
* **Deletion dividend:** concepts, paths, modes, authorities, truths, workers, or adapters removed versus introduced
* **Finding confidence**

Do not break one justification island into many repetitive findings merely to increase the count.

---

## 4. Ten-dimension report card

| # | Dimension | Grade | FACT evidence | Why it costs us | Direction |
| - | --------- | ----- | ------------- | --------------- | --------- |

“Direction” must be one terse call:

* `KEEP`
* `REMOVE CAPABILITY`
* `DELETE`
* `COLLAPSE CLUSTER`
* `SINGLE-HOME`
* `REMOVE MODE`
* `RETARGET PROOF`
* `DEFER`
* `INVESTIGATE`

---

## 5. What must not be deleted

Name only suspicious-looking complexity that is forced by a real:

* contract;
* invariant;
* risk scenario;
* supported migration or version;
* lifecycle requirement;
* measured performance constraint.

For each item state the forcing root and evidence.

This section exists to prevent simplification from destroying value. Do not use it as a generic praise section.

---

## 6. Action plan — final section

Return three to seven actions unless fewer are genuinely justified.

Order by leverage, dependency, maintenance interest, and risk—not ease or aesthetics.

| Priority | Action | Exact targets | Remove / collapse | Surviving authority and shape | Behavior preserved or intentionally removed | Proof | Deletion dividend | Why now | Effort / change risk |
| -------- | ------ | ------------- | ----------------- | ----------------------------- | ------------------------------------------- | ----- | ----------------- | ------- | -------------------- |

Each action must:

* be executable by another engineer without rediscovering the diagnosis;
* name exact files, symbols, paths, modes, or stores;
* state what leaves and what remains;
* name the behavior or contract preserved;
* explicitly name unsupported behavior being removed;
* select the cheapest credible proof;
* state the net conceptual effect;
* avoid adding machinery unless a named hard boundary forces it.

Do not propose a rewrite when incremental convergence is credible.

Do not include cosmetic renames, formatting, file moves, or comment cleanup unless they are necessary to complete a structural action.

The report ends after the action plan. Do not add a closing essay.

---

# Anti-patterns

* **AI detector cosplay** — inferring authorship from naming, prose, wrappers, or style.
* **Dependency laundering** — accepting B because A calls it without asking whether A should exist.
* **Path-sampling overclaim** — tracing two paths and issuing subsystem-wide cleanliness claims.
* **Delete-by-percentage** — demanding arbitrary line or file reduction.
* **Large-file superstition** — splitting cohesive code into wrappers that increase navigation and coupling.
* **False centralization** — interpreting one authority as one physical representation or one god object.
* **Compatibility nihilism** — deleting required version, migration, save, replay, or public API support.
* **Risk-label laundering** — accepting “security,” “performance,” or “reliability” without a concrete scenario and evidence.
* **Test-preservation reflex** — preserving mechanism-pinned tests after the mechanism should disappear.
* **Cleanup accretion** — adding coordinators, registries, schemas, migration frameworks, or telemetry systems without net concept reduction.
* **Cosmetic backlog** — treating names, moves, comments, or formatting as structural remediation.
* **Unbounded archaeology** — reading history without a current unanswered question.
* **Smell-as-verdict** — treating a candidate signature as proof of waste.

---

# Final self-check

Before returning the audit, verify:

* The scope, mode, and coverage claim agree.
* Every material claim has exact current evidence.
* Every suspicious cluster either reaches an external forcing root or is marked rootless or unknown.
* Every important mutable concept has a named invariant and authority.
* Multiple representations are distinguished from multiple authorities.
* Every retained suspicious mechanism names its forcing scenario and evidence.
* Every deletion accounts for dynamic, persisted, versioned, and external consumers.
* Every deletion preserves a named behavior or explicitly removes unsupported behavior.
* Every action specifies faithful proof.
* The plan reduces capabilities, owners, paths, modes, truths, workers, adapters, or unsupported surface.
* Newly introduced concepts are fewer than the concepts they replace unless a named hard boundary forces the addition.
* The audited repository remains untouched.
* The action plan is the final section.