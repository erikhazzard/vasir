---
name: game-research__breaking-down-gameplay-video
description: Called manually to reverse engineer and breakdown gameplay footage
---

# Breaking Down Gameplay Video

## Mission

From gameplay video alone, reconstruct the most faithful implementable baseline of the game visible in the footage:

- the spreadsheet under the game: values, units, formulas, tables, probabilities, rates, thresholds, economies, scaling, and clocks;
- the machine: entities, components, state machines, AI, spawning, combat, progression, camera, UI, scoring, failure, and session flow;
- the feel grammar: control-response timing visible on screen, anticipation, impact, recovery, animation cadence, hit stop, shake, flash, sound, readability, and pressure choreography;
- the run: exact chronology, decisions, state changes, causal forks, failure/success conditions, and coverage boundaries;
- the player model: observed behavior and carefully bounded hypotheses about attention, intent, strategy, and execution;
- the clone contract: a versioned, machine-actionable specification and behavioral fixtures sufficient to build a playable observationally faithful baseline.

The report may also extract preservation rules and improvement opportunities, but **baseline fidelity comes first**. Never improve the game inside the baseline spec. Separate `BASELINE`, `BETTER`, and `NEW` recommendations.

## What “clone from video” means

A passive recording often permits several hidden implementations. Do not pretend otherwise. Produce a complete baseline by separating:

1. **Source truth** — what the footage directly shows or supports.
2. **Candidate original models** — hidden rules compatible with the trace.
3. **Baseline implementation choices** — the minimum-complexity rules chosen to make the clone complete when the original is unidentifiable.
4. **Behavioral fixtures** — observable scenarios the baseline must reproduce within stated tolerances.

A baseline choice is not a claim about the original. It is an explicit implementation decision constrained by the footage. Example: if both `damage = base + 10` and `damage = round(base × 1.333)` fit every observed hit, retain both candidates, choose the simpler rule for the baseline, tag it `BASELINE_CHOICE`, and preserve the alternative.

## Non-negotiable operating laws

1. **Sequence before salience.** Watch the complete run with synchronized audio before detector-driven close reading. Contact sheets and metrics navigate the sequence; they do not replace it.
2. **Observation before explanation.** Record what visibly happened before writing why it happened.
3. **Intervals before isolated frames.** A contextual presentation-time interval is the canonical evidence unit. A frame is a view into that interval.
4. **Measurements carry their method.** Every number needs a unit, coordinate/clock domain, evidence interval, method, uncertainty, observation count, and validity scope.
5. **One trace constrains; it rarely identifies.** Maintain candidate models, contradictions, alternatives, and unknown type. Use internal natural experiments and held-out repetitions before selecting a model.
6. **Negative evidence requires opportunity.** “Never attacks” is meaningful only when valid attack opportunities were observed and counted.
7. **Instruments propose; analysts adjudicate.** Motion, luma, OCR, audio energy, optical flow, and trackers have blind spots. Audit quiet, random, low-salience, and detector-disagreement windows.
8. **Agent agreement is not independent evidence.** Independence comes from different evidence channels, blind passes, deterministic measurements, competing hypotheses, or held-out events—not repeated prose from similar agents.
9. **Visible timing is not input latency.** Nominal 60 fps does not prove 16.7 ms control latency. Claim input-to-output latency only when the input event is visible or synchronized.
10. **Camera motion is not player motion by default.** Infer world/player displacement only after validating the camera model and landmarks.
11. **Player psychology stays hypothetical.** Separate observed behavior, information visible at the time, inferred intent, alternatives, execution quality, decision quality, and outcome.
12. **Fail closed.** A failed extractor, empty array, unsupported camera model, missing audio stream, or timestamp mismatch must produce a typed limitation or hard failure—never a plausible empty artifact.
13. **The evidence graph is canonical.** Report prose, charts, tables, and spec values must be generated from or linked to the same claims. Never manually retype a settled number across surfaces.
14. **Thesis follows evidence.** Do not decide that the death, boss, build, or player mistake is “the story” before acquisition and model review are complete.
15. **Generality comes from adaptation.** Classify camera, time, control, information, and session topology; then activate compatible common and genre-specific modules. Never force one game’s instruments onto another.

