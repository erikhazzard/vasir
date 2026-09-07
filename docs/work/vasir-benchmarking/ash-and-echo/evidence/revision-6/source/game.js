// Ash & Echo — deterministic, world-space simulation. Y points down.
// The shell supplies fixed steps; larger steps are fully subdivided, never dropped.
const WIDTH = 420;
const HEIGHT = 4600;
const LEFT_EDGE = 60;
const RIGHT_EDGE = WIDTH - 60;
const FIXED_STEP = 1 / 120;
const TUNING = Object.freeze({
  speed: 258,
  groundAcceleration: 2600,
  airAcceleration: 2100,
  groundBrake: 3000,
  airBrake: 1900,
  jumpHeight: 160,
  apexTime: 0.39,
  airJumpSpeed: 746,
  fallGravity: 1.55,
  fallSpeed: 900,
  shortJumpSpeed: 330,
  coyoteTime: 0.12,
  jumpBuffer: 0.14,
  wallCoyote: 0.10,
  wallSlideSpeed: 108,
  wallJumpSpeed: 296,
  wallJumpLift: 810,
  wallControlLock: 0.12,
  cornerCorrection: 5,
  respawnDelay: 0.26,
});
const GRAVITY = 2 * TUNING.jumpHeight / TUNING.apexTime ** 2;
const JUMP_SPEED = 2 * TUNING.jumpHeight / TUNING.apexTime;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(n, hi));
const approach = (n, target, delta) => n < target ? Math.min(n + delta, target) : Math.max(n - delta, target);
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const solid = platform => platform.kind === 'wall' || platform.kind === 'floor';

function createPlatforms() {
  // Each row is authored: [left, top, width]. Broad feet and generous top-only
  // contacts make a late sideways correction a recovery, rather than a head bonk.
  const ledges = [
    [162, 4354, 122], [48, 4218, 126], [245, 4080, 124],
    [126, 3936, 140], [38, 3788, 108], [249, 3636, 130],
    [145, 3492, 110], [49, 3346, 126], [262, 3202, 116],
    [149, 3056, 106], [39, 2898, 128], [249, 2748, 130],
    [148, 2600, 132],
    // The bell's broad resting place divides the climb into two attempts.
    [62, 2448, 296],
    [45, 2294, 120], [247, 2142, 122], [145, 1984, 120],
    [38, 1830, 118], [262, 1672, 116], [148, 1516, 110],
    [44, 1358, 118], [258, 1206, 126], [140, 1046, 126],
    [39, 890, 118], [259, 730, 122], [143, 566, 120],
    [45, 410, 128], [130, 240, 160],
  ].map(([x, y, w], index) => {
    // Side masonry grows into its wall while its inner landing edge stays put.
    // In particular, the third ledge gives a safe run-up to a right-wall kick
    // toward the fourth; the direct air-jump crossing remains equally viable.
    if (x < 80) { w += x - LEFT_EDGE; x = LEFT_EDGE; }
    else if (x > 220) w = RIGHT_EDGE - x;
    return {
      id: `ledge-${index + 1}`, x, y, w, h: index === 13 ? 30 : 20,
      kind: index === 13 ? 'checkpoint' : index === 27 ? 'summit' : 'ledge',
      // Only the free-hanging stones carry weight. Masonry and the two
      // sanctuary arches retain their authored, fixed contact surfaces.
      suspension: index !== 13 && index !== 27 && x > 61 && x + w < 359
        ? { homeX: x, homeY: y, x: 0, y: 0, vx: 0, vy: 0 } : null,
    };
  });
  const ribs = [
    { id: 'cinder-rib', x: 0, y: 3880, w: 88, h: 320 },
    { id: 'hollow-rib', x: 326, y: 3400, w: 94, h: 180 },
    { id: 'refuge-rib', x: 0, y: 2188, w: 96, h: 200 },
    { id: 'belfry-rib', x: 318, y: 810, w: 102, h: 270 },
  ].flatMap(rib => {
    // The lower third steps back into the outer wall. Presentation shares this
    // exact profile so each visible shoulder and underside is also solid.
    const shoulder = Math.round(rib.h * 0.65);
    rib.segments = Array.from({ length: 6 }, (_, index) => {
      const top = index === 0 ? 0 : shoulder + Math.round((rib.h - shoulder) * (index - 1) / 5);
      const bottom = index === 0 ? shoulder : shoulder + Math.round((rib.h - shoulder) * index / 5);
      const w = LEFT_EDGE + Math.round((rib.w - LEFT_EDGE) * (6 - index) / 6);
      return { x: rib.x === 0 ? 0 : WIDTH - w, y: rib.y + top, w, h: bottom - top };
    });
    return rib.segments.map((segment, index) => ({
      id: `${rib.id}:${index}`, ...segment, kind: 'wall', rib, ribSegment: index,
    }));
  });
  return [
    { id: 'floor', x: LEFT_EDGE, y: 4480, w: RIGHT_EDGE - LEFT_EDGE, h: 120, kind: 'floor' },
    ...ledges,
    { id: 'left-wall', x: 0, y: -400, w: LEFT_EDGE, h: 5000, kind: 'wall' },
    { id: 'right-wall', x: RIGHT_EDGE, y: -400, w: WIDTH - RIGHT_EDGE, h: 5000, kind: 'wall' },
    // Solid ribs narrow selected crossings, then release into the open shaft.
    // Their faces support the same wall kicks; thorn patches remain exposed.
    ...ribs,
  ];
}

