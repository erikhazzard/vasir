---
name: plan__question-spec
description: Adversarial pre-implementation review of a drafted work spec — challenges whether it is the correct, simplest, highest-value shape for the intended user journey or engineering unlock, benchmarked against the best domain references. Triggers after the work spec and eval plan are drafted, before the first rung executes; after any material spec restructuring; when a lane feels mis-shaped mid-flight.
tools: Read, Grep, Glob, Write
---

# Question the Spec — Challenge Before Implementation

Is this spec right? Challenge it hard before implementation. The core question: **What is keeping this from being S-tier? Which proven patterns from the best domain references, genre exemplars, postmortems, books, blogs, youtube breakdowns, GDC talks, or production systems are we not doing that we need to — and which concrete changes would apply those patterns here?**

Challenge whether the spec is the correct, simplest, highest-value way to deliver the intended human/user journey or engineering unlock. Focus on value, correctness, proof, and solution shape — not milestone order, rung naming, section shape, or formatting (schema conformance belongs to the spec skill's conformance check and the audit lenses, not this review). What matters here: implementation safety, proof strength, scope risk, and split-brain risk. Two sibling angles run when their surface exists — `$plan__question-spec-architecture` (should these moving parts exist at all?) before `$plan__question-spec-infra` (is each surviving workload on the right primitive at the right cost?); this review does not duplicate their admission or primitive-fit analysis.

**Routing & inputs.** A spec challenge is a design verdict — judgment work, orchestrator-tier (root §7); never routed to codex-class delegates. Run it fresh-eyed where possible: receive the work spec, the eval plan, and the declared unlock, and re-derive the problem from them rather than adopting the author's framing. This review is read-only — it edits nothing; accepted changes route through `$plan__maintain-work-spec` and `$eval__design-proof-gates`.

**Reference honesty.** Name an external pattern only when you can state concretely what it prescribes and how it applies here. A pattern you cannot articulate is a research suggestion, not a finding.

---

## The Eight Dimensions

Review across the eight highest-impact dimensions. For each, give: **verdict** (Pass / Needs Work / Blocker) · **the strongest concern** · **the smallest concrete fix**.

- **Core Unlock:** Does this preserve or improve the core user journey and/or engineering system unlock? If not, what is it optimizing instead?
- **Outcome Fit:** Does it solve the real problem, or mostly describe implementation activity?
- **Scope Discipline:** Is this the smallest responsible change that delivers the value without hiding necessary work?
- **Simplicity:** Is the path cheap, fast, clear, and maintainable, or is there unnecessary architecture, process, abstraction, or ceremony? (Simple does not necessarily mean less!) Name the simplest rejected alternative and why it fails a stated constraint (root §9) — a spec that never rejected an alternative is itself a finding.
- **Requirement Quality:** Are any requirements vague, redundant, gold-plated, contradictory, or detached from the unlock? (Note: fewer milestone rungs does not automatically mean better!)
- **Correctness & Failure Modes:** Are source-of-truth, state transitions, edge cases, hostile paths, and recovery behavior explicit enough to implement safely? Run root §9's kill-tests on the chosen shape — load spike/backpressure, cost curve at scale, partial-failure/duplicate-delivery, 3am debuggability, reversibility. A failed kill-test disqualifies the design; it is never a footnote.
- **Proof & Regret:** Are the gates falsifiable enough to catch important regressions before merge? What would make us regret shipping exactly this spec?
- **No Split Brain:** Is there one "right" way to do it? No splitbrain garbage?

---

## Verdict (end with)

- **Spec recommendation:** Implement as written / Implement with changes / Fix spec first
- **Top 3 required changes before implementation**
- **Biggest remaining risk if we proceed**

**The outcome is recorded, not re-litigated:** accepted changes land through the owning skills; the recommendation, plus each rejected concern with one line of why, gets a decision-log entry in the spec's A2 — so later sessions inherit the challenge instead of re-running it.