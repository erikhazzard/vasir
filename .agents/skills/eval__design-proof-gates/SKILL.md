---
name: eval__design-proof-gates
description: >-
  Designs the smallest sufficient set of falsifiable proof gates and owns a warranted eval-plan.md.
  Trigger: multiple gates, actors, environments, sessions, or a missing harness require durable coordination; decline when one inline check is enough.
tools: Read, Grep, Glob, Bash, Edit, Write
---

# Eval Plan — Proof-Gate Design

This skill answers one question:

> What is the smallest credible evidence that can falsify the declared unlock in the environment that matters?

It designs proof contracts. It never executes proof, claims green, invents a harness, accepts subjective quality, grants approval, or creates an eval plan merely because a lane is Substantial.

## Ownership and warrant

Root §5 owns proportional proof. This skill decides whether proof coordination genuinely needs a durable eval plan. An eval plan is warranted when one or more of these are materially true:

- several gates must remain coherent across rungs;
- multiple actors, environments, or same-run observers must be coordinated;
- gate state/receipts must survive several sessions;
- objective and subjective receipts must remain coordinated across sessions;
- a missing harness needs a durable implementation contract;
- a critical proof basis can go stale independently of work state.

If existing evidence or one inline check is sufficient, return No eval plan warranted and create nothing.

When warranted, this skill alone owns docs/work/<semantic-folders>/<feature-slug>/eval-plan.md: gate synthesis, mechanics, current proof basis, receipts, objective/subjective gate state, and harness inventory. The work spec owns lane scope and keeps only the surviving claim boundary and conclusion; it does not mirror gate state.

Creating a gate does not automatically justify a new harness, durable test, raw bundle, critical falsifier, audit overlay, or product instrumentation. Each exists only when the card's specific material risk cannot be handled more simply. `$eval__implement-proof-gate` owns a warranted missing harness; `$testing__enforcing-mandate` owns durable-test judgment.

## Sole schema authority

This file is the only eval-plan schema truth. Shipped references may calibrate specificity only when explicitly labeled non-authoritative; they may not say “use this template” or define another state/ID/section model.

Legacy adoption follows root §4:

- reading writes nothing;
- state-only touch repairs only the affected gate and receipt;
- material proof redesign adopts current cards for touched gates;
- full restructure needs an unsafe active section or an approved docs lane;
- gate IDs never renumber;
- no schema-version marker.

## Design laws

1. **Material risk before gates.** For every plausible material failure, choose sufficient existing evidence, a warranted proof obligation, or an authorized narrowed claim. No material failure means no gate ceremony.
2. **Falsifiable anatomy.** An objective gate binds Claim, plausible Lie, Setup, Action, Observation, Verdict, Authority, current Basis, Blind spot, Evidence receipt, Potency, and Stop condition. A field that does not affect the claim is omitted rather than filled ceremonially.
3. **Smallest coherent stack.** Prefer one terminal value-path gate over several mechanism checks. A gate earns existence only if it kills a plausible lie that existing evidence cannot.
4. **Potency follows consequence.** Defect: faithful watched-red. Refactor: existing guard or characterization where behavior is unknown. Critical invariant: realistic mutation, adversarial/property proof, or equivalent falsifier unless equivalent protection already exists. Routine behavior: a credible terminal oracle may be enough. Never manufacture an absence-red.
5. **Same-run compound proof.** When the value requires truths concurrently, use one coordinator/run ID and pass only if every required observer passes in the same window. Disconnected greens cannot prove a compound journey.
6. **Subjective truth stays human.** Feel, taste, trust, readability, motion, fun, and dev ergonomics use a Subjective gate only when an eval plan already needs to coordinate that decision. Acceptance records actor, source, date, exact question/scope, and reviewed artifact identity. A lone feel decision can remain directly in the work spec. Automation may prove artifact health; it never accepts.
7. **State is basis-bound.** A green receipt names the guarded claim/contracts, exact current basis, action/command, environment, result, owner, date, and claim boundary. If the claim or basis changes materially, state returns Open. A realistic harness defect moves it to Defective and invalidates prior green until repair/rerun.
8. **Waivers are authority acts.** Waived records authority, source, date, reason, exact scope/claim, residual risk, and expiry/revisit condition. It does not make behavior green.
9. **IDs are namespaced and append-only.** Use <SLUG>__GLOBAL-G1, <SLUG>__M2__G1, and <SLUG>__M2__S1. Retire with replacement pointer.
10. **No invented machinery.** Discovery is read-only. Commands, routes, fixtures, thresholds, paths, and environments come from repo truth or are labeled missing/assumed. A missing harness is a boundary, not an invitation to improvise.
11. **Proof medium follows the failure.** Browser, packet, persistence, benchmark, replay, or human media exists only when the material failure requires that fidelity. User visibility alone selects none.
12. **No automatic hostile or nearby gate.** Move a hostile/adjacent axis only when a plausible material failure warrants it.
13. **Stop precisely.** Allowed stops: missing approval/environment/credential; Waiting Human; repeated similar harness defect; changed unlock/contract/authority/rollback/product boundary; or a material claim that cannot be credibly observed. New files inside an approved boundary are not stops.

