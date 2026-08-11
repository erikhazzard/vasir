#!/usr/bin/env python3
"""Shared media and provenance utilities."""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from fractions import Fraction
from pathlib import Path
from typing import Any

SCRIPT_VERSION = "1.0.0"
SHOWINFO_RE = re.compile(r"\bn:\s*(\d+).*?\bpts_time:([\-0-9.eE]+)")


class ToolError(RuntimeError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def require_executable(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise ToolError(f"required executable not found: {name}")
    return path


def run_checked(cmd: list[str], *, text: bool = False, input_data: bytes | str | None = None) -> subprocess.CompletedProcess:
    try:
        result = subprocess.run(
            cmd,
            input=input_data,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=text,
            check=False,
        )
    except OSError as exc:
        raise ToolError(f"failed to execute {cmd[0]}: {exc}") from exc
    if result.returncode != 0:
        stderr = result.stderr if text else result.stderr.decode("utf-8", errors="replace")
        raise ToolError(f"command failed ({result.returncode}): {' '.join(cmd)}\n{stderr[-4000:]}")
    return result


def ffmpeg_version(executable: str = "ffmpeg") -> str:
    require_executable(executable)
    out = run_checked([executable, "-version"], text=True).stdout.splitlines()
    return out[0].strip() if out else "unknown"


def ffprobe_json(path: str | os.PathLike[str]) -> dict[str, Any]:
    require_executable("ffprobe")
    cmd = [
        "ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)
    ]
    return json.loads(run_checked(cmd, text=True).stdout)


def sha256_file(path: str | os.PathLike[str], chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def write_json(path: str | os.PathLike[str], data: Any) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, p)


def read_json(path: str | os.PathLike[str]) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def rational_to_float(value: str | None) -> float | None:
    if not value or value in {"0/0", "0:0", "N/A"}:
        return None
    normalized = value.replace(":", "/")
    try:
        return float(Fraction(normalized))
    except (ValueError, ZeroDivisionError):
        try:
            return float(value)
        except ValueError:
            return None


def nullable_float(value: Any) -> float | None:
    if value in (None, "", "N/A"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def nullable_int(value: Any) -> int | None:
    if value in (None, "", "N/A"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def rotation_degrees(stream: dict[str, Any]) -> int:
    for side in stream.get("side_data_list", []) or []:
        if "rotation" in side:
            try:
                return int(round(float(side["rotation"]))) % 360
            except (TypeError, ValueError):
                pass
    tags = stream.get("tags", {}) or {}
    if "rotate" in tags:
        try:
            return int(round(float(tags["rotate"]))) % 360
        except (TypeError, ValueError):
            pass
    return 0


def display_dimensions(stream: dict[str, Any]) -> tuple[int, int, int]:
    """Return square-pixel display dimensions after sample-aspect and rotation.

    The dimensions are a coordinate convention for analysis artifacts, not a claim
    about the original display device. FFmpeg's default autorotation is assumed by
    the bundled extractors.
    """
    coded_width = int(stream["width"])
    coded_height = int(stream["height"])
    sar = rational_to_float(stream.get("sample_aspect_ratio")) or 1.0
    pre_rotation_width = max(1, int(round(coded_width * sar)))
    pre_rotation_height = coded_height
    rot = rotation_degrees(stream)
    if rot in {90, 270}:
        return pre_rotation_height, pre_rotation_width, rot
    return pre_rotation_width, pre_rotation_height, rot


def first_stream(probe: dict[str, Any], codec_type: str) -> dict[str, Any] | None:
    for stream in probe.get("streams", []):
        if stream.get("codec_type") == codec_type:
            return stream
    return None


def scan_video_pts(
    path: str | os.PathLike[str],
    *,
    start_s: float | None = None,
    duration_s: float | None = None,
) -> tuple[list[float], list[float | None], list[str]]:
    """Return decoded-frame presentation timestamps and packet durations.

    Values remain in the source stream's PTS domain. Seeking may expose a frame
    outside the requested window, so the parsed results are filtered explicitly.
    """
    require_executable("ffprobe")
    cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0"]
    if start_s is not None:
        # ffprobe may seek to a keyframe before start_s. A relative `%+duration`
        # is measured from that actual seek point and can end before the requested
        # window, so bounded scans use an absolute end timestamp.
        interval = f"{start_s}%" if duration_s is None else f"{start_s}%{start_s + duration_s}"
        cmd += ["-read_intervals", interval]
    cmd += [
        "-show_entries", "frame=best_effort_timestamp_time,pkt_duration_time",
        "-of", "json", str(path),
    ]
    try:
        payload = json.loads(run_checked(cmd, text=True).stdout)
    except json.JSONDecodeError as exc:
        raise ToolError(f"ffprobe returned invalid frame-timestamp JSON for {path}") from exc
    pts: list[float] = []
    durations: list[float | None] = []
    lower = -math.inf if start_s is None else start_s - 1e-6
    upper = math.inf if start_s is None or duration_s is None else start_s + duration_s + 1e-6
    for frame in payload.get("frames", []):
        raw_pts = frame.get("best_effort_timestamp_time")
        if raw_pts in (None, "N/A"):
            continue
        try:
            value = float(raw_pts)
        except (TypeError, ValueError):
            continue
        if value < lower or value > upper:
            continue
        raw_duration = frame.get("pkt_duration_time")
        duration = None
        if raw_duration not in (None, "N/A"):
            try:
                duration = float(raw_duration)
            except (TypeError, ValueError):
                pass
        pts.append(value)
        durations.append(duration)
    return pts, durations, cmd


def parse_showinfo(stderr: str) -> list[float]:
    by_index: dict[int, float] = {}
    for line in stderr.splitlines():
        match = SHOWINFO_RE.search(line)
        if match:
            by_index[int(match.group(1))] = float(match.group(2))
    return [by_index[i] for i in sorted(by_index)]


def even(value: float, minimum: int = 2) -> int:
    n = max(minimum, int(round(value)))
    return n if n % 2 == 0 else n + 1


def relative_or_absolute(path: Path, base: Path) -> str:
    try:
        return str(path.resolve().relative_to(base.resolve()))
    except ValueError:
        return str(path.resolve())


def resolve_manifest_path(path_value: str, manifest_path: str | os.PathLike[str]) -> Path:
    p = Path(path_value)
    if p.is_absolute():
        return p
    return Path(manifest_path).resolve().parent / p


def format_timestamp(seconds: float, milliseconds: bool = True) -> str:
    seconds = max(0.0, seconds)
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    sec = seconds % 60
    if milliseconds:
        return f"{hours:02d}:{minutes:02d}:{sec:06.3f}"
    return f"{hours:02d}:{minutes:02d}:{int(sec):02d}"
