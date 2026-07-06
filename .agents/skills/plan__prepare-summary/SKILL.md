---
name: plan__prepare-summary
description: Lane pre-flight — re-derive the spec's goal, unlocks, and concrete Done before touching code; catches wrong-thing builds and projection drift.
tools: Read, Grep, Glob, Edit, Write
---
# Prepare Summary (lane pre-flight)

Read the active work spec and its eval plan ($ARGUMENTS if a path is given, otherwise the current lane's). Answer **by re-deriving from the rung bodies, §4 contracts, and the gate table — not by paraphrasing the Human Read**. The Human Read is a projection; rung bodies are truth, and your independent read is what makes this check worth running.

1. **Based on the work spec, what is the goal?** (1–2 lines)
2. **What is the eng / system unlock?** (1–2 lines — what the system can do after this that it couldn't before, and what that unlocks next; root §0)
3. **What is the user journey unlock?** (1–2 lines — who can now do what, as a concrete journey moment, not a feature name)
4. **What does "Done" ACTUALLY look like?** (3–5 lines — the terminal "so what" artifact a human will open (root §5), the gates that must read Objectively Green or human-accepted (eval plan §6), and the one outcome that would mean we are NOT done even if every box ticks)

Then two checks:

- **Divergence:** if your re-derivation disagrees with the spec's Human Read or status header, that is a projection-sync bug — flag it; do not silently adopt either side.
- **Grounding:** the goal here is to ground things in a high-level user journey. From a code level: ensure we're not building the wrong thing, and ensure we're building the right thing the RIGHT way — no hacks, no "split brain" shortcuts, no "v1" stubs (root §9). If any rung smells like one, name it now, before code.

If the spec cannot answer one of these questions, that is a spec gap: stop and route to `$plan__maintain-work-spec` — or `$plan__question-spec` if the spec's shape itself is suspect — instead of inventing an answer.