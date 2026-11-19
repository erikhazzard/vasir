# Interface

Make web UI feel expensive, fast, obvious, tactile, accessible, and impossible to misuse.

This is not a generic UI helper. Apply strong taste. Make the call. Do not flatten decisions into safe corporate mush. Do not cite sources, name outside influences, score the UI, or write compliance theater unless the user explicitly asks. Ship the better interface.

The "Never ship these" list in this package's entry file holds here and is not repeated.

## Stance

- Max polish by default. Preserve function, then make it beautiful.
- Prefer decisive implementation over commentary. Code beats explanation.
- Fix root causes, not symptoms. If the component API causes bad UI, redesign the API.
- Respect the existing codebase only when it is coherent. Do not preserve bad patterns out of politeness.
- Never trade accessibility, task completion, or speed for decoration.

## Quality ladder

Lower rungs never break higher rungs.

1. **Task completion:** the user can do the thing without confusion.
2. **Semantics and access:** native elements, labels, keyboard, focus, names, states, errors.
3. **Stability:** no layout shift, no accidental scroll jumps, no hydration/theme flash, no surprise keyboard popups.
4. **Speed:** fast interaction feedback, no blocking flourish, no expensive animation, no needless re-render storms.
5. **Clarity:** one obvious primary action, user-language copy, visible state, recoverable errors.
6. **System coherence:** tokens, variants, spacing/radius/color rhythm, consistent component contracts.
7. **Taste:** optical alignment, typography, motion choreography, shadow/border subtlety, empty-state craft.
8. **Delight:** rare, earned, interruptible, and never in the way.

## How to answer

- **Implementation:** return the improved code first, then only the notes needed to understand integration, assumptions, or sharp tradeoffs.
- **Review:** do not write a generic checklist. Give the few changes that most improve the interface, each as `[Blocker | High | Polish] Problem → exact fix → why it matters`. Use "Blocker" only for broken task flow, inaccessible core behavior, data loss, severe layout shift, or unusable mobile behavior.
- **Polish pass:** say exactly what to change: spacing, type scale, radius, shadow, color token, transition timing, copy, hierarchy, state treatment. Avoid "make it cleaner."
- **Performance pass:** name the visible symptom, the likely cause, and the smallest fix. Do not recommend memoization, virtualization, `will-change`, or direct DOM animation unless the shape of the problem calls for it.

## What else to read

This file is what every interface needs. Read one more only when the work has what it covers:

- **A web app or product screen** with forms, dialogs, menus, components or touch: [app.md](app.md).
- **A marketing page, docs or long-form writing**: [pages.md](pages.md).
- **A game interface**, a menu, a HUD or an inventory: [game-ui.md](../game-ui.md).

## States

Build these deliberately, not as afterthoughts. If two states look the same, users cannot tell what is happening.

- **disabled:** non-interactive, still understandable, no tooltip-only explanation. It gets dedicated muted tokens, not blanket opacity, and says why when the reason is not obvious.
- **loading:** prevents duplicate action, preserves button width, communicates progress.
- **error:** visible message near its source, tied to the field when there is one.
- **empty:** explains why and gives the next action.
- **selected/current:** visually distinct without layout shift.
- **focus-visible:** obvious, offset, not swallowed by overflow.
- **active:** tactile press feedback without moving layout, such as `transform: scale(0.97)`.

## Type

- Use `text-wrap: balance` on short headings, CTAs, cards, and hero copy. Override manually when balance creates a weird first or last line.
- Use optical sizing/kerning when the font supports it. Large display text needs tighter tracking; small uppercase labels need looser tracking.
- Do not change font weight on hover, active, or selected states. Use color, underline, background, border, or a pseudo-element.
- Use `font-variant-numeric: tabular-nums` for counters, prices, timers, rankings, dashboards, and anything that changes.
- Use proper characters: `…`, curly quotes/apostrophes in prose, real arrows where appropriate, not three periods and typewriter punctuation.
- Avoid tiny light text. Light weights are elegant at display sizes and fragile at UI sizes.
- Use a fallback font stack chosen for similar x-height and metrics. Subset fonts: load only the weights, styles, axes, and character ranges actually used.
- Paragraph spacing follows the text rhythm, usually around one line-height, not arbitrary scraps of margin.
- UI emphasis is usually bold, color, or structure. Italics are rarely the right hierarchy mechanism in product UI. Underlines mean links.

## Color and tokens

- Use semantic tokens: `--color-bg`, `--color-surface`, `--color-border-subtle`, `--color-text-muted`, `--color-danger`, not loose hex soup. One-off raw colors belong in token definitions only. If a color appears twice, it wants a name.
- Use perceptual color spaces for serious color work. HSL lightness lies; yellows, blues, and reds do not feel equally bright at the same numeric lightness.
- Build dark mode by flipping semantic variables, not by scattering manual dark overrides across components.
- Desaturate intense brand colors in dark mode. Full-chroma accents vibrate on dark surfaces.
- Preserve layering in dark mode. The "brightest" dark surface is usually the raised/interactive one, not the page canvas.
- Derive hover/active/selected from a base token, never a second hardcoded hex: `background: color-mix(in oklch, var(--color-accent) 88%, black)`. Hex-to-hex shifts hue.

## Surfaces

- Use alpha or shadow borders for subtle edges on light surfaces. Hard 1px borders often look pasted on. Prefer `box-shadow: 0 0 0 1px ...` for soft hairline outlines when it blends better than `border`.
- In dark mode, avoid glowing white alpha borders. Prefer quiet solid dark tokens unless glow is intentional.
- Use 0.5px hairlines on high-density displays for dividers and fine UI details when the design benefits from it.

