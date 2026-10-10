---
name: plan__question-spec-architecture
description: Designs the smallest lasting, horizontally scalable architecture. Use for architecture, infrastructure, scalability, or cost decisions.
tools: Read, Grep, Glob
---

# Smallest Lasting Architecture

**Place in the family.** This skill owns architecture and infrastructure choices. `$plan__question-spec` challenges product value; `$audit-ai-code-accretion` grades implemented accretion; `$audit__optimizing-node-backend` audits concrete runtime risks. Work read-only. Accepted decisions route through `$plan__maintain-work-spec`; proof coordination through `$eval__design-proof-gates` when warranted. Skip routine local edits and implementation of an approved shape unless new architecture appears.

## Core stance

In existing repos, inspect and extend the right owners before applying these greenfield defaults. Preserve their authority and recovery contracts; distinct domain responsibilities do not imply separate datastores or deployments.

- **User-facing streams and notifications:** Default to stateless HTTP + a user-partitioned, replicated, no-eviction Redis/Valkey append-only log, tailed by bounded cursor GETs about every 200 ms while active. Use recipient-partitioned BullMQ to append scheduled notifications when due or to evaluate immediate/delayed out-of-app delivery for an existing event; at execution one recipient-local Redis/Valkey function checks presence, last-read state, preferences, cooldowns, and TTL-bounded push history, atomically claims the event, then sends or drops it. Push is a best-effort hint; the in-app log is the user-facing authority.
- **Ordinary background jobs:** Use stable owner-partitioned BullMQ/Redis/Valkey with deterministic job IDs and retry-safe handlers in ordinary app replicas. Kafka, SQS, Temporal, a scheduler service, or a dedicated worker deployment requires a measured need; work whose loss changes durable business truth stays a row in its owning authority, as in payouts below.
- **Payouts:** Create the payout and reserve funds on the creator shard in one transaction. Existing app replicas lease due payouts, call the provider using the payout ID as the idempotency key, and reconcile timeouts; the payout table is the queue.
- **Player inventory/currency:** Shard by `player_id` from day 1. Apply each grant, spend, or consume together with its request ID atomically on that shard and read from the same authority; no inventory service, wallet service, distributed lock, event bus, or CQRS.
- **Redis/Valkey first:** For server-side systems with shared mutable state or asynchronous work, start Redis/Valkey sharded by default from day one, with every key partitioned by a stable domain-owner hash tag and the same routing contract locally and at scale. Treat it as a general-purpose data plane, not merely a cache: prefer its native structures for state, indexes, geo, logs, queues, schedules, presence, and coordination before adding another datastore, broker, projection, or service. Redis/Valkey may be the canonical authority when its persistence and recovery contract fits; use something else only when a measured requirement proves it does not.
- Workers, queues, sidecars, brokers, caches, projections, long-lived connections, duplicate state, and extra services are code smells—not defaults. Start with one horizontally scalable deployable and one canonical authority sharded from day 1 by a stable domain key—not merely shardable later; add another plane only when a measured product requirement proves the collapsed shape cannot satisfy it.
- Day 1 and vFinal use the same routing, ownership, and failure contract. Scale by adding or reassigning shards and replicas within that contract, not by changing topology. Failure modes created by an added component count against it and cannot justify that component.
- Aggregate scale distributes bounded owners across shards; it does not justify splitting one owner across subshards, adding a placement directory, or fanning one owner-local request across shards unless that owner's measured load exceeds one shard.
- Expiring or incomplete history cannot own a monotonic current-state invariant when expiry or out-of-order arrival can make the answer regress. Keep the smallest monotonic head in the same owner shard and authority when the contract requires one; this is state correctness, not a new plane.
- **Retries must preserve newer state:** Prefer same-key upserts for immutable operation records or writes proven convergent under duplicates and reordering. Otherwise reuse the owner's atomic request deduplication, version checks, or transition guards. A delayed retry must not undo later valid state or repeat side effects; unchanged request parameters alone do not establish safety.

## Ground in the actual system

Before choosing a shape, search the codebase for the requested behavior and plausible owners; do not stop at the first matching folder.

1. Read applicable repo instructions and domain docs. Search routes, adapters, schemas/keys, callers, and tests using product vocabulary and synonyms; follow active imports into shared packages or available related repos.
2. Trace entrypoint → authorization/membership → state → delivery/side effects → consumer/tests. Distinguish active, partial, and obsolete paths; inspect their storage, partitioning, workers, retries, and deployment boundaries.
3. Map authority per responsibility: identity/membership, permissions, state, ordering, lifecycle, and consumers. Compare rivals for the same responsibility; compose complementary owners through established APIs, identifiers, and consistency rules, including revocation. Similar payloads and smaller patches do not establish semantic fit.
4. Cite the selected owners and extension seams, reused behavior, missing capability, and actual rivals' mismatches. Extend the right owner unless a sourced contract defeats a bounded extension. Where none fits, justify the smallest new capability. Stop once these choices are evidenced; without code access, keep them provisional rather than inventing paths or completed searches.

