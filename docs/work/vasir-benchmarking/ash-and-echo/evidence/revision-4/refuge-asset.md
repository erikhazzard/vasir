# Refuge bridge runtime asset

Runtime file: `site/ash-and-echo/assets/charcoal-refuge.png`.

Generated through built-in `image_gen__imagegen`, then copied unchanged into the workspace. No API fallback, pixel editing, or product code changes. The existing `charcoal-architecture.png` sheet was viewed before prompting.

## Provenance

- Original: `/Users/erikhazzard/Library/Application Support/Ratatosk/workspace/agent-account-contexts/codex/acct_Ah4F4kNtKtC-JmD5/generated_images/01a0722d-5beb-7dd1-81df-abbb1f9cd3ce/exec-a596d146-722b-45cb-8f75-68dd9d7678fc.png`.
- Actual underlying model not exposed by tool.
- Format: PNG RGBA, 1536 × 1024.
- Runtime file is byte-identical to generated original.

## Crop and placement

Use source rectangle `[15, 180, 1500, 635]` (x, y, width, height).

The alpha ≥16 silhouette bounds are source `(32,195)–(1496,797)`. Complete left and right supports and all feet are inside the crop. All four crop border alpha maxima are **0**.

- Painted top rim: source y≈200–218, or crop y≈20–38. Keep existing collider top and position the painted walking rim against it.
- Entire cap is continuous by source y=220. Avoid aligning the crop's transparent top edge directly to the collider.
- Highest arch opening: source x≈770, y≈275.
- Wide arch opening descends toward its massive supports. Mid-height transparent region extends roughly from x≈395 to x≈1170 at source y=500.
- Feet finish near source y=797.
- Embed the heavy ends into the actual side walls. Preserve the broad central arch and the painted underside to break the repeated floating-wedge silhouette.
- At native aspect ratio the crop is about 2.36 times wider than tall.

## Alpha proof

Read-only Pillow inspection:

- Image mode RGBA; alpha extrema 0–254.
- 1,158,576 / 1,572,864 pixels (73.66%) have alpha exactly 0.
- 389,410 pixels have alpha ≥240.
- Empty source samples (768,400), (768,700), (500,600), (1000,600), (768,1000), (10,500), and (1520,500) all have alpha 0.
- Bridge samples (768,230), (250,550), and (1300,550) have alpha 252, 253, and 253.
- All four edges of the recommended crop have alpha maximum 0.
- Very low alpha=1 specks extend outside the recommended crop. They are excluded without modifying the original file.

The full generated image was visually inspected. It contains one complete arched bridge with a continuous walking top, two supported ends, and transparent negative space under the arch. No chains, UI, entities, carvings, tracery, or planted ground.

## Material and composition limits

The generator made the bridge wider than the numerical placement hint and brought the complete feet to about 40px from the image sides rather than the requested 100px margins. The recommended crop still includes complete silhouettes with transparent padding. Individual stone blocks are more explicit than the platform kit's large rock planes, while color, low value, rough material and near-black arch interior are consistent. Assess its actual in-game scale and darkness before judging the final scene.

## Exact prompt

```text
Use case: stylized-concept.
Asset: ONE isolated side-elevation stone refuge bridge sprite for a charcoal silhouette platform game. A genuinely transparent PNG with real alpha outside the bridge and through its arch. 1536x1024 landscape canvas.
Subject: a broad ancient broken masonry bridge with a FLAT CONTINUOUS WALKING TOP, and two massive near-black masonry supports at BOTH ends. One huge broad clean rounded arch opening under the deck creates open transparent negative space. Think a weighty ruined stone aqueduct span reduced to a painted black silhouette, without a setting.
Composition and exact overall form: the complete bridge occupies x=180 to 1350. The usable walking top is one continuous almost-horizontal rough-hewn stone cap at y=200, from left end to right end. The central arch's transparent opening reaches its highest point at approximately x=765,y=275, leaving a thin but solid deck overhead. That broad arch curves down toward x=360,y=700 and x=1170,y=700, into two heavy irregular tapering black masonry feet extending down to y=850. The arch opening beneath the bridge is completely empty and transparent, continuously open to the background below. Broad span, not a narrow pointed doorway. Both outer ends are heavy stone roots that can embed into walls. No barriers or stones above the flat walking top. Every edge and every support foot has a naturally closed complete irregular contour contained within the canvas, with at least 100px empty margins.
Art direction: near-black #0a0c0e opaque bodies, coarse irregular ruined rock silhouette, two or three very subdued broad graphite-gray faceted painted planes suggesting chipped stone, quiet broken rim along the top. Cohesive dark charcoal material; mass and negative space dominate. Hand-painted charcoal concept art for LIMBO-like gameplay hierarchy. Side elevation, not isometric or miniature perspective. Spare, heavy, ruined, readable at small runtime scale.
Avoid: realistic photographic texture, detailed 3D rendering, intricate Gothic filigree, carvings, ornamental tracery, handrails, upper towers, stairs, doors, hanging chains, dangling wires, vegetation, sky, ground plane, floor beneath the feet, other objects, characters, monsters, UI, text, labels, borders, checkerboard, solid-color background, fog, glow, halos, cast shadow, detached rubble. The bridge is the only subject. True RGBA alpha transparency surrounding its complete silhouette and inside the entire arch opening.
```

