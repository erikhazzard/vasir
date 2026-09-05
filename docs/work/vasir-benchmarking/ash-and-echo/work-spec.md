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

**Active:** Build the complete first candidate with independently composited art and actual movement.
**Next:** Browser play and captured movement evidence, then fresh Astra visual and gameplay judgments against the five weighted dimensions. Repair material weaknesses and re-review the changed candidate.
**Evidence:** Runtime checks, screenshots, input/event traces, clips or filmstrips, and reviewer receipts belong in `tmp/ash-and-echo/`; retain the final concise result here. Initial implementation has no passing receipt yet.
**Done when:** The intended climb is genuinely completable with correct rules; portrait and desktop input/restart flows work; the final page is reachable; fresh reviewers have inspected the final candidate and material failures are fixed. Human touch feel and final taste remain the author's judgment when they play.

## Review rubric

Use the existing [judge](../references/portrait-wall-climber-judge.md): movement/touch 45, juice 20, art 20, camera/readability 10, run flow 5. Reviewers must cite actual image/motion/input evidence and separate unverified claims from defects. This task's reviewers are all Astra, as explicitly requested; the future benchmark panel remains Astra/Fable.
