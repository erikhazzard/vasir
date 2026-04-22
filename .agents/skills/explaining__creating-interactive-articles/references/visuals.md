---
name: visuals
description: D3 v7 visualization patterns, interaction recipes, rendering choices, accessibility, and validation for fully offline explanations
---

# Visuals

Visuals are claims made visible. A chart, simulation, animation, or diagram should not exist unless it changes what the reader can notice, test, predict, compare, or explain.

Use **D3 v7 as the primary visualization tool**. D3 owns the chart DOM. No framework abstraction layer. Use `.join()` for data binding, `selection.call()` for reusable chart functions, `d3.dispatch` for cross-chart communication, and D3 generators/layouts whenever they fit the concept.

D3 must be inlined or bundled locally. Never load D3 or any dependency from a remote URL. Use CSS custom properties from the article scaffold (`var(--text)`, `var(--accent)`, etc.) in SVG style attributes. Avoid hardcoding colors that the palette already defines.

## Visual Design Contract

Before implementing any figure, answer:

1. What claim does this figure make?
2. What should the reader notice in the default state?
3. What can the reader test or predict?
4. What misconception or abstraction gap does it address?
5. Why is a static figure insufficient?
6. Which D3 pattern implements it: scale, axis, join, transition, brush, drag, Delaunay, hierarchy, force, bin, stack, dispatch, or generator?
7. What validates that the visual behavior is technically correct?
8. How will a keyboard or screen-reader user get the core insight?

If the answer to 5 is weak, use a static figure. Static figures may still be authored with D3 when data transformation, layout, labels, or scales benefit from it.

## Rendering Technology

Choose the technology that fits each figure. Start with D3 + SVG and switch only when the reader benefits.

| Technology | Use when | Notes |
|---|---|---|
| D3 + SVG | Most explanatory charts, axes, labels, diagrams, sparse interaction | Default for visuals |
| D3 + Canvas 2D | Dense data, particles, real-time simulation, pixel effects | Use D3 for scales, data transforms, and hit detection helpers |
| D3 hybrid | Canvas data layer, SVG axes/labels, HTML controls/tooltips | Often best for complex figures |
| HTML + CSS + D3 state | Tables, text-heavy layouts, icon arrays, controls | A well-styled table can be a visualization |
| WebGL | Massive data or GPU effects that Canvas cannot handle | Use rarely; high setup and accessibility cost |

SVG is comfortable below roughly 2,000 changing elements. Canvas can handle roughly 100,000 simple marks. WebGL is for cases beyond Canvas. These are judgment ranges, not hard laws.

Use additional local libraries when they are the right fit: d3-sankey for Sankey diagrams, topojson-client for geographic data, KaTeX for math. Bundle every dependency locally.

## D3 Setup Patterns

### Margin Convention

Use a margin convention for charts with axes.

```js
const margin = { top: 24, right: 24, bottom: 36, left: 44 };
const width = Math.max(320, outerWidth);
const height = 320;
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const svg = d3.select("#fig-1-svg")
  .attr("viewBox", [0, 0, width, height])
  .attr("width", width)
  .attr("height", height);

const g = svg.selectAll("g.plot")
  .data([null])
  .join("g")
  .attr("class", "plot")
  .attr("transform", `translate(${margin.left},${margin.top})`);
```

For text-heavy charts, redraw at the new container width instead of only scaling with `viewBox`, because tiny text stops teaching.

### Keyed Joins

Use key functions whenever marks represent persistent objects.

```js
g.selectAll("circle.point")
  .data(data, d => d.id)
  .join(
    enter => enter.append("circle")
      .attr("class", "point")
      .attr("r", 0)
      .attr("cx", d => x(d.x))
      .attr("cy", d => y(d.y))
      .call(e => e.transition().duration(400).attr("r", 4)),
    update => update.call(u => u.transition().duration(400)
      .attr("cx", d => x(d.x))
      .attr("cy", d => y(d.y))),
    exit => exit.call(e => e.transition().duration(250).attr("r", 0).remove())
  );
```

Object constancy matters because the reader tracks identity through change. Without keys, a transition can imply the wrong object moved.

