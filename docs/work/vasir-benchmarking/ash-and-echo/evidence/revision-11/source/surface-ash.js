/** Contact residue. Reads live colliders; all state and motion are cosmetic. */
import { sampleLight } from './lighting.js';

const CONTACT_LIMIT = 16;
const INTENT_LIMIT = 24;
const GRAINS_PER_CONTACT = 14;
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
      intent.offset = Number.isFinite(event.contactOffset) ? clamp(event.contactOffset, -1, 1) : null;
      if (intentCount < INTENT_LIMIT) intentCount++;
      else intentHead = (intentHead + 1) % INTENT_LIMIT;
    }
  }

  function surfacePosition(contact, grain) {
    // Braking drives residue along the incoming travel direction. Its whole
    // grounded footprint remains clipped to the actual stone, including edges.
    const spread = reduced ? 1 : .8 + .2 * Math.min(1, contact.age / .16);
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
    contact.direction = wallDirection || Math.sign(intent.vx);
    contact.age = 0;
    contact.strength = intent.intensity * (light ? .52 : 1);
    contact.braking = 0;
    contact.entryVx = intent.vx;
    contact.rebound = false;
    contact.duration = contact.wall ? .92 : .72 + Math.min(1, contact.strength) * .75;
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
    contact.count = Math.min(GRAINS_PER_CONTACT, Math.round(6 + contact.strength * 6));
    const reach = 14 + contact.strength * 14;
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
      else liftRecentAsh(intent);
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
      if (!contact.active || contact.y < cameraY - 40 || contact.y > bottom + 40) continue;
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
        contacts: contacts.filter(contact => contact.active).map(contact => ({
          platformId: contact.platformId, wall: contact.wall, age: contact.age, duration: contact.duration,
          x: contact.x, y: contact.y, left: contact.left, right: contact.right,
          strength: contact.strength, braking: contact.braking, direction: contact.direction, rebound: contact.rebound,
          grains: contact.grains.slice(0, contact.count).map(grain => ({ x: grain.x, y: grain.y, released: grain.released })),
        })),
      };
    },
  };
}
