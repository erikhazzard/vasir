export const TOPOLOGY_OBSERVER_SOURCE = `(() => {
  if (window.__vasirWaterObserver) return;
  const state = {
    active: false,
    canvasElementsCreated: 0,
    contextCreations: 0,
    rafRequests: 0,
    measured: null
  };
  const contextSet = new WeakSet();
  const originalCreateElement = Document.prototype.createElement;
  Document.prototype.createElement = function(tagName, options) {
    const element = originalCreateElement.call(this, tagName, options);
    if (String(tagName).toLowerCase() === 'canvas') state.canvasElementsCreated += 1;
    return element;
  };
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attributes) {
    const context = originalGetContext.call(this, type, attributes);
    if (context && !contextSet.has(context)) {
      contextSet.add(context);
      state.contextCreations += 1;
    }
    return context;
  };
  const originalRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function(callback) {
    state.rafRequests += 1;
    return originalRaf(callback);
  };
  function patchPrototype(prototype) {
    if (!prototype) return;
    const originalBindFramebuffer = prototype.bindFramebuffer;
    if (originalBindFramebuffer) {
      prototype.bindFramebuffer = function(target, framebuffer) {
        if (state.active && state.measured) {
          state.measured.framebufferBinds += 1;
          if (framebuffer === null) state.measured.terminalFramebufferBinds += 1;
          else state.measured.offscreenFramebufferBinds += 1;
          state.measured.currentFramebufferIsTerminal = framebuffer === null;
        }
        return originalBindFramebuffer.call(this, target, framebuffer);
      };
    }
    for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const original = prototype[name];
      if (!original) continue;
      prototype[name] = function(...args) {
        if (state.active && state.measured) {
          state.measured.webglDrawCalls += 1;
          if (state.measured.currentFramebufferIsTerminal) state.measured.terminalDrawCalls += 1;
          else state.measured.offscreenDrawCalls += 1;
        }
        return original.apply(this, args);
      };
    }
  }
  patchPrototype(window.WebGLRenderingContext?.prototype);
  patchPrototype(window.WebGL2RenderingContext?.prototype);
  window.__vasirWaterObserver = Object.freeze({
    beginFrame() {
      state.measured = {
        framebufferBinds: 0,
        terminalFramebufferBinds: 0,
        offscreenFramebufferBinds: 0,
        webglDrawCalls: 0,
        terminalDrawCalls: 0,
        offscreenDrawCalls: 0,
        currentFramebufferIsTerminal: true
      };
      state.active = true;
    },
    endFrame() {
      state.active = false;
      return { ...state.measured };
    },
    snapshot() {
      return {
        canvasElementsCreated: state.canvasElementsCreated,
        canvasElementsConnected: document.querySelectorAll('canvas').length,
        contextCreations: state.contextCreations,
        rafRequests: state.rafRequests
      };
    }
  });
})();`;

