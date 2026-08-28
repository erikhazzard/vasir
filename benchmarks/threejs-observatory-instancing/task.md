The provided single-file Three.js demo currently creates 1,200 signal markers as individual Mesh objects across five existing marker families. Change those markers to simple instanced rendering: exactly one THREE.InstancedMesh per existing marker family.

Preserve the current observable demo, including marker shapes, colors, outlines, deterministic motion, marker and ripple counts, fixed seed and capture tick, fog, water and reflections, HUD, camera composition, and responsive portrait and landscape framing. Do not reduce the workload, remove visual features, or redesign the scene. Keep the demo single-file and runnable with its existing imports.

Make the change in index.html. When finished, briefly state what you changed and what you verified.
