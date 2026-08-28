#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import { baselineIdentity, discoverImplementationRows, invariant, sha256 } from './lib/contract.mjs';
import {
  capturePng,
  launchChrome,
  navigateAndWait,
  startVariantServer
} from './lib/browser.mjs';
import {
  expectedSnapshot,
  probeExpression,
  TOPOLOGY_OBSERVER_SOURCE,
  topologyErrors
} from './lib/page-probe.mjs';
import { writeBase64, writeJson } from './lib/io.mjs';
import { PROTOCOL } from './lib/protocol.mjs';
import { comparePng } from './lib/visual.mjs';

function usage() {
  return [
    'Usage:',
    '  node benchmarks/threejs-water-ripples-performance/verify-candidates.mjs --run-id <run-id>',
    '',
    'Runs G3 browser/behavior/visual checks and G4 render-topology checks sequentially',
    'against retained implementation workspaces. Writes verification/receipt.json and PNGs.'
  ].join('\n');
}

function parseArguments(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) return { help: true };
  if (args.length !== 2 || args[0] !== '--run-id') throw new Error(usage());
  return { help: false, runId: args[1] };
}

function countMatches(source, expression) {
  return [...source.matchAll(expression)].length;
}

function scanSource(source) {
  return {
    webglRendererConstructors: countMatches(source, /new\s+(?:THREE\.)?WebGLRenderer\s*\(/g),
    webgpuRendererConstructors: countMatches(source, /new\s+(?:THREE\.)?WebGPURenderer\s*\(/g),
    renderTargetConstructors: countMatches(source, /new\s+(?:THREE\.)?WebGL(?:Cube)?RenderTarget\s*\(/g),
    requestAnimationFrameCallsites: countMatches(source, /\brequestAnimationFrame\s*\(/g),
    rendererRenderCallsites: countMatches(source, /\b[a-zA-Z_$][\w$]*\.render\s*\(/g),
    canvasElementsInMarkup: countMatches(source, /<canvas\b/gi),
    suspiciousTopologyTokens: [
      /new\s+[\w$.]*GBuffer\s*\(/i,
      /WebGLMultipleRenderTargets/,
      /new\s+(?:THREE\.)?EffectComposer\s*\(/,
      /new\s+[\w$.]*RenderPipeline\s*\(/
    ].filter((expression) => expression.test(source)).map(String),
    benchmarkHookPresent: source.includes('__waterRipplesBenchmark')
  };
}

function stateContract(snapshot) {
  return {
    apiVersion: snapshot?.apiVersion,
    benchmarkMode: snapshot?.benchmarkMode,
    scenario: snapshot?.scenario,
    seed: snapshot?.seed,
    randomState: snapshot?.randomState,
    fixedDeltaSeconds: snapshot?.fixedDeltaSeconds,
    frame: snapshot?.frame,
    timeSeconds: snapshot?.timeSeconds,
    externalTextures: {
      ready: snapshot?.externalTextures?.ready,
      status: snapshot?.externalTextures?.status
    },
    logicalCounts: snapshot?.logicalCounts,
    state: snapshot?.state,
    renderSurface: snapshot?.renderSurface
  };
}

function stateComparison(reference, candidate) {
  const referenceContract = stateContract(reference);
  const candidateContract = stateContract(candidate);
  const referenceJson = JSON.stringify(referenceContract);
  const candidateJson = JSON.stringify(candidateContract);
  return {
    status: referenceJson === candidateJson ? 'PASS' : 'VETO',
    referenceSha256: sha256(referenceJson),
    candidateSha256: sha256(candidateJson),
    reference: referenceContract,
    candidate: candidateContract
  };
}

function sourceTopologyErrors(baseline, candidate) {
  const errors = [];
  if (!candidate.benchmarkHookPresent) errors.push('benchmark API marker is absent');
  if (candidate.webglRendererConstructors + candidate.webgpuRendererConstructors
    > baseline.webglRendererConstructors + baseline.webgpuRendererConstructors) {
    errors.push('renderer constructor count exceeds baseline');
  }
  if (candidate.renderTargetConstructors > baseline.renderTargetConstructors) {
    errors.push('render-target constructor count exceeds baseline');
  }
  if (candidate.suspiciousTopologyTokens.length > 0) {
    errors.push(`source contains suspicious topology constructors: ${candidate.suspiciousTopologyTokens.join(', ')}`);
  }
  return errors;
}

function runtimeTopologyErrors(baseline, candidate) {
  const errors = topologyErrors(candidate.snapshot, candidate.observedTopology, baseline.snapshot.topology);
  const baselineObserver = baseline.observer || {};
  const observer = candidate.observer || {};
  if (observer.canvasElementsConnected > baselineObserver.canvasElementsConnected) {
    errors.push(`connected canvases grew from ${baselineObserver.canvasElementsConnected} to ${observer.canvasElementsConnected}`);
  }
  if (observer.contextCreations > baselineObserver.contextCreations) {
    errors.push(`WebGL contexts grew from ${baselineObserver.contextCreations} to ${observer.contextCreations}`);
  }
  if (observer.rafRequests > baselineObserver.rafRequests) {
    errors.push(`benchmark-mode RAF requests grew from ${baselineObserver.rafRequests} to ${observer.rafRequests}`);
  }
  return errors;
}

async function inspectVariant(client, server, variantId, artifactDirectory) {
  const capture = await navigateAndWait(
    client,
    server.urlFor(variantId, `?benchmark=1&vasirSeed=${PROTOCOL.seed}`),
    { timeoutMs: PROTOCOL.readyTimeoutMs }
  );
  try {
    const identity = await client.evaluate(probeExpression({
      action: 'identity',
      ...PROTOCOL,
      gpuTimeoutMs: 10_000,
      rafTimeoutMs: 10_000
    }));
    const ordinary = await client.evaluate(probeExpression({
      action: 'ordinary',
      ...PROTOCOL,
      gpuTimeoutMs: 10_000,
      rafTimeoutMs: 10_000
    }));
    const ordinaryScreenshotPath = join(artifactDirectory, 'ordinary.png');
    await writeBase64(ordinaryScreenshotPath, await capturePng(client));
    const stress = await client.evaluate(probeExpression({
      action: 'stress',
      ...PROTOCOL,
      gpuTimeoutMs: 10_000,
      rafTimeoutMs: 10_000
    }));
    const stressScreenshotPath = join(artifactDirectory, 'stress.png');
    await writeBase64(stressScreenshotPath, await capturePng(client));
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
    const runtimeErrors = [...capture.runtimeErrors];
    const consoleErrors = capture.consoleErrors.filter((message) => !message.includes('favicon.ico'));
    return {
      identity,
      ordinary,
      stress,
      ordinaryScreenshotPath,
      stressScreenshotPath,
      runtimeErrors,
      consoleErrors
    };
  } finally {
    capture.stopCapture();
  }
}

function baseProbeErrors(probe) {
  return [
    ...expectedSnapshot(probe.ordinary.snapshot, 'ordinary', PROTOCOL),
    ...expectedSnapshot(probe.stress.snapshot, 'stress', PROTOCOL),
    ...probe.runtimeErrors.map((message) => `runtime exception: ${message}`),
    ...probe.consoleErrors.map((message) => `console error: ${message}`)
  ];
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const discovered = await discoverImplementationRows(options.runId);
  const baseline = await baselineIdentity();
  const verificationDirectory = join(discovered.directory, 'verification');
  const source = await readFile(baseline.indexPath, 'utf8');
  const baselineSourceTopology = scanSource(source);
  const variants = new Map([
    ['baseline-control-a', baseline.directory],
    ['baseline-control-b', baseline.directory]
  ]);
  for (const row of discovered.rows.filter((entry) => entry.discoveryStatus === 'VALID')) {
    variants.set(row.rowId, dirname(row.indexPath));
  }

  const server = await startVariantServer(variants);
  const chrome = await launchChrome({ viewport: PROTOCOL.viewport });
  let receipt;
  try {
    await chrome.client.send('Page.addScriptToEvaluateOnNewDocument', { source: TOPOLOGY_OBSERVER_SOURCE });
    const baselineA = await inspectVariant(
      chrome.client,
      server,
      'baseline-control-a',
      join(verificationDirectory, 'baseline-control-a')
    );
    const baselineB = await inspectVariant(
      chrome.client,
      server,
      'baseline-control-b',
      join(verificationDirectory, 'baseline-control-b')
    );
    const baselineState = {
      ordinary: stateComparison(baselineA.ordinary.snapshot, baselineB.ordinary.snapshot),
      stress: stateComparison(baselineA.stress.snapshot, baselineB.stress.snapshot)
    };
    const baselineVisual = {
      ordinary: await comparePng(
        baselineA.ordinaryScreenshotPath,
        baselineB.ordinaryScreenshotPath,
        join(verificationDirectory, 'baseline-controls-ordinary-diff.png'),
        PROTOCOL.visualThresholds
      ),
      stress: await comparePng(
        baselineA.stressScreenshotPath,
        baselineB.stressScreenshotPath,
        join(verificationDirectory, 'baseline-controls-stress-diff.png'),
        PROTOCOL.visualThresholds
      )
    };
    const baselineErrors = [
      ...baseProbeErrors(baselineA),
      ...baseProbeErrors(baselineB),
      ...topologyErrors(baselineA.stress.snapshot, baselineA.stress.observedTopology),
      ...topologyErrors(baselineB.stress.snapshot, baselineB.stress.observedTopology)
    ];
    if (baselineState.ordinary.status !== 'PASS') baselineErrors.push('duplicate ordinary baseline state is not deterministic');
    if (baselineState.stress.status !== 'PASS') baselineErrors.push('duplicate stress baseline state is not deterministic');
    if (baselineVisual.ordinary.status !== 'PASS') {
      baselineErrors.push(`duplicate ordinary baseline image is ${baselineVisual.ordinary.status}`);
    }
    if (baselineVisual.stress.status !== 'PASS') {
      baselineErrors.push(`duplicate stress baseline image is ${baselineVisual.stress.status}`);
    }

    const rows = [];
    for (const discoveredRow of discovered.rows) {
      const record = {
        ...discoveredRow,
        sourceTopology: null,
        browser: null,
        state: null,
        visual: null,
        topology: null,
        g3: { status: 'VETO', reasons: [...discoveredRow.discoveryErrors] },
        g4: { status: 'VETO', reasons: [...discoveredRow.discoveryErrors] },
        performanceEligible: false
      };
      if (discoveredRow.discoveryStatus === 'VALID') {
        const candidateSource = await readFile(discoveredRow.indexPath, 'utf8');
        const candidateSourceTopology = scanSource(candidateSource);
        record.sourceTopology = candidateSourceTopology;
        let candidate;
        try {
          candidate = await inspectVariant(
            chrome.client,
            server,
            discoveredRow.rowId,
            join(verificationDirectory, 'rows', discoveredRow.rowId)
          );
        } catch (error) {
          record.g3.reasons.push(`browser validation failed: ${error.message}`);
          record.g4.reasons.push(
            ...sourceTopologyErrors(baselineSourceTopology, candidateSourceTopology),
            `runtime topology unavailable: ${error.message}`
          );
          rows.push(record);
          console.log(`${record.rowId}: G3 ${record.g3.status}; G4 ${record.g4.status}; timing ineligible`);
          continue;
        }
        const ordinaryState = stateComparison(baselineA.ordinary.snapshot, candidate.ordinary.snapshot);
        const stressState = stateComparison(baselineA.stress.snapshot, candidate.stress.snapshot);
        const visual = {
          ordinary: await comparePng(
            baselineA.ordinaryScreenshotPath,
            candidate.ordinaryScreenshotPath,
            join(verificationDirectory, 'rows', discoveredRow.rowId, 'ordinary-diff.png'),
            PROTOCOL.visualThresholds
          ),
          stress: await comparePng(
            baselineA.stressScreenshotPath,
            candidate.stressScreenshotPath,
            join(verificationDirectory, 'rows', discoveredRow.rowId, 'stress-diff.png'),
            PROTOCOL.visualThresholds
          )
        };
        const g3Reasons = [
          ...baselineErrors.map((message) => `baseline invalid: ${message}`),
          ...baseProbeErrors(candidate)
        ];
        if (ordinaryState.status !== 'PASS') g3Reasons.push('ordinary deterministic state differs from baseline');
        if (stressState.status !== 'PASS') g3Reasons.push('stress deterministic state differs from baseline');
        if (visual.ordinary.status !== 'PASS') {
          g3Reasons.push(`ordinary screenshot is ${visual.ordinary.status} at normalized RMSE ${visual.ordinary.normalizedRmse}`);
        }
        if (visual.stress.status !== 'PASS') {
          g3Reasons.push(`stress screenshot is ${visual.stress.status} at normalized RMSE ${visual.stress.normalizedRmse}`);
        }

        const g4Reasons = [
          ...sourceTopologyErrors(baselineSourceTopology, candidateSourceTopology),
          ...runtimeTopologyErrors(baselineA.stress, candidate.stress)
        ];
        record.browser = {
          identity: candidate.identity,
          runtimeErrors: candidate.runtimeErrors,
          consoleErrors: candidate.consoleErrors,
          ordinaryScreenshotPath: relative(discovered.directory, candidate.ordinaryScreenshotPath),
          stressScreenshotPath: relative(discovered.directory, candidate.stressScreenshotPath)
        };
        record.state = { ordinary: ordinaryState, stress: stressState };
        record.visual = {
          ordinary: {
            ...visual.ordinary,
            diffPath: visual.ordinary.diffPath ? relative(discovered.directory, visual.ordinary.diffPath) : null
          },
          stress: {
            ...visual.stress,
            diffPath: visual.stress.diffPath ? relative(discovered.directory, visual.stress.diffPath) : null
          }
        };
        record.topology = {
          ordinary: candidate.ordinary.snapshot.topology,
          stress: candidate.stress.snapshot.topology,
          observedOrdinary: candidate.ordinary.observedTopology,
          observedStress: candidate.stress.observedTopology,
          observer: candidate.stress.observer
        };
        record.g3 = { status: g3Reasons.length === 0 ? 'PASS' : 'VETO', reasons: g3Reasons };
        record.g4 = { status: g4Reasons.length === 0 ? 'PASS' : 'VETO', reasons: g4Reasons };
        record.performanceEligible = record.g3.status === 'PASS' && record.g4.status === 'PASS';
      }
      rows.push(record);
      console.log(`${record.rowId}: G3 ${record.g3.status}; G4 ${record.g4.status}; timing ${record.performanceEligible ? 'eligible' : 'ineligible'}`);
    }

    receipt = {
      schemaVersion: 1,
      kind: 'threejs-water-ripples-candidate-verification',
      gateIds: ['WATER-RIPPLES__G3', 'WATER-RIPPLES__G4'],
      runId: options.runId,
      createdAt: new Date().toISOString(),
      protocol: PROTOCOL,
      baseline: {
        source: {
          indexPath: relative(discovered.directory, baseline.indexPath),
          sha256: baseline.sha256,
          topology: baselineSourceTopology
        },
        identity: baselineA.identity,
        errors: baselineErrors,
        state: baselineState,
        visual: {
          ordinary: {
            ...baselineVisual.ordinary,
            diffPath: baselineVisual.ordinary.diffPath
              ? relative(discovered.directory, baselineVisual.ordinary.diffPath)
              : null
          },
          stress: {
            ...baselineVisual.stress,
            diffPath: baselineVisual.stress.diffPath
              ? relative(discovered.directory, baselineVisual.stress.diffPath)
              : null
          }
        },
        topology: {
          ordinary: baselineA.ordinary.snapshot.topology,
          stress: baselineA.stress.snapshot.topology,
          observedOrdinary: baselineA.ordinary.observedTopology,
          observedStress: baselineA.stress.observedTopology,
          observer: baselineA.stress.observer
        },
        screenshots: {
          ordinary: {
            controlA: relative(discovered.directory, baselineA.ordinaryScreenshotPath),
            controlB: relative(discovered.directory, baselineB.ordinaryScreenshotPath)
          },
          stress: {
            controlA: relative(discovered.directory, baselineA.stressScreenshotPath),
            controlB: relative(discovered.directory, baselineB.stressScreenshotPath)
          }
        }
      },
      rows,
      summary: {
        implementationRows: rows.length,
        g3Pass: rows.filter((row) => row.g3.status === 'PASS').length,
        g4Pass: rows.filter((row) => row.g4.status === 'PASS').length,
        performanceEligible: rows.filter((row) => row.performanceEligible).length
      },
      limits: [
        'Automated pixels do not decide taste; the retained screenshots remain subject to a human visual veto.',
        'Topology observation covers declared fixture topology, connected canvases/contexts, framebuffer draw categories, and source constructors; opaque backend-internal passes remain unobserved.',
        'This receipt proves only the frozen ordinary and synthetic max-pool scenarios in local desktop Chrome.'
      ]
    };
  } finally {
    await chrome.close();
    await server.close();
  }

  invariant(receipt, 'Verification did not produce a receipt.');
  const receiptPath = join(discovered.directory, 'verification', 'receipt.json');
  await writeJson(receiptPath, receipt);
  console.log(`Wrote ${receiptPath}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