## Gate states and transitions

Objective gate:

Open → Harness Ready or Red Captured → Objectively Green

Any live objective state may become Blocked, Defective, Waived, or Retired with the required authority/evidence. Blocked returns to the prior safe state only when the named condition is evidenced. Objectively Green returns to Open when a guard/proof basis changes and to Defective when the instrument cannot distinguish the claim. Terminal Waived/Retired never silently reopen.

Subjective gate:

Waiting Human → Accepted or Rejected; a named authority may Waive or Retire it with a receipt. If the question, scope, or reviewed artifact changes materially, prior Accepted is no longer current and a new Waiting Human receipt is required.

Harness Ready means a new/intentionally changed value is absent and the instrument correctly detects that absence; it is not product potency. Red Captured is only a faithful escaped-defect reproduction. Objectively Green requires current authority-environment evidence and the declared potency. Defective is a first-class non-green state.

## Measurement and compound probes

Only when a material claim includes latency, throughput, smoothness, scale, capacity, convergence, or cost, design or explicitly decline a direct probe with:

- minimal actor pair and correlation ID;
- sourced budget or explicit assumption;
- baseline and target workload when a curve matters;
- decomposed load shape (connected/active, cadence, payload, locality, churn, duration, topology);
- value behavior under load, not connection count alone;
- observer overhead and stage attribution when it changes the decision;
- raw samples plus a surviving summary when later inspection or comparison requires retention.

Browser/manual observation is primary measurement only when the UI/browser is the measured boundary; otherwise it is an integration or subjective observer.

## Gate class menu

Use only applicable classes: terminal value path; contract/API; persistence/restore; realtime/convergence; same-run compound; scale/performance/cost; browser/render; network/packet; failure/hostile; security/privacy/auth; idempotency/retry; migration/compatibility; observability/operator; subjective human; nearby non-regression.

The menu is not a checklist.

## Workflow

1. Load root law, work spec, scoped repo law, and only the current proof artifacts that can change the decision.
2. Re-derive the unlock, terminal truth, claim boundary, target authority environment, and plausible material failures.
3. Decide **Plan warranted** or **No eval plan warranted**. If the latter, state the sufficient existing/inline evidence and stop without writing.
4. Discover existing checks/harnesses read-only. Prefer reuse; record blind spots and actual fidelity.
5. Decompose only material claims into required truths and plausible lies.
6. Select the smallest coherent stack. Design same-run proof first for compound claims.
7. Write objective and subjective cards, guards, potency, evidence receipt shape, state, and stop conditions.
8. Record any missing harness with its specific reason, envelope, and owner. Product instrumentation routes to an approved product rung; never hide it inside harness work.
9. Re-read before writing; write the eval plan; return the short surviving conclusion the work spec should retain.
10. Run the structural validator when available. It cannot judge proof potency or product meaning.

## Canonical template

~~~~markdown
# EVAL PLAN — <FEATURE_NAME>

**Human Read:** This plan can falsify <claim> in <authority environment>. Primary gate: <ID>. Current proof boundary: <what is and is not supported>. Next gate action: <one action or blocker>.

## Proof Capsule

**Last updated:** YYYY-MM-DD
**Work spec:** <path>
**Why this plan exists:** <why durable coordination/state is warranted instead of one inline check>
**Current proof owner:** <owner> | None — terminal
**First legal gate action:** <one action> | None — terminal
**Claim boundary:** <supported and unsupported claims>

## Doc Conventions

- Schema truth: $eval__design-proof-gates only.
- Objective and subjective state are separate.
- Gate IDs never renumber; retired cards keep replacement pointers.
- Green and Accepted bind exact claims, bases, and reviewed artifacts; material basis changes invalidate the current receipt.
- A gate does not automatically require a test, harness, raw bundle, falsifier, audit, or product instrumentation.

## 1) Unlock & Terminal Truth

- **Unlock:** <user journey or engineering system unlock>
- **Terminal truth:** <publicly observable end state>
- **Authority environment:** <where the claim matters>
- **Subjective component:** <human-only truth> | None
- **Claim boundary:** <what this plan can and cannot prove>

## 2) Material Risk & Synthesis

