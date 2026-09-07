import { chromium } from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const dir = 'tmp/ash-and-echo/morph-pass/masonry';
const report = { method: 'Arranged gameplay inspection, native CSS scale. Actual four collider ribs; identical camera and player state before/after. RAF disabled only for deterministic static inspection. Not a played route or feel proof.', errors: [], samples: [] };
const versions = {
  before: await fs.readFile('tmp/ash-and-echo/morph-pass/baseline/renderer.js', 'utf8'),
  after: await fs.readFile('site/ash-and-echo/renderer.js', 'utf8'),
};
const character = await fs.readFile('tmp/ash-and-echo/morph-pass/baseline/character.js', 'utf8');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  for (const [version, renderer] of Object.entries(versions)) {
    for (const [format, viewport] of Object.entries({ mobile: { width: 390, height: 844 }, desktop: { width: 1400, height: 1000 } })) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: format === 'mobile', hasTouch: format === 'mobile' });
      page.on('pageerror', e => report.errors.push(String(e)));
      await page.addInitScript(() => { window.requestAnimationFrame = () => 1; });
      const observedRenderer = renderer.replace('    get atmosphereStatus()', '    __wallCacheForProof: wallCache,\n    get atmosphereStatus()');
      await page.route('**/renderer.js', r => r.fulfill({ contentType: 'text/javascript', body: observedRenderer }));
      await page.route('**/character.js', r => r.fulfill({ contentType: 'text/javascript', body: character }));
      await page.goto('http://localhost:8317');
      await page.waitForFunction(() => window.__echo && !document.querySelector('#start-button').disabled, null, { polling: 100 });
      await page.evaluate(() => window.__echo.begin());
      for (const ribId of ['cinder-rib', 'hollow-rib', 'refuge-rib', 'belfry-rib']) {
        const sample = await page.evaluate(ribId => {
          const {game, renderer} = window.__echo;
          const rib = game.platforms.find(p => p.rib?.id === ribId).rib;
          game.cameraY = rib.y - 220;
          Object.assign(game.player, { x: rib.x === 0 ? rib.w + 30 : rib.x - 50, y: rib.y + 40, vx: 0, vy: 30, grounded: false, wallDir: 0, motion: 'fall', facing: rib.x === 0 ? -1 : 1 });
          renderer.reset(); renderer.render(game, 0);
          const index = game.platforms.findIndex(p => p.rib?.id === ribId);
          const cache = renderer.__wallCacheForProof.get(index);
          const scale = cache.canvas.width / cache.width;
          const pixels = cache.context.getImageData(0, 0, cache.canvas.width, cache.canvas.height).data;
          let minInteriorAlpha = 255;
          for (const segment of rib.segments) {
            const x = (rib.x === 0 ? segment.w - 3 : segment.x - rib.x + 3) - cache.x;
            for (let y = segment.y - rib.y + 2; y < segment.y - rib.y + segment.h - 2; y++) {
              const offset = (Math.floor(y * scale) * cache.canvas.width + Math.floor(x * scale)) * 4;
              minInteriorAlpha = Math.min(minInteriorAlpha, pixels[offset + 3]);
            }
          }
          return {rib, snapshot:window.__echo.snapshot(), cache:{width:cache.width,height:cache.height,x:cache.x,minInteriorAlpha}};
        }, ribId);
        await page.locator('#game-frame').screenshot({ path: `${dir}/${version}-${format}-${ribId}.png`, scale: 'css' });
        report.samples.push({version,format,ribId,...sample});
      }
      await page.close();
    }
  }
} finally { await browser.close(); }
report.identities = Object.fromEntries(Object.entries(versions).map(([k,v]) => [k, crypto.createHash('sha256').update(v).digest('hex')]));
await fs.writeFile(`${dir}/capture.json`, JSON.stringify(report, null, 2));
if (report.errors.length) throw Error(report.errors.join('\n'));
if (report.samples.some(s => s.version === 'after' && s.cache.minInteriorAlpha !== 255)) throw Error('A candidate rib exposes its interior contact mass.');
console.log(JSON.stringify({errors:report.errors,frames:report.samples.length,identities:report.identities}));
