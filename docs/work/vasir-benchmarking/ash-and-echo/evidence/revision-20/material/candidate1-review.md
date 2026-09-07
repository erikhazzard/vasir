# Candidate 1 shader and integration review

Read-only review; no browser launched and no production changes. Candidate1 shader equals current shader.

| Artifact | SHA-256 |
|---|---|
| site/ash-and-echo/ash-material.js | 957aad77e5dd913715ba5c45352a3d1fdfd442f47ab579e75d01b2e0a7e89662 |
| site/ash-and-echo/character.js | 9b980f0d74b73d2b9652ef792c652d0b4abf505d5dbcaf9776123727b173686b |
| material/metrics.json | 9438ce16a01cabf72b531a4fefcda112eff943a5ffd3731c59c42e6f00893a11 |
| material/restore-metrics.json | 33bc88c7a8377520ffaea6ab1128aa67fa772ba6e4baf5b6dee4a9d16504c7e3 |

## Topology and cardinality

One character-owned material instance contributes one fixed256² WebGL default-framebuffer write per living-character draw. Four-vertex triangle strip, no depth/stencil/MSAA, no explicit framebuffer objects/textures. Existing main frame owner schedules it; no own RAF or clock. The existing bodyCanvas grows224²→288² with author geometry; two144logical-square WebGL canvas samples add source-atop shade and destination-in density, then the existing body→main copy presents through the same terminal chain. Counts are per visible living hero frame, not particle/material population. The diagnostic `framebuffers:0` counts explicit framebuffer objects; it does **not** mean zero target writes.

Shader source has four fragment-dependent value-noise calls, each four hash sine evaluations:16hash-sines plus2flow-sines per covered fragment, one normalize and one pow. Zero texture operations, no loops, derivatives, dynamic branching or readback. At full256²coverage, source invocation scaling is4×65536noise evaluations (not GPU cycles or physical transactions). Noise inputs depend on fragment p/q, so no coarser equivalent producer is available without adding storage/approximation. Scalar travel/light strengths depend on uniforms; these are inexpensive scalar arithmetic, not repeated textures or scene work. All flow calculations feed shade even when morph=0, therefore a morph-only guard would incorrectly freeze living body shading. Fragment coverage is fixed independently of particles and wing count.

No per-render JS allocation: eight scalar uniform writes, one vec2 write, one draw, increment diagnostic counter, return same canvas. Setup/restoration alone compile shaders and upload static quad. getDiagnostic returns a reused record; character's public materialState copies on explicit observation, outside shader hot path. No memory timing claim is inferred from counters.

## API integration

Character reuses shaderState and supplies presentation clock, morph, force, normalized downstroke channel4, facing-adjusted velocity, bend, seed, directional light/exposure, reduced flag. The body mask and both live composites use the same nucleus transform. Baked hero samples and atlas body overlay execute only for null fallback. Eyes are separate. abs(x)<15 has exactly1alpha; the face protection interpolates y−4→−17. Existing path erosion still acts separately. reset preserves GPU resources; character exposes dispose.

Current lifecycle truth supersedes the first prototype's permanent-loss fallback: on loss, render returns null; browser restoration rebuilds one program and buffer on the **same context**, restores ready status and rendering. Failure returns restore-failed/null. Fragment highp capability selects mediump when absent; shader hash multiplier is reduced for that path. Three restoration cycles in restore-metrics each keep sameContext=true, pausedChangedBytes=0 and restored1context/1program/1buffer/0textures/0FBO. Final dispose zeroes resources. Mediump routing compiles on host and has red range11–85; actual limited-precision mobile hardware remains untested.

## Evidence scope and aesthetic judgment

Earlier ordinary-RAF probe uses a simplified fixed raven mask, not final character anatomy. It measures CPU submission plus2Dcopies p95 baseline0.1/live0.2ms, and latest RAFp95both16.8ms,140samples each. Exact frozen pixel comparison0;150ms separation changes7878red pixels>5 and2247alpha pixels>16. The initial reduced readback comparison was polluted by Canvas backend migration after repeated getImageData; warming that transition yields0changed bytes for time2→12 and36956bytes for stroke change. These are desktop Chrome/ANGLE Metal Apple M5 Pro receipts, not GPU elapsed-time or mobile/thermal evidence.

No final aesthetic acceptance is asserted here. Isolated broad bands can read satin because brightness and erosion share ridge maxima, exposing pale background next to brighter soot. If integrated critique confirms that reading, first candidate would reduce bright-sheet contribution in the dense core and decouple high-density matte streaks from outer erosion peaks. Do not tune from the enlarged isolated mask alone. Root/critic owns native-size integrated motion acceptance.

Disposition remains the explicitly authorized architecture expansion with bounded desktop prototype evidence; do not relabel it a local performance optimization or infer phone headroom. Final integrated fallback/restore selection, authored silhouette, and product motion evidence remain root-owned.
