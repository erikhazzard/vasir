#!/usr/bin/env python3
"""Extract non-semantic audio event features with typed missing/silent states."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from common import SCRIPT_VERSION, ToolError, ffmpeg_version, ffprobe_json, first_stream, run_checked, sha256_file, utc_now, write_json


def empty_output(out_path: Path, metadata: dict) -> dict:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    empty = np.asarray([], dtype=np.float32)
    np.savez_compressed(out_path, times_s=empty, rms=empty, peak=empty, zero_crossing_rate=empty, spectral_centroid_hz=empty, spectral_flux=empty)
    write_json(out_path.with_suffix(out_path.suffix + ".json"), metadata)
    return metadata


def run(video_path: Path, out_path: Path, sample_rate: int = 16000, window_ms: float = 25.0, hop_ms: float = 10.0) -> dict:
    if not video_path.is_file():
        raise ToolError(f"video not found: {video_path}")
    if sample_rate <= 0 or window_ms <= 0 or hop_ms <= 0:
        raise ToolError("sample rate, window, and hop must be positive")
    probe = ffprobe_json(video_path)
    audio = first_stream(probe, "audio")
    base_meta = {
        "source_path": str(video_path.resolve()),
        "source_sha256": sha256_file(video_path),
        "sample_rate_hz": sample_rate,
        "window_ms": window_ms,
        "hop_ms": hop_ms,
        "tool": {"name": "audio_features.py", "version": SCRIPT_VERSION, "ffmpeg_version": ffmpeg_version(), "created_at": utc_now()},
    }
    if not audio:
        return empty_output(out_path, {**base_meta, "status": "UNAVAILABLE", "reason": "no_audio_stream", "windows": 0, "limitations": ["Semantic sound analysis is unavailable."]})

    cmd = [
        "ffmpeg", "-nostdin", "-v", "error", "-i", str(video_path), "-map", "0:a:0",
        "-ac", "1", "-ar", str(sample_rate), "-f", "f32le", "-",
    ]
    raw = run_checked(cmd).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    win = max(2, round(window_ms * sample_rate / 1000.0))
    hop = max(1, round(hop_ms * sample_rate / 1000.0))
    if len(x) < win:
        return empty_output(out_path, {**base_meta, "status": "UNAVAILABLE", "reason": "audio_shorter_than_window", "windows": 0, "limitations": []})

    view = np.lib.stride_tricks.sliding_window_view(x, win)[::hop]
    n = len(view)
    times = (np.arange(n, dtype=np.float64) * hop + win / 2.0) / sample_rate
    rms = np.empty(n, dtype=np.float32)
    peak = np.empty(n, dtype=np.float32)
    zcr = np.empty(n, dtype=np.float32)
    centroid = np.empty(n, dtype=np.float32)
    flux = np.empty(n, dtype=np.float32)
    window = np.hanning(win).astype(np.float32)
    freqs = np.fft.rfftfreq(win, d=1.0 / sample_rate).astype(np.float32)
    previous_mag: np.ndarray | None = None
    chunk_size = 2048

    for start in range(0, n, chunk_size):
        frames = np.asarray(view[start:start + chunk_size], dtype=np.float32)
        rms[start:start + len(frames)] = np.sqrt(np.mean(frames * frames, axis=1))
        peak[start:start + len(frames)] = np.max(np.abs(frames), axis=1)
        signs = frames >= 0
        zcr[start:start + len(frames)] = np.mean(signs[:, 1:] != signs[:, :-1], axis=1)
        mag = np.abs(np.fft.rfft(frames * window, axis=1)).astype(np.float32)
        denom = np.maximum(mag.sum(axis=1), 1e-12)
        centroid[start:start + len(frames)] = (mag * freqs).sum(axis=1) / denom
        if previous_mag is None:
            flux[start] = 0.0
            if len(frames) > 1:
                diff = np.maximum(0.0, mag[1:] - mag[:-1])
                flux[start + 1:start + len(frames)] = np.sqrt(np.mean(diff * diff, axis=1))
        else:
            first_diff = np.maximum(0.0, mag[0] - previous_mag)
            flux[start] = float(np.sqrt(np.mean(first_diff * first_diff)))
            if len(frames) > 1:
                diff = np.maximum(0.0, mag[1:] - mag[:-1])
                flux[start + 1:start + len(frames)] = np.sqrt(np.mean(diff * diff, axis=1))
        previous_mag = mag[-1]

    max_rms = float(rms.max()) if n else 0.0
    status = "NEAR_SILENT" if max_rms < 1e-5 else "AVAILABLE"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        out_path,
        times_s=times,
        rms=rms,
        peak=peak,
        zero_crossing_rate=zcr,
        spectral_centroid_hz=centroid,
        spectral_flux=flux,
    )
    metadata = {
        **base_meta,
        "status": status,
        "reason": None,
        "windows": n,
        "max_rms": max_rms,
        "arrays": {
            "times_s": "window-center seconds from decoded audio start",
            "rms": "root-mean-square amplitude",
            "peak": "peak absolute amplitude",
            "zero_crossing_rate": "fraction of sign transitions",
            "spectral_centroid_hz": "magnitude-weighted frequency centroid",
            "spectral_flux": "positive spectral change magnitude",
        },
        "limitations": [
            "These features propose audio events; they do not identify sound source or semantic meaning.",
            "Audio start may differ from video PTS start; inspect synchronization before sub-frame audiovisual claims.",
        ],
        "tool": {**base_meta["tool"], "command": cmd},
    }
    write_json(out_path.with_suffix(out_path.suffix + ".json"), metadata)
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--sample-rate", type=int, default=16000)
    parser.add_argument("--window-ms", type=float, default=25.0)
    parser.add_argument("--hop-ms", type=float, default=10.0)
    args = parser.parse_args()
    try:
        meta = run(args.video, args.output, args.sample_rate, args.window_ms, args.hop_ms)
        print(json.dumps({"status": meta["status"], "windows": meta["windows"], "output": str(args.output)}))
    except ToolError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
