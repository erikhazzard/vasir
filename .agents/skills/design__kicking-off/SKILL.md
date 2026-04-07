---
name: design__kicking-off
description: Generates canonical production-grade frontend UI from scratch — pure BEM naming, strict class budgets, token-based styles, and intentional, distinctive aesthetics. Tailwind and utility-soup strictly forbidden. Establishes the initial design system foundation for a new project or component library. Use when starting a new frontend project, bootstrapping a component library, or establishing the visual identity and CSS architecture for a fresh codebase.
tools:
  - Read
  - Grep
  - Glob
  - Edit
  - Write
model: opus
---

# Frontend That Survives Production

## Canonical BEM + Intentional Aesthetics (No Utility Soup, No AI Slop)

### Mission

Generate frontend code that is:

- **Searchable**: you can grep one class name and find the whole surface area.
- **Readable**: diffs explain themselves. Markup isn’t a CSS dumpster.
- **Composable**: reuse happens through _named components_, not mystery meat utilities.
- **Designed on purpose**: strong aesthetic direction, not “default SaaS template #84.”

This codebase optimizes for: **clarity, stability, and taste under pressure**.

---

## Part 1 — Design Thinking (Before You Write Any Code)

### 1) Establish context (infer if missing)

Briefly state assumptions when the user didn’t specify:

- **Purpose**: what job does this UI do?
- **Audience**: who uses it (and what do they care about)?
- **Environment**: app shell vs landing page vs in-game UI vs admin tool.
- **Constraints**: framework, accessibility level, performance, theming.

No rambling. 4–8 lines max. This is just to prevent “AI autopilot UI.”

### 2) Choose ONE bold aesthetic direction (commit, don’t hedge)

Pick a clear style lane and stick to it:

- brutally minimal / editorial / brutalist / retro-futuristic / toy-like / industrial / luxe / organic / art deco / etc.

Then define:

- **The hook**: the one memorable visual idea (e.g., “oversized typography with surgical spacing,” “soft glass + grain + sharp accents,” “diagrammatic UI with grid labels,” “console-like monochrome with punchy warning color”).
- **Typography stance**: a display face + body face (or a single family with strong hierarchy).
- **Color stance**: dominant background + one sharp accent + one “danger/alert” tone.
- **Motion stance**: one signature moment (page load, panel reveal, hover microinteraction) executed well.

### 3) Translate the concept into a component contract

Before implementation, explicitly list:

- **Block name(s)** you will introduce (and why those names).
- **Modifiers** you will support (variants/sizes).
- **States** you will support (`is-*`).

This prevents random class invention mid-stream.

---

## Part 2 — CSS & Markup Contract (Hard Rules)

### Absolutely forbidden

- Tailwind / atomic CSS / utility stacks (Tailwind, Windi, Uno, Tachyons, etc.)
- Homegrown utility classes (same disease, different band name):
  - ❌ `util-mb-6`, `u-gap-2`, `stack-12`, `text-sm`, `flex-row`

- CSS-in-JS (styled-components/emotion) unless explicitly approved per component
- Styling via attribute selectors:
  - ❌ `[data-state="open"] { ... }`

- Specificity hacks:
  - ❌ `!important` (except a single sanctioned reset file if already present)
  - ❌ ID selectors for styling
  - ❌ type-qualified selectors like `button.ui-button`

### BEM only, kebab-case only

- Block: `component-name`
- Element: `component-name__part`
- Modifier: `component-name--variant`
- State: `is-open`, `is-loading`, `is-disabled`

### The Canonical Class Rule

Each DOM element gets **one canonical class** describing _what it is_ in the system.

Allowed extra classes are tightly budgeted (next section). If you need more, **your component boundary is wrong**.

### Class budget (strict)

Default per element:

- **1 canonical class**

Rare additions:

- **+1 modifier** (variant/size/tone)
- **+1 state** (`is-*`)

**Hard cap:** 3 classes per element (rarely 4; treat 4 as a smell).

### Selector rules (predictability > cleverness)

- Max nesting depth: **2**
- Max compound selector parts: **3**
- No “ambient styling”:
  - ❌ `.checkout-summary button { ... }`
  - ✅ `.checkout-summary__submit { ... }` or a named shared component

---

## Part 3 — Naming Rules That Prevent “ui-button vs profile” Confusion

### A. Two naming tiers (this solves 90% of naming pain)

#### Tier 1: Product/feature blocks (domain-specific)

Use these for real UI in the app: screens, sections, feature components.

**Rule:** include the domain noun. Avoid bare ambiguous nouns.

✅ Good

- `account-profile`
- `public-profile`
- `profile-card`
- `player-inventory`
- `checkout-summary`
- `party-chat`
- `matchmaking-queue`

❌ Bad

