---
name: visuals
description: Visualization, interaction, D3/vanilla implementation, accessibility, and validation patterns for fully offline moonshine explanations
---

# Visuals

Moonshine visuals are claims made visible. A chart, simulation, animation, or diagram should not exist unless it changes what the reader can notice, test, predict, or explain.

Use D3 v7 when it is locally available and can be bundled fully offline. Otherwise use vanilla SVG, Canvas, HTML, CSS, and plain JavaScript. Never load D3 or any dependency from a CDN.

## Visual Design Contract

Before implementing any figure, answer:

1. What claim does this figure make?
2. What should the reader notice in the default state?
3. What can the reader test or predict?
4. What misconception or abstraction gap does it address?
5. Why is a static figure insufficient?
6. What validates that the visual behavior is technically correct?
7. How will a keyboard or screen-reader user get the core insight?

If the answer to 5 is weak, use a static figure.

## Rendering Technology

Choose the smallest technology that teaches the idea.

| Technology | Use when | Avoid when |
|---|---|---|
| HTML + CSS | Tables, state labels, simple diagrams, progress indicators, controls | Spatial precision or dense plotting is needed |
| SVG | Most explanatory figures, axes, labels, diagrams, sparse interaction | More than about 2,000 changing elements |
| Canvas 2D | Dense points, particles, simulations, pixel effects | Text, axes, and accessible structure are central |
| Hybrid | Canvas data layer plus SVG axes/labels plus HTML controls | A single layer would be simpler |
| WebGL | Massive data or GPU effects that Canvas cannot handle | Normal article figures |
| D3 | Bespoke data joins, scales, axes, layouts, transitions | A simple vanilla implementation is clearer |

The explanation’s job is communication, not benchmarking. Switch technologies only when the reader benefits.

## Interaction Jobs

Do not choose interaction by widget. Choose it by learning job.

| Learning job | Good interaction | Example |
|---|---|---|
| Prediction | reveal button, next-step marker, hidden outcome | “Where will the next update land?” |
| Parameter exploration | slider, drag handle, radio mode | “What changes when friction crosses this threshold?” |
| Details without clutter | hover, focus, disclosure | “Inspect one node without labeling all nodes.” |
| Compare representations | linked views, synchronized hover | “Same state in equation and phase plot.” |
| Sequence | scroll steps, staged buttons | “Reveal one mechanism at a time.” |
| Misconception repair | before/after, prediction gap, counterexample | “The larger step is not always faster.” |
| Reflection | short prompt, explain-this-state, answer reveal | “What stayed constant?” |
| Consolidation | final small sandbox | “Now combine the two mechanics.” |

One figure can have multiple jobs, but one should dominate.

## Controls

Use one control per meaningful parameter. Avoid exposing every internal variable.

- Sliders for continuous parameters.
- Radio buttons for mutually exclusive models.
- Checkboxes for overlays or binary assumptions.
- Buttons for staged reveals, reset, replay, or prediction checks.
- Drag handles when direct manipulation improves intuition.

Controls live inside the figure, above or beside the visual. Labels must be explicit and connected with `for`/`id`.

```js
const slider = document.getElementById("rate-slider");
const readout = document.getElementById("rate-value");
slider.addEventListener("input", () => {
  const value = Number(slider.value);
  readout.textContent = value.toFixed(2);
  store.set({ rate: value }, "rate-slider");
});
```

Use `input`, not `change`, for live range-slider feedback.

## Prediction and Reveal

At least one figure should ask the reader to predict, then compare.

Pattern:

1. Show a default state.
2. Ask a concrete prediction.
3. Let the reader reveal or run the next state.
4. Explain the gap between prediction and result.

Keep it small. The goal is active reading, not a quiz.

## Hover, Focus, and Tooltips

Use positioned HTML tooltips, not SVG `<title>`. Tooltips should work from pointer and keyboard focus where possible.

```js
const tip = document.createElement("div");
tip.className = "tip";
Object.assign(tip.style, {
  position: "fixed",
  pointerEvents: "none",
  opacity: "0",
  maxWidth: "18rem"
});
document.body.appendChild(tip);

function showTip(html, x, y) {
  tip.innerHTML = html;
  tip.style.opacity = "1";
  const tw = tip.offsetWidth;
  tip.style.left = `${Math.min(x + 12, window.innerWidth - tw - 8)}px`;
  tip.style.top = `${Math.max(y - 32, 8)}px`;
}
function hideTip() { tip.style.opacity = "0"; }
```