Read these references before execution; they are part of the skill, not optional background:

- `references/methodological-foundations.md`
- `references/analysis-modes.md`
- `references/intake-and-observability.md`
- `references/evidence-model.md`
- `references/system-identification.md`
- `references/universal-forensics.md`
- `references/camera-and-space-adapters.md`
- `references/genre-adapters.md`
- `references/instrument-registry.md`
- `references/player-modeling.md`
- `references/rebuild-spec.md`
- `references/report-design.md`
- `references/adversarial-review.md`
- `references/agent-contracts.md`
- `references/validation-and-benchmarking.md`
- `references/scars-and-failure-modes.md`

## Routing and depth

Infer the route from the request; do not make the user choose a menu when their intent is clear.

- **“Break down/analyze/reverse-engineer this game”** → `FULL_RECONSTRUCTION`, the default maximal route.
- **“Give me the systems spreadsheet / clone this”** → `SYSTEMS_RECONSTRUCTION`, with full spec and fixtures; omit only editorial sections unrelated to implementation.
- **“Why does it feel like this?”** → `FEEL_FORENSICS`, but still ground timing and feedback in the common evidence corpus.
- **“How well did I play?”** → `PLAYER_REVIEW`, with decision-time information reconstruction and no unsupported mind-reading.
- **“Compare these”** → `COMPARATIVE`, using adapter-valid measures and explicit normalization; identical code alone does not make measurements comparable.
- **A narrow factual question** → `FOCUSED`, acquire only the evidence required for that answer, but preserve the same epistemic rules.

Broad requests default to maximal reconstruction. Narrow requests stop when the question is answered and all load-bearing claims pass review. See `references/analysis-modes.md`.

## Standard workspace

Create a self-contained workspace. Do not depend on a private prior workspace.

```text
<slug>-breakdown/
  workspace-index.json
  source/
  data/
    source-manifests/
    timeline.json
    observability.json
    corpus/
      index.json
      evidence.jsonl
      observations.jsonl
      events.jsonl
      measurements.jsonl
      claims.jsonl
      models.jsonl
      conflicts.jsonl
      unknowns.jsonl
    annotations/
    measurements/
    reviews/
      acquisition-review.md
      inference-review.md
      reconstruction-review.md
      presentation-review.md
      findings.jsonl
    run-ledger.md
  frames/
    coarse/
    dense/
    random-audit/
  clips/
  assets/
  spec/
    baseline-reconstruction.json
    behavioral-fixtures.json
    coverage.json
    README.md
  design/
    preservation-contract.md
    better.md
    new.md
  report/
    index.html
  logs/
```

Use the schemas in `schemas/`. Use templates in `templates/`. Every generated artifact must record the source hash or the IDs of the corpus objects from which it derives.

# Execution pipeline

## Phase 0 — Resolve intent and initialize

1. Infer the route and output depth from the request.
2. Treat the supplied video files as the complete primary input. Do not browse guides, wikis, source code, or databases unless the user explicitly asks for external corroboration.
3. Initialize the workspace with `scripts/init_workspace.py`, recording the inferred route in `workspace-index.json`.
4. Register every source file by stable ID and SHA-256 hash. Never cite only a filename.
5. If several files form one session, build `data/timeline.json` with source boundaries, known gaps, inferred gaps, and unknown gaps; never silently compress discontinuities.

**Phase output:** workspace index, route, source IDs, and initial timeline.

## Phase 1 — Media integrity and observability

Run `scripts/media_probe.py <video> <manifest> --scan-pts --decode-check` on every source. Inspect:

- duration, start time, dimensions, display orientation, pixel/sample aspect ratio;
- codec, color metadata, nominal and average frame rate, frame timebase, PTS cadence, VFR/CFR evidence, and dropped/discontinuous timestamps;
- audio stream presence, sample rate, channels, and synchronization clues; then use `metrics_video.py` and `audio_features.py` for decoded duplicate evidence and silence/near-silence;
- edits, cuts, overlays, resolution changes, source boundaries, and missing spans.

