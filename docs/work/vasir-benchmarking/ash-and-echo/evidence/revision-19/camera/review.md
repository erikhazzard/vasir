# Revision 19 camera and depth review

No material issues found in the frozen revision 19 changes against the revision 18 sources in `../baseline/`.

Reviewed source identities:

- `renderer.js`: `7950e5f7b79a1a152c681443aa2a43447f5bc2d25bbb22f09229235df879ebf1`
- `depth.js`: `8ddfb5dc3c141efef64502defc5e9d4a5c6e7197d46a45b4b625d477644e44f9`

The CSS translation, rotation, and scale order matches the inverse-corner coverage calculation and the canvases’ shared transform origin. The existing `report.json` records 2,880 samples across three widths, two directions, and four landing strengths: no geometry failures, a minimum inverse-corner margin of 6.342 CSS pixels, and settled translation and rotation of zero. Pause, Gentle mode, and restart checks pass; the source preserves zero-delta behavior and clears the transient camera response on reset.

Stronger prop impulses retain bounded motion: cages ±0.38 radians, bells and clappers ±0.32 radians, and cable bow ±25 logical pixels. Outward velocity reflects at the angle limits, with the existing 120 Hz substeps and damping retained.

The change adds no render targets, canvases, passes, frame owners, cache rebuilding, or frame-global work that scales with entity count. The new landing startle reuses the existing 19 birds. This establishes structural safety, not a measured performance improvement.

This was a read-only source review supported by the existing geometry receipt. No additional browser run was performed. Subjective impact intensity and the integrated play verdict remain with the separate play review.
