# Ash & Echo revision 16 — independent bounded visual challenge

Reviewed the saved revision-16 round-2 gameplay images against matching baseline-v15 scenes without reading other reviewers' judgments or production code. No browser opened and no production files edited.

**Scoped result: the sampled climb is visibly more authored and deeper, with no glaring shader regression or major visual blocker apparent in this evidence.** This is a visual-evidence pass, not an overall SLAPS or release verdict: runtime sanity, physical-phone viewing, actual input feel, and the whole continuous climb remain outside this review.

## Highest-impact observations

1. **Depth and material pass.** `round-2/native-middle-before.png` and `round-2/desktop-middle-before.png`, compared with the corresponding baseline scene, retain the tall pillars' rough faces and separate the distant central spire from the foreground landing surfaces. Baseline fog forms conspicuous pale horizontal strata across the architecture; revision 16 gives the eye larger clear passages and localized illuminated banks. `round-2/native-opening-air.png` and `round-2/native-checkpoint-air.png` preserve the dark Gothic cross-architecture while keeping the raven, platform lips, and red thorn strips distinguishable. This is a useful hierarchy change, not merely additional effects.

2. **Active ash and raven pass.** `round-2/native-upper-air.png` and `round-2/native-checkpoint-air.png` replace the baseline's visibly repeated ring-like trail with dispersed pale flakes and darker flecks. Native-sequence frames `103 → 105 → 107 → 109 → 113 → 119` show takeoff, opened wings, airborne travel, descent, and landing with the player consistently findable. Frame 109 puts the raven against a darker diagonal structure; its light eyes and wing silhouette still resolve. The trail describes travel without becoming the highest-contrast object or masking the next ledge.

3. **Quiet-state and alternate-mode pass, with a narrow limit.** Native-sequence frames `043` and `057` show a changing mist bank while preserving the resting player, chains, ledges, and masonry. The world is not visually frozen when input stops, and the sampled bank change does not read as a sudden white wash. `round-2/gentle-upper-air.png` retains the same raven/ledge/thorn grammar and detailed architecture. The raven's dark tail has less separation against that mode's dark roof than against the normal upper scene's pale background, but the full player remains identifiable; this is a minor contrast watchpoint, not a demonstrated blocker. A 10 fps sample cannot establish smooth full-rate fog motion or pacing over minutes.

## Active-play read

- I am: the small bright-eyed ash creature that opens into a raven while airborne.
- I should: climb via the protruding and suspended ledges, steering clear of red thorns, toward the illuminated Gothic refuges.
- I should care because: the vertical destination is visibly inviting and the checkpoint message states that the ascent is remembered.
- When I act, the game visually answers by: changing the body's pose into flight and leaving a sparse ash/feather trail.
- What changed: frames 103–119 move the creature from the suspended central ledge through an airborne arc to the right-hand ledge; the height indicator records increased attained height.
- Biggest visual confusion: dark player extremities can share values with dark background roof geometry in the gentle frame. The eyes and overall silhouette compensate in the inspected material.
- Would I keep playing from this moment?: yes, on this visual evidence.

Style: painted/textured monochrome Gothic architecture with selective red hazard accents. Core-loop profile: exploration/physics; terrain affordance and player position take priority over atmospheric richness.

Material includes native portrait and desktop gameplay, matching baseline scenes, ambient samples, and a sampled takeoff-to-landing sequence. Controls and HUD remain visible without covering the inspected immediate aerial decision space. Accessibility under different displays, runtime sustainability, continuous first-act comprehension, and input response are not established here. No repair is warranted solely from the reviewed shader evidence; the remaining runtime and real-play checks belong to the root's separate validation.
