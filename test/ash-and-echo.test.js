import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame } from '../site/ash-and-echo/game.js';

const DT = 1 / 120;
const neutral = { axis: 0, jumpPressed: false, jumpHeld: false };
const actionTypes = new Set(['jump', 'doubleJump', 'wallJump']);
const tick = (g, input = neutral) => { g.step(DT, input); return g.drainEvents(); };
function run(g, seconds, input = neutral) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) events.push(...tick(g, input));
  return events;
}
function fixture({ x = 198, floorX = 60, floorWidth = 300 } = {}) {
  const g = createGame();
  g.platforms.splice(0, g.platforms.length,
    { id: 'test-floor', x: floorX, y: 700, w: floorWidth, h: 100, kind: 'floor' },
    { id: 'test-left', x: 0, y: -400, w: 60, h: 1400, kind: 'wall' },
    { id: 'test-right', x: 360, y: -400, w: 60, h: 1400, kind: 'wall' });
  g.hazards.length = 0;
  Object.assign(g.player, { x, y: 672, vx: 0, vy: 0, grounded: true });
  g.start();
  tick(g);
  return g;
}
function launch(g) {
  return tick(g, { axis: 0, jumpPressed: true, jumpHeld: true });
}

test('ready waits for start; one press stays one action across a large fully simulated step', () => {
  const g = createGame();
  const y = g.player.y;
  g.step(1, { axis: 1, jumpPressed: true, jumpHeld: true });
  assert.equal(g.state, 'ready');
  assert.equal(g.player.y, y);
  assert.equal(g.elapsed, 0);
  g.start();
  g.step(0.7, { axis: 0, jumpPressed: true, jumpHeld: true });
  assert.ok(Math.abs(g.elapsed - 0.7) < 1e-10, 'no elapsed time is silently discarded');
  assert.deepEqual(g.drainEvents().filter(e => actionTypes.has(e.type)).map(e => e.type), ['jump']);
});

test('jump height varies with hold, and holding never auto-repeats', () => {
  function apex(hold) {
    const g = fixture();
    let top = g.player.y;
    const events = launch(g);
    for (let i = 0; i < 180; i++) {
      events.push(...tick(g, { ...neutral, jumpHeld: hold }));
      top = Math.min(top, g.player.y);
    }
    assert.deepEqual(events.filter(e => actionTypes.has(e.type)).map(e => e.type), ['jump']);
    assert.equal(g.player.grounded, true);
    return 672 - top;
  }
  const full = apex(true);
  const tap = apex(false);
  assert.ok(full > 150 && full < 180, `full jump ${full.toFixed(2)}px`);
  assert.ok(tap > 35 && tap < 85, `short jump ${tap.toFixed(2)}px`);
  assert.ok(full > tap * 2);
});

test('a late jump after walking off the ledge uses coyote time and preserves the air jump', () => {
  const g = fixture({ x: 124, floorX: 80, floorWidth: 80 });
  for (let i = 0; i < 100 && g.player.grounded; i++) tick(g, { ...neutral, axis: 1 });
  assert.equal(g.player.grounded, false);
  run(g, 0.10, { ...neutral, axis: 1 });
  const events = tick(g, { axis: 1, jumpPressed: true, jumpHeld: true });
  assert.deepEqual(events.filter(e => actionTypes.has(e.type)).map(e => e.type), ['jump']);
  assert.equal(g.player.airJumps, 1);
  assert.ok(g.player.vy < -700);
});

test('a press just before landing is buffered, consumed once, and launches immediately on landing', () => {
  const g = fixture();
  launch(g);
  tick(g);
  launch(g);
  assert.equal(g.player.airJumps, 0);
  Object.assign(g.player, { y: 636, vy: 420, grounded: false });
  const events = tick(g, { ...neutral, jumpPressed: true });
  events.push(...run(g, 0.13));
  assert.equal(events.filter(e => e.type === 'land').length, 1);
  assert.deepEqual(events.filter(e => actionTypes.has(e.type)).map(e => e.type), ['jump']);
  assert.ok(g.player.y < 672 && g.player.vy < 0);
  assert.equal(g.player.airJumps, 1);
});

