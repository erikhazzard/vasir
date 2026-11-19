# AI Code Accretion Audit Method and Report Schemas

Use this reference for `SUBSYSTEM` and `REPOSITORY SWEEP` audits, or when a narrower audit encounters dynamic consumers, persistent compatibility, multiple authorities, or needs a full report card.

## Contents

1. Coverage manifest
2. Negative-evidence classes
3. Behavior and authority ledger
4. Hard-boundary test
5. Proof selection
6. Targeted history and priority
7. Full report schemas

## 1. Coverage manifest

Discover and classify the material surfaces within the named boundary:

- public functions, routes, commands, handlers, and APIs;
- dependency-injection, reflection, plugin, and registry entrypoints;
- event, queue, cron, scheduler, and infrastructure-triggered work;
- mutation paths and lifecycle transitions;
- state owners, stores, caches, projections, and replicas;
- old, new, fallback, exact, cached, best-effort, and compatibility modes;
- external integrations;
- persisted schemas, serialized identifiers, saves, replays, and event formats;
- supported application or protocol versions;
- generated and vendor-owned surfaces.

Mark each surface `INSPECTED`, `PARTIALLY INSPECTED`, `UNKNOWN`, or `EXCLUDED`. For generated code, audit the generator, schema, or ownership boundary instead of grading generated repetition as ordinary hand-maintained duplication.

Use this table:

| Surface | Discovered | Inspected | Partial / unknown / excluded | Evidence limit |
| --- | ---: | ---: | --- | --- |

Then summarize the system spine:

```text
Supported roots
    → capabilities
        → invariants and authorities
            → principal mechanisms
```

Name the normal and failure, lifecycle, recovery, migration, or compatibility paths actually traced.

## 2. Negative-evidence classes

Before claiming code is unused, dead, or unreferenced, inspect every applicable consumer class:

- static references;
- registrations and dependency injection;
- reflection and dynamic dispatch;
- configuration and manifests;
- scheduled and queue-triggered work;
- scripts and tooling;
- plugins;
- serialized or persisted identifiers;
- external APIs and supported client versions.

State which classes were checked and which remain unknown. A caller inside the candidate cluster is not an external forcing root.

## 3. Behavior and authority ledger

For each important mutable concept, record:

| Field | Required question |
| --- | --- |
| Invariant | What must remain true? |
| Authority | Which component owns that truth? |
| Representations | Which forms are authoritative, derived, replica, ephemeral, compatibility, or unknown? |
| Transitions | Which operations may legally change it? |
| Enforcement | Where is the invariant guaranteed? |
| Compensation | Which guards, retries, fallbacks, or reconcilers repair violations? |
| Failure consequence | What externally meaningful failure occurs if it breaks? |
| Proof | What evidence demonstrates the invariant or terminal outcome? |

Multiple representations are not inherently wasteful. Multiple independent authorities or unclear convergence are.

For each candidate cluster, answer:

1. What external requirement, supported journey, invariant, contract, or measured constraint pays for it?
2. Should that root behavior still exist?
3. Are apparent consumers external, or do mechanisms merely justify one another?
4. What externally observable behavior breaks if the whole cluster is removed?
5. Could the authoritative owner produce the result directly?
6. Which surrounding mechanisms disappear if the root capability or mode disappears?
7. What is the strongest evidence-based case for preserving the current shape?
8. What fact would reverse the finding?
9. What cheapest inspection or experiment resolves the remaining uncertainty?
10. What is the smallest surviving shape?

## 4. Hard-boundary test

Complexity retained for risk must name a concrete scenario:

```text
stimulus
    → operating condition
        → affected asset or journey
            → required response or threshold
                → consequence if missed
```

“This is for security,” “this is a hot path,” “old clients might exist,” “this provides reliability,” and “we need defense in depth” are insufficient without the actual boundary, supported population, failure, measurement, or contract.

A suspicious mechanism classified `KEEP` states:

- the forcing scenario;
- the evidence;
- the authority or owner;
- why the mechanism is proportionate;
- the removal condition when it is temporary.

Permanent versioned contracts need no removal date. Temporary migrations and bounded support paths do.

## 5. Proof selection

Choose the cheapest proof faithful to the failure being prevented:

