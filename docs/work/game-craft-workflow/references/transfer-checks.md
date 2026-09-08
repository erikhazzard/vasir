# Cross-game transfer checks — September 7, 2026

The revised workflow produced concrete, uncoached repairs in two fresh non-platformer builds: a quiet ceramic puzzle and a real-time Three.js driving game. Eight separate decision probes checked materially different requests and narrow routing boundaries. This supports the intended transfer in the observed cases; it does not establish universal quality or improvement over the previous workflow.

## Method and source boundary

Two independent ephemeral Codex sessions received the full local catalog of 73 skills and contrasting bounded briefs. They used the configured GPT-6 Astra model with max reasoning, normal local skill discovery, and the installed game workflow. Neither received this conversation, Ash & Echo source, a list of expected defects, or repair coaching. Their prompts requested playable games and actual quality evaluation: [puzzle brief](../evidence/porcelain-brief.txt), [driving brief](../evidence/harbour-brief.txt).

The executors authored, played, inspected and repaired their own games. Root inspected their ordinary-play captures, selected before/after states, input traces and reported checks; root did not conduct a separate blind human playtest. Driving automation used read-only game observations to choose real keyboard inputs. Reachability with that assistance is not novice comprehension proof. The independent routing reviewer saw the skills but did not play either build.

The build inputs were frozen before execution. Root subsequently clarified the art guide's real-time 3D representation, actual reading/viewing cadence, and preservation of required text and simultaneous comparisons. Additional static probes checked those changes; the games were not rebuilt merely for these wording corrections. [Source hashes](../evidence/skill-source-scope.json) distinguish the two inputs from the final guide.

## Porcelain Path: quiet, untimed, no avatar

The executor made a matte ceramic 6 × 5 rotation puzzle in HTML/CSS/JS. The player traces water through mutually connected channels, experiments with branches, and undoes a choice. Rigid quarter-turns and a stable completed board fit the brief. It acquired no jump mechanic, mascot, camera shake or atmospheric scene.

| Observed problem | Repair and evidence |
| --- | --- |
| The board displaced keyboard help, while the spring looked detached from its channel. | Cap the board against available height; correct source layering and align its connection with actual row/gap geometry. Compare the same first turn [before](../evidence/porcelain-path/initial-first-turn.png) and [after](../evidence/porcelain-path/repaired-comparison-first-turn.png). |
| A medium landscape window became an unnecessarily tall stacked page. | Make the breakpoint respect orientation. Compare [820 × 680 before](../evidence/porcelain-path/initial-small-landscape-820x680.png) and [after](../evidence/porcelain-path/final-820x680.png). |
| Narrow-screen line breaking joined two sentences; reset after several rotations could create an excessive spin. | Preserve whitespace and restore the nearest equivalent visual angle. Responsive and rapid-input checks cover those boundaries. |

Actual pointer and keyboard runs reached the full 18-tile solution, misleading branches, undo/reset recovery, solved-state interaction and replay. The played solution also wets three side-branch tiles. A separate graph search found one simple source-to-basin route. Rapid turns followed by undo/reset settled without stale animation. The browser checks observed no page/console errors.

The [ordinary play recording](../evidence/porcelain-path/played-mouse-route.mp4) preserves native capture timestamps over 19.25 seconds. [Turn samples](../evidence/porcelain-path/ordinary-turn-sequence.png) and the [completed board](../evidence/porcelain-path/solved-desktop.png) support the visual findings. Retained receipts: [browser inputs/checks](../evidence/porcelain-path/browser-proof.json), [layout checks](../evidence/porcelain-path/responsive-proof.json), [route search](../evidence/porcelain-path/rules-proof.json), and [source/check archive](../evidence/porcelain-path/source-and-checks.zip).

Two initial harness assumptions were corrected: an exploratory move validly wetted more tiles than expected, and a disabled solved tile required a real coordinate click rather than Playwright's enabled-element helper. These were proof corrections, not product defects.

Limits: one authored board, no persistence across refresh or audio; Chrome desktop and emulated touch only. Physical phones, other engines and screen-reader use were not tested. Tiles below a 390-pixel viewport are smaller than 44 pixels; short windows scroll supplementary text. The author recommends the result, without claiming human taste acceptance.

