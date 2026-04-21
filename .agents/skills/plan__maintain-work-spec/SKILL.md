---
name: plan__maintain-work-spec
description: Creates or updates the durable Work Spec for Broad Feature Work and Planning-Only Work. The Work Spec is the canonical product + UX + engineering + scope + milestone + decision-state artifact for a unit of work. It captures the user/system unlock, current truth, constraints, milestone ladder, approved file/eval envelope, open blockers, and next action. It works in tandem with an eval-plan.md, and the proof-gate design is owned by eval__design-proof-gates. Triggers anytime we are spec'ing out new work, defining milestones, or updating work context files. 
tools: Read, Grep, Glob, Edit, Write
model: opus
---

# Work Spec
Work Spec = PRD + UX intent + engineering design constraints + milestone ladder + proof contract + decision log + current state
This is not a brainstorm, not a scratchpad, not a PRD-only doc, and not a status update. It is the canonical spec for a unit of work.

- This skill file owns and maintains `docs/work/<semantic-folders>/<feature-slug>/work-spec.md` as the durable source of truth.
This skill file may reference the eval plan, summarize its current gate status, and list the eval-plan path.

- The $eval__design-proof-gates skill owns and maintains the corresponding `docs/work/<semantic-folder>/<feature-slug>/eval-plan.md` 
Keep `docs/work/<semantic-folders>/<feature-slug>/eval-plan.md` linked and status-synchronized when it exists. Proof-gate design is authoritative only after `$eval__design-proof-gates` has run, or after an existing eval plan is cited as already covering the exact scope.


work-spec.md = what we are building, why, scope, constraints, milestone state
eval-plan.md = how we prove it is real


## Goal

Turn messy, multi-window feature context into a **single, high-signal** Work Spec file that is:
- **Human-friendly:** Quick to scan, stable structure
- **LLM-friendly:** Explicit contracts, low ambiguity
- **Reality-anchored:** Separates facts from assumptions

## When to Use

- Create a new `docs/work/<semantic-folders>/<feature-slug>/work-spec.md`
- Update existing Work Spec
- Consolidate milestones, constraints, contracts
- Establish feature "source of truth" across sessions

## Workflow 

1. **Ingest inputs:** Current Work Spec + new material (PRs, tests, logs, decisions)
2. **Apply epistemic discipline:** Source everything or label `[UNVERIFIED]`
3. **Centralize contracts:** Caps, ordering, privacy in Contracts section
4. **Keep it compact:** ≤5 actions, ≤15 facts, ≤20 references
5. **Update bookkeeping:** Last updated, change log
6. **Output:** Write or modify the Work Spec artifact, update linked eval-plan status if applicable, and return the Skill Result fields. Do not emit the root `<Recap>`; the calling agent owns the final human-facing response.

## Non-Negotiable Rules

### Stable Structure
Do not reorder sections.

### Stable IDs
Never renumber existing IDs:
- Facts: `F-###`
- Unverified: `U-###`
- Inferences: `I-###`
- Plans: `P-###`
- Sources: `SRC-###`
- Actions: `A1`…`A5`
- Contracts/Invariants: `C-###`
- Milestones: `<FEATURE-SLUG>__M1`, `<FEATURE-SLUG>__M2`, `<FEATURE-SLUG>__M3.1`

### Truth Labeling
- `[FACT]` — sourced
- `[INFERENCE]` — references fact IDs
- `[PLAN]` — future intent
- `[UNVERIFIED]` — no source (even if "obvious")

## Milestone Namespace Rule

Milestones must be globally unambiguous across durable Work Spec / eval artifacts.

Rules:
- Do not use naked `M1`, `M2`, `Phase 1`, or `Step 2` across files.
- Prefix milestone IDs with the semantic feature/work slug. 
  - Example: `REPLAY-PROJECTION__M1`,  `FRIEND-LIST-PRESENCE__M1`, `SPRITE-KIT-CATALOG__M2`, `REPLAY-PROJECTION__M3`.
- Cross-file references must use the full prefixed ID.
- If an agent encounters an ambiguous naked milestone reference, it must halt and ask for clarification or emit a Plan Delta naming the ambiguity.

## Template Structure

