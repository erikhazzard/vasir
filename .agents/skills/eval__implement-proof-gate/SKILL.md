---
name: eval__implement-proof-gate
description:Builds the missing runnable harness for an approved gate card, runs it, and writes the state transition (Red captured / Objectively Green / Blocked) — proof only, never product behavior. Triggers on a gate's loop says "missing harness"; a gate needs a literal runnable command before product code proceeds; an existing harness is marked defective.
tools: Read, Grep, Glob, Bash, Edit, Write
---

# Eval Implement Proof Gate — Build the Proof, Not the Feature

This skill turns an approved gate card into a literal runnable command that can prove or falsify the claim in the authority environment. It exists to prevent the classic agent failure — product code written before a real value-path eval exists that can fail for the right reason — and to make the harder judgment call correctly: distinguishing "red because the product lacks the value" from "red because the harness is broken."

**A red product result is often the correct outcome.** Once the gate has a literal runnable loop, a fresh artifact, a trustworthy classification, and a synced plan, this skill is done — it never continues into product implementation.

**Ownership boundary.** The gate card and missing-harness spec in `eval-plan.md` are the input contract: design owns claim, verdict, authority, artifact, potency, run_policy, and envelope — this skill never weakens, renames, reframes, or lowers any of them. This skill owns: creating/updating harness, fixture, replay, and harness-local diagnostic files inside the card's envelope; running the harness; executing potency; writing raw proof under `tmp/<datetime>__<feature-slug>__<gate-id>/`; and updating the card's `loop`, `state`, and `last_run` plus the work spec's Proof & Eval Summary mirror row in the same edit (the plan's conventions bind). It never touches product runtime behavior, UI/gameplay/business logic, API contracts, persistence schemas, auth behavior, or production config; never adds dependencies without approval; never accepts subjective gates; and never renders rung or lane completion — gate verdicts and rung closure are orchestrator-tier (root §7).

**Routing.** Classification is a gate verdict — orchestrator tier (root §7). Harness assembly from a fully-specified card is mechanical application of an exact written spec and may ride cheaper tiers; the diagnosis never does. No model pin.

---

## Preconditions

All must hold, or stop:

1. An approved **objective** gate card exists in the active eval plan with a concrete `verdict`, and its `loop` says `missing harness: <name>` (or names a harness recorded as defective).
2. Every field the harness needs — setup, action, observation, verdict, authority, artifact, envelope, potency — can be made concrete from the card plus the missing-harness spec. A field that cannot be concretized is a **design gap**: route back to `$eval__design-proof-gates`; never improvise the missing half.
3. No product-code seam is required. If the harness needs a runtime hook, telemetry in a product path, a contract change, or config, halt and report the boundary (root §3) — never silently make the seam.

Vague, subjective-only, or unapproved gates route back to design. Final handoff belongs to `$handoff__final-quality-gate`.

---

## Classification = State Transition

The run produces exactly one product-gate classification, and each classification *is* the state it writes to the card:

- **READY_RED → `Red captured`.** The harness ran, measured the approved gate, and the product does not yet satisfy it — for the intended missing-value reason, not a harness defect. Record the red artifact on the card: this is the watched-red evidence root §5 says to capture while it exists. **This is a successful outcome.**
- **READY_GREEN → `Objectively Green`** — only after potency executes (Law 4). Write `last_run`: artifact path + git id + date.
- **BLOCKED → `Blocked — <what>`.** Missing credential, runtime, tool, fixture, service, or safe execution condition. No product-gate claim is made.
- **HARNESS_DEFECT → no state transition.** The harness is broken, flaky, misconfigured, or cannot distinguish pass from fail. No claim is made; record the harness path and a one-line defect diagnosis on the card so the next attempt starts from the diagnosis, not from scratch.

Skill outcome maps: `PASS` = Red captured or Objectively Green with fresh artifact and synced plan; `BLOCKED` = blocked classification or missing approval; `FAIL` = HARNESS_DEFECT after one repair, or an unresolvable boundary. **Red captured is a PASS — report it as harness readiness, never as a failed skill.**

---

## Laws

