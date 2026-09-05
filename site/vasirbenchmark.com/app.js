(function () {
  'use strict';

  const data = window.VASIR_DATA;
  const d3 = window.d3;
  const capabilityView = document.querySelector('#capability-view');
  const REQUIRED_CONDITION_IDS = ['baseline', 'skill'];
  const requiredCollections = ['conditions', 'categories', 'benchmarks', 'benchmarkSummaries', 'settings', 'entries', 'benchmarkResults'];
  const hasRequiredCollections = Boolean(data) && requiredCollections.every((key) => Array.isArray(data[key]));
  const expectedEntryCount = hasRequiredCollections
    ? data.settings.length * data.conditions.length
    : 0;
  const expectedResponseCount = hasRequiredCollections
    ? expectedEntryCount * data.benchmarks.length
    : 0;
  if (
    !data
    || !d3?.scaleLinear
    || !hasRequiredCollections
    || data.conditions.length !== REQUIRED_CONDITION_IDS.length
    || !REQUIRED_CONDITION_IDS.every((conditionId) => data.conditions.some((condition) => condition.id === conditionId))
    || data.categories.length === 0
    || data.benchmarks.length === 0
    || data.settings.length === 0
    || data.benchmarkSummaries.length !== data.benchmarks.length
    || data.entries.length !== expectedEntryCount
    || data.benchmarkResults.length !== expectedResponseCount
  ) {
    if (capabilityView) {
      capabilityView.innerHTML = `
        <section class="development-unavailable" role="alert">
          <p class="ui-eyebrow">Benchmark data unavailable</p>
          <h2>RESULTS COULD NOT BE VERIFIED</h2>
          <p>The public dataset must provide one complete Minimal baseline and Architecture skill result for every matched setting and frozen task. No partial comparison is shown.</p>
        </section>
      `;
    }
    return;
  }

  const INITIAL_RESULT_COUNT = 10;
  const BASELINE_CONDITION_ID = 'baseline';
  const TREATMENT_CONDITION_ID = 'skill';
  const SETTING_COUNT = data.settings.length;
  const ENTRY_COUNT = data.entries.length;
  const BENCHMARK_COUNT = data.benchmarks.length;
  const scoreBasis = data.scoreBasis && typeof data.scoreBasis === 'object' ? data.scoreBasis : {};
  const TASK_COUNT = Number.isFinite(Number(scoreBasis.taskCount)) && Number(scoreBasis.taskCount) > 0
    ? Number(scoreBasis.taskCount)
    : BENCHMARK_COUNT;
  const SCORE_MINIMUM = Number.isFinite(Number(scoreBasis.range?.minimum)) ? Number(scoreBasis.range.minimum) : 0;
  const SCORE_MAXIMUM = Number.isFinite(Number(scoreBasis.range?.maximum)) ? Number(scoreBasis.range.maximum) : 100;
  const TRIALS_PER_TASK = Number.isFinite(Number(scoreBasis.trialsPerTask)) && Number(scoreBasis.trialsPerTask) > 0
    ? Number(scoreBasis.trialsPerTask)
    : Number.isFinite(Number(data.meta?.trials)) && Number(data.meta.trials) > 0
      ? Number(data.meta.trials)
      : 1;
  const JUDGE_COUNT = Number.isInteger(Number(scoreBasis.judgeCount)) && Number(scoreBasis.judgeCount) > 0
    ? Number(scoreBasis.judgeCount)
    : 2;
  const SCORE_EDITION_LABEL = typeof scoreBasis.label === 'string' && scoreBasis.label.trim()
    ? scoreBasis.label.trim()
    : 'Engineering v2';
  const SCORE_METHOD_LABEL = scoreBasis.benchmarkWeighting === 'equal'
    ? 'Equal-weight mean of frozen task rubric scores'
    : `${SCORE_EDITION_LABEL} score`;
  const QUALITY_DOMAIN = [SCORE_MINIMUM, SCORE_MAXIMUM];
  const taskCoverageLabel = `${TASK_COUNT} ${TASK_COUNT === 1 ? 'task' : 'tasks'} × ${TRIALS_PER_TASK} ${TRIALS_PER_TASK === 1 ? 'trial' : 'trials'}`;
  const developmentDisclosure = `${SCORE_EDITION_LABEL} · ${taskCoverageLabel} · ${JUDGE_COUNT} judges`;
  const COMPOSITE_SCORE_SCALE = d3.scaleLinear()
    .domain(QUALITY_DOMAIN)
    .range([0, 100])
    .clamp(true);
  const CAPABILITY_MODES = ['models', 'benchmarks', 'efficiency'];
  const COMBINED_CAPABILITY = {
    id: 'overall',
    name: 'Combined',
    short: 'ALL',
    color: 'var(--category-combined)',
    isCombined: true
  };
  const capabilityFields = [COMBINED_CAPABILITY, ...data.categories];
  const capabilityIndexMedia = window.matchMedia('(min-width: 67.501rem)');
  const combinedScoreGuideMedia = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 67.501rem)');

  const resourceDomain = (key) => {
    const values = data.entries
      .map((entry) => Number(entry[key]))
      .filter((value) => Number.isFinite(value) && value > 0);
    const [observedMinimum = 1, observedMaximum = 1] = d3.extent(values);
    const minimum = Math.max(Number.MIN_VALUE, observedMinimum * 0.9);
    const maximum = observedMaximum === observedMinimum
      ? observedMaximum * 1.1
      : observedMaximum * 1.1;
    return [minimum, maximum];
  };

  const resourceTicks = (domain) => {
    const scale = d3.scaleLog().domain(domain);
    const label = scale.tickFormat(6);
    return scale.ticks(6).filter((value) => (
      value >= domain[0] && value <= domain[1] && label(value) !== ''
    ));
  };

  const metricConfig = {
    latency: {
      label: 'Latency',
      axis: 'Latency per response (seconds)',
      note: 'Latency · log scale',
      domain: resourceDomain('latency'),
      format: (value) => `${value.toFixed(value < 10 ? 1 : 0)}s`,
      spoken: (value) => `${value.toFixed(1)} seconds per response`
    },
    tokens: {
      label: 'Tokens',
      axis: 'Output tokens per response',
      note: 'Tokens · log scale',
      domain: resourceDomain('tokens'),
      format: (value) => `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}k`,
      spoken: (value) => `${value.toLocaleString()} output tokens per response`
    }
  };
  Object.values(metricConfig).forEach((metric) => { metric.ticks = resourceTicks(metric.domain); });

  const conditionById = new Map(data.conditions.map((condition) => [condition.id, condition]));
  const conditionVisualClass = (conditionId) => (
    conditionId === BASELINE_CONDITION_ID ? 'baseline' : 'full'
  );
  const categoryById = new Map(capabilityFields.map((category) => [category.id, category]));
  const benchmarkById = new Map(data.benchmarks.map((benchmark) => [benchmark.id, benchmark]));
  const benchmarkSummaryById = new Map(data.benchmarkSummaries.map((summary) => [summary.benchmarkId, summary]));
  const entryById = new Map(data.entries.map((entry) => [entry.id, entry]));
  const baselineBySetting = new Map(
    data.entries
      .filter((entry) => entry.condition === BASELINE_CONDITION_ID)
      .map((entry) => [entry.settingId, entry])
  );

  const fieldConfig = {
    overall: { label: 'Combined', short: 'Combined' },
    ...Object.fromEntries(data.categories.map((category) => [
      category.id,
      { label: category.name, short: category.short }
    ]))
  };
  const capabilityMobileLabel = {
    overall: 'Combined',
    engineering: 'Eng'
  };
  const suiteDescriptions = {
    'Backend Architecture': 'Complete, low-rent systems whose day-one topology reaches real scale without a later rewrite.'
  };

  const elements = {
    workspace: document.querySelector('#panel-capabilities'),
    capabilityView: document.querySelector('#capability-view')
  };

  const routeFromHash = () => {
    const route = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (route === 'leaderboard') {
      return { category: COMBINED_CAPABILITY.id, mode: 'models', legacy: true };
    }
    if (route === 'efficiency') {
      return { category: COMBINED_CAPABILITY.id, mode: 'efficiency', legacy: true };
    }
    if (route === 'vasir-effect') {
      return { category: data.categories[0].id, mode: 'models', legacy: true };
    }
    if (route === 'capabilities') {
      return { category: COMBINED_CAPABILITY.id, mode: 'models', canonical: false };
    }
    if (route.startsWith('capabilities/')) {
      const [, category, requestedMode] = route.split('/');
      const categoryIsValid = categoryById.has(category);
      const mode = requestedMode === 'benchmarks' || requestedMode === 'efficiency'
        ? requestedMode
        : 'models';
      return {
        category: categoryIsValid ? category : COMBINED_CAPABILITY.id,
        mode,
        canonical: categoryIsValid && (!requestedMode || requestedMode === 'benchmarks' || requestedMode === 'efficiency')
      };
    }
    return {
      category: COMBINED_CAPABILITY.id,
      mode: 'models',
      invalid: Boolean(route)
    };
  };

  const initialRoute = routeFromHash();

  const state = {
    selectedId: data.entries.find((entry) => entry.condition === TREATMENT_CONDITION_ID)?.id || data.entries[0].id,
    capabilityCategory: initialRoute.category || COMBINED_CAPABILITY.id,
    capabilityMode: CAPABILITY_MODES.includes(initialRoute.mode) ? initialRoute.mode : 'models',
    metric: 'latency',
    showAll: false
  };

  const capabilityHash = () => (
    `#capabilities/${state.capabilityCategory}${state.capabilityMode === 'models' ? '' : `/${state.capabilityMode}`}`
  );

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const formatScore = (value) => value.toFixed(1);

  const signed = (value) => {
    if (value > 0) return `+${value.toFixed(1)}`;
    if (value < 0) return `−${Math.abs(value).toFixed(1)}`;
    return '±0.0';
  };

  const scoreFor = (entry, field = 'overall') => {
    if (field === 'overall') return entry.score;
    return entry.categories.find((reading) => reading.category === field).score;
  };

  const baselineScoreFor = (entry, field = 'overall') => {
    if (field === 'overall') return entry.baselineScore;
    return entry.baselineCategories.find((reading) => reading.category === field).score;
  };

  const deltaFor = (entry, field = 'overall') => (
    Math.round((scoreFor(entry, field) - baselineScoreFor(entry, field)) * 10) / 10
  );

  const rankedField = (field = 'overall') => {
    const entries = [...data.entries].sort((left, right) => (
      scoreFor(right, field) - scoreFor(left, field) ||
      right.score - left.score ||
      left.latency - right.latency ||
      left.id.localeCompare(right.id)
    ));
    const ranks = new Map();
    data.conditions.forEach((condition) => {
      entries
        .filter((entry) => entry.condition === condition.id)
        .forEach((entry, index) => ranks.set(entry.id, index + 1));
    });
    return {
      entries,
      ranks
    };
  };

  const rankedCondition = (conditionId, field = 'overall') => {
    const entries = data.entries
      .filter((entry) => entry.condition === conditionId)
      .sort((left, right) => (
        scoreFor(right, field) - scoreFor(left, field) ||
        right.score - left.score ||
        left.latency - right.latency ||
        left.id.localeCompare(right.id)
      ));
    return {
      entries,
      ranks: new Map(entries.map((entry, index) => [entry.id, index + 1]))
    };
  };

  const selectedEntry = () => entryById.get(state.selectedId) || data.entries[0];

  const matchedEntries = (entry) => data.conditions.map((condition) => (
    entryById.get(`${entry.settingId}-${condition.id}`)
      || data.entries.find((candidate) => candidate.settingId === entry.settingId && candidate.condition === condition.id)
  )).filter(Boolean);

  const conditionMarkup = (conditionId, short = false) => {
    const condition = conditionById.get(conditionId);
    return `
      <span class="condition-label condition-label--${escapeHtml(conditionVisualClass(conditionId))}">
        <span class="condition-mark condition-mark--${escapeHtml(conditionVisualClass(conditionId))}" aria-hidden="true"></span>
        ${escapeHtml(short ? condition.short : condition.label)}
      </span>
    `;
  };

  const weightedComposition = (entry) => {
    const weighted = data.categories.map((category) => {
      const rawScore = entry.categories.find((reading) => reading.category === category.id).score;
      const weight = Number.isFinite(category.weight) ? category.weight : 1;
      return {
        category,
        rawScore,
        weight,
        unscaledContribution: rawScore * weight
      };
    });
    const weightedTotal = weighted.reduce((sum, item) => sum + item.unscaledContribution, 0);
    const scale = weightedTotal > 0 ? entry.score / weightedTotal : 0;
    let allocated = 0;

    return weighted.map((item, index) => {
      const contribution = index === weighted.length - 1
        ? entry.score - allocated
        : item.unscaledContribution * scale;
      allocated += contribution;
      return { ...item, contribution };
    });
  };

  const weightedCompositionDescription = (segments) => segments.map(({ category, rawScore, contribution, weight }) => (
    `${category.name} ${SCORE_EDITION_LABEL} score ${formatScore(rawScore)} of ${SCORE_MAXIMUM}, ${Math.round(weight * 100)} percent weight, ${contribution.toFixed(2)} weighted points`
  )).join('; ');

  const capabilityCompositionMarkup = (entry, conditionRank, fullEntryId) => {
    const score = entry.score;
    const segments = weightedComposition(entry);
    const profileLabel = weightedCompositionDescription(segments);
    const conditionLabel = conditionById.get(entry.condition).label;
    const baselineEntry = baselineBySetting.get(entry.settingId);

    return `
      <span
        class="capability-composition capability-composition--${escapeHtml(conditionVisualClass(entry.condition))}"
        data-entry-id="${escapeHtml(entry.id)}"
        data-condition="${escapeHtml(entry.condition)}"
        data-composite-score="${score.toFixed(1)}"
        data-condition-rank="${conditionRank}"
        role="group"
        aria-label="${escapeHtml(conditionLabel)}, ${SCORE_EDITION_LABEL} score ${formatScore(score)} of ${SCORE_MAXIMUM}. ${escapeHtml(conditionLabel)} rank ${conditionRank} of ${SETTING_COUNT}, shown as secondary context. ${escapeHtml(profileLabel)}."
      >
        <span class="capability-composition__meta">
          <span class="capability-composition__label">${escapeHtml(conditionLabel)}</span>
          <span class="capability-composition__rank">Rank #${String(conditionRank).padStart(2, '0')}</span>
        </span>
        <span class="capability-composition__track">
          <span class="capability-composition__stack" role="toolbar" aria-label="Open a capability leaderboard from ${escapeHtml(conditionLabel)} scores">
            ${segments.map(({ category, rawScore, contribution, weight }, index) => {
              const baselineScore = baselineEntry.categories.find((reading) => reading.category === category.id).score;
              const categoryDelta = Math.round((rawScore - baselineScore) * 10) / 10;
              const insight = `${category.name}: ${SCORE_EDITION_LABEL} score ${formatScore(rawScore)} of ${SCORE_MAXIMUM}, weight ${Math.round(weight * 100)}%, weighted contribution ${contribution.toFixed(2)} points`;
              return `
                <button
                  class="capability-composition__segment capability-composition__segment--${escapeHtml(category.id)}"
                  type="button"
                  data-category-id="${escapeHtml(category.id)}"
                  data-entry-id="${escapeHtml(fullEntryId)}"
                  data-source-condition="${escapeHtml(entry.condition)}"
                  data-category-label="${escapeHtml(category.name)}"
                  data-category-short="${escapeHtml(category.short)}"
                  data-raw-score="${rawScore.toFixed(1)}"
                  data-weight="${weight}"
                  data-contribution="${contribution.toFixed(6)}"
                  data-delta="${categoryDelta.toFixed(1)}"
                  style="--segment-width: ${COMPOSITE_SCORE_SCALE(contribution).toFixed(4)}%"
                  tabindex="${index === 0 ? '0' : '-1'}"
                  aria-label="Open ${escapeHtml(category.name)} results for ${escapeHtml(entry.family)}, ${escapeHtml(entry.reasoning)} reasoning, with Architecture skill selected. ${escapeHtml(conditionLabel)} ${escapeHtml(insight)}."
                  title="${escapeHtml(insight)}"
                >
                  <span class="capability-composition__abbr" aria-hidden="true">${escapeHtml(category.short)}</span>
                  <strong class="capability-composition__score" aria-hidden="true">${formatScore(rawScore)}</strong>
                </button>
              `;
            }).join('')}
          </span>
        </span>
        <strong class="capability-composition__total">${formatScore(score)}</strong>
      </span>
    `;
  };

  const resourceComparison = (entry, key) => {
    const baseline = Number(baselineBySetting.get(entry.settingId)?.[key]);
    const value = Number(entry[key]);
    if (!Number.isFinite(baseline) || baseline <= 0 || !Number.isFinite(value) || value <= 0) return 'Not available';
    const difference = Math.round(((value / baseline) - 1) * 100);
    if (difference === 0) return 'Minimal reference';
    return `${difference > 0 ? '+' : '−'}${Math.abs(difference)}% vs Minimal`;
  };

  const normalizedQuality = (score) => {
    const ratio = (score - QUALITY_DOMAIN[0]) / (QUALITY_DOMAIN[1] - QUALITY_DOMAIN[0]);
    return Math.max(0, Math.min(100, ratio * 100));
  };

  const resourcePosition = (value, metric = state.metric) => {
    const [minimum, maximum] = metricConfig[metric].domain;
    const ratio = (Math.log(value) - Math.log(minimum)) / (Math.log(maximum) - Math.log(minimum));
    return Math.max(0, Math.min(100, ratio * 100));
  };

  const plotCoordinates = (entry, field = state.capabilityCategory, metric = state.metric) => ({
    x: resourcePosition(entry[metric], metric),
    y: 100 - normalizedQuality(scoreFor(entry, field))
  });

  const tripletMarkup = (entry, field = 'overall') => {
    const ranking = rankedField(field);
    return matchedEntries(entry).map((candidate) => {
      const selected = candidate.id === entry.id;
      const condition = conditionById.get(candidate.condition);
      return `
        <button
          class="matched-triplet__option matched-triplet__option--${escapeHtml(conditionVisualClass(candidate.condition))}${selected ? ' is-selected' : ''}"
          type="button"
          data-entry-id="${escapeHtml(candidate.id)}"
          aria-pressed="${selected}"
          aria-label="Select matched ${escapeHtml(condition.label)}, ${fieldConfig[field].label} ${SCORE_EDITION_LABEL} score ${formatScore(scoreFor(candidate, field))} of ${SCORE_MAXIMUM}, ${escapeHtml(condition.label)} rank ${ranking.ranks.get(candidate.id)} of ${SETTING_COUNT}"
        >
          ${conditionMarkup(candidate.condition, true)}
          <strong>${formatScore(scoreFor(candidate, field))}</strong>
          <span>#${String(ranking.ranks.get(candidate.id)).padStart(2, '0')} · ${signed(deltaFor(candidate, field))} vs Minimal</span>
        </button>
      `;
    }).join('');
  };

  const categoryBenchmarks = (categoryId) => (
    categoryId === COMBINED_CAPABILITY.id
      ? data.benchmarks
      : data.benchmarks.filter((benchmark) => benchmark.category === categoryId)
  );

  const combinedOutcomeSummary = () => {
    const fullEntries = rankedCondition(TREATMENT_CONDITION_ID, COMBINED_CAPABILITY.id).entries;
    const deltas = fullEntries
      .map((entry) => Math.round((entry.score - baselineBySetting.get(entry.settingId).score) * 10) / 10)
      .sort((left, right) => left - right);
    const midpoint = Math.floor(deltas.length / 2);
    const median = deltas.length % 2
      ? deltas[midpoint]
      : Math.round(((deltas[midpoint - 1] + deltas[midpoint]) / 2) * 10) / 10;
    return {
      median,
      improved: deltas.filter((delta) => delta > 0).length,
      regressed: deltas.filter((delta) => delta < 0).length,
      unchanged: deltas.filter((delta) => delta === 0).length,
      total: deltas.length
    };
  };

  const capabilityHeaderMarkup = (category) => {
    const benchmarks = categoryBenchmarks(category.id);
    const trackCount = new Set(benchmarks.map((benchmark) => benchmark.suite)).size;
    const measuredCount = benchmarks.filter((benchmark) => benchmark.evidenceKind === 'development').length;
    const fullWinner = rankedCondition(TREATMENT_CONDITION_ID, category.id).entries[0];
    const baselineWinner = rankedCondition(BASELINE_CONDITION_ID, category.id).entries[0];
    const showingBenchmarks = state.capabilityMode === 'benchmarks';
    const showingEfficiency = state.capabilityMode === 'efficiency';
    const outcome = category.isCombined && state.capabilityMode === 'models' ? combinedOutcomeSummary() : null;
    const modelViewLabel = category.isCombined ? 'Paired leaderboard' : 'Model leaderboard';
    const identityLabel = `Capabilities / ${category.name} / ${showingBenchmarks ? 'Benchmark tests' : showingEfficiency ? 'Efficiency' : modelViewLabel}`;
    const modelSummary = category.isCombined
      ? `${SETTING_COUNT} matched settings · ${SCORE_METHOD_LABEL.toLowerCase()} across ${TASK_COUNT} benchmark tasks`
      : `${SETTING_COUNT} matched settings · ${SCORE_EDITION_LABEL} rubric score /${SCORE_MAXIMUM}`;
    return `
      <header class="capability-canvas__header">
        <div class="capability-canvas__identity">
          <p class="ui-eyebrow">${escapeHtml(identityLabel)}</p>
          <p class="capability-canvas__status"><strong>${escapeHtml(developmentDisclosure)}</strong></p>
          <h3 id="capability-question" tabindex="-1">${escapeHtml(category.name)}</h3>
          <p>${showingBenchmarks
            ? `${trackCount} ${trackCount === 1 ? 'track' : 'tracks'} · ${benchmarks.length} benchmark tests`
            : showingEfficiency
              ? `${ENTRY_COUNT} setting × condition results · fixed ${escapeHtml(category.name)} rubric score × ${escapeHtml(metricConfig[state.metric].label.toLowerCase())}`
              : escapeHtml(modelSummary)}</p>
        </div>
        <dl class="capability-canvas__readings${outcome ? ' capability-canvas__readings--combined' : ''}" aria-label="${escapeHtml(category.name)} summary">
          ${showingBenchmarks ? `
            <div class="capability-canvas__reading capability-canvas__reading--measured" data-count="${measuredCount}">
              <dt>Tests</dt>
              <dd>${measuredCount}<small> scored tasks</small></dd>
            </div>
            <div class="capability-canvas__reading capability-canvas__reading--audit">
              <dt>Field</dt>
              <dd>${SETTING_COUNT}<small> matched settings</small></dd>
            </div>
          ` : outcome ? `
            <div class="capability-canvas__reading capability-canvas__reading--full" data-entry-id="${escapeHtml(fullWinner.id)}" data-score="${scoreFor(fullWinner, category.id).toFixed(1)}">
              <dt>Best Architecture skill /${SCORE_MAXIMUM}</dt>
              <dd>${formatScore(scoreFor(fullWinner, category.id))}<small>${escapeHtml(fullWinner.family)} · ${escapeHtml(fullWinner.reasoning)}</small></dd>
            </div>
            <div class="capability-canvas__reading capability-canvas__reading--effect" data-median="${outcome.median.toFixed(1)}">
              <dt>Median paired uplift</dt>
              <dd>${signed(outcome.median)}<small>points across ${outcome.total} matched settings</small></dd>
            </div>
            <div class="capability-canvas__reading capability-canvas__reading--outcomes" data-improved="${outcome.improved}" data-regressed="${outcome.regressed}">
              <dt>Improved settings</dt>
              <dd>${outcome.improved} of ${outcome.total}<small>${outcome.regressed} regressed${outcome.unchanged ? ` · ${outcome.unchanged} unchanged` : ''}</small></dd>
            </div>
          ` : `
            <div class="capability-canvas__reading capability-canvas__reading--full" data-entry-id="${escapeHtml(fullWinner.id)}" data-score="${scoreFor(fullWinner, category.id).toFixed(1)}">
              <dt>Architecture skill leader /${SCORE_MAXIMUM}</dt>
              <dd>${formatScore(scoreFor(fullWinner, category.id))}<small>${escapeHtml(fullWinner.family)} · ${escapeHtml(fullWinner.reasoning)}</small></dd>
            </div>
            <div class="capability-canvas__reading capability-canvas__reading--baseline" data-entry-id="${escapeHtml(baselineWinner.id)}" data-score="${scoreFor(baselineWinner, category.id).toFixed(1)}">
              <dt>Minimal baseline leader /${SCORE_MAXIMUM}</dt>
              <dd>${formatScore(scoreFor(baselineWinner, category.id))}<small>${escapeHtml(baselineWinner.family)} · ${escapeHtml(baselineWinner.reasoning)}</small></dd>
            </div>
          `}
        </dl>
      </header>
    `;
  };

  const capabilityModeMarkup = (category) => {
    const benchmarks = categoryBenchmarks(category.id);
    const trackCount = new Set(benchmarks.map((benchmark) => benchmark.suite)).size;
    return `
      ${capabilityHeaderMarkup(category)}
      <nav class="capability-mode" aria-label="Choose ${escapeHtml(category.name)} view">
          <span class="capability-mode__label" aria-hidden="true">View</span>
          <div class="capability-mode__tabs" role="tablist" aria-label="Choose ${escapeHtml(category.name)} evidence view">
            <button
              class="capability-mode__tab${state.capabilityMode === 'models' ? ' is-selected' : ''}"
              id="capability-mode-models"
              type="button"
              role="tab"
              data-capability-mode="models"
              aria-selected="${state.capabilityMode === 'models'}"
              aria-controls="capability-ranking"
              tabindex="${state.capabilityMode === 'models' ? '0' : '-1'}"
            ><strong>Leaderboard</strong><span>${SETTING_COUNT} ranked settings</span></button>
            <button
              class="capability-mode__tab${state.capabilityMode === 'benchmarks' ? ' is-selected' : ''}"
              id="capability-mode-benchmarks"
              type="button"
              role="tab"
              data-capability-mode="benchmarks"
              aria-selected="${state.capabilityMode === 'benchmarks'}"
              aria-controls="capability-benchmarks"
              tabindex="${state.capabilityMode === 'benchmarks' ? '0' : '-1'}"
            ><strong>Benchmark tests</strong><span>${trackCount} ${trackCount === 1 ? 'track' : 'tracks'} · ${benchmarks.length} tests</span></button>
            <button
              class="capability-mode__tab${state.capabilityMode === 'efficiency' ? ' is-selected' : ''}"
              id="capability-mode-efficiency"
              type="button"
              role="tab"
              data-capability-mode="efficiency"
              aria-selected="${state.capabilityMode === 'efficiency'}"
              aria-controls="capability-efficiency"
              tabindex="${state.capabilityMode === 'efficiency' ? '0' : '-1'}"
            ><strong>Efficiency</strong><span>Rubric score × resource</span></button>
          </div>
      </nav>
    `;
  };

  const efficiencyPanelMarkup = () => `
    <section
      class="capability-efficiency"
      id="capability-efficiency"
      role="tabpanel"
      aria-labelledby="capability-mode-efficiency"
      ${state.capabilityMode === 'efficiency' ? '' : 'hidden'}
    >
      <header class="efficiency-controls">
        <div class="efficiency-controls__label">
          <p class="ui-eyebrow">Efficiency explorer</p>
          <strong>${ENTRY_COUNT} setting × condition results</strong>
        </div>
        <label class="field-control field-control--wide" for="efficiency-entry">
          <span>Selected result</span>
          <select id="efficiency-entry" name="efficiency-entry"></select>
        </label>
        <label class="field-control" for="resource-axis">
          <span>Resource axis</span>
          <select id="resource-axis" name="resource-axis">
            ${Object.entries(metricConfig).map(([key, metric]) => (
              `<option value="${escapeHtml(key)}"${state.metric === key ? ' selected' : ''}>${escapeHtml(metric.label)}</option>`
            )).join('')}
          </select>
        </label>
      </header>
      <div id="efficiency-view"></div>
    </section>
  `;

  const benchmarkLedgerRowMarkup = (benchmark, categoryIndex, sourceCategoryId) => {
    const summary = benchmarkSummaryById.get(benchmark.id);
    const regression = summary.delta < 0;
    const action = 'Open benchmark report';
    const reportHref = sourceCategoryId === COMBINED_CAPABILITY.id
      ? summary.detailHref.replace('#', '?from=overall#')
      : summary.detailHref;
    return `
      <a
        class="benchmark-ledger__row benchmark-ledger__row--measured${regression ? ' benchmark-ledger__row--regression' : ''}"
        href="${escapeHtml(reportHref)}"
        data-benchmark-id="${escapeHtml(benchmark.id)}"
        data-evidence-kind="development"
        data-baseline-score="${summary.baseline.toFixed(1)}"
        data-treatment-score="${summary.treatment.toFixed(1)}"
        data-report-href="${escapeHtml(reportHref)}"
        aria-label="${escapeHtml(action)} for ${escapeHtml(benchmark.name)}. Across ${SETTING_COUNT} matched settings, ${escapeHtml(summary.baselineLabel)} field mean ${formatScore(summary.baseline)} of ${SCORE_MAXIMUM}, ${escapeHtml(summary.treatmentLabel)} field mean ${formatScore(summary.treatment)} of ${SCORE_MAXIMUM}, paired uplift ${signed(summary.delta)} points."
      >
        <span class="benchmark-ledger__identity">
          <span>${String(categoryIndex + 1).padStart(2, '0')} / ${escapeHtml(categoryById.get(benchmark.category)?.name || 'Benchmark')}</span>
          <strong>${escapeHtml(benchmark.name)}</strong>
          <small>${escapeHtml(benchmark.description)}</small>
        </span>
        <span class="benchmark-ledger__comparison">
          <span><small>Minimal field mean</small><strong>${formatScore(summary.baseline)}</strong></span>
          <i aria-hidden="true">→</i>
          <span><small title="${escapeHtml(summary.treatmentLabel)}">Skill field mean</small><strong>${formatScore(summary.treatment)}</strong></span>
          <b>${signed(summary.delta)}<small> pts</small></b>
        </span>
        <span class="benchmark-ledger__evidence">
          <strong>${summary.complete}/${summary.total} ${escapeHtml(summary.completionLabel)}</strong>
          <span>${summary.wins}W · ${summary.ties}T · ${summary.losses}L</span>
          <span title="${escapeHtml(summary.runId || '')}">Run ${escapeHtml((summary.runId || 'not published').split('__')[0])}</span>
        </span>
        <span class="benchmark-ledger__action">${escapeHtml(action)} <span aria-hidden="true">→</span></span>
      </a>
    `;
  };

  const benchmarkLedgerMarkup = (category, hidden = false) => {
    const benchmarks = categoryBenchmarks(category.id);
    const suiteNames = [...new Set(benchmarks.map((benchmark) => benchmark.suite))];
    return `
      <section
        class="benchmark-ledger"
        id="capability-benchmarks"
        role="tabpanel"
        aria-labelledby="capability-mode-benchmarks"
        ${hidden ? 'hidden' : ''}
        style="--category-color:${category.color}"
      >
        <h4 class="visually-hidden">${escapeHtml(category.name)} benchmark tests</h4>
        <div class="benchmark-ledger__tracks">
          ${suiteNames.map((suite, suiteIndex) => {
            const suiteBenchmarks = benchmarks.filter((benchmark) => benchmark.suite === suite);
            const suiteMeasured = suiteBenchmarks.filter((benchmark) => benchmark.evidenceKind === 'development').length;
            return `
              <section class="benchmark-ledger__track" aria-labelledby="benchmark-track-${category.id}-${suiteIndex}">
                <header class="benchmark-ledger__track-header">
                  <span>${String(suiteIndex + 1).padStart(2, '0')} / TRACK</span>
                  <div>
                    <h4 id="benchmark-track-${category.id}-${suiteIndex}">${escapeHtml(suite)}</h4>
                    <p>${escapeHtml(suiteDescriptions[suite] || '')}</p>
                  </div>
                  <strong>${suiteBenchmarks.length} tests · ${suiteMeasured} scored</strong>
                </header>
                <div class="benchmark-ledger__rows">
                  ${suiteBenchmarks.map((benchmark) => benchmarkLedgerRowMarkup(benchmark, benchmarks.indexOf(benchmark), category.id)).join('')}
                </div>
              </section>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const settingRowMarkup = (fullEntry, baselineRanks, fullRanks) => {
    const baselineEntry = baselineBySetting.get(fullEntry.settingId);
    const baselineRank = baselineRanks.get(baselineEntry.id);
    const fullRank = fullRanks.get(fullEntry.id);
    const delta = Math.round((fullEntry.score - baselineEntry.score) * 10) / 10;
    const selected = selectedEntry().settingId === fullEntry.settingId;
    const compositionDescriptionId = `paired-composition-description-${fullEntry.settingId}`;
    const baselineDescription = weightedCompositionDescription(weightedComposition(baselineEntry));
    const fullDescription = weightedCompositionDescription(weightedComposition(fullEntry));
    const deltaClass = delta < 0 ? ' setting-row__delta--negative' : '';

    return `
      <li
        class="setting-row${selected ? ' is-selected' : ''}"
        id="row-${escapeHtml(fullEntry.settingId)}"
        data-setting-id="${escapeHtml(fullEntry.settingId)}"
        data-baseline-entry-id="${escapeHtml(baselineEntry.id)}"
        data-full-entry-id="${escapeHtml(fullEntry.id)}"
        data-baseline-score="${baselineEntry.score.toFixed(1)}"
        data-full-score="${fullEntry.score.toFixed(1)}"
        data-baseline-rank="${baselineRank}"
        data-full-rank="${fullRank}"
        data-delta="${delta.toFixed(1)}"
      >
        <div class="setting-row__layout">
          <button
            class="setting-row__select"
            type="button"
            data-entry-id="${escapeHtml(fullEntry.id)}"
            aria-pressed="${selected}"
            aria-describedby="${escapeHtml(compositionDescriptionId)}"
            aria-label="Select ${escapeHtml(fullEntry.family)}, ${escapeHtml(fullEntry.reasoning)} reasoning. Architecture skill ${SCORE_EDITION_LABEL} score ${formatScore(fullEntry.score)} of ${SCORE_MAXIMUM}; skill rank ${fullRank} of ${SETTING_COUNT}. Minimal baseline score ${formatScore(baselineEntry.score)} of ${SCORE_MAXIMUM}; baseline rank ${baselineRank} of ${SETTING_COUNT}. Paired uplift ${signed(delta)} points. ${escapeHtml(taskCoverageLabel)}."
          >
            <span class="setting-row__identity">
              <span class="setting-row__rank" aria-hidden="true">${String(fullRank).padStart(2, '0')}</span>
              <span class="setting-row__model">
                <strong>${escapeHtml(fullEntry.family)}</strong>
                <span>${escapeHtml(fullEntry.reasoning)}</span>
                <small>Skill rank #${String(fullRank).padStart(2, '0')} · baseline rank #${String(baselineRank).padStart(2, '0')}</small>
              </span>
            </span>
            <span class="setting-row__disclosure">${selected ? 'Selected' : 'Select'} <span aria-hidden="true">${selected ? '●' : '→'}</span></span>
          </button>
          <span class="setting-row__pair">
            ${capabilityCompositionMarkup(fullEntry, fullRank, fullEntry.id)}
            ${capabilityCompositionMarkup(baselineEntry, baselineRank, fullEntry.id)}
          </span>
          <span class="setting-row__delta${deltaClass}"><strong>${signed(delta)}</strong><span>pts</span></span>
        </div>
        <span class="visually-hidden" id="${escapeHtml(compositionDescriptionId)}">Both profiles use the ${SCORE_EDITION_LABEL} ${SCORE_MINIMUM} to ${SCORE_MAXIMUM} scale. Architecture skill profile: ${escapeHtml(fullDescription)}. Minimal baseline profile: ${escapeHtml(baselineDescription)}. Rank is secondary and condition-specific. Each colored segment opens the Engineering leaderboard.</span>
      </li>
    `;
  };

  const combinedLeaderboardMarkup = () => {
    const baselineRanking = rankedCondition(BASELINE_CONDITION_ID);
    const fullRanking = rankedCondition(TREATMENT_CONDITION_ID);
    const visible = state.showAll
      ? fullRanking.entries
      : fullRanking.entries.slice(0, INITIAL_RESULT_COUNT);
    const disclosureLabel = state.showAll
      ? `Show top ${INITIAL_RESULT_COUNT} settings ↑`
      : `Show all ${SETTING_COUNT} settings ↓`;

    return `
      <section
        class="capability-ranking capability-ranking--combined"
        id="capability-ranking"
        role="tabpanel"
        aria-labelledby="capability-mode-models"
        ${state.capabilityMode === 'models' ? '' : 'hidden'}
      >
        <section class="score-field score-field--combined" aria-labelledby="score-field-title">
          <h3 class="visually-hidden" id="score-field-title">Combined model leaderboard</h3>

          <div class="score-axis-header">
            <span class="score-axis-header__identity">Model setting / skill rank</span>
            <div class="score-axis-header__profile">
              <div class="score-axis-header__profile-title">
                <strong>${escapeHtml(SCORE_EDITION_LABEL)} score <span>Architecture skill vs Minimal baseline · ${escapeHtml(taskCoverageLabel)}</span></strong>
                <span>Overall /${SCORE_MAXIMUM}</span>
              </div>
              <div class="capability-legend" aria-label="Weighted capability categories">
                ${data.categories.map((category) => `
                  <span class="capability-legend__item capability-legend__item--${escapeHtml(category.id)}"><i aria-hidden="true"></i><span class="capability-legend__long">${escapeHtml(category.name)}</span><span class="capability-legend__short">${escapeHtml(category.short)}</span></span>
                `).join('')}
              </div>
            </div>
            <span class="score-axis-header__effect">Uplift</span>
          </div>

          <ol class="result-list" id="result-list" aria-label="Matched model and reasoning settings ordered by Architecture skill ${SCORE_EDITION_LABEL} score. Each row compares Minimal baseline and Architecture skill on one shared ${SCORE_MINIMUM}-to-${SCORE_MAXIMUM} scale; condition-specific ranks are secondary.">
            ${visible.map((entry) => settingRowMarkup(entry, baselineRanking.ranks, fullRanking.ranks)).join('')}
          </ol>
          <div class="capability-score-guide" aria-hidden="true">
            <span class="capability-score-guide__line"></span>
            <span class="capability-score-guide__readout"><strong>0.0</strong><small>/${SCORE_MAXIMUM}</small></span>
          </div>
          <button class="show-all" id="show-all" type="button" aria-expanded="${state.showAll}">${escapeHtml(disclosureLabel)}</button>
        </section>
      </section>
    `;
  };

  const capabilitySelectorMarkup = () => `
    <nav class="capability-selector" aria-label="Choose a capability">
      <header class="capability-selector__header">
        <strong>Capabilities</strong>
        <span>
          <i class="condition-mark condition-mark--full" aria-hidden="true"></i>
          <span class="capability-selector__instruction capability-selector__instruction--long">Best Architecture skill /${SCORE_MAXIMUM}</span>
          <span class="capability-selector__instruction capability-selector__instruction--short">Best /${SCORE_MAXIMUM}</span>
        </span>
      </header>
      <div class="capability-selector__tabs" role="tablist" aria-label="Capability score fields" aria-orientation="${capabilityIndexMedia.matches ? 'vertical' : 'horizontal'}">
        ${capabilityFields.map((category, categoryIndex) => {
          const winner = rankedCondition(TREATMENT_CONDITION_ID, category.id).entries[0];
          const selected = category.id === state.capabilityCategory;
          const accessibleFieldName = category.isCombined
            ? `Combined ${SCORE_EDITION_LABEL} score, equal-weighted across ${TASK_COUNT} fixed tasks.`
            : `${category.name} ${SCORE_EDITION_LABEL} score across ${TASK_COUNT} fixed tasks.`;
          return `
            <button
              class="capability-selector__tab${category.isCombined ? ' capability-selector__tab--combined' : ''}${selected ? ' is-selected' : ''}"
              id="capability-category-${escapeHtml(category.id)}"
              type="button"
              role="tab"
              data-category-id="${escapeHtml(category.id)}"
              data-winner-entry-id="${escapeHtml(winner.id)}"
              data-winner-score="${scoreFor(winner, category.id).toFixed(1)}"
              data-winner-condition="skill"
              aria-selected="${selected}"
              aria-controls="capability-field-panel"
              tabindex="${selected ? '0' : '-1'}"
              style="--category-color:${category.color}"
              aria-label="${escapeHtml(accessibleFieldName)} Best Architecture skill result: ${escapeHtml(winner.family)}, ${escapeHtml(winner.reasoning)} reasoning, ${formatScore(scoreFor(winner, category.id))} of ${SCORE_MAXIMUM}."
            >
              <span class="capability-selector__index" aria-hidden="true">${category.isCombined ? '00' : String(categoryIndex).padStart(2, '0')}</span>
              <span class="capability-selector__name">
                <span class="capability-selector__long">${escapeHtml(category.name)}</span>
                <span class="capability-selector__short">${escapeHtml(capabilityMobileLabel[category.id])}</span>
              </span>
              <span class="capability-selector__state">${selected ? 'Selected' : ''}</span>
              <strong>${formatScore(scoreFor(winner, category.id))}<small>/${SCORE_MAXIMUM}</small></strong>
            </button>
          `;
        }).join('')}
      </div>
    </nav>
  `;

  const capabilityRankRowMarkup = (fullEntry, baselineRanking, fullRanking, category) => {
    const baselineEntry = baselineBySetting.get(fullEntry.settingId);
    const baselineScore = scoreFor(baselineEntry, category.id);
    const fullScore = scoreFor(fullEntry, category.id);
    const baselineRank = baselineRanking.ranks.get(baselineEntry.id);
    const fullRank = fullRanking.ranks.get(fullEntry.id);
    const delta = Math.round((fullScore - baselineScore) * 10) / 10;
    const start = Math.min(baselineScore, fullScore);
    const connectorWidth = Math.max(Math.abs(fullScore - baselineScore), 0.25);
    const selected = selectedEntry().settingId === fullEntry.settingId;
    return `
      <li
        class="capability-rank-row${selected ? ' is-selected' : ''}${delta < 0 ? ' is-regression' : ''}"
        data-setting-id="${escapeHtml(fullEntry.settingId)}"
        data-baseline-entry-id="${escapeHtml(baselineEntry.id)}"
        data-full-entry-id="${escapeHtml(fullEntry.id)}"
        data-baseline-score="${baselineScore.toFixed(1)}"
        data-full-score="${fullScore.toFixed(1)}"
        data-baseline-rank="${baselineRank}"
        data-full-rank="${fullRank}"
        data-delta="${delta.toFixed(1)}"
        style="--category-color:${category.color};--baseline-score:${baselineScore}%;--full-score:${fullScore}%;--connector-start:${start}%;--connector-width:${connectorWidth}%"
      >
        <button
          class="capability-rank-row__select"
          type="button"
          data-entry-id="${escapeHtml(fullEntry.id)}"
          aria-pressed="${selected}"
          aria-label="Select ${escapeHtml(fullEntry.family)}, ${escapeHtml(fullEntry.reasoning)} reasoning. ${escapeHtml(category.name)} Architecture skill ${SCORE_EDITION_LABEL} score ${formatScore(fullScore)} of ${SCORE_MAXIMUM}, skill rank ${fullRank} of ${SETTING_COUNT}; Minimal baseline score ${formatScore(baselineScore)} of ${SCORE_MAXIMUM}, baseline rank ${baselineRank} of ${SETTING_COUNT}; paired uplift ${signed(delta)} points. Rank is secondary and condition-specific."
        >
          <span class="capability-rank-row__identity">
            <span class="capability-rank-row__position">#${String(fullRank).padStart(2, '0')}</span>
            <span class="capability-rank-row__model">
              <strong>${escapeHtml(fullEntry.family)}</strong>
              <small>${escapeHtml(fullEntry.reasoning)}</small>
            </span>
          </span>
          <span
            class="capability-rank-row__track"
            role="img"
            aria-label="Minimal baseline circle at ${formatScore(baselineScore)}. Architecture skill square at ${formatScore(fullScore)}."
          >
            <span class="capability-rank-row__axis" aria-hidden="true"></span>
            <span class="capability-rank-row__connector" aria-hidden="true"></span>
            <span class="capability-rank-row__marker capability-rank-row__marker--baseline" aria-hidden="true"></span>
            <span class="capability-rank-row__marker capability-rank-row__marker--full" aria-hidden="true"></span>
          </span>
          <span class="capability-rank-row__reading capability-rank-row__reading--baseline">
            <span class="capability-rank-row__condition-label"><i aria-hidden="true"></i><span>Baseline</span></span>
            <strong>${formatScore(baselineScore)}</strong>
            <small>#${baselineRank}</small>
          </span>
          <span class="capability-rank-row__reading capability-rank-row__reading--full">
            <span class="capability-rank-row__condition-label"><i aria-hidden="true"></i><span>Skill</span></span>
            <strong>${formatScore(fullScore)}</strong>
            <small>#${fullRank}</small>
          </span>
          <strong class="capability-rank-row__delta">${signed(delta)}<small>pts</small></strong>
        </button>
      </li>
    `;
  };

  const animateCapabilityHandoff = (skipMotion = false) => {
    if (skipMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = elements.capabilityView.querySelector('.capability-browser__canvas');
    const activePanel = canvas?.querySelector('.capability-ranking:not([hidden]), .benchmark-ledger:not([hidden]), .capability-efficiency:not([hidden])');
    const target = activePanel || canvas;
    if (!target) return;
    target.animate(
      [
        { opacity: 0.58, transform: 'translateY(0.25rem)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      {
        duration: 180,
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
      }
    );
  };

  const combinedScoreGuideGeometry = (scoreField) => {
    const track = scoreField?.querySelector('.capability-composition__track');
    const resultList = scoreField?.querySelector('.result-list');
    if (!track || !resultList) return null;

    const scoreFieldBox = scoreField.getBoundingClientRect();
    const trackBox = track.getBoundingClientRect();
    const resultListBox = resultList.getBoundingClientRect();
    const scoreFieldStyle = getComputedStyle(scoreField);
    const trackStyle = getComputedStyle(track);
    const borderTop = Number.parseFloat(scoreFieldStyle.borderTopWidth) || 0;
    const borderLeft = Number.parseFloat(trackStyle.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(trackStyle.borderRightWidth) || 0;
    const contentLeft = trackBox.left + borderLeft;
    const contentRight = trackBox.right - borderRight;
    const contentWidth = contentRight - contentLeft;

    if (contentWidth <= 0 || resultListBox.height <= 0) return null;
    return {
      scoreFieldBox,
      contentLeft,
      contentRight,
      contentWidth,
      resultListTop: resultListBox.top,
      resultListBottom: resultListBox.bottom,
      guideTop: resultListBox.top - scoreFieldBox.top - borderTop,
      guideHeight: resultListBox.height
    };
  };

  const clearCombinedScoreGuide = (scoreField) => {
    const guide = scoreField?.querySelector('.capability-score-guide');
    if (!guide) return;
    guide.classList.remove('is-visible');
    delete guide.dataset.score;
    delete guide.dataset.source;
  };

  const positionCombinedScoreGuide = (scoreField, score, source, geometry = combinedScoreGuideGeometry(scoreField)) => {
    const guide = scoreField?.querySelector('.capability-score-guide');
    const readout = guide?.querySelector('.capability-score-guide__readout strong');
    if (!guide || !readout || !geometry || !combinedScoreGuideMedia.matches) {
      clearCombinedScoreGuide(scoreField);
      return;
    }

    const pixelScale = COMPOSITE_SCORE_SCALE.copy().range([
      geometry.contentLeft - geometry.scoreFieldBox.left,
      geometry.contentRight - geometry.scoreFieldBox.left
    ]);
    const boundedScore = COMPOSITE_SCORE_SCALE.invert(COMPOSITE_SCORE_SCALE(score));
    const scoreRatio = COMPOSITE_SCORE_SCALE(boundedScore) / 100;
    const labelShift = scoreRatio < 0.075 ? '0%' : scoreRatio > 0.925 ? '-100%' : '-50%';

    guide.style.setProperty('--score-guide-x', `${pixelScale(boundedScore).toFixed(3)}px`);
    guide.style.setProperty('--score-guide-y', `${geometry.guideTop.toFixed(3)}px`);
    guide.style.setProperty('--score-guide-height', `${geometry.guideHeight.toFixed(3)}px`);
    guide.style.setProperty('--score-guide-label-shift', labelShift);
    guide.dataset.score = boundedScore.toFixed(3);
    guide.dataset.source = source;
    readout.textContent = formatScore(boundedScore);
    guide.classList.add('is-visible');
  };

  const focusedCompositionScore = (scoreField) => {
    const segment = scoreField?.querySelector('.capability-composition__segment:focus');
    if (!segment) return null;
    const segments = [...segment.closest('.capability-composition__stack').querySelectorAll('.capability-composition__segment')];
    const focusedIndex = segments.indexOf(segment);
    if (focusedIndex < 0) return null;
    return segments.slice(0, focusedIndex + 1).reduce((sum, candidate) => (
      sum + (Number(candidate.dataset.contribution) || 0)
    ), 0);
  };

  const bindCombinedScoreGuide = () => {
    const scoreField = elements.capabilityView.querySelector('.score-field--combined');
    if (!scoreField) return;

    let pointerFrame = 0;
    let latestPointer = null;
    const restoreFocusOrClear = () => {
      const focusScore = focusedCompositionScore(scoreField);
      if (focusScore === null) clearCombinedScoreGuide(scoreField);
      else positionCombinedScoreGuide(scoreField, focusScore, 'focus');
    };

    scoreField.addEventListener('pointermove', (event) => {
      if (!combinedScoreGuideMedia.matches || !['mouse', 'pen'].includes(event.pointerType)) {
        restoreFocusOrClear();
        return;
      }
      latestPointer = { clientX: event.clientX, clientY: event.clientY };
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        const geometry = combinedScoreGuideGeometry(scoreField);
        if (
          !geometry ||
          latestPointer.clientX < geometry.contentLeft ||
          latestPointer.clientX > geometry.contentRight ||
          latestPointer.clientY < geometry.scoreFieldBox.top ||
          latestPointer.clientY > geometry.resultListBottom
        ) {
          restoreFocusOrClear();
          return;
        }
        const pixelScale = COMPOSITE_SCORE_SCALE.copy().range([geometry.contentLeft, geometry.contentRight]);
        positionCombinedScoreGuide(scoreField, pixelScale.invert(latestPointer.clientX), 'pointer', geometry);
      });
    });

    scoreField.addEventListener('pointerleave', () => {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      latestPointer = null;
      restoreFocusOrClear();
    });

    scoreField.addEventListener('focusin', (event) => {
      const segment = event.target.closest('.capability-composition__segment');
      if (!segment) return;
      const focusScore = focusedCompositionScore(scoreField);
      if (focusScore !== null) positionCombinedScoreGuide(scoreField, focusScore, 'focus');
    });

    scoreField.addEventListener('focusout', (event) => {
      if (event.relatedTarget?.closest?.('.capability-composition__segment')) return;
      clearCombinedScoreGuide(scoreField);
    });
  };

  const renderCapabilities = ({ animate = false, skipMotion = false } = {}) => {
    const category = categoryById.get(state.capabilityCategory) || COMBINED_CAPABILITY;
    state.capabilityCategory = category.id;
    const baselineRanking = rankedCondition(BASELINE_CONDITION_ID, category.id);
    const fullRanking = rankedCondition(TREATMENT_CONDITION_ID, category.id);

    const rankingContent = category.isCombined ? combinedLeaderboardMarkup() : `
        <section
          class="capability-ranking"
          id="capability-ranking"
          role="tabpanel"
          aria-labelledby="capability-mode-models"
          ${state.capabilityMode === 'models' ? '' : 'hidden'}
        >
          <h4 class="visually-hidden">${escapeHtml(category.name)} model leaderboard</h4>
          <div class="capability-ranking__axis" aria-hidden="true">
            <span>Model / skill rank</span>
            <span class="capability-ranking__ticks">
              <span class="capability-ranking__scale-label">Rubric / ${SCORE_MAXIMUM}</span>
              <span class="capability-ranking__scale-values"><i>0</i><i>25</i><i>50</i><i>75</i><i>100</i></span>
            </span>
            <span class="capability-ranking__condition-heading"><i class="capability-key__baseline"></i>Minimal baseline</span>
            <span class="capability-ranking__condition-heading"><i class="capability-key__full"></i>Architecture skill</span>
            <span>Uplift</span>
          </div>
          <ol class="capability-ranking__rows" aria-label="${escapeHtml(category.name)} settings ordered by Architecture skill ${SCORE_EDITION_LABEL} score. Ranks are secondary and condition-specific.">
            ${fullRanking.entries.map((entry) => capabilityRankRowMarkup(entry, baselineRanking, fullRanking, category)).join('')}
          </ol>
        </section>
      `;
    const benchmarkContent = benchmarkLedgerMarkup(category, state.capabilityMode !== 'benchmarks');

    elements.capabilityView.innerHTML = `
      <section class="capability-browser" style="--category-color:${category.color}">
        <aside class="capability-browser__index">
          ${capabilitySelectorMarkup()}
        </aside>
        <div
          class="capability-browser__canvas"
          id="capability-field-panel"
          role="tabpanel"
          aria-labelledby="capability-category-${escapeHtml(category.id)}"
        >
          ${capabilityModeMarkup(category)}
          ${rankingContent}
          ${benchmarkContent}
          ${efficiencyPanelMarkup()}
        </div>
      </section>
    `;

    bindCombinedScoreGuide();
    if (state.capabilityMode === 'efficiency') renderEfficiency();

    window.requestAnimationFrame(() => {
      if (animate) animateCapabilityHandoff(skipMotion);
      const tabList = elements.capabilityView.querySelector('.capability-selector__tabs');
      const selectedTab = tabList?.querySelector('.capability-selector__tab[aria-selected="true"]');
      if (!tabList || !selectedTab || tabList.scrollWidth <= tabList.clientWidth) return;
      const centeredLeft = selectedTab.offsetLeft - ((tabList.clientWidth - selectedTab.offsetWidth) / 2);
      const maximumLeft = tabList.scrollWidth - tabList.clientWidth;
      tabList.scrollTo({ left: Math.max(0, Math.min(maximumLeft, centeredLeft)), behavior: 'auto' });
    });
  };

  const updateCapabilityMode = ({ animate = false, skipMotion = false } = {}) => {
    const category = categoryById.get(state.capabilityCategory) || COMBINED_CAPABILITY;
    const header = elements.capabilityView.querySelector('.capability-canvas__header');
    if (header) header.outerHTML = capabilityHeaderMarkup(category);

    elements.capabilityView.querySelectorAll('.capability-mode__tab[data-capability-mode]').forEach((tab) => {
      const selected = tab.dataset.capabilityMode === state.capabilityMode;
      tab.classList.toggle('is-selected', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    const rankingPanel = elements.capabilityView.querySelector('#capability-ranking');
    const benchmarkPanel = elements.capabilityView.querySelector('#capability-benchmarks');
    const efficiencyPanel = elements.capabilityView.querySelector('#capability-efficiency');
    if (rankingPanel) rankingPanel.hidden = state.capabilityMode !== 'models';
    if (benchmarkPanel) benchmarkPanel.hidden = state.capabilityMode !== 'benchmarks';
    if (efficiencyPanel) efficiencyPanel.hidden = state.capabilityMode !== 'efficiency';
    if (state.capabilityMode === 'efficiency') renderEfficiency();
    if (animate) window.requestAnimationFrame(() => animateCapabilityHandoff(skipMotion));
  };

  const syncCapabilityIndexOrientation = () => {
    const tabList = elements.capabilityView.querySelector('.capability-selector__tabs[role="tablist"]');
    if (tabList) tabList.setAttribute('aria-orientation', capabilityIndexMedia.matches ? 'vertical' : 'horizontal');
  };

  const resourceDeltaPercent = (entry, metric = state.metric) => {
    const baseline = baselineBySetting.get(entry.settingId);
    const baselineValue = Number(baseline?.[metric]);
    const value = Number(entry[metric]);
    if (!Number.isFinite(baselineValue) || baselineValue <= 0 || !Number.isFinite(value) || value <= 0) return 0;
    return Math.round(((value / baselineValue) - 1) * 100);
  };

  const annotationDockClass = (entry, field = state.capabilityCategory, metric = state.metric) => {
    const { x } = plotCoordinates(entry, field, metric);
    return x > 50 ? 'is-docked-top-left' : 'is-docked-bottom-right';
  };

  const plotInspectionMarkup = (entry, ranks, frontierIds) => {
    const field = state.capabilityCategory;
    const metric = metricConfig[state.metric];
    const delta = deltaFor(entry, field);
    const resourceDelta = resourceDeltaPercent(entry);
    const reference = entry.condition === BASELINE_CONDITION_ID
      ? 'Minimal reference'
      : `${signed(delta)} rubric points · ${resourceDelta > 0 ? '+' : resourceDelta < 0 ? '−' : '±'}${Math.abs(resourceDelta)}% ${metric.label.toLowerCase()}`;
    const rankLabel = `${conditionById.get(entry.condition).short} rank #${ranks.get(entry.id)} of ${SETTING_COUNT}`;
    return `
      <span class="efficiency-plane__annotation-meta">
        ${conditionMarkup(entry.condition, true)}
        <span>${frontierIds.has(entry.id) ? 'On frontier' : 'Off frontier'}</span>
      </span>
      <strong>${escapeHtml(entry.family)} · ${escapeHtml(entry.reasoning)}</strong>
      <span class="efficiency-plane__annotation-values">
        <b>${formatScore(scoreFor(entry, field))}</b>
        <i aria-hidden="true">×</i>
        <b>${escapeHtml(metric.format(entry[state.metric]))}</b>
      </span>
      <small>${escapeHtml(rankLabel)} · ${escapeHtml(reference)}</small>
    `;
  };

  const efficiencyDecision = (entry, frontier, field, metricKey) => {
    const metric = metricConfig[metricKey];
    const frontierIds = new Set(frontier.map((candidate) => candidate.id));
    const score = scoreFor(entry, field);
    const baseline = baselineBySetting.get(entry.settingId);
    const baselineScore = scoreFor(baseline, field);
    const scoreDelta = Math.round((score - baselineScore) * 10) / 10;
    const resourceDelta = resourceDeltaPercent(entry, metricKey);
    const bestScore = Math.max(...data.entries.map((candidate) => scoreFor(candidate, field)));
    const highestScore = Math.abs(score - bestScore) < 0.05;
    const isFrontier = frontierIds.has(entry.id);
    const dominators = data.entries.filter((candidate) => (
      candidate.id !== entry.id &&
      scoreFor(candidate, field) >= score &&
      candidate[metricKey] <= entry[metricKey] &&
      (scoreFor(candidate, field) > score || candidate[metricKey] < entry[metricKey])
    ));
    const cheaperFrontier = [...frontier]
      .filter((candidate) => candidate[metricKey] < entry[metricKey])
      .sort((left, right) => right[metricKey] - left[metricKey])[0];
    const betterTradeoff = [...dominators]
      .sort((left, right) => (
        left[metricKey] - right[metricKey] ||
        scoreFor(right, field) - scoreFor(left, field)
      ))[0];

    let finding = 'Trade-off check';
    if (highestScore) finding = 'Highest rubric score';
    else if (isFrontier) finding = 'On the frontier';

    const treatmentSentence = entry.condition === BASELINE_CONDITION_ID
      ? 'Minimal baseline is the matched reference for this model setting.'
      : `Architecture skill changes the ${SCORE_EDITION_LABEL} score by ${signed(scoreDelta)} points for ${resourceDelta > 0 ? '+' : resourceDelta < 0 ? '−' : '±'}${Math.abs(resourceDelta)}% ${metric.label.toLowerCase()} versus Minimal baseline.`;

    let tradeoffSentence = `No result has both a higher ${SCORE_EDITION_LABEL} score and lower resource use.`;
    if (!isFrontier) {
      tradeoffSentence = `${dominators.length} result${dominators.length === 1 ? '' : 's'} reach at least this rubric score for less ${metric.label.toLowerCase()}.`;
    } else if (cheaperFrontier) {
      const savings = Math.round((1 - (cheaperFrontier[metricKey] / entry[metricKey])) * 100);
      const scoreLoss = Math.round((score - scoreFor(cheaperFrontier, field)) * 10) / 10;
      tradeoffSentence = `${escapeHtml(cheaperFrontier.family)} · ${escapeHtml(cheaperFrontier.reasoning)} saves ${savings}% for ${scoreLoss.toFixed(1)} rubric points less.`;
    }

    return {
      finding,
      highestScore,
      isFrontier,
      frontierIds,
      scoreDelta,
      resourceDelta,
      comparison: isFrontier ? cheaperFrontier : betterTradeoff,
      comparisonLabel: isFrontier ? 'Next cheaper frontier' : 'Better measured trade-off',
      treatmentSentence,
      tradeoffSentence
    };
  };

  const efficiencyTrajectoryMarkup = (entry, field, metricKey, ranks, frontierIds) => matchedEntries(entry).map((candidate, index) => {
    const selected = candidate.id === entry.id;
    const condition = conditionById.get(candidate.condition);
    return `
      <button
        class="matched-triplet__option matched-triplet__option--${escapeHtml(conditionVisualClass(candidate.condition))}${selected ? ' is-selected' : ''}"
        type="button"
        data-entry-id="${escapeHtml(candidate.id)}"
        aria-pressed="${selected}"
        aria-label="Select matched ${escapeHtml(condition.label)}, ${fieldConfig[field].label} ${SCORE_EDITION_LABEL} score ${formatScore(scoreFor(candidate, field))} of ${SCORE_MAXIMUM}, ${metricConfig[metricKey].spoken(candidate[metricKey])}, ${escapeHtml(condition.label)} rank ${ranks.get(candidate.id)} of ${SETTING_COUNT}${frontierIds.has(candidate.id) ? ', on the efficient frontier' : ''}"
      >
        <span class="efficiency-summary__step">${String(index + 1).padStart(2, '0')}</span>
        ${conditionMarkup(candidate.condition, true)}
        <strong>${formatScore(scoreFor(candidate, field))}</strong>
        <span class="efficiency-summary__resource">${escapeHtml(metricConfig[metricKey].format(candidate[metricKey]))}</span>
        <small>#${String(ranks.get(candidate.id)).padStart(2, '0')}${frontierIds.has(candidate.id) ? ' · frontier' : ''}</small>
      </button>
    `;
  }).join('');

  const plotPointMarkup = (entry, selected, ranks, frontierIds) => {
    const field = state.capabilityCategory;
    const metric = metricConfig[state.metric];
    const { x, y } = plotCoordinates(entry, field, state.metric);
    const isSelected = entry.id === selected.id;
    const counterpart = entry.settingId === selected.settingId && !isSelected;
    const isFrontier = frontierIds.has(entry.id);
    const classes = [
      'plot-point',
      `plot-point--${conditionVisualClass(entry.condition)}`,
      isFrontier ? 'is-frontier' : '',
      isSelected ? 'is-selected' : '',
      counterpart ? 'is-counterpart' : '',
      !isSelected && !counterpart && !isFrontier ? 'is-muted' : ''
    ].filter(Boolean).join(' ');

    return `
      <button
        class="${classes}"
        type="button"
        data-plot-point
        data-entry-id="${escapeHtml(entry.id)}"
        data-frontier="${isFrontier}"
        data-score="${scoreFor(entry, field).toFixed(1)}"
        data-resource="${entry[state.metric]}"
        data-plot-x="${x.toFixed(3)}"
        data-plot-y="${y.toFixed(3)}"
        style="left:${x.toFixed(3)}%;top:${y.toFixed(3)}%"
        tabindex="${isSelected ? '0' : '-1'}"
        aria-pressed="${isSelected}"
        aria-label="Select ${escapeHtml(entry.family)}, ${escapeHtml(entry.reasoning)} reasoning, ${escapeHtml(conditionById.get(entry.condition).label)}, ${fieldConfig[field].label} ${SCORE_EDITION_LABEL} score ${formatScore(scoreFor(entry, field))} of ${SCORE_MAXIMUM}, condition rank ${ranks.get(entry.id)} of ${SETTING_COUNT}, ${metric.spoken(entry[state.metric])}${isFrontier ? ', on the efficient frontier' : ''}"
      ></button>
    `;
  };

  const plotMarkup = (entry, ranks, frontier, decision) => {
    const metric = metricConfig[state.metric];
    const field = state.capabilityCategory;
    const current = plotCoordinates(entry, field, state.metric);
    const trajectory = matchedEntries(entry);
    const trajectoryPoints = trajectory.map((candidate) => {
      const { x, y } = plotCoordinates(candidate, field, state.metric);
      return `${x.toFixed(3)},${y.toFixed(3)}`;
    }).join(' ');
    const frontierPoints = frontier.map((candidate) => {
      const { x, y } = plotCoordinates(candidate, field, state.metric);
      return `${x.toFixed(3)},${y.toFixed(3)}`;
    }).join(' ');
    const frontierAnchor = frontier[Math.min(frontier.length - 1, Math.max(0, Math.floor(frontier.length * 0.42)))] || entry;
    const frontierAnchorPosition = plotCoordinates(frontierAnchor, field, state.metric);
    const xTicks = metric.ticks.map((tick) => (
      `<span style="left:${resourcePosition(tick).toFixed(3)}%">${escapeHtml(metric.format(tick))}</span>`
    )).join('');
    const yTickValues = [0, 25, 50, 75, 100];
    const yTicks = yTickValues.map((tick) => (
      `<span style="top:${(100 - normalizedQuality(tick)).toFixed(3)}%">${tick}</span>`
    )).join('');
    const xLines = metric.ticks.map((tick) => {
      const position = resourcePosition(tick).toFixed(3);
      return `<line class="efficiency-plane__grid-line efficiency-plane__grid-line--x" x1="${position}" y1="0" x2="${position}" y2="100"></line>`;
    }).join('');
    const yLines = yTickValues.map((tick) => {
      const position = (100 - normalizedQuality(tick)).toFixed(3);
      return `<line class="efficiency-plane__grid-line efficiency-plane__grid-line--y" x1="0" y1="${position}" x2="100" y2="${position}"></line>`;
    }).join('');
    const frontierIds = frontier.map((candidate) => candidate.id);

    return `
      <div class="efficiency-plane__plot" data-frontier-ids="${escapeHtml(frontierIds.join(','))}">
        <span class="efficiency-plane__axis-label efficiency-plane__axis-label--y">Higher rubric score ↑ · ${escapeHtml(fieldConfig[field].label)} / ${SCORE_MAXIMUM} · fixed ${SCORE_MINIMUM}–${SCORE_MAXIMUM}</span>
        <div
          class="efficiency-plane__canvas"
          data-selected-id="${escapeHtml(entry.id)}"
          aria-describedby="efficiency-plot-description"
        >
          <svg class="efficiency-plane__grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <g class="efficiency-plane__grid-lines">${yLines}${xLines}</g>
            <line class="efficiency-plane__selection-guide efficiency-plane__selection-guide--x" x1="0" y1="${current.y.toFixed(3)}" x2="${current.x.toFixed(3)}" y2="${current.y.toFixed(3)}"></line>
            <line class="efficiency-plane__selection-guide efficiency-plane__selection-guide--y" x1="${current.x.toFixed(3)}" y1="${current.y.toFixed(3)}" x2="${current.x.toFixed(3)}" y2="100"></line>
            <polyline
              class="efficiency-plane__frontier"
              data-frontier-ids="${escapeHtml(frontierIds.join(','))}"
              points="${frontierPoints}"
            ></polyline>
            <polyline
              class="efficiency-plane__trajectory"
              data-setting-id="${escapeHtml(entry.settingId)}"
              data-entry-ids="${escapeHtml(trajectory.map((candidate) => candidate.id).join(','))}"
              points="${trajectoryPoints}"
            ></polyline>
          </svg>
          <span class="efficiency-plane__direction" aria-hidden="true">Better trade-offs move ↖</span>
          <span
            class="efficiency-plane__frontier-label"
            style="--label-x:${frontierAnchorPosition.x.toFixed(3)}%;--label-y:${frontierAnchorPosition.y.toFixed(3)}%"
            aria-hidden="true"
          >Efficient frontier</span>
          <div class="efficiency-plane__points" role="group" aria-label="${ENTRY_COUNT} model, reasoning, and condition results">
            ${data.entries.map((candidate) => plotPointMarkup(candidate, entry, ranks, decision.frontierIds)).join('')}
          </div>
          <div class="efficiency-plane__pointer-layer" aria-hidden="true"></div>
          <div
            class="efficiency-plane__annotation ${annotationDockClass(entry)}"
            style="--inspection-x:${current.x.toFixed(3)}%;--inspection-y:${current.y.toFixed(3)}%"
            data-entry-id="${escapeHtml(entry.id)}"
            data-frontier="${decision.isFrontier}"
            aria-hidden="true"
          >${plotInspectionMarkup(entry, ranks, decision.frontierIds)}</div>
          <div class="efficiency-plane__tooltip" id="efficiency-plot-tooltip" role="tooltip" hidden></div>
          <div class="efficiency-plane__y-ticks" aria-hidden="true">${yTicks}</div>
          <div class="efficiency-plane__x-ticks" aria-hidden="true">${xTicks}</div>
        </div>
        <span class="efficiency-plane__axis-label efficiency-plane__axis-label--x">${escapeHtml(metric.axis)}</span>
      </div>
      <p class="efficiency-plane__reading" id="efficiency-plot-description">Each point is one matched result under Minimal baseline or Architecture skill. The line connects results that no other configuration beats on both ${escapeHtml(fieldConfig[field].label)} ${SCORE_EDITION_LABEL} score and ${escapeHtml(metric.label.toLowerCase())}. ${escapeHtml(metric.note)} · ${SCORE_EDITION_LABEL} ${SCORE_MINIMUM}–${SCORE_MAXIMUM} scale · ${escapeHtml(taskCoverageLabel)}.</p>
    `;
  };

  const efficientFrontier = (field, metric) => data.entries
    .filter((entry) => Number.isFinite(Number(entry[metric])) && Number(entry[metric]) > 0)
    .filter((entry) => !data.entries.some((other) => (
      scoreFor(other, field) >= scoreFor(entry, field) &&
      other[metric] <= entry[metric] &&
      (scoreFor(other, field) > scoreFor(entry, field) || other[metric] < entry[metric])
    )))
    .sort((left, right) => left[metric] - right[metric]);

  const sampleFrontier = (frontier, maximum = 8, selectedId = null) => {
    if (frontier.length <= maximum) return frontier;
    const sampled = Array.from({ length: maximum }, (_, index) => (
      frontier[Math.round((index / (maximum - 1)) * (frontier.length - 1))]
    ));
    const selectedIndex = selectedId ? frontier.findIndex((entry) => entry.id === selectedId) : -1;
    if (selectedIndex >= 0 && !sampled.some((entry) => entry.id === selectedId)) {
      const replacementIndex = Math.max(1, Math.min(maximum - 2, Math.round((selectedIndex / (frontier.length - 1)) * (maximum - 1))));
      sampled[replacementIndex] = frontier[selectedIndex];
      sampled.sort((left, right) => left[state.metric] - right[state.metric]);
    }
    return sampled;
  };

  const renderEfficiency = () => {
    const entrySelect = elements.capabilityView.querySelector('#efficiency-entry');
    const resourceAxis = elements.capabilityView.querySelector('#resource-axis');
    const efficiencyView = elements.capabilityView.querySelector('#efficiency-view');
    if (!entrySelect || !resourceAxis || !efficiencyView) return;

    const entry = selectedEntry();
    const field = state.capabilityCategory;
    const ranking = rankedField(field);
    const frontier = efficientFrontier(field, state.metric);
    const decision = efficiencyDecision(entry, frontier, field, state.metric);
    const sampled = sampleFrontier(frontier, 8, entry.id);
    const metric = metricConfig[state.metric];
    const comparison = decision.comparison;
    const comparisonSaving = comparison
      ? Math.round((1 - (comparison[state.metric] / entry[state.metric])) * 100)
      : 0;
    const comparisonQualityDifference = comparison
      ? Math.round((scoreFor(entry, field) - scoreFor(comparison, field)) * 10) / 10
      : 0;

    entrySelect.innerHTML = ranking.entries.map((candidate) => `
      <option value="${escapeHtml(candidate.id)}">#${ranking.ranks.get(candidate.id)} · ${escapeHtml(candidate.family)} · ${escapeHtml(candidate.reasoning)} · ${escapeHtml(conditionById.get(candidate.condition).short)}</option>
    `).join('');
    entrySelect.value = entry.id;
    resourceAxis.value = state.metric;

    efficiencyView.innerHTML = `
      <div class="efficiency-story">
        <section class="efficiency-field" aria-labelledby="efficiency-field-title">
          <header class="efficiency-field__heading">
            <div>
              <p class="ui-eyebrow">${SCORE_EDITION_LABEL} score × ${escapeHtml(metric.label)} · ${ENTRY_COUNT} matched results</p>
              <h4 id="efficiency-field-title">${escapeHtml(fieldConfig[field].label)}: ${escapeHtml(decision.finding)} <strong>${formatScore(scoreFor(entry, field))}</strong> at <strong>${escapeHtml(metric.format(entry[state.metric]))}</strong></h4>
              <p>${escapeHtml(decision.treatmentSentence)} ${decision.tradeoffSentence}</p>
            </div>
            <div class="efficiency-legend" aria-label="Chart legend">
              ${data.conditions.map((condition) => `
                <span>${conditionMarkup(condition.id, true)}</span>
              `).join('')}
              <span class="efficiency-legend__frontier"><i aria-hidden="true"></i>Efficient frontier</span>
            </div>
          </header>
          <div class="efficiency-plane">${plotMarkup(entry, ranking.ranks, frontier, decision)}</div>
        </section>

        <aside class="efficiency-summary" aria-labelledby="efficiency-selected-title">
          <header class="selected-result-heading">
            <div>
              <p class="ui-eyebrow">Selected configuration</p>
              <h4 id="efficiency-selected-title">${escapeHtml(entry.family)} · ${escapeHtml(entry.reasoning)}</h4>
              <span class="efficiency-summary__status${decision.isFrontier ? ' is-frontier' : ''}">${decision.isFrontier ? 'On the frontier' : 'Dominated trade-off'}</span>
            </div>
            <span class="efficiency-summary__score">
              <small>${escapeHtml(conditionById.get(entry.condition).short)} rank #${ranking.ranks.get(entry.id)}</small>
              <strong>${formatScore(scoreFor(entry, field))}</strong>
              <small>${escapeHtml(fieldConfig[field].short)}</small>
            </span>
          </header>
          <div class="matched-triplet efficiency-summary__trajectory" aria-label="Matched Minimal baseline and Architecture skill results">
            ${efficiencyTrajectoryMarkup(entry, field, state.metric, ranking.ranks, decision.frontierIds)}
          </div>
          <dl class="efficiency-summary__resources">
            ${Object.entries(metricConfig).map(([key, resourceMetric]) => `
              <div class="${state.metric === key ? 'is-axis' : ''}">
                <dt>${escapeHtml(resourceMetric.label)}</dt>
                <dd>${escapeHtml(resourceMetric.format(entry[key]))}</dd>
                <span>${escapeHtml(resourceComparison(entry, key))}</span>
              </div>
            `).join('')}
          </dl>
          ${comparison ? `
            <button
              class="efficiency-summary__alternative"
              type="button"
              data-entry-id="${escapeHtml(comparison.id)}"
              aria-label="Select ${escapeHtml(decision.comparisonLabel)}, ${escapeHtml(comparison.family)}, ${escapeHtml(comparison.reasoning)} reasoning, ${escapeHtml(conditionById.get(comparison.condition).label)}, score ${formatScore(scoreFor(comparison, field))}, ${metric.spoken(comparison[state.metric])}"
            >
              <span class="ui-eyebrow">${escapeHtml(decision.comparisonLabel)}</span>
              <span class="efficiency-summary__alternative-identity">
                <strong>${escapeHtml(comparison.family)} · ${escapeHtml(comparison.reasoning)}</strong>
                ${conditionMarkup(comparison.condition, true)}
              </span>
              <span class="efficiency-summary__alternative-values">
                <b>${formatScore(scoreFor(comparison, field))}</b><small>rubric /${SCORE_MAXIMUM}</small>
                <b>${escapeHtml(metric.format(comparison[state.metric]))}</b><small>${escapeHtml(metric.label)}</small>
              </span>
              <span>${comparisonSaving > 0 ? `Save ${comparisonSaving}% for ${comparisonQualityDifference.toFixed(1)} points less` : `Gain ${Math.abs(comparisonQualityDifference).toFixed(1)} points for no more ${escapeHtml(metric.label.toLowerCase())}`}</span>
            </button>
          ` : ''}
        </aside>

        <section class="frontier-list" aria-labelledby="frontier-list-title">
          <header class="frontier-list__heading">
            <div>
              <p class="ui-eyebrow">Trade-off anchors</p>
              <h4 id="frontier-list-title">Frontier options</h4>
              <p>No listed result has both a higher fixed rubric score and lower ${escapeHtml(metric.label.toLowerCase())}.</p>
            </div>
            <span>${sampled.length} anchors · ${frontier.length} frontier results</span>
          </header>
          <div class="frontier-list__columns" aria-hidden="true">
            ${[0, 1].map(() => `
              <span class="frontier-list__column-set"><span>Configuration</span><span>Rubric /${SCORE_MAXIMUM}</span><span>${escapeHtml(metric.label)}</span></span>
            `).join('')}
          </div>
          <div class="frontier-list__rows">
          ${sampled.map((candidate) => {
            const selected = candidate.id === entry.id;
            return `
              <button
                class="frontier-row${selected ? ' is-selected' : ''}"
                type="button"
                data-entry-id="${escapeHtml(candidate.id)}"
                data-score="${scoreFor(candidate, field).toFixed(1)}"
                data-resource="${candidate[state.metric]}"
                aria-pressed="${selected}"
              >
                <span class="frontier-row__rank">#${ranking.ranks.get(candidate.id)}</span>
                <span class="frontier-row__identity">
                  <strong>${escapeHtml(candidate.family)}</strong>
                  <small>${escapeHtml(candidate.reasoning)} · ${escapeHtml(conditionById.get(candidate.condition).short)}</small>
                </span>
                <span class="frontier-row__condition">${conditionMarkup(candidate.condition, true)}</span>
                <strong class="frontier-row__score">${formatScore(scoreFor(candidate, field))}</strong>
                <strong class="frontier-row__resource">${escapeHtml(metric.format(candidate[state.metric]))}</strong>
              </button>
            `;
          }).join('')}
          </div>
        </section>
      </div>
    `;

    bindEfficiencyPlotInteractions();
  };

  const syncCapabilityRoute = ({ writeHash = false } = {}) => {
    const category = categoryById.get(state.capabilityCategory) || COMBINED_CAPABILITY;
    const modeLabel = state.capabilityMode === 'benchmarks'
      ? 'benchmark tests'
      : state.capabilityMode === 'efficiency'
        ? 'efficiency'
        : 'leaderboard';
    elements.workspace.dataset.selectedEntry = state.selectedId;
    document.body.dataset.activeCapabilityMode = state.capabilityMode;
    document.title = `VasirBench · ${category.name} ${modeLabel}`;

    const nextHash = capabilityHash();
    if (writeHash && window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
  };

  const renderDynamic = (focusSelector) => {
    renderCapabilities();
    syncCapabilityRoute();

    if (focusSelector) {
      window.requestAnimationFrame(() => {
        document.querySelector(focusSelector)?.focus({ preventScroll: true });
      });
    }
  };

  const selectEntry = (entryId, focusSelector) => {
    if (!entryById.has(entryId)) return;
    state.selectedId = entryId;
    renderDynamic(focusSelector);
  };

  const nearestPlotEntry = (event, layer) => {
    const canvas = layer.closest('.efficiency-plane__canvas');
    const points = canvas.querySelector('.efficiency-plane__points');
    const bounds = points.getBoundingClientRect();
    return data.entries.reduce((best, entry) => {
      const x = bounds.left + (resourcePosition(entry[state.metric]) / 100) * bounds.width;
      const y = bounds.top + ((100 - normalizedQuality(scoreFor(entry, state.capabilityCategory))) / 100) * bounds.height;
      const distance = Math.hypot(event.clientX - x, event.clientY - y);
      return !best || distance < best.distance ? { entry, distance, x, y } : best;
    }, null);
  };

  const updatePlotInspection = (canvas, entryId) => {
    if (!canvas || !entryById.has(entryId)) return;
    const entry = entryById.get(entryId);
    const selectedId = canvas.dataset.selectedId;
    const ranks = rankedField(state.capabilityCategory).ranks;
    const frontierIds = new Set(
      (canvas.closest('.efficiency-plane__plot')?.dataset.frontierIds || '').split(',').filter(Boolean)
    );
    const tooltip = canvas.querySelector('.efficiency-plane__tooltip');
    const { x, y } = plotCoordinates(entry);

    canvas.dataset.inspectedId = entry.id;
    canvas.querySelectorAll('.plot-point[data-entry-id]').forEach((point) => {
      const candidate = entryById.get(point.dataset.entryId);
      const related = candidate?.settingId === entry.settingId;
      point.classList.toggle('is-inspected', point.dataset.entryId === entry.id);
      point.classList.toggle('is-related', Boolean(related && point.dataset.entryId !== entry.id));
      point.classList.toggle('is-deemphasized', !related && point.dataset.entryId !== selectedId);
    });

    if (!tooltip || entry.id === selectedId) {
      if (tooltip) tooltip.hidden = true;
      canvas.querySelector(`.plot-point[data-entry-id="${CSS.escape(entry.id)}"]`)?.removeAttribute('aria-describedby');
      return;
    }

    tooltip.className = `efficiency-plane__tooltip ${annotationDockClass(entry)}`;
    tooltip.style.setProperty('--inspection-x', `${x.toFixed(3)}%`);
    tooltip.style.setProperty('--inspection-y', `${y.toFixed(3)}%`);
    tooltip.dataset.entryId = entry.id;
    tooltip.innerHTML = plotInspectionMarkup(entry, ranks, frontierIds);
    tooltip.hidden = false;
  };

  const clearPlotInspection = (canvas) => {
    if (!canvas) return;
    delete canvas.dataset.inspectedId;
    canvas.querySelectorAll('.plot-point[data-entry-id]').forEach((point) => {
      point.classList.remove('is-inspected', 'is-related', 'is-deemphasized');
      point.removeAttribute('aria-describedby');
    });
    const tooltip = canvas.querySelector('.efficiency-plane__tooltip');
    if (tooltip) tooltip.hidden = true;
  };

  const bindEfficiencyPlotInteractions = () => {
    const view = elements.capabilityView.querySelector('#efficiency-view');
    const canvas = view?.querySelector('.efficiency-plane__canvas');
    const pointerLayer = canvas?.querySelector('.efficiency-plane__pointer-layer');
    if (!view || !canvas || !pointerLayer) return;

    let pointerFrame = 0;
    let latestPointerEvent = null;
    pointerLayer.addEventListener('pointermove', (event) => {
      latestPointerEvent = event;
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        const nearest = nearestPlotEntry(latestPointerEvent, pointerLayer);
        if (nearest && nearest.distance <= 34) updatePlotInspection(canvas, nearest.entry.id);
        else clearPlotInspection(canvas);
      });
    });
    pointerLayer.addEventListener('pointerleave', () => {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      clearPlotInspection(canvas);
    });

    canvas.addEventListener('focusin', (event) => {
      const point = event.target.closest('.plot-point[data-entry-id]');
      if (!point) return;
      point.setAttribute('aria-describedby', 'efficiency-plot-tooltip');
      updatePlotInspection(canvas, point.dataset.entryId);
    });
    canvas.addEventListener('focusout', (event) => {
      if (event.relatedTarget?.closest?.('.plot-point[data-entry-id]')) return;
      clearPlotInspection(canvas);
    });

    view.querySelectorAll('.frontier-row[data-entry-id], .efficiency-summary__alternative[data-entry-id]').forEach((row) => {
      row.addEventListener('pointerenter', () => updatePlotInspection(canvas, row.dataset.entryId));
      row.addEventListener('pointerleave', () => {
        if (document.activeElement !== row) clearPlotInspection(canvas);
      });
      row.addEventListener('focus', () => updatePlotInspection(canvas, row.dataset.entryId));
      row.addEventListener('blur', () => clearPlotInspection(canvas));
    });
  };

  const plotPointSnapshot = () => new Map(
    [...elements.capabilityView.querySelectorAll('.plot-point[data-entry-id]')].map((point) => {
      const box = point.getBoundingClientRect();
      return [point.dataset.entryId, { x: box.left + (box.width / 2), y: box.top + (box.height / 2) }];
    })
  );

  const animatePlotReflow = (before) => {
    if (!before?.size || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    elements.capabilityView.querySelectorAll('.plot-point[data-entry-id]').forEach((point) => {
      const previous = before.get(point.dataset.entryId);
      if (!previous || typeof point.animate !== 'function') return;
      const box = point.getBoundingClientRect();
      const x = box.left + (box.width / 2);
      const y = box.top + (box.height / 2);
      point.animate([
        {
          transform: `translate(calc(-50% + ${previous.x - x}px), calc(-50% + ${previous.y - y}px))`,
          opacity: 0.58
        },
        { transform: 'translate(-50%, -50%)', opacity: 1 }
      ], {
        duration: 220,
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
      });
    });
    const frontier = elements.capabilityView.querySelector('.efficiency-plane__frontier');
    frontier?.animate?.([{ opacity: 0.18 }, { opacity: 1 }], {
      duration: 220,
      easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
    });
  };

  const focusPlotNeighbor = (point, key) => {
    const points = [...point.closest('.efficiency-plane__points').querySelectorAll('.plot-point[data-entry-id]')];
    const current = {
      x: Number(point.dataset.plotX),
      y: Number(point.dataset.plotY)
    };
    let target = null;

    if (key === 'Home') {
      target = [...points].sort((left, right) => Number(left.dataset.plotX) - Number(right.dataset.plotX))[0];
    } else if (key === 'End') {
      target = [...points].sort((left, right) => Number(left.dataset.plotY) - Number(right.dataset.plotY))[0];
    } else {
      const candidates = points
        .filter((candidate) => candidate !== point)
        .map((candidate) => ({
          candidate,
          dx: Number(candidate.dataset.plotX) - current.x,
          dy: Number(candidate.dataset.plotY) - current.y
        }))
        .filter(({ dx, dy }) => (
          (key === 'ArrowRight' && dx > 0.1) ||
          (key === 'ArrowLeft' && dx < -0.1) ||
          (key === 'ArrowDown' && dy > 0.1) ||
          (key === 'ArrowUp' && dy < -0.1)
        ))
        .sort((left, right) => {
          const horizontal = key === 'ArrowRight' || key === 'ArrowLeft';
          const leftPrimary = Math.abs(horizontal ? left.dx : left.dy);
          const rightPrimary = Math.abs(horizontal ? right.dx : right.dy);
          const leftCross = Math.abs(horizontal ? left.dy : left.dx);
          const rightCross = Math.abs(horizontal ? right.dy : right.dx);
          return (leftPrimary + (leftCross * 0.35)) - (rightPrimary + (rightCross * 0.35));
        });
      target = candidates[0]?.candidate || null;
    }

    if (!target) return;
    points.forEach((candidate) => { candidate.tabIndex = candidate === target ? 0 : -1; });
    target.focus({ preventScroll: true });
  };

  const selectCapabilityCategory = (categoryId, { focusSelector, writeHash = true, skipMotion = false } = {}) => {
    if (!categoryById.has(categoryId)) return;
    state.capabilityCategory = categoryId;
    renderCapabilities({ animate: true, skipMotion });
    syncCapabilityRoute({ writeHash });
    if (focusSelector) {
      window.requestAnimationFrame(() => {
        document.querySelector(focusSelector)?.focus({ preventScroll: true });
      });
    }
  };

  const selectCapabilityMode = (mode, { focusSelector, writeHash = true, skipMotion = false } = {}) => {
    if (!CAPABILITY_MODES.includes(mode)) return;
    state.capabilityMode = mode;
    updateCapabilityMode({ animate: true, skipMotion });
    syncCapabilityRoute({ writeHash });
    if (focusSelector) {
      window.requestAnimationFrame(() => {
        document.querySelector(focusSelector)?.focus({ preventScroll: true });
      });
    }
  };

  document.addEventListener('click', (event) => {
    const capabilitySegment = event.target.closest('.capability-composition__segment[data-category-id][data-entry-id]');
    if (capabilitySegment) {
      if (!entryById.has(capabilitySegment.dataset.entryId) || !categoryById.has(capabilitySegment.dataset.categoryId)) return;
      state.selectedId = capabilitySegment.dataset.entryId;
      state.capabilityCategory = capabilitySegment.dataset.categoryId;
      state.capabilityMode = 'models';
      renderDynamic();
      syncCapabilityRoute({ writeHash: true });
      window.requestAnimationFrame(() => {
        document.querySelector('#capability-question')?.focus({ preventScroll: true });
      });
      return;
    }

    const capabilityTab = event.target.closest('.capability-selector__tab[data-category-id]');
    if (capabilityTab) {
      selectCapabilityCategory(capabilityTab.dataset.categoryId, {
        focusSelector: `.capability-selector__tab[data-category-id="${CSS.escape(capabilityTab.dataset.categoryId)}"]`
      });
      return;
    }

    const capabilityModeTab = event.target.closest('.capability-mode__tab[data-capability-mode]');
    if (capabilityModeTab) {
      selectCapabilityMode(capabilityModeTab.dataset.capabilityMode, {
        focusSelector: `.capability-mode__tab[data-capability-mode="${CSS.escape(capabilityModeTab.dataset.capabilityMode)}"]`
      });
      return;
    }

    const showAll = event.target.closest('#show-all');
    if (showAll) {
      state.showAll = !state.showAll;
      renderCapabilities();
      window.requestAnimationFrame(() => {
        document.querySelector('#show-all')?.focus({ preventScroll: true });
      });
      return;
    }

    const pointerLayer = event.target.closest('.efficiency-plane__pointer-layer');
    if (pointerLayer) {
      const nearest = nearestPlotEntry(event, pointerLayer);
      if (nearest && nearest.distance <= 28) selectEntry(nearest.entry.id);
      return;
    }

    const selectable = event.target.closest(
      '.setting-row__select[data-entry-id], .capability-rank-row__select[data-entry-id], .matched-triplet__option[data-entry-id], .plot-point[data-entry-id], .frontier-row[data-entry-id], .efficiency-summary__alternative[data-entry-id]'
    );
    if (selectable) {
      const selector = selectable.classList.contains('plot-point')
        ? `.plot-point[data-entry-id="${CSS.escape(selectable.dataset.entryId)}"]`
        : selectable.classList.contains('matched-triplet__option')
          ? `.matched-triplet__option[data-entry-id="${CSS.escape(selectable.dataset.entryId)}"]`
          : selectable.classList.contains('efficiency-summary__alternative')
            ? `.efficiency-summary__alternative[data-entry-id="${CSS.escape(selectable.dataset.entryId)}"]`
          : selectable.classList.contains('setting-row__select')
            ? `.setting-row__select[data-entry-id="${CSS.escape(selectable.dataset.entryId)}"]`
            : selectable.classList.contains('capability-rank-row__select')
              ? `.capability-rank-row[data-full-entry-id="${CSS.escape(selectable.dataset.entryId)}"] .capability-rank-row__select`
            : null;
      selectEntry(selectable.dataset.entryId, selector);
    }
  });

  document.addEventListener('keydown', (event) => {
    const plotPoint = event.target.closest('.plot-point[data-entry-id]');
    if (plotPoint && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      focusPlotNeighbor(plotPoint, event.key);
      return;
    }

    if (plotPoint && event.key === 'Escape') {
      clearPlotInspection(plotPoint.closest('.efficiency-plane__canvas'));
      plotPoint.blur();
      return;
    }

    const capabilityModeTab = event.target.closest('.capability-mode__tab[data-capability-mode]');
    if (capabilityModeTab) {
      const tabs = [...capabilityModeTab.closest('[role="tablist"]').querySelectorAll('.capability-mode__tab[data-capability-mode]')];
      const index = tabs.indexOf(capabilityModeTab);
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      const mode = tabs[nextIndex].dataset.capabilityMode;
      selectCapabilityMode(mode, {
        focusSelector: `.capability-mode__tab[data-capability-mode="${CSS.escape(mode)}"]`,
        skipMotion: true
      });
      return;
    }

    const capabilityTab = event.target.closest('.capability-selector__tab[data-category-id]');
    if (capabilityTab) {
      const tabList = capabilityTab.closest('[role="tablist"]');
      const tabs = [...tabList.querySelectorAll('.capability-selector__tab[data-category-id]')];
      const index = tabs.indexOf(capabilityTab);
      const orientation = tabList.getAttribute('aria-orientation') || 'horizontal';
      let nextIndex = null;
      if ((orientation === 'horizontal' && event.key === 'ArrowRight') || (orientation === 'vertical' && event.key === 'ArrowDown')) nextIndex = (index + 1) % tabs.length;
      if ((orientation === 'horizontal' && event.key === 'ArrowLeft') || (orientation === 'vertical' && event.key === 'ArrowUp')) nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      const categoryId = tabs[nextIndex].dataset.categoryId;
      selectCapabilityCategory(categoryId, {
        focusSelector: `.capability-selector__tab[data-category-id="${CSS.escape(categoryId)}"]`,
        skipMotion: true
      });
      return;
    }

    const segment = event.target.closest('.capability-composition__segment[data-category-id]');
    if (!segment) return;
    const segments = [...segment.closest('.capability-composition__stack').querySelectorAll('.capability-composition__segment[data-category-id]')];
    const index = segments.indexOf(segment);
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % segments.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + segments.length) % segments.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = segments.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    segments.forEach((candidate, candidateIndex) => {
      candidate.tabIndex = candidateIndex === nextIndex ? 0 : -1;
    });
    segments[nextIndex].focus();
  });

  document.addEventListener('change', (event) => {
    if (event.target.matches('#efficiency-entry')) {
      selectEntry(event.target.value, '#efficiency-entry');
      return;
    }
    if (event.target.matches('#resource-axis') && metricConfig[event.target.value]) {
      const previousPositions = plotPointSnapshot();
      state.metric = event.target.value;
      updateCapabilityMode({ skipMotion: true });
      window.requestAnimationFrame(() => {
        animatePlotReflow(previousPositions);
        document.querySelector('#resource-axis')?.focus({ preventScroll: true });
      });
    }
  });

  window.addEventListener('hashchange', () => {
    const restoreCapabilityFocus = elements.capabilityView.contains(document.activeElement);
    const restoreModeFocus = Boolean(document.activeElement?.closest?.('.capability-mode__tab'));
    const route = routeFromHash();
    state.capabilityCategory = route.category;
    state.capabilityMode = CAPABILITY_MODES.includes(route.mode) ? route.mode : 'models';
    renderCapabilities({ animate: true });
    syncCapabilityRoute();
    const canonicalHash = capabilityHash();
    if (route.legacy || route.invalid || route.canonical === false || window.location.hash !== canonicalHash) {
      window.history.replaceState(null, '', canonicalHash);
    }
    if (restoreCapabilityFocus) {
      window.requestAnimationFrame(() => {
        const selector = restoreModeFocus
          ? '.capability-mode__tab[aria-selected="true"]'
          : '.capability-selector__tab[aria-selected="true"]';
        document.querySelector(selector)?.focus({ preventScroll: true });
      });
    }
  });

  capabilityIndexMedia.addEventListener('change', syncCapabilityIndexOrientation);

  renderDynamic();
  const initialHash = capabilityHash();
  if (window.location.hash !== initialHash) {
    window.history.replaceState(null, '', initialHash);
  }
}());
