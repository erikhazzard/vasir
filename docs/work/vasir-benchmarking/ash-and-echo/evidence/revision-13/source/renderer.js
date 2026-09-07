/**
 * Ash & Echo · A painted world, with simulation-owned contact surfaces.
 * All caches and effects are presentation state. The game is only ever read.
 */
import { createCharacter } from './character.js';
import { createDepth } from './depth.js';
import { createAtmosphere } from './atmosphere.js';
import { createSurfaceAsh } from './surface-ash.js';
import { createShadowCasters } from './cast-shadows.js';
import { CATHEDRAL_LIGHTS, LIGHT_REACH, sampleLight, litIron } from './lighting.js';

const WORLD_WIDTH = 420;
const IMPACT_LIMIT = 5;
const WALL_BLEED = IMPACT_LIMIT + 3;
const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const fract = n => n - Math.floor(n);
const hash = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const mod = (n, m) => ((n % m) + m) % m;

// One broad span recoil is the readable weight cue; the smaller arrival wave
// adds iron chatter. Both are finite contact responses with exact fixed ends.
function cableBow(t, age, strength, direction, side) {
  if (t <= 0 || t >= 1 || age >= 1.4) return 0;
  const localAge = age - (1 - t) * .17;
  const traveling = localAge > 0 ? Math.sin(localAge * 23) * Math.exp(-localAge * 5.4) : 0;
  const reflectedAge = age - .17 - t * .17;
  const reflected = reflectedAge > 0 ? Math.sin(reflectedAge * 23) * Math.exp(-reflectedAge * 6) * -.42 : 0;
  const spanAge = Math.max(0, age - (side > 0 ? .035 : 0));
  const fade = clamp((1.35 - age) / .5, 0, 1);
  const settle = fade * fade * (3 - 2 * fade);
  const recoil = Math.sin(spanAge * 7.1) * Math.exp(-spanAge * 1.9) * 48 * side * settle;
  return Math.sin(Math.PI * t) * clamp(strength * (recoil + (traveling + reflected) * direction * 7), -25, 25);
}

function surface(width, height, scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  const context = canvas.getContext('2d');
  context.scale(scale, scale);
  return { canvas, context, width, height };
}

function available(image) {
  return image && (image.naturalWidth || image.width) > 0 && image.complete !== false;
}

function arch(context, x, y, width, height) {
  context.moveTo(x, y + height);
  context.lineTo(x, y + width * 0.68);
  context.bezierCurveTo(x, y + width * 0.32, x + width * 0.22, y + width * 0.18, x + width / 2, y);
  context.bezierCurveTo(x + width * 0.78, y + width * 0.18, x + width, y + width * 0.32, x + width, y + width * 0.68);
  context.lineTo(x + width, y + height);
}

