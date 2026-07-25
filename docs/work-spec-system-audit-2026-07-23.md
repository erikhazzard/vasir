# Work-Spec System Fresh-Context Audit — 2026-07-23

> **Status:** Durable audit evidence. Only the final implementation disposition
> below is adopted; all other recommendations remain historical, not doctrine.
>
> **Round-two update — 2026-07-24:** Six additional fresh-context audits are
> preserved in §11–§22. Their disposition table supersedes specific round-one
> remedies where noted; round-one observations remain historical evidence.
>
> **Final implementation disposition — 2026-07-24:** The preservation-first,
> product-led core was adopted with a compact single-file work spec, `vFinal`
> vertical slices, adaptive implementation detail, and risk-proportional proof.
> Formal `AD-###` admission IDs, prose digests, projection/ownership ledgers,
> automatic eval plans, and default terminal audits were rejected. This document
> remains historical audit evidence, not executable doctrine.
>
> **Authority:** The current `templates/agents/AGENTS.md` and
> `.agents/skills/plan__maintain-work-spec/SKILL.md` remain canonical until an
> explicitly approved change lands.
>
> **Guardrail:** This report did not use
> `docs/work-spec-progressive-disclosure-proposal.md` or
> `docs/work-spec-reference-templates.md`. Those are discarded design artifacts,
> not inputs to this audit.

## Executive verdict

Seven independent fresh-context audits converged on one conclusion:

**Keep the preservation-first work-spec architecture, but repair its approval,
lifecycle, proof-routing, and retention rules before treating the combined system
as safe for autonomous execution.**

The product forest is load-bearing and must remain explicit:

- Purpose;
- User Journey Unlock;
- Engineering System Unlock;
- exact entry points;
- North Star journey;
- obviousness audit;
- design/UX bar;
- non-goals;
- current truth and uncertainty;
- observable contracts;
- decisions;
- rich executable active rungs;
- subjective/human gates;
- surviving evidence;
- terminal user-value proof.

The audits did **not** find evidence that default reference files are necessary.
The dominant failures are stale execution state, mislocated detail, speculative
future planning, permanent narration retention, and conflicting downstream
mandates—not irreducible content volume.

The highest-severity defect is approval laundering: root doctrine says unclear
approval after compaction means unapproved, while `plan__prepare-goal` currently
asserts that the agent has full approval. A cold executor can therefore manufacture
authority the durable state does not establish.

## 1. Intent and success criteria

### 1.1 What the work-spec skill is trying to accomplish

The work spec is a substantial lane's durable judgment state across context loss,
parallel writers, proof transitions, and human handoffs. Its job is to preserve:

1. why the lane exists and what user/system capability it unlocks;
2. what the lane promises and explicitly excludes;
3. which rung is executable now;
4. what evidence is authoritative;
5. what remains unproven, blocked, or awaiting a human;
6. which decisions and provenance must survive later sessions.

It is not primarily a PRD generator, implementation diary, changelog, or storage
bucket for every investigation artifact.

### 1.2 Intended reader

The primary reader is a capable engineer or agent arriving with zero working
context. They need to orient quickly, recover the approved boundary, execute the
next safe action without broad rediscovery, and avoid claiming more than the
evidence supports.

### 1.3 S-tier output

An S-tier artifact has these measurable properties:

1. The first screen identifies outcome, approval boundary, active rung, next
   executable action, blocker, next proof, and current claim boundary.
2. A cold senior can execute the active rung from its journey, owned surfaces,
   contracts, failure modes, proof obligation, and done condition.
3. Every active claim is sourced or honestly labeled; consequential inferences
   name a falsifier.
4. Each contract has one coherent authority, condition, observable outcome,
   failure meaning, and credible falsifier.
5. Active judgment is cheap to retrieve; stale narration and inactive commands do
   not compete with current execution truth.
6. Product intent remains aligned with the active rung after every material edit.
7. A completed or superseded lane cannot be mistaken for runnable current work.

### 1.4 Output-ruining behaviors

- optimizing line count by deleting user/product meaning;
- treating comprehensiveness as permanent narration retention;
- bundling independently failing requirements into one contract ID;
- duplicating proof mechanics between work spec and eval plan;
- elaborating distant rungs and missing harnesses before their risks are admitted;
- leaving stale commands or next actions in terminal/superseded lanes;
- letting a launcher infer or manufacture approval;
- unioning conflicting mandates into more tests, gates, audits, and artifacts.

### 1.5 Common misinterpretation

The most damaging misread is that the work spec is a complete archive of everything
ever learned. The intended invariant is durable judgment, not permanent narration.
Git can recover mechanical history. The live spec must retain the facts, decisions,
consequences, authority transfers, surviving proof figures, and ID tombstones that
still steer current or future work.

## 2. Method and evidence basis

### 2.1 Fresh-context audit lenses

| Audit | Primary question | Result |
| --- | --- | --- |
| Mandate-conflict audit | Do root, plan, proof, testing, and handoff rules have coherent ownership and precedence? | Found approval, lane-sizing, proof-order, lifecycle, and audit conflicts. |
| Skill-domain audit | Does the skill encode expert requirements/architecture/decision-record practice? | Strong durable-state core; retention, atomicity, lifecycle, and conformance gaps. |
| Execution simulation | Can a cold executor orient, choose an action, implement, process proof, resume, and resolve terminal lanes? | Best specs pass; stale next actions and incomplete proof handoffs make others unsafe. |
| Product-value audit | Does the system preserve the forest rather than only mechanisms? | Product forest is excellent at creation but not revalidated during maintenance. |
| Information-architecture audit | Does real evidence falsify one canonical `work-spec.md`? | No. Retrieval and lifecycle fail before single-file capacity does. |
| Longitudinal-safety audit | Is the state model closed under compaction, parallel writers, approval changes, child transfer, and closure? | No-ship until approval provenance and lifecycle transactions are repaired. |
| Minimalism red team | Which mechanisms prevent dumb tests, harnesses, audits, and speculative work? | Automaticity and the missing Material lane create ceremony cascades. |

All seven audits were read-only. Each was instructed not to inspect the discarded
proposal files. Their conclusions were synthesized only after their independent
reports returned.

### 2.2 Domain frames applied

The audits used these established bodies of practice as reasoning frames:

- actor/outcome-first requirements and use cases;
- atomic, unambiguous, independently verifiable requirements;
- rolling-wave planning and progressive commitment;
- architecture views separated by consumer and change axis;
- ADR-style preservation of context, decision, consequences, and supersession;
- information hiding and single ownership of normative truth;
- Working Backwards from durable customer benefit;
- risk-proportionate verification and cheapest credible proof seams.

Named traditions referenced by reviewers included Wiegers and Beatty,
Robertson/Robertson, Cockburn, Clements et al., Ousterhout, ISO/IEC/IEEE 29148,
RFC 2119/8174, Parnas/Clements, Nygard's ADR framing, C4/arc42, and Amazon Working
Backwards. These were used as analytical frames, not as substitutes for repository
evidence.

### 2.3 Repository specimen census

One audit counted 139 current backend work specs:

- median: 377 lines;
- p90: 694 lines;
- maximum: 1,321 lines;
- 36 exceed 500 lines;
- five exceed 1,000 lines.

Raw length did not predict executability. A modern 420-line spec was immediately
actionable, while an 88-line spec had ambiguous execution ownership and proof
handoff.

History-selected specimens included:

| Specimen | Approx. size | Why it was selected |
| --- | ---: | --- |
| `persistent-social-garden-state` | 37 | Compact supersession redirect after previously being 475 lines. |
| `leaderboard-user-score-reset` | 49 | Very compact journey/contract/failure packet. |
| `session-rotation-continuity` | 88 | Short but semantically dense and execution-ambiguous. |
| `shared-world-capability-contract` | 127 | Recent, lean, but schema-nonconforming. |
| `valkey-engine-family-alignment` | 144 | Positive compact template specimen. |
| `DONE__splash-coin-wallet-history` | 224 | Completed lane retaining stale plans and history. |
| `fast-application-deploy` | 320 | Useful lane with excess active changelog. |
| `play-truth-attribution` | 420 | Positive high-churn execution specimen. |
| `live-session-matchmaking` | 460 | Thin rungs followed by large normative appendices. |
| replay SDK/presentation specimens | 444–474 | Strong product framing with stale next-action/proof projections. |
| `universal-mobile-auth-continuity` | 694 | Strong forest and state model, but misplaced deep normative detail. |
| `game-backend-capability-system` | 822 | Useful active packet plus 476-line appendix and speculative future gates. |
| `character3d-128-player-combat-authority` | 991 | Strong current truth with long history and 46 decisions. |
| `multiplayer/netcode-foundation` | 1,127 | High churn; current work delegated to a child deep in the file. |
| `durable-turn-sessions-and-game-skill-ratings` | 1,321 | Large A5 containing material that reads as normative despite appendix status. |

Other longitudinal specimens included native Meta reconciliation, global
self-service auth cutover, shared-devbox parent/child specs, replay supersession,
profile parity hotfix, pushed-source replacement, and voice reliability.

## 3. Convergent findings

### F-001 — Approval can be manufactured after context loss

- **Severity:** P0
- **Class:** mandate/skill-family conflict
- **Confidence:** High

Root doctrine says approval or lane ownership uncertainty—explicitly including
context compaction—must be treated as unapproved
(`templates/agents/AGENTS.md:71-85`). Backend work instructions require explicit
approval date and scope. Yet:

