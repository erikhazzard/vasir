---
name: game-research__breaking-down-gameplay-video
description: Manually invoked to turn supplied gameplay footage into evidence-cited analysis and, when explicitly requested, an observationally faithful reconstruction spec; not for release QA, design critique without footage, or standalone visualization work.
---

# Breaking Down Gameplay Video

Use supplied footage to explain what the game visibly does, what hidden models remain compatible with the trace, and where the recording stops answering. Produce reconstruction guidance only when the user explicitly asks for a clone, rebuild, reverse engineering, systems specification, or fixtures.

**Place in the system.** This skill owns footage-grounded claims. `$game__qa` owns release QA on a runnable build. `$game-design__ensuring-design-coherence` owns conceptual critique without footage. `$design__visualizing-data` may improve presentation only after the claims and measurements settle.

## Core principle

Treat footage as constrained evidence, not permission to invent the unseen game. Fit everything observed; among models that fit, prefer the one making the fewest unsupported commitments. A runnable default chosen for a requested reconstruction is a baseline choice, never a claim about the original.

## Route the request

Infer scope from the request rather than making the user choose a menu.

- A broad “break down” or “analyze this footage” request defaults to an evidence-cited forensic report.
- A narrow factual question gets only the evidence needed to answer it.
- “Why does it feel like this?” focuses on visible control, camera, animation, VFX, and audio timing.
- “How well did I play?” reconstructs decision-time information and separates choice, execution, and outcome.
- A comparison uses compatible measurands and explicit normalization; incomparable dimensions remain incomparable.
- An explicit clone, rebuild, reverse-engineering, systems-spreadsheet, spec, or fixture request adds a reconstruction deliverable.

Reconstruction, coaching, preservation, comparison, critique, and redesign each require their own request evidence. Do not infer a future implementation project from a generic analysis request. Stop when the requested question is answered and the load-bearing claims are supportable.

## Evidence laws

1. **Relevant sequence before salience.** Watch the complete relevant run with synchronized audio before using detector-selected windows for whole-run, causal, comparative, or negative claims. For a focused question, inspect enough lead-in and aftermath to establish state and consequence.
2. **Observation before explanation.** Write “health falls from 42 to 31” before “poison deals 11 damage.”
3. **Intervals before isolated frames.** Cite contextual presentation-time intervals. A still illustrates an interval; it rarely proves temporal behavior alone.
4. **PTS before nominal frame rate.** Use source presentation timestamps. Do not derive time from `frame_index / assumed_fps`.
5. **Measurements carry their method.** Every number names the measurand, unit, clock or coordinate domain, interval, method, uncertainty or bound, observation count, and validity scope.
6. **One trace constrains; it rarely identifies.** Preserve alternative models, contradictions, and typed unknowns. Use repeated events, natural experiments, and held-out repetitions when the supplied footage contains them.
7. **Fewest unsupported commitments.** Semantic restraint beats short formulas. Keep unresolved dimensions unresolved unless a requested implementation needs an explicit baseline choice.
8. **Negative evidence requires opportunity.** “Never attacks” is meaningful only after defining valid attack opportunities and counting them.
9. **Instruments propose; analysts adjudicate.** Motion, luma, audio energy, OCR, and trackers have blind spots. Audit quiet, random, low-salience, and detector-disagreement windows.
10. **Camera motion is not actor motion.** Validate landmarks and the camera model before inferring world or player displacement.
11. **Visible response is not input latency.** Claim input-to-output latency only when input events are visible or synchronized.
12. **Player psychology stays hypothetical.** Separate visible behavior, information available at the time, inferred intent, alternatives, execution quality, decision quality, and outcome.
13. **Tool outcomes stay honest.** Missing signal is `UNAVAILABLE`, an incompatible method is `INVALID_FOR_TOPOLOGY`, and execution/integrity failure is `FAILED`. None may look like successful empty evidence.
14. **Thesis follows evidence.** Do not decide what the story is before acquisition and model review stabilize.
15. **Capability precedes adaptation.** Classify camera, time, control, information, and session topology before selecting instruments or genre lenses.

## Keep one evidence ledger

Use a simple human-readable ledger for substantive work. Start from `templates/evidence-ledger.md`; do not create a database, schema registry, or mandatory JSONL corpus.

Each load-bearing entry records:

- a stable local ID;
- source filename or source ID and exact PTS interval;
- neutral observation;
- measurement and method when applicable;
- interpretation or candidate model;
- alternatives, contradictions, or unknown type;
- uncertainty, observation count, and scope.

For durable or multi-file work, also record source hashes and preserve unknown gaps between files. For a focused answer, filename plus exact PTS may be sufficient. Corrections visibly supersede earlier claims; do not silently change a value in one surface while leaving another copy behind.

Use this reader-facing citation shape:

`[E14 · source_01 · 03:14.220–03:14.487 · audio+video]`

## Use deterministic media tools where they earn their cost

The scripts are navigation and measurement aids, not a replacement for viewing or judgment.

| Script | Use |
|---|---|
| `media_probe.py` | Inspect streams, display geometry, source hashes, decode integrity, and exact frame PTS. |
| `compose_timeline.py` | Relate multiple source files without hiding known, inferred, or unknown gaps. |
| `extract_frames.py` | Extract aspect-preserving frames with source PTS. |
| `contact_sheets.py` | Build navigational sheets from a PTS-bearing frame manifest. |
| `film_strip.py` | Inspect a dense interval and retain extraction timing error. |
| `metrics_video.py` | Measure per-frame luma, motion, duplicates, and PTS deltas. |
| `audio_features.py` | Measure audio availability and low-level energy/onset features; never infer semantic sound classes by itself. |

Read `references/instrument-registry.md` before using a tool outside its stated capability. FFmpeg and FFprobe are external prerequisites. Script JSON/NPZ outputs are tool provenance, not a public analysis schema.

## Workflow

### 1. Resolve intent and capture limits

- Infer the requested scope.
- Treat supplied footage as the primary input. Do not browse guides, source code, wikis, or databases unless the user requests outside corroboration.
- Identify source boundaries, edits, missing spans, audio presence, display geometry, cadence, and control visibility.
- Classify camera, time, information, control, and session topology.
- State which questions the capture can answer, which remain hypotheses, and which are unavailable.

Read `references/intake-and-observability.md` when the capture is multi-file, edited, unusual, or materially limits observability.

### 2. Watch the relevant sequence

Build a neutral chronology of acts, rounds, rooms, encounters, menus, pauses, state changes, upgrades, deaths, victories, retries, and source gaps. Use observation verbs. Do not choose the final thesis yet.

For a run-spanning analysis, use `templates/run-ledger-template.md`. A focused question does not require a full-run ledger unless its answer depends on one.

### 3. Acquire targeted and unbiased evidence

- Use coarse frames or metrics to navigate.
- Extract dense clips or strips around candidate events.
- Inspect ordinary, quiet, random, audio-only, visual-only, boundary, and detector-disagreement intervals.
- Record detector parameters and likely false-positive/false-negative classes.
- Activate only supported questions from `references/universal-forensics.md`, `references/camera-and-space-adapters.md`, and compatible sections of `references/genre-adapters.md`.

If specialists materially improve coverage, assign only the necessary lenses with `templates/agent-assignment-template.md`. Keep first-pass observers blind to the emerging thesis and cross-check with different error mechanisms, not several agents reading the same contact sheet.

### 4. Measure defined quantities

Define the measurand before calculating.

| Measurand | Estimate | Unit | Evidence | Method | n | Uncertainty | Scope |
|---|---:|---|---|---|---:|---|---|
| Player screen-space center displacement while the game clock advances and no dash is visible | 408 | source-display px/s | E14–E19 | Landmark-relative least-squares fit over 2.4 s | 6 | 396–419 | Normal move, camera segment C3 |

Preserve source aspect and orientation. Distinguish screen, viewport, world, UI, normalized, tile, and physical units. Name denominators and aggregation. Separate displayed values from hidden simulation values. Mark single observations as `n=1`.

### 5. Reconcile candidate models

For each hidden rule that matters:

1. Freeze direct observations and measurements.
2. Enumerate materially distinct models.
3. Derive their predictions for observed events.
4. Search the supplied footage for conditions on which the models diverge.
5. Record support, contradiction, opportunity count, and scope.
6. Classify the result as supported within scope, contradicted, observationally equivalent, or unidentifiable.

Read `references/system-identification.md` and `references/evidence-model.md`. Do not use genre plausibility, prose consensus, or shortest description to settle a fork.

### 6. Write the requested analysis

Default to a clear Markdown report using `templates/report-outline.md`. Produce HTML or a richer interactive presentation only when requested or materially useful.

