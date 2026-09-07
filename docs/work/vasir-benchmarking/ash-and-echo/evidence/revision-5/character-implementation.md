Character animation pass — 2026-09-05

Changed production file: site/ash-and-echo/character.js only.
SHA-256: 6c9055ed1d360e049f178d3e359b26a1282ff90bf7f53ec00d1463875f149da8

State changes:
- Launch: 40ms moving compression-to-stretch, 1.82 peak height, focused face, release through 250ms.
- Apex/fall: round released shoulders versus upward-raked mantle and lower-body pull; gaze and crown follow that distinction.
- Wall: 140ms catch compression, then asymmetric hand contact. Wall kick compresses, extends to 1.62 height, and rotates through recoil over 330ms.
- Second jump: folded .61-height pose opens to 1.51-width ragged bloom; 100ms broad key before pull-through. New impulse interrupts old trajectory.
- Landing: 65ms impact squash, 170ms rebound peak, 360ms settle; grounded fibres sweep sideways. Short fixed-position contact ink and grazing surface glints.
- Trail: 8-world-pixel spaced points along actual travelled segments; connected narrow ink gesture with broken hairs, 120–150ms life and 68px extent. No duplicate faces or filled afterimage discs.
- Death: preserve impact scale/angle, shear the actual contour into four textured pieces through the existing 260ms death interval.
- Reform: inward curved wisps, grounded mound, rising overshoot, 340ms settle. Eyes arrive after the mound has substance.

All presentation-only, dt-driven, fixed pools (12 wake points, 6 contact marks, existing 38 flecks / six five-point mantle chains). Existing Gentler effects governs trails, particle count, exaggerated motion and reform wisps. No physics, audio, input, renderer API or camera changes.

Evidence:
- before/: native keyboard capture before character changes, with ongoing environment work visible.
- after/: final native keyboard sequence with post-render composite of atmosphere + game canvas; JSON has exact state/event ages. Actual 390x844 mobile viewport, DPR2 canvas frames; no synthetic player teleport/state arrangement.
- arranged-poses.png: ten arranged animation states at 3x and 1x for shape critique, not a live-play proof.
- contract-check.json: 1800 real deterministic game frames, 73 events, no simulation mutation, Canvas state leak or pause drift. Reset, restart and reduced motion covered.
- node --check passed.

Native sequence covers launch, second jump, apex, fall, landing, wall-slide, wall kick, death and reform. No browser errors. The root owns combined full-route play, real touch/desktop coverage and quiet sustained performance. This pass does not establish an S grade or device performance.

Known separate renderer VFX: some soft smoke particles form gray floor discs after takeoff, and its respawn ring extends below the floor. These were reported to root and are outside character.js ownership. Character contact marks are thin and floor-bound.
