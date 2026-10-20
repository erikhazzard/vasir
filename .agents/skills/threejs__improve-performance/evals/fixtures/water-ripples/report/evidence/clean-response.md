# Clean condition — raw response

Static audit, prioritized:

1. **Critical — ripple pass can cost hundreds of draw calls per frame.** Each active ripple is two transparent meshes, up to 400 draws, and frustum culling is disabled. The full-screen pass is effectively always active because the demo emits a ripple every third frame. Re-enable culling, stop or rate-limit automatic emission, and replace per-ripple meshes with a batched/instanced or simulation-texture approach while verifying overlapping-ripple blend order.

2. **Critical — oversized offscreen target.** `normalTarget` uses full viewport resolution at up to 1.5 DPR and allocates an unused depth buffer. Render ripples at half/quarter resolution, cap dimensions on high-resolution displays, and set `depthBuffer: false` and `stencilBuffer: false`. This substantially reduces fill rate and GPU memory.

3. **High — expensive full-screen water shader.** The water generally fills the viewport and performs three animated normal-map samples plus the ripple sample through `MeshStandardMaterial`, with MSAA enabled. Add quality tiers: fewer wave samples, lower DPR, cheaper/custom lighting on mobile, and `FrontSide` if viewing below the plane is unsupported.

4. **High — workload depends on refresh rate.** Ripple/drop creation uses frame counters, so 144 Hz creates 2.4× as many objects per second as 60 Hz and can saturate pools. Use elapsed-time accumulators with explicit per-second rates and a bounded catch-up policy.

5. **Medium — drop pooling still preserves draw-call and allocation overhead.** Fifty drops each own duplicate geometry and material, and active drops render separately. Share geometry/material at minimum; use an `InstancedMesh` if drops are numerous.

6. **Medium — profiling UI adds measurement overhead.** `StatsGL` GPU tracking runs every frame, and the CSS’s second `display` declaration overrides `display: none`. Keep instrumentation behind a debug flag and benchmark production builds without it.

7. **Low — startup/stall handling is unsafe.** `lastTime = 0` produces a very large first `dt`; long suspended frames also advance/fade everything abruptly. Initialize from `performance.now()`, clamp `dt`, and explicitly clear the ripple target to neutral gray before its first sample.
