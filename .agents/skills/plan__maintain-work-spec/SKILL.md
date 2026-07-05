---
name: plan__maintain-work-spec
description: Creates or updates the durable Work Spec — a lane's judgment state: unlock, contracts, milestone rungs, decisions, and proven-vs-claimed status. Triggers on defining, approving, or resuming substantial work; any rung or status change; any decision, invariant, or eval result that must outlive the session; also triggers for substantial work that does not yet have a  work spec.
tools: Read, Grep, Glob, Edit, Write
---

# Work Spec

Work Spec = Product Requirement Doc + Engineering Specification + Design Document + UX Document + milestone ladder + current decision state — one file. It is the serialization format for judgment state: context windows die, `tmp/` gets swept, and parallel sessions cannot see each other's reasoning, so everything expensive to re-derive (the unlock, contracts, measured baselines, decision history, proven-vs-claimed) must survive here. It is not a brainstorm, scratchpad, status feed, or audit log.

**Ownership boundary.** This skill owns `docs/work/<semantic-folders>/<feature-slug>/work-spec.md`. `$eval__design-proof-gates` owns the sibling `eval-plan.md`. The boundary: the **eval plan owns proof mechanics** — gate design, harnesses, thresholds, adequacy of proof. The **work spec owns lane truth** — scope, contracts, rung state, and the surviving result summaries after proof runs. The spec cites gate IDs and mirrors their state in §6; on divergence, the eval plan wins for gate state and mechanics, the spec wins for lane scope. Proof-gate design is authoritative only after `$eval__design-proof-gates` has run or an existing eval plan is cited as covering the exact lane.

**Routing.** Spec authorship is judgment work — orchestrator tier per root §7. Delegates may mechanically apply an exact written outline; contracts, rungs, and decisions are never delegated freehand. No model pin here: the caller's routing law decides.

---

## Schema Authority

- **Stale specs are synced, not versioned.** A spec that predates the current template is handled like any lagging doc (root §1): status-only edits conform locally; the first lane that materially touches it restructures it to the current template — mapping old sections in, archiving displaced content with pointers, noting the restructure in the change log. Never renumber existing IDs.
- When creating a spec, materially restructuring one, or rewriting a milestone ladder, use this file's template and conformance check as the source of truth. For status syncs and small fixes, preserve the existing structure unless the touched section is already stale.

---

## Core Principle — Spend the Budget on Rungs

Milestone rungs are self-contained build packets: enough product intent, taste, engineering boundary, contracts, and proof context that a senior engineer or agent with zero authoring context can execute well. Everything outside the rungs is a compact index into them. Cut bloat from stale changelogs, resolved questions, dead source refs, and completed proof narration — never from the active rung. A spec whose header is richer than its active rung is upside down.

---

## Authoring Laws

Rules any reader or editor of the artifact must preserve live **once**, in the spec's own Doc Conventions block (inside the template below) — the spec must defend itself even when this skill is not loaded. This section carries only what cannot live in the document:

1. **Rigidity is claimed, not accidental.** The root contract says required elements, free rendering. A multi-writer durable artifact earns more: stable top-level addresses and append-only IDs are what make concurrent merge-additive editing and cross-file references possible — that is the exemption, and it is scoped. **Rigid:** the section skeleton, the ID grammar, contracts-in-§4-only, milestone namespacing, the projection-sync rule. **Free:** prose shape inside rungs, which contract clusters exist, field rendering, and all counts — targets, not mandates — except the ≤5 next-actions and ≤3 active-changelog caps, which are load-bearing anti-bloat.
2. **Doc health is audited, not self-graded.** Run the conformance check at the end of this file before writing; store no scorecard. A stored ✅ grid graded by the context that wrote the doc is fake proof; the §6 audit lens owns doc-health verdicts.
3. **Intake is sacred.** Multi-item user asks get an Input Coverage Ledger before synthesis; no item disappears into generic prose. User asks are intake, never `[FACT]`.
4. **The spec outlives its evidence.** `tmp/` artifacts expire; every recorded artifact keeps a surviving summary — the load-bearing figures and how to regenerate them — in the rung itself.

---

## Lifecycle

- **Create** when a substantial lane is proposed or approved (root §4). The unlock, acceptance gate, lane boundary, and biggest risk exist in the spec before implementation starts.
- **Maintain** after approval, after every rung state change, and whenever a discovered invariant, decision, or eval failure reveals repo truth. For ongoing work, load the active spec before broad repo reads.
- **Park** when a lane is deliberately paused: status `Parked`, with the reason and the resume condition named. `In Progress` with no active rung and no `Blocked`/`Parked` marker is a defect — fix the state, don't leave zombies.
- **Close** when the lane hits root §6's Complete checklist: final change-log entry records the closing commit, status flips to `Complete`, and the feature folder gains the `DONE__` prefix (repo convention, cf. `docs/features/DONE__*`) so closed lanes are visible from the tree without opening a file.

