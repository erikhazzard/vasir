# Ash & Echo playable reference

**Purpose:** Build the full-Vasir reference game the author can play and use as a strong calibration target for the portrait wall-climber judge.
**User journey:** Open the playable page, understand the controls, climb through a spectacular monochrome world with expressive jumping, recover at the checkpoint, reach the summit, and immediately want another attempt.
**vFinal:** A complete small portrait climb with generated layered art faithful to the selected target, precise touch/keyboard controls, rich animation and sound, checkpoint/retry/summit, and a working hosted or local page. Fresh Astra reviewers inspect actual artifacts and play evidence; their judgments drive visible repairs. This development build is not a clean benchmark contestant or proof of a universal ceiling.

## Request and authority

The user explicitly requested that we generate the game with the full Vasir skill set, iterate until it reaches a high visual and gameplay bar, use fresh Astra subagents for quality judgments, and return with a playable page. The selected image in [the creative brief](../references/portrait-wall-climber-brief.md) is the minimum visual target. All implementation and review delegates use GPT-6 Astra.

## Experience contract

- Mobile portrait first, keyboard supported on desktop. One 30–45-second intended climb, with room for faster skilled runs.
- Variable-height jumping, one air double jump, wall slide/kick, coyote time, input buffering, predictable air control and corner forgiveness. A press resolves one action; wall kicking never refills the air jump.
- Responsive control persists through body deformation, soot trails, landing response, camera movement and audio.
- Monochrome layered Gothic architecture: distant light/fog, mid-distance ruins, crisp textured near walls, expressive soot creature and peripheral life. Generated raster assets are composited into playable geometry.
- The player and next landing remain legible. The camera reveals ascent and tracks falls. Touch controls never depend on hover and support simultaneous steer/jump.
- Complete checkpoint, death/retry, summit and restart. Pausing or leaving the page clears held input.
- Public-facing copy describes the game. Development instrumentation and judge receipts stay outside the ordinary play flow.

## Implementation

The self-contained static page lives at `site/ash-and-echo/`. `game.js` owns deterministic fixed-step simulation and the authored course; `renderer.js` owns compositing, parallax, animation and effects; `audio.js` owns gesture-unlocked procedural audio; `main.js` owns input, UI and the animation loop. The bounded collaboration seam is `site/ash-and-echo/CONTRACT.md`.

UI direction: a spare cinematic title over a living scene, ivory editorial serif display type, muted compact sans-serif utility text, near-black/ivory palette, and one restrained ink-like reveal on starting. Blocks: `echo-page`, `echo-game`, `echo-intro`, `echo-hud`, `echo-controls`, `echo-result`. Full portrait viewport on mobile, framed tall playfield with quiet surrounding space on desktop.

## Current motion

**Delivered:** The complete reference is running at `http://localhost:8317/`, with same-network phone access at `http://192.168.1.167:8317/`. Three fresh Astra visual reviews and two independent gameplay/movement reviews drove the repairs. The third visual reviewer recommends handoff and finds the supplied target craft floor met as a playable interpretation, with no remaining material visual blocker or required repair.
**Next:** The author plays the delivered page to judge physical phone feel and taste. No additional implementation or automated review is required by the current evidence. A controlled benchmark task, calibrated judge panel, or other model comparison remains a separate lane.
**Evidence:** Twelve retained controller checks pass in `test/ash-and-echo.test.js`, including complete 28-ledge routes with digital press/release inputs in 32.52 seconds direct and 32.24 seconds with a wall kick. An independent Astra browser reviewer completed all ledges with real keyboard events, triggered an authentic checkpoint death, respawned in 267 ms, reached the grounded summit in 34.158 game seconds, and restarted through the actual result button. Separate CDP touch probes passed simultaneous steer/jump, partial release, finger sliding, repeated jump contact, and cancellation. Real-key probes passed coyote time and released landing buffering. Detailed receipts are `tmp/ash-and-echo/review-gameplay-1.md` and `tmp/ash-and-echo/gameplay-1/`.
**Done when:** The intended climb is genuinely completable with correct rules; portrait and desktop input/restart flows work; the final page is reachable; fresh reviewers have inspected the final candidate and material failures are fixed. Human touch feel and final taste remain the author's judgment when they play.

