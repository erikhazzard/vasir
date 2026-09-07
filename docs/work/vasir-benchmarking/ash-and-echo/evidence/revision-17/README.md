# Revision 17 — landing weight from the actual fall

The creator accepted revision 16 as “much better,” then found that small and large falls produced similar, static landings. This revision gives ordinary and long descents distinct body shapes, timing, surface ash and transferred force. It does not claim a tenfold numerical improvement or a whole-game S grade.

[Play locally](http://localhost:8317/?v=17). The server serves the working game; the exact reviewed implementation is frozen in `source/`. Raster assets are unchanged and identified in `identities.json`.

## What changed

The collision event now preserves descent distance from the latest apex and speed immediately before contact. Severity continues increasing after terminal speed; a late air jump starts a new descent, and wall sliding reduces impact. The same signal reaches character deformation, surface ash, stone suspension, rigging/cages/bells, bounded camera impulse, loose air ash and sound.

| Actual fall | Severity | Body response duration | Character read |
|---|---:|---:|---|
| 24 logical units | .032 | ~103 ms | Quiet near-round tap |
| 80 | .191 | ~217 ms | Driven compression and recoil |
| 300 | .679 | ~474 ms | Held low spread and gradual reformation |
| 508 or more | 1 | 560 ms | Deepest ash collapse |

Fresh movement or a jump can interrupt recovery. Body presentation never delays simulation input. Contact ash spreads along the actual receiving stone, with larger fragments and delayed grit after a heavy fall. The audio body becomes lower and longer. Camera displacement retains its existing five-unit bound and wall coverage. Fog, light shaders, raven morphology, course, jump impulses and render-resource topology retain revision 16 behavior.

Runtime changes are confined to `game.js`, `character.js`, `surface-ash.js`, `renderer.js`, `depth.js` and `audio.js`. The controller suite adds three behavioral checks and replaces an old injected-speed fixture with a real gravity fall. Existing unrelated repository edits are outside this packet's scope.

## Two independent visual rounds

[Round 1](critique/round-1.md) found that the new heavy response worked, but a real 80-unit fall was still too close to a tiny tap. The initial author showcase used 260/800-unit falls and did not reveal this common-course weakness.

[Round 2](critique/round-2.md) closes that focused finding after retuning the body's ordinary middle range and heavy hold. Native 390×844 normal-RAF comparisons use real physics after arranging only the starting position and zero velocity above the same resonant stone. No colliders are removed, contact events forced or time slowed in these critic sequences. Actual Gentle mode and same-frame buffered rebound are included. A separate maximum check uses the clear column above intact upper ledge-25.

[Selected native frames](critique/selected-final/selection.json) retain twelve mapped phases. Original normal-time videos and loaded module hashes are beside each critic receipt. Frozen revision 16 and the rejected first candidate are retained for comparison. Large extraction sequences remain scratch material.

The reviewer sees readable eyes, a distinct medium downbeat, sustained heavy compression, ash left at the stone during immediate rebound, and no new contact clipping or exposed camera edge. Near architecture partly occludes the far side of the maximum burst. This is a scoped model judgment, not human acceptance.

## Integrated checks

- **Controller:** all 22 checks pass; `controller-tests.txt` and the exact test source are retained. Beyond-terminal contrast, wall braking, late air-jump reset, restart, deterministic steps, spring riders and buffered rebound are covered.
- **Actual touch opening:** five authored contacts in 6.142 game seconds, no deaths or page errors. Receipt and video: `play/played-touch-opening/`.
- **Actual keyboard climb:** summit at 35.483 seconds, 29 landings, deliberate checkpoint death/recovery and restart. Receipt and video: `play/played-full-route/`.
- **Forms:** desktop and small portrait with actual Gentle setting, input and no horizontal overflow; `play/final-forms/receipt.json`.
- **Maximum impact pacing:** 16 arranged 650-unit gravity falls onto intact upper ledge-25, with all colliders and scenery present. Normal frame owner/event dispatch, no screenshot or recording during measurement. Desktop Chrome, 390×844 DPR2; the rolling 1,800-frame window has median/p95 16.7 ms, p99/max 16.8 ms, zero frames over 33.4 ms. `play/landing-performance/receipt.json` qualifies this diagnostic, which is not a natural route or physical-phone measurement.
- **Audio:** 16 native OfflineAudioContext renders have zero clipped/nonfinite samples and unchanged source budgets. Tiny RMS is 17.6 dB below its revision 16 counterpart; heavy body lasts 415 ms versus tiny's 86 ms. Immediate rebound cuts the four body envelopes while preserving metal/bell. [Audio receipt](audio/receipt.md) and [A/B montage](audio/height-comparison-AB.ogg). The Ogg is a compressed listening copy; objective checks used the original native samples. No human listening grade is claimed.
- **Resource discipline:** no new frame owner, render target, GPU program, texture or canvas. Character retains its 144 wake/38 burst slots; surface ash retains 16 contacts with 38 shards and 14 grains each. Surface departure behavior, clipping, pause, reset and Gentle behavior are covered by the focused surface check and character reports.

All 15 served JavaScript module identities match the final source across touch, route, forms, pacing and both final critic captures. `identities.json` preserves those checks, the controller-test identity and asset hashes. Author diagnostics are explicitly separate from the unchanged-source integrated browser evidence.

Process and rejected decisions are recorded in [the process log](../../process-log.md). No skill was created or modified. Human acceptance, physical-phone performance and a whole-game S grade remain for later evaluation.
