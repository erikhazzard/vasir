import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { arch, cpus, platform, release, tmpdir, totalmem } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HARNESS_PATH = fileURLToPath(import.meta.url);
const BENCHMARK_DIR = dirname(HARNESS_PATH);
const REPO_ROOT = resolve(BENCHMARK_DIR, '..', '..');
const RUNS_ROOT = join(REPO_ROOT, '.agents', 'vasir-evals', 'threejs-observatory-instancing');
const FIXTURE_PATH = join(BENCHMARK_DIR, 'fixture', 'index.html');
const FIXTURE_APPROVAL_PATH = join(BENCHMARK_DIR, 'fixture', 'captures', 'approved', 'manifest.json');
const CHROME_PATH = process.env.OBSERVATORY_CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const GATE_ID = 'THREEJS-OBSERVATORY__M4P__G4';
const REQUIRED_G3_GATE_ID = 'THREEJS-OBSERVATORY__M4P__G3';
const HARNESS_VERSION = 1;
const EXPECTED_RUN_ID = '2026-08-26T20-23-21Z__7e3dfe533012__3c7c37';
const EXPECTED = Object.freeze({
  fixtureSourceSha256: 'b9950824c09966cb3874049af509da39a5c8abac9beb6e652cda6dc0802cef29',
  fixtureApprovalSha256: '7390dbdcafd3fe4ffd8a8b60d472562303136033525d3f6bfff4521cc27579af',
  g2ReceiptSha256: '9687476235a89f5b2bc67d89d528be831336223d39a9223925c1275258fb8d6c',
  s2ReceiptSha256: '1984fbc3bc02b3ae18e7840e80835632ece50860a3addbe2717a101d84e8e4bb',
  s2ReviewPageSha256: '202d2dffff1704af7c01aa8db97741d03c011d1774c68605466371461573d08a',
  candidates: Object.freeze({
    'candidate-4a896ae64a': Object.freeze({
      condition: 'treatment',
      sourceSha256: 'f63baaf980fcd04911abaccd1ac32f338e245a639547bf9eeefc9b3e0e38af5f'
    }),
    'candidate-50800e37cf': Object.freeze({
      condition: 'clean',
      sourceSha256: '2cd87eedee04fc035d559e9ff1bec2ab9b76974763658eb7075dff602d945e0d'
    })
  })
});

const PROTOCOL = Object.freeze({
  viewport: Object.freeze({ width: 1600, height: 900, dpr: 1 }),
  captureTick: 240,
  expectedWorkload: Object.freeze({
    seed: 424242,
    totalMarkers: 1200,
    markersPerFamily: 240,
    familyCount: 5,
    rippleCount: 64,
    fixedHz: 60,
    worldRenderScale: 0.67,
    outputBuffer: '1600x900',
    worldBuffer: '1072x603'
  }),
  frameBudgetMs: 1000 / 60,
  warmupFramesPerVariant: 120,
  rounds: 8,
  completionSamplesPerVariantPerRound: 64,
  gpuSamplesPerVariantPerRound: 8,
  observerNowSamplesPerVariant: 512,
  observerEmptyFinishSamplesPerVariant: 64,
  observerInfoResetSamplesPerVariant: 128,
  gpuQueryTimeoutMs: 10_000,
  readyTimeoutMs: 45_000,
  cdpTimeoutMs: 120_000,
  runTimeoutMs: 15 * 60 * 1000,
  baselineInstabilityLimitPct: 10,
  roundMedianCvLimitPct: 15
});

const SOURCE_HOOK_MARKER = 'window.__moonlitObservatory = Object.freeze({';
const SOURCE_HOOK_PROPERTY = `      __g4Measurement: Object.freeze({\n        renderFrame,\n        currentTick: () => simulationTick\n      }),`;
const CHROME_ARGUMENTS = Object.freeze([
  '--headless=new',
  '--remote-debugging-address=127.0.0.1',
  '--remote-debugging-port=0',
  '<user-data-dir>',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--force-color-profile=srgb',
  'about:blank'
]);

function usage() {
  return [
    'Usage:',
    `  node benchmarks/threejs-observatory-instancing/run-performance.mjs --run-id ${EXPECTED_RUN_ID}`,
    '',
    'This frozen G4 protocol accepts only the named paired run and refuses before launching Chrome',
    'unless its exact S2-accepted candidates have a hash-bound Objectively Green G3 receipt.'
  ].join('\n');
}

