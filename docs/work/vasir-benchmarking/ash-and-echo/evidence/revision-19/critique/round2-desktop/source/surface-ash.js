/** Contact residue. Reads live colliders; all state and motion are cosmetic. */
import { sampleLight } from './lighting.js';

const CONTACT_LIMIT = 16;
const INTENT_LIMIT = 24;
const GRAINS_PER_CONTACT = 14;
const SHARDS_PER_CONTACT = 38;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const ashColors = Array.from({ length: 16 }, (_, index) => {
  const light = index / 15;
  return [[119, 121, 109], [23, 29, 26], [68, 76, 67]].map(([r, g, b]) =>
    `rgb(${Math.round(r + light * 62)},${Math.round(g + light * 59)},${Math.round(b + light * 50)})`);
});

export function createSurfaceAsh() {
  const intents = Array.from({ length: INTENT_LIMIT }, () => ({}));
  const contacts = Array.from({ length: CONTACT_LIMIT }, () => ({
    active: false, grains: Array.from({ length: GRAINS_PER_CONTACT }, () => ({})),
    shards: Array.from({ length: SHARDS_PER_CONTACT }, () => ({})),
  }));
  const platforms = new Map();
  let platformList = null;
  let intentHead = 0;
  let intentCount = 0;
  let contactCursor = 0;
  let reduced = false;
  let randomState = 0x35b1640f;

  function random() {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 4294967296;
  }

  function emit(events) {
    for (const event of events) {
      if (event.type !== 'land' && event.type !== 'wallJump' && event.type !== 'jump') continue;
      const intent = intents[(intentHead + intentCount) % INTENT_LIMIT];
      intent.type = event.type;
      intent.platformId = event.platformId;
      intent.landmark = event.landmark;
      intent.x = finite(event.contactX, finite(event.x));
      intent.y = finite(event.contactY, finite(event.y));
      intent.vx = finite(event.vx);
      intent.intensity = clamp(finite(event.intensity, 1), .18, 1.25);
      intent.severity = clamp(finite(event.landingSeverity, (intent.intensity - .18) / 1.07), 0, 1);
      intent.offset = Number.isFinite(event.contactOffset) ? clamp(event.contactOffset, -1, 1) : null;
      if (intentCount < INTENT_LIMIT) intentCount++;
      else intentHead = (intentHead + 1) % INTENT_LIMIT;
    }
  }

  function surfacePosition(contact, grain) {
    // Braking drives residue along the incoming travel direction. Its whole
    // grounded footprint remains clipped to the actual stone, including edges.
    const spread = reduced ? 1 : contact.landing
      ? .12 + .88 * (1 - Math.exp(-contact.age * 19))
      : .8 + .2 * Math.min(1, contact.age / .16);
    const slide = contact.direction * contact.braking * grain.sweep * Math.min(1, contact.age / .19);
    grain.x = clamp(contact.x + grain.offset * spread + slide, contact.left + .5, contact.right - .5);
    grain.y = contact.y - grain.size * .4;
  }

  function createContact(intent, platform, wallDirection = 0) {
    const contact = contacts[contactCursor++ % CONTACT_LIMIT];
    const light = intent.landmark === 'first-hop' || intent.landmark === 'second-hop';
    contact.active = true;
    contact.platformId = platform.id;
    contact.wall = wallDirection !== 0;
    contact.landing = intent.type === 'land';
    contact.severity = contact.landing ? intent.severity : 0;
    // Preserve tiny-drop silence, then open the ordinary-hop response early.
    contact.power = contact.severity <= .04 ? contact.severity
      : .04 + .96 * Math.pow((contact.severity - .04) / .96, .30);
    const slam = clamp((contact.severity - .42) / .5, 0, 1);
    contact.slam = slam * slam * (3 - 2 * slam);
    contact.departure = intent.type === 'jump';
    contact.direction = wallDirection || Math.sign(intent.vx);
    contact.age = 0;
    contact.strength = contact.landing ? contact.power : intent.intensity * (light ? .52 : 1);
    if (contact.departure) contact.strength *= .64;
    contact.braking = 0;
    contact.entryVx = intent.vx;
    contact.rebound = false;
    contact.duration = contact.wall ? .92 : .72 + Math.min(1, contact.strength) * .75;
    if (contact.landing) contact.duration = .34 + contact.power * .85 + (reduced ? 0 : contact.slam * .65);
    contact.localX = intent.offset === null
      ? clamp(intent.x - platform.x, 0, platform.w)
      : platform.w * (intent.offset + 1) * .5;
    contact.localY = clamp(intent.y - platform.y - 13, 0, platform.h);
    contact.left = platform.x;
    contact.right = platform.x + platform.w;
    contact.top = platform.y;
    contact.bottom = platform.y + platform.h;
    contact.x = contact.wall ? platform.x + (wallDirection > 0 ? platform.w : 0) : platform.x + contact.localX;
    contact.y = contact.wall ? platform.y + contact.localY : platform.y;
    contact.originX = contact.x;
    contact.originY = contact.y;
    contact.phase = random() * Math.PI * 2;
    contact.shardCount = reduced ? 5 : Math.min(SHARDS_PER_CONTACT, Math.round(18 + contact.strength * 18));
    if (contact.landing) contact.shardCount = reduced ? 3 : Math.round(6 + contact.power * 32);
    // The large fragments carry the force. Fine ash fills the spaces between
    // them; neither follows the camera nor remains welded to the character.
    for (let i = 0; i < contact.shardCount; i++) {
      const shard = contact.shards[i];
      const large = i < (contact.wall ? 4 : 3);
      const middle = i < 13;
      const side = i % 2 ? -1 : 1;
      const energy = .45 + contact.strength * .55;
      shard.size = (large ? 2.6 + random() * 3.8 : middle ? 1 + random() * 1.5 : .35 + random() * .5) * energy;
      shard.vx = contact.wall
        ? contact.direction * (large ? 130 + random() * 300 : 55 + random() * 460) * energy
        : (side * (75 + random() * 365) + intent.vx * .1) * energy;
      shard.vy = -(large ? 110 + random() * 310 : 38 + random() * 365) * energy;
      if (contact.departure) shard.vy *= .6;
      shard.ox = contact.wall ? contact.direction * random() * 2 : (random() - .5) * 15;
      shard.oy = contact.wall ? (random() - .5) * 22 : -random() * 3;
      shard.spin = (random() - .5) * 13;
      shard.angle = random() * Math.PI;
      shard.skew = .55 + random() * .7;
      shard.life = large ? .65 + random() * .22 : .28 + random() * .36;
      shard.delay = i < 8 ? 0 : random() * .045;
      shard.x = contact.originX + shard.ox;
      shard.y = contact.originY + shard.oy;
      shard.large = large;
      shard.started = false;
      shard.gravity = 185;
      if (contact.landing) {
        const severity = contact.power;
        const heavy = i < Math.round(1 + severity * 5);
        const settling = i >= Math.round(contact.shardCount * .7);
        // The first wave shears outward under pressure. The last pool slots
        // leave the live stone later as low, heavier settling grit.
        shard.large = heavy;
        shard.size = heavy ? .75 + severity * (4 + random() * 4)
          : (.35 + random() * 1.1) * (.65 + severity * 1.7);
        shard.vx = side * (18 + severity * (190 + random() * 440)) + intent.vx * .035;
        shard.vy = -(9 + severity * (heavy ? 105 + random() * 115 : 35 + random() * 125));
        if (settling) { shard.vx *= .38; shard.vy *= .48; }
        shard.ox = clamp(side * random() * (3 + severity * (settling ? 43 : 14)),
          contact.left + .5 - contact.x, contact.right - .5 - contact.x);
        if (heavy && i < 4 && severity > .12) {
          shard.ox = clamp(side * (16 + severity * 8), contact.left + .5 - contact.x, contact.right - .5 - contact.x);
          shard.vy *= 1.2;
        }
        shard.oy = -shard.size * .6;
        shard.life = .12 + severity * (heavy ? .62 : settling ? .55 : .34) + random() * .07;
        shard.delay = settling ? .045 + severity * (.07 + random() * .13) : random() * .018;
        shard.spin *= .45;
        shard.gravity = settling ? 100 : 185;
        if (!reduced && contact.slam > 0) {
          const slam = contact.slam;
          shard.size *= 1 + slam * (heavy ? 1.4 : .6);
          shard.vx *= 1 + slam * (settling ? .8 : 1.1);
          shard.vy *= 1 + slam * (settling ? 2.5 : 2.8);
          shard.life += slam * (settling ? .7 : .4);
          shard.delay += slam * (settling ? .19 : heavy ? .022 : .055);
          shard.gravity += slam * (settling ? 70 : 140);
          shard.spin *= 1 + slam;
        }
      }
    }
    contact.count = Math.min(GRAINS_PER_CONTACT, Math.round(6 + contact.strength * 6));
    if (contact.departure) contact.count = 0;
    if (contact.landing) contact.count = reduced ? 3 : Math.round(3 + contact.power * 11);
    const reach = contact.landing ? 3 + contact.power * 78 : 14 + contact.strength * 14;
    for (let i = 0; i < contact.count; i++) {
      const grain = contact.grains[i];
      const side = i % 2 ? -1 : 1;
      grain.offset = contact.wall ? (random() - .5) * 23 : side * ((i % 4 < 2 ? 18 : 5) + random() * reach);
      grain.size = contact.wall ? .6 + random() * 1.2 : 1 + random() * (.8 + contact.strength * .7);
      grain.width = 1.8 + random() * (contact.wall ? 2.5 : 1.8 + contact.strength * 1.5);
      grain.sweep = 8 + random() * 21;
      // Half of the skirt outlasts the mantle recoil. Heavy ash keeps its
      // contact until about 400–550ms, then lifts and erodes in small pieces.
      grain.releaseAt = .29 + (i % 3) * .075 + random() * .045 + contact.strength * .05;
      if (contact.landing) {
        grain.offset = side * (2 + random() * reach);
        grain.size = .45 + contact.power * (.8 + random() * 2.6);
        grain.width = .8 + contact.power * (1 + random() * 4.6);
        grain.releaseAt = .13 + contact.power * (.18 + (i % 3) * .075);
      }
      grain.released = false;
      grain.vx = side * (3 + random() * 7) + intent.vx * .025;
      grain.vy = -(5 + random() * (4 + contact.strength * 9));
      grain.skew = random() - .5;
      grain.shade = i % 3;
      grain.x = grain.y = grain.originX = grain.originY = 0;
      if (!contact.wall) surfacePosition(contact, grain);
    }
  }

  function resolveWall(intent, game) {
    // Wall kicks report the outgoing velocity and pre-move body position.
    // Resolve the real face, including solid plinths and tapered rib segments;
    // a coyote kick may be a few units clear of the face when it is emitted.
    const direction = Math.sign(intent.vx);
    if (!direction) return;
    const faceX = intent.x - direction * game.player.w / 2;
    const bodyTop = intent.y - game.player.h;
    let nearest = null;
    let distance = 27;
    for (const platform of platformList) {
      if (!platform.solid && platform.kind !== 'wall' && platform.kind !== 'floor') continue;
      if (bodyTop >= platform.y + platform.h || intent.y <= platform.y) continue;
      const face = platform.x + (direction > 0 ? platform.w : 0);
      const gap = (faceX - face) * direction;
      if (gap >= -.7 && gap < distance) {
        nearest = platform;
        distance = gap;
      }
    }
    if (nearest) createContact(intent, nearest, direction);
  }

  function liftRecentAsh(intent) {
    for (const contact of contacts) {
      if (!contact.active || contact.wall || contact.rebound || contact.age > .65) continue;
      const platform = platforms.get(contact.platformId);
      if (!platform || Math.abs(intent.y - platform.y) > 14
        || intent.x < platform.x - 12 || intent.x > platform.x + platform.w + 12
        || Math.abs(intent.x - (platform.x + contact.localX)) > 38) continue;
      contact.rebound = true;
      contact.duration = Math.min(contact.duration, contact.age + .52);
      for (let i = 0; i < contact.count; i++) {
        const grain = contact.grains[i];
        // A few grains remain on the ledge: a rebound pulls up the skirt,
        // never another full landing burst or a disc underneath the feet.
        if (grain.released || i % 4 === 0) continue;
        grain.releaseAt = contact.age + .018 + (i % 3) * .012;
        grain.vx = intent.vx * .045 + grain.offset * .5;
        grain.vy = -19 - contact.strength * 17 - (i % 3) * 5;
      }
    }
  }

  function resolveDeparture(intent) {
    // Resolve the actual departed ledge, including a short coyote gap. Do not
    // invent an origin in the air if no supporting stone can be identified.
    let nearest = null;
    let distance = 15;
    for (const platform of platformList) {
      if (platform.kind === 'wall' || intent.x < platform.x - 12 || intent.x > platform.x + platform.w + 12) continue;
      const gap = Math.abs(intent.y - platform.y);
      if (gap < distance) { nearest = platform; distance = gap; }
    }
    if (nearest) createContact(intent, nearest);
  }

  function update(game, dt, reducedMotion = false) {
    reduced = Boolean(reducedMotion);
    const elapsed = Math.max(0, finite(dt));
    if (platformList !== game.platforms) {
      platformList = game.platforms;
      platforms.clear();
      for (const platform of platformList) platforms.set(platform.id, platform);
    }
    while (intentCount > 0) {
      const intent = intents[intentHead];
      if (intent.type === 'land') {
        const platform = platforms.get(intent.platformId);
        if (platform) createContact(intent, platform);
      } else if (intent.type === 'wallJump') resolveWall(intent, game);
      else { liftRecentAsh(intent); resolveDeparture(intent); }
      intentHead = (intentHead + 1) % INTENT_LIMIT;
      intentCount--;
    }
    const player = game.player;
    for (const contact of contacts) {
      if (!contact.active) continue;
      contact.age += elapsed;
      const platform = platforms.get(contact.platformId);
      if (!platform || contact.age >= contact.duration) { contact.active = false; continue; }
      contact.left = platform.x;
      contact.right = platform.x + platform.w;
      contact.top = platform.y;
      contact.bottom = platform.y + platform.h;
      contact.x = contact.wall ? platform.x + (contact.direction > 0 ? platform.w : 0) : platform.x + contact.localX;
      contact.y = contact.wall ? platform.y + contact.localY : platform.y;
      for (let i = 0; i < contact.shardCount; i++) {
        const shard = contact.shards[i];
        const age = Math.max(0, contact.age - shard.delay);
        if (contact.landing && !shard.started && contact.age >= shard.delay) {
          shard.started = true;
          shard.launchX = contact.x;
          shard.launchY = contact.y;
        }
        const drag = (1 - Math.exp(-age * 4)) / 4;
        const motion = reduced ? .16 : 1;
        const originX = contact.landing ? (shard.started ? shard.launchX : contact.x) : contact.originX;
        const originY = contact.landing ? (shard.started ? shard.launchY : contact.y) : contact.originY;
        shard.x = originX + shard.ox + shard.vx * drag * motion;
        shard.y = originY + shard.oy + (shard.vy * drag + age * age * shard.gravity) * motion;
      }
      if (contact.wall) {
        for (let i = 0; i < contact.count; i++) {
          const grain = contact.grains[i];
          grain.x = contact.x - contact.direction * grain.width * .45;
          grain.y = clamp(contact.y + grain.offset, contact.top + .5, contact.bottom - .5);
        }
        continue;
      }
      if (elapsed > 0 && contact.age < .24 && player.grounded
        && Math.abs(player.y + player.h - platform.y) < 2
        && player.x + player.w > platform.x && player.x < platform.x + platform.w) {
        const lostSpeed = Math.abs(contact.entryVx) - player.vx * contact.direction;
        contact.braking = Math.max(contact.braking, clamp(lostSpeed / 258, 0, 1));
      }
      for (let i = 0; i < contact.count; i++) {
        const grain = contact.grains[i];
        if (!grain.released) {
          surfacePosition(contact, grain);
          if (reduced || contact.age <= grain.releaseAt) continue;
          grain.released = true;
          grain.originX = grain.x;
          grain.originY = grain.y;
          grain.vx += contact.direction * contact.braking * 17;
          grain.vy += Math.min(0, finite(platform.suspension?.vy)) * (contact.rebound ? 1 : .35);
        }
        if (reduced) continue;
        const age = contact.age - grain.releaseAt;
        const drag = (1 - Math.exp(-age * 3)) / 3;
        grain.x = grain.originX + grain.vx * drag;
        grain.y = grain.originY + grain.vy * drag;
      }
    }
  }

  function draw(ctx, game, cameraY = game.cameraY || 0) {
    const bottom = cameraY + game.viewportHeight;
    ctx.save();
    for (const contact of contacts) {
      if (!contact.active || contact.y < cameraY - 140 || contact.y > bottom + 140) continue;
      drawEruption(ctx, contact);
      const fade = Math.pow(Math.max(0, 1 - contact.age / contact.duration), .85);
      const colors = ashColors[Math.round(sampleLight(contact.x, contact.y) * 15)];
      ctx.save();
      if (contact.wall) {
        ctx.beginPath(); ctx.rect(contact.left, contact.top, contact.right - contact.left, contact.bottom - contact.top); ctx.clip();
      }
      for (let i = 0; i < contact.count; i++) {
        const grain = contact.grains[i];
        if (reduced && grain.released) continue;
        const airborne = grain.released && !reduced;
        // A recoiling stone may rise across detached ash. Its solid face
        // occludes that ash even though this layer is submitted after stone.
        if (!contact.wall && airborne && grain.y > contact.y
          && grain.x >= contact.left && grain.x <= contact.right) continue;
        // Broken, charcoal-colored flecks preserve the authored top edge.
        // No luminous outline, filled oval, continuous band or new silhouette.
        ctx.fillStyle = colors[grain.shade];
        ctx.globalAlpha = fade * (contact.wall ? .58 : airborne ? .62 : .82) * (.52 + contact.strength * .38);
        const x = grain.x;
        const y = grain.y;
        const width = contact.wall ? grain.width * .6 : grain.width * (airborne ? .55 : 1 + contact.braking * .65);
        const tall = contact.wall ? grain.size * 3 : grain.size * (airborne ? .9 : 1.15);
        const left = contact.wall || airborne ? x - width : Math.max(contact.left + .2, x - width);
        const right = contact.wall || airborne ? x + width : Math.min(contact.right - .2, x + width);
        if (right <= left) continue;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(clamp(x + width * grain.skew, left, right), y - tall);
        ctx.lineTo(right, y - tall * .2);
        ctx.lineTo(clamp(x + width * .1, left, right), y + tall * .3);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawSlam(ctx, contact) {
    const age = contact.age;
    const slam = contact.slam;
    const life = .24 + slam * .16;
    if (age >= life) return;
    // A tight compression becomes a tall, torn rupture. Three unequal fingers
    // on either side leave a clear channel through the character and eyes.
    const open = 1 - Math.exp(-Math.max(0, age - .012) * 24);
    const fade = Math.min(1, (life - age) / .16);
    ctx.save(); ctx.translate(contact.x, contact.y);
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? -1 : 1;
      const finger = Math.floor(i / 2);
      const root = 22 + finger * 6;
      const width = (45 + slam * (105 + finger * 18)) * (.3 + open * .7) * (i % 2 ? .82 : 1);
      const height = (28 + slam * (170 - finger * 38 + (i % 2) * 19)) * open * (i % 2 ? 1 : .83);
      const bend = root + (width - root) * .46;
      const breakAt = .045 + finger * .013 + (i % 2) * .008;
      if (age > breakAt) {
        // The connected strike survives only its first few frames. Its three
        // torn masses then separate, drift and fall in world space; no spokes
        // stay attached to the stone through the settling phase.
        const looseAge = age - breakAt;
        ctx.save();
        ctx.translate(contact.originX - contact.x, contact.originY - contact.y);
        for (let piece = 0; piece < 3; piece++) {
          const fraction = .28 + piece * .29;
          const x = side * (root + (width - root) * fraction + looseAge * (20 + finger * 17 + piece * 13));
          const y = -height * fraction + looseAge * looseAge * (170 + piece * 90);
          const uneven = .75 + .25 * Math.sin(contact.phase + i * 3.4 + piece * 2.1);
          const wide = (8 + slam * 17) * uneven * (1 - piece * .12);
          const tall = (12 + slam * 24) * (1 - piece * .09);
          ctx.save(); ctx.translate(x, y);
          ctx.rotate(side * (.2 + piece * .43 + Math.sin(contact.phase + i + piece) * .4
            + looseAge * (1.5 + finger + piece * .8)));
          ctx.fillStyle = piece === 1 && finger === 1 ? '#3b4038' : '#111713';
          ctx.globalAlpha = slam * fade * (.8 + piece * .06);
          ctx.beginPath(); ctx.moveTo(-wide, -tall * .3);
          ctx.lineTo(-wide * .75, -tall * .72);
          ctx.lineTo(-wide * .35, -tall * .65);
          ctx.lineTo(-wide * .25, -tall * .93);
          ctx.lineTo(wide * .43, -tall * .75);
          ctx.lineTo(wide * .74, -tall * .21);
          ctx.lineTo(wide * .62, tall * .04);
          ctx.lineTo(wide * .89, tall * .28);
          ctx.lineTo(wide * .17, tall * .52);
          ctx.lineTo(-wide * .55, tall * .33);
          ctx.lineTo(-wide * .49, tall * .12);
          ctx.lineTo(-wide * .9, tall * .08);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#959b86'; ctx.globalAlpha = slam * fade * .5;
          ctx.beginPath(); ctx.moveTo(-wide * .47, -tall * .38);
          ctx.lineTo(-wide * .55, -tall * .83);
          ctx.lineTo(-wide * .3, -tall * .54);
          ctx.closePath(); ctx.fill(); ctx.restore();
        }
        ctx.restore();
        continue;
      }
      ctx.fillStyle = finger === 1 ? '#343933' : '#101612';
      ctx.globalAlpha = slam * fade * (finger === 1 ? .72 : .96);
      ctx.beginPath(); ctx.moveTo(side * root, -1);
      ctx.lineTo(side * bend, -height * .32);
      ctx.lineTo(side * (width - 25), -height * .54);
      ctx.lineTo(side * (width - 30), -height * .57);
      ctx.lineTo(side * (width - 12), -height * .69);
      ctx.lineTo(side * (width - 18), -height * .76);
      ctx.lineTo(side * (width - 4), -height * .88);
      ctx.lineTo(side * width, -height);
      ctx.lineTo(side * (width - 2), -height * .64);
      ctx.lineTo(side * (width + 9), -height * .73);
      ctx.lineTo(side * (width - 4), -height * .36);
      ctx.lineTo(side * (width + 13), -height * .42);
      ctx.lineTo(side * (bend + 12), -height * .12);
      ctx.lineTo(side * (root + 10), -2);
      ctx.closePath();
      ctx.moveTo(side * (bend + 4), -height * .25);
      ctx.lineTo(side * (width - 5), -height * .57);
      ctx.lineTo(side * (bend + 15), -height * .24);
      ctx.closePath();
      ctx.moveTo(side * (width - 10), -height * .61);
      ctx.lineTo(side * (width + 2), -height * .68);
      ctx.lineTo(side * (width - 4), -height * .49);
      ctx.closePath(); ctx.fill('evenodd');
      // Broken ash catches follow the force, never a full white flash.
      ctx.strokeStyle = finger === 0 ? '#c7c6af' : '#808778';
      ctx.lineWidth = 1 + slam * (finger === 0 ? 2 : 1);
      ctx.globalAlpha = slam * fade * .8;
      ctx.beginPath();
      ctx.moveTo(side * (root + 4), -2);
      ctx.lineTo(side * (bend - 3), -height * .25);
      ctx.moveTo(side * (bend + 9), -height * .43);
      ctx.lineTo(side * (bend + (width - bend) * .38), -height * .54);
      ctx.moveTo(side * (width - 14), -height * .73);
      ctx.lineTo(side * (width - 8), -height * .81);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEruption(ctx, contact) {
    const age = contact.age;
    const strength = contact.strength;
    if (!reduced && contact.slam > .001) drawSlam(ctx, contact);
    // A broken pressure crest grows away from the point of force, then is
    // gone before the heavy pieces settle. These are strokes, never a disc.
    const pressureLife = contact.wall ? .19 : contact.landing ? .07 + Math.sqrt(contact.power) * .13 : .16;
    if (contact.landing && !reduced && age < pressureLife) {
      const t = age / pressureLife;
      const power = contact.power;
      const open = .18 + .82 * (1 - Math.exp(-t * 7));
      const reach = (9 + power * 130) * open;
      ctx.save();
      ctx.translate(contact.x, contact.y);
      // Torn shoulders grow outside the body. Their negative-space cuts keep
      // this a material eruption, not an opaque disc beneath the character.
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? -1 : 1;
        const extent = reach * (.72 + .28 * Math.sin(contact.phase + i * 2.4) ** 2);
        const height = (1 + power * (17 + (i % 3) * 12)) * Math.sin((.3 + t * .55) * Math.PI);
        const root = Math.min(extent * .2, 7 + power * 8);
        ctx.fillStyle = i % 3 === 0 ? '#686b61' : '#1a1e1a';
        ctx.globalAlpha = (.3 + power * .65) * Math.pow(1 - t, .5) * (i % 3 === 0 ? .52 : .8);
        ctx.beginPath();
        ctx.moveTo(side * root, -.5);
        ctx.lineTo(side * extent * .34, -height * .24);
        ctx.lineTo(side * extent * .45, -height * .35);
        ctx.lineTo(side * extent * .51, -height * .17);
        ctx.lineTo(side * extent * .66, -height * .37);
        ctx.lineTo(side * extent * .70, -height * .13);
        ctx.lineTo(side * extent * .82, -height * .19);
        ctx.lineTo(side * extent, -height * .08);
        ctx.lineTo(side * extent * .76, -1);
        ctx.lineTo(side * extent * .42, -height * .10);
        ctx.closePath();
        ctx.moveTo(side * extent * .48, -height * .21);
        ctx.lineTo(side * extent * .65, -height * .52);
        ctx.lineTo(side * extent * .59, -height * .19);
        ctx.closePath(); ctx.fill('evenodd');
      }
      // Two unequal strikes leave the body corridor open. Their broken ivory
      // edges make the early transfer legible against both ash and masonry.
      if (power > .12 && age < .11) {
        const strike = .45 + .55 * (1 - Math.exp(-age * 40));
        const fade = Math.min(1, (1 - age / .11) * 1.8);
        for (let i = 0; i < 2; i++) {
          const side = i ? -1 : 1;
          const root = side * 18;
          const tip = side * (24 + (24 + power * (38 - i * 8)) * strike);
          const tall = (7 + power * (27 + i * 10)) * strike;
          const middle = root + (tip - root) * .45;
          ctx.fillStyle = '#171d18'; ctx.globalAlpha = fade * .94;
          ctx.beginPath(); ctx.moveTo(root, -1);
          ctx.quadraticCurveTo(middle, -tall * .38, tip, -tall);
          ctx.lineTo(tip - side * 7, -tall * .42);
          ctx.lineTo(tip + side * 8, -tall * .56);
          ctx.lineTo(middle + side * 8, -2);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#dedbc6';
          ctx.globalAlpha = fade * Math.min(.92, power * 1.8);
          ctx.lineWidth = 1 + power * 1.4;
          ctx.lineCap = 'butt';
          ctx.beginPath();
          ctx.moveTo(root + side * 3, -2);
          ctx.lineTo(middle - side * 4, -tall * .31);
          ctx.moveTo(middle + side * 3, -tall * .45);
          ctx.lineTo(tip - side * 3, -tall * .86);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (!contact.landing && !reduced && age < pressureLife) {
      const t = age / pressureLife;
      const reach = (contact.wall ? 49 : 57) * (.45 + strength * .55) * Math.sin(Math.min(1, .2 + t * 1.7) * Math.PI * .5);
      ctx.save();
      ctx.translate(contact.x, contact.y);
      if (contact.wall) ctx.scale(contact.direction, 1);
      // The first answer is torn material at the contact, not disconnected
      // confetti. Unequal fingers open rapidly, then break into the shards.
      ctx.fillStyle = '#111713';
      ctx.globalAlpha = Math.pow(1 - t, 1.7) * .92;
      for (let i = 0; i < 5; i++) {
        const side = i % 2 ? -1 : 1;
        const variation = .77 + Math.sin(contact.phase + i * 2.4) * .2;
        const extent = reach * variation;
        ctx.beginPath();
        if (contact.wall) {
          const root = (i - 2) * 5;
          const tipY = -extent * ((i - 2) * .42 + .3);
          ctx.moveTo(0, root + 4);
          ctx.quadraticCurveTo(extent * .24, root - 3, extent, tipY);
          ctx.lineTo(extent * .57, tipY * .63 + 3);
          ctx.lineTo(extent * .34, root - 4);
          ctx.lineTo(0, root - 3);
        } else {
          ctx.moveTo(side * 3, -1);
          ctx.quadraticCurveTo(side * extent * .2, -extent * .35, side * extent, -extent * (.16 + (i % 3) * .12));
          ctx.lineTo(side * extent * .63, -extent * .06);
          ctx.lineTo(side * extent * .36, -3);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = '#eeeee0';
      ctx.globalAlpha = (1 - t) * (contact.wall ? .9 : .82);
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const spread = i - 1;
        ctx.lineWidth = i === 1 ? 1.3 : .65;
        ctx.beginPath();
        if (contact.wall) {
          const endY = reach * (.36 - i * .51);
          ctx.moveTo(1 + i, spread * 9);
          ctx.bezierCurveTo(reach * .12, spread * 15, reach * .53, endY + spread * 5, reach * (.67 + i * .12), endY);
        } else {
          const side = i === 1 ? -1 : 1;
          const origin = side * (5 + i * 2);
          ctx.moveTo(origin, -1);
          ctx.bezierCurveTo(side * reach * .38, -reach * (.5 + i * .08), side * reach * .76, -reach * .2, side * reach, -2 - i);
        }
        ctx.stroke();
      }
      if (contact.wall && age < .16) {
        // A fractured, lit pocket remains on the stone as the body leaves.
        // Unequal solid facets survive at phone scale; thin rays alone merge
        // into the character's wake and fail to show where force was applied.
        const flashAge = age / .16;
        const open = .75 + Math.sin(flashAge * Math.PI) * .3;
        ctx.fillStyle = '#f0f0e5';
        ctx.globalAlpha = Math.pow(1 - flashAge, .55) * .95;
        for (let i = 0; i < 6; i++) {
          const y = (i - 2.5) * 5.2;
          const tooth = (10 + Math.sin(contact.phase + i * 2.6) * 3) * open;
          const x = 3 + (i % 3) * 5;
          ctx.beginPath();
          ctx.moveTo(x, y - 3.7);
          ctx.lineTo(x + tooth * .58, y - 4.5);
          ctx.lineTo(x + tooth, y + .9);
          ctx.lineTo(x + tooth * .41, y - .3);
          ctx.lineTo(x + 1, y + 2.2);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#111713';
        ctx.globalAlpha = Math.pow(1 - flashAge, .6) * .88;
        for (let i = 0; i < 5; i++) {
          const x = 6 + Math.sin(contact.phase + i * 3.1) * 5;
          const y = (i - 2) * 5;
          ctx.beginPath(); ctx.moveTo(x - 2, y - 2.4); ctx.lineTo(x + 2.7, y - 1.3);
          ctx.lineTo(x + 1.2, y + 2.5); ctx.lineTo(x - 2.8, y + 1); ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();
    }
    const visibleCount = reduced ? Math.min(5, contact.shardCount) : contact.shardCount;
    for (let i = 0; i < visibleCount; i++) {
      const shard = contact.shards[i];
      const lifeAge = age - shard.delay;
      if (lifeAge < 0 || lifeAge > shard.life) continue;
      // The emitting stone still occludes fragments which fall behind it.
      if (contact.wall ? (shard.x - contact.x) * contact.direction < 0
        : shard.y > contact.y && shard.x >= contact.left && shard.x <= contact.right) continue;
      const opacity = Math.min(1, (shard.life - lifeAge) / .17) * (reduced ? .5 : .93);
      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.angle + lifeAge * shard.spin * (reduced ? .1 : 1));
      ctx.globalAlpha = opacity;
      ctx.fillStyle = contact.landing && !shard.large && i % 5 === 0 ? '#aaa98f'
        : i % 5 === 0 ? '#303633' : '#101613';
      const size = shard.size;
      ctx.beginPath();
      if (contact.slam > .001 && !reduced) {
        // Ragged coal has unequal broken faces, never regular punched hexes.
        const skew = shard.skew;
        ctx.moveTo(-size, -size * .23);
        ctx.lineTo(-size * .66, -size * .62);
        ctx.lineTo(-size * .25, -size * .54);
        ctx.lineTo(-size * .16, -size * skew);
        ctx.lineTo(size * .49, -size * .7);
        ctx.lineTo(size * .73, -size * .24);
        ctx.lineTo(size * .58, size * .01);
        ctx.lineTo(size * .9, size * .28);
        ctx.lineTo(size * .13, size * .68);
        ctx.lineTo(-size * .58, size * .42);
        ctx.lineTo(-size * .5, size * .17);
        ctx.lineTo(-size * .88, size * .08);
      } else {
      ctx.moveTo(-size, -size * .2);
      ctx.lineTo(-size * .4, -size * shard.skew);
      ctx.lineTo(size * .49, -size * .7);
      ctx.lineTo(size, size * .13);
      ctx.lineTo(size * .24, size * .86);
      ctx.lineTo(-size * .76, size * .57);
      }
      ctx.closePath();
      if (shard.large && (contact.slam <= .001 || reduced)) {
        ctx.moveTo(-size * .12, -size * .27);
        ctx.lineTo(size * .32, -size * .15);
        ctx.lineTo(size * .09, size * .22);
        ctx.closePath();
      }
      ctx.fill('evenodd');
      if (shard.large && lifeAge < .22) {
        ctx.globalAlpha = opacity * .55 * (1 - lifeAge / .22);
        ctx.strokeStyle = contact.landing ? '#92978a' : '#e3e5d9'; ctx.lineWidth = .55;
        ctx.beginPath(); ctx.moveTo(-size * .4, -size * shard.skew); ctx.lineTo(size * .49, -size * .7); ctx.stroke();
      }
      if (contact.slam > .001 && !reduced && !shard.large && lifeAge > .12) {
        const splitAge = lifeAge - .12;
        ctx.fillStyle = i % 3 === 0 ? '#999d8d' : '#141a15';
        ctx.globalAlpha = opacity * contact.slam * .8;
        for (let piece = 0; piece < 2; piece++) {
          const side = piece ? -1 : 1;
          const x = side * splitAge * (19 + (i % 4) * 12);
          const y = splitAge * splitAge * 110 - splitAge * (15 + (i % 3) * 11);
          const chip = Math.max(.5, size * .36);
          ctx.beginPath(); ctx.moveTo(x - chip, y);
          ctx.lineTo(x, y - chip * 1.3); ctx.lineTo(x + chip, y + chip * .4);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  function reset() {
    for (const contact of contacts) contact.active = false;
    intentHead = intentCount = contactCursor = 0;
    randomState = 0x35b1640f;
  }

  return {
    emit, update, draw, reset,
    // Copies exist only when the development seam requests an inspection.
    get state() {
      return {
        pending: intentCount, capacity: CONTACT_LIMIT, grainCapacity: CONTACT_LIMIT * GRAINS_PER_CONTACT,
        shardCapacity: CONTACT_LIMIT * SHARDS_PER_CONTACT,
        contacts: contacts.filter(contact => contact.active).map(contact => ({
          platformId: contact.platformId, wall: contact.wall, age: contact.age, duration: contact.duration,
          x: contact.x, y: contact.y, left: contact.left, right: contact.right,
          strength: contact.strength, braking: contact.braking, direction: contact.direction, rebound: contact.rebound,
          departure: contact.departure, landingSeverity: contact.severity, impactPower: contact.power, slam: contact.slam, shardCount: contact.shardCount,
          shards: contact.shards.slice(0, contact.shardCount).map(shard => ({ x: shard.x, y: shard.y, size: shard.size, delay: shard.delay, life: shard.life })),
          grains: contact.grains.slice(0, contact.count).map(grain => ({ x: grain.x, y: grain.y, released: grain.released })),
        })),
      };
    },
  };
}
