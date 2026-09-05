(function () {
  'use strict';

  const data = window.VASIR_DATA;
  const responseData = window.VASIR_RESPONSES;
  const reportView = document.getElementById('report-view');
  const reportPage = document.getElementById('report-page');
  const routeSections = new Set(['overview', 'ranking', 'method', 'limitations', 'top']);
  const REQUIRED_CONDITION_IDS = ['baseline', 'skill'];
  const requiredCollections = ['conditions', 'benchmarks', 'benchmarkSummaries', 'benchmarkResults', 'categories', 'settings'];
  const hasRequiredCollections = Boolean(data) && requiredCollections.every((key) => Array.isArray(data[key]));
  const expectedResponseCount = hasRequiredCollections
    ? data.benchmarks.length * data.conditions.length * data.settings.length
    : 0;
  const returnFieldId = new URLSearchParams(window.location.search).get('from') === 'overall'
    ? 'overall'
    : null;
  const hasResponseCollections = Boolean(responseData)
    && responseData.kind === 'vasirbenchmark-public-responses'
    && responseData.schemaVersion === 2
    && Array.isArray(responseData.messageSets)
    && Array.isArray(responseData.responses);
  let activeBenchmarkId = null;
  let copyControlSequence = 0;
  const transcriptCopyTextById = new Map();
  const copyFeedbackTimers = new WeakMap();

  if (!data || !reportView || !reportPage) return;
  if (
    !hasRequiredCollections
    || data.conditions.length !== REQUIRED_CONDITION_IDS.length
    || !REQUIRED_CONDITION_IDS.every((conditionId) => data.conditions.some((condition) => condition.id === conditionId))
    || data.benchmarks.length === 0
    || data.settings.length === 0
    || data.categories.length === 0
    || data.benchmarkSummaries.length !== data.benchmarks.length
    || data.benchmarkResults.length !== expectedResponseCount
  ) {
    reportView.innerHTML = `
      <section class="development-unavailable" role="alert">
        <p class="ui-eyebrow">Benchmark data unavailable</p>
        <h1>REPORT COULD NOT BE VERIFIED</h1>
        <p>The public dataset must provide one complete Minimal baseline and Architecture skill result for every matched setting and frozen task. No partial report is shown.</p>
      </section>
    `;
    return;
  }

  const benchmarkById = new Map(data.benchmarks.map((benchmark) => [benchmark.id, benchmark]));
  const summaryById = new Map(data.benchmarkSummaries.map((summary) => [summary.benchmarkId, summary]));
  const categoryById = new Map(data.categories.map((category) => [category.id, category]));
  const settingById = new Map(data.settings.map((setting) => [setting.id, setting]));
  const settingByConfigurationId = new Map(data.settings.map((setting) => [setting.configurationId, setting]));
  const expectedJudgeConfigurationIds = Array.isArray(data.scoreBasis?.judges) ? data.scoreBasis.judges : [];
  const messageSetById = new Map((hasResponseCollections ? responseData.messageSets : []).map((messageSet) => [messageSet.id, messageSet]));
  const responseKey = (benchmarkId, settingId, condition) => `${benchmarkId}\u0000${settingId}\u0000${condition}`;
  const responseByKey = new Map((hasResponseCollections ? responseData.responses : []).map((response) => [
    responseKey(response.benchmarkId, response.settingId, response.condition),
    response
  ]));
  const benchmarkResultByKey = new Map(data.benchmarkResults.map((result) => [
    responseKey(result.benchmarkId, result.settingId, result.condition),
    result
  ]));
  const referencedMessageSetIds = new Set((hasResponseCollections ? responseData.responses : []).map((response) => response.messageSetId));
  const hasCompleteResponseMatrix = hasResponseCollections
    && expectedJudgeConfigurationIds.length > 0
    && expectedJudgeConfigurationIds.length === Number(data.scoreBasis?.judgeCount)
    && messageSetById.size === responseData.messageSets.length
    && responseData.messageSets.length > 0
    && responseData.messageSets.every((messageSet) => (
      typeof messageSet?.id === 'string'
      && messageSet.id.length > 0
      && Array.isArray(messageSet.messages)
      && messageSet.messages.length > 0
      && messageSet.messages.every((message) => (
        typeof message?.role === 'string'
        && message.role.trim().length > 0
        && typeof message.content === 'string'
        && message.content.length > 0
      ))
      && referencedMessageSetIds.has(messageSet.id)
    ))
    && responseData.responses.length === expectedResponseCount
    && responseData.counts?.judgments === expectedResponseCount * expectedJudgeConfigurationIds.length
    && responseByKey.size === expectedResponseCount
    && benchmarkResultByKey.size === expectedResponseCount
    && responseData.responses.every((response) => {
      const result = benchmarkResultByKey.get(responseKey(response.benchmarkId, response.settingId, response.condition));
      const setting = settingById.get(response.settingId);
      return Boolean(
        result
        && setting
        && response.configurationId === setting.configurationId
        && response.trialNumber === result.trials
        && messageSetById.has(response.messageSetId)
        && typeof response.outputText === 'string'
        && response.outputText.length > 0
        && Array.isArray(response.judgments)
        && response.judgments.length === expectedJudgeConfigurationIds.length
        && response.judgments.every((judgment, judgmentIndex) => (
          judgment?.judgeConfigurationId === expectedJudgeConfigurationIds[judgmentIndex]
          && settingByConfigurationId.has(judgment.judgeConfigurationId)
          && Number.isFinite(judgment.score)
          && judgment.score >= 0
          && judgment.score <= 100
          && Number.isFinite(judgment.rawScore)
          && judgment.rawScore >= 0
          && judgment.rawScore <= 100
          && Number.isFinite(judgment.gateCap)
          && judgment.gateCap >= 0
          && judgment.gateCap <= 100
          && Array.isArray(judgment.failedGates)
          && judgment.failedGates.every((gateId) => typeof gateId === 'string' && gateId.length > 0)
          && typeof judgment.rationale === 'string'
          && judgment.rationale.trim().length > 0
        ))
      );
    })
    && data.benchmarkResults.every((result) => responseByKey.has(responseKey(
      result.benchmarkId,
      result.settingId,
      result.condition
    )));

  if (!hasCompleteResponseMatrix) {
    reportView.innerHTML = `
      <section class="development-unavailable" role="alert">
        <p class="ui-eyebrow">Response evidence unavailable</p>
        <h1>EXACT RUN MATRIX IS INCOMPLETE</h1>
        <p>This report requires one complete Minimal baseline and Architecture skill transcript for every published model setting and benchmark. No partial response evidence is shown.</p>
      </section>
    `;
    return;
  }

  const SETTING_COUNT = data.settings.length;
  const CONDITION_COUNT = data.conditions.length;
  const scoreBasis = data.scoreBasis && typeof data.scoreBasis === 'object' ? data.scoreBasis : {};
  const TASK_COUNT = Number.isFinite(Number(scoreBasis.taskCount)) && Number(scoreBasis.taskCount) > 0
    ? Number(scoreBasis.taskCount)
    : data.benchmarks.length;
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
  const UNCERTAINTY_REASON = typeof scoreBasis.uncertainty?.reason === 'string' && scoreBasis.uncertainty.reason.trim()
    ? scoreBasis.uncertainty.reason.trim()
    : 'Only one trial per task and condition is published.';
  const taskCoverageLabel = `${TASK_COUNT} ${TASK_COUNT === 1 ? 'task' : 'tasks'} × ${TRIALS_PER_TASK} ${TRIALS_PER_TASK === 1 ? 'trial' : 'trials'}`;
  const developmentDisclosure = `${SCORE_EDITION_LABEL} · ${taskCoverageLabel} · ${JUDGE_COUNT} judges`;
  const usesConsensusScoring = scoreBasis.aggregation === 'unanimity-gates-mean-dimensions-v1';
  const panelMethod = usesConsensusScoring
    ? 'Both judges must pass each gate; either failure applies its gate ceiling. Dimension ratings use the arithmetic mean, including half points. The task rubric recomputes the score before applying the lowest failed-gate ceiling.'
    : 'Gates use majority vote and dimension ratings use the median. The task rubric recomputes the score before applying the lowest majority-failed gate ceiling.';
  const panelLabel = expectedJudgeConfigurationIds
    .map((configurationId) => settingByConfigurationId.get(configurationId)?.label || configurationId)
    .join(' + ');

  const escapeHTML = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const copyButtonMarkup = (value, accessibleLabel) => {
    if (typeof value !== 'string') return '';
    copyControlSequence += 1;
    const copyId = `transcript-copy-${copyControlSequence}`;
    transcriptCopyTextById.set(copyId, value);
    return `<button class="model-run__copy" type="button" data-copy-id="${copyId}" data-copy-accessible-label="${escapeHTML(accessibleLabel)}" aria-label="${escapeHTML(accessibleLabel)}" aria-live="polite">Copy</button>`;
  };

  const writeClipboardText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // Fall through to the selection-based path for restricted browser contexts.
      }
    }

    const helper = document.createElement('textarea');
    helper.className = 'visually-hidden';
    helper.value = value;
    helper.setAttribute('readonly', '');
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand('copy');
    helper.remove();
    if (!copied) throw new Error('Clipboard copy failed.');
  };

  const showCopyFeedback = (control, label, stateClass) => {
    const previousTimer = copyFeedbackTimers.get(control);
    if (previousTimer) window.clearTimeout(previousTimer);
    control.classList.remove('is-confirmed', 'is-error');
    control.classList.add(stateClass);
    control.textContent = label;
    const timer = window.setTimeout(() => {
      if (!control.isConnected) return;
      control.classList.remove('is-confirmed', 'is-error');
      control.textContent = 'Copy';
      control.setAttribute('aria-label', control.dataset.copyAccessibleLabel || 'Copy exact text');
      copyFeedbackTimers.delete(control);
    }, 1600);
    copyFeedbackTimers.set(control, timer);
  };

  const signed = (value) => `${value > 0 ? '+' : ''}${Number(value).toFixed(1)}`;
  const parseRoute = () => {
    const [benchmarkId, candidateSection] = decodeURIComponent(window.location.hash.slice(1)).split('/');
    return {
      benchmarkId,
      section: routeSections.has(candidateSection) ? candidateSection : null
    };
  };
  const categoryBenchmarks = (categoryId) => data.benchmarks.filter((benchmark) => benchmark.category === categoryId);

  const hydrateSectionLinks = (benchmarkId, requestedSection = 'overview') => {
    const currentSection = ['ranking', 'method', 'limitations'].includes(requestedSection)
      ? requestedSection
      : 'overview';
    document.querySelectorAll('[data-report-section]').forEach((link) => {
      link.href = `#${benchmarkId}/${link.dataset.reportSection}`;
      if (!link.closest('.report-mast__nav')) return;
      if (link.dataset.reportSection === currentSection) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const scrollToSection = (section) => {
    window.requestAnimationFrame(() => {
      if (section === 'top') {
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      document.getElementById(section)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  };

  const modelPreviewRows = (benchmark) => {
    const baselineRows = data.benchmarkResults.filter((result) => (
      result.benchmarkId === benchmark.id && result.condition === 'baseline'
    ));
    const treatmentRows = data.benchmarkResults.filter((result) => (
      result.benchmarkId === benchmark.id && result.condition === 'skill'
    ));

    return treatmentRows.map((treatment) => {
      const baseline = baselineRows.find((candidate) => candidate.settingId === treatment.settingId);
      const setting = settingById.get(treatment.settingId);
      if (!baseline || !setting) return null;
      return {
        setting,
        baselineResponse: responseByKey.get(responseKey(benchmark.id, setting.id, 'baseline')) || null,
        treatmentResponse: responseByKey.get(responseKey(benchmark.id, setting.id, 'skill')) || null,
        baseline: baseline.score,
        treatment: treatment.score,
        delta: Math.round((treatment.score - baseline.score) * 10) / 10
      };
    }).filter(Boolean).sort((a, b) => (
      b.treatment - a.treatment
      || b.baseline - a.baseline
      || a.setting.label.localeCompare(b.setting.label)
    ));
  };

  const truthMarkup = () => `
    <aside class="evidence-truth" aria-label="${escapeHTML(developmentDisclosure)}">
      <strong class="evidence-truth__kind">${escapeHTML(developmentDisclosure)}</strong>
      <p>Architecture skill vs Minimal baseline · fixed rubric /${SCORE_MAXIMUM}</p>
      <span aria-hidden="true"></span>
    </aside>
  `;

  const heroMarkup = (benchmark, summary) => {
    const record = `${summary.wins}W · ${summary.ties}T · ${summary.losses}L`;
    const regressionClass = summary.delta < 0 ? ' is-regression' : '';
    return `
      <section class="evidence-hero" id="overview" aria-labelledby="report-title">
        <div class="evidence-hero__identity">
          <p class="evidence-hero__eyebrow">${escapeHTML(benchmark.suite)} · benchmark result</p>
          <h1 id="report-title">${escapeHTML(benchmark.name)}</h1>
          <p class="evidence-hero__description">${escapeHTML(benchmark.description)}</p>
          <p class="evidence-hero__prompt"><span>Prompt under test</span>${escapeHTML(benchmark.prompt)}</p>
        </div>

        <div class="evidence-hero__result" aria-label="Matched condition result">
          <div class="matched-result">
            <dl class="matched-result__condition matched-result__condition--baseline">
              <dt>${escapeHTML(summary.baselineLabel)}</dt>
              <dd><strong>${summary.baseline.toFixed(1)}</strong><small>field mean /${SCORE_MAXIMUM} · n=${SETTING_COUNT}</small></dd>
            </dl>
            <span class="matched-result__arrow" aria-hidden="true">→</span>
            <dl class="matched-result__condition matched-result__condition--treatment">
              <dt>${escapeHTML(summary.treatmentLabel)}</dt>
              <dd><strong>${summary.treatment.toFixed(1)}</strong><small>field mean /${SCORE_MAXIMUM} · n=${SETTING_COUNT}</small></dd>
            </dl>
          </div>
          <dl class="matched-result__delta${regressionClass}">
            <dt>Mean paired uplift</dt>
            <dd>${signed(summary.delta)} pts</dd>
          </dl>
          <dl class="evidence-facts">
            <div><dt>Coverage</dt><dd>${SETTING_COUNT} settings × ${CONDITION_COUNT} conditions × ${TRIALS_PER_TASK} ${TRIALS_PER_TASK === 1 ? 'trial' : 'trials'}</dd></div>
            <div><dt>Matched record</dt><dd>${record}</dd></div>
            <div><dt>Source run</dt><dd>${escapeHTML(summary.runId || 'Not published')}</dd></div>
          </dl>
        </div>
      </section>
    `;
  };

  const overviewMarkup = (benchmark) => `
      <section class="report-section" aria-labelledby="intent-title">
        <header class="report-section__heading">
          <div>
            <p class="ui-eyebrow">Test definition</p>
            <h2 id="intent-title">What this benchmark tests</h2>
          </div>
          <p>${escapeHTML(benchmark.suite)} is one track inside the ${escapeHTML(categoryById.get(benchmark.category).name)} capability.</p>
        </header>
        <div class="report-overview">
          <section class="report-overview__intent">
            <h3>Task scope</h3>
            <p>${escapeHTML(benchmark.description)} This score covers this prompt and track, not every ${escapeHTML(categoryById.get(benchmark.category).name.toLowerCase())} task.</p>
          </section>
          <section class="report-overview__source">
            <h3>How scoring works</h3>
            <p>${JUDGE_COUNT} fixed judges—${escapeHTML(panelLabel)}—score each answer against this task's 0–${SCORE_MAXIMUM} rubric. ${escapeHTML(panelMethod)} There is no synthesizer. Adding a model within this edition can change rank, while its existing scores stay fixed.</p>
          </section>
        </div>
      </section>
  `;

  const messageMarkup = ({ message, messageIndex, conditionLabel, settingLabel }) => {
    const role = typeof message?.role === 'string' && message.role.trim() ? message.role.trim() : 'message';
    const content = typeof message?.content === 'string' ? message.content : '';
    return `
      <li class="model-run__message">
        <header class="model-run__message-header">
          <span class="model-run__role">${String(messageIndex + 1).padStart(2, '0')} · ${escapeHTML(role)}</span>
          ${copyButtonMarkup(content, `Copy ${role} input for ${settingLabel}, ${conditionLabel}`)}
        </header>
        <pre class="model-run__text" data-message-content><code>${escapeHTML(content)}</code></pre>
      </li>
    `;
  };

  const gateLabel = (gateId) => String(gateId)
    .split('-')
    .filter(Boolean)
    .map((part, partIndex) => partIndex === 0 ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part)
    .join(' ');

  const judgeReviewMarkup = ({ judgment, judgmentIndex }) => {
    const judgeSetting = settingByConfigurationId.get(judgment.judgeConfigurationId);
    const judgeLabel = judgeSetting?.label || judgment.judgeConfigurationId;
    const failedGateText = judgment.failedGates.length > 0
      ? judgment.failedGates.map(gateLabel).join(' · ')
      : 'None';
    return `
      <li class="model-run__judge" data-judge-review>
        <header class="model-run__judge-header">
          <span class="model-run__judge-identity">
            <strong class="model-run__judge-index">Judge ${String(judgmentIndex + 1).padStart(2, '0')}</strong>
            <span class="model-run__judge-configuration" data-judge-configuration>${escapeHTML(judgeLabel)}</span>
          </span>
          <span class="model-run__judge-score"><strong class="model-run__judge-score-value" data-judge-score>${judgment.score.toFixed(1)}</strong><small class="model-run__judge-score-unit">/${SCORE_MAXIMUM}</small></span>
        </header>
        <dl class="model-run__judge-mechanics" data-judge-mechanics>
          <div class="model-run__judge-mechanic"><dt class="model-run__judge-mechanic-label">Uncapped</dt><dd class="model-run__judge-mechanic-value" data-judge-raw-score>${judgment.rawScore.toFixed(1)}</dd></div>
          <div class="model-run__judge-mechanic"><dt class="model-run__judge-mechanic-label">Gate ceiling</dt><dd class="model-run__judge-mechanic-value" data-judge-gate-cap>${judgment.gateCap.toFixed(1)}</dd></div>
          <div class="model-run__judge-mechanic"><dt class="model-run__judge-mechanic-label">Failed gates</dt><dd class="model-run__judge-mechanic-value" data-judge-failed-gates>${escapeHTML(failedGateText)}</dd></div>
        </dl>
        <p class="model-run__judge-rationale" data-judge-rationale>${escapeHTML(judgment.rationale)}</p>
      </li>
    `;
  };

  const judgingMarkup = ({ judgments }) => {
    const scores = judgments.map((judgment) => judgment.score);
    const scoreRange = `${Math.min(...scores).toFixed(1)}–${Math.max(...scores).toFixed(1)}`;
    return `
      <details class="model-run__judging">
        <summary class="model-run__judging-summary">
          <strong class="model-run__judging-title">Why this score</strong>
          <span class="model-run__judging-meta">${judgments.length} judges · ${scoreRange}</span>
          <i class="model-run__judging-mark" aria-hidden="true">↓</i>
        </summary>
        <div class="model-run__judging-body">
          <p class="model-run__aggregation-note">${escapeHTML(panelMethod)} There is no synthesizer. Each note is the saved answer-specific rationale from one independent review, bounded to 600 characters.</p>
          <ol class="model-run__judges">
            ${judgments.map((judgment, judgmentIndex) => judgeReviewMarkup({ judgment, judgmentIndex })).join('')}
          </ol>
        </div>
      </details>
    `;
  };

  const conditionTranscriptMarkup = ({ condition, response, score, rowIndex, settingLabel }) => {
    const isBaseline = condition === 'baseline';
    const conditionLabel = isBaseline ? 'Minimal baseline' : 'Architecture skill';
    const messageSet = messageSetById.get(response.messageSetId);
    const messages = messageSet.messages;
    const outputText = response.outputText;
    const headingId = `model-run-${rowIndex}-${condition}`;
    const modifier = isBaseline ? 'model-run__condition--baseline' : 'model-run__condition--skill';
    const trialLabel = Number.isInteger(response?.trialNumber) ? `Trial ${response.trialNumber}` : 'Recorded trial';

    return `
      <section class="model-run__condition ${modifier}" data-condition="${condition}" aria-labelledby="${headingId}">
        <header class="model-run__condition-header">
          <div class="model-run__condition-title">
            <span class="model-run__condition-meta">${escapeHTML(settingLabel)} · ${escapeHTML(trialLabel)} · exact saved exchange</span>
            <h3 class="model-run__condition-name" id="${headingId}">${conditionLabel}</h3>
          </div>
          <strong class="model-run__condition-score">${score.toFixed(1)}<small class="model-run__condition-unit">/${SCORE_MAXIMUM}</small></strong>
        </header>
        <details class="model-run__prompt">
          <summary class="model-run__prompt-summary">
            <strong class="model-run__prompt-title">Input prompt</strong>
            <span class="model-run__prompt-meta">${messages.length} ${messages.length === 1 ? 'message' : 'messages'} · ordered</span>
            <i class="model-run__prompt-mark" aria-hidden="true">↓</i>
          </summary>
          <div class="model-run__prompt-body">
            <ol class="model-run__messages">
              ${messages.map((message, messageIndex) => messageMarkup({ message, messageIndex, conditionLabel, settingLabel })).join('')}
            </ol>
          </div>
        </details>
        ${judgingMarkup({ judgments: response.judgments })}
        <section class="model-run__section" aria-label="Full model output">
          <header class="model-run__section-header">
            <h4 class="model-run__section-title">Full output</h4>
            ${copyButtonMarkup(outputText, `Copy full output for ${settingLabel}, ${conditionLabel}`)}
          </header>
          <pre class="model-run__text model-run__text--output" data-output-text><code>${escapeHTML(outputText)}</code></pre>
        </section>
      </section>
    `;
  };

  const modelRowMarkup = (row, index) => {
    const start = Math.min(row.baseline, row.treatment);
    const width = Math.abs(row.treatment - row.baseline);
    const regressionClass = row.delta < 0 ? ' is-regression' : '';
    const settingLabel = row.setting.label || `${row.setting.family} · ${row.setting.reasoning}`;
    return `
      <li class="model-preview__item">
        <details class="model-run">
          <summary class="model-preview__row${regressionClass}">
            <span class="model-preview__identity"><strong>${escapeHTML(settingLabel)}</strong><small>Architecture skill rank #${index + 1} of ${SETTING_COUNT}</small></span>
            <span
              class="model-preview__plot"
              style="--preview-start:${start}%;--preview-width:${width}%;--preview-baseline:${row.baseline}%;--preview-treatment:${row.treatment}%"
              aria-label="Minimal baseline ${row.baseline.toFixed(1)}, Architecture skill ${row.treatment.toFixed(1)}"
            >
              <i class="model-preview__axis" aria-hidden="true"></i>
              <i class="model-preview__connector" aria-hidden="true"></i>
              <i class="model-preview__mark model-preview__mark--baseline" aria-hidden="true"></i>
              <i class="model-preview__mark model-preview__mark--treatment" aria-hidden="true"></i>
            </span>
            <span class="model-preview__score"><span>Minimal</span>${row.baseline.toFixed(1)}</span>
            <span class="model-preview__score model-preview__score--treatment"><span>Skill</span>${row.treatment.toFixed(1)}</span>
            <span class="model-preview__delta">${signed(row.delta)} pts</span>
            <span class="model-preview__action">Inspect run <i class="model-preview__action-mark" aria-hidden="true">↓</i></span>
          </summary>
          <div class="model-run__comparison">
            ${conditionTranscriptMarkup({
              condition: 'baseline',
              response: row.baselineResponse,
              score: row.baseline,
              rowIndex: index,
              settingLabel
            })}
            ${conditionTranscriptMarkup({
              condition: 'skill',
              response: row.treatmentResponse,
              score: row.treatment,
              rowIndex: index,
              settingLabel
            })}
          </div>
        </details>
      </li>
    `;
  };

  const rankingMarkup = (benchmark) => `
    <section class="report-section" id="ranking" aria-labelledby="ranking-title">
      <header class="report-section__heading">
        <div>
          <p class="ui-eyebrow">${escapeHTML(SCORE_EDITION_LABEL)} field · all ${SETTING_COUNT} matched settings</p>
          <h2 id="ranking-title">Architecture skill task scores</h2>
        </div>
        <p>All ${SETTING_COUNT} settings, ordered by Architecture skill task score. Rank is secondary and can change as the field grows.</p>
      </header>
      <details class="preview-disclosure" open>
        <summary class="preview-disclosure__summary">All ${SETTING_COUNT} matched settings · task score /${SCORE_MAXIMUM}</summary>
        <ol class="model-preview" aria-label="All ${SETTING_COUNT} matched results for Architecture skill and Minimal baseline, ordered by Architecture skill task score">
          ${modelPreviewRows(benchmark).map(modelRowMarkup).join('')}
        </ol>
      </details>
    </section>
  `;

  const methodMarkup = (benchmark, summary) => {
    const limitations = Array.isArray(benchmark.limitations) ? benchmark.limitations : [];
    const judgingScope = summary.judgingScope;
    const judgingScopeCopy = judgingScope?.strategy === 'appended-rows-only-v1'
      ? `${judgingScope.incumbentResponseCount} incumbent responses kept their published scores; ${judgingScope.appendedResponseCount} new responses were scored with the fixed ${JUDGE_COUNT}-judge panel.`
      : judgingScope
        ? `All ${judgingScope.responseCount} saved model responses were rescored with the fixed ${JUDGE_COUNT}-judge panel; generation was reused unchanged.`
        : '';
    return `
      <section class="report-section" id="method" aria-labelledby="method-title">
        <header class="report-section__heading">
          <div>
            <p class="ui-eyebrow">Method</p>
            <h2 id="method-title">How scores are calculated</h2>
          </div>
          <p>Scores are task-local. Rank is derived and secondary.</p>
        </header>
        <div class="method-grid">
          <section>
            <h3>Matched conditions</h3>
            <p>The same task, output contract, and model setting are compared under ${escapeHTML(summary.baselineLabel)} and ${escapeHTML(summary.treatmentLabel)}.</p>
          </section>
          <section>
            <h3>Score /${SCORE_MAXIMUM}</h3>
            <p>Each value is the fixed ${JUDGE_COUNT}-judge panel result for this benchmark's rubric and does not depend on which other models are displayed. The hero shows field means across ${SETTING_COUNT} settings; each row shows one model setting.</p>
          </section>
          <section>
            <h3>Run details</h3>
            <p>${escapeHTML(UNCERTAINTY_REASON)} Source run ${escapeHTML(summary.runId || 'not published')}.</p>
            ${judgingScopeCopy ? `<p data-judging-scope>${escapeHTML(judgingScopeCopy)}</p>` : ''}
          </section>
        </div>
        <section class="report-limitations" id="limitations" aria-labelledby="limitations-title">
          <h3 id="limitations-title">Benchmark limitations</h3>
          <ul>
            ${limitations.map((limitation) => `<li>${escapeHTML(limitation)}</li>`).join('')}
          </ul>
        </section>
      </section>
    `;
  };

  const paginationMarkup = (benchmark) => {
    const siblings = categoryBenchmarks(benchmark.category);
    const index = siblings.findIndex((candidate) => candidate.id === benchmark.id);
    const previous = siblings[(index - 1 + siblings.length) % siblings.length];
    const next = siblings[(index + 1) % siblings.length];
    return `
      <nav class="report-pagination" aria-label="Other ${escapeHTML(categoryById.get(benchmark.category).name)} benchmarks">
        <a class="report-pagination__link" href="#${escapeHTML(previous.id)}"><span>← Previous benchmark</span><strong>${escapeHTML(previous.name)}</strong></a>
        <a class="report-pagination__link" href="#${escapeHTML(next.id)}"><span>Next benchmark →</span><strong>${escapeHTML(next.name)}</strong></a>
      </nav>
    `;
  };

  const render = (benchmarkId, options = {}) => {
    const benchmark = benchmarkById.get(benchmarkId) || data.benchmarks[0];
    const summary = summaryById.get(benchmark.id);
    const category = categoryById.get(benchmark.category);
    const returnContext = returnFieldId === 'overall'
      ? { id: 'overall', name: 'Combined' }
      : category;
    const returnHref = `./index.html#capabilities/${returnContext.id}/benchmarks`;
    activeBenchmarkId = benchmark.id;
    copyControlSequence = 0;
    transcriptCopyTextById.clear();

    reportPage.style.setProperty('--report-category', category.color);
    document.title = `${benchmark.name} · VasirBench`;

    reportView.innerHTML = `
      <div class="report-shell">
        <div class="report-context">
          <nav class="report-breadcrumb" aria-label="Benchmark hierarchy">
            <a href="./index.html">VasirBench</a>
            <span class="report-breadcrumb__separator" aria-hidden="true">→</span>
            <a href="${escapeHTML(returnHref)}">${escapeHTML(returnContext.name)}</a>
            <span class="report-breadcrumb__separator" aria-hidden="true">→</span>
            <span>${escapeHTML(benchmark.suite)}</span>
            <span class="report-breadcrumb__separator" aria-hidden="true">→</span>
            <span class="report-breadcrumb__current" aria-current="page">${escapeHTML(benchmark.name)}</span>
          </nav>
          <a class="report-context__back" href="${escapeHTML(returnHref)}">
            <span class="report-context__back-long">← All ${escapeHTML(returnContext.name)} tests</span>
            <span class="report-context__back-short">← ${escapeHTML(benchmark.suite)}</span>
          </a>
        </div>
        ${truthMarkup()}
        ${heroMarkup(benchmark, summary)}
        ${overviewMarkup(benchmark)}
        ${rankingMarkup(benchmark)}
        ${methodMarkup(benchmark, summary)}
        ${paginationMarkup(benchmark)}
      </div>
    `;

    reportView.querySelectorAll('.model-run, .model-run__prompt, .model-run__judging').forEach((details) => {
      const syncOpenState = () => details.classList.toggle('is-open', details.open);
      details.addEventListener('toggle', syncOpenState);
      syncOpenState();
    });

    if (!benchmarkById.has(benchmarkId)) {
      window.history.replaceState(null, '', `#${benchmark.id}`);
    }
    hydrateSectionLinks(benchmark.id, options.section || 'overview');
    if (options.scroll) scrollToSection(options.section || 'top');
  };

  window.addEventListener('hashchange', () => {
    const route = parseRoute();
    if (route.benchmarkId === activeBenchmarkId && benchmarkById.has(route.benchmarkId)) {
      hydrateSectionLinks(route.benchmarkId, route.section || 'overview');
      scrollToSection(route.section || 'top');
      return;
    }
    render(route.benchmarkId, { scroll: true, section: route.section });
  });

  reportView.addEventListener('click', async (event) => {
    const control = event.target.closest('.model-run__copy');
    if (!control || !reportView.contains(control)) return;
    const value = transcriptCopyTextById.get(control.dataset.copyId);
    if (typeof value !== 'string') return;

    const accessibleLabel = control.dataset.copyAccessibleLabel || control.getAttribute('aria-label') || 'Copy exact text';
    try {
      await writeClipboardText(value);
      control.focus({ preventScroll: true });
      control.setAttribute('aria-label', `${accessibleLabel}. Copied.`);
      showCopyFeedback(control, 'Copied', 'is-confirmed');
    } catch {
      control.focus({ preventScroll: true });
      control.setAttribute('aria-label', `${accessibleLabel}. Copy failed.`);
      showCopyFeedback(control, 'Retry', 'is-error');
    }
  });

  const initialRoute = parseRoute();
  render(initialRoute.benchmarkId, { scroll: Boolean(initialRoute.section), section: initialRoute.section });
}());
