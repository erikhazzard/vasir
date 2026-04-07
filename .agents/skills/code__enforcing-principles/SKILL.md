---
name: code__enforcing-principles
description: Enforces the engineering constitution before writing or editing any code in the repo — features, fixes, refactors, tests, scripts, migrations, infra, no exceptions. Validates user-journey framing, pipeline semantics, deterministic integration tests, failure handling, observability, safe migrations, and tail-latency proof under 10M+ msg/sec with iOS client constraints. Use when starting any code change to ensure compliance with repo-wide engineering standards and architectural guardrails. Additionally triggers on mentions of code quality or code principles
---

Before writing code, adopt this as law. It’s not style. It’s how we keep correctness, operability, and p95 latency intact at 10M+ msg/sec.

# 0) Operating Order (required for every meaningful change)

## 0.1 The required “Design Note” (put in PR description or first response before code)
Output **exactly** these sections, in this order, with bullet points:

1) **Unlocks (User Journey)**
   - This unlocks: **[user journey, one level above the feature]**
   - Within that journey, this enables: **[specific step]**
   - The next obvious user action is: **[next step]** → if we don’t support it, call it a gap.

2) **Semantics (the system contract)**
   - Delivery semantics: **at-most-once / at-least-once / effectively-once (dedupe)** (pick one)
   - Ordering: **none / per-key / total** (state key if per-key)
   - Idempotency key: **what it is, where it comes from, how long it’s valid**
   - Replay behavior: **what replay means, what is safe to replay, what is not**
   - Schema/versioning: **what changes are compatible, how we evolve**
   - Time: **serverTime vs clientTime** (assume iOS clients may be offline and clocks may drift)

3) **Failure Pre‑Mortem (top risks → mitigations)**
   - List the *top 3* catastrophic outcomes for this change (from §2.4 list).
   - For each: mitigation as **(invariant + guard + test)**. If you can’t test it, the design isn’t done.

4) **Observability**
   - Logs: what events we’ll log (and where we will *not* log to protect p95)
   - Metrics: 3–7 key metrics (latency histograms, queue depth, drops, retries, dedupe hits, error rates)
   - Tracing: span boundaries + required context propagation (traceId/correlationId)

5) **Performance Proof**
   - Is this on the hot path? **Yes/No** (if unsure, assume Yes)
   - Cost model: allocations/copies/parses/syscalls/event-loop hops you add/remove
   - Proof plan: **benchmark / profile / load test / reasoned** (must be measurable for hot-path)

6) **Tests Portfolio**
   - Required tests (see §2.2): list by name with what each asserts.
   - Flake control: how we keep tests deterministic (fixed time, bounded waits, seeded randomness).

7) **Migration Plan (if any interface/behavior changes)**
   - **Expand → Migrate → Contract** steps + deletion trigger (see §2.6).
   - Compatibility window: what versions must coexist during rollout.

Stop here if any of the above is undefined. Present options + tradeoffs; don’t “guess semantics.”

---

# 1) Non‑Negotiables (repo constitution)

## 1.1 End‑to‑end testability is the product
We ship behavior we can prove end‑to‑end.

- Every meaningful change includes at least **one deterministic integration test** that exercises: **inputs → real pipeline stages → outputs**.
- Every bug fix starts with a failing integration test (regression), then fix, then keep forever.

**Definition:** An “integration test” here means: real modules + real serialization + real async boundaries + real error paths, running hermetically in CI. If it mocks away the boundary where the bug/perf risk lives, it doesn’t count.

## 1.2 One clear way (consistency beats preference)
- Do not introduce a second way unless you are deleting the first way **in the same PR**, or you are executing a time‑boxed migration (§2.6).
- Prefer established repo patterns over clever variants.
- Consistency applies most to: **timeouts/retries**, **backpressure**, **message envelopes**, **observability**, **errors**, **config**, **async boundaries**.

## 1.3 Integrity over speed
Never ship code you wouldn’t trust with production payroll, PII, or your own money.

