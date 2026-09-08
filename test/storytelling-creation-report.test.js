import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const runtime = fs.readFileSync(new URL('../site/vasirbenchmark.com/benchmark-report.js', import.meta.url), 'utf8');
const ID = 'storytelling-magic-discovery', CORE = 'storytelling-core-idea';
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function publication({ creation = true, partial = false } = {}) {
  const id = creation ? ID : CORE, trials = creation ? 3 : 1;
  const profiles = ['astra', 'sol'].flatMap(model => (creation ? ['naive', 'informed'] : ['naive']).map(contextMode => {
    const configurationId = `codex:${model === 'astra' ? 'gpt-6-astra' : 'gpt-5.6-sol'}@xhigh`;
    return { id: `${model}-xhigh-${contextMode}`, configurationId, contextMode, label: `${model === 'astra' ? 'GPT-6 Astra' : 'GPT-5.6 Sol'} · xhigh · skill-${contextMode}` };
  }));
  const dimensions = Array.from({ length: 10 }, (_, index) => ({ id: `dimension-${index}`, label: `Dimension ${index}`, weight: 10, description: 'Story-specific evidence', anchors: { 1: 'Weak', 5: 'Mixed', 10: 'Strong' } }));
  const settings = Array.from({ length: 2 }, (_, index) => ({ id: `model-${index}`, configurationId: `codex:generator-${index}@high`, label: `Generator ${index} · high`, eligibleForRank: !partial || index !== 1 }));
  const story = { id: 'magic-discovery', benchmarkId: id, title: 'First discovery of magic', prompt: 'Create a fantasy synopsis with the ending included.' };
  const conditions = [{ id: 'baseline', label: 'Plain answer', short: 'Plain' }, { id: 'skill', label: 'Storytelling skill' }];
  const cells = [], responses = [], judgeRequests = [], judgePromptSegments = new Map(), trialSummaries = [], benchmarkResults = [], trialEffects = [];
  for (const setting of settings) for (let trialNumber = 1; trialNumber <= trials; trialNumber++) {
    const pair = conditions.map(condition => {
      const score = (condition.id === 'baseline' ? 30 : 50) + trialNumber * 2 + Number(setting.id.at(-1));
      const identity = { benchmarkId: id, settingId: setting.id, configurationId: setting.configurationId, caseId: story.id, trialNumber, condition: condition.id };
      const outputText = `SAVED ${setting.id} ${condition.id} trial-${trialNumber}.\n<script>story("magic")</script>\n`;
      const response = { ...identity, score, status: 'scored', outputText, judgments: [], messageSetId: 'question', provenance: { outputSha256: hash(outputText) }, reviewerStatuses: [] };
      responses.push(response);
      return response;
    });
    for (const [seat, profile] of profiles.entries()) {
      const failed = partial && setting.id === 'model-1' && trialNumber === 1 && seat === 3;
      const contextText = profile.contextMode === 'informed' ? 'EXACT INFORMED CONTEXT <frozen>\n' : 'NO SKILL CONTEXT\n';
      const segmentTexts = [`TASK\n${story.prompt}\n${contextText}{"candidateId":"A","text":`, ' }\n{"candidateId":"B","text":', '}\nEND'];
      for (const content of segmentTexts) judgePromptSegments.set(hash(content), { sha256: hash(content), content });
      const promptParts = [{ textSha256: hash(segmentTexts[0]) }, { outputSha256: pair[0].provenance.outputSha256, encoding: 'json-string' }, { textSha256: hash(segmentTexts[1]) }, { outputSha256: pair[1].provenance.outputSha256, encoding: 'json-string' }, { textSha256: hash(segmentTexts[2]) }];
      const prompt = segmentTexts[0] + JSON.stringify(pair[0].outputText) + segmentTexts[1] + JSON.stringify(pair[1].outputText) + segmentTexts[2];
      const requestId = `${setting.id}:${trialNumber}:${profile.id}`;
      const outputText = failed ? 'Original invalid final review.' : JSON.stringify({ reviews: pair.map((response, index) => ({ candidateId: index ? 'B' : 'A', review: `Original <review> for ${response.condition}.` })) });
      judgeRequests.push({ id: requestId, profileId: profile.id, status: failed ? 'error' : 'complete', disposition: failed ? 'terminal-failure' : 'complete', promptSha256: hash(prompt), promptParts, outputText, outputSha256: hash(outputText), candidateOrder: pair.map((response, index) => ({ candidateId: index ? 'B' : 'A', outputSha256: response.provenance.outputSha256 })) });
      pair.forEach((response, index) => {
        response.reviewerStatuses.push({ reviewerId: profile.id, disposition: failed ? 'terminal-failure' : 'complete' });
        if (failed) return;
        const score = response.score + (creation ? [-10, 0, 0, 10][seat] : 0);
        response.judgments.push({ reviewerId: profile.id, judgeConfigurationId: profile.configurationId, judgeLabel: profile.label, contextMode: profile.contextMode, requestId, candidateId: index ? 'B' : 'A', score, dimensions: Object.fromEntries(dimensions.map((dimension, index) => [dimension.id, { rating: Math.floor(score / 10) + (index < score % 10 ? 1 : 0), reason: null, evidence: 'The protagonist frees the river.' }])), rationale: `Saved ${profile.contextMode} assessment of ${response.condition}.` });
      });
    }
    for (const response of pair) {
      if (response.judgments.length !== profiles.length) { response.score = null; response.status = 'unscored'; }
      cells.push({ benchmarkId: id, settingId: setting.id, configurationId: setting.configurationId, caseId: story.id, trialNumber, condition: response.condition, score: response.score, exactScore: response.score, status: response.status, coverage: { completedResponses: 1, completedJudgments: response.judgments.length } });
    }
  }
  for (const setting of settings) {
    for (const condition of conditions) {
      const members = cells.filter(cell => cell.settingId === setting.id && cell.condition === condition.id);
      const exactScore = setting.eligibleForRank ? average(members.map(cell => cell.exactScore)) : null;
      benchmarkResults.push({ settingId: setting.id, condition: condition.id, exactScore, score: exactScore, eligibleForRank: setting.eligibleForRank, contextScores: { naive: exactScore === null ? null : exactScore - 5, informed: exactScore === null ? null : exactScore + 5 } });
    }
    const complete = setting.eligibleForRank;
    trialEffects.push({ settingId: setting.id, count: complete ? trials : 2, mean: complete ? 20 : null, sampleStandardDeviation: complete ? 0 : null, minimum: complete ? 20 : null, maximum: complete ? 20 : null, range: complete ? 0 : null, trials: Array.from({ length: trials }, (_, index) => ({ trialNumber: index + 1, delta: !complete && index === 0 ? null : 20 })) });
  }
  for (let trialNumber = 1; trialNumber <= trials; trialNumber++) {
    const selected = cells.filter(cell => cell.trialNumber === trialNumber && cell.score !== null);
    trialSummaries.push({ caseId: story.id, trialNumber, baseline: average(selected.filter(cell => cell.condition === 'baseline').map(cell => cell.score)), treatment: average(selected.filter(cell => cell.condition === 'skill').map(cell => cell.score)), delta: 20, wins: settings.length, ties: 0, losses: 0 });
  }
  const coverage = { caseCount: 1, settingCount: 2, completedSettingCount: partial ? 1 : 2, responseCount: responses.length, expectedResponseCount: responses.length, scoredResponseCount: cells.filter(cell => cell.score !== null).length, judgmentCount: responses.reduce((sum, response) => sum + response.judgments.length, 0), expectedJudgmentCount: responses.length * profiles.length, validResponseCount: responses.length, terminalGenerationFailureCount: 0, terminalJudgmentFailureCount: partial ? 2 : 0, terminallyExcludedJudgmentCount: 0, terminallyExcludedPairCount: 0, pendingJudgmentCount: 0, executionComplete: true, executionStatus: partial ? 'complete-with-exclusions' : 'complete' };
  const benchmark = { id, category: 'writing', suite: 'Storytelling', name: creation ? 'First discovery of magic' : 'Core idea', description: 'An original fantasy synopsis.', prompt: story.prompt, taskKind: creation ? 'story-outline' : 'story-interpretation', limitations: ['One prompt and three trials.'] };
  const projection = { cases: [story], conditions, settings, trialCount: trials, trialLabel: 'Trial', caseLabel: 'prompt', subcategory: 'storytelling', benchmarks: [benchmark], benchmarkResults, trialEffects, trialSummaries, caseResults: cells, categories: [{ id: 'writing', name: 'Writing' }], benchmarkSummaries: [{ benchmarkId: id, runId: 'frozen-test', baselineLabel: 'Plain answer', treatmentLabel: 'Storytelling skill', ...trialSummaries[0] }], caseSummaries: [{ caseId: story.id, ...trialSummaries[0] }], scoreBasis: { judges: profiles.map(profile => profile.configurationId), reviewers: creation ? profiles : undefined, judgeCount: profiles.length, dimensions, trialsPerTask: trials, ratingMinimum: 1, ratingMaximum: 10, range: { minimum: 10, maximum: 100 }, panelMethod: 'Four equally weighted original review totals.', uncertainty: { reason: 'Three trials; descriptive statistics only.' } }, coverage };
  return { projection, responseBundle: { kind: 'vasirbenchmark-writing-responses', schemaVersion: 1, messageSets: [{ id: 'question', messages: [{ role: 'user', content: story.prompt }] }], promptFiles: [{ id: 'frozen-informed-judge-context', title: 'Exact informed judge context', content: 'EXACT INFORMED CONTEXT <frozen>\n' }], judgeRequests, judgePromptSegments: [...judgePromptSegments.values()], responses } };
}

