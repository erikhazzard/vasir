#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import {
  baselineIdentity,
  discoverImplementationRows,
  improvementPct,
  invariant,
  percentile,
  relativeDeltaPct,
  summarize
} from './lib/contract.mjs';
import { launchChrome, navigateAndWait, startVariantServer } from './lib/browser.mjs';
import { expectedSnapshot, probeExpression, TOPOLOGY_OBSERVER_SOURCE } from './lib/page-probe.mjs';
import { writeJson } from './lib/io.mjs';
import { PROTOCOL } from './lib/protocol.mjs';

function usage() {
  return [
    'Usage:',
    '  node benchmarks/threejs-water-ripples-performance/run-performance.mjs --run-id <run-id>',
    '',
    'Measures only G3/G4-eligible implementation rows. Chrome/CDP work is always sequential.',
    'Writes performance/raw/<row-id>.json and performance/summary.json.'
  ].join('\n');
}

function parseArguments(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) return { help: true };
  if (args.length !== 2 || args[0] !== '--run-id') throw new Error(usage());
  return { help: false, runId: args[1] };
}

function absoluteSymmetricDeltaPct(left, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  const midpoint = (Math.abs(left) + Math.abs(right)) / 2;
  if (midpoint === 0) return 0;
  return (Math.abs(left - right) / midpoint) * 100;
}

function coefficientOfVariationPct(values) {
  const finite = values.filter(Number.isFinite);
  if (finite.length < 2) return 0;
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  if (mean === 0) return null;
  const variance = finite.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / finite.length;
  return (Math.sqrt(variance) / mean) * 100;
}

function aggregateVariant(rounds, variantId) {
  const runs = rounds.flatMap((round) => round.measurements.filter((entry) => entry.variantId === variantId));
  const cpuSubmissionMs = runs.flatMap((entry) => entry.result.cpuSubmissionMs || []);
  const fullCompletionMs = runs.flatMap((entry) => entry.result.fullCompletionMs || []);
  const gpuSamplesMs = runs.flatMap((entry) => entry.result.gpu?.samplesMs || []);
  const rafIntervalsMs = runs.flatMap((entry) => entry.result.raf?.intervalsMs || []);
  const rafWorkMs = runs.flatMap((entry) => entry.result.raf?.workMs || []);
  const drawCalls = runs.map((entry) => entry.result.snapshot?.topology?.drawCalls).filter(Number.isFinite);
  const triangles = runs.map((entry) => entry.result.snapshot?.topology?.triangles).filter(Number.isFinite);
  const gpuStatuses = runs.map((entry) => entry.result.gpu?.status).filter(Boolean);
  const rafStatuses = runs.map((entry) => entry.result.raf?.status).filter(Boolean);
  const roundMedians = {
    cpuSubmission: runs.map((entry) => percentile(entry.result.cpuSubmissionMs || [], 0.5)).filter(Number.isFinite),
    fullCompletion: runs.map((entry) => percentile(entry.result.fullCompletionMs || [], 0.5)).filter(Number.isFinite),
    gpu: runs.map((entry) => percentile(entry.result.gpu?.samplesMs || [], 0.5)).filter(Number.isFinite)
  };
  const rafSummary = summarize(rafIntervalsMs, PROTOCOL.frameBudgetMs);
  return {
    runCount: runs.length,
    cpuSubmission: summarize(cpuSubmissionMs, PROTOCOL.frameBudgetMs),
    fullCompletion: summarize(fullCompletionMs, PROTOCOL.frameBudgetMs),
    gpu: summarize(gpuSamplesMs, PROTOCOL.frameBudgetMs),
    liveRaf: {
      status: rafIntervalsMs.length ? 'MEASURED' : rafStatuses.includes('UNAVAILABLE') ? 'UNAVAILABLE' : 'NOT_REQUESTED',
      intervals: rafSummary,
      renderWork: summarize(rafWorkMs, PROTOCOL.frameBudgetMs),
      fps: rafSummary?.mean ? 1000 / rafSummary.mean : null,
      capInterpretation: rafSummary && rafSummary.p50 >= 14 && rafSummary.p50 <= 19
        ? 'VSYNC_CAPPED_OR_NEAR_60HZ'
        : rafSummary ? 'NOT_OBVIOUSLY_60HZ_CAPPED' : 'NO_SIGNAL'
    },
    renderer: {
      drawCalls: summarize(drawCalls),
      triangles: summarize(triangles)
    },
    support: {
      gpuStatuses: [...new Set(gpuStatuses)],
      rafStatuses: [...new Set(rafStatuses)]
    },
    roundMedianCvPct: {
      cpuSubmission: coefficientOfVariationPct(roundMedians.cpuSubmission),
      fullCompletion: coefficientOfVariationPct(roundMedians.fullCompletion),
      gpu: coefficientOfVariationPct(roundMedians.gpu)
    },
    raw: { cpuSubmissionMs, fullCompletionMs, gpuSamplesMs, rafIntervalsMs, rafWorkMs, drawCalls, triangles }
  };
}