test('wall slide limits the fall; wall kicks preserve both full and exhausted air resources', () => {
  const g = fixture({ x: 60 });
  launch(g);
  Object.assign(g.player, { x: 60, y: 400, vx: 0, vy: 700, grounded: false });
  tick(g, { ...neutral, axis: -1 });
  assert.equal(g.player.motion, 'wallSlide');
  assert.ok(g.player.vy <= 110);
  let events = tick(g, { axis: -1, jumpPressed: true, jumpHeld: true });
  assert.deepEqual(events.filter(e => actionTypes.has(e.type)).map(e => e.type), ['wallJump']);
  assert.equal(g.player.airJumps, 1);
  assert.ok(g.player.vx > 280);
  tick(g, { ...neutral, jumpHeld: false });
  events = launch(g);
  assert.deepEqual(events.filter(e => actionTypes.has(e.type)).map(e => e.type), ['doubleJump']);
  assert.equal(g.player.airJumps, 0);
  Object.assign(g.player, { x: 60, y: 350, vx: 0, vy: 80, grounded: false });
  tick(g, { ...neutral, axis: -1 });
  events = tick(g, { axis: -1, jumpPressed: true, jumpHeld: true });
  assert.equal(events.filter(e => e.type === 'wallJump').length, 1);
  assert.equal(g.player.airJumps, 0, 'wall kick must never refill the air jump');
  run(g, 0.05, { ...neutral, axis: 1 });
  events = launch(g);
  assert.equal(events.filter(e => actionTypes.has(e.type)).length, 0, 'the departed wall cannot supply repeated buffered kicks');
});

test('a shallow head corner is corrected, while a centered ceiling stops ascent', () => {
  function headCollision(x) {
    const g = fixture();
    g.platforms.push({ id: 'lintel', x: 208, y: 590, w: 100, h: 20, kind: 'wall' });
    launch(g);
    Object.assign(g.player, { x, y: 613, vx: 0, vy: -700, grounded: false });
    tick(g, { ...neutral, jumpHeld: true });
    return g.player;
  }
  const corner = headCollision(186);
  assert.ok(corner.x <= 184 && corner.y < 610 && corner.vy < 0);
  const centered = headCollision(220);
  assert.equal(centered.y, 610);
  assert.equal(centered.vy, 0);
});

test('checkpoint death returns safely in under 300ms; restart clears the entire attempt', () => {
  const g = createGame();
  g.start();
  Object.assign(g.player, { x: 198, y: 2414, vx: 0, vy: 150, grounded: false });
  let events = run(g, 0.10);
  assert.equal(g.checkpoint.active, true);
  assert.equal(events.filter(e => e.type === 'checkpoint').length, 1);
  assert.equal(g.player.y + g.player.h, 2448);
  Object.assign(g.player, { x: 61, y: 3630, vx: 0, vy: 0, grounded: false, airJumps: 0 });
  events = tick(g);
  assert.equal(events.filter(e => e.type === 'death').length, 1);
  assert.equal(g.deaths, 1);
  events = run(g, 0.30, { axis: 1, jumpPressed: false, jumpHeld: false });
  assert.equal(events.filter(e => e.type === 'respawn').length, 1);
  assert.ok(g.player.x >= 198 && g.player.x < 205);
  assert.equal(g.player.y, 2420);
  assert.equal(g.player.grounded, true);
  assert.equal(g.player.airJumps, 1);
  assert.equal(g.respawnTimer, 0);
  g.restart();
  assert.equal(g.state, 'playing');
  assert.equal(g.checkpoint.active, false);
  assert.equal(g.deaths, 0);
  assert.equal(g.elapsed, 0);
  assert.equal(g.maxAltitude, 0);
  assert.equal(g.player.x, 96);
  assert.equal(g.player.y, 4452);
  assert.deepEqual(g.drainEvents(), []);
});

