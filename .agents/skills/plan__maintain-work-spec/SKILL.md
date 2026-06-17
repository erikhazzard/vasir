---
name: plan__maintain-work-spec
description: Creates or updates the durable Work Spec for Broad Feature Work and Planning-Only Work. The Work Spec is equal parts Product Requirement Doc, Engineering Specification, Design Document, UX Document, milestone ladder, and current decision-state artifact; use it when defining work, updating milestone rungs, or preserving active feature context without turning the spec into an audit log.
tools: Read, Grep, Glob, Edit, Write
model: opus
---

# Work Spec
Work Spec = Product Requirement Doc + Engineering Specification + Design Document + UX Document + milestone ladder + current decision state.
This is not a brainstorm, not a scratchpad, not a PRD-only doc, not a status update, and not an audit log. It is the canonical spec for a unit of work.

- This skill file owns and maintains `docs/work/<semantic-folders>/<feature-slug>/work-spec.md` as the durable source of truth.
This skill file may reference the eval plan, summarize its current gate status, and list the eval-plan path.

- The $eval__design-proof-gates skill owns and maintains the corresponding `docs/work/<semantic-folder>/<feature-slug>/eval-plan.md` 
Keep `docs/work/<semantic-folders>/<feature-slug>/eval-plan.md` linked and status-synchronized when it exists. Proof-gate design is authoritative only after `$eval__design-proof-gates` has run, or after an existing eval plan is cited as already covering the exact lane.


work-spec.md = what we are building, why, lane, constraints, milestone rung state
eval-plan.md = how we prove it is real

## Core Principle

Spend the Work Spec detail budget on milestone rungs. Each rung is a self-contained build packet with enough product intent, UX/design taste, engineering boundary, contracts, and proof context for a senior engineer or agent to execute well.

The header names the active rung; it does not duplicate the rung. Cut bloat from stale changelogs, stale facts, resolved questions, old source refs, and completed proof narration, not from the rungs.

When creating a Work Spec, materially restructuring one, or rewriting a milestone ladder, load `references/s-tier-work-spec-example.md` before editing. For status-only updates, small typo fixes, or one-line source/status sync, this reference is optional.

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

1. **Ingest inputs:** Current Work Spec + new material (PRs, tests, logs, decisions).
2. **Find the active rung:** Identify the current milestone rung, latest completed rung commit, next user/developer journey proof, evidence artifacts, blockers, and next commit point.
3. **Apply epistemic discipline:** Source active claims or label `[UNVERIFIED]`.
4. **Centralize contracts:** Authority, ordering, privacy, safety, performance, data-shape, and failure rules live in Section 4.
5. **Spend tokens on rungs:** Keep header/current-truth/open-question sections compact; make each milestone rung long enough to execute with product, UX, design, engineering, and proof context.
6. **Archive history:** Move superseded decisions, old source refs, completed proof narration, and resolved questions to Appendix instead of leaving them in active sections.
7. **Output:** Write or modify the Work Spec artifact, update linked eval-plan status if applicable, and return the Skill Result fields. Do not emit the root `<Recap>`; the calling agent owns the final human-facing response.

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

### Detail Budget
- Milestone rungs are allowed to be juicy. They may contain design briefs, UX mandates, engineering boundaries, dev journey notes, implementation lane guidance, "not in this rung" lists, and "done when" language.
- Header, Current State, Open Questions, Source References, and Change Log must stay compact and active. If a detail does not affect the active rung, next rung, blocker, or durable contract, move it to Appendix.
- Stable IDs do not mean active-section immortality. Never renumber IDs, but superseded IDs may move to Appendix with a replacement pointer.
- Resolved open questions leave Section 7. Old changelog entries leave the header. Completed milestone proof narration collapses to the rung's `Proof` and `Done` fields.

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
**Active rung:** <FEATURE-SLUG>__M# - <name> - <state or "None yet">
**Next commit point:** <when the active rung proves its user/developer/engineering journey and spec/eval status is synced, or "Not yet defined">
**Blocked by:** <none | exact blocker>
**Eval plan:** `docs/work/<semantic-folders>/<feature-slug>/eval-plan.md` or `Not created yet`
**Owners:** <humans/teams>  
**Stakeholders:** <optional>  

**Purpose:** <1–2 sentences. What is being built and why.>
**Core User Journey Unlock:** What product experience this feature unlocks.
**Core Developer Journey Unlock:** What the next engineer/agent can now do more safely or quickly.
**Core Engineering Unlock:** What system capability, contract, reliability property, or operational truth this unlocks.

