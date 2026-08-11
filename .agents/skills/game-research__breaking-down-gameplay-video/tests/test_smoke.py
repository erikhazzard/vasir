from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

from audio_features import run as audio_features_run
from compose_timeline import run as compose_timeline_run
from contact_sheets import run as contact_sheets_run
from extract_frames import run as extract_frames_run
from film_strip import run as film_strip_run
from media_probe import run as media_probe_run
from metrics_video import run as metrics_video_run

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"


def checked(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


@pytest.fixture(scope="session", autouse=True)
def require_media_tools() -> None:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        pytest.skip("ffmpeg and ffprobe are required")


def make_video(path: Path, *, rate: int = 30, size: str = "320x180", duration: float = 1.2, audio: bool = False, sar: str | None = None) -> Path:
    video_filter = f"testsrc2=size={size}:rate={rate}:duration={duration}"
    if sar:
        video_filter += f",setsar={sar}"
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", video_filter]
    if audio:
        cmd += ["-f", "lavfi", "-i", f"sine=frequency=880:sample_rate=48000:duration={duration}"]
    cmd += ["-map", "0:v:0"]
    if audio:
        cmd += ["-map", "1:a:0", "-c:a", "aac", "-shortest"]
    cmd += ["-c:v", "mpeg4", "-q:v", "2", str(path)]
    checked(cmd)
    return path


def make_vfr_video(path: Path) -> Path:
    # Two equal-sized source segments with different frame cadences. Matroska/FFV1
    # preserves the per-frame timestamps without forcing a constant output rate.
    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=30:duration=0.8",
        "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=17:duration=0.8",
        "-filter_complex", "[0:v]settb=AVTB[v0];[1:v]settb=AVTB[v1];[v0][v1]concat=n=2:v=1:a=0[v]",
        "-map", "[v]", "-fps_mode", "vfr", "-c:v", "ffv1", str(path),
    ]
    checked(cmd)
    return path


@pytest.mark.parametrize("rate", [24, 30, 50, 60, 120])
def test_probe_and_metrics_use_real_pts(tmp_path: Path, rate: int) -> None:
    video = make_video(tmp_path / f"rate_{rate}.mp4", rate=rate, duration=1.1)
    manifest_path = tmp_path / f"rate_{rate}.json"
    manifest = media_probe_run(video, manifest_path, f"source_rate_{rate}", True, True)
    assert manifest["timing"]["cadence_classification"] == "CFR_EVIDENCE"
    assert manifest["timing"]["median_delta_s"] == pytest.approx(1 / rate, abs=0.002)

    metrics_path = tmp_path / f"rate_{rate}.npz"
    metadata = metrics_video_run(video, metrics_path, 160)
    arrays = np.load(metrics_path)
    assert metadata["frame_count"] == len(arrays["pts_s"])
    assert len(arrays["pts_s"]) == manifest["timing"]["frame_count_scanned"]
    assert np.nanmedian(arrays["delta_s"][1:]) == pytest.approx(1 / rate, abs=0.002)
    assert np.all(np.diff(arrays["pts_s"]) > 0)


@pytest.mark.parametrize(
    ("size", "expected"),
    [("640x360", (320, 180)), ("640x480", (320, 240)), ("360x640", (320, 570))],
)
def test_metrics_preserve_display_aspect(tmp_path: Path, size: str, expected: tuple[int, int]) -> None:
    video = make_video(tmp_path / f"aspect_{size}.mp4", size=size, duration=0.5)
    metadata = metrics_video_run(video, tmp_path / f"aspect_{size}.npz", 320)
    assert (metadata["analysis_frame"]["width"], metadata["analysis_frame"]["height"]) == expected
    source_ratio = metadata["source_display"]["width"] / metadata["source_display"]["height"]
    analysis_ratio = expected[0] / expected[1]
    assert analysis_ratio == pytest.approx(source_ratio, abs=0.01)


def test_sample_aspect_ratio_is_normalized(tmp_path: Path) -> None:
    video = make_video(tmp_path / "sar.mkv", size="320x240", duration=0.5, sar="2/1")
    manifest = media_probe_run(video, tmp_path / "sar.json", "source_sar", True, True)
    assert (manifest["video"]["display_width"], manifest["video"]["display_height"]) == (640, 240)
    metadata = metrics_video_run(video, tmp_path / "sar.npz", 320)
    assert (metadata["analysis_frame"]["width"], metadata["analysis_frame"]["height"]) == (320, 120)


