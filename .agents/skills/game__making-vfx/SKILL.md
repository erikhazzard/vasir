---
name: game__making-vfx
description: Designs, builds, and repairs game VFX that communicate gameplay through readable shape, motion, color, and material behavior. Use when making spells, impacts, telegraphs, beams, trails, fire, smoke, weather, particles, or effect shaders, or correcting misleading coverage and visual overlap.
category: games
tags: [vfx, particles, shaders, telegraphs, readability, game-art]
---

# Making Game VFX

**Make the visible promise match the playable event.** Establish what the player needs to recognize and when they can act on it; then build a visual event with a clear origin, action, and consequence. Add spectacle and internal motion without losing that signal or exceeding the target runtime's budget.

This skill owns the visual manifestation and construction of individual game effects, including how they coexist. It applies to 2D and 3D games and environmental effects as well as combat. A sprite, mesh, ribbon, decal, authored animation, or simple graphic may serve the event better than a particle shader.

## Place in the system

- `$game__art-directing` owns the game's visual grammar, material language, and hierarchy. Apply that grammar to effects; do not establish a competing palette.
- `$game__adding-juice` owns the whole response phrase across acting, sound, camera, haptics, interruption, and the next action. Use it when a weak impact may involve more than its visual effect.
- `$art-direction__defining-game-art` supplies bounded style references when the requested art direction fits them. `$game-assets__generating-images` owns generating and promoting needed raster assets.
- For Three.js/Rapier material, shader, batching, or per-frame implementation, apply `$code__threejs-rapier-performance` in `local_change_guard` mode. Route observed performance failures through `$threejs__improve-performance`.
- The existing gameplay implementation owns damage, collision, targeting, status, and timing. An effect mismatch is not permission to change those mechanics. Bring a proposed gameplay redesign to that owner within the task's authorized scope.

Do not load this skill solely for menus, a whole-game style brief, damage arithmetic, or video transcription. For broad polish, use it when the diagnosis identifies an effect that needs construction or repair.

## Establish the event before the technique

Inspect the existing action, renderer, camera, and asset path. Recover the relevant facts from code and play; ask only for missing decisions that materially change the effect. For a concept-only request, state the unresolved assumptions and produce the bounded design.

Keep a compact working description, in the current task record or conversation rather than a mandatory new document:

| Question | Decision it protects |
|---|---|
| What happens, to whom, and with what consequence? | A damaging hazard, a beneficial field, and ambient mist must not accidentally share the same promise. |
| What must the player know before acting? | Establish origin, direction, footprint, activation, duration, ownership, and end state where relevant. Use actual mechanics as the source. |
| What visibly unfolds? | Describe the action in ordinary verbs before choosing textures: dust blows from the caster, becomes locusts, reaches the target, and disperses. |
| What familiar behavior supports that action? | Borrow expansion, fracture, combustion, flow, impact, or another recognizable pattern that fits the fiction and style. |
| Where will it be read? | Use the gameplay camera, smallest supported play scale, relevant backgrounds, concurrent effects, and supported hardware. |

Build the essential signal first. Then choose the smallest representation that can express the action. Work from the whole event to its material detail; a beautiful noise texture does not establish an effect concept.

## Protect the player's interpretation

**Coverage and timing are promises.** Compare the visible damage cue with the authoritative footprint using an existing debug overlay or a minimal local diagnostic. Inspect travel, activation, impact, and expiration. Decorative sparks may extend beyond a hit area when the actual boundary remains unambiguous; do not force every glowing pixel to become collision geometry.

For a delayed hazard, prioritize information while avoidance is still possible. An excellent explosion and scorch mark cannot substitute for its warning. Preserve the boundary and onset cue when simplifying the effect or lowering quality. If aftermath persists after danger ends, make that state transition readable.

**Power must agree with consequence.** A routine low-damage attack should not promise a screen-clearing result. Resolve the discrepancy in the effect by default. The Diablo Ballista example lost its spectacular visual because its implied power exceeded the early-game ability; the Frozen revision accepted more explicit graphics to explain future damage.

**Make motion and material support meaning.** When a damaging field feels harmless, inspect its activity, direction, contrast, and material behavior before adding particles. Fire, fracture, or violent motion can support danger; calm flow can support an invitation. These are contextual heuristics. A game can teach a different vocabulary, and literal fire is inappropriate for many effects.

Use tempo as a design variable. Comparing a rhythm with a heartbeat can help discuss invitation versus agitation, but it supplies no universal BPM threshold. Do not intensify screen flashes just to make danger legible; use shape, directional motion, boundaries, and the game's comfort options while retaining the signal.

**Maintain the game's vocabulary.** Compare a new effect with friendly effects, enemy hazards, and similar abilities. A new color or silhouette should either communicate a meaningful distinction or preserve the existing one. Abstract geometry is valid when its meaning is established; a collection of attractive rings and runes with no readable event is the failure.

