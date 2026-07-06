# Backend Inserts

<!-- vasir:purpose:start -->
**Purpose:** [Describe this backend repository in 2-3 repo-specific sentences. Replace this block first. State the core API or system contract, what correctness means here, and what agents must optimize for.]
<!-- vasir:purpose:end -->

<!-- vasir:engineering-doctrine-inserts:start -->
# Backend Development Canon

Scope: all backend runtime code and its infrastructure in this repo. These mandates are hard-won and load-bearing; they bind by default. Precedence: a narrower `AGENTS.md` may tighten a rule or grant a named exception only where a rule says so; the approved Work Spec / eval plan may grant a per-lane exception only where a rule says so. Laws live here once — other sections and docs cite them, never restate them.

---

## 1. Backend Runtime Canon

- Runtime: Node v22+
- Language: plain JavaScript. No TypeScript.
- Modules: ESM in `.js` files by default. Stronger repo-local module or file-extension conventions win when present.
- Local dev: no Docker unless a local infra rule explicitly says otherwise.
- `npm run start` must start the API server and all long-lived worker lanes (worker wiring rule: §8).
- Use native `fetch` where applicable — it's built in; no HTTP client dependency.
- Tests: Mocha by default. Stronger repo-local test-runner conventions win when present.

---

## 2. Backend I/O Boundaries and Adapter Mandates

All environment-specific I/O goes through sanctioned repo-owned adapters — one boundary per dependency keeps keys, auth, retries, and env handling in one audited place.

Applies to: Redis/Valkey; DynamoDB/Postgres/SQLite/etc.; S3/object storage; SQS, queues, streams, and worker lanes; external APIs; cloud services; auth/session providers; filesystem boundaries where repo policy defines an adapter; browser/runtime bridges where an applicable `AGENTS.md` defines one.

Rules:

- No ad-hoc clients. Redis/Valkey, DynamoDB, S3, SQS, external APIs, and cloud services are accessed through `src/adapters/*` or an existing repo-owned boundary.
- Never bypass existing key builders, env modules, auth helpers, or persistence adapters. Redis keys come from `src/keys.js`, never hand-rolled; Redis clients come only from `src/db/redis-factory.js` or `src/db/redis-factory-shared.js`.
- `process.env` is read only inside the repo-owned config boundary (backend default: `src/env.js`). An env constant used by more than one module is defined once there and imported.
- If an adapter lacks a needed capability, extend the adapter minimally and prove it with integration tests.
- Test-side parity for these boundaries is governed by §10: real local services; mocks/stubs on value paths only by documented Work Spec / eval-plan exception.

---

## 3. Performance Doctrine — Quantified Hot-Path Budget

Assume production-scale load unless an applicable `AGENTS.md` narrows it.

Default planning lens:

- Assume at least `1,000,000` sustained events/messages/requests per relevant hot-path class where applicable. Spikes may be materially higher.
- p95 latency budgets come from repo specs, production SLOs, or an applicable `AGENTS.md`. If budget sources disagree, use the strictest target and name the discrepancy.
- A hot path is any per-frame, per-message, per-request, per-presence-update, per-stream-entry, per-worker-item, or high-fanout read/write path.

Hot-path changes MUST NOT add, unless explicitly justified in the approved plan — every item below is a per-message multiplier, and at a million messages the multiplier is the whole budget:

- network round-trips;
- Redis/Valkey command cardinality per delivered message/request;
- synchronous CPU work per message;
- per-message JSON parse/stringify;
- per-message object spread or large allocations;
- regex compilation inside loops;
- unbounded scans, maps, sets, arrays, queues, or stream reads;
- per-message logging.

A performance budget is required for material backend changes. It must state:

- expected extra calls/RTTs;
- allocation changes;
- Redis/Valkey/Dynamo/S3/API command count;
- batching strategy;
- bound, TTL, or pagination limit;
- p95 or throughput impact if measurable;
- why the change remains inside budget.

---

## 4. Backend API Shape

Design routes around client/player jobs, not internal storage — the client's first meaningful step is the unit of design, not the table.

- Prefer one canonical entrypoint per user journey; the first meaningful client step should usually be possible with one bounded request.
- Do not expose CRUD-shaped endpoints just because tables, caches, or adapters are shaped that way.
- Do not force clients to stitch one conceptual object across sibling endpoints.
- Split endpoints only for hard boundaries: unbounded/paginated data; materially different auth/ACL; materially different cache/consistency/performance budget; separate lifecycle ownership.
- Aggregated responses carry explicit limits, pagination, TTL, or cache semantics where relevant.

