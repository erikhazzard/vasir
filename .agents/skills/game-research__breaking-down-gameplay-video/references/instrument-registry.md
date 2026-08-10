# Instrument registry: capability, provenance, and refusal rules

An instrument is a measurement proposal with declared preconditions—not an oracle. Every run records tool version, command, parameters, source hash, transforms, output units, quality metrics, and known blind spots.

## Instrument manifest contract

Each instrument declares:

- `measures` — exact measurand;
- `requires` — source/topology preconditions;
- `invalid_when` — conditions that break interpretation;
- `output` — units, clock/coordinate domain, and artifacts;
- `quality` — confidence/signal metrics;
- `false_positives` and `false_negatives`;
- `failure_behavior` — hard failure or typed unavailable result;
- `validation` — calibration or sanity checks before claims may use it.

## Base instruments

### `media_probe.py`

**Measures:** source identity, stream structure, cadence, PTS deltas, orientation, audio availability, and capture limitations.

**Always run.** Use `--scan-pts` for reconstruction-grade work.

**Validation:** source SHA-256 matches every downstream manifest; scanned PTS are monotonic within declared discontinuities; duration and frame count are plausible.

**Refuse:** unreadable or absent source. Do not create a zero-duration manifest.

### `compose_timeline.py`

**Measures:** mapping from multiple source PTS domains into session segments and explicit gaps.

**Requires:** source manifests in intended order. Creation timestamps may support gap inference but never override visible contradictions.

**Output:** `timeline.json` with `KNOWN`, `INFERRED`, `UNKNOWN`, or `NOT_SAME_SESSION` gaps.

### `extract_frames.py`

**Measures:** none; creates navigational/evidence artifacts with exact sampled output PTS.

**Requires:** valid video source and ffmpeg `showinfo` timestamps.

**Output:** images plus manifest containing actual PTS, source ID/hash, filter graph, scale transform, and checksum.

**Rule:** JPG is acceptable for coarse navigation; use PNG for glyph/value/geometry evidence.

### `contact_sheets.py`

**Measures:** none; visual index only.

**Requires:** a frame manifest. Never infer time from filename order or `seconds_per_frame`.

**Invalid use:** calling the sheets a complete sequence analysis.

### `film_strip.py`

**Measures:** visible state sequence at selected actual source frames.

**Requires:** source frame PTS enumeration inside the requested interval.

**Output:** strip plus sidecar containing target and selected PTS, offsets, checksums, and commands.

**Rule:** labels reflect actual source PTS, not a hard-coded frame rate.

### `metrics_video.py`

**Measures:** per-frame mean luma, raw motion energy, motion normalized by elapsed PTS, duplicate evidence, and PTS delta.

**Requires:** decodable video frames and matching PTS enumeration.

**Output:** NPZ plus metadata sidecar; aspect ratio preserved.

**Useful for:** candidate pauses/freezes, cuts, flashes, shake, duplicate/cadence anomalies, and audit sampling.

**Not evidence by itself for:** deliberation, hit stop, performance hitch, game pause, damage, or importance.

**Validation:** decoded frame count equals PTS count; otherwise fail closed. Review known pause and active windows.

### `audio_features.py`

**Measures:** RMS, peak, zero-crossing, spectral centroid, and spectral flux on a PTS-like sample-time grid.

**Requires:** an audio stream.

**Output:** typed `AVAILABLE`, `NEAR_SILENT`, or `UNAVAILABLE`; NPZ plus metadata.

**Useful for:** event proposals, impact/stinger cadence, silence transitions, and audio-only audit windows.

**Not evidence by itself for:** semantic sound identity, quality, source, or player perception. Listen to the interval.

## Camera and spatial instruments

### `track_camera.py`

**Measures:** inter-frame screen-space global affine transform—translation, rotation, scale, residual, and inlier ratio—over sampled PTS.

**Requires:** enough stable visual features and a transform approximated by one global affine motion within the analysis mask.

**Invalid when:** cuts, zoom discontinuities, heavy parallax, dominant independent motion, repeating texture, full-screen VFX, motion blur, or insufficient features.

**Output:** transform segments in source-display pixel units. Low-quality pairs are invalid and never integrated through.

**Critical rule:** the script does not call the transform player movement. `--interpret-center-lock` may derive a provisional player path only after the analyst has separately validated fixed zoom, player center lock, static landmarks, and opposite background/player displacement. The output records that interpretation as an assumption.

