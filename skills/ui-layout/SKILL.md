---
name: ui-layout
description: BEM-first layout systems, responsive composition, and maintainable CSS architecture for frontend UI.
---


# Frontend That Survives Production

## Canonical BEM + Intentional Aesthetics

Generate frontend code that is **searchable** (grep one class, find the whole surface), **readable** (diffs explain themselves), **composable** (reuse through named components), and **designed on purpose** (strong aesthetic direction, not default SaaS template #84).

Your training data is saturated with Tailwind utility soup, Inter-on-white-with-purple-gradients, and generic card layouts. Your default instinct will be to reproduce them. Actively resist this. Treat every output as portfolio work.

---

## Step 1 — Aesthetic Direction (Do This FIRST, Before Any Code)

Before writing a single line of CSS or markup, complete this step. Do not skip to implementation.

### 1A. Context (infer if the user didn't specify; 4 lines max)

- **Purpose**: what job does this UI do?
- **Audience**: who uses it, and what do they care about?
- **Environment**: app shell / landing page / in-game UI / admin tool / artifact
- **Constraints**: framework, a11y level, performance, theming

### 1B. Commit to ONE bold aesthetic direction

Pick a clear style lane and execute it with conviction:

> brutally minimal · editorial · brutalist · retro-futuristic · toy-like · industrial · luxe · organic · art deco · vapor · terminal · diagrammatic · collage · newspaper · etc.

Then declare these four stances (write them out explicitly):

| Stance | What to declare |
|--------|----------------|
| **Hook** | The one memorable visual idea. *Example: "oversized monospace type on a dense 8-column grid with surgical negative space."* |
| **Typography** | A display face + body face (or one family with strong hierarchy) + the type scale ratio. Pick faces with character — not Inter, Roboto, Arial, system-ui, Space Grotesk, or any font you've used more than twice recently. Source from Google Fonts or a CDN. Declare the scale: e.g. "1.333 ratio → 14 / 18 / 24 / 32 / 43." |
| **Color** | Dominant surface + primary accent + danger/alert tone + text hierarchy (primary, secondary, muted). Commit to light OR dark as the default; specify theme tokens if both are needed. |
| **Motion** | One signature moment (page load stagger, panel reveal, hover microinteraction) executed well. State the easing and duration. |

### 1C. Aesthetic quality checkpoints (the design must pass ALL of these)

1. **Type hierarchy**: at least 3 visually distinct levels (not just size — weight, color, and spacing contribute).
2. **Spatial intention**: the layout has a declared grid or spatial logic, not "flexbox and hope."
3. **Non-default treatment**: at least one visual element that could not have been produced by a CSS framework's defaults — texture, pattern, unusual border treatment, asymmetric layout, grain overlay, distinctive color, etc.
4. **Cohesion**: every visual choice traces back to the declared hook. If a detail doesn't serve the aesthetic thesis, remove it.
5. **Memorable at a glance**: someone seeing a screenshot for 2 seconds could describe what makes it distinctive.

---

## Step 2 — Component Contract (Declare Before You Build)

### 2A. Name every block you will introduce

**Two naming tiers:**

**Tier 1 — Product/feature blocks** (domain-specific). Include the domain noun. No bare ambiguous nouns.

✅ `account-profile`, `checkout-summary`, `party-chat`, `matchmaking-queue`
❌ `profile`, `card`, `menu`, `container`, `wrapper`, `content`

**Tier 2 — Shared UI primitives** (intentionally generic). Use the `ui-` prefix.

✅ `ui-button`, `ui-input`, `ui-card`, `ui-modal`, `ui-badge`, `ui-field`

**Tier 3 — Layout primitives** (compositional). Use the `layout-` prefix. These solve the patterns that utility classes exist to solve, but they're named components with documented behavior:

✅ `layout-stack` (vertical flow with consistent gap), `layout-cluster` (horizontal wrapping group), `layout-sidebar` (content + fixed sidebar), `layout-grid` (named-column grid)

Each layout primitive has ONE job, defined by ONE CSS pattern, and composes by nesting.

```css
/* layout-stack: vertical rhythm via lobotomized owl */
.layout-stack { display: flex; flex-direction: column; }
.layout-stack > * + * { margin-block-start: var(--stack-space, var(--space-4)); }

/* layout-cluster: horizontal wrapping with gap */
.layout-cluster { display: flex; flex-wrap: wrap; gap: var(--cluster-space, var(--space-3)); align-items: center; }
```

### 2B. List modifiers and states

For each block, declare supported modifiers (`--variant`) and states (`is-*`).

**State class mechanics:** `is-*` classes go on the element whose state changed. They are toggled by JS (class toggle) or derived from ARIA attributes. Always pair visual state with ARIA state:

```html
<details class="ui-accordion is-open" open>
<button class="ui-button is-loading" aria-busy="true" disabled>
```

### 2C. The naming tests (all must pass)

1. **Grep test**: search the class name → find ALL its styling and markup. No mystery matches.
2. **Deletion test**: delete all CSS and markup for this block → nothing else breaks.
3. **Prediction test**: a new engineer can guess the next component's name without opening a file.
4. **Read-aloud test**: saying the class name sounds like a real thing, not property-encoded noise.

Pick ONE canonical term and hold it: `modal` not `dialog` not `popup`. `toast` not `notification`. `spinner` not `loader`.

---

## Step 3 — Implementation Rules

### 3A. Selectors — BEM only, kebab-case only

```
Block:    component-name
Element:  component-name__part
Modifier: component-name--variant
State:    is-open, is-loading, is-disabled
```

**Class budget per element (hard cap):**

| Slot | Purpose | Required? |
|------|---------|-----------|
| 1 | Canonical class (what it IS) | Always |
| +1 | Modifier (variant/size/tone) | When needed |
| +1 | State (`is-*`) | When active |

**Max 3 classes. 4 is a smell. 5+ means your component boundary is wrong — refactor.**

**Selector constraints:**

- Max nesting depth: **2** (because each level multiplies override effort; keep the specificity graph flat)
- Max compound selector parts: **3**
- No type-qualified selectors: ❌ `button.ui-button`
- No ID selectors for styling
- No attribute selectors for styling: ❌ `[data-state="open"]`
- No `!important` (except one sanctioned reset file)
- No ambient/location-dependent styling: ❌ `.sidebar .ui-button { ... }`

**The scoping principle:** a component's appearance is determined by its own classes, never by its ancestors. If context changes appearance, use a modifier: `.ui-button--compact`, not `.sidebar .ui-button`.

**Dependency direction:** UI primitives are depended upon. Product blocks depend on them. Never the reverse. Layout primitives are peers of UI primitives.

### 3B. Absolutely forbidden

- Tailwind / Windi / Uno / Tachyons or any atomic/utility CSS framework
- Homegrown utility classes: ❌ `u-mb-6`, `gap-2`, `text-sm`, `flex-row`, `rounded-md`
- CSS-in-JS (styled-components, emotion) unless explicitly approved
- Stacking two identities on one element (prefer wrapping):

```html
<!-- ✅ One identity per element -->
<div class="checkout-summary__actions">
  <button class="ui-button ui-button--tone-primary">Pay</button>
</div>

<!-- ❌ Identity collision -->
<button class="ui-button checkout-summary__pay ui-button--tone-primary">Pay</button>
```

### 3C. Tokens — the canonical set

All visual values come from CSS custom properties. Below is the minimum viable token set. Extend it; don't replace it.

```css
:root {
  /* --- Spacing (non-linear scale, base 4px) --- */
  --space-1: 0.25rem;   /* 4px  */
  --space-2: 0.5rem;    /* 8px  */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.5rem;    /* 24px */
  --space-6: 2rem;      /* 32px */
  --space-7: 3rem;      /* 48px */
  --space-8: 4rem;      /* 64px */
  --space-9: 6rem;      /* 96px */

  /* --- Radius --- */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;

  /* --- Z-index layers (named, never raw integers) --- */
  --z-base: 0;
  --z-raised: 10;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;

  /* --- Duration & easing --- */
  --duration-100: 100ms;
  --duration-150: 150ms;
  --duration-200: 200ms;
  --duration-300: 300ms;
  --duration-500: 500ms;
  --ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* --- Semantic colors (override per theme) --- */
  --color-surface: /* your dominant bg */;
  --color-surface-alt: /* secondary bg */;
  --color-surface-raised: /* card/panel bg */;
  --color-text-primary: /* main text */;
  --color-text-secondary: /* subdued text */;
  --color-text-muted: /* disabled/hint */;
  --color-accent: /* primary action/brand */;
  --color-accent-hover: /* accent interaction */;
  --color-danger: /* destructive/alert */;
  --color-border: /* default borders */;

  /* --- Type scale (declare your ratio, derive sizes) --- */
  --font-display: /* your display face */;
  --font-body: /* your body face */;
  --text-xs: /* smallest */;
  --text-sm: /* secondary */;
  --text-base: /* body */;
  --text-lg: /* subheading */;
  --text-xl: /* heading */;
  --text-2xl: /* display */;
  --text-3xl: /* hero */;
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;
}
```

**If you must use a literal value, annotate why:**

```css
border-width: 1px; /* pixel-aligned with icon grid */
```

**Theming:** if the design supports dark mode, create a theme class or media query that overrides the `--color-*` semantic tokens. Everything else stays the same.

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: #0a0a0b;
    --color-text-primary: #f0f0f0;
    /* ... only color tokens change */
  }
}
```

### 3D. Motion contract

- Animate only: `opacity`, `transform` (translate, scale, rotate). Avoid layout properties.
- Typical UI: 200–300ms. Never > 600ms unless explicitly illustrative.
- Default easing: `var(--ease-out)` for enters, `var(--ease-in-out)` for exits.
- `will-change` only when justified, only for safe properties, and remove after animation completes.
- Respect reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 3E. Accessibility (structural, not a checklist)

Accessibility is a starting constraint, not a post-hoc audit. Build components in this order:

1. Choose the ARIA role / semantic HTML element
2. Add keyboard interaction (focus management, key handlers)
3. Design visible focus states (styled to match the aesthetic, not default neon)
4. Add visual styling on top

Responsive behavior uses intrinsic design: prefer `clamp()`, `min()`, `max()`, container queries, and `auto-fit`/`auto-fill` over media queries. Media queries are for layout-level breakpoints, not component-level adjustments.

### 3F. Modern CSS — use it

- `@layer` for organizing cascade (settings → base → layout → components → overrides)
- Container queries for component-level responsiveness
- `:has()` for parent-aware styling (sparingly, when it eliminates JS)
- Native CSS nesting (within the 2-level depth limit)
- `color-mix()` for derived color variants
- Prefer CSS-native solutions over JS animation libraries

### 3G. Third-party interop

When wrapping components from external libraries (Radix, Headless UI, shadcn, etc.): namespace YOUR classes and let the library own its internal naming. Don't try to BEM-ify their internals.

```html
<div class="filter-panel__dropdown">
  <!-- Radix manages its own classes inside here -->
  <DropdownMenu.Root>...</DropdownMenu.Root>