export function createRenderer(canvas, assets = {}) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const atmosphere = createAtmosphere(document.getElementById('atmosphere-canvas'));
  const character = createCharacter(assets);
  const depth = createDepth(assets, atmosphere);
  const surfaceAsh = createSurfaceAsh();
  const shadowCasters = createShadowCasters();
  let cssWidth = 420;
  let cssHeight = 740;
  let pixelRatio = 1;
  let height = 740;
  let reducedMotion = false;
  let clock = 0;
  let lastTime = -1;
  let lastState = '';
  let scrapeTime = 0;
  const impact = { x: 0, y: 0, vx: 0, vy: 0 };
  let deathMark = null;
  let textureVersion = null;
  let kitVersion = null;
  let kit = null;
  let artScale = 2;
  let shrineVersion = null;
  let shrineFrame = null;
  let spiderVersion = null;
  let spiderFrame = null;
  let spiderLegs = null;
  let bellVersion = null;
  let bellBody = null;
  let bellClapper = null;
  const platformCache = new Map();
  const wallCache = new Map();
  const hazardCache = new Map();
  const chainCache = new Map();
  const riggingCache = new Map();
  const cages = new Map();
  let sceneryPlatforms = null;
  const resonantBell = { x: 0, y: 0, size: 42, angle: 0, velocity: 0, clapper: 0, clapperVelocity: 0, platform: null, age: 10, strength: 0, direction: 1 };
  const bells = [
    { x: 210, y: 2458, size: 48, angle: 0, velocity: 0, clapper: 0, clapperVelocity: 0 },
    { x: 210, y: 248, size: 48, angle: 0, velocity: 0, clapper: 0, clapperVelocity: 0 },
    resonantBell,
  ];
  const spiders = [
    { x: -18, y: 3880, scale: 1, lookX: 0, lookY: 0, alert: 0 },
    { x: 422, y: 2015, scale: -.83, lookX: 0, lookY: 0, alert: 0 },
  ];
  const particles = Array.from({ length: 128 }, () => ({ life: 0, total: 0, x: 0, y: 0, vx: 0, vy: 0, r: 0, angle: 0, spin: 0, kind: 0 }));
  const rings = Array.from({ length: 5 }, () => ({ life: 0, total: 0, x: 0, y: 0, kind: 0 }));
  let particleCursor = 0;
  let ringCursor = 0;
  let randomState = 0x719bb501;
  function random() {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 4294967296;
  }

  const glowSprite = surface(160, 160);
  const glow = glowSprite.context.createRadialGradient(80, 80, 1, 80, 80, 80);
  glow.addColorStop(0, 'rgba(255,254,239,.96)');
  glow.addColorStop(.12, 'rgba(250,249,226,.48)');
  glow.addColorStop(.48, 'rgba(241,241,222,.12)');
  glow.addColorStop(1, 'rgba(241,241,222,0)');
  glowSprite.context.fillStyle = glow;
  glowSprite.context.fillRect(0, 0, 160, 160);

  const lightShaft = surface(192, 512);
  {
    const c = lightShaft.context;
    const air = c.createLinearGradient(0, 0, 0, 512);
    air.addColorStop(0, 'rgba(239,238,221,0)');
    air.addColorStop(.22, 'rgba(239,238,221,.20)');
    air.addColorStop(.66, 'rgba(239,238,221,.13)');
    air.addColorStop(1, 'rgba(239,238,221,0)');
    c.filter = 'blur(12px)'; c.fillStyle = air;
    c.beginPath(); c.moveTo(142, 0); c.lineTo(174, 0);
    c.lineTo(82, 512); c.lineTo(8, 512); c.closePath(); c.fill();
  }

  function resetEffects() {
    lastTime = -1; lastState = '';
    for (const p of particles) p.life = 0;
    for (const p of rings) p.life = 0;
    scrapeTime = 0;
    impact.x = impact.y = impact.vx = impact.vy = 0;
    character.reset();
    surfaceAsh.reset();
    depth.reset?.();
    for (const cage of cages.values()) cage.angle = cage.velocity = 0;
    for (const rigging of riggingCache.values()) rigging.age = 10;
    for (const bell of bells) bell.angle = bell.velocity = bell.clapper = bell.clapperVelocity = 0;
    resonantBell.age = 10;
    for (const spider of spiders) spider.lookX = spider.lookY = spider.alert = 0;
    deathMark = null;
  }

  function resize(nextWidth, nextHeight, dpr = 1) {
    cssWidth = Math.max(1, nextWidth);
    cssHeight = Math.max(1, nextHeight);
    pixelRatio = clamp(dpr, 1, 2);
    height = cssHeight * WORLD_WIDTH / cssWidth;
    canvas.width = Math.round(cssWidth * pixelRatio);
    canvas.height = Math.round(cssHeight * pixelRatio);
    depth.resize(height);
    atmosphere?.resize(cssWidth, cssHeight, pixelRatio, height);
    const nextArtScale = Math.min(4, Math.max(2, cssWidth / WORLD_WIDTH * pixelRatio));
    if (Math.abs(nextArtScale - artScale) > .1) {
      artScale = nextArtScale; platformCache.clear(); wallCache.clear();
    }
  }

  function prepareKit() {
    if (!available(assets['charcoal-architecture']) || kitVersion === assets['charcoal-architecture']) return;
    kitVersion = assets['charcoal-architecture'];
    kit = surface(kitVersion.naturalWidth, kitVersion.naturalHeight);
    const c = kit.context;
    c.drawImage(kitVersion, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(8,11,14,.22)';
    c.fillRect(0, 0, kit.width, kit.height);
    c.globalCompositeOperation = 'source-over';
    platformCache.clear(); wallCache.clear(); shrineVersion = null;
  }

  function buildPlatform(p, index) {
    const pad = 16, top = 12;
    if ((p.kind === 'checkpoint' || p.kind === 'summit') && available(assets['charcoal-refuge'])) {
      const width = p.w + (p.kind === 'checkpoint' ? 28 : 0);
      const sx = width / 1440, sy = sx * 1.1;
      const item = surface(p.w + pad * 2, 635 * sy + top + 14, artScale), c = item.context;
      c.drawImage(assets['charcoal-refuge'], 15, 180, 1500, 635,
        pad - (width - p.w) / 2 - 33 * sx, top - 29 * sy, 1500 * sx, 635 * sy);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(8,11,14,.30)'; c.fillRect(0, 0, item.width, item.height);
      c.globalCompositeOperation = 'source-over';
      item.x = -pad; item.y = -top;
      return item;
    }
    const side = p.structure === 'left-corbel' || p.structure === 'arch' ? -1 : p.structure === 'right-corbel' ? 1 : p.x <= 61 ? -1 : p.x + p.w >= 359 ? 1 : 0;
    const isFloor = p.kind === 'floor';
    const pier = p.support?.type === 'plinth';
    const sanctuary = p.structure === 'arch';
    const leftExtension = (side < 0 || sanctuary) ? Math.max(0, p.x - 60) : 0;
    const rightExtension = side > 0 ? Math.max(0, 360 - p.x - p.w) : 0;
    const embedded = side && !isFloor ? 10 : 0;
    const region = side ? [40, 80, 740, 315] : [825, 100, 665, 300];
    const left = side ? 61 : 843, right = side ? 761 : 1470;
    const contactY = side ? 101 : 121;
    const sx = (p.w + embedded) / (right - left);
    const sy = sx * (p.kind === 'checkpoint' ? .66 : side ? .86 + hash(index * 13) * .25 : .44 + (Math.floor(index / 3) % 3) * .25);
    const supportHeight = pier ? p.support.bottom - p.y + 5 : sanctuary ? 94 : p.structure?.endsWith('corbel') ? 68 : 0;
    const item = surface(p.w + pad * 2 + leftExtension + rightExtension, Math.max(supportHeight + top, isFloor ? p.h + 22 : region[3] * sy + top + 18), artScale);
    const c = item.context;
    c.translate(pad + leftExtension, top);
    if (pier || sanctuary || p.structure?.endsWith('corbel')) {
      // Painted structure is cached with its contact stone. The opening pier
      // uses the simulation's solid prism; corbels grow back into their wall.
      c.beginPath();
      if (pier) {
        const bottom = p.support.bottom - p.y;
        c.moveTo(0, 2); c.lineTo(p.w, 2); c.lineTo(p.w, bottom + 2);
        c.lineTo(0, bottom + 2);
      } else if (sanctuary) {
        c.moveTo(-leftExtension - 4, 35); c.lineTo(-leftExtension * .54, 22);
        c.lineTo(3, 6); c.lineTo(p.w * .65, 8); c.lineTo(p.w * .51, 23);
        c.bezierCurveTo(p.w * .24, 36, -leftExtension * .08, 62, -leftExtension - 4, 78);
      } else if (side < 0) {
        c.moveTo(-leftExtension - 5, 2); c.lineTo(p.w - 3, 4);
        c.lineTo(p.w * .67, 24); c.lineTo(p.w * .46, 27);
        c.lineTo(p.w * .3, 38); c.lineTo(-leftExtension - 5, 55);
      } else {
        c.moveTo(3, 4); c.lineTo(p.w + rightExtension + 5, 2);
        c.lineTo(p.w + rightExtension + 5, 55); c.lineTo(p.w * .7, 38);
        c.lineTo(p.w * .54, 27); c.lineTo(p.w * .33, 24);
      }
      c.closePath(); c.save(); c.clip();
      c.fillStyle = '#090e12'; c.fillRect(-leftExtension - 5, 0, item.width, item.height);
      if (kit) {
        // The same fractured charcoal face as the ledge above; masonry tiles
        // made these short load paths look like a separate pasted-on material.
        c.drawImage(kit.canvas, 138, 132, 480, 215,
          -leftExtension, 3, p.w + leftExtension + rightExtension, supportHeight);
        c.globalCompositeOperation = 'source-atop';
        c.fillStyle = 'rgba(9,15,19,.22)';
        c.fillRect(-leftExtension, 0, item.width, item.height);
        c.globalCompositeOperation = 'source-over';
      }
      c.strokeStyle = '#080e13'; c.lineWidth = 1.4;
      c.beginPath();
      if (pier) {
        c.moveTo(p.w * .64, 6); c.lineTo(p.w * .55, 23); c.lineTo(p.w * .59, 35); c.lineTo(p.w * .48, supportHeight);
        c.moveTo(0, 22); c.lineTo(p.w * .17, 28); c.lineTo(p.w * .23, 40);
      } else {
        const outer = side > 0 ? p.w + rightExtension : -leftExtension;
        c.moveTo(outer, 35); c.lineTo(p.w * .49, 19); c.lineTo(p.w * .59, 35);
      }
      c.stroke(); c.restore();
    }
    if (isFloor) {
      c.fillStyle = '#0b0e11'; c.fillRect(0, 0, p.w, p.h + 12);
      c.strokeStyle = '#646a6b'; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(0, .5);
      for (let x = 3; x <= p.w; x += 3) c.lineTo(x, .25 + hash(x * 7) * .8);
      c.stroke();
    } else if (kit) {
      if (side > 0 || (!side && index % 2)) { c.translate(p.w, 0); c.scale(-1, 1); }
      c.drawImage(kit.canvas, ...region, (region[0] - left) * sx - embedded, (region[1] - contactY) * sy, region[2] * sx, region[3] * sy);
      // A narrow scuffed top belongs to the same stone, not a bright ruled
      // line across transparent ends. Closed source silhouettes remain intact.
      c.globalCompositeOperation = 'source-atop';
      c.strokeStyle = 'rgba(166,172,172,.40)'; c.lineWidth = .9;
      c.beginPath(); c.moveTo(-embedded, .75);
      for (let x = 4; x <= p.w; x += 4) c.lineTo(x, .7 + hash(index * 19 + x) * .7);
      c.stroke(); c.globalCompositeOperation = 'source-over';
    }
    if (p.id === 'opening-refuge') {
      // The overhead shaft also lands on the stone. Feathered, alpha-clipped
      // spill preserves its fractured edge and is baked only with this cache.
      c.save();
      c.globalCompositeOperation = 'source-atop';
      c.translate(p.w * .52, -1);
      c.scale(1, .38);
      const spill = c.createRadialGradient(0, 0, 1, 0, 0, p.w * .56);
      spill.addColorStop(0, 'rgba(240,237,224,.44)');
      spill.addColorStop(.28, 'rgba(240,237,224,.32)');
      spill.addColorStop(.7, 'rgba(240,237,224,.10)');
      spill.addColorStop(1, 'rgba(240,237,224,0)');
      c.fillStyle = spill;
      c.fillRect(-p.w, -top / .38, p.w * 2, p.w);
      c.restore();
    }
    item.x = -pad - leftExtension; item.y = -top;
    // Physical attachments belong to the visible painted underside. Sample
    // the cached alpha once, and place the first links inside the solid mass.
    if (!isFloor && side && index % 5 === 2) {
      const x = p.w * (side < 0 ? .63 : .37);
      const column = Math.round((x + pad + leftExtension) * artScale);
      const alpha = c.getImageData(column, 0, 1, item.canvas.height).data;
      let bottom = -1;
      for (let y = 0; y < item.canvas.height; y++) if (alpha[y * 4 + 3] > 210) bottom = y;
      if (bottom >= 0) {
        item.attachment = { x, y: bottom / artScale - top - 2 };
        let cage = cages.get(index);
        if (!cage) {
          cage = { x: 0, y: 0, length: Math.round(47 + hash(index) * 19), angle: 0, velocity: 0 };
          cages.set(index, cage);
        }
        cage.x = p.x + x;
        cage.y = p.y + item.attachment.y;
        const key = cage.length * 2 + 1;
        if (!chainCache.has(key)) chainCache.set(key, buildChain(cage.length, true));
      }
    }
    return item;
  }

  function buildWall(p, index) {
    const width = p.w, wallHeight = p.h + (p.segments ? 0 : WALL_BLEED), left = p.x < 210;
    const outerLeft = left ? -WALL_BLEED : 0;
    const outerRight = left ? width : width + WALL_BLEED;
    const item = surface(width + WALL_BLEED, wallHeight, artScale), c = item.context;
    item.x = outerLeft;
    c.translate(-outerLeft, 0);
    const seed = (p.segments ? index : index % 3) * 131 + (left ? 17 : 83);
    if (p.segments) {
      // Build the projecting rib from load-bearing courses. The old single
      // clipped face exposed a rectangular cap and a 200px unbroken bevel.
      // Every course remains inside the shared solid profile; joints are dark
      // stone, not transparent gaps. Construction runs only on a cache miss.
      c.save();
      if (!left) { c.translate(width, 0); c.scale(-1, 1); }
      const outer = -WALL_BLEED;
      const courses = [];
      for (const segment of p.segments) {
        const segmentTop = segment.y - p.y;
        const count = segmentTop === 0 ? Math.ceil(segment.h / 36) : 1;
        const weights = Array.from({ length: count }, (_, i) => 26 + hash(seed + i * 23) * 22);
        const total = weights.reduce((sum, value) => sum + value, 0);
        let top = segmentTop;
        for (const weight of weights) {
          const bottom = top + segment.h * weight / total;
          courses.push({ top, bottom, edge: segment.w });
          top = bottom;
        }
      }
      c.beginPath(); c.moveTo(outer, 0);
      for (let x = outer + 8; x < width - 3; x += 7 + hash(x + seed) * 9) {
        c.lineTo(x, hash(x + seed + 3) * 1.7);
      }
      c.lineTo(width - 1, .6);
      for (let row = 0; row < courses.length; row++) {
        const { top, bottom, edge } = courses[row];
        const chipY = top + (bottom - top) * (.34 + hash(seed + row * 17) * .26);
        // Course ends break the edge as well as the face. These small losses
        // stay within 2.3px of the solid contact, including recessed joints.
        c.lineTo(edge - 2.3, top + .6);
        c.lineTo(edge - .6, top + 3);
        c.lineTo(edge - .9, chipY);
        c.lineTo(edge - 1.8 - hash(seed + row) * .5, chipY + 2);
        c.lineTo(edge - .7, bottom - 3);
        c.lineTo(edge - 2.3, bottom);
      }
      c.lineTo(outer, wallHeight); c.closePath(); c.clip();
      c.fillStyle = '#0c1115'; c.fillRect(outer, 0, width + WALL_BLEED, wallHeight);
      for (let row = 0; row < courses.length; row++) {
        const { top: y, bottom, edge } = courses[row];
        const cap = row === 0;
        const joint = cap ? 0 : 1.1;
        const courseSeed = seed + row * 41;
        // A large quoin owns the exposed edge; the next course overlaps its
        // inner joint. Short return faces replace the long diagonal panel.
        const split = edge - (row % 2 ? 30 : 47) - hash(courseSeed) * 8;
        const cuts = [outer - 2, split, edge + 2];
        for (let block = 0; block < 2; block++) {
          const x = cuts[block] + (block ? 1.1 : 0), end = cuts[block + 1] - .65;
          const n = courseSeed + block * 17;
          const chip = 1.2 + hash(n + 3) * 2.5;
          const bevel = cap ? 5.5 : 2.6 + hash(n + 9) * 2.8;
          const top = y + joint + (cap ? 0 : hash(n + 11) * 2.1);
          const tip = block === 1 ? end - 1.8 : end;
          c.save(); c.beginPath();
          c.moveTo(x + chip, top + (cap ? .3 : .8));
          c.lineTo(x + (end - x) * .28, top + hash(n + 1) * 2.1);
          c.lineTo(x + (end - x) * .53, top + .3);
          c.lineTo(end - chip, top + 1.1);
          c.lineTo(tip, top + 2.2);
          c.lineTo(end - .3, bottom - bevel - 1);
          c.lineTo(end - chip, bottom - 1.1);
          c.lineTo(x + (end - x) * .6, bottom - 2.6);
          c.lineTo(x + (end - x) * .37, bottom - .7);
          c.lineTo(x + chip * .7, bottom - 1.5);
          c.lineTo(x, bottom - bevel); c.lineTo(x + .3, top + chip);
          c.closePath(); c.clip();
          const shade = Math.round(25 + hash(n + 4) * 10);
          c.fillStyle = `rgb(${shade},${shade + 4},${shade + 7})`;
          c.fillRect(x, top, end - x, bottom - top);
          if (available(assets.stone)) {
            c.globalAlpha = .25;
            c.drawImage(assets.stone, 90 + hash(n + 2) * 420, 180 + hash(n + 8) * 500, 160, 180,
              x, top, end - x, bottom - top);
            c.globalAlpha = 1;
          }
          if (kit) {
            c.globalAlpha = .68;
            c.drawImage(kit.canvas, 143 + hash(n + 5) * 46, 148, 100, 170,
              x, top, end - x, bottom - top);
            c.globalAlpha = 1;
          }
          // A light-catching broken upper plane and deep undercut belong to
          // each stone, so the material stays volumetric at phone scale.
          c.fillStyle = cap ? 'rgba(137,147,151,.16)' : 'rgba(114,125,132,.07)';
          c.beginPath(); c.moveTo(x, top); c.lineTo(end, top);
          c.lineTo(end - chip, top + bevel * .6);
          c.lineTo(x + (end - x) * .52, top + bevel);
          c.lineTo(x + chip, top + bevel * .65); c.closePath(); c.fill();
          c.fillStyle = 'rgba(2,6,10,.62)';
          c.beginPath(); c.moveTo(x, bottom - bevel); c.lineTo(x + chip, bottom - bevel * .48);
          c.lineTo(end - chip * 2, bottom - bevel * .6); c.lineTo(end, bottom - bevel - 2);
          c.lineTo(end, bottom); c.lineTo(x, bottom); c.closePath(); c.fill();
          if (block === 1) {
            // A broad return turns toward the shaft's light. Its broken
            // back edge and unequal width describe thickness, not an outline.
            const depth = 12 + hash(n + 7) * 7;
            const middle = top + (bottom - top) * .46;
            c.save(); c.beginPath();
            c.moveTo(edge - depth, top + bevel * .65);
            c.lineTo(edge - depth * .76, middle);
            c.lineTo(edge - depth * .94, bottom - bevel);
            c.lineTo(edge - 2, bottom - 1.8); c.lineTo(edge + 1, bottom - bevel - 1);
            c.lineTo(edge + 1, top); c.closePath(); c.clip();
            const returnLight = c.createLinearGradient(edge - depth, 0, edge, 0);
            returnLight.addColorStop(0, 'rgba(83,98,106,.12)');
            returnLight.addColorStop(.36, 'rgba(114,127,132,.24)');
            returnLight.addColorStop(1, 'rgba(139,147,148,.34)');
            c.fillStyle = returnLight; c.fillRect(edge - depth, top, depth + 1, bottom - top);
            c.fillStyle = 'rgba(158,164,160,.09)';
            c.beginPath(); c.moveTo(edge - depth, top + bevel);
            c.lineTo(edge - 1, top + bevel * 1.5); c.lineTo(edge - depth * .4, middle + 3);
            c.lineTo(edge - depth * .76, middle); c.closePath(); c.fill();
            c.fillStyle = 'rgba(3,9,14,.47)';
            c.beginPath(); c.moveTo(edge - depth, bottom - bevel);
            c.lineTo(edge - 3, bottom - bevel * .58); c.lineTo(edge + 1, bottom - bevel - 1);
            c.lineTo(edge + 1, bottom); c.lineTo(edge - depth, bottom); c.closePath(); c.fill();
            c.restore();
          }
          c.restore();
        }
      }
      if (kit) {
        // The cap overlaps its supporting courses, sharing the exact fractured
        // material of the traversable ledges instead of ending in a cut plate.
        const sx = width / 700, sy = sx * 1.65;
        c.drawImage(kit.canvas, 40, 80, 740, 315, -21 * sx, -21 * sy, 740 * sx, 315 * sy);
      }
      const embedded = c.createLinearGradient(outer, 0, width, 0);
      embedded.addColorStop(0, 'rgba(1,4,7,.72)');
      embedded.addColorStop(.48, 'rgba(1,4,7,.32)');
      embedded.addColorStop(1, 'rgba(1,4,7,0)');
      c.fillStyle = embedded; c.fillRect(outer, 0, width + WALL_BLEED, wallHeight);
      c.restore();
      return item;
    }
    const inset = y => 1 + hash(Math.floor(y / 47) * 17 + seed) * 2.1;
    const inner = y => left ? width - inset(y) : inset(y);
    c.save(); c.beginPath();
    if (left) {
      c.moveTo(outerLeft, 0); c.lineTo(width, 0);
      for (let y = 0; y <= wallHeight; y += 4) c.lineTo(inner(y), y);
      c.lineTo(outerLeft, wallHeight);
    } else {
      c.moveTo(outerRight, 0); c.lineTo(0, 0);
      for (let y = 0; y <= wallHeight; y += 4) c.lineTo(inner(y), y);
      c.lineTo(outerRight, wallHeight);
    }
    c.closePath(); c.clip();
    c.fillStyle = '#1b1e21'; c.fillRect(outerLeft, 0, item.width, wallHeight);
    if (available(assets.stone)) {
      c.globalAlpha = .16;
      c.drawImage(assets.stone, left ? 50 : 520, 100 + (index % 3) * 80, 270, 980, 0, 0, width + 3, p.h);
      c.globalAlpha = 1;
    }
    // Long, broad broken facets replace the tiled filigree and brick grid.
    c.fillStyle = '#111518';
    c.beginPath(); c.moveTo(left ? outerLeft : outerRight, 0);
    for (let y = 0; y <= wallHeight; y += 240) c.lineTo(width * (.32 + hash(y * .03 + seed) * .32), y);
    c.lineTo(left ? outerLeft : outerRight, wallHeight); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(107,115,119,.12)'; c.lineWidth = 1.1;
    c.beginPath();
    for (let y = 0; y <= wallHeight; y += 240) {
      const x = width * (.32 + hash(y * .03 + seed) * .32) + 1;
      if (!y) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    const edge = c.createLinearGradient(0, 0, width, 0);
    edge.addColorStop(left ? 0 : 1, 'rgba(1,4,7,.68)');
    edge.addColorStop(left ? 1 : 0, 'rgba(1,4,7,0)');
    // The shared impact transform reveals the outer wall. Extend its finished
    // shading too: an unshaded cache margin becomes a grey stripe on right kicks.
    c.fillStyle = edge; c.fillRect(outerLeft, 0, item.width, wallHeight);
    c.strokeStyle = 'rgba(117,124,128,.19)'; c.lineWidth = .7;
    c.beginPath();
    for (let y = 2; y < wallHeight; y += 4) {
      const x = inner(y) + (left ? -.4 : .4);
      if (y === 2) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    if (!p.segments) {
      // Deep, narrow lancets are cut into the existing wall material. Their
      // fixed apertures are the sources used by air, stone and iron lighting.
      for (const opening of CATHEDRAL_LIGHTS) {
        if ((opening.x < 210) !== left || opening.y < p.y || opening.y > p.y + p.h) continue;
        const x = opening.x - p.x - (left ? 8 : 0), y = opening.y - p.y - 54;
        c.save();
        c.beginPath(); arch(c,x-3,y-4,14,61); c.closePath();
        c.fillStyle='#06090d'; c.fill();
        c.strokeStyle='rgba(68,75,73,.25)';c.lineWidth=2.3;c.stroke();
        // A chipped reveal, not a bright outlined capsule beside the HUD.
        c.beginPath();c.moveTo(x+1,y+54);c.lineTo(x+.7,y+28);c.lineTo(x+2,y+24);
        c.lineTo(x+1,y+9);c.lineTo(x+4,y+2);c.lineTo(x+7,y+9);
        c.lineTo(x+6.5,y+35);c.lineTo(x+8,y+39);c.lineTo(x+7,y+54);c.closePath();
        const glow=c.createLinearGradient(x,y,x,y+54);
        glow.addColorStop(0,'#48514d');glow.addColorStop(.66,'#939c8e');glow.addColorStop(1,'#b8bba6');
        c.fillStyle=glow;c.fill();
        c.strokeStyle='#151d1c';c.lineWidth=1.8;
        c.beginPath();c.moveTo(x+3.2,y+12);c.lineTo(x+4,y+54);c.moveTo(x-1,y+33);c.lineTo(x+9,y+31);c.stroke();
        c.restore();
      }
    }
    c.restore();
    return item;
  }

  function lightStone(item, p) {
    const originX = (p.suspension?.homeX ?? p.x) + item.x;
    const originY = (p.suspension?.homeY ?? p.y) + item.y;
    if (!CATHEDRAL_LIGHTS.some(light => originY < light.y + LIGHT_REACH && originY + item.height > light.y)) return;
    // Exposure is baked into each already-owned material cache, not painted
    // over transparent corners or rebuilt every frame. The narrow top-facing
    // facets carry more light than the fractured underside.
    const c=item.context, pixels=c.getImageData(0,0,item.canvas.width,item.canvas.height),data=pixels.data;
    const contactY=p.suspension?.homeY??p.y;
    for(let y=0;y<item.canvas.height;y++) {
      const worldY=originY+y/artScale;
      const normal=.13+.38*Math.exp(-Math.max(0,worldY-contactY)/12);
      for(let x=0;x<item.canvas.width;x++) {
        const i=(y*item.canvas.width+x)*4;
        if(data[i+3]<8)continue;
        const exposure=sampleLight(originX+x/artScale,worldY)*normal;
        if(exposure<.008)continue;
        data[i]+=(214-data[i])*exposure;
        data[i+1]+=(213-data[i+1])*exposure;
        data[i+2]+=(197-data[i+2])*exposure;
      }
    }
    c.putImageData(pixels,0,0);
  }

  function prepareSpider() {
    if (!available(assets.spider) || spiderVersion === assets.spider) return;
    spiderVersion = assets.spider;
    spiderFrame = surface(190, 190, 2);
    spiderFrame.context.drawImage(assets.spider, 0, 0, 190, 190);
    spiderFrame.context.globalCompositeOperation = 'source-atop';
    spiderFrame.context.fillStyle = 'rgba(5,9,12,.32)';
    spiderFrame.context.fillRect(0, 0, 190, 190);
    const body = spiderFrame.context;
    body.globalCompositeOperation = 'source-over'; body.fillStyle = '#121619';
    body.beginPath();
    body.ellipse(81.3, 79.1, 1.45, 1.65, 0, 0, TAU);
    body.ellipse(86.5, 78.8, 1.12, 1.5, 0, 0, TAU);
    body.ellipse(83.2, 82.3, 1.1, 1.25, 0, 0, TAU);
    body.ellipse(86.5, 81.8, .95, 1.05, 0, 0, TAU); body.fill();
    // Four authored limb cutouts share the painted body's texture. Their hips
    // stay buried in the carapace; only a local regrip or knee lift travels out.
    const outlines = [
      [[68,76],[78,80],[96,39],[105,28],[166,62],[181,102],[183,91],[178,59],[110,20],[91,21],[81,38]],
      [[82,86],[91,90],[101,57],[110,50],[145,102],[158,153],[161,142],[151,99],[117,48],[109,43],[97,48],[87,69]],
      [[80,93],[84,103],[101,95],[110,98],[130,131],[174,178],[187,181],[177,175],[137,130],[115,92],[102,85],[92,88]],
      [[66,84],[76,87],[81,119],[92,145],[86,172],[80,178],[86,166],[87,149],[75,120],[70,100]],
    ];
    spiderLegs = outlines.map((points, i) => {
      const path = new Path2D(); path.moveTo(...points[0]);
      for (let n = 1; n < points.length; n++) path.lineTo(...points[n]);
      path.closePath();
      const left = Math.floor(Math.min(...points.map(point => point[0]))) - 1;
      const top = Math.floor(Math.min(...points.map(point => point[1]))) - 1;
      const width = Math.ceil(Math.max(...points.map(point => point[0]))) - left + 1;
      const height = Math.ceil(Math.max(...points.map(point => point[1]))) - top + 1;
      const part = surface(width, height, 2), c = part.context;
      c.translate(-left, -top); c.clip(path); c.drawImage(spiderFrame.canvas, 0, 0, 190, 190);
      body.globalCompositeOperation = 'destination-out'; body.fillStyle = '#000'; body.fill(path);
      return { canvas: part.canvas, left, top, width, height, x: points[0][0], y: points[0][1], phase: i * 2.1 };
    });
    spiderFrame.context.globalCompositeOperation = 'source-over';
  }

  function prepareBell() {
    if (!available(assets['charcoal-bell']) || bellVersion === assets['charcoal-bell']) return;
    bellVersion = assets['charcoal-bell'];
    bellBody = surface(128, 128, 2);
    const c = bellBody.context;
    c.drawImage(bellVersion, 0, 0, 128, 128);
    // Remove the original clapper in the dark bell mouth and cache it separately.
    bellClapper = surface(20, 39, 2);
    bellClapper.context.drawImage(bellVersion, 530, 832, 200, 390, 0, 0, 20, 39);
    c.clearRect(53, 84, 20, 44);
    c.fillStyle = '#0a1013'; c.beginPath();
    c.moveTo(53, 84); c.lineTo(73, 84); c.lineTo(73, 101); c.quadraticCurveTo(63, 103, 53, 101); c.fill();
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(5,9,12,.27)'; c.fillRect(0, 0, 128, 128);
  }

  function prepareShrine() {
    if (!kit || shrineVersion === kit) return;
    shrineVersion = kit;
    // Use the complete spare gateway from the same painted stone atlas.
    shrineFrame = surface(455, 507);
    shrineFrame.context.drawImage(kit.canvas, 920, 440, 455, 507, 0, 0, 455, 507);
  }

  function drawWorldAmbience(game, cameraY) {
    if (!spiderFrame) return;
    for (let i = 0; i < spiders.length; i++) {
      const spider = spiders[i], y = spider.y;
      if (y + 195 < cameraY || y > cameraY + height) continue;
      ctx.save();
      // This creature inhabits the outer architecture. Its body stays in the
      // solid wall; the forward knees reach into the lit peripheral gap.
      ctx.beginPath(); ctx.rect(i ? 319 : 0, y - 4, i ? 101 : 88, 201); ctx.clip();
      ctx.translate(spider.x, y);
      ctx.scale(spider.scale, Math.abs(spider.scale));
      ctx.globalAlpha = .94;
      for (const leg of spiderLegs) {
        const beat = Math.sin(clock * .88 + leg.phase + i * 2.7);
        const regrip = Math.max(0, beat) ** 8;
        const angle = reducedMotion ? 0 : regrip * .062 + spider.alert * Math.sin(clock * 2.4 + leg.phase) * .025;
        ctx.save(); ctx.translate(leg.x, leg.y); ctx.rotate(angle); ctx.translate(-leg.x, -leg.y);
        ctx.drawImage(leg.canvas, leg.left, leg.top, leg.width, leg.height); ctx.restore();
      }
      const breath = reducedMotion ? 0 : Math.sin(clock * .95 + i * 3) * .004;
      ctx.translate(65, 81); ctx.scale(1 + breath, 1 - breath); ctx.translate(-65, -81);
      ctx.drawImage(spiderFrame.canvas, 0, 0, 190, 190);
      const eyeX = 84 + spider.lookX, eyeY = 81 + spider.lookY;
      ctx.globalAlpha = .22 + spider.alert * .35;
      ctx.drawImage(glowSprite.canvas, eyeX - 8, eyeY - 8, 16, 16);
      ctx.globalAlpha = .55 + spider.alert * .4;
      ctx.fillStyle = '#d4c6a5';
      ctx.beginPath();
      ctx.ellipse(eyeX - 2, eyeY - 1.8, .95, 1.2, -.2, 0, TAU);
      ctx.ellipse(eyeX + 2.5, eyeY - 2, .7, .95, .2, 0, TAU);
      ctx.ellipse(eyeX -.6, eyeY + 1.3, .66, .85, 0, 0, TAU);
      ctx.ellipse(eyeX + 2.1, eyeY + 1.1, .6, .76, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function drawBells(cameraY) {
    if (!bellBody) return;
    for (const bell of bells) {
      if (bell === resonantBell && !bell.platform) continue;
      if (bell.y + 85 < cameraY || bell.y > cameraY + height) continue;
      const scale = bell.size / 94.4;
      const dx = bell.platform?.suspension?.x || 0, dy = bell.platform?.suspension?.y || 0;
      if (bell.platform) {
        // A short forged hanger enters the stone; the bell has a visible owner.
        ctx.strokeStyle = '#141b20'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bell.x + dx, bell.platform.y + 9);
        ctx.lineTo(bell.x + dx, bell.y + dy + 2); ctx.stroke();
      }
      ctx.save(); ctx.translate(bell.x + dx, bell.y + dy); ctx.rotate(reducedMotion ? bell.angle * .25 : bell.angle);
      ctx.scale(scale, scale);
      ctx.save(); ctx.translate(0, 73); ctx.rotate(reducedMotion ? bell.clapper * .25 : bell.clapper);
      ctx.drawImage(bellClapper.canvas, -10, 0, 20, 39); ctx.restore();
      ctx.drawImage(bellBody.canvas, -63, -10, 128, 128);
      ctx.restore();
    }
  }

  function drawSanctuaryLight(game, cameraY) {
    for (let i = 0; i < 2; i++) {
      const beacon = i ? game.goal : game.checkpoint;
      if (beacon.y < cameraY - 350 || beacon.y > cameraY + height + 220) continue;
      const bottom = beacon.y + beacon.h, x = beacon.x + beacon.w / 2;
      ctx.drawImage(lightShaft.canvas, x - 105, bottom - 330, 225, 470);
    }
  }

  function spawn(x, y, vx, vy, radius, life, kind) {
    const p = particles[particleCursor++ % particles.length];
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.r = radius; p.life = p.total = life; p.kind = kind;
    p.angle = random() * TAU; p.spin = (random() - .5) * 4;
  }

  function pulse(x, y, kind) {
    const p = rings[ringCursor++ % rings.length];
    p.x = x; p.y = y; p.kind = kind;
    p.life = p.total = kind === 2 ? .85 : .38;
  }

  function emit(events) {
    character.emit(events);
    surfaceAsh.emit(events);
    depth.emit?.(events);
    for (const e of events) {
      const lightContact = e.type === 'land' && (e.landmark === 'first-hop' || e.landmark === 'second-hop');
      const intensity = clamp(e.intensity ?? 1, .18, 1.5) * (lightContact ? .52 : 1);
      const vx = e.vx || 0;
      const x = e.contactX ?? ((e.x || 0) - (e.type === 'wallJump' ? Math.sign(vx) * 12 : 0));
      const y = e.contactY ?? ((e.y || 0) - (e.type === 'wallJump' || e.type === 'doubleJump' || e.type === 'death' ? 14 : 0));
      const countFactor = reducedMotion ? .45 : 1;
      if (e.type === 'land' || e.type === 'jump' || e.type === 'wallJump' || e.type === 'doubleJump' || e.type === 'checkpoint' || e.type === 'win') {
        for (const cage of cages.values()) {
          const distance = Math.hypot(x - cage.x, (y - cage.y - cage.length * .6) * .85);
          const reach = Math.max(0, 1 - distance / 285);
          cage.velocity += (Math.sign(vx) || Math.sign(cage.x - x) || 1) * reach * intensity * (e.type === 'land' ? .9 * intensity : e.type === 'jump' ? .16 : .38);
        }
        for (const bell of bells) {
          // The opening bell responds through its own loaded stone, not an
          // invisible radius shared by every little hop through the room.
          if (bell === resonantBell) continue;
          const reach = Math.max(0, 1 - Math.hypot(x - bell.x, y - bell.y) / 245);
          const direction = Math.sign(vx) || Math.sign(x - bell.x) || 1;
          const transfer = e.type === 'checkpoint' || e.type === 'win' ? 1 : e.type === 'land' ? intensity * .52 : e.type === 'jump' ? .09 : .21;
          bell.velocity += direction * reach * intensity * transfer * 1.7;
          bell.clapperVelocity -= direction * reach * intensity * transfer * 2.1;
        }
      }
      if (e.type === 'jump' || e.type === 'wallJump') {
        if (e.type === 'wallJump') {
          impact.vx += Math.sign(vx) * 105;
          impact.vy += 24;
        }
        if (e.type === 'jump') impact.vy += 11;
        // Surface ash owns the wall/ground eruption at the real contact.
      } else if (e.type === 'doubleJump') {
        impact.vy += 40;
        // The character owns its airborne rupture and reformation.
      } else if (e.type === 'land') {
        const weight = intensity * intensity;
        impact.vy += (e.suspended ? 78 : 90) * weight;
        if (e.suspended) {
          for (const rigging of riggingCache.values()) {
            if (rigging.platformId !== e.platformId) continue;
            rigging.age = 0;
            rigging.strength = intensity;
            rigging.direction = Math.sign(vx) || Math.sign(e.contactOffset || 0) || 1;
            rigging.contactOffset = clamp(e.contactOffset || 0, -1, 1);
          }
        }
        if (e.resonance && resonantBell.platform?.id === e.platformId) {
          resonantBell.age = 0;
          resonantBell.strength = intensity;
          resonantBell.direction = Math.sign(vx) || Math.sign(e.contactOffset || 0) || 1;
        }
        // Surface ash owns the contact skirt and its attached settling tail.
      } else if (e.type === 'death') {
        deathMark = { x: e.contactX ?? x, y: e.contactY ?? y, hazardIndex: e.hazardIndex ?? -1, age: 0 };
        impact.vx += Math.sign(vx || 1) * 110;
        impact.vy -= 60;
        for (let i = 0; i < Math.floor(36 * countFactor); i++) {
          const angle = random() * TAU;
          const speed = 25 + random() * 190;
          spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, .8 + random() * 4, .4 + random() * .7, 0);
        }
      } else if (e.type === 'respawn') {
        // Character owns the inward reform; no circle through the floor.
      } else if (e.type === 'checkpoint' || e.type === 'win') {
        pulse(x, y, 2);
        for (let i = 0; i < Math.floor(30 * countFactor); i++) {
          const angle = random() * TAU;
          const speed = 15 + random() * 75;
          spawn(x, y, Math.cos(angle) * speed, -30 - random() * 100, .8 + random() * 2, .6 + random() * 1.2, 2);
        }
      }
    }
  }

  function updateEffects(game, dt) {
    const p = game.player;
    if ((lastTime > game.time + .05) || (lastState && lastState !== 'ready' && game.state === 'ready')) resetEffects();
    lastTime = game.time;
    lastState = game.state;
    // Contact displaces the world in the direction of force, then settles.
    // The simulation and input clock run uninterrupted through this response.
    const steps = Math.max(1, Math.ceil(dt * 120));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) {
      const bellAge = resonantBell.age;
      resonantBell.age += step;
      if (bellAge < .22 && resonantBell.age >= .22) {
        // Stone -> traveling chain -> pin grit -> the hanging iron's inertia.
        // The clapper arrives at the rim near the audio strike at 350ms.
        const force = resonantBell.direction * resonantBell.strength;
        resonantBell.velocity += force * .92;
        resonantBell.clapperVelocity -= force * 1.85;
      }
      impact.vx += (-impact.x * 620 - impact.vx * 27) * step;
      impact.vy += (-impact.y * 620 - impact.vy * 27) * step;
      impact.x = clamp(impact.x + impact.vx * step, -IMPACT_LIMIT, IMPACT_LIMIT);
      impact.y = clamp(impact.y + impact.vy * step, -IMPACT_LIMIT, IMPACT_LIMIT);
      for (const cage of cages.values()) {
        cage.velocity += (-18 * Math.sin(cage.angle) - cage.velocity * 1.2) * step;
        cage.angle = clamp(cage.angle + cage.velocity * step, -.38, .38);
        if (Math.abs(cage.angle) === .38 && cage.angle * cage.velocity > 0) cage.velocity *= -.15;
      }
      for (const bell of bells) {
        const acceleration = -10 * Math.sin(bell.angle) - bell.velocity * .72;
        bell.velocity += acceleration * step;
        bell.angle = clamp(bell.angle + bell.velocity * step, -.32, .32);
        if (Math.abs(bell.angle) === .32 && bell.angle * bell.velocity > 0) bell.velocity *= -.12;
        bell.clapperVelocity += (-42 * Math.sin(bell.clapper) - bell.clapperVelocity * 1.9 - acceleration * 1.6) * step;
        bell.clapper = clamp(bell.clapper + bell.clapperVelocity * step, -.32, .32);
        if (Math.abs(bell.clapper) === .32 && bell.clapper * bell.clapperVelocity > 0) bell.clapperVelocity *= -.18;
      }
    }
    for (const rigging of riggingCache.values()) {
      const previousAge = rigging.age;
      rigging.age += dt;
      if (previousAge < .17 && rigging.age >= .17 && rigging.strength > .38) {
        for (const cable of rigging) {
          const count = reducedMotion ? 2 : 6;
          for (let j = 0; j < count; j++) {
            spawn(cable.anchorX, cable.anchorY + 2, (random() - .5) * 42,
              8 + random() * 28, .5 + random() * 1.25, .35 + random() * .45, j % 3 ? 0 : 1);
          }
        }
      }
    }
    for (const spider of spiders) {
      const dx = p.x + p.w / 2 - (spider.x + 84 * spider.scale);
      const dy = p.y + p.h / 2 - (spider.y + 81 * Math.abs(spider.scale));
      const attention = Math.max(0, 1 - Math.hypot(dx, dy) / 280);
      const ease = 1 - Math.exp(-dt * 3.2);
      spider.alert += (attention - spider.alert) * ease;
      spider.lookX += (clamp(dx / 180, -.8, .8) * Math.sign(spider.scale) - spider.lookX) * ease;
      spider.lookY += (clamp(dy / 180, -.9, .9) - spider.lookY) * ease;
    }
    for (const item of particles) {
      if (item.life <= 0) continue;
      item.life -= dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.vx *= Math.exp(-dt * (item.kind === 1 ? 3.5 : .6));
      item.vy += (item.kind === 2 ? -18 : item.kind === 1 ? -5 : 125) * dt;
      item.angle += item.spin * dt;
    }
    for (const item of rings) item.life = Math.max(0, item.life - dt);
    const cy = p.y + p.h / 2;
    if (p.wallDir && p.vy > 0 && game.state === 'playing') {
      scrapeTime += dt;
      if (scrapeTime > (reducedMotion ? .28 : .1)) {
        scrapeTime = 0;
        const contactX = p.wallDir < 0 ? p.x : p.x + p.w;
        spawn(contactX, cy + 6, -p.wallDir * (10 + random() * 13), random() * 22, .7 + random(), .3, 0);
      }
    } else scrapeTime = 0;
  }

  function buildChain(length, hasCage) {
    const item = surface(38, length + 52, 2);
    const c = item.context;
    c.translate(19, 0);
    c.strokeStyle = '#15191c';
    c.lineWidth = .9;
    for (let y = 2, i = 0; y < length; y += 4.4, i++) {
      c.beginPath(); c.ellipse((hash(i * 11) - .5) * .7, y, i % 2 ? .55 : 1.3, 2.6, (hash(i * 3) - .5) * .2, 0, TAU); c.stroke();
    }
    if (hasCage) {
      c.translate(0, length + 3);
      c.strokeStyle = '#171b1e';
      c.lineWidth = 1.7;
      c.beginPath();
      c.moveTo(-9, 29); c.lineTo(-8.4, 8); c.bezierCurveTo(-8, 2, -3, 1, 0, -2);
      c.bezierCurveTo(4, 1, 8, 2, 8.7, 8); c.lineTo(9.4, 29); c.stroke();
      c.fillStyle = '#14181b';
      c.beginPath(); c.ellipse(0, 29, 10.3, 2.3, .025, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(0, 8, 9.2, 1.7, -.025, 0, TAU); c.fill();
      c.strokeStyle = '#2d3235';
      c.lineWidth = .7;
      c.beginPath(); c.ellipse(0, 27, 9.7, 1.8, .025, 0, Math.PI); c.stroke();
      for (let i = -3; i <= 3; i++) {
        const x = i * 2.5;
        c.strokeStyle = i % 2 ? '#11171a' : '#283035';
        c.lineWidth = i % 3 ? .85 : 1.35;
        c.beginPath(); c.moveTo(x * .46, 1 + Math.abs(i));
        c.bezierCurveTo(x, 9, x + hash(i + 8) * 1.7 - .8, 19, x + .4, 28); c.stroke();
      }
      // Blackened cloth and accreted rust break the airy wire-frame read.
      c.fillStyle = '#182025';
      c.beginPath(); c.moveTo(-7, 15); c.lineTo(-2, 19); c.lineTo(0, 16); c.lineTo(3, 24); c.lineTo(5, 27); c.lineTo(-7, 28); c.closePath(); c.fill();
      for (let i = 0; i < 37; i++) {
        c.fillStyle = i % 4 ? '#131b20' : '#535c62';
        const x = (hash(i * 13 + length) - .5) * 20;
        const y = hash(i * 5 + 2) * 31;
        c.fillRect(x, y, .55 + hash(i + 9) * 1.2, .7 + hash(i + 3) * 1.7);
      }
      c.strokeStyle = '#171e23';
      c.lineWidth = .65;
      c.beginPath(); c.moveTo(-7, 28); c.bezierCurveTo(-11, 31, -6, 36, -8, 40); c.moveTo(5, 28); c.lineTo(6, 33); c.stroke();
      c.strokeStyle = '#747e83';
      c.lineWidth = .5;
      c.beginPath(); c.moveTo(-8.4, 11); c.lineTo(-8.8, 22); c.moveTo(0, -3); c.lineTo(-1, -1); c.stroke();
    }
    return item;
  }

  function drawChain(x, y, length, sway = 0, cage = true) {
    const key = Math.round(length) * 2 + Number(cage);
    let cached = chainCache.get(key);
    if (!cached) { cached = buildChain(Math.round(length), cage); chainCache.set(key, cached); }
    ctx.save(); ctx.translate(x, y); ctx.rotate(sway);
    ctx.drawImage(cached.canvas, -19, 0, cached.width, cached.height);
    ctx.restore();
  }

  // Eight immutable pieces retain authored iron links. Only their endpoint
  // transforms change: both wall pins and stone sockets stay exactly attached.
  const CABLE_SEGMENTS = 8;
  function drawRigging(game, cameraY) {
    for (let index = 1; index < game.platforms.length; index++) {
      const p = game.platforms[index];
      if ((!p.suspension && p.kind !== 'summit') || p.x <= 61 || p.x + p.w >= 359) continue;
      if (p.y < cameraY - 12 || p.y - 305 > cameraY + height) continue;
      let rigging = riggingCache.get(index);
      if (!rigging) {
        rigging = [];
        rigging.platformId = p.id;
        rigging.age = 10; rigging.strength = 0; rigging.direction = 1; rigging.contactOffset = 0;
        for (const side of [-1, 1]) {
          const anchorX = side < 0 ? 56 : 364;
          const baseY = p.suspension?.homeY ?? p.y, baseX = p.suspension?.homeX ?? p.x;
          const anchorY = p.kind === 'summit' ? -80 : baseY - (side < 0 ? 282 : 250) - hash(index) * 16;
          const footX = baseX + p.w * (side < 0 ? .12 : .88), footY = baseY + 4;
          const pieces = [];
          const restPaths = [new Path2D(), new Path2D()];
          const highlights = [.22,.48,.78].map(level=>({path:new Path2D(),color:litIron(level),active:false}));
          const length = Math.hypot(footX - anchorX, footY - anchorY) / CABLE_SEGMENTS;
          for (let segment = 0; segment < CABLE_SEGMENTS; segment++) {
            const paths = [new Path2D(), new Path2D()];
            const links = Math.max(2, Math.round(length / 4.2));
            for (let j = 0; j < links; j++) {
              const y = (j + .5) * length / links;
              const path = paths[(j + segment) % 2];
              path.moveTo(0, y);
              path.ellipse(0, y, (j + segment) % 2 ? .55 : 1.05, length / links * .56, 0, 0, TAU);
              const restPath = restPaths[(j + segment) % 2];
              const restY = y + segment * length;
              restPath.moveTo(0, restY);
              restPath.ellipse(0, restY, (j + segment) % 2 ? .55 : 1.05, length / links * .56, 0, 0, TAU);
              const at=restY/(length*CABLE_SEGMENTS);
              const exposure=sampleLight(anchorX+(footX-anchorX)*at,anchorY+(footY-anchorY)*at);
              if(exposure>.09 && (j+segment)%2===0) {
                const highlight=highlights[Math.min(2,Math.floor(exposure*3))];
                highlight.active=true;highlight.path.moveTo(0,restY);
                highlight.path.ellipse(0,restY,1.05,length/links*.56,0,Math.PI*.12,Math.PI*1.14);
              }
            }
            pieces.push(paths);
          }
          rigging.push({ pieces, restPaths, anchorX, anchorY, footX, footY, length, side, highlights });
        }
        riggingCache.set(index, rigging);
      }
      for (const cable of rigging) {
        const footX = cable.footX + (p.suspension?.x || 0);
        const footY = cable.footY + (p.suspension?.y || 0);
        const dx = footX - cable.anchorX, dy = footY - cable.anchorY;
        const span = Math.hypot(dx, dy);
        const moving = !reducedMotion && rigging.age < 1.4 && rigging.strength > 0;
        if (!moving) {
          // Resting rigging remains two cached strokes, regardless of segment
          // count. Only a recent struck cable pays the segmented draw cost.
          const restLength = cable.length * CABLE_SEGMENTS;
          ctx.save();
          ctx.transform(dy / restLength, -dx / restLength, dx / restLength, dy / restLength, cable.anchorX, cable.anchorY);
          ctx.strokeStyle = '#252c30'; ctx.lineWidth = .92; ctx.stroke(cable.restPaths[0]);
          ctx.strokeStyle = '#10171b'; ctx.lineWidth = .8; ctx.stroke(cable.restPaths[1]);
          for(const highlight of cable.highlights) if(highlight.active) {
            ctx.strokeStyle=highlight.color;ctx.lineWidth=.62;ctx.stroke(highlight.path);
          }
          ctx.restore();
        }
        let previousX = cable.anchorX, previousY = cable.anchorY;
        for (let segment = 0; moving && segment < CABLE_SEGMENTS; segment++) {
          const t = (segment + 1) / CABLE_SEGMENTS;
          const load = 1 + cable.side * rigging.contactOffset * .22;
          const bow = cableBow(t, rigging.age, rigging.strength * load, rigging.direction, cable.side);
          const x = cable.anchorX + dx * t + dy / span * bow;
          const y = cable.anchorY + dy * t - dx / span * bow;
          const sx = x - previousX, sy = y - previousY;
          ctx.save();
          ctx.transform(sy / cable.length, -sx / cable.length, sx / cable.length, sy / cable.length, previousX, previousY);
          ctx.strokeStyle = litIron(sampleLight((x+previousX)*.5,(y+previousY)*.5)); ctx.lineWidth = .92; ctx.stroke(cable.pieces[segment][0]);
          ctx.strokeStyle = '#10171b'; ctx.lineWidth = .8; ctx.stroke(cable.pieces[segment][1]);
          ctx.restore();
          previousX = x; previousY = y;
        }
        // A collar and embedded wall eye make the force path read at phone size.
        ctx.fillStyle = '#161c20';
        ctx.fillRect(cable.anchorX - 2.5, cable.anchorY - 3, 5, 7);
        ctx.fillRect(footX - 2.5, footY - 2, 5, 5);
      }
    }
  }

  function drawPlatforms(game, cameraY) {
    for (let index = 0; index < game.platforms.length; index++) {
      const p = game.platforms[index];
      if (p.ribSegment > 0) continue;
      const bounds = p.rib || p;
      if (bounds.y + bounds.h + 140 < cameraY || bounds.y > cameraY + height + 12) continue;
      if (p.kind === 'wall') {
        const wall = bounds;
        let cached = wallCache.get(index);
        if (!cached) { cached = buildWall(wall, index); wallCache.set(index, cached); }
        // Crop outside the full impact range so fractional translated rasters
        // never uncover the stationary background at a viewport edge.
        const top = Math.max(wall.y, cameraY - WALL_BLEED), bottom = Math.min(wall.y + cached.height, cameraY + height + WALL_BLEED);
        if (bottom > top) {
          ctx.drawImage(cached.canvas, 0, (top - wall.y) * artScale, cached.canvas.width, (bottom - top) * artScale, wall.x + cached.x, top, cached.width, bottom - top);
        }
      } else {
        let cached = platformCache.get(index);
        if (!cached || cached.collider !== p) {
          cached = buildPlatform(p, index);
          lightStone(cached,p);
          cached.collider = p;
          platformCache.set(index, cached);
        }
        if (cached.attachment) {
          const socket = cached.attachment;
          const cage = cages.get(index);
          drawChain(p.x + socket.x, p.y + socket.y, cage.length, cage.angle * (reducedMotion ? .25 : 1));
        }
        ctx.drawImage(cached.canvas, p.x + cached.x, p.y + cached.y, cached.width, cached.height);
      }
    }
  }

  function buildHazard(h) {
    const pad = 9;
    const item = surface(h.w + pad * 2, h.h + pad * 2, 2);
    const c = item.context;
    c.translate(pad, pad);
    const sideways = h.orientation === 'left' || h.orientation === 'right';
    const span = sideways ? h.h : h.w;
    const depth = sideways ? h.w : h.h;
    if (h.orientation === 'right') c.transform(0, 1, -1, 0, depth, 0);
    else if (h.orientation === 'left') c.transform(0, 1, 1, 0, 0, 0);
    const count = Math.max(3, Math.round(span / 19));
    const pitch = span / count;
    const blades = new Path2D();
    for (let i = 0; i < count; i++) {
      const x = i * pitch;
      const tip = hash(i * 19 + h.y) * 1.3;
      blades.moveTo(x + .4, depth - 1);
      blades.bezierCurveTo(x + pitch * .19, depth * .7, x + pitch * .14, depth * .29, x + pitch * .72, tip);
      blades.bezierCurveTo(x + pitch * .49, depth * .36, x + pitch * .52, depth * .44, x + pitch * .66, depth * .62);
      blades.lineTo(x + pitch * .75, depth * .58);
      blades.quadraticCurveTo(x + pitch * .86, depth * .72, x + pitch - .3, depth - 1);
      blades.closePath();
    }
    // Ivory hooked thorns grow from a dark crimson root. Value and shape
    // carry danger independently of hue; chips keep it in the stone world.
    c.lineJoin = 'round';
    c.strokeStyle = '#281e23'; c.lineWidth = 1.3; c.stroke(blades);
    const enamel = c.createLinearGradient(0, 0, 0, depth);
    enamel.addColorStop(0, '#dfddd3');
    enamel.addColorStop(.40, '#c6c4b9');
    enamel.addColorStop(.66, '#a89991');
    enamel.addColorStop(.84, '#805557');
    enamel.addColorStop(1, '#4a282e');
    c.fillStyle = enamel; c.fill(blades);
    c.save(); c.clip(blades);
    for (let i = 0; i < count; i++) {
      const x = i * pitch;
      c.strokeStyle = '#531b29'; c.lineWidth = .65;
      c.beginPath(); c.moveTo(x + pitch * .27, depth * .87);
      c.quadraticCurveTo(x + pitch * .27, depth * .57, x + pitch * .5, depth * .32); c.stroke();
      for (let j = 0; j < 8; j++) {
        const px = x + hash(i * 31 + j * 17) * pitch;
        const py = depth * (.5 + hash(i * 29 + j * 7) * .5);
        c.fillStyle = j % 2 ? '#340d1a' : '#ffd8b7';
        c.globalAlpha = .45;
        c.fillRect(px, py, .55 + hash(j + i) * 1.2, .6);
      }
      c.globalAlpha = 1;
    }
    c.restore();
    c.strokeStyle = '#4b1426'; c.lineWidth = 3.5;
    c.beginPath(); c.moveTo(-1, depth);
    for (let x = 0; x <= span; x += 3) c.lineTo(x, depth - .7 + hash(x + h.y) * 1.4);
    c.stroke();
    for (let i = 0; i < count; i++) {
      const x = i * pitch;
      c.strokeStyle = '#dd9a8c'; c.lineWidth = .65;
      c.beginPath(); c.moveTo(x + 1, depth);
      c.quadraticCurveTo(x + pitch * .27, depth - 2.8, x + pitch * .7, depth - .6); c.stroke();
    }
    item.pad = pad;
    return item;
  }

  function drawHazards(game, cameraY) {
    for (let i = 0; i < game.hazards.length; i++) {
      const h = game.hazards[i];
      if (h.y + h.h < cameraY || h.y > cameraY + height) continue;
      let cached = hazardCache.get(i);
      if (!cached) { cached = buildHazard(h); hazardCache.set(i, cached); }
      ctx.drawImage(cached.canvas, h.x - cached.pad, h.y - cached.pad, cached.width, cached.height);
    }
    if (deathMark && deathMark.age < .28) {
      const t = deathMark.age / .28;
      const length = reducedMotion ? 18 : 13 + Math.sqrt(t) * 22;
      ctx.save();
      ctx.translate(deathMark.x, deathMark.y);
      ctx.rotate(-.8);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#e95360';
      ctx.beginPath(); ctx.moveTo(-length, -.5); ctx.lineTo(-2, -2.6); ctx.lineTo(length * .72, .2); ctx.lineTo(1, 2.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff4da';
      ctx.beginPath(); ctx.moveTo(-length * .7, -.4); ctx.lineTo(-2, -1.1); ctx.lineTo(length * .5, .2); ctx.lineTo(0, .8); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawBeacon(beacon, isGoal, cameraY, active) {
    if (!beacon || beacon.y + beacon.h + 100 < cameraY || beacon.y - 160 > cameraY + height) return;
    const x = beacon.x + beacon.w / 2;
    const bottom = beacon.y + beacon.h;
    const y = bottom - (isGoal ? 40 : 23);
    const breath = reducedMotion ? 1 : 1 + Math.sin(clock * 1.6) * .055;
    if (shrineFrame) {
      const width = isGoal ? 78 : 60;
      const shrineHeight = width * 507 / 455;
      const lightY = bottom - shrineHeight * .38;
      ctx.globalAlpha = isGoal ? .88 : active ? .84 : .64;
      ctx.drawImage(glowSprite.canvas, x - width * .66, lightY - width * .66, width * 1.32, width * 1.32);
      ctx.globalAlpha = isGoal ? .7 : .46;
      ctx.drawImage(glowSprite.canvas, x - width * .18, bottom - shrineHeight * .7, width * .36, shrineHeight * .8);
      ctx.globalAlpha = 1;
      ctx.drawImage(shrineFrame.canvas, x - width / 2, bottom - width * 486 / 455 + .4, width, shrineHeight);
      // Small rising light flecks live in the open doorway, beneath the
      // carved arch; the architecture itself is the destination silhouette.
      if (isGoal || active) {
        ctx.fillStyle = '#f3f5dd';
        for (let i = 0; i < 5; i++) {
          const lift = reducedMotion ? i * 11 : mod(clock * 9 + i * 13, shrineHeight * .59);
          const dx = Math.sin(i * 3.1) * width * .12;
          ctx.globalAlpha = .3 + (1 - lift / shrineHeight) * .48;
          ctx.fillRect(x + dx, bottom - 8 - lift, i % 2 ? .8 : 1.2, i % 2 ? 1.4 : 1.8);
        }
        ctx.globalAlpha = 1;
      }
      return;
    }
    const size = isGoal ? 156 : active ? 110 : 88;
    ctx.globalAlpha = isGoal ? .95 : active ? .88 : .66;
    ctx.drawImage(glowSprite.canvas, x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#545e50';
    ctx.lineWidth = isGoal ? 3 : 2;
    ctx.beginPath();
    arch(ctx, x - (isGoal ? 19 : 11), y - (isGoal ? 28 : 14), isGoal ? 38 : 22, isGoal ? 65 : 35);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,226,198,.75)';
    ctx.lineWidth = .7;
    ctx.beginPath();
    arch(ctx, x - (isGoal ? 17 : 9), y - (isGoal ? 25 : 12), isGoal ? 34 : 18, isGoal ? 61 : 33);
    ctx.stroke();
    ctx.fillStyle = '#fafbe6';
    ctx.beginPath();
    ctx.ellipse(x, y, (isGoal ? 5 : 3) * breath, (isGoal ? 13 : 7) * breath, 0, 0, TAU);
    ctx.fill();
    if (active && !isGoal) {
      ctx.strokeStyle = '#e9edd6';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 4, bottom - 4); ctx.lineTo(x - 1, bottom - 1); ctx.lineTo(x + 5, bottom - 7); ctx.stroke();
    }
  }

  function drawParticles(cameraY) {
    for (const p of particles) {
      if (p.life <= 0 || p.y < cameraY - 30 || p.y > cameraY + height + 30) continue;
      const fade = Math.min(1, p.life / Math.min(.2, p.total * .5));
      ctx.globalAlpha = fade * (p.kind === 1 ? .24 : .91);
      ctx.fillStyle = p.kind === 2 ? '#f8fae4' : p.kind === 3 ? '#929986' : '#0a100e';
      if (p.kind === 1) {
        const spread = p.r * (3 - p.life / p.total);
        ctx.beginPath(); ctx.moveTo(p.x - spread, p.y);
        ctx.bezierCurveTo(p.x-spread*.5,p.y-p.r*1.4,p.x+spread*.65,p.y-p.r*.8,p.x+spread,p.y);
        ctx.quadraticCurveTo(p.x,p.y+p.r*.18,p.x-spread,p.y); ctx.fill();
      } else {
        const size = p.r * (.45 + p.life / p.total * .55);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.beginPath(); ctx.moveTo(-size * .6, -size * .3); ctx.lineTo(size * .35, -size * .56); ctx.lineTo(size * .52, size * .42); ctx.lineTo(-size * .25, size * .62); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    for (const r of rings) {
      if (r.life <= 0) continue;
      const progress = 1 - r.life / r.total;
      const radius = 8 + Math.sqrt(progress) * (r.kind === 2 ? 74 : 28);
      ctx.globalAlpha = (1 - progress) * (r.kind === 2 ? .8 : .45);
      ctx.strokeStyle = r.kind === 0 ? '#18251e' : '#f2f5dc';
      ctx.lineWidth = r.kind === 2 ? 1.3 : .8;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, radius, radius * (r.kind === 0 ? .46 : 1), -.2, .18, TAU - .3); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function render(game, deltaTime) {
    const dt = clamp(Number.isFinite(deltaTime) ? deltaTime : 1 / 60, 0, .05);
    if (sceneryPlatforms !== game.platforms) {
      sceneryPlatforms = game.platforms;
      resonantBell.platform = game.platforms.find(platform => platform.resonance) || null;
      if (resonantBell.platform) Object.assign(resonantBell, resonantBell.platform.resonance);
    }
    clock += dt;
    if (deathMark) { deathMark.age += dt; if (deathMark.age > .8) deathMark = null; }
    updateEffects(game, dt);
    surfaceAsh.update(game, dt, reducedMotion);
    character.update(game, dt, reducedMotion);
    if (textureVersion !== assets.stone) {
      textureVersion = assets.stone;
      platformCache.clear(); wallCache.clear();
    }
    prepareKit();
    prepareSpider();
    prepareBell();
    prepareShrine();
    const scale = cssWidth / WORLD_WIDTH * pixelRatio;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const cameraY = game.cameraY || 0;
    const impactX = reducedMotion ? 0 : impact.x;
    const impactY = reducedMotion ? 0 : impact.y;
    ctx.clearRect(0, 0, WORLD_WIDTH, height);
    depth.drawBehind(ctx, game, clock, reducedMotion, shadowCasters.update(game, bells, height, reducedMotion));
    ctx.save();
    ctx.translate(impactX, -cameraY + impactY);
    drawSanctuaryLight(game, cameraY);
    drawRigging(game, cameraY);
    drawBells(cameraY);
    drawPlatforms(game, cameraY);
    surfaceAsh.draw(ctx,game,cameraY);
    drawWorldAmbience(game, cameraY);
    drawBeacon(game.checkpoint, false, cameraY, game.checkpoint?.active);
    drawBeacon(game.goal, true, cameraY, game.state === 'won');
    drawParticles(cameraY);
    ctx.restore();
    depth.drawNear(ctx, game, reducedMotion);
    ctx.save();
    ctx.translate(impactX, -cameraY + impactY);
    character.draw(ctx, game);
    // Lethal surfaces stay legible through mist, wakes, and character effects.
    drawHazards(game, cameraY);
    ctx.restore();
  }

  resize(cssWidth, cssHeight, 1);
  return {
    get atmosphereStatus() { return atmosphere?.status || { backend: 'canvas2d' }; },
    // Allocates only when the development inspection seam requests a sample.
    get sceneryState() {
      return {
        cages: Array.from(cages.values(), item => ({ ...item })),
        rigging: Array.from(riggingCache.values(), item => ({ platformId: item.platformId, age: item.age, strength: item.strength, contactOffset: item.contactOffset, segments: CABLE_SEGMENTS, leftBow: reducedMotion ? 0 : cableBow(.5, item.age, item.strength * (1 - item.contactOffset * .22), item.direction, -1), rightBow: reducedMotion ? 0 : cableBow(.5, item.age, item.strength * (1 + item.contactOffset * .22), item.direction, 1) })),
        activeParticles: particles.reduce((count, item) => count + Number(item.life > 0), 0),
        surfaceAsh: surfaceAsh.state,
        shadowCasters: shadowCasters.state,
        bells: bells.filter(item => item !== resonantBell || item.platform).map(item => ({ ...item, platform: item.platform?.id })),
        spiders: spiders.map(item => ({ ...item })),
      };
    },
    reset: resetEffects,
    resize,
    render,
    emit,
    setReducedMotion(value) {
      reducedMotion = Boolean(value);
      if (reducedMotion) {
        impact.x = impact.y = impact.vx = impact.vy = 0;
      }
    },
  };
}
