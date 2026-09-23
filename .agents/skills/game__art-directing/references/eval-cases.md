# Evaluation cases

Use these prompts when changing the skill's trigger, ownership, or style-comparison guidance. They are maintenance examples, not a required runtime checklist or a record of completed behavioral tests.

## Positive routes

1. “This runner has generated buildings and a realistic avatar that do not feel cohesive. Give it a real art direction.”
   - Route here.
   - Expected decision: diagnose incompatible proportions, construction, edges, material, and lighting; define a coupled visual recipe before adding detail. Use the project's existing asset/rendering pipeline when implementation is requested.

2. “Show me toy-like, faceted, and cel-shaded makeovers of the same level.”
   - Route here and use the controlled-audition reference.
   - Expected decision: compare the same scene, camera, and action; change form and material where those distinguish the requested styles.

3. “Define the visual language, palette roles, motion grammar, and environment pacing for a mobile runner.”
   - Route here.
   - Expected artifact: a usable visual recipe. Concepts establish direction; an active-play sequence supports claims about the implemented result.

4. “Compare two visual directions for this abstract placement puzzle.”
   - Route here.
   - Expected decision: preserve the same board, move, and legality cues; compare contour, grouping, palette, and state grammar without inventing an avatar, physical scenery, or 3D material requirements.

## Neighbor routes and scope boundaries

5. “Generate a transparent enemy sprite and wire it into the game using our approved style.”
   - Route to `$game-assets__generating-images`; use art direction only if the visual rules are unresolved.

6. “Turn these approved art rules into batched Three.js buildings and vehicles.”
   - Implement through the repo's existing rendering path with `$code__threejs-rapier-performance` for relevant rendering constraints. The art recipe is input, not a choice to reopen.

7. “This Three.js scene drops to 25 FPS after two minutes.”
   - Route to `$threejs__improve-performance`; do not prescribe an aesthetic change without diagnosis.

8. “Add this GLB as the player's new base body.”
   - Follow the repo's avatar/import instructions. Replacing a body is not automatically a visual-system redesign, and this catalog must not invent an unavailable onboarding skill.

9. “Keep the art style and show me three palette variants.”
   - A bounded palette comparison may use this skill. Keep form and material fixed; colorways are the requested outcome, not defective full makeovers.

## Failure probes

10. A response presents three palette/sky variants as complete toy-like, faceted, and cel-shaded makeovers.
    - Fail: the changes do not establish the requested shape and material distinctions.

11. A response prescribes universal draw-call, atlas, or triangle limits without project evidence.
    - Fail: false precision outside art-direction ownership.

12. A response uses a menu screenshot or generated concept to claim that an action game's implemented visuals work in play.
    - Fail: the evidence does not show the claimed active-play result.

13. A response restarts style selection after the user already accepted a direction.
    - Fail: the audition creates an unnecessary decision. Apply the accepted direction and inspect the relevant result.

14. A response rejects a still puzzle board because it lacks motion, vehicles, or a character.
    - Fail: a genre example became an unrelated requirement. Judge the actual decision surface and intended tone.
