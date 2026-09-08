import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const runtime = fs.readFileSync(new URL('../site/vasirbenchmark.com/benchmark-report.js', import.meta.url), 'utf8');
const CORE = 'storytelling-core-idea';
const TWISTS = 'storytelling-plot-twists';
const DM = 'dungeon-master-adventure-outline';

function publication(id, { trials = 1, repetitions = false, exclusions = false, caseCount = 1 } = {}) {
  const cases = Array.from({ length: caseCount }, (_, index) => ({ id: `case-${index + 1}`, benchmarkId: id, title: `Prompt ${index + 1}`, prompt: `Exact prompt ${repetitions && index < 2 ? 1 : index + 1}`, ...(repetitions ? { sourceCaseId: index < 2 ? 'primary' : `secondary-${index - 1}`, trialNumber: index === 1 ? 6 : 1, cohort: index < 2 ? 'primary' : 'transfer', genre: index === 3 ? 'science-fiction' : 'fantasy' } : {}) }));
  const settings = Array.from({ length: repetitions ? 1 : 4 }, (_, index) => ({ id: `model-${index}`, configurationId: `provider:model-${index}@high`, label: `Model ${index}` }));
  const conditions = [{ id: 'baseline', label: 'Plain answer', short: 'Plain' }, { id: 'skill', label: repetitions ? 'Dungeon Master skill' : 'Storytelling skill' }];
  const dimensions = [{ id: 'coherence', label: 'Coherence', description: 'Coherent causality', weight: 100, anchors: { 1: 'Weak', 5: 'Mixed', 10: 'Strong' } }];
  const judges = ['provider:judge-1@high', 'provider:judge-2@high'];
  const cells = [];
  const responses = [];
  const trialSummaries = [];
  for (const story of cases) for (let trial = 1; trial <= trials; trial += 1) {
    const trialNumber = story.trialNumber ?? trial;
    const pairs = [];
    for (const [index, setting] of settings.entries()) {
      const excluded = exclusions && trial === 9 && index < 2;
      const baseline = excluded ? null : 20 + trial + index;
      const treatment = excluded ? null : baseline + 5;
      if (!excluded) pairs.push({ baseline, treatment });
      for (const condition of conditions) {
        const score = condition.id === 'baseline' ? baseline : treatment;
        const identity = { benchmarkId: id, caseId: story.id, settingId: setting.id, configurationId: setting.configurationId, condition: condition.id, trialNumber };
        const failed = excluded && condition.id === 'skill';
        const status = failed ? 'error' : excluded ? 'unscored' : 'scored';
        cells.push({ ...identity, score, exactScore: score, status, coverage: { completedResponses: 1, completedJudgments: excluded ? 0 : 2 } });
        const runtime = failed ? { requiredSkillReads: { status: 'incomplete', policyVersion: 'frozen-chunks-v1', evidence: 'byte-match', files: [{ relativePath: 'references/twists.md', bytes: 16000, sha256: 'a'.repeat(64), requiredChunkCount: 2, complete: false, observedChunks: [{ index: 0, bytes: 8000, sha256: 'b'.repeat(64) }] }] } } : null;
        responses.push({ ...identity, score, status, messageSetId: 'shared-prompt', outputText: `SAVED ${id} ${story.id} model-${index} ${condition.id} trial-${trialNumber}.`, judgments: excluded ? [] : judges.map(judgeConfigurationId => ({ judgeConfigurationId, reviewerId: judgeConfigurationId, score, dimensions: { coherence: { rating: score / 10, reason: 'Saved dimension reason' } }, rationale: 'Saved rationale', ...(repetitions ? { flags: { taskNoncompletion: { value: false, reason: 'Adventure completed' } } } : {}) })), ...(excluded ? { judgingDisposition: 'terminal-excluded' } : {}), ...(failed ? { failureReason: 'Required file was not completely read.', runtime } : {}) });
      }
    }
    const mean = key => pairs.reduce((sum, pair) => sum + pair[key], 0) / pairs.length;
    trialSummaries.push({ benchmarkId: id, caseId: story.id, trialNumber, baseline: mean('baseline'), treatment: mean('treatment'), delta: 5, wins: pairs.length, ties: 0, losses: 0 });
  }
  const coverage = { caseCount: cases.length, responseCount: cells.length, expectedResponseCount: cells.length, judgmentCount: responses.reduce((sum, response) => sum + response.judgments.length, 0), expectedJudgmentCount: cells.length * 2, scoredResponseCount: cells.filter(cell => cell.score !== null).length, completedSettingCount: exclusions ? 2 : 4, settingCount: 4, ...(exclusions ? { validResponseCount: cells.length - 2, terminalGenerationFailureCount: 2, terminallyExcludedPairCount: 2, terminallyExcludedJudgmentCount: 8, pendingGenerationCount: 0, pendingJudgmentCount: 0, executionComplete: true, executionStatus: 'complete-with-exclusions' } : {}) };
  const benchmark = { id, category: 'writing', suite: repetitions ? 'Dungeon Master' : 'Storytelling', name: id === TWISTS ? 'Plot twists' : repetitions ? 'Adventure outline' : 'Core idea', description: 'Published task description', prompt: cases[0].prompt, taskKind: id === TWISTS ? 'story-outline' : 'story-interpretation', limitations: ['One task only'] };
  const projection = { trialCount: trials, cases, settings, conditions, benchmarks: [benchmark], benchmarkResults: [], benchmarkSummaries: [{ benchmarkId: id, baselineLabel: 'Plain answer', treatmentLabel: conditions[1].label, baseline: 90, treatment: 99, delta: 9, wins: 4, ties: 0, losses: 0, runId: 'fixture-run' }], caseSummaries: cases.map(story => ({ caseId: story.id, baseline: 80, treatment: 88, delta: 8, wins: 4, ties: 0, losses: 0 })), trialSummaries, caseResults: cells, categories: [{ id: 'writing', name: 'Writing', color: '#b65a31' }], scoreBasis: { dimensions, judges, judgeCount: 2, ratingMinimum: 1, ratingMaximum: 10, range: { minimum: 10, maximum: 100 }, trialsPerTask: trials, panelMethod: 'Published scoring method' }, coverage, caseLabel: id === TWISTS ? 'prompt' : 'story', trialLabel: repetitions ? 'Repetition' : 'Trial' };
  if (repetitions) {
    coverage.promptCount = new Set(cases.map(story => story.sourceCaseId)).size;
    coverage.completedSettingCount = coverage.settingCount = settings.length;
    const cohortSummary = predicate => {
      const selectedCases = cases.filter(predicate);
      const summaries = trialSummaries.filter(summary => selectedCases.some(story => story.id === summary.caseId));
      const mean = field => summaries.reduce((sum, summary) => sum + summary[field], 0) / summaries.length;
      return { baseline: mean('baseline'), treatment: mean('treatment'), delta: mean('delta'), usablePairs: selectedCases.length, expectedPairs: selectedCases.length, complete: true, sourcePromptCount: new Set(selectedCases.map(story => story.sourceCaseId)).size };
    };
    Object.assign(projection, { subcategory: 'dungeon-master', cohortSummaries: {
      primary: cohortSummary(story => story.cohort === 'primary'),
      transfer: cohortSummary(story => story.cohort === 'transfer'),
      fantasyTransfer: cohortSummary(story => story.cohort === 'transfer' && story.genre === 'fantasy'),
      otherGenreTransfer: cohortSummary(story => story.cohort === 'transfer' && story.genre !== 'fantasy')
    }, pairwisePreferences: cases.map(story => ({ caseId: story.id, reviewerId: 'judge-1', winner: 'skill', confidence: 'high', reason: `Preference for ${story.id}` })), flagRates: [{ condition: 'skill', fundamentalRepairRequired: 0, taskNoncompletion: 0, reviewedAnswers: cases.length }] });
  }
  return { projection, responseBundle: { kind: 'vasirbenchmark-writing-responses', schemaVersion: 1, promptFiles: [], messageSets: [{ id: 'shared-prompt', messages: [{ role: 'user', content: 'Exact shared task' }] }], responses } };
}

