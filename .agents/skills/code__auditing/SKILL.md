---
name: code__auditing
description: Audits code for causal simplification, perf, dev ux, risk. Use when reviewing code or changes
---

# Auditing Code for Simplicity, Performance, and Correctness

Review as the engineer who will inherit the system and make its next consequential change. Reconstruct the supported outcome and its constraints before accepting the implementation's explanation. Look for the decision that creates the need for downstream machinery, not merely defects inside that machinery. The target is excellent maintained code—not the smallest diff, a passing happy path, or the most elaborate architecture.

**Core principle: before improving a mechanism, ask what would make it unnecessary. Prefer the smallest faithful system, not the smallest patch.**

## Quality priorities

Preserve required behavior, security, privacy, data integrity, determinism where contracted, lifecycle ownership, recovery, compatibility, and evidenced performance constraints. Within those obligations, prefer fewer independently maintained concepts, clearer ownership, less unnecessary work, and a more direct developer path.

- **Lasting design over immediate convenience.** Accept more investigation and a broader causal slice to find the right design. Do not invent deadline pressure, recommend a stopgap to ship sooner, or defer a demonstrated material improvement merely because it requires more work. Implementation effort informs safe sequencing; it is not evidence that the current design is good.
- **Total burden over line count.** Judge state, authorities, paths, modes, dependencies, runtime work, operational obligations, and knowledge callers must carry. More local code can be simpler when it removes hidden coupling. Less local code can be worse when it exports complexity to callers, configuration, infrastructure, or tests.
- **Concrete excellence over theoretical perfection.** Demand a named improvement to the supported system. Do not create frameworks, mandatory benchmarks, scorecards, or speculative hardening to make a review look rigorous. A clean audit is valid; no deletion quota exists.

Use four competing perspectives, not four separate reports: the **maintainer** asks what can disappear; the **invariant reviewer** asks what must survive; the **performance reviewer** asks what work is actually required; the **API consumer** asks what the next developer must understand, coordinate, and wait for. Resolve disagreements with the supported constraints and inspected evidence, not an average score.

## Authority, composition, and inputs

This is a read-only review. Do not modify audited code, tests, specs, configuration, generated sources, or gate state. Audit permission does not authorize implementation or deletion. Use the existing repository; preserve parallel work. The orchestrator owns final acceptance and any report persistence.

Read the actual governing `AGENTS.md` / `CLAUDE.md` and applicable scoped contracts. They own routing, approval, custody, proof obligations, and completion. Do not assume section numbers or runtime rules from another repository. Preserve an explicit caller restriction; report a material conflict rather than silently expanding authority.

**Default composition once this audit is selected:** apply `$audit-ai-code-accretion` to the same declared outcome and causal boundary, including focused correctness, merge-safety, and performance reviews. This is a required structural pass, not a requirement to spawn another agent. A caller explicitly requesting only a named specialist remains with that specialist. An explicitly limited terminal handoff stays limited; return findings to its existing owner without a rival report.

- The accretion specialist owns its definitions, consumer checks, justification-island method, classifications, and report card. Read and apply its actual instructions; do not clone its rubric here. Use its supported `CHANGESET`, `JOURNEY`, `SUBSYSTEM`, or repository-sweep mode to match actual coverage. Embed its evidence in this report; use an `EMBEDDED` interface only when the installed skill defines one.
- When the inspected boundary contains Three.js / Rapier per-frame or per-tick work, apply `$code__threejs-rapier-performance` as the domain static guard. Its evidence feeds this review; it does not independently set release severity.
- Other specialist reviews are selected by a material domain uncertainty or an explicit request, not by listing every installed skill. Record what each applied lens resolved.
- If a required specialist cannot be resolved, state the missing coverage. Continue the analysis supported by available evidence; never claim the specialist ran, reconstruct its private rubric, or issue an unqualified acceptance over its unreviewed material boundary.

Independent reviewers receive the candidate code/diff, repository location, supported outcomes, constraints, relevant proof, and explicit exclusions—not the author's trajectory or preferred verdict. Treat any supplied diagnosis as a hypothesis. Independent review requires an actually independent reviewer context; applying multiple lenses in one context is not independent corroboration.

## Establish the boundary from behavior

Begin with the user or engineering outcome, real entrypoints and consumers, supported operating conditions, terminal truth, and nearby behavior that must survive. For a changeset, identify the base/candidate and distinguish changed, affected, and pre-existing code. For a journey or subsystem audit, review the existing system without pretending every finding is a new regression.

Trace the normal path and materially distinct failure, recovery, concurrency, migration, or lifecycle paths. Identify authoritative state, derived representations, mutation points, I/O, trust boundaries, and existing mitigations. Inspect current proof and its blind spots.