- `profile` (which profile?)
- `menu` (what menu?)
- `card` (card for what?)
- `container`, `wrapper`, `content` (says nothing)

#### Tier 2: Shared UI primitives (design system components)

These are intentionally generic _because they’re meant to be generic_.

Pick ONE prefix and never deviate:

- `ui-` (fine)
- `ds-` (design system)
- `c-` (component) — less descriptive, but some teams like it

If you choose `ui-`, then yes: **`ui-button` is a good name** because it means:

> “This is the canonical reusable Button primitive, not a random button.”

✅ Examples

- `ui-button`, `ui-input`, `ui-card`, `ui-modal`, `ui-tooltip`, `ui-tabs`

Modifiers carry the specificity:

- `ui-button--tone-danger`
- `ui-button--size-lg`
- `ui-card--elevated`

### B. The “Search Test” (mandatory)

A class name is acceptable only if:

1. You can grep it and find **all** relevant styling + markup.
2. A new engineer can guess its purpose without opening 12 files.

If it fails either, rename it.

### C. The “Read It Out Loud” test (surprisingly effective)

If saying it sounds like nonsense, it probably is:

- ❌ “util margin bottom six”
- ✅ “checkout summary total”
- ✅ “user menu trigger”

### D. Canonical vocabulary (consistency beats creativity)

Pick one canonical term and stick to it across the codebase:

- `modal` vs `dialog` vs `popup` → choose one
- `toast` vs `notification` → choose one
- `spinner` vs `loader` → choose one

Inconsistent naming creates invisible duplication.

---

## Part 4 — Reuse Rules (Reuse = Great, Utilities = Trash)

### Allowed: explicit reusable blocks

Reusable is good when it stays semantic and namespaced.

✅ Good

- `ui-button` (primitive)
- `ui-field` (label + input + hint)
- `ui-surface` (standard panel surface)
- `ui-badge` (status/pill)

### Disallowed: property-encoded classes

Anything that encodes raw CSS decisions into markup is out:

- ❌ `u-mb-6`, `gap-2`, `rounded-md`, `text-sm`, `shadow-xl`

### Composition rule (avoid identity collisions)

Don’t stack two “identities” on the same element unless necessary.

Prefer wrapping so the element has one job.

✅ Good

```tsx
<div className="checkout-summary__actions">
  <button className="ui-button ui-button--tone-primary">Pay now</button>
</div>
```

🚫 Avoid

```tsx
<button className="ui-button checkout-summary__pay ui-button--tone-primary">Pay now</button>
```

Reason: now it’s both “the checkout pay button” and “the ui button” and grepping becomes less clean.

---

## Part 5 — Tokens Only (No Random Magic Numbers)

All of these come from CSS custom properties (tokens):

- color, spacing, radius, shadow, z-index, duration, easing, typography

✅ Good

```css
.ui-button {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  transition: background-color var(--duration-200) var(--ease-out-cubic);
}
```

If you must use a literal, you must annotate _why_:

```css
/* 1px because it must align with the icon pixel grid */
border-width: 1px;
```

---

## Part 6 — Motion Contract (Fast, Physical, Not Annoying)

### Performance priorities

- Prefer animating: `opacity`, `transform`
- Avoid: layout properties (`top/left/width/height`), expensive blur
- `will-change` only when justified, and only for safe properties

### Timing

- Typical UI: 200–300ms
- Never > 1000ms unless explicitly illustrative and approved
- Default: ease-out for UI affordances

### Easing tokens (use variables)

```css
:root {
  --ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
  --ease-in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);

  --duration-150: 150ms;
  --duration-200: 200ms;
  --duration-300: 300ms;
}
```

---

## Part 7 — Anti “AI Slop” Aesthetic Rules (Hard Preferences)

### Never default to cliché templates

Avoid these by default unless the user explicitly asks:

- Inter/Roboto/system font autopilot
- purple gradient on white + soft shadow cards + generic hero layout
- cookie-cutter component symmetry everywhere

### Make the design feel authored

Do at least 3 of these (but in a cohesive way):

- typography with a strong hierarchy (real scale, not timid)
- a distinctive grid (or deliberate grid-breaking)
- texture/atmosphere (grain, subtle pattern, layered transparency)
- one signature interaction moment (staggered reveal, panel motion, hover detail)
- intentional “edges” (borders, rules, labels, diagrammatic hints, or bold negative space)

### Complexity must match the vision

- Maximalist direction → elaborate code, layered visuals, orchestrated motion.
- Minimal direction → restraint, precision, perfect spacing, impeccable type.

Minimalism done lazily is just emptiness.

---

## Part 8 — Engineering Baselines (No Excuses)

### Touch-First, Hover-Enhanced

Design for touch first, then add hover enhancements. Disable hover effects on touch devices. Ensure 44px minimum tap targets. Never rely on hover for core functionality.

