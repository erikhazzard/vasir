# Four Adversarial Review Gates

Each review runs in fresh context after receiving the artifacts listed below. The reviewer’s job is to find failure, not improve tone. Every finding has severity, evidence, affected IDs/surfaces, required action, and resolution.

Severity:

- `P0` — invalidates a headline conclusion, canonical model, timing, or clone behavior;
- `P1` — material error or missing scope likely to mislead implementation/interpretation;
- `P2` — local weakness, ambiguity, or presentation defect;

## Gate 1 — Acquisition adversary

Inputs: source manifest, observability, events, evidence, instrument outputs, coverage.

Attack:

- Was every source watched uninterrupted with audio?
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
- Did game-specific remembered knowledge leak into the footage-only graph?
- Do selected models jointly reconcile damage/HP/kills, economy/inventory, spawn/population, movement/camera, and pause/timers?

Require alternative models or an explanation of why none are materially distinct.

## Gate 3 — Specification adversary

Inputs: schemas, spec, models, claims, fixtures, conflict/unknown records.

Attack:

- Does every file validate and every ID resolve?
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
- Does the README distinguish source fidelity from historical-code claims?

A schema-valid but behaviorally ambiguous spec fails this gate.

## Gate 4 — Presentation adversary

Inputs: rendered report, canonical graph, spec, reviews.

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
- Does the report explain what the clone implements versus what the original game is known to do?

Render-check at desktop and narrow/mobile width.

## Finding format

Write each finding against `schemas/review-finding.schema.json`, starting from
`templates/review-finding.example.json`. Those files own the canonical field names,
uppercase gate values, severity set, and dispositions; do not create a parallel
finding shape in review prose.

## Resolution rules

- Fix, invalidate, or explicitly decline with evidence and rationale.
- Re-run every downstream artifact touched by a canonical change.
- A declined P0/P1 remains visible in final limitations.
- The same reviewer may verify a mechanical fix; a fresh pass should verify a changed headline conclusion.
- Completion requires zero unresolved P0 and no hidden P1.