## 1.4 Solve the exact problem
- No drive‑by refactors. No unrelated formatting churn.
- You may propose follow‑ups, but **do not execute** them without explicit scope approval.

---

# 2) Domain Rules (the stuff that actually breaks at scale)

## 2.1 Testing Constitution (portfolio, not monoculture)

We optimize for confidence *and* fast feedback.

### 2.1.1 Test tiers (what they certify)

* **Unit tests:** pure logic; fast; no I/O. Allowed, not sufficient for behavior.
* **Component tests:** one module + real serialization + controlled doubles at hard boundaries.
* **Integration tests (required):** real pathway across async boundaries; hermetic; deterministic.
* **Contract tests:** producer/consumer agreement (schemas, status codes, CLI output, invariants).
* **End-to-end tests:** full stack (only for the highest-value journeys; keep few).
* **Invariant/fault tests (periodic or gated when semantics change):** concurrency/replay/partial failure, seeded and bounded.

### 2.1.2 When each is required

* Any behavior change: **≥1 integration test**.
* Interface/schema change: **contract tests** + migration plan (§2.6).
* Changes affecting retries/backpressure/dedupe/order: add **invariant tests** that include replay/duplication scenarios.
* Hot-path change: include a **performance regression test or benchmark** (or justify why not).

### 2.1.3 Anti-flake rules

* No sleeps for correctness. Use explicit latches/timeouts with bounded waits.
* Control time: injectable clock or test clock.
* Seed randomness; log the seed on failure.
* Tests must be hermetic: no dependence on real network, wall-clock, or shared developer state.

Example integration test style (reads like a spec):

```js
it("dedupes replayed tap events by idempotencyKey and preserves per-run ordering", async () => {
  // Given
  const input = makeTapEvent({ runId: "run:123", idempotencyKey: "tap:abc", seq: 7 });

  // When: same logical op arrives twice (retry/replay)
  const r1 = await pipeline.ingest(input);
  const r2 = await pipeline.ingest({ ...input, messageId: newId(), attempt: 2 });

  // Then
  expect(r1.status).toBe("processed");
  expect(r2.status).toBe("deduped");
  expect(await store.getRunEvents("run:123")).toMatchObject([{ seq: 7 }]);
});
```

---

## 2.2 Performance Constitution (tail-latency or it didn’t happen)

Budget: **10M+ msg/sec**, **p95 ≤ 10ms end-to-end**. Treat p99 as a first-class citizen.

### 2.2.1 Hot-path default

Assume code is hot-path unless proven otherwise.

### 2.2.2 Cost rules (justify every cost)

* Every allocation, parse, copy, syscall, and event-loop hop must be justified.
* Prefer linear, predictable work; avoid abstraction layers that hide costs.
* Feynman estimate your work. When you cannot use real data, take a best informed estimate.

**Node-specific hot-path bans (unless justified + measured):**

* sync I/O in request/pipeline processing
* unbounded buffering (arrays, string concat, JSON stringify/parse in loops)
* excessive promise churn / microtask storms in tight loops
* logging per-message at info level in hot loops

### 2.2.3 Performance proof protocol

For hot-path changes, provide at least one:

* **Benchmark delta** (before/after) with same workload, or
* **Profile evidence** (flame graph / CPU profile) showing hotspot impact, or
* **Load test results** showing p95/p99 stability, queue depth bounded, no GC/memory blowups.

If you only “reason,” you must state assumptions and what measurement would falsify them.

---

## 2.3 Reliability Constitution (design against failure)

Do a pre‑mortem and eliminate failure vectors *first*.

Minimum catastrophic outcomes to consider:

* data loss/corruption
* duplicated processing / unsafe replays
* unbounded memory growth
* backpressure collapse / queue explosion
* event loop stalls / hangs
* partial failures and retries (retry storms)
* performance degradation under load (tail blowups)