---

## Workflow

1. **Re-read, then ingest.** Re-read the current spec immediately before editing (parallel sessions edit it too), then ingest the new material: diffs, decisions, proof output, user asks.
2. **Coverage before synthesis.** Multi-item intake → create or update the Input Coverage Ledger first (Law 3).
3. **Find the active rung:** state, latest rung commit, next journey proof, blockers, next commit point.
4. **Epistemic pass:** source or label every active claim per the truth-labeling convention; contradictions land in §7, never smoothed over.
5. **Write rung packets rich; keep everything else index-thin.**
6. **Archive sweep:** resolved questions leave §7; old changelog → A1; superseded IDs → A4 with replacement pointers; completed-rung narration collapses to unlock + proof summary + surviving figures.
7. **Projection resync:** header, Human Read, §5.1 index row, §6 gate table — all in this same edit (see conventions).
8. **Emit the Skill Result** fields to the caller. The caller owns the human-facing close-out (root §5); do not render one here.

---

## The Human Read

The first field under the title, always. Shape: `We are trying to <direct product outcome> so that <one-level-higher outcome>. The active rung is <FEATURE-SLUG>__M# because <why it is the next constraint>. The next proof is <artifact/test/smoke>. Main risk: <risk>. Decision needed: <none / exact decision>.`

The `so that` clause must climb one level above the workflow — name the downstream product, player, business, trust, retention, or operational outcome, not the workflow restated in nicer words.

- Weak: `We are trying to make incidents easier to scan so that operators can triage incidents confidently.`
- Strong: `We are trying to make incidents easier to scan so that Harbor Pulse reduces time-to-mitigation and customer-impact uncertainty during live incidents.`

One tight paragraph. It is an index into the spec, never a second source of truth.

---

## Template

```markdown
# WORK SPEC — <FEATURE_NAME>
**Human Read:** We are trying to <direct product outcome> so that <one-level-higher outcome>. The active rung is <FEATURE-SLUG>__M# because <why it is the next constraint>. The next proof is <artifact/test/smoke>. Main risk: <risk>. Decision needed: <none / exact decision>.

**Last updated:** YYYY-MM-DD
**Status:** Draft | Approved | In Progress | Blocked | Waiting Human | Parked | Complete
**Active rung:** <FEATURE-SLUG>__M# — <name> — <root §4 state> | None
**Next commit point:** <observable condition> | Not yet defined
**Blocked by:** none | <exact blocker or waiting-human gate>
**Eval plan:** `docs/work/<semantic-folders>/<feature-slug>/eval-plan.md` | Not created yet
**Owners:** <humans/teams>

**Purpose:** <1–2 sentences: what is being built and why.>
**User Journey Unlock:** <the concrete experience this unlocks for the player/user — for SDK/tooling lanes, the "user" is the consuming developer>
**Engineering System Unlock:** <the capability, contract, reliability property, or operational truth this unlocks — omit only if genuinely none, and say so in Purpose>
**Primary entry point(s):** <exact API/event/command/route>
**Related docs:** <links / SRC refs>

**Recent Change Log:** (≤3 active; older → A1)
- YYYY-MM-DD — <what changed; which rung/contract/proof it affected>

---

## Doc Conventions (Do Not Delete)

- **Schema truth:** the `plan__maintain-work-spec` skill. Do not reorder or rename top-level sections 1–7 or A1–A5. A section with nothing active holds one honest line — never empty scaffolding, never `N/A` filler.
- **Stable IDs, append-only; never renumber:** Facts `F-###` · Unverified `U-###` · Inferences `I-###` · Plans `P-###` · Contracts `C-###` · Sources `SRC-###` · Next actions `N-1…N-5` · Milestones `<FEATURE-SLUG>__M#` (no naked `M1`/`Phase 2` anywhere, including cross-file references; an ambiguous naked reference is a halt-and-clarify, not a guess). Superseded IDs move to A4 with a replacement pointer.
- **Truth labels:** `[FACT]` requires `(SRC-###)`, file:line where possible. Unsourced claims are `[UNVERIFIED]` even when obvious. Major `[INFERENCE]` entries carry `Disprove if:`. `[PLAN]` marks intent. User asks live in the ledger, never as `[FACT]`.
- **Contracts live in §4 only;** elsewhere cite `C-###`. Root laws bind by reference (`root §9 — no stopgaps`), never cloned as local contracts: every `C-###` is lane-specific and testable — write only contracts you could watch fail.
- **Projection sync:** rung bodies (§5.2) are truth. The header fields, Human Read, §5.1 index row, and §6 gate table are projections — resync all of them in the same edit as any rung-state change. Conflicts resolve toward the rung body; gate state resolves toward the eval plan.
- **Status vocabulary is root §4's,** verbatim, for rungs: Proposed / Approved / In Progress / Blocked / Objectively Green / Waiting Human / Complete. `Waiting Human` is never auto-claimed and never bundled into completion. The word "Done" is not a state.
- **Evidence:** every rung records artifact path(s) or `Pending — <what will be captured>`. `tmp/` paths may expire: each recorded artifact keeps a one-to-three-line surviving summary (load-bearing figures + regeneration command). Artifact medium matches the gate (root §5): browser-rendered rungs record real route/scenario captures with viewport(s) and console/network status; canvas/game rungs additionally prove nonblank, correctly framed, interacting — "page loaded" is not proof.
- **Taste-critical rungs** (feel, UX, visuals, copy, game design, interaction, dev ergonomics) carry rung-specific `Reference bar:` / `Must-feel delta:` / `Must-not-feel delta:` / `Rejection criteria:` lines. §1.D sets the feature-wide bar and never satisfies a rung by itself. Acceptance is a Waiting Human gate.
- **Concurrency custody (root §8):** re-read before editing; merge additively; never clobber another session's recorded decisions.
- **History moves, never vanishes:** resolved questions leave §7; old changelog → A1; superseded content → A4 with pointers; quarantined maybe-useful notes → A5.