## Layout and stacking

- Put spacing on parents with `gap`. Avoid child `margin-bottom` stacks that leave trailing ghosts.
- Breakpoints belong where content breaks, not where devices used to be named.
- Simple marketing pages rarely need 12 columns. Use fewer columns unless complexity earns them.
- Favor slight asymmetry for marketing and editorial layouts. Perfect symmetry often feels static and template-like.
- Set `scroll-margin-top` on anchor targets when sticky headers exist.
- Use `line-clamp` and min-width discipline inside grids. Text overflow is not a surprise; design it.
- Do not overlay text on busy images unless you own the image, scrim, contrast, crop, and responsive behavior. Beside or below usually wins.
- Use a tiny named z-index scale: dropdown, sticky, modal, popover, tooltip, toast. Prefer local stacking contexts with `isolation: isolate` or positioned wrappers over escalating integers. If a z-index needs four digits, the layering model is probably broken.

## Icons and illustration

- Redraw or swap icons at extreme sizes. A 24px outline icon scaled to 12px disappears; scaled to 48px looks childish. Use filled versions for tiny states when strokes vanish.
- Snap icons to pixels deliberately. Half-pixel placement blurs on 1x screens.
- Nudge optical centers. Play triangles inside circles usually need a slight right shift.
- Do not use ambiguous icons alone. "Save," "favorite," "rating," "upload," "download," and "warning" need labels or stronger shape language.
- Keep 6–8px between icon and label in normal buttons.
- Illustrations must match the product's palette, stroke weight, perspective, shadow direction, and radius language. No illustration is better than stock-feeling illustration.
- Decorative layers have `pointer-events: none`, no accidental text selection, and are hidden from assistive tech. Informative code-built illustrations use `role="img"` with a useful label.

## Motion

Motion is a tool for causality, continuity, feedback, and delight. Decoration that slows the task is not polish.

- User-initiated enter/exit: fast ease-out. Existing element moves or morphs: ease-in-out. Hover or color state: short ease. Gesture, drag, interruption: spring.
- Durations are the ranges in the entry file. Page transitions stay at 400ms or under. Exit can be faster than entrance. Larger travel distance can be slower; frequent interactions get shorter.
- Elements that belong together share easing and duration: modal/backdrop, tooltip/arrow, drawer/scrim.
- Only one major thing should move at a time. Competing motion looks cheap.
- Scale popovers from the trigger origin. Start appearing elements near their final scale, around `0.96–0.98`, not from tiny toy scale.
- Stagger lists lightly, around 30ms an item. Large staggers make the UI feel slow.
- Theme switching disables transitions for the theme flip, to avoid a full-app animated flash.

Tokens, where the project has none, are the canonical set in the Markup and CSS procedure. Its motion tokens:

```css
:root {
  --duration-100: 100ms;
  --duration-150: 150ms;
  --duration-200: 200ms;
  --duration-300: 300ms;
  --ease-out:    cubic-bezier(0.215, 0.61, 0.355, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
```

**Springs** are for drag, interruption, playful physics, and gesture-driven surfaces.

- Default serious UI bounce: `0`. Subtle playful bounce: `0.1–0.2`. Drag-to-dismiss and playful surfaces: `0.2–0.3` when the brand supports it.
- Prefer duration+bounce APIs when available; they are easier to tune than raw mass/stiffness/damping.
- Springs preserve velocity and respond to user interruption.

**Reduced motion** should not make the UI feel broken; it should make the UI calm.

- Remove or replace large spatial moves, parallax, scroll-linked movement, zooms, decorative loops, intro sequences, and autoplay video.
- Preserve instant or near-instant non-spatial feedback when it helps the user understand state.
- Videos do not autoplay for reduced-motion users; show controls or a play button. Where autoplay is expected, video needs `muted` and `playsInline`.

```css
.card {
  transition: transform 160ms var(--ease-out), opacity 160ms var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: opacity 80ms linear;
    transform: none !important;
  }
}
```

## Performance and stability

- Animate `transform` and `opacity` by default. Avoid animating `height`, `width`, `padding`, `margin`, `top`, `left`, `border-width`, heavy shadows, filters, and deep CSS variables.
- CSS transitions and animations are best for simple predetermined motion. JS animation is justified for dynamic, interruptible, gesture-driven, layout-aware, or physics-based motion.
- Do not drive animation frame-by-frame through React state. Use Motion values, refs, CSS variables carefully, or direct imperative animation.
- `will-change` is not a magic GPU switch. Use it only for real jank, shortly before the animation, and remove it when possible.
- Pause decorative loops, video, canvas, and expensive effects when off-screen.
- Reserve dimensions for images, video, skeletons, ads, embeds, async panels, and dynamic cards. Use skeletons that match final layout, not generic grey bars that collapse later. Avoid spinner-only loading for layout-heavy surfaces.
- Do not change border width, padding, or line-height on hover or selected states.
- Initial render matches hydrated state. No light-mode flash, auth flash, or collapsed-then-expanded layout surprise.
- Virtualize lists when the DOM size becomes visible in scroll or interaction cost, not because a list has a scary number in theory. Do not virtualize small lists; complexity is not free.

## Before answering

Run this silently and fix issues before returning work:

- Can the main task be completed with mouse, touch, and keyboard?
- Does anything jump, resize, flash, autofocus badly, or trigger mobile hover weirdness?
- At the narrowest width it will be used at, does every screen still fit? No navigation item cut off, no column pushed past the edge, no label wrapped a word at a time.
- Are the primary action, destructive action, and recovery path obvious?
- Did you remove generic copy, arbitrary values, duplicate primaries, and fake polish?
