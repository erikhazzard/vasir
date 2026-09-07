# First GPU prototype review

Current live8317, 2026-09-05. Full #game-frame captures include both composited canvases. Real keyboard down/up driven movement; no pose or camera arrangement. Native390×844 and desktop1280×968 DPR2. Sources reviewed: depth.js and atmosphere.js. No product edits or performance run.

**Verdict: B+ world, improved from B; atmosphere is not yet the requested visible step to S.** The composition is cleaner and distance is easier to read. Removing crossing duplicates and moving the smaller blurred bell tower off center works. At105m, there is finally a substantial open interval above the single middle-distance arch. At142m, the gameplay bridge reads cleanly against distant architecture. Values and focus now separate scenery distances.

**Light/fog does not visibly read in motion.** Opening idle captures separated by3.6s look almost identical. In the open-air patch x160–200,y250–520, mean RGB difference≈0.28/255 and max2/255. Another air patch x95–210,y370–465 changes≈0.4/255 on average. These figures substantiate the visual impression; they are not performance metrics. The only readily visible ambient changes are birds/ash and normal parallax during climbing.

I initially associated the black horizontal cap nearx0–78,y176 with the new foreground fragment. Baseline comparison shows that cap was already present as a physical gameplay rib; this attribution is retracted. The new close fragment does not have a strong separate visual identity in the inspected frames.

## Highest-impact repair: one visible light volume

The far image leaves too little luminance headroom. Current background pixels are around200, while the air color is217 and the principal beam alpha often around.05–.12. Mixing these changes the scene by only1–2 brightness levels.

- Reduce far grade113–216 to approximately96–184; aim actual unlit open air155–175.
- Make only the air draw after bell/before middle stone the principal shaft: opacity.85–.95, color(.94,.94,.89), target composite maxalpha.35–.45. Keep far air near.12 and near air.06–.08.
- One diagonal volume should enter aroundx280,y0 and run towardx90,y650, width55–80px. One interrupted companion may reach at most25%strength. The middle stone masks the beam; foreground actors remain black and crisp.
- Target shaft core195–210 against outside air160–175. This should produce an obvious local20–30level difference instead of increasing uniform gray haze.
- Localize one fog bank around world-space p.y≈1850−.12*p.x for the principal air camera*.35. At the opening this places the shelf aroundscreeny510–570. Sigma55–70px, coarse features70–140px, maxalpha.18–.25; drift8px/sec horizontal and2px/sec upward. It should partially obscure the tower base while leaving the upper bell identifiable. Existing full-window banks lack a recognizable edge or location.

Success: in an unzoomed native2-second sequence, a fog edge moves across distant stone and a distinct diagonal shaft is interrupted by solid middle stone. The background is darker outside the shaft while the gameplay silhouette and ledge rims retain their current values. No additional scenery is needed for this repair.
