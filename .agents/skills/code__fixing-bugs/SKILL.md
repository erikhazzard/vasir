---
name: code__fixing-bugs
description: Bug-fixing protocol — turns a defect into an executable journey contract: failing reproduction at the real port (watched-red), evidence-led fault localization, minimal fix, durable guardrails. Triggers on any defect, regression, or failure report; flaky/heisenbug hunts; replay or kernel divergence; before patching production code for a bug.
---

# Fixing Bugs — The Journey Contract

Bugs are contract breaches, not broken functions: players don't feel broken functions — they feel broken flows. The job is to name the single user outcome that is breached, encode it as an executable contract that fails on the unpatched code, make the smallest fix that satisfies it, and leave the system harder to break than before. We are not proving math; we are proving that people get what they came for.

**Place in the system.** Bug fixing is watched-red's home turf (root §5): the reproduction *is* a proof gate with `potency: watched-red`, and the fix *is* the `Red captured → Objectively Green` transition with both artifacts recorded. Substantial bugs (contract/state/security/hot-path/migration surfaces, cross-lane, or an unknown boundary — the C-tags in `$code__enforcing-principles` decide) run through the triad: the gate is designed, the red captured, the fix turns it green, and the eval plan keeps the evidence. Quick bugs (root §4) use this discipline inline, with the failing→passing runs captured in the close-out. A hunt that turns multi-hypothesis — ruled-out causes, misleading signals, cross-lane evidence — owes the diagnosis brief and a postmortem (root §6). Test shape, the integration-test definition, the double-fidelity ladder, and the contract vocabulary live in `$code__enforcing-principles` and are not restated here.

---

## The Journey Contract (write before touching code)

**Required for every bug:**
- **Actor + Goal:** who is harmed; what outcome is broken.
- **Port:** the real entry point the repro will drive — API route, message topic, SDK method, CLI/job, kernel tick sequence, UI action. Never internal functions.
- **Trigger → Expected → Actual:** the breach, one line each.
- **Disallowed outcomes:** observable harms beyond the reported symptom — data loss, duplicate side effects, stale state, silent corruption.
- **Proof points:** what the test will assert; what telemetry would catch this in production.

**Required only when the bug touches a pipeline, queue, or stateful flow:** name *only* the relevant guarantees from the protocol's contract vocabulary — delivery, idempotency, ordering, atomicity/ack ordering, isolation, recovery, time bounds. Omit the rest; never scaffold with N/A.

If you can't fill the required fields clearly, you don't understand the bug yet — go read logs and code, or request the missing evidence.

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

## Test Selection (commit to one, smallest faithful scope)

1. **Contract-verification** — a provider must meet a consumer contract; execute real requests at the real service boundary.
2. **Service integration** — drive one service via its real interface with real backing services.
3. **Workflow integration** — minimal set of services needed to reproduce; assert at the journey boundary.
4. **Journey E2E** — rarest; only when the breach exists solely through the full user surface.

Pick the lowest scope that still (a) drives the real port, (b) reproduces the breach, (c) asserts outcome + invariants, (d) stays deterministic. Never default to E2E; never bypass the port to call internals. The integration-test definition and the double-fidelity ladder that serves it live in `$code__enforcing-principles`. Kernel and replay bugs reproduce in the simulation harness first (fast loop, root §5); the browser is the authority environment only when presentation is implicated.

---

## Hard Rules

1. **Red before fix.** No production edit until a failing test reproduces the breach at the port — and fails *for the right reason* (a missing-API red proves nothing). Capture the red: it exists only before the fix lands (root §5); on a lane, that is the gate's `Red captured` artifact.
2. **No imaginary semantics.** Assertions are externally observable — response, persisted state, emitted events, queue outcomes. Never assert internal calls, log lines, or timing quirks; never certify behavior that cannot happen in production.
3. **Real dependencies, honest exceptions.** Real local backing services by default (the fidelity ladder decides); backend selection resolves through the repo's canonical seam (root §2), never ad-hoc test wiring. For a true third-party dependency: move the boundary to the nearest port you control, test that contract faithfully, and state explicitly which semantics are covered vs. deferred.
4. **Determinism over drama.** No sleeps — bounded polling with explicit deadlines. Seed randomness, control time, use barriers/latches for concurrency. Isolate state (unique ids/namespaces); teardown always runs.
5. **Minimal fix, one path** (root §9). The smallest change that satisfies the contract. Never "fix" by widening timeouts or adding generic retries unless the contract requires it and the test proves it. Refactor only after green, only where it increases durability, never as drive-by cleanup (root §8).

