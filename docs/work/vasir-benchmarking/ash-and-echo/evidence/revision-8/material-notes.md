# Authored opening material phrase · renderer/audio handoff

Owned production files: `site/ash-and-echo/renderer.js`, `audio.js` only. Course metadata belongs to the course agent; root owns character/depth/foreground/main/docs. No input, collision, suspension dynamics, controls, or simulation events are changed here.

The movement wakes a located structure: body/contact grit at landing; lower iron catch at 55ms; wall-pin iron and ash at 170ms; attached bell receives angular force at 220ms; its opposing clapper motion accompanies a low B2 bell strike at 350ms. The focal bell is fastened below `resonant-stone`, using its `resonance` world pivot and following the slab's simulation-owned displacement. Normal jumps no longer kick this bell through a proximity radius. Elsewhere, nearby props retain restrained responses.

Quick approach contacts needed landmark weighting: actual route intensities .786/.749 were too close to suspended landing .834 to establish the requested contrast by speed alone. First/second-hop material intensity is multiplied by .52. Ordinary launch voice gain falls from .85 to .40 and dust from 13 to 6 particles. Focal stone adds duration and physical propagation, not a larger all-purpose explosion. Horizontal contact velocity and offset bias grit, cable load, bell body and clapper direction.

Fixed steps have supports cached into their existing platform images. The first-hop solid prism reaches the floor. Wall corbels and the refuge's left cantilever use the same charcoal platform-face material, with their attachment extending into masonry. Fixed central platforms no longer receive hanging chains by accident. The real checkpoint/refuge and summit remain distinct existing destinations.

## Evidence and limits

- `contact-phases.mjs` / `contact-phases.json`: arranged near-contact state, followed by actual 120Hz game collision and production renderer. This isolates the material response and does not prove route reachability. No browser errors. At 166.7ms, 18 contact particles; by 191.7ms, 30 particles (12 pin grains added). The bell is still at rest then. At 241.7ms, bell angle .0233rad; at 358.3ms, body .1227rad and opposing clapper -.1868rad. The stone moves 9.57px under this 1.028-intensity probe, returning toward its loaded resting sag. Cable bow is zero after 1.4s. Bell swings persist as the low acoustic tail.
- Exact paused visual state holds across 60 renderer calls with `dt=0`. Gentle mode reports zero cable bow; its existing reduced prop motion and particle scaling are preserved. Opposite .8-intensity contacts produce mirrored bell/body and clapper values at 300ms. These are presentation checks; they do not establish audio-tail freezing on pause (the pre-existing audio clock continues existing tails).
- `render-audio.mjs` / `render-report.json`: isolated browser-native OfflineAudioContext synthesis, same repeatable noise, 48kHz stereo. The actual first-hop intensity/landmark produces -24.32dB peak, versus -14.66dB before. Ordinary jump -22.04dB versus -15.62dB. Wall kick and double-jump levels remain the same. Focal .8-intensity contact peaks at -14.44dB versus -13.48dB before, while last sample above .001 extends from .413s to 1.516s. No clipping or non-finite samples; after tails all 47 persistent nodes remain, and disposal disconnects all nodes.
- `render-phrase.mjs` / `phrase-report.json`: renders every event from the course agent's `opening-route.json`, with a .5s lead-in. Native offline rendering suspends at each event so ended voices are actually released; scheduling all future events up front would incorrectly consume the live voice cap. `candidate-authored-phrase.wav` is the complete 5.417s route plus tail in a 10s WAV; `baseline-authored-phrase.wav` is the matched previous version. This clip contains action/reverb nodes; ambient control gains remain zero for isolation. Candidate total RMS .01093 vs baseline .01311, peak .3084, zero clipping/NaNs. Maximum 18 sources including nine persistent ambience sources; no final events are dropped. Event voices return to the persistent node plateau.
- WAVs are reviewable human-listening artifacts, not a listening verdict. The root attempted audio input but the environment does not support it. Headphone mix judgment remains unverified.
- `00-opening.png`, `phase-*.png`: direct production browser screenshots, application RAF suppressed for exact stepping. Root scene edits were live during capture. Final ordinary-input route/composition evaluation belongs to root.
- Syntax checks pass for both changed modules. A bounded manual renderer submission probe is retained in JSON as CPU-only wall timing; it is neither GPU timing nor a mobile FPS or performance improvement claim. No repeated performance work was run during the independent play judgment.

## Hot-path guard

Disposition: `SAFE_LOCAL_CHANGE`.

One existing main RAF still owns simulation, the Canvas2D game surface, and the existing depth/atmosphere path. Scene submissions, logical passes, WebGL passes, offscreen GPU targets, terminal writes and render owners: delta zero. No new timers, RAF, GPU resources, downloaded images, workers or full-scene work. Platform support pixels expand existing once-built Canvas2D caches; they add no cache owner. An additional single bell adds two existing sprite draws when visible and one bounded pendulum update in the existing presentation loop. Cached cable work remains two rest strokes per cable, or eight transformed segments only during its finite 1.4s response. Contact particles stay inside the 128-slot pool. Event voices still obey the existing 18-group/48-source limits, including the three delayed bell oscillators.

A worker would add transfer/ownership cost for a few scalar pendulum operations and cached Canvas2D draws; the local work remains with the existing frame owner. No optimization or target-device performance gain is claimed. Development scenery inspection allocates only on request and now exposes active particle count, cable contact offset and the attached bell's owner/phase for causal checks.

Source identity at handoff:

- renderer.js: `b5e7e0e6650046d374ea89ac88e801dbe2cbc1c77acb14093c36e6359d557ef3`
- audio.js: `4bfc8cdfd0ca50dc71005e9327f01d11b4e974781305f3782eb649a08ac79dfd`
