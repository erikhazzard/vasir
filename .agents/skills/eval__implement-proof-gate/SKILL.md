---
name: eval__implement-proof-gate
description: Builds and runs a missing proof harness explicitly warranted by a current eval card, then records qualified harness, run, and product-claim status without changing product behavior. Use when a current eval plan names a concrete missing harness need and envelope, or an existing required instrument is Defective.
tools: Read, Grep, Glob, Bash, Edit, Write
---

# Eval Implement Proof Gate — Build the Proof, Not the Feature

This skill turns a current gate card with a warranted missing-harness need into a literal runnable command that can prove or falsify the claim in the authority environment. It prevents proof instruments from being invented or weakened under implementation pressure and distinguishes "the intended value is not present," "a known defect reproduced," and "the harness is broken." Root §5 decides whether the gate and harness are warranted; this skill never creates that obligation.

**A trustworthy non-green product result can complete this harness task without making the product green.** Once the gate has a literal runnable loop, a current receipt, and the right `Harness Ready` / `Red Captured` / `Blocked` / `Defective` classification, this skill is done — it never continues into product implementation. A completed harness task is not a delivered product outcome.

**Ownership boundary.** The gate card and its concrete missing-harness row in `eval-plan.md` are the input contract: design owns claim, verdict, authority, current basis, potency, run policy, envelope, and receipt shape. This skill owns only harness/fixture/replay/diagnostic files inside that envelope, execution of the declared potency, and the resulting gate receipt/state. It writes a raw `tmp/` bundle only when later inspection or comparison requires retention; otherwise the receipt contains an inline surviving result. It returns any changed surviving conclusion to the orchestrator; it does not mirror gate state into the work spec. It never touches product behavior, UI/gameplay/business logic, public contracts, persistence schemas, auth, or production config; never adds dependencies without approval; never accepts subjective gates; and never renders rung/lane completion.

**Routing.** Classification is a gate verdict — orchestrator tier (root §7). Harness assembly from a fully-specified card is mechanical application of an exact written spec and may ride cheaper tiers; the diagnosis never does. No model pin.

---

## Preconditions

All must hold, or stop:

1. A current **objective** gate card exists in the active eval plan with a concrete verdict, current lane approval, and a missing-harness row naming why it is needed, its envelope, owner, and retirement condition (or the existing harness is recorded Defective).
2. Every field the harness needs — setup, action, observation, verdict, authority, artifact, envelope, potency — can be made concrete from the card plus the missing-harness spec. A field that cannot be concretized is a **design gap**: route back to `$eval__design-proof-gates`; never improvise the missing half.
3. No unapproved product-code seam is required. If proof needs a runtime hook, telemetry, public contract, or product config, route that work into an approved product rung with its own contracts/proof; never hide it inside harness implementation.

Vague, subjective-only, unwarranted, or approval-invalid gates route back to design. Final handoff belongs to `$handoff__final-quality-gate`.

---

## Classification = State Transition + Qualified Status

The run produces one gate-state transition plus three independent, qualified fields:

```text
Harness: VALID | DEFECTIVE | UNVERIFIED
Run: COMPLETED | BLOCKED | NOT_RUN
ProductClaim: GREEN | RED | UNVERIFIED
EvidenceReason: <specific reason when it changes interpretation>
```

`Harness` says whether the instrument can distinguish the card's green from red. `Run` says whether the declared proof action and observation completed, was attempted but blocked, or was not run. `ProductClaim` always refers to the exact gate claim and claim boundary, never to the harness-building task or a convenient subsystem. `GREEN` and `RED` are legal only when `Harness: VALID` and `Run: COMPLETED`. `NO_SIGNAL` is only an `EvidenceReason`; it requires `ProductClaim: UNVERIFIED` and never becomes a product outcome or a pass synonym.

Each classification writes the named state to the card and reports the corresponding qualified status:

- **HARNESS_READY → `Harness Ready`.** For new or intentionally changed behavior, the harness ran and correctly reports that the intended value is not present yet. Report `Harness: VALID`, `Run: COMPLETED`, `ProductClaim: RED`, and the specific absence as `EvidenceReason`. This proves instrument readiness, not product delivery or watched-red potency.
- **READY_RED → `Red Captured`.** For a defect gate whose card declares `watched-red`, the harness reproduced the escaped behavior for the intended reason, not a harness defect. Report `Harness: VALID`, `Run: COMPLETED`, `ProductClaim: RED`, and the reproduced defect as `EvidenceReason`. Preserve the red receipt while it exists.
- **READY_GREEN → `Objectively Green`.** Only after declared potency is satisfied, report `Harness: VALID`, `Run: COMPLETED`, `ProductClaim: GREEN`. Write a current receipt: action, result, evidence summary or necessary artifact path, environment, owner/date, exact basis, and claim boundary.
- **RUN_BLOCKED → `Blocked — <what>`.** Missing credential, runtime, tool, fixture, service, or safe execution condition. Report `ProductClaim: UNVERIFIED`; report `Run: BLOCKED` when execution was attempted and could not complete, otherwise `Run: NOT_RUN`; report `Harness: UNVERIFIED` unless existing evidence independently establishes that the instrument is valid. Name the concrete blocker in `EvidenceReason`.
- **HARNESS_DEFECT → `Defective`.** The harness is broken, flaky, misconfigured, or cannot distinguish green from red. Report `Harness: DEFECTIVE`, `ProductClaim: UNVERIFIED`, and `Run: COMPLETED` only when a completed execution exposed the defect; otherwise `Run: NOT_RUN` or `BLOCKED` according to fact. Name the defect in `EvidenceReason`. Invalidate any prior green receipt for the affected claim; preserve it only as historical evidence. Record the harness path, diagnosis, affected guard/proof basis, and repair condition.

No unqualified `PASS`, `SUCCESS`, `BLOCKED`, or `FAIL` verdict is permitted. Harness Ready and Red Captured mean the instrument is valid and its run completed while `ProductClaim` remains `RED`. A product-facing result leads with `ProductClaim`, its exact claim, and claim boundary; harness-task completion may be reported afterward and can never upgrade the product claim.

---

## Laws

1. **The card is the spec.** Implement exactly the setup, action, observation, verdict, and authority the card names — including the orchestration block for compound gates (coordinator, run ID, actors, duration, churn model, observers, aggregate verdict). Never make the gate easier under implementation pressure; the named degradations are forbidden: real browser → unit test · real packet → mocked event · real persistence → in-memory object · authority runtime → local stub · concurrent workload → sequential loop · hostile condition → happy path · approved threshold → smaller threshold · same-run observers → disconnected tests. If the approved target is impossible in the current environment, report `ProductClaim: UNVERIFIED`, `Run: BLOCKED`, the evidence-backed `Harness` status, and the concrete `EvidenceReason` — never a softer harness.
2. **Smallest sufficient, on the named instrument.** Exercise the full value path the card requires and nothing else: no unrelated journeys, only the fixtures the gate needs, no generic infrastructure beyond the missing-harness spec. Build onto the spec's `extends` instrument; if that instrument cannot host the harness, the design's extends claim was wrong — boundary, not a silent bespoke sibling. The harness must be rerunnable as the repair-iteration loop after product fixes; a one-off check is insufficient unless the card says the proof is one-time.
3. **Diagnose before claiming red.** Before writing `Red Captured` or `ProductClaim: RED`, rule out harness-caused failure: broken selector, fixture, route, unrelated timeout, credential/outage, runtime error, harness-created race, mock drift, or unsupported environment. One repair attempt inside the envelope; if the same or similar defect repeats, transition to Defective, invalidate affected green, and stop. **Never repair product code** — an intended product red is the handoff.
4. **Execute exactly the card's declared potency.** Never silently upgrade or weaken it. `watched-red` is satisfied only by a captured defect reproduction. `characterization` is satisfied by the named pre-change behavior run. `mutation` applies exactly the warranted critical hand-break, reruns until this gate fails for the intended reason, reverses the edit, and reruns green. `adversarial/property` executes the named falsifier and observes the specified rejection/invariant. `credible-oracle` inspects the named independent terminal observation and records why mutation would not materially increase confidence. Missing/incoherent potency routes back to `$eval__design-proof-gates`; never invent a mutation. If the falsifier turns the wrong gate red — or nothing red — transition the gate to `Defective`.
5. **Mutation custody.** When the card declares mutation, edits are surgical, reversed in-session by applying the exact inverse edit, never committed, and never left in the tree across a halt or handoff — this is a shared repo folder (root §8).
6. **Fixtures are honest and bounded.** Source-backed or explicitly synthetic; minimal; each names the real state it represents. Deterministic seeds for any randomized behavior, with the seed printed into the artifact so every failure reproduces from it. Explicit bounds: max actors, bytes, duration, retries, frames, records, requests. No private user data, no production secrets, no destructive writes.
7. **Cleanup never eats needed evidence.** Non-destructive cleanup only; never delete production data. Preserve the receipt's surviving summary and any artifact retained for later inspection until its retirement condition.
8. **Repo physics** (pointers where this skill is the enforcement point). Kernel-adjacent harnesses are part of the deterministic lane (root §2): no native `Math.*` default — explicit deterministic math adapter or fail fast; replay/restore verdicts already carry the restore-boundary + later-checkpoint requirement from the card. When the envelope is a folder rather than an exact path, spec placement and extend-existing-spec conventions follow root §5.

