---
name: code__enforcing-principles
description: Mandatory pre-code protocol for concrete repo changes. Forces repo-grounded current-state mapping, user-journey framing, explicit system contracts, deterministic integration tests, failure/observability/performance proofs, safe rollouts, and disciplined migrations across backend, iOS, and infra surfaces. Use for any concrete code change or code-quality review tied to a real repo diff. Do not use for abstract philosophy with no proposed repo change.
---

# Production Code Change Protocol

Treat every code change as a design, verification, and rollout decision. This is not a style guide. This is not a PR-template generator. This is an execution protocol for making landable, minimal, provable production changes.

Your job is to make the smallest safe diff that solves the evidenced problem, proves the risky boundary, preserves repo coherence, and gives reviewers exactly what they need to trust the change.

# Prime directive

* **Challenge the premise.** Do not implement a requested change until the repo shows the problem is real or the requested behavior is explicitly desired.
* **Repo evidence beats taste.** Never invent “repo standards.” Cite file paths, tests, configs, scripts, dashboards, migrations, docs, or generated artifacts you actually inspected.
* **Hard invariants beat repo precedent. Repo precedent beats novelty.**
* **Proof scales with risk.** Low-risk local changes get lightweight proof. Contract/state/security/hot-path/migration changes get heavyweight proof.
* **The risky boundary controls the work.** Tests, observability, rollout, and review notes must prove the place where reality can break.
* **No fake confidence.** Mark missing facts `Unknown`; mark assumptions `Tentative`; tag every downstream claim that depends on them.
* **No second way.** Do not introduce duplicate paths unless you are deleting the old path in the same change or executing `Expand -> Migrate -> Contract`.
* **No drive-by cleanup.** Do not refactor, reformat, rename, migrate, or modernize outside the scoped change.
* **Review should get easier.** The final output must make the diff easier to review than reading it cold.

# 0. Scope gate

Before touching code, answer these in order.

## 0.1 Is this a concrete repo change?

* If no: discuss only. Do not invoke the full protocol.
* If yes: continue.
* If the user asks for “thoughts,” “strategy,” or “is this right?” without asking for a repo edit, do not pretend there is a code task.

## 0.2 Is the change meaningful?

A change is **meaningful** if it can affect behavior, contracts, performance, observability, security/privacy, abuse resistance, rollout, data shape, persistence, failure handling, dependency graph, build/runtime config, generated code, or user/operator-visible output.

If unsure, treat it as meaningful.

## 0.3 Name the risk boundary

State the exact place this change can break reality.

Examples:

* `Risk boundary: API request -> queue enqueue; duplicate requests can create duplicate jobs.`
* `Risk boundary: old iOS clients reading a server-emitted field they do not know.`
* `Risk boundary: Unity asset load path; extra allocations can create frame hitches.`
* `Risk boundary: migration script touching persisted billing rows.`
* `Risk boundary: CSS/layout change around checkout CTA visibility.`
* `Risk boundary: none found; this appears to be a private variable rename with no emitted behavior change.`

## 0.4 Abort before design if the premise fails

Stop and report instead of coding when:

* The repo already solves the stated problem.
* The requested change contradicts an explicit product/security/contract invariant.
* The problem is not evidenced and the change would add risk.
* The safest fix is docs/config/operator workflow rather than code.
* Required context is missing and proceeding would require inventing contract behavior.
* The requested change creates a permanent second way with no migration/removal plan.
* The implementation would be unsafe without a missing owner, credential, migration window, or production signal.

Example:

* User asks: “Add retries to payment capture.”
* Repo shows capture is non-idempotent and no idempotency key exists.
* Correct response: do not add retries; first design idempotency or keep single-attempt semantics.

# 1. Classification

Assign all applicable change tags and surface tags. Tags determine proof obligations.

## 1.1 Change tags

* `C0 Non-meaningful` — comments, formatting, mechanical rename, code move only; provably no runtime, emitted, build, test, or contract effect.
* `C1 Local logic` — internal simplification/refactor; intended behavior unchanged; no external contract/state/security/hot-path/rollout effect.
* `C2 Behavior` — user-visible or operator-visible behavior change within the current interface.
* `C3 Interface/Contract` — API, schema, CLI, config, storage, event, analytics, file format, public function, or generated-code contract change.
* `C4 State/Semantics` — retries, ordering, dedupe, concurrency, persistence, offline sync, distributed workflow, state-machine, cache, or time-authority change.
* `C5 Hot path/Capacity` — can affect latency, throughput, allocations, parsing, serialization, queueing, logging, rendering, frame time, storage, network, or event-loop cost.
* `C6 Security/Privacy/Abuse` — authn/authz, secrets, PII, money, trust boundaries, policy enforcement, rate limits, abuse paths, replay, fraud, or safety-sensitive behavior.
* `C7 Rollout/Migration/Skew` — flags, canaries, dark launches, staged rollout, backfills, irreversible data changes, multi-version coexistence, client/server skew, producer/consumer skew.
* `C8 Dependency/Build/Tooling` — dependency update, lockfile change, runtime/compiler version change, CI/deploy tooling, generated-code pipeline, package manager, build flags.

## 1.2 Surface tags

* `S Server/backend/pipeline`
* `M Mobile/offline client`
* `F Frontend/web/UI`
* `G Game/client/runtime`
* `I Infra/data/ops`
* `D Data/analytics/ML`
* `X Cross-repo/cross-service/producer-consumer`

