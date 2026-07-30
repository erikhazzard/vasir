---
name: plan__maintain-work-spec
description: >-
  Creates and updates the durable product map for a substantial lane: the request, vFinal North Star, observable contracts, vertical-slice ladder, active rung, and current motion.
  Trigger: substantial work whose product judgment must survive context, or a material change to its promised journey, contracts, rung boundary, blocker, or human decision.
tools: Read, Grep, Glob, Edit, Write
---

# Maintain the Work Spec

A Work Spec preserves the product forest across context windows and lets implementation move. It is not a frozen implementation plan, status diary, proof ledger, audit report, or workflow engine.

## What must survive

Every substantial lane keeps these load-bearing:

- **Purpose:** what is being built and why.
- **User Journey Unlock:** the concrete experience made possible.
- **Engineering System Unlock:** the capability or reliability truth made possible, when one genuinely exists.
- **vFinal:** the complete intended journey, not a `v0`, `v1`, or MVP substitute.
- **Primary entrypoints:** the exact API, route, event, command, or user action where the journey begins.
- **North Star:** actor, steps, observable success, obvious next action, experience invariants, obviousness assumptions, and the design/UX bar.
- **Non-goals:** explicit scope boundaries that do not weaken the required experience.
- **Request anchor:** the user's required outcomes and prohibitions in near-verbatim language.
- **Current truth:** only facts, unknowns, and decisions that can change the active or next slice.
- **Observable contracts:** stable `C-###` statements that can visibly fail.
- **Vertical-slice ladder:** meaningful working experiences leading to `vFinal`; the active rung is the richest build packet.
- **Current motion:** active rung, next action or blocker, and the honest claim boundary.
- **Acceptance:** the shortest direct value-path observation and any genuinely human feel decision.

If compaction makes the file smaller but loses one of these, the compaction failed.

## Product hierarchy

Read and author in this order:

1. `vFinal` and the North Star journey.
2. Required user outcomes and non-goals.
3. Vertical rungs through that same journey.
4. Contracts and current engineering truth needed by the active rung.
5. Current motion and proportionate proof.

Administrative neatness never outranks product meaning. A perfectly formatted spec that permits the wrong experience is not ready to build.

## Request fidelity

Capture every substantial request before synthesizing it away:

- Use one near-verbatim bullet for a single critical request.
- For multi-item intake, use one bullet per `Must`, `Must Not`, `Preference`, `Permission`, or `Question`.
- `Must` and `Must Not` items must map to the North Star, a `C-###`, or a rung that observably delivers them.
- A required item cannot be omitted, weakened, deferred, made a non-goal, or replaced by an easier non-equivalent proxy without an explicit human product decision naming that item.
- Preferences, permissions, and questions guide implementation but do not freeze the product boundary unless the user promotes them to a requirement.

Always ask: **Could an agent complete this spec while visibly failing what the user actually requested?** If yes, fix the product map before implementation. Similar colors, labels, mechanisms, or vibes are not equivalent delivery.

## The map is not the territory

Approval protects product meaning, not guesses:

- **Human decision required:** a materially different `vFinal`; a changed `Must` or `Must Not`; a non-goal reversal; a materially different user/consumer promise; violation of an existing external contract; a new externally owned authority or safety/data-integrity boundary; an irreversible operation; or reversal of an explicit product decision.
- **Adaptive by default:** files, symbols, internal architecture, technical schema details that preserve the same external promise, sequencing, estimates, implementation notes, discovered touchpoints, proof mechanics, and splitting/merging/reordering equivalent rungs.

Change adaptive details as implementation teaches you more. Update the spec immediately only when product meaning, a load-bearing contract, the observable rung boundary, a blocker, or a human decision changes. Otherwise batch useful implementation truth at a coherent checkpoint or rung close. Never stop delivery for wording polish or mechanical synchronization.

## Rungs are working experiences

Every rung:

- begins at a real user, developer, operator, or system entrypoint;
- crosses the real path needed for that slice;
- ends in an observable outcome worth having;
- uses the lasting shape we intend to extend;
- leaves the repo coherent;
- makes the next rung additive.

A rung may defer capability. It may not fake the core experience, substitute a proxy, or create work expected to be replaced. Backend, schema, tests, polish, and bounded feasibility investigation are work inside a rung, not milestones by themselves.

Every user-facing rung states one **Real journey proof**: who uses the normal entrypoint to achieve what observable outcome, plus the most tempting proxy that does not count. The rung stays open until that exact journey passes.

