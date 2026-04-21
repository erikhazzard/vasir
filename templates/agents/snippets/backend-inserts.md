# Backend Inserts

## 1. Backend Runtime Canon

- Runtime: Node 22 LTS.
- Language: plain JavaScript. No TypeScript.
- Modules: ESM with `.js` files only. Do not create `.mjs`.
- Local dev: no Docker unless a scoped infra rule explicitly says otherwise.
- Local start command: `npm run start` must start the API server and all long-lived worker lanes.
- When adding `src/workers/<lane>/run.js`, wire it into `scripts/start.js`.
- Use native `fetch` where applicable.
- Use Mocha for backend tests.

---

## 2. Backend I/O Boundaries and Adapter Mandates

All environment-specific I/O must go through sanctioned repo-owned adapters.

Applies to:

- Redis/Valkey;
- DynamoDB/Postgres/SQLite/etc.;
- S3/object storage;
- SQS, queues, streams, and worker lanes;
- external APIs;
- cloud services;
- auth/session providers;
- filesystem boundaries where repo policy defines an adapter;
- browser/runtime bridges where scoped `AGENTS.md` defines one.

Rules:

- Do not create ad-hoc clients.
- Do not bypass existing key builders, env modules, auth helpers, or persistence adapters.
- Redis/Valkey, DynamoDB, S3, SQS, external APIs, and cloud services must be accessed through `src/adapters/*` or an existing repo-owned boundary.
- Do not hand-roll Redis keys; use `src/keys.js`.
- Do not create new Redis clients outside `src/db/redis-factory.js` or `src/db/redis-factory-shared.js`.
- Do not read `process.env` outside `src/env.js`.
- New env constants used by more than one module must be defined once in `src/env.js` and imported.
- If an adapter lacks a needed capability, extend the adapter minimally and prove it with integration tests.
- Do not mock/stub I/O in value-path tests unless the Work Spec/eval plan explicitly documents why real or local parity is impossible.

---

## 3. Performance Doctrine — Quantified Hot-Path Budget

Assume production-scale load unless the scoped `AGENTS.md` narrows it.

Default planning lens:

- Assume at least `1,000,000` sustained events/messages/requests per relevant hot-path class where applicable.
- Spikes may be materially higher.
- p95 latency budgets must come from repo specs, production SLOs, or scoped `AGENTS.md`.
- If latency-budget sources disagree, use the strictest target and name the discrepancy.
- A hot path is any per-frame, per-message, per-request, per-presence-update, per-stream-entry, per-worker-item, or high-fanout read/write path.

Hot-path changes MUST NOT add, unless explicitly justified in the approved plan:

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

Design routes around client/player jobs, not internal storage.

- Prefer one canonical entrypoint per user journey.
- The first meaningful client step should usually be possible with one bounded request.
- Do not expose CRUD-shaped endpoints just because tables, caches, or adapters are shaped that way.
- Do not force clients to stitch one conceptual object across sibling endpoints.
- Split endpoints only for hard boundaries:
  - unbounded/paginated data;
  - materially different auth/ACL;
  - materially different cache/consistency/performance budget;
  - separate lifecycle ownership.
- Aggregated responses must have explicit limits, pagination, TTL, or cache semantics where relevant.

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
- Treat the player’s perceived participation unit and continuity unit as sacred product truth.
- If the product promise is shared/public presence, degrade fidelity before degrading existential presence.
- Lower detail, lower update rate, coarser representation, local throttling, and prioritization are acceptable tradeoffs when named.
- Silently making people “not really there” because of partitioning is not acceptable unless explicitly approved as product behavior.
- Optimize for strangers as well as friends when the journey implies public approachability.
- Do not design public-space visibility/presence only around party/friend affinity if the user journey implies “anyone here should be seeable/approachable.”
- Keep semantic place above runtime shell. `matchId` stays bounded and useful, but it is not automatically the player-facing identity for every multiplayer surface.
- Treat instancing as an explicit authored product decision, not a default overflow escape hatch.
- Separate multiplayer archetype from runtime strategy.
- Do not universalize bounded-match assumptions across public worlds, public heats, persistent spaces, async sessions, or future modes.
- Internal bounds remain mandatory, but do not let internal boundedness rewrite player-facing reality unless the product explicitly chooses that tradeoff.

---

## 6. Cache / Read-Model Admission Guardrails

Every new cache or read model must declare:

- key cardinality bound;
- max bytes per key;
- TTL or eviction strategy;
- staleness tolerance;
- fill strategy;
- cache miss behavior;
- slotting/partitioning strategy;
- invalidation or refresh owner;
- whether the data is public, private, per-user, per-game, per-room, or global.

Avoid caching by default when:

- the data is per-user/private and would explode key count;
- query shapes are unbounded;
- payload size is unknown or large;
- churn would cause constant refills;
- correctness requires immediate write visibility;
- the read is low-QPS/admin/debug only.

For public or browse-heavy endpoints, prefer:

