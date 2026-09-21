# Code Audit Skill

The runtime manifest is `SKILL.md`. It owns evidence-grounded code review, maintained-design recommendations, and separately calibrated release risk. It does not implement findings or authorize deployment.

## Files

- `SKILL.md` — the operating instructions and single report contract.
- `references/calibration-examples.md` — contrastive cases for difficult remedy choices.
- `evals/cases.md` — lightweight behavioral and routing cases for maintainers; not an ordinary runtime dependency.

## Naming and replacement

The manifest name is `audit-code`; `code__auditing` is the existing local namespace and this package's folder name. Keep one active implementation, not old and new competing audit skills.

For a repository whose registry resolves the existing `.agents/skills/code__auditing/` namespace, replace that skill's files and verify that `$code__auditing` still resolves to this manifest. If the runtime instead routes strictly by the manifest name, install the folder as `audit-code` and update the actual registry and affected references to `$audit-code`. Do not assume an alias exists, add a wrapper skill, or retain a second manifest to bridge the names.

## Required integration

Read the live governing contracts before installation. Saved root-contract copies are context, not proof of the current repository's rules. This package does not edit a root contract or another skill.

1. **Audit routing:** make the lead's default structural pass apply to focused code audits as well as general code audits. Preserve explicit specialist-only requests and explicitly restricted handoff slices. A live root that still mandates focused-code-only composition needs a corresponding authorized routing update; the skill must not silently override it.
2. **Dependencies:** keep the actual `audit-ai-code-accretion` skill available, plus `code__threejs-rapier-performance` when auditing its domain. Dependencies are not copied into this archive. Read their installed contracts; use an embedded interface only if it exists. Otherwise apply the specialist in the current reviewer context and integrate its evidence without a second durable report.
3. **Acceptance consumers:** the report now separates `Recommendation` from `Release risk`. A consumer that reads only `SHIP` must not translate it into design acceptance. Carry a `REWORK` finding or a material validation gap into the existing orchestrator's decision; do not create a second completion gate. Final acceptance remains with the existing owner.
4. **Custody and persistence:** reviewers remain read-only. The orchestrator owns the single durable report when required. Keep model routing and tool permissions in the governing runtime, not pinned in this skill.

## Design boundary

Material improvements are intended work, not “later cleanup” merely because release risk is low. Investigation can follow the causal system beyond a diff. Neither greater scope nor the absence of deadlines licenses speculative infrastructure, unsupported deletion, or unrelated rewriting.

The examples and behavioral cases are constructed. Behavioral model evaluations and live repository integration have not been run. Package inspection does not prove audit performance.
