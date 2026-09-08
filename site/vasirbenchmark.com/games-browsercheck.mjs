#!/usr/bin/env node

// Real-browser proof for the published Games route. No packages or synthetic result data.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const sha256 = value => createHash('sha256').update(value).digest('hex');

const GAMES_REHEARSAL_SITE_PATHS = Object.freeze([
  'index.html', 'style.css', 'assets/d3.v7.min.js', 'app.js', 'data.js', 'responses.js',
  'benchmark-report.html', 'benchmark-report.css', 'benchmark-report.js',
  'assets/kanit-latin-900-normal.woff2', 'games.html', 'games.css', 'games.js'
]);
const WRITING_REHEARSAL_SITE_PATHS = Object.freeze(['writing-data.js', 'writing-responses.js', 'writing-creation-responses.js']);

// Read only the Games-scoped subset, but never silently accept missing or unknown site files.
// Exporting this adapter allows its fail-closed manifest rules to be tested without Chrome.
export function loadGamesRehearsalSiteFiles({ siteFiles, releaseId: declaredReleaseId, manifestPath, origin = 'https://vasirbenchmark.com' }) {
  assert.ok(Array.isArray(siteFiles), 'Local rehearsal requires a site-file manifest.');
  const allowedPaths = new Set([...GAMES_REHEARSAL_SITE_PATHS, ...WRITING_REHEARSAL_SITE_PATHS]);
  const entries = new Map();
  for (const file of siteFiles) {
    const key = file?.path;
    assert.ok(typeof key === 'string' && !key.startsWith('/') && !key.split('/').some(part => !part || part === '..' || part === '.'), 'Invalid site-file path.');
    assert.ok(allowedPaths.has(key), `Unexpected site file: ${key}`);
    assert.ok(!entries.has(key), `Duplicate site file: ${key}`);
    entries.set(key, file);
  }
  for (const key of GAMES_REHEARSAL_SITE_PATHS) assert.ok(entries.has(key), `Missing required Games site file: ${key}`);
  const ignoredSiteFiles = WRITING_REHEARSAL_SITE_PATHS.filter(key => entries.has(key));
  assert.ok(ignoredSiteFiles.length === 0 || entries.has('writing-data.js') && entries.has('writing-responses.js'), 'Include either both Writing bundles or neither in the site manifest; the creation archive is an optional extension.');

  const scopedFiles = GAMES_REHEARSAL_SITE_PATHS.map(key => {
    const file = entries.get(key);
    assert.ok(typeof file.sourcePath === 'string' && file.sourcePath.length > 0 && typeof file.contentType === 'string' && file.contentType.length > 0, `Missing source path or content type: ${key}`);
    const body = fs.readFileSync(path.resolve(path.dirname(manifestPath), file.sourcePath));
    assert.equal(body.length, file.bytes, `Local file length changed: ${key}`);
    assert.equal(sha256(body), file.sha256, `Local file hash changed: ${key}`);
    return { ...file, body, isArtifact: false };
  });
  const htmlReleaseIds = new Set(scopedFiles.filter(file => file.path.endsWith('.html')).flatMap(file =>
    [...file.body.toString('utf8').matchAll(/(?:src|href)\s*=\s*["']\/releases\/([^/]+)\//g)].map(match => match[1])));
  for (const releaseId of htmlReleaseIds) assert.match(releaseId, /^[a-f0-9]{64}$/, 'Invalid immutable release ID in candidate HTML.');
  assert.ok(htmlReleaseIds.size <= 1, 'Candidate HTML references multiple immutable releases.');
  const htmlReleaseId = [...htmlReleaseIds][0] || null;
  if (declaredReleaseId != null) {
    assert.match(declaredReleaseId, /^[a-f0-9]{64}$/, 'Invalid declared immutable release ID.');
    assert.equal(htmlReleaseId, declaredReleaseId, 'Manifest release ID differs from the candidate HTML.');
  }
  const releaseId = declaredReleaseId || htmlReleaseId;
  const files = new Map(scopedFiles.map(file => [
    `${origin}/${releaseId && !file.path.endsWith('.html') ? `releases/${releaseId}/` : ''}${file.path}`,
    file
  ]));
  return {
    files,
    dataFile: scopedFiles.find(file => file.path === 'data.js'),
    scope: {
      mapping: releaseId ? 'immutable-release' : 'legacy-apex',
      releaseId,
      declaredSiteFileCount: siteFiles.length,
      verifiedSiteFiles: [...GAMES_REHEARSAL_SITE_PATHS],
      ignoredSiteFiles
    }
  };
}

async function runGamesBrowserCheck() {
const options = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
  return pairs;
}, []));
if (!options.url || !options['output-dir']) throw new Error('Usage: games-browsercheck.mjs --url URL --output-dir PATH [--width 1440 --height 1000] [--local-artifacts PINNED_MANIFEST]');
const url = new URL(options.url);
const width = Number(options.width || 1440);
const height = Number(options.height || 1000);
assert.ok(['http:', 'https:'].includes(url.protocol));
assert.ok(Number.isInteger(width) && width >= 320 && Number.isInteger(height) && height >= 400);
const output = path.resolve(options['output-dir']);
fs.mkdirSync(output, { recursive: true });
let rehearsal = null;
if (options['local-artifacts']) {
  assert.equal(url.origin, 'https://vasirbenchmark.com', 'Exact production frame-ancestors requires the genuine benchmark origin in local rehearsal.');
  const manifestPath = path.resolve(options['local-artifacts']);
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.kind, 'vasirbenchmark-local-artifact-rehearsal');
  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.projectionSha256, /^[a-f0-9]{64}$/);
  assert.ok(Array.isArray(manifest.artifactFiles) && manifest.artifactFiles.length > 0 && manifest.artifactFiles.length <= 2048);
  const siteMapping = loadGamesRehearsalSiteFiles({ siteFiles: manifest.siteFiles, releaseId: manifest.releaseId, manifestPath, origin: url.origin });
  const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
  const config = fs.readFileSync(path.join(siteDirectory, 'infra/production.yml'), 'utf8');
  const guardCode = config.slice(config.indexOf('  GameArtifactOriginGuard:')).match(/FunctionCode: \|\n([\s\S]*?)\n      FunctionConfig:/)?.[1].split('\n').map(line => line.slice(8)).join('\n');
  const csp = config.slice(config.indexOf('Name: vasirbenchmark-game-artifacts-v1')).match(/ContentSecurityPolicy: >-\n((?:\s{14}[^\n]+\n)+)/)?.[1].trim().split('\n').map(line => line.trim()).join(' ');
  const apexCsp = config.slice(config.indexOf('Name: vasirbenchmark-production-security-v1')).match(/ContentSecurityPolicy: >-\n((?:\s{14}[^\n]+\n)+)/)?.[1].trim().split('\n').map(line => line.trim()).join(' ');
  assert.ok(guardCode && csp?.startsWith('sandbox allow-scripts allow-same-origin;') && apexCsp?.includes("connect-src 'none'"), 'Actual production origin guard, artifact CSP and apex CSP must be readable.');
  const guard = vm.runInNewContext(`${guardCode}\nhandler`);
  const files = new Map(siteMapping.files);
  for (const file of manifest.artifactFiles) {
      const key = file.key;
      assert.ok(typeof key === 'string' && !key.startsWith('/') && !key.split('/').some(part => !part || part === '..' || part === '.'));
      assert.match(key, /^artifacts\/[a-f0-9]{64}\//);
      assert.ok(typeof file.sourcePath === 'string' && typeof file.contentType === 'string');
      const bytes = fs.readFileSync(path.resolve(path.dirname(manifestPath), file.sourcePath));
      assert.equal(bytes.length, file.bytes, `Local file length changed: ${key}`);
      assert.equal(sha256(bytes), file.sha256, `Local file hash changed: ${key}`);
      const requestUrl = `https://d7us0tudou7ya.cloudfront.net/${key}`;
      assert.ok(!files.has(requestUrl), `Duplicate manifest URL: ${requestUrl}`);
      files.set(requestUrl, { ...file, body: bytes, isArtifact: true });
  }
  const rootData = { window: {} };
  vm.runInNewContext(siteMapping.dataFile.body.toString('utf8'), rootData);
  assert.equal(sha256(JSON.stringify(rootData.window.VASIR_DATA)), manifest.projectionSha256, 'Manifest projection differs from the pinned site data.');
  rehearsal = { files, guard, csp, apexCsp, siteScope: siteMapping.scope, projectionSha256: manifest.projectionSha256, requests: [], failures: [], manifest: { path: manifestPath, bytes: manifestBytes.length, sha256: sha256(manifestBytes) }, productionGuardSha256: sha256(guardCode), cspSha256: sha256(csp), apexCspSha256: sha256(apexCsp) };
}
const chromePath = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(file => fs.existsSync(file));
assert.ok(chromePath, 'Chrome must be installed or CHROME_BIN set.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-games-browsercheck-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const deadline = Date.now() + 120000;
async function waitFor(check, label, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout && Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timed out: ${label}`);
}
let socket;
const checks = [];
const screenshots = [];
const harnessSha256 = sha256(fs.readFileSync(fileURLToPath(import.meta.url)));
const errors = [];
const artifactRequests = [];
const mediaFailures = [];
const artifactObservations = [];
const coverageFailures = [];
const childSessions = new Map();
const sessionObservations = new Map();
const requestObservations = new Map();
const presentationResponses = new Map();
const completedPresentationRequests = new Set();
let activeObservation = null;
let mainFrameId = null;
let nextId = 1;
const pending = new Map();
const check = (name, condition, detail) => { assert.ok(condition, `${name}${detail ? `: ${detail}` : ''}`); checks.push(name); };
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
}
async function evaluate(expression, contextId, sessionId) {
  const result = await send('Runtime.evaluate', { expression, contextId, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function interceptLocalRequest(message) {
  const { requestId, request } = message.params;
  const sessionId = message.sessionId;
  const parsed = new URL(request.url);
  const respond = (responseCode, body, headers = []) => send('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders: headers, body: body.toString('base64') }, sessionId);
  try {
    assert.ok(['GET', 'HEAD'].includes(request.method), 'Only file reads are allowed in local rehearsal.');
    if (parsed.origin === 'https://d7us0tudou7ya.cloudfront.net') {
      const routed = rehearsal.guard({ request: { uri: parsed.pathname, method: request.method, headers: { host: { value: parsed.host } } } });
      assert.ok(!routed.statusCode && routed.uri === parsed.pathname, `Production artifact guard rejected ${parsed.pathname}`);
    }
    const file = rehearsal.files.get(`${parsed.origin}${parsed.pathname}`);
    assert.ok(file, `Request is outside the pinned local files: ${request.url}`);
    let body = file.body;
    let status = 200;
    const headers = [{ name: 'Content-Type', value: file.contentType }, { name: 'X-Content-Type-Options', value: 'nosniff' }, { name: 'Referrer-Policy', value: 'no-referrer' }, { name: 'Cache-Control', value: 'no-store' }, { name: 'Accept-Ranges', value: 'bytes' }];
    headers.push({ name: 'Content-Security-Policy', value: file.isArtifact ? rehearsal.csp : rehearsal.apexCsp });
    const range = Object.entries(request.headers).find(([name]) => name.toLowerCase() === 'range')?.[1];
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      assert.ok(match && (match[1] || match[2]), `Unsupported byte range: ${range}`);
      const start = match[1] ? Number(match[1]) : Math.max(0, body.length - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(body.length - 1, Number(match[2])) : body.length - 1;
      assert.ok(Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < body.length, `Invalid byte range: ${range}`);
      headers.push({ name: 'Content-Range', value: `bytes ${start}-${end}/${body.length}` });
      body = body.subarray(start, end + 1);
      status = 206;
    }
    headers.push({ name: 'Content-Length', value: String(body.length) });
    rehearsal.requests.push({ url: request.url, status, bytes: body.length, fileSha256: file.sha256, range: range || null });
    await respond(status, request.method === 'HEAD' ? Buffer.alloc(0) : body, headers);
  } catch (error) {
    rehearsal.failures.push({ url: request.url, error: error.message });
    await respond(403, Buffer.from('Local rehearsal rejected an unpinned or invalid request.'), [{ name: 'Content-Type', value: 'text/plain' }]);
  }
}
const rehearsalReceipt = () => rehearsal ? { mode: 'local-pinned-bytes', claimBoundary: 'Local browser rehearsal at genuine production hostnames using the manifest-pinned Games site subset and artifact bytes, the current production artifact guard/CSP and the exact apex CSP. Writing-only bundles are outside this check. This does not prove uploaded files or live CDN delivery.', manifest: rehearsal.manifest, siteScope: rehearsal.siteScope, projectionSha256: rehearsal.projectionSha256, productionGuardSha256: rehearsal.productionGuardSha256, cspSha256: rehearsal.cspSha256, apexCspSha256: rehearsal.apexCspSha256, requests: rehearsal.requests, failures: rehearsal.failures } : { mode: 'live-network', claimBoundary: 'Browser requests used the configured live URL and published artifact origin without local response interception.' };
const click = selector => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw Error('Control missing'); el.scrollIntoView({block:'center',behavior:'instant'}); el.click(); })()`);
const capture = async name => {
  await evaluate('document.fonts.ready');
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const contents = Buffer.from(result.data, 'base64');
  fs.writeFileSync(path.join(output, name), contents);
  screenshots.push({ path: name, bytes: contents.length, sha256: sha256(contents), width, height });
};
const coverageSummary = () => ({
  rows: artifactObservations.length,
  clipsAdvanced: artifactObservations.filter(row => row.video?.status === 'advancing').length,
  clipsFailed: artifactObservations.filter(row => row.video?.status === 'failed').length,
  gamesLoadedAndInputObserved: artifactObservations.filter(row => row.game?.status === 'loaded-and-input-observed').length,
  gamesWithObservedFailure: artifactObservations.filter(row => row.game?.status === 'observed-failure').length,
  gamesUnverified: artifactObservations.filter(row => row.game?.status === 'unverified').length,
  unavailableRows: artifactObservations.filter(row => row.availability).length
});

async function gameContext(expectedUrl) {
  const target = await waitFor(async () => {
    const { targetInfos } = await send('Target.getTargets');
    const isolated = targetInfos.find(item => item.type === 'iframe' && item.url === expectedUrl);
    if (isolated) return { targetId: isolated.targetId };
    const { frameTree } = await send('Page.getFrameTree');
    const child = frameTree.childFrames?.find(item => item.frame.url === expectedUrl);
    return child ? { frameId: child.frame.id } : null;
  }, 'Final artifact document loaded', 8000);
  if (target.targetId) {
    const sessionId = childSessions.get(target.targetId) || (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })).sessionId;
    return { sessionId };
  }
  const { executionContextId } = await send('Page.createIsolatedWorld', { frameId: target.frameId, worldName: 'games-origin-proof' });
  return { contextId: executionContextId };
}

async function observeGameInput(context, articleSelector) {
  const inspect = expression => evaluate(expression, context.contextId, context.sessionId);
  const target = await inspect(`(() => {
    const controls = [...document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]')].map(element => {
      const rect = element.getBoundingClientRect(); const style = getComputedStyle(element);
      return {label:(element.getAttribute('aria-label') || element.innerText || element.value || '').trim(),x:rect.x + rect.width/2,y:rect.y + rect.height/2,visible:rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !element.disabled};
    }).filter(control => control.visible && control.x > 0 && control.y > 0 && control.x < innerWidth && control.y < innerHeight);
    const control = controls.find(item => /^(play|start|begin|jump|tap to|restart|retry)([^a-z]|$)/i.test(item.label));
    return {...(control ? {...control,kind:'visible control'} : {kind:'game surface',label:'Surface tap; authored controls not inferred',x:innerWidth/2,y:innerHeight/2}),viewport:{width:innerWidth,height:innerHeight}};
  })()`);
  await evaluate(`document.querySelector(${JSON.stringify(`${articleSelector} .game-artifact__frame`)}).scrollIntoView({block:'center',behavior:'instant'})`);
  const frame = await evaluate(`(() => { const rect = document.querySelector(${JSON.stringify(`${articleSelector} iframe`)}).getBoundingClientRect(); return {x:rect.x,y:rect.y,width:rect.width,height:rect.height}; })()`);
  const x = frame.x + target.x * frame.width / target.viewport.width;
  const y = frame.y + target.y * frame.height / target.viewport.height;
  if (width < 600) {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await delay(80);
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  await delay(200);
  // A normal keyboard press is an additional desktop observation, never state injection.
  if (width >= 600) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await delay(80);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  }
  return { ...target, presentation: frame, deliveredAt: { x, y }, device: width < 600 ? 'trusted touch' : 'trusted pointer and Space key', outcomeScope: 'Input delivered through the browser with presentation scaling applied. This observation does not certify the intended game action or recovery.' };
}

try {
  const port = await waitFor(() => {
    const file = path.join(profile, 'DevToolsActivePort');
    return fs.existsSync(file) ? Number(fs.readFileSync(file, 'utf8').split('\n')[0]) : null;
  }, 'Chrome debugging port');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', async event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    } else if (message.method === 'Fetch.requestPaused' && rehearsal) {
      try { await interceptLocalRequest(message); }
      catch (error) { if (!/closed|detached|target|session/i.test(error.message)) errors.push(`Local interception failed: ${error.message}`); }
    } else if (message.method === 'Target.attachedToTarget' && message.params.targetInfo.type === 'iframe') {
      const { sessionId, targetInfo } = message.params;
      childSessions.set(targetInfo.targetId, sessionId);
      sessionObservations.set(sessionId, activeObservation);
      try {
        await Promise.all([send('Network.enable', {}, sessionId), send('Runtime.enable', {}, sessionId), send('Log.enable', {}, sessionId)]);
        if (rehearsal) await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] }, sessionId);
        await send('Runtime.runIfWaitingForDebugger', {}, sessionId);
      } catch (error) {
        // Stopping an artifact also closes its debugging target.
        if (!/closed|detached|target|session/i.test(error.message)) coverageFailures.push(`Could not observe artifact startup: ${error.message}`);
      }
    } else if (message.method === 'Runtime.exceptionThrown') {
      const observation = message.sessionId ? sessionObservations.get(message.sessionId) : null;
      const detail = message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text;
      if (observation) observation.runtimeErrors.push(detail);
      else if (!message.sessionId) errors.push(detail);
    } else if (message.method === 'Log.entryAdded') {
      const observation = sessionObservations.get(message.sessionId);
      const entry = message.params.entry;
      if (observation && entry.source === 'security' && entry.level === 'error') observation.securityErrors.push(entry.text);
      else if (!message.sessionId && entry.source === 'security' && entry.level === 'error') errors.push(entry.text);
    } else if (message.method === 'Network.requestWillBeSent') {
      if (['Media', 'Document'].includes(message.params.type) && /\/artifacts\//.test(message.params.request.url)) artifactRequests.push(message.params.request.url);
      const observation = sessionObservations.get(message.sessionId) || (message.params.frameId && message.params.frameId !== mainFrameId ? activeObservation : null);
      if (observation) {
        const request = { url: message.params.request.url, type: message.params.type, status: null, failure: null, finished: false };
        observation.requests.push(request);
        observation.lastRequestAt = Date.now();
        requestObservations.set(`${message.sessionId || ''}:${message.params.requestId}`, request);
      }
    } else if (message.method === 'Network.responseReceived') {
      if (!message.sessionId && new URL(message.params.response.url).origin === url.origin && ['Document', 'Script', 'Stylesheet', 'Font'].includes(message.params.type)) {
        presentationResponses.set(message.params.response.url, { requestId: message.params.requestId, ...message.params.response });
      }
      const request = requestObservations.get(`${message.sessionId || ''}:${message.params.requestId}`);
      if (request) request.status = message.params.response.status;
      else if (!message.sessionId && message.params.response.status >= 400 && ['Media', 'Document', 'Image'].includes(message.params.type)) mediaFailures.push(`${message.params.response.status} ${message.params.response.url}`);
    } else if (message.method === 'Network.loadingFailed' || message.method === 'Network.loadingFinished') {
      if (!message.sessionId && message.method === 'Network.loadingFinished') completedPresentationRequests.add(message.params.requestId);
      const request = requestObservations.get(`${message.sessionId || ''}:${message.params.requestId}`);
      if (request) {
        request.finished = true;
        if (message.method === 'Network.loadingFailed' && !message.params.canceled && message.params.errorText !== 'net::ERR_ABORTED') request.failure = message.params.blockedReason || message.params.errorText || 'Load failed';
      }
    }
  });
  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable'), send('Log.enable'), send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 }), send('Emulation.setTouchEmulationEnabled', { enabled: width < 600 }), send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })]);
  if (rehearsal) await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  mainFrameId = (await send('Page.getFrameTree')).frameTree.frame.id;
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  await send('Page.navigate', { url: url.href });
  await waitFor(() => evaluate('document.readyState === "complete" && Boolean(document.querySelector(".game-models__button"))'), 'Games report rendered');
  const projectionSha256 = sha256(await evaluate('JSON.stringify(window.VASIR_DATA)'));
  if (rehearsal) check('Local rehearsal uses the manifest-pinned actual projection', projectionSha256 === rehearsal.projectionSha256);
  await evaluate('document.fonts.ready');
  const presentationResources = await evaluate(`['games.html','games.css','games.js','style.css','assets/kanit-latin-900-normal.woff2'].map(path => {
    const resource = path === 'games.html' ? location.href : [...document.querySelectorAll('script[src],link[href]')].map(element => element.src || element.href).find(url => new URL(url).pathname.endsWith('/' + path));
    if (!resource) throw Error('Presentation input is not linked: ' + path);
    return {path, url:resource};
  })`);
  // The production page denies connect-src. Hash the browser's loaded responses through CDP;
  // page-side fetch would violate that policy and would inspect a second request anyway.
  const presentationFiles = [];
  for (const resource of presentationResources) {
    const response = await waitFor(() => {
      const observed = presentationResponses.get(resource.url);
      return observed && completedPresentationRequests.has(observed.requestId) ? observed : null;
    }, `Presentation response completed: ${resource.path}`);
    assert.ok(response.status >= 200 && response.status < 300, `Presentation response failed: ${resource.path}`);
    const result = await send('Network.getResponseBody', { requestId: response.requestId });
    const contents = Buffer.from(result.body, result.base64Encoded ? 'base64' : 'utf8');
    const source = resource.path === 'games.html' ? contents.toString('utf8').replaceAll(/\/releases\/[a-f0-9]{64}\//g, './') : contents;
    const csp = Object.entries(response.headers).find(([name]) => name.toLowerCase() === 'content-security-policy')?.[1] || null;
    presentationFiles.push({ ...resource, bytes: contents.length, sha256: sha256(contents), sourceSha256: sha256(source), observation: 'CDP Network.getResponseBody for the completed browser-loaded response', csp });
  }
  if (rehearsal) check('Local benchmark document enforces the exact production apex CSP', presentationFiles.find(file => file.path === 'games.html').csp === rehearsal.apexCsp);
  const initial = await evaluate(`(() => {
    const data = window.VASIR_DATA.games;
    const table = document.querySelector('#game-results');
    const ultraId = 'codex:gpt-6-astra@ultra';
    const ultraRuns = data.runs.filter(run => run.configurationId === ultraId);
    const ultraRow = document.querySelector('[data-configuration-result="' + ultraId + '"]');
    const method = document.querySelector('#game-method')?.textContent || '';
    const differences = data.configurations.map(configuration => { const pair = data.conditions.map(condition => data.runs.find(run => run.configurationId === configuration.id && run.conditionId === condition.id)); const expected = pair.every(run => Number.isFinite(run?.score?.value)) ? pair[1].score.value - pair[0].score.value : null; const row = document.querySelector('[data-configuration-result="' + CSS.escape(configuration.id) + '"]'); return {expected,visible:row?.querySelector('.game-results__delta')?.textContent.replace('Score Δ','').trim()}; });
    const scoreRows = data.runs.map(run => {
      const element = document.querySelector('[data-result-run-id="' + CSS.escape(run.id) + '"]') || document.querySelector('[data-reference-result="' + CSS.escape(run.id) + '"]');
      const individual = run.judgments?.length === 1 ? run.judgments[0].score?.value ?? run.judgments[0].score ?? run.judgments[0].value : null;
      const primary = element?.querySelector('[data-primary-score]');
      return {id:run.id,combined:element?.querySelector('[data-combined-score]')?.dataset.combinedScore,expectedCombined:String(run.score?.value ?? ''),primary:primary?.dataset.primaryScore,expectedPrimary:String(run.score?.value ?? individual ?? ''),kind:primary?.dataset.ratingKind,expectedKind:run.score?.value != null ? 'combined' : individual != null ? 'individual' : 'unavailable',judges:[...element?.querySelectorAll('[data-rating-judge]') || []].map(item => ({judge:item.dataset.ratingJudge,value:item.dataset.ratingValue})),expectedJudges:(run.judgments || []).map(judge => ({judge:judge.judge,value:Number(judge.score?.value ?? judge.score ?? judge.value).toFixed(1)})),unavailable:element?.querySelectorAll('.game-results__judge--unavailable').length,expectedUnavailable:(run.reviewOutcomes || []).filter(outcome => outcome.status === 'failed').length};
    });
    return {configurations:data.configurations.length,conditions:data.conditions.length,runs:data.runs.length,table:document.querySelectorAll('[data-result-run-id]').length,completedPanels:data.runs.filter(run => Number.isFinite(run.score?.value) && run.judgments?.length === 2).length,ratings:{version:table?.dataset.ratingsVersion,beforeGames:table?.getBoundingClientRect().bottom <= document.querySelector('#game-comparison').getBoundingClientRect().top,heading:document.querySelector('#game-results-title')?.textContent,rows:scoreRows,differences},ultra:{count:ultraRuns.length,hasBare:ultraRuns.some(run => run.conditionId === 'bare' && run.status !== 'reference'),hasAsh:ultraRuns.some(run => run.conditionId === 'vasir' && run.id === 'ash-and-echo-r23'),title:ultraRow?.querySelector('.game-results__configuration')?.textContent,extraReference:Boolean(document.querySelector('[data-reference-result],section#game-reference')),methodIncludesCreation:method.includes(data.configurations.find(item => item.id === ultraId)?.comparison?.reason || 'MISSING')},iframes:document.querySelectorAll('iframe').length,videos:document.querySelectorAll('video').length,overflow:document.documentElement.scrollWidth > innerWidth,prompt:document.querySelector('.game-report__prompt').textContent,expectedPrompt:data.benchmark.prompt,sourceCounts:[window.VASIR_DATA.benchmarkResults.length,window.VASIR_DATA.aiWorkflows.benchmarkResults.length],firstPlayable:data.runs.find(run => run.artifact?.playUrl)?.configurationId,firstVideo:data.runs.find(run => run.artifact?.videoUrl)?.configurationId,posters:[...document.querySelectorAll('.game-artifact__poster')].map(img => ({src:img.src,complete:img.complete,valid:img.naturalWidth > 0}))};
  })()`);
  check('Five configurations render ten distinct scored outputs', initial.configurations === 5 && initial.conditions === 2 && initial.runs === 10 && initial.table === 10 && initial.completedPanels === 10);
  check('No eager game or video loads', initial.iframes === 0 && initial.videos === 0 && artifactRequests.length === 0);
  check('Exact user prompt rendered', initial.prompt === initial.expectedPrompt);
  check('Ultra is an ordinary model row with creation methods in methodology', !initial.ultra.extraReference && initial.ultra.methodIncludesCreation && !/human.directed/i.test(initial.ultra.title));
  check('Benchmark ratings precede playable cards', initial.ratings.version === '3' && initial.ratings.beforeGames && initial.ratings.heading === 'Benchmark ratings');
  check('Every combined rating and missing panel matches the published evidence', initial.ratings.rows.every(row => row.combined === row.expectedCombined));
  check('Completed individual ratings remain prominent and explicitly distinguished from combined scores', initial.ratings.rows.every(row => row.primary === row.expectedPrimary && row.kind === row.expectedKind));
  check('All completed individual ratings and unavailable review seats are visible in the table', initial.ratings.rows.every(row => JSON.stringify(row.judges) === JSON.stringify(row.expectedJudges) && row.unavailable === row.expectedUnavailable));
  check('Astra Ultra pairs the fresh bare output with Ash & Echo', initial.ultra.count === 2 && initial.ultra.hasBare && initial.ultra.hasAsh && /GPT-6 Astra/.test(initial.ultra.title) && /ultra/i.test(initial.ultra.title));
  check('Every visible score difference matches the actual complete ratings', initial.ratings.differences.every(item => item.visible === (item.expected === null ? '—' : (item.expected > 0 ? '+' : '') + item.expected.toFixed(1))));
  check('No horizontal page overflow', !initial.overflow);
  check('Engineering and AI Workflows source coverage preserved', initial.sourceCounts[0] === 216 && initial.sourceCounts[1] === 52);
  await waitFor(() => evaluate(`Array.from(document.querySelectorAll('.game-comparison__pair .game-artifact__poster')).filter(image => image.getBoundingClientRect().top < innerHeight).every(image => image.complete && image.naturalWidth > 0)`), 'Visible gameplay posters loaded');
  checks.push('Visible gameplay posters loaded');
  await capture(`${width < 600 ? 'mobile' : 'desktop'}-games.png`);
  await evaluate('document.querySelector("#game-results").scrollIntoView({block:"start",behavior:"instant"})');
  await capture(`${width < 600 ? 'mobile' : 'desktop'}-games-ratings.png`);

  if (!initial.firstVideo || !initial.firstPlayable) throw new Error('Published Games proof requires at least one real playable build and one recorded video.');
  await click(`.game-models__button[data-model-id="${initial.firstVideo}"]`);
  const watchSelector = '.game-comparison__pair .game-artifact__watch[data-artifact-action="watch"]';
  await click(watchSelector);
  const videoStarted = await waitFor(() => evaluate(`(() => { const video = document.querySelector('video'); return video?.error ? {error:video.error.code} : video?.currentTime > 0.5 ? {time:video.currentTime,rate:video.playbackRate,paused:video.paused,muted:video.muted} : null; })()`), 'Normal-time gameplay playback advances', 30000);
  check('Video loads and advances at normal speed', !videoStarted.error && videoStarted.rate === 1 && !videoStarted.paused, JSON.stringify(videoStarted));
  await capture(`${width < 600 ? 'mobile' : 'desktop'}-games-playback.png`);
  const offscreenFrame = await evaluate(`(() => { const frame = document.querySelector('video')?.closest('.game-artifact__frame'); window.scrollTo({top:0,behavior:"instant"}); const rect = frame?.getBoundingClientRect(); return {top:rect?.top,bottom:rect?.bottom,height:innerHeight,whollyOutside:Boolean(rect && (rect.bottom <= 0 || rect.top >= innerHeight))}; })()`);
  check('Playback frame is completely outside the viewport before unload', offscreenFrame.whollyOutside, JSON.stringify(offscreenFrame));
  await waitFor(() => evaluate('document.querySelectorAll("video,iframe").length === 0'), 'Offscreen video unload');
  checks.push('Offscreen video unloads');

  await click(`.game-models__button[data-model-id="${initial.firstPlayable}"]`);
  await click('.game-comparison__pair .game-artifact__actions [data-artifact-action="play"]:enabled');
  await waitFor(() => evaluate(`(() => { const frame = document.querySelector('iframe'); if (!frame) return false; try {return !frame.contentWindow.document;} catch(error) {return error.name === 'SecurityError';} })()`), 'Game navigation leaves its initial blank document');
  const frameState = await evaluate(`(() => {const frame = document.querySelector('iframe'); return {count:document.querySelectorAll('iframe,video').length,url:frame?.src,native:{width:Number(frame.width),height:Number(frame.height)},runId:frame.closest('[data-run-id]').dataset.runId,sandbox:frame?.getAttribute('sandbox'),allow:frame?.getAttribute('allow'),access:(() => {try{return frame.contentWindow.document ? 'accessible' : 'missing';}catch(error){return error.name;}})()};})()`);
  check('Game activates alone on the approved separate origin', frameState.count === 1 && new URL(frameState.url).origin === 'https://d7us0tudou7ya.cloudfront.net' && new URL(frameState.url).origin !== url.origin);
  check('Embed permissions prevent parent navigation and popups', frameState.sandbox === 'allow-scripts allow-same-origin' && frameState.allow === 'autoplay; fullscreen');
  check('Benchmark parent cannot read game origin', frameState.access === 'SecurityError');
  const firstContext = await gameContext(frameState.url);
  const childProof = await evaluate(`({url:location.href,viewport:{width:innerWidth,height:innerHeight},body:document.body?.textContent?.length || 0,parentAccess:(() => {try{return parent.document ? 'accessible' : 'missing';}catch(error){return error.name;}})()})`, firstContext.contextId, firstContext.sessionId);
  check('Actual game document loads and cannot read benchmark parent', childProof.url === frameState.url && childProof.parentAccess === 'SecurityError', JSON.stringify(childProof));
  check('Embedded game retains its declared native viewport', childProof.viewport.width === frameState.native.width && childProof.viewport.height === frameState.native.height, JSON.stringify(childProof.viewport));
  await capture(`${width < 600 ? 'mobile' : 'desktop'}-games-play.png`);
  await click('.game-artifact__actions [data-artifact-action="fullscreen"]:not(:disabled)');
  const fullscreen = await waitFor(() => evaluate(`(() => { const stage=document.fullscreenElement; const iframe=stage?.querySelector('iframe'); if(!iframe)return null; const box=stage.getBoundingClientRect(); const rect=iframe.getBoundingClientRect(); const scale=Math.min(box.width/Number(iframe.width),box.height/Number(iframe.height)); if(Math.abs(rect.width-Number(iframe.width)*scale)>1 || Math.abs(rect.height-Number(iframe.height)*scale)>1 || Math.abs(rect.x+rect.width/2-box.x-box.width/2)>1 || Math.abs(rect.y+rect.height/2-box.y-box.height/2)>1)return null; return {stage:{width:box.width,height:box.height},presentation:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},scale}; })()`), 'Fullscreen centers and scales the native portrait');
  fullscreen.viewport = await evaluate('({width:innerWidth,height:innerHeight})', firstContext.contextId, firstContext.sessionId);
  check('Fullscreen preserves native dimensions in a centered portrait', fullscreen.viewport.width === frameState.native.width && fullscreen.viewport.height === frameState.native.height, JSON.stringify(fullscreen));
  fullscreen.input = await observeGameInput(firstContext, `.game-artifact[data-run-id=${JSON.stringify(frameState.runId)}]`);
  await capture(`${width < 600 ? 'mobile' : 'desktop'}-games-fullscreen.png`);
  await evaluate('document.exitFullscreen()');
  await waitFor(() => evaluate('!document.fullscreenElement'), 'Fullscreen exits');
  await click('.game-artifact__actions [data-artifact-action="close"]:enabled');
  check('Stop unloads active game and returns focus', await evaluate('document.querySelectorAll("iframe,video").length === 0 && document.activeElement.classList.contains("game-artifact__watch")'));

  const published = await evaluate(`(() => { const data = window.VASIR_DATA.games; return data.runs.map(row => ({...row,reference:false})).map(row => ({id:row.id,configurationId:row.configurationId || null,reference:row.reference,status:row.status,eligible:row.score?.eligible ?? null,declaredFunctionalFailure:row.judgments?.some(judge => [judge.gates?.boot,judge.gates?.mobilePlay].some(gate => gate?.status === 'fail')) || false,artifact:row.artifact})); })()`);
  for (const [index, row] of published.entries()) {
    const observation = { id: row.id, configurationId: row.configurationId, reference: row.reference, executionStatus: row.status, eligible: row.eligible, video: null, game: null, requests: [], runtimeErrors: [], securityErrors: [] };
    artifactObservations.push(observation);
    if (!row.artifact?.videoUrl && !row.artifact?.playUrl) {
      observation.availability = 'No artifact published; row retained';
      continue;
    }
    if (Date.now() >= deadline) {
      coverageFailures.push(`${row.id}: live observation time budget exhausted`);
      continue;
    }
    const article = `.game-artifact[data-run-id=${JSON.stringify(row.id)}]`;
    const selectRow = async () => {
      if (!row.reference) await click(`.game-models__button[data-model-id=${JSON.stringify(row.configurationId)}]`);
      await evaluate(`document.querySelector(${JSON.stringify(article)}).scrollIntoView({block:'start',behavior:'instant'})`);
    };
    if (row.artifact.videoUrl) {
      try {
        await selectRow();
        await click(row.reference ? '[data-reference-action="watch"]' : `${article} .game-artifact__watch[data-artifact-action="watch"]`);
        const playback = await waitFor(() => evaluate(`(() => {const video = document.querySelector(${JSON.stringify(`${article} video`)}); if(video?.error) return {error:video.error.code}; return video?.currentTime > 0.5 ? {url:video.currentSrc,time:video.currentTime,rate:video.playbackRate,paused:video.paused,width:video.videoWidth,height:video.videoHeight} : null;})()`), `${row.id}: clip advances`, 10000);
        assert.ok(!playback.error && playback.url === row.artifact.videoUrl && playback.rate === 1 && !playback.paused && playback.width > 0 && playback.height > 0, `recording failed or differs from published URL: ${JSON.stringify(playback)}`);
        observation.video = { status: 'advancing', activation: row.reference ? 'ratings-table-watch' : 'artifact-watch', ...playback };
        await capture(`${width}-${index + 1}-playback.png`);
      } catch (error) {
        observation.video = { status: 'failed', url: row.artifact.videoUrl, error: error.message };
        coverageFailures.push(`${row.id}: ${error.message}`);
      } finally {
        await evaluate(`document.querySelector(${JSON.stringify(`${article} [data-artifact-action="close"]:enabled`)})?.click()`);
      }
    }
    if (!row.artifact.playUrl) continue;
    activeObservation = observation;
    try {
      const artifactUrl = new URL(row.artifact.playUrl);
      assert.ok(artifactUrl.origin === 'https://d7us0tudou7ya.cloudfront.net' && artifactUrl.origin !== url.origin && /^\/artifacts\/[a-f0-9]{64}\//.test(artifactUrl.pathname), 'Game URL is outside the immutable isolated artifact prefix');
      await selectRow();
      await click(row.reference ? '[data-reference-action="play"]' : `${article} .game-artifact__actions [data-artifact-action="play"]:enabled`);
      const context = await gameContext(row.artifact.playUrl);
      const inspect = expression => evaluate(expression, context.contextId, context.sessionId);
      await waitFor(() => inspect(`location.href === ${JSON.stringify(row.artifact.playUrl)} && document.readyState === 'complete'`), `${row.id}: document boot`, 8000);
      // Chrome can hand a navigation request to another process before emitting loadingFinished.
      for (const request of observation.requests) if (request.type === 'Document' && request.url === row.artifact.playUrl) {
        request.finished = true;
        request.completionEvidence = 'Final document readyState is complete';
      }
      await evaluate(`document.querySelector(${JSON.stringify(`${article} .game-artifact__frame`)}).scrollIntoView({block:'center',behavior:'instant'})`);
      await capture(`${width}-${index + 1}-before-input.png`);
      const before = await inspect(`({title:document.title,viewport:{width:innerWidth,height:innerHeight},text:document.body?.innerText?.slice(0,1200) || '',canvases:document.querySelectorAll('canvas').length,images:[...document.images].map(image => ({url:image.currentSrc || image.src,loaded:image.complete && image.naturalWidth > 0})),parentAccess:(() => {try{return parent.document ? 'accessible':'missing';}catch(error){return error.name;}})()})`);
      assert.equal(before.parentAccess, 'SecurityError', 'Game can access the benchmark parent');
      assert.equal(before.viewport.width, Number(row.artifact.width) || 390, 'Embedded game width differs from the declared native viewport');
      assert.equal(before.viewport.height, Number(row.artifact.height) || 844, 'Embedded game height differs from the declared native viewport');
      observation.game = { status: 'document-loaded', url: row.artifact.playUrl, before };
      const input = await observeGameInput(context, article);
      observation.game.input = input;
      await delay(400);
      await waitFor(() => observation.requests.every(request => !['Document', 'Script', 'Stylesheet', 'Image', 'Font', 'Fetch', 'XHR'].includes(request.type) || request.finished)
        && Date.now() - (observation.lastRequestAt || 0) >= 250, `${row.id}: boot asset requests settle`, 4000);
      const after = await inspect(`({url:location.href,text:document.body?.innerText?.slice(0,1200) || '',images:[...document.images].map(image => ({url:image.currentSrc || image.src,loaded:image.complete && image.naturalWidth > 0})),overflow:document.documentElement.scrollWidth > innerWidth})`);
      await capture(`${width}-${index + 1}-after-input.png`);
      assert.equal(after.url, row.artifact.playUrl, 'Game navigated away from the frozen artifact');
      const failedAssets = observation.requests.filter(request => ['Document', 'Script', 'Stylesheet', 'Image', 'Font', 'Fetch', 'XHR', 'Media'].includes(request.type) && (request.status >= 400 || request.failure));
      const brokenImages = after.images.filter(image => !image.loaded && image.url);
      const healthFailures = [...failedAssets.map(request => `${request.status || request.failure} ${request.url}`), ...brokenImages.map(image => `Image did not load: ${image.url}`), ...observation.runtimeErrors, ...observation.securityErrors];
      observation.game = { status: healthFailures.length ? 'observed-failure' : 'loaded-and-input-observed', activation: row.reference ? 'ratings-table-play' : 'artifact-play', url: row.artifact.playUrl, before, after, input, failedAssets, healthFailures, assetRequestCount: observation.requests.length, declaredFunctionalFailure: row.declaredFunctionalFailure };
      delete observation.lastRequestAt;
      // Retain a known failed contestant as evidence. A newly broken deployment is not a passing publication.
      if (healthFailures.length && !row.declaredFunctionalFailure) coverageFailures.push(`${row.id}: ${healthFailures.join('; ')}`);
    } catch (error) {
      observation.game = { ...observation.game, status: 'unverified', url: row.artifact.playUrl, error: error.message };
      coverageFailures.push(`${row.id}: ${error.message}`);
    } finally {
      await evaluate(`document.querySelector(${JSON.stringify(`${article} [data-artifact-action="close"]:enabled`)})?.click()`);
      activeObservation = null;
    }
  }
  check('Every published clip advances, including both Ultra outputs', published.filter(row => row.artifact?.videoUrl).every(row => artifactObservations.find(item => item.id === row.id)?.video?.status === 'advancing'));
  check('Every published game has a final-origin input observation or retained observed failure', published.filter(row => row.artifact?.playUrl).every(row => ['loaded-and-input-observed', 'observed-failure'].includes(artifactObservations.find(item => item.id === row.id)?.game?.status)));
  check('No undisclosed artifact delivery or runtime failure', coverageFailures.length === 0, coverageFailures.join('; '));

  // Alter only this isolated browser's runtime data to exercise a hostile URL. No files are changed.
  await evaluate(`(() => { const data = window.VASIR_DATA.games; const id = ${JSON.stringify(initial.firstPlayable)}; data.runs.filter(run => run.configurationId === id).forEach(run => {run.artifact.playUrl = location.origin + '/index.html';}); document.querySelector('.game-models__button[data-model-id="' + CSS.escape(id) + '"]').click(); })()`);
  check('Same-origin game URLs cannot be activated', await evaluate('Array.from(document.querySelectorAll(".game-comparison__pair .game-artifact__actions [data-artifact-action=play]")).every(button => button.disabled) && document.querySelectorAll("iframe").length === 0'));
  check('No browser runtime errors', errors.length === 0, errors.join('; '));
  check('No failed artifact responses', mediaFailures.length === 0, mediaFailures.join('; '));
  if (rehearsal) check('Local rehearsal served only exact pinned files under the production artifact policy', rehearsal.failures.length === 0, JSON.stringify(rehearsal.failures));

  const receipt = { kind: 'vasirbenchmark-games-browser-proof', url: url.href, width, height, checkedAt: new Date().toISOString(), delivery: rehearsalReceipt(), projectionSha256, harnessSha256, presentationFiles, screenshots, checks, ratings: initial.ratings, video: videoStarted, iframe: frameState, child: childProof, fullscreen, coverage: coverageSummary(), artifacts: artifactObservations, coverageFailures, runtimeErrors: errors, mediaFailures, inputClaimBoundary: 'Per-row observations distinguish loaded documents, retained observed failures, and unverified games. Visible controls are preferred; generic surface input does not certify mechanics, winning, recovery, or enjoyment.' };
  fs.writeFileSync(path.join(output, `games-browsercheck-${width}.json`), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  fs.writeFileSync(path.join(output, `games-browsercheck-${width}-failure.json`), `${JSON.stringify({ url: url.href, width, height, delivery: rehearsalReceipt(), checks, error: error.message, coverage: coverageSummary(), artifacts: artifactObservations, coverageFailures, runtimeErrors: errors, mediaFailures }, null, 2)}\n`);
  throw error;
} finally {
  socket?.close();
  const chromeExited = chrome.exitCode !== null || chrome.signalCode !== null
    ? Promise.resolve()
    : new Promise(resolve => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  await Promise.race([chromeExited, delay(2000)]);
  if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGKILL');
  await chromeExited;
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runGamesBrowserCheck();