```text
CDN/shared cache → bounded Valkey/read model → database fallback on bounded cache miss
````

---

## 7. Redis / Valkey Cluster Safety

Treat Valkey/Redis as cluster-sharded from day one.

Rules:

* Never use `KEYS`.
* Never use unbounded `XRANGE`, `XREVRANGE`, `SCAN`, list reads, set reads, or sorted-set reads.
* Never use unbounded list/set/zset reads on hot paths.
* Every stream/range/read path must specify `COUNT`, limit, TTL, or another explicit bound.
* Stream/range reads must include explicit `COUNT`.
* Prefer `UNLINK` over `DEL` for off-path cleanup.
* Lua scripts are allowed only when they collapse RTTs without changing semantics or hiding failure modes.
* Do not perform cross-slot multi-key operations.
* Multi-key operations are allowed only when the scoped `AGENTS.md` explicitly allows the pattern and the keys are intentionally colocated.
* Do not pin hot keyspaces to one hash slot with constant hash tags.
* Hot keyspaces must not be pinned to one hash slot through constant `{tenant}` / `{scope}` tags.
* Use partition-first hash tags with stable partition counts for scalable read models.
* For scalable read models and leaderboards, prefer partition-first hash-tags with a stable partition count derived from the entity key.
* Any new hot read model must include a test or script proving distribution across slots/partitions.
* Add an integration test when a change depends on cluster-safe slotting or distribution.

Every new Valkey cache/read model must declare:

* key cardinality bound;
* max bytes per key;
* TTL or eviction strategy;
* fill strategy;
* cache-miss behavior;
* slotting strategy;
* whether the data is public/shared or private/per-user.

Prefer not to cache in Valkey when:

* the query shape is unbounded;
* payload size is unknown;
* payload size is large;
* data is high-churn;
* correctness requires immediate write visibility;
* key cardinality would scale with private per-user state.

---

## 8. Workers, Retries, and Long-Lived Loops

* Assume at-least-once delivery, duplication, partial failure, and reordering outside a single process tick.
* Side-effecting handlers must be idempotent when retries, duplicates, replays, or partial failures are possible.
* Worker loops must have explicit shutdown behavior.
* Network and I/O paths must have timeout or abort strategy where applicable.
* Do not rely on process shutdown or event-loop drain for correctness.
* Long-lived worker lanes must be wired into `scripts/start.js` unless the Work Spec explicitly scopes them elsewhere.

---

## 9. Infrastructure Parity — Ship the Wiring With the Feature

A feature is incomplete if production wiring, local parity, and policy tests do not move with the code.

When adding or changing:

* AWS/cloud SDK calls;
* secrets;
* env vars;
* queues/streams;
* object storage paths;
* database tables/indexes;
* worker entrypoints;
* container command paths;
* externally reachable endpoints;
* cloud dependencies.

The same approved scope must include:

* infrastructure declaration/update;
* IAM/permission update where applicable;
* local-dev bootstrap analog or documented local substitute;
* CI/policy/integration test proving the wiring exists;
* env module update and comments;
* rollback/recovery note.

Examples:

* New AWS SDK action → corresponding IAM policy update.
* New secret/env var → `src/env.js`, local-dev equivalent, and infrastructure declaration.
* New script referenced by ECS/Terraform task command → copied into the Docker image and covered by a policy/integration check.
* New service dependency → local/sandbox parity path and CI/policy assertion when practical.

Rules:

* Local stubs that do not enforce production permissions do not count as proof of production readiness.
* When backend application code introduces or changes a cloud dependency, update the matching infrastructure contract in the same approved scope.

Before editing infrastructure, read:

* `infra/README.md`
* `infra/AGENTS.md`

---

## 10. Backend Testing

Backend behavior changes require value-path integration tests.

Rules:

* Do not run `npm run test`; it may take hours.
* Use Mocha with `--exit`.
* Run one Mocha file at a time:

```bash
mocha <filepath> --exit
```

### Data/service parity

* Redis/Valkey tests must hit real local Redis.
* DynamoDB behavior tests must use DynamoDB Local when applicable.
* S3 behavior tests should use the repo-approved local/sandbox S3 equivalent when applicable.
* Do not use in-memory mocks, pseudo-tables, or local fallback paths for production behavior tests unless the eval/Work Spec explicitly documents the exception.

### Redis test isolation

* Each spec file must use a unique `{NS, SCOPE}` via the repo’s `uniqueScope(prefix)` pattern.
* `beforeEach` must wipe relevant Redis clusters for that `{NS, SCOPE}` using the repo’s wipe helper.
* Do not reuse `NS`, `SCOPE`, or Redis clients across spec files.

### Test organization

* Prefer semantically grouped files such as:

  * `test/<semantic-folder-name>/<feature-name>__e2e.spec.js`
  * `test/<semantic-folder-name>/<feature-name>__<focused-path>.spec.js`
* Avoid both extremes: one giant file and many one-test files.
* If a spec exceeds the repo’s practical context limit, create a narrowly scoped companion spec instead of appending more cases.

---

## 11. Backend Logging and Errors

* Use the centralized logger for backend source code.
* Do not use `console.log`; use `logger` from `src/util/logger.js`.
* Do not log secrets, tokens, or PII.
* Do not add per-message logs on hot paths.
* Logs must include enough bounded context to debug:

  * relevant IDs;
  * route/job name;
  * scope;
  * operation;
  * failure category.
* Bare `catch {}` blocks are forbidden.
* `catch` blocks must rethrow, log with context, or narrow to a specific expected error and rethrow/log everything else.
* User-facing generic errors are not observability.

---

## 12. Backend Data and Migration Discipline

* Prefer one runtime path.
* Do not add long-lived dual-write or dual-read paths unless the approved Work Spec explicitly requires migration/rollback compatibility.
* Soft ban on `schemaVersion` and versioning.
* Do not bake versions into route paths, filenames, Redis keys, S3 prefixes, or durable identifiers unless [SOURCE CUT OFF HERE — complete this condition before committing].