# Shadow Stacking — Full Elevation Scale

**The mandate:** Production surfaces never invent raw `box-shadow` values. They compose a shared BEM surface primitive and select an elevation modifier.

This system has two different visual strategies:

| Mode           | Strategy                                      | Purpose                               |
| -------------- | --------------------------------------------- | ------------------------------------- |
| **Light mode** | Ambient 1px ring + stacked diffusion shadows  | Ground the object on a light surface  |
| **Dark mode**  | Inset light illusion + dark grounding shadows | Paint light onto raised dark surfaces |

The old `sm / md / lg` scale does **not** fit this system. The production scale is:

```txt
ui-surface--elevation-0
ui-surface--elevation-1
ui-surface--elevation-2
ui-surface--elevation-3
ui-surface--elevation-4
ui-surface--elevation-5
ui-surface--elevation-6
```

Dark mode also has one extra non-lift state:

```txt
ui-surface--sunken
```

That maps to the required `dm-elevation-1` style: inset border only.

---

## Step 1 — The Model

A surface’s shadow is not a decoration. It communicates where the object sits in the interface.

Light and dark mode do not use the same illusion.

### Light mode

Light mode uses a base ambient ring plus progressively larger diffusion layers:

```css
0px 0px 0px 1px var(--shadow-color)
0px 1px 1px -0.5px var(--shadow-color)
0px 3px 3px -1.5px var(--shadow-color)
0px 6px 6px -3px var(--shadow-color)
0px 12px 12px -6px var(--shadow-color)
0px 24px 24px -12px var(--shadow-color)
0px 48px 48px -24px var(--shadow-color)
```

The sequence is deliberate:

```txt
1 → 3 → 6 → 12 → 24 → 48
```

Spread is always:

```txt
-(blur / 2)
```

That keeps each layer tight instead of letting the shadow bloom into a muddy halo.

### Dark mode

Dark mode uses an inset light illusion:

```css
inset 0 1px 0 0 rgba(255,255,255,...)
inset 0 0 0 1px rgba(255,255,255,...)
```

The first inset is the top-edge catch-light.
The second inset is the perimeter material ring.

As elevation increases, the surface appears to lift toward the light source, so the inset highlight gets stronger.

Dark mode still needs grounding, so raised surfaces also get a dark drop stack:

```css
0 1px 1px -0.5px rgba(0,0,0,0.18)
0 3px 3px -1.5px rgba(0,0,0,0.18)
0 6px 6px -3px rgba(0,0,0,0.18)
0 12px 12px -6px rgba(0,0,0,0.18)
0 24px 24px -12px rgba(0,0,0,0.18)
0 48px 48px -24px rgba(0,0,0,0.18)
```

Dark mode does **not** mean “use the light shadow with more opacity.”
It means “paint light onto the material, then ground it with darkness.”

---

## Step 2 — Production Naming

The demo may label raw visual styles as:

```txt
elevation-0 … elevation-6
dm-elevation-0 … dm-elevation-7
```

But production components use BEM modifiers on the shared surface block:

| Production class           | Light token         | Dark token         | Meaning               |
| -------------------------- | ------------------- | ------------------ | --------------------- |
| `.ui-surface--elevation-0` | `light-elevation-0` | `dark-elevation-0` | Flat                  |
| `.ui-surface--sunken`      | light fallback      | `dark-elevation-1` | Sunken / inset panel  |
| `.ui-surface--elevation-1` | `light-elevation-1` | `dark-elevation-2` | Subtle lift           |
| `.ui-surface--elevation-2` | `light-elevation-2` | `dark-elevation-3` | Card / surface        |
| `.ui-surface--elevation-3` | `light-elevation-3` | `dark-elevation-4` | Popover / dropdown    |
| `.ui-surface--elevation-4` | `light-elevation-4` | `dark-elevation-5` | Sticky / floating bar |
| `.ui-surface--elevation-5` | `light-elevation-5` | `dark-elevation-6` | Modal / dialog        |
| `.ui-surface--elevation-6` | `light-elevation-6` | `dark-elevation-7` | Full overlay          |

