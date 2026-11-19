# Node Runtime Audit Reference

## Context to Extract
- Node version/runtime: bare Node, Express/Fastify/Nest, Lambda/serverless, worker, queue consumer
- Request/job type: hot endpoint, admin path, cron, migration, queue, CLI
- Payload size: request body, response body, JSON size, file size, batch size
- Workload: QPS, concurrency, burst size, list cardinality, tenant skew
- Evidence: p95/p99, event-loop delay, event-loop utilization, CPU profile, heap snapshot, GC logs, RSS/heap trend, traces

## Hot-Path Latency Checks

Flag when on a hot path or unbounded input:

- sync crypto: `pbkdf2Sync`, `scryptSync`, `randomBytes` sync form in request path
- sync compression/zlib, filesystem, child process
- large `JSON.parse`, `JSON.stringify`, `structuredClone`, schema validation, template rendering
- catastrophic-regex risk on user-controlled input
- CPU-heavy loops, sorting, aggregation, hashing, encoding, image/file transforms
- per-request initialization of clients, schemas, regexes, serializers, parsers, SDK clients
- N+1 Valkey/DDB/HTTP calls
- unbounded fan-out: `Promise.all(items.map(...))` where `items` is user/db-controlled
- sequential awaits where independence is clear and bounded concurrency would preserve correctness
- no cancellation propagation after timeout/client disconnect

## De-escalators

Do not flag, or lower severity, when:

- list length is statically bounded and small
- sequential order is semantically required
- framework compiles schema/validator once
- operation is admin/offline and isolated from user traffic
- payload is capped by schema/body limit and cap is visible
- CPU work runs in a worker thread or separate worker service with backpressure

## Worker Pool / Worker Thread Distinction

- Worker threads help CPU-bound JavaScript.
- Async crypto/zlib/fs may still saturate libuv’s worker pool.
- Moving I/O to worker threads rarely helps and can add overhead.
- Look for high concurrency over async crypto/zlib/fs/DNS plus default worker-pool limits.

## HTTP / Connection Checks

Look for:

- per-request HTTP/SDK client construction
- missing keep-alive/agent reuse where client does not manage pooling
- unbounded sockets or no max connection policy
- no timeout/deadline on outbound calls
- timeout not connected to cancellation
- retry loops that keep sockets busy after caller deadline
- no DNS/TLS/connection reuse consideration on hot outbound paths

## Serverless Checks

For Lambda/serverless handlers, inspect:

- heavy imports or initialization on cold start
- clients created inside handler instead of module scope when safe
- connection reuse across invocations
- handler timeout vs downstream timeout alignment
- event-source retries and idempotency
- memory setting too low for CPU-bound work
- batch event partial-failure behavior
- queue visibility timeout vs handler timeout

## Memory & GC Checks

Flag:

- global `Map`/`Set`/object caches without max size, TTL, or cleanup
- arrays/accumulators that grow with traffic
- event listeners not removed
- closures retaining large request/user/buffer objects
- buffered streaming: `await response.text()`, `arrayBuffer()`, `Buffer.concat()` for large data
- allocation size derived from untrusted input
- per-request large object graphs
- logging large objects in hot paths

## Verification Signals

- CPU-bound claim: CPU profile, flamegraph, mitata for pure function, event-loop utilization
- event-loop stall: `monitorEventLoopDelay` p95/p99, ELU, blocked-request traces
- fan-out/N+1: trace spans per request, downstream call count, p99 vs item count
- connection churn: socket counts, connection reuse metrics, TLS/DNS timing
- memory leak: heap snapshots over time, RSS/heap trend, GC pause duration/frequency
- serverless cold start: init duration, cold/warm split, package/import profile

## Example Calibrations

- `for await` over paginated API may be correct; do not replace with parallel fan-out if API ordering/rate limits matter.
- `Promise.all` over three fixed calls is not unbounded fan-out; still check timeout and cancellation.
- `JSON.parse` of a 2 KB body is not a finding. `JSON.parse` of 5 MB on a hot endpoint likely is.