For sparse scatterplots, use a nearest-point overlay or Delaunay/Voronoi when D3 is available. The target should be the nearest meaningful object, not a tiny dot.

## Brushing and Selection

Brush only when selecting a range teaches something. For many articles, brushing is dashboard behavior and should be avoided.

When brushing is justified:

- Draw all data in the background.
- Draw the selected subset in the foreground.
- Explain what selection means in prose or caption.
- Preserve selection in data coordinates across resize.

Ghost/active pattern:

```js
function renderSelection(selectedIds) {
  const selected = new Set(selectedIds);
  marks.forEach(mark => {
    const active = selected.size === 0 || selected.has(mark.dataset.id);
    mark.style.opacity = active ? "0.9" : "0.15";
  });
}
```

## Scroll-Driven Narrative

Use discrete scroll steps for conceptual sequence. Use continuous scroll only when scrubbing itself teaches, such as rotating a shape or interpolating between equivalent representations.

Rules:

- `goToStep(i)` is idempotent.
- Backward scrolling works.
- Mobile fallback is readable without sticky layout.
- Reduced-motion mode uses instant or stepped changes.
- Each step has one conceptual change.

## Drag

Drag is discoverable only with cues.

- Use visible handles.
- Add cursor cues on pointer devices.
- Add keyboard alternatives with arrow keys.
- Constrain drag to meaningful bounds.
- Keep hover/value feedback active during drag.

```js
handle.tabIndex = 0;
handle.setAttribute("role", "slider");
handle.setAttribute("aria-valuemin", "0");
handle.setAttribute("aria-valuemax", "1");
handle.addEventListener("keydown", e => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  const delta = e.key === "ArrowRight" ? 0.02 : -0.02;
  store.set({ param: clamp(store.get().param + delta, 0, 1) }, "keyboard-handle");
});
```

## Motion

Motion should explain change over time or preserve object constancy. Do not animate for ornament.

Use:

- Slow transitions when cause and effect must be tracked.
- Linear easing for continuous simulation playback.
- Gentle easing for interface response.
- Staged reveals for multi-part mechanisms.

Avoid:

- Fast animations that finish before comprehension.
- Pulsing/glowing decoration.
- Motion that changes multiple encodings at once.
- Loops that accumulate hidden state.

Reduced motion:

- Provide still states, manual stepping, or instant transitions.
- Do not set duration to zero if the resulting state becomes confusing. Replace motion with explicit labels or steps.

## Charts and Encodings

### Lines and Areas

Use for continuous change, trajectories, or temporal development.

- Use `.defined()` with D3 line generators when data can be missing.
- Avoid smoothing curves that imply nonexistent values.
- Use direct labels for five or fewer series.
- Confidence or uncertainty bands should be visually lighter than the main line.

### Bars and Histograms

Use for discrete comparison or binned distributions.

- Bar charts must include zero in the quantitative axis.
- Use horizontal bars for long labels.
- Histograms need bin size disclosure when binning affects interpretation.

### Scatter and Bubble

Use for relationships, clusters, or tradeoffs.

- Use position for the primary variables.
- Use `scaleSqrt` for bubble radius when area encodes magnitude.
- Add jitter only when overlap hides data, and disclose it.
- Use density contours or Canvas for dense clouds.

### Heatmaps and Matrices

Use for pairwise relationships, grids, or state spaces.

- Sort rows/columns to reveal structure.
- Add labels when cells are large enough.
- Use colorblind-safe sequential or diverging scales.
- Provide text summaries for important regions.

### Networks and Graphs

Use only when topology matters.

- Node-link diagrams become hairballs quickly.
- Use adjacency matrices for dense networks.
- Use arc diagrams when order matters.
- Use Sankey only for conserved quantities through stages.

### Hierarchies

- Trees for paths and ancestry.
- Treemaps for part-to-whole size comparison.
- Pack layouts for grouping when exact comparison is secondary.
- Sunbursts for depth when radial reading does not obscure the point.

### Distributions

- Box plots summarize, but hide shape.
- Violins show shape, but can hide individual observations.
- Bee swarms show individuals, but degrade with many points.
- Ridgelines work for comparing many distributions when exact values are secondary.

