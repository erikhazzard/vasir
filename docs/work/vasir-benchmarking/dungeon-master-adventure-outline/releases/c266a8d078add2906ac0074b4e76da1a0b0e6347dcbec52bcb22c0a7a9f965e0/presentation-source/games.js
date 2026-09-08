(function () {
  'use strict';

  const gamesData = window.VASIR_DATA?.games;
  const benchmarkId = new URLSearchParams(location.search).get('benchmark');
  const source = Array.isArray(gamesData?.benchmarks)
    ? gamesData.benchmarks.find(item => item.benchmark?.id === benchmarkId) || gamesData.benchmarks[0]
    : gamesData;
  const reference = source?.reference;
  const referenceConfiguration = reference?.configuration || {id:'codex:gpt-6-astra@ultra',label:'GPT-6 Astra',reasoning:'ultra'};
  const data = reference && !source.runs.some(run => run.id === reference.id)
    ? {...source, configurations:[...source.configurations.filter(item => item.id !== referenceConfiguration.id), {...referenceConfiguration,comparison:{controlled:false,reason:reference.provenance}}], runs:[...source.runs,{...reference,configurationId:referenceConfiguration.id,conditionId:'vasir'}]}
    : source;
  const view = document.getElementById('game-view');
  // Generated code gets its own origin; this allowlist is deliberately independent of result data.
  const ARTIFACT_ORIGIN = 'https://d7us0tudou7ya.cloudfront.net';
  const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const asList = value => Array.isArray(value) ? value : typeof value === 'string' && value.trim() ? [value] : [];
  const safeUrl = value => {
    if (typeof value !== 'string' || !value) return null;
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  };
  const playableUrl = value => {
    const url = safeUrl(value);
    return url && new URL(url).origin === ARTIFACT_ORIGIN && new URL(url).origin !== window.location.origin ? url : null;
  };
  if (!view || !data || data.kind !== 'vasirbenchmark-games' || data.schemaVersion !== 1
    || !Array.isArray(data.configurations) || !Array.isArray(data.conditions) || !Array.isArray(data.runs)
    || !data.configurations.length || data.conditions.length !== 2) return;

  const configurations = data.configurations;
  const conditions = data.conditions;
  const benchmark = data.benchmark || {};
  const unavailableBenchmark = Boolean(benchmarkId && benchmarkId !== benchmark.id);
  const scoreValue = run => {
    const value = run?.score?.value;
    const maximum = run?.score?.maximum ?? 100;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximum ? value : null;
  };
  const individualScoreValue = run => {
    const judgments = asList(run.judgments);
    if (judgments.length !== 1) return null;
    const value = judgments[0].score?.value ?? judgments[0].score ?? judgments[0].value;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  };
  const displayScore = run => scoreValue(run) ?? individualScoreValue(run);
  const formatDisplayScore = run => displayScore(run) === null ? '—' : displayScore(run).toFixed(1);
  const formatStatus = run => ({ built: 'Built', incomplete: 'Incomplete', failed: 'Failed', unverified: 'Unverified', pending: 'Pending', running: 'Running', complete: 'Built', completed: 'Built', timeout: 'Incomplete', reference: 'Built' })[run?.status] || 'Unverified';
  const statusMarkup = run => `<span class="game-artifact__badge game-artifact__badge--${formatStatus(run).toLowerCase()}">${formatStatus(run)}${run?.status === 'timeout' ? ' · time limit' : ''}</span>`;
  const findRun = (configurationId, conditionId) => data.runs.find(run => run.configurationId === configurationId && run.conditionId === conditionId)
    || { id: `${configurationId}-${conditionId}`, configurationId, conditionId, status: 'pending', artifact: {}, score: null };
  const conditionLabel = condition => condition.label || condition.id;
  const configurationLabel = configuration => configuration.label || configuration.id;
  const configurationReasoning = configuration => String(configuration.reasoning || '').replace(/^./, letter => letter.toUpperCase());
  const judgeLabel = (judge, index) => {
    const selector = /^(?:codex|claude):([^@]+)@([^@]+)$/.exec(judge.judge || '');
    const model = selector && ({ 'gpt-6-astra': 'GPT-6 Astra', 'gpt-5.6-sol': 'GPT-5.6 Sol', 'gpt-5.6-terra': 'GPT-5.6 Terra', 'claude-fable-5-1': 'Claude Fable 5.1' })[selector[1]];
    const reasoning = selector && ({ low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra high', max: 'Max' })[selector[2]];
    return model && reasoning ? `${model} · ${reasoning} reasoning` : judge.label || judge.model || judge.judge || `Judge ${index + 1}`;
  };
  const reviewIncomplete = run => asList(run.reviewOutcomes).some(outcome => outcome.status === 'failed');
  const judgeShortLabel = judge => ({ 'codex:gpt-6-astra@xhigh': 'Astra', 'claude:claude-fable-5-1@max': 'Fable' })[judge.judge] || judgeLabel(judge, 0);
  const judgeScore = judge => {
    const value = judge.score?.value ?? judge.score ?? judge.value;
    return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '—';
  };
  const artifactDimensions = run => {
    const width = Number(run.artifact?.width);
    const height = Number(run.artifact?.height);
    return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? { width, height } : { width: 390, height: 844 };
  };
  const dimensionsMarkup = dimensions => {
    const values = Array.isArray(dimensions) ? dimensions : dimensions && typeof dimensions === 'object'
      ? Object.entries(dimensions).map(([label, value]) => typeof value === 'object' && value ? { label, ...value } : { label, value }) : [];
    return values.length ? `<ul class="game-artifact__dimensions">${values.map(item => `<li><strong>${escapeHtml(item.label || item.name || item.id)}</strong>: ${escapeHtml(item.value ?? item.score ?? item.rating ?? '—')}${item.maximum ? ` / ${escapeHtml(item.maximum)}` : ''}${item.summary || item.rationale || item.reason ? ` · ${escapeHtml(item.summary || item.rationale || item.reason)}` : ''}</li>`).join('')}</ul>` : '';
  };
  const evidenceMarkup = run => {
    const judgments = asList(run.judgments);
    const metrics = run.metrics || {};
    const metricText = [Number.isFinite(metrics.durationMs) ? `${(metrics.durationMs / 60000).toFixed(1)} min execution` : '', Number.isFinite(metrics.totalTokens) ? `${metrics.totalTokens.toLocaleString()} total tokens` : '', Number.isFinite(metrics.costUsd) ? `$${metrics.costUsd.toFixed(2)} cost` : ''].filter(Boolean).join(' · ');
    const sourceUrl = safeUrl(run.evidenceUrl || run.sourceUrl);
    return `<details class="game-artifact__details"><summary class="game-artifact__summary">Scores & evidence${judgments.length ? ` · ${judgments.length} ${judgments.length === 1 ? 'assessment' : 'assessments'}` : ''}</summary><div class="game-artifact__evidence">
      <p>${escapeHtml(scoreValue(run) === null ? reviewIncomplete(run) ? 'The review panel is incomplete. No combined score is available; completed individual assessments remain visible below.' : 'No verified rubric score is published for this run.' : 'Combined score from two independent assessments. Individual ratings and observations are below.')}</p>
      ${run.provenance ? `<p>Creation: ${escapeHtml(run.provenance)}</p>` : ''}
      ${asList(run.notes).length ? `<aside class="game-artifact__notes" aria-label="Execution notes">${asList(run.notes).map(note => `<p>${escapeHtml(note)}</p>`).join('')}</aside>` : ''}
      ${run.qualityStatus ? `<p>Verification: ${escapeHtml(run.qualityStatus)}</p>` : ''}
      ${run.score?.eligible === false ? '<p>This quality score is diagnostic: one or more functional gates failed. Inspect those observations alongside the score.</p>' : ''}
      ${run.score?.eligible === null ? '<p>Functional verification is incomplete. The quality ratings remain visible; inspect the observations before judging playability.</p>' : ''}
      ${metricText ? `<p>${escapeHtml(metricText)}</p>` : ''}${dimensionsMarkup(run.score?.dimensions)}
      ${judgments.map((judge, index) => `<details class="game-artifact__details" data-judge-id="${escapeHtml(judge.judge || '')}"><summary class="game-artifact__summary">${escapeHtml(judgeLabel(judge, index))} · ${escapeHtml(judge.score?.value ?? judge.score ?? judge.value ?? '—')}/100</summary><div class="game-artifact__evidence">${typeof judge.candidateLabel === 'string' && judge.candidateLabel.trim() ? `<p class="game-artifact__candidate">Reviewed as Candidate ${escapeHtml(judge.candidateLabel)}</p>` : ''}<p>${escapeHtml(judge.summary || judge.rationale || '')}</p>${dimensionsMarkup(judge.dimensions || judge.score?.dimensions)}${judge.gates ? `<ul class="game-artifact__dimensions">${Object.entries(judge.gates).map(([id, gate]) => `<li><strong>${escapeHtml(({ boot: 'Boot', mobilePlay: 'Mobile play', recovery: 'Recovery' })[id] || id)}</strong>: ${escapeHtml(gate.status || 'unverified')} · ${escapeHtml(gate.reason || '')}</li>`).join('')}</ul>` : ''}${[...asList(judge.discrepancies), ...asList(judge.limitations)].map(note => `<p>${escapeHtml(note)}</p>`).join('')}</div></details>`).join('')}
      ${asList(run.reviewOutcomes).filter(outcome => outcome.status === 'failed').map((outcome, index) => `<div class="game-artifact__review-outcome"><p><strong>${escapeHtml(judgeLabel(outcome, index))} · Review unavailable</strong></p>${outcome.reason ? `<p>${escapeHtml(outcome.reason)}</p>` : ''}</div>`).join('')}
      ${asList(run.reviewHistory).length ? `<details class="game-artifact__details" data-review-history><summary class="game-artifact__summary">Previous review attempts · ${run.reviewHistory.length}</summary><div class="game-artifact__evidence">${run.reviewHistory.map((attempt,index) => `<p><strong>${escapeHtml(judgeLabel(attempt,index))} · ${escapeHtml(attempt.status)}</strong>${attempt.reason ? `<br>${escapeHtml(attempt.reason)}` : ''}</p>`).join('')}</div></details>` : ''}
      ${asList(run.discrepancies || run.score?.discrepancies).map(note => `<p>${escapeHtml(note)}</p>`).join('')}
      ${sourceUrl ? `<p><a class="game-method__source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Open the complete evidence ↗</a></p>` : ''}
    </div></details>`;
  };

  const artifactRows = new Map();
  const legacyReference = data.runs.find(run => run.id === reference?.id || run.status === 'reference');
  let selectedId = (location.hash === '#game-reference' ? legacyReference?.configurationId : null) || configurations.find(configuration => configuration.id === new URLSearchParams(location.search).get('model'))?.id || configurations[0].id;
  let activeArtifact = null;
  const posterMarkup = (run, title) => {
    const artifact = run.artifact || {};
    const poster = safeUrl(artifact.posterUrl);
    const video = safeUrl(artifact.videoUrl);
    const play = playableUrl(artifact.playUrl);
    return `${poster ? `<img class="game-artifact__poster" src="${escapeHtml(poster)}" alt="${escapeHtml(title)} gameplay still" loading="lazy" decoding="async">` : ''}<div class="game-artifact__cover">
      ${video ? '<button class="game-artifact__watch" type="button" data-artifact-action="watch"><span class="game-artifact__play-mark" aria-hidden="true">▶</span> Watch playback</button><p class="game-artifact__caption">Silent recording · normal speed</p>'
        : play ? '<button class="game-artifact__watch" type="button" data-artifact-action="play"><span class="game-artifact__play-mark" aria-hidden="true">▶</span> Play game</button><p class="game-artifact__caption">Playback not yet published</p>'
          : `<p class="game-artifact__empty">${formatStatus(run) === 'Failed' ? 'No playable build published' : formatStatus(run) === 'Incomplete' ? 'Build incomplete' : 'Artifact awaiting publication'}</p><p class="game-artifact__caption">${escapeHtml(run.statusReason || 'This result remains visible while its evidence is incomplete.')}</p>`}
    </div>`;
  };
  const artifactMarkup = (run, title, modifier = '') => {
    const key = String(run.id);
    artifactRows.set(key, { run, title });
    const artifact = run.artifact || {};
    const play = playableUrl(artifact.playUrl);
    const video = safeUrl(artifact.videoUrl);
    const { width, height } = artifactDimensions(run);
    const ratio = `${width} / ${height}`;
    return `<article class="game-artifact${modifier ? ` game-artifact--${modifier}` : ''}" ${run.id === legacyReference?.id ? 'id="game-reference"' : ''} data-run-id="${escapeHtml(key)}" aria-label="${escapeHtml(title)}">
      <header class="game-artifact__header"><div><h3 class="game-artifact__title">${escapeHtml(title)}</h3><p class="game-artifact__status">${statusMarkup(run)}</p></div><div class="game-artifact__score">${formatDisplayScore(run)}<span class="game-artifact__score-unit">${scoreValue(run) === null ? individualScoreValue(run) !== null ? '/100 · Individual<br>1 of 2 reviews' : reviewIncomplete(run) ? 'Review unavailable' : 'Awaiting review' : `${run.score?.eligible === false ? 'Diagnostic · ' : run.score?.eligible === null ? 'Unverified · ' : ''}/ ${escapeHtml(run.score?.maximum ?? 100)}`}</span></div></header>
      <div class="game-artifact__stage"><div class="game-artifact__frame" style="--artifact-ratio:${ratio}">${posterMarkup(run, title)}</div></div>
      <div class="game-artifact__actions">
        <button class="game-artifact__button" type="button" data-artifact-action="play" aria-pressed="false" ${play ? '' : 'disabled'}>Play game</button>
        <button class="game-artifact__button" type="button" data-artifact-action="close" disabled>Stop</button>
        <button class="game-artifact__button" type="button" data-artifact-action="fullscreen" ${play || video ? '' : 'disabled'}>Fullscreen</button>
        ${play ? `<a class="game-artifact__link" href="${escapeHtml(play)}" target="_blank" rel="noopener noreferrer">Open game ↗</a>` : video ? `<a class="game-artifact__link" href="${escapeHtml(video)}" target="_blank" rel="noopener noreferrer">Open playback ↗</a>` : ''}
      </div>
      <p class="game-artifact__feedback" role="status">${artifact.playUrl && !play ? 'Playable embed unavailable: artifact origin could not be verified.' : video ? play ? 'Watch a silent recording or activate the game. Game audio starts after interaction.' : 'Watch a silent recording at normal speed.' : play ? 'Activate the game to play. Game audio starts after interaction.' : 'No playable artifact is published for this run.'}</p>
      ${evidenceMarkup(run)}
    </article>`;
  };
  const ratingMarkup = run => `<div class="game-results__rating"><span class="game-results__value" data-combined-score="${scoreValue(run) ?? ''}" data-primary-score="${displayScore(run) ?? ''}" data-rating-kind="${scoreValue(run) !== null ? 'combined' : individualScoreValue(run) !== null ? 'individual' : 'unavailable'}">${formatDisplayScore(run)}<span class="game-results__unit">${scoreValue(run) !== null ? ' /100 · combined' : individualScoreValue(run) !== null ? ' /100 · individual' : reviewIncomplete(run) ? ' review unavailable' : ' awaiting review'}</span></span>${scoreValue(run) === null && individualScoreValue(run) !== null ? '<p class="game-results__panel">1 of 2 reviews · combined —</p>' : ''}<ul class="game-results__judges" aria-label="Individual judge ratings">${asList(run.judgments).map(judge => `<li class="game-results__judge" data-rating-judge="${escapeHtml(judge.judge || '')}" data-rating-value="${judgeScore(judge)}"><span title="${escapeHtml(judgeLabel(judge, 0))}">${escapeHtml(judgeShortLabel(judge))}</span><strong>${judgeScore(judge)}</strong></li>`).join('')}${asList(run.reviewOutcomes).filter(outcome => outcome.status === 'failed').map(outcome => `<li class="game-results__judge game-results__judge--unavailable"><span title="${escapeHtml(judgeLabel(outcome, 0))}">${escapeHtml(judgeShortLabel(outcome))}</span><span>Unavailable</span></li>`).join('')}</ul>${run.score?.eligible === false ? '<span class="game-results__qualification">Diagnostic only</span>' : run.score?.eligible === null ? '<span class="game-results__qualification">Functional proof incomplete</span>' : ''}</div>`;
  const resultsMarkup = () => `<section class="game-results" id="game-results" data-ratings-version="3" aria-labelledby="game-results-title"><div class="game-results__intro"><div><p class="ui-eyebrow">Scores out of 100</p><h2 class="game-results__heading" id="game-results-title">Benchmark ratings</h2></div><a class="game-results__jump" href="#game-comparison">Watch & play the outputs ↓</a></div><p class="game-results__note" id="game-ratings-note">Combined scores average both judges. ${data.runs.some(run => scoreValue(run) === null && individualScoreValue(run) !== null) ? 'A one-judge rating is labelled individual; its panel remains incomplete. ' : ''}Select a model to inspect its games.</p><div class="game-results__scroll"><table class="game-results__table" aria-describedby="game-ratings-note"><thead class="game-results__table-head"><tr><th scope="col">Model configuration</th>${conditions.map(condition => `<th scope="col">${escapeHtml(conditionLabel(condition))}</th>`).join('')}<th scope="col">Score Δ</th></tr></thead><tbody>${configurations.map(configuration => {
    const runs = conditions.map(condition => findRun(configuration.id, condition.id));
    const delta = runs.every(run => scoreValue(run) !== null) ? scoreValue(runs[1]) - scoreValue(runs[0]) : null;
    return `<tr class="game-results__row" data-configuration-result="${escapeHtml(configuration.id)}"><th class="game-results__configuration" scope="row"><button class="game-results__model" type="button" data-model-id="${escapeHtml(configuration.id)}">${escapeHtml(configurationLabel(configuration))}<span class="game-results__reasoning">${escapeHtml(configurationReasoning(configuration))} reasoning <span aria-hidden="true">↗</span></span></button></th>${runs.map((run, index) => `<td class="game-results__condition" data-result-run-id="${escapeHtml(run.id)}"><span class="game-results__mobile-label" aria-hidden="true">${escapeHtml(conditionLabel(conditions[index]))}</span>${ratingMarkup(run)}${statusMarkup(run)}</td>`).join('')}<td class="game-results__delta${delta < 0 ? ' game-results__delta--negative' : ''}"><span class="game-results__mobile-label" aria-hidden="true">Score Δ</span>${delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}</td></tr>`;
  }).join('')}</tbody></table></div><p class="game-results__footnote">Astra = GPT-6 Astra, extra high · Fable = Claude Fable 5.1, max. Score Δ subtracts complete artifact quality scores. It is descriptive, not an estimate of skill effects. Creation methods are documented below.</p></section>`;

  view.innerHTML = `${unavailableBenchmark ? `<p class="game-report__notice" role="status">That benchmark is not available. Showing ${escapeHtml(benchmark.title || 'the latest game benchmark')}. <a href="./index.html#capabilities/games">Browse game benchmarks ↗</a></p>` : ''}<section class="game-report__hero"><div><p class="game-report__eyebrow">Games / One-task benchmark</p><h1 class="game-report__title" id="game-title">${escapeHtml(benchmark.title || '2D jumping demo')}</h1><p class="game-report__scope">${configurations.length} configurations × ${conditions.length} conditions · ${data.runs.length} outputs · 2 judges</p></div><details class="game-report__prompt-details" ${window.matchMedia('(min-width: 36.001rem)').matches ? 'open' : ''}><summary class="game-report__prompt-label">The exact user prompt</summary><blockquote class="game-report__prompt">${escapeHtml(benchmark.prompt || 'Prompt not yet published.')}</blockquote><p class="game-report__prompt-note">The same request for every fresh run. Select a model, watch the output, then play it.</p></details></section>
    ${resultsMarkup()}
    <section class="game-comparison" id="game-comparison" aria-label="Compare playable game builds"><div class="game-models" role="group" aria-label="Choose model configuration">${configurations.map(configuration => `<button class="game-models__button${selectedId === configuration.id ? ' is-selected' : ''}" type="button" data-model-id="${escapeHtml(configuration.id)}" aria-pressed="${selectedId === configuration.id}" aria-controls="game-selected-comparison"><span class="game-models__name">${escapeHtml(configurationLabel(configuration))}</span><span class="game-models__reasoning">${escapeHtml(configurationReasoning(configuration))}</span></button>`).join('')}</div><div id="game-selected-comparison"></div></section>
    <section class="game-method" id="game-method" aria-labelledby="game-method-title"><h2 class="game-method__heading" id="game-method-title">Methodology</h2><div class="game-method__grid"><div><h3 class="game-method__subtitle">Method</h3>${(asList(benchmark.method).length ? asList(benchmark.method) : ['Fresh runs receive the published prompt with a 60-minute execution cap and the same normal tools. Two judges assess the frozen artifacts.']).map(paragraph => `<p class="game-method__paragraph">${escapeHtml(paragraph)}</p>`).join('')}${configurations.filter(configuration => configuration.comparison?.controlled === false).map(configuration => `<p class="game-method__paragraph"><strong>${escapeHtml(configurationLabel(configuration))} · ${escapeHtml(configurationReasoning(configuration))}:</strong> ${escapeHtml(configuration.comparison.reason)} Score Δ is a descriptive artifact comparison.</p>`).join('')}<p class="game-method__paragraph">Playback is recorded after generation, at normal speed, from the frozen build. The playable artifact is the model’s actual output.</p>${safeUrl(benchmark.evidenceUrl || benchmark.sourceUrl) ? `<a class="game-method__source" href="${escapeHtml(safeUrl(benchmark.evidenceUrl || benchmark.sourceUrl))}" target="_blank" rel="noopener noreferrer">Read the complete method and evidence ↗</a>` : ''}</div><div><h3 class="game-method__subtitle">What these results establish</h3><ul class="game-method__limitations">${(asList(benchmark.limitations).length ? asList(benchmark.limitations) : ['One trial does not estimate repeatability or establish general model rankings.', 'Scores are development evidence for this task; inspect the artifacts and individual judge assessments.', 'Build status, functional verification, and rubric score are separate observations.', 'Score differences compare artifact quality; differing creation methods prevent causal conclusions about the skill.']).map(note => `<li>${escapeHtml(note)}</li>`).join('')}</ul></div></div></section>
    `;

  const observer = new IntersectionObserver(entries => {
    if (!activeArtifact || document.fullscreenElement) return;
    const entry = entries.find(item => item.target === activeArtifact.element.querySelector('.game-artifact__frame'));
    if (entry && !entry.isIntersecting) stopActive('Stopped while off screen. Activate again to restart.');
  }, { threshold: 0 });
  const frameResizeObserver = new ResizeObserver(entries => {
    if (activeArtifact?.mode !== 'play') return;
    const frame = activeArtifact.element.querySelector('.game-artifact__frame');
    if (entries.some(entry => entry.target === frame)) fitPlayable(frame);
  });

  function fitPlayable(frame) {
    const iframe = frame.querySelector('iframe');
    if (!iframe || !frame.clientWidth || !frame.clientHeight) return;
    const width = Number(iframe.width);
    const height = Number(iframe.height);
    const scale = Math.min(frame.clientWidth / width, frame.clientHeight / height);
    const left = (frame.clientWidth - width * scale) / 2;
    const top = (frame.clientHeight - height * scale) / 2;
    iframe.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  }

  function setFeedback(element, message, error = false) {
    const feedback = element.querySelector('.game-artifact__feedback');
    feedback.textContent = message;
    feedback.classList.toggle('is-error', error);
  }

  function stopActive(message = 'Stopped. Watch the recording or activate the game again.') {
    if (!activeArtifact) return;
    const { element, run, title } = activeArtifact;
    activeArtifact = null;
    const frame = element.querySelector('.game-artifact__frame');
    observer.unobserve(frame);
    frameResizeObserver.unobserve(frame);
    const video = frame.querySelector('video');
    if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    const iframe = frame.querySelector('iframe');
    if (iframe) { iframe.src = 'about:blank'; iframe.remove(); }
    frame.innerHTML = posterMarkup(run, title);
    element.querySelector('[data-artifact-action="close"]').disabled = true;
    const play = element.querySelector('.game-artifact__actions [data-artifact-action="play"]');
    play.classList.remove('is-active');
    play.setAttribute('aria-pressed', 'false');
    setFeedback(element, message);
  }

  function activate(element, mode) {
    const record = artifactRows.get(element.dataset.runId);
    if (!record) return;
    const { run, title } = record;
    const url = mode === 'play' ? playableUrl(run.artifact?.playUrl) : safeUrl(run.artifact?.videoUrl);
    if (!url) { setFeedback(element, 'This artifact is not available for verified playback.', true); return; }
    stopActive();
    const frame = element.querySelector('.game-artifact__frame');
    frame.replaceChildren();
    activeArtifact = { element, run, title, mode };
    element.querySelector('[data-artifact-action="close"]').disabled = false;
    const playButton = element.querySelector('.game-artifact__actions [data-artifact-action="play"]');
    playButton.classList.toggle('is-active', mode === 'play');
    playButton.setAttribute('aria-pressed', String(mode === 'play'));
    if (mode === 'watch') {
      const video = document.createElement('video');
      video.className = 'game-artifact__video';
      video.controls = true;
      video.playsInline = true;
      video.preload = 'none';
      video.setAttribute('aria-label', `${title} recorded gameplay at normal speed`);
      video.src = url;
      video.playbackRate = 1;
      const poster = safeUrl(run.artifact?.posterUrl);
      if (poster) video.poster = poster;
      video.addEventListener('error', () => { if (activeArtifact?.element === element) setFeedback(element, 'Playback could not load. Try Play game or open the artifact in a new tab.', true); });
      frame.append(video);
      setFeedback(element, 'Silent recording · normal speed.');
      video.play().catch(() => { if (activeArtifact?.element === element) setFeedback(element, 'Press play in the video controls to start the recording.'); });
    } else {
      const iframe = document.createElement('iframe');
      iframe.className = 'game-artifact__iframe';
      iframe.title = `${title} playable game`;
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.setAttribute('allow', 'autoplay; fullscreen');
      iframe.referrerPolicy = 'no-referrer';
      const { width, height } = artifactDimensions(run);
      iframe.width = String(width);
      iframe.height = String(height);
      iframe.style.width = `${width}px`;
      iframe.style.height = `${height}px`;
      frame.append(iframe);
      fitPlayable(frame);
      frameResizeObserver.observe(frame);
      setFeedback(element, 'Game active. Click or tap inside to play. Stop ends this session; Open game gives it a full tab.');
      // Establish the blank frame's viewport before cross-origin game startup.
      // A fast navigation can otherwise run game scripts with a zero-height viewport.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!iframe.isConnected || activeArtifact?.element !== element || activeArtifact.mode !== 'play') return;
        iframe.addEventListener('load', () => { if (activeArtifact?.element === element) iframe.focus({ preventScroll: true }); }, { once: true });
        iframe.src = url;
      }));
    }
    observer.observe(frame);
  }

  function renderComparison() {
    stopActive();
    const configuration = configurations.find(item => item.id === selectedId);
    const panel = document.getElementById('game-selected-comparison');
    panel.innerHTML = `<header class="game-comparison__heading"><h2 class="game-comparison__title">${escapeHtml(configurationLabel(configuration))} <small>${escapeHtml(configurationReasoning(configuration))}</small></h2><p class="game-comparison__note">Bare and with Vasir · <a href="#game-method">Methodology</a></p></header><div class="game-comparison__pair">${conditions.map((condition,index) => { const run = findRun(selectedId,condition.id); return artifactMarkup(run,conditionLabel(condition)+(run.label ? ' — '+run.label : ''),index === 1 ? 'skill':''); }).join('')}</div>`;
    view.querySelectorAll('.game-models__button').forEach(button => {
      const selected = button.dataset.modelId === selectedId;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  view.addEventListener('click', async event => {
    const modelButton = event.target.closest('[data-model-id]');
    if (modelButton) {
      selectedId = modelButton.dataset.modelId;
      renderComparison();
      const nextUrl = new URL(location.href);
      nextUrl.searchParams.set('model', selectedId);
      if (nextUrl.hash === '#game-reference') nextUrl.hash = '#game-comparison';
      history.replaceState(null, '', nextUrl);
      if (modelButton.classList.contains('game-results__model')) {
        const selectionButton = Array.from(view.querySelectorAll('.game-models__button')).find(button => button.dataset.modelId === selectedId);
        selectionButton?.focus();
        document.getElementById('game-comparison').scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      return;
    }
    const action = event.target.closest('[data-artifact-action]');
    if (!action || action.disabled) return;
    const element = action.closest('.game-artifact');
    if (action.dataset.artifactAction === 'close') {
      stopActive();
      element.querySelector('.game-artifact__watch')?.focus({ preventScroll: true });
    } else if (action.dataset.artifactAction === 'fullscreen') {
      const frame = element.querySelector('.game-artifact__frame');
      if (!frame.requestFullscreen) { setFeedback(element, 'Fullscreen is unavailable in this browser. Use Open game for a full tab.'); return; }
      if (activeArtifact?.element !== element) activate(element, safeUrl(artifactRows.get(element.dataset.runId)?.run.artifact?.videoUrl) ? 'watch' : 'play');
      try { await frame.requestFullscreen(); } catch { setFeedback(element, 'Fullscreen could not open. Use Open game for a full tab.'); }
    } else activate(element, action.dataset.artifactAction);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopActive('Stopped while this tab was hidden. Activate again to restart.'); });
  window.addEventListener('pagehide', () => stopActive());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeArtifact && !document.fullscreenElement) {
      const element = activeArtifact.element;
      stopActive();
      element.querySelector('.game-artifact__watch')?.focus({ preventScroll: true });
    }
  });
  window.addEventListener('hashchange', () => {
    if (location.hash !== '#game-reference' || !legacyReference) return;
    selectedId = legacyReference.configurationId;
    renderComparison();
    document.getElementById('game-reference')?.scrollIntoView({block:'start',behavior:'instant'});
  });
  renderComparison();
  if (location.hash === '#game-reference') requestAnimationFrame(() => document.getElementById('game-reference')?.scrollIntoView({block:'start',behavior:'instant'}));
})();