- the work-spec header has no required approval-provenance record
  (`plan__maintain-work-spec/SKILL.md:82-89`);
- the decision log does not require actor, source, current state, or supersession;
- preflight derives grounding but does not establish launchability;
- `plan__prepare-goal` states "You have full approval"
  (`plan__prepare-goal/SKILL.md:8-15`).

**Observed consequence:** a cold executor can move from uncertain or stale approval
to active implementation without a durable authority source.

**Required correction:** record approval actor/date/source/exact scope and
revocation/supersession. Preflight must distinguish `grounded` from `launchable`.
Launch verifies approval and can never grant it.

### F-002 — No canonical next executable action exists

- **Severity:** P1
- **Class:** template defect plus consumer conflict
- **Confidence:** High

The header contains a next commit point and §3.3 permits several next actions.
Projection sync covers the header, Human Read, rung index, and gate table but omits
§3.3 (`plan__maintain-work-spec/SKILL.md:52-59,101-109,163-165`). Proof execution
updates the eval card and §6 mirror but can leave the intended next action stale.

Observed specimens contained all of these states:

- local proof already green while the next action still said to build the proof;
- a blocked parent still looking active after execution moved to a child;
- a superseded spec retaining an executable next commit;
- a completed lane retaining old milestone commands.

**Required correction:** one required `Next executable action` record with action
ID, owner, exact action/command, current runnability, prerequisite, and state-event
revision. All lifecycle/proof transactions must update it or leave an explicit
sync-pending marker that blocks execution.

### F-003 — Lifecycle is not closed under supersession, child transfer, parking, or closure

- **Severity:** P1
- **Class:** template defect
- **Confidence:** High

Allowed lane states omit first-class `Superseded`/`Redirected` semantics. Parking
requires a resume condition, but the header does not require one. Parent/child
authority transfer is prose rather than a typed ownership transition. Gate state
can remain green after the contract or scope it proved has changed.

The mandatory `DONE__` folder rename also creates path churn for a document designed
to be durably cross-referenced. Several complete lanes already decline to follow
that rule, which is evidence that the rule is impractical rather than safely
enforced.

**Required correction:** add lifecycle, active owner, parent/successor, resume
condition, transferred contract/rung/gate IDs, residual blockers, and state-event
revision. Scope or contract revision invalidates prior green proof until explicitly
reconciled. Keep stable paths; if a move is unavoidable, leave a redirect.

### F-004 — The missing Material lane creates a ceremony cascade

- **Severity:** P1
- **Class:** root mandate defect
- **Confidence:** High

Root doctrine says there are two sizes—Quick and Substantial—while later referring
to "spec-less material changes"
(`templates/agents/AGENTS.md:103-108,186-192`). Architecture review also reasons
about medium work. This undeclared middle pushes uncertain changes into the
Substantial pipeline.

The resulting loop is self-reinforcing:

1. uncertainty promotes the lane to Substantial;
2. Substantial automatically creates a work spec and eval plan;
3. those artifacts generate gate/harness/audit obligations;
4. the obligations make the lane appear substantial in retrospect.

**Required correction:** define Quick / Material / Substantial by durable
coordination and regret, not visibility or file count. Material work gets a compact
inline or single-rung boundary/proof record when needed, without automatic eval
plans or audit stacks.

### F-005 — Proof proportionality is overridden downstream

- **Severity:** P1
- **Class:** skill-family conflict
- **Confidence:** High

Root proof doctrine correctly says a durable test, gate, or harness must earn
admission (`templates/agents/AGENTS.md:142-148`).
`testing__enforcing-mandate` likewise permits zero new tests
(`testing__enforcing-mandate/SKILL.md:79-86`). But:

- `code__fixing-bugs` requires a failing test before every fix and a CI-ready test
  afterward (`code__fixing-bugs/SKILL.md:51-57,91-96`);
- eval design can require complete missing-harness inventories before active
  implementation;
- launch introduces between-rung audit pressure;
- final handoff can require multiple lens reports and another report over them;
- some backend-local rules still retain universal mutation/integration/artifact
  pressure.

**Required correction:** independently admit each durable test, eval plan, new
harness, artifact bundle, and specialized audit. Defects require a faithful
watched-red reproduction at the real boundary; committing a durable regression
test is a separate maintenance-value decision.

### F-006 — Proof-instrument ordering can deadlock

- **Severity:** P1
- **Class:** skill-family conflict
- **Confidence:** High

Eval design says an admitted missing harness should exist before product code, while
the harness implementer must stop when the proof needs a new runtime hook,
telemetry, or configuration seam. No skill owns the instrumentation change that
makes the harness possible.

**Required correction:** proof routing must be unidirectional:

1. root admits the proof obligation;
2. change-risk classification identifies the needed fidelity;
3. testing strategy decides whether a durable test/instrument earns admission;
4. substantial multi-gate proof coordination enters the eval plan;
5. if product-owned instrumentation is needed, create an explicit active-rung
   instrumentation sub-step before harness implementation.

### F-007 — Handoff and audit fan-out can become audits of audits

- **Severity:** P1
- **Class:** mandate/consumer conflict
- **Confidence:** High

The root automatically audits work-spec lanes. Launch suggests between-rung audits.
Specialized audit skills may each create reports. The final-quality gate consumes
those reports, blocks on missing lenses, and writes another report. If any report
creates a new gate or test, the chain can retrigger.

Handoff is also described as a milestone-closure mechanism while requiring every
applicable eval gate to be terminal—impossible when future milestone gates remain
open.

**Required correction:** one terminal clean-context audit for substantial or
high-regret work. Add a specialized lens only for a distinct material blind spot.
Handoff is final-lane closure, not every milestone transition.

### F-008 — Permanent narration retention contradicts the skill's stated purpose

- **Severity:** P1
- **Class:** internal template contradiction
- **Confidence:** High

The skill says the spec is not an audit log and that stale logs/dead references
should be cut. It also says history moves but never vanishes and provides
permanently growing appendix containers
(`plan__maintain-work-spec/SKILL.md:9,112,223-229`). Backend work instructions say
superseded material that no longer steers work should be deleted.

Observed effects include:

- hundreds of lines of active changelog in a high-churn parent;
- completed-rung diaries left uncollapsed;
- resolved open questions and accepted input ledgers remaining in the active read
  path;
- A5 scratch containing contracts that read as normative;
- legacy commands surviving into complete and superseded lanes.

**Required correction:** replace "history never vanishes" with:

> **Load-bearing judgment and provenance never vanish. Mechanical narration may
> collapse; Git owns recoverable edit history.**

Retain binding decisions, alternatives, consequences, authority transfers,
replacement pointers, stable-ID tombstones, surviving proof figures, and evidence
regeneration. Prune routine status narration, obsolete plans, copied commands,
resolved questions without future decision value, and dead scratch.

### F-009 — The product forest is created but not transactionally preserved

- **Severity:** P1
- **Class:** template/consumer defect
- **Confidence:** High

Purpose, both unlocks, North Star, journey, obviousness, UX bar, and non-goals are
strong requirements at creation (`plan__maintain-work-spec/SKILL.md:90-94,126-145`).
Material-edit projection sync revalidates execution projections but not those
product commitments. `plan__prepare-summary` compares re-derived execution state
mostly with Human Read/status, not the complete product forest.

This makes a second-order failure possible: the plan remains internally consistent
while drifting away from the user experience it was created to unlock.

**Required correction:** every material edit and preflight must compare active/next
rung bodies against Purpose, both unlocks, Journey, obviousness, UX bar, and
non-goals. A changed product commitment requires an explicit decision record and
appropriate approval; silent drift fails conformance.

### F-010 — Contract testability does not guarantee contract atomicity

- **Severity:** P1
- **Class:** template defect
- **Confidence:** High

The skill asks for testable contracts but does not require one independently
provable obligation per ID. Real specs combine different actors, owners, failure
semantics, and gates into a single `C-###` entry. This makes proof status ambiguous:
one clause may pass while another fails, yet the contract has one apparent state.

**Required correction:** one contract ID carries one authority, precondition,
observable result, failure meaning, and credible falsifier that one gate can assess.
Shared cases belong in definitions, decision tables, or state models; independently
failing obligations receive distinct IDs.

### F-011 — Rich active-rung intent is violated by content placement

- **Severity:** P1
- **Class:** template ambiguity plus specimen nonconformance
- **Confidence:** High

The skill says rungs should consume most of the information budget and completed
rungs should collapse. Real specs sometimes put the active interface, normative
state model, or exact behavioral matrix hundreds of lines away in North Star or A5
while the active packet remains thin. Other specs fully elaborate every future rung
and future harness before the active architecture is approved.

**Required correction:**

- active and next rungs are rich;
- future rungs contain only name, unlock, non-goal, dependency, and promotion
  trigger until activated;
- no active requirement may exist only in A5;
- exact state/schema matrices live with their owning contract cluster or are
  explicitly referenced from the active rung;
- A5 is cold-skip supporting material and cannot redefine normative truth.

### F-012 — Conformance is advisory and structurally incomplete

- **Severity:** P1
- **Class:** enforcement gap
- **Confidence:** High

The skill declares rigid headings, stable IDs, projection precedence, and caps, but
its conformance pass is manual and does not make unresolved violations a failed
result. Recent specs materially touched after the new rules still lack required
sections, exceed changelog/next-action caps, or place contracts in the wrong
section.