**Validation:** pause/static windows near zero; landmark re-sighting; transform residual; rotation/scale thresholds; independent wall/transit arithmetic.

### Landmark/world registration

Use manual or learned landmarks when the world matters. Record:

- landmark identity and repeatability;
- source coordinates and uncertainty;
- camera segment;
- parallax layer;
- transformation model;
- loop-closure error.

Repeating decor can produce false loop closure. Preserve disagreement between global-flow and landmark estimates.

### Object/entity tracking

Track only after archetype identification and occlusion rules are defined. Store raw detections and track association separately. A track gap is not a despawn unless the entity’s visibility opportunity supports it.

## Value and UI instruments

### OCR and UI extraction

Use high-resolution source crops; record language, font class, preprocessing, and raw crop. UI text is `VISIBLE_UI_STATEMENT`, not automatic mechanic truth.

Never apply one global OCR threshold to:

- multiple font sizes;
- outlined and filled text;
- animated/blurred text;
- icons resembling glyphs;
- compression-distorted tiny values.

### Floating-value mining

Pipeline:

1. discover real glyph geometry from known instances;
2. retain raw aspect-preserved crops;
3. detect candidate components across multiple size/stroke classes;
4. group into rows;
5. track temporally;
6. require lifecycle/motion behavior appropriate to the game—e.g. short-lived, rising, x-stable numbers;
7. audit enemy sprites, eyes, pips, particles, and UI as false positives;
8. decode using UI anchors, arithmetic era predictions, and repeated clean reads;
9. attach each decoded value to a track and source interval.

One pixel read can distinguish a specific model fork; it cannot prove no other model exists.

### HUD time series

For health, ammo, mana, currency, score, clocks, and bars:

- define ROI per calibrated segment;
- distinguish value OCR from bar geometry;
- retain transition frames;
- model animation/lag between internal-looking state and display;
- reconcile against independent events.

## Temporal and feel instruments

### Visible timing

Use actual PTS for:

- animation startup/contact/recovery bounds;
- hit stop/freeze candidate duration;
- flash/shake/feedback duration;
- attack/reload/cooldown cadence;
- audio-visual offset;
- state-transition intervals.

Report source-frame granularity and state-visibility ambiguity. Do not call a visible delay “input latency” without synchronized input.

### Hit stop and freeze

A motion dip may be:

- intentional hit stop;
- pause/menu freeze;
- repeated encoded frames;
- low-motion composition;
- capture/game performance hitch;
- scene hold.

Require event alignment, local entity/background behavior, timer behavior, audio continuity, and repeated examples.

### Camera shake and flash

Measure transform/luma envelope, onset, peak, decay, spatial extent, and channel overlap. Separate global camera transform from sprite displacement and full-screen overlay.

### Audio-visual grammar

For each action, align:

- anticipation pose/sound;
- action release;
- contact/impact;
- state change;
- hit stop;
- flash/VFX;
- shake;
- damage/UI confirmation;
- recovery.

This channel decomposition explains feel more reliably than adjectives alone.

## Behavior/state instruments

### State-machine mining

Build event sequences from observations; infer recurring states and transitions only when they improve prediction. Preserve:

- event order;
- duration distributions;
- guards;
- interrupts;
- pause semantics;
- opportunity counts;
- unobserved exits.

A frequent sequence is not a universal protocol. Validate on held-out instances.

### AI behavior fitting

Possible models include pursuit, separation, alignment, orbit, flee, range bands, target priority, line-of-sight, scripted phases, and utility/state-machine selection. Use repeated trajectories and context, not one path. Explicitly model camera transform before screen-space AI conclusions.

### Event-rate models

Event counts may proxy kills, shots, actions, or spawns only after precision/recall calibration. If normalized to a known total, propagate normalization uncertainty. Label modeled rates, not measured ground truth.

## Universal audit sampling

Instrument-selected events must be supplemented by:

- uniform random windows;
- stratified windows per act/round/phase;
- low-salience windows;
- detector disagreement windows;
- source-boundary windows;
- manually chosen ordinary gameplay;
- windows where the emerging model predicts an event that did not occur.

## Instrument result states

Every instrument ends as one of:

- `VALID` — preconditions and validation pass;
- `VALID_WITH_LIMITATIONS` — output usable within recorded scope;
- `UNAVAILABLE` — signal absent;
- `INVALID_FOR_TOPOLOGY` — model does not apply;
- `FAILED` — execution or integrity failure;
- `REJECTED_AFTER_VALIDATION` — output ran but failed sanity checks.

Only the first two may support claims.
