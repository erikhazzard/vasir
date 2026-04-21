# AGENTS.md: [Folder / Domain] Local Contract
<!-- vasir:profile:folder-contract -->

> CREATE THIS FILE ONLY IF ALL ARE TRUE
> 1. This subtree is a real bounded context with coherent ownership.
> 2. It has local entrypoints, commands, invariants, failure modes, or architectural landmines that are not obvious from imports, filenames, or the parent contract.
> 3. The guidance below will remain true for most work in this subtree.
>
> Otherwise, delete this file and rely on the nearest parent `AGENTS.md`.

> DO NOT CREATE THIS FILE FOR
> - Generic buckets with no real contract (`utils/`, `shared/`, `components/`, `lib/`) unless they truly own distinct rules.
> - Thin wrappers with no local commands, tests, or non-obvious invariants.
> - Pure leaf folders whose behavior is already fully governed by the parent contract.

> EDIT THESE FIRST
> 1. Replace every bracketed placeholder.
> 2. Keep this file **delta-shaped**: repo-wide law stays in the parent/root `AGENTS.md`; only local truths belong here.
> 3. Replace every example with real repo facts or delete it.
> 4. Move one-off workflows to a skill/runbook. Move narrower file-type/path rules to a deeper scoped file or tool-specific rule.
> 5. Delete every line that is not true in this subtree.
> 6. Do not describe facts obvious from imports, filenames, or framework defaults. Document only the non-obvious.

**Applies To:** `/path/to/folder/**`  
**Inherits From:** `/AGENTS.md`  
**Superseded Below By:** `[none | /path/to/folder/subsystem/AGENTS.md]`  
**Canonical Contract:** This file is the local source of truth for this subtree. If another tool requires `CLAUDE.md` or a path-specific instructions file, create a thin shim that references this contract instead of forking content.  
**Last Updated:** `[YYYY-MM-DD — update alongside architectural changes in this subtree]`

<!-- vasir:purpose:start -->
**Purpose:** [Describe this subtree in 2-4 repo-specific sentences. State what it owns, what correctness means here, and what agents must optimize for locally.]

**Good examples**
- `This subtree owns inventory state authority, equipped-item projection, and persistence boundaries. Correctness means server authority, saved state, and rendered inventory never diverge under reconnect, rollback, or duplicate intent delivery. Optimize for deterministic state transitions and user-visible continuity.`
- `This folder creates matchmaking tickets and resolves them into room assignments. Correctness means ticket creation is idempotent, ordering-sensitive decisions remain deterministic, and failure modes fail closed instead of over-admitting players.`
<!-- vasir:purpose:end -->

---

## 0. Contract Mode

This file is a **local contract**, not a second repo constitution.

Use it to answer six things only:
1. What this subtree owns.
2. How work enters and leaves it.
3. What must remain true.
4. What local defaults are non-standard.
5. How to prove a safe change here.
6. Where deeper rules take over.

If a rule is true across the entire repo, move it to the parent/root `AGENTS.md`.  
If a workflow is too long to stay high-signal here, move it to a linked file doc, skill, or runbook.

---

## 1. Quick Entry

### Read First
List the 3-6 files that give the fastest trustworthy orientation.

- `/path/to/folder/README.md` — [architecture overview / lifecycle / glossary]
- `/path/to/folder/public_api.ts` — [public entrypoint]
- `/path/to/folder/contracts.ts` — [schemas / events / DTOs / selectors]
- `/path/to/folder/service.ts` — [orchestrator / value path]
- `/path/to/folder/tests/[canonical_test].spec.ts` — [best value-path test]
- `/path/to/folder/subsystem/AGENTS.md` — [only if deeper rules exist]

### Exact Commands
List **copy-paste exact** commands for this subtree only. Commands must work from the repo root unless you explicitly state `cwd:`.

- **Build:** `[exact command]`
- **Targeted tests:** `[exact command]`
- **Lint / typecheck:** `[exact command]`
- **Run / debug:** `[exact command]`
- **Regenerate derived artifacts (if applicable):** `[exact command]`

**Good examples**
- `pnpm --filter @web/payments test -- src/payments/tests/checkout_e2e.spec.ts`
- `go test ./services/matchmaking/...`
- `cargo test -p inventory_domain allocate_ticket -- --nocapture`

**Rules**
- Never use placeholder env vars.
- Never give “illustrative” commands.
- In a monorepo, prefer workspace-targeted commands over repo-wide sweeps.
- If this subtree requires a non-root working directory, state it explicitly: `cwd: packages/inventory`.

---

## 2. Ownership & Interfaces

