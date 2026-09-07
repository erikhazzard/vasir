# Revision10 — shared light, material aftermath and character acting

The creator approved three craft improvements after revision9's **solid A** assessment. This candidate implements them on the existing climb. The prior human grade remains the anchor; this packet does not award S or a weighted benchmark score.

## What changed

- Five chipped cathedral openings supply a shared light field to fog, stone faces, selected chain links and nearby ash. Nearer architecture interrupts the illuminated air. Fog continues drifting independently of jumping. Three complete foreground silhouettes add an arch shoulder and pier, clustered capital and shaft, and broken buttress across six existing placements. See the ordinary-play [opening](opening.png), [bell contact](bell-contact.png) and [summit](summit.png).
- Contact ash rests on its actual support and follows the hanging stone. Braking sweeps the broken fringe; takeoff pulls it off the surface. Light touches, committed contacts and immediate rebounds differ in duration and release. Contact sound gains a speed-dependent scuff and shorter body tail on quick rebound, while iron and bell keep their delayed responses. Compare [before](ash-before.png), [contact](ash-contact.png), [settled](ash-settled.png) and [rebound](ash-rebound.png), or inspect the [recorded sequence](surface-ash-sequence.webm).
- Spending the air jump leaves a small outer-mantle crescent absent after the transformation. The nucleus and eyes remain intact. Grounded recovery gathers ash after the body catches the stone. Ash looks toward the sounding bell, follows with its crown, and exhales before resting at the refuge. Movement and jumping interrupt these poses immediately. See [ready](character-ready.png), [spent at675ms](character-spent-675ms.png), [gathering](character-refill.png), [listening](character-listens.png) and [exhale](character-exhale.png). These character scenes arrange initial positions and use actual game steps; they are not continuous traversal proof.

## Review findings and repairs

The [fresh Astra critic](independent-critic.md) found ordinary landing deceleration permanently cancelling pending bell attention. Its [original probe](critic-listen-before.json) reproduces this at incoming speeds50/100/180. The [same probe after repair](critic-listen-after.json) confirms attention in all four cases, including the zero-speed comparison. A120ms initial settling grace preserves the opportunity without showing the pose during motion. Separate [checks](listen-after.json) cover continued steering, first movement after attention, and immediate jump.

The critic also found native resting and ash aftermath underexpressed. The final character adds an eye-close/exhale before relaxing; ash has a larger broken fringe and longer committed-contact tail. A subsequent sequence revealed rising stone overtaking released ash; grains now inherit its upward velocity and respect its live face. The original critique remains unchanged.

The critic's sandboxed Chrome failed before page creation. Its independent judgment uses retained native/enlarged frames and its own functional probes. Root subsequently ran its authored browser harness successfully:43 frames, completed opening, no browser errors ([receipt](critic-authored-browser.json)). This does not turn its review into direct browser play. Its remaining composition observation is preserved: foreground masses still predominantly frame a bright vertical shaft. No inspected crop or hazard-occlusion defect required another repair.

Earlier corrections replaced a bright regular window outline with chipped masonry, moved resting chain exposure into cached highlight paths with reliable coordinates, and widened ash hidden beneath the character. See the [process log](../../process-log.md).

## Final evidence

| Boundary | Result | Evidence |
| --- | --- | --- |
| Ordinary touch input | Visible Chrome touch controls reach the refuge at6.042 game seconds; no deaths/errors | [Recording](touch-opening.webm), [receipt](touch-opening.json) |
| Complete climb | Ordinary keyboard handlers reach summit at35.517 game seconds, including one deliberate checkpoint death, recovery and restart | [Recording](full-climb.webm), [receipt](full-route.json) |
| Quiet desktop pacing | 390×844 DPR2;26 hanging-stone contacts;1,097 frames; median/p95 16.7ms, p99/max16.8ms; none over33.4ms | [Receipt](performance.json) |
| Character state | Ten edge cases pass; spend/refill, wall kick, buffered rebound, interruption, reset, pause and bounded pools | [Edges](character-edges.json), [native](character-native.json), [gentle](character-gentle.json) |
| Surface attachment | Thirteen invariants pass; zero moving-support anchor error; release, occlusion, reset and gentle mode covered | [Invariants](surface-ash-invariants.json), [sequence](surface-ash-sequence.json) |
| Foreground bounds | Six placements and873 sampled landing/camera views retain at least67 logical pixels of clear landing top | [Receipt](foreground-receipt.json), [probe](foreground-probe.json) |
| Resources | Four camera sweeps plateau at99 canvas creations, seven GPU textures, one buffer/program, zero framebuffer targets; no repeated uploads | [Receipt](resource-checks.json) |
| Fallback/lifecycle | WebGL unavailable/lost/restored; working jumps;12 restarts; paused gentle pixels identical; no errors | [Receipt](fallback-checks.json) |
| Audio | Seven paired browser-native offline renders;12 check groups; rebound releases four body gains while preserving metal/bell timing; no clipping/nonfinite samples | [Checks](audio-checks.json), [renders](audio-renders.json), [phrase](contact-phrase.wav), [rebound](rebound.wav) |

All twelve served JavaScript hashes in the final touch, climb and pacing receipts match the [captured source](source-identities.json). Nineteen existing controller/camera tests also passed. Game/controller/course, input, HTML and CSS match the revision9 baseline. Image assets were unchanged; their [identities](asset-identities.json) refer to existing `site/ash-and-echo/assets/` files.

Resource/fallback probes preceded final local character/ash/audio refinements, which add no canvas, texture, program, target or frame owner. Final pacing and played receipts cover the completed source. Canvas creation count is not retained-memory count. Two additional foreground caches cost about6.05MiB nominal RGBA; Canvas2D fallback lazily adds one128×460 light image. No new full-scene GPU pass or target was added.

Stone and resting-chain light is baked at authored home positions and travels with small suspension displacements; moving chain segments sample live positions. This is an approximation, not dynamic shadow-casting. Ash contacts use cached exposure. Measurements are desktop Chrome on Apple M5 Pro, not physical-phone thermal or touch-latency evidence. Recordings are silent; offline checks do not establish headphone mix quality. Stills and scripted routes cannot certify perceived S-tier feel or first-time comprehension.

`probes/` preserves selected temporary harnesses with original local dependency/scratch paths. Archived specialist notes likewise retain their original relative scratch references. Further frames and failed/corrected probes remain under `tmp/ash-and-echo/shared-light-pass/`. No skill was changed; extraction remains deferred.