ID protection is incomplete. One high-churn specimen defined both `P-012` and
`C-109` twice with different meanings. Existing tests do not cover cross-skill
references, lifecycle vocabulary, approval transitions, or every ID namespace.

**Required correction:** hard checks for heading/order/version, every ID namespace,
cross-references, contract location, lifecycle vocabulary, approval provenance,
next-action uniqueness, normative appendix leakage, projection revisions, and
terminal-lane stale commands. A failed check returns `Spec gap — stop`, not
`synced/ready`.

### F-013 — Closure evidence is not reliably durable

- **Severity:** P1
- **Class:** lifecycle/evidence defect
- **Confidence:** High

Some complete specs point to raw `tmp/` artifacts without regeneration commands.
Source references use mutable current `file:line` positions without commit/blob
identity. Closure may rename the folder while external references still target the
old path. Once temporary evidence is swept or source lines drift, the terminal
claim cannot be reconstructed.

**Required correction:** classify surviving evidence as either:

- **regenerable:** exact command, commit, environment, inputs, threshold, and
  durable result summary; or
- **non-regenerable:** immutable promoted receipt with digest and provenance.

Pin durable source claims to a source revision where drift would change their
meaning.

### F-014 — Stale skill references and state vocabularies already exist

- **Severity:** P1
- **Class:** skill-family integrity defect
- **Confidence:** High

`plan__prepare-summary` routes to `$plan__implement-work-spec`, while the registered
launcher is `plan__prepare-goal`. Root milestone vocabulary and work-spec lane/rung
vocabularies also diverge: one includes Proposed/Objectively Green, another adds
Parked, and neither cleanly models supersession.

**Required correction:** one lifecycle vocabulary with explicit applicability to
lane, rung, and proof state. Add registry/reference integrity tests so a renamed or
removed skill cannot remain in runnable instructions.

## 4. Audit-specific evidence cards

### 4.1 Mandate-conflict audit

**Verdict:** root unlock-first and proportional-proof doctrine is strong, but
approval, medium-work classification, proof ordering, audit admission, and
completion ownership are incoherent below it.

Nine concrete conflict families were recorded:

1. undeclared Material/medium lane;
2. approval laundering and absent gate approval semantics;
3. stale `$plan__implement-work-spec` route;
4. proof-first instrumentation deadlock;
5. launcher restoring universal red-first behavior;
6. final handoff unable to close non-final milestones;
7. incompatible lifecycle vocabularies;
8. lower-level examples teaching root-forbidden V2/feature-flag patterns;
9. backend profile exceptions bypassing proportional proof.

The audit ran `node --test test/repository-layout.test.js`: 9 of 13 tests passed.
Three failures reflected current-template expectations and one was an unrelated
flat-layout failure. The suite did not contain a cross-skill referential-integrity
or approval/lifecycle state-machine check.

### 4.2 Skill-domain audit

**Verdict:** the skill's true job is durable judgment preservation, not PRD
generation. Its strongest mechanisms are the work-spec/eval ownership split,
stable IDs, truth labels, Input Coverage Ledger, rich rung packets, and completed
rung collapse.

Its top findings were:

- durability is conflated with co-location and permanent retention;
- rigid schema is prose-checked rather than mechanically protected;
- contract atomicity is underspecified;
- projection redundancy helps scanning but creates drift;
- full future-rung packets conflict with rolling-wave planning;
- whole-lane supersession has no legal state.

This reviewer proposed typed annexes for state models/interfaces/cost models. That
recommendation is preserved as a dissenting hypothesis, not adopted. See §5.2.

### 4.3 Execution simulation

**Verdict:** directionally strong but not reliably zero-context safe.

Simulated operations:

- orient from zero context;
- select the next action;
- implement the active rung;
- process a proof result;
- resume after compaction;
- resolve a completed or superseded lane.

Positive control: `play-truth-attribution` had an exact action, bounded rung packet,
complete gate card, and complete harness object. Negative controls showed stale
next actions, child ownership buried hundreds of lines down, and terminal specs
retaining runnable instructions.

The smallest proposed execution fix was one canonical next-action record plus a
hard proof-handoff readiness rule: an approved/in-progress rung whose next action
is a missing harness is invalid unless the eval plan contains the complete matching
harness object. Otherwise the lane must say `Blocked — eval design`.

### 4.4 Product-value audit

**Verdict:** strong product-first schema, but preservation and enforcement are
incomplete.

Dimension results:

| Dimension | Result |
| --- | --- |
| Core Unlock | Needs work—excellent at creation, omitted from material-edit sync. |
| Outcome Fit | Pass. |
| Scope Discipline | Needs work—append-only history expands apparent scope. |
| Simplicity | Needs work—no enforceable entropy boundary. |
| Requirement Quality | Needs work—compound contracts. |
| Correctness/failure modes | Pass. |
| Proof/regret | Pass. |
| No split brain | Needs work—product forest versus rung drift has no authority rule. |

The positive compact specimen was `valkey-engine-family-alignment`: concise
unlocks, concrete operator North Star, and a rich executable rung. Author
nonconformance examples included missing modern sections after material touch,
excess active changelog entries, and more than five next actions.

### 4.5 Information-architecture audit

**Verdict:** the preservation-first single-file hypothesis holds. No sampled
specimen falsified it.

Key evidence:

- the 475-line `persistent-social-garden-state` became a 37-line redirect while
  retaining rationale, current authorities, retired-ID mapping, and Git
  recoverability;
- a short 88-line spec was less executable than a 420-line current spec;
- large auth/game-backend specs place active normative detail in the wrong region;
- completed and superseded specs fail to collapse even though the template tells
  them to.

The exact sidecar falsifier proposed by this audit is an active irreducible payload
with an independent owner/lifecycle or byte-for-byte tooling consumption, such as
an executable generated schema or exhaustive generated state corpus. Once created,
that belongs in the product/schema domain; the work spec retains its commitment,
owner, digest, and result summary.

### 4.6 Longitudinal-safety audit

**Verdict:** no-ship for autonomous lifecycle safety.

Failure sequences explicitly tested:

- writer updates only the rung;
- proof arrives but next action stays stale;
- lane moves to a child;
- approval changes or is revoked;
- spec closes while legacy commands remain;
- session resumes after compaction.

Every sequence exposed a gap: no revision token, partial projection updates,
missing authority transfer, unsuperseded approvals, temporary evidence decay, or
launcher-injected approval.

The audit recommended a compact lane-state record, launchability preflight,
transactional state events, all-ID uniqueness checks, first-class ownership
transfer, stable paths, and regenerable/immutable closure evidence.

### 4.7 Minimalism red team

**Verdict:** the product forest is strong; automaticity is the source of ceremony.

Mechanism disposition:

| Mechanism | Disposition |
| --- | --- |
| Product forest and current truth | Keep. |
| Rich active rung, decisions, evidence, human gates, terminal value proof | Keep. |
| Automatic work-spec/eval-plan pair | Remove automaticity; admit independently. |
| Quick/Substantial binary | Replace with Quick/Material/Substantial. |
| Gate cards and missing-harness specs | Conditional on admitted active-rung risks. |
| Watched-red defect reproduction | Keep. |
| Durable test for every bug | Remove. |
| Hostile/non-regression proof | Conditional on plausible meaningful harm. |
| Per-rung and stacked specialized audits | Merge into one terminal audit plus admitted lenses. |
| Multiple manual state projections | Reduce to one owner plus one resume projection. |
| Input ledger | Conditional on genuinely lossy multi-item intake. |
| `DONE__` rename | Remove. |
| Raw `tmp/` bundles | Conditional on inspection/handoff/reuse value. |

The audit identified five causal loops: classification cascade, projection-drift
loop, bug-to-test loop, audit-of-audit loop, and future-proofing/harness-backlog
loop.

## 5. Tensions and unresolved design decisions

### 5.1 Work spec and eval plan: mandatory pair or independent admission?

**Option A — mandatory pair for every substantial lane**

- Gain: stable single-homing of gate state and proof mechanics.
- Cost: lanes with durable product/architecture decisions but simple proof inherit
  unnecessary harness inventory and projection work.

**Option B — work spec mandatory for substantial lanes; eval plan separately admitted**

- Gain: preserves durable judgment without manufacturing proof ceremony.
- Cost: the work spec needs a compact bounded proof field when no eval plan exists,
  and migration rules must make ownership unambiguous.

Audit convergence favors Option B, but it is not adopted by this report.

### 5.2 One file versus typed annexes

**Annex argument:** very large A5 sections already behave like hidden sidecars; typed
annexes could isolate state models, public interfaces, and cost models.

**Single-file counterevidence:** no specimen demonstrated irreducible active content
that required another judgment document. Retrieval, placement, retention, and
lifecycle failures explained the observed pain. Another file adds navigation,
link-integrity, and ownership risk.

**Current audit recommendation:** retain one canonical `work-spec.md`; run a blind
behavioral pilot after compactness/lifecycle repair. Permit another durable artifact
only when it has independent ownership/lifecycle or executable/generated semantics.

### 5.3 Projection redundancy versus cold-read speed

**More projections** improve scanning but create drift surfaces and audit work.

**One source only** reduces drift but may force expensive deep reads.

The likely minimum is one normative state owner plus one generated or mechanically
validated resume projection. The exact mechanism remains a design decision.

### 5.4 Full future rungs versus rolling-wave planning