### Elements

- Semantic HTML first (buttons are buttons, headings are headings)
- Keyboard navigable controls
- Visible focus states (designed, not default-neon unless that’s the aesthetic)
- Respect reduced motion:
  - `@media (prefers-reduced-motion: reduce)` disables nonessential motion

- Responsive behavior is intentional (not “it wraps I guess”)

---

# Recap

Hard Rules
_ Never use Tailwind/atomic CSS (Tailwind, Windi, Uno, Tachyons) or auto‑generated utility stacks.
_ Also avoid CSS‑in‑JS libraries (styled‑components/emotion) unless explicitly approved per component.

BEM only, kebab‑case:
Block: component-name
Element: component-name\_\_part
Modifier: component-name--state

Class budget (strict):
Default: 1 canonical class (the Block).
Optional: +1 or rarely +2 modifiers (e.g., --primary) and +1 state (is-loading, is-open).

Max 3 (rarely 4) classes total per element. If you need more: your Block or markup is wrong—refactor.

- No inheritance tricks: No @extend, no ID selectors, no !important (except in one sanctioned reset file if you already have one).
- Selectors: max nesting depth 2, max compound selectors 3, no qualifying types (button.button), no attribute selectors for styling.
- Tokens, not literals: Colors, spacing, z‑index, durations, and easings come from CSS custom properties.

## Animations Guidelines (codified)

- Use ease-out for most UI affordances.
- Durations: 200–300ms typical; never > 1000ms unless explicitly illustrative and approved.
- Prefer opacity and transform (translate/scale) over layout properties (top/left, width/height).

---

## Output Format (What You Must Produce)

When generating code, output in this order:

1. **Aesthetic Direction (2–6 lines)**
2. **Naming Contract**
   - Blocks you introduce
   - Modifiers
   - States

3. **Implementation**
   - TSX/HTMLInstructions for front end development
   - CSS/SCSS (class-only selectors, shallow nesting, tokens)

4. **Notes** (only if needed)
   - why a modifier exists
   - how to extend without breaking the contract

---

## Tiny Naming Examples (so you stop inventing vague nonsense)

### “Profile” done right

- Page: `account-profile`
- Public page: `public-profile`
- Small component: `profile-card`
- Sidebar section: `account-profile__security`
- Avatar row: `profile-card__identity-row`

### `ui-button` done right

- Base: `ui-button`
- Icon element: `ui-button__icon`
- Modifiers: `ui-button--tone-primary`, `ui-button--tone-danger`, `ui-button--size-sm`
- State: `is-loading` (only when truly stateful)

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:

- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: You are capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

---

# Web animation

Every animation decision starts with these questions:

1. **Is this element entering or exiting?** → Use `ease-out`
2. **Is an on-screen element moving?** → Use `ease-in-out`
3. **Is this a hover/color transition?** → Use `ease`
4. **Will users see this 100+ times daily?** → Don't animate it

## The Easing Blueprint

### ease-out (Most Common)

Use for **user-initiated interactions**: dropdowns, modals, tooltips, any element entering or exiting the screen.

```css
/* Sorted weak to strong */
--ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
--ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
--ease-out-quint: cubic-bezier(0.23, 1, 0.32, 1);
--ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
--ease-out-circ: cubic-bezier(0.075, 0.82, 0.165, 1);
```

Why it works: Acceleration at the start creates an instant, responsive feeling. The element "jumps" toward its destination then settles in.

### ease-in-out (For Movement)

Use when **elements already on screen need to move or morph**. Mimics natural motion like a car accelerating then braking.

```css
/* Sorted weak to strong */
--ease-in-out-quad: cubic-bezier(0.455, 0.03, 0.515, 0.955);
--ease-in-out-cubic: cubic-bezier(0.645, 0.045, 0.355, 1);
--ease-in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);
--ease-in-out-quint: cubic-bezier(0.86, 0, 0.07, 1);
--ease-in-out-expo: cubic-bezier(1, 0, 0, 1);
--ease-in-out-circ: cubic-bezier(0.785, 0.135, 0.15, 0.86);
```

### ease (For Hover Effects)

Use for **hover states and color transitions**. The asymmetrical curve (faster start, slower end) feels elegant for gentle animations.

```css
transition: background-color 150ms ease;
```

### linear (Avoid in UI)

Only use for:

- Constant-speed animations (marquees, tickers)
- Time visualization (hold-to-delete progress indicators)

Linear feels robotic and unnatural for interactive elements.

### ease-in (Almost Never)

**Avoid for UI animations.** Makes interfaces feel sluggish because the slow start delays visual feedback.

### Paired Elements Rule

Elements that animate together must use the same easing and duration. Modal + overlay, tooltip + arrow, drawer + backdrop—if they move as a unit, they should feel like a unit.

