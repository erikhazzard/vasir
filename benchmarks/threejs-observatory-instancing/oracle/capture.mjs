import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORACLE_DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = join(ORACLE_DIR, 'index.html');
const OUTPUT_DIR = join(ORACLE_DIR, 'captures', 'pending');
const CHROME_PATH = process.env.OBSERVATORY_CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CAPTURE_TICK = 240;
const READY_TIMEOUT_MS = 30_000;
const CDP_TIMEOUT_MS = 30_000;
const PROFILES = Object.freeze([
  Object.freeze({ id: 'portrait', width: 900, height: 1600, dpr: 1 }),
  Object.freeze({ id: 'landscape', width: 1600, height: 900, dpr: 1 })
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function pngSize(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('Capture did not produce a valid PNG');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function serializeRemoteValues(args = []) {
  return args.map((arg) => {
    if (Object.hasOwn(arg, 'value')) return arg.value;
    if (arg.unserializableValue) return arg.unserializableValue;
    return arg.description || arg.type;
  });
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = new Map();
    this.listeners = new Map();
    this.socket = null;
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolveOpen, rejectOpen) => {
      const timeout = setTimeout(() => rejectOpen(new Error(`Timed out connecting to ${this.url}`)), CDP_TIMEOUT_MS);
      this.socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolveOpen();
      }, { once: true });
      this.socket.addEventListener('error', () => {
        clearTimeout(timeout);
        rejectOpen(new Error(`Failed to connect to ${this.url}`));
      }, { once: true });
    });

    this.socket.addEventListener('message', (event) => this.#onMessage(event.data));
    this.socket.addEventListener('close', () => {
      for (const { reject, timeout } of this.pending.values()) {
        clearTimeout(timeout);
        reject(new Error('CDP socket closed before the command completed'));
      }
      this.pending.clear();
    });
  }

  #onMessage(raw) {
    const message = JSON.parse(raw);
    if (message.id) {
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      clearTimeout(request.timeout);
      if (message.error) {
        request.reject(new Error(`${request.method}: ${message.error.message}`));
      } else {
        request.resolve(message.result);
      }
      return;
    }

    if (!message.method) return;
    for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    const waiter = this.waiters.get(message.method);
    if (waiter) {
      this.waiters.delete(message.method);
      clearTimeout(waiter.timeout);
      waiter.resolve(message.params || {});
    }
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  once(method, timeoutMs = CDP_TIMEOUT_MS) {
    if (this.waiters.has(method)) throw new Error(`Already waiting for ${method}`);
    return new Promise((resolveEvent, rejectEvent) => {
      const timeout = setTimeout(() => {
        this.waiters.delete(method);
        rejectEvent(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      this.waiters.set(method, { resolve: resolveEvent, reject: rejectEvent, timeout });
    });
  }

  send(method, params = {}, timeoutMs = CDP_TIMEOUT_MS) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolveCommand, rejectCommand) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectCommand(new Error(`Timed out running ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timeout, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket?.close();
  }
}

async function startStaticServer() {
  const root = resolve(ORACLE_DIR);
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const candidate = resolve(root, `.${pathname}`);
      const pathFromRoot = relative(root, candidate);
      if (pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === '..' || isAbsolute(pathFromRoot)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const fileStat = await stat(candidate);
      if (!fileStat.isFile()) throw new Error('Not a file');
      const content = await readFile(candidate);
      const contentTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png'
      };
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': contentTypes[extname(candidate)] || 'application/octet-stream'
      });
      response.end(content);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Static server did not expose a TCP port');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    })
  };
}

async function launchChrome(profileDir) {
  const child = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--force-color-profile=srgb',
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  const websocketUrl = await new Promise((resolveUrl, rejectUrl) => {
    const timeout = setTimeout(() => rejectUrl(new Error(`Chrome did not expose CDP. ${stderr.slice(-1000)}`)), CDP_TIMEOUT_MS);
    const onExit = (code, signal) => {
      clearTimeout(timeout);
      rejectUrl(new Error(`Chrome exited before CDP was ready (${code ?? signal}). ${stderr.slice(-1000)}`));
    };
    child.once('exit', onExit);
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timeout);
      child.off('exit', onExit);
      resolveUrl(match[1]);
    });
  });

  const port = Number(new URL(websocketUrl).port);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid CDP port in ${websocketUrl}`);
  const versionResponse = await fetch(`http://127.0.0.1:${port}/json/version`);
  if (!versionResponse.ok) throw new Error(`Could not read Chrome version: ${versionResponse.status}`);
  const version = await versionResponse.json();

  return {
    child,
    port,
    version,
    stderr: () => stderr,
    async close() {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveExit) => child.once('exit', resolveExit)),
        new Promise((resolveTimeout) => setTimeout(resolveTimeout, 5_000))
      ]);
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
  };
}