Do not ship product components with classes like `.dm-elevation-4` or `.elevation-3`. Those are demo labels, not component API.

---

## Step 3 — Tokens

Shadow colors are separate from shadow structure.

```css
:root {
  /* ─────────────────────────────
     Color tokens
     ───────────────────────────── */

  /* Light mode */
  --shadow-color: rgb(0 0 0 / 0.06);

  /* Dark mode inset highlights */
  --dm-hi-base: rgba(255,255,255,0.02);
  --dm-hi-mid: rgba(255,255,255,0.05);
  --dm-hi-high: rgba(255,255,255,0.08);
  --dm-hi-peak: rgba(255,255,255,0.11);

  /* Dark mode inset perimeter rings */
  --dm-ring-base: rgba(255,255,255,0.02);
  --dm-ring-mid: rgba(255,255,255,0.04);
  --dm-ring-high: rgba(255,255,255,0.06);

  /* Dark mode drop shadows */
  --dm-drop: rgba(0,0,0,0.18);

  /* Dark mode dark ambient outlines */
  --dm-outline-3: rgba(0,0,0,0.12);
  --dm-outline-4: rgba(0,0,0,0.14);
  --dm-outline-5: rgba(0,0,0,0.16);
  --dm-outline-6: rgba(0,0,0,0.18);
  --dm-outline-7: rgba(0,0,0,0.20);


  /* ─────────────────────────────
     Light structure tokens
     ───────────────────────────── */

  --shadow-light-elevation-0:
    0px 0px 0px 1px var(--shadow-color);

  --shadow-light-elevation-1:
    0px 0px 0px 1px var(--shadow-color),
    0px 1px 1px -0.5px var(--shadow-color);

  --shadow-light-elevation-2:
    0px 0px 0px 1px var(--shadow-color),
    0px 1px 1px -0.5px var(--shadow-color),
    0px 3px 3px -1.5px var(--shadow-color);

  --shadow-light-elevation-3:
    0px 0px 0px 1px var(--shadow-color),
    0px 1px 1px -0.5px var(--shadow-color),
    0px 3px 3px -1.5px var(--shadow-color),
    0px 6px 6px -3px var(--shadow-color);

  --shadow-light-elevation-4:
    0px 0px 0px 1px var(--shadow-color),
    0px 1px 1px -0.5px var(--shadow-color),
    0px 3px 3px -1.5px var(--shadow-color),
    0px 6px 6px -3px var(--shadow-color),
    0px 12px 12px -6px var(--shadow-color);

  --shadow-light-elevation-5:
    0px 0px 0px 1px var(--shadow-color),
    0px 1px 1px -0.5px var(--shadow-color),
    0px 3px 3px -1.5px var(--shadow-color),
    0px 6px 6px -3px var(--shadow-color),
    0px 12px 12px -6px var(--shadow-color),
    0px 24px 24px -12px var(--shadow-color);

  --shadow-light-elevation-6:
    0px 0px 0px 1px var(--shadow-color),
    0px 1px 1px -0.5px var(--shadow-color),
    0px 3px 3px -1.5px var(--shadow-color),
    0px 6px 6px -3px var(--shadow-color),
    0px 12px 12px -6px var(--shadow-color),
    0px 24px 24px -12px var(--shadow-color),
    0px 48px 48px -24px var(--shadow-color);


  /* ─────────────────────────────
     Dark structure tokens
     ───────────────────────────── */

  --shadow-dark-elevation-0:
    none;

  --shadow-dark-elevation-1:
    inset 0 0 0 1px var(--dm-ring-base);

  --shadow-dark-elevation-2:
    inset 0 1px 0 0 var(--dm-hi-base),
    inset 0 0 0 1px var(--dm-ring-base),
    0 1px 1px -0.5px var(--dm-drop);

  --shadow-dark-elevation-3:
    inset 0 1px 0 0 var(--dm-hi-mid),
    inset 0 0 0 1px var(--dm-ring-base),
    0 0 0 1px var(--dm-outline-3),
    0 1px 1px -0.5px var(--dm-drop),
    0 3px 3px -1.5px var(--dm-drop);

  --shadow-dark-elevation-4:
    inset 0 1px 0 0 var(--dm-hi-mid),
    inset 0 0 0 1px var(--dm-ring-mid),
    0 0 0 1px var(--dm-outline-4),
    0 1px 1px -0.5px var(--dm-drop),
    0 3px 3px -1.5px var(--dm-drop),
    0 6px 6px -3px var(--dm-drop);

  --shadow-dark-elevation-5:
    inset 0 1px 0 0 var(--dm-hi-high),
    inset 0 0 0 1px var(--dm-ring-mid),
    0 0 0 1px var(--dm-outline-5),
    0 1px 1px -0.5px var(--dm-drop),
    0 3px 3px -1.5px var(--dm-drop),
    0 6px 6px -3px var(--dm-drop),
    0 12px 12px -6px var(--dm-drop);

  --shadow-dark-elevation-6:
    inset 0 1px 0 0 var(--dm-hi-high),
    inset 0 0 0 1px var(--dm-ring-high),
    0 0 0 1px var(--dm-outline-6),
    0 1px 1px -0.5px var(--dm-drop),
    0 3px 3px -1.5px var(--dm-drop),
    0 6px 6px -3px var(--dm-drop),
    0 12px 12px -6px var(--dm-drop),
    0 24px 24px -12px var(--dm-drop);

  --shadow-dark-elevation-7:
    inset 0 1px 0 0 var(--dm-hi-peak),
    inset 0 0 0 1px var(--dm-ring-high),
    0 0 0 1px var(--dm-outline-7),
    0 1px 1px -0.5px var(--dm-drop),
    0 3px 3px -1.5px var(--dm-drop),
    0 6px 6px -3px var(--dm-drop),
    0 12px 12px -6px var(--dm-drop),
    0 24px 24px -12px var(--dm-drop),
    0 48px 48px -24px var(--dm-drop);


  /* ─────────────────────────────
     Production aliases
     Default: light mode
     ───────────────────────────── */

  --shadow-sunken: var(--shadow-light-elevation-0);

  --shadow-elevation-0: var(--shadow-light-elevation-0);
  --shadow-elevation-1: var(--shadow-light-elevation-1);
  --shadow-elevation-2: var(--shadow-light-elevation-2);
  --shadow-elevation-3: var(--shadow-light-elevation-3);
  --shadow-elevation-4: var(--shadow-light-elevation-4);
  --shadow-elevation-5: var(--shadow-light-elevation-5);
  --shadow-elevation-6: var(--shadow-light-elevation-6);
}

@media (prefers-color-scheme: dark) {
  :root {
    --shadow-sunken: var(--shadow-dark-elevation-1);

    --shadow-elevation-0: var(--shadow-dark-elevation-0);
    --shadow-elevation-1: var(--shadow-dark-elevation-2);
    --shadow-elevation-2: var(--shadow-dark-elevation-3);
    --shadow-elevation-3: var(--shadow-dark-elevation-4);
    --shadow-elevation-4: var(--shadow-dark-elevation-5);
    --shadow-elevation-5: var(--shadow-dark-elevation-6);
    --shadow-elevation-6: var(--shadow-dark-elevation-7);
  }
}

[data-theme='light'] {
  --shadow-sunken: var(--shadow-light-elevation-0);

  --shadow-elevation-0: var(--shadow-light-elevation-0);
  --shadow-elevation-1: var(--shadow-light-elevation-1);
  --shadow-elevation-2: var(--shadow-light-elevation-2);
  --shadow-elevation-3: var(--shadow-light-elevation-3);
  --shadow-elevation-4: var(--shadow-light-elevation-4);
  --shadow-elevation-5: var(--shadow-light-elevation-5);
  --shadow-elevation-6: var(--shadow-light-elevation-6);
}

[data-theme='dark'] {
  --shadow-sunken: var(--shadow-dark-elevation-1);

  --shadow-elevation-0: var(--shadow-dark-elevation-0);
  --shadow-elevation-1: var(--shadow-dark-elevation-2);
  --shadow-elevation-2: var(--shadow-dark-elevation-3);
  --shadow-elevation-3: var(--shadow-dark-elevation-4);
  --shadow-elevation-4: var(--shadow-dark-elevation-5);
  --shadow-elevation-5: var(--shadow-dark-elevation-6);
  --shadow-elevation-6: var(--shadow-dark-elevation-7);
}
```