```markdown
# WORK SPEC — <FEATURE_NAME>
**Last updated:** YYYY-MM-DD  
**Status:** Draft | In Progress | Blocked | Done  
**Owners:** <humans/teams>  
**Stakeholders:** <optional>  

**Purpose:** <1–2 sentences. What is being built and why.>
**Core User Journey Value Unlock**: What is the core product experience (whether for users, for admins, or for infra) that this feature unlocks?
**Core System Unlock**: 1 liner of what core system (if any) this feature unlocks / unblocks / makes better

**Primary entry point(s):** <exact API/event/command>  
**Related docs:** <links or SRC refs, if relevant>

**Change Log:**
- YYYY-MM-DD — <1–3 bullets summarizing what changed in this update>

---

## Doc Conventions (Do Not Delete)

- **Stable structure:** Do not reorder or rename top-level sections `1..8` or Appendix sections `A1..A5`.
- **Stable IDs:** Never renumber existing IDs. Append new IDs only.
  - Facts: `F-###`
  - Unverified: `U-###`
  - Inferences: `I-###`
  - Plans: `P-###`
  - Contracts/Invariants: `C-###`
  - Sources: `SRC-###`
  - Actions: `A1`…`A5`
  - Milestones: `<FEATURE-SLUG>__M1`, `<FEATURE-SLUG>__M2`, `<FEATURE-SLUG>__M3.1` (no duplicates)
- **Truth labeling:** If it’s not sourced, it must be `[UNVERIFIED]` even if it seems obvious.
- **Contracts live in Section 4 only.** Elsewhere, reference `C-###` rather than restating rules.
- **Keep it compact:** Next actions ≤ 5. Facts target ≤ 15 bullets. References target ≤ 20.

---

## 1) North Star (User Experience)

### 1.A North Star user journey - Product Grounding & Experience
*Before we define the code, we must define the reality we are building.*
For EVERY milestone for this feature, we must have:

##### 1.A.i For the North Star vision: 
* **Actor:** Who is doing this (user/service/operator)?
* **Entry Point:** The exact API/event/command they hit first.
* **Steps:** Minimal sequence of interactions (3-5 steps max).
* **Success:** What "worked" means in observable behavior (e.g., "User sees the replay load within 2 seconds").
* **Non-Goals:** Explicitly what is out of scope.

#### 1.A.ii **Experience Invariants** (The "It's Not Real Unless..." List)
List 3-7 non-negotiable properties that define the feature's existence.
* *Format:* "If [condition], then [result] must happen, otherwise the feature is broken."
* *Example:* "If a user disconnects mid-match, the replay must still be available up to the disconnect timestamp."

#### 1.A.iii ***The "Obviousness Audit"**
List the top 5 things a reasonable user would assume are true, but which engineers might forget to build.
* **The Assumption:** (e.g., "I assume I can pause the replay.")
* **The Technical Implication:** Map this to a specific requirement or integration test (e.g., "Must persist state every tick, not just at end-of-match").

---

## 2) Non-Goals (Scope Guardrails)

- <explicitly out of scope>
- <“we are not building X”>

---

## 3) Current State

### 3.1 What is true today (FACTS / UNVERIFIED / INFERENCE / PLAN)

Use stable IDs:

- [FACT F-001 | Confidence: High/Med/Low] <claim> — (SRC-001)
- [UNVERIFIED U-001] <claim> — <what source is missing>
- [INFERENCE I-001] <claim> — supported by F-___, F-___ — Disprove if: <one-liner>
- [PLAN P-001] <planned change> — <why> — (links: M__ / C__)

### 3.2 What’s broken / missing (gaps vs North Star)

- <gap>
- <risk>
- <unknown>

### 3.3 Next actions (max 5, concrete)

Format:

- (A1) <imperative action> — done when <measurable condition> — (owner optional) — (test/SRC if relevant)
- (A2) …
- (A3) …
- (A4) …
- (A5) …

---

## 4) Contracts & Invariants (SOURCE OF TRUTH)

This section is authoritative. Any hard constraint, invariant, cap, ordering rule, privacy redline, or “empty vs missing vs error” semantic must live here as a `C-###`.

### 4.1 Definitions (recommended)

- <term> — <definition>
- <term> — <definition>

**T-Shirt Sizing** (used in Milestone Index, Section 5.1):
In an LLM-assisted codebase, time is not the bottleneck — judgment surface area and blast radius are. Size by these dimensions:

**Complexity**: how many systems/surfaces touched, how many judgment calls required
S = single service, well-patterned, LLM can mostly solo
M = 2–3 services, some ambiguous contracts, needs human review passes
L = cross-cutting, new patterns, multiple integration surfaces
XL = architectural change, new primitives, high coordination across teams

**Risk**: what breaks if we get it wrong
S = revertible, no data migration, blast radius = 1 feature
M = touches shared infra, needs rollback plan
L = data model changes, potential corruption, user-facing degradation
XL = irreversible migration, security surface, or money on the line

**Perf Impact** (hot path load delta)
S = no hot-path change
M = measurable, within budget
L = needs load test
XL = architectural risk

**Cost Impact**: (infra $ delta, when applicable)
S = <$100/mo
M = $100–1k/mo, needs approval
L = $1k–10k/mo, needs approval
XL = >$10k/mo, needs approval

### 4.2 Experience invariants (“It’s not real unless…”)

