import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';

import { invariant } from './contract.mjs';

const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.wasm', 'application/wasm']
]);

function pathIsInside(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === '' || (pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`));
}

export async function startVariantServer(variants) {
  const roots = new Map();
  for (const [id, directory] of variants) roots.set(id, await realpath(directory));
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      invariant(segments[0] === 'variant' && segments[1], 'Unknown route.');
      const root = roots.get(segments[1]);
      invariant(root, 'Unknown variant.');
      const relativePath = normalize(segments.slice(2).join('/') || 'index.html');
      const target = resolve(root, relativePath);
      invariant(pathIsInside(root, target), 'Path escaped variant root.');
      const fileStat = await stat(target);
      invariant(fileStat.isFile(), 'Not a file.');
      response.writeHead(200, {
        'Content-Type': MIME.get(extname(target).toLowerCase()) || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      });
      response.end(await readFile(target));
    } catch (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(`Not found: ${error.message}`);
    }
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    urlFor(id, query = '') {
      return `http://127.0.0.1:${address.port}/variant/${encodeURIComponent(id)}/index.html${query}`;
    },
    close: () => new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()))
  };
}

export class CdpClient {
  constructor(websocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(websocketUrl);
    this.opened = new Promise((resolveOpen, rejectOpen) => {
      this.socket.addEventListener('open', resolveOpen, { once: true });
      this.socket.addEventListener('error', () => rejectOpen(new Error('CDP WebSocket failed to open.')), { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    });
    this.socket.addEventListener('close', () => {
      for (const request of this.pending.values()) request.reject(new Error('CDP socket closed before reply.'));
      this.pending.clear();
    });
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(listener);
    return () => this.listeners.get(method)?.delete(listener);
  }

  async send(method, params = {}, timeoutMs = 120_000) {
    await this.opened;
    const id = this.nextId++;
    return new Promise((resolveRequest, rejectRequest) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectRequest(new Error(`${method} timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
      this.pending.set(id, {
        method,
        resolve: (value) => { clearTimeout(timeout); resolveRequest(value); },
        reject: (error) => { clearTimeout(timeout); rejectRequest(error); }
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, { awaitPromise = true, timeoutMs = 120_000 } = {}) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
      userGesture: false
    }, timeoutMs);
    if (result.exceptionDetails) {
      const text = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      throw new Error(`Browser evaluation failed: ${text}`);
    }
    return result.result?.value;
  }

  close() {
    this.socket.close();
  }
}

async function waitForPageTarget(port, timeoutMs = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const target = targets.find((entry) => entry.type === 'page');
      if (target?.webSocketDebuggerUrl) return target;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error('Chrome did not expose a page CDP target.');
}

export async function launchChrome({ viewport = { width: 1600, height: 900, dpr: 1 } } = {}) {
  const userDataDirectory = await mkdtemp(join(tmpdir(), 'vasir-water-ripples-chrome-'));
  const chromePath = process.env.WATER_RIPPLES_CHROME_PATH || DEFAULT_CHROME;
  const args = [
    '--headless=new',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDirectory}`,
    `--window-size=${viewport.width},${viewport.height}`,
    `--force-device-scale-factor=${viewport.dpr}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--force-color-profile=srgb',
    'about:blank'
  ];
  const processHandle = spawn(chromePath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  let browserWebsocketUrl = null;
  const listening = new Promise((resolveListening, rejectListening) => {
    const timeout = setTimeout(() => rejectListening(new Error(`Chrome CDP startup timed out. ${stderr.slice(-1000)}`)), 30_000);
    processHandle.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match && !browserWebsocketUrl) {
        browserWebsocketUrl = match[1];
        clearTimeout(timeout);
        resolveListening();
      }
    });
    processHandle.once('exit', (code, signal) => {
      clearTimeout(timeout);
      rejectListening(new Error(`Chrome exited before CDP was ready (${code ?? signal}). ${stderr.slice(-1000)}`));
    });
  });
  await listening;
  const parsed = new URL(browserWebsocketUrl);
  const target = await waitForPageTarget(Number(parsed.port));
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await Promise.all([
    client.send('Page.enable'),
    client.send('Runtime.enable'),
    client.send('Log.enable'),
    client.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.dpr,
      mobile: false,
      screenWidth: viewport.width,
      screenHeight: viewport.height
    })
  ]);
  return {
    client,
    stderr: () => stderr,
    async close() {
      client.close();
      processHandle.kill('SIGTERM');
      await new Promise((resolveExit) => {
        const timeout = setTimeout(() => { processHandle.kill('SIGKILL'); resolveExit(); }, 2_000);
        processHandle.once('exit', () => { clearTimeout(timeout); resolveExit(); });
      });
      await rm(userDataDirectory, { recursive: true, force: true });
    }
  };
}

export async function navigateAndWait(client, url, { timeoutMs = 60_000 } = {}) {
  const runtimeErrors = [];
  const consoleErrors = [];
  const stopException = client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    runtimeErrors.push(exceptionDetails.exception?.description || exceptionDetails.text || 'Unknown runtime exception');
  });
  const stopLog = client.on('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'error') consoleErrors.push(entry.text);
  });
  try {
    const loaded = new Promise((resolveLoaded) => {
      const stop = client.on('Page.loadEventFired', () => { stop(); resolveLoaded(); });
    });
    await client.send('Page.navigate', { url });
    await Promise.race([
      loaded,
      new Promise((_, rejectWait) => setTimeout(() => rejectWait(new Error(`Page load timed out: ${url}`)), timeoutMs))
    ]);
    const ready = await client.evaluate(`(async () => {
      const deadline = performance.now() + ${timeoutMs};
      while (performance.now() < deadline) {
        const hook = window.__waterRipplesBenchmark;
        if (hook) {
          if (hook.ready && typeof hook.ready.then === 'function') await hook.ready;
          if (hook.ready !== false) return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      throw new Error('window.__waterRipplesBenchmark was not ready before timeout.');
    })()`, { timeoutMs: timeoutMs + 5_000 });
    return {
      ready,
      runtimeErrors,
      consoleErrors,
      stopCapture() { stopException(); stopLog(); }
    };
  } catch (error) {
    stopException();
    stopLog();
    throw error;
  }
}

export async function capturePng(client) {
  const result = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  return result.data;
}