### Reusable Chart Function

Use `selection.call()` for reusable charts.

```js
function scatter(selection, props) {
  selection.each(function(data) {
    const svg = d3.select(this);
    const { width, height, xValue, yValue } = props;
    const x = d3.scaleLinear().domain(d3.extent(data, xValue)).range([40, width - 20]);
    const y = d3.scaleLinear().domain(d3.extent(data, yValue)).range([height - 32, 16]);

    svg.attr("viewBox", [0, 0, width, height]);
    svg.selectAll("circle")
      .data(data, d => d.id)
      .join("circle")
      .attr("cx", d => x(xValue(d)))
      .attr("cy", d => y(yValue(d)))
      .attr("r", 4);
  });
}

d3.select("#fig-1-svg").datum(data).call(scatter, {
  width: 640,
  height: 360,
  xValue: d => d.x,
  yValue: d => d.y
});
```

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
const slider = document.getElementById("param-slider");
const value = document.getElementById("param-value");

slider.addEventListener("input", () => {
  state.param = +slider.value;
  value.textContent = state.param.toFixed(2);
  dispatch.call("update", null, { source: "param-slider", state });
});
```

Use `input`, not `change`, for live range-slider feedback. `change` fires only on release; `input` fires continuously during drag.

## Prediction and Reveal

At least one figure should ask the reader to predict, then compare.

Pattern:

1. Show a default state.
2. Ask a concrete prediction.
3. Let the reader reveal or run the next state.
4. Explain the gap between prediction and result.

Keep it small. The goal is active reading, not a quiz.

## Hover, Focus, and Tooltips

Use positioned HTML tooltips, not SVG `<title>`. Show on `pointerenter`, update on `pointermove`, hide on `pointerleave`, and clamp to the viewport.

```js
const tip = d3.select("body").append("div")
  .attr("class", "tip")
  .style("position", "fixed")
  .style("pointer-events", "none")
  .style("opacity", 0);

function moveTip(event) {
  const node = tip.node();
  const tw = node.offsetWidth;
  const th = node.offsetHeight;
  const x = Math.min(event.clientX + 12, window.innerWidth - tw - 8);
  const y = Math.max(8, Math.min(event.clientY - 32, window.innerHeight - th - 8));
  tip.style("left", `${x}px`).style("top", `${y}px`);
}

selection
  .on("pointerenter", (event, d) => {
    tip.html(`<strong>${d.name}</strong>: ${d.value}`).style("opacity", 1);
    moveTip(event);
  })
  .on("pointermove", moveTip)
  .on("pointerleave", () => tip.style("opacity", 0));
```

Use `clientX`/`clientY` for `position: fixed`. Use `pageX`/`pageY` only for absolutely positioned tooltips.

For sparse point charts, use Delaunay so the hover target is the nearest point, not the tiny dot itself.

```js
const delaunay = d3.Delaunay.from(data, d => x(d.x), d => y(d.y));

svg.append("rect")
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "none")
  .attr("pointer-events", "all")
  .on("pointermove", event => {
    const [mx, my] = d3.pointer(event);
    const i = delaunay.find(mx, my);
    const d = data[i];
    dispatch.call("hover", null, d.id);
    // highlight d and show tooltip near x(d.x), y(d.y)
  })
  .on("pointerleave", () => dispatch.call("hover", null, null));
```

Tooltips should not contain essential information unavailable elsewhere. Mirror essential hover information in captions, labels, focusable elements, or a textual summary.

## Brushing and Selection

Brush only when selecting a range teaches something. For many articles, brushing is dashboard behavior and should be avoided. When it is justified, use `d3.brush`, `d3.brushX`, or `d3.brushY`.

```js
const brush = d3.brushX()
  .extent([[0, 0], [innerWidth, innerHeight]])
  .on("brush end", event => {
    if (!event.selection) {
      dispatch.call("select", null, []);
      return;
    }
    const [x0, x1] = event.selection.map(x.invert);
    const keys = data
      .filter(d => d.value >= x0 && d.value <= x1)
      .map(d => d.id);
    dispatch.call("select", null, keys);
  });