test('a late retry press launches on respawn once, while stale held input expires', () => {
  for (const latePress of [true, false]) {
    const g = createGame();
    g.start();
    Object.assign(g.player, { x: 198, y: 2414, vx: 0, vy: 150, grounded: false });
    run(g, 0.10);
    assert.equal(g.checkpoint.active, true);
    Object.assign(g.player, { x: 61, y: 3630, vx: 0, vy: 0, grounded: false, airJumps: 0 });
    assert.equal(tick(g).filter(event => event.type === 'death').length, 1);
    if (latePress) run(g, 0.175); // Press with 85ms left in the 260ms return.
    const events = tick(g, { ...neutral, jumpPressed: true, jumpHeld: true });
    let returnEvents = [];
    for (let i = 0; i < 40 && g.respawnTimer > 0; i++) {
      const frameEvents = tick(g, { ...neutral, jumpHeld: true });
      events.push(...frameEvents);
      if (frameEvents.some(event => event.type === 'respawn')) returnEvents = frameEvents;
    }
    assert.equal(g.respawnTimer, 0);
    assert.deepEqual(returnEvents.map(event => event.type), latePress ? ['respawn', 'jump'] : ['respawn']);
    assert.equal(g.player.grounded, !latePress);
    assert.equal(g.player.airJumps, 1, 'the retry is a ground jump with its air charge intact');
    if (latePress) assert.ok(g.player.vy < -700, 'the buffered retry launches on the return tick');
    events.push(...run(g, 1.5, { ...neutral, jumpHeld: true }));
    assert.equal(events.filter(event => actionTypes.has(event.type)).length, latePress ? 1 : 0);
    assert.equal(g.player.grounded, true, 'holding through the next landing does not auto-repeat');
  }
});

test('camera follows ascent and falls at short and tall portrait sizes', () => {
  for (const height of [420, 740, 1100]) {
    const g = createGame();
    g.start();
    g.resize(height);
    g.hazards.length = 0;
    g.platforms.splice(0, g.platforms.length, ...g.platforms.filter(platform => ['floor', 'left-wall', 'right-wall'].includes(platform.id)));
    Object.assign(g.player, { x: 210, y: 2000, vy: -500, grounded: false });
    let highestCamera = g.cameraY;
    for (let i = 0; i < 420; i++) {
      tick(g, { ...neutral, jumpHeld: true });
      highestCamera = Math.min(highestCamera, g.cameraY);
      const bottom = g.player.y + g.player.h - g.cameraY;
      assert.ok(g.cameraY >= 0 && g.cameraY <= g.height - height);
      assert.ok(bottom > 0 && bottom < height, `hero stays visible in ${height}px viewport`);
    }
    assert.equal(g.player.grounded, true, 'the long fall actually reaches the floor');
    assert.ok(g.cameraY > highestCamera + 1500, 'the camera follows the complete fall');
  }
});

test('60Hz batches and 120Hz steps resolve to the same controller state', () => {
  const a = fixture();
  const b = fixture();
  for (let i = 0; i < 100; i++) {
    const input = { axis: i < 45 ? 1 : -1, jumpPressed: i === 0 || i === 22, jumpHeld: i < 65 };
    a.step(1 / 60, input);
    b.step(DT, input);
    b.step(DT, { ...input, jumpPressed: false });
  }
  assert.deepEqual(a.player, b.player);
  assert.equal(a.cameraY, b.cameraY);
  assert.equal(a.elapsed, b.elapsed);
});

