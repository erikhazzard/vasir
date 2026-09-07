/**
 * Ash & Echo · A painted world, with simulation-owned contact surfaces.
 * All caches and effects are presentation state. The game is only ever read.
 */
import { createCharacter } from './character.js';
import { createDepth } from './depth.js';

const WORLD_WIDTH = 420;
const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const fract = n => n - Math.floor(n);
const hash = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const mod = (n, m) => ((n % m) + m) % m;

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
  const ctx = canvas.getContext('2d', { alpha: false });
  const character = createCharacter(assets);
  const depth = createDepth(assets);
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
  let corbelVersion = null;
  let shrineVersion = null;
  let shrineFrame = null;
  let spiderVersion = null;
  let spiderFrame = null;
  const platformCache = new Map();
  const wallCache = new Map();
  const hazardCache = new Map();
  const chainCache = new Map();
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

  function resetEffects() {
    lastTime = -1; lastState = '';
    for (const p of particles) p.life = 0;
    for (const p of rings) p.life = 0;
    scrapeTime = 0;
    impact.x = impact.y = impact.vx = impact.vy = 0;
    character.reset();
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
  }

  function drawTexture(context, width, bodyHeight, seed, opacity = .7) {
    context.fillStyle = '#141817';
    context.fillRect(-12, -8, width + 24, bodyHeight + 110);
    if (!available(assets.stone)) return;
    const image = assets.stone;
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    const tileWidth = 190;
    const tileHeight = tileWidth * ih / iw;
    context.globalAlpha = opacity;
    const ox = -hash(seed + 1) * tileWidth;
    const oy = -hash(seed + 2) * tileHeight;
    for (let x = ox; x < width + 14; x += tileWidth) {
      for (let y = oy; y < bodyHeight + 100; y += tileHeight) {
        context.drawImage(image, x, y, tileWidth, tileHeight);
      }
    }
    context.globalAlpha = 1;
    context.fillStyle = 'rgba(1,4,4,.30)';
    context.fillRect(-12, -8, width + 24, bodyHeight + 110);
  }

  function buildPlatform(p, index) {
    const pad = 12;
    const bodyHeight = Math.max(p.h, 13);
    const side = p.kind === 'ledge' && p.x <= 61 ? -1 : p.kind === 'ledge' && p.x + p.w >= 359 ? 1 : 0;
    const style = Math.floor(hash(index * 19 + 2) * 3);
    const foundation = p.kind === 'floor' ? 120 : side ? 74 + hash(index * 23) * 37 : p.kind === 'checkpoint' ? 79 : 26 + hash(index * 23) * 29;
    const item = surface(p.w + pad * 2, bodyHeight + foundation + 20, 2);
    const c = item.context;
    c.translate(pad, 9);
    if (side === 1) { c.translate(p.w, 0); c.scale(-1, 1); }
    const seed = index * 107 + p.y * .17 + p.w;
    // Broken corbels remain visibly underneath the thin, bright landing cap.
    c.save();
    c.beginPath();
    c.moveTo(1, 2);
    c.lineTo(p.w - 1, 2);
    c.lineTo(p.w - 2, bodyHeight - 2);
    if (p.kind === 'floor') {
      c.lineTo(p.w, bodyHeight + foundation);
      c.lineTo(0, bodyHeight + foundation);
    } else {
      const nodes = Math.max(5, Math.ceil(p.w / 9));
      for (let i = nodes; i >= 0; i--) {
        const t = i / nodes;
        const brokenCourse = .04 + Math.floor(hash(seed + i * 3) * 4) * .035;
        const support = foundation * brokenCourse;
        c.lineTo(t * p.w, bodyHeight + support);
      }
    }
    c.closePath();
    if (side) {
      // Side balconies have a load-bearing connection all the way into the
      // tower. Their three profiles are deliberately unlike the free bridges.
      c.moveTo(0, bodyHeight - 2);
      c.lineTo(p.w - 2, bodyHeight - 2);
      if (style === 0) {
        c.lineTo(p.w - 9, bodyHeight + 7);
        c.bezierCurveTo(p.w * .37, bodyHeight + 5, 16, bodyHeight + foundation * .49, 12, bodyHeight + foundation);
        c.lineTo(0, bodyHeight + foundation - 3);
      } else if (style === 1) {
        c.lineTo(p.w - 8, bodyHeight + 9);
        c.lineTo(p.w * .69, bodyHeight + 13);
        c.lineTo(p.w * .65, bodyHeight + 29);
        c.lineTo(p.w * .36, bodyHeight + 35);
        c.lineTo(p.w * .30, bodyHeight + 57);
        c.lineTo(12, bodyHeight + foundation - 4);
        c.lineTo(0, bodyHeight + foundation);
      } else {
        c.lineTo(p.w - 5, bodyHeight + 5);
        c.lineTo(p.w * .72, bodyHeight + 12);
        c.lineTo(p.w * .29, bodyHeight + foundation * .83);
        c.lineTo(p.w * .19, bodyHeight + foundation);
        c.lineTo(3, bodyHeight + foundation - 7);
        c.lineTo(0, bodyHeight + foundation * .55);
      }
      c.closePath();
      if (style === 2) {
        // An open triangular gap makes the surviving diagonal rib legible.
        c.moveTo(8, bodyHeight + 9);
        c.lineTo(8, bodyHeight + foundation * .64);
        c.lineTo(p.w * .56, bodyHeight + 9);
        c.closePath();
      }
    } else if (p.kind !== 'floor' && style !== 1) {
      // Centre rows are fractured spans: unequal feet, a broken keystone,
      // and occasionally a surviving narrow arch rather than two corbels.
      const leftFoot = p.w * .11;
      const rightFoot = p.w * (style === 2 ? .76 : .91);
      c.moveTo(leftFoot - 7, bodyHeight - 1);
      c.lineTo(rightFoot + 7, bodyHeight - 1);
      c.lineTo(rightFoot + 4, bodyHeight + foundation * .52);
      c.lineTo(rightFoot - 2, bodyHeight + foundation * .46);
      c.bezierCurveTo(rightFoot - 5, bodyHeight + 16, p.w * .66, bodyHeight + 9, p.w / 2, bodyHeight + 5);
      c.bezierCurveTo(p.w * .34, bodyHeight + 9, leftFoot + 3, bodyHeight + 19, leftFoot + 4, bodyHeight + foundation);
      c.lineTo(leftFoot - 5, bodyHeight + foundation - 3);
    c.closePath();
    }
    c.clip();
    drawTexture(c, p.w, bodyHeight + foundation, seed, .91);
    const under = c.createLinearGradient(0, 0, 0, bodyHeight + foundation);
    under.addColorStop(0, 'rgba(3,5,5,0)');
    under.addColorStop(.25, 'rgba(2,4,4,.18)');
    under.addColorStop(.9, 'rgba(2,4,4,.85)');
    c.fillStyle = under;
    c.fillRect(0, 0, p.w, bodyHeight + foundation);
    // Cut-stone cornices carry a little side light; relief stays inside the
    // cached masonry mask and never invents another collision surface.
    c.strokeStyle = 'rgba(165,170,150,.35)';
    c.lineWidth = .8;
    for (let y = 6; y < 13; y += 4) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(p.w, y); c.stroke();
    }
    if (side) {
      c.fillStyle = 'rgba(0,3,3,.46)';
      c.fillRect(5, bodyHeight + 10, 5, foundation);
      c.strokeStyle = 'rgba(148,158,136,.25)';
      c.beginPath(); c.moveTo(12, bodyHeight + 6); c.lineTo(12, bodyHeight + foundation); c.stroke();
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(20, bodyHeight + foundation * .75);
      c.bezierCurveTo(27, bodyHeight + 21, p.w * .66, bodyHeight + 11, p.w - 11, bodyHeight + 6);
      c.stroke();
    } else if (style === 1 && p.kind !== 'floor') {
      c.fillStyle = '#060b08';
      c.beginPath(); c.moveTo(p.w * .57, 10); c.lineTo(p.w * .53, bodyHeight + 20); c.lineTo(p.w * .62, bodyHeight + 12); c.closePath(); c.fill();
    }
    c.restore();
    // A continuous physical edge, interrupted only by fine erosion.
    c.fillStyle = '#111514';
    c.fillRect(0, 0, p.w, Math.min(bodyHeight, 3));
    c.strokeStyle = '#96988b';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(0, .3);
    for (let x = 5; x < p.w; x += 5) c.lineTo(x, hash(seed + x) * 1.2 - .4);
    c.lineTo(p.w, .3);
    c.stroke();
    c.strokeStyle = 'rgba(193,193,171,.27)';
    c.lineWidth = .7;
    c.beginPath();
    c.moveTo(1, 3.6);
    c.lineTo(p.w - 1, 3.6);
    c.stroke();
    for (let i = 0; i < p.w / 8; i++) {
      const x = hash(seed + i * 13) * p.w;
      const size = .9 + hash(seed + i * 7) * 2.3;
      c.fillStyle = i % 3 ? '#171c19' : '#73786b';
      c.fillRect(x, -.4 - hash(seed + i * 11) * 1.8, size, size);
    }
    // Root fibres and ivy follow the broken underside; never cover the cap.
    c.strokeStyle = '#111613';
    c.lineWidth = .65;
    for (let i = 0; i < Math.min(7, p.w / 24); i++) {
      const x = hash(seed + i * 17) * p.w;
      const length = 9 + hash(seed + i * 31) * 26;
      c.beginPath();
      c.moveTo(x, bodyHeight - 2);
      c.bezierCurveTo(x + 4, bodyHeight + length * .3, x - 4, bodyHeight + length * .7, x - 1, bodyHeight + length);
      c.stroke();
    }
    // Tiny architectural remnants sit at the ends, clear of the usable centre.
    if (p.kind !== 'floor' && p.w > 80 && index % 3 === 1) {
      const x = index % 2 ? 8 : p.w - 12;
      c.fillStyle = '#171b19';
      c.fillRect(x, -6, 3, 6);
      c.fillRect(x - 2, -5, 7, 1.3);
    }
    return { ...item, x: -pad, y: -9 };
  }

  function buildPaintedPlatform(p, index) {
    const image = assets.corbel;
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    const side = p.kind === 'ledge' && p.x <= 61 ? -1 : p.kind === 'ledge' && p.x + p.w >= 359 ? 1 : 0;
    const style = Math.floor(hash(index * 19 + 2) * 3);
    const pad = 36;
    const top = 32;
    const scaleX = side ? (p.w + 2) / 1027 : p.w / (1217 - (style === 1 ? 430 : 255));
    const scaleY = scaleX * (side ? style === 0 ? 1.25 : style === 1 ? .93 : 1.08 : p.kind === 'checkpoint' ? .62 : style === 2 ? .86 : 1.02);
    const item = surface(p.w + pad * 2, top + Math.max(90, (ih - 332) * scaleY) + 10, 2);
    const c = item.context;
    c.translate(pad, top);
    if (side === 1 || (!side && style === 2)) { c.translate(p.w, 0); c.scale(-1, 1); }
    if (side) {
      // Source y332 is the actual worn cornice. Its tall left pillar is
      // embedded in the wall, which is composited over it later in this pass.
      c.drawImage(image, -190 * scaleX, -332 * scaleY, iw * scaleX, ih * scaleY);
    } else {
      // The surviving outer span yields a fractured bridge without a fake
      // load-bearing column suspended beneath its centre.
      const sourceX = style === 1 ? 430 : 255;
      c.drawImage(image, sourceX, 332, 1217 - sourceX, ih - 332, 0, 0, p.w, (ih - 332) * scaleY);
    }
    c.globalCompositeOperation = 'source-atop';
    const reliefShade = c.createLinearGradient(0, 0, 0, Math.min(100, item.height - top));
    reliefShade.addColorStop(0, 'rgba(5,9,8,.18)');
    reliefShade.addColorStop(.2, 'rgba(5,9,8,.34)');
    reliefShade.addColorStop(1, 'rgba(5,9,8,.66)');
    c.fillStyle = reliefShade;
    c.fillRect(-pad, -top, p.w + pad * 2, item.height);
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(185,190,167,.72)';
    c.lineWidth = .72;
    c.beginPath(); c.moveTo(0, .2);
    for (let x = 7; x < p.w; x += 7) c.lineTo(x, hash(index * 17 + x) * .55);
    c.lineTo(p.w, .2); c.stroke();
    return { ...item, x: -pad, y: -top };
  }

  function buildWall(p, index) {
    const width = Math.max(1, p.w);
    const item = surface(width + 12, 480, 2);
    const c = item.context;
    const left = p.x < 210;
    const seed = index * 71 + p.w;
    const courseHeight = 21 + Math.floor(hash(seed + 8) * 13);
    const edgeInset = y => {
      const course = Math.floor(y / courseHeight);
      const scar = hash(seed + course * 17);
      return (scar > .68 ? 2 + scar * 4 : scar * 1.8) + (y % courseHeight < 3 ? 1.8 : 0);
    };
    c.save();
    c.beginPath();
    if (left) {
      c.moveTo(0, 0);
      c.lineTo(width, 0);
      for (let y = 0; y <= 480; y += 3) c.lineTo(width - edgeInset(y), y);
      c.lineTo(0, 480);
    } else {
      c.moveTo(width + 12, 0);
      c.lineTo(0, 0);
      for (let y = 0; y <= 480; y += 3) c.lineTo(edgeInset(y), y);
      c.lineTo(width + 12, 480);
    }
    c.closePath();
    c.clip();
    drawTexture(c, width + 12, 480, seed, .92);
    c.save();
    if (!left) { c.translate(width, 0); c.scale(-1, 1); }
    const nicheX = width * (.06 + hash(seed + 2) * .18);
    const nicheWidth = width * (.34 + hash(seed + 3) * .22);
    const nicheY = 58 + hash(seed + 4) * 174;
    const nicheHeight = 84 + hash(seed + 5) * 128;
    if (hash(seed + 6) > .33) {
      c.fillStyle = 'rgba(1,5,4,.78)';
      c.beginPath(); arch(c, nicheX, nicheY, nicheWidth, nicheHeight); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(134,142,124,.29)';
      c.lineWidth = 1.4;
      c.beginPath(); arch(c, nicheX - 3, nicheY - 7, nicheWidth + 6, nicheHeight + 12); c.stroke();
      c.strokeStyle = 'rgba(3,7,5,.85)';
      c.lineWidth = 3;
      c.beginPath(); c.moveTo(nicheX + nicheWidth / 2, nicheY + 5); c.lineTo(nicheX + nicheWidth / 2, nicheY + nicheHeight); c.stroke();
    }
    // A separate crop is dressed into each damaged edge block. Large broken
    // faces and their dark joints interrupt the wall's photographic tiling.
    if (available(assets.stone)) {
      const iw = assets.stone.naturalWidth || assets.stone.width;
      const ih = assets.stone.naturalHeight || assets.stone.height;
      for (let y = -9, course = 0; y < 480; y += courseHeight, course++) {
        const blockWidth = 15 + hash(seed + course * 29) * 30;
        const inset = edgeInset(y + courseHeight * .5);
        c.save();
        c.beginPath();
        c.moveTo(width - blockWidth, y + 2);
        c.lineTo(width - inset - 2, y);
        c.lineTo(width - inset, y + courseHeight * .37);
        c.lineTo(width - inset - 1, y + courseHeight - 3);
        c.lineTo(width - blockWidth + 3, y + courseHeight - 1);
        c.closePath(); c.clip();
        c.globalAlpha = .52;
        c.drawImage(assets.stone, hash(seed + course * 3) * iw * .74, hash(seed + course * 7) * ih * .74, iw * .24, ih * .22, width - blockWidth, y, blockWidth, courseHeight);
        c.globalAlpha = 1;
        c.fillStyle = 'rgba(0,4,3,.36)';
        c.fillRect(width - blockWidth, y + courseHeight - 5, blockWidth, 5);
        c.restore();
        c.strokeStyle = 'rgba(176,181,159,.30)';
        c.lineWidth = .7;
        c.beginPath(); c.moveTo(width - inset - 2, y + 2); c.lineTo(width - inset, y + 5); c.lineTo(width - inset - 1, y + courseHeight * .53); c.stroke();
      }
    }
    // Unequal masonry ribs, deep joints, and broken cornices are relief on
    // the real wall. The innermost collision plane remains at its exact edge.
    const cornices = hash(seed + 17) > .5 ? 2 : 1;
    for (let i = 0; i < cornices; i++) {
      const y = 24 + i * 233 + hash(seed + i) * 131;
      c.fillStyle = '#080d0b';
      c.fillRect(0, y + 7, width, 9);
      c.fillStyle = 'rgba(142,150,130,.32)';
      c.fillRect(0, y, width - 2, 1.5);
      c.fillStyle = 'rgba(170,174,154,.14)';
      c.fillRect(0, y + 4, width - 4, 1);
      c.beginPath(); c.moveTo(width - 14, y + 15); c.lineTo(width - 7, y + 15); c.lineTo(width - 10, y + 29); c.lineTo(width - 14, y + 26); c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(0,4,3,.47)';
    const ribX = width * (.48 + hash(seed + 22) * .22);
    c.fillRect(ribX, 0, 4, 480);
    c.strokeStyle = 'rgba(118,132,110,.32)';
    c.lineWidth = .7;
    c.beginPath(); c.moveTo(ribX + 6, 0); c.lineTo(ribX + 6, 480); c.stroke();
    c.strokeStyle = '#030806';
    c.lineWidth = 1.7;
    c.beginPath(); c.moveTo(width - 8, 280); c.lineTo(width - 26, 301); c.lineTo(width - 18, 327); c.lineTo(width - 30, 352); c.stroke();
    c.lineWidth = .7;
    for (let i = 0; i < 7; i++) {
      const x = width - 6 - hash(seed + i * 5) * 17;
      const y = hash(seed + i * 9) * 410;
      c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - 11, y + 18, x + 5, y + 38, x - 3, y + 67); c.stroke();
    }
    c.restore();
    const shade = c.createLinearGradient(0, 0, width + 12, 0);
    shade.addColorStop(0, left ? 'rgba(0,2,2,.73)' : 'rgba(0,2,2,.0)');
    shade.addColorStop(1, left ? 'rgba(0,2,2,.0)' : 'rgba(0,2,2,.73)');
    c.fillStyle = shade;
    c.fillRect(0, 0, width + 12, 480);
    c.restore();
    // Local masonry catches chamber air; near-camera stone keeps the black
    // point. Their overlap must read independently of texture and parallax.
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(60,65,62,.32)';
    c.fillRect(0, 0, width + 12, 480);
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(183,188,165,.44)';
    c.lineWidth = .65;
    for (let y = 2; y < 480; y += courseHeight) {
      const inset = edgeInset(y + 7);
      const x = left ? width - inset : inset;
      c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x + (left ? -1 : 1), y + courseHeight * .63); c.stroke();
    }
    return item;
  }

  function prepareSpider() {
    if (!available(assets.spider) || spiderVersion === assets.spider) return;
    spiderVersion = assets.spider;
    spiderFrame = surface(190, 190, 2);
    spiderFrame.context.drawImage(assets.spider, 0, 0, 190, 190);
  }

  function prepareShrine() {
    if (!available(assets.shrine) || shrineVersion === assets.shrine) return;
    shrineVersion = assets.shrine;
    shrineFrame = surface(160, 245, 2);
    shrineFrame.context.drawImage(assets.shrine, 20, 15, 984, 1510, 0, 0, 160, 245);
  }

  function drawWorldAmbience(cameraY) {
    if (!spiderFrame) return;
    for (let i = 0; i < 2; i++) {
      const y = i === 0 ? 3880 : 2220;
      if (y + 195 < cameraY || y > cameraY + height) continue;
      const breath = reducedMotion ? 0 : Math.sin(clock * .65 + i * 2) * .005;
      ctx.save();
      // This creature inhabits the outer architecture. Its body stays in the
      // solid wall; only a few slender legs enter the peripheral 20px strip.
      ctx.beginPath(); ctx.rect(0, y - 4, 79, 201); ctx.clip();
      ctx.translate(-42, y);
      ctx.scale(1 + breath, 1 - breath);
      ctx.globalAlpha = .91;
      ctx.drawImage(spiderFrame.canvas, 0, 0, 190, 190);
      ctx.restore();
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
    for (const e of events) {
      const intensity = clamp(e.intensity || 1, .25, 1.5);
      const vx = e.vx || 0;
      const x = (e.x || 0) - (e.type === 'wallJump' ? Math.sign(vx) * 12 : 0);
      const y = (e.y || 0) - (e.type === 'wallJump' || e.type === 'doubleJump' || e.type === 'death' ? 14 : 0);
      const countFactor = reducedMotion ? .45 : 1;
      if (e.type === 'jump' || e.type === 'wallJump') {
        if (e.type === 'wallJump') {
          impact.vx += Math.sign(vx) * 105;
          impact.vy += 24;
        }
        const wall = e.type === 'wallJump';
        if (!wall) impact.vy += 28;
        const count = Math.floor((wall ? 25 : 13) * countFactor);
        for (let i = 0; i < count; i++) {
          const dx = wall ? Math.sign(vx) * (35 + random() * 175) : (random() - .5) * 150;
          const dy = wall ? -95 + random() * 155 : 8 - random() * 70;
          spawn(x + (wall ? 0 : (random() - .5) * 15), y + (wall ? (random() - .5) * 18 : 0), dx, dy, .9 + random() * (wall ? 3.6 : 2.7), .28 + random() * .45, i % 4 === 0 ? 1 : wall && i % 3 === 0 ? 3 : 0);
        }
      } else if (e.type === 'doubleJump') {
        impact.vy += 40;
        pulse(x, y, 0);
        const count = Math.floor(20 * countFactor);
        for (let i = 0; i < count; i++) {
          const angle = i / count * TAU;
          const speed = 35 + random() * 110;
          spawn(x, y, Math.cos(angle) * speed + vx * .12, Math.sin(angle) * speed + 35, .6 + random() * 2, .2 + random() * .35, 0);
        }
      } else if (e.type === 'land') {
        impact.vy += 108 * intensity;
        const count = Math.floor((8 + intensity * 7) * countFactor);
        for (let i = 0; i < count; i++) {
          const side = i % 2 ? -1 : 1;
          spawn(x + side * random() * 12, y, side * (20 + random() * 115), -random() * 50, .5 + random() * 2.1, .22 + random() * .4, i % 3 === 0 ? 1 : 0);
        }
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
        pulse(x, y, 1);
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
      impact.vx += (-impact.x * 620 - impact.vx * 27) * step;
      impact.vy += (-impact.y * 620 - impact.vy * 27) * step;
      impact.x = clamp(impact.x + impact.vx * step, -5, 5);
      impact.y = clamp(impact.y + impact.vy * step, -5, 5);
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
    c.strokeStyle = '#151c17';
    c.lineWidth = .9;
    for (let y = 2, i = 0; y < length; y += 4.4, i++) {
      c.beginPath(); c.ellipse((hash(i * 11) - .5) * .7, y, i % 2 ? .55 : 1.3, 2.6, (hash(i * 3) - .5) * .2, 0, TAU); c.stroke();
    }
    if (hasCage) {
      c.translate(0, length + 3);
      c.strokeStyle = '#171e18';
      c.lineWidth = 1.7;
      c.beginPath();
      c.moveTo(-9, 29); c.lineTo(-8.4, 8); c.bezierCurveTo(-8, 2, -3, 1, 0, -2);
      c.bezierCurveTo(4, 1, 8, 2, 8.7, 8); c.lineTo(9.4, 29); c.stroke();
      c.fillStyle = '#141b15';
      c.beginPath(); c.ellipse(0, 29, 10.3, 2.3, .025, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(0, 8, 9.2, 1.7, -.025, 0, TAU); c.fill();
      c.strokeStyle = '#2d372c';
      c.lineWidth = .7;
      c.beginPath(); c.ellipse(0, 27, 9.7, 1.8, .025, 0, Math.PI); c.stroke();
      for (let i = -3; i <= 3; i++) {
        const x = i * 2.5;
        c.strokeStyle = i % 2 ? '#111812' : '#283224';
        c.lineWidth = i % 3 ? .85 : 1.35;
        c.beginPath(); c.moveTo(x * .46, 1 + Math.abs(i));
        c.bezierCurveTo(x, 9, x + hash(i + 8) * 1.7 - .8, 19, x + .4, 28); c.stroke();
      }
      // Blackened cloth and accreted rust break the airy wire-frame read.
      c.fillStyle = '#182016';
      c.beginPath(); c.moveTo(-7, 15); c.lineTo(-2, 19); c.lineTo(0, 16); c.lineTo(3, 24); c.lineTo(5, 27); c.lineTo(-7, 28); c.closePath(); c.fill();
      for (let i = 0; i < 37; i++) {
        c.fillStyle = i % 4 ? '#131b13' : '#657052';
        const x = (hash(i * 13 + length) - .5) * 20;
        const y = hash(i * 5 + 2) * 31;
        c.fillRect(x, y, .55 + hash(i + 9) * 1.2, .7 + hash(i + 3) * 1.7);
      }
      c.strokeStyle = '#172014';
      c.lineWidth = .65;
      c.beginPath(); c.moveTo(-7, 28); c.bezierCurveTo(-11, 31, -6, 36, -8, 40); c.moveTo(5, 28); c.lineTo(6, 33); c.stroke();
      c.strokeStyle = '#7b856b';
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

  function drawPlatforms(game, cameraY) {
    for (let index = 0; index < game.platforms.length; index++) {
      const p = game.platforms[index];
      if (p.y + p.h + 140 < cameraY || p.y > cameraY + height + 12) continue;
      if (p.kind === 'wall') {
        ctx.save();
        ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
        const start = Math.floor((Math.max(p.y, cameraY) - p.y) / 480) * 480 + p.y;
        for (let y = start; y < Math.min(p.y + p.h, cameraY + height); y += 480) {
          const key = index * 32 + Math.floor((y - p.y) / 480);
          let cached = wallCache.get(key);
          if (!cached) { cached = buildWall(p, key); wallCache.set(key, cached); }
          ctx.drawImage(cached.canvas, p.x, y, cached.width, cached.height);
        }
        ctx.restore();
      } else {
        let cached = platformCache.get(index);
        if (!cached || cached.collider !== p) {
          cached = available(assets.corbel) && p.kind !== 'floor' ? buildPaintedPlatform(p, index) : buildPlatform(p, index);
          cached.collider = p;
          platformCache.set(index, cached);
        }
        if (index % 5 === 2 && p.kind === 'ledge') {
          ctx.globalAlpha = .84;
          const anchor = p.x <= 61 ? .82 : p.x + p.w >= 359 ? .18 : .58;
          drawChain(p.x + p.w * anchor, p.y + p.h + 8, 42 + hash(index) * 24, reducedMotion ? 0 : Math.sin(clock * .55 + index) * .045);
          ctx.globalAlpha = 1;
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
    c.shadowColor = '#da264b'; c.shadowBlur = 8;
    c.strokeStyle = '#22080e'; c.lineWidth = 3.4; c.stroke(blades);
    c.shadowBlur = 0;
    const enamel = c.createLinearGradient(0, 0, 0, depth);
    enamel.addColorStop(0, '#fff9e0');
    enamel.addColorStop(.32, '#ffecd5');
    enamel.addColorStop(.54, '#ed9186');
    enamel.addColorStop(.79, '#b72f49');
    enamel.addColorStop(1, '#59182d');
    c.fillStyle = enamel; c.fill(blades);
    c.strokeStyle = '#ffe1c9'; c.lineWidth = .9; c.stroke(blades);
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
      const width = isGoal ? 110 : 78;
      const shrineHeight = width * 245 / 160;
      const lightY = bottom - shrineHeight * .38;
      ctx.globalAlpha = isGoal ? .88 : active ? .84 : .64;
      ctx.drawImage(glowSprite.canvas, x - width * .66, lightY - width * .66, width * 1.32, width * 1.32);
      ctx.globalAlpha = isGoal ? .7 : .46;
      ctx.drawImage(glowSprite.canvas, x - width * .18, bottom - shrineHeight * .7, width * .36, shrineHeight * .8);
      ctx.globalAlpha = 1;
      ctx.drawImage(shrineFrame.canvas, x - width / 2, bottom - shrineHeight + .4, width, shrineHeight);
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
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * (3 - p.life / p.total), p.r * 1.6, 0, 0, TAU); ctx.fill();
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
    clock += dt;
    if (deathMark) { deathMark.age += dt; if (deathMark.age > .8) deathMark = null; }
    updateEffects(game, dt);
    character.update(game, dt, reducedMotion);
    if (textureVersion !== assets.stone) {
      textureVersion = assets.stone;
      platformCache.clear(); wallCache.clear();
    }
    if (corbelVersion !== assets.corbel) {
      corbelVersion = assets.corbel;
      platformCache.clear();
    }
    prepareSpider();
    prepareShrine();
    const scale = cssWidth / WORLD_WIDTH * pixelRatio;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const cameraY = game.cameraY || 0;
    const impactX = reducedMotion ? 0 : impact.x;
    const impactY = reducedMotion ? 0 : impact.y;
    depth.drawBehind(ctx, game, clock, reducedMotion);
    ctx.save();
    ctx.translate(impactX, -cameraY + impactY);
    drawPlatforms(game, cameraY);
    drawWorldAmbience(cameraY);
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
