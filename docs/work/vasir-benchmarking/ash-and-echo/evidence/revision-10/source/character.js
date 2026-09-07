/**
 * Ash is a small body of soot, not a sprite attached to a smoke emitter.
 * Its eyes hold identity while its body sheds, splits and gathers again.
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
  let kickX = 0;
  let kickY = 0;
  let kickDirection = 1;
  let wallAge = 10;
  let landAge = 10;
  let landStrength = 0;
  let landDirection = 1;
  let landingShed = false;
  let mantleSpent = false;
  let refillAge = 10;
  let refillShed = false;
  let listenAge = 10;
  let listenX = 0;
  let listenY = 0;
  let restLandmark = '';
  let restAge = 0;
  let reformAge = 10;
  let deathAge = 10;
  let deathX = 0;
  let deathY = 0;
  let deathVx = 0;
  let deathVy = 0;
  let burstCursor = 0;
  let wakeCursor = 0;
  let wakeDistance = 0;
  let shedTime = 0;
  let bodySurface = null;
  let bodyContext = null;
  let contactCursor = 0;
  const deathPose = { sx: 1, sy: 1, angle: 0, bend: 0, facing: 1 };
  const pose = { x: 0, y: 0, sx: 1, sy: 1, angle: 0, bend: 0, spread: 0, loft: 0, bloom: 0, morph: 0, sweep: 0, missing: 0, rest: 0, fall: 0, rim: 0, eye: 1, lookX: 0, lookY: 0, wall: 0, speed: 0, air: false, dead: false };
  const fibres = Array.from({ length: 6 }, (_, i) => ({
    side: i < 3 ? -1 : 1, level: i % 3,
    points: Array.from({ length: 5 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, lx: 0, ly: 0, rx: 0, ry: 0 })),
  }));
  const wake = Array.from({ length: 44 }, () => ({
    life: 0, total: 0, x: 0, y: 0, vx: 0, vy: 0, size: 0, angle: 0, spin: 0, seed: 0, gather: false, mantle: false,
  }));
  const grains = Array.from({ length: 72 }, (_, i) => ({
    x: hash(i * 3.17) * 30 - 15, y: hash(i * 4.79 + 2) * 35 - 19,
    size: .3 + hash(i * 9.31) * .9, phase: hash(i * 6.77) * TAU,
  }));
  const contacts = Array.from({ length: 6 }, () => ({ life: 0, total: 0, x: 0, y: 0, kind: '', power: 0, direction: 0 }));
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
    jumpAge = landAge = wallAge = reformAge = deathAge = 10;
    pose.wall = 0;
    landingShed = false;
    mantleSpent = refillShed = false; refillAge = listenAge = 10;
    restLandmark = ''; restAge = 0;
    jumpType = ''; wakeDistance = shedTime = 0; lastVx = 0;
    pose.morph = pose.sweep = pose.missing = pose.rest = pose.lookX = 0;
    for (const w of wake) w.life = 0;
    for (const b of bursts) b.life = 0;
    for (const contact of contacts) contact.life = 0;
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

  function shed(x, y, vx, vy, scale = 1, gather = true, mantle = false) {
    const w = wake[wakeCursor++ % wake.length];
    const seed = wakeCursor * 7.19;
    w.seed = seed; w.gather = gather; w.mantle = mantle;
    w.life = w.total = .27 + hash(seed) * .24;
    w.x = x; w.y = y; w.vx = vx; w.vy = vy;
    w.size = (.55 + hash(seed + 2) * 1.35) * scale;
    w.angle = hash(seed + 3) * TAU;
    w.spin = (hash(seed + 4) - .5) * 9;
  }

  function markContact(e, strength = e.intensity || 1) {
    const contact = contacts[contactCursor++ % contacts.length];
    contact.kind = e.type; contact.direction = Math.sign(e.vx) || 1;
    contact.x = e.x - (e.type === 'wallJump' ? contact.direction * 12 : 0);
    contact.y = e.y - (e.type === 'wallJump' ? 14 : 0);
    contact.power = clamp(strength, .15, 1.25);
    contact.life = contact.total = e.type === 'wallJump' ? .23 : .26;
  }

  function emit(events) {
    for (const e of events) {
      if (e.type === 'jump' || e.type === 'wallJump' || e.type === 'doubleJump') {
        jumpAge = 0; jumpType = e.type; landAge = 10;
        listenAge = 10; restLandmark = ''; restAge = 0;
        if (e.type !== 'doubleJump') markContact(e);
        // A new impulse interrupts the previous trajectory immediately.
        wakeDistance = 0;
        for (const w of wake) w.life *= .45;
        if (e.type === 'doubleJump') {
          for (let i = 0; i < (reduced ? 5 : 18); i++) {
            const side = i % 2 ? 1 : -1;
            const level = Math.floor(i / 2);
            shed(e.x + side * (6 + level * .8), e.y - 24 + level * 2,
              (e.vx || 0) * .32 + side * (68 + hash(i + 2) * 78),
              (e.vy || 0) * .26 + 42 + hash(i + 4) * 70, reduced ? .65 : 1.2, false);
          }
        } else if (e.type === 'wallJump') {
          kickDirection = Math.sign(e.vx) || 1;
          kickX = e.x - kickDirection * 12; kickY = e.y - 14;
          turn = Math.sign(e.vx) * -.5;
          flecks(e.x - Math.sign(e.vx) * 12, e.y - 12, reduced ? 2 : 6, .8, e.vx, e.vy);
        }
      } else if (e.type === 'land') {
        // The low masonry steps are small compressions. Save the long, broken
        // ash recoil for the suspended crossing's commitment and weight.
        const lightStep = e.landmark === 'first-hop' || e.landmark === 'second-hop';
        landAge = 0; landStrength = clamp((e.intensity || .5) * (lightStep ? .5 : 1), .15, 1.25); jumpAge = 10;
        landDirection = Math.sign(e.vx) || facing; landingShed = false;
        restLandmark = e.landmark || e.platformId || ''; restAge = 0;
        listenAge = e.resonance ? 0 : 10;
        if (e.resonance) { listenX = e.resonance.x; listenY = e.resonance.y; }
        markContact(e, landStrength);
      } else if (e.type === 'death') {
        listenAge = refillAge = 10; restLandmark = ''; restAge = 0;
        mantleSpent = refillShed = false;
        deathAge = 0; deathX = e.x; deathY = e.y - 14;
        deathVx = e.vx || 0; deathVy = e.vy || 0;
        deathPose.sx = pose.sx; deathPose.sy = pose.sy; deathPose.angle = pose.angle;
        deathPose.bend = pose.bend; deathPose.facing = facing;
        const contactX = Number.isFinite(e.contactX) ? e.contactX : e.x;
        const contactY = Number.isFinite(e.contactY) ? e.contactY : e.y;
        flecks(contactX, contactY, reduced ? 9 : 24, 1.2, deathVx, deathVy, true);
        for (const w of wake) w.life = 0;
      } else if (e.type === 'respawn') {
        reformAge = 0; initialized = false; deathAge = jumpAge = landAge = wallAge = 10;
        jumpType = ''; pose.wall = 0;
        mantleSpent = refillShed = false; refillAge = listenAge = 10;
        restLandmark = ''; restAge = pose.missing = pose.rest = pose.lookX = 0;
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

  function bendX(x, y, bend = pose.bend) {
    return x + bend * (1 - smooth((y + 17) / 30));
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
    refillAge += dt; listenAge += dt;
    turn *= Math.exp(-dt * 15);
    if (Math.abs(p.vx) > 45 && Math.abs(lastVx) > 45 && Math.sign(p.vx) !== Math.sign(lastVx)) turn = Math.sign(p.vx) * .7;
    lastVx = p.vx;
    facing = p.facing || facing;
    const speed = Math.hypot(p.vx, p.vy);
    const run = p.grounded && Math.abs(p.vx) > 20;
    const dead = p.motion === 'dead' || game.respawnTimer > 0;
    // Availability is authoritative. Wall contact/kicks retain the missing
    // mantle; a grounded refill still registers if takeoff shares its frame.
    if (p.airJumps < 1 && !dead) {
      if (!mantleSpent) for (const w of wake) if (w.mantle) w.life = 0;
      mantleSpent = true; refillAge = 10; refillShed = false;
    } else if (mantleSpent) {
      mantleSpent = false; refillAge = dead ? 10 : 0; refillShed = false;
    }
    pose.missing = mantleSpent ? 1 : 1 - smooth((refillAge - .08) / .28);
    const attentive = p.grounded && !dead && Math.abs(p.vx) < 6;
    if (!attentive) {
      // Released input can still carry landing velocity for ~86 ms. Let that
      // initial brake settle before cancelling the pending bell response;
      // movement after this short window, takeoff and death cancel at once.
      if (!p.grounded || dead || listenAge > .12) listenAge = 10;
      restAge = 0;
    }
    else restAge += dt;
    if (!p.grounded || dead) restLandmark = '';
    // The existing bell sound arrives 350 ms after contact. Eyes find it
    // first; the crown follows 120 ms later, without turning the contact body.
    const listenRelease = 1 - smooth((listenAge - 1.45) / .42);
    const listenEyes = smooth((listenAge - .35) / .09) * listenRelease;
    const listenBody = smooth((listenAge - .47) / .18) * listenRelease * (reduced ? .45 : 1);
    const bellDirection = clamp((listenX - cx) * facing / 30, -1, 1);
    pose.rest = restLandmark === 'opening-refuge' ? smooth((restAge - .32) / .6) * (reduced ? .45 : 1) : 0;
    const previousWall = pose.wall;
    const wall = !p.grounded && p.wallDir && (p.motion === 'wallSlide' || p.vy > 0) ? p.wallDir : 0;
    wallAge = wall && wall === previousWall ? wallAge + dt : 0;
    const motionScale = reduced ? .32 : 1;
    stride += dt * (9 + Math.abs(p.vx) * .025);
    const breath = reduced ? 0 : Math.sin(clock * 2.8) * .045;
    let sx = 1 + breath, sy = 1 - breath;
    let angle = reduced ? 0 : Math.sin(clock * 1.6) * .026;
    let spread = .25, eye = 1, lookY = 0, loft = .42, bloom = 0, morph = 0, sweep = 0;
    let bob = 0, falling = 0, contactBend = 0;
    if (run) {
      const step = Math.sin(stride * 2);
      sx = 1.06 + step * .14 * motionScale;
      sy = 1 / sx;
      bob = (1 - Math.cos(stride * 2)) * 1.7 * motionScale;
      contactBend = Math.sin(stride * 2 - .8) * 1.3 * motionScale;
      angle = p.vx / 258 * .21 * motionScale;
      eye = .85; spread = .12;
      loft = .23;
    } else if (!p.grounded) {
      const rise = clamp(-p.vy / 620, 0, 1);
      const fall = clamp(p.vy / 700, 0, 1);
      const apex = 1 - clamp(Math.abs(p.vy) / 220, 0, 1);
      falling = smooth(p.vy / 390);
      // Rising is taut; the apex lets the shoulders unfurl; falling carries
      // the crown and loose mantle upward above a heavy, reaching lower body.
      sx = .96 - rise * .20 - fall * .06 + apex * .29;
      sy = 1.07 + rise * .40 + fall * .27 - apex * .20;
      angle = clamp(p.vx / 820, -.34, .34) * mix(1, -.85, falling);
      spread = .18 + apex * 1.05 + falling * .48;
      loft = smooth(apex);
      eye = mix(p.vy < -230 ? .67 : 1.16, 1.34, falling);
      lookY = clamp(p.vy / 140, -2.8, 3.1);
    }
    if (jumpType === 'doubleJump' && jumpAge < .47) {
      // Split, hold a torn crescent, sweep into a comet, then re-knit. The eye
      // nucleus stays over the contact body while the mantle loses continuity.
      const tear = smooth((jumpAge - .018) / .065);
      const knit = smooth((jumpAge - .275) / .195);
      morph = tear * (1 - knit);
      sweep = smooth((jumpAge - .135) / .16);
      const release = smooth((jumpAge - .28) / .19);
      sx = mix(mix(1.24, .94, tear), sx, release);
      sy = mix(mix(.73, 1.03, tear), sy, release);
      angle = (facing * mix(-.16, .16, sweep) + clamp(p.vx / 850, -.32, .32) * sweep) * (1 - release);
      spread = mix(.08, .40, tear); loft = .22;
      bloom = morph;
      eye = mix(mix(.45, 1.22, tear), eye, release);
      lookY = mix(-1.3, lookY, release);
      falling = 0;
    } else if (jumpType === 'wallJump' && jumpAge < .33) {
      const push = smooth(jumpAge / .055);
      const release = smooth((jumpAge - .095) / .235);
      if (jumpAge < .16) facing = kickDirection;
      sx = mix(mix(1.04, .66, push), sx, release);
      sy = mix(mix(.85, 1.62, push), sy, release);
      angle = kickDirection * mix(mix(.34, .78, push), -.08, release);
      spread = mix(.78, .10, push); loft = .12;
      eye = mix(.49, .92, push); lookY = -2.6;
      falling = 0;
    } else if (jumpAge < .25) {
      // Anticipation is drawn on the moving body: it never delays takeoff.
      const release = smooth((jumpAge - .055) / .195);
      sy = mix(mix(.61, 1.82, smooth(jumpAge / .040)), sy, release);
      sx = mix(mix(1.37, .67, smooth(jumpAge / .040)), sx, release);
      eye = mix(.48, eye, smooth(jumpAge / .115));
      lookY = -2.9; loft = .08; spread = .04;
      falling = 0;
    }
    if (p.grounded && landAge < .43) {
      const strength = landStrength;
      let squash;
      if (landAge < .065) squash = (1 - smooth(landAge / .065) * .08) * strength;
      else if (landAge < .17) squash = mix(.92 * strength, -.31 * strength, smooth((landAge - .065) / .105));
      else squash = -.31 * strength * (1 - smooth((landAge - .17) / .26));
      sx = 1 + squash * .69 * motionScale;
      sy = Math.max(.48, 1 - squash * .51 * motionScale);
      spread = 1.0 + squash * .5;
      loft = .28 + smooth(landAge / .32) * .2;
      contactBend = landDirection * facing * squash * 4.2;
      eye = clamp(1 - squash * .68, .36, 1.2);
      angle = (clamp(p.vx / 1100, -.17, .17) + landDirection * squash * .12) * motionScale;
      lookY = squash * 2.2;
      // The outer crust arrives a beat after the heavy nucleus. Shed at the
      // rebound, in the direction of impact, without adding another emitter.
      if (!landingShed && landAge >= .055) {
        landingShed = true;
        for (let i = 0; i < (reduced ? 2 : 6); i++) {
          const side = i % 2 ? landDirection : -landDirection;
          shed(cx + side * (9 + i), foot - 2 - i,
            side * (42 + i * 7) * strength + p.vx * .16,
            -24 - i * 7, .8 + strength * .4, false);
        }
      }
    }
    if (wall) {
      facing = wall;
      const catchWeight = 1 - smooth(wallAge / .14);
      sx = .70 - catchWeight * .14; sy = 1.22 + catchWeight * .15;
      spread = .94; eye = .61; lookY = -2.2; falling = 0;
      loft = .23;
      angle = -wall * (.11 + catchWeight * .07);
    }
    if (reformAge < .34) {
      const grow = smooth((reformAge - .035) / .13);
      const settle = smooth((reformAge - .17) / .17);
      sx *= mix(mix(1.24, .86, grow), 1, settle);
      sy *= mix(mix(.24, 1.22, grow), 1, settle);
      eye *= smooth((reformAge - .045) / .095);
      loft = mix(.72, loft, settle);
    }
    if (attentive) {
      // One exhale as Ash settles: the crown drops, eyes soften closed, then
      // reopen halfway. This is a finite gesture, not a sleeping idle loop.
      const exhale = smooth((restAge - .42) / .20) * (1 - smooth((restAge - .76) / .34)) * pose.rest;
      sx *= 1 + pose.rest * .09 + exhale * .035;
      sy *= 1 - pose.rest * .10 - exhale * .045;
      loft = mix(loft, .98, pose.rest); spread = mix(spread, .10, pose.rest);
      eye = mix(eye, .64, pose.rest) * (1 - exhale * .72);
      lookY = mix(lookY, 1.6, pose.rest);
      lookY = mix(lookY, clamp((listenY - foot + 14) / 15, -2.5, 3.3), listenEyes * (reduced ? .65 : 1));
      eye = mix(eye, 1.12, listenEyes);
      sy *= 1 - listenBody * .025;
    }
    pose.lookX = attentive ? (bellDirection * 4.8 - 3.5) * listenEyes * (reduced ? .65 : 1) : 0;
    if (reduced && !p.grounded) {
      sx = mix(1, sx, .65); sy = mix(1, sy, .65); angle *= .3;
    }
    const follow = snap ? 1 : 1 - Math.exp(-dt * (jumpAge < .12 || landAge < .08 || wall ? 62 : 23));
    pose.sx = mix(pose.sx, sx, follow);
    pose.sy = mix(pose.sy, sy, follow);
    pose.angle = mix(pose.angle, angle + turn * .2 * motionScale, snap ? 1 : 1 - Math.exp(-dt * (jumpAge < .1 ? 55 : 27)));
    pose.spread = mix(pose.spread, spread, follow);
    pose.loft = mix(pose.loft, loft, snap ? 1 : 1 - Math.exp(-dt * 31));
    pose.bloom = mix(pose.bloom, bloom, follow);
    pose.morph = morph * (reduced ? .65 : 1); pose.sweep = sweep;
    pose.fall = mix(pose.fall, falling, follow);
    pose.eye = mix(pose.eye, eye, follow); pose.lookY = mix(pose.lookY, lookY, follow);
    pose.x = cx + (wall ? -wall * 2 : 0);
    pose.y = p.grounded ? foot - 14 * pose.sy - bob : foot - 14;
    pose.wall = wall; pose.speed = speed; pose.air = !p.grounded;
    pose.dead = dead;
    let onStone = wall ? 1 : 0;
    if (!onStone && pose.air && game.platforms) {
      for (const platform of game.platforms) {
        if (platform.kind === 'wall') continue;
        if (cx + 20 > platform.x && cx - 20 < platform.x + platform.w && pose.y + 20 > platform.y && pose.y - 30 < platform.y + platform.h + 65) { onStone = 1; break; }
      }
    }
    pose.rim = mix(pose.rim, onStone, snap ? 1 : 1 - Math.exp(-dt * 20));

    // The upper spine leads the torso on takeoff and carries its own recoil.
    // It bends the contour, face and fibre anchors together, with the hips
    // remaining at the contact body. It is not another whole-sprite rotation.
    let bendTarget = reduced ? 0 : wall ? 2.7 + Math.sin(wallAge * 9) * Math.exp(-wallAge * 5) * 1.8 : bloom > .15 ? -3.8 * (1 - bloom * .4) : p.vx * facing / 92 - falling * 2.6 + Math.sin(clock * 2.1) * .65 - turn * facing * 4 + contactBend;
    bendTarget = mix(bendTarget, -1.8, pose.rest);
    bendTarget = mix(bendTarget, bellDirection * 3.5, listenBody);
    if (snap) { pose.bend = bendTarget; bendVelocity = 0; }
    else {
      const bendSteps = Math.max(1, Math.ceil(dt * 120));
      for (let i = 0; i < bendSteps; i++) {
        const h = dt / bendSteps;
        bendVelocity += ((bendTarget - pose.bend) * 195 - bendVelocity * 17) * h;
        pose.bend = clamp(pose.bend + bendVelocity * h, -4.2, 4.2);
      }
    }

    if (!refillShed && refillAge >= .08 && refillAge < .36 && !dead) {
      refillShed = true;
      // Reuse the local wake pool. The heavy body has already caught; a few
      // flakes arrive at the empty shoulder as its crescent closes.
      for (let i = 0; i < (reduced ? 2 : 6); i++) {
        shed(localX(-20 - i * 1.7, -12 + i * 3), localY(-20 - i * 1.7, -12 + i * 3),
          p.vx * .3 + facing * 12, p.vy * .3 - 5, reduced ? .7 : 1.1, true, true);
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
      const loftAmount = pose.loft * (1 - pose.bloom);
      const transport = pose.bloom > .05 ? .98 : mix(.78, .88, pose.loft);
      if (!snap && !reduced) for (let j = 1; j < points.length; j++) {
        points[j].x += (cx - lastX) * transport;
        points[j].y += (foot - lastY) * transport;
      }
      let dx = side * facing * (2.3 + pose.spread * 2.2);
      let dy = (level - 1) * 1.8 + 2.2;
      if (!p.grounded && !wall) {
        dx = mix(dx, -p.vx / Math.max(speed, 1) * 8 + side * 1.6, speedRatio * .83);
        dy = mix(dy, -p.vy / Math.max(speed, 1) * 8, speedRatio * .88);
        dx = mix(dx, side * facing * 1.5, loftAmount);
        dy = mix(dy, (level - 1) * 1.1, loftAmount);
        if (pose.bloom > 0) {
          dx = mix(dx, side * facing * (level === 1 ? 4.7 : 3.6), pose.bloom);
          dy = mix(dy, (level - .5) * 1.7, pose.bloom);
        }
      }
      if (pose.fall > .05 && !wall) {
        dx = mix(dx, side * facing * (2.8 + level * .9) - p.vx / 190, pose.fall);
        dy = mix(dy, -5.8 - level * .8 + (side * facing > 0 ? 1.5 : 0), pose.fall);
      }
      if (wall) { dx = -wall * (5 + level); dy = (level - 1.3) * 3; }
      if (p.grounded) {
        dx -= p.vx / 110;
        dy = level === 2 ? -1.3 : level === 0 ? -.8 : 1;
        dx *= 1 - pose.rest * .26;
        dy += pose.rest * (level === 2 ? .3 : 1.2);
        if (level === 0) { dx += bellDirection * facing * listenBody * .8; dy += listenBody * .65; }
        if (landAge < .18) {
          const sweep = (1 - smooth(landAge / .18)) * landStrength;
          dx += side * facing * sweep * 4;
          dy = mix(dy, level === 0 ? 1.5 : -.5, sweep);
        }
      }
      for (let sub = 0; sub < steps; sub++) {
        points[0].x = ax; points[0].y = ay;
        for (let j = 1; j < points.length; j++) {
          const point = points[j], parent = points[j - 1];
          const wave = reduced ? 0 : Math.sin(clock * (4.2 + level * .7) - j * .95 + side * 2 + level) * (1 + j * .55) * (1 + pose.fall * .35) * (1 - pose.rest * .65);
          let tx = parent.x + dx * (1 - j * .11) + wave * .45;
          let ty = parent.y + dy * (1 - j * .08) + wave * .65;
          // Fallen ash rolls over the shoulders in unequal hooks. Curl only
          // the loose end; keep the root taut so the body still carries weight.
          if (pose.fall > .05 && !wall) {
            const curl = Math.max(0, j - 1.5) * pose.fall;
            tx -= side * facing * curl * (1.6 + level * .4);
            ty += curl * curl * (side * facing > 0 ? 1.15 : .72);
          }
          if (loftAmount > .15 && !wall) {
            // Slow soot curls back into itself instead of preserving spear tips.
            tx -= side * facing * loftAmount * Math.max(0, j - 2) * (1.4 + level * .38);
            ty -= loftAmount * Math.sin(j / 4 * Math.PI) * (level === 0 ? 1.7 : .5);
          }
          if (p.grounded) ty = Math.min(foot - .8, ty);
          if (snap || reduced) { point.x = tx; point.y = ty; point.vx = point.vy = 0; }
          else {
            const stiffness = (860 - j * 90) * (1 + pose.bloom * 1.8);
            const damping = 27 + pose.bloom * 15;
            point.vx += ((tx - point.x) * stiffness - point.vx * damping) * subDt;
            point.vy += ((ty - point.y) * stiffness - point.vy * damping) * subDt;
            point.x += point.vx * subDt; point.y += point.vy * subDt;
            // Flight speed must never leave a detached cape covering a ledge.
            const distance = Math.hypot(point.x - parent.x, point.y - parent.y);
            const maxLength = p.grounded ? 6.5 : mix(9, 5, loftAmount);
            if (distance > maxLength) {
              point.x = parent.x + (point.x - parent.x) * maxLength / distance;
              point.y = parent.y + (point.y - parent.y) * maxLength / distance;
            }
            if (p.grounded) point.y = Math.min(foot - .8, point.y);
          }
        }
      }
    }
    for (const w of wake) {
      w.life = Math.max(0, w.life - dt);
      if (!w.life) continue;
      const age = w.total - w.life;
      // Flakes carry their own velocity before the body's pull curls them in.
      // They do not remain fixed at old player positions like a smoke stamp.
      const dx = (w.mantle ? localX(-10, -3) : pose.x) - w.x;
      const dy = (w.mantle ? localY(-10, -3) : pose.y) - w.y;
      const pull = w.gather && (w.mantle || age > .13) && Math.hypot(dx, dy) < 100 ? 48 + age * 150 : 0;
      const curl = Math.sin(clock * 8 + w.seed) * 13;
      w.vx += (dx * pull + curl - w.vx * 4.5) * dt;
      w.vy += (dy * pull - 21 - w.vy * 4.5) * dt;
      w.x += w.vx * dt; w.y += w.vy * dt;
      w.angle += w.spin * dt;
    }
    for (const contact of contacts) contact.life = Math.max(0, contact.life - dt);
    if (!pose.dead && !snap) {
      shedTime += dt;
      const interval = reduced ? .18 : pose.air ? .032 : run ? .055 : .085;
      while (shedTime >= interval) {
        shedTime -= interval;
        const seed = wakeCursor * 3.71;
        const a = hash(seed) * TAU;
        const rx = Math.cos(a) * 13.3, ry = Math.sin(a) * 15.5 - 2;
        shed(localX(rx, ry), Math.min(foot - .8, localY(rx, ry)),
          p.vx * .22 + Math.cos(a) * (pose.air ? 27 : 11),
          p.vy * .22 + Math.sin(a) * 13 - 13, reduced ? .55 : .82, true);
      }
      if (!reduced && pose.air && !wall && speed > 340) {
        const oldDistance = wakeDistance;
        wakeDistance += displacement;
        let offset = 9 - oldDistance;
        while (offset <= displacement && displacement > 0) {
          const t = offset / displacement;
          const side = wakeCursor % 2 ? 1 : -1;
          shed(mix(lastX, cx, t) + side * 4, mix(lastY, foot, t) - 13,
            p.vx * .36 + side * 24, p.vy * .30 + 15, 1.0);
          offset += 9;
        }
        wakeDistance %= 9;
      } else wakeDistance = 0;
    }
    for (const b of bursts) {
      b.life = Math.max(0, b.life - dt);
      if (b.life <= 0) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.vx *= Math.exp(-dt * 3); b.vy += 150 * dt;
      b.angle += b.spin * dt;
    }
    lastX = cx; lastY = foot; initialized = true;
  }

  function bodyPath(c, bend = pose.bend, loft = pose.loft, bloom = pose.bloom, fall = pose.fall) {
    // Unequal shoulders, a hooked crown and three broken lower lobes keep the
    // creature organic at phone scale. This is deliberately not an ellipse.
    c.beginPath();
    c.moveTo(bendX(-8.5, -12, bend), -12);
    c.bezierCurveTo(bendX(-13, -14, bend), -14, bendX(-12, -18, bend), -18 + loft * 2.5, bendX(-10.5, -20, bend) - fall * 2, -20 + loft * 3.8 - fall * 2.6);
    c.bezierCurveTo(bendX(-6, -16, bend), -16, bendX(-3, -17.5, bend), -17.5, bendX(1, -16.7, bend), -16.7);
    c.bezierCurveTo(bendX(6, -17, bend), -17, bendX(10.5, -13.5, bend), -13.5, bendX(12, -9, bend), -9);
    c.bezierCurveTo(bendX(15.5 + bloom * 3, -3.5, bend), -3.5 - bloom * 2, bendX(14.2, 5.5, bend), 5.5, bendX(9.2 + fall * 1.6, 10, bend), 10 + fall * 1.7);
    c.bezierCurveTo(bendX(7.5, 12, bend), 12, bendX(4.2, 12.4, bend), 12.4, 2 - fall * 1.8, 14 + fall * 2.7);
    c.quadraticCurveTo(bendX(-1, 11.6, bend), 11.6, bendX(-3.5, 13.1, bend), 13.1);
    c.quadraticCurveTo(-7, 14.2, bendX(-8.2, 11, bend), 11);
    c.bezierCurveTo(bendX(-12.7, 10.5, bend), 10.5, bendX(-15.2 - bloom * 3, 6.5, bend), 6.5 - bloom * 3, bendX(-13.1, 2.3, bend), 2.3);
    c.bezierCurveTo(bendX(-16.2, -2, bend), -2, bendX(-13.7, -8, bend), -8, bendX(-8.5, -12, bend), -12);
    c.closePath();
  }

  function drawFibre(c, fibre) {
    const points = fibre.points;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let j = 0; j < points.length; j++) {
      const p = points[j], a = points[Math.max(0, j - 1)], b = points[Math.min(points.length - 1, j + 1)];
      const dx = b.x - a.x, dy = b.y - a.y;
      const length = Math.max(.01, Math.hypot(dx, dy));
      const loft = pose.loft * (1 - pose.bloom * .65);
      const flight = clamp(pose.speed / 700, 0, 1) * (1 - loft);
      // The core carries the volume. Its loose edge is a narrow strand that
      // forks as soot, rather than a broad fin with a hair drawn on top.
      const fibreWidth = mix(.55, .42, loft) * (1 + pose.bloom * .35);
      const width = (j === 4 ? .055 + loft * .19 : mix(3.9, 2.9, flight) * (1 - j / 4) ** mix(1.4, 1.04, loft)) * (fibre.level === 1 ? 1.08 : .86) * fibreWidth;
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
    c.quadraticCurveTo(points[4].lx, points[4].ly, points[4].x, points[4].y);
    c.quadraticCurveTo(points[4].rx, points[4].ry, (points[4].rx + points[3].rx) / 2, (points[4].ry + points[3].ry) / 2);
    for (let j = points.length - 2; j > 0; j--) {
      c.quadraticCurveTo(points[j].rx, points[j].ry, (points[j].rx + points[j - 1].rx) / 2, (points[j].ry + points[j - 1].ry) / 2);
    }
    c.lineTo(points[0].rx, points[0].ry); c.closePath();
    c.fillStyle = INK;
    c.fill();
    if (material) {
      c.save(); c.clip(); c.globalAlpha *= .48;
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
    c.fillStyle = INK;
    for (const w of wake) {
      if (w.life <= 0 || pose.dead || Math.hypot(w.x - pose.x, w.y - pose.y) > 84) continue;
      const t = w.life / w.total;
      const size = w.size * Math.min(1, t * 2.5);
      c.save(); c.translate(w.x, w.y); c.rotate(w.angle);
      c.globalAlpha = Math.min(.84, t * 2) * (reduced ? .6 : 1);
      c.beginPath(); c.moveTo(-size * 1.45, -.15);
      c.lineTo(-size * .25, -size * .65); c.lineTo(size, -.1);
      c.lineTo(size * .38, size * .6); c.lineTo(-size * .50, size * .32); c.closePath(); c.fill();
      if (size > 1 && pose.rim > .2) {
        c.strokeStyle = 'rgba(221,219,197,.60)'; c.lineWidth = .45;
        c.beginPath(); c.moveTo(-size * 1.2, -.2); c.lineTo(size * .05, -size * .5); c.stroke();
      }
      c.restore();
    }
  }

  function drawContacts(c) {
    for (const contact of contacts) {
      if (contact.life <= 0) continue;
      const t = 1 - contact.life / contact.total;
      const fade = (1 - t) * (1 - t) * (reduced ? .38 : 1);
      c.save(); c.translate(contact.x, contact.y);
      c.globalAlpha = fade;
      c.lineCap = 'round';
      if (contact.kind === 'wallJump') {
        c.scale(contact.direction, 1);
        // A small torn fan stays at the handprint as the hero pulls away.
        for (let i = 0; i < 3; i++) {
          const y = (i - 1) * 9;
          const reach = (9 + i * 3) * smooth(t * 2.4);
          c.strokeStyle = i === 1 ? IVORY : 'rgba(216,217,197,.74)';
          c.lineWidth = 1.5 * (1 - t) + .3;
          c.beginPath(); c.moveTo(.7, y - 3);
          c.quadraticCurveTo(reach * .35, y - 4, reach, y - 7 - i * 2); c.stroke();
        }
      } else {
        const land = contact.kind === 'land';
        const reach = (land ? 25 : 17) * contact.power * (.40 + smooth(t) * .9);
        c.fillStyle = INK;
        c.beginPath(); c.moveTo(-reach, -.6);
        c.quadraticCurveTo(-reach * .42, -2.4 * (1 - t), 0, land ? -2 : -4 * (1 - t));
        c.quadraticCurveTo(reach * .47, -1.4, reach, -.6);
        c.quadraticCurveTo(0, .7, -reach, -.6); c.fill();
        c.strokeStyle = 'rgba(243,241,218,.78)'; c.lineWidth = .8 * (1 - t) + .2;
        c.beginPath(); c.moveTo(-reach, -1); c.lineTo(-reach * .56, -1.7);
        c.moveTo(reach * .50, -1.6); c.lineTo(reach, -.8); c.stroke();
      }
      c.restore();
    }
  }

  function drawEyes(c, dead = false) {
    c.save(); c.translate(bendX(pose.lookX, -4.2 + pose.lookY), 0);
    const blinkPhase = clock % 4.7;
    const blink = !pose.air && blinkPhase > 4.32 && blinkPhase < 4.47 ? Math.abs((blinkPhase - 4.395) / .075) : 1;
    const openness = dead ? .1 : Math.max(.13, pose.eye * blink * (1 - pose.morph * .15));
    const y = -4.2 + pose.lookY;
    c.fillStyle = IVORY;
    // Unequal eye sizes keep the face directional, even at a steep body lean.
    c.beginPath();
    c.ellipse(2.5, y, 3.6, 4.8 * openness, .12, 0, TAU);
    c.ellipse(9, y - .6, 2.45, 3.8 * openness, .18, 0, TAU);
    c.fill();
    if (pose.eye < .85 && pose.rest < .05) {
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

  function drawKickHands(c) {
    if (jumpType !== 'wallJump' || jumpAge > .18) return;
    const release = smooth(jumpAge / .18);
    const side = kickDirection;
    c.strokeStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < 2; i++) {
      const rootX = localX(-7, i ? 7 : -7);
      const rootY = localY(-7, i ? 7 : -7);
      const destinationX = pose.x - side * (16 - release * 8);
      const handX = mix(kickX, destinationX, release);
      const handY = mix(kickY + (i ? 14 : -19), pose.y + (i ? 16 : 1), release);
      const dx = handX - rootX, dy = handY - rootY;
      const length = Math.max(1, Math.hypot(dx, dy));
      const endX = rootX + dx * Math.min(1, 25 / length);
      const endY = rootY + dy * Math.min(1, 25 / length);
      const elbowX = mix(rootX, endX, .5) - side * 4;
      const elbowY = mix(rootY, endY, .5) + (i ? 5 : -4);
      c.lineWidth = 3.3 * (1 - release * .4);
      c.beginPath(); c.moveTo(rootX, rootY); c.quadraticCurveTo(elbowX, elbowY, endX, endY); c.stroke();
      c.lineWidth = .85;
      c.strokeStyle = 'rgba(225,225,207,.72)';
      c.beginPath(); c.moveTo(elbowX, elbowY - .7); c.lineTo(endX, endY - .7); c.stroke();
      c.strokeStyle = INK; c.lineWidth = 1.15;
      c.beginPath(); c.moveTo(endX + side * 2, endY - 2); c.lineTo(endX - side, endY); c.lineTo(endX + side * 1.5, endY + 2); c.stroke();
    }
  }

  function drawDeath(c) {
    if (deathAge > .27) return;
    const split = smooth((deathAge - .035) / .19);
    const fade = 1 - smooth((deathAge - .055) / .205);
    c.save();
    c.translate(deathX, deathY);
    c.rotate(deathPose.angle);
    c.scale(deathPose.facing * deathPose.sx, deathPose.sy);
    // Preserve the impact pose, then shear it into four irregular pieces.
    // The brief closed eyes are the last intact part of the face.
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1, vertical = i < 2 ? -1 : 1;
      c.save();
      c.translate(side * split * (reduced ? 3 : 9) + deathVx * .012 * split,
        vertical * split * (reduced ? 3 : 11) + deathVy * .006 * split);
      c.rotate(side * vertical * split * .32);
      c.scale(1 - split * .38, 1 - split * .30);
      c.beginPath(); c.moveTo(-2, -2); c.lineTo(side * 26, -2 + side * 3);
      c.lineTo(side * 26, vertical * 29); c.lineTo(2, vertical * 29); c.closePath(); c.clip();
      c.globalAlpha = fade;
      bodyPath(c, deathPose.bend, .15, 0, 0); c.fillStyle = INK; c.fill();
      if (material) { c.save(); bodyPath(c, deathPose.bend, .15, 0, 0); c.clip(); c.drawImage(material, -16, -20, 31, 36); c.restore(); }
      c.strokeStyle = 'rgba(242,241,218,.82)'; c.lineWidth = .8;
      c.beginPath(); c.moveTo(-5, -17); c.lineTo(-2, -7); c.lineTo(2, -3); c.lineTo(-2, 3); c.lineTo(1, 12); c.stroke();
      if (deathAge < .065) drawEyes(c, true);
      c.restore();
    }
    c.restore();
  }

  function drawAshSheets(c) {
    const amount = pose.morph;
    if (amount < .005) return;
    const sweep = pose.sweep;
    // These are pieces of the mantle itself, with clear air between each sheet
    // and the nucleus. Their tips first open sideways, then fold behind ascent.
    for (let side = -1; side <= 1; side += 2) {
      // The rear mantle is the larger remnant. The forward edge has already
      // crumbled: unequal mass and broken continuity keep this from being wings.
      const rootX = 9 + amount * (3 - sweep * 5);
      const rootY = -8 + sweep * amount * 10 + (side > 0 ? amount * 2 : 0);
      const tipX = mix(12, mix(side < 0 ? 43 : 27, side < 0 ? 5 : 8, sweep), amount);
      const tipY = mix(-5, mix(side < 0 ? -20 : -7, side < 0 ? 34 : 27, sweep), amount);
      const midX = mix(12, mix(side < 0 ? 24 : 17, side < 0 ? 15 : 12, sweep), amount);
      const midY = mix(rootY, mix(side < 0 ? -21 : -10, side < 0 ? 13 : 17, sweep), amount);
      const width = (side < 0 ? 6.8 : 4.5) * amount * (1 - sweep * .22);
      c.save(); c.scale(side, 1);
      const drift = amount * (1 - smooth(sweep)) * (reduced ? 0 : 1);
      c.translate(Math.sin(clock * 9 + side * 2) * drift * 1.8, Math.cos(clock * 8 + side) * drift * 1.4);
      c.beginPath(); c.moveTo(rootX, rootY);
      c.bezierCurveTo(midX - 6, midY - width, tipX - 6, tipY - width, tipX + amount * 2, tipY - amount * 2);
      c.lineTo(tipX - amount * 3.5, tipY + amount * .4);
      c.lineTo(tipX - amount * 2.3, tipY + amount * 2.0);
      c.lineTo(tipX - amount * 8, tipY + amount * .9);
      c.quadraticCurveTo(midX + amount * 3, midY + width * .75, midX - amount * 2.5, midY + width);
      c.lineTo(midX - amount * 1, midY + width * 1.55);
      c.quadraticCurveTo(rootX + amount * 5, rootY + width * .3, rootX, rootY + width * .72);
      c.closePath(); c.fillStyle = INK; c.fill();
      if (material) {
        c.save(); c.clip(); c.globalAlpha *= .70;
        c.drawImage(material, 4, -28, 43, 76); c.restore();
      }
      c.strokeStyle = 'rgba(186,190,172,.42)'; c.lineWidth = .58;
      c.beginPath(); c.moveTo(rootX + 3 * amount, rootY - .6);
      c.quadraticCurveTo(midX, midY - width * .4, tipX - 5 * amount, tipY - width * .45); c.stroke();
      for (let j = 0; j < 5; j++) {
        const drift = reduced ? 0 : Math.sin(clock * 9 + j * 2 + side) * 1.5;
        const x = tipX + (2 + j * 2.1 + drift) * amount;
        const y = tipY + (j * 1.5 + drift) * amount;
        const size = (1.25 - j * .20) * amount;
        c.fillStyle = INK;
        c.beginPath(); c.moveTo(x - size, y); c.lineTo(x + size * .6, y - size * .4); c.lineTo(x + size, y + size * .65); c.lineTo(x, y + size); c.closePath(); c.fill();
      }
      c.restore();
    }
    // Actual gaps sever the open mantle into irregular scales. Their split
    // axes turn with the sweep; these cutouts never touch the eye nucleus.
    c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = INK;
    const opening = 1 - smooth(pose.sweep * 1.15);
    for (let i = 0; i < 5; i++) {
      const side = i < 3 ? -1 : 1;
      const index = i < 3 ? i : i - 3;
      const x = side * (17 + index * (side < 0 ? 10 : 8)) * amount;
      const gap = (1.45 + index * .37) * amount * opening;
      if (gap < .03) continue;
      const skew = side * (i % 2 ? .34 : -.21);
      c.beginPath(); c.moveTo(x - gap - skew * 25, -35); c.lineTo(x + gap - skew * 25, -35);
      c.lineTo(x + gap - skew * 12 + gap * .35, -21); c.lineTo(x + gap - gap * .55, -12);
      c.lineTo(x + gap + skew * 7 + gap * .25, -3); c.lineTo(x + gap + skew * 15, 12);
      c.lineTo(x - gap + skew * 15, 12); c.lineTo(x - gap + skew * 7 + gap * .15, -3);
      c.lineTo(x - gap - gap * .70, -12); c.lineTo(x - gap - skew * 12 + gap * .15, -21); c.closePath(); c.fill();
    }
    c.restore();
  }

  function drawLivingBody(c) {
    if (!bodySurface) {
      bodySurface = document.createElement('canvas');
      bodySurface.width = bodySurface.height = 224;
      bodyContext = bodySurface.getContext('2d');
    }
    const b = bodyContext;
    b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, 224, 224);
    b.setTransform(2, 0, 0, 2, 112, 112);
    drawAshSheets(b);
    if (pose.morph * pose.sweep > .01) {
      // The swept sheets crumble along their length before they gather. Their
      // missing material is real transparency, so the comet is made of ash.
      b.save(); b.globalCompositeOperation = 'destination-out'; b.fillStyle = INK;
      for (let i = 0; i < 26; i++) {
        const grain = grains[i];
        const x = grain.x * 1.25, y = grain.y + 19;
        const size = (1.3 + grain.size * 2.1) * pose.morph * pose.sweep;
        b.beginPath(); b.moveTo(x - size, y - size * .35);
        b.lineTo(x + size * .8, y - size * .9); b.lineTo(x + size * .3, y + size * .9);
        b.lineTo(x - size * .7, y + size * .45); b.closePath(); b.fill();
      }
      b.restore();
    }
    b.save();
    b.translate(2.8 * pose.morph, -5.8 * pose.morph);
    b.scale(1 - pose.morph * .34, 1 - pose.morph * .47);
    bodyPath(b); b.fillStyle = INK; b.fill();
    if (material) {
      b.save(); bodyPath(b); b.clip();
      b.drawImage(material, -16, -20, 31, 36); b.restore();
    }
    // The crust continually crumbles. Erasure is isolated to this small body
    // surface, so a missing grain reveals the actual world rather than pale ink.
    b.save(); b.globalCompositeOperation = 'destination-out'; b.fillStyle = INK;
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU;
      const phase = clock * (reduced ? 0 : 1.25) + i * 2.39;
      const nibble = .5 + (Math.sin(phase) + 1) * .62;
      const x = bendX(Math.cos(a) * (13.6 + Math.sin(i * 4.7) * 1.1), Math.sin(a) * 16 - 1.8);
      const y = Math.sin(a) * 16 - 1.8;
      b.beginPath(); b.moveTo(x - nibble, y - .2);
      b.lineTo(x + .1, y - nibble * 1.3); b.lineTo(x + nibble, y + .4); b.lineTo(x - .15, y + nibble * .8); b.closePath(); b.fill();
    }
    b.restore();
    b.strokeStyle = 'rgba(205,205,185,.49)'; b.lineWidth = .72;
    b.beginPath(); b.moveTo(bendX(-9.3, -15.4), -15.4);
    b.quadraticCurveTo(bendX(-4, -17.5), -17.5, bendX(.5, -15.8), -15.8);
    b.moveTo(bendX(3.9, -14.8), -14.8); b.quadraticCurveTo(bendX(10, -13), -13, bendX(11.4, -8.5), -8.5); b.stroke();
    if (pose.rim > .03) {
      b.globalAlpha = pose.rim; b.strokeStyle = 'rgba(225,225,205,.72)'; b.lineWidth = .9;
      b.beginPath(); b.moveTo(bendX(13.1, -6.7), -6.7); b.quadraticCurveTo(bendX(14.5, -3), -3, bendX(13.9, -.5), -.5);
      b.moveTo(bendX(13, 4), 4); b.quadraticCurveTo(bendX(11.8, 7.9), 7.9, bendX(8.4, 10.1), 10.1);
      b.moveTo(bendX(-13.2, 1), 1); b.quadraticCurveTo(bendX(-13.2, 6.5), 6.5, bendX(-9.2, 9.1), 9.1); b.stroke();
      b.globalAlpha = 1;
    }
    if (pose.missing > .001) {
      // An open crescent in the outer rear mantle, never the eye nucleus or
      // lower contact lobes. True transparency keeps it legible on any stone.
      const edge = mix(-17, -8.1, pose.missing);
      b.save(); b.globalCompositeOperation = 'destination-out'; b.fillStyle = INK;
      b.beginPath(); b.moveTo(bendX(-22, -12), -12);
      b.lineTo(bendX(-13.4, -11), -11);
      b.quadraticCurveTo(bendX(edge - 2.2, -9.2), -9.2, bendX(edge, -5.2), -5.2);
      b.lineTo(bendX(edge - 1.1, -2.8), -2.8);
      b.quadraticCurveTo(bendX(edge - .2, .4), .4, bendX(-13.2, 4.7), 4.7);
      b.lineTo(bendX(-22, 7), 7); b.closePath(); b.fill(); b.restore();
    }
    b.restore();
    b.save(); b.globalCompositeOperation = 'source-atop';
    // Slow advection, rather than per-frame randomness, makes the surface read
    // as suspended ash even when the player is standing absolutely still.
    for (let i = 0; i < grains.length; i++) {
      const grain = grains[i];
      const motion = reduced ? 0 : clock;
      const x = grain.x * (1 + pose.morph * 1.8) + Math.sin(motion * 1.9 + grain.phase) * 1.3;
      const y = ((grain.y + 19 - motion * (1.3 + i % 3 * .4)) % 35 + 35) % 35 - 19;
      const size = grain.size;
      b.fillStyle = i % 4 === 0 ? 'rgba(202,199,177,.40)' : i % 3 === 0 ? 'rgba(0,2,2,.65)' : 'rgba(116,125,111,.31)';
      b.fillRect(x, y, size * 1.3, size * .6);
    }
    b.restore();
    c.drawImage(bodySurface, -56, -56, 112, 112);
  }

  function draw(c, game) {
    if (!initialized) return;
    const p = game.player;
    c.save();
    drawContacts(c);
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
    if (!reduced && reformAge < .23) {
      const t = smooth(reformAge / .23);
      c.fillStyle = INK; c.strokeStyle = INK; c.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const a = i * TAU / 7 + .4;
        const radius = (33 + (i % 3) * 5) * (1 - t);
        const x = pose.x + Math.cos(a) * radius;
        const y = pose.y + Math.sin(a) * radius * .64;
        c.globalAlpha = Math.sin((.18 + t * .82) * Math.PI) * .70;
        c.lineWidth = 1.5 * (1 - t) + .2;
        c.beginPath(); c.moveTo(x - Math.sin(a) * 7 * (1 - t), y + Math.cos(a) * 4 * (1 - t));
        c.quadraticCurveTo(x, y, mix(x, pose.x, .42), mix(y, pose.y, .42)); c.stroke();
        c.beginPath(); c.ellipse(x, y, 2.5 * (1 - t) + .2, .9, a, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    }
    for (const fibre of fibres) {
      c.globalAlpha = (1 - pose.morph) * (fibre.side < 0 && fibre.level < 2 ? 1 - pose.missing : 1);
      if (c.globalAlpha > .001) drawFibre(c, fibre);
    }
    c.globalAlpha = 1;
    drawBrace(c, p);
    drawKickHands(c);
    c.save();
    c.translate(pose.x, pose.y); c.rotate(pose.angle); c.scale(facing * pose.sx, pose.sy);
    drawLivingBody(c);
    if (reformAge > .035) drawEyes(c);
    // The held breath and missing mantle agree with the gameplay charge.
    if (p.airJumps > 0 && pose.air) {
      c.strokeStyle = 'rgba(236,237,211,.74)'; c.lineWidth = 1.05;
      c.beginPath(); c.moveTo(-8, 2); c.quadraticCurveTo(-9.6, 5, -7.3, 8); c.stroke();
      c.fillStyle = IVORY; c.beginPath(); c.ellipse(-6.8, 9.2, .8, 1.15, -.3, 0, TAU); c.fill();
    }
    c.restore();
    c.restore();
  }

  return { update, emit, draw, reset };
}
