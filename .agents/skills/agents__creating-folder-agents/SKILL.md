---
name: agents__creating-folder-agents
description: Creates or rewrites folder-scoped AGENTS.md files by qualifying the subtree, extracting repo-verified local contracts, and instantiating templates/agents/AGENTS__folder.md as the canonical artifact shape. Use when deciding whether a per-folder AGENTS.md should exist, creating one, updating one, or converting rough folder notes into a delta-shaped local contract; not for repo-wide AGENTS.md, generic coding standards, ordinary API docs, or one-off workflow runbooks.
tools: Read, Grep, Glob, Edit, Write
---

This skill creates and updates folder-scoped `AGENTS.md` files.

It is **not** the folder template. The canonical artifact shape is `templates/agents/AGENTS__folder.md` when that template exists in the repo/catalog. This skill is the workflow that decides whether the file should exist and how to fill it with true, local, high-signal instructions.

## Core Principle

A folder `AGENTS.md` is a **local contract**, not a second repo constitution.

It should answer only:

1. What this subtree owns.
2. How work enters and leaves it.
3. What must remain true.
4. What local defaults are non-standard.
5. How to prove a safe change here.
6. Where deeper rules take over.

Keep the file delta-shaped: repo-wide law belongs in the nearest parent/root `AGENTS.md`; long workflows belong in skills, runbooks, or docs; obvious facts belong nowhere.

## Use This Skill When

- The user asks to create, update, audit, or rewrite `AGENTS.md` for a specific folder or subsystem.
- A folder has local invariants, entrypoints, commands, failure modes, generated artifacts, performance cliffs, security boundaries, or architectural landmines that generic coding behavior will miss.
- Existing folder rules are too generic, stale, duplicated from the root contract, or shaped like documentation instead of agent operating instructions.
- The user asks whether a scoped `AGENTS.md` should exist.
- The user asks for a section that will later be placed into a folder-scoped `AGENTS.md`.

## Do Not Use This Skill For

- Repo-wide/root `AGENTS.md` authoring.
- Generic coding standards, style guides, ordinary README/API docs, or broad architecture explanation.
- Thin folders that have no local commands, ownership, invariants, or non-obvious risk.
- Pure leaf folders already fully governed by a parent contract.
- One-off task plans. Put those in the current plan/work spec, not in durable folder instructions.

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

If the gate fails, do **not** manufacture authority. Report that no scoped file is needed and, if useful, recommend updating the parent contract or a runbook instead.

### 3. Read Evidence Before Writing

Read only enough repo context to prove the local contract:

- Parent/root `AGENTS.md`.
- Existing local `AGENTS.md`, if present.
- README, architecture notes, work specs, runbooks, or generated-file headers in the subtree.
- Public entrypoints, exported APIs, handlers, jobs, screens, reducers, hooks, commands, or schemas.
- Targeted tests and package/workspace scripts that prove how to validate this subtree.
- Adjacent callers/dependencies when needed to understand ownership boundaries.

Do not infer commands, ownership, or invariants from naming alone. If an exact command cannot be proven, say that the command is unknown instead of inventing one.

### 4. Extract The Local Contract

Convert evidence into the canonical sections from `templates/agents/AGENTS__folder.md`:

- **Applies To / Inherits From / Superseded Below By**: exact path routing.
- **Purpose**: 2-4 repo-specific sentences explaining what this subtree owns and what correctness means.
- **Read First**: 3-6 files that give the fastest trustworthy orientation.
- **Exact Commands**: copy-paste commands that work from repo root unless a `cwd:` is explicitly stated.
- **Ownership & Interfaces**: owns, does not own, public entrypoints, value paths, inputs, outputs, callers, dependencies, crossed contracts, user-visible truths, nested routing.
- **Non-Obvious Local Rules**: counter-mean patterns, invariants, landmines, performance/order/cost constraints, security/fail-closed behavior, generated artifacts, local hard nos.
- **Change Protocol**: any local additions to the parent/root plan that materially affect this subtree.
- **Local Proof / Eval**: targeted proof commands, acceptance checks, regression risks, and artifacts to inspect.
- **Docs / Context Sync**: docs, schemas, manifests, snapshots, or generated artifacts that must be updated with code.
- **Known Edge Cases**: real edge cases from tests, incidents, comments, or implementation.
- **Final Sanity**: the short self-check agents should run before finishing work in this subtree.

Prefer fewer, sharper rules over exhaustive prose. A good folder contract changes agent behavior; it does not summarize the folder.

### 5. Instantiate The Canonical Template

If `templates/agents/AGENTS__folder.md` exists, copy its structure and replace it with real facts.

If the template is unavailable, reproduce the same contract shape from this skill. Keep the output compatible with the template so future synchronization is easy.

While composing:

- Replace every bracketed placeholder.
- Delete every false, unknown, or merely illustrative line.
- Keep examples out of the final file unless they are real repo facts.
- Preserve true existing local rules when updating an existing file.
- Remove stale rules, duplicated repo-wide policy, and vague advice.
- Use exact paths and commands.
- Keep generated/vendored artifacts clearly marked as hand-edited or regenerated.

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
Template_Source: [templates/agents/AGENTS__folder.md | skill fallback | existing file update]
Evidence_Read:
- [file/path]
Local_Truths_Captured:
- [ownership/invariant/command/landmine captured]
Deleted_Or_Omitted:
- [stale/generic/duplicated/unknown item removed or intentionally omitted]
Open_Blockers:
- [unknown command / ambiguous ownership / missing source of truth / none]
Recommended_Next_Action: [one concrete next step]
</Folder_AGENTS_Result>
```

If the user asked only for an audit, recommendation, or section draft, return the same summary without editing files.

## Hard Rules

- Do not create a folder `AGENTS.md` just because a folder exists.
- Do not write generic software-engineering advice into a folder contract.
- Do not invent commands, invariants, ownership, dependencies, or generated-file rules.
- Do not fork root policy into a local file.
- Do not bury project-specific authority inside this skill; project authority belongs in `AGENTS.md` files and templates.
- Do not ask the user questions from inside this workflow unless the target path or authority boundary is genuinely blocked.
