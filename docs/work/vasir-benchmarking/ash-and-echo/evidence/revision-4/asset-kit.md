# Charcoal architecture atlas — cohesion pass

Selected runtime file: `site/ash-and-echo/assets/charcoal-architecture.png`.

The selected file is an **unaltered byte-for-byte copy** of built-in image generation attempt 2. It has real alpha, four complete separated silhouettes, a flat walking top on each platform, and a spare pointed gateway. No chains or text are present.

## Provenance

- Tool: built-in `image_gen__imagegen`; actual underlying model was not reported.
- Generated source: `/Users/erikhazzard/Library/Application Support/Ratatosk/workspace/agent-account-contexts/codex/acct_Ah4F4kNtKtC-JmD5/generated_images/01a0722d-5beb-7dd1-81df-abbb1f9cd3ce/exec-8a85414b-5424-4cd3-907c-21e6effd23e2.png`.
- Canvas: 1536 × 1024, PNG RGBA, 1,103,578 bytes.
- SHA-256: `c2792480e5ced5af1632260fe0b4190691dc624ed1bf5a4f48e5313981231052`.
- Read-only Pillow inspection and built-in image viewing were used for validation. No generated pixels were edited in scripts.
- The supplied LIMBO screenshot and original Gothic portrait target were viewed before generation.

## Source crops

Coordinates are source image pixels. Use `drawImage(image, x, y, width, height, ...)` with these source rectangles. All four contours remain naturally complete.

| Object | x | y | width | height | Visible alpha ≥16 bounds, absolute |
|---|---:|---:|---:|---:|---|
| Side-supported ledge | 40 | 80 | 740 | 315 | (61, 98)–(761, 365) |
| Floating island | 825 | 100 | 665 | 300 | (843, 117)–(1470, 379) |
| Hanging masonry rib | 225 | 480 | 300 | 470 | (245, 498)–(501, 933) |
| Spare gateway | 920 | 440 | 455 | 507 | (938, 460)–(1355, 926) |

The complete visible objects have 15–30 pixels of padding inside these crop rectangles. The sampled outer row/column of every listed crop is fully alpha zero. The gateway opening is transparent; sample source (1140, 740) is RGBA (0, 0, 0, 0). The side ledge's walking top is near source y=100; the island's is near source y=120. Place the actual painted surface against the collision line, allowing for the crop's transparent top padding.

Preserve the painted underside and end tips. The island narrows naturally at both ends. The side ledge is intended to overlap the left wall with its heavy left support; mirror it for a right-wall attachment. The rib needs its broad upper mass overlapped by actual surrounding architecture so it reads as hanging masonry. The gateway should be small and restrained in the scene.

## Validation and limits

- 1,230,975 / 1,572,864 pixels (78.26%) have alpha zero.
- 296,444 pixels have alpha ≥240; alpha extrema are 0–254.
- The image is not an opaque rectangle and does not contain a painted checkerboard.
- Main silhouettes were visually inspected and have no crop-boundary truncation.
- Some alpha=1 specks exist outside the supplied crops, so use the crops, not the whole sheet.
- **Material limitation:** native fresh generation continued to produce faint faceted stone shading instead of the requested almost-flat ink interior. This selected candidate is the quietest complete usable alpha version. It is a cohesive dark stone kit, but the asset alone does not prove the game's final visual quality or an S-level result. Judge it at runtime scale against the atmospheric background.
- No product code was edited. Root owns runtime wiring and screenshot review.

## Iteration record

1. Fresh generation: real alpha, overly detailed roots and cramped gutters; rejected.
2. Fresh generation: real alpha, complete well-separated objects and spare gateway; selected.
3. Style-only edit: flatter painted masses, but RGB with a baked checkerboard; rejected.
4. Background extraction edit: still RGB with a baked checkerboard; rejected.
5. Fresh generation: real-alpha-style output, but more pronounced arched support detail and clutter on platform tops; visually inferior to attempt 2, rejected.

## Exact selected prompt

```text
Create a game sprite atlas on a GENUINELY TRANSPARENT PNG background. Four hand-painted charcoal silhouette cutouts in a 2 by 2 arrangement. 1536 x 1024 landscape.
The shapes must look like BLACK INK PAINTINGS, spare and almost flat. Do NOT render realistic rocks. Treat them as silhouettes made with a loaded charcoal brush. Opaque near-black bodies with only TWO restrained dark graphite planes suggesting structure. At most a few sparse tiny dark gray chips along upper edges. Absolutely no shiny rock texture, no light gray surface, no realistic 3D lighting, no bevels, no photographic texture. Designed to read at small game scale in a LIMBO-like atmosphere, using original Gothic ruin shapes.
Use generous cell margins. Entire top row lies between y=75 and y=410; entire bottom row lies between y=600 and y=950. Left objects between x=90 and x=690. Right objects between x=850 and x=1450. These are placement instructions ONLY: no labels, lines, boxes, or numbers drawn anywhere. Every object fits wholly inside its own bounds with clear empty gutters.
Top left: a wide FLAT-TOP BROKEN LEDGE seen exactly from the SIDE. A stout masonry root supports its LEFT side, and the shelf projects to the right. Its solid black ragged underside starts deep on the left and tapers up to a thin broken right tip. Low-profile left support stays entirely BELOW the walkable flat top, with no tower projecting upward. No roots, branches, or trim on this ledge.
Top right: one FREE FLOATING STONE ISLAND seen exactly from the SIDE. Flat walking top, clean narrow top edge, wide black mass tapering at BOTH ragged end tips; the rocky underside forms a broad irregular downward wedge with a naturally closed contour. No vertical rectangular sides.
Bottom left: one narrow HANGING BLACK MASONRY RIB, a simple ragged tapering mass with two thick torn root points. Broad broken top and tapered bottom, entirely contained. No cables or chains.
Bottom right: one small spare RUINED GATEWAY: two simple slightly leaning monolithic BLACK uprights joined by a pointed broken lintel, open transparent doorway. Make each upright a single spare broad black stroke. Simple empty pointed opening. No tracery, carving, filigree, windows, steps, stairs, decoration, pedestal, or floor. The gateway uses the same nearly flat charcoal material as the ledges.
Only four subjects. NO setting. NO fog, glow, soft halo, dust, detached rubble, cast shadow, chains, humans, white matte, black backdrop, checkerboard, labels, grid or text. Background must be empty alpha transparency. Use opaque solid silhouettes with clean antialiased contours; empty transparent pixels occupy all margins and gutters. Preserve naturally closed complete contours of all four objects; nothing touches image edges.
```