- Every load-bearing claim cites an interval.
- Every chart or table names units, assumptions, uncertainty, and scope.
- Conflicts and corrections appear where they affect the reader.
- “Observed once,” alternative models, and capture limits remain visible.
- Player and design interpretations use calibrated language such as “behavior is consistent with.”

Read `references/report-design.md` for a substantive report and `references/player-modeling.md` for player review or coaching.

### 7. Add reconstruction only when requested

Use `templates/reconstruction-spec.md` and `references/rebuild-spec.md`. Choose the output format that the user or consuming repository actually needs; Markdown is the default when no machine consumer exists.

Separate:

1. source-supported behavior;
2. candidate original models;
3. explicit baseline implementation choices;
4. observable fixtures and tolerances.

Define relevant clocks, coordinate systems, update ordering, units, rounding, stacking, state transitions, RNG policy, entity lifecycle, UI/feedback behavior, and coverage limits. A required unknown may receive the least-committing internally consistent runnable choice, but the alternative and extrapolation risk remain visible.

Fixtures reproduce source-backed observable scenarios. They do not test hidden implementation trivia or retroactively prove the selected model was original.

Preservation rules, `BETTER` recommendations, and `NEW` concepts remain absent unless explicitly requested.

### 8. Review proportionately and stop

Use the applicable attacks in `references/adversarial-review.md`:

- acquisition and inference for substantive claims;
- reconstruction when a spec or fixtures are delivered;
- presentation when a report or visualization is delivered.

A focused answer may self-review without creating review artifacts. For a substantive delivery, fix material acquisition/inference errors or disclose them clearly. Do not build ceremony merely to report that a gate ran.

Stop when:

- the requested question or artifact is complete;
- every load-bearing claim resolves to a source interval;
- numbers carry method, unit, uncertainty or bound, count, and scope;
- negative claims carry opportunity conditions and counts;
- hidden mechanics retain alternatives or a typed unknown;
- requested reconstruction choices are explicit and observable fixtures cover major mechanics;
- no tool failure or missing signal appears as successful evidence;
- camera, timing, player-state, and comparative claims remain within validated boundaries.

## Failure scars

| Bad default | Replacement |
|---|---|
| Contact sheets equal a full viewing | Watch the relevant sequence; use sheets as an index. |
| Detector salience equals importance | Add quiet, random, audio-only, and disagreement audits. |
| `frame / 60` equals time | Use exact source PTS. |
| 60 fps proves 16.7 ms input latency | Report visible state timing unless input is synchronized. |
| Background flow equals player motion | Validate camera/landmark behavior first. |
| One value settles a formula | Preserve candidate models and seek a discriminating event. |
| No observed event means impossible | Define and count valid opportunities. |
| Several agents agree, therefore verified | Seek heterogeneous evidence and held-out checks. |
| Outcome proves decision quality | Evaluate information, choice, execution, and outcome separately. |
| A machine-readable object is implementation-ready | Define semantics, ordering, units, uncertainty, and observable fixtures. |
| Uncertainty means invent more structure | Keep the unknown open; add a baseline choice only when implementation requires it. |

## References

- `references/intake-and-observability.md` — read for source integrity, gaps, topology, and capability limits.
- `references/evidence-model.md` — read for observation/measurement/model separation, uncertainty, unknowns, and negative evidence.
- `references/instrument-registry.md` — read before using bundled media tools or interpreting their outputs.
- `references/system-identification.md` — read for hidden-rule inference, natural experiments, and least-committing model selection.
- `references/camera-and-space-adapters.md` — read before camera, world-space, motion, projection, or XR claims.
- `references/universal-forensics.md` — read for broad system coverage; select only relevant sections.
- `references/genre-adapters.md` — read only for the compatible genre/topology sections.
- `references/player-modeling.md` — read for player review, coaching, decision quality, or interruption analysis.
- `references/rebuild-spec.md` — read only for an explicitly requested reconstruction.
- `references/report-design.md` — read for a substantive evidence-cited report.
- `references/adversarial-review.md` — read for the review surfaces applicable to the requested output.
- `references/validation-and-benchmarking.md` — read when validating retained media tools or an implemented reconstruction.

## Quality bar

The best result is not the most exhaustive or confident. It lets another analyst reproduce the important measurements, shows a developer exactly which reconstruction choices are evidentiary versus selected, makes the footage’s limits obvious, and remains useful without hardening hypotheses into facts.
