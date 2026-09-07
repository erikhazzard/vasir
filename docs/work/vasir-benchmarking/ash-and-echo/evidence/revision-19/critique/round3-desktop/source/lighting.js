/** Fixed cathedral openings. Stone, iron, ash and air share these coordinates. */
export const CATHEDRAL_LIGHTS = Object.freeze([
  { x: 365, y: 4240, slope: -.91, width: 18 },
  { x: 365, y: 3780, slope: -.31, width: 18 },
  { x: 55, y: 3310, slope: .80, width: 19 },
  { x: 55, y: 2778, slope: .51, width: 16 },
  { x: 365, y: 2476, slope: .04, width: 16, horizontal: true },
  { x: 55, y: 2416, slope: .864, width: 23 },
  { x: 365, y: 1802, slope: -.85, width: 18 },
  { x: 55, y: 1318, slope: .75, width: 19 },
  { x: 55, y: 846, slope: .74, width: 16 },
  { x: 365, y: 368, slope: -.82, width: 21 },
  { x: 365, y: 38, slope: -.69, width: 22 },
].map(Object.freeze));

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
export const LIGHT_REACH = 460;
export const lightTop = opening => opening.horizontal ? opening.y - opening.width - 26 : opening.y;
export const lightBottom = opening => opening.horizontal ? opening.y + opening.width + 26 + Math.max(0,opening.slope)*LIGHT_REACH : opening.y + LIGHT_REACH;

export function lightFrom(opening, x, y) {
  const down = opening.horizontal ? (x - opening.x) * (opening.x < 210 ? 1 : -1) : y - opening.y;
  if (down <= 0 || down >= LIGHT_REACH) return 0;
  const across = opening.horizontal ? y - opening.y : x - opening.x;
  const cross = (across - down * opening.slope) / (opening.width + down * .055);
  const edge = smooth((1 - Math.abs(cross)) / .32);
  // A narrow mullion divides the opening into unequal light ribbons. It is
  // fixed architecture, never a time-varying stripe or player-driven noise.
  const mullion = 1 - .56 * (1 - smooth(Math.abs(cross - .12) / .10));
  return edge * mullion * smooth(down / 25) * (1 - smooth(down / LIGHT_REACH));
}

export function sampleLight(x, y) {
  let value = 0;
  for (const opening of CATHEDRAL_LIGHTS) value = Math.max(value, lightFrom(opening, x, y));
  return value;
}

// Same arithmetic as lightFrom, with four visible fixtures selected once per
// frame. No additional sampler, noise evaluation, pass or image upload.
export const LIGHT_GLSL = `
  float openingLight(vec2 point, vec4 opening) {
    bool horizontal = opening.w < 0.0;
    float down = horizontal ? (point.x-opening.x)*(opening.x<210.0?1.0:-1.0) : point.y-opening.y;
    if (down <= 0.0 || down >= 460.0) return 0.0;
    float across = horizontal ? point.y-opening.y : point.x-opening.x;
    float cross = (across-down*opening.z)/(abs(opening.w)+down*.055);
    float edge = smoothstep(0.0,.32,1.0-abs(cross));
    float mullion = 1.0-.56*(1.0-smoothstep(0.0,.10,abs(cross-.12)));
    return edge*mullion*smoothstep(0.0,25.0,down)*(1.0-smoothstep(0.0,460.0,down));
  }
`;

const ironColors = Array.from({ length: 32 }, (_, index) => {
  const value = Math.round(42 + index / 31 * 137);
  return `rgb(${value},${value + 1},${value - 4})`;
});
export function litIron(value) { return ironColors[Math.round(clamp(value) * 31)]; }