```css
/* Both use the same timing */
.modal {
  transition: transform 200ms ease-out;
}
.overlay {
  transition: opacity 200ms ease-out;
}
```

## Timing and Duration

### Duration Guidelines

| Element Type                      | Duration  |
| --------------------------------- | --------- |
| Micro-interactions                | 100-150ms |
| Standard UI (tooltips, dropdowns) | 150-250ms |
| Modals, drawers                   | 200-300ms |
| Page transitions                  | 300-400ms |

**Rule:** UI animations should stay under 300ms. Larger elements animate slower than smaller ones.

### The Frequency Principle

Determine how often users will see the animation:

- **100+ times/day** → No animation (or drastically reduced)
- **Occasional use** → Standard animation
- **Rare/first-time** → Can add delight

**Example:** Raycast never animates its menu toggle because users open it hundreds of times daily.

## When to Animate

**Do animate:**

- Enter/exit transitions for spatial consistency
- State changes that benefit from visual continuity
- Responses to user actions (feedback)
- Rarely-used interactions where delight adds value

**Don't animate:**

- Keyboard-initiated actions
- Hover effects on frequently-used elements
- Anything users interact with 100+ times daily
- When speed matters more than smoothness

**Marketing vs. Product:**

- Marketing: More elaborate, longer durations allowed
- Product: Fast, purposeful, never frivolous

## Spring Animations

Springs feel more natural because they don't have fixed durations—they simulate real physics.

### When to Use Springs

- Drag interactions with momentum
- Elements that should feel "alive" (Dynamic Island)
- Gestures that can be interrupted mid-animation
- Organic, playful interfaces

### Configuration

**Apple's approach (recommended):**

```js
// Duration + bounce (easier to understand)
{ type: "spring", duration: 0.5, bounce: 0.2 }
```

**Traditional physics:**

```js
// Mass, stiffness, damping (more complex)
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

### Bounce Guidelines

- **Avoid bounce** in most UI contexts
- **Use bounce** for drag-to-dismiss, playful interactions
- Keep bounce subtle (0.1-0.3) when used

### Interruptibility

Springs maintain velocity when interrupted—CSS animations restart from zero. This makes springs ideal for gestures users might change mid-motion.

## Performance

### The Golden Rule

Only animate `transform` and `opacity`. These skip layout and paint stages, running entirely on the GPU.

**Avoid animating:**

- `padding`, `margin`, `height`, `width` (trigger layout)
- `blur` filters above 20px (expensive, especially Safari)
- CSS variables in deep component trees

### Optimization Techniques

```css
/* Force GPU acceleration */
.animated-element {
  will-change: transform;
}
```

**React-specific:**

- Animate outside React's render cycle when possible
- Use refs to update styles directly instead of state
- Re-renders on every frame = dropped frames

**Framer Motion:**

```jsx
// Hardware accelerated (transform as string)
<motion.div animate={{ transform: "translateX(100px)" }} />

// NOT hardware accelerated (more readable)
<motion.div animate={{ x: 100 }} />
```

### CSS vs. JavaScript

- CSS animations run off main thread (smoother under load)
- JS animations (Framer Motion, React Spring) use `requestAnimationFrame`
- CSS better for simple, predetermined animations
- JS better for dynamic, interruptible animations

## Accessibility

Animations can cause motion sickness or distraction for some users.

### prefers-reduced-motion

Whenever you add an animation, also add a media query to disable it:

```css
.modal {
  animation: fadeIn 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .modal {
    animation: none;
  }
}
```

### Reduced Motion Guidelines
- IN GENERAL, DO NOT DO THIS UNLESS EXPLICTLY ASKED TO
- Every animated element needs its own `prefers-reduced-motion` media query
- Set `animation: none` or `transition: none` (no `!important`)
- No exceptions for opacity or color - disable all animations
- Show play buttons instead of autoplay videos

### Framer Motion Implementation

```jsx
import { useReducedMotion } from 'framer-motion';

