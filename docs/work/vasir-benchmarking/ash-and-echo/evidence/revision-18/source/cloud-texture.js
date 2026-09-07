/** Baked mist body / billow / broad variation, adapted from the creator's
 * experiments/fog. Pixel work happens once, never in the animation loop. */
export function createCloudPixels(size = 256) {
  let seed = 1337 ^ 0x9e3779b9;
  const random = () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const fields = Array.from({ length: 7 }, (_, octave) => {
    const width = 4 << octave;
    return { width, values: Float32Array.from({ length: width * width }, random) };
  });
  const smooth = x => x * x * (3 - 2 * x);
  function value(octave, u, v) {
    const { width, values } = fields[octave];
    const x = ((u % 1) + 1) % 1 * width, y = ((v % 1) + 1) % 1 * width;
    const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
    const x1 = (ix + 1) % width, y1 = (iy + 1) % width;
    const a = values[iy * width + ix], b = values[iy * width + x1];
    const c = values[y1 * width + ix], d = values[y1 * width + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  const pixels = new Uint8Array(size * size * 4);
  const norm = (1 - .55 ** 7) / (1 - .55) * .5;
  const billowNorm = (1 - .5 ** 7) / (1 - .5) * .5;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const wx = value(1, u + .37, v) - .5, wy = value(1, u, v + .71) - .5;
    let body = 0, billow = 0, a = .5, b = .5;
    for (let octave = 0; octave < 7; octave++) {
      const n = value(octave, u + wx * .07, v + wy * .07);
      body += n * a; a *= .55;
      billow += (1 - Math.abs(2 * n - 1)) * b; b *= .5;
    }
    const i = (y * size + x) * 4;
    pixels[i] = smooth(Math.max(0, Math.min(1, (body / norm - .18) / .64))) * 255;
    pixels[i + 1] = (billow / billowNorm) ** 2 * 255;
    pixels[i + 2] = (value(0, u, v) * .6 + value(1, u, v) * .4) * 255;
    pixels[i + 3] = 255;
  }
  return pixels;
}