g.append("g")
  .attr("class", "brush")
  .call(brush);
```

Ghost/active pattern: draw the full dataset in a muted background, then the selected subset in the foreground.

```js
dispatch.on("select.chart", keys => {
  const selected = new Set(keys);
  const isActive = d => selected.size === 0 || selected.has(d.id);
  circles
    .attr("fill", d => isActive(d) ? color(d.category) : "var(--border)")
    .attr("opacity", d => isActive(d) ? 0.85 : 0.15);
});
```

Brush coordinates are pixels. After resize, they map to wrong data values. Convert brush extents to data domain before resize, then restore from domain values after redraw.

## Scroll-Driven Narrative

Use discrete scroll steps for conceptual sequence. Use continuous scroll only when scrubbing itself teaches, such as rotating a shape or interpolating between equivalent representations.

```js
const steps = document.querySelectorAll(".step");
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) goToStep(+entry.target.dataset.step);
  });
}, { threshold: 0.5 });
steps.forEach(step => observer.observe(step));

const stages = [showOverview, splitByGroup, highlightOutliers];
function goToStep(i) {
  state.step = i;
  stages[i]();
}
```

Rules:

- `goToStep(i)` is idempotent.
- Backward scrolling works.
- Mobile fallback is readable without sticky layout.
- Reduced-motion mode uses instant or stepped changes.
- Each step has one conceptual change.

## Drag

Use `d3.drag` on SVG elements. Drag must be discoverable and constrained to meaningful bounds.

```js
const drag = d3.drag()
  .on("start", function () { d3.select(this).classed("is-dragging", true); })
  .on("drag", (event, d) => {
    d.x = Math.max(0, Math.min(innerWidth, event.x));
    d3.select(event.sourceEvent.target).attr("cx", d.x);
    dispatch.call("update", null, { source: "drag", threshold: x.invert(d.x) });
  })
  .on("end", function () { d3.select(this).classed("is-dragging", false); });

handle.call(drag);
```

Add keyboard alternatives for draggable handles:

```js
handle
  .attr("tabindex", 0)
  .attr("role", "slider")
  .attr("aria-valuemin", 0)
  .attr("aria-valuemax", 1)
  .on("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 0.02 : -0.02;
    state.param = Math.max(0, Math.min(1, state.param + delta));
    dispatch.call("update", null, { source: "keyboard-handle", state });
  });
```

Pitfalls:

- Forgetting `cursor: grab` and `cursor: grabbing` cues.
- Allowing drag to move outside meaningful bounds.
- Letting hover/value feedback stop during drag.
- Providing no keyboard path.

## Motion

Motion should explain change over time or preserve object constancy. Do not animate for ornament.

Use:

- Slow transitions when cause and effect must be tracked.
- Linear easing for continuous simulation playback.
- Gentle easing for interface response.
- Staged reveals for multi-part mechanisms.
- Keyed joins so marks retain identity.

Avoid:

- Fast animations that finish before comprehension.
- Pulsing/glowing decoration.
- Motion that changes multiple encodings at once.
- Loops that accumulate hidden state.
- Transitions from undefined attributes.

Reduced motion:

- Provide still states, manual stepping, or instant transitions.
- Do not set duration to zero if the resulting state becomes confusing. Replace motion with explicit labels or steps.

### Transitions

```js
svg.selectAll("circle")
  .data(data, d => d.id)
  .join(
    enter => enter.append("circle")
      .attr("r", 0)
      .attr("cx", d => x(d.x))
      .attr("cy", d => y(d.y))
      .call(e => e.transition().duration(500).attr("r", d => r(d.value))),
    update => update.call(u => u.transition().duration(500)
      .attr("cx", d => x(d.x))
      .attr("cy", d => y(d.y))),
    exit => exit.call(e => e.transition().duration(300).attr("r", 0).remove())
  );
