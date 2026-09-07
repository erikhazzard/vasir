/** Four visible material silhouettes, supplied to the existing scenery draws.
 * Soft projection is a bounded 2.5D treatment, not a shadow-map render pass. */
import { CATHEDRAL_LIGHTS, lightFrom, sampleLight } from './lighting.js';

export function createShadowCasters() {
  const data = new Float32Array(16);
  const weights = new Float32Array(4);
  const receiving = new Float32Array(16);
  const exposure = new Float32Array(4);
  const packed = { air: data, receiving, exposure };
  const ids = ['', '', '', ''];
  function add(id, x, y, rx, ry, camera, height, preference = 1) {
    if (y < camera - 260 || y > camera + height + 50) return;
    const exposure = Math.max(sampleLight(x, y), sampleLight(x - rx * .7, y), sampleLight(x + rx * .7, y));
    if (exposure < .025) return;
    const weight = exposure * preference / (1 + Math.abs(y - camera - height * .55) / height);
    let slot = 0;
    for (let i = 1; i < 4; i++) if (weights[i] < weights[slot]) slot = i;
    if (weight <= weights[slot]) return;
    weights[slot] = weight; ids[slot] = id;
    data[slot * 4] = x; data[slot * 4 + 1] = y;
    data[slot * 4 + 2] = rx; data[slot * 4 + 3] = ry;
  }
  return {
    data,
    update(game, bells, height, reduced) {
      data.fill(0); weights.fill(0); ids.fill('');
      for (const p of game.platforms) {
        if (!p.suspension && p.kind !== 'checkpoint' && p.kind !== 'summit') continue;
        add(p.id, p.x + p.w * .5, p.y + 13, p.w * .46, 16, game.cameraY, height);
      }
      for (let i = 0; i < bells.length; i++) {
        const b = bells[i];
        if (b.age !== undefined && !b.platform) continue;
        const a = reduced ? b.angle * .25 : b.angle, scale = b.size / 94.4;
        const dx = b.platform?.suspension?.x || 0, dy = b.platform?.suspension?.y || 0;
        add('bell-' + i, b.x + dx - Math.sin(a) * 48 * scale,
          b.y + dy + Math.cos(a) * 48 * scale, 47 * scale, 46 * scale, game.cameraY, height, 1.4);
      }
      receiving.fill(0); exposure.fill(0);
      for (let i = 0; i < 4; i++) {
        const k = i * 4, x = data[k], y = data[k + 1], rx = data[k + 2];
        if (!rx) continue;
        let source = null, strongest = 0;
        for (const light of CATHEDRAL_LIGHTS) {
          const value = Math.max(lightFrom(light, x, y), lightFrom(light, x - rx * .7, y), lightFrom(light, x + rx * .7, y));
          if (value > strongest) { strongest = value; source = light; }
        }
        const dx = x - source.x, dy = y - source.y, distance = Math.hypot(dx, dy);
        receiving[k] = x + dx / distance * 62;
        receiving[k + 1] = y + dy / distance * 62;
        receiving[k + 2] = rx * 1.12;
        receiving[k + 3] = data[k + 3] * 1.12;
        exposure[i] = strongest;
      }
      return packed;
    },
    get state() { return ids.map((id, i) => ({ id, bounds: Array.from(data.subarray(i * 4, i * 4 + 4)) })); },
  };
}

export const CAST_SHADOW_GLSL = `
  uniform vec4 uCasters[4];
  uniform vec4 uReceivingCasters[4];
  uniform vec4 uCasterExposure;
  // Air receives the soft cone behind an actual silhouette, downstream from
  // the masonry aperture. Nothing changes the fog's density or wind field.
  float shadowInAir(vec2 point, vec4 opening) {
    vec2 ray = point - opening.xy;
    float rayLength = length(ray);
    float darkness = 0.0;
    for (int i = 0; i < 4; i++) {
      vec4 caster = uCasters[i];
      if (caster.z < 1.0) continue;
      vec2 radius = caster.zw;
      vec2 origin = (opening.xy - caster.xy) / radius;
      vec2 direction = ray / radius;
      float t = -dot(origin, direction) / max(dot(direction, direction), .001);
      float behind = (1.0 - t) * rayLength;
      if (t <= 0.0 || t >= 1.0) continue;
      float miss = (length(origin + direction * t) - 1.0) * min(radius.x, radius.y);
      float softness = 2.5 + behind * .042;
      float shape = 1.0 - smoothstep(-softness, softness, miss);
      darkness = max(darkness, shape * smoothstep(0.0, 22.0, behind)
        * (1.0 - smoothstep(100.0, 350.0, behind)));
    }
    return darkness;
  }
  // The selected middle masonry is the receiving plane. Its finite projected
  // footprint preserves a visible gap between slab and bell shadows.
  float shadowOnStone(vec2 point) {
    float darkness = 0.0;
    for (int i = 0; i < 4; i++) {
      vec4 caster = uReceivingCasters[i];
      if (caster.z < 1.0) continue;
      float miss = (length((point - caster.xy) / caster.zw) - 1.0) * min(caster.z, caster.w);
      darkness = max(darkness, (1.0 - smoothstep(-4.0, 8.0, miss)) * uCasterExposure[i]);
    }
    return darkness;
  }
`;