async function pageProbe(options) {
  const hook = window.__waterRipplesBenchmark;
  if (!hook || hook.version !== 1) throw new Error('Missing water-ripples benchmark API version 1.');
  if (hook.ready && typeof hook.ready.then === 'function') await hook.ready;
  const renderer = hook.renderer;
  const gl = hook.gl || renderer?.getContext?.();
  if (!renderer || !gl) throw new Error('Benchmark API did not expose renderer and GL context.');
  const observer = window.__vasirWaterObserver;
  const seed = options.seed;
  const frameBudgetMs = options.frameBudgetMs;

  function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function summarize(values) {
    const finite = values.filter(finiteNumber).sort((a, b) => a - b);
    if (!finite.length) return null;
    const at = (fraction) => finite[Math.min(finite.length - 1, Math.max(0, Math.ceil(fraction * finite.length) - 1))];
    const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
    const misses = finite.filter((value) => value > frameBudgetMs).length;
    return {
      count: finite.length,
      min: finite[0],
      p50: at(0.5),
      p95: at(0.95),
      p99: at(0.99),
      max: finite[finite.length - 1],
      mean,
      budgetMs: frameBudgetMs,
      budgetMisses: misses,
      budgetMissPct: (misses / finite.length) * 100
    };
  }

  function setScenario(scenario) {
    hook.reset({ scenario, seed });
    if (scenario === 'ordinary') hook.stepFrame(options.ordinaryTicks);
  }

  function renderObserved() {
    const previousAutoReset = renderer.info.autoReset;
    renderer.info.autoReset = false;
    renderer.info.reset();
    observer?.beginFrame();
    hook.renderFrame();
    const observedTopology = observer?.endFrame() || null;
    const snapshot = hook.snapshot();
    renderer.info.autoReset = previousAutoReset;
    return { snapshot, observedTopology };
  }

  async function identity() {
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      visibilityState: document.visibilityState,
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      webgl: {
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        gpuTimerQuerySupported: Boolean(gl.getExtension('EXT_disjoint_timer_query_webgl2'))
      },
      observer: observer?.snapshot() || null
    };
  }

  async function scenarioSnapshot(scenario) {
    setScenario(scenario);
    const measured = renderObserved();
    gl.finish();
    return {
      scenario,
      ...measured,
      observer: observer?.snapshot() || null
    };
  }

  async function collectGpuSamples(count) {
    const extension = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (!extension) return { status: 'UNSUPPORTED', samplesMs: [], disjointSamples: 0, timedOutSamples: 0 };
    const samplesMs = [];
    let disjointSamples = 0;
    let timedOutSamples = 0;
    for (let index = 0; index < count; index++) {
      gl.finish();
      const query = gl.createQuery();
      gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
      hook.renderFrame();
      gl.endQuery(extension.TIME_ELAPSED_EXT);
      const started = performance.now();
      while (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE) && performance.now() - started < options.gpuTimeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
      const disjoint = gl.getParameter(extension.GPU_DISJOINT_EXT);
      if (!available) timedOutSamples += 1;
      else if (disjoint) disjointSamples += 1;
      else samplesMs.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(query);
    }
    const status = disjointSamples > 0
      ? 'DISJOINT'
      : timedOutSamples > 0
        ? 'PARTIAL_TIMEOUT'
        : samplesMs.length > 0 ? 'SUPPORTED' : 'NO_VALID_SAMPLES';
    return { status, samplesMs, disjointSamples, timedOutSamples };
  }

  async function collectRafSamples(count) {
    const intervalsMs = [];
    const workMs = [];
    let previousTimestamp = null;
    await new Promise((resolve, reject) => {
      const deadline = performance.now() + options.rafTimeoutMs;
      function frame(timestamp) {
        if (performance.now() > deadline) {
          reject(new Error('Live RAF sampling timed out.'));
          return;
        }
        if (previousTimestamp !== null) intervalsMs.push(timestamp - previousTimestamp);
        previousTimestamp = timestamp;
        const started = performance.now();
        hook.renderFrame();
        workMs.push(performance.now() - started);
        if (intervalsMs.length >= count) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    const intervalSummary = summarize(intervalsMs);
    return {
      intervalsMs,
      workMs,
      intervalSummary,
      workSummary: summarize(workMs),
      fpsFromIntervals: intervalSummary?.mean ? 1000 / intervalSummary.mean : null,
      capInterpretation: intervalSummary && intervalSummary.p50 >= 14 && intervalSummary.p50 <= 19
        ? 'VSYNC_CAPPED_OR_NEAR_60HZ'
        : 'NOT_OBVIOUSLY_60HZ_CAPPED'
    };
  }

  async function performanceRun() {
    setScenario('stress');
    for (let index = 0; index < options.warmupFrames; index++) hook.renderFrame();
    gl.finish();
    const observedFrame = renderObserved();
    gl.finish();

    const cpuSubmissionMs = [];
    for (let index = 0; index < options.cpuSamples; index++) {
      gl.finish();
      const started = performance.now();
      hook.renderFrame();
      cpuSubmissionMs.push(performance.now() - started);
      gl.finish();
    }

    const fullCompletionMs = [];
    for (let index = 0; index < options.completionSamples; index++) {
      gl.finish();
      const started = performance.now();
      hook.renderFrame();
      gl.finish();
      fullCompletionMs.push(performance.now() - started);
    }

    const gpu = await collectGpuSamples(options.gpuSamples);
    let raf = null;
    if (options.rafSamples > 0) {
      setScenario('stress');
      for (let index = 0; index < Math.min(30, options.warmupFrames); index++) hook.renderFrame();
      gl.finish();
      try {
        raf = { status: 'MEASURED', ...(await collectRafSamples(options.rafSamples)) };
      } catch (error) {
        raf = { status: 'UNAVAILABLE', reason: error.message, intervalsMs: [], workMs: [] };
      }
    }
    return {
      snapshot: observedFrame.snapshot,
      observedTopology: observedFrame.observedTopology,
      cpuSubmissionMs,
      fullCompletionMs,
      gpu,
      raf,
      summaries: {
        cpuSubmission: summarize(cpuSubmissionMs),
        fullCompletion: summarize(fullCompletionMs),
        gpu: summarize(gpu.samplesMs)
      }
    };
  }

  if (options.action === 'identity') return identity();
  if (options.action === 'ordinary' || options.action === 'stress') return scenarioSnapshot(options.action);
  if (options.action === 'performance') return performanceRun();
  throw new Error(`Unknown page probe action: ${options.action}`);
}

export function probeExpression(options) {
  return `(${pageProbe.toString()})(${JSON.stringify(options)})`;
}

export function expectedSnapshot(snapshot, scenario, protocol) {
  const errors = [];
  if (!snapshot || snapshot.apiVersion !== 1) errors.push('snapshot.apiVersion is not 1');
  if (snapshot?.benchmarkMode !== true) errors.push('benchmarkMode is not true');
  if (snapshot?.scenario !== scenario) errors.push(`scenario is ${snapshot?.scenario}, expected ${scenario}`);
  if (snapshot?.seed !== protocol.seed) errors.push(`seed is ${snapshot?.seed}, expected ${protocol.seed}`);
  if (snapshot?.externalTextures?.ready !== true) errors.push('external textures are not ready');
  const surface = snapshot?.renderSurface || {};
  const expectedSurface = protocol.viewport;
  if (surface.cssWidth !== expectedSurface.width || surface.cssHeight !== expectedSurface.height) {
    errors.push(`CSS surface is ${surface.cssWidth}x${surface.cssHeight}, expected ${expectedSurface.width}x${expectedSurface.height}`);
  }
  if (surface.drawingBufferWidth !== expectedSurface.width || surface.drawingBufferHeight !== expectedSurface.height) {
    errors.push(`drawing buffer is ${surface.drawingBufferWidth}x${surface.drawingBufferHeight}, expected ${expectedSurface.width}x${expectedSurface.height}`);
  }
  if (surface.pixelRatio !== expectedSurface.dpr) errors.push(`pixel ratio is ${surface.pixelRatio}, expected ${expectedSurface.dpr}`);
  if (scenario === 'ordinary') {
    if (snapshot.frame !== protocol.ordinaryTicks) errors.push(`ordinary frame is ${snapshot.frame}, expected ${protocol.ordinaryTicks}`);
  } else {
    const counts = snapshot.logicalCounts || {};
    if (counts.activeRipples !== 200) errors.push(`stress activeRipples is ${counts.activeRipples}, expected 200`);
    if (counts.visibleRippleMeshes !== 400) errors.push(`stress visibleRippleMeshes is ${counts.visibleRippleMeshes}, expected 400`);
    if (counts.activeDrops !== 50 || counts.visibleDrops !== 50) {
      errors.push(`stress drops are active=${counts.activeDrops} visible=${counts.visibleDrops}, expected 50/50`);
    }
  }
  return errors;
}

export function topologyErrors(snapshot, observed, baselineTopology = null) {
  const errors = [];
  const topology = snapshot?.topology || {};
  if (topology.frameOwners !== 1) errors.push(`frameOwners is ${topology.frameOwners}, expected 1`);
  const targetLimit = baselineTopology?.offscreenTargets ?? 1;
  const sceneSubmissionLimit = baselineTopology?.sceneSubmissions ?? 2;
  const offscreenWriteLimit = baselineTopology?.offscreenTargetWrites ?? 1;
  if (topology.offscreenTargets > targetLimit) errors.push(`offscreenTargets grew to ${topology.offscreenTargets}, baseline ${targetLimit}`);
  if (topology.sceneSubmissions < 1 || topology.sceneSubmissions > sceneSubmissionLimit) {
    errors.push(`stress sceneSubmissions is ${topology.sceneSubmissions}, expected 1 through ${sceneSubmissionLimit}`);
  }
  if (topology.offscreenTargetWrites > offscreenWriteLimit) {
    errors.push(`stress offscreenTargetWrites grew to ${topology.offscreenTargetWrites}, baseline ${offscreenWriteLimit}`);
  }
  if (topology.terminalTargetWrites !== 1) errors.push(`stress terminalTargetWrites is ${topology.terminalTargetWrites}, expected 1`);
  if (observed?.terminalDrawCalls <= 0) errors.push('observer saw no terminal framebuffer draws');
  if (topology.offscreenTargetWrites > 0 && observed?.offscreenDrawCalls <= 0) errors.push('observer saw no offscreen framebuffer draws');
  if (baselineTopology && topology.frameOwners > baselineTopology.frameOwners) errors.push('frame owner count exceeds baseline');
  return errors;
}