function parseArguments(args) {
  if (args.length === 1 && ['-h', '--help'].includes(args[0])) return { help: true };
  if (args.length !== 2 || args[0] !== '--run-id' || args[1] !== EXPECTED_RUN_ID) {
    throw new Error(usage());
  }
  return { help: false, runId: args[1] };
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function isPathInside(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot !== ''
    && pathFromRoot !== '..'
    && !pathFromRoot.startsWith(`..${sep}`)
    && !isAbsolute(pathFromRoot);
}

async function readAndHash(path) {
  const contents = await readFile(path);
  return { path, contents, bytes: contents.length, sha256: sha256(contents) };
}

async function readJsonAndHash(path, label) {
  const file = await readAndHash(path);
  let value;
  try {
    value = JSON.parse(file.contents.toString('utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
  return { ...file, value };
}

async function writeAtomic(path, contents) {
  const temporaryPath = `${path}.tmp-${process.pid}`;
  await writeFile(temporaryPath, contents);
  await rename(temporaryPath, path);
}

async function writeJsonAtomic(path, value) {
  await writeAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function resolveRunDirectory(runId) {
  const [runsRoot, runDirectory] = await Promise.all([
    realpath(RUNS_ROOT),
    realpath(join(RUNS_ROOT, runId))
  ]);
  invariant(dirname(runDirectory) === runsRoot && isPathInside(runsRoot, runDirectory), 'Run directory escaped the retained run root.');
  invariant(basename(runDirectory) === runId, 'Run directory identity drifted.');
  return { runsRoot, runDirectory };
}

function injectMeasurementHook(sourceBuffer, label) {
  const source = sourceBuffer.toString('utf8');
  invariant(!source.includes('__g4Measurement'), `${label} already contains a G4 measurement hook.`);
  const occurrences = source.split(SOURCE_HOOK_MARKER).length - 1;
  invariant(occurrences === 1, `${label} does not contain exactly one observatory API hook point.`);
  invariant(source.includes('function renderFrame()'), `${label} does not declare renderFrame().`);
  invariant(source.includes('let simulationTick = 0;'), `${label} does not declare the expected simulation tick.`);
  return Buffer.from(source.replace(
    SOURCE_HOOK_MARKER,
    `${SOURCE_HOOK_MARKER}\n${SOURCE_HOOK_PROPERTY}`
  ));
}

function normalizeCandidateBindings(receipt) {
  if (Array.isArray(receipt.candidates)) {
    return receipt.candidates.map((candidate) => ({
      candidateId: candidate.candidateId || candidate.id,
      sourceSha256: candidate.sourceSha256 || candidate.source?.sha256,
      verdict: candidate.verdict || candidate.result || candidate.productClaim || null
    }));
  }
  if (receipt.candidates && typeof receipt.candidates === 'object') {
    return Object.entries(receipt.candidates).map(([candidateId, candidate]) => ({
      candidateId,
      sourceSha256: candidate.sourceSha256 || candidate.source?.sha256,
      verdict: candidate.verdict || candidate.result || candidate.productClaim || null
    }));
  }
  return [];
}

function validateG3Receipt(g3) {
  invariant(g3.gateId === REQUIRED_G3_GATE_ID || g3.gate === REQUIRED_G3_GATE_ID, 'G3 receipt gate identity drifted.');
  invariant(g3.runId === EXPECTED_RUN_ID, 'G3 receipt run identity drifted.');
  invariant(g3.state === 'Objectively Green' || g3.runStatus === 'Objectively Green', 'G3 receipt is not Objectively Green.');
  const classification = g3.classification || {};
  invariant(classification.harness === 'VALID', 'G3 harness is not VALID.');
  invariant(classification.run === 'COMPLETED', 'G3 run is not COMPLETED.');
  invariant(classification.productClaim === 'GREEN', 'G3 product claim is not GREEN.');
  const fixtureHash = g3.fixture?.sourceSha256
    || g3.fixture?.source?.sha256
    || g3.basis?.fixtureSourceSha256
    || g3.basis?.fixture?.sourceSha256;
  invariant(fixtureHash === EXPECTED.fixtureSourceSha256, 'G3 fixture source binding drifted.');

  const bindings = normalizeCandidateBindings(g3);
  invariant(bindings.length === 2, 'G3 receipt does not bind exactly two candidates.');
  for (const [candidateId, expected] of Object.entries(EXPECTED.candidates)) {
    const binding = bindings.find((candidate) => candidate.candidateId === candidateId);
    invariant(binding, `G3 receipt omits ${candidateId}.`);
    invariant(binding.sourceSha256 === expected.sourceSha256, `G3 source binding drifted for ${candidateId}.`);
    if (binding.verdict !== null) {
      invariant(['GREEN', 'PASS', 'Objectively Green', 'accepted'].includes(binding.verdict), `G3 candidate ${candidateId} is not green.`);
    }
  }

  const mutation = g3.mutationCalibration || g3.mutation || g3.calibration || g3.potency?.mutation;
  invariant(mutation && typeof mutation === 'object', 'G3 receipt omits mutation calibration evidence.');
  const rejected = mutation.rejected === true
    || mutation.result === 'REJECTED'
    || mutation.verdict === 'RED'
    || mutation.productClaim === 'RED'
    || mutation.evaluation?.disposition === 'REJECT_UNFORCED_MULTIPLIER';
  invariant(rejected, 'G3 mutation calibration was not rejected as required.');
  invariant(
    mutation.evaluation?.rejectedForExactIntendedReasons === true,
    'G3 mutation was not rejected for the exact intended topology violations.'
  );
  invariant(
    mutation.restoration?.byteIdenticalBeforeAfter === true
      && mutation.restoration?.frozenFixtureUnchanged === true,
    'G3 mutation custody/restoration evidence is incomplete.'
  );
  const harnessHash = g3.harness?.sha256 || g3.harnessSha256 || g3.basis?.harnessSha256;
  invariant(/^[a-f0-9]{64}$/.test(harnessHash || ''), 'G3 receipt omits its harness hash.');
}

async function preflight(runDirectory) {
  const candidateIds = Object.keys(EXPECTED.candidates).sort();
  const [
    harness,
    fixture,
    fixtureApproval,
    runReceipt,
    g2Receipt,
    s2Receipt,
    s2ReviewPage,
    g3Receipt,
    chromeStat,
    ...candidateFiles
  ] = await Promise.all([
    readAndHash(HARNESS_PATH),
    readAndHash(FIXTURE_PATH),
    readJsonAndHash(FIXTURE_APPROVAL_PATH, 'Fixture approval receipt'),
    readJsonAndHash(join(runDirectory, 'run.json'), 'G2 run receipt'),
    readJsonAndHash(join(runDirectory, 'review', 'g2-receipt.json'), 'G2 receipt'),
    readJsonAndHash(join(runDirectory, 'review', 'unblinding-receipt.json'), 'S2 receipt'),
    readAndHash(join(runDirectory, 'review', 'index.html')),
    readJsonAndHash(join(runDirectory, 'review', 'g3-receipt.json'), 'G3 receipt'),
    stat(CHROME_PATH),
    ...candidateIds.map((candidateId) => readAndHash(join(runDirectory, 'candidates', candidateId, 'workspace', 'index.html')))
  ]);

  invariant(chromeStat.isFile(), `Chrome path is not a file: ${CHROME_PATH}`);
  invariant(fixture.sha256 === EXPECTED.fixtureSourceSha256, 'Frozen fixture source drifted.');
  invariant(fixtureApproval.sha256 === EXPECTED.fixtureApprovalSha256, 'Frozen fixture approval receipt drifted.');
  invariant(fixtureApproval.value.kind === 'threejs-observatory-uninstanced-fixture-approved', 'Fixture approval kind drifted.');
  invariant(fixtureApproval.value.acceptance?.verdict === 'Accepted', 'Frozen fixture is not human Accepted.');
  invariant(fixtureApproval.value.source?.sha256 === fixture.sha256, 'Fixture approval no longer binds the exact source.');

  const run = runReceipt.value;
  invariant(run.runId === EXPECTED_RUN_ID && run.gateId === 'THREEJS-OBSERVATORY__M4P__G2', 'G2 run identity drifted.');
  invariant(run.runStatus === 'Objectively Green' && run.productClaim === 'GREEN', 'G2 is not Objectively Green.');
  invariant(g2Receipt.sha256 === EXPECTED.g2ReceiptSha256, 'G2 receipt bytes drifted.');
  invariant(run.g2Receipt?.sha256 === g2Receipt.sha256, 'Run receipt no longer binds the exact G2 receipt.');

  invariant(s2Receipt.sha256 === EXPECTED.s2ReceiptSha256, 'S2 receipt bytes drifted.');
  invariant(s2ReviewPage.sha256 === EXPECTED.s2ReviewPageSha256, 'S2 reviewed page bytes drifted.');
  const s2 = s2Receipt.value;
  invariant(s2.runId === EXPECTED_RUN_ID && s2.gate === 'THREEJS-OBSERVATORY__M4P__S2', 'S2 receipt identity drifted.');
  invariant(s2.verdict === 'Accepted' && s2.commitmentVerifiedBeforeReveal === true, 'Both candidates are not S2 Accepted under the sealed commitment.');
  invariant(s2.reviewPageSha256 === s2ReviewPage.sha256, 'S2 receipt no longer binds the reviewed page.');

  const candidateSources = [];
  for (let index = 0; index < candidateIds.length; index += 1) {
    const candidateId = candidateIds[index];
    const expected = EXPECTED.candidates[candidateId];
    const source = candidateFiles[index];
    invariant(source.sha256 === expected.sourceSha256, `Accepted source drifted for ${candidateId}.`);
    const mapping = Object.values(s2.mapping || {}).find((entry) => entry.candidateId === candidateId);
    invariant(mapping, `S2 receipt omits ${candidateId}.`);
    invariant(mapping.condition === expected.condition && mapping.sourceSha256 === source.sha256, `S2 mapping drifted for ${candidateId}.`);
    const output = await readJsonAndHash(join(runDirectory, 'candidates', candidateId, 'output-tree.json'), `${candidateId} output receipt`);
    invariant(output.value.index?.sha256 === source.sha256, `Generation output receipt drifted for ${candidateId}.`);
    candidateSources.push({ candidateId, condition: expected.condition, source });
  }

  validateG3Receipt(g3Receipt.value);

  const variants = [
    {
      id: 'fixture-control-a',
      role: 'unchanged-baseline-control',
      condition: 'fixture',
      source: fixture
    },
    {
      id: candidateSources[0].candidateId,
      role: 'eligible-candidate',
      condition: candidateSources[0].condition,
      source: candidateSources[0].source
    },
    {
      id: 'fixture-control-b',
      role: 'unchanged-baseline-control',
      condition: 'fixture',
      source: fixture
    },
    {
      id: candidateSources[1].candidateId,
      role: 'eligible-candidate',
      condition: candidateSources[1].condition,
      source: candidateSources[1].source
    }
  ].map((variant) => {
    const instrumentedSource = injectMeasurementHook(variant.source.contents, variant.id);
    return {
      ...variant,
      instrumentedSource,
      instrumentedSha256: sha256(instrumentedSource)
    };
  });

  invariant(variants[0].instrumentedSha256 === variants[2].instrumentedSha256, 'Unchanged baseline controls do not have byte-identical instrumented sources.');
  invariant(!(await pathExists(join(runDirectory, 'review', 'g4-receipt.json'))), 'G4 receipt already exists; refusing to overwrite it.');

  return {
    harness,
    fixture,
    fixtureApproval,
    runReceipt,
    g2Receipt,
    s2Receipt,
    s2ReviewPage,
    g3Receipt,
    variants
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
    this.listeners = new Map();
    this.socket = null;
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolveOpen, rejectOpen) => {
      const timeout = setTimeout(() => rejectOpen(new Error(`Timed out connecting to ${this.url}`)), PROTOCOL.cdpTimeoutMs);
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
      for (const request of this.pending.values()) {
        clearTimeout(request.timeout);
        request.reject(new Error('CDP socket closed before the command completed.'));
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
      if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`));
      else request.resolve(message.result);
      return;
    }
    if (!message.method) return;
    for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}, timeoutMs = PROTOCOL.cdpTimeoutMs) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolveCommand, rejectCommand) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectCommand(new Error(`Timed out running ${method}.`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timeout, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket?.close();
  }
}

async function startStaticServer(variants) {
  const sources = new Map(variants.map((variant) => [`/${variant.id}/index.html`, variant.instrumentedSource]));
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const source = sources.get(decodeURIComponent(url.pathname));
    if (!source) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    });
    response.end(source);
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  invariant(address && typeof address !== 'string', 'Measurement server did not expose a local TCP port.');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
      server.closeAllConnections();
    })
  };
}

async function launchChrome(profileDirectory) {
  const actualArguments = CHROME_ARGUMENTS.map((argument) => argument === '<user-data-dir>'
    ? `--user-data-dir=${profileDirectory}`
    : argument);
  const child = spawn(CHROME_PATH, actualArguments, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  const websocketUrl = await new Promise((resolveUrl, rejectUrl) => {
    const timeout = setTimeout(() => rejectUrl(new Error(`Chrome did not expose CDP. ${stderr.slice(-1000)}`)), PROTOCOL.readyTimeoutMs);
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
  invariant(Number.isInteger(port) && port > 0, `Invalid CDP port in ${websocketUrl}.`);
  const versionResponse = await fetch(`http://127.0.0.1:${port}/json/version`);
  invariant(versionResponse.ok, `Could not read Chrome version: ${versionResponse.status}.`);
  const version = await versionResponse.json();
  return {
    child,
    port,
    websocketUrl,
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
  invariant(response.ok, `Could not create Chrome target: ${response.status}.`);
  return response.json();
}

async function closeTarget(port, id) {
  await fetch(`http://127.0.0.1:${port}/json/close/${encodeURIComponent(id)}`);
}

function pageDriverInstaller(settings) {
  const api = window.__moonlitObservatory;
  const hook = api?.__g4Measurement;
  if (!api || !hook || typeof hook.renderFrame !== 'function' || typeof hook.currentTick !== 'function') {
    throw new Error('The frozen G4 measurement hook is unavailable.');
  }
  const renderer = api.renderer;
  const gl = renderer.getContext();
  const gpuTimer = gl instanceof WebGL2RenderingContext
    ? gl.getExtension('EXT_disjoint_timer_query_webgl2')
    : null;

  const waitForQuery = async (query, extension) => {
    const started = performance.now();
    while (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
      if (performance.now() - started > settings.gpuQueryTimeoutMs) {
        throw new Error('GPU timer query exceeded the bounded wait.');
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 0));
    }
    return {
      resultNs: gl.getQueryParameter(query, gl.QUERY_RESULT),
      disjoint: Boolean(gl.getParameter(extension.GPU_DISJOINT_EXT)),
      pollWaitMs: performance.now() - started
    };
  };

  const renderCounts = () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    lines: renderer.info.render.lines,
    points: renderer.info.render.points,
    programs: renderer.info.programs?.length ?? null,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures
  });

  const workloadSnapshot = () => {
    const canvas = renderer.domElement;
    const markerMeshes = Array.isArray(api.markerMeshes) ? api.markerMeshes : [];
    const markerInstanceCounts = markerMeshes.map((mesh) => mesh?.isInstancedMesh ? mesh.count : 1);
    const displayedCanvases = [...document.querySelectorAll('canvas')].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    const rect = canvas.getBoundingClientRect();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      ready: document.documentElement.dataset.ready,
      visibilityState: document.visibilityState,
      currentTick: hook.currentTick(),
      captureTick: api.captureTick,
      api: {
        seed: api.seed,
        totalMarkers: api.totalMarkers,
        markersPerFamily: api.markersPerFamily,
        familyCount: api.familyCount,
        rippleCount: api.rippleCount,
        fixedHz: api.fixedHz,
        worldRenderScale: api.worldRenderScale,
        threeRevision: api.threeRevision
      },
      markerWorkload: {
        renderableCount: markerMeshes.length,
        logicalCount: markerInstanceCounts.reduce((sum, count) => sum + count, 0),
        instancedRenderableCount: markerMeshes.filter((mesh) => mesh?.isInstancedMesh).length,
        markerInstanceCounts,
        observedFamilyCount: Array.isArray(api.markerFamilies) ? api.markerFamilies.length : null
      },
      viewport: {
        innerWidth,
        innerHeight,
        devicePixelRatio,
        canvasCount: document.querySelectorAll('canvas').length,
        displayedCanvasCount: displayedCanvases.length,
        canvasRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        canvasBuffer: { width: canvas.width, height: canvas.height },
        outputBuffer: canvas.dataset.outputBuffer,
        worldBuffer: canvas.dataset.worldBuffer,
        worldScale: canvas.dataset.worldScale,
        datasetCaptureTick: canvas.dataset.captureTick
      },
      renderer: {
        webglVersion: gl instanceof WebGL2RenderingContext ? 2 : 1,
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
        unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        gpuTimerQuerySupported: Boolean(gpuTimer),
        contextAttributes: gl.getContextAttributes()
      }
    };
  };

  const withManualInfoReset = async (operation) => {
    const priorAutoReset = renderer.info.autoReset;
    renderer.info.autoReset = false;
    try {
      return await operation();
    } finally {
      renderer.info.autoReset = priorAutoReset;
    }
  };

  const warm = (frameCount) => withManualInfoReset(async () => {
    gl.finish();
    for (let index = 0; index < frameCount; index += 1) {
      renderer.info.reset();
      hook.renderFrame();
      gl.finish();
      if (hook.currentTick() !== settings.captureTick) throw new Error('Simulation tick moved during warmup.');
    }
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new Error(`WebGL error after warmup: ${error}`);
    return { frames: frameCount, snapshot: workloadSnapshot() };
  });

  const measureCompletionBatch = (sampleCount) => withManualInfoReset(async () => {
    const samples = [];
    for (let index = 0; index < sampleCount; index += 1) {
      const preDrainStart = performance.now();
      gl.finish();
      const preDrainMs = performance.now() - preDrainStart;
      renderer.info.reset();
      const started = performance.now();
      hook.renderFrame();
      const submitted = performance.now();
      gl.finish();
      const completed = performance.now();
      samples.push({
        sampleIndex: index,
        submissionMs: submitted - started,
        completionMs: completed - started,
        gpuDrainMs: completed - submitted,
        preDrainMs,
        counts: renderCounts(),
        tick: hook.currentTick()
      });
    }
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new Error(`WebGL error after completion batch: ${error}`);
    return { samples, snapshot: workloadSnapshot() };
  });

  const measureGpuBatch = (sampleCount) => withManualInfoReset(async () => {
    if (!gpuTimer) return { supported: false, samples: [], snapshot: workloadSnapshot() };
    const samples = [];
    for (let index = 0; index < sampleCount; index += 1) {
      gl.finish();
      renderer.info.reset();
      const disjointBefore = Boolean(gl.getParameter(gpuTimer.GPU_DISJOINT_EXT));
      const query = gl.createQuery();
      if (!query) throw new Error('Could not allocate a GPU timer query.');
      gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT, query);
      const cpuStarted = performance.now();
      hook.renderFrame();
      const cpuSubmitted = performance.now();
      gl.endQuery(gpuTimer.TIME_ELAPSED_EXT);
      const queryResult = await waitForQuery(query, gpuTimer);
      const counts = renderCounts();
      gl.deleteQuery(query);
      samples.push({
        sampleIndex: index,
        valid: !disjointBefore && !queryResult.disjoint,
        invalidReason: disjointBefore || queryResult.disjoint ? 'GPU_DISJOINT_EXT' : null,
        gpuMs: !disjointBefore && !queryResult.disjoint ? queryResult.resultNs / 1_000_000 : null,
        rawGpuNanoseconds: !disjointBefore && !queryResult.disjoint ? queryResult.resultNs : null,
        queryPollWaitMs: queryResult.pollWaitMs,
        queryWrappedCpuSubmissionMs: cpuSubmitted - cpuStarted,
        counts,
        tick: hook.currentTick()
      });
    }
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new Error(`WebGL error after GPU timer batch: ${error}`);
    return { supported: true, samples, snapshot: workloadSnapshot() };
  });

  const measureObserverOverhead = () => withManualInfoReset(async () => {
    const nowPairMs = [];
    for (let index = 0; index < settings.observerNowSamples; index += 1) {
      const started = performance.now();
      nowPairMs.push(performance.now() - started);
    }

    gl.finish();
    const emptyFinishMs = [];
    for (let index = 0; index < settings.observerEmptyFinishSamples; index += 1) {
      const started = performance.now();
      gl.finish();
      emptyFinishMs.push(performance.now() - started);
    }

    const infoResetMs = [];
    for (let index = 0; index < settings.observerInfoResetSamples; index += 1) {
      const started = performance.now();
      renderer.info.reset();
      infoResetMs.push(performance.now() - started);
    }

    const emptyGpuQueryMs = [];
    if (gpuTimer) {
      for (let index = 0; index < Math.min(16, settings.observerEmptyFinishSamples); index += 1) {
        gl.finish();
        const query = gl.createQuery();
        gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT, query);
        gl.endQuery(gpuTimer.TIME_ELAPSED_EXT);
        const queryResult = await waitForQuery(query, gpuTimer);
        gl.deleteQuery(query);
        if (!queryResult.disjoint) emptyGpuQueryMs.push(queryResult.resultNs / 1_000_000);
      }
    }
    return { nowPairMs, emptyFinishMs, infoResetMs, emptyGpuQueryMs, snapshot: workloadSnapshot() };
  });

  window.__g4PerfDriver = Object.freeze({
    workloadSnapshot,
    warm,
    measureCompletionBatch,
    measureGpuBatch,
    measureObserverOverhead
  });
  return workloadSnapshot();
}

async function evaluate(client, expression, { awaitPromise = true, timeoutMs = PROTOCOL.cdpTimeoutMs } = {}) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: false
  }, timeoutMs);
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime evaluation failed.';
    throw new Error(description);
  }
  return result.result?.value;
}

