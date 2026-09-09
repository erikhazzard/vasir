// Serialize this function into the existing real-browser harness. It checks the
// actual loaded archive and selected task; it does not fetch replacement bytes.
export async function inspectCompactWritingReportInDocument({ caseId, inspectDocument = true } = {}) {
  const data = window.VASIR_WRITING, archive = window.VASIR_WRITING_RESPONSES;
  const mismatches = [], observedRequests = new Map(), renderedOriginalRequests = new Set(), answers = [];
  const fail = (label, condition) => { if (!condition) mismatches.push(label); };
  const hash = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
  const mean = values => values.length && values.every(Number.isFinite) ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const close = (a, b) => a === null || b === null ? a === b : Number.isFinite(a) && Math.abs(a - b) < 1e-9;
  const words = text => text.trim() ? text.trim().split(/\s+/u).length : 0;
  const benchmarkId = data?.benchmarks?.[0]?.id;
  const inventory = {
    'storytelling-plot-twists-compact-v2': { count: 3, track: 'storytelling' },
    'writing-place-generation-v1': { count: 1, track: 'worldbuilding' },
    'storytelling-one-shot-v1': { count: 1, track: 'storytelling' }
  };
  const definition = inventory[benchmarkId];
  if (!definition || data?.publication?.adapter !== 'writing-compact-v1' || !archive) return { benchmarkId, mismatches: ['compact-publication-missing'] };
  const judges = ['codex:gpt-6-astra@medium', 'codex:gpt-5.6-sol@medium'];
  const configurations = ['claude-fable-5-1', 'claude-opus-5'].flatMap(model => ['low', 'medium', 'max'].map(effort => `claude:${model}@${effort}`));
  fail('compact-inventory', data.benchmarks.length === 1 && data.cases.length === definition.count
    && data.benchmarks[0].trackId === definition.track && data.publication.scoreBasisIncluded === false
    && data.trialCount === 1 && data.scoreBasis.ratingMinimum === 0 && data.scoreBasis.ratingMaximum === 5
    && JSON.stringify(data.scoreBasis.judges) === JSON.stringify(judges)
    && JSON.stringify(data.settings.map(setting => setting.configurationId).sort()) === JSON.stringify(configurations.sort())
    && archive.responses.length === 12 * definition.count);
  const selectedId = caseId || (inspectDocument ? document.querySelector('#report-page')?.dataset.activeWritingCase : data.cases[0]?.id);
  const task = data.cases.find(item => item.id === selectedId);
  if (!task) return { benchmarkId, caseId: selectedId, mismatches: [...mismatches, 'selected-task-missing'] };
  fail('task-rubric', task.rubric?.length === 4 && new Set(task.rubric.map(criterion => criterion.id)).size === 4);
  const responses = archive.responses.filter(response => response.caseId === selectedId);
  fail('task-response-inventory', responses.length === 12 && new Set(responses.map(response => `${response.configurationId}:${response.condition}`)).size === 12);
  const instruction = archive.promptFiles.find(file => file.id === `compact-skill-${selectedId}`);
  fail('frozen-inline-skill', Boolean(instruction) && await hash(instruction.content) === instruction.sha256);
  const requests = new Map((archive.judgeRequests || []).map(request => [request.id, request]));
  fail('paired-request-inventory', requests.size === (archive.judgeRequests || []).length
    && requests.size === data.coverage.pairedJudgeCallCount
    && archive.responses.reduce((sum, response) => sum + response.judgments.length, 0) === data.coverage.judgmentCount);

  for (const response of responses) {
    const key = `${response.configurationId}:${response.condition}`;
    const outputSha256 = await hash(response.outputText);
    const cell = data.caseResults.find(item => item.caseId === selectedId && item.configurationId === response.configurationId && item.condition === response.condition);
    const messages = archive.messageSets.find(item => item.id === response.messageSetId)?.messages;
    fail(`${key}:answer-provenance`, Boolean(cell) && cell.settingId === response.settingId && cell.score === response.score
      && response.provenance.sourceSha256 === data.scoreBasis.sourceSha256
      && response.provenance.manifestSha256 === data.scoreBasis.manifestSha256
      && response.provenance.amendmentSha256 === data.scoreBasis.amendmentSha256
      && response.provenance.judgeValidationSha256 === data.scoreBasis.judgeValidationSha256
      && response.provenance.outputSha256 === (response.outputText ? outputSha256 : null)
      && response.provenance.questionSha256 === await hash(task.prompt)
      && response.provenance.skillSha256 === (response.condition === 'skill' ? instruction?.sha256 : null));
    fail(`${key}:exact-input`, messages?.length === (response.condition === 'skill' ? 2 : 1)
      && messages.at(-1).role === 'user' && messages.at(-1).content === task.prompt
      && (response.condition !== 'skill' || messages[0].role === 'system' && messages[0].fileId === instruction?.id)
      && response.messageSetId === await hash(JSON.stringify(messages)));
    fail(`${key}:word-count`, response.wordCount === (response.outputText ? words(response.outputText) : null)
      && response.characterCount === (response.outputText ? Array.from(response.outputText).length : null));
    fail(`${key}:judge-panel`, response.judgments.length <= 2 && new Set(response.judgments.map(judge => judge.judgeConfigurationId)).size === response.judgments.length);
    const row = inspectDocument ? [...document.querySelectorAll('[data-report-setting-id]')].find(item => item.dataset.reportSettingId === response.settingId) : null;
    const panel = row?.querySelector(`[data-condition="${response.condition}"]`);
    if (inspectDocument) {
      const output = panel?.querySelector('[data-output-text]'), absence = panel?.querySelector('[data-output-absence]');
      fail(`${key}:rendered-answer`, response.outputText.length ? output?.textContent === response.outputText && !absence
        : Boolean(panel) && !output && absence?.textContent === 'No completed answer is available for this case and condition.');
    }

    for (const judge of response.judgments) {
      const request = requests.get(judge.requestId), reviewKey = `${key}:${judge.judgeConfigurationId}`;
      fail(`${reviewKey}:request-identity`, Boolean(request) && judges.includes(judge.judgeConfigurationId)
        && request.caseId === selectedId && request.configurationId === response.configurationId
        && request.judgeConfigurationId === judge.judgeConfigurationId
        && request.candidateMap[judge.candidateId] === response.condition
        && new Set(Object.values(request.candidateMap)).size === 2
        && request.candidateResponseHashes[judge.candidateId] === response.provenance.outputSha256
        && request.promptSha256 === judge.promptSha256 && request.outputSha256 === judge.answerSha256);
      if (!request) continue;
      fail(`${reviewKey}:validation-binding`, JSON.stringify(judge.validation) === JSON.stringify(request.validation));
      let parsed;
      try {
        if (!observedRequests.has(request.id)) {
          fail(`${request.id}:original-bytes`, await hash(request.promptText) === request.promptSha256 && await hash(request.outputText) === request.outputSha256);
          const candidates = JSON.parse(request.promptText.split('Candidates (complete, untruncated):\n')[1]);
          const criteria = JSON.parse(request.promptText.split('Task criteria:\n')[1].split('\n\nCommon rating anchors:')[0]);
          fail(`${request.id}:exact-task-criteria`, request.promptText.includes(`Exact task:\n${task.prompt}`)
            && criteria.length === 4 && criteria.every((criterion, index) => criterion.id === task.rubric[index].id && criterion.criterion === task.rubric[index].criterion));
          fail(`${request.id}:original-candidates`, candidates.length === 2 && ['A', 'B'].every(label => {
            const candidate = candidates.find(item => item.candidateLabel === label);
            const answer = responses.find(item => item.configurationId === response.configurationId && item.condition === request.candidateMap[label]);
            return candidate && answer && candidate.answer === answer.outputText && candidate.wordCount === words(answer.outputText)
              && candidate.exceedsWordLimit === (words(answer.outputText) > task.wordLimit)
              && request.candidateResponseHashes[label] === answer.provenance.outputSha256;
          }));
          observedRequests.set(request.id, { requestId: request.id, promptSha256: request.promptSha256, outputSha256: request.outputSha256 });
        }
        parsed = JSON.parse(request.outputText);
      } catch {
        mismatches.push(`${request.id}:original-json`);
        continue;
      }
      const assessment = parsed[`assessment${judge.candidateId}`];
      const ratings = task.rubric.map(criterion => assessment?.ratings?.find(rating => rating.criterionId === criterion.id));
      fail(`${reviewKey}:original-ratings`, assessment?.candidateLabel === judge.candidateId && assessment.ratings.length === 4
        && ratings.every((rating, index) => {
          const value = judge.dimensions[task.rubric[index].dimensionId];
          return rating && value && Number.isInteger(rating.score) && rating.score >= 0 && rating.score <= 5
            && value.criterionId === rating.criterionId && value.rating === rating.score && value.reason === rating.reason && value.evidence === rating.evidence;
        }));
      fail(`${reviewKey}:judge-arithmetic`, close(judge.score, mean(ratings.map(rating => rating?.score)) * 20));
      if (inspectDocument) {
        const review = [...panel?.querySelectorAll('[data-judge-review]') || []].find(item => item.dataset.reviewerId === judge.judgeConfigurationId);
        fail(`${reviewKey}:rendered-criteria`, Boolean(review) && task.rubric.every(criterion => {
          const dimension = review.querySelector(`[data-dimension-id="${criterion.dimensionId}"]`), reading = judge.dimensions[criterion.dimensionId];
          return dimension?.querySelector('th')?.childNodes[0]?.textContent === criterion.criterion
            && dimension.querySelector('[data-dimension-reason]')?.textContent === reading.reason
            && dimension.querySelector('[data-cited-evidence]')?.textContent === reading.evidence;
        }));
        const original = [...review?.querySelectorAll('[data-creation-judge-evidence]') || []]
          .find(element => element.tagName === 'DETAILS' && element.dataset.creationJudgeEvidence === request.id);
        fail(`${reviewKey}:original-review-disclosure`, Boolean(original));
        if (original && !renderedOriginalRequests.has(request.id)) {
          const wasOpen = original.open;
          original.open = true;
          original.dispatchEvent(new Event('toggle'));
          fail(`${request.id}:rendered-original-review`, original.querySelector('[data-creation-original-review]')?.textContent === request.outputText);
          const prompt = original.querySelector('[data-creation-judge-prompt]');
          if (prompt) {
            const promptWasOpen = prompt.open;
            prompt.open = true;
            prompt.dispatchEvent(new Event('toggle'));
            fail(`${request.id}:rendered-original-prompt`, prompt.querySelector('[data-creation-original-prompt]')?.textContent === request.promptText);
            prompt.open = promptWasOpen;
          } else mismatches.push(`${request.id}:rendered-original-prompt`);
          original.open = wasOpen;
          renderedOriginalRequests.add(request.id);
        }
      }
    }
    fail(`${key}:panel-arithmetic`, close(cell?.exactScore, response.judgments.length === 2 ? mean(response.judgments.map(judge => judge.score)) : null));
    answers.push({ configurationId: response.configurationId, condition: response.condition, outputSha256: response.provenance.outputSha256,
      requestIds: response.judgments.map(judge => judge.requestId), exactScore: cell?.exactScore ?? null });
  }
  if (inspectDocument) {
    fail('selected-task-ui', document.querySelector('[data-writing-case]')?.value === selectedId
      && document.querySelectorAll('[data-report-setting-id]').length === 6);
    for (const criterion of task.rubric) {
      const element = document.querySelector(`[data-rubric-dimension="${criterion.dimensionId}"]`);
      fail(`${criterion.id}:frozen-rubric-ui`, element?.querySelector('[data-rubric-description]')?.textContent === criterion.criterion
        && Object.entries(data.methodology.ratingAnchors).every(([rating, text]) => element.querySelector(`[data-rubric-anchor="${rating}"]`)?.textContent === text));
    }
  }
  for (const request of [...requests.values()].filter(item => item.caseId === selectedId && item.priorAttemptSha256)) {
    const original = archive.failedJudgeAttempts?.find(item => item.requestId === request.id && item.attemptNumber === 1);
    fail(`${request.id}:amendment-lineage`, request.attemptNumber === 2 && original?.sourceAttemptSha256 === request.priorAttemptSha256
      && data.methodology.operationalAmendment?.sha256 === data.scoreBasis.amendmentSha256
      && await hash(original.promptText) === original.promptSha256 && await hash(original.outputText) === original.outputSha256);
  }
  for (const request of [...requests.values()].filter(item => item.caseId === selectedId && item.validation)) {
    const source = data.methodology.judgeValidation?.records.find(item => item.judgmentId === request.id);
    fail(`${request.id}:offline-validation-lineage`, request.originalStatus === 'failed'
      && request.validation.sha256 === data.scoreBasis.judgeValidationSha256
      && data.methodology.judgeValidation?.sha256 === request.validation.sha256
      && request.validation.toolCallCount === 0 && request.validation.additionalInferenceCalls === 0
      && request.validation.startupDiagnosticCount === 1 && source?.originalRecordSha256 === request.originalRecordSha256
      && source.originalRecordSha256 === request.validation.originalRecordSha256
      && source.outputSha256 === request.outputSha256 && source.promptSha256 === request.promptSha256);
  }
  return { kind: 'vasirbenchmark-compact-writing-browser-evidence', benchmarkId, caseId: selectedId,
    sourceSha256: data.scoreBasis.sourceSha256, manifestSha256: data.scoreBasis.manifestSha256,
    amendmentSha256: data.scoreBasis.amendmentSha256, judgeValidationSha256: data.scoreBasis.judgeValidationSha256,
    answers, requests: [...observedRequests.values()], mismatches };
}
