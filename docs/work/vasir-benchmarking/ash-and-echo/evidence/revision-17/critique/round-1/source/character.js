/**
 * Ash is a small body of soot, not a sprite attached to a smoke emitter.
 * Its eyes hold identity while its body sheds, splits and gathers again.
 * Everything here is presentation state; neither contacts nor input wait on it.
 */
import { createAshFlow } from './ash-flow.js';
import { CATHEDRAL_LIGHTS, lightFrom } from './lighting.js';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const hash = v => { const n = Math.sin(v * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const INK = '#030606';
const IVORY = '#fbf9e9';
const ASH_LIGHT_COLORS = Array.from({ length: 24 }, (_, i) => {
  const t = i / 23;
  return `rgb(${Math.round(3 + 136 * t)},${Math.round(6 + 139 * t)},${Math.round(6 + 123 * t)})`;
});
const WING_FRAY = [44, -6, 40, -8, 46, 4, 38, 6, 37, 11, 30, 10, 29, 15, 24, 13, 21, 16, 16, 11, 11, 7];

export function createCharacter(assets = {}) {
  const flow = createAshFlow(assets);
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
  let landDuration = .1;
  let landCompression = 0;
  let landHeavy = 0;
  let landDrift = 0;
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
  let shedTime = 0;
  let bodySurface = null;
  let bodyContext = null;
  let impulseSeed = 0;
  let openingIndex = 0;
  const light = { core: 0, left: 0, right: 0, x: .7, y: -.7 };
  let wingShed = false;
  let wingAfterShed = false;
  const deathPose = { sx: 1, sy: 1, angle: 0, bend: 0, facing: 1 };
  const pose = { x: 0, y: 0, sx: 1, sy: 1, angle: 0, bend: 0, spread: 0, loft: 0, bloom: 0, morph: 0, comet: 0, tailX: 0, tailY: 1, missing: 0, rest: 0, fall: 0, rim: 0, eye: 1, lookX: 0, lookY: 0, wall: 0, speed: 0, air: false, dead: false };
  const fibres = Array.from({ length: 6 }, (_, i) => ({
    side: i < 3 ? -1 : 1, level: i % 3,
    points: Array.from({ length: i === 0 ? 7 : i === 1 ? 8 : 5 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, lx: 0, ly: 0, rx: 0, ry: 0 })),
  }));
  const wake = Array.from({ length: 144 }, () => ({
    life: 0, total: 0, x: 0, y: 0, vx: 0, vy: 0, size: 0, angle: 0, spin: 0, seed: 0, gather: false, mantle: false, kind: 0, drag: 3, opening: 0, exposure: 0, opacity: 1, stretch: 1,
  }));
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
    mantleSpent = refillShed = false; refillAge = listenAge = 10;
    restLandmark = ''; restAge = 0;
    jumpType = ''; shedTime = 0; lastVx = 0;
    openingIndex = 0; light.core = light.left = light.right = 0; light.x = .7; light.y = -.7;
    impulseSeed = 0; wingShed = wingAfterShed = false;
    pose.morph = pose.comet = pose.missing = pose.rest = pose.lookX = 0;
    pose.tailX = 0; pose.tailY = 1;
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

  function shed(x, y, vx, vy, scale = 1, gather = true, mantle = false) {
    const w = wake[wakeCursor++ % wake.length];
    const seed = wakeCursor * 7.19;
    w.opening = openingIndex; w.exposure = 0;
    w.opacity = .50 + hash(seed + 11) * .50; w.stretch = .75 + hash(seed + 12) * 1.1;
    w.seed = seed; w.gather = gather; w.mantle = mantle; w.kind = 0; w.drag = 3;
    w.life = w.total = .27 + hash(seed) * .24;
    w.x = x; w.y = y; w.vx = vx; w.vy = vy;
    w.size = (.55 + hash(seed + 2) * 1.35) * scale;
    w.angle = hash(seed + 3) * TAU;
    w.spin = (hash(seed + 4) - .5) * 9;
    return w;
  }

  function emit(events) {
    for (const e of events) {
      if (e.type === 'jump' || e.type === 'wallJump' || e.type === 'doubleJump') {
        jumpAge = 0; jumpType = e.type; landAge = 10;
        impulseSeed += 1; wingShed = wingAfterShed = false;
        listenAge = 10; restLandmark = ''; restAge = 0;
        // Detached ash keeps its own trajectory through every new impulse.
        if (e.type === 'wallJump') {
          kickDirection = Math.sign(e.vx) || 1;
          kickX = e.x - kickDirection * 12; kickY = e.y - 14;
          turn = Math.sign(e.vx) * -.5;
        }
      } else if (e.type === 'land') {
        // Height owns weight on every surface. Legacy diagnostic events can
        // still exercise the pose without platform-specific attenuation.
        landStrength = Number.isFinite(e.landingSeverity) ? clamp(e.landingSeverity, 0, 1)
          : clamp(((Number.isFinite(e.intensity) ? e.intensity : .5) - .2) / 1.05, 0, 1);
        landHeavy = smooth((landStrength - .48) / .52);
        landDuration = .10 + .20 * landStrength + .26 * landHeavy;
        landAge = 0; jumpAge = 10;
        landDrift = clamp((e.vx || 0) / 258, -1, 1);
        if (Number.isFinite(e.vx)) lastVx = e.vx;
        restLandmark = e.landmark || e.platformId || ''; restAge = 0;
        listenAge = e.resonance ? 0 : 10;
        if (e.resonance) { listenX = e.resonance.x; listenY = e.resonance.y; }
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
    if (snap) { for (const w of wake) w.life = 0; }
    if (!dt && initialized && !snap) return;
    clock += dt; jumpAge += dt; landAge += dt; reformAge += dt; deathAge += dt;
    refillAge += dt; listenAge += dt;
    turn *= Math.exp(-dt * 15);
    if (Math.abs(p.vx) > 45 && Math.abs(lastVx) > 45 && Math.sign(p.vx) !== Math.sign(lastVx)) turn = Math.sign(p.vx) * .7;
    const landingInterrupted = p.grounded && landAge < landDuration
      && (Math.abs(p.vx) > Math.abs(lastVx) + 3 || p.vx * lastVx < -25);
    if (landingInterrupted) landAge = 10;
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
    let spread = .25, eye = 1, lookY = 0, loft = .42, bloom = 0, morph = 0;
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
    if (jumpType === 'doubleJump' && jumpAge < .49) {
      const unfold = smooth((jumpAge - .022) / .065);
      const reform = smooth((jumpAge - .30) / .19);
      morph = unfold * (1 - reform);
      // The coal becomes the bird: a pointed head and narrow torso replace
      // its round flight contour. The one wingbeat does not delay the impulse.
      sx = mix(mix(1.14, 1, unfold), sx, reform);
      sy = mix(mix(.78, 1, unfold), sy, reform);
      angle = mix(-facing * .07, angle, reform);
      spread = .05; loft = .04; bloom = morph;
      eye = mix(mix(.58, 1.06, unfold), eye, reform);
      lookY = mix(-1.3, lookY, reform); falling = 0;
    } else if (jumpType === 'wallJump' && jumpAge < .33) {
      const push = smooth(jumpAge / .065);
      const release = smooth((jumpAge - .095) / .235);
      if (jumpAge < .16) facing = kickDirection;
      sx = mix(mix(1.28, .77, push), sx, release);
      sy = mix(mix(.62, 1.47, push), sy, release);
      angle = mix(kickDirection * .20, clamp(Math.atan2(p.vx, -p.vy), -1.1, 1.1) * .82, push) * (1 - release * .65);
      spread = mix(.78, .10, push); loft = .12;
      eye = mix(.49, .92, push); lookY = -2.6;
      falling = 0;
    } else if (jumpAge < .25) {
      // Anticipation is drawn on the moving body: it never delays takeoff.
      const release = smooth((jumpAge - .055) / .195);
      sy = mix(mix(.61, 1.57, smooth(jumpAge / .055)), sy, release);
      sx = mix(mix(1.37, .73, smooth(jumpAge / .055)), sx, release);
      eye = mix(.48, eye, smooth(jumpAge / .115));
      lookY = -2.9; loft = .08; spread = .04;
      falling = 0;
    }
    landCompression = 0;
    if (p.grounded && landAge < landDuration) {
      const t = landAge / landDuration;
      const medium = smooth(landStrength / .55);
      // A tap releases immediately. A real drop drives down, rebounds once.
      // The big fall holds a low spill before gathering its mass in two beats.
      const tap = (1 - smooth(t)) * .08;
      const drive = t < .22 ? mix(.68, 1, smooth(t / .22))
        : t < .60 ? mix(1, -.18, smooth((t - .22) / .38))
          : -.18 * (1 - smooth((t - .60) / .40));
      const crush = t < .12 ? mix(.76, 1, smooth(t / .12))
        : t < .34 ? mix(1, .93, smooth((t - .12) / .22))
          : t < .72 ? mix(.93, -.12, smooth((t - .34) / .38))
            : t < .86 ? mix(-.12, .065, smooth((t - .72) / .14))
              : .065 * (1 - smooth((t - .86) / .14));
      const weight = mix(mix(tap, drive * (.22 + landStrength * .92), medium), crush, landHeavy);
      const impactMotion = reduced ? .58 : 1;
      landCompression = Math.max(0, weight) * impactMotion;
      sx = 1 + weight * (.72 + landHeavy * .69) * impactMotion;
      sy = 1 - weight * (.52 + landHeavy * .12) * impactMotion;
      spread = .25 + landCompression * (1.4 + landHeavy * 1.3);
      loft = .42 - landCompression * .36;
      contactBend = landDrift * facing * weight * 5.4 * impactMotion;
      eye = 1 - landCompression * .12;
      angle = landDrift * weight * .13 * impactMotion;
      lookY = landCompression * 1.8;
      bob = 0;
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
    const follow = snap || landingInterrupted ? 1 : 1 - Math.exp(-dt * (jumpAge < .12 || landAge < .08 || wall ? 62 : 23));
    pose.sx = mix(pose.sx, sx, follow);
    pose.sy = mix(pose.sy, sy, follow);
    pose.angle = mix(pose.angle, angle + turn * .2 * motionScale, snap ? 1 : 1 - Math.exp(-dt * (jumpAge < .1 ? 55 : 27)));
    pose.spread = mix(pose.spread, spread, follow);
    pose.loft = mix(pose.loft, loft, snap ? 1 : 1 - Math.exp(-dt * 31));
    pose.bloom = mix(pose.bloom, bloom, follow);
    pose.morph = wall || dead || p.grounded ? 0 : morph;
    // Direction is the actual new velocity, including wall release. Around
    // the apex the mass disappears before direction can reverse. One scalar
    // controls both the connected mantle and the existing secondary currents.
    const impulse = jumpAge < .43 ? smooth((jumpAge - .018) / .065) * (1 - smooth((jumpAge - .20) / .23)) : 0;
    const comet = p.grounded || wall || dead ? 0 : Math.max(morph,
      impulse * (jumpType === 'wallJump' ? 1 : .78), smooth((-p.vy - 100) / 510) * .72,
      smooth((p.vy - 150) / 500) * .39);
    pose.comet = comet * (reduced ? .48 : 1);
    if (speed > 80) {
      const directionFollow = snap || jumpAge < .08 ? 1 : 1 - Math.exp(-dt * 19);
      pose.tailX = mix(pose.tailX, -p.vx / speed, directionFollow);
      pose.tailY = mix(pose.tailY, -p.vy / speed, directionFollow);
      const tailLength = Math.max(.01, Math.hypot(pose.tailX, pose.tailY));
      pose.tailX /= tailLength; pose.tailY /= tailLength;
    }
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

    // One bounded fixture selection serves the entire character. Wings can
    // enter a ribbon before the core does; detached ash keeps its birth light.
    const extent = mix(12, 34, pose.morph);
    const lx = localX(-extent, -8), ly = localY(-extent, -8);
    const rx = localX(extent, -8), ry = localY(extent, -8);
    let strongest = 0;
    for (let i = 0; i < CATHEDRAL_LIGHTS.length; i++) {
      const opening = CATHEDRAL_LIGHTS[i];
      const exposure = Math.max(lightFrom(opening, pose.x, pose.y), lightFrom(opening, lx, ly), lightFrom(opening, rx, ry));
      if (exposure > strongest) { strongest = exposure; openingIndex = i; }
    }
    const opening = CATHEDRAL_LIGHTS[openingIndex];
    const lightFollow = snap ? 1 : 1 - Math.exp(-dt * 28);
    light.core = mix(light.core, lightFrom(opening, pose.x, pose.y - 7), lightFollow);
    light.left = mix(light.left, lightFrom(opening, lx, ly), lightFollow);
    light.right = mix(light.right, lightFrom(opening, rx, ry), lightFollow);
    const dx = opening.x - pose.x, dy = opening.y - pose.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const cos = Math.cos(pose.angle), sin = Math.sin(pose.angle);
    light.x = mix(light.x, (dx * cos + dy * sin) / distance * facing, lightFollow);
    light.y = mix(light.y, (-dx * sin + dy * cos) / distance, lightFollow);

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

    // Six short contact tufts preserve the idle, wall brace and landing
    // silhouette. Their airborne positions stay warm for the next contact;
    // airborne rendering itself uses detached particles.
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const subDt = dt / steps;
    for (const fibre of fibres) {
      const { side, level, points } = fibre;
      const flowing = side < 0 && level < 2;
      const crownFlow = side < 0 && level === 0 ? Math.max(pose.missing, pose.morph) : 0;
      const rootX = mix(side * (level === 0 ? 8.5 : level === 1 ? 12 : 8.5), -2.8, crownFlow);
      const rootY = mix(level === 0 ? -11 : level === 1 ? -1 : 8, -15.5, crownFlow);
      const ax = localX(rootX, rootY), ay = localY(rootX, rootY);
      const speedRatio = clamp(speed / 650, 0, 1);
      const loftAmount = pose.loft * (1 - pose.comet);
      const transport = pose.comet > .05 ? .98 : mix(.78, .88, pose.loft);
      if (!snap && !reduced) for (let j = 1; j < points.length; j++) {
        points[j].x += (cx - lastX) * transport;
        points[j].y += (foot - lastY) * transport;
      }
      let dx = side * facing * (2.8 + pose.spread * 2.8);
      let dy = (level - 1) * 1.8 + 2.2;
      if (!p.grounded && !wall) {
        dx = mix(dx, -p.vx / Math.max(speed, 1) * 10 + side * 2.3, speedRatio * .83);
        dy = mix(dy, -p.vy / Math.max(speed, 1) * 10, speedRatio * .88);
        dx = mix(dx, side * facing * 2.5, loftAmount);
        dy = mix(dy, (level - 1) * 1.7, loftAmount);
        dx = mix(dx, pose.tailX * (flowing ? 15 : 9), pose.comet);
        dy = mix(dy, pose.tailY * (flowing ? 15 : 9), pose.comet);
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
        if (landCompression > 0) {
          const sweep = landCompression;
          dx += side * facing * sweep * 4;
          dy = mix(dy, level === 0 ? 1.5 : -.5, sweep);
        }
      }
      // Keep hidden flight tufts short for their return at the next contact.
      if (flowing && pose.air && !wall) {
        const extension = .24;
        dx *= extension * (reduced ? .62 : 1); dy *= extension * (reduced ? .62 : 1);
      }
      for (let sub = 0; sub < steps; sub++) {
        points[0].x = ax; points[0].y = ay;
        for (let j = 1; j < points.length; j++) {
          const point = points[j], parent = points[j - 1];
          const wave = reduced ? 0 : Math.sin(clock * (4.2 + level * .7) - j * .95 + side * 2 + level) * (1 + j * .55) * (1 + pose.fall * .35) * (1 - pose.rest * .65);
          let tx = parent.x + dx * (1 - j / (points.length - 1) * .40) + wave * .45;
          let ty = parent.y + dy * (1 - j / (points.length - 1) * .32) + wave * .65;
          // Fallen ash rolls over the shoulders in unequal hooks. Curl only
          // the loose end; keep the root taut so the body still carries weight.
          if (pose.fall > .05 && !wall) {
            const curl = Math.max(0, j / (points.length - 1) * 4 - 1.5) * pose.fall;
            tx -= side * facing * curl * (1.6 + level * .4);
            ty += curl * curl * (side * facing > 0 ? 1.15 : .72);
          }
          if (loftAmount > .15 && !wall) {
            // Slow soot curls back into itself instead of preserving spear tips.
            tx -= side * facing * loftAmount * Math.max(0, j / (points.length - 1) * 4 - 2) * (1.4 + level * .38);
            ty -= loftAmount * Math.sin(j / (points.length - 1) * Math.PI) * (level === 0 ? 1.7 : .5);
          }
          if (p.grounded) ty = Math.min(foot - .8, ty);
          if (snap || reduced) { point.x = tx; point.y = ty; point.vx = point.vy = 0; }
          else {
            const stiffness = (860 - j / (points.length - 1) * 360) * (1 + pose.bloom * 1.8);
            const damping = 27 + pose.bloom * 15;
            point.vx += ((tx - point.x) * stiffness - point.vx * damping) * subDt;
            point.vy += ((ty - point.y) * stiffness - point.vy * damping) * subDt;
            point.x += point.vx * subDt; point.y += point.vy * subDt;
            // Flight speed must never leave a detached cape covering a ledge.
            const distance = Math.hypot(point.x - parent.x, point.y - parent.y);
            const maxLength = p.grounded ? (flowing ? 4.4 : 7) : 4;
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
      w.exposure = lightFrom(CATHEDRAL_LIGHTS[w.opening], w.x, w.y);
      // Ordinary smoke and ash are never pulled toward the moving player.
      // Only the grounded charge refill retains its explicit gather gesture.
      const dx = (w.mantle ? localX(-10, -3) : pose.x) - w.x;
      const dy = (w.mantle ? localY(-10, -3) : pose.y) - w.y;
      const pull = w.gather && (w.mantle || age > .13) && Math.hypot(dx, dy) < 100 ? 48 + age * 150 : 0;
      const curl = Math.sin(age * 5 + w.seed) * (w.kind === 1 ? 24 : 9);
      w.vx += (dx * pull + curl - w.vx * w.drag) * dt;
      w.vy += (dy * pull + (w.kind === 1 ? -32 : 32) - w.vy * w.drag) * dt;
      w.x += w.vx * dt; w.y += w.vy * dt;
      w.angle += w.spin * dt;
    }
    if (!wingShed && jumpType === 'doubleJump' && jumpAge >= .075 && jumpAge < .3 && pose.air && !dead) {
      wingShed = true;
      // Only loose feather tips peel away. The connected black silhouette
      // carries the event; smoke stays below and outside its face and torso.
      for (let i = 0; i < (reduced ? 4 : 10); i++) {
        const seed = impulseSeed * 19.37 + i * 5.73;
        const side = i % 2 ? 1 : -1;
        const x = side * (28 + hash(seed) * 14), y = -7 + hash(seed + 1) * 12;
        const w = shed(localX(x, y), localY(x, y),
          p.vx * .2 + side * (24 + hash(seed + 2) * 46), p.vy * .12 + 30 + hash(seed + 3) * 35, 1, false);
        w.kind = i < 2 ? 1 : 0;
        w.size = i < 2 ? 3.2 : .7 + hash(seed + 4) * 1.5;
        w.life = w.total = .24 + hash(seed + 5) * .24;
        w.drag = 2.4;
      }
    }
    if (!wingAfterShed && wingShed && jumpType === 'doubleJump' && jumpAge >= .23 && jumpAge < .34 && pose.air && !dead) {
      wingAfterShed = true;
      for (let i = 0; i < (reduced ? 2 : 6); i++) {
        const seed = impulseSeed * 8.19 + i * 3.21;
        const side = i % 2 ? 1 : -1;
        const w = shed(localX(side * (20 + hash(seed) * 14), 17), localY(side * 24, 17),
          p.vx * .18 + side * (20 + hash(seed + 1) * 30), p.vy * .1 + 55, 1, false);
        w.kind = i < 2 ? 1 : 0; w.size = i < 2 ? 3.8 : 1 + hash(seed + 2);
        w.life = w.total = .26 + hash(seed + 3) * .23;
      }
    }
    if (!pose.dead && !snap) {
      shedTime += dt;
      const interval = reduced ? .09 : pose.air ? .020 : run ? .065 : .16;
      while (shedTime >= interval) {
        shedTime -= interval;
        const seed = wakeCursor * 3.71;
        const a = hash(seed) * TAU;
        const smoke = pose.air && hash(seed + 2) > .30;
        const scatter = (hash(seed + 3) - .5) * 22;
        // Born on the crumbling shoulder, then left in the world. Unequal
        // drift, lifetime, size and spin replace the attached graphic tail.
        const x = pose.air ? pose.x + pose.tailX * 13 - pose.tailY * scatter : localX(Math.cos(a) * 13, Math.sin(a) * 15 - 2);
        const y = pose.air ? pose.y + pose.tailY * 13 + pose.tailX * scatter : Math.min(foot - .8, localY(Math.cos(a) * 13, Math.sin(a) * 15 - 2));
        const w = shed(x, y, p.vx * .12 + Math.cos(a) * 30,
          p.vy * .12 + Math.sin(a) * 24 - 12, 1, false);
        w.kind = smoke ? 1 : 0;
        w.size = (smoke ? 4.5 + hash(seed + 4) * 6.5 : .6 + hash(seed + 4) * 2) * (reduced ? .7 : 1);
        w.life = w.total = smoke ? .48 + hash(seed + 5) * .40 : .27 + hash(seed + 5) * .44;
        w.drag = smoke ? 2.1 : 2.8;
      }
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

  function ravenCorePath(c) {
    const m = pose.morph;
    const x = (coal, bird, y) => mix(bendX(coal, y), bird, m);
    const y = (coal, bird) => mix(coal, bird, m);
    c.beginPath(); c.moveTo(x(-10, -6, -13), y(-13, -14));
    c.bezierCurveTo(x(-5, -5, -18), y(-18, -23), x(6, 5, -18), y(-18, -25), x(12, 10, -12), y(-12, -19));
    // The brow pulls into a short heavy raven bill, with a hooked lower tip.
    c.bezierCurveTo(x(15, 13, -9), y(-9, -19), x(17, 17, -5), y(-5, -18), x(18, 21, -2), y(-2, -14));
    c.bezierCurveTo(x(18, 17, 1), y(1, -15), x(16, 14, 4), y(4, -15), x(15, 10, 7), y(7, -14));
    c.bezierCurveTo(x(13, 10, 10), y(10, -7), x(9, 9, 14), y(14, 2), x(4, 3, 15), y(15, 11));
    c.bezierCurveTo(x(1, 0, 16), y(16, 15), x(-3, -5, 15), y(15, 20), x(-6, -10, 14), y(14, 25));
    c.lineTo(x(-10, -9, 12), y(12, 18)); c.lineTo(x(-12, -15, 10), y(10, 21));
    c.lineTo(x(-14, -11, 8), y(8, 13));
    c.bezierCurveTo(x(-12, -9, 5), y(5, 10), x(-17, -10, 2), y(2, 3), x(-17, -9, -2), y(-2, -4));
    c.bezierCurveTo(x(-18, -9, -8), y(-8, -8), x(-14, -7, -12), y(-12, -10), x(-10, -6, -13), y(-13, -14));
    c.closePath();
  }

  function ravenWingPath(c, side, erode = false) {
    const m = pose.morph;
    // A lifted elbow leads long primaries. The downstroke sweeps the wrist
    // below the body before the feathers fold back into the shoulder.
    const stroke = smooth((jumpAge - .17) / .125);
    const fold = smooth((jumpAge - .30) / .15);
    const rotation = mix(-.49, .46, stroke) + fold * .36;
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const rootX = side < 0 ? -5 : 4, rootY = side < 0 ? -6 : -8;
    const depth = side < 0 ? 1 : .88;
    const spread = m * (1 - fold * .30);
    const wx = (x, y) => rootX + side * (x * cos - y * sin) * spread * depth;
    const wy = (x, y) => rootY + (x * sin + y * cos) * spread * (side < 0 ? 1 : .9);
    if (erode) {
      c.beginPath();
      for (let i = 0; i < WING_FRAY.length; i += 2) {
        const x = WING_FRAY[i], y = WING_FRAY[i + 1];
        const r = .45 + hash(i * 3.7 + side) * .85;
        c.moveTo(wx(x - r, y), wy(x - r, y));
        c.lineTo(wx(x + .2, y - r), wy(x + .2, y - r));
        c.lineTo(wx(x + r * 1.7, y + .3), wy(x + r * 1.7, y + .3));
        c.lineTo(wx(x, y + r * .8), wy(x, y + r * .8)); c.closePath();
      }
      return;
    }
    c.beginPath(); c.moveTo(rootX, rootY - 3 * m);
    c.bezierCurveTo(wx(8, -9), wy(8, -9), wx(18, -16), wy(18, -16), wx(28, -12), wy(28, -12));
    c.bezierCurveTo(wx(35, -11), wy(35, -11), wx(43, -8), wy(43, -8), wx(48, -4), wy(48, -4));
    // Unequal, curved finger feathers avoid a rigid V or scalloped bat wing.
    c.quadraticCurveTo(wx(46, -1), wy(46, -1), wx(35, 0), wy(35, 0));
    c.quadraticCurveTo(wx(43, 2), wy(43, 2), wx(46, 5), wy(46, 5));
    c.quadraticCurveTo(wx(40, 7), wy(40, 7), wx(31, 5), wy(31, 5));
    c.quadraticCurveTo(wx(38, 9), wy(38, 9), wx(39, 12), wy(39, 12));
    c.quadraticCurveTo(wx(33, 12), wy(33, 12), wx(26, 8), wy(26, 8));
    c.quadraticCurveTo(wx(31, 14), wy(31, 14), wx(31, 16), wy(31, 16));
    c.quadraticCurveTo(wx(25, 14), wy(25, 14), wx(21, 10), wy(21, 10));
    c.lineTo(wx(23, 17), wy(23, 17));
    c.quadraticCurveTo(wx(15, 14), wy(15, 14), wx(12, 8), wy(12, 8));
    c.quadraticCurveTo(wx(5, 9), wy(5, 9), rootX - side * 3, rootY + 11 * m);
    c.closePath();
  }

  function bodyPath(c, bend = pose.bend, loft = pose.loft, bloom = pose.bloom, fall = pose.fall) {
    if (pose.morph > .001 && !pose.dead) { ravenCorePath(c); return; }
    if (pose.air && !pose.dead && pose.comet > .18) {
      // Flight gathers the face into a dense, round coal. Its broken rear
      // edge sheds into the separate smoke, without growing a pointed neck.
      const ripple = reduced ? 0 : Math.sin(clock * 15 + impulseSeed * 2.37) * 1.2;
      c.beginPath(); c.moveTo(bendX(-10, -13, bend), -13);
      c.bezierCurveTo(bendX(-5, -18, bend), -18, bendX(6, -18, bend), -18, bendX(12, -12, bend), -12);
      c.bezierCurveTo(bendX(19, -6, bend), -6, bendX(18, 5, bend), 5, bendX(12, 11, bend), 11);
      c.bezierCurveTo(7, 16, -3, 17, -10, 12);
      c.lineTo(-14 - ripple, 8); c.lineTo(-12, 5);
      c.bezierCurveTo(bendX(-18, 1, bend), 1, bendX(-18 + ripple, -8, bend), -8, bendX(-10, -13, bend), -13);
      c.closePath(); return;
    }
    // Unequal shoulders, a hooked crown and three broken lower lobes keep the
    // creature organic at phone scale. This is deliberately not an ellipse.
    const churn = pose.air && !reduced ? Math.sin(clock * 15 + impulseSeed * 2.37) * pose.comet : 0;
    const rear = churn * 2.9;
    c.beginPath();
    c.moveTo(bendX(-8.5 + rear, -12, bend), -12);
    c.bezierCurveTo(bendX(-13, -14, bend), -14, bendX(-12, -18, bend), -18 + loft * 2.5, bendX(-10.5 + rear, -20, bend) - fall * 2, -20 + loft * 3.8 - fall * 2.6 - churn * 2);
    c.bezierCurveTo(bendX(-6, -16, bend), -16, bendX(-3, -17.5, bend), -17.5, bendX(1, -16.7, bend), -16.7);
    c.bezierCurveTo(bendX(6, -17, bend), -17, bendX(10.5, -13.5, bend), -13.5, bendX(12, -9, bend), -9);
    c.bezierCurveTo(bendX(15.5 + bloom * 3, -3.5, bend), -3.5 - bloom * 2, bendX(14.2, 5.5, bend), 5.5, bendX(9.2 + fall * 1.6, 10, bend), 10 + fall * 1.7);
    c.bezierCurveTo(bendX(7.5, 12, bend), 12, bendX(4.2, 12.4, bend), 12.4, 2 - fall * 1.8, 14 + fall * 2.7);
    c.quadraticCurveTo(bendX(-1, 11.6, bend), 11.6, bendX(-3.5, 13.1, bend), 13.1);
    c.quadraticCurveTo(-7, 14.2, bendX(-8.2, 11, bend), 11);
    c.bezierCurveTo(bendX(-12.7, 10.5, bend), 10.5, bendX(-15.2 - bloom * 3 - rear, 6.5, bend), 6.5 - bloom * 3 + churn * 2, bendX(-13.1, 2.3, bend), 2.3);
    c.bezierCurveTo(bendX(-16.2, -2, bend), -2, bendX(-13.7, -8, bend), -8, bendX(-8.5, -12, bend), -12);
    c.closePath();
  }

  function drawFibre(c, fibre) {
    const points = fibre.points;
    const end = points.length - 1;
    const loft = pose.loft * (1 - pose.bloom * .65);
    const flight = clamp(pose.speed / 700, 0, 1) * (1 - loft);
    // The body carries the dense mass. Its rear current rolls wide at the
    // shoulder, then tapers and dissolves before it can cover a route.
    const fibreWidth = (flow.available() ? 1 : .38) * mix(1.30, 1.58, loft) * (fibre.side < 0 ? 1 : .72) * (fibre.level === 2 ? .67 : 1);
    for (let j = 0; j < points.length; j++) {
      const p = points[j], a = points[Math.max(0, j - 1)], b = points[Math.min(points.length - 1, j + 1)];
      const dx = b.x - a.x, dy = b.y - a.y;
      const length = Math.max(.01, Math.hypot(dx, dy));
      const width = (j === end ? .3 + loft * .5 : mix(4.4, 4.6, flight) * (1 - j / (end + 1)) ** mix(.9, .70, loft)) * (fibre.level === 1 ? 1.08 : .86) * fibreWidth;
      p.lx = p.x - dy / length * width; p.ly = p.y + dx / length * width;
      p.rx = p.x + dy / length * width; p.ry = p.y - dx / length * width;
    }
    // One continuous taper, with shared tangent normals. Separate segment
    // quads produce teeth at bends and make soot look like articulated metal.
    c.beginPath(); c.moveTo(points[0].lx, points[0].ly);
    for (let j = 1; j < points.length - 1; j++) {
      c.quadraticCurveTo(points[j].lx, points[j].ly, (points[j].lx + points[j + 1].lx) / 2, (points[j].ly + points[j + 1].ly) / 2);
    }
    c.quadraticCurveTo(points[end].lx, points[end].ly, points[end].x, points[end].y);
    c.quadraticCurveTo(points[end].rx, points[end].ry, (points[end].rx + points[end - 1].rx) / 2, (points[end].ry + points[end - 1].ry) / 2);
    for (let j = points.length - 2; j > 0; j--) {
      c.quadraticCurveTo(points[j].rx, points[j].ry, (points[j].rx + points[j - 1].rx) / 2, (points[j].ry + points[j - 1].ry) / 2);
    }
    c.lineTo(points[0].rx, points[0].ry); c.closePath();
    // A shared material field travels through the entire tongue. Its broad
    // root joins the shoulder; porous rolled edges dissolve before the tip.
    c.save(); c.clip();
    const root = points[0], tip = points[end];
    const angle = Math.atan2(tip.y - root.y, tip.x - root.x);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    let length = 1, extent = 1;
    for (const point of points) {
      const dx = point.x - root.x, dy = point.y - root.y;
      length = Math.max(length, dx * cos + dy * sin + 4);
      extent = Math.max(extent, Math.abs(-dx * sin + dy * cos) + 7);
    }
    c.translate(root.x, root.y); c.rotate(angle);
    if (!flow.draw(c, reduced ? 0 : clock, -4, -extent, length + 7, extent * 2,
      fibre.level * 2 + (fibre.side > 0 ? 5 : 0))) {
      c.fillStyle = INK; c.fillRect(-4, -extent, length + 7, extent * 2);
    }
    c.restore();
  }

  function sootWispPath(c, size, seed, age) {
    // Unequal lobes roll open, never a punched-out cell or closed smoke ring.
    // Each piece deforms on its own age/phase instead of sharing an atlas loop.
    c.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU;
      const r = size * (.35 + hash(seed + i * 2.1) * .62 + Math.sin(age * 7 + i * 2.4 + seed) * .12);
      const x = Math.cos(a) * r, y = Math.sin(a) * r * .67;
      const next = (i + 1) % 9, na = next / 9 * TAU;
      const nr = size * (.35 + hash(seed + next * 2.1) * .62 + Math.sin(age * 7 + next * 2.4 + seed) * .12);
      if (!i) c.moveTo(x, y);
      c.quadraticCurveTo(x, y, (x + Math.cos(na) * nr) * .5, (y + Math.sin(na) * nr * .67) * .5);
    }
    c.closePath();
  }

  function drawWake(c) {
    for (const w of wake) {
      if (w.life <= 0 || pose.dead) continue;
      const t = w.life / w.total, age = w.total - w.life;
      const smoke = w.kind === 1;
      const size = w.size * (smoke ? .78 + (1 - t) * .94 : Math.min(1, t * 3));
      c.save(); c.translate(w.x, w.y); c.rotate(w.angle);
      c.globalAlpha = (smoke ? .43 * t ** 1.3 * w.opacity : .85 * smooth(t * 2)) * (reduced ? .7 : 1);
      c.fillStyle = INK;
      if (smoke) {
        c.scale(w.stretch + age * .48, 1 / Math.sqrt(w.stretch) * (1 - age * .32));
        sootWispPath(c, size, w.seed, age);
        const alpha = c.globalAlpha;
        c.globalAlpha *= .38; c.fill(); c.globalAlpha = alpha;
        c.clip();
        // A dense, offset crop breaks the repeated cellular stamp. The shared
        // tile remains the only bitmap sample; the path owns coarse erosion.
        if (!flow.draw(c, reduced ? w.seed : age * (.7 + w.opacity) + w.seed,
          -size, -size, size * 2, size * 2, w.seed % 24, 'soot')) c.fill();
        if (w.exposure > .025) {
          c.globalAlpha = alpha * w.exposure * .22;
          c.fillStyle = '#b9bcb3'; c.fill();
        }
      } else {
        c.fillStyle = ASH_LIGHT_COLORS[Math.round(clamp(w.exposure, 0, 1) * 23)];
        c.beginPath(); c.moveTo(-size * 1.2, -.15); c.lineTo(-size * .38, -size * .74);
        c.lineTo(size * .73, -size * .23); c.lineTo(size * .48, size * .68);
        c.lineTo(-size * .48, size * .32); c.closePath(); c.fill();
      }
      c.restore();
    }
  }

  function drawEyes(c, dead = false) {
    c.save(); c.translate(bendX(pose.lookX, -4.2 + pose.lookY) * (1 - pose.morph), 0);
    const blinkPhase = clock % 4.7;
    const blink = !pose.air && blinkPhase > 4.32 && blinkPhase < 4.47 ? Math.abs((blinkPhase - 4.395) / .075) : 1;
    const openness = dead ? .1 : Math.max(.13, pose.eye * blink * (1 - pose.morph * .15));
    const y = mix(-4.2 + pose.lookY, -17, pose.morph);
    c.fillStyle = IVORY;
    // Unequal eye sizes keep the face directional, even at a steep body lean.
    c.beginPath();
    c.ellipse(mix(2.5, 2.8, pose.morph), y, mix(3.6, 2.7, pose.morph), mix(4.8, 3.3, pose.morph) * openness, mix(.12, .4, pose.morph), 0, TAU);
    c.ellipse(mix(9, 7.5, pose.morph), y - .6, mix(2.45, 1.05, pose.morph), mix(3.8, 2.5, pose.morph) * openness, mix(.18, .32, pose.morph), 0, TAU);
    c.fill();
    if (pose.morph < .15 && pose.eye < .85 && pose.rest < .05 && (pose.air || landAge > .18)) {
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

  function drawMantle(c) {
    // Only a short takeoff jet is connected. It tears away within 190 ms;
    // all the lingering trail belongs to independent world-space particles.
    if (!pose.air || pose.wall || jumpType === 'doubleJump' || jumpAge > .19) return;
    const amount = Math.sin(clamp(jumpAge / .19, 0, 1) * Math.PI) * (reduced ? .6 : 1);
    const length = 17 + amount * 24;
    c.save(); c.translate(pose.x, pose.y); c.rotate(Math.atan2(pose.tailY, pose.tailX));
    c.globalAlpha = amount;
    c.beginPath(); c.moveTo(2, -10); c.lineTo(18, -8); c.lineTo(length * .74, -11);
    c.lineTo(length * .62, -4); c.lineTo(length, -3); c.lineTo(length * .77, 2);
    c.lineTo(length * .89, 6); c.lineTo(23, 4); c.lineTo(17, 10); c.lineTo(1, 9); c.closePath();
    c.clip(); c.fillStyle = INK; c.fillRect(0, -9, 24, 18);
    if (!flow.draw(c, reduced ? 0 : clock * 1.4, 0, -14, length + 5, 28, impulseSeed % 12)) c.fill();
    c.restore();
  }

  function nucleusTransform(c) {
    // Eyes and dense head share the same motion. The old shrunken body left
    // the face stranded outside its silhouette during the brightest impulse.
    c.translate(0, pose.air ? pose.fall * 2 : 0);
    if (!pose.air && landAge < landDuration) {
      // Haunches absorb the collision. Keep the head's volume and eyes above
      // its splayed feet instead of flattening the entire face into a slit.
      const roundX = 1 / pose.sx ** .78, roundY = 1 / pose.sy ** .48;
      c.translate(0, -14 * (roundY - 1));
      c.scale(roundX, roundY);
    }
    if (pose.air && jumpAge > .035) {
      // Extension belongs to the pouring shoulder. The dense head retains
      // enough round volume to read as a creature at native phone scale.
      c.scale(mix(1.10 / Math.sqrt(pose.sx), 1, pose.morph), mix(1.05 / Math.sqrt(pose.sy), 1, pose.morph));
    }
  }

  function drawGrazingLight(b) {
    const intensity = Math.max(light.core, light.left * pose.morph, light.right * pose.morph);
    if (intensity < .012) return;
    b.save(); b.globalCompositeOperation = 'source-atop';
    const reach = mix(19, 45, pose.morph);
    const grazing = b.createLinearGradient(light.x * reach, light.y * reach,
      -light.x * reach * .45, -light.y * reach * .45);
    grazing.addColorStop(0, 'rgba(177,183,167,.88)');
    grazing.addColorStop(.43, 'rgba(120,131,117,.40)');
    grazing.addColorStop(1, 'rgba(68,78,69,0)');
    b.strokeStyle = grazing; b.fillStyle = grazing; b.lineJoin = 'round'; b.lineWidth = 1.45;
    if (pose.morph > .001) {
      for (let side = -1; side <= 1; side += 2) {
        const exposure = side < 0 ? light.left : light.right;
        ravenWingPath(b, side);
        b.globalAlpha = exposure * .15; b.fill();
        b.globalAlpha = exposure * .82; b.stroke();
      }
    }
    bodyPath(b);
    b.globalAlpha = light.core * .12; b.fill();
    b.globalAlpha = light.core * .85; b.stroke();
    b.restore();
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
    b.save();
    nucleusTransform(b);
    b.fillStyle = INK;
    if (pose.morph > .001) {
      for (let side = -1; side <= 1; side += 2) {
        ravenWingPath(b, side); b.fill();
        if (material) { b.save(); b.clip(); b.drawImage(material, -53, -44, 106, 88); b.restore(); }
      }
    }
    bodyPath(b); b.fill();
    if (material) {
      b.save(); bodyPath(b); b.clip();
      b.drawImage(material, -16, -20, 31, 36); b.restore();
    }
    // The crust continually crumbles. Erasure is isolated to this small body
    // surface, so a missing grain reveals the actual world rather than pale ink.
    b.save(); b.globalCompositeOperation = 'destination-out'; b.fillStyle = INK;
    if (pose.morph > .001) {
      b.globalAlpha = pose.morph * .86;
      ravenWingPath(b, -1, true); b.fill(); ravenWingPath(b, 1, true); b.fill();
    }
    b.globalAlpha = 1 - pose.morph;
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU;
      const phase = clock * (reduced ? 0 : 1.25) + i * 2.39;
      const nibble = .5 + (Math.sin(phase) + 1) * .62;
      const flightRadius = pose.air && pose.comet > .18 ? 17 : 13.6;
      const x = bendX(Math.cos(a) * (flightRadius + Math.sin(i * 4.7) * 1.1), Math.sin(a) * 16 - 1.8);
      const y = Math.sin(a) * 16 - 1.8;
      b.beginPath(); b.moveTo(x - nibble, y - .2);
      b.lineTo(x + .1, y - nibble * 1.3); b.lineTo(x + nibble, y + .4); b.lineTo(x - .15, y + nibble * .8); b.closePath(); b.fill();
    }
    b.restore();
    b.globalAlpha = 1 - pose.morph;
    b.strokeStyle = 'rgba(205,205,185,.49)'; b.lineWidth = .72;
    b.beginPath(); b.moveTo(bendX(-9.3, -15.4), -15.4);
    b.quadraticCurveTo(bendX(-4, -17.5), -17.5, bendX(.5, -15.8), -15.8);
    b.moveTo(bendX(3.9, -14.8), -14.8); b.quadraticCurveTo(bendX(10, -13), -13, bendX(11.4, -8.5), -8.5); b.stroke();
    if (pose.rim > .03) {
      b.globalAlpha = pose.rim * (1 - pose.morph); b.strokeStyle = 'rgba(225,225,205,.72)'; b.lineWidth = .9;
      b.beginPath(); b.moveTo(bendX(13.1, -6.7), -6.7); b.quadraticCurveTo(bendX(14.5, -3), -3, bendX(13.9, -.5), -.5);
      b.moveTo(bendX(13, 4), 4); b.quadraticCurveTo(bendX(11.8, 7.9), 7.9, bendX(8.4, 10.1), 10.1);
      b.moveTo(bendX(-13.2, 1), 1); b.quadraticCurveTo(bendX(-13.2, 6.5), 6.5, bendX(-9.2, 9.1), 9.1); b.stroke();
      b.globalAlpha = 1;
    }
    b.globalAlpha = 1;
    if (pose.missing > .001 && pose.morph < .99) {
      // An open crescent in the outer rear mantle, never the eye nucleus or
      // lower contact lobes. True transparency keeps it legible on any stone.
      const edge = mix(-19, -11.2, pose.missing);
      b.save(); b.globalCompositeOperation = 'destination-out'; b.globalAlpha = 1 - pose.morph; b.fillStyle = INK;
      b.beginPath(); b.moveTo(bendX(-22, -12), -12);
      b.lineTo(bendX(-13.4, -11), -11);
      b.quadraticCurveTo(bendX(edge - 2.2, -9.2), -9.2, bendX(edge, -5.2), -5.2);
      b.lineTo(bendX(edge - 1.1, -2.8), -2.8);
      b.quadraticCurveTo(bendX(edge - .2, .4), .4, bendX(-13.2, 4.7), 4.7);
      b.lineTo(bendX(-22, 7), 7); b.closePath(); b.fill(); b.restore();
    }
    b.restore();
    b.save(); b.globalCompositeOperation = 'source-atop';
    // The same rolling field passes through the shoulder and loose mantle.
    // The nucleus remains opaque; fine detail lives in one atlas sample.
    b.globalAlpha = .58;
    flow.draw(b, reduced ? 0 : clock, mix(-19, -53, pose.morph), mix(-23, -43, pose.morph), mix(42, 106, pose.morph), mix(44, 86, pose.morph), 0, true);
    b.restore();
    b.save(); nucleusTransform(b); drawGrazingLight(b); b.restore();
    c.drawImage(bodySurface, -56, -56, 112, 112);
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
    c.save();
    if (p.grounded) {
      c.beginPath(); c.rect(pose.x - 120, pose.y - 150, 240, p.y + p.h - pose.y + 150); c.clip();
    }
    drawMantle(c);
    for (const fibre of fibres) {
      // Spending removes the rear shoulder, while its intact crown carries
      // the remaining current. The crescent itself stays open until refill.
      c.globalAlpha = (1 - pose.comet * (fibre.side < 0 && fibre.level === 0 ? .62 : .96))
        * (fibre.side < 0 && fibre.level === 1 ? 1 - pose.missing : 1);
      if ((!pose.air || pose.wall) && c.globalAlpha > .001) drawFibre(c, fibre);
    }
    c.globalAlpha = 1;
    drawBrace(c, p);
    drawKickHands(c);
    if (p.grounded && landCompression > .025) {
      const foot = p.y + p.h - .25;
      const spread = landCompression * (12 + landHeavy * 19);
      c.fillStyle = INK;
      // Two uneven low fans are the body's weight flowing sideways. They
      // remain attached ash, while detached surface eruptions have one owner.
      for (let side = -1; side <= 1; side += 2) {
        const reach = (12 + spread * (1 + side * landDrift * .22)) * side;
        c.beginPath(); c.moveTo(pose.x + side * 3, foot - 10);
        c.quadraticCurveTo(pose.x + reach * .50, foot - 9 - landCompression * 2,
          pose.x + reach * .80, foot - 3);
        c.lineTo(pose.x + reach * .89, foot - 5 * landCompression);
        c.lineTo(pose.x + reach, foot - .6);
        c.quadraticCurveTo(pose.x + reach * .6, foot + .2, pose.x, foot);
        c.closePath(); c.fill();
      }
    }
    c.save();
    c.translate(pose.x, pose.y); c.rotate(pose.angle); c.scale(facing * pose.sx, pose.sy);
    drawLivingBody(c);
    c.save(); nucleusTransform(c);
    if (reformAge > .035) drawEyes(c);
    c.restore();
    // The held breath and missing mantle agree with the gameplay charge.
    if (p.airJumps > 0 && pose.air) {
      c.strokeStyle = 'rgba(236,237,211,.74)'; c.lineWidth = 1.05;
      c.beginPath(); c.moveTo(-8, 2); c.quadraticCurveTo(-9.6, 5, -7.3, 8); c.stroke();
      c.fillStyle = IVORY; c.beginPath(); c.ellipse(-6.8, 9.2, .8, 1.15, -.3, 0, TAU); c.fill();
    }
    c.restore();
    c.restore();
    c.restore();
  }

  return { update, emit, draw, reset };
}
