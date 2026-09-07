# Isolated charcoal bell asset

Generated September 5, 2026 through the built-in `image_gen.imagegen` tool. One new generation, no reference inputs supplied to the tool, no API/CLI fallback, no generated-image editing. The belfry bell was visually inspected as direction before this isolated sprite was requested. The tool did not identify a model version.

- Runtime asset: `site/ash-and-echo/assets/charcoal-bell.png`.
- Original retained: `/Users/erikhazzard/Library/Application Support/Ratatosk/workspace/agent-account-contexts/codex/acct_Ah4F4kNtKtC-JmD5/generated_images/01a0722e-5e79-7883-86dd-4647d0ef0b0f/exec-e414331b-2620-4d56-8e48-8e3fdc7a8151.png`.
- Actual output: **1254 × 1254** RGBA PNG, 1,076,254 bytes. The requested 1024 × 1024 was not the returned size; no resize was performed.
- SHA-256: `59f32f7084adb0d4be233151ebff85042d141cd3d3a3569e05bf86857894ae84`.
- Runtime copy is byte-identical to the original.

## Validation and drawing coordinates

Read-only Pillow inspection confirms alpha extrema 0–255, **65.0115% fully transparent**, 34.1221% above alpha 200. All four corners and the loop opening at (626,120) are alpha zero. Bell body at (626,580) is alpha 253. No tower, beam, stone, floor, matte or painted checkerboard surrounds the subject. Full inspection is retained in `bell-alpha-inspection.json`.

The visible silhouette (alpha >8) occupies source bounds **x169–1085, y40–1201**, exclusive maximum coordinates. The substantial core (alpha >200) occupies x170–1083, y41–1198. Lower-alpha residual pixels extend farther but are not part of the substantial contour.

Recommended source rectangle:

```js
{ sx: 155, sy: 26, sw: 944, sh: 1190 }
```

This preserves roughly 14–15 source pixels of clear padding around the visible bell, clapper and hook. **Every pixel on this crop's four boundary lines is alpha zero** (checked directly). It contains the isolated subject only. Use this rectangle in rendering while preserving the original asset file unchanged.

The hook's top core is at source Y41, centered near X627. At a 48 × 60 destination rectangle, that maps to local **(24, 0.76)**. Positioning the destination rectangle approximately 0.8 world units above the intended deck attachment places the hook against the underside. Root may hide a little more of the loop under the solid deck if needed. The source contour's width/height ratio is approximately 0.789, close to the requested 0.8 destination ratio.

`bell-preview-48x60.png` is an ordinary browser screenshot of the unchanged PNG, drawn from that source rectangle into a 48 × 60 destination over neutral gray. It shows a complete flared bell, small top loop and one lower clapper with clear surrounding air. This screenshot is evidence only; it is not the runtime image. No product code was changed.

Self-critique: the generated bell includes brighter material wear and more surface grain than the strict 2–3-plane prompt. At 48 × 60 it remains a readable dark bell, but runtime value compression should keep its relief consistent with the charcoal world. The asset resolves the failed belfry crop's stone contamination; it does not prove that the summit composition or attachment is correct in play. Root owns that integration check.

## Why the earlier belfry crop was rejected

The old bell's flared rim reached approximately X441–603, while the tower intruded to X443 on the left and X598 on the right at other heights. A rectangle wide enough for the complete bell necessarily included stone. A clean independent sprite avoids both clipped bell contours and hidden tower slivers.

## Final prompt

```text
Use case: stylized-concept.
Asset type: ONE isolated hanging bell and clapper sprite on genuinely transparent PNG, 1024 x 1024 pixels. Runtime use: a compact destination bell hanging under a stone deck in a side-view 2D Gothic ruin platform game, reading at about 48 pixels wide by 60 pixels tall.
Subject: one simple heavy old bell, seen straight on with just enough view into its underside to see the dark flared mouth. A squat domed crown flows into a broad smoothly flared bell skirt and a thick oval lower rim. One short central stem ends in a simple teardrop clapper protruding clearly below the bell. A TINY simple attachment loop sits on the exact top center of the bell; this is the only attachment, with no beam or support. Complete outer contour of bell, rim, clapper and hook. Compact strong silhouette. Slight irregular wear to feel old, no holes or missing chunks.
Framing: center the whole bell in the image. The entire bell including hook and clapper occupies approximately x180 to x845 and y80 to y930. Keep generous clear TRANSPARENT padding on every side. The metal bell body must be visually broad, with the silhouette width about 0.8 times the total hook-to-clapper height. The hook sits at image center x512. No part is cut off.
Art direction: bold graphic painted CHARCOAL, compatible with matte graphite Gothic scenery. Just 2–3 large muted value planes: body #34383b, shadow #20272b, one broad subdued facet #4c5255. Dark solid core, broad plane grouping and sparse soft charcoal brush grain inside it. Restrained edge wear only. Readable as a solid bell at tiny size. The opening beneath is dark material, with the single clapper silhouetted against transparent air.
Transparency: true alpha zero outside the hook, bell and clapper and through the tiny hook opening. Only antialiased contour pixels around the subject; no scenic haze, external glow or shadows, backdrop, gradient, white/gray matte or baked checkerboard.
Avoid: tower, beams, stone, masonry, doorway, platform, large chain, hanging rope, supports, filigree, engravings, symbols, lettering, cracks that divide the bell, shiny metallic highlights, photorealism, ornate ornament, many facets, decorative tassels, extra bells, extra clappers, detached objects, UI, text, logo, watermark. Return the single clean isolated alpha sprite.
```