The active rung is rich enough to build. The next rung needs only enough detail to expose architecture-shaping constraints. Later rungs stay thin until they become active.

## Proof serves implementation

Start with direct inspection, current source, and existing checks. Add a durable test, eval plan, harness, artifact bundle, or independent audit only when a specific material risk cannot be credibly handled without it. The work spec records the surviving conclusion and honest claim boundary, not a second proof system.

Subjective feel, taste, readability, motion, and fun remain human decisions. Record the exact question and response when they matter; do not invent automated acceptance.

## One product file, progressively disclosed depth

The work spec remains the only home for product commitments, contracts, active-rung judgment, current motion, and completion truth.

For every new substantial lane, create this small bundle from the skill templates:

```text
<feature>/
  work-spec.md
  references/
    implementation-map.md
    provenance.md
```

- `implementation-map.md` is warm, adaptive engineering depth: current source maps, flows, likely touchpoints, interface or payload examples, calculations, and sharp edges. Repository and runtime truth win when it drifts.
- `provenance.md` is cold context worth recovering: material rationale, superseded approaches, useful completed-rung detail, and source lineage. It is not normal build context or a changelog; Git owns exhaustive history.

The active rung keeps its compact implementation direction in the work spec and links the exact implementation-map headings needed to build it. Every link says when to read it. Product commitments, requirements, contracts, rung state, `Done when`, approvals, blockers, acceptance, and completion never move into references.

A distinct postmortem, authored brief, research corpus, diagnosis, runbook, dataset card, human-review packet, or media index keeps an earned semantic filename. Do not create a generic research/context bucket or a reference index; the work spec is the router.

On rung advance, refresh or prune the implementation map instead of accumulating a shadow plan. Preserve only historical context costly to rediscover in provenance. Existing lanes are not mass-migrated; split obvious non-normative depth on their next substantive touch.

## Workflow

1. Read the current user request and existing work spec, then inspect the smallest repo/runtime path that can confirm or change the product map.
2. Re-derive `vFinal`, the North Star, non-goals, required intake, the ladder, and the active slice.
3. Repair any missing required outcome, proxy substitution, horizontal milestone, stale product assumption, or material contradiction.
4. Keep only current truth that changes the active or next rung. Put bulky current technical depth in `references/implementation-map.md`, cold retained context in `references/provenance.md`, and leave a short conclusion plus exact read-when link in the work spec.
5. If the product spine and active rung are coherent, implementation is the next action. Do not create another summary or planning artifact by default.
6. Edit the spec only for durable judgment: changed product meaning, contract, rung boundary, blocker, human decision, or coherent rung-close evidence.
7. Re-read immediately before writing and merge concurrent changes without losing either writer's load-bearing judgment.
8. Return the compact result below. This skill maintains the map; `$plan__implement-work-spec` builds from it.

## Canonical template

~~~markdown
# WORK SPEC — <FEATURE_NAME>

**Purpose:** <what is being built and why>
**User Journey Unlock:** <the concrete player/user/developer experience this unlocks>
**Engineering System Unlock:** <capability, contract, reliability, or operational truth; omit when genuinely none>
**vFinal:** <the complete intended journey when this lane succeeds>
**Primary entrypoint(s):** <exact API/event/command/route/user action>
**Reference routing:**
- [Implementation map](references/implementation-map.md) — follow only the headings linked by the active rung before building.
- [Provenance](references/provenance.md) — read only when prior rationale, retired paths, or source lineage matters.
- <earned semantic reference and exactly when to read it>

## 1) North Star — vFinal

### 1.A Journey
- **Actor:** <user / developer / service / operator>
- **Entry point:** <what they hit first>
- **Steps:** <3–5 maximum>
- **Success:** <observable terminal result>
- **Next thing they will try:** <the obvious next action>

### 1.B Experience invariants — “it is not real unless…”
- `C-###` — <one-line gloss; contract text lives in §5>

### 1.C Obviousness audit
- **Assumption:** <what a reasonable user assumes> → **Implication:** <what must therefore be built or proven>

### 1.D Design / UX bar
- **Experience target:** <what it should feel like or enable>
- **Reference bar:** <specific artifact/product/clip, or an explicit rung where it will be established>
- **Must feel:** <3–5>
- **Must not feel:** <3–5>
- **Human rejection criteria:** <what makes the experience unacceptable>

## 2) Non-Goals

- <explicitly out of scope without weakening the required journey>

## 3) Request Anchor