export function createGame() {
  const player = {
    x: 96, y: 4452, w: 24, h: 28, vx: 0, vy: 0,
    grounded: true, wallDir: 0, airJumps: 1, facing: 1, motion: 'idle',
  };
  const game = {
    width: WIDTH, height: HEIGHT, viewportHeight: 740,
    player, platforms: createPlatforms(),
    // Thorn silhouettes live on the outer walls, clear of the generous main path.
    hazards: [
      { x: LEFT_EDGE, y: 3600, w: 15, h: 96, orientation: 'right' },
      { x: RIGHT_EDGE - 15, y: 3074, w: 15, h: 100, orientation: 'left' },
      { x: LEFT_EDGE, y: 2080, w: 15, h: 108, orientation: 'right' },
      { x: RIGHT_EDGE - 15, y: 1370, w: 15, h: 112, orientation: 'left' },
      { x: LEFT_EDGE, y: 654, w: 15, h: 100, orientation: 'right' },
      { x: RIGHT_EDGE - 46, y: 4461, w: 40, h: 19, orientation: 'up' },
    ],
    checkpoint: { x: 190, y: 2382, w: 40, h: 66, active: false },
    goal: { x: 174, y: 146, w: 72, h: 94 },
    cameraY: HEIGHT - 740,
    time: 0, elapsed: 0, deaths: 0, maxAltitude: 0,
    state: 'ready', events: [], respawnTimer: 0,
    sections: [
      { name: 'THE CINDERS', y: 4480 },
      { name: 'HOLLOW BELLS', y: 3000 },
      { name: 'THE LAST LIGHT', y: 1500 },
    ],
    resize, start, restart, step,
    drainEvents() { return game.events.splice(0); },
  };
  let coyote = TUNING.coyoteTime;
  let jumpBuffer = 0;
  let wallCoyote = 0;
  let lastWall = 0;
  let wallLock = 0;
  let jumpAge = 1;
  let jumpCut = false;
  let spawnX = 96;
  let spawnY = 4452;
  let support = null;

  function emit(type, intensity = 1, x = player.x + player.w / 2, y = player.y + player.h) {
    game.events.push({ type, x, y, vx: player.vx, vy: player.vy, intensity });
  }

  function resize(height) {
    if (!Number.isFinite(height) || height <= 0) return;
    game.viewportHeight = height;
    followCamera(0, true);
  }

  function start() {
    if (game.state === 'ready') game.state = 'playing';
  }

  function resetPlayer() {
    support = null;
    Object.assign(player, {
      x: spawnX, y: spawnY, vx: 0, vy: 0, grounded: true,
      wallDir: 0, airJumps: 1, facing: 1, motion: 'idle',
    });
    coyote = TUNING.coyoteTime;
    jumpBuffer = wallCoyote = lastWall = wallLock = 0;
    jumpAge = 1;
    jumpCut = false;
    game.respawnTimer = 0;
    followCamera(0, true);
  }

  function restart() {
    spawnX = 96;
    spawnY = 4452;
    game.checkpoint.active = false;
    game.time = game.elapsed = game.deaths = game.maxAltitude = 0;
    game.events.length = 0;
    game.state = 'playing';
    for (const platform of game.platforms) {
      const s = platform.suspension;
      if (!s) continue;
      s.x = s.y = s.vx = s.vy = 0;
      platform.x = s.homeX;
      platform.y = s.homeY;
    }
    resetPlayer();
  }

  function updateSuspension(dt) {
    // Advance once per authoritative step, before movement. A rider inherits
    // displacement, never spring velocity: jump height and input stay authored.
    if (!player.grounded || !support || Math.abs(player.y + player.h - support.y) > .7
      || player.x + player.w <= support.x || player.x >= support.x + support.w) support = null;
    for (const platform of game.platforms) {
      const s = platform.suspension;
      if (!s) continue;
      const loaded = support === platform;
      const targetX = loaded ? clamp((player.x + player.w / 2 - platform.x - platform.w / 2) / platform.w, -.5, .5) * 1.6 : 0;
      const oldX = platform.x, oldY = platform.y;
      s.vx += ((targetX - s.x) * 62 - s.vx * 5.8) * dt;
      s.vy += (((loaded ? 3.1 : 0) - s.y) * 102 - s.vy * 7.2) * dt;
      s.x = clamp(s.x + s.vx * dt, -3.5, 3.5);
      s.y = clamp(s.y + s.vy * dt, -3, 8);
      if (Math.abs(s.x) === 3.5 && s.x * s.vx > 0) s.vx = 0;
      if ((s.y === 8 && s.vy > 0) || (s.y === -3 && s.vy < 0)) s.vy = 0;
      platform.x = s.homeX + s.x;
      platform.y = s.homeY + s.y;
      if (loaded) {
        player.x += platform.x - oldX;
        player.y += platform.y - oldY;
      }
    }
  }

  function touchingWall() {
    for (const platform of game.platforms) {
      if (!solid(platform) || player.y + player.h - 3 <= platform.y || player.y + 3 >= platform.y + platform.h) continue;
      if (Math.abs(player.x - platform.x - platform.w) <= 1.5) return -1;
      if (Math.abs(player.x + player.w - platform.x) <= 1.5) return 1;
    }
    return 0;
  }

  // Priority is ground/coyote → wall → one air jump. A successful action consumes
  // the press, including its buffer, before any later collision can use it again.
  // Ground restores the air charge; wall contact and wall kicks never restore it.
  function resolveJump() {
    if (jumpBuffer <= 0) return false;
    let type;
    if (player.grounded || coyote > 0) {
      player.vy = -JUMP_SPEED;
      type = 'jump';
    } else if (wallCoyote > 0 && lastWall) {
      player.vx = -lastWall * TUNING.wallJumpSpeed;
      player.vy = -TUNING.wallJumpLift;
      player.facing = -lastWall;
      wallLock = TUNING.wallControlLock;
      type = 'wallJump';
    } else if (player.airJumps > 0) {
      player.airJumps -= 1;
      player.vy = -TUNING.airJumpSpeed;
      type = 'doubleJump';
    } else {
      return false;
    }
    coyote = jumpBuffer = wallCoyote = 0;
    lastWall = 0;
    jumpAge = 0;
    jumpCut = false;
    player.grounded = false;
    if (support?.suspension) {
      support.suspension.vy -= 14;
      support.suspension.vx -= player.vx * .023;
    }
    support = null;
    player.wallDir = 0;
    player.motion = type === 'wallJump' ? 'wallJump' : 'rise';
    emit(type, type === 'doubleJump' ? 0.9 : 1);
    return true;
  }

  function moveX(dx) {
    let x = player.x + dx;
    for (const platform of game.platforms) {
      if (!solid(platform) || player.y + player.h <= platform.y + 0.01 || player.y >= platform.y + platform.h - 0.01) continue;
      if (dx > 0 && player.x + player.w <= platform.x + 0.01 && x + player.w > platform.x) {
        x = Math.min(x, platform.x - player.w);
        player.vx = 0;
      } else if (dx < 0 && player.x >= platform.x + platform.w - 0.01 && x < platform.x + platform.w) {
        x = Math.max(x, platform.x + platform.w);
        player.vx = 0;
      }
    }
    player.x = x;
  }

  function canOccupy(x, y) {
    if (x < LEFT_EDGE || x + player.w > RIGHT_EDGE) return false;
    const box = { x, y, w: player.w, h: player.h };
    return !game.platforms.some(platform => solid(platform) && overlaps(box, platform));
  }

  function moveY(dy, wasGrounded) {
    let y = player.y + dy;
    let landing = null;
    const impact = player.vy;
    player.grounded = false;
    for (const platform of game.platforms) {
      if (player.x + player.w <= platform.x || player.x >= platform.x + platform.w) continue;
      if (dy >= 0 && player.y + player.h <= platform.y + 0.6 && y + player.h >= platform.y) {
        y = platform.y - player.h;
        landing = platform;
      } else if (dy < 0 && solid(platform) && player.y >= platform.y + platform.h - 0.01 && y < platform.y + platform.h) {
        let corrected = false;
        const direction = Math.sign(player.vx) || player.facing;
        for (let amount = 1; amount <= TUNING.cornerCorrection && !corrected; amount++) {
          for (const sign of [direction, -direction]) {
            if (canOccupy(player.x + amount * sign, y)) {
              player.x += amount * sign;
              corrected = true;
              break;
            }
          }
        }
        if (!corrected) {
          y = platform.y + platform.h;
          player.vy = 0;
        }
      }
    }
    player.y = y;
    support = landing;
    if (landing) {
      player.vy = 0;
      player.grounded = true;
      player.airJumps = 1;
      coyote = TUNING.coyoteTime;
      wallLock = 0;
      if (!wasGrounded) {
        const intensity = clamp(impact / 730, 0.18, 1.25);
        if (landing.suspension) {
          landing.suspension.vy += 58 * intensity;
          landing.suspension.vx += player.vx * .058;
        }
        emit('land', intensity);
        game.events.at(-1).platformId = landing.id;
        game.events.at(-1).suspended = Boolean(landing.suspension);
      }
      if (landing.kind === 'checkpoint') activateCheckpoint();
    }
  }

  function activateCheckpoint() {
    if (game.checkpoint.active) return;
    game.checkpoint.active = true;
    spawnX = 198;
    spawnY = 2420;
    emit('checkpoint', 1, game.checkpoint.x + game.checkpoint.w / 2, game.checkpoint.y + game.checkpoint.h / 2);
  }

  function die(hazard = null) {
    emit('death', 1);
    // Preserve the cause before the fast retry moves the camera elsewhere.
    // Presentation can point to the exact lethal object instead of a generic pop.
    Object.assign(game.events.at(-1), {
      cause: hazard ? 'thorns' : 'fall',
      hazardIndex: hazard ? game.hazards.indexOf(hazard) : -1,
      contactX: hazard ? clamp(player.x + player.w / 2, hazard.x, hazard.x + hazard.w) : player.x + player.w / 2,
      contactY: hazard ? clamp(player.y + player.h / 2, hazard.y, hazard.y + hazard.h) : player.y + player.h,
    });
    game.deaths += 1;
    game.respawnTimer = TUNING.respawnDelay;
    jumpBuffer = coyote = wallCoyote = wallLock = 0;
    player.vx = player.vy = 0;
    player.grounded = false;
    player.wallDir = 0;
    player.motion = 'dead';
  }

  function followCamera(dt, snap = false) {
    const view = game.viewportHeight;
    const maxY = Math.max(0, HEIGHT - view);
    // Keep more of the next climb in view; rapidly catch a fall instead of leaving
    // the character below the screen. Smoothing never takes the hero offscreen.
    const target = clamp(player.y + player.h * 0.5 - view * 0.64, 0, maxY);
    game.cameraY = snap ? target : game.cameraY + (target - game.cameraY) * (1 - Math.exp(-8 * dt));
    game.cameraY = clamp(game.cameraY, player.y + player.h - view * 0.84, player.y - view * 0.17);
    game.cameraY = clamp(game.cameraY, 0, maxY);
  }

  function tick(dt, input) {
    game.time += dt;
    if (game.state !== 'playing') return;
    game.elapsed += dt;
    updateSuspension(dt);
    jumpBuffer = input.jumpPressed ? TUNING.jumpBuffer : Math.max(0, jumpBuffer - dt);
    if (game.respawnTimer > 0) {
      game.respawnTimer = Math.max(0, game.respawnTimer - dt);
      if (game.respawnTimer === 0) {
        // The shell consumes press edges during death too. Keep only the still-live
        // retry buffer across reset, then announce the return before its jump.
        const bufferedRetry = jumpBuffer;
        resetPlayer();
        jumpBuffer = bufferedRetry;
        emit('respawn', 0.7);
        resolveJump();
      }
      return;
    }

    const axis = clamp(Number(input.axis) || 0, -1, 1);
    const held = !!input.jumpHeld || !!input.jumpPressed;
    const wasGrounded = player.grounded;
    coyote = wasGrounded ? TUNING.coyoteTime : Math.max(0, coyote - dt);
    wallCoyote = Math.max(0, wallCoyote - dt);
    wallLock = Math.max(0, wallLock - dt);
    player.wallDir = touchingWall();
    if (player.wallDir && !wasGrounded) {
      lastWall = player.wallDir;
      wallCoyote = TUNING.wallCoyote;
    }

    const control = wallLock > 0 ? 0.12 : 1;
    const targetVx = axis * TUNING.speed;
    const turning = axis && Math.sign(axis) !== Math.sign(player.vx);
    const acceleration = axis
      ? (wasGrounded ? TUNING.groundAcceleration : TUNING.airAcceleration) * (turning ? 1.3 : 1)
      : wasGrounded ? TUNING.groundBrake : TUNING.airBrake;
    player.vx = approach(player.vx, targetVx, acceleration * control * dt);
    if (axis && !wallLock) player.facing = Math.sign(axis);
    resolveJump();

    jumpAge += dt;
    if (!held && !jumpCut && jumpAge >= 0.04 && player.vy < -TUNING.shortJumpSpeed) {
      player.vy = -TUNING.shortJumpSpeed;
      jumpCut = true;
    }
    const apex = held && Math.abs(player.vy) < 65;
    const gravity = GRAVITY * (apex ? 0.52 : player.vy > 0 ? TUNING.fallGravity : 1);
    player.vy = Math.min(player.vy + gravity * dt, TUNING.fallSpeed);
    const sliding = player.wallDir && axis === player.wallDir && player.vy > 0 && !player.grounded;
    if (sliding) player.vy = Math.min(player.vy, TUNING.wallSlideSpeed);

    moveX(player.vx * dt);
    moveY(player.vy * dt, wasGrounded);
    player.wallDir = player.grounded ? 0 : touchingWall();
    // Landing can resolve a buffered, already-released tap on this very step.
    if (player.grounded) resolveJump();
    player.motion = player.grounded ? Math.abs(player.vx) > 8 ? 'run' : 'idle'
      : wallLock > 0 ? 'wallJump' : player.wallDir && player.vy > 0 && axis === player.wallDir ? 'wallSlide'
        : player.vy < 0 ? 'rise' : 'fall';

    // Use the inner body against thorn boxes: illustrated tips get a little grace.
    const hurtbox = { x: player.x + 4, y: player.y + 3, w: player.w - 8, h: player.h - 5 };
    const lethalContact = game.hazards.find(hazard => overlaps(hurtbox, hazard));
    if (lethalContact || player.y > HEIGHT + 80) {
      die(lethalContact);
      return;
    }
    if (!game.checkpoint.active && player.y + player.h <= game.checkpoint.y + game.checkpoint.h + 1 && overlaps(player, game.checkpoint)) activateCheckpoint();
    game.maxAltitude = Math.max(game.maxAltitude, 4480 - player.y - player.h);
    if (player.grounded && overlaps(player, game.goal)) {
      game.state = 'won';
      player.vx = player.vy = 0;
      emit('win', 1.4, game.goal.x + game.goal.w / 2, game.goal.y + game.goal.h / 2);
    }
    followCamera(dt);
  }

  function step(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    let remaining = dt;
    let first = true;
    while (remaining > 1e-9) {
      const duration = Math.min(FIXED_STEP, remaining);
      tick(duration, first ? input : { axis: input.axis, jumpHeld: input.jumpHeld, jumpPressed: false });
      remaining -= duration;
      first = false;
    }
  }

  return game;
}