function Component() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    />
  );
}
```

### Touch Device Considerations

```css
/* Disable hover animations on touch devices */
@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.05);
  }
}
```

Touch devices trigger hover on tap, causing false positives.

## Practical Tips

Quick reference for common scenarios. See [PRACTICAL-TIPS.md](PRACTICAL-TIPS.md) for detailed implementations.

| Scenario                        | Solution                                        |
| ------------------------------- | ----------------------------------------------- |
| Make buttons feel responsive    | Add `transform: scale(0.97)` on `:active`       |
| Element appears from nowhere    | Start from `scale(0.95)`, not `scale(0)`        |
| Shaky/jittery animations        | Add `will-change: transform`                    |
| Hover causes flicker            | Animate child element, not parent               |
| Popover scales from wrong point | Set `transform-origin` to trigger location      |
| Sequential tooltips feel slow   | Skip delay/animation after first tooltip        |
| Small buttons hard to tap       | Use 44px minimum hit area (pseudo-element)      |
| Something still feels off       | Add subtle blur (under 20px) to mask it         |
| Hover triggers on mobile        | Use `@media (hover: hover) and (pointer: fine)` |

## Easing Decision Flowchart

Is the element entering or exiting the viewport?
├── Yes → ease-out
└── No
├── Is it moving/morphing on screen?
│ └── Yes → ease-in-out
└── Is it a hover change?
├── Yes → ease
└── Is it constant motion?
├── Yes → linear
└── Default → ease-out

# Practical Animation Tips

Detailed reference guide for common animation scenarios. Use this as a checklist when implementing animations.

## Recording & Debugging

### Record Your Animations

When something feels off but you can't identify why, record the animation and play it back frame by frame. This reveals details invisible at normal speed.

### Fix Shaky Animations

Elements may shift by 1px at the start/end of CSS transform animations due to GPU/CPU rendering handoff.

**Fix:**

```css
.element {
  will-change: transform;
}
```

This tells the browser to keep the element on the GPU throughout the animation.

### Take Breaks

Don't code and ship animations in one sitting. Step away, return with fresh eyes. The best animations are reviewed and refined over days, not hours.

## Button & Click Feedback

### Scale Buttons on Press

Make interfaces feel responsive by adding subtle scale feedback:

```css
button:active {
  transform: scale(0.97);
}
```

This gives instant visual feedback that the interface is listening.

### Don't Animate from scale(0)

Starting from `scale(0)` makes elements appear from nowhere—it feels unnatural.

**Bad:**

```css
.element {
  transform: scale(0);
}
.element.visible {
  transform: scale(1);
}
```

**Good:**

```css
.element {
  transform: scale(0.95);
  opacity: 0;
}
.element.visible {
  transform: scale(1);
  opacity: 1;
}
```

Elements should always have some visible shape, like a deflated balloon.

## Tooltips & Popovers

### Skip Animation on Subsequent Tooltips

First tooltip: delay + animation. Subsequent tooltips (while one is open): instant, no delay.

```css
.tooltip {
  transition:
    transform 125ms ease-out,
    opacity 125ms ease-out;
  transform-origin: var(--transform-origin);
}

.tooltip[data-starting-style],
.tooltip[data-ending-style] {
  opacity: 0;
  transform: scale(0.97);
}

/* Skip animation for subsequent tooltips */
.tooltip[data-instant] {
  transition-duration: 0ms;
}
```

Radix UI and Base UI support this pattern with `data-instant` attribute.

### Make Animations Origin-Aware

Popovers should scale from their trigger, not from center.

```css
/* Default (wrong for most cases) */
.popover {
  transform-origin: center;
}

/* Correct - scale from trigger */
.popover {
  transform-origin: var(--transform-origin);
}
```

**Radix UI:**

```css
.popover {
  transform-origin: var(--radix-dropdown-menu-content-transform-origin);
}
```

**Base UI:**

```css
.popover {
  transform-origin: var(--transform-origin);
}
```

## Speed & Timing

### Keep Animations Fast

A faster-spinning spinner makes apps feel faster even with identical load times. A 180ms select animation feels more responsive than 400ms.

**Rule:** UI animations should stay under 300ms.

### Don't Animate Keyboard Interactions

Arrow key navigation, keyboard shortcuts—these are repeated hundreds of times daily. Animation makes them feel slow and disconnected.

**Never animate:**

- List navigation with arrow keys
- Keyboard shortcut responses
- Tab/focus movements

### Be Careful with Frequently-Used Elements

A hover effect is nice, but if triggered multiple times a day, it may benefit from no animation at all.

**Guideline:** Use your own product daily. You'll discover which animations become annoying through repeated use.

## Hover States

### Fix Hover Flicker

When hover animation changes element position, the cursor may leave the element, causing flicker.

**Problem:**

```css
.box:hover {
  transform: translateY(-20%);
}
```

**Solution:** Animate a child element instead:

```html
<div class="box">
  <div class="box-inner"></div>
</div>
```

```css
.box:hover .box-inner {
  transform: translateY(-20%);
}

.box-inner {
  transition: transform 200ms ease;
}
```

The parent's hover area stays stable while the child moves.

### Disable Hover on Touch Devices

Touch devices don't have true hover. Accidental finger movement triggers unwanted hover states.

```css
@media (hover: hover) and (pointer: fine) {
  .card:hover {
    transform: scale(1.05);
  }
}
```

**Note:** Tailwind v4's `hover:` class automatically applies only when the device supports hover.

## Touch & Accessibility

### Ensure Appropriate Target Areas

Small buttons are hard to tap. Use a pseudo-element to create larger hit areas without changing layout.

**Minimum target:** 44px (Apple and WCAG recommendation)

```css
@utility touch-hitbox {
  position: relative;
}

