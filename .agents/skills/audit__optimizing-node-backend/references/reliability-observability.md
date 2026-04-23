## Failure-Mode Questions

For each downstream call or mutation, ask:

- What is the caller deadline?
- What is the per-call timeout?
- What happens after timeout: cancellation, retry, fallback, partial result, error?
- Can the operation be safely retried?
- What prevents duplicate mutation?
- What happens if downstream is slow, partially unavailable, throttling, or returning partial success?
- Does retry amplify overload?
- Is there backpressure or load shedding?
- Can operators see the failure in metrics/traces/logs?

## Timeout / Deadline Checks

Flag:

- outbound HTTP/fetch/SDK calls with no timeout/deadline
- timeout not wired to cancellation/AbortController where applicable
- per-call timeout longer than caller/request timeout
- retries continuing after caller deadline
- queue visibility timeout shorter than worst-case processing time
- DB/cache calls relying only on vague client defaults

De-escalate when:

- platform enforces a stricter deadline and cancellation is propagated
- SDK/client defaults are explicit, appropriate, and observed
- call is offline/admin with bounded blast radius

## Retry Checks

Retries require:

- idempotency or safe read-only semantics
- exponential backoff
- jitter
- max attempts / retry budget
- timeout budget awareness
- classification of retryable vs non-retryable errors
- metrics for attempts, final failures, and retry exhaustion

Flag retry loops that can create retry storms or duplicate writes.

## Idempotency Checks

Flag mutating endpoints/jobs/events without idempotency when:

- client may retry
- queue/event source may redeliver
- handler may timeout after partial success
- network failure can hide success
- operation creates payment/order/inventory/account state
- batch retry can repeat successful item writes

Look for idempotency key storage, conditional writes, unique request IDs, dedup windows, and replay-safe state transitions.

## Circuit Breaking / Load Shedding / Bulkheads

Do not demand a circuit breaker everywhere.

Flag missing protection when:

- dependency failure can cascade
- fan-out multiplies dependency load
- high-QPS endpoint calls fragile downstream
- retries continue during throttling/outage
- queues can grow without bound
- one tenant can consume shared worker capacity

## Backpressure

Inspect:

- stream pipelines and `pipeline()` error handling
- queue consumer concurrency
- batch size vs timeout
- producer rate vs consumer capacity
- memory buffering while downstream is slow
- unbounded internal queues
- fan-out work without semaphore/limit

## Logging / Tracing / Metrics

Flag observability gaps that block diagnosis:

- no correlation/request ID propagation
- no trace spans around downstream calls
- logs lack tenant/user/request/job identifiers
- errors swallowed or logged without stack/type/cause
- errors thrown as strings/plain objects
- hot-path `console.log` or unstructured high-cardinality spam
- no metrics for latency percentiles, error rate, retries, throttles, queue lag, event-loop delay, cache hit rate, DDB consumed capacity, Valkey command latency

## Symptom vs Cause Metrics

Use both:

- **Symptom:** request latency, error rate, timeout rate, saturation visible to users
- **Cause:** event-loop delay, CPU, heap/GC, DDB throttles/consumed capacity, Valkey latency/slowlog, downstream p99, queue depth, retry count

A finding is stronger when it connects a code pattern to both a symptom and a cause metric.

## Verification Signals

- HTTP: p50/p95/p99, timeout rate, status codes, trace critical path
- Queue: depth, age, lag, retries, DLQ rate, processing duration
- Retry: attempts per request, retry-exhaustion count, downstream throttle/error rate
- Idempotency: duplicate delivery test, conditional write conflicts, replay test
- Observability: trace coverage, correlation ID continuity, log search by request/job ID