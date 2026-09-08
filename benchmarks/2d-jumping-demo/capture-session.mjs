#!/usr/bin/env node
// Post-submission observer. Never imports or modifies contestant game state/code.
import { chromium } from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import { createInterface } from 'node:readline';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';

const [url, outputArgument, browserPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', bindingArgument] = process.argv.slice(2);
if (!url || !outputArgument) throw new Error('Usage: capture-session.mjs <url> <output-directory> [browser-executable]');
const output = resolve(outputArgument);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const binding = bindingArgument ? JSON.parse(await readFile(resolve(bindingArgument))) : null;
if (binding && (binding.kind !== 'vasir-game-build-receipt' || binding.exitCode !== 0 || !binding.output?.entries)) throw new Error('Capture needs the successful frozen package receipt.');
async function verifyPackage() {
  if (!binding) return;
  for (const file of binding.output.entries) {
    const bytes = await readFile(join(binding.output.directory, file.path));
    if (digest(bytes) !== file.sha256 || bytes.length !== file.bytes) throw new Error(`Packaged source changed: ${file.path}`);
  }
}
await verifyPackage();
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: browserPath, headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, recordVideo: { dir: join(output, 'original'), size: { width: 390, height: 844 } } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const started = performance.now();
const record = { schemaVersion: 1, method: 'Normal browser pointer/touch/keyboard input at native time. No game state injection or source edits.', viewport: { width: 390, height: 844, dpr: 2, mobile: true, touch: true }, browser: await browser.version(), sourceUrl: url, inputArtifactHash: binding?.inputArtifactHash ?? null, package: binding ? { entries: binding.output.entries } : null, actions: [], errors: [], requestsFailed: [], responses: [], frames: [] };
const elapsed = () => Number(((performance.now() - started) / 1000).toFixed(3));
page.on('pageerror', error => record.errors.push({ atSeconds: elapsed(), message: error.message }));
page.on('requestfailed', request => record.requestsFailed.push({ atSeconds: elapsed(), url: request.url(), reason: request.failure()?.errorText }));
const pendingResponses = new Set();
page.on('response', response => {
  const task = (async () => {
    const requested = new URL(response.url());
    if (requested.origin !== new URL(url).origin) return;
    const name = decodeURIComponent(requested.pathname).replace(/^\//, '') || 'index.html';
    const expected = binding?.output.entries.find(file => file.path === name);
    const observed = { atSeconds: elapsed(), path: name, status: response.status() };
    if (expected && response.ok()) {
      try {
        const bytes = await response.body();
        observed.sha256 = digest(bytes); observed.bytes = bytes.length;
        observed.matchesPackage = observed.sha256 === expected.sha256 && bytes.length === expected.bytes;
      } catch (error) { observed.readError = error.message; }
    }
    record.responses.push(observed);
  })();
  pendingResponses.add(task); task.finally(() => pendingResponses.delete(task));
});
let closed = false;
async function shot(name) {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Screenshot name must be a simple filename stem.');
  const path = join(output, `${name}.png`);
  await page.screenshot({ path });
  const inspection = await page.evaluate(() => ({
    title: document.title,
    text: document.body.innerText.slice(0, 3500),
    controls: [...document.querySelectorAll('button,[role="button"],input,canvas')].slice(0, 30).map(element => {
      const box = element.getBoundingClientRect();
      return { tag: element.tagName, text: (element.innerText ?? '').slice(0, 80), label: element.getAttribute('aria-label'), x: box.x, y: box.y, width: box.width, height: box.height };
    }),
    overflow: { width: document.documentElement.scrollWidth, viewport: innerWidth }
  }));
  record.frames.push({ name: `${name}.png`, atSeconds: elapsed(), inspection });
  process.stdout.write(`${JSON.stringify({ screenshot: path, atSeconds: elapsed(), inspection })}\n`);
}
async function close() {
  if (closed) return;
  closed = true;
  record.durationSeconds = elapsed();
  await Promise.allSettled([...pendingResponses]);
  await verifyPackage();
  record.packageVerifiedAfterCapture = Boolean(binding);
  await context.close();
  record.originalVideo = await page.video().path();
  await browser.close();
  await writeFile(join(output, 'capture.json'), `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ complete: true, receipt: join(output, 'capture.json'), video: record.originalVideo })}\n`);
}
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(error => record.errors.push({ atSeconds: elapsed(), stage: 'navigation', message: error.message }));
await shot('00-entry');
const lines = createInterface({ input: process.stdin });
for await (const line of lines) {
  try {
    const command = JSON.parse(line);
    record.actions.push({ ...command, atSeconds: elapsed() });
    if (command.action === 'tap') await page.touchscreen.tap(command.x, command.y);
    else if (command.action === 'click') await page.mouse.click(command.x, command.y);
    else if (command.action === 'touch') {
      // The caller preserves point IDs across down/move/end, like real fingers.
      await cdp.send('Input.dispatchTouchEvent', { type: command.type, touchPoints: command.points ?? [] });
    } else if (command.action === 'key') await page.keyboard[command.type ?? 'press'](command.key);
    else if (command.action === 'wait') await page.waitForTimeout(Math.max(0, Math.min(command.ms, 15000)));
    else if (command.action === 'reload') await page.reload({ waitUntil: 'networkidle' });
    else if (command.action === 'screenshot') await shot(command.name);
    else if (command.action === 'close') { await close(); lines.close(); break; }
    else throw new Error('Unknown observer action');
    if (command.action !== 'screenshot') process.stdout.write(`${JSON.stringify({ actionComplete: command.action, atSeconds: elapsed() })}\n`);
  } catch (error) {
    record.errors.push({ atSeconds: elapsed(), stage: 'observer', message: error.message });
    process.stdout.write(`${JSON.stringify({ observerError: error.message })}\n`);
  }
}
await close();
