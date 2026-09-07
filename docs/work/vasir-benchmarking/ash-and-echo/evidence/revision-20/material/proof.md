# Bounded live material prototype

User-authorized shader architecture expansion; local-change disposition ARCHITECTURE_PROOF_REQUIRED. This isolated prototype supplies desktop visual/lifecycle/cadence evidence for root integration. Whole-game and phone acceptance remain root-owned.

## Contract

`createAshMaterial({ logicalSize: 144 })` returns `render(state)`, `reset()`, `dispose()`, `getDiagnostic()` and `status`. State is reused by caller: time in seconds; morph/impulse/stroke/exposure normally 0–1; velocity in local px/s; bend in local px; seed stable across impulse; lightX/lightY direction; reduced boolean. Returns fixed 256² premultiplied RGBA canvas, or null on failure/loss/disposal. Draw it source-atop across [-72,72]² for shade, then destination-in for real density. Draw eyes separately. Dense center and abs(x)<15 never erode. Head protection interpolates center (3,-4)→(3,-17) with morph. Keep baked/atlas body material only for null fallback; do not overlay it on the live field.

No autonomous animation/timing. Reduced freezes time uniform at zero but stroke/impulse/pose still affect field. Call reset on character reset; it resets counters without reallocating. Context loss returns null until the browser restores that same context. The restoration event rebuilds one program and static quad; failure leaves the fallback active. Fragment highp is queried and mediump is selected when unavailable, with a reduced hash multiplier to retain fractional noise variation. Dispose frees GL buffer/program, releases context, removes listener; repeated calls are harmless.

## Topology

Before: caller-owned Canvas2D body mask and material samples → main Canvas2D body copy.
After: same owner and terminal chain; one additional fixed offscreen WebGL canvas default-framebuffer write, one static quad draw, two small WebGL→Canvas2D copies into existing body surface. Zero full-scene traversal, scene submissions, G-buffers, textures, explicit framebuffer objects, new RAFs, fullscreen world passes or terminal canvases. Offscreen target count +1; GL context/program/buffer +1 each. 256×256 RGBA8 color surface, no depth/stencil/MSAA; browser backing/copy storage is implementation-owned and not included in claimed memory totals. Four value-noise calls per covered fragment, zero texture operations. All varying flow depends on fragment coordinates; all scalar animation inputs are supplied as uniforms.

Frequency follows root's character draw, not particle/entity population. Reuse one material instance per existing hero. Copy is synchronous in the owner's draw sequence; no async worker round trips. A worker would require per-frame transfer/copy and coordination for this small immediate 2D composite, so bounded main-thread submission is retained. Lower192 resolution and reusing baked atlas were considered: atlas cannot advect/dissolve continuously; 256 gives ~1.78samples/logical px for a144square, preserving soft edges when bodyCanvas is2x. Higher sizes are unnecessary. No per-frame allocation/upload/readback in product code. Probe-only readback is outside cadence timing.

## Evidence

Run `node tmp/ash-and-echo/raven-live-pass/material/probe.mjs` with Ash server at http://localhost:8317. Browser is installed Chrome headless, actual ANGLE Metal Apple M5 Pro backend. The mask is a fixed simplified baseline-inspired raven silhouette, **not revision20 authored anatomy**. Sequence PNGs include 2x and native144 logical square examples. Motion is visibly irregular charcoal banks with unequal wing flow and varying outer transparency; eyes remain cream and opaque. The early sinusoid prototype was removed because it read as zebra bands.

`metrics.json`: two baseline/live alternations at ordinary RAF cadence, 10warmup +70retained frames per segment, 140 samples/condition. Baseline draws same fixed Canvas mask/eyes; live adds shader and bothcopies. It compares incremental material workload, not entire revision19 game. CPU submission+2D copy median ~0.1ms both; p95 baseline0.1ms/live0.2ms. RAF p95 latest run16.8ms both. These are coarse CPU timing and cadence, **not GPU timer results**, not a performance improvement or phone/thermal claim.

Exact repeated-clock diff0. At150ms separation 7878 red-channel pixels differ>5 and2247alpha pixels differ>16 in288² body surface. Reduced time2→12 leaves0changed bytes, while changed stroke changes36956bytes. Probe warms pixel reads before reduced comparison because Canvas backend migration after readback otherwise adds one transition's rounding differences; product has no reads.

Counters plateau at1context/1program/1buffer/0textures/0framebuffers through171draws, remain unchanged on reset. Forced WEBGL_lose_context sets context-lost and render null; dispose twice sets context/program/buffer0. Forced WebGL-unavailable creation returns unavailable/null without program/buffer/context allocations. Root still needs to verify fallback selection on integrated character path and final authored native-scale visual fit.

## Restoration follow-up

`restore-probe.mjs` / `restore-metrics.json`: three forced loss→fallback→restoration cycles each retain identical context identity, return to1context/1program/1buffer/0textures/0FBO, and reproduce unchanged-state pixels byte-for-byte (0changed bytes each). Reset preserves resources; repeated dispose returns counters to0. The browser extension restore call is delayed100ms after its loss event so the browser can finish the loss transition. Forced absent highp capability selects and compiles mediump, renders nonuniform pixels (red11–85); this checks routing/source validity on this host, not precision quality on actual limited hardware. No aesthetic change in this follow-up. The previous valid pre-restoration receipt is retained in `metrics-before-restore.json`.
