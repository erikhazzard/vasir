import { createGame } from './game.js';
import { createRenderer } from './renderer.js';
import { createAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const frame = $('game-frame');
const canvas = $('game-canvas');
const game = createGame();
const assets = {};
const renderer = createRenderer(canvas, assets);
const audio = createAudio();
const keys = new Set();
const pointers = new Map();
const controls = [...document.querySelectorAll('[data-control]')];
const eventLog = [];
const frameSamples = [];
let jumpEdges = 0;
let paused = false;
let started = false;
let muted = false;
let lastTime = 0;
let accumulator = 0;
let messageUntil = 0;
let messagePriority = 0;
let previousState = 'ready';
let uiClock = 0;
let firstWall = false;
let firstDouble = false;
let firstLand = false;
let testInput = null;
let finishedAt = 0;
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
$('motion-setting').checked = reduceQuery.matches;
renderer.setReducedMotion(reduceQuery.matches);
$('game-hud').inert = true;
$('touch-controls').inert = true;

function resize() {
  const { width, height } = frame.getBoundingClientRect();
  game.resize(height / width * game.width);
  renderer.resize(width, height, Math.min(devicePixelRatio || 1, 2));
}
new ResizeObserver(resize).observe(frame);
resize();

function showMessage(text, duration = 2600, priority = 1) {
  if (performance.now() < messageUntil && priority < messagePriority) return;
  $('game-message').textContent = text;
  $('game-message').classList.add('echo-game__message--visible');
  messageUntil = performance.now() + duration;
  messagePriority = priority;
}

function clearInput() {
  keys.clear(); pointers.clear(); jumpEdges = 0; testInput = null;
  controls.forEach((button) => button.removeAttribute('data-held'));
}

function begin() {
  if ($('start-button').disabled) return;
  audio.unlock(); audio.setMuted(muted);
  game.start(); started = true; paused = false;
  frame.classList.add('echo-game--playing');
  $('intro').inert = true;
  $('game-hud').inert = false;
  $('touch-controls').inert = false;
  canvas.focus({ preventScroll: true });
  showMessage('Hold jump to rise higher. Jump again in the air.', 5200);
}

function restart() {
  clearInput(); game.restart(); started = true; paused = false; finishedAt = 0;
  frame.classList.add('echo-game--playing');
  frame.classList.remove('echo-game--paused', 'echo-game--won');
  $('pause-panel').hidden = true; $('win-panel').hidden = true;
  $('intro').inert = true;
  $('game-hud').inert = false;
  $('touch-controls').inert = false;
  audio.unlock(); canvas.focus({ preventScroll: true });
  accumulator = 0;
}

function pause(value = !paused) {
  if (!started || game.state === 'won') return;
  paused = value; clearInput(); accumulator = 0;
  frame.classList.toggle('echo-game--paused', paused);
  $('pause-panel').hidden = !paused;
  $('game-hud').inert = paused;
  $('touch-controls').inert = paused;
  $('pause-button').setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
  if (paused) $('resume-button').focus({ preventScroll: true });
  else { audio.unlock(); canvas.focus({ preventScroll: true }); }
}

function setMuted(value) {
  muted = value; audio.setMuted(muted);
  $('sound-button').setAttribute('aria-pressed', String(muted));
  $('sound-button').setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound');
}

$('start-button').addEventListener('click', begin);
$('again-button').addEventListener('click', restart);
$('restart-button').addEventListener('click', restart);
$('resume-button').addEventListener('click', () => pause(false));
$('pause-button').addEventListener('click', () => pause());
$('sound-button').addEventListener('click', () => { audio.unlock(); setMuted(!muted); });
$('motion-setting').addEventListener('change', (event) => renderer.setReducedMotion(event.target.checked));

const moveKeys = new Set(['ArrowLeft','ArrowRight','KeyA','KeyD','Space','ArrowUp','KeyW']);
const jumpKeys = new Set(['Space','ArrowUp','KeyW']);
window.addEventListener('keydown', (event) => {
  const openPanel = !$('pause-panel').hidden ? $('pause-panel') : !$('win-panel').hidden ? $('win-panel') : null;
  if (openPanel && event.code === 'Tab') {
    const focusable = [...openPanel.querySelectorAll('button,input')];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    return;
  }
  if (event.code === 'Escape') { event.preventDefault(); pause(); return; }
  if (event.code === 'KeyM' && !event.repeat) { setMuted(!muted); return; }
  if (event.code === 'KeyR' && started && !event.repeat) { restart(); return; }
  if (!moveKeys.has(event.code)) return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (!started || paused || game.state === 'won') return;
  event.preventDefault();
  if (jumpKeys.has(event.code) && !keys.has(event.code) && !event.repeat) jumpEdges++;
  keys.add(event.code);
});
window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
  if (moveKeys.has(event.code) && started) event.preventDefault();
});

function updatePointerControl(event) {
  const record = pointers.get(event.pointerId);
  if (!record || record.control === 'jump') return;
  const steer = document.querySelector('.echo-controls__steer').getBoundingClientRect();
  const next = event.clientX < steer.left + steer.width / 2 ? 'left' : 'right';
  record.control = next;
}
for (const button of controls) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (!started || paused || game.state !== 'playing') return;
    button.setPointerCapture(event.pointerId);
    const control = button.dataset.control;
    pointers.set(event.pointerId, { control });
    if (control === 'jump') jumpEdges++;
    audio.unlock();
  });
  button.addEventListener('pointermove', updatePointerControl);
  const release = (event) => { pointers.delete(event.pointerId); button.removeAttribute('data-held'); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}
