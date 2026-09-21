---
name: code__fixing-bugs
description: Diagnoses and repairs bug. Use when fixing bugs, regressions, intermittent failures
---

# Fixing Bugs

**Restore the breached contract, not merely a green check. Reproduction strengthens evidence; it is not permission to fix.**

A bug is a broken user or system outcome. Locate its cause, make the simplest complete repair, and verify that outcome without suppressing legitimate behavior. Minimize lasting complexity, not just the number of changed lines.

**Place in the system.** This skill owns diagnosis, repair, and focused verification. Honor diagnosis-only requests; repair guidance does not authorize mutations beyond the task. Follow the governing repository instructions for operational authority, canonical backend selection, simulation policy, and close-out. Read any needed rule not already in context; do not infer unavailable rules or numbered sections. Missing context limits only the decisions that depend on it.

## Name the breach

For a simple bug, one sentence is enough: **actor and goal; real entry point; trigger → expected → actual**. Inspect available code, state, and traces before asking for missing evidence. Ask only when an unknown contract or fact actually changes the repair.

Add disallowed harms or protocol guarantees only when material: duplicate effects, data loss, ordering, acknowledgment after commit, isolation, recovery, or time bounds. Do not fill out a worksheet or list irrelevant guarantees.

Distinguish product, environment/configuration, dependency, and harness failures. A broken harness establishes neither product failure nor product success. If harm is ongoing or state is already damaged, apply the [containment guidance](references/special-cases.md#containment-and-damaged-state); do not assume a code fix repairs existing damage.

## Establish the cause

**Observe red when feasible and safe.** Choose the smallest faithful action through the affected real entry point: an existing check, literal API/CLI/job request, replay, temporary script, controlled manual action, integration check, or full user journey. These are alternatives, not stages to exhaust. The failure must be the reported contract breach, not missing setup or a broken harness.

Do not bypass the failed path by invoking an internal helper. A lower seam is sufficient only when it includes the causal behavior and observes the breached outcome. Use the simulation harness first for kernel/replay faults; use the browser or actual UI when presentation, browser behavior, or user-flow wiring is implicated. An asset request succeeding does not establish that the player's avatar is visible.

Preserve the relevant initial data state and execution conditions. Reuse existing fixtures, scenario setup, and canonical dependency wiring instead of creating parallel infrastructure. Once a faithful failure exists, shrink inputs and steps without removing the mechanism that makes it fail.

**Patch unreproduced defects when the evidence supports the cause and repair.** Code against a known contract, correlated traces, recorded state, or direct observations can justify a fix without recreating the original occurrence. Explain which transition violates the invariant and why the proposed change corrects it. Do not build a harness merely to manufacture a pre-fix red.

A credible competing explanation matters when it would require a different repair. In that case, gather evidence that separates the explanations; do not demand exhaustive elimination of every imaginable cause. Scale investigation to uncertainty and blast radius, not a fixed evidence quota.

When the cause remains unsupported, do not make a speculative behavior change. Identify the next discriminating fact or add narrowly scoped diagnostic instrumentation within the repository's rules. Inability to reproduce does not erase an observed defect, and a quiet rerun does not establish a fix.

### Choose experiments that change the next decision

Separate observations from explanations. Name the difference to explain between working and failing cases. For the live explanations, identify what would disprove them and choose the cheapest safe observation or intervention whose outcomes distinguish them. Predict the relevant outcomes before running it; when none fits, revisit the assumptions instead of layering on a patch.

Use known-good comparisons, boundary pre/postconditions, selective instrumentation, controlled interleavings, or regression bisection when they discriminate. Do not require a hypothesis table for an obvious defect or continue reducing a reproduction after the cause and repair are clear.

Internal logs, assertions, counters, and call traces are useful **diagnostic evidence**. They do not substitute for **acceptance evidence** at the breached boundary. The place that reveals the fault, the place that owns the repair, and the place that proves the outcome need not be the same.

*Example — supported without reproducing the incident:* the contract requires acknowledgment after commit; reachable code and a correlated operation trace establish the reverse order. Repair the ordering and check it through the real request path with a controlled delayed commit. Report that the incident itself was not replayed. An unexplained error-rate spike alone would not justify that patch.

## Make the simplest complete repair

Fix the state transition or invariant at its owner, rather than compensating at each caller. Prefer deleting an invalid branch, duplicated state, or obsolete workaround over adding another guard, retry, cache, or fallback. Remove superseded paths where they belong to this repair; preserve required behavior and compatibility.

A larger local change can be simpler than a tiny patch that adds a second mechanism. Restructure what the causal repair requires, but do not turn a bug fix into a speculative redesign. Optional adjacent cleanup waits until verification; unrelated cleanup stays out.

Never obtain green by swallowing an error, skipping required work, serializing away a required concurrency case, or silently weakening the contract. Retries and changed timeouts are repairs only when the contract and diagnosis justify them, with their relevant failure semantics checked.

**Check the valid behavior your patch could exclude.** When changing rejection, deduplication, caching, fallback, exception suppression, or early-return logic, exercise the closest legitimate case newly at risk. A deduplication fix must still permit distinct valid work; a rejection fix must still admit the adjacent valid input. Otherwise expand checks only for plausible material harm from this change—not an exhaustive neighboring-case matrix. These checks need not become permanent tests.

When a necessary, reasonable-looking constraint would be easy to remove and reopen the defect, leave a concise causal comment beside it: the failure condition and why the constraint is necessary. Do not narrate obvious code or preserve a dead workaround as a historical monument.

## Verify the outcome faithfully

Rerun the same faithful reproduction after the repair when available. Otherwise run the strongest focused post-fix check possible and state which part of the escaped failure was not recreated. Do not call an unrun check passed or a substitute check an incident reproduction.

Observe the required outcome or contract invariant: response, persisted state, emitted effect, queue result, replay state, or visible behavior. Check affected guarantees, not only disappearance of an error. Retain existing relevant checks; extend verification when the repair's reach warrants it.

Use real local backing services by default through the repository's canonical selection mechanism. If a true third-party dependency is unavailable, exercise the nearest controlled port faithfully and identify the semantics that remain unverified. Stubs or internal measurements cannot silently certify the deferred behavior.

Control nondeterminism without deleting the triggering conditions. Use seeded randomness, relevant clock control, barriers/latches, isolated state, and bounded polling with explicit deadlines—not arbitrary sleeps. Cleanup must run even when a check fails. Temporal, replay, and performance claims need the applicable evidence described in the reference below.

## Finish without manufacturing work

Use `$testing__enforcing-mandate` when tests will change or durable retention is genuinely non-obvious; read it before relying on its rules. Reuse or tighten an existing guard when sufficient. A durable test is warranted by lasting regression risk, not by the existence of a bug. A temporary reproduction plus existing coverage can be enough. If the sibling is unavailable, follow accessible repository testing rules and state only the affected limitation.

Use the existing work context. No automatic new spec, harness, eval plan, raw evidence bundle, postmortem, or mandatory report. Preserve costly-to-rederive diagnosis compactly where the work is already tracked; create a separate postmortem only when requested or when that compact record cannot preserve materially costly or dangerous findings. Persist contract or claim-boundary changes only where the repository already owns them.

Close out in the repository's normal form. Make clear what was broken, why this repair addresses it, what actions actually ran and showed, and any meaningful unchecked behavior or remaining damage. Include reviewer focus when useful. A simple repair should have a simple close-out; do not manufacture statuses, evidence tables, or empty headings.

**Missing reproduction limits the verification claim—not an evidence-backed repair. No machinery merely to satisfy a ritual.**

## Specialist reference

Read only the applicable section of [Special-case debugging](references/special-cases.md) when dealing with intermittent failures, concurrency/retries/recovery, replay/kernel divergence, performance regressions, or ongoing harm. Ordinary defects do not require the reference. It supplies diagnostic techniques, not another workflow or required artifact.