def test_vfr_is_detected_and_metrics_keep_variable_deltas(tmp_path: Path) -> None:
    video = make_vfr_video(tmp_path / "vfr.mkv")
    manifest = media_probe_run(video, tmp_path / "vfr.json", "source_vfr", True, True)
    assert manifest["timing"]["cadence_classification"] == "VFR_EVIDENCE"
    metrics_video_run(video, tmp_path / "vfr.npz", 160)
    deltas = np.load(tmp_path / "vfr.npz")["delta_s"][1:]
    rounded = {round(float(value), 4) for value in deltas}
    assert len(rounded) >= 2


def test_film_strip_uses_verified_30fps_pts(tmp_path: Path) -> None:
    video = make_video(tmp_path / "thirty.mp4", rate=30, duration=1.2)
    output = tmp_path / "strip.jpg"
    metadata = film_strip_run(video, 0.25, 0.75, 4, output, "TEST", 240)
    offsets = [cell["offset_ms"] for cell in metadata["cells"]]
    assert offsets[0] <= 40
    assert metadata["cells"][0]["extracted_pts_s"] >= 0.23
    assert offsets[-1] >= 700  # Regression: the old tool labeled 30 fps frames at half-time.
    assert max(abs(cell["extraction_error_ms"]) for cell in metadata["cells"]) <= 40
    assert output.is_file() and output.with_suffix(".jpg.json").is_file()


def test_frame_manifest_and_contact_sheets_keep_pts(tmp_path: Path) -> None:
    video = make_video(tmp_path / "frames.mp4", rate=30, duration=1.4)
    frame_dir = tmp_path / "frames"
    manifest_path = tmp_path / "frames.json"
    manifest = extract_frames_run(
        video, frame_dir, manifest_path,
        interval_s=0.4, start_s=0.0, duration_s=1.2,
        max_width=320, image_format="jpg", source_manifest=None,
    )
    pts = [frame["pts_s"] for frame in manifest["frames"]]
    assert len(pts) >= 3
    assert all(b > a for a, b in zip(pts, pts[1:]))
    assert all((b - a) >= 0.39 for a, b in zip(pts, pts[1:]))
    sheets = contact_sheets_run(manifest_path, tmp_path / "sheets", "TEST", 2, 2, 160)
    assert sheets["sheets"]
    assert sheets["sheets"][0]["cells"][0]["pts_s"] == pts[0]


def test_audio_missing_is_typed_and_audio_present_is_measured(tmp_path: Path) -> None:
    silent_source = make_video(tmp_path / "no_audio.mp4", audio=False)
    unavailable = audio_features_run(silent_source, tmp_path / "no_audio.npz")
    assert unavailable["status"] == "UNAVAILABLE"
    assert unavailable["reason"] == "no_audio_stream"
    assert len(np.load(tmp_path / "no_audio.npz")["times_s"]) == 0

    audible_source = make_video(tmp_path / "audio.mp4", audio=True)
    available = audio_features_run(audible_source, tmp_path / "audio.npz")
    assert available["status"] == "AVAILABLE"
    arrays = np.load(tmp_path / "audio.npz")
    assert len(arrays["times_s"]) > 50
    assert float(arrays["rms"].max()) > 0


def test_invalid_media_fails_closed(tmp_path: Path) -> None:
    output = tmp_path / "must_not_exist.npz"
    proc = subprocess.run(
        [sys.executable, str(SCRIPTS / "metrics_video.py"), str(tmp_path / "missing.mp4"), str(output)],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    assert proc.returncode != 0
    assert not output.exists()

    corrupt = tmp_path / "corrupt.mp4"
    corrupt.write_bytes(b"not a media file")
    manifest = tmp_path / "must_not_exist.json"
    probe = subprocess.run(
        [sys.executable, str(SCRIPTS / "media_probe.py"), str(corrupt), str(manifest), "--scan-pts"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    assert probe.returncode != 0
    assert not manifest.exists()


def test_timeline_preserves_unknown_gap(tmp_path: Path) -> None:
    first = make_video(tmp_path / "a.mp4", duration=0.5)
    second = make_video(tmp_path / "b.mp4", duration=0.5)
    m1_path, m2_path = tmp_path / "a.json", tmp_path / "b.json"
    media_probe_run(first, m1_path, "source_a", True, True)
    media_probe_run(second, m2_path, "source_b", True, True)
    timeline_path = tmp_path / "timeline.json"
    timeline = compose_timeline_run([m1_path, m2_path], timeline_path, "timeline_test", "same-session", {})
    assert timeline["segments"][0]["gap_status"] == "UNKNOWN"
    assert timeline["segments"][0]["gap_after_s"] is None
    assert timeline["segments"][1]["session_start_s"] is None
