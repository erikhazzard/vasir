import { createGame } from '../../../../site/ash-and-echo/game.js';
import { readFileSync, writeFileSync } from 'node:fs';
const { frames } = JSON.parse(readFileSync(new URL('./opening-route.json', import.meta.url)));
const report = [];
for (const height of [420, 620, 740, 1100]) {
  const game = createGame(); game.resize(height); game.start();
  let contact;
  for (const input of frames) {
    game.step(1 / 120, input);
    if (game.drainEvents().some(event => event.type === 'land' && event.platformId === 'resonant-stone')) {
      contact = { cameraY: game.cameraY, time: game.elapsed };
      break;
    }
  }
  if (!contact) throw Error('Opening inputs did not reach the stone');
  const stone = game.platforms.find(platform => platform.id === 'resonant-stone');
  const samples = [{ milliseconds: 0, cameraY: game.cameraY, stoneY: stone.y }];
  for (let frame = 1; frame <= 42; frame++) {
    game.step(1 / 120, { axis: 0, jumpHeld: false, jumpPressed: false });
    game.drainEvents();
    samples.push({ milliseconds: frame / 120 * 1000, cameraY: game.cameraY, stoneY: stone.y });
  }
  report.push({ height, contact, cameraDelta350ms: game.cameraY - contact.cameraY,
    maxCameraDisplacement: Math.max(...samples.map(sample => Math.abs(sample.cameraY - contact.cameraY))),
    peakStoneSag: Math.max(...samples.map(sample => sample.stoneY - stone.suspension.homeY)), samples });
}
writeFileSync(new URL(`./camera-${process.argv[2] || 'probe'}.json`, import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.map(({ samples, ...summary }) => summary), null, 2));