Full future packets preserve dependency intent but encourage premature design,
speculative gates, and harness backlogs. Index-thin future rungs reduce ceremony but
may hide a dependency that should affect the current architecture.

The proposed compromise is rich active and next rungs; later rungs keep name,
unlock, non-goal, dependency, biggest risk, and promotion trigger only.

### 5.5 Whole-file reread versus mode-addressable retrieval

Selective reads reduce context consumption but can miss contradictions. Whole-file
rereads increase safety but compete with implementation context as files grow.

Stable section markers, whole-file revision/hash checks, and hard projection/
reference validation may make selective cold/execute/resume/close modes safe. This
requires a pilot before becoming doctrine.

## 6. Minimum coherent repair sequence

### Stage 1 — Repair ownership and precedence before touching the schema

1. Define Quick / Material / Substantial.
2. Name the owner for admitting work specs, eval plans, durable tests, harnesses,
   artifact bundles, and specialized audits.
3. Make downstream skills consume root admission decisions rather than re-admit by
   trigger wording.
4. Separate watched-red reproduction from durable-test admission.
5. Make handoff terminal-only and specialized audits risk-admitted.

### Stage 2 — Close approval and lifecycle

1. Add approval actor/date/source/scope and supersession/revocation.
2. Add lifecycle, active owner, parent/successor, resume condition, and state-event
   revision.
3. Make preflight report `grounded` and `launchable` separately.
4. Remove unconditional approval from launch.
5. Keep stable paths; define compact Complete and Superseded redirect forms.

### Stage 3 — Build a trustworthy execution spine

1. Add one canonical next executable action.
2. Make proof/lifecycle/action projection updates transactional or explicitly
   pending.
3. Add hard proof-handoff readiness checks.
4. Validate every ID namespace and every cross-skill reference.
5. Invalidate or reconcile green proof after material contract/scope revision.

### Stage 4 — Protect the product forest and control entropy

1. Revalidate Purpose, both unlocks, Journey, obviousness, UX bar, and non-goals on
   every material edit and preflight.
2. Require atomic contracts.
3. Keep active/next rungs rich and future rungs index-thin.
4. Replace permanent narration retention with load-bearing judgment/provenance
   retention.
5. Collapse completed rungs and terminal lanes; remove stale commands.

### Stage 5 — Blind pilot before optional references or automation expansion

Apply the proposed behavior manually to:

1. one compact Material lane;
2. one large active state-heavy lane;
3. one completed or superseded lane.

Measure:

- cold orientation time;
- ability to name the next legal action;
- semantic loss against the preservation ledger;
- context required to execute the active rung;
- drift after a proof transition;
- safe resume after compaction;
- lifecycle clarity after closure or transfer.

Do not introduce default sidecars unless this pilot produces a concrete falsifier.

## 7. Invariant-preservation ledger

This ledger is the boundary for any future rewrite. `Proposed treatment` is an audit
recommendation, not approval.

| ID | Existing behavior/invariant | Treatment | Required survival proof |
| --- | --- | --- | --- |
| I-001 | Purpose states what is being built and why. | Preserve. | Cold reader names the intended outcome without reading implementation detail. |
| I-002 | User Journey Unlock names the concrete user/developer experience. | Preserve and revalidate on edits. | Active rung demonstrably advances the named journey. |
| I-003 | Engineering System Unlock names the capability/reliability/contract truth. | Preserve and revalidate on edits. | Engineering work maps to an explicit system unlock, not mechanism alone. |
| I-004 | Primary entry points are exact. | Preserve. | Executor can start tracing without broad discovery. |
| I-005 | North Star includes actor, entry, steps, success, and next obvious action. | Preserve. | Product journey survives compaction and plan changes. |
| I-006 | Experience invariants are single-homed as contracts. | Preserve. | Every invariant maps to exactly one active C-ID. |
| I-007 | Obviousness audit catches reasonable user assumptions. | Preserve and sync. | Each assumption maps to a requirement or admitted proof. |
| I-008 | Design/UX bar and rejection criteria preserve taste. | Preserve. | Subjective gate cannot be auto-claimed or reduced to mechanism checks. |
| I-009 | Non-goals define lane boundary. | Preserve and sync. | Future work cannot silently enter via a rung or gate. |
| I-010 | Input Coverage Ledger prevents multi-item intake loss. | Preserve conditionally. | Required for genuinely lossy multi-item intake; compact/omit when not earned. |
| I-011 | Facts, assumptions, gaps, and falsifiers remain distinguishable. | Preserve. | Every consequential uncertainty remains honestly labeled. |
| I-012 | Stable IDs support references and concurrent editing. | Preserve and harden. | All namespaces are unique and references resolve. |
| I-013 | Contracts are observable and falsifiable. | Preserve and make atomic. | One gate can assess one independently failing obligation. |
| I-014 | Active rung is the richest execution packet. | Preserve. | Cold executor acts without mining appendices for normative truth. |
| I-015 | Future dependency intent survives. | Simplify. | Future rungs retain unlock/non-goal/dependency/risk/promotion trigger. |
| I-016 | Completed-rung evidence survives. | Preserve compactly. | Unlock, proof figures, regeneration, commit, and claim boundary remain. |
| I-017 | Eval plan owns detailed proof mechanics when present. | Preserve. | No duplicated gate mechanics; ownership remains explicit. |
| I-018 | Subjective gates remain human-owned. | Preserve. | No skill can transition them automatically. |
| I-019 | Decisions and rejected alternatives survive. | Preserve compactly with provenance. | Context, decision, consequences, affected IDs, and supersession remain. |
| I-020 | User wording and provenance can be recovered. | Preserve selectively. | Binding wording/authority survives without duplicating routine narration. |
| I-021 | Evidence survives tmp cleanup. | Preserve and harden. | Regeneration recipe or immutable receipt reconstructs the claim. |
| I-022 | Approval is durable across compaction. | Add explicit model. | Launchability is derived from actor/date/source/scope/current state. |
| I-023 | Next action is unambiguous. | Add canonical record. | Exactly one first legal action exists or lane is explicitly blocked. |
| I-024 | Parent/child/successor authority is unique. | Add transfer model. | Every active contract/rung/gate has exactly one current owner. |
| I-025 | Complete/superseded lanes cannot look runnable. | Add terminal forms. | No stale active action, command, or valid-looking gate remains. |
| I-026 | Mechanical edit history remains recoverable. | Route to Git. | Removed narration is available through repository history when needed. |
| I-027 | Proof remains proportional to plausible meaningful risk. | Preserve and enforce precedence. | No artifact/test/harness/audit exists solely because a trigger said so. |
| I-028 | Terminal value—not internal completion—defines Done. | Preserve. | Final evidence shows the actor's terminal observable outcome. |

## 8. Proposed compact single-file shape for the pilot

This is not a replacement template. It records the audit hypothesis to test.

### Always-visible resume capsule (target: no more than ~25 lines)

- outcome and both unlocks;
- lifecycle and approval provenance;
- exact active rung and active owner;
- one lane boundary/non-goal reminder;
- next one to three actions, with one canonical first action;
- next proof and latest surviving proof summary;
- current claim boundary;
- blocker/resume condition/decision needed;
- active contract IDs, gate IDs, and active-packet anchor;
- parent/successor and state-event revision where applicable.

### Canonical body

- full product forest remains early and feature-wide;
- current truth precedes design mechanism;
- contract clusters own exact state/schema matrices;
- active and next rung packets are rich;
- later rungs remain thin until promotion;
- proof mechanics remain in the eval plan when one is admitted;
- appendices are cold-skip support and cannot redefine active contracts.

### Lifecycle compaction

- active changelog retains only approvals, semantic pivots, proof-state changes,
  authority transfer, and closure;
- settled decisions collapse to decision/rationale/consequence/affected IDs;
- completed rungs collapse to surviving judgment and proof;
- complete specs remove live plans/actions;
- superseded specs use a compact redirect with replacement authorities and ID map;
- Git owns routine chronology.

## 9. Evidence and verification notes

- Audit date: 2026-07-23, America/New_York.
- Audit mode: read-only fresh contexts; seven independent lenses.
- No audit edited repository files.
- The only repository mutation made to preserve this work is this report.
- The Vasir worktree was already dirty before this report was added, including
  existing mandate/skill changes and the two untracked discarded proposal files.
- One auditor ran `node --test test/repository-layout.test.js` and observed 9/13
  passing; the result is evidence of current coverage gaps, not a verification of
  any implementation change.
- No work-spec skill, root mandate, consumer skill, registry, or backend work spec
  was modified based on these recommendations.

## 10. Adoption boundary

This report preserves findings and proposed remedies. It does not authorize them.

Before implementation:

1. confirm the invariant-preservation ledger;
2. decide the unresolved tensions in §5;
3. declare which root/skill owns each state and admission decision;
4. write exact acceptance scenarios for the repaired workflow;
5. change mandates before template wording where ownership currently conflicts;
6. run the three-spec blind pilot before considering default reference files.

## 11. Round Two — Executive Delta (2026-07-24)

### 11.1 S-tier verdict

**Current system: NO-SHIP as an S-tier autonomous operating contract.**

The preservation-first architecture survives. The smallest viable target remains:

- one canonical `work-spec.md` per independently owned lane;
- the complete product forest preserved in its body;
- an independently admitted `eval-plan.md` only when durable proof mechanics or
  coordination warrant it;
