# Skill condition — raw response

Static topology disposition: `SAFE_LOCAL_CHANGE`. One `requestAnimationFrame` owner drives one main terminal write plus one shared offscreen ripple pass while active; ripple count scales draw groups, not passes or targets. This is topology-safe, not evidence that it is fast.

1. **P0 — Workload incorrectly scales with refresh rate.** `i % 3` and `i % 10` produce twice as many ripples/drops at 120 Hz as at 60 Hz, while lower FPS reduces load and masks regressions. Replace frame-count spawning with time accumulators at explicit rates, cap catch-up, clamp the first/long `dt`, and use a fixed simulation step if outcomes matter.

2. **P0 — Excessive mobile pixel cost.** The main PBR water pass and full-screen RGBA8 ripple target both run at up to 1.5 DPR; the water fragment shader performs three normal-map samples plus the ripple sample. Add a total-pixel cap/dynamic render scale, render the ripple target at half or quarter linear resolution, and disable its unused depth/stencil buffers. Derive screen UVs from the actual main drawing-buffer size; keep target texel size separate.

3. **P1 — Ripple draw cardinality is the largest structural cost.** Up to 200 ripples become 400 transparent meshes/draws, 400 cloned materials, and forced rendering via `frustumCulled = false`. Compact visible active ripples into shared instanced/batched draw groups with per-instance transform and opacity, retaining the existing single ripple pass and target. Verify overlapping reverse-subtract/add blend ordering before accepting batching.

4. **P1 — Drops duplicate resources and draws.** Fifty drops each allocate their own sphere geometry and material. At minimum share both; preferably render active drops as one `InstancedMesh`. The existing pools and reused vectors are otherwise good hot-path choices.

5. **P2 — Trim secondary costs.** Use `FrontSide` where the camera cannot view beneath the water, gate `StatsGL` GPU queries/DOM updates outside measurement runs, coalesce resize reallocations, and add teardown for the RAF, listeners, controls, render target, environment target, textures, geometries, materials, and renderer.

Validate on target phones with a fixed 0/50/100/200-ripple workload at 60 and 120 Hz. Record CPU update/submission time, GPU time per scene submission, draw calls, frame-time percentiles, render-target memory, and thermal behavior. Render-scale sensitivity distinguishes fill-rate pressure; batching should reduce draw count without changing the fixed one-owner, one-offscreen-target topology.
