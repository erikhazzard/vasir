# Controlled game-style auditions

Read when requested makeovers, a style gallery, or an unresolved art-direction choice needs comparable visual evidence. Reuse an accepted target when it already settles the choice. A bounded repair or requested colorway does not need a new style-selection process.

## Keep the comparison meaningful

People cannot isolate the effect of an art choice when the encounter, camera, action, or capture timing also changes. Hold the playable moment comparable and name what each candidate changes.

For runtime comparisons, keep the following fixed where they exist:

- gameplay rules, meaningful state, and the action being compared;
- seed/config, replayed inputs, encounter, and capture tick;
- camera pose/FOV, viewport, DPR, HUD content, and reduced-motion setting;
- asset visibility and quality tier, unless the comparison explicitly concerns a tier tradeoff.

For concept frames, use the same composition, focal scale, visible content, and decision. Label them as concepts: they cannot prove playable geometry, animation, controls, or performance. If camera or composition is itself the choice, vary it deliberately and report that difference instead of attributing everything to the material treatment.

## Distinguish the directions

For a full makeover, describe the coupled rules each candidate changes:

- silhouette, proportion, and the relationship between large and small forms;
- corner, taper, facet, or curve treatment;
- material, shading, or surface marks;
- semantic palette and value grouping;
- the relationship between focal objects and their world or play surface;
- detail frequency, signage, typography, and symbols;
- motion or VFX grammar when relevant.

For spatial styles such as toy-like, faceted, and cel-shaded treatments, shape/proportion and material response usually carry the distinction. A palette, sky, or fog change alone is a colorway; do not present it as a complete makeover. If the user requested colorways, keep form and material fixed. Flat, pixel, card, and abstract styles can differ through contour, sampling, typography, grouping, and state grammar without introducing 3D materials or characters.

Use the smallest set that exposes the real choice; two or three contrasting directions plus the current reference is a useful default, not a quota. More candidates are useful only when the requested comparison needs them.

## Inspect before committing to production

When the unresolved choice would change asset production, prefer fixed-scene paintovers or concept frames before implementing every candidate. Judge the relationships relevant to the game:

- **Surface and grouping separation:** traversable ground, structure, obstacles, and voids read distinctly in a spatial game; hand, board, legal target, and committed state do the corresponding job in a card game. Adjacent dark colors are insufficient if their boundaries disappear in play.
- **Reward and state integration:** pickups, highlights, or selection marks follow the surrounding edge, material, and lighting rules while retaining their semantic priority. Deliberate HUD contrast may be appropriate; an accidental pasted-on badge is not.
- **Focal identity:** the character, vehicle, piece, or other focus belongs to the treatment through proportion, contour, surface, and detail. A tint or primitive accessory rarely resolves an otherwise mismatched body. Intentional contrast must have a visible purpose.
- **Signature recognition:** important forms read at gameplay distance without relying on labels. For example, a transit vehicle's cab, windows, wheels, and travel direction should read as one vehicle; an abstract puzzle instead needs distinct piece and action states.
- **Palette hierarchy:** background, structure, danger, reward, selection, and rare accents have compatible contrast and screen-frequency roles. Inspect the full frame and, where useful, a grayscale thumbnail; pleasing swatches can conceal muddy grouping.
- **Family coherence:** the relevant actors, environment, objects, effects, and interface accents share a deliberate relationship in edge, proportion, surface, and color. A strong subsystem cannot compensate for unresolved relationships elsewhere in the claimed makeover.

Repair known readability or coherence failures before presenting a candidate as viable. Do not fill a requested count with options that fail the brief. Objective inspection can reject a candidate for a demonstrated defect; it cannot establish the human's favorite.

## Evidence for the choice

Choose only material that can change the decision:

- the same active-play moment at native size on the smallest target viewport;
- a supported wide/desktop composition when that layout could change the judgment;
- matching before/input/after states or a short identical motion segment when timing, shading, camera, or VFX is part of the claim;
- matching detail crops when an attachment, surface, or signature shape needs inspection, alongside the full frame;
- renderer measurements when implementation changes create a plausible cost difference.

Use stable candidate labels and directly reviewable images, clips, or product entrypoints. Do not require the reviewer to remember prior captures or manipulate query strings. In Idavoll, show the game inside the launcher-owned frame; do not reapply host safe-area insets inside the game.

## Selection and promotion

If the human is choosing, ask which treatment best expresses the intended world, makes the focal object belong, remains clear in motion, and offers reusable rules for future assets. Record their actual verdict; agent preference is only a proposal. Follow existing authorization and the main skill's visual-target step: this reference creates no additional approval gate and does not reopen an accepted direction.

Once a direction is selected within the authorized scope:

1. record the selected reference and the rules that made it work;
2. apply it to one meaningful playable sequence and use the existing active-play review;
3. make the accepted treatment the normal entrypoint when implementation is requested;
4. retain reusable geometry, material, or asset rules where the project benefits from them;
5. keep alternative candidates in the product only when a creator-facing style picker is an approved feature.

Do not preserve rejected runtime complexity in every game by default.