- one small typed execution capsule owning current control state;
- separate lane, approval, rung, objective-proof, subjective-acceptance, ownership,
  and projection domains;
- revision/hash guards rather than an event-sourced workflow system;
- rich active and next rungs, with architecture-shaping future constraints promoted
  before current work;
- deterministic validation only for decidable structural safety;
- semantic preflight retained for meaning, product coherence, and proof judgment;
- incremental legacy ratcheting, not mass migration.

Round two confirmed that product meaning is not the bloat and that raw length is not
the safety metric. It also found that several round-one remedies were too strong or
solved the wrong abstraction.

### 11.2 Round-two lenses

| Audit | New question | Principal result |
| --- | --- | --- |
| Formal state-machine audit | Can every legal/illegal transition be represented and guarded? | Six concerns are conflated; several essential transitions are missing or unsafe. |
| Blind operator audit | Can a cold agent safely act from real current specs? | Only 1/8 supported safe compaction resume; only 3/8 exposed one unambiguous legal action. |
| Proof-admission audit | What machinery actually triggers across ten lane shapes? | Root proportionality is good; downstream test/eval/audit automaticity still overrides it. |
| Legacy/adoption audit | Can 140 heterogeneous specs adopt the repair without a rewrite tax? | No migration by existence/read; use a safety-spine ratchet on launch and touched state. |
| Executable-conformance audit | What can a small validator safely enforce? | Fourteen structural rules are warranted; semantic quality must remain human judgment. |
| Preservation red team | What would the proposed repair itself destroy or overbuild? | Direction survives only with body consistency, proof-basis invalidation, concurrency guards, acceptance receipts, and conditional pruning. |

All six audits were read-only. No doctrine, skill, work spec, eval plan, registry, or
test was changed by the audit round.

### 11.3 Round-one remedy disposition

This table changes proposed remedies, not the underlying evidence.

| Round-one proposal | Round-two disposition | Reason |
| --- | --- | --- |
| Add Quick / Material / Substantial workflows | **Rejected.** Keep Quick/Substantial; use `material` only as a risk/admission adjective. | Independent artifact admission fixes the cause with less state. |
| One canonical next action with exact command | **Narrowed.** Require one first legal action/decision/routing step, owner, runnability, and prerequisite; a shell command is optional. | Human decisions, inspections, and delegated child work are legitimate actions. |
| Transactional state-event IDs | **Narrowed.** Use typed current fields, paired work/gate revisions, proof-basis digests, loaded-file hash checks, and Dirty/Conflict. | An event ledger would recreate the audit log and workflow machinery being removed. |
| One gate can falsify each contract | **Narrowed.** Require one coherent authority and failure meaning per contract; compound same-run proof may cover several linked contracts. | Strict one-to-one mapping would proliferate gates and weaken compound journey proof. |
| Complete missing-harness object before product code | **Narrowed.** Required only when an admitted risk needs pre-code instrumentation. | Natural-order new behavior and unrelated implementation must not be blocked automatically. |
| Work spec + eval plan for every substantial lane | **Rejected automatic pairing.** Work spec remains substantial-lane memory; eval plan is independently admitted. | Some substantial product/architecture work has one sufficient existing proof and needs no proof ledger. |
| Default typed annexes/sidecars | **Still rejected.** | No specimen falsified one work spec per independently owned lane. |
| `DONE__` folder rename | **Rejected as mandatory.** | Stable durable paths beat tree cosmetics; redirects are required if movement is unavoidable. |
| Product-forest preservation and material-edit sync | **Confirmed and strengthened.** | Capsule/control changes must not make Purpose, unlocks, North Star, obviousness, UX bar, or non-goals decorative. |
| “Binding judgment never vanishes” | **Confirmed with a guard.** | Mechanical narration may be pruned only when the exact pre-prune blob is reachable and anchored. |
| Validator ensures semantic alignment | **Rejected.** Validator covers decidable safety only; fresh semantic preflight remains mandatory. | Presence checks can be gamed and cannot judge product coherence, taste, or contract quality. |
| Future rungs stay thin | **Confirmed with a guard.** | Authority, data model, security, cost, irreversible choices, and decision deadlines must be promoted before they can shape active work. |

## 12. Formal State Model

### 12.1 Separate state domains

Public status must be a projection of orthogonal sources, not one overloaded enum.

| Domain | Minimum states |
| --- | --- |
| Lane phase | Proposed · Active · Blocked · Parked · Complete · Superseded |
| Approval | Unapproved · Approved for exact normative revision/scope · Invalidated · Revoked |
| Rung | Proposed · Active · Blocked · Objectively Green · Waiting Human · Complete · Superseded |
| Objective gate | Open · Harness Ready · Red Captured · Objectively Green · Blocked · Defective · Waived · Retired |
| Subjective gate | Waiting Human · Accepted · Rejected · Waived · Retired |
| Ownership fragment | Parent Owned · Delegated · Returned · Integrated · Revoked |
| Projection | Synced · Dirty · Conflict |

`Approved` can remain a displayed lane status derived from Proposed plus a valid
approval. `In Progress` is the displayed form of Active. Lane `Waiting Human` is a
projection of the active rung; it is not another independent approval authority.

### 12.2 Minimum transition table

| Event | Transition | Owner and guard |
| --- | --- | --- |
| Propose | absent → Proposed/Unapproved | Spec owner; product forest and lane boundary exist. |
| Approve | Unapproved/Invalidated → Approved | Named human/lane approver; actor, source, date, exact scope, normative revision. |
| Start | Proposed → Active | Orchestrator; Grounded, approval current, projection Synced, first legal action admitted. |
| Block | any nonterminal → Blocked | Executor; exact blocker, prior state, owner, and resume condition recorded. |
| Unblock | Blocked → prior safe state | Orchestrator; condition evidenced and preflight rerun; affected gates return Open. |
| Park/resume | Active/Blocked ↔ Parked | Lane owner; prior phase retained; approval revision and grounding rechecked. |
| Objective result | Open/Harness/Red → Green | Orchestrator verdict; declared potency ran in authority environment with fresh evidence. |
| Invalidate proof | Green → Open/Defective | Guarded surface or proof basis changed, or the harness failed potency. |
| Human accept/reject | Waiting → Accepted/Rejected | Named human only; question, scope, artifact digest, actor, source, and date recorded. |
| Rung close | Green/Accepted → Complete | Required objective and subjective gates terminal; surviving proof and claim boundary current. |
| Delegate/return | Parent Owned → Delegated → Returned → Integrated | Parent owner; exact IDs/scope and reciprocal parent/child records. |
| Lane close | Active → Complete | Orchestrator; handoff accepted where admitted, no live action, all returns integrated. |
| Supersede | any → Superseded | Approver/spec owner; successor, ID map, residual claims, current authorities. |
| Reopen | Complete → Active | Same approved scope plus newly evidenced defect; otherwise approval invalidates. |
| Edit/resync | Synced → Dirty/Conflict → Synced | Owning editor; loaded hash still current, revisions increment, validator passes. |

### 12.3 Cross-state invariants

Orthogonal state alone is insufficient. These combinations are illegal:

- Active lane + Unapproved/Invalidated/Revoked approval;
- Complete/Superseded lane + runnable implementation action;
- Complete lane + Open/Blocked required gate;
- Waiting Human + no pending subjective gate;
- Accepted subjective gate + changed artifact/question/scope digest;
- Green objective gate + changed proof basis or guarded surface;
- Delegated fragment + simultaneous active parent ownership;
- Synced projection + mismatched work/gate/body digests;
- terminal lane + current execution owner;
- Blocked/Parked lane + missing prior state or resume condition.

### 12.4 Missing or unsafe current transitions

Round two added these concrete gaps to round one:

- no typed human Accepted or Rejected state;
- no authority for Waived;
- `HARNESS_DEFECT` can leave a prior Green intact;
- no exact unblock return state;
- no reopen semantics after a discovered regression;
- no proof-basis invalidation;
- no reciprocal Delegated → Returned → Integrated flow;
- no projection Dirty/Conflict state;
- no approval invalidation after a normative edit;
- no stable semantics for a lane whose active rung is Complete while another rung
  remains Waiting Human.

## 13. Round-Two Empirical Evidence

### 13.1 Blind cold-operator results

Eight history-selected backend specs were evaluated from zero context against seven
jobs:

- A: explain Purpose and both unlocks;
- B: recover approval/lifecycle/current owner;
- C: select the exact next legal action;
- D: identify contracts/gates/blocker;
- E: state the current claim boundary;
- F: resume safely after compaction;
- G: avoid stale commands.

| Job | Directly recoverable |
| --- | ---: |
| Purpose/unlocks | 8/8 |
| Approval/lifecycle/owner | 2/8 |
| Next legal action | 3/8 |
| Contracts/gates/blocker | 7/8 |
| Claim boundary | 7/8 |
| Safe compaction resume | 1/8 |
| Stale-command avoidance | 2/8 |

Median retrieval required four post-capsule heading/file jumps. The specimens ranged
from 37 to 775 lines. Length did not predict safety: the 127-line shared-world spec
and 37-line redirect failed important jobs, while the 224-line completed wallet
spec was the strongest overall positive control.

### 13.2 Directly observed cross-file defect window

At immutable backend commit `6be798b5e3c6`, Universal Auth's work spec changed its
normative architecture while the eval plan still proved the retired protocol. A
later uncommitted eval edit repaired the mismatch.

This is direct evidence that:

