Archive note: full matched event WAVs and scripts remain in `tmp/ash-and-echo/audio-rebuild/`. This packet retains the runtime WAV and level/lifecycle receipts.

# Ash & Echo movement audio candidate

Product change: `site/ash-and-echo/audio.js` only. Master and effects bus levels remain at their previous settings. Contact layers have more amplitude and shorter envelopes; timbre, articulation, space and dynamic contrast distinguish the actions.

Listen to `candidate-runtime.wav` for an 8.4-second real Chromium mix with ambience. Its sequence is launch, double jump, land, launch, wall kick, double jump, hard land, launch, thorn cut, reform, launch, land, checkpoint. This capture calls the production event/update API with a scripted movement sequence; it is not a recording of a player completing the route.

`baseline-movement-reel.wav` and `candidate-movement-reel.wav` use matched texture seeds and isolated events rendered by Chromium's actual OfflineAudioContext. Order: launch, wall kick, double jump, soft landing, hard landing, thorn death, fall death, reform. Each segment lasts 1.45 seconds with its event at +0.25 seconds. Individual WAV files include longer tails; milestone files preserve the complete bell/choir tails.

Changes:

- Launch: immediate low ink body, brief suction and delayed peel; sound never gates movement.
- Wall kick: high fracture, two short inharmonic stone modes, low body and air whip.
- Double jump: hollow body with rising strained resonance and tearing air; no additional melodic reward note.
- Landing: bass and grit scale with impact, with a softer settling sound behind the contact.
- Thorn death: high blade edge, low rupture and immediate movement/choir/reverb duck. A falling death uses a duller edge. Contact panning reads optional `contactX`.
- Reform: quick reverse breath, a small contact and short choir resolution.
- Sustained clean movement opens existing choir harmonics. No additional continuous sources or timers.

Evidence:

- `render-report.json`: real browser OfflineAudioContext synthesis with a scheduling-clock adapter; no mocked audio nodes. All isolated events have finite samples and zero clipping, and transient graph nodes are released. Candidate thorn audio above −60 dB lasts approximately 0.18 seconds versus 0.77 seconds in the baseline. Checkpoint/win synthesis remains identical.
- `runtime-report.json`: real running Chromium AudioContext. Lazy construction, unlock, mute event suppression, and actual suspend/resume pass. Visibility notifications are synthetic. An intentionally impossible event-rate stress run peaks at 51 scheduled/active sources including nine continuous sources, then returns to 47 graph nodes and nine continuous sources after all tails. Disposal disconnects every tracked graph node and closes the context. Chromium does not emit ended notifications for every continuous source after close, so the final source tracker retains nine entries; these cannot run in the closed, disconnected context.
- `runtime-levels.json`: decoded live mix peak −8.56 dBFS, zero clipped samples. This WAV was decoded from MediaRecorder Opus, so its peak includes codec reconstruction.
- Syntax and diff whitespace checks pass.

Limits: these captures and measurements establish synthesis, level, timing and lifecycle behavior. No human listening score, speaker/headphone judgement, mobile hardware listening test or S-tier aesthetic claim has been made.
