# Primary sources and version caveats

Technical reference baseline: **October 13, 2026**. Budgets and production rules are
our opinionated house rules—not engine limits, prescriptions from these sources,
or measured project results. Suggested LOD percentages and update-rate tiers are
starting experiments; validate them against the target experience and hardware.

Three.js documentation and `dev` source links are moving references. At application time,
inspect the project's locked revision and generated shader/backend. These house rules are not
a claim that the user's repository uses the same revision. No project repository, assets,
headset traces, or performance measurements were supplied or inspected for this artifact.

## Geometry, avatars, and rendering

- **S1 — BufferGeometry:** attributes, index, draw range, and separate draw groups.
  [Three.js documentation](https://threejs.org/docs/pages/BufferGeometry.html)
- **S2 — SkinnedMesh:** skeleton binding and CPU bounds/raycast vertex evaluation.
  [Documentation](https://threejs.org/docs/pages/SkinnedMesh.html) ·
  [Implementation](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/objects/SkinnedMesh.js)
- **S3 — InstancedMesh:** shared geometry/material and per-instance data.
  [Documentation](https://threejs.org/docs/pages/InstancedMesh.html)
- **S4 — Stock WebGL skinning chunks:** four matrix fetches; weighted position and
  normal/tangent transforms. The weight-pruning warning follows directly from this code.
  [Matrix fetches](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/shaders/ShaderChunk/skinbase_vertex.glsl.js) ·
  [Position](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/shaders/ShaderChunk/skinning_vertex.glsl.js) ·
  [Normals](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/shaders/ShaderChunk/skinnormal_vertex.glsl.js)
- **S5 — Skeleton:** CPU preparation of bone matrices and bone-texture updates.
  [Implementation](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/objects/Skeleton.js)
- **S6 — LOD:** levels, visibility selection, and hysteresis.
  [Documentation](https://threejs.org/docs/pages/LOD.html)
- **S7 — WebGLRenderer:** counters/reset scope, object-count memory reporting,
  animation-loop integration, and shader compilation.
  [Documentation](https://threejs.org/docs/pages/WebGLRenderer.html)
- **S8 — Batching:** compatible-material batching and geometry consolidation.
  [BatchedMesh](https://threejs.org/docs/pages/BatchedMesh.html) ·
  [Optimize Lots of Objects](https://threejs.org/manual/pages/optimize-lots-of-objects.html)

## Textures, materials, and light

- **S9 — Textures:** decoded memory versus download size, mipmaps, filtering.
  [Three.js manual](https://threejs.org/manual/pages/textures.html)
- **S10 — KTX2Loader:** support detection and Basis transcoding.
  [Documentation](https://threejs.org/docs/pages/KTX2Loader.html)
- **S11 — Cleanup:** explicit GPU-resource lifecycle management.
  [Three.js manual](https://threejs.org/manual/pages/cleanup.html)
- **S12 — glTF 2.0:** metallic/roughness and occlusion channel semantics, base-color
  alpha, and normal-texture encoding. Custom packing proposals are not stock glTF.
  [Khronos specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)
- **S13 — Color management:** color textures versus non-color data and linear shading.
  [Three.js manual](https://threejs.org/manual/pages/color-management.html)
- **S14 — Material-map sampling:** separate expressions in the inspected shader chunks;
  actual optimized GPU execution must be verified rather than inferred from image count.
  [Roughness](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/shaders/ShaderChunk/roughnessmap_fragment.glsl.js) ·
  [Metalness](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/shaders/ShaderChunk/metalnessmap_fragment.glsl.js)
- **S15 — Material:** sidedness, transparent double-sided passes, forceSinglePass,
  shader invalidation, and custom program cache keys.
  [Documentation](https://threejs.org/docs/pages/Material.html)
- **S16 — MeshStandardMaterial:** maps, scalar factors, and lightmap requirements.
  [Documentation](https://threejs.org/docs/pages/MeshStandardMaterial.html)
- **S17 — Lighting shader:** ambient, directional, and hemisphere contributions;
  these fill terms are not separate shadow-render passes.
  [Implementation](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/shaders/ShaderChunk/lights_pars_begin.glsl.js)
- **S18 — MeshLambertMaterial:** current per-fragment shading, not vertex lighting.
  [Documentation](https://threejs.org/docs/pages/MeshLambertMaterial.html) ·
  [Shader](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/shaders/ShaderLib/meshlambert.glsl.js)

## XR and profiling

- **S19 — WebXRManager:** per-view camera data, foveation, and session-time constraints
  on framebuffer scale changes.
  [Documentation](https://threejs.org/docs/pages/WebXRManager.html)
- **S20 — Common renderer XR/multiview:** support-dependent multiview and renderer options.
  [XRManager](https://threejs.org/docs/pages/XRManager.html) ·
  [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)
- **S21 — OVR_multiview2:** layered view rendering and view-specific shader outputs.
  [Khronos extension specification](https://registry.khronos.org/webgl/extensions/OVR_multiview2/)
- **S22 — WebXR Device API:** window-exposed session/frame interfaces and XR frame loop.
  [Immersive Web specification](https://immersive-web.github.io/webxr/)
- **S23 — GPU timing:** asynchronous query results and disjoint validation.
  [Khronos EXT_disjoint_timer_query_webgl2](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/)
- **S24 — Profiling and allocations:** actual trace events and memory investigation.
  [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/reference) ·
  [Chrome DevTools memory problems](https://developer.chrome.com/docs/devtools/memory-problems)

## Physics

- **S25 — Rapier colliders:** primitives, standalone colliders, convex meshes, fixed
  triangle meshes, heightfields, collision groups, and dynamic-trimesh cautions.
  [Official user guide](https://rapier.rs/docs/user_guides/javascript/colliders/)
- **S26 — Rapier rigid bodies:** fixed/kinematic/dynamic distinctions, sleeping, and CCD.
  [Official user guide](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/)

Networking tiers and architecture guidance are proposed engineering policy, not a
benchmark or a promise that any given transport/rate meets a particular latency target.