```

Interrupt previous transitions before starting new ones when interaction can fire rapidly:

```js
selection.interrupt().transition().duration(300).attr("opacity", 1);
```

Easing:

- `d3.easeCubicOut` for responsive UI.
- `d3.easeLinear` for continuous data playback.
- `d3.easeCubicInOut` for smooth position changes.

### Choreography

Use staged transitions for multi-step change. Coordinated delays are often more robust than `transition.end()` promises, which reject on interruption or empty selections.

```js
function staged(data) {
  const joined = g.selectAll("rect.bar").data(data, d => d.id);
  const exitDur = 300, moveDur = 400, enterDur = 400;
  const moveDelay = joined.exit().empty() ? 0 : exitDur;

  joined.join(
    enter => enter.append("rect")
      .attr("class", "bar")
      .attr("y", innerHeight)
      .attr("height", 0)
      .call(e => e.transition()
        .delay(moveDelay + moveDur)
        .duration(enterDur)
        .attr("y", d => y(d.value))
        .attr("height", d => innerHeight - y(d.value))),
    update => update.call(u => u.transition()
      .delay(moveDelay)
      .duration(moveDur)
      .attr("y", d => y(d.value))),
    exit => exit.call(e => e.transition()
      .duration(exitDur)
      .attr("height", 0)
      .attr("y", innerHeight)
      .remove())
  );
}
```

Stagger with `.delay((d, i) => i * 30)`. Keep total stagger under about 500ms unless the stagger itself teaches sequence.

### Shape Morphing

Morphing should prove equivalence or reveal structure. Do not morph unrelated states for spectacle.

Good uses:

- Bar to stacked bar to show same quantities under a new grouping.
- Points to density contours to show aggregation.
- Tree to radial tree when topology is preserved.

Avoid `d3.interpolateString` on SVG path `d` values when paths have different commands. Use parametric interpolation for shapes that share parameters, or resample both paths to the same number of points before interpolating.

## Charts and Encodings

### Lines and Areas

Use for continuous change, trajectories, or temporal development.

```js
const line = d3.line()
  .defined(d => d.value != null)
  .x(d => x(d.date))
  .y(d => y(d.value))
  .curve(d3.curveLinear);

g.selectAll("path.series")
  .data(series, d => d.name)
  .join("path")
  .attr("class", "series")
  .attr("fill", "none")
  .attr("stroke", d => color(d.name))
  .attr("stroke-width", 2)
  .attr("d", d => line(d.values));
```

Curve types:

- `d3.curveLinear` for direct point-to-point data.
- `d3.curveStep` for discrete state changes.
- `d3.curveMonotoneX` for sparklines or smooth lines with no overshoot.
- Avoid smoothing curves that imply nonexistent values.

Confidence bands: use `d3.area()` with `y0(d => y(d.lower))` and `y1(d => y(d.upper))`. Make bands visually lighter than the main line.

Pitfall: missing `.defined()` on line generators causes null values to draw to invalid places.

### Bars and Histograms

Use bars for discrete comparison and histograms for binned continuous distributions.

```js
const x = d3.scaleBand()
  .domain(data.map(d => d.name))
  .range([0, innerWidth])
  .padding(0.2);
const y = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value)])
  .nice()
  .range([innerHeight, 0]);

g.selectAll("rect.bar")
  .data(data, d => d.name)
  .join("rect")
  .attr("class", "bar")
  .attr("x", d => x(d.name))
  .attr("y", d => y(d.value))
  .attr("width", x.bandwidth())
  .attr("height", d => innerHeight - y(d.value));
