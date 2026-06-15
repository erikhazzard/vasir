---
name: plan__question-spec
description: Use immediately before implementing a work spec
---
Is this spec right? Challenge it hard before approval.

Review it across the 8 highest-impact dimensions below. For each one, give:
1. verdict: Pass / Needs Work / Blocker
2. the strongest concern
3. the smallest concrete fix

- **Core Unlock:** Does this preserve or improve the core user journey and/or engineering system unlock? If not, what is it optimizing instead?
- **Outcome Fit:** Does it solve the real problem, or mostly describe implementation activity?
- **Scope Discipline:** Is this the smallest responsible change that delivers the value without hiding necessary work?
- **Simplicity:** Is the path cheap, fast, clear, and maintainable, or is there unnecessary architecture, process, abstraction, or ceremony? (simple does not necessarily mean less!)
- **Requirement Quality:** Are any requirements vague, redundant, gold-plated, contradictory, or detached from the unlock? (Note: Less milestone rungs does not automatically mean better!)
- **Correctness & Failure Modes:** Are source-of-truth, state transitions, edge cases, hostile paths, and recovery behavior explicit enough to implement safely?
- **Proof & Regret:** Are the gates falsifiable enough to catch important regressions before merge? What would make us regret shipping exactly this spec?
- **No Split Brain**: Is there one "right" way to do it? No splitbrain garbage?

End with:
- **Approval recommendation:** Approve / Approve with changes / Do not approve
- **Top 3 required changes before implementation**
- **Biggest remaining risk if we proceed**