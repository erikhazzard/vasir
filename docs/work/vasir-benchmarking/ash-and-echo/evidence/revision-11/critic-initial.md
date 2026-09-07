# Revision 11 independent active-play review

Scope: initial integrated revision 11, before the later fog/shadow-strengthening pass announced by root. Native visual sequence judged before inspecting implementation or revision-10 comparison. Production unchanged. All review browsers closed.

Verdict: active play SLAPS; strong A/A+ territory, **S is not established**. The first action, player location, contact, threat, and desire to continue all read. The added light/shadow work is integrated, but its causal motion is too quiet to carry the proposed quality step by itself.

Active-play read: I am the little eyed ash creature; I should climb the broken stone and suspended slabs toward the light. The fall and spikes make the gaps matter. Jump stretches the body upward, sheds broken ash, and leaves a readable trajectory; landing compresses it against the stone. The checkpoint visibly wakes after contact. I would keep playing. Biggest residual visual ambiguity: which moving object casts the very soft local shadow changes.

Style/profile: painted and textured 2D gothic platformer; exploration/physics profile, low information density, fixed portrait composition and upward camera. Terrain edges and red spike silhouettes appropriately win over atmosphere.

Required repair to support the S target:

- Make the existing local cast shadow readable as a moving object's consequence. Evidence: `arranged-motion/ledge-13-0-before.png` → ordinary direction/Space input → `ledge-13-2-jump.png`, `ledge-13-4-jump.png`, `ledge-13-6-after.png`. The checkpoint lights and bell visibly changes angle, but the changing projected bell silhouette does not announce itself at native scale. The ordinary full-route sequence has the same quiet read. Root's proposed local light absorption and stronger receiving-plane shadow address this symptom. Preserve scene coordinates, world motion, and restrained density. A darker unconnected stripe would not solve the issue.

No required window or ashflow repair found:

- Openings read as narrow recessed gothic masonry slits, not interface badges. They are repeated motifs but sit plausibly in the side stone. Their relationship to visible beams is coherent.
- Ash in `arranged-motion/ledge-26-0-before.png` → `ledge-26-1-jump.png` → `ledge-26-3-jump.png` → `ledge-26-6-after.png` reads as uneven charcoal wisps with broken trailing fragments. No batwing symmetry, smooth jelly sheet, or solid ribbon showed up in these native jump moments.
- Fog reads clean. Middle/upper scalloped masses have more body; opening remains mostly restrained depth haze. No jump-driven whole-depth deformation or border seam appeared. Matching before/after scene stills inspected only after first independent judgment show a modest improvement, not evidence for S by themselves.

Material and coverage:

- Mobile 390×844: `play-before.png`, `play-firstjump.png`, `play-airjump.png`, `play-after.png`; real normal input from start.
- Full informed native-input climb: `full-route/video/5f16fddf3c6ecfbb0734b9fc25e02862.webm`; `full-route/receipt.json`. 29 landings, deliberate checkpoint death/recovery, summit, restart, no page errors. This is informed automation, not newcomer or human timing evidence.
- Whole climb native-scale frames: `full-route/00-opening.png` through opening landmarks, then `10-band-8-motion-0.png` through `18-band-0-motion-2.png`, three resting frames in each of nine height bands. Player eyes, spikes, landing edges, and hierarchy remain readable throughout.
- Desktop 1280×900: `arranged-motion/ledge-7-1-jump.png`; actual game scale inside its desktop frame.
- Arranged starts only, followed by normal browser input/simulation: lower ledge 7, checkpoint approach ledge 13, sky approach ledge 26. Frame sequences and videos in `arranged-motion/`; exact snapshots in its receipt.
- Coverage limits: no sustained device/performance test, no touch-movement feel claim, no independent hand-played route completion. Full route was viewed as native frame sequences; the recordings preserve the complete motion for human review.

Optional polish: differentiate a few upper apertures through stone surround silhouette only if repetition starts to feel tiled. This is lower value than establishing a clear moving shadow. Do not enlarge or brighten every opening.
