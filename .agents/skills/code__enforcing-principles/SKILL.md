---
name: code__enforcing-principles
description: The change protocol for concrete repo edits — risk classification (C-tags) that generates proof obligations, risk-boundary naming, contract-ownership vocabulary, failure pre-mortems, and migration/observability discipline; feeds the work spec and eval plan rather than replacing them. Triggers on any concrete code change, before design or implementation; sizing a diff's proof obligations; retries, schema/contract changes, migrations, rollouts. Not for abstract discussion with no proposed repo edit.
---

# Production Code Change Protocol

Treat every code change as a design, verification, and rollout decision. The job: the smallest safe diff that solves the evidenced problem, proves the risky boundary, preserves repo coherence, and makes the change easier to review than reading the diff cold.

**Place in the system.** Root owns the laws (§5 proof doctrine, §8 custody, §9 engineering doctrine); the triad owns the artifacts. This protocol is the layer between: it classifies a change's risk, names the boundary where reality can break, and converts tags into proof obligations and contract entries. For a substantial lane, its outputs land in the artifacts — risk boundary and pre-mortem in the rung design brief, contract vocabulary as spec §4 `C-###`s, proof obligations as eval-plan gates. For a quick change (root §4), it is the inline discipline. It never spawns a rival design note: **the spec is the plan.**

---

## Prime Directives

- **Challenge the premise.** Do not implement until the repo shows the problem is real or the behavior is explicitly desired. Abort before design when: the repo already solves it · the request contradicts an explicit product/security/contract invariant · the problem is unevidenced and the change adds risk · the safest fix is docs/config/operator workflow, not code · proceeding would require inventing contract behavior · the change creates a permanent second way with no removal plan. Aborting is a boundary report (root §3), not a failure.
- **Repo evidence beats taste.** Never invent "repo standards" — cite the files, tests, configs, scripts, and docs actually inspected. **Hard invariants beat repo precedent; repo precedent beats novelty.**
- **Proof scales with risk; the risky boundary controls the work.** Tests, observability, rollout, and reviewer notes exist to prove the place reality can break.
- **No fake confidence.** Missing facts are `Unknown`; assumptions are `Tentative`; every downstream claim that depends on one is tagged.
- **One clear path** (root §9): no duplicate paths unless the old path dies in the same change or the work runs Expand → Migrate → Contract. **No drive-by cleanup** (root §8): nothing refactored, reformatted, renamed, or modernized outside the scoped change.

---

## Scope Gate

1. **Concrete repo change?** If the ask is "thoughts," "strategy," or "is this right?" with no proposed edit — discuss only; do not cosplay a code task.
2. **Meaningful?** Meaningful = can affect behavior, contracts, performance, observability, security/privacy, abuse resistance, rollout, data shape, persistence, failure handling, dependency graph, build/runtime config, generated code, or user/operator-visible output. If unsure, meaningful.
3. **Name the risk boundary** — the exact place this change can break reality:
   - `Risk boundary: match-event ingest → queue enqueue; replayed requests can create duplicate jobs.`
   - `Risk boundary: old game bundles reading a launcher-manifest field they do not know.`
   - `Risk boundary: Character3D equip path; extra allocations can create frame hitches.`
   - `Risk boundary: backfill touching persisted player-save rows.`
   - `Risk boundary: none found; private rename with no emitted behavior change.`

---

## Risk Classification

**Change tags** (assign all that apply — tags determine proof obligations):

- `C0 Non-meaningful` — comments, formatting, mechanical rename/move; provably no runtime, emitted, build, test, or contract effect.
- `C1 Local logic` — internal refactor; behavior unchanged; no external contract/state/security/hot-path/rollout effect.
- `C2 Behavior` — user- or operator-visible behavior change within the current interface.
- `C3 Interface/Contract` — API, schema, CLI, config, storage, event, analytics, file format, public function, or generated-code contract.
- `C4 State/Semantics` — retries, ordering, dedupe, concurrency, persistence, offline sync, state machines, cache, or time authority.
- `C5 Hot path/Capacity` — latency, throughput, allocations, parsing, serialization, queueing, logging, rendering, frame time, storage, network, or event-loop cost.
- `C6 Security/Privacy/Abuse` — authn/authz, secrets, PII, trust boundaries, rate limits, replay, abuse paths, safety-sensitive behavior.
- `C7 Rollout/Migration/Skew` — flags, canaries, staged rollout, backfills, irreversible data changes, multi-version coexistence, client/server or producer/consumer skew.
- `C8 Dependency/Build/Tooling` — dependency/lockfile updates, runtime/compiler versions, CI/deploy tooling, generated-code pipeline, build flags.

**Surface tags:** `S` server/backend/pipeline · `F` frontend/launcher UI · `G` game/client/runtime (client-skew and bundle versioning live here) · `I` infra/data/ops · `D` data/analytics · `X` cross-repo/cross-service/producer-consumer (idavoll-games ↔ frontend ↔ platform-backend ↔ studio).