Classify the recording:

- camera topology: first-person, over-shoulder, center-locked, side-scroll, fixed-room, free/orbit, isometric, RTS/free-map, spectator, cinematic, head-tracked XR, mixed;
- time topology: continuous real-time, paused real-time, turn-based, round-based, wave-based, level-based, edited/discontinuous, mixed;
- control observability: visible input overlay, inferred only, AI-controlled, multiple players, unknown;
- information topology: full state visible, HUD-partial, hidden information, fog of war, offscreen systems, commentary/logs visible;
- session topology: single run, multiple attempts, match, campaign slice, tutorial, highlight reel, montage, stream;
- genre adapters to activate; hybrids may activate several.

Write `data/observability.json` with:

- supported analyses;
- analyses possible only as bounded hypotheses;
- invalid instruments and why;
- source-quality limitations;
- clock and coordinate domains available;
- confidence ceilings caused by the capture.

Do not equate source fps with game tick, simulation rate, display rate, or input latency.

**Phase gate:** stop or downgrade any analysis whose required signal is absent. Missing audio disables semantic sound claims; it does not invalidate visual analysis.

## Phase 2 — Uninterrupted experiential pass

Watch the complete timeline at normal speed with audio before reading detector-selected windows. Do not choose the final thesis yet.

Create a neutral chronology containing:

- acts, rounds, waves, rooms, encounters, menus, pauses, transitions, and source gaps;
- visible player goals and game goals;
- major state changes, upgrades, resource changes, deaths, victories, retries, and results;
- candidate systems and moments that require close reading;
- initial uncertainty, not conclusions.

Use verbs of observation: “health falls,” “the enemy begins an animation,” “the timer stops.” Avoid premature causal prose: “the poison triggered,” “the player panicked,” “the AI decided.”

**Phase output:** `data/run-ledger.md` chronology draft and first-pass observations.

## Phase 3 — Base instruments and unbiased coverage

Run compatible base instruments:

- exact media/PTS probe;
- aspect-preserving per-frame luma, motion, duplicate, and delta-time metrics;
- audio feature envelope when audio exists;
- PTS-manifested coarse frames and contact sheets;
- exact interval clips and dense strips for candidate events.

Then deliberately inspect footage the instruments did not select:

- stratified random windows across every act;
- low-motion windows;
- low-luma-change windows;
- audio events without visual spikes;
- visual spikes without audio events;
- source boundaries and cuts;
- intervals where instruments disagree;
- at least one ordinary interval between every pair of major events.

A detector output is an event proposal, not an observation. Record detector parameters and known false-positive/false-negative classes.

**Phase output:** measurement artifacts, proposal timeline, random-audit evidence, and acquisition coverage map.

## Phase 4 — Adapter plan and specialist evidence acquisition

Build the audit plan from `references/universal-forensics.md`, compatible camera/space adapters, and compatible genre adapters.

### Common lenses for every game

1. Session loop and end conditions.
2. Time, clocks, pause semantics, cadence, and phase changes.
3. Input/action vocabulary and visible control-response grammar.
4. Player/avatar state, resources, movement, collision, and survivability.
5. Camera, coordinate spaces, bounds, scrolling, zoom, and spatial rules.
6. Entities, components, archetypes, lifecycle, spawning, despawning, and drops.
7. AI perception, targeting, navigation, state transitions, priorities, and interrupts.
8. Combat/interaction: hit detection, damage, defense, status, cooldown, recovery, invulnerability, and target selection.
9. Economies: sources, sinks, currencies, inventory, crafting, production, and conversion.
10. Progression: XP, levels, unlocks, upgrade pools, stacking, rarity, scaling, and meta progression visible in the footage.
11. Random processes: observed variation, proc/drop/spawn candidates, and what remains unidentifiable.
12. Difficulty/director: local pressure, density, pacing, phase thresholds, adaptation, and run-specific power race.
13. UI/information design: affordances, state visibility, feedback, warnings, menus, and results.
14. Audiovisual feel: anticipation, impact, recovery, VFX, animation, camera, sound, and readability.
15. Player behavior: choices, positioning, attention proxies, execution, and decision episodes.

