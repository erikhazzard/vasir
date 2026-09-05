/**
 * Ash & Echo · A painted world, with simulation-owned contact surfaces.
 * All caches and effects are presentation state. The game is only ever read.
 */
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
  let cssWidth = 420;
  let cssHeight = 740;
  let pixelRatio = 1;
  let height = 740;
  let reducedMotion = false;
  let clock = 0;
  let lastTime = -1;
  let lastState = '';
  let lastPlayerX = 0;
  let lastPlayerY = 0;
  let distanceToTrail = 0;
  let scrapeTime = 0;
  let landing = 0;
  let launch = 0;
  let recoil = 0;
  let cameraImpact = 0;
  let contactDirection = 1;
  let textureVersion = null;
  let heroVersion = null;
  let heroFrame = null;
  let atmosphere = null;
  const platformCache = new Map();
  const wallCache = new Map();
  const particles = Array.from({ length: 128 }, () => ({ life: 0, total: 0, x: 0, y: 0, vx: 0, vy: 0, r: 0, angle: 0, spin: 0, kind: 0 }));
  const trails = Array.from({ length: 26 }, () => ({ life: 0, x: 0, y: 0, vx: 0, vy: 0, r: 0 }));
  const rings = Array.from({ length: 5 }, () => ({ life: 0, total: 0, x: 0, y: 0, kind: 0 }));
  let particleCursor = 0;
  let trailCursor = 0;
  let ringCursor = 0;
  let randomState = 0x719bb501;
  function random() {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 4294967296;
  }

  const hazeSprite = surface(256, 256);
  const haze = hazeSprite.context.createRadialGradient(128, 128, 0, 128, 128, 128);
  haze.addColorStop(0, 'rgba(246,245,232,.43)');
  haze.addColorStop(.38, 'rgba(246,245,232,.22)');
  haze.addColorStop(1, 'rgba(246,245,232,0)');
  hazeSprite.context.fillStyle = haze;
  hazeSprite.context.fillRect(0, 0, 256, 256);

  const glowSprite = surface(160, 160);
  const glow = glowSprite.context.createRadialGradient(80, 80, 1, 80, 80, 80);
  glow.addColorStop(0, 'rgba(255,254,239,.96)');
  glow.addColorStop(.12, 'rgba(250,249,226,.48)');
  glow.addColorStop(.48, 'rgba(241,241,222,.12)');
  glow.addColorStop(1, 'rgba(241,241,222,0)');
  glowSprite.context.fillStyle = glow;
  glowSprite.context.fillRect(0, 0, 160, 160);

  function resetEffects() {
    for (const p of particles) p.life = 0;
    for (const p of trails) p.life = 0;
    for (const p of rings) p.life = 0;
    distanceToTrail = 0;
    scrapeTime = 0;
    landing = launch = recoil = cameraImpact = 0;
  }

  function resize(nextWidth, nextHeight, dpr = 1) {
    cssWidth = Math.max(1, nextWidth);
    cssHeight = Math.max(1, nextHeight);
    pixelRatio = clamp(dpr, 1, 2);
    height = cssHeight * WORLD_WIDTH / cssWidth;
    canvas.width = Math.round(cssWidth * pixelRatio);
    canvas.height = Math.round(cssHeight * pixelRatio);
    atmosphere = surface(WORLD_WIDTH, height);
    const shade = atmosphere.context.createLinearGradient(0, 0, WORLD_WIDTH, 0);
    shade.addColorStop(0, 'rgba(2,4,5,.34)');
    shade.addColorStop(.12, 'rgba(3,5,5,.04)');
    shade.addColorStop(.4, 'rgba(3,5,5,0)');
    shade.addColorStop(.7, 'rgba(3,5,5,0)');
    shade.addColorStop(.91, 'rgba(3,5,5,.06)');
    shade.addColorStop(1, 'rgba(2,4,5,.35)');
    atmosphere.context.fillStyle = shade;
    atmosphere.context.fillRect(0, 0, WORLD_WIDTH, height);
    const veil = atmosphere.context.createLinearGradient(0, 0, 0, height);
    veil.addColorStop(0, 'rgba(11,13,12,.24)');
    veil.addColorStop(.18, 'rgba(12,14,13,0)');
    veil.addColorStop(.8, 'rgba(12,14,13,0)');
    veil.addColorStop(1, 'rgba(7,9,9,.23)');
    atmosphere.context.fillStyle = veil;
    atmosphere.context.fillRect(0, 0, WORLD_WIDTH, height);
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
    const foundation = p.kind === 'floor' ? 120 : p.kind === 'checkpoint' ? 68 : 31 + hash(index * 23) * 22;
    const item = surface(p.w + pad * 2, bodyHeight + foundation + 20, 2);
    const c = item.context;
    c.translate(pad, 9);
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
        const brokenCourse = .16 + Math.floor(hash(seed + i * 3) * 4) * .08;
        const support = foundation * brokenCourse;
        c.lineTo(t * p.w, bodyHeight + support);
      }
    }
    c.closePath();
    if (p.kind !== 'floor') {
      // Surviving arch ribs and unequal broken piers make this a ruined
      // balcony, with open air underneath its clearly readable landing cap.
      const leftFoot = p.w * .11;
      const rightFoot = p.w * .89;
      c.moveTo(leftFoot - 7, bodyHeight - 1);
      c.lineTo(rightFoot + 7, bodyHeight - 1);
      c.lineTo(rightFoot + 4, bodyHeight + foundation * .76);
      c.lineTo(rightFoot - 2, bodyHeight + foundation * .69);
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
    for (let i = 0; i < p.w / 5; i++) {
      const x = hash(seed + i * 13) * p.w;
      const size = .9 + hash(seed + i * 7) * 2.3;
      c.fillStyle = i % 3 ? '#171c19' : '#73786b';
      c.fillRect(x, -.4 - hash(seed + i * 11) * 1.8, size, size);
    }
    // Root fibres and ivy follow the broken underside; never cover the cap.
    c.strokeStyle = '#111613';
    c.lineWidth = .65;
    for (let i = 0; i < Math.min(10, p.w / 16); i++) {
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

  function buildWall(p, index) {
    const width = Math.max(1, p.w);
    const item = surface(width + 12, 480, 2);
    const c = item.context;
    const left = p.x < 210;
    const seed = index * 71 + p.w;
    c.save();
    c.beginPath();
    if (left) {
      c.moveTo(0, 0);
      c.lineTo(width, 0);
      for (let y = 0; y <= 480; y += 8) c.lineTo(width - hash(seed + y) * 2, y);
      c.lineTo(0, 480);
    } else {
      c.moveTo(width + 12, 0);
      c.lineTo(0, 0);
      for (let y = 0; y <= 480; y += 8) c.lineTo(hash(seed + y) * 2, y);
      c.lineTo(width + 12, 480);
    }
    c.closePath();
    c.clip();
    drawTexture(c, width + 12, 480, seed, .92);
    const shade = c.createLinearGradient(0, 0, width + 12, 0);
    shade.addColorStop(0, left ? 'rgba(0,2,2,.90)' : 'rgba(0,2,2,.0)');
    shade.addColorStop(1, left ? 'rgba(0,2,2,.0)' : 'rgba(0,2,2,.90)');
    c.fillStyle = shade;
    c.fillRect(0, 0, width + 12, 480);
    c.restore();
    c.strokeStyle = 'rgba(163,169,150,.45)';
    c.lineWidth = .8;
    c.beginPath();
    for (let y = 0; y <= 480; y += 6) {
      const x = left ? width - hash(seed + y) * 1.6 : hash(seed + y) * 1.6;
      if (y === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    return item;
  }

  function prepareHero() {
    if (!available(assets.hero) || heroVersion === assets.hero) return;
    heroVersion = assets.hero;
    const iw = assets.hero.naturalWidth || assets.hero.width;
    const ih = assets.hero.naturalHeight || assets.hero.height;
    const probe = surface(iw, ih);
    probe.context.drawImage(assets.hero, 0, 0);
    let minX = iw, minY = ih, maxX = 0, maxY = 0;
    try {
      const data = probe.context.getImageData(0, 0, iw, ih).data;
      for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) {
        const i = (y * iw + x) * 4;
        if (data[i + 3] < 40) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    } catch {
      minX = 0; minY = 0; maxX = iw - 1; maxY = ih - 1;
    }
    heroFrame = { image: assets.hero, x: Math.max(0, minX - 2), y: Math.max(0, minY - 2), w: Math.max(1, maxX - minX + 5), h: Math.max(1, maxY - minY + 5) };
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
    for (const e of events) {
      const intensity = clamp(e.intensity || 1, .25, 1.5);
      const vx = e.vx || 0;
      const x = (e.x || 0) - (e.type === 'wallJump' ? Math.sign(vx) * 12 : 0);
      const y = (e.y || 0) - (e.type === 'wallJump' || e.type === 'doubleJump' || e.type === 'death' ? 14 : 0);
      const countFactor = reducedMotion ? .45 : 1;
      if (e.type === 'jump' || e.type === 'wallJump') {
        launch = 1;
        contactDirection = Math.sign(vx) || 1;
        if (e.type === 'wallJump') {
          recoil = 1;
          cameraImpact = Math.max(cameraImpact, .25);
        }
        const wall = e.type === 'wallJump';
        const count = Math.floor((wall ? 17 : 10) * countFactor);
        for (let i = 0; i < count; i++) {
          const dx = wall ? Math.sign(vx) * (20 + random() * 120) : (random() - .5) * 130;
          const dy = wall ? (random() - .35) * 160 : 8 - random() * 70;
          spawn(x + (wall ? 0 : (random() - .5) * 15), y, dx, dy, .7 + random() * 2.7, .28 + random() * .45, i % 4 === 0 ? 1 : 0);
        }
      } else if (e.type === 'doubleJump') {
        launch = 1;
        pulse(x, y, 0);
        const count = Math.floor(20 * countFactor);
        for (let i = 0; i < count; i++) {
          const angle = i / count * TAU;
          const speed = 35 + random() * 110;
          spawn(x, y, Math.cos(angle) * speed + vx * .12, Math.sin(angle) * speed + 35, .6 + random() * 2, .2 + random() * .35, 0);
        }
      } else if (e.type === 'land') {
        landing = Math.max(landing, clamp(intensity, .3, 1));
        cameraImpact = Math.max(cameraImpact, intensity * .38);
        const count = Math.floor((8 + intensity * 7) * countFactor);
        for (let i = 0; i < count; i++) {
          const side = i % 2 ? -1 : 1;
          spawn(x + side * random() * 12, y, side * (20 + random() * 115), -random() * 50, .5 + random() * 2.1, .22 + random() * .4, i % 3 === 0 ? 1 : 0);
        }
      } else if (e.type === 'death') {
        cameraImpact = .7;
        for (const t of trails) t.life = 0;
        for (let i = 0; i < Math.floor(36 * countFactor); i++) {
          const angle = random() * TAU;
          const speed = 25 + random() * 190;
          spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, .8 + random() * 4, .4 + random() * .7, 0);
        }
      } else if (e.type === 'respawn') {
        landing = .55;
        for (const t of trails) t.life = 0;
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
    launch = Math.max(0, launch - dt * 5.4);
    landing = Math.max(0, landing - dt * 5);
    recoil = Math.max(0, recoil - dt * 4.2);
    cameraImpact = Math.max(0, cameraImpact - dt * 3);
    for (const item of particles) {
      if (item.life <= 0) continue;
      item.life -= dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.vx *= Math.exp(-dt * (item.kind === 1 ? 3.5 : .6));
      item.vy += (item.kind === 2 ? -18 : item.kind === 1 ? -5 : 125) * dt;
      item.angle += item.spin * dt;
    }
    for (const item of trails) item.life = Math.max(0, item.life - dt);
    for (const item of rings) item.life = Math.max(0, item.life - dt);
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    if (p.wallDir && p.vy > 0 && game.state === 'playing') {
      scrapeTime += dt;
      if (scrapeTime > (reducedMotion ? .28 : .1)) {
        scrapeTime = 0;
        const contactX = p.wallDir < 0 ? p.x : p.x + p.w;
        spawn(contactX, cy + 6, -p.wallDir * (10 + random() * 13), random() * 22, .7 + random(), .3, 0);
      }
    } else scrapeTime = 0;
    const distance = Math.hypot(cx - lastPlayerX, cy - lastPlayerY);
    if (game.state === 'playing' && !reducedMotion && distance < 80 && !p.grounded && Math.hypot(p.vx, p.vy) > 150 && !(game.respawnTimer > 0)) {
      distanceToTrail += distance;
      if (distanceToTrail > 8) {
        const item = trails[trailCursor++ % trails.length];
        item.x = cx; item.y = cy; item.vx = p.vx; item.vy = p.vy;
        item.r = 8.5 + Math.min(4, Math.hypot(p.vx, p.vy) / 180);
        item.life = .22;
        distanceToTrail %= 8;
      }
    } else distanceToTrail = 0;
    lastPlayerX = cx; lastPlayerY = cy;
  }

  function drawBackdrop(game, cameraY) {
    ctx.fillStyle = '#babdb6';
    ctx.fillRect(0, 0, WORLD_WIDTH, height);
    const progress = reducedMotion ? .5 : clamp(cameraY / Math.max(1, game.height - height), 0, 1);
    const atmosphericCamera = reducedMotion ? 0 : cameraY;
    if (available(assets.background)) {
      const image = assets.background;
      const imageRatio = (image.naturalWidth || image.width) / (image.naturalHeight || image.height);
      const h = Math.max(height + 250, 1020);
      const w = Math.max(WORLD_WIDTH, h * imageRatio);
      ctx.drawImage(image, (WORLD_WIDTH - w) / 2, -(h - height) * progress, w, h);
    }
    if (available(assets.midground)) {
      const image = assets.midground;
      const ratio = (image.naturalWidth || image.width) / (image.naturalHeight || image.height);
      const h = Math.max(height + 470, 1250);
      const w = Math.max(WORLD_WIDTH + 20, h * ratio);
      ctx.globalAlpha = .62;
      ctx.drawImage(image, (WORLD_WIDTH - w) / 2 - 8, -(h - height) * progress - 20, w, h);
      ctx.globalAlpha = 1;
    }
    // Wide soft fog follows the architecture, independently of the foreground.
    for (let i = 0; i < 3; i++) {
      const baseY = mod(i * 370 - atmosphericCamera * .22 + 110, height + 420) - 210;
      const drift = reducedMotion ? 0 : Math.sin(clock * .09 + i * 2.1) * 24;
      ctx.globalAlpha = .48 + i * .06;
      ctx.drawImage(hazeSprite.canvas, -170 + drift + (i % 2) * 110, baseY, 640, 250);
    }
    ctx.globalAlpha = 1;
    // Narrow airborne ash and remote rooks give distance a slow, living scale.
    ctx.fillStyle = 'rgba(40,45,41,.31)';
    for (let i = 0; i < 36; i++) {
      const speed = 2 + hash(i * 7) * 5;
      const x = mod(hash(i * 11 + 8) * 440 + (reducedMotion ? 0 : clock * speed * .23), 440) - 10;
      const y = mod(hash(i * 19) * (height + 40) - atmosphericCamera * .35 + (reducedMotion ? 0 : clock * speed), height + 40) - 20;
      const size = .4 + hash(i + 50) * 1.2;
      ctx.fillRect(x, y, size, size);
    }
    ctx.strokeStyle = 'rgba(33,41,37,.25)';
    ctx.lineWidth = .8;
    for (let i = 0; i < 12; i++) {
      const x = mod(278 + i * 11 + (reducedMotion ? 0 : clock * 3.2), 570) - 75;
      const y = mod(240 + hash(i * 31) * 85 - atmosphericCamera * .13, height + 150) - 35;
      const wing = reducedMotion ? 1.7 : Math.sin(clock * 3.1 + i * .83) * 2.2;
      ctx.beginPath();
      ctx.moveTo(x - 2.7, y - wing);
      ctx.quadraticCurveTo(x - 1, y - 1, x, y + .3);
      ctx.quadraticCurveTo(x + 1, y - 1, x + 2.7, y - wing);
      ctx.stroke();
    }
  }

  function drawChain(x, y, length, sway = 0, cage = true) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);
    ctx.strokeStyle = '#252b25';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let linkY = 2; linkY < length; linkY += 4.5) {
      ctx.moveTo(1.3, linkY);
      ctx.ellipse(0, linkY, 1.25, 2.4, 0, 0, TAU);
    }
    ctx.stroke();
    if (cage) {
      ctx.translate(0, length + 2);
      ctx.strokeStyle = '#1c231f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-7, 25);
      ctx.lineTo(-7, 8);
      ctx.quadraticCurveTo(-6, 0, 0, 0);
      ctx.quadraticCurveTo(6, 0, 7, 8);
      ctx.lineTo(7, 25);
      ctx.moveTo(-8, 9); ctx.lineTo(8, 9);
      ctx.moveTo(-8, 23); ctx.lineTo(8, 23);
      ctx.moveTo(-8, 26); ctx.lineTo(8, 26);
      ctx.stroke();
      ctx.lineWidth = .8;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(i * 3, 3); ctx.lineTo(i * 3, 25); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawPlatforms(game, cameraY) {
    for (let index = 0; index < game.platforms.length; index++) {
      const p = game.platforms[index];
      if (p.y + p.h + 140 < cameraY || p.y > cameraY + height + 12) continue;
      if (p.kind === 'wall') {
        let cached = wallCache.get(index);
        if (!cached) { cached = buildWall(p, index); wallCache.set(index, cached); }
        ctx.save();
        ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
        const start = Math.floor((Math.max(p.y, cameraY) - p.y) / 480) * 480 + p.y;
        for (let y = start; y < Math.min(p.y + p.h, cameraY + height + 480); y += 480) ctx.drawImage(cached.canvas, p.x, y, cached.width, cached.height);
        ctx.restore();
      } else {
        let cached = platformCache.get(index);
        if (!cached || cached.collider !== p) {
          cached = buildPlatform(p, index);
          cached.collider = p;
          platformCache.set(index, cached);
        }
        if (index % 5 === 2 && p.kind === 'ledge') {
          ctx.globalAlpha = .58;
          drawChain(p.x + p.w * (index % 2 ? .78 : .22), p.y + p.h + 8, 42 + hash(index) * 24, reducedMotion ? 0 : Math.sin(clock * .55 + index) * .045);
          ctx.globalAlpha = 1;
        }
        ctx.drawImage(cached.canvas, p.x + cached.x, p.y + cached.y, cached.width, cached.height);
      }
    }
  }

  function drawHazards(game, cameraY) {
    for (const h of game.hazards) {
      if (h.y + h.h < cameraY || h.y > cameraY + height) continue;
      const sideways = h.orientation === 'left' || h.orientation === 'right';
      const count = Math.max(3, Math.floor((sideways ? h.h : h.w) / 6));
      ctx.fillStyle = '#101612';
      ctx.strokeStyle = '#afafa0';
      ctx.lineWidth = .65;
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const length = .7 + hash(i * 3 + h.y) * .3;
        ctx.beginPath();
        if (h.orientation === 'left') {
          const y = h.y + t * h.h;
          ctx.moveTo(h.x + h.w, y);
          ctx.lineTo(h.x + h.w * (1 - length), y + h.h / count * .46);
          ctx.lineTo(h.x + h.w, y + h.h / count);
        } else if (h.orientation === 'right') {
          const y = h.y + t * h.h;
          ctx.moveTo(h.x, y);
          ctx.lineTo(h.x + h.w * length, y + h.h / count * .46);
          ctx.lineTo(h.x, y + h.h / count);
        } else {
          const x = h.x + t * h.w;
          ctx.moveTo(x, h.y + h.h);
          ctx.lineTo(x + h.w / count * .56, h.y + h.h * (1 - length));
          ctx.lineTo(x + h.w / count, h.y + h.h);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
  }

  function drawBeacon(beacon, isGoal, cameraY, active) {
    if (!beacon || beacon.y + beacon.h + 100 < cameraY || beacon.y - 100 > cameraY + height) return;
    const x = beacon.x + beacon.w / 2;
    const bottom = beacon.y + beacon.h;
    const y = bottom - (isGoal ? 40 : 23);
    const breath = reducedMotion ? 1 : 1 + Math.sin(clock * 1.6) * .055;
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

  function drawTrails() {
    let previous = null;
    ctx.strokeStyle = '#060b08';
    ctx.lineCap = 'round';
    for (let i = 0; i < trails.length; i++) {
      const t = trails[(trailCursor + i) % trails.length];
      if (t.life <= 0) continue;
      const opacity = t.life / .22;
      const speed = Math.hypot(t.vx, t.vy) || 1;
      const ux = t.vx / speed;
      const uy = t.vy / speed;
      if (previous && Math.hypot(t.x - previous.x, t.y - previous.y) < 80) {
        ctx.globalAlpha = opacity * .45;
        ctx.lineWidth = .35 + opacity * 4.2;
        ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(t.x, t.y); ctx.stroke();
        // Two narrow fibres peel away from the main continuous ink wake.
        ctx.globalAlpha = opacity * .6;
        ctx.lineWidth = .45;
        for (let side = -1; side <= 1; side += 2) {
          const offset = side * (3.5 + (1 - opacity) * 7);
          const previousSpeed = Math.hypot(previous.vx, previous.vy) || 1;
          ctx.beginPath();
          ctx.moveTo(previous.x + previous.vy / previousSpeed * offset, previous.y - previous.vx / previousSpeed * offset);
          ctx.lineTo(t.x + uy * offset, t.y - ux * offset);
          ctx.stroke();
        }
      }
      previous = t;
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  }

  function drawParticles(cameraY) {
    for (const p of particles) {
      if (p.life <= 0 || p.y < cameraY - 30 || p.y > cameraY + height + 30) continue;
      const fade = Math.min(1, p.life / Math.min(.2, p.total * .5));
      ctx.globalAlpha = fade * (p.kind === 1 ? .15 : .87);
      ctx.fillStyle = p.kind === 2 ? '#f8fae4' : '#0a100e';
      if (p.kind === 1) {
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * (3 - p.life / p.total), p.r * 1.6, 0, 0, TAU); ctx.fill();
      } else {
        const size = p.r * (.45 + p.life / p.total * .55);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.fillRect(-size / 2, -size / 2, size, size * .82); ctx.restore();
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

  function drawHero(game) {
    const p = game.player;
    if (game.respawnTimer > .05 || p.motion === 'dead') return;
    const cx = p.x + p.w / 2;
    const foot = p.y + p.h;
    const speed = Math.hypot(p.vx, p.vy);
    const moving = speed > 35;
    const airborne = !p.grounded;
    const facing = p.facing || Math.sign(p.vx) || 1;
    const run = p.grounded && Math.abs(p.vx) > 20;
    const breath = reducedMotion ? 0 : Math.sin(clock * 2.6) * .025;
    const runBob = run && !reducedMotion ? Math.abs(Math.sin(clock * 17)) * 1.2 : 0;
    const squash = reducedMotion ? landing * .12 : landing * .28;
    const stretch = reducedMotion ? 0 : launch * .2 + (airborne ? Math.min(.1, Math.abs(p.vy) / 4200) : 0);
    const sx = 1 + squash - stretch * .32 + breath;
    const sy = 1 - squash + stretch - breath;
    const angle = reducedMotion ? 0 : airborne ? Math.atan2(p.vy, Math.abs(p.vx) + 160) * facing * .3 + recoil * contactDirection * .08 : clamp(p.vx / 3300, -.06, .06);
    if (p.grounded) {
      ctx.fillStyle = 'rgba(0,3,2,.26)';
      ctx.beginPath(); ctx.ellipse(cx, foot + 1, 14 + squash * 10, 2, 0, 0, TAU); ctx.fill();
    }
    const cy = foot - 14 * sy - runBob;
    // Ink hairs stream opposite actual velocity; no wind-up ever delays input.
    if (!reducedMotion && moving && airborne) {
      const ux = p.vx / (speed || 1);
      const uy = p.vy / (speed || 1);
      const length = clamp(speed * .055, 10, 37) + recoil * 13;
      ctx.strokeStyle = '#040908';
      for (let i = 0; i < 7; i++) {
        const offset = (i - 3) * 2.7;
        const end = length * (.55 + hash(i + 3) * .5);
        const wave = Math.sin(clock * 16 + i * 1.8) * 3;
        ctx.lineWidth = i % 3 === 0 ? 1.2 : .65;
        ctx.beginPath();
        ctx.moveTo(cx - ux * 6 + uy * offset, cy - uy * 6 - ux * offset);
        ctx.quadraticCurveTo(cx - ux * end * .55 + uy * (offset + wave), cy - uy * end * .55 - ux * (offset + wave), cx - ux * end + uy * (offset + wave * .3), cy - uy * end - ux * (offset + wave * .3));
        ctx.stroke();
      }
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(sx * facing, sy);
    if (heroFrame) {
      const drawHeight = 54;
      const drawWidth = drawHeight * heroFrame.w / heroFrame.h;
      // This source faces right: the dense head is at 79% of the trimmed
      // silhouette; centering the full tail would misalign the contact body.
      ctx.drawImage(heroFrame.image, heroFrame.x, heroFrame.y, heroFrame.w, heroFrame.h, -drawWidth * .79, -drawHeight * .47, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = '#030807';
      ctx.beginPath(); ctx.ellipse(0, 0, 12.6, 13.8, -.12, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f9fbee';
      ctx.beginPath(); ctx.ellipse(2.8, -2, 2.1, 3.2, -.08, 0, TAU); ctx.ellipse(8, -2.4, 1.8, 2.9, -.08, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // A spare orbit bead is the quiet, persistent read for the second jump.
    if (p.airJumps > 0 && airborne) {
      const orbitX = cx - facing * 17;
      const orbitY = cy + 9;
      ctx.globalAlpha = .82;
      ctx.fillStyle = '#f4f8e2';
      ctx.beginPath(); ctx.arc(orbitX, orbitY, 1.6, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawForeground(game, cameraY) {
    if (available(assets.foreground)) {
      const image = assets.foreground;
      const ratio = (image.naturalWidth || image.width) / (image.naturalHeight || image.height);
      const h = Math.max(height + 55, WORLD_WIDTH / ratio);
      const w = h * ratio;
      // Keep the near ornament behind the character and out of the jump corridor.
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, 32, height); ctx.rect(388, 0, 32, height); ctx.clip();
      ctx.globalAlpha = .67;
      ctx.drawImage(image, (WORLD_WIDTH - w) / 2, -25 + (reducedMotion ? 0 : Math.sin(clock * .1) * 2), w, h);
      ctx.restore();
    }
    if (atmosphere) ctx.drawImage(atmosphere.canvas, 0, 0, WORLD_WIDTH, height);
  }

  function render(game, deltaTime) {
    const dt = clamp(Number.isFinite(deltaTime) ? deltaTime : 1 / 60, 0, .05);
    clock += dt;
    updateEffects(game, dt);
    if (textureVersion !== assets.stone) {
      textureVersion = assets.stone;
      platformCache.clear(); wallCache.clear();
    }
    prepareHero();
    const scale = cssWidth / WORLD_WIDTH * pixelRatio;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const cameraY = game.cameraY || 0;
    const impact = reducedMotion ? 0 : cameraImpact * cameraImpact;
    const impactX = Math.sin(clock * 69) * impact * 2;
    const impactY = Math.cos(clock * 58) * impact * 2.8;
    drawBackdrop(game, cameraY);
    ctx.save();
    ctx.translate(impactX, -cameraY + impactY);
    drawPlatforms(game, cameraY);
    drawHazards(game, cameraY);
    drawBeacon(game.checkpoint, false, cameraY, game.checkpoint?.active);
    drawBeacon(game.goal, true, cameraY, game.state === 'won');
    drawTrails();
    drawParticles(cameraY);
    ctx.restore();
    drawForeground(game, cameraY);
    ctx.save();
    ctx.translate(impactX, -cameraY + impactY);
    drawHero(game);
    ctx.restore();
  }

  resize(cssWidth, cssHeight, 1);
  return {
    resize,
    render,
    emit,
    setReducedMotion(value) {
      reducedMotion = Boolean(value);
      if (reducedMotion) {
        cameraImpact = 0;
        for (const t of trails) t.life = 0;
      }
    },
  };
}