- **Must:** <near-verbatim required outcome>
- **Must Not:** <near-verbatim prohibition>
- **Preference:** <guidance, only when material>
- **Permission:** <allowed option, not a requirement>
- **Question:** <unresolved choice that could change the product>

Omit unused force types. A changed required item needs an explicit human product decision.

## 4) Current Truth

- **Fact:** <decision-relevant truth> — <source>
- **Unknown:** <what is not yet known> — matters because <effect on active/next rung>
- **Decision:** <binding choice and why> — <human or repo authority>

Keep this section scoped to the active and next rung.

## 5) Contracts & Invariants

- `[C-001 | Must]` If <condition>, then <observable result>, otherwise the feature is broken.
- `[C-002 | Must Not]` <forbidden observable outcome>.

Contracts live here once. Elsewhere cite their IDs.

## 6) Vertical-Slice Ladder to vFinal

### <FEATURE-SLUG>__M1 — <valuable slice name> — Active
- **Unlock:** <valuable part of vFinal now made real>
- **Working slice:** <actor → real entrypoint → real path → observable success → obvious next action>
- **vFinal advance:** <what becomes genuinely true and what remains>
- **Experience bar:** <rung-specific quality/rejection criteria when needed>
- **Lasting shape:** <why this is extended rather than replaced>
- **Implementation map:** <compact current direction; link exact headings in `references/implementation-map.md` for deeper adaptive detail>
- **Not in this rung:** <capability boundary>
- **Contracts:** <C-###>
- **Material risk:** <only a failure that could meaningfully break this slice>
- **Real journey proof:** <who uses the normal entrypoint to achieve what observable outcome; name the most tempting proxy that does not count>
- **Direct proof:** <shortest credible observation of the promised outcome>
- **Done when:** <the actor can complete and observe the slice>

### <FEATURE-SLUG>__M2 — <next valuable slice>
- **Unlock / vFinal advance:** <what it adds>
- **Dependency or decision deadline:** <only what can shape the active rung>
- **Not in this rung:** <boundary>

Future rungs may be one or two lines until they become active. Split, merge, reorder, or rewrite rungs when implementation truth changes while preserving the approved product boundary.

Collapse completed rungs so the active rung remains richest:

### <FEATURE-SLUG>__M0 — <completed slice> — Complete
- **Unlock / surviving result:** <what now works, including any load-bearing figure>
- **Regenerate / inspect:** <shortest command, action, or durable pointer when the evidence is ephemeral>
- **Claim boundary:** <what this result does and does not establish>

## 7) Current Motion

- **Lane state:** Proposed | Active | Blocked | Parked | Complete | Superseded
- **Approval:** <current-turn instruction or durable actor/source/date/scope when needed>
- **Active rung:** <ID> | None
- **Next action:** <one meaningful implementation action> | Blocked by <condition> | None
- **Claim boundary:** <what current implementation/evidence supports and does not support>

## 8) Proof & Human Acceptance

- **Terminal value-path observation:** <actor → entrypoint → terminal result, or pending>
- **Material unproven risk:** <risk and cheapest credible next check> | None
- **Human acceptance:** <exact question and response> | None required | Waiting
- **Optional proof artifact:** <path and why it is necessary> | None

## 9) Decisions & Supporting References

- **Binding decision:** <date / decision / rationale / authority / what would reopen it>
- **Supporting reference:** <path / surviving conclusion / when to read> | None
~~~

Delete empty optional lines and sections rather than filling them with `N/A`. Existing specs may keep stable IDs and a different rendering; do not rewrite them merely to resemble the template.

## Final check

Before writing, confirm:

- the request anchor, `vFinal`, North Star, non-goals, contracts, and ladder describe the same product;
- every required item maps to an observable contract or rung, with any changed/deferred treatment explicitly awaiting a human product decision;
- every rung is a valuable vertical slice using the lasting shape;
- the active rung is the richest section and is buildable now;
- implementation details remain adaptive;
- reference documents contain no product authority or current state, and every active link says when to read it;
- current motion names one next action or a real blocker;
- every user-facing rung states its Real journey proof and remains open until it passes;
- proof is the cheapest credible direct observation, not a parallel product;
- no digest, projection ledger, mandatory eval, or default audit was introduced.

## Skill result

Return only:

- work-spec path;
- `vFinal`;
- active vertical-slice unlock;
- next implementation action or exact blocker;
- any changed product decision, contract, human acceptance, or honest claim boundary.

Do not grant approval or start implementation from this skill.
