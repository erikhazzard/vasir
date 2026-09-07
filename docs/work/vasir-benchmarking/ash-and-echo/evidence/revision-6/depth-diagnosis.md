# Living depth diagnosis — 2026-09-05

Read-only baseline inspection plus two explicitly delegated image assets. No product JS/CSS/HTML edits.

## Evidence

- Live URL: `http://localhost:8317/`, Chrome, 390×844 and 1280×968, DPR 2.
- Native live screenshots: `mobile-0.png`, `mobile-3.png`, `desktop-0.png`, `desktop-3.png` in this directory. Camera fixed at the start floor; birds visibly shift a little, but fog movement is hard to recognize. Captures use SwiftShader and are visual evidence, not target-device performance evidence.
- Causal isolated far-layer browser comparison: `far-baseline.png`, `far-no-blur.png`, `far-original.png`. Route overrides remove other scenery/air and change only the source grade expression; product files remain untouched. `far-no-blur.png` removes only the 4.5px Canvas2D blur and restores recognizable arches, spires, and masonry. Raw WebGL upload/draw path is unchanged. Therefore injected blur is the primary far-city blob cause, with linear contrast compression an additional cause. No Three.js tone mapping or global postprocess exists in this compositor.
- Source backdrop is 948×1659. The blur helper pads it to 980×1691, then rendering forces 610×1519 at the mobile viewport: approximately 1.44× vertical distortion compared with its natural aspect.
- Opaque source luminance p5/p50/p95 and post-grade values: city `108/201/247 → 129/163/180`; belfry `26/41/75 → 133/135/140`; buttress `28/43/75 → 75/78/84`. The belfry and buttress grades reduce useful stone detail to a handful of intensity levels before blur.
- The original backdrop has a baked flying flock at approximately source x540–690,y450–620. Live procedural flock work cannot animate these source pixels.
- The near black blob comes from `charcoal-architecture` crop `(225,480,300,470)`: the tapered little platform fragment, then grade3–8, blur8, and clipping to the edge strips. Its subject is removed by its own crop/grade/placement.

## Six prescriptions

1. **Restore distant architecture.** Delete the far source blur entirely; the source painting already contains atmospheric depth. Use its native aspect with a single explicit cover/crop transform. Keep a light gray distant city with small readable architectural edges. For dark transparent assets, normalize the useful source luminance band before grading instead of remapping the entire 0–255 interval; target a real 25–40-level useful material range. Keep the bell/arch contour recognizable with roughly 0–1 display-pixel blur, not the current texture-wide wash. Validate at native mobile size.

2. **Replace the existing beam/banks with one coherent moving density field.** Delete the hard-coded `axis650/720`, `bank950/1850`, and Gaussian-width68 fog composition instead of stacking more air atop it. Retain the three existing scenery air positions and use distinct per-layer world parallax, scale, drift, and opacity. Two different drifting noise samples should change the density shape even when the camera is stationary. Use gray-white fog with slightly varied lightness and broad horizontal flow; its edge should never close into an obvious oval cloud sticker. Let moving fog alternately expose and cover a recognizable background edge over 2–4 simulation seconds.

3. **Extract the reference's noise, not its renderer.** `/Users/erikhazzard/code/experiments/fog/index.html` lines105–161 bake one tileable 256² RGB texture: R is warped fBm, G squared billow noise, B two broad octaves. Lines718–734 mix two drifting samples `.72*R(base+velocityA*t)+.28*G(base*2+velocityB*t+offset)` and apply smoothstep density plus broad border fade. This is sufficient for the current compositor. The reference's camera shells also mix world and screen coordinates so motion remains readable near the orbit target. Do not copy its separate post targets, bloom passes, 3D fog injection, sheets-per-mesh topology, or quality governor. Replace the current 128² grayscale noise rather than retaining both textures. Existing frame owner, framebuffer, canvas, and upload cache stay fixed.

4. **Have exactly one live flock system.** Wire `background-birdless.png` and delete the original source's baked flock from the shipped visible backdrop. Replace the nine birds' shared `clock*2.2` horizontal conveyor with two or three small formations: independent flock centers moving at roughly 8–16 logical pixels/sec, slow vertical arc, individual separation/lag, varied phase and brief gliding intervals. A fixed-camera 3-second view must reveal spatial travel, not only wing jitter. Use camera parallax only for the flock's distant depth; wrap whole flocks outside the viewport, not individual birds through visible boundaries.

5. **Replace the anonymous near crop with recognizable framing.** Delete the tiny-platform crop and four placements. Reuse the existing complete `depth-arch.png` or a recognizably connected pillar/arch silhouette. Put a substantial 30–70px slice inside one edge so it separates from the gameplay wall; retain an arch opening or a pier joint. Cache blur once in source space such that it reads as about 3–6 logical pixels at display scale. Use 1.2–1.35 camera parallax and enough alternating finite placements to show a near object every ~450–650 world pixels, with occasional clear views. Never hide the landing corridor or the hazard silhouettes.

6. **Make the ascent reveal different architectural situations.** Replace at least one repeated diagonal buttress with the new transparent `charcoal-arcade.png`. Use full arcade, a lone tall belfry, and a single crossing buttress as distinct compositions with natural empty intervals. Preserve their aspect and coherent construction; mirrored copies of the same crossing on every rung remain visibly pasted. Choose different source subjects/negative spaces instead of applying random transforms to the same silhouette. The arcade provides four unequal pointed openings and complete broken ends; it is most useful as a wide, thinner middle-distance wall behind the playable route.

## Assets

- `site/ash-and-echo/assets/background-birdless.png`: essential edited backdrop. Built-in imagegen. Flying flock removed; overall composition, Gothic subject, grayscale, fog, and gargoyle statues preserved. Generator output is 961×1637 vs original948×1659, a 2.7% aspect difference with minor repainting. Consume at its native aspect; original remains untouched.
- `site/ash-and-echo/assets/charcoal-arcade.png`: optional new scenery cutout. Built-in imagegen. 1536×1024 RGBA; 54.9% fully transparent pixels, 41.8% alpha>240. Checked all large openings: alpha0. Entire ruin present with broken ends. Four openings rather than requested three is a useful silhouette variation, not a gameplay contract. Slight muted stone hue should receive the same grayscale material grade as the other charcoal assets.

Exact generation prompts and origins are in `asset-provenance.md`.

## Proof limits

This is causal visual/source diagnosis, not release QA or a performance-win claim. Renderer topology recommendation is SAFE_LOCAL_CHANGE only if the current owner/canvas/default-framebuffer structure stays fixed and the new fog replaces old draws/texture work. Root owns implementation, integration, performance measurement, and final live review.