</div>
```

---

## Step 4 — Output Format

### Complexity tiers

| Request | Expected depth |
|---------|---------------|
| **Simple** (button, card, badge) | ~30–80 lines. Tokens + one block + CSS + markup. |
| **Medium** (form, nav + content, modal) | ~80–250 lines. Tokens + 2–5 blocks + layout primitives + CSS + markup. |
| **Complex** (full page, dashboard, multi-section) | ~250–600+ lines. Full token set + layout system + multiple blocks + interactivity + motion. Build tokens first, then layout primitives, then UI primitives, then product blocks. |

### Produce in this order

1. **Aesthetic direction** (Steps 1B + 1C — the four stances, stated concisely)
2. **Naming contract** (blocks, modifiers, states — table format)
3. **Implementation** (tokens → base/reset → layout primitives → components → markup)
4. **Rationale** (brief: why these tokens, why this modifier set, where to extend)

### Single-file structure (for artifacts and standalone outputs)

```
<style>
  /* 1. Tokens (:root) */
  /* 2. Reset / base styles (leveraging cascade for inherited properties) */
  /* 3. Layout primitives */
  /* 4. UI primitives */
  /* 5. Product/feature blocks */
  /* 6. Motion & reduced-motion */
</style>

<markup>
  <!-- Structured by product blocks, containing UI primitives and layout primitives -->