---

## Input Coverage Ledger (multi-item intake; lives here until the user accepts the spec, then → A4)

| # | User item | Disposition | Where it lives | Notes |
| --- | --- | --- | --- | --- |
| 1 | <user's wording, audit-preservable> | Included / Merged / Deferred / Blocked / Open question / Non-goal | <rung / C-### / §7 / §2 / A5> | <why> |

Several asks merging into one rung keep separate rows pointing at the same rung. An item not being built says which of Deferred / Blocked / Open question / Non-goal it is.

---

## 1) North Star (Product, UX, Design)

### 1.A Journey
- **Actor:** <user / service / operator>
- **Entry point:** <the exact API/event/command they hit first>
- **Steps:** <3–5 max>
- **Success:** <what "worked" means, observably>
- **Next thing they'll try:** <the action that must be obvious after success>

### 1.B Experience invariants — "it's not real unless…"
Author these directly as `C-###` entries in §4; list only the IDs here with a one-line gloss each. (Single-homed: the contract text lives in §4.)

### 1.C Obviousness audit
Top ~5 things a reasonable user assumes true that engineers might forget to build: **Assumption** → **Technical implication** (the requirement or integration proof it maps to).

### 1.D Design / UX bar (feature-wide)
- **Experience target:** <what this should feel like or enable>
- **Reference bar:** <specific product, local artifact, clip, prior implementation, or "None yet — established in rung X">
- **Must feel:** <3–5> · **Must not feel:** <3–5>
- **Human-review rejection criteria:** <what makes a reviewer reject the result>

## 2) Non-Goals

- <explicitly out of scope — "we are not building X">

## 3) Current State

### 3.1 Truth for active/next rungs
- [FACT F-001 | Confidence: High/Med/Low] <claim> — (SRC-001)
- [UNVERIFIED U-001] <claim> — <what source is missing>
- [INFERENCE I-001] <claim> — supported by F-___ — Disprove if: <one-liner>
- [PLAN P-001] <planned change> — <why> — (links: M__ / C-___)
Facts not affecting the active rung, next rung, a blocker, or a durable contract move to A3.

### 3.2 Gaps vs North Star
- <gap / risk / unknown>

### 3.3 Next actions (≤5)
- (N-1) <imperative action> — done when <measurable condition>

## 4) Contracts & Invariants (SOURCE OF TRUTH)

Optional definitions first. Then lane-specific `C-###` entries, clustered by concern **as needed — omit empty clusters entirely:** experience/product · safety/privacy · performance & hot path (budgets; include a cost-guardrail contract only when the lane changes production resource usage — infra, external services, model/tool calls, storage, hot paths — with the full Fermi worksheet in A5; otherwise cost analysis does not appear at all) · data bounding (hard caps, ordering, pagination, truncation, idempotency, empty-vs-missing-vs-error semantics) · surface schemas (name, inputs, outputs, limits, error semantics, observability — compact JSON examples where helpful) · failure & degradation (retries, dead letters, circuit breaking, rollback).

- [C-001 | Must] If <condition>, then <result>, otherwise the feature is broken. — (SRC-___ if verified)
- [C-002 | Must Not] <…>

## 5) Milestones (production-shippable ladder)

**Rung sizing** — judgment surface and blast radius, not calendar. Every rung records all four axes; `N/A` only with a reason.

