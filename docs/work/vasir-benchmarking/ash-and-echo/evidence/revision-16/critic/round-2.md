# Integrated shader candidate round2

Verdict: **SLAPS for the bounded environment/material elevation.** This is visibly stronger than revision15 across the opening, middle, checkpoint and upper climb. The first-round patch quilt is closed, and the integration adds positive spatial hierarchy rather than merely reducing effects. No further environment implementation blocker was found in these sequences. This is not an overall S-tier grade.

## Exact reviewed source

Frozen bytes: `round-2/source/`. Full identities and15 matching served-module identities: `round-2/receipt.json`.

- atmosphere: `34ec41131f0932e1477630c758c3aef8b7f7158f55203a0ee986008917035619`
- fog-volume: `2f2e764ee0162734712a6dae5f314f5a1f2a53ae0c2d1c6569cbafc17d85c306`
- depth: `a6884bad0045bcb2022f6c82452b24abf7a5e8b5364a13cac98f21b5bc77fec1`
- renderer: `860e5cf6c5ab95d3aea1b47901e619f5bd18536cfba1d7142e0559bfd0159000`
- character: `c70b10e39927aedff00cadfe620b24973f6e531afacda6ca323c9ebef5ee3505`
- ash-flow: `86344d7474546293251e5813259fc8aaa7865d8cdc2c0a66d0354a4ff14b2bc8`

## Material and method

36 before/input/after images: native390×844, enlarged desktop1280×1300 and native390×844 using the actual Gentle effects UI setting. Four real playable arranged starts per form, followed by ordinary keyboard input and normalRAF. Native, desktop and gentle videos are retained; native10fps extraction supports temporal inspection. The stationary middle hold precedes input and separates ambient movement from camera movement.

All15 served JS identities match frozen source;0page errors. WebGL atmosphere reports5textures in all forms. Native/gentle buffer390×844; desktop game buffer510×944. Screenshots briefly interrupt timing, so this is not a performance capture. Root owns quiet combined pacing and fallback proof. All reviewer browser contexts are closed.

## Active-play read

I am the ash creature climbing through a deep, illuminated shaft. I should reach the next ledge and reserve the second jump for the open crossing. The raven transformation stays a clear answer to that input. Eyes mark the head and crimson/ivory thorns mark danger. The new air and lighting make the architecture feel farther behind the playable stone without covering the route. I would keep playing from these moments.

## What materially improved

1. **Depth now has sustained structure.** Compare `round-2/native-middle-before.png` and `desktop-middle-before.png` with the matching baseline15 views. Near architectural columns retain dark recesses and rough pale faces, while farther towers attenuate through the open shaft. Long contiguous portions of masonry remain visible. The result reads as several distances rather than fine texture behind one common whitening layer.
2. **Fog is selective and moves independently.** Native stationary frames043→057 show slow banks changing inside the shaft while larger clear corridors persist. The repeated horizontal patch pattern from round1 is absent. These quiet areas are not empty failures: distant tower silhouettes and the large structural planes still establish scale and depth.
3. **Light has a spatial direction through air and stone.** `native-upper-air.png` and native sequence105→109 show a diagonal illuminated pocket behind the raven and beneath the large arch. It remains coherent while the character moves. Opening air and checkpoint air show the same authored light language in different geometry; the effect is not confined to the bell crossing.
4. **Material hierarchy survives.** Selective catches on rough ledge tops add form without continuous luminous outlines or a waxy/plastic sheen. The dark foreground stays distinct. No new hard shader rectangle, screen-edge seam or jump-synchronized fog warp was visible in these clips.
5. **The character remains the gameplay anchor.** Raven silhouette and cream eyes remain readable in all four action scenes, including the brighter upper pocket and darker opening. Feather response stays graphite rather than metallic or fiery. Crimson/ivory hazards remain legible. `gentle-upper-air.png` preserves the bird and next ledge while reducing surrounding motion.

## Remaining qualified observation

The new trail removes the old cellular ring stamps and is quieter. In upper/checkpoint action frames, some brighter detached shapes read as dry ash or torn feather flakes rather than turbulent smoke. They do not obscure the body, dominate the scene or create a new repeated ring pattern. This is a minor material/style observation, not an environment blocker; another major emitter redesign is not warranted by this evidence.

## Bounded evidence selection for the durable packet

- Positive comparison: baseline15, round1 and round2 `native-middle-before.png`.
- Upper improvement/action: round1 and round2 `native-upper-air.png`.
- Other regions: round2 `native-opening-air.png`, `native-checkpoint-air.png`.
- Enlarged inspection: round2 `desktop-middle-before.png`.
- Gentle: round2 `gentle-upper-air.png`.
- Ambient motion: round2 `native-sequence/frame-043.png` and `frame-057.png`.
- Moving light/action: round2 `native-sequence/frame-105.png` and `frame-109.png`.
- Preserve original videos, capture.mjs, receipts and source identities; large raw sequences may remain scratch.

The iteration lesson is selective density and material integration. Making cloud noise more visible produced a busy overlay in round1. Reducing repeated coverage, opening clear corridors, separating architectural values and giving light a consistent spatial role created the stronger result in round2. More effects alone would have moved in the wrong direction.