async function waitForReady(client) {
  const deadline = Date.now() + PROTOCOL.readyTimeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const ready = await evaluate(client, 'document.documentElement.dataset.ready === "true"', { timeoutMs: 5_000 });
      if (ready) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error(`Timed out waiting for the fixed-tick demo.${lastError ? ` ${lastError.message}` : ''}`);
}

function validateWorkloadSnapshot(snapshot, variant) {
  const expected = PROTOCOL.expectedWorkload;
  invariant(snapshot.ready === 'true', `${variant.id} is not ready.`);
  invariant(snapshot.visibilityState === 'visible', `${variant.id} is not foreground-visible.`);
  invariant(snapshot.currentTick === PROTOCOL.captureTick && snapshot.captureTick === PROTOCOL.captureTick, `${variant.id} did not remain at capture tick ${PROTOCOL.captureTick}.`);
  invariant(snapshot.viewport.datasetCaptureTick === String(PROTOCOL.captureTick), `${variant.id} capture-tick dataset drifted.`);
  invariant(snapshot.api.seed === expected.seed, `${variant.id} seed drifted.`);
  invariant(snapshot.api.totalMarkers === expected.totalMarkers, `${variant.id} total marker workload drifted.`);
  invariant(snapshot.api.markersPerFamily === expected.markersPerFamily, `${variant.id} markers-per-family drifted.`);
  invariant(snapshot.api.familyCount === expected.familyCount, `${variant.id} family count drifted.`);
  invariant(snapshot.api.rippleCount === expected.rippleCount, `${variant.id} ripple workload drifted.`);
  invariant(snapshot.api.fixedHz === expected.fixedHz, `${variant.id} fixed tick rate drifted.`);
  invariant(snapshot.api.worldRenderScale === expected.worldRenderScale, `${variant.id} world quality scale drifted.`);
  invariant(snapshot.api.threeRevision === '180', `${variant.id} Three.js revision drifted.`);
  invariant(snapshot.markerWorkload.logicalCount === expected.totalMarkers, `${variant.id} logical marker count drifted.`);
  invariant(snapshot.markerWorkload.observedFamilyCount === expected.familyCount, `${variant.id} observed marker-family count drifted.`);
  invariant(snapshot.viewport.innerWidth === PROTOCOL.viewport.width && snapshot.viewport.innerHeight === PROTOCOL.viewport.height, `${variant.id} viewport drifted.`);
  invariant(snapshot.viewport.devicePixelRatio === PROTOCOL.viewport.dpr, `${variant.id} DPR drifted.`);
  invariant(snapshot.viewport.canvasCount === 1 && snapshot.viewport.displayedCanvasCount === 1, `${variant.id} canvas count drifted.`);
  invariant(snapshot.viewport.canvasRect.width === PROTOCOL.viewport.width && snapshot.viewport.canvasRect.height === PROTOCOL.viewport.height, `${variant.id} canvas CSS size drifted.`);
  invariant(snapshot.viewport.canvasBuffer.width === PROTOCOL.viewport.width && snapshot.viewport.canvasBuffer.height === PROTOCOL.viewport.height, `${variant.id} drawing buffer drifted.`);
  invariant(snapshot.viewport.outputBuffer === expected.outputBuffer && snapshot.viewport.worldBuffer === expected.worldBuffer, `${variant.id} render-target quality receipt drifted.`);
  invariant(snapshot.renderer.webglVersion === 2, `${variant.id} did not use WebGL2.`);
  if (variant.role === 'unchanged-baseline-control') {
    invariant(snapshot.markerWorkload.renderableCount === expected.totalMarkers, `${variant.id} is not the frozen uninstanced baseline.`);
    invariant(snapshot.markerWorkload.instancedRenderableCount === 0, `${variant.id} unexpectedly contains instanced marker renderables.`);
  } else {
    invariant(snapshot.markerWorkload.renderableCount === expected.familyCount, `${variant.id} does not expose one marker renderable per family.`);
    invariant(snapshot.markerWorkload.instancedRenderableCount === expected.familyCount, `${variant.id} does not expose five InstancedMesh marker renderables.`);
    invariant(snapshot.markerWorkload.markerInstanceCounts.every((count) => count === expected.markersPerFamily), `${variant.id} instance counts drifted.`);
  }
}