**The diff is an entry point, not a fence.** Follow an implicated mechanism to its owner, consumers, generators, configuration, and proof—even across modules—when that can change the diagnosis or enable removal of the chain. State why the added slice is relevant. Broader read-only investigation is encouraged when it resolves that question; unrelated repository cleanup is not. Respect explicit exclusions and separately identify any excluded dependency that prevents a conclusion.

Stop expanding when material chains terminate in evidenced requirements and the remedy's consumers and obligations are accounted for. Do not stop merely because the right owner is outside the diff; do not keep expanding merely because more code exists.

Label consequential claims **FACT**, **INFERENCE**, **ASSUMPTION**, or **UNKNOWN**. Cite exact current files, symbols, and useful line ranges. Distinguish finding confidence from coverage confidence. Missing evidence is a specific uncertainty, not proof of absence or permission to invent a cause.

## Find the cause-eliminating alternative

Apply the accretion specialist's cluster analysis before settling material remedies. Look especially at guards, retries, reconcilers, caches, fallback paths, flags, adapters, repeated conversions, and test scaffolding. These are investigation cues, not evidence of waste.

For each material cluster, establish:

1. **The external obligation.** Which supported outcome, real consumer, trust boundary, invariant, recovery scenario, compatibility commitment, or performance constraint requires the behavior? “C calls B” establishes dependency, not purpose.
2. **The creating decision.** Which ownership, representation, lifecycle, API, or capability choice makes this particular machinery necessary? Name the invariant and its enforcement point before asserting root cause. Do not invent a historical patch sequence from current structure.
3. **The surviving design.** Could the owning boundary produce the outcome directly, reuse an existing mechanism, remove an unsupported capability, derive state, or collapse the cluster? Name the owner, path, and obligations that remain.
4. **The counter-case.** What is the strongest evidenced reason to retain the current design? What fact would reverse the simplification? Check actual consumers and failure semantics, not just static references or passing mechanism-pinned tests.

Integrate the result into the defect's remedy. Do not recommend another downstream guard while relegating the owner-level fix that eliminates it to an unrelated cleanup note. Group symptoms with the same established cause into one finding and one repair sequence.

**Constructed contrast:** A duplicates independently writable state; B reconciles drift; C retries B; D deduplicates C. Each component may be necessary given A. Investigate whether A's independent ownership is required. If one owner can enforce the contract, recommend that convergence and identify B/C/D that disappear. If offline writes or a real distributed contract require reconciliation, keep the needed mechanism and improve it on those terms.

When several causes fit the evidence and imply different remedies, state the fork and the smallest decisive inspection or experiment. Do not choose the cause that produces the most satisfying deletion story.

## Inspect work and developer friction

### Runtime performance

Start from useful work per supported outcome. Inspect operation counts, collection bounds, frequency, fan-out, allocation, retention, repeated I/O, serialization, scheduling, synchronization, and crossings of expensive boundaries. Separate initialization from repeated execution and worst-case supported input from speculative future scale.

Prefer eliminating work, redundant traversals, conversions, or synchronization before adding caches, queues, workers, pools, or parallelism. Validate semantic equivalence: removing polling may lose recovery, sharing a result may violate freshness, and moving work off a hot path may increase latency elsewhere.

- Source can prove duplicated or avoidable work without a benchmark. State exactly what work disappears and what assumptions the equivalence requires.
- Source cardinality is not elapsed time. Do not convert “two scans become one” into a claimed frame-rate or end-to-end speedup.
- Measure when choosing between designs depends on latency, throughput, memory, contention, GC, I/O, or a stated budget. Request the representative workload and smallest discriminating measurement, not an automatic benchmark project. Label estimates and unmeasured effects.
- A cache, index, projection, or specialized data structure can earn its additional state through a concrete constraint. Removing it is not simplification if it breaks that constraint or transfers disproportionate work elsewhere.

### Developer experience

Trace a relevant developer task through the changed boundary: using the API correctly, adding a supported variant, changing a policy, reproducing a failure, or running the useful feedback loop. Find the actual ownership and coordination burden.

Prefer interfaces that make the normal operation obvious, carry necessary context explicitly, localize dangerous decisions, and make misuse difficult. Look for hidden call ordering, flags standing in for domain decisions, scattered registrations, repeated policy edits, pass-through navigation, non-actionable failures, and unrelated setup required for a focused check.

Name the task and the burden removed. “One canonical declaration replaces three manually synchronized registrations” is evidence-grounded; “more elegant” is not. Do not invent elapsed developer time or productivity gains. Documentation may preserve a non-obvious reason; it must not substitute for repairing a needlessly confusing API or control flow. A rename is material when it resolves demonstrated ambiguity or misuse, not because the reviewer prefers another noun.

