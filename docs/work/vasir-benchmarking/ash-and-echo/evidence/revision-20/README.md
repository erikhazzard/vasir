# Revision 20 — a living ash-raven transformation

September 6, 2026. Local playable: http://localhost:8317/?v=20.

The creator rejected the raven as a static image and requested stronger character motion and shaders. This pass replaces rotating wing contours with shoulder/elbow/wrist articulation, seven curved primaries per wing, asymmetric unfolding, downstroke, head/torso counterload, recoil and folding. A live WebGL field moves charcoal density through the existing body mask and erodes outer feathers. The existing five sound voices follow those phases. Controller, level, world rendering and revision19 heavy-impact behavior are unchanged.

## Three independent review/repair rounds

Fresh Astra anatomy/material authors and a separate fresh Astra critic worked from ordinary keyboard timing and normal RAF, with arranged starting/contact states at native390×844 and enlarged presentation. Whole context and normal-time video own visual claims; crops and anatomy worksheets support diagnosis.

- Baseline19: held symmetrical wings and abrupt reversion. See `critic/baseline-review.md` and its frozen captures.
- Round1: stronger motion, but satin bands and a straight, ordered feather fringe. Repair: bent wrists throughout extension, unequal hooked primaries, head counterload, matte material.
- Round2: motion improved, but near-black material and a repeated bright shoulder tear remained. Plain-ink A/B isolated opposite winding of the right membrane/feather subpaths; reversing traversal removed overlapping-fill cancellation without changing geometry. The shader restored wider irregular midtone fibres while protecting the dark head.
- Round3: the two material findings closed in fresh native/enlarged play. Eyes, contact cancellation, immediate rebound and Gentle phases remained clear. See `critic/round3-review.md`. This remains a graphic planar ash bird, not volumetric smoke. Scoped defect closure does not establish a human S grade or a measured10–100× improvement.

`character/candidate3/winding-before-after.png` isolates the notch cause with material, shader, lighting and erosion disabled in both rows. `articulation-sheet.png` shows arranged body phases, not ordinary-play evidence.

## Final behavior and runtime evidence

All eight final receipts bind the same sixteen served JavaScript modules (`source-bindings.json`). `source/` holds those modules, HTML/CSS, hashes and the implementation contract. `asset-sha256.json` binds unchanged source art without duplicating large assets.

| Check | Observation | Evidence |
|---|---|---|
| Controller regression |22/22 existing tests passed |`controller-tests.txt`|
| Visible touch controls |Five intended opening contacts, one double jump, no death/error |`played-touch-opening/receipt.json` and video|
| Full keyboard route |Summit35.058s,29 landings,26 doubles, deliberate checkpoint death/recovery, actual restart returned to playing; no errors |`played-full-route/receipt.json` and video|
| Quiet ordinary actions |22 double jumps and22 landings;1,400 frames; median/p9516.7ms,p99/max16.8ms,zero>33.4ms |`routine-performance/receipt.json`|
| Quiet maximum impacts |16 arranged650-unit actual-collision falls, severity1;1,800 frames; median/p9516.7ms,p99/max16.8ms,zero>33.4ms |`landing-performance/receipt.json`|
| Allocation/lifecycle |Warm camera sweeps and12 restarts plateau;91 cached canvases,2GLcontexts/programs/buffers,7world textures/uploads,0explicitFBO,0runtime readbacks;3same-material-context restorations preserve paused pixels |`resources/receipt.json`|
| Pause/Gentle |Identical paused pixels; readable reduced transformation |`resources/receipt.json`, `critic/round3-*`|
| WebGL unavailable/lost |World/character fallbacks selected, first/double jumps work; both restore on existing contexts |`fallback/checks.json`, `resources/receipt.json`|
| Audio |Eight baseline/candidate offline phrases; no clipping/nonfinite values or sound before unlock; tails end and connected nodes clean up; source count unchanged |`audio/summary.json`, `render-report.json`, paired WAV reels|

Timing is desktop Chrome at390×844,DPR2 on this Mac, with capture browsers/video processing closed during measured windows. It is not physical-phone/thermal or GPU elapsed-time evidence. Functional routes are informed scripts, not newcomer comprehension or human feel scores. Audio receipts are native offline DSP checks, not headphone judgment.

## Bounded shader extension

One extra256² offscreen WebGL default-framebuffer write, one static quad/program and two local Canvas2D copies feed the existing288² body surface under the existing frame owner. Four fragment-dependent value-noise calls,16 hash-sines; no texture reads, framebuffer objects, extra RAF, per-frame image uploads or product readbacks. Eyes stay separate. Null fallback retains articulated anatomy; same-context restoration, reset and disposal are bounded. No world compositor rewrite or Three.js dependency was needed.

`material/round3/proof.md` and its frozen probes/metrics describe the final shader. Isolated submission/copy p95 was0.2ms baseline/live; that simplified-mask probe qualifies incremental desktop cost only. Its author capture predates the winding fix and supports material evaluation; final root/critic captures bind the repaired character. Historical `material/proof.md` and `candidate1-review.md` refer to candidate1 values preserved in `metrics-before-matte.json` / `restore-metrics-before-matte.json`; top-level `metrics.json` is a later scratch alias. Each rejected/final candidate retains its exact shader in critic source folders.

The ongoing process record is `../../process-log.md`, section24. Skill extraction remains deferred as requested.