function playOpening({ wallKick = true, earlyDouble = false, hopHold = .11 } = {}) {
  const g = createGame();
  g.resize(620);
  g.start();
  const targets = ['first-hop', 'second-hop', 'wall-transfer', 'resonant-stone', 'opening-refuge'];
  const events = [], inputs = [], peakRises = [0, 0];
  let stage = 0, stageAge = 0, jumpAge = 0, launchBottom = 4480;
  let buttonHeld = false, kicked = false, doubled = false, recovered = false;
  let wallSlideFrames = 0;
  for (let frame = 0; frame < 120 * 15 && stage < targets.length; frame++) {
    const p = g.player;
    const target = g.platforms.find(platform => platform.id === targets[stage]);
    const distance = target.x + target.w / 2 - p.x - p.w / 2;
    let axis = Math.abs(distance) < Math.max(3, p.vx * p.vx / (2 * 1900)) ? 0 : Math.sign(distance);
    let jumpPressed = false, jumpHeld = buttonHeld;
    if (stageAge < .35) { axis = 0; jumpHeld = false; }
    else if (p.grounded && jumpAge === 0) {
      jumpPressed = jumpHeld = true;
      launchBottom = p.y + p.h;
    }
    if (stage < 2 && jumpAge > hopHold) jumpHeld = false;
    if (stage === 2 && wallKick && !kicked) {
      axis = stageAge < .35 ? 0 : 1;
      if (!p.grounded && p.wallDir === 1 && p.vy > 0) {
        if (buttonHeld) jumpHeld = false;
        else { jumpPressed = jumpHeld = true; kicked = true; }
      }
    }
    const needsAirJump = stage === 3 || (stage === 2 && !wallKick);
    const airJumpDelay = stage === 3 && earlyDouble && !recovered ? .08 : .35;
    if (needsAirJump && !doubled && jumpAge > airJumpDelay) {
      if (buttonHeld) jumpHeld = false;
      else { jumpPressed = jumpHeld = true; doubled = true; }
    }
    const input = { axis, jumpPressed, jumpHeld };
    assert.ok(!jumpPressed || !buttonHeld, 'each press has a physical release before it');
    inputs.push(input);
    const frameEvents = tick(g, input);
    buttonHeld = jumpHeld;
    if (p.motion === 'wallSlide') wallSlideFrames++;
    if (stage < 2) peakRises[stage] = Math.max(peakRises[stage], launchBottom - p.y - p.h);
    let landed = false, landedRecovery = false;
    for (const event of frameEvents) {
      events.push({ ...event, phase: targets[stage], frame, seconds: g.elapsed, airJumps: p.airJumps });
      if (event.type === 'land' && event.platformId === target.id) landed = true;
      if (event.type === 'land' && event.platformId === 'crossing-recovery') landedRecovery = true;
    }
    if (landed || landedRecovery) {
      if (landed) stage++;
      else recovered = true;
      stageAge = jumpAge = 0;
      buttonHeld = doubled = false;
    } else {
      stageAge += DT;
      if (jumpPressed || jumpAge > 0) jumpAge += DT;
    }
  }
  assert.equal(stage, targets.length, 'real inputs reach the opening refuge');
  assert.equal(g.deaths, 0);
  assert.equal(g.checkpoint.active, false, 'the first refuge does not impersonate the later checkpoint');
  assert.equal(g.player.grounded, true);
  return { g, events, inputs, peakRises, wallSlideFrames, recovered };
}

test('the camera lets the suspended landing settle against a steady frame at short and tall portrait sizes', () => {
  const { inputs } = playOpening();
  for (const height of [420, 620, 740, 1100]) {
    const g = createGame();
    g.resize(height);
    g.start();
    let landed = false;
    for (const input of inputs) {
      if (tick(g, input).some(event => event.type === 'land' && event.platformId === 'resonant-stone')) {
        landed = true;
        break;
      }
    }
    assert.equal(landed, true, 'ordinary opening inputs reach the stone');
    const cameraAtContact = g.cameraY;
    const stone = g.platforms.find(platform => platform.id === 'resonant-stone');
    let peakSag = 0;
    for (let frame = 0; frame < 42; frame++) {
      tick(g);
      peakSag = Math.max(peakSag, stone.y - stone.suspension.homeY);
      assert.ok(Math.abs(g.cameraY - cameraAtContact) < 2, `camera masks the landing response at ${height}px: ${g.cameraY - cameraAtContact}px drift`);
      assert.ok(g.player.y - g.cameraY > height * .5, 'the next climb remains in view above the hero');
    }
    assert.ok(peakSag > 5, 'the physical landing response actually moves the stone');
    assert.equal(g.player.grounded, true);
  }
});

test('opening plays two low taps, a wall transfer, a delayed air crossing, and a simple refuge jump', () => {
  const proof = playOpening();
  const phaseActions = phase => proof.events.filter(event => event.phase === phase && actionTypes.has(event.type)).map(event => event.type);
  assert.deepEqual(phaseActions('first-hop'), ['jump']);
  assert.deepEqual(phaseActions('second-hop'), ['jump']);
  assert.deepEqual(phaseActions('wall-transfer'), ['jump', 'wallJump']);
  assert.deepEqual(phaseActions('resonant-stone'), ['jump', 'doubleJump']);
  assert.deepEqual(phaseActions('opening-refuge'), ['jump']);
  assert.equal(proof.events.find(event => event.type === 'wallJump').airJumps, 1);
  assert.ok(proof.wallSlideFrames > 0, 'the transfer actually catches and slides on the wall');
  assert.ok(proof.peakRises.every(rise => rise > 80 && rise < 115), `short-hop rises ${proof.peakRises}`);
  assert.ok(proof.g.elapsed < 7, 'efficient movement has no mandatory presentation wait');
  assert.deepEqual(proof.events.filter(event => event.type === 'land').map(event => event.platformId),
    ['first-hop', 'second-hop', 'wall-transfer', 'resonant-stone', 'opening-refuge']);
  const stone = proof.events.find(event => event.platformId === 'resonant-stone');
  assert.equal(stone.suspended, true);
  assert.ok(stone.intensity > .7, 'the committed arc produces a substantial impact');
  assert.equal(stone.landmark, 'resonant-stone');
  assert.deepEqual(stone.resonance, proof.g.platforms.find(platform => platform.id === 'resonant-stone').resonance);
  assert.equal(stone.contactY, stone.y);
  assert.ok(Math.abs(stone.contactOffset) <= 1);
  assert.equal(proof.events.find(event => event.phase === 'opening-refuge' && event.type === 'jump').landmark, 'resonant-stone');
});