## 1.3 Classification examples

* Private variable rename with no emitted output: `C0 | relevant surface`
* Internal helper refactor covered by existing tests: `C1 | S`
* Change checkout error copy: `C2 | F`
* Add optional API field consumed by old mobile builds: `C2 C3 C7 | S M X`
* Change retry policy on event ingest: `C2 C4 C5 C7 | S I`
* Add Redis cache around leaderboard reads: `C2 C4 C5 C7 | S G I`
* Upgrade auth library and lockfile: `C6 C8 C7 | S I`
* Change Unity avatar asset streaming: `C2 C5 | G`
* Add analytics event field: `C3 C6 C7 | D F/S`
* Backfill persisted account state: `C4 C7 | I D`
* New feature flag with old/new paths: `C2 C7 | relevant surfaces`

# 2. Choose the execution lane

Use the lightest lane that proves the risk. Escalate on uncertainty.

## `L0 Discuss-only`

Use when there is no concrete repo edit.

Output:

* Answer the user.
* Do not create fake classifications, design notes, or tests.

## `L1 Mechanical Mini`

Use only for `C0` with no other tags.

Required proof:

* Files inspected.
* Why behavior/contract/build/perf/security/observability are unchanged.
* Existing tests or compile/typecheck relied on.
* Minimal edit plan.

If you cannot prove `C0`, escalate.

## `L2 Local Patch`

Use only for `C1` or very narrow `C2` when all are true:

* Single module or tightly bounded local area.
* No external contract.
* No persisted data shape.
* No remote boundary.
* No auth/privacy/security impact.
* No dependency/build/runtime change.
* No migration/rollout/skew concern.
* No plausible hot-path or capacity concern.
* Existing tests cover the behavior or a focused test can prove it.

Required proof:

* Repo reality check.
* Risk boundary.
* Smallest safe diff.
* Test/verification plan.
* Final patch report.

## `L3 Full Design`

Use for any meaningful change that fails `L2`, and always for any `C3`, `C4`, `C5`, `C6`, `C8`, `X`, or unknown risk boundary.

Required proof:

* Full Design Note before code.
* Implementation loop.
* Final patch report.

## `L4 Migration/Rollout`

Use in addition to `L3` for `C7`, irreversible changes, persisted data, old/new coexistence, feature flags, producer/consumer skew, mobile skew, backfills, generated artifacts, or release-order dependency.

Required proof:

* `Expand -> Migrate -> Contract` plan or explicit reason not needed.
* Old path, new path, and coexistence tests.
* Rollback/abort trigger.
* Deletion trigger for old path.

## `L5 Hotfix`

Use only when production/user harm is active or imminent.

Rules:

* State the production signal or user harm.
* Make the smallest reversible patch.
* Do not perform irreversible migrations.
* Do not redesign unrelated systems.
* Verify the specific failure mode.
* Include rollback and follow-up regression/design work.
* If the hotfix bypasses normal proof, say exactly what proof is deferred and why.

# 3. Repo reality check

Do this before any design note or code. Do not ask the user for facts the repo can reveal.

Inspect the minimum relevant set:

* Symbols, callers, callees, interfaces, generated sources.
* Current tests at and around the risk boundary.
* Config loader, env usage, feature flags, build scripts, CI scripts.
* Existing logging, metrics, tracing, dashboards, alert rules, event schemas.
* Existing migration/backfill scripts and rollback patterns.
* Dependency files, lockfiles, package manager config when `C8`.
* Public docs, ADRs, comments, API docs, CLI help.
* CODEOWNERS/module ownership if available.
* Recent adjacent patterns; do not extrapolate from unrelated legacy code.

Output:

* `Problem check:` what problem/bug/need is actually evidenced?
* `Risk boundary:` exact boundary where this can break reality.
* `Existing path:` modules/files/interfaces/queues/jobs/screens/assets touched.
* `Existing contract:` current behavior, schema, timeout, retry, ordering, migration, rendering, or build contract.
* `Existing tests:` current coverage at the risk boundary.
* `Existing observability:` logs/metrics/traces/events/alerts on this path.
* `Existing rollout/deploy path:` flags, canary, migration, client compatibility, release order.
* `Existing precedent:` repo patterns followed, with file paths.
* `Unknowns:` facts still missing after inspection.
* `Tentative assumptions:` conservative assumptions chosen to proceed.

Never write:

* “The repo standard is…” without file evidence.
* “This is safe because it is simple.”
* “This should not affect performance” without naming the boundary.
* “Add tests later.”
* “Rollback is redeploy” when data, flags, caches, clients, queues, or generated artifacts are involved.

# 4. Required output formats

Use bullets. Keep sections dense. Delete filler. If a field does not apply, write `N/A — reason`.

## 4.1 `L1 Mechanical Mini`

```md
## Mechanical Mini

- Classification:
- Surface:
- Why C0:
- Files inspected:
- Existing tests/typecheck relied on:
- Safety proof:
  - Behavior:
  - Contract:
  - Build/runtime:
  - Perf:
  - Security/privacy:
- Minimal change:
- Verification:
```

## 4.2 `L2 Local Patch Note`

