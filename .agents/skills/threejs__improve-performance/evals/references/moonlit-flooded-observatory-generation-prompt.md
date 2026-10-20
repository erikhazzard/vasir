# Moonlit Flooded Observatory — Generation Prompt

Create a polished, standalone Three.js technical-art demo titled **“Moonlit Flooded Observatory.”**

Output one complete `index.html` and nothing else. Use Three.js r180 from a pinned CDN with official addons only. It must run without a build step. Use no external models, textures, images, fonts, audio, or other assets.

This is an atmospheric rendering showcase, not a game. Make it feel like an intentional stylized diorama rather than a benchmark grid or random pile of primitives.

## Visual composition

Show a moonlit flooded observatory from a fixed oblique camera:

- one broad circular shallow-water basin;
- 24 dark stone columns and eight low geometric platforms arranged symmetrically;
- luminous signal markers flowing through the ruins in deliberate curved formations;
- an indigo, cyan, violet, coral, and amber palette;
- pale low-lying fog;
- restrained glow rather than excessive bloom or visual clutter.

## Signal-marker population

Render exactly 1,200 animated signal markers divided evenly among five families.

The families use these geometries:

1. `ConeGeometry(0.24, 1.4, 5)`
2. `CylinderGeometry(0.22, 0.30, 1.2, 6)`
3. `IcosahedronGeometry(0.38, 0)`
4. `TorusGeometry(0.34, 0.09, 4, 8)`
5. `BoxGeometry(0.55, 0.85, 0.18)`

Each family has its own material treatment, glow color, and subtle deterministic motion. Use one `THREE.InstancedMesh` per family.

Every family must have a distinct, approximately two-output-pixel screen-space silhouette outline. All five outline colors appear simultaneously, remain stable in width with camera distance, and respect nearer geometry rather than appearing as an x-ray. Do not approximate the outline with enlarged duplicate geometry.

## Water and atmosphere

- Render one continuous animated water surface.
- The water visibly reflects the observatory and signal markers.
- It has shallow-depth tint, subtle distortion, and procedural moving highlights.
- Maintain exactly 64 deterministic expanding ripple impacts in steady state.
- Ripples visibly disturb the water reflection.
- Add spatial, depth-aware distance and low-lying fog. It must not be a uniform screen tint.
- Add restrained bloom to the luminous markers.
- Outlines are required only in the main camera view, not in the reflected view.

## Composition and HUD

Render the 3D world at exactly 0.67 of the output drawing-buffer dimensions.

Add a small native-output-resolution WebGL HUD showing:

- total marker count;
- all five family colors;
- simulation tick;
- world render scale.

The HUD must remain sharp, appear in the same displayed WebGL canvas, and be included by `canvas.toDataURL()`. Do not use a DOM overlay or an additional displayed canvas.

## Runtime behavior

- Use the fixed seed `424242` for all placement and animation phases.
- Advance scene state through one fixed 60 Hz simulation that is independent of display refresh rate. Rendering may interpolate presentation only.
- Keep the camera path, marker motion, ripple evolution, and HUD values deterministic for a given simulation tick.
- Make the canvas responsive in portrait and landscape layouts while preserving correct screen-space widths, water sampling, and HUD sharpness.
- Mark `document.documentElement.dataset.ready = "true"` only after initialization and the first complete frame.

Aim for strong mobile-browser performance while preserving every required visual feature. Do not reduce counts, omit effects, or weaken the visual contract in response to load.