- [C-001 | Must] If <condition>, then <result> must happen, otherwise the feature is broken. — (SRC-___ if verified)
- [C-002 | Must] …
- [C-003 | Must Not] …

### 4.3 Safety / Privacy (Must / Must Not)

- [C-010 | Must] …
- [C-011 | Must Not] …
- [C-012 | Must] Data retention / deletion rules: …
- [C-013 | Must] Access controls / authN+authZ expectations: …

### 4.4 Performance / Hot Path (Must / Must Not)

- [C-020 | Must] p95 latency budget: <number> for <endpoint/path> under <assumptions>. — (SRC-___ if measured)
- [C-021 | Must] Throughput / QPS expectations and backpressure behavior: …
- [C-022 | Must Not] No unbounded fan-out, no N+1 calls in hot path, etc.
- [C-023 | Must] Cost guardrail / budget signal: <High/Med/Low or $/month> — (SRC-___ if measured)

### 4.5 Data access & bounding rules (determinism)

- [C-030 | Must] Hard caps: <e.g., max items, max bytes, max time window>
- [C-031 | Must] Ordering: <stable ordering rule>
- [C-032 | Must] Pagination: <cursor/offset> + `hasMore` semantics
- [C-033 | Must] Truncation semantics: <what is dropped first, how it is signaled>
- [C-034 | Must] Idempotency + dedupe semantics: <keys, windows>
- [C-035 | Must] Empty vs Missing vs Error semantics are explicit for every surface:
  - Empty: …
  - Missing: …
  - Error: …

### 4.6 Tool / API contracts (canonical schemas)

For each surface (endpoint, event, tool, job, prompt contract), define:

- **Name:** <stable name>
- **Inputs:** <types + required/optional>
- **Outputs:** <JSON shape, types>
- **Ordering & limits:** <explicit>
- **Empty result semantics:** <explicit>
- **Missing data semantics:** <explicit>
- **Error semantics:** <explicit error codes>
- **Observability:** <metrics/log fields + timings phases>

Include compact JSON examples where helpful.

### 4.7 Observability & context propagation

- [C-040 | Must] Context IDs that propagate across every hop: <TraceID, SpanID, UserID, FeatureEntityID…>
- [C-041 | Must] Logging requirements (every log line includes …)
- [C-042 | Must] Metrics guardrails (SLIs/SLOs) and alarms: …

### 4.8 Failure handling & degradation policy

- [C-050 | Must] Retry policy: <what retries, how many, jitter, when to stop>
- [C-051 | Must] Dead letter handling: <where bad inputs go, how they’re inspected>
- [C-052 | Must] Circuit breaker / shed load behavior: <thresholds and degraded mode>
- [C-053 | Must] Data corruption / rollback expectations: …

---

## 5) Milestones (Production-shippable ladder)

### 5.1 Milestone index

| ID | Goal + User Journey | State (Proposed/Approved/In Progress/Objectively Green/Waiting Human/Blocked/Complete/Cut) | Acceptance criteria (tests + behavior) | Rollback shape | Complexity | Risk | Perf Impact | Cost Impact | Notes |
|---|---|---|---|---|---|---|---|---|---|
| <FEATURE-SLUG>__M1 |  |   |   |   |   |   |   |   |   |
| <FEATURE-SLUG>__M2 |  |   |   |   |   |   |   |   |   |
...
| <FEATURE-SLUG>__Mn |  |   |   |   |   |   |   |   |   |


### 5.2 Milestone details (user journey first)
Milestones around grounded in what user journey they unlock — one level above the feature itself. Not "what does this feature do" but "what can the user now accomplish that they couldn't before?" A replay system doesn't unlock a replay system. It unlocks "player just had an insane moment and wants to show their friend." From that framing, shareable links and tap overlays are obvious. From "build replay playback infrastructure," they're not.
Every task must be framed as: "This unlocks [user journey]. Within that journey, this feature enables [specific step]. The next thing the user will obviously try is [next step]." If the next step doesn't exist, it's a gap.
When describing completed work, describe what it unlocks, not what it implements. Not "implemented replay event decoder." Instead: "Unlocks: player watches their run back and sees exactly where they tapped."

For a milestone and the subwork within a milestone to be done, the **value path** must be proven by at least one deterministic **full value path integration test**.

---

#### <FEATURE-SLUG>__M1 — <title>

- **Goal:** <capability unlocked>
- **User journey:** Actor + entry + 3–5 steps + success (observable)
- **Experience invariants:** reference the relevant `C-###` (do not restate)
- **Scope boundaries:** what it does NOT do
- **Obviousness gate (top 5 assumptions → test or explicitly defer):**
  1. <assumption> → <integration test or time-bounded defer>
  2. …
- **Risk & failure modes:** privacy / perf / data loss / hangs
- **Performance budget:** reference `C-###`
- **Context propagation checks:** reference `C-###`
- **Acceptance criteria:** concrete tests + expected behavior

