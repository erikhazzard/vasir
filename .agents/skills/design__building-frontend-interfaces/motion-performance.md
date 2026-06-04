# Motion and Performance

Motion is a tool for causality, continuity, feedback, and delight. Decoration that slows the task is not polish.

## Motion decisions

- Users see it 100+ times/day: remove it or make it nearly instant.
- User-initiated enter/exit: use fast ease-out.
- Existing element moves/morphs: use ease-in-out.
- Hover/color state: use short ease.
- Gesture/drag/interruption: use spring.
- Marketing flourish: allowed only when it does not delay comprehension, CTA access, or page performance.
- Keyboard-heavy flows: favor instant state over animation.

## Easing tokens

```css
:root {
  --ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
  --ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
  --ease-out-quint: cubic-bezier(0.23, 1, 0.32, 1);

  --ease-in-out-cubic: cubic-bezier(0.645, 0.045, 0.355, 1);
  --ease-in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-in-out-quint: cubic-bezier(0.86, 0, 0.07, 1);

  --duration-instant: 80ms;
  --duration-fast: 120ms;
  --duration-ui: 180ms;
  --duration-panel: 240ms;
  --duration-page: 360ms;
}
```

## Duration rules

- Micro-interactions: 80–150ms.
- Buttons, hovers, small controls: 100–150ms.
- Dropdowns, tooltips, popovers: 150–220ms.
- Modals, drawers, panels: 200–300ms.
- Page transitions: 300–400ms max.
- Exit can be faster than entrance.
- Larger travel distance can be slower; frequent interactions get shorter.
- Anything over 400ms needs visible progress or should not exist in product UI.

## Choreography

- Elements that belong together share easing and duration: modal/backdrop, tooltip/arrow, drawer/scrim.
- Only one major thing should move at a time. Competing motion looks cheap.
- Enter should feel like arrival. Exit should feel like departure, not the entrance reversed blindly.
- Scale popovers from the trigger origin when possible.
- Start appearing elements near their final scale, around `0.96–0.98`, not from tiny toy scale.
- Buttons can depress subtly on active; never shove layout around.
- Stagger lists lightly, around 30–50ms. Large staggers make the UI feel slow.

## Springs

Use springs for drag, interruption, playful physics, and gesture-driven surfaces.

- Default serious UI bounce: `0`.
- Subtle playful bounce: `0.1–0.2`.
- Drag-to-dismiss/playful surfaces: `0.2–0.3` when the brand supports it.
- Prefer duration+bounce APIs when available; they are easier to tune than raw mass/stiffness/damping.
- Springs should preserve velocity and respond to user interruption.

## Reduced motion

- Remove or replace large spatial moves, parallax, scroll-linked movement, zooms, decorative loops, intro sequences, and autoplay video.
- Preserve instant or near-instant non-spatial feedback when it helps the user understand state.
- Reduced motion should not make the UI feel broken; it should make the UI calm.

```css
.card {
  transition: transform 160ms var(--ease-out-cubic), opacity 160ms var(--ease-out-cubic);
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: opacity 80ms linear;
    transform: none !important;
  }
}
```

## Animation performance

- Animate `transform` and `opacity` by default.
- Avoid animating `height`, `width`, `padding`, `margin`, `top`, `left`, `border-width`, heavy shadows, filters, and deep CSS variables.
- Never use `transition: all`.
- Avoid blur above 20px, especially on moving elements and Safari-sensitive surfaces.
- CSS transitions/animations are best for simple predetermined motion.
- JS animation is justified for dynamic, interruptible, gesture-driven, layout-aware, or physics-based motion.
- Do not drive animation frame-by-frame through React state.
- Motion libraries are fine when they avoid unnecessary React renders and produce transform/opacity-based updates.
- `will-change` is not a magic GPU switch. Use it only for real jank, shortly before the animation, and remove it when possible.
- Pause decorative loops, video, canvas, and expensive effects when off-screen.

## React performance

- Do not optimize blindly. Optimize the slow visible thing.
- Avoid state updates on every animation frame. Use Motion values, refs, CSS variables carefully, or direct imperative animation when appropriate.
- Memoization is not a design system. Use it when prop stability and render cost justify it.
- Virtualize lists when the DOM size becomes visible in scroll/interaction cost, not because a list has a scary number in theory.
- Keep derived state derived. Duplicate state causes bugs and extra renders.
- Split expensive islands from frequently changing UI.
- Avoid rerendering entire pages for local hover, drag, input, or animation state.

## Layout stability

- Reserve dimensions for images, video, skeletons, ads, embeds, async panels, and dynamic cards.
- Use skeletons that match final layout, not generic grey bars that collapse later.
- Use tabular numbers for changing metrics.
- Do not change font weight, border width, padding, or line-height on hover/selected states.
- Theme switching must disable transitions for the theme flip to avoid a full-app animated flash.
- Initial render should match hydrated state. No light-mode flash, auth flash, or collapsed-then-expanded layout surprise.

## Loading and page speed

- Above-the-fold hero images are priority assets. Size them, preload them when appropriate, and avoid shipping decorative megabytes.
- Preload critical fonts; load only used weights/styles; choose fallbacks that minimize shift.
- Static content should be generated ahead of time when possible: docs, blogs, changelogs, marketing pages, mostly-static resource pages.
- Fetch request-time content only when freshness or personalization genuinely requires it.
- Avoid spinner-only loading for layout-heavy surfaces. Skeletons or reserved panels preserve shape.
- Slow operations need visible status; silent delay reads as broken.
- Keep interaction response under the threshold where users feel the UI hesitated. Immediate visual feedback matters even when the server is slow.

## Virtualization

- Virtualize large scrolling collections when real DOM weight harms scroll, memory, input responsiveness, or initial render.
- Preserve keyboard navigation, findability, scroll restoration, dynamic row heights, and screen-reader expectations.
- Use stable item keys and measured/estimated sizes that do not cause scroll jumps.
- Do not virtualize small lists; complexity is not free.

## Marketing motion and page behavior

- No scroll hijacking.
- No disconnected parallax.
- No default scroll fade-up parade.
- No auto-advancing carousel for primary content.
- Intro animation can play once per session, then skip.
- Scroll-linked effects must map directly to user movement and clarify structure; otherwise cut them.
- Product demos should load fast, poster cleanly, respect reduced motion, and never block the CTA.
