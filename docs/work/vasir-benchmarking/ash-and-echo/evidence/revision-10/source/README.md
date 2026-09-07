# Ash & Echo

A small portrait ascent through a monochrome Gothic world. Move, wall-kick, and double-jump from the hollow to the belfry. A refuge halfway up remembers your progress through falls.

From the repository root:

```sh
python3 -m http.server 8317 --bind 0.0.0.0 --directory site/ash-and-echo
```

Open `http://localhost:8317/`. A phone on the same network can use the computer's LAN address and port 8317. The directory is also a self-contained static site: no build step, package install, remote font, or runtime service is required.

**Controls:** A/D or arrow keys to move; Space, W, or Up to jump. Hold for height; press again in the air for one double jump. Push into a wall while falling to slide, then jump to kick away. Mobile uses the two steering buttons and the jump button simultaneously. Escape pauses, M toggles sound, and R restarts. The pause screen includes gentler effects.

`game.js` owns fixed-step simulation, `renderer.js` paints Canvas layers and effects, `audio.js` synthesizes sound after the first gesture, and `main.js` connects browser input and the interface. Best ascent time is stored only in the browser. The local diagnostic object `window.__echo` supports reproducible inspection and input captures; it is not a score-verification boundary.

Run the retained movement and complete-route checks with:

```sh
node --test test/ash-and-echo.test.js
```

This is an iteratively developed Vasir reference, not a controlled benchmark submission. Build and review evidence is summarized in [the work spec](../../docs/work/vasir-benchmarking/ash-and-echo/work-spec.md).
