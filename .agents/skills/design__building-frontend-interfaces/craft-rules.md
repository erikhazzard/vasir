# Craft Rules

Use these as opinionated mandates when producing or polishing UI. Be strict. Exceptions must earn their keep visually and functionally.

## Visual voice

The interface should feel calm, expensive, native, and sharp. Favor restraint, hierarchy, rhythm, and tactile feedback over loud decoration. A polished UI usually looks under-designed at first glance and over-designed under inspection.

## Typography

- Cap reading text around 60–75ch. Never let body copy run full-width on wide screens.
- Use `text-wrap: balance` on short headings, CTAs, cards, and hero copy. Override manually when balance creates a weird first or last line.
- Use optical sizing/kerning when the font supports it. Large display text needs tighter tracking; small uppercase labels need looser tracking.
- Do not change font weight on hover, active, or selected states. Use color, underline, background, border, or a pseudo-element.
- Use `font-variant-numeric: tabular-nums` for counters, prices, timers, rankings, dashboards, and anything that changes.
- Use proper characters: `…`, curly quotes/apostrophes in prose, real arrows where appropriate, not three periods and typewriter punctuation.
- Avoid tiny light text. Light weights are elegant at display sizes and fragile at UI sizes.
- Use a fallback font stack chosen for similar x-height and metrics. Font fallback should not wreck the layout.
- Subset fonts. Load only the weights, styles, axes, and character ranges actually used.
- Use `-webkit-font-smoothing: antialiased;` where it improves the rendering; do not rely on it to rescue bad type choices.
- Paragraph spacing should follow the text rhythm, usually around one line-height, not arbitrary scraps of margin.
- UI emphasis is usually bold, color, or structure. Italics are rarely the right hierarchy mechanism in product UI.
- Underlines mean links. Do not use underline for non-link emphasis.

## Color and tokens

- Use semantic tokens: `--color-bg`, `--color-surface`, `--color-border-subtle`, `--color-text-muted`, `--color-danger`, not loose hex soup.
- One-off raw colors belong in token definitions only. If a color appears twice, it wants a name.
- Use perceptual color spaces for serious color work. HSL lightness lies; yellows, blues, and reds do not feel equally bright at the same numeric lightness.
- Build dark mode by flipping semantic variables, not by scattering manual dark overrides across components.
- Desaturate intense brand colors in dark mode. Full-chroma accents vibrate on dark surfaces.
- Use tinted neutrals. Pure neutral grey often looks unfinished.
- Preserve layering in dark mode. The “brightest” dark surface is usually the raised/interactive one, not the page canvas.
- Use alpha or shadow borders for subtle edges on light surfaces. Hard 1px borders often look pasted on.
- In dark mode, avoid glowing white alpha borders. Prefer quiet solid dark tokens unless glow is intentional.
- Disabled states get dedicated muted tokens. Do not rely on blanket opacity.
- Success, warning, danger, info, selected, and brand should not all share the same accent. Users need state meaning at a glance.
- Color never carries state alone. Pair it with copy, iconography, shape, position, or pattern.
- Derive hover/active/selected from a base token, never a second hardcoded hex: background: color-mix(in oklch, var(--color-accent) 88%, black). Hex-to-hex shifts hue.

## Borders, shadows, and surfaces

- Prefer `box-shadow: 0 0 0 1px ...` for soft hairline outlines when it blends better than `border`.
- Use 0.5px hairlines on high-density displays for dividers and fine UI details when the design benefits from it.
- Layer shadows when elevation matters: small contact shadow, wider ambient shadow, subtle outline. One giant blur looks cheap.
- Shadows must agree with the UI’s light direction. Mixed light sources create quiet wrongness.
- Inner radius should usually equal outer radius minus padding. Matching inner/outer radii creates ugly corners.
- Avoid borders on every nested surface. Use spacing, background shift, shadow, and hierarchy before adding more lines.

## Layout and spacing

- Put spacing on parents with `gap`. Avoid child `margin-bottom` stacks that leave trailing ghosts.
- Breakpoints belong where content breaks, not where devices used to be named.
- Simple marketing pages rarely need 12 columns. Use fewer columns unless complexity earns them.
- Use max-widths. Wide monitors should not turn pages into deserts or paragraphs into highways.
- Favor slight asymmetry for marketing and editorial layouts. Perfect symmetry often feels static and template-like.
- Sticky headers must stay proportionate on short viewports; use dynamic viewport units and max-height constraints.
- Fixed mobile CTAs must account for safe areas and never cover the last field, footer action, or validation message.
- Set `scroll-margin-top` on anchor targets when sticky headers exist.
- Use `line-clamp` and min-width discipline inside grids. Text overflow is not a surprise; design it.
- DOM order should match visual order. Do not use CSS ordering to create a different reading path.
- Do not overlay text on busy images unless you own the image, scrim, contrast, crop, and responsive behavior. Beside or below usually wins.

