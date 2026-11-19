# Interface: apps and product screens

Read with [interface.md](interface.md) when the work is a web app or product screen: forms, dialogs, menus, components, touch. A game menu or a marketing page does not need this file.

## The floor

- Native element first, ARIA second, custom behavior last. Do not fake a button or a link with a clickable `div` or `span`.
- Icon-only controls are labelled by action, not by shape: "Close dialog," "Copy link," not "icon."
- Placeholder is not a label. An invalid field keeps what the user typed.
- Focus is visible, trapped only inside true modals, and returned to the trigger on close. Content behind a modal is inert.
- Only visible and relevant elements are tabbable. Hidden panels use `hidden`, `inert`, unmounting, or correct focus removal.
- Touch hit areas are at least 44×44px even when the visual glyph is smaller. Use pseudo-elements or padding to expand tiny icon-button targets.
- Inputs and textareas are at least 16px on mobile-sized viewports, or iOS zooms on focus.
- Do not custom-style page scrollbars. Small contained scroll areas only.

## Components

Written for React. Design components as product contracts: a bad API will manufacture bad UI forever.

- Expose variants, sizes, slots, `className`, and `asChild` instead of prop explosion. Avoid boolean soup. Use `variant="primary"`, `size="lg"`, `tone="danger"`, not `primary large danger rounded`. Boolean props are positive: `disabled`, `open`, `loading`, not `notEnabled` or `isNotClosed`.
- Spread remaining props onto the semantic root so `data-testid`, `aria-*`, `id`, native attributes, and event handlers work. Do not swallow native behavior.
- Default `button` type is `button`, not `submit`, unless the component is explicitly submit-specific.
- `asChild` transfers styling and behavior to a real semantic child, such as a link styled as a button. The child is a single element with the correct semantics. Never use it to make a `div` pretend to be interactive.
- In React 19-style app code, accept `ref` as a normal prop. In React 18 or library-compatible code, use `forwardRef` for low-level components that wrap DOM elements.
- Reusable stateful components support controlled (`value`/`open` with `onValueChange`/`onOpenChange`) and uncontrolled (`defaultValue`/`defaultOpen`) modes, fire change callbacks in both, and never switch between them internally.

## Forms

- Wrap form fields in a real `<form>` so Enter submission, browser behavior, password managers, and assistive tech work.
- Use the right type: `email`, `password`, `tel`, `url`, `search`. Use `text` + `inputMode` for codes, money-like strings, IDs, and values where leading zeroes matter.
- Use valid autocomplete tokens for user data. Do not globally set `autocomplete="off"` for "cleanliness." Disable it only for narrow cases: one-time codes, generated tokens, ephemeral search-like fields, or fields where browser autofill actively corrupts the task.
- Disable spellcheck for codes, usernames, tags, URLs, command inputs, IDs, and technical fields.
- Do not autofocus on touch devices unless the whole screen exists solely for text entry. Surprise keyboard popups feel broken. Autofocus inside desktop dialogs is good when it advances the obvious task.
- Prefix/suffix icons sit inside the input wrapper with padding compensation. Decorative ones use `pointer-events: none`. Clickable ones are real buttons with labels and 44px hit areas.
- Clicking a label, row, prefix, or suffix focuses or toggles the associated control. Checkbox and radio rows are clickable across label and whitespace, not only on the tiny control.
- Inline validation belongs near the field. Reserve error-message space when toggling errors would cause ugly layout jumps in dense forms.
- Verification-code flows support paste, correction, selection, and screen-reader clarity. Clever auto-advance must not trap corrections.
- Disable or lock the submitting action to prevent duplicate requests. Preserve button width when changing "Save" to "Saving…" to avoid jitter.
- Use optimistic UI when the action is low-risk and reversible. Use pessimistic confirmation when data loss, money, permissions, or destructive effects are involved.
- Textareas support Cmd/Ctrl+Enter submit when that matches product convention. Show OS-specific shortcuts: Cmd on Mac, Ctrl on Windows/Linux.

## Controls and overlays

- Only one primary action per decision area. Equal-weight buttons mean no hierarchy.
- Destructive actions need visual separation and either confirmation, undo, or a two-step intentional gesture.
- Sliders update live while dragging unless the update is genuinely expensive; if expensive, preview live and commit on release.
- Copy-to-clipboard must change state after success. Users should not need to click three times to trust it.
- Dialogs are for blocking decisions or focused tasks. Popovers are for lightweight contextual content. Tooltips are for non-interactive hints: no links, buttons, forms, or focusable content inside one.
- Tooltips get a small delay so users do not trigger noise accidentally. Once a tooltip is open, sibling tooltips can open instantly for a short warm period.
- Submenus need a pointer safe zone so diagonal movement does not punish users. Mobile menus use tap-first disclosure, not hover simulation.
- Popovers do not steal focus unless they contain interactive content. Toasts do not take focus for routine confirmations. Critical alerts need an accessible announcement and a persistent recovery path.
- Toast duration scales with reading length. Tiny confirmations can be brief; multi-sentence messages need time or persistence.
- Time-limited actions pause when the tab or app is hidden.

## Touch and small screens

- Use `touch-action: manipulation` on normal controls to reduce tap delay and double-tap weirdness. Use `touch-action: none` only for custom canvases and gestures that intentionally replace native panning and zooming.
- Fixed elements respect safe-area insets. Fixed mobile CTAs never cover the last field, footer action, or validation message.
- Sticky headers stay proportionate on short viewports; use dynamic viewport units and max-height constraints.
- Mobile dialogs and drawers account for viewport height, browser chrome, keyboard, and scroll containment.

## Copy and structure

- Error copy names the problem and the fix: "Email must include @" beats "Invalid input."
- Front-load notifications: "Export ready. Download it."
- Do not apologize in button labels. Own the action.
- Use sentence case for product UI unless the brand has a strong reason not to.
- Avoid internal nouns, acronyms, and implementation verbs in user-facing surfaces. Search terms are IA feedback: if users search "invoices," do not hide the page under "billing artifacts."
- Avoid three-level dropdown nav. Flatten, group, or use breadcrumbs.
- Onboarding should create value, not tour chrome. Help the user do the first meaningful thing.
