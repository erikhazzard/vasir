---
name: plan-manage-work-spec
description: Create, maintain, review, or implement a work spec that preserves the requested outcome across substantial work and context changes. Use when asked to plan a substantial feature, revise or audit its spec, or begin, continue, or resume implementation from a spec. Also use to design the proof for a spec, build a proof harness an eval plan names, recover where the work stands after lost context, or give an independent ship or no-ship judgment. Small self-contained tasks do not require a work spec.
license: MIT
metadata:
  gc-owner: "erik"
  gc-engine: "agnostic"
  gc-platforms: "agnostic"
  gc-status: "draft"
  gc-tags: "planning, work-spec, implementation, product-review, continuity, proof-gates, eval-plan"
  gc-source: "https://github.com/erikhazzard/vasir/tree/d04347b0d515d4c3c46b5e012e2c334fdabf83bd/.agents/skills"
  gc-source-skills: "plan__maintain-work-spec, plan__question-spec, plan__implement-work-spec, eval__design-proof-gates, eval__implement-proof-gate, handoff__final-quality-gate, plan__prepare-summary"
  gc-source-revision: "d04347b0d515d4c3c46b5e012e2c334fdabf83bd"
---

# Manage a Work Spec

**The work spec is the core of this package. Read [the work-spec procedure](references/work-spec/work-spec.md) first.**

Every substantial feature starts there. It creates and maintains the work spec: the one product map the work is built from, with the request, the North Star, the contracts, the vertical-slice ladder and the active rung. Everything else in this package serves that file.

## The work spec, and its proof

| When | Read |
| --- | --- |
| **Any substantial work.** Planning it, creating its work spec, updating the spec, or changing its journey, contracts, active rung or a load-bearing decision. | **[The work-spec procedure](references/work-spec/work-spec.md)** |
| The spec exists and its proof has to be designed: proof gates, or an eval plan. | [The proof-gates procedure](references/proof-gates/proof-gates.md) |

## The other procedures

Read one of these only when the request is exactly that. Each of them works from the work spec.

| When | Read |
| --- | --- |
| A current eval card names a proof harness that does not exist yet, or one is defective. | [The proof-harness procedure](references/proof-harness/proof-harness.md) |
| A drafted spec is to be challenged before anything is built from it. | [The question-the-spec procedure](references/question-spec/question-spec.md) |
| Building from a spec is to begin, continue, resume or finish. | [The implement procedure](references/implement.md) |
| A status or summary is asked for, or context was lost. | [The summary procedure](references/summary.md) |
| An independent ship or no-ship judgment is wanted on a high-regret lane. | [The final-gate procedure](references/final-gate.md) |

## How to read a procedure

- Each procedure was written as a skill of its own. Where it says "this skill", it means that procedure.
- A link to another procedure, such as [the proof-gates procedure](references/proof-gates/proof-gates.md), is a file in this package. Open it.
- A skill called with a dollar sign, such as `$code-audit-codebase`, is another package of this library. If it is not installed, carry on and say which judgement was not available.
- "Root `AGENTS.md` §N" is section N of the project's root instructions: 1 Constraint Precedence, 2 Project-Specific Non-Obvious Constraints, 3 The Working Relationship, 4 Lanes & Work Artifacts, 5 Proof Doctrine, 6 Audits & Postmortems Are Exceptional, 7 Multi-Agent & Model Routing, 8 Custody, 9 Engineering Doctrine. This library ships that file as `templates/agents/engineering/AGENTS.md`. Where a project's root instructions have no such section, follow the rule as the procedure states it and say the root section was not there.
- A path to a file that ships with a procedure is relative to that procedure's own file.
