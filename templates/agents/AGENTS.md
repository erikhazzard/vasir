# AGENTS.md: [Project Name] Root Manifest
<!-- vasir:profile:generic -->

> EDIT THESE FIRST
> 1. Rewrite the `Purpose` block below in 2-3 repo-specific sentences.
> 2. Replace the example routing block in Section 1 with real repo lanes, or run `vasir agents draft-routing --write`.
> 3. Create any scoped `AGENTS.md` files that Section 1 points at, or collapse those rules back into this root file.
> 4. Delete any line that is not true in this repo.
> 5. If this repo is mostly backend, frontend, or iOS code, rerun `vasir agents init <profile> --replace` for a better starter.

**Last Updated:** [YYYY-MM-DD - update alongside major architectural PRs]
<!-- vasir:purpose:start -->
**Purpose:** [Describe this repository in 2-3 repo-specific sentences. Replace this block first. State the product or user loop, what correctness means here, and what agents must optimize for.]
<!-- vasir:purpose:end -->

---

## 1. Topography & Routing Protocol (The Map)

This root file contains only global rules. For domain-specific logic, you MUST read the scoped agent files before modifying code in those directories.

<!-- vasir:routing:start -->
* **[Example] Network Sync:** If touching `/src/network/`, you must first read `/src/network/AGENTS.md`.
* **[Example] AI Agent Logic:** If modifying NPC behaviors, read `/src/ai/AGENTS.md` before proceeding.
* **[Example] Frontend/UI:** See `/src/ui/AGENTS.md` for custom hydration, rendering, or accessibility rules.
* **Cold Storage:** Do not read files in `/docs/legacy/` unless explicitly instructed by the user.
<!-- vasir:routing:end -->

---

## 2. Immutable Global Constraints (The "Hard No's")

These are absolute laws of the codebase. Violating these will break the build, destroy determinism, or degrade performance.

### Toolchain & Environment
* **[Example] Package Manager:** NEVER use `npm`. We strictly use `bun`.
* **[Example] Dependencies:** Do not introduce new third-party libraries without explicit user permission.
* **[Example] CI/CD:** Do not suggest formatting churn. We use locked tooling; the repo handles formatting separately.

### Core Anti-Patterns (Pre-Training Adversaries)
* **[Example] Determinism:** NEVER use `Math.random()`. Use the seeded RNG utility approved by this repo.
* **[Example] Game Loop:** NEVER place state-mutating logic inside a generic render/update pass when the repo requires a deterministic tick.
* **[Example] Memory:** Avoid per-frame or per-request allocations in hot paths when the repo already provides a pool or reusable buffer strategy.

---

## 3. The "Non-Obvious" Architectural Landmines

Do not attempt to "fix" or optimize these patterns unless you have verified why they exist.

* **[Example] State Authority:** The client NEVER dictates authoritative state. Inputs flow to the server as intents.
* **[Example] Database Quirks:** We use soft deletes globally. The ORM may not handle this automatically for raw SQL paths.
* **[Example] Silent Failures:** Some endpoints intentionally return transport success while encoding state in headers or body fields to avoid retry storms.

---

## 4. Engineering Philosophy & Mandates

Write code that matches the team's actual operating culture, not generic public-code defaults.

* **No Premature Abstractions:** Prefer duplication over bad abstractions. If a utility is used in fewer than three places, keep it inline.
* **Error Handling:** Do not use `try/catch` for control flow if the repo uses a structured error-return convention.
* **Typing:** Strict typing only. No `any`. If a type is unknown, use `unknown` and write a type guard.
* **Comments:** Do not write "what" comments. Only write "why" comments when the implementation deviates from the obvious path.

---

## 5. The Execution & Recap Protocol (Initial Trajectory)

Before you generate any code, stabilize your context window.

1. **The "Why":** State the engineering unlock or user journey we are solving for in 1-2 sentences.
2. **The "Where":** List the exact files you intend to modify. Do not touch files outside this list without asking.
3. **The "Gotchas":** Acknowledge which specific constraint from Section 2 or 3 applies to this task.
4. **Approval:** If this repo wants explicit human gating, wait for the user to say `Proceed` before writing code.

```txt
<Plan>
// Your analysis goes here...
</Plan>
```
