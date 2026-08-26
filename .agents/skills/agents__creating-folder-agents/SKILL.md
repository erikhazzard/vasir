---
name: agents__creating-folder-agents
description: Creates, rewrites, audits, or declines folder AGENTS.md files as local steering maps for one subtree. Use when a folder needs durable agent orientation, local instructions, and folder-specific non-obvious constraints; not for repo-root AGENTS, nested app/package root generation, generic coding standards, ordinary API reference, or one-off task plans.
tools: Read, Grep, Glob, Edit, Write
---

This skill creates and updates folder `AGENTS.md` files as local steering maps.

## Core Principle

Folder AGENTS are local steering maps. They combine context, instructions, and folder-specific non-obvious constraints for one subtree.

They must steer edits:

1. What to read first.
2. What this folder owns.
3. Where work enters and leaves.
4. What agents tend to break here.
5. Which local defaults override generic behavior.
6. How to prove a change here.
7. Where deeper maps take over.

If a line would not change what an agent reads, modifies, avoids, or proves, delete it.

## Taxonomy

- Root `AGENTS.md`: repo-wide operating contract.
- Nested root `AGENTS.md`: generated app/package root contract in a monorepo, created with `vasir agents sync --scope <path>`.
- Folder `AGENTS.md`: hand-authored steering map for one subtree. No companion `AGENTS__non-obvious.md`. No root template. No `vasir agents sync --scope`.

Use this skill only for folder AGENTS.

## Use This Skill When

- The user asks to create, update, audit, or rewrite `AGENTS.md` for a specific folder or subsystem.
- The folder has durable local facts an agent cannot infer cheaply from filenames.
- The folder has local entrypoints, invariants, proof commands, generated artifacts, dangerous defaults, or failure modes.
- Existing folder guidance is stale, generic, duplicated from root, or written as explanation instead of steering.
- The user asks whether a folder AGENTS should exist.

## Do Not Use This Skill For

- Repo-root AGENTS authoring.
- Nested app/package roots that should be generated with `vasir agents sync --scope <path>`.
- Generic coding standards, style guides, ordinary API reference, or broad architecture explanation.
- Thin folders that have no local ownership, commands, invariants, proof path, or non-obvious risk.
- One-off task plans. Put those in the current plan, not durable folder guidance.

## Required Workflow

### 1. Resolve The Folder

Identify:

- Target subtree path.
- Nearest parent/root `AGENTS.md`.
- Existing folder `AGENTS.md`, if present.
- Deeper `AGENTS.md` files that take over for narrower paths.

If the target path is unclear, infer the smallest coherent subtree from the request and repo structure. If that is still ambiguous, return a blocker instead of guessing.

### 2. Run The Qualification Gate

Create or keep a folder `AGENTS.md` only if at least one of these is true:

1. The folder owns a real value path, boundary, domain, subsystem, generated artifact source, or proof harness.
2. The folder has local instructions or non-obvious constraints that prevent plausible wrong edits.
3. The folder has proof commands, runtime checks, or artifacts agents repeatedly need.
4. The folder has deeper maps that need routing from this level.

Do not create one for generic buckets like `utils/`, `shared/`, `components/`, `lib/`, or `scripts/` unless the bucket has real local steering facts.

If the gate fails, do not manufacture authority. Return `No folder map needed`.

### 3. Read Evidence Before Writing

Read only enough repo context to prove the steering map:

- Parent/root `AGENTS.md`.
- Existing folder `AGENTS.md`, if present.
- Files in the subtree that prove ownership, entrypoints, invariants, generated-file rules, or proof commands.
- Public entrypoints, exported APIs, handlers, jobs, screens, reducers, hooks, commands, schemas, or test harnesses.
- Adjacent callers or dependencies when needed to understand boundary rules.

Do not infer commands, ownership, or invariants from naming alone. If an exact command cannot be proven, say the command is unknown instead of inventing one.

### 4. Extract Steering Facts

Capture only local facts that steer behavior:

- **Owns**: decisions, value paths, state transitions, rendering, data transforms, jobs, boundaries, or proof harnesses owned here.
- **Read First**: files that give the fastest trustworthy orientation.
- **Entry Points**: handlers, routes, commands, screens, jobs, exported modules, reducers, hooks, schemas, or generators.
- **Non-Obvious Constraints**: invariants, local hard nos, counter-mean patterns, generated artifact rules, dangerous defaults, perf/order/cost constraints, and any exact local effect that cannot safely proceed. For failure behavior, name the affected subject and the independent behavior that continues; never turn an independently containable member, candidate, or dependency fault into collection, service, startup, health-check, or process failure.
- **Proof Commands**: exact commands, harnesses, artifacts, screenshots, traces, snapshots, fixtures, or manual checks needed to prove changes here.
- **Deeper Maps**: child folders whose `AGENTS.md` files take precedence.

Prefer fewer, sharper rules over exhaustive prose. A good folder AGENTS changes agent behavior; it does not summarize the folder.

### 5. Write The Folder AGENTS

Write the folder `AGENTS.md` from this shape. Delete every placeholder or section that cannot be filled with true local facts.

```markdown
# AGENTS.md: <Folder / Domain> Steering Map

**Applies To:** `<exact subtree glob, such as /services/billing/**>`
**Inherits From:** `<nearest parent/root AGENTS.md>`
**Deeper Maps:** `<none | exact deeper AGENTS.md paths>`
**Last Updated:** `<YYYY-MM-DD>`

## Purpose

<2-4 repo-specific sentences: what this folder owns, what correctness means here, and what agents must optimize for locally.>

## Read First

- `<path>`: <why this file is the fastest trustworthy orientation>
- `<path>`: <entrypoint, orchestrator, schema, canonical test, or generator source>

## Owns

- <local decisions, value paths, state transitions, rendering, data transforms, jobs, boundaries, or proof harnesses>

## Entry Points

- <API route, handler, job, screen, exported module, reducer, hook, command, schema, or generator>

## Non-Obvious Constraints

- Do not <tempting wrong local move>; instead <approved local move>.
- Preserve <local invariant that generic edits tend to break>.
- Do not edit `<generated path>` directly. Edit `<source path>` and run `<exact regeneration command>`.

## Proof

- **Fast local check:** `<exact command or "unknown">`
- **Value-path check:** `<exact command, artifact, screenshot, trace, or manual check>`
- **Generated artifact check:** `<exact command, only if applicable>`

## Deeper Maps

- `<deeper path>/AGENTS.md`: read before touching `<deeper path>/**`.
- If no deeper map applies, this file governs the subtree.
```

While composing:

- Delete sections that have no local facts.
- Preserve true existing local rules when updating an existing file.
- Remove stale rules, generic advice, duplicated root policy, and vague explanation.
- Use exact paths and commands.
- Mark generated or vendored artifacts as source-owned, output-owned, or off-limits.
- Keep the file small enough for an agent to read before editing.

## Self-Audit

Before finalizing, check:

- The file steers reads, edits, avoids, or proof.
- Every rule is local to the subtree.
- Repo-wide law stayed in the parent/root AGENTS file.
- Commands are exact or explicitly unknown.
- No placeholders, fake examples, stale aliases, or invented commands remain.
- The proof path is clear.
- Deeper maps are routed to, not duplicated.

## Output Contract

Return this summary after creating, updating, or declining a folder steering map:

```text
<Folder_AGENTS_Result>
Outcome: [Created | Updated | No folder map needed | Blocked]
Path: [path to AGENTS.md or target subtree]
Inherits_From: [nearest parent/root AGENTS.md]
Applies_To: [glob or subtree]
Evidence_Read:
- [file/path]
Steering_Facts_Captured:
- [ownership / entrypoint / invariant / command / landmine / deeper map]
Deleted_Or_Omitted:
- [stale / generic / duplicated / unknown item removed or intentionally omitted]
Open_Blockers:
- [unknown command / ambiguous ownership / missing evidence / none]
Recommended_Next_Action: [one concrete next step]
</Folder_AGENTS_Result>
```

If the user asked only for an audit, recommendation, or section draft, return the same summary without editing files.

## Hard Rules

- Do not create a folder `AGENTS.md` just because a folder exists.
- Do not use `AGENTS__non-obvious.md` for folder steering maps.
- Do not generate folder steering maps with `vasir agents sync --scope`.
- Do not write generic software-engineering advice into a folder AGENTS.
- Root §9 owns failure scope. Never author or preserve a broader local outage rule without current repository evidence that every independent result would itself perform the same named unsafe effect.
- Do not invent commands, invariants, ownership, dependencies, or generated-file rules.
- Do not fork root policy into a local file.
- Do not ask the user questions unless the target path or authority boundary is genuinely blocked.