- one whole-file hash is insufficient;
- work-spec and admitted eval-plan state need paired revisions/digests;
- mismatch must halt launch and handoff;
- proof invalidation must target the changed basis rather than globally reopening
  unrelated gates.

### 13.3 Corpus heterogeneity and migration scale

The backend corpus advanced during round two to:

- 140 work specs;
- 139 eval plans;
- 36/140 work specs with the complete current marker set;
- 40/139 eval plans with every current numbered section.

The sole spec without an eval is intentionally historical/superseded. The corpus is
a mixture of full current, near-current, compact active, giant legacy parent,
proof child, operational hybrid, complete, and redirect shapes—not a clean sequence
of schema versions.

Useful counterexamples:

- `fast-local-startup`: 69-line active spec, executable without full modern shape;
- `leaderboard-user-score-reset`: 49-line destructive terminal lane retaining
  contracts, hosted proof, audit, and decisions;
- `persistent-social-garden-state`: 37-line rich redirect retaining authorities and
  ID mappings;
- `netcode-foundation`: 1,127-line parent, 128 commits;
- its orchestration child: 928 lines, 95 commits;
- `shared-devbox-workspace`: 993-line parent with authority split across children.

### 13.4 Catalog and schema-integrity evidence

- A scan across 210 Markdown files found exactly three unresolved live skill
  references, all `$plan__implement-work-spec` in `plan__prepare-summary`.
- The registered launcher is `plan__prepare-goal`.
- `eval__design-proof-gates/SKILL.md` declares itself the only eval schema truth.
- The shipped registry also includes `references/eval-plan-template.md`, whose first
  lines instruct readers to use it as a template and whose status/ID/section model
  conflicts with the canonical skill.
- Skill packaging concatenates shipped references into the skill source, so the
  conflict is active model context rather than harmless dead documentation.
- Across 140 backend specs, the conformance audit found zero structured
  `Current owner` fields and zero revision fields.
- Six of eight exact terminal specimens retained structured actions or comparable
  live-looking execution residue.

### 13.5 Current verification snapshot

Commands run during round two included:

- `node --test test/repository-layout.test.js` — 13 tests: 9 passed, 4 failed;
- direct `$skill`/registry probe — one unresolved name,
  `$plan__implement-work-spec`, appearing three times;
- `npm run check:registry` — passed in the conformance audit;
- `node --test test/registry-build.test.js test/skill-metadata.test.js
  test/repository-layout.test.js` — 18 tests: 14 passed, 4 failed.

The four layout-family failures are one nested-skill/flat-layout assertion and three
stale source-string expectations. No current test exercises approval provenance,
legal transitions, proof-basis invalidation, ownership transfer, terminal stale
actions, or real work-artifact conformance.

## 14. New and Strengthened Findings

### F-015 — Current status is not a state machine

- **Severity:** P0
- **Class:** root/skill-family design defect
- **Confidence:** High

Lane, rung, approval, objective proof, subjective acceptance, ownership, and
projection state are represented through overlapping words and prose. Several
legal states cannot be represented, and several illegal combinations appear valid.

**Correction:** use the separate domains and guarded transitions in §12. Do not add
a workflow database, daemon, queue, event sourcing, or generalized DAG scheduler.

### F-016 — Human acceptance and proof defects are not safely representable

- **Severity:** P0
- **Class:** eval/handoff defect
- **Confidence:** High

`Waiting Human` is pending, but handoff can discuss it alongside recorded
acceptance without an Accepted state. Acceptance lacks accepter, date, source,
question, scope, and artifact digest. `HARNESS_DEFECT` can report no transition,
leaving stale Green representable. Waived has no named authority.

**Correction:** subjective Accepted/Rejected receipts; objective Defective state;
authorized waiver actor/scope/reason; proof-basis change reopens affected gates.

### F-017 — Paired revisions and optimistic concurrency are required

- **Severity:** P1
- **Class:** concurrency/projection defect
- **Confidence:** High

The Universal Auth defect window proves that sequential edits can expose a
normative/proof split. Counters alone do not prevent lost writes or irrelevant
global invalidation.

**Correction:**

- `normative_revision` or digest covering product forest, contracts, active rung,
  and binding decisions;
- `approved_revision` matching the normative basis;
- paired work/gate revision/digest when an eval plan is admitted;
- gate `guards` and `proof_basis_digest`;
- loaded-file hash check before write;
- Dirty/Conflict until both sides validate.

No persistent event log is needed.

### F-018 — The resume capsule must be control authority, not another summary

- **Severity:** P1
- **Class:** information-architecture defect
- **Confidence:** High

A compact capsule can be correct while stale commands remain below it. Line limits
are gameable through dense prose.

**Correction:** fixed typed fields with field/byte caps. The capsule owns only:

- lifecycle;
- approval provenance/current basis;
- current execution owner;
- first legal action, runnability, and prerequisite;
- blocker/prior state/resume condition;
- work/gate/body revisions;
- current claim boundary;
- active rung/contract/gate anchors.

The body single-homes product meaning. Capsule/body/action/proof contradictions
block launch. The capsule references Purpose and unlocks rather than paraphrasing
them into competing truth.

### F-019 — The shipped eval context has two schema authorities

- **Severity:** P1
- **Class:** catalog/reference defect
- **Confidence:** High

The canonical eval skill says it is the only schema truth, while the registry ships
a reference that says “Use this template” and defines incompatible fields,
vocabulary, and sections.

**Correction:** exactly one schema authority. Every shipped reference is either
generated from it or explicitly non-authoritative calibration. Registry validation
fails on competing authority language/fingerprints.

### F-020 — Proof artifacts need independent admission, with a coverage floor

- **Severity:** P1
- **Class:** mandate/skill-family conflict
- **Confidence:** High

Automatic eval/test/harness/artifact/audit creation causes ceremony. Independent
decline decisions can also under-prove critical risk.

**Correction:** keep Quick/Substantial. One compact admission record determines
work spec, eval plan, durable test, new harness, artifact retention, mutation or
other falsifier, audit overlays, and postmortem. Every plausible material failure
must map to:

- sufficient existing evidence;
- an admitted proof obligation; or
- an explicit authorized waiver with reason and residual risk.

Critical data, money, auth/privacy, persistence, idempotency, ordering, concurrency,
migration/skew, and sourced hot-path invariants presumptively earn a realistic
falsifier unless equivalent protection already exists.

### F-021 — Watched-red and durable regression retention are separate decisions

- **Severity:** P1
- **Class:** bug/testing conflict
- **Confidence:** High

Root and testing strategy allow zero new durable tests, but `code__fixing-bugs`
still requires a failing test before every code edit and a CI-ready test after.

**Correction:** the bug skill owns faithful watched-red capture at the escaped
boundary. Testing strategy separately decides `reuse | tighten | add | no durable
test`. A temporary script, replay, request, manual action, or existing failing check
may provide the red when it is deterministic and honest.

### F-022 — Audit overlays must collapse into one terminal judgment

- **Severity:** P1
- **Class:** audit/handoff conflict
- **Confidence:** High

Between-rung audits, root lens fan-out, lens report artifacts, and final handoff can
recurse into audit-of-audit work.

**Correction:** one terminal clean-context report. It applies only admitted
overlays:

- testing when proof/test changes carry the release claim;
- security for privileged, economic, privacy, or C6-equivalent risk;
- developer UX for material consuming-developer contracts;
- other lenses only for a named blind spot.

Between-rung review requires an irreversible or high-regret checkpoint. Do not run
terminal audits while a required authority-environment gate remains Blocked.

### F-023 — Future-thin planning needs an architecture-promotion rule

- **Severity:** P1
- **Class:** preservation risk
- **Confidence:** High

Real future rungs already contain authority, replay, and data-model constraints that
must shape current architecture. Blind thinning would lose them.

**Correction:** before current implementation, promote every architecture-shaping
authority, data-model, security, cost, irreversible choice, dependency, and
decision deadline into current contracts/decisions. Only then may future execution
narration remain thin.

### F-024 — Git-owned history is conditional, not absolute

- **Severity:** P1
- **Class:** provenance risk
- **Confidence:** High

Uncommitted work, inaccessible blobs, squash/rebase, and retention can destroy the
only copy of rationale or user wording.

**Correction:** preserve load-bearing why and binding wording live. Prune mechanical
narration only after recording the exact pre-prune commit/blob anchor and confirming
reachability. Refuse deletion when reachability is absent.

### F-025 — Parent/child ownership must map exact fragments

- **Severity:** P1
- **Class:** authority/graph defect
- **Confidence:** High

“One active child” is insufficient when a parent delegates disjoint contracts,
rungs, gates, or proof responsibilities to several children.

**Correction:** reciprocal transfer records identify exact IDs/scope, child local
approval, return evidence/revision, residual parent ownership, and integration gate.
Exactly one active owner exists per transferred fragment.

### F-026 — Legacy adoption must ratchet safety, not demand conformity

- **Severity:** P1
- **Class:** migration/process defect
- **Confidence:** High

Only a minority of current artifacts carry the complete current marker set. The
existing “first material touch restructures the whole stale spec” rule can turn a
small product change into a risky 1,000-line documentation migration.

**Correction:** no migration by existence or read. Add/repair only the minimum
safety spine and touched sections necessary to launch safely. Full restructuring
requires either an uneditable active section or a separately approved docs lane.

### F-027 — Local mandates can silently undo proportional doctrine