function collections(options = {}) {
  const core = publication(CORE, { caseCount: 2 });
  const twists = publication(TWISTS, { trials: 10, exclusions: true, ...options });
  const dm = publication(DM, { repetitions: true, caseCount: 4 });
  const data = { ...core.projection, benchmarkPublications: [{ benchmarkId: TWISTS, projection: twists.projection }], additionalBenchmarks: { [DM]: dm.projection } };
  const archive = { ...core.responseBundle, benchmarkResponses: [{ benchmarkId: TWISTS, responseBundle: twists.responseBundle }], additionalBenchmarks: { [DM]: dm.responseBundle } };
  return { data, archive, core, twists, dm };
}

async function renderReport(source, hash) {
  const handlers = {};
  const viewHandlers = {};
  const reportPage = { dataset: {}, style: { setProperty() {} } };
  const reportView = { innerHTML: '', querySelectorAll: () => [], addEventListener: (name, handler) => { viewHandlers[name] = handler; } };
  const links = ['overview', 'ranking', 'method', 'limitations', 'top'].map(section => ({ dataset: { reportSection: section }, closest: () => null }));
  const mast = {};
  const scrolled = [];
  const location = { href: 'https://vasirbenchmark.com/benchmark-report.html', hash, search: '', reload: () => { location.reloaded = true; } };
  const window = { VASIR_DATA: { settings: [], writing: { benchmarkId: CORE, benchmarkIds: [CORE, TWISTS], additionalBenchmarks: { [DM]: { subcategory: 'dungeon-master', title: 'Dungeon Master' } } } }, VASIR_WRITING: source.data, VASIR_WRITING_RESPONSES: source.archive, location, history: { replaceState: (_state, _title, target) => { location.hash = target; } }, addEventListener: (name, handler) => { handlers[name] = handler; }, requestAnimationFrame: callback => callback(), scrollTo: () => scrolled.push('top') };
  const document = { currentScript: { src: `${location.href.replace('html', 'js')}` }, getElementById: id => id === 'report-page' ? reportPage : id === 'report-view' ? reportView : { scrollIntoView: () => scrolled.push(id) }, querySelector: () => mast, querySelectorAll: () => links };
  await vm.runInNewContext(runtime, { window, document, URL, URLSearchParams });
  return { window, document, reportPage, reportView, links, scrolled, navigate(hash) { location.hash = hash; handlers.hashchange(); }, choose(selector, value) { viewHandlers.change({ target: { value, matches: candidate => candidate === selector } }); handlers.hashchange(); } };
}

