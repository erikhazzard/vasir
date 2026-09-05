# Portrait wall-climber creative brief

**Purpose:** Translate the selected Ash & Echo direction into a small game whose elastic movement and layered monochrome world support the same experience.

**Status:** September 5, 2026. The user selected direction A and supplied the [visual target](portrait-wall-climber/visual-target.png). The proposed prompt and production interpretation below are ready for the first playable study. No game or motion has been accepted or benchmarked. The [work spec](../work-spec.md) owns accepted scope and progress; the [judge](portrait-wall-climber-judge.md) owns scoring.

## Shared prompt

> Build a portrait 2D wall-climbing platformer for phones using the supplied image as the art-direction target: a tiny elastic soot creature with bright eyes ascending immense Gothic ruins in layered monochrome, with drifting fog, parallax depth, and ambient creatures. Make movement exceptionally responsive and juicy: variable-height jumps, a double jump, wall slides and kicks, coyote time, and jump buffering. Give each action expressive animation and sound while keeping the player and next landing clear. Create one satisfying 30–45-second climb with comfortable touch controls, a checkpoint, and instant retries. Make it hypnotic to watch and rewarding to master.

## Visual target and what it establishes

- **File:** [visual-target.png](portrait-wall-climber/visual-target.png).
- **Source:** User-uploaded image, described by the user as generated in ChatGPT, selected after choosing direction A. The generating model and source prompt were not supplied.
- **SHA-256:** `6f732083a68f3b551c9b0530b3e63b22f452b6d60e5117aff721f08ed9de0b23`.
- **Accepted visual direction:** Layered monochrome with strong changes in abstraction and detail across depth: crisp dark contact surfaces and character, textured nearby ruins, softer distant architecture, and luminous fog. Monumental scale surrounds a small, lively creature.
- **Reference limits:** The picture does not establish reachable jump distances, camera behavior, collision geometry, input response, or actual animated assets. Its long ink trail illustrates energy rather than defining a dash mechanic.

## Production interpretation for the calibration build

Use the reference's depth hierarchy to direct separately rendered layers:

| Layer | Visual job | Motion opportunity |
| --- | --- | --- |
| Pale atmosphere and distant spires | Establish height, light, and monumental scale with broad soft shapes. | Slowest parallax and gentle fog drift. |
| Mid-distance arches and ruined towers | Add spatial relationships and selective texture without competing with the path. | Intermediate parallax and sparse ambient birds. |
| Traversable walls and ledges | Make contact boundaries and reachable destinations unmistakable. | Stable collision shapes; small presentation responses at impact. |
| Player and action effects | Carry the focal silhouette and the identity of each move. | Elastic body poses, directional soot trails, wall-contact dust, and a distinct double-jump response. |
| Near framing and ambient life | Add scale and depth at the screen edges. | Restrained foreground parallax, hanging detail, and peripheral creature motion. |

The image's spider, cages, and chains are atmosphere references for this first study. They do not introduce combat, pursuit, swinging hazards, or puzzle systems. Keep atmospheric motion clear of the traversal path and distinct from gameplay hazards.

Art and movement must remain readable at wall contact, where a black creature can merge into a black wall. Solve value separation in context. Keep the actual player body legible through its trail, and let effects dissipate quickly enough to reveal the next decision. Character deformation and particle extent do not change collision geometry.

Generate or author the necessary separable assets from the target. A complete concept image with a moving character overlaid does not establish the required world depth, contact integration, or art execution.

## Next proposed playable study

Build a short portrait section with two walls and three ledges. It should support a repeatable 10–15-second sequence: launch, wall slide, wall kick, air correction, double jump, landing, and immediate relaunch, plus a quick fall/retry.

Integrate the selected art direction into that sequence: a readable animated soot creature, a few distinct depth layers, restrained fog, and responsive contact effects and sound. This is the first part of the eventual climb; expand it into the full checkpoint-to-summit course after the movement and art work together.

The useful review is active phone play and its captured action sequence. The target image establishes direction; the playable study must establish how that direction survives jumping, camera movement, repeated actions, and failure. This step precedes judge calibration and comparative contestant runs.

## Shared benchmark inputs

Use the same frozen prompt, reference image, starter course, available tools including image generation, and execution budget for baseline and full-Vasir conditions. Preserve the exact treatment snapshot before any comparison. If additional art instructions or assets become benchmark inputs, give them to both conditions.

The full-Vasir calibration build can use the complete skill set to explore implementation. It is development material, not a clean experimental contestant: this conversation contains extra design and review context. Comparative builds must use fresh isolated runs with only their declared shared inputs and condition-specific treatment. An image-directed task measures execution within that supplied direction; broader art-concept invention remains a separate claim.
