# Opening course proof — authored pass v8

These are deterministic simulation receipts using ordinary input frames, not human play or visual-quality receipts. The efficient intended phrase takes **5.417s**. The proposed 8–12s first-read estimate has not been measured and is not enforced by the game.

## Geometry

| ID / landmark | x | y | width | structure |
| --- | ---: | ---: | ---: | --- |
| first-hop |150|4426|92|solid 54px plinth down to floor 4480|
| second-hop |258|4368|102|right corbel|
| wall-transfer |88|4204|96|left corbel|
| crossing-recovery |250|4144|110|right corbel, optional recovery route|
| resonant-stone |266|3976|90|authoritative suspension|
| opening-refuge |138|3874|150|fixed arch, kind refuge, no checkpoint|

The wall catch uses the existing right wall at x360. Existing cinder-rib collision is unchanged. The later route rejoins at ledge-5 (left y3788), and the original checkpoint remains at ledge-14/y2448.

## Intended route inputs and events

JSON provides every 120Hz input frame (`axis`, `jumpPressed`, `jumpHeld`), event timestamps, and run-length encoded `segments`. Each press has a physical release before it. No position/resource/time is assigned during playback.

| Action | Press time | Hold / steering | Landing time |
| --- | ---: | --- | ---: |
| First low hop |0.350s|right; release jump after~0.117s; steer/brake toward center196|0.800s|
| Second low hop |1.150s|right; release after~0.117s; aim center309|1.592s|
| Wall approach |1.942s|right + held jump until reaching wall and starting to descend|—|
| Wall kick |2.367s|release then press at wall; steer left toward center136 and hold|3.117s|
| Broad crossing |3.467s|right + held jump|—|
| Delayed air jump |3.825s|release then re-press at~0.358s after launch; aim center311|4.433s|
| Refuge jump |4.783s|left + held jump; aim center213|5.417s|

Times in this table are input-frame start times; event timestamps in JSON are the completed simulation step, 8.333ms later. The controller allows 0.35s voluntary landing breaths. No game rule mandates them. After a target landing, release jump and brake before the next press. Braking distance used by the solver is vx²/(2×1900), clamped to at least 3px.

## Meaningful alternatives and limits

- `.11s` hold low hops rise 104.902px; holding through the arc rises 157.119px. Both land safely. Full held-hop phrase 5.925s.
- Wall kick saves the air jump throughout the transfer, providing an available correction. It is optional: direct delayed air jump from second-hop also reaches wall-transfer, in 5.292s for the full phrase. The wall route is not faster.
- Crossing air jump at~0.092s reaches insufficient height: lands recovery at 4.267s. An ordinary jump + air jump then reaches stone at 5.667s and refuge at 6.650s. No death or new penalty state.
- Recovery shelf is against the right wall because a middle shelf intercepted the preceding wall transfer. It is intentionally optional; the main route excludes it.
- Main route reaches all 29 authored main-route landings and the summit in 33.20s (wall) or 33.07s (direct). It never requires the optional shelf. These are solver runs, not first-time-player completion times.
- Later course rhythm is preserved. This pass does not claim the entire climb now has the opening's authored variety.

## Event contract

All old event types and controller/resource semantics remain. Opening platforms have named `id`, `landmark`, `structure` and `route`. First-hop additionally carries an explicit solid collision flag and support metadata; refuge is separate from checkpoint.

- Jump from a supported named opening platform includes its `landmark`.
- Land retains `platformId` and `suspended`; it includes `landmark` when defined, real `contactX/contactY`, and normalized clamped `contactOffset` [-1, 1].
- Resonant-stone carries `resonance:{x:311,y:4002,size:42}`, copied into its land event. Contact fields describe the actual displaced surface. The pivot is the authored home position; presentation applies its parent stone's displacement.
- No new events, power, delayed controller action, activation trigger, or checkpoint state.

## Reproduction

`node --test test/ash-and-echo.test.js` — 18 tests pass, covering intended and alternative routes, early-jump recovery, hold-height contrast, full summit joins, existing forgiveness rules, checkpoint/restart, and suspension determinism/contact.

`node tmp/ash-and-echo/authored-pass-v8/course/simulate.mjs` writes opening-route.json. Options `--early-double`, `--direct-transfer`, or `--hold-hops` write their corresponding JSON. Browser playback should use the input frames or adaptive targets; rendering and human feel remain to be reviewed separately.