async function openMeasurementPage(chrome, server, variant) {
  const target = await createTarget(chrome.port);
  const client = new CdpClient(target.webSocketDebuggerUrl);
  const diagnostics = { runtimeExceptions: [], consoleMessages: [], logEntries: [] };
  try {
    await client.connect();
    client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      diagnostics.runtimeExceptions.push({
        text: exceptionDetails?.text || 'Runtime exception',
        description: exceptionDetails?.exception?.description || null,
        url: exceptionDetails?.url || null,
        lineNumber: exceptionDetails?.lineNumber ?? null,
        columnNumber: exceptionDetails?.columnNumber ?? null
      });
    });
    client.on('Runtime.consoleAPICalled', ({ type, args }) => {
      if (!['error', 'warning', 'assert'].includes(type)) return;
      diagnostics.consoleMessages.push({ type, values: serializeRemoteValues(args) });
    });
    client.on('Log.entryAdded', ({ entry }) => {
      if (!entry || !['error', 'warning'].includes(entry.level)) return;
      diagnostics.logEntries.push({ level: entry.level, source: entry.source, text: entry.text, url: entry.url || null });
    });
    await Promise.all([
      client.send('Page.enable'),
      client.send('Runtime.enable'),
      client.send('Log.enable'),
      client.send('Network.enable'),
      client.send('Emulation.setDeviceMetricsOverride', {
        width: PROTOCOL.viewport.width,
        height: PROTOCOL.viewport.height,
        deviceScaleFactor: PROTOCOL.viewport.dpr,
        mobile: false,
        screenWidth: PROTOCOL.viewport.width,
        screenHeight: PROTOCOL.viewport.height,
        screenOrientation: { type: 'landscapePrimary', angle: 90 }
      }),
      client.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `Object.defineProperty(globalThis, '__MOONLIT_CAPTURE_TICK__', { value: ${PROTOCOL.captureTick}, configurable: false, enumerable: false, writable: false });`
      })
    ]);
    await client.send('Page.navigate', { url: `${server.origin}/${variant.id}/index.html` });
    await waitForReady(client);
    await client.send('Page.bringToFront');
    const installer = `(${pageDriverInstaller.toString()})(${JSON.stringify({
      captureTick: PROTOCOL.captureTick,
      gpuQueryTimeoutMs: PROTOCOL.gpuQueryTimeoutMs,
      observerNowSamples: PROTOCOL.observerNowSamplesPerVariant,
      observerEmptyFinishSamples: PROTOCOL.observerEmptyFinishSamplesPerVariant,
      observerInfoResetSamples: PROTOCOL.observerInfoResetSamplesPerVariant
    })})`;
    const initialSnapshot = await evaluate(client, installer);
    validateWorkloadSnapshot(initialSnapshot, variant);
    invariant(diagnostics.runtimeExceptions.length === 0, `${variant.id} raised a runtime exception during load.`);
    invariant(diagnostics.consoleMessages.length === 0, `${variant.id} emitted a console warning/error during load.`);
    invariant(diagnostics.logEntries.length === 0, `${variant.id} emitted a browser warning/error during load.`);
    return { target, client, variant, diagnostics, initialSnapshot };
  } catch (error) {
    client.close();
    await closeTarget(chrome.port, target.id);
    throw error;
  }
}

async function callPage(page, method, ...args) {
  await page.client.send('Page.bringToFront');
  const expression = `window.__g4PerfDriver.${method}(...${JSON.stringify(args)})`;
  const started = process.hrtime.bigint();
  const value = await evaluate(page.client, expression);
  const cdpWallMs = Number(process.hrtime.bigint() - started) / 1_000_000;
  validateWorkloadSnapshot(value.snapshot, page.variant);
  invariant(page.diagnostics.runtimeExceptions.length === 0, `${page.variant.id} raised a runtime exception during ${method}.`);
  invariant(page.diagnostics.consoleMessages.length === 0, `${page.variant.id} emitted a console warning/error during ${method}.`);
  invariant(page.diagnostics.logEntries.length === 0, `${page.variant.id} emitted a browser warning/error during ${method}.`);
  return { ...value, cdpWallMs };
}

function balancedRoundOrders(variants) {
  invariant(variants.length === 4 && PROTOCOL.rounds === 8, 'The frozen interleave design requires four variants and eight rounds.');
  const rows = [
    [0, 1, 3, 2],
    [1, 2, 0, 3],
    [2, 3, 1, 0],
    [3, 0, 2, 1]
  ];
  return [...rows, ...rows.map((row) => [...row].reverse())]
    .map((row) => row.map((index) => variants[index].id));
}

function quantile(sortedValues, probability) {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
}