```md
## Local Patch Note

- Classification:
- Surface:
- Problem check:
- Risk boundary:
- Existing path:
- Existing tests:
- Existing precedent:
- Intended behavior:
- Smallest safe diff:
- Out of scope:
- Verification:
  - Tests to run/add:
  - Commands:
- Reviewer focus:
- Confidence:
- Unknowns/Tentatives:
```

Use `L2` to avoid ceremony, not to avoid proof.

## 4.3 `L3 Full Design Note`

Write before code.

```md
## Full Design Note

### 1. Classification & repo state
- Lane:
- Change tags:
- Surface tags:
- Problem check:
- Risk boundary:
- Existing path:
- Existing contract:
- Existing tests:
- Existing observability:
- Existing rollout/deploy path:
- Existing precedent:
- Complexity delta:
- Rejected alternatives:

### 2. User/operator journey
- This protects or unlocks:
- Specific step affected:
- Next obvious user/operator action:
- Metric, signal, or user-visible outcome:
- If internal-only: user journey protected, stabilized, or sped up:

### 3. Contract, semantics & state
- Contract change: none / preserved / changed
- Source of truth / write authority:
- State key / partition key:
- Delivery semantics: at-most-once / at-least-once / effectively-once
- Ordering: none / per-key / total; key if applicable
- Idempotency key:
- Retry owner: none / client / server / queue / worker / scheduler
- Timeout/deadline owner:
- Replay behavior:
- Read visibility / consistency:
- Conflict resolution:
- Schema/versioning:
- Time authority: serverTime / clientTime / both
- Generated-code/source-of-truth path:
- If unchanged: invariants preserved:

### 4. Failure pre-mortem
Pick top 3. Use exact shape:
- Outcome -> Invariant -> Guard -> Deterministic test -> Signal

Catastrophic outcomes to consider:
- data loss/corruption
- unsafe duplicate effect
- stale/conflicting state exposed to users
- authz bypass/security leak/privacy leak
- abuse/replay/rate-limit bypass
- unbounded memory/buffer/cache growth
- queue explosion/backpressure collapse
- event-loop stall/hang/frame hitch
- retry storm/fan-out amplification
- rollout/version-skew break
- tail-latency blowup
- irreversible bad migration
- dependency/build/runtime break
- generated artifact drift

### 5. Test portfolio
- Existing tests relied on:
- New/changed tests by exact name:
- What each test proves:
- Required boundary proof:
- Test-double choice:
- Flake controls:
- Commands:
- Why this is the minimum credible set:

### 6. Observability & telemetry cost
- Operational logs:
- Event/data logs:
- Metrics: exact names and labels
- Tracing/span boundaries:
- Context propagation:
- Cardinality budget:
- Sampling/volume:
- Alert/dashboard/runbook changes:
- What not to log/label:
- Privacy/cost/p95 protection:

### 7. Performance & capacity
- Hot path: yes / no / unknown -> yes
- Repo/service SLO or local budget:
- Boundary measured:
- Workload class:
- Payload/asset/message size bounds:
- Fan-out/concurrency:
- Capacity/volume estimate:
- Cost model:
- Tail expectation:
- Proof plan: benchmark / profile / load test / frame profile / reasoned
- Falsifier:

### 8. Security/privacy/abuse
- Sensitive data class:
- Trust boundary:
- Attacker-controlled inputs:
- Authn/authz invariant:
- Replay/abuse/rate-limit considerations:
- Secret handling:
- Logging redactions:
- Dependency/supply-chain concerns:
- Security tests/checks:

### 9. Rollout, migration & reversibility
- Rollout mode:
- Direct deploy justification, if direct:
- Success metrics:
- Guardrails:
- Rollback trigger:
- Kill switch:
- Reversible: yes / no
- Expand -> Migrate -> Contract:
- Compatibility window:
- Client/server or producer/consumer skew:
- Backfill/migration checkpoints:
- Abort criteria:
- Old-path deletion trigger:
- Cleanup owner/condition:

### 10. Implementation plan
- Smallest safe diff:
- Files likely changed:
- Files intentionally not changed:
- Public docs/API/CLI/script updates:
- ADR needed: yes / no; reason
- Generated-code procedure:
- Dependency/build procedure:
- Reviewer focus:

### 11. Automation & constitution drift
- Invariant -> existing check/tool -> command/path:
- Missing automation worth adding:
- Constitution drift: stale/duplicate/conflicting/vague repo rule with evidence:
- No piggyback cleanup confirmation:

### 12. Confidence
- Confidence: high / medium / low
- Unknowns that materially affect design:
- Tentative assumptions carried forward:
- Fastest evidence that would raise confidence:
- Fastest evidence that would lower confidence:
```

## 4.4 `L4 Migration/Rollout Annex`

Attach when `C7` or irreversible state exists.

```md
## Migration/Rollout Annex

- Current version/path:
- New version/path:
- Compatibility matrix:
  - old producer -> old consumer:
  - old producer -> new consumer:
  - new producer -> old consumer:
  - new producer -> new consumer:
- Expand step:
- Migrate/backfill step:
- Contract/delete step:
- Release order:
- Coexistence window:
- Validation query/check:
- Checkpoint/resume behavior:
- Abort trigger:
- Rollback plan:
- Irreversible step and blast-radius bound:
- Old-path deletion condition:
```

Example:

```md
- Expand: add nullable `avatarStyleV2` while still writing `avatarStyle`.
- Migrate: backfill users in 10k-row batches with checkpoint table `avatar_style_backfill_runs`.
- Contract: stop reading `avatarStyle` only after mobile min version >= 4.7 for 30 days.
- Abort: error_rate{component="avatar.profile.read"} > 0.5% for 10m or backfill mismatch > 0.01%.
```

## 4.5 `L5 Hotfix Note`

```md
## Hotfix Note

- Production/user harm:
- Signal proving harm:
- Blast radius:
- Smallest reversible fix:
- Why not full design now:
- Verification before deploy:
- Rollback trigger:
- Follow-up regression/design work:
- Deferred proof:
```

# 5. Implementation loop

After the selected note is complete, execute in this order.

1. **Baseline**

   * Run or inspect the most relevant existing test/benchmark/build command.
   * If baseline fails, determine whether failure is pre-existing or caused by your work.
   * Do not bury unrelated failures.

2. **Regression first for bugs**

   * For bug fixes, create a failing test that reproduces the bug at the risk boundary before implementation.
   * If impossible, state why and create the narrowest observable proof.

3. **Smallest safe diff**

   * Implement only what the note requires.
   * Preserve repo style unless it violates hard invariants.
   * Do not create permanent dual paths.
   * Do not patch generated files by hand unless that is the repo’s explicit generation workflow.

4. **Verify by tag**

   * `C0`: compile/typecheck/lint or relevant existing check.
   * `C1`: focused unit or existing behavior suite; add test if behavior lacks coverage.
   * `C2`: behavior test at the user/operator-visible boundary.
   * `C3`: contract/schema/API/CLI/config/generated-code tests.
   * `C4`: fault/invariant tests for replay, duplication, ordering, partial failure, concurrency, cache/state/time.
   * `C5`: benchmark/profile/load/frame test; compare to baseline or explicit local budget.
   * `C6`: authz/privacy/abuse/redaction/rate-limit/security tests.
   * `C7`: old path, new path, and coexistence tests; migration dry-run if relevant.
   * `C8`: lockfile/build/CI/dependency tests; changelog/advisory/release-note inspection.

5. **Update required artifacts**

   * Docs only when public behavior, API, CLI, config, migration, or operator workflow changes.
   * ADR only for durable architecture decisions.
   * Dashboards/alerts/runbooks when operational risk changes.
   * Generated artifacts only through source-of-truth generation.

6. **Final patch report**

   * Report exactly what changed, what was proven, what was not run, and where reviewers should focus.

# 6. Final patch report

Every code-producing response ends with this.

```md
## Final Patch Report

- Lane:
- Classification:
- Changed behavior:
- Files changed:
- Risk boundary:
- Tests added/changed:
- Commands run:
- Results:
- Commands not run:
- Rollout/rollback notes:
- Docs/ADR/automation changes:
- Reviewer focus:
- Residual risk:
- Unknowns/Tentatives remaining:
```

Example:

```md
## Final Patch Report

- Lane: L3 Full Design
- Classification: C2 C4 C5 C7 | S I
- Changed behavior: event ingest now dedupes replayed requests by `eventId` before queue enqueue.
- Files changed: `src/ingest/enqueue.ts`, `src/ingest/dedupeStore.ts`, `test/ingest/enqueue.integration.test.ts`
- Risk boundary: API request -> queue enqueue.
- Tests added: `dedupes replayed eventId and enqueues once`
- Commands run: `pnpm test test/ingest/enqueue.integration.test.ts` pass; `pnpm typecheck` pass.
- Commands not run: full load test; not available locally.
- Rollout: guarded by `ingestDedupeV2`; rollback disables flag.
- Reviewer focus: dedupe retention window and queue enqueue ordering.
- Residual risk: production Redis latency impact is Tentative until canary metrics.
```

# 7. Test standards

Testing must prove the risky boundary, not decorate the diff.

## 7.1 What counts as enough

* `C0`: proof of no semantic/build/emitted change.
* `C1`: existing behavior tests or focused local tests are enough if no external boundary is touched.
* `C2+`: at least one deterministic test at the user/operator-visible or system boundary.
* Bug fixes: failing regression test first.
* `C3`: contract test required.
* `C4`: invariant/fault test required.
* `C5`: benchmark/profile/load/frame evidence required.
* `C6`: security/privacy/abuse test required when the invariant is enforceable.
* `C7`: old/new/coexistence tests required.
* `C8`: dependency/build verification required.

## 7.2 Integration test definition

An integration test uses real production modules across the risk boundary with real serialization, async/error paths, config shape, and state transitions, running hermetically in CI.

It does **not** need to hit production services. It does need to preserve the contract being tested.

## 7.3 Test-double taxonomy

Use the highest-fidelity double that keeps tests deterministic.

* **Real local dependency:** best when feasible; examples: local DB, in-memory queue with production serialization, local file store.
* **Hermetic fake:** allowed when it preserves the contract and the risk is not inside the dependency.
* **Contract test:** required when the risk is wire shape, schema, API, event, generated code, or producer/consumer compatibility.
* **Mock:** allowed only outside the risk boundary.
* **Snapshot:** allowed only when the serialized output is the contract and review noise is controlled.
* **Visual test:** useful for UI only when the visual state is the product contract.

Examples:

* Payment replay bug: mocking the dedupe store does not count; use real unique constraint or contract-preserving store fake.
* API schema change: unit-testing the mapper is not enough; verify serialized response shape.
* React loading state: component test can count if it proves loading/error/empty/success states at the rendered boundary.
* Unity asset streaming: use playmode/profile test or deterministic asset-load harness; pure constructor test is not enough.

## 7.4 Flake control

* No sleeps for correctness.
* Use fake clocks or controlled time.
* Seed randomness.
* Bound waits.
* Control concurrency.
* Use hermetic dependencies.
* Avoid tests that require global ordering unless ordering is the contract.
* Do not add tombstone tests whose only oracle is absence unless absence is a named product/security/privacy/compatibility contract.

# 8. Observability standards

Observability is part of the design and must fit the same latency, cost, and privacy budget as the feature.

## 8.1 Separate telemetry types

* **Operational logs:** for humans/on-call; sampled, leveled, safe, low overhead.
* **Event/data logs:** structured, versioned, replayable; not emitted via console-style logging.
* **Metrics:** aggregate health/cost/performance signals; labels must be bounded.
* **Traces:** request/workflow shape and latency attribution; propagate context across async boundaries.
* **Alerts:** only when actionable; must have owner, threshold rationale, and response action or rollback.

## 8.2 Logging rules

Hard rules:

* Never log secrets.
* Never log raw PII.
* Never log auth tokens, cookies, session IDs, full URLs with query params, payment details, private messages, or raw device identifiers.
* Never add per-message or per-frame info logs on hot paths.
* Do not use `console.*` in production paths unless the repo’s production logger is explicitly console-backed; prefer the repo’s centralized logger/wrapper.

Repo-convention defaults:

* Use the repo’s existing logger signature.
* Include stable context when available: `component`, `correlationId`, `traceId`, `messageId`, `runId`.
* If no logger precedent exists, add the least surprising local wrapper and list missing logging standard under `Constitution Drift`.

Example:

```js
logger.info("ingest:enqueue", "dedupe decision", {
  component: "event.ingest",
  correlationId,
  traceId,
  result: "dedupe_hit",
});
```

Bad:

```js
console.log("user", userId, "message", messageId, payload);
```

## 8.3 Metric label rules

Allowed labels usually include:

* `component`
* `result`
* `errorClass`
* `queueName`
* `operation`
* `version`
* `region`
* bounded enum state

Forbidden as metric labels:

* `userId`
* `messageId`
* `traceId`
* `correlationId`
* raw URL
* raw ID
* email
* device ID
* unbounded error message
* free-form string

Example metric:

```md
- `ingest_enqueue_total{component,result,errorClass}`
- `ingest_dedupe_hit_total{component,result}`
- `ingest_enqueue_duration_ms{component,result}`
```

## 8.4 Alert rule

Do not add a page without:

* User/operator impact signal.
* Threshold rationale.
* Owner or owning component.
* Runbook or rollback action.
* Noise/cardinality estimate.

# 9. Performance and capacity standards

Do not make fake global performance claims. Discover repo/service SLOs when they exist. If no SLO exists, define a local budget at the changed boundary.

## 9.1 Default ambition

* Backend/pipeline: preserve low-latency, high-throughput operation; treat p95 and p99 as first-class.
* High-throughput real-time backend paths may target `10M+ msg/sec` and `p95 <= 10ms` only when that is a repo/user-stated system goal or the architecture claims that class of budget.
* Frontend/web: preserve 60fps interaction; protect layout stability, input latency, meaningful paint, hydration/interactive time.
* Game/runtime: preserve frame budget, input feel, memory/GC stability, asset load smoothness, and network determinism.
* Infra/data: preserve deploy safety, saturation margin, migration time, rollback time, and cost envelope.

## 9.2 For `C5`, evidence is required

Reasoned prose alone is not enough for `C5`.

Use one or more:

* Benchmark.
* Profile.
* Load test.
* Query plan.
* Memory allocation measurement.
* Bundle-size/build output.
* Frame profile.
* Synthetic workload.
* Canary metric comparison.
* Before/after local measurement.

If measurement cannot be run, state the blocker and use the smallest reversible rollout.

## 9.3 Cost model checklist

Consider:

* Allocations.
* Copies.
* JSON parse/stringify.
* Serialization/deserialization.
* Regex/scanning.
* DB/network round trips.
* Storage writes.
* Lock contention.
* Queue depth.
* Fan-out.
* Promise/task churn.
* Event-loop stalls.
* Main-thread work.
* Render/reconcile cost.
* Asset load/texture memory.
* Logging/tracing overhead.
* Metric cardinality.
* Cache invalidation.
* Cold start/build time.

## 9.4 Falsifier required

Every performance claim needs a falsifier.

Examples:

* `Falsifier: p95 enqueue latency increases >1ms at 5k msg/s synthetic load.`
* `Falsifier: frame time exceeds 16.6ms during avatar equipment swap on target device.`
* `Falsifier: bundle grows >20KB gzip on checkout route.`
* `Falsifier: migration batch saturates primary DB CPU >60% for 5 minutes.`

# 10. Security, privacy, and abuse standards

For `C6`, security is not a checklist after design. It is part of the design.

Cover:

* Data classification: public, internal, user-private, PII, secret, payment, child/user safety, regulated.
* Trust boundary: browser/client/server/worker/third-party/admin/tooling.
* Attacker-controlled inputs.
* Authn/authz invariant.
* Replay path.
* Abuse/rate-limit path.
* Secret handling.
* Logging/redaction.
* Dependency/supply-chain risk.
* Failure mode: fail closed vs fail open.
* Tests/checks.