## Choose the maintained result

Compare the current shape, the credible cause-eliminating alternative, and a local repair only when it is a real contender. Do not manufacture an option matrix for trivial changes.

For material recommendations, explain what disappears, what remains, what is introduced, which behavior is preserved, and the consequential tradeoff. Evaluate one-time change risk and continuing runtime, maintenance, operational, and developer costs separately. **A simplification's positive value is its justification; it does not need an invented failure scenario. New machinery does need a concrete reason that a simpler alternative fails.**

Prefer deletion, direct ownership, consolidation, or an existing capability when they satisfy the constraints. This is a reasoning order, not a mandatory operation or a ban on new code. Keep a useful abstraction when it hides a volatile or dangerous decision. Reject an abstraction that merely renames calls or centralizes unrelated policy. Do not introduce a generator, registry, coordinator, or validation framework simply to remove modest duplication.

More investigation is preferable to preserving a knowable wrong design. Incremental, behavior-preserving steps can still be the safest route to the lasting shape. A broad rewrite must demonstrate why incremental convergence is materially worse; ambition and lack of deadlines do not establish that.

### Deletion and retirement

Before recommending removal, account for supported static, dynamic, configuration-driven, persisted, and external consumers using the specialist's evidence rules. A clean text search proves only the search performed. Unknown public consumers prevent an unconditional deletion claim; they do not automatically justify another compatibility layer.

For every material removal or collapse, identify the supported outcome and protections that remain, existing faithful proof, any decisive proof gap, and the actual evidence required to close it. Protect behavior and invariants, not obsolete internal choreography. Retarget or remove mechanism-pinned tests when appropriate; do not delete needed outcome coverage or create tombstone tests merely to celebrate missing symbols.

Where safe migration requires coexistence, name the lasting owner/path, migration obligation, remaining consumers, removal condition, and temporary flags, adapters, workers, tests, or tooling that must retire. Sequence by dependency and risk, not imagined dates. A genuinely permanent compatibility contract stays; not every old path is temporary.

**Replacement is not retirement.** Do not call a simplification complete while its removable old implementation and cleanup machinery remain. Every intermediate step should move toward the lasting design, not create another fallback to preserve the wrong one.

## Calibrate risk without lowering the quality bar

Release risk and design acceptance answer different questions. A material simplification can warrant rework without being a P1. A structural grade or an unverified assumption never establishes P0, P1, or `NO-SHIP`.

For a defect, establish the concrete supported trigger, violated contract, impact and exposure, existing mitigations, change attribution, evidence confidence, and remedy. For a performance claim, separate inspected work structure from measured budget or outcome impact. For a design finding, establish current avoidable burden, the faithful alternative, its counter-case, and the concrete benefit—not a hypothetical outage.

A design finding is material when inspected evidence shows an avoidable independent concept, recurring coordination or change burden, meaningful unnecessary work, misuse risk, or operational obligation, and a credible alternative improves it without sacrificing a supported constraint. A stylistic preference, fewer lines, or a tiny unmeasured allocation alone does not establish that bar.

| Risk class | Admission |
| --- | --- |
| **P0** | Strong evidence of a currently reachable path to catastrophic compromise, broad data corruption/loss, or service-wide outage. |
| **P1** | Strong evidence that a supported journey or ordinary operating condition materially breaks the declared outcome, security, integrity, or reliability contract. In a changeset, the change introduces, worsens, exposes, or directly depends on the defect. |
| **P2** | Substantiated defect with limited impact, material mitigation, low exposure, or insufficient change attribution to block this release. It can still require design rework. |
| **Advisory** | Worthwhile context, an accepted tradeoff, or explicitly requested hypothetical/future hardening. Not a home for a demonstrated material design defect merely because it is non-blocking for release. |
| **Needs validation** | A material conclusion depends on an unverified premise. State the discriminator and how its results would change the recommendation. |

Three or more genuinely independent rare conditions normally cap a defect at P2 unless the evidenced consequence is catastrophic. Do not multiply correlated events or call ordinary retries rare. Existing mitigations reduce risk even when imperfect; state residual risk. Pre-existing debt does not block a changeset unless worsened, newly exposed, or necessary to its supported outcome. It can still justify causal design rework within the inspected boundary.

Do not invent a timing impact, hotspot, traffic level, deployment topology, incident, or test result. Absence of a benchmark does not hide statically provable redundant work or an independently established violation; it limits quantitative performance claims. Do not prescribe a service, queue, distributed lock, lease, fence, or consensus mechanism without a real requirement that simpler ownership cannot satisfy.

