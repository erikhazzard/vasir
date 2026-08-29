# Three.js + Rapier Hot-Path Guard Eval

This suite checks whether `code__threejs-rapier-performance` changes a planned mobile-rendering decision from locally plausible optimization to bounded render-topology architecture, explicit shader execution cardinality, and valid whole-frame counters.

The core contract is structural, not timing-dependent. For a batching-only change, content cardinality may change instance and draw data but must not silently multiply full-scene passes, full-resolution targets, attachments, or frame/output owners. The treatment must block the exact five-G-buffer-per-enemy-type defect and the independently owned `HudRenderer` terminal-output path, generalize through renamed helpers to any undeclared cardinality fan-out, and still allow fixed centrally owned multipass rendering. It must distinguish a WebGPU render pass targeting the current canvas texture from a second browser presentation.

The cases also exercise positive, negative, and borderline routing; the diagnosis → guard → verification boundary for an observed symptom; draw-invariant shader work requested again by each covered fragment invocation; `WebGLRenderer.info` aggregation across multiple render calls; and attention drift under a long otherwise-correct mobile-performance brief. Hard substring checks are only a semantic floor. The suite-level judge rejects keyword cosplay, advice that waits for FPS before recognizing a deterministic architecture violation, and blanket rules that treat every additional pass as invalid.

Run the structural smoke test locally:

```bash
npm run eval -- code__threejs-rapier-performance mock --trials 1
```

A live-model run is required for the behavioral verdict. Mock mode proves suite discovery, baseline/treatment wiring, and result persistence only.

Current limit: the suite supplies deterministic source facts and evaluates static architecture, shader-cardinality, and instrumentation judgment. It does not capture a browser frame, execute the proposed counters, measure GPU cost, or prove visual equivalence.

For realistic defect-discovery A/Bs rather than inline topology cases, use one of the manual static-audit fixtures:

- [`fixtures/fog/index.html`](fixtures/fog/index.html), with provenance and isolation rules in [`fixtures/fog/README.md`](fixtures/fog/README.md)
- [`fixtures/water-ripples/index.html`](fixtures/water-ripples/index.html), with provenance and isolation rules in [`fixtures/water-ripples/README.md`](fixtures/water-ripples/README.md)

These fixtures test static prioritization and falsifier quality; they still cannot establish a demo's runtime bottleneck.

For paired code-generation evaluation, use [`references/moonlit-flooded-observatory-generation-prompt.md`](references/moonlit-flooded-observatory-generation-prompt.md). It fixes one asset-free visual workload while leaving render topology and implementation choices undisclosed; generated artifacts require separate feature-equivalence, runtime, and crossed static-audit evaluation.