### 2.3.1 Timeouts + retries: one clear way

Retries multiply load. Standardize.

Rules:

* Every remote boundary has an explicit timeout.
* Retries use exponential backoff + jitter, with caps and max attempts.
* Retries happen at **one layer only** (avoid stacked retries).
* Idempotency must exist before retrying non-read operations.

Example policy (illustrative):

```js
const retryPolicy = {
  timeoutMs: 50,              // per-attempt
  maxAttempts: 3,
  backoffMs: attempt => jitter(exp2(attempt) * 10, { maxMs: 200 })
};
```

### 2.3.2 Backpressure is mandatory

* Producers must not outrun consumers.
* Queues are **bounded**; overflow behavior must be defined: shed, drop, spill, or block (and where).
* Backpressure behavior must be tested (queue depth remains bounded under load).

### 2.3.3 Graceful shutdown / deploy safety

* On shutdown: stop intake → drain in-flight work → flush critical buffers → exit.
* No “drop on SIGTERM” unless explicitly acceptable and documented.

---

## 2.4 Observability Constitution (operable by default, low overhead)

If you can’t observe it, you can’t trust it.

### 2.4.1 Structured logs (two kinds; do not mix)

* **Operational logs:** for humans/on-call; sampled/leveled; safe; low overhead.
* **Event logs (pipeline data):** structured, versioned, replayable; not emitted via console-style logging.

Rules:

* Use centralized logger only. No `console.*` in `src/`.
* Never log secrets/PII. Prefer hashed or truncated identifiers.
* Every log line in a request/pipeline context must include:

  * `correlationId`, `messageId` (if applicable), `traceId` (if tracing exists), and a stable `component`.

Example:

```js
logger.info(
  { component: "replay.ingest", correlationId, messageId, traceId, runId, deduped: true },
  "tap_event_ingested"
);
```

### 2.4.2 Metrics (minimum set for any pipeline stage)

* latency histogram (stage time)
* throughput (messages/sec)
* queue depth / lag
* drop/shed counts (by reason)
* retry counts + dedupe hits
* error rate (by error class)

### 2.4.3 Tracing

* Standardized span boundaries per stage.
* Context propagation across async boundaries is required (no broken traces).

---

## 2.5 Migrations Constitution (presentism, but with physics)

We refactor by deletion—but safe rollout requires controlled duality.

### 2.5.1 Default: delete, never accrete

* No deprecated functions, commented-out code, or permanent alternate paths.

### 2.5.2 Exception: Expand → Migrate → Contract (only allowed migration shape)

If you must change a public interface, schema, or behavior used by multiple callers:

* **Expand:** add new path/field while keeping old working.
* **Migrate:** update all producers/consumers to the new path.
* **Contract:** delete the old path.

Rules:

* Every migration includes a **deletion trigger** (date, version, or “after consumer X ships”).
* During migration, tests must cover:

  * old path still works,
  * new path works,
  * equivalence where required.

Example (dense):

* Expand: accept `schemaVersion:4` while still accepting `3`
* Migrate: iOS client updates to emit v4; server dual-read
* Contract: remove v3 decoding + tests once rollout window closes

---

# 3) Code & API Rules (make the right thing the easy thing)

When writing code, follow Ousterhout principles.

## 3.1 Naming / signatures

**Clarity above all.** Optimize for humans and repo-wide searchability. 
Your goal with every single variable name is to *reduce ambiguity*. 
Every variable name must be `grep`able throughout the whole repo. Clearer variables names = cleaner, more expressive code

* Use descriptive, clear names. Avoid abbreviations: `ctx` → `requestContext`. Code must be repo-wide searchable
* Include units (`timeoutMs`, `maxBytes`, `intervalInSeconds`).
* Booleans: `is/has/should/can`.
* File names must be clear and specific (prefer descriptive kebab-case):
  `membership-list-for-room` > `memb-list`
