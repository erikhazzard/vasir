---
name: design__building-frontend-interfaces
description: Opionioated design engineeirng guidelines. Use when building or designing frontend UIs
---

# Polished Interface Engineering

Make web UI feel expensive, fast, obvious, tactile, accessible, and impossible to misuse.

This is not a generic UI helper. Apply strong taste. Make the call. Do not flatten decisions into safe corporate mush. Do not cite sources, name outside influences, score the UI, or write compliance theater unless the user explicitly asks. Ship the better interface.

## Operating stance

- Max polish by default. Preserve function, then make it beautiful.
- Ask only when missing context blocks the work. Otherwise choose the strongest reasonable default.
- Prefer decisive implementation over commentary. Code beats explanation.
- Fix root causes, not symptoms. If the component API causes bad UI, redesign the API.
- Respect the existing codebase only when it is coherent. Do not preserve bad patterns out of politeness.
- Do not invent fake constraints. If a claim depends on framework version, browser behavior, or product context, make a safe assumption or say what must be checked.
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

## Task routing

- **Build or rewrite a component:** use `components-forms.md`, then `mobile-accessibility.md`, then `craft-rules.md`, then `motion-performance.md`.
- **Polish existing UI:** use `craft-rules.md` first; then add motion only where it clarifies feedback or continuity.
- **Form/control work:** use `components-forms.md` and `mobile-accessibility.md`; polish states last.
- **Animation/motion work:** use `motion-performance.md`; then verify reduced motion and touch behavior.
- **Marketing/docs/page work:** use `craft-rules.md` and `motion-performance.md`; protect LCP, CTA clarity, readable type, and no scroll theater.
- **Performance work:** use `motion-performance.md`; preserve perceived speed before micro-optimizing code.
- **Review work:** return only the highest-leverage fixes unless the user asks for exhaustive review.

## Response contract

### Implementation

Return the improved code first. Then include only the essential notes needed to understand integration, assumptions, or sharp tradeoffs.

### Review

Do not write a generic checklist. Give the few changes that most improve the interface:

```
[Blocker | High | Polish] Problem → exact fix → why it matters
```

Use “Blocker” only for broken task flow, inaccessible core behavior, data loss, severe layout shift, or unusable mobile behavior.

### Polish pass

Be concrete. Say exactly what to change: spacing, type scale, radius, shadow, color token, transition timing, copy, hierarchy, state treatment. Avoid “make it cleaner.”

### Performance pass

Name the visible symptom, the likely cause, and the smallest fix. Do not recommend memoization, virtualization, `will-change`, or direct DOM animation unless the shape of the problem calls for it.

## Non-negotiables

- Use native HTML semantics before ARIA or custom interaction code.
- Buttons perform actions. Links navigate. Do not fake either with `div`/`span` clicks.
- Every icon-only control has an action label.
- Every input has a persistent label or an equivalent visible label pattern; placeholder is not a label.
- Keyboard users can reach, operate, escape, and recover from every interactive path.
- Focus is visible, intentional, trapped only inside true modals, and returned to the trigger on close.
- Hover enhances only. Nothing important depends on hover.
- Touch hit areas default to 44×44px minimum even when the visual glyph is smaller.
- Inputs are at least 16px on iOS-sized viewports.
- Dynamic content reserves space. Changing numbers use tabular figures. Hover/selected states do not change layout.
- No `transition: all`.
- Product UI motion is fast, purposeful, and removable under reduced motion.
- Animate `transform` and `opacity` by default. Avoid animating layout properties.
- `will-change` is a temporary last resort for real jank, not a default styling habit.
- Do not globally disable autocomplete. Use correct autocomplete tokens; disable only for narrow, intentional cases.
- Use semantic tokens and variables. Do not spray raw hex values or one-off dark-mode overrides.
- No arbitrary `z-index: 9999`; use a scale, stacking contexts, or eliminate the z-index fight.
- Do not custom-style page scrollbars. Small contained scroll areas only.
- Destructive actions are separated visually and require intentional confirmation or undo.
- Loading, empty, success, disabled, error, hover, active, focus, and reduced-motion states are first-class design states.

## Final sweep before answering

Run this silently and fix issues before returning work:

- Can the main task be completed with mouse, touch, and keyboard?
- Does every interactive element expose the right name, role, state, and behavior?
- Does anything jump, resize, flash, autofocus badly, or trigger mobile hover weirdness?
- Is the visual hierarchy unmistakable at a glance?
- Are the primary action, destructive action, and recovery path obvious?
- Are motion, loading, and async states fast and stable?
- Did you remove generic copy, arbitrary values, duplicate primaries, and fake polish?

## Reference files

- `craft-rules.md` — typography, color, layout, icons, IA, copy, marketing/docs polish.
- `components-forms.md` — React component APIs, forms, controls, buttons, state patterns.
- `mobile-accessibility.md` — touch, keyboard, focus, semantics, tooltips, dialogs, accessibility behavior.
- `motion-performance.md` — easing, transitions, reduced motion, rendering performance, loading, virtualization.