test('holding the low hops remains viable and visibly raises their arcs', () => {
  const taps = playOpening();
  const held = playOpening({ hopHold: 2 });
  for (let index = 0; index < 2; index++) {
    assert.ok(held.peakRises[index] > taps.peakRises[index] + 40);
    assert.ok(held.peakRises[index] > 150 && held.peakRises[index] < 165);
  }
});

test('an early air jump misses the high stone, catches the lower shelf, and can recover through ordinary inputs', () => {
  const direct = playOpening();
  const recovery = playOpening({ earlyDouble: true });
  assert.equal(direct.recovered, false);
  assert.equal(recovery.recovered, true);
  const crossingLandings = recovery.events.filter(event => event.phase === 'resonant-stone' && event.type === 'land');
  assert.deepEqual(crossingLandings.map(event => event.platformId), ['crossing-recovery', 'resonant-stone']);
  assert.ok(crossingLandings.every(event => event.airJumps === 1), 'each real landing restores the ordinary air charge');
  assert.ok(recovery.g.elapsed > direct.g.elapsed + .5, 'recovery costs traversal time rather than a death or rule penalty');
});

function playCourse({ wallKick = true } = {}) {
  const proof = playOpening({ wallKick });
  const { g } = proof;
  const route = g.platforms.filter(platform => platform.route === 'ascent');
  const landings = new Set();
  let target = 0, age = 0, dwell = 0;
  let buttonHeld = false;
  for (let i = 0; i < 120 * 45 && g.state === 'playing'; i++) {
    const p = g.player;
    if (p.grounded) {
      while (target < route.length - 1 && p.y + p.h <= route[target].y + 1) target++;
      dwell++;
    } else dwell = 0;
    const distance = route[target].x + route[target].w / 2 - p.x - p.w / 2;
    const axis = Math.abs(distance) < Math.max(3, p.vx * p.vx / (2 * 1900)) ? 0 : Math.sign(distance);
    const wantsJump = (p.grounded && dwell > 15) || (!p.grounded && p.airJumps > 0 && age > .30 && p.vy > -160);
    let jumpPressed = false;
    if (wantsJump) {
      if (buttonHeld) buttonHeld = false;
      else { jumpPressed = true; buttonHeld = true; }
    }
    age = jumpPressed ? 0 : age + DT;
    for (const event of tick(g, { axis, jumpPressed, jumpHeld: buttonHeld })) {
      if (event.type === 'land' && route.some(platform => platform.id === event.platformId)) landings.add(event.platformId);
    }
  }
  assert.equal(g.state, 'won');
  assert.equal(g.deaths, 0);
  assert.equal(g.checkpoint.active, true);
  assert.equal(g.player.grounded, true, 'winning means standing at the summit');
  assert.equal(landings.size, route.length, 'every later authored ledge was actually landed on');
  assert.ok(g.elapsed >= 30 && g.elapsed <= 45, `completion time ${g.elapsed.toFixed(2)}s`);
  console.log(`${wallKick ? 'Wall-kick' : 'Air-jump'} route proof: ${g.elapsed.toFixed(2)}s, ${landings.size + 5} main-route landings, no deaths, checkpoint active, grounded summit.`);
  return proof;
}

test('the opening wall-kick phrase joins the full climb through real inputs', () => {
  playCourse();
});

test('a direct air-jump alternative reaches the same transfer and summit without a mandatory wall kick', () => {
  const proof = playCourse({ wallKick: false });
  assert.equal(proof.events.filter(event => event.type === 'wallJump').length, 0);
  assert.deepEqual(proof.events.filter(event => event.phase === 'wall-transfer' && actionTypes.has(event.type)).map(event => event.type), ['jump', 'doubleJump']);
});

