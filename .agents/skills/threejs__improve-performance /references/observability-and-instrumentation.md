# Observability and Instrumentation

This file is non-authoritative supporting context for the skill. The main `SKILL.md` is authoritative.

## Minimum counters to add before guessing

Per frame or per second, collect:

- frame time: avg / p95 / p99 / max
- main-thread update time
- main-thread render submission time
- worker physics step time
- worker queue drain / marshal time
- GPU time if available
- `renderer.info.render.calls`
- `renderer.info.render.triangles`
- `renderer.info.memory.textures`
- `renderer.info.memory.geometries`
- `renderer.info.programs.length` or equivalent unique program count
- active rigid bodies
- total rigid bodies
- total colliders
- changed bodies synced from worker to renderer
- bytes transferred per tick
- heap trend if debugging leaks
- count of long tasks if main-thread spikes exist

## Frame budget reminder

- 60 Hz → 16.67 ms
- 72 Hz → 13.89 ms
- 90 Hz → 11.11 ms
- 120 Hz → 8.33 ms

Always budget for spike headroom. A system that averages under budget but blows p95 / p99 is still failing.

## Minimal instrumentation scaffold

```ts
type FrameSample = {
  frameMs: number;
  updateMs: number;
  renderSubmitMs: number;
  gpuMs: number | null;
  physicsMs: number | null;
  syncMs: number | null;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  programs: number;
  activeBodies: number;
  totalBodies: number;
  totalColliders: number;
  syncedBodies: number;
  bytesTransferred: number;
};

const perf = {
  history: new Array<FrameSample>(240),
  index: 0,
  push(sample: FrameSample) {
    this.history[this.index] = sample;
    this.index = (this.index + 1) % this.history.length;
  }
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}
```

## Main-thread timing regions

Wrap named regions with `performance.mark/measure`:

```ts
function markStart(name: string) {
  performance.mark(`${name}:start`);
}
function markEnd(name: string) {
  performance.mark(`${name}:end`);
  performance.measure(name, `${name}:start`, `${name}:end`);
}
```

Track at least:
- `update`
- `render_submit`
- `sync_from_worker`
- `spawn_batch`
- `dispose_batch`

## PerformanceObserver

Use it for long tasks and measures:

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // collect longtask / measure entries
  }
});
observer.observe({ entryTypes: ['measure', 'longtask'] });
```

## GPU timing

Prefer renderer-native timestamp query helpers when available. Fall back to extension-based timer queries or capability-gated “unknown”.

Do not use blocking GPU readback as normal frame instrumentation.

## Worker physics timing

Measure inside the worker around:

- command queue apply
- spawn/despawn batch
- `world.step(...)`
- event drain
- active-body extraction
- typed-array packing
- postMessage or shared-buffer publish

Example:

```ts
const t0 = performance.now();
applyCommands();
const t1 = performance.now();
world.step(eventQueue);
const t2 = performance.now();
const changedCount = packChangedBodies(outBuffer);
const t3 = performance.now();

postMessage({
  tick,
  commandMs: t1 - t0,
  physicsMs: t2 - t1,
  packMs: t3 - t2,
  changedCount
}, [outBuffer.buffer]);
```

## Attribution rules of thumb

Not proof, but useful triage:

- Lower DPR helps a lot → suspect GPU fill / post / transparency / shadows.
- Lower object count helps more than DPR → suspect CPU submission, sorting, or physics.
- Worker physics time dominates → collider, solver, CCD, events, query load.
- No subsystem seems dominant but p99 is bad → look for compile/upload/GC spikes.
