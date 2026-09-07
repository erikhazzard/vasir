# Ash & Echo — revision after the human C

The revised game is playable at [localhost:8317](http://localhost:8317/) and [192.168.1.167:8317](http://192.168.1.167:8317/) on the same Wi-Fi. The unchanged human C build remains on port 8318. This packet freezes the revised source and records the improvement without relabeling the earlier optimistic handoff.

**Handoff status: an A candidate for the observed visual experience.** Independent reviewers closed the final named material and double-jump findings. That is a bounded development judgment, not a whole-game A/S award. Reviews of the preceding iterations ranged from B to A; they remain preserved. No complete weighted total, normal-speed audiovisual perception, physical-phone feel, or human acceptance is asserted.

## What changed

Danger now has its own crimson/ivory value and color separation, large hooked shapes, and a dark keyline. Thorns draw after mist and character effects. A death marks the actual contact with a short cut and names its cause; the explanation sits below the HUD, clear of the retry path. The physics emits cause/contact data without changing the course or controller tuning.

The old mostly static painted hero and trail renderer were replaced by a deforming body with independently animated eyes, spine, claws, and soot. Launch, wall brace/kick, double jump, fall, landing, death, and reform have different bodily responses. Iteration shortened an overly prolonged flat double-jump beat and replaced broad fin-like fringe with thinner curved roots and moving painted fray. Contact now drives a bounded camera spring; movement sounds have distinct material attacks, impact-scaled landings, and a short thorn cut with ambience ducking. Restart resets presentation before the first new input so its jump animation is retained.

## Calibration and independent evidence

The [canonical judge](../../../references/portrait-wall-climber-judge.md) keeps the user's weights: movement/touch 45%, juice 20%, art 20%, camera/readability 10%, flow 5%. The user's C is authoritative. Confusing lethal encounters cap quality at C; baseline-like stiffness caps it at B. Correct mechanics, a source-aware successful route, a high-resolution asset, or the presence of effects do not establish a high quality grade.

- [Cold danger review](cold-danger/review.md): before source or route knowledge, an Astra reviewer identified floor and wall thorns as lethal, explained actual deaths, and demonstrated changed successful attempts. Both wall orientations and floor contact were encountered. Higher-course cold play was not completed. The [unaltered-speed wall loop](cold-danger/revised-wall-loop.mp4) preserves an actual revised encounter and correction.
- [Initial B art review](b-review/revision-art/independent-art-review.md) and [B+ character review](b-review/revision-quality/review.md): substantial improvement over C, with overly similar aerial silhouettes and rigid fringe remaining.
- [Intermediate A review](intermediate-a-review.md), [intermediate B+ review](intermediate-b-review.md), and [fresh B review](b-review/final-cold-art/review.md): disagreement about severity remains visible. The fresh review specifically identified prolonged flatness during the air jump. These grades describe earlier snapshots.
- [Final fringe closure](final-art/closure.md): ragged, curved soot replaces the attached-fin impression at native size; no further repair requested for that finding.
- [Final double-jump closure](final-double/closure.md): the short coil opens by about 75 ms; a taller rising core carries the impulse by 108–142 ms. The [direct-live sequence](final-envelope/capture.json) includes 11 native frames and an [unaltered recording](final-envelope/video/0ac25a8fe27f0717beb165e8be7d02e1.webm). The last frame is near-apex, not the exact zero-velocity instant.

All development reviewers were GPT-6 Astra. They inspected native images and temporal sequences while driving the real browser, but their tool surface did not provide perceptual normal-speed video or audio playback. The recordings are retained evidence, not a claim that reviewers watched or heard them. The [calibration sanity check](judge-sanity.md) explains why the final pass closed specific findings instead of chasing unrestricted letter grades.

## Runtime checks and limits

The twelve retained controller checks remain valid for the unchanged controller behavior, including complete 28-ledge routes. The integrated rebuild also completed a real-keyboard climb with checkpoint death, upper-ledge misses/recovery, summit, and restart ([receipt](checks/integration-route.json)); that run predates the last presentation-only repairs and used an informed navigator.

The final live character passed [1,800 contract frames](final-envelope/contract-check.json), including no simulation mutation, canvas-state leakage, or paused-frame drift. The final [Chrome desktop DPR2 measurement](checks/performance.json) recorded 607 frames over roughly ten seconds after warmup, p95/p99/max 16.8 ms, with no intervals over 33.4 ms. An [earlier initial-window sample](checks/performance-final-initial.json) had one 266.7 ms first interval; it is retained rather than silently discarded. The synchronized warmup measurement qualifies steady gameplay, not startup or physical-phone performance.

[Shell checks](checks/shell-final.json) cover keyboard start/restart, pause focus, gentler effects, seven assets, and separated controls at 320×568. [Death/retry layout checks](checks/death-layout.json) keep the explanation clear of the hero at 390×844 and 320×568. A [focused restart probe](checks/restart-juice.json) reproduced lost first-jump animation in five pre-fix attempts and retained it in all five after the explicit presentation reset.

The [audio notes](audio/NOTES.md) and [runtime WAV](audio/candidate-runtime.wav) retain synthesis evidence: finite, unclipped samples; bounded sources; released tails; working mute, visibility handling, and disposal. The captured live mix peaked at −8.56 dBFS. Human listening quality remains unverified.

## Frozen identity

[Source and asset hashes](source-sha256.json) identify the served build. Final `character.js` is `e4f6c01f534446c40581af4563bc6bcfb89b59fbb70b4f86524ef5ed89f1fffd`. [Candidate source](candidate-source.zip) and [C source](c-baseline-source.zip) are preserved with asset manifests; both use the existing tracked assets in `site/ash-and-echo/assets/`. The B hero source is also retained in `b-review/character-B.js`.

Further changes should respond to a demonstrated regression, an unresolved concrete play problem, or the author's next play assessment. This candidate does not establish a universal ceiling or a scored Games benchmark result.