---

## Tags → Obligations (the keystone)

Each tag names the proof it owes (gate classes per `$eval__design-proof-gates`) and the contracts it must state (spec §4):

| Tag | Proof obligation (eval-plan gates) | Contract entries (spec `C-###`) |
| --- | --- | --- |
| C0 | prove no emitted change: compile/typecheck/existing checks | — |
| C1 | focused journey test at the local boundary | — |
| C2 | behavior gate at the user/operator-visible boundary | — |
| C3 | contract gate on the serialized/wire/generated shape | schema + versioning + empty/missing/error semantics |
| C4 | idempotency/retry + failure/hostile gates (replay, duplicates, ordering, partial failure, concurrency) | delivery semantics, ordering, idempotency, retry/timeout owners |
| C5 | measurement-first probe with sourced budget + falsifier (probe anatomy: eval skill) | perf budget / hot-path contract |
| C6 | security/privacy/auth gate, fail-closed denial proof | authz invariant, data class, redaction |
| C7 | migration/compatibility gate: old, new, and coexistence | compatibility window, removal condition |
| C8 | dependency/build verification: changelog + advisories read, lockfile diff explained, affected tests/build run, rollback named | — |

For deterministic-lane surfaces, root §2 binds on top of all of this (kernel RNG, `idv.Math`, harnesses count, replay depth).

---

## Work Sizing (root §4 vocabulary — no parallel lane system)

- **Quick change:** C0, C1, or a narrow single-surface C2 with none of C3–C8/X and a known boundary → the inline note below. The quick lane avoids ceremony, never proof.
- **Substantial lane:** any C3–C8, any X, or an unknown risk boundary → the spec and eval plan own the design; this protocol's outputs land in them.
- **Hotfix mode** (active or imminent production/user harm): state the signal proving harm; smallest reversible patch; no irreversible migrations; no unrelated redesign; verify the specific failure mode; name rollback, deferred proof, and the follow-up regression/design work explicitly.

---

## Repo Reality Check (before any design claim)

Inspect the minimum relevant set: symbols/callers/generated sources · tests at the boundary · config/flags/build scripts · existing logs/metrics/traces/alerts · migration and rollback patterns · dependency files when C8 · docs/decision logs · recent *adjacent* precedent (never extrapolate from unrelated legacy code). Then state: problem check · risk boundary · existing path, contract, tests, observability, rollout · precedent with file paths · `Unknowns` · `Tentatives`.

**Never write:** "the repo standard is…" without file evidence · "this is safe because it is simple" · "this should not affect performance" without naming the boundary · "add tests later" · "rollback is redeploy" when data, flags, caches, clients, queues, or generated artifacts are involved.

---

## Contract Vocabulary (state as spec §4 `C-###`s when touched)

Authority / write owner · delivery semantics (`at-most-once | at-least-once | effectively-once`) · ordering (none / per-key / total, + key) · idempotency key + dedupe scope · **retry owner — one exclusive layer** · timeout/deadline owner · time authority (`serverTime | clientTime`) · replay behavior · read visibility/consistency · conflict resolution · schema/versioning · generated-code source of truth.

```md
- Retry owner: queue worker only; API handler does not retry.
- Timeout owner: API deadline 800ms; worker downstream call timeout 2s.
- Overflow: reject enqueue with 503 when queue depth > 50k.
```

---

## Failure Pre-Mortem (top 3, exact shape)

`Outcome → Invariant → Guard → Deterministic test → Signal`

Catastrophic menu: data loss/corruption · unsafe duplicate effect · stale/conflicting state shown to users · authz bypass / privacy leak · abuse/replay/rate-limit bypass · unbounded memory/queue growth · backpressure collapse · event-loop stall / frame hitch · retry storm / fan-out amplification · rollout or version-skew break · tail-latency blowup · irreversible bad migration · generated-artifact drift.

```md
- Unsafe duplicate match result → one accepted result per (matchId, playerId) → unique dedupe row → replay integration test → duplicate_reject_total.
```

---

## Migration Discipline (C7)

- **Expand → Migrate → Contract.** Expand: new shape works while old still works. Migrate: move producers/consumers/data gradually with validation. Contract: remove old only after the compatibility window and evidence. Never skip Expand while old clients or consumers exist — **never rely on immediate client adoption.**
- **Compatibility matrix, all four cells:** old→old, old→new, new→old, new→new producer/consumer.
- **Feature flags:** name, default, owning component, scope, success metric, kill behavior, removal trigger, tests for both states. **No permanent flags.**
- **Backfills:** batch size · checkpoint + resume · idempotency · dry-run · validation query · abort criteria · rate limit · rollback or compensating action · the irreversible step named with its blast-radius bound.
- **Direct deploy** only when ALL hold: no contract change, no persisted-shape change, no coexistence, no remote-behavior change, no security change, no hot-path uncertainty, no skew — and rollback is an ordinary redeploy with zero data cleanup.

