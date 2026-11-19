# The markup and CSS contract, applied

One component built to [the contract](html-css.md), start to finish.

Request: "Build a notification toast component."

### Aesthetic direction

**Hook:** Diagrammatic — monospace labels, sharp 1px borders, muted surface with a high-contrast status mark.
**Typography:** `DM Mono` (display/labels) + `DM Sans` (body). Scale ratio 1.25 → 13 / 16 / 20.
**Color:** Near-black surface (#0c0c0e), warm gray text (#b0aca6), status mark and full border tinted per tone (green/amber/red).
**Motion:** Slide in from right + fade, 300ms ease-out. Exit: fade + slide down, 200ms ease-in-out.

### Naming contract

| Block | Modifiers | States |
|-------|-----------|--------|
| `ui-toast` | `--tone-success`, `--tone-warning`, `--tone-danger` | `is-entering`, `is-exiting` |
| `ui-toast__status` | — | — |
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
    grid-template-columns: auto 1fr auto;
    min-width: 320px;
    max-width: 420px;
    background: var(--color-surface-raised);
    border: 1px solid color-mix(in oklch, var(--color-success) 45%, var(--color-border));
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

  .ui-toast--tone-warning { border-color: color-mix(in oklch, var(--color-warning) 45%, var(--color-border)); }
  .ui-toast--tone-danger { border-color: color-mix(in oklch, var(--color-danger) 45%, var(--color-border)); }

  .ui-toast__status {
    padding: var(--space-3) 0 var(--space-3) var(--space-4);
    font-family: var(--font-display);
    font-size: var(--text-sm);
    line-height: var(--leading-tight);
    color: var(--color-success);
  }

  .ui-toast--tone-warning .ui-toast__status { color: var(--color-warning); }
  .ui-toast--tone-danger .ui-toast__status { color: var(--color-danger); }

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
  <span class="ui-toast__status" aria-hidden="true">✓</span>
  <div class="ui-toast__content">
    <p class="ui-toast__title">Deployed</p>
    <p class="ui-toast__message">Build #4217 is live in production.</p>
  </div>
  <button class="ui-toast__dismiss" aria-label="Dismiss notification">✕</button>
</div>

<!-- Danger toast -->
<div class="ui-toast ui-toast--tone-danger" role="alert" aria-live="assertive">
  <span class="ui-toast__status" aria-hidden="true">!</span>
  <div class="ui-toast__content">
    <p class="ui-toast__title">Pipeline failed</p>
    <p class="ui-toast__message">Integration tests timed out after 120s.</p>
  </div>
  <button class="ui-toast__dismiss" aria-label="Dismiss notification">✕</button>
</div>
```

### Rationale

- Tone is carried twice, by a status mark and by a full border tinted to match, so state reads at a glance and never by color alone. There is no stripe down one side: a one-sided accent on a rounded surface is a mark of a generated interface.
- Monospace uppercase titles at `--text-sm` create the "diagrammatic" feel declared in the hook.
- Semantic color tokens (`--color-success/warning/danger`) mean theming only requires overriding `:root`.
- Enter/exit use different easings (out for enter, in-out for exit) for physical feel.
- To extend: add `--tone-info` modifier with a new color token. Add `ui-toast__action` element for inline CTAs. The contract doesn't break.