```

Rules:

- Bar charts must include zero in the quantitative axis.
- Use horizontal bars for long labels.
- Grouped bars use nested `scaleBand`.
- Stacked bars use `d3.stack()`.
- Histograms use `d3.bin()`, and captions should disclose bin size when it affects interpretation.

Pitfall: `.nice()` can push domains in surprising ways. Check that bar charts still start at zero.

### Scatter and Bubble

Use for relationships, clusters, tradeoffs, and phase spaces.

```js
const x = d3.scaleLinear().domain(d3.extent(data, d => d.x)).nice().range([0, innerWidth]);
const y = d3.scaleLinear().domain(d3.extent(data, d => d.y)).nice().range([innerHeight, 0]);
const radius = d3.scaleSqrt().domain([0, d3.max(data, d => d.size)]).range([2, 18]);
```

Rules:

- Use position for the primary variables.
- Use `scaleSqrt` for bubble radius when area encodes magnitude.
- Add jitter only when overlap hides data, and disclose it.
- Use density contours or Canvas for dense clouds.
- Use Delaunay hover for sparse point charts.

Pitfall: using `scaleLinear` for bubble radius. The eye reads area, not radius.

### Heatmaps and Matrices

Use for pairwise relationships, grids, state spaces, or adjacency matrices.

```js
const x = d3.scaleBand().domain(cols).range([0, innerWidth]).padding(0.02);
const y = d3.scaleBand().domain(rows).range([0, innerHeight]).padding(0.02);
const color = d3.scaleSequential(d3.interpolateViridis).domain([min, max]);

g.selectAll("rect.cell")
  .data(cells, d => `${d.row}:${d.col}`)
  .join("rect")
  .attr("class", "cell")
  .attr("x", d => x(d.col))
  .attr("y", d => y(d.row))
  .attr("width", x.bandwidth())
  .attr("height", y.bandwidth())
  .attr("fill", d => color(d.value));
```

Rules:

- Sort rows/columns to reveal structure.
- Add labels when cells are large enough.
- Use colorblind-safe sequential or diverging scales.
- Provide text summaries for important regions.
- For adjacency matrices, sort by cluster to reveal dense diagonal blocks.

### Networks and Graphs

Use networks only when topology matters.

D3 patterns:

- Node-link: `d3.forceSimulation()` with `forceLink`, `forceManyBody`, `forceCenter`, and optional `forceCollide`.
- Matrix: `scaleBand` on both axes for dense graphs.
- Chord: `d3.chord()` and `d3.ribbon()` for reciprocal flow.
- Arc diagram: ordered nodes on a line with links as arcs.
- Sankey: local d3-sankey dependency for quantities through stages.

Judgment:

- Node-link for topology.
- Matrix for density.
- Chord for flow volumes between groups.
- Sankey for conserved quantities through a pipeline.
- Node-link becomes a hairball quickly, often before 500 nodes.

Force layout pattern:

```js
const sim = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id).distance(40))
  .force("charge", d3.forceManyBody().strength(-80))
  .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
  .stop();

for (let i = 0; i < 160; i++) sim.tick();
```

Pre-compute static force layouts when animation is not part of the explanation.

### Hierarchies

Use hierarchy only when containment, ancestry, or part-to-whole structure matters.

D3 patterns:

- Nested data: `d3.hierarchy()`.
- Flat id/parent data: `d3.stratify()`.
- Tree: `d3.tree()` for paths and ancestry.
- Treemap: `d3.treemap()` for size comparison.
- Pack: `d3.pack()` for grouping when exact comparison is secondary.
- Sunburst: `d3.partition()` and `d3.arc()` for full hierarchy with depth.

```js
const root = d3.hierarchy(data)
  .sum(d => d.value)
  .sort((a, b) => b.value - a.value);

d3.treemap()
  .size([innerWidth, innerHeight])
  .paddingInner(2)(root);

g.selectAll("rect.node")
  .data(root.leaves(), d => d.data.name)
  .join("rect")
  .attr("class", "node")
  .attr("x", d => d.x0)
  .attr("y", d => d.y0)
  .attr("width", d => d.x1 - d.x0)
  .attr("height", d => d.y1 - d.y0);
```

### Distributions

Use the distribution form that matches what the reader needs to see.

- Box plot: quartiles, whiskers, outlier dots. Compact but hides bimodality.
- Violin: `d3.bin()` or a density estimate, mirrored as area. Shows shape but hides individuals.
- Bee swarm: `d3.forceSimulation()` with `forceX` and `forceCollide`. Shows every point but degrades past a few hundred per group.
- Ridgeline: stacked area charts offset vertically. Good for comparing many distributions when exact values are secondary.

Bee swarm pattern:

```js
const sim = d3.forceSimulation(points)
  .force("x", d3.forceX(d => x(d.value)).strength(1))
  .force("y", d3.forceY(innerHeight / 2))
  .force("collide", d3.forceCollide(3.5))
  .stop();