async function renderReport({ creation = publication(), hash: route = `#${ID}/magic-discovery/trial-1`, descriptor, preloadedLegacy = false } = {}) {
  const core = publication({ creation: false });
  const collection = { ...core.projection, benchmarkPublications: [{ benchmarkId: ID, projection: creation.projection }] };
  const viewHandlers = {}, windowHandlers = {}, loaded = [], copied = [];
  const reportView = { innerHTML: '', querySelectorAll: () => [], contains: () => true, addEventListener: (name, handler) => { viewHandlers[name] = handler; } };
  const reportPage = { dataset: {}, style: { setProperty() {} } };
  const location = { href: 'https://vasirbenchmark.com/benchmark-report.html', hash: route, search: '', reload() { this.reloaded = true; } };
  const archiveDescriptor = descriptor === undefined ? { href: './writing-creation-responses.js', globalName: 'VASIR_WRITING_CREATION_RESPONSES' } : descriptor;
  const window = { VASIR_DATA: { settings: [], writing: { benchmarkId: CORE, benchmarkIds: [CORE, ID], responseArchives: archiveDescriptor ? { [ID]: archiveDescriptor } : {} } }, ...(preloadedLegacy ? { VASIR_WRITING_RESPONSES: core.responseBundle } : {}), location, isSecureContext: true, history: { replaceState: (_state, _title, value) => { location.hash = value; } }, addEventListener: (name, handler) => { windowHandlers[name] = handler; }, requestAnimationFrame: callback => callback(), scrollTo() {}, setTimeout: () => 1, clearTimeout() {} };
  const document = { currentScript: { src: 'https://vasirbenchmark.com/releases/frozen-release/benchmark-report.js' }, createElement: () => ({}), head: { append(script) {
    loaded.push(script.src);
    if (script.src.endsWith('/writing-data.js')) window.VASIR_WRITING = collection;
    else if (script.src.endsWith('/writing-creation-responses.js')) window.VASIR_WRITING_CREATION_RESPONSES = creation.responseBundle;
    else if (script.src.endsWith('/writing-responses.js')) window.VASIR_WRITING_RESPONSES = core.responseBundle;
    else throw new Error(`Unexpected script ${script.src}`);
    document.currentScript = null;
    script.onload();
  } }, getElementById: id => id === 'report-view' ? reportView : id === 'report-page' ? reportPage : { scrollIntoView() {} }, querySelector: () => ({}), querySelectorAll: () => [] };
  await vm.runInNewContext(runtime, { window, document, URL, URLSearchParams, navigator: { clipboard: { writeText: async text => copied.push(text) } } });
  return { window, loaded, copied, reportView, reportPage, navigate(hash) { location.hash = hash; windowHandlers.hashchange(); }, choose(value) { viewHandlers.change({ target: { value, matches: selector => selector === '[data-writing-trial]' } }); windowHandlers.hashchange(); }, expand(requestId, prompt = false) {
    const body = { dataset: {}, innerHTML: '' }, details = { open: true, dataset: { [prompt ? 'creationJudgePrompt' : 'creationJudgeEvidence']: requestId }, querySelector: () => body };
    viewHandlers.toggle({ target: details });
    return body;
  }, async copyFrom(html) {
    const copyId = html.match(/data-copy-id="([^"]+)"/)[1];
    const control = { dataset: { copyId }, classList: { add() {}, remove() {} }, focus() {}, setAttribute() {}, getAttribute: () => '' };
    await viewHandlers.click({ target: { closest: selector => selector === '.model-run__copy' ? control : null } });
  } };
}

