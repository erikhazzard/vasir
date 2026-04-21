# Backend Inserts

## Performance Doctrine — Quantified Hot-Path Budget

For backend, realtime, multiplayer, presence, messaging, worker, stream, leaderboard, matchmaking, inventory, analytics, or cache/read-model work, assume production-scale load unless the scoped AGENTS.md narrows it.

Default planning lens:
- ≥ 1,000,000 sustained events/messages/requests per relevant hot-path class where applicable.
- Spikes may be materially higher.
- p95 latency budgets must come from repo specs, production SLOs, or scoped AGENTS.md. If sources disagree, use the strictest target and name the discrepancy.
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

Performance Budget required for material changes:
- expected extra calls/RTTs;
- allocation changes;
- Redis/Valkey/Dynamo/S3/API command count;
- batching strategy;
- bound/TTL/pagination limit;
- p95 or throughput impact if measurable;
- why the change remains inside budget.


## Multiplayer Product-Truth Doctrine

For multiplayer, presence, lobbies, rooms, public spaces, matchmaking, replay, or social surfaces, start from player-facing reality before backend mechanics.

Before architecture, answer:
- What does the player believe they joined?
- Who does the player believe is present?
- What does resume, reconnect, leave, return, spectate, or transition mean on this surface?
- What continuity unit is sacred to the player?
- What participation unit is sacred to the player?

Rules:
- Do not lead with shard, cell, affinity, server, cap, or match mechanics. Those are constraints, not the product truth.
- If the product promise is shared/public presence, degrade fidelity before degrading existential presence.
- Lower detail, lower update rate, coarser representation, local throttling, and prioritization are acceptable tradeoffs when named.
- Silently making people “not really there” because of partitioning is not acceptable unless explicitly approved as product behavior.
- Optimize for strangers as well as friends when the journey implies public approachability.
- Treat instancing as an explicit authored product decision, not a default overflow escape hatch.
- Separate multiplayer archetype from runtime strategy; do not universalize bounded-match assumptions across public worlds, persistent spaces, async sessions, or future modes.


## Adapter Mandates
All environment-specific I/O must go through sanctioned repo-owned adapters.

Applies to:
- Redis/Valkey;
- DynamoDB/Postgres/SQLite/etc.;
- S3/object storage;
- queues/streams;
- external APIs;
- auth/session providers;
- filesystem boundaries where repo policy defines an adapter;
- browser/runtime bridges where scoped AGENTS.md defines one.

Rules:
- Do not create ad-hoc clients.
- Do not bypass existing key builders, env modules, auth helpers, or persistence adapters.
- Do not mock/stub I/O in value-path tests unless the WIP/eval plan explicitly documents why real or local parity is impossible.
- If an adapter lacks a small capability, propose the minimal adapter extension and prove it with a value-path integration test.

## Infrastructure Parity — Ship the Wiring With the Feature

A feature is incomplete if production wiring, local parity, and policy tests do not move with the code.

When adding or changing:
- AWS/cloud SDK calls;
- secrets;
- env vars;
- queues/streams;
- object storage paths;
- database tables/indexes;
- worker entrypoints;
- container command paths;
- externally reachable endpoints;

the same change must include, inside approved scope:
- infrastructure declaration/update;
- IAM/permission update where applicable;
- local-dev bootstrap analog or documented local substitute;
- CI/policy/integration test proving the wiring exists;
- env module update and comments;
- rollback/recovery note.

Local stubs that do not enforce production permissions do not count as proof of production readiness.


## Cache / Read-Model Admission Guardrails

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
CDN/shared cache → bounded Valkey/read model → database fallback on bounded cache miss.


## Redis/Valkey Cluster Safety

Assume sharded/cluster topology from day one.

Rules:
- Never use `KEYS`.
- Never use unbounded `XRANGE`, `XREVRANGE`, `SCAN`, or list/set/zset reads on hot paths.
- Stream/range reads must include explicit `COUNT`.
- Prefer `UNLINK` over `DEL` for off-path cleanup.
- Do not pin hot keyspaces to one hash slot with constant hash tags.
- Use partition-first hash tags with stable partition counts for scalable read models.
- Cross-slot multi-key operations are forbidden unless the scoped AGENTS.md explicitly allows the pattern and the keys are intentionally colocated.
- Any new hot read model must include a test or script proving distribution across slots/partitions.