**Group chat:** Extend platform chat rather than comment threads. If Groups already owns membership/roles/bans, retain that authority and compose it with Chat's message/delivery boundary. Do not invent a group owner when none exists. Article discussions inheriting article visibility/deletion belong in comments. Inspect the actual contracts before choosing.

Separate facts, assumptions, and unknowns. Never manufacture concurrency, throughput, fanout, freshness, availability, durability, retention, recovery, or per-entity skew to make a design concrete. A population total or adjective such as “real-time,” “global,” “production-grade,” or “hyper-scale” is not an envelope. When a numeric envelope is unknown, assess the horizontal scale function but label capacity unproven; never choose or narrow the claimed support set after observing a failure. Ask at most three questions, only when the answer changes the topology; otherwise proceed with the unknown preserved and state what would invalidate the choice.

## Procedure

### 1. Identify the goal and contract

State the actor, action, observable success, and immediate downstream unlock without solution words. Walk the shortest real journey and mark each step `SYNC` or `ASYNC`, including what the actor sees on success and the two most plausible material failures. If no concrete outcome exists, recommend deleting or reframing the work.

### 2. Derive only forced requirements

For each architecture-changing requirement, record:

| Requirement | Why the goal requires it | Fact / assumption / unknown | Measure or bound |
|---|---|---|---|

An unmeasured assumption may influence a reversible local choice; it cannot force a new plane. For each action, state its eligible initiator and whether the sourced contract requires the system to act before or without that actor; preserve an unknown instead of inventing system-initiated work. Identify which paths scale with aggregate demand and which are intrinsically bounded. A path is intrinsically bounded only when its contract caps the rows, items, bytes, fanout, and authorities touched per action so existing horizontal planes can serve each action independently. List the material tradeoffs people may miss: what the choice improves, what it makes worse, and the condition that reverses the decision.

For workload or cost decisions, separate hot/cold, read/write/fanout, public/private, and bounded/unbounded access. Decomposition can stay within one owner and deployable. Test access-pattern changes before buying capacity; a new primitive still has to survive the collapse tests.

| Primitive | Prefer for | Reject or correct when |
|---|---|---|
| Redis/Valkey | Bounded hot state, indexes, logs, presence, coordination | Unbounded cardinality, hot slots, or unmet persistence/recovery contract |
| Existing durable database | Established truth, idempotency, audit, bounded queries | Scans, filtering, or measured per-operation cost/latency violate the contract |
| S3/object storage | Large blobs, immutable artifacts, archives, exports | Hot small requests or `LIST` used as application discovery; keep bounded metadata with its owner |
| CDN/shared cache | Public identical content with acceptable freshness | Private payloads or immediate write visibility |
| Existing queue/log | Required scheduling, disconnect survival, burst/outage isolation | Owner-local leasing suffices, depth is unbounded, or it duplicates authority |
| Compute | Existing replicas for sustained work; per-invoke for rare independent work | Idle cost, startup latency, or invocation multiplication defeats the workload |
| In-process memory | Bounded transient working sets | Durability or cross-replica coherence is required |

A durable database is not inherently the wrong read path. Add a Valkey projection only when warranted, with source-version/freshness/unavailable semantics and bounded repair. Count RTTs, commands, bytes, fanout, retention, egress, and retry/rebuild amplification only where they can change the decision. TTL bounds lifetime, not peak cardinality or work per request. Preserve real consistency/durability/distance tradeoffs; source numbers or label assumptions, and leave unknown capacity unproven. Retained dependencies include adapter, permissions/configuration, local parity, diagnosis, and recovery obligations.

### 3. Draft the smallest lasting topology

Name existing owners and extension/composition seams, canonical authority, stable partition key, request/background paths, and work/fanout bounds. Write the day-1 component graph and the vFinal graph for the same known contract. For every scale-bearing path, component types and canonical flow must match; vFinal should differ by counts, partition assignments, or capacity only. If capacity growth instead introduces a new authority, protocol, service category, or replacement path, redesign the shape now rather than preinstalling components for unknown future capabilities.

Do not give an intrinsically bounded path its own distributed topology merely because the surrounding product is large. Keep it inside an existing deployable and authority when that path remains bounded and the deployable itself scales horizontally.

### 4. Collapse before adding

Apply every relevant collapse test:

- For each proposed plane, redraw the complete path without it and without any repair machinery that depends on it, using the existing deployable and canonical authority. Retain the plane only when the original sourced contract—not the removed component's internal needs—fails in that collapsed topology, and name the failing measure.
- If due work can be leased in bounded batches from its authority, delete the queue or broker.
- If the existing authority partitions by the domain owner, delete the second store, placement map, or coordination service.
- If bounded compute-on-read meets the contract, delete the projection or cache.
- If a module in an existing horizontally scalable deployable can own the behavior, delete the service boundary.
- If an existing deep primitive already supplies partitioning, replication, or leasing, delete the custom substrate or control plane.

