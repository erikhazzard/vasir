# AGENTS.md: [Project Name] Root Manifest
<!-- vasir:profile:backend -->

> EDIT THESE FIRST
> 1. Rewrite the `Purpose` block below in 2-3 repo-specific sentences.
> 2. Replace the routing bullets in Section 1 with the real API, jobs, and data-layer paths in this repo.
> 3. Delete any queue, worker, or migration rule that is not true here.

**Last Updated:** [YYYY-MM-DD - update alongside major architectural PRs]
<!-- vasir:purpose:start -->
**Purpose:** [Describe this backend repository in 2-3 repo-specific sentences. Replace this block first. State the core API or system contract, what correctness means here, and what agents must optimize for.]
<!-- vasir:purpose:end -->

---

## 1. Topography & Routing Protocol (The Map)

This root file contains only global rules. For domain-specific logic, you MUST read the scoped agent files before modifying code in those directories.

* **API Surface:** If touching `/src/api/` or `/app/api/`, read the API manifest before changing request or response behavior.
* **Async Work:** If touching `/src/jobs/`, `/src/workers/`, or queue consumers, read the worker manifest before changing retry or delivery behavior.
* **Data Layer:** If touching `/db/`, `/migrations/`, or raw SQL paths, read the data manifest before editing queries or schemas.
* **Cold Storage:** Do not read `/docs/legacy/` unless explicitly instructed by the user.

---

## 2. Immutable Global Constraints (The "Hard No's")

These are absolute laws of the codebase. Violating these will break correctness, replay safety, or operability.

### Toolchain & Environment
* **Package Manager:** [Replace with repo truth, e.g. "NEVER use npm. We strictly use bun."]
* **Dependencies:** Do not introduce new runtime libraries without explicit user permission.
* **Migrations:** Schema changes must follow expand -> migrate -> contract.

### Core Anti-Patterns (Pre-Training Adversaries)
* **Retries:** Never add blind retries without an idempotency key and bounded backoff.
* **Database Safety:** Never assume the ORM applies tenant, region, or soft-delete filters on raw SQL paths.
* **Hidden Semantics:** Never treat `200 OK` as business success unless the endpoint contract explicitly says so.

---

## 3. The "Non-Obvious" Architectural Landmines

Do not attempt to "fix" or simplify these patterns unless you have verified why they exist.

* **Delivery Semantics:** Some jobs or events are at-least-once. Duplicate delivery must be safe.
* **Silent Failure Surfaces:** Some endpoints intentionally report transport success while encoding business state in headers or body fields to avoid retry storms.
* **Soft Deletes / Multitenancy:** Reads may require explicit filters even when the default path looks safe.

---

## 4. Engineering Philosophy & Mandates

Write code that matches the team's operating culture, not generic backend defaults.

* **Schema First:** Prefer explicit contract changes over shape drift through implementation details.
* **Error Handling:** Use the repo's explicit error envelope or tuple pattern instead of flow-control exceptions.
* **No Premature Abstractions:** Prefer duplication over abstractions that hide retries, transactions, or boundary semantics.
* **Typing:** Strict typing only. If a type is unknown, use `unknown` and add a type guard.
* **Comments:** Only write "why" comments when business or systems constraints force a non-obvious path.

---

## 5. The Execution & Recap Protocol (Initial Trajectory)

Before you generate any code, stabilize your context window.

1. **The "Why":** State the user journey or system contract the change unlocks.
2. **The "Where":** List the exact files you intend to modify.
3. **The "Gotchas":** Name the delivery, retry, schema, or data-integrity constraint that applies here.
4. **Approval:** If this repo wants explicit human gating, wait for the user to say `Proceed` before writing code.

```txt
<Plan>
// Your analysis goes here...
</Plan>
```
