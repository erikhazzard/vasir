import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HARNESS_PATH = fileURLToPath(import.meta.url);
const BENCHMARK_DIR = dirname(HARNESS_PATH);
const REPO_ROOT = resolve(BENCHMARK_DIR, '..', '..');
const RUNS_ROOT = join(REPO_ROOT, '.agents', 'vasir-evals', 'threejs-observatory-instancing');
const FIXTURE_PATH = join(BENCHMARK_DIR, 'fixture', 'index.html');
const TOPOLOGY_GUARD_PATH = join(
  REPO_ROOT,
  '.agents',
  'skills',
  'code__threejs-rapier-performance',
  'references',
  'render-topology-guard.md'
);
const CHROME_PATH = process.env.OBSERVATORY_CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const THREE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GATE_ID = 'THREEJS-OBSERVATORY__M4P__G3';
const G2_GATE_ID = 'THREEJS-OBSERVATORY__M4P__G2';
const S2_GATE_ID = 'THREEJS-OBSERVATORY__M4P__S2';
const CAPTURE_TICK = 240;
const PROFILE = Object.freeze({ id: 'portrait', width: 900, height: 1600, dpr: 1 });
const READY_TIMEOUT_MS = 30_000;
const CDP_TIMEOUT_MS = 30_000;
const FIXTURE_SHA256 = 'b9950824c09966cb3874049af509da39a5c8abac9beb6e652cda6dc0802cef29';
const TOPOLOGY_GUARD_SHA256 = '28c007f27ceed93c4bab048d03e0d44bab2274e97ed3f3af72c4916b1a23ea4b';
const RECEIPT_RELATIVE_PATH = 'review/g3-receipt.json';
const EXPECTED_MUTATION_REJECTIONS = Object.freeze([
  'FAMILY_SCALED_FULL_SCENE_PASS',
  'FAMILY_SCALED_FULL_RESOLUTION_TARGETS',
  'SECOND_TERMINAL_DEFAULT_FRAMEBUFFER_WRITE'
]);