---

## Workflow

1. **Load the contract:** the gate card, its missing-harness spec, the envelope's scoped `AGENTS.md`, and the nearest existing eval conventions and runner scripts. Do not vacuum the repo. Nothing is invented — paths, commands, routes, fixtures, credentials, runners all come from the card, the spec, or read-only discovery; unconcretizable means route back or report `ProductClaim: UNVERIFIED`, `Harness: UNVERIFIED`, `Run: NOT_RUN`, and the design gap as `EvidenceReason`.
2. **Build** inside the envelope, on the `extends` instrument, per Laws 1–2.
3. **Run once** — the literal command that becomes the card's `loop`. Capture raw output.
4. **Diagnose and classify** per Law 3 (repair once for harness defects; intended new value missing is HARNESS_READY; reproduced defect is READY_RED only when the card declares watched-red).
5. **If green, execute potency** per Laws 4–5 before any green claim.
6. **Write the receipt.** Record timestamp, git id, environment, gate/claim, exact action/command, actual result, harness files, classification, current basis, potency execution, claim boundary, remaining delta, and next action. Create `tmp/<datetime>__<feature-slug>__<gate-id>/eval-trace.md` only when later inspection or comparison requires retention; otherwise keep the concise surviving result inline.
7. **Sync the eval card in one edit:** update its `loop` (literal command), `state`, `last_run`, basis, and any defect/blocker note. If the surviving claim boundary or conclusion changed, return that exact change to the orchestrator for `$plan__maintain-work-spec`; do not create a mirrored gate row.
8. **Return the Skill Result.** Lead with the scoped `ProductClaim`, then report `Harness`, `Run`, and any `EvidenceReason`; the caller owns the human-facing close-out (root §5). No other response ceremony is mandated.

---

## Boundaries (halt and report — root §3)

- Gate/lane unapproved, harness need not specifically warranted, gate vague/subjective-only, or verdict not falsifiable → route to `$eval__design-proof-gates`.
- Required edits exceed the envelope; a product-code seam is needed; a new dependency is needed.
- Running the harness would be destructive, or would require production data or secrets.
- Implementing the proof would require weakening the approved gate in any Law-1 direction.
- The `extends` instrument cannot host the harness, or the card's potency cannot be executed as specified.

---

## Skill Result (return to caller — required elements, any shape)

- ProductClaim: GREEN | RED | UNVERIFIED — first, with the exact claim and claim boundary
- Harness: VALID | DEFECTIVE | UNVERIFIED · Run: COMPLETED | BLOCKED | NOT_RUN · EvidenceReason: specific reason when needed
- Gate state transition: Harness Ready | Red Captured | Objectively Green | Blocked | Defective
- Gate ID · Harness path(s) · Literal command (the card's new `loop`)
- Evidence receipt (inline summary or necessary `tmp/...` artifact) · Current basis · Potency execution
- Eval plan sync (card fields updated) · changed work-spec conclusion/claim boundary to route, or None
- Run-policy correction proposed (if any) · Remaining delta (exact, or None)
- Recommended next action (one — typically: implement only the approved rung behavior until this loop reaches the approved gate)

Never summarize `Harness Ready`, `Red Captured`, a blocked run, a defective harness, or `NO_SIGNAL` as an unqualified pass or success.

## References

- `references/eval-cases.md` — non-normative cases to read when changing routing or status semantics, or auditing false-green reporting under attention pressure.