---

## Step 4 — The BEM Surface Primitive

Every elevated object composes `.ui-surface`.

```css
.ui-surface {
  --ui-surface-shadow: var(--shadow-elevation-2);

  position: relative;
  background: var(--color-surface-raised);
  border-radius: var(--radius-lg);
  box-shadow: var(--ui-surface-shadow);
}

.ui-surface--sunken {
  --ui-surface-shadow: var(--shadow-sunken);
}

.ui-surface--elevation-0 {
  --ui-surface-shadow: var(--shadow-elevation-0);
}

.ui-surface--elevation-1 {
  --ui-surface-shadow: var(--shadow-elevation-1);
}

.ui-surface--elevation-2 {
  --ui-surface-shadow: var(--shadow-elevation-2);
}

.ui-surface--elevation-3 {
  --ui-surface-shadow: var(--shadow-elevation-3);
}

.ui-surface--elevation-4 {
  --ui-surface-shadow: var(--shadow-elevation-4);
}

.ui-surface--elevation-5 {
  --ui-surface-shadow: var(--shadow-elevation-5);
}

.ui-surface--elevation-6 {
  --ui-surface-shadow: var(--shadow-elevation-6);
}
```

Nothing outside the token layer writes raw `box-shadow`.

Product blocks compose the primitive:

```html
<section class="checkout-summary checkout-summary--floating ui-surface ui-surface--elevation-4">
  <!-- checkout content -->
</section>
```

The product block may control layout, spacing, copy, and child elements. It does not redefine elevation.

---

## Step 5 — Focus Rings Stay Separate

Focus rings are not elevation. They must not be appended to the surface’s `box-shadow`.

Use `::before` for the focus ring.

```css
.ui-surface::before {
  content: '';
  position: absolute;
  inset: -4px;
  pointer-events: none;
  border-radius: calc(var(--radius-lg) + 3px);
  border: 1px solid var(--color-accent);
  box-shadow: 0 0 0 2px color-mix(
    in srgb,
    var(--color-accent) 20%,
    transparent
  );
  opacity: 0;
  transition: opacity var(--duration-150) var(--ease-out);
}

.ui-surface:focus-within::before,
.ui-surface:focus-visible::before {
  opacity: 1;
}
```

The required elevation styles already contain both inset and outer shadow layers. Do **not** move the inset stack to `::after` in this system. Keep the visual elevation stack in the tokenized `box-shadow`; keep focus on `::before`.

---

## Step 6 — Worked Example: Input Field

```html
<div class="ui-field">
  <label class="ui-field__label" for="email">Email</label>

  <div class="ui-field__control ui-surface ui-surface--elevation-1">
    <input class="ui-field__input" id="email" type="email" />
  </div>
</div>
```

```css
.ui-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ui-field__label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.ui-field__control {
  background: var(--color-surface-raised);
}

/* No shadow rules here. .ui-surface owns elevation. */

.ui-field__input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  outline: none;
  font: inherit;
  color: var(--color-text-primary);
}
```