Every specialist receives the contract in `references/agent-contracts.md`. First-pass evidence collectors are blind to the emerging thesis and return observations separately from hypotheses. Use independent evidence channels where possible: e.g., ammo OCR vs shot counting; results inventory vs upgrade-pick audit; visible health loss vs known-damage hit count.

Activate adapter-specific modules from `references/genre-adapters.md`. Do not run center-lock world reconstruction on a free RTS camera, infer fighting-game frame advantage without a valid state transition, or use motion salience as the primary selector for a puzzle game.

**Phase output:** structured annotations and evidence records with exact PTS intervals and extraction provenance.

## Phase 5 — Measurements and the systems spreadsheet

Surface the spreadsheet under the game. For every measurable quantity, define the measurand first.

Bad: `speed = 408`.

Good:

```json
{
  "measurand": "player screen-space center displacement while the timer advances and no dash state is visible",
  "estimate": 408,
  "unit": "source_display_px/s",
  "interval": "ev_move_014",
  "method": "landmark-relative least-squares fit over 2.4 s",
  "uncertainty": {"kind": "range", "low": 396, "high": 419},
  "observations": 6,
  "scope": {"character_state": "normal_move", "camera_segment": "translation_valid_03"}
}
```

Rules:

- Preserve source aspect ratio and display orientation.
- Use PTS deltas, not `frame_index / assumed_fps`.
- Distinguish screen, viewport, world, UI, normalized, tile, and physical units.
- Distinguish instantaneous, mean, median, maximum, fitted, and bounded estimates.
- Name the denominator: single-target DPS, total screen throughput, damage per projectile, damage per second of firing, etc.
- Draw uncertainty from sampling, detector error, calibration, model ambiguity, and source cadence.
- Store raw crops/intervals so later decoding can change without recollecting evidence.
- Use stated on-screen values only as `STATED`; corroborate them when possible.
- Decode tiny values through arithmetic and repeated eras before trusting visual reading.
- Fit repeated cycles and distributions; one interval is an example, not a law.
- Count observation opportunities for negative claims.

**Phase output:** measurements, tables, formulas under consideration, and value lineage.

## Phase 6 — System identification and model reconciliation

For every hidden rule that matters to the clone:

1. List direct observations and measurements.
2. Define candidate models.
3. State each model’s predictions for already observed events.
4. Test against all relevant events, reserving held-out repetitions when possible.
5. Record supporting evidence, contradictions, opportunity count, and validity scope.
6. Classify the unresolved state using the unknown taxonomy in `references/evidence-model.md`.
7. Select the original-model status:
   - `VALIDATED_WITHIN_SCOPE`
   - `PROVISIONAL`
   - `CONTRADICTED`
   - `OBSERVATIONALLY_EQUIVALENT`
   - `UNIDENTIFIABLE_FROM_FOOTAGE`
8. If the implementation requires a value/rule and the original remains unresolved, choose a `BASELINE_CHOICE` using the minimum-complexity consistent-model policy in `references/system-identification.md`.

Exploit natural experiments inside the recording:

- the same action at different levels or resource states;
- repeated attacks with different targets;
- reversed upgrade order;
- entering/leaving range during a cooldown;
- pause versus active time;
- repeated waves, laps, rounds, or rooms;
- UI-stated values before and after a change;
- several apparent RNG outcomes;
- player and camera motion against fixed landmarks.

Do not use narrative plausibility to resolve model forks. Do not let several agents repeating one explanation count as validation.

Every conflict remains in the ledger with both reads and the resolution rationale. Corrections are first-class content.

**Phase output:** canonical claims, candidate-model registry, conflict ledger, unknowns, and baseline choices.

## Phase 7 — Build the reconstruction-grade baseline spec

