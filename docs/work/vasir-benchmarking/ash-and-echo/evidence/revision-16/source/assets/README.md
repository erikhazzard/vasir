# Generated art assets

The illustrated assets in the table below were generated for Ash & Echo on September 5, 2026 using the session's image-generation tool. Its returned metadata did not identify a model version. The selected visual reference guided composition and material choices; it is retained separately under `docs/work/vasir-benchmarking/references/portrait-wall-climber/`.

| File | Runtime role | Original generated filename |
| --- | --- | --- |
| `background.png` | Original city with painted birds; retained edit source, no longer loaded | `exec-b5f98a7b-9c01-4674-ab8a-b872bc88d387.png` |
| `background-birdless.png` | Distant mist and cathedral spires, loaded as `background`; flying birds are drawn separately | `exec-f86bd014-28e1-478d-8032-ea6f39e60035.png` |
| `midground.png` | Earlier facades; retained source, no longer loaded | `exec-b36a9d01-a7c5-4254-a3d0-f5e9c669e970.png` |
| `stone.png` | Masonry material clipped to playable geometry and cached complete foreground piers | `exec-7ed70cd6-fdeb-4371-b3e8-eeecd7a15c73.png` |
| `hero.png` | Cached eyeless material crop for live soot-body and mantle geometry; eyes are drawn separately | `exec-6a478c1e-7442-41d4-94e1-321f061dc09c.png` |
| `spider.png` | Peripheral creatures with cached body/limb cutouts and player-directed eyes | `exec-9fb9b7cc-e592-4509-9351-2a53d28f5405.png` |
| `corbel.png` | Earlier ornate ledge; retained source, no longer loaded | `exec-0f9cfe5e-985f-4652-a4af-99289881b228.png` |
| `depth-arch.png` | Earlier detailed arch; retained source, no longer loaded | `exec-122212aa-2015-47fb-9a1f-7a7f351ed324.png` |
| `shrine.png` | Earlier ornate gateway; retained source, no longer loaded | `exec-8e53a4c5-6217-4f00-b341-234432bc7f94.png` |
| `charcoal-architecture.png` | Complete ledge, free island and spare gateway; formerly supplied near stone fragments | `exec-8a85414b-5424-4cd3-907c-21e6effd23e2.png` |
| `charcoal-buttress.png` | Graded solid middle pier and arch | `exec-5d3d53e0-1512-4559-8762-f70d7123eaf9.png` |
| `charcoal-arcade.png` | Earlier distant ruined arcade; retained source, replaced by the vertical facade and no longer loaded | `exec-f4e6dcf1-e979-4413-b658-e49083c7fd99.png` |
| `charcoal-vertical-facade.png` | Distant vertical cathedral facade with true openings and piers continuing through the bottom boundary | `exec-6c5d63b5-18a7-4375-82a7-5bd4a4dd39e2.png` |
| `charcoal-belfry.png` | Distant broken bell towers, receding into air at their foundations | `exec-40febf04-3aa9-4eef-b9ea-90ce46ed32d9.png` |
| `charcoal-refuge.png` | Broad refuge bridge and summit platform, both with fixed contacts | `exec-a596d146-722b-45cb-8f75-68dd9d7678fc.png` |
| `charcoal-bell.png` | Separately cached swinging body and clapper beneath refuge and summit decks | `exec-e414331b-2620-4d56-8e48-8e3fdc7a8151.png` |

Generated exports were copied into this directory without further raster edits. `background-birdless.png` was itself generated as an edit of the retained original backdrop. Alpha channels were checked before integration. Two attempted foreground ornament exports contained baked checkerboards and were rejected; neither is used here. Parallax, fog, contact poses, ash trails, architecture silhouettes and lighting are composed by the renderer at runtime.

Main loads eleven image keys: `background`, `stone`, `hero`, `spider`, `charcoal-architecture`, `charcoal-buttress`, `charcoal-belfry`, `charcoal-refuge`, `charcoal-bell`, `charcoal-vertical-facade` and `ash-flow-atlas`. The spider and ash-flow atlas are optional. The 256×256 cloud texture is generated once per WebGL initialization from seeded RGB fields in `cloud-texture.js`; flock wing frames are painted once into a shared 256×64 atlas in `wildlife.js`. Neither requires an additional downloaded image. Five graded scenery textures and the bird atlas are cached on the GPU, alongside the cloud texture. Complete foreground piers and reactive world/character parts use Canvas2D caches.

The depth arch was generated for the human C− depth repair. Its true alpha opening was inspected before integration; 66.85% of pixels are fully transparent. The full generation prompt and validation are retained in `docs/work/vasir-benchmarking/ash-and-echo/evidence/revision-3/depth-asset.md`. Runtime compositing changes focus and tone without modifying the original PNG.

The charcoal assets replace that treatment after the subsequent human C/C+ cohesion review. They preserve genuine alpha openings and complete exposed platform contours. Runtime crops have transparent margins; the free island is its own complete shape. Full-resolution tone/focus caches preserve source contours on Retina screens. Painted underside alpha determines hanging-chain attachments. Generation prompts, source identities and validation are retained in `docs/work/vasir-benchmarking/ash-and-echo/evidence/revision-4/` as `asset-kit.md`, `buttress-asset.md`, `belfry-asset.md`, `refuge-asset.md`, and `bell-asset.md`.

The living-world revision adds the birdless backdrop and ruined arcade. The backdrop edit removes the painted flying flock while retaining the city composition and architectural gargoyles, so the two runtime flocks can move independently. Its generated export is 961×1637 rather than the original 948×1659 and contains small repainting differences; runtime preserves the export's aspect ratio. The new arcade is a 1536×1024 RGBA cutout with four large transparent openings (the prompt requested three); 54.887% of its pixels are fully transparent. Exact prompts, source paths and validation are preserved in [revision-6 asset provenance](../../../docs/work/vasir-benchmarking/ash-and-echo/evidence/revision-6/asset-provenance.md).

Revision 7 replaces the loaded arcade with `charcoal-vertical-facade.png`, an 887×1774 RGBA export. Three unequal lancet openings have genuine transparency; the vertical piers and apertures continue through the bottom image boundary without a sill or freestanding base. The generated source is preserved without raster editing, with distance tone and focus applied only in runtime caches. Exact prompt, source path and visual inspection are preserved in [revision-7 facade provenance](../../../docs/work/vasir-benchmarking/ash-and-echo/evidence/revision-7/facade-provenance.md). This replacement keeps ten downloaded image keys and five cached GPU image textures, plus the separate cloud-noise texture.

The revision also replaces the architecture-kit foreground crop with `foreground.js` silhouettes built from the existing stone material: shared cached curved piers with irregular broken ends, and folded pennants on selected placements. These require no additional downloaded art or GPU textures.

Revision11 adds `ash-flow-atlas.png`, an offline WebGL shader render rather than an image-generation export. A periodic field bakes twenty-four64×64 rolling-charcoal frames into a384×256 RGBA PNG (230,925bytes;393,216bytes nominal decoded RGBA). Runtime samples it through `ash-flow.js` in the existing Canvas character draw; no production GPU bake/copy or new rendering context is created. The optional atlas controls material porosity and folding, while gameplay, body geometry, eyes and charge state retain their existing authority. Exact shader/bake code, pixel identity and validation are preserved in [revision11 evidence](../../../docs/work/vasir-benchmarking/ash-and-echo/evidence/revision-11/README.md).
