(function () {
  'use strict';

  const CONDITIONS = [
    { id: 'baseline', short: 'Minimal', label: 'Minimal baseline', color: '#ff6d5e', shape: 'circle' },
    { id: 'skill', short: 'Skill', label: 'Isolated skill(s)', color: '#9480ff', shape: 'diamond' },
    { id: 'full', short: 'Full', label: 'Full Vasir', color: '#dfff65', shape: 'square' }
  ];

  const CATEGORIES = [
    { id: 'engineering', name: 'Engineering', short: 'ENG', weight: 0.24, color: '#008094' },
    { id: 'games', name: 'Games', short: 'GAME', weight: 0.20, color: '#00873a' },
    { id: 'product', name: 'Product Design', short: 'DES', weight: 0.20, color: '#ac6400' },
    { id: 'writing', name: 'Writing', short: 'WRITE', weight: 0.16, color: '#d63a30' },
    { id: 'workflows', name: 'AI Workflows', short: 'FLOW', weight: 0.20, color: '#844cff' }
  ];

  const BENCHMARKS = [
    {
      id: 'hyper-scale-chat', category: 'engineering', suite: 'Backend Architecture',
      name: 'Hyper-scale chat architecture', variance: 1.2, evidenceKind: 'development',
      description: 'Tests whether a model can find a complete, lasting, low-rent topology for mobile chat at extreme concurrency.',
      prompt: 'Architect a chat app infrastructure that supports 10 million concurrent users.',
      sourceHref: '../hyper-scale-chat/2026-08-27T02-56-43Z__rejudge__a53c9da44229/report.html#overview',
      measured: { baseline: 47.5, treatment: 73.2, delta: 25.7, wins: 24, ties: 1, losses: 2, complete: 54, total: 54, treatmentLabel: 'Architecture skill', calibration: 'Calibration pending' }
    },
    {
      id: 'personalized-home-feed', category: 'engineering', suite: 'Backend Architecture',
      name: 'Personalized home feed architecture', variance: -1.3, evidenceKind: 'development',
      description: 'Tests lasting feed ownership, hot-creator fanout, pagination, mutable visibility, deletion, and privacy safety.',
      prompt: 'Design the backend for a personalized home feed with followed and recommended content at large scale.',
      sourceHref: '../personalized-home-feed/2026-08-27T06-19-29Z__rejudge__dfe5ad38d285/report.html#overview',
      measured: { baseline: 68.2, treatment: 74.1, delta: 5.9, wins: 17, ties: 5, losses: 5, complete: 54, total: 54, treatmentLabel: 'Architecture skill', calibration: 'Calibration pending' }
    },
    {
      id: 'device-telemetry', category: 'engineering', suite: 'Backend Architecture',
      name: 'High-volume device telemetry architecture', variance: 0.6, evidenceKind: 'development',
      description: 'Tests durable retry semantics, idempotent acceptance, monotonic latest state, and expiring device history.',
      prompt: 'Architect a telemetry backend that can grow from launch to 10 million simultaneously active devices.',
      sourceHref: '../device-telemetry/2026-08-27T00-39-11Z__1f48cd046cb7/report.html#overview',
      measured: { baseline: 67.0, treatment: 85.0, delta: 17.9, wins: 23, ties: 1, losses: 3, complete: 54, total: 54, treatmentLabel: 'Architecture skill', calibration: 'Calibration pending' }
    },
    { id: 'api-contract-migration', category: 'engineering', suite: 'Reliability & Change', name: 'Live API contract migration', variance: -2.1, evidenceKind: 'illustrative', description: 'Tests whether a model can evolve a live contract without breaking old clients, state, or rollback safety.', prompt: 'Plan and implement a zero-downtime API contract migration across mixed-version clients.' },
    { id: 'incident-root-cause', category: 'engineering', suite: 'Reliability & Change', name: 'Distributed incident diagnosis', variance: 1.6, evidenceKind: 'illustrative', description: 'Tests evidence-led diagnosis across noisy traces, partial failures, misleading signals, and recovery pressure.', prompt: 'Diagnose a production incident from incomplete service, queue, and database evidence.' },
    { id: 'combat-feel-tuning', category: 'games', suite: 'Game Feel & Onboarding', name: 'Combat feel tuning', variance: 1.8, evidenceKind: 'illustrative', description: 'Tests whether changes improve responsiveness, impact, readability, and control without hiding design problems.', prompt: 'Diagnose and improve the feel of a working but flat melee combat prototype.' },
    { id: 'mobile-first-minute', category: 'games', suite: 'Game Feel & Onboarding', name: 'Mobile first minute', variance: 0.9, evidenceKind: 'illustrative', description: 'Tests whether the opening minute teaches play through situations and feels native on a phone.', prompt: 'Redesign the first minute of a portrait mobile game without tutorial popups.' },
    { id: 'deterministic-dungeon', category: 'games', suite: 'Systems & Integrity', name: 'Deterministic dungeon system', variance: -1.7, evidenceKind: 'illustrative', description: 'Tests deterministic generation, meaningful variation, solvability, and inspectable seed behavior.', prompt: 'Design a seed-deterministic dungeon generator with coherent pacing and guaranteed completion.' },
    { id: 'economy-coherence', category: 'games', suite: 'Systems & Integrity', name: 'Economy coherence', variance: -0.5, evidenceKind: 'illustrative', description: 'Tests progression pressure, currency sinks, reward cadence, and exploit-resistant tuning.', prompt: 'Repair a game economy whose upgrade curve collapses after the first hour.' },
    { id: 'replay-integrity', category: 'games', suite: 'Systems & Integrity', name: 'Replay integrity', variance: -0.5, evidenceKind: 'illustrative', description: 'Tests whether replay and ghost systems preserve deterministic ownership and presentation boundaries.', prompt: 'Add best, latest, and history replays to an existing deterministic game.' },
    { id: 'dense-results-ui', category: 'product', suite: 'Information & Interaction', name: 'Dense results interface', variance: 1.7, evidenceKind: 'illustrative', description: 'Tests whether a dense analytical surface becomes quickly legible without deleting useful evidence.', prompt: 'Redesign a confusing benchmark results interface for fast comparison and deep inspection.' },
    { id: 'design-system-extension', category: 'product', suite: 'Information & Interaction', name: 'Design-system extension', variance: -0.8, evidenceKind: 'illustrative', description: 'Tests whether a new product surface feels native without cloning accidental implementation details.', prompt: 'Extend an established interface system with a new evidence-navigation surface.' },
    { id: 'responsive-prototype', category: 'product', suite: 'Information & Interaction', name: 'Responsive prototype', variance: -1.5, evidenceKind: 'illustrative', description: 'Tests hierarchy, touch behavior, and information survival from wide editorial layouts to mobile.', prompt: 'Turn a desktop analytical prototype into a coherent mobile-first experience.' },
    { id: 'onboarding-critique', category: 'product', suite: 'Product Quality', name: 'Onboarding critique', variance: 0.4, evidenceKind: 'illustrative', description: 'Tests whether critique identifies the actual learning and motivation failures instead of surface polish.', prompt: 'Audit an onboarding flow and propose the smallest high-leverage redesign.' },
    { id: 'accessibility-pass', category: 'product', suite: 'Product Quality', name: 'Accessible interaction pass', variance: 0.2, evidenceKind: 'illustrative', description: 'Tests semantics, keyboard operation, focus, touch targets, contrast, and failure recovery together.', prompt: 'Make a polished interactive results surface accessible without flattening its visual hierarchy.' },
    { id: 'product-memo', category: 'writing', suite: 'Exposition & Persuasion', name: 'Product strategy memo', variance: 1.4, evidenceKind: 'illustrative', description: 'Tests decisive synthesis, trade-off clarity, argument structure, and useful recommendation strength.', prompt: 'Write an opinionated product memo from a mixed set of customer and technical evidence.' },
    { id: 'technical-explainer', category: 'writing', suite: 'Exposition & Persuasion', name: 'Technical explainer', variance: 0.6, evidenceKind: 'illustrative', description: 'Tests whether a difficult system becomes accurate, intuitive, and memorable without condescension.', prompt: 'Explain a complex distributed-systems concept to a capable non-specialist.' },
    { id: 'voice-revision', category: 'writing', suite: 'Voice & Synthesis', name: 'Voice-preserving revision', variance: -1.2, evidenceKind: 'illustrative', description: 'Tests whether revision improves force and clarity while preserving the author’s actual voice.', prompt: 'Revise a rough essay without making it sound generic or professionally anesthetized.' },
    { id: 'evidence-synthesis', category: 'writing', suite: 'Voice & Synthesis', name: 'Evidence synthesis', variance: -0.8, evidenceKind: 'illustrative', description: 'Tests provenance-aware synthesis, uncertainty, counterevidence, and a defensible bottom line.', prompt: 'Synthesize conflicting source material into one clear, appropriately qualified conclusion.' },
    { id: 'agent-plan-recovery', category: 'workflows', suite: 'Execution & Coordination', name: 'Agent plan recovery', variance: 1.3, evidenceKind: 'illustrative', description: 'Tests whether an agent recovers the intended journey after compaction, interruption, or partial state.', prompt: 'Resume a substantial implementation lane from durable context without redoing finished work.' },
    { id: 'tool-choice-calibration', category: 'workflows', suite: 'Execution & Coordination', name: 'Tool-choice calibration', variance: -0.4, evidenceKind: 'illustrative', description: 'Tests whether the workflow chooses the cheapest faithful tool and avoids needless ceremony.', prompt: 'Complete a mixed local and web research task with proportionate tool use.' },
    { id: 'multi-agent-handoff', category: 'workflows', suite: 'Execution & Coordination', name: 'Multi-agent handoff', variance: -1.5, evidenceKind: 'illustrative', description: 'Tests bounded delegation, shared-state safety, synthesis quality, and context-efficient handoff.', prompt: 'Coordinate independent agents on one shared implementation without duplicating or colliding.' },
    { id: 'prompt-failure-analysis', category: 'workflows', suite: 'Skill & Evaluation Design', name: 'Prompt failure analysis', variance: 0.8, evidenceKind: 'illustrative', description: 'Tests whether a workflow finds the decision-changing cause instead of polishing generic prompt prose.', prompt: 'Diagnose why a reusable agent instruction fails on representative tasks.' },
    { id: 'eval-harness-design', category: 'workflows', suite: 'Skill & Evaluation Design', name: 'Evaluation harness design', variance: -0.2, evidenceKind: 'illustrative', description: 'Tests falsifiable gates, evidence fidelity, negative controls, and honest claim boundaries.', prompt: 'Design the smallest credible evaluation harness for a new agent capability.' }
  ];

  const MODELS = [
    { id: 'sol-max', family: 'GPT-5.6 Sol', reasoning: 'max', base: 84.6, skill: 2.6, full: 5.2, cost: 0.36, latency: 64, tokens: 16800, tilt: [2.4, 1.3, 0.8, -0.8, 1.8], response: [0.8, 0.9, 1.0, 0.8, 1.5] },
    { id: 'sol-xhigh', family: 'GPT-5.6 Sol', reasoning: 'xhigh', base: 83.9, skill: 2.7, full: 5.0, cost: 0.31, latency: 55, tokens: 15100, tilt: [2.2, 1.4, 0.7, -0.7, 1.6], response: [0.9, 1.0, 1.1, 0.7, 1.3] },
    { id: 'sol-high', family: 'GPT-5.6 Sol', reasoning: 'high', base: 82.2, skill: 2.4, full: 4.7, cost: 0.24, latency: 43, tokens: 12800, tilt: [2.0, 1.2, 0.5, -0.9, 1.5], response: [0.9, 1.1, 1.0, 0.8, 1.3] },
    { id: 'sol-medium', family: 'GPT-5.6 Sol', reasoning: 'medium', base: 78.5, skill: 2.2, full: 4.2, cost: 0.16, latency: 31, tokens: 9700, tilt: [1.7, 1.0, 0.3, -0.6, 1.2], response: [1.0, 1.1, 1.0, 0.7, 1.2] },
    { id: 'terra-xhigh', family: 'GPT-5.6 Terra', reasoning: 'xhigh', base: 81.8, skill: 2.8, full: 5.1, cost: 0.22, latency: 47, tokens: 13200, tilt: [0.8, -0.2, 5.0, -1.2, 0.6], response: [1.0, 1.0, 1.2, 0.7, 1.3] },
    { id: 'terra-high', family: 'GPT-5.6 Terra', reasoning: 'high', base: 80.1, skill: 2.8, full: 5.0, cost: 0.17, latency: 36, tokens: 10800, tilt: [1.5, 0.7, 1.2, -0.2, 1.4], response: [1.0, 1.0, 1.3, 0.7, 1.2] },
    { id: 'terra-medium', family: 'GPT-5.6 Terra', reasoning: 'medium', base: 76.8, skill: 2.5, full: 4.8, cost: 0.11, latency: 25, tokens: 7900, tilt: [1.2, 0.5, 1.1, -0.2, 1.2], response: [1.0, 1.1, 1.3, 0.8, 1.1] },
    { id: 'terra-low', family: 'GPT-5.6 Terra', reasoning: 'low', base: 71.9, skill: 2.2, full: 4.1, cost: 0.07, latency: 16, tokens: 5200, tilt: [0.9, 0.3, 0.8, -0.1, 0.9], response: [1.0, 1.1, 1.2, 0.9, 1.1] },
    { id: 'luna-high', family: 'GPT-5.6 Luna', reasoning: 'high', base: 76.1, skill: 2.4, full: 4.0, cost: 0.10, latency: 21, tokens: 7300, tilt: [0.8, 0.4, 0.7, 0.1, 1.1], response: [0.9, 1.0, 1.2, 0.9, 1.1] },
    { id: 'luna-medium', family: 'GPT-5.6 Luna', reasoning: 'medium', base: 72.8, skill: 2.6, full: 4.4, cost: 0.065, latency: 14, tokens: 4900, tilt: [0.6, 0.3, 0.5, 0.2, 0.9], response: [1.0, 1.1, 1.2, 0.9, 1.2] },
    { id: 'luna-low', family: 'GPT-5.6 Luna', reasoning: 'low', base: 67.9, skill: 2.1, full: 3.6, cost: 0.038, latency: 9, tokens: 3100, tilt: [0.4, 0.2, 0.4, 0.1, 0.7], response: [1.0, 1.1, 1.1, 0.9, 1.2] },
    { id: 'opus-extended', family: 'Opus 4.3', reasoning: 'extended', base: 82.7, skill: 1.8, full: 3.0, cost: 0.41, latency: 71, tokens: 17900, tilt: [0.0, -0.5, 0.0, 5.5, -0.5], response: [0.8, 0.8, 1.0, 1.3, 1.0] },
    { id: 'opus-high', family: 'Opus 4.3', reasoning: 'high', base: 80.9, skill: 1.9, full: 2.8, cost: 0.33, latency: 58, tokens: 15100, tilt: [0.0, -0.4, 0.0, 4.5, -0.4], response: [0.8, 0.8, 1.0, 1.3, 1.0] },
    { id: 'opus-standard', family: 'Opus 4.3', reasoning: 'standard', base: 77.4, skill: 1.4, full: 2.4, cost: 0.24, latency: 42, tokens: 11800, tilt: [0.6, -0.2, 0.6, 1.7, 0.5], response: [0.8, 0.8, 1.0, 1.4, 1.0] },
    { id: 'fable-pro-deep', family: 'Fable 2 Pro', reasoning: 'deep', base: 78.8, skill: 1.5, full: 1.0, cost: 0.19, latency: 48, tokens: 12600, tilt: [-1.5, 11.6, 0.2, 0.8, -1.0], response: [0.6, 1.3, 1.2, 0.9, 0.7] },
    { id: 'fable-pro-high', family: 'Fable 2 Pro', reasoning: 'high', base: 76.4, skill: 1.0, full: 0.4, cost: 0.14, latency: 35, tokens: 9800, tilt: [-0.2, 1.6, 1.2, 0.8, 0.2], response: [0.6, 1.4, 1.2, 0.9, 0.7] },
    { id: 'fable-pro-standard', family: 'Fable 2 Pro', reasoning: 'standard', base: 72.5, skill: 0.8, full: -0.7, cost: 0.09, latency: 24, tokens: 6700, tilt: [-0.3, 1.4, 1.0, 0.7, 0.1], response: [0.5, 1.5, 1.2, 1.0, 0.6] },
    { id: 'fable-swift-high', family: 'Fable 2 Swift', reasoning: 'high', base: 70.8, skill: 1.7, full: 2.5, cost: 0.055, latency: 13, tokens: 4500, tilt: [-0.3, 1.2, 0.9, 0.4, 0.2], response: [0.8, 1.3, 1.2, 0.9, 0.9] },
    { id: 'fable-swift-standard', family: 'Fable 2 Swift', reasoning: 'standard', base: 66.9, skill: 1.1, full: 1.5, cost: 0.033, latency: 8, tokens: 2900, tilt: [-0.4, 1.0, 0.8, 0.3, 0.1], response: [0.8, 1.4, 1.2, 0.9, 0.8] },
    { id: 'fable-swift-low', family: 'Fable 2 Swift', reasoning: 'low', base: 61.8, skill: 0.7, full: -0.9, cost: 0.019, latency: 5.5, tokens: 1800, tilt: [-0.5, 0.9, 0.6, 0.2, 0.0], response: [0.7, 1.5, 1.2, 1.0, 0.6] }
  ];

  const round1 = (value) => Math.round(value * 10) / 10;
  const round3 = (value) => Math.round(value * 1000) / 1000;
  const weightedMean = (values) => values.reduce((sum, value, index) => sum + value * CATEGORIES[index].weight, 0);
  const normalize = (values) => {
    const mean = weightedMean(values);
    return values.map((value) => value - mean);
  };

  const settings = MODELS.map((model) => {
    const tilt = normalize(model.tilt);
    const response = normalize(model.response);
    const categories = {};

    CONDITIONS.forEach((condition) => {
      const delta = condition.id === 'baseline' ? 0 : model[condition.id];
      categories[condition.id] = CATEGORIES.map((category, index) => ({
        category: category.id,
        score: round1(model.base + tilt[index] + delta + (condition.id === 'baseline' ? 0 : response[index] * Math.abs(delta) * 0.34))
      }));
    });

    const metrics = {
      baseline: { cost: model.cost, latency: model.latency, tokens: model.tokens },
      skill: { cost: model.cost * 1.09, latency: model.latency * 1.08, tokens: model.tokens * 1.07 },
      full: { cost: model.cost * 1.23, latency: model.latency * 1.18, tokens: model.tokens * 1.21 }
    };

    Object.values(metrics).forEach((metric) => {
      metric.cost = round3(metric.cost);
      metric.latency = round1(metric.latency);
      metric.tokens = Math.round(metric.tokens / 100) * 100;
    });

    return {
      id: model.id,
      family: model.family,
      reasoning: model.reasoning,
      label: `${model.family} · ${model.reasoning}`,
      scores: { baseline: model.base, skill: round1(model.base + model.skill), full: round1(model.base + model.full) },
      deltas: { skill: model.skill, full: model.full },
      categories,
      metrics
    };
  });

  const entries = settings.flatMap((setting) => CONDITIONS.map((condition) => ({
    id: `${setting.id}-${condition.id}`,
    settingId: setting.id,
    family: setting.family,
    reasoning: setting.reasoning,
    label: setting.label,
    condition: condition.id,
    conditionLabel: condition.label,
    score: setting.scores[condition.id],
    baselineScore: setting.scores.baseline,
    delta: round1(setting.scores[condition.id] - setting.scores.baseline),
    categories: setting.categories[condition.id],
    baselineCategories: setting.categories.baseline,
    cost: setting.metrics[condition.id].cost,
    latency: setting.metrics[condition.id].latency,
    tokens: setting.metrics[condition.id].tokens
  })));

  entries.sort((a, b) => b.score - a.score || a.cost - b.cost);
  entries.forEach((entry, index) => { entry.rank = index + 1; });

  const benchmarkResults = settings.flatMap((setting) => CONDITIONS.flatMap((condition) => BENCHMARKS.map((benchmark, benchmarkIndex) => {
    const categoryScore = setting.categories[condition.id].find((item) => item.category === benchmark.category).score;
    const modelJitter = (((benchmarkIndex + 3) * (setting.id.length + 5)) % 9 - 4) * 0.18;
    const effectVariance = ((((benchmarkIndex + 5) * 7) % 13) - 6) * 0.32;
    const conditionVariance = condition.id === 'baseline'
      ? 0
      : effectVariance * (condition.id === 'skill' ? 0.55 : 1);
    return {
      settingId: setting.id,
      condition: condition.id,
      benchmarkId: benchmark.id,
      category: benchmark.category,
      score: round1(Math.max(0, Math.min(100, categoryScore + benchmark.variance + modelJitter + conditionVariance))),
      trials: 3,
      calibrated: true
    };
  })));

  const benchmarkSummaries = BENCHMARKS.map((benchmark) => {
    if (benchmark.measured) {
      const measured = benchmark.measured;
      return {
        benchmarkId: benchmark.id,
        evidenceKind: benchmark.evidenceKind,
        baselineLabel: 'Minimal baseline',
        treatmentLabel: measured.treatmentLabel,
        baseline: measured.baseline,
        treatment: measured.treatment,
        delta: measured.delta,
        wins: measured.wins,
        ties: measured.ties,
        losses: measured.losses,
        complete: measured.complete,
        total: measured.total,
        completionLabel: 'responses',
        calibration: measured.calibration,
        detailHref: `./benchmark-report.html#${benchmark.id}`,
        sourceHref: benchmark.sourceHref
      };
    }

    const baselineRows = benchmarkResults.filter((result) => (
      result.benchmarkId === benchmark.id && result.condition === 'baseline'
    ));
    const fullRows = benchmarkResults.filter((result) => (
      result.benchmarkId === benchmark.id && result.condition === 'full'
    ));
    const baseline = round1(baselineRows.reduce((sum, result) => sum + result.score, 0) / baselineRows.length);
    const treatment = round1(fullRows.reduce((sum, result) => sum + result.score, 0) / fullRows.length);
    const outcomes = fullRows.reduce((record, result) => {
      const matched = baselineRows.find((candidate) => candidate.settingId === result.settingId);
      const difference = round1(result.score - matched.score);
      if (difference > 0) record.wins += 1;
      else if (difference < 0) record.losses += 1;
      else record.ties += 1;
      return record;
    }, { wins: 0, ties: 0, losses: 0 });

    return {
      benchmarkId: benchmark.id,
      evidenceKind: 'illustrative',
      baselineLabel: 'Without Vasir',
      treatmentLabel: 'With Vasir',
      baseline,
      treatment,
      delta: round1(treatment - baseline),
      ...outcomes,
      complete: baselineRows.length * 2 * 3,
      total: baselineRows.length * 2 * 3,
      completionLabel: 'simulated trials',
      calibration: 'Illustrative fixture',
      detailHref: `./benchmark-report.html#${benchmark.id}`,
      sourceHref: null
    };
  });

  const categoryLeaders = CATEGORIES.map((category) => {
    const candidates = entries.map((entry) => ({
      ...entry,
      categoryScore: entry.categories.find((item) => item.category === category.id).score
    })).sort((a, b) => b.categoryScore - a.categoryScore || b.score - a.score);
    return { category: category.id, entry: candidates[0] };
  });

  const efficientFrontier = entries.filter((entry) => (
    !entries.some((other) => other.score > entry.score && other.cost <= entry.cost)
  )).sort((a, b) => a.cost - b.cost);

  window.VASIR_DATA = Object.freeze({
    meta: {
      release: 'Issue 08 · August 2026',
      status: 'Aggregate rankings illustrative · 3 development reports',
      categories: CATEGORIES.length,
      benchmarks: BENCHMARKS.length,
      settings: settings.length,
      conditions: CONDITIONS.length,
      trials: 3,
      aggregateCells: benchmarkResults.length,
      runs: benchmarkResults.length * 3,
      calibration: 100,
      vasirVersion: 'v0.8.1'
    },
    conditions: CONDITIONS,
    categories: CATEGORIES,
    benchmarks: BENCHMARKS,
    settings,
    entries,
    benchmarkResults,
    benchmarkSummaries,
    categoryLeaders,
    efficientFrontier,
    regressions: entries.filter((entry) => entry.condition === 'full' && entry.delta < 0),
    callouts: {
      overall: 'GPT-5.6 Sol · max with Full Vasir leads at 89.8, 5.2 points above its matched baseline.',
      value: 'GPT-5.6 Luna · medium with Full Vasir reaches 77.2 for $0.080 per benchmark run.',
      regression: 'Full Vasir lowers two settings: Fable 2 Pro · standard (−0.7) and Fable 2 Swift · low (−0.9).',
      category: 'Specialists still break through: Fable 2 Pro · deep leads Games, Terra · xhigh leads Product Design, and Opus 4.3 · extended leads Writing.'
    }
  });
}());
