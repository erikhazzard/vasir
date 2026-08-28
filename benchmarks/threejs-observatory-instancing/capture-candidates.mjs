import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HARNESS_PATH = fileURLToPath(import.meta.url);
const BENCHMARK_DIR = dirname(HARNESS_PATH);
const REPO_ROOT = resolve(BENCHMARK_DIR, '..', '..');
const RUNS_ROOT = join(REPO_ROOT, '.agents', 'vasir-evals', 'threejs-observatory-instancing');
const CHROME_PATH = process.env.OBSERVATORY_CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CAPTURE_TICK = 240;
const READY_TIMEOUT_MS = 30_000;
const CDP_TIMEOUT_MS = 30_000;
const PROFILES = Object.freeze([
  Object.freeze({ id: 'portrait', width: 900, height: 1600, dpr: 1 }),
  Object.freeze({ id: 'landscape', width: 1600, height: 900, dpr: 1 })
]);

function usage() {
  return [
    'Usage:',
    '  node benchmarks/threejs-observatory-instancing/capture-candidates.mjs --run-id <opaque-run-id>',
    '  node benchmarks/threejs-observatory-instancing/capture-candidates.mjs --run-dir <exact-run-directory>',
    '',
    `Run directories must be direct children of ${RUNS_ROOT}.`
  ].join('\n');
}

function parseArguments(args) {
  if (args.length === 1 && ['-h', '--help'].includes(args[0])) return { help: true };
  if (args.length !== 2 || !['--run-id', '--run-dir'].includes(args[0]) || !args[1]) {
    throw new Error(usage());
  }

  if (args[0] === '--run-id') {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(args[1]) || ['.', '..'].includes(args[1])) {
      throw new Error('Run ID must be one opaque path-safe segment.');
    }
    return { help: false, requestedRunDirectory: join(RUNS_ROOT, args[1]) };
  }

  return {
    help: false,
    requestedRunDirectory: isAbsolute(args[1]) ? args[1] : resolve(process.cwd(), args[1])
  };
}

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

function isPathInside(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot !== ''
    && pathFromRoot !== '..'
    && !pathFromRoot.startsWith(`..${sep}`)
    && !isAbsolute(pathFromRoot);
}

async function resolveRunDirectory(requestedRunDirectory) {
  const [runsRoot, runDirectory] = await Promise.all([
    realpath(RUNS_ROOT),
    realpath(requestedRunDirectory)
  ]);
  const runStat = await stat(runDirectory);
  if (!runStat.isDirectory()) throw new Error(`Run path is not a directory: ${runDirectory}`);
  if (!isPathInside(runsRoot, runDirectory) || dirname(runDirectory) !== runsRoot) {
    throw new Error(`Run directory must be one direct child of ${runsRoot}`);
  }
  return { runsRoot, runDirectory, runId: basename(runDirectory) };
}