---

## 5. Multiplayer Product-Truth Doctrine

For multiplayer, presence, lobbies, rooms, public spaces, matchmaking, replay, or social surfaces, start from player-facing reality before backend mechanics.

Before architecture, answer:

- What does the player believe they joined?
- Who does the player believe is present?
- What does resume, reconnect, leave, return, spectate, or transition mean on this surface?
- What continuity unit is sacred to the player?
- What participation unit is sacred to the player?

Rules:

- Do not lead with shard, cell, affinity, server, cap, or match mechanics. Those are implementation constraints, not the product truth.
- Treat the player's perceived participation unit and continuity unit as sacred product truth.
- If the product promise is shared/public presence, degrade fidelity before degrading existential presence. Lower detail, lower update rate, coarser representation, local throttling, and prioritization are acceptable tradeoffs when named.
- Silently making people "not really there" because of partitioning is not acceptable unless explicitly approved as product behavior.
- Optimize for strangers as well as friends when the journey implies public approachability. Do not design public-space visibility/presence only around party/friend affinity if the user journey implies "anyone here should be seeable/approachable."
- Keep semantic place above runtime shell. `matchId` stays bounded and useful, but it is not automatically the player-facing identity for every multiplayer surface.
- Treat instancing as an explicit authored product decision, not a default overflow escape hatch.
- Separate multiplayer archetype from runtime strategy. Do not universalize bounded-match assumptions across public worlds, public heats, persistent spaces, async sessions, or future modes.
- Internal bounds remain mandatory, but do not let internal boundedness rewrite player-facing reality unless the product explicitly chooses that tradeoff.

---

## 6. Read Models, Caches, and Serving Paths

**Projection judgment.** Do not reject Valkey because it is "not truth"; make it truth-backed with `state/sourceVersion/dirty/unavailable` semantics. The mistake is using DynamoDB as the default read path when a repairable Valkey projection is the cheaper/faster product path.

**Hot serving default.** If a pair-page/social-graph fragment can be served by a bounded Valkey key/ZSET/HASH, default to Valkey as the hot serving path. DDB is durable truth, idempotency, audit, and rebuild source — kept as minimal canonical truth, never a second serving model. Valkey is the only healthy hot serving model. This gives durability without paying double.

**Admission contract.** Every new cache or read model — Valkey or otherwise — declares, before landing:

- key cardinality bound;
- max bytes per key;
- TTL or eviction strategy;
- staleness tolerance;
- fill strategy;
- cache-miss behavior;
- slotting/partitioning strategy;
- invalidation or refresh owner;
- data classification: public, private, per-user, per-game, per-room, or global.

**Avoid caching by default when:**

- the data is per-user/private and would explode key count;
- query shapes are unbounded;
- payload size is unknown or large;
- churn would cause constant refills;
- correctness requires immediate write visibility;
- the read is low-QPS/admin/debug only.

**For public or browse-heavy endpoints, prefer:**

```text
CDN/shared cache → bounded Valkey/read model → database fallback on bounded cache miss
```

---

## 7. Redis / Valkey Cluster Safety

Treat Valkey/Redis as cluster-sharded from day one. New caches/read models declare the §6 admission contract; this section is the wire-level mechanics.

- Never use `KEYS` — it scans the whole keyspace and blocks the shard.
- No unbounded reads, anywhere, and especially not on hot paths: `XRANGE`/`XREVRANGE`/`SCAN`, list, set, sorted-set, queue, and stream reads all name an explicit bound — `COUNT`, limit, pagination, or TTL.
- Prefer `UNLINK` over `DEL` for off-path cleanup — memory reclaim happens off the event loop.
- Lua scripts are allowed only when they collapse RTTs without changing semantics or hiding failure modes.
- No cross-slot multi-key operations. Multi-key operations are allowed only when an applicable `AGENTS.md` explicitly allows the pattern and the keys are intentionally colocated.
- Never pin a hot keyspace to one hash slot through constant `{tenant}` / `{scope}` tags — that is a self-inflicted hot shard. Use partition-first hash tags with a stable partition count derived from the entity key for scalable read models and leaderboards.
- Every new hot read model ships a test or script proving distribution across slots/partitions; any change that depends on cluster-safe slotting or distribution adds an integration test.

---

## 8. Workers, Retries, and Long-Lived Loops