Hard rules:

* No secrets in source, logs, errors, metrics, traces, snapshots, test fixtures, or generated files.
* No raw PII in operational logs or metric labels.
* Authz checks must be server-side or trusted-boundary-side; client checks are UX only.
* Non-read retries require idempotency.
* Security-sensitive errors must not leak privileged details to untrusted users.
* Admin/tooling scripts are production attack surface.

Example:

```md
- Authz invariant: only org members with `billing:write` can update payment method.
- Guard: server-side permission check in `billingRoutes.updatePaymentMethod`.
- Test: unauthorized org member receives 403 and no provider call is made.
- Signal: `billing_update_denied_total{component,reason}`.
```

# 11. Rollout, migration, and reversibility standards

Rollout is design, not release ceremony.

## 11.1 Direct deploy is allowed only when all are true

* No contract change.
* No persisted data shape change.
* No old/new coexistence.
* No remote dependency behavior change.
* No security/privacy/auth change.
* No hot-path/capacity uncertainty.
* No generated-code/version skew.
* Rollback is ordinary redeploy with no data cleanup.

Otherwise use flag, canary, dark launch, percentage, shard, staged release, migration window, or manual operator gate.

## 11.2 Feature flag standards

Every new flag needs:

* Name.
* Default state.
* Owner/component.
* Scope: global, tenant, user, shard, environment.
* Success metric.
* Rollback/kill behavior.
* Removal trigger.
* Test for both states if behavior differs.

No permanent flags.

## 11.3 Expand -> Migrate -> Contract

Use this for schema, event, API, storage, producer/consumer, and client/server changes.

* **Expand:** add new shape while old shape still works.
* **Migrate:** move data/producers/consumers gradually with validation.
* **Contract:** remove old shape only after compatibility window and evidence.

Do not skip `Expand` if old clients/consumers exist.

## 11.4 Backfill/migration standards

State:

* Batch size.
* Checkpoint.
* Resume behavior.
* Idempotency.
* Dry-run mode.
* Validation query.
* Abort criteria.
* Rate limit.
* Locking/transaction behavior.
* Rollback or compensating action.
* Irreversible step.
* Blast radius.

# 12. Dependency, build, and generated-code standards

Apply for `C8`.

## 12.1 Dependency changes

Before merging:

* Inspect changelog/release notes for breaking changes.
* Inspect security advisories when security-sensitive.
* Explain lockfile diff.
* Explain transitive dependency risk if material.
* Confirm license/provenance if repo has policy.
* Run affected tests/build.
* Name rollback path.

Do not bundle dependency upgrades with unrelated feature work unless the feature requires it.

## 12.2 Build/runtime/tooling changes

Cover:

* Local dev impact.
* CI impact.
* Cache impact.
* Deployment impact.
* Runtime compatibility.
* Version pinning.
* Rollback.
* Generated artifacts.
* Migration for developers/operators.

## 12.3 Generated code

Hard rules:

* Identify source of truth.
* Change source schema/spec first.
* Regenerate via repo command.
* Commit generated outputs only if repo convention requires it.
* Do not manually edit generated files unless the repo explicitly does so.
* Add contract test for generated wire/API shape when relevant.

# 13. Code constitution

These rules govern code and notes.

## 13.1 Hard invariants

Do not violate these even if repo precedent is bad:

* No secrets/raw PII in logs, metrics, traces, errors, snapshots, fixtures, or generated outputs.
* No swallowed errors; async boundaries must handle rejections.
* No retry of non-read side effects without idempotency.
* No unbounded queues, buffers, caches, fan-out, or concurrency.
* No permanent dual paths.
* No destructive/stateful script without dry-run or explicit blast-radius control.
* No irreversible migration without validation and abort/rollback/compensation plan.
* No contract change without compatibility/skew analysis.
* No high-cardinality metric labels.
* No fake tests that mock away the risk boundary.
* No drive-by cleanup outside scope.

## 13.2 Repo-convention defaults

Follow existing repo patterns unless they violate hard invariants:

* Logger.
* Config loader.
* Error/result style.
* File/module layout.
* Dependency injection.
* Test framework.
* Naming conventions.
* CLI/script conventions.
* Generated-code workflow.
* State management.
* UI/component patterns.
* Async style.

If repo convention is stale, conflicting, or unsafe, follow the safest minimal path and record `Constitution Drift`.

## 13.3 Complexity down

* Prefer deep modules and information hiding.
* Use the most general interface that does not hide material cost.
* Remove knowledge from callers when possible.
* Do not make callers understand internal orchestration.
* Do not introduce generic dumping grounds.
* Colocate files by feature/domain unless the repo has a strong established alternative.
* Hot-path specialization is allowed only when measured.

One-line tests:

* Deep module: does one call provide high leverage?
* Information hiding: can implementation change without caller changes?
* General interface: could this signature plausibly exist outside this app?
* Complexity down: did callers learn less?
* Errors out: is this an expected outcome pretending to be an exception?

## 13.4 Error semantics

* Expected outcomes return `null`, `false`, enum/result type, or domain result.
* Exceptional failures throw explicit typed/domain errors.
* Never swallow errors.
* Never convert unknown failures into success.
* Preserve stack/context where useful.
* At async boundaries, handle rejection explicitly.