async function discoverCandidates(runDirectory) {
  const candidatesRoot = await realpath(join(runDirectory, 'candidates'));
  if (!isPathInside(runDirectory, candidatesRoot)) {
    throw new Error('Candidates directory resolved outside the exact run directory.');
  }

  const entries = await readdir(candidatesRoot, { withFileTypes: true });
  const candidateEntries = entries.filter((entry) => entry.isDirectory()).sort((left, right) => left.name.localeCompare(right.name));
  if (candidateEntries.length !== 2) {
    throw new Error(`Expected exactly two anonymous candidate directories, found ${candidateEntries.length}.`);
  }

  const candidates = [];
  for (const entry of candidateEntries) {
    const candidateDirectory = await realpath(join(candidatesRoot, entry.name));
    const workspaceDirectory = await realpath(join(candidateDirectory, 'workspace'));
    const sourcePath = await realpath(join(workspaceDirectory, 'index.html'));
    if (!isPathInside(candidatesRoot, candidateDirectory)
      || !isPathInside(candidateDirectory, workspaceDirectory)
      || !isPathInside(workspaceDirectory, sourcePath)) {
      throw new Error(`Candidate ${entry.name} resolves outside its anonymous workspace.`);
    }
    const [workspaceStat, sourceStat] = await Promise.all([stat(workspaceDirectory), stat(sourcePath)]);
    if (!workspaceStat.isDirectory() || !sourceStat.isFile()) {
      throw new Error(`Candidate ${entry.name} must contain workspace/index.html.`);
    }
    candidates.push({ id: entry.name, workspaceDirectory, sourcePath });
  }
  return candidates;
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

async function startStaticServer(workspaceDirectory) {
  const root = resolve(workspaceDirectory);
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

async function launchChrome(profileDirectory) {
  const child = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDirectory}`,
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
      expression: `new Promise((resolveReady, rejectReady) => {
        if (document.documentElement.dataset.ready === 'true') { resolveReady(true); return; }
        const timeout = setTimeout(() => {
          observer.disconnect();
          rejectReady(new Error('Timed out waiting for data-ready'));
        }, ${READY_TIMEOUT_MS});
        const observer = new MutationObserver(() => {
          if (document.documentElement.dataset.ready !== 'true') return;
          clearTimeout(timeout);
          observer.disconnect();
          resolveReady(true);
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ready'] });
      })`,
      awaitPromise: true,
      returnByValue: true
    }, READY_TIMEOUT_MS + 5_000);
    if (readyResult.exceptionDetails || readyResult.result?.value !== true) {
      throw new Error('Candidate did not reach data-ready');
    }

    const observationResult = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const canvases = Array.from(document.querySelectorAll('canvas'));
        const displayedCanvases = canvases.filter((candidate) => {
          const rect = candidate.getBoundingClientRect();
          const style = getComputedStyle(candidate);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        });
        const expectedCanvas = document.querySelector('canvas.observatory-stage');
        const canvas = expectedCanvas || displayedCanvases[0] || canvases[0];
        if (!canvas) throw new Error('No canvas exists');
        const rect = canvas.getBoundingClientRect();
        const api = window.__moonlitObservatory;
        if (!api) throw new Error('window.__moonlitObservatory is unavailable');
        const gl = api.renderer?.getContext?.() || canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) throw new Error('WebGL context is unavailable');
        gl.finish();
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

        const markerObjects = Array.isArray(api.markerMeshes)
          ? api.markerMeshes.filter((object) => object && (object.isMesh || object.isInstancedMesh))
          : [];
        const markerLogicalCount = markerObjects.length
          ? markerObjects.reduce((total, object) => total + (object.isInstancedMesh ? object.count : 1), 0)
          : null;
        const markerObjectFamilyIndexes = markerObjects
          .map((object) => object.userData?.familyIndex)
          .filter((familyIndex) => Number.isInteger(familyIndex));
        const observedFamilyCount = markerObjectFamilyIndexes.length
          ? new Set(markerObjectFamilyIndexes).size
          : null;

        return {
          ready: document.documentElement.dataset.ready,
          captureTick: canvas.dataset.captureTick,
          innerWidth,
          innerHeight,
          devicePixelRatio,
          canvasCount: canvases.length,
          displayedCanvasCount: displayedCanvases.length,
          expectedCanvasPresent: expectedCanvas === canvas,
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
            markerRenderableCount: markerObjects.length,
            markerLogicalCount,
            observedFamilyCount,
            instancedMarkerRenderableCount: markerObjects.filter((object) => object.isInstancedMesh).length,
            markerInstanceCounts: markerObjects.filter((object) => object.isInstancedMesh).map((object) => object.count)
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
      throw new Error(`Could not inspect candidate canvas: ${description}`);
    }

    const observation = observationResult.result.value;
    const prefix = 'data:image/png;base64,';
    if (!observation.pngDataUrl.startsWith(prefix)) throw new Error('Canvas did not return a PNG data URL');
    const png = Buffer.from(observation.pngDataUrl.slice(prefix.length), 'base64');
    delete observation.pngDataUrl;
    return {
      profile,
      repetition,
      png,
      observation,
      pngSha256: sha256(png),
      pngBytes: png.length,
      pngDimensions: pngSize(png),
      diagnostics: { runtimeExceptions, consoleMessages, logEntries }
    };
  } catch (error) {
    error.captureDiagnostics = { runtimeExceptions, consoleMessages, logEntries };
    throw error;
  } finally {
    client.close();
    await closeTarget(chrome.port, target.id);
  }
}

function expectedWorldBuffer(profile) {
  return `${Math.max(1, Math.round(profile.width * 0.67))}x${Math.max(1, Math.round(profile.height * 0.67))}`;
}

function healthFailures(first, second) {
  const { profile, observation, pngDimensions, diagnostics } = first;
  const failures = [];
  const closeEnough = (left, right) => Math.abs(left - right) < 0.01;

  if (observation.ready !== 'true') failures.push('document was not ready');
  if (observation.captureTick !== String(CAPTURE_TICK)) failures.push('capture tick drifted');
  if (observation.innerWidth !== profile.width || observation.innerHeight !== profile.height) failures.push('viewport dimensions drifted');
  if (observation.devicePixelRatio !== profile.dpr) failures.push('DPR drifted');
  if (observation.canvasCount !== 1 || observation.displayedCanvasCount !== 1) failures.push('expected exactly one displayed canvas');
  if (!observation.expectedCanvasPresent) failures.push('required observatory stage canvas is missing');
  if (!closeEnough(observation.canvasRect.x, 0) || !closeEnough(observation.canvasRect.y, 0)
    || !closeEnough(observation.canvasRect.width, profile.width) || !closeEnough(observation.canvasRect.height, profile.height)) {
    failures.push('displayed canvas did not fill the requested viewport');
  }
  if (observation.canvasBuffer.width !== profile.width || observation.canvasBuffer.height !== profile.height) {
    failures.push('canvas buffer dimensions drifted');
  }
  if (observation.datasets.outputBuffer !== `${profile.width}x${profile.height}`) failures.push('output-buffer receipt drifted');
  if (observation.datasets.worldBuffer !== expectedWorldBuffer(profile)) failures.push('world-buffer receipt drifted');
  if (observation.workload.seed !== 424242
    || observation.workload.totalMarkers !== 1200
    || observation.workload.markersPerFamily !== 240
    || observation.workload.familyCount !== 5
    || observation.workload.rippleCount !== 64
    || observation.workload.fixedHz !== 60
    || observation.workload.worldRenderScale !== 0.67) {
    failures.push('declared workload contract drifted');
  }
  if (observation.workload.markerRenderableCount !== 5
    || observation.workload.instancedMarkerRenderableCount !== 5
    || observation.workload.markerInstanceCounts.length !== 5
    || observation.workload.markerInstanceCounts.some((count) => count !== 240)) {
    failures.push('marker transformation is not exactly five InstancedMesh groups of 240');
  }
  if (observation.workload.markerLogicalCount !== 1200) failures.push('observable marker workload did not contain 1,200 markers');
  if (observation.workload.observedFamilyCount !== 5) failures.push('observable marker workload did not contain five families');
  if (pngDimensions.width !== profile.width || pngDimensions.height !== profile.height) failures.push('PNG dimensions drifted');
  if (diagnostics.runtimeExceptions.length
    || diagnostics.consoleMessages.some(({ type }) => ['error', 'assert'].includes(type))
    || diagnostics.logEntries.some(({ level }) => level === 'error')) {
    failures.push('browser reported a runtime or error-level diagnostic');
  }
  if (!second) {
    failures.push('fresh-target repeat did not complete');
  } else if (first.pngSha256 !== second.pngSha256) {
    failures.push('fresh-target repeat was not byte-identical');
  }
  return failures;
}

function serializeCaptureError(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    diagnostics: error?.captureDiagnostics || { runtimeExceptions: [], consoleMessages: [], logEntries: [] }
  };
}

async function captureCandidate(chrome, candidate) {
  const source = await readFile(candidate.sourcePath);
  const sourceSha256 = sha256(source);
  const server = await startStaticServer(candidate.workspaceDirectory);
  const profileResults = [];

  try {
    for (const profile of PROFILES) {
      let first = null;
      let second = null;
      let captureError = null;
      try {
        first = await captureOnce(chrome, server.origin, profile, 1);
        second = await captureOnce(chrome, server.origin, profile, 2);
      } catch (error) {
        captureError = serializeCaptureError(error);
      }

      if (!first) {
        profileResults.push({
          id: profile.id,
          requested: profile,
          png: null,
          observation: null,
          diagnostics: captureError?.diagnostics || { runtimeExceptions: [], consoleMessages: [], logEntries: [] },
          failures: [`capture did not complete: ${captureError?.message || 'unknown error'}`]
        });
        continue;
      }

      const failures = healthFailures(first, second);
      if (captureError) failures.push(`fresh-target repeat failed: ${captureError.message}`);
      profileResults.push({
        id: profile.id,
        requested: profile,
        pngBuffer: first.png,
        png: {
          sha256: first.pngSha256,
          bytes: first.pngBytes,
          width: first.pngDimensions.width,
          height: first.pngDimensions.height,
          repeatSha256: second?.pngSha256 || null,
          byteIdenticalFreshTargetRepeat: Boolean(second && first.pngSha256 === second.pngSha256)
        },
        observation: first.observation,
        diagnostics: first.diagnostics,
        repeatFailure: captureError,
        failures
      });
    }
  } finally {
    await server.close();
  }

  const failures = profileResults.flatMap((profileResult) => profileResult.failures.map((failure) => `${profileResult.id}: ${failure}`));
  return {
    id: candidate.id,
    source: {
      file: `candidates/${candidate.id}/workspace/index.html`,
      sha256: sourceSha256,
      bytes: source.length
    },
    profileResults,
    objectiveVerdict: failures.length ? 'red' : 'green',
    failures
  };
}

async function assertReviewDestinationEmpty(reviewDirectory) {
  await mkdir(reviewDirectory, { recursive: true });
  const entries = await readdir(reviewDirectory);
  if (entries.length) {
    throw new Error(`Review directory already contains evidence and will not be overwritten: ${reviewDirectory}`);
  }
}

async function writeReviewArtifacts(runDirectory, runId, harnessSha256, chrome, candidateResults) {
  const reviewDirectory = join(runDirectory, 'review');
  await assertReviewDestinationEmpty(reviewDirectory);
  const browser = {
    product: chrome.version.Browser,
    protocolVersion: chrome.version['Protocol-Version'],
    userAgent: chrome.version['User-Agent'],
    jsVersion: chrome.version['V8-Version'],
    webkitVersion: chrome.version['WebKit-Version']
  };
  const candidateReceipts = [];

  for (const candidateResult of candidateResults) {
    const candidateReviewDirectory = join(reviewDirectory, candidateResult.id);
    await mkdir(candidateReviewDirectory, { recursive: false });
    const profileReceipts = [];

    for (const profileResult of candidateResult.profileResults) {
      const file = profileResult.pngBuffer ? `${profileResult.id}.png` : null;
      if (file) await writeFile(join(candidateReviewDirectory, file), profileResult.pngBuffer);
      profileReceipts.push({
        id: profileResult.id,
        file,
        requested: profileResult.requested,
        png: profileResult.png,
        observation: profileResult.observation,
        diagnostics: profileResult.diagnostics,
        repeatFailure: profileResult.repeatFailure || null,
        failures: profileResult.failures
      });
    }

    const healthReceipt = {
      kind: 'threejs-observatory-anonymous-candidate-health',
      runId,
      candidateId: candidateResult.id,
      captureTick: CAPTURE_TICK,
      source: candidateResult.source,
      browser,
      profiles: profileReceipts,
      objectiveVerdict: candidateResult.objectiveVerdict,
      failures: candidateResult.failures,
      objectiveClaimBoundary: 'Anonymous candidate browser artifact health and frozen workload contract only; this receipt makes no aesthetic, topology, condition-identity, or performance judgment.'
    };
    await writeFile(join(candidateReviewDirectory, 'health.json'), `${JSON.stringify(healthReceipt, null, 2)}\n`);
    candidateReceipts.push({
      id: candidateResult.id,
      source: candidateResult.source,
      health: `${candidateResult.id}/health.json`,
      captures: Object.fromEntries(profileReceipts.map(({ id, file, png }) => [id, file ? {
        file: `${candidateResult.id}/${file}`,
        sha256: png.sha256,
        repeatStable: png.byteIdenticalFreshTargetRepeat
      } : null])),
      objectiveVerdict: candidateResult.objectiveVerdict,
      failures: candidateResult.failures
    });
  }

  const allGreen = candidateResults.every(({ objectiveVerdict }) => objectiveVerdict === 'green');
  const manifest = {
    kind: 'threejs-observatory-anonymous-candidate-review',
    runId,
    anonymity: {
      candidateIds: candidateResults.map(({ id }) => id),
      conditionMappingRead: false,
      conditionIdentityPublished: false
    },
    captureTick: CAPTURE_TICK,
    profiles: PROFILES,
    harness: {
      file: relative(REPO_ROOT, HARNESS_PATH),
      sha256: harnessSha256
    },
    browser,
    candidates: candidateReceipts,
    objectiveVerdict: allGreen ? 'green' : 'red',
    objectiveClaimBoundary: 'Public anonymous browser captures and health receipts only; visual equivalence remains a separate human decision, and condition identity, topology, and performance remain unexamined.'
  };
  await writeFile(join(reviewDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { reviewDirectory, manifest };
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const [{ runDirectory, runId }, harnessSource] = await Promise.all([
    resolveRunDirectory(parsed.requestedRunDirectory),
    readFile(HARNESS_PATH)
  ]);
  const candidates = await discoverCandidates(runDirectory);
  const temporaryProfile = await mkdtemp(join(tmpdir(), 'threejs-observatory-candidates-'));
  let chrome;

  try {
    chrome = await launchChrome(temporaryProfile);
    const candidateResults = [];
    for (const candidate of candidates) candidateResults.push(await captureCandidate(chrome, candidate));
    const { reviewDirectory, manifest } = await writeReviewArtifacts(
      runDirectory,
      runId,
      sha256(harnessSource),
      chrome,
      candidateResults
    );

    process.stdout.write(`${JSON.stringify({
      status: manifest.objectiveVerdict === 'green' ? 'candidate-capture-objectively-green' : 'candidate-capture-objectively-red',
      runId,
      reviewDirectory,
      conditionMappingRead: false,
      candidates: manifest.candidates.map(({ id, source, captures, objectiveVerdict, failures }) => ({
        id,
        sourceSha256: source.sha256,
        captures,
        objectiveVerdict,
        failures
      }))
    }, null, 2)}\n`);
    if (manifest.objectiveVerdict !== 'green') process.exitCode = 1;
  } finally {
    await chrome?.close();
    await rm(temporaryProfile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