function controlsNoise(controlA, controlB) {
  return {
    cpuSubmissionP50DriftPct: absoluteSymmetricDeltaPct(controlA.cpuSubmission?.p50, controlB.cpuSubmission?.p50),
    cpuSubmissionP95DriftPct: absoluteSymmetricDeltaPct(controlA.cpuSubmission?.p95, controlB.cpuSubmission?.p95),
    fullCompletionP50DriftPct: absoluteSymmetricDeltaPct(controlA.fullCompletion?.p50, controlB.fullCompletion?.p50),
    fullCompletionP95DriftPct: absoluteSymmetricDeltaPct(controlA.fullCompletion?.p95, controlB.fullCompletion?.p95),
    gpuP50DriftPct: absoluteSymmetricDeltaPct(controlA.gpu?.p50, controlB.gpu?.p50),
    rafIntervalP50DriftPct: absoluteSymmetricDeltaPct(controlA.liveRaf?.intervals?.p50, controlB.liveRaf?.intervals?.p50),
    drawCallDelta: Number.isFinite(controlA.renderer.drawCalls?.p50) && Number.isFinite(controlB.renderer.drawCalls?.p50)
      ? controlB.renderer.drawCalls.p50 - controlA.renderer.drawCalls.p50
      : null
  };
}

function withoutRaw(aggregate) {
  const { raw, ...summaryOnly } = aggregate;
  return summaryOnly;
}

function pooledBaseline(controlA, controlB) {
  const rafIntervals = summarize(
    [...controlA.raw.rafIntervalsMs, ...controlB.raw.rafIntervalsMs],
    PROTOCOL.frameBudgetMs
  );
  return {
    cpuSubmission: summarize([...controlA.raw.cpuSubmissionMs, ...controlB.raw.cpuSubmissionMs], PROTOCOL.frameBudgetMs),
    fullCompletion: summarize([...controlA.raw.fullCompletionMs, ...controlB.raw.fullCompletionMs], PROTOCOL.frameBudgetMs),
    gpu: summarize([...controlA.raw.gpuSamplesMs, ...controlB.raw.gpuSamplesMs], PROTOCOL.frameBudgetMs),
    liveRaf: {
      intervals: rafIntervals,
      fps: rafIntervals?.mean ? 1000 / rafIntervals.mean : null,
      capInterpretation: rafIntervals && rafIntervals.p50 >= 14 && rafIntervals.p50 <= 19
        ? 'VSYNC_CAPPED_OR_NEAR_60HZ'
        : rafIntervals ? 'NOT_OBVIOUSLY_60HZ_CAPPED' : 'NO_SIGNAL'
    },
    renderer: {
      drawCalls: summarize([...controlA.raw.drawCalls, ...controlB.raw.drawCalls]),
      triangles: summarize([...controlA.raw.triangles, ...controlB.raw.triangles])
    }
  };
}

