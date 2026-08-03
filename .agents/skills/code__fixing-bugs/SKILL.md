---
name: code__fixing-bugs
description: >-
  Fixes defects through the escaped user or system boundary, using the cheapest faithful reproduction that is feasible and a focused post-fix check.
  Trigger: confirmed defects, regressions, flaky/heisenbug hunts, or replay/kernel divergence; not speculative hardening or new behavior.
---

# Fixing Bugs — The Journey Contract

Bugs are contract breaches, not broken functions: players feel broken flows. Name the breached user/system outcome, reproduce it faithfully at the escaped public boundary when feasible, make the smallest fix, and check that same outcome now works. The reproduction may be an existing check, temporary script, replay, literal request, log-correlated action, controlled manual action, or durable test; test creation is a separate decision.

**Place in the system.** This skill owns defect reproduction, evidence-led localization, the minimal fix, and the focused post-fix result. It never creates a durable test, eval plan, harness, raw bundle, or postmortem merely because a bug exists. Use `$testing__enforcing-mandate` only when tests will change or durable-retention judgment is genuinely non-obvious. Preserve a postmortem only when the user asks or the multi-hypothesis diagnosis would be materially expensive or dangerous to re-derive.

---

## The Journey Contract

For a simple bug, actor, port, and Trigger → Expected → Actual may be one compact sentence. Expand only when the diagnosis needs it:

- **Actor + Goal:** who is harmed; what outcome is broken.
- **Port:** the real entry point the repro will drive — API route, message topic, SDK method, CLI/job, kernel tick sequence, UI action. Never internal functions.
- **Trigger → Expected → Actual:** the breach, one line each.
- **Disallowed outcomes:** add only material harms beyond the symptom — data loss, duplicate side effects, stale state, silent corruption.
- **Proof points:** the public observation that shows the defect and the focused post-fix result.

**Required only when the bug touches a pipeline, queue, or stateful flow:** name *only* the relevant guarantees from the protocol's contract vocabulary — delivery, idempotency, ordering, atomicity/ack ordering, isolation, recovery, time bounds. Omit the rest; never scaffold with N/A.

If actor, port, and breach are unclear, inspect logs/code or request the missing evidence before guessing.

```md
Example — avatar not rendering after match join:
- Actor + Goal: player expects their custom avatar visible on match join.
- Port: MatchLobby.onPlayerJoin() client callback.
- Trigger: join with a custom avatar equipped.
- Expected: avatar mesh loads and renders within 2s. Actual: default avatar; asset never requested.
- Disallowed: crash, stale avatar from a previous match, invisible player.
- Proof: asset request fired for the correct avatar ID; render callback invoked; visual capture matches.
(No pipeline semantics — this is a client asset-loading bug.)
```

---

## Reproduction Selection (commit to one smallest faithful seam)

Choose the lowest seam that drives the real port, reproduces the breach for the intended reason, observes outcome/invariants, and stays deterministic: existing failing check; literal API/CLI/job request; replay or simulation; temporary script; controlled manual user action with correlated terminal evidence; contract/service/workflow integration; journey E2E only when the defect exists solely there. Never default to E2E or bypass the port to call internals. Kernel/replay bugs use the simulation harness first; the browser is authority only when presentation/browser semantics are implicated. Record whether the reproduction is temporary or proposed for durable retention.

---

## Hard Rules

1. **Watched-red when feasible and safe.** Before the fix, prefer the smallest deterministic action that drives the escaped port and fails for the intended reason. A missing-API or broken-harness red proves nothing. If the escaped failure is already directly observed but cannot be reproduced safely or deterministically without disproportionate machinery, preserve that exact observation, make the smallest evidence-backed fix, and run the strongest focused post-fix check available. Do not build a harness merely to satisfy ordering.
2. **No imaginary semantics.** Assertions are externally observable — response, persisted state, emitted events, queue outcomes. Never assert internal calls, log lines, or timing quirks; never certify behavior that cannot happen in production.
3. **Real dependencies, honest exceptions.** Real local backing services by default (the fidelity ladder decides); backend selection resolves through the repo's canonical seam (root §2), never ad-hoc test wiring. For a true third-party dependency: move the boundary to the nearest port you control, test that contract faithfully, and state explicitly which semantics are covered vs. deferred.
4. **Determinism over drama.** No sleeps — bounded polling with explicit deadlines. Seed randomness, control time, use barriers/latches for concurrency. Isolate state (unique ids/namespaces); teardown always runs.
5. **Minimal fix, one path** (root §9). The smallest change that satisfies the contract. Never "fix" by widening timeouts or adding generic retries unless the contract requires it and the test proves it. Refactor only after green, only where it increases durability, never as drive-by cleanup (root §8).
6. **Preserve the causal scar** (root §9). When a non-obvious fix leaves a reasonable-looking change that would reopen the escaped failure, put the required causal-history comment beside the surviving constraint before close-out.

