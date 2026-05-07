---
name: agents__creating-folder-agents
description: Creates or rewrites folder-scoped AGENTS.md files by qualifying the subtree, extracting repo-verified local contracts, and instantiating this skill's embedded folder-contract shape. Use when deciding whether a per-folder AGENTS.md should exist, creating one, updating one, or converting rough folder notes into a delta-shaped local contract; not for repo-wide AGENTS.md, generic coding standards, ordinary API reference, or one-off task plans.
tools: Read, Grep, Glob, Edit, Write
---

This skill creates and updates folder-scoped `AGENTS.md` files.

The workflow and file shape below are self-contained so this skill works after installation in any repo.

## Core Principle

A folder `AGENTS.md` is a **local contract**, not a second repo constitution.

It should answer only:

1. What this subtree owns.
2. How work enters and leaves it.
3. What must remain true.
4. What local defaults are non-standard.
5. How to prove a safe change here.
6. Where deeper rules take over.

Keep the file delta-shaped: repo-wide law belongs in the nearest parent/root `AGENTS.md`; long procedures and obvious facts belong nowhere.

## Use This Skill When

- The user asks to create, update, audit, or rewrite `AGENTS.md` for a specific folder or subsystem.
- A folder has local invariants, entrypoints, commands, failure modes, generated artifacts, performance cliffs, security boundaries, or architectural landmines that generic coding behavior will miss.
- Existing folder rules are too generic, stale, duplicated from the root contract, or shaped like explanation instead of agent operating instructions.
- The user asks whether a scoped `AGENTS.md` should exist.
- The user asks for a section that will later be placed into a folder-scoped `AGENTS.md`.

## Do Not Use This Skill For

- Repo-wide/root `AGENTS.md` authoring.
- Generic coding standards, style guides, ordinary API reference, or broad architecture explanation.
- Thin folders that have no local commands, ownership, invariants, or non-obvious risk.
- Pure leaf folders already fully governed by a parent contract.
- One-off task plans. Put those in the current task plan, not in durable folder instructions.

## Required Workflow

### 1. Resolve Scope And Inheritance

Identify:

- Target subtree path.
- Nearest parent/root `AGENTS.md`.
- Any existing local `AGENTS.md`.
- Any deeper `AGENTS.md` files that supersede this contract for narrower paths.

If the target path is unclear, infer the smallest coherent subtree from the request and repo structure. If that is still ambiguous, return a blocker instead of guessing.

### 2. Run The Qualification Gate

Create or keep a folder `AGENTS.md` only if all are true:

1. The subtree is a real bounded context with coherent ownership.
2. It has local entrypoints, commands, invariants, failure modes, or architectural landmines not obvious from imports, filenames, or the parent contract.
3. The guidance will remain true for most work in the subtree.

Do not create one for generic buckets like `utils/`, `shared/`, `components/`, or `lib/` unless they truly own distinct rules.

If the gate fails, do **not** manufacture authority. Report that no scoped file is needed.

### 3. Read Evidence Before Writing

Read only enough repo context to prove the local contract:

- Parent/root `AGENTS.md`.
- Existing local `AGENTS.md`, if present.
- Existing files in the subtree that prove ownership, entrypoints, invariants, or generated-file rules.
- Public entrypoints, exported APIs, handlers, jobs, screens, reducers, hooks, commands, or schemas.
- Targeted tests and package/workspace scripts that prove how to validate this subtree.
- Adjacent callers/dependencies when needed to understand ownership boundaries.

Do not infer commands, ownership, or invariants from naming alone. If an exact command cannot be proven, say that the command is unknown instead of inventing one.

### 4. Extract The Local Contract

Convert evidence into these canonical contract sections:

- **Applies To / Inherits From / Superseded Below By**: exact path routing.
- **Purpose**: 2-4 repo-specific sentences explaining what this subtree owns and what correctness means.
- **Read First**: 3-6 files that give the fastest trustworthy orientation.
- **Exact Commands**: copy-paste commands that work from repo root unless a `cwd:` is explicitly stated.
- **Ownership & Interfaces**: owns, does not own, public entrypoints, value paths, inputs, outputs, callers, dependencies, crossed contracts, user-visible truths, nested routing.
- **Non-Obvious Local Rules**: counter-mean patterns, invariants, landmines, performance/order/cost constraints, security/fail-closed behavior, generated artifacts, local hard nos.
- **Change Protocol**: any local additions to the parent/root plan that materially affect this subtree.
- **Local Proof / Eval**: targeted proof commands, acceptance checks, regression risks, and artifacts to inspect.
- **Context Sync**: existing files, schemas, manifests, snapshots, or generated artifacts that must be updated with code.
- **Known Edge Cases**: real edge cases from tests, incidents, comments, or implementation.
- **Final Sanity**: the short self-check agents should run before finishing work in this subtree.