* Booleans use `is/has/should/can`: `isUserAuthenticated`, `shouldRetry`.
* `camelCase` for variables/functions, `PascalCase` for classes/types.

Function signatures:
* > 2 params → `options` object with stable fields + defaults.
* Options objects should have stable, named fields and sensible defaults.

### 3.1.1 Immutability by default
* Default to `const`.
* Mutate state only when it’s demonstrably safe **and** measurably faster.
* Prefer explicit data flow; avoid hidden shared state.


## 3.2 Config determinism

* Never read `process.env` outside `src/env.js`.
* All config via `loadEnv()` (or repo standard).

## 3.3 Immutability by default

* Default to `const`.
* Mutate only when demonstrably safe **and** measurably faster.

## 3.4 Error model (make it consistent)

Use **returns for expected outcomes**, **throws for exceptional failures**.

* Expected/normal outcomes (not-found, already-deleted, deduped, validation failure): return `null`, `false`, or `Result`/`Either`.
* Exceptional failures (I/O down, corrupted state, invariant violated): throw explicit `Error` subclasses.

Example:

```js
// Expected outcome: not found is normal.
function getUser(userId) { return cache.get(userId) ?? null; }

// Exceptional: storage corrupted is not normal.
throw new CorruptionError({ key, details });
```

Never swallow exceptions. Every async boundary must handle rejection explicitly.

## 3.5 Async model

* Prefer one style per module.
* Use callbacks only when hot-path overhead matters and you can keep it readable.
* Use async/await where it reduces bugs and complexity.
* Mixing styles requires an explicit comment explaining why (cost/control-flow reason).

## 3.6 Comments / docs

* Comments explain **why**, not what.
* Public functions require JSDoc: purpose, edge cases, error/return semantics, invariants.

## 3.7 CLI UX

* Common case works without flags.
* `--help` is sufficient; errors are explicit with correct exit codes.

---

# 4) Definition of Done (PR gate)

A change is not “done” unless all apply:

* ✅ Design Note included (§0.1)
* ✅ Semantics explicitly stated (§2.1) and matches tests
* ✅ ≥1 deterministic integration test covers behavior end-to-end 
* ✅ Bugs include regression integration test (fails before fix)
* ✅ Failure pre-mortem mitigations encoded as guards/tests 
* ✅ Performance impact proven for hot-path changes 
* ✅ Observability added/updated (logs+metrics+trace where relevant)
* ✅ Migration plan included for interface/schema changes, with contract phase enforced 
* ✅ No dead code paths; no “second way” without deletion plan (§1.2)
* ✅ Every variable name is repo-wide `grep`able and semantically clear (§3.1)
* ✅ Logs safe (no PII/secrets) and not p95-hostile
* ✅ Public APIs/CLI are intuitive and self-discoverable

---

# 5) What “excellent” looks like

Excellent changes are boring in the best way:

* Follows Ousterhout standards
* semantics are explicit
* tests read like a spec and don’t flake
* failure modes are designed out, not patched around
* performance is measured, tail-safe, and stable under load
* migrations are disciplined and end in deletion
* codebase gets simpler over time

---

# Appendix - The Ousterhout Standards

_"The most fundamental problem in computer science is problem decomposition: how to take a complex problem and divide it up into pieces that can be solved independently."_ 
- John Ousterhout, _A Philosophy of Software Design_

These five principles form the foundation of maintainable software architecture. They directly attack **coupling** and **cognitive load**—the two forces that kill velocity in large codebases.

| #   | Principle              | One-Line Test                                                |
| --- | ---------------------- | ------------------------------------------------------------ |
| 1   | **Deep Modules**       | Does one call provide high leverage?                         |
| 2   | **Information Hiding** | Can I swap the implementation without changing callers?      |
| 3   | **General Interfaces** | Could this signature exist in an open-source library?        |
| 4   | **Complexity Down**    | Does the caller need to understand internal orchestration?   |
| 5   | **Errors Out**         | Am I throwing for a case that could be a valid return value? |