---

## Diagnosis Discipline (no narrative debugging)

- **Attribute before fixing** (root §3): an environment artifact "fixed" as a product bug is a wasted lane.
- Separate **verified facts** from **hypotheses**; every hypothesis carries its falsifier — what observation would disprove it. Name the **difference to explain**: what differs between the working and failing cases.
- Locate the fault line with evidence — confirm pre/postconditions at boundaries, rule alternatives out with falsifiers; don't feel your way.
- **Minimize after red** (delta-debugging): shrink payloads, setup, and steps; reduce concurrency to the minimal pattern that still fails, or prove the race is required. Preserve the minimal trigger and critical public observations; encode them as a durable test only when the stable regression risk warrants it.
- When the hunt exposes several ruled-out causes or misleading signals, preserve the compact diagnosis facts in the work spec; create a postmortem only when the user asks or re-deriving the diagnosis would be materially costly or dangerous.

---

## Special Bug Classes

- **Concurrency / distributed / async:** the reproduction must contain the race or fault — parallel calls, concurrent messages, worker restart, retry delivery, crash mid-flight. Deterministic concurrency (barriers, latches, bounded deadlines); assert invariants over outcomes (no duplicates, no early ack, no partial commit), never "the timing happened to work."
- **Performance regressions:** prefer **structural cost invariants** over wall-clock — bounded external calls ("no N+1: query count ≤ N"), bounded allocations, bounded payload sizes. A true wall-clock contract becomes a measurement-first gate via the eval plan (controlled workload, warmup, statistical threshold, non-default lane) — never a single fragile timing in default CI.
- **Replay / kernel divergence** (this repo's signature class — root §2): the reproduction is a recorded seed + tick-indexed intents through the simulation harness, asserting at the restore boundary **and** a later checkpoint or final hash — final-state-only equality hides reconverged drift. Watch for the guardrail signals (`[idv deterministic math] Redirected Math.*`, `DET_NONDETERMINISM_FORBIDDEN_API`): they localize the illegal callsite. The fix never relaxes determinism; presentation-only nondeterminism escapes exist solely per root §2's list.
- **Heisenbugs:** first make the system reproducible — seed, freeze time, add barriers, minimize. If it remains irreproducible, report `Diagnosis: UNRESOLVED — no mutation made`, never a pass or a successful fix: do not guess and do not patch. Keep the product claim `RED` when the escaped defect is directly evidenced, otherwise `UNVERIFIED`; an unresolved diagnosis does not erase known harm or invent proof. Preserve the best-known journey contract and escaped observation; list the exact missing inputs (payloads, call/message sequence with concurrency, env/config, versions/commits, correlated logs/traces, data fixtures, timing constraints), the specific instrumentation needed to capture them, and the recovery owner/next action that can make another attempt evidentially meaningful.

---

## Durable Retention After Green

Invoke `$testing__enforcing-mandate` only when tests will change or the durable-retention choice is materially non-obvious. It may reuse or tighten an existing guard, add one durable journey-shaped test, or choose no durable test when the temporary reproduction plus existing evidence is sufficient. Nearby failure modes are added only when they protect the same plausible material harm. When a test is warranted, contract-first names remain preferred:

- `does_not_acknowledge_message_until_side_effects_committed`
- `delivers_purchase_receipt_once_for_idempotency_key`
- `rejects_invalid_payload_without_poisoning_queue`
- `replays_identically_across_restore_boundary_and_final_hash`

---

## Done (bug-specific instance of root §5's checklist)

- When feasible, the same faithful reproduction went red before the fix and green after it. Otherwise the exact escaped observation and strongest focused post-fix check are both recorded with their limitation.
- Every claimed invariant maps to a public observation; deferred semantics are explicit.
- When durable retention needed a decision, record `reuse | tighten | add | no durable test` and why. Any changed test is deterministic, isolated, bounded, and run with its relevant command.
- Update the work spec only when the diagnosis changes a durable contract, blocker, rung boundary, or claim boundary. Harness defects are not product red.
- Close-out per root §5, including commands/actions not run and reviewer focus.
