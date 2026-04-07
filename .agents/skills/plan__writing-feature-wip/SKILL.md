---
name: plan__writing-feature-wip
description: Maintains a living FEATURE-WIP markdown file as the durable source of truth for any feature, project, or initiative across sessions. Creates, updates, and audits FEATURE-WIP__*.md docs with epistemic discipline, sourced facts, labeled inferences, explicit contracts, and bounded next actions. Triggers when starting a new feature, resuming work on an in-flight feature, consolidating decisions after a design review or PR, restoring context after context compact, capturing architectural context for handoff, or when the user "update the WIP," "where did we leave off," "what's the status of," "write up the feature doc," or "plan the feature" or "let's spec it out". Also triggers on requests to define milestones, acceptance criteria, contracts, invariants, scope boundaries, capacity estimates, spec, or decision logs. Produces structured, scannable docs optimized for both human review and LLM re-ingestion.
tools: Read, Grep, Glob, Edit, Write
model: opus
---

# Feature WIP Maintainer

Maintain `docs/features/FEATURE-WIP__<feature-name>.md` as the durable source of truth.

## Goal

Turn messy, multi-window feature context into a **single, high-signal** WIP file that is:
- **Human-friendly:** Quick to scan, stable structure
- **LLM-friendly:** Explicit contracts, low ambiguity
- **Reality-anchored:** Separates facts from assumptions

## When to Use

- Create new `FEATURE-WIP__*.md`
- Update existing WIP
- Consolidate milestones, constraints, contracts
- Establish feature "source of truth" across sessions

## Workflow 

1. **Ingest inputs:** Current WIP + new material (PRs, tests, logs, decisions)
2. **Apply epistemic discipline:** Source everything or label `[UNVERIFIED]`
3. **Centralize contracts:** Caps, ordering, privacy in Contracts section
4. **Keep it compact:** ≤5 actions, ≤15 facts, ≤20 references
5. **Update bookkeeping:** Last updated, change log
6. **Output:** Write / modify the file, and then give me a short recap

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
- Milestones: `M1`, `M2`, `M3.1`

### Truth Labeling
- `[FACT]` — sourced
- `[INFERENCE]` — references fact IDs
- `[PLAN]` — future intent
- `[UNVERIFIED]` — no source (even if "obvious")

## Template Structure

```markdown
# FEATURE-WIP — <FEATURE_NAME>
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

- **Stable structure:** Do not reorder or rename top-level sections `1..11`.
- **Stable IDs:** Never renumber existing IDs. Append new IDs only.
  - Facts: `F-###`
  - Unverified: `U-###`
  - Inferences: `I-###`
  - Plans: `P-###`
  - Contracts/Invariants: `C-###`
  - Sources: `SRC-###`
  - Actions: `A1`…`A5`
  - Milestones: `M1`, `M2`, `M3.1` (no duplicates)
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

| ID | Goal + User Journey | State (Planned/In Progress/Done/Cut) | Acceptance criteria (tests + behavior) | Rollback shape | Complexity | Risk | Perf Impact | Cost Impact | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M1 |  |   |   |   |   |   |   |   |   |
| M2 |  |   |   |   |   |   |   |   |   |
...
| Mn |  |   |   |   |   |   |   |   |   |


### 5.2 Milestone details (user journey first)
Milestones around grounded in what user journey they unlock — one level above the feature itself. Not "what does this feature do" but "what can the user now accomplish that they couldn't before?" A replay system doesn't unlock a replay system. It unlocks "player just had an insane moment and wants to show their friend." From that framing, shareable links and tap overlays are obvious. From "build replay playback infrastructure," they're not.
Every task must be framed as: "This unlocks [user journey]. Within that journey, this feature enables [specific step]. The next thing the user will obviously try is [next step]." If the next step doesn't exist, it's a gap.
When describing completed work, describe what it unlocks, not what it implements. Not "implemented replay event decoder." Instead: "Unlocks: player watches their run back and sees exactly where they tapped."

For a milestone and the subwork within a milestone to be done, the **value path** must be proven by at least one deterministic **full value path integration test**.

---

#### M1 — <title>

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

#### Mn... — <title>
Each additional milestone must follow format of M1

<same fields as M1>

---

## 6. Capacity & Cost (Napkin Math)
### 6.1. Infra Math
* **Assumptions:** State the numbers (e.g., 10k CCU, 50 events/sec/user).
* **Throughput:** Calculate required Read/Write OPS.
* **Storage Projection:** Data volume per day/month.
* **The Cost Reality:** Rough estimation of infrastructure costs (High/Medium/Low) and where the money goes.

### 6.2. Feynman Cost Estimate
Conduct a Feynman Cost Estimate for the total production load cost by deconstructing the feature(s) into their fundamental cost drivers, use Fermi estimation to confidently approximate any missing values with stated assumptions, and calculate the final Total Net $/Month Increase.
Assume 100m users, with 10mm DAUs. Scale all numbers around these assumptions.
* **Total Additional Net $ per mont**: You must provide this number.

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

```

## Quality Bar

Before output:
- Contracts appear ONLY in section 4
- Every `[FACT]` has `SRC-###`
- Every major `[INFERENCE]` says "Disprove if: …"
- Next actions ≤ 5
- Contradictions in Open Questions, not smoothed over


## Post Spec
After writing the spec file and doing work, always give me your recap in exactly this format:

**Checkpoint — [A# you just completed]** <FEATURE-WIP__filename (the filename you're working off if. If none, say "none")>
- **Did:** <1 liner — what you built/changed, with file paths>
- **User Journey Unlocks:** <1 liner — what user journey or capability now works>
- **Tested:** <1 liner — what you verified and how>
- **Plan impact:** <one of the following>
  - ✅ **On track** — nothing changes
  - ⚠️ **Adjust** — <what actions to add/remove/reorder and why>
  - 🔴 **Replan** — <why the current plan is wrong, what changed>
- **Need from me:** <blocking question (what you need from "me", the developer) + your suggestion, or "Nothing">
- **Suggest next:** <what to do next and why — may be "update the WIP before continuing">
