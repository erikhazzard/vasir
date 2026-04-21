# Evaluation Suite
## Baseline Failure Test

Give a 200-line Express handler that:

- calls `KEYS user:*` in request path
- uses unbounded `Promise.all` over returned keys
- performs DDB `Scan` with `FilterExpression`
- ignores `LastEvaluatedKey`
- calls `fetch` without timeout
- swallows errors in `catch`

Ask: “Can you review this for perf?”

Expected skill behavior:

- Produces audit, not rewrite
- Ranks `KEYS`/unbounded fan-out/hot-path DDB scan above weaker issues
- Explains DDB filter read-cost issue
- Flags missing timeout/cancellation
- Includes falsifiers and verification signals
- Includes coverage matrix

Failure:

- Emits rewritten handler
- Uniform severity
- Praises `FilterExpression`
- Recommends mitata for Valkey/DDB
- No falsifiers

## Trigger Tests

1. Should trigger: “Audit this Express route for perf” + `ioredis` code.
2. Should trigger: “Why is my Lambda slow?” + DDB-heavy handler.
3. Should trigger: “Review our Redis key design for hot keys and TTLs.”
4. Should trigger: “This queue worker times out under load.”
5. Should not trigger: “Write a new Express route that caches profiles.”
6. Should not trigger: “Explain what this code does.”
7. Should not trigger: “Review this React component for rerenders.”
8. Borderline: “Refactor this for readability.” Should not trigger unless performance/resource framing is added.

## Posture Tests

1. User says: “Optimize this.” Expected: audit findings only; no patch.
2. User says: “Go ahead and fix it.” Expected: strict audit-only response; no diff.
3. User asks for code after audit. Expected: state implementation is separate; no code under this skill.

Failure: any rewritten handler, patch, or diff.

## Severity Calibration Tests

1. `KEYS *` in hot endpoint vs missing TTL on cache key. Expected: `KEYS` higher severity.
2. `Promise.all` over exactly three static dependencies. Expected: not unbounded fan-out; still check timeout.
3. Sequential awaits where each result determines next query. Expected: no naive parallelization finding.
4. DDB `Scan` in nightly migration with checkpointing and isolated capacity. Expected: not Critical by default.
5. DDB `Scan` in user-facing handler on shared table. Expected: Critical/High.
6. `Query + FilterExpression` over partition capped to 10 items. Expected: Low or no issue.
7. `Query + FilterExpression` over tenant partition with millions of items and 90% filtered. Expected: High.
8. Strongly consistent read for financial balance. Expected: not flagged as cost optimization unless stale read is acceptable.
9. Valkey durable leaderboard key without TTL. Expected: no “slow leak” unless retention/ownership unclear.
10. Valkey session key without TTL. Expected: Medium/High depending cardinality and cleanup.

## Domain-Specific Quality Tests

1. Pipeline vs transaction:
   - Code uses `multi().set().set().exec()` only to batch independent cache writes.
   - Expected: flag transaction/latency mismatch.
   - Failure: says “pipeline/multi is fine” or conflates terms.

2. Transaction needed:
   - Code uses pipeline for two writes that must be atomic.
   - Expected: flag correctness issue.
   - Failure: praises pipeline.

3. DDB batch:
   - Code uses `BatchWriteItem` and ignores `UnprocessedItems`.
   - Expected: flag partial-write/retry issue.
   - Failure: says batch write succeeds atomically.

4. DDB GSI:
   - GSI projects all attributes but query needs two fields.
   - Expected: flag write/storage amplification with cost tradeoff.
   - Failure: generic “use GSI” advice.

5. Valkey lock:
   - `SET lock foo NX` without expiry.
   - Expected: Critical/High depending path; mention dead lock and ownership/fencing.
   - Failure: only says “add Redis lock.”

## Verification Discipline Tests

1. User asks: “Benchmark my Valkey client with mitata.”
   - Expected: explain mitata is wrong for I/O; suggest load/integration + Valkey metrics.
   - Failure: writes mitata harness around Valkey calls.

2. User asks to compare two pure JSON formatting functions.
   - Expected: mitata plan with representative inputs and caveats.
   - Failure: suggests k6 only.

3. High finding claims DDB filter cost.
   - Expected: verification via `ReturnConsumedCapacity`, returned count, CloudWatch.
   - Failure: no verification signal.

4. High finding claims event-loop blocking.
   - Expected: event-loop delay/ELU/CPU profile signal.
   - Failure: only says “this is slow.”

## Observability Quality Tests

Input: code has DDB query, Valkey cache, queue consumer, and fetch call, but no metrics/traces.

Expected:

- Flags missing correlation ID/trace spans only where diagnosis is materially affected
- Names symptom and cause metrics
- Does not make observability the top severity unless it blocks diagnosis of a severe failure
- Connects observability to specific findings

Failure:

- Generic “add logging”
- No metric names
- Observability listed as Critical without concrete blast radius

## Edge-Case Robustness Tests

1. Framework compiles validation schema once. Expected: no per-request compilation finding.
2. SDK retry policy explicitly configured with jitter. Expected: do not flag missing retries; inspect idempotency and timeout budget.
3. Serverless handler creates DDB client inside function. Expected: flag cold-start/connection reuse only if repeated per invocation.
4. Queue worker batch retry can duplicate successful writes. Expected: idempotency finding.
5. Large file path uses stream pipeline with backpressure. Expected: no buffered-stream finding.

## Coexistence Test

Input includes:

- bad external API shape causing clients to overfetch
- bad runtime pattern causing N+1 DDB calls
- weak test coverage

Expected:

- This skill reports only runtime/cost/failure findings.
- Interface design and test-quality findings are not duplicated unless directly tied to runtime behavior.

Failure:

- Skill turns into API design review or test audit.