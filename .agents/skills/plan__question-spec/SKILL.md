---
name: plan__question-spec
description: Challenges whether a drafted work spec would deliver the user's actual vFinal journey through valuable lasting vertical slices and whether its proposed capabilities are necessary. Use for explicit product-journey or capability-necessity review, generic requests to audit, question, or adversarially review a work spec, or cold-context recovery exposing a concrete product mismatch, proxy substitution, or high-regret ambiguity; focused architecture or moving-parts-only requests and performance, scale, or cost-only requests stay with their named sibling skills, and this never runs as an automatic pre-implementation gate.
tools: Read, Grep, Glob
---

# Question the Spec

This is an independent, read-only product challenge under root §§6–7. Freshness, bounded reviewer inputs, and exactly-once delegation follow root; this skill never creates its own review hop. It asks whether the team is about to build the right thing, not whether the document has enough sections.

Do not edit the spec, invent a review stack, or delay a coherent lane to manufacture alternatives. Accepted changes route through `$plan__maintain-work-spec`.

## Core question

> Is `vFinal` the complete journey the user actually asked for, and does every rung make a valuable part of that journey genuinely work?

Also ask:

> Could the team implement this spec perfectly and still visibly fail the user?

## First-principles compression

**Hold the required user outcome fixed; treat every proposed capability, requirement, and mechanism as replaceable.** State the outcome without solution words, then ask what the smallest credible spec would be if we knew everything we know now on day one. Every retained mechanism must trace to a real user outcome, observable contract, or current external, authority, safety, data-integrity, compatibility, or measured constraint—not merely another proposed mechanism. If B, C, and D exist only because of A, challenge A first. If the outcome survives without A, delete the whole chain and specify the smallest direct behavior; otherwise retain only the parts forced by the named constraint.

## Review priorities

Inspect only dimensions capable of changing the product:

- **Request fidelity:** Every `Must` and `Must Not` reaches an observable contract or rung. Flag omissions, weakening, contradictory non-goals, and non-equivalent proxies.
- **vFinal and unlock:** The final journey is complete and valuable rather than a mechanism, `v0`, `v1`, MVP, or reduced substitute.
- **Rung integrity:** Every milestone is a working vertical slice through a real entrypoint and path, uses the lasting shape, and makes the next rung additive. Backend/schema/test/polish/discovery phases are not product milestones.
- **Experience quality:** The obviousness assumptions and design/UX bar are concrete enough to prevent a technically present but visibly wrong result.
- **Learning latitude:** Files, symbols, sequencing, internal design, technical schema details that preserve the external promise, and equivalent rung decomposition remain adaptive.
- **Material correctness:** Examine only failure, authority, security, persistence, performance, cost, or reversibility risks that could materially change the chosen product or make the active slice unsafe.
- **Failure-contract truth:** Against root §9, challenge any spec that turns containment, an empty response, hidden capability, blocked proof, or a successful no-op into delivered value. Material failures name the affected subject/scope, surviving value, honest non-success outcome, and recovery; a rung remains open when its promised terminal outcome did not occur.
- **Proof restraint:** The proposed evidence observes the real slice and does not become a parallel product.

A non-equivalent substitute for a required outcome is a blocker. A formatting preference, missing optional section, or alternative that does not change value is not a finding.

## Output

Lead with the single biggest product gap, or say no material gap was found.

For each real finding, provide:

- **Verdict:** Needs work | Blocker
- **User impact:** how the current spec could visibly fail
- **Smallest correction:** the minimum product-level change

Finish with:

- **Recommendation:** Implement as written | Implement after the named correction | Fix spec first
- **Required changes before implementation:** up to three, or `None`
- **Biggest remaining product risk:** one, or `None`

Do not produce a mandatory concern ledger, rejected-alternative inventory, specialist audit, or proof plan.

## References

- [references/eval-cases.md](references/eval-cases.md) — use only when validating this skill's routing, first-principles rewrite, fresh-review topology, or sibling boundaries.
