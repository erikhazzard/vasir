# Ash & Echo — final environmental depth review

Reviewed 2026-09-05 against the live build at `http://127.0.0.1:8317`. No product edits. The user’s C− baseline and LIMBO reference were inspected first; no earlier model critique or grade was read. Applied `game__art-directing`, its active-play visual gate, and the frontend review skill.

**Decision: the revised environment is materially deeper and spatially composed. No mandatory further environmental repair was found in the reviewed evidence.** This does not establish LIMBO parity, an A/S quality grade, or new human approval. The user’s C− calibration remains the accepted judgment of the original build.

**Current closure:** the follow-ups below verify the near foreground correction and subsequent cached-lighting change. Latest mobile and desktop captures are in `final-review-cached/`; `final-review/` and `final-review-near/` remain preserved as earlier comparison evidence.

## Evidence

Paths below are relative to `tmp/ash-and-echo/depth-pass/` unless stated otherwise.

| ID | Material | Use |
| --- | --- | --- |
| R1 | User upload `Screenshot-2026-09-05-at-9.39.02-AM-727ca734eeac.png` | Original C− calibration, inspected first. |
| R2 | User upload `Screenshot-2026-09-05-at-9.41.01-AM-00ee12b9c964.png` | LIMBO depth target, inspected before revised frames. |
| B1 | `review-baseline-native.png` | Original renderer at 390×844, inspected after independent revised judgment for equal-scale comparison. |
| A1 | `final-review/mobile-00-before.png` | Clean actionable mobile start, title fade finished, 390×844 DPR1. |
| A2 | `final-review/mobile-01-input.png` | Actual first rightward jump; character, cage, first cap, and floor hazard visible. |
| A3 | `final-review/mobile-02-double-jump.png` | Actual second jump, new altitude and camera response. |
| A4 | `final-review/mobile-03-after.png` | Actual first-platform landing, then settled idle at 22m. |
| D1 | `final-review/desktop-01-active.png` | Live active desktop frame at 1280×900 DPR1, complete game and shell visible. |
| M1 | `final-review/video/b7a01134b77f6deb0160a487a8d6ecfb.webm` | Recording accompanying A1–A4; retained motion artifact. Judgment uses the live capture sequence and inspected frames, not a claimed full video playback. |
| Q1 | `route-before-near/event-jump.png`, `event-doubleJump.png`, `event-land.png`, `11-route-wall-kick.png`, `route-target-06.png` | Supplied opening and early-climb sequence. |
| Q2 | `route-before-near/13-checkpoint.png`, `route-target-15.png`, `route-target-20.png` | Checkpoint and middle-climb visual hierarchy. |
| Q3 | `route-before-near/route-target-26.png`, `route-target-27.png` | Upper-climb route and summit destination hierarchy. |
| T1 | `final-review/capture-notes.json`, `final-review-capture.mjs` | Independent actual browser key input provenance; no injected game state, simulated time, source-informed route, or page errors. |
| T2 | `route-before-near/route-verified.json` | Supplied full route provenance: actual keys, checkpoint recovery, summit at 33.675 seconds. Source-informed automation supports coverage, not human comprehension. |

Upload directory for R1/R2: `/Users/erikhazzard/Library/Application Support/Ratatosk/workspace/uploads/client_a23078b0dc084a9a9d2fc9e8/`.

`route-before-near/00-opening.png` contains the title overlay and `route-before-near/event-jump.png` retains its fade. Neither is used as clean before-state proof; A1 replaces that missing material.

## What visibly improved

