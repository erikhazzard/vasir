#!/usr/bin/env python3
"""Estimate capability-gated global screen motion; never assume it is player motion.

The tool samples real PTS frames, estimates a partial affine transform with ORB/RANSAC,
and reports translation, rotation, scale, inlier ratio, and residual. Only caller-validated
center-lock footage may request the optional opposite-sign player-path interpretation.
"""
from __future__ import annotations

import argparse
import json
import math
import tempfile
from pathlib import Path

import cv2
import numpy as np

from common import SCRIPT_VERSION, ToolError, display_dimensions, ffprobe_json, first_stream, read_json, resolve_manifest_path, sha256_file, utc_now, write_json
from extract_frames import run as extract_frames_run


def estimate_pair(previous: np.ndarray, current: np.ndarray, mask: np.ndarray, max_features: int) -> dict:
    orb = cv2.ORB_create(nfeatures=max_features, fastThreshold=12)
    kp_a, desc_a = orb.detectAndCompute(previous, mask)
    kp_b, desc_b = orb.detectAndCompute(current, mask)
    if desc_a is None or desc_b is None or len(kp_a) < 8 or len(kp_b) < 8:
        return {"valid": False, "reason": "insufficient_features", "matches": 0, "inliers": 0}
    matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
    pairs = matcher.knnMatch(desc_a, desc_b, k=2)
    good = [m for m, n in pairs if m.distance < 0.75 * n.distance]
    if len(good) < 8:
        return {"valid": False, "reason": "insufficient_matches", "matches": len(good), "inliers": 0}
    src = np.float32([kp_a[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([kp_b[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    matrix, inlier_mask = cv2.estimateAffinePartial2D(
        src, dst, method=cv2.RANSAC, ransacReprojThreshold=2.5,
        maxIters=3000, confidence=0.995, refineIters=20,
    )
    if matrix is None or inlier_mask is None:
        return {"valid": False, "reason": "ransac_failed", "matches": len(good), "inliers": 0}
    inliers = inlier_mask.ravel().astype(bool)
    count = int(inliers.sum())
    if count < 4:
        return {"valid": False, "reason": "too_few_inliers", "matches": len(good), "inliers": count}
    a, b, dx = matrix[0]
    c, d, dy = matrix[1]
    scale = float(math.sqrt(a * a + b * b))
    rotation = float(math.degrees(math.atan2(b, a)))
    predicted = cv2.transform(src[inliers], matrix)
    residual = float(np.sqrt(np.mean((predicted - dst[inliers]) ** 2)))
    return {
        "valid": True,
        "reason": None,
        "matches": len(good),
        "inliers": count,
        "inlier_ratio": count / len(good),
        "residual_analysis_px": residual,
        "dx_analysis_px": float(dx),
        "dy_analysis_px": float(dy),
        "rotation_deg": rotation,
        "scale": scale,
    }


def make_mask(shape: tuple[int, int], top: float, bottom: float, left: float, right: float) -> np.ndarray:
    height, width = shape
    x0 = int(width * left)
    x1 = int(width * (1.0 - right))
    y0 = int(height * top)
    y1 = int(height * (1.0 - bottom))
    if x1 <= x0 or y1 <= y0:
        raise ToolError("mask margins remove the entire analysis frame")
    mask = np.zeros((height, width), dtype=np.uint8)
    mask[y0:y1, x0:x1] = 255
    return mask


def run(
    video: Path,
    out_path: Path,
    *,
    sample_fps: float,
    max_width: int,
    max_features: int,
    min_inlier_ratio: float,
    max_residual_px: float,
    max_rotation_deg: float,
    max_scale_delta: float,
    exclude_top: float,
    exclude_bottom: float,
    exclude_left: float,
    exclude_right: float,
    interpret_center_lock: bool,
) -> dict:
    if not video.is_file():
        raise ToolError(f"video not found: {video}")
    if sample_fps <= 0:
        raise ToolError("sample fps must be positive")
    probe = ffprobe_json(video)
    stream = first_stream(probe, "video")
    if not stream:
        raise ToolError("no video stream found")
    display_w, display_h, rotation = display_dimensions(stream)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        frame_dir = tmp_path / "frames"
        frame_manifest_path = tmp_path / "frames.json"
        frame_manifest = extract_frames_run(
            video, frame_dir, frame_manifest_path,
            interval_s=1.0 / sample_fps, start_s=0.0, duration_s=None,
            max_width=max_width, image_format="png", source_manifest=None,
        )
        frames = frame_manifest["frames"]
        if len(frames) < 2:
            raise ToolError("camera estimation requires at least two sampled frames")
        images = []
        for frame in frames:
            path = resolve_manifest_path(frame["path"], frame_manifest_path)
            image = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
            if image is None:
                raise ToolError(f"failed to read sampled frame: {path}")
            images.append(image)
        analysis_h, analysis_w = images[0].shape
        if any(image.shape != (analysis_h, analysis_w) for image in images):
            raise ToolError("sampled frame dimensions changed; split the source into calibrated segments")
        mask = make_mask((analysis_h, analysis_w), exclude_top, exclude_bottom, exclude_left, exclude_right)

        estimates = [estimate_pair(a, b, mask, max_features) for a, b in zip(images, images[1:])]

    scale_x = display_w / analysis_w
    scale_y = display_h / analysis_h
    n = len(estimates)
    pts = np.asarray([float(frame["pts_s"]) for frame in frames[1:]], dtype=np.float64)
    dx = np.full(n, np.nan, dtype=np.float32)
    dy = np.full(n, np.nan, dtype=np.float32)
    rotation_arr = np.full(n, np.nan, dtype=np.float32)
    scale_arr = np.full(n, np.nan, dtype=np.float32)
    inlier_ratio_arr = np.zeros(n, dtype=np.float32)
    residual_arr = np.full(n, np.nan, dtype=np.float32)
    affine_valid = np.zeros(n, dtype=np.bool_)
    translation_valid = np.zeros(n, dtype=np.bool_)
    matches_arr = np.zeros(n, dtype=np.int32)
    inliers_arr = np.zeros(n, dtype=np.int32)

    for i, estimate in enumerate(estimates):
        matches_arr[i] = int(estimate.get("matches", 0))
        inliers_arr[i] = int(estimate.get("inliers", 0))
        if not estimate.get("valid"):
            continue
        affine_valid[i] = True
        dx[i] = estimate["dx_analysis_px"] * scale_x
        dy[i] = estimate["dy_analysis_px"] * scale_y
        rotation_arr[i] = estimate["rotation_deg"]
        scale_arr[i] = estimate["scale"]
        inlier_ratio_arr[i] = estimate["inlier_ratio"]
        residual_arr[i] = estimate["residual_analysis_px"] * max(scale_x, scale_y)
        translation_valid[i] = (
            estimate["inlier_ratio"] >= min_inlier_ratio
            and estimate["residual_analysis_px"] <= max_residual_px
            and abs(estimate["rotation_deg"]) <= max_rotation_deg
            and abs(estimate["scale"] - 1.0) <= max_scale_delta
        )

    segment_id = np.full(n, -1, dtype=np.int32)
    camera_path_x = np.full(n, np.nan, dtype=np.float32)
    camera_path_y = np.full(n, np.nan, dtype=np.float32)
    current_segment = -1
    x = y = 0.0
    previous_valid = False
    for i, valid in enumerate(translation_valid):
        if not valid:
            previous_valid = False
            continue
        if not previous_valid:
            current_segment += 1
            x = y = 0.0
        x += float(dx[i])
        y += float(dy[i])
        segment_id[i] = current_segment
        camera_path_x[i] = x
        camera_path_y[i] = y
        previous_valid = True

    out_path.parent.mkdir(parents=True, exist_ok=True)
    arrays = {
        "pts_s": pts,
        "dx_screen_px": dx,
        "dy_screen_px": dy,
        "rotation_deg": rotation_arr,
        "scale": scale_arr,
        "inlier_ratio": inlier_ratio_arr,
        "residual_screen_px": residual_arr,
        "matches": matches_arr,
        "inliers": inliers_arr,
        "affine_valid": affine_valid,
        "translation_valid": translation_valid,
        "segment_id": segment_id,
        "camera_path_x_screen_px": camera_path_x,
        "camera_path_y_screen_px": camera_path_y,
    }
    if interpret_center_lock:
        arrays["player_dx_screen_px_assuming_center_lock"] = -dx
        arrays["player_dy_screen_px_assuming_center_lock"] = -dy
        arrays["player_path_x_screen_px_assuming_center_lock"] = -camera_path_x
        arrays["player_path_y_screen_px_assuming_center_lock"] = -camera_path_y
    np.savez_compressed(out_path, **arrays)

    valid_count = int(affine_valid.sum())
    translation_count = int(translation_valid.sum())
    if valid_count == 0:
        status = "REJECTED_AFTER_VALIDATION"
    elif translation_count < n * 0.5:
        status = "VALID_WITH_LIMITATIONS"
    else:
        status = "VALID"
    metadata = {
        "schema_version": "1.0.0",
        "status": status,
        "source_path": str(video.resolve()),
        "source_sha256": sha256_file(video),
        "source_display": {"width": display_w, "height": display_h, "rotation_degrees": rotation},
        "analysis_frame": {"width": analysis_w, "height": analysis_h},
        "sample_fps_requested": sample_fps,
        "pairs": n,
        "affine_valid_pairs": valid_count,
        "translation_valid_pairs": translation_count,
        "translation_segments": current_segment + 1,
        "quality_thresholds": {
            "min_inlier_ratio": min_inlier_ratio,
            "max_residual_analysis_px": max_residual_px,
            "max_rotation_deg_for_translation": max_rotation_deg,
            "max_scale_delta_for_translation": max_scale_delta,
        },
        "mask_margins": {"top": exclude_top, "bottom": exclude_bottom, "left": exclude_left, "right": exclude_right},
        "interpretation": {
            "primary": "global screen-space partial-affine transform",
            "center_lock_player_path_requested": interpret_center_lock,
            "center_lock_assumptions": ([
                "caller validated player remains center-locked",
                "zoom is fixed within valid segments",
                "dominant matched features are world-static",
                "background transform is opposite player displacement",
            ] if interpret_center_lock else []),
        },
        "limitations": [
            "Global screen motion is not automatically camera motion or player motion.",
            "Parallax, cuts, repeated texture, independent full-screen motion, VFX, and motion blur may invalidate pairs.",
            "Integrated paths reset after invalid pairs; no drift-free world map is claimed.",
        ],
        "tool": {"name": "track_camera.py", "version": SCRIPT_VERSION, "created_at": utc_now()},
    }
    write_json(out_path.with_suffix(out_path.suffix + ".json"), metadata)
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--sample-fps", type=float, default=10.0)
    parser.add_argument("--max-width", type=int, default=960)
    parser.add_argument("--max-features", type=int, default=2000)
    parser.add_argument("--min-inlier-ratio", type=float, default=0.35)
    parser.add_argument("--max-residual-px", type=float, default=2.5)
    parser.add_argument("--max-rotation-deg", type=float, default=1.5)
    parser.add_argument("--max-scale-delta", type=float, default=0.015)
    parser.add_argument("--exclude-top", type=float, default=0.10)
    parser.add_argument("--exclude-bottom", type=float, default=0.08)
    parser.add_argument("--exclude-left", type=float, default=0.03)
    parser.add_argument("--exclude-right", type=float, default=0.03)
    parser.add_argument("--interpret-center-lock", action="store_true")
    args = parser.parse_args()
    try:
        meta = run(
            args.video, args.output,
            sample_fps=args.sample_fps, max_width=args.max_width, max_features=args.max_features,
            min_inlier_ratio=args.min_inlier_ratio, max_residual_px=args.max_residual_px,
            max_rotation_deg=args.max_rotation_deg, max_scale_delta=args.max_scale_delta,
            exclude_top=args.exclude_top, exclude_bottom=args.exclude_bottom,
            exclude_left=args.exclude_left, exclude_right=args.exclude_right,
            interpret_center_lock=args.interpret_center_lock,
        )
        print(json.dumps({"status": meta["status"], "pairs": meta["pairs"], "translation_valid_pairs": meta["translation_valid_pairs"], "output": str(args.output)}))
    except ToolError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
