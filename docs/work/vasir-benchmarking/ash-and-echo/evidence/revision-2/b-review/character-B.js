/**
 * Ash is a small body of soot, not a sprite attached to a smoke emitter.
 * The body's volume, gaze and six torn mantle fibres have separate timing.
 * Everything here is presentation state; neither contacts nor input wait on it.
 */
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const hash = v => { const n = Math.sin(v * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const INK = '#030606';
const IVORY = '#fbf9e9';

export function createCharacter(assets = {}) {
  let clock = 0;
  let lastTime = -1;
  let reduced = false;
  let material = null;
  let materialImage = null;
  let initialized = false;
  let lastX = 0;
  let lastY = 0;
  let lastVx = 0;
  let facing = 1;
  let stride = 0;
  let turn = 0;
  let bendVelocity = 0;
  let jumpAge = 10;
  let jumpType = '';
  let landAge = 10;
  let landStrength = 0;
  let reformAge = 10;
  let deathAge = 10;
  let deathX = 0;
  let deathY = 0;
  let deathVx = 0;
  let deathVy = 0;
  let burstCursor = 0;
  let wakeCursor = 0;
  let wakeDistance = 0;
  const pose = { x: 0, y: 0, sx: 1, sy: 1, angle: 0, bend: 0, spread: 0, eye: 1, lookY: 0, wall: 0, speed: 0, air: false, dead: false };
  const fibres = Array.from({ length: 6 }, (_, i) => ({
    side: i < 3 ? -1 : 1, level: i % 3,
    points: Array.from({ length: 5 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, lx: 0, ly: 0, rx: 0, ry: 0 })),
  }));
  const wake = Array.from({ length: 11 }, () => ({ life: 0, x: 0, y: 0, width: 0 }));
  const bursts = Array.from({ length: 38 }, () => ({
    life: 0, total: 0, x: 0, y: 0, vx: 0, vy: 0, size: 0, angle: 0, spin: 0, ivory: false,
  }));

  function prepareMaterial() {
    const image = assets.hero;
    if (!image || image.complete === false || !(image.naturalWidth || image.width) || materialImage === image) return;
    materialImage = image;
    // A fixed, eyeless crop preserves the wet charcoal material. The animated
    // silhouette and eyes are drawn separately; no pixel readback is needed.
    material = document.createElement('canvas');
    material.width = 112; material.height = 128;
    const c = material.getContext('2d');
    c.fillStyle = INK; c.fillRect(0, 0, 112, 128);
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    c.drawImage(image, iw * .366, ih * .262, iw * .279, ih * .35, 0, 0, 112, 128);
    c.fillStyle = 'rgba(0,3,3,.12)'; c.fillRect(0, 0, 112, 128);
  }

  function reset() {
    initialized = false; lastTime = -1; clock = stride = turn = bendVelocity = 0;
    jumpAge = landAge = reformAge = deathAge = 10;
    jumpType = ''; wakeDistance = 0; lastVx = 0;
    for (const w of wake) w.life = 0;
    for (const b of bursts) b.life = 0;
  }

  function flecks(x, y, count, strength, vx = 0, vy = 0, dying = false) {
    for (let i = 0; i < count; i++) {
      const b = bursts[burstCursor++ % bursts.length];
      const seed = burstCursor * 3.17;
      const angle = dying ? hash(seed) * TAU : Math.PI + hash(seed) * Math.PI;
      const speed = (dying ? 50 : 24) + hash(seed + 3) * (dying ? 120 : 70) * strength;
      b.life = b.total = (dying ? .23 : .14) + hash(seed + 1) * .15;
      b.x = x; b.y = y;
      b.vx = Math.cos(angle) * speed + vx * .1;
      b.vy = Math.sin(angle) * speed + vy * .08;
      b.size = (dying ? 1.7 : .6) + hash(seed + 2) * (dying ? 3.4 : 1.9);
      b.angle = angle; b.spin = (hash(seed + 4) - .5) * 8;
      b.ivory = dying && i < 2;
    }
  }

  function emit(events) {
    for (const e of events) {
      if (e.type === 'jump' || e.type === 'wallJump' || e.type === 'doubleJump') {
        jumpAge = 0; jumpType = e.type; landAge = 10;
        if (e.type === 'doubleJump') {
          flecks(e.x, e.y - 10, reduced ? 3 : 9, 1, e.vx, e.vy);
        } else if (e.type === 'wallJump') {
          turn = Math.sign(e.vx) * -.5;
          flecks(e.x - Math.sign(e.vx) * 12, e.y - 12, reduced ? 2 : 6, .8, e.vx, e.vy);
        }
      } else if (e.type === 'land') {
        landAge = 0; landStrength = clamp(e.intensity || .5, .25, 1.25); jumpAge = 10;
      } else if (e.type === 'death') {
        deathAge = 0; deathX = e.x; deathY = e.y - 14;
        deathVx = e.vx || 0; deathVy = e.vy || 0;
        const contactX = Number.isFinite(e.contactX) ? e.contactX : e.x;
        const contactY = Number.isFinite(e.contactY) ? e.contactY : e.y;
        flecks(contactX, contactY, reduced ? 9 : 24, 1.2, deathVx, deathVy, true);
        for (const w of wake) w.life = 0;
      } else if (e.type === 'respawn') {
        reformAge = 0; initialized = false; deathAge = 10;
        for (const w of wake) w.life = 0;
      } else if (e.type === 'checkpoint' || e.type === 'win') {
        reformAge = 0;
      }
    }
  }

  function localX(x, y) {
    x = bendX(x, y);
    return pose.x + Math.cos(pose.angle) * x * pose.sx * facing - Math.sin(pose.angle) * y * pose.sy;
  }
  function localY(x, y) {
    x = bendX(x, y);
    return pose.y + Math.sin(pose.angle) * x * pose.sx * facing + Math.cos(pose.angle) * y * pose.sy;
  }

  function bendX(x, y) {
    return x + pose.bend * (1 - smooth((y + 17) / 30));
  }

  function update(game, deltaTime, reducedMotion = false) {
    prepareMaterial();
    if (lastTime >= 0 && game.time < lastTime - .001) reset();
    lastTime = game.time;
    reduced = Boolean(reducedMotion);
    const dt = clamp(Number.isFinite(deltaTime) ? deltaTime : 0, 0, .05);
    const p = game.player;
    const cx = p.x + p.w / 2;
    const foot = p.y + p.h;
    const displacement = Math.hypot(cx - lastX, foot - lastY);
    const snap = !initialized || displacement > 140;
    if (snap) { for (const w of wake) w.life = 0; wakeDistance = 0; }
    if (!dt && initialized && !snap) return;
    clock += dt; jumpAge += dt; landAge += dt; reformAge += dt; deathAge += dt;
    turn *= Math.exp(-dt * 15);
    if (Math.abs(p.vx) > 45 && Math.abs(lastVx) > 45 && Math.sign(p.vx) !== Math.sign(lastVx)) turn = Math.sign(p.vx) * .7;
    lastVx = p.vx;
    facing = p.facing || facing;
    const speed = Math.hypot(p.vx, p.vy);
    const run = p.grounded && Math.abs(p.vx) > 20;
    const wall = !p.grounded && p.wallDir && (p.motion === 'wallSlide' || p.vy > 0) ? p.wallDir : 0;
    const motionScale = reduced ? .32 : 1;
    stride += dt * (9 + Math.abs(p.vx) * .025);
    const breath = reduced ? 0 : Math.sin(clock * 2.8) * .045;
    let sx = 1 + breath, sy = 1 - breath;
    let angle = reduced ? 0 : Math.sin(clock * 1.6) * .026;
    let spread = .25, eye = 1, lookY = 0;
    let bob = 0;
    if (run) {
      const step = Math.sin(stride * 2);
      sx = 1.05 + step * .12 * motionScale;
      sy = 1 / sx;
      bob = (1 - Math.cos(stride * 2)) * 1.4 * motionScale;
      angle = p.vx / 258 * .21 * motionScale;
      eye = .85; spread = .12;
    } else if (!p.grounded) {
      const rise = clamp(-p.vy / 620, 0, 1);
      const fall = clamp(p.vy / 700, 0, 1);
      const apex = 1 - clamp(Math.abs(p.vy) / 220, 0, 1);
      sx = .92 - rise * .14 - fall * .13 + apex * .25;
      sy = 1.10 + rise * .31 + fall * .34 - apex * .17;
      angle = clamp(p.vx / 900, -.28, .28) * (p.vy > 0 ? -.65 : 1);
      spread = .25 + apex * .8;
      eye = p.vy > 180 ? 1.25 : p.vy < -230 ? .78 : 1.12;
      lookY = clamp(p.vy / 180, -2.3, 2.5);
    }
    if (jumpAge < .24) {
      // The first impulse moves immediately. This 22 ms compression belongs
      // to the moving body and never adds mechanical anticipation latency.
      const peak = jumpType === 'doubleJump' ? 1.83 : jumpType === 'wallJump' ? 1.72 : 1.65;
      let impulse;
      if (jumpAge < .028) impulse = mix(.64, peak, smooth(jumpAge / .028));
      else impulse = mix(peak, sy, smooth((jumpAge - .028) / .212));
      sy = impulse;
      sx = mix(sx, 1 / Math.sqrt(sy), .92);
      if (jumpType === 'doubleJump') {
        spread = 1.7 * (1 - smooth(jumpAge / .19));
        eye = .58 + smooth(jumpAge / .2) * .25;
      }
      if (jumpType === 'wallJump') angle += Math.sign(p.vx) * .22 * (1 - smooth(jumpAge / .24));
    }
    if (p.grounded && landAge < .36) {
      const strength = landStrength;
      let squash;
      if (landAge < .055) squash = (1 - smooth(landAge / .055) * .1) * strength;
      else if (landAge < .155) squash = mix(.9 * strength, -.26 * strength, smooth((landAge - .055) / .1));
      else squash = -.26 * strength * (1 - smooth((landAge - .155) / .205));
      sx = 1 + squash * .58 * motionScale;
      sy = 1 - squash * .48 * motionScale;
      spread = 1.0 + squash * .5;
      eye = clamp(1 - squash * .77, .17, 1.2);
      angle = clamp(p.vx / 1100, -.17, .17) * motionScale;
    }
    if (wall) {
      facing = wall;
      sx = .68; sy = 1.2; spread = .72; eye = .67; lookY = -1.8;
      angle = -wall * .1;
    }
    if (reformAge < .28) {
      const grow = smooth(reformAge / .11);
      sx *= mix(.52, 1, grow);
      sy *= mix(.46, 1, grow) + (reduced ? 0 : Math.sin(clamp((reformAge - .08) / .2, 0, 1) * Math.PI) * .18);
    }
    if (reduced && !p.grounded) {
      sx = mix(1, sx, .65); sy = mix(1, sy, .65); angle *= .3;
    }
    const follow = snap ? 1 : 1 - Math.exp(-dt * (jumpAge < .12 || landAge < .08 || wall ? 62 : 23));
    pose.sx = mix(pose.sx, sx, follow);
    pose.sy = mix(pose.sy, sy, follow);
    pose.angle = mix(pose.angle, angle + turn * .2 * motionScale, snap ? 1 : 1 - Math.exp(-dt * 24));
    pose.spread = mix(pose.spread, spread, follow);
    pose.eye = mix(pose.eye, eye, follow); pose.lookY = mix(pose.lookY, lookY, follow);
    pose.x = cx + (wall ? -wall * 2 : 0);
    pose.y = p.grounded ? foot - 14 * pose.sy - bob : foot - 14;
    pose.wall = wall; pose.speed = speed; pose.air = !p.grounded;
    pose.dead = p.motion === 'dead' || game.respawnTimer > 0;

    // The upper spine leads the torso on takeoff and carries its own recoil.
    // It bends the contour, face and fibre anchors together, with the hips
    // remaining at the contact body. It is not another whole-sprite rotation.
    const bendTarget = reduced ? 0 : wall ? 2.2 : p.vx * facing / 92 + Math.sin(clock * 2.1) * .65 - turn * facing * 4;
    if (snap) { pose.bend = bendTarget; bendVelocity = 0; }
    else {
      const bendSteps = Math.max(1, Math.ceil(dt * 120));
      for (let i = 0; i < bendSteps; i++) {
        const h = dt / bendSteps;
        bendVelocity += ((bendTarget - pose.bend) * 195 - bendVelocity * 17) * h;
        pose.bend = clamp(pose.bend + bendVelocity * h, -4.2, 4.2);
      }
    }

    // Six short five-point chains. Their anchors are carried by the body;
    // their ends lag direction changes and overshoot apex/landing poses.
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const subDt = dt / steps;
    for (const fibre of fibres) {
      const { side, level, points } = fibre;
      const rootX = side * (level === 0 ? 8.5 : level === 1 ? 12 : 8.5);
      const rootY = level === 0 ? -11 : level === 1 ? -1 : 8;
      const ax = localX(rootX, rootY), ay = localY(rootX, rootY);
      const speedRatio = clamp(speed / 650, 0, 1);
      let dx = side * facing * (2.3 + pose.spread * 2.2);
      let dy = (level - 1) * 1.8 + 2.2;
      if (!p.grounded && !wall) {
        dx = mix(dx, -p.vx / Math.max(speed, 1) * 8 + side * 1.6, speedRatio * .83);
        dy = mix(dy, -p.vy / Math.max(speed, 1) * 8, speedRatio * .88);
      }
      if (wall) { dx = -wall * (5 + level); dy = (level - .7) * 3; }
      if (p.grounded) { dx -= p.vx / 110; dy = level === 2 ? -1.3 : level === 0 ? -.8 : 1; }
      for (let sub = 0; sub < steps; sub++) {
        points[0].x = ax; points[0].y = ay;
        for (let j = 1; j < points.length; j++) {
          const point = points[j], parent = points[j - 1];
          const wave = reduced ? 0 : Math.sin(clock * (4.2 + level * .7) - j * .95 + side * 2 + level) * (1 + j * .55);
          let tx = parent.x + dx * (1 - j * .11) + wave * .45;
          let ty = parent.y + dy * (1 - j * .08) + wave * .65;
          if (p.grounded) ty = Math.min(foot - .8, ty);
          if (snap || reduced) { point.x = tx; point.y = ty; point.vx = point.vy = 0; }
          else {
            point.vx += ((tx - point.x) * (860 - j * 90) - point.vx * 27) * subDt;
            point.vy += ((ty - point.y) * (860 - j * 90) - point.vy * 27) * subDt;
            point.x += point.vx * subDt; point.y += point.vy * subDt;
            // Flight speed must never leave a detached cape covering a ledge.
            const distance = Math.hypot(point.x - parent.x, point.y - parent.y);
            if (distance > 10) {
              point.x = parent.x + (point.x - parent.x) * 10 / distance;
              point.y = parent.y + (point.y - parent.y) * 10 / distance;
            }
            if (p.grounded) point.y = Math.min(foot - .8, point.y);
          }
        }
      }
    }
    for (const w of wake) w.life = Math.max(0, w.life - dt);
    if (!reduced && !pose.dead && pose.air && !wall && speed > 320 && !snap) {
      wakeDistance += displacement;
      if (wakeDistance > 7) {
        wakeDistance %= 7;
        const w = wake[wakeCursor++ % wake.length];
        w.life = .105; w.x = pose.x; w.y = pose.y; w.width = 8.5;
      }
    } else if (reduced || wall || p.grounded) for (const w of wake) w.life = 0;
    for (const b of bursts) {
      b.life = Math.max(0, b.life - dt);
      if (b.life <= 0) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.vx *= Math.exp(-dt * 3); b.vy += 150 * dt;
      b.angle += b.spin * dt;
    }
    lastX = cx; lastY = foot; initialized = true;
  }

  function bodyPath(c) {
    // Unequal shoulders, a hooked crown and three broken lower lobes keep the
    // creature organic at phone scale. This is deliberately not an ellipse.
    c.beginPath();
    c.moveTo(bendX(-8.5, -12), -12);
    c.bezierCurveTo(bendX(-13, -14), -14, bendX(-12, -18), -18, bendX(-10.5, -20), -20);
    c.bezierCurveTo(bendX(-6, -16), -16, bendX(-3, -17.5), -17.5, bendX(1, -16.7), -16.7);
    c.bezierCurveTo(bendX(6, -17), -17, bendX(10.5, -13.5), -13.5, bendX(12, -9), -9);
    c.bezierCurveTo(bendX(15.5, -3.5), -3.5, bendX(14.2, 5.5), 5.5, bendX(9.2, 10), 10);
    c.bezierCurveTo(bendX(7.5, 12), 12, bendX(4.2, 12.4), 12.4, 2, 14);
    c.quadraticCurveTo(bendX(-1, 11.6), 11.6, bendX(-3.5, 13.1), 13.1);
    c.quadraticCurveTo(-7, 14.2, bendX(-8.2, 11), 11);
    c.bezierCurveTo(bendX(-12.7, 10.5), 10.5, bendX(-15.2, 6.5), 6.5, bendX(-13.1, 2.3), 2.3);
    c.bezierCurveTo(bendX(-16.2, -2), -2, bendX(-13.7, -8), -8, bendX(-8.5, -12), -12);
    c.closePath();
  }

  function drawFibre(c, fibre) {
    const points = fibre.points;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let j = 0; j < points.length; j++) {
      const p = points[j], a = points[Math.max(0, j - 1)], b = points[Math.min(points.length - 1, j + 1)];
      const dx = b.x - a.x, dy = b.y - a.y;
      const length = Math.max(.01, Math.hypot(dx, dy));
      const width = (j === 4 ? .05 : 3.9 * (1 - j / 4) ** 1.4) * (fibre.level === 1 ? 1.08 : .86);
      p.lx = p.x - dy / length * width; p.ly = p.y + dx / length * width;
      p.rx = p.x + dy / length * width; p.ry = p.y - dx / length * width;
      minX = Math.min(minX, p.lx, p.rx); maxX = Math.max(maxX, p.lx, p.rx);
      minY = Math.min(minY, p.ly, p.ry); maxY = Math.max(maxY, p.ly, p.ry);
    }
    // One continuous taper, with shared tangent normals. Separate segment
    // quads produce teeth at bends and make soot look like articulated metal.
    c.beginPath(); c.moveTo(points[0].lx, points[0].ly);
    for (let j = 1; j < points.length - 1; j++) {
      c.quadraticCurveTo(points[j].lx, points[j].ly, (points[j].lx + points[j + 1].lx) / 2, (points[j].ly + points[j + 1].ly) / 2);
    }
    c.lineTo(points[4].x, points[4].y);
    for (let j = points.length - 2; j > 0; j--) {
      c.quadraticCurveTo(points[j].rx, points[j].ry, (points[j].rx + points[j - 1].rx) / 2, (points[j].ry + points[j - 1].ry) / 2);
    }
    c.lineTo(points[0].rx, points[0].ry); c.closePath();
    c.fillStyle = INK;
    c.fill();
    if (material) {
      c.save(); c.clip(); c.globalAlpha = .48;
      c.drawImage(material, minX, minY, Math.max(.1, maxX - minX), Math.max(.1, maxY - minY));
      c.restore();
    }
    c.strokeStyle = fibre.level === 0 ? 'rgba(170,174,159,.25)' : 'rgba(126,136,122,.15)';
    c.lineWidth = .55;
    c.beginPath(); c.moveTo(points[0].x, points[0].y);
    for (let j = 1; j < points.length - 1; j++) {
      c.quadraticCurveTo(points[j].x, points[j].y, (points[j].x + points[j + 1].x) / 2, (points[j].y + points[j + 1].y) / 2);
    }
    c.stroke();
  }

  function drawWake(c) {
    if (reduced || !pose.air || pose.wall || pose.dead) return;
    // The actual trajectory supplies a short connected ink gesture. It cannot
    // anticipate a path or extend more than 58 world pixels behind the body.
    let bx = pose.x, by = pose.y, bw = 9;
    c.fillStyle = INK;
    for (let i = 0; i < wake.length; i++) {
      const w = wake[(wakeCursor - 1 - i + wake.length * 2) % wake.length];
      if (w.life <= 0 || Math.hypot(w.x - pose.x, w.y - pose.y) > 58) continue;
      const dx = w.x - bx, dy = w.y - by;
      const length = Math.hypot(dx, dy);
      if (length < .5) continue;
      const nx = -dy / length, ny = dx / length;
      const width = w.width * (w.life / .105) ** 1.5;
      c.globalAlpha = .48 * (w.life / .105);
      c.beginPath();
      c.moveTo(bx + nx * bw, by + ny * bw);
      c.lineTo(w.x + nx * width, w.y + ny * width);
      c.lineTo(w.x - nx * width, w.y - ny * width);
      c.lineTo(bx - nx * bw, by - ny * bw); c.closePath(); c.fill();
      bx = w.x; by = w.y; bw = width;
    }
    c.globalAlpha = 1;
  }

  function drawEyes(c, dead = false) {
    c.save(); c.translate(bendX(0, -4.2 + pose.lookY), 0);
    const blinkPhase = clock % 4.7;
    const blink = !pose.air && blinkPhase > 4.32 && blinkPhase < 4.47 ? Math.abs((blinkPhase - 4.395) / .075) : 1;
    const openness = dead ? .1 : Math.max(.13, pose.eye * blink);
    const y = -4.2 + pose.lookY;
    c.fillStyle = IVORY;
    // Unequal eye sizes keep the face directional, even at a steep body lean.
    c.beginPath();
    c.ellipse(2.5, y, 3.6, 4.8 * openness, .12, 0, TAU);
    c.ellipse(9, y - .6, 2.45, 3.8 * openness, .18, 0, TAU);
    c.fill();
    if (pose.eye < .85) {
      c.fillStyle = INK;
      c.beginPath(); c.moveTo(-1.5, y - 5); c.lineTo(6.1, y - 5); c.lineTo(6.1, y - 1.6); c.lineTo(-1.5, y - 3); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(6.2, y - 5); c.lineTo(12, y - 5); c.lineTo(12, y - 3); c.lineTo(6.2, y - 1.7); c.closePath(); c.fill();
    }
    c.restore();
  }

  function drawBrace(c, p) {
    const side = pose.wall;
    if (!side) return;
    const wallX = side < 0 ? p.x : p.x + p.w;
    c.fillStyle = INK;
    c.strokeStyle = INK;
    c.lineCap = 'round'; c.lineJoin = 'round';
    // Upper hand reaches high, lower hand carries weight. Both actual contact
    // tips remain on the collision plane, regardless of the mantle's sway.
    for (let i = 0; i < 2; i++) {
      const rootY = pose.y + (i ? 7 : -8);
      const endY = pose.y + (i ? 14 : -19);
      const elbowX = pose.x + side * (i ? 3 : 6);
      const elbowY = pose.y + (i ? 15 : -18);
      c.lineWidth = i ? 3.8 : 4.5;
      c.beginPath(); c.moveTo(pose.x, rootY); c.quadraticCurveTo(elbowX, elbowY, wallX - side * .3, endY); c.stroke();
      c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(wallX - side * 2.5, endY); c.lineTo(wallX - side * .2, endY - 3.5); c.lineTo(wallX - side * .2, endY + 3.5); c.stroke();
      c.strokeStyle = 'rgba(232,231,211,.78)'; c.lineWidth = .75;
      c.beginPath(); c.moveTo(elbowX, elbowY - 1); c.lineTo(wallX - side * .65, endY - 1); c.stroke();
      c.strokeStyle = INK;
    }
  }

  function drawDeath(c) {
    if (deathAge > .27) return;
    const t = clamp(deathAge / .26, 0, 1);
    const collapse = smooth(t);
    c.save();
    c.translate(deathX + deathVx * .015 * (1 - collapse), deathY + deathVy * .006 * (1 - collapse));
    c.globalAlpha = 1 - collapse;
    c.scale(facing * (1 + Math.sin(t * Math.PI) * .4), Math.max(.12, 1 - collapse));
    bodyPath(c); c.fillStyle = INK; c.fill();
    c.strokeStyle = 'rgba(242,241,218,.85)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-8, -9); c.lineTo(-2, -2); c.lineTo(-6, 1); c.lineTo(5, 8); c.stroke();
    drawEyes(c, true);
    c.restore();
  }

  function draw(c, game) {
    if (!initialized) return;
    const p = game.player;
    c.save();
    drawWake(c);
    for (const b of bursts) {
      if (b.life <= 0) continue;
      const t = b.life / b.total;
      c.globalAlpha = Math.min(1, t * 2);
      c.fillStyle = b.ivory ? IVORY : INK;
      c.save(); c.translate(b.x, b.y); c.rotate(b.angle);
      const size = b.size * (.4 + t * .6);
      c.beginPath(); c.moveTo(-size * 1.3, 0); c.quadraticCurveTo(-size * .25, -size, size, -.1); c.lineTo(size * .1, size * .45); c.closePath(); c.fill();
      c.restore();
    }
    c.globalAlpha = 1;
    if (pose.dead) { drawDeath(c); c.restore(); return; }
    if (p.grounded) {
      c.fillStyle = 'rgba(0,3,2,.26)';
      c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + p.h + .5, 13 * pose.sx, 1.5, 0, 0, TAU); c.fill();
    }
    if (!reduced && reformAge < .2) {
      const t = smooth(reformAge / .2);
      c.fillStyle = INK; c.globalAlpha = 1 - t;
      for (let i = 0; i < 7; i++) {
        const a = i * TAU / 7 + .4;
        const radius = 24 * (1 - t);
        c.beginPath(); c.ellipse(pose.x + Math.cos(a) * radius, pose.y + Math.sin(a) * radius * .7, 2.4, .8, a, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    }
    for (const fibre of fibres) drawFibre(c, fibre);
    drawBrace(c, p);
    c.save();
    c.translate(pose.x, pose.y); c.rotate(pose.angle); c.scale(facing * pose.sx, pose.sy);
    bodyPath(c); c.fillStyle = INK; c.fill();
    if (material) {
      c.save(); bodyPath(c); c.clip();
      c.drawImage(material, -16, -20, 31, 36);
      c.restore();
    }
    // Broken grazing light and two charcoal folds tie the deforming body to
    // the painted stone; no bright all-round sticker outline.
    c.strokeStyle = 'rgba(188,189,170,.43)'; c.lineWidth = .65;
    c.beginPath(); c.moveTo(bendX(-9.3, -15.4), -15.4); c.quadraticCurveTo(bendX(-4, -17.5), -17.5, bendX(.5, -15.8), -15.8); c.moveTo(bendX(2.9, -15.1), -15.1); c.quadraticCurveTo(bendX(10, -13), -13, bendX(11.4, -8.5), -8.5); c.stroke();
    c.strokeStyle = 'rgba(140,148,135,.3)'; c.lineWidth = .5;
    c.beginPath(); c.moveTo(-10, -8); c.bezierCurveTo(-4, -10, -3, -3, -9, 6); c.moveTo(-7, 9); c.quadraticCurveTo(-1, 5, -3, 1); c.stroke();
    drawEyes(c);
    // The charge is carried inside the body like a held breath, and becomes
    // a brief torn crescent when spent. Its absence is readable after use.
    if (p.airJumps > 0 && pose.air) {
      c.strokeStyle = 'rgba(236,237,211,.74)'; c.lineWidth = 1.05;
      c.beginPath(); c.moveTo(-8, 2); c.quadraticCurveTo(-9.6, 5, -7.3, 8); c.stroke();
      c.fillStyle = IVORY; c.beginPath(); c.ellipse(-6.8, 9.2, .8, 1.15, -.3, 0, TAU); c.fill();
    }
    if (jumpType === 'doubleJump' && jumpAge < .21) {
      const t = jumpAge / .21;
      c.globalAlpha = (1 - t) * .95; c.strokeStyle = IVORY; c.lineWidth = 1.8 * (1 - t) + .35;
      c.beginPath(); c.moveTo(-10, -4); c.bezierCurveTo(-16 - t * 3, 2, -10, 11 + t * 3, -3, 11); c.moveTo(1, 12); c.lineTo(3, 10); c.stroke();
      c.globalAlpha = 1;
    }
    c.restore();
    c.restore();
  }

  return { update, emit, draw, reset };
}
