# Intake, timeline, and observability

The video is the complete primary input. Intake extracts constraints from the media rather than asking the user to supply game metadata that the footage can reveal or leave unknown.

## Source manifest

For each source, record:

- stable source ID and SHA-256;
- path used during analysis;
- duration, start time, creation metadata if present;
- coded and display width/height, rotation, sample/pixel aspect ratio;
- codec, pixel format, bit depth, color metadata;
- `avg_frame_rate`, `r_frame_rate`, stream `time_base`, frame count if reliable;
- scanned PTS count, delta distribution, cadence classification, discontinuities, and duplicate evidence;
- audio streams, codecs, channels, sample rates, duration, silence status;
- subtitles/data streams and overlays visible in the image;
- probe command and tool versions.

A nominal frame rate is metadata, not a timing guarantee. Use presentation timestamps for temporal claims.

## Timeline composition

`data/timeline.json` maps session time to source PTS:

```json
{
  "segments": [
    {
      "source_id": "source_001",
      "source_start_s": 0.0,
      "source_end_s": 612.41,
      "session_start_s": 0.0,
      "session_end_s": 612.41,
      "gap_after_s": null,
      "gap_status": "UNKNOWN"
    }
  ]
}
```

Gap states:

- `NONE_CONFIRMED` — timestamps/continuity establish no missing time;
- `KNOWN` — gap duration is visible or encoded;
- `INFERRED` — creation metadata or in-game clocks bound it; retain method and uncertainty;
- `UNKNOWN` — files are ordered but elapsed time cannot be recovered;
- `NOT_SAME_SESSION` — sources are separate observational units.

Never compress an unknown gap into zero or fabricate continuity.

## Observability profile

Classify structural topology before choosing instruments.

### Camera topology

- `FIRST_PERSON`
- `OVER_SHOULDER`
- `CENTER_LOCKED_PLAYER`
- `SIDE_SCROLL`
- `FIXED_ROOM`
- `FREE_ORBIT`
- `ISOMETRIC_FOLLOW`
- `RTS_FREE_MAP`
- `SPECTATOR`
- `CINEMATIC`
- `HEAD_TRACKED_XR`
- `MIXED`
- `UNKNOWN`

### Time topology

- `CONTINUOUS_REALTIME`
- `PAUSABLE_REALTIME`
- `TURN_BASED`
- `ROUND_BASED`
- `WAVE_BASED`
- `LEVEL_BASED`
- `EDITED_DISCONTINUOUS`
- `MIXED`

### Control observability

- `INPUT_VISIBLE_SYNCHRONIZED`
- `INPUT_VISIBLE_UNCALIBRATED`
- `ACTION_INFERRED_FROM_OUTPUT`
- `AI_CONTROLLED`
- `MULTIPLE_CONTROLLERS`
- `UNKNOWN`

### Information topology

Record HUD visibility, hidden information, fog of war, offscreen systems, combat log, minimap, commentary, subtitles, and whether menu screens reveal formulas or values.

### Session topology

Single run, repeated attempts, match, tutorial, campaign slice, benchmark, montage, stream, replay, spectator VOD, or mixed.

## Capability statement

For each requested analysis, write:

- `SUPPORTED` — required signal is visible and instruments are valid;
- `BOUNDED_HYPOTHESIS` — the trace can constrain but not identify it;
- `UNSUPPORTED_BY_CAPTURE` — the necessary signal is absent;
- `INVALID_FOR_TOPOLOGY` — the instrument’s model does not apply.

Examples:

- Input-to-photon latency with no input overlay → `UNSUPPORTED_BY_CAPTURE`.
- Visible animation startup from frame states → `SUPPORTED`, bounded by PTS cadence and state visibility.
- Player world path under a validated center-lock camera → `SUPPORTED` within validated segments.
- Player world path under an RTS free camera → `INVALID_FOR_TOPOLOGY`.
- Exact RNG distribution from three drops → `BOUNDED_HYPOTHESIS`.

## Capture failure handling

- No audio stream → typed `AUDIO_UNAVAILABLE`; do not run semantic sound analysis.
- Near-silent stream → distinguish intentional quiet from muted capture only when the visual/context supports it; otherwise declare ambiguity.
- VFR → use PTS; do not resample before measuring event timing.
- Duplicate frames → report cadence/duplication; do not count duplicates as unique game states.
- Resolution or orientation changes → split into calibrated segments.
- Edited footage → treat cuts as missing causal context.
- Overlay/chat/notifications → include as visible evidence only when relevant; never confuse them with game UI.
- Corrupt/truncated source → preserve successfully decoded interval and mark the missing tail.