#### <FEATURE-SLUG>__Mn... — <title>
Each additional milestone must follow format of <FEATURE-SLUG>__M1

<same fields as <FEATURE-SLUG>__M1>

---

## 6. Capacity & Cost (Napkin Math)
For features that do not affect persistence, infra cost, external services, hot paths, storage, model/tool calls, or production load, write:
- [FACT F-___] Capacity/cost impact is not applicable because <reason>. — (SRC-___)

Do not perform the 100m-user Feynman estimate unless the feature changes production resource usage or an operator cost surface.

### 6.1. Infra Math
* **Assumptions:** State the numbers (e.g., 10k CCU, 50 events/sec/user).
* **Throughput:** Calculate required Read/Write OPS.
* **Storage Projection:** Data volume per day/month.
* **The Cost Reality:** Rough estimation of infrastructure costs (High/Medium/Low) and where the money goes.

### 6.2. Feynman Cost Estimate
Conduct a Feynman Cost Estimate for the total production load cost by deconstructing the feature(s) into their fundamental cost drivers, use Fermi estimation to confidently approximate any missing values with stated assumptions, and calculate the final Total Net $/Month Increase.
Assume 100m users, with 10mm DAUs. Scale all numbers around these assumptions.
* **Total Additional Net $ per month**: You must provide this number.


--- 

## 7. Open Questions / Needs Verification

(NOTE: WIth each open question, you MUST provide YOUR opinionated suggestion)

- <blocking unknown>
- <contradiction between sources> — evidence needed: <what would resolve it>
- <assumption we might be wrong about> — disprove by: <test/log/measurement>

---

## 8. Doc Health (Lint)

- Next actions ≤ 5: ✅/❌
- “Facts” concise (target ≤ 15 bullets): ✅/❌
- All [FACT] have (SRC-###): ✅/❌
- No duplicate milestone IDs: ✅/❌
- Contracts centralized (no scattered caps/contracts elsewhere): ✅/❌
- Major [INFERENCE] entries include “Disprove if”: ✅/❌
- Contradictions captured in Open Questions (not smoothed over): ✅/❌

---

# Appendix

## A1) Decision Log (ADRs-lite)

Each entry:

- **Date:** YYYY-MM-DD
- **Decision:** <what we decided>
- **Rationale:** <why>
- **Alternatives considered:** <bullets>
- **Consequences / tradeoffs:** <bullets>
- **Disprove if:** <one-liner>

## A2) References (Primary Sources) (Optional)

List the sources used by `[FACT]` entries above:

- SRC-001: <file path / PR/commit / command / test output> — <what it proves> — (captured YYYY-MM-DD)
- SRC-002: …
- SRC-003: …

---

## A3) Archive (Obsoleted or superseded) (Optional)

- YYYY-MM-DD — <what moved> — <why obsolete> — <replacement pointer>

---

## A4) Full Freeform Implementation Spec (Deep Dive, Optional)

This appendix can hold a full build spec when needed. It should expand on *mechanics and design*, but it must **not redefine contracts**—reference Section 4 `C-###`.

### A4.1 Visual dynamics
- `mermaid` sequence diagram (happy path):
- `mermaid` state diagram (if lifecycle-managed):

### A4.2 Context Propagation Audit
- Trace context required:
- Origin & destination:
- Verification (tests/logs):

### A4.3 Data Internals (Schemas & Payloads)
- Primary store schema:
- Hot store key patterns + TTL:
- Event payloads / API responses (JSON schemas):

### A4.4 Defense Against Failure

- Failure modes table (risk → mitigation → test):
- Retries & DLQ:
- Circuit breakers / degraded mode:

### A4.5 Open Ended Comments / Notes
- Any other notes / comments / feedback / guidance
- This is a broad place to store any other relevant context.

```

## Quality Bar
- Milestones use full prefixed IDs, not naked `M1` / `M2`.
- Every milestone ends in an observable value state.
- Every implementation-ready milestone references objective eval-plan gates or names the exact blocker.

Before output:
- Contracts appear ONLY in section 4
- Every `[FACT]` has `SRC-###`
- Every major `[INFERENCE]` says "Disprove if: …"
- Next actions ≤ 5
- Contradictions in Open Questions, not smoothed over

## Skill Result
After writing or updating the Work Spec, report these fields to the calling agent:

- Work Spec path:
- Eval plan path:
- Eval plan coverage: [Missing | Existing covers exact scope | Needs `$eval__design-proof-gates` | Updated from eval skill result]
- Feature slug:
- Approval state:
- Proposed milestone IDs:
- Proof-of-Value State:
- File target envelope:
- Open blockers:
- Recommended next action:

The root AGENTS.md owns the final human-facing recap format.