---
name: code__enforcing-principles
description: >-
  Frames material contract, state, security, hot-path, migration, dependency, and operational risk for concrete repo changes.
  Trigger: use when one of those non-local risks is present or uncertain; skip routine local edits, obvious quick fixes, and abstract discussion.
---

# Production Code Change Protocol

Use this protocol when a change has a material non-local risk boundary. The job is the smallest safe diff that solves the evidenced problem, protects that boundary, and preserves repo coherence.

**Place in the system.** Root owns workflow, proof proportionality, lifecycle, and completion. This protocol owns material-risk classification, contract vocabulary, migration, and observability judgment. Accepted findings from `$audit-ai-code-accretion` are implementation inputs, never authority to bypass this protocol when deletion crosses a material boundary. Tags identify risks; they never create a test, gate, harness, eval plan, artifact, audit, substantial lane, or extra stop. For a substantial lane, surviving risk/contract judgment lands in work-spec §4–§5; an eval plan is used only when durable proof coordination is genuinely warranted. It never spawns a rival plan.

---

## Prime Directives

- **Challenge the premise.** Do not implement until the repo shows the problem is real or the behavior is explicitly desired. Abort before design when: the repo already solves it · the request contradicts an explicit product/security/contract invariant · the problem is unevidenced and the change adds risk · the safest fix is docs/config/operator workflow, not code · proceeding would require inventing contract behavior · the change creates a permanent second way with no removal plan. Aborting is a boundary report (root §3), not a failure.
- **Repo evidence beats taste.** Never invent "repo standards" — cite the files, tests, configs, scripts, and docs actually inspected. **Hard invariants beat repo precedent; repo precedent beats novelty.**
- **Proof scales with risk; the risky boundary controls the work.** Tests, observability, rollout, and reviewer notes exist to prove the place reality can break.
- **No fake confidence.** Missing facts are `Unknown`; assumptions are `Tentative`; every downstream claim that depends on one is tagged.
- **One clear path** (root §9): no duplicate paths unless the old path dies in the same change or the work runs Expand → Migrate → Contract. **No drive-by cleanup** (root §8): nothing refactored, reformatted, renamed, or modernized outside the scoped change.

---

## Routing Gate

1. **Material non-local risk?** Use this skill only for a contract, persisted/async state, security/privacy, hot path/capacity, migration/skew, dependency/build, or operational boundary whose failure could cause meaningful harm. If the change is a routine local edit or obvious quick fix, return to normal implementation without producing protocol output.
2. **Concrete repo change?** If the ask is "thoughts," "strategy," or "is this right?" with no proposed edit, discuss only.
3. **Name the risk boundary** — the exact place this change can break reality:
   - `Risk boundary: match-event ingest → queue enqueue; replayed requests can create duplicate jobs.`
   - `Risk boundary: old game bundles reading a launcher-manifest field they do not know.`
   - `Risk boundary: Character3D equip path; extra allocations can create frame hitches.`
   - `Risk boundary: backfill touching persisted player-save rows.`
   - `Risk boundary: none found; private rename with no emitted behavior change.`

Expected files and symbols are reconnaissance, not the boundary. Expanding touchpoints is allowed when the same approved unlock, public contract, authority/data owner, rollback shape, and product behavior remain intact; record the discovery and continue. Stop only when one of those changes, not because the initial file forecast was incomplete. Never use touchpoint expansion for unrelated cleanup.

---

## Risk Classification

**Change tags** (assign all that materially apply — tags identify risk classes, not automatic machinery):

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

## Tags → Material-risk questions

Each tag names the claim/failure class that must be resolved and any contract that must be explicit. A row is satisfied by sufficient existing evidence, a warranted proof obligation, or an authorized narrowed claim; it does not demand an eval-plan gate:

| Tag | Claim / plausible failure to resolve | Contract entries (spec `C-###`) |
| --- | --- | --- |
| C0 | inspect the diff for no emitted change; run a targeted cheap check only when build/generated output could move | — |
| C1 | reuse an existing focused guard; add characterization at the local public boundary only where behavior is otherwise unknown | — |
| C2 | smallest credible behavior proof at the risky user/operator boundary; existing proof may suffice, and visibility alone does not imply browser/integration | — |
| C3 | serialized/wire/generated shape drift that breaks a supported consumer | schema + compatibility + empty/missing/error semantics |
| C4 | duplicate, replay, ordering, partial-failure, concurrency, or recovery invariant failure | delivery semantics, ordering, idempotency, retry/timeout owners |
| C5 | sourced budget or observed hot-path/capacity regression under representative work | perf budget / hot-path contract |
| C6 | unauthorized allow, privileged-data leak, or fail-open trust-boundary behavior | authz invariant, data class, redaction |
| C7 | old/new/coexistence, resume, rollback, or irreversible migration failure | compatibility window, removal condition |
| C8 | dependency/build/generated output changes unexpectedly or introduces a known applicable advisory; inspect only decision-relevant release notes/advisories | — |

For deterministic-lane surfaces, root §2 binds on top of all of this (kernel RNG, `idv.Math`, harnesses count, replay depth).

---

## Work Sizing (root §4 vocabulary — no parallel lane system)

