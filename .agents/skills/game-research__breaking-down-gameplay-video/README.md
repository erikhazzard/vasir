# Gameplay Video Forensics and Reconstruction

This skill turns supplied gameplay footage into three linked products:

1. a temporally grounded evidence corpus;
2. a maximal forensic web report explaining the game, run, systems, feel, and player behavior;
3. when explicitly requested, a reconstruction-grade baseline specification and behavioral fixtures sufficient to build an observationally faithful clone.

The footage is the complete primary input. The pipeline never fills evidentiary gaps with unmarked game knowledge. When several hidden implementations fit the same trace, it preserves the candidates and makes an explicit `BASELINE_CHOICE` so the clone remains implementable.

## Typical requests

- “Break down this gameplay video.” → maximal full reconstruction.
- “Surface the systems spreadsheet and give me a clone spec.” → implementation-focused reconstruction.
- “Why does this combat feel so good?” → feel forensics with exact visible timing.
- “How well did I play?” → decision-time player review without mind-reading.
- “Compare these two runs/games.” → adapter-specific comparative analysis with normalized measures.

## Package map

- `SKILL.md` — agent-facing operating procedure.
- `references/` — evidence model, system identification, genre adapters, instruments, player modeling, rebuild contract, report design, and reviews.
- `schemas/` — canonical JSON contracts.
- `templates/` — examples and report/ledger scaffolds.
- `scripts/` — PTS-aware media tools with explicit `FAILED` and `UNAVAILABLE` outcomes.
- `tests/` — smoke/regression tests for cadence, aspect ratio, missing audio, invalid input, schemas, and camera interpretation.

## Local prerequisites

- Python 3.11+
- `ffmpeg` and `ffprobe`
- packages in `requirements.txt`

Initialize a workspace:

```bash
python scripts/init_workspace.py /path/to/workspace --slug my-game --route FULL_RECONSTRUCTION
```

Probe a source with full timestamp scanning:

```bash
python scripts/media_probe.py gameplay.mp4 data/source-manifests/source_001.json --source-id source_001 --scan-pts --decode-check
```

Extract exact-PTS coarse frames and contact sheets:

```bash
python scripts/extract_frames.py gameplay.mp4 frames/coarse coarse_manifest.json --interval 2 --max-width 960 --format jpg
python scripts/contact_sheets.py coarse_manifest.json frames/sheets --tag source_001
```

Validate the package and run the regression suite:

```bash
python scripts/validate_package.py
python -m pytest -q
```

Validate a completed delivery:

```bash
python scripts/validate_delivery.py /path/to/workspace --verify-hashes
```

## Core distinction

The package never collapses these into one “confidence” label:

- what was observed;
- what was measured;
- what hidden model is inferred;
- how that model was validated;
- what remains unidentifiable;
- what implementation rule was chosen for the baseline clone.

That distinction is what allows the final artifact to be both honest and complete.
