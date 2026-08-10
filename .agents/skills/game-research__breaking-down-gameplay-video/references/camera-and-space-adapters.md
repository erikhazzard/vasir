# Camera and Space Adapters

Spatial inference begins by selecting a camera model. A genre label does not determine the camera model. Activate every model used by the footage and segment transitions between them.

## Universal coordinate registry

Define every coordinate system before writing spatial values:

- `source_px`: coded/display-corrected source pixels;
- `normalized_screen`: x and y in `[0,1]` after rotation/aspect correction;
- `viewport_px`: rendered report or crop coordinates—never use for game measurement;
- `world_relative`: arbitrary units tied to stable landmarks;
- `tile/grid`: discrete cells;
- `track_s`: distance along a known route;
- `angle_deg` or `angle_rad`: view/turn orientation;
- `ui_local`: coordinates inside a stable HUD panel.

Every conversion records calibration evidence, scale, offset, rotation, validity interval, and uncertainty.

## Fixed/static camera

**Activate when:** world geometry is stationary in screen space except for actors/effects.

**Can measure:** actor screen paths, relative speed, collision/contact positions, timing, stable geometry.

**Calibration:** verify several world landmarks remain fixed across active play; exclude shake/zoom/cuts.

**Trap:** a subtly drifting, zooming, or parallax camera can create false actor acceleration.

## Center-locked translational follow

**Activate when:** the player remains within a tight screen locus while the background translates, with negligible rotation/zoom over valid intervals.

**Can measure:** background translation; infer inverse player/world displacement only after validating the lock and direction.

**Calibration:** player screen-position variance, landmark re-sighting, pause windows, patch agreement, zoom/rotation rejection, independent transit arithmetic.

**Reject intervals:** dense effects dominate patches, zoom/rotation occurs, landmarks disagree, the player leaves the lock region, or confidence falls below threshold.

**Trap:** “background flow = player path” is false under dead zones, look-ahead, screen shake, moving backgrounds, or camera lag.

## Dead-zone or damped follow camera

**Activate when:** player moves inside a screen region before camera translation begins, or camera follows with smoothing/look-ahead.

**Model:** player screen motion plus camera motion are separate states. Estimate dead-zone bounds, follow gain, damping, lag, and look-ahead from repeated direction changes.

**Can measure:** screen-relative control and camera response; world path only with stable landmark reconstruction.

**Trap:** integrating background flow alone drops player motion inside the dead zone and misreads camera lag as deceleration.

## Side-scrolling camera

**Activate when:** dominant translation is horizontal/vertical, often with dead zones and one-way progression.

**Measure:** scroll thresholds, look-ahead, vertical clamps, room bounds, backtracking behavior, parallax layers, player motion relative to ground.

**Calibration:** use ground/platform landmarks and detect layer-specific flow; do not average parallax layers into one camera vector.

## Free pan/zoom/rotate 2D or strategy camera

**Activate when:** camera motion is controlled independently from units.

**Measure:** camera behavior separately: pan speed, edge scroll, drag, zoom steps, bounds, snap/focus, rotation, minimap jump.

**World reconstruction:** use stable map landmarks, minimap correspondence, grids, or homography; unit screen movement is not world movement until camera transform is removed.

**Trap:** interpreting camera traversal as unit speed or map scale.

## First-person camera

**Activate when:** camera orientation approximates player view and translation/rotation dominate the image.

**Can measure:** visible angular displacement, view bob, recoil impulse/recovery, ADS FOV transition, motion cadence, screen-space target tracking, apparent travel.

**Cannot directly measure without input/calibration:** mouse/controller sensitivity, true angular input latency, exact world speed from optic flow alone, hidden head/camera offsets.

**Calibration:** FOV from known geometry/UI only when defensible; otherwise use normalized angular-screen measures. Separate recoil, player look, animation, camera shake, and target motion.

## Third-person orbit/chase camera

**Activate when:** camera follows an avatar with variable offset, yaw/pitch, collision, or lag.

**Measure:** follow distance in screen-relative or calibrated world units, orbit speed, recentering, look-ahead, collision push-in, shoulder swap, zoom, aim mode transition.

**Trap:** avatar screen displacement combines avatar motion and camera orbit; project onto stable ground/landmarks before inferring locomotion.

## Isometric/orthographic camera

**Activate when:** apparent axes are projected with stable affine geometry.

**Measure:** movement along projected basis vectors, tile/grid dimensions, camera pan/zoom, sprite anchoring, depth ordering.

**Calibration:** fit basis vectors from grid edges or repeated orthogonal motion; store the transform and residual error.

**Trap:** Euclidean distance in raw screen pixels is anisotropic when axes have different projection scales.

## Perspective fixed/broadcast camera

Common in sports, racing replays, arena fighters, and tactics.

**Measure:** screen trajectories and event timing; world position requires field/track landmarks and a homography or known geometry.

**Trap:** apparent speed changes with depth. Never compare players at different field depths in raw pixels per second.

## Track/path coordinate camera

Common in racing, runners, rhythm lanes, rail shooters.

**Measure:** progress along a route using lap position, track markers, lane grid, note lane, or repeated landmarks. Use `track_s`, not screen x/y, when the camera changes perspective.

## Cinematic/cutscene/replay camera

Treat as a separate observational mode. It may reveal state but often breaks timing, scale, and causality through cuts, slow motion, hidden inputs, and replay interpolation. Do not mix its measurements with live-play values without proof.

## Split-screen or multi-viewport

Define independent viewport coordinate systems and source crops. Do not merge motion, HUD, audio attribution, or timing across panes. Account for asynchronous replays or spectator feeds.

## Head-tracked VR/XR camera

Treat the captured view as a render/capture product, not automatically the player’s exact binocular perception. Establish whether the video is a left eye, right eye, center-eye mirror, stabilized spectator camera, mixed-reality composite, cropped headset recording, or third-person replay. Segment recentering, snap/smooth turns, teleport fades, vignette, camera cuts, and spectator overrides.

Measure only visible head-view rotation/translation in the capture coordinate space unless controller/head poses are separately rendered. World scale may be bounded from known avatar/controller geometry visible in the footage, but physical meters, vergence, depth comfort, motion-to-photon latency, haptics, and stereo disparity are unsupported without corresponding signals.

A head-tracked camera never satisfies the center-lock inverse-player-path assumption. Spatial movement must be reconstructed from visible locomotion state, world landmarks, teleport endpoints, or tracked body/controller proxies, each with its own coordinate mapping and scope.

## Camera-model acceptance test

Before any world path or speed claim, answer:

1. Which transform family is assumed: translation, similarity, affine, projective, or unknown?
2. What landmarks or invariants validate it?
3. Over which PTS intervals is it valid?
4. What residual error remains?
5. What alternate camera model could explain the same pixels?
6. Does an independent measurement agree?

If these cannot be answered, report screen-space behavior only.
