/**
 * One offline shader bake, sampled by the existing Canvas character renderer.
 * 24 looping 64 px frames; the source atlas owns all fine material/porosity.
 * There is no runtime shader, readback, extra canvas, or independent clock.
 */
const TILE = 64;
const FRAMES = 24;
const COLUMNS = 6;

export function createAshFlow(assets) {
  function available() {
    const image = assets['ash-flow-atlas'];
    return image && image.complete !== false && (image.naturalWidth || image.width) > 0;
  }

  function draw(c, clock, x, y, width, height, phase = 0, crop = false) {
    if (!available()) return false;
    const frame = ((Math.floor(clock * 20 + phase) % FRAMES) + FRAMES) % FRAMES;
    // Dense interior crop on the body; full porous taper on mantle and wake.
    c.drawImage(assets['ash-flow-atlas'], frame % COLUMNS * TILE,
      Math.floor(frame / COLUMNS) * TILE + (crop ? 10 : 0), crop ? 40 : TILE,
      crop ? 44 : TILE, x, y, width, height);
    return true;
  }

  return { available, draw };
}