## Choose construction from the visual job

| Cue | Prefer | Change course when |
|---|---|---|
| The event requires a precise silhouette or authored sequence | A suitable sprite, mesh, ribbon, decal, or flipbook with timing tied to the event | Sustained viewing exposes repetition or the representation cannot support the camera |
| Smoke, fire, poison, or magic needs evolving internal shapes | A small number of shaped particles with independently transformed texture samples | Texture sampling, pixel coverage, or per-particle updates cost more than the simpler alternative |
| A glowing effect loses saturation on bright terrain or becomes white under overlap | Evaluate blend-add or an equivalent authored compositing approach against the existing renderer | Standard alpha, additive, or another existing material already preserves the intended signal |
| Painted smoke lighting reveals repeated shapes | Keep the lighting orientation coherent and vary the alpha silhouette | Moving lights or camera changes expose the painted illusion; use a representation suited to those conditions |
| Distant crowds, discrete flicker, or a short authored burst need recognizable poses | Consider flipbooks or frame selection | Memory, visible cadence, or repetition dominates the intended use |

Read [Shader recipes](references/shader-recipes.md) before implementing layered texture motion, blend-add, or pseudo-volume smoke/fire. It supplies the source formulas, failure cues, and implementation boundaries. Treat these as candidates within the existing renderer, not a reason to install an engine or create a second effects framework.

**Spend complexity inside a particle when it earns its cost.** Different texture scales, scroll rates, and initial offsets can make a few billboards evolve richly. Keep the action's direction, hazard boundary, and phase stable while varying secondary detail. Multiple samples can reuse a source texture; fewer unique assets does not mean fewer texture fetches.

**Choose assets for the material and runtime.** Reuse suitable textures; create authored raster assets when the identity needs them. Simple masks and noise can be appropriate construction ingredients. Hand painting, simulation, and procedural inputs are choices based on the required behavior, not mandatory production methods. Independently scrolling textures need a tiling/addressing strategy; separate files and atlases each have costs.

## Integrate without changing the event

Bind the effect to the existing gameplay event and presentation clock. Keep cosmetic variation out of authoritative results and follow the project's replay/randomness contract. Reuse existing pooling, batching, pause, quality, and cleanup mechanisms where they exist. End or retarget stale presentation on cancellation, target loss, retry, or scene exit as the actual event requires.

Protect the semantic layer when reducing visual cost: keep warning footprints, attack direction, and state transitions; reduce redundant glow, internal detail, distant decoration, or lingering debris first. A lower quality setting must not hide information needed to play.

Profile the representation in its expected concurrency. Count covered pixels and transparent overlap as well as particles, draws, texture samples, uploads, CPU updates, and memory. A few large translucent quads can dominate a scene. A shader with cheap arithmetic can still be expensive through sampling, bandwidth, or overdraw. The talk's counts and mobile claims do not establish a current budget.

## Judge the effect in motion and context

Review the complete sequence at normal speed and gameplay scale before zooming in for diagnosis. Select the checks that could falsify the actual change:

- **Truth:** compare visible coverage and phase changes with the gameplay event, including a boundary interaction when damage or collision is involved.
- **Recognition:** can the player identify source, action, danger/benefit, and the next decision without relying on the artist's explanation?
- **Coexistence:** inspect relevant bright and dark backgrounds, the expected overlap of effects, and the most confusable neighboring ability. Check that actors and essential telegraphs remain visible.
- **Sustained behavior:** for lingering effects, inspect long enough to expose obvious repeats, scrolling seams, synchronized particles, and disappearing volume from relevant camera angles. A still image cannot establish this.
- **Runtime:** exercise relevant cancellation/repetition and measure the suspected cost on supported hardware or clearly state the narrower environment observed.

When the effect fails, identify whether the cause is its concept, timing, coverage, shape, material, compositing, or cost. Repair that cause. Increasing density cannot fix a warning that arrives after detonation, and desaturating the entire scene is a poor substitute for controlling the offending additive layer.

For an implementation request, deliver the effect integrated into the existing game and report the perceptual change, the situations checked, and remaining limits. For a brief, deliver the event description, visual behavior, chosen representation, constraints, and decisive checks. Do not claim active-play quality from screenshots or hardware performance from particle counts. Feed broad work into its existing task record; no separate VFX scorecard is required.

## Source and scope

The core judgment comes from Julian Love's GDC 2013 talk on Diablo III VFX. [Source notes](references/source-notes.md) preserve the timestamped examples and qualifications; read them when a source claim, reference, or tradeoff needs checking. Integration and verification guidance here adapts those lessons to current project contracts. The recipes are not Diablo III source code or universal renderer settings.
