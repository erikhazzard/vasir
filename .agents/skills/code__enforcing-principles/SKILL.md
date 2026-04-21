---
name: code__enforcing-principles
description: Mandatory pre-code protocol for concrete repo changes. Forces repo-grounded current-state mapping, user-journey framing, explicit system contracts, deterministic integration tests, failure/observability/performance proofs, safe rollouts, and disciplined migrations across backend, iOS, and infra surfaces. Use for any concrete code change or code-quality review tied to a real repo diff. Do not use for abstract philosophy with no proposed repo change.
---

Before touching code, follow this protocol in order. This is a production-change protocol, not a style guide.

# 0) Scope gate: classify the change before you design it

First answer:

- Is this a concrete repo change? If no, discuss only; do not invoke the full protocol.
- Is it **meaningful**? A change is meaningful if it can affect behavior, contracts, performance, observability, security/privacy, rollout, data shape, persistence, failure handling, or runtime/build config. If unsure, treat it as meaningful.

Assign all applicable change tags:

- `C0 Non-meaningful` — comments/formatting/mechanical rename/code move only, provably no runtime or contract effect
- `C1 Local logic` — internal simplification or refactor, no intended behavior change
- `C2 Behavior` — user-visible or operator-visible behavior change within the current interface
- `C3 Interface` — API/schema/CLI/config/storage contract change
- `C4 Semantics` — retries, ordering, dedupe, concurrency, persistence, offline sync, distributed workflow, state-machine changes
- `C5 Hot path` — can affect latency, throughput, allocations, parsing, serialization, queueing, logging, event loop, storage, or network cost
- `C6 Security/Privacy/Abuse` — authn/authz, secrets, PII, money, policy enforcement, trust boundaries, rate limits
- `C7 Rollout/Migration` — flags, canaries, multi-version coexistence, backfills, data migrations, irreversible steps, client/server skew

Assign all applicable surface tags:

- `S Server/backend/pipeline`
- `M Mobile/iOS/offline client`
- `I Infra/data/ops`

Examples:

- changing retry policy on event ingest = `C2 C4 C5 C7 | S`
- adding a field consumed by old iOS builds = `C2 C3 C4 C7 | S M`
- renaming a private variable with no emitted-code change = `C0`

If the change introduces a second way, either delete the first way in the same change or classify it as `C3`/`C7` and plan its removal.

# 1) Repo reality check (required before any design note)

Read the repo first. Do not invent “repo standards.” Prefer repo inspection and bounded assumptions over asking for basic facts the repo can reveal.

Output:

- `Problem check:` what problem/bug/need is actually evidenced? Challenge the premise.
- `Existing path:` current modules/files/interfaces/queues/jobs touched
- `Existing contract:` current behavior/semantics/timeout/retry/ordering/migration pattern if known
- `Existing tests:` current coverage at the risky boundary
- `Existing observability:` current logs/metrics/traces/alerts on this path
- `Existing precedent:` repo patterns you are following, with file paths. If none: `No clear repo precedent found`, then propose the least surprising pattern.

If facts remain missing after inspection:

- mark them `Unknown`
- list up to 3 viable interpretations with tradeoffs
- choose the most conservative assumption needed to proceed and label it `Tentative`
- tag every downstream claim that depends on it as `Tentative`

Never say “repo standard” without evidence.

# 2) Output format

Do not write code until the note is complete enough that another senior engineer could review the change without reading your mind. If a required contract choice remains `Unknown`, do not fake precision: present the narrowest viable option set and proceed only on clearly labeled `Tentative` assumptions.

Use bullets, not prose paragraphs.  
Keep each section dense: 2–6 bullets and ≤120 words unless measurement data requires more.  
If a field does not apply, write `N/A — reason`.

Use exactly one format.

## 2A) Mini Design Note — only if the change is `C0` and no other tags apply

1. **Classification**
   - Change tags:
   - Surface tags:
   - Why this is non-meaningful:

2. **Unlocks (User Journey)**
   - This protects or unlocks:
   - The user journey affected:

3. **Repo Evidence**
   - Files reviewed:
   - Existing tests relied on:

4. **Safety Proof**
   - Why behavior/contract/perf/observability/security are unchanged:
   - Why no deterministic integration test is required:

5. **Code Plan**
   - Minimal change only:
   - Out-of-scope follow-ups (if any):

If you cannot prove `C0`, use the full note.

## 2B) Full Design Note — required for every meaningful change