test('creation loads only its release-pinned archive even when an older archive is present', async () => {
  const page = await renderReport({ preloadedLegacy: true });
  assert.deepEqual(page.loaded, ['https://vasirbenchmark.com/releases/frozen-release/writing-data.js', 'https://vasirbenchmark.com/releases/frozen-release/writing-creation-responses.js']);
  assert.doesNotMatch(page.reportView.innerHTML, /COULD NOT BE|EXACT RUN MATRIX IS INCOMPLETE/);
  assert.doesNotMatch(page.reportView.innerHTML, /Separate dimension reasons were not recorded/);
  assert.match(page.reportView.innerHTML, /The protagonist frees the river\./);
  assert.equal(page.window.VASIR_WRITING.benchmarks[0].id, ID);
  assert.equal(page.window.VASIR_WRITING_RESPONSES, page.window.VASIR_WRITING_CREATION_RESPONSES);
  assert.equal(page.window.VASIR_WRITING_RESPONSES_COLLECTION, undefined);
  const old = await renderReport({ hash: `#${CORE}/magic-discovery` });
  assert.deepEqual(old.loaded, ['https://vasirbenchmark.com/releases/frozen-release/writing-data.js', 'https://vasirbenchmark.com/releases/frozen-release/writing-responses.js']);
  assert.doesNotMatch(old.reportView.innerHTML, /data-creation-context-comparison/);
});

