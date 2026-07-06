---
name: plan__prepare-summary
description: Lane pre-flight — re-derives the spec's goal, unlocks, and concrete Done from rung bodies before any code, catching wrong-thing builds and projection drift; ends in a Grounded/Spec-gap launch verdict.  Triggers when opening or resuming any lane, before the first rung executes; as the required goal block for `$plan__implement-work-spec`; after compaction or handoff when a lane needs re-grounding.
tools: Read, Grep, Glob
---
# Prepare Summary — Lane Pre-flight

**Place in the system.** First step of the launch pipeline: this skill's output is the required goal block for `$plan__implement-work-spec` — a lane does not launch on an un-grounded spec. It reads the artifacts owned by `$plan__maintain-work-spec` (the work spec) and `$eval__design-proof-gates` (the eval plan) and edits nothing; findings route back to their owners. The summary is re-derived fresh at every launch and never stored — a saved summary is just another projection that can drift, which is the disease this pre-flight exists to catch.

## The Re-derivation Law

Read the active work spec and its eval plan (the path given at invocation, otherwise the current lane's). Answer by re-deriving from the rung bodies, §4 contracts, and the gate table — never by paraphrasing the Human Read or the status header. Those are projections of the rung bodies (the spec's projection-sync law, `$plan__maintain-work-spec`); an independent read is what makes this check worth running.

## The Four Questions

1. **Based on the work spec, what is the goal?** (1–2 lines)
2. **What is the eng / system unlock?** (1–2 lines — what the system can do after this that it couldn't before, and what that unlocks next; root §0)
3. **What is the user journey unlock?** (1–2 lines — who can now do what, as a concrete journey moment, not a feature name)
4. **What does "Done" ACTUALLY look like?** (3–5 lines — the terminal "so what" artifact a human will open (root §5), the gates that must read Objectively Green or human-accepted (eval plan §6), and the one outcome that would mean we are NOT done even if every box ticks)

## The Two Checks

- **Divergence:** if the re-derivation disagrees with the spec's Human Read or status header, that is a projection-sync bug — flag it, and do not silently adopt either side; the fix routes to `$plan__maintain-work-spec`.
- **Grounding:** the goal here is to ground things in a high-level user journey. From a code level: ensure we're not building the wrong thing, and ensure we're building the right thing the RIGHT way — no hacks, no "split brain" shortcuts, no "v1" stubs (root §9). If any rung smells like one, name it now, before code.

## Verdict

End with one line:

- **Grounded — launch.** This summary is the goal block `$plan__implement-work-spec` launches on.
- **Spec gap — stop.** The spec cannot answer one of the four questions, or a check failed: route to `$plan__maintain-work-spec` for missing or drifted content, or to `$plan__question-spec` if the spec's shape itself is suspect. Never invent an answer to fill a gap.