The field control is a BEM element and a surface primitive.
The input itself has no border, no outline, and no shadow.
Focus on the inner input triggers the parent surface ring through `:focus-within`.

---

## Step 7 — Demo Gallery Naming

For a demo page, keep the gallery itself BEM-shaped.

```html
<section class="elevation-demo elevation-demo--dark">
  <h2 class="elevation-demo__title">Dark Mode — Inset Light Illusion</h2>
  <p class="elevation-demo__description">
    Simulates elevation by painting light on raised surfaces.
  </p>

  <div class="elevation-demo__group">
    <div class="elevation-demo__card ui-surface ui-surface--elevation-3"></div>

    <div class="elevation-demo__label">
      <span class="elevation-demo__tag">ui-surface--elevation-3</span>
      <span class="elevation-demo__tag elevation-demo__tag--description">
        Popover / dropdown
      </span>
    </div>
  </div>
</section>
```

Use demo labels to explain the internal token if needed:

```txt
dark internal: shadow-dark-elevation-4
production: ui-surface--elevation-3
```

But do not use `.dm-elevation-4` as production API.

---

## Step 8 — Forbidden Patterns

* **Single-shadow elevation**
  ❌ `box-shadow: 0 4px 6px rgba(0,0,0,0.1);`

* **Old `sm / md / lg` elevation API**
  ❌ `.ui-surface--sm`
  ❌ `.ui-surface--md`
  ❌ `.ui-surface--lg`

* **Raw shadow values in component CSS**
  ❌ `.checkout-summary { box-shadow: ... }`

* **Using demo classes in production**
  ❌ `.dm-elevation-5`
  ❌ `.elevation-3`

* **Color baked directly into production structure tokens**
  ❌ `--shadow-elevation-2: 0 1px 1px rgba(0,0,0,0.06);`

* **Dark mode using only black shadows**
  ❌ No inset highlight
  ❌ No top-edge catch-light

* **Focus ring appended to the elevation stack**
  ❌ `.ui-surface:focus { box-shadow: var(--shadow-elevation-3), 0 0 0 2px blue; }`

* **Invented blur sequences**
  ❌ `2 / 4 / 8 / 16`
  The required sequence is `1 / 3 / 6 / 12 / 24 / 48`.

* **Incorrect spread math**
  ❌ `0 12px 12px -2px`
  Required spread is `-(blur / 2)`, so `12px` blur uses `-6px` spread.

* **`filter: drop-shadow` for UI surfaces**
  ❌ It is the wrong primitive for this system.

---

## Self-Check

Before shipping a component that needs elevation:

* [ ] Component composes `.ui-surface`
* [ ] Component uses `.ui-surface--elevation-{0-6}` or `.ui-surface--sunken`
* [ ] Product block does not write raw `box-shadow`
* [ ] Light mode uses ambient ring + diffusion stack
* [ ] Dark mode uses inset top highlight + inset perimeter ring
* [ ] Dark mode grounding uses the required black drop stack
* [ ] Blur sequence is `1 → 3 → 6 → 12 → 24 → 48`
* [ ] Spread equals `-(blur / 2)`
* [ ] Focus ring lives on `::before`
* [ ] Focus ring does not mutate the elevation stack
* [ ] No `.dm-elevation-*` or `.elevation-*` classes appear in production components
* [ ] Shadow colors are tokenized separately from shadow structure

---

## Rationale

Light mode sells elevation through shadow diffusion.

Dark mode sells elevation by painting light onto the object itself, then grounding it with dark diffusion. The stronger the lift, the stronger the inset top-edge highlight and perimeter ring.

The production API stays simple:

```html
<div class="ui-surface ui-surface--elevation-2"></div>
```

The implementation stays precise:

```css
box-shadow: var(--shadow-elevation-2);
```

And product components stay clean: they compose the surface primitive instead of becoming shadow authors.
