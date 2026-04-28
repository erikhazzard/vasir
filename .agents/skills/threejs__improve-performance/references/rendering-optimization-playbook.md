# Rendering Optimization Playbook

This file is non-authoritative supporting context for the skill. The main `SKILL.md` is authoritative.

## Fix order for rendering

1. Measure
2. Remove unnecessary work
3. Batch compatible work
4. Reduce pass count / target resolution
5. Reduce shader/material complexity
6. Reduce transparency / overdraw
7. Reduce shadow cost
8. Reduce texture bandwidth / VRAM pressure
9. Only then consider backend or architecture changes

## Renderer configuration audit

Before rewriting systems, inspect the renderer creation and render-target settings:

- `powerPreference`
- `antialias`
- `alpha`
- `preserveDrawingBuffer`
- `precision`
- `logarithmicDepthBuffer`
- `reversedDepthBuffer`
- back-buffer size / DPR policy
- render-target resolution and `samples`

These are not free wins. Treat each as a measurable toggle, not folklore.

## Common rendering hotspots

### Draw-call and material pressure
Use `InstancedMesh` when many objects share a geometry and material.
Use `BatchedMesh` when many objects share one material but not one geometry.
Reduce unique materials and shader variants before chasing tiny GLSL tweaks.

### Static transform churn
If an object is truly static, freeze its matrix updates.
Do not recompute world matrices for thousands of never-moving props.

### Culling correctness
Bad or stale bounds can make culling fail or become overly conservative.
If geometry changes, update bounds intentionally.
If you disable culling, say why.

### Shadows
Shadow map cost is often multiplicative:
- number of shadow-casting lights
- map size
- caster count
- update frequency

For mostly static lighting or casters:
- `light.shadow.autoUpdate = false`
- set `light.shadow.needsUpdate = true` only when needed

### Transparency and overdraw
Transparent objects cost sorting and often heavy overdraw.
Large full-screen transparent layers, particles, distortion, and post stacks are frequent fill-rate killers.
Reducing transparent pixels often beats reducing triangle count.

### Post-processing
Count every full-resolution pass.
Count every render target.
Count MSAA samples.
Count blur taps / sample kernels.
If the stack is wide, collapsing or downscaling passes is often a bigger win than micro-optimizing scene code.

### Transmission / expensive physical materials
Treat them as feature flags, not defaults.
If the app uses transmission or heavy physical effects, expose them as measurable cost centers.
Use per-feature resolution scaling when supported.
Render-target resolution scale is often a better trade than trying to keep full-resolution transmission at any cost.

### DPR and back-buffer scaling
Dynamic or capped DPR is often the fastest quality trade in the entire stack.
Always label it as a quality trade.

## Asset decisions that affect runtime

### KTX2 / Basis
Usually helps runtime by reducing GPU memory pressure and texture bandwidth.
Best when the app is texture-heavy.

### Draco / Meshopt
Primarily affects download and decode/parse behavior.
Can help runtime indirectly if it enables better assets, but do not treat it as a guaranteed steady-state FPS fix.

### glTF instancing extension
If the content pipeline can emit instancing, it can remove runtime setup work and draw pressure.

## Shader compile hitches

If the app hitches the first time an effect, mesh, or level is used:
- prewarm critical materials
- avoid creating many variants at interaction time
- avoid compile-status polling in hot paths
- stage first-use work behind load screens or warm-up scenes
