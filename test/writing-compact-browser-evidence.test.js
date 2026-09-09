import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { inspectCompactWritingReportInDocument } from '../site/vasirbenchmark.com/writing-compact-browser-evidence.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const judges = ['codex:gpt-6-astra@medium', 'codex:gpt-5.6-sol@medium'];

// Synthetic public archives exercise the browser verifier without provider calls
// or reading/changing any selected publication source.
function fixture(benchmarkId = 'writing-place-generation-v1', count = 1) {
  const data = {
    publication: { adapter: 'writing-compact-v1', scoreBasisIncluded: false },
    benchmarks: [{ id: benchmarkId, trackId: benchmarkId === 'writing-place-generation-v1' ? 'worldbuilding' : 'storytelling' }],
    trialCount: 1,
    settings: ['claude-fable-5-1', 'claude-opus-5'].flatMap(model => ['low', 'medium', 'max'].map(effort => ({ id: `${model}-${effort}`, configurationId: `claude:${model}@${effort}` }))),
    cases: Array.from({ length: count }, (_, index) => ({ id: `task-${index}`, prompt: `Exact task ${index}: build the river crossing.`, wordLimit: 20,
      rubric: Array.from({ length: 4 }, (_, index) => ({ id: `cause-${index}`, dimensionId: `criterion-${index + 1}`, criterion: `Exact criterion ${index}`, weight: 25 })) })),
    scoreBasis: { ratingMinimum: 0, ratingMaximum: 5, judges, sourceSha256: 'a'.repeat(64), manifestSha256: 'b'.repeat(64), amendmentSha256: null, judgeValidationSha256: null },
    methodology: {}, caseResults: [], coverage: { pairedJudgeCallCount: 12 * count, judgmentCount: 24 * count }
  };
  const archive = { responses: [], judgeRequests: [], promptFiles: [], messageSets: [], failedJudgeAttempts: [] };
  for (const task of data.cases) {
    const content = `Exact frozen instruction for ${task.id}.`;
    const skill = { id: `compact-skill-${task.id}`, content, sha256: digest(content) };
    archive.promptFiles.push(skill);
    for (const setting of data.settings) {
      const pair = ['baseline', 'skill'].map(condition => {
        const messages = [...(condition === 'skill' ? [{ role: 'system', fileId: skill.id }] : []), { role: 'user', content: task.prompt }];
        const messageSetId = digest(JSON.stringify(messages));
        if (!archive.messageSets.some(item => item.id === messageSetId)) archive.messageSets.push({ id: messageSetId, messages });
        const outputText = `${condition}: the ferry crosses. Ω 🦦\nThe keeper rings the bell.`;
        const response = { caseId: task.id, ...setting, settingId: setting.id, condition, outputText, messageSetId,
          wordCount: outputText.trim().split(/\s+/u).length, characterCount: Array.from(outputText).length, judgments: [],
          provenance: { sourceSha256: data.scoreBasis.sourceSha256, manifestSha256: data.scoreBasis.manifestSha256, amendmentSha256: null, judgeValidationSha256: null,
            outputSha256: digest(outputText), questionSha256: digest(task.prompt), skillSha256: condition === 'skill' ? skill.sha256 : null } };
        archive.responses.push(response);
        return response;
      });
      for (const [index, judgeConfigurationId] of judges.entries()) {
        const candidateMap = index ? { A: 'skill', B: 'baseline' } : { A: 'baseline', B: 'skill' };
        const candidates = Object.entries(candidateMap).map(([candidateLabel, condition]) => {
          const response = pair.find(item => item.condition === condition);
          return { candidateLabel, wordCount: response.wordCount, exceedsWordLimit: response.wordCount > task.wordLimit, answer: response.outputText };
        });
        const promptText = `Exact task:\n${task.prompt}\n\nTask criteria:\n${JSON.stringify(task.rubric.map(({ id, criterion }) => ({ id, criterion })))}\n\nCommon rating anchors:\nFrozen anchors\n\nCandidates (complete, untruncated):\n${JSON.stringify(candidates)}`;
        const assess = candidateLabel => ({ candidateLabel, ratings: task.rubric.map((criterion, criterionIndex) => ({ criterionId: criterion.id,
          score: criterionIndex + 1 + (candidateMap[candidateLabel] === 'skill' ? 1 : 0) - index,
          evidence: 'The keeper rings the bell.', reason: `Exact cause ${criterionIndex}.` })) });
        const output = { assessmentA: assess('A'), assessmentB: assess('B'), preference: { candidate: 'B', confidence: 'high', reason: 'The bell matters.' } };
        const outputText = JSON.stringify(output);
        const request = { id: `${task.id}:${setting.id}:${index}`, caseId: task.id, configurationId: setting.configurationId, judgeConfigurationId,
          candidateMap, candidateResponseHashes: Object.fromEntries(Object.entries(candidateMap).map(([label, condition]) => [label, pair.find(item => item.condition === condition).provenance.outputSha256])),
          promptText, promptSha256: digest(promptText), outputText, outputSha256: digest(outputText), attemptNumber: 1 };
        archive.judgeRequests.push(request);
        for (const [candidateId, condition] of Object.entries(candidateMap)) {
          const ratings = output[`assessment${candidateId}`].ratings;
          pair.find(item => item.condition === condition).judgments.push({ judgeConfigurationId, candidateId, requestId: request.id,
            promptSha256: request.promptSha256, answerSha256: request.outputSha256, score: mean(ratings.map(rating => rating.score)) * 20,
            dimensions: Object.fromEntries(ratings.map((rating, index) => [`criterion-${index + 1}`, { criterionId: rating.criterionId, rating: rating.score, reason: rating.reason, evidence: rating.evidence }])) });
        }
      }
      for (const response of pair) {
        response.score = mean(response.judgments.map(judge => judge.score));
        data.caseResults.push({ caseId: task.id, configurationId: response.configurationId, condition: response.condition,
          settingId: setting.id, score: response.score, exactScore: response.score });
      }
    }
  }
  return { data, archive };
}