async function createTarget(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Could not create Chrome target: ${response.status}`);
  return response.json();
}

async function closeTarget(port, id) {
  await fetch(`http://127.0.0.1:${port}/json/close/${encodeURIComponent(id)}`);
}

async function captureOnce(chrome, origin, profile, repetition) {
  const target = await createTarget(chrome.port);
  const client = new CdpClient(target.webSocketDebuggerUrl);
  const runtimeExceptions = [];
  const consoleMessages = [];
  const logEntries = [];

  try {
    await client.connect();
    client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      runtimeExceptions.push({
        text: exceptionDetails?.text || 'Runtime exception',
        description: exceptionDetails?.exception?.description || null,
        url: exceptionDetails?.url || null,
        lineNumber: exceptionDetails?.lineNumber ?? null,
        columnNumber: exceptionDetails?.columnNumber ?? null
      });
    });
    client.on('Runtime.consoleAPICalled', ({ type, args }) => {
      if (!['error', 'warning', 'assert'].includes(type)) return;
      consoleMessages.push({ type, values: serializeRemoteValues(args) });
    });
    client.on('Log.entryAdded', ({ entry }) => {
      if (!entry || !['error', 'warning'].includes(entry.level)) return;
      logEntries.push({ level: entry.level, source: entry.source, text: entry.text, url: entry.url || null });
    });

    await Promise.all([
      client.send('Page.enable'),
      client.send('Runtime.enable'),
      client.send('Log.enable')
    ]);
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `Object.defineProperty(globalThis, '__MOONLIT_CAPTURE_TICK__', { value: ${CAPTURE_TICK}, configurable: false, writable: false });`
    });
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: profile.width,
      height: profile.height,
      deviceScaleFactor: profile.dpr,
      mobile: false,
      screenWidth: profile.width,
      screenHeight: profile.height,
      positionX: 0,
      positionY: 0
    });

    const loaded = client.once('Page.loadEventFired', READY_TIMEOUT_MS);
    const navigation = await client.send('Page.navigate', { url: `${origin}/index.html` });
    if (navigation.errorText) throw new Error(`Navigation failed: ${navigation.errorText}`);
    await loaded;

    const readyResult = await client.send('Runtime.evaluate', {
      expression: `new Promise((resolve, reject) => {
        if (document.documentElement.dataset.ready === 'true') { resolve(true); return; }
        const timeout = setTimeout(() => { observer.disconnect(); reject(new Error('Timed out waiting for data-ready')); }, ${READY_TIMEOUT_MS});
        const observer = new MutationObserver(() => {
          if (document.documentElement.dataset.ready !== 'true') return;
          clearTimeout(timeout);
          observer.disconnect();
          resolve(true);
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ready'] });
      })`,
      awaitPromise: true,
      returnByValue: true
    }, READY_TIMEOUT_MS + 5_000);
    if (readyResult.exceptionDetails || readyResult.result?.value !== true) {
      throw new Error('Oracle did not reach data-ready');
    }

    const observationResult = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const canvas = document.querySelector('.observatory-stage');
        const canvases = Array.from(document.querySelectorAll('canvas'));
        const displayedCanvases = canvases.filter((candidate) => {
          const rect = candidate.getBoundingClientRect();
          const style = getComputedStyle(candidate);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        });
        const rect = canvas.getBoundingClientRect();
        const api = window.__moonlitObservatory;
        const gl = api.renderer.getContext();
        gl.finish();
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          ready: document.documentElement.dataset.ready,
          captureTick: canvas.dataset.captureTick,
          innerWidth,
          innerHeight,
          devicePixelRatio,
          canvasCount: canvases.length,
          displayedCanvasCount: displayedCanvases.length,
          canvasRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          canvasBuffer: { width: canvas.width, height: canvas.height },
          datasets: { ...canvas.dataset },
          workload: {
            seed: api.seed,
            totalMarkers: api.totalMarkers,
            markersPerFamily: api.markersPerFamily,
            familyCount: api.familyCount,
            rippleCount: api.rippleCount,
            fixedHz: api.fixedHz,
            worldRenderScale: api.worldRenderScale,
            markerMeshCount: api.markerMeshes.length,
            outlinePassCount: api.outlinePasses.length
          },
          renderer: {
            threeRevision: api.threeRevision,
            webglVersion: gl instanceof WebGL2RenderingContext ? 2 : 1,
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
            unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null
          },
          pngDataUrl: canvas.toDataURL('image/png')
        };
      })()`,
      returnByValue: true
    });
    if (observationResult.exceptionDetails || !observationResult.result?.value) {
      const description = observationResult.exceptionDetails?.exception?.description || 'unknown observation failure';
      throw new Error(`Could not inspect oracle canvas: ${description}`);
    }

    const observation = observationResult.result.value;
    const prefix = 'data:image/png;base64,';
    if (!observation.pngDataUrl.startsWith(prefix)) throw new Error('Canvas did not return a PNG data URL');
    const png = Buffer.from(observation.pngDataUrl.slice(prefix.length), 'base64');
    delete observation.pngDataUrl;
    const dimensions = pngSize(png);
    return {
      profile,
      repetition,
      png,
      observation,
      pngSha256: sha256(png),
      pngBytes: png.length,
      pngDimensions: dimensions,
      diagnostics: { runtimeExceptions, consoleMessages, logEntries }
    };
  } finally {
    client.close();
    await closeTarget(chrome.port, target.id);
  }
}

function expectedWorldBuffer(profile) {
  return `${Math.max(1, Math.round(profile.width * 0.67))}x${Math.max(1, Math.round(profile.height * 0.67))}`;
}

function assertHealthy(first, second) {
  const { profile, observation, pngDimensions, diagnostics } = first;
  const failures = [];
  const closeEnough = (left, right) => Math.abs(left - right) < 0.01;

  if (observation.ready !== 'true') failures.push('document was not ready');
  if (observation.captureTick !== String(CAPTURE_TICK)) failures.push('capture tick drifted');
  if (observation.innerWidth !== profile.width || observation.innerHeight !== profile.height) failures.push('viewport dimensions drifted');
  if (observation.devicePixelRatio !== profile.dpr) failures.push('DPR drifted');
  if (observation.canvasCount !== 1 || observation.displayedCanvasCount !== 1) failures.push('expected exactly one displayed canvas');
  if (!closeEnough(observation.canvasRect.x, 0) || !closeEnough(observation.canvasRect.y, 0)
    || !closeEnough(observation.canvasRect.width, profile.width) || !closeEnough(observation.canvasRect.height, profile.height)) {
    failures.push('displayed canvas did not fill the requested viewport');
  }
  if (observation.canvasBuffer.width !== profile.width || observation.canvasBuffer.height !== profile.height) failures.push('canvas buffer dimensions drifted');
  if (observation.datasets.outputBuffer !== `${profile.width}x${profile.height}`) failures.push('output-buffer receipt drifted');
  if (observation.datasets.worldBuffer !== expectedWorldBuffer(profile)) failures.push('world-buffer receipt drifted');
  if (observation.workload.seed !== 424242
    || observation.workload.totalMarkers !== 1200
    || observation.workload.markersPerFamily !== 240
    || observation.workload.familyCount !== 5
    || observation.workload.rippleCount !== 64
    || observation.workload.fixedHz !== 60
    || observation.workload.worldRenderScale !== 0.67) {
    failures.push('workload contract drifted');
  }
  if (pngDimensions.width !== profile.width || pngDimensions.height !== profile.height) failures.push('PNG dimensions drifted');
  if (diagnostics.runtimeExceptions.length || diagnostics.consoleMessages.some(({ type }) => ['error', 'assert'].includes(type))
    || diagnostics.logEntries.some(({ level }) => level === 'error')) {
    failures.push('browser reported a runtime or error-level diagnostic');
  }
  if (first.pngSha256 !== second.pngSha256) failures.push('fresh-target repeat was not byte-identical');
  if (failures.length) {
    throw new Error(`${profile.id} capture failed: ${failures.join('; ')}\n${JSON.stringify(diagnostics, null, 2)}`);
  }
}

async function main() {
  const source = await readFile(SOURCE_PATH);
  const sourceSha256 = sha256(source);
  const temporaryProfile = await mkdtemp(join(tmpdir(), 'threejs-observatory-capture-'));
  const server = await startStaticServer();
  let chrome;

  try {
    chrome = await launchChrome(temporaryProfile);
    const captures = [];
    for (const profile of PROFILES) {
      const first = await captureOnce(chrome, server.origin, profile, 1);
      const second = await captureOnce(chrome, server.origin, profile, 2);
      assertHealthy(first, second);
      captures.push({ first, second });
    }

    await mkdir(OUTPUT_DIR, { recursive: true });
    const profileReceipts = [];
    for (const { first, second } of captures) {
      const filename = `${first.profile.id}-tick-${String(CAPTURE_TICK).padStart(4, '0')}.png`;
      await writeFile(join(OUTPUT_DIR, filename), first.png);
      profileReceipts.push({
        id: first.profile.id,
        file: filename,
        requested: first.profile,
        png: {
          sha256: first.pngSha256,
          bytes: first.pngBytes,
          width: first.pngDimensions.width,
          height: first.pngDimensions.height,
          repeatSha256: second.pngSha256,
          byteIdenticalFreshTargetRepeat: first.pngSha256 === second.pngSha256
        },
        observation: first.observation,
        diagnostics: first.diagnostics
      });
    }

    const manifest = {
      kind: 'threejs-observatory-visual-oracle-pending',
      approval: 'pending-human-review',
      captureTick: CAPTURE_TICK,
      source: { file: 'index.html', sha256: sourceSha256 },
      browser: {
        product: chrome.version.Browser,
        protocolVersion: chrome.version['Protocol-Version'],
        userAgent: chrome.version['User-Agent'],
        jsVersion: chrome.version['V8-Version'],
        webkitVersion: chrome.version['WebKit-Version']
      },
      profiles: profileReceipts,
      objectiveVerdict: 'green',
      objectiveClaimBoundary: 'Deterministic local Chrome canvas artifact health only; visual acceptance remains human and performance is not measured.'
    };
    await writeFile(join(OUTPUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

    process.stdout.write(`${JSON.stringify({
      status: 'pending-human-review',
      sourceSha256,
      outputDirectory: OUTPUT_DIR,
      captures: profileReceipts.map(({ id, file, png }) => ({ id, file, sha256: png.sha256, repeatStable: png.byteIdenticalFreshTargetRepeat }))
    }, null, 2)}\n`);
  } finally {
    await server.close();
    await chrome?.close();
    await rm(temporaryProfile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