### Small Multiples

Use when repeated structure teaches comparison.

- Shared scales unless independent scales are explicitly the point.
- Label only what is needed.
- Keep visual grammar identical across panels.

### Sparklines

Use sparingly as visual hooks or compact trends.

- No axes unless needed.
- Use shared y-domains when comparing multiple sparklines.
- Add an end dot or label for the current value.

## Annotation

Annotate the surprising, not the obvious.

- 1-3 annotations per chart.
- Direct labels beat legends for small numbers of series.
- Reference lines should be lighter than primary data.
- Leader lines should clarify, not decorate.
- Captions can carry interpretation better than callout boxes.

## Color

Color is a semantic system, not decoration.

Good uses:

- Categorical identity.
- Highlight versus context.
- Signed divergence around a meaningful midpoint.
- Consistent variable identity across equation, prose, and chart.

Bad uses:

- Rainbow scales without reason.
- Red/green as the only distinction.
- Default blue/purple accents unrelated to the concept.
- Color as the only quantitative channel.

When possible, pair color with position, labels, stroke pattern, shape, or opacity.

## Data and Models

### Real Data

Document:

- Source.
- Date/version if relevant.
- Transformations.
- Sampling or filtering.
- Known limitations.

Use local files or inline data only. No remote fetches.

### Synthetic Data

Synthetic data is allowed when explaining a concept rather than reporting a dataset.

Rules:

- Mark it as synthetic or illustrative.
- Use a seeded generator.
- Choose values that make the phenomenon visible.
- Avoid implying empirical evidence from invented data.

Example seeded generator:

```js
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### Simulations

A simulation is a claim. Define:

- State variables.
- Update rule.
- Time step.
- Parameters exposed to the reader.
- Parameters hidden for simplicity.
- Conservation laws or invariants, if any.
- Boundary behavior.
- Simplifications.

Validate with edge cases. Example: zero input, extreme input, stable value, unstable value, known analytic result, or conservation check.

## Iteration Passes

Iterate in this order:

1. **Truth:** Does the figure encode the right model or data?
2. **Structure:** Is this the right representation for the learning task?
3. **Default:** Does the first view already teach something?
4. **Legibility:** Can values, labels, and states be read at desktop and mobile widths?
5. **Interaction:** Does the action reveal a causal relationship or misconception?
6. **Narrative:** Does prose direct attention before and after interaction?
7. **Accessibility:** Can the core insight be obtained without mouse, color-only meaning, or motion?
8. **Stress:** What happens at extremes, rapid input, resize, and reduced motion?
9. **Specificity:** If the topic changed, what visual choices would have to change?

## Performance

Budgets:

- Aim for 60fps when animating.
- SVG is comfortable below roughly 2,000 elements.
- Canvas is appropriate for dense or rapidly changing marks.
- Pre-compute expensive layouts when possible.
- Coalesce rapid events with `requestAnimationFrame`.
- Stop simulations outside the viewport.

Dirty rendering pattern:

```js
let scheduled = false;
function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    render(store.get());
  });
}
```

## Accessibility

Every figure needs:

- A visible caption.
- An accessible name and description.
- Keyboard-operable controls.
- Non-color-only encodings.
- Reduced-motion behavior.
- Text summary or data/model fallback for complex graphics.

SVG pattern:

```html
<svg role="img" aria-labelledby="fig-title fig-caption">
  <title id="fig-title">Short figure title</title>
  <desc>Plain-language description of what the figure shows and how interaction changes it.</desc>
</svg>
```

Controls:

- Use native controls when possible.
- Label every input.
- Maintain visible focus states.
- Ensure pointer-only actions have keyboard alternatives.

Tooltips:

- Do not hide essential information only in hover.
- Mirror essential hover information in captions, labels, or focusable elements.

## Final Visual Review

Before delivery, inspect each figure with these questions:

```text
Claim: What does this figure assert?
Default: What does it teach before interaction?
Action: What reader action matters?
Insight: What should change in the reader's mind?
Misconception: What wrong model does it expose or prevent?
Truth: What source, equation, or sanity check grounds it?
Static gate: Would a static figure be enough?
Accessibility: What is the non-mouse, non-color, reduced-motion path?
Specificity: Which visual choices belong to this concept and no other?
```