function usage() {
  return [
    'Usage:',
    '  node benchmarks/threejs-observatory-instancing/verify-topology.mjs --run-id <opaque-run-id>',
    '  node benchmarks/threejs-observatory-instancing/verify-topology.mjs --run-dir <exact-run-directory>',
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

function countMatches(source, expression) {
  return [...source.matchAll(expression)].length;
}

function isPathInside(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot !== ''
    && pathFromRoot !== '..'
    && !pathFromRoot.startsWith(`..${sep}`)
    && !isAbsolute(pathFromRoot);
}

async function resolveRunDirectory(requestedRunDirectory) {
  const [runsRoot, runDirectory] = await Promise.all([realpath(RUNS_ROOT), realpath(requestedRunDirectory)]);
  const runStat = await stat(runDirectory);
  invariant(runStat.isDirectory(), 'Run path is not a directory.');
  invariant(
    isPathInside(runsRoot, runDirectory) && dirname(runDirectory) === runsRoot,
    `Run directory must be one direct child of ${runsRoot}.`
  );
  return { runDirectory, runId: basename(runDirectory) };
}

async function readAndHash(filePath) {
  const contents = await readFile(filePath);
  return { contents, bytes: contents.length, sha256: sha256(contents) };
}

async function readJson(filePath, label) {
  const file = await readAndHash(filePath);
  try {
    return { ...file, value: JSON.parse(file.contents.toString('utf8')) };
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

async function writeAtomic(filePath, contents) {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temporaryPath, contents, { mode: 0o644 });
  await rename(temporaryPath, filePath);
  await chmod(filePath, 0o644);
}

async function writeJsonAtomic(filePath, value) {
  await writeAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function verifyRelativeReceiptPath(relativePath, expectedPath, label) {
  invariant(relativePath === expectedPath, `${label} path drifted.`);
}

async function loadAuthority(runDirectory, runId) {
  const runFile = await readJson(join(runDirectory, 'run.json'), 'Run receipt');
  const run = runFile.value;
  invariant(run.runId === runId && run.runStatus === 'Objectively Green' && run.productClaim === 'GREEN', 'G2 run is not objectively green.');
  invariant(run.gateId === G2_GATE_ID && run.g2Receipt?.path === 'review/g2-receipt.json', 'G2 receipt binding is missing.');

  const g2File = await readJson(join(runDirectory, run.g2Receipt.path), 'G2 receipt');
  invariant(g2File.sha256 === run.g2Receipt.sha256, 'G2 receipt hash is not bound by run.json.');
  invariant(g2File.value.gateId === G2_GATE_ID && g2File.value.productClaim === 'GREEN' && g2File.value.objectiveVerdict === 'green', 'G2 prerequisite is not green.');

  const unblindingFile = await readJson(join(runDirectory, 'review', 'unblinding-receipt.json'), 'S2 unblinding receipt');
  const unblinding = unblindingFile.value;
  invariant(unblinding.runId === runId && unblinding.gate === S2_GATE_ID && unblinding.verdict === 'Accepted', 'S2 is not accepted for this exact run.');
  invariant(unblinding.commitmentVerifiedBeforeReveal === true && unblinding.conditionCommitment === run.conditionCommitment, 'S2 reveal was not bound to the verified commitment.');
  const reviewPage = await readAndHash(join(runDirectory, 'review', 'index.html'));
  invariant(reviewPage.sha256 === unblinding.reviewPageSha256, 'S2 review page hash drifted after acceptance.');

  const privateMap = (await readJson(join(runDirectory, 'private', 'condition-map.json'), 'Private assignment map')).value;
  invariant(privateMap.commitment === run.conditionCommitment, 'Private assignment commitment drifted.');
  invariant(
    sha256(`${privateMap.salt}:${canonicalJson(privateMap.mapping)}`) === run.conditionCommitment,
    'Private assignment map no longer opens the retained commitment.'
  );

  const mappingEntries = Object.entries(unblinding.mapping ?? {});
  invariant(mappingEntries.length === 2, 'S2 unblinding receipt does not contain exactly two accepted candidates.');
  const candidates = [];
  for (const [label, mapping] of mappingEntries) {
    invariant(['A', 'B'].includes(label), 'S2 unblinding label drifted.');
    invariant(['clean', 'treatment'].includes(mapping.condition), 'S2 unblinding condition drifted.');
    const privateEntry = privateMap.mapping.find(({ candidateId }) => candidateId === mapping.candidateId);
    invariant(privateEntry?.condition === mapping.condition, `S2 mapping for Candidate ${label} does not match the committed assignment.`);
    const runCandidate = run.candidates.find(({ candidateId }) => candidateId === mapping.candidateId);
    invariant(Boolean(runCandidate), `Candidate ${label} is missing from run.json.`);
    verifyRelativeReceiptPath(
      runCandidate.workspacePath,
      `candidates/${mapping.candidateId}/workspace/index.html`,
      `Candidate ${label} source`
    );
    const sourcePath = join(runDirectory, runCandidate.workspacePath);
    const source = await readAndHash(sourcePath);
    invariant(source.sha256 === mapping.sourceSha256, `Candidate ${label} source hash drifted after S2 acceptance.`);
    const output = (await readJson(join(runDirectory, runCandidate.outputReceiptPath), `Candidate ${label} output receipt`)).value;
    invariant(output.index?.sha256 === source.sha256, `Candidate ${label} output receipt does not bind its source.`);
    const patch = await readAndHash(join(runDirectory, runCandidate.patchPath));
    invariant(output.patch?.sha256 === patch.sha256, `Candidate ${label} patch hash drifted.`);
    candidates.push({ label, ...mapping, sourcePath, source, patch });
  }
  candidates.sort((left, right) => left.label.localeCompare(right.label));
  invariant(new Set(candidates.map(({ condition }) => condition)).size === 2, 'S2 unblinding receipt does not contain both conditions.');

  const fixture = await readAndHash(FIXTURE_PATH);
  const frozenFixture = await readAndHash(join(runDirectory, 'basis', 'fixture', 'index.html'));
  invariant(fixture.sha256 === FIXTURE_SHA256 && frozenFixture.sha256 === FIXTURE_SHA256, 'Frozen fixture source drifted.');
  const guard = await readAndHash(TOPOLOGY_GUARD_PATH);
  invariant(guard.sha256 === TOPOLOGY_GUARD_SHA256, 'Render-topology guard drifted from the G3 basis.');

  return {
    run,
    runFile,
    g2File,
    unblindingFile,
    reviewPage,
    privateMap,
    fixture,
    guard,
    candidates
  };
}

const DECLARED_PASS_FAMILIES = Object.freeze([
  Object.freeze({ id: 'water-reflection', owner: 'animationLoop/renderFrame', scope: 'full_scene', targetOwner: 'water-reflection', multiplicityAxis: 'frame' }),
  Object.freeze({ id: 'shared-outline-depth', owner: 'animationLoop/renderFrame', scope: 'full_scene', targetOwner: 'shared-outline', multiplicityAxis: 'frame' }),
  Object.freeze({ id: 'shared-outline-marker-mask', owner: 'animationLoop/renderFrame', scope: 'full_scene', targetOwner: 'shared-outline', multiplicityAxis: 'frame' }),
  Object.freeze({ id: 'shared-outline-edge', owner: 'animationLoop/renderFrame', scope: 'fullscreen', targetOwner: 'shared-outline', multiplicityAxis: 'frame' }),
  Object.freeze({ id: 'world-forward', owner: 'animationLoop/renderFrame', scope: 'full_scene', targetOwner: 'composer', multiplicityAxis: 'frame' }),
  Object.freeze({ id: 'bloom-chain', owner: 'animationLoop/renderFrame', scope: 'fullscreen', targetOwner: 'bloom', multiplicityAxis: 'fixed-mip-chain' }),
  Object.freeze({ id: 'terminal-world-outline-hud', owner: 'animationLoop/renderFrame', scope: 'terminal', targetOwner: 'default-framebuffer', multiplicityAxis: 'frame' })
]);

function analyzeStaticSource(source, { markerMode }) {
  const counts = {
    canvasElements: countMatches(source, /<canvas\b/g),
    rendererOwners: countMatches(source, /new THREE\.WebGLRenderer\s*\(/g),
    composerOwners: countMatches(source, /new EffectComposer\s*\(/g),
    frameOwnerFunctions: countMatches(source, /function animationLoop\s*\(/g),
    frameRenderFunctions: countMatches(source, /function renderFrame\s*\(/g),
    requestAnimationFrameSites: countMatches(source, /requestAnimationFrame\s*\(\s*animationLoop\s*\)/g),
    explicitRenderCalls: countMatches(source, /renderer\.render\s*\(/g),
    explicitComposerCalls: countMatches(source, /composer\.render\s*\(/g),
    explicitRenderTargetConstructorSites: countMatches(source, /new THREE\.WebGLRenderTarget\s*\(/g),
    explicitTerminalTargetBinds: countMatches(source, /renderer\.setRenderTarget\s*\(\s*null\s*\)/g),
    reflectorOwners: countMatches(source, /new Reflector\s*\(/g),
    deferredOrGbufferSites: countMatches(
      source,
      /\bGBuffer\b|\bG-Buffer\b|WebGLMultipleRenderTargets|WebGLRenderTarget\s*\([^)]*count\s*:/gi,
    )
  };
  const markerDrawGroups = markerMode === 'uninstanced' ? 1200 : 5;
  const familyScaledTargetSite = /Array\.from\s*\(\s*\{\s*length:\s*FAMILY_COUNT\s*\}[\s\S]{0,1200}?new THREE\.WebGLRenderTarget\s*\(/.test(source);
  const familyScaledFullSceneSite = /for\s*\([^)]*familyIndex[^)]*FAMILY_COUNT[^)]*\)[\s\S]{0,3000}?renderer\.render\s*\(\s*scene\s*,\s*camera\s*\)/.test(source);
  const requiredAnchors = {
    sharedOutlineTargets: source.includes("outlineMaskTarget.texture.name = 'shared-marker-outline-mask'")
      && source.includes("outlineEdgeTarget.texture.name = 'shared-marker-outline-edges'"),
    sharedOutlineOwner: source.includes('function renderSharedMarkerOutlines()'),
    composerWorldAndBloom: source.includes('const renderPass = new RenderPass(scene, camera)')
      && source.includes('const bloomPass = new UnrealBloomPass('),
    oneTerminalComposite: source.includes("finalWorldQuad.name = 'terminal-world-outline-composite'")
      && /renderer\.setRenderTarget\(null\);[\s\S]{0,180}?renderer\.render\(hudScene, hudCamera\);/.test(source),
    fixedWorkload: source.includes('const MARKERS_PER_FAMILY = 240;')
      && source.includes('const FAMILY_COUNT = 5;')
      && source.includes('const TOTAL_MARKERS = MARKERS_PER_FAMILY * FAMILY_COUNT;')
  };
  return {
    counts,
    declaredPassFamilies: DECLARED_PASS_FAMILIES,
    declaredPassFamilyCount: DECLARED_PASS_FAMILIES.length,
    markerDrawGroups,
    markerLogicalInstances: 1200,
    familyScaledTargetSite,
    familyScaledFullSceneSite,
    requiredAnchors
  };
}

function staticBaselineViolations(staticTopology) {
  const { counts, requiredAnchors } = staticTopology;
  const violations = [];
  if (counts.canvasElements !== 1 || counts.rendererOwners !== 1 || counts.composerOwners !== 1) violations.push('FRAME_OR_OUTPUT_OWNER_COUNT');
  if (counts.frameOwnerFunctions !== 1 || counts.frameRenderFunctions !== 1 || counts.requestAnimationFrameSites !== 2) violations.push('FRAME_OWNER_TOPOLOGY');
  if (counts.explicitRenderCalls !== 4 || counts.explicitComposerCalls !== 1) violations.push('DECLARED_SCENE_SUBMISSION_SITES');
  if (counts.explicitRenderTargetConstructorSites !== 2) violations.push('DECLARED_TARGET_SITES');
  if (counts.explicitTerminalTargetBinds !== 1) violations.push('DECLARED_TERMINAL_CHAIN');
  if (counts.deferredOrGbufferSites !== 0) violations.push('UNREQUESTED_DEFERRED_OR_GBUFFER_TOPOLOGY');
  if (staticTopology.familyScaledTargetSite || staticTopology.familyScaledFullSceneSite) violations.push('CONTENT_CARDINALITY_GLOBAL_WORK');
  if (!Object.values(requiredAnchors).every(Boolean)) violations.push('FROZEN_TOPOLOGY_ANCHOR');
  return violations;
}

function addedTopologyTokens(patchText) {
  const addedLines = patchText.split(/\r?\n/)
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));
  const tokens = [
    'WebGLRenderer',
    'EffectComposer',
    'WebGLRenderTarget',
    'renderer.render',
    'composer.render',
    'setRenderTarget',
    'requestAnimationFrame',
    '<canvas'
  ];
  return tokens.filter((token) => addedLines.some((line) => line.includes(token)));
}

function instrumentationModuleSource() {
  return `
import * as REAL from '${THREE_MODULE_URL}';

const platform = globalThis.__G3_PLATFORM_PROBE__;
const state = {
  rendererCount: 0,
  targetSequence: 0,
  targetIds: new WeakMap(),
  targetRefs: new Map(),
  renderEvents: [],
  targetBindEvents: [],
  animationLoopAssignments: 0
};

function allocationOwner(stack) {
  if (stack.includes('UnrealBloomPass')) return 'bloom';
  if (stack.includes('EffectComposer')) return 'composer';
  if (stack.includes('Reflector')) return 'water-reflection';
  return 'application';
}

function targetName(target) {
  return target?.texture?.name || target?.name || '';
}

function targetOwner(target, fallbackOwner = 'application') {
  const name = targetName(target);
  if (name.startsWith('shared-marker-outline-')) return 'shared-outline';
  if (name.startsWith('g3-mutation-family-target-')) return 'marker-family-mutation';
  if (name.includes('UnrealBloomPass')) return 'bloom';
  if (name.includes('EffectComposer')) return 'composer';
  if (name.includes('ObservatoryRippleReflector')) return 'water-reflection';
  return fallbackOwner;
}

function ensureTarget(target, ownerHint = 'application') {
  if (!target) return null;
  let id = state.targetIds.get(target);
  if (!id) {
    id = 'target-' + String(++state.targetSequence).padStart(2, '0');
    state.targetIds.set(target, id);
    state.targetRefs.set(id, { target, ownerHint });
  }
  return id;
}

function sceneSummary(root, camera) {
  let markerDrawGroups = 0;
  let markerLogicalInstances = 0;
  const markerFamilyIndexes = new Set();
  let terminalCompositePresent = false;
  let visibleObjects = 0;
  if (root?.traverseVisible) {
    root.traverseVisible((object) => {
      visibleObjects += 1;
      if (object.name === 'terminal-world-outline-composite') terminalCompositePresent = true;
      if (!Number.isInteger(object.userData?.familyIndex)) return;
      if (camera?.layers && object.layers && !object.layers.test(camera.layers)) return;
      markerDrawGroups += 1;
      markerLogicalInstances += object.isInstancedMesh ? object.count : 1;
      markerFamilyIndexes.add(object.userData.familyIndex);
    });
  }
  const sceneKind = markerDrawGroups > 0
    ? 'world-scene'
    : terminalCompositePresent
      ? 'terminal-world-hud-scene'
      : root?.isScene
        ? 'auxiliary-scene'
        : root?.isMesh
          ? 'fullscreen-quad'
          : 'other';
  return {
    sceneKind,
    visibleObjects,
    markerDrawGroups,
    markerLogicalInstances,
    markerFamilyIndexes: [...markerFamilyIndexes].sort((left, right) => left - right),
    fullScene: markerDrawGroups > 0
  };
}

function passId(target, scene) {
  if (!target) return 'terminal-world-outline-hud';
  const owner = targetOwner(target);
  const name = targetName(target);
  if (owner === 'marker-family-mutation') return 'marker-family-full-scene';
  if (owner === 'water-reflection') return 'water-reflection';
  if (owner === 'shared-outline' && name.includes('mask')) {
    const prior = state.renderEvents.filter((event) => event.targetId === ensureTarget(target)).length;
    return prior === 0 ? 'shared-outline-depth' : 'shared-outline-marker-mask';
  }
  if (owner === 'shared-outline' && name.includes('edges')) return 'shared-outline-edge';
  if (owner === 'bloom') return 'bloom-chain';
  if (owner === 'composer' && scene.fullScene) return 'world-forward';
  if (owner === 'composer') return 'bloom-chain';
  return scene.fullScene ? 'other-full-scene' : 'other-target-write';
}

class G3WebGLRenderTarget extends REAL.WebGLRenderTarget {
  constructor(...args) {
    super(...args);
    ensureTarget(this, allocationOwner(new Error().stack || ''));
  }
}

class G3WebGLRenderer extends REAL.WebGLRenderer {
  constructor(...args) {
    super(...args);
    state.rendererCount += 1;
    const originalRender = this.render;
    const originalSetRenderTarget = this.setRenderTarget;
    const originalSetAnimationLoop = this.setAnimationLoop;

    this.setRenderTarget = function instrumentedSetRenderTarget(target, ...rest) {
      state.targetBindEvents.push({
        index: state.targetBindEvents.length,
        targetId: ensureTarget(target),
        targetName: targetName(target),
        targetOwner: target ? targetOwner(target, state.targetRefs.get(ensureTarget(target))?.ownerHint) : 'default-framebuffer'
      });
      return originalSetRenderTarget.call(this, target, ...rest);
    };

    this.render = function instrumentedRender(root, camera) {
      const target = this.getRenderTarget();
      const targetId = ensureTarget(target);
      const summary = sceneSummary(root, camera);
      const event = {
        index: state.renderEvents.length,
        targetId,
        targetName: targetName(target),
        targetOwner: target ? targetOwner(target, state.targetRefs.get(targetId)?.ownerHint) : 'default-framebuffer',
        terminalOutput: target === null,
        cameraType: camera?.type || null,
        cameraLayers: camera?.layers?.mask ?? null,
        ...summary
      };
      event.passId = passId(target, event);
      state.renderEvents.push(event);
      return originalRender.call(this, root, camera);
    };

    this.setAnimationLoop = function instrumentedSetAnimationLoop(callback) {
      state.animationLoopAssignments += 1;
      return originalSetAnimationLoop.call(this, callback);
    };
  }
}

function targetSnapshot(id, record) {
  const target = record.target;
  const textures = Array.isArray(target.textures) ? target.textures : target.texture ? [target.texture] : [];
  const owner = targetOwner(target, record.ownerHint);
  return {
    id,
    owner,
    name: targetName(target),
    width: target.width,
    height: target.height,
    depth: target.depth,
    samples: target.samples,
    depthBuffer: target.depthBuffer,
    stencilBuffer: target.stencilBuffer,
    colorAttachmentCount: textures.length,
    colorFormats: textures.map((texture) => texture.format),
    colorTypes: textures.map((texture) => texture.type),
    writtenPasses: state.renderEvents.filter((event) => event.targetId === id).length
  };
}

globalThis.__G3_TOPOLOGY_INSTRUMENTATION__ = Object.freeze({
  snapshot() {
    return {
      rendererCount: state.rendererCount,
      animationLoopAssignments: state.animationLoopAssignments,
      platform: platform.snapshot(),
      targets: [...state.targetRefs.entries()].map(([id, record]) => targetSnapshot(id, record)),
      renderEvents: state.renderEvents.map((event) => ({ ...event })),
      targetBindEvents: state.targetBindEvents.map((event) => ({ ...event }))
    };
  }
});

export { G3WebGLRenderer as WebGLRenderer, G3WebGLRenderTarget as WebGLRenderTarget };
export * from '${THREE_MODULE_URL}';
`.trimStart();
}

function platformProbeSource() {
  return `(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame.bind(globalThis);
    const contexts = new WeakSet();
    let contextCallCount = 0;
    let uniqueWebglContextCount = 0;
    let animationFrameRequestCount = 0;
    HTMLCanvasElement.prototype.getContext = function instrumentedGetContext(type, ...args) {
      const context = originalGetContext.call(this, type, ...args);
      if (/^webgl2?$/.test(type)) {
        contextCallCount += 1;
        if (context && !contexts.has(context)) {
          contexts.add(context);
          uniqueWebglContextCount += 1;
        }
      }
      return context;
    };
    globalThis.requestAnimationFrame = function instrumentedRequestAnimationFrame(callback) {
      animationFrameRequestCount += 1;
      return originalRequestAnimationFrame(callback);
    };
    Object.defineProperty(globalThis, '__MOONLIT_CAPTURE_TICK__', {
      value: ${CAPTURE_TICK}, configurable: false, writable: false
    });
    globalThis.__G3_PLATFORM_PROBE__ = Object.freeze({
      snapshot: () => ({ contextCallCount, uniqueWebglContextCount, animationFrameRequestCount })
    });
  })();`;
}

function instrumentIndex(source) {
  const originalMapping = `"three": "${THREE_MODULE_URL}"`;
  invariant(source.split(originalMapping).length === 2, 'Source does not contain the one expected Three.js import-map entry.');
  return source.replace(originalMapping, '"three": "./instrumented-three.mjs"');
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
      const timeout = setTimeout(() => rejectOpen(new Error('Timed out connecting to Chrome target.')), CDP_TIMEOUT_MS);
      this.socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolveOpen();
      }, { once: true });
      this.socket.addEventListener('error', () => {
        clearTimeout(timeout);
        rejectOpen(new Error('Failed to connect to Chrome target.'));
      }, { once: true });
    });
    this.socket.addEventListener('message', (event) => this.#onMessage(event.data));
    this.socket.addEventListener('close', () => {
      for (const { reject, timeout } of this.pending.values()) {
        clearTimeout(timeout);
        reject(new Error('CDP socket closed before command completion.'));
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
    return new Promise((resolveEvent, rejectEvent) => {
      const timeout = setTimeout(() => {
        this.waiters.delete(method);
        rejectEvent(new Error(`Timed out waiting for ${method}.`));
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
        '.mjs': 'text/javascript; charset=utf-8'
      };
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Connection': 'close',
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
  invariant(address && typeof address !== 'string', 'Static server did not expose a TCP port.');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
      server.closeAllConnections();
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
  invariant(Number.isInteger(port) && port > 0, 'Chrome exposed an invalid CDP port.');
  const response = await fetch(`http://127.0.0.1:${port}/json/version`);
  invariant(response.ok, `Could not read Chrome version: ${response.status}.`);
  const version = await response.json();
  return {
    child,
    port,
    version,
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

function serializeRemoteValues(args = []) {
  return args.map((arg) => Object.hasOwn(arg, 'value') ? arg.value : arg.unserializableValue || arg.description || arg.type);
}

async function observeInstrumentedPage(chrome, origin) {
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
        lineNumber: exceptionDetails?.lineNumber ?? null
      });
    });
    client.on('Runtime.consoleAPICalled', ({ type, args }) => {
      if (['error', 'warning', 'assert'].includes(type)) diagnostics.consoleMessages.push({ type, values: serializeRemoteValues(args) });
    });
    client.on('Log.entryAdded', ({ entry }) => {
      if (entry && ['error', 'warning'].includes(entry.level)) diagnostics.logEntries.push({ level: entry.level, source: entry.source, text: entry.text });
    });
    await Promise.all([client.send('Page.enable'), client.send('Runtime.enable'), client.send('Log.enable')]);
    await client.send('Page.addScriptToEvaluateOnNewDocument', { source: platformProbeSource() });
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: PROFILE.width,
      height: PROFILE.height,
      deviceScaleFactor: PROFILE.dpr,
      mobile: false,
      screenWidth: PROFILE.width,
      screenHeight: PROFILE.height,
      positionX: 0,
      positionY: 0
    });
    const loaded = client.once('Page.loadEventFired', READY_TIMEOUT_MS);
    const navigation = await client.send('Page.navigate', { url: `${origin}/index.html` });
    invariant(!navigation.errorText, `Navigation failed: ${navigation.errorText}.`);
    await loaded;
    const ready = await client.send('Runtime.evaluate', {
      expression: `new Promise((resolveReady, rejectReady) => {
        if (document.documentElement.dataset.ready === 'true') { resolveReady(true); return; }
        const timeout = setTimeout(() => { observer.disconnect(); rejectReady(new Error('ready timeout')); }, ${READY_TIMEOUT_MS});
        const observer = new MutationObserver(() => {
          if (document.documentElement.dataset.ready !== 'true') return;
          clearTimeout(timeout); observer.disconnect(); resolveReady(true);
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ready'] });
      })`,
      awaitPromise: true,
      returnByValue: true
    }, READY_TIMEOUT_MS + 5_000);
    invariant(!ready.exceptionDetails && ready.result?.value === true, 'Instrumented page did not reach data-ready.');
    const result = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const api = globalThis.__moonlitObservatory;
        const instrument = globalThis.__G3_TOPOLOGY_INSTRUMENTATION__;
        if (!api || !instrument) throw new Error('G3 instrumentation API unavailable');
        api.renderer.getContext().finish();
        return {
          ready: document.documentElement.dataset.ready,
          captureTick: document.querySelector('canvas')?.dataset.captureTick || null,
          canvasCount: document.querySelectorAll('canvas').length,
          viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
          workload: {
            seed: api.seed,
            familyCount: api.familyCount,
            markersPerFamily: api.markersPerFamily,
            totalMarkers: api.totalMarkers,
            markerRenderableCount: api.markerMeshes.length,
            instancedMarkerRenderableCount: api.markerMeshes.filter((mesh) => mesh.isInstancedMesh).length,
            markerInstanceCounts: api.markerMeshes.filter((mesh) => mesh.isInstancedMesh).map((mesh) => mesh.count)
          },
          topology: instrument.snapshot()
        };
      })()`,
      returnByValue: true
    });
    invariant(!result.exceptionDetails && result.result?.value, `Could not read topology observation: ${result.exceptionDetails?.exception?.description || 'unknown error'}.`);
    return { observation: result.result.value, diagnostics };
  } finally {
    client.close();
    await closeTarget(chrome.port, target.id);
  }
}

async function captureSourceTopology(chrome, sourceBuffer) {
  const workspace = await mkdtemp(join(tmpdir(), 'threejs-observatory-g3-page-'));
  const source = sourceBuffer.toString('utf8');
  const instrumentedSource = instrumentIndex(source);
  const wrapper = instrumentationModuleSource();
  await Promise.all([
    writeFile(join(workspace, 'index.html'), instrumentedSource),
    writeFile(join(workspace, 'instrumented-three.mjs'), wrapper)
  ]);
  const server = await startStaticServer(workspace);
  try {
    const result = await observeInstrumentedPage(chrome, server.origin);
    return {
      ...result,
      instrumentation: {
        sourceTransform: 'only the frozen Three.js import-map URL is redirected to the local wrapper',
        instrumentedIndexSha256: sha256(instrumentedSource),
        moduleSha256: sha256(wrapper),
        platformPreludeSha256: sha256(platformProbeSource())
      }
    };
  } finally {
    await server.close();
    await rm(workspace, { recursive: true, force: true });
  }
}

function ownerForTarget(target) {
  return target.owner || 'unknown';
}

function summarizeRuntime(capture) {
  const { observation, diagnostics } = capture;
  invariant(observation.ready === 'true' && observation.captureTick === String(CAPTURE_TICK), 'Topology capture did not observe the deterministic frame.');
  invariant(
    observation.viewport.width === PROFILE.width
      && observation.viewport.height === PROFILE.height
      && observation.viewport.dpr === PROFILE.dpr,
    'Topology capture viewport drifted.'
  );
  invariant(observation.canvasCount === 1, 'Topology capture did not observe exactly one canvas.');
  invariant(
    diagnostics.runtimeExceptions.length === 0
      && !diagnostics.consoleMessages.some(({ type }) => ['error', 'assert'].includes(type))
      && !diagnostics.logEntries.some(({ level }) => level === 'error'),
    'Topology capture encountered a browser/runtime error.'
  );
  const { topology } = observation;
  const renderEvents = topology.renderEvents;
  const targets = topology.targets;
  const fullSceneEvents = renderEvents.filter(({ fullScene }) => fullScene);
  const terminalEvents = renderEvents.filter(({ terminalOutput }) => terminalOutput);
  const writtenTargetIds = new Set(renderEvents.filter(({ targetId }) => targetId).map(({ targetId }) => targetId));
  const fullResolutionTargets = targets.filter(({ width, height }) => width === PROFILE.width && height === PROFILE.height);
  const passExecutions = Object.entries(renderEvents.reduce((counts, event) => {
    counts[event.passId] = Number(counts[event.passId] || 0) + 1;
    return counts;
  }, {})).map(([id, executions]) => ({ id, executions })).sort((left, right) => left.id.localeCompare(right.id));
  const targetOwners = Object.entries(targets.reduce((counts, target) => {
    const owner = ownerForTarget(target);
    counts[owner] = Number(counts[owner] || 0) + 1;
    return counts;
  }, {})).map(([owner, targets]) => ({ owner, targets })).sort((left, right) => left.owner.localeCompare(right.owner));
  const attachmentFamilies = Object.entries(targets.reduce((counts, target) => {
    const signature = canonicalJson({
      owner: ownerForTarget(target),
      width: target.width,
      height: target.height,
      samples: target.samples,
      depthBuffer: target.depthBuffer,
      stencilBuffer: target.stencilBuffer,
      colorAttachmentCount: target.colorAttachmentCount,
      colorFormats: target.colorFormats,
      colorTypes: target.colorTypes
    });
    counts[signature] = Number(counts[signature] || 0) + 1;
    return counts;
  }, {})).map(([signature, targetCount]) => ({ ...JSON.parse(signature), targetCount }));
  return {
    deterministicFrame: { tick: CAPTURE_TICK, profile: PROFILE },
    counts: {
      frameOwners: 1,
      canvasElements: observation.canvasCount,
      rendererOwners: topology.rendererCount,
      webglContexts: topology.platform.uniqueWebglContextCount,
      animationLoopAssignments: topology.animationLoopAssignments,
      animationFrameRequestsAtFixedTick: topology.platform.animationFrameRequestCount,
      sceneSubmissions: renderEvents.length,
      targetWritePassExecutions: renderEvents.length,
      fullScenePassExecutions: fullSceneEvents.length,
      gbufferPassExecutions: targets.some(({ colorAttachmentCount }) => colorAttachmentCount > 1) ? 1 : 0,
      offscreenTargetObjectsAllocated: targets.length,
      uniqueOffscreenTargetsWritten: writtenTargetIds.size,
      fullResolutionOffscreenTargetsAllocated: fullResolutionTargets.length,
      terminalDefaultFramebufferWritePasses: terminalEvents.length,
      markerEligibleSceneSubmissions: fullSceneEvents.filter(({ markerDrawGroups }) => markerDrawGroups > 0).length,
      markerDrawGroupSubmissions: fullSceneEvents.reduce((total, event) => total + event.markerDrawGroups, 0),
      markerLogicalInstanceSubmissions: fullSceneEvents.reduce((total, event) => total + event.markerLogicalInstances, 0)
    },
    passExecutions,
    targetOwners,
    attachmentFamilies,
    targets,
    terminalWrites: terminalEvents.map(({ index, passId, sceneKind, targetOwner }) => ({ index, passId, sceneKind, targetOwner })),
    fullSceneSubmissions: fullSceneEvents.map(({ index, passId, targetOwner, markerDrawGroups, markerLogicalInstances, markerFamilyIndexes }) => ({
      index,
      passId,
      targetOwner,
      markerDrawGroups,
      markerLogicalInstances,
      markerFamilyIndexes
    })),
    workload: observation.workload,
    diagnostics,
    instrumentation: capture.instrumentation,
    backendRenderPasses: null,
    backendRenderPassObservation: 'Not asserted: G3 uses declared topology plus observable WebGL target-write/scene-submission scopes.'
  };
}

function topologySignature(runtime) {
  const counts = runtime.counts;
  return {
    frameOwners: counts.frameOwners,
    canvasElements: counts.canvasElements,
    rendererOwners: counts.rendererOwners,
    webglContexts: counts.webglContexts,
    sceneSubmissions: counts.sceneSubmissions,
    targetWritePassExecutions: counts.targetWritePassExecutions,
    fullScenePassExecutions: counts.fullScenePassExecutions,
    gbufferPassExecutions: counts.gbufferPassExecutions,
    offscreenTargetObjectsAllocated: counts.offscreenTargetObjectsAllocated,
    uniqueOffscreenTargetsWritten: counts.uniqueOffscreenTargetsWritten,
    fullResolutionOffscreenTargetsAllocated: counts.fullResolutionOffscreenTargetsAllocated,
    terminalDefaultFramebufferWritePasses: counts.terminalDefaultFramebufferWritePasses,
    markerEligibleSceneSubmissions: counts.markerEligibleSceneSubmissions,
    markerLogicalInstanceSubmissions: counts.markerLogicalInstanceSubmissions,
    passExecutions: runtime.passExecutions,
    targetOwners: runtime.targetOwners,
    attachmentFamilies: runtime.attachmentFamilies
  };
}

function evaluateCandidate({ baselineStatic, baselineRuntime, candidateStatic, candidateRuntime, patchText }) {
  const violations = [];
  const addedTokens = addedTopologyTokens(patchText);
  if (staticBaselineViolations(candidateStatic).length) violations.push('STATIC_TOPOLOGY_CONTRACT');
  if (addedTokens.length) violations.push('PATCH_ADDS_TOPOLOGY_OWNER_OR_SITE');
  if (canonicalJson(topologySignature(candidateRuntime)) !== canonicalJson(topologySignature(baselineRuntime))) {
    violations.push('EXECUTED_GLOBAL_TOPOLOGY_DELTA');
  }
  if (candidateRuntime.counts.markerDrawGroupSubmissions !== 20
    || candidateRuntime.counts.markerLogicalInstanceSubmissions !== 4800
    || candidateRuntime.counts.markerEligibleSceneSubmissions !== 4) {
    violations.push('MARKER_DRAW_GROUP_CONTRACT');
  }
  if (candidateStatic.markerDrawGroups !== 5 || candidateRuntime.workload.markerRenderableCount !== 5
    || candidateRuntime.workload.instancedMarkerRenderableCount !== 5
    || candidateRuntime.workload.markerInstanceCounts.length !== 5
    || candidateRuntime.workload.markerInstanceCounts.some((count) => count !== 240)) {
    violations.push('FIVE_BY_240_INSTANCING_CONTRACT');
  }
  const deltas = Object.fromEntries(Object.keys(baselineRuntime.counts).map((key) => [
    key,
    typeof baselineRuntime.counts[key] === 'number' && typeof candidateRuntime.counts[key] === 'number'
      ? candidateRuntime.counts[key] - baselineRuntime.counts[key]
      : null
  ]));
  return {
    disposition: violations.length ? 'REJECT_UNFORCED_MULTIPLIER' : 'SAFE_LOCAL_CHANGE',
    violations,
    addedTopologyTokens: addedTokens,
    topologyDelta: deltas,
    expectedDrawGroupDelta: {
      perEligibleSceneSubmission: { before: 1200, after: 5, delta: -1195 },
      deterministicFrame: { before: 4800, after: 20, delta: -4780 },
      logicalInstanceSubmissions: { before: 4800, after: 4800, delta: 0 }
    },
    declaredPassFamiliesEqual: canonicalJson(candidateStatic.declaredPassFamilies) === canonicalJson(baselineStatic.declaredPassFamilies)
  };
}

const MUTATION_ALLOCATIONS = `

    const g3MutationFamilyTargets = Array.from({ length: FAMILY_COUNT }, (_unused, familyIndex) => {
      const target = new THREE.WebGLRenderTarget(1, 1, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: false,
        samples: 0
      });
      target.texture.name = \`g3-mutation-family-target-\${familyIndex}\`;
      return target;
    });`;

const MUTATION_RESIZE = `
      for (const target of g3MutationFamilyTargets) {
        target.setSize(drawingBufferWidth, drawingBufferHeight);
      }`;

const MUTATION_FAMILY_PASSES = `
      const g3MutationPreviousLayers = camera.layers.mask;
      const g3MutationPreviousVisibility = markerMeshes.map((marker) => marker.visible);
      camera.layers.set(1);
      for (let familyIndex = 0; familyIndex < FAMILY_COUNT; familyIndex += 1) {
        for (const marker of markerMeshes) {
          marker.visible = marker.userData.familyIndex === familyIndex;
        }
        renderer.setRenderTarget(g3MutationFamilyTargets[familyIndex]);
        renderer.clear(true, true, true);
        renderer.render(scene, camera);
      }
      for (let markerIndex = 0; markerIndex < markerMeshes.length; markerIndex += 1) {
        markerMeshes[markerIndex].visible = g3MutationPreviousVisibility[markerIndex];
      }
      camera.layers.mask = g3MutationPreviousLayers;`;

const MUTATION_SECOND_TERMINAL_WRITE = `
      // G3 mutation: independently write the terminal HUD/default framebuffer a second time.
      renderer.render(hudScene, hudCamera);`;

function replaceOnce(source, anchor, replacement, label) {
  invariant(source.split(anchor).length === 2, `Mutation anchor drifted: ${label}.`);
  return source.replace(anchor, replacement);
}

function applyMutation(source) {
  let mutated = replaceOnce(
    source,
    "    outlineEdgeTarget.texture.name = 'shared-marker-outline-edges';",
    "    outlineEdgeTarget.texture.name = 'shared-marker-outline-edges';" + MUTATION_ALLOCATIONS,
    'target allocation'
  );
  mutated = replaceOnce(
    mutated,
    '      outlineEdgeTarget.setSize(drawingBufferWidth, drawingBufferHeight);',
    '      outlineEdgeTarget.setSize(drawingBufferWidth, drawingBufferHeight);' + MUTATION_RESIZE,
    'target resize'
  );
  mutated = replaceOnce(
    mutated,
    '      renderSharedMarkerOutlines();',
    '      renderSharedMarkerOutlines();' + MUTATION_FAMILY_PASSES,
    'family-scaled passes'
  );
  mutated = replaceOnce(
    mutated,
    '      renderer.render(hudScene, hudCamera);\n    }',
    '      renderer.render(hudScene, hudCamera);' + MUTATION_SECOND_TERMINAL_WRITE + '\n    }',
    'second terminal write'
  );
  return mutated;
}

function reverseMutation(mutated) {
  let restored = replaceOnce(mutated, MUTATION_ALLOCATIONS, '', 'inverse target allocation');
  restored = replaceOnce(restored, MUTATION_RESIZE, '', 'inverse target resize');
  restored = replaceOnce(restored, MUTATION_FAMILY_PASSES, '', 'inverse family-scaled passes');
  restored = replaceOnce(restored, MUTATION_SECOND_TERMINAL_WRITE, '', 'inverse second terminal write');
  return restored;
}

function evaluateMutation(baselineStatic, baselineRuntime, mutationStatic, mutationRuntime) {
  const rejections = [];
  const fullSceneDelta = mutationRuntime.counts.fullScenePassExecutions - baselineRuntime.counts.fullScenePassExecutions;
  const fullResolutionTargetDelta = mutationRuntime.counts.fullResolutionOffscreenTargetsAllocated
    - baselineRuntime.counts.fullResolutionOffscreenTargetsAllocated;
  const terminalDelta = mutationRuntime.counts.terminalDefaultFramebufferWritePasses
    - baselineRuntime.counts.terminalDefaultFramebufferWritePasses;
  if (mutationStatic.familyScaledFullSceneSite && fullSceneDelta === 5) rejections.push('FAMILY_SCALED_FULL_SCENE_PASS');
  if (mutationStatic.familyScaledTargetSite && fullResolutionTargetDelta === 5) rejections.push('FAMILY_SCALED_FULL_RESOLUTION_TARGETS');
  if (mutationStatic.counts.explicitTerminalTargetBinds === 1
    && mutationRuntime.counts.terminalDefaultFramebufferWritePasses === 2
    && terminalDelta === 1) {
    rejections.push('SECOND_TERMINAL_DEFAULT_FRAMEBUFFER_WRITE');
  }
  return {
    disposition: rejections.length ? 'REJECT_UNFORCED_MULTIPLIER' : 'SAFE_LOCAL_CHANGE',
    rejections: rejections.sort(),
    expectedRejections: [...EXPECTED_MUTATION_REJECTIONS].sort(),
    rejectedForExactIntendedReasons: canonicalJson(rejections.sort()) === canonicalJson([...EXPECTED_MUTATION_REJECTIONS].sort()),
    observedDelta: {
      fullScenePassExecutions: fullSceneDelta,
      fullResolutionOffscreenTargetsAllocated: fullResolutionTargetDelta,
      terminalDefaultFramebufferWritePasses: terminalDelta,
      sceneSubmissions: mutationRuntime.counts.sceneSubmissions - baselineRuntime.counts.sceneSubmissions,
      targetWritePassExecutions: mutationRuntime.counts.targetWritePassExecutions - baselineRuntime.counts.targetWritePassExecutions
    }
  };
}

function browserIdentity(chrome) {
  return {
    product: chrome.version.Browser,
    protocolVersion: chrome.version['Protocol-Version'],
    userAgent: chrome.version['User-Agent'],
    jsVersion: chrome.version['V8-Version'],
    webkitVersion: chrome.version['WebKit-Version']
  };
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const { runDirectory, runId } = await resolveRunDirectory(args.requestedRunDirectory);
  const authority = await loadAuthority(runDirectory, runId);
  const fixtureSource = authority.fixture.contents.toString('utf8');
  const fixtureStatic = analyzeStaticSource(fixtureSource, { markerMode: 'uninstanced' });
  invariant(staticBaselineViolations(fixtureStatic).length === 0, `Frozen fixture static topology is invalid: ${staticBaselineViolations(fixtureStatic).join(', ')}.`);

  const temporaryChromeProfile = await mkdtemp(join(tmpdir(), 'threejs-observatory-g3-chrome-'));
  const mutationCustodyDirectory = await mkdtemp(join(tmpdir(), 'threejs-observatory-g3-mutation-'));
  const mutationCustodyPath = join(mutationCustodyDirectory, 'index.html');
  let chrome;
  let mutationDirectoryRemoved = false;
  let chromeProfileRemoved = false;
  let result;
  try {
    chrome = await launchChrome(temporaryChromeProfile);
    const fixtureRuntime = summarizeRuntime(await captureSourceTopology(chrome, authority.fixture.contents));
    invariant(fixtureRuntime.counts.fullScenePassExecutions === 4, 'Frozen fixture did not execute exactly four marker-eligible full-scene submissions.');
    invariant(fixtureRuntime.counts.markerDrawGroupSubmissions === 4800, 'Frozen fixture marker draw-group count drifted.');
    invariant(fixtureRuntime.counts.markerLogicalInstanceSubmissions === 4800, 'Frozen fixture logical marker workload drifted.');
    invariant(fixtureRuntime.counts.terminalDefaultFramebufferWritePasses === 1, 'Frozen fixture did not execute exactly one terminal default-framebuffer write.');
    invariant(fixtureRuntime.counts.gbufferPassExecutions === 0, 'Frozen forward fixture unexpectedly exposed a G-buffer/MRT pass.');

    const candidateResults = [];
    for (const candidate of authority.candidates) {
      const sourceText = candidate.source.contents.toString('utf8');
      const staticTopology = analyzeStaticSource(sourceText, { markerMode: 'instanced' });
      const runtimeTopology = summarizeRuntime(await captureSourceTopology(chrome, candidate.source.contents));
      const evaluation = evaluateCandidate({
        baselineStatic: fixtureStatic,
        baselineRuntime: fixtureRuntime,
        candidateStatic: staticTopology,
        candidateRuntime: runtimeTopology,
        patchText: candidate.patch.contents.toString('utf8')
      });
      candidateResults.push({
        label: candidate.label,
        candidateId: candidate.candidateId,
        condition: candidate.condition,
        sourceSha256: candidate.source.sha256,
        patchSha256: candidate.patch.sha256,
        staticTopology,
        runtimeTopology,
        evaluation
      });
    }
    invariant(candidateResults.every(({ evaluation }) => evaluation.disposition === 'SAFE_LOCAL_CHANGE'), 'At least one S2-accepted candidate expanded frame-global render topology.');

    await writeFile(mutationCustodyPath, authority.fixture.contents);
    const custodyBefore = await readAndHash(mutationCustodyPath);
    const mutatedSource = applyMutation(fixtureSource);
    await writeFile(mutationCustodyPath, mutatedSource);
    const mutatedFile = await readAndHash(mutationCustodyPath);
    invariant(mutatedFile.sha256 !== custodyBefore.sha256, 'Bounded topology mutation did not change its temporary fixture copy.');
    const mutationStatic = analyzeStaticSource(mutatedSource, { markerMode: 'uninstanced' });
    const mutationRuntime = summarizeRuntime(await captureSourceTopology(chrome, mutatedFile.contents));
    const mutationEvaluation = evaluateMutation(fixtureStatic, fixtureRuntime, mutationStatic, mutationRuntime);
    invariant(mutationEvaluation.disposition === 'REJECT_UNFORCED_MULTIPLIER', 'Mutation was not rejected.');
    invariant(mutationEvaluation.rejectedForExactIntendedReasons, `Mutation rejection reasons drifted: ${mutationEvaluation.rejections.join(', ')}.`);

    const restoredSource = reverseMutation(mutatedSource);
    await writeFile(mutationCustodyPath, restoredSource);
    const custodyAfterInverse = await readAndHash(mutationCustodyPath);
    invariant(custodyAfterInverse.sha256 === custodyBefore.sha256, 'Exact inverse mutation did not restore byte-identical fixture bytes.');
    const restoredStatic = analyzeStaticSource(restoredSource, { markerMode: 'uninstanced' });
    const restoredRuntime = summarizeRuntime(await captureSourceTopology(chrome, custodyAfterInverse.contents));
    invariant(staticBaselineViolations(restoredStatic).length === 0, 'Restored fixture remained statically red.');
    invariant(canonicalJson(topologySignature(restoredRuntime)) === canonicalJson(topologySignature(fixtureRuntime)), 'Restored fixture did not rerun with byte-identical topology counts.');

    result = {
      fixtureStatic,
      fixtureRuntime,
      candidateResults,
      mutation: {
        source: {
          originalSha256: custodyBefore.sha256,
          mutatedSha256: mutatedFile.sha256,
          restoredSha256: custodyAfterInverse.sha256
        },
        staticTopology: mutationStatic,
        runtimeTopology: mutationRuntime,
        evaluation: mutationEvaluation,
        restoration: {
          exactInverseApplied: true,
          byteIdenticalBeforeAfter: custodyAfterInverse.sha256 === custodyBefore.sha256,
          restoredStaticDisposition: 'SAFE_LOCAL_CHANGE',
          restoredRuntimeTopologyMatchesBaseline: true
        }
      },
      browser: browserIdentity(chrome)
    };
  } finally {
    await chrome?.close();
    await rm(temporaryChromeProfile, { recursive: true, force: true });
    chromeProfileRemoved = true;
    await rm(mutationCustodyDirectory, { recursive: true, force: true });
    mutationDirectoryRemoved = true;
  }

  invariant(result, 'G3 run did not produce a result.');
  const fixtureAfterRun = await readAndHash(FIXTURE_PATH);
  invariant(fixtureAfterRun.sha256 === FIXTURE_SHA256, 'Frozen fixture changed during mutation calibration.');
  const harness = await readAndHash(HARNESS_PATH);
  const verifiedAt = new Date().toISOString();
  result.mutation.restoration.temporaryMutationDirectoryRemoved = mutationDirectoryRemoved;
  result.mutation.restoration.temporaryChromeProfileRemoved = chromeProfileRemoved;
  result.mutation.restoration.frozenFixtureUnchanged = fixtureAfterRun.sha256 === FIXTURE_SHA256;

  const receipt = {
    kind: 'threejs-observatory-render-topology-verification',
    schemaVersion: 1,
    gateId: GATE_ID,
    runId,
    state: 'Objectively Green',
    classification: {
      harness: 'VALID',
      run: 'COMPLETED',
      productClaim: 'GREEN',
      evidenceReason: null
    },
    verifiedAt,
    command: `node benchmarks/threejs-observatory-instancing/verify-topology.mjs --run-id ${runId}`,
    harness: {
      file: 'benchmarks/threejs-observatory-instancing/verify-topology.mjs',
      sha256: harness.sha256
    },
    prerequisites: {
      g2: { path: authority.run.g2Receipt.path, sha256: authority.g2File.sha256, productClaim: 'GREEN' },
      s2: {
        path: 'review/unblinding-receipt.json',
        sha256: authority.unblindingFile.sha256,
        verdict: 'Accepted',
        reviewPageSha256: authority.reviewPage.sha256,
        commitmentSha256: authority.run.conditionCommitment
      }
    },
    basis: {
      fixture: {
        file: 'benchmarks/threejs-observatory-instancing/fixture/index.html',
        sourceSha256: authority.fixture.sha256,
        markerMode: 'uninstanced'
      },
      renderTopologyGuard: {
        file: '.agents/skills/code__threejs-rapier-performance/references/render-topology-guard.md',
        sha256: authority.guard.sha256
      },
      browser: result.browser,
      deterministicFrame: { tick: CAPTURE_TICK, profile: PROFILE }
    },
    topologyContract: {
      frameOwner: 'animationLoop/renderFrame',
      outputSurface: 'one canvas.observatory-stage / one WebGL context',
      declaredPassFamilies: DECLARED_PASS_FAMILIES,
      allowedMultiplicityChange: 'marker draw groups may change from 1,200 to five inside the same four eligible full-scene submissions',
      forbiddenMultiplicityChange: 'marker-family cardinality may not change owners, full-scene passes, targets/attachments, G-buffer passes, or terminal default-framebuffer writes'
    },
    fixture: {
      sourceSha256: authority.fixture.sha256,
      staticTopology: result.fixtureStatic,
      runtimeTopology: result.fixtureRuntime
    },
    candidates: result.candidateResults,
    aggregateDisposition: 'SAFE_LOCAL_CHANGE',
    potency: {
      type: 'mutation',
      bound: {
        source: 'temporary byte-for-byte copy of frozen fixture',
        markerFamilies: 5,
        deterministicFramesPerObservation: 1,
        browserProfiles: 1,
        candidateArtifactsModified: 0
      },
      mutation: result.mutation,
      harnessCalibration: 'VALID'
    },
    claimBoundary: 'G3 proves source-declared and one-frame executed render topology for this exact frozen fixture and the two S2-accepted candidates in local Chrome. SAFE_LOCAL_CHANGE is not a timing or performance-win claim; G4 remains required for causal local performance evidence.',
    nextRequiredAction: 'Run the separately approved G4 interleaved local performance harness using this exact green G3 receipt and candidate source hashes.'
  };
  const receiptContents = `${JSON.stringify(receipt, null, 2)}\n`;
  await writeAtomic(join(runDirectory, RECEIPT_RELATIVE_PATH), receiptContents);
  const receiptSha256 = sha256(receiptContents);
  const updatedRun = {
    ...authority.run,
    g3: {
      gateId: GATE_ID,
      state: receipt.state,
      productClaim: receipt.classification.productClaim,
      verifiedAt,
      receipt: { path: RECEIPT_RELATIVE_PATH, sha256: receiptSha256 },
      candidateSourceHashes: Object.fromEntries(result.candidateResults.map(({ candidateId, sourceSha256 }) => [candidateId, sourceSha256]))
    },
    nextRequiredAction: receipt.nextRequiredAction
  };
  await writeJsonAtomic(join(runDirectory, 'run.json'), updatedRun);

  process.stdout.write(`${JSON.stringify({
    gateId: GATE_ID,
    state: receipt.state,
    classification: receipt.classification,
    receipt: RECEIPT_RELATIVE_PATH,
    receiptSha256,
    fixtureCounts: result.fixtureRuntime.counts,
    candidates: result.candidateResults.map(({ label, candidateId, condition, sourceSha256, runtimeTopology, evaluation }) => ({
      label,
      candidateId,
      condition,
      sourceSha256,
      counts: runtimeTopology.counts,
      disposition: evaluation.disposition
    })),
    mutation: {
      disposition: result.mutation.evaluation.disposition,
      rejections: result.mutation.evaluation.rejections,
      observedDelta: result.mutation.evaluation.observedDelta,
      noResidualMutation: result.mutation.restoration.byteIdenticalBeforeAfter
        && result.mutation.restoration.temporaryMutationDirectoryRemoved
        && result.mutation.restoration.frozenFixtureUnchanged
    }
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