window.addEventListener('blur', () => { clearInput(); if (started && !paused && game.state === 'playing') pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (started && !paused) pause(true); } });

function getInput() {
  if (testInput) {
    const value = { ...testInput };
    testInput.jumpPressed = false;
    return value;
  }
  const active = new Set([...pointers.values()].map((record) => record.control));
  const left = keys.has('ArrowLeft') || keys.has('KeyA') || active.has('left');
  const right = keys.has('ArrowRight') || keys.has('KeyD') || active.has('right');
  const jumpHeld = [...jumpKeys].some((key) => keys.has(key)) || active.has('jump');
  const jumpPressed = jumpEdges > 0;
  if (jumpPressed) jumpEdges--;
  for (const button of controls) {
    const held = button.dataset.control === 'left' ? left : button.dataset.control === 'right' ? right : jumpHeld;
    button.toggleAttribute('data-held', held);
  }
  return { axis: Number(right) - Number(left), jumpHeld, jumpPressed };
}

function processEvents(events) {
  if (!events.length) return;
  renderer.emit(events); audio.emit(events);
  for (const event of events) {
    eventLog.push({ ...event, at: game.time, elapsed: game.elapsed });
    if (eventLog.length > 1500) eventLog.shift();
    if (event.type === 'wallJump' && !firstWall) { firstWall = true; showMessage('The walls give you something to push against.', 3200); }
    if (event.type === 'doubleJump') firstDouble = true;
    if (event.type === 'land') firstLand = true;
    if (event.type === 'checkpoint') showMessage('A quiet refuge. Your ascent is remembered.', 4000, 3);
    if (event.type === 'respawn') showMessage(game.checkpoint.active ? 'Back to the refuge. Keep rising.' : 'The dark catches you. Try again.', 2400, 2);
    if (event.type === 'win') finishedAt = performance.now();
  }
}

function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
}
function finish() {
  clearInput();
  frame.classList.add('echo-game--won');
  $('win-panel').hidden = false;
  $('game-hud').inert = true;
  $('touch-controls').inert = true;
  $('final-time').textContent = formatTime(game.elapsed);
  $('final-falls').textContent = String(game.deaths);
  let best = null;
  try {
    const previous = Number(localStorage.getItem('ash-and-echo-best')) || Infinity;
    best = Math.min(previous, game.elapsed);
    localStorage.setItem('ash-and-echo-best', String(best));
    $('best-time').textContent = game.elapsed <= previous ? 'YOUR QUICKEST ASCENT' : `BEST ASCENT ${formatTime(best)}`;
  } catch { $('best-time').textContent = ''; }
  $('again-button').focus({ preventScroll: true });
}

function tick(now) {
  const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 1/60;
  if (lastTime) { frameSamples.push(now - lastTime); if (frameSamples.length > 1800) frameSamples.shift(); }
  lastTime = now;
  if (!paused) {
    accumulator += dt;
    let count = 0;
    while (accumulator >= 1/120 && count++ < 7) {
      const input = game.state === 'playing' ? getInput() : { axis:0, jumpHeld:false, jumpPressed:false };
      game.input = input;
      game.step(1/120, input);
      processEvents(game.drainEvents());
      accumulator -= 1/120;
    }
    if (count >= 7) accumulator = 0;
  }
  renderer.render(game, paused ? 0 : dt);
  audio.update(game, paused ? 0 : dt);
  uiClock += dt;
  if (uiClock > .1) {
    uiClock = 0;
    const altitude = Math.max(0, game.maxAltitude || 0);
    $('height-value').textContent = String(Math.floor(altitude / 12));
    $('height-progress').style.height = `${Math.min(100, altitude / (game.height - 250) * 100)}%`;
    $('jump-charge').classList.toggle('echo-controls__charge--spent', game.player.airJumps < 1 && !game.player.grounded);
    $('chapter').textContent = altitude > 3200 ? 'THE BELFRY' : altitude > 1900 ? 'THE QUIET REFUGE' : altitude > 800 ? 'THE FORGOTTEN SPIRES' : 'THE HOLLOW';
  }
  if (now > messageUntil) $('game-message').classList.remove('echo-game__message--visible');
  if (game.state === 'won' && previousState !== 'won' && !finishedAt) finishedAt = now;
  if (finishedAt && now - finishedAt > 1400 && $('win-panel').hidden) finish();
  previousState = game.state;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

if (matchMedia('(pointer: coarse)').matches) $('intro-controls').innerHTML = 'Left thumb moves <span>·</span> Right thumb jumps<br><small>Jump again in the air. Hold to rise higher.</small>';

async function loadImage(key, required = true) {
  const image = new Image();
  image.src = `assets/${key}.png`;
  try { await image.decode(); assets[key] = image; }
  catch (error) { if (required) throw error; }
}
Promise.all([loadImage('background'),loadImage('stone'),loadImage('hero'),loadImage('midground',false),loadImage('spider',false),loadImage('corbel'),loadImage('shrine')]).then(() => {
  $('start-button').disabled = false; $('start-label').textContent = 'Begin the ascent';
}).catch(() => { $('load-error').hidden = false; });

// Read-only state and a bounded input seam for reproducible local play captures.
// No debug controls are included in the player's interface.
window.__echo = {
  game, assets, renderer, eventLog, frameSamples,
  begin, restart,
  setInput(value) { testInput = value ? { axis:0,jumpHeld:false,jumpPressed:false,...value } : null; },
  snapshot() { return { state:game.state, player:{...game.player}, cameraY:game.cameraY, elapsed:game.elapsed, deaths:game.deaths, maxAltitude:game.maxAltitude, checkpoint:{...game.checkpoint}, paused }; }
};