Put this in the PR description or first response before code.  
Every non-trivial claim must cite repo evidence (file/module/test/config path) or be labeled `Tentative`.  
Use exactly these sections, in this order:

1. **Classification & Current State**
   - Change tags:
   - Surface tags:
   - Problem check:
   - Existing path:
   - Existing precedent:
   - Repo evidence:
   - Complexity delta: what becomes simpler, what knowledge stops leaking, what path is deleted or avoided
   - Rejected alternatives: 1–3 strongest credible alternatives with tradeoffs

2. **Unlocks (User Journey)**
   - This unlocks: **[user journey one level above the feature]**
   - Within that journey, this enables: **[specific step]**
   - The next obvious user action is: **[next step]**
   - Journey metric or operator signal affected:
   - If internal-only: name the user journey it protects, stabilizes, or speeds up

3. **Semantics & State Contract**
   - Contract change: **none / preserved / changed**
   - Source of truth / write authority:
   - State or partition key:
   - Delivery semantics: **at-most-once / at-least-once / effectively-once (dedupe)**
   - Ordering: **none / per-key / total**; if per-key, name the key
   - Idempotency key: what it is, where it comes from, retention window, storage location
   - Replay behavior: what replay means, what is safe to replay, what is not
   - Read visibility / consistency:
   - Conflict resolution: especially for concurrent or offline/mobile writes
   - Schema/versioning: compatible changes, coexistence window, evolution plan
   - Time authority: **serverTime / clientTime / both**; drift/offline handling
   - If no contract change: state which invariants stay unchanged

   Example:
   - `Delivery semantics: effectively-once via idempotencyKey=chargeId stored in payments_dedupe for 24h; retries allowed at API layer only`

4. **Failure Pre-Mortem**
   Pick the top 3 catastrophic outcomes from:

   - data loss/corruption
   - unsafe duplicate effect
   - stale/conflicting state exposed to users
   - security/privacy leak
   - unbounded memory growth
   - backpressure collapse / queue explosion
   - event-loop stall / hang
   - retry storm / fan-out amplification
   - rollout incompatibility / version-skew failure
   - tail-latency blowup
   - irreversible bad migration

   For each, use this exact shape:
   - `Outcome -> Invariant -> Guard -> Deterministic test -> Signal`

   Example:
   - `unsafe duplicate effect -> a chargeId is applied once -> dedupe table + unique constraint -> replayed request integration test -> dedupe_hit_count, duplicate_reject_count`

5. **Observability & Telemetry Cost**
   - Operational logs: what we log, where, and at what level
   - Event/data logs: structured/versioned emissions, if any
   - Metrics: 3–7 key metrics with exact names and labels
   - Tracing: span boundaries and required context propagation
   - Cardinality budget: allowed labels; forbidden high-cardinality labels
   - Sampling / volume plan:
   - What we intentionally do **not** log or label to protect p95, cost, and privacy

   Rules:
   - Use the centralized logger only; no `console.*` in production code
   - Never log secrets or raw PII
   - Prefer hashed or truncated identifiers when identifiers are needed
   - In request/pipeline context include stable `component`, `correlationId`, and `traceId`/`messageId` when applicable
   - Do not use `userId`, `messageId`, `traceId`, raw URLs, or raw IDs as metric labels

   Example metric labels:
   - allowed: `component`, `result`, `errorClass`, `queueName`
   - forbidden: `userId`, `messageId`, `traceId`

6. **Performance & Capacity Proof**
   - Hot path: **yes / no**; if unsure, **yes**
   - Boundary measured:
   - Workload class:
   - Payload/message size bounds:
   - Fan-out / concurrency assumptions:
   - Capacity / volume estimate:
   - Cost model: allocations, copies, parses, syscalls, storage/network round trips, event-loop hops, logging cost
   - Per-stage latency budget if latency-sensitive:
   - Tail expectation: p95/p99 or queue-bound target, if applicable
   - Proof plan: **benchmark / profile / load test / reasoned**
   - Falsifier: what measurement would prove this design wrong

   Rules:
   - For `C5`, reasoned argument alone is not enough; you need benchmark, profile, or load test evidence
   - Avoid sync I/O, unbounded buffering, per-message info logs, hidden JSON parse/stringify loops, and uncontrolled promise churn on hot paths
   - If the global latency budget is unclear, define the local boundary and local budget instead of pretending to know end-to-end truth

7. **Security / Privacy / Abuse Review**
   - Sensitive data / secret handling:
   - Authn/authz invariants:
   - Replay / abuse / rate-limit considerations:
   - Input validation and trust boundaries:
   - Logging redactions:
   - Security-specific tests or checks:

8. **Rollout, Migration & Reversibility**
   - Rollout mode: **direct / flag / canary / percentage / shard / dark launch**
   - Success metrics and guardrails:
   - Rollback trigger and kill switch:
   - Reversible: **yes / no**; if no, how blast radius is bounded
   - Expand -> Migrate -> Contract steps, if any
   - Compatibility window:
   - Client/server or producer/consumer skew notes:
   - Deletion trigger for the old path:
   - Cleanup owner or condition for contract phase:

   Rules:
   - No permanent dual paths
   - Old and new paths must both be tested during migration; prove equivalence where required
   - Do not assume immediate mobile client rollout; old clients will exist

9. **Tests Portfolio**
   - Required tests by exact name, with what each asserts
   - At least one deterministic integration test for every meaningful change
   - For bug fixes: start with a failing regression integration test
   - Required additional tests by tag:
     - `C3`: contract tests
     - `C4`: invariant/fault tests for replay, duplication, ordering, partial failure, or concurrency
     - `C5`: performance regression test or benchmark
     - `C6`: security/abuse tests where relevant
     - `C7`: old path, new path, and coexistence tests
   - Flake control: clock control, seeded randomness, bounded waits, hermetic boundaries
   - Why this portfolio is the minimum credible set

   Rules:
   - No sleeps for correctness
   - Use real serialization, real async boundaries, and real error paths where the risk lives
   - If the risky boundary is mocked away, it does not count as the required integration test
   - If no existing harness covers the risky boundary, extend or create one

   Example test name:
   - `it("dedupes replayed charge requests by chargeId and preserves per-account ordering", async () => { ... })`

10. **Automation Hooks & Constitution Drift**
    - Automation candidates: what should be enforced by lint, static analysis, contract checks, benchmarks, migration checks, or LLM-based CI review
    - Constitution drift: at most 3 bullets on stale, duplicate, conflicting, or missing repo rules, each with evidence
    - Do not piggyback unrelated cleanup into this change

11. **Confidence, Unknowns & Open Questions**
    - Confidence: **high / medium / low**
    - Unknowns that materially affect the design:
    - Assumptions carried forward:
    - What evidence would most quickly raise or lower confidence:

# 3) Constitutions that govern both the note and the code

Performance targets:
Backend Budget: **10M+ msg/sec**, **p95 ≤ 10ms end-to-end**. Treat p99 as a first-class citizen.
Frontend Budget: 60fps render (16.6ms frame budget), input latency ≤ 90ms, meaningful paint ≤ 0.8s, interactive ≤ 2s. Treat layout shift and dropped frames as first-class citizens.
We optimize for confidence (testing and testability) *and* fast feedback.


## 3.1 End-to-end testability is the product
We ship behavior we can prove end‑to‑end.

- Every meaningful change ships with at least one deterministic integration test
- Every bug fix starts with a failing regression integration test; the test stays forever
- Hermetic beats flaky; real boundaries beat fake confidence

**Definition:** An “integration test” here means: real modules + real serialization + real async boundaries + real error paths, running hermetically in CI. If it mocks away the boundary where the bug/perf risk lives, it doesn’t count.

## 3.2 One clear way

- Do not introduce a second way unless you are deleting the first way in the same change or executing `Expand -> Migrate -> Contract`
- Prefer existing repo patterns over novelty
- No deprecated dead paths, commented-out code, drive-by refactors, or formatting churn outside scope
- You may propose follow-ups, but do not execute them without explicit scope

## 3.3 Complexity down, not sideways

- Use deep modules, information hiding, and the most general interface that does not hide material cost
- State the complexity delta in the note
- If callers must learn more after your change, the design probably got worse
- Hot-path specialization is allowed only when the cost is real and measured

## 3.4 Reliability defaults

- Every remote boundary has an explicit timeout and a deadline owner
- Retries use backoff + jitter + cap + max attempts at one layer only
- Idempotency exists before retrying non-read operations
- Producers must not outrun consumers; queues are bounded; overflow behavior is explicit: shed, drop, spill, or block
- Admission control / load-shedding behavior must be named for overload cases
- Shutdown sequence: stop intake -> drain in-flight work -> flush critical buffers -> exit, unless documented loss is acceptable

## 3.5 Observability is part of the design

- Separate operational logs from event/data logs
- Telemetry must fit inside the same latency, cost, and privacy budget as the feature
- Context propagation across async boundaries is required
- Alerts and dashboards change when the risk profile changes