Generate `spec/baseline-reconstruction.json` against `schemas/rebuild-spec.schema.json` and `spec/behavioral-fixtures.json` against `schemas/behavioral-fixtures.schema.json`.

The baseline must define, where relevant:

- game/session identity and exact source scope;
- fidelity target and known extrapolation boundary;
- coordinate spaces and conversion rules;
- clock domains, pause behavior, simulation assumptions, and update order;
- input actions and buffering/cancel semantics visible or chosen;
- entities/components and initial state;
- state machines, transition guards, priorities, interrupts, and recovery;
- formulas, tables, units, rounding, clamping, and stacking order;
- collision, movement, targeting, combat, damage, status, invulnerability, and death;
- economies, inventory, rewards, XP, progression, unlocks, and choices;
- AI, spawn/director behavior, waves, drops, and random processes;
- camera behavior and viewport rules;
- UI state, information, menus, results, warnings, and feedback;
- animation/VFX/audio timing rules needed to reproduce the visible feel;
- scoring, victory, failure, restart, and persistence;
- networking only to the extent visible; do not invent server tick or rollback internals.

Every implementation object carries:

- linked claim IDs and evidence IDs;
- epistemic status;
- scope;
- uncertainty when measured;
- candidate alternatives;
- whether the field is source-supported or a baseline choice;
- rationale for every baseline choice.

The spec must be **complete enough to implement**. No required field may remain blank merely because the original is unknown. Fill it with the smallest internally consistent baseline choice and preserve the uncertainty.

Create behavioral fixtures that test observable outcomes, not hidden implementation trivia. Example:

```json
{
  "id": "fixture_reload_movement_01",
  "purpose": "reproduce visible reload slowdown",
  "setup": {"player_state": "moving", "weapon_ammo": 0},
  "stimulus": [{"at_s": 0.0, "action": "reload"}, {"from_s": 0.0, "to_s": 1.2, "action": "move_right"}],
  "expected": [
    {"metric": "screen_displacement", "value": 312, "unit": "normalized_viewport_milliunits", "tolerance": 18},
    {"event": "reload_complete", "time_s": 1.15, "tolerance_s": 0.07}
  ],
  "evidence_ids": ["ev_reload_007"]
}
```

Each major mechanic must have at least one fixture; high-risk model forks need fixtures that would diverge under the alternatives.

**Phase output:** complete baseline spec, fixtures, coverage file, and spec README.

## Phase 8 — Player model and design grammar

Apply `references/player-modeling.md`.

For each consequential decision episode, record:

- visible game state and information available at that moment;
- observed action and visible response time;
- plausible goal/intent hypotheses;
- alternative explanations;
- decision quality given the information then;
- execution quality;
- resulting outcome;
- confidence and evidence.

Use “behavior is consistent with…” rather than “the player felt/knew/wanted…” unless the video itself contains contemporaneous speech that supports it. A pause may be deliberation, interruption, confusion, or inactivity; investigate before interpreting. A failed choice may have been rational; a successful choice may have been poor.

Extract the design grammar separately:

- repeated tension/release patterns;
- risk/reward cadence;
- information-to-action loop;
- power and threat choreography;
- skill expression;
- feedback hierarchy;
- what the baseline must preserve to remain recognizably the same game.

Write `design/preservation-contract.md`. Put proposed improvements in `design/better.md` and genuinely divergent concepts in `design/new.md`.

## Phase 9 — Write the evidence-cited report

Build `report/index.html` from the canonical corpus and spec; do not independently re-enter values. Choose the editorial thesis only now.

The report is modular, but a maximal report normally includes:

1. Executive reconstruction: what game this is in systems terms.
2. Source/method/coverage and epistemic legend.
3. Chronological run anatomy.
4. Core loop and session state machine.
5. Systems spreadsheet: constants, formulas, tables, rates, and economies.
6. Entities, AI, combat/interaction, and progression.
7. Camera, space, movement, and control grammar.
8. Audiovisual feel grammar with interval strips/clips.
9. Difficulty/director and run-specific power/threat curves.
10. Player decision review, bounded to visible evidence.
11. Reconstruction contract: proven behavior, candidate models, and baseline choices.
12. Behavioral fixture summary and fidelity boundary.
13. Conflicts, corrections, single observations, and unknowns.
14. Preservation contract.
15. `BASELINE → BETTER → NEW` conclusions.

