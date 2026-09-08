(async function () {
  'use strict';

  const rootData = window.VASIR_DATA;
  const runtimeBase = document.currentScript?.src || window.location.href;
  const initialBenchmarkId = decodeURIComponent(window.location.hash.slice(1)).split('/')[0];
  const isWorkflowBenchmark = (benchmarkId) => Boolean(rootData?.aiWorkflows?.benchmarks?.some((benchmark) => benchmark.id === benchmarkId));
  const isWritingBenchmark = benchmarkId => Boolean(benchmarkId && (rootData?.writing?.benchmarkId === benchmarkId || rootData?.writing?.additionalBenchmarks?.[benchmarkId] || rootData?.writing?.benchmarkIds?.includes(benchmarkId) || rootData?.writing?.benchmarks?.some(benchmark => benchmark.id === benchmarkId)));
  const isWorkSpec = isWorkflowBenchmark(initialBenchmarkId);
  const isWriting = isWritingBenchmark(initialBenchmarkId);
  try {
    await Promise.all((isWriting
      ? [['VASIR_WRITING', './writing-data.js'], ['VASIR_WRITING_RESPONSES', './writing-responses.js']]
      : [['VASIR_RESPONSES', './responses.js']]).filter(([key]) => !window[key]).map(([, src]) => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(src, runtimeBase).href;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    })));
  } catch {
    document.getElementById('report-view').innerHTML = '<section class="development-unavailable" role="alert"><p class="ui-eyebrow">Response evidence unavailable</p><h1>REPORT COULD NOT BE LOADED</h1><p>Reload to try again, or <a href="./index.html">return to the benchmark index</a>.</p></section>';
    return;
  }
  const writingCollection = window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING;
  const writingResponseCollection = window.VASIR_WRITING_RESPONSES_COLLECTION || window.VASIR_WRITING_RESPONSES;
  const writingProjectionFor = benchmarkId => writingCollection?.additionalBenchmarks?.[benchmarkId] || writingCollection?.benchmarkPublications?.find(item => item.benchmarkId === benchmarkId)?.projection || writingCollection;
  const writingResponsesFor = benchmarkId => writingResponseCollection?.additionalBenchmarks?.[benchmarkId] || writingResponseCollection?.benchmarkResponses?.find(item => item.benchmarkId === benchmarkId)?.responseBundle || writingResponseCollection;
  const data = isWriting ? writingProjectionFor(initialBenchmarkId) : isWorkSpec ? rootData.aiWorkflows : rootData;
  const responseData = isWriting ? writingResponsesFor(initialBenchmarkId) : isWorkSpec ? window.VASIR_RESPONSES?.aiWorkflows : window.VASIR_RESPONSES;
  if (isWriting) {
    window.VASIR_WRITING_COLLECTION = writingCollection;
    window.VASIR_WRITING_RESPONSES_COLLECTION = writingResponseCollection;
    window.VASIR_WRITING = data;
    window.VASIR_WRITING_RESPONSES = responseData;
  }
  const writingDescriptor = rootData?.writing?.additionalBenchmarks?.[initialBenchmarkId];
  const writingSubcategory = writingDescriptor?.subcategory || data?.subcategory || 'storytelling';
  const writingTitle = writingDescriptor?.title || data?.subcategoryTitle || 'Storytelling';
  const writingCaseLabel = data?.caseLabel || 'story case';
  const writingCasePlural = `${writingCaseLabel}s`;
  const writingTrialCount = isWriting ? Number(data?.trialCount ?? data?.scoreBasis?.trialsPerTask ?? 1) : 1;
  const hasWritingTrialPicker = isWriting && writingTrialCount > 1;
  const TREATMENT_LABEL = data?.conditions?.find((condition) => condition.id === 'skill')?.label || 'Architecture skill';
  const BASELINE_LABEL = data?.conditions?.find(condition => condition.id === 'baseline')?.label || 'Minimal baseline';
  const BASELINE_SHORT = data?.conditions?.find(condition => condition.id === 'baseline')?.short || 'Minimal';
  const reportView = document.getElementById('report-view');
  const reportPage = document.getElementById('report-page');
  const routeSections = new Set(['overview', 'ranking', 'method', 'limitations', 'top']);
  const REQUIRED_CONDITION_IDS = ['baseline', 'skill'];
  const requiredCollections = ['conditions', 'benchmarks', 'benchmarkSummaries', 'benchmarkResults', 'categories', 'settings'];
  const hasRequiredCollections = Boolean(data) && requiredCollections.every((key) => Array.isArray(data[key]));
  const expectedResponseCount = hasRequiredCollections
    ? (isWriting ? (data.cases?.length || 0) * writingTrialCount : data.benchmarks.length) * data.conditions.length * data.settings.length
    : 0;
  const returnFieldId = new URLSearchParams(window.location.search).get('from') === 'overall'
    ? 'overall'
    : null;
  const hasResponseCollections = Boolean(responseData)
    && responseData.kind === (isWriting ? 'vasirbenchmark-writing-responses' : 'vasirbenchmark-public-responses')
    && (isWriting ? [1, 2, 3].includes(responseData.schemaVersion) : [2, 3].includes(responseData.schemaVersion))
    && Array.isArray(responseData.messageSets)
    && Array.isArray(responseData.responses);
  let activeBenchmarkId = null;
  let activeCaseId = isWriting ? data?.cases?.[0]?.id : null;
  let activeTrialNumber = isWriting && !hasWritingTrialPicker ? data?.cases?.[0]?.trialNumber ?? 1 : 1;
  const requestedSettingId = new URLSearchParams(window.location.search).get('setting');
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
    || (!isWriting && data.benchmarkResults.length !== expectedResponseCount)
    || (isWriting && (!Number.isInteger(writingTrialCount) || writingTrialCount < 1 || !Array.isArray(data.cases) || !data.cases.length || !Array.isArray(data.caseResults) || !Array.isArray(data.caseSummaries) || !Array.isArray(data.scoreBasis?.dimensions) || !data.scoreBasis.dimensions.length))
  ) {
    reportView.innerHTML = `
      <section class="development-unavailable" role="alert">
        <p class="ui-eyebrow">Benchmark data unavailable</p>
        <h1>REPORT COULD NOT BE VERIFIED</h1>
        <p>The public dataset must provide one complete Minimal baseline and skill result for every matched setting and frozen task. No partial report is shown.</p>
      </section>
    `;
    return;
  }

  const benchmarkById = new Map(data.benchmarks.map((benchmark) => [benchmark.id, benchmark]));
  const summaryById = new Map(data.benchmarkSummaries.map((summary) => [summary.benchmarkId, summary]));
  const categoryById = new Map(data.categories.map((category) => [category.id, category]));
  const settingById = new Map(data.settings.map((setting) => [setting.id, setting]));
  const settingByConfigurationId = new Map([...rootData.settings, ...data.settings].map((setting) => [setting.configurationId, setting]));
  const expectedJudgeConfigurationIds = Array.isArray(data.scoreBasis?.judges) ? data.scoreBasis.judges : [];
  const messageSetById = new Map((hasResponseCollections ? responseData.messageSets : []).map((messageSet) => [messageSet.id, messageSet]));
  const promptFileById = new Map((responseData?.promptFiles || []).map(file => [file.id, file]));
  const caseById = new Map((data.cases || []).map(story => [story.id, story]));
  const caseSummaryById = new Map((data.caseSummaries || []).map(summary => [summary.caseId, summary]));
  const trialSummaryKey = (caseId, trialNumber) => `${caseId}\u0000${trialNumber}`;
  const trialSummaryByKey = new Map((data.trialSummaries || []).map(summary => [trialSummaryKey(summary.caseId, summary.trialNumber), summary]));
  const actualTrialNumber = row => row.trialNumber ?? caseById.get(row.caseId)?.trialNumber ?? 1;
  const hasValidWritingTrial = row => Number.isInteger(actualTrialNumber(row)) && (hasWritingTrialPicker
    ? actualTrialNumber(row) >= 1 && actualTrialNumber(row) <= writingTrialCount
    : actualTrialNumber(row) === (caseById.get(row.caseId)?.trialNumber ?? 1));
  const responseKey = (benchmarkId, settingId, condition, caseId = activeCaseId, trialNumber = activeTrialNumber) => `${benchmarkId}\u0000${settingId}\u0000${condition}${isWriting ? `\u0000${caseId}\u0000${trialNumber}` : ''}`;
  const responseByKey = new Map((hasResponseCollections ? responseData.responses : []).map((response) => [
    responseKey(response.benchmarkId, response.settingId, response.condition, response.caseId, actualTrialNumber(response)),
    response
  ]));
  const reportResults = isWriting ? data.caseResults : data.benchmarkResults;
  const benchmarkResultByKey = new Map(reportResults.map((result) => [
    responseKey(result.benchmarkId, result.settingId, result.condition, result.caseId, actualTrialNumber(result)),
    result
  ]));
  const referencedMessageSetIds = new Set((hasResponseCollections ? responseData.responses : []).map((response) => response.messageSetId));
  const hasCompleteResponseMatrix = isWriting ? hasResponseCollections
    && expectedJudgeConfigurationIds.length === Number(data.scoreBasis?.judgeCount)
    && expectedJudgeConfigurationIds.length > 0
    && messageSetById.size === responseData.messageSets.length
    && responseByKey.size === responseData.responses.length
    && benchmarkResultByKey.size === reportResults.length
    && caseById.size === data.cases.length
    && data.cases.every(story => caseSummaryById.has(story.id))
    && (!hasWritingTrialPicker || (trialSummaryByKey.size === data.cases.length * writingTrialCount && data.cases.every(story => Array.from({ length: writingTrialCount }, (_, index) => index + 1).every(trial => trialSummaryByKey.has(trialSummaryKey(story.id, trial))))))
    && reportResults.every(result => hasValidWritingTrial(result))
    && responseData.responses.every(response => (
      benchmarkById.has(response.benchmarkId)
      && caseById.has(response.caseId)
      && hasValidWritingTrial(response)
      && benchmarkResultByKey.has(responseKey(response.benchmarkId, response.settingId, response.condition, response.caseId, actualTrialNumber(response)))
      && settingById.get(response.settingId)?.configurationId === response.configurationId
      && REQUIRED_CONDITION_IDS.includes(response.condition)
      && typeof response.outputText === 'string'
      && (!response.outputText.length || messageSetById.has(response.messageSetId))
      && Array.isArray(response.judgments)
      && response.judgments.every(judgment => (
        expectedJudgeConfigurationIds.includes(judgment.judgeConfigurationId)
        && (judgment.score === null || (Number.isFinite(judgment.score) && judgment.score >= 0 && judgment.score <= 100))
        && typeof judgment.rationale === 'string'
        && (judgment.score === null || data.scoreBasis.dimensions.every(dimension => {
          const reading = judgment.dimensions?.[dimension.id];
          return Number.isFinite(reading?.rating) && reading.rating >= (data.scoreBasis.ratingMinimum ?? 0) && reading.rating <= data.scoreBasis.ratingMaximum && (reading.reason === null || typeof reading.reason === 'string');
        }))
      ))
    ))
    && responseData.messageSets.every(messageSet => Array.isArray(messageSet.messages) && messageSet.messages.every(message => (
      typeof message.role === 'string' && (typeof message.content === 'string' || promptFileById.has(message.fileId))
    )))
    : hasResponseCollections
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
        && (response.outputText.length > 0 || (isWorkSpec && response.judgments?.every(judgment => judgment.assessmentStatus === 'invalid candidate')))
        && Array.isArray(response.judgments)
        && response.judgments.length === expectedJudgeConfigurationIds.length
        && response.judgments.every((judgment, judgmentIndex) => (
          judgment?.judgeConfigurationId === expectedJudgeConfigurationIds[judgmentIndex]
          && (isWorkSpec ? (
            (judgment.score === null || (Number.isFinite(judgment.score) && judgment.score >= 0 && judgment.score <= 100))
            && typeof judgment.readiness === 'string'
            && typeof judgment.assessmentStatus === 'string'
            && judgment.dimensions && typeof judgment.dimensions === 'object'
            && ['V', 'G', 'A', 'D', 'S', 'C'].every((id) => Object.hasOwn(judgment.dimensions, id))
          ) : (
            settingByConfigurationId.has(judgment.judgeConfigurationId)
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
          ))
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
        <p>This report requires one complete Minimal baseline and skill transcript for every published model setting and benchmark. No partial response evidence is shown.</p>
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
  const TRIALS_PER_TASK = isWriting && data.cohortSummaries ? 1 : Number.isFinite(Number(scoreBasis.trialsPerTask)) && Number(scoreBasis.trialsPerTask) > 0
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
  const taskCoverageLabel = isWriting && data.cohortSummaries ? `${data.coverage.promptCount} prompts · ${data.cases.length} matched pairs` : `${isWriting ? data.cases.length : TASK_COUNT} ${isWriting ? writingCasePlural : TASK_COUNT === 1 ? 'task' : 'tasks'} × ${TRIALS_PER_TASK} ${TRIALS_PER_TASK === 1 ? 'trial' : 'trials'}`;
  const developmentDisclosure = `${SCORE_EDITION_LABEL} · ${taskCoverageLabel} · ${JUDGE_COUNT} judges${isWorkSpec || isWriting ? ' · Uncalibrated development' : ''}`;
  const writingInProgress = isWriting && (typeof data.coverage.executionComplete === 'boolean' ? !data.coverage.executionComplete : data.coverage.judgmentCount < data.coverage.expectedJudgmentCount || data.coverage.completedSettingCount < data.coverage.settingCount);
  const writingFinalExclusions = isWriting && data.coverage.executionStatus === 'complete-with-exclusions';
  const writingProgressStatus = writingFinalExclusions ? `FINAL SNAPSHOT · ${data.coverage.terminallyExcludedPairCount} EXCLUDED ${data.coverage.terminallyExcludedPairCount === 1 ? 'PAIR' : 'PAIRS'}` : writingInProgress ? 'IN PROGRESS' : 'COMPLETE SNAPSHOT';
  const usesConsensusScoring = scoreBasis.aggregation === 'unanimity-gates-mean-dimensions-v1';
  const panelMethod = isWriting ? data.scoreBasis.panelMethod || 'Each answer is scored on the published rubric. Inspect the independent ratings and reasons below.' : isWorkSpec
    ? 'Each judge rates value (25%), grounding (15%), acceptance (20%), delivery (15%), scope (15%), and coherence (10%) from 0 to 4. Their weighted totals are averaged only when both assessments and all dimensions are assessable. Readiness is a separate verdict; judge disagreement remains unresolved.'
    : usesConsensusScoring
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

  const formatScore = (value) => Number.isFinite(value) ? value.toFixed(1) : isWriting ? '—' : 'Not assessable';
  const dimensionLabels = { V: 'Value', G: 'Grounding', A: 'Acceptance', D: 'Delivery', S: 'Scope', C: 'Coherence' };

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

  const signed = (value) => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(1)}` : isWriting ? '—' : 'Not assessable';
  const selectedTrialFor = (caseId, trialNumber) => hasWritingTrialPicker
    ? Number.isInteger(trialNumber) && trialNumber >= 1 && trialNumber <= writingTrialCount ? trialNumber : 1
    : caseById.get(caseId)?.trialNumber ?? 1;
  const reportHash = (benchmarkId, caseId = activeCaseId, trialNumber = activeTrialNumber, section = null) => `#${benchmarkId}${isWriting ? `/${caseId}${hasWritingTrialPicker ? `/trial-${trialNumber}` : ''}` : ''}${section ? `/${section}` : ''}`;
  const parseRoute = () => {
    const [benchmarkId, caseOrSection, caseSection, trialSection] = decodeURIComponent(window.location.hash.slice(1)).split('/');
    const caseId = isWriting && caseById.has(caseOrSection) ? caseOrSection : null;
    const hasTrialSegment = Boolean(caseId && caseSection?.startsWith('trial-'));
    const trialNumber = hasTrialSegment && /^trial-[1-9]\d*$/.test(caseSection) ? Number(caseSection.slice(6)) : null;
    const candidateSection = caseId ? hasTrialSegment ? trialSection : caseSection : caseOrSection;
    return {
      benchmarkId,
      caseId,
      trialNumber: selectedTrialFor(caseId || activeCaseId, trialNumber),
      section: routeSections.has(candidateSection) ? candidateSection : null
    };
  };
  const categoryBenchmarks = (categoryId) => data.benchmarks.filter((benchmark) => benchmark.category === categoryId);

  const hydrateSectionLinks = (benchmarkId, requestedSection = 'overview') => {
    const currentSection = ['ranking', 'method', 'limitations'].includes(requestedSection)
      ? requestedSection
      : 'overview';
    document.querySelectorAll('[data-report-section]').forEach((link) => {
      link.href = reportHash(benchmarkId, activeCaseId, activeTrialNumber, link.dataset.reportSection);
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
    const baselineRows = reportResults.filter((result) => (
      result.benchmarkId === benchmark.id && result.condition === 'baseline' && (!isWriting || (result.caseId === activeCaseId && actualTrialNumber(result) === activeTrialNumber))
    ));
    const treatmentRows = reportResults.filter((result) => (
      result.benchmarkId === benchmark.id && result.condition === 'skill' && (!isWriting || (result.caseId === activeCaseId && actualTrialNumber(result) === activeTrialNumber))
    ));

    const rows = isWriting ? data.settings.map(setting => treatmentRows.find(result => result.settingId === setting.id) || { settingId: setting.id, score: null, exactScore: null }) : treatmentRows;
    return rows.map((treatment) => {
      const baseline = baselineRows.find((candidate) => candidate.settingId === treatment.settingId) || (isWriting ? { score: null, exactScore: null } : null);
      const setting = settingById.get(treatment.settingId);
      if (!baseline || !setting) return null;
      return {
        setting,
        baselineResponse: responseByKey.get(responseKey(benchmark.id, setting.id, 'baseline')) || null,
        treatmentResponse: responseByKey.get(responseKey(benchmark.id, setting.id, 'skill')) || null,
        baseline: baseline.score,
        treatment: treatment.score,
        baselineRankingScore: isWorkSpec || isWriting ? baseline.exactScore ?? baseline.score : baseline.score,
        treatmentRankingScore: isWorkSpec || isWriting ? treatment.exactScore ?? treatment.score : treatment.score,
        delta: Number.isFinite(treatment.score) && Number.isFinite(baseline.score)
          ? isWriting ? Math.round(((treatment.exactScore ?? treatment.score) - (baseline.exactScore ?? baseline.score)) * 10) / 10 : isWorkSpec ? setting.deltas.skill : Math.round((treatment.score - baseline.score) * 10) / 10
          : null
      };
    }).filter(Boolean).sort((a, b) => (
      (b.treatmentRankingScore ?? -1) - (a.treatmentRankingScore ?? -1)
      || (b.baselineRankingScore ?? -1) - (a.baselineRankingScore ?? -1)
      || a.setting.label.localeCompare(b.setting.label)
    )).map((row, index, rows) => ({
      ...row,
      rank: Number.isFinite(row.treatmentRankingScore)
        ? isWorkSpec || isWriting ? rows.findIndex(candidate => candidate.treatmentRankingScore === row.treatmentRankingScore) + 1 : index + 1
        : null
    }));
  };

  const truthMarkup = () => `
    <aside class="evidence-truth" aria-label="${escapeHTML(developmentDisclosure)}">
      <strong class="evidence-truth__kind">${escapeHTML(developmentDisclosure)}</strong>
      <p>${escapeHTML(TREATMENT_LABEL)} vs ${escapeHTML(BASELINE_LABEL)} · fixed rubric /${SCORE_MAXIMUM}</p>
      <span aria-hidden="true"></span>
    </aside>
  `;

  const writingCohortsMarkup = () => {
    if (!isWriting || !data.cohortSummaries) return '';
    const labels = { primary: 'Primary prompt · headline result', transfer: 'Secondary prompts · all', fantasyTransfer: 'Secondary · fantasy', otherGenreTransfer: 'Secondary · other genres' };
    const primaryPrompt = data.cases.find(story => story.cohort === 'primary')?.prompt || '';
    return `<section class="writing-cohorts" data-writing-cohorts aria-labelledby="writing-cohorts-title"><h3 id="writing-cohorts-title">Primary and secondary results</h3><p data-primary-question>${escapeHTML(primaryPrompt)}</p><p data-writing-design>${data.coverage.promptCount} distinct prompts · ${data.cases.length} matched pairs. The primary prompt has ${data.cohortSummaries.primary.expectedPairs} repetitions; each of ${data.cohortSummaries.transfer.sourcePromptCount} secondary prompts has ${data.cohortSummaries.transfer.expectedPairs / data.cohortSummaries.transfer.sourcePromptCount} repetitions.</p><p>The headline uses the primary prompt only. Each mean uses complete paired repetitions, with equal weight per available source prompt. The two secondary subgroups partition the secondary results.</p><div class="writing-cohorts__table" role="region" aria-label="Primary and secondary score comparison" tabindex="0"><table><thead><tr><th scope="col">Prompt group</th><th scope="col">${escapeHTML(BASELINE_LABEL)} /100</th><th scope="col">${escapeHTML(TREATMENT_LABEL)} /100</th><th scope="col">Paired difference</th><th scope="col">Complete pairs</th></tr></thead><tbody>${Object.entries(labels).filter(([id]) => data.cohortSummaries[id]).map(([id, label]) => {
      const cohort = data.cohortSummaries[id];
      return `<tr data-writing-cohort="${id}"><th scope="row">${escapeHTML(label)}</th><td data-cohort-baseline>${formatScore(cohort.baseline)}</td><td data-cohort-treatment>${formatScore(cohort.treatment)}</td><td data-cohort-delta>${signed(cohort.delta)}</td><td data-cohort-coverage>${cohort.usablePairs}/${cohort.expectedPairs}${cohort.complete ? '' : ' · incomplete'}</td></tr>`;
    }).join('')}</tbody></table></div>${data.adherenceCoverage ? `<p data-writing-adherence>Reference-read proof: ${data.adherenceCoverage.verifiedTreatmentAnswers}/${data.adherenceCoverage.returnedTreatmentAnswers} returned treatment answers have complete recorded proof; ${data.adherenceCoverage.observedChunkCount}/${data.adherenceCoverage.requiredChunkCount} required chunks have recorded byte evidence. Answers with incomplete proof remain in the invocation comparison. Missing proof does not establish refusal.</p>` : ''}<p>Repetitions are the writing samples; judge votes are repeated assessments of those samples. These results describe this prompt set and model setting.</p></section>`;
  };

  const writingProgressMarkup = () => {
    if (!isWriting) return '';
    const coverage = data.coverage;
    const failures = data.caseResults.filter(cell => ['error', 'unavailable'].includes(cell.status)).length;
    const exclusionDisclosure = writingFinalExclusions ? `${coverage.validResponseCount} valid final answers; ${coverage.terminalGenerationFailureCount} failed full-read verifications are retained. ${coverage.judgmentCount} completed judge reviews and ${coverage.terminallyExcludedJudgmentCount} terminally excluded reviews account for all ${coverage.expectedJudgmentCount} planned reviews. No judge reviews are pending. ` : '';
    return `<aside class="writing-progress" data-writing-progress aria-label="Writing benchmark progress">
      <div class="writing-progress__heading"><strong class="writing-progress__status" data-writing-progress-status>${escapeHTML(writingProgressStatus)}</strong><a class="writing-progress__link" data-writing-browse-answers href="#ranking" data-report-section="ranking">Browse answers &amp; reviews ↓</a></div>
      <p class="writing-progress__counts"><span data-writing-progress-count="answers">${coverage.responseCount}/${coverage.expectedResponseCount} final answers</span><span data-writing-progress-count="reviews">${coverage.judgmentCount}/${coverage.expectedJudgmentCount} ${data.cohortSummaries ? 'planned answer assessments' : 'planned judge reviews'}</span>${data.cohortSummaries ? `<span data-writing-progress-count="pair-reviews">${data.pairwisePreferences.length}/${data.cases.length * JUDGE_COUNT} blind pair reviews</span>` : ''}<span data-writing-progress-count="panels">${coverage.scoredResponseCount}/${coverage.expectedResponseCount} complete ${JUDGE_COUNT}-judge answer panels</span></p>
      <p data-writing-progress-disclosure>${exclusionDisclosure}${writingInProgress ? 'Judging incomplete; available answers and reviews are published. ' : ''}Case scores require the full judge panel. Incomplete configurations are not ranked.${failures && !writingFinalExclusions ? ` ${failures} failed generations are retained; planned totals include unavailable slots.` : ''}</p>
    </aside>`;
  };

  const heroMarkup = (benchmark, summary) => {
    const record = `${summary.wins}W · ${summary.ties}T · ${summary.losses}L`;
    const regressionClass = summary.delta < 0 ? ' is-regression' : '';
    const story = isWriting ? caseById.get(activeCaseId) : null;
    const sampleLabel = hasWritingTrialPicker ? 'trial' : data.cohortSummaries ? 'repetition' : writingCaseLabel;
    const measuredSettingCount = isWriting ? modelPreviewRows(benchmark).filter(row => Number.isFinite(row.baseline) && Number.isFinite(row.treatment)).length : SETTING_COUNT;
    return `
      <section class="evidence-hero" id="overview" aria-labelledby="report-title">
        <div class="evidence-hero__identity">
          <p class="evidence-hero__eyebrow">${escapeHTML(benchmark.suite)} · benchmark result</p>
          <h1 id="report-title">${escapeHTML(benchmark.name)}</h1>
          ${story ? `<p class="writing-case-title" data-writing-case-title>${escapeHTML(story.title)}</p>` : ''}
          <p class="evidence-hero__description">${escapeHTML(benchmark.description)}</p>
          <p class="evidence-hero__prompt" data-exact-question><span>Prompt under test</span>${escapeHTML(story?.prompt || benchmark.prompt)}</p>
        </div>

        <div class="evidence-hero__result" aria-label="Matched condition result">
          <div class="matched-result">
            <dl class="matched-result__condition matched-result__condition--baseline">
              <dt>${escapeHTML(summary.baselineLabel)}</dt>
              <dd><strong>${formatScore(summary.baseline)}</strong><small>${isWriting ? `${escapeHTML(sampleLabel)} ` : ''}field mean /${SCORE_MAXIMUM} · n=${measuredSettingCount}</small></dd>
            </dl>
            <span class="matched-result__arrow" aria-hidden="true">→</span>
            <dl class="matched-result__condition matched-result__condition--treatment">
              <dt>${escapeHTML(summary.treatmentLabel)}</dt>
              <dd><strong>${formatScore(summary.treatment)}</strong><small>${isWriting ? `${escapeHTML(sampleLabel)} ` : ''}field mean /${SCORE_MAXIMUM} · n=${measuredSettingCount}</small></dd>
            </dl>
          </div>
          <dl class="matched-result__delta${regressionClass}">
            <dt>Mean paired uplift</dt>
            <dd>${signed(summary.delta)} pts</dd>
          </dl>
          <dl class="evidence-facts">
            <div><dt>Coverage</dt><dd>${SETTING_COUNT} settings × ${CONDITION_COUNT} conditions × ${hasWritingTrialPicker ? '1 selected trial' : `${TRIALS_PER_TASK} ${TRIALS_PER_TASK === 1 ? 'trial' : 'trials'}`}${isWriting ? ` · ${measuredSettingCount} assessable pairs on this ${escapeHTML(sampleLabel)}` : ''}</dd></div>
            <div><dt>Matched record</dt><dd>${record}</dd></div>
            <div><dt>Source run</dt><dd>${escapeHTML(summary.runId || 'Not published')}</dd></div>
            ${hasWritingTrialPicker ? `<div><dt>${escapeHTML(data.trialLabel || 'Trial')}</dt><dd data-writing-trial-title>${activeTrialNumber} of ${writingTrialCount}</dd></div>` : ''}
            ${story && data.cohortSummaries ? `<div><dt>Prompt group</dt><dd>${escapeHTML(story.cohort || story.group || 'See study summaries')}</dd></div><div><dt>${escapeHTML(data.trialLabel || 'Repetition')}</dt><dd>${escapeHTML(story.trialNumber)}</dd></div>` : ''}
            ${story && !data.cohortSummaries && benchmark.taskKind !== 'story-outline' ? `<div><dt>Story version</dt><dd>${escapeHTML([story.creator, story.medium, story.version].filter(Boolean).join(' · '))}</dd></div><div><dt>Corpus stratum</dt><dd>${escapeHTML(story.familiarity || 'Not classified')}${story.familiarityBasis ? ` · ${escapeHTML(story.familiarityBasis)}` : ''}. Training exposure: ${escapeHTML(story.trainingExposure || 'unknown')}.</dd></div>` : ''}
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
            <p>${JUDGE_COUNT} fixed judges—${escapeHTML(panelLabel)}—score each answer against this task's ${isWriting ? scoreBasis.range.minimum : 0}–${SCORE_MAXIMUM} rubric. ${escapeHTML(panelMethod)} There is no synthesizer. Adding a model within this edition can change rank, while its existing scores stay fixed.</p>
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
        ${isWriting && promptFileById.has(message.fileId) ? `<button class="writing-prompt-reference" type="button" data-open-prompt-file="${escapeHTML(message.fileId)}">Read shared ${escapeHTML(promptFileById.get(message.fileId).title || 'frozen prompt file')} ↗</button>` : ''}
      </li>
    `;
  };

  const gateLabel = (gateId) => String(gateId)
    .split('-')
    .filter(Boolean)
    .map((part, partIndex) => partIndex === 0 ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part)
    .join(' ');

  const writingEvidenceFieldsMarkup = (source, fields, attribute) => fields
    .filter(([key]) => source && Object.hasOwn(source, key))
    .map(([key, label]) => `<div><dt>${escapeHTML(label)}</dt><dd ${attribute}="${escapeHTML(key)}"><code>${escapeHTML(source[key] === null ? 'Not reported' : String(source[key]))}</code></dd></div>`)
    .join('');

  const writingUsageMarkup = usage => usage ? `<h4>Saved CLI-normalized token usage</h4><dl class="writing-evidence-fields">${writingEvidenceFieldsMarkup(usage, [
    ['inputTokens', 'Input tokens'], ['cachedInputTokens', 'Cached input tokens'], ['cacheWriteInputTokens', 'Cache-write input tokens'],
    ['cacheCreationInputTokens', 'Cache-creation input tokens'], ['cacheReadInputTokens', 'Cache-read input tokens'],
    ['outputTokens', 'Output tokens'], ['reasoningOutputTokens', 'Reasoning output tokens'], ['totalTokens', 'Reported total tokens']
  ], 'data-resource-usage')}</dl><p>Counts use provider-native tokenizers and are not directly comparable. Existing CLI normalizers may fill missing components with zero, so a saved zero does not prove the provider reported zero. Cached and reasoning counts are components, not extra amounts to add to totals. “Not reported” means absent from the saved receipt.</p>` : '';

  const writingRequiredReadsMarkup = receipt => !receipt ? '' : `<section data-required-skill-reads>
    <h4>Required frozen-file read verification</h4>
    <p>Saved verification status: <strong data-required-read-status>${escapeHTML(receipt.status)}</strong>. Only successful command output matching every required frozen chunk establishes a complete read.</p>
    <dl class="writing-evidence-fields">${writingEvidenceFieldsMarkup(receipt, [['policyVersion', 'Verification policy'], ['evidence', 'Evidence method']], 'data-required-read-field')}</dl>
    ${(receipt.files || []).map(file => `<details class="work-spec-assessment" data-required-read-file="${escapeHTML(file.relativePath)}"><summary class="work-spec-assessment__summary">${escapeHTML(file.relativePath)} · ${file.observedChunks.length}/${file.requiredChunkCount} required chunks · ${file.complete ? 'complete' : 'incomplete'}</summary><div class="work-spec-assessment__body"><dl class="writing-evidence-fields">${writingEvidenceFieldsMarkup(file, [['bytes', 'Frozen file bytes'], ['sha256', 'Frozen file SHA-256'], ['requiredChunkCount', 'Required chunks']], 'data-required-read-file-field')}<div><dt>Verified chunks</dt><dd data-required-read-observed-count>${file.observedChunks.length}</dd></div></dl><h4>Recorded matching chunks</h4><dl class="writing-evidence-fields">${file.observedChunks.map(chunk => `<div data-required-read-chunk="${chunk.index}"><dt>Chunk ${chunk.index} · ${chunk.bytes} bytes</dt><dd><code>${escapeHTML(chunk.sha256)}</code></dd></div>`).join('')}</dl></div></details>`).join('')}
  </section>`;

  const writingInvocationReadProofMarkup = receipt => !receipt ? '' : `<details class="work-spec-assessment" data-writing-required-reads><summary class="work-spec-assessment__summary">Required reference-read evidence · ${escapeHTML(receipt.status)}</summary><div class="work-spec-assessment__body"><p data-required-read-coverage>${receipt.observedChunkCount}/${receipt.requiredChunkCount} required chunks have recorded byte evidence. ${receipt.status === 'complete' ? 'The required-read proof is complete.' : 'The required-read proof is incomplete; this valid answer remains in the invocation comparison. Missing proof does not establish refusal.'}</p><dl class="writing-evidence-fields">${writingEvidenceFieldsMarkup(receipt, [['policyVersion', 'Read policy'], ['status', 'Proof status']], 'data-required-read-field')}</dl>${writingRequiredReadsMarkup(receipt)}</div></details>`;

  const writingExecutionMarkup = response => {
    const runtime = response?.runtime;
    if (!isWriting || !runtime) return '';
    return `<details class="work-spec-assessment writing-execution" data-writing-execution>
      <summary class="work-spec-assessment__summary">Recorded execution evidence</summary>
      <div class="work-spec-assessment__body">
        <p>These are the saved execution labels. A CLI request is not provider confirmation of the model or effort. Observed collaboration events do not establish the number of underlying agents; zero means no such events were recorded.</p>
        <dl class="writing-evidence-fields">${writingEvidenceFieldsMarkup(runtime, [
          ['freshSession', 'Fresh session'], ['executionMode', 'Execution mode'], ['modelVerification', 'Model verification'],
          ['reasoningVerification', 'Reasoning verification'], ['observedCollaborationEvents', 'Observed collaboration events'],
          ['rawProviderStreamRetained', 'Raw provider stream retained'], ['durationMs', 'Generation duration (ms)']
        ], 'data-runtime-field')}${writingEvidenceFieldsMarkup(response, [['characterCount', 'Answer characters (Unicode code points)']], 'data-response-field')}</dl>
        ${writingUsageMarkup(runtime.usage)}
        ${data.cohortSummaries ? writingInvocationReadProofMarkup(runtime.requiredSkillReads) : writingRequiredReadsMarkup(runtime.requiredSkillReads)}
        ${Array.isArray(runtime.referenceFilesRead) ? `<h4>Recorded reference-file reads</h4>${runtime.referenceFilesRead.length ? `<ul class="writing-reference-reads" data-reference-files-read>${runtime.referenceFilesRead.map(reference => {
          const file = reference === 'SKILL.md' ? promptFileById.get('frozen-skill-root') : [...promptFileById.values()].find(file => file.title === reference || file.title?.startsWith(`${reference} · `));
          return `<li>${file ? `<button class="writing-prompt-reference" type="button" data-open-prompt-file="${escapeHTML(file.id)}" aria-label="Read archived ${escapeHTML(reference)}"><code data-reference-path>${escapeHTML(reference)}</code> <span aria-hidden="true">↗</span></button>` : `<code data-reference-path>${escapeHTML(reference)}</code>`}</li>`;
        }).join('')}</ul>` : '<p data-reference-files-read>No reference-file reads recorded.</p>'}` : ''}
      </div>
    </details>`;
  };

  const writingJudgeResourcesMarkup = judgment => judgment.resources ? `<details class="work-spec-assessment writing-judge-resources" data-judge-resources><summary class="work-spec-assessment__summary">Shared judge-batch resources</summary><div class="work-spec-assessment__body"><p>These resources cover the entire matched-pair batch, not this answer alone. The same batch is recorded on both answers; count each judge and prompt SHA-256 once when totaling resources.</p><dl class="writing-evidence-fields">${writingEvidenceFieldsMarkup(judgment.resources, [['scope', 'Resource scope'], ['candidateCount', 'Candidates in batch'], ['durationMs', 'Batch duration (ms)']], 'data-judge-resource')}${writingEvidenceFieldsMarkup(judgment, [['promptSha256', 'Judge prompt SHA-256']], 'data-judge-resource')}</dl>${writingUsageMarkup(judgment.resources.usage)}</div></details>` : '';

  const writingCitationsMarkup = evidence => typeof evidence === 'string' ? `<p data-cited-evidence>${escapeHTML(evidence)}</p>` : !Array.isArray(evidence) || !evidence.length ? '' : `<ul data-cited-evidence>${evidence.map(item => `<li>${typeof item === 'string' ? `<span data-evidence-reference>${escapeHTML(item)}</span>` : `${item.quote ? `<blockquote data-evidence-quote>${escapeHTML(item.quote)}</blockquote>` : ''}${item.reference ? `<span data-evidence-reference>${escapeHTML(item.reference)}</span>` : ''}`}</li>`).join('')}</ul>`;

  const writingFlagLabel = id => ({ fundamentalRepairRequired: 'Fundamental repair required', taskNoncompletion: 'Task noncompletion' })[id] || gateLabel(id.replaceAll('_', '-'));
  const writingFlagsMarkup = flags => !flags || !Object.keys(flags).length ? '' : `<details class="work-spec-assessment" data-judge-flags><summary class="work-spec-assessment__summary">Completion and repair flags</summary><div class="work-spec-assessment__body"><dl>${Object.entries(flags).map(([id, flag]) => `<div data-judge-flag="${escapeHTML(id)}"><dt>${escapeHTML(writingFlagLabel(id))}</dt><dd>${escapeHTML(typeof flag === 'boolean' ? flag ? 'Flagged' : 'Not flagged' : flag?.value ? 'Flagged' : 'Not flagged')}${flag?.reason || flag?.rationale ? ` · <span data-flag-reason>${escapeHTML(flag.reason || flag.rationale)}</span>` : ''}</dd></div>`).join('')}</dl></div></details>`;

  const writingPairwiseMarkup = () => {
    if (!isWriting || !Array.isArray(data.pairwisePreferences)) return '';
    const preferences = data.pairwisePreferences.filter(preference => preference.caseId === activeCaseId);
    const label = condition => data.conditions.find(item => item.id === condition)?.label || condition;
    return `<section class="report-section" data-writing-pairwise><h3>Direct pairwise preferences</h3><p>These preferences are separate from the rubric totals. Both anonymous candidates were visible while each judge scored them; the judges received opposite candidate orders.</p>${preferences.length ? preferences.map(preference => `<details class="work-spec-assessment" data-pairwise-review="${escapeHTML(preference.reviewerId)}"><summary class="work-spec-assessment__summary">${escapeHTML(preference.reviewerId)} · ${preference.winner === 'tie' ? 'Tie' : escapeHTML(label(preference.winner))} · ${escapeHTML(preference.confidence)} confidence</summary><div class="work-spec-assessment__body">${preference.candidateACondition && preference.candidateBCondition ? `<p data-candidate-order>A: ${escapeHTML(label(preference.candidateACondition))} · B: ${escapeHTML(label(preference.candidateBCondition))}</p>` : ''}<p data-preference-reason>${escapeHTML(preference.reason)}</p></div></details>`).join('') : '<p>Pairwise reviews are not available for this repetition.</p>'}</section>`;
  };

  const writingFlagRatesMarkup = () => !isWriting || !Array.isArray(data.flagRates) ? '' : `<details class="work-spec-assessment" data-writing-flag-rates><summary class="work-spec-assessment__summary">Completion and repair flags across reviewed answers</summary><div class="work-spec-assessment__body"><p>An answer is counted when either judge raises the flag. Counts use answers with both reviews; flags do not impose score caps.</p><dl>${data.flagRates.map(row => `<div><dt>${escapeHTML(data.conditions.find(condition => condition.id === row.condition)?.label || row.condition)}</dt><dd>${['fundamentalRepairRequired', 'taskNoncompletion'].map(id => `${escapeHTML(writingFlagLabel(id))}: ${row[id]}/${row.reviewedAnswers}`).join(' · ')}</dd></div>`).join('')}</dl></div></details>`;

  const judgeReviewMarkup = ({ judgment, judgmentIndex }) => {
    const judgeSetting = settingByConfigurationId.get(judgment.judgeConfigurationId);
    const judgeLabel = judgment.judgeLabel || judgeSetting?.label || judgment.judgeConfigurationId;
    if (isWriting) {
      return `<li class="model-run__judge" data-judge-review${judgment.reviewerId ? ` data-reviewer-id="${escapeHTML(judgment.reviewerId)}"` : ''}>
        <header class="model-run__judge-header"><span class="model-run__judge-identity"><strong class="model-run__judge-index">Judge ${String(judgmentIndex + 1).padStart(2, '0')}</strong><span class="model-run__judge-configuration" data-judge-configuration>${escapeHTML(judgeLabel)}</span></span><span class="model-run__judge-score"><strong class="model-run__judge-score-value" data-judge-score>${formatScore(judgment.score)}</strong>${Number.isFinite(judgment.score) ? `<small class="model-run__judge-score-unit">/${SCORE_MAXIMUM}</small>` : ''}</span></header>
        ${judgment.assessmentStatus ? `<p class="model-run__aggregation-note">${escapeHTML(judgment.assessmentStatus)}</p>` : ''}
        ${scoreBasis.dimensions.every(dimension => !judgment.dimensions?.[dimension.id]?.reason) ? '<p class="model-run__aggregation-note">This saved review has one overall rationale, shown below the ratings. Separate dimension reasons were not recorded.</p>' : ''}
        <div class="work-spec-dimensions"><table class="work-spec-dimensions__table writing-dimensions"><caption class="visually-hidden">${scoreBasis.dimensions.length} rubric dimensions and this judge’s reasons</caption><thead><tr><th scope="col">Dimension</th><th scope="col">Rating /${scoreBasis.ratingMaximum}</th><th scope="col">Reason and evidence</th></tr></thead><tbody>${scoreBasis.dimensions.map(dimension => {
          const reading = judgment.dimensions?.[dimension.id];
          return `<tr data-dimension-id="${escapeHTML(dimension.id)}"><th scope="row">${escapeHTML(dimension.label)}${Number.isFinite(dimension.weight) ? `<small class="work-spec-dimensions__weight">${Number(dimension.weight.toFixed(2))}% weight</small>` : ''}</th><td>${Number.isFinite(reading?.rating) ? reading.rating : 'Not assessed'}</td><td><span data-dimension-reason>${escapeHTML(reading?.reason || '—')}</span>${writingCitationsMarkup(reading?.evidence)}</td></tr>`;
        }).join('')}</tbody></table></div><p class="model-run__judge-rationale" data-judge-rationale>${escapeHTML(judgment.rationale)}</p>${writingFlagsMarkup(judgment.flags)}${writingJudgeResourcesMarkup(judgment)}
      </li>`;
    }
    if (isWorkSpec) {
      const fullAssessment = typeof judgment.fullAssessment === 'string'
        ? judgment.fullAssessment
        : JSON.stringify(judgment.assessment || judgment, null, 2);
      return `
        <li class="model-run__judge" data-judge-review>
          <header class="model-run__judge-header">
            <span class="model-run__judge-identity">
              <strong class="model-run__judge-index">Judge ${String(judgmentIndex + 1).padStart(2, '0')}</strong>
              <span class="model-run__judge-configuration" data-judge-configuration>${escapeHTML(judgeLabel)}</span>
            </span>
            <span class="model-run__judge-score"><strong class="model-run__judge-score-value" data-judge-score>${formatScore(judgment.score)}</strong>${Number.isFinite(judgment.score) ? `<small class="model-run__judge-score-unit">/${SCORE_MAXIMUM}</small>` : ''}</span>
          </header>
          <p class="work-spec-verdict" data-judge-readiness>${escapeHTML(judgment.readiness)}</p>
          <p class="model-run__aggregation-note" data-judge-assessment-status>${escapeHTML(judgment.assessmentStatus)}</p>
          <div class="work-spec-dimensions">
            <table class="work-spec-dimensions__table">
              <caption class="visually-hidden">Six weighted rubric dimensions and this judge's reasons</caption>
              <thead><tr><th scope="col">Dimension</th><th scope="col">Rating /4</th><th scope="col">Reason</th></tr></thead>
              <tbody>${Object.entries(dimensionLabels).map(([id, label]) => {
                const dimension = judgment.dimensions[id];
                return `<tr data-dimension-id="${escapeHTML(id)}">
                  <th scope="row">${escapeHTML(id)} · ${escapeHTML(label)}<small class="work-spec-dimensions__weight">${escapeHTML(scoreBasis.weights[id])}% weight</small></th>
                  <td>${Number.isInteger(dimension.rating) ? dimension.rating : 'Not assessable'}</td>
                  <td>${escapeHTML(dimension.reason)}</td>
                </tr>`;
              }).join('')}
              </tbody>
            </table>
          </div>
          <p class="model-run__judge-rationale" data-judge-rationale>${escapeHTML(judgment.rationale)}</p>
          <details class="work-spec-assessment">
            <summary class="work-spec-assessment__summary">Full judge assessment and cited evidence</summary>
            <div class="work-spec-assessment__body">
              ${copyButtonMarkup(fullAssessment, `Copy full assessment from ${judgeLabel}`)}
              <pre class="model-run__text" data-full-assessment><code>${escapeHTML(fullAssessment)}</code></pre>
            </div>
          </details>
        </li>
      `;
    }
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

  const judgingMarkup = ({ judgments, notScored = false }) => {
    const scores = judgments.map((judgment) => judgment.score).filter(Number.isFinite);
    const scoreRange = scores.length > 0 && scores.length === judgments.length
      ? `${Math.min(...scores).toFixed(1)}–${Math.max(...scores).toFixed(1)}`
      : 'Assessment incomplete';
    return `
      <details class="model-run__judging">
        <summary class="model-run__judging-summary">
          <strong class="model-run__judging-title">${isWriting ? judgments.length ? 'Saved judge reviews' : notScored ? 'Not scored' : 'Judgments pending' : 'Why this score'}</strong>
          <span class="model-run__judging-meta">${isWriting ? `${judgments.length}/${JUDGE_COUNT} judges · ${judgments.length === JUDGE_COUNT ? scoreRange : 'Panel incomplete'}` : `${judgments.length} judges · ${scoreRange}`}</span>
          <i class="model-run__judging-mark" aria-hidden="true">↓</i>
        </summary>
        <div class="model-run__judging-body">
          <p class="model-run__aggregation-note">${escapeHTML(panelMethod)} There is no synthesizer. ${isWorkSpec || isWriting ? 'The independent assessments and cited reasons remain available below. Findings are each judge’s conclusions. Judge spread is disagreement, not a confidence interval.' : 'Each note is the saved answer-specific rationale from one independent review, bounded to 600 characters.'}</p>
          ${isWriting ? `<p class="model-run__aggregation-note" data-judge-coverage>${judgments.length}/${JUDGE_COUNT} saved assessments. ${scores.length === JUDGE_COUNT ? `Score disagreement: ${(Math.max(...scores) - Math.min(...scores)).toFixed(1)} rubric points.` : 'A complete score requires the full panel.'}</p>` : ''}
          <ol class="model-run__judges">
            ${judgments.map((judgment, judgmentIndex) => judgeReviewMarkup({ judgment, judgmentIndex })).join('')}
          </ol>
        </div>
      </details>
    `;
  };

  const conditionTranscriptMarkup = ({ condition, response, pairedResponse, score, rowIndex, settingLabel }) => {
    const isBaseline = condition === 'baseline';
    const conditionLabel = isBaseline ? data.conditions.find(condition => condition.id === 'baseline').label : TREATMENT_LABEL;
    const messageSet = messageSetById.get(response?.messageSetId);
    const messages = messageSet?.messages || [];
    const outputText = response?.outputText || '';
    const terminalFailure = candidate => ['error', 'unavailable'].includes(candidate?.status);
    const terminalExcluded = response?.judgingDisposition === 'terminal-excluded';
    const notScored = isWriting && (terminalExcluded || terminalFailure(response) || (outputText.length > 0 && terminalFailure(pairedResponse)));
    const headingId = `model-run-${rowIndex}-${condition}`;
    const modifier = isBaseline ? 'model-run__condition--baseline' : 'model-run__condition--skill';
    const trialLabel = Number.isInteger(response?.trialNumber) ? `${isWriting ? data.trialLabel || 'Trial' : 'Trial'} ${response.trialNumber}` : 'Recorded trial';

    return `
      <section class="model-run__condition ${modifier}" data-condition="${condition}" aria-labelledby="${headingId}">
        <header class="model-run__condition-header">
          <div class="model-run__condition-title">
            <span class="model-run__condition-meta">${escapeHTML(settingLabel)} · ${escapeHTML(trialLabel)} · ${isWriting ? 'saved question and final answer' : 'exact saved exchange'}</span>
            <h3 class="model-run__condition-name" id="${headingId}">${conditionLabel}</h3>
          </div>
          <strong class="model-run__condition-score">${formatScore(score)}${Number.isFinite(score) ? `<small class="model-run__condition-unit">/${SCORE_MAXIMUM}</small>` : ''}</strong>
        </header>
        ${isWorkSpec ? `<p class="work-spec-verdict" data-condition-readiness>${escapeHTML(response.readinessLabel || 'Readiness not reported')}</p>` : ''}
        ${isWriting ? `<p class="writing-answer-status" data-output-word-count="${outputText.trim() ? outputText.trim().split(/\s+/u).length : 0}">${outputText.trim() ? `${outputText.trim().split(/\s+/u).length.toLocaleString()} words · exact final answer` : escapeHTML(response?.failureReason || response?.status || 'No completed answer recorded')}${response?.status && outputText.length ? ` · ${escapeHTML(response.status)}` : ''}</p>` : ''}
        ${terminalExcluded ? `<p class="writing-answer-status" data-writing-exclusion>Not scored: this pair was excluded because ${terminalFailure(response) ? 'this answer' : 'its paired answer'} failed the required full-read verification. Both saved answers remain available; no further judge reviews are planned.${response?.failureReason ? ` ${escapeHTML(response.failureReason)}` : ''}</p>` : ''}
        <details class="model-run__prompt">
          <summary class="model-run__prompt-summary">
            <strong class="model-run__prompt-title">${isWriting ? 'Question &amp; skill context' : 'Input prompt'}</strong>
            <span class="model-run__prompt-meta">${messages.length} ${messages.length === 1 ? 'message' : 'messages'} · ordered</span>
            <i class="model-run__prompt-mark" aria-hidden="true">↓</i>
          </summary>
          <div class="model-run__prompt-body">
            <ol class="model-run__messages">
              ${messages.map((message, messageIndex) => messageMarkup({ message, messageIndex, conditionLabel, settingLabel })).join('')}
            </ol>
          </div>
        </details>
        ${judgingMarkup({ judgments: response?.judgments || [], notScored })}
        ${writingExecutionMarkup(response)}
        <section class="model-run__section" aria-label="Full model output">
          <header class="model-run__section-header">
            <h4 class="model-run__section-title">Full output</h4>
            ${outputText.length ? copyButtonMarkup(outputText, `Copy full output for ${settingLabel}, ${conditionLabel}`) : ''}
          </header>
          ${outputText.length ? `<pre class="model-run__text model-run__text--output" data-output-text><code>${escapeHTML(outputText)}</code></pre>` : `<p class="model-run__judge-rationale" data-output-absence>${isWriting ? 'No completed answer is available for this case and condition.' : 'No work spec was returned for this run. Both independent judgments recorded an invalid candidate.'}</p>`}
        </section>
      </section>
    `;
  };

  const modelRowMarkup = (row, index) => {
    const comparable = Number.isFinite(row.baseline) && Number.isFinite(row.treatment);
    const start = Math.min(row.baseline, row.treatment);
    const width = Math.abs(row.treatment - row.baseline);
    const regressionClass = row.delta < 0 ? ' is-regression' : '';
    const settingLabel = row.setting.label || `${row.setting.family} · ${row.setting.reasoning}`;
    return `
      <li class="model-preview__item" data-report-setting-id="${escapeHTML(row.setting.id)}">
        <details class="model-run"${isWriting && requestedSettingId === row.setting.id ? ' open' : ''}>
          <summary class="model-preview__row${regressionClass}">
            <span class="model-preview__identity"><strong>${escapeHTML(settingLabel)}</strong><small>${row.rank ? `${escapeHTML(TREATMENT_LABEL)} rank #${row.rank} of ${SETTING_COUNT}` : 'Panel total not assessable'}</small></span>
            ${comparable ? `<span
              class="model-preview__plot"
              style="--preview-start:${start}%;--preview-width:${width}%;--preview-baseline:${row.baseline}%;--preview-treatment:${row.treatment}%"
              aria-label="${escapeHTML(BASELINE_LABEL)} ${formatScore(row.baseline)}, ${escapeHTML(TREATMENT_LABEL)} ${formatScore(row.treatment)}"
            >
              <i class="model-preview__axis" aria-hidden="true"></i>
              <i class="model-preview__connector" aria-hidden="true"></i>
              <i class="model-preview__mark model-preview__mark--baseline" aria-hidden="true"></i>
              <i class="model-preview__mark model-preview__mark--treatment" aria-hidden="true"></i>
            </span>` : '<span class="work-spec-unassessable">Panel total not assessable</span>'}
            <span class="model-preview__score"><span>${escapeHTML(BASELINE_SHORT)}</span>${formatScore(row.baseline)}${isWorkSpec ? `<small class="work-spec-summary-readiness" data-summary-readiness="baseline">${escapeHTML(row.baselineResponse.readinessLabel)}</small>` : ''}</span>
            <span class="model-preview__score model-preview__score--treatment"><span>Skill</span>${formatScore(row.treatment)}${isWorkSpec ? `<small class="work-spec-summary-readiness" data-summary-readiness="skill">${escapeHTML(row.treatmentResponse.readinessLabel)}</small>` : ''}</span>
            <span class="model-preview__delta">${signed(row.delta)} pts</span>
            <span class="model-preview__action">Inspect run <i class="model-preview__action-mark" aria-hidden="true">↓</i></span>
          </summary>
          <div class="model-run__comparison">
            ${conditionTranscriptMarkup({
              condition: 'baseline',
              response: row.baselineResponse,
              pairedResponse: row.treatmentResponse,
              score: row.baseline,
              rowIndex: index,
              settingLabel
            })}
            ${conditionTranscriptMarkup({
              condition: 'skill',
              response: row.treatmentResponse,
              pairedResponse: row.baselineResponse,
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
          <h2 id="ranking-title">${escapeHTML(TREATMENT_LABEL)} task scores</h2>
        </div>
        <p>All ${SETTING_COUNT} settings, ordered by ${escapeHTML(TREATMENT_LABEL)} task score. Rank is secondary and can change as the field grows.</p>
      </header>
      <details class="preview-disclosure" open>
        <summary class="preview-disclosure__summary">All ${SETTING_COUNT} matched settings · task score /${SCORE_MAXIMUM}</summary>
        <ol class="model-preview" aria-label="All ${SETTING_COUNT} matched results for ${escapeHTML(TREATMENT_LABEL)} and ${escapeHTML(BASELINE_LABEL)}, ordered by ${escapeHTML(TREATMENT_LABEL)} task score">
          ${modelPreviewRows(benchmark).map(modelRowMarkup).join('')}
        </ol>
      </details>
    </section>
  `;

  const writingCaseEvidenceMarkup = () => {
    if (!isWriting) return '';
    const evidence = caseById.get(activeCaseId)?.evidence;
    if (!evidence) return '';
    const sourceLink = source => {
      let url;
      try { url = new URL(source.url); } catch { return escapeHTML(source.title || source.id); }
      if (!['http:', 'https:'].includes(url.protocol)) return escapeHTML(source.title || source.id);
      return `<a href="${escapeHTML(url.href)}" target="_blank" rel="noreferrer">${escapeHTML(source.title || source.id)} ↗</a>`;
    };
    return `<details class="work-spec-assessment writing-case-evidence" data-writing-case-evidence>
      <summary class="work-spec-assessment__summary">Story evidence supplied to judges</summary>
      <div class="work-spec-assessment__body">
        <p>${escapeHTML(evidence.scope || '')}</p>
        <section><h4>Factual anchors</h4><ul>${(evidence.facts || []).map(fact => `<li>${escapeHTML(fact.statement)}${fact.sourceIds?.length ? `<small>Sources: ${escapeHTML(fact.sourceIds.join(', '))}</small>` : ''}</li>`).join('')}</ul></section>
        ${evidence.admissibleReadings?.length ? `<section><h4>Admissible readings</h4><ul>${evidence.admissibleReadings.map(reading => `<li>${escapeHTML(reading)}</li>`).join('')}</ul></section>` : ''}
        ${evidence.landmines?.length ? `<section><h4>Claims the evidence does not support</h4><ul>${evidence.landmines.map(item => `<li><strong>${escapeHTML(item.claim)}</strong> ${escapeHTML(item.reason)}</li>`).join('')}</ul></section>` : ''}
        <section><h4>Sources and limits</h4><ul>${(evidence.sources || []).map(source => `<li>${sourceLink(source)}<small>${escapeHTML([source.id, source.authority, source.locator, source.verification].filter(Boolean).join(' · '))}</small></li>`).join('')}${(evidence.evidenceLimitations || []).map(limitation => `<li>${escapeHTML(limitation)}</li>`).join('')}</ul></section>
      </div>
    </details>`;
  };

  const methodMarkup = (benchmark, summary) => {
    const limitations = Array.isArray(benchmark.limitations) ? benchmark.limitations : [];
    const writingScoreScope = !isWriting ? '' : data.cohortSummaries
      ? 'The hero shows the selected repetition. The leaderboard uses the primary prompt only; secondary prompts are summarized separately below. Each answer needs the complete judge panel.'
      : hasWritingTrialPicker
        ? `The hero shows the selected trial’s field means over assessable pairs; each row shows one model setting. The ${writingTitle} leaderboard requires all ${writingTrialCount} predeclared trials in both conditions.`
        : `The hero shows the selected ${writingCaseLabel}’s field means over assessable pairs; each row shows one model setting. The ${writingTitle} leaderboard requires scored coverage across the same complete corpus in both conditions.`;
    const writingRubricScope = !isWriting ? '' : data.cohortSummaries
      ? 'Scores cover the published adventure prompts and repetitions. The primary prompt and secondary prompts are reported separately, and Writing is excluded from Overall.'
      : `Scores cover ${benchmark.name.toLowerCase()} on ${data.cases.length} published ${data.cases.length === 1 ? writingCaseLabel : writingCasePlural}${hasWritingTrialPicker ? ` with ${writingTrialCount} trials per condition` : ''}. They do not establish general writing ability, and Writing is excluded from Overall.`;
    const judgingScope = summary.judgingScope;
    const judgingScopeCopy = isWriting ? '' : judgingScope?.strategy === 'appended-rows-only-v1'
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
            <p>Each value is the fixed ${JUDGE_COUNT}-judge panel result for this benchmark's rubric and does not depend on which other models are displayed. ${isWriting ? escapeHTML(writingScoreScope) : `The hero shows field means across ${SETTING_COUNT} settings; each row shows one model setting.`}${isWorkSpec || isWriting ? ' Scores and paired uplifts are rounded separately from the underlying totals.' : ''}</p>
          </section>
          <section>
            <h3>Run details</h3>
            <p>${escapeHTML(UNCERTAINTY_REASON)} Source run ${escapeHTML(summary.runId || 'not published')}.</p>
            ${judgingScopeCopy ? `<p data-judging-scope>${escapeHTML(judgingScopeCopy)}</p>` : ''}
          </section>
        </div>
        ${isWriting ? `<section class="writing-rubric" data-writing-rubric><h3>${scoreBasis.dimensions.length}-dimension rubric</h3><p>${escapeHTML(panelMethod)}</p>${scoreBasis.blinding ? `<p data-writing-blinding>${escapeHTML(typeof scoreBasis.blinding === 'string' ? scoreBasis.blinding : scoreBasis.blinding.description || '')}</p>` : ''}<dl>${scoreBasis.dimensions.map(dimension => `<div data-rubric-dimension="${escapeHTML(dimension.id)}"><dt>${escapeHTML(dimension.label)}${Number.isFinite(dimension.weight) ? ` <span>${Number(dimension.weight.toFixed(2))}%</span>` : ''}</dt><dd><p data-rubric-description>${escapeHTML(dimension.description || '')}</p>${dimension.anchors ? `<details class="writing-rubric-anchors" data-rubric-anchors="${escapeHTML(dimension.id)}"><summary>Rating anchors · ${Object.keys(dimension.anchors).sort((a, b) => Number(a) - Number(b)).join(' / ')}</summary><dl>${Object.keys(dimension.anchors).sort((a, b) => Number(a) - Number(b)).filter(rating => typeof dimension.anchors[rating] === 'string').map(rating => `<div><dt>${escapeHTML(rating)} / ${scoreBasis.ratingMaximum}</dt><dd data-rubric-anchor="${rating}">${escapeHTML(dimension.anchors[rating])}</dd></div>`).join('')}</dl></details>` : ''}</dd></div>`).join('')}</dl><p>${escapeHTML(writingRubricScope)} Word counts are whitespace-delimited counts of the saved final answers; answer length is available for inspection alongside quality.</p></section>
          ${data.methodology?.execution || data.methodology?.resourceAccounting ? `<details class="work-spec-assessment writing-method-execution" data-method-execution><summary class="work-spec-assessment__summary">Execution and resource accounting</summary><div class="work-spec-assessment__body">${data.methodology.resourceAccounting ? `<p data-resource-accounting>${escapeHTML(data.methodology.resourceAccounting)}</p>` : ''}${data.methodology.execution ? `<dl class="writing-evidence-fields">${writingEvidenceFieldsMarkup(data.methodology.execution, [['runnerVersion', 'Runner version'], ['runtimeVersion', 'Runtime version'], ['harnessVersion', 'Harness version'], ['trialCount', 'Trials per condition'], ['primaryRepetitions', 'Primary prompt repetitions'], ['transferRepetitions', 'Repetitions per secondary prompt'], ['generationOrderPolicy', 'Generation order policy'], ['generationOrderSeed', 'Generation order seed']], 'data-method-execution-field')}</dl>` : ''}</div></details>` : ''}
          ${writingCaseEvidenceMarkup()}
          ${data.methodology ? `<details class="work-spec-assessment writing-method-inputs"><summary class="work-spec-assessment__summary">Frozen inputs and corpus fingerprints</summary><div class="work-spec-assessment__body">${data.methodology.generationContract ? `<p>${escapeHTML(data.methodology.generationContract)}</p>` : ''}${data.methodology.blinding ? `<p>${escapeHTML(data.methodology.blinding)}</p>` : ''}${data.methodology.requiredReadPolicy ? `<p data-method-required-read-policy>${escapeHTML(data.methodology.requiredReadPolicy)}</p>` : ''}<dl>${[['Corpus', data.methodology.corpusSha256], ['Rubric', data.methodology.rubricSha256], [`${writingTitle} skill`, data.methodology.skillSha256]].filter(([, digest]) => /^[a-f0-9]{64}$/i.test(digest || '')).map(([label, digest]) => `<div><dt>${label} SHA-256</dt><dd><code>${escapeHTML(digest)}</code></dd></div>`).join('')}${(data.methodology.corpus || []).map(story => `<div><dt>${escapeHTML(story.title)} · question SHA-256</dt><dd>${/^[a-f0-9]{64}$/i.test(story.sha256 || '') ? `<code>${escapeHTML(story.sha256)}</code>` : escapeHTML(story.id)}</dd></div>`).join('')}${(data.methodology.skillFiles || []).filter(file => typeof file.path === 'string' && !file.path.startsWith('/') && /^[a-f0-9]{64}$/i.test(file.sha256 || '')).map(file => `<div><dt>${escapeHTML(file.path)} · skill file SHA-256</dt><dd><code>${escapeHTML(file.sha256)}</code></dd></div>`).join('')}</dl></div></details>` : ''}
          ${[...promptFileById.values()].map(file => `<details class="work-spec-assessment writing-prompt-file" id="writing-prompt-${escapeHTML(file.id)}" data-prompt-file="${escapeHTML(file.id)}"><summary class="work-spec-assessment__summary">${escapeHTML(file.title || 'Shared frozen prompt file')}</summary><div class="work-spec-assessment__body">${copyButtonMarkup(file.content, `Copy ${file.title || 'shared frozen prompt file'}`)}<pre class="model-run__text" data-prompt-file-content><code>${escapeHTML(file.content)}</code></pre></div></details>`).join('')}` : ''}
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
    if (siblings.length < 2) return '';
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
    if (isWriting) {
      activeCaseId = caseById.has(options.caseId) ? options.caseId : activeCaseId;
      activeTrialNumber = selectedTrialFor(activeCaseId, options.trialNumber);
    }
    const selectedWritingSummary = trialSummaryByKey.get(trialSummaryKey(activeCaseId, activeTrialNumber)) || (!hasWritingTrialPicker ? caseSummaryById.get(activeCaseId) : null);
    const summary = isWriting ? { ...summaryById.get(benchmark.id), ...selectedWritingSummary } : summaryById.get(benchmark.id);
    const category = categoryById.get(benchmark.category);
    const returnContext = returnFieldId === 'overall'
      ? { id: 'overall', name: 'Overall' }
      : category;
    const returnHref = `./index.html#capabilities/${returnContext.id}/benchmarks`;
    activeBenchmarkId = benchmark.id;
    copyControlSequence = 0;
    transcriptCopyTextById.clear();

    reportPage.style.setProperty('--report-category', isWriting ? 'var(--category-writing)' : category.color);
    if (isWriting) {
      reportPage.dataset.activeWritingBenchmark = benchmark.id;
      reportPage.dataset.writingSubcategory = writingSubcategory;
      reportPage.dataset.activeWritingCase = activeCaseId;
      reportPage.dataset.activeWritingTrial = String(activeTrialNumber);
    }
    document.title = `${benchmark.name} · VasirBench`;
    if (isWriting) document.title = `${caseById.get(activeCaseId).title}${hasWritingTrialPicker ? ` · Trial ${activeTrialNumber}` : ''} · ${benchmark.name} · VasirBench`;
    if (isWriting) document.querySelector('.benchmark-mast__issue').textContent = `Writing · ${writingFinalExclusions ? 'Final snapshot with exclusions' : writingInProgress ? 'In progress' : 'Complete snapshot'}`;

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
        ${isWriting ? `<section class="writing-case-picker" aria-label="${escapeHTML(writingCaseLabel)}"><label class="field-control field-control--wide"><span>${escapeHTML(writingCaseLabel.charAt(0).toUpperCase() + writingCaseLabel.slice(1))}</span><select data-writing-case aria-label="Choose a ${escapeHTML(writingCaseLabel)}">${data.cases.filter(story => story.benchmarkId === benchmark.id).map(story => `<option value="${escapeHTML(story.id)}"${story.id === activeCaseId ? ' selected' : ''}>${escapeHTML(story.title)}</option>`).join('')}</select></label>${hasWritingTrialPicker ? `<label class="field-control"><span>${escapeHTML(data.trialLabel || 'Trial')}</span><select data-writing-trial aria-label="Choose a trial">${Array.from({ length: writingTrialCount }, (_, index) => index + 1).map(trial => `<option value="${trial}"${trial === activeTrialNumber ? ' selected' : ''}>Trial ${trial} of ${writingTrialCount}</option>`).join('')}</select></label>` : ''}<p>One ${escapeHTML(benchmark.name)} benchmark · ${data.cohortSummaries ? `${data.coverage.promptCount} prompts · ${data.cases.length} matched pairs` : `${data.cases.length} ${escapeHTML(data.cases.length === 1 ? writingCaseLabel : writingCasePlural)}`}${hasWritingTrialPicker ? ` · ${writingTrialCount} trials per condition` : ''} · ${SETTING_COUNT} model settings. Choose a ${escapeHTML(writingCaseLabel)}${hasWritingTrialPicker ? ' and trial' : ''} to inspect its paired answers and judgments.</p></section>` : ''}
        ${truthMarkup()}
        ${writingProgressMarkup()}
        ${heroMarkup(benchmark, summary)}
        ${writingCohortsMarkup()}
        ${overviewMarkup(benchmark)}
        ${rankingMarkup(benchmark)}
        ${writingPairwiseMarkup()}
        ${writingFlagRatesMarkup()}
        ${methodMarkup(benchmark, summary)}
        ${paginationMarkup(benchmark)}
      </div>
    `;

    reportView.querySelectorAll('.model-run, .model-run__prompt, .model-run__judging').forEach((details) => {
      const syncOpenState = () => details.classList.toggle('is-open', details.open);
      details.addEventListener('toggle', syncOpenState);
      syncOpenState();
    });

    const canonicalHash = reportHash(benchmark.id, activeCaseId, activeTrialNumber, options.section);
    if (!benchmarkById.has(benchmarkId) || (isWriting && window.location.hash !== canonicalHash)) {
      window.history.replaceState(null, '', canonicalHash);
    }
    hydrateSectionLinks(benchmark.id, options.section || 'overview');
    if (options.scroll) scrollToSection(options.section || 'top');
    if (isWriting && requestedSettingId && !options.section) {
      window.requestAnimationFrame(() => reportView.querySelector(`[data-report-setting-id="${CSS.escape(requestedSettingId)}"]`)?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    }
  };

  window.addEventListener('hashchange', () => {
    const route = parseRoute();
    if (isWorkflowBenchmark(route.benchmarkId) !== isWorkSpec || isWritingBenchmark(route.benchmarkId) !== isWriting || (isWriting && writingProjectionFor(route.benchmarkId) !== data)) {
      window.location.reload();
      return;
    }
    if (route.benchmarkId === activeBenchmarkId && benchmarkById.has(route.benchmarkId) && (!isWriting || (route.caseId === activeCaseId && route.trialNumber === activeTrialNumber && window.location.hash === reportHash(route.benchmarkId, route.caseId, route.trialNumber, route.section)))) {
      hydrateSectionLinks(route.benchmarkId, route.section || 'overview');
      scrollToSection(route.section || 'top');
      return;
    }
    render(route.benchmarkId, { scroll: true, section: route.section, caseId: route.caseId, trialNumber: route.trialNumber });
  });

  reportView.addEventListener('change', event => {
    if (!isWriting) return;
    const section = parseRoute().section;
    if (event.target.matches('[data-writing-case]') && caseById.has(event.target.value)) {
      window.location.hash = reportHash(activeBenchmarkId, event.target.value, selectedTrialFor(event.target.value, activeTrialNumber), section);
    } else if (hasWritingTrialPicker && event.target.matches('[data-writing-trial]')) {
      window.location.hash = reportHash(activeBenchmarkId, activeCaseId, selectedTrialFor(activeCaseId, Number(event.target.value)), section);
    }
  });

  reportView.addEventListener('click', async (event) => {
    const promptReference = event.target.closest('[data-open-prompt-file]');
    if (promptReference && isWriting) {
      const promptFile = document.getElementById(`writing-prompt-${promptReference.dataset.openPromptFile}`);
      if (promptFile) {
        promptFile.open = true;
        promptFile.scrollIntoView({ block: 'start', behavior: 'instant' });
        promptFile.querySelector('summary')?.focus({ preventScroll: true });
      }
      return;
    }
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
  render(initialRoute.benchmarkId, { scroll: Boolean(initialRoute.section), section: initialRoute.section, caseId: initialRoute.caseId, trialNumber: initialRoute.trialNumber });
}());
