# Four Adversarial Review Gates

Apply only the gates warranted by the requested output and the consequence of being wrong. Focused answers may use a proportional self-review. Use a fresh-context reviewer for substantive reports, reconstruction deliverables, or material conclusions where independence changes confidence. Acquisition and inference apply to every route; specification applies when a spec or fixtures are delivered; presentation applies when a report is delivered. The reviewer’s job is to find failure, not improve tone. Every durable finding has severity, evidence, affected IDs/surfaces, required action, and resolution.

Severity:

- `P0` — invalidates a headline conclusion, canonical model, timing, or clone behavior;
- `P1` — material error or missing scope likely to mislead implementation/interpretation;
- `P2` — local weakness, ambiguity, or presentation defect;

## Gate 1 — Acquisition adversary

Inputs: source scope, capture limits, chronology, evidence ledger, instrument outputs, and coverage notes.

Attack:

- For run-spanning or whole-source claims, was every relevant source watched uninterrupted with audio? For a focused claim, was enough lead-in and aftermath inspected to establish state and consequence?
- Did contact sheets or detector spikes substitute for sequence understanding?
- Are low-motion, low-luma, audio-only, and detector-disagreement windows represented?
- Were random/stratified intervals audited outside the emerging thesis?
- Are PTS, frame uniqueness, VFR, cuts, gaps, and audio synchronization valid?
- Did any tool fail open, emit empty/zero output, distort aspect, or assume fps/resolution?
- Are camera and coordinate preconditions actually met?
- Are important source regions, phases, or valid opportunities uninspected?
- Could overlay, compression, occlusion, replay, slow motion, or capture artifacts explain the signal?

Reject any conclusion whose evidence acquisition is invalid; do not merely lower confidence.

## Gate 2 — Inference adversary

Inputs: evidence, claims, models, conflicts, coverage, ledger.

Attack:

- What other hidden models produce the same observations?
- Were the first plausible explanation and the simplest explanation confused?
- Are candidate predictions tested against natural experiments elsewhere in the footage?
- Are support and contradiction evaluated on valid, independent cases?
- Does any negative claim lack an opportunity predicate/count?
- Did `n=1` become a standing rule?
- Are target/state/era/camera/clock confounds omitted?
- Are displayed values mistaken for internal values?
- Are mechanics, dynamics, experience, and player intent circularly validating one another?
- Does outcome/hindsight bias contaminate coaching or design judgments?
- Did agent consensus arise from shared evidence and assumptions rather than independent methods?
- Did game-specific remembered knowledge leak into the footage-grounded analysis?
- Do selected models jointly reconcile damage/HP/kills, economy/inventory, spawn/population, movement/camera, and pause/timers?

Require alternative models or an explanation of why none are materially distinct.

## Gate 3 — Specification adversary

Inputs: reconstruction, candidate models, claims, fixtures, conflicts, and unknowns.

Attack:

- Does every citation resolve and every material term remain internally consistent?
- Is each field evidenced, model-backed, a labeled reference implementation, or explicitly open?
- Are units, coordinate systems, clocks, denominators, ranges, and scope complete?
- Are timestep, pause, update order, event priority, rounding, stacking, caps, and RNG semantics defined enough to implement?
- Are observationally equivalent alternatives preserved?
- Does the reference implementation avoid unsupported complexity and behavior contradicted by the trace?
- Are entity lifecycle and state transitions complete for observed behavior?
- Do fixtures come from source evidence rather than the chosen model?
- Do fixture tolerances reflect source cadence/measurement uncertainty?
- Would two implementers make incompatible systems from the same text?
- Can selected fixtures detect the most consequential wrong implementations?
- Does the reconstruction distinguish source fidelity from historical-code claims?

A well-formatted but behaviorally ambiguous reconstruction fails this gate.

## Gate 4 — Presentation adversary

Inputs: rendered report, evidence ledger, reconstruction when present, and review notes.

Attack:

- Does hero prose overstate a modeled or contested claim?
- Do identical facts drift across hero, prose, tables, charts, captions, ledger, and spec?
- Are chips consistent with underlying metadata?
- Are conflicts, alternatives, scope, `n=1`, and unknown type visible where needed?
- Do stills attempt to prove temporal claims without clips/context?
- Are charts using valid axes, denominators, scales, uncertainty, and observed/model distinctions?
- Are labels clipped, colliding, unreadable, or visually implying false precision/continuity?
- Does narrative framing suppress contrary evidence or force the ending into a thesis?
- Are player-state and design-purpose interpretations written as facts?
- When a reconstruction is present, does the report distinguish its baseline choices from what the original game is known to do?

Render-check at desktop and narrow/mobile width.

## Finding format

Use `templates/adversarial-review-template.md` when a durable review record is warranted. A finding names the affected claim or surface, problem, evidence, best counter-read, required action, disposition, and rationale. Focused work may apply the same questions without creating a review artifact.

## Resolution rules

- Fix, invalidate, or explicitly decline with evidence and rationale.
- Re-run every downstream artifact touched by a canonical change.
- A declined P0/P1 remains visible in final limitations.
- The same reviewer may verify a mechanical fix; a fresh pass should verify a changed headline conclusion.
- A delivered headline or reconstruction must not conceal an unresolved P0/P1; fix it, narrow the claim, or disclose it as a limitation.