function metricComparison(baseline, candidate, noisePct, higherIsBetter = false) {
  if (!baseline || !candidate || !Number.isFinite(baseline.p50) || !Number.isFinite(candidate.p50)) {
    return { status: 'NO_SIGNAL', reason: 'metric unavailable', p50DeltaPct: null, p95DeltaPct: null, thresholdPct: null };
  }
  const rawP50 = relativeDeltaPct(baseline.p50, candidate.p50);
  const rawP95 = relativeDeltaPct(baseline.p95, candidate.p95);
  const p50Improvement = higherIsBetter ? rawP50 : -rawP50;
  const p95Improvement = higherIsBetter ? rawP95 : -rawP95;
  const thresholdPct = Math.max(
    PROTOCOL.performance.minimumEffectPct,
    Number.isFinite(noisePct) ? noisePct * 1.5 : 0
  );
  let status = 'NO_SIGNAL';
  if (p50Improvement > thresholdPct && p95Improvement > 0) status = 'IMPROVED';
  else if (p50Improvement < -thresholdPct && p95Improvement < 0) status = 'REGRESSED';
  return {
    status,
    p50DeltaPct: rawP50,
    p95DeltaPct: rawP95,
    p99DeltaPct: relativeDeltaPct(baseline.p99, candidate.p99),
    p50ImprovementPct: p50Improvement,
    p95ImprovementPct: p95Improvement,
    thresholdPct
  };
}

function classifyRaf(baseline, candidate, noise) {
  if (!baseline?.intervals || !candidate?.intervals) {
    return { status: 'NO_SIGNAL', reason: 'live RAF samples unavailable' };
  }
  const baselineCapped = baseline.intervals.p50 >= 14 && baseline.intervals.p50 <= 19;
  const candidateCapped = candidate.intervals.p50 >= 14 && candidate.intervals.p50 <= 19;
  if (baselineCapped && candidateCapped) {
    return { status: 'NO_SIGNAL', reason: 'both variants are at or near the 60 Hz presentation cap' };
  }
  return metricComparison(baseline.intervals, candidate.intervals, noise, false);
}

function roundOrder(roundIndex) {
  const orders = [
    ['baseline-control-a', 'candidate', 'baseline-control-b'],
    ['baseline-control-b', 'candidate', 'baseline-control-a'],
    ['candidate', 'baseline-control-a', 'baseline-control-b'],
    ['baseline-control-a', 'baseline-control-b', 'candidate']
  ];
  return orders[roundIndex % orders.length];
}

async function measurePage(client, url, includeRaf) {
  const capture = await navigateAndWait(client, url, { timeoutMs: PROTOCOL.readyTimeoutMs });
  try {
    const result = await client.evaluate(probeExpression({
      action: 'performance',
      ...PROTOCOL,
      warmupFrames: PROTOCOL.performance.warmupFrames,
      cpuSamples: PROTOCOL.performance.cpuSamplesPerRound,
      completionSamples: PROTOCOL.performance.completionSamplesPerRound,
      gpuSamples: PROTOCOL.performance.gpuSamplesPerRound,
      rafSamples: includeRaf ? PROTOCOL.performance.rafSamplesOncePerVariant : 0,
      gpuTimeoutMs: PROTOCOL.performance.gpuTimeoutMs,
      rafTimeoutMs: PROTOCOL.performance.rafTimeoutMs
    }), { timeoutMs: 180_000 });
    await new Promise((resolveWait) => setTimeout(resolveWait, 10));
    return {
      result,
      runtimeErrors: [...capture.runtimeErrors],
      consoleErrors: capture.consoleErrors.filter((message) => !message.includes('favicon.ico'))
    };
  } finally {
    capture.stopCapture();
  }
}