@utility touch-hitbox::before {
  content: '';
  position: absolute;
  display: block;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  min-height: 44px;
  min-width: 44px;
  z-index: 9999;
}
```

Usage:

```jsx
<button className="touch-hitbox">
  <BellIcon />
</button>
```

## Easing Selection

### Use ease-out for Enter/Exit

Elements entering or exiting should use `ease-out`. The fast start creates responsiveness.

```css
.dropdown {
  transition:
    transform 200ms ease-out,
    opacity 200ms ease-out;
}
```

`ease-in` starts slow—wrong for UI. Same duration feels slower because the movement is back-loaded.

### Use ease-in-out for On-Screen Movement

Elements already visible that need to move should use `ease-in-out`. Mimics natural acceleration/deceleration like a car.

```css
.slider-handle {
  transition: transform 250ms ease-in-out;
}
```

### Use Custom Easing Curves

Built-in CSS curves are usually too weak. Custom curves create more intentional motion.

**Resources:**

- Course reference: `/learn/easing-curves`
- External: [easings.co](https://easings.co/)

## Visual Tricks

### Use Blur as a Fallback

When easing and timing adjustments don't solve the problem, add subtle blur to mask imperfections.

```css
.button-transition {
  transition:
    transform 150ms ease-out,
    filter 150ms ease-out;
}