Use the ending as the cold open only when the evidence shows it is the best explanatory spine. A clean victory, tutorial revelation, economy collapse, build transition, or repeated loop may be the real thesis.

Every load-bearing claim links to evidence. Every measured chart shows units, assumptions, scope, and uncertainty. Every single observation carries “observed once.” See `references/report-design.md`.

## Phase 10 — Four adversarial gates

Use fresh context and `references/adversarial-review.md`.

1. **Acquisition adversary** — What did sampling, detectors, crops, silence, or adapter choice miss? Inspect omitted and low-salience windows.
2. **Inference adversary** — What alternative models fit? Which claims exceed opportunity count, scope, timing precision, or evidence independence?
3. **Reconstruction adversary** — Can a developer implement the spec without inventing semantics? Are units, clocks, update order, RNG, rounding, and fixtures complete and mutually consistent?
4. **Presentation adversary** — Do report, charts, tables, spec, and ledger derive from the same claims? Are citations resolvable and charts legible at reading size?

Classify findings `P0`, `P1`, or `P2`. Fix every `P0` and `P1` or record a reasoned decline that is visible in the final review log. Never “resolve” an evidence conflict by deleting it.

## Phase 11 — Validation and stop condition

Run `scripts/validate_delivery.py <workspace> --verify-hashes` and render-check the report. During skill development, also run `scripts/validate_package.py` and `python -m pytest -q`.

Do not finish until all are true:

- every source and evidence reference resolves;
- every interval lies inside its source timeline;
- every numeric claim has a unit, method, uncertainty/bound, observation count, and scope;
- every global negative claim has an opportunity count;
- every hidden mechanic has a candidate model or typed unknown;
- every implementation-required unknown has an explicit baseline choice;
- every major mechanic has a behavioral fixture;
- no tool failure produced a normal-looking artifact;
- no timing claim is based only on nominal fps;
- no camera/world claim exceeds the validated camera model;
- no player-state claim is presented as direct fact;
- no report/spec/table value drifts from its canonical claim;
- all JSON validates against schema;
- no unresolved `P0` or `P1` remains;
- charts and evidence strips have been visually inspected at their actual reading size.

Stop when the user’s requested route is satisfied and these gates pass. Do not add analysis merely to spend tokens.

# Canonical epistemic model

Do not encode epistemology in one overloaded chip. Keep these axes separate:

- **Object kind:** observation, measurement, claim, model, design interpretation, player hypothesis, baseline choice.
- **Source kind:** footage, visible UI statement, embedded speech, deterministic instrument, analyst derivation, external source if explicitly enabled.
- **Validation:** untested, supported, contradicted, validated-within-scope, observationally-equivalent, unidentifiable.
- **Uncertainty:** measurement, sampling, model, source/capture, or bounded unknown.
- **Scope:** source version, mode, actor, state, interval, camera segment, difficulty, build, and observed value range.
- **Resolution:** settled for source claim, provisional, open, or filled for baseline implementation.

Compact example:

```json
{
  "schema_version": "1.0.0",
  "id": "claim_damage_stack_004",
  "kind": "MECHANIC_CLAIM",
  "statement": "The observed upgrade changes displayed hit damage from 30 to 40 before any visible critical modifier.",
  "source_kinds": ["FOOTAGE", "DETERMINISTIC_INSTRUMENT", "ANALYST_DERIVATION"],
  "evidence_ids": ["ev_damage_011", "ev_damage_019"],
  "measurement_ids": ["measure_damage_004"],
  "validation": "OBSERVATIONALLY_EQUIVALENT",
  "resolution": "BASELINE_FILLED",
  "uncertainty": {
    "kind": "MODEL",
    "low": null,
    "high": null,
    "plus_minus": null,
    "confidence_level": null,
    "basis": "Flat +10 and rounded ×1.333 reproduce every observed hit.",
    "distribution": null
  },
  "scope": {"weapon": "starter_pistol", "observed_base_damage": [30, 40]},
  "alternatives": ["flat +10 before crit", "round(base × 1.333) before crit"],
  "conflicts": [],
  "opportunity_record": null,
  "reconstruction": {
    "status": "BASELINE_CHOICE",
    "chosen_model_id": "model_damage_flat_001",
    "rationale": "The flat rule is the minimum-complexity model reproducing all observed eras."
  },
  "supersedes": null
}
```

