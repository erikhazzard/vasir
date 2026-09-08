# Elastic 2D Character Movement

Read for a 2D character whose art direction calls for elastic motion. These are implementation examples, not universal movement rules. Keep the existing controller: do not replace grid motion, vehicle steering, rigid armor or an authored 3D rig with squash and sinusoidal bob. General acting, causal response and material judgment live in the parent skill and `response-and-material.md`.

## Drive the pose from intent and state

Use the existing simulation velocity, contact and accepted-action events. Facing can respond to a committed reversal before momentum crosses zero; a crown, garment or soft rear mass can follow later. Keep a last committed direction and a speed deadzone so tiny friction crossings do not spam reversal poses. Waiting, braking and losing footing should not all reuse a generic idle wobble.

For a soft creature, an example punctuation might recover from a modest takeoff compression over roughly 100–180 ms and settle secondary mass over 200–300 ms. Tune the actual silhouette at game scale. Put compression into the load-bearing mass while keeping identity features readable; flattening both eyes to a slit can make a strong landing harder to track.

Use an exponential response for continuous following, with seconds throughout:

```js
function follow(current, target, ratePerSecond, dtSeconds) {
  return current + (target - current) * (1 - Math.exp(-ratePerSecond * dtSeconds));
}

// Illustrative rates: intent leads, soft secondary mass follows.
gaze = follow(gaze, committedIntent, 30, dtSeconds);
crown = follow(crown, gaze, 8, dtSeconds);
```

This is a following filter, not a physical spring. Reuse an existing spring when overshoot and velocity continuity are part of the style. Advance it in the game's existing time domain, with its existing integration policy.

## Locomotion rhythm without vibration

If footfall/bob belongs to the body, drive phase from travel or a bounded gait cycle, gate amplitude by movement state, and settle the offset when stopping. A slipper, hovering ghost and running creature need different rhythms.

- Frequency in Hz means cycles per second: `phase += 2 * Math.PI * hz * dtSeconds`.
- A value of 10–14 radians/second is about 1.6–2.2 Hz, not 10–14 Hz.
- Prefer contact-distance gait where feet must stay planted; a free-running sine can visibly skate.
- Velocity lean needs a deadzone and bounded angle; acceleration/braking may require a separate opposing pose. Do not let an incidental sign flip rotate the whole body.

Keep rendering transforms explicit. A typical 2D order is translation → rotation → facing reflection → local deformation → draw. Mirror/rotation order changes the lean direction; check both sides rather than trusting the right-facing example. Preserve the canonical collision body unless changing it is part of the authorized mechanic.

## Trails are matter, not a rigid appendage

First choose the meaning: ordinary material shedding, absolute speed, a speed bonus, or an ability state. A bonus trail should not remain fully active at baseline speed; ordinary soot shedding should not disappear solely because the player has no speed buff.

For detached matter, sample a real emission location and inherit a useful fraction of the source velocity once. Then let each piece age independently in the appropriate space, with unequal lifetimes, bounded drift/drag and material-specific breakup. Do not reattach old particles to the current character transform. A short coherent tear can lead into fragments; a long tail that keeps the same shape at every speed often reads as a body appendage.

Use existing pools and seed cosmetic variation according to the game's replay contract. With exponential drag, `velocity *= Math.exp(-dragPerSecond * dtSeconds)`; a raw `*= 0.96` per render frame changes behavior with frame rate. Opacity fading alone can leave rigid paper shapes: change scale, porosity or breakup when that is how the material should disperse.

## Contact and interruption

Anchor early deformation/residue to the live support; released matter inherits support motion only at release. A rising support can overtake slow released particles, so inspect immediate rebound and contact occlusion. On a new accepted launch, clear incompatible grounded squash but preserve an appropriate short pressure strike and detached world aftermath. Include arrival with residual horizontal speed; an expression tested only from rest can cancel before it is ever seen.

Check ordinary movement, both reversals, contact, immediate relaunch and the game's comfort mode in context. A body-only view can diagnose silhouette and mask defects, but the final full rendering owns legibility.