**Primary entry point(s):** <exact API/event/command>  
**Related docs:** <links or SRC refs, if relevant>

**Recent Change Log:** (max 3 active entries; move older history to Appendix A1)
- YYYY-MM-DD - <what changed in this update and which rung/contract/proof it affected>

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
- **No stopgaps:** The no-stopgap rule lives as a Section 4 contract. Do not add a repeated no-stopgap field to each rung.
- **Detail budget:** Milestone rungs carry the rich product/UX/design/engineering/proof context. Header/current truth/open questions/source refs stay active and compact.
- **Active rung:** The header names the active rung; do not duplicate its content in a separate active-rung section.
- **Rung commits:** Completed rungs record the short commit hash plus commit subject. Active/proposed rungs say `Pending` until proof, Work Spec sync, eval status sync, and commit are done.
- **Evidence artifacts:** Each rung records the proof artifact path(s): screenshots, clips, logs, benchmark tables, trace captures, or `Pending`. `tmp/...` paths are allowed and may expire; keep a compact evidence summary so the Work Spec remains useful after temporary files disappear.
- **History:** Superseded decisions, old source refs, resolved questions, and completed proof narration move to Appendix.
- **Random context:** Use Appendix A5 for quarantined notes that may matter later but do not belong in the active lane.
- **Keep it compact outside rungs:** Next actions <= 5. Active facts target <= 12 bullets. Active references target <= 15.

---

## 1) North Star (Product, UX, Design)

### 1.A North Star user journey - Product Grounding & Experience
*Before we define the code, we must define the reality we are building.*
For the whole feature:

##### 1.A.i For the North Star vision: 
* **Actor:** Who is doing this (user/service/operator)?
* **Entry Point:** The exact API/event/command they hit first.
* **Steps:** Minimal sequence of interactions (3-5 steps max).
* **Success:** What "worked" means in observable behavior (e.g., "User sees the replay load within 2 seconds").
* **Next thing the user will try:** The next action that should be obvious after success.
* **Non-Goals:** Explicitly what is out of scope.

#### 1.A.ii **Experience Invariants** (The "It's Not Real Unless..." List)
List 3-7 non-negotiable properties that define the feature's existence.
* *Format:* "If [condition], then [result] must happen, otherwise the feature is broken."
* *Example:* "If a user disconnects mid-match, the replay must still be available up to the disconnect timestamp."

#### 1.A.iii ***The "Obviousness Audit"**
List the top 5 things a reasonable user would assume are true, but which engineers might forget to build.
* **The Assumption:** (e.g., "I assume I can pause the replay.")
* **The Technical Implication:** Map this to a specific requirement or integration test (e.g., "Must persist state every tick, not just at end-of-match").

### 1.B Design / UX Bar

- **Experience target:** <what this should feel like or enable>
- **Must feel:** <3-5 taste/UX/design qualities>
- **Must not feel:** <3-5 failure qualities>
- **Reference points:** <optional references, inspiration, prior art, or local artifacts; label as reference targets, not copied implementation>

---

## 2) Non-Goals (Scope Guardrails)

- <explicitly out of scope>
- <“we are not building X”>

---

## 3) Current State

### 3.1 What is true today for active/next rungs (FACTS / UNVERIFIED / INFERENCE / PLAN)

Use stable IDs:

- [FACT F-001 | Confidence: High/Med/Low] <claim> — (SRC-001)
- [UNVERIFIED U-001] <claim> — <what source is missing>
- [INFERENCE I-001] <claim> — supported by F-___, F-___ — Disprove if: <one-liner>
- [PLAN P-001] <planned change> — <why> — (links: M__ / C__)

If a fact does not affect the active rung, next rung, blocker, or durable contract, move it to Appendix A3.

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

**Rung Sizing** (used in Milestone Index, Section 5.1):
In an LLM-assisted codebase, time is not the bottleneck — judgment surface area and blast radius are. Every rung records Complexity, Risk, Perf Impact, and Cost Impact. Use `N/A - <reason>` only when an axis truly does not apply.

**Complexity**: how many systems/surfaces touched, how many judgment calls required
S = single service, well-patterned, LLM can mostly solo
M = 2–3 services, some ambiguous contracts, needs human review passes
L = cross-cutting, new patterns, multiple integration surfaces
XL = architectural change, new primitives, high coordination across teams
N/A = not applicable because no implementation work happens in this rung

