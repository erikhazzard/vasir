---
name: critiquing-architecture-designs
description: Critiques architecture proposals by forcing a user-journey-first simplification pass, happy-path sequence, complexity inventory, and minimal replacement design. Use when reviewing architecture plans, multi-step features, worker or queue proposals, client protocols, or new infrastructure added "for scale".
category: architecture
tags:
  - architecture
  - review
  - simplification
  - queues
  - protocols
recommends: []
version: 0.1.0
---

# Critiquing Architecture Designs

Challenge the design until the simplest production-safe version survives. Assume the current plan is overfit until it proves otherwise.

## Core Principle

If you cannot explain the happy path in 15 lines or fewer, the design is too complex. Delete moving parts until you can.

## Quick Reference

- Start with the requirement, not the mechanism. If the system does not materially improve a user loop or business metric, recommend deleting the ticket.
- Restate the problem in 3-5 sentences without solution words. No queues, workers, caches, or services in the problem statement.
- Walk the end-to-end user journey as actor -> action -> system response, marking each step `SYNC` or `ASYNC`, and include success plus the top 2 failure experiences.
- List constraints as `FACT` or `ASSUMPTION` with risk. Ask at most 3 questions only when a missing constraint would change the architecture.
- Inventory moving parts and label each `REQUIRED`, `OPTIONAL`, or `PATCH`. A `PATCH` exists only to fix problems created by other complexity.
- Replace the plan with something 30-50% simpler: 1-3 components, one durable source of truth, usually 1-3 endpoints, and no queue or worker unless you can name the exact requirement forcing async.
- Run four kill-tests on the simplified design: load spike, cost curve, failure modes, and 3am operability. End with the new recommended design and a deletion list.

## Implementation Patterns

### Pattern 1: Happy-path sequence in under 15 lines

```md
1. User clicks "Save notification rules". [SYNC]
2. API validates payload and writes one row in the primary database. [SYNC]
3. API returns the saved rule set in the same response. [SYNC]
4. UI shows "Saved" and renders the new rules. [SYNC]

Failure 1:
5. If validation fails, API returns 400 with the exact field error. [SYNC]
6. UI keeps the draft open and highlights the invalid field. [SYNC]

Failure 2:
7. If the database write fails, API returns 503 with a retryable error code. [SYNC]
8. UI preserves the draft and shows "Could not save. Try again." [SYNC]
```

### Pattern 2: Complexity inventory that exposes fake scale work

```md
Current plan:
| Item | Label | Why |
|---|---|---|
| API service | REQUIRED | User needs a request boundary |
| Postgres | REQUIRED | Durable source of truth |
| Redis queue | OPTIONAL | Added for "future scale", not a stated requirement |
| Worker | PATCH | Only exists because the write path was split |
| Read cache | PATCH | Only needed because worker makes state temporarily inconsistent |

Simplified replacement:
- Components: API service + Postgres
- Data model: `notification_rules(id, user_id, rules_json, updated_at)`
- Endpoint: `PUT /notification-rules`
- Critical path: validate -> write row -> return saved row
```

### Pattern 3: Kill-test the simplified design before approving it

```md
Load spike: PASS
- Degrades by higher write latency first; requests fail with 503 instead of silent backlog growth.

Cost curve: PASS
- Growth variable is row count in one table; cost is predictable and indexable.

Failure modes: PASS
- Primary DB down -> request fails closed.
- Retry safety -> same idempotency key updates the same row.

Operability: PASS
- Debug at 3am with requestId, userId, endpoint latency, DB error rate, and one table to inspect.
```

## Anti-Patterns

- Do not defend the original plan just because it already exists. First ask what user outcome it unlocks and whether the system should exist at all.
- Do not describe the problem in solution words like queue, worker, cache, or pipeline. That bakes complexity into the premise.
- Do not keep async infrastructure unless a stated constraint actually forbids a synchronous path.
- Do not accept multiple diverging states by default. Prefer one durable source of truth and derive everything else.
- Do not label assumptions as facts. Missing constraints must stay visibly uncertain.
- Do not end with a balanced essay. End with a decisive recommended design.

## Checklist

- [ ] The user journey is written as a short `SYNC` / `ASYNC` sequence.
- [ ] Constraints are separated into facts and assumptions.
- [ ] Every moving part is labeled `REQUIRED`, `OPTIONAL`, or `PATCH`.
- [ ] The replacement design is materially simpler than the original.
- [ ] No queue or worker remains without an explicit forcing requirement.
- [ ] Load, cost, failure, and operability kill-tests all pass.
- [ ] The response ends with one recommended design, not a hedge.