test('creation selects each of three trials while context comparison remains a complete-cohort aggregate', async () => {
  const source = publication(), page = await renderReport({ creation: source });
  for (let trial = 1; trial <= 3; trial++) {
    page.choose(String(trial));
    const html = page.reportView.innerHTML;
    assert.equal(page.window.location.hash, `#${ID}/magic-discovery/trial-${trial}`);
    assert.equal(page.reportPage.dataset.activeWritingTrial, String(trial));
    assert.equal((html.match(/<option value="\d+"/g) || []).length, 3);
    assert.equal((html.match(/data-creation-setting=/g) || []).length, 2);
    assert.equal((html.match(/data-judge-context="naive"/g) || []).length, 8);
    assert.equal((html.match(/data-judge-context="informed"/g) || []).length, 8);
    assert.match(html, /data-creation-context="balanced" data-context-score="baseline">34\.0/);
    assert.match(html, /data-creation-context="naive" data-context-score="baseline">29\.0/);
    assert.match(html, /data-creation-context="informed" data-context-score="baseline">39\.0/);
    assert.match(html, /data-creation-trial-delta="3">\+20\.0/);
    assert.match(html, /data-creation-trial-sd>0\.0/);
    for (const response of source.responseBundle.responses) assert.equal(html.includes(escape(response.outputText)), response.trialNumber === trial);
    assert.doesNotMatch(html, /Corpus stratum|<script>story/);
  }
});