**Risk**: what breaks if we get it wrong
S = revertible, no data migration, blast radius = 1 feature
M = touches shared infra, needs rollback plan
L = data model changes, potential corruption, user-facing degradation
XL = irreversible migration, security surface, or money on the line
N/A = not applicable because the rung is documentation/status-only

**Perf Impact** (hot path load delta)
S = no hot-path change
M = measurable, within budget
L = needs load test
XL = architectural risk
N/A = not applicable because no runtime path changes

**Cost Impact**: (infra $ delta, when applicable)
S = <$100/mo
M = $100–1k/mo
L = $1k–10k/mo
XL = >$10k/mo
N/A = not applicable because no infra, external-service, model/tool-call, storage, or runtime cost changes

### 4.2 Experience invariants (“It’s not real unless…”)

- [C-001 | Must] If <condition>, then <result> must happen, otherwise the feature is broken. — (SRC-___ if verified)
- [C-002 | Must] …
- [C-003 | Must Not] …
- [C-004 | Must] No stopgaps: build the smallest correct version of the real system, not a temporary substitute. If the full feature is too large, reduce capability, not correctness. The active rung must use the real authority/model/path and fail closed for unsupported capability.
- [C-005 | Must] Temporary compatibility paths are allowed only for migration, rollback, protocol, persistence, or client-version safety, and must name the removal condition.

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

### 5.1 Milestone rung index

| Rung | State | Size | User / Dev / Engineering unlock | Proof summary | Evidence artifact | Rung commit | Notes |
|---|---|---|---|---|---|---|---|
| <FEATURE-SLUG>__M1 |  |  |   |   |   |   |   |
| <FEATURE-SLUG>__M2 |  |  |   |   |   |   |   |
...
| <FEATURE-SLUG>__Mn |  |  |   |   |   |   |   |


### 5.2 Milestone details (user journey first)
Milestones are grounded in what user, developer, or engineering journey they unlock one level above the implementation. Not "what does this feature do" but "what can the user or engineer now accomplish that they couldn't before?" A replay system doesn't unlock a replay system. It unlocks "player just had an insane moment and wants to show their friend." From that framing, shareable links and tap overlays are obvious. From "build replay playback infrastructure," they're not.
Every task must be framed as: "This unlocks [user journey]. Within that journey, this feature enables [specific step]. The next thing the user will obviously try is [next step]." If the next step doesn't exist, it's a gap.
When describing completed work, describe what it unlocks, not what it implements. Not "implemented replay event decoder." Instead: "Unlocks: player watches their run back and sees exactly where they tapped."

For a milestone and the subwork within a milestone to be done, the **value path** must be proven by at least one real user/developer/engineering journey proof. Prefer deterministic full value path integration tests; use artifact-backed human review for taste, feel, UX, visual quality, or other subjective product claims.

---

#### <FEATURE-SLUG>__M1 — <title>

- **Goal:** <capability unlocked>
- **User / dev / engineering journey:** Actor + entry + 3–5 steps + success (observable)
- **Rung size:** S/M/L/XL - summary judgment. Include Complexity, Risk, Perf Impact, and Cost Impact; use `N/A - <reason>` where an axis truly does not apply.
- **Rung design brief:** product intent, UX/design taste, engineering shape, reference feel, or implementation philosophy needed to execute well
- **Mandates / best practices:** the rung-specific musts, must-nots, and taste constraints that a senior engineer should preserve
- **Implementation lane:** owned systems/surfaces; evidence, not an allowlist
- **Experience invariants:** reference the relevant `C-###` (do not restate)
- **Evidence artifacts:** screenshot/clip/log/benchmark/table paths for this rung, or `Pending - <what will be captured>`. Use Markdown links when the artifact is durable in-repo; use backticked paths for short-lived `tmp/...` artifacts. If a `tmp/...` artifact may expire, include a one-sentence evidence summary that survives the file.
- **Rung commit:** `<short-sha>` - <commit subject> for completed rungs; `Pending - commit after proof, Work Spec sync, and eval status sync` for active/proposed rungs
- **Not in this rung:** what this rung intentionally does NOT do
- **Obviousness checks (top assumptions -> proof or defer):**
  1. <assumption> → <integration test or time-bounded defer>
  2. …
