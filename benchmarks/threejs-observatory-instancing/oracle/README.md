# Moonlit Flooded Observatory Visual Oracle

This look-only oracle is derived from the visually preferred clean-condition generation produced on 2026-08-26.

- Original source: `/tmp/threejs-perf-eval.BMHaXW/without-skill/index.html`
- Original SHA-256: `89916d4ce60f2bbd174cf09d7960a7aeb58366ededf75e44c6f9a5196ffc6c02`
- Intended visual changes: repair the missing WebGL HUD in both orientations, modestly reduce bloom blowout, and add a private fixed-tick capture seam without changing normal animation.
- Fixed seed: `424242`
- Canonical capture tick: `240`

The source still contains five `OutlinePass` instances and a second HUD render into the default framebuffer. Those are known anti-patterns under test and are why this file must never become the matched edit fixture. Only its rendered appearance may become the approved oracle.

Run the local capture:

```bash
node benchmarks/threejs-observatory-instancing/oracle/capture.mjs
```

The command writes only `captures/pending/`. Objective checks cannot approve the look and a rerun cannot silently replace the approved oracle.

Current visual status: **Accepted and frozen** on 2026-08-26 by the user: “awesome yes looks great freeze it”.

Pending basis captured in local Chrome 151 at tick 240:

- Source SHA-256: `c406d5a7af3de4b1d5be5bd077bc861194cdc59207d55744c2b9b13ad5ff7a6f`
- Portrait 900×1600: `0426eced486ae20ddc3d50c7119dbab0731c2eea15ef6b90c405987e640d081d`
- Landscape 1600×900: `d29b968f754c4a0cdaa255edcbccadabf32580425901e679fd9e27d9c9994b69`

Both images were byte-identical across fresh-target repeats and had no runtime, console, or browser-log diagnostics. The exact accepted copies and human receipt are in `captures/approved/manifest.json`.
