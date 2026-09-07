/**
 * Scenery has its own spatial scale; contact geometry remains in renderer.js.
 * Tone and focus are baked once into small canvases. Runtime only composites
 * cached planes, with no pixel reads, filters, or full-size allocations.
 */
const WIDTH = 420;
const mod = (n, m) => ((n % m) + m) % m;

function surface(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width); canvas.height = Math.ceil(height);
  return { canvas, ctx: canvas.getContext('2d') };
}

function focusedImage(image, width, color, tint, blur = 0) {
  const h = width * image.naturalHeight / image.naturalWidth;
  const raw = surface(width, h);
  raw.ctx.drawImage(image, 0, 0, width, h);
  raw.ctx.globalCompositeOperation = 'source-atop';
  raw.ctx.globalAlpha = tint;
  raw.ctx.fillStyle = color;
  raw.ctx.fillRect(0, 0, width, h);
  raw.ctx.globalAlpha = 1;
  const soft = surface(width + 8, h + 8);
  // Low-resolution rasterization also provides a focus falloff on browsers
  // that do not support Canvas filters. The filter is never used per frame.
  if (blur) soft.ctx.filter = `blur(${blur}px)`;
  soft.ctx.drawImage(raw.canvas, 4, 4);
  return soft.canvas;
}

export function createDepth(assets) {
  let height = 740;
  let far = null, arch = null, near = null;
  let backgroundVersion, archVersion;
  let air, light, shade, mist;
  // A few enormous structures cut across one another as the climb reveals
  // different chambers. These are scenery coordinates, not repeated tiles.
  const structures = [
    { x: -38, y: 2070, width: 610, flip: false },
    { x: -150, y: 900, width: 660, flip: true },
    { x: -24, y: -250, width: 650, flip: false },
    { x: -240, y: -1400, width: 730, flip: true },
  ];
  const nearStones = [
    { side: -1, y: 4100, scale: 1.04 },
    { side: 1, y: 3010, scale: .86 },
    { side: -1, y: 1870, scale: 1.15 },
    { side: 1, y: 750, scale: .93 },
    { side: -1, y: -470, scale: 1.08 },
  ];

  function resize(nextHeight) {
    height = nextHeight;
    air = surface(210, height / 2);
    const g = air.ctx.createLinearGradient(0, 0, 210, height / 2);
    g.addColorStop(0, '#747b78');
    g.addColorStop(.48, '#b4b9b3');
    g.addColorStop(1, '#929994');
    air.ctx.fillStyle = g; air.ctx.fillRect(0, 0, 210, height / 2);

    light = surface(256, 256);
    const l = light.ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    l.addColorStop(0, 'rgba(242,240,222,.88)');
    l.addColorStop(.26, 'rgba(233,233,217,.72)');
    l.addColorStop(.62, 'rgba(218,222,211,.32)');
    l.addColorStop(1, 'rgba(218,222,211,0)');
    light.ctx.fillStyle = l; light.ctx.fillRect(0, 0, 256, 256);

    mist = surface(192, 128);
    const m = mist.ctx.createRadialGradient(96, 64, 0, 96, 64, 64);
    m.addColorStop(0, 'rgba(203,211,201,.48)');
    m.addColorStop(.38, 'rgba(196,204,195,.26)');
    m.addColorStop(1, 'rgba(196,204,195,0)');
    mist.ctx.save(); mist.ctx.translate(96, 64); mist.ctx.scale(1.5, 1);
    mist.ctx.translate(-96, -64); mist.ctx.fillStyle = m;
    mist.ctx.fillRect(0, 0, 192, 128); mist.ctx.restore();

    shade = surface(210, height / 2);
    const v = shade.ctx.createLinearGradient(0, 0, 0, height / 2);
    v.addColorStop(0, 'rgba(8,12,12,.28)');
    v.addColorStop(.23, 'rgba(8,12,12,0)');
    v.addColorStop(.83, 'rgba(8,12,12,0)');
    v.addColorStop(1, 'rgba(6,9,9,.25)');
    shade.ctx.fillStyle = v; shade.ctx.fillRect(0, 0, 210, height / 2);
  }

  function prepare() {
    if (assets.background && backgroundVersion !== assets.background) {
      backgroundVersion = assets.background;
      far = focusedImage(assets.background, 240, '#a6aea7', .46, .45);
    }
    if (assets['depth-arch'] && archVersion !== assets['depth-arch']) {
      archVersion = assets['depth-arch'];
      arch = focusedImage(archVersion, 440, '#77817d', .62, .20);
      const stone = arch.getContext('2d');
      stone.globalCompositeOperation = 'source-atop';
      const airfall = stone.createLinearGradient(0, arch.height * .26, 0, arch.height);
      airfall.addColorStop(0, 'rgba(179,189,180,0)');
      airfall.addColorStop(.62, 'rgba(179,189,180,.32)');
      airfall.addColorStop(1, 'rgba(186,195,185,.78)');
      stone.fillStyle = airfall; stone.fillRect(0, 0, arch.width, arch.height);
      stone.globalCompositeOperation = 'destination-in';
      const dissolve = stone.createLinearGradient(0, arch.height * .62, 0, arch.height);
      dissolve.addColorStop(0, '#fff'); dissolve.addColorStop(.65, 'rgba(255,255,255,.7)');
      dissolve.addColorStop(1, 'rgba(255,255,255,0)');
      stone.fillStyle = dissolve; stone.fillRect(0, 0, arch.width, arch.height);
      stone.globalCompositeOperation = 'source-over';
      near = focusedImage(archVersion, 180, '#030706', .98, 1.2);
    }
  }

  function drawBehind(ctx, game, clock, reducedMotion) {
    prepare();
    const camera = reducedMotion ? game.height - height : game.cameraY;
    ctx.drawImage(air.canvas, 0, 0, WIDTH, height);
    if (far) {
      const h = Math.max(height + 550, 1330);
      const w = 560;
      const y = -camera * .12 - 20;
      ctx.globalAlpha = .72;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(far, -158, y, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    // This light belongs to the hollow, not to the player. A second opening
    // enters from the other side higher in the climb.
    const openingY = 1240 - camera * .20;
    ctx.drawImage(light.canvas, 110, openingY - 300, 355, 640);
    ctx.globalAlpha = .55;
    ctx.drawImage(light.canvas, -230, 410 - camera * .20, 540, 860);
    ctx.globalAlpha = 1;
    if (arch) {
      for (const item of structures) {
        const h = item.width * arch.height / arch.width;
        const y = item.y - camera * .51;
        if (y > height + 20 || y + h < -20) continue;
        ctx.save();
        ctx.translate(item.x + (item.flip ? item.width : 0), y);
        if (item.flip) ctx.scale(-1, 1);
        ctx.drawImage(arch, 0, 0, item.width, h);
        ctx.restore();
        // Air sits in front of the foot of each pier, and behind the route.
        const drift = reducedMotion ? 0 : Math.sin(clock * .08 + item.y) * 10;
        ctx.drawImage(mist.canvas, item.x - 50 + drift, y + h * .36, item.width + 90, h * .63);
      }
    }
    ctx.globalAlpha = .32;
    ctx.drawImage(light.canvas, 160, openingY - 210, 265, 520);
    ctx.globalAlpha = 1;
    // Distant birds cross the lit aperture at a much smaller spatial scale.
    ctx.strokeStyle = 'rgba(62,73,67,.26)'; ctx.lineWidth = .7;
    for (let i = 0; i < 8; i++) {
      const x = mod(247 + i * 13 + (reducedMotion ? 0 : clock * 2.1), 590) - 80;
      const y = mod(710 + Math.sin(i * 19) * 37 - camera * .14, height + 160) - 40;
      const wing = reducedMotion ? 1.7 : Math.sin(clock * 2.7 + i * .83) * 1.8;
      ctx.beginPath(); ctx.moveTo(x - 2.5, y - wing);
      ctx.quadraticCurveTo(x - 1, y - .5, x, y + .3);
      ctx.quadraticCurveTo(x + 1, y - .5, x + 2.5, y - wing); ctx.stroke();
    }
  }

  function drawNear(ctx, game, reducedMotion) {
    const camera = reducedMotion ? game.height - height : game.cameraY;
    ctx.drawImage(shade.canvas, 0, 0, WIDTH, height);
    if (!near) return;
    // The near object occludes the outer wall only. Its cutout, not a straight
    // clipping boundary, supplies the soft contour; wall-kick faces stay clear.
    ctx.save(); ctx.beginPath();
    ctx.rect(0, 0, 49, height); ctx.rect(371, 0, 49, height); ctx.clip();
    for (const item of nearStones) {
      const y = item.y - camera * 1.11;
      const w = 142 * item.scale, h = 780 * item.scale;
      if (y > height || y + h < 0) continue;
      ctx.save();
      ctx.translate(item.side < 0 ? -84 : WIDTH + 84, y);
      if (item.side > 0) ctx.scale(-1, 1);
      ctx.rotate(.07);
      // Only the irregular pier is close to the lens; its overhead arch is
      // outside the shot. The diagonal crop interrupts the wall's flat band.
      ctx.drawImage(near, near.width * .045, near.height * .20, near.width * .29, near.height * .78, 0, 0, w, h);
      ctx.restore();
    }
    ctx.restore();
  }

  resize(height);
  return { resize, drawBehind, drawNear };
}