- **Risk & failure modes:** privacy / perf / data loss / hangs
- **Performance budget:** reference `C-###`
- **Context propagation checks:** reference `C-###`
- **Proof plan:** eval-plan gate IDs or missing-harness notes, phrased as user/dev/engineering journey evidence
- **Done when:** exact observable rung completion condition, including evidence artifact pointer(s), spec/eval status sync, and recorded rung commit

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
- Active facts concise (target ≤ 12 bullets): ✅/❌
- Active references concise (target ≤ 15 bullets): ✅/❌
- Recent Change Log ≤ 3 active entries: ✅/❌
- Milestone rungs are the richest section: ✅/❌
- Rung evidence artifacts are recorded or explicitly pending: ✅/❌
- No-stopgap contract is satisfied or contradiction is called out: ✅/❌
- All [FACT] have (SRC-###): ✅/❌
- No duplicate milestone IDs: ✅/❌
- Contracts centralized (no scattered caps/contracts elsewhere): ✅/❌
- Major [INFERENCE] entries include “Disprove if”: ✅/❌
- Contradictions captured in Open Questions (not smoothed over): ✅/❌

---

# Appendix

## A1) Recent / Historical Change Log

- YYYY-MM-DD - <older changelog entry moved out of header> - <replacement pointer if any>

---

## A2) Decision Log (ADRs-lite)

Each entry:

- **Date:** YYYY-MM-DD
- **Decision:** <what we decided>
- **Rationale:** <why>
- **Alternatives considered:** <bullets>
- **Consequences / tradeoffs:** <bullets>
- **Disprove if:** <one-liner>

## A3) References (Primary Sources) (Optional)

List the sources used by `[FACT]` entries above:

- SRC-001: <file path / PR/commit / command / test output> — <what it proves> — (captured YYYY-MM-DD)
- SRC-002: …
- SRC-003: …

---

## A4) Archive (Obsoleted or superseded) (Optional)

- YYYY-MM-DD — <what moved> — <why obsolete> — <replacement pointer>

---

## A5) Full Freeform Implementation Spec / Random Context (Optional, quarantined)

This appendix can hold a full build spec when needed. It should expand on *mechanics and design*, but it must **not redefine contracts**—reference Section 4 `C-###`.

### A5.1 Visual dynamics
- `mermaid` sequence diagram (happy path):
- `mermaid` state diagram (if lifecycle-managed):

### A5.2 Context Propagation Audit
- Trace context required:
- Origin & destination:
- Verification (tests/logs):

### A5.3 Data Internals (Schemas & Payloads)
- Primary store schema:
- Hot store key patterns + TTL:
- Event payloads / API responses (JSON schemas):

### A5.4 Defense Against Failure

- Failure modes table (risk → mitigation → test):
- Retries & DLQ:
- Circuit breakers / degraded mode:

### A5.5 Random Context / Scratchpad
- Raw notes, pasted Slack/chat/context, weird edge cases, maybe-important reminders, or "random ass context" may live here.
- This section is quarantined. Promote a note into active sections only when it affects the active rung, next rung, blocker, or durable contract.

```

## Quality Bar
- Milestones use full prefixed IDs, not naked `M1` / `M2`.
- Every milestone rung is a self-contained build packet, not a one-line task.
- Every milestone rung names the user, developer, or engineering journey it unlocks.
- Every implementation-ready milestone references eval-plan proof, artifact-backed human review, missing-harness work, or the exact blocker.
- The Work Spec has one no-stopgap contract in Section 4; rungs do not repeat a no-stopgap field.
- Every rung records evidence artifact pointer(s) or `Pending`; short-lived `tmp/...` artifacts are acceptable only with a compact evidence summary that survives expiry.
- Every completed milestone rung records its short commit hash and commit subject; unfinished rungs are explicitly `Pending`.
- Header names the active rung; Section 5 owns the rung detail.
- Appendix exists for archive and random context without polluting active sections.

Before output:
- Contracts appear ONLY in section 4
- Every `[FACT]` has `SRC-###`
- Every major `[INFERENCE]` says "Disprove if: …"
- Next actions ≤ 5
- Contradictions in Open Questions, not smoothed over
- Resolved questions, old source refs, and old changelog entries are moved out of active sections

## Skill Result
After writing or updating the Work Spec, report these fields to the calling agent:

- Work Spec path:
- Eval plan path:
- Eval plan coverage: [Missing | Existing covers exact lane | Needs `$eval__design-proof-gates` | Updated from eval skill result]
- Feature slug:
- Approval state:
- Active rung:
- Rung commit state:
- Evidence artifacts:
- Proposed milestone IDs:
- Proof-of-Value State:
- Lane contract:
- Open blockers:
- Next proof / commit point:
- Recommended next action:

The root AGENTS.md owns the final human-facing recap format.
