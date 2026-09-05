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
    Object.assign(g.player, { x: 210, y: 2000, vy: -500, grounded: false });
    for (let i = 0; i < 250; i++) {
      tick(g, { ...neutral, jumpHeld: true });
      const bottom = g.player.y + g.player.h - g.cameraY;
      assert.ok(g.cameraY >= 0 && g.cameraY <= g.height - height);
      assert.ok(bottom > 0 && bottom < height, `hero stays visible in ${height}px viewport`);
    }
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
  assert.equal(a.elapsed, b.elapsed);
});

function playCourse({ demonstrateWallKick = false } = {}) {
  const g = createGame();
  g.resize(620);
  g.start();
  const route = g.platforms.filter(p => !['wall', 'floor'].includes(p.kind));
  const landings = new Set();
  let target = 0;
  let age = 0;
  let dwell = 0;
  let buttonHeld = false;
  let actions = 0;
  let wallKicks = 0;
  let airChargeAfterWallKick;
  for (let i = 0; i < 120 * 45 && g.state === 'playing'; i++) {
    const p = g.player;
    if (p.grounded) {
      while (target < route.length - 1 && p.y + p.h <= route[target].y + 1) target++;
      dwell++;
    } else dwell = 0;
    const distance = route[target].x + route[target].w / 2 - p.x - p.w / 2;
    let axis = Math.abs(distance) < Math.max(3, p.vx * p.vx / (2 * 1900)) ? 0 : Math.sign(distance);
    let wantsJump = (p.grounded && dwell > 15) || (!p.grounded && p.airJumps > 0 && age > 0.30 && p.vy > -160);
    if (demonstrateWallKick && target === 3) {
      // Reach ledge 3 through ordinary play, then jump toward its right-hand wall
      // and kick across to ledge 4. This optional route needs no air jump at all.
      if (!wallKicks) {
        axis = 1;
        wantsJump = (p.grounded && dwell > 15) || (!p.grounded && p.wallDir === 1);
      } else wantsJump = false;
    }
    let jumpPressed = false;
    if (wantsJump) {
      // A held button must first be physically released before another press.
      if (buttonHeld) buttonHeld = false;
      else { jumpPressed = true; buttonHeld = true; }
    }
    age = jumpPressed ? 0 : age + DT;
    for (const event of tick(g, { axis, jumpPressed, jumpHeld: buttonHeld })) {
      if (actionTypes.has(event.type)) actions++;
      if (event.type === 'wallJump') {
        wallKicks++;
        airChargeAfterWallKick = p.airJumps;
      }
      if (event.type === 'land') {
        const platform = route.find(platform => Math.abs(platform.y - p.y - p.h) < 0.1);
        if (platform) landings.add(platform.id);
      }
    }
  }
  assert.equal(g.state, 'won');
  assert.equal(g.deaths, 0);
  assert.equal(g.checkpoint.active, true);
  assert.equal(g.player.grounded, true, 'winning means standing at the summit');
  assert.equal(landings.size, route.length, 'every authored ledge was actually landed on');
  assert.ok(g.elapsed >= 30 && g.elapsed <= 45, `completion time ${g.elapsed.toFixed(2)}s`);
  console.log(`${demonstrateWallKick ? 'Wall-kick route' : 'Route'} proof: ${g.elapsed.toFixed(2)}s, ${landings.size} authored landings, ${actions} jump actions, ${wallKicks} wall kicks, ${g.deaths} deaths, checkpoint active, grounded summit.`);
  return { wallKicks, airChargeAfterWallKick };
}

test('the authored route is completed using only real press/release edges and digital steering', () => {
  playCourse();
});

test('the same full climb supports an optional early wall kick without spending the air jump', () => {
  const proof = playCourse({ demonstrateWallKick: true });
  assert.equal(proof.wallKicks, 1);
  assert.equal(proof.airChargeAfterWallKick, 1);
});
