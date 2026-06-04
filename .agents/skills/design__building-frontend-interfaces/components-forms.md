# Components and Forms

Design components as product contracts. A bad API will manufacture bad UI forever.

## Component API posture

- Prefer composition over configuration. If structure varies, let users compose children instead of passing nested config objects.
- Use compound components when parts share state or must coordinate: dialog trigger/content/title/close, tabs list/trigger/content, select trigger/value/content/item.
- Do not use compound components for simple fixed structures. Complexity must buy flexibility.
- The default API should handle 80% of use. Escape hatches handle the rest.
- Expose variants, sizes, slots, `className`, and `asChild` instead of prop explosion.
- Avoid boolean soup. Use `variant="primary"`, `size="lg"`, `tone="danger"`, not `primary large danger rounded`.
- Boolean props should be positive: `disabled`, `open`, `required`, `loading`, not `notEnabled` or `isNotClosed`.
- Events use `onX`. Use `onOpenChange`, `onValueChange`, `onSubmitSuccess`, not `handleThing` props.
- Children are for simple composition. Render props are for data-dependent rendering.
- Spread remaining props onto the semantic root so `data-testid`, `aria-*`, `id`, native attributes, and event handlers work.
- Do not swallow native behavior. A `Button` should still act like a button; an `Input` should still act like an input.
- Default `button` type is `button`, not `submit`, unless the component is explicitly submit-specific.
- Do not abstract until a pattern appears 2–3 times. Premature components fossilize guesses.

## `asChild`

Use `asChild` when styling/behavior should transfer to a real semantic child:

```tsx
<Button asChild>
  <a href="/pricing">View pricing</a>
</Button>
```

Rules:

- The child must be a single element.
- The child must carry the correct semantics. Link children navigate; button children act.
- Do not use `asChild` to make a `div` pretend to be interactive.
- Merge event handlers, refs, classes, and data attributes carefully.
- The component should not inject props the child cannot legally accept.

## Refs

- In React 19-style app code, prefer accepting `ref` as a normal prop where supported.
- In React 18/library-compatible code, use `forwardRef` for low-level components that wrap DOM elements and need focus, measurement, positioning, animation, or integration with primitives.
- Do not expose refs as a default escape hatch for ordinary app state. Refs are for imperative integration, not bypassing clean data flow.
- If a component cannot forward or accept refs, document that by design.

## Controlled and uncontrolled state

- Inputs, dialogs, tabs, accordions, selects, popovers, and similar stateful components should support controlled and uncontrolled modes when reusable.
- Controlled: `value/open` + `onValueChange/onOpenChange`.
- Uncontrolled: `defaultValue/defaultOpen`.
- Never switch between controlled and uncontrolled internally.
- Fire change callbacks for both modes.
- Keep internal state minimal and derived state honest.

## Component states

Build these deliberately, not as afterthoughts:

- disabled: non-interactive, still understandable, no tooltip-only explanation
- loading: prevents duplicate action, preserves button width, communicates progress
- error: visible message near source, programmatic association when field-related
- empty: explains why and gives next action
- selected/current: visually distinct without layout shift
- focus-visible: obvious, offset, not swallowed by overflow
- active: tactile press feedback without moving layout

## Forms

- Wrap form fields in a real `<form>` so Enter submission, browser behavior, password managers, and assistive tech work.
- Every field gets a persistent label. Placeholder text can help but never replaces the label.
- Use the right type: `email`, `password`, `tel`, `url`, `search`. Use `text` + `inputMode` for codes, money-like strings, IDs, and values where leading zeroes matter.
- Use valid autocomplete tokens for user data. Do not globally set `autocomplete="off"` for “cleanliness.”
- Disable autocomplete only for narrow cases: one-time codes, generated tokens, ephemeral search-like fields, or fields where browser autofill actively corrupts the task.
- Use spellcheck where language input benefits from it. Disable it for codes, usernames, tags, URLs, command inputs, IDs, and technical fields.
- Use password-manager ignore attributes only on fields that are definitely not credentials.
- Inputs and textareas should be at least 16px on mobile-sized viewports to avoid iOS focus zoom.
- Do not autofocus on touch devices unless the whole screen exists solely for text entry. Surprise keyboard popups feel broken.
- Autofocus inside desktop dialogs is good when it advances the obvious task. Otherwise focus the dialog title/container.

## Field layout

- Labels, descriptions, inputs, errors, and helper text form one visual group.
- Prefix/suffix icons sit inside the input wrapper with padding compensation.
- Decorative input icons use `pointer-events: none`.
- Clickable input adornments are real buttons with labels and 44px hit areas.
- Clicking a label, row, prefix, or suffix should focus or toggle the associated control when that is the expected behavior.
- Inline validation belongs near the field. Top-of-form summaries can supplement, not replace, local errors.
- Reserve error-message space when toggling errors would cause ugly layout jumps in dense forms.

## Submission

- Disable or lock the submitting action to prevent duplicate requests.
- Preserve button width when changing “Save” to “Saving…” to avoid jitter.
- Use optimistic UI when the action is low-risk and reversible. Use pessimistic confirmation when data loss, money, permissions, or destructive effects are involved.
- Textareas should support Cmd/Ctrl+Enter submit when that matches product convention.
- Show OS-specific shortcuts: Cmd on Mac, Ctrl on Windows/Linux.
- On success, show where the state went: toast, inline confirmation, navigation, or changed content.
- On failure, preserve user input and provide a concrete recovery action.

## Buttons and controls

- Use `<button>` for actions and `<a>` for navigation.
- Never attach click handlers to non-interactive elements when a native element works.
- Icon-only buttons need action labels: “Close dialog,” “Search,” “Copy link,” not “icon.”
- Buttons need visible default, hover, active, focus-visible, disabled, and loading states.
- Add subtle `transform: scale(0.97)` or equivalent active treatment for tactile press feedback when it fits the component.
- Only one primary action per decision area. Equal-weight buttons mean no hierarchy.
- Destructive actions need visual separation and either confirmation, undo, or a two-step intentional gesture.
- Checkbox/radio rows should be clickable across label and whitespace, not only on the tiny control.
- Sliders should update live while dragging unless the update is genuinely expensive; if expensive, preview live and commit on release.
- Copy-to-clipboard must change state after success. Users should not need to click three times to trust it.

## Dialogs, popovers, menus

- Dialogs are for blocking decisions or focused tasks. Popovers are for lightweight contextual content. Tooltips are for non-interactive hints.
- Do not put links, buttons, forms, or focusable content inside tooltips. Use a popover.
- Dialogs need title, description when helpful, focus entry, focus trap, Escape close when safe, outside click behavior by intent, and focus return to trigger.
- Menus need keyboard navigation, current highlighted item, typeahead when useful, and predictable close behavior.
- Submenus need a pointer safe zone so diagonal movement does not punish users.

## Error boundaries and organization

- Use error boundaries around complex, isolated, failure-prone regions: editors, dashboards, visualizers, third-party embeds, heavy async islands.
- Do not wrap every tiny component in its own boundary.
- Organize reusable components with a public `index.ts`, colocated tests, and private internals hidden by default.
- Public exports should be stable and boring. Internal files can move; public API should not.