for (let i = 0; i < 120; i++) sim.tick();
```

### Small Multiples

Use small multiples when repeated structure teaches comparison.

Rules:

- Compute shared domains from the full dataset before per-panel rendering.
- Only draw y-axis on the leftmost column and x-axis on the bottom row when space is tight.
- Keep visual grammar identical across panels.
- Label only what is needed.

Pitfall: creating scales inside the per-panel loop accidentally produces independent scales, making visual comparisons false.

### Sparklines

Use sparingly as visual hooks or compact trends.

Rules:

- 60-80px wide and about 20px tall is enough.
- No axes unless the axis teaches something.
- Use `d3.curveMonotoneX` to avoid overshoot.
- Add an end dot or label for the current value.
- Use shared y-domains when comparing multiple sparklines.

## Scales and Axes

Use the scale that matches the data and encoding:

- `d3.scaleLinear()` for ordinary quantitative values.
- `d3.scaleLog()` for strictly positive values spanning two or more orders of magnitude.
- `d3.scaleSqrt()` for radius when area encodes magnitude.
- `d3.scaleBand()` for categorical bars or grids.
- `d3.scalePoint()` for ordered categories without width.
- `d3.scaleUtc()` for time when local timezone shifts are not the concept.
- `d3.scaleSequential()` for continuous color.
- `d3.scaleDiverging()` for signed values around a meaningful midpoint.

Responsive ticks:

```js
const ticks = Math.max(2, Math.floor(innerWidth / 80));
g.select(".x-axis").call(d3.axisBottom(x).ticks(ticks));
```

Label collision strategy:

1. Reduce tick count.
2. Abbreviate or truncate labels.
3. Stagger labels.
4. Rotate labels only as a last resort.

Pitfalls:

- Using log scale with zero or negative values.
- Using color scale domains that change across small multiples.
- Using `.nice()` when exact domain boundaries matter.
- Letting axes dominate the explanatory marks.

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

D3 options:

- Sequential: `d3.interpolateBlues` for single-hue, `d3.interpolateViridis` for perceptual multi-hue.
- Diverging: `d3.scaleDiverging()` with a meaningful midpoint.
- Categorical: `d3.schemeTableau10` up to about 10 categories.

Pair color with position, labels, stroke pattern, shape, or opacity. Text contrast should meet WCAG 4.5:1 when practical.

## Annotation

Annotate the surprising, not the obvious.

- 1-3 annotations per chart.
- Direct labels beat legends for five or fewer series.
- Reference lines should be lighter than primary data.
- Leader lines should clarify, not decorate.
- Captions can carry interpretation better than callout boxes.

Reference line pattern:

```js
g.append("line")
  .attr("class", "reference")
  .attr("x1", 0)
  .attr("x2", innerWidth)
  .attr("y1", y(threshold))
  .attr("y2", y(threshold))
  .attr("stroke", "var(--border)")
  .attr("stroke-dasharray", "4 4");
