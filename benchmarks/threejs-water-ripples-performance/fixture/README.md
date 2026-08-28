# Water ripples benchmark fixture

`index.html` is a benchmark derivative of the frozen water-ripples example at
`.agents/skills/code__threejs-rapier-performance/evals/fixtures/water-ripples/index.html`.
Normal mode keeps the example's autonomous animation, visuals, controls, and render topology.

Open `index.html?benchmark=1` to disable the autonomous `requestAnimationFrame` loop and
StatsGL. The page then exposes `window.__waterRipplesBenchmark`:

- `ready`: a promise that resolves after both external textures load.
- `reset({ scenario, seed })` / `resetScenario(...)`: reset to `ordinary` or `stress`.
- `prepareOrdinary(seed)`: reset to the deterministic ordinary scenario.
- `prepareStress(seed)`: reset to exactly 200 active ripple pairs and 50 visible drops.
- `stepFrame(count)`: advance `count` fixed 1/60-second simulation ticks without rendering.
- `renderFrame()`: render the current state without advancing it; use `snapshot()` after the
  measured render batch rather than inside it.
- `snapshot()`: return the seed, tick, exact logical counts, visible state, surface size,
  last-render topology, and `renderer.info` counters.
- `renderer` and `gl`: direct access for benchmark-local timing and GPU-query code.

The runtime topology remains one owner, one offscreen normal target, at most one normal-scene
submission, and one terminal color-scene submission per rendered frame. Benchmark mode only
separates deterministic simulation stepping from that existing render path; it adds no pass,
target, renderer, or presentation path.