# Failure scars: bad default → replacement

| Bad default | Replacement |
|---|---|
| Contact sheets equal a full viewing | Watch the uninterrupted run first; use sheets as an index. |
| Detector salience equals analytical importance | Add random, quiet, audio-only, and disagreement audits. |
| 60 fps means 16.7 ms input latency | Use PTS for visible state timing; require visible/synchronized input for latency. |
| Frame index divided by a hard-coded fps | Persist exact source PTS and timebase. |
| Resize every source to a fixed width and height | Preserve display aspect ratio and record transforms. |
| A tool writes zero rows after failure | Fail closed or emit a typed unavailable result with reason. |
| Background flow equals player movement | Estimate screen transform first; interpret as player/world only after camera validation. |
| Dwell time means deliberation | Rule out pause, interruption, UI blockage, inactivity, and offscreen distraction first. |
| Tiny glyphs can be read by eye | Keep raw crops; anchor with visible values and arithmetic; use temporal tracking. |
| A static color/shape filter identifies floating numbers | Require temporal lifecycle, motion pattern, geometry classes, and false-positive audit. |
| One clean read settles a formula | Settle only the candidate fork it distinguishes; retain other possible models. |
| One observation becomes a standing rule | Mark “observed once,” count opportunities, and limit scope. |
| “Never happened” proves impossibility | Count valid opportunities and detector coverage. |
| Several agents agree, therefore verified | Seek heterogeneous evidence and blind/held-out checks. |
| Strongest interpretation becomes headline fact | Preserve candidate models and reveal conflict at the point of use. |
| Outcome proves decision quality | Judge from information available when the decision was made. |
| Player agreement makes an inference true | Treat testimony or embedded speech as a separate source. |
| Same instrument makes two games comparable | Normalize units and confirm construct equivalence per adapter. |
| Machine-readable JSON is clone-ready | Define units, clocks, state transitions, update order, randomness, rounding, and fixtures. |
| Choose the report thesis before analysis | Stabilize evidence and models first. |
| Uncertainty means leave the spec blank | Fill required fields with explicit minimal baseline choices. |
| Public polish proves rigor | Validate source lineage, models, and fixtures before editorial finish. |

# Output contract

A `FULL_RECONSTRUCTION` result contains:

- `report/index.html` and `assets/` — self-contained evidence-cited report;
- `data/source-manifests/*.json`, `timeline.json`, `observability.json`;
- canonical corpus JSONL files and `data/run-ledger.md`;
- structured annotations and measurements;
- acquisition, inference, reconstruction, and presentation reviews plus resolution logs;
- `spec/baseline-reconstruction.json` — complete implementation contract;
- `spec/behavioral-fixtures.json` — executable observable acceptance tests;
- `spec/coverage.json` and `spec/README.md` — fidelity and extrapolation boundary;
- `design/preservation-contract.md`, `design/better.md`, and `design/new.md`.

A focused route may omit unrelated report modules, but it never relaxes evidence integrity for the claims it does make.

# Quality bar

An S-tier result is not the one with the most confident prose. It is the one from which:

- another analyst can reproduce every measurement;
- a developer can implement the baseline without silently inventing missing semantics;
- a reviewer can see exactly where the footage stops answering;
- the report remains compelling without converting hypotheses into facts;
- the clone reproduces the observed event traces, timing, systems, and feel within declared tolerances;
- every improvement proposal clearly preserves or intentionally breaks the baseline contract.