function hangingLanding() {
  const g = createGame();
  g.start();
  const ledge = g.platforms.find(p => p.id === 'resonant-stone');
  // Build the descent through gravity so this contact has both speed and fall
  // distance. Injecting terminal velocity three pixels up is no longer a fall.
  Object.assign(g.player, { x: ledge.x + 40, y: ledge.y - g.player.h - 300, vx: 0, vy: 0, grounded: false });
  for (let i = 0; i < 180 && ledge.y - g.player.y - g.player.h > 7.5; i++) tick(g);
  g.player.vx = 210;
  const events = tick(g, { ...neutral, axis: 1 });
  assert.equal(events.filter(e => e.type === 'land').length, 1);
  assert.equal(events.find(e => e.type === 'land').platformId, 'resonant-stone');
  assert.equal(events.find(e => e.type === 'land').suspended, true);
  return { g, ledge };
}

function dropFrom(height, { slide = false } = {}) {
  const g = fixture({ x: slide ? 60 : 198 });
  Object.assign(g.player, { y: 672 - height, vy: 0, grounded: false });
  return g;
}

function nextLanding(g, input = neutral) {
  for (let i = 0; i < 1600; i++) {
    const event = tick(g, input).find(e => e.type === 'land');
    if (event) return event;
  }
  assert.fail('the arranged drop must reach its receiving surface');
}

test('longer falls keep gaining landing weight after speed reaches its cap', () => {
  const drops = [24, 80, 160, 300, 650].map(height => {
    const g = dropFrom(height);
    const contact = nextLanding(g);
    assert.ok(Math.abs(contact.fallDistance - height) < .001);
    assert.ok(contact.impactSpeed > 0, 'effects receive speed before the collision stops the body');
    assert.equal(g.player.vy, 0);
    assert.ok(contact.landingSeverity >= 0 && contact.landingSeverity <= 1);
    assert.equal(run(g, .3).filter(e => e.type === 'land').length, 0, 'settling cannot repeat the impact');
    return contact;
  });
  assert.ok(drops[0].landingSeverity < .1, 'a small step has a quiet contact');
  assert.equal(drops[2].impactSpeed, drops[4].impactSpeed, 'both falls have reached terminal speed');
  assert.ok(drops[4].landingSeverity > drops[2].landingSeverity * 1.8, 'the long fall remains distinctly heavier');
  for (let i = 1; i < drops.length; i++) assert.ok(drops[i].landingSeverity > drops[i - 1].landingSeverity);
});

test('wall braking and a late air jump reduce landing weight instead of banking the earlier fall', () => {
  const sliding = nextLanding(dropFrom(650, { slide: true }), { ...neutral, axis: -1 });
  assert.ok(sliding.fallDistance > 600);
  assert.ok(sliding.impactSpeed <= 108 && sliding.landingSeverity < .1);
  const g = dropFrom(650);
  while (g.player.y + g.player.h < 650) tick(g);
  assert.equal(launch(g).find(e => actionTypes.has(e.type))?.type, 'doubleJump');
  const interrupted = nextLanding(g, { ...neutral, jumpHeld: true });
  assert.ok(interrupted.fallDistance < 220, 'only descent from the new apex reaches the effects');
  assert.ok(interrupted.landingSeverity < .6);
});

test('restart clears descent history before the next short contact', () => {
  const g = dropFrom(650);
  run(g, .1);
  g.restart();
  Object.assign(g.player, { x: 198, y: 648, vy: 0, grounded: false });
  const contact = nextLanding(g);
  assert.equal(contact.fallDistance, 24);
  assert.ok(contact.landingSeverity < .1);
});