- **Middle distance and occlusion:** In B1, the shaft is predominantly a bright distant panorama behind crisp pasted-on ledges. A1–A4 introduce a large arch that spans the void, passes behind the platforms, and resolves into a substantial side support. That gives the eye a separate middle distance with physical scale. Q2 reverses the arch composition around the checkpoint; Q3 lets tall columns and distant spires carry the upper climb. This is a spatial change visible at native mobile size, not an inference from layer count.
- **Focus:** Crisp traversable caps and the character sit ahead of softer arch detail, with still less distinct distant spires. The tiers remain legible in D1 at actual desktop game scale. They do not need equal detail or contrast to establish their positions.
- **Light:** The previous nearly white center becomes a more controlled pale opening framed by dark masonry. In A2–A4, the black body and pale eyes remain easy to find. At Q2, the small warm checkpoint light gains a specific destination role against the muted environment. The light remains a broad atmospheric treatment; this is not evidence of convincing local cast shadows.
- **Readability:** Thorn tips retain a distinct hooked silhouette and pale/red edge throughout Q1–Q3. Platform caps remain thin, sharp horizontal contact surfaces despite the arch behind them. A4 confirms the character recovers a round idle silhouette after landing; the flattened pose in supplied landing captures is transient, not persistent body loss.

## Active-play visual review

**Verdict: SLAPS for the bounded first-action visual read.** This is an agent judgment of the observed action sequence, not an A/S grade or a broad release verdict.

- **I am:** the small dark creature with bright eyes at the bottom of a ruined shaft.
- **I should:** leap onto the next pale-edged ledge, then work upward while avoiding the hooked thorns.
- **I should care because:** the stacked route offers a clear immediate foothold and the distant architecture makes the climb feel tall; the upper-route portal provides a concrete destination.
- **When I act, the game visually answers by:** changing the body pose, leaving a brief motion trace, moving the creature into the gap, and advancing the height/camera response.
- **What changed after the action:** the player occupies the first ledge at 22m with the next ledge above-left; the body settles back into its recognizable idle form.
- **Biggest visual confusion at initial review:** the closest dark forms partly read as shadow on the side walls. The bounded follow-up below closes this specific finding with fresh evidence.
- **Would I keep playing from this moment?:** yes.

Style: painted/textured 2D with animated silhouette character. Core-loop profile: exploration/physics platforming; terrain, hazards, and contact edges take priority. Information density is low. Portrait mobile is the binding composition, with a centered portrait stage on desktop.

The next action and critical hierarchy survive the inspected mobile/desktop frames and before/input/after sequence. The gothic stone, restrained atmosphere, and irregular shadow creature form a coherent visual direction. The HUD stays peripheral; the existing instructional line is visible but does not obstruct the first landing cap. Physical-device touch ergonomics, full accessibility, and unaided onboarding were not reviewed.

Runtime sanity at initial review: the independent browser sequence completed with no page errors and produced the intended first landing. The root separately reported a screenshot-free sample of 603 frames with p95/p99/max 16.8ms and none above 33.4ms. That sample predates the near foreground closure below. This reviewer made no performance measurements and does not extend that report to physical-phone thermal behavior.

## Initial polish finding — closed by the bounded follow-up below

**Polish — strengthen the near foreground’s distinct focus and silhouette.** The darkest vertical side masses in A1/D1 mostly coincide with the collision masonry. They frame the shaft but do not convey the large, defocused near-camera obstruction evident in R2. If another art pass is undertaken, reshape one existing near mass into an asymmetric, visibly softer shoulder/root that overlaps wall detail while keeping the playable inner edge, thorn tips, and caps exposed. Evaluate that at native 390px width before expanding it across the route. Adding more equally sharp strips or further darkening the whole image would not address the gap.

This is the remaining target gap, not a newly demonstrated play blocker. No additional environmental repair is required by this bounded review; further improvement should be directed by fresh human calibration rather than another optimistic model grade.

## Bounded near foreground closure — 2026-09-05

**Pass.** The revised near form visibly occludes the wall; no hero, thorn, cap, or inner-wall-boundary clarity regression was observed in the fresh opening sequence. This closes the specific earlier wall-shadow finding. It does not change the broader quality calibration or establish LIMBO parity.

The root reports only two relevant changes: a slightly lighter cached wall tone and a near-pier rotation from −0.08 to +0.07. The visual comparison supports their intended effect: the black contour now bows across the left masonry and recedes toward the frame edge, while the stone remains legible behind it. In the earlier A1/D1 captures, the dark mass tended to form a nearly straight strip along equally dark stone. In N1/N5, the changing width, softer outer silhouette, and visible stone beyond the contour communicate overlap. The effect reads at native 390px width and at the full desktop game scale.

