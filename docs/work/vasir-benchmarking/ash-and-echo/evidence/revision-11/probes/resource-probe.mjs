import { chromium } from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';
const directory = new URL('./', import.meta.url);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [], warnings = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'warning' || message.type() === 'error') warnings.push(message.text()); });
try {
  await page.addInitScript(() => {
    window.__audit = { uploads: 0, subUploads: 0, textures: 0, buffers: 0, programs: 0, targets: 0, canvases: 0, draws: 0 };
    for (const [name, count] of Object.entries({ texImage2D: 'uploads', texSubImage2D: 'subUploads', createTexture: 'textures', createBuffer: 'buffers', createProgram: 'programs', createFramebuffer: 'targets', drawArrays: 'draws' })) {
      const original = WebGLRenderingContext.prototype[name];
      WebGLRenderingContext.prototype[name] = function(...args) { window.__audit[count]++; return original.apply(this, args); };
    }
    const create = document.createElement;
    document.createElement = function(name, ...args) { if (name === 'canvas') window.__audit.canvases++; return create.call(this, name, ...args); };
  });
  await page.goto('http://127.0.0.1:8317/');
  await page.waitForFunction(() => window.__echo && !document.querySelector('#start-button').disabled);
  await page.locator('#start-button').click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__echo.snapshot().paused);
  const warm = await page.evaluate(() => {
    const { game, renderer } = __echo;
    const original = game.cameraY;
    for (let sweep = 0; sweep < 2; sweep++) for (let camera = 0; camera < 4600; camera += 150) { game.cameraY = camera; renderer.render(game, 0); }
    game.cameraY = original; renderer.render(game, 0);
    return { counters: { ...__audit }, gpu: renderer.atmosphereStatus, scenery: renderer.sceneryState };
  });
  const plateau = await page.evaluate(() => {
    const { game, renderer } = __echo; const original = game.cameraY;
    for (let sweep = 0; sweep < 2; sweep++) for (let camera = 0; camera < 4600; camera += 150) { game.cameraY = camera; renderer.render(game, 0); }
    game.cameraY = original; renderer.render(game, 0);
    return { counters: { ...__audit }, gpu: renderer.atmosphereStatus, error: document.querySelector('#atmosphere-canvas').getContext('webgl').getError() };
  });
  await page.locator('#resume-button').click();
  await page.keyboard.down('Space');
  await page.waitForFunction(() => __echo.game.player.y < 4400);
  await page.keyboard.up('Space');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => __echo.snapshot().paused);
  const beforePause = await page.evaluate(() => ({ snapshot: __echo.snapshot(), scenery: __echo.renderer.sceneryState, counters: { ...__audit } }));
  await page.evaluate(() => new Promise(resolve => { let n = 0; const sample = () => ++n >= 20 ? resolve() : requestAnimationFrame(sample); requestAnimationFrame(sample); }));
  const afterPause = await page.evaluate(() => ({ snapshot: __echo.snapshot(), scenery: __echo.renderer.sceneryState, counters: { ...__audit } }));
  const extension = await page.evaluate(() => {
    const gl = document.querySelector('#atmosphere-canvas').getContext('webgl');
    window.__lose = gl.getExtension('WEBGL_lose_context'); __lose?.loseContext(); return Boolean(__lose);
  });
  let recovery = { extension };
  if (extension) {
    await page.waitForFunction(() => __echo.renderer.atmosphereStatus.backend === 'canvas2d');
    recovery.lost = await page.evaluate(() => ({ gpu: __echo.renderer.atmosphereStatus, hidden: document.querySelector('#atmosphere-canvas').hidden }));
    await page.evaluate(() => __lose.restoreContext());
    await page.waitForFunction(() => __echo.renderer.atmosphereStatus.backend === 'webgl' && !document.querySelector('#atmosphere-canvas').hidden);
    recovery.restored = await page.evaluate(() => ({ gpu: __echo.renderer.atmosphereStatus, error: document.querySelector('#atmosphere-canvas').getContext('webgl').getError() }));
  }
  await page.locator('#motion-setting').check();
  await page.locator('#resume-button').click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const gentle = await page.evaluate(() => {
    const gl = document.querySelector('#atmosphere-canvas').getContext('webgl'), program = gl.getParameter(gl.CURRENT_PROGRAM);
    return { time: gl.getUniform(program, gl.getUniformLocation(program, 'uTime')), jumpWarpUniformRemoved: gl.getUniformLocation(program, 'uWake') === null, error: gl.getError() };
  });
  await page.screenshot({ path: new URL('restored.png', directory).pathname });
  const receipt = { scenario: 'Chrome headless, 390x844 DPR2; manually swept render camera for bounded resources; actual keyboard jump then pause; forced context loss/restore; UI gentler effects. No timing claims.', warm, plateau, activeSceneryOnPause: beforePause.scenery, pauseFrozen: JSON.stringify(beforePause.snapshot) === JSON.stringify(afterPause.snapshot) && JSON.stringify(beforePause.scenery) === JSON.stringify(afterPause.scenery), pausedFrameUploads: afterPause.counters.uploads - beforePause.counters.uploads, recovery, gentle, errors, warnings };
  await writeFile(new URL('runtime-receipt.json', directory), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({warm:receipt.warm.counters,plateau:receipt.plateau.counters,pauseFrozen:receipt.pauseFrozen,recovery:receipt.recovery,gentle:receipt.gentle,errors:receipt.errors},null,2));
} finally { await browser.close(); }
