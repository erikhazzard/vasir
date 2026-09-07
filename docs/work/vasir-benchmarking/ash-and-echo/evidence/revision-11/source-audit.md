# Revision 11 rendering source audit

**Verdict: SHIP WITH NOTES for the inspected source boundary. No required production repair.** Native appearance, GPU timing and fallback/lifecycle execution remain with the root's final runs; this is not a runtime or visual-quality certification.

**Context.** Release Audit; FOCUSED CODE. Compared the candidate in `site/ash-and-echo/` with `tmp/ash-and-echo/volume-pass/baseline/`, inspecting atmosphere, depth, lighting, cast-shadows, fog-volume, character, ash-flow, renderer and main, plus the atlas, CONTRACT.md and assets README. The supported boundary is the existing static browser game with its current course and one-time asset loading. No browser was opened and no production file was edited.

**Release findings:** none.

**Source findings and qualified checks:**

- **FACT:** Steady skylight supplies the three filtered fog-lighting samples (`fog-volume.js:7–29`). Existing density/wind coordinates are preserved; shadow strength changes color after density calculation, and alpha uses unoccluded light (`atmosphere.js:62–117`). There are six source-level noise samples per air fragment, across the existing three air submissions. No new render pass, framebuffer, texture or sampler was added to this compositor. That topology does not by itself prove acceptable GPU time.
- **FACT:** Four reusable caster slots derive slab positions from live platform coordinates and bell centers from the same suspension offsets and reduced/full rotation used by drawing (`cast-shadows.js:26–55`; `renderer.js:532–547`). Receiver centers and exposure are computed once per render. A temporary numerical sweep of 6,102 combinations of camera, logical height, spring extremes, bell angle and reduced mode produced finite values, at most four casters, and unchanged typed-array identities. These were arranged source-math checks, not executed gameplay.
- **FACT:** The horizontal checkpoint light reaches `(210,2482)` with exposure approximately `0.736`. In the Canvas fallback, local `(across,down)` becomes `(direction*down, across+slope*down)` (`depth.js:179–183`), matching the horizontal `lightFrom` convention. A coordinate-grid check found no illuminated points outside the current authored light bounds. Four fixture slots are ranked by visible extent/proximity, with bounded side-light preference; tall views do not overflow the uniforms.
- **FACT:** Initialization/context restoration remains the existing owner of the shader, quad and cloud texture; failed/lost initialization selects the painted fallback. Character flow adds an optional decoded image and Canvas draws through the existing presentation clock. Reduced mode fixes atlas time, pause supplies zero delta, and restart resets character state before new events. A temporary 1,602-draw atlas-index check, including negative time and body crops, found no source rectangle outside the image.
- **FACT:** Current counts agree: eleven downloaded image keys, eleven apertures, six compositor image textures plus cloud noise, one program/quad, and no offscreen GPU target. The atlas is 384×256, 24 tiles, 230,925 file bytes and 393,216 nominal decoded RGBA bytes. The assets README's smaller revision-7 counts are explicitly historical. Resource statements concern application-owned WebGL resources; they do not measure browser-internal Canvas texture residency.

**Non-blocking findings:** none outstanding. The initially stale CONTRACT.md claim that both adjacent fibres disappear after spending was reported to root and corrected during this audit: the rear shoulder disappears while the crown current remains. The current text matches `character.js:931–934`.

**Needs validation.** Root's planned native/fallback/performance runs should establish source-matched shader success, sustained frame pacing, missing-atlas play, lost/restored WebGL behavior and the full-climb visual read. This source audit supplies none of those measurements.

**Rejected escalation.** The finite analytic slab/bell bounds and selected receiving planes are the documented 2.5D approximation. No inspected evidence warrants a mesh-accurate shadow system or a new rendering topology.

**Plan of action.** Complete and package the already-planned runtime checks against the inspected identities. No additional production implementation or speculative test expansion is requested.

Inspected SHA-256 prefixes: atmosphere `c46a9681447c1f72`; depth `4fca92db19db1ca89`; lighting `9f6b6f46a18562bf`; cast-shadows `26a7c62a18fa7d93`; fog-volume `7a44948f3b9aad26`; character `0ad59b75a34463ff`; ash-flow `bc033879258846cf`; renderer `068c18e1e73f61f0`; main `e8b43a6cbe1e97f7`; atlas `e4529aa77d971d75`.
