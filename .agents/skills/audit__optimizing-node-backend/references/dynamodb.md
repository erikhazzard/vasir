# DynamoDB Audit Reference
## Auditor Posture
Audit DynamoDB access-patterns, not API calls in isolation. Reconstruct the user story, key condition, index used, item collection size, filter selectivity, consistency requirement, partition heat, capacity mode, pagination behavior, retry behavior, and idempotency requirement before assigning severity.

Do not call a pattern bad merely because it looks suspicious. A `Scan` in a hot request path can be Critical; a checkpointed migration scan on isolated capacity may be acceptable. A `FilterExpression` over a million-item tenant partition is a design smell; a filter over a bounded 10-item partition may be fine. Strong consistency can be wasteful, but it may be required for correctness.

The goal is to identify the DynamoDB risks most likely to cause latency, throttling, runaway cost, partial data, duplicate mutation, or data corruption under real workload.

## Context to Extract

- Table PK/SK and item shape
- LSIs and GSIs: keys, projection type, projected attributes
- Capacity mode: on-demand or provisioned
- Item size and item collection cardinality
- Access pattern: exact user story the query supports
- Expected selectivity before and after filtering
- Hot tenants/keys and write distribution
- Consistency requirement
- Pagination behavior
- Consumed capacity, throttles, latency, retry counts
- Whether code is hot request, admin, backfill, migration, stream processor, or batch job

## Hard Flags

Flag strongly when observed in hot/shared production paths:

- `Scan` on large/shared table without isolation or strict limits
- missing `LastEvaluatedKey` handling for `Query` or `Scan`
- `BatchGetItem`/`BatchWriteItem` without retry/merge handling for `UnprocessedKeys`/`UnprocessedItems`
- mutating write that should be idempotent or concurrency-safe but lacks `ConditionExpression`
- read-modify-write without conditional write, transaction, or atomic update expression
- low-cardinality or monotonic partition key causing hot partition risk
- retrying writes without idempotency

## Calibrated Checks

### Scan

- Hot request path + large/shared table = Critical/High.
- Admin/offline/migration path = evaluate page size, rate limiting, isolated capacity/table, blast radius, and checkpointing.
- Parallel scan is for controlled batch work, not hot request latency.

### Query + FilterExpression

A filter reduces returned payload, not read capacity consumed.

Flag when:

- pre-filter item collection is large or unbounded
- filter drops most rows
- partition is hot
- user-facing latency/cost matters
- access pattern should be represented in PK/SK or GSI

De-escalate when:

- partition cardinality is small and bounded
- filter is for defense-in-depth after selective key condition
- admin/offline path
- consumed capacity is measured and acceptable

Avoid arbitrary thresholds unless the codebase provides SLO/cost targets.

### Consistency

- Strong reads cost more than eventual reads where both are supported.
- GSIs do not support strongly consistent reads.
- Strong consistency may be required for balances, auth boundaries, read-after-write confirmation, inventory, or invariants.
- Do not recommend eventual consistency without naming stale-read risk.

### Pagination

Flag when code assumes one page is complete.

Check:

- `LastEvaluatedKey`
- limit/page size
- caller contract: one page vs all results
- backpressure when fetching all pages
- timeout/cancellation across pages

### Batch APIs

- `BatchGetItem`: up to 100 items / 16 MB response; can return partial results.
- `BatchWriteItem`: up to 25 put/delete operations / 16 MB request; can return unprocessed items.
- Finding should focus on retry with backoff, merge/deduplication, idempotency, and caller-visible partial result behavior.

### Hot Partitions

Flag:

- tenant ID as partition key when one tenant can dominate
- date/timestamp/monotonic keys
- global counters
- low-cardinality status/type keys
- writes concentrated into one item collection

Evidence may require metrics or key-distribution assumptions.

### Conditional Writes / Idempotency

Flag missing `ConditionExpression` when:

- create should fail if item exists
- update should enforce version/state transition
- idempotency key should prevent duplicate mutation
- optimistic locking is expected
- retry can replay a mutation

### Transactions

Transactions are useful for multi-item invariants but cost and latency more.

Flag when:

- transaction protects no real invariant
- conditional write would suffice
- idempotency is missing
- transaction spans hot items
- caller does not handle cancellation/conflict/retry correctly

### GSI / Projection

Check:

- Does the index match the access pattern or just enable filtering?
- Are projected attributes minimal for query needs?
- Does projection inflate write/storage cost?
- Can GSI throttling/backlog affect writes?
- Is eventual consistency acceptable?
- Is the GSI partition key hot?

## Verification Signals

- `ReturnConsumedCapacity`
- CloudWatch consumed read/write capacity
- throttled requests
- successful request latency
- user error vs system error counts
- retry counts
- Contributor Insights / hot key telemetry if enabled
- item collection size samples
- table/index size and item size
- trace spans with DDB operation, table, index, key condition, page count

## Example Calibrations

- `ScanCommand` in an Express handler over `Users` table is likely Critical/High.
- `ScanCommand` in a one-off migration with checkpointing and isolated capacity is not Critical by default.
- `Query + FilterExpression` on a partition capped at 10 items is not a meaningful cost issue.
- `ConsistentRead: true` on a table read may be correct; on a GSI it is invalid/unsupported.
- `BatchWriteItem` that ignores `UnprocessedItems` can silently drop intended writes unless caller retries and reconciles.