function distribution(values, budgetMs = null) {
  const finite = values.filter(Number.isFinite);
  invariant(finite.length === values.length && finite.length > 0, 'A metric distribution contains missing or non-finite values.');
  const sorted = [...finite].sort((left, right) => left - right);
  const average = mean(finite);
  const misses = budgetMs === null ? null : finite.filter((value) => value > budgetMs).length;
  return {
    samples: finite.length,
    minMs: sorted[0],
    meanMs: average,
    standardDeviationMs: standardDeviation(finite),
    coefficientOfVariationPct: average === 0 ? null : standardDeviation(finite) / average * 100,
    p50Ms: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
    p99Ms: quantile(sorted, 0.99),
    maxMs: sorted.at(-1),
    budgetMs,
    budgetMissCount: misses,
    budgetMissPct: misses === null ? null : misses / finite.length * 100,
    severeHitchCount: budgetMs === null ? null : finite.filter((value) => value > budgetMs * 2).length
  };
}

function longestBudgetMissCluster(samples, metric, budgetMs) {
  const rounds = new Map();
  for (const sample of samples) {
    const roundSamples = rounds.get(sample.round) || [];
    roundSamples.push(sample);
    rounds.set(sample.round, roundSamples);
  }
  let longest = 0;
  for (const roundSamples of rounds.values()) {
    roundSamples.sort((left, right) => left.sampleIndex - right.sampleIndex);
    let current = 0;
    for (const sample of roundSamples) {
      if (sample[metric] > budgetMs) {
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }
  }
  return longest;
}

function runVariance(samples, metric) {
  const byRound = new Map();
  for (const sample of samples) {
    const values = byRound.get(sample.round) || [];
    values.push(sample[metric]);
    byRound.set(sample.round, values);
  }
  const roundSummaries = [...byRound.entries()]
    .sort(([left], [right]) => left - right)
    .map(([round, values]) => ({ round, ...distribution(values, PROTOCOL.frameBudgetMs) }));
  const roundMedians = roundSummaries.map((summary) => summary.p50Ms);
  const averageMedian = mean(roundMedians);
  return {
    rounds: roundSummaries,
    medianOfRoundMediansMs: quantile([...roundMedians].sort((left, right) => left - right), 0.5),
    roundMedianStandardDeviationMs: standardDeviation(roundMedians),
    roundMedianCoefficientOfVariationPct: averageMedian === 0 ? null : standardDeviation(roundMedians) / averageMedian * 100,
    roundMedianMinMs: Math.min(...roundMedians),
    roundMedianMaxMs: Math.max(...roundMedians),
    roundMedianSpanMs: Math.max(...roundMedians) - Math.min(...roundMedians)
  };
}

function stableRenderCounts(samples, label) {
  const keys = samples.map((sample) => canonicalJson(sample.counts));
  const unique = [...new Set(keys)];
  invariant(unique.length === 1, `${label} renderer calls/triangles changed across fixed-workload samples.`);
  invariant(samples.every((sample) => sample.tick === PROTOCOL.captureTick), `${label} moved away from the fixed capture tick.`);
  return JSON.parse(unique[0]);
}

function summarizeVariant(variant, completionSamples, gpuSamples, observer) {
  invariant(completionSamples.length === PROTOCOL.rounds * PROTOCOL.completionSamplesPerVariantPerRound, `${variant.id} completion sample count is incomplete.`);
  const validGpuSamples = gpuSamples.filter((sample) => sample.valid);
  const invalidGpuSamples = gpuSamples.filter((sample) => !sample.valid);
  const completionCounts = stableRenderCounts(completionSamples, variant.id);
  if (gpuSamples.length > 0) stableRenderCounts(gpuSamples, `${variant.id} GPU-query`);
  const submission = distribution(completionSamples.map((sample) => sample.submissionMs), PROTOCOL.frameBudgetMs);
  const completion = distribution(completionSamples.map((sample) => sample.completionMs), PROTOCOL.frameBudgetMs);
  const gpu = validGpuSamples.length > 0
    ? distribution(validGpuSamples.map((sample) => sample.gpuMs), PROTOCOL.frameBudgetMs)
    : null;
  return {
    variant: {
      id: variant.id,
      role: variant.role,
      condition: variant.condition,
      sourceSha256: variant.source.sha256,
      instrumentedSourceSha256: variant.instrumentedSha256
    },
    rendererPerFrame: completionCounts,
    submission: {
      ...submission,
      longestBudgetMissClusterFrames: longestBudgetMissCluster(completionSamples, 'submissionMs', PROTOCOL.frameBudgetMs),
      runVariance: runVariance(completionSamples, 'submissionMs')
    },
    completion: {
      ...completion,
      longestBudgetMissClusterFrames: longestBudgetMissCluster(completionSamples, 'completionMs', PROTOCOL.frameBudgetMs),
      runVariance: runVariance(completionSamples, 'completionMs')
    },
    gpuTimer: {
      supported: observer.snapshot.renderer.gpuTimerQuerySupported,
      validSamples: validGpuSamples.length,
      invalidSamples: invalidGpuSamples.length,
      invalidReasons: Object.fromEntries([...new Set(invalidGpuSamples.map((sample) => sample.invalidReason))]
        .filter(Boolean)
        .map((reason) => [reason, invalidGpuSamples.filter((sample) => sample.invalidReason === reason).length])),
      distribution: gpu,
      runVariance: gpu ? runVariance(validGpuSamples, 'gpuMs') : null
    },
    preDrain: distribution(completionSamples.map((sample) => sample.preDrainMs)),
    gpuDrain: distribution(completionSamples.map((sample) => sample.gpuDrainMs)),
    observerOverhead: {
      performanceNowPair: distribution(observer.nowPairMs),
      emptyGlFinish: distribution(observer.emptyFinishMs),
      rendererInfoReset: distribution(observer.infoResetMs),
      emptyGpuTimerQuery: observer.emptyGpuQueryMs.length > 0 ? distribution(observer.emptyGpuQueryMs) : null,
      cdpWallMs: observer.cdpWallMs
    },
    workload: observer.snapshot
  };
}

function percentDelta(candidate, baseline) {
  return baseline === 0 ? null : (candidate - baseline) / baseline * 100;
}

function metricDelta(candidateMetric, baselineMetric) {
  if (!candidateMetric || !baselineMetric) return null;
  return {
    p50Ms: candidateMetric.p50Ms - baselineMetric.p50Ms,
    p50Pct: percentDelta(candidateMetric.p50Ms, baselineMetric.p50Ms),
    p95Ms: candidateMetric.p95Ms - baselineMetric.p95Ms,
    p95Pct: percentDelta(candidateMetric.p95Ms, baselineMetric.p95Ms),
    p99Ms: candidateMetric.p99Ms - baselineMetric.p99Ms,
    p99Pct: percentDelta(candidateMetric.p99Ms, baselineMetric.p99Ms),
    maxMs: candidateMetric.maxMs - baselineMetric.maxMs,
    maxPct: percentDelta(candidateMetric.maxMs, baselineMetric.maxMs),
    budgetMissPctPoints: candidateMetric.budgetMissPct === null || baselineMetric.budgetMissPct === null
      ? null
      : candidateMetric.budgetMissPct - baselineMetric.budgetMissPct
  };
}

function pooledSummary(variantSummaries, completionByVariant, gpuByVariant) {
  const baselineIds = ['fixture-control-a', 'fixture-control-b'];
  const pooledCompletion = baselineIds.flatMap((id) => completionByVariant.get(id));
  const pooledGpu = baselineIds.flatMap((id) => gpuByVariant.get(id)).filter((sample) => sample.valid);
  return {
    submission: distribution(pooledCompletion.map((sample) => sample.submissionMs), PROTOCOL.frameBudgetMs),
    completion: distribution(pooledCompletion.map((sample) => sample.completionMs), PROTOCOL.frameBudgetMs),
    gpu: pooledGpu.length > 0 ? distribution(pooledGpu.map((sample) => sample.gpuMs), PROTOCOL.frameBudgetMs) : null,
    rendererPerFrame: variantSummaries['fixture-control-a'].rendererPerFrame,
    controls: baselineIds
  };
}

function noiseCalibration(variantSummaries, baselinePooled) {
  const first = variantSummaries['fixture-control-a'];
  const second = variantSummaries['fixture-control-b'];
  const calibrate = (metricName, observerFloorMs = 0) => {
    const left = metricName === 'gpu' ? first.gpuTimer.distribution : first[metricName];
    const right = metricName === 'gpu' ? second.gpuTimer.distribution : second[metricName];
    const pooled = baselinePooled[metricName];
    if (!left || !right || !pooled) return null;
    const pairDeltaMs = Math.abs(left.p50Ms - right.p50Ms);
    const roundMedians = [
      ...(metricName === 'gpu' ? first.gpuTimer.runVariance.rounds : first[metricName].runVariance.rounds),
      ...(metricName === 'gpu' ? second.gpuTimer.runVariance.rounds : second[metricName].runVariance.rounds)
    ].map((round) => round.p50Ms).sort((a, b) => a - b);
    const baselineRoundSpreadMs = quantile(roundMedians, 0.95) - quantile(roundMedians, 0.05);
    const thresholdMs = Math.max(pairDeltaMs, baselineRoundSpreadMs, observerFloorMs);
    const leftCv = metricName === 'gpu'
      ? first.gpuTimer.runVariance.roundMedianCoefficientOfVariationPct
      : first[metricName].runVariance.roundMedianCoefficientOfVariationPct;
    const rightCv = metricName === 'gpu'
      ? second.gpuTimer.runVariance.roundMedianCoefficientOfVariationPct
      : second[metricName].runVariance.roundMedianCoefficientOfVariationPct;
    const pairDeltaPct = Math.abs(percentDelta(left.p50Ms, right.p50Ms));
    return {
      unchangedControlAP50Ms: left.p50Ms,
      unchangedControlBP50Ms: right.p50Ms,
      unchangedPairDeltaMs: pairDeltaMs,
      unchangedPairDeltaPct: pairDeltaPct,
      baselineRoundP05ToP95SpreadMs: baselineRoundSpreadMs,
      retainedObserverFloorMs: observerFloorMs,
      acceptanceNoiseFloorMs: thresholdMs,
      acceptanceNoiseFloorPctOfPooledP50: thresholdMs / pooled.p50Ms * 100,
      controlRoundMedianCvPct: { a: leftCv, b: rightCv },
      stable: pairDeltaPct <= PROTOCOL.baselineInstabilityLimitPct
        && leftCv <= PROTOCOL.roundMedianCvLimitPct
        && rightCv <= PROTOCOL.roundMedianCvLimitPct
    };
  };
  const nowFloor = Math.max(
    first.observerOverhead.performanceNowPair.p99Ms,
    second.observerOverhead.performanceNowPair.p99Ms
  );
  const finishFloor = Math.max(
    first.observerOverhead.emptyGlFinish.p99Ms,
    second.observerOverhead.emptyGlFinish.p99Ms,
    nowFloor
  );
  const emptyGpuFloor = Math.max(
    first.observerOverhead.emptyGpuTimerQuery?.p99Ms || 0,
    second.observerOverhead.emptyGpuTimerQuery?.p99Ms || 0
  );
  return {
    submission: calibrate('submission', nowFloor),
    completion: calibrate('completion', finishFloor),
    gpu: calibrate('gpu', emptyGpuFloor)
  };
}

function classifyComparison(candidateSummary, baselinePooled, noise) {
  const completionDelta = metricDelta(candidateSummary.completion, baselinePooled.completion);
  const submissionDelta = metricDelta(candidateSummary.submission, baselinePooled.submission);
  const gpuDelta = metricDelta(candidateSummary.gpuTimer.distribution, baselinePooled.gpu);
  const stableCandidate = candidateSummary.completion.runVariance.roundMedianCoefficientOfVariationPct
      <= PROTOCOL.roundMedianCvLimitPct
    && candidateSummary.submission.runVariance.roundMedianCoefficientOfVariationPct
      <= PROTOCOL.roundMedianCvLimitPct
    && (!candidateSummary.gpuTimer.runVariance
      || candidateSummary.gpuTimer.runVariance.roundMedianCoefficientOfVariationPct <= PROTOCOL.roundMedianCvLimitPct);
  const stableBaseline = noise.completion?.stable === true && noise.submission?.stable === true
    && (noise.gpu === null || noise.gpu.stable === true);
  const completionEffectMs = Math.abs(completionDelta.p50Ms);
  let direction = 'NO SIGNAL';
  let reason = 'The primary full-completion median did not move beyond calibrated unchanged-build noise.';
  if (!stableBaseline) {
    reason = 'The unchanged baseline controls exceeded the frozen stability limits.';
  } else if (!stableCandidate) {
    reason = 'Candidate round-to-round variance exceeded the frozen stability limit.';
  } else if (completionEffectMs > noise.completion.acceptanceNoiseFloorMs) {
    const p50Direction = Math.sign(completionDelta.p50Ms);
    const p95Direction = Math.sign(completionDelta.p95Ms);
    if (p50Direction < 0 && p95Direction <= 0) {
      direction = 'LOCALLY FASTER';
      reason = 'Full-completion p50 moved lower beyond calibrated noise and p95 did not regress.';
    } else if (p50Direction > 0 && p95Direction >= 0) {
      direction = 'LOCALLY SLOWER';
      reason = 'Full-completion p50 moved higher beyond calibrated noise and p95 did not improve.';
    } else {
      reason = 'Full-completion p50 and p95 moved in opposing directions.';
    }
  }

  if (direction !== 'NO SIGNAL' && gpuDelta && noise.gpu) {
    const gpuEffectSignificant = Math.abs(gpuDelta.p50Ms) > noise.gpu.acceptanceNoiseFloorMs;
    const completionSign = Math.sign(completionDelta.p50Ms);
    const gpuSign = Math.sign(gpuDelta.p50Ms);
    if (gpuEffectSignificant && completionSign !== gpuSign) {
      direction = 'NO SIGNAL';
      reason = 'GPU timer and full-completion medians moved materially in opposing directions.';
    }
  }

  return {
    candidateId: candidateSummary.variant.id,
    condition: candidateSummary.variant.condition,
    result: direction,
    reason,
    stableCandidate,
    stableBaseline,
    completionDelta,
    submissionDelta,
    gpuDelta,
    budgetMissDeltaPctPoints: completionDelta.budgetMissPctPoints,
    claimBoundary: 'Directional same-machine Chrome 151-class lab evidence at one frozen 1600x900 DPR1 fixed-tick workload; not FPS, mobile, thermal, battery, or field evidence.'
  };
}

async function appendRecords(rawPath, records) {
  if (records.length === 0) return;
  await appendFile(rawPath, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
}

async function collectSystemInfo(chrome) {
  const browserClient = new CdpClient(chrome.websocketUrl);
  try {
    await browserClient.connect();
    const [browserVersion, systemInfo, processInfo] = await Promise.all([
      browserClient.send('Browser.getVersion'),
      browserClient.send('SystemInfo.getInfo'),
      browserClient.send('SystemInfo.getProcessInfo')
    ]);
    return { browserVersion, systemInfo, processInfo };
  } finally {
    browserClient.close();
  }
}

async function executeMeasurements({ chrome, server, variants, rawPath }) {
  const pages = [];
  const completionByVariant = new Map(variants.map((variant) => [variant.id, []]));
  const gpuByVariant = new Map(variants.map((variant) => [variant.id, []]));
  const observers = new Map();
  const orders = balancedRoundOrders(variants);
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));

  try {
    for (const variant of variants) pages.push(await openMeasurementPage(chrome, server, variant));
    const pageById = new Map(pages.map((page) => [page.variant.id, page]));

    for (const order of orders) {
      const uniqueGpuIdentity = new Set(order.map((variantId) => canonicalJson(pageById.get(variantId).initialSnapshot.renderer)));
      invariant(uniqueGpuIdentity.size === 1, 'Variants did not resolve to the same WebGL renderer identity and capabilities.');
      break;
    }

    for (const order of orders.slice(0, 1)) {
      for (const variantId of order) {
        const page = pageById.get(variantId);
        const warm = await callPage(page, 'warm', PROTOCOL.warmupFramesPerVariant);
        await appendRecords(rawPath, [{
          type: 'warmup',
          variantId,
          frames: warm.frames,
          cdpWallMs: warm.cdpWallMs,
          snapshot: warm.snapshot
        }]);
      }
    }

    for (const order of orders.slice(0, 1)) {
      for (const variantId of order) {
        const page = pageById.get(variantId);
        const observer = await callPage(page, 'measureObserverOverhead');
        observers.set(variantId, observer);
        await appendRecords(rawPath, [
          ...observer.nowPairMs.map((valueMs, sampleIndex) => ({ type: 'observer-now-pair', variantId, sampleIndex, valueMs })),
          ...observer.emptyFinishMs.map((valueMs, sampleIndex) => ({ type: 'observer-empty-gl-finish', variantId, sampleIndex, valueMs })),
          ...observer.infoResetMs.map((valueMs, sampleIndex) => ({ type: 'observer-renderer-info-reset', variantId, sampleIndex, valueMs })),
          ...observer.emptyGpuQueryMs.map((valueMs, sampleIndex) => ({ type: 'observer-empty-gpu-query', variantId, sampleIndex, valueMs })),
          { type: 'observer-batch', variantId, cdpWallMs: observer.cdpWallMs, snapshot: observer.snapshot }
        ]);
      }
    }

    for (let round = 0; round < orders.length; round += 1) {
      const order = orders[round];
      for (let position = 0; position < order.length; position += 1) {
        const variantId = order[position];
        const page = pageById.get(variantId);
        const completion = await callPage(page, 'measureCompletionBatch', PROTOCOL.completionSamplesPerVariantPerRound);
        const completionRecords = completion.samples.map((sample) => ({
          type: 'frame-completion',
          variantId,
          round,
          interleavePosition: position,
          ...sample
        }));
        completionByVariant.get(variantId).push(...completionRecords);
        await appendRecords(rawPath, [
          ...completionRecords,
          {
            type: 'completion-batch',
            variantId,
            round,
            interleavePosition: position,
            cdpWallMs: completion.cdpWallMs,
            snapshot: completion.snapshot
          }
        ]);

        const gpu = await callPage(page, 'measureGpuBatch', PROTOCOL.gpuSamplesPerVariantPerRound);
        const gpuRecords = gpu.samples.map((sample) => ({
          type: 'gpu-frame',
          variantId,
          round,
          interleavePosition: position,
          ...sample
        }));
        if (gpu.supported) {
          invariant(gpuRecords.length === PROTOCOL.gpuSamplesPerVariantPerRound, `${variantId} GPU sample count is incomplete.`);
        }
        gpuByVariant.get(variantId).push(...gpuRecords);
        await appendRecords(rawPath, [
          ...gpuRecords,
          {
            type: 'gpu-batch',
            variantId,
            round,
            interleavePosition: position,
            supported: gpu.supported,
            cdpWallMs: gpu.cdpWallMs,
            snapshot: gpu.snapshot
          }
        ]);
      }
    }

    const finalSnapshots = {};
    for (const page of pages) {
      await page.client.send('Page.bringToFront');
      finalSnapshots[page.variant.id] = await evaluate(page.client, 'window.__g4PerfDriver.workloadSnapshot()');
      validateWorkloadSnapshot(finalSnapshots[page.variant.id], page.variant);
    }

    return { completionByVariant, gpuByVariant, observers, orders, finalSnapshots };
  } finally {
    for (const page of pages) {
      page.client.close();
      await closeTarget(chrome.port, page.target.id).catch(() => {});
    }
  }
}

