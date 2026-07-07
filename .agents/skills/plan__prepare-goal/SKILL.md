---
name: plan__prepare-goal
description: Lane launch — turns a grounded work spec into rung-by-rung implementation with full motion approval, gate-first proof, between-rung audit lenses, and a hard stop at the first human boundary. Triggers: invoked to launch or resume implementation of a work spec, after `$plan__prepare-summary`
tools: Read, Grep, Glob, Edit, Write, Bash
---
# Implement Work Spec — Lane Launch

**You have full approval** to implement the work spec.

**Place in the pipeline.** `$plan__prepare-summary` (Grounded) → this launch → rung-by-rung execution → `$handoff__final-quality-gate`. The Goal block below is required and must end **Grounded — launch**; a lane never launches on **Spec gap — stop** or on an un-grounded spec.

## The Grant and Its Boundaries

- **"Full approval" grants motion, not verdicts.** Approval is scoped to this spec's rungs and its §4 contracts. **Waiting Human is never auto-claimed** (root §4); subjective gates close only on recorded human acceptance.
- The lane runs to its terminal state or halts at the **first Waiting Human or Blocked boundary** — halt and report (root §3); never push through a human gate.
- Out-of-scope findings are flagged, never fixed (root §8). Edit and access whatever files and repos the rungs require — custody still binds.
- The root operating contract binds throughout; the nearest `AGENTS.md` narrows or grants only where a root rule says it may.
- Subagents per root §7: codex-class delegates take menial work and clean-context audits; product code and design judgment stay orchestrator-tier.

## Execution Law

- **Rung by rung, in spec order.** Statuses transition AS work proceeds — Proposed → In Progress → their terminal states — because the spec, not chat, is durable memory: a fresh session must be able to resume from the spec alone.
- **The eval plan travels with the spec.** Gates are each rung's definition of done; capture reds before fixes (root §5); a rung claims Objectively Green only on a fresh gate artifact.
- **Before each rung's code:** run `$code__enforcing-principles` — risk-classify the rung and let the tags set its proof obligations.
- **Between rungs**, where the surface warrants: run the audit lenses — `$code__auditing`, `$testing__auditing`. The `tmp/` report artifact is what proves a lens ran; **a named lens is not a run lens.** Verdicts are recommendations; the orchestrator triages them.
- **Bugs found mid-lane:** `$code__fixing-bugs` — capture the watched red at the escape boundary, then fix under it.
- Code files stay focused: ≤ 1k LOC, semantically coherent, testable, well organized and named.

## Close

The lane ends at its terminal state or its first human boundary, statuses current, gate ledger fresh. A release-ready claim closes only through `$handoff__final-quality-gate`.

## Goal

[Paste the `$plan__prepare-summary` output here — four questions, two checks, and a verdict that must read **Grounded — launch**.]