## Harbour Run: landscape, continuous control, real-time 3D

The executor made a miniature dockyard slalom in Three.js with original geometry, a rigid car, six ordered gates, timer/best time, pause, reverse and retry. Steering load, acceleration, coasting, braking and contact have different responses. It retained a real-time mesh world and car handling instead of importing an elastic platformer character.

| Observed problem | Repair and evidence |
| --- | --- |
| Following full car heading pushed the next gate offscreen at turn exits. | Limit camera heading follow while retaining vehicle rotation and load. Compare gate 2 [before](../evidence/harbour-run/initial-run-gate-2.png) and [after](../evidence/harbour-run/harbour-run-gate-2.png). |
| The intro persisted during driving, and gate messages covered the car. | Correct hidden-state CSS and move acknowledgments below the timer; ordinary driving remains visible. |
| Bollards intersected the car at the curb; impact pitch used a world axis. | Align props with the collidable curb and project contact into vehicle space. Separate [light](../evidence/harbour-run/repaired-light-contact.mp4) and [strong](../evidence/harbour-run/repaired-strong-contact.mp4) contacts include normal reverse recovery. |
| Bevel expansion swallowed attached door numbers and office windows. | Normalize authored box bounds and place detail on the actual visible surfaces. |
| A recovered missed gate left a stale warning. | Tie the hint to the recovered state and assert the player-visible text boundary. |

The [final recorded route](../evidence/harbour-run/harbour-run.mp4) finishes all six gates in 22.78 seconds with no heavy contact. A separate 23.34-second route includes an unplanned crate collision and normal-input recovery. The later reproduction finishes in 22.66 seconds, then exercises result retry and retained best time. These run times identify observations; they are not a performance ranking.

Five fixed-step integration checks cover route completion, gate-order rejection, pause, braking/reverse and contrasting contact forces. Eight browser flow groups cover ordinary control, pause, the focus-loss handler, missed-gate recovery, repeated restart and smaller landscape windows. The focus-loss check explicitly dispatches a synthetic blur because headless tab switching did not produce native OS focus loss. [Final verification](../evidence/harbour-run/final-verification.json), [simulation checks](../evidence/harbour-run/simulation-checks.json), [route trace](../evidence/harbour-run/harbour-run.json), and the [source/check archive](../evidence/harbour-run/source-and-checks.zip) retain those boundaries.

Limits: one flat keyboard course with arcade grip/contact, no rollover or deformation. Chrome headless on this Mac; other browsers, hardware and blind human handling are untested. Silent captures do not prove audio quality. Local frame pacing and stable warm restart resource counts are supporting observations, not a hardware guarantee. The reproduction includes one frame over 33.4 ms; a selected smoother run does not erase it.

## Independent routing and final correction

The [eight probes and final audit](../evidence/routing-probe.md) cover dialogue mystery, rigid VR interaction, rhythm timing, a narrow save/health bug, settings-only transitions, landscape sports, an existing real-time 3D marble maze, and text-only investigation. They preserve the requested platform, representations, timing, controls and reading surface; bugs and menu motion stay with their narrow owners.

The audit found a remaining art-guide instruction favoring on-demand detail even when text or simultaneous comparison is the game. Root narrowed that advice to peripheral information and preserved required visible content. The independent reviewer reread the two repaired paragraphs and closed that finding. This is a static decision check, not eight additional played games.

## Retention and interpretation

The selected recordings, before/after images, original proof receipts and portable source/check archives are retained alongside per-build hashes. [Run receipts](../evidence/forward-runs.json) record completed sessions and raw work consumed; [final validation](../evidence/final-validation.json) records repository checks. Raw frame directories, redundant captures, copied catalogs and full CLI event streams remain scratch material. Archive checks refer to the local tooling paths used by their authors; the games themselves run locally with the stated entrypoints. Both temporary test listeners are closed; the existing Ash & Echo server is preserved, as recorded in [cleanup](../evidence/session-cleanup.json).

There was no matched previous-workflow control, human grade, or cross-device study. The earned result is narrower and useful: normally routed guidance led fresh agents to preserve two different game identities, inspect actual play, find relationship/state failures, repair them, and qualify their conclusions. Ash & Echo remains the accepted development reference, not the unseen transfer test.