### This Subtree Owns
[State the decisions, state transitions, rendering, data transforms, jobs, or domain rules this subtree is responsible for.]

### This Subtree Does **Not** Own
[List adjacent concerns that are external contracts, not casual edit targets.]

**Examples**
- `Authentication and session issuance live in /services/auth/.`
- `Price calculation is upstream and must not be reimplemented here.`
- `UI animation tokens live in /src/design-system/.`

### Public Entry Points
[List the canonical ways work enters this subtree.]

- `[API route / handler / job / screen / exported module / reducer / hook / command]`
- `[API route / handler / job / screen / exported module / reducer / hook / command]`

### Canonical Value Paths
Describe the 1-3 main value paths through this subtree in 3-7 bullets each.

**Example**
1. `JoinQueueButton`  
2. `createTicketIntent`  
3. `POST /tickets`  
4. `allocateTicket`  
5. `publishRoomAssignment`  
6. `client receives room assignment and transitions to match`

### Inputs Accepted
[List the real inputs this subtree consumes.]

- `[request DTOs / props / events / db rows / files / CLI args / messages]`

### Outputs / Side Effects
[List what this subtree emits or changes.]

- `[DB writes / rendered UI / published events / queued jobs / cache mutations / files]`

### Upstream Callers
[List the main callers or parent systems.]

### Downstream Dependencies
[List the main systems, services, tables, queues, or modules this subtree relies on.]

### Contracts Crossed
[List the schemas, tables, event names, DTOs, selectors, or persisted payloads that matter here.]

### User-Visible Truths
List **3 things a user/player assumes are true** when this subtree works.

- `[truth 1]`
- `[truth 2]`
- `[truth 3]`

**Good examples**
- `If the action button is enabled, the action is valid and will not fail a moment later due to local state drift.`
- `Reconnect does not duplicate inventory mutations.`
- `A match assignment is either visible exactly once or not visible at all; partial assignment is never rendered.`

### Nested Routing
If touching a deeper bounded context, read its contract before editing.

- `If touching /path/to/folder/subsystem/, read /path/to/folder/subsystem/AGENTS.md first.`
- `If no deeper file exists, this contract governs the entire subtree.`

---

## 3. Non-Obvious Local Rules

### Counter-Mean Patterns
List the “obvious” default approaches an agent will reach for that are **wrong here**, and state the approved local alternative.

**Good examples**
- `Do not fetch pricing directly from UI hooks; route all price reads through BillingIntentService.`
- `Do not write raw SQL against these tables without filtering soft deletes.`
- `Do not let the client author authoritative inventory state; clients send intents only.`

### Invariants
List the truths that must remain true even under retries, concurrency, reconnect, partial failure, and load.

- `[invariant]`
- `[invariant]`
- `[invariant]`

### Architectural Landmines
List the local quirks that are easy to “fix” incorrectly.

- `[silent success with semantic failure encoded in body/header]`
- `[ordering dependency that breaks under parallelism]`
- `[legacy behavior that must remain for compatibility]`
- `[cache invalidation rule that is not framework-default]`

### Performance / Ordering / Cost Constraints
State the local cliffs and why they exist.

- `[avoid N+1 path / batching rule / allocation hotspot / frame budget / lock contention]`
- `[ordering requirement / idempotency rule / backpressure constraint]`

### Security / Validation / Fail-Closed Behavior
State what must be rejected, quarantined, or fail-closed.

- `[malformed payload rule]`
- `[authz boundary]`
- `[never trust client-supplied field X]`

### Generated / Derived Artifacts
If this subtree contains generated code, compiled outputs, snapshots, fixtures, or vendored assets, say exactly what is hand-edited versus regenerated.

- `Do not edit /path/to/generated/** directly. Edit /path/to/source/** and run [exact regeneration command].`
- `Snapshots under /path/to/snapshots/** are review artifacts, not authoring surfaces.`

### Local Hard No’s
List the few absolute “never do this here” rules that are unique to this subtree.

- `[hard no]`
- `[hard no]`

---

## 4. Change Protocol For This Subtree

When the main work is materially inside this subtree, **extend the parent/root plan** with this exact block:

<Local_Plan>
1. Scope:
- [Which part of this subtree is changing?]

2. Entry / Exit Points:
- [Which handlers, screens, jobs, modules, APIs, or exports are crossed?]

3. Contracts Crossed:
- [Which schemas, tables, events, selectors, DTOs, or persisted payloads are affected?]

4. Invariants At Risk:
- [Which local truths could be broken by this change?]

5. Files To Touch:
- [Exact files only.]

