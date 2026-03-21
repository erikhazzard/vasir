# Backend Inserts

Use this only for advanced composition when the backend profile is close but not exact.

## Suggested Routing Examples

* If touching `/src/api/`, read `/src/api/AGENTS.md` first.
* If touching `/src/jobs/` or `/src/workers/`, read the queue/worker manifest before changing retry logic.
* If touching `/db/`, `/migrations/`, or raw SQL paths, read the data-layer manifest before editing queries.

## Suggested Global Constraints

* **Dependencies:** No new ORM, queue, auth, or observability dependency without explicit approval.
* **Migrations:** All schema changes must follow expand -> migrate -> contract.
* **Retries:** Never add blind retries without an idempotency key and a bounded backoff policy.
* **Secrets:** Do not hardcode credentials or add new environment variables without documenting ownership.

## Suggested Landmines

* Transport success may not mean business success; some endpoints intentionally fail closed in headers or body fields.
* Background jobs may be at-least-once; duplicate delivery must be safe.
* Reads may require tenant, region, or soft-delete filters even when the ORM path looks "safe."

## Suggested Philosophy

* Prefer schema-first changes over hidden implicit shape drift.
* Prefer explicit contracts at async boundaries over convenience wrappers.
* Do not "simplify" guardrails that exist to protect retries, replay, or backpressure behavior.
