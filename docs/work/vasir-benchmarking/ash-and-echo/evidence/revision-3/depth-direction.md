# Ash & Echo: depth direction

Bounded diagnosis, 2026-09-05. The user's C-minus assessment is the current visual calibration. This document specifies a repair; it does not award a new grade.

## Material and scope

Directly inspected the supplied current frame (`Screenshot-2026-09-05-at-9.39.02-AM-727ca734eeac.png`) and LIMBO reference (`Screenshot-2026-09-05-at-9.41.01-AM-00ee12b9c964.png`) in the Ratatosk uploads directory. Also inspected `assets/midground.png`, the native touch-release evidence, the relevant renderer composition, and a live 390×844 first jump at `http://127.0.0.1:8317/`. The live jump rose and landed on the first platform with no page errors. It showed the current red thorns. This is a composition diagnosis, not complete active-play certification or a sustained performance result.

Style: painted Gothic masonry and organic soot silhouette. Primary loop: exploration/physics platforming; read landing edges, wall contacts, hazard teeth, and body trajectory first. Information density is low. Binding viewport: 420 logical pixels wide, variable portrait height H. Use 420×740 as the layout sketch and check the taller 390×844 browser viewport as well. Preserve the existing simulation/camera tracking behavior and the readable creature. A reasonable performance target remains sustained 60 fps on a three-year-old phone; that is a target, not a measured claim here.

## Why it feels flat

The problem is not a missing asset count or a lack of detailed drawing. The current frame already contains receding buildings, texture, fog, and crisp architecture. Their arrangement collapses into two perceptual planes: a bright cathedral wallpaper and equally sharp dark playable cutouts.

1. **The empty light shaft is nearly continuous.** The brightest area runs through most of the central height. It evenly backlights every platform, so the composition has no particular chamber, depth destination, or local light source. Its enormous white area makes the delicate distant towers read as a backdrop print.
2. **Depth is expressed by miniature repetition.** Multiple towers, birds, and arches become smaller and lighter, but there is no large intermediate structural mass to cross another contour. Most visible architectural forms fit neatly inside their layer. LIMBO's broad, partly cropped forms create a place around the player; Ash & Echo's repeated complete balconies decorate the shaft.
3. **Everything solid shares a focus plane.** Walls, balcony filigree, chains, and central platform undersides have similarly sharp edges and similarly dark detail. The richly drawn corbel is repeatedly shown in full. There is little distinction between the contact edge the player needs and ornamental relief the eye can ignore.
4. **The main backgrounds barely separate in motion.** `drawBackdrop` positions both full shaft images using the same normalized `progress`. Their actual camera displacement is only the image's excess height divided by the climbable camera range. At the tall native viewport this is approximately 0.07 for the background and 0.13 for the midground. Foreground art is currently unavailable, so `drawForeground` mainly supplies a symmetric dark veil. These are layers in code, but their structure and movement do not establish a strong middle distance or near camera plane.

The useful LIMBO reference is its mass arrangement, overlap, local light, and relative focus. Its low resolution and blur are not a prescription to put a blur filter over the whole game.

## Four decisive edits

### 1. Give the light a location

Replace the continuous white shaft with an asymmetric soot chamber and one luminous opening. In the opening scene, place the broad light opening around x=230–270, centered roughly at y=0.52H, with visible width 140–180 and height 0.40–0.55H. Let its softer spill extend through the jump corridor. Establish a broad darker mass from the upper-left, occupying roughly one third of the backdrop, rather than adding another symmetric vignette.

Keep the opening's brightest region small: roughly 10–15% of the frame, rather than most of the center. Use stone-colored light (`#cdd0c4` to `#dedecf`) rather than unmodulated white. The play corridor should usually sit against medium-light mist, so the dark moving body and thorn shape survive. Do not turn this into a spotlight following the player; anchor the chamber/light to a scenery section and reveal it through the existing camera.

Fog should hide the base of a particular distant structure or pass between two planes. Use one or two broad irregular banks. Three repeated bright strips across the frame will preserve the wallpaper effect.

### 2. Establish a massive middle distance

Introduce one large, cropped, contiguous Gothic structural silhouette behind the platforms: a nave pier and part of a pointed arch, with a broken diagonal buttress returning into haze. This is the largest new compositional change. Suggested opening placement: pier occupies approximately x=80–145, rises beyond the top of its scenery section, and its curved rib reaches toward x=260. Its lower end dissolves into fog. Alternate the dominant side only at a meaningful chamber transition, approximately 900–1300 world pixels apart.

The pier should be 3–5 times the visible character width, not another miniature tower. Let two or more actual platform contours cut across and visibly occlude it. It must look farther away than those platforms: broad value masses, little internal contrast, softened edge, no bright horizontal cap. Use a curved, diagonal, or uninterrupted vertical contour wherever it passes behind open play space. Do not place decorative ledges at plausible landing heights.

