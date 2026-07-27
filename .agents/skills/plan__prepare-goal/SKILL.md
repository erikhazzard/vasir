---
name: plan__prepare-goal
description: >-
  Builds an approved work spec's active vertical slice and continues toward vFinal while adapting implementation details to repo/runtime truth.
  Trigger: the user asks to begin, continue, resume, or finish a substantial lane whose product spine and active rung are clear.
tools: Read, Grep, Glob, Edit, Write, Bash
---

# Prepare Goal — Build the Slice

The work spec is a map. This skill builds the product.

Do not create a fresh summary, revision digest, projection sync, test plan, eval plan, or audit merely to begin. Use `$plan__prepare-summary` only when context is genuinely cold or the next product action is unclear.

Before the first product write, follow the active rung's exact links into `references/implementation-map.md` and any semantic reference it names. Read only the linked depth. `references/provenance.md` is cold context: load it only when the current work genuinely turns on prior rationale, a retired path, or source lineage. References inform implementation but never override the work spec or current source/runtime truth.

## Start conditions

Before the first product write, confirm:

1. The user request, `vFinal`, non-goals, observable contracts, and active rung describe one coherent product.
2. The active rung is a valuable working vertical slice with a real entrypoint, real path, observable outcome, lasting shape, and additive next rung.
3. The current turn or durable work-spec record authorizes this product direction.
4. No genuine product fork, external-contract violation, externally owned authority or safety/data-integrity boundary, irreversible action, missing environment/credential, or shared-folder custody collision blocks the next action.

If these are clear, build. Do not manufacture another gate.

## Execution law

- **Build the slice, not the checklist.** Keep the actor, entrypoint, promised outcome, quality bar, and obvious next action in view. Backend, schema, tests, polish, and feasibility investigation are work inside the slice.
- **The map follows the territory.** Adapt files, symbols, internal architecture, technical schema details that preserve the external promise, sequencing, estimates, proof mechanics, and equivalent rung decomposition as evidence arrives. Do not seek reapproval or contort code to stale prose.
- **Product forks stop; engineering discoveries do not.** Stop only when the new shape would materially change the user/consumer promise, violate an existing external contract, cross an externally owned authority or safety/data-integrity boundary, require an irreversible operation, or reverse an explicit human decision.
- **Implementation is the default motion.** Continue through coherent in-boundary work rather than interrupting after every action for spec maintenance.
- **Proof is proportional.** Inspect the shortest real value path. Reuse current source, direct observation, and existing checks first. Add or modify a durable test only when a specific material regression risk needs it. Create an eval plan, harness, artifact bundle, or independent audit only when that specific risk cannot be credibly handled more simply.
- **Specialists are conditional.** Invoke `$code__enforcing-principles`, `$testing__enforcing-mandate`, `$eval__design-proof-gates`, or an audit skill only when their owned judgment is actually needed. Loading a skill is not progress.
- **Subjective truth stays human.** Stop for the user's verdict only when the active slice has an explicit feel/taste/readability/fun gate and the reviewable experience is ready.
- **Failures stay bounded.** Fix a discovered in-boundary defect and continue. Stop after a repeated similar tool/harness failure or a real boundary above, not because the turn or rung is large.

## Implementation loop

For each coherent chunk:

1. Re-read the request anchor, `vFinal`, active slice, applicable contracts, its exact implementation-map links, and the smallest current source needed for the next change.
2. Implement the natural in-boundary work required to make the promised outcome real.
3. Inspect the direct value path and only the checks justified by the material risk.
4. Let evidence change implementation details. If it exposes a product fork, stop; otherwise keep building.
5. Update the work spec immediately for changed product meaning, load-bearing contract, observable rung boundary, blocker, or human decision. Batch useful implementation/evidence notes at a coherent checkpoint or rung close.
6. When the slice works, record its observable result and advance to the next additive rung. Do not insert a mandatory summary or audit between rungs.

## Completion

The lane is complete when the declared `vFinal` journey works through its real entrypoint, the terminal observable result has been inspected with the cheapest credible current proof, required human acceptance is recorded, and no known delta remains inside the declared boundary.

An independent final review is optional: run one when the user requests it or a specific high-regret risk benefits from independent judgment in a fresh conversation using the same existing repo folder (root §7). It is not automatic because the lane is substantial.

## Result

Return only:

- the active slice or rung completed;
- the observable user/system result;
- the exact fresh check or inspection and actual result;
- any material thing not run or still unproven;
- the next additive rung, real blocker, human decision, or `vFinal` completion.
