# Revision 19 — a separate long-fall slam

The creator asks for “10-100x more intense for long falls.” Revision 18 improved ordinary landings, but the upper range still looked like the same short effect at a slightly greater size. The new pass preserves that ordinary range and gives long falls a distinct sequence of impact, fracture and aftermath. This is a response to the requested experience, not a measured improvement multiplier or an S grade.

[Play the working game](http://localhost:8317/?v=19). Final modules are frozen in `source/`; `identities.json` records those files, unchanged raster assets and the source identity of each proof. Runtime changes from 18 are limited to renderer, depth, surface ash, character and audio. Physics, collision, fall-distance semantics and controls are unchanged.

## Impact and material

One shared upper-range curve drives the stronger effects: smoothstep of clamped `(landingSeverity - .42) / .5`. An actual 160-unit fall barely enters this range; 300 is about halfway; 508 saturates it. Wall braking and a fresh air jump still dissipate/reset the underlying fall weight.

Both existing canvases receive a deep downbeat, reverse kick, small rotation, brief zoom and diminishing aftershocks lasting up to 780 ms. The HUD stays fixed. Offset is bounded at 34 logical units, and inverse-rotated viewport corners determine the required overscan. Fog retains its independent ambient field; no jump-driven fog distortion returns.

| Fall distance | Revision 18 vertical peak | Revision19 vertical peak |
|---|---:|---:|
| 80 units | ~4.0 CSS px | ~4.0 CSS px |
| 160 | ~6.7 px | ~6.7 px |
| 300 | ~8.9 px | ~19.9 px |
| 508 | ~9.9 px | ~30.9 px |

These numbers are composed DOM measurements at a 390-wide presentation using the corresponding real-fall severities; the geometry harness emits presentation events. Separate integrated captures own the actual collision and visual comparison.

The contact eruption rises roughly 170–210 logical units and spans about 300 at maximum force. Six brief torn strikes break within 45–79 ms into at most 18 moving porous masses. They reuse the character's existing ash atlas, erode at staggered times over 105–219 ms, and shed fine grit. Only two hero chunks remain coherent; other large shards crumble. Fine debris and grounded residue continue after the next jump.

The character's outer mantle fractures into offset plates, shudders and reforms around readable eyes. Maximum recovery lasts up to 680 ms; fresh steering or a jump immediately interrupts it. Existing wake slots supply shoulder ash. Audio uses the same four body sources for a bass drop, sharp crack, coarse grit and delayed low aftershock; a rebound cancels remaining body tails while iron/bell responses survive. Heavy contacts also reach farther into nearby props and startle existing flocks.

## Three review rounds

The independent Astra baseline review found 160/300 sharing thin cuts and508 leaving sparse aftermath. Root and two Astra authors made the camera/world, surface, and body/audio changes; another Astra independently reviewed actual native/enlarged falls and buffered rebound.

1. **Rejected crystal fan:** intensity and tier separation improved, but huge clean connected blades held like a black fern/crystal and chips had regular punched centers. `critique/round-1.md` and frozen first-round clips preserve this failure.
2. **Rejected cardboard rubble:** early separation removed the fan, but many large flat polygons appeared in a column and faded whole. Root independently raised the same issue; the critic confirmed it at normal cadence. `critique/round-2.md` preserves it.
3. **Porous breakup:** the final material reuses the loaded ash texture and changes from coarse masses to fine residue. Exact-source native/enlarged/gentle and ordinary-play evidence is retained with the final critic judgment and mapped frames. A brief sharp onset wedge is distinct from the rejected persistent fan.

These are scoped visual findings. Model review does not establish creator satisfaction, a numerical 10×/100× improvement, physical-phone performance or a whole-game S grade.

## Verification

- **Touch:** five actual opening contacts complete at 6.092 game seconds, with no death or browser error.
- **Keyboard:** summit at 35.342 game seconds with 29 landings, deliberate checkpoint death/recovery and restart.
- **Controls:** all 22 existing behavior checks pass; the game module remains byte-identical to18.
- **Camera:** 2,880 composed samples across 320/390/1280 widths, both directions and four severities. The two canvas matrices agree, the HUD stays fixed, every inverse-transformed corner is covered by at least 6.34 local CSS pixels, and all responses settle. Pause, Gentle and restart pass.
- **Backend:** lost/restored/unavailable WebGL, actual jump and stable paused Gentle rendering pass.
- **Audio:** 20 offline phrases pass clipping/NaN, existing voice-budget, rebound cancellation and node-cleanup checks. Maximum peak is below 0.373. This validates synthesis, not headphone judgment.
- **Quiet heavy pacing:** desktop Chrome at 390×844 DPR2, 16 actual 650-unit falls through the intact ledge 25 column. Retained 1,800 frames: median/p95 16.7 ms, p99/max 16.8 ms, none above 33.4 ms. No screenshots/video during measurement; all capture browsers and extraction were closed.
- **Quiet ordinary pacing:** same desktop presentation, 22 actual double jumps and 22 landings over 1,400 frames: median 16.7 ms, p95/p99/max 16.8 ms, none above 33.4 ms. These two samples are desktop evidence, not handset/thermal certification.
- **Resources:** existing 16 contacts ×38 shards and 14 grains remain; character pools remain 144 wake / 38 burst. The material adds at most 18 brief existing-atlas draws and 54 small analytic grit triangles. No new assets, canvases, GPU targets, global passes or frame owners are introduced.

Author body fixtures clear intervening colliders and qualify body presentation only. The critic's fall fixtures retain every collider: 160/300 share the resonant stone, while 508 uses the intact clear column above ledge 25. The surface author's attempted 800-unit fixture was intercepted after 248 units; it is explicitly not proof of an 800-unit fall. Final repeated 650-unit impacts use the intact ledge 25 column. Ordinary keyboard/touch routes separately establish playability.

Selected images, original normal-time clips, rejected source stages and final receipts are retained; large extracted frame sequences remain scratch material. The renderer's independent static review predates only the one-line existing-asset handoff to surface ash; the final composed camera check runs the final full source. [The process log](../../process-log.md) preserves the feedback, failed assumptions and repairs for later skill extraction. Skills are unchanged.