function protocolReceipt() {
  const roundOrders = balancedRoundOrders([
    { id: 'fixture-control-a' },
    { id: 'candidate-4a896ae64a' },
    { id: 'fixture-control-b' },
    { id: 'candidate-50800e37cf' }
  ]);
  return {
    gateId: GATE_ID,
    harnessVersion: HARNESS_VERSION,
    measurementKind: 'fixed-state direct full-frame work; not requestAnimationFrame cadence or vsync FPS',
    workload: {
      viewport: PROTOCOL.viewport,
      captureTick: PROTOCOL.captureTick,
      expected: PROTOCOL.expectedWorkload,
      fixedQuality: true,
      adaptiveQuality: false,
      sourceMutation: 'Expose existing renderFrame/current simulation tick only; preserve the production render body byte-for-byte.'
    },
    schedule: {
      oneChromeProcess: true,
      oneForegroundTargetPerMeasuredBatch: true,
      variants: 4,
      unchangedFixtureControls: 2,
      eligibleCandidates: 2,
      warmupFramesPerVariant: PROTOCOL.warmupFramesPerVariant,
      rounds: PROTOCOL.rounds,
      interleaveDesign: 'balanced four-row order plus reversed rows',
      roundOrders,
      completionSamplesPerVariantPerRound: PROTOCOL.completionSamplesPerVariantPerRound,
      gpuSamplesPerVariantPerRound: PROTOCOL.gpuSamplesPerVariantPerRound
    },
    timing: {
      cpuSubmission: 'performance.now around the existing full renderFrame after an untimed gl.finish queue drain',
      fullCompletion: 'same submission interval plus gl.finish before the ending timestamp',
      gpu: 'EXT_disjoint_timer_query_webgl2 TIME_ELAPSED_EXT around renderFrame when supported; disjoint samples invalidated',
      rendererCounters: 'renderer.info.autoReset=false, reset immediately before each frame; calls/triangles/lines/points retained',
      observerOverhead: 'raw performance.now pairs, empty gl.finish, renderer.info.reset, empty GPU queries, and CDP batch wall time',
      budgetMs: PROTOCOL.frameBudgetMs,
      warning: 'Synchronous completion is a controlled lab work measurement, not a presentation-loop model.'
    },
    stability: {
      unchangedBuildCalibration: 'two separately loaded byte-identical fixture controls interleaved with both candidates',
      acceptanceNoiseFloor: 'max of unchanged-control p50 delta, baseline round-median p05-p95 spread, and retained observer floor',
      baselineInstabilityLimitPct: PROTOCOL.baselineInstabilityLimitPct,
      roundMedianCvLimitPct: PROTOCOL.roundMedianCvLimitPct,
      noSignalPolicy: 'NO SIGNAL on workload/count drift, incomplete rounds, unstable controls/candidate, inside-noise completion movement, opposing completion tails, or materially opposing supported GPU evidence'
    },
    output: {
      rawPerFrame: true,
      percentiles: ['p50', 'p95', 'p99', 'max'],
      budgetMisses: true,
      severeHitches: true,
      longestMissCluster: true,
      runVariance: true,
      labOnly: true
    },
    hardTimeoutMs: PROTOCOL.runTimeoutMs
  };
}