test('a hanging stone takes weight and carries planted feet without repeated landing or changing the jump impulse', () => {
  const { g, ledge } = hangingLanding();
  g.player.vx = 0;
  let peakSag = 0, peakSlide = 0, reboundSag = Infinity;
  for (let i = 0; i < 180; i++) {
    const riderX = g.player.x, stoneX = ledge.x;
    const events = tick(g);
    peakSag = Math.max(peakSag, ledge.y - ledge.suspension.homeY);
    peakSlide = Math.max(peakSlide, Math.abs(ledge.x - ledge.suspension.homeX));
    if (i > 35 && i < 70) reboundSag = Math.min(reboundSag, ledge.suspension.y);
    assert.equal(g.player.grounded, true);
    assert.ok(Math.abs(g.player.y + g.player.h - ledge.y) < 1e-9, 'feet follow the actual stone surface');
    assert.ok(Math.abs((g.player.x - riderX) - (ledge.x - stoneX)) < 1e-9, 'the rider inherits sideways displacement');
    assert.equal(events.filter(e => e.type === 'land').length, 0, 'settling does not retrigger landing');
  }
  assert.ok(peakSag > 8 && peakSag <= 11, `visible, bounded loaded sag: ${peakSag}`);
  assert.ok(reboundSag < 3, `load visibly rebounds before settling: ${reboundSag}`);
  assert.ok(peakSlide > .7 && peakSlide <= 3.5, `visible, bounded lateral response: ${peakSlide}`);
  const control = fixture();
  const events = launch(g);
  launch(control);
  assert.equal(events.filter(e => e.type === 'jump').length, 1);
  assert.equal(g.player.vy, control.player.vy, 'the spring cannot boost or suppress the authored jump');
  assert.equal(g.player.airJumps, 1);
});

test('a swaying bell platform cannot carry its rider through the right wall, with or without movement input', () => {
  for (const axis of [1, 0]) {
    const g = createGame();
    g.start();
    const ledge = g.platforms.find(platform => platform.id === 'resonant-stone');
    const wall = g.platforms.find(platform => platform.kind === 'wall' && platform.x === 360);
    const boundary = wall.x - g.player.w;
    const stoneX = ledge.x;
    // Begin a legal landing on the authored bell ledge beside the outer wall.
    Object.assign(g.player, { x: boundary, y: ledge.y - g.player.h - .01, vx: 0, vy: 80, grounded: false });
    let furthestX = boundary, landings = 0;
    for (let i = 0; i < 120; i++) {
      landings += tick(g, { ...neutral, axis }).filter(event => event.type === 'land').length;
      furthestX = Math.max(furthestX, g.player.x);
    }
    assert.ok(furthestX <= boundary + 1e-9, `axis ${axis}: the rider reached ${furthestX}, past the wall at ${boundary}`);
    assert.ok(ledge.x > stoneX, 'the stone still sways toward the wall');
    assert.equal(g.player.grounded, true);
    assert.ok(Math.abs(g.player.y + g.player.h - ledge.y) < 1e-9, 'the wall does not interrupt vertical rider carry');
    assert.equal(landings, 1, 'settling against the wall remains one landing');
  }
});

test('suspended contacts remain identical in 60Hz batches and 120Hz steps, including an immediate jump', () => {
  const a = hangingLanding().g, b = hangingLanding().g;
  for (let i = 0; i < 150; i++) {
    const input = { axis: i < 8 ? 0 : -1, jumpPressed: i === 7 || i === 24, jumpHeld: i < 45 };
    a.step(1 / 60, input);
    b.step(DT, input);
    b.step(DT, { ...input, jumpPressed: false });
  }
  assert.deepEqual(a.player, b.player);
  assert.deepEqual(a.platforms, b.platforms);
  assert.deepEqual(a.drainEvents(), b.drainEvents());
});

test('unloaded hanging stones return to rest, zero time freezes them, and restart restores their authored positions', () => {
  const { g, ledge } = hangingLanding();
  run(g, .12);
  const frozen = JSON.stringify({ player: g.player, platforms: g.platforms });
  g.step(0, { axis: 1, jumpPressed: true, jumpHeld: true });
  assert.equal(JSON.stringify({ player: g.player, platforms: g.platforms }), frozen);
  Object.assign(g.player, { x: 96, y: 4452, vx: 0, vy: 0, grounded: true });
  run(g, 5);
  assert.ok(Math.abs(ledge.y - ledge.suspension.homeY) < .005);
  assert.ok(Math.abs(ledge.x - ledge.suspension.homeX) < .005);
  g.restart();
  for (const platform of g.platforms) {
    if (!platform.suspension) continue;
    assert.equal(platform.x, platform.suspension.homeX);
    assert.equal(platform.y, platform.suspension.homeY);
    assert.deepEqual([platform.suspension.x, platform.suspension.y, platform.suspension.vx, platform.suspension.vy], [0, 0, 0, 0]);
  }
  assert.equal(g.player.y + g.player.h, 4480);
  assert.deepEqual(g.drainEvents(), []);
});
