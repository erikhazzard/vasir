import { chromium } from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir = new URL('.', import.meta.url).pathname;
const report = { method: 'Synthetic presentation events; DOM inverse-corner coverage and composed motion only, not a real-fall or feel claim.', source: {}, cases: [], errors: [], failures: [] };
const jobs = [];
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', deviceScaleFactor: 1 });
  page.on('pageerror', e => report.errors.push(String(e)));
  page.on('response', r => { const name = new URL(r.url()).pathname.slice(1); if (/^[\w-]+\.js$/.test(name)) jobs.push(r.body().then(async body => { report.source[name] = createHash('sha256').update(body).digest('hex'); await fs.writeFile(dir + name, body); })); });
  await page.addInitScript(() => { window.requestAnimationFrame = cb => (window.__raf = cb, 1); window.cancelAnimationFrame = () => {}; });
  await page.goto('http://localhost:8317/?v=19-camera');
  await page.waitForFunction(() => window.__echo && !document.querySelector('#start-button').disabled, {}, { polling: 50 });
  await page.evaluate(() => {
    window.__echo.begin(); document.querySelector('#intro').style.display = 'none'; document.querySelector('#game-message').style.display = 'none';
    window.__cameraRead = () => {
      const frame = document.querySelector('#game-frame').getBoundingClientRect();
      const layers = ['game-canvas', 'atmosphere-canvas'].map(id => {
        const e = document.getElementById(id), style = getComputedStyle(e), m = new DOMMatrix(style.transform);
        const width = parseFloat(style.width), height = parseFloat(style.height);
        const origin = style.transformOrigin.split(' ').map(parseFloat);
        const center = { x: frame.left + e.offsetLeft + origin[0], y: frame.top + e.offsetTop + origin[1] };
        const inverse = m.inverse();
        const corners = [[frame.left, frame.top], [frame.right, frame.top], [frame.right, frame.bottom], [frame.left, frame.bottom]].map(([x, y]) => {
          const q = new DOMPoint(x - center.x, y - center.y).matrixTransform(inverse);
          const localX = q.x + origin[0], localY = q.y + origin[1];
          return { x: localX, y: localY, margin: Math.min(localX, width - localX, localY, height - localY) };
        });
        return { id, width, height, matrix: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }, corners };
      });
      return { camera: window.__echo.renderer.sceneryState.cameraImpact, layers, hud: document.querySelector('#game-hud').getBoundingClientRect().toJSON() };
    };
  });
  for (const [width, height] of [[320, 740], [390, 844], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => { const { game, renderer } = window.__echo, r = document.querySelector('#game-frame').getBoundingClientRect(); game.resize(r.height / r.width * 420); renderer.resize(r.width, r.height, 1); });
    for (const [fall, severity] of [[80, .19084354133763837], [160, .4242960416894798], [300, .6789178854784322], [508, 1]]) for (const side of [-1, 1]) {
      const result = await page.evaluate(({ severity, side }) => {
        const { game, renderer } = window.__echo; renderer.reset(); renderer.setReducedMotion(false);
        const slab = game.platforms.find(p => p.id === 'opening-refuge');
        Object.assign(game.player, { x: 200, y: slab.y - game.player.h, vx: 0, vy: 0, grounded: true, motion: 'idle' }); game.cameraY = slab.y - 440;
        renderer.render(game, 1 / 120); const before = window.__cameraRead();
        renderer.emit([{ type: 'land', x: 212, y: slab.y, contactX: 212, contactY: slab.y, vx: side * 258, intensity: 1.23, landingSeverity: severity, platformId: slab.id, suspended: false }]);
        const samples = []; for (let i = 0; i < 120; i++) { renderer.render(game, 1 / 120); samples.push(window.__cameraRead()); }
        return { before, samples };
      }, { severity, side });
      const s = result.samples, peak = s.reduce((a, b) => Math.hypot(a.camera.cssX, a.camera.cssY) > Math.hypot(b.camera.cssX, b.camera.cssY) ? a : b);
      const row = { width, height, fall, severity, side, samples: s.length, peak: peak.camera, last: s.at(-1).camera, minimumLocalMargin: Math.min(...s.flatMap(a => a.layers.flatMap(l => l.corners.map(c => c.margin)))) };
      report.cases.push(row);
      for (const [tick, state] of s.entries()) {
        const [a, b] = state.layers, c = state.camera;
        const sameLayers = JSON.stringify(a.matrix) === JSON.stringify(b.matrix);
        const matrixCorrect = Math.abs(a.matrix.e - c.cssX) < .001 && Math.abs(a.matrix.f - c.cssY) < .001 && Math.abs(a.matrix.a - c.scale * Math.cos(c.roll)) < .00001 && Math.abs(a.matrix.b - c.scale * Math.sin(c.roll)) < .00001 && Math.abs(a.matrix.c + c.scale * Math.sin(c.roll)) < .00001;
        const covered = state.layers.every(l => l.corners.every(p => p.margin >= -.03));
        const fixedHUD = JSON.stringify(state.hud) === JSON.stringify(result.before.hud);
        if (!sameLayers || !matrixCorrect || !covered || !fixedHUD) report.failures.push({ width, fall, side, tick, sameLayers, matrixCorrect, covered, fixedHUD });
      }
      if (Math.abs(row.last.roll) > 1e-8 || Math.hypot(row.last.x, row.last.y) > .01) report.failures.push({ width, fall, side, unsettled: row.last });
    }
    const states = await page.evaluate(() => {
      const { game, renderer } = window.__echo;
      const emit = () => { renderer.emit([{ type: 'land', x: 212, y: game.player.y + game.player.h, landingSeverity: 1, vx: 258, platformId: 'opening-refuge' }]); renderer.render(game, 1 / 120); };
      renderer.reset(); emit(); const before = window.__cameraRead(); for (let i = 0; i < 12; i++) renderer.render(game, 0); const paused = window.__cameraRead();
      renderer.setReducedMotion(true); renderer.render(game, 0); const gentle = window.__cameraRead();
      renderer.setReducedMotion(false); emit(); window.__echo.restart(); renderer.render(game, 0); const restart = window.__cameraRead();
      return { pauseIdentical: JSON.stringify(before) === JSON.stringify(paused), gentle: gentle.camera, restart: restart.camera };
    });
    report.cases.push({ width, states });
    if (!states.pauseIdentical || [states.gentle, states.restart].some(c => c.x || c.y || c.roll || c.slam)) report.failures.push({ width, states });
  }
  await Promise.all(jobs);
} finally { await browser.close(); await fs.writeFile(dir + 'report.json', JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ source: report.source, errors: report.errors, failures: report.failures, samples: report.cases.reduce((n, c) => n + (c.samples || 0), 0), minCornerMargin: Math.min(...report.cases.filter(c => c.samples).map(c => c.minimumLocalMargin)), native: report.cases.filter(c => c.width === 390) }));
if (report.errors.length || report.failures.length) process.exitCode = 1;