function createAttemptId(startedAt) {
  return `${startedAt.toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')}__pid-${process.pid}`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const { runDirectory } = await resolveRunDirectory(options.runId);

  // This is intentionally before any output directory, server, profile, or Chrome process exists.
  // Missing, non-green, uncalibrated, or source-drifted G3 evidence is a hard pre-launch refusal.
  const basis = await preflight(runDirectory);

  const startedAt = new Date();
  const performanceRoot = join(runDirectory, 'performance');
  const attemptsRoot = join(performanceRoot, 'attempts');
  const activeLock = join(performanceRoot, '.g4-active-lock');
  await mkdir(attemptsRoot, { recursive: true });
  await mkdir(activeLock, { recursive: false });
  const attemptId = createAttemptId(startedAt);
  const attemptDirectory = join(attemptsRoot, attemptId);
  const evidenceDirectory = join(attemptDirectory, 'basis');
  await mkdir(evidenceDirectory, { recursive: true });

  const protocol = protocolReceipt();
  const protocolContents = `${JSON.stringify(protocol, null, 2)}\n`;
  const rawPath = join(attemptDirectory, 'raw-samples.jsonl');
  const rawRelativePath = relative(runDirectory, rawPath);
  const basisManifest = {
    kind: 'threejs-observatory-g4-performance-basis',
    schemaVersion: 1,
    runId: EXPECTED_RUN_ID,
    gateId: GATE_ID,
    attemptId,
    harness: {
      path: relative(REPO_ROOT, HARNESS_PATH),
      sha256: basis.harness.sha256,
      bytes: basis.harness.bytes
    },
    prerequisiteReceipts: {
      g2: { path: 'review/g2-receipt.json', sha256: basis.g2Receipt.sha256 },
      s2: { path: 'review/unblinding-receipt.json', sha256: basis.s2Receipt.sha256 },
      g3: { path: 'review/g3-receipt.json', sha256: basis.g3Receipt.sha256, state: 'Objectively Green' }
    },
    fixture: {
      sourcePath: relative(REPO_ROOT, FIXTURE_PATH),
      sourceSha256: basis.fixture.sha256,
      approvalPath: relative(REPO_ROOT, FIXTURE_APPROVAL_PATH),
      approvalSha256: basis.fixtureApproval.sha256
    },
    variants: basis.variants.map((variant) => ({
      id: variant.id,
      role: variant.role,
      condition: variant.condition,
      sourceSha256: variant.source.sha256,
      instrumentedSourceSha256: variant.instrumentedSha256,
      retainedInstrumentedPath: `basis/${variant.id}.instrumented.html`
    })),
    instrumentation: {
      hookMarkerSha256: sha256(SOURCE_HOOK_MARKER),
      hookPropertySha256: sha256(SOURCE_HOOK_PROPERTY),
      pageDriverSha256: sha256(pageDriverInstaller.toString()),
      protocolSha256: sha256(canonicalJson(protocol)),
      sourceTransformSameForEveryVariant: true
    },
    controlledInputsPreflight: {
      exactRunOnly: true,
      fixtureAcceptedAndHashBound: true,
      bothCandidateSourcesS2AcceptedAndHashBound: true,
      g2ObjectivelyGreen: true,
      g3ObjectivelyGreenAndMutationCalibrated: true,
      g3BindsFixtureAndBothCandidates: true,
      duplicateFixtureControlsInstrumentToByteIdenticalSources: true,
      outputReceiptAbsentBeforeLaunch: true
    }
  };

  await Promise.all([
    writeAtomic(join(attemptDirectory, 'protocol.json'), protocolContents),
    writeJsonAtomic(join(attemptDirectory, 'basis-manifest.json'), basisManifest),
    ...basis.variants.map((variant) => writeAtomic(
      join(evidenceDirectory, `${variant.id}.instrumented.html`),
      variant.instrumentedSource
    ))
  ]);
  await appendRecords(rawPath, [{
    type: 'run-start',
    runId: EXPECTED_RUN_ID,
    gateId: GATE_ID,
    attemptId,
    startedAt: startedAt.toISOString(),
    protocolSha256: sha256(protocolContents),
    harnessSha256: basis.harness.sha256
  }]);

  let chrome = null;
  let server = null;
  let profileDirectory = null;
  let environment = null;
  let summary = null;
  let completed = false;
  let runError = null;

  try {
    profileDirectory = await mkdtemp(join(tmpdir(), 'threejs-observatory-g4-chrome-'));
    server = await startStaticServer(basis.variants);
    chrome = await launchChrome(profileDirectory);
    const system = await collectSystemInfo(chrome);
    environment = {
      capturedAt: new Date().toISOString(),
      labOrField: 'lab',
      host: {
        platform: platform(),
        release: release(),
        architecture: arch(),
        node: process.version,
        cpuModels: [...new Set(cpus().map((cpu) => cpu.model))],
        logicalCpuCount: cpus().length,
        totalMemoryBytes: totalmem(),
        powerMode: 'unknown',
        thermalPrecondition: 'unknown'
      },
      chrome: {
        executablePath: CHROME_PATH,
        launchArguments: CHROME_ARGUMENTS,
        jsonVersion: chrome.version,
        browserVersion: system.browserVersion,
        systemInfo: system.systemInfo,
        processInfoAtStart: system.processInfo,
        oneProcessForAllVariants: true,
        headless: true,
        foregroundPolicy: 'Page.bringToFront immediately before every measured batch; document.visibilityState required visible'
      },
      presentation: {
        displayHz: 'not measured; no vsync/FPS claim',
        targetBudgetHz: PROTOCOL.expectedWorkload.fixedHz,
        targetBudgetMs: PROTOCOL.frameBudgetMs,
        fixedViewport: PROTOCOL.viewport
      },
      observer: {
        directExistingRenderFrame: true,
        synchronousGlFinishCompletion: true,
        gpuTimerWhenSupported: true,
        rawOverheadRetained: true
      }
    };
    await writeJsonAtomic(join(attemptDirectory, 'environment.json'), environment);

    const measurementPromise = executeMeasurements({
      chrome,
      server,
      variants: basis.variants,
      rawPath
    });
    let timeoutId;
    const timeoutPromise = new Promise((resolveTimeout, rejectTimeout) => {
      timeoutId = setTimeout(
        () => rejectTimeout(new Error(`G4 exceeded its ${PROTOCOL.runTimeoutMs} ms hard timeout.`)),
        PROTOCOL.runTimeoutMs
      );
    });
    let measurements;
    try {
      measurements = await Promise.race([measurementPromise, timeoutPromise]);
    } catch (error) {
      measurementPromise.catch(() => {});
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    const variantSummaries = {};
    for (const variant of basis.variants) {
      variantSummaries[variant.id] = summarizeVariant(
        variant,
        measurements.completionByVariant.get(variant.id),
        measurements.gpuByVariant.get(variant.id),
        measurements.observers.get(variant.id)
      );
    }
    const baseline = pooledSummary(variantSummaries, measurements.completionByVariant, measurements.gpuByVariant);
    const noise = noiseCalibration(variantSummaries, baseline);
    const comparisons = basis.variants
      .filter((variant) => variant.role === 'eligible-candidate')
      .map((variant) => classifyComparison(variantSummaries[variant.id], baseline, noise));
    const allDirectional = comparisons.every((comparison) => comparison.result !== 'NO SIGNAL');
    const completedAt = new Date();
    summary = {
      kind: 'threejs-observatory-g4-local-performance-summary',
      schemaVersion: 1,
      runId: EXPECTED_RUN_ID,
      gateId: GATE_ID,
      attemptId,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      classification: {
        harness: 'VALID',
        run: 'COMPLETED',
        productClaim: allDirectional ? 'GREEN' : 'UNVERIFIED',
        evidenceReason: allDirectional ? null : 'NO SIGNAL'
      },
      protocol,
      interleaveOrders: measurements.orders,
      rawPerFramePath: rawRelativePath,
      variantSummaries,
      pooledFrozenFixtureBaseline: baseline,
      unchangedBaselineNoiseCalibration: noise,
      candidateComparisons: comparisons,
      finalWorkloadSnapshots: measurements.finalSnapshots,
      limitations: [
        'One local desktop Chrome/headless/ANGLE environment only.',
        'Direct fixed-state render work is not requestAnimationFrame cadence, compositor presentation, sustained thermal, mobile GPU, battery, or field evidence.',
        'gl.finish supplies an explicit full-completion boundary and intentionally changes overlap relative to a production frame loop.',
        'GPU timer evidence is absent when EXT_disjoint_timer_query_webgl2 is unsupported and invalid when the disjoint flag is observed.',
        'This gate measures the already S2-accepted, G3-topology-safe artifacts; it does not re-establish those independent judgments.'
      ],
      claimBoundary: 'Directional same-machine fixed-workload lab result only; no FPS, mobile, production-device, thermal, battery, or universal skill-quality claim.'
    };
    await appendRecords(rawPath, [{
      type: 'run-complete',
      completedAt: completedAt.toISOString(),
      classification: summary.classification,
      candidateResults: comparisons.map(({ candidateId, condition, result }) => ({ candidateId, condition, result }))
    }]);
    await writeJsonAtomic(join(attemptDirectory, 'summary.json'), summary);

    const [protocolFile, basisFile, environmentFile, rawFile, summaryFile] = await Promise.all([
      readAndHash(join(attemptDirectory, 'protocol.json')),
      readAndHash(join(attemptDirectory, 'basis-manifest.json')),
      readAndHash(join(attemptDirectory, 'environment.json')),
      readAndHash(rawPath),
      readAndHash(join(attemptDirectory, 'summary.json'))
    ]);
    const receipt = {
      kind: 'threejs-observatory-g4-local-performance-receipt',
      schemaVersion: 1,
      runId: EXPECTED_RUN_ID,
      gateId: GATE_ID,
      attemptId,
      state: allDirectional ? 'Objectively Green' : 'Open',
      classification: summary.classification,
      prerequisites: {
        g2Sha256: basis.g2Receipt.sha256,
        s2Sha256: basis.s2Receipt.sha256,
        g3Sha256: basis.g3Receipt.sha256
      },
      results: comparisons,
      evidence: {
        protocol: { path: relative(runDirectory, protocolFile.path), sha256: protocolFile.sha256, bytes: protocolFile.bytes },
        basis: { path: relative(runDirectory, basisFile.path), sha256: basisFile.sha256, bytes: basisFile.bytes },
        environment: { path: relative(runDirectory, environmentFile.path), sha256: environmentFile.sha256, bytes: environmentFile.bytes },
        rawSamples: { path: relative(runDirectory, rawFile.path), sha256: rawFile.sha256, bytes: rawFile.bytes },
        summary: { path: relative(runDirectory, summaryFile.path), sha256: summaryFile.sha256, bytes: summaryFile.bytes }
      },
      completedAt: completedAt.toISOString(),
      environment: {
        browser: environment.chrome.browserVersion.product,
        gpuDevices: environment.chrome.systemInfo.gpu?.devices || [],
        viewport: PROTOCOL.viewport
      },
      claimBoundary: summary.claimBoundary
    };
    await writeJsonAtomic(join(runDirectory, 'review', 'g4-receipt.json'), receipt);
    completed = true;
  } catch (error) {
    runError = error;
    const failedAt = new Date();
    await appendRecords(rawPath, [{
      type: 'run-failure',
      failedAt: failedAt.toISOString(),
      error: { name: error.name, message: error.message }
    }]).catch(() => {});
    await writeJsonAtomic(join(attemptDirectory, 'failure-receipt.json'), {
      kind: 'threejs-observatory-g4-failed-attempt',
      schemaVersion: 1,
      runId: EXPECTED_RUN_ID,
      gateId: GATE_ID,
      attemptId,
      classification: { harness: 'UNVERIFIED', run: 'INCOMPLETE', productClaim: 'NO SIGNAL' },
      startedAt: startedAt.toISOString(),
      failedAt: failedAt.toISOString(),
      error: { name: error.name, message: error.message, stack: error.stack },
      rawSamplesPath: rawRelativePath,
      nextAction: 'Diagnose this retained attempt; a new attempt may run only after the active lock is released and no final G4 receipt exists.'
    }).catch(() => {});
  } finally {
    if (chrome) {
      await chrome.close().catch(() => {});
      await writeAtomic(join(attemptDirectory, 'chrome-stderr.log'), chrome.stderr()).catch(() => {});
    }
    if (server) await server.close().catch(() => {});
    if (profileDirectory) await rm(profileDirectory, { recursive: true, force: true }).catch(() => {});
    await rm(activeLock, { recursive: true, force: true }).catch(() => {});
  }

  if (runError) throw runError;
  invariant(completed && summary, 'G4 ended without a completed summary.');
  process.stdout.write(`${JSON.stringify({
    runId: EXPECTED_RUN_ID,
    gateId: GATE_ID,
    attemptId,
    state: summary.classification.productClaim === 'GREEN' ? 'Objectively Green' : 'Open',
    receipt: 'review/g4-receipt.json',
    results: summary.candidateComparisons.map(({ candidateId, condition, result }) => ({ candidateId, condition, result }))
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