test('Writing report selects every trial without collapsing the eighty response records or using aggregate hero scores', async () => {
  const source = collections();
  assert.equal(source.twists.responseBundle.responses.length, 80);
  const page = await renderReport(source, `#${TWISTS}/case-1/trial-1`);
  assert.equal(page.window.VASIR_WRITING, source.twists.projection);
  assert.equal(page.window.VASIR_WRITING_RESPONSES, source.twists.responseBundle);
  assert.equal(page.window.VASIR_WRITING_COLLECTION, source.data);
  assert.equal(page.window.VASIR_WRITING_RESPONSES_COLLECTION, source.archive);
  assert.match(page.reportView.innerHTML, /class="report-context__back" href="\.\/index\.html#capabilities\/writing\/benchmarks"/);
  for (let trial = 1; trial <= 10; trial += 1) {
    page.navigate(`#${TWISTS}/case-1/trial-${trial}`);
    assert.deepEqual(page.reportPage.dataset, { activeWritingBenchmark: TWISTS, writingSubcategory: 'storytelling', activeWritingCase: 'case-1', activeWritingTrial: String(trial) });
    const html = page.reportView.innerHTML;
    assert.doesNotMatch(html, /EXACT RUN MATRIX IS INCOMPLETE/);
    const summary = source.twists.projection.trialSummaries.find(summary => summary.trialNumber === trial);
    const hero = html.slice(html.indexOf('id="overview"'), html.indexOf('id="intent-title"'));
    assert.ok(hero.includes(`<strong>${summary.baseline.toFixed(1)}</strong>`));
    assert.ok(hero.includes(`<strong>${summary.treatment.toFixed(1)}</strong>`));
    assert.match(hero, /1 selected trial/);
    for (const response of source.twists.responseBundle.responses) assert.equal(html.includes(response.outputText), response.trialNumber === trial, response.outputText);
    assert.equal((html.match(/data-report-setting-id=/g) || []).length, 4);
    assert.equal((html.match(/<option value="\d+"/g) || []).length, 10);
  }
  assert.match(page.reportView.innerHTML, /Scores cover plot twists on 1 published prompt with 10 trials per condition/);
  assert.doesNotMatch(page.reportView.innerHTML, /core-idea analysis|Corpus stratum/);
});

test('Writing trial and case changes preserve sections; omitted and invalid trial routes canonicalize safely', async () => {
  const page = await renderReport(collections({ caseCount: 2 }), `#${TWISTS}/case-1/trial-7/method`);
  page.choose('[data-writing-trial]', '10');
  assert.equal(page.window.location.hash, `#${TWISTS}/case-1/trial-10/method`);
  assert.equal(page.reportPage.dataset.activeWritingTrial, '10');
  assert.equal(page.links.find(link => link.dataset.reportSection === 'ranking').href, `#${TWISTS}/case-1/trial-10/ranking`);
  page.choose('[data-writing-case]', 'case-2');
  assert.equal(page.window.location.hash, `#${TWISTS}/case-2/trial-10/method`);
  assert.equal(page.reportPage.dataset.activeWritingCase, 'case-2');
  for (const trial of ['trial-0', 'trial-11', 'trial-bad']) {
    page.navigate(`#${TWISTS}/case-2/${trial}/limitations`);
    assert.equal(page.window.location.hash, `#${TWISTS}/case-2/trial-1/limitations`);
    assert.equal(page.reportPage.dataset.activeWritingTrial, '1');
  }
  page.navigate(`#${TWISTS}/case-2/ranking`);
  assert.equal(page.window.location.hash, `#${TWISTS}/case-2/trial-1/ranking`);
  assert.equal(page.scrolled.at(-1), 'ranking');
  page.navigate(`#${CORE}/case-1`);
  assert.equal(page.window.location.reloaded, true);
});