```

Force-based label placement can avoid overlap. Pre-compute it with `simulation.stop(); simulation.tick(120);` rather than animating labels unless the motion teaches something.

## Typography in SVG

Use `var(--heading-font)` for SVG text. Body font is for article prose, not chart labels.

D3/SVG text patterns:

- `text-anchor="middle"`, `start`, or `end` for horizontal alignment.
- `dy="0.35em"` to vertically center single-line text.
- `<tspan>` for multi-line labels.
- `<foreignObject>` for HTML content such as equations or styled text, with fallback if browser support matters.

Pitfall: `getComputedTextLength()` returns 0 if text is not yet in the DOM. Append first, then measure.

## Data and Models

### Real Data

Document:

- Source.
- Date/version if relevant.
- Transformations.
- Sampling or filtering.
- Known limitations.

Use local files or inline data only. No remote fetches.

D3 transformation helpers:

```js
const byGroup = d3.group(data, d => d.group);
const totals = d3.rollups(data, v => d3.sum(v, d => d.value), d => d.group);
const bins = d3.bin().value(d => d.value).thresholds(20)(data);
```

### Synthetic Data

Synthetic data is allowed when explaining a concept rather than reporting a dataset.

Rules:

- Mark it as synthetic or illustrative.
- Use a seeded generator.
- Choose values that make the phenomenon visible.
- Avoid implying empirical evidence from invented data.

Seeded generator:

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

Validate with edge cases: zero input, extreme input, stable value, unstable value, known analytic result, or conservation check.

### Inline Data

For explanations, embed small datasets directly as JS arrays or objects. The explanation must work offline.

```js
const data = [
  { id: "a", x: 0.1, y: 0.8, group: "observed" },
  { id: "b", x: 0.4, y: 0.3, group: "predicted" }
];
```

For larger local datasets, package them with the zip and load through local file mechanisms only when browser restrictions allow it. Inline transformed summaries when possible.

## Iteration Passes

Generating a visualization in one pass often produces something that works but does not communicate well. Refine in this order:

1. **Truth:** Does the figure encode the right model or data?
2. **Structure:** Is this the right representation for the learning task?
3. **Default:** Does the first view already teach something?
4. **Legibility:** Can values, labels, and states be read at desktop and mobile widths?
5. **Interaction:** Does the action reveal a causal relationship or misconception?
6. **Narrative:** Does prose direct attention before and after interaction?
7. **D3 quality:** Are joins keyed, scales named, axes readable, transitions object-constant, and dispatch/state clean?
8. **Accessibility:** Can the core insight be obtained without mouse, color-only meaning, or motion?
9. **Stress:** What happens at extremes, rapid input, resize, and reduced motion?
10. **Specificity:** If the topic changed, what visual choices would have to change?

When an article has multiple figures, iterate across them: consistent color encoding, consistent scales where comparison matters, linked interactions that do not loop, and a visual progression that matches the narrative arc.

## Performance

Budgets:

- Aim for 60fps when animating.
- Keep frame work below about 16ms.
- SVG is comfortable below roughly 2,000 changing elements.
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

Canvas + D3 scale pattern:

```js
function draw(ctx, data, width, height) {
  const x = d3.scaleLinear().domain(d3.extent(data, d => d.x)).range([0, width]);
  const y = d3.scaleLinear().domain(d3.extent(data, d => d.y)).range([height, 0]);
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  for (const d of data) {
    ctx.moveTo(x(d.x) + 2, y(d.y));
    ctx.arc(x(d.x), y(d.y), 2, 0, Math.PI * 2);
  }
  ctx.fill();
}
```

For Canvas hover, use `d3.Delaunay`, `d3.quadtree`, or another hit structure. Do not scan 100,000 points on every pointer move.

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
<figure class="figure" aria-labelledby="fig-title" aria-describedby="fig-caption fig-desc">
  <div class="figure-title" id="fig-title">Short figure title</div>
  <div class="visually-hidden" id="fig-desc">Plain-language description of what the figure shows and how interaction changes it.</div>
  <svg role="img" aria-labelledby="fig-title fig-caption"></svg>
  <figcaption class="figure-caption" id="fig-caption">Caption tells the reader what to notice.</figcaption>
</figure>
```

Controls:

- Use native controls when possible.
- Label every input.
- Maintain visible focus states.
- Ensure pointer-only actions have keyboard alternatives.
- Keep hover information available through focus or text when it is essential.

Motion:

- Respect `prefers-reduced-motion`.
- Use manual stepping or still states for essential animated mechanisms.
- Do not leave users with a blank or misleading figure when motion is disabled.

## Final Visual Review

Before delivery, inspect each figure with these questions:

```text
Claim: What does this figure assert?
Default: What does it teach before interaction?
Action: What reader action matters?
Insight: What should change in the reader's mind?
Misconception: What wrong model does it expose or prevent?
Truth: What source, equation, or sanity check grounds it?
D3: Which D3 pattern is doing the work, and is it implemented cleanly?
Static gate: Would a static figure be enough?
Accessibility: What is the non-mouse, non-color, reduced-motion path?
Specificity: Which visual choices belong to this concept and no other?
```
