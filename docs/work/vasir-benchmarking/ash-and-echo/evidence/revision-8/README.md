# Revision8 — movement wakes the cathedral

The creator approved the short authored passage after rating revision7 **solid A− / borderline A**. Revision8 is a new playable candidate, with no new human grade or S acceptance. The development page is `http://localhost:8317/`.

The opening now offers two low hops, a wall transfer, a delayed air crossing to a suspended bell stone and a short jump into a lit resting place. The lower recovery shelf remains an alternative route. Existing controls, the later checkpoint, and the summit persist. A darker arcade encloses the approach; ascent opens the view above it. Light touches the refuge stone itself. The camera follows outside a vertical band so nearby landings reveal the stone, cable and bell motion against a steadier frame.

## Play and revisions

- [Final touch opening](touch-opening.webm), [native rest frame](refuge-rest-phone.png), and [touch receipt](touch-opening.json): ordinary Chrome touch contacts on visible controls complete the intended opening at 6.05 game seconds, with no deaths or checkpoint activation. All ten served module hashes match the final source. This is desktop browser touch emulation, not physical-phone testing.
- [Full keyboard climb](played-route.webm) and [receipt](played-route.json): actual browser keys complete the route in 35.525 game seconds, including a deliberate checkpoint death/recovery and the real restart button. All 29 intended main-route contacts are represented once; checkpoint respawn restores the grounded player without an additional landing event. The optional recovery shelf is separately covered in simulation and independent play. After this recording, main.js received only the small caption fix that clears the double-jump hint once performed; final touch evidence covers that exact source.
- [Independent play critique](independent-play-review.md): a fresh Astra reviewer played before reading the course or its proof script, understood the opening, found a recovery route and retried after thorns. Their route bypassed the bell stone through the recovery shelf. That valid shortcut is retained. Their camera critique led to the final follow-band repair; the earlier recording does not itself validate that repair.
- [Independent art critique](independent-art-review.md): the resting stone initially looked as dark as the preceding ledges. A static ivory spill was baked into its existing cache and the existing air shaft strengthened. In a final review of the ordinary-touch opening/rest frames, the same critic found the local light perceptible with no new clipping/material seam; that closes the specific still-image finding, not motion or whole-game quality.

## Mechanical and runtime evidence

The course specialist ran the 19 retained controller/camera tests successfully, covering movement forgiveness, one-action presses, retry, suspension carry/reset, long falls, deterministic batching and complete routes. Frozen test/source copies and [identities](source-identities.json) preserve the tested contracts.

[Opening simulation](opening-simulation.json) takes 5.417 seconds; the [direct alternative](direct-transfer-simulation.json) takes 5.292 seconds. An [early double-jump miss](recovery-simulation.json) lands on recovery and reaches the rest in 6.650 seconds. The original 8–12-second estimate was a scope estimate, not an enforced timer or a reason to pad the recording. Full simulation routes take 33.20 seconds with the wall kick and 33.07 seconds direct.

[Camera before](camera-before.json) and [after](camera-after.json) replay the same opening input: over the first 350 ms after the suspended contact, camera travel falls from 34.306 to 0 logical pixels at 420/620/740/1100 logical viewport heights, while stone sag remains 8.567 pixels. Immediate visibility bounds remain active during long falls. These are simulation measurements, supported by the final ordinary-input videos.

[Impact pacing](impact-performance.json): quiet Chrome on Apple M5 Pro, 390×844 DPR2, actual-key opening then 26 repeated bell-stone contacts, without screenshots/video during the measured window. Across 1,100 frames: median/p95 16.7 ms, p99/max 16.8 ms, zero above 33.4 ms. This does not establish phone thermals or headset perception.

[Resource checks](resource-checks.json): four arranged camera sweeps plateau at 97 cached canvases, seven GPU textures, one quad buffer/program, zero framebuffer targets, and no repeated texture uploads. One darker facade texture is the bounded addition; it participates in the existing compositor. The number uploaded after context restoration depends on which layers are visible. [Fallback checks](fallback-checks.json) pass WebGL loss/restoration/unavailability, 12 restarts, working jumps, and byte-identical paused gentle-mode captures.

## Material and sound

[Material notes](material-notes.md) and [contact phases](contact-phases.json) isolate stone/iron response: pin ash at 170 ms, angular bell force at 220 ms, with the corresponding bell strike at 350 ms. The bell follows the real suspended platform's displacement. Small approach contacts are quieter; strong contacts gain duration and propagation.

[Current audio phrase](authored-phrase.wav), [previous material treatment](previous-material-phrase.wav), and [audio report](audio-phrase-report.json) use the same successful opening events, plus tail, in browser OfflineAudioContext. Ambient gains are zero for this isolated comparison. Synthesis and cleanup remain bounded, with no clipping or non-finite samples. Audio input is unsupported in this environment; no listening verdict is claimed. Already scheduled audio tails retain the existing AudioContext-clock behavior during pause.

## Provenance and limits

Source copies are archival snapshots of `site/ash-and-echo/` and the controller test. Harness copies retain their original scratch import/output assumptions; the runnable originals remain under `tmp/ash-and-echo/authored-pass-v8/`. Reviewer notes can refer to those preserved scratch artifacts. Source identities describe the final candidate; earlier review and causal comparison artifacts are explicitly scoped above.

Failed proof attempts remain in scratch: a destination changed midair, a requested checkpoint jump was already held, an over-eager polling loop shortened intended jumps, and the first touch harness ended the wrong contact. The 85-second run still completed with recoveries; it was replaced as the ordinary full-route proof after fixing the harness. Game geometry was not changed to disguise these failures.

The last human anchor is still revision7. Physical-phone control/thermal experience, headphone mix quality and S-tier acceptance remain open. This feedback-rich development reference is not a formal competitive benchmark result. Process and decisions are recorded in the [process log](../../process-log.md); skill extraction remains deferred.