- **Severity:** P1
- **Class:** precedence/propagation defect
- **Confidence:** High

Backend/game steering still automatically requires integration tests, mutation,
performance artifacts, or broad proof based on surface categories. Higher local
precedence can therefore reintroduce the exact ceremony root doctrine removed.

**Correction:** local policy may identify risks, authority environments, and
credible fidelity seams. It may not automatically admit named machinery. Harmonize
local roots before claiming system-wide S-tier adoption.

## 15. S-Tier Proof-Admission Contract

### 15.1 Artifact ownership

| Decision | Owner | Admission basis |
| --- | --- | --- |
| Lane size | Root/orchestrator | Durable coordination and regret, not file count or visibility. |
| Work spec | Root/orchestrator | Substantial lane needs durable product/engineering judgment. |
| Eval plan | Root/orchestrator with eval designer | Multiple gates, environments, actors, durable gate state, subjective tracking, or missing-harness coordination. |
| Watched-red | Bug-fix protocol | Escaped defect reproduced faithfully at the real boundary. |
| Durable test | Testing strategy | Stable contract, plausible meaningful harm, no sufficient existing guard, cheapest credible seam, maintenance value. |
| New harness | Eval implementation after gate admission | Existing instruments cannot prove the admitted risk. |
| Product instrumentation | Active product rung | Required hook/telemetry/config seam is itself approved product code. |
| Durable artifact bundle | Orchestrator | Later inspection/handoff, expensive or non-regenerable evidence, or human acceptance needs it. |
| Critical falsifier | Root/testing/eval | Consequence warrants mutation, property/adversarial proof, or equivalent potency. |
| Audit overlays | Orchestrator | Distinct material blind spot, not skill availability. |
| Postmortem | Root narrow rule | Multi-hypothesis diagnosis would otherwise be re-derived. |

### 15.2 Lane examples

| Lane | Minimum proportional behavior |
| --- | --- |
| Mechanical quick edit | Inline unlock plus inspection; no spec, eval, test, artifact, or audit. |
| Routine behavior change with sufficient guard | Reuse the guard; add nothing. |
| Escaped bug | Capture watched-red; separately decide durable retention. |
| New stable public contract | Admit one cheapest-seam durable guard when meaningful harm and no equivalent guard exist. |
| Stateful/concurrent defect | Deterministic hostile invariant proof; durable guard normally warranted by corruption/duplicate risk. |
| Many-file bounded reversible change | File count alone changes nothing. |
| Substantial compound journey | Work spec; eval only when coordination/state earns it; one same-run value gate where disconnected checks can lie. |
| Subjective UX/feel | Artifact-backed human acceptance receipt; browser machinery only for browser-specific failure. |
| Refactor | Existing guard or characterization only where behavior is unknown. |
| Authority environment unavailable | Honest Blocked state; no weaker substitute and no guaranteed-blocked audit tax. |

## 16. Minimum Executable Validator

### 16.1 Boundary

One dependency-free, read-only Node module should validate Markdown plus optional git
base/delta context. It may be exposed as `vasir work validate [--base <git-ref>]`
and imported by `node:test`.

It must not:

- edit or autoformat artifacts;
- choose lane size or proof;
- run gates;
- judge product value, UX quality, taste, requirement atomicity, or proof potency;
- require work specs for Quick changes;
- create event logs, sidecars, artifact bundles, or browser tests;
- block untouched legacy artifacts merely for old form.

### 16.2 Structural rule ledger

| Rule | Severity | Mechanical boundary |
| --- | --- | --- |
| CAT001 | Error | Live `$skill` references resolve to exactly one registered skill. |
| CAT002 | Error | Exactly one schema authority; shipped templates are generated or explicitly non-authoritative. |
| DOC001 | Error | Lane, rung, objective-gate, and subjective-gate values appear only in their typed fields. |
| AUTH001 | Error | Executable motion has actor/source/date/scope and matching approved normative revision. |
| STATE001 | Error | Base-to-current transition and cross-state combination are legal. |
| OWNER001 | Error | Each active fragment has exactly one current owner; terminal fragments have none. |
| GRAPH001 | Error | Parent/child/successor links are reciprocal/acyclic and transferred fragments have one live owner. |
| ID001 | Error | Definitions are unique/namespaced and references resolve; fenced examples ignored. |
| PROOF001 | Error | Green gate records guards/proof basis; changed basis reopens affected proof. |
| SYNC001 | Error | Capsule, body anchors, projections, mirror, and paired revisions agree. |
| TERM001 | Error/warn | Terminal lanes contain no structured live actions/open required gates; imperative prose warns. |
| FOREST001 | Error | Required forest sections remain present; material semantic changes require decision and approval invalidation. |
| APPX001 | Error/warn | Normative contract/state/action/approval definitions cannot exist only in A5; suspicious prose warns. |
| EVID001 | Error | Green/terminal evidence has regenerable provenance or immutable receipt/digest. |

### 16.3 Validator kill-tests

- Quick/mechanical changes need no work artifact.
- Untouched legacy artifacts produce capped warnings and no diff.
- Free-prose/layout edits pass when structured invariants are unchanged.
- No gate/test/command count is mandated.
- Complete lanes may contain successor links and proof-regeneration commands.
- Missing temporary artifacts pass when durable regeneration/provenance is complete.
- Semantic product review remains a separate fresh preflight.

## 17. Legacy Adoption and Compatibility

### 17.1 Core policy

**No migration by existence, read, or incidental status/proof update.**

- New Quick change: no spec.
- New Substantial lane: current canonical work spec; eval plan only if admitted.
- First read: feature-detect and report; write nothing.
- Status/proof-only touch: update authoritative state, claim boundary, next action,
  and affected proof basis only.
- First material product touch: add or repair the compact safety capsule and touched
  contract/rung; do not restructure the whole file automatically.
- Full restructure: only when the active section is unsafe to edit, or in an
  explicitly approved documentation-maintenance lane.
- Closure: retain terminal outcome, accepted gates, proof/regeneration, remaining
  claim boundary; remove live implementation actions; path rename optional.
- Supersession: stable do-not-implement redirect with successors, authority map,
  retired IDs, rationale, and residual claims.
- Untouched legacy: byte-identical.

### 17.2 Minimum spine by state

| State | Required safety spine |
| --- | --- |
| Proposed/Draft | Outcome, non-goal, explicitly unapproved scope, next decision. |
| Approved/Active | Outcome, approval provenance/basis, exact active owner/rung, first legal action, active IDs, proof/claim boundary, blocker/rollback. |
| Blocked/Parked/Waiting Human | Active spine plus blocker/actor/prior state/resume condition; acceptance never inferred. |
| Parent | Product forest plus ownership map by exact scope/IDs and residual parent gates. |
| Child | Parent link, transferred scope/IDs, local approval, return/closure condition. |
| Complete | Terminal outcome, acceptance receipts, proof/regeneration, remaining delta, no live implementation action. |
| Superseded | Do-not-implement, successors, authority/ID map, rationale, residual claims. |
| Untouched | Nothing; reporting only. |

### 17.3 Severity and ratchet

| Severity | Meaning |
| --- | --- |
| INFO | Grandfathered form only. |
| WARN | Repair locally when touched; does not block unrelated useful work. |
| BLOCK affected rung | Ambiguous approval/owner/action, proof conflict, stale Green after contract change, missing required human acceptance. |
| QUARANTINE | Lost/renumbered IDs or decisions, authority-changing transform, destructive action without rollback, terminal lane made runnable. |

New artifacts enforce every structural safety rule. Untouched legacy debt remains
capped warnings. Transitions into Approved, Active, Green, Human Accepted, Complete,
or Superseded enforce the safety-critical subset.

### 17.4 Safe transformation

Any automated or mechanical transformation must:

1. dry-run;
2. capture exact preimage hash and preservation manifest;
3. apply only against the clean matching hash in small hunks;
4. abort on deletion, rename, ID drift, authority change, or loaded-hash mismatch;
5. recover with an inverse forward edit/patch—not reset or destructive checkout.

Do not add a schema-version selector. Feature-detect the semantics and ratchet touched
state; a version marker would mislabel healthy hybrids and create compatibility
branches.

## 18. Round-Two Preservation Ledger

### 18.1 Kill-test disposition for I-001–I-028

| Invariants | Disposition after hostile review |
| --- | --- |
| I-001–I-004 | Survive when body single-homes Purpose/unlocks/entrypoints and capsule references their anchors. |
| I-005 | Needs cold-reader semantic preflight; presence cannot prove a coherent journey. |
| I-006 | Survives unique canonical IDs and no duplicated normative prose. |
| I-007 | Needs mapping from assumption to observable behavior/falsifier, not adjectives. |
| I-008 | Needs artifact-bound human acceptance receipt. |
| I-009 | Survives when active contracts cannot contradict non-goals. |
| I-010 | Remains conditional; mandatory empty ledgers are rejected. |
| I-011–I-012 | Survive typed claims, sources/falsifiers, uniqueness, and reference resolution. |
| I-013 | Structural tooling insufficient; coherent authority/failure review remains semantic. |
| I-014 | Survives only when cold execution needs no appendix/history mining. |
| I-015 | Existing survival proof was insufficient; add architecture-shaping constraint and decision deadline. |
| I-016–I-017 | Survive compact evidence receipts and admitted eval ownership with proof-basis digest. |
| I-018 | Existing model falsified; add typed acceptance provenance. |
| I-019–I-020 | Git-only pruning falsified; preserve load-bearing rationale and binding wording live or by durable exact source. |
| I-021–I-022 | Survive reconstructable evidence and revision-bound approval. |
| I-023 | Survives as one first legal action, not necessarily one command. |
| I-024 | Needs reciprocal fragment-level transfer. |
| I-025 | Survives terminal action rejection and rich redirects. |
| I-026 | Unconditional Git fallback falsified; prove exact blob reachability first. |
| I-027 | Needs material-risk coverage floor despite independent admissions. |
| I-028 | Survives concise terminal achieved value, claim boundary, evidence, and successor state. |

