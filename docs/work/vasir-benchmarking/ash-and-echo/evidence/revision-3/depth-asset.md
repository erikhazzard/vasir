# Ash & Echo depth arch asset

- Runtime file: `site/ash-and-echo/assets/depth-arch.png`
- Generated source: `/Users/erikhazzard/Library/Application Support/Ratatosk/workspace/agent-account-contexts/codex/acct_Ah4F4kNtKtC-JmD5/generated_images/01a071d1-9253-71f3-b19a-5614778d1356/exec-122212aa-2015-47fb-9a1f-7a7f351ed324.png`
- Generation: built-in `image_gen.imagegen`, one fresh generation; no reference image inputs, no API/CLI fallback, no image editing or postprocessing. Original source retained, PNG bytes copied unchanged.
- Actual provider/model: not exposed by the built-in tool response. Response fields were `image_url` and `output_hint`; no model/provider claim is inferred.
- Dimensions: 1024 × 1536 (portrait 2:3), 8-bit RGBA PNG.
- Asset purpose: one massive left Gothic pier with a pointed arch reaching overhead into the upper right, for a parallax midground behind gameplay platforms. Parent implementation owns the renderer, tone, blur, and integration proof.

## Validation

Inspected both the generated image and the local source using `view_image`. The broad stone silhouette has a large open center/right, irregular broken lower pier, no ground plane, no right pier, and no text or UI. Surface detail is restrained relative to the existing corbel, with mean near-opaque stone RGB [82, 81, 80].

`sips -g pixelWidth -g pixelHeight -g hasAlpha <source>` reported 1024 × 1536 and alpha present. ImageMagick identified `srgba` with `opaque=False`. Read-only raw RGBA inspection found:

- 1,051,421 of 1,572,864 pixels fully transparent (66.85%).
- Alpha minimum 0, maximum 254/255, mean 0.313934.
- Opening samples (600,300), (500,400), (400,700), (360,850), (330,1000), and (950,550) all have alpha 0.
- Sampled left/right margins and center top/bottom margins have alpha 0.
- Only 29 outer-border pixels have nonzero alpha, all 1/255 (tiny generated antialias residue at the top and bottom); no opaque rectangular background.

The source preview renderer displays hidden RGB beyond the silhouette, but those inspected opening and surrounding pixels have zero alpha. Runtime composition should use the PNG alpha normally.

## Final generation prompt

```text
Use case: stylized-concept.
Asset type: ONE transparent PNG midground architectural cutout for Ash & Echo, a Gothic side-view game; portrait 2:3 image, ideally 1024 × 1536.
Primary request: one huge ruined pointed Gothic stone arch viewed obliquely, rendered as an original painted-charcoal ruin with restrained photographic stone material. The heavy single supporting pier occupies the LEFT quarter of the composition and rises almost the full height. Its single broad arch curves overhead across the upper part of the image toward the upper right, ending in a ragged crumbling break. There is no right-hand pier. This is one broad, massive piece of architecture, not a skyline or a forest of spires.
Composition: subject nearly fills the portrait image with a narrow transparent margin around its irregular outer silhouette. Most of the center and right, especially the enormous opening underneath the arch, is truly transparent empty space. Make the broad pointed arch opening unmistakable at small display size. The left pier has weight and a few large readable carved courses, but restrained ornament. Its broken lower end has a rough, irregular, nonhorizontal silhouette, no flat floor or plinth.
Color/material: matte charcoal grays, stone midvalues centered near #4b5052, very low saturation, subtle broad painterly surface variation; low fine detail and low microcontrast so it can sit behind actual jump platforms. Cool gray weathered stone, no pure black filled silhouette. Even diffuse neutral surface illumination only.
Transparency: actual alpha-transparent PNG; the empty arch opening, center/right void, and surrounding background must have zero alpha. Do not paint a background of any color or a checkerboard. Preserve antialiased alpha around the stone edges.
Avoid: black background, white background, gray background, checkerboard pattern, sky, fog, haze, glow, bloom, lighting gradients, cast shadow outside the subject, ground plane, horizontal walkable ledges, second pier, extra arches, tiny spires, skyline, rubble on a floor, plants, people, character sprites, text, border, watermark, UI.
```

