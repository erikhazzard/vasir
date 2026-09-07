# Character morph repair — v12 scratch evidence

Production change: `site/ash-and-echo/character.js` only. Final SHA-256: `b59d089f02f926d5ba92fcf373e4f01a6bfeef54d67105dcf12bcd89709b1846`.

The supplied launch/comet/landing references direct the change: dense eyed head, a connected body that pours behind actual launch velocity, unequal torn ends, contact arrest and recovery. The replaced v11 gesture shrank the opaque head separately from its eyes and opened two sideways sheets before sweeping them down. This revision holds head and face together and turns those sheets into a single connected world-space mantle. It removes the obsolete sideways-sweep scalar.

- Air jump: moving compression in the first 18ms; decisive tear/release from 18–62ms; strong surge through 180ms, then return to the missing-mantle spent shape by 480ms.
- Directional wall release: actual kick velocity sets the head lean and tail direction; both left and right walls are covered. No input or collision waits on animation.
- Mantle: at most 109 world px, dense irregular shoulder for roughly 1.5–2 head lengths, three unequal open tears, shared porous atlas at the trailing ends. The silhouette can extend beyond the existing 224px nucleus cache without cropping.
- Falling: heavy nucleus below its upward remnant. Landing preserves incoming mantle direction and folds it into a contact-clipped fan over 180ms; the existing wake pool sheds a few larger angular flakes at rebound. Landing eyes retain identity through the squash.
- Rest, bell attention, spent/refill semantics, immediate buffered takeoff, wall hands and foot contacts stay under the existing character owner.

## Evidence

`candidate-*.png` and `candidate-report.json`: final-source native 390×844 sequence, including before/input/rise/air input/tear/surge/settle/spent/fall, first contact, +50ms/+100ms/rebound, rest and both wall kicks. `baseline-*` uses frozen v11 character source against the same current game/renderer. Fixture placement is explicit in the harness; every action and transition after placement uses actual production simulation inputs.

`diagonal-candidate-*`: final-source native diagonal sequence. `diagonal-desktop-candidate-*`: final-source 1280×900 desktop sequence. The diagonal route lands earlier than the vertical route, so its `10-fall` label is historical: the JSON correctly records grounded state. Use the vertical sequence for precise landing timing.

Most useful comparison: baseline/candidate `06-tear`, candidate `07-roll`, diagonal `06-tear`, candidate `16-kick` and `19-right-kick`, native `10-fall` through `12-rebound`.

`edge-report.json`: final-source scratch deterministic production-simulation probe, 11 checks all pass: late spent state, spent wall kick, buffered land-and-jump refill, refill ash on rebound, re-spend cancelling stale recovery flakes, death cleanup, respawn, bounded pools, first-frame reset jump, opposite wall direction alignment, and zero-delta freeze. Also checks no authoritative state mutation and no Canvas state leaks throughout.

`snapshot-equivalence.json`: all 22 paired native gameplay snapshots are exactly equal between frozen baseline and final candidate. Native and desktop capture reports record no page errors and frozen zero-delta render state.

`cost-report.json`: final-source 10 alternating baseline/candidate batches of 600 real fixed simulation steps, character update and draw. Median submission: baseline 0.0352ms/frame, candidate 0.0437ms/frame. Including a final synchronous 1px flush: baseline 0.0447ms/frame, candidate 0.0460ms/frame. This is a desktop headless Chrome CPU sanity check, not a phone, sustained GPU, full-game frame rate or optimization claim. The only readback is in this scratch cost probe; production has none. Normal, gentle and missing-atlas draws complete without mutating game state. Earlier gentle/fallback screenshots establish the same motion and fallback path before the final small dense-root/eye tuning; their source hashes differ intentionally.

## Performance guard

Disposition: SAFE_LOCAL_CHANGE. Same main frame owner, character owner, scene/output route, six bounded current chains, 44 wake slots, 38 burst slots, six contacts, 224×224 body canvas and shared ash atlas. No new global render pass, full-scene traversal, render target, canvas, shader, readback, worker, timer or emitter. The old pair of mantle atlas draws becomes a pair of atlas samples inside one clipped world-space mantle. On-air behavior now invokes that bounded mantle beyond the old double-jump-only window; resting work remains unchanged. Three cut triangles and a connected root replace the two former sheet contours. A worker would add ownership/message overhead for a single tiny existing Canvas contributor; no new off-main-thread boundary is justified.

This is a substantial visible silhouette/timing step toward the selected references, not a claimed quantitative 10× multiplier or a self-awarded top visual grade. Continuous diagonal motion is the strongest read; extreme vertical flight still intentionally resolves to fine charcoal at the final tail tip.