Use camera factor 0.42–0.55 for this structure. Preserve the existing cathedral image as the farther plane and reduce its high-frequency prominence. A huge pier should remain huge as it moves; do not fit its entire outline neatly into every screen.

### 3. Separate stone mass from the contact edge

Keep the precise top edge of each real platform crisp. Compress the interior contrast of the decorative underside so it reads as heavy stone before it reads as lace. A continuous 1–1.5 logical pixel landing highlight is enough; do not brighten every cornice line and carved arch to the same strength.

Let a side balcony's root disappear into the wall shadow. Vary how much underside is exposed according to side lighting and damage, rather than presenting the same complete corbel silhouette at every row. Center spans should keep visibly broken ends or unequal surviving ribs. Any art extending below the collision cap remains visibly support or rubble; it never gains another horizontal landing edge.

Keep the player silhouette, eyes, thorn teeth, and active landing caps at full resolution. Texture under a cap can be quieter. This produces focal depth without making controls harder to read.

### 4. Put a small amount of architecture in front of the camera

Add sparse nearly black cropped ribs, a close chain, or the side of a ruined pier at the outside edges. Favor one dominant side and one small counterweight; avoid a mirrored decorative border. A near form may be 40–70 pixels wide but most of it is offscreen. Its visible contour should cut into the outer masonry and occlude its texture.

For this course, keep near occlusion inside x=0–40 or x=380–420. The inside faces around x=60 and x=360 are real wall-jump surfaces and must remain visible. No foreground chain, finial, fog, or rib crosses the player's landing or wall-contact area. Avoid a full-width top arch: arrival platforms can occupy that area as the camera climbs.

Use camera factor 1.08–1.14 and slightly soften only these nearest contours, around 1–2 logical pixels baked into a cached surface. Near-camera objects move with the climb rather than oscillating like a screen border. Their job is brief, unmistakable overlap, not continuous animation.

## Layer contract

Values are proposed palette anchors, to be judged in composition. They are not a substitute for actual contrast checks.

| Draw order | Visual role | Values | Camera factor | Edge treatment |
| --- | --- | --- | --- | --- |
| 1 | Chamber air / local light | `#727d75` through `#cdd0c4`; small `#dedecf` opening | 0.08–0.12 | Broad gradients and painted breakup |
| 2 | Remote cathedral | `#929e94` through `#b9c1b3` | 0.14–0.20 | Low contrast; softened small detail |
| 3 | Large pier and arch | `#57645c` through `#849084` | 0.42–0.55 | Large shape; approximately 1–2 px softening |
| 4 | Local haze behind play | Values of surrounding air, sparse alpha | 0.30–0.40 | Hides specific structure bases |
| 5 | Playable walls and platforms | Mass `#101815`–`#303b32`; contact cap around `#969e88` | 1.00 | Cap crisp; relief quiet |
| 6 | Peripheral near architecture | `#040907`–`#101612` | 1.08–1.14 | Cropped, sparse, slightly soft |
| 7 | Creature and gameplay feedback | Existing soot and warm pale eyes | 1.00 | Full sharpness, protected visibility |
| 8 | Lethal thorns | Preserve current red/cream warning system | 1.00 | Draw after atmosphere; clear solid teeth |

Use screenY = sectionAnchorY − (cameraY − sectionStartCameraY) × factor for authored scenery. Keep the coordinate anchor explicit so a large starting cameraY does not shift all new scenery offscreen. Factors describe parallax; they do not change simulation or the established camera follow. Reduced motion should retain the static composition while suppressing optional drift.

Do not darken every part of the route to obtain mood. If the hero becomes a pair of eyes against the new middle pier, lift the pier's value locally or reposition the structure. Thorn legibility depends on the solid tooth silhouette and pale rim as well as the red hue. Any proposed color numbers need grayscale and phone-scale review in their actual adjacency.

Cache the broad structural shapes, softened edges, and fog textures when scene/size changes. Draw images with translation at runtime. Avoid per-frame blur, new full-screen texture generation, or an unbounded stack of alpha layers. Prefer replacing existing broad haze/veils with purposeful planes so the visual change has a bounded rendering cost.

## Evidence required after the repair

Compare the first launch, first landing, a wall brace/kick, checkpoint approach, and summit approach at actual phone scale. The first jump should show a dark pier moving distinctly behind a platform while the nearest stone passes faster at the side. The frame should remain materially deeper with particles disabled. A still should contain an unambiguous chain of overlap: distant opening → broad middle pier → real platform → cropped near stone.

Pass/fail questions: Can the next landing cap and lethal teeth still be named immediately? Does the creature's body remain readable in front of the new pier? Is the brightest area a place rather than a continuous white tube? Do large structures feel partly outside the viewport? Does parallax remain coherent when the camera changes direction? Does normal input remain responsive in a screenshot-free runtime sample?

The repair is not accepted merely because all four features exist. The before/input/after sequence must look more spatially authored, and the user's visual judgment remains authoritative. No new A/S claim is warranted from this diagnosis.
