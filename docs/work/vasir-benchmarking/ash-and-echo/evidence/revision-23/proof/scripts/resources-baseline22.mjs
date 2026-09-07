import { chromium } from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const out = 'tmp/ash-and-echo/finishing-pass/resources-baseline22'; await fs.mkdir(out, { recursive: true });
const receipt = { method: 'Actual keyboard double jump and pause; controlled scenery sweeps for allocations; forced loss/restoration of the real offscreen character context. Counters and pixels qualify lifecycle, not timing or physical-phone performance.', source: {}, errors: [], failures: [] };
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const jobs = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
  page.on('pageerror', e => receipt.errors.push(String(e)));
  page.on('response', r => { const n = new URL(r.url()).pathname.slice(1); if (/^[\w-]+\.js$/.test(n)) jobs.push(r.body().then(body => { receipt.source[n] = createHash('sha256').update(body).digest('hex'); })); });
  await page.addInitScript(() => {
    window.__resourceAudit = { canvases: 0, contexts: [], uploads: 0, subUploads: 0, textures: 0, programs: 0, buffers: 0, targets: 0, draws: 0, readbacks: 0 };
    const oldCreate = document.createElement;
    document.createElement = function (name, ...args) { if (name === 'canvas') window.__resourceAudit.canvases++; return oldCreate.call(this, name, ...args); };
    const oldContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      const gl = oldContext.call(this, type, ...args);
      if (gl && (type === 'webgl' || type === 'experimental-webgl') && !window.__resourceAudit.contexts.includes(gl)) window.__resourceAudit.contexts.push(gl);
      return gl;
    };
    for (const [name, counter] of Object.entries({ texImage2D: 'uploads', texSubImage2D: 'subUploads', createTexture: 'textures', createProgram: 'programs', createBuffer: 'buffers', createFramebuffer: 'targets', drawArrays: 'draws', readPixels: 'readbacks' })) {
      const old = WebGLRenderingContext.prototype[name];
      WebGLRenderingContext.prototype[name] = function (...args) { window.__resourceAudit[counter]++; return old.apply(this, args); };
    }
    window.__resourceSnapshot = () => {
      const { contexts, ...counts } = window.__resourceAudit;
      return { ...counts, contexts: contexts.length, owners: contexts.map(gl => ({ id: gl.canvas.id || 'character-field', width: gl.canvas.width, height: gl.canvas.height })), material: window.__echo.renderer.sceneryState.characterMaterial };
    };
  });
  await page.route('**/*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1) || 'index.html';
    if (/\.(js|css|html)$/.test(name)) return route.fulfill({body:await fs.readFile('tmp/ash-and-echo/finishing-pass/baseline22/'+name),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});
    return route.continue();
  });
  await page.goto('http://127.0.0.1:8317/?v=23-resource');
  await page.waitForFunction(() => window.__echo && !document.querySelector('#start-button').disabled);
  await page.locator('#start-button').click();
  await page.keyboard.press('Escape'); await page.waitForFunction(() => window.__echo.snapshot().paused);
  const sweep = () => page.evaluate(() => {
    const { game, renderer } = window.__echo, oldCamera = game.cameraY;
    for (let sweep = 0; sweep < 2; sweep++) for (let y = 0; y < 4600; y += 150) { game.cameraY = y; renderer.render(game, 0); }
    game.cameraY = oldCamera; renderer.render(game, 0); return window.__resourceSnapshot();
  });
  receipt.warm = await sweep(); receipt.plateau = await sweep();
  for (const key of ['canvases', 'contexts', 'uploads', 'subUploads', 'textures', 'programs', 'buffers', 'targets', 'readbacks']) if (receipt.warm[key] !== receipt.plateau[key]) receipt.failures.push('Resource growth: ' + key);
  if (receipt.plateau.contexts !== 2 || receipt.plateau.programs !== 2 || receipt.plateau.targets || receipt.plateau.readbacks || receipt.plateau.material.status !== 'ready') receipt.failures.push('Unexpected final render topology');
  await page.locator('#resume-button').click();
  await page.keyboard.down('Space'); await page.waitForTimeout(100); await page.keyboard.up('Space'); await page.waitForTimeout(60); await page.keyboard.down('Space');
  await page.waitForFunction(() => window.__echo.game.player.airJumps === 0);
  await page.waitForTimeout(100); await page.keyboard.press('Escape'); await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__echo.snapshot().paused);
  receipt.activePause = await page.evaluate(() => ({ game: window.__echo.snapshot(), material: window.__echo.renderer.sceneryState.characterMaterial, events: window.__echo.eventLog.filter(e => ['jump', 'doubleJump', 'land'].includes(e.type)) }));
  await page.waitForTimeout(550);
  const before = await page.evaluate(() => document.querySelector('#game-canvas').toDataURL());
  await page.waitForTimeout(260); const after = await page.evaluate(() => document.querySelector('#game-canvas').toDataURL());
  receipt.pausePixelsIdentical = before === after;
  if (!receipt.pausePixelsIdentical || !receipt.activePause.events.some(e => e.type === 'doubleJump')) receipt.failures.push('Actual double-jump pause mismatch');
  receipt.restorations = [];
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.evaluate(() => { const gl = window.__resourceAudit.contexts.find(gl => !gl.canvas.id); window.__materialLoss = gl.getExtension('WEBGL_lose_context'); window.__materialLoss.loseContext(); });
    await page.waitForFunction(() => window.__echo.renderer.sceneryState.characterMaterial.status === 'context-lost');
    const lost = await page.evaluate(() => window.__resourceSnapshot());
    await page.waitForTimeout(100); await page.evaluate(() => window.__materialLoss.restoreContext());
    await page.waitForFunction(() => window.__echo.renderer.sceneryState.characterMaterial.status === 'ready');
    await page.waitForTimeout(100);
    const restored = await page.evaluate(() => window.__resourceSnapshot());
    const pixelsIdentical = before === await page.evaluate(() => document.querySelector('#game-canvas').toDataURL());
    receipt.restorations.push({ lost, restored, pixelsIdentical });
    if (!pixelsIdentical || restored.contexts !== 2 || restored.material.programs !== 1 || restored.material.buffers !== 1 || restored.material.textures || restored.material.framebuffers) receipt.failures.push('Material restore did not return to the same pixels/resources');
  }
  await page.locator('#motion-setting').check();
  await page.locator('#resume-button').click(); await page.waitForTimeout(35); await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  const gentleA = await page.evaluate(() => document.querySelector('#game-canvas').toDataURL());
  await page.waitForTimeout(200); const gentleB = await page.evaluate(() => document.querySelector('#game-canvas').toDataURL());
  receipt.gentlePausedPixelsIdentical = gentleA === gentleB;
  const beforeReset = await page.evaluate(() => window.__resourceSnapshot());
  await page.evaluate(() => { for (let i = 0; i < 12; i++) window.__echo.restart(); });
  await page.waitForTimeout(100); receipt.afterResets = await page.evaluate(() => window.__resourceSnapshot());
  for (const key of ['canvases', 'contexts', 'textures', 'programs', 'buffers', 'targets']) if (beforeReset[key] !== receipt.afterResets[key]) receipt.failures.push('Restart allocates: ' + key);
  if (!receipt.gentlePausedPixelsIdentical) receipt.failures.push('Gentle pause drift');
  await Promise.all(jobs);
} finally { await browser.close(); await fs.writeFile(out + '/receipt.json', JSON.stringify(receipt, null, 2)); }
console.log(JSON.stringify({ source: receipt.source, errors: receipt.errors, failures: receipt.failures, plateau: receipt.plateau, pause: receipt.pausePixelsIdentical, gentle: receipt.gentlePausedPixelsIdentical, restore: receipt.restorations?.map(c => c.pixelsIdentical) }));
if (receipt.errors.length || receipt.failures.length) process.exitCode = 1;
