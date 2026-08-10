# Evidence-preserving media instruments

These tools acquire and preserve evidence. They never decide what a mechanic means.

## Guarantees

- Fail closed on missing inputs, decoder errors, empty outputs, non-monotonic timing, frame/PTS mismatches, and invalid parameters.
- Use presentation timestamps rather than `frame_index / assumed_fps`.
- Preserve display aspect ratio and record every transform.
- Store source hashes, commands, tool versions, units, semantics, and limitations in manifests or sidecars.
- Represent absent audio as `UNAVAILABLE`; never return a normal-looking empty analysis.
- Treat global image motion as a screen transform until a camera adapter validates a stronger interpretation.

## Commands

```bash
python media_probe.py gameplay.mp4 data/source-manifests/source_001.json --source-id source_001 --scan-pts --decode-check
python compose_timeline.py data/timeline.json data/source-manifests/*.json --relationship same-session
python extract_frames.py gameplay.mp4 frames/coarse frames/coarse_manifest.json --interval 2 --max-width 960
python contact_sheets.py frames/coarse_manifest.json frames/sheets --tag RUN
python film_strip.py gameplay.mp4 32.1 0.55 8 assets/hit.jpg HIT
python metrics_video.py gameplay.mp4 data/measurements/visual_metrics.npz
python audio_features.py gameplay.mp4 data/measurements/audio_features.npz
python track_camera.py gameplay.mp4 data/measurements/screen_transform.npz --sample-fps 10
python validate_package.py
python validate_delivery.py /path/to/workspace --verify-hashes
python validate_delivery.py /path/to/workspace --verify-hashes
python validate_package.py
```

## Semantics and limits

### `media_probe.py`

Records source hash, stream metadata, coded and square-pixel display dimensions, timebase, nominal rates, audio streams, optional full decoded-frame PTS cadence, and optional fail-closed full decode verification. `CFR_EVIDENCE` does not prove the game simulation rate; `VFR_EVIDENCE` means all timing must remain timestamp-based.

### `compose_timeline.py`

Preserves source boundaries and marks every inter-file gap `KNOWN`, `INFERRED`, `UNKNOWN`, or `NOT_SAME_SESSION`. It never manufactures a continuous session clock across an unknown gap.

### `extract_frames.py`

Selects real input frames separated by a minimum source-PTS interval. It writes exact selected PTS and hashes for each frame. These samples are navigation artifacts, not substitutes for watching the sequence.

### `contact_sheets.py`

Builds sheets only from a PTS-bearing frame manifest. It never derives time from filenames or list position.

### `film_strip.py`

Chooses source-frame PTS nearest requested targets, verifies the PTS of every extracted cell with FFmpeg `showinfo`, and labels the actual extracted time. The sidecar retains target, selected, extracted, selection-error, and extraction-error timestamps.

### `metrics_video.py`

Outputs `pts_s`, `delta_s`, `luma`, `motion`, `motion_per_s`, and `duplicate` at an aspect-preserved analysis resolution. Motion and luma propose windows; they do not identify pauses, impacts, cuts, or causes by themselves.

### `audio_features.py`

Outputs RMS, peak, zero-crossing rate, spectral centroid, and positive spectral flux at a declared window/hop. These propose audible events. Listen to the interval before calling one a shot, impact, UI cue, speech, or music transition.

### `track_camera.py`

Fits a robust partial-affine screen transform between sampled frames, reports inliers/residual/rotation/scale, and rejects pairs outside declared thresholds. It outputs no player path unless `--interpret-center-lock` is explicitly supplied after the center-lock adapter has passed. Even then, the output name and sidecar retain the assumption.

### `validate_artifacts.py`, `validate_delivery.py`, and `validate_package.py`

`validate_artifacts.py` checks workspace schemas, duplicate canonical IDs, source and artifact lineage, PTS bounds, corpus counts, cross-object references, baseline completeness, fixture coverage, and unresolved P0/P1 findings. `validate_delivery.py` adds final required-artifact, non-empty corpus, hash, report, and four-gate checks. `validate_package.py` validates every packaged schema/example/reference. None can prove that an inferred hidden model is the original one.