1. **The card is the spec.** Implement exactly the setup, action, observation, verdict, and authority the card names — including the orchestration block for compound gates (coordinator, run ID, actors, duration, churn model, observers, aggregate verdict). Never make the gate easier under implementation pressure; the named degradations are forbidden: real browser → unit test · real packet → mocked event · real persistence → in-memory object · authority runtime → local stub · concurrent workload → sequential loop · hostile condition → happy path · approved threshold → smaller threshold · same-run observers → disconnected tests. If the approved target is impossible in the current environment, the honest answer is `Blocked` — never a softer harness.
2. **Smallest sufficient, on the named instrument.** Exercise the full value path the card requires and nothing else: no unrelated journeys, only the fixtures the gate needs, no generic infrastructure beyond the missing-harness spec. Build onto the spec's `extends` instrument; if that instrument cannot host the harness, the design's extends claim was wrong — boundary, not a silent bespoke sibling. The harness must be rerunnable as the repair-iteration loop after product fixes; a one-off check is insufficient unless the card says the proof is one-time.
3. **Diagnose before claiming red.** Before writing `Red captured`, rule out harness-caused failure: broken selector, missing fixture, wrong route, timeout unrelated to the claim, credentials, dependency outage, syntax/runtime error in the harness, a race the harness itself created, mock mismatch, unsupported environment. One repair attempt inside the envelope; if the same or similar harness defect repeats, classify HARNESS_DEFECT and stop (root §7 circuit breaker). **Never repair product code** — a red that tempts you to fix the product is the handoff, not your lane.
4. **Potency executes; it is never inspected.** Green without a demonstrated ability to fail is fake proof. If the first run is green: execute the card's `potency: mutation — <what to hand-break>` — apply exactly that break, rerun, and exactly this gate must go red; then reverse the mutation by applying the inverse edit, rerun green, and only then write `Objectively Green` with the mutation evidence in the artifact. If the card's potency is `watched-red`, capturing the red on first run satisfies it. If the card names no mutation and the first run is green, hand-break the terminal value the verdict asserts (the smallest edit that removes the claimed value), reverse it after, and report the executed mutation so design can backfill the card. A mutation that turns the wrong gate red — or nothing red — means the instrument cannot fail for the right reason: HARNESS_DEFECT.
5. **Mutation custody.** Mutation edits are surgical, reversed in-session by applying the exact inverse edit, never committed, and never left in the tree across a halt or handoff — this is a shared worktree (root §8).
6. **Fixtures are honest and bounded.** Source-backed or explicitly synthetic; minimal; each names the real state it represents. Deterministic seeds for any randomized behavior, with the seed printed into the artifact so every failure reproduces from it. Explicit bounds: max actors, bytes, duration, retries, frames, records, requests. No private user data, no production secrets, no destructive writes.
7. **Cleanup never eats the evidence.** Non-destructive cleanup only; never delete production data; never remove the artifact the audit needs.
8. **Repo physics** (pointers where this skill is the enforcement point). Kernel-adjacent harnesses are part of the deterministic lane (root §2): no native `Math.*` default — explicit deterministic math adapter or fail fast; replay/restore verdicts already carry the restore-boundary + later-checkpoint requirement from the card. When the envelope is a folder rather than an exact path, spec placement and extend-existing-spec conventions follow root §5.

---

## Workflow

1. **Load the contract:** the gate card, its missing-harness spec, the envelope's scoped `AGENTS.md`, and the nearest existing eval conventions and runner scripts. Do not vacuum the repo. Nothing is invented — paths, commands, routes, fixtures, credentials, runners all come from the card, the spec, or read-only discovery; unconcretizable means route back or `Blocked`.
2. **Build** inside the envelope, on the `extends` instrument, per Laws 1–2.
3. **Run once** — the literal command that becomes the card's `loop`. Capture raw output.
4. **Diagnose and classify** per Law 3 (repair once for harness defects; product-missing red is READY_RED).
5. **If green, execute potency** per Laws 4–5 before any green claim.
6. **Write the raw artifact** at `tmp/<datetime>__<feature-slug>__<gate-id>/eval-trace.md`: timestamp · git id · environment identity (engine/browser, backend or session, device — root §5) · gate ID and approved claim · exact command · harness files created/edited · raw output (or raw-output file path) · produced artifacts · classification · verdict comparison against the approved gate · potency execution record (mutation applied/reversed, or watched-red captured) · remaining delta · next action.
7. **Sync in one edit:** the card's `loop` (literal command), `state`, `last_run`, and any defect/blocker note — plus the work spec's Proof & Eval Summary mirror row. If execution revealed a `run_policy` mismatch (flakier, slower, or more credential-bound than designed), report it as a proposed card correction — never silently reclassify.
8. **Return the Skill Result.** The caller owns the human-facing close-out (root §5); no other response ceremony is mandated.

---

## Boundaries (halt and report — root §3)

- Gate unapproved, vague, subjective-only, or its verdict cannot be stated as pass/fail → route to `$eval__design-proof-gates`.
- Required edits exceed the envelope; a product-code seam is needed; a new dependency is needed.
- Running the harness would be destructive, or would require production data or secrets.
- Implementing the proof would require weakening the approved gate in any Law-1 direction.
- The `extends` instrument cannot host the harness, or the card's potency cannot be executed as specified.

---

## Skill Result (return to caller — required elements, any shape)

- Skill outcome: PASS | BLOCKED | FAIL — with the state transition written (Red captured / Objectively Green / Blocked — <what> / none)
- Gate ID · Harness path(s) · Literal command (the card's new `loop`)
- Artifact path (`tmp/...`) · Potency execution (mutation applied + reversed | watched-red captured | reported for card backfill)
- Eval plan sync (card fields updated) · Work spec mirror-row sync
- Run-policy correction proposed (if any) · Remaining delta (exact, or None)
- Recommended next action (one — typically: implement only the approved rung behavior until this loop reaches the approved gate)