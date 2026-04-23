# Verification Reference

## Tool Selection Matrix

| Claim type | Best verification | Do not use |
|---|---|---|
| Pure CPU function is slow | `mitata`, CPU profile, flamegraph | HTTP load test alone |
| Allocation-heavy hot path | `mitata`, heap allocation profile, GC traces | DDB/Valkey metrics |
| Event-loop blocking | `monitorEventLoopDelay`, ELU, CPU profile | mitata only |
| HTTP endpoint p99 | k6/autocannon/wrk + traces | mitata |
| N+1 downstream calls | trace span count, downstream call count vs item count | microbenchmark |
| Valkey command/server latency | SLOWLOG, latency monitor, commandstats, trace spans | mitata |
| DynamoDB cost/throttle | `ConsumedCapacity`, CloudWatch, throttles, key distribution | mitata |
| Memory leak | heap snapshots over time, RSS/heap trend, GC logs | single benchmark run |
| Retry storm | retry count, timeout count, downstream error/throttle rate | CPU microbenchmark |
| Serverless cold start | cold/warm split, init duration, package/import profile | steady-state mitata |
| Connection-pool contention | socket/pool metrics, traces, load test | pure-function benchmark |

## mitata Rules

Use `mitata` only for steady-state CPU-bound or allocation-heavy JavaScript comparisons.

Good mitata targets:

- parser/serializer/formatter
- pure validation function
- local transformation
- hashing/encoding wrapper when I/O is absent
- allocation-heavy helper
- comparing two local implementations under representative inputs

Bad mitata targets:

- Valkey commands
- DynamoDB calls
- HTTP clients
- queue processing
- end-to-end endpoint latency
- cold start
- connection pooling
- retry behavior
- distributed locking
- cache stampede

## mitata Plan Format

Use this only when mitata is appropriate.

```text
Benchmark plan:
  - Tool: mitata
  - File: benchmarks/<name>.bench.js
  - Compare: <current function> vs <alternative>
  - Inputs: <fixed seed, representative size distribution, edge cases>
  - Warmup/control: <how to avoid one-time setup and dead-code elimination>
  - Metrics: ops/s, p50/p99 if available, allocation/heap delta if relevant
  - Pass criteria: <specific threshold, e.g. alternative ≥1.3x ops/s with no allocation regression>
  - Caveat: validates local CPU/allocation only, not end-to-end latency
````

## Load / Integration Plan Format

Use for HTTP, Valkey, DynamoDB, queues, serverless, or distributed behavior.

```text
Verification plan:
  - Claim: <finding being tested>
  - Tool/signal: <k6/autocannon/traces/CloudWatch/SLOWLOG/profile/etc.>
  - Scenario: <traffic shape, concurrency, payload, tenant/key distribution>
  - Baseline: <current p50/p95/p99/cost/error/throttle>
  - Change to validate: <suggested direction>
  - Pass criteria: <metric movement expected>
  - Guardrail: <correctness, cost, stale-read, memory, dependency load>
```

## Verification Signal Examples

* “If this N+1 Valkey finding is real, trace spans per request should scale linearly with `users.length`, and p99 should correlate with list size.”
* “If this DDB filter is costly, `ReturnConsumedCapacity` should be high relative to returned item count.”
* “If this sync JSON path blocks the event loop, event-loop delay p99 should spike with payload size.”
* “If retries are amplifying overload, retry attempts per request and downstream throttle rate should rise together.”

````

---