```md
- Expand: add nullable `avatarStyleV2` while still writing `avatarStyle`.
- Migrate: backfill in 10k-row batches with checkpoint table `avatar_style_backfill_runs`.
- Contract: stop reading `avatarStyle` only after min client bundle ≥ 4.7 for 30 days.
- Abort: error_rate{component="avatar.profile.read"} > 0.5% for 10m or backfill mismatch > 0.01%.
```

---

## Observability Discipline

- **Separate telemetry types:** operational logs (humans/on-call; leveled, sampled, safe) · event/data logs (structured, versioned, replayable — never console-style) · metrics (bounded labels only) · traces (context propagated across async boundaries) · alerts (only when actionable: owner + threshold rationale + runbook/rollback, or don't add the page).
- **Cardinality:** allowed labels ≈ `component, result, errorClass, queueName, operation, version, region`, bounded enums. **Forbidden as labels:** `userId, messageId, traceId, correlationId`, raw IDs/URLs, emails, device IDs, free-form strings.
- Never log secrets, raw PII, tokens, or full URLs with query params; no per-message or per-frame info logs on hot paths; log only through the repo's logger boundary (root §9) with stable context (`component, correlationId, traceId, runId`).

---

## Hard Invariants Root Does Not Already State

(Everything in root §9 binds and is not restated here.)

- No high-cardinality metric labels.
- No destructive or stateful script without dry-run and an explicit blast-radius bound.
- Authz enforcement is server-side or trusted-boundary-side; client checks are UX only.
- Security-sensitive errors never leak privileged detail to untrusted users.
- Admin and tooling scripts are production attack surface.
- Never rely on immediate client adoption (skew is a contract, not an accident).

---

## Integration Tests & the Test-Double Fidelity Ladder

**What "integration test" means here:** real production modules across the risk boundary — with real serialization, real async/error paths, real config shape, and real state transitions — running hermetically in CI. It does **not** need to hit production services; it does need to preserve the contract being tested. The four "reals" are named because they are exactly what fake integration tests silently swap out; hermeticity buys determinism, contract preservation buys truth, and dropping either produces a different artifact — a flaky e2e, or a unit test wearing integration clothes.

Choose the highest-fidelity double that stays deterministic; the eval plan's gate cards record the choice: **real local dependency** (local DB, in-memory queue with production serialization) > **hermetic contract-preserving fake** (allowed when the risk is not inside the dependency) > **contract test** (required when the risk is wire shape, schema, generated code, or producer/consumer compatibility) > **mock** (only outside the risk boundary) > **snapshot** (only when the serialized output IS the contract) > **visual** (only when visual state IS the contract). A mocked-away risk boundary is fake proof: a replay bug needs the real unique constraint, not a mocked dedupe store; a schema change needs the serialized response, not the mapper's unit test.

---

## Quick-Change Note & Close-Out

Quick changes carry an inline note — required elements, any shape: classification · risk boundary · problem check · smallest safe diff + out of scope · verification (exact tests/commands) · reviewer focus · unknowns/tentatives.

Close-out is root §5's block; this protocol adds two required elements to it: **commands not run** (with why), and **reviewer focus** (the one place a reviewer or auditor should look hardest).

---

## Refusal Shape (root §3 boundary report)

```md
I would not implement this as requested.
- Evidence: current match-result submit has no idempotency key or dedupe store.
- Risk: adding retries can double-record results.
- Safer option: add the idempotency contract first; retry at the worker layer only.
- Minimum proof to proceed: replayed-request integration test showing one accepted write.
```

---

## Automation & Drift

For every meaningful change, consider one automatable invariant: `Invariant → existing check → proposed automation (follow-up, not piggybacked)`. **Constitution Drift** reports stale, duplicated, conflicting, or repo-contradicted rules: ≤3 bullets, each with evidence; prefer deleting obsolete rules over accreting new ones; never fix drift beyond the scoped change; never turn subjective taste into fake automation. Durable decisions land in the spec's decision log (A2), not in standalone ADRs.

---

# Appendix — The Ousterhout Standards

_"The most fundamental problem in computer science is problem decomposition: how to take a complex problem and divide it up into pieces that can be solved independently."_ — John Ousterhout, *A Philosophy of Software Design*

Root §9's deep-and-boring law, operationalized. Run the five tests on every non-trivial diff:

| # | Principle | One-Line Test |
| --- | --- | --- |
| 1 | **Deep Modules** | Does one call provide high leverage? |
| 2 | **Information Hiding** | Can I swap the implementation without changing callers? |
| 3 | **General Interfaces** | Could this signature exist in an open-source library? |
| 4 | **Complexity Down** | Does the caller need to understand internal orchestration? |
| 5 | **Errors Out** | Am I throwing for a case that could be a valid return value? |