## 3.6 Returns vs throws

- Expected outcomes return `null`, `false`, or a result type
- Exceptional failures throw explicit errors
- Never swallow errors; every async boundary handles rejection explicitly

## 3.7 Config determinism

- Never read environment variables outside the repo’s config loader boundary
- All config must be explicit, typed/validated, and repo-searchable

## 3.8 Naming and signatures

- Names must be clear and grepable repo-wide
- Avoid casual abbreviations unless they are established protocol terms
- Include units: `timeoutMs`, `maxBytes`, `intervalSeconds`
- Booleans start with `is/has/should/can`
- More than 2 parameters: use a stable options object with defaults

- **Ontological Colocation - Folder Structure**: Ban generic dumping grounds (/utils, /scripts, /helpers); every file must be deeply nested and ontologically colocated alongside the specific feature or business domain it serves.

## 3.9 Immutability and data flow

- Default to `const`
- Hidden shared state is a last resort
- Mutate only when it is demonstrably safe and measurably better

## 3.10 Async model

- Prefer one async style per module
- Use callbacks only for measured hot-path reasons and say why
- Otherwise prefer async/await for readability and explicit error handling

## 3.11 Logger (two kinds; do not mix)

* **Operational logs:** for humans/on-call; sampled/leveled; safe; low overhead.
* **Event logs (pipeline data):** structured, versioned, replayable; not emitted via console-style logging.

Rules:

* Use centralized logger only. No `console.*` in `src/`.
* Never log secrets/PII. Prefer hashed or truncated identifiers.
* Every log line in a request/pipeline context must include:
  * `correlationId`, `messageId` (if applicable), `traceId` (if tracing exists), and a stable `component`.
Example:

```js
logger.log("fileName:methodName", "Some some info text", { component: "replay.ingest", correlationId, messageId, traceId, runId  });
logger.error('studio:catalog', 'author browse failed (zrevrange)', { status, correlationId, messageId, traceId, runId , error: { name: error?.name, message: error?.message }, });
```

## 3.12 Comments, public APIs, CLI, and scripts

- Comments explain **why**, invariants, and tradeoffs; not line-by-line narration
- Public functions/types/CLI commands need docs on purpose, edge cases, return/throw semantics, and migration expectations
- Common CLI/script case works without flags; `--help` is sufficient
- Destructive or stateful scripts need dry-run, idempotency, explicit blast-radius notes, and correct exit codes

# 4) Surface annexes (apply when the surface tag is present)

## 4.1 `S` Server/backend/pipeline

Also cover:

- remote boundaries, timeout owner, retry owner, and deadline propagation
- queue bounds, overflow behavior, and backpressure path
- event-loop blocking risk, sync I/O bans, promise churn, parse/serialize cost
- graceful shutdown and in-flight drain behavior

## 4.2 `M` Mobile/iOS/offline client

Also cover:

- `serverTime` vs `clientTime`, drift tolerance, and offline clock risk
- offline queue semantics, dedupe across app restarts, retry-on-reconnect behavior
- conflict resolution for concurrent/offline writes
- version-skew coexistence window; server must tolerate old clients
- app rollout and rollback limits; never rely on immediate client adoption

## 4.3 `I` Infra/data/ops

Also cover:

- blast radius, canary/dark-launch path, and operational guardrails
- stateful migrations/backfills, checkpoints, resumability, and abort criteria
- capacity estimates, saturation signals, rollback time, and irreversible steps

# 5) Definition of done

A change is not done unless every applicable item below is true:

- change classification is explicit and evidence-backed
- current repo state is mapped before design claims
- user journey is named, even for internal work
- semantics are explicit or explicitly unchanged
- top failure modes have `Invariant -> Guard -> Deterministic test -> Signal`
- observability includes telemetry-cost control
- performance proof is measurable for hot-path changes
- every meaningful change has at least one deterministic integration test
- bugs have a failing regression integration test
- contract/migration/rollout compatibility is covered when applicable
- security/privacy/abuse review is done when relevant
- no permanent second way remains
- major claims are grounded in repo evidence or marked `Tentative`
- at least one suitable rule or invariant is automated when feasible

# 6) Curation rule

This constitution is curated.

- If a rule is stale, duplicated, conflicting, or too vague to enforce, say so under `Constitution Drift` with evidence
- Prefer deleting obsolete rules over accreting new ones
- When a rule is stable and objective, propose automation instead of relying on memory


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