## Z-index and stacking

- Use a tiny named z-index scale: dropdown, sticky, modal, popover, tooltip, toast.
- Prefer local stacking contexts with `isolation: isolate` or positioned wrappers over escalating integers.
- If a z-index needs four digits, the layering model is probably broken.
- Tooltips and toasts should not outrank modals unless there is a deliberate reason.

## Iconography

- Use one icon family per surface. Mixed stroke weights, caps, joins, and radii compound into visual noise.
- Match icon optical weight to adjacent text. Thin icons beside bold labels look accidental.
- Redraw or swap icons at extreme sizes. A 24px outline icon scaled to 12px disappears; scaled to 48px looks childish.
- Use filled versions for tiny states when strokes vanish.
- Snap icons to pixels deliberately. Half-pixel placement blurs on 1x screens.
- Nudge optical centers. Play triangles inside circles usually need a slight right shift.
- Do not use ambiguous icons alone. “Save,” “favorite,” “rating,” “upload,” “download,” and “warning” need labels or stronger shape language when ambiguous.
- Keep 6–8px between icon and label in normal buttons.
- Active icon treatment may be filled or outlined; consistency matters more than ideology.

## Illustration and decorative code art

- Illustrations must match the product’s palette, stroke weight, perspective, shadow direction, and radius language.
- Do not drop generic character/blob art into serious UI. No illustration is better than stock-feeling illustration.
- Use spot illustrations in compact UI. Narrative scenes need room.
- Decorative layers must have `pointer-events: none` and no accidental text selection.
- Informative illustrations need an accessible name; decorative illustrations should disappear from assistive tech.

## Information architecture

- Name things in user language, not implementation language.
- Progressive disclosure beats dumping 40 settings into a flat page.
- Empty states must explain what happened and give the next useful action.
- Error pages should continue the journey: what happened, what to try, where to go next.
- Put the primary action where users can see it. Long pages often need persistent action access.
- Separate destructive actions from confirm/save actions with space, hierarchy, and copy.
- Avoid three-level dropdown nav. Flatten, group, or use breadcrumbs.
- Search terms are IA feedback. If users search “invoices,” do not hide the page under “billing artifacts.”
- Onboarding should create value, not tour chrome. Help the user do the first meaningful thing.

## Copy

- Buttons say the action: “Save changes,” “Create project,” “Send invite,” not “Submit.”
- Error copy names the problem and the fix: “Email must include @” beats “Invalid input.”
- Empty states speak to the user’s situation: “You haven’t created a project yet” beats “No projects found.”
- Front-load notifications: “Export ready. Download it.”
- Do not apologize in button labels. Own the action.
- Use sentence case for product UI unless the brand has a strong reason not to.
- Avoid internal nouns, acronyms, and implementation verbs in user-facing surfaces.
- Toast duration should scale with reading length. Tiny confirmations can be brief; multi-sentence messages need time or persistence.

## Component visual states

Every serious component needs distinct, designed states:

- default
- hover, only on hover-capable devices
- active/pressed
- focus-visible
- disabled
- loading
- selected/current
- empty
- error/invalid
- success/complete
- reduced-motion
- mobile/touch

If two states look the same, users cannot tell what is happening.

## Marketing, docs, blogs, changelogs

- The hero must communicate what it is, who it is for, why it matters, and what to do next before the page gets clever.
- Use one primary CTA. Secondary actions must be visually secondary.
- Logged-out CTAs should acquire users; logged-in CTAs should take them back to the product.
- Do not run a parade of scroll fade-ups. It looks template-made and slows comprehension.
- No scroll hijacking. No fake parallax. No auto-advancing carousels that steal attention.
- Intro animation may play once per session, then get out of the way.
- Above-the-fold images and fonts are performance-critical design elements, not backend details.
- Docs need visual examples, not just code. Show what the code produces.
- Code snippets need copy buttons.
- Docs should expose markdown when useful: copy-as-markdown and `.md` routes for AI/tooling workflows.
- Blogs and changelogs should have RSS feeds.
- Long-form content needs readable width, strong headings, anchored sections, and good scroll margins.
