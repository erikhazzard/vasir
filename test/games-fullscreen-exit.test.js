import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyGamesFullscreenExitState } from '../site/vasirbenchmark.com/games-browsercheck.mjs';

const active = { fullscreen: false, runId: 'original-game', closePresent: true,
  mediaCount: 1, ownMediaCount: 1, closeDisabled: false, frameWhollyOutside: false,
  feedback: 'Game active. Click or tap inside to play.' };
const offscreen = { ...active, mediaCount: 0, ownMediaCount: 0, closeDisabled: true, frameWhollyOutside: true,
  feedback: 'Stopped while off screen. Activate again to restart.' };

test('fullscreen exit distinguishes an active game from the exact verified offscreen unload', () => {
  assert.equal(classifyGamesFullscreenExitState(active, 'original-game'), 'active');
  assert.equal(classifyGamesFullscreenExitState(offscreen, 'original-game'), 'offscreen-unloaded');
});

test('missing controls or unknown shutdown causes cannot pass as an offscreen unload', () => {
  assert.throws(() => classifyGamesFullscreenExitState({ ...offscreen, closePresent: false }, 'original-game'), /Stop control/);
  assert.throws(() => classifyGamesFullscreenExitState({ ...offscreen, feedback: 'Stopped while this tab was hidden.' }, 'original-game'), /exact offscreen-stop/);
  assert.throws(() => classifyGamesFullscreenExitState({ ...offscreen, frameWhollyOutside: false }, 'original-game'), /outside the viewport/);
  assert.throws(() => classifyGamesFullscreenExitState({ ...offscreen, closeDisabled: false }, 'original-game'));
});

test('wrong games, remaining media, and incomplete fullscreen exit are rejected', () => {
  assert.throws(() => classifyGamesFullscreenExitState({ ...offscreen, runId: 'different-game' }, 'original-game'), /same game card/);
  assert.throws(() => classifyGamesFullscreenExitState({ ...offscreen, mediaCount: 1 }, 'original-game'), /Unexpected media/);
  assert.throws(() => classifyGamesFullscreenExitState({ ...active, ownMediaCount: 0 }, 'original-game'), /Unexpected media/);
  assert.throws(() => classifyGamesFullscreenExitState({ ...active, fullscreen: true }, 'original-game'), /must have exited/);
});