Deep adversarial or future-topology hardening is explicit opt-in. “S-tier,” “thorough,” and “production-ready” do not by themselves authorize speculative infrastructure. Greater depth improves evidence; it does not inflate severity.

## One report, one action plan

Lead with the recommendation. Preserve both judgments explicitly:

- **Recommendation — `ACCEPT`, `REWORK`, or `NEEDS VALIDATION`.** `REWORK` means a substantiated defect or material design shortfall has a concrete warranted correction, including a demonstrated simplification, avoidable runtime burden, or developer-journey problem. Do not relabel that work “later” because release safety permits shipping. `NEEDS VALIDATION` means an unresolved material question prevents acceptance and no already-proven issue establishes rework. `ACCEPT` requires sufficient coverage and no remaining material correction justified by evidence; it is scoped, not a claim of global optimality.
- **Release risk — `SHIP`, `SHIP WITH NOTES`, or `NO-SHIP`.** `NO-SHIP` requires a substantiated P0/P1. `SHIP WITH NOTES` has no such blocker but has meaningful issues or uncertainty. `SHIP` has no substantiated blocker and only trivial or informational notes. These labels classify demonstrated release risk; they do not independently grant design acceptance, authorize deployment, or prove an uninspected boundary safe.

A result such as **`REWORK` / `SHIP WITH NOTES`** is coherent: no substantiated release blocker, but the implementation is not yet the design to accept. Explain the exact gap. The orchestrator makes the final decision; this report does not alter another gate's authority.

Use readable Markdown, omit empty sections, and expose conclusions and decisive evidence rather than a reasoning transcript. Include:

1. **Recommendation and context:** the two judgments, supported outcome, exact boundary, applied lenses, coverage confidence, exclusions, and material blind spots. Lead with the strongest finding or positive keep-case, not an issue count.
2. **Findings:** group by root cause. Each material item needs exact evidence, epistemic status/confidence, burden or impact, strongest keep-case, preferred maintained shape, and proof that closes it. Defects additionally need trigger, mitigations, attribution, and calibrated risk class. Design findings state whether they require rework. Do not repeat one finding in multiple sections.
3. **Accretion evidence:** preserve the specialist's structural disposition, coverage, smallest faithful shape, deletion dividend, what must remain, and required report-card elements according to its actual mode. Integrate or cross-reference shared findings rather than duplicating them. No second ship verdict and no averaged grade.
4. **Validation or important rejected alternatives:** include only uncertainty or a tempting rejected remedy that changes the next decision. A validation item names its discriminator; a rejected remedy names why it loses.
5. **Action plan — final section:** order by safety, causal dependencies, and maintained-system value. For each action, name target, final owner/path, what disappears or is introduced, behavior preserved, proof, and material change risk. Include a retirement condition when transitional machinery is involved. Deduplicate specialist and defect actions. Do not split implementation, deletion, and required proof into unrelated cleanup projects.

A short clean audit may be a few paragraphs. Never truncate material findings to meet an arbitrary count. Keep a large audit decision-focused rather than printing an exhaustive smell inventory. Do not output implementation patches or long code blocks; a short quotation is sufficient for evidence.

Return findings inline or to the calling handoff. When a durable standalone report is requested or required, the orchestrator persists one canonical `tmp/<datetime>__<slug>__code-audit/report.md` and returns its actual path. Embedded specialists create no rival durable report.

## Failure anchors

- **Patch staircase:** improving B/C/D while leaving avoidable A untouched → compare the cause-eliminating design before choosing a remedy.
- **Small-diff bias:** accepting another flag because the owner-level change touches more files → optimize the maintained result.
- **Ship-now bias:** demoting warranted rework because it is not P1 → separate release risk from quality acceptance.
- **Deletion theater:** removing safeguards, useful caches, or real compatibility → preserve the forcing contract and prove the smaller faithful alternative.
- **Cleanup accretion:** adding a framework to simplify a cluster → apply the same necessity test to the proposed repair.
- **Evidence inflation:** converting static work counts, passing tests, or specialist agreement into runtime or terminal proof → state only what the evidence establishes.
- **Scope evasion or drift:** stopping at the diff, or chasing the whole repository → follow the material causal boundary and state coverage.
- **Paper simplicity:** fewer lines but more hidden knowledge, runtime work, or external machinery → count obligations, not appearances.

**Close on the lasting shape: what no longer needs to exist, what must remain, and what evidence distinguishes them.**

## Reference

- [Calibration examples](references/calibration-examples.md) — read when a remedy involves a compensation chain, apparent duplication, performance-sensitive state, compatibility retirement, or a conflict between release safety and design acceptance.