| Axis | S | M | L | XL |
| --- | --- | --- | --- | --- |
| Complexity | one surface, well-patterned | 2–3 surfaces, some ambiguity | cross-cutting, new patterns | architectural, new primitives |
| Risk | revertible, 1-feature blast radius | shared infra, needs rollback plan | data model / user-facing degradation | irreversible migration, security, or money |
| Perf impact | no hot-path change | measurable, within budget | needs load test | architectural risk |
| Cost impact | <$100/mo | $100–1k/mo | $1k–10k/mo | >$10k/mo |

### 5.1 Rung index (projection of 5.2)

| Rung | State | Size | Unlock | Proof summary | Evidence | Commit | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |

### 5.2 Rung packets (truth)

Frame every rung one level above the implementation: "This unlocks [journey]. Within it, this rung enables [specific step]. The next thing the user will obviously try is [next step]" — if that next step doesn't exist, that is a named gap. Completed work is described by what it unlocked, not what it implemented.

Required elements per rung — rendering is free, elements are not:

- **State** (root §4 vocabulary) and **Size** (four axes).
- **Unlock:** the user/developer/engineering journey — actor, entry, 3–5 steps, observable success.
- **Design brief:** the product intent, engineering shape, or implementation philosophy needed to execute well; taste-critical rungs include their four taste lines here (see conventions).
- **Implementation lane:** owned systems/surfaces — evidence, not an allowlist.
- **Not in this rung:** what it intentionally does not do.
- **Contracts:** `C-###` refs and root-law refs; never restated.
- **Obviousness checks:** top assumptions → integration proof or time-bounded defer.
- **Risk & failure modes:** when material (privacy / perf / data loss / hangs).
- **Proof plan:** eval-plan gate IDs plus the shortest real journey loop that proves the value path (root §5 — mechanism-only or proxy proof cannot complete a rung; the eval plan owns harness mechanics and thresholds).
- **Evidence artifacts:** paths or `Pending — <what>`, with surviving summaries; medium per conventions.
- **Rung commit:** `<short-sha> — <subject>` | `Pending — commit after proof, spec sync, and eval sync`.
- **Done when:** the exact observable completion condition, including evidence recorded, projections synced, and commit recorded.

Completed rungs collapse to: unlock + proof summary + surviving figures + evidence pointer + commit. Narration → A4.

## 6) Proof & Eval Summary (projection of the eval plan)

| Gate | Rung | State | Artifact |
| --- | --- | --- | --- |

Mirrors eval-plan gate state; divergence resolves toward the eval plan. A gate without a runnable harness is marked `needs $eval__implement-proof-gate`, never quietly skipped.

## 7) Open Questions / Blockers

Each entry: why it matters, what would resolve it, and YOUR opinionated recommendation. Resolved questions move out (A4) in the same edit that resolves them.

---

# Appendix

## A1) Change-log history — entries rotated out of the header.
## A2) Decision log (ADR-lite) — Date / Decision / Rationale / Alternatives / Consequences / Disprove if. Recorded decisions bind later sessions (root §3).
## A3) Sources — `SRC-###: <file:line / commit / command / test output> — <what it proves> — (captured YYYY-MM-DD)`; plus inactive facts.
## A4) Archive — superseded content with replacement pointers; accepted coverage ledgers; completed-rung narration; resolved questions.
## A5) Quarantined scratch — raw notes, pasted context, maybe-important edge cases; optional deep implementation spec (sequence/state diagrams, store schemas, payload examples, cost worksheet). Must not redefine §4 contracts. Promote a note only when it affects a rung, blocker, or contract.
```

---

## Conformance Check (run before writing — never stored in the doc)

- Human Read is the first field; its `so that` climbs a level; it names active rung, next proof, main risk, decision needed.
- Every `[FACT]` has a `SRC`; major inferences have `Disprove if`; contradictions sit in §7, not smoothed over.
- Contracts appear only in §4; zero root-law clones; every `C-###` is testable.
- Rungs are the richest section; taste-critical rungs carry their own taste block; every rung has evidence recorded or `Pending` with a surviving-summary plan.
- Projections match rung bodies (header, Human Read, §5.1, §6) after this edit.
- ≤5 next actions; ≤3 active changelog entries; archives carry pointers; no empty scaffolding sections.
- No naked or duplicate milestone IDs; statuses use root vocabulary; ledger covers every user item on multi-item intake.

## Skill Result (return to caller)

- Work spec path · Eval plan path
- Eval-plan coverage: Missing | Covers exact lane | Needs `$eval__design-proof-gates` | Synced this edit
- Feature slug
- Lane status + approval state · Active rung · Lane boundary (one line)
- Input coverage state · Open blockers
- Next proof / commit point · Recommended next action
