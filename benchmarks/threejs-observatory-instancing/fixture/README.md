# Uninstanced Matched-Run Fixture

This is the identical starting source for both arms of the observatory instancing pilot. It is deliberately slow in one local, bounded way: all 1,200 signal markers are individual `THREE.Mesh` objects, grouped conceptually into five families of 240.

The fixture must not inherit the defects under evaluation. Its fixed rendering architecture uses:

- one application frame owner, canvas, WebGL context, and animation loop;
- one shared full-resolution multicolor marker-mask/edge pipeline whose pass and target counts do not depend on marker-family count;
- the existing fixed world, bloom, reflection, fog, and water work;
- one final `renderer.render()` to the default framebuffer, composing the low-resolution world, outlines, and native-resolution HUD together.

Only `index.html` is copied into candidate workspaces. This README, captures, harness, oracle, task, treatment, eval plan, and scoring criteria remain outside agent-visible directories.

The shared outline-mask vertex shader intentionally reflects the current uninstanced source and therefore uses each mesh's model matrix. A correct solution must make that existing shader path consume instance transforms while preserving the fixed shared pipeline. This is part of the requested local instancing work; it does not justify adding a family-owned pass or target.

Current source and fixed-tick captures:

- Source SHA-256: `b9950824c09966cb3874049af509da39a5c8abac9beb6e652cda6dc0802cef29`
- Portrait 900×1600: `36cd18cf47c0c7d46571058748be74c4ab1f1dfec137f35116d2f3b50ac257cf`
- Landscape 1600×900: `6c946b41f9f01600f9ab6891ac35cc248f5b7f175f56f8412f036447c4290eaf`

Both captures reproduced byte-identically in fresh Chrome targets with the expected counts, dimensions, capture tick, one displayed canvas, and no runtime/error diagnostics. The user accepted their visual equivalence to the approved oracle on 2026-08-26 and froze the exact source and media as the identical starting basis for both agents. The acceptance receipt is `captures/approved/manifest.json`.

Run the fixture capture with:

```bash
node benchmarks/threejs-observatory-instancing/fixture/capture.mjs
```