---

## Diagnosis Discipline (no narrative debugging)

- **Attribute before fixing** (root §3): an environment artifact "fixed" as a product bug is a wasted lane.
- Separate **verified facts** from **hypotheses**; every hypothesis carries its falsifier — what observation would disprove it. Name the **difference to explain**: what differs between the working and failing cases.
- Locate the fault line with evidence — confirm pre/postconditions at boundaries, rule alternatives out with falsifiers; don't feel your way.
- **Minimize after red** (delta-debugging): shrink payloads, remove setup, reduce steps; reduce concurrency to the minimal pattern that still fails, or prove the race is required. The final test is the minimal failing trigger plus the critical assertions.
- When the hunt earns it (several ruled-out causes, misleading symptoms), write the diagnosis brief while the context is alive — the postmortem route (root §6) owns preserving it.

---

## Special Bug Classes

- **Concurrency / distributed / async:** the reproduction must contain the race or fault — parallel calls, concurrent messages, worker restart, retry delivery, crash mid-flight. Deterministic concurrency (barriers, latches, bounded deadlines); assert invariants over outcomes (no duplicates, no early ack, no partial commit), never "the timing happened to work."
- **Performance regressions:** prefer **structural cost invariants** over wall-clock — bounded external calls ("no N+1: query count ≤ N"), bounded allocations, bounded payload sizes. A true wall-clock contract becomes a measurement-first gate via the eval plan (controlled workload, warmup, statistical threshold, non-default lane) — never a single fragile timing in default CI.
- **Replay / kernel divergence** (this repo's signature class — root §2): the reproduction is a recorded seed + tick-indexed intents through the simulation harness, asserting at the restore boundary **and** a later checkpoint or final hash — final-state-only equality hides reconverged drift. Watch for the guardrail signals (`[idv deterministic math] Redirected Math.*`, `DET_NONDETERMINISM_FORBIDDEN_API`): they localize the illegal callsite. The fix never relaxes determinism; presentation-only nondeterminism escapes exist solely per root §2's list.
- **Heisenbugs:** first make the system reproducible — seed, freeze time, add barriers, minimize. If still irreproducible, fail closed: no guessing, no patching. Output the best-known journey contract plus the exact missing inputs (payloads, call/message sequence with concurrency, env/config, versions/commits, correlated logs/traces, data fixtures, timing constraints) and the specific instrumentation needed to capture them.

---

## Guardrails After Green

Cover the same contract's nearby failure modes — same journey, different input — as additional assertions in the same test or one tightly related test of the same scope; keep the surface tight (root §5's nearby non-regression names what was covered vs. inferred). Contract-first test names, always:

- `does_not_acknowledge_message_until_side_effects_committed`
- `delivers_purchase_receipt_once_for_idempotency_key`
- `rejects_invalid_payload_without_poisoning_queue`
- `replays_identically_across_restore_boundary_and_final_hash`

---

## Done (bug-specific instance of root §5's checklist)

- The reproduction went red on unpatched code and green after the fix, with **both** artifacts recorded — on a lane, the gate's `Red captured` → `Objectively Green` with `last_run`; on a quick bug, the failing and passing runs in the close-out.
- Every contract invariant maps to a specific assertion enforcing it; explicitly deferred semantics are named, not implied.
- The test is CI-ready: deterministic, isolated, bounded runtime — and the exact commands for the single test and the relevant suite are recorded.
- Close-out per root §5, plus the protocol's two additions: commands not run, and reviewer focus.