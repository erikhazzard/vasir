# Ash & Echo — charcoal cohesion revision

September 5, 2026. Playable at `http://localhost:8317/`.

**The requested S-tier bar remains unmet.** The latest human calibration is C/C+ for the preceding build. Fresh Astra review estimates this candidate **B+ / CLOSE**, with no concrete visual shipping blocker observed. It finds stronger depth, coherent materials and supported landmarks; the remaining gap is the repeated composition through intermediate encounters. The four new masonry ribs improve foreground mass and spatial variation without changing that estimate. See the current-source addendum in [the independent review](final-review.md). Route completion and a clean runtime sample do not establish A/S art or human acceptance.

## What changed

Complete, deliberately dark stone silhouettes replace cropped ornate ledges. A shared material ties platforms and the small portal together. Cages attach to sampled painted stone; free platforms and the summit have visible chain rigging. A broad refuge bridge and a suspended bell distinguish the two destinations. Four solid tapered ribs narrow and release parts of the corridor. Middle arches, further bell towers, distant spires and near stone have separate value/focus/parallax roles. Full-resolution scenery caches replace the visibly enlarged low-resolution caches. Thorns use a quieter bone/rust treatment; a compact cause/recovery caption replaces the large red warning rectangle.

Movement tuning, character animation and audio are unchanged from the reviewed baseline. The original 28 ledges and hazards remain; the appended rib segments use normal wall collision behavior.

## Current-source evidence

- [Source identities](release-route/source-identities.json): all recorded source files and five new assets matched the live candidate when this packet was prepared. [Independent verification](rib-review/release-verification.json) also matched the release identities.
- [Actual-key playthrough](playthrough.webm) and [trace](release-route/route-verified.json): all 28 ledges, an early wall kick, intentional checkpoint death and recovery, grounded summit at **34.4083 game seconds**, and actual restart; no browser errors. Steering used read-only state, so this proves an executable route, not unprimed discovery or human touch comfort.
- [Opening](release-route/00-opening.png), [wall kick](release-route/11-route-wall-kick.png), [middle passage](release-route/route-target-06.png), [refuge](release-route/13-checkpoint.png), [death](release-route/event-death.png), [recovery](release-route/14-checkpoint-respawn.png), and [summit approach](release-route/route-target-27.png): unedited 390×844 native captures from that route.
- Independent current-source [before](rib-review/phone-before.png), [double jump](rib-review/phone-double-jump.png), and [landing](rib-review/phone-landed.png); [Retina landing](rib-review/retina-stage-landed.png) uses a 1280×968 viewport at DPR2, with a 491.34-CSS-pixel stage, approximately 983 raster pixels wide. [Input receipt](rib-review/own-current-input.json) records the exact sequence and unchanged source. These current-rib rechecks used keyboard events; the preceding same-shell review separately exercised simultaneous mobile touch.
- [Chrome pacing](performance.json): **1,208 frames over approximately 20 seconds**, 390×844 DPR2, screenshot-free actual-input sample; p95 **16.7 ms**, p99/max **16.8 ms**, no intervals over 33.4 ms. Served JavaScript hashes match this candidate. This is desktop Chrome emulation, not physical-phone or thermal validation.
- [Canonical controller checks](controller-checks.txt): **12 passed**, including both complete 28-ledge simulated routes. The independent course implementation also exercised the new segment faces, top landings, wall kicks and undersides.

## Unchanged-shell evidence

[Shell checks](final-shell/shell-final.json) passed all nine asset loads, keyboard start/restart, pause focus, gentler effects, and separated 64/82px touch controls without overflow at 320×568. [Actual thorn contact](final-shell/current-hazard.json) produced the matching caption and a 267ms respawn. These shell captures precede the later wall-rib addition; the shell, assets, warning UI, hazards and movement tuning stayed unchanged. They supplement the current-source route and Retina recheck.

Generated PNGs remain unchanged from their original exports. Prompts, crop/alpha validation and source identities are retained in [architecture](asset-kit.md), [buttress](buttress-asset.md), [belfry](belfry-asset.md), [refuge](refuge-asset.md), and [bell](bell-asset.md). The tool did not disclose an image-model version. [Direction and judge correction](direction.md) explains the earlier optimistic judging error.

The complete C/C+ snapshot remains at `tmp/ash-and-echo/cohesion-pass/c-baseline/`; the pre-rib B+ candidate is at `tmp/ash-and-echo/cohesion-pass/bplus-baseline/`. Earlier attempts, complete reviewer recordings and historical review paths remain under `tmp/ash-and-echo/cohesion-pass/`. The copied independent review includes its earlier candidate assessment before the current-source addendum; only the addendum covers the final rib geometry.