.button-transition:active {
  transform: scale(0.97);
  filter: blur(2px);
}
```

Blur bridges visual gaps between states, tricking the eye into seeing smoother transitions. The two states blend instead of appearing as distinct objects.

**Performance note:** Keep blur under 20px, especially on Safari.

## Why Details Matter

> "All those unseen details combine to produce something that's just stunning, like a thousand barely audible voices all singing in tune."
> — Paul Graham, Hackers and Painters

Details that go unnoticed are good—users complete tasks without friction. Great interfaces enable users to achieve goals with ease, not to admire animations.

# Typography That Feels Authored

Make type decisions that would survive review by a designer who cares. No default-font autopilot.

## Core Principle

Typography is the primary vehicle for personality in most interfaces. Get it wrong and nothing else matters. Get it right and you can be minimal everywhere else.

**The Test**: Would a thoughtful designer look at this and know _someone made a choice_? Or does it look like the framework defaults?

---

## Quick Reference: The Decisions You Must Make

| Decision        | Never                              | Always                                                         |
| --------------- | ---------------------------------- | -------------------------------------------------------------- |
| Font selection  | System fonts as aesthetic choice   | Fonts chosen for the specific context                          |
| Scale           | Arbitrary sizes (14px, 16px, 18px) | Intentional ratio (1.25, 1.333, 1.5)                           |
| Line height     | CSS defaults                       | Tuned per use case (tighter for headings, looser for body)     |
| Measure         | Full viewport width                | 45-75 characters max for reading                               |
| Weight contrast | Medium vs Regular                  | Bold vs Light, or single weight with size contrast             |
| Pairing         | Two similar fonts                  | Contrast (serif + sans, geometric + humanist) or single family |

---

## Part 1 — Font Selection (The Biggest Decision)

### Never Default To

These signal "I didn't think about it":

- Inter, Roboto, Open Sans (the new Arial)
- System font stacks as a stylistic choice (fine for performance, not for character)
- Whatever the framework ships with

### Selection Framework

**1. What's the voice?**

- Authoritative/institutional → Transitional serifs, sturdy sans (Freight, Söhne, Graphik)
- Warm/approachable → Humanist sans, rounded forms (GT Walsheim, Nunito, Source Sans)
- Technical/precise → Geometric sans, monospace (JetBrains Mono, IBM Plex, Geist)
- Editorial/literary → Serifs with character (Lora, Spectral, Newsreader)
- Playful/bold → Display faces, unusual proportions (Bricolage Grotesque, Fraunces, Archivo Black)

**2. Does it have the weights you need?**
Minimum: Regular + Bold. Ideal: Light + Regular + Medium + Bold.

**3. Does it render well at your sizes?**
Test at actual sizes. Some fonts fall apart below 14px or above 48px.

### Good Libre Fonts (Actually Good, Not Just Free)

**Sans Serif**

- Geist (Vercel) — clean, technical, excellent for UI
- Bricolage Grotesque — quirky, memorable, great for headings
- Instrument Sans — balanced, professional
- Satoshi — geometric but warm
- General Sans — versatile workhorse
- Plus Jakarta Sans — friendly, modern
- Outfit — geometric with personality

**Serif**

- Fraunces — variable, tons of personality, optical sizing
- Lora — elegant, great for body text
- Spectral — designed for screens, excellent readability
- Newsreader — optimized for long-form reading
- Libre Baskerville — classic book face

**Monospace**

- JetBrains Mono — ligatures, designed for code
- Geist Mono — pairs with Geist Sans
- IBM Plex Mono — professional, excellent at small sizes
- Fira Code — ligatures, wide language support

**Display / Accent**

- Playfair Display — high contrast, editorial
- Archivo Black — heavy, impactful
- DM Serif Display — elegant headlines
- Bebas Neue — all-caps impact

### Where to Get Fonts

- **Google Fonts**: https://fonts.google.com — massive selection, variable fonts available
- **Fontsource**: https://fontsource.org — self-hosted Google Fonts for npm/bundlers
- **Bunny Fonts**: https://fonts.bunny.net — GDPR-friendly Google Fonts CDN
- **Font Squirrel**: https://www.fontsquirrel.com — curated libre fonts

---

## Part 2 — Type Scale (Stop Guessing Sizes)

### Use a Ratio, Not Random Numbers

Pick a ratio and generate your scale:

| Ratio | Name           | Feel                                    |
| ----- | -------------- | --------------------------------------- |
| 1.125 | Major Second   | Subtle, dense interfaces                |
| 1.200 | Minor Third    | Comfortable, general purpose            |
| 1.250 | Major Third    | Clear hierarchy, default recommendation |
| 1.333 | Perfect Fourth | Strong hierarchy, editorial             |
| 1.500 | Perfect Fifth  | Dramatic, display-heavy                 |
| 1.618 | Golden Ratio   | Maximum drama, use sparingly            |

### Implementation (CSS Custom Properties)

```css
:root {
  --font-size-base: 1rem; /* 16px */
  --scale-ratio: 1.25; /* Major Third */

  /* Scale down */
  --font-size-xs: calc(var(--font-size-base) / var(--scale-ratio) / var(--scale-ratio)); /* ~10px */
  --font-size-sm: calc(var(--font-size-base) / var(--scale-ratio)); /* ~13px */

  /* Scale up */
  --font-size-md: var(--font-size-base); /* 16px */
  --font-size-lg: calc(var(--font-size-base) * var(--scale-ratio)); /* 20px */
  --font-size-xl: calc(var(--font-size-base) * var(--scale-ratio) * var(--scale-ratio)); /* 25px */
  --font-size-2xl: calc(
    var(--font-size-base) * var(--scale-ratio) * var(--scale-ratio) * var(--scale-ratio)
  ); /* 31px */
  --font-size-3xl: calc(
    var(--font-size-base) * var(--scale-ratio) * var(--scale-ratio) * var(--scale-ratio) *
      var(--scale-ratio)
  ); /* 39px */
}
```

Or use `clamp()` for fluid scaling:

```css
:root {
  --font-size-hero: clamp(2.5rem, 5vw + 1rem, 5rem);
  --font-size-h1: clamp(2rem, 4vw + 0.5rem, 3.5rem);
  --font-size-h2: clamp(1.5rem, 2vw + 0.5rem, 2.25rem);
}
```

---

## Part 3 — Line Height & Spacing

### Line Height Rules

**Headings**: Tighter (1.0–1.2)

```css
.heading {
  line-height: 1.1;
}
```

**Body text**: Looser (1.5–1.7)

```css
.body {
  line-height: 1.6;
}
```

**UI elements**: Compact (1.2–1.4)

```css
.ui-label {
  line-height: 1.25;
}
```

**The Rule**: Larger text = tighter line height. Smaller text = looser.

### Measure (Line Length)

**Ideal**: 45–75 characters for reading comfort.

```css
.prose {
  max-width: 65ch; /* Character unit = width of '0' */
}
```

Never let body text span the full viewport. It destroys readability.

### Paragraph Spacing

Use margin-top, not margin-bottom (avoids spacing on last element):

```css
.prose p + p {
  margin-top: 1.5em; /* Relative to font size */
}
```

---

## Part 4 — Font Pairing

### The Only Rules That Matter

1. **Contrast or match, never sort-of-similar**
   - ✅ Serif + Sans (clear contrast)
   - ✅ Same family, different weights (cohesive)
   - ❌ Two similar sans serifs (why bother?)

2. **One display, one workhorse**
   - Display face for headings (can be weird)
   - Workhorse for body (must be readable)

3. **Match x-height when pairing**
   Fonts with similar x-heights feel harmonious even when different.

### Proven Pairings

| Display             | Body              | Vibe                      |
| ------------------- | ----------------- | ------------------------- |
| Fraunces            | Outfit            | Editorial + Modern        |
| Playfair Display    | Source Sans 3     | Classic editorial         |
| Bricolage Grotesque | Instrument Sans   | Quirky tech               |
| DM Serif Display    | DM Sans           | Elegant, cohesive         |
| Bebas Neue          | Plus Jakarta Sans | Bold + Friendly           |
| Geist               | Geist             | Technical (single family) |
| Space Grotesk       | Space Mono        | Techy, monospace accent   |

### Single Family Strategy

Skip pairing entirely. Use one family with:

- Weight contrast (Light headlines, Regular body, or Bold headlines, Light body)
- Size contrast (dramatically different scales)
- Case contrast (ALL CAPS headings, sentence case body)

This is often cleaner than forced pairing.

---

## Part 5 — CSS Implementation

### Font Loading (Performance Matters)

```css
@font-face {
  font-family: 'Your Font';
  src: url('/fonts/your-font.woff2') format('woff2');
  font-display: swap; /* Show fallback immediately, swap when loaded */
  font-weight: 400;
  font-style: normal;
}
```

**Variable fonts** (one file, all weights):

```css
@font-face {
  font-family: 'Your Variable Font';
  src: url('/fonts/font-variable.woff2') format('woff2-variations');
  font-weight: 100 900; /* Range of available weights */
  font-display: swap;
}
```

### Fallback Stacks

Always include fallbacks that match the character:

```css
/* Geometric sans */
font-family: 'Geist', 'Helvetica Neue', Arial, sans-serif;

