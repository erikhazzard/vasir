---
name: eval__design-proof-gates
description: Designs falsifiable proof gates and the durable eval-plan.md — decomposes an unlock into required truths and the gates that could prove each one false. Triggers on before implementation on any substantial lane; "how do we know this works" / "what should we test"; any perf, realtime, or scale claim; speccing missing harnesses.
tools: Read, Grep, Glob, Bash, Edit, Write
---

# Eval Plan — Proof-Gate Design

One question, answered before implementation proceeds:

> What would make us honestly admit that the declared unlock does — or does not — work in the environment that matters?

This skill designs falsifiable proof contracts, not comforting test strategies. **Prime rule:** a gate that cannot falsify the value claim in the environment that matters is not a proof gate — move it closer to the value path, spec the missing harness, require an artifact-backed human gate, or mark it blocked. Design only: this skill never executes proof, never claims a pass, never pretends a harness exists, and never converts subjective product judgment into fake automation.

**Ownership boundary.** This skill creates or updates exactly one artifact: `docs/work/<semantic-folders>/<feature-slug>/eval-plan.md`. The **eval plan owns proof mechanics** — gate design, harnesses, thresholds, adequacy, gate state. The **work spec owns lane truth** — scope, contracts, rung state, surviving result summaries. The spec mirrors gate state in its Proof & Eval Summary; divergence resolves toward the eval plan for gate state and mechanics, toward the spec for scope. This skill never edits the work spec — sync needs return in the Skill Result. Routing to siblings: missing runnable harness → `$eval__implement-proof-gate`; final feature handoff → `$handoff__final-quality-gate`; post-code implementation audit → `$code__auditing`.

**Routing.** Gate design is judgment work — orchestrator tier per root §7; gate *verdicts* after runs are too. No model pin: the caller's routing law decides. Executors who later run gates update state and last-run identity in the plan under its own conventions block.

---

## Schema Authority

- **This file is the only schema truth** for `eval-plan.md`. `references/gold-standard-proof-gate-examples.md` calibrates *specificity* — the concreteness bar for setup, action, verdict, artifact, and same-run correlation — never structure, IDs, thresholds, commands, paths, or domain nouns. Structural divergence means the reference is the bug; do not copy its shape.
- Load the reference before designing or materially updating gates; skip it for mechanical or status-only edits.
- Stale plans are synced, not versioned (root §1): the first lane that materially touches one conforms it to the current template. Gate IDs are never renumbered.

---

## Design Laws

Root §5 binds in full — fresh artifacts, real loop over proxies, hostile-path bias, nearby non-regression, watched-red potency, blind spots, check-existing-instruments — and is never restated as local rules. Each law below is the *design-time mechanism* this skill adds on top:

1. **Falsifiable anatomy.** A gate is valid only if it binds all of: **Claim / Setup / Action / Observation / Verdict / Authority** (the target environment where value actually matters) **/ Artifact / Stop condition**. Any missing element = incomplete gate. Prefer one strong value-path gate over many implementation-trivia units. The gate doubles as the development feedback loop — rerunnable cheaply against the real surface after each repair; if the only available proof is a proxy, name the missing real loop as a missing harness.
2. **Derive, don't pattern-match.** Decompose the unlock into required truths (workflow step 3); generate candidate classes from the menu; select the smallest sufficient set. Every included gate names the **plausible lie** it kills — if it cannot catch a plausible way the value breaks, cut it. Every excluded *obvious* class (security, persistence, perf, visual, network, replay, failure) records its exclusion reason. The synthesis table is **durable** — it lives in the plan, not in chat, because it is the record of why these gates and not others.
3. **Potency is designed in.** Every objective gate names how it will be shown to fail *for the right reason*: `watched-red` when changing existing behavior (capture the red against unfixed code — that red exists only before the fix lands); `mutation: <what to hand-break>` for new behavior (the break must turn exactly this gate red). A red that only proves API absence proves nothing about behavior.
4. **Name the blind spot.** Every gate records what its instrument cannot see; the proof stack names the axes no gate in the plan moves. A probe that never moves an axis will "prove" designs that fail on that axis.
5. **Compound value = same-run proof.** When the claim needs several truths concurrently (load + realtime sync + rendered experience), design one orchestrated gate: one coordinator, every actor and observer correlated under one run ID, pass only if all required observers pass in the same steady-state window. Disconnected checks that pass independently while the journey fails are the classic lie.
6. **Subjective quality gets human acceptance.** Feel, taste, fun, trust, readability, motion comfort: artifact-backed, one specific acceptance question, an explicit acceptance boundary. Automation supplies evidence and proves the artifact is technically healthy; it never accepts. The gate sits Waiting Human — never auto-claimed, never bundled into completion (root §4).
7. **Hostile + nearby, operationalized.** Non-trivial behavior change: at least one hostile gate or a recorded waiver-with-reason in the plan; one nearby behavior named with status `tested | inspected | inferred | left unverified` plus the risk when unverified.
8. **IDs are namespaced, append-only.** `<FEATURE-SLUG>__GLOBAL-G1`, `<FEATURE-SLUG>__M2__G1`, `<FEATURE-SLUG>__M1__S1`, `<SLUG>__CHANGE-G1` — spec-less quick changes mint a semantic slug. Never a naked `M1-G1`, `CHANGE-G1`, or `Phase 2`, in any file. Retire with a pointer; never renumber.
9. **Stop conditions are exact.** Allowed: repair once from the trace, then circuit-break on repeated similar failure (root §7) · invoke `$eval__implement-proof-gate` before product code · halt for missing credential/environment · halt for Waiting Human acceptance · halt and report the boundary when scope or targets changed, or when the value path cannot be proven deterministically inside the lane (root §3, §5 — record the exception in the plan, never absorb it silently). Forbidden: "Investigate", "Fix tests", "Manual QA", "Check that it works", or any next action without a who/what.
10. **Design ≠ execution.** Discovery is read-only: inspect scripts, task runners, tests, harnesses, docs; no installs, no services, no snapshot updates, no proof runs. Confirming a command *exists* never claims it proves current behavior. No invented scripts, routes, fixtures, env vars, or paths — undiscovered means `missing harness: <name>`. Thresholds carry a source (spec `C-###`, repo config, benchmark history, user instruction) or an explicit assumption/blocker label — never an unsourced number as fact.
11. **Repo physics** (applies where the lane touches the surface; silence elsewhere — no N/A marking).
    - **Browser gates name their instrument.** "Browser proof" is never abstract: the `loop` names the concrete driver and invocation — a Playwright project, a headless-Chromium script, an existing capture harness — whatever discovery actually finds (Law 10). When speccing a *missing* browser harness, default to Playwright unless an existing instrument already covers the surface — the `extends` field decides. Whichever driver: waits bind to user-visible state or exact network/frame events — an arbitrary sleep is a designed-in flake; console/page errors are zero unless the card explicitly waives them; when transport matters, assert method/path or websocket frame type plus the critical payload fields; canvas/game surfaces additionally prove nonblank, correctly framed, and interacting — "page loaded" is not proof. The `loop` may be the fast simulation harness while `authority` stays the browser: iterate cheap, prove final in the authority env (root §5).
    - **Game lanes:** the final value path is mobile-native portrait — include a fresh **390×844** portrait gate (a viewport config on the lane's browser instrument, not a separate one); desktop/landscape artifacts may supplement, never replace.
    - **Deterministic lanes:** replay/snapshot/restore gates assert at the restore boundary **and** a later checkpoint or final hash (root §2 — final-state-only equality hides reconverged drift).

---

## Measurement-First Probes

Trigger vocabulary: smooth, live, fast, responsive, low latency, no jank, keeps up, converges, supports N, handles concurrency, scales, bounded fanout, queue drains, join is fast — any claim of speed, latency, smoothness, throughput, capacity, or convergence.

For these claims, design — or explicitly reject, with reason and lowered confidence — a direct programmatic probe **before** any subjective, browser, or manual acceptance:

- **Probe actors:** the minimal pair expressing the value path — writer/reader, sender/receiver, producer/consumer, player A/player B.
- **Correlation:** sequence/operation/run/trace IDs, logical ticks, or timestamp discipline that matches cause to effect — never visual inference.
- **Budget:** sourced threshold or labeled assumption/blocker (Law 10).
- **Workload ladder:** a baseline rung plus the target-load rung minimum; intermediate rungs when the knee of the curve matters.
- **Load shape, decomposed:** connected-idle vs. active work-producing counts, operation cadence, payload size, locality/density, churn/fault model, ramp + steady-state duration, machine/topology. A bare "N users" is not a falsifiable scale claim.
- **Counts are not capacity.** Reaching N proves only "can open N"; capacity gates also measure behavior under load — latency, update gaps, stale age, error rate, queue depth, resource ceilings, authoritative-state correctness.
- **Diagnostic attribution:** stage timings, queue depth, event-loop delay, resource signals — whenever the likely next action depends on knowing where time is spent.
- **Artifact:** raw samples plus summary — never only a screenshot or prose note.
- **Observer overhead:** if the observer materially changes the measurement, find the lower-overhead protocol/API/synthetic probe or record why none exists.

Browser or manual observation of a measurable claim is classified as exactly one of: **integration observer** (proves the product path still works; the probe owns the SLO) · **subjective observer** (proves human feel; requires acceptance) · **primary measurement** (allowed only when the UI/browser is itself the boundary under test — justify why no lower-overhead probe proves the value).

---

## Gate Classes (synthesis menu, not canned tests)

| Class | Falsifies claims about | Canonical evidence |
| --- | --- | --- |
| Terminal value-path | the actual journey completes | final UI/API/persisted state |
| Contract/API | request/response/event/schema semantics | status, payload, error body |
| Persistence | survives reload, restart, retry, later query | read-after-write artifact |
| Realtime/convergence | actors observe consistent state over time | correlated snapshots + divergence budget |
| Orchestrated compound | several truths in the same live run | multi-observer bundle, one run ID |
| Scale/performance | value holds under N, rate, size, duration | benchmark + error budget + resources |
| Browser/render | user-visible state and interaction | Playwright/Chromium trace, video, screenshot, console/network |
| Network/packet | transport, ordering, payload, timing | frame/packet capture |
| Failure/hostile | safe behavior under bad input or failure | rejection/degrade/no-side-effect proof |
| Security/privacy/auth | access, identity, permissions | allow/deny matrix, audit log |
| Idempotency/retry | duplicates, replay, timeout, partial success | stable final state after repeats |
| Migration/compatibility | old, new, mixed, malformed data coexist | fixture matrix + rollback proof |
| Observability/operator | humans can detect healthy vs. broken | metric/log/alert evidence |
| Subjective human | feel, taste, trust, readability | artifact + recorded acceptance |
| Nearby non-regression | adjacent behavior unchanged | targeted proof or recorded status |

---

## Gate States

`Open` (designed; no fresh artifact) → `Red captured` (watched-red exists, pre-fix) → `Objectively Green` (ran in the authority environment against current code; fresh artifact + git id recorded; remaining-delta list empty — root §4) · `Waiting Human` (subjective acceptance pending) · `Blocked — harness | environment | credential` · `Waived — <reason>` · `Retired — superseded by <ID>`.

Green is a claim about a recorded run: artifact path + git id + date in `last_run`. No artifact, no green. A gate whose guarded surface has changed since `last_run` is stale — back to `Open`, not Green.

---

## Workflow

1. **Stabilize the claim:** work size (substantial lane vs. quick change — root §4), the unlock, the terminal proof-of-value state, work-spec path and rung IDs, target environment, whether subjective quality is part of the value. Multiple plausible unlocks that would materially change proof design = product fork: ask the one blocking question or emit a blocked design (root §3).
2. **Discover read-only:** existing eval plan, work-spec contracts, scoped AGENTS, package/task-runner scripts, tests/evals/harnesses near the domain — including the owning QA game's instruments. Extending a shared instrument beats building bespoke (root §5); every missing-harness spec says what it extends or why nothing can.
3. **Decompose the unlock into required truths.** Per truth: actor · boundary (where it can break: UI, client, network, server, storage, worker, tool, cache, auth, scheduler, operator) · state required · time (instant / eventual / steady-state / after restart / after reconnect / across versions) · scale · measurement (quantity, budget, window) · observer overhead · failure modes (invalid, missing, duplicate, out-of-order, delayed, partial, unavailable, malicious) · perception (must a human see/feel/trust it?) · authority (canonical evidence source) · plausible lie.
4. **Synthesize and select** the smallest sufficient set (Law 2). Compound claims get the orchestrated gate first; supporting gates only where they isolate a high-risk dependency or make failures diagnosable.
5. **Write gate cards** — states, loops, run policy, stop conditions, potency, blind spots.
6. **Inventory harnesses honestly;** spec the missing ones.
7. **Write or update `eval-plan.md`** (template below). Substantial lanes always get the durable plan. Inline-only design is allowed for a quick change with no active spec and no durable reuse expected — say why. Never create durable eval plans for truly mechanical edits.
8. **Return the Skill Result.** The caller owns the human-facing close-out (root §5); no other response ceremony is mandated.

---

## Template

````markdown
# EVAL PLAN — <FEATURE_NAME>
**Human Read:** This plan can falsify <unlock> in <target environment>. The primary value-path gate is <ID>. Current state: <n green / n open / n blocked / n waiting human>. Biggest unproven risk: <risk>. Next gate to run: <ID> via <loop>.

**Last updated:** YYYY-MM-DD
**Work spec:** <path> | None — <why>
**Feature slug:** <slug>
**Target environment(s):** <runtime(s) where value matters>

---

## Doc Conventions (Do Not Delete)
- **Schema truth:** the `eval__design-proof-gates` skill. Gate IDs are append-only, never renumbered; retired gates keep their card in the Appendix with a pointer to the superseding ID.
- **IDs are fully namespaced** (`<SLUG>__M#__G#`, `<SLUG>__GLOBAL-G1`, `<SLUG>__CHANGE-G#`, `<SLUG>__M#__S#`); a naked ID anywhere is a halt-and-clarify, never a guess.
- **States:** Open | Red captured | Objectively Green | Waiting Human | Blocked — <what> | Waived — <reason> | Retired — <pointer>. Objectively Green requires a fresh artifact from current code in the named authority environment, recorded in `last_run` (artifact path + git id + date). No artifact, no green — this document records proof, it never manufactures it. Guarded surface changed since `last_run` ⇒ state returns to Open.
- **Waiting Human is never auto-claimed** or bundled into completion (root §4).
- **Spec mirror:** the work spec's Proof & Eval Summary mirrors gate states — resync it in the same edit as any state change here. Divergence: this plan wins gate state and mechanics; the spec wins lane scope.
- **The synthesis table (§2) is durable:** update it whenever gates are added, waived, or retired — it is the record of why these gates and not others.
- **Future-state gates stay out of default CI** (run policy: Milestone-gated) until their milestone; a known-red never poisons the default loop (root §5).
- **Thresholds carry a source** (`C-###`, `SRC-###`, benchmark history, user instruction) or an explicit assumption/blocker label.
- **Deterministic-proof exceptions** (root §5: a value path that cannot be proven deterministically) are recorded in §6 with the architectural reason — never silently absorbed.

## 1) Unlock & Proof-of-Value State
- **Unlock:** <user journey / engineering system unlock — root §0>
- **Terminal truth:** <the exact terminal state ending the value path — what a reviewer inspects to falsify the claim>
- **Subjective component:** <what only a human can accept> | None

## 2) Gate Synthesis (durable)
| Required truth | Plausible lie prevented | Class | Gate | Reason |
| --- | --- | --- | --- | --- |
| <truth> | <weak proof that could falsely pass> | <class> | <ID> / Excluded | <why included, or why excluded> |

Obvious classes a reviewer would expect (security, persistence, perf, visual, network, replay, failure) appear here even when excluded.

## 3) Proof Stack
3–7 lines: which gates, and why each proves value rather than mechanism; the orchestrated gate first when the claim is compound. **Stack blind spot:** the axes no gate in this plan moves.

## 4) Gates
### 4.1 Index (projection of the cards)
| Gate | Kind | Class | State | Loop | Last run |
| --- | --- | --- | --- | --- | --- |

### 4.2 Gate cards
```yaml
id: <SLUG>__M1__G1
kind: global | milestone | change | hostile | non-regression
class: <from the synthesis menu>
claim: <value claim this gate can falsify>
lie: <the weak proof that could pass while the value is broken>
blind_spot: <what this instrument cannot see>
setup: <fixture / seed / account / world / request / replay / service state>
action: <exact user / system / browser / worker / tool / network / operator action>
observation: <terminal state / persisted row / packet / metric / trace / log / output inspected>
verdict: <exact pass/fail condition>
authority: <target environment where the value matters>
artifact: <fresh artifact type + path pattern, tmp/<datetime>__<semantic>/>
potency: watched-red — <the red to capture before the fix> | mutation — <what to hand-break; must turn exactly this gate red> | n/a — <reason>
loop: <rerunnable command | route + action | missing harness: <name> | blocked: <reason>>
run_policy: Default CI | Local eval | Milestone-gated CI | Human review | Blocked
stop: <one allowed stop condition — Design Law 9>
state: Open | Red captured | Objectively Green | Waiting Human | Blocked — <what> | Waived — <reason> | Retired — <pointer>
last_run: none | <artifact path> @ <git id>, YYYY-MM-DD
refs: [<C-###>, <SRC-###>, <rung IDs>]
orchestration:            # compound gates only
  coordinator: <command | missing harness: <name>>
  run_id: <correlation scheme tying every observation to one run>
  actors: [<name — count — behavior>]
  scale_target: <exact load + how it is measured>
  duration: <ramp + steady-state>
  churn_fault_model: <disconnect/reconnect/jitter/loss/late-join model | none — reason>
  observers: [<server metrics>, <browser trace>, <frame capture>, <persistence query>]
  aggregate_verdict: pass only if every required observer passes in the same run
```
```yaml
id: <SLUG>__M1__S1
kind: subjective
artifact: <video / screenshot set / replay / before-after page>
support: <automated evidence proving the artifact is complete and technically healthy>
question: <the one specific acceptance question>
boundary: <what explicit acceptance means; what a rejection must name>
state: Waiting Human
stop: Halt until acceptance or requested revision is recorded.
refs: [<C-###>, <rung IDs>]
```

## 5) Harness Inventory
**Existing:** <command — path — target env — artifact — limitations> (extend before building — root §5)
**Missing:**
```yaml
harness: <stable repo-searchable name>
proves: <gate IDs this harness enables>
extends: <existing instrument extended> | nothing — <why no existing instrument can>
envelope: <exact path or narrow creation envelope>
payload: <fixture / seed / replay / world state required>
verdict: <exact pass/fail the harness must decide>
artifact: tmp/<datetime>__<semantic>/
required_before_product_code: yes | no — <reason>
route: $eval__implement-proof-gate
```

## 6) Run Policy & Exceptions
- Default CI now: <IDs> · Local eval: <IDs> · Milestone-gated: <IDs + milestone> · Human review: <IDs> · Blocked: <IDs + what unblocks each>
- Artifact conventions: raw proof under `tmp/<datetime>__<semantic>/`; the work spec records surviving summaries after runs.
- Deterministic-proof exceptions: none | <exception + architectural reason — root §5>

## Appendix
Retired gate cards (with superseding pointers) · superseded synthesis rows · run-history notes worth keeping.
````

---

## Conformance Check (run before writing — never stored; stored verdicts belong to the §6 audit lens)

- Every gate binds the full anatomy (claim/setup/action/observation/verdict/authority/artifact/stop) and names its lie, blind spot, and potency.
- Synthesis table covers every required truth; excluded obvious classes carry reasons; smallest sufficient set — no coverage theater, no mechanism-only gates.
- Compound claims have one same-run orchestrated gate, not disconnected checks.
- Measurable claims have a direct probe (or an explicit rejection) with sourced-or-labeled budgets and decomposed load shape; browser observers of measurable claims are classified.
- Subjective quality has an artifact-backed human gate with one question and a boundary; nothing subjective is auto-accepted.
- Hostile gate present or waived-with-reason; nearby behavior named with status.
- All IDs namespaced; states from the machine; no green without artifact + git id; future gates out of default CI.
- Harness inventory honest: existing instruments named with limitations; missing specs say what they extend; no invented commands, paths, or thresholds.
- Browser gates name their concrete driver in the `loop`, wait on state/events (no sleeps), and carry the console/error policy; game lanes carry the 390×844 portrait gate; deterministic replay gates assert restore boundary + later checkpoint.
- Work-spec sync need identified and returned in the Skill Result — never edited from here.

## Skill Result (return to caller — required elements, any shape)

- Eval plan path | Inline only — <reason> | Blocked — <reason>
- Work spec path + sync needed (yes — <what> | no)
- Feature slug · Rungs covered (full IDs | not milestone-based)
- Primary value-path gate + its loop (existing command | missing harness)
- Gate IDs by kind · Subjective gates + their questions
- Missing harnesses (names; which block product code)
- Run-policy summary · Open blockers
- Recommended next action (one)