- **REACHABILITY** — compiler, type system, reference search, registration analysis, or dead-code analysis.
- **INVARIANT** — unit, property, model, idempotency, ordering, or state-transition proof.
- **CONTRACT** — API, authorization, serialization, protocol, schema, or compatibility proof.
- **JOURNEY** — integration or end-to-end proof at a terminal user- or system-visible oracle.
- **STATE EVOLUTION** — migration rehearsal, save/replay compatibility, event-log replay, or production-snapshot replay.
- **OPERATIONAL** — profiling, load evidence, canary, shadow comparison, or rollback threshold.

For each proposed deletion or collapse, state existing proof, the proof gap, proof required before and after the change, and current tests to retarget or delete. A test that preserves an unnecessary mechanism is not proof that the mechanism should survive.

## 6. Targeted history and priority

Use history only when current code cannot distinguish a deliberate boundary from repair accretion, temporary compatibility from permanent support, a stable subsystem from a high-interest hotspot, or an intentional guard from an incident patch. Inspect introducing commits, blame on suspicious branches, fix/revert sequences, path churn, temporal coupling, and incident-linked changes. Start with a current unanswered question; commit prose alone does not prove intent.

Prioritize by recurring change frequency, temporal coupling, incidents, roadmap pressure, cognitive and coordination cost, blast radius, deletion dividend, dependency order, confidence, and proof cost. A stable ugly area may be lower priority than a moderately confusing weekly hotspot; a low-churn security or data-integrity boundary may remain high priority because of consequence.

## 7. Full report schemas

### Verdict and scope

Start with:

- `NO MATERIAL ACCRETION`, `ACCRETION FOUND`, or `INCONCLUSIVE`;
- finding confidence `HIGH`, `MEDIUM`, or `LOW`;
- coverage confidence `HIGH`, `MEDIUM`, or `LOW`;
- audit mode;
- named boundary.

In three to five sentences state where the system is genuinely simple, the largest avoidable cost, the highest-leverage safe removal, and material evidence limits. Do not make an authorship claim or release verdict.

`NO MATERIAL ACCRETION` requires adequate coverage, no unsupported justification islands, positive authority and convergence evidence, and no hidden material unknowns.

### Material finding

Use one finding per justification island, not one per smell:

```markdown
### <ID> — <classification>: <plain-language finding>

- **Exact target:** files, symbols, workers, routes, flags, schemas, or modes
- **Claim:** FACT, INFERENCE, ASSUMPTION, or UNKNOWN
- **Root chain:** requirement → capability → invariant/authority → mechanisms
- **Evidence:** exact current evidence
- **System cost:** understanding, change, incident, runtime, coordination, or contract cost
- **Strongest case for keeping it:** steelman the current shape
- **Why that case does or does not win**
- **Falsifier or discriminator:** fact that would reverse or resolve the finding
- **Smallest surviving shape**
- **Deletion dividend:** concepts, paths, modes, authorities, truths, workers, or adapters removed versus introduced
- **Finding confidence:** HIGH, MEDIUM, or LOW
```

### Ten-dimension report card

| # | Dimension | Grade | FACT evidence | Why it costs us | Direction |
| --- | --- | --- | --- | --- | --- |

Direction is one of `KEEP`, `REMOVE CAPABILITY`, `DELETE`, `COLLAPSE CLUSTER`, `SINGLE-HOME`, `REMOVE MODE`, `RETARGET PROOF`, `DEFER`, or `INVESTIGATE`.

### What must not be deleted

Name only suspicious-looking complexity forced by a real contract, invariant, risk scenario, supported migration/version, lifecycle requirement, or measured performance constraint. State the forcing root and evidence for each.

### Action plan

Return three to seven actions unless fewer are justified. Order by leverage, dependency, maintenance interest, and risk—not ease or aesthetics.

| Priority | Action | Exact targets | Remove / collapse | Surviving authority and shape | Behavior preserved or intentionally removed | Proof | Deletion dividend | Why now | Effort / change risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Each action must be executable without rediscovering the diagnosis, name what leaves and remains, state preserved or intentionally removed behavior, select the cheapest credible proof, and state the net conceptual effect. Do not propose a rewrite when incremental convergence is credible. Exclude cosmetic renames, moves, formatting, and comment cleanup unless structurally necessary.

The action plan is the final section. Do not append a closing essay.