- Assume at-least-once delivery, duplication, partial failure, and reordering outside a single process tick — design for the world that exists.
- Side-effecting handlers must be idempotent when retries, duplicates, replays, or partial failures are possible.
- Worker loops must have explicit shutdown behavior. Do not rely on process shutdown or event-loop drain for correctness — crashes and SIGKILL skip both.
- Network and I/O paths must have a timeout or abort strategy where applicable.
- Long-lived worker lanes (`src/workers/<lane>/run.js`) are wired into `scripts/start.js` in the same change, unless the Work Spec explicitly scopes them elsewhere.

---

## 9. Infrastructure Parity — Ship the Wiring With the Feature

A feature is incomplete if production wiring, local parity, and policy tests do not move with the code.

When adding or changing: AWS/cloud SDK calls; secrets; env vars; queues/streams; object storage paths; database tables/indexes; worker entrypoints; container command paths; externally reachable endpoints; cloud dependencies —

the same active lane must include:

- infrastructure declaration/update;
- IAM/permission update where applicable;
- local-dev bootstrap analog or documented local substitute;
- CI/policy/integration test proving the wiring exists;
- env module update and comments;
- rollback/recovery note.

Examples:

- New AWS SDK action → corresponding IAM policy update.
- New secret/env var → `src/env.js`, local-dev equivalent, and infrastructure declaration.
- New script referenced by ECS/Terraform task command → copied into the Docker image and covered by a policy/integration check.
- New service dependency → local/sandbox parity path and CI/policy assertion when practical.

Rules:

- Local stubs that do not enforce production permissions do not count as proof of production readiness.
- When backend application code introduces or changes a cloud dependency, update the matching infrastructure contract in the same active lane.

Before editing infrastructure, read: `infra/README.md`, `infra/AGENTS.md`.

---

## 10. Backend Testing

Backend behavior changes require value-path integration tests.

Rules:

- Do not run `npm run test`; it may take hours. Run one Mocha file at a time, always with `--exit` — open handles hang the runner otherwise:

```bash
mocha <filepath> --exit
```

### Data/service parity

- Redis/Valkey tests must hit real local Redis.
- DynamoDB behavior tests must use DynamoDB Local when applicable.
- S3 behavior tests should use the repo-approved local/sandbox S3 equivalent when applicable.
- Do not use in-memory mocks, pseudo-tables, or local fallback paths for production behavior tests unless the eval plan / Work Spec explicitly documents the exception. (This is the single home of the mock-exception rule; §2 defers here.)

### Redis test isolation

- Each spec file must use a unique `{NS, SCOPE}` via the repo's `uniqueScope(prefix)` pattern.
- `beforeEach` must wipe relevant Redis clusters for that `{NS, SCOPE}` using the repo's wipe helper.
- Do not reuse `NS`, `SCOPE`, or Redis clients across spec files.

### Test organization

- Prefer semantically grouped files such as:
  - `test/<semantic-folder-name>/<feature-name>__e2e.spec.js`
  - `test/<semantic-folder-name>/<feature-name>__<focused-path>.spec.js`
- Avoid both extremes: one giant file and many one-test files.
- If a spec exceeds the repo's practical context limit, create a narrowly scoped companion spec instead of appending more cases.

---

## 11. Backend Logging and Errors

- Use the centralized logger for backend source code: `logger` from `src/util/logger.js`, never `console.log`.
- Do not log secrets, tokens, or PII.
- Do not add per-message logs on hot paths (§3 — logging is a per-message multiplier).
- Logs must include enough bounded context to debug: relevant IDs; route/job name; scope; operation; failure category.
- Bare `catch {}` blocks are forbidden. `catch` blocks must rethrow, log with context, or narrow to a specific expected error and rethrow/log everything else.
- User-facing generic errors are not observability.

---

## 12. Backend Data and Migration Discipline

- Prefer one runtime path. Do not add long-lived dual-write or dual-read paths unless the approved Work Spec explicitly requires migration/rollback compatibility.
- Soft ban on `schemaVersion` and versioning — stale shapes are migrated, not versioned.
- Do not bake versions into route paths, filenames, Redis keys, S3 prefixes, or durable identifiers unless the approved Work Spec requires an explicit coexistence/migration window — and then the versioned artifact carries its removal condition in the same spec (Expand → Migrate → Contract; no permanent second way).

---

## 13. Autonomous / Long-Running Process Discipline

You may run long-running scripts, evals, and service flows. You may not leave a process running unbounded, sitting silently for hours, when the result should return quickly.

When running any long service or test flow:

- Start processes with a tracked PID/session.
- Poll at bounded intervals.
- If no useful output after ~5 minutes, inspect process state.
- If a test/script exceeds its expected duration, kill it and report the artifact.
<!-- vasir:engineering-doctrine-inserts:end -->