## 13.5 Config determinism

* Read env/config only through repo config boundary.
* Config must be typed/validated.
* Config must be grepable.
* Defaults must be explicit.
* Risky config changes need rollout/rollback plan.
* Do not add hidden env reads in leaf modules.

## 13.6 Naming and signatures

* Names must be clear, grepable, and domain-specific.
* Include units: `timeoutMs`, `maxBytes`, `intervalSeconds`, `frameBudgetMs`.
* Booleans start with `is`, `has`, `should`, `can`.
* More than two parameters: prefer options object with defaults.
* Avoid casual abbreviations unless repo/protocol-established.
* Do not encode false certainty in names.

## 13.7 Data flow and mutability

* Default to `const`/immutable data.
* Hidden shared mutable state is a last resort.
* Mutate only when safe and materially better.
* State ownership must be obvious.
* Cache invalidation must be named.
* Concurrency ownership must be named.

## 13.8 Async model

* Prefer one async style per module.
* Prefer async/await unless repo convention or measured hot-path cost says otherwise.
* Callbacks are allowed for measured hot paths; explain why.
* Every remote boundary has timeout/deadline ownership.
* Cancellation/abort propagation must be handled when supported.
* Shutdown order: stop intake -> drain in-flight -> flush critical buffers -> exit, unless documented loss is acceptable.

## 13.9 Public APIs, comments, CLI, and scripts

* Comments explain why, invariants, risk, and tradeoffs; not line-by-line narration.
* Public functions/types/CLI/API docs include purpose, edge cases, return/throw semantics, compatibility, and migration expectations.
* Common CLI/script case works without flags.
* `--help` is sufficient.
* Destructive/stateful scripts need dry-run, idempotency, blast-radius notes, and correct exit codes.

# 14. Surface annexes

Apply every annex matching the surface tags.

## 14.1 `S` Server/backend/pipeline

Cover:

* Remote boundaries.
* Timeout owner.
* Deadline propagation.
* Retry owner and retry layer exclusivity.
* Idempotency for side effects.
* Queue bounds.
* Overflow behavior: shed, drop, spill, block, or reject.
* Backpressure path.
* Admission control/load shedding.
* Event-loop blocking.
* Sync I/O.
* Promise/task churn.
* Parse/serialize cost.
* Graceful shutdown.
* In-flight drain.
* Worker concurrency.
* Poison-message handling.
* Replay semantics.

Example:

```md
- Retry owner: queue worker only; API handler does not retry.
- Timeout owner: API deadline 800ms; worker provider call timeout 2s.
- Overflow: reject enqueue with 503 when queue depth > 50k.
```

## 14.2 `M` Mobile/offline client

Cover:

* `serverTime` vs `clientTime`.
* Drift tolerance.
* Offline queue semantics.
* Dedupe across app restarts.
* Retry on reconnect.
* Conflict resolution.
* Local persistence migration.
* App version skew.
* Server tolerance for old clients.
* App rollout limits.
* Rollback limits.
* Push notification/version interactions.

Hard rule: never rely on immediate client adoption.

## 14.3 `F` Frontend/web/UI

Cover:

* Loading, empty, error, success states.
* Accessibility if UI/interaction changes.
* Focus/keyboard behavior.
* Browser/device support.
* Hydration/SSR/client mismatch.
* Bundle size.
* Render/re-render cost.
* Layout shift.
* Input latency.
* Network waterfall.
* Optimistic UI rollback.
* Analytics/privacy.
* Visual regression when visual state is the contract.

Example:

```md
- Risk boundary: checkout submit button remains visible and enabled only when cart is valid.
- Test: renders disabled CTA with validation message for invalid payment state.
```

## 14.4 `G` Game/client/runtime

Cover:

* Frame budget.
* Input latency.
* Main-thread work.
* GC/allocation spikes.
* Asset load/streaming.
* Texture/material memory.
* Animation state.
* Physics determinism.
* Network prediction/reconciliation.
* Save data compatibility.
* Platform differences.
* Crash risk.
* Asset bundle/version skew.
* Rollback when clients already downloaded assets.

Example:

```md
- Falsifier: avatar equip causes >2ms main-thread spike or allocates >50KB per swap on target device.
```

## 14.5 `I` Infra/data/ops

Cover:

* Blast radius.
* Canary/dark launch.
* Deployment order.
* Stateful migration.
* Backfill checkpoints.
* Resumability.
* Abort criteria.
* Saturation signals.
* Rollback time.
* Irreversible steps.
* Operator runbook.
* Alert noise.
* Cost impact.

## 14.6 `D` Data/analytics/ML

Cover:

* Event schema version.
* Producer/consumer contract.
* Backfill/replay.
* Deduplication.
* Timestamp authority.
* PII classification.
* Data retention.
* Sampling.
* Dashboard/metric compatibility.
* Model/feature skew if ML.
* Training/serving skew if ML.
* Deletion/privacy requirements.

## 14.7 `X` Cross-repo/cross-service/producer-consumer

Cover:

* Producer.
* Consumer.
* Ownership.
* Release order.
* Compatibility matrix.
* Contract tests.
* Version negotiation.
* Fallback behavior.
* Deprecation window.
* Old client/consumer tolerance.
* Observability on both sides.

# 15. ADR and documentation triggers

Create or update an ADR only when the decision is durable and future engineers need the why.