</markup>
```

Base styles (body font, color, line-height) appropriately use the cascade — they don't need BEM. Everything else does.

---

## Step 5 — Self-Verification (Run Before Delivering)

After implementation, check every item. If any fails, fix it before outputting.

- [ ] Every class in CSS has at least one corresponding element in markup
- [ ] Every class in markup has corresponding CSS (no orphan classes)
- [ ] No raw color, spacing, radius, z-index, duration, or easing values outside `:root` (except annotated literals)
- [ ] No element has more than 3 classes (4 max with justification)
- [ ] No selector exceeds nesting depth 2 or compound parts 3
- [ ] Every `is-*` state class has a paired ARIA attribute or semantic state
- [ ] Type hierarchy has ≥ 3 distinct visual levels
- [ ] Color palette has clear surface/accent/danger structure
- [ ] At least one visual treatment that couldn't come from a CSS framework's defaults
- [ ] Layout works with unknown content lengths (test: what if this text were 3x longer?)
- [ ] Focus states are visible and styled
- [ ] `prefers-reduced-motion` is handled

---

## Complete Worked Example

Request: "Build a notification toast component."

### Aesthetic direction

**Hook:** Diagrammatic — monospace labels, sharp 1px borders, muted surface with high-contrast status stripe.
**Typography:** `DM Mono` (display/labels) + `DM Sans` (body). Scale ratio 1.25 → 13 / 16 / 20.
**Color:** Near-black surface (#0c0c0e), warm gray text (#b0aca6), status stripe per tone (green/amber/red).
**Motion:** Slide in from right + fade, 300ms ease-out. Exit: fade + slide down, 200ms ease-in-out.

### Naming contract

| Block | Modifiers | States |
|-------|-----------|--------|
| `ui-toast` | `--tone-success`, `--tone-warning`, `--tone-danger` | `is-entering`, `is-exiting` |
| `ui-toast__stripe` | — | — |
| `ui-toast__content` | — | — |
| `ui-toast__title` | — | — |
| `ui-toast__message` | — | — |
| `ui-toast__dismiss` | — | — |

### Implementation

```html
<style>
  /* --- Tokens --- */
  :root {
    --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem;
    --space-4: 1rem; --space-5: 1.5rem;
    --radius-md: 0.5rem;
    --z-toast: 500;
    --duration-200: 200ms; --duration-300: 300ms;
    --ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
    --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);

    --color-surface-raised: #18181a;
    --color-text-primary: #e8e4de;
    --color-text-secondary: #b0aca6;
    --color-border: #2a2a2d;
    --color-success: #34d399;
    --color-warning: #fbbf24;
    --color-danger: #f87171;

    --font-display: 'DM Mono', monospace;
    --font-body: 'DM Sans', sans-serif;
    --text-sm: 0.8125rem;
    --text-base: 1rem;
    --text-lg: 1.25rem;
    --leading-tight: 1.2;
    --leading-normal: 1.5;
  }

  /* --- Base --- */
  *, *::before, *::after { box-sizing: border-box; margin: 0; }

  /* --- ui-toast --- */
  .ui-toast {
    position: fixed;
    bottom: var(--space-5);
    right: var(--space-5);
    z-index: var(--z-toast);
    display: grid;
    grid-template-columns: 4px 1fr auto;
    min-width: 320px;
    max-width: 420px;
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    font-family: var(--font-body);
    opacity: 1;
    transform: translateX(0);
    transition:
      opacity var(--duration-300) var(--ease-out),
      transform var(--duration-300) var(--ease-out);
  }

  .ui-toast.is-entering {
    opacity: 0;
    transform: translateX(1rem);
  }

  .ui-toast.is-exiting {
    opacity: 0;
    transform: translateY(0.5rem);
    transition-duration: var(--duration-200);
    transition-timing-function: var(--ease-in-out);
  }

  .ui-toast__stripe {
    background: var(--color-success);
    border-radius: var(--radius-md) 0 0 var(--radius-md);
  }

  .ui-toast--tone-warning .ui-toast__stripe { background: var(--color-warning); }
  .ui-toast--tone-danger .ui-toast__stripe { background: var(--color-danger); }

  .ui-toast__content {
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .ui-toast__title {
    font-family: var(--font-display);
    font-size: var(--text-sm);
    line-height: var(--leading-tight);
    color: var(--color-text-primary);
    letter-spacing: 0.02em; /* monospace tracking adjustment */
    text-transform: uppercase;
  }

  .ui-toast__message {
    font-size: var(--text-sm);
    line-height: var(--leading-normal);
    color: var(--color-text-secondary);
  }

  .ui-toast__dismiss {
    appearance: none;
    background: none;
    border: none;
    color: var(--color-text-secondary);
    padding: var(--space-3);
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: color var(--duration-200) var(--ease-out);
  }

  .ui-toast__dismiss:hover { color: var(--color-text-primary); }

  .ui-toast__dismiss:focus-visible {
    outline: 2px solid var(--color-text-primary);
    outline-offset: -2px;
    border-radius: var(--radius-md);
  }

  @media (prefers-reduced-motion: reduce) {
    .ui-toast,
    .ui-toast.is-entering,
    .ui-toast.is-exiting,
    .ui-toast__dismiss {
      transition-duration: 0.01ms !important;
    }
  }
</style>

<!-- Success toast -->
<div class="ui-toast" role="alert" aria-live="polite">
  <div class="ui-toast__stripe"></div>
  <div class="ui-toast__content">
    <p class="ui-toast__title">Deployed</p>
    <p class="ui-toast__message">Build #4217 is live in production.</p>
  </div>
  <button class="ui-toast__dismiss" aria-label="Dismiss notification">✕</button>
</div>

<!-- Danger toast -->
<div class="ui-toast ui-toast--tone-danger" role="alert" aria-live="assertive">
  <div class="ui-toast__stripe"></div>
  <div class="ui-toast__content">
    <p class="ui-toast__title">Pipeline failed</p>
    <p class="ui-toast__message">Integration tests timed out after 120s.</p>
  </div>
  <button class="ui-toast__dismiss" aria-label="Dismiss notification">✕</button>
</div>
```

### Rationale

- Grid with a fixed 4px stripe column gives the status indicator presence without eating into content space.
- Monospace uppercase titles at `--text-sm` create the "diagrammatic" feel declared in the hook.
- Semantic color tokens (`--color-success/warning/danger`) mean theming only requires overriding `:root`.
- Enter/exit use different easings (out for enter, in-out for exit) for physical feel.
- To extend: add `--tone-info` modifier with a new color token. Add `ui-toast__action` element for inline CTAs. The contract doesn't break.