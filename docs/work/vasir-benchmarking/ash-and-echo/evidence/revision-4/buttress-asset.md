# Charcoal buttress asset

Generated September 5, 2026 through the built-in `image_gen.imagegen` tool. One generation, no reference-image inputs, no API/CLI fallback, no image editing or postprocessing. The tool did not disclose a model version.

- Runtime asset: `site/ash-and-echo/assets/charcoal-buttress.png`.
- Original: `/Users/erikhazzard/Library/Application Support/Ratatosk/workspace/agent-account-contexts/codex/acct_Ah4F4kNtKtC-JmD5/generated_images/01a0722e-5e79-7883-86dd-4647d0ef0b0f/exec-5d3d53e0-1512-4559-8762-f70d7123eaf9.png`.
- PNG, RGBA, 1024 × 1536, 1,267,755 bytes.
- SHA-256: `d3e33eec45d8baf1268a1828af8bdbdd1b08578d30ebc82446ef0d3d97a40fbd`.
- Original source retained; workspace copy is byte-identical.

## Inspection

The result is a single broad diagonal rib fused into a right-side pier, with a large open aperture below and a broken taper at lower left. It uses graphite planes and restrained brush grain. It contains no masonry grid, filigree, floor, props, text or baked scenic background. The top continuation is intentional. The source has complete visible side/bottom contours; only negligible alpha-1 residual pixels reach the rightmost boundary.

Pillow read-only inspection confirms alpha extrema 0–254. **71.8751% of pixels are fully transparent**; 26.7960% have alpha above 200. Representative aperture pixel (500,1100) and upper-left exterior pixel (500,400) are alpha zero; the solid pier at (930,80) is alpha 253. All four corners are alpha zero. No fully opaque 255 pixels exist, but the structure's core is effectively opaque at alpha 253–254. There is no opaque rectangular matte.

The delivered silhouette fills about 28.1% of the image rather than the prompted 35–45%. Its large visual opening is useful for composition, but root should account for that coverage when placing it. This is asset validation, not evidence that the integrated game has adequate middle-distance mass. Preserve this full-resolution source through runtime preparation; do not repeat the previous 440px/180px downsample-and-enlarge treatment as a substitute for intentional focus. Root owns integration, screenshot checks and performance proof.

Validation used Python/Pillow only to read image mode, dimensions, alpha histogram, representative pixels and boundary pixels, plus SHA-256/byte equality after copying. No pixels were altered.

## Final prompt

```text
Use case: stylized-concept.
Asset type: ONE isolated transparent PNG scenery cutout for the middle distance of an original 2D Gothic ruin platform game. Portrait 1024 x 1536 pixels. This is a compositing asset, not a finished scene.
Subject/composition: a massive broken flying buttress fused into a leaning Gothic pier, seen straight on in a side-view game. One broad diagonal structural rib rises from lower-left to upper-right and connects to a broad near-vertical pier in the upper-right quarter. The vertical pier visibly continues beyond the top edge; all remaining contour ends are complete within generous transparent side and bottom margins. The lower-left end tapers to an irregular old fracture. The joined structural mass occupies roughly 35–45% of the image. A very large irregular empty aperture/void occupies the middle and right under the rib. The aperture is actual transparency, continuous with the surrounding empty space. The subject's broad shape must read immediately when 390 pixels wide. No horizontal walkable caps, no floor.
Art direction: painted CHARCOAL SILHOUETTE. Bold solid asymmetrical architectural mass, only 2–3 LARGE flat facets total. Matte graphite primary face #34383b, shadow face #282c30, one restrained facet #4c5255. Sparse subtle charcoal brush texture inside the solid mass, broad rough planes and organic worn silhouette. It should feel like a vast severe ruin, structurally heavy and nearly abstract. Controlled coherent 2D painted edges, adequate full-resolution contour quality. Atmospheric silhouette craft, original design.
Transparency: genuinely transparent background with alpha zero outside the subject and throughout the huge opening. No gray/white/black backdrop, no checkerboard drawn into pixels, no fog or cast shadow outside the object.
Avoid: small stone blocks, masonry grids, brick seams, filigree, tracery, spires, window ornaments, moldings, carved symbols, engraved decoration, flowers, ivy, ropes, chains, small props, characters, text, logos, watermarks, scenic background, haze baked into the asset, photoreal stone, metallic bevels, bright edge lighting. Do not add an extra disconnected stone. Return the single isolated alpha cutout.
```
