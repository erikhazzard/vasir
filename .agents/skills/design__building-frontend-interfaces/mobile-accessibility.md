# Mobile and Accessibility

Accessibility is not a checklist layer. It is the interaction contract. If a user cannot perceive, reach, operate, understand, or recover from the UI, the UI is not polished.

## Semantics first

- Native element first, ARIA second, custom behavior last.
- A control exposes the correct name, role, state, and behavior.
- Buttons act. Links navigate. Inputs collect. Labels label. Headings structure. Lists group. Tables compare data.
- Do not add roles that fight native semantics.
- Decorative icons are hidden from assistive tech. Informative icons have text or labels.
- Icon-only controls are labelled by action, not by shape.
- Visual order and DOM order should match.
- Do not use color as the only signal for error, success, selection, warning, or required state.

## Keyboard behavior

- Every interactive element is reachable with Tab or an appropriate roving-focus pattern.
- Only visible and relevant elements are tabbable. Hidden panels use `hidden`, `inert`, unmounting, or correct focus removal.
- Focus rings are never removed. Replace them only with a clearly visible custom outline and offset.
- Keyboard focus should scroll into view without disorienting jumps.
- Escape closes dismissible overlays when doing so is safe.
- Focus returns to the trigger after closing dialogs, popovers, menus, and drawers.
- Do not create keyboard traps except inside true modal dialogs; even then Escape or an obvious close action must work.
- Skip links belong on pages with repeated heavy navigation.

## Touch behavior

- Design for touch first; enhance with hover only for devices that actually hover.

```css
@media (hover: hover) and (pointer: fine) {
  .button:hover { transform: translateY(-1px); }
}
```

- Nothing essential depends on hover. Hover previews need click/tap equivalents.
- Hit areas default to at least 44×44px. The visual glyph can be smaller; the interactive area cannot.
- Use pseudo-elements or padding to expand tiny icon-button targets.
- Use `touch-action: manipulation` on normal controls to reduce tap delay/double-tap weirdness.
- Use `touch-action: none` only for custom canvases/gestures that intentionally replace native panning/zooming.
- Fixed elements respect safe-area insets and never cover usable content.
- Mobile dialogs and drawers must account for viewport height, browser chrome, keyboard, and scroll containment.

## Focus and overlays

- Dialog open: move focus to the first useful control or the dialog container/title.
- Dialog close: return focus to the element that opened it.
- Background content behind a modal is inert.
- Avoid autofocus on touch unless text entry is the whole task.
- Popovers should not steal focus unless they contain interactive content.
- Toasts do not take focus for routine confirmations. Critical alerts need an accessible announcement and persistent recovery path.
- Do not hide important feedback inside hover-only surfaces.

## Forms and error access

- Labels are programmatically associated with inputs.
- Error text is associated with the field it describes.
- Invalid fields expose invalid state and still preserve user input.
- Required/optional status is visible and not color-only.
- A form-level summary can help after submit, but field-level messages still need to exist.
- Clicking a label focuses or toggles the field.
- Verification-code flows should support paste, correction, selection, and screen-reader clarity. Clever auto-advance must not trap corrections.

## Motion and vestibular safety

- Reduced motion removes or replaces spatial motion, parallax, scroll-linked movement, autoplay motion, large zooms, and decorative loops.
- Minimal opacity/color feedback may remain when it preserves comprehension and does not create motion discomfort.
- Videos do not autoplay for reduced-motion users; show controls or a play button.
- Motion must be interruptible when the user changes their mind.

## Tooltips, popovers, submenus

- Tooltip content is short, non-interactive, and supplemental.
- Tooltips get a small delay so users do not trigger noise accidentally.
- Once a tooltip is open, sibling tooltips can open instantly for a short warm period.
- Interactive “tooltip” content is a popover, not a tooltip.
- Submenus need diagonal pointer forgiveness. Users should not lose the menu because their hand moved like a human hand.
- Mobile menus should use tap-first disclosure, not hover simulation.

## Time and state

- Time-limited actions pause when the tab/app is hidden.
- Session-expiring, destructive, payment, permission, or irreversible flows need clear state and recovery.
- Loading states should preserve layout and describe what is happening when the delay is noticeable.
- Disabled controls should explain why when the reason is not obvious, but not only via hover.

## Decorative and media elements

- Decorative backgrounds use `pointer-events: none` and do not block selection or controls.
- Informative code-built illustrations use `role="img"` with a useful label.
- Decorative images/icons use empty alt or are hidden from assistive tech.
- Autoplay video needs `muted` and `playsInline` where autoplay is expected, and a non-autoplay path when motion should be reduced.