| ID | Current source/evidence | Result |
| --- | --- | --- |
| N1 | `final-review-near/mobile-00-before.png` | Clean 390×844 DPR1 start. Curved black foreground crosses wall texture; the playable inner wall edge and floor thorn tips remain exposed. |
| N2 | `final-review-near/mobile-01-input.png` | First real rightward jump. Black body and pale eyes remain distinct; first landing cap stays crisp. |
| N3 | `final-review-near/mobile-02-double-jump.png` | Second real jump and camera response. The foreground overlap remains legible as the view moves. The character and nearby cap retain clear outlines. |
| N4 | `final-review-near/mobile-03-after.png` | Settled first-platform landing at 22m. Round idle silhouette, contact edge, and next ledge remain clear. |
| N5 | `final-review-near/desktop-01-active.png` | 1280×900 DPR1 active desktop frame. Foreground/wall separation survives the actual centered game scale. |
| N6 | `final-review-near/capture-notes.json` and `final-review-capture.mjs` | Same fixed-duration actual-key capture script, with a separate output path. No injected state, source-informed input decisions, or page errors. |
| N7 | `final-review-near/video/548c0de6ea980086901fb8c7345933ef.webm` | Retained recording of the current mobile sequence. |
| S1 | `site/ash-and-echo/renderer.js` SHA-256 `020ac529a606cea41ad84c020d88460587e14ae4741dbf45d3a9a5b98855e008` | Source identity recorded after current capture. |
| S2 | `site/ash-and-echo/depth.js` SHA-256 `a0a3e2813365a55f481e3d22433ae667fd9edf513e987dacb13c2a2ec4eb5c4d` | Source identity recorded after current capture. |

This closure checks visible wall-contact boundaries, not a repeated wall-kick traversal or full-route playthrough. The earlier route evidence remains explicitly earlier-build evidence. The browser was closed before the root’s final performance run; this reviewer did not run or claim current performance measurements. No product edits were made by this reviewer.

## Cached-lighting qualification — 2026-09-05

**Pass for visual preservation; no regrade.** Fresh opening captures retain the near-closure composition, visibly overlapping foreground, and distinct masonry. The independent jump/double-jump sequence again reaches the first ledge at 22m. Body, eyes, thorn tips, cap edges, and the visible inner-wall boundaries remain clear on native mobile and desktop. The inspected current checkpoint and upper-route frames retain arch/column detail and localized portal light; the cached far lighting has not visibly washed them out. No further visual repair is indicated by this narrow check.

| ID | Current evidence/source | Qualification |
| --- | --- | --- |
| C1 | `final-review-cached/mobile-00-before.png`, `mobile-01-input.png`, `mobile-02-double-jump.png`, `mobile-03-after.png` | 390×844 DPR1 clean actual-key sequence, compared with N1–N4. |
| C2 | `final-review-cached/desktop-01-active.png` | 1280×900 DPR1 active desktop frame, compared with N5. |
| C3 | `final-review-cached/capture-notes.json`; `final-review-cached/video/0e2e6b57a1a2aa7f41b07f0c2df4b278.webm` | Same capture script and ordinary browser key inputs; no page errors. Recording retained. |
| C4 | `route-cached/13-checkpoint.png`, `route-cached/route-target-20.png`, `route-cached/route-target-26.png`, `route-cached/route-target-27.png` | Root’s current actual-key ascent frames inspected for lighting/readability only. This reviewer did not repeat the full route. |
| S3 | `site/ash-and-echo/depth.js` SHA-256 `9bcf97bbdd3467b2454781dfbc2ab1699777bd8884fdb0f8477644a1b2c0d51f` | Current cached-lighting source, hash checked after capture. Renderer remains S1 (`020ac529…`). S2 belongs to the earlier near-closure build. |

The root reports the far-air multiply is now cached per resize/asset and moves with distant architecture, plus a final 603-frame DPR2 sample with p95 16.7ms and p99/max 16.8ms, none above 33.4ms. This reviewer checked appearance and ordinary first-action execution, made no performance measurements, and does not extend that reported sample to physical-device thermal behavior. Browser closed after capture. Earlier `route-before-near/` evidence references remain unchanged.
