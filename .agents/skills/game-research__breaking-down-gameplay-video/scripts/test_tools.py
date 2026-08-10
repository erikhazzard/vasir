#!/usr/bin/env python3
"""Synthetic regression suite for PTS timing, geometry, fail-closed behavior, typed audio states, camera gating, and package schemas."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from jsonschema import Draft202012Validator

SCRIPT_DIR = Path(__file__).resolve().parent
PACKAGE_DIR = SCRIPT_DIR.parent
PYTHON = sys.executable


def run(cmd: list[str], *, expect_ok: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
    if expect_ok and proc.returncode != 0:
        raise AssertionError(f"command failed: {' '.join(cmd)}\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}")
    if not expect_ok and proc.returncode == 0:
        raise AssertionError(f"command unexpectedly succeeded: {' '.join(cmd)}")
    return proc


def ffmpeg_make(path: Path, rate: int, size: str, *, audio: bool = False, duration: float = 2.0) -> None:
    cmd = ["ffmpeg", "-nostdin", "-v", "error", "-f", "lavfi", "-i", f"testsrc2=size={size}:rate={rate}"]
    if audio:
        cmd += ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000"]
    cmd += ["-t", str(duration), "-c:v", "libx264", "-pix_fmt", "yuv420p"]
    if audio:
        cmd += ["-c:a", "aac", "-shortest"]
    cmd += ["-y", str(path)]
    run(cmd)


def validate_json(path: Path, schema_name: str) -> None:
    schema = json.loads((PACKAGE_DIR / "schemas" / schema_name).read_text())
    value = json.loads(path.read_text())
    errors = sorted(Draft202012Validator(schema).iter_errors(value), key=lambda err: list(err.absolute_path))
    if errors:
        raise AssertionError(f"{path} failed {schema_name}:\n" + "\n".join(error.message for error in errors))


def main() -> None:
    run([PYTHON, str(SCRIPT_DIR / "validate_package.py"), "--skip-tests"])

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        v30 = root / "v30.mp4"
        v60_audio = root / "v60_audio.mp4"
        v24_4x3 = root / "v24_4x3.mp4"
        ffmpeg_make(v30, 30, "640x360", audio=False)
        ffmpeg_make(v60_audio, 60, "640x360", audio=True)
        ffmpeg_make(v24_4x3, 24, "640x480", audio=False)

        source_manifest = root / "source_001.json"
        run([
            PYTHON, str(SCRIPT_DIR / "media_probe.py"), str(v30), str(source_manifest),
            "--source-id", "source_001", "--scan-pts", "--decode-check",
        ])
        source_data = json.loads(source_manifest.read_text())
        validate_json(source_manifest, "source-manifest.schema.json")
        assert source_data["timing"]["cadence_classification"] == "CFR_EVIDENCE"
        assert source_data["video"]["display_width"] == 640
        assert source_data["decode_check"]["status"] == "PASSED"

        metrics = root / "metrics.npz"
        run([PYTHON, str(SCRIPT_DIR / "metrics_video.py"), str(v30), str(metrics), "--max-width", "320"])
        metrics_npz = np.load(metrics)
        metrics_meta = json.loads((root / "metrics.npz.json").read_text())
        assert metrics_meta["analysis_frame"]["width"] == 320
        assert metrics_meta["analysis_frame"]["height"] == 180, metrics_meta
        assert len(metrics_npz["pts_s"]) == len(metrics_npz["luma"]) > 50
        assert float(np.nanmedian(metrics_npz["delta_s"][1:])) > 0.03

        audio_none = root / "audio_none.npz"
        run([PYTHON, str(SCRIPT_DIR / "audio_features.py"), str(v30), str(audio_none)])
        audio_none_meta = json.loads((root / "audio_none.npz.json").read_text())
        assert audio_none_meta["status"] == "UNAVAILABLE"

        audio_yes = root / "audio_yes.npz"
        run([PYTHON, str(SCRIPT_DIR / "audio_features.py"), str(v60_audio), str(audio_yes)])
        audio_yes_npz = np.load(audio_yes)
        audio_yes_meta = json.loads((root / "audio_yes.npz.json").read_text())
        assert audio_yes_meta["status"] == "AVAILABLE"
        assert len(audio_yes_npz["rms"]) > 100

        frame_dir = root / "frames"
        frame_manifest = root / "frame_manifest.json"
        run([
            PYTHON, str(SCRIPT_DIR / "extract_frames.py"), str(v30), str(frame_dir), str(frame_manifest),
            "--interval", "0.5", "--max-width", "320", "--source-manifest", str(source_manifest),
        ])
        validate_json(frame_manifest, "frame-manifest.schema.json")
        frame_data = json.loads(frame_manifest.read_text())
        assert len(frame_data["frames"]) >= 4
        selected_pts = [row["pts_s"] for row in frame_data["frames"]]
        assert all(b > a for a, b in zip(selected_pts, selected_pts[1:]))
        assert selected_pts[-1] >= 1.45, selected_pts
        first_frame = frame_manifest.parent / frame_data["frames"][0]["path"]
        from PIL import Image
        with Image.open(first_frame) as image:
            assert image.size == (320, 180)

        sheets = root / "sheets"
        run([PYTHON, str(SCRIPT_DIR / "contact_sheets.py"), str(frame_manifest), str(sheets), "--tag", "TEST"])
        assert (sheets / "contact_sheets_manifest.json").is_file()
        assert list(sheets.glob("sheet_*.jpg"))

        strip = root / "strip30.jpg"
        run([PYTHON, str(SCRIPT_DIR / "film_strip.py"), str(v30), "0", "1.0", "4", str(strip), "TEST"])
        sidecar = json.loads(Path(str(strip) + ".json").read_text())
        offsets = [cell["offset_ms"] for cell in sidecar["cells"]]
        assert offsets[0] <= 40, offsets
        assert offsets[-1] >= 900, offsets  # catches the historical hard-coded-60-fps half-time bug

        camera = root / "camera.npz"
        run([
            PYTHON, str(SCRIPT_DIR / "track_camera.py"), str(v24_4x3), str(camera),
            "--sample-fps", "5", "--max-width", "320",
        ])
        camera_meta = json.loads((root / "camera.npz.json").read_text())
        assert camera_meta["source_display"]["width"] == 640
        assert camera_meta["source_display"]["height"] == 480
        assert camera_meta["interpretation"]["primary"] == "global screen-space partial-affine transform"
        assert camera_meta["interpretation"]["center_lock_player_path_requested"] is False

        missing = root / "missing.mp4"
        bad_output = root / "bad.npz"
        run([PYTHON, str(SCRIPT_DIR / "metrics_video.py"), str(missing), str(bad_output)], expect_ok=False)
        assert not bad_output.exists()

        corrupt = root / "corrupt.mp4"
        corrupt.write_bytes(b"not a video")
        corrupt_manifest = root / "corrupt.json"
        run([
            PYTHON, str(SCRIPT_DIR / "media_probe.py"), str(corrupt), str(corrupt_manifest),
            "--scan-pts", "--decode-check",
        ], expect_ok=False)
        assert not corrupt_manifest.exists()

    print(json.dumps({"ok": True, "tests": "all synthetic regressions passed"}, indent=2))


if __name__ == "__main__":
    main()