## Review-driven repairs and measured limits

The first fresh Astra visual review rated the scene below the supplied target floor: walls were too thin, ink trails too faint, and the character lost its form against stone. Repairs widened the actual boundary masonry from 18 to 60 world units, re-anchored side ledges and thorns, varied the ledges between curved corbels, open ribs, and broken center spans, added wall recesses and a peripheral generated spider, and gave the character a denser painted ink wake plus a braced contact pose with a narrow broken rim. Both complete controller routes and the independent browser route passed with the wider corridor.

The second fresh Astra visual review independently completed the full real-input route in 34.10 seconds. It rated art 3/4, observed-route camera/readability 4/4, and visual juice 3/4, with no active-play readability blocker. It still rated the material craft below the target floor: straight wall faces, flat cutout brackets, schematic props and bare checkpoint/goal outlines. The next repair integrated detailed generated corbel and shrine assets, with real alpha verified including the shrine aperture, eroded wall sections, wrought brambles/cages, and a distinct upper-light reveal. Generation prompts and export identity are preserved in [material-art-prompts.md](material-art-prompts.md).

The third fresh Astra reviewer inspected the target before any previous reviews and completed a real-keyboard final route in 41.58 game seconds, including all 28 actual ledge landings, intentional checkpoint death/recovery, an upper ledge miss/recovery, grounded summit, and actual restart. It finds the target craft floor met and recommends handoff with no required repair. Its bounded ratings remain art 3/4, observed camera/readability 4/4, and visual feedback 3/4; coarse anchors do not imply no improvement between passes. Repeated corbels and some square fracture faces remain an optional craft improvement. This is a strong reference ready for the author to play, not a substantiated universal S-tier score. Final runtime identity, unedited screenshots, silent playthrough, and bounded receipts are retained in [the evidence packet](evidence/README.md).

A separate fresh Astra movement review reproduced a lost jump pressed in the last ~85 ms of death recovery, using both keyboard and touch. The controller now ages its existing 140 ms buffer during death and carries only an unexpired press across reset. The new test first reproduced the failure, then passed late-versus-stale cases. Fresh browser proof passed on game SHA-256 `a3cf01f9268624c4172dd01c04091f71b050fb2a9264bfa38cc9394692eefd92`: a tap pressed 93 ms before respawn and released 68 ms before respawn emitted `respawn` and exactly one `jump` on the same tick; an old continuously held press returned idle without repeating. Evidence is `tmp/ash-and-echo/movement-judge-2/retry-after.json`. No broader motion tuning was warranted by that review.

The frozen final renderer's Chrome DPR2 sample recorded 601 frames over ten seconds, p95/p99/max 16.8 ms, and no page errors ([receipt](evidence/renderer-pacing.json)). The third review's separate screenshot-free sample recorded 590 frames, p95 16.7 ms and p99/max 16.8 ms, with none over 33.4 ms. Earlier independent testing recorded steady unthrottled desktop pacing but p95 33.4 ms / p99 50 ms under a 4× CPU throttle. These are desktop measurements, not physical-phone performance proof. Generated assets are cached/composited in Canvas; effects use bounded pools and DPR is capped at 2.

The final browser shell check passed a real keyboard start/jump/restart, pause focus containment, gentler-effects toggle, all seven asset loads, and separated 64/82 px controls without horizontal overflow on a 320×568 portrait viewport ([receipt](evidence/shell-check.json)). Gesture-unlocked Web Audio passed bounded-source, mute, clipping and lifecycle probes; human listening remains unverified. Synthetic blur clears held input and pauses, but automation did not reproduce real app backgrounding. No complete weighted quality score or human feel acceptance is inferred from this evidence.

## Review rubric

Use the existing [judge](../references/portrait-wall-climber-judge.md): movement/touch 45, juice 20, art 20, camera/readability 10, run flow 5. Reviewers must cite actual image/motion/input evidence and separate unverified claims from defects. This task's reviewers are all Astra, as explicitly requested; the future benchmark panel remains Astra/Fable.