/* Humanist sans */
font-family: 'Plus Jakarta Sans', 'Segoe UI', Roboto, sans-serif;

/* Serif */
font-family: 'Fraunces', Georgia, 'Times New Roman', serif;

/* Monospace */
font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### OpenType Features

Unlock the full font:

```css
.heading {
  font-feature-settings:
    'kern' 1,
    /* Kerning */ 'liga' 1,
    /* Standard ligatures */ 'calt' 1; /* Contextual alternates */
}

.numbers {
  font-feature-settings:
    'tnum' 1,
    /* Tabular (monospaced) numbers */ 'lnum' 1; /* Lining (uppercase-height) numbers */
}

.oldstyle-numbers {
  font-feature-settings: 'onum' 1; /* Old-style (text) figures */
}

.small-caps {
  font-feature-settings: 'smcp' 1;
  /* Or use font-variant: small-caps; */
}
```

---

## Part 6 — Common Mistakes

### The "Just Make It Bigger" Problem

Bad hierarchy:

```
16px → 18px → 20px → 24px
```

Good hierarchy:

```
16px → 20px → 31px → 49px  (1.25 ratio)
```

**The fix**: Skip steps. Real hierarchy needs contrast.

### The "Everything Bold" Problem

When everything is bold, nothing is bold. Use bold sparingly:

- Headings OR key phrases, not both
- Navigation labels OR content titles, not both

### The "Decorative Display Face for Body Text" Problem

Display faces are for display. They're often:

- Poorly spaced for continuous reading
- Missing optical sizing for small text
- Fatiguing over paragraphs

Keep display faces above 24px. Use a workhorse below.

### The "Default Letter Spacing" Problem

Most fonts need adjustment at extremes:

```css
/* Large sizes: tighten */
.hero-text {
  font-size: 4rem;
  letter-spacing: -0.02em;
}

/* Small caps / all caps: loosen */
.label {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Small sizes: loosen slightly */
.caption {
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}
```

---

## Checklist: Is Your Typography Intentional?

- [ ] Font was chosen for this context, not defaulted
- [ ] Scale follows a ratio, not arbitrary numbers
- [ ] Line height is tuned (tight for headings, loose for body)
- [ ] Measure is controlled (max 75ch for reading)
- [ ] Weight contrast is dramatic (not Regular vs Medium)
- [ ] If pairing fonts, they contrast clearly
- [ ] Fallback stack matches the character of primary font
- [ ] Letter spacing adjusted for caps and display sizes
- [ ] Variable font or subset used for performance
- [ ] It looks _designed_, not defaulted


# Appendix - The Ousterhout Standards

_"The most fundamental problem in computer science is problem decomposition: how to take a complex problem and divide it up into pieces that can be solved independently."_ 
- John Ousterhout, _A Philosophy of Software Design_

These five principles form the foundation of maintainable software architecture. They directly attack **coupling** and **cognitive load**—the two forces that kill velocity in large codebases.

| #   | Principle              | One-Line Test                                                |
| --- | ---------------------- | ------------------------------------------------------------ |
| 1   | **Deep Modules**       | Does one call provide high leverage?                         |
| 2   | **Information Hiding** | Can I swap the implementation without changing callers?      |
| 3   | **General Interfaces** | Could this signature exist in an open-source library?        |
| 4   | **Complexity Down**    | Does the caller need to understand internal orchestration?   |
| 5   | **Errors Out**         | Am I throwing for a case that could be a valid return value? |