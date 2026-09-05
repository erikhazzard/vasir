# Final candidate evidence

The [fresh final Astra review](final-visual-review.md) recommends handoff, finds the supplied visual target's craft floor met as a playable interpretation, and identifies no required repair. Its bounded scores are art 3/4, observed camera/readability 4/4, and visual feedback 3/4; it does not supply a complete weighted score.

The [build manifest](build-manifest.json) identifies all 13 runtime files fetched from the working page and checked byte-for-byte against the local source. The page runs at `http://localhost:8317/`; on the same network, the current computer address is `http://192.168.1.167:8317/`.

The third fresh Astra visual reviewer drove this candidate with actual browser keyboard events and tapped the start/restart buttons. The [original silent recording](review-playthrough.webm) preserves the climb, checkpoint death and recovery, an upper-ledge miss and recovery, summit, and restart. Its [route summary](route-summary.json) confirms all 28 authored ledges were landed on, the checkpoint activated, one intentional death occurred, the grounded summit was reached in 41.58 game seconds, and restart cleared the attempt. Screenshot capture and browser automation add wall-clock time. No teleportation or debug input/state changes were used for this route.

Selected unedited frames from that same reviewed build:

- [Opening after restart](opening.png)
- [Wall kick](wall-kick.png)
- [Activated checkpoint](checkpoint.png)
- [Summit approach](summit-approach.png)
- [Result and replay action](summit-result.png)

The [shell check](shell-check.json) covers seven loaded generated assets, actual desktop keyboard start/jump/restart, pause focus containment, the gentler-effects setting, and separated 64/82 px controls without horizontal overflow in a 320×568 portrait browser viewport. The [renderer pacing sample](renderer-pacing.json) records 601 frames over ten seconds at DPR2 in desktop Chrome, with p95/p99/max 16.8 ms and no page errors. This clean sample excludes screenshots during measurement; the recorded route's capture delays are not a phone-performance measurement.

Twelve retained controller checks live at `test/ash-and-echo.test.js`, including complete input-driven routes, short/held jumps, jump resources, coyote/buffering/corner forgiveness, checkpoint/reset, frame-cadence equivalence, and late-versus-stale input through respawn. Independent before/after real-browser retry evidence remains in `tmp/ash-and-echo/movement-judge-2/`.

This packet supports the inspected browser behavior and art/motion judgments. It does not establish physical-phone comfort, sustained phone performance, human listening quality, or universal S-tier acceptance. Ash & Echo was developed iteratively with additional context and resources, so it is a reference for calibration, not a controlled benchmark result.