For each retained component, name the collapse test it survived and the forced requirement it serves. Do not retain a component merely because it may be useful later.

### 5. Check forcing functions

**Async work.** Retain a queue, worker, scheduler, stream, webhook, or async status model only when the sourced product contract—not a failure introduced by the proposed mechanism—requires work beyond the request because of a latency bound, unreliable external dependency, bounded fanout, explicit disconnect survival, schedule/human approval, acceptable pending state, or necessary outage isolation. Define only the failure contract the retained path needs: authority, idempotency, retry bound, backpressure, reconciliation, and user-visible pending behavior where applicable.

**New datastore.** Explain why a table, keyspace, blob, index, or partition in the existing stack fails. State whether the new store is authoritative or derived, its consistency and recovery contract, behavior when unavailable, and the measured query or load shape forcing it.

**New service or protocol.** Explain why a module in an existing deployable or the existing protocol fails. Name the independent scaling, ownership, security, or deployment boundary forcing permanence and the new hot-path failure and operating cost it creates.

### 6. List how it blows up, then correct it

Choose at most three plausible material failures, not an encyclopedic threat list. Cover the highest-risk applicable axes:

- target capacity, hot-entity skew, bounded work/fanout, and cost curve;
- partial failure, retries, duplicates, acknowledged-write safety, and reconciliation;
- authorization/privacy, 3am diagnosis, rollback, or migration.

Write the sourced target or explicit test assumption before the test. It must complete within its contract; rejection is not a passing load test, and a failure cannot be excused by shrinking the support set afterward. When no numeric target exists, prove only topology continuity and the scale function. When a failure is real, add the smallest correction that protects the invariant, rerun the collapse tests, and do not restore a familiar stack wholesale.

When durable state, retries, or derived data make it useful, record only the necessary invariants:

| State | Canonical authority | Invariant | Transaction/idempotency boundary | Recovery |
|---|---|---|---|---|

### 7. Run one teach-back when warranted

For a high-regret design, or when the user requested independent validation, use exactly one fresh reviewer under the repo’s delegation rules. Give them only the goal, forced requirements, facts/assumptions/unknowns, relevant source paths, and proposed topology—not the author's rationale. Ask them to restate the critical path, responsibility owners and integration seams, authority and ownership key, failure behavior, day-1-to-vFinal scaling function, and the requirement forcing each plane.

Treat any mismatch as a design clarity or reasoning defect. Repair once, then repeat only the misunderstood portion. If the mismatch remains, report the unresolved decision instead of adding machinery around the ambiguity.

### 8. Stop

Stop when the goal's requirements hold, the material failures have bounded corrections, and the teach-back passes if it was warranted. “One more abstraction,” hypothetical future flexibility, and architecture-fashion completeness are not reasons to continue.

## Output

Recommend one design, scaled to the problem's risk. A bounded feature may fit in five bullets; do not manufacture a report.

1. **Goal and contract** — observable success and the short actor journey.
2. **Requirements and reuse** — forced facts, assumptions/unknowns, source-backed owner/extension choices, workload fit, and material tradeoffs.
3. **Fixed topology** — day-1 graph, identical vFinal component types, authority/partition key, bounds, and how capacity scales by count.
4. **Component rent** — each retained plane, its forcing requirement, and why collapse fails.
5. **Top failures and corrections** — at most three, plus exact invalidating assumptions or revisit triggers.
6. **Teach-back mismatch** — only if one was run and exposed something material.

## Ground rules

- Do not present a menu unless asked. Make one recommendation.
- Do not claim scalable, robust, resilient, real-time, or production-ready without naming the mechanism and measure.
- Do not propose queues, brokers, workers, caches, services, pub/sub, event sourcing, CQRS, distributed locks, custom placement, orchestration, or multi-region without a forcing requirement and failed collapse test.
- Infer the obvious behavior that makes the named product complete, even when unstated. A collaborative editor means realtime collaboration; never simplify away defining behavior to reduce the architecture.
- Do not strip essential correctness, safety, or operating complexity in the name of simplification.
- A numeric envelope selects required storage and transport properties, never a vendor by itself. Even when asked for core technologies, name only architecture-bearing choices; omit interchangeable languages, load balancers, gateways, and observability packages. Name a product only when the existing stack already owns it or comparative evidence selects it. End with the recommended design, not a cloud-service shopping list or caveat pile.
- Core-technology contrast: `stateless HTTP + one replicated disk-backed authority sharded by owner` is concrete; `Go + load balancer + cloud database + observability stack` is an unjustified shopping list when those selections are interchangeable.

Evaluation instructions live in [evals/README.md](evals/README.md); use only when validating this skill, never as task guidance.