const inspect = ({ data, archive }, caseId = data.cases[0].id, document) => vm.runInNewContext(`(${inspectCompactWritingReportInDocument.toString()})({caseId, inspectDocument:!!document})`, {
  window: { VASIR_WRITING: data, VASIR_WRITING_RESPONSES: archive }, crypto: webcrypto, TextEncoder, caseId, document
});

test('serialized compact browser evidence verifies all three group inventories and every selected task', async () => {
  for (const [id, count] of [['storytelling-plot-twists-compact-v2', 3], ['writing-place-generation-v1', 1], ['storytelling-one-shot-v1', 1]]) {
    const source = fixture(id, count), before = JSON.stringify(source);
    for (const task of source.data.cases) {
      const result = await inspect(source, task.id);
      assert.deepEqual(Array.from(result.mismatches), []);
      assert.equal(result.kind, 'vasirbenchmark-compact-writing-browser-evidence');
      assert.equal(result.answers.length, 12);
      assert.equal(result.requests.length, 12);
      assert.equal(result.sourceSha256, source.data.scoreBasis.sourceSha256);
      assert.equal(result.judgeValidationSha256, null);
      assert.deepEqual(Array.from(result.answers.slice(0, 2), answer => answer.exactScore), [40, 60]);
    }
    assert.equal(JSON.stringify(source), before, 'Evidence inspection is read-only.');
  }
});

test('compact browser evidence fails altered answers, inputs, mappings, raw reviews, rubrics and arithmetic', async () => {
  const changes = [
    value => { value.archive.responses[0].outputText += ' changed'; },
    value => { value.archive.messageSets[0].messages[0].content += ' changed'; },
    value => { value.archive.promptFiles[0].content += ' changed'; },
    value => { value.archive.judgeRequests[0].candidateMap.A = 'skill'; },
    value => { value.archive.judgeRequests[0].outputText += ' '; },
    value => { value.archive.responses[0].judgments[0].dimensions['criterion-1'].evidence = 'Invented evidence'; },
    value => { value.data.cases[0].rubric[0].criterion += ' changed'; },
    value => { value.data.caseResults[0].exactScore++; },
    value => { value.archive.responses[0].provenance.manifestSha256 = 'c'.repeat(64); },
    value => { value.archive.responses[0].provenance.judgeValidationSha256 = 'd'.repeat(64); }
  ];
  for (const change of changes) {
    const source = fixture(); change(source);
    const result = await inspect(source);
    assert.ok(result.mismatches.length > 0, change.toString());
  }
});

