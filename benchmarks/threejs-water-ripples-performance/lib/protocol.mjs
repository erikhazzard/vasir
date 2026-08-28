export const PROTOCOL = Object.freeze({
  version: 1,
  viewport: Object.freeze({ width: 1600, height: 900, dpr: 1 }),
  seed: 0x5eed1234,
  ordinaryTicks: 240,
  frameBudgetMs: 1000 / 60,
  readyTimeoutMs: 60_000,
  visualThresholds: Object.freeze({ passRmse: 0.015, reviewRmse: 0.04 }),
  performance: Object.freeze({
    rounds: 4,
    warmupFrames: 30,
    cpuSamplesPerRound: 16,
    completionSamplesPerRound: 16,
    gpuSamplesPerRound: 4,
    rafSamplesOncePerVariant: 120,
    gpuTimeoutMs: 10_000,
    rafTimeoutMs: 45_000,
    unchangedControlDriftLimitPct: 10,
    roundMedianCvLimitPct: 15,
    minimumEffectPct: 5
  })
});