test('Terminal exclusions retain both answers, exact failed-read evidence and final progress instead of pending reviews', async () => {
  const page = await renderReport(collections(), `#${TWISTS}/case-1/trial-9`);
  const html = page.reportView.innerHTML;
  assert.match(html, /FINAL SNAPSHOT · 2 EXCLUDED PAIRS/);
  assert.match(html, /78 valid final answers; 2 failed full-read verifications are retained/);
  assert.match(html, /152 completed judge reviews and 8 terminally excluded reviews account for all 160 planned reviews/);
  assert.match(html, /No judge reviews are pending/);
  assert.doesNotMatch(html, /Judgments pending|Judging incomplete;|IN PROGRESS/);
  assert.equal((html.match(/data-writing-exclusion/g) || []).length, 4);
  assert.equal((html.match(/data-required-read-status>incomplete/g) || []).length, 2);
  assert.match(html, /references\/twists\.md · 1\/2 required chunks · incomplete/);
  assert.match(html, /data-required-read-file-field="bytes"><code>16000/);
  assert.match(html, new RegExp('data-required-read-file-field="sha256"><code>' + 'a'.repeat(64)));
  assert.equal((html.match(/data-output-text/g) || []).length, 8);
});

test('Core remains the default collection member and Dungeon Master preserves actual repetition six with cohorts, preferences and flags', async () => {
  const source = collections();
  const core = await renderReport(source, `#${CORE}/case-2/method`);
  assert.equal(core.window.VASIR_WRITING, source.data);
  assert.equal(core.reportPage.dataset.activeWritingTrial, '1');
  assert.equal(core.window.location.hash, `#${CORE}/case-2/method`);
  assert.doesNotMatch(core.reportView.innerHTML, /data-writing-trial(?:\s|>)/);
  const dm = await renderReport(source, `#${DM}/case-2/method`);
  assert.equal(dm.window.VASIR_WRITING, source.dm.projection);
  assert.equal(dm.reportPage.dataset.activeWritingTrial, '6');
  assert.doesNotMatch(dm.reportView.innerHTML, /EXACT RUN MATRIX IS INCOMPLETE|data-writing-trial(?:\s|>)/);
  for (const response of source.dm.responseBundle.responses) assert.equal(dm.reportView.innerHTML.includes(response.outputText), response.caseId === 'case-2');
  assert.match(dm.reportView.innerHTML, /data-writing-cohorts/);
  for (const cohort of ['primary', 'transfer', 'fantasyTransfer', 'otherGenreTransfer']) assert.match(dm.reportView.innerHTML, new RegExp(`data-writing-cohort="${cohort}"`));
  assert.match(dm.reportView.innerHTML, /3 distinct prompts · 4 matched pairs/);
  assert.match(dm.reportView.innerHTML, /Preference for case-2/);
  assert.match(dm.reportView.innerHTML, /Adventure completed/);
  assert.match(dm.reportView.innerHTML, /Repetition 6/);
  assert.match(dm.reportView.innerHTML, /class="report-context__back" href="\.\/index\.html#capabilities\/writing\/benchmarks"/);
  dm.choose('[data-writing-case]', 'case-1');
  assert.equal(dm.reportPage.dataset.activeWritingTrial, '1');
  assert.equal(dm.window.location.hash, `#${DM}/case-1/method`);
});

test('Repeated-trial reports reject missing per-trial summaries and mismatched archive trial identities', async () => {
  const source = collections();
  source.twists.projection.trialSummaries.pop();
  const missingSummary = await renderReport(source, `#${TWISTS}/case-1/trial-10`);
  assert.match(missingSummary.reportView.innerHTML, /EXACT RUN MATRIX IS INCOMPLETE/);
  const mismatched = collections();
  mismatched.twists.responseBundle.responses[0].trialNumber = 11;
  const badIdentity = await renderReport(mismatched, `#${TWISTS}/case-1/trial-1`);
  assert.match(badIdentity.reportView.innerHTML, /EXACT RUN MATRIX IS INCOMPLETE/);
});