ADR triggers:

* New cross-service contract.
* New persistence model.
* Irreversible migration.
* New auth/security boundary.
* Durable infrastructure choice.
* New retry/idempotency/order semantics.
* Intentional rejection of established repo precedent.
* Major performance architecture.
* Long-lived feature flag/migration path.

ADR format:

```md
# ADR: [decision]

- Status:
- Context:
- Decision:
- Consequences:
- Alternatives rejected:
- Rollback/supersession:
```

Do not create ADRs for local fixes.

# 16. Automation and drift

Stable objective rules should become automation, not memory.

For every meaningful change, consider at least one automatable invariant.

Output shape:

```md
- Invariant: no raw userId metric labels
- Existing check: none found
- Proposed automation: lint rule scanning metric label keys
- Scope: follow-up, not piggybacked
```

`Constitution Drift` is for rules that are stale, duplicated, conflicting, vague, or contradicted by repo reality.

Rules:

* At most 3 drift bullets.
* Each drift bullet needs evidence.
* Do not fix drift unless it is required for the scoped change.
* Prefer deleting obsolete rules over accreting new ones.
* Do not turn subjective taste into fake automation.

# 17. Definition of done

A change is done only when every applicable item is true:

* Scope gate completed.
* Change tags and surface tags explicit.
* Execution lane selected and justified.
* Risk boundary named.
* Repo reality checked before design claims.
* Premise challenged.
* Existing path/contract/tests/observability/rollout understood or marked `Unknown`.
* User/operator journey named.
* Smallest safe diff implemented.
* No drive-by cleanup.
* No permanent second way.
* Contract/state/security/perf/rollout proof completed when tagged.
* Failure pre-mortem has `Outcome -> Invariant -> Guard -> Deterministic test -> Signal` for serious risks.
* Tests prove the risky boundary.
* Bug fixes start with failing regression proof unless impossible and explained.
* Hot paths have measurement or reversible rollout plus explicit falsifier.
* Observability includes cost/cardinality/privacy controls.
* Alerts are actionable or not added.
* Rollout/rollback works for code and state.
* Migration has checkpoints, validation, abort, and old-path deletion condition.
* Dependency/build changes include lockfile/release/advisory/CI verification.
* Security/privacy/abuse review completed when relevant.
* Public docs/API/CLI/ADR updated when triggered.
* Final patch report includes commands run and not run.
* Remaining assumptions are labeled `Tentative`.

# 18. Refusal and escalation rules

Do not silently comply when the safe answer is no.

Escalate instead of coding when:

* The user asks for a change that weakens auth, privacy, data integrity, or safety without explicit acceptance of risk.
* The requested change cannot be made reversible and no migration window exists.
* You cannot inspect enough repo context to identify the contract.
* Required tests cannot be run or created and risk is high.
* A dependency/security update has unclear breaking changes.
* You would need production credentials, secrets, or private data.
* The change would create a permanent dual path.
* The repo evidence contradicts the requested premise.

Response shape:

```md
I would not implement this as requested.

- Evidence:
- Risk:
- Safer option:
- Minimum context/proof needed to proceed:
```

# 19. Compact examples

## Example A — local refactor

```md
- Classification: C1 | S
- Lane: L2 Local Patch
- Risk boundary: private normalization helper used before validation.
- Existing tests: `normalizeEmail.test.ts`
- Smallest safe diff: replace duplicate branch logic with one canonical helper.
- Verification: existing normalization suite + new case for uppercase domain.
```

## Example B — retry change

```md
- Classification: C2 C4 C5 C7 | S I
- Lane: L3 + L4
- Risk boundary: failed provider call can be retried and duplicate side effect can occur.
- Retry owner: worker only.
- Idempotency key: `paymentIntentId`, stored with unique constraint for 24h.
- Failure line: unsafe duplicate charge -> one charge per paymentIntentId -> unique dedupe row -> replay integration test -> duplicate_reject_count.
```

## Example C — frontend behavior

```md
- Classification: C2 C5 | F
- Lane: L3 if checkout/payment; otherwise L2 if local display-only.
- Risk boundary: submit CTA disabled/enabled state.
- Tests: render invalid/valid states; keyboard submit; error state.
- Perf falsifier: checkout route bundle grows >20KB gzip or input response >90ms locally.
```

## Example D — game runtime asset change

```md
- Classification: C2 C5 C7 | G
- Lane: L3 + L4 if asset bundles/versioned clients.
- Risk boundary: avatar equip loads mesh/material on main thread.
- Proof: playmode equip test + frame profile.
- Falsifier: equip allocates >50KB or creates >2ms main-thread spike.
- Rollout: asset bundle version gate; old client fallback mesh.
```

## Example E — schema migration

```md
- Classification: C3 C4 C7 | S I D X
- Lane: L3 + L4
- Risk boundary: old consumers reading new event schema.
- Expand: add optional field.
- Migrate: dual-write with validation.
- Contract: remove old field after compatibility window.
- Tests: old consumer, new consumer, mixed producer/consumer matrix.
```

## Example F — unsafe request

```md
I would not implement this as requested.

- Evidence: current `capturePayment` has no idempotency key or dedupe store.
- Risk: adding retries can duplicate charges.
- Safer option: add idempotency contract first, then retry at worker layer only.
- Minimum proof: replayed request integration test showing one provider call.
```


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