test('four seat verification rejects duplicated profiles, wrong context and missing trial evidence', async () => {
  for (const mutate of [
    source => { source.responseBundle.responses[0].judgments[1].reviewerId = source.responseBundle.responses[0].judgments[0].reviewerId; },
    source => { source.responseBundle.responses[0].judgments[0].contextMode = 'informed'; },
    source => { source.projection.trialSummaries.pop(); },
    source => { source.responseBundle.responses.pop(); }
  ]) {
    const source = publication(); mutate(source);
    assert.match((await renderReport({ creation: source })).reportView.innerHTML, /EXACT RUN MATRIX IS INCOMPLETE/);
  }
});

test('original final reviews and exact prompts hydrate on expansion and copy unescaped bytes', async () => {
  const source = publication(), page = await renderReport({ creation: source });
  const request = source.responseBundle.judgeRequests.find(request => request.profileId === 'astra-xhigh-informed');
  assert.doesNotMatch(page.reportView.innerHTML, /data-creation-original-prompt|data-creation-original-review/);
  const review = page.expand(request.id);
  assert.match(review.innerHTML, /data-creation-original-review/);
  assert.ok(review.innerHTML.includes(escape(request.outputText)));
  assert.doesNotMatch(review.innerHTML, /data-creation-original-prompt/);
  await page.copyFrom(review.innerHTML);
  assert.equal(page.copied.at(-1), request.outputText);
  const prompt = page.expand(request.id, true);
  const segments = new Map(source.responseBundle.judgePromptSegments.map(segment => [segment.sha256, segment.content]));
  const answers = new Map(source.responseBundle.responses.map(response => [response.provenance.outputSha256, response.outputText]));
  const expected = request.promptParts.map(part => part.textSha256 ? segments.get(part.textSha256) : JSON.stringify(answers.get(part.outputSha256))).join('');
  assert.equal(hash(expected), request.promptSha256);
  assert.ok(prompt.innerHTML.includes(escape(expected)));
  assert.doesNotMatch(prompt.innerHTML, /<script>story/);
  await page.copyFrom(prompt.innerHTML);
  assert.equal(page.copied.at(-1), expected);
});

test('terminal invalid reviews remain inspectable without a score, rank or failed-read claim', async () => {
  const source = publication({ partial: true }), page = await renderReport({ creation: source });
  const html = page.reportView.innerHTML;
  assert.doesNotMatch(html, /EXACT RUN MATRIX IS INCOMPLETE|failed full-read|Judgments pending|Judging incomplete/);
  assert.match(html, /FINAL SNAPSHOT · INCOMPLETE PANELS RETAINED/);
  assert.match(html, /2 failed assessments/);
  assert.match(html, /data-creation-review-failure/);
  const row = html.slice(html.indexOf('data-creation-setting="model-1"'), html.indexOf('</tr>', html.indexOf('data-creation-setting="model-1"')));
  assert.match(row, /data-context-score="baseline">—/);
  assert.match(row, /data-creation-trial-sd>—/);
  const failed = source.responseBundle.judgeRequests.find(request => request.status === 'error');
  assert.ok(page.expand(failed.id).innerHTML.includes('Original invalid final review.'));
  page.choose('2');
  const secondTrial = page.reportView.innerHTML;
  const incomplete = secondTrial.slice(secondTrial.indexOf('data-report-setting-id="model-1"'));
  assert.match(incomplete, /Three-trial aggregate incomplete/);
  assert.doesNotMatch(incomplete.slice(0, incomplete.indexOf('</summary>')), /rank #/);
  assert.match(secondTrial, /Values and transcripts below describe the selected trial/);
});

test('missing or cross-origin creation descriptors never fall back to the older response archive', async () => {
  for (const descriptor of [null, { href: 'https://outside.example/writing-creation-responses.js', globalName: 'VASIR_WRITING_CREATION_RESPONSES' }]) {
    const page = await renderReport({ descriptor });
    assert.deepEqual(page.loaded, []);
    assert.match(page.reportView.innerHTML, /REPORT COULD NOT BE LOADED/);
  }
});