function summarizeCandidate(row, rounds, rawPath) {
  const controlA = aggregateVariant(rounds, 'baseline-control-a');
  const controlB = aggregateVariant(rounds, 'baseline-control-b');
  const candidate = aggregateVariant(rounds, 'candidate');
  const baseline = pooledBaseline(controlA, controlB);
  const noise = controlsNoise(controlA, controlB);
  const p = PROTOCOL.performance;
  const runtimeErrors = rounds.flatMap((round) => round.measurements.flatMap((entry) => [
    ...entry.runtimeErrors.map((message) => `${entry.variantId}: ${message}`),
    ...entry.consoleErrors.map((message) => `${entry.variantId}: ${message}`),
    ...expectedSnapshot(entry.result.snapshot, 'stress', PROTOCOL).map((message) => `${entry.variantId}: ${message}`)
  ]));
  const stabilityReasons = [];
  if (noise.cpuSubmissionP50DriftPct > p.unchangedControlDriftLimitPct) {
    stabilityReasons.push(`unchanged CPU-submission controls drifted ${noise.cpuSubmissionP50DriftPct.toFixed(2)}%`);
  }
  if (noise.cpuSubmissionP95DriftPct > p.unchangedControlDriftLimitPct) {
    stabilityReasons.push(`unchanged CPU-submission p95 controls drifted ${noise.cpuSubmissionP95DriftPct.toFixed(2)}%`);
  }
  if (noise.fullCompletionP50DriftPct > p.unchangedControlDriftLimitPct) {
    stabilityReasons.push(`unchanged full-completion controls drifted ${noise.fullCompletionP50DriftPct.toFixed(2)}%`);
  }
  if (noise.fullCompletionP95DriftPct > p.unchangedControlDriftLimitPct) {
    stabilityReasons.push(`unchanged full-completion p95 controls drifted ${noise.fullCompletionP95DriftPct.toFixed(2)}%`);
  }
  if (noise.drawCallDelta !== 0) stabilityReasons.push(`unchanged controls differ by ${noise.drawCallDelta} draw calls`);
  for (const [label, aggregate] of [['baseline A', controlA], ['baseline B', controlB], ['candidate', candidate]]) {
    if (aggregate.roundMedianCvPct.fullCompletion > p.roundMedianCvLimitPct) {
      stabilityReasons.push(`${label} full-completion round median CV is ${aggregate.roundMedianCvPct.fullCompletion.toFixed(2)}%`);
    }
  }
  stabilityReasons.push(...runtimeErrors);
  const cpu = metricComparison(baseline.cpuSubmission, candidate.cpuSubmission, noise.cpuSubmissionP50DriftPct);
  const completion = metricComparison(baseline.fullCompletion, candidate.fullCompletion, noise.fullCompletionP50DriftPct);
  const allGpuStatuses = [...candidate.support.gpuStatuses, ...controlA.support.gpuStatuses, ...controlB.support.gpuStatuses];
  const gpuSupported = allGpuStatuses.length > 0 && allGpuStatuses.every((status) => status === 'SUPPORTED');
  if (gpuSupported && noise.gpuP50DriftPct > p.unchangedControlDriftLimitPct) {
    stabilityReasons.push(`unchanged GPU p50 controls drifted ${noise.gpuP50DriftPct.toFixed(2)}%`);
  }
  const stable = stabilityReasons.length === 0;
  const gpu = gpuSupported
    ? metricComparison(baseline.gpu, candidate.gpu, noise.gpuP50DriftPct)
    : { status: 'NO_SIGNAL', reason: 'GPU timer query unsupported, incomplete, or disjoint' };
  const raf = classifyRaf(baseline.liveRaf, candidate.liveRaf, noise.rafIntervalP50DriftPct);
  const baselineCalls = baseline.renderer.drawCalls?.p50;
  const candidateCalls = candidate.renderer.drawCalls?.p50;
  const drawCalls = {
    baseline: baselineCalls,
    candidate: candidateCalls,
    delta: Number.isFinite(baselineCalls) && Number.isFinite(candidateCalls) ? candidateCalls - baselineCalls : null,
    reductionPct: improvementPct(baselineCalls, candidateCalls),
    direction: !Number.isFinite(baselineCalls) || !Number.isFinite(candidateCalls)
      ? 'NO_SIGNAL'
      : candidateCalls < baselineCalls ? 'LOWER' : candidateCalls > baselineCalls ? 'HIGHER' : 'UNCHANGED',
    interpretation: 'Structural work count only; not a timing or FPS result.'
  };
  let runtimeStatus = 'NO_SIGNAL';
  let runtimeReason = stable ? 'Full-completion movement did not exceed unchanged-control noise.' : stabilityReasons.join('; ');
  if (stable && completion.status === 'IMPROVED' && cpu.status !== 'REGRESSED' && gpu.status !== 'REGRESSED') {
    runtimeStatus = 'IMPROVED';
    runtimeReason = 'Full-completion p50 and p95 improved beyond the duplicate-control noise threshold without a CPU or measured-GPU regression.';
  } else if (stable && (completion.status === 'REGRESSED' || cpu.status === 'REGRESSED' || gpu.status === 'REGRESSED')) {
    runtimeStatus = 'REGRESSED';
    runtimeReason = 'At least one directly measured stage regressed beyond the duplicate-control noise threshold.';
  }
  return {
    row: {
      rowId: row.rowId,
      pairId: row.pairId,
      condition: row.condition,
      configuration: row.configuration,
      sourceSha256: row.sourceSha256
    },
    eligible: true,
    rawPath,
    baseline,
    candidate: withoutRaw(candidate),
    controls: {
      controlA: withoutRaw(controlA),
      controlB: withoutRaw(controlB),
      noise,
      stable,
      stabilityReasons
    },
    comparisons: { cpuSubmission: cpu, fullCompletion: completion, gpu, liveRaf: raf, drawCalls },
    runtimeStatus,
    runtimeReason,
    claimBoundary: 'Synthetic 200-ripple/50-drop fixed state at 1600x900 DPR 1 in local desktop Chrome.'
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const discovered = await discoverImplementationRows(options.runId);
  const baseline = await baselineIdentity();
  const verificationPath = join(discovered.directory, 'verification', 'receipt.json');
  const verification = JSON.parse(await readFile(verificationPath, 'utf8'));
  invariant(verification.runId === options.runId, 'Verification receipt belongs to a different run.');
  const eligibility = new Map(verification.rows.map((row) => [row.rowId, row.performanceEligible === true]));
  const eligibleRows = discovered.rows.filter((row) => row.discoveryStatus === 'VALID' && eligibility.get(row.rowId));
  const ineligibleRows = discovered.rows.filter((row) => !eligibleRows.includes(row));

  const variants = new Map([
    ['baseline-control-a', baseline.directory],
    ['baseline-control-b', baseline.directory]
  ]);
  for (const row of eligibleRows) variants.set(row.rowId, dirname(row.indexPath));
  const summaries = [];
  let runtimeIdentity = null;
  if (eligibleRows.length > 0) {
    const server = await startVariantServer(variants);
    const chrome = await launchChrome({ viewport: PROTOCOL.viewport });
    try {
      await chrome.client.send('Page.addScriptToEvaluateOnNewDocument', { source: TOPOLOGY_OBSERVER_SOURCE });
      for (const row of eligibleRows) {
        console.log(`Measuring ${row.rowId} (${row.condition}, ${row.configuration?.id || 'unknown model'})...`);
        const rounds = [];
        const rafCollected = new Set();
        let measurementError = null;
        try {
          for (let roundIndex = 0; roundIndex < PROTOCOL.performance.rounds; roundIndex++) {
            const measurements = [];
            for (const variantId of roundOrder(roundIndex)) {
              const serverVariantId = variantId === 'candidate' ? row.rowId : variantId;
              const includeRaf = !rafCollected.has(variantId);
              const measured = await measurePage(
                chrome.client,
                server.urlFor(serverVariantId, `?benchmark=1&vasirSeed=${PROTOCOL.seed}&round=${roundIndex}`),
                includeRaf
              );
              rafCollected.add(variantId);
              if (!runtimeIdentity) {
                runtimeIdentity = await chrome.client.evaluate(probeExpression({
                  action: 'identity',
                  ...PROTOCOL,
                  gpuTimeoutMs: PROTOCOL.performance.gpuTimeoutMs,
                  rafTimeoutMs: PROTOCOL.performance.rafTimeoutMs
                }));
              }
              measurements.push({ variantId, serverVariantId, order: measurements.length, ...measured });
              console.log(`  round ${roundIndex + 1}/${PROTOCOL.performance.rounds}: ${variantId}`);
            }
            rounds.push({ roundIndex, order: roundOrder(roundIndex), measurements });
          }
        } catch (error) {
          measurementError = error.stack || error.message;
        }
        const rawPath = join(discovered.directory, 'performance', 'raw', `${row.rowId}.json`);
        const rawReceipt = {
          schemaVersion: 1,
          kind: 'threejs-water-ripples-performance-raw',
          runId: options.runId,
          rowId: row.rowId,
          protocol: PROTOCOL,
          measurementError,
          rounds
        };
        await writeJson(rawPath, rawReceipt);
        const summary = measurementError
          ? {
              row: {
                rowId: row.rowId,
                pairId: row.pairId,
                condition: row.condition,
                configuration: row.configuration,
                sourceSha256: row.sourceSha256
              },
              eligible: true,
              rawPath: relative(discovered.directory, rawPath),
              runtimeStatus: 'NO_SIGNAL',
              runtimeReason: `Sequential browser measurement failed: ${measurementError}`
            }
          : summarizeCandidate(row, rounds, relative(discovered.directory, rawPath));
        summaries.push(summary);
        console.log(`  ${summary.runtimeStatus}: ${summary.runtimeReason}`);
      }
    } finally {
      await chrome.close();
      await server.close();
    }
  }

  const output = {
    schemaVersion: 1,
    kind: 'threejs-water-ripples-performance-summary',
    gateId: 'WATER-RIPPLES__G5',
    runId: options.runId,
    createdAt: new Date().toISOString(),
    protocol: PROTOCOL,
    runtimeIdentity,
    baseline: { indexPath: relative(discovered.directory, baseline.indexPath), sha256: baseline.sha256 },
    rows: [
      ...summaries,
      ...ineligibleRows.map((row) => ({
        row: {
          rowId: row.rowId,
          pairId: row.pairId,
          condition: row.condition,
          configuration: row.configuration,
          sourceSha256: row.sourceSha256
        },
        eligible: false,
        runtimeStatus: 'NOT_MEASURED',
        runtimeReason: 'Candidate did not pass both G3 and G4.'
      }))
    ],
    summary: {
      eligibleRows: summaries.length,
      improved: summaries.filter((row) => row.runtimeStatus === 'IMPROVED').length,
      regressed: summaries.filter((row) => row.runtimeStatus === 'REGRESSED').length,
      noSignal: summaries.filter((row) => row.runtimeStatus === 'NO_SIGNAL').length,
      notMeasured: ineligibleRows.length
    },
    interpretation: {
      liveRaf: 'Only live requestAnimationFrame samples produce displayed-FPS evidence; capped runs remain NO_SIGNAL.',
      cpuSubmission: 'performance.now around renderFrame after a gl.finish queue drain; ending gl.finish is outside the sample.',
      fullCompletion: 'performance.now around renderFrame plus ending gl.finish; this forces completion and changes normal pipeline overlap.',
      gpu: 'EXT_disjoint_timer_query_webgl2 TIME_ELAPSED_EXT when supported; unsupported/disjoint samples are not inferred.',
      drawCalls: 'renderer.info accumulated across the ripple-target and main scene submissions for one fixed stress frame.',
      scenario: 'Stress is a synthetic pool-capacity worst case, not ordinary gameplay.'
    },
    limits: [
      'Local desktop Chrome on one host does not establish mobile, cross-browser, thermal, battery, memory, or field performance.',
      'One generated candidate per model/condition does not estimate model sampling variance.',
      'External CDN assets remain network and cache dependent during page startup.',
      'A composite agent patch can improve performance, but this run does not isolate which subchange caused the movement.'
    ]
  };
  const summaryPath = join(discovered.directory, 'performance', 'summary.json');
  await writeJson(summaryPath, output);
  console.log(`Wrote ${summaryPath}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