| Failure ID | Plausible material failure | Disposition | Gate / evidence / waiver | Why sufficient |
| --- | --- | --- | --- | --- |

| Required truth | Plausible lie | Class | Gate | Inclusion/exclusion reason |
| --- | --- | --- | --- | --- |

## 3) Proof Stack

<3–7 lines: the smallest coherent stack and same-run relationship.>
**Stack blind spot:** <axes no gate moves>.

## 4) Objective Gates

### 4.1 Index

| Gate | Class | State | Current basis | Receipt |
| --- | --- | --- | --- | --- |

### 4.2 Cards

~~~yaml
id: <SLUG>__M1__G1
class: <applicable class>
claim: <value claim this can falsify>
lie: <weak proof that could falsely pass>
setup: <minimal concrete state>
action: <exact public/system action>
observation: <terminal outcome inspected>
verdict: <exact pass/fail>
authority: <environment/source of truth>
basis: [<paths/contracts/rung anchors/harness/config/data/thresholds>]
blind_spot: <what the instrument cannot see>
potency: watched-red | characterization | mutation | adversarial/property | credible-oracle — <exact basis>
loop: <literal command/action> | missing harness: <name> | blocked: <reason>
run_policy: Default CI | Local eval | Milestone-gated | One-time | Human-assisted
stop: <exact stop condition>
state: Open | Harness Ready | Red Captured | Objectively Green | Blocked | Defective | Waived | Retired
receipt:
  last_run: none | <date/time>
  action: none | <exact command/human action>
  result: none | <actual result>
  evidence: none | <inline surviving summary or necessary artifact path>
  environment: none | <identity>
  owner: none | <actor>
  claim_boundary: none | <supported boundary>
waiver: none | <authority/source/date/reason/scope/residual risk/expiry>
refs: [<C-###>, <rung IDs>]
~~~

For a compound gate add coordinator, run_id, actors, scale/load shape, duration, churn/fault model, same-run observers, and aggregate verdict.

## 5) Subjective Gates

~~~yaml
id: <SLUG>__M1__S1
question: <one exact human acceptance question>
scope: <what acceptance covers>
artifact: <reviewed media path or live experience identity>
support: <technical-health evidence>
state: Waiting Human | Accepted | Rejected | Waived | Retired
receipt:
  actor: none | <human>
  source: none | <durable source>
  date: none | <date>
  reviewed_artifact: <path/build/run identity>
  response: none | <accepted/rejected wording>
waiver: none | <authority/source/date/reason/scope/residual risk/expiry>
refs: [<C-###>, <rung IDs>]
~~~

## 6) Harness Inventory & Missing Needs

**Existing:** <command/path/authority/fidelity/blind spot>

| Harness need | Enables | Why existing proof is insufficient | Envelope | Owner | Retirement |
| --- | --- | --- | --- | --- | --- |

Warranted missing harnesses route to $eval__implement-proof-gate. A runtime hook, telemetry, product config, or contract change routes to an approved product rung.

## 7) Run Policy & Exceptions

- Default CI: <IDs> · Local: <IDs> · Milestone-gated: <IDs> · One-time: <IDs> · Human: <IDs> · Blocked: <IDs + condition>
- Deterministic-proof exceptions: none | <narrowed claim and architectural reason>
- Artifact retention: <only what later inspection/comparison needs; surviving summary and regeneration action>

## Appendix

Retired cards with replacement pointers; superseded synthesis rows; receipt history whose provenance is still load-bearing.
~~~~

## Conformance check

- Durable coordination/state justifies the plan; otherwise no file was created.
- Material-risk synthesis includes every plausible material failure without turning classes into a quota.
- Every objective gate has falsifiable anatomy, current basis, potency, blind spot, and receipt shape.
- Same-run compound claims are not laundered through disconnected checks.
- Subjective truth uses a separate human receipt; no automation accepts it.
- Waivers name authority, reason, scope, residual risk, and expiry.
- Defective invalidates prior green.
- Harnesses, tests, artifacts, falsifiers, and instrumentation exist only when their specific risk warrants them.
- IDs and references resolve; the work spec retains only the current claim boundary and surviving conclusion.
- No invented command, threshold, route, or environment.
- Legacy untouched form was not rewritten.

## Skill Result

Return:

- Plan warranted: yes/no and reason;
- eval-plan path or None;
- work-spec path and exact surviving conclusion to retain;
- primary value-path gate/action;
- objective gates by state;
- subjective gates and current receipt state;
- warranted harnesses/artifacts/falsifiers;
- current claim boundary, blind spots, blockers;
- recommended next action.

Never render lane/rung completion or manufacture approval.
