This source and 390 CSS-pixel capture sequence supersede the initial character pass's source and refuge/listen evidence. `implemented.js` matches production `character.js`; both `mobile-report.json` and `reduced-report.json` record its SHA-256.

The escaped defect was a normal resonant landing after the movement input was released. Actual game contact still emitted vx=100, and the first residual-braking frame permanently cancelled the pending bell response. `../listen-brake-before.json` reproduces this using the prior source; `../listen-brake-after.json` uses the final source with identical actual game steps and fixture geometry. Before: no gaze at417 ms. After: gaze x−6.07 at417 ms; crown bend−2.58 at750 ms. The other three scenarios verify sustained steering cancels, the first post-gaze movement cancels, and an immediate jump cancels.

The fix gives only the pending response's initial landing brake 120 ms to settle. It never draws attention while moving. Leaving ground, death, or movement after that short initial window cancels immediately. The 350 ms bell onset and 470 ms upper-body response remain unchanged.

Refuge rest now has one finite release: after stillness begins, the body and crown settle with a soft eye-close/exhale; the face then reopens halfway. The angular focused-movement eyelids are suppressed during rest. At the exhale frame normal-motion eye openness is.338; at settled rest it is.640. Reduced motion keeps the gesture quieter (.665 then.838). Both eyes remain visible. Movement instantly clears the rest state and the existing pose spring returns to the movement target.

Inspect the full native390 sequences (matching reduced-motion frames have the `reduced-` prefix):

- `mobile-09-bell-contact.png`: actual contact event vx100, residual current vx75, no gaze.
- `mobile-10-bell-before-ring.png`: stopped at325 ms, no gaze.
- `mobile-11-bell-eyes.png`: eyes at425 ms.
- `mobile-12-bell-crown.png`: crown at758 ms.
- `mobile-13-bell-move-interrupt.png`: first movement step cancels gaze.
- `mobile-14a-refuge-release.png`: alert face as release starts.
- `mobile-14b-refuge-exhale.png`: one soft eye-close and lowered crown.
- `mobile-15-refuge-rest.png`: relaxed half-open face.
- `mobile-16-refuge-move-interrupt.png`: first movement step clears rest.

The complete original charge/spent/refill sequence was also captured at390 px from the final source in this folder. Its delayed double-jump frame remains at675 ms with airJumps=0 and missing=1. `../edge-report.json` was rerun after the fix and all ten checks pass, including wall kick, immediate buffered rebound, repeat spend, death, respawn, reset, bounded pools, frozen pause, canvas state restoration and no game mutation. Node syntax check passed.

This local change adds no arrays, pools, timers, frame loops, renderer, canvas, targets, readbacks or output owner. The initial rendering topology disposition remains SAFE_LOCAL_CHANGE. No performance or hardware-phone timing claim is made. Capture browsers are closed. The fixture placements skip travel; all landing and movement events come from the actual simulation.