- **Quick change:** root §4's small, known, bounded change whose tag obligations can be satisfied inline. C0/C1 and narrow single-surface C2 changes are common examples; a narrow, reversible C3/C8 change can also remain quick when the contract/build risk is already guarded.
- **Substantial lane:** root §4's milestone-, coordination-, new-instrument-, or durable-proof-shaped work. Unknown or cross-authority boundaries and most C4–C7 changes usually qualify; a tag or file count alone does not.
- **Hotfix mode** (active or imminent production/user harm): state the signal proving harm; smallest reversible patch; no irreversible migrations; no unrelated redesign; verify the specific failure mode; name rollback, deferred proof, and the follow-up regression/design work explicitly.

---

## Repo Reality Check (before any design claim)

Inspect the minimum relevant set: symbols/callers/generated sources · tests at the boundary · config/flags/build scripts · existing logs/metrics/traces/alerts · migration and rollback patterns · dependency files when C8 · docs/decision logs · recent *adjacent* precedent (never extrapolate from unrelated legacy code). Then state: problem check · risk boundary · existing path, contract, tests, observability, rollout · precedent with file paths · `Unknowns` · `Tentatives`.

**Safe-design comparison (root §9).** First fix the explicit outcome and evidenced invariants at the named risk boundary. If repo evidence does not otherwise distinguish among safe candidates, prefer the candidate introducing fewer material commitments across this protocol's owned surfaces: contracts, authority, persisted state, topology, rollout/skew, dependencies, and operations. Each additional commitment needs an explicit requirement or forcing fact. Line count and configurability are not proxies.

**Never write:** "the repo standard is…" without file evidence · "this is safe because it is simple" · "this should not affect performance" without naming the boundary · "add tests later" · "rollback is redeploy" when data, flags, caches, clients, queues, or generated artifacts are involved.

---

## Contract Vocabulary (state as spec §5 `C-###`s when touched)

Authority / write owner · delivery semantics (`at-most-once | at-least-once | effectively-once`) · ordering (none / per-key / total, + key) · idempotency key + dedupe scope · **retry owner — one exclusive layer** · timeout/deadline owner · time authority (`serverTime | clientTime`) · replay behavior · read visibility/consistency · conflict resolution · schema/versioning · generated-code source of truth.

```md
- Retry owner: queue worker only; API handler does not retry.
- Timeout owner: API deadline 800ms; worker downstream call timeout 2s.
- Overflow: reject enqueue with 503 when queue depth > 50k.
```

---

## Failure Pre-Mortem (up to 3 material failures)

`Outcome → Invariant → existing evidence or warranted guard → Signal`

Catastrophic menu: data loss/corruption · unsafe duplicate effect · stale/conflicting state shown to users · authz bypass / privacy leak · abuse/replay/rate-limit bypass · unbounded memory/queue growth · backpressure collapse · event-loop stall / frame hitch · retry storm / fan-out amplification · rollout or version-skew break · tail-latency blowup · irreversible bad migration · generated-artifact drift.

```md
- Unsafe duplicate match result → one accepted result per (matchId, playerId) → unique dedupe row plus replay proof when no equivalent guard exists → duplicate_reject_total.
```

---

## Migration Discipline (C7)

- **Expand → Migrate → Contract.** Expand: new shape works while old still works. Migrate: move producers/consumers/data gradually with validation. Contract: remove old only after the compatibility window and evidence. Never skip Expand while old clients or consumers exist — **never rely on immediate client adoption.**
- **Compatibility matrix, all four cells:** old→old, old→new, new→old, new→new producer/consumer.
- **Feature flags:** name, default, owning component, scope, success metric, kill behavior, removal trigger, tests for both states. **No permanent flags.**
- **Backfills:** batch size · checkpoint + resume · idempotency · dry-run · validation query · abort criteria · rate limit · rollback or compensating action · the irreversible step named with its blast-radius bound.
- **Direct deploy, after explicit human approval for that production target,** only when ALL hold: no contract change, no persisted-shape change, no coexistence, no remote-behavior change, no security change, no hot-path uncertainty, no skew — and rollback is an ordinary redeploy with zero data cleanup.

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

Choose the highest-fidelity double that stays deterministic; when an eval plan exists its gate card records the choice: **real local dependency** (local DB, in-memory queue with production serialization) > **hermetic contract-preserving fake** (allowed when the risk is not inside the dependency) > **contract test** (required when the risk is wire shape, schema, generated code, or producer/consumer compatibility) > **mock** (only outside the risk boundary) > **snapshot** (only when the serialized output IS the contract) > **visual** (only when visual state IS the contract). A mocked-away risk boundary is fake proof: a replay bug needs the real unique constraint, not a mocked dedupe store; a schema change needs the serialized response, not the mapper's unit test.

---

## Result When Invoked

Return only the material classification, exact risk boundary, affected contract or invariant, smallest safe response, warranted verification, and any real unknown or boundary. Add no fields for a routine edit that should not have invoked this skill.

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

When a stable material invariant cannot be protected cheaply enough by existing evidence, consider automation; do not create follow-up machinery just because a change is meaningful. **Constitution Drift** reports only stale, duplicated, conflicting, or repo-contradicted rules that affect the active lane: ≤3 bullets with evidence. Prefer deleting obsolete rules over accreting new ones; never fix drift beyond scope or automate subjective taste. Durable decisions land in work-spec §9.

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