Prefer fewer, sharper rules over exhaustive prose. A good folder contract changes agent behavior; it does not summarize the folder.

### 5. Instantiate The Embedded Folder Contract Shape

Write the folder `AGENTS.md` from this shape. Replace every placeholder with real repo facts or delete the line.

```markdown
# AGENTS.md: <Folder / Domain> Local Contract

> CREATE THIS FILE ONLY IF ALL ARE TRUE
> 1. This subtree is a real bounded context with coherent ownership.
> 2. It has local entrypoints, commands, invariants, failure modes, or architectural landmines that are not obvious from imports, filenames, or the parent contract.
> 3. The guidance below will remain true for most work in this subtree.
>
> Otherwise, delete this file and rely on the nearest parent `AGENTS.md`.

**Applies To:** `<exact subtree glob, such as /services/billing/**>`
**Inherits From:** `<nearest parent/root AGENTS.md>`
**Superseded Below By:** `<none | exact deeper AGENTS.md paths>`
**Canonical Contract:** This file governs the subtree paths listed above.
**Last Updated:** `<YYYY-MM-DD>`

**Purpose:** <2-4 repo-specific sentences: what this subtree owns, what correctness means here, and what agents must optimize for locally.>

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
If a procedure is too long to stay high-signal here, do not include it.

---

## 1. Quick Entry

### Read First
- `<path>` - <why this file is the fastest trustworthy orientation>
- `<path>` - <public entrypoint / orchestrator / schema / canonical test>

### Exact Commands
- **Build:** `<exact command, or omit if none is proven>`
- **Targeted tests:** `<exact command, or omit if none is proven>`
- **Lint / typecheck:** `<exact command, or omit if none is proven>`
- **Run / debug:** `<exact command, or omit if none is proven>`
- **Regenerate derived artifacts:** `<exact command, only if applicable>`

Commands must work from the repo root unless a `cwd:` is explicitly stated. Never include illustrative commands.

---

## 2. Ownership & Interfaces

### This Subtree Owns
- <decisions, state transitions, rendering, data transforms, jobs, or domain rules owned here>

### This Subtree Does Not Own
- <adjacent concerns that are external contracts, not casual edit targets>

### Public Entry Points
- <API route / handler / job / screen / exported module / reducer / hook / command>

### Canonical Value Paths
1. <main value path as exact files, functions, routes, jobs, or screens>
2. <second value path, if useful>

### Inputs Accepted
- <request DTOs / props / events / db rows / files / CLI args / messages>

### Outputs / Side Effects
- <DB writes / rendered UI / published events / queued jobs / cache mutations / files>

### Upstream Callers
- <main callers or parent systems>

### Downstream Dependencies
- <systems, services, tables, queues, or modules this subtree relies on>

### Contracts Crossed
- <schemas, tables, event names, DTOs, selectors, or persisted payloads>

### User-Visible Truths
- <truth a user/player/operator assumes when this subtree works>
- <truth>
- <truth>

### Nested Routing
- If touching `<deeper path>`, read `<deeper path>/AGENTS.md` first.
- If no deeper file exists, this contract governs the entire subtree.

---

## 3. Non-Obvious Local Rules

### Counter-Mean Patterns
- Do not <tempting wrong local move>; instead <approved local alternative>.

### Invariants
- <truth that must hold under retries, concurrency, reconnect, partial failure, and load>

### Architectural Landmines
- <local quirk that is easy to "fix" incorrectly>

### Performance / Ordering / Cost Constraints
- <avoid N+1 path / batching rule / allocation hotspot / frame budget / lock contention>
- <ordering requirement / idempotency rule / backpressure constraint>

### Security / Validation / Fail-Closed Behavior
- <what must be rejected, quarantined, authorized, or fail closed>

### Generated / Derived Artifacts
- Do not edit `<generated path>` directly. Edit `<source path>` and run `<exact regeneration command>`.

### Local Hard No's
- <absolute never-do-this-here rule unique to this subtree>

---

## 4. Change Protocol For This Subtree

When the main work is materially inside this subtree, extend the parent/root plan with:

<Local_Plan>
1. Scope:
- <Which part of this subtree is changing?>

2. Entry / Exit Points:
- <Which handlers, screens, jobs, modules, APIs, or exports are crossed?>

3. Contracts Crossed:
- <Which schemas, tables, events, selectors, DTOs, or persisted payloads are affected?>

4. Invariants At Risk:
- <Which local truths could be broken by this change?>

5. Files To Touch:
- <Exact files only.>

6. Local Eval:
- <Exact commands and artifacts that prove the change worked.>
</Local_Plan>

Boundary rules:
- Do not touch files outside the declared list unless you update `Files To Touch` first.
- If the change crosses into another bounded context, read that contract before editing there.
- Cross-boundary work is a contract change, not a casual refactor.

---

## 5. Local Proof & Evaluation

### Canonical Local Checks
- **Fast value-path test:** <exact command or test file>
- **Broader integration test:** <exact command, if proven>
- **Lint / typecheck:** <exact command>
- **Visual / interaction proof:** <exact command/tool, if UI>
- **Perf / trace proof:** <exact command/tool, if perf-sensitive>

### Required Proof Style
- **Bug fix:** first reproduce with a failing deterministic test nearest the real value path.
- **Schema / event / contract change:** verify both producer and consumer boundaries.
- **UI / UX change:** verify in the real rendered surface, not only by code inspection.
- **Perf-sensitive change:** capture a fresh benchmark, trace, or frame/perf artifact in the runtime that matters.
- **Generated artifact change:** prove the generator path, not just the output diff.

Before closing work in this subtree, output:

<Local_Eval>
- Commands Run: <exact commands>
- Artifacts Checked: <test output / screenshot / trace / benchmark / replay>
- Result: <pass/fail + brief factual summary>
- Invariants Verified: <which local truths were explicitly checked>
- Context Synced: <files updated or "none">
- Boundary Check: <confirm no unauthorized files were changed, or list justified exceptions>
</Local_Eval>

---

## 6. Context Sync

Update this file in the same change whenever entrypoints, commands, schemas, events, public interfaces, generated-artifact sources, or deeper scoped `AGENTS.md` routing changes.

Update existing adjacent context files only when they already carry the same contract.

---

## 7. Edge Cases

- <real edge case from tests, incidents, comments, or implementation>

---

## 8. Final Sanity Check For Maintainers

- This contract adds information the parent contract does not already provide.
- Most lines are local facts, not reusable philosophy.
- Commands are exact and current.
- The main value paths are clear.
- The non-obvious failure modes are named.
- Another agent could change this subtree safely without wandering into siblings.
- Every section earns its token cost.
```

While composing:

- Delete every section or bullet that cannot be filled with true local facts.
- Delete all examples, placeholders, and unknown commands.
- Preserve true existing local rules when updating an existing file.
- Remove stale rules, duplicated repo-wide policy, and vague advice.
- Use exact paths and commands.
- Keep generated/vendored artifacts clearly marked as hand-edited or regenerated.
- For generated code, content folders, test fixtures, or other special subtrees, use a smaller version of the same contract focused on the real local risk.

### 6. Self-Audit Before Returning

Before finalizing, check:

- The file would still be true for most future work in the subtree.
- Every rule is local to the subtree and not already better owned by a parent/root contract.
- The file names real entrypoints, commands, contracts, or invariants.
- No placeholders, fake examples, stale aliases, or invented commands remain.
- The output explains how to prove a safe change.
- Deeper scoped rules are routed to, not duplicated.

## Output Contract

Return this summary after creating, updating, or declining a folder contract:

```text
<Folder_AGENTS_Result>
Outcome: [Created | Updated | No scoped file needed | Blocked]
Path: [path to AGENTS.md or target subtree]
Inherits_From: [nearest parent/root AGENTS.md]
Applies_To: [glob or subtree]
Evidence_Read:
- [file/path]
Local_Truths_Captured:
- [ownership/invariant/command/landmine captured]
Deleted_Or_Omitted:
- [stale/generic/duplicated/unknown item removed or intentionally omitted]
Open_Blockers:
- [unknown command / ambiguous ownership / missing evidence / none]
Recommended_Next_Action: [one concrete next step]
</Folder_AGENTS_Result>
```

If the user asked only for an audit, recommendation, or section draft, return the same summary without editing files.

## Hard Rules

- Do not create a folder `AGENTS.md` just because a folder exists.
- Do not write generic software-engineering advice into a folder contract.
- Do not invent commands, invariants, ownership, dependencies, or generated-file rules.
- Do not fork root policy into a local file.
- Do not bury project-specific authority inside this skill; project authority belongs in actual `AGENTS.md` files.
- Do not ask the user questions from inside this workflow unless the target path or authority boundary is genuinely blocked.