6. Local Eval:
- [Exact commands and the artifact that proves the change worked.]
</Local_Plan>

**Example**
<Local_Plan>
1. Scope:
- Ticket dedupe during reconnect in `/src/matchmaking/allocator.ts`

2. Entry / Exit Points:
- `POST /tickets` -> `allocateTicket` -> `publishRoomAssignment`

3. Contracts Crossed:
- `TicketRequest`, `matchmaking_ticket` table, `room.assignment.created`

4. Invariants At Risk:
- Duplicate reconnects must not over-admit players

5. Files To Touch:
- `/src/matchmaking/allocator.ts`
- `/src/matchmaking/tests/allocator_reconnect.spec.ts`

6. Local Eval:
- `pnpm test src/matchmaking/tests/allocator_reconnect.spec.ts`
</Local_Plan>

### Boundary Rules
- Do not touch files outside the declared list unless you update `Files To Touch` first.
- If the change crosses into another bounded context, read that contract before editing there.
- If a needed rule is missing here, fall back to the parent contract, nearby specs, or code truth — not generic framework habits.
- Cross-boundary work is a contract change, not a casual refactor.

---

## 5. Local Proof & Evaluation

### Canonical Local Checks
List the smallest trustworthy checks for this subtree.

- **Fast value-path test:** `[exact command or test file]`
- **Broader integration test:** `[exact command]`
- **Lint / typecheck:** `[exact command]`
- **Visual / interaction proof (if UI):** `[exact command/tool]`
- **Perf / trace proof (if perf-sensitive):** `[exact command/tool]`

### Required Proof Style
- **Bug fix:** first reproduce with a failing deterministic test nearest the real value path.
- **Schema / event / contract change:** verify both producer and consumer boundaries.
- **UI / UX change:** verify in the real rendered surface, not only by code inspection.
- **Perf-sensitive change:** capture a fresh benchmark, trace, or frame/perf artifact in the runtime that matters.
- **Generated artifact change:** prove the generator path, not just the output diff.

A passing narrow unit test that bypasses the real value path is not sufficient when a value-path check exists.

Before closing work in this subtree, output this exact block:

<Local_Eval>
- Commands Run: [exact commands]
- Artifacts Checked: [test output / screenshot / trace / benchmark / replay]
- Result: [pass/fail + brief factual summary]
- Invariants Verified: [which local truths were explicitly checked]
- Docs Synced: [files updated or "none"]
- Boundary Check: [confirm no unauthorized files were changed, or list justified exceptions]
</Local_Eval>

**Example**
<Local_Eval>
- Commands Run:
  - `pnpm test src/matchmaking/tests/allocator_reconnect.spec.ts`
- Artifacts Checked:
  - Failing repro turned green for duplicate reconnect admission
- Result:
  - Pass; duplicate reconnect now returns prior assignment instead of creating a second slot
- Invariants Verified:
  - Reconnect is idempotent
  - Assignment is emitted once
- Docs Synced:
  - `/src/matchmaking/AGENTS.md`
- Boundary Check:
  - Only allocator + test files changed
</Local_Eval>

---

## 6. Documentation & Context Sync

Update this file in the **same change** whenever any of these become stale:

- Entry points move.
- Commands change.
- Schemas, tables, events, selectors, or public interfaces change.
- A new deeper `AGENTS.md` is added or removed.
- A new landmine, invariant, or local hard no is discovered.
- The source-of-truth path for generated artifacts changes.

Also update the nearest local README, spec, ADR, or workfile when this subtree’s contract changes.

**Rules**
- Stale local docs are bugs.
- Keep this file high-signal. Move long procedures to sidecar docs and link them.
- Delete stale lines immediately instead of letting exceptions accumulate.

---

## 7. Edge-Case Variants

Use a **smaller** version of this contract for special subtrees:

- **Generated code / build output / vendor mirrors:** focus on source-of-truth, regeneration command, forbidden direct edits, and review expectations.
- **Docs / content folders:** focus on canonical sources, preview/build commands, publish path, and ownership.
- **Test harness / fixtures:** focus on determinism, fixture ownership, cleanup rules, replayability, and environment setup.
- **Pure leaf folders with no unique local truth:** do not create a local contract at all.

---

## 8. Final Sanity Check For Maintainers

Before keeping this file, confirm all are true:

- This contract adds information the parent contract does not already provide.
- Most lines are local facts, not reusable philosophy.
- Commands are exact and current.
- The main value paths are clear.
- The non-obvious failure modes are named.
- Another agent could change this subtree safely without wandering into siblings.
- Every section earns its token cost.