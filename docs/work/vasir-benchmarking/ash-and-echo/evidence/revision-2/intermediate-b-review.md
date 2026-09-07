# Informed art recheck — frozen hero repair

**Developer visual estimate: upper B (informal B+), medium confidence.** This is a material improvement within the B band. The old narrow, dangling apex finding is repaired. The air double jump is now visibly differentiated from the ground launch. I would not repeat either criticism against this revision. The remaining art concern is the material of the appendages, which still often reads as broad fins or horns attached to an elastic ink body.

This is an informed recheck of my earlier [independent B assessment](</Users/erikhazzard/code/vasir/tmp/ash-and-echo/revision-art/independent-art-review.md>), not a fresh first-play review. Build: live `8317`, renderer SHA supplied by the root `be706ced18dd1b6b6205172ea9b8d1c5c9be0d794e4866874679ebbe32f663f7`. I did not read implementation source, an explanation of the repair, or another recheck verdict before forming this assessment. No product files were changed.

## What improved

The opening apex has a fuller, broader core and no longer carries the old long vertical tail beneath the face. Compare `../matched-native/8317-opening-apex.png` with `matched-native/8317-opening-apex.png` in this recheck. The new image communicates a floating, relaxed phase far more clearly. After viewing the images, the provided receipt confirmed both captures were near vertical rest; the new one has `vy: -49.48` at `0.7333 s`. Their positions differ, so this is a body-state comparison, not an identical-route claim.

The air jump has its own visible gesture. `matched-native/8317-opening-doubleJump-impulse.png` shows a horizontal compression; `opening-doubleJump-opening` and `opening-doubleJump-follow` show the widened body opening. Those shapes differ clearly from the narrow directional ground launch. The receipt places them approximately **42, 92, and 142 ms** after the air jump. This is a useful improvement in action vocabulary carried by the creature itself.

The wall-kick apex also returns toward a round core. `matched-native/8317-wall-apex.png` has much less of the old long, rigid dart silhouette. Direction remains readable, and the reduced extension makes the core easier to recognize.

The strong contact response survives the repair. The ground landing still visibly flattens the body, the brace remains compact at the wall, and my own `16-clear.png`–`17-retry-land.png` captures show a broad contact pose recovering toward a rounded resting creature. The native setting and floor-danger separation remain strong in the opening scene.

## What still keeps my visible-art estimate below A

The remaining issue is the **material half of the original finding**, not a new demand for more detail or scenery. In `matched-native/8317-opening-apex.png`, the relaxed body ends in broad, pointed shapes to either side. At native size this reads closer to a small black manta or ink sprite than a round mass of loose soot. The large upper curls in my `16-clear.png` are more flexible than straight launch spikes, but their broad bases still read like horns or ribbons attached to the body.

The supplied target's creature has a clear solid living core that breaks into ragged, yielding filaments. This revision's core is now persuasive, while the fringe still uses a coarser, harder material language. That mismatch remains conspicuous enough in the principal character that I would not yet call the observed art excellent or reference quality. This is not a claim that every appendage must be fine hair, or that the supplied target must be copied literally.

**Only necessary next art repair:** refine the existing fringe's shape at apex and during turn/settle. Narrow the broad fin-like bases and let the dominant appendages bend and taper before they split, with a shorter, irregular resting envelope. Retain the round core, readable face, distinct air-jump compression, and strong landing squash. A few readable curved strands with ragged edge accents would serve the material better than adding many fine hairs that disappear at phone scale. Preserve the pose range; no additional action states, particle escalation, or world-art pass is warranted by this review.

A native screenshot at relaxed apex should first read as a rounded soot creature, with its fringe supporting that mass rather than defining a winged silhouette. A native normal-speed turn should then show that fringe settling behind the body's new intent. These are the checks that could change my remaining judgment.

## Scope and proof record

- Live browser captures: Chrome, **390×844 CSS pixels, DPR1**, mobile/touch emulation. Own harness `informed-play.mjs`, with actual CDP touch input and keyboard actions. Video is preserved in `video/` but was not perceptually watched.
- Repeated my previous requested touch timing and subsequent keyboard jump/reversal pattern. Sequential screenshot overhead and a different starting position led to different trajectories. These are comparable input intents, not exact elapsed-time/path matches. Screenshot names remain capture-intent labels, not event proof; `05-apex.png`, for example, actually shows falling toward thorns.
- `matched-native/` contains 390×844 downsampled copies of the provided revision gameplay frames. No arranged pose sheet was used. Original B evidence is preserved outside `recheck/`.
- Inspected body images before the corresponding `8317-real-motion.json` event records. The revision's opening route lands on the floor, whereas the older B route landed on the first platform. I do not attribute that path difference to this art repair or infer a movement regression from it.
- My available perceptual tools expose still images. **No normal-speed animation or audio quality is claimed.** Real browser input and sampled frames cannot establish physical phone control feel or thumb ergonomics.

| Rubric item | Result for this recheck |
| --- | --- |
| Art direction and craft | **3/4**, observed native visual scope; improved aerial mass, remaining fin-like fringe material |
| Feedback and juice | **Formal unverified; visible body-expression estimate 3/4**, stronger action differentiation than prior B |
| Camera and danger | Full climb **unverified**; opening floor-thorn readability remains clear in sampled frames, with the earlier independent scoped comprehension pass preserved |
| Movement and full run flow | **Unverified**, no new score |
| Living-character gate | **Unverified at required normal speed**; sampled body range is materially improved and does not support repeating the old stiffness finding |
| Formal total / whole-game letter | **Unverified**; no partial-score renormalization |

The upper-B visual estimate is a concrete judgment of the current art, rather than a substitute for the missing full evaluation. The remaining fringe repair could plausibly move this visible slice into A; A/S whole-game claims still require the canonical continuous-play, danger, touch, audio, and independent-review evidence.