test('compact browser evidence binds amended retry and offline validation to original judge records', async () => {
  const source = fixture(), { data, archive } = source, request = archive.judgeRequests[0];
  data.scoreBasis.amendmentSha256 = 'c'.repeat(64);
  data.scoreBasis.judgeValidationSha256 = 'd'.repeat(64);
  data.methodology.operationalAmendment = { sha256: data.scoreBasis.amendmentSha256 };
  request.attemptNumber = 2; request.priorAttemptSha256 = 'e'.repeat(64);
  archive.failedJudgeAttempts.push({ requestId: request.id, attemptNumber: 1, sourceAttemptSha256: request.priorAttemptSha256,
    promptText: request.promptText, promptSha256: request.promptSha256, outputText: '', outputSha256: digest('') });
  request.originalStatus = 'failed'; request.originalRecordSha256 = 'f'.repeat(64);
  request.validation = { sha256: data.scoreBasis.judgeValidationSha256, originalRecordSha256: request.originalRecordSha256,
    toolCallCount: 0, additionalInferenceCalls: 0, startupDiagnosticCount: 1 };
  data.methodology.judgeValidation = { sha256: request.validation.sha256, records: [{ judgmentId: request.id,
    originalRecordSha256: request.originalRecordSha256, outputSha256: request.outputSha256, promptSha256: request.promptSha256 }] };
  for (const response of archive.responses) {
    Object.assign(response.provenance, { amendmentSha256: data.scoreBasis.amendmentSha256, judgeValidationSha256: data.scoreBasis.judgeValidationSha256 });
    for (const judgment of response.judgments.filter(item => item.requestId === request.id)) judgment.validation = request.validation;
  }
  const result = await inspect(source);
  assert.deepEqual(Array.from(result.mismatches), []);
  assert.equal(result.judgeValidationSha256, data.scoreBasis.judgeValidationSha256);
  for (const change of [value => { value.archive.failedJudgeAttempts[0].outputText = 'changed'; },
    value => { value.archive.judgeRequests[0].validation.additionalInferenceCalls = 1; },
    value => { value.data.methodology.judgeValidation.records[0].originalRecordSha256 = '0'.repeat(64); },
    value => { value.archive.responses[0].judgments[0].validation = undefined; }]) {
    const changed = structuredClone(source); change(changed);
    assert.ok((await inspect(changed)).mismatches.length > 0, change.toString());
  }
});

test('empty compact answers require the exact shared absence placeholder and cannot pass fabricated output', async () => {
  const source = fixture(), { data, archive } = source;
  for (const response of archive.responses) Object.assign(response, { outputText: '', wordCount: null, characterCount: null, score: null, judgments: [],
    provenance: { ...response.provenance, outputSha256: null } });
  for (const cell of data.caseResults) Object.assign(cell, { score: null, exactScore: null });
  archive.judgeRequests = [];
  data.coverage.pairedJudgeCallCount = data.coverage.judgmentCount = 0;
  data.methodology.ratingAnchors = { 0: 'Absent', 5: 'Exceptional' };
  const placeholder = { textContent: 'No completed answer is available for this case and condition.' };
  let output = null;
  const panel = { querySelector: selector => selector === '[data-output-text]' ? output : selector === '[data-output-absence]' ? placeholder : null };
  const rows = data.settings.map(setting => ({ dataset: { reportSettingId: setting.id }, querySelector: () => panel }));
  const document = { querySelectorAll: () => rows, querySelector: selector => {
    if (selector === '[data-writing-case]') return { value: data.cases[0].id };
    const criterion = data.cases[0].rubric.find(item => selector === `[data-rubric-dimension="${item.dimensionId}"]`);
    return criterion ? { querySelector: selector => selector === '[data-rubric-description]' ? { textContent: criterion.criterion }
      : { textContent: data.methodology.ratingAnchors[selector.match(/"(\d+)"/)[1]] } } : null;
  } };
  assert.deepEqual(Array.from((await inspect(source, undefined, document)).mismatches), []);
  placeholder.textContent = 'Incorrect placeholder';
  assert.ok((await inspect(source, undefined, document)).mismatches.some(label => label.endsWith(':rendered-answer')));
  placeholder.textContent = 'No completed answer is available for this case and condition.';
  output = { textContent: 'Fabricated answer for an empty record.' };
  assert.ok((await inspect(source, undefined, document)).mismatches.some(label => label.endsWith(':rendered-answer')));
});

test('compact browser evidence reads exact original review and prompt through the shared native disclosure', () => {
  const source = fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-compact-browser-evidence.mjs', import.meta.url), 'utf8');
  assert.match(source, /original\.dispatchEvent\(new Event\('toggle'\)\)/);
  assert.match(source, /prompt\.dispatchEvent\(new Event\('toggle'\)\)/);
  assert.match(source, /\[data-creation-original-review\].*textContent === request\.outputText/);
  assert.match(source, /\[data-creation-original-prompt\].*textContent === request\.promptText/);
  assert.match(source, /original\.open = wasOpen/);
  assert.match(source, /prompt\.open = promptWasOpen/);
});
