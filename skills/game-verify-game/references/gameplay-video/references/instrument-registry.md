# Media tools and refusal rules

An instrument proposes a measurement under declared preconditions; it is not an oracle. Record the command, parameters, source, transforms, units, quality checks, and known blind spots whenever its output supports a claim.

For any tool, ask:

- What exact measurand does it produce?
- Which capture/topology preconditions must hold?
- What makes the interpretation invalid?
- Which clock or coordinate domain does the output use?
- What sanity check must pass before the output supports a claim?
- Does failure return an error or an honest unavailable state?

## Bundled tools

### `media_probe.py`

**Measures:** source identity, stream structure, display geometry, cadence, PTS deltas, audio availability, and decode integrity.

Use `--scan-pts` whenever timing matters and `--decode-check` for a durable reconstruction. Confirm monotonic PTS within declared discontinuities and plausible duration/frame count. Unreadable or absent sources must not create a normal-looking manifest.

### `compose_timeline.py`

**Measures:** relationships among multiple source PTS domains and explicit gaps.

Provide source manifests in intended order. Creation timestamps may support an inferred gap but never override visible contradictions. Preserve `KNOWN`, `INFERRED`, `UNKNOWN`, and `NOT_SAME_SESSION` rather than silently compressing time.

### `extract_frames.py`

**Measures:** no gameplay property; creates navigational/evidence images with actual source PTS.

Require a decodable source and FFmpeg `showinfo` timestamps. Preserve display aspect ratio. JPEG is acceptable for coarse navigation; use PNG for glyph, value, or geometry evidence.

### `contact_sheets.py`

**Measures:** no gameplay property; creates a visual index from a frame manifest.

Never infer time from filename order or treat the sheet as complete sequence analysis.

### `film_strip.py`

**Measures:** visible state sequence at selected actual source frames.

Retain target, selected, and extracted PTS and timing error for every cell. Labels use actual source PTS, never a hard-coded frame rate.

### `metrics_video.py`

**Measures:** per-frame mean luma, raw motion energy, motion normalized by elapsed PTS, duplicate evidence, and PTS delta.

Useful for candidate cuts, pauses/freezes, flashes, shake, cadence anomalies, and audit sampling. It does not by itself prove deliberation, hit stop, game pause, performance hitch, damage, or importance.

Decoded-frame and PTS counts must agree. A mismatch is `FAILED`, not a partial measurement.

### `audio_features.py`

**Measures:** RMS, peak, zero-crossing, spectral centroid, and spectral flux on a sample-time grid.

Useful for event proposals, impact/stinger cadence, silence transitions, and audio-only audit windows. It does not identify semantic sound class, quality, source, or player perception. Listen to the interval.

No audio stream is `UNAVAILABLE`, not an empty successful semantic analysis.

## Analyst methods that are not bundled universal tools

These methods may be useful, but the package does not claim a generally validated implementation for them.

### Camera and landmark analysis

Estimate camera/world relationships only after identifying stable landmarks and a topology-compatible transform. Record:

- landmark identity and repeatability;
- source coordinates and uncertainty;
- camera segment and parallax layer;
- transformation model and residual;
- invalid windows such as cuts, zoom discontinuities, dominant independent motion, repeating texture, full-screen VFX, or motion blur.

Background translation is not player movement. Read `camera-and-space-adapters.md` before making a world-space claim.

### OCR and UI values

Use source-resolution crops and record language, font class, preprocessing, and raw evidence. UI text is a visible statement, not automatic mechanic truth.

Avoid one global threshold across font sizes, outlines, blur, animation, icon-like glyphs, and compression-distorted values. Cross-check tiny values through repeated clean instances, temporal lifecycle, and arithmetic. State when the source is unreadable.

### Visible timing and feel

Use actual PTS for animation startup/contact/recovery bounds, hit-stop candidates, flash/shake duration, attack/reload cadence, audio-visual offset, and state transitions.

A motion dip may be intentional hit stop, pause, repeated encoded frames, low-motion composition, a performance hitch, or a scene hold. Compare event alignment, local versus background behavior, clocks, audio continuity, and repeated examples.

### State and event inference

Build event sequences from observations; infer recurring states only when they improve prediction. Preserve event order, duration distributions, guards, interrupts, pause semantics, opportunities, and unobserved exits. A frequent sequence is not a universal protocol.

Event counts may proxy kills, shots, actions, or spawns only after precision/recall is understood. Label modeled rates rather than measured ground truth.

## Audit sampling

Instrument-selected events must be supplemented as applicable by:

- uniform or stratified windows across the relevant sequence;
- low-salience windows;
- audio events without visual spikes and visual spikes without audio events;
- detector-disagreement windows;
- source boundaries and cuts;
- ordinary gameplay;
- windows where the emerging model predicts an event that does not occur.

## Result states

- `VALID` — preconditions and sanity checks pass.
- `VALID_WITH_LIMITATIONS` — usable only within recorded limits.
- `UNAVAILABLE` — required signal is absent.
- `INVALID_FOR_TOPOLOGY` — method does not apply to this capture.
- `FAILED` — execution or integrity failure.
- `REJECTED_AFTER_VALIDATION` — output was produced but failed a sanity check.

Only `VALID` and `VALID_WITH_LIMITATIONS` may support claims.