### 18.2 New invariants

| ID | Invariant | Survival proof |
| --- | --- | --- |
| I-029 | Projection alignment | Capsule, active rung, action list, gate mirror, and admitted eval agree or launch blocks. |
| I-030 | Optimistic concurrency | A write based on a stale loaded hash fails and requires merge/retry. |
| I-031 | Proof-basis invalidation | A changed contract/input reopens affected gates while unrelated Green remains valid. |
| I-032 | Acceptance receipt | Subjective acceptance is bound to artifact digest, question, scope, actor/source, and date. |
| I-033 | Policy integrity | Local steering may define risk/fidelity but cannot bypass independent artifact admission or block legacy reads. |

## 19. Public Behavioral Acceptance Suite

These are doctrine-level scenarios through public agent workflow boundaries. They
are not mandates to build a test for every individual product lane.

1. **Unapproved launch:** Given a Grounded Proposed lane without durable approval,
   when launch runs, then it returns unapproved/not launchable and performs no
   product edit.
2. **Approval invalidation:** Given approval for normative revision 7, when a
   material contract edit produces revision 8, then approval invalidates before
   execution.
3. **Normal autonomous start:** Given current approval and Synced projections, when
   launch starts the approved rung, then it proceeds without re-requesting approval.
4. **Capsule/body conflict:** Given different first actions in capsule and body,
   when preflight runs, then launch blocks and cites both locations.
5. **Green invalidation:** Given a Green gate whose proof basis changes, when
   preflight/handoff runs, then the affected gate is Open/Defective and release is
   blocked; unrelated gates remain Green.
6. **Subjective acceptance:** Given an artifact and pending human question, when no
   human has accepted it, then state remains Waiting Human; only a bound receipt
   produces Accepted.
7. **Artifact replacement:** Given acceptance of artifact digest A, when artifact B
   replaces it, then the subjective gate returns to Waiting Human.
8. **Blocked resume:** Given a Blocked lane whose credential appears, when resumed,
   then it re-grounds, rechecks approval, reopens affected proof, and does not restore
   stale Green.
9. **Parked drift:** Given a Parked lane whose contracts changed, when its resume
   condition becomes true, then stale approval blocks resume.
10. **Concurrent writer:** Given two writers loaded the same file hash, when one
    writes first, then the second stale-hash write fails for merge/retry.
11. **Child transfer:** Given contracts C1–C3 delegated to a child, when transfer
    commits, then parent and child agree on exact IDs and one live owner; parent
    completion waits for Returned → Integrated.
12. **Terminal closure:** Given green proof but missing acceptance/closure state, when
    Complete is requested, then the transition fails and no stale action remains.
13. **Rich redirect:** Given a successor lane, when superseding the old lane, then
    the stable redirect preserves reason, authorities, ID map, residual claims, and
    no copied target architecture.
14. **Legacy read:** Given an old spec lacking modern structure, when opened for
    diagnosis, then reading remains allowed and produces no diff.
15. **Legacy launch bridge:** Given useful work on an old active spec, when launch is
    requested, then only the minimum approval/owner/action/proof safety spine is
    required; unrelated wholesale restructuring is not.
16. **Proof admission:** Given a high-risk change with no eval plan, when proof is
    planned, then every plausible material failure maps to evidence, admitted proof,
    or authorized waiver.
17. **Watched-red retention:** Given an escaped defect reproduced by a temporary
    deterministic replay, when the fix turns it green, then durable-test retention is
    decided separately.
18. **Blocked environment:** Given a required authority-environment gate that cannot
    run, when credentials/runtime are absent, then it remains Blocked; no weaker
    substitute or guaranteed-blocked terminal audit is dispatched.
19. **Safe pruning:** Given history proposed for deletion, when the exact prior blob
    is unreachable, then pruning is refused.
20. **Local policy integrity:** Given a local rule automatically mandating an
    integration test, when doctrine conformance runs, then it retains the named risk
    and fidelity guidance but rejects automatic machinery admission.

## 20. S-Tier Retrieval and Pilot Gates

### 20.1 Retrieval criteria

1. From the capsule, a cold operator recovers lifecycle, approval, owner, first legal
   action, blocker, claim boundary, and active anchors in ≤60 seconds without
   inference.
2. Contracts/gates/proof are reachable in ≤2 intra-file jumps plus at most one
   admitted eval-plan open.
3. Two independent cold operators choose the same first legal action, owner,
   runnability, and claim boundary in every pilot specimen.
4. Capsule, body action list, active rung, proof mirror, and eval revisions have zero
   contradictions.
5. Blocked/Complete/Superseded lanes expose either one safe resume/redirect action or
   explicit none; no stale implementation command remains.
6. Approval is launchable only from actor/date/source/scope/current-basis provenance.
7. No active requirement exists only in an appendix; no redirect copies target
   architecture; all successor/ID references resolve.
8. Compaction replay recovers purpose, ownership, action, blocker, proof, and claim
   boundary with zero semantic disagreement.
9. Time/context to the first product action does not regress.
10. Raw line count is not a criterion.

### 20.2 Minimum credible pilot

Pilot at least these shapes:

- active compact: `fast-local-startup`;
- active blocked proof: `valkey-engine-family-alignment`;
- destructive terminal: `leaderboard-user-score-reset`;
- blocked/historical: `user-game-affinity`;
- superseded redirect: `persistent-social-garden-state`;
- parent/child: `shared-devbox-workspace` plus
  `session-request-deadline-repair`;
- one new substantial lane using the repaired doctrine.

Success requires:

- zero lost/renumbered IDs, decisions, approvals, proof references, routes, or user
  wording;
- zero untouched-file diffs;
- zero parent/child overlap;
- zero false BLOCKs in the pilot;
- identical cold-resume action/stop decisions;
- simple transitions causing no unrelated body churn;
- proof-basis edits reopening only affected gates;
- stale-hash writes failing safely;
- inverse patch restoring exact preimage hash for a trial transform;
- no increase in tests, harnesses, artifacts, or audits without an admitted risk.

## 21. Round-Two Audit Cards and Process Notes

### 21.1 Formal state-machine audit

Produced separate machines, transition guards, nine counterexample traces, and 12
public acceptance scenarios. It identified unrepresentable Proposed/Superseded/
Accepted states, waiver authority, stale Green after harness defect, and child
return/integration as round-one omissions.

### 21.2 Blind operator audit

Scored eight real specs before reading round one. It directly observed the
Universal Auth cross-file defect window and found that a previously positive rich
redirect had drifted by copying target architecture. It confirmed single-file-first
but required a normative typed capsule and paired revisions.

### 21.3 Proof-admission audit

Table-topped ten lane shapes. It confirmed F-005/F-006/F-007, rejected the third
Material workflow, separated watched-red from durable test admission, and found the
shipped legacy eval template plus current local-policy propagation drift.

### 21.4 Legacy/adoption audit

Classified more than 20 specs across 140-work-spec/139-eval corpus. It rejected
first-touch wholesale migration and schema-version selectors, defined the state
safety spine, severity ratchet, transformation recovery rules, and a seven-file
pilot.

### 21.5 Executable-conformance audit

Scanned 210 Markdown files, built the 14-rule validator ledger, and separated
mechanical errors from semantic human judgment. It found the second eval schema,
zero structured current-owner/revision fields in 140 specs, and stale actions in
six of eight terminal specimens.

**Process exception:** despite being instructed not to open discarded artifacts,
this reviewer briefly opened `docs/work-spec-reference-templates.md` while surveying
shipped references. It explicitly excluded that file from all findings and evidence.
No other round-two reviewer used either discarded proposal file.

### 21.6 Preservation red team

Ran hostile tests against the proposed capsule, state model, independent admission,
future thinning, Git pruning, redirects, validator, legacy rollout, and local
precedence. It added I-029–I-033 and rejected counters-only concurrency, unconditional
Git pruning, validator-as-semantic-confidence, hard legacy migration, and duplicate
parent/child authority.

## 22. Updated Adoption Boundary

This report remains analysis, not authority. Nothing in round two authorizes edits
to root doctrine, skills, shipped references, tests, or product work specs.

Before implementation:

1. accept or revise the round-two disposition table in §11.3;
2. approve the formal state domains, transition guards, and cross-state invariants;
3. approve Quick/Substantial plus independent artifact admission and material-risk
   coverage floor;
4. approve the typed execution-capsule authority boundary;
5. approve the 14 validator rules and explicit semantic exclusions;
6. approve the legacy safety-spine ratchet and no-mass-migration policy;
7. harmonize local mandate ownership before claiming system-wide adoption;
8. implement the smallest doctrine/consumer correction before validator tooling;
9. run the pilot in §20 before calling the system S-tier;
10. reconsider optional references only if that behavioral pilot produces a concrete
   